import type { SupabaseClient } from "@supabase/supabase-js";

import type { LayoutDoGrafico } from "../graficos/tipos";
import { lerGraficos } from "../graficos/banco";
import { falhaDaFuncao } from "../paineis/banco";
import type { ModeloNaLista } from "./tipos";

/**
 * OS MODELOS NO BANCO (fork Escale, Fase 7F) — servidor, sempre com a sessão de quem pede: a RLS da 9601
 * decide quem vê e quem grava. Templates da organização são painéis com `modelo = true`. Sem embed entre
 * `crm_paineis` e `crm_graficos` (memória `postgrest-embed-ambiguo`): duas consultas e a contagem em TS.
 */
const LIMITE_DE_TEMPLATES = 200;
const LIMITE_DE_LINHAS_DE_GRAFICO = 6000;

export type MotivoDoErroDoModelo = "limite" | "falhou" | "nao_encontrado";
export class ErroDoModelo extends Error {
  constructor(readonly motivo: MotivoDoErroDoModelo) {
    super(motivo);
  }
}

export type NovoGraficoDeModelo = {
  nome: string;
  descricao: string | null;
  tipo: string;
  layout: LayoutDoGrafico;
  pergunta: unknown;
  opcoes: unknown;
};
export type TemplateLido = { id: string; nome: string; cor: string; icone: string };

type LinhaDoTemplate = { id: string; nome: string; cor: string; icone: string; created_at: string };

export async function lerTemplatesDaOrganizacao(supabase: SupabaseClient, orgId: string): Promise<ModeloNaLista[]> {
  const { data, error } = await supabase
    .from("crm_paineis")
    .select("id, nome, cor, icone, created_at")
    .eq("organization_id", orgId)
    .eq("modelo", true)
    .is("deleted_at", null)
    .limit(LIMITE_DE_TEMPLATES);
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as LinhaDoTemplate[];
  if (linhas.length === 0) return [];
  const { data: graficos, error: erroDosGraficos } = await supabase
    .from("crm_graficos")
    .select("painel_id")
    .in(
      "painel_id",
      linhas.map((l) => l.id),
    )
    .is("deleted_at", null)
    .limit(LIMITE_DE_LINHAS_DE_GRAFICO);
  if (erroDosGraficos) throw new Error(erroDosGraficos.message);
  const contagem = new Map<string, number>();
  for (const g of (graficos ?? []) as Array<{ painel_id: string }>) contagem.set(g.painel_id, (contagem.get(g.painel_id) ?? 0) + 1);
  return linhas.map((l) => ({
    origem: "organizacao" as const,
    id: l.id,
    nome: l.nome,
    cor: l.cor,
    icone: l.icone,
    graficos: contagem.get(l.id) ?? 0,
    criadoEm: l.created_at,
  }));
}

export async function lerTemplate(supabase: SupabaseClient, orgId: string, id: string): Promise<TemplateLido | null> {
  const { data, error } = await supabase
    .from("crm_paineis")
    .select("id, nome, cor, icone")
    .eq("organization_id", orgId)
    .eq("id", id)
    .eq("modelo", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as TemplateLido | null) ?? null;
}

async function apagarPainelNovo(supabase: SupabaseClient, orgId: string, id: string): Promise<void> {
  // Compensação (U2): melhor esforço; o pior caso é um painel vazio que quem criou exclui.
  await supabase.from("crm_paineis").delete().eq("id", id).eq("organization_id", orgId);
}

function erroDaCriacao(mensagem: string): ErroDoModelo {
  return new ErroDoModelo(mensagem.includes("limite_de_graficos") ? "limite" : "falhou");
}

/** U2: painel → gráficos num `insert` de array → (opcional) `modelo = true`; erro depois do painel apaga o painel. */
export async function criarPainelComGraficos(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  painel: { nome: string; cor: string; icone: string },
  graficos: readonly NovoGraficoDeModelo[],
  opcoes: { comoModelo: boolean },
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("crm_paineis")
    .insert({
      organization_id: orgId,
      nome: painel.nome,
      cor: painel.cor,
      icone: painel.icone,
      modelo: false,
      permissoes_usuarios: [],
      permissoes_papeis: [],
      criado_por: userId,
    })
    .select("id")
    .single();
  if (error) throw erroDaCriacao(error.message);
  const id = (data as { id: string }).id;

  if (graficos.length > 0) {
    const { error: erroDosGraficos } = await supabase.from("crm_graficos").insert(
      graficos.map((g) => ({
        organization_id: orgId,
        painel_id: id,
        nome: g.nome,
        descricao: g.descricao,
        tipo: g.tipo,
        layout: g.layout,
        pergunta: g.pergunta,
        opcoes: g.opcoes,
        criado_por: userId,
      })),
    );
    if (erroDosGraficos) {
      await apagarPainelNovo(supabase, orgId, id);
      throw erroDaCriacao(erroDosGraficos.message);
    }
  }

  if (opcoes.comoModelo) {
    const { error: erroDoModelo } = await supabase
      .from("crm_paineis")
      .update({ modelo: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", orgId);
    if (erroDoModelo) {
      await apagarPainelNovo(supabase, orgId, id);
      throw erroDaCriacao(erroDoModelo.message);
    }
  }
  return { id };
}

/** U8: copia o painel e os gráficos como template da organização (mesmo nome, listas de permissão vazias). */
export async function tornarTemplate(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  origem: { id: string; nome: string; cor: string; icone: string },
): Promise<{ id: string }> {
  const graficos = await lerGraficos(supabase, orgId, origem.id);
  return criarPainelComGraficos(
    supabase,
    orgId,
    userId,
    { nome: origem.nome, cor: origem.cor, icone: origem.icone },
    graficos.map((g) => ({
      nome: g.nome,
      descricao: g.descricao,
      tipo: g.tipo,
      layout: g.layout,
      pergunta: g.pergunta,
      opcoes: g.opcoes,
    })),
    { comoModelo: true },
  );
}

/** U9: `modelo = false` e a exclusão da 9602; se a exclusão falhar, o template volta. */
export async function excluirTemplate(supabase: SupabaseClient, orgId: string, id: string): Promise<void> {
  const template = await lerTemplate(supabase, orgId, id);
  if (!template) throw new ErroDoModelo("nao_encontrado");
  const { error: erroDoUpdate } = await supabase
    .from("crm_paineis")
    .update({ modelo: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (erroDoUpdate) throw new Error(erroDoUpdate.message);
  const { error } = await supabase.rpc("fn_escale_excluir_painel", { p_painel: id });
  if (error) {
    await supabase.from("crm_paineis").update({ modelo: true }).eq("id", id).eq("organization_id", orgId);
    throw falhaDaFuncao(error.message);
  }
}
