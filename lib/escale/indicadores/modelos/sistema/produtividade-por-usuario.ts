import type { ModeloDoSistema } from "../tipos";
import { grafico as g } from "./construtores";

const CRIADA = "atividade.criada_em";

/** Produtividade por usuário: 9 gráficos de Atividade, Ligação, Conversa e Negócio. */
export const produtividadePorUsuario: ModeloDoSistema = {
  id: "produtividade-por-usuario",
  nome: "Produtividade por usuário",
  cor: "#263AF1",
  icone: "user",
  graficos: [
    g("concluidas", "Atividades concluídas", "numero_avancado", [0, 0, 6, 4], ["atividade.concluidas"], { tempo: [CRIADA, "este_mes"], cmp: true }),
    g("taxa_de_conclusao", "Taxa de conclusão", "painel_de_kpi", [6, 0, 6, 4], ["atividade.taxa_de_conclusao"], {
      tempo: [CRIADA, "este_mes"],
      meta: ["atividade.taxa_de_conclusao", 80],
    }),
    g("reunioes", "Reuniões realizadas", "numero_avancado", [12, 0, 6, 4], ["atividade.reunioes_realizadas"], {
      tempo: [CRIADA, "este_mes"],
      cmp: true,
    }),
    g("ligacoes", "Ligações realizadas", "numero_avancado", [18, 0, 6, 4], ["ligacao.realizadas"], {
      tempo: ["ligacao.iniciada_em", "este_mes"],
      cmp: true,
    }),
    g("concluidas_por_responsavel", "Atividades concluídas por responsável", "barra", [0, 4, 12, 8], ["atividade.concluidas"], {
      variaveis: ["atividade.responsavel"],
      tempo: [CRIADA, "este_mes"],
      ordem: ["atividade.concluidas", "desc"],
    }),
    g("reunioes_por_responsavel", "Reuniões realizadas por responsável", "ranking", [12, 4, 12, 8], ["atividade.reunioes_realizadas"], {
      variaveis: ["atividade.responsavel"],
      tempo: [CRIADA, "este_mes"],
      ordem: ["atividade.reunioes_realizadas", "desc"],
    }),
    g("atrasadas", "Atividades atrasadas por responsável", "barra", [0, 12, 12, 8], ["atividade.atrasadas"], {
      variaveis: ["atividade.responsavel"],
      ordem: ["atividade.atrasadas", "desc"],
    }),
    g("conversas_por_atendente", "Conversas atendidas por atendente", "barra", [12, 12, 12, 8], ["conversa.atribuidas"], {
      variaveis: ["conversa.atendente"],
      tempo: ["conversa.iniciada_em", "este_mes"],
      ordem: ["conversa.atribuidas", "desc"],
    }),
    g(
      "resumo_de_vendas",
      "Resumo de vendas por usuário",
      "tabela",
      [0, 20, 24, 9],
      ["negocio.ganhos", "negocio.perdidos", "negocio.soma_de_valores_ganhos", "negocio.taxa_de_conversao"],
      { variaveis: ["negocio.dono"], tempo: ["negocio.fechado_em", "este_mes"], ordem: ["negocio.ganhos", "desc"] },
    ),
  ],
};
