import type { DadosDeFiltroDoNegocio } from "@/lib/escale/filtros/dados-do-quadro";
import type { Lead } from "@/lib/types/leads";

/**
 * Negócio de teste da Fase 1D (filtros do quadro). `AGORA` é meio-dia UTC: longe
 * da virada do dia em qualquer fuso do Brasil, para "data de criação" não
 * depender da máquina.
 */
export const AGORA = new Date("2026-10-15T12:00:00Z");

export const horasAtras = (horas: number) => new Date(AGORA.getTime() - horas * 3_600_000).toISOString();

export function negocio(id: string, over: Partial<Lead> = {}, filtros?: Partial<DadosDeFiltroDoNegocio>): Lead {
  const base = {
    id,
    organization_id: "org-1",
    pipeline_id: "p-1",
    stage_id: "e-entrada",
    contact_id: null,
    title: `Negócio ${id}`,
    description: null,
    status: "open",
    lost_reason: null,
    position_in_stage: 1000,
    value_cents: null,
    currency: null,
    owner_user_id: null,
    owner_kind: null,
    owner_agent_id: null,
    assigned_at: null,
    last_activity_at: null,
    stage_changed_at: horasAtras(1),
    expected_close_date: null,
    closed_at: null,
    source: "manual",
    source_metadata: {},
    external_id: null,
    custom_fields: {},
    tags: [],
    created_at: horasAtras(2),
    updated_at: horasAtras(1),
    created_by_user_id: null,
  } as Lead;
  const lead = { ...base, ...over };
  if (!filtros) return lead;
  return { ...lead, filtros_escale: { atividades_concluidas: 0, contato_nome: null, contato_tem_foto: false, conversa: null, ...filtros } } as Lead;
}
