import type { SupabaseClient } from "@supabase/supabase-js";

import { COR_PADRAO, ICONE_PADRAO } from "./aparencia";
import { ordenarPaineis } from "./regras";
import type { EdicaoDoPainel, PainelDaLista } from "./tipos";

/**
 * OS PAINÉIS NO BANCO (fork Escale, Fase 7B) — servidor, sempre com a sessão de
 * quem pede: a RLS da 9601 decide quem vê e quem grava. `organization_id` é
 * filtrado também aqui (defesa em profundidade).
 */
const COLUNAS = "id, nome, cor, icone, created_at, padrao, permissoes_usuarios, permissoes_papeis";
const LIMITE_DA_LISTA = 500;

type LinhaDoPainel = {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  created_at: string;
  padrao: boolean;
  permissoes_usuarios: string[] | null;
  permissoes_papeis: string[] | null;
};

export type ErroDoPainel = "painel_protegido" | "nao_encontrado" | "sem_permissao";

/** Erro de uma função da 9602, com o código que a rota traduz em status. */
export class FalhaDoPainel extends Error {
  constructor(readonly codigo: ErroDoPainel) {
    super(codigo);
  }
}

function painelDaLinha(l: LinhaDoPainel, comPermissoes: boolean): PainelDaLista {
  return {
    id: l.id,
    nome: l.nome,
    cor: l.cor,
    icone: l.icone,
    criadoEm: l.created_at,
    padrao: l.padrao,
    permissoesUsuarios: comPermissoes ? (l.permissoes_usuarios ?? []) : [],
    permissoesPapeis: comPermissoes ? (l.permissoes_papeis ?? []) : [],
  };
}

export async function lerPaineis(
  supabase: SupabaseClient,
  orgId: string,
  comPermissoes: boolean,
): Promise<PainelDaLista[]> {
  const { data, error } = await supabase
    .from("crm_paineis")
    .select(COLUNAS)
    .eq("organization_id", orgId)
    .eq("modelo", false)
    .is("deleted_at", null)
    .limit(LIMITE_DA_LISTA);
  if (error) throw new Error(error.message);
  return ordenarPaineis(((data ?? []) as LinhaDoPainel[]).map((l) => painelDaLinha(l, comPermissoes)));
}

export async function lerPainel(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
  comPermissoes = true,
): Promise<PainelDaLista | null> {
  const { data, error } = await supabase
    .from("crm_paineis")
    .select(COLUNAS)
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("modelo", false)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? painelDaLinha(data as LinhaDoPainel, comPermissoes) : null;
}

export async function criarPainelEmBranco(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  nome: string,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("crm_paineis")
    .insert({ organization_id: orgId, nome, cor: COR_PADRAO, icone: ICONE_PADRAO, criado_por: userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: (data as { id: string }).id };
}

/** Sem `.select()`: a linha pode ficar invisível depois de gravar (a rota já conferiu a Q5). */
export async function editarPainel(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
  edicao: Partial<EdicaoDoPainel>,
): Promise<void> {
  const colunas = {
    ...(edicao.nome !== undefined && { nome: edicao.nome }),
    ...(edicao.cor !== undefined && { cor: edicao.cor }),
    ...(edicao.icone !== undefined && { icone: edicao.icone }),
    ...(edicao.permissoesUsuarios !== undefined && { permissoes_usuarios: edicao.permissoesUsuarios }),
    ...(edicao.permissoesPapeis !== undefined && { permissoes_papeis: edicao.permissoesPapeis }),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("crm_paineis").update(colunas).eq("id", id).eq("organization_id", orgId);
  if (error) throw new Error(error.message);
}

export function falhaDaFuncao(mensagem: string): Error {
  if (mensagem.includes("painel_protegido")) return new FalhaDoPainel("painel_protegido");
  if (mensagem.includes("painel_nao_encontrado")) return new FalhaDoPainel("nao_encontrado");
  if (mensagem.includes("sem_permissao") || mensagem.includes("row-level security"))
    return new FalhaDoPainel("sem_permissao");
  return new Error(mensagem);
}

export async function duplicarPainel(supabase: SupabaseClient, id: string, nome: string): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("fn_escale_duplicar_painel", { p_painel: id, p_nome: nome });
  if (error) throw falhaDaFuncao(error.message);
  return { id: String(data) };
}

export async function excluirPainel(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.rpc("fn_escale_excluir_painel", { p_painel: id });
  if (error) throw falhaDaFuncao(error.message);
}
