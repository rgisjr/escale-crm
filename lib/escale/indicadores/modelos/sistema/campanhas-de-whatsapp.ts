import type { ModeloDoSistema } from "../tipos";
import { grafico as g } from "./construtores";

const ENVIADO = "campanha.enviado_em";

/** Campanhas de WhatsApp: 9 gráficos de Campanha. */
export const campanhasDeWhatsapp: ModeloDoSistema = {
  id: "campanhas-de-whatsapp",
  nome: "Campanhas de WhatsApp",
  cor: "#FFA959",
  icone: "mail",
  graficos: [
    g("enviados", "Mensagens enviadas", "numero_avancado", [0, 0, 6, 4], ["campanha.enviados"], { tempo: [ENVIADO, "este_mes"], cmp: true }),
    g("taxa_de_entrega", "Taxa de entrega", "numero_avancado", [6, 0, 6, 4], ["campanha.taxa_de_entrega"], { tempo: [ENVIADO, "este_mes"], cmp: true }),
    g("taxa_de_leitura", "Taxa de leitura", "numero_avancado", [12, 0, 6, 4], ["campanha.taxa_de_leitura"], { tempo: [ENVIADO, "este_mes"], cmp: true }),
    g("taxa_de_resposta", "Taxa de resposta", "numero_avancado", [18, 0, 6, 4], ["campanha.taxa_de_resposta"], {
      tempo: [ENVIADO, "este_mes"],
      cmp: true,
    }),
    g("por_dia", "Envios e respostas por dia", "linha", [0, 4, 12, 8], ["campanha.enviados", "campanha.respondidos"], {
      tempo: [ENVIADO, "este_mes", "dia"],
    }),
    g(
      "etapas_por_campanha",
      "Entregues, lidas e respondidas por campanha",
      "barra",
      [12, 4, 12, 8],
      ["campanha.enviados", "campanha.entregues", "campanha.lidos", "campanha.respondidos"],
      { variaveis: ["campanha.campanha"], tempo: [ENVIADO, "este_mes"], ordem: ["campanha.enviados", "desc"] },
    ),
    g(
      "resultado",
      "Resultado por campanha",
      "tabela",
      [0, 12, 24, 9],
      ["campanha.destinatarios", "campanha.enviados", "campanha.taxa_de_entrega", "campanha.taxa_de_leitura", "campanha.taxa_de_resposta"],
      { variaveis: ["campanha.campanha"], tempo: [ENVIADO, "este_mes"], ordem: ["campanha.enviados", "desc"] },
    ),
    g("motivos_de_exclusao", "Motivos de exclusão", "donut", [0, 21, 12, 8], ["campanha.excluidos"], {
      variaveis: ["campanha.motivo_de_exclusao"],
      tempo: ["campanha.adicionado_em", "este_mes"],
    }),
    g("erros_e_descadastros", "Erros e descadastros por campanha", "barra", [12, 21, 12, 8], ["campanha.com_erro", "campanha.descadastrados"], {
      variaveis: ["campanha.campanha"],
      tempo: [ENVIADO, "este_mes"],
    }),
  ],
};
