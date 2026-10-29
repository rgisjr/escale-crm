import { describe, expect, it } from "vitest";

import {
  aplicarFiltrosDoModelo,
  contarFiltros,
  filtrosDoModeloSchema,
  modelosDaCategoria,
  nomeDoPainelDoModelo,
  tagsDoModelo,
} from "@/lib/escale/indicadores/modelos/regras";
import type { ModeloNaLista } from "@/lib/escale/indicadores/modelos/tipos";

const U1 = "22222222-2222-4222-8222-222222222222";
const U2 = "33333333-3333-4333-8333-333333333333";
const O1 = "44444444-4444-4444-8444-444444444444";
const VAZIOS = filtrosDoModeloSchema.parse({});
const congelar = <T,>(o: T): T => {
  if (o && typeof o === "object") {
    Object.values(o).forEach(congelar);
    Object.freeze(o);
  }
  return o;
};

describe("nomeDoPainelDoModelo", () => {
  it("acrescenta ' 2' e corta para caber em 80", () => {
    expect(nomeDoPainelDoModelo("Conversão de vendas")).toBe("Conversão de vendas 2");
    expect(nomeDoPainelDoModelo("a".repeat(80))).toHaveLength(80);
    expect(nomeDoPainelDoModelo("a".repeat(80)).endsWith(" 2")).toBe(true);
  });
});

describe("tagsDoModelo", () => {
  it("vazio → undefined; duas tags → um grupo 'ou' com dois 'possui'", () => {
    expect(tagsDoModelo([])).toBeUndefined();
    const t = tagsDoModelo(["vip", "quente"]);
    expect(t?.grupos).toHaveLength(1);
    expect(t?.grupos[0]?.modo).toBe("ou");
    expect(t?.grupos[0]?.condicoes).toEqual([
      { op: "possui", tag: "vip" },
      { op: "possui", tag: "quente" },
    ]);
  });
});

describe("aplicarFiltrosDoModelo", () => {
  const pergunta = { indicadores: ["negocio.ganhos"], filtroFixo: { origens: [O1] } };
  it("troca só as chaves preenchidas e mantém as do modelo nas vazias, sem mutar", () => {
    const entrada = congelar(structuredClone(pergunta));
    const r = aplicarFiltrosDoModelo(entrada, { ...VAZIOS, usuarios: [U1] }) as { filtroFixo: Record<string, unknown> };
    expect(r.filtroFixo).toEqual({ origens: [O1], usuarios: [U1] });
    const trocada = aplicarFiltrosDoModelo(entrada, { ...VAZIOS, origens: [U2] }) as { filtroFixo: Record<string, unknown> };
    expect(trocada.filtroFixo.origens).toEqual([U2]);
    expect(entrada.filtroFixo.origens).toEqual([O1]);
  });
  it("sem nada preenchido, a pergunta volta igual; divisor e inválida voltam como vieram", () => {
    expect(aplicarFiltrosDoModelo(pergunta, VAZIOS)).toBe(pergunta);
    const divisor = { divisor: true };
    expect(aplicarFiltrosDoModelo(divisor, { ...VAZIOS, usuarios: [U1] })).toBe(divisor);
    const lixo = { lixo: 1 };
    expect(aplicarFiltrosDoModelo(lixo, { ...VAZIOS, usuarios: [U1] })).toBe(lixo);
  });
  it("tags viram a forma 'possui'", () => {
    const r = aplicarFiltrosDoModelo({ indicadores: ["negocio.ganhos"] }, { ...VAZIOS, tags: ["vip"] }) as {
      filtroFixo: { tags: { grupos: { condicoes: unknown[] }[] } };
    };
    expect(r.filtroFixo.tags.grupos[0]?.condicoes).toEqual([{ op: "possui", tag: "vip" }]);
  });
});

describe("modelosDaCategoria", () => {
  const sistema = (id: "atendimentos" | "conversao-de-vendas", nome: string): ModeloNaLista => ({ origem: "sistema", id, nome, cor: "marca", icone: "user", graficos: 1 });
  const org = (id: string, nome: string): ModeloNaLista => ({ origem: "organizacao", id, nome, cor: "marca", icone: "user", graficos: 1, criadoEm: "2026-10-28" });
  const todos = [sistema("conversao-de-vendas", "Conversão de vendas"), org("a", "beta"), org("b", "Ágil"), sistema("atendimentos", "Atendimentos")];
  it("'meus' só traz os da organização; ordem alfabética com Ágil antes de beta", () => {
    expect(modelosDaCategoria(todos, "meus", "").map((m) => m.nome)).toEqual(["Ágil", "beta"]);
    expect(modelosDaCategoria(todos, "todos", "").map((m) => m.nome)).toEqual(["Ágil", "Atendimentos", "beta", "Conversão de vendas"]);
  });
  it("busca sem acento nem maiúscula e devolve cópia", () => {
    expect(modelosDaCategoria(todos, "todos", "conversao").map((m) => m.nome)).toEqual(["Conversão de vendas"]);
    expect(modelosDaCategoria(todos, "todos", "AGIL")).toHaveLength(1);
    expect(todos[0]?.nome).toBe("Conversão de vendas");
  });
});

describe("filtrosDoModeloSchema e contarFiltros", () => {
  it("recusa chave extra e aceita {} com defaults", () => {
    expect(filtrosDoModeloSchema.safeParse({ periodo: 1 }).success).toBe(false);
    expect(filtrosDoModeloSchema.parse({})).toEqual({ gruposDeOrigem: [], origens: [], usuarios: [], tags: [] });
  });
  it("conta valores por chave", () => {
    expect(contarFiltros({ usuarios: [U1, U2], tags: tagsDoModelo(["a", "b", "c"]) })).toEqual({ usuarios: 2, gruposDeOrigem: 0, origens: 0, tags: 3 });
    expect(contarFiltros(undefined).tags).toBe(0);
  });
});
