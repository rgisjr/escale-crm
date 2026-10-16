import { enxugar, type FiltrosDoQuadro } from "./tipos";

/**
 * OS SEIS GATILHOS DA BARRA DA CLINT (fork Escale, Casca V4; print da barra de
 * 15/10): Data, Campos, Tags, Dono do negócio, Status e Mais filtros. Cada um
 * mostra no selo quantos critérios tem (D4). "Mais filtros" junta o que a Clint
 * superior não mostra solto: conversa, valor, atrasados, perda, atividades e tempo.
 */
export const GATILHOS_DO_QUADRO = ["data", "campos", "tags", "dono", "status", "mais"] as const;
export type GatilhoDoQuadro = (typeof GATILHOS_DO_QUADRO)[number];

const DO_MAIS = [
  "valor",
  "atrasados",
  "motivoDePerda",
  "categoriaDePerda",
  "atividadesConcluidas",
  "tempoNaEtapa",
  "tempoDesdeEntrada",
] as const satisfies ReadonlyArray<keyof FiltrosDoQuadro>;

const CHAVES: Record<Exclude<GatilhoDoQuadro, "status">, ReadonlyArray<keyof FiltrosDoQuadro>> = {
  data: ["criadoEm", "ganhoEm", "perdidoEm"],
  campos: ["campos"],
  tags: ["tags", "modoDasTags"],
  dono: ["dono"],
  mais: ["conversa", ...DO_MAIS],
};

export function contarPorGatilho(f: FiltrosDoQuadro): Record<GatilhoDoQuadro, number> {
  const e = enxugar(f);
  return {
    data: e.criadoEm || e.ganhoEm || e.perdidoEm ? 1 : 0,
    campos: e.campos?.length ?? 0,
    tags: e.tags?.length ?? 0,
    dono: e.dono ? 1 : 0,
    status: e.status.length,
    mais:
      (e.conversa ? Object.keys(e.conversa).length : 0) +
      DO_MAIS.filter((k) => e[k] !== undefined).length,
  };
}

/** Tira os critérios de um gatilho. Status, busca e ordenação têm controle próprio e ficam. */
export function limparGatilho(
  f: FiltrosDoQuadro,
  g: Exclude<GatilhoDoQuadro, "status">,
): FiltrosDoQuadro {
  const copia: Partial<FiltrosDoQuadro> = { ...f };
  for (const chave of CHAVES[g]) delete copia[chave];
  return enxugar({ ...copia, status: f.status });
}
