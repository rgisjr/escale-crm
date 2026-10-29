import type { ModeloDoSistema } from "../tipos";
import { grafico as g } from "./construtores";

/** Conversão de vendas: 11 gráficos de Negócio. */
export const conversaoDeVendas: ModeloDoSistema = {
  id: "conversao-de-vendas",
  nome: "Conversão de vendas",
  cor: "marca",
  icone: "bar-chart",
  graficos: [
    g("criados", "Negócios criados", "numero_avancado", [0, 0, 6, 4], ["negocio.quantidade"], { tempo: ["negocio.criado_em", "este_mes"], cmp: true }),
    g("ganhos", "Negócios ganhos", "numero_avancado", [6, 0, 6, 4], ["negocio.ganhos"], { tempo: ["negocio.ganho_em", "este_mes"], cmp: true }),
    g("valor_ganho", "Valor ganho", "numero_avancado", [12, 0, 6, 4], ["negocio.soma_de_valores_ganhos"], {
      tempo: ["negocio.ganho_em", "este_mes"],
      cmp: true,
    }),
    g("taxa", "Taxa de conversão", "painel_de_kpi", [18, 0, 6, 4], ["negocio.taxa_de_conversao"], {
      tempo: ["negocio.fechado_em", "este_mes"],
      meta: ["negocio.taxa_de_conversao", 20],
    }),
    g("funil", "Funil por etapa", "funil", [0, 4, 12, 9], ["negocio.quantidade"], {
      variaveis: ["negocio.etapa"],
      tempo: ["negocio.criado_em", "este_mes"],
      opcoes: { funil: { calculo: "primeira_etapa", cores: "por_etapa" } },
    }),
    g("ganhos_perdidos_mes", "Ganhos e perdidos por mês", "barra", [12, 4, 12, 9], ["negocio.ganhos", "negocio.perdidos"], {
      tempo: ["negocio.fechado_em", "este_ano", "mes", true],
    }),
    g("taxa_por_origem", "Taxa de conversão por origem", "barra", [0, 13, 12, 8], ["negocio.taxa_de_conversao"], {
      variaveis: ["negocio.origem"],
      tempo: ["negocio.fechado_em", "este_mes"],
      ordem: ["negocio.taxa_de_conversao", "desc"],
    }),
    g("valor_por_vendedor", "Valor ganho por vendedor", "ranking", [12, 13, 12, 8], ["negocio.soma_de_valores_ganhos"], {
      variaveis: ["negocio.dono"],
      tempo: ["negocio.ganho_em", "este_mes"],
      ordem: ["negocio.soma_de_valores_ganhos", "desc"],
    }),
    g("motivos", "Motivos de perda", "donut", [0, 21, 8, 8], ["negocio.perdidos"], {
      variaveis: ["negocio.motivo_de_perda"],
      tempo: ["negocio.perdido_em", "este_mes"],
    }),
    g("ciclo", "Ciclo de venda por origem", "barra", [8, 21, 8, 8], ["negocio.ciclo_de_venda"], {
      variaveis: ["negocio.origem"],
      tempo: ["negocio.ganho_em", "este_mes"],
    }),
    g("ticket_mes", "Ticket médio por mês", "linha", [16, 21, 8, 8], ["negocio.ticket_medio"], {
      tempo: ["negocio.ganho_em", "este_ano", "mes", true],
    }),
  ],
};
