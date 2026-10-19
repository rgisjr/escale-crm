import { z } from "zod";

import type { CustomFieldDef } from "@/lib/schemas/settings";

type T = (texto: string) => string;

/**
 * "PERSONALIZAR CAMPOS" DA SEÇÃO NEGÓCIO (fork Escale, Fase 3A; D7, 02-005).
 *
 * A lista ordenada do que a seção mostra: os cinco básicos ("Informações
 * básicas") e os campos do CRM da origem (`crm:{chave}`, catálogo da 1F-a).
 * Preferência por pessoa (chave `campos_do_negocio`).
 */
export const CAMPOS_BASICOS = ["origem", "etapa", "dono", "valor", "status"] as const;
export type CampoBasico = (typeof CAMPOS_BASICOS)[number];

export const ROTULO_DO_CAMPO_BASICO: Readonly<Record<CampoBasico, string>> = {
  origem: "Origem",
  etapa: "Etapa",
  dono: "Dono",
  valor: "Valor do negócio",
  status: "Status",
};

export const PREFIXO_CRM = "crm:";
export const CAMPOS_DO_CARTAO_PADRAO: readonly string[] = [...CAMPOS_BASICOS];
export const CAMPOS_DO_CARTAO_MAX = 30;

export const camposDoCartaoSchema = z.array(z.string().min(1).max(120)).max(CAMPOS_DO_CARTAO_MAX);

/** Lista tolerante: itens que não são texto saem; fora da forma, o padrão. */
export function lerCamposDoCartao(bruto: unknown): string[] {
  if (!Array.isArray(bruto)) return [...CAMPOS_DO_CARTAO_PADRAO];
  const lido = camposDoCartaoSchema.safeParse(bruto.filter((x) => typeof x === "string"));
  return lido.success ? [...new Set(lido.data)] : [...CAMPOS_DO_CARTAO_PADRAO];
}

export const ehCamposPadrao = (lista: readonly string[]): boolean =>
  lista.length === CAMPOS_BASICOS.length && lista.every((c, i) => c === CAMPOS_BASICOS[i]);

export interface CampoDisponivel {
  chave: string;
  rotulo: string;
  grupo: "basico" | "crm";
}

export function camposDisponiveis(
  defs: ReadonlyArray<Pick<CustomFieldDef, "key" | "label">>,
  t: T,
): CampoDisponivel[] {
  return [
    ...CAMPOS_BASICOS.map((c) => ({
      chave: c,
      rotulo: t(ROTULO_DO_CAMPO_BASICO[c]),
      grupo: "basico" as const,
    })),
    ...defs.map((d) => ({
      chave: `${PREFIXO_CRM}${d.key}`,
      rotulo: d.label,
      grupo: "crm" as const,
    })),
  ];
}
