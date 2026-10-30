import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import {
  PROBLEMAS,
  type CaixaDoDesenho,
  type Desenho,
  type ProblemaDoDesenho,
  type RegraGravada,
} from "@/lib/automation/desenho-da-regra";

/**
 * FORK ESCALE · Fase 5B: as peças puras do estado do fluxo da casca. A lógica
 * de regra (o que pode ligar, o que é problema, o corpo) é toda de
 * `lib/automation/desenho-da-regra.ts`; aqui só o que é da tela.
 */

/** A "versão salva" para o aviso de alterações: nome, dados e ligações, nunca posição (o mesmo do designer de hoje). */
export function retratoDoFluxo(nome: string, desenho: Desenho): string {
  return JSON.stringify({
    nome,
    caixas: desenho.caixas.map((c) => [c.id, c.data]),
    ligacoes: desenho.ligacoes.map((l) => [l.source, l.target]).sort(),
  });
}

export function regraGravadaDe(regra: AutomationRuleRow | null): RegraGravada | null {
  if (!regra) return null;
  return {
    trigger_event: regra.trigger_event,
    trigger_config: regra.trigger_config,
    conditions: regra.conditions,
    actions: regra.actions,
  };
}

export const TOAST_SEM_GATILHO = "É necessário configurar o gatilho para salvar a automação.";
export const TOAST_SEM_ACAO = "Para salvar a automação, conecte pelo menos uma ação ao gatilho.";
export const TOAST_RECUSA_GERAL = "A automação não foi salva. Corrija os pontos marcados nas caixas.";

/** D19: a chave do toast da recusa (as frases da Clint onde o caso é o mesmo). */
export function toastDaRecusa(problemas: readonly ProblemaDoDesenho[]): string {
  if (problemas.some((p) => p.mensagem === PROBLEMAS.semGatilho || p.mensagem === PROBLEMAS.semEvento)) {
    return TOAST_SEM_GATILHO;
  }
  if (problemas.some((p) => p.mensagem === PROBLEMAS.semAcao)) return TOAST_SEM_ACAO;
  return TOAST_RECUSA_GERAL;
}

/** Cópia profunda da caixa de ação com outro id, sem `problemas` (D14). */
export function copiaDaCaixa(caixa: CaixaDoDesenho, novoId: string): CaixaDoDesenho {
  const { problemas: _problemas, ...dados } = caixa.data;
  const data = JSON.parse(JSON.stringify(dados)) as CaixaDoDesenho["data"];
  return { id: novoId, type: caixa.type, position: { ...caixa.position }, data };
}
