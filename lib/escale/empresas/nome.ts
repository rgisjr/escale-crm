/** O nome que a casca mostra para uma empresa: o fantasia, senão a razão social. */
export const nomeDaEmpresa = (e: { trade_name: string | null; legal_name: string | null }) =>
  (e.trade_name?.trim() || e.legal_name?.trim() || "").trim();
