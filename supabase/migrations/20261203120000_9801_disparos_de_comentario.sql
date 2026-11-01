-- manifest: **Disparos de comentário (fork Escale, Fase 10B).** Tabela nova `escale_disparos_de_comentario`: uma linha por comentário que casou com uma automação de gatilho `comment.received` (conta, caminho, publicação, autor, texto, contato, execução, desfecho do direct e da resposta pública, motivo). Índice único por comentário em cada regra (o webhook reentregue não roda de novo) e por pessoa em cada regra fora das linhas `repetido` (uma mensagem por pessoa por automação). Gatilho de mesma organização reaproveita `fn_escale_automacao_da_mesma_org` (9701). RLS: a organização lê; só o servidor (service_role) grava. Função `fn_escale_resumo_dos_comentarios` (security invoker) conta os disparos de uma regra no período para o Insights. `automation_rules` e `automation_rule_runs` não mudam.
-- ---- FORK ESCALE · disparos de comentário (migration 9801) ----

create table if not exists public.escale_disparos_de_comentario (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  channel_session_id uuid references public.channel_sessions(id) on delete set null,
  event_id uuid references public.event_log(id) on delete set null,
  run_id uuid references public.automation_rule_runs(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  caminho_id text not null check (char_length(caminho_id) between 1 and 40),
  plataforma text not null check (plataforma in ('instagram', 'facebook')),
  comentario_id text not null check (char_length(comentario_id) between 1 and 128),
  publicacao_id text not null check (char_length(publicacao_id) between 1 and 128),
  autor_id text not null check (char_length(autor_id) between 1 and 128),
  autor_usuario text check (autor_usuario is null or char_length(autor_usuario) <= 100),
  autor_nome text check (autor_nome is null or char_length(autor_nome) <= 200),
  texto text not null check (char_length(texto) <= 5000),
  comentado_em timestamptz not null,
  repetido boolean not null default false,
  direct text not null default 'pendente'
    check (direct in ('pendente', 'enviado', 'falhou', 'sem_passo', 'pulado')),
  resposta text not null default 'pendente'
    check (resposta in ('pendente', 'publicada', 'falhou', 'sem_resposta', 'pulada')),
  motivo text check (motivo is null or char_length(motivo) <= 80),
  resposta_publicada text check (resposta_publicada is null or char_length(resposta_publicada) <= 300),
  direct_message_id text check (direct_message_id is null or char_length(direct_message_id) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_escale_disparos_de_comentario_comentario
  on public.escale_disparos_de_comentario (organization_id, rule_id, comentario_id);
create unique index if not exists uq_escale_disparos_de_comentario_pessoa
  on public.escale_disparos_de_comentario (rule_id, plataforma, autor_id) where not repetido;
create index if not exists idx_escale_disparos_de_comentario_regra
  on public.escale_disparos_de_comentario (rule_id, created_at desc);

drop trigger if exists trg_escale_disparos_de_comentario_mesma_org on public.escale_disparos_de_comentario;
create trigger trg_escale_disparos_de_comentario_mesma_org
  before insert or update of rule_id, organization_id on public.escale_disparos_de_comentario
  for each row execute function public.fn_escale_automacao_da_mesma_org();

alter table public.escale_disparos_de_comentario enable row level security;
drop policy if exists escale_disparos_de_comentario_select on public.escale_disparos_de_comentario;
create policy escale_disparos_de_comentario_select on public.escale_disparos_de_comentario for select
  using ((organization_id in (select public.fn_user_org_ids())) or public.fn_is_platform_admin());
revoke all on public.escale_disparos_de_comentario from anon;
revoke insert, update, delete, truncate on public.escale_disparos_de_comentario from authenticated;
grant select on public.escale_disparos_de_comentario to authenticated;
grant all on public.escale_disparos_de_comentario to service_role;

create or replace function public.fn_escale_resumo_dos_comentarios(p_regra uuid, p_desde timestamptz)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'comentarios', count(*) filter (where not d.repetido),
    'repetidos', count(*) filter (where d.repetido),
    'directs', count(*) filter (where d.direct = 'enviado'),
    'directs_com_falha', count(*) filter (where d.direct = 'falhou'),
    'respostas', count(*) filter (where d.resposta = 'publicada'),
    'respostas_com_falha', count(*) filter (where d.resposta = 'falhou')
  )
  from public.escale_disparos_de_comentario d
  where d.rule_id = p_regra and (p_desde is null or d.created_at >= p_desde);
$$;
revoke all on function public.fn_escale_resumo_dos_comentarios(uuid, timestamptz) from public, anon;
grant execute on function public.fn_escale_resumo_dos_comentarios(uuid, timestamptz) to authenticated, service_role;

comment on table public.escale_disparos_de_comentario is
  'Fork Escale (9801): um disparo por comentário que casou com uma automação de comentário; guarda o desfecho do direct e da resposta pública.';

notify pgrst, 'reload schema';
