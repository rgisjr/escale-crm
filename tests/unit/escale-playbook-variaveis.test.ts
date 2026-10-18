import { describe, expect, it } from "vitest";

import {
  filtrarVariaveis,
  inserirNoCursor,
  resolverVariaveis,
  type DadosDasVariaveis,
} from "@/lib/escale/playbook/variaveis";

/** FORK ESCALE · Fase 1I (P10): as variáveis da mensagem, no formato da Clint. */
const t = (s: string) => s;
const DADOS: DadosDasVariaveis = {
  contato: { nome: "Auta Graziela Souza", email: "auta@x.com", telefone: "+5543999990000" },
  negocio: { etapa: "1. Entrada Lead", valor: "R$ 1.500,00" },
  usuario: { nome: "Régis Junior", email: "regis@escaleia.com" },
  empresa: { nome: "Escale IA" },
};

describe("resolverVariaveis", () => {
  it("troca as variáveis conhecidas", () => {
    expect(
      resolverVariaveis(
        "Olá [CONTACT.FIRST_NAME] [CONTACT.LAST_NAME], sou [USER.FIRST_NAME] da [ORGANIZATION.NAME] ([DEAL.STAGE], [DEAL.VALUE])",
        DADOS,
      ),
    ).toBe("Olá Auta Graziela Souza, sou Régis da Escale IA (1. Entrada Lead, R$ 1.500,00)");
  });
  it("sem valor vira vazio; desconhecida fica como está", () => {
    const vazio = { ...DADOS, contato: { nome: null, email: null, telefone: null } };
    expect(resolverVariaveis("Oi [CONTACT.FIRST_NAME]!", vazio)).toBe("Oi !");
    expect(resolverVariaveis("Link: [DEAL.PAYMENT_PIX_URL]", DADOS)).toBe(
      "Link: [DEAL.PAYMENT_PIX_URL]",
    );
  });
  it("campos personalizados: o valor que vier em `campos`, pela variável inteira", () => {
    expect(
      resolverVariaveis("Plano [DEAL.PLANO_2] / [CONTACT.CPF]", {
        ...DADOS,
        campos: { "[DEAL.PLANO_2]": "Ouro", "[CONTACT.CPF]": "" },
      }),
    ).toBe("Plano Ouro / ");
  });
});

describe("filtrarVariaveis e inserirNoCursor", () => {
  it("a busca filtra pelo rótulo, sem acento, e some com o grupo vazio", () => {
    const grupos = filtrarVariaveis("sobrenome", t);
    expect(grupos.map((g) => g.grupo)).toEqual(["Contato"]);
    expect(grupos[0]?.itens.map((v) => v.nome)).toEqual(["[CONTACT.LAST_NAME]"]);
    expect(filtrarVariaveis("negocio", t)[0]?.grupo).toBe("Negócio");
    expect(filtrarVariaveis("zzz", t)).toEqual([]);
  });
  it("os campos personalizados entram em Negócio e em Contato, com a chave em maiúsculas", () => {
    const grupos = filtrarVariaveis("plano", t, [
      { chave: "plano-escolhido", rotulo: "Plano escolhido" },
    ]);
    expect(grupos.map((g) => [g.grupo, g.itens.map((v) => v.nome)])).toEqual([
      ["Negócio", ["[DEAL.PLANO_ESCOLHIDO]"]],
      ["Contato", ["[CONTACT.PLANO_ESCOLHIDO]"]],
    ]);
  });
  it("insere no cursor (troca a seleção) e devolve o cursor depois da variável", () => {
    expect(inserirNoCursor("Olá !", 4, 4, "[CONTACT.FIRST_NAME]")).toEqual({
      texto: "Olá [CONTACT.FIRST_NAME]!",
      cursor: 24,
    });
    expect(inserirNoCursor("Olá XX!", 4, 6, "[X.Y]")).toEqual({ texto: "Olá [X.Y]!", cursor: 9 });
  });
});
