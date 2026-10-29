import { opcoesDoGraficoNovo } from "../../graficos/opcoes";
import type { Granularidade, Pergunta } from "../../pergunta";
import type { GraficoDoModelo } from "../tipos";

type Atalho = NonNullable<Pergunta["tempo"]>["periodo"]["atalho"];
/** [campo de tempo, atalho do período, granularidade?, fixo?] */
type Tempo = readonly [campo: string, atalho: Atalho, granularidade?: Granularidade, fixo?: boolean];
interface Extras {
  variaveis?: readonly string[];
  tempo?: Tempo;
  /** Comparação com o período anterior (`equivalente`). */
  cmp?: boolean;
  ordem?: readonly [por: string, direcao: "asc" | "desc"];
  /** Meta única do indicador (Painel de KPI). */
  meta?: readonly [indicador: string, valor: number];
  matriz?: boolean;
  opcoes?: Record<string, unknown>;
}

/** Monta um gráfico de modelo; `x,y,w,h` = layout na grade de 24 colunas. */
export function grafico(
  chave: string,
  nome: string,
  tipo: string,
  [x, y, w, h]: readonly [number, number, number, number],
  indicadores: readonly string[],
  e: Extras = {},
): GraficoDoModelo {
  const { visualizacao } = opcoesDoGraficoNovo();
  return {
    chave,
    nome,
    tipo,
    layout: { x, y, w, h },
    pergunta: {
      indicadores: [...indicadores],
      variaveis: [...(e.variaveis ?? [])],
      ...(e.tempo
        ? {
            tempo: {
              campo: e.tempo[0],
              periodo: { atalho: e.tempo[1] },
              ...(e.tempo[2] ? { granularidade: e.tempo[2] } : {}),
              fixo: e.tempo[3] ?? false,
            },
          }
        : {}),
      ...(e.cmp ? { comparacao: { modo: "equivalente" as const } } : {}),
      ...(e.ordem ? { ordem: { por: e.ordem[0], direcao: e.ordem[1] } } : {}),
      ...(e.matriz ? { matrizDeTempo: true } : {}),
    },
    opcoes: {
      visualizacao,
      ...(e.meta ? { metas: { ligadas: true, itens: [{ indicador: e.meta[0], valor: e.meta[1], visivel: true }] } } : {}),
      ...e.opcoes,
    },
  };
}
