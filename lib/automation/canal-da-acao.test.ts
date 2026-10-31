// @vitest-environment node
import { describe, expect, it } from "vitest";

import { CANAL_DA_CONVERSA, canalDoContexto, resolverCanalDaAcao } from "@/lib/automation/canal-da-acao";
import type { ActionCtx } from "@/lib/automation/types";

const ctxCom = (payload: Record<string, unknown>, contatoId?: string): ActionCtx =>
  ({
    organizationId: "org",
    event: { payload },
    context: contatoId ? { contact: { id: contatoId } } : {},
    admin: {
      from: () => {
        const q: Record<string, unknown> = {};
        for (const m of ["select", "eq", "order", "limit"]) q[m] = () => q;
        q.maybeSingle = async () => ({ data: { channel_session_id: "canal-da-conversa" }, error: null });
        return q;
      },
    },
  }) as unknown as ActionCtx;

describe("canalDoContexto", () => {
  it("lê o canal do payload", () => expect(canalDoContexto({ channel_session_id: "c1" })).toBe("c1"));
  it("null sem canal", () => expect(canalDoContexto({})).toBeNull());
});

describe("resolverCanalDaAcao", () => {
  it("uuid fixo passa direto", async () => {
    expect(await resolverCanalDaAcao(ctxCom({}), "fixo")).toBe("fixo");
  });
  it('"conversation" usa o canal do evento', async () => {
    expect(await resolverCanalDaAcao(ctxCom({ channel_session_id: "c1" }), CANAL_DA_CONVERSA)).toBe("c1");
  });
  it('"conversation" sem canal no evento cai na conversa mais recente do contato', async () => {
    expect(await resolverCanalDaAcao(ctxCom({}, "contato-1"), CANAL_DA_CONVERSA)).toBe("canal-da-conversa");
  });
  it('"conversation" sem nada devolve null', async () => {
    expect(await resolverCanalDaAcao(ctxCom({}), CANAL_DA_CONVERSA)).toBeNull();
  });
  it("valor vazio ou não-texto devolve null", async () => {
    expect(await resolverCanalDaAcao(ctxCom({}), "")).toBeNull();
    expect(await resolverCanalDaAcao(ctxCom({}), undefined)).toBeNull();
  });
});

describe("schema das ações com canal da conversa", () => {
  it("send_whatsapp_message aceita 'conversation' e o uuid antigo; recusa texto solto", async () => {
    const { createAutomationRuleSchema } = await import("@/lib/schemas/webhooks");
    const regra = (canal: string) => ({
      name: "r",
      trigger_event: "lead.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "send_whatsapp_message", config: { channel_session_id: canal, template: "oi" } }],
    });
    expect(createAutomationRuleSchema.safeParse(regra("conversation")).success).toBe(true);
    expect(createAutomationRuleSchema.safeParse(regra("11111111-1111-4111-8111-111111111111")).success).toBe(true);
    expect(createAutomationRuleSchema.safeParse(regra("qualquer")).success).toBe(false);
  });
  it("assign_owner aceita responsavel_do_canal", async () => {
    const { createAutomationRuleSchema } = await import("@/lib/schemas/webhooks");
    const r = createAutomationRuleSchema.safeParse({
      name: "r",
      trigger_event: "lead.created",
      trigger_config: {},
      conditions: [],
      actions: [{ type: "assign_owner", config: { modo: "responsavel_do_canal" } }],
    });
    expect(r.success).toBe(true);
  });
});
