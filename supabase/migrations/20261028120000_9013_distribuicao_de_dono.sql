-- manifest: **Distribuição de dono por origem (fork Escale, Fase 1K, D13).** Três tabelas novas, lidas por gerente ou acima da organização e escritas só por funções definer fechadas (o servidor chama com o service role depois de conferir que quem pede é administrador): `crm_distribuicao_de_dono` (quem recebe, com percentual, passo, índice e contador), `crm_distribuicoes_feitas` (cada negócio distribuído) e `crm_distribuicao_alteracoes` (o histórico da configuração: percentual alterado, pessoa entrou, saiu e contagem reiniciada, com o autor — é a auditoria do reset). `fn_escale_salvar_distribuicao` troca a lista inteira (soma 100, todos acima de 0, só quem pode receber) e recomeça o rodízio; `fn_escale_reiniciar_distribuicao` zera contador e índice e apaga as distribuições feitas. `trg_escale_reparte_dono_da_origem` (BEFORE INSERT em `crm_leads`) dá dono ao negócio que nasce sem dono e sem pessoa que o criou, pelo rodízio ponderado da Clint (menor índice; o índice anda maior%/meu%), só entre membros ativos agente, gerente ou administrador com acesso à origem (`fn_escale_recebe_da_origem`, a régua da 9010 com a pessoa como parâmetro); `trg_escale_registra_a_distribuicao` (AFTER INSERT) grava a distribuição feita e emite `lead.assigned`. Falhar ao distribuir vira aviso e não derruba a criação do negócio.
-- 9013: distribuição de dono (fork Escale).

-- ── AS TABELAS ──────────────────────────────────────────────────────────────
-- Tabela própria, e não o `settings` da origem: o contador muda a cada negócio,
-- e o `settings` é gravado inteiro pelo "Salvar" da janela (corrida). O passo
-- é `maior% / meu%` (quem tem o maior percentual anda 1 por negócio); o
-- próximo dono é quem tem o MENOR índice (Clint: `inc_index`, `cur_index`).
create table if not exists public.crm_distribuicao_de_dono (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  percentual numeric(5,2) not null,
  passo numeric not null,
  indice numeric not null default 0,
  contador integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pipeline_id, user_id),
  constraint crm_distribuicao_de_dono_percentual_valido check (percentual > 0 and percentual <= 100),
  constraint crm_distribuicao_de_dono_passo_valido check (passo >= 1),
  constraint crm_distribuicao_de_dono_contador_valido check (contador >= 0)
);
create index if not exists idx_crm_distribuicao_de_dono_org
  on public.crm_distribuicao_de_dono (organization_id, pipeline_id);

create table if not exists public.crm_distribuicoes_feitas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  distribuido_em timestamptz not null default now()
);
create index if not exists idx_crm_distribuicoes_feitas_origem
  on public.crm_distribuicoes_feitas (pipeline_id, distribuido_em desc);
create index if not exists idx_crm_distribuicoes_feitas_pessoa
  on public.crm_distribuicoes_feitas (pipeline_id, user_id, distribuido_em desc);
create index if not exists idx_crm_distribuicoes_feitas_lead
  on public.crm_distribuicoes_feitas (lead_id);

create table if not exists public.crm_distribuicao_alteracoes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  evento text not null,
  pessoa_id uuid references auth.users(id) on delete set null,
  percentual_antes numeric(5,2),
  percentual_depois numeric(5,2),
  autor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint crm_distribuicao_alteracoes_evento_valido
    check (evento in ('percentual_alterado', 'pessoa_entrou', 'pessoa_saiu', 'contagem_reiniciada'))
);
create index if not exists idx_crm_distribuicao_alteracoes_origem
  on public.crm_distribuicao_alteracoes (pipeline_id, created_at desc);

-- Leitura: gerente ou acima da organização (é o gerente que salva a lista de
-- pessoas da origem e precisa ver quem está na distribuição). Escrita: nenhuma
-- policy — só as funções abaixo, que o servidor chama depois de conferir o admin.
alter table public.crm_distribuicao_de_dono enable row level security;
alter table public.crm_distribuicoes_feitas enable row level security;
alter table public.crm_distribuicao_alteracoes enable row level security;

drop policy if exists crm_distribuicao_de_dono_select on public.crm_distribuicao_de_dono;
create policy crm_distribuicao_de_dono_select on public.crm_distribuicao_de_dono
  for select to authenticated
  using (
    public.fn_role_at_least(organization_id, 'manager')
    and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id)
  );

drop policy if exists crm_distribuicoes_feitas_select on public.crm_distribuicoes_feitas;
create policy crm_distribuicoes_feitas_select on public.crm_distribuicoes_feitas
  for select to authenticated
  using (
    public.fn_role_at_least(organization_id, 'manager')
    and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id)
  );

drop policy if exists crm_distribuicao_alteracoes_select on public.crm_distribuicao_alteracoes;
create policy crm_distribuicao_alteracoes_select on public.crm_distribuicao_alteracoes
  for select to authenticated
  using (
    public.fn_role_at_least(organization_id, 'manager')
    and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id)
  );

-- ── QUEM PODE RECEBER NEGÓCIO DESTA ORIGEM ─────────────────────────────────
-- Membro ativo (convite aceito, não revogado), papel agente, gerente ou admin
-- (o viewer seria recusado pelo `trg_lead_so_liga_a_propria_empresa`), e com
-- acesso à origem pela régua da 9010: admin sempre; senão a lista da origem;
-- vazia, a do grupo; as duas vazias, todos. Só contam textos com forma de uuid
-- (a leitura tolerante da 1J: lixo vale como "sem lista").
create or replace function public.fn_escale_recebe_da_origem(p_org uuid, p_origem uuid, p_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_papel text;
  v_bruta jsonb;
  v_grupo uuid;
  v_ids text[];
begin
  select uo.role into v_papel
    from public.user_organizations uo
   where uo.user_id = p_user
     and uo.organization_id = p_org
     and uo.accepted_at is not null
     and uo.revoked_at is null
   limit 1;
  if v_papel is null or v_papel not in ('agent', 'manager', 'admin') then
    return false;
  end if;
  if v_papel = 'admin' then
    return true;
  end if;

  select p.settings -> 'escale_pessoas', p.group_id into v_bruta, v_grupo
    from public.crm_pipelines p
   where p.id = p_origem
     and p.organization_id = p_org;
  if not found then
    return false;
  end if;

  for i in 1..2 loop
    select coalesce(array_agg(lower(e.v #>> '{}')), '{}') into v_ids
      from jsonb_array_elements(
        case when jsonb_typeof(v_bruta) = 'array' then v_bruta else '[]'::jsonb end
      ) as e(v)
     where jsonb_typeof(e.v) = 'string'
       and (e.v #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    exit when cardinality(v_ids) > 0 or i = 2;
    select g.settings -> 'escale_pessoas' into v_bruta
      from public.crm_pipeline_groups g
     where g.id = v_grupo
       and g.organization_id = p_org;
  end loop;

  return cardinality(v_ids) = 0 or lower(p_user::text) = any(v_ids);
end
$fn$;

revoke all on function public.fn_escale_recebe_da_origem(uuid, uuid, uuid) from public, anon, authenticated;

-- ── SALVAR A LISTA ─────────────────────────────────────────────────────────
-- Troca a lista inteira numa transação. Valida de novo o que a rota já validou
-- (soma arredondada 100 ou lista vazia; todos > 0 e <= 100; sem repetição; só
-- quem pode receber), registra no histórico quem saiu, entrou ou mudou de
-- percentual, e recomeça o rodízio (índice 0 para todos, como a Clint). Com
-- `p_reiniciar`, zera também o contador e apaga as distribuições feitas.
create or replace function public.fn_escale_salvar_distribuicao(
  p_org uuid,
  p_origem uuid,
  p_autor uuid,
  p_pessoas jsonb,
  p_reiniciar boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_ids uuid[];
  v_pcts numeric[];
  v_n integer;
  v_soma numeric;
  v_maior numeric;
  v_menor numeric;
begin
  perform 1 from public.crm_pipelines p where p.id = p_origem and p.organization_id = p_org;
  if not found then
    raise exception 'origem_nao_encontrada' using errcode = 'PT404';
  end if;
  if p_pessoas is null or jsonb_typeof(p_pessoas) <> 'array' or jsonb_array_length(p_pessoas) > 50 then
    raise exception 'distribuicao_invalida' using errcode = '22023';
  end if;

  select coalesce(array_agg((x.e ->> 'user_id')::uuid order by x.o), '{}'),
         coalesce(array_agg(round((x.e ->> 'percentual')::numeric, 2) order by x.o), '{}')
    into v_ids, v_pcts
    from jsonb_array_elements(p_pessoas) with ordinality as x(e, o);

  v_n := cardinality(v_ids);
  if v_n > 0 then
    select sum(p), max(p), min(p) into v_soma, v_maior, v_menor from unnest(v_pcts) as p;
    if (select count(distinct i) from unnest(v_ids) as i) <> v_n
       or exists (select 1 from unnest(v_pcts) as p where p is null)
       or v_menor <= 0
       or v_maior > 100
       or round(v_soma) <> 100 then
      raise exception 'distribuicao_invalida' using errcode = '22023';
    end if;
    if exists (
      select 1 from unnest(v_ids) as i
       where not public.fn_escale_recebe_da_origem(p_org, p_origem, i)
    ) then
      raise exception 'pessoa_sem_permissao' using errcode = 'PT422';
    end if;
  end if;

  -- A mesma trava do gatilho: salvar e distribuir não se cruzam.
  perform 1 from public.crm_distribuicao_de_dono d
    where d.pipeline_id = p_origem
    order by d.user_id
    for update;

  insert into public.crm_distribuicao_alteracoes
    (organization_id, pipeline_id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id)
  select p_org, p_origem, 'pessoa_saiu', d.user_id, d.percentual, null, p_autor
    from public.crm_distribuicao_de_dono d
   where d.pipeline_id = p_origem
     and not (d.user_id = any(v_ids));

  insert into public.crm_distribuicao_alteracoes
    (organization_id, pipeline_id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id)
  select p_org, p_origem, 'pessoa_entrou', n.i, null, n.p, p_autor
    from unnest(v_ids, v_pcts) as n(i, p)
   where not exists (
     select 1 from public.crm_distribuicao_de_dono d where d.pipeline_id = p_origem and d.user_id = n.i
   );

  insert into public.crm_distribuicao_alteracoes
    (organization_id, pipeline_id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id)
  select p_org, p_origem, 'percentual_alterado', n.i, d.percentual, n.p, p_autor
    from unnest(v_ids, v_pcts) as n(i, p)
    join public.crm_distribuicao_de_dono d on d.pipeline_id = p_origem and d.user_id = n.i
   where d.percentual <> n.p;

  delete from public.crm_distribuicao_de_dono d
   where d.pipeline_id = p_origem
     and not (d.user_id = any(v_ids));

  if v_n > 0 then
    insert into public.crm_distribuicao_de_dono (organization_id, pipeline_id, user_id, percentual, passo)
    select p_org, p_origem, n.i, n.p, v_maior / n.p
      from unnest(v_ids, v_pcts) as n(i, p)
    on conflict (pipeline_id, user_id) do update
      set percentual = excluded.percentual,
          passo = excluded.passo,
          updated_at = now();
  end if;

  update public.crm_distribuicao_de_dono
     set indice = 0,
         contador = case when p_reiniciar then 0 else contador end,
         updated_at = now()
   where pipeline_id = p_origem;

  if p_reiniciar then
    delete from public.crm_distribuicoes_feitas where pipeline_id = p_origem;
    insert into public.crm_distribuicao_alteracoes
      (organization_id, pipeline_id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id)
    values (p_org, p_origem, 'contagem_reiniciada', null, null, null, p_autor);
  end if;
end
$fn$;

revoke all on function public.fn_escale_salvar_distribuicao(uuid, uuid, uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.fn_escale_salvar_distribuicao(uuid, uuid, uuid, jsonb, boolean) to service_role;

-- ── RESETAR A DISTRIBUIÇÃO ─────────────────────────────────────────────────
-- "Zera o contador de todos os usuários, reinicia o rodízio e apaga o
-- histórico de distribuições desta origem." O reinício fica no histórico da
-- configuração, com o autor: é a auditoria do reset.
create or replace function public.fn_escale_reiniciar_distribuicao(p_org uuid, p_origem uuid, p_autor uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  perform 1 from public.crm_pipelines p where p.id = p_origem and p.organization_id = p_org;
  if not found then
    raise exception 'origem_nao_encontrada' using errcode = 'PT404';
  end if;
  perform 1 from public.crm_distribuicao_de_dono d
    where d.pipeline_id = p_origem
    order by d.user_id
    for update;
  update public.crm_distribuicao_de_dono
     set indice = 0, contador = 0, updated_at = now()
   where pipeline_id = p_origem;
  delete from public.crm_distribuicoes_feitas where pipeline_id = p_origem;
  insert into public.crm_distribuicao_alteracoes
    (organization_id, pipeline_id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id)
  values (p_org, p_origem, 'contagem_reiniciada', null, null, null, p_autor);
end
$fn$;

revoke all on function public.fn_escale_reiniciar_distribuicao(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_escale_reiniciar_distribuicao(uuid, uuid, uuid) to service_role;

-- ── O GATILHO QUE ESCOLHE O DONO ───────────────────────────────────────────
-- Só o negócio que nasce sem dono (nem pessoa, nem agente de IA) e sem pessoa
-- que o criou (`created_by_user_id` nulo: captação, automação, API, agente,
-- conversa nova). Roda depois da carteira e do dono padrão da 9010 (ordem
-- alfabética dos BEFORE) e antes de `trg_lead_so_liga_a_propria_empresa`, que
-- confere o escolhido. Trava as linhas da origem em ordem fixa (duas criações
-- ao mesmo tempo não pegam o mesmo índice), escolhe o elegível de menor índice
-- (empate: menor user_id), anda o passo e soma 1 ao contador. Avisa o AFTER por
-- uma chave de transação. Qualquer falha vira aviso: o negócio nasce sem dono,
-- como hoje.
create or replace function public.fn_escale_reparte_dono_da_origem()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_user uuid;
begin
  if new.owner_user_id is not null or new.owner_agent_id is not null or new.created_by_user_id is not null then
    return new;
  end if;

  begin
    perform 1 from public.crm_distribuicao_de_dono d
      where d.pipeline_id = new.pipeline_id
        and d.organization_id = new.organization_id
      order by d.user_id
      for update;
    if not found then
      -- A trava pode ter esperado `fn_escale_salvar_distribuicao`, que apaga e
      -- reinsere as linhas: as apagadas somem para este comando e as novas não
      -- estavam no retrato dele. O comando seguinte (retrato novo) as enxerga;
      -- sem esta segunda leitura o negócio nascia sem dono. Segunda vez sem
      -- linha: a origem não distribui.
      perform 1 from public.crm_distribuicao_de_dono d
        where d.pipeline_id = new.pipeline_id
          and d.organization_id = new.organization_id
        order by d.user_id
        for update;
      if not found then
        return new;
      end if;
    end if;

    select d.user_id into v_user
      from public.crm_distribuicao_de_dono d
     where d.pipeline_id = new.pipeline_id
       and d.organization_id = new.organization_id
       and public.fn_escale_recebe_da_origem(new.organization_id, new.pipeline_id, d.user_id)
     order by d.indice, d.user_id
     limit 1;
    if v_user is null then
      return new;
    end if;

    update public.crm_distribuicao_de_dono
       set indice = indice + passo,
           contador = contador + 1,
           updated_at = now()
     where pipeline_id = new.pipeline_id
       and user_id = v_user;

    perform set_config(
      'escale.distribuidos',
      coalesce(current_setting('escale.distribuidos', true), '') || new.id::text || ',',
      true
    );
  exception when others then
    raise warning 'fn_escale_reparte_dono_da_origem: % (%)', sqlerrm, sqlstate;
    return new;
  end;

  new.owner_user_id := v_user;
  new.owner_kind := 'user';
  new.assigned_at := now();
  return new;
end
$fn$;

revoke all on function public.fn_escale_reparte_dono_da_origem() from public, anon, authenticated;

drop trigger if exists trg_escale_reparte_dono_da_origem on public.crm_leads;
create trigger trg_escale_reparte_dono_da_origem
  before insert on public.crm_leads
  for each row execute function public.fn_escale_reparte_dono_da_origem();

-- ── O GATILHO QUE REGISTRA E ANUNCIA ───────────────────────────────────────
-- Dono posto num BEFORE INSERT não gera `lead.assigned` (o gatilho de eventos
-- do original só olha UPDATE). Aqui ele sai, com `via: distribuicao`, pela
-- mesma chave de transação da 0581 (`deskcomm.desfecho_pelo_negocio`): o push
-- "Lead atribuído a você" e as automações de `lead.assigned` valem também
-- para o negócio distribuído. Falha vira aviso.
create or replace function public.fn_escale_registra_a_distribuicao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_marca text := coalesce(current_setting('escale.distribuidos', true), '');
  v_antes text;
begin
  if new.owner_user_id is null or position(new.id::text || ',' in v_marca) = 0 then
    return null;
  end if;

  begin
    insert into public.crm_distribuicoes_feitas (organization_id, pipeline_id, lead_id, user_id)
    values (new.organization_id, new.pipeline_id, new.id, new.owner_user_id);

    v_antes := current_setting('deskcomm.desfecho_pelo_negocio', true);
    perform set_config('deskcomm.desfecho_pelo_negocio', 'on', true);
    perform public.fn_log_event(new.organization_id, 'lead.assigned', jsonb_build_object(
      'lead_id', new.id,
      'from_user_id', null, 'to_user_id', new.owner_user_id,
      'from_agent_id', null, 'to_agent_id', null,
      'owner_kind', 'user',
      'via', 'distribuicao'));
    perform set_config('deskcomm.desfecho_pelo_negocio', coalesce(v_antes, ''), true);
  exception when others then
    raise warning 'fn_escale_registra_a_distribuicao: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end
$fn$;

revoke all on function public.fn_escale_registra_a_distribuicao() from public, anon, authenticated;

drop trigger if exists trg_escale_registra_a_distribuicao on public.crm_leads;
create trigger trg_escale_registra_a_distribuicao
  after insert on public.crm_leads
  for each row execute function public.fn_escale_registra_a_distribuicao();

comment on table public.crm_distribuicao_de_dono is
  'Fork Escale (9013): quem recebe os negócios sem dono de cada origem, com percentual, passo, índice e contador. Gerente+ lê; só as funções escrevem.';
comment on table public.crm_distribuicoes_feitas is
  'Fork Escale (9013): cada negócio distribuído (a janela do contador). O reset apaga as da origem.';
comment on table public.crm_distribuicao_alteracoes is
  'Fork Escale (9013): o histórico da configuração da distribuição, com o autor (auditoria do reset).';

notify pgrst, 'reload schema';
