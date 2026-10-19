import { describe, expect, it } from "vitest";

import {
  interpretarValor,
  lerCabecalho,
  lerPlanilha,
  marcarRepetidas,
  normalizarLinha,
  valorDoCampo,
  type DefinicoesDosCampos,
} from "@/lib/escale/importacao/linhas";
import type { ColunaMapeada } from "@/lib/escale/importacao/regras";

const bytes = (texto: string) => new TextEncoder().encode(texto);
const defs: DefinicoesDosCampos = {
  contato: {
    plano: { type: "select", label: "Plano", options: [{ value: "ouro", label: "Ouro" }, { value: "prata", label: "Prata" }] },
    renda: { type: "currency", label: "Renda" },
    visita: { type: "datetime", label: "Visita" },
  },
  empresa: { segmento: { type: "text", label: "Segmento" } },
  negocio: { produto: { type: "text", label: "Produto" } },
};
const mapa = (...para: string[]): ColunaMapeada[] => para.map((p, i) => ({ csv: `c${i}`, para: p }));

describe("linhas da importação (Fase 2F)", () => {
  it("lê a planilha: cabeçalho, linhas, vazio e limites", () => {
    expect(lerPlanilha(bytes("nome;email\nMaria;maria@x.com\n\n"))).toEqual({
      cabecalho: ["nome", "email"],
      linhas: [["Maria", "maria@x.com"]],
    });
    expect(lerPlanilha(bytes("nome\n"))).toEqual({ erro: "O arquivo não tem linhas para importar." });
    const grande = "nome\n" + "x\n".repeat(50_001);
    expect(lerPlanilha(bytes(grande))).toEqual({ erro: "O arquivo passa de 50.000 linhas." });
    expect(lerCabecalho(bytes("﻿Nome,Celular\nMaria,1"))).toEqual(["Nome", "Celular"]);
  });

  it("normaliza o contato: e-mail, telefone com e sem DDI, Instagram, tags, data e campos", () => {
    const l = normalizarLinha(
      ["Maria", " MARIA@X.COM ", "(64) 99944-6816", "@maria", "vip; Lead quente", "05/03/1990", "Ouro", "R$ 1.234,56", "10/01/2026 10:18"],
      mapa("name", "email", "phone", "instagram", "tag", "birthdate", "custom:plano", "custom:renda", "custom:visita"),
      "contato",
      defs,
    );
    expect(l).toMatchObject({
      nome: "Maria",
      email: "maria@x.com",
      telefone: "+5564999446816",
      instagram: "https://instagram.com/maria",
      tags: ["vip", "lead quente"],
      nascimento: "1990-03-05",
      campos: { plano: "ouro", renda: 1234.56, visita: "2026-01-10T10:18" },
      negocio: null,
    });
    expect(normalizarLinha(["351", "912345678"], mapa("ddi", "phone"), "contato", defs).telefone).toBe("+351912345678");
  });

  it("o inválido vai para `invalidos` ou `descartados`, sem derrubar a linha", () => {
    const l = normalizarLinha(
      ["nao-e-email", "123", "abc", "Diamante", "32/13/1990"],
      mapa("email", "phone", "id", "custom:plano", "birthdate"),
      "contato",
      defs,
    );
    expect(l.invalidos).toEqual({ email: "nao-e-email", telefone: "123", id: "abc" });
    expect(l.descartados).toEqual([
      { campo: "custom:plano", valor: "Diamante" },
      { campo: "birthdate", valor: "32/13/1990" },
    ]);
  });

  it("empresa e negócio", () => {
    const l = normalizarLinha(
      ["Acme", "11.222.333/0001-81", "go", "Varejo", "Proposta", "1.500,00", "Funil A", "Qualificação", "Ganho", "02/02/2026", "Kit"],
      mapa("company", "org:cnpj", "org:estado", "org:segmento", "title", "value", "origin_name", "stage_name", "status", "won_at", "deal_custom:produto"),
      "negocio",
      defs,
    );
    expect(l.empresa).toBe("Acme");
    expect(l.cnpj).toEqual({ formatado: "11.222.333/0001-81", normalizado: "11222333000181" });
    expect(l.camposDaEmpresa).toEqual({ estado: "GO", segmento: "Varejo" });
    expect(l.negocio).toMatchObject({
      titulo: "Proposta",
      valorCentavos: 150000,
      valorInvalido: null,
      origem: "Funil A",
      etapa: "Qualificação",
      status: "won",
      ganhoEm: "2026-02-02",
      campos: { produto: "Kit" },
    });
    expect(normalizarLinha(["mil reais"], mapa("value"), "negocio", defs).negocio).toMatchObject({
      valorCentavos: null,
      valorInvalido: "mil reais",
    });
    expect(interpretarValor("cerca de 2.000,50 reais")).toBe(200050);
    expect(interpretarValor("nada")).toBeNull();
  });

  it("valor do campo por tipo", () => {
    expect(valorDoCampo({ type: "boolean", label: "x" }, "Sim")).toEqual({ ok: true, valor: true });
    expect(valorDoCampo({ type: "boolean", label: "x" }, "talvez")).toEqual({ ok: false });
    expect(
      valorDoCampo({ type: "multiselect", label: "x", options: [{ value: "a", label: "Alfa" }, { value: "b", label: "Beta" }] }, "alfa; Beta"),
    ).toEqual({ ok: true, valor: ["a", "b"] });
    expect(valorDoCampo({ type: "email", label: "x" }, "x@y")).toEqual({ ok: false });
    expect(valorDoCampo({ type: "text", label: "x" }, "  oi ")).toEqual({ ok: true, valor: "oi" });
  });

  it("repetidas no arquivo: mesmo e-mail ou mesmo telefone (com e sem o nono dígito)", () => {
    const linha = (email: string | null, telefone: string | null) =>
      ({ ...normalizarLinha([], [], "contato", defs), email, telefone });
    expect(
      marcarRepetidas([
        linha("a@x.com", null),
        linha("A@x.com".toLowerCase(), null),
        linha(null, "+5564999446816"),
        linha(null, "+556499446816"),
        linha(null, null),
      ]),
    ).toEqual([null, 0, null, 2, null]);
  });
});
