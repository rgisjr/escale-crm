-- manifest: **Detalhe da campanha da casca (fork Escale, Fase 8C).** Nove funções invoker, fechadas ao `anon`: `fn_escale_situacao_do_destinatario` (a situação de cada destinatário, uma régua só para o sumário, a tabela, o filtro e o .CSV), `fn_escale_sumario_da_campanha` (as contagens do Sumário), `fn_escale_ritmo_da_campanha` (envios por hora no fuso, 1.000 mais recentes), `fn_escale_motivos_do_erro` (falhas por código, 1.000 mais recentes), `fn_escale_resultado_da_campanha` (negócios e valores da origem "campanha", mediana até a resposta, benchmark das 5 últimas concluídas), `fn_escale_negocios_da_campanha` (a gaveta, até 200), `fn_escale_destinatario_passa` e `fn_escale_destinatarios_da_campanha` (a aba Detalhes) e `fn_escale_selecao_da_campanha` (quem a ação em massa alcança). As que leem dados só respondem a gerente ou acima. Dois índices: a página de destinatários e os negócios da campanha.
-- ---- FORK ESCALE · detalhe da campanha da casca (migration 9310) ----
-- 9310: detalhe da campanha da casca (fork Escale, Frente B).

-- ── 1. A situação do destinatário ────────────────────────────────────────────
-- A régua da 8A (lib/campanhas/metricas.ts): carimbos cumulativos; quem falhou
-- é só "erro". Os carimbos não voltam, então a situação nunca regride.
create or replace function public.fn_escale_situacao_do_destinatario(r public.campaign_recipients)
returns text
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$
  select case
    when r.eligibility_status = 'excluded' then 'fora_da_lista'
    when r.status = 'failed' then 'erro'
    when r.replied_at is not null then 'respondido'
    when r.read_at is not null then 'lida'
    when r.delivered_at is not null then 'entregue'
    when r.sent_at is not null then 'enviado'
    when r.status in ('pending', 'queued', 'sending') then 'aguardando'
    else 'nao_enviado'
  end
$$;

-- ── 2. O Sumário ─────────────────────────────────────────────────────────────
create or replace function public.fn_escale_sumario_da_campanha(p_org uuid, p_campanha uuid)
returns table (
  adicionados integer, enviados integer, entregues integer, lidas integer, respondidas integer,
  leu_sem_resposta integer, erros integer, nao_enviados integer, aguardando integer, fora_da_lista integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with s as (
    select public.fn_escale_situacao_do_destinatario(r) as situacao
      from public.campaign_recipients r
     where r.organization_id = p_org
       and r.campaign_id = p_campanha
       and public.fn_role_at_least(p_org, 'manager')
  )
  select count(*) filter (where situacao <> 'fora_da_lista')::integer,
         count(*) filter (where situacao in ('enviado', 'entregue', 'lida', 'respondido'))::integer,
         count(*) filter (where situacao in ('entregue', 'lida', 'respondido'))::integer,
         count(*) filter (where situacao in ('lida', 'respondido'))::integer,
         count(*) filter (where situacao = 'respondido')::integer,
         count(*) filter (where situacao = 'lida')::integer,
         count(*) filter (where situacao = 'erro')::integer,
         count(*) filter (where situacao = 'nao_enviado')::integer,
         count(*) filter (where situacao = 'aguardando')::integer,
         count(*) filter (where situacao = 'fora_da_lista')::integer
    from s
$$;

-- ── 3. O ritmo por hora (1.000 envios mais recentes, como a Clint) ───────────
create or replace function public.fn_escale_ritmo_da_campanha(p_org uuid, p_campanha uuid, p_fuso text)
returns table (hora timestamp, envios integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with recentes as (
    select r.sent_at
      from public.campaign_recipients r
     where r.organization_id = p_org
       and r.campaign_id = p_campanha
       and r.sent_at is not null
       and public.fn_role_at_least(p_org, 'manager')
     order by r.sent_at desc
     limit 1000
  )
  select date_trunc('hour', sent_at at time zone coalesce(p_fuso, 'America/Sao_Paulo')), count(*)::integer
    from recentes
   group by 1
   order by 1
$$;

-- ── 4. Os motivos do erro (1.000 falhas mais recentes) ───────────────────────
create or replace function public.fn_escale_motivos_do_erro(p_org uuid, p_campanha uuid)
returns table (codigo text, quantidade integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with recentes as (
    select r.last_error_code
      from public.campaign_recipients r
     where r.organization_id = p_org
       and r.campaign_id = p_campanha
       and r.eligibility_status = 'eligible'
       and r.status = 'failed'
       and public.fn_role_at_least(p_org, 'manager')
     order by coalesce(r.last_attempt_at, r.updated_at) desc, r.id desc
     limit 1000
  )
  select last_error_code, count(*)::integer
    from recentes
   group by 1
   order by 2 desc, 1 nulls last
$$;

-- ── 5. O resultado ───────────────────────────────────────────────────────────
-- Negócio da campanha = `source = 'campanha'` + `source_metadata.campaign_id`
-- (a marca de lib/campanhas/origem-do-lead.ts). Taxa de resposta = respondidas
-- ÷ enviados (a régua da 8A); benchmark = média das 5 concluídas mais recentes.
create or replace function public.fn_escale_resultado_da_campanha(p_org uuid, p_campanha uuid)
returns table (
  negocios integer, valor_aberto_centavos bigint, valor_ganho_centavos bigint,
  mediana_segundos numeric, benchmark numeric, taxa_da_campanha numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with pode as (
    select public.fn_role_at_least(p_org, 'manager') as ok
  ),
  negocios as (
    select count(*)::integer as n,
           coalesce(sum(l.value_cents) filter (where l.status = 'open'), 0)::bigint as aberto,
           coalesce(sum(l.value_cents) filter (where l.status = 'won'), 0)::bigint as ganho
      from public.crm_leads l, pode
     where pode.ok
       and l.organization_id = p_org
       and l.source = 'campanha'
       and l.source_metadata ->> 'campaign_id' = p_campanha::text
  ),
  respostas as (
    select extract(epoch from (r.replied_at - r.sent_at))::numeric as segundos
      from public.campaign_recipients r, pode
     where pode.ok
       and r.organization_id = p_org
       and r.campaign_id = p_campanha
       and r.sent_at is not null
       and r.replied_at is not null
       and r.replied_at >= r.sent_at
     order by r.replied_at desc
     limit 1000
  ),
  candidatas as (
    select c.id, c.completed_at
      from public.campaigns c, pode
     where pode.ok and c.organization_id = p_org and c.id = p_campanha
    union all
    (select c.id, c.completed_at
       from public.campaigns c, pode
      where pode.ok
        and c.organization_id = p_org
        and c.status = 'completed'
        and c.completed_at is not null
        and c.id <> p_campanha
      order by c.completed_at desc, c.id desc
      limit 5)
  ),
  taxas as (
    select c.id,
           (select (count(*) filter (where k.situacao = 'respondido'))::numeric
                   / nullif(count(*) filter (where k.situacao in ('enviado', 'entregue', 'lida', 'respondido')), 0)
              from (select public.fn_escale_situacao_do_destinatario(r) as situacao
                      from public.campaign_recipients r
                     where r.organization_id = p_org and r.campaign_id = c.id) k) as taxa,
           c.completed_at
      from candidatas c
  ),
  ultimas as (
    select x.taxa
      from taxas x
     where x.id <> p_campanha
       and x.completed_at is not null
     order by x.completed_at desc, x.id desc
     limit 5
  )
  select n.n, n.aberto, n.ganho,
         (select percentile_cont(0.5) within group (order by segundos) from respostas)::numeric,
         (select avg(u.taxa) from ultimas u where u.taxa is not null)::numeric,
         (select x.taxa from taxas x where x.id = p_campanha)
    from negocios n
$$;

-- ── 6. A gaveta "Negócios criados" (até 200, como a Clint) ───────────────────
create or replace function public.fn_escale_negocios_da_campanha(
  p_org uuid,
  p_campanha uuid,
  p_situacao text,
  p_limite integer
)
returns table (
  lead_id uuid, contato text, telefone text, origem text, status text,
  valor_centavos bigint, criado_em timestamptz, total bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select l.id,
         coalesce(nullif(btrim(c.name), ''), nullif(btrim(c.display_name), ''), l.title),
         c.phone_number,
         coalesce(p.name, ''),
         l.status,
         l.value_cents,
         l.created_at,
         count(*) over ()
    from public.crm_leads l
    left join public.contacts c on c.id = l.contact_id and c.organization_id = l.organization_id
    left join public.crm_pipelines p on p.id = l.pipeline_id and p.organization_id = l.organization_id
   where l.organization_id = p_org
     and public.fn_role_at_least(p_org, 'manager')
     and l.source = 'campanha'
     and l.source_metadata ->> 'campaign_id' = p_campanha::text
     and (coalesce(p_situacao, 'todos') = 'todos'
          or (p_situacao = 'abertos' and l.status = 'open')
          or (p_situacao = 'ganhos' and l.status = 'won'))
   order by l.created_at desc, l.id desc
   limit least(greatest(coalesce(p_limite, 200), 1), 200)
$$;

-- ── 7. A aba Detalhes ────────────────────────────────────────────────────────
-- A busca: o nome (`padrao`, ilike) ou os dígitos do telefone (`digitos`).
create or replace function public.fn_escale_destinatario_passa(
  r public.campaign_recipients,
  c public.contacts,
  p_filtros jsonb
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce((
        (
          (p_filtros ->> 'padrao' is null and p_filtros ->> 'digitos' is null)
          or (p_filtros ->> 'padrao' is not null
              and (c.name ilike (p_filtros ->> 'padrao') or c.display_name ilike (p_filtros ->> 'padrao')))
          or (p_filtros ->> 'digitos' is not null
              and regexp_replace(coalesce(r.recipient_address, c.phone_number, ''), '\D', '', 'g')
                  like '%' || (p_filtros ->> 'digitos') || '%')
        )
    and (p_filtros -> 'situacoes' is null
         or public.fn_escale_situacao_do_destinatario(r)
            in (select jsonb_array_elements_text(p_filtros -> 'situacoes')))
    and (p_filtros -> 'motivos' is null
         or (r.status = 'failed'
             and coalesce(r.last_error_code, 'sem_codigo')
                 in (select jsonb_array_elements_text(p_filtros -> 'motivos'))))
  ), false)
$$;

create or replace function public.fn_escale_destinatarios_da_campanha(
  p_org uuid,
  p_campanha uuid,
  p_filtros jsonb,
  p_limite integer,
  p_deslocamento integer
)
returns table (
  destinatario_id uuid, contato_id uuid, telefone text, nome text, email text,
  situacao text, motivo text, enviado_em timestamptz, total bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select r.id,
         r.contact_id,
         coalesce(r.recipient_address, c.phone_number),
         coalesce(nullif(btrim(c.name), ''), nullif(btrim(c.display_name), ''), ''),
         c.email,
         public.fn_escale_situacao_do_destinatario(r),
         case
           when r.eligibility_status = 'excluded' then r.exclusion_reason
           when r.status = 'failed' then coalesce(r.last_error_code, 'sem_codigo')
         end,
         r.sent_at,
         count(*) over ()
    from public.campaign_recipients r
    join public.contacts c on c.id = r.contact_id
   where r.organization_id = p_org
     and r.campaign_id = p_campanha
     and public.fn_role_at_least(p_org, 'manager')
     and public.fn_escale_destinatario_passa(r, c, coalesce(p_filtros, '{}'::jsonb))
   order by r.created_at, r.id
   limit least(greatest(coalesce(p_limite, 20), 1), 20000)
  offset greatest(coalesce(p_deslocamento, 0), 0)
$$;

-- ── 8. Quem a ação em massa alcança ──────────────────────────────────────────
-- Os marcados à mão (`p_ids`) ou o filtro inteiro menos os desmarcados.
create or replace function public.fn_escale_selecao_da_campanha(
  p_org uuid,
  p_campanha uuid,
  p_filtros jsonb,
  p_ids uuid[],
  p_excluidos uuid[]
)
returns table (destinatario_id uuid, contato_id uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select r.id, r.contact_id
    from public.campaign_recipients r
    join public.contacts c on c.id = r.contact_id
   where r.organization_id = p_org
     and r.campaign_id = p_campanha
     and public.fn_role_at_least(p_org, 'manager')
     and case
           when p_ids is not null then r.id = any (p_ids)
           else public.fn_escale_destinatario_passa(r, c, coalesce(p_filtros, '{}'::jsonb))
                and not (r.id = any (coalesce(p_excluidos, '{}'::uuid[])))
         end
   order by r.created_at, r.id
   limit 100001
$$;

-- ── 9. Os índices ────────────────────────────────────────────────────────────
create index if not exists idx_campaign_recipients_ordem
  on public.campaign_recipients (campaign_id, created_at, id);

create index if not exists idx_crm_leads_da_campanha
  on public.crm_leads (organization_id, (source_metadata ->> 'campaign_id'))
  where source = 'campanha';

-- ── 10. Quem executa ─────────────────────────────────────────────────────────
revoke all on function public.fn_escale_situacao_do_destinatario(public.campaign_recipients) from public, anon;
revoke all on function public.fn_escale_sumario_da_campanha(uuid, uuid) from public, anon;
revoke all on function public.fn_escale_ritmo_da_campanha(uuid, uuid, text) from public, anon;
revoke all on function public.fn_escale_motivos_do_erro(uuid, uuid) from public, anon;
revoke all on function public.fn_escale_resultado_da_campanha(uuid, uuid) from public, anon;
revoke all on function public.fn_escale_negocios_da_campanha(uuid, uuid, text, integer) from public, anon;
revoke all on function public.fn_escale_destinatario_passa(public.campaign_recipients, public.contacts, jsonb) from public, anon;
revoke all on function public.fn_escale_destinatarios_da_campanha(uuid, uuid, jsonb, integer, integer) from public, anon;
revoke all on function public.fn_escale_selecao_da_campanha(uuid, uuid, jsonb, uuid[], uuid[]) from public, anon;
grant execute on function public.fn_escale_situacao_do_destinatario(public.campaign_recipients) to authenticated, service_role;
grant execute on function public.fn_escale_sumario_da_campanha(uuid, uuid) to authenticated, service_role;
grant execute on function public.fn_escale_ritmo_da_campanha(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.fn_escale_motivos_do_erro(uuid, uuid) to authenticated, service_role;
grant execute on function public.fn_escale_resultado_da_campanha(uuid, uuid) to authenticated, service_role;
grant execute on function public.fn_escale_negocios_da_campanha(uuid, uuid, text, integer) to authenticated, service_role;
grant execute on function public.fn_escale_destinatario_passa(public.campaign_recipients, public.contacts, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_destinatarios_da_campanha(uuid, uuid, jsonb, integer, integer) to authenticated, service_role;
grant execute on function public.fn_escale_selecao_da_campanha(uuid, uuid, jsonb, uuid[], uuid[]) to authenticated, service_role;

comment on function public.fn_escale_sumario_da_campanha(uuid, uuid) is
  'Fork Escale (9310): as contagens do Sumário do detalhe da campanha, pela situação de cada destinatário. Invoker; só gerente ou acima.';
comment on function public.fn_escale_destinatarios_da_campanha(uuid, uuid, jsonb, integer, integer) is
  'Fork Escale (9310): uma página da aba Detalhes (telefone, nome, email, situação, motivo, enviado em) com o filtro compilado e o total. Invoker; só gerente ou acima.';

notify pgrst, 'reload schema';