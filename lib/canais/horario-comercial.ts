/**
 * HORÁRIO COMERCIAL DO CANAL, POR DIA DA SEMANA.
 *
 * A janela de disparo do canal (`channel_knobs`) é por hora cheia, um único intervalo e domingo sim/não, e
 * é compartilhada com o agente de IA. O horário comercial é uma terceira régua, só do envio automático
 * (regras e fluxos): por dia da semana, com mais de uma faixa por dia (o almoço fecha e reabre). Sem faixa
 * nenhuma para o canal, NÃO há restrição — quem nunca configurou nada continua enviando como sempre.
 *
 * As réguas se compõem: o envio só sai quando todas estão abertas. Esta aqui só responde "quando abre".
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { knobsDoCanal } from "@/lib/automation/janela-do-canal";

/** `diaDaSemana`: 0 = domingo … 6 = sábado. `fimMin` é exclusivo (18:00 em ponto já está fechado). */
export interface FaixaComercial {
  diaDaSemana: number;
  inicioMin: number;
  fimMin: number;
}

const MINUTOS_NO_DIA = 1440;
/** Quantos dias à frente procurar a próxima abertura: uma semana inteira e mais um. */
const DIAS_A_PROCURAR = 8;
const MAX_FAIXAS_POR_DIA = 6;

export type ValidacaoDeFaixas = { ok: true } | { ok: false; motivo: string };

export function validarFaixas(faixas: readonly FaixaComercial[]): ValidacaoDeFaixas {
  for (const f of faixas) {
    if (!Number.isInteger(f.diaDaSemana) || f.diaDaSemana < 0 || f.diaDaSemana > 6) {
      return { ok: false, motivo: `dia_invalido:${f.diaDaSemana}` };
    }
    if (!Number.isInteger(f.inicioMin) || f.inicioMin < 0 || f.inicioMin >= MINUTOS_NO_DIA) {
      return { ok: false, motivo: `inicio_invalido:${f.inicioMin}` };
    }
    if (!Number.isInteger(f.fimMin) || f.fimMin < 1 || f.fimMin > MINUTOS_NO_DIA || f.fimMin <= f.inicioMin) {
      return { ok: false, motivo: `fim_invalido:${f.fimMin}` };
    }
  }
  for (let dia = 0; dia <= 6; dia += 1) {
    const doDia = faixas.filter((f) => f.diaDaSemana === dia).sort((a, b) => a.inicioMin - b.inicioMin);
    if (doDia.length > MAX_FAIXAS_POR_DIA) return { ok: false, motivo: `faixas_demais:${dia}` };
    for (let i = 1; i < doDia.length; i += 1) {
      if (doDia[i]!.inicioMin < doDia[i - 1]!.fimMin) return { ok: false, motivo: `faixas_sobrepostas:${dia}` };
    }
  }
  return { ok: true };
}

interface RelogioDeParede {
  y: number;
  mo: number;
  d: number;
  /** Minutos desde a meia-noite local (com fração dos segundos). */
  minutos: number;
}

function relogioDeParede(instante: Date, fuso: string): RelogioDeParede {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instante);
  const num = (tipo: string): number => Number(partes.find((p) => p.type === tipo)?.value ?? "0");
  return {
    y: num("year"),
    mo: num("month"),
    d: num("day"),
    minutos: (num("hour") % 24) * 60 + num("minute") + num("second") / 60,
  };
}

/** O instante UTC cuja hora de parede no fuso é (y, mo, d, minutos) — duas passadas pelo offset, certo sob DST. */
function instanteDaParede(y: number, mo: number, d: number, minutos: number, fuso: string): Date {
  const alvoComoUtc = Date.UTC(y, mo - 1, d, 0, minutos);
  let palpite = alvoComoUtc;
  for (let i = 0; i < 2; i += 1) {
    const w = relogioDeParede(new Date(palpite), fuso);
    const palpiteComoUtc = Date.UTC(w.y, w.mo - 1, w.d, 0, Math.floor(w.minutos));
    palpite += alvoComoUtc - palpiteComoUtc;
  }
  return new Date(palpite);
}

/**
 * `null` = aberto agora, ou sem faixa configurada (sem restrição). Caso contrário, o instante em que o
 * horário comercial abre de novo.
 */
export function proximaAberturaComercial(
  agora: Date,
  fuso: string,
  faixas: readonly FaixaComercial[],
): Date | null {
  if (faixas.length === 0) return null;
  const hoje = relogioDeParede(agora, fuso);
  for (let k = 0; k < DIAS_A_PROCURAR; k += 1) {
    // Aritmética de calendário em UTC: o dia da semana não depende do fuso do servidor.
    const dia = new Date(Date.UTC(hoje.y, hoje.mo - 1, hoje.d + k));
    const doDia = faixas
      .filter((f) => f.diaDaSemana === dia.getUTCDay())
      .sort((a, b) => a.inicioMin - b.inicioMin);
    for (const f of doDia) {
      if (k === 0) {
        if (hoje.minutos >= f.inicioMin && hoje.minutos < f.fimMin) return null;
        if (hoje.minutos >= f.fimMin) continue;
      }
      return instanteDaParede(dia.getUTCFullYear(), dia.getUTCMonth() + 1, dia.getUTCDate(), f.inicioMin, fuso);
    }
  }
  // Faixas só em dias que não alcançamos em 8 dias não existe: a grade é semanal. Defensivo.
  return null;
}

interface LinhaDeFaixa {
  dia_da_semana: number;
  inicio_min: number;
  fim_min: number;
}

export async function lerHorarioComercial(
  admin: SupabaseClient,
  organizationId: string,
  channelSessionId: string,
): Promise<FaixaComercial[]> {
  const { data, error } = await admin
    .from("channel_business_hours")
    .select("dia_da_semana, inicio_min, fim_min")
    .eq("organization_id", organizationId)
    .eq("channel_session_id", channelSessionId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as LinhaDeFaixa[]).map((l) => ({
    diaDaSemana: l.dia_da_semana,
    inicioMin: l.inicio_min,
    fimMin: l.fim_min,
  }));
}

/** `null` = pode enviar agora (ou o canal não tem horário comercial). Senão, o ISO da próxima abertura. */
export async function adiarAteHorarioComercial(
  admin: SupabaseClient,
  organizationId: string,
  channelSessionId: string,
  agora: Date = new Date(),
): Promise<string | null> {
  const faixas = await lerHorarioComercial(admin, organizationId, channelSessionId);
  if (faixas.length === 0) return null;
  const { timezone } = await knobsDoCanal(admin, organizationId, channelSessionId);
  return proximaAberturaComercial(agora, timezone, faixas)?.toISOString() ?? null;
}

/** Um bloco como se escreve: "de segunda a sexta, das 09:30 às 18:00". */
export interface BlocoDeHorario {
  dias: readonly number[];
  das: string;
  ate: string;
}

const HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function minutosDe(texto: string, aceitaFimDoDia: boolean): number | null {
  if (aceitaFimDoDia && texto === "24:00") return MINUTOS_NO_DIA;
  const m = HORA.exec(texto);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Expande os blocos (vários dias por bloco, horas "HH:MM") para uma faixa por dia, já validadas. */
export function faixasDosBlocos(
  blocos: readonly BlocoDeHorario[],
): { ok: true; faixas: FaixaComercial[] } | { ok: false; motivo: string } {
  const faixas: FaixaComercial[] = [];
  for (const b of blocos) {
    const inicioMin = minutosDe(b.das, false);
    const fimMin = minutosDe(b.ate, true);
    if (inicioMin === null) return { ok: false, motivo: `hora_invalida:${b.das}` };
    if (fimMin === null) return { ok: false, motivo: `hora_invalida:${b.ate}` };
    for (const dia of new Set(b.dias)) faixas.push({ diaDaSemana: dia, inicioMin, fimMin });
  }
  const validacao = validarFaixas(faixas);
  return validacao.ok ? { ok: true, faixas } : validacao;
}
