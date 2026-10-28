import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import {
  enxugarFiltros,
  filtrosDeContatosSchema,
  type FiltrosDeContatos,
} from "@/lib/escale/contatos/filtros";
import {
  enxugarFiltrosDoPainel,
  filtrosDaFilaSchema,
  type FiltrosDoPainel,
} from "@/lib/escale/conversas/filtros-da-fila";
import { enxugarFiltroDoPainel } from "@/lib/escale/indicadores/painel/filtro";
import { filtroDoPainelSchema, type FiltroDoPainel } from "@/lib/escale/indicadores/pergunta";

/**
 * OS FILTROS SALVOS DAS LISTAS (fork Escale, Fase 2B; migration 9102; Clint
 * `userFilterPreset`). Uma tabela para as listas da casca (`contatos` agora,
 * `empresas` na 2D). As regras da 1D: 20 por pessoa e lista, nome único por
 * pessoa (sem caixa), o compartilhado visível a toda a organização, só quem
 * criou escreve (a RLS garante; a rota só dá a mensagem certa antes).
 */
export const LISTAS_COM_FILTROS = ["contatos", "conversas", "paineis"] as const;
export type ListaComFiltros = (typeof LISTAS_COM_FILTROS)[number];
export const listaSchema = z.enum(LISTAS_COM_FILTROS);
export const FILTROS_DA_LISTA_MAX = 20;
export const NOME_DO_FILTRO_MAX = 60;

/** FORK ESCALE · Fase 3D: cada lista tem a forma dos seus critérios (N11). */
/** FORK ESCALE · Fase 7C: `paineis` = o filtro do painel aberto de Indicadores (vale para todos os painéis da pessoa). */
type CriteriosPorLista = { contatos: FiltrosDeContatos; conversas: FiltrosDoPainel; paineis: FiltroDoPainel };
export type CriteriosDaLista<L extends ListaComFiltros> = CriteriosPorLista[L];

export type FiltroDaLista<L extends ListaComFiltros = "contatos"> = {
  id: string;
  nome: string;
  compartilhado: boolean;
  meu: boolean;
  criterios: CriteriosDaLista<L>;
};

const baseDoNovo = { nome: z.string().max(200), compartilhado: z.boolean() };
export const novoFiltroSchema = z.discriminatedUnion("lista", [
  z
    .object({ lista: z.literal("contatos"), ...baseDoNovo, criterios: filtrosDeContatosSchema })
    .strict(),
  z
    .object({ lista: z.literal("conversas"), ...baseDoNovo, criterios: filtrosDaFilaSchema })
    .strict(),
  z
    .object({ lista: z.literal("paineis"), ...baseDoNovo, criterios: filtroDoPainelSchema })
    .strict(),
]);
export type NovoFiltroDaLista = z.infer<typeof novoFiltroSchema>;

export function enxugarCriterios(novo: NovoFiltroDaLista): CriteriosDaLista<ListaComFiltros> {
  if (novo.lista === "paineis") return enxugarFiltroDoPainel(novo.criterios);
  return novo.lista === "conversas"
    ? enxugarFiltrosDoPainel(novo.criterios)
    : enxugarFiltros(novo.criterios);
}

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
export function filtrosDasLinhas<L extends ListaComFiltros = "contatos">(
  linhas: readonly Linha[],
  userId: string,
  lista: L = "contatos" as L,
): FiltroDaLista<L>[] {
  return linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    compartilhado: l.compartilhado,
    meu: l.user_id === userId,
    criterios: criteriosDaLinha(lista, l.criterios) as CriteriosDaLista<L>,
  }));
}

function criteriosDaLinha(
  lista: ListaComFiltros,
  bruto: unknown,
): CriteriosDaLista<ListaComFiltros> {
  if (lista === "conversas") {
    const lido = filtrosDaFilaSchema.safeParse(bruto);
    return lido.success ? enxugarFiltrosDoPainel(lido.data) : {};
  }
  if (lista === "paineis") {
    const lido = filtroDoPainelSchema.safeParse(bruto);
    return lido.success ? enxugarFiltroDoPainel(lido.data) : {};
  }
  const lido = filtrosDeContatosSchema.safeParse(bruto);
  return lido.success ? enxugarFiltros(lido.data) : {};
}

/** Lança o erro do banco para a rota tratar. */
export async function lerFiltrosDaLista<L extends ListaComFiltros>(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  lista: L,
): Promise<FiltroDaLista<L>[]> {
  const { data, error } = await supabase
    .from("crm_filtros_das_listas")
    .select("id, user_id, nome, compartilhado, criterios")
    .eq("organization_id", orgId)
    .eq("lista", lista)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return filtrosDasLinhas((data ?? []) as Linha[], userId, lista);
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
