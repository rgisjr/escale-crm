// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pedido = vi.hoisted(() => vi.fn());
vi.mock("@/lib/channels/social/client", async (original) => ({
  ...((await original()) as object),
  socialRequest: pedido,
}));
vi.mock("@/lib/channels/social/store", async (original) => ({
  ...((await original()) as object),
  readSocialIntegration: vi.fn(async () => ({ profileId: "perfil-1", key: "chave" })),
}));

import { SocialError } from "@/lib/channels/social/client";
import { garantirAssinaturaDeComentarios } from "@/lib/escale/comentarios/assinatura";

/** Fase 10B (D14): garantir que a assinatura do canal recebe `comment.received`. */
const TOKEN = "t".repeat(48);
const URL_DO_CANAL = `https://app.exemplo/api/v1/webhooks/channel/${TOKEN}`;

function banco(token: string | null = TOKEN): SupabaseClient {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is"]) q[m] = () => q;
  q.maybeSingle = async () => ({ data: token ? { webhook_path_token: token } : null, error: null });
  return { from: () => q } as unknown as SupabaseClient;
}
const lista = (events?: string[]) => ({ webhooks: [{ _id: "wh-1", url: URL_DO_CANAL, ...(events ? { events } : {}) }] });

beforeEach(() => pedido.mockReset());

describe("garantirAssinaturaDeComentarios", () => {
  it("já tem o evento → ja_assinada, sem PUT", async () => {
    pedido.mockResolvedValue(lista(["message.received", "comment.received"]));
    expect(await garantirAssinaturaDeComentarios(banco(), "org-1", "canal-1")).toBe("ja_assinada");
    expect(pedido).toHaveBeenCalledTimes(1);
  });

  it("não tem → PUT com os 6 eventos e releitura → assinada", async () => {
    pedido
      .mockResolvedValueOnce(lista(["message.received", "message.sent"]))
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(lista(["message.received", "comment.received"]));
    expect(await garantirAssinaturaDeComentarios(banco(), "org-1", "canal-1")).toBe("assinada");
    const put = pedido.mock.calls[1] as unknown as [string, string, { webhookId: string; events: string[] }, string];
    expect(put[3]).toBe("PUT");
    expect(put[2].webhookId).toBe("wh-1");
    expect([...put[2].events].sort()).toEqual(
      ["comment.received", "message.delivered", "message.failed", "message.read", "message.received", "message.sent"],
    );
  });

  it("releitura sem o evento → 502", async () => {
    pedido.mockResolvedValueOnce(lista(["message.received"])).mockResolvedValueOnce({}).mockResolvedValueOnce(lista(["message.received"]));
    await expect(garantirAssinaturaDeComentarios(banco(), "org-1", "canal-1")).rejects.toMatchObject({
      status: 502,
      message: "O provedor não confirmou a assinatura de comentários.",
    });
  });

  it("sem assinatura para o canal → 422", async () => {
    pedido.mockResolvedValue({ webhooks: [] });
    await expect(garantirAssinaturaDeComentarios(banco(), "org-1", "canal-1")).rejects.toBeInstanceOf(SocialError);
    await expect(garantirAssinaturaDeComentarios(banco(), "org-1", "canal-1")).rejects.toMatchObject({ status: 422 });
  });

  it("canal desconhecido → 404", async () => {
    await expect(garantirAssinaturaDeComentarios(banco(null), "org-1", "canal-1")).rejects.toMatchObject({ status: 404 });
  });
});
