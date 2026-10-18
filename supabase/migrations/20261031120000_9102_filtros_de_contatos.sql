-- manifest: **Filtros da lista de contatos (fork Escale, Fase 2B).** Filtros salvos das listas por pessoa (`crm_filtros_das_listas`: até 20 por pessoa e lista, nome único, o compartilhado visível na organização, só quem criou escreve) e o filtro avaliado no banco com a RLS de quem olha (`fn_escale_contatos_do_filtro` e as peças `fn_escale_passa_condicao`, `fn_escale_contato_passa`, `fn_escale_grupo_passa`, `fn_escale_negocio_passa` e `fn_escale_tags_passam` — as tags em grupos E/OU, sem caixa —, todas invoker); `fn_escale_lista_de_contatos` ganha o 8º parâmetro `p_filtros`.
-- 9102: filtros da lista de contatos (fork Escale, Frente B).

-- ── 1. Filtros salvos das listas ─────────────────────────────────────────────
create table if not exists public.crm_filtros_das_listas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  lista text not null,
  nome text not null,
  compartilhado boolean not null default false,
  criterios jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Nome de lista curto e minúsculo; o conjunto (contatos, empresas) é da rota.
  constraint crm_filtros_das_listas_lista_valida check (lista ~ '^[a-z_]{1,30}$'),
  constraint crm_filtros_das_listas_nome_valido check (char_length(btrim(nome)) between 1 and 60),
  constraint crm_filtros_das_listas_criterios_objeto check (jsonb_typeof(criterios) = 'object'),
  constraint crm_filtros_das_listas_criterios_tamanho check (octet_length(criterios::text) <= 16384),
  constraint crm_filtros_das_listas_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create unique index if not exists uq_crm_filtros_das_listas_nome
  on public.crm_filtros_das_listas (organization_id, user_id, lista, lower(btrim(nome)));
create index if not exists idx_crm_filtros_das_listas_lista
  on public.crm_filtros_das_listas (organization_id, lista);
create index if not exists idx_crm_filtros_das_listas_pessoa
  on public.crm_filtros_das_listas (user_id, organization_id);

alter table public.crm_filtros_das_listas enable row level security;

drop policy if exists crm_filtros_das_listas_select on public.crm_filtros_das_listas;
drop policy if exists crm_filtros_das_listas_dono_write on public.crm_filtros_das_listas;

-- O pessoal só para quem criou; o compartilhado para toda a organização.
create policy crm_filtros_das_listas_select on public.crm_filtros_das_listas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (user_id = auth.uid() or compartilhado))
  );

-- Só quem criou escreve (qualquer papel, a partir de viewer).
create policy crm_filtros_das_listas_dono_write on public.crm_filtros_das_listas
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

revoke all on public.crm_filtros_das_listas from anon;
grant select, insert, update, delete on public.crm_filtros_das_listas to authenticated;
grant all on public.crm_filtros_das_listas to service_role;

drop trigger if exists trg_crm_filtros_das_listas_updated_at on public.crm_filtros_das_listas;
create trigger trg_crm_filtros_das_listas_updated_at
  before update on public.crm_filtros_das_listas
  for each row execute function public.fn_set_updated_at();

-- No máximo 20 por pessoa em cada lista ("Limite de 20 filtros salvos atingido", Clint).
create or replace function public.fn_crm_filtros_das_listas_limite()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_total integer;
begin
  if tg_op = 'UPDATE'
     and (new.organization_id, new.user_id, new.lista)
         is not distinct from (old.organization_id, old.user_id, old.lista) then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'crm_filtros_das_listas:' || new.organization_id::text || ':' || new.user_id::text || ':' || new.lista, 0));
  select count(*) into v_total
    from public.crm_filtros_das_listas f
   where f.organization_id = new.organization_id
     and f.user_id = new.user_id
     and f.lista = new.lista
     and (tg_op = 'INSERT' or f.id <> old.id);
  if v_total >= 20 then
    raise exception 'crm_filtros_das_listas_limite: no máximo 20 filtros salvos por pessoa em cada lista'
      using errcode = 'check_violation', constraint = 'crm_filtros_das_listas_limite';
  end if;
  return new;
end;
$$;

revoke all on function public.fn_crm_filtros_das_listas_limite() from public, anon;

drop trigger if exists trg_crm_filtros_das_listas_limite on public.crm_filtros_das_listas;
create trigger trg_crm_filtros_das_listas_limite
  before insert or update of organization_id, user_id, lista on public.crm_filtros_das_listas
  for each row execute function public.fn_crm_filtros_das_listas_limite();

comment on table public.crm_filtros_das_listas is
  'Filtros salvos das listas da casca (fork Escale, migration 9102), como userFilterPreset da Clint. O pessoal só para quem criou; o compartilhado para a organização; só quem criou escreve.';

-- ── 2. Uma condição da seção Campos sobre um valor ───────────────────────────
-- p_cond é a CondicaoCompilada da rota: {alvo, chave, tipo, op, valor, padrao}.
-- O "contém" usa o padrão que a ROTA montou (padraoRegexDeBusca, que escapa tudo).
create or replace function public.fn_escale_passa_condicao(p_valor jsonb, p_cond jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$
  with v as (
    select
      case
        when p_valor is null or jsonb_typeof(p_valor) = 'null' then null
        when jsonb_typeof(p_valor) = 'array'
          then (select string_agg(e, ' ') from jsonb_array_elements_text(p_valor) e)
        else p_valor #>> '{}'
      end as texto,
      case when jsonb_typeof(p_valor) = 'array'
        then (select coalesce(array_agg(lower(btrim(e))), '{}'::text[]) from jsonb_array_elements_text(p_valor) e)
      end as itens,
      p_cond ->> 'op' as op,
      p_cond ->> 'tipo' as tipo,
      p_cond ->> 'valor' as alvo,
      p_cond ->> 'padrao' as padrao
  ),
  x as (
    select v.*,
      (v.texto is null or btrim(v.texto) = '') as vazio,
      case when btrim(v.texto) ~ '^-?[0-9]+([.][0-9]+)?$' then btrim(v.texto)::numeric end as numero,
      case when v.alvo ~ '^-?[0-9]+([.][0-9]+)?$' then v.alvo::numeric end as alvo_numero,
      case when v.texto ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then left(v.texto, 10) end as dia
    from v
  ),
  y as (
    select x.*,
      case x.tipo
        when 'numero' then x.numero = x.alvo_numero
        when 'data' then x.dia = x.alvo
        -- Sim/Não: "Não" também acha quem nunca preencheu (regra da 1D).
        when 'booleano' then lower(coalesce(nullif(btrim(x.texto), ''), 'false')) = x.alvo
        else case when x.itens is not null then lower(btrim(x.alvo)) = any(x.itens)
                  else lower(btrim(x.texto)) = lower(btrim(x.alvo)) end
      end as igual
    from x
  )
  select coalesce(
    case y.op
      when 'vazio' then y.vazio
      when 'preenchido' then not y.vazio
      when 'contem' then not y.vazio and y.texto ~* y.padrao
      when 'nao_contem' then y.vazio or not (y.texto ~* y.padrao)
      when 'igual' then y.igual
      when 'diferente' then not coalesce(y.igual, false)
      when 'maior' then y.numero > y.alvo_numero
      when 'menor' then y.numero < y.alvo_numero
      when 'depois' then y.dia > y.alvo
      when 'antes' then y.dia < y.alvo
    end, false)
  from y
$$;

-- ── 3. Uma condição sobre um contato (do contato, ou de algum negócio visível) ─
create or replace function public.fn_escale_contato_passa(p_contato public.contacts, p_cond jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case when p_cond ->> 'alvo' = 'contato' then
      public.fn_escale_passa_condicao(
        case p_cond ->> 'chave'
          when 'nome' then to_jsonb(coalesce((p_contato).name, (p_contato).display_name))
          when 'email' then to_jsonb((p_contato).email)
          when 'telefone' then to_jsonb((p_contato).phone_number)
          when 'nascimento' then to_jsonb((p_contato).birthdate::text)
          else (p_contato).custom_fields -> (p_cond ->> 'chave')
        end,
        p_cond)
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

-- ── 4. Um grupo: E = todas as condições; OU = alguma ─────────────────────────
create or replace function public.fn_escale_grupo_passa(p_contato public.contacts, p_grupo jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case when coalesce(p_grupo ->> 'modo', 'e') = 'ou'
    then exists (
      select 1 from jsonb_array_elements(coalesce(p_grupo -> 'condicoes', '[]'::jsonb)) k
       where public.fn_escale_contato_passa(p_contato, k))
    else not exists (
      select 1 from jsonb_array_elements(coalesce(p_grupo -> 'condicoes', '[]'::jsonb)) k
       where not public.fn_escale_contato_passa(p_contato, k))
  end
$$;

-- ── 5. A seção Negócio: todos os critérios no MESMO negócio visível ──────────
-- "com" = existe um negócio que cumpre; "sem" = não existe nenhum.
create or replace function public.fn_escale_negocio_passa(p_contato public.contacts, p_negocio jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select (coalesce(p_negocio ->> 'tem', 'com') = 'com') = exists (
    select 1
      from public.crm_leads l
      join public.crm_pipelines p on p.id = l.pipeline_id
     where l.contact_id = (p_contato).id
       and l.organization_id = (p_contato).organization_id
       and not p.is_archived
       and (jsonb_array_length(coalesce(p_negocio -> 'origens', '[]'::jsonb)) = 0
            or l.pipeline_id::text in (select jsonb_array_elements_text(p_negocio -> 'origens')))
       and (jsonb_array_length(coalesce(p_negocio -> 'etapas', '[]'::jsonb)) = 0
            or l.stage_id::text in (select jsonb_array_elements_text(p_negocio -> 'etapas')))
       and (jsonb_array_length(coalesce(p_negocio -> 'status', '[]'::jsonb)) = 0
            or l.status in (select jsonb_array_elements_text(p_negocio -> 'status')))
       and (
         (jsonb_array_length(coalesce(p_negocio -> 'donos_usuarios', '[]'::jsonb)) = 0
          and jsonb_array_length(coalesce(p_negocio -> 'donos_agentes', '[]'::jsonb)) = 0
          and not coalesce((p_negocio ->> 'sem_dono')::boolean, false)
          and not coalesce((p_negocio ->> 'com_dono')::boolean, false))
         or l.owner_user_id::text in (
              select jsonb_array_elements_text(coalesce(p_negocio -> 'donos_usuarios', '[]'::jsonb)))
         or l.owner_agent_id::text in (
              select jsonb_array_elements_text(coalesce(p_negocio -> 'donos_agentes', '[]'::jsonb)))
         or (coalesce((p_negocio ->> 'sem_dono')::boolean, false)
             and l.owner_user_id is null and l.owner_agent_id is null)
         or (coalesce((p_negocio ->> 'com_dono')::boolean, false)
             and (l.owner_user_id is not null or l.owner_agent_id is not null))
       )
       and (jsonb_array_length(coalesce(p_negocio -> 'motivos', '[]'::jsonb)) = 0
            or (l.status = 'lost'
                and l.lost_reason in (select jsonb_array_elements_text(p_negocio -> 'motivos'))))
  )
$$;

-- ── 5b. A seção Tags: grupos de condições, como os Campos (prints 2b-18 a 2b-20) ──
-- p_filtro = {combinar, grupos[{modo, condicoes[{op, tag}]}]}, com a tag já minúscula
-- (a rota compila). Sem caixa dos dois lados: o gravado pode ter maiúscula de antes
-- da #1224. Dentro do grupo, E = todas; OU = alguma. Entre grupos, `combinar`.
create or replace function public.fn_escale_tags_passam(p_tags text[], p_filtro jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$
  with t as (
    select coalesce(array_agg(lower(btrim(x))), '{}'::text[]) as tags
      from unnest(coalesce(p_tags, '{}'::text[])) x
  ),
  c as (
    select gi.ordem as grupo,
           coalesce(gi.valor ->> 'modo', 'e') as modo,
           case k ->> 'op'
             when 'qualquer' then cardinality(t.tags) > 0
             when 'sem' then cardinality(t.tags) = 0
             when 'possui' then lower(btrim(k ->> 'tag')) = any(t.tags)
             when 'nao_possui' then not (lower(btrim(k ->> 'tag')) = any(t.tags))
             else false
           end as passa
      from t
     cross join jsonb_array_elements(coalesce(p_filtro -> 'grupos', '[]'::jsonb))
           with ordinality as gi(valor, ordem)
     cross join jsonb_array_elements(coalesce(gi.valor -> 'condicoes', '[]'::jsonb)) k
  ),
  g as (
    select c.grupo,
           case when min(c.modo) = 'ou' then bool_or(c.passa) else bool_and(c.passa) end as passa
      from c
     group by c.grupo
  )
  select case
           when not exists (select 1 from g) then true
           when coalesce(p_filtro ->> 'combinar', 'ou') = 'ou' then coalesce(bool_or(g.passa), false)
           else coalesce(bool_and(g.passa), false)
         end
    from g
$$;

-- ── 6. Os contatos de uma busca + visão + filtro (a base da lista e das ações em massa)
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
     -- a busca: a mesma da 9101
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
     -- a visão pronta
     and (
       p_visao in ('todos', 'pessoais')
       or (p_visao = 'com_negocio' and public.fn_escale_negocio_passa(c, '{"tem":"com"}'::jsonb))
       or (p_visao = 'sem_negocio' and public.fn_escale_negocio_passa(c, '{"tem":"sem"}'::jsonb))
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

-- ── 7. A lista da 9101, agora com o filtro ───────────────────────────────────
drop function if exists public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer);

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
  pagina as (
    select f.contact_id as id, f.last_activity_at, count(*) over () as total
      from public.fn_escale_contatos_do_filtro(p_org, p_visao, p_padrao, p_digitos, p_cpf_hash, p_filtros) f
     order by f.last_activity_at desc nulls last, f.contact_id desc
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

revoke all on function public.fn_escale_passa_condicao(jsonb, jsonb) from public, anon;
revoke all on function public.fn_escale_contato_passa(public.contacts, jsonb) from public, anon;
revoke all on function public.fn_escale_grupo_passa(public.contacts, jsonb) from public, anon;
revoke all on function public.fn_escale_negocio_passa(public.contacts, jsonb) from public, anon;
revoke all on function public.fn_escale_tags_passam(text[], jsonb) from public, anon;
revoke all on function public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb) from public, anon;
revoke all on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb) from public, anon;
grant execute on function public.fn_escale_passa_condicao(jsonb, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_contato_passa(public.contacts, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_grupo_passa(public.contacts, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_negocio_passa(public.contacts, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_tags_passam(text[], jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb) to authenticated, service_role;

comment on function public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb) is
  'Fork Escale (9102): os contatos de uma busca + visão + filtro compilado, na ordem da lista. Invoker: a RLS de quem olha decide os contatos e os negócios.';
comment on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb) is
  'Fork Escale (9101, 9102): uma página da lista de contatos da casca, com o total e os negócios que quem olha enxerga. Invoker.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
