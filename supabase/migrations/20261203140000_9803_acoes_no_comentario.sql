-- manifest: **Ações na caixa de comentários (fork Escale, Fase 10A).** Tabela nova `escale_acoes_no_comentario`: uma linha por ação feita à mão num comentário do Instagram/Facebook pela caixa de comentários de Atendimento (resposta pública, direct, ocultar, reexibir, apagar; curtir e descurtir ficam prontos para a 10D), com quem fez, o desfecho (`enviando`, `feito`, `falhou`), o motivo e o id devolvido pelo Zernio. O comentário de quem comentou NÃO é guardado (só o id dele e o texto que o CRM mandou). Índice único parcial garante um direct por comentário (regra da Meta) mesmo com dois cliques ou duas pessoas ao mesmo tempo. Dois índices novos em `escale_disparos_de_comentario` (por comentário e por autor) para a caixa achar o direct da automação e o contato de quem comentou. RLS: a organização lê; só o servidor (service_role) grava. Nenhuma tabela do original muda.
-- ---- FORK ESCALE · ações no comentário (migration 9803) ----

create table if not exists public.escale_acoes_no_comentario (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_session_id uuid references public.channel_sessions(id) on delete set null,
  plataforma text not null check (plataforma in ('instagram', 'facebook')),
  comentario_id text not null check (char_length(comentario_id) between 1 and 128),
  publicacao_id text not null check (char_length(publicacao_id) between 1 and 128),
  autor_id text check (autor_id is null or char_length(autor_id) between 1 and 128),
  acao text not null
    check (acao in ('resposta', 'direct', 'ocultar', 'reexibir', 'apagar', 'curtir', 'descurtir')),
  status text not null default 'enviando' check (status in ('enviando', 'feito', 'falhou')),
  motivo text check (motivo is null or char_length(motivo) <= 80),
  texto text check (texto is null or char_length(texto) <= 1000),
  resultado_id text check (resultado_id is null or char_length(resultado_id) <= 200),
  user_id uuid references auth.users(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  message_id uuid,  -- messages.id da conversa (sem FK: a linha da conversa pode ser apagada pela LGPD sem travar)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_escale_acoes_no_comentario_direct
  on public.escale_acoes_no_comentario (organization_id, comentario_id)
  where acao = 'direct' and status in ('enviando', 'feito');
create index if not exists idx_escale_acoes_no_comentario_publicacao
  on public.escale_acoes_no_comentario (organization_id, channel_session_id, publicacao_id, created_at desc);

create index if not exists idx_escale_disparos_de_comentario_por_comentario
  on public.escale_disparos_de_comentario (organization_id, comentario_id);
create index if not exists idx_escale_disparos_de_comentario_por_autor
  on public.escale_disparos_de_comentario (organization_id, plataforma, autor_id)
  where contact_id is not null;

alter table public.escale_acoes_no_comentario enable row level security;
drop policy if exists escale_acoes_no_comentario_select on public.escale_acoes_no_comentario;
create policy escale_acoes_no_comentario_select on public.escale_acoes_no_comentario for select
  using ((organization_id in (select public.fn_user_org_ids())) or public.fn_is_platform_admin());
revoke all on public.escale_acoes_no_comentario from anon;
revoke insert, update, delete, truncate on public.escale_acoes_no_comentario from authenticated;
grant select on public.escale_acoes_no_comentario to authenticated;
grant all on public.escale_acoes_no_comentario to service_role;

comment on table public.escale_acoes_no_comentario is
  'Fork Escale (9803): ações feitas à mão na caixa de comentários; um direct por comentário (índice único parcial).';

notify pgrst, 'reload schema';
