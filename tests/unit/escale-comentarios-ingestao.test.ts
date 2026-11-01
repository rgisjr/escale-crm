// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

const eco = vi.hoisted(() => vi.fn());
const pausar = vi.hoisted(() => vi.fn());
vi.mock("@/lib/escale/comentarios/eco", () => ({ ecoDaMensagemDaAutomacao: eco }));
vi.mock("@/lib/escalacao/atendimento-manual", () => ({ pausarIaPorAtendimentoManual: pausar }));

import type { SocialMessage } from "@/lib/channels/social/parser";
import { ingestZernioInbound } from "@/lib/channels/zernio/ingest";

/** Fase 10B (D13): o eco do direct da automação não vira linha nem pausa a IA. */
const mensagem = {
  platform: "instagram",
  participantId: "u-1",
  accountId: "acc-1",
  conversationId: "thread-1",
  externalId: "social:acc-1:zm-9",
  direction: "outbound",
  kind: "message",
  status: "sent",
  text: "Oi!",
  sentAt: null,
  attachments: [],
  referral: null,
  identity: { phone: null, bsuid: null, anchor: null, username: null, displayName: null },
} as SocialMessage;

describe("ingestZernioInbound com o eco da automação", () => {
  it("eco reconhecido → duplicate, sem tocar o banco e sem pausar a IA", async () => {
    eco.mockResolvedValue(true);
    const admin = { from: vi.fn(), rpc: vi.fn() } as unknown as SupabaseClient;
    const r = await ingestZernioInbound(admin, {
      organizationId: "org-1",
      channelSessionId: "canal-1",
      payload: {},
      socialMessage: mensagem,
    });
    expect(r).toEqual({ status: "duplicate", reason: "eco_da_automacao" });
    expect(admin.from).not.toHaveBeenCalled();
    expect(pausar).not.toHaveBeenCalled();
    expect(eco).toHaveBeenCalledWith(admin, { organizationId: "org-1", channelSessionId: "canal-1", msg: mensagem });
  });
});
