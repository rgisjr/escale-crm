import { describe, expect, it } from "vitest";

import { camposDinamicos, lerCampoDinamico } from "@/lib/escale/indicadores/catalogo/campos-personalizados";
import { CATALOGO, assuntoDe, buscar, medidaPorId } from "@/lib/escale/indicadores/catalogo";
import type { Assunto } from "@/lib/escale/indicadores/catalogo/tipos";

const fragmentosDe = (a: Assunto): string[] => [
  ...a.medidas.map((m) => m.sql),
  ...a.dimensoes.flatMap((d) => [d.sql, d.rotuloSql ?? ""]),
  ...a.tempos.map((t) => t.sql),
  ...a.colunasDoDetalhamento.map((c) => c.sql),
  ...Object.values(a.filtroDoPainel).map((f) => f!.sql),
  ...Object.values(a.camposPersonalizados).map((f) => f!.sql),
];

const aliasesDe = (a: Assunto): Set<string> => new Set([a.base.alias, ...Object.keys(a.joins)]);

describe("catálogo de indicadores", () => {
  it("tem ids únicos com o prefixo do assunto", () => {
    const ids = CATALOGO.flatMap((a) => [
      ...a.medidas.map((m) => m.id),
      ...a.dimensoes.map((d) => d.id),
      ...a.tempos.map((t) => t.id),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of CATALOGO) {
      for (const id of [...a.medidas, ...a.dimensoes, ...a.tempos].map((x) => x.id)) {
        expect(id.startsWith(`${a.id}.`)).toBe(true);
      }
    }
  });

  it("só usa aliases declarados nos fragmentos", () => {
    for (const a of CATALOGO) {
      const validos = aliasesDe(a);
      for (const sql of fragmentosDe(a)) {
        for (const achado of sql.matchAll(/\b([a-z]{1,3})\.[a-z_]+/g)) {
          expect(validos.has(achado[1]), `${a.id}: alias ${achado[1]} em ${sql}`).toBe(true);
        }
      }
    }
  });

  it("não deixa $, ; nem -- nos fragmentos (exceto o marcador $fuso)", () => {
    for (const a of CATALOGO) {
      const todos = [...fragmentosDe(a), ...Object.values(a.joins).map((j) => j.sql)];
      for (const sql of todos) {
        expect(sql.replace(/\$fuso/g, "")).not.toMatch(/[$;]|--/);
      }
    }
  });

  it("precisa dos aliases que existem e junta o que cada join exige", () => {
    for (const a of CATALOGO) {
      const validos = aliasesDe(a);
      const itens = [
        ...a.medidas,
        ...a.dimensoes,
        ...a.tempos,
        ...a.colunasDoDetalhamento,
        ...Object.values(a.filtroDoPainel),
        ...Object.values(a.joins),
      ];
      for (const item of itens) for (const al of item!.precisa ?? []) expect(validos.has(al)).toBe(true);
    }
  });

  it("documenta toda medida e marca a moeda onde há value_cents", () => {
    for (const a of CATALOGO) {
      for (const m of a.medidas) {
        expect(m.descricao.length).toBeGreaterThan(5);
        expect(m.apelidos.length).toBeGreaterThanOrEqual(2);
        expect(m.perguntas.length).toBeGreaterThanOrEqual(2);
        if (m.sql.includes("value_cents")) expect(m.moeda, m.id).toBe(true);
      }
    }
  });

  it("tem exatamente um tempo padrão por assunto", () => {
    for (const a of CATALOGO) expect(a.tempos.filter((t) => t.padrao)).toHaveLength(1);
  });

  it("tem os 9 assuntos com as contagens do plano", () => {
    const contagem = (id: string) => {
      const a = assuntoDe(`${id}.x`)!;
      return [a.medidas.length, a.dimensoes.length, a.tempos.length];
    };
    expect(CATALOGO).toHaveLength(9);
    expect(contagem("negocio")).toEqual([21, 13, 7]);
    expect(contagem("historico")[0]).toBe(5);
    expect(contagem("atividade")).toEqual([10, 9, 3]);
    expect(contagem("conversa")).toEqual([13, 8, 4]);
    expect(contagem("mensagem")).toEqual([8, 10, 1]);
    expect(contagem("contato")).toEqual([8, 6, 2]);
    expect(contagem("empresa")).toEqual([5, 6, 2]);
    expect(contagem("ligacao")).toEqual([8, 7, 2]);
    expect(contagem("campanha")).toEqual([12, 8, 4]);
    expect(CATALOGO.reduce((n, a) => n + a.medidas.length, 0)).toBe(90);
  });

  it("conversa não aceita origem no filtro do painel", () => {
    expect(assuntoDe("conversa.x")!.filtroDoPainel.origem).toBeUndefined();
    expect(assuntoDe("negocio.x")!.filtroDoPainel.origem).toBeDefined();
  });

  it("acha a medida pela pergunta e resolve ids", () => {
    expect(buscar("ganhei").some((r) => r.medidas.some((m) => m.id === "negocio.ganhos"))).toBe(true);
    expect(medidaPorId("negocio.taxa_de_conversao")!.medida.unidade).toBe("percentual");
    expect(assuntoDe("campo:negocio:x")).toBeNull();
    expect(medidaPorId("negocio.inexistente")).toBeNull();
  });
});

describe("campos personalizados", () => {
  const catalogo = {
    grupos: [],
    campos: [
      { id: "1", objeto: "negocio", chave: "orcamento", definicao: { label: "Orçamento", type: "number" }, grupo_id: null, papel_minimo: null, posicao: 0, padrao: false },
      { id: "2", objeto: "negocio", chave: "visita", definicao: { label: "Visita", type: "date" }, grupo_id: null, papel_minimo: null, posicao: 1, padrao: false },
      { id: "3", objeto: "negocio", chave: "tipo", definicao: { label: "Tipo", type: "select", options: [{ value: "a", label: "A" }] }, grupo_id: null, papel_minimo: null, posicao: 2, padrao: false },
    ],
  } as unknown as Parameters<typeof camposDinamicos>[1];

  it("mapeia o tipo e as opções", () => {
    const [num, data, sel] = camposDinamicos("negocio", catalogo);
    expect(num).toMatchObject({ id: "campo:negocio:orcamento", tipo: "numero" });
    expect(data.tipo).toBe("data");
    expect(sel.opcoes).toHaveLength(1);
  });

  it("lê só o formato válido", () => {
    expect(lerCampoDinamico("campo:contato:cargo")).toEqual({ objeto: "contato", chave: "cargo" });
    expect(lerCampoDinamico("campo:x:y")).toBeNull();
    expect(lerCampoDinamico("campo:negocio:a;b")).toBeNull();
  });
});
