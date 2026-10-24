import { dataBr, dataEHoraBr, type Traduzir } from "@/lib/escale/campanhas/apresentacao";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { celula } from "@/lib/escale/exportar/csv-do-quadro";

import { ROTULO_DA_SITUACAO } from "./apresentacao";
import { textoDoMotivoDaLinha } from "./motivos";
import type { LinhaDeDestinatario } from "./tipos";

/**
 * O "BAIXAR .CSV" DO DETALHE (fork Escale, Fase 8C; N14). As colunas da aba
 * Detalhes, com o motivo e a data no formato brasileiro; `celula` guarda a
 * injeção de fórmula. O BOM entra no navegador (`baixarCsv`).
 */
export const TETO_DO_CSV = 20_000;

export const CABECALHO_DO_CSV_DA_CAMPANHA = [
  "Telefone",
  "Nome",
  "Email",
  "Status",
  "Motivo",
  "Enviado em",
] as const;

export function csvDaCampanha(
  linhas: readonly LinhaDeDestinatario[],
  t: Traduzir,
  fuso?: string,
): string {
  const cabecalho = CABECALHO_DO_CSV_DA_CAMPANHA.map((c) => t(c));
  const corpo = linhas.map((l) => [
    formatarTelefone(l.telefone),
    l.nome,
    l.email ?? "",
    t(ROTULO_DA_SITUACAO[l.situacao]),
    textoDoMotivoDaLinha(l.situacao, l.motivo, t) ?? "",
    l.enviadoEm ? dataEHoraBr(l.enviadoEm, fuso) : "",
  ]);
  return [cabecalho, ...corpo].map((linha) => linha.map(celula).join(",")).join("\r\n");
}

/** "campanha-reativacao-de-junho-2026-10-18.csv", com o dia no fuso da organização. */
export function nomeDoCsvDaCampanha(nome: string, agora: Date, fuso?: string): string {
  const slug =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "campanha";
  const [dia, mes, ano] = dataBr(agora.toISOString(), fuso).split("/");
  return `campanha-${slug}-${ano}-${mes}-${dia}.csv`;
}
