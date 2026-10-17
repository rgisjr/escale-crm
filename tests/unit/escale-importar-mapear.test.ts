import { describe, expect, it } from "vitest";

import {
  CAMPOS_DA_IMPORTACAO,
  csvMapeado,
  podeContinuar,
  sugerirMapa,
} from "@/lib/escale/importar/mapear";
import { parseCsv } from "@/lib/contacts/csv";

const LINHAS = [
  ["Cliente", "Celular", "Email", "Ticket", "Etiquetas"],
  ["Ana Souza", "11988887777", "ana@x.com", "1.200,00", "vip"],
  ["Bruno", "", "", "", ""],
];

describe("o mapeamento da importação (passo 2)", () => {
  it("sugere pelo nome da coluna, como a rota leria; o que não conhece fica 'Não importar'", () => {
    expect(sugerirMapa(LINHAS[0]!)).toEqual([null, "telefone", "email", "valor", "etiquetas"]);
    expect(sugerirMapa(["nome", "Nome"])).toEqual(["titulo", null]);
  });

  it("os campos vêm em dois grupos, contato primeiro", () => {
    expect([...new Set(CAMPOS_DA_IMPORTACAO.map((c) => c.grupo))]).toEqual(["contato", "negocio"]);
  });

  it("só continua com nome do negócio ou do contato", () => {
    expect(podeContinuar([null, "telefone", "email", null, null])).toBe(false);
    expect(podeContinuar(["contato", "telefone", null, null, null])).toBe(true);
  });

  it("reescreve o cabeçalho com os nomes da rota, tira as colunas ignoradas e junta as tags do passo 3", () => {
    const csv = csvMapeado(
      LINHAS,
      ["contato", "telefone", null, "valor", "etiquetas"],
      ["importado", "out/26"],
    );
    expect(parseCsv(csv)).toEqual([
      ["nome do contato", "telefone", "valor", "tags"],
      ["Ana Souza", "11988887777", "1.200,00", "vip;importado;out/26"],
      ["Bruno", "", "", "importado;out/26"],
    ]);
  });

  it("sem coluna de tags, as do passo 3 viram uma coluna nova; aspas e vírgulas sobrevivem", () => {
    const csv = csvMapeado([["nome"], ['Reforma "402", sala']], ["titulo"], ["vip"]);
    expect(parseCsv(csv)).toEqual([
      ["nome", "tags"],
      ['Reforma "402", sala', "vip"],
    ]);
  });
});
