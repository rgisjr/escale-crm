import { describe, expect, it } from "vitest";

import { contatosJaEmCampanha } from "./consulta-de-audiencia";

const MAX_ROWS = 1_000;

/**
 * Supabase falso que corta cada leitura em `max_rows` (1.000), como o PostgREST,
 * e respeita `range`. Sem paginar, quem já está em outra campanha viva além da
 * linha 1.000 recebia a mensagem de novo.
 */
function adminComDestinatarios(total: number) {
  const linhas = Array.from({ length: total }, (_, i) => ({ contact_id: `ct-${i}` }));
  const campanhas = { data: [{ id: "c-viva" }], error: null };
  return {
    from: (tabela: string) => {
      if (tabela === "campaigns") {
        const q: Record<string, unknown> = {};
        for (const m of ["select", "eq", "in", "neq"]) q[m] = () => q;
        q.then = (ok: (v: unknown) => unknown) => Promise.resolve(campanhas).then(ok);
        return q;
      }
      let de = 0;
      let ate = MAX_ROWS - 1;
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "order"]) q[m] = () => q;
      q.range = (a: number, b: number) => ((de = a), (ate = Math.min(b, a + MAX_ROWS - 1)), q);
      q.then = (ok: (v: unknown) => unknown) =>
        Promise.resolve({ data: linhas.slice(de, ate + 1), error: null }).then(ok);
      return q;
    },
  } as never;
}

describe("contatosJaEmCampanha", () => {
  it("lê além das 1.000 linhas do PostgREST", async () => {
    const jaEm = await contatosJaEmCampanha(adminComDestinatarios(2500), "org-1");
    expect(jaEm.size).toBe(2500);
    expect(jaEm.has("ct-2499")).toBe(true);
  });
});
