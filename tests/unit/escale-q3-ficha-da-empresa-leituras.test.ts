import { describe, expect, it } from "vitest";

import { lerFichaDaEmpresa, negociosDaEmpresa } from "@/lib/escale/empresas/banco";

/** Q3 (G3-3): a ficha lê vínculos, contatos e negócios uma vez; a aba Negócios não recalcula contatos. */
const ORG = "aaaaaaaa-0000-4000-8000-0000000000aa";

function bancoFalso() {
  const leituras: string[] = [];
  const dados: Record<string, unknown> = {
    organizations: { currency: "BRL" },
    companies: { id: "e1", trade_name: "Atlas", legal_name: null, cnpj: null, city: null, state: null, custom_fields: {}, created_at: "2026-10-01T00:00:00Z" },
  };
  const listas: Record<string, unknown[]> = {
    company_people: [{ person_id: "p1", is_primary: true, created_at: "x" }],
    contacts: [{ id: "c1", name: "Alex", display_name: null, phone_number: "+55", email: null, tags: [], avatar_path: null, person_id: "p1" }],
    crm_leads: [
      { id: "l1", contact_id: "c1", status: "open", value_cents: 10000, currency: "BRL", title: "A", crm_pipelines: { name: "Leads" }, crm_stages: { name: "E" } },
      { id: "l2", contact_id: "c1", status: "won", value_cents: 50000, currency: "BRL", title: "B", crm_pipelines: { name: "Leads" }, crm_stages: { name: "E" } },
    ],
    conversations: [{ id: "v1", contact_id: "c1", last_message_at: "x" }],
  };
  const sb = {
    from: (tabela: string) => ({
      select: () => {
        leituras.push(tabela);
        const cadeia: Record<string, unknown> = {};
        for (const m of ["eq", "in", "is", "order", "limit"]) cadeia[m] = () => cadeia;
        cadeia.maybeSingle = async () => ({ data: dados[tabela] ?? null, error: null });
        cadeia.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: listas[tabela] ?? [], error: null }).then(ok);
        return cadeia;
      },
    }),
  };
  return { sb: sb as never, leituras };
}

describe("ficha da empresa (G3-3)", () => {
  it("lê crm_leads uma vez e soma só os abertos", async () => {
    const { sb, leituras } = bancoFalso();
    const ficha = await lerFichaDaEmpresa(sb, ORG, "e1");
    expect(leituras.filter((t) => t === "crm_leads")).toHaveLength(1);
    expect(leituras.filter((t) => t === "company_people")).toHaveLength(1);
    expect(ficha.valor_aberto).toBe(100);
    expect(ficha.negocios).toBe(2);
    expect(ficha.contatos).toBe(1);
  });

  it("a aba Negócios não busca conversas nem recalcula a contagem de negócios dos contatos", async () => {
    const { sb, leituras } = bancoFalso();
    const negocios = await negociosDaEmpresa(sb, ORG, "e1");
    expect(leituras).not.toContain("conversations");
    expect(leituras.filter((t) => t === "crm_leads")).toHaveLength(1);
    expect(negocios.map((n) => n.contato)).toEqual(["Alex", "Alex"]);
  });
});
