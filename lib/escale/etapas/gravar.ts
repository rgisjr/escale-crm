/**
 * GRAVAR AS ETAPAS E O PLAYBOOK DE UMA VEZ (fork Escale, Fase 1L): o "Salvar na
 * origem" da aba Etapas e atividades. Não reescreve regra nenhuma: chama as operações
 * de `lib/leads/stage-operations.ts` (as mesmas do agente de IA e da tela de funis).
 *
 * ORDEM (importa): criar → renomear/descrever → reordenar → salvar o playbook →
 * arquivar. O playbook novo vale ANTES de os negócios movidos entrarem na etapa de
 * destino (o gatilho da 1I cria as atividades pelo playbook em vigor), e as
 * atividades das etapas que saem ficam guardadas (a etapa só é arquivada depois).
 *
 * Sem transação única (as operações atuais não têm): se uma falhar, o que já foi
 * gravado fica, a rota devolve a frase da recusa e a tela relê. Duas coisas são
 * conferidas ANTES de gravar qualquer coisa: a tela viu o funil inteiro, e toda
 * etapa excluída que tem negócios veio com a decisão sobre eles.
 */
import { z } from "zod";

import { ApiError } from "@/lib/api/types";
import { audit } from "@/lib/audit";
import {
  ehProvisoria,
  MAX_DESCRICAO_DA_ETAPA,
  MAX_NOME_DA_ETAPA,
} from "@/lib/escale/etapas/rascunho";
import { MAX_ATIVIDADES_DO_PLAYBOOK, modeloSchema } from "@/lib/escale/playbook/regras";
import {
  arquivarEtapa,
  atualizarEtapa,
  autorDoAudit,
  corpo,
  criarEtapa,
  funilOuNadaFeito,
  lerFunil,
  type DepsDeEtapa,
  type EtapaVisivel,
} from "@/lib/leads/stage-operations";

const uuid = z.string().uuid();
const idDeEtapa = z.string().refine((id) => uuid.safeParse(id).success || ehProvisoria(id), {
  message: "Etapa inválida.",
});

const decisaoSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("mover"), destino_id: idDeEtapa }).strict(),
  z.object({ acao: z.literal("excluir") }).strict(),
]);

export const pedidoDeEtapasSchema = z
  .object({
    etapas: z
      .array(
        z
          .object({
            id: idDeEtapa,
            nome: z.string().trim().min(1).max(MAX_NOME_DA_ETAPA),
            descricao: z.string().trim().max(MAX_DESCRICAO_DA_ETAPA).nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    excluidas: z
      .array(z.object({ id: uuid, negocios: decisaoSchema.optional() }).strict())
      .max(100),
    atividades: z
      .array(modeloSchema.extend({ stage_id: idDeEtapa }))
      .max(MAX_ATIVIDADES_DO_PLAYBOOK),
  })
  .strict();

export type PedidoDeEtapas = z.infer<typeof pedidoDeEtapasSchema>;

export interface EtapasGravadas {
  funil: { etapas: EtapaVisivel[] };
  /** Id provisório → id real, das etapas criadas agora. */
  ids: Record<string, string>;
}

const recusa = (
  deps: DepsDeEtapa,
  status: number,
  code: string,
  texto: string,
  detalhes?: Record<string, unknown>,
) => new ApiError(status, code, detalhes, deps.requestId, texto);

export async function gravarEtapasEAtividades(
  deps: DepsDeEtapa,
  input: { pipelineId: string; pedido: PedidoDeEtapas },
): Promise<EtapasGravadas> {
  const { pipelineId, pedido } = input;
  const funil = await funilOuNadaFeito(deps, pipelineId);
  const abertas = funil.filter((e) => !e.is_archived && !e.is_won && !e.is_lost);
  const idsAbertas = new Set(abertas.map((e) => e.id));

  // 1. A tela viu o funil inteiro? (outra aba pode ter criado, arquivado ou fechado etapa)
  const mantidasSalvas = pedido.etapas.filter((e) => !ehProvisoria(e.id)).map((e) => e.id);
  const daTela = [...mantidasSalvas, ...pedido.excluidas.map((e) => e.id)];
  const completo =
    new Set(daTela).size === daTela.length &&
    daTela.length === idsAbertas.size &&
    daTela.every((id) => idsAbertas.has(id));
  if (!completo) {
    throw recusa(
      deps,
      409,
      "state_conflict",
      "As etapas desta origem mudaram enquanto você editava. Feche a janela e abra de novo.",
    );
  }

  // 2. Negócios das etapas excluídas: a decisão é pedida antes de gravar qualquer coisa.
  const pendentes: Array<{ id: string; nome: string; negocios: number }> = [];
  for (const ex of pedido.excluidas) {
    const { count, error } = await deps.supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", deps.organizationId)
      .eq("stage_id", ex.id);
    if (error) throw recusa(deps, 500, "internal_error", error.message);
    const negocios = count ?? 0;
    if (negocios > 0 && !ex.negocios) {
      pendentes.push({
        id: ex.id,
        nome: abertas.find((e) => e.id === ex.id)?.name ?? "",
        negocios,
      });
    }
    if (ex.negocios?.acao === "mover") {
      const d = ex.negocios.destino_id;
      const serve = ehProvisoria(d)
        ? pedido.etapas.some((e) => e.id === d)
        : mantidasSalvas.includes(d);
      if (!serve) {
        throw recusa(
          deps,
          422,
          "unprocessable_entity",
          "A etapa escolhida para receber os negócios não está mais no funil.",
        );
      }
    }
  }
  if (pendentes.length > 0) {
    throw recusa(
      deps,
      422,
      "unprocessable_entity",
      "Escolha o que fazer com os negócios das etapas que você está excluindo.",
      { precisa_destino: pendentes },
    );
  }

  // 3. Criar as novas (nascem no fim do funil) e guardar o id real.
  const ids: Record<string, string> = {};
  for (const e of pedido.etapas.filter((x) => ehProvisoria(x.id))) {
    const criada = await criarEtapa(deps, {
      pipelineId,
      nome: e.nome,
      ...(e.descricao ? { description: e.descricao } : {}),
    });
    ids[e.id] = criada.stageId;
  }
  const real = (id: string) => ids[id] ?? id;

  // 4. Renomear e descrever só quem mudou.
  for (const e of pedido.etapas.filter((x) => !ehProvisoria(x.id))) {
    const atual = abertas.find((a) => a.id === e.id)!;
    const novoNome = e.nome !== atual.name;
    const novaDescricao = (e.descricao ?? null) !== (atual.description ?? null);
    if (!novoNome && !novaDescricao) continue;
    await atualizarEtapa(deps, {
      pipelineId,
      stageId: e.id,
      pedido: {
        ...(novoNome ? { name: e.nome } : {}),
        ...(novaDescricao ? { description: e.descricao } : {}),
      },
    });
  }

  // 5. Reordenar. A etapa nova SEMPRE ganha `depois_de` (nasce depois de ganho e perda);
  // as demais só quando a ordem entre as mantidas não bate.
  const desejada = pedido.etapas.map((e) => real(e.id));
  const novas = new Set(Object.values(ids));
  const mantidas = new Set(desejada);
  let atual = [...funil.filter((e) => !e.is_archived).map((e) => e.id), ...Object.values(ids)];
  for (let i = 0; i < desejada.length; i++) {
    const id = desejada[i]!;
    const entreMantidas = atual.filter((x) => mantidas.has(x));
    if (entreMantidas[i] === id && !novas.has(id)) continue;
    const antes = i === 0 ? null : desejada[i - 1]!;
    await atualizarEtapa(deps, { pipelineId, stageId: id, pedido: { depois_de: antes } });
    atual = atual.filter((x) => x !== id);
    atual.splice(antes === null ? 0 : atual.indexOf(antes) + 1, 0, id);
  }

  // 6. O playbook, com os ids reais.
  const { error: erroDoPlaybook } = await deps.supabase.rpc("fn_escale_salvar_playbook", {
    p_org: deps.organizationId,
    p_pipeline: pipelineId,
    p_atividades: pedido.atividades.map((a) => ({ ...a, stage_id: real(a.stage_id) })),
  });
  if (erroDoPlaybook) {
    if (erroDoPlaybook.code === "22023") {
      throw recusa(
        deps,
        422,
        "unprocessable_entity",
        "Uma atividade está numa etapa que não é desta origem.",
      );
    }
    if (erroDoPlaybook.code === "42501") throw recusa(deps, 403, "forbidden", "Sem permissão.");
    throw recusa(deps, 500, "internal_error", erroDoPlaybook.message);
  }
  const autor = autorDoAudit(deps.actor);
  void audit({
    action: "pipeline.config_updated",
    actorUserId: autor.actorUserId,
    organizationId: deps.organizationId,
    resourceType: "pipeline",
    resourceId: pipelineId,
    requestId: deps.requestId,
    metadata: {
      ...autor.metadata,
      secoes: ["etapas", "playbook"],
      atividades: pedido.atividades.length,
      via: "escale",
    },
  });

  // 7. Excluir (arquivar), movendo ou apagando os negócios.
  for (const ex of pedido.excluidas) {
    if (ex.negocios?.acao === "excluir") await apagarNegociosDaEtapa(deps, ex.id);
    await arquivarEtapa(deps, {
      pipelineId,
      stageId: ex.id,
      destinoId: ex.negocios?.acao === "mover" ? real(ex.negocios.destino_id) : null,
    });
  }

  const depois = await lerFunil(deps.supabase, deps.organizationId, pipelineId);
  return { funil: corpo(depois ?? []), ids };
}

/** Apaga de verdade os negócios da etapa, como `POST /api/v1/leads/bulk` (ação `delete`). */
async function apagarNegociosDaEtapa(deps: DepsDeEtapa, stageId: string): Promise<void> {
  const { data, error } = await deps.supabase
    .from("crm_leads")
    .delete()
    .eq("organization_id", deps.organizationId)
    .eq("stage_id", stageId)
    .select("id");
  if (error) {
    throw recusa(
      deps,
      500,
      "internal_error",
      "Não consegui excluir os negócios da etapa. Tente de novo.",
      { erro: error.message },
    );
  }
  const apagados = (data ?? []).map((l) => (l as { id: string }).id);
  if (apagados.length === 0) return;
  const autor = autorDoAudit(deps.actor);
  const { error: erroDoEvento } = await deps.supabase.rpc("emit_event", {
    p_event_type: "lead.bulk_deleted",
    p_entity_kind: "crm_lead",
    p_entity_id: null,
    p_payload: { action: "delete", lead_ids: apagados, params: {}, motivo: "etapa_excluida" },
    p_metadata: { request_id: deps.requestId, actor_user_id: autor.actorUserId },
    p_organization_id: deps.organizationId,
  });
  if (erroDoEvento) console.error("[lead.bulk_deleted] emit_event falhou", erroDoEvento.message);
  void audit({
    action: "lead.bulk_action",
    actorUserId: autor.actorUserId,
    organizationId: deps.organizationId,
    resourceType: "crm_stage",
    resourceId: stageId,
    requestId: deps.requestId,
    metadata: { ...autor.metadata, negocios: apagados.length, via: "escale_etapa_excluida" },
  });
}
