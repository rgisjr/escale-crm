import type {
  AutomationRuleRunActionResult,
  AutomationRunStatus,
} from "@/hooks/webhooks/useAutomationRules";
import { percorrer, type Desenho } from "@/lib/automation/desenho-da-regra";
import { dataEHoraBr } from "@/lib/escale/campanhas/apresentacao";

import { acoesDoGrupo, ehGrupo } from "../fluxo/grupos";
import {
  TIPO_DO_CARTAO_DO_GRUPO,
  type CartaoDeNumero,
  type FiltroDasExecucoes,
  type LinhaDaExecucao,
  type PassoDoResumo,
  type PeriodoDosInsights,
  type ReferenciaDeAcao,
  type ResultadoDoPasso,
  type ResumoDaAutomacao,
} from "./tipos";

const DIA_EM_MS = 86_400_000;
const SEM_DADO = "—";

export const PERIODOS_DOS_INSIGHTS: readonly { valor: PeriodoDosInsights; rotulo: string }[] = [
  { valor: "7d", rotulo: "Últimos 7 dias" },
  { valor: "30d", rotulo: "Últimos 30 dias" },
  { valor: "90d", rotulo: "Últimos 90 dias" },
  { valor: "tudo", rotulo: "Todo o período" },
];
export const PERIODO_PADRAO: PeriodoDosInsights = "30d";

const DIAS_DO_PERIODO: Record<Exclude<PeriodoDosInsights, "tudo">, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** ISO do começo do período (agora - N dias); null em "tudo". */
export function desdeDoPeriodo(periodo: PeriodoDosInsights, agora: Date): string | null {
  if (periodo === "tudo") return null;
  return new Date(agora.getTime() - DIAS_DO_PERIODO[periodo] * DIA_EM_MS).toISOString();
}

export const TODAS_AS_SITUACOES: readonly AutomationRunStatus[] = ["success", "partial", "failed", "adiado"];
export const TODOS_OS_RESULTADOS: readonly ResultadoDoPasso[] = ["sucesso", "erro", "esperando"];

/** I4: Execuções, Sucesso, Com erro, Esperando, Última execução (nessa ordem). */
export function cartoesDoPainel(resumo: ResumoDaAutomacao, fuso: string): CartaoDeNumero[] {
  return [
    { chave: "execucoes", rotulo: "Execuções", valor: resumo.total, filtro: { origem: "painel", situacoes: [...TODAS_AS_SITUACOES] } },
    { chave: "sucesso", rotulo: "Sucesso", valor: resumo.sucesso, filtro: { origem: "painel", situacoes: ["success"] } },
    {
      chave: "erro",
      rotulo: "Com erro",
      valor: resumo.falhou + resumo.parcial,
      filtro: { origem: "painel", situacoes: ["failed", "partial"] },
    },
    { chave: "esperando", rotulo: "Esperando", valor: resumo.adiado, filtro: { origem: "painel", situacoes: ["adiado"] } },
    {
      chave: "ultima",
      rotulo: "Última execução",
      valor: resumo.ultima ? dataEHoraBr(resumo.ultima, fuso) : SEM_DADO,
      filtro: null,
    },
  ];
}

const TIPOS_DE_ENVIO = new Set(["send_whatsapp_message", "send_email", "send_ai_message"]);

/** Os cartões de cada tipo de passo (I6): chave, rótulo e os resultados que o clique filtra. */
function modeloDosCartoes(tipoDoCartao: string): { chave: string; rotulo: string; resultados: ResultadoDoPasso[] }[] {
  if (TIPOS_DE_ENVIO.has(tipoDoCartao)) {
    return [
      { chave: "enviados", rotulo: "Enviados", resultados: ["sucesso"] },
      { chave: "esperando", rotulo: "Esperando", resultados: ["esperando"] },
      { chave: "erro", rotulo: "Erro no envio", resultados: ["erro"] },
    ];
  }
  const falha = tipoDoCartao === "call_webhook" ? "Webhook falhou" : "Com erro";
  return [
    { chave: "acionaram", rotulo: "Acionaram", resultados: [...TODOS_OS_RESULTADOS] },
    { chave: "erro", rotulo: falha, resultados: ["erro"] },
  ];
}

function somaDoPasso(linhas: readonly PassoDoResumo[], resultado: ResultadoDoPasso): number {
  return linhas.reduce(
    (total, p) => total + (resultado === "sucesso" ? p.sucesso : resultado === "erro" ? p.erro : p.esperando),
    0,
  );
}

/**
 * I5 + I6: os cartões de um passo. Soma só as linhas de `resumo.passos` com o mesmo índice E o
 * mesmo tipo de uma das ações do passo; sem linha → zeros.
 */
export function cartoesDoPasso(
  resumo: ResumoDaAutomacao,
  acoes: readonly ReferenciaDeAcao[],
  tipoDoCartao: string,
): CartaoDeNumero[] {
  const linhas = resumo.passos.filter((p) => acoes.some((a) => a.indice === p.indice && a.tipo === p.tipo));
  return modeloDosCartoes(tipoDoCartao).map((c) => ({
    chave: c.chave,
    rotulo: c.rotulo,
    valor: c.resultados.reduce((total, r) => total + somaDoPasso(linhas, r), 0),
    filtro: { origem: "passo", acoes: [...acoes], tipoDoCartao, resultados: c.resultados },
  }));
}

/** I6: um cartão "Passaram" = resumo.total (o motor só grava a execução quando as condições passam). */
export function cartaoDasCondicoes(resumo: ResumoDaAutomacao): CartaoDeNumero {
  return {
    chave: "passaram",
    rotulo: "Passaram",
    valor: resumo.total,
    filtro: { origem: "condicoes" },
    dica: "Execuções que passaram nas condições. Quem não passou não fica registrado.",
  };
}

/** I9: as opções do "Eventos" para o filtro aberto. */
export function opcoesDosEventos(filtro: FiltroDasExecucoes): { valor: string; rotulo: string }[] {
  if (filtro.origem === "painel") {
    return [
      { valor: "success", rotulo: "Sucesso" },
      { valor: "partial", rotulo: "Parcial" },
      { valor: "failed", rotulo: "Falhou" },
      { valor: "adiado", rotulo: "Aguardando envio" },
    ];
  }
  if (filtro.origem === "condicoes") return [];
  if (TIPOS_DE_ENVIO.has(filtro.tipoDoCartao)) {
    return [
      { valor: "sucesso", rotulo: "Enviados" },
      { valor: "esperando", rotulo: "Esperando" },
      { valor: "erro", rotulo: "Erro no envio" },
    ];
  }
  return [
    { valor: "sucesso", rotulo: "Concluídos" },
    { valor: "esperando", rotulo: "Esperando" },
    { valor: "erro", rotulo: filtro.tipoDoCartao === "call_webhook" ? "Webhook falhou" : "Com erro" },
  ];
}

/** As opções que o cartão clicado deixa marcadas (a lista inteira em "Execuções" e "Acionaram"). */
export function selecionadosIniciais(filtro: FiltroDasExecucoes): string[] {
  if (filtro.origem === "painel") return [...filtro.situacoes];
  if (filtro.origem === "passo") return [...filtro.resultados];
  return [];
}

/** I10: o primeiro resultado que não é `success`, com a posição; null se todos deram certo. */
export function primeiroPassoComProblema(
  resultados: readonly AutomationRuleRunActionResult[],
): { indice: number; resultado: AutomationRuleRunActionResult } | null {
  const indice = resultados.findIndex((r) => r.status !== "success");
  return indice < 0 ? null : { indice, resultado: resultados[indice]! };
}

/** I11: tem `call_webhook` com `failed` e `eventoId`. */
export function podeReenviar(linha: Pick<LinhaDaExecucao, "eventoId" | "resultados">): boolean {
  return linha.eventoId !== null && linha.resultados.some((r) => r.type === "call_webhook" && r.status === "failed");
}

/**
 * Para cada caixa de ação da tela, as ações da fila do motor que ela cobre. Um passo "Ações"
 * da casca (5B) junta várias ações seguidas; as posições vêm da fila, na ordem do `percorrer`.
 */
export function acoesDeCadaPasso(desenhoDaTela: Desenho): Map<string, ReferenciaDeAcao[]> {
  const mapa = new Map<string, ReferenciaDeAcao[]>();
  let proximo = 0;
  for (const caixa of percorrer(desenhoDaTela).fila) {
    if (caixa.data.kind !== "acao") continue;
    const tipos = ehGrupo(caixa.data) ? acoesDoGrupo(caixa.data).map((a) => a.type) : [caixa.data.acao.type];
    mapa.set(
      caixa.id,
      tipos.map((tipo) => ({ indice: proximo++, tipo })),
    );
  }
  return mapa;
}

/** O tipo dos cartões de um passo: o da ação, ou o do grupo quando a caixa é um passo "Ações". */
export function tipoDoCartaoDoPasso(acoes: readonly ReferenciaDeAcao[], ehGrupoDeAcoes: boolean): string {
  return ehGrupoDeAcoes ? TIPO_DO_CARTAO_DO_GRUPO : (acoes[0]?.tipo ?? TIPO_DO_CARTAO_DO_GRUPO);
}
