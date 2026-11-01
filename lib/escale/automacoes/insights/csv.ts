import { ACTION_LABELS, type ActionType } from "@/app/app/webhooks/_components/labels";
import type { AutomationRuleRunActionResult, AutomationRunStatus } from "@/hooks/webhooks/useAutomationRules";
import { dataBr, dataEHoraBr } from "@/lib/escale/campanhas/apresentacao";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { celula } from "@/lib/escale/exportar/csv-do-quadro";

import { primeiroPassoComProblema } from "./regras";
import type { LinhaDaExecucao } from "./tipos";

/**
 * O "EXPORTAR CSV" DA LISTAGEM DE EXECUÇÕES (fork Escale, Fase 5C; I13). Os mesmos
 * filtros da listagem, na hora, até o teto; `celula` guarda a injeção de fórmula.
 */
export const TETO_DO_CSV_DAS_EXECUCOES = 5_000;

export const CABECALHO_DO_CSV_DAS_EXECUCOES = [
  "Data",
  "Contato",
  "Telefone",
  "E-mail",
  "Negócio",
  "Status",
  "Passo com problema",
  "Motivo",
] as const;

export const ROTULO_DO_STATUS_DA_EXECUCAO: Record<AutomationRunStatus, string> = {
  success: "Sucesso",
  partial: "Parcial",
  failed: "Falhou",
  adiado: "Aguardando envio",
};

export function csvDasExecucoes(
  linhas: readonly LinhaDaExecucao[],
  acoes: readonly { type: string }[],
  t: (s: string) => string,
  fuso: string,
  motivo: (r: AutomationRuleRunActionResult) => string | null,
): string {
  const cabecalho = CABECALHO_DO_CSV_DAS_EXECUCOES.map((c) => t(c));
  const corpo = linhas.map((l) => {
    const problema = primeiroPassoComProblema(l.resultados);
    const tipo = problema ? (acoes[problema.indice]?.type ?? problema.resultado.type) : "";
    const rotuloDaAcao = ACTION_LABELS[tipo as ActionType] ?? tipo;
    return [
      dataEHoraBr(l.criadaEm, fuso),
      l.contato?.nome ?? "",
      l.contato ? formatarTelefone(l.contato.telefone) : "",
      l.contato?.email ?? "",
      l.negocio?.titulo ?? "",
      t(ROTULO_DO_STATUS_DA_EXECUCAO[l.status]),
      problema ? `${problema.indice + 1}. ${t(rotuloDaAcao)}` : "",
      problema ? (motivo(problema.resultado) ?? "") : "",
    ];
  });
  return [cabecalho, ...corpo].map((linha) => linha.map(celula).join(",")).join("\r\n");
}

/** "execucoes-boas-vindas-2026-10-30.csv", com o dia no fuso da organização. */
export function nomeDoCsvDasExecucoes(nome: string, agora: Date, fuso?: string): string {
  const slug =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "automacao";
  const [dia, mes, ano] = dataBr(agora.toISOString(), fuso).split("/");
  return `execucoes-${slug}-${ano}-${mes}-${dia}.csv`;
}
