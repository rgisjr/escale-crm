-- manifest: **Campos do CRM (fork Escale, Fase 1F-a).** Tabela nova `crm_campos_do_negocio`: o catálogo dos campos personalizados do NEGÓCIO da organização, como na Clint (campos da conta, não da origem). `crm_pipelines.settings.fields` passa a ser a PROJEÇÃO do catálogo em cada origem (as definições do catálogo + o `obrigatorio_em` da própria origem), mantida por dois gatilhos: quem lê `settings.fields` não muda. Gravar `settings.fields` com chave nova ou definição mudada adota no catálogo (administrador, suporte com escrita ou serviço); gravar sem uma chave não apaga, apagar é só no catálogo. A migration junta os `settings.fields` de hoje por chave (vence a origem que vem primeiro no painel; as outras definições ficam em `divergencias`), é idempotente e não mexe em valores de negócio. RLS: todo membro lê; só administrador escreve (`fn_role_at_least`, cerca de RBAC da 0150).
-- 9006: campos do CRM (fork Escale).

create table if not exists public.crm_campos_do_negocio (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  chave text not null,
  definicao jsonb not null,
  posicao integer not null default 0,
  divergencias jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_campos_do_negocio_chave_formato
    check (chave ~* '^[a-z][a-z0-9_]*$' and char_length(chave) <= 40),
  constraint crm_campos_do_negocio_definicao_objeto
    check (jsonb_typeof(definicao) = 'object' and not (definicao ?| array['key', 'obrigatorio_em'])),
  constraint crm_campos_do_negocio_definicao_tamanho
    check (octet_length(definicao::text) <= 262144),
  constraint crm_campos_do_negocio_divergencias_lista
    check (jsonb_typeof(divergencias) = 'array' and octet_length(divergencias::text) <= 32768)
);

-- Um campo por chave em cada organização: é a chave que os negócios usam em
-- `custom_fields`, e o que a junção e a adoção casam.
create unique index if not exists uq_crm_campos_do_negocio_chave
  on public.crm_campos_do_negocio (organization_id, chave);

alter table public.crm_campos_do_negocio enable row level security;

drop policy if exists crm_campos_do_negocio_select on public.crm_campos_do_negocio;
drop policy if exists crm_campos_do_negocio_admin_write on public.crm_campos_do_negocio;

-- Quem vê: todo membro (o quadro, o dossiê e as automações de todo papel leem
-- os campos) e o suporte da plataforma.
create policy crm_campos_do_negocio_select on public.crm_campos_do_negocio
  for select using (
    public.fn_is_platform_admin()
    or (organization_id in (select public.fn_user_org_ids()))
  );

-- Quem escreve: administrador, como Configurações › Funis hoje
-- (`updatePipelineConfig` exige `podeAdministrarEmpresa`). O papel vem explícito
-- por causa da cerca de RBAC da 0150.
create policy crm_campos_do_negocio_admin_write on public.crm_campos_do_negocio
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'admin'))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'admin'))
  );

revoke all on public.crm_campos_do_negocio from anon;
grant select, insert, update, delete on public.crm_campos_do_negocio to authenticated;
grant all on public.crm_campos_do_negocio to service_role;

drop trigger if exists trg_crm_campos_do_negocio_updated_at on public.crm_campos_do_negocio;
create trigger trg_crm_campos_do_negocio_updated_at
  before update on public.crm_campos_do_negocio
  for each row execute function public.fn_set_updated_at();

-- ── O item que vale como campo: a mesma régua do customFieldSchema ──────────
-- Não pode ser mais estrita que o zod (`lib/schemas/settings.ts`): rótulo só com
-- espaços passa no `min(1)` do zod, então passa aqui também (nada de descartar
-- dado que o app aceita).
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
    and (p->>'type') in ('text', 'textarea', 'number', 'currency', 'date', 'select', 'multiselect', 'boolean', 'email', 'phone', 'url'),
    false)
$$;

-- ── A projeção: o catálogo, na ordem dele, com o `obrigatorio_em` da origem ──
-- `p_pedidos` é o `settings.fields` que a origem tem (ou que está gravando): dele
-- só sai a regra de cada chave. Volátil de propósito: dentro do gatilho ela tem
-- de enxergar o campo que acabou de ser adotado.
create or replace function public.fn_escale_campos_projetados(p_org uuid, p_pedidos jsonb)
  returns jsonb
  language sql
  volatile
  set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      c.definicao
      || jsonb_build_object('key', c.chave)
      || coalesce((
           select jsonb_build_object('obrigatorio_em', x.e->'obrigatorio_em')
             from jsonb_array_elements(case when jsonb_typeof(p_pedidos) = 'array' then p_pedidos else '[]'::jsonb end)
                  with ordinality as x(e, i)
            where jsonb_typeof(x.e) = 'object'
              and x.e->>'key' = c.chave
              and jsonb_typeof(x.e->'obrigatorio_em') = 'object'
            order by x.i
            limit 1), '{}'::jsonb)
      order by c.posicao, c.chave),
    '[]'::jsonb)
    from public.crm_campos_do_negocio c
   where c.organization_id = p_org
$$;

-- ── A junção dos `settings.fields` de hoje (uma vez, e de novo sem efeito) ──
-- Por chave exata. Vence a definição da origem que vem primeiro no painel
-- (ativas antes das arquivadas, posição, criação, id); a posição do campo segue
-- essa ordem. Toda outra definição da mesma chave que difira da vencedora (em
-- qualquer propriedade, menos `key` e `obrigatorio_em`) vai para `divergencias`
-- (até 20 por campo, dentro do teto da coluna: a que não couber inteira entra
-- resumida, com `definicao_omitida`). Item inválido, ou com definição acima do
-- teto da tabela (256 KB), não entra, e a migration avisa (`raise notice`) em vez
-- de abortar. Devolve quantos campos entraram.
create or replace function public.fn_escale_juntar_campos_do_crm()
  returns integer
  language plpgsql
  security definer set search_path = public, pg_temp
as $$
declare
  c_max constant integer := 262144;
  c_inteiras constant integer := 12000;
  v_inseridos integer := 0;
  v_divergentes integer := 0;
  v_invalidos integer := 0;
  v_grandes integer := 0;
  r record;
begin
  for r in
    select p.id, p.name, x.e as item
      from public.crm_pipelines p
     cross join lateral jsonb_array_elements(
             case when jsonb_typeof(p.settings->'fields') = 'array' then p.settings->'fields' else '[]'::jsonb end
           ) as x(e)
  loop
    if not public.fn_escale_campo_valido(r.item) then
      v_invalidos := v_invalidos + 1;
    elsif octet_length((r.item - 'key' - 'obrigatorio_em')::text) > c_max then
      v_grandes := v_grandes + 1;
      raise notice 'campos do CRM: o item "%" da origem % (%) passa de % bytes e não entra no catálogo',
        r.item->>'key', r.name, r.id, c_max;
    end if;
  end loop;

  with ordem as (
    select p.id as pipeline_id, p.organization_id, p.name,
           row_number() over (partition by p.organization_id
                              order by p.is_archived, p.position, p.created_at, p.id) as n
      from public.crm_pipelines p
     where jsonb_typeof(p.settings->'fields') = 'array'
  ), itens as (
    select o.organization_id, o.pipeline_id, o.name, o.n, x.i, x.e,
           (x.e - 'key' - 'obrigatorio_em') as definicao
      from ordem o
      join public.crm_pipelines p on p.id = o.pipeline_id
      cross join lateral jsonb_array_elements(p.settings->'fields') with ordinality as x(e, i)
     where case when public.fn_escale_campo_valido(x.e)
                then octet_length((x.e - 'key' - 'obrigatorio_em')::text) <= c_max
                else false end
  ), vencedores as (
    select distinct on (organization_id, e->>'key')
           organization_id, e->>'key' as chave, definicao,
           (n * 1000 + i)::integer as posicao
      from itens
     order by organization_id, e->>'key', n, i
  ), perdedoras as (
    select distinct on (v.organization_id, v.chave, it.pipeline_id, it.definicao)
           v.organization_id, v.chave, it.pipeline_id, it.name, it.n, it.i, it.definicao
      from vencedores v
      join itens it
        on it.organization_id = v.organization_id
       and it.e->>'key' = v.chave
       and it.definicao is distinct from v.definicao
     order by v.organization_id, v.chave, it.pipeline_id, it.definicao, it.n, it.i
  ), numeradas as (
    select pe.*,
           row_number() over (partition by pe.organization_id, pe.chave order by pe.n, pe.i) as k,
           sum(octet_length(pe.definicao::text))
             over (partition by pe.organization_id, pe.chave order by pe.n, pe.i) as acumulado
      from perdedoras pe
  ), divergentes as (
    select v.organization_id, v.chave,
           coalesce(
             jsonb_agg(
               case when nu.acumulado <= c_inteiras
                    then jsonb_build_object('origem_id', nu.pipeline_id, 'origem', left(nu.name, 60),
                                            'definicao', nu.definicao)
                    else jsonb_build_object('origem_id', nu.pipeline_id, 'origem', left(nu.name, 60),
                                            'label', left(nu.definicao->>'label', 60),
                                            'type', nu.definicao->>'type', 'definicao_omitida', true)
               end
               order by nu.n, nu.i)
             filter (where nu.k <= 20),
             '[]'::jsonb) as lista
      from vencedores v
      left join numeradas nu
        on nu.organization_id = v.organization_id and nu.chave = v.chave
     group by v.organization_id, v.chave
  ), ins as (
    insert into public.crm_campos_do_negocio (organization_id, chave, definicao, posicao, divergencias)
    select v.organization_id, v.chave, v.definicao, v.posicao, d.lista
      from vencedores v
      join divergentes d using (organization_id, chave)
    on conflict (organization_id, chave) do nothing
    returning divergencias
  )
  select count(*), count(*) filter (where divergencias <> '[]'::jsonb)
    into v_inseridos, v_divergentes
    from ins;

  raise notice 'campos do CRM: % campos juntados, % com divergências, % itens inválidos descartados, % itens grandes demais pulados',
    v_inseridos, v_divergentes, v_invalidos, v_grandes;
  return v_inseridos;
end$$;

-- ── Gatilho da origem: adota no catálogo e grava a projeção ─────────────────
create or replace function public.fn_escale_pipeline_campos_do_crm()
  returns trigger
  language plpgsql
  security definer set search_path = public, pg_temp
as $$
declare
  v_pedidos jsonb;
  v_antigos jsonb;
  v_item jsonb;
  v_antigo jsonb;
  v_def jsonb;
  v_proxima integer;
  v_projecao jsonb;
begin
  -- O catálogo está reprojetando as origens: a linha já chega projetada.
  if coalesce(current_setting('escale.campos_do_crm', true), '') = 'projetando' then
    return new;
  end if;
  if jsonb_typeof(new.settings) is distinct from 'object' then
    return new;
  end if;

  v_pedidos := case when jsonb_typeof(new.settings->'fields') = 'array' then new.settings->'fields' else '[]'::jsonb end;
  v_antigos := case when tg_op = 'UPDATE' and jsonb_typeof(old.settings->'fields') = 'array'
                    then old.settings->'fields' else '[]'::jsonb end;

  -- Adoção: só administrador, suporte com escrita ou serviço (sem sessão).
  if auth.uid() is null
     or public.fn_is_platform_admin_full()
     or public.fn_role_at_least(new.organization_id, 'admin') then
    perform set_config('escale.campos_do_crm_origem', new.id::text, true);
    select coalesce(max(posicao), 0) into v_proxima
      from public.crm_campos_do_negocio where organization_id = new.organization_id;
    for v_item in select e from jsonb_array_elements(v_pedidos) e loop
      continue when not public.fn_escale_campo_valido(v_item);
      v_def := v_item - 'key' - 'obrigatorio_em';
      select x.e into v_antigo
        from jsonb_array_elements(v_antigos) with ordinality as x(e, i)
       where jsonb_typeof(x.e) = 'object' and x.e->>'key' = v_item->>'key'
       order by x.i
       limit 1;
      if v_antigo is null then
        -- Chave que a origem não tinha: cria. Se o catálogo já a tem, o catálogo vence.
        v_proxima := v_proxima + 1;
        insert into public.crm_campos_do_negocio (organization_id, chave, definicao, posicao)
        values (new.organization_id, v_item->>'key', v_def, v_proxima)
        on conflict (organization_id, chave) do nothing;
      elsif (v_antigo - 'key' - 'obrigatorio_em') is distinct from v_def then
        -- Definição mudada nesta gravação: muda em todas as origens. Se o catálogo
        -- não tem a chave (a origem a trazia de antes do catálogo), a definição
        -- mudada cria o campo em vez de se perder.
        v_proxima := v_proxima + 1;
        insert into public.crm_campos_do_negocio (organization_id, chave, definicao, posicao)
        values (new.organization_id, v_item->>'key', v_def, v_proxima)
        on conflict (organization_id, chave) do update
          set definicao = excluded.definicao
          where crm_campos_do_negocio.definicao is distinct from excluded.definicao;
      end if;
    end loop;
    perform set_config('escale.campos_do_crm_origem', '', true);
  end if;

  v_projecao := public.fn_escale_campos_projetados(new.organization_id, v_pedidos);
  -- Origem sem `fields` numa organização sem campos: não acrescenta a chave.
  if not (new.settings ? 'fields') and v_projecao = '[]'::jsonb then
    return new;
  end if;
  new.settings := jsonb_set(new.settings, '{fields}', v_projecao);
  return new;
end$$;

-- ── Gatilho do catálogo: reprojeta as origens da organização ────────────────
create or replace function public.fn_escale_campos_do_negocio_reprojeta()
  returns trigger
  language plpgsql
  security definer set search_path = public, pg_temp
as $$
declare
  v_org uuid := coalesce(new.organization_id, old.organization_id);
  v_origem text := coalesce(current_setting('escale.campos_do_crm_origem', true), '');
  v_anterior text := coalesce(current_setting('escale.campos_do_crm', true), '');
begin
  if tg_op = 'UPDATE' and new.chave is distinct from old.chave then
    raise exception 'a chave de um campo do CRM não muda (%)', old.chave using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'um campo do CRM não muda de organização' using errcode = '22023';
  end if;
  -- Escrita direta no catálogo (administrador): a mesma régua do customFieldSchema.
  -- Vive aqui, e não num CHECK, porque o CHECK rodaria com os privilégios de quem
  -- escreve e `fn_escale_campo_valido` não é executável pela sessão.
  if tg_op <> 'DELETE'
     and not public.fn_escale_campo_valido(new.definicao || jsonb_build_object('key', new.chave)) then
    raise exception 'definição inválida para o campo do CRM (%)', new.chave using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.definicao = old.definicao and new.posicao = old.posicao then
    return null;
  end if;
  -- A organização foi apagada (cascata): não há origem para reprojetar.
  if tg_op = 'DELETE' and not exists (select 1 from public.organizations where id = v_org) then
    return null;
  end if;
  perform set_config('escale.campos_do_crm', 'projetando', true);
  -- Só reescreve a origem cuja projeção mudou, travando em ordem estável (menos deadlock).
  with alvo as (
    select p.id
      from public.crm_pipelines p
     where p.organization_id = v_org
       and jsonb_typeof(p.settings) = 'object'
       -- A origem que está sendo gravada recebe a projeção no próprio gatilho.
       and (v_origem = '' or p.id::text <> v_origem)
       and (p.settings ? 'fields'
            or exists (select 1 from public.crm_campos_do_negocio c where c.organization_id = p.organization_id))
       and p.settings->'fields' is distinct from
           public.fn_escale_campos_projetados(p.organization_id, p.settings->'fields')
     order by p.id
       for update
  )
  update public.crm_pipelines p
     set settings = jsonb_set(p.settings, '{fields}',
                              public.fn_escale_campos_projetados(p.organization_id, p.settings->'fields'))
    from alvo
   where p.id = alvo.id;
  perform set_config('escale.campos_do_crm', v_anterior, true);
  return null;
end$$;

-- As DUAS origens de EXECUTE (item 9 do CLAUDE.md), para as cinco funções.
revoke all on function public.fn_escale_campo_valido(jsonb) from public;
revoke execute on function public.fn_escale_campo_valido(jsonb) from anon;
revoke execute on function public.fn_escale_campo_valido(jsonb) from authenticated;
revoke all on function public.fn_escale_campos_projetados(uuid, jsonb) from public;
revoke execute on function public.fn_escale_campos_projetados(uuid, jsonb) from anon;
revoke execute on function public.fn_escale_campos_projetados(uuid, jsonb) from authenticated;
revoke all on function public.fn_escale_juntar_campos_do_crm() from public;
revoke execute on function public.fn_escale_juntar_campos_do_crm() from anon;
revoke execute on function public.fn_escale_juntar_campos_do_crm() from authenticated;
revoke all on function public.fn_escale_pipeline_campos_do_crm() from public;
revoke execute on function public.fn_escale_pipeline_campos_do_crm() from anon;
revoke execute on function public.fn_escale_pipeline_campos_do_crm() from authenticated;
revoke all on function public.fn_escale_campos_do_negocio_reprojeta() from public;
revoke execute on function public.fn_escale_campos_do_negocio_reprojeta() from anon;
revoke execute on function public.fn_escale_campos_do_negocio_reprojeta() from authenticated;

-- ── A junção e a primeira projeção, ANTES dos gatilhos ──────────────────────
-- Rodar de novo (baseline reaplicado, update.sh) não muda nada: a junção pula
-- chave que já existe e a projeção é a mesma; com os gatilhos já criados, o
-- 'projetando' faz o da origem deixar a linha como veio.
select public.fn_escale_juntar_campos_do_crm();

do $f$
begin
  perform set_config('escale.campos_do_crm', 'projetando', true);
  -- Só as origens cuja projeção difere do que têm; ordem estável de travas.
  with alvo as (
    select p.id
      from public.crm_pipelines p
     where jsonb_typeof(p.settings) = 'object'
       and (p.settings ? 'fields'
            or exists (select 1 from public.crm_campos_do_negocio c where c.organization_id = p.organization_id))
       and p.settings->'fields' is distinct from
           public.fn_escale_campos_projetados(p.organization_id, p.settings->'fields')
     order by p.id
       for update
  )
  update public.crm_pipelines p
     set settings = jsonb_set(p.settings, '{fields}',
                              public.fn_escale_campos_projetados(p.organization_id, p.settings->'fields'))
    from alvo
   where p.id = alvo.id;
  perform set_config('escale.campos_do_crm', '', true);
end $f$;

drop trigger if exists trg_escale_pipeline_campos_do_crm on public.crm_pipelines;
create trigger trg_escale_pipeline_campos_do_crm
  before insert or update of settings on public.crm_pipelines
  for each row execute function public.fn_escale_pipeline_campos_do_crm();

drop trigger if exists trg_escale_campos_do_negocio_reprojeta on public.crm_campos_do_negocio;
create trigger trg_escale_campos_do_negocio_reprojeta
  after insert or update or delete on public.crm_campos_do_negocio
  for each row execute function public.fn_escale_campos_do_negocio_reprojeta();

comment on table public.crm_campos_do_negocio is
  'Campos personalizados do negócio da organização (fork Escale, migration 9006), como os campos da conta da Clint. crm_pipelines.settings.fields de cada origem é a projeção deste catálogo mais o obrigatorio_em da origem (gatilhos trg_escale_pipeline_campos_do_crm e trg_escale_campos_do_negocio_reprojeta). Todo membro lê; só administrador escreve.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
