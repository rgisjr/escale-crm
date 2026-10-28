/**
 * As variáveis do catálogo que têm ordem natural (a etapa na ordem do quadro, 7D S10). O navegador não
 * carrega o catálogo (tem SQL); um teste confere esta lista contra ele.
 */
export const IDS_COM_ORDEM_NATURAL: readonly string[] = [
  "negocio.etapa",
  "negocio.etapa_da_perda",
  "historico.etapa_de_origem",
  "historico.etapa_de_destino",
  "atividade.etapa",
];

export const temOrdemNatural = (primeiraVariavel: string | undefined): boolean =>
  primeiraVariavel !== undefined && IDS_COM_ORDEM_NATURAL.includes(primeiraVariavel);
