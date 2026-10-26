import { describe, expect, it } from "vitest";

import {
  resolverTexto,
  tokensUsados,
  usaTokensDaClint,
  valorDaVariavel,
  type FontesDasVariaveis,
} from "@/lib/variaveis/resolver";

/** FORK ESCALE · Frente V: o resolvedor único (formato BR, D2, D8, D14). */
const FONTES: FontesDasVariaveis = {
  contato: {
    id: "c-1",
    nome: "  Ana Paula   Souza ",
    email: "ana@x.com",
    telefone: "+5543999990000",
    cargo: "Diretora",
    campos: { cpf: "123", interesses: ["obra", "reforma"], vazio: "" },
  },
  negocio: {
    id: "l-1",
    criadoEm: "2026-10-05T02:30:00Z",
    status: "won",
    etapa: "1. Entrada",
    valorCentavos: 123456,
    moeda: "BRL",
    campos: { "plano-2": "Ouro" },
  },
  empresa: { nome: "Toda Construtora", cidade: "Londrina", estado: "PR", campos: { porte: "Médio" } },
  usuario: { nome: "Régis Marques Junior", email: "regis@escaleia.com" },
  conta: { nome: "Escale IA" },
  ultimoAgendamento: { link: "https://meet.google.com/abc", inicio: "2026-10-05T17:30:00Z" },
  fuso: "America/Sao_Paulo",
};

describe("valorDaVariavel", () => {
  const casos: Array<[string, string | null | undefined]> = [
    ["DEAL.DATE", "04/10/2026"],
    ["DEAL.STATUS", "Ganho"],
    ["DEAL.STAGE", "1. Entrada"],
    ["DEAL.VALUE", "R$ 1.234,56"],
    ["DEAL.LATEST_MEETING_LINK", "https://meet.google.com/abc"],
    ["DEAL.LATEST_MEETING_DATETIME", "05/10/2026 às 14:30"],
    ["DEAL.ID", "l-1"],
    ["DEAL.PLANO_2", "Ouro"],
    ["CONTACT.NAME", "Ana Paula Souza"],
    ["CONTACT.FIRST_NAME", "Ana"],
    ["CONTACT.LAST_NAME", "Paula Souza"],
    ["CONTACT.ROLE", "Diretora"],
    ["CONTACT.EMAIL", "ana@x.com"],
    ["CONTACT.PHONE", "+5543999990000"],
    ["CONTACT.ID", "c-1"],
    ["CONTACT.INTERESSES", "obra, reforma"],
    ["CONTACT.VAZIO", null],
    ["CONTACT.NAO_EXISTE", null],
    ["ORGANIZATION.NAME", "Toda Construtora"],
    ["CONTACT.ORGANIZATION.NAME", "Toda Construtora"],
    ["ORGANIZATION.CITY", "Londrina"],
    ["ORGANIZATION.STATE", "PR"],
    ["ORGANIZATION.PORTE", "Médio"],
    ["ORGANIZATION.URL", null],
    ["USER.FIRST_NAME", "Régis"],
    ["USER.LAST_NAME", "Marques Junior"],
    ["USER.EMAIL", "regis@escaleia.com"],
    ["USER.ORGANIZATION.NAME", "Escale IA"],
    ["USER.WHATSAPP", null],
    ["DEAL.CHECKOUT_LINK", null],
    ["DEAL.PAYMENT_PIX_URL", null],
    ["FOO.BAR", undefined],
    ["USER.ORGANIZATION.NAME.X", undefined],
  ];
  for (const [token, esperado] of casos) {
    it(token, () => expect(valorDaVariavel(token, FONTES)).toBe(esperado));
  }

  it("`prontos` vence (o personalizado já formatado pelo tipo)", () => {
    expect(valorDaVariavel("DEAL.PLANO_2", { ...FONTES, prontos: { "[DEAL.PLANO_2]": "Plano Ouro" } })).toBe(
      "Plano Ouro",
    );
  });

  it("sem fuso, São Paulo; status desconhecido sai como está", () => {
    const f = { negocio: { ...FONTES.negocio!, status: "outro" } };
    expect(valorDaVariavel("DEAL.DATE", f)).toBe("04/10/2026");
    expect(valorDaVariavel("DEAL.STATUS", f)).toBe("outro");
  });

  it("protótipo não vaza dos campos personalizados", () => {
    const f = { contato: { ...FONTES.contato!, campos: JSON.parse('{"__proto__": "x"}') } };
    expect(valorDaVariavel("CONTACT.__PROTO__", f)).toBeNull();
    expect(valorDaVariavel("CONTACT.CONSTRUCTOR", f)).toBeNull();
  });
});

describe("resolverTexto", () => {
  it("troca os tokens", () => {
    expect(
      resolverTexto("Oi [CONTACT.FIRST_NAME], sou [USER.FIRST_NAME] da [USER.ORGANIZATION.NAME]", FONTES, {
        vazio: "vazio",
      }).texto,
    ).toBe("Oi Ana, sou Régis da Escale IA");
  });

  it("cada modo de vazio", () => {
    const f = { contato: { id: null, nome: null, email: null, telefone: null } };
    expect(resolverTexto("Oi [CONTACT.FIRST_NAME]!", f, { vazio: "vazio" })).toEqual({
      texto: "Oi !",
      faltando: [],
      desconhecidas: [],
    });
    expect(resolverTexto("Oi [CONTACT.FIRST_NAME]!", f, { vazio: "literal" }).texto).toBe(
      "Oi [CONTACT.FIRST_NAME]!",
    );
    expect(resolverTexto("Oi [CONTACT.FIRST_NAME]!", f, { vazio: "falta" })).toEqual({
      texto: "Oi [CONTACT.FIRST_NAME]!",
      faltando: ["CONTACT.FIRST_NAME"],
      desconhecidas: [],
    });
  });

  it("checkout sai vazio, nunca cru (D2); desconhecido fica e é avisado", () => {
    expect(resolverTexto("Pix: [DEAL.PAYMENT_PIX_URL] [FOO.BAR]", FONTES, { vazio: "vazio" })).toEqual({
      texto: "Pix:  [FOO.BAR]",
      faltando: [],
      desconhecidas: ["FOO.BAR"],
    });
  });

  it("sem fontes, o token fica e não conta como falta", () => {
    expect(resolverTexto("Oi [CONTACT.NAME]", null, { vazio: "falta" })).toEqual({
      texto: "Oi [CONTACT.NAME]",
      faltando: [],
      desconhecidas: [],
    });
  });

  it("o formatador só toca o valor", () => {
    const f = { contato: { ...FONTES.contato!, nome: "<b>Ana</b>" } };
    expect(
      resolverTexto("<p>[CONTACT.NAME]</p>", f, { vazio: "vazio", formatar: (v) => v.replaceAll("<", "&lt;") })
        .texto,
    ).toBe("<p>&lt;b>Ana&lt;/b></p>");
  });

  it("uma passada só com o legado: valor inserido não é relido", () => {
    const f = { contato: { ...FONTES.contato!, nome: "{{nome}}" } };
    const r = resolverTexto("[CONTACT.NAME] {{nome}}", f, {
      vazio: "vazio",
      legado: { regex: /\{\{\s*([a-z_]+)\s*\}\}/g, trocar: () => "Legado" },
    });
    expect(r.texto).toBe("{{nome}} Legado");
  });

  it("colchete que não é token fica", () => {
    expect(resolverTexto("[livre] [a.b] [CONTACT]", FONTES, { vazio: "vazio" }).texto).toBe(
      "[livre] [a.b] [CONTACT]",
    );
  });
});

describe("tokensUsados e usaTokensDaClint", () => {
  it("lista sem repetir", () => {
    expect(tokensUsados("[CONTACT.NAME] [CONTACT.NAME] [USER.ORGANIZATION.NAME] {{nome}}")).toEqual([
      "CONTACT.NAME",
      "USER.ORGANIZATION.NAME",
    ]);
    expect(usaTokensDaClint("Oi {{nome}}")).toBe(false);
    expect(usaTokensDaClint("Oi [CONTACT.NAME]")).toBe(true);
  });
});
