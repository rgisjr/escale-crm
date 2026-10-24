import { z } from "zod";

import { padraoDoNome } from "@/lib/escale/campanhas/filtros";

import type { SituacaoDoDestinatario } from "./tipos";

/**
 * OS FILTROS DA ABA DETALHES (fork Escale, Fase 8C; N9; 012, 013). A tela guarda
 * `FiltrosDeDestinatarios`; a rota recebe o JSON enxuto em `?f=` e compila para
 * `fn_escale_destinatario_passa` (9310).
 */
export const SITUACOES_DO_FILTRO = [
  "enviado",
  "entregue",
  "lida",
  "respondido",
  "erro",
  "nao_enviado",
  "aguardando",
  "fora_da_lista",
] as const satisfies readonly SituacaoDoDestinatario[];

/** As palavras do filtro da Clint (material 3); as duas últimas são nossas. */
export const ROTULO_DO_FILTRO_DE_SITUACAO: Record<SituacaoDoDestinatario, string> = {
  enviado: "Enviado",
  entregue: "Entregue",
  lida: "Lida",
  respondido: "Respondido",
  erro: "Erro",
  nao_enviado: "Não enviado",
  aguardando: "Aguardando envio",
  fora_da_lista: "Fora da lista",
};

export const filtrosDeDestinatariosSchema = z
  .object({
    busca: z.string().max(120).optional(),
    situacoes: z.array(z.enum(SITUACOES_DO_FILTRO)).max(SITUACOES_DO_FILTRO.length).optional(),
    motivos: z
      .array(z.string().regex(/^[A-Za-z0-9_]{1,60}$/))
      .max(50)
      .optional(),
  })
  .strict();
export type FiltrosDeDestinatarios = z.infer<typeof filtrosDeDestinatariosSchema>;

export const FILTROS_DE_DESTINATARIOS_VAZIOS: FiltrosDeDestinatarios = {};

export function enxugarFiltrosDeDestinatarios(f: FiltrosDeDestinatarios): FiltrosDeDestinatarios {
  const busca = f.busca?.trim();
  return {
    ...(busca ? { busca } : {}),
    ...(f.situacoes?.length ? { situacoes: [...new Set(f.situacoes)] } : {}),
    ...(f.motivos?.length ? { motivos: [...new Set(f.motivos)] } : {}),
  };
}

export const temFiltroDeDestinatarios = (f: FiltrosDeDestinatarios): boolean =>
  Object.keys(enxugarFiltrosDeDestinatarios(f)).length > 0;

export const textoDosFiltrosDeDestinatarios = (f: FiltrosDeDestinatarios): string =>
  JSON.stringify(enxugarFiltrosDeDestinatarios(f));

export function filtrosDeDestinatariosDoTexto(
  texto: string | null | undefined,
): FiltrosDeDestinatarios | null {
  if (!texto) return {};
  try {
    const lido = filtrosDeDestinatariosSchema.safeParse(JSON.parse(texto));
    return lido.success ? enxugarFiltrosDeDestinatarios(lido.data) : null;
  } catch {
    return null;
  }
}

/** O que `fn_escale_destinatario_passa` (9310) lê. */
export type FiltroDeDestinatariosCompilado = {
  padrao?: string;
  digitos?: string;
  situacoes?: SituacaoDoDestinatario[];
  motivos?: string[];
};

/** A busca vale para o nome (`ilike`) e, com 3 dígitos ou mais, para o telefone. */
export function compilarFiltrosDeDestinatarios(
  f: FiltrosDeDestinatarios,
): FiltroDeDestinatariosCompilado {
  const e = enxugarFiltrosDeDestinatarios(f);
  const digitos = e.busca?.replace(/\D/g, "") ?? "";
  return {
    ...(e.busca ? { padrao: padraoDoNome(e.busca) } : {}),
    ...(digitos.length >= 3 ? { digitos } : {}),
    ...(e.situacoes ? { situacoes: e.situacoes } : {}),
    ...(e.motivos ? { motivos: e.motivos } : {}),
  };
}
