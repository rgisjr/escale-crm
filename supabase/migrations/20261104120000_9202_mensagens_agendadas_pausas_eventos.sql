-- manifest: fork Escale · Fase 3B · mensagens agendadas, pausas de automação e eventos da conversa da casca
-- ---- FORK ESCALE · conversa aberta da casca (migration 9202) ----
--
-- Três tabelas do fork (PRD de Conversas, seção 7): as mensagens agendadas pelo
-- atendente (C9), a pausa de automação por conversa (D4) e os eventos que a
-- thread da Clint mostra (espera, encerrar, reabrir; C2). Nada muda nas tabelas
-- do original: a espera usa o snooze e a pausa usa bot_silenced_until.

-- 1. Mensagens agendadas -----------------------------------------------------
create table if not exists public.crm_mensagens_agendadas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel_session_id uuid not null references public.channel_sessions(id) on delete cascade,
  tipo text not null,
  corpo text,
  template jsonb,
  enviar_em timestamptz not null,
  criado_por uuid not null,
  status text not null default 'pendente',
  erro text,
  message_id uuid,
  enviada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_mensagens_agendadas_tipo_valido check (tipo in ('texto', 'template')),
  constraint crm_mensagens_agendadas_status_valido
    check (status in ('pendente', 'processando', 'enviada', 'falhou', 'removida')),
  constraint crm_mensagens_agendadas_conteudo
    check ((tipo = 'texto' and corpo is not null and char_length(corpo) between 1 and 4096 and template is null)
        or (tipo = 'template' and template is not null and jsonb_typeof(template) = 'object' and corpo is null)),
  constraint crm_mensagens_agendadas_pessoa_fk foreign key (criado_por, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
create index if not exists idx_crm_mensagens_agendadas_fila
  on public.crm_mensagens_agendadas (enviar_em) where status = 'pendente';
create index if not exists idx_crm_mensagens_agendadas_conversa
  on public.crm_mensagens_agendadas (organization_id, conversation_id) where status = 'pendente';
create index if not exists idx_crm_mensagens_agendadas_org
  on public.crm_mensagens_agendadas (organization_id, created_at desc);

alter table public.crm_mensagens_agendadas enable row level security;
drop policy if exists crm_mensagens_agendadas_select on public.crm_mensagens_agendadas;
drop policy if exists crm_mensagens_agendadas_insert on public.crm_mensagens_agendadas;
drop policy if exists crm_mensagens_agendadas_update on public.crm_mensagens_agendadas;
create policy crm_mensagens_agendadas_select on public.crm_mensagens_agendadas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent'))
  );
create policy crm_mensagens_agendadas_insert on public.crm_mensagens_agendadas
  for insert with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and criado_por = auth.uid()
    and status = 'pendente'
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.organization_id = crm_mensagens_agendadas.organization_id)
  );
-- Remover = status 'removida'. A sua, agente; qualquer uma, gerente ou acima. Só uma pendente sai.
create policy crm_mensagens_agendadas_update on public.crm_mensagens_agendadas
  for update using (
    (organization_id in (select public.fn_user_org_ids()))
    and status = 'pendente'
    and (criado_por = auth.uid() or public.fn_role_at_least(organization_id, 'manager'))
  ) with check (
    (organization_id in (select public.fn_user_org_ids()))
    and status = 'removida'
  );
revoke all on public.crm_mensagens_agendadas from anon;
grant select, insert, update on public.crm_mensagens_agendadas to authenticated;
grant all on public.crm_mensagens_agendadas to service_role;
drop trigger if exists trg_crm_mensagens_agendadas_updated_at on public.crm_mensagens_agendadas;
create trigger trg_crm_mensagens_agendadas_updated_at
  before update on public.crm_mensagens_agendadas
  for each row execute function public.fn_set_updated_at();
comment on table public.crm_mensagens_agendadas is
  'Mensagens agendadas pelo atendente (fork Escale, migration 9202; C9 do PRD de Conversas). O cron mensagens-agendadas envia na hora pelo sendMessageHandler, com o dispositivo de pé e, fora da janela, só template. Agente cria e remove a sua; gerente remove qualquer.';

-- 2. Pausas de automação ------------------------------------------------------
create table if not exists public.crm_pausas_de_automacao (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ate timestamptz,
  user_id uuid not null,
  enrollments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint crm_pausas_de_automacao_enrollments_lista check (jsonb_typeof(enrollments) = 'array'),
  constraint crm_pausas_de_automacao_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
create index if not exists idx_crm_pausas_de_automacao_vencidas
  on public.crm_pausas_de_automacao (ate) where ate is not null;
alter table public.crm_pausas_de_automacao enable row level security;
drop policy if exists crm_pausas_de_automacao_select on public.crm_pausas_de_automacao;
drop policy if exists crm_pausas_de_automacao_write on public.crm_pausas_de_automacao;
create policy crm_pausas_de_automacao_select on public.crm_pausas_de_automacao
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent'))
  );
create policy crm_pausas_de_automacao_write on public.crm_pausas_de_automacao
  for all using (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and exists (select 1 from public.conversations c
                 where c.id = conversation_id and c.organization_id = crm_pausas_de_automacao.organization_id)
  ) with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and user_id = auth.uid()
    and exists (select 1 from public.conversations c
                 where c.id = conversation_id and c.organization_id = crm_pausas_de_automacao.organization_id)
  );
revoke all on public.crm_pausas_de_automacao from anon;
grant select, insert, update, delete on public.crm_pausas_de_automacao to authenticated;
grant all on public.crm_pausas_de_automacao to service_role;
comment on table public.crm_pausas_de_automacao is
  'A pausa de automação por conversa (fork Escale, migration 9202; D4): até quando (nulo = até retomar), quem pausou e os follow-ups pausados. O agente de IA é pausado por bot_silenced_until da própria conversa.';

-- 3. Eventos da conversa ------------------------------------------------------
create table if not exists public.crm_eventos_da_conversa (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  tipo text not null,
  user_id uuid,
  created_at timestamptz not null default now(),
  constraint crm_eventos_da_conversa_tipo_valido
    check (tipo in ('espera', 'espera_removida', 'encerrado', 'reaberto'))
);
create index if not exists idx_crm_eventos_da_conversa_conversa
  on public.crm_eventos_da_conversa (conversation_id, created_at);
alter table public.crm_eventos_da_conversa enable row level security;
drop policy if exists crm_eventos_da_conversa_select on public.crm_eventos_da_conversa;
drop policy if exists crm_eventos_da_conversa_insert on public.crm_eventos_da_conversa;
create policy crm_eventos_da_conversa_select on public.crm_eventos_da_conversa
  for select using (
    public.fn_is_platform_admin()
    or exists (select 1 from public.conversations c
                where c.id = conversation_id
                  and c.organization_id = crm_eventos_da_conversa.organization_id)
  );
create policy crm_eventos_da_conversa_insert on public.crm_eventos_da_conversa
  for insert with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and user_id = auth.uid()
    and exists (select 1 from public.conversations c
                 where c.id = conversation_id and c.organization_id = crm_eventos_da_conversa.organization_id)
  );
revoke all on public.crm_eventos_da_conversa from anon;
grant select, insert on public.crm_eventos_da_conversa to authenticated;
grant all on public.crm_eventos_da_conversa to service_role;
comment on table public.crm_eventos_da_conversa is
  'Os eventos que a thread da Clint mostra (fork Escale, migration 9202; C2): espera, espera removida, encerrado, reaberto. Quem vê a conversa (RLS de conversations) vê os eventos; o sistema (service role) grava a espera removida pela mensagem do cliente.';

-- 4. LGPD: anonimizar o contato apaga as agendadas dele -----------------------
-- O texto agendado fala com a pessoa e o envio pendente não tem mais destinatário:
-- apaga na virada de is_anonymized, a porta dos dois caminhos (o desenho da 0391).
create or replace function public.fn_crm_apaga_agendadas_de_contato_anonimizado()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public', 'pg_temp'
as $$
begin
  delete from public.crm_mensagens_agendadas where contact_id = new.id;
  return new;
end$$;
revoke all on function public.fn_crm_apaga_agendadas_de_contato_anonimizado() from public, anon, authenticated;
drop trigger if exists trg_contacts_anonimizado_limpa_agendadas on public.contacts;
create trigger trg_contacts_anonimizado_limpa_agendadas
  after update of is_anonymized on public.contacts
  for each row
  when (new.is_anonymized = true and coalesce(old.is_anonymized, false) = false)
  execute function public.fn_crm_apaga_agendadas_de_contato_anonimizado();

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;
notify pgrst, 'reload schema';
