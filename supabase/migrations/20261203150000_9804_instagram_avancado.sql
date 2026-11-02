-- manifest: **Instagram avançado (fork Escale, Fase 10D).** `escale_disparos_de_comentario` ganha os desfechos `aguardando_seguir` e `fora_do_publico` no direct, as colunas `ocultar` e `curtir` (`nao_pedido`/`pendente`/`feito`/`falhou`), `toques_no_liberar` e `direct_pendente` (o direct guardado do "Siga para liberar"). O índice único por pessoa (`uq_escale_disparos_de_comentario_pessoa`) sai: "uma vez por pessoa" ou "de novo depois de N horas" passa para a função `fn_escale_reivindicar_disparo` (security definer, só service_role), que trava por regra, rede e autor com `pg_advisory_xact_lock` e grava normal ou `repetido` na mesma transação. O índice único por comentário fica. `fn_escale_resumo_dos_comentarios` é recriada com `fora_do_publico`, `aguardando_seguir` e `ocultados`. Nenhuma tabela do original muda.
-- ---- FORK ESCALE · Instagram avançado (migration 9804) ----

alter table public.escale_disparos_de_comentario
  drop constraint if exists escale_disparos_de_comentario_direct_check;
alter table public.escale_disparos_de_comentario
  add constraint escale_disparos_de_comentario_direct_check
  check (direct in ('pendente', 'enviado', 'falhou', 'sem_passo', 'pulado', 'aguardando_seguir', 'fora_do_publico'));

alter table public.escale_disparos_de_comentario
  add column if not exists ocultar text not null default 'nao_pedido'
    check (ocultar in ('nao_pedido', 'pendente', 'feito', 'falhou')),
  add column if not exists curtir text not null default 'nao_pedido'
    check (curtir in ('nao_pedido', 'pendente', 'feito', 'falhou')),
  add column if not exists toques_no_liberar smallint not null default 0
    check (toques_no_liberar between 0 and 10),
  add column if not exists direct_pendente jsonb
    check (direct_pendente is null or pg_column_size(direct_pendente) <= 8192);

drop index if exists public.uq_escale_disparos_de_comentario_pessoa;
create index if not exists idx_escale_disparos_de_comentario_pessoa
  on public.escale_disparos_de_comentario (rule_id, plataforma, autor_id, created_at desc)
  where not repetido;

-- Decide e grava o disparo de UM comentário numa regra, sem corrida entre dois
-- comentários da mesma pessoa: a trava é por (regra, rede, autor).
-- Devolve 'novo' | 'repetido' | 'ja_existe' (reentrega do mesmo comentário).
-- p_intervalo_horas null = "uma vez por pessoa".
create or replace function public.fn_escale_reivindicar_disparo(p_linha jsonb, p_intervalo_horas integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule uuid := (p_linha ->> 'rule_id')::uuid;
  v_plat text := p_linha ->> 'plataforma';
  v_autor text := p_linha ->> 'autor_id';
  v_ultimo timestamptz;
  v_repetido boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_rule::text || ':' || v_plat || ':' || v_autor, 9804));

  if exists (
    select 1 from public.escale_disparos_de_comentario d
     where d.organization_id = (p_linha ->> 'organization_id')::uuid
       and d.rule_id = v_rule
       and d.comentario_id = p_linha ->> 'comentario_id'
  ) then
    return 'ja_existe';
  end if;

  select max(d.created_at) into v_ultimo
    from public.escale_disparos_de_comentario d
   where d.rule_id = v_rule and d.plataforma = v_plat and d.autor_id = v_autor and not d.repetido;

  v_repetido := v_ultimo is not null
    and (p_intervalo_horas is null or v_ultimo > now() - make_interval(hours => p_intervalo_horas));

  insert into public.escale_disparos_de_comentario (
    organization_id, rule_id, channel_session_id, event_id, contact_id, caminho_id, plataforma,
    comentario_id, publicacao_id, autor_id, autor_usuario, autor_nome, texto, comentado_em,
    publicacao_legenda, publicacao_miniatura, publicacao_link,
    repetido, direct, resposta, motivo, ocultar, curtir
  ) values (
    (p_linha ->> 'organization_id')::uuid, v_rule, nullif(p_linha ->> 'channel_session_id', '')::uuid,
    nullif(p_linha ->> 'event_id', '')::uuid, nullif(p_linha ->> 'contact_id', '')::uuid,
    p_linha ->> 'caminho_id', v_plat, p_linha ->> 'comentario_id', p_linha ->> 'publicacao_id',
    v_autor, p_linha ->> 'autor_usuario', p_linha ->> 'autor_nome', p_linha ->> 'texto',
    (p_linha ->> 'comentado_em')::timestamptz,
    p_linha ->> 'publicacao_legenda', p_linha ->> 'publicacao_miniatura', p_linha ->> 'publicacao_link',
    v_repetido,
    case when v_repetido then 'pulado' else coalesce(p_linha ->> 'direct', 'pendente') end,
    case when v_repetido then 'pulada' else 'pendente' end,
    case when v_repetido then 'ja_recebeu' else p_linha ->> 'motivo' end,
    case when v_repetido then 'nao_pedido' else coalesce(p_linha ->> 'ocultar', 'nao_pedido') end,
    case when v_repetido then 'nao_pedido' else coalesce(p_linha ->> 'curtir', 'nao_pedido') end
  );
  return case when v_repetido then 'repetido' else 'novo' end;
exception when unique_violation then
  return 'ja_existe';
end;
$$;

revoke all on function public.fn_escale_reivindicar_disparo(jsonb, integer) from public, anon, authenticated;
grant execute on function public.fn_escale_reivindicar_disparo(jsonb, integer) to service_role;

create or replace function public.fn_escale_resumo_dos_comentarios(p_regra uuid, p_desde timestamptz)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'comentarios', count(*) filter (where not d.repetido),
    'repetidos', count(*) filter (where d.repetido),
    'directs', count(*) filter (where d.direct = 'enviado'),
    'directs_com_falha', count(*) filter (where d.direct = 'falhou'),
    'respostas', count(*) filter (where d.resposta = 'publicada'),
    'respostas_com_falha', count(*) filter (where d.resposta = 'falhou'),
    'fora_do_publico', count(*) filter (where d.direct = 'fora_do_publico'),
    'aguardando_seguir', count(*) filter (where d.direct = 'aguardando_seguir'),
    'ocultados', count(*) filter (where d.ocultar = 'feito')
  )
  from public.escale_disparos_de_comentario d
  where d.rule_id = p_regra and (p_desde is null or d.created_at >= p_desde);
$$;

revoke all on function public.fn_escale_resumo_dos_comentarios(uuid, timestamptz) from public, anon;
grant execute on function public.fn_escale_resumo_dos_comentarios(uuid, timestamptz) to authenticated, service_role;

notify pgrst, 'reload schema';
