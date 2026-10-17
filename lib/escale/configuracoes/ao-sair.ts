/**
 * "DURANTE A ETAPA" (o nosso "ao sair") (fork Escale, Fase 1F, D6 e pergunta 7 do PRD).
 *
 * O campo exigido ao sair de uma etapa só trava o AVANÇO: ir para uma etapa
 * mais à direita, ganhar, perder ou levar para outro funil. Voltar fica livre.
 * E só trava na TELA: o arrasto do quadro (funil e Visualização) e o ⋮ do card.
 * Lote, automação, agente, API e captação passam livres, como na Clint.
 * Só vale com a casca ligada (F8): quem chama decide.
 *
 * Quem decide "preenchido" e "escondido" é o original (`validaCamposExigidos`):
 * este módulo só monta a pergunta. Para o "ao sair", ele pergunta ao original o
 * que falta "entrando" numa etapa fictícia (`ETAPA_DA_SAIDA`) em que só os
 * campos do "ao sair" da etapa atual são exigidos.
 */
import { validaCamposExigidos, type CampoFaltando } from "@/lib/leads/campos-exigidos";
import type { BoardData, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

import { TODAS_AS_ETAPAS, comoRecord, lerConfiguracoesDoFork } from "./tipos";

/** Etapa que não existe em funil nenhum: só serve de destino da pergunta. */
const ETAPA_DA_SAIDA = "00000000-0000-4000-8000-00000000a5a1";

type EtapaDoFunil = Pick<Stage, "id" | "position" | "is_won" | "is_lost">;

export function ehAvanco(etapas: readonly EtapaDoFunil[], de: string, para: string): boolean {
  if (de === para) return false;
  const destino = etapas.find((e) => e.id === para);
  const origem = etapas.find((e) => e.id === de);
  if (!destino || !origem) return false;
  if (origem.is_won || origem.is_lost) return false;
  if (destino.is_won || destino.is_lost) return true;
  return Number(destino.position) > Number(origem.position);
}

const comoLead = (lead: Lead) => lead as unknown as Record<string, unknown>;

function faltandoAoSairDe(
  settings: unknown,
  lead: Lead,
  etapaAtual: string,
  propostos: Record<string, unknown> | null,
): CampoFaltando[] {
  const { aoSair } = lerConfiguracoesDoFork(settings);
  const s = comoRecord(settings);
  const campos: unknown[] = Array.isArray(s.fields) ? s.fields : [];
  const sinteticos = campos.map((bruto) => {
    const campo = { ...comoRecord(bruto) };
    delete campo.obrigatorio_em;
    const key = typeof campo.key === "string" ? campo.key : "";
    const etapas = aoSair[key] ?? [];
    return etapas.includes(TODAS_AS_ETAPAS) || etapas.includes(etapaAtual)
      ? { ...campo, obrigatorio_em: { etapas: [ETAPA_DA_SAIDA] } }
      : campo;
  });
  return validaCamposExigidos({
    lead: comoLead(lead),
    settingsDoFunil: { fields: sinteticos },
    destino: { stageId: ETAPA_DA_SAIDA, desfecho: null },
    customFieldsPropostos: propostos,
  }).faltando;
}

function juntar(...listas: CampoFaltando[][]): CampoFaltando[] {
  const vistos = new Set<string>();
  const saida: CampoFaltando[] = [];
  for (const campo of listas.flat()) {
    if (vistos.has(campo.chave)) continue;
    vistos.add(campo.chave);
    saida.push(campo);
  }
  return saida;
}

/**
 * O que falta para o arrasto: o "ao sair" da etapa atual (se for avanço) mais o
 * que o servidor vai cobrar no destino ("ao entrar", ganho, perda e motivo do
 * ganho). Juntar os dois evita a pessoa preencher um diálogo e cair em outro.
 */
export function faltandoAoMover(movimento: {
  quadro: Pick<BoardData, "pipeline" | "stages">;
  lead: Lead;
  paraStageId: string;
  customFieldsPropostos?: Record<string, unknown> | null;
  motivoDeGanho?: string | null;
}): CampoFaltando[] {
  const { quadro, lead, paraStageId } = movimento;
  if (lead.stage_id === paraStageId) return [];
  const settings = quadro.pipeline.settings ?? null;
  const propostos = movimento.customFieldsPropostos ?? null;
  const destino = quadro.stages.find((s) => s.id === paraStageId);
  const desfecho = destino?.is_won ? "won" : destino?.is_lost ? "lost" : null;
  const naEntrada = validaCamposExigidos({
    lead: comoLead(lead),
    settingsDoFunil: settings,
    destino: { stageId: paraStageId, desfecho },
    motivoDeGanho: movimento.motivoDeGanho ?? null,
    customFieldsPropostos: propostos,
  }).faltando;
  const naSaida = ehAvanco(quadro.stages, lead.stage_id, paraStageId)
    ? faltandoAoSairDe(settings, lead, lead.stage_id, propostos)
    : [];
  return juntar(naSaida, naEntrada);
}

/**
 * O que falta para ganhar, perder ou levar para outro funil pelo ⋮ do card
 * (levar para outro funil fecha a origem como perdida). Encerrar é sempre
 * avanço. O motivo do ganho fica de fora: ele é pedido pelo fluxo de ganhar do
 * original, e o diálogo daqui só grava campos personalizados.
 */
export function faltandoAoEncerrar(entrada: {
  settings: unknown;
  stages: readonly EtapaDoFunil[];
  lead: Lead;
  desfecho: "won" | "lost";
}): CampoFaltando[] {
  const { settings, stages, lead, desfecho } = entrada;
  const atual = stages.find((s) => s.id === lead.stage_id);
  const jaEncerrado = atual ? atual.is_won || atual.is_lost : false;
  const destino = stages.find((s) => (desfecho === "won" ? s.is_won : s.is_lost));
  const naSaida = jaEncerrado ? [] : faltandoAoSairDe(settings, lead, lead.stage_id, null);
  const noDesfecho = validaCamposExigidos({
    lead: comoLead(lead),
    settingsDoFunil: settings,
    destino: { stageId: destino?.id ?? null, desfecho },
    motivoDeGanho: null,
  }).faltando.filter((campo) => campo.chave !== "won_reason");
  return juntar(naSaida, noDesfecho);
}
