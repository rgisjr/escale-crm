import type { SupabaseClient } from "@supabase/supabase-js";

import { nomeDaCopia } from "../paineis/regras";
import { posicaoNoFim } from "./regras-do-card";
import { layoutValido, type GraficoDoPainel, type LayoutDoGrafico } from "./tipos";

/**
 * OS GRÁFICOS NO BANCO (fork Escale, Fase 7C) — servidor, sempre com a sessão de quem pede: a RLS da
 * 9601 decide quem vê e quem grava. `organization_id` é filtrado também aqui (defesa em profundidade).
 */
const COLUNAS = "id, nome, descricao, tipo, layout, pergunta, opcoes";
const LIMITE_DA_LEITURA = 60;
const LIMITE_DO_NOME = 120;

type LinhaDoGrafico = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  layout: unknown;
  pergunta: unknown;
  opcoes: unknown;
};

export type MotivoDoErro = "limite" | "nao_encontrado";
export class ErroDoGrafico extends Error {
  constructor(readonly motivo: MotivoDoErro) {
    super(motivo);
  }
}

const doBanco = (l: LinhaDoGrafico): GraficoDoPainel => ({
  id: l.id,
  nome: l.nome,
  descricao: l.descricao,
  tipo: l.tipo,
  layout: layoutValido(l.layout),
  pergunta: l.pergunta,
  opcoes: l.opcoes ?? {},
});

export async function lerGraficos(supabase: SupabaseClient, orgId: string, painelId: string): Promise<GraficoDoPainel[]> {
  const { data, error } = await supabase
    .from("crm_graficos")
    .select(COLUNAS)
    .eq("organization_id", orgId)
    .eq("painel_id", painelId)
    .is("deleted_at", null)
    .order("created_at")
    .limit(LIMITE_DA_LEITURA);
  if (error) throw new Error(error.message);
  return ((data ?? []) as LinhaDoGrafico[]).map(doBanco);
}

export async function salvarLayouts(
  supabase: SupabaseClient,
  orgId: string,
  painelId: string,
  itens: ReadonlyArray<{ id: string } & LayoutDoGrafico>,
): Promise<void> {
  const agora = new Date().toISOString();
  const resultados = await Promise.all(
    itens.map(({ id, x, y, w, h }) =>
      supabase
        .from("crm_graficos")
        .update({ layout: { x, y, w, h }, updated_at: agora })
        .eq("id", id)
        .eq("painel_id", painelId)
        .eq("organization_id", orgId),
    ),
  );
  const falha = resultados.find((r) => r.error)?.error;
  if (falha) throw new Error(falha.message);
}

export async function duplicarGrafico(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  graficoId: string,
): Promise<{ id: string }> {
  const { data: original, error: erroDaLeitura } = await supabase
    .from("crm_graficos")
    .select("id, painel_id, nome, descricao, tipo, layout, pergunta, opcoes")
    .eq("organization_id", orgId)
    .eq("id", graficoId)
    .is("deleted_at", null)
    .maybeSingle();
  if (erroDaLeitura) throw new Error(erroDaLeitura.message);
  if (!original) throw new ErroDoGrafico("nao_encontrado");
  const o = original as LinhaDoGrafico & { painel_id: string };
  const { data: irmaos, error: erroDosIrmaos } = await supabase
    .from("crm_graficos")
    .select("layout")
    .eq("organization_id", orgId)
    .eq("painel_id", o.painel_id)
    .is("deleted_at", null)
    .limit(LIMITE_DA_LEITURA);
  if (erroDosIrmaos) throw new Error(erroDosIrmaos.message);
  const layouts = ((irmaos ?? []) as Array<{ layout: unknown }>).map((l) => layoutValido(l.layout));
  const base = layoutValido(o.layout);
  const { data, error } = await supabase
    .from("crm_graficos")
    .insert({
      organization_id: orgId,
      painel_id: o.painel_id,
      nome: nomeDaCopia(o.nome, LIMITE_DO_NOME),
      descricao: o.descricao,
      tipo: o.tipo,
      layout: posicaoNoFim(layouts, base.w, base.h),
      pergunta: o.pergunta,
      opcoes: o.opcoes,
      criado_por: userId,
    })
    .select("id")
    .single();
  if (error) {
    if (error.message.includes("limite_de_graficos")) throw new ErroDoGrafico("limite");
    throw new Error(error.message);
  }
  return { id: (data as { id: string }).id };
}

/** `false` = nada apagado (gráfico de painel invisível ou papel sem direito: a RLS esconde). */
export async function excluirGrafico(supabase: SupabaseClient, orgId: string, graficoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("crm_graficos")
    .delete()
    .eq("id", graficoId)
    .eq("organization_id", orgId)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

// ─── Editor de gráfico (Fase 7D) ───

export type GraficoParaEditar = GraficoDoPainel & { painelId: string };
export type NovoGrafico = {
  painelId: string;
  nome: string;
  descricao?: string | null;
  tipo: string;
  pergunta: unknown;
  opcoes: unknown;
};
export type EdicaoDoGrafico = Partial<NovoGrafico>;

const COLUNAS_DO_EDITOR = "id, painel_id, nome, descricao, tipo, layout, pergunta, opcoes";

/** Lê um gráfico vivo da organização com a sessão de quem olha; `null` = não existe ou a RLS esconde. */
export async function lerGrafico(supabase: SupabaseClient, orgId: string, id: string): Promise<GraficoParaEditar | null> {
  const { data, error } = await supabase
    .from("crm_graficos")
    .select(COLUNAS_DO_EDITOR)
    .eq("id", id)
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const l = data as LinhaDoGrafico & { painel_id: string };
  return { ...doBanco(l), painelId: l.painel_id };
}

/** Quantos gráficos vivos o painel tem (o limite de 30 ao mover, S16). */
export async function contarGraficosVivos(supabase: SupabaseClient, orgId: string, painelId: string): Promise<number> {
  const { count, error } = await supabase
    .from("crm_graficos")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("painel_id", painelId)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Os layouts dos gráficos vivos do painel, para achar o fim da grade. */
export async function lerLayoutsDoPainel(supabase: SupabaseClient, orgId: string, painelId: string): Promise<LayoutDoGrafico[]> {
  const { data, error } = await supabase
    .from("crm_graficos")
    .select("layout")
    .eq("organization_id", orgId)
    .eq("painel_id", painelId)
    .is("deleted_at", null)
    .limit(LIMITE_DA_LEITURA);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ layout: unknown }>).map((l) => layoutValido(l.layout));
}

export async function criarGrafico(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  novo: NovoGrafico,
  layout: LayoutDoGrafico,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("crm_graficos")
    .insert({
      organization_id: orgId,
      painel_id: novo.painelId,
      nome: novo.nome,
      descricao: novo.descricao ?? null,
      tipo: novo.tipo,
      layout,
      pergunta: novo.pergunta,
      opcoes: novo.opcoes,
      criado_por: userId,
    })
    .select("id")
    .single();
  if (error) {
    if (error.message.includes("limite_de_graficos")) throw new ErroDoGrafico("limite");
    throw new Error(error.message);
  }
  return { id: (data as { id: string }).id };
}

/** `false` = nada atualizado (gráfico de painel invisível ou papel sem direito: a RLS esconde). */
export async function atualizarGrafico(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
  edicao: EdicaoDoGrafico & { layout?: LayoutDoGrafico },
): Promise<boolean> {
  const colunas = {
    ...(edicao.painelId !== undefined && { painel_id: edicao.painelId }),
    ...(edicao.nome !== undefined && { nome: edicao.nome }),
    ...(edicao.descricao !== undefined && { descricao: edicao.descricao }),
    ...(edicao.tipo !== undefined && { tipo: edicao.tipo }),
    ...(edicao.pergunta !== undefined && { pergunta: edicao.pergunta }),
    ...(edicao.opcoes !== undefined && { opcoes: edicao.opcoes }),
    ...(edicao.layout !== undefined && { layout: edicao.layout }),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("crm_graficos")
    .update(colunas)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}
