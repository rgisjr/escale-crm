-- manifest: fork Escale · Fase 3A · preferências por pessoa da tela de Conversas da casca
-- ---- FORK ESCALE · preferências de Conversas (migration 9201) ----
--
-- "Personalizar visualização" (com os limites de alerta), os campos do cartão
-- do negócio e as seções visíveis do painel direito, por pessoa e organização
-- (A8, D5 e D7 do PRD de Conversas; seção 7). Molde: crm_colunas_das_listas
-- (9101) — uma linha por pessoa e chave; só a pessoa lê e escreve a sua.

create table if not exists public.crm_preferencias_de_conversas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  chave text not null,
  valor jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_preferencias_de_conversas_chave_valida
    check (chave in ('visualizacao', 'campos_do_negocio', 'secoes')),
  constraint crm_preferencias_de_conversas_valor_tamanho check (octet_length(valor::text) <= 8192),
  constraint crm_preferencias_de_conversas_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create unique index if not exists uq_crm_preferencias_de_conversas_pessoa
  on public.crm_preferencias_de_conversas (organization_id, user_id, chave);
create index if not exists idx_crm_preferencias_de_conversas_pessoa
  on public.crm_preferencias_de_conversas (user_id, organization_id);

alter table public.crm_preferencias_de_conversas enable row level security;

drop policy if exists crm_preferencias_de_conversas_select on public.crm_preferencias_de_conversas;
drop policy if exists crm_preferencias_de_conversas_pessoa_write on public.crm_preferencias_de_conversas;

create policy crm_preferencias_de_conversas_select on public.crm_preferencias_de_conversas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid())
  );

create policy crm_preferencias_de_conversas_pessoa_write on public.crm_preferencias_de_conversas
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

revoke all on public.crm_preferencias_de_conversas from anon;
grant select, insert, update, delete on public.crm_preferencias_de_conversas to authenticated;
grant all on public.crm_preferencias_de_conversas to service_role;

drop trigger if exists trg_crm_preferencias_de_conversas_updated_at on public.crm_preferencias_de_conversas;
create trigger trg_crm_preferencias_de_conversas_updated_at
  before update on public.crm_preferencias_de_conversas
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_preferencias_de_conversas is
  'Preferências da tela de Conversas da casca por pessoa (fork Escale, migration 9201): visualizacao (os campos da linha e os limites de alerta), campos_do_negocio (os campos do cartão) e secoes (as seções visíveis). Só a pessoa lê e escreve a sua.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;
notify pgrst, 'reload schema';
