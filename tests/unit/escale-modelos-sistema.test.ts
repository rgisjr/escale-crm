import { describe, expect, it } from "vitest";

import { DICIONARIO } from "@/lib/i18n/dicionario";
import { opcoesDoGraficoSchema } from "@/lib/escale/indicadores/graficos/opcoes";
import { COLUNAS_DA_GRADE, TAMANHO_MINIMO, type LayoutDoGrafico } from "@/lib/escale/indicadores/graficos/tipos";
import { ehTipoDeGrafico } from "@/lib/escale/indicadores/graficos/tipos";
import { limiteDoTipo } from "@/lib/escale/indicadores/editor/tipos-de-grafico";
import { GRAFICOS_POR_MODELO_MAX, MODELOS_IDS } from "@/lib/escale/indicadores/modelos/tipos";
import { MODELOS_DO_SISTEMA, modeloDoSistema } from "@/lib/escale/indicadores/modelos/sistema";
import { perguntaSchema, validarPergunta } from "@/lib/escale/indicadores/pergunta";

const sobrepoe = (a: LayoutDoGrafico, b: LayoutDoGrafico): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("modelos do sistema", () => {
  it("são 4, com os ids de MODELOS_IDS, e as contagens do plano", () => {
    expect(MODELOS_DO_SISTEMA.map((m) => m.id).sort()).toEqual([...MODELOS_IDS].sort());
    expect(Object.fromEntries(MODELOS_DO_SISTEMA.map((m) => [m.id, m.graficos.length]))).toEqual({
      "conversao-de-vendas": 11,
      atendimentos: 9,
      "produtividade-por-usuario": 9,
      "campanhas-de-whatsapp": 9,
    });
    expect(modeloDoSistema("x")).toBeNull();
    expect(modeloDoSistema("atendimentos")?.nome).toBe("Atendimentos");
  });

  it("nome do modelo e dos gráficos existem no dicionário com tradução es", () => {
    for (const m of MODELOS_DO_SISTEMA) {
      expect(DICIONARIO[m.nome]?.es, m.nome).toBeTruthy();
      for (const g of m.graficos) expect(DICIONARIO[g.nome]?.es, g.nome).toBeTruthy();
    }
  });

  for (const modelo of MODELOS_DO_SISTEMA) {
    describe(modelo.nome, () => {
      it("não passa de 30 gráficos, com chaves únicas e sem sobreposição na grade", () => {
        expect(modelo.graficos.length).toBeLessThanOrEqual(GRAFICOS_POR_MODELO_MAX);
        expect(new Set(modelo.graficos.map((g) => g.chave)).size).toBe(modelo.graficos.length);
        modelo.graficos.forEach((g, i) => {
          const l = g.layout;
          for (const n of [l.x, l.y, l.w, l.h]) expect(Number.isInteger(n)).toBe(true);
          expect(l.w).toBeGreaterThanOrEqual(TAMANHO_MINIMO);
          expect(l.h).toBeGreaterThanOrEqual(TAMANHO_MINIMO);
          expect(l.x + l.w).toBeLessThanOrEqual(COLUNAS_DA_GRADE);
          modelo.graficos.slice(i + 1).forEach((o) => expect(sobrepoe(l, o.layout), `${g.chave} × ${o.chave}`).toBe(false));
        });
      });

      for (const g of modelo.graficos) {
        it(`gráfico ${g.chave}: pergunta e opções válidas, tipo e limite`, () => {
          expect(ehTipoDeGrafico(g.tipo)).toBe(true);
          const lida = perguntaSchema.parse(g.pergunta);
          const validacao = validarPergunta(lida);
          expect(validacao.ok ? "ok" : validacao.erro).toBe("ok");
          expect(lida.indicadores.length + lida.calculados.length).toBeLessThanOrEqual(limiteDoTipo(g.tipo as never));
          expect(lida.filtroFixo).toBeUndefined();
          expect([...lida.indicadores, ...lida.variaveis].some((id) => id.startsWith("campo:"))).toBe(false);
          expect(opcoesDoGraficoSchema.safeParse(g.opcoes).success).toBe(true);
          const metas = (g.opcoes.metas as { itens: { indicador: string }[] } | undefined)?.itens ?? [];
          for (const m of metas) expect(lida.indicadores).toContain(m.indicador);
        });
      }
    });
  }
});
