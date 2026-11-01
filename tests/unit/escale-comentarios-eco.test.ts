// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { SocialMessage } from "@/lib/channels/social/parser";
import { ecoDaMensagemDaAutomacao } from "@/lib/escale/comentarios/eco";

/** Fase 10B (D13): o eco `message.sent` do direct da automação não vira outra linha. */
const eco = (extra: Partial<SocialMessage> = {}): SocialMessage =>
  ({
    platform: "instagram",
    participantId: "u-1",
    accountId: "acc-1",
    conversationId: "thread-1",
    externalId: "social:acc-1:zm-9",
    direction: "outbound",
    kind: "message",
    status: "sent",
    text: "Oi, aqui o link!",
    sentAt: null,
    attachments: [],
    referral: null,
    identity: { phone: null, bsuid: null, anchor: null, username: null, displayName: null },
    ...extra,
  }) as SocialMessage;

type Linha = Record<string, unknown>;
function banco(opcoes: { contato?: Linha | null; mensagens?: Linha[] }) {
  const atualizacoes: Array<{ tabela: string; valores: Linha }> = [];
  const admin = {
    from: (tabela: string) => {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "is", "gte", "order", "limit"]) q[m] = () => q;
      q.maybeSingle = async () => ({ data: opcoes.contato === undefined ? { id: "c-1" } : opcoes.contato, error: null });
      q.then = (ok: (r: unknown) => unknown) => Promise.resolve({ data: opcoes.mensagens ?? [], error: null }).then(ok);
      q.update = (valores: Linha) => {
        atualizacoes.push({ tabela, valores });
        const u: Record<string, unknown> = {};
        u.eq = () => u;
        u.then = (ok: (r: unknown) => unknown) => Promise.resolve({ error: null }).then(ok);
        return u;
      };
      return q;
    },
  } as unknown as SupabaseClient;
  return { admin, atualizacoes };
}
const ENTRADA = { organizationId: "org-1", channelSessionId: "canal-1" };
const mensagem = (extra: Linha = {}): Linha => ({
  id: "m-1", conversation_id: "conv-1", external_id: null, body: "Oi, aqui o link!", metadata: { origem: "comentario" }, ...extra,
});

describe("ecoDaMensagemDaAutomacao", () => {
  it("mesmo external_id → true e grava o provider_conversation_id", async () => {
    const { admin, atualizacoes } = banco({ mensagens: [mensagem({ external_id: "social:acc-1:zm-9" })] });
    expect(await ecoDaMensagemDaAutomacao(admin, { ...ENTRADA, msg: eco() })).toBe(true);
    expect(atualizacoes.find((a) => a.tabela === "conversations")?.valores).toEqual({ provider_conversation_id: "thread-1" });
    expect(atualizacoes.find((a) => a.tabela === "messages")?.valores).toMatchObject({ metadata: { origem: "comentario", eco: true } });
  });

  it("id diferente, mesmo texto → true e troca o external_id", async () => {
    const { admin, atualizacoes } = banco({ mensagens: [mensagem({ external_id: "social:acc-1:outro" })] });
    // external_id difere e o texto casa: só casa pelo texto se a linha ainda não tem id próprio igual
    expect(await ecoDaMensagemDaAutomacao(admin, { ...ENTRADA, msg: eco() })).toBe(true);
    expect(atualizacoes.find((a) => a.tabela === "messages")?.valores).toMatchObject({ external_id: "social:acc-1:zm-9" });
  });

  it("sem linha na janela (texto de 20 min atrás já fora da consulta) → false", async () => {
    const { admin } = banco({ mensagens: [] });
    expect(await ecoDaMensagemDaAutomacao(admin, { ...ENTRADA, msg: eco() })).toBe(false);
  });

  it("texto diferente → false", async () => {
    const { admin } = banco({ mensagens: [mensagem({ body: "outra coisa" })] });
    expect(await ecoDaMensagemDaAutomacao(admin, { ...ENTRADA, msg: eco() })).toBe(false);
  });

  it("mensagem de entrada ou de status → false, sem tocar o banco", async () => {
    const admin = { from: vi.fn() } as unknown as SupabaseClient;
    expect(await ecoDaMensagemDaAutomacao(admin, { ...ENTRADA, msg: eco({ direction: "inbound" }) })).toBe(false);
    expect(await ecoDaMensagemDaAutomacao(admin, { ...ENTRADA, msg: eco({ kind: "status" }) })).toBe(false);
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("contato não achado → false", async () => {
    const { admin } = banco({ contato: null });
    expect(await ecoDaMensagemDaAutomacao(admin, { ...ENTRADA, msg: eco() })).toBe(false);
  });
});
