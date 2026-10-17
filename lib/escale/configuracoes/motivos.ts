/**
 * MOTIVOS DE PERDA COMO NA CLINT (Fase 1F, D5; `LostReasonTab` da Clint).
 *
 * Na Clint os motivos são um catálogo da organização, e cada origem escolhe
 * quais valem para ela (os chips do seletor, e "N Motivos de perda selecionados").
 * Aqui o catálogo é a união dos `lost_reasons` de todas as origens. O que vale
 * nesta origem é o que está no `lost_reasons` dela e não está em
 * `escale_motivos_inativos`.
 *
 * Desligar não apaga: o rótulo fica no `lost_reasons` (o banco e as métricas
 * continuam aceitando, negócio antigo segue válido) e entra nos inativos.
 * Ligar um motivo de outra origem o acrescenta no fim do `lost_reasons` daqui.
 */
import { CHAVE_DOS_INATIVOS, comoRecord, textos } from "./tipos";

export const MOTIVOS_MAX = 50;

export interface MotivoDoCatalogo {
  rotulo: string;
  selecionado: boolean;
  /** Está no `lost_reasons` desta origem (mesmo desligado). */
  daOrigem: boolean;
}

const chave = (texto: string) => texto.trim().toLowerCase();

export function rotuloDoMotivo(item: unknown): string | null {
  const bruto = typeof item === "string" ? item : comoRecord(item).label;
  if (typeof bruto !== "string") return null;
  const rotulo = bruto.trim();
  return rotulo.length > 0 ? rotulo : null;
}

function rotulosDe(settings: unknown): string[] {
  const lista = comoRecord(settings).lost_reasons;
  return (Array.isArray(lista) ? lista : [])
    .map(rotuloDoMotivo)
    .filter((r): r is string => r !== null);
}

/** Os desta origem na ordem dela, depois os das outras em ordem alfabética. Sem repetir. */
export function catalogoDeMotivos(
  settingsDaOrigem: unknown,
  settingsDeTodas: readonly unknown[],
): MotivoDoCatalogo[] {
  const inativos = new Set(textos(comoRecord(settingsDaOrigem)[CHAVE_DOS_INATIVOS]).map(chave));
  const vistos = new Set<string>();
  const saida: MotivoDoCatalogo[] = [];
  for (const rotulo of rotulosDe(settingsDaOrigem)) {
    if (vistos.has(chave(rotulo))) continue;
    vistos.add(chave(rotulo));
    saida.push({ rotulo, selecionado: !inativos.has(chave(rotulo)), daOrigem: true });
  }
  const deFora = settingsDeTodas
    .flatMap(rotulosDe)
    .filter((r) => !vistos.has(chave(r)))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  for (const rotulo of deFora) {
    if (vistos.has(chave(rotulo))) continue;
    vistos.add(chave(rotulo));
    saida.push({ rotulo, selecionado: false, daOrigem: false });
  }
  return saida;
}

export function semMotivosInativos(motivos: readonly string[], settings: unknown): string[] {
  const inativos = new Set(textos(comoRecord(settings)[CHAVE_DOS_INATIVOS]).map(chave));
  return inativos.size === 0 ? [...motivos] : motivos.filter((m) => !inativos.has(chave(m)));
}

export type VereditoDosMotivos =
  { ok: true; lostReasons: unknown[]; inativos: string[] } | { ok: false; erro: string };

export function gravarMotivos(
  settings: unknown,
  selecionados: readonly string[],
  novos: readonly string[],
): VereditoDosMotivos {
  const ligados = new Set([...selecionados, ...novos].map(chave).filter((k) => k.length > 0));
  if (ligados.size === 0)
    return { ok: false, erro: "Para continuar selecione ao menos um motivo de perda." };
  const lista = comoRecord(settings).lost_reasons;
  const lostReasons: unknown[] = Array.isArray(lista) ? [...lista] : [];
  const presentes = new Map<string, string>();
  for (const item of lostReasons) {
    const rotulo = rotuloDoMotivo(item);
    if (rotulo && !presentes.has(chave(rotulo))) presentes.set(chave(rotulo), rotulo);
  }
  for (const bruto of [...selecionados, ...novos]) {
    const rotulo = bruto.trim();
    if (rotulo.length === 0 || presentes.has(chave(rotulo))) continue;
    presentes.set(chave(rotulo), rotulo);
    lostReasons.push(rotulo);
  }
  if (lostReasons.length > MOTIVOS_MAX)
    return { ok: false, erro: "Uma origem tem no máximo 50 motivos de perda." };
  const inativos = [...presentes.entries()]
    .filter(([k]) => !ligados.has(k))
    .map(([, rotulo]) => rotulo);
  return { ok: true, lostReasons, inativos };
}
