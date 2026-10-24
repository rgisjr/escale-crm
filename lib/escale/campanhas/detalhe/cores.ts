import type { ChaveDaFatia } from "./apresentacao";

/**
 * AS CORES DO DETALHE (fork Escale, Fase 8C; N17). Os valores moram em
 * `app/escale-tema.css` (bloco da 8C, claro e escuro); aqui só as classes.
 */
export const CLASSE_DA_FATIA: Record<ChaveDaFatia, { fundo: string; traco: string }> = {
  lida: { fundo: "bg-(--escale-rosca-lida)", traco: "stroke-(--escale-rosca-lida)" },
  entregue: { fundo: "bg-(--escale-rosca-entregue)", traco: "stroke-(--escale-rosca-entregue)" },
  enviado: { fundo: "bg-(--escale-rosca-enviado)", traco: "stroke-(--escale-rosca-enviado)" },
  erro: { fundo: "bg-(--escale-rosca-erro)", traco: "stroke-(--escale-rosca-erro)" },
  nao_enviado: {
    fundo: "bg-(--escale-rosca-nao-enviado)",
    traco: "stroke-(--escale-rosca-nao-enviado)",
  },
  aguardando: {
    fundo: "bg-(--escale-rosca-aguardando)",
    traco: "stroke-(--escale-rosca-aguardando)",
  },
};

export const CLASSE_DO_TRILHO_DO_FUNIL = "bg-(--escale-detalhe-trilho)";
export const TRACO_DO_TRILHO_DA_ROSCA = "stroke-(--escale-detalhe-trilho)";
