/**
 * FORK ESCALE · 5D: as recusas do publish do fluxo, na caixa da tela a que pertencem.
 * O validador fala de nós do grafo compilado (`msg__resposta`, `acao-1__2`, `fim`); a tela fala
 * de caixas. Usado ANTES de enviar (validador no navegador) e DEPOIS (o 422 do servidor).
 */
import { ApiError } from "@/lib/api/types";
import type { ProblemaDoDesenho } from "@/lib/automation/desenho-da-regra";
import type { FlowGraph } from "@/lib/followup/graph-schema";
import { validateFlowForPublish, type PublishErrorCode, type PublishValidationError } from "@/lib/followup/validate-publish";

import { ID_DO_FIM } from "./caixas";
import { idNaTela } from "./grupos";

type ErroDoPublish = Pick<PublishValidationError, "node_id" | "code" | "message">;

/** O texto da tela para os códigos cuja mensagem do validador é técnica (os outros já são legíveis). */
export const TEXTO_DA_RECUSA_DO_PUBLISH = {
  unreachable_node: "Este passo não está ligado ao gatilho. Ligue-o ao fluxo ou apague-o.",
  no_end_path: "Este caminho volta para um passo anterior e nunca chega ao fim.",
  cycle_without_wait: "Este caminho volta para trás sem um Atraso de pelo menos 5 minutos no meio.",
  long_wait_needs_template: "Depois de 24 horas de espera, o WhatsApp só aceita mensagem com modelo aprovado.",
  max_steps_exceeded: "A automação passou do número máximo de passos em sequência.",
  missing_always_fallback: "Este passo tem uma saída sem ligação. Ligue-a a outro passo.",
} as const satisfies Partial<Record<PublishErrorCode, string>>;

const TEXTOS: Partial<Record<string, string>> = TEXTO_DA_RECUSA_DO_PUBLISH;

function caixaDoNo(nodeId: string | null): string | null {
  return nodeId === null || nodeId === ID_DO_FIM ? null : idNaTela(nodeId);
}

export function problemasDoPublish(erros: readonly ErroDoPublish[]): ProblemaDoDesenho[] {
  const saida: ProblemaDoDesenho[] = [];
  for (const e of erros) {
    const problema = { caixa: caixaDoNo(e.node_id), mensagem: TEXTOS[e.code] ?? e.message };
    if (!saida.some((p) => p.caixa === problema.caixa && p.mensagem === problema.mensagem)) saida.push(problema);
  }
  return saida;
}

/** As regras do publish que não dependem do banco (etapas, mídia e janela ficam com o servidor). */
export function problemasAntesDoPublish(grafo: FlowGraph): ProblemaDoDesenho[] {
  const v = validateFlowForPublish(grafo, { surface: "crm_automation", exigeModeloForaDaJanela: false });
  return v.ok ? [] : problemasDoPublish(v.errors);
}

const ehErroDoPublish = (e: unknown): e is ErroDoPublish => {
  if (typeof e !== "object" || e === null) return false;
  const x = e as Record<string, unknown>;
  return typeof x.code === "string" && typeof x.message === "string" && (x.node_id === null || typeof x.node_id === "string");
};

const ehProblema = (p: unknown): p is ProblemaDoDesenho => {
  if (typeof p !== "object" || p === null) return false;
  const x = p as Record<string, unknown>;
  return typeof x.mensagem === "string" && (x.caixa === null || typeof x.caixa === "string");
};

/** A recusa do servidor em problemas de caixa; `null` quando o erro não traz lista (o toast de sempre vale). */
export function problemasDoServidor(err: unknown): ProblemaDoDesenho[] | null {
  if (!(err instanceof ApiError) || err.code !== "validation_failed") return null;
  const detalhes = (err.details ?? {}) as { errors?: unknown; problemas?: unknown };
  if (Array.isArray(detalhes.errors)) {
    const erros = detalhes.errors.filter(ehErroDoPublish);
    return erros.length > 0 ? problemasDoPublish(erros) : null;
  }
  if (Array.isArray(detalhes.problemas)) {
    const lidos = detalhes.problemas
      .filter(ehProblema)
      .map((p) => ({ caixa: p.caixa === null ? null : idNaTela(p.caixa), mensagem: p.mensagem }));
    return lidos.length > 0 ? lidos : null;
  }
  return null;
}
