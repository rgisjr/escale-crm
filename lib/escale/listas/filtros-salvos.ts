import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import {
  enxugarFiltros,
  filtrosDeContatosSchema,
  type FiltrosDeContatos,
} from "@/lib/escale/contatos/filtros";

/**
 * OS FILTROS SALVOS DAS LISTAS (fork Escale, Fase 2B; migration 9102; Clint
 * `userFilterPreset`). Uma tabela para as listas da casca (`contatos` agora,
 * `empresas` na 2D). As regras da 1D: 20 por pessoa e lista, nome único por
 * pessoa (sem caixa), o compartilhado visível a toda a organização, só quem
 * criou escreve (a RLS garante; a rota só dá a mensagem certa antes).
 */
export const LISTAS_COM_FILTROS = ["contatos"] as const;
export type ListaComFiltros = (typeof LISTAS_COM_FILTROS)[number];
export const listaSchema = z.enum(LISTAS_COM_FILTROS);
export const FILTROS_DA_LISTA_MAX = 20;
export const NOME_DO_FILTRO_MAX = 60;

export type FiltroDaLista = {
  id: string;
  nome: string;
  compartilhado: boolean;
  meu: boolean;
  criterios: FiltrosDeContatos;
};

export const novoFiltroSchema = z
  .object({
    lista: listaSchema,
    nome: z.string().max(200),
    compartilhado: z.boolean(),
    criterios: filtrosDeContatosSchema,
  })
  .strict();

export const mudarFiltroSchema = z
  .object({ nome: z.string().max(200).optional(), compartilhado: z.boolean().optional() })
  .strict()
  .refine((b) => b.nome !== undefined || b.compartilhado !== undefined, { message: "vazio" });

export function nomeLimpo(nome: string): string | null {
  const limpo = nome.trim().replace(/\s+/g, " ");
  return limpo.length >= 1 && limpo.length <= NOME_DO_FILTRO_MAX ? limpo : null;
}

export function nomeRepetido(
  nome: string,
  meus: ReadonlyArray<{ id: string; nome: string }>,
  ignorar?: string,
): boolean {
  const alvo = nome.trim().toLowerCase();
  return meus.some((f) => f.id !== ignorar && f.nome.trim().toLowerCase() === alvo);
}

type Linha = {
  id: string;
  user_id: string;
  nome: string;
  compartilhado: boolean;
  criterios: unknown;
};

/** Critério que não vale mais (o modelo mudou) vira filtro vazio, em vez de quebrar a lista. */
export function filtrosDasLinhas(linhas: readonly Linha[], userId: string): FiltroDaLista[] {
  return linhas.map((l) => {
    const lido = filtrosDeContatosSchema.safeParse(l.criterios);
    return {
      id: l.id,
      nome: l.nome,
      compartilhado: l.compartilhado,
      meu: l.user_id === userId,
      criterios: lido.success ? enxugarFiltros(lido.data) : {},
    };
  });
}

/** Lança o erro do banco para a rota tratar. */
export async function lerFiltrosDaLista(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  lista: ListaComFiltros,
): Promise<FiltroDaLista[]> {
  const { data, error } = await supabase
    .from("crm_filtros_das_listas")
    .select("id, user_id, nome, compartilhado, criterios")
    .eq("organization_id", orgId)
    .eq("lista", lista)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return filtrosDasLinhas((data ?? []) as Linha[], userId);
}

/** 23505 = nome repetido; o gatilho do limite = o 21º. Outro erro: `null` (a rota trata como inesperado). */
export function falhaDaGravacao(
  erro: { code?: string; message?: string },
  t: (texto: string) => string,
  requestId: string,
): Response | null {
  if (erro.code === "23505") {
    return fail("state_conflict", t("Já existe um filtro com esse nome."), 409, { requestId });
  }
  if ((erro.message ?? "").includes("crm_filtros_das_listas_limite")) {
    return fail(
      "unprocessable_entity",
      t("Limite de 20 filtros salvos atingido. Exclua algum para salvar outro."),
      422,
      { requestId },
    );
  }
  return null;
}
