/** Regras do card do gráfico (Fase 7C) — puras. */
import type { Resultado } from "../motor/executar";
import type { Pergunta } from "../pergunta";
import { semDados } from "./dados";
import { GRAFICOS_POR_PAINEL_MAX, type LayoutDoGrafico, type TipoPrincipal } from "./tipos";

/** Material seção 6: h × 40 + (h − 1) × 12 − 37. */
export const alturaUtil = (h: number): number => h * 40 + (h - 1) * 12 - 37;
/** Abaixo disso, some o ícone do vazio. */
export const MOSTRA_ICONE_DO_VAZIO = 90;
/** Abaixo disso, some "Tente um intervalo maior.". */
export const MOSTRA_2A_LINHA_DO_VAZIO = 60;

export type EstadoDaData = "aplicado" | "nao_se_aplica" | "fixado";
export function estadoDaData(p: Pergunta | null): EstadoDaData {
  if (!p?.tempo) return "nao_se_aplica";
  return p.tempo.fixo ? "fixado" : "aplicado";
}

export const podeAdicionar = (quantos: number): boolean => quantos < GRAFICOS_POR_PAINEL_MAX;

export type EstadoDoResultado = "invisivel" | "carregando" | "erro" | "moedas" | "vazio" | "pronto";
const NUNCA_VAZIOS: readonly TipoPrincipal[] = ["numero", "painel_de_kpi"];

export function estadoDoResultado(a: {
  apareceu: boolean;
  carregando: boolean;
  erro: unknown;
  resultado?: Resultado | undefined;
  tipo: TipoPrincipal;
}): EstadoDoResultado {
  if (!a.apareceu) return "invisivel";
  if (a.erro) return "erro";
  if (!a.resultado) return "carregando";
  if (a.resultado.avisos.includes("moedas_diferentes")) return "moedas";
  if (semDados(a.resultado) && !NUNCA_VAZIOS.includes(a.tipo)) return "vazio";
  return "pronto";
}

/** Novo item no fim da grade (Duplicar): x = 0, y = o maior (y + h). */
export function posicaoNoFim(layouts: readonly LayoutDoGrafico[], w: number, h: number): LayoutDoGrafico {
  return { x: 0, y: layouts.reduce((fim, l) => Math.max(fim, l.y + l.h), 0), w, h };
}

/** Só os itens cujo x, y, w ou h mudou (R6). */
export function layoutsMudados(
  antes: ReadonlyArray<{ id: string; layout: LayoutDoGrafico }>,
  depois: ReadonlyArray<{ i: string } & LayoutDoGrafico>,
): Array<{ id: string } & LayoutDoGrafico> {
  const anterior = new Map(antes.map((g) => [g.id, g.layout]));
  return depois.flatMap((d) => {
    const a = anterior.get(d.i);
    if (!a || (a.x === d.x && a.y === d.y && a.w === d.w && a.h === d.h)) return [];
    return [{ id: d.i, x: d.x, y: d.y, w: d.w, h: d.h }];
  });
}
