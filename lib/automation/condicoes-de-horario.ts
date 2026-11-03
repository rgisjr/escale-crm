/**
 * CONDIÇÃO "HORÁRIO ATUAL" (fork Escale · automações; Hora e Data da Clint).
 *
 * A condição mora no MESMO formato das outras (`{ field, op, value }`), para o banco, o desenho e os
 * dois editores seguirem iguais:
 *  - `field`: `agora.hora` ou `agora.data`;
 *  - `op`: `depois_de` | `antes_de` | `entre`;
 *  - `value`: um JSON pequeno. Hora: `{"de":"08:00","ate":"18:00","dias":[1,2,3,4,5]}` (`ate` só no
 *    "entre"; `dias` 0 = domingo … 6 = sábado, a régua de `lib/canais/horario-comercial.ts`; vazio =
 *    todos os dias). Data: `{"de":"2026-11-03T14:00","ate":"2026-11-10T18:00"}`, hora de parede, sem fuso.
 *
 * O relógio é o de parede da organização (o fuso dela; "(UTC -3)" na tela). "Depois de" inclui o
 * minuto escolhido; "antes de" e o fim do "entre" não incluem. Hora "entre 22:00 e 06:00" atravessa a
 * meia-noite. Valor torto é condição falsa, nunca erro.
 */
import { z } from "zod";

import { offsetEmMinutos, partesNoFuso } from "@/lib/agenda/fuso";
import { fusoUtilizavel } from "@/lib/tempo/fusos";

export const CAMPO_HORA = "agora.hora";
export const CAMPO_DATA = "agora.data";
export const CAMPOS_DE_HORARIO = [CAMPO_HORA, CAMPO_DATA] as const;
export type CampoDeHorario = (typeof CAMPOS_DE_HORARIO)[number];

export const OPERADORES_DE_HORARIO = ["depois_de", "antes_de", "entre"] as const;
export type OperadorDeHorario = (typeof OPERADORES_DE_HORARIO)[number];

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA_E_HORA = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d$/;

function dataExiste(texto: string): boolean {
  const m = DATA_E_HORA.exec(texto);
  if (!m) return false;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

const dataEHora = z.string().refine(dataExiste);

const valorDaHoraSchema = z.object({
  de: z.string().regex(HORA),
  ate: z.string().regex(HORA).optional(),
  dias: z.array(z.number().int().min(0).max(6)).max(7).default([]),
});
const valorDaDataSchema = z.object({ de: dataEHora, ate: dataEHora.optional() });

export type ValorDaHora = z.infer<typeof valorDaHoraSchema>;
export type ValorDaData = z.infer<typeof valorDaDataSchema>;

export function ehCampoDeHorario(campo: string): campo is CampoDeHorario {
  return (CAMPOS_DE_HORARIO as readonly string[]).includes(campo);
}

export function ehOperadorDeHorario(op: string): op is OperadorDeHorario {
  return (OPERADORES_DE_HORARIO as readonly string[]).includes(op);
}

function lerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/** O valor da Hora, ou `null` quando o texto gravado não fecha com o operador. */
export function lerValorDaHora(op: string, valor: string): ValorDaHora | null {
  const lido = valorDaHoraSchema.safeParse(lerJson(valor));
  if (!lido.success) return null;
  if ((op === "entre") !== (lido.data.ate !== undefined)) return null;
  if (lido.data.ate === lido.data.de) return null;
  // "Antes de 00:00" nunca é verdadeira: recusa em vez de gravar uma condição morta.
  if (op === "antes_de" && lido.data.de === "00:00") return null;
  return lido.data;
}

/** O valor da Data, ou `null` quando não fecha com o operador ou o fim não vem depois do começo. */
export function lerValorDaData(op: string, valor: string): ValorDaData | null {
  const lido = valorDaDataSchema.safeParse(lerJson(valor));
  if (!lido.success) return null;
  if ((op === "entre") !== (lido.data.ate !== undefined)) return null;
  if (lido.data.ate !== undefined && lido.data.ate <= lido.data.de) return null;
  return lido.data;
}

export function valorDeHorarioValido(campo: string, op: string, valor: string): boolean {
  if (!ehOperadorDeHorario(op)) return false;
  if (campo === CAMPO_HORA) return lerValorDaHora(op, valor) !== null;
  if (campo === CAMPO_DATA) return lerValorDaData(op, valor) !== null;
  return false;
}

const minutosDe = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const dois = (n: number): string => String(n).padStart(2, "0");

/** A condição de horário vale AGORA, no relógio de parede do fuso? */
export function avaliarCondicaoDeHorario(
  cond: { field: string; op: string; value: string },
  agora: Date,
  fuso: string,
): boolean {
  const parede = partesNoFuso(agora, fuso);
  if (cond.field === CAMPO_HORA) {
    const v = lerValorDaHora(cond.op, cond.value);
    if (!v) return false;
    const diaDaSemana = new Date(Date.UTC(parede.ano, parede.mes - 1, parede.dia)).getUTCDay();
    if (v.dias.length > 0 && !v.dias.includes(diaDaSemana)) return false;
    const minuto = parede.hora * 60 + parede.minuto;
    const de = minutosDe(v.de);
    if (cond.op === "depois_de") return minuto >= de;
    if (cond.op === "antes_de") return minuto < de;
    const ate = minutosDe(v.ate ?? v.de);
    return de < ate ? minuto >= de && minuto < ate : minuto >= de || minuto < ate;
  }
  if (cond.field === CAMPO_DATA) {
    const v = lerValorDaData(cond.op, cond.value);
    if (!v) return false;
    const agoraNaParede = `${parede.ano}-${dois(parede.mes)}-${dois(parede.dia)}T${dois(parede.hora)}:${dois(parede.minuto)}`;
    if (cond.op === "depois_de") return agoraNaParede >= v.de;
    if (cond.op === "antes_de") return agoraNaParede < v.de;
    return agoraNaParede >= v.de && agoraNaParede < (v.ate ?? v.de);
  }
  return false;
}

/** "(UTC -3)": o deslocamento do fuso neste instante, como a Clint mostra embaixo do horário. */
export function rotuloDoFuso(fuso: string, agora: Date = new Date()): string {
  // Fuso gravado inválido cai no padrão (a mesma régua do motor), nunca derruba a tela.
  const total = offsetEmMinutos(agora, fusoUtilizavel(fuso));
  const sinal = total < 0 ? "-" : "+";
  const abs = Math.abs(total);
  const resto = abs % 60;
  return `(UTC ${sinal}${Math.floor(abs / 60)}${resto ? `:${dois(resto)}` : ""})`;
}
