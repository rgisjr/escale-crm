/**
 * A escrita dos fluxos de follow-up, extraída das rotas REST para que a rota e a
 * ferramenta MCP chamem a MESMA função. Cada função recebe o `admin`/`db` e a
 * organização de fonte confiável; `mensagem` sai em português (a rota traduz).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { falhaDeEscrita, type ResultadoDeEscrita } from "@/lib/api/resultado-de-escrita";
import { audit } from "@/lib/audit";
import type { FollowupFlowSurface } from "@/lib/followup/api-schemas";
import { carregaEtapasCitadas } from "@/lib/followup/etapas-citadas";
import type { FlowGraph } from "@/lib/followup/graph-schema";
import { publishFollowupFlowVersion } from "@/lib/followup/publish";
import {
  algumCanalExigeModeloForaDaJanela,
  proximosDoGrafo,
  validateFlowForPublish,
  type RoteiroDoPublish,
} from "@/lib/followup/validate-publish";
import { moduloLigado } from "@/lib/instalacao/modulos";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Colunas que a leitura de detalhe e o PATCH devolvem. */
export const COLUNAS_DO_FLUXO =
  "id, name, status, active_version_id, draft_graph, handoff_policy, trigger_config, surface, created_at, updated_at";

export type FluxoGravado = Record<string, unknown> & { id: string };

/** Quem agiu: a pessoa da sessão, ou o token (sem usuário humano). */
export interface AutorDaEscrita {
  userId: string | null;
  apiTokenId?: string | null;
}

export async function criarFluxo(
  db: SupabaseClient,
  entrada: {
    organizationId: string;
    nome: string;
    surface?: FollowupFlowSurface;
    autor: AutorDaEscrita;
    requestId: string;
  },
): Promise<ResultadoDeEscrita<FluxoGravado>> {
  // Roteiro de atendimento é módulo opcional da instalação (doc 64): desligado, a porta não existe.
  if (entrada.surface === "atendimento" && !(await moduloLigado(createAdminClient(), "fluxos_atendimento"))) {
    return falhaDeEscrita("not_found", "Fluxo não encontrado.", 404);
  }
  const { data: criado, error } = await db
    .from("followup_flow_pointers")
    .insert({
      organization_id: entrada.organizationId,
      name: entrada.nome,
      ...(entrada.surface !== undefined ? { surface: entrada.surface } : {}),
    })
    .select("*")
    .single();
  if (error || !criado) {
    if (error?.code === "23505") return falhaDeEscrita("conflict", "Já existe um fluxo com este nome.", 409);
    return falhaDeEscrita("internal_error", error?.message ?? "followup_flow_insert_failed", 500);
  }
  void audit({
    action: "followup_flow.created",
    actorUserId: entrada.autor.userId,
    actorApiTokenId: entrada.autor.apiTokenId ?? null,
    organizationId: entrada.organizationId,
    resourceType: "followup_flow_pointer",
    resourceId: (criado as FluxoGravado).id,
    requestId: entrada.requestId,
    metadata: { name: entrada.nome },
  });
  return { ok: true, dado: criado as FluxoGravado };
}

/** Grava campos do fluxo (nome, rascunho do grafo, gatilho, passagem a humano). NUNCA publica. */
export async function salvarFluxo(
  db: SupabaseClient,
  entrada: {
    organizationId: string;
    pointerId: string;
    alteracoes: Record<string, unknown>;
    autor: AutorDaEscrita;
    requestId: string;
  },
): Promise<ResultadoDeEscrita<FluxoGravado>> {
  const { organizationId, pointerId, alteracoes } = entrada;
  const { data: existente, error: erroDeLeitura } = await db
    .from("followup_flow_pointers")
    .select("id")
    .eq("id", pointerId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (erroDeLeitura) return falhaDeEscrita("internal_error", erroDeLeitura.message, 500);
  if (!existente) return falhaDeEscrita("not_found", "Fluxo não encontrado.", 404);

  if (Object.keys(alteracoes).length === 0) {
    const { data: igual, error: erroDeRecarga } = await db
      .from("followup_flow_pointers")
      .select(COLUNAS_DO_FLUXO)
      .eq("id", pointerId)
      .eq("organization_id", organizationId)
      .single();
    if (erroDeRecarga || !igual) {
      return falhaDeEscrita("internal_error", erroDeRecarga?.message ?? "reload_failed", 500);
    }
    return { ok: true, dado: igual as unknown as FluxoGravado };
  }

  const { data: atualizado, error } = await db
    .from("followup_flow_pointers")
    .update({ ...alteracoes, updated_at: new Date().toISOString() })
    .eq("id", pointerId)
    .eq("organization_id", organizationId)
    .select(COLUNAS_DO_FLUXO)
    .single();
  if (error || !atualizado) {
    if (error?.code === "23505") return falhaDeEscrita("conflict", "Já existe um fluxo com este nome.", 409);
    // O banco recusa gatilho de relógio em roteiro de atendimento (0394).
    if (error?.code === "23514") {
      return falhaDeEscrita(
        "validation_failed",
        "Roteiro de atendimento começa por palavra-gatilho ou pelo roteador, não por gatilho de follow-up.",
        422,
      );
    }
    return falhaDeEscrita("internal_error", error?.message ?? "followup_flow_update_failed", 500);
  }
  void audit({
    action: "followup_flow.updated",
    actorUserId: entrada.autor.userId,
    actorApiTokenId: entrada.autor.apiTokenId ?? null,
    organizationId,
    resourceType: "followup_flow_pointer",
    resourceId: pointerId,
    requestId: entrada.requestId,
    metadata: { fields_changed: Object.keys(alteracoes) },
  });
  return { ok: true, dado: atualizado as unknown as FluxoGravado };
}

// Kind entra neste conjunto só DEPOIS de ter motor de enrollment vivo. É allowlist (não denylist):
// `trigger_config` é jsonb sem CHECK e o publish lê a linha crua, sem passar pelo Zod do PATCH.
const KINDS_COM_MOTOR = new Set([
  "manual",
  "webhook",
  "silence",
  "stage_change",
  "case_opened",
  "appointment_no_show",
  "inbound_after_silence",
  "lead_created",
]);

type Gatilho = { kind?: string; params?: { stage_id?: string } };

async function conferirGatilhoDaEtapa(
  admin: SupabaseClient,
  organizationId: string,
  gatilho: Gatilho,
): Promise<ResultadoDeEscrita<null>> {
  const stageId = gatilho.params?.stage_id;
  if (!stageId || !UUID_RX.test(stageId)) {
    return falhaDeEscrita(
      "trigger_stage_missing",
      "Escolha a etapa do funil que dispara este fluxo antes de publicar.",
      422,
    );
  }
  const { data: etapa, error } = await admin
    .from("crm_stages")
    .select("id, name, is_archived")
    .eq("id", stageId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) return falhaDeEscrita("internal_error", error.message, 500);
  if (!etapa) {
    return falhaDeEscrita(
      "trigger_stage_not_found",
      "A etapa escolhida para o gatilho não existe mais neste funil — escolha outra.",
      422,
    );
  }
  if (etapa.is_archived) {
    return falhaDeEscrita(
      "trigger_stage_archived",
      `A etapa «${etapa.name}» está arquivada e nunca receberia um negócio — escolha uma etapa ativa.`,
      422,
    );
  }
  return { ok: true, dado: null };
}

/** Para onde os OUTROS roteiros ativos encadeiam, para recusar a publicação que fecharia um ciclo. */
async function roteiroDoPublish(
  admin: SupabaseClient,
  organizationId: string,
  pointerId: string,
): Promise<ResultadoDeEscrita<RoteiroDoPublish>> {
  const { data: ativos, error } = await admin
    .from("followup_flow_pointers")
    .select("id, name, active_version_id")
    .eq("organization_id", organizationId)
    .eq("surface", "atendimento")
    .eq("status", "active")
    .neq("id", pointerId);
  if (error) return falhaDeEscrita("internal_error", error.message, 500);
  const versoes = (ativos ?? []).flatMap((r) => (r.active_version_id ? [r.active_version_id as string] : []));
  const grafos = new Map<string, unknown>();
  if (versoes.length > 0) {
    const { data: vs, error: erroDeVersoes } = await admin
      .from("followup_flow_versions")
      .select("id, graph")
      .eq("organization_id", organizationId)
      .in("id", versoes);
    if (erroDeVersoes) return falhaDeEscrita("internal_error", erroDeVersoes.message, 500);
    for (const v of vs ?? []) grafos.set(v.id as string, v.graph);
  }
  return {
    ok: true,
    dado: {
      pointerId,
      encadeamentos: new Map(
        (ativos ?? []).map((r) => [
          r.id as string,
          { nome: r.name as string, proximos: proximosDoGrafo(grafos.get(r.active_version_id as string)) },
        ]),
      ),
    },
  };
}

/**
 * Valida o rascunho e publica atomicamente. `admin` é service role (a função do banco só aceita
 * service_role) e `organizationId` vem de fonte confiável. `aprovadoPor` entra no audit quando a
 * publicação vem do MCP: publicar é ato humano, o nome de quem aprovou fica gravado.
 */
export async function publicarFluxo(
  admin: SupabaseClient,
  entrada: {
    organizationId: string;
    pointerId: string;
    autor: AutorDaEscrita;
    aprovadoPor?: string;
    requestId: string;
  },
): Promise<ResultadoDeEscrita<{ versionId: string; pointer: Record<string, unknown> }>> {
  const { organizationId, pointerId } = entrada;
  const { data: pointer, error: erroDeLeitura } = await admin
    .from("followup_flow_pointers")
    .select("id, draft_graph, trigger_config, surface")
    .eq("id", pointerId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (erroDeLeitura) return falhaDeEscrita("internal_error", erroDeLeitura.message, 500);
  if (!pointer) return falhaDeEscrita("not_found", "Fluxo não encontrado.", 404);

  // Roteiro de atendimento: só com o módulo ligado, e só começa por palavra-gatilho ou roteador.
  const surface = (pointer.surface ?? "followup") as FollowupFlowSurface;
  if (surface === "atendimento") {
    if (!(await moduloLigado(admin, "fluxos_atendimento"))) {
      return falhaDeEscrita("not_found", "Fluxo não encontrado.", 404);
    }
    const kind = (pointer.trigger_config as { kind?: string } | null)?.kind ?? "manual";
    if (kind !== "manual") {
      return falhaDeEscrita(
        "trigger_kind_not_implemented",
        "Roteiro de atendimento começa por palavra-gatilho ou pelo roteador, não por gatilho de follow-up.",
        422,
      );
    }
  }

  const gatilho = (pointer.trigger_config ?? { kind: "manual" }) as Gatilho;
  const triggerKind = gatilho.kind ?? "manual";
  if (!KINDS_COM_MOTOR.has(triggerKind)) {
    return falhaDeEscrita(
      "trigger_kind_not_implemented",
      `O gatilho «${triggerKind}» não está disponível — use Etapa do funil, Silêncio ou Manual.`,
      422,
    );
  }
  if (triggerKind === "stage_change") {
    const etapa = await conferirGatilhoDaEtapa(admin, organizationId, gatilho);
    if (!etapa.ok) return etapa;
  }

  if (!pointer.draft_graph) {
    return falhaDeEscrita("validation_failed", "Fluxo não tem rascunho pronto para publicar.", 422, {
      errors: [
        {
          node_id: null,
          code: "no_trigger",
          message: "draft_graph ausente — monte o fluxo antes de publicar.",
        },
      ],
    });
  }

  const graph = pointer.draft_graph as unknown as FlowGraph;
  const citadas = await carregaEtapasCitadas(admin, organizationId, graph.nodes);
  if (!citadas.ok) return falhaDeEscrita("internal_error", citadas.mensagem, 500);
  let roteiro: RoteiroDoPublish | undefined;
  if (surface === "atendimento") {
    const r = await roteiroDoPublish(admin, organizationId, pointerId);
    if (!r.ok) return r;
    roteiro = r.dado;
  }
  const { data: conexoes, error: erroDeConexoes } = await admin
    .from("channel_sessions")
    .select("provider")
    .eq("organization_id", organizationId)
    .is("archived_at", null);
  if (erroDeConexoes) return falhaDeEscrita("internal_error", erroDeConexoes.message, 500);
  const validacao = validateFlowForPublish(graph, {
    etapas: citadas.etapas,
    surface,
    roteiro,
    exigeModeloForaDaJanela: algumCanalExigeModeloForaDaJanela(
      (conexoes ?? []).map((c) => c.provider as string | null),
    ),
  });
  if (!validacao.ok) {
    return falhaDeEscrita("validation_failed", "Fluxo reprovado na validação de publish.", 422, {
      errors: validacao.errors,
    });
  }

  const publicado = await publishFollowupFlowVersion(admin, {
    orgId: organizationId,
    pointerId,
    graph,
    createdBy: entrada.autor.userId,
  });
  if (!publicado.ok) {
    if (publicado.code === "pointer_not_found") return falhaDeEscrita("not_found", "Fluxo não encontrado.", 404);
    return falhaDeEscrita("internal_error", publicado.message, 500);
  }

  const { data: atual, error: erroDeRecarga } = await admin
    .from("followup_flow_pointers")
    .select("id, status, active_version_id, updated_at")
    .eq("id", pointerId)
    .eq("organization_id", organizationId)
    .single();
  if (erroDeRecarga || !atual) {
    return falhaDeEscrita("internal_error", erroDeRecarga?.message ?? "followup_flow_reload_failed", 500);
  }

  void audit({
    action: "followup_flow.published",
    actorUserId: entrada.autor.userId,
    organizationId,
    resourceType: "followup_flow_pointer",
    resourceId: pointerId,
    requestId: entrada.requestId,
    metadata: { version_id: publicado.version_id },
  });
  if (entrada.aprovadoPor !== undefined) {
    void audit({
      action: "followup_flow.published_by_mcp",
      actorUserId: entrada.autor.userId,
      actorApiTokenId: entrada.autor.apiTokenId ?? null,
      organizationId,
      resourceType: "followup_flow_pointer",
      resourceId: pointerId,
      requestId: entrada.requestId,
      metadata: { version_id: publicado.version_id, aprovado_por: entrada.aprovadoPor },
    });
  }
  return { ok: true, dado: { versionId: publicado.version_id, pointer: atual as Record<string, unknown> } };
}
