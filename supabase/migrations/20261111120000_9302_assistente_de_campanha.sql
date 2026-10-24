-- manifest: **Assistente de campanha da casca (fork Escale, Fase 8B).** `campaigns` ganha `escale_mensagem` (texto livre ou modelo aprovado da Meta com o mapa de variáveis), `escale_publico` (a seleção de contatos — ids ou o filtro de Contatos —, os contatos avulsos e os removidos), `escale_pos_envio` (tags, origem e etapa, status da conversa e atendente, aplicados a quem recebeu depois da conclusão), `escale_quando` (o agendamento pedido) e `escale_pos_envio_feito_em`; `campaign_recipients` ganha `escale_pos_envio_em` (o pós-envio feito uma vez por destinatário), `escale_numero_oficial` e `escale_categoria_do_modelo` (o custo preparado). Três funções invoker, fechadas ao `anon`: `fn_escale_contatos_do_publico` (o público em ordem, resolvendo o filtro pela `fn_escale_contatos_do_filtro` da 2B), `fn_escale_pagina_do_publico` (a página e o total) e `fn_escale_fora_da_lista` (quantos ficaram fora da lista, por motivo). Respondem a gerente ou acima da organização, ou ao service role.
-- ---- FORK ESCALE · assistente de campanha da casca (migration 9302) ----
-- 9302: assistente de campanha da casca (fork Escale, Frente B).

-- ── 1. As colunas ────────────────────────────────────────────────────────────
-- Nulas = campanha do formulário do original: o motor segue como sempre.
alter table public.campaigns add column if not exists escale_mensagem jsonb;
alter table public.campaigns add column if not exists escale_publico jsonb;
alter table public.campaigns add column if not exists escale_pos_envio jsonb;
alter table public.campaigns add column if not exists escale_quando timestamptz;
alter table public.campaigns add column if not exists escale_pos_envio_feito_em timestamptz;

alter table public.campaigns drop constraint if exists campaigns_escale_jsonb_objetos;
alter table public.campaigns add constraint campaigns_escale_jsonb_objetos check (
  (escale_mensagem is null or jsonb_typeof(escale_mensagem) = 'object')
  and (escale_publico is null or jsonb_typeof(escale_publico) = 'object')
  and (escale_pos_envio is null or jsonb_typeof(escale_pos_envio) = 'object')
);

alter table public.campaign_recipients add column if not exists escale_pos_envio_em timestamptz;
alter table public.campaign_recipients add column if not exists escale_numero_oficial boolean;
alter table public.campaign_recipients add column if not exists escale_categoria_do_modelo text;

-- O pós-envio lê "quem recebeu e ainda não foi tratado", em lotes.
create index if not exists campaign_recipients_escale_pos_envio_pendente
  on public.campaign_recipients (campaign_id, created_at)
  where sent_at is not null and escale_pos_envio_em is null;

-- ── 2. O público, em ordem ───────────────────────────────────────────────────
-- Seleção primeiro (ids na ordem marcada, ou o filtro na ordem da lista de
-- Contatos), depois os avulsos; sem repetir; menos os removidos; só contato
-- pessoa e não mesclado desta organização. O filtro só é calculado quando a
-- seleção é um filtro (o `lateral` sobre uma linha que pode não existir).
create or replace function public.fn_escale_contatos_do_publico(p_org uuid, p_publico jsonb)
returns table (contact_id uuid, posicao bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with sel as (
    select p_publico -> 'selecao' as s
  ),
  removidos as (
    select array(
      select x::uuid from jsonb_array_elements_text(coalesce(p_publico -> 'removidos', '[]'::jsonb)) as x
    ) as ids
  ),
  do_filtro as (
    select c.contact_id,
           row_number() over (order by c.last_activity_at desc nulls last, c.contact_id desc) as ordem
      from (select s from sel where s ->> 'tipo' = 'filtro') g
      cross join lateral public.fn_escale_contatos_do_filtro(
        p_org,
        coalesce(g.s ->> 'visao', 'todos'),
        g.s ->> 'padrao',
        case when jsonb_typeof(g.s -> 'digitos') = 'array'
             then array(select d from jsonb_array_elements_text(g.s -> 'digitos') as d) end,
        g.s ->> 'cpf_hash',
        coalesce(g.s -> 'filtros', '{}'::jsonb)
      ) c
  ),
  escolhidos as (
    select e.valor::uuid as contact_id, 1 as bloco, e.ordem
      from sel,
           jsonb_array_elements_text(case when sel.s ->> 'tipo' = 'ids' then sel.s -> 'ids' else '[]'::jsonb end)
             with ordinality as e(valor, ordem)
    union all
    select f.contact_id, 1, f.ordem
      from do_filtro f, sel
     where (sel.s ->> 'quantidade' is null or f.ordem <= (sel.s ->> 'quantidade')::bigint)
       and not (f.contact_id = any (array(
             select x::uuid from jsonb_array_elements_text(coalesce(sel.s -> 'excluidos', '[]'::jsonb)) as x)))
    union all
    select e.valor::uuid, 2, e.ordem
      from jsonb_array_elements_text(coalesce(p_publico -> 'avulsos', '[]'::jsonb)) with ordinality as e(valor, ordem)
  ),
  validos as (
    select distinct on (x.contact_id) x.contact_id, x.bloco, x.ordem
      from escolhidos x
      join public.contacts ct
        on ct.id = x.contact_id
       and ct.organization_id = p_org
       and ct.kind = 'person'
       and ct.is_merged_into is null
     where not (x.contact_id = any (coalesce((select r.ids from removidos r), '{}'::uuid[])))
     order by x.contact_id, x.bloco, x.ordem
  )
  select v.contact_id, row_number() over (order by v.bloco, v.ordem, v.contact_id) as posicao
    from validos v
   where current_user in ('postgres', 'service_role') or public.fn_role_at_least(p_org, 'manager');
$$;

revoke all on function public.fn_escale_contatos_do_publico(uuid, jsonb) from public, anon;
grant execute on function public.fn_escale_contatos_do_publico(uuid, jsonb) to authenticated, service_role;

-- ── 3. A página do público (passo 2) e a leitura em lotes (preparação) ──────
create or replace function public.fn_escale_pagina_do_publico(
  p_org uuid,
  p_publico jsonb,
  p_limite integer,
  p_deslocamento integer
)
returns table (contact_id uuid, posicao bigint, total bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select p.contact_id, p.posicao, count(*) over () as total
    from public.fn_escale_contatos_do_publico(p_org, p_publico) p
   order by p.posicao
   limit least(greatest(coalesce(p_limite, 10), 1), 1000)
  offset greatest(coalesce(p_deslocamento, 0), 0);
$$;

revoke all on function public.fn_escale_pagina_do_publico(uuid, jsonb, integer, integer) from public, anon;
grant execute on function public.fn_escale_pagina_do_publico(uuid, jsonb, integer, integer) to authenticated, service_role;

-- ── 4. Quem ficou fora da lista, por motivo (passo 4) ───────────────────────
create or replace function public.fn_escale_fora_da_lista(p_org uuid, p_campanha uuid)
returns table (motivo text, quantidade integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(r.exclusion_reason, 'sem_motivo') as motivo, count(*)::integer as quantidade
    from public.campaign_recipients r
   where r.organization_id = p_org
     and r.campaign_id = p_campanha
     and r.eligibility_status = 'excluded'
     and (current_user in ('postgres', 'service_role') or public.fn_role_at_least(p_org, 'manager'))
   group by 1
   order by 2 desc, 1;
$$;

revoke all on function public.fn_escale_fora_da_lista(uuid, uuid) from public, anon;
grant execute on function public.fn_escale_fora_da_lista(uuid, uuid) to authenticated, service_role;
