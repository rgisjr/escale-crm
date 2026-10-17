/**
 * ALERTA DE TEMPO NA ETAPA, NO MODELO DA CLINT (Fase 1F, D7 e B16).
 *
 * Igual a `settings.stage_time_alerts` da Clint (`index-CTaP4T6N.js`): uma regra
 * geral e exceções por etapa, cada limite com valor e unidade próprios (minutos,
 * horas, dias). Um dos dois limites pode faltar. O tempo é o PARADO na etapa
 * (`stage_changed_at`, a mesma conta do card), não o silêncio da conversa.
 *
 * Os textos de erro são os da Clint (`StageTimeAlerts.*`) e chegam à tela por `t()`.
 */
import { z } from "zod";

import { comoRecord, ehUuid } from "./tipos";

export const UNIDADES_DE_TEMPO = ["minutos", "horas", "dias"] as const;
export type UnidadeDeTempo = (typeof UNIDADES_DE_TEMPO)[number];

const MINUTOS_DA_UNIDADE: Record<UnidadeDeTempo, number> = { minutos: 1, horas: 60, dias: 1440 };
/** Um ano em cada unidade: o teto da janela de esfriando das etapas do original. */
export const MAXIMO_POR_UNIDADE: Record<UnidadeDeTempo, number> = {
  minutos: 525_600,
  horas: 8_760,
  dias: 365,
};

const valorDoLimite = z.number().int().nullable();

export const limiteDeTempoSchema = z
  .object({
    atencao: valorDoLimite,
    atencao_unidade: z.enum(UNIDADES_DE_TEMPO),
    critico: valorDoLimite,
    critico_unidade: z.enum(UNIDADES_DE_TEMPO),
  })
  .strict()
  .superRefine((limite, ctx) => {
    const erro = erroDoLimite(limite);
    if (erro) ctx.addIssue({ code: "custom", message: erro });
  });
export type LimiteDeTempo = {
  atencao: number | null;
  atencao_unidade: UnidadeDeTempo;
  critico: number | null;
  critico_unidade: UnidadeDeTempo;
};

export const alertaDeTempoSchema = z
  .object({
    geral: limiteDeTempoSchema.nullable(),
    etapas: z.record(z.string().uuid(), limiteDeTempoSchema),
  })
  .strict();
export type AlertaDeTempo = { geral: LimiteDeTempo | null; etapas: Record<string, LimiteDeTempo> };

export const ALERTA_VAZIO: AlertaDeTempo = { geral: null, etapas: {} };

export function emMinutos(valor: number, unidade: UnidadeDeTempo): number {
  return valor * MINUTOS_DA_UNIDADE[unidade];
}

/** A régua da Clint para um limite; `null` = válido. */
export function erroDoLimite(limite: LimiteDeTempo): string | null {
  if (limite.atencao === null && limite.critico === null) {
    return "Preencha pelo menos um limite na exceção ou remova-a antes de salvar.";
  }
  for (const [valor, unidade] of [
    [limite.atencao, limite.atencao_unidade],
    [limite.critico, limite.critico_unidade],
  ] as const) {
    if (valor !== null && (valor < 1 || valor > MAXIMO_POR_UNIDADE[unidade])) {
      return `Informe um valor entre 1 e ${MAXIMO_POR_UNIDADE[unidade]}.`;
    }
  }
  if (
    limite.atencao !== null &&
    limite.critico !== null &&
    emMinutos(limite.critico, limite.critico_unidade) <=
      emMinutos(limite.atencao, limite.atencao_unidade)
  ) {
    return "O limite crítico deve ser maior que o limite de atenção.";
  }
  return null;
}

export function lerAlerta(valor: unknown): AlertaDeTempo {
  const bruto = comoRecord(valor);
  const geral = limiteDeTempoSchema.safeParse(bruto.geral);
  const etapas: Record<string, LimiteDeTempo> = {};
  for (const [id, limite] of Object.entries(comoRecord(bruto.etapas))) {
    if (!ehUuid(id)) continue;
    const lido = limiteDeTempoSchema.safeParse(limite);
    if (lido.success) etapas[id] = lido.data;
  }
  return { geral: geral.success ? geral.data : null, etapas };
}

export type NivelDoPrazo = "ok" | "atencao" | "critico";

/** `null` = sem regra para a etapa, ou negócio encerrado: o rodapé fica como na V4. */
export function nivelDoPrazo(entrada: {
  alerta: AlertaDeTempo;
  etapa: { id: string; is_won: boolean; is_lost: boolean };
  horasNaEtapa: number | null;
}): NivelDoPrazo | null {
  const { alerta, etapa, horasNaEtapa } = entrada;
  if (horasNaEtapa === null || etapa.is_won || etapa.is_lost) return null;
  const limite = alerta.etapas[etapa.id] ?? alerta.geral;
  if (!limite) return null;
  const minutos = horasNaEtapa * 60;
  if (limite.critico !== null && minutos >= emMinutos(limite.critico, limite.critico_unidade))
    return "critico";
  if (limite.atencao !== null && minutos >= emMinutos(limite.atencao, limite.atencao_unidade))
    return "atencao";
  return "ok";
}

export function gravarAlerta(
  alerta: AlertaDeTempo,
  etapasVivas: readonly string[],
): AlertaDeTempo | null {
  const vivas = new Set(etapasVivas);
  const etapas = Object.fromEntries(Object.entries(alerta.etapas).filter(([id]) => vivas.has(id)));
  if (!alerta.geral && Object.keys(etapas).length === 0) return null;
  return { geral: alerta.geral, etapas };
}
