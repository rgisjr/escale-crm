import { describe, expect, it, vi } from "vitest";

import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { FUSO_PADRAO } from "@/lib/tempo/fusos";

/** G6-5: com o fuso já lido no ActiveOrg, a rota não consulta `organizations`. */
function banco(timezone: string | null) {
  const from = vi.fn(() => {
    const q: Record<string, unknown> = {};
    for (const n of ["select", "eq"]) q[n] = () => q;
    q.maybeSingle = async () => ({ data: { timezone }, error: null });
    return q;
  });
  return { db: { from } as never, from };
}

describe("fusoDaOrganizacao com o fuso já lido", () => {
  it("usa o fuso do ActiveOrg e não vai ao banco", async () => {
    const { db, from } = banco("America/Manaus");
    expect(await fusoDaOrganizacao(db, "org-1", "America/Bahia")).toBe("America/Bahia");
    expect(from).not.toHaveBeenCalled();
  });

  it("fuso lido inutilizável cai no padrão, sem consulta", async () => {
    const { db, from } = banco("America/Manaus");
    const r = await fusoDaOrganizacao(db, "org-1", "Sao Paulo (Brasília)");
    expect(r).toBe(FUSO_PADRAO);
    expect(from).not.toHaveBeenCalled();
  });

  it("vazio ou ausente consulta o banco como antes", async () => {
    const { db, from } = banco("America/Manaus");
    expect(await fusoDaOrganizacao(db, "org-1", null)).toBe("America/Manaus");
    expect(await fusoDaOrganizacao(db, "org-1")).toBe("America/Manaus");
    expect(from).toHaveBeenCalledTimes(2);
  });
});
