import type { CartaoDaPassagem } from "@/lib/escalacao/cartao-da-passagem";
import type { Message, Note } from "@/lib/types/messaging";

type T = (texto: string) => string;
const dois = (n: number) => String(n).padStart(2, "0");

/**
 * OS EVENTOS DA THREAD (fork Escale, Fase 3B; C2, C4; c56). Os de atribuição
 * vêm de `conversation_assignment_events` (original); os de espera e de
 * encerramento, de `crm_eventos_da_conversa` (9202).
 */
export const TIPOS_DE_EVENTO = [
  "espera",
  "espera_removida",
  "encerrado",
  "reaberto",
  "atendente",
] as const;
export type TipoDeEvento = (typeof TIPOS_DE_EVENTO)[number];

export interface EventoDaConversa {
  id: string;
  tipo: TipoDeEvento;
  em: string;
  user_id: string | null;
  de_user_id?: string | null;
  para_user_id?: string | null;
  reason?: string;
}

export interface Parte {
  texto: string;
  forte?: boolean;
}

export interface LinhaDaAtribuicao {
  id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  changed_by: string | null;
  reason: string;
  created_at: string;
}

export function eventosDasAtribuicoes(linhas: readonly LinhaDaAtribuicao[]): EventoDaConversa[] {
  return linhas.map((l) => ({
    id: l.id,
    tipo: "atendente",
    em: l.created_at,
    user_id: l.changed_by,
    de_user_id: l.from_user_id,
    para_user_id: l.to_user_id,
    reason: l.reason,
  }));
}

const horaDe = (iso: string) => {
  const d = new Date(iso);
  return `${dois(d.getHours())}:${dois(d.getMinutes())}`;
};

export function textoDoEvento(
  e: EventoDaConversa,
  nomes: ReadonlyMap<string, string>,
  t: T,
): { partes: Parte[]; hora: string } {
  const nome = (id: string | null | undefined) =>
    id ? (nomes.get(id) ?? t("Atendente")) : t("Sem atendente");
  const hora = horaDe(e.em);
  const pessoa = { texto: nome(e.user_id), forte: true };
  switch (e.tipo) {
    case "espera":
      return { partes: [pessoa, { texto: ` ${t("colocou o atendimento em espera")}` }], hora };
    case "encerrado":
      return { partes: [pessoa, { texto: ` ${t("encerrou o atendimento")}` }], hora };
    case "reaberto":
      return { partes: [pessoa, { texto: ` ${t("reabriu o atendimento")}` }], hora };
    case "espera_removida":
      return e.user_id
        ? { partes: [pessoa, { texto: ` ${t("removeu a espera")}` }], hora }
        : { partes: [{ texto: t("O contato respondeu e a espera foi removida") }], hora };
    case "atendente":
    default:
      if (!e.de_user_id && e.para_user_id && e.reason === "claim") {
        return {
          partes: [
            { texto: nome(e.para_user_id), forte: true },
            { texto: ` ${t("iniciou o atendimento")}` },
          ],
          hora,
        };
      }
      return {
        partes: [
          { texto: `${t("O atendimento foi alterado de")} ` },
          { texto: nome(e.de_user_id), forte: true },
          { texto: ` ${t("para")} ` },
          { texto: nome(e.para_user_id), forte: true },
        ],
        hora,
      };
  }
}

export type ItemDaThread =
  | { kind: "message"; ts: string; data: Message }
  | { kind: "note"; ts: string; data: Note }
  | { kind: "passagem"; ts: string; data: CartaoDaPassagem }
  | { kind: "evento"; ts: string; data: EventoDaConversa };

export function juntarItens(
  messages: readonly Message[],
  notes: readonly Note[],
  passagens: readonly CartaoDaPassagem[],
  eventos: readonly EventoDaConversa[],
): ItemDaThread[] {
  const itens: ItemDaThread[] = [
    ...messages.map((data): ItemDaThread => ({ kind: "message", ts: data.sent_at, data })),
    ...notes.map((data): ItemDaThread => ({ kind: "note", ts: data.created_at, data })),
    ...passagens.map((data): ItemDaThread => ({ kind: "passagem", ts: data.criadoEm, data })),
    ...eventos.map((data): ItemDaThread => ({ kind: "evento", ts: data.em, data })),
  ];
  return itens.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
}

const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export function rotuloDoDia(d: Date, agora: Date, t: T): string {
  if (mesmoDia(d, agora)) return t("Hoje");
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  if (mesmoDia(d, ontem)) return t("Ontem");
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`;
}
