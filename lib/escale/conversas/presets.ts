import type { StatusDeConversa } from "@/hooks/inbox/useConversationsRealtime";

import type { Ordem } from "./ordem";

/**
 * OS PRESETS DA FILA (fork Escale, Fase 3A; A4 e seção 6 do PRD de Conversas).
 *
 * São os da Clint ("Todos", "Não lidas", e os quatro de STATUS) sobre o mapa
 * de status do original: "Em aberto" é open/pending/claimed/ai_handling sem
 * espera vigente; "Em espera" é o snooze do original ainda valendo (decisão 2
 * da seção 9); "Fechadas" é closed/resolved. Automático e Fila (abas do
 * original) ficam fora da casca (A14): a conversa roteada aparece em "Em
 * aberto" sem atendente.
 */
export const PRESETS = [
  "todos",
  "nao_lidas",
  "meus_em_aberto",
  "em_aberto",
  "em_espera",
  "fechadas",
] as const;
export type Preset = (typeof PRESETS)[number];
export const PRESET_PADRAO: Preset = "todos";
/** `?v=` na URL (como `?filter=` do original): o preset é onde a pessoa está. */
export const PARAM_PRESET = "v";

export const ROTULO_DO_PRESET: Readonly<Record<Preset, string>> = {
  todos: "Todos",
  nao_lidas: "Não lidas",
  meus_em_aberto: "Meus em aberto",
  em_aberto: "Em aberto",
  em_espera: "Em espera",
  fechadas: "Fechadas",
};

/** O grupo "STATUS" do menu (c31); os dois primeiros ficam fora de grupo. */
export const PRESETS_DE_STATUS: readonly Preset[] = [
  "meus_em_aberto",
  "em_aberto",
  "em_espera",
  "fechadas",
];

export const STATUS_ABERTOS: readonly StatusDeConversa[] = [
  "open",
  "pending",
  "claimed",
  "ai_handling",
];
export const STATUS_FECHADOS: readonly StatusDeConversa[] = ["closed", "resolved"];

/**
 * O que a fila pede à rota do original. `snoozed` e `ordem` são os dois
 * parâmetros que a 3A acrescenta ao schema (`listConversationsQuerySchema`).
 * A 3D soma aqui os critérios do painel de filtros.
 */
export interface FiltrosDaFila {
  status?: readonly StatusDeConversa[];
  assigned_to?: "me";
  unread?: boolean;
  snoozed?: boolean;
  search?: string;
  ordem?: Ordem;
}

export function filtrosDoPreset(preset: Preset): FiltrosDaFila {
  switch (preset) {
    case "nao_lidas":
      return { unread: true };
    case "meus_em_aberto":
      return { assigned_to: "me", status: STATUS_ABERTOS, snoozed: false };
    case "em_aberto":
      return { status: STATUS_ABERTOS, snoozed: false };
    case "em_espera":
      return { status: STATUS_ABERTOS, snoozed: true };
    case "fechadas":
      return { status: STATUS_FECHADOS };
    case "todos":
    default:
      return {};
  }
}

export function presetDaUrl(valor: string | null | undefined): Preset {
  return (PRESETS as readonly string[]).includes(valor ?? "") ? (valor as Preset) : PRESET_PADRAO;
}

export function emEspera(c: { snooze_until: string | null }, agora: Date = new Date()): boolean {
  if (!c.snooze_until) return false;
  const ate = new Date(c.snooze_until).getTime();
  return Number.isFinite(ate) ? ate > agora.getTime() : c.snooze_until === "infinity";
}

export const estaAberta = (status: string): boolean =>
  (STATUS_ABERTOS as readonly string[]).includes(status);
