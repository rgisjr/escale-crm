import { describe, expect, it } from "vitest";

import {
  filtrarGrupos,
  gruposComCampos,
  rotuloDoToken,
  tokenDoCampo,
} from "@/lib/variaveis/catalogo";

/** FORK ESCALE · Frente V: a lista única, na ordem e com os nomes da Clint (prints v03 a v05). */
describe("catálogo das variáveis", () => {
  const grupos = gruposComCampos();

  it("os grupos na ordem da Clint", () => {
    expect(grupos.map((g) => g.grupo)).toEqual(["Negócio", "Contato", "Empresa", "Usuário"]);
  });

  it("os campos de cada grupo, na ordem, só os que têm dado (D1)", () => {
    const rotulos = (i: number) => grupos[i]!.itens.map((x) => x.rotulo);
    expect(rotulos(0)).toEqual([
      "Data",
      "Status",
      "Etapa",
      "Valor",
      "Link do último agendamento",
      "Data do último agendamento",
      "ID do negócio",
    ]);
    expect(rotulos(1)).toEqual([
      "Nome",
      "Primeiro nome",
      "Sobrenome",
      "Cargo",
      "Email",
      "Telefone",
      "ID do contato",
    ]);
    expect(rotulos(2)).toEqual(["Nome da empresa", "Cidade", "Estado"]);
    expect(rotulos(3)).toEqual(["Primeiro nome", "Segundo nome", "Email", "Nome da empresa"]);
  });

  it("os tokens são os da Clint", () => {
    expect(grupos[1]!.itens[1]!.token).toBe("[CONTACT.FIRST_NAME]");
    expect(grupos[3]!.itens[3]!.token).toBe("[USER.ORGANIZATION.NAME]");
  });

  it("checkout e recuperação de vendas ficam fora (D2)", () => {
    const todos = grupos.flatMap((g) => g.itens.map((i) => i.token));
    expect(todos.some((t) => /CHECKOUT|BILLET|PIX|PRODUCT/.test(t))).toBe(false);
  });

  it("personalizados no fim do grupo do objeto", () => {
    const comCampos = gruposComCampos({
      negocio: [{ chave: "plano-2", rotulo: "Plano" }],
      contato: [{ chave: "cpf", rotulo: "CPF" }],
      empresa: [{ chave: "porte", rotulo: "Porte" }],
    });
    expect(comCampos[0]!.itens.at(-1)).toEqual({ token: "[DEAL.PLANO_2]", rotulo: "Plano", disponivel: true });
    expect(comCampos[1]!.itens.at(-1)!.token).toBe("[CONTACT.CPF]");
    expect(comCampos[2]!.itens.at(-1)!.token).toBe("[ORGANIZATION.PORTE]");
    expect(tokenDoCampo("negocio", "a.b")).toBe("[DEAL.A_B]");
  });

  it("personalizado com a mesma chave de um fixo não duplica", () => {
    const g = gruposComCampos({ negocio: [{ chave: "stage", rotulo: "Etapa custom" }] });
    expect(g[0]!.itens.filter((i) => i.token === "[DEAL.STAGE]")).toHaveLength(1);
  });

  it("a saudação só existe quando pedida, em Outros, no fim (D4)", () => {
    expect(gruposComCampos().some((g) => g.chave === "OUTROS")).toBe(false);
    const g = gruposComCampos({}, ["saudacao"]);
    expect(g.at(-1)).toMatchObject({ grupo: "Outros", itens: [{ token: "{{saudacao}}", rotulo: "Saudação" }] });
  });

  it("a busca: sem acento, por campo ou grupo; grupo vazio some", () => {
    const r = filtrarGrupos(grupos, "nome");
    expect(r.map((g) => g.grupo)).toEqual(["Contato", "Empresa", "Usuário"]);
    expect(r[0]!.itens.map((i) => i.rotulo)).toEqual(["Nome", "Primeiro nome", "Sobrenome"]);
    expect(filtrarGrupos(grupos, "negocio")[0]!.itens).toHaveLength(7);
    expect(filtrarGrupos(grupos, "zzz")).toEqual([]);
    expect(filtrarGrupos(grupos, "  ")).toHaveLength(4);
  });

  it("o rótulo de um token", () => {
    expect(rotuloDoToken("[CONTACT.FIRST_NAME]")).toEqual({ rotulo: "Primeiro nome", grupo: "CONTACT" });
    expect(rotuloDoToken("[DEAL.PLANO]", { negocio: [{ chave: "plano", rotulo: "Plano" }] })).toEqual({
      rotulo: "Plano",
      grupo: "DEAL",
    });
    expect(rotuloDoToken("{{saudacao}}")!.rotulo).toBe("Saudação");
    expect(rotuloDoToken("[X.Y]")).toBeNull();
  });
});
