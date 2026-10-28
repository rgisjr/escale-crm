"use client";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import type { TipoPrincipal } from "@/lib/escale/indicadores/graficos/tipos";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import type { Pergunta } from "@/lib/escale/indicadores/pergunta";

import { GraficoCartesiano } from "./GraficoCartesiano";
import { GraficoDePizza } from "./GraficoDePizza";
import { GraficoFunil } from "./GraficoFunil";
import { GraficoNumero } from "./GraficoNumero";
import { GraficoPainelDeKpi } from "./GraficoPainelDeKpi";
import { GraficoTabela } from "./GraficoTabela";

export type PropsDoDesenho = {
  tipo: TipoPrincipal;
  resultado: Resultado;
  pergunta: Pergunta;
  opcoes: OpcoesDoGrafico;
  /** Altura útil do corpo do card, em px. */
  altura: number;
};

/** Escolhe o desenho pelo tipo. O card do painel e a prévia do editor (7D) usam o mesmo. */
export function DesenhoDoGrafico({ tipo, resultado, pergunta, opcoes, altura }: PropsDoDesenho) {
  switch (tipo) {
    case "linha":
    case "area":
    case "barra":
    case "barra_empilhada":
      return <GraficoCartesiano tipo={tipo} resultado={resultado} pergunta={pergunta} opcoes={opcoes} altura={altura} />;
    case "pizza":
    case "donut":
      return <GraficoDePizza tipo={tipo} resultado={resultado} opcoes={opcoes} altura={altura} />;
    case "funil":
      return <GraficoFunil resultado={resultado} altura={altura} opcoes={opcoes} pergunta={pergunta} />;
    case "tabela":
      return <GraficoTabela resultado={resultado} pergunta={pergunta} opcoes={opcoes} />;
    case "numero":
      return <GraficoNumero resultado={resultado} />;
    case "painel_de_kpi":
      return <GraficoPainelDeKpi resultado={resultado} />;
  }
}
