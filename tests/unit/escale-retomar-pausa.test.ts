import { beforeEach, describe, expect, it, vi } from "vitest";

import { retomarEnrollmentsDaPausa } from "@/lib/escale/conversas/retomar-pausa";
import { retomaEnrollment } from "@/lib/followup/intervencao";

vi.mock("@/lib/followup/intervencao", () => ({ retomaEnrollment: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const falha = (codigo: string) => ({ ok: false, codigo, mensagem: "x" }) as never;
const deps = {} as never;
const ctx = { origem: "teste", conversationId: "c1" };

beforeEach(() => vi.mocked(retomaEnrollment).mockReset());

describe("retomarEnrollmentsDaPausa (B1-7 / B6-3)", () => {
  it("devolve só os que falharam de verdade, para a pausa não ser apagada", async () => {
    vi.mocked(retomaEnrollment)
      .mockResolvedValueOnce({ ok: true } as never)
      .mockResolvedValueOnce(falha("erro_interno"))
      .mockResolvedValueOnce(falha("motor_ocupado"));
    expect(await retomarEnrollmentsDaPausa(deps, ["a", "b", "c"], ctx)).toEqual(["b", "c"]);
  });

  it("trata follow-up inexistente ou que já voltou a andar como resolvido", async () => {
    vi.mocked(retomaEnrollment)
      .mockResolvedValueOnce(falha("nao_encontrado"))
      .mockResolvedValueOnce(falha("estado_incompativel"));
    expect(await retomarEnrollmentsDaPausa(deps, ["a", "b"], ctx)).toEqual([]);
  });
});
