import { describe, expect, it, vi } from "vitest";

import { emLotes, lerEmLotes } from "@/lib/escale/conversas/lotes";

describe("leituras da fila em lotes", () => {
  it("100 ids da segunda página viram 2 chamadas de 50, nenhuma acima do limite das rotas", async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `id-${i}`);
    expect(emLotes(ids).map((l) => l.length)).toEqual([50, 50]);
    const ler = vi.fn(async (lote: string[]) => Object.fromEntries(lote.map((id) => [id, 1])));
    const tudo = await lerEmLotes(ids, ler);
    expect(ler).toHaveBeenCalledTimes(2);
    expect(Object.keys(tudo)).toHaveLength(100);
  });
  it("lista vazia não chama nada", async () => {
    const ler = vi.fn();
    expect(await lerEmLotes([], ler)).toEqual({});
    expect(ler).not.toHaveBeenCalled();
  });
});
