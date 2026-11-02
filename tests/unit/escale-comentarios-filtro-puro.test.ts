import { describe, expect, it } from "vitest";

import { casaComPalavraChave } from "@/lib/automation/palavra-chave";
import { casaComCondicao, casaComFiltro, lerFiltro, normalizar } from "@/lib/escale/comentarios/filtro";
import type { FiltroDoCaminho } from "@/lib/escale/comentarios/schema";

const palavras = (condicoes: { operador: never | string; valor: string }[], combinar: "qualquer" | "todas" = "qualquer") =>
  ({ modo: "palavras", condicoes, combinar }) as unknown as FiltroDoCaminho;

describe("operadores do filtro (D3)", () => {
  it("igual, contém, começa, termina, sem caixa nem acento", () => {
    const t = "  Eu   QUERO o Preço  ";
    expect(casaComCondicao(t, { operador: "igual", valor: "eu quero o preco" })).toBe(true);
    expect(casaComCondicao(t, { operador: "contem", valor: "preço" })).toBe(true);
    expect(casaComCondicao(t, { operador: "comeca_com", valor: "EU" })).toBe(true);
    expect(casaComCondicao(t, { operador: "termina_com", valor: "preco" })).toBe(true);
    expect(casaComCondicao(t, { operador: "igual", valor: "eu quero" })).toBe(false);
  });

  it("palavra inteira: 'eu' casa em 'eu quero!' e não em 'seu link'", () => {
    expect(casaComCondicao("eu quero!", { operador: "palavra_inteira", valor: "eu" })).toBe(true);
    expect(casaComCondicao("seu link", { operador: "palavra_inteira", valor: "eu" })).toBe(false);
  });

  it("valor com caractere de regex não quebra", () => {
    expect(casaComCondicao("quanto custa (r$)?", { operador: "palavra_inteira", valor: "(r$)" })).toBe(true);
  });
});

describe("casaComFiltro", () => {
  it("qualquer sempre casa", () => {
    expect(casaComFiltro("x", { modo: "qualquer" })).toBe(true);
  });

  it("'não contém' bloqueia com qualquer e com todas", () => {
    for (const combinar of ["qualquer", "todas"] as const) {
      const f = palavras(
        [
          { operador: "contem", valor: "quero" },
          { operador: "nao_contem", valor: "gratis" },
        ],
        combinar,
      );
      expect(casaComFiltro("eu quero", f)).toBe(true);
      expect(casaComFiltro("eu quero grátis", f)).toBe(false);
    }
  });

  it("só 'não contém' → false", () => {
    expect(casaComFiltro("oi", palavras([{ operador: "nao_contem", valor: "x" }]))).toBe(false);
  });

  it("todas exige todas as positivas; qualquer, uma", () => {
    const cond = [
      { operador: "contem", valor: "a" },
      { operador: "contem", valor: "z" },
    ];
    expect(casaComFiltro("abc", palavras(cond, "todas"))).toBe(false);
    expect(casaComFiltro("abc", palavras(cond, "qualquer"))).toBe(true);
  });

  it("o formato da 10B (palavras) casa igual ao das condições 'contém'", () => {
    const antigo = { modo: "palavras", palavras: ["quero"], combinar: "qualquer" } as FiltroDoCaminho;
    const novo = palavras([{ operador: "contem", valor: "quero" }]);
    for (const t of ["eu QUERO", "nada"]) expect(casaComFiltro(t, antigo)).toBe(casaComFiltro(t, novo));
    expect(lerFiltro(antigo)).toEqual({ modo: "palavras", condicoes: [{ operador: "contem", valor: "quero" }], combinar: "qualquer" });
  });

  it("condições vazias somem", () => {
    const f = { modo: "palavras", palavras: ["  "], combinar: "qualquer" } as FiltroDoCaminho;
    expect(lerFiltro(f)).toMatchObject({ condicoes: [] });
    expect(casaComFiltro("oi", f)).toBe(false);
  });
});

describe("normalizar do fork = o do motor", () => {
  it.each(["Ação", "  A   B ", "ÇÃO\nlinha", "ÀÉÎÕÜ", "", "Olá,  Mundo!"])("entrada %j", (e) => {
    expect(casaComPalavraChave(e, normalizar(e), "igual")).toBe(normalizar(e) !== "");
    expect(normalizar(e)).toBe(e.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim());
  });
});
