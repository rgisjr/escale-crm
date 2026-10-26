-- manifest: **Revisão Q10: gravações em lote, com tudo ou nada (fork Escale, G3-2, B3-8 e G5-8).** Duas funções novas, nenhuma tabela nem dado muda. `fn_escale_reordenar_campos(org, objeto, grupos, campos)` (invoker, `authenticated` e `service_role`) grava a posição dos grupos e a posição e o grupo de cada campo num comando só, numa transação: falhou no meio, a ordem antiga fica inteira; a RLS de administrador das tabelas continua decidindo quem grava, e um `grupo_id` que não é da organização e do objeto recusa com 22023 `grupo_sumiu`. `fn_escale_gravar_desfechos_da_importacao(importacao, desfechos)` (invoker, só `service_role`) grava de uma vez o desfecho de todas as linhas de um lote da importação (status, motivo, detalhe, aviso, contato, negócio e mensagem), só nas linhas dessa importação; os CHECKs da 9107 continuam valendo.
-- ---- FORK ESCALE · revisão Q10: gravações em lote (migration 9407) ----
-- 9407: revisão de qualidade Q10 (fork Escale). Só funções; nenhum dado muda.

-- Antes: reordenar mandava um UPDATE por grupo e por campo (sem transação: falha no meio
-- deixava a ordem pela metade) e o worker da importação mandava um UPDATE por linha.

-- ── 1. Reordenar grupos e campos de uma vez ──────────────────────────────────
-- p_campos: [{"grupo_id": uuid, "ids": [uuid, ...]}, ...]. A posição é o índice no vetor.
-- Id de campo que sumiu no meio do caminho não derruba o conjunto (o UPDATE por id
-- sempre foi assim); grupo que sumiu, sim: o campo ficaria sem grupo.
create or replace function public.fn_escale_reordenar_campos(
  p_org uuid,
  p_objeto text,
  p_grupos uuid[],
  p_campos jsonb
)
returns void
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_objeto is null or p_objeto not in ('contato', 'empresa', 'negocio') then
    raise exception 'objeto_invalido' using errcode = '22023';
  end if;
  if p_campos is null then
    p_campos := '[]'::jsonb;
  end if;
  if jsonb_typeof(p_campos) <> 'array' then
    raise exception 'campos_invalidos' using errcode = '22023';
  end if;

  -- Todo grupo citado tem de ser da organização e do objeto.
  if exists (
    select 1
      from jsonb_to_recordset(p_campos) as c(grupo_id uuid)
     where c.grupo_id is not null
       and not exists (
         select 1 from public.crm_grupos_de_campos g
          where g.id = c.grupo_id and g.organization_id = p_org and g.objeto = p_objeto)
  ) then
    raise exception 'grupo_sumiu' using errcode = '22023';
  end if;

  if coalesce(cardinality(p_grupos), 0) > 0 then
    update public.crm_grupos_de_campos g
       set posicao = o.ord - 1
      from unnest(p_grupos) with ordinality as o(id, ord)
     where g.id = o.id and g.organization_id = p_org and g.objeto = p_objeto;
  end if;

  if p_objeto = 'negocio' then
    update public.crm_campos_do_negocio f
       set posicao = x.ord - 1, grupo_id = x.grupo_id
      from (
        select c.grupo_id, i.id, i.ord
          from jsonb_to_recordset(p_campos) as c(grupo_id uuid, ids jsonb),
               lateral jsonb_array_elements_text(c.ids) with ordinality as i(id, ord)
      ) x
     where f.id = x.id::uuid and f.organization_id = p_org;
  else
    update public.crm_campos_do_crm f
       set posicao = x.ord - 1, grupo_id = x.grupo_id
      from (
        select c.grupo_id, i.id, i.ord
          from jsonb_to_recordset(p_campos) as c(grupo_id uuid, ids jsonb),
               lateral jsonb_array_elements_text(c.ids) with ordinality as i(id, ord)
      ) x
     where f.id = x.id::uuid and f.organization_id = p_org and f.objeto = p_objeto;
  end if;
end;
$$;

revoke all on function public.fn_escale_reordenar_campos(uuid, text, uuid[], jsonb) from public, anon;
grant execute on function public.fn_escale_reordenar_campos(uuid, text, uuid[], jsonb) to authenticated, service_role;

-- ── 2. O desfecho de um lote de linhas da importação ─────────────────────────
-- p_desfechos: [{"id", "status", "motivo", "detalhe", "com_aviso", "contato_id",
-- "negocio_id", "mensagem"}, ...]. Só mexe em linha desta importação (como o UPDATE por id
-- de antes, o desfecho real vale mesmo que o cancelamento ou a varredura de "interrompida"
-- tenha mexido na linha no meio do lote); contato_id e negocio_id ausentes não apagam o
-- que já está gravado.
-- Devolve quantas linhas gravou.
create or replace function public.fn_escale_gravar_desfechos_da_importacao(
  p_importacao uuid,
  p_desfechos jsonb
)
returns integer
language plpgsql
volatile
security invoker
set search_path = public, pg_temp
as $$
declare
  v_gravadas integer;
begin
  if p_desfechos is null or jsonb_typeof(p_desfechos) <> 'array' then
    raise exception 'desfechos_invalidos' using errcode = '22023';
  end if;

  update public.crm_importacoes_linhas l
     set status     = d.status,
         motivo     = d.motivo,
         detalhe    = coalesce(d.detalhe, l.detalhe),
         com_aviso  = coalesce(d.com_aviso, false),
         contato_id = coalesce(d.contato_id, l.contato_id),
         negocio_id = coalesce(d.negocio_id, l.negocio_id),
         mensagem   = d.mensagem,
         updated_at = now()
    from jsonb_to_recordset(p_desfechos) as d(
      id uuid, status text, motivo text, detalhe jsonb, com_aviso boolean,
      contato_id uuid, negocio_id uuid, mensagem text
    )
   where l.id = d.id
     and l.importacao_id = p_importacao;

  get diagnostics v_gravadas = row_count;
  return v_gravadas;
end;
$$;

revoke all on function public.fn_escale_gravar_desfechos_da_importacao(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.fn_escale_gravar_desfechos_da_importacao(uuid, jsonb) to service_role;

notify pgrst, 'reload schema';
