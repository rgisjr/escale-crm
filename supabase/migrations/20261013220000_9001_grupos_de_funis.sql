-- manifest: **Grupos de funis (fork Escale, Fase 1A — painel Origens).** Tabela nova `crm_pipeline_groups` (organização + nome, único por organização sem olhar caixa) e coluna `crm_pipelines.group_id`, ligada por FK COMPOSTA `(organization_id, group_id)` → `crm_pipeline_groups (organization_id, id)`: o banco recusa ligar funil a grupo de outra organização, e excluir o grupo solta os funis (`on delete set null (group_id)`, pg15+) sem apagar nenhum. RLS igual à de `crm_pipelines`: toda a organização lê, só gerente ou admin escreve. Numeração 9001+ é a faixa do fork, para nunca disputar número com o original.
-- 9001: grupos de funis (fork Escale).

create table if not exists public.crm_pipeline_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_pipeline_groups_nome_valido check (char_length(btrim(name)) between 1 and 60),
  constraint crm_pipeline_groups_org_id_key unique (organization_id, id)
);

-- Nome único por organização, sem olhar caixa: "INSS" e "inss" seriam dois
-- grupos iguais no painel. A rota confere antes (e também sem acento); o índice
-- é a guarda contra corrida entre duas abas.
create unique index if not exists uq_crm_pipeline_groups_org_nome
  on public.crm_pipeline_groups (organization_id, lower(btrim(name)));

alter table public.crm_pipeline_groups enable row level security;

-- A mesma régua de crm_pipelines (migrations 0030 e 0533): ver e abrir é de
-- qualquer papel; organizar é configuração, manager+. O bypass da plataforma na
-- escrita é o `_full`, que o suporte em modo somente leitura não tem.
drop policy if exists crm_pipeline_groups_select on public.crm_pipeline_groups;
drop policy if exists crm_pipeline_groups_manager_write on public.crm_pipeline_groups;

create policy crm_pipeline_groups_select on public.crm_pipeline_groups
  for select using (
    (organization_id in (select public.fn_user_org_ids()))
    or public.fn_is_platform_admin()
  );

create policy crm_pipeline_groups_manager_write on public.crm_pipeline_groups
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

revoke all on public.crm_pipeline_groups from anon;
grant select, insert, update, delete on public.crm_pipeline_groups to authenticated;
grant all on public.crm_pipeline_groups to service_role;

drop trigger if exists trg_crm_pipeline_groups_updated_at on public.crm_pipeline_groups;
create trigger trg_crm_pipeline_groups_updated_at
  before update on public.crm_pipeline_groups
  for each row execute function public.fn_set_updated_at();

alter table public.crm_pipelines add column if not exists group_id uuid;

-- FK COMPOSTA: com `organization_id` dos dois lados, funil da organização A não
-- aponta para grupo da B nem por engano da aplicação. `set null (group_id)` só
-- zera o grupo — `organization_id` é NOT NULL e fica onde está.
do $grupo$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_pipelines_group_fk'
  ) then
    alter table public.crm_pipelines
      add constraint crm_pipelines_group_fk
      foreign key (organization_id, group_id)
      references public.crm_pipeline_groups (organization_id, id)
      on delete set null (group_id);
  end if;
end $grupo$;

create index if not exists idx_crm_pipelines_group_id
  on public.crm_pipelines (group_id) where group_id is not null;

comment on table public.crm_pipeline_groups is
  'Grupos de funis (fork Escale, migration 9001): o painel Origens de Negócios mostra cada grupo abrindo os funis dele. Excluir o grupo solta os funis (group_id vira null), nunca apaga funil.';
comment on column public.crm_pipelines.group_id is
  'Grupo de funis (crm_pipeline_groups) da MESMA organização — a FK composta crm_pipelines_group_fk recusa grupo de outra. NULL = "Sem grupo".';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
-- Na cadeia de migrations, esta chamada é o que dá as três travas
-- support_write_* à tabela nova. No baseline.sql o bloco mora ANTES da última
-- chamada do arquivo, que também a cobre; chamar aqui é idempotente.
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
