import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const sessoes = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({ useChannelSessions: () => sessoes }));

import { codigoDoErro, useContasSociais } from "@/hooks/escale/useComentarios";
import { ApiError } from "@/lib/api/types";

/** Fase 10B: as contas do Instagram e do Facebook que o gatilho de comentário oferece. */
const sessao = (id: string, extra: Record<string, unknown>) => ({
  id,
  provider: "zernio_social",
  display_name: id,
  phone_number: null,
  status: "WORKING",
  metadata: { social_platform: "instagram" },
  ...extra,
});

describe("useContasSociais", () => {
  it("só zernio_social de Instagram/Facebook; marca a desconectada", () => {
    sessoes.data = [
      sessao("ig", {}),
      sessao("fb", { metadata: { social_platform: "facebook" } }),
      sessao("tt", { metadata: { social_platform: "tiktok" } }),
      sessao("wa", { provider: "waha" }),
      sessao("ig-off", { status: "FAILED" }),
    ];
    const { result } = renderHook(() => useContasSociais());
    expect(result.current.contas).toEqual([
      { id: "ig", nome: "ig", plataforma: "instagram", conectada: true },
      { id: "fb", nome: "fb", plataforma: "facebook", conectada: true },
      { id: "ig-off", nome: "ig-off", plataforma: "instagram", conectada: false },
    ]);
  });
});

describe("codigoDoErro", () => {
  it("lê o código da API e cai em erro_ao_carregar", () => {
    expect(codigoDoErro(new ApiError(409, "conta_desconectada", undefined, "r"))).toBe("conta_desconectada");
    expect(codigoDoErro(new Error("x"))).toBe("erro_ao_carregar");
  });
});
