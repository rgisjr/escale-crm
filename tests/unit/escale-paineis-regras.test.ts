import { describe, expect, it } from "vitest";

import {
  camposMudados,
  continuaVendo,
  filtrarPaineis,
  mudouAlgo,
  nomeDaCopia,
  ordenarPaineis,
  podeGerirPaineis,
  textoDaContagem,
} from "@/lib/escale/indicadores/paineis/regras";
import { edicaoDoPainelSchema } from "@/lib/escale/indicadores/paineis/schema";
import type { EdicaoDoPainel } from "@/lib/escale/indicadores/paineis/tipos";

const paineis = Object.freeze([
  Object.freeze({ id: "3", nome: "Zeta" }),
  Object.freeze({ id: "1", nome: "beta" }),
  Object.freeze({ id: "2", nome: "Ágil" }),
  Object.freeze({ id: "4", nome: "Gerência" }),
]);

const base: EdicaoDoPainel = {
  nome: "Vendas",
  cor: "marca",
  icone: "briefcase",
  permissoesUsuarios: ["a", "b"],
  permissoesPapeis: ["agent", "manager"],
};

describe("regras dos painéis (Fase 7B)", () => {
  it("só gerente ou acima gere painéis", () => {
    expect(podeGerirPaineis("agent")).toBe(false);
    expect(podeGerirPaineis("manager")).toBe(true);
    expect(podeGerirPaineis("admin")).toBe(true);
    expect(podeGerirPaineis(null)).toBe(false);
  });

  it("busca pelo nome sem acento nem maiúscula", () => {
    expect(filtrarPaineis(paineis, "gerencia").map((p) => p.id)).toEqual(["4"]);
    expect(filtrarPaineis(paineis, "GER").map((p) => p.id)).toEqual(["4"]);
    expect(filtrarPaineis(paineis, "  ")).toHaveLength(4);
  });

  it("ordena em ordem alfabética sem mexer na lista de entrada", () => {
    expect(ordenarPaineis(paineis).map((p) => p.nome)).toEqual(["Ágil", "beta", "Gerência", "Zeta"]);
    expect(paineis[0]?.nome).toBe("Zeta");
  });

  it("dá nome à cópia cabendo em 80", () => {
    expect(nomeDaCopia("Vendas")).toBe("Vendas (cópia)");
    const longo = "x".repeat(80);
    expect(nomeDaCopia(longo)).toHaveLength(80);
    expect(nomeDaCopia(longo).endsWith(" (cópia)")).toBe(true);
  });

  it("confere se quem grava continua vendo o painel", () => {
    expect(continuaVendo({ id: "u1", papel: "admin" }, ["x"], [])).toBe(true);
    expect(continuaVendo({ id: "u1", papel: "manager" }, [], [])).toBe(true);
    expect(continuaVendo({ id: "U1", papel: "manager" }, ["u1"], [])).toBe(true);
    expect(continuaVendo({ id: "u1", papel: "manager" }, [], ["manager"])).toBe(true);
    expect(continuaVendo({ id: "u1", papel: "manager" }, ["u2"], ["agent"])).toBe(false);
  });

  it("devolve a chave do rótulo com a contagem", () => {
    expect(textoDaContagem(0, "usuario")).toBe("Usuários");
    expect(textoDaContagem(0, "papel")).toBe("Papéis");
    expect(textoDaContagem(1, "usuario")).toBe("1 usuário selecionado");
    expect(textoDaContagem(1, "papel")).toBe("1 papel selecionado");
    expect(textoDaContagem(3, "usuario")).toBe("{n} usuários selecionados");
    expect(textoDaContagem(2, "papel")).toBe("{n} papéis selecionados");
  });

  it("só acusa mudança de verdade", () => {
    expect(mudouAlgo(base, { ...base, permissoesUsuarios: ["b", "a"], permissoesPapeis: ["manager", "agent"] })).toBe(false);
    expect(mudouAlgo(base, { ...base, nome: " Vendas  " })).toBe(false);
    expect(mudouAlgo(base, { ...base, cor: "#FF4062" })).toBe(true);
    expect(mudouAlgo(base, { ...base, icone: "nenhum" })).toBe(true);
    expect(mudouAlgo(base, { ...base, permissoesUsuarios: ["a"] })).toBe(true);
  });

  it("monta o PATCH só com os campos mudados", () => {
    expect(camposMudados(base, { ...base, nome: " Outro " })).toEqual({ nome: "Outro" });
    expect(camposMudados(base, { ...base, permissoesPapeis: ["admin"], cor: "#FF4062" })).toEqual({
      cor: "#FF4062",
      permissoesPapeis: ["admin"],
    });
    expect(camposMudados(base, { ...base, permissoesUsuarios: ["b", "a"] })).toEqual({});
  });
});

describe("edicaoDoPainelSchema", () => {
  it.each([
    [{}],
    [{ nome: "   " }],
    [{ cor: "#000000" }],
    [{ icone: "x" }],
    [{ permissoesPapeis: ["viewer"] }],
    [{ permissoesUsuarios: ["nao-e-uuid"] }],
    [{ nome: "A", organizacao: "outra" }],
  ])("recusa %j", (corpo) => {
    expect(edicaoDoPainelSchema.safeParse(corpo).success).toBe(false);
  });

  it("aceita uma edição parcial e apara o nome", () => {
    const r = edicaoDoPainelSchema.safeParse({ nome: " A " });
    expect(r.success && r.data).toEqual({ nome: "A" });
    expect(
      edicaoDoPainelSchema.safeParse({
        cor: "marca",
        icone: "nenhum",
        permissoesUsuarios: ["7c9e6679-7425-40de-944b-e07fc1f90ae7"],
        permissoesPapeis: ["agent", "admin"],
      }).success,
    ).toBe(true);
  });
});
