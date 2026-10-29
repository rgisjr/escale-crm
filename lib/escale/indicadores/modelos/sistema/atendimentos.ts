import type { ModeloDoSistema } from "../tipos";
import { grafico as g } from "./construtores";

const INICIADA = "conversa.iniciada_em";

/** Atendimentos: 9 gráficos de Conversa. */
export const atendimentos: ModeloDoSistema = {
  id: "atendimentos",
  nome: "Atendimentos",
  cor: "#48DEA8",
  icone: "smile",
  graficos: [
    g("iniciadas", "Conversas iniciadas", "numero_avancado", [0, 0, 6, 4], ["conversa.iniciadas"], { tempo: [INICIADA, "este_mes"], cmp: true }),
    g("encerradas", "Conversas encerradas", "numero_avancado", [6, 0, 6, 4], ["conversa.encerradas"], {
      tempo: ["conversa.encerrada_em", "este_mes"],
      cmp: true,
    }),
    g("primeira_resposta", "Tempo de primeira resposta", "numero_avancado", [12, 0, 6, 4], ["conversa.tempo_de_primeira_resposta"], {
      tempo: [INICIADA, "este_mes"],
      cmp: true,
    }),
    g("em_aberto", "Conversas em aberto", "numero", [18, 0, 6, 4], ["conversa.em_aberto"], { tempo: [INICIADA, "este_mes"] }),
    g("por_dia", "Conversas por dia", "linha", [0, 4, 16, 8], ["conversa.iniciadas"], { tempo: [INICIADA, "este_mes", "dia"], cmp: true }),
    g("por_canal", "Conversas por canal", "donut", [16, 4, 8, 8], ["conversa.iniciadas"], {
      variaveis: ["conversa.canal"],
      tempo: [INICIADA, "este_mes"],
    }),
    g("por_atendente", "Conversas por atendente", "barra", [0, 12, 12, 8], ["conversa.iniciadas", "conversa.encerradas"], {
      variaveis: ["conversa.atendente"],
      tempo: [INICIADA, "este_mes"],
      ordem: ["conversa.iniciadas", "desc"],
    }),
    g(
      "resposta_por_atendente",
      "Primeira resposta por atendente",
      "tabela",
      [12, 12, 12, 8],
      ["conversa.tempo_de_primeira_resposta", "conversa.respondidas_em_5_min"],
      { variaveis: ["conversa.atendente"], tempo: [INICIADA, "este_mes"] },
    ),
    g("dia_e_hora", "Conversas por dia da semana e hora", "heatmap", [0, 20, 24, 8], ["conversa.iniciadas"], {
      tempo: [INICIADA, "este_mes"],
      matriz: true,
      opcoes: { heatmap: { janela: "24h" } },
    }),
  ],
};
