// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMessageHandler, copiar } = vi.hoisted(() => ({ sendMessageHandler: vi.fn(), copiar: vi.fn() }));
vi.mock("@/app/api/v1/messages/_handler", () => ({ sendMessageHandler }));
vi.mock("@/lib/midia/ativos-banco", () => ({ copiarAtivoParaConversa: copiar }));

import { enviadorPeloHandler } from "@/lib/automation/passos-pelo-handler";

const ORG = "11111111-1111-4111-8111-111111111111";
const CONV = "22222222-2222-4222-8222-222222222222";
const admin = {} as SupabaseClient;
const contexto = { organization_id: ORG } as never;

function montar(ordem: string[] = []) {
  return enviadorPeloHandler(admin, {
    organizationId: ORG,
    conversationId: CONV,
    contexto,
    espacar: async () => {
      ordem.push("espacar");
    },
  });
}

beforeEach(() => {
  sendMessageHandler.mockReset().mockResolvedValue({ id: "m1", status: "sent" });
  copiar.mockReset().mockResolvedValue({ storagePath: `${ORG}/${CONV}/auto-x.ogg`, mime: "audio/ogg", tipo: "audio" });
});

describe("enviadorPeloHandler", () => {
  it("texto: espaça e chama o handler com a chave de idempotência", async () => {
    const ordem: string[] = [];
    sendMessageHandler.mockImplementation(async () => {
      ordem.push("envio");
      return { id: "m1", status: "sent" };
    });
    await montar(ordem).texto("oi", "k:0");
    expect(ordem).toEqual(["espacar", "envio"]);
    expect(sendMessageHandler).toHaveBeenCalledWith(admin, contexto, {
      conversation_id: CONV,
      type: "text",
      body: "oi",
      metadata: { idempotency_key: "k:0" },
    });
  });
  it("mídia: copia o ativo para a conversa e envia sem body quando não há legenda", async () => {
    await montar().midia({ assetId: "a1" }, "k:1");
    expect(copiar).toHaveBeenCalledWith(admin, { organizationId: ORG, assetId: "a1", conversationId: CONV });
    expect(sendMessageHandler).toHaveBeenCalledWith(admin, contexto, {
      conversation_id: CONV,
      type: "audio",
      media_storage_path: `${ORG}/${CONV}/auto-x.ogg`,
      media_mime: "audio/ogg",
      metadata: { idempotency_key: "k:1" },
    });
  });
  it("mensagem devolvida como failed vira erro", async () => {
    sendMessageHandler.mockResolvedValue({ id: "m1", status: "failed", error_code: "meta_131026" });
    await expect(montar().texto("oi", "k:0")).rejects.toThrow("envio_falhou:meta_131026");
  });
  it("interativo: texto numerado de reserva e a lista em metadata", async () => {
    const lista = {
      tipo: "lista" as const,
      corpo: "Qual aparelho?",
      botaoDaLista: "Escolher",
      linhas: [{ id: "a", titulo: "TV" }],
    };
    await montar().interativo(lista, "k:2");
    expect(sendMessageHandler).toHaveBeenCalledWith(admin, contexto, {
      conversation_id: CONV,
      type: "text",
      body: "Qual aparelho?\n\n1 - TV",
      metadata: { idempotency_key: "k:2", interativo: lista },
    });
  });
});
