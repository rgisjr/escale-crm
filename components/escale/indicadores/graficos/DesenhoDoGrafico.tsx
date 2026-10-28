"use client";
import type { Clique } from "@/lib/escale/indicadores/graficos/detalhamento";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import type { TipoDeGrafico } from "@/lib/escale/indicadores/graficos/tipos";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import type { Pergunta } from "@/lib/escale/indicadores/pergunta";

import { GraficoCartesiano } from "./GraficoCartesiano";
import { GraficoDePizza } from "./GraficoDePizza";
import { GraficoDivisor } from "./GraficoDivisor";
import { GraficoFunil } from "./GraficoFunil";
import { GraficoHeatmap } from "./GraficoHeatmap";
import { GraficoNumero } from "./GraficoNumero";
import { GraficoNumeroAvancado } from "./GraficoNumeroAvancado";
import { GraficoPainelDeKpi } from "./GraficoPainelDeKpi";
import { GraficoRanking } from "./GraficoRanking";
import { GraficoSankey } from "./GraficoSankey";
import { GraficoTabela } from "./GraficoTabela";

export type PropsDoDesenho = {
  tipo: TipoDeGrafico;
  resultado: Resultado;
  pergunta: Pergunta;
  opcoes: OpcoesDoGrafico;
  /** Altura útil do corpo do card, em px. */
  altura: number;
  /** Fase 7E (T19): o clique num ponto abre o detalhamento (só no painel; a prévia do editor não passa). */
  aoClicarNoPonto?: (clique: Clique) => void;
  /** O nome do gráfico, para o Divisor. */
  nome?: string;
};

/** Escolhe o desenho pelo tipo. O card do painel e a prévia do editor (7D) usam o mesmo. */
export function DesenhoDoGrafico({ tipo, resultado, pergunta, opcoes, altura, aoClicarNoPonto, nome }: PropsDoDesenho) {
  switch (tipo) {
    case "linha":
    case "area":
    case "barra":
    case "barra_empilhada":
    case "barra_100":
      return (
        <GraficoCartesiano
          tipo={tipo}
          resultado={resultado}
          pergunta={pergunta}
          opcoes={opcoes}
          altura={altura}
          {...(aoClicarNoPonto ? { aoClicarNoPonto } : {})}
        />
      );
    case "pizza":
    case "donut":
      return (
        <GraficoDePizza
          tipo={tipo}
          resultado={resultado}
          opcoes={opcoes}
          altura={altura}
          {...(aoClicarNoPonto ? { aoClicarNoPonto } : {})}
        />
      );
    case "funil":
      return (
        <GraficoFunil
          resultado={resultado}
          altura={altura}
          opcoes={opcoes}
          pergunta={pergunta}
          {...(aoClicarNoPonto ? { aoClicarNoPonto } : {})}
        />
      );
    case "tabela":
      return <GraficoTabela resultado={resultado} pergunta={pergunta} opcoes={opcoes} />;
    case "numero":
      return <GraficoNumero resultado={resultado} {...(aoClicarNoPonto ? { aoClicarNoPonto } : {})} />;
    case "painel_de_kpi":
      return <GraficoPainelDeKpi resultado={resultado} opcoes={opcoes} {...(aoClicarNoPonto ? { aoClicarNoPonto } : {})} />;
    case "ranking":
      return <GraficoRanking resultado={resultado} opcoes={opcoes} {...(aoClicarNoPonto ? { aoClicarNoPonto } : {})} />;
    case "numero_avancado":
      return <GraficoNumeroAvancado resultado={resultado} opcoes={opcoes} {...(aoClicarNoPonto ? { aoClicarNoPonto } : {})} />;
    case "heatmap":
      return <GraficoHeatmap resultado={resultado} opcoes={opcoes} {...(aoClicarNoPonto ? { aoClicarNoPonto } : {})} />;
    case "sankey":
      return <GraficoSankey resultado={resultado} altura={altura} />;
    case "divisor":
      return <GraficoDivisor nome={nome ?? ""} />;
  }
}
