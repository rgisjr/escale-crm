-- manifest: **Visualizações de origens (fork Escale, Fase 1C — painel Origens).** Três tabelas novas: `crm_pipeline_views` (nome único por organização sem olhar caixa, e `acesso` = `todos` ou `escolhidos`), `crm_pipeline_view_origens` (as origens de cada visualização, na ordem das colunas, por FK COMPOSTA para `crm_pipelines (organization_id, id)` com `on delete cascade`) e `crm_pipeline_view_pessoas` (quem vê quando o acesso é `escolhidos`, por FK composta para `user_organizations (user_id, organization_id)` com `on delete cascade`). RLS: acesso `todos` é visto pela organização inteira; `escolhidos`, só por gerente/admin e pelas pessoas escolhidas; só gerente ou admin escreve. Os negócios dentro da visualização continuam sob a RLS de cada origem. `fn_escale_salvar_visualizacao` grava a visualização e as duas listas numa transação, como quem chama (security invoker).
-- 9003: visualizações de origens (fork Escale).

-- Alvo da FK composta das origens: índice único (organization_id, id) em
-- crm_pipelines. No baseline este bloco roda ANTES do bloco que cria esse
-- índice para as campanhas; criar só se não houver índice único sobre
-- exatamente essas duas colunas, com o MESMO nome que aquele bloco usaria (ele
-- confere pelas colunas e então pula).
do $alvo$
begin
  if not exists (
    select 1
      from pg_index i
      join pg_class t on t.oid = i.indrelid
     where t.relname = 'crm_pipelines'
       and t.relnamespace = 'public'::regnamespace
       and i.indisunique
       and i.indnatts = 2
       and (
         select array_agg(a.attname::text order by k.ord)
           from unnest(i.indkey) with ordinality as k(attnum, ord)
           join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
       ) = array['organization_id', 'id']
  ) then
    create unique index uq_crm_pipelines_org_id on public.crm_pipelines (organization_id, id);
  end if;
end $alvo$;

create table if not exists public.crm_pipeline_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  acesso text not null default 'todos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_pipeline_views_nome_valido check (char_length(btrim(name)) between 1 and 60),
  constraint crm_pipeline_views_acesso_valido check (acesso in ('todos', 'escolhidos')),
  constraint crm_pipeline_views_org_id_key unique (organization_id, id)
);

-- Nome único por organização, sem olhar caixa (a rota confere antes, também sem
-- acento); o índice é a guarda contra corrida entre duas abas.
create unique index if not exists uq_crm_pipeline_views_org_nome
  on public.crm_pipeline_views (organization_id, lower(btrim(name)));

create table if not exists public.crm_pipeline_view_origens (
  view_id uuid not null,
  organization_id uuid not null,
  pipeline_id uuid not null,
  position integer not null,
  primary key (view_id, pipeline_id),
  constraint crm_pipeline_view_origens_view_fk foreign key (organization_id, view_id)
    references public.crm_pipeline_views (organization_id, id) on delete cascade,
  constraint crm_pipeline_view_origens_funil_fk foreign key (organization_id, pipeline_id)
    references public.crm_pipelines (organization_id, id) on delete cascade
);

create index if not exists idx_crm_pipeline_view_origens_funil
  on public.crm_pipeline_view_origens (organization_id, pipeline_id);

create table if not exists public.crm_pipeline_view_pessoas (
  view_id uuid not null,
  organization_id uuid not null,
  user_id uuid not null,
  primary key (view_id, user_id),
  constraint crm_pipeline_view_pessoas_view_fk foreign key (organization_id, view_id)
    references public.crm_pipeline_views (organization_id, id) on delete cascade,
  constraint crm_pipeline_view_pessoas_membro_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create index if not exists idx_crm_pipeline_view_pessoas_membro
  on public.crm_pipeline_view_pessoas (user_id, organization_id);

alter table public.crm_pipeline_views enable row level security;
alter table public.crm_pipeline_view_origens enable row level security;
alter table public.crm_pipeline_view_pessoas enable row level security;

drop policy if exists crm_pipeline_views_select on public.crm_pipeline_views;
drop policy if exists crm_pipeline_views_manager_write on public.crm_pipeline_views;
drop policy if exists crm_pipeline_view_origens_select on public.crm_pipeline_view_origens;
drop policy if exists crm_pipeline_view_origens_manager_write on public.crm_pipeline_view_origens;
drop policy if exists crm_pipeline_view_pessoas_select on public.crm_pipeline_view_pessoas;
drop policy if exists crm_pipeline_view_pessoas_manager_write on public.crm_pipeline_view_pessoas;

-- Quem vê a visualização: a organização inteira quando o acesso é `todos`;
-- quando é `escolhidos`, gerente/admin e as pessoas da lista. O que aparece
-- DENTRO dela não é decidido aqui: cada origem é lida com a sessão de quem olha.
create policy crm_pipeline_views_select on public.crm_pipeline_views
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (acesso = 'todos'
             or public.fn_role_at_least(organization_id, 'manager')
             or exists (
               select 1 from public.crm_pipeline_view_pessoas p
                where p.view_id = crm_pipeline_views.id
                  and p.user_id = auth.uid()
             )))
  );

-- As origens seguem a visualização: a subconsulta roda sob a RLS acima.
create policy crm_pipeline_view_origens_select on public.crm_pipeline_view_origens
  for select using (
    exists (select 1 from public.crm_pipeline_views v where v.id = crm_pipeline_view_origens.view_id)
  );

-- A lista de pessoas: cada um vê a própria linha; gerente/admin veem todas
-- (para editar). Não consulta crm_pipeline_views — sem ciclo entre policies.
create policy crm_pipeline_view_pessoas_select on public.crm_pipeline_view_pessoas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager')))
  );

-- Escrever é configuração: manager+, a mesma régua dos grupos (migration 9001).
create policy crm_pipeline_views_manager_write on public.crm_pipeline_views
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

create policy crm_pipeline_view_origens_manager_write on public.crm_pipeline_view_origens
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

create policy crm_pipeline_view_pessoas_manager_write on public.crm_pipeline_view_pessoas
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

revoke all on public.crm_pipeline_views from anon;
revoke all on public.crm_pipeline_view_origens from anon;
revoke all on public.crm_pipeline_view_pessoas from anon;
grant select, insert, update, delete on public.crm_pipeline_views to authenticated;
grant select, insert, update, delete on public.crm_pipeline_view_origens to authenticated;
grant select, insert, update, delete on public.crm_pipeline_view_pessoas to authenticated;
grant all on public.crm_pipeline_views to service_role;
grant all on public.crm_pipeline_view_origens to service_role;
grant all on public.crm_pipeline_view_pessoas to service_role;

drop trigger if exists trg_crm_pipeline_views_updated_at on public.crm_pipeline_views;
create trigger trg_crm_pipeline_views_updated_at
  before update on public.crm_pipeline_views
  for each row execute function public.fn_set_updated_at();

-- Grava a visualização e as duas listas numa transação só. INVOKER: a RLS de
-- quem chama vale em cada comando (agent e viewer param no 42501), e as FKs
-- compostas recusam origem ou pessoa de outra organização (23503).
create or replace function public.fn_escale_salvar_visualizacao(
  p_id uuid,
  p_org uuid,
  p_nome text,
  p_acesso text,
  p_origens uuid[],
  p_pessoas uuid[]
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if coalesce(cardinality(p_origens), 0) not between 1 and 20 then
    raise exception 'uma visualização junta de 1 a 20 origens' using errcode = '22023';
  end if;

  update public.crm_pipeline_views
     set name = btrim(p_nome), acesso = p_acesso
   where id = p_id and organization_id = p_org;
  if not found then
    insert into public.crm_pipeline_views (id, organization_id, name, acesso)
      values (p_id, p_org, btrim(p_nome), p_acesso);
  end if;

  delete from public.crm_pipeline_view_origens where view_id = p_id and organization_id = p_org;
  insert into public.crm_pipeline_view_origens (view_id, organization_id, pipeline_id, position)
    select p_id, p_org, o.pipeline_id, o.ordem::integer
      from unnest(p_origens) with ordinality as o(pipeline_id, ordem);

  delete from public.crm_pipeline_view_pessoas where view_id = p_id and organization_id = p_org;
  if p_acesso = 'escolhidos' then
    insert into public.crm_pipeline_view_pessoas (view_id, organization_id, user_id)
      select distinct p_id, p_org, u.user_id
        from unnest(coalesce(p_pessoas, '{}'::uuid[])) as u(user_id);
  end if;
end;
$$;

revoke all on function public.fn_escale_salvar_visualizacao(uuid, uuid, text, text, uuid[], uuid[]) from public, anon;
grant execute on function public.fn_escale_salvar_visualizacao(uuid, uuid, text, text, uuid[], uuid[])
  to authenticated, service_role;

comment on table public.crm_pipeline_views is
  'Visualizações de origens (fork Escale, migration 9003): um quadro que junta várias origens. acesso = todos (a organização inteira vê) ou escolhidos (gerente/admin e as pessoas de crm_pipeline_view_pessoas). Os negócios dentro dela seguem a RLS de cada origem.';
comment on table public.crm_pipeline_view_origens is
  'As origens (crm_pipelines) de cada visualização, na ordem das colunas (position). FK composta: origem da mesma organização; apagar a origem tira ela da visualização.';
comment on table public.crm_pipeline_view_pessoas is
  'Quem vê a visualização quando o acesso é escolhidos. FK composta para user_organizations: só membro da organização; sair da organização tira a pessoa da lista.';
comment on function public.fn_escale_salvar_visualizacao(uuid, uuid, text, text, uuid[], uuid[]) is
  'Cria ou atualiza a visualização p_id da organização p_org e troca as origens (na ordem de p_origens) e as pessoas (só com acesso escolhidos) numa transação. Security invoker: a RLS de quem chama vale. Chamador: app/api/v1/pipeline-views.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
-- Na cadeia de migrations, esta chamada é o que dá as três travas
-- support_write_* às tabelas novas. No baseline.sql o bloco mora ANTES da
-- última chamada do arquivo, que também as cobre; chamar aqui é idempotente.
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
