/** O período, o agrupamento e a largura da lateral do editor (fork Escale, Fase 7D). */
import { formatarDataBr } from "@/lib/escale/ui/periodos";

import { DIAS_MAX_POR_HORA } from "../catalogo/tipos";
import { diasDoPeriodo, type Granularidade, type Periodo } from "../pergunta";

/** 10-054. */
export const ATALHOS_DO_EDITOR = ["tudo", "hoje", "ontem", "7_dias", "15_dias", "1_mes", "este_mes", "personalizado"] as const;
export const ROTULO_DO_ATALHO_DO_EDITOR: Record<Periodo["atalho"], string> = {
  tudo: "Tudo",
  hoje: "Hoje",
  ontem: "Ontem",
  "7_dias": "7 dias",
  "15_dias": "15 dias",
  "1_mes": "1 mês",
  esta_semana: "Essa semana",
  semana_passada: "Semana passada",
  este_mes: "Este mês",
  mes_passado: "Mês passado",
  este_ano: "Esse ano",
  personalizado: "Personalizado",
};
/** S12: "Trimestre" (a Clint escreve "Quadrimestre", mas calcula 3 meses). */
export const ROTULO_DA_GRANULARIDADE: Record<Granularidade | "nenhuma", string> = {
  nenhuma: "Sem agrupamento",
  hora: "Hora",
  dia: "Dia",
  semana: "Semana",
  mes: "Mês",
  trimestre: "Trimestre",
  ano: "Ano",
};
export const GRANULARIDADES_DO_EDITOR: ReadonlyArray<Granularidade | null> = [null, "hora", "dia", "semana", "mes", "trimestre", "ano"];

export const periodoPadrao = (): Periodo => ({ atalho: "este_mes" });

/** Hora só com 1 a 31 dias (tudo não tem fim). */
export function horaDisponivel(p: Periodo): boolean {
  const dias = diasDoPeriodo(p);
  return dias !== null && dias >= 1 && dias <= DIAS_MAX_POR_HORA;
}

export function granularidadesDisponiveis(p: Periodo): ReadonlyArray<{ g: Granularidade | null; ligada: boolean }> {
  return GRANULARIDADES_DO_EDITOR.map((g) => ({ g, ligada: g !== "hora" || horaDisponivel(p) }));
}

/** "01/11/2025 - 30/11/2025". */
export function textoDoPersonalizado(p: Periodo): string {
  return p.de && p.ate ? `${formatarDataBr(p.de)} - ${formatarDataBr(p.ate)}` : "";
}
