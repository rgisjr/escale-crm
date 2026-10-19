import { z } from "zod";

/**
 * AS 8 SEÇÕES DO PAINEL DIREITO (fork Escale, Fase 3A; D5, 02-009, c15, c49).
 * A ordem é a da Clint e não muda; "Seções visíveis" só liga e desliga.
 */
export const SECOES = [
  "atividades",
  "contato",
  "negocio",
  "empresa",
  "notas",
  "anexos",
  "historico",
  "conversas",
] as const;
export type Secao = (typeof SECOES)[number];

export const ROTULO_DA_SECAO: Readonly<Record<Secao, string>> = {
  atividades: "Atividades",
  contato: "Contato",
  negocio: "Negócio",
  empresa: "Empresa",
  notas: "Notas",
  anexos: "Anexos",
  historico: "Histórico",
  conversas: "Conversas",
};

export const secoesSchema = z
  .object(Object.fromEntries(SECOES.map((s) => [s, z.boolean()])) as Record<Secao, z.ZodBoolean>)
  .strict();
export type SecoesVisiveis = z.infer<typeof secoesSchema>;

export const SECOES_PADRAO: SecoesVisiveis = Object.fromEntries(
  SECOES.map((s) => [s, true]),
) as SecoesVisiveis;

/** Aceita o objeto parcial (só as chaves gravadas); o que falta vale o padrão. */
export function lerSecoes(bruto: unknown): SecoesVisiveis {
  if (!bruto || typeof bruto !== "object") return SECOES_PADRAO;
  const lido = secoesSchema.partial().safeParse(bruto);
  return lido.success ? { ...SECOES_PADRAO, ...lido.data } : SECOES_PADRAO;
}

/** Sem negócio, Atividades e Negócio não existem (c48), mesmo ligadas. */
const SO_COM_NEGOCIO: ReadonlySet<Secao> = new Set(["atividades", "negocio"]);

export function secoesParaMostrar(visiveis: SecoesVisiveis, temNegocio: boolean): Secao[] {
  return SECOES.filter((s) => visiveis[s] && (temNegocio || !SO_COM_NEGOCIO.has(s)));
}

export const ehSecoesPadrao = (v: SecoesVisiveis): boolean => SECOES.every((s) => v[s]);
