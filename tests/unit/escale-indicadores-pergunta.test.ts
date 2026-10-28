import { describe, expect, it } from "vitest";

import type { CampoDinamico } from "@/lib/escale/indicadores/catalogo/campos-personalizados";
import { perguntaSchema, validarPergunta } from "@/lib/escale/indicadores/pergunta";

const base = {
  indicadores: ["negocio.ganhos", "negocio.soma_de_valores"],
  variaveis: ["negocio.origem"],
  tempo: { campo: "negocio.criado_em", granularidade: "mes", periodo: { atalho: "este_mes" } },
  filtro: { modo: "todas", condicoes: [{ campo: "negocio.etapa", op: "diferente_de", valor: ["x"] }] },
};
const ler = (o: unknown) => perguntaSchema.safeParse(o);
const validar = (o: unknown, doOrg = new Map<string, CampoDinamico>()) => {
  const lida = perguntaSchema.parse(o);
  return validarPergunta(lida, doOrg);
};

describe("perguntaSchema", () => {
  it("aceita o exemplo", () => expect(ler(base).success).toBe(true));

  it("recusa 6 indicadores e 3 variáveis", () => {
    expect(ler({ ...base, indicadores: Array(6).fill("negocio.ganhos") }).success).toBe(false);
    expect(ler({ ...base, variaveis: ["negocio.etapa", "negocio.origem", "negocio.dono"] }).success).toBe(false);
  });

  it("recusa operador fora do enum, id com ';' e período personalizado sem datas", () => {
    expect(ler({ ...base, filtro: { condicoes: [{ campo: "negocio.etapa", op: "drop", valor: "a" }] } }).success).toBe(false);
    expect(ler({ ...base, indicadores: ["negocio.ganhos;drop"] }).success).toBe(false);
    expect(ler({ ...base, tempo: { ...base.tempo, periodo: { atalho: "personalizado" } } }).success).toBe(false);
  });

  it("vazio dispensa valor, igual_a não", () => {
    const com = (op: string) => ler({ ...base, filtro: { condicoes: [{ campo: "negocio.etapa", op }] } }).success;
    expect(com("vazio")).toBe(true);
    expect(com("igual_a")).toBe(false);
  });
});

describe("validarPergunta", () => {
  it("aceita a pergunta do exemplo", () => expect(validar(base).ok).toBe(true));

  it("recusa assuntos misturados", () => {
    expect(validar({ ...base, indicadores: ["negocio.ganhos", "conversa.iniciadas"] }).ok).toBe(false);
    expect(validar({ ...base, variaveis: ["conversa.canal"] }).ok).toBe(false);
  });

  it("limita a hora a 31 dias", () => {
    const hora = (periodo: unknown) => validar({ ...base, tempo: { ...base.tempo, granularidade: "hora", periodo } }).ok;
    expect(hora({ atalho: "7_dias" })).toBe(true);
    expect(hora({ atalho: "personalizado", de: "2026-01-01", ate: "2026-03-01" })).toBe(false);
    expect(hora({ atalho: "tudo" })).toBe(false);
  });

  it("recusa operador incompatível, ordenação solta e campo dinâmico inexistente", () => {
    const filtro = (campo: string, op: string, valor: unknown) => ({ condicoes: [{ campo, op, valor }] });
    expect(validar({ ...base, filtro: filtro("negocio.tem_dono", "contem", "a") }).ok).toBe(false);
    expect(validar({ ...base, filtro: filtro("negocio.titulo", "maior_que", "a") }).ok).toBe(false);
    expect(validar({ ...base, ordem: { por: "negocio.quantidade", direcao: "asc" } }).ok).toBe(false);
    expect(validar({ ...base, variaveis: ["campo:negocio:orcamento"] }).ok).toBe(false);
  });

  it("aceita campo dinâmico que a organização tem", () => {
    const doOrg = new Map<string, CampoDinamico>([
      ["campo:negocio:orcamento", { id: "campo:negocio:orcamento", nome: "Orçamento", objeto: "negocio", chave: "orcamento", tipo: "numero" }],
    ]);
    expect(validar({ ...base, variaveis: ["campo:negocio:orcamento"] }, doOrg).ok).toBe(true);
    expect(
      validar({ ...base, filtro: { condicoes: [{ campo: "campo:negocio:orcamento", op: "maior_que", valor: 10 }] } }, doOrg).ok,
    ).toBe(true);
  });
});
