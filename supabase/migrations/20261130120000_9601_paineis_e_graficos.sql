-- manifest: **Painéis e gráficos de Indicadores (fork Escale, Fase 7A).** Tabelas `crm_paineis` (nome, cor, ícone, permissões por usuários e por papéis, padrão, modelo, exclusão suave) e `crm_graficos` (painel, nome, descrição, layout, pergunta, opções, tipo). `fn_escale_pode_ver_painel` decide a visibilidade (admin tudo; listas vazias = todos; está na lista de usuários; o papel está na lista de papéis; viewer nunca) e a RLS a usa; gerente ou acima escreve; gatilho impede o 31º gráfico por painel. Índices `organization_id + data` nas tabelas-base que o motor consulta. Nenhum dado existente muda.
-- ---- FORK ESCALE · painéis e gráficos de Indicadores (migration 9601) ----

create table if not exists public.crm_paineis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  cor text not null default 'marca' check (char_length(cor) <= 20),
  icone text not null default 'chart-bar' check (icone ~ '^[a-z0-9-]{1,40}$'),
  permissoes_usuarios uuid[] not null default '{}',
  permissoes_papeis text[] not null default '{}'
    check (permissoes_papeis <@ array['viewer','agent','ai_operator','manager','admin']::text[]),
  padrao boolean not null default false,
  modelo boolean not null default false,
  capa text,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_crm_paineis_org_vivos on public.crm_paineis (organization_id, nome) where deleted_at is null;

create table if not exists public.crm_graficos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  painel_id uuid not null references public.crm_paineis(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  descricao text check (descricao is null or char_length(descricao) <= 140),
  tipo text not null default 'linha' check (tipo in ('linha','area','barra','barra_empilhada','pizza','donut','funil','tabela','numero','painel_de_kpi','ranking','barra_100','numero_avancado','heatmap','sankey','divisor')),
  layout jsonb not null default '{"x":0,"y":0,"w":6,"h":4}'::jsonb check (jsonb_typeof(layout) = 'object' and octet_length(layout::text) <= 1024),
  pergunta jsonb not null check (jsonb_typeof(pergunta) = 'object' and octet_length(pergunta::text) <= 65536),
  opcoes jsonb not null default '{}'::jsonb check (jsonb_typeof(opcoes) = 'object' and octet_length(opcoes::text) <= 65536),
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_crm_graficos_painel_vivos on public.crm_graficos (painel_id) where deleted_at is null;

create or replace function public.fn_escale_pode_ver_painel(p_org uuid, p_usuarios uuid[], p_papeis text[])
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  with eu as materialized (select public.fn_user_role_in_org(p_org) as papel)
  select case
    when public.fn_is_platform_admin() then true
    when eu.papel is null or eu.papel = 'viewer' then false
    when eu.papel = 'admin' then true
    when coalesce(cardinality(p_usuarios), 0) = 0 and coalesce(cardinality(p_papeis), 0) = 0 then true
    when auth.uid() = any (p_usuarios) then true
    when eu.papel = any (p_papeis) then true
    else false end
  from eu;
$$;
revoke all on function public.fn_escale_pode_ver_painel(uuid, uuid[], text[]) from public, anon;
grant execute on function public.fn_escale_pode_ver_painel(uuid, uuid[], text[]) to authenticated, service_role;

create or replace function public.fn_escale_limite_de_graficos() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Serializa as inserções do mesmo painel: duas ao mesmo tempo não furam o teto.
  perform pg_advisory_xact_lock(hashtextextended(new.painel_id::text, 0));
  if (select count(*) from public.crm_graficos g where g.painel_id = new.painel_id and g.deleted_at is null and g.id <> new.id) >= 30 then
    raise exception 'limite_de_graficos' using errcode = 'check_violation', hint = 'Um painel aceita no máximo 30 gráficos.';
  end if;
  return new;
end $$;
revoke all on function public.fn_escale_limite_de_graficos() from public, anon;
drop trigger if exists trg_escale_limite_de_graficos on public.crm_graficos;
create trigger trg_escale_limite_de_graficos before insert on public.crm_graficos
  for each row execute function public.fn_escale_limite_de_graficos();

alter table public.crm_paineis enable row level security;
alter table public.crm_graficos enable row level security;
revoke all on table public.crm_paineis, public.crm_graficos from anon;

drop policy if exists crm_paineis_select on public.crm_paineis;
create policy crm_paineis_select on public.crm_paineis for select to authenticated
  using (organization_id in (select public.fn_user_org_ids()) and deleted_at is null
         and public.fn_escale_pode_ver_painel(organization_id, permissoes_usuarios, permissoes_papeis));
drop policy if exists crm_paineis_insert on public.crm_paineis;
create policy crm_paineis_insert on public.crm_paineis for insert to authenticated
  with check (public.fn_role_at_least(organization_id, 'manager'));
drop policy if exists crm_paineis_update on public.crm_paineis;
create policy crm_paineis_update on public.crm_paineis for update to authenticated
  using (public.fn_role_at_least(organization_id, 'manager') and deleted_at is null
         and public.fn_escale_pode_ver_painel(organization_id, permissoes_usuarios, permissoes_papeis))
  with check (public.fn_role_at_least(organization_id, 'manager'));
drop policy if exists crm_paineis_delete on public.crm_paineis;
create policy crm_paineis_delete on public.crm_paineis for delete to authenticated
  using (public.fn_role_at_least(organization_id, 'manager') and not padrao and not modelo);

-- crm_graficos: visível quando o painel é visível (a RLS do painel vale na subconsulta);
-- escrita de gerente ou acima no painel visível.
drop policy if exists crm_graficos_select on public.crm_graficos;
create policy crm_graficos_select on public.crm_graficos for select to authenticated
  using (deleted_at is null and exists (select 1 from public.crm_paineis d where d.id = painel_id));
drop policy if exists crm_graficos_write on public.crm_graficos;
create policy crm_graficos_write on public.crm_graficos for all to authenticated
  using (public.fn_role_at_least(organization_id, 'manager') and exists (select 1 from public.crm_paineis d where d.id = painel_id))
  with check (public.fn_role_at_least(organization_id, 'manager') and exists (select 1 from public.crm_paineis d where d.id = painel_id and d.organization_id = crm_graficos.organization_id));

grant select, insert, update, delete on public.crm_paineis, public.crm_graficos to authenticated;
grant all on public.crm_paineis, public.crm_graficos to service_role;

-- Índices das tabelas-base (organization_id + data), só os que faltam.
create index if not exists idx_escale_ind_leads_org_criado on public.crm_leads (organization_id, created_at);
create index if not exists idx_escale_ind_leads_org_fechado on public.crm_leads (organization_id, closed_at) where closed_at is not null;
create index if not exists idx_escale_ind_leads_org_etapa_em on public.crm_leads (organization_id, stage_changed_at);
create index if not exists idx_escale_ind_conversas_org_criada on public.conversations (organization_id, created_at);
create index if not exists idx_escale_ind_conversas_org_encerrada on public.conversations (organization_id, service_closed_at) where service_closed_at is not null;
create index if not exists idx_escale_ind_tarefas_org_criada on public.crm_tasks (organization_id, created_at);
create index if not exists idx_escale_ind_tarefas_org_vence on public.crm_tasks (organization_id, due_date) where due_date is not null;
create index if not exists idx_escale_ind_atividades_org_concluida on public.crm_atividades_do_negocio (organization_id, concluida_em) where concluida_em is not null;
create index if not exists idx_escale_ind_contatos_org_criado on public.contacts (organization_id, created_at);
create index if not exists idx_escale_ind_empresas_org_criada on public.companies (organization_id, created_at);
create index if not exists idx_escale_ind_destinatarios_org_enviado on public.campaign_recipients (organization_id, sent_at) where sent_at is not null;
create index if not exists idx_escale_ind_ligacoes_org_inicio on public.voice_calls (organization_id, started_at);
create index if not exists idx_escale_ind_ganho_org_em on public.crm_ganho_do_negocio (organization_id, ganho_em);

comment on table public.crm_paineis is 'Fork Escale (9601): painéis de Indicadores. Visibilidade por fn_escale_pode_ver_painel; exclusão suave.';
comment on table public.crm_graficos is 'Fork Escale (9601): gráficos de um painel; `pergunta` é o jsonb de lib/escale/indicadores/pergunta.ts.';

-- Travas do suporte somente leitura nas tabelas novas (migration 0274); idempotente.
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
