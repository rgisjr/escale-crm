-- manifest: **Campos por objeto (fork Escale, Fase 2C).** Grupos de campos por objeto (`crm_grupos_de_campos`), catálogo do contato e da empresa (`crm_campos_do_crm`, mesma forma de `definicao` da 9006, todo membro lê e só administrador escreve), `grupo_id` e `papel_minimo` no catálogo do negócio, `custom_fields` em `companies`, o tipo `datetime` em `fn_escale_campo_valido`, a semente idempotente `fn_escale_semear_campos_padrao` (definer fechada ao `service_role`: "Informações Gerais" nos três objetos e os quatro campos padrão da empresa), a cópia das chaves já usadas pelos contatos para o catálogo do contato e as ações `alterar_campo` e `limpar_campo` em `crm_acoes_em_massa`.
-- 9104: campos por objeto (fork Escale, Frente B).

-- ── 1. Grupos de campos ──────────────────────────────────────────────────────
create table if not exists public.crm_grupos_de_campos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  objeto text not null,
  chave text not null,
  nome text not null,
  posicao integer not null default 0,
  padrao boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_grupos_de_campos_objeto check (objeto in ('negocio', 'contato', 'empresa')),
  constraint crm_grupos_de_campos_chave check (chave ~ '^[a-z][a-z0-9_]{0,23}$'),
  constraint crm_grupos_de_campos_nome check (char_length(btrim(nome)) between 1 and 60)
);

create unique index if not exists uq_crm_grupos_de_campos_chave
  on public.crm_grupos_de_campos (organization_id, objeto, chave);
create unique index if not exists uq_crm_grupos_de_campos_nome
  on public.crm_grupos_de_campos (organization_id, objeto, lower(btrim(nome)));

alter table public.crm_grupos_de_campos enable row level security;
drop policy if exists crm_grupos_de_campos_select on public.crm_grupos_de_campos;
drop policy if exists crm_grupos_de_campos_admin_write on public.crm_grupos_de_campos;
create policy crm_grupos_de_campos_select on public.crm_grupos_de_campos
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_grupos_de_campos_admin_write on public.crm_grupos_de_campos
  using (public.fn_is_platform_admin_full()
         or (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id, 'admin')))
  with check (public.fn_is_platform_admin_full()
         or (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id, 'admin')));
revoke all on public.crm_grupos_de_campos from anon;
grant select, insert, update, delete on public.crm_grupos_de_campos to authenticated;
grant all on public.crm_grupos_de_campos to service_role;
drop trigger if exists trg_crm_grupos_de_campos_updated_at on public.crm_grupos_de_campos;
create trigger trg_crm_grupos_de_campos_updated_at
  before update on public.crm_grupos_de_campos for each row execute function public.fn_set_updated_at();
comment on table public.crm_grupos_de_campos is 'Fork Escale (2C): grupos de campos por objeto (negócio, contato, empresa), como o fields_template.groups da Clint.';

-- ── 2. O tipo datetime (a mesma lista da 9006, mais um) ──────────────────────
create or replace function public.fn_escale_campo_valido(p jsonb)
  returns boolean
  language sql
  immutable
  set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_typeof(p) = 'object'
    and jsonb_typeof(p->'key') = 'string'
    and (p->>'key') ~* '^[a-z][a-z0-9_]*$'
    and char_length(p->>'key') <= 40
    and jsonb_typeof(p->'label') = 'string'
    and char_length(p->>'label') between 1 and 80
    and (p->>'type') in ('text', 'textarea', 'number', 'currency', 'date', 'datetime', 'select', 'multiselect', 'boolean', 'email', 'phone', 'url'),
    false)
$$;

-- ── 3. Catálogo do contato e da empresa ──────────────────────────────────────
create table if not exists public.crm_campos_do_crm (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  objeto text not null,
  chave text not null,
  definicao jsonb not null,
  grupo_id uuid references public.crm_grupos_de_campos(id) on delete set null,
  papel_minimo text,
  posicao integer not null default 0,
  padrao boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_campos_do_crm_objeto check (objeto in ('contato', 'empresa')),
  constraint crm_campos_do_crm_chave check (chave ~ '^[a-z][a-z0-9_]{0,39}$' and chave not like 'link\_%'),
  constraint crm_campos_do_crm_definicao check (
    jsonb_typeof(definicao) = 'object' and not (definicao ?| array['key', 'obrigatorio_em'])
    and public.fn_escale_campo_valido(definicao || jsonb_build_object('key', chave))
  ),
  constraint crm_campos_do_crm_tamanho check (octet_length(definicao::text) <= 262144),
  constraint crm_campos_do_crm_papel check (papel_minimo is null or papel_minimo in ('agent', 'manager', 'admin'))
);

create unique index if not exists uq_crm_campos_do_crm_chave
  on public.crm_campos_do_crm (organization_id, objeto, chave);
create unique index if not exists uq_crm_campos_do_crm_rotulo
  on public.crm_campos_do_crm (organization_id, objeto, lower(btrim(definicao->>'label')));
create index if not exists idx_crm_campos_do_crm_grupo on public.crm_campos_do_crm (grupo_id);

alter table public.crm_campos_do_crm enable row level security;
drop policy if exists crm_campos_do_crm_select on public.crm_campos_do_crm;
drop policy if exists crm_campos_do_crm_admin_write on public.crm_campos_do_crm;
create policy crm_campos_do_crm_select on public.crm_campos_do_crm
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_campos_do_crm_admin_write on public.crm_campos_do_crm
  using (public.fn_is_platform_admin_full()
         or (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id, 'admin')))
  with check (public.fn_is_platform_admin_full()
         or (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id, 'admin')));
revoke all on public.crm_campos_do_crm from anon;
grant select, insert, update, delete on public.crm_campos_do_crm to authenticated;
grant all on public.crm_campos_do_crm to service_role;
drop trigger if exists trg_crm_campos_do_crm_updated_at on public.crm_campos_do_crm;
create trigger trg_crm_campos_do_crm_updated_at
  before update on public.crm_campos_do_crm for each row execute function public.fn_set_updated_at();
comment on table public.crm_campos_do_crm is 'Fork Escale (2C): campos personalizados do contato e da empresa, da organização, em grupos (o negócio continua em crm_campos_do_negocio).';

-- Um campo padrão não muda de chave, de objeto nem é apagado.
create or replace function public.fn_escale_campos_do_crm_protege_padrao()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.padrao then
      raise exception 'campo_padrao_nao_se_exclui' using errcode = '22023';
    end if;
    return old;
  end if;
  if new.chave <> old.chave or new.objeto <> old.objeto or new.organization_id <> old.organization_id then
    raise exception 'campo_nao_muda_de_chave' using errcode = '22023';
  end if;
  if old.padrao and (new.definicao->>'label') is distinct from (old.definicao->>'label') then
    raise exception 'campo_padrao_nao_se_renomeia' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_crm_campos_do_crm_protege_padrao on public.crm_campos_do_crm;
create trigger trg_crm_campos_do_crm_protege_padrao
  before update or delete on public.crm_campos_do_crm for each row execute function public.fn_escale_campos_do_crm_protege_padrao();

-- O grupo padrão não é apagado nem muda de chave.
create or replace function public.fn_escale_grupos_de_campos_protege_padrao()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.padrao then raise exception 'grupo_padrao_nao_se_exclui' using errcode = '22023'; end if;
    return old;
  end if;
  if new.objeto <> old.objeto or new.organization_id <> old.organization_id or new.chave <> old.chave then
    raise exception 'grupo_nao_muda_de_chave' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_crm_grupos_de_campos_protege_padrao on public.crm_grupos_de_campos;
create trigger trg_crm_grupos_de_campos_protege_padrao
  before update or delete on public.crm_grupos_de_campos for each row execute function public.fn_escale_grupos_de_campos_protege_padrao();

-- ── 4. O catálogo do negócio ganha grupo e papel ─────────────────────────────
alter table public.crm_campos_do_negocio add column if not exists grupo_id uuid references public.crm_grupos_de_campos(id) on delete set null;
alter table public.crm_campos_do_negocio add column if not exists papel_minimo text;
alter table public.crm_campos_do_negocio drop constraint if exists crm_campos_do_negocio_papel;
alter table public.crm_campos_do_negocio add constraint crm_campos_do_negocio_papel
  check (papel_minimo is null or papel_minimo in ('agent', 'manager', 'admin'));
create index if not exists idx_crm_campos_do_negocio_grupo on public.crm_campos_do_negocio (grupo_id);

-- ── 5. A empresa guarda valores ──────────────────────────────────────────────
alter table public.companies add column if not exists custom_fields jsonb not null default '{}'::jsonb;
alter table public.companies drop constraint if exists companies_custom_fields_object;
alter table public.companies add constraint companies_custom_fields_object
  check (jsonb_typeof(custom_fields) = 'object' and octet_length(custom_fields::text) <= 32768);

-- ── 6. Semente idempotente ───────────────────────────────────────────────────
create or replace function public.fn_escale_semear_campos_padrao(p_org uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grupo uuid;
begin
  insert into public.crm_grupos_de_campos (organization_id, objeto, chave, nome, posicao, padrao)
  select p_org, o, 'informacoes_gerais', 'Informações Gerais', 0, true
    from unnest(array['negocio', 'contato', 'empresa']) as o
  on conflict (organization_id, objeto, chave) do nothing;

  select id into v_grupo from public.crm_grupos_de_campos
   where organization_id = p_org and objeto = 'empresa' and chave = 'informacoes_gerais';

  insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao, grupo_id, posicao, padrao)
  values
    (p_org, 'empresa', 'site', '{"label":"Site","type":"url"}'::jsonb, v_grupo, 0, true),
    (p_org, 'empresa', 'categoria', '{"label":"Categoria","type":"text"}'::jsonb, v_grupo, 1, true),
    (p_org, 'empresa', 'segmento', '{"label":"Segmento","type":"text"}'::jsonb, v_grupo, 2, true),
    (p_org, 'empresa', 'numero_de_funcionarios', '{"label":"Número de funcionários","type":"number"}'::jsonb, v_grupo, 3, true)
  on conflict (organization_id, objeto, chave) do nothing;

  -- Os campos do negócio sem grupo passam para o padrão.
  update public.crm_campos_do_negocio c
     set grupo_id = g.id
    from public.crm_grupos_de_campos g
   where c.organization_id = p_org and c.grupo_id is null
     and g.organization_id = p_org and g.objeto = 'negocio' and g.chave = 'informacoes_gerais';
end;
$$;
revoke all on function public.fn_escale_semear_campos_padrao(uuid) from public, anon, authenticated;
grant execute on function public.fn_escale_semear_campos_padrao(uuid) to service_role;

-- Toda organização de hoje.
do $m$
declare r record;
begin
  for r in select id from public.organizations loop
    perform public.fn_escale_semear_campos_padrao(r.id);
  end loop;
end
$m$;

-- ── 7. Cópia das chaves do contato (Q3): mesma chave e definição do negócio ──
insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao, grupo_id, posicao, padrao)
select distinct on (n.organization_id, n.chave)
       n.organization_id, 'contato', n.chave, n.definicao, g.id, n.posicao, false
  from public.crm_campos_do_negocio n
  join public.crm_grupos_de_campos g
    on g.organization_id = n.organization_id and g.objeto = 'contato' and g.chave = 'informacoes_gerais'
 where n.chave not like 'link\_%'
   and exists (
     select 1 from public.contacts c
      where c.organization_id = n.organization_id
        and c.is_merged_into is null
        and c.custom_fields ? n.chave
        and nullif(btrim(c.custom_fields->>n.chave), '') is not null
   )
on conflict (organization_id, objeto, chave) do nothing;

-- ── 8. Ações do lote (2B N12): alterar e limpar campo ────────────────────────
alter table public.crm_acoes_em_massa drop constraint if exists crm_acoes_em_massa_acao_valida;
alter table public.crm_acoes_em_massa add constraint crm_acoes_em_massa_acao_valida
  check (acao in ('criar_negocios', 'incluir_tag', 'remover_tag', 'exportar', 'excluir', 'alterar_campo', 'limpar_campo'));

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;
notify pgrst, 'reload schema';
