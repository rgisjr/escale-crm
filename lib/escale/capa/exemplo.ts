import type { NegocioComFiltros } from "@/lib/escale/filtros/dados-do-quadro";
import { buildCardInput, type CardInput } from "@/lib/kanban/card-state";

import type { CampoDaCapa } from "./tipos";

const HORA = 3_600_000;

/**
 * O negócio da PRÉ-VISUALIZAÇÃO (fork Escale, Fase 1E): o exemplo da Clint
 * (01-019) com a marca trocada. Todo campo escolhido tem valor de exemplo: na
 * prévia, a Clint mostra até os vazios.
 */
export function negocioDeExemplo(
  t: (texto: string) => string,
  campos: readonly CampoDaCapa[],
  agora: Date = new Date(),
): { lead: NegocioComFiltros; card: CardInput; nomes: Map<string, string> } {
  const ha5h = new Date(agora.getTime() - 5 * HORA).toISOString();
  const ha7min = new Date(agora.getTime() - 7 * 60_000).toISOString();
  const dona = "exemplo-ana";
  const lead: NegocioComFiltros = {
    id: "exemplo-da-capa",
    organization_id: "",
    pipeline_id: "",
    stage_id: "",
    contact_id: "exemplo-da-capa",
    title: t("Maria Silva"),
    description: null,
    status: "open",
    lost_reason: null,
    position_in_stage: 0,
    value_cents: 6_480_000,
    currency: "BRL",
    owner_user_id: dona,
    owner_kind: "user",
    owner_agent_id: null,
    assigned_at: null,
    last_activity_at: ha5h,
    stage_changed_at: ha5h,
    expected_close_date: null,
    closed_at: null,
    source: "manual",
    source_metadata: {},
    external_id: null,
    custom_fields: Object.fromEntries(
      campos.filter((c) => c.entidade === "negocio").map((c) => [c.chave, t("Exemplo")]),
    ),
    tags: ["bd-aluno", "vip"],
    conversa: {
      id: "exemplo-da-capa",
      preview: t("Oii Maria! Aqui é a Ana, posso te ajudar?"),
      last_message_at: ha7min,
      unread: 2,
    },
    contact_phone: "+5511999990000",
    contact_email: "maria@exemplo.com",
    tarefas: { abertas: 7, atrasadas: 0 },
    created_at: ha5h,
    updated_at: ha5h,
    created_by_user_id: null,
    filtros_escale: {
      atividades_concluidas: 5,
      contato_nome: t("Maria Silva"),
      contato_tem_foto: false,
      conversa: {
        status: "open",
        canal: "whatsapp",
        atendente_id: dona,
        ultima_entrada: null,
        ultima_saida: ha7min,
      },
    },
  };
  const nomes = new Map([[dona, t("Ana Souza")]]);
  return {
    lead,
    card: buildCardInput(lead, { stageName: t("Proposta"), ownerNames: nomes, now: agora }),
    nomes,
  };
}
