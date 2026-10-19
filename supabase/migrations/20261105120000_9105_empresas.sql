-- manifest: **Empresas da casca (fork Escale, Fase 2D).** Liga o módulo `crm_b2b` na instalação (`platform_config MODULO_CRM_B2B = ligado`), um contato principal por empresa (`uq_company_people_um_principal`), as escritas da casca em `people`/`company_people`/`companies` por funções definer fechadas ao `service_role` (`fn_escale_pessoa_do_contato`, `fn_escale_criar_empresa`, `fn_escale_vincular_contato_a_empresa`, `fn_escale_desvincular_contato_da_empresa`, `fn_escale_tornar_principal`, `fn_escale_excluir_empresa`), `companies.custom_fields` (valores dos campos da 2C), a lista invoker `fn_escale_lista_de_empresas` (página, total, contatos, negócios e valor em aberto com a RLS de quem olha), o filtro por campos da empresa (`fn_escale_empresa_passa`, `fn_escale_grupo_da_empresa_passa`) e as funções da 9102 `fn_escale_contato_passa` (alvo `empresa`) e `fn_escale_contatos_do_filtro` (busca pelo nome da empresa) recriadas.
-- 9105: empresas da casca (fork Escale, Frente B).

-- ── 1. O módulo B2B ligado para todos (E1) ───────────────────────────────────
insert into public.platform_config (chave, valor, eh_segredo, semeado_do_env)
values ('MODULO_CRM_B2B', 'ligado', false, false)
on conflict (chave) do update set valor = 'ligado';

-- ── 1b. A empresa guarda os valores dos campos personalizados (2C) ───────────
-- Mora aqui, e não na 9104, porque `public.companies` só existe no baseline
-- depois do bloco B2B do original: este bloco vai para o FIM do arquivo.
alter table public.companies add column if not exists custom_fields jsonb not null default '{}'::jsonb;
alter table public.companies drop constraint if exists companies_custom_fields_object;
alter table public.companies add constraint companies_custom_fields_object
  check (jsonb_typeof(custom_fields) = 'object' and octet_length(custom_fields::text) <= 32768);

-- ── 2. Um contato principal por empresa ──────────────────────────────────────
-- Antes do índice, deixa só o vínculo principal mais antigo de cada empresa.
update public.company_people cp
   set is_primary = false
 where cp.is_primary
   and exists (
     select 1 from public.company_people o
      where o.company_id = cp.company_id and o.is_primary
        and (o.created_at, o.id) < (cp.created_at, cp.id));
create unique index if not exists uq_company_people_um_principal
  on public.company_people (company_id) where is_primary;

-- ── 3. A pessoa do contato (a casca não a mostra) ────────────────────────────
create or replace function public.fn_escale_pessoa_do_contato(p_org uuid, p_contato uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pessoa uuid;
  v_nome text;
begin
  select c.person_id, coalesce(nullif(btrim(c.name), ''), nullif(btrim(c.display_name), ''), c.phone_number, c.email, 'Contato')
    into v_pessoa, v_nome
    from public.contacts c
   where c.id = p_contato and c.organization_id = p_org and c.is_merged_into is null
   for update;
  if not found then
    raise exception 'contato_nao_encontrado' using errcode = 'P0002';
  end if;
  if v_pessoa is not null then
    return v_pessoa;
  end if;
  insert into public.people (organization_id, full_name)
  values (p_org, v_nome)
  returning id into v_pessoa;
  update public.contacts set person_id = v_pessoa where id = p_contato and organization_id = p_org;
  return v_pessoa;
end;
$$;

-- ── 4. Vincular (uma empresa por contato na casca, N4) ───────────────────────
create or replace function public.fn_escale_vincular_contato_a_empresa(p_org uuid, p_contato uuid, p_empresa uuid, p_principal boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pessoa uuid;
  v_tem_principal boolean;
begin
  perform 1 from public.companies where id = p_empresa and organization_id = p_org for update;
  if not found then
    raise exception 'empresa_nao_encontrada' using errcode = 'P0002';
  end if;
  v_pessoa := public.fn_escale_pessoa_do_contato(p_org, p_contato);

  -- Sai das outras empresas (a casca mostra uma só).
  delete from public.company_people
   where organization_id = p_org and person_id = v_pessoa and company_id <> p_empresa;

  insert into public.company_people (organization_id, company_id, person_id, is_primary)
  values (p_org, p_empresa, v_pessoa, false)
  on conflict (company_id, person_id) do nothing;

  select exists (select 1 from public.company_people where company_id = p_empresa and is_primary)
    into v_tem_principal;
  if p_principal or not v_tem_principal then
    update public.company_people set is_primary = false where company_id = p_empresa and is_primary and person_id <> v_pessoa;
    update public.company_people set is_primary = true where company_id = p_empresa and person_id = v_pessoa;
  end if;
  update public.companies set updated_at = now() where id = p_empresa;
end;
$$;

-- ── 5. Criar (passo Empresa + passo Contato) ─────────────────────────────────
create or replace function public.fn_escale_criar_empresa(
  p_org uuid, p_autor uuid, p_nome text, p_cnpj text, p_cnpj_normalizado text, p_site text, p_contato uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if nullif(btrim(p_nome), '') is null then
    raise exception 'nome_obrigatorio' using errcode = '22023';
  end if;
  insert into public.companies (organization_id, trade_name, cnpj, normalized_cnpj, created_by, custom_fields)
  values (
    p_org, btrim(p_nome), nullif(p_cnpj, ''), nullif(p_cnpj_normalizado, ''), p_autor,
    case when nullif(btrim(p_site), '') is null then '{}'::jsonb else jsonb_build_object('site', btrim(p_site)) end
  )
  returning id into v_id;
  perform public.fn_escale_vincular_contato_a_empresa(p_org, p_contato, v_id, true);
  return v_id;
end;
$$;

-- ── 6. Remover da empresa (N7) ───────────────────────────────────────────────
create or replace function public.fn_escale_desvincular_contato_da_empresa(p_org uuid, p_contato uuid, p_empresa uuid, p_novo_principal uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pessoa uuid;
  v_era_principal boolean;
  v_restam integer;
  v_novo_pessoa uuid;
begin
  perform 1 from public.companies where id = p_empresa and organization_id = p_org for update;
  if not found then
    raise exception 'empresa_nao_encontrada' using errcode = 'P0002';
  end if;
  select c.person_id into v_pessoa from public.contacts c where c.id = p_contato and c.organization_id = p_org;
  select cp.is_primary into v_era_principal
    from public.company_people cp where cp.company_id = p_empresa and cp.person_id = v_pessoa;
  if not found then
    raise exception 'contato_fora_da_empresa' using errcode = 'P0002';
  end if;

  select count(*) into v_restam from public.company_people where company_id = p_empresa and person_id <> v_pessoa;
  if v_restam = 0 then
    delete from public.companies where id = p_empresa and organization_id = p_org;
    return 'empresa_excluida';
  end if;

  if v_era_principal then
    select c.person_id into v_novo_pessoa
      from public.contacts c
      join public.company_people cp on cp.person_id = c.person_id and cp.company_id = p_empresa
     where c.id = p_novo_principal and c.organization_id = p_org and c.person_id <> v_pessoa;
    if v_novo_pessoa is null then
      raise exception 'escolha_o_principal' using errcode = '22023';
    end if;
  end if;

  delete from public.company_people where company_id = p_empresa and person_id = v_pessoa;
  if v_era_principal then
    update public.company_people set is_primary = true where company_id = p_empresa and person_id = v_novo_pessoa;
  end if;
  update public.companies set updated_at = now() where id = p_empresa;
  return 'removido';
end;
$$;

-- ── 7. Trocar ou tirar o principal ───────────────────────────────────────────
create or replace function public.fn_escale_tornar_principal(p_org uuid, p_empresa uuid, p_contato uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pessoa uuid;
begin
  perform 1 from public.companies where id = p_empresa and organization_id = p_org for update;
  if not found then
    raise exception 'empresa_nao_encontrada' using errcode = 'P0002';
  end if;
  update public.company_people set is_primary = false where company_id = p_empresa and is_primary;
  if p_contato is null then
    return;
  end if;
  select c.person_id into v_pessoa from public.contacts c where c.id = p_contato and c.organization_id = p_org;
  update public.company_people set is_primary = true where company_id = p_empresa and person_id = v_pessoa;
  if not found then
    raise exception 'contato_fora_da_empresa' using errcode = 'P0002';
  end if;
end;
$$;

-- ── 8. Excluir mantendo os contatos (E6, N8) ─────────────────────────────────
create or replace function public.fn_escale_excluir_empresa(p_org uuid, p_empresa uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.companies where id = p_empresa and organization_id = p_org;
  if not found then
    raise exception 'empresa_nao_encontrada' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.fn_escale_pessoa_do_contato(uuid, uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_criar_empresa(uuid, uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_vincular_contato_a_empresa(uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.fn_escale_desvincular_contato_da_empresa(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_tornar_principal(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_excluir_empresa(uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_escale_pessoa_do_contato(uuid, uuid) to service_role;
grant execute on function public.fn_escale_criar_empresa(uuid, uuid, text, text, text, text, uuid) to service_role;
grant execute on function public.fn_escale_vincular_contato_a_empresa(uuid, uuid, uuid, boolean) to service_role;
grant execute on function public.fn_escale_desvincular_contato_da_empresa(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.fn_escale_tornar_principal(uuid, uuid, uuid) to service_role;
grant execute on function public.fn_escale_excluir_empresa(uuid, uuid) to service_role;

-- ── 9. O filtro por campos da empresa ────────────────────────────────────────
create or replace function public.fn_escale_empresa_passa(p_empresa public.companies, p_cond jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.fn_escale_passa_condicao(
    case p_cond ->> 'chave'
      when 'nome' then to_jsonb(coalesce(nullif(btrim((p_empresa).trade_name), ''), (p_empresa).legal_name))
      when 'cidade' then to_jsonb((p_empresa).city)
      when 'estado' then to_jsonb((p_empresa).state)
      when 'cnpj' then to_jsonb((p_empresa).cnpj)
      else (p_empresa).custom_fields -> (p_cond ->> 'chave')
    end,
    p_cond)
$$;

create or replace function public.fn_escale_grupo_da_empresa_passa(p_empresa public.companies, p_grupo jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case when coalesce(p_grupo ->> 'modo', 'e') = 'ou'
    then exists (select 1 from jsonb_array_elements(p_grupo -> 'condicoes') c where public.fn_escale_empresa_passa(p_empresa, c))
    else not exists (select 1 from jsonb_array_elements(p_grupo -> 'condicoes') c where not public.fn_escale_empresa_passa(p_empresa, c))
  end
$$;

-- ── 10. A lista de empresas (invoker) ────────────────────────────────────────
create or replace function public.fn_escale_lista_de_empresas(
  p_org uuid,
  p_escopo text,
  p_padrao text,
  p_digitos text,
  p_filtros jsonb,
  p_limite integer,
  p_deslocamento integer
)
returns table (company_id uuid, total bigint, contatos integer, negocios integer, negocio_unico uuid, valor_aberto_cents bigint, principal uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with moeda as (select currency from public.organizations where id = p_org),
  filtradas as (
    select co.id, co.updated_at
      from public.companies co
     where co.organization_id = p_org
       and (case p_escopo
              when 'com_nome' then coalesce(nullif(btrim(co.trade_name), ''), nullif(btrim(co.legal_name), '')) is not null
              when 'sem_nome' then coalesce(nullif(btrim(co.trade_name), ''), nullif(btrim(co.legal_name), '')) is null
              else true end)
       and ((p_padrao is null and p_digitos is null)
            or (p_padrao is not null and (co.trade_name ~* p_padrao or co.legal_name ~* p_padrao))
            or (p_digitos is not null and co.normalized_cnpj like '%' || p_digitos || '%'))
       and (p_filtros -> 'campos' is null or (
              case when coalesce(p_filtros #>> '{campos,combinar}', 'ou') = 'ou'
                then exists (select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g where public.fn_escale_grupo_da_empresa_passa(co, g))
                else not exists (select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g where not public.fn_escale_grupo_da_empresa_passa(co, g))
              end))
  ),
  pagina as (
    select f.id, f.updated_at, count(*) over () as total
      from filtradas f
     order by f.updated_at desc, f.id desc
     limit least(greatest(coalesce(p_limite, 10), 1), 100)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  )
  select pg.id,
         pg.total,
         coalesce(k.contatos, 0),
         coalesce(n.negocios, 0),
         case when n.negocios = 1 then n.unico end,
         coalesce(n.valor, 0),
         k.principal
    from pagina pg
    left join lateral (
      select count(*)::integer as contatos,
             (array_agg(c.id order by cp.is_primary desc, cp.created_at) filter (where cp.is_primary))[1] as principal
        from public.company_people cp
        join public.contacts c on c.person_id = cp.person_id and c.organization_id = p_org and c.is_merged_into is null
       where cp.company_id = pg.id
    ) k on true
    left join lateral (
      select count(*)::integer as negocios,
             min(l.id::text)::uuid as unico,
             sum(l.value_cents) filter (where l.status = 'open' and coalesce(l.currency, (select currency from moeda)) = (select currency from moeda))::bigint as valor
        from public.company_people cp
        join public.contacts c on c.person_id = cp.person_id and c.organization_id = p_org and c.is_merged_into is null
        join public.crm_leads l on l.contact_id = c.id and l.organization_id = p_org
        join public.crm_pipelines p on p.id = l.pipeline_id and not p.is_archived
       where cp.company_id = pg.id
    ) n on true
   order by pg.updated_at desc, pg.id desc
$$;

-- ── 11. As duas da 9102, agora com a empresa ─────────────────────────────────
create or replace function public.fn_escale_contato_passa(p_contato public.contacts, p_cond jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case p_cond ->> 'alvo'
    when 'contato' then
      public.fn_escale_passa_condicao(
        case p_cond ->> 'chave'
          when 'nome' then to_jsonb(coalesce((p_contato).name, (p_contato).display_name))
          when 'email' then to_jsonb((p_contato).email)
          when 'telefone' then to_jsonb((p_contato).phone_number)
          when 'nascimento' then to_jsonb((p_contato).birthdate::text)
          else (p_contato).custom_fields -> (p_cond ->> 'chave')
        end,
        p_cond)
    when 'empresa' then
      case when p_cond ->> 'op' = 'vazio' then
        not exists (
          select 1 from public.company_people cp
            join public.companies co on co.id = cp.company_id
           where cp.person_id = (p_contato).person_id and cp.organization_id = (p_contato).organization_id
             and not public.fn_escale_empresa_passa(co, p_cond))
      else exists (
          select 1 from public.company_people cp
            join public.companies co on co.id = cp.company_id
           where cp.person_id = (p_contato).person_id and cp.organization_id = (p_contato).organization_id
             and public.fn_escale_empresa_passa(co, p_cond))
      end
    else exists (
      select 1
        from public.crm_leads l
        join public.crm_pipelines p on p.id = l.pipeline_id
       where l.contact_id = (p_contato).id
         and l.organization_id = (p_contato).organization_id
         and not p.is_archived
         and public.fn_escale_passa_condicao(
               case when p_cond ->> 'chave' = 'valor'
                 then to_jsonb(l.value_cents / 100.0)
                 else l.custom_fields -> (p_cond ->> 'chave') end,
               p_cond))
  end
$$;

create or replace function public.fn_escale_contatos_do_filtro(
  p_org uuid,
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_filtros jsonb
)
returns table (contact_id uuid, last_activity_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select c.id, c.last_activity_at
    from public.contacts c
   where c.organization_id = p_org
     and c.kind = 'person'
     and c.is_merged_into is null
     and c.is_personal = (p_visao = 'pessoais')
     -- a busca: a mesma da 9101, mais o nome da empresa (2D)
     and (
       (p_padrao is null and coalesce(cardinality(p_digitos), 0) = 0 and p_cpf_hash is null)
       or (p_padrao is not null and (
            c.name ~* p_padrao
            or c.display_name ~* p_padrao
            or c.email ~* p_padrao
            or c.phone_number ~* p_padrao
            or (c.custom_fields ->> 'link_instagram') ~* p_padrao
            or (c.person_id is not null and exists (
                 select 1 from public.company_people cp
                   join public.companies co on co.id = cp.company_id
                  where cp.person_id = c.person_id and cp.organization_id = c.organization_id
                    and (co.trade_name ~* p_padrao or co.legal_name ~* p_padrao)))))
       or exists (
            select 1 from unnest(coalesce(p_digitos, '{}'::text[])) d
             where c.phone_number like '%' || d || '%')
       or (p_cpf_hash is not null and c.cpf_hash = p_cpf_hash)
     )
     -- a visão pronta
     and (
       p_visao in ('todos', 'pessoais')
       or (p_visao = 'com_negocio' and exists (
            select 1
              from public.crm_leads l
              join public.crm_pipelines p on p.id = l.pipeline_id
             where l.contact_id = c.id
               and l.organization_id = c.organization_id
               and not p.is_archived))
       or (p_visao = 'sem_negocio' and not exists (
            select 1
              from public.crm_leads l
              join public.crm_pipelines p on p.id = l.pipeline_id
             where l.contact_id = c.id
               and l.organization_id = c.organization_id
               and not p.is_archived))
     )
     -- Contato › Data de criação (no fuso da organização)
     and (p_filtros ->> 'criado_de' is null
          or (c.created_at at time zone (p_filtros ->> 'fuso'))::date >= (p_filtros ->> 'criado_de')::date)
     and (p_filtros ->> 'criado_ate' is null
          or (c.created_at at time zone (p_filtros ->> 'fuso'))::date <= (p_filtros ->> 'criado_ate')::date)
     -- Contato › Telefone
     and (case p_filtros ->> 'telefone'
            when 'com' then c.phone_number is not null
            when 'sem' then c.phone_number is null
            when 'internacional' then c.phone_number ~ '^\+[1-9][0-9]{7,14}$' and c.phone_number !~ '^\+55'
            when 'invalido' then c.phone_number is not null
              and c.phone_number !~ '^\+55[1-9][0-9](9[0-9]{8}|[2-8][0-9]{7})$'
              and not (c.phone_number ~ '^\+[1-9][0-9]{7,14}$' and c.phone_number !~ '^\+55')
            else true
          end)
     -- Negócio
     and (p_filtros -> 'negocio' is null or public.fn_escale_negocio_passa(c, p_filtros -> 'negocio'))
     -- Tags: grupos E/OU, sem caixa (5b)
     and (p_filtros -> 'tags' is null or public.fn_escale_tags_passam(c.tags, p_filtros -> 'tags'))
     -- Campos: grupos combinados por E ou OU
     and (p_filtros -> 'campos' is null or (
            case when coalesce(p_filtros #>> '{campos,combinar}', 'ou') = 'ou'
              then exists (
                select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g
                 where public.fn_escale_grupo_passa(c, g))
              else not exists (
                select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g
                 where not public.fn_escale_grupo_passa(c, g))
            end))
$$;

revoke all on function public.fn_escale_empresa_passa(public.companies, jsonb) from public, anon;
revoke all on function public.fn_escale_grupo_da_empresa_passa(public.companies, jsonb) from public, anon;
revoke all on function public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer) from public, anon;
grant execute on function public.fn_escale_empresa_passa(public.companies, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_grupo_da_empresa_passa(public.companies, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer) to authenticated, service_role;

comment on function public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer) is
  'Fork Escale (9105): uma página da lista de empresas da casca, com o total, os contatos, os negócios e o valor em aberto que quem olha enxerga. Invoker.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;
notify pgrst, 'reload schema';
