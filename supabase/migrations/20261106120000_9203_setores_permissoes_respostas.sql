-- manifest: fork Escale · Fase 3C · setores, setor da conversa, permissões de atendimento por pessoa, respostas rápidas e a leitura pelo setor
-- ---- FORK ESCALE · setores, permissões e respostas rápidas de Conversas (migration 9203) ----
--
-- PRD de Conversas, seções 5 e 7, decisão 1 da seção 9. Setor é entidade do
-- fork (nome, cor, membros, dispositivo, conversa). A leitura pelo setor é uma
-- policy PERMISSIVA a mais em conversations (soma por OU com a do original):
-- só amplia, nunca restringe. fn_can_view_conversation e visibility_mode não
-- mudam. As 19 permissões da Clint têm o papel padrão em fn_crm_papel_padrao
-- (espelho de lib/escale/conversas/permissoes.ts) e exceções por pessoa.

-- 1. O papel padrão das chaves editáveis (espelho do TS) ---------------------
create or replace function public.fn_crm_papel_padrao(p_chave text)
returns text language sql immutable set search_path = public as $$
  select case p_chave
    when 'CHAT_VIEW_CHANNEL_ACCOUNT' then 'admin'
    when 'CHAT_VIEW_TEAM' then 'agent'
    when 'CHAT_CHANGE_ATTENDANT_TEAM' then 'manager'
    when 'CHAT_CHANGE_ATTENDANT_ALL' then 'manager'
    when 'CHAT_BULK_ACTIONS' then 'manager'
    when 'CHAT_EDIT_QUICK_RESPONSE' then 'manager'
    when 'CHAT_SHARE_QUICK_RESPONSE' then 'agent'
    when 'CHAT_EDIT_TEAMS' then 'admin'
    when 'CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS' then 'agent'
    else 'admin'
  end;
$$;
revoke all on function public.fn_crm_papel_padrao(text) from public, anon;
grant execute on function public.fn_crm_papel_padrao(text) to authenticated, service_role;

-- 2. Permissões por pessoa ---------------------------------------------------
create table if not exists public.crm_permissoes_de_atendimento (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  chave text not null,
  ligado boolean not null,
  atualizado_por uuid,
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id, chave),
  constraint crm_permissoes_de_atendimento_chave_valida check (chave in (
    'CHAT_VIEW_CHANNEL_ACCOUNT', 'CHAT_VIEW_TEAM', 'CHAT_CHANGE_ATTENDANT_TEAM', 'CHAT_CHANGE_ATTENDANT_ALL',
    'CHAT_BULK_ACTIONS', 'CHAT_EDIT_QUICK_RESPONSE', 'CHAT_SHARE_QUICK_RESPONSE', 'CHAT_EDIT_TEAMS',
    'CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS')),
  constraint crm_permissoes_de_atendimento_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
alter table public.crm_permissoes_de_atendimento enable row level security;
drop policy if exists crm_permissoes_de_atendimento_select on public.crm_permissoes_de_atendimento;
drop policy if exists crm_permissoes_de_atendimento_write on public.crm_permissoes_de_atendimento;
create policy crm_permissoes_de_atendimento_select on public.crm_permissoes_de_atendimento
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'admin')))
  );
create policy crm_permissoes_de_atendimento_write on public.crm_permissoes_de_atendimento
  for all using (
    (organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin')
  ) with check (
    (organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin')
  );
revoke all on public.crm_permissoes_de_atendimento from anon;
grant select, insert, update, delete on public.crm_permissoes_de_atendimento to authenticated;
grant all on public.crm_permissoes_de_atendimento to service_role;
comment on table public.crm_permissoes_de_atendimento is
  'Exceções por pessoa às permissões de Conversas da Clint (fork Escale, migration 9203; E4). Sem linha = o papel padrão (fn_crm_papel_padrao). Só as chaves que o fork aplica no servidor. Admin grava; a pessoa lê as suas.';

-- 3. fn_crm_pode: a pessoa da sessão tem a chave nesta organização? ----------
create or replace function public.fn_crm_pode(p_org uuid, p_chave text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then false
    when public.fn_user_role_in_org(p_org) is null then false
    when public.fn_user_role_in_org(p_org) = 'admin' then true
    -- o piso de "Editar ou excluir setores" é gerente (lib/escale/conversas/permissoes.ts)
    when p_chave = 'CHAT_EDIT_TEAMS' and not public.fn_role_at_least(p_org, 'manager') then false
    else coalesce(
      (select p.ligado from public.crm_permissoes_de_atendimento p
        where p.organization_id = p_org and p.user_id = auth.uid() and p.chave = p_chave),
      public.fn_role_at_least(p_org, public.fn_crm_papel_padrao(p_chave)))
  end;
$$;
revoke all on function public.fn_crm_pode(uuid, text) from public, anon;
grant execute on function public.fn_crm_pode(uuid, text) to authenticated, service_role;

-- 4. Setores, membros e o setor do dispositivo -------------------------------
create table if not exists public.crm_setores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null,
  cor text not null default '#597EFF',
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_setores_nome_valido check (char_length(btrim(nome)) between 1 and 60),
  constraint crm_setores_cor_valida check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  constraint crm_setores_org_id_unico unique (organization_id, id)
);
create unique index if not exists crm_setores_nome_unico on public.crm_setores (organization_id, lower(btrim(nome)));

create table if not exists public.crm_setores_membros (
  organization_id uuid not null,
  setor_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (setor_id, user_id),
  constraint crm_setores_membros_setor_fk foreign key (organization_id, setor_id)
    references public.crm_setores (organization_id, id) on delete cascade,
  constraint crm_setores_membros_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
create index if not exists idx_crm_setores_membros_pessoa on public.crm_setores_membros (organization_id, user_id);

create table if not exists public.crm_setor_do_dispositivo (
  channel_session_id uuid primary key,
  organization_id uuid not null,
  setor_id uuid not null,
  updated_at timestamptz not null default now(),
  constraint crm_setor_do_dispositivo_canal_fk foreign key (organization_id, channel_session_id)
    references public.channel_sessions (organization_id, id) on delete cascade,
  constraint crm_setor_do_dispositivo_setor_fk foreign key (organization_id, setor_id)
    references public.crm_setores (organization_id, id) on delete cascade
);
create index if not exists idx_crm_setor_do_dispositivo_setor on public.crm_setor_do_dispositivo (setor_id);

alter table public.crm_setores enable row level security;
alter table public.crm_setores_membros enable row level security;
alter table public.crm_setor_do_dispositivo enable row level security;
drop policy if exists crm_setores_select on public.crm_setores;
drop policy if exists crm_setores_write on public.crm_setores;
drop policy if exists crm_setores_membros_select on public.crm_setores_membros;
drop policy if exists crm_setores_membros_write on public.crm_setores_membros;
drop policy if exists crm_setor_do_dispositivo_select on public.crm_setor_do_dispositivo;
drop policy if exists crm_setor_do_dispositivo_write on public.crm_setor_do_dispositivo;
create policy crm_setores_select on public.crm_setores
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_setores_write on public.crm_setores
  for all using ((organization_id in (select public.fn_user_org_ids())) and public.fn_crm_pode(organization_id, 'CHAT_EDIT_TEAMS'))
  with check ((organization_id in (select public.fn_user_org_ids())) and public.fn_crm_pode(organization_id, 'CHAT_EDIT_TEAMS'));
create policy crm_setores_membros_select on public.crm_setores_membros
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_setores_membros_write on public.crm_setores_membros
  for all using ((organization_id in (select public.fn_user_org_ids())) and public.fn_crm_pode(organization_id, 'CHAT_EDIT_TEAMS'))
  with check ((organization_id in (select public.fn_user_org_ids())) and public.fn_crm_pode(organization_id, 'CHAT_EDIT_TEAMS'));
create policy crm_setor_do_dispositivo_select on public.crm_setor_do_dispositivo
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_setor_do_dispositivo_write on public.crm_setor_do_dispositivo
  for all using ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin'))
  with check ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin'));
revoke all on public.crm_setores, public.crm_setores_membros, public.crm_setor_do_dispositivo from anon;
grant select, insert, update, delete on public.crm_setores, public.crm_setores_membros, public.crm_setor_do_dispositivo to authenticated;
grant all on public.crm_setores, public.crm_setores_membros, public.crm_setor_do_dispositivo to service_role;
drop trigger if exists trg_crm_setores_updated_at on public.crm_setores;
create trigger trg_crm_setores_updated_at before update on public.crm_setores
  for each row execute function public.fn_set_updated_at();
comment on table public.crm_setores is
  'Setores de atendimento (fork Escale, migration 9203; E1). Nome e cor; membros em crm_setores_membros; um setor por dispositivo em crm_setor_do_dispositivo. Escrita com "Editar ou excluir setores" (fn_crm_pode).';

-- 5. O setor da conversa e "Em transferência" --------------------------------
create table if not exists public.crm_setor_da_conversa (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setor_id uuid references public.crm_setores(id) on delete set null,
  em_transferencia boolean not null default false,
  setor_anterior_id uuid references public.crm_setores(id) on delete set null,
  atendente_anterior_id uuid,
  transferido_por uuid,
  transferido_em timestamptz,
  updated_at timestamptz not null default now(),
  constraint crm_setor_da_conversa_transferencia_tem_setor check (not em_transferencia or setor_id is not null)
);
create index if not exists idx_crm_setor_da_conversa_setor on public.crm_setor_da_conversa (organization_id, setor_id);
alter table public.crm_setor_da_conversa enable row level security;
drop policy if exists crm_setor_da_conversa_select on public.crm_setor_da_conversa;
drop policy if exists crm_setor_da_conversa_write on public.crm_setor_da_conversa;
-- Quem vê a conversa (as policies de conversations, inclusive a do setor) vê o setor dela.
create policy crm_setor_da_conversa_select on public.crm_setor_da_conversa
  for select using (
    public.fn_is_platform_admin()
    or exists (select 1 from public.conversations c
                where c.id = conversation_id and c.organization_id = crm_setor_da_conversa.organization_id)
  );
create policy crm_setor_da_conversa_write on public.crm_setor_da_conversa
  for all using (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and exists (select 1 from public.conversations c
                 where c.id = conversation_id and c.organization_id = crm_setor_da_conversa.organization_id)
  ) with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
  );
revoke all on public.crm_setor_da_conversa from anon;
grant select, insert, update, delete on public.crm_setor_da_conversa to authenticated;
grant all on public.crm_setor_da_conversa to service_role;
comment on table public.crm_setor_da_conversa is
  'O setor explícito da conversa e o estado "Em transferência" (fork Escale, migration 9203; C3, E3). Sem linha, vale o setor do dispositivo (fn_crm_setor_efetivo). A transferência termina quando alguém assume (trg_crm_conclui_transferencia).';

-- 6. Setor efetivo e a leitura pelo setor -------------------------------------
create or replace function public.fn_crm_setor_efetivo(p_conversation uuid, p_channel_session uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select s.setor_id from public.crm_setor_da_conversa s where s.conversation_id = p_conversation),
    (select d.setor_id from public.crm_setor_do_dispositivo d where d.channel_session_id = p_channel_session));
$$;
-- Interna: só as funções abaixo (e o service role) a chamam; a sessão não.
revoke all on function public.fn_crm_setor_efetivo(uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_crm_setor_efetivo(uuid, uuid) to service_role;

create or replace function public.fn_crm_ve_pelo_setor(p_org uuid, p_conversation uuid, p_channel_session uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then false
    -- viewer, gerente e admin já leem tudo pela policy do original; só o atendente ganha algo aqui
    when public.fn_user_role_in_org(p_org) is distinct from 'agent' then false
    when not public.fn_crm_pode(p_org, 'CHAT_VIEW_TEAM') then false
    else exists (
      select 1 from public.crm_setores_membros m
       where m.organization_id = p_org
         and m.user_id = auth.uid()
         and m.setor_id = public.fn_crm_setor_efetivo(p_conversation, p_channel_session))
  end;
$$;
revoke all on function public.fn_crm_ve_pelo_setor(uuid, uuid, uuid) from public, anon;
grant execute on function public.fn_crm_ve_pelo_setor(uuid, uuid, uuid) to authenticated, service_role;

drop policy if exists crm_conversations_select_setor on public.conversations;
create policy crm_conversations_select_setor on public.conversations
  for select using (public.fn_crm_ve_pelo_setor(organization_id, id, channel_session_id));
comment on policy crm_conversations_select_setor on public.conversations is
  'FORK ESCALE · Fase 3C (migration 9203): o atendente com "Visualização de atendimento do setor" lê as conversas do setor efetivo dos seus setores. Permissiva: soma por OU com conversations_select do original; só amplia.';

-- 7. A transferência para setor termina quando alguém assume ------------------
create or replace function public.fn_crm_conclui_transferencia()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to_user_id is not null and new.assigned_to_user_id is distinct from old.assigned_to_user_id then
    update public.crm_setor_da_conversa
       set em_transferencia = false, setor_anterior_id = null, atendente_anterior_id = null, updated_at = now()
     where conversation_id = new.id and em_transferencia;
  end if;
  return null;
end;
$$;
revoke all on function public.fn_crm_conclui_transferencia() from public, anon, authenticated;
drop trigger if exists trg_crm_conclui_transferencia on public.conversations;
create trigger trg_crm_conclui_transferencia
  after update of assigned_to_user_id on public.conversations
  for each row execute function public.fn_crm_conclui_transferencia();

-- 8. Respostas rápidas: canais e setores --------------------------------------
create table if not exists public.crm_respostas_rapidas_extras (
  template_id uuid primary key references public.message_templates(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  canais text[] not null default array['whatsapp', 'instagram'],
  todos_os_setores boolean not null default true,
  constraint crm_respostas_rapidas_extras_canais_validos
    check (cardinality(canais) >= 1 and canais <@ array['whatsapp', 'instagram'])
);
create table if not exists public.crm_respostas_rapidas_setores (
  template_id uuid not null references public.message_templates(id) on delete cascade,
  setor_id uuid not null references public.crm_setores(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  primary key (template_id, setor_id)
);
create index if not exists idx_crm_respostas_rapidas_setores_setor on public.crm_respostas_rapidas_setores (setor_id);
alter table public.crm_respostas_rapidas_extras enable row level security;
alter table public.crm_respostas_rapidas_setores enable row level security;
drop policy if exists crm_respostas_rapidas_extras_select on public.crm_respostas_rapidas_extras;
drop policy if exists crm_respostas_rapidas_extras_write on public.crm_respostas_rapidas_extras;
drop policy if exists crm_respostas_rapidas_setores_select on public.crm_respostas_rapidas_setores;
drop policy if exists crm_respostas_rapidas_setores_write on public.crm_respostas_rapidas_setores;
-- Lê quem lê o template (a RLS do original: compartilhadas + as próprias).
create policy crm_respostas_rapidas_extras_select on public.crm_respostas_rapidas_extras
  for select using (public.fn_is_platform_admin() or exists (select 1 from public.message_templates t where t.id = template_id));
create policy crm_respostas_rapidas_setores_select on public.crm_respostas_rapidas_setores
  for select using (public.fn_is_platform_admin() or exists (select 1 from public.message_templates t where t.id = template_id));
-- Escreve quem escreve o template pela regra do original (a própria, agente; a compartilhada, gerente).
-- As exceções ("Compartilhar", "Editar ou excluir respostas rápidas") passam pela rota com service role.
create policy crm_respostas_rapidas_extras_write on public.crm_respostas_rapidas_extras
  for all using (exists (select 1 from public.message_templates t
                          where t.id = template_id and t.organization_id = crm_respostas_rapidas_extras.organization_id
                            and ((t.owner_user_id = auth.uid() and public.fn_role_at_least(t.organization_id, 'agent'))
                                 or (t.owner_user_id is null and public.fn_role_at_least(t.organization_id, 'manager')))))
  with check (exists (select 1 from public.message_templates t
                       where t.id = template_id and t.organization_id = crm_respostas_rapidas_extras.organization_id
                         and ((t.owner_user_id = auth.uid() and public.fn_role_at_least(t.organization_id, 'agent'))
                              or (t.owner_user_id is null and public.fn_role_at_least(t.organization_id, 'manager')))));
create policy crm_respostas_rapidas_setores_write on public.crm_respostas_rapidas_setores
  for all using (exists (select 1 from public.message_templates t
                          where t.id = template_id and t.organization_id = crm_respostas_rapidas_setores.organization_id
                            and ((t.owner_user_id = auth.uid() and public.fn_role_at_least(t.organization_id, 'agent'))
                                 or (t.owner_user_id is null and public.fn_role_at_least(t.organization_id, 'manager')))))
  with check (exists (select 1 from public.message_templates t
                       where t.id = template_id and t.organization_id = crm_respostas_rapidas_setores.organization_id
                         and ((t.owner_user_id = auth.uid() and public.fn_role_at_least(t.organization_id, 'agent'))
                              or (t.owner_user_id is null and public.fn_role_at_least(t.organization_id, 'manager')))));
revoke all on public.crm_respostas_rapidas_extras, public.crm_respostas_rapidas_setores from anon;
grant select, insert, update, delete on public.crm_respostas_rapidas_extras, public.crm_respostas_rapidas_setores to authenticated;
grant all on public.crm_respostas_rapidas_extras, public.crm_respostas_rapidas_setores to service_role;
comment on table public.crm_respostas_rapidas_extras is
  'Canais e "todos os setores" de cada resposta rápida (fork Escale, migration 9203; E6). A resposta em si é o message_templates do original; sem linha aqui = os dois canais, todos os setores.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;
notify pgrst, 'reload schema';
