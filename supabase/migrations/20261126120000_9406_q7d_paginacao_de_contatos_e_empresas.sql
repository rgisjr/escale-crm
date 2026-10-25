-- manifest: **Revisão Q7d: paginação de Contatos e Empresas sem refazer a busca a cada página (fork Escale, G7-12).** A página deixa de carregar `count(*) over ()` (que materializava o conjunto filtrado inteiro a cada troca de página) e passa a ler direto da tabela, na ordem da lista, parando em `offset + limite` linhas: `fn_escale_contato_do_filtro_passa` e `fn_escale_empresa_do_filtro_passa` (o predicado por linha, invoker) no lugar da função de tabela que o planejador não enxergava; `fn_escale_contatos_do_filtro` (massa 9103, público 9302, "Selecionar N") fica como na 9105 e é o que conta o total de contatos; `fn_escale_lista_de_contatos` e `fn_escale_lista_de_empresas` perdem a coluna `total`; o total vira `fn_escale_total_de_contatos` e `fn_escale_total_de_empresas`, pedidos uma vez por filtro. Índices `idx_contacts_org_atividade` e `idx_companies_org_atualizada` na ordem exata das listas. Mesma sequência de linhas e mesmo total de antes (gate de equivalência contra as definições da 9102/9105). Nenhum dado muda.
-- ---- FORK ESCALE · revisão Q7d: paginação de contatos e empresas (migration 9406) ----
-- 9406: revisão de qualidade Q7d (fork Escale, G7-12). Só funções e índices; nenhum dado muda.

-- Antes: `count(*) over ()` dentro da página obrigava o banco a materializar o conjunto
-- filtrado inteiro (e o SET search_path impede o inline da função de tabela), então toda
-- troca de página refazia a busca e contava tudo. Agora a página lê da tabela, na ordem da
-- lista, e para em offset + limite; o total sai numa função própria, pedida uma vez por filtro
-- (e conta com a consulta inteira, não com o predicado por contato: a contagem não tem LIMIT).

-- ── 1. Os índices, na ordem exata das listas ─────────────────────────────────
create index if not exists idx_contacts_org_atividade
  on public.contacts (organization_id, last_activity_at desc nulls last, id desc)
  where kind = 'person' and is_merged_into is null;

create index if not exists idx_companies_org_atualizada
  on public.companies (organization_id, updated_at desc, id desc);

-- ── 2. O predicado de um contato, por linha ──────────────────────────────────
create or replace function public.fn_escale_contato_do_filtro_passa(
  c public.contacts,
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_filtros jsonb
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
     c.is_personal = (p_visao = 'pessoais')
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

-- ── 3. A página de contatos (sem o total) e o total ──────────────────────────
drop function if exists public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb);

create or replace function public.fn_escale_lista_de_contatos(
  p_org uuid,
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_limite integer,
  p_deslocamento integer,
  p_filtros jsonb default '{}'::jsonb
)
returns table (contact_id uuid, negocios integer, negocio_unico uuid)
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
  pagina as (
    select c.id, c.last_activity_at
      from public.contacts c
     where c.organization_id = p_org
       and c.kind = 'person'
       and c.is_merged_into is null
       and public.fn_escale_contato_do_filtro_passa(c, p_visao, p_padrao, p_digitos, p_cpf_hash, p_filtros)
     order by c.last_activity_at desc nulls last, c.id desc
     limit least(greatest(coalesce(p_limite, 10), 1), 100)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  )
  select pg.id,
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

create or replace function public.fn_escale_total_de_contatos(
  p_org uuid,
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_filtros jsonb default '{}'::jsonb
)
returns bigint
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  -- o filtro da 9105 como está: uma consulta só, que o planejador resolve com semi-join;
  -- chamar o predicado por contato (como a página faz, para parar cedo) não escala numa contagem inteira
  select count(*) from public.fn_escale_contatos_do_filtro(p_org, p_visao, p_padrao, p_digitos, p_cpf_hash, p_filtros)
$$;

-- ── 4. O predicado de uma empresa, por linha ─────────────────────────────────
create or replace function public.fn_escale_empresa_do_filtro_passa(
  co public.companies,
  p_escopo text,
  p_padrao text,
  p_digitos text,
  p_filtros jsonb
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
       (case p_escopo
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
$$;

-- ── 5. A página de empresas (sem o total) e o total ──────────────────────────
drop function if exists public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer);

create or replace function public.fn_escale_lista_de_empresas(
  p_org uuid,
  p_escopo text,
  p_padrao text,
  p_digitos text,
  p_filtros jsonb,
  p_limite integer,
  p_deslocamento integer
)
returns table (company_id uuid, contatos integer, negocios integer, negocio_unico uuid, valor_aberto_cents bigint, principal uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with moeda as (select currency from public.organizations where id = p_org),
  pagina as (
    select co.id, co.updated_at
      from public.companies co
     where co.organization_id = p_org
       and public.fn_escale_empresa_do_filtro_passa(co, p_escopo, p_padrao, p_digitos, p_filtros)
     order by co.updated_at desc, co.id desc
     limit least(greatest(coalesce(p_limite, 10), 1), 100)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  )
  select pg.id,
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

create or replace function public.fn_escale_total_de_empresas(
  p_org uuid,
  p_escopo text,
  p_padrao text,
  p_digitos text,
  p_filtros jsonb
)
returns bigint
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select count(*)
    from public.companies co
   where co.organization_id = p_org
     and
       (case p_escopo
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
$$;

-- ── 6. Portas: invoker, fechadas ao anon ─────────────────────────────────────
revoke all on function public.fn_escale_contato_do_filtro_passa(public.contacts, text, text, text[], text, jsonb) from public, anon;
revoke all on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb) from public, anon;
revoke all on function public.fn_escale_total_de_contatos(uuid, text, text, text[], text, jsonb) from public, anon;
revoke all on function public.fn_escale_empresa_do_filtro_passa(public.companies, text, text, text, jsonb) from public, anon;
revoke all on function public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer) from public, anon;
revoke all on function public.fn_escale_total_de_empresas(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.fn_escale_contato_do_filtro_passa(public.contacts, text, text, text[], text, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_total_de_contatos(uuid, text, text, text[], text, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_empresa_do_filtro_passa(public.companies, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer) to authenticated, service_role;
grant execute on function public.fn_escale_total_de_empresas(uuid, text, text, text, jsonb) to authenticated, service_role;

comment on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb) is
  'Fork Escale (9406): uma página da lista de contatos da casca, na ordem do índice, com os negócios que quem olha enxerga. Sem total (fn_escale_total_de_contatos). Invoker.';
comment on function public.fn_escale_total_de_contatos(uuid, text, text, text[], text, jsonb) is
  'Fork Escale (9406): quantos contatos a busca + visão + filtro devolve para quem olha. Invoker.';
comment on function public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer) is
  'Fork Escale (9406): uma página da lista de empresas da casca, com os contatos, os negócios e o valor em aberto que quem olha enxerga. Sem total (fn_escale_total_de_empresas). Invoker.';
comment on function public.fn_escale_total_de_empresas(uuid, text, text, text, jsonb) is
  'Fork Escale (9406): quantas empresas o escopo + busca + filtro devolve para quem olha. Invoker.';

notify pgrst, 'reload schema';
