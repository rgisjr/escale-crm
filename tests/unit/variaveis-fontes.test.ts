import { describe, expect, it, vi } from "vitest";

import { carregarFontes, oQuePrecisa } from "@/lib/variaveis/fontes";
import { resolverTexto, tokensUsados } from "@/lib/variaveis/resolver";

/**
 * FORK ESCALE · Frente V (Task 5): as fontes no servidor buscam só o que o
 * texto pede, sempre filtrando a organização.
 */
type Linha = Record<string, unknown>;

const ORG = "org-1";
const TABELAS: Record<string, Linha[]> = {
  contacts: [
    {
      id: "c-1",
      organization_id: ORG,
      name: "Ana Paula Souza",
      display_name: null,
      email: "ana@x.com",
      phone_number: "+5543999990000",
      custom_fields: { cpf: "123", nascimento: "1990-03-05" },
      person_id: "p-1",
    },
  ],
  company_people: [
    { organization_id: ORG, person_id: "p-1", company_id: "e-2", job_title: "Compras", is_primary: false },
  ],
  companies: [
    {
      id: "e-2",
      organization_id: ORG,
      trade_name: "Toda",
      legal_name: "Toda Ltda",
      city: "Londrina",
      state: "PR",
      custom_fields: {},
    },
  ],
  crm_leads: [
    {
      id: "l-1",
      organization_id: ORG,
      created_at: "2026-10-05T15:00:00Z",
      status: "open",
      stage_id: "s-1",
      value_cents: 150000,
      currency: "BRL",
      custom_fields: { plano: "ouro" },
    },
  ],
  crm_stages: [{ id: "s-1", organization_id: ORG, name: "Entrada" }],
  calendar_appointments: [
    { organization_id: ORG, contact_id: "c-1", meeting_url: "https://meet/x", starts_at: "2026-10-06T13:00:00Z", status: "confirmed" },
  ],
  // As colunas reais de `organizations` (baseline): não há `name`.
  organizations: [{ id: ORG, display_name: "Escale IA", legal_name: "Escale IA Ltda", timezone: "America/Sao_Paulo" }],
  user_organizations: [{ organization_id: ORG, user_id: "u-1", revoked_at: null }],
  crm_campos_do_negocio: [
    {
      id: "f-1",
      organization_id: ORG,
      chave: "plano",
      definicao: { label: "Plano", type: "select", options: [{ value: "ouro", label: "Ouro" }] },
      posicao: 0,
    },
  ],
  crm_campos_do_crm: [],
  crm_grupos_de_campos: [],
};

function bancoFalso(tabelas: Record<string, Linha[]> = TABELAS) {
  const consultas: Array<{ tabela: string; filtros: Array<[string, string, unknown]> }> = [];
  const from = vi.fn((tabela: string) => {
    const filtros: Array<[string, string, unknown]> = [];
    consultas.push({ tabela, filtros });
    const linhas = () =>
      (tabelas[tabela] ?? []).filter((l) =>
        filtros.every(([op, col, val]) =>
          op === "eq" ? l[col] === val || !(col in l) : op === "neq" ? l[col] !== val : op === "is" ? l[col] === val : true,
        ),
      );
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "order", "limit"]) cadeia[m] = vi.fn(() => cadeia);
    for (const m of ["eq", "neq", "is"])
      cadeia[m] = vi.fn((col: string, val: unknown) => {
        filtros.push([m, col, val]);
        return cadeia;
      });
    cadeia.maybeSingle = vi.fn(async () => ({ data: linhas()[0] ?? null, error: null }));
    cadeia.then = (ok: (r: unknown) => unknown) => Promise.resolve({ data: linhas(), error: null }).then(ok);
    return cadeia;
  });
  const getUserById = vi.fn(async (id: string) => ({
    data: { user: id === "u-1" ? { email: "regis@x.com", user_metadata: { full_name: "Régis Marques" } } : null },
    error: null,
  }));
  return { cliente: { from, auth: { admin: { getUserById } } } as never, consultas, getUserById };
}

const ALVO = { contactId: "c-1", leadId: "l-1", usuarioId: "u-1" };

describe("oQuePrecisa", () => {
  it("só o que os tokens pedem", () => {
    const p = oQuePrecisa(["CONTACT.FIRST_NAME"]);
    expect(p).toMatchObject({ contato: true, vinculo: false, empresa: false, negocio: false, usuario: false, conta: false });
    expect(oQuePrecisa(["ORGANIZATION.NAME"])).toMatchObject({ contato: true, vinculo: true, empresa: true });
    expect(oQuePrecisa(["DEAL.STAGE"])).toMatchObject({ negocio: true, etapa: true });
    expect([...oQuePrecisa(["DEAL.PLANO"]).personalizados]).toEqual(["negocio"]);
    expect(oQuePrecisa(["USER.ORGANIZATION.NAME"])).toMatchObject({ conta: true, usuario: false });
  });
});

describe("carregarFontes", () => {
  it("só o contato, quando o texto só usa o contato", async () => {
    const b = bancoFalso();
    const f = await carregarFontes(b.cliente, b.cliente, ORG, ALVO, ["CONTACT.FIRST_NAME"]);
    expect(b.consultas.map((c) => c.tabela)).toEqual(["contacts"]);
    expect(b.getUserById).not.toHaveBeenCalled();
    expect(resolverTexto("Oi [CONTACT.FIRST_NAME]", f, { vazio: "vazio" }).texto).toBe("Oi Ana");
  });

  it("toda consulta filtra a organização", async () => {
    const b = bancoFalso();
    const texto =
      "[DEAL.STAGE] [DEAL.VALUE] [DEAL.PLANO] [CONTACT.ROLE] [ORGANIZATION.NAME] [USER.FIRST_NAME] [USER.ORGANIZATION.NAME] [DEAL.LATEST_MEETING_DATETIME]";
    await carregarFontes(b.cliente, b.cliente, ORG, ALVO, tokensUsados(texto));
    for (const c of b.consultas) {
      const filtraOrg = c.filtros.some(
        ([op, col, val]) => op === "eq" && (col === "organization_id" || (c.tabela === "organizations" && col === "id")) && val === ORG,
      );
      expect(filtraOrg, c.tabela).toBe(true);
    }
  });

  it("tudo resolvido, em BR, com empresa e cargo do vínculo e usuário do Auth", async () => {
    const b = bancoFalso();
    const texto =
      "[DEAL.DATE]|[DEAL.STATUS]|[DEAL.STAGE]|[DEAL.VALUE]|[DEAL.PLANO]|[CONTACT.ROLE]|[ORGANIZATION.NAME]|[ORGANIZATION.CITY]|[USER.FIRST_NAME]|[USER.EMAIL]|[USER.ORGANIZATION.NAME]|[DEAL.LATEST_MEETING_LINK]|[DEAL.LATEST_MEETING_DATETIME]";
    const f = await carregarFontes(b.cliente, b.cliente, ORG, ALVO, tokensUsados(texto));
    expect(resolverTexto(texto, f, { vazio: "vazio" }).texto).toBe(
      "05/10/2026|Aberto|Entrada|R$ 1.500,00|Ouro|Compras|Toda|Londrina|Régis|regis@x.com|Escale IA|https://meet/x|06/10/2026 às 10:00",
    );
  });

  it("usuário que não é membro da organização não devolve nada", async () => {
    const b = bancoFalso();
    const f = await carregarFontes(b.cliente, b.cliente, ORG, { ...ALVO, usuarioId: "u-9" }, ["USER.FIRST_NAME"]);
    expect(b.getUserById).not.toHaveBeenCalled();
    expect(f.usuario).toEqual({ nome: null, email: null });
  });

  it("sem negócio, as variáveis do negócio ficam vazias", async () => {
    const b = bancoFalso();
    const f = await carregarFontes(b.cliente, b.cliente, ORG, { contactId: "c-1" }, ["DEAL.STAGE"]);
    expect(resolverTexto("[DEAL.STAGE]!", f, { vazio: "vazio" }).texto).toBe("!");
  });

  it("agendamento cancelado não conta", async () => {
    const b = bancoFalso({
      ...TABELAS,
      calendar_appointments: [{ ...TABELAS.calendar_appointments![0]!, status: "cancelled" }],
    });
    const f = await carregarFontes(b.cliente, b.cliente, ORG, ALVO, ["DEAL.LATEST_MEETING_LINK"]);
    expect(f.ultimoAgendamento).toBeNull();
  });
});

describe("fontesDaConversa", () => {
  it("conversa que a sessão não enxerga: null", async () => {
    const { fontesDaConversa } = await import("@/lib/variaveis/fontes-da-conversa");
    const b = bancoFalso({ ...TABELAS, conversations: [] });
    expect(await fontesDaConversa(b.cliente, b.cliente, ORG, "cv-1", "u-1", ["CONTACT.NAME"])).toBeNull();
  });

  it("o contato da conversa e o negócio aberto dele; o usuário é quem envia", async () => {
    const { fontesDaConversa } = await import("@/lib/variaveis/fontes-da-conversa");
    const b = bancoFalso({
      ...TABELAS,
      conversations: [{ id: "cv-1", organization_id: ORG, contact_id: "c-1" }],
      crm_leads: [{ ...TABELAS.crm_leads![0]!, contact_id: "c-1" }],
    });
    const f = await fontesDaConversa(b.cliente, b.cliente, ORG, "cv-1", "u-1", [
      "CONTACT.FIRST_NAME",
      "DEAL.STAGE",
      "USER.FIRST_NAME",
    ]);
    expect(resolverTexto("[CONTACT.FIRST_NAME]|[DEAL.STAGE]|[USER.FIRST_NAME]", f, { vazio: "vazio" }).texto).toBe(
      "Ana|Entrada|Régis",
    );
  });
});
