// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { criarRegra, atualizarRegra } = vi.hoisted(() => ({ criarRegra: vi.fn(), atualizarRegra: vi.fn() }));
vi.mock("@/lib/automation/regras-escrita", () => ({ criarRegra, atualizarRegra }));

import { crmCreateAutomationRule, crmUpdateAutomationRule } from "@/lib/mcp/tools/automacao-escrita";
import type { McpContext } from "@/lib/mcp/types";

const ORG = "11111111-1111-4111-8111-111111111111";
const REGRA = "22222222-2222-4222-8222-222222222222";
const ctx = {
  organizationId: ORG,
  requestId: "req",
  actor: { type: "user", id: "u1", role: "manager" },
  supabase: {},
} as unknown as McpContext;

const regraValida = {
  name: "Mudar tag",
  trigger_event: "lead.created",
  trigger_config: {},
  conditions: [],
  actions: [{ type: "send_whatsapp_message", config: { channel_session_id: "conversation", template: "{{canal.pix_chave}}" } }],
};

beforeEach(() => {
  criarRegra.mockReset();
  atualizarRegra.mockReset();
});

describe("crm_create_automation_rule", () => {
  it("é de escrita, exige manager e aceita o canal da conversa", () => {
    expect(crmCreateAutomationRule).toMatchObject({ category: "write", requiresRole: "manager", requiresScope: "mcp:write" });
    expect(z.object(crmCreateAutomationRule.inputSchema).safeParse({ regra: regraValida }).success).toBe(true);
  });

  it("usa a organização do contexto e devolve a regra desligada", async () => {
    criarRegra.mockResolvedValue({ ok: true, dado: { id: REGRA } });
    const r = await crmCreateAutomationRule.handler({ regra: regraValida } as never, ctx);
    expect(r).toEqual({ id: REGRA, ativa: false });
    expect(criarRegra).toHaveBeenCalledWith(ctx.supabase, expect.objectContaining({ organizationId: ORG, criadoPorUserId: "u1" }));
  });

  it("falha da escrita vira erro da ferramenta", async () => {
    criarRegra.mockResolvedValue({ ok: false, codigo: "invalid_request", mensagem: "ruim", status: 422 });
    await expect(crmCreateAutomationRule.handler({ regra: regraValida } as never, ctx)).rejects.toThrow("invalid_request: ruim");
  });

  it("o log da chamada não leva as ações (segredo de webhook)", () => {
    const args = crmCreateAutomationRule.redigirParaAuditoria!({ regra: { name: "x", actions: [{ secret: "s" }] } });
    expect(JSON.stringify(args)).not.toContain('"secret"');
    expect(args).toMatchObject({ regra: { name: "x" } });
  });
});

describe("crm_update_automation_rule", () => {
  it("recusa is_active", async () => {
    await expect(
      crmUpdateAutomationRule.handler({ rule_id: REGRA, alteracoes: { is_active: true } } as never, ctx),
    ).rejects.toThrow("is_active");
    expect(atualizarRegra).not.toHaveBeenCalled();
  });

  it("atualiza com a organização e o ator do contexto", async () => {
    atualizarRegra.mockResolvedValue({ ok: true, dado: { id: REGRA, is_active: false } });
    const r = await crmUpdateAutomationRule.handler({ rule_id: REGRA, alteracoes: { name: "novo" } } as never, ctx);
    expect(r).toEqual({ id: REGRA, ativa: false });
    expect(atualizarRegra).toHaveBeenCalledWith(
      ctx.supabase,
      expect.objectContaining({ organizationId: ORG, regraId: REGRA, actor: ctx.actor }),
    );
  });
});
