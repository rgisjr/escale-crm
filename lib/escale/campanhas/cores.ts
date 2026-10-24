import type { ChaveDoSegmento, TomDoStatus } from "./apresentacao";

/**
 * AS CORES DA LISTA DE CAMPANHAS (fork Escale, Fase 8A; N16). Os valores moram
 * em `app/escale-tema.css` (bloco da 8A, claro e escuro); aqui só as classes,
 * por valor arbitrário, como as da 1F.
 */
export const CLASSE_DO_TOM: Record<TomDoStatus, string> = {
  cinza: "bg-(--escale-tom-cinza-fundo) text-(--escale-tom-cinza-texto)",
  ciano: "bg-(--escale-tom-ciano-fundo) text-(--escale-tom-ciano-texto)",
  amarelo: "bg-(--escale-tom-amarelo-fundo) text-(--escale-tom-amarelo-texto)",
  azul: "bg-(--escale-tom-azul-fundo) text-(--escale-tom-azul-texto)",
  laranja: "bg-(--escale-tom-laranja-fundo) text-(--escale-tom-laranja-texto)",
  verde: "bg-(--escale-tom-verde-fundo) text-(--escale-tom-verde-texto)",
  granito: "bg-(--escale-tom-granito-fundo) text-(--escale-tom-granito-texto)",
  vermelho: "bg-(--escale-tom-vermelho-fundo) text-(--escale-tom-vermelho-texto)",
};

export const CLASSE_DO_SEGMENTO: Record<ChaveDoSegmento, string> = {
  erro: "bg-(--escale-campanha-erro)",
  entregues: "bg-(--escale-campanha-entregues)",
  lidos: "bg-(--escale-campanha-lidos)",
  enviados: "bg-(--escale-campanha-enviados)",
};

/** A pílula da dica usa o fundo claro do próprio segmento (008). */
export const TOM_DA_DICA_DO_SEGMENTO: Record<ChaveDoSegmento, TomDoStatus> = {
  erro: "vermelho",
  entregues: "verde",
  lidos: "verde",
  enviados: "verde",
};

export const CLASSE_DO_TRILHO = "bg-(--escale-campanha-trilho)";
