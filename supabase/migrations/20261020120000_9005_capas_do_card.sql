-- manifest: **Capa do card do quadro de negócios (fork Escale, Fase 1E).** Tabela nova `crm_capas_do_card`: a preferência "Personalizar cards" de cada PESSOA (`user_id`), que vale em todas as origens dela, como na Clint (preferência `kanban_card`); `capa` é jsonb validado pela rota. Uma linha por pessoa em cada organização. RLS: a pessoa vê e escreve só a própria, e escrever exige papel viewer ou acima (`fn_role_at_least`, cerca de RBAC da 0150). FK composta com `on delete cascade` para `user_organizations`.
-- 9005: capa do card do quadro (fork Escale).

create table if not exists public.crm_capas_do_card (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  capa jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_capas_do_card_capa_objeto check (jsonb_typeof(capa) = 'object'),
  constraint crm_capas_do_card_capa_tamanho check (octet_length(capa::text) <= 4096),
  constraint crm_capas_do_card_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

-- Uma preferência por pessoa em cada organização: a rota lê antes de gravar, e
-- o índice é a guarda contra duas abas salvando ao mesmo tempo.
create unique index if not exists uq_crm_capas_do_card_pessoa
  on public.crm_capas_do_card (organization_id, user_id);
-- A FK composta apaga em cascata: o índice que começa por user_id serve a ela.
create index if not exists idx_crm_capas_do_card_pessoa
  on public.crm_capas_do_card (user_id, organization_id);

alter table public.crm_capas_do_card enable row level security;

drop policy if exists crm_capas_do_card_select on public.crm_capas_do_card;
drop policy if exists crm_capas_do_card_pessoa_write on public.crm_capas_do_card;

-- Quem vê: só a própria pessoa (e o suporte da plataforma).
create policy crm_capas_do_card_select on public.crm_capas_do_card
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid())
  );

-- Quem escreve: a própria pessoa, com papel viewer ou acima. O papel vem
-- explícito por causa da cerca de RBAC da 0150 (policy ALL não pode olhar só
-- tenancy). O suporte somente leitura para nas travas support_write_*.
create policy crm_capas_do_card_pessoa_write on public.crm_capas_do_card
  using (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'viewer')
    and user_id = auth.uid()
  )
  with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'viewer')
    and user_id = auth.uid()
  );

revoke all on public.crm_capas_do_card from anon;
grant select, insert, update, delete on public.crm_capas_do_card to authenticated;
grant all on public.crm_capas_do_card to service_role;

drop trigger if exists trg_crm_capas_do_card_updated_at on public.crm_capas_do_card;
create trigger trg_crm_capas_do_card_updated_at
  before update on public.crm_capas_do_card
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_capas_do_card is
  'Capa do card do quadro de negócios (fork Escale, migration 9005): a preferência "Personalizar cards" de cada pessoa, que vale em todas as origens dela (como a preferência kanban_card da Clint). Só a pessoa lê e escreve a sua.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
