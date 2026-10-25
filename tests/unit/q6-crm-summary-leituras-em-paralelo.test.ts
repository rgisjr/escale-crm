import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

/**
 * G6-4: o enriquecimento (admin client) deixou de ser esperado ANTES das outras
 * seis leituras. Prova: com o enriquecimento pendurado, as leituras do client
 * do usuário já foram disparadas; e o resultado continua o mesmo.
 */
const estado = vi.hoisted(() => ({
  liberarEnriquecimento: null as null | (() => void),
  tabelasDoUsuarioLidas: [] as string[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    from: (tabela: string) => {
      const q: Record<string, unknown> = {};
      for (const n of ["select", "eq", "order", "limit", "is", "not"]) q[n] = () => q;
      q.maybeSingle = async () => ({
        data: { organization_id: "org-a", is_anonymized: false },
        error: null,
      });
      q.then = (ok: (v: unknown) => unknown) => {
        if (tabela !== "contacts") estado.tabelasDoUsuarioLidas.push(tabela);
        return Promise.resolve({ data: [], error: null }).then(ok);
      };
      return q;
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tabela: string) => {
      const q: Record<string, unknown> = {};
      for (const n of ["select", "eq", "order", "limit"]) q[n] = () => q;
      if (tabela === "prospecting_candidates") {
        q.maybeSingle = () =>
          new Promise((ok) => {
            estado.liberarEnriquecimento = () => ok({ data: null, error: null });
          });
        return q;
      }
      q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(ok);
      return q;
    },
  }),
}));
vi.mock("@/lib/users/nome-do-atendente", () => ({ nomesDosAtendentes: async () => new Map() }));

import { GET } from "@/app/api/v1/contacts/[id]/crm-summary/route";

describe("crm-summary: enriquecimento em paralelo com as demais leituras", () => {
  it("as leituras do usuário começam sem esperar o enriquecimento", async () => {
    const resposta = GET(new NextRequest("http://x/api/v1/contacts/c1/crm-summary"), {
      params: Promise.resolve({ id: "c1" }),
    });
    await vi.waitFor(() => expect(estado.tabelasDoUsuarioLidas.length).toBeGreaterThanOrEqual(5));
    expect(estado.liberarEnriquecimento).not.toBeNull();
    estado.liberarEnriquecimento?.();
    expect((await resposta).status).toBe(200);
  });
});
