import { describe, expect, it } from "vitest";

import { celula, csvDoQuadro, nomeDoArquivo } from "@/lib/escale/exportar/csv-do-quadro";
import type { Stage } from "@/lib/kanban/types";
import type { CustomFieldDef } from "@/lib/schemas/settings";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

const t = (texto: string) => texto;
const ETAPAS = [{ id: "e-entrada", name: "Entrada" }] as unknown as Stage[];
const CAMPOS = [{ key: "renda", label: "Renda", type: "number" }] as unknown as CustomFieldDef[];

describe("o CSV dos cards", () => {
  it("célula: aspas quando precisa, e texto que começa como fórmula ganha apóstrofo", () => {
    expect(celula("simples")).toBe("simples");
    expect(celula('diz "oi", tchau')).toBe('"diz ""oi"", tchau"');
    expect(celula("linha\nnova")).toBe('"linha\nnova"');
    expect(celula('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(celula("+5511999998888")).toBe("'+5511999998888");
    expect(celula("@soma")).toBe("'@soma");
    expect(celula(null)).toBe("");
    expect(celula(-5)).toBe("-5");
    expect(celula(["vip", "quente"])).toBe('"vip, quente"');
  });

  it("uma linha por negócio, com etapa, status, valor em reais, dono, contato e campos", () => {
    const lead = negocio(
      "l-1",
      {
        title: "Proposta ACME",
        status: "won",
        value_cents: 150_000,
        currency: "BRL",
        owner_user_id: "u-1",
        contact_phone: "+5511999998888",
        contact_email: "ana@exemplo.com",
        tags: ["vip", "quente"],
        custom_fields: { renda: 5000 },
      },
      { contato_nome: "Ana Souza" },
    );
    const csv = csvDoQuadro({
      leads: [lead],
      stages: ETAPAS,
      campos: CAMPOS,
      nomeDoDono: () => "Bruno",
      t,
    });
    const [cabecalho, linha, fim] = csv.split("\r\n");
    expect(cabecalho).toBe(
      "Título,Etapa,Status,Valor,Moeda,Dono do negócio,Nome do contato,Telefone,E-mail,Tags,Criado em,Atualizado em,Renda",
    );
    expect(linha).toBe(
      `Proposta ACME,Entrada,Ganho,1500.00,BRL,Bruno,Ana Souza,'+5511999998888,ana@exemplo.com,"vip, quente",${lead.created_at},${lead.updated_at},5000`,
    );
    expect(fim).toBe("");
  });

  it("o nome do arquivo sai sem acento nem símbolo, com a data", () => {
    expect(nomeDoArquivo("Leads INSS — Obras!", new Date("2026-10-15T12:00:00Z"))).toBe(
      "negocios-leads-inss-obras-2026-10-15.csv",
    );
    expect(nomeDoArquivo("???", new Date("2026-10-15T12:00:00Z"))).toBe(
      "negocios-origem-2026-10-15.csv",
    );
  });
});
