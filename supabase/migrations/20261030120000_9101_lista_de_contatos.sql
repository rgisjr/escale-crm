-- manifest: **Lista de contatos da casca (fork Escale, Fase 2A).** Tabela nova `crm_colunas_das_listas`: as colunas que cada PESSOA escolheu em "Personalizar colunas" de uma lista (`lista` = `contatos`; `empresas` na Fase 2D), como as preferências `contacts_table_columns` e `organizations_table_columns` da Clint; `colunas` é jsonb validado pela rota. Uma linha por pessoa, organização e lista. RLS: a pessoa vê e escreve só a sua, e escrever exige papel viewer ou acima (`fn_role_at_least`, cerca de RBAC da 0150). FK composta com `on delete cascade` para `user_organizations`. Função `fn_escale_lista_de_contatos` (security invoker): uma página da lista de contatos com o total e os negócios de cada contato, contados com a RLS de quem olha (origens não arquivadas), com a mesma busca da lista do original (padrão regex, dígitos do telefone, CPF) mais o link do Instagram.
-- 9101: lista de contatos da casca (fork Escale, Frente B).

create table if not exists public.crm_colunas_das_listas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  lista text not null,
  colunas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Nome de lista curto e minúsculo; o conjunto (contatos, empresas) é da rota.
  constraint crm_colunas_das_listas_lista_valida check (lista ~ '^[a-z_]{1,30}$'),
  constraint crm_colunas_das_listas_colunas_objeto check (jsonb_typeof(colunas) = 'object'),
  constraint crm_colunas_das_listas_colunas_tamanho check (octet_length(colunas::text) <= 4096),
  constraint crm_colunas_das_listas_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create unique index if not exists uq_crm_colunas_das_listas_pessoa
  on public.crm_colunas_das_listas (organization_id, user_id, lista);
create index if not exists idx_crm_colunas_das_listas_pessoa
  on public.crm_colunas_das_listas (user_id, organization_id);

alter table public.crm_colunas_das_listas enable row level security;

drop policy if exists crm_colunas_das_listas_select on public.crm_colunas_das_listas;
drop policy if exists crm_colunas_das_listas_pessoa_write on public.crm_colunas_das_listas;

create policy crm_colunas_das_listas_select on public.crm_colunas_das_listas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid())
  );

create policy crm_colunas_das_listas_pessoa_write on public.crm_colunas_das_listas
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

revoke all on public.crm_colunas_das_listas from anon;
grant select, insert, update, delete on public.crm_colunas_das_listas to authenticated;
grant all on public.crm_colunas_das_listas to service_role;

drop trigger if exists trg_crm_colunas_das_listas_updated_at on public.crm_colunas_das_listas;
create trigger trg_crm_colunas_das_listas_updated_at
  before update on public.crm_colunas_das_listas
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_colunas_das_listas is
  'Colunas de cada lista da casca por pessoa (fork Escale, migration 9101), como contacts_table_columns da Clint. Só a pessoa lê e escreve a sua.';

-- A página da lista: ids na ordem, o total e os negócios que QUEM OLHA enxerga.
-- Invoker de propósito: a RLS de contacts e de crm_leads (fn_can_view_lead) vale
-- como numa leitura comum; o agent conta só os seus negócios e os sem dono.
create or replace function public.fn_escale_lista_de_contatos(
  p_org uuid,
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_limite integer,
  p_deslocamento integer
)
returns table (contact_id uuid, total bigint, negocios integer, negocio_unico uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with visiveis as not materialized (
    select l.id, l.contact_id
      from public.crm_leads l
      join public.crm_pipelines p on p.id = l.pipeline_id
     where l.organization_id = p_org
       and l.contact_id is not null
       and not p.is_archived
  ),
  filtrados as (
    select c.id, c.last_activity_at
      from public.contacts c
     where c.organization_id = p_org
       and c.kind = 'person'
       and c.is_merged_into is null
       and c.is_personal = (p_visao = 'pessoais')
       and (
         (p_padrao is null and coalesce(cardinality(p_digitos), 0) = 0 and p_cpf_hash is null)
         or (p_padrao is not null and (
              c.name ~* p_padrao
              or c.display_name ~* p_padrao
              or c.email ~* p_padrao
              or c.phone_number ~* p_padrao
              or (c.custom_fields ->> 'link_instagram') ~* p_padrao))
         or exists (
              select 1 from unnest(coalesce(p_digitos, '{}'::text[])) d
               where c.phone_number like '%' || d || '%')
         or (p_cpf_hash is not null and c.cpf_hash = p_cpf_hash)
       )
       and (
         p_visao in ('todos', 'pessoais')
         or (p_visao = 'com_negocio' and exists (select 1 from visiveis v where v.contact_id = c.id))
         or (p_visao = 'sem_negocio' and not exists (select 1 from visiveis v where v.contact_id = c.id))
       )
  ),
  pagina as (
    select f.id, f.last_activity_at, count(*) over () as total
      from filtrados f
     order by f.last_activity_at desc nulls last, f.id desc
     limit least(greatest(coalesce(p_limite, 10), 1), 100)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  )
  select pg.id,
         pg.total,
         coalesce(n.negocios, 0),
         case when n.negocios = 1 then n.unico end
    from pagina pg
    left join lateral (
      select count(*)::integer as negocios, min(v.id::text)::uuid as unico
        from visiveis v
       where v.contact_id = pg.id
    ) n on true
   order by pg.last_activity_at desc nulls last, pg.id desc
$$;

revoke all on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer) from public, anon;
grant execute on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer) to authenticated, service_role;

comment on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer) is
  'Fork Escale (9101): uma página da lista de contatos da casca, com o total e os negócios (origens não arquivadas) que quem olha enxerga. Invoker.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
