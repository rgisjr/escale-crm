-- manifest: **Importar contatos e negócios (fork Escale, Fase 2F).** A importação (`crm_importacoes`: tipo, arquivo, mapeamento, configuração, decisões, nível, status e contagens) e as linhas do arquivo (`crm_importacoes_linhas`: bruto, normalizado, status, motivo, detalhe, resoluções e o que criou), só leitura para gerente ou acima da organização; toda escrita é do service role (as rotas, depois de conferir o papel, e o consumidor do `event_log`). Funções fechadas ao `service_role`: `fn_escale_enfileirar_importacao` (conta as linhas, põe na fila e emite `contatos.importacao_requested`), `fn_escale_contar_importacao` (refaz as contagens e fecha a importação), `fn_escale_cancelar_importacao`, `fn_escale_reabrir_importacao` (resolver em lote), `fn_escale_limpar_linhas_antigas` (LGPD: linhas de importações terminadas há mais de 30 dias) e a definer `fn_escale_empresa_da_importacao` (acha ou cria a empresa e vincula o contato pela `fn_escale_vincular_contato_a_empresa` da 2D).
-- 9107: importar contatos e negócios (fork Escale, Frente B).

-- ── 1. As tabelas ────────────────────────────────────────────────────────────
create table if not exists public.crm_importacoes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  tipo text not null,
  arquivo text not null,
  mapeamento jsonb not null default '[]'::jsonb,
  configuracao jsonb not null default '{}'::jsonb,
  decisoes jsonb not null default '{}'::jsonb,
  nivel text not null default 'conservador',
  status text not null default 'preparando',
  total integer not null default 0,
  importadas integer not null default 0,
  revisar integer not null default 0,
  puladas integer not null default 0,
  erros integer not null default 0,
  avisos integer not null default 0,
  codigo_do_erro text,
  linhas_apagadas_em timestamptz,
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_importacoes_tipo_valido check (tipo in ('contato', 'negocio')),
  constraint crm_importacoes_arquivo_valido check (char_length(arquivo) between 1 and 200),
  constraint crm_importacoes_mapeamento_lista
    check (jsonb_typeof(mapeamento) = 'array' and octet_length(mapeamento::text) <= 65536),
  constraint crm_importacoes_configuracao_objeto
    check (jsonb_typeof(configuracao) = 'object' and octet_length(configuracao::text) <= 8192),
  constraint crm_importacoes_decisoes_objeto
    check (jsonb_typeof(decisoes) = 'object' and octet_length(decisoes::text) <= 8192),
  constraint crm_importacoes_nivel_valido check (nivel in ('conservador', 'padrao', 'agressivo', 'personalizado')),
  constraint crm_importacoes_status_valido
    check (status in ('preparando', 'na_fila', 'importando', 'aguardando_revisao', 'concluida', 'cancelada', 'falhou')),
  constraint crm_importacoes_contagens
    check (total between 0 and 50000 and importadas >= 0 and revisar >= 0 and puladas >= 0 and erros >= 0 and avisos >= 0),
  constraint crm_importacoes_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create index if not exists idx_crm_importacoes_lista
  on public.crm_importacoes (organization_id, created_at desc);
create index if not exists idx_crm_importacoes_antigas
  on public.crm_importacoes (organization_id, concluida_em) where linhas_apagadas_em is null;

create table if not exists public.crm_importacoes_linhas (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.crm_importacoes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  numero integer not null,
  bruto jsonb not null,
  normalizado jsonb not null default '{}'::jsonb,
  repetida_de integer,
  status text not null default 'na_fila',
  motivo text,
  detalhe jsonb not null default '{}'::jsonb,
  com_aviso boolean not null default false,
  resolucoes jsonb not null default '{}'::jsonb,
  contato_id uuid,
  negocio_id uuid,
  mensagem text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_importacoes_linhas_numero_unico unique (importacao_id, numero),
  constraint crm_importacoes_linhas_status_valido
    check (status in ('na_fila', 'processando', 'importada', 'revisar', 'pulada', 'erro')),
  constraint crm_importacoes_linhas_bruto_lista
    check (jsonb_typeof(bruto) = 'array' and octet_length(bruto::text) <= 65536),
  constraint crm_importacoes_linhas_objetos
    check (jsonb_typeof(normalizado) = 'object' and jsonb_typeof(detalhe) = 'object' and jsonb_typeof(resolucoes) = 'object'),
  constraint crm_importacoes_linhas_motivo_quando_revisa check (status <> 'revisar' or motivo is not null)
);

create index if not exists idx_crm_importacoes_linhas_fila
  on public.crm_importacoes_linhas (importacao_id, status, numero);
create index if not exists idx_crm_importacoes_linhas_motivo
  on public.crm_importacoes_linhas (importacao_id, motivo) where status = 'revisar';

-- ── 2. RLS: só leitura, gerente ou acima da organização ─────────────────────
alter table public.crm_importacoes enable row level security;
alter table public.crm_importacoes_linhas enable row level security;

drop policy if exists crm_importacoes_select on public.crm_importacoes;
drop policy if exists crm_importacoes_linhas_select on public.crm_importacoes_linhas;

create policy crm_importacoes_select on public.crm_importacoes
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

create policy crm_importacoes_linhas_select on public.crm_importacoes_linhas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

revoke all on public.crm_importacoes from anon, authenticated;
revoke all on public.crm_importacoes_linhas from anon, authenticated;
grant select on public.crm_importacoes to authenticated;
grant select on public.crm_importacoes_linhas to authenticated;
grant all on public.crm_importacoes to service_role;
grant all on public.crm_importacoes_linhas to service_role;

drop trigger if exists trg_crm_importacoes_updated_at on public.crm_importacoes;
create trigger trg_crm_importacoes_updated_at
  before update on public.crm_importacoes
  for each row execute function public.fn_set_updated_at();
drop trigger if exists trg_crm_importacoes_linhas_updated_at on public.crm_importacoes_linhas;
create trigger trg_crm_importacoes_linhas_updated_at
  before update on public.crm_importacoes_linhas
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_importacoes is
  'Importações de contatos e negócios da casca (fork Escale, migration 9107), como o import_job da Clint. Gerente+ lê; o service role escreve (rotas e consumidor do event_log).';
comment on table public.crm_importacoes_linhas is
  'As linhas do arquivo de cada importação (fork Escale, migration 9107), como o import_row da Clint. Apagadas 30 dias depois do fim (LGPD).';

-- ── 3. Contar e fechar ───────────────────────────────────────────────────────
-- Refaz as contagens pelas linhas. Importando sem linha na fila (nem processando)
-- fecha: "aguardando_revisao" se sobrou revisão, senão "concluida". Aguardando
-- revisão que zerou as revisões também conclui.
create or replace function public.fn_escale_contar_importacao(p_importacao uuid)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_na_fila integer;
  v_revisar integer;
begin
  select count(*) filter (where l.status in ('na_fila', 'processando')),
         count(*) filter (where l.status = 'revisar')
    into v_na_fila, v_revisar
    from public.crm_importacoes_linhas l
   where l.importacao_id = p_importacao;

  update public.crm_importacoes i
     set importadas = c.importadas,
         revisar = c.revisar,
         puladas = c.puladas,
         erros = c.erros,
         avisos = c.avisos
    from (
      select count(*) filter (where status = 'importada') as importadas,
             count(*) filter (where status = 'revisar') as revisar,
             count(*) filter (where status = 'pulada') as puladas,
             count(*) filter (where status = 'erro') as erros,
             count(*) filter (where status = 'importada' and com_aviso) as avisos
        from public.crm_importacoes_linhas
       where importacao_id = p_importacao
    ) c
   where i.id = p_importacao
  returning i.status into v_status;

  if v_status in ('importando', 'aguardando_revisao') and v_na_fila = 0 then
    v_status := case when v_revisar > 0 then 'aguardando_revisao' else 'concluida' end;
    update public.crm_importacoes
       set status = v_status,
           concluida_em = case when v_status = 'concluida' then now() else null end
     where id = p_importacao;
  end if;
  return v_status;
end;
$$;

-- ── 4. Pôr na fila ───────────────────────────────────────────────────────────
create or replace function public.fn_escale_enfileirar_importacao(p_importacao uuid)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_total integer;
begin
  select organization_id into v_org
    from public.crm_importacoes
   where id = p_importacao and status = 'preparando'
   for update;
  if not found then
    raise exception 'importacao_nao_preparada: a importação não está em preparo' using errcode = 'P0001';
  end if;
  select count(*) into v_total from public.crm_importacoes_linhas where importacao_id = p_importacao;
  if v_total = 0 then
    raise exception 'importacao_vazia: nenhuma linha para importar' using errcode = 'P0001';
  end if;
  update public.crm_importacoes set total = v_total, status = 'na_fila' where id = p_importacao;
  perform public.emit_event(
    'contatos.importacao_requested',
    'crm_importacao',
    p_importacao,
    jsonb_build_object('importacao_id', p_importacao),
    '{}'::jsonb,
    v_org
  );
  return v_total;
end;
$$;

-- ── 5. Cancelar (na fila ou importando) ──────────────────────────────────────
create or replace function public.fn_escale_cancelar_importacao(p_importacao uuid)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update public.crm_importacoes
     set status = 'cancelada', concluida_em = now()
   where id = p_importacao and status in ('na_fila', 'importando');
  if not found then
    raise exception 'importacao_nao_cancelavel: só se cancela na fila ou importando' using errcode = 'P0001';
  end if;
  update public.crm_importacoes_linhas
     set status = 'pulada', mensagem = 'Importação cancelada.'
   where importacao_id = p_importacao and status in ('na_fila', 'processando');
  perform public.fn_escale_contar_importacao(p_importacao);
  return 'cancelada';
end;
$$;

-- ── 6. Resolver em lote: as linhas do motivo voltam à fila com a escolha ─────
create or replace function public.fn_escale_reabrir_importacao(p_importacao uuid, p_motivo text, p_resolucao jsonb)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_linhas integer;
begin
  select organization_id into v_org
    from public.crm_importacoes
   where id = p_importacao and status in ('aguardando_revisao', 'importando')
   for update;
  if not found then
    raise exception 'importacao_nao_aguarda: a importação não espera revisão' using errcode = 'P0001';
  end if;
  update public.crm_importacoes_linhas
     set resolucoes = resolucoes || jsonb_build_object(p_motivo, p_resolucao),
         status = 'na_fila',
         motivo = null
   where importacao_id = p_importacao and status = 'revisar' and motivo = p_motivo;
  get diagnostics v_linhas = row_count;
  if v_linhas > 0 then
    update public.crm_importacoes set status = 'importando', concluida_em = null where id = p_importacao;
    perform public.fn_escale_contar_importacao(p_importacao);
    perform public.emit_event(
      'contatos.importacao_requested',
      'crm_importacao',
      p_importacao,
      jsonb_build_object('importacao_id', p_importacao),
      jsonb_build_object('resolvidas', v_linhas),
      v_org
    );
  end if;
  return v_linhas;
end;
$$;

-- ── 7. LGPD: as linhas das importações terminadas há mais de 30 dias ─────────
create or replace function public.fn_escale_limpar_linhas_antigas(p_org uuid)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
  v_linhas integer;
begin
  select coalesce(array_agg(id), '{}'::uuid[]) into v_ids
    from public.crm_importacoes
   where organization_id = p_org
     and status in ('concluida', 'cancelada', 'falhou')
     and linhas_apagadas_em is null
     and coalesce(concluida_em, updated_at) < now() - interval '30 days';
  delete from public.crm_importacoes_linhas where importacao_id = any(v_ids);
  get diagnostics v_linhas = row_count;
  update public.crm_importacoes set linhas_apagadas_em = now() where id = any(v_ids);
  return v_linhas;
end;
$$;

revoke all on function public.fn_escale_contar_importacao(uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_enfileirar_importacao(uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_cancelar_importacao(uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_reabrir_importacao(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.fn_escale_limpar_linhas_antigas(uuid) from public, anon, authenticated;
grant execute on function public.fn_escale_contar_importacao(uuid) to service_role;
grant execute on function public.fn_escale_enfileirar_importacao(uuid) to service_role;
grant execute on function public.fn_escale_cancelar_importacao(uuid) to service_role;
grant execute on function public.fn_escale_reabrir_importacao(uuid, text, jsonb) to service_role;
grant execute on function public.fn_escale_limpar_linhas_antigas(uuid) to service_role;

-- ── 8. A empresa da linha (N9) ───────────────────────────────────────────────
-- Pelo CNPJ, senão pelo nome (sem maiúsculas), senão — sem nome e sem CNPJ — a
-- empresa atual do contato; não achou, cria (sem nome, se o nome veio vazio).
-- Vincula pela função da 2D (uma empresa por contato; vira principal se a empresa
-- não tem). Definer como as da 2D: a RLS do original pede gerente em
-- `people`/`company_people`; fechada ao service role, que é quem a chama.
create or replace function public.fn_escale_empresa_da_importacao(
  p_org uuid, p_autor uuid, p_contato uuid, p_nome text, p_cnpj text, p_cnpj_normalizado text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
  v_nome text := nullif(btrim(coalesce(p_nome, '')), '');
  v_cnpj text := nullif(btrim(coalesce(p_cnpj_normalizado, '')), '');
begin
  perform 1 from public.contacts where id = p_contato and organization_id = p_org;
  if not found then
    raise exception 'contato_nao_encontrado' using errcode = 'P0002';
  end if;
  if v_cnpj is not null then
    select id into v_empresa from public.companies
     where organization_id = p_org and normalized_cnpj = v_cnpj
     order by created_at limit 1;
  end if;
  if v_empresa is null and v_nome is not null then
    select id into v_empresa from public.companies
     where organization_id = p_org and lower(btrim(coalesce(trade_name, legal_name, ''))) = lower(v_nome)
     order by created_at limit 1;
  end if;
  if v_empresa is null and v_nome is null and v_cnpj is null then
    select cp.company_id into v_empresa
      from public.contacts c
      join public.company_people cp on cp.person_id = c.person_id and cp.organization_id = p_org
     where c.id = p_contato and c.organization_id = p_org
     order by cp.is_primary desc, cp.created_at
     limit 1;
  end if;
  if v_empresa is null then
    insert into public.companies (organization_id, trade_name, cnpj, normalized_cnpj, created_by)
    values (p_org, v_nome, case when v_cnpj is null then null else nullif(btrim(p_cnpj), '') end, v_cnpj, p_autor)
    returning id into v_empresa;
  end if;
  perform public.fn_escale_vincular_contato_a_empresa(p_org, p_contato, v_empresa, false);
  return v_empresa;
end;
$$;

revoke all on function public.fn_escale_empresa_da_importacao(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_escale_empresa_da_importacao(uuid, uuid, uuid, text, text, text) to service_role;

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
