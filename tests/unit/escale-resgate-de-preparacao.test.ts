import { describe, expect, it, vi } from "vitest";

import {
  CODIGO_DA_PREPARACAO_INTERROMPIDA,
  PRAZO_DA_PREPARACAO_MS,
  resgatarPreparacoesParadas,
} from "@/lib/campanhas/resgate";

/** Supabase de mentira da tabela `campaigns`: anota o update, os filtros e devolve as linhas dadas. */
function banco(linhas: Array<{ id: string }>, erro: { message: string } | null = null) {
  const filtros: Array<[string, string, unknown]> = [];
  let valores: Record<string, unknown> | null = null;
  const q: Record<string, unknown> = {};
  q.update = vi.fn((v: Record<string, unknown>) => {
    valores = v;
    return q;
  });
  q.eq = vi.fn((c: string, v: unknown) => (filtros.push(["eq", c, v]), q));
  q.lt = vi.fn((c: string, v: unknown) => (filtros.push(["lt", c, v]), q));
  q.select = vi.fn(async () => ({ data: erro ? null : linhas, error: erro }));
  const from = vi.fn(() => q);
  return { admin: { from } as never, filtros, valores: () => valores, from };
}

describe("resgatarPreparacoesParadas (B8-1)", () => {
  const agora = new Date("2026-10-24T12:00:00.000Z");

  it("devolve a rascunho só as que estão em preparing há mais que o prazo e conta quantas", async () => {
    const b = banco([{ id: "c1" }, { id: "c2" }]);
    const n = await resgatarPreparacoesParadas(b.admin, agora);
    expect(n).toBe(2);
    expect(b.from).toHaveBeenCalledWith("campaigns");
    expect(b.valores()).toEqual({
      status: "draft",
      failure_code: CODIGO_DA_PREPARACAO_INTERROMPIDA,
    });
    expect(b.filtros).toContainEqual(["eq", "status", "preparing"]);
    expect(b.filtros).toContainEqual([
      "lt",
      "updated_at",
      new Date(agora.getTime() - PRAZO_DA_PREPARACAO_MS).toISOString(),
    ]);
  });

  it("sem nenhuma parada, devolve 0", async () => {
    expect(await resgatarPreparacoesParadas(banco([]).admin, agora)).toBe(0);
  });

  it("erro do banco lança, para quem chama decidir", async () => {
    await expect(
      resgatarPreparacoesParadas(banco([], { message: "caiu" }).admin, agora),
    ).rejects.toThrow("caiu");
  });
});
