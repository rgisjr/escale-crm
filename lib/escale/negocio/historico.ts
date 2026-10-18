/**
 * O HISTÓRICO DA CLINT (fork Escale, Fase 1H; C18, N12): grupos do filtro,
 * títulos e corpos dos cartões, e a busca na tela. Sem React e sem rede.
 *
 * Os 16 grupos são os da Clint (print 12). Cada um é uma lista de `type` do
 * original (enviada na rota); "Automações" não tem type próprio (o original
 * grava a ação da automação como "Sistema" com source_module webhook), então
 * filtra na tela. O antes/depois só existe para a etapa (ids no payload);
 * campos vêm só pelo nome (LGPD, doutrina do original).
 */
import { activityLabel, listaLegivel, type ActivityType } from "@/lib/leads/activity-vocabulary";
import type { TimelineItemView } from "@/lib/types/contacts";

export const PAGINA_DO_HISTORICO = 25;

export const GRUPOS_DO_HISTORICO = [
  { chave: "todos", rotulo: "Todos", tipos: "todos" },
  {
    chave: "agendamentos",
    rotulo: "Agendamentos",
    tipos: [
      "appointment_scheduled",
      "appointment_rescheduled",
      "appointment_cancelled",
      "appointment_completed",
      "appointment_no_show",
    ],
  },
  { chave: "automacoes", rotulo: "Automações", tipos: "automacoes" },
  {
    chave: "atividades",
    rotulo: "Atividades",
    tipos: [
      "task_created",
      "task_completed",
      "task_plan_applied",
      "ai_turn",
      "send_vetoed",
      "handoff_triggered",
      "handoff_resolved",
      "next_action_approved",
      "next_action_dismissed",
      "promise_unowned",
      "conversation_claimed",
      "conversation_transferred",
      "conversation_released",
      "conversation_ai_paused",
    ],
  },
  { chave: "notas", rotulo: "Notas", tipos: ["note"] },
  { chave: "email", rotulo: "Email", tipos: [] },
  {
    chave: "lembretes",
    rotulo: "Lembretes",
    tipos: [
      "followup_scheduled",
      "followup_cancelled",
      "followup_paused",
      "followup_resumed",
      "followup_snoozed",
      "followup_step_skipped",
      "reactivation_accepted",
      "reactivation_dismissed",
      "reactivation_expired",
    ],
  },
  {
    chave: "ligacao",
    rotulo: "Ligação",
    tipos: ["voice_call", "voice_call_missed", "voice_call_unanswered"],
  },
  { chave: "negocio_criado", rotulo: "Negócio criado", tipos: ["lead_created"] },
  { chave: "clique_whatsapp", rotulo: "Clique para WhatsApp", tipos: [] },
  {
    chave: "alteracoes_negocio",
    rotulo: "Alterações negócio",
    tipos: [
      "stage_changed",
      "agent_move_corrected",
      "lead_cooled",
      "lead_reactivated",
      "demand_closed",
      "moved_from_pipeline",
      "lead_disqualified",
      "lead_needs_review",
      "consent_declined",
      "proposal_drafted",
      "proposal_sent",
      "proposal_accepted",
      "proposal_declined",
      "proposal_expired",
      "proposal_value_changed",
      "proposal_followup_skipped",
      "contact_marked_personal",
      "contact_unmarked_personal",
    ],
  },
  { chave: "alteracao_de_campos", rotulo: "Alteração de campos", tipos: ["lead_edited"] },
  { chave: "integracoes", rotulo: "Integrações", tipos: [] },
  { chave: "campanhas", rotulo: "Campanhas", tipos: [] },
  { chave: "mescla_de_contatos", rotulo: "Mescla de contatos", tipos: ["contacts_merged"] },
  { chave: "anexos", rotulo: "Anexos", tipos: [] },
] as const satisfies readonly {
  chave: string;
  rotulo: string;
  tipos: readonly ActivityType[] | "todos" | "automacoes";
}[];

export type ChaveDoGrupo = (typeof GRUPOS_DO_HISTORICO)[number]["chave"];

/** null = sem filtro na rota (todos, ou automações filtradas na tela). */
export function tiposDoGrupo(chave: ChaveDoGrupo): ActivityType[] | null {
  const g = GRUPOS_DO_HISTORICO.find((x) => x.chave === chave);
  if (!g || g.tipos === "todos" || g.tipos === "automacoes") return null;
  return [...g.tipos];
}

export function ehAutomacao(item: Pick<TimelineItemView, "source_module" | "actor_kind">): boolean {
  return item.source_module === "webhook" || item.actor_kind === "rule";
}

export function grupoDoEvento(
  item: Pick<TimelineItemView, "type" | "source_module" | "actor_kind">,
): ChaveDoGrupo {
  if (ehAutomacao(item)) return "automacoes";
  for (const g of GRUPOS_DO_HISTORICO) {
    if (Array.isArray(g.tipos) && (g.tipos as readonly string[]).includes(item.type))
      return g.chave;
  }
  return "alteracoes_negocio";
}

export interface Trecho {
  texto: string;
  negrito?: boolean;
}
export interface TextoDoEvento {
  titulo: string;
  trechos: Trecho[];
}

const texto = (s: string): Trecho => ({ texto: s });
const negrito = (s: string): Trecho => ({ texto: s, negrito: true });
const campos = (item: TimelineItemView): string[] =>
  Array.isArray(item.payload?.fields) ? (item.payload.fields as unknown[]).map(String) : [];

export function textoDoEvento(
  item: TimelineItemView,
  nomesDasEtapas: Readonly<Record<string, string>>,
  t: (s: string) => string,
): TextoDoEvento {
  const reason = item.reason?.trim() ?? "";
  switch (item.type) {
    case "stage_changed": {
      const de = nomesDasEtapas[String(item.payload?.from_stage_id ?? "")];
      const para = nomesDasEtapas[String(item.payload?.to_stage_id ?? "")];
      if (de && para) {
        return {
          titulo: t("Mudou de etapa"),
          trechos: [
            texto(t("Esta oportunidade passou da etapa") + " "),
            negrito(de),
            texto(" " + t("para a etapa") + " "),
            negrito(para),
          ],
        };
      }
      return { titulo: t("Mudou de etapa"), trechos: reason ? [texto(reason)] : [] };
    }
    case "lead_edited": {
      const lista = campos(item);
      if (lista.includes("owner_user_id") || lista.includes("owner_agent_id")) {
        return { titulo: t("Mudou de usuário"), trechos: reason ? [texto(reason)] : [] };
      }
      const titulo =
        lista.length > 1 ? t("Campos do negócio alterados") : t("Campo do negócio alterado");
      return {
        titulo,
        trechos: [texto(reason || (lista.length ? `${t("Alterou")} ${listaLegivel(lista)}` : ""))],
      };
    }
    case "note":
      return { titulo: t("Nova nota"), trechos: [] };
    case "lead_created":
      return { titulo: t("Negócio criado"), trechos: reason ? [texto(reason)] : [] };
    case "moved_from_pipeline":
      return { titulo: t("Mudou de origem"), trechos: reason ? [texto(reason)] : [] };
    default:
      return { titulo: t(activityLabel(item.type)), trechos: reason ? [texto(reason)] : [] };
  }
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function casaComABusca(
  item: TimelineItemView,
  termo: string,
  t: (s: string) => string,
  nomesDasEtapas: Readonly<Record<string, string>>,
): boolean {
  const alvo = semAcento(termo.trim());
  if (!alvo) return true;
  const { titulo, trechos } = textoDoEvento(item, nomesDasEtapas, t);
  const pilha = [
    titulo,
    ...trechos.map((x) => x.texto),
    item.actor_user_name ?? "",
    item.actor_agent_name ?? "",
  ];
  return semAcento(pilha.join(" ")).includes(alvo);
}
