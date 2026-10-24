-- manifest: **Lista de campanhas da casca (fork Escale, Fase 8A).** `campaigns` entra na publicação `supabase_realtime` (a lista da casca se atualiza sozinha; nenhum dado novo). Quatro funções invoker, fechadas ao `anon`: `fn_escale_campanha_passa` (o filtro: nome, status, número principal, data do disparo e data de criação no fuso da organização), `fn_escale_contagem_de_campanhas` (adicionados, enviados, entregues, lidos e erros por carimbo cumulativo, disjuntos), `fn_escale_lista_de_campanhas` (a página, o total e as contagens) e `fn_escale_resumo_das_campanhas` (as contagens somadas, sem rascunhos e canceladas). A lista e o resumo só respondem a gerente ou acima da organização.
-- ---- FORK ESCALE · lista de campanhas da casca (migration 9301) ----
-- 9301: lista de campanhas da casca (fork Escale, Frente B).

-- ── 1. A lista se atualiza sozinha ───────────────────────────────────────────
-- Só `campaigns`: muda pouco (estado, agenda, edição). `campaign_recipients`
-- fica de fora — cada ack viraria um pulso; a tela reconsulta enquanto alguma
-- campanha anda.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'campaigns'
  ) then
    execute 'alter publication supabase_realtime add table public.campaigns';
  end if;
end $$;

-- ── 2. O filtro ──────────────────────────────────────────────────────────────
-- "Data do agendamento" = a agendada, senão quando começou (a coluna da tela).
create or replace function public.fn_escale_campanha_passa(c public.campaigns, p_filtros jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce((
        (p_filtros ->> 'padrao' is null or c.name ilike (p_filtros ->> 'padrao'))
    and (p_filtros -> 'status' is null
         or c.status in (select jsonb_array_elements_text(p_filtros -> 'status')))
    and (p_filtros ->> 'numero' is null or c.channel_session_id = (p_filtros ->> 'numero')::uuid)
    and (p_filtros ->> 'disparo_de' is null
         or (coalesce(c.scheduled_at, c.started_at) at time zone (p_filtros ->> 'fuso'))::date
            >= (p_filtros ->> 'disparo_de')::date)
    and (p_filtros ->> 'disparo_ate' is null
         or (coalesce(c.scheduled_at, c.started_at) at time zone (p_filtros ->> 'fuso'))::date
            <= (p_filtros ->> 'disparo_ate')::date)
    and (p_filtros ->> 'criada_de' is null
         or (c.created_at at time zone (p_filtros ->> 'fuso'))::date >= (p_filtros ->> 'criada_de')::date)
    and (p_filtros ->> 'criada_ate' is null
         or (c.created_at at time zone (p_filtros ->> 'fuso'))::date <= (p_filtros ->> 'criada_ate')::date)
  ), false)
$$;

-- ── 3. As contagens por carimbo cumulativo, disjuntas ────────────────────────
-- A régua de lib/campanhas/metricas.ts: quem respondeu também foi entregue e
-- lido. Quem falhou conta só em erros.
create or replace function public.fn_escale_contagem_de_campanhas(p_org uuid, p_ids uuid[])
returns table (campaign_id uuid, adicionados integer, enviados integer, entregues integer, lidos integer, erros integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select r.campaign_id,
         count(*) filter (where r.eligibility_status = 'eligible')::integer,
         count(*) filter (where r.status <> 'failed'
                            and (r.sent_at is not null or r.delivered_at is not null
                                 or r.read_at is not null or r.replied_at is not null))::integer,
         count(*) filter (where r.status <> 'failed'
                            and (r.delivered_at is not null or r.read_at is not null
                                 or r.replied_at is not null))::integer,
         count(*) filter (where r.status <> 'failed'
                            and (r.read_at is not null or r.replied_at is not null))::integer,
         count(*) filter (where r.status = 'failed')::integer
    from public.campaign_recipients r
   where r.organization_id = p_org
     and r.campaign_id = any (p_ids)
   group by r.campaign_id
$$;

-- ── 4. A página ──────────────────────────────────────────────────────────────
create or replace function public.fn_escale_lista_de_campanhas(
  p_org uuid,
  p_filtros jsonb,
  p_limite integer,
  p_deslocamento integer
)
returns table (
  campaign_id uuid, total bigint, nome text, status text, numero uuid, solicitados integer,
  agendada_para timestamptz, iniciada_em timestamptz, criada_em timestamptz,
  adicionados integer, enviados integer, entregues integer, lidos integer, erros integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with pagina as (
    select c.id, c.name, c.status, c.channel_session_id, c.snapshot_total,
           c.scheduled_at, c.started_at, c.created_at, count(*) over () as total
      from public.campaigns c
     where c.organization_id = p_org
       and public.fn_role_at_least(p_org, 'manager')
       and public.fn_escale_campanha_passa(c, coalesce(p_filtros, '{}'::jsonb))
     order by c.created_at desc, c.id desc
     limit least(greatest(coalesce(p_limite, 10), 1), 100)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  ),
  contagens as (
    select * from public.fn_escale_contagem_de_campanhas(p_org, array(select pg.id from pagina pg))
  )
  select pg.id, pg.total, pg.name, pg.status, pg.channel_session_id, pg.snapshot_total,
         pg.scheduled_at, pg.started_at, pg.created_at,
         coalesce(k.adicionados, 0), coalesce(k.enviados, 0), coalesce(k.entregues, 0),
         coalesce(k.lidos, 0), coalesce(k.erros, 0)
    from pagina pg
    left join contagens k on k.campaign_id = pg.id
   order by pg.created_at desc, pg.id desc
$$;

-- ── 5. O resumo ──────────────────────────────────────────────────────────────
-- Sem rascunhos e canceladas, como a Clint (`_nin: ["CANCELED", "DRAFT"]`).
create or replace function public.fn_escale_resumo_das_campanhas(p_org uuid, p_filtros jsonb)
returns table (adicionados bigint, enviados bigint, entregues bigint, lidos bigint, erros bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with escolhidas as (
    select array(
      select c.id
        from public.campaigns c
       where c.organization_id = p_org
         and public.fn_role_at_least(p_org, 'manager')
         and c.status not in ('draft', 'cancelled')
         and public.fn_escale_campanha_passa(c, coalesce(p_filtros, '{}'::jsonb))
    ) as ids
  )
  select coalesce(sum(k.adicionados), 0)::bigint,
         coalesce(sum(k.enviados), 0)::bigint,
         coalesce(sum(k.entregues), 0)::bigint,
         coalesce(sum(k.lidos), 0)::bigint,
         coalesce(sum(k.erros), 0)::bigint
    from escolhidas e
    left join lateral public.fn_escale_contagem_de_campanhas(p_org, e.ids) k on true
$$;

-- ── 6. Quem executa ──────────────────────────────────────────────────────────
revoke all on function public.fn_escale_campanha_passa(public.campaigns, jsonb) from public, anon;
revoke all on function public.fn_escale_contagem_de_campanhas(uuid, uuid[]) from public, anon;
revoke all on function public.fn_escale_lista_de_campanhas(uuid, jsonb, integer, integer) from public, anon;
revoke all on function public.fn_escale_resumo_das_campanhas(uuid, jsonb) from public, anon;
grant execute on function public.fn_escale_campanha_passa(public.campaigns, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_contagem_de_campanhas(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.fn_escale_lista_de_campanhas(uuid, jsonb, integer, integer) to authenticated, service_role;
grant execute on function public.fn_escale_resumo_das_campanhas(uuid, jsonb) to authenticated, service_role;

comment on function public.fn_escale_lista_de_campanhas(uuid, jsonb, integer, integer) is
  'Fork Escale (9301): uma página da lista de campanhas da casca, com o filtro compilado, o total e as contagens por carimbo. Invoker; só gerente ou acima.';
comment on function public.fn_escale_resumo_das_campanhas(uuid, jsonb) is
  'Fork Escale (9301): as contagens somadas das campanhas do filtro, sem rascunhos e canceladas. Invoker; só gerente ou acima.';

notify pgrst, 'reload schema';
