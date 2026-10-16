import { describe, expect, it } from "vitest";

import {
  celula,
  csvDoQuadro,
  dataBr,
  nomeDoArquivo,
  numeroBr,
} from "@/lib/escale/exportar/csv-do-quadro";
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

  it("célula: texto com sinal de menos ganha o apóstrofo, mas o valor numérico negativo não", () => {
    expect(celula("-10")).toBe("'-10");
    expect(celula("\tabc")).toBe("'\tabc");
    expect(celula("\rabc")).toBe(`"'\rabc"`);
    expect(celula(numeroBr("-10,00"))).toBe('"-10,00"');
    expect(celula(numeroBr("1500,00"))).toBe('"1500,00"');
    expect(celula(numeroBr("0"))).toBe("0");
  });

  it("célula: objeto não vira [object Object] (sai como JSON) e item de lista idem", () => {
    expect(celula({ a: 1 })).toBe('"{""a"":1}"');
    expect(celula([{ a: 1 }, "x"])).toBe('"{""a"":1}, x"');
    expect(celula({})).toBe("{}");
  });

  it("dataBr: dd/mm/aaaa no horário local; data inválida sai vazia", () => {
    expect(dataBr("2026-10-05T15:30:00")).toBe("05/10/2026");
    expect(dataBr("2026-01-31T00:05:00")).toBe("31/01/2026");
    expect(dataBr("não é data")).toBe("");
    expect(dataBr(null)).toBe("");
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
        created_at: "2026-10-05T15:30:00",
        updated_at: "2026-10-16T09:00:00",
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
      `Proposta ACME,Entrada,Ganho,"1500,00",BRL,Bruno,Ana Souza,'+5511999998888,ana@exemplo.com,"vip, quente",05/10/2026,16/10/2026,5000`,
    );
    expect(fim).toBe("");
  });

  it("valor negativo sai como número (-10,00), sem apóstrofo; campo de objeto não imprime [object Object]", () => {
    const lead = negocio("l-2", {
      value_cents: -1000,
      custom_fields: { renda: { de: 1, ate: 2 } },
    });
    const csv = csvDoQuadro({
      leads: [lead],
      stages: ETAPAS,
      campos: CAMPOS,
      nomeDoDono: () => "",
      t,
    });
    const linha = csv.split("\r\n")[1]!;
    expect(linha).toContain(',"-10,00",');
    expect(linha).not.toContain("'-10");
    expect(linha).not.toContain("[object Object]");
    expect(linha.endsWith('"{""de"":1,""ate"":2}"')).toBe(true);
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
