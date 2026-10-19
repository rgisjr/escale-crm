/**
 * A ORDEM DA FILA (fork Escale, Fase 3A; A5). "Última interação" é a ordem
 * padrão do original (`last_message_at desc`); "Esperando mais tempo" é a
 * régua da Fila do original (`ORDEM_DA_ESPERA`: `awaiting_since asc`), pedida
 * à rota como `?ordem=espera`.
 */
export const ORDENS = ["interacao", "espera"] as const;
export type Ordem = (typeof ORDENS)[number];
export const ORDEM_PADRAO: Ordem = "interacao";
export const PARAM_ORDEM = "o";

export const ROTULO_DA_ORDEM: Readonly<Record<Ordem, string>> = {
  interacao: "Última interação",
  espera: "Esperando mais tempo",
};

export function ordemDaUrl(valor: string | null | undefined): Ordem {
  return (ORDENS as readonly string[]).includes(valor ?? "") ? (valor as Ordem) : ORDEM_PADRAO;
}
