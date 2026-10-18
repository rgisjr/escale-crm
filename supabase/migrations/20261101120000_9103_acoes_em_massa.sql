-- manifest: **Ações em massa das listas (fork Escale, Fase 2B).** A ação pedida (`crm_acoes_em_massa`: criar negócios, incluir ou remover tag, exportar, excluir; só gerente ou acima cria; cada um vê as suas, e o admin vê as exportações da organização que esperam ou tiveram decisão) e os contatos que ela alcança (`crm_acoes_em_massa_itens`), resolvidos de uma vez com a RLS de quem pede por `fn_escale_criar_acao_em_massa` (invoker), que também emite `contatos.acao_em_massa_requested` para o consumidor do `event_log` — menos na exportação, que nasce `aguardando_aprovacao` e espera um admin diferente de quem pediu (`fn_escale_decidir_exportacao`, invoker: aprova com o evento na mesma transação, ou recusa; o pedido vence em 7 dias), salvo quando quem pede é o único admin ativo (`fn_escale_admin_unico`, invoker); o gatilho `trg_crm_acoes_em_massa_trava_da_decisao` não deixa a decisão mudar mais nada; bucket privado `exportacoes-das-listas` para o CSV exportado (só o service role).
-- 9103: ações em massa da lista de contatos (fork Escale, Frente B).

-- ── 1. As tabelas ────────────────────────────────────────────────────────────
create table if not exists public.crm_acoes_em_massa (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  lista text not null,
  acao text not null,
  parametros jsonb not null default '{}'::jsonb,
  status text not null default 'preparando',
  total integer not null default 0,
  feitos integer not null default 0,
  falhas integer not null default 0,
  erros jsonb not null default '[]'::jsonb,
  arquivo text,
  expira_em timestamptz,
  -- Quem aprovou ou recusou a exportação, e quando (Q4). Sem FK: a pessoa pode sair da organização.
  decidido_por uuid,
  decidido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_acoes_em_massa_lista_valida check (lista ~ '^[a-z_]{1,30}$'),
  constraint crm_acoes_em_massa_acao_valida
    check (acao in ('criar_negocios', 'incluir_tag', 'remover_tag', 'exportar', 'excluir')),
  constraint crm_acoes_em_massa_status_valido
    check (status in ('preparando', 'aguardando_aprovacao', 'na_fila', 'processando', 'concluida', 'falhou', 'recusada')),
  constraint crm_acoes_em_massa_aprovacao_so_na_exportacao
    check (acao = 'exportar' or (status not in ('aguardando_aprovacao', 'recusada') and decidido_por is null)),
  constraint crm_acoes_em_massa_decisao_coerente
    check ((decidido_por is null) = (decidido_em is null)),
  constraint crm_acoes_em_massa_parametros_objeto
    check (jsonb_typeof(parametros) = 'object' and octet_length(parametros::text) <= 8192),
  constraint crm_acoes_em_massa_erros_lista
    check (jsonb_typeof(erros) = 'array' and octet_length(erros::text) <= 32768),
  constraint crm_acoes_em_massa_contagens
    check (total between 0 and 100000 and feitos >= 0 and falhas >= 0),
  constraint crm_acoes_em_massa_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create index if not exists idx_crm_acoes_em_massa_pessoa
  on public.crm_acoes_em_massa (user_id, organization_id, created_at desc);
create index if not exists idx_crm_acoes_em_massa_arquivo
  on public.crm_acoes_em_massa (organization_id, expira_em) where arquivo is not null;
create index if not exists idx_crm_acoes_em_massa_aprovacao
  on public.crm_acoes_em_massa (organization_id, created_at) where status = 'aguardando_aprovacao';

-- Sem FK no contato: excluir em massa apaga o próprio contato do item.
create table if not exists public.crm_acoes_em_massa_itens (
  acao_id uuid not null references public.crm_acoes_em_massa(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null,
  posicao integer not null,
  feito boolean not null default false,
  primary key (acao_id, contact_id)
);

create index if not exists idx_crm_acoes_em_massa_itens_fila
  on public.crm_acoes_em_massa_itens (acao_id, feito, posicao);

-- ── 2. O único admin (Q4) ────────────────────────────────────────────────────
-- Quem chama é admin e é o ÚNICO admin ativo da organização? Aí a exportação não
-- espera aprovação. Invoker: a policy `user_orgs_select` (0044) deixa gerente e
-- admin lerem o quadro de membros; para quem não é admin, a resposta já é "não".
create or replace function public.fn_escale_admin_unico(p_org uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.fn_role_at_least(p_org, 'admin')
     and (select count(*)
            from public.user_organizations u
           where u.organization_id = p_org
             and u.role = 'admin'
             and u.revoked_at is null) = 1
$$;

revoke all on function public.fn_escale_admin_unico(uuid) from public, anon;
grant execute on function public.fn_escale_admin_unico(uuid) to authenticated, service_role;

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
alter table public.crm_acoes_em_massa enable row level security;
alter table public.crm_acoes_em_massa_itens enable row level security;

drop policy if exists crm_acoes_em_massa_select on public.crm_acoes_em_massa;
drop policy if exists crm_acoes_em_massa_select_admin on public.crm_acoes_em_massa;
drop policy if exists crm_acoes_em_massa_insert on public.crm_acoes_em_massa;
drop policy if exists crm_acoes_em_massa_preparo on public.crm_acoes_em_massa;
drop policy if exists crm_acoes_em_massa_decisao on public.crm_acoes_em_massa;
drop policy if exists crm_acoes_em_massa_itens_select on public.crm_acoes_em_massa_itens;
drop policy if exists crm_acoes_em_massa_itens_insert on public.crm_acoes_em_massa_itens;

-- Cada um vê as suas ações.
create policy crm_acoes_em_massa_select on public.crm_acoes_em_massa
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid())
  );

-- O admin vê as exportações da organização que esperam decisão ou já foram
-- decididas (o painel "Exportações"). As outras ações das outras pessoas, não.
create policy crm_acoes_em_massa_select_admin on public.crm_acoes_em_massa
  for select using (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'admin')
    and acao = 'exportar'
    and (status = 'aguardando_aprovacao' or decidido_por is not null)
  );

-- Só gerente ou acima pede; nasce "preparando", zerada, sem arquivo e sem decisão.
create policy crm_acoes_em_massa_insert on public.crm_acoes_em_massa
  for insert with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'manager')
    and user_id = auth.uid()
    and status = 'preparando'
    and total = 0 and feitos = 0 and falhas = 0
    and arquivo is null and expira_em is null
    and decidido_por is null and decidido_em is null
  );

-- Quem pediu só fecha o preparo: "na_fila", ou "aguardando_aprovacao" na exportação.
-- A exportação só vai direto para a fila quando quem pede é o ÚNICO admin ativo (Q4):
-- pelo PostgREST, ninguém pula a aprovação. O resto é do consumidor (service role).
create policy crm_acoes_em_massa_preparo on public.crm_acoes_em_massa
  for update
  using (
    (organization_id in (select public.fn_user_org_ids()))
    and user_id = auth.uid()
    and status = 'preparando'
  )
  with check (
    (organization_id in (select public.fn_user_org_ids()))
    and user_id = auth.uid()
    and status in ('preparando', 'aguardando_aprovacao', 'na_fila')
    and (status <> 'aguardando_aprovacao' or acao = 'exportar')
    and (status <> 'na_fila' or acao <> 'exportar' or public.fn_escale_admin_unico(organization_id))
    and feitos = 0 and falhas = 0
    and arquivo is null and expira_em is null
    and decidido_por is null and decidido_em is null
  );

-- O admin decide a exportação de OUTRA pessoa enquanto ela espera e não venceu
-- (7 dias): só "na_fila" ou "recusada", com a decisão em nome dele. O gatilho da
-- trava (seção 4) garante que nada mais muda na mesma escrita.
create policy crm_acoes_em_massa_decisao on public.crm_acoes_em_massa
  for update
  using (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'admin')
    and acao = 'exportar'
    and status = 'aguardando_aprovacao'
    and user_id <> auth.uid()
    and created_at > now() - interval '7 days'
  )
  with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'admin')
    and acao = 'exportar'
    and status in ('na_fila', 'recusada')
    and user_id <> auth.uid()
    and decidido_por = auth.uid()
    and decidido_em is not null
    and feitos = 0 and falhas = 0
    and arquivo is null and expira_em is null
  );

-- Os itens, só de quem pediu.
create policy crm_acoes_em_massa_itens_select on public.crm_acoes_em_massa_itens
  for select using (
    exists (
      select 1 from public.crm_acoes_em_massa a
       where a.id = crm_acoes_em_massa_itens.acao_id
         and a.user_id = auth.uid())
  );

create policy crm_acoes_em_massa_itens_insert on public.crm_acoes_em_massa_itens
  for insert with check (
    exists (
      select 1 from public.crm_acoes_em_massa a
       where a.id = crm_acoes_em_massa_itens.acao_id
         and a.organization_id = crm_acoes_em_massa_itens.organization_id
         and a.user_id = auth.uid()
         and a.status = 'preparando')
  );

revoke all on public.crm_acoes_em_massa from anon;
revoke all on public.crm_acoes_em_massa_itens from anon;
grant select, insert, update on public.crm_acoes_em_massa to authenticated;
grant select, insert on public.crm_acoes_em_massa_itens to authenticated;
grant all on public.crm_acoes_em_massa to service_role;
grant all on public.crm_acoes_em_massa_itens to service_role;

drop trigger if exists trg_crm_acoes_em_massa_updated_at on public.crm_acoes_em_massa;
create trigger trg_crm_acoes_em_massa_updated_at
  before update on public.crm_acoes_em_massa
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_acoes_em_massa is
  'Ações em massa das listas da casca (fork Escale, migration 9103), como bulk_params da Clint. Quem pediu (gerente+) cria e vê; a exportação espera a aprovação de outro admin (salvo o único admin); o consumidor do event_log processa com o service role.';

-- ── 4. A trava da decisão ────────────────────────────────────────────────────
-- Do aguardo só se sai para a fila ou para a recusa, com quem decidiu e quando, e
-- nada mais muda na mesma escrita (nem a ação, nem a contagem, nem o arquivo, nem
-- quem pediu). Fora do aguardo, a decisão não se mexe. `created_at` fica de fora:
-- só serve ao vencimento, e mudá-lo pela API exige sair do aguardo (as policies).
create or replace function public.fn_crm_acoes_em_massa_trava_da_decisao()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if old.status = 'aguardando_aprovacao' then
    if (new.id, new.organization_id, new.user_id, new.lista, new.acao, new.parametros, new.total,
        new.feitos, new.falhas, new.erros, new.arquivo, new.expira_em)
       is distinct from
       (old.id, old.organization_id, old.user_id, old.lista, old.acao, old.parametros, old.total,
        old.feitos, old.falhas, old.erros, old.arquivo, old.expira_em) then
      raise exception 'crm_acoes_em_massa_trava_da_decisao: na decisão, só o status e quem decidiu mudam'
        using errcode = 'check_violation';
    end if;
    if new.status is distinct from old.status then
      if new.status not in ('na_fila', 'recusada') or new.decidido_por is null or new.decidido_em is null then
        raise exception 'crm_acoes_em_massa_trava_da_decisao: do aguardo só se sai para a fila ou para a recusa, com quem decidiu'
          using errcode = 'check_violation';
      end if;
    elsif (new.decidido_por, new.decidido_em) is distinct from (old.decidido_por, old.decidido_em) then
      raise exception 'crm_acoes_em_massa_trava_da_decisao: a decisão só se grava ao sair do aguardo'
        using errcode = 'check_violation';
    end if;
  elsif (new.decidido_por, new.decidido_em) is distinct from (old.decidido_por, old.decidido_em) then
    raise exception 'crm_acoes_em_massa_trava_da_decisao: a decisão só se grava ao sair do aguardo'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.fn_crm_acoes_em_massa_trava_da_decisao() from public, anon;

drop trigger if exists trg_crm_acoes_em_massa_trava_da_decisao on public.crm_acoes_em_massa;
create trigger trg_crm_acoes_em_massa_trava_da_decisao
  before update on public.crm_acoes_em_massa
  for each row execute function public.fn_crm_acoes_em_massa_trava_da_decisao();

-- ── 5. Pedir a ação ──────────────────────────────────────────────────────────
-- A ação inteira numa transação, com a RLS de quem pede: grava a ação, resolve os
-- contatos (ids marcados, ou o filtro: todos ou os N primeiros, menos os desmarcados),
-- fecha o preparo e emite o evento. Vazia ou acima de 100.000: nada fica gravado.
-- Exportar espera a aprovação de um admin (Q4), sem evento, salvo o único admin ativo.
create or replace function public.fn_escale_criar_acao_em_massa(
  p_org uuid,
  p_acao text,
  p_parametros jsonb,
  p_ids uuid[],
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_filtros jsonb,
  p_quantidade integer,
  p_excluidos uuid[]
)
returns table (acao_id uuid, quantidade integer, status text)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_total integer;
  v_status text;
begin
  insert into public.crm_acoes_em_massa (organization_id, user_id, lista, acao, parametros)
  values (p_org, auth.uid(), 'contatos', p_acao, coalesce(p_parametros, '{}'::jsonb))
  returning id into v_id;

  if p_ids is not null then
    insert into public.crm_acoes_em_massa_itens (acao_id, organization_id, contact_id, posicao)
    select v_id, p_org, c.id,
           row_number() over (order by c.last_activity_at desc nulls last, c.id desc)
      from public.contacts c
     where c.organization_id = p_org
       and c.id = any(p_ids)
       and c.is_merged_into is null;
  else
    insert into public.crm_acoes_em_massa_itens (acao_id, organization_id, contact_id, posicao)
    select v_id, p_org, s.contact_id, s.posicao
      from (
        select f.contact_id,
               row_number() over (order by f.last_activity_at desc nulls last, f.contact_id desc) as posicao
          from public.fn_escale_contatos_do_filtro(p_org, p_visao, p_padrao, p_digitos, p_cpf_hash, p_filtros) f
      ) s
     where s.posicao <= least(coalesce(p_quantidade, 100001), 100001)
       and not (s.contact_id = any(coalesce(p_excluidos, '{}'::uuid[])));
  end if;
  get diagnostics v_total = row_count;

  if v_total = 0 then
    raise exception 'acao_em_massa_vazia: nenhum contato selecionado' using errcode = 'P0001';
  end if;
  if v_total > 100000 then
    raise exception 'acao_em_massa_grande_demais: no máximo 100.000 contatos por ação' using errcode = 'P0001';
  end if;

  v_status := case
    when p_acao = 'exportar' and not public.fn_escale_admin_unico(p_org) then 'aguardando_aprovacao'
    else 'na_fila'
  end;
  update public.crm_acoes_em_massa set total = v_total, status = v_status where id = v_id;

  if v_status = 'na_fila' then
    perform public.emit_event(
      'contatos.acao_em_massa_requested',
      'crm_acao_em_massa',
      v_id,
      jsonb_build_object('acao_id', v_id),
      '{}'::jsonb,
      p_org
    );
  end if;

  return query select v_id, v_total, v_status;
end;
$$;

revoke all on function public.fn_escale_criar_acao_em_massa(uuid, text, jsonb, uuid[], text, text, text[], text, jsonb, integer, uuid[]) from public, anon;
grant execute on function public.fn_escale_criar_acao_em_massa(uuid, text, jsonb, uuid[], text, text, text[], text, jsonb, integer, uuid[]) to authenticated, service_role;

-- ── 6. Decidir a exportação (Q4) ─────────────────────────────────────────────
-- Um admin da organização, diferente de quem pediu, aprova (fila + evento, na mesma
-- transação) ou recusa. O pedido vence em 7 dias (calculado de `created_at`, sem cron).
-- Invoker: quem não é admin nem enxerga o pedido de outra pessoa (cai em "inexistente").
create or replace function public.fn_escale_decidir_exportacao(p_acao uuid, p_aprovar boolean)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_dono uuid;
  v_acao text;
  v_status text;
  v_criada timestamptz;
  v_novo text := case when p_aprovar then 'na_fila' else 'recusada' end;
  v_linhas integer;
begin
  select a.organization_id, a.user_id, a.acao, a.status, a.created_at
    into v_org, v_dono, v_acao, v_status, v_criada
    from public.crm_acoes_em_massa a
   where a.id = p_acao;
  if not found then
    raise exception 'acao_em_massa_inexistente: pedido de exportação não encontrado' using errcode = 'P0001';
  end if;
  if not public.fn_role_at_least(v_org, 'admin') then
    raise exception 'acao_em_massa_sem_permissao: só um administrador decide a exportação' using errcode = 'P0001';
  end if;
  if v_acao <> 'exportar' or v_status <> 'aguardando_aprovacao' then
    raise exception 'acao_em_massa_nao_aguarda: o pedido já foi decidido' using errcode = 'P0001';
  end if;
  if v_criada <= now() - interval '7 days' then
    raise exception 'acao_em_massa_expirada: o pedido passou de 7 dias' using errcode = 'P0001';
  end if;
  if v_dono = auth.uid() then
    raise exception 'acao_em_massa_propria: outro administrador precisa decidir' using errcode = 'P0001';
  end if;

  update public.crm_acoes_em_massa
     set status = v_novo, decidido_por = auth.uid(), decidido_em = now()
   where id = p_acao
     and status = 'aguardando_aprovacao';
  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    raise exception 'acao_em_massa_nao_aguarda: o pedido já foi decidido' using errcode = 'P0001';
  end if;

  if p_aprovar then
    perform public.emit_event(
      'contatos.acao_em_massa_requested',
      'crm_acao_em_massa',
      p_acao,
      jsonb_build_object('acao_id', p_acao),
      jsonb_build_object('aprovado_por', auth.uid()),
      v_org
    );
  end if;
  return v_novo;
end;
$$;

revoke all on function public.fn_escale_decidir_exportacao(uuid, boolean) from public, anon;
grant execute on function public.fn_escale_decidir_exportacao(uuid, boolean) to authenticated, service_role;

-- ── 7. O CSV exportado: privado, sem policy (só o service role grava e assina a URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exportacoes-das-listas', 'exportacoes-das-listas', false, 104857600, array['text/csv'])
on conflict (id) do nothing;

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
