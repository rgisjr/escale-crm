-- manifest: **Notas e arquivos da ficha do negócio (fork Escale, Fase 1H).** Duas tabelas novas. `crm_notas_do_negocio`: a nota que a pessoa escreve no negócio ("Nova nota" da Clint), com autor, texto (1 a 4.000 caracteres) e o contato; vista por quem vê o negócio (`fn_can_view_lead` via `crm_leads`, com a sessão de quem olha), escrita por agent+ como autor (`user_id = auth.uid()`), editada e apagada pelo autor ou por gerente+. `crm_arquivos_do_contato`: o arquivo enviado junto do contato (na Clint o arquivo é do contato, não do negócio), com o negócio de onde foi enviado, nome, extensão, mime, tamanho e o caminho no bucket; vista pela organização (como `contacts`), enviada por agent+ como autor, apagada pelo autor ou por gerente+. FKs compostas com `on delete cascade` para o negócio (ganha o índice único `uq_crm_leads_org_id`), o contato e o autor. Bucket privado `arquivos-do-contato` (50 MB), sem policy em `storage.objects`: só o service role lê e grava, por rota (doutrina da 0464/0483). Garante também o índice único `uq_contacts_org_id` (o mesmo da 0611, `if not exists`): o baseline é aplicado em ordem e a 0611 mora mais adiante nele, então a FK composta para `contacts` precisa do alvo já no bloco. Policies de UPDATE e DELETE separadas (nunca `for all`, que abriria leitura e escrita fora da regra do negócio); a pessoa só edita o `texto` da nota (grant por coluna) e o arquivo não se edita. Travas de suporte nas duas tabelas.
-- 9008: notas do negócio e arquivos do contato (fork Escale).

-- A FK composta para o negócio precisa do alvo único (o mesmo desenho da 9003 para crm_pipelines).
create unique index if not exists uq_crm_leads_org_id on public.crm_leads (organization_id, id);

-- O alvo da FK composta para contacts é o da 0611 (mesmo nome, `if not exists`). No baseline a 0611
-- vem DEPOIS deste bloco; sem esta linha a instalação nova falha em "no unique constraint matching".
create unique index if not exists uq_contacts_org_id on public.contacts (organization_id, id);

-- ── 1. notas do negócio ───────────────────────────────────────────────────────
create table if not exists public.crm_notas_do_negocio (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  contact_id uuid,
  user_id uuid not null,
  user_nome text,
  texto text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_notas_do_negocio_texto_valido check (char_length(btrim(texto)) between 1 and 4000),
  constraint crm_notas_do_negocio_negocio_fk foreign key (organization_id, lead_id)
    references public.crm_leads (organization_id, id) on delete cascade,
  constraint crm_notas_do_negocio_contato_fk foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id) on delete cascade,
  constraint crm_notas_do_negocio_autor_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create index if not exists idx_crm_notas_do_negocio_negocio
  on public.crm_notas_do_negocio (organization_id, lead_id, created_at desc);

alter table public.crm_notas_do_negocio enable row level security;

drop policy if exists crm_notas_do_negocio_select on public.crm_notas_do_negocio;
drop policy if exists crm_notas_do_negocio_insert on public.crm_notas_do_negocio;
drop policy if exists crm_notas_do_negocio_dono_ou_gerente_write on public.crm_notas_do_negocio;
drop policy if exists crm_notas_do_negocio_dono_ou_gerente_delete on public.crm_notas_do_negocio;

-- Quem vê a nota é quem vê o negócio: a subconsulta roda sob a RLS de quem olha.
create policy crm_notas_do_negocio_select on public.crm_notas_do_negocio
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and exists (select 1 from public.crm_leads l
                     where l.id = crm_notas_do_negocio.lead_id
                       and l.organization_id = crm_notas_do_negocio.organization_id
                       and public.fn_can_view_lead(l.organization_id, l.owner_user_id)))
  );

-- Escreve agent+ (viewer é só leitura), sempre como autor, e só em negócio que ENXERGA.
create policy crm_notas_do_negocio_insert on public.crm_notas_do_negocio
  for insert with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and user_id = auth.uid()
        and exists (select 1 from public.crm_leads l
                     where l.id = crm_notas_do_negocio.lead_id
                       and l.organization_id = crm_notas_do_negocio.organization_id))
  );

-- Edita e apaga o autor, ou gerente ou acima (PRD §5). UMA policy por comando, nunca `for all`:
-- policies permissivas somam por OR e a `for all` também valeria para SELECT e INSERT, abrindo a
-- leitura e a escrita fora da regra do negócio (achado do revisor). Para UPDATE/DELETE com WHERE o
-- Postgres ainda exige que a linha passe no SELECT, então só edita/apaga quem vê o negócio.
create policy crm_notas_do_negocio_dono_ou_gerente_write on public.crm_notas_do_negocio
  for update using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager')))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager')))
  );

create policy crm_notas_do_negocio_dono_ou_gerente_delete on public.crm_notas_do_negocio
  for delete using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager')))
  );

revoke all on public.crm_notas_do_negocio from anon;
grant select, insert, update, delete on public.crm_notas_do_negocio to authenticated;
grant all on public.crm_notas_do_negocio to service_role;
-- A pessoa só edita o TEXTO: nada de mover a nota de negócio/contato/organização nem trocar o autor.
-- (TRUNCATE/REFERENCES/TRIGGER vêm do default ACL do Supabase e não servem a ninguém aqui.)
revoke truncate, references, trigger on public.crm_notas_do_negocio from authenticated;
revoke update on public.crm_notas_do_negocio from authenticated;
grant update (texto) on public.crm_notas_do_negocio to authenticated;

drop trigger if exists trg_crm_notas_do_negocio_updated_at on public.crm_notas_do_negocio;
create trigger trg_crm_notas_do_negocio_updated_at
  before update on public.crm_notas_do_negocio
  for each row execute function public.fn_set_updated_at();

-- ── 2. arquivos do contato ────────────────────────────────────────────────────
create table if not exists public.crm_arquivos_do_contato (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null,
  lead_id uuid,
  user_id uuid not null,
  user_nome text,
  nome text not null,
  extensao text not null,
  mime text not null,
  tamanho bigint not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  constraint crm_arquivos_do_contato_nome_valido check (char_length(btrim(nome)) between 1 and 255),
  constraint crm_arquivos_do_contato_tamanho_valido check (tamanho > 0 and tamanho <= 52428800),
  constraint crm_arquivos_do_contato_contato_fk foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id) on delete cascade,
  constraint crm_arquivos_do_contato_negocio_fk foreign key (organization_id, lead_id)
    references public.crm_leads (organization_id, id) on delete set null (lead_id),
  constraint crm_arquivos_do_contato_autor_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create index if not exists idx_crm_arquivos_do_contato_contato
  on public.crm_arquivos_do_contato (organization_id, contact_id, created_at desc);

alter table public.crm_arquivos_do_contato enable row level security;

drop policy if exists crm_arquivos_do_contato_select on public.crm_arquivos_do_contato;
drop policy if exists crm_arquivos_do_contato_insert on public.crm_arquivos_do_contato;
drop policy if exists crm_arquivos_do_contato_dono_ou_gerente_write on public.crm_arquivos_do_contato;

-- O arquivo é do contato: quem vê o contato (a organização inteira, como em `contacts`) vê o arquivo.
create policy crm_arquivos_do_contato_select on public.crm_arquivos_do_contato
  for select using (
    public.fn_is_platform_admin()
    or (organization_id in (select public.fn_user_org_ids()))
  );

create policy crm_arquivos_do_contato_insert on public.crm_arquivos_do_contato
  for insert with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and user_id = auth.uid()
        and exists (select 1 from public.contacts c
                     where c.id = crm_arquivos_do_contato.contact_id
                       and c.organization_id = crm_arquivos_do_contato.organization_id))
  );

-- Depois do envio a única escrita é apagar (o arquivo não se edita): policy só de DELETE.
create policy crm_arquivos_do_contato_dono_ou_gerente_write on public.crm_arquivos_do_contato
  for delete using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager')))
  );

revoke all on public.crm_arquivos_do_contato from anon;
grant select, insert, update, delete on public.crm_arquivos_do_contato to authenticated;
grant all on public.crm_arquivos_do_contato to service_role;
revoke truncate, references, trigger on public.crm_arquivos_do_contato from authenticated;
revoke update on public.crm_arquivos_do_contato from authenticated;

-- ── 3. bucket privado ─────────────────────────────────────────────────────────
-- Sem policy em storage.objects (doutrina da 0464/0483): o service role ignora a
-- RLS e grava/assina por rota; `auth.role()` quebraria o Postgres efêmero do test:db.
insert into storage.buckets (id, name, public, file_size_limit)
values ('arquivos-do-contato', 'arquivos-do-contato', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit, public = false;

comment on table public.crm_notas_do_negocio is
  'Notas do negócio (fork Escale, migration 9008): a "Nova nota" da Clint. Vista por quem vê o negócio; escrita por agent+ como autor; editada/apagada pelo autor ou por gerente+. O texto fica só aqui (a linha do tempo guarda o ponteiro, sem PII).';
comment on table public.crm_arquivos_do_contato is
  'Arquivos do contato (fork Escale, migration 9008): enviados pela ficha do negócio (lead_id = de onde veio). Vistos pela organização; enviados por agent+ como autor; apagados pelo autor ou por gerente+. O binário fica no bucket privado arquivos-do-contato, lido por URL assinada pelo service role.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
