// @vitest-environment node
/**
 * Fixa em teste que o que JÁ existe cobre o Datacrazy, para ninguém quebrar isso depois e para quem
 * migra um cliente não reescrever o que existe: espera de resposta com tempo-limite (30/35/60 min) e
 * o aviso ao atendente quando o lead clica no botão (tag -> tarefa para o dono do negócio).
 */
import { describe, expect, it } from "vitest";

import { matchReplyConfigSchema } from "@/lib/followup/graph-schema";
import { createAutomationRuleSchema } from "@/lib/schemas/webhooks";

const MIN = 60_000;

describe("esperar resposta com tempo-limite (Datacrazy: 30/35/60 min)", () => {
  it.each([30, 35, 60])("match_reply aceita grace_timeout de %i min", (min) => {
    const r = matchReplyConfigSchema.safeParse({
      branches: [{ id: "plano", label: "Plano", op: "contains", pattern: "mes" }],
      grace_timeout_ms: min * MIN,
    });
    expect(r.success, JSON.stringify(r.success ? "" : r.error.issues)).toBe(true);
  });
});

describe("avisar o atendente quando o lead clica no botão", () => {
  it("regra lead.tag_added -> create_task para o dono do negócio é válida", () => {
    const r = createAutomationRuleSchema.safeParse({
      name: "Lead clicou botão",
      trigger_event: "lead.tag_added",
      trigger_config: {},
      conditions: [{ field: "event.added_tags", op: "contains", value: "Clicou Botao" }],
      actions: [
        {
          type: "create_task",
          config: { titulo: "Lead clicou: {{contact.name}}", vence_em_dias: 0, atribuir_a: "dono_do_lead", prioridade: "high" },
        },
      ],
    });
    expect(r.success, JSON.stringify(r.success ? "" : r.error.issues)).toBe(true);
  });
});

describe("uma automação, N canais", () => {
  it("a regra de fechamento usa o canal da conversa, o responsável do canal e a remoção de tag", () => {
    const r = createAutomationRuleSchema.safeParse({
      name: "Mudar tag",
      trigger_event: "message.sent",
      trigger_config: { palavra_chave: "Põe estes dados", modo: "contem" },
      conditions: [],
      actions: [
        { type: "remove_tag", config: { tags: ["Aguardando"] } },
        { type: "add_tag", config: { tags: ["Em teste"] } },
        { type: "send_whatsapp_message", config: { channel_session_id: "conversation", template: "PIX {{canal.pix_chave}}" } },
      ],
    });
    expect(r.success, JSON.stringify(r.success ? "" : r.error.issues)).toBe(true);
  });
  it("mensagem enviada sem palavra-chave é recusada", () => {
    const r = createAutomationRuleSchema.safeParse({
      name: "x",
      trigger_event: "message.sent",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "add_tag", config: { tags: ["a"] } }],
    });
    expect(r.success).toBe(false);
  });
});
