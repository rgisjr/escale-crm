import { describe, expect, it } from "vitest";

import { empresaDoContato } from "@/lib/escale/empresas/banco";

describe("empresaDoContato (B3-11)", () => {
  it("erro do banco sobe em vez de virar 'sem empresa'", async () => {
    const c: Record<string, unknown> = {};
    for (const m of ["select", "eq"]) c[m] = () => c;
    c.maybeSingle = async () => ({ data: null, error: { message: "timeout" } });
    const sb = { from: () => c };
    await expect(empresaDoContato(sb as never, "o", "c")).rejects.toMatchObject({ message: "timeout" });
  });
});
