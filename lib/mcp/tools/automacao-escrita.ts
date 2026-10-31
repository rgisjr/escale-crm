/**
 * Criar e alterar regras automáticas por MCP.
 *
 * Chamam as MESMAS funções de escrita das rotas REST (`lib/automation/regras-escrita.ts`):
 * validação, cifra dos segredos, trava de laço e auditoria não são reescritas aqui.
 * A regra nasce DESLIGADA e a ferramenta de edição recusa `is_active`: ligar é ato de
 * quem aprova, pela ferramenta própria (`crm_set_automation_rule_active`).
 */
import { z } from "zod";

import { atualizarRegra, criarRegra } from "@/lib/automation/regras-escrita";
import { createAutomationRuleSchema, updateAutomationRuleSchema } from "@/lib/schemas/webhooks";

import type { McpToolDefinition } from "../types";

/** Segredos de `call_webhook` vivem em `actions`: o log da chamada não leva as ações. */
function semAcoesNoLog(args: Record<string, unknown>): Record<string, unknown> {
  const copia: Record<string, unknown> = { ...args };
  for (const chave of ["regra", "alteracoes"]) {
    const valor = copia[chave];
    if (valor && typeof valor === "object" && "actions" in valor) {
      copia[chave] = { ...(valor as Record<string, unknown>), actions: "[omitido do log]" };
    }
  }
  return copia;
}

const criarShape = { regra: createAutomationRuleSchema };

export const crmCreateAutomationRule: McpToolDefinition<typeof criarShape> = {
  name: "crm_create_automation_rule",
  description:
    "Cria uma regra automática, SEMPRE DESLIGADA (is_active=false). Confira com crm_list_automation_rules e ligue " +
    "com crm_set_automation_rule_active depois de um humano aprovar: ligada, ela envia mensagem a clientes sozinha. " +
    "Em send_whatsapp_message use channel_session_id='conversation' para o número da própria conversa, e " +
    "{{canal.<variavel>}} / {{atendente.nome}} no texto para dados que mudam de número para número.",
  inputSchema: criarShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  redigirParaAuditoria: semAcoesNoLog,
  handler: async (input, ctx) => {
    const r = await criarRegra(ctx.supabase, {
      organizationId: ctx.organizationId,
      criadoPorUserId: ctx.actor.type === "user" ? ctx.actor.id : null,
      requestId: ctx.requestId,
      dados: input.regra,
    });
    if (!r.ok) throw new Error(`${r.codigo}: ${r.mensagem}`);
    return { id: r.dado.id, ativa: false };
  },
};

const atualizarShape = {
  rule_id: z.string().uuid(),
  alteracoes: updateAutomationRuleSchema,
};

export const crmUpdateAutomationRule: McpToolDefinition<typeof atualizarShape> = {
  name: "crm_update_automation_rule",
  description:
    "Altera nome, gatilho, condições ou ações de uma regra automática. NÃO liga nem desliga a regra (use " +
    "crm_set_automation_rule_active). Se a regra já está ligada, a alteração vale na hora: prefira desligar antes, " +
    "alterar e pedir a um humano para religar.",
  inputSchema: atualizarShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  redigirParaAuditoria: semAcoesNoLog,
  handler: async (input, ctx) => {
    if (input.alteracoes.is_active !== undefined) {
      throw new Error("is_active não é alterado por aqui: use crm_set_automation_rule_active.");
    }
    const r = await atualizarRegra(ctx.supabase, {
      organizationId: ctx.organizationId,
      regraId: input.rule_id,
      requestId: ctx.requestId,
      actor: ctx.actor,
      patch: input.alteracoes,
    });
    if (!r.ok) throw new Error(`${r.codigo}: ${r.mensagem}`);
    return { id: r.dado.id, ativa: r.dado.is_active === true };
  },
};
