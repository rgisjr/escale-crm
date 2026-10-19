type T = (texto: string) => string;
const dois = (n: number) => String(n).padStart(2, "0");

/** "PAUSAR AUTOMAÇÃO" (fork Escale, Fase 3B; D4; c06, c07, c74). */
export const PRAZOS_DA_PAUSA = [
  { chave: "30m", minutos: 30, rotulo: "30 minutos" },
  { chave: "1h", minutos: 60, rotulo: "1 hora" },
  { chave: "4h", minutos: 240, rotulo: "4 horas" },
  { chave: "1d", minutos: 1440, rotulo: "1 dia" },
] as const;
export type ChaveDoPrazo = (typeof PRAZOS_DA_PAUSA)[number]["chave"];

export function fimDoPrazo(chave: ChaveDoPrazo, agora: Date): Date {
  const prazo = PRAZOS_DA_PAUSA.find((p) => p.chave === chave)!;
  return new Date(agora.getTime() + prazo.minutos * 60_000);
}

const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "20:26" hoje, "amanhã 19:56", senão dd/mm/aaaa hh:mm. */
export function textoDoFim(iso: string, agora: Date, t: T): string {
  const d = new Date(iso);
  const hora = `${dois(d.getHours())}:${dois(d.getMinutes())}`;
  if (mesmoDia(d, agora)) return hora;
  const amanha = new Date(agora);
  amanha.setDate(agora.getDate() + 1);
  if (mesmoDia(d, amanha)) return `${t("amanhã")} ${hora}`;
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${hora}`;
}

export interface PausaLeve {
  ate: string | null;
}

export const pausaVigente = (p: PausaLeve, agora: Date): boolean =>
  p.ate === null || Date.parse(p.ate) > agora.getTime();

export const seloDaPausa = (p: PausaLeve, agora: Date, t: T): string =>
  p.ate === null ? t("Até retomar") : `${t("até")} ${textoDoFim(p.ate, agora, t)}`;

export const SILENCIO_DURAVEL = "infinity";

/**
 * O `bot_silenced_until` depois de "Pausar": nunca encurta o silêncio que já
 * existe. O handoff da IA deixa "infinity"; pausar por 1 hora não pode fazer a
 * IA voltar a falar com quem espera um humano.
 */
export function silencioDaPausa(atual: string | null, ate: string | null): string {
  if (ate === null || atual === SILENCIO_DURAVEL) return SILENCIO_DURAVEL;
  if (atual !== null && Date.parse(atual) > Date.parse(ate)) return atual;
  return ate;
}

/** Os follow-ups da pausa nova somam os da anterior (ainda não retomados pelo cron). */
export const juntarEnrollments = (anteriores: readonly string[], novos: readonly string[]): string[] => [
  ...new Set([...anteriores, ...novos]),
];
