/**
 * Fluxos de follow-up por MCP: ler, criar, editar o rascunho e publicar.
 *
 * Escrevem pelas MESMAS funções das rotas REST (`lib/followup/escrita-de-fluxo.ts`).
 * Criar e editar mexem só no RASCUNHO. Publicar é ato humano: a ferramenta exige
 * `aprovado_por` (quem revisou) e o grava na auditoria.
 */
import { z } from "zod";

import { createFollowupFlowSchema, patchFollowupFlowSchema } from "@/lib/followup/api-schemas";
import {
  COLUNAS_DO_FLUXO,
  criarFluxo,
  publicarFluxo,
  salvarFluxo,
  type AutorDaEscrita,
} from "@/lib/followup/escrita-de-fluxo";
import { rascunhoDoFluxo } from "@/lib/followup/rascunho";

import type { McpContext, McpToolDefinition } from "../types";

const COLUNAS_DA_LISTA = "id, name, status, active_version_id, handoff_policy, surface, updated_at";

function autorDoContexto(ctx: McpContext): AutorDaEscrita {
  return { userId: ctx.actor.type === "user" ? ctx.actor.id : null, apiTokenId: ctx.apiTokenId };
}

function falhou(r: { codigo: string; mensagem: string; detalhes?: unknown }): Error {
  const detalhes = r.detalhes === undefined ? "" : ` ${JSON.stringify(r.detalhes)}`;
  return new Error(`${r.codigo}: ${r.mensagem}${detalhes}`);
}

const listarShape = {};

export const crmListFollowupFlows: McpToolDefinition<typeof listarShape> = {
  name: "crm_list_followup_flows",
  description:
    "Lista os fluxos de follow-up da organização: nome, se está publicado (status), a versão no ar e quando mudou. " +
    "Não devolve o desenho do fluxo: use crm_get_followup_flow para isso.",
  inputSchema: listarShape,
  category: "read",
  requiresRole: "agent",
  requiresScope: "mcp:read",
  handler: async (_input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("followup_flow_pointers")
      .select(COLUNAS_DA_LISTA)
      .eq("organization_id", ctx.organizationId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { fluxos: data ?? [] };
  },
};

const lerShape = { flow_id: z.string().uuid() };

export const crmGetFollowupFlow: McpToolDefinition<typeof lerShape> = {
  name: "crm_get_followup_flow",
  description:
    "Devolve um fluxo de follow-up inteiro: gatilho, política de passagem a humano e o desenho (rascunho). " +
    "Se não há rascunho mas há versão publicada, devolve a que está no ar.",
  inputSchema: lerShape,
  category: "read",
  requiresRole: "agent",
  requiresScope: "mcp:read",
  handler: async (input, ctx) => {
    const { data, error } = await ctx.supabase
      .from("followup_flow_pointers")
      .select(COLUNAS_DO_FLUXO)
      .eq("id", input.flow_id)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("not_found: Fluxo não encontrado.");
    const pointer = data as unknown as { draft_graph: unknown; active_version_id: string | null };
    const draft_graph = await rascunhoDoFluxo(ctx.supabase, pointer, ctx.organizationId);
    return { fluxo: { ...data, draft_graph } };
  },
};

export const crmCreateFollowupFlow: McpToolDefinition<typeof createFollowupFlowSchema.shape> = {
  name: "crm_create_followup_flow",
  description:
    "Cria um fluxo de follow-up VAZIO e em rascunho (não vale para nenhum cliente). Monte o desenho com " +
    "crm_update_followup_flow e peça a um humano para aprovar antes de crm_publish_followup_flow.",
  inputSchema: createFollowupFlowSchema.shape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  handler: async (input, ctx) => {
    const r = await criarFluxo(ctx.supabase, {
      organizationId: ctx.organizationId,
      nome: input.name,
      surface: input.surface,
      autor: autorDoContexto(ctx),
      requestId: ctx.requestId,
    });
    if (!r.ok) throw falhou(r);
    return { id: r.dado.id };
  },
};

const atualizarShape = { flow_id: z.string().uuid(), alteracoes: patchFollowupFlowSchema };

export const crmUpdateFollowupFlow: McpToolDefinition<typeof atualizarShape> = {
  name: "crm_update_followup_flow",
  description:
    "Grava no RASCUNHO do fluxo: nome, desenho (draft_graph), gatilho (trigger_config) ou passagem a humano " +
    "(handoff_policy). Nunca publica: a versão que está no ar só muda com crm_publish_followup_flow.",
  inputSchema: atualizarShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  handler: async (input, ctx) => {
    const r = await salvarFluxo(ctx.supabase, {
      organizationId: ctx.organizationId,
      pointerId: input.flow_id,
      alteracoes: input.alteracoes,
      autor: autorDoContexto(ctx),
      requestId: ctx.requestId,
    });
    if (!r.ok) throw falhou(r);
    return { id: r.dado.id, status: r.dado.status };
  },
};

const publicarShape = {
  flow_id: z.string().uuid(),
  aprovado_por: z.string().trim().min(3).max(80),
};

export const crmPublishFollowupFlow: McpToolDefinition<typeof publicarShape> = {
  name: "crm_publish_followup_flow",
  description:
    "Publica um fluxo de follow-up (a versão publicada passa a valer para clientes de verdade). Exige aprovado_por: " +
    "o nome da pessoa que revisou e aprovou o rascunho. O motivo é regra do produto: publicar é ato humano.",
  inputSchema: publicarShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  handler: async (input, ctx) => {
    const r = await publicarFluxo(ctx.supabase, {
      organizationId: ctx.organizationId,
      pointerId: input.flow_id,
      autor: autorDoContexto(ctx),
      aprovadoPor: input.aprovado_por,
      requestId: ctx.requestId,
    });
    if (!r.ok) throw falhou(r);
    return { versao: r.dado.versionId };
  },
};
