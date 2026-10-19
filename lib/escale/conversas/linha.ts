import { estaAberta } from "./presets";

type T = (texto: string) => string;
const dois = (n: number) => String(n).padStart(2, "0");

const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * A HORA DO CANTO DA LINHA (fork Escale, Fase 3A; A7): hoje "HH:mm", ontem
 * "Ontem", antes disso a data no formato brasileiro (regra 5 do CLAUDE.md:
 * dd/mm/aaaa, nunca o "12/12/2025" curto que o print 003 mostra).
 */
export function horaDaLinha(iso: string | null | undefined, agora: Date, t: T): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (mesmoDia(d, agora)) return `${dois(d.getHours())}:${dois(d.getMinutes())}`;
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  if (mesmoDia(d, ontem)) return t("Ontem");
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** ✓✓ na prévia: a última mensagem foi nossa (a lista não traz a direção, só os dois relógios). */
export function ultimaFoiNossa(c: {
  last_inbound_at: string | null;
  last_outbound_at: string | null;
}): boolean {
  if (!c.last_outbound_at) return false;
  if (!c.last_inbound_at) return true;
  return new Date(c.last_outbound_at).getTime() >= new Date(c.last_inbound_at).getTime();
}

/**
 * HÁ QUANTO TEMPO O CLIENTE ESPERA (ms): a última mensagem é dele e a conversa
 * está aberta. Fechada, ou quando a última foi nossa, não há espera.
 */
export function aguardandoHa(
  c: { status: string; last_inbound_at: string | null; last_outbound_at: string | null },
  agora: Date,
): number | null {
  if (!estaAberta(c.status) || !c.last_inbound_at || ultimaFoiNossa(c)) return null;
  const desde = new Date(c.last_inbound_at).getTime();
  return Number.isFinite(desde) ? Math.max(0, agora.getTime() - desde) : null;
}

export function previaDaLinha(c: { last_message_preview: string | null }, t: T): string {
  const texto = c.last_message_preview?.trim();
  return texto ? texto : t("Sem mensagens");
}

export function inicialDoAtendente(nome: string | null | undefined): string {
  const limpo = (nome ?? "").trim();
  return limpo ? limpo[0]!.toUpperCase() : "";
}
