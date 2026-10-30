import type { SupabaseClient } from "@supabase/supabase-js";

import { COR_PADRAO_DA_PASTA, ICONE_PADRAO_DA_PASTA, ehCorDaPasta, ehIconeDaPasta } from "./pastas";
import type { CorDaPasta, IconeDaPasta } from "./pastas";
import { agentesDaRegra } from "./regras";
import type { FormaDeMontar } from "./rotas";
import type { ListaDeAutomacoes } from "./tipos";

/**
 * AS AUTOMAÇÕES NO BANCO (fork Escale, Fase 5A) — servidor, sempre com a sessão de
 * quem pede: a RLS da 9701 e a de `automation_rules` decidem. `organization_id` é
 * filtrado também aqui (defesa em profundidade). `actions` nunca sai daqui: carrega
 * o `secret_enc` dos webhooks.
 */
const LIMITE_DE_REGRAS = 1000;
const LIMITE_DE_PASTAS = 200;
const LIMITE_DE_AGENTES = 200;

/** A pasta escolhida não existe (ou é de outra organização). */
export class PastaInvalida extends Error {
  constructor() {
    super("pasta_invalida");
  }
}
/** A regra não existe (ou é de outra organização). */
export class NaoEncontrada extends Error {
  constructor() {
    super("automacao_nao_encontrada");
  }
}

function lancar(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function lerListaDeAutomacoes(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<ListaDeAutomacoes> {
  const [regras, casca, favoritas, pastas, agentes] = await Promise.all([
    supabase
      .from("automation_rules")
      .select("id, name, is_active, updated_at, actions")
      .eq("organization_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(LIMITE_DE_REGRAS),
    supabase.from("crm_automacoes_da_casca").select("rule_id, pasta_id, forma").eq("organization_id", orgId),
    supabase
      .from("crm_automacoes_favoritas")
      .select("rule_id")
      .eq("organization_id", orgId)
      .eq("user_id", userId),
    supabase
      .from("crm_pastas_de_automacao")
      .select("id, nome, cor, icone")
      .eq("organization_id", orgId)
      .order("created_at")
      .limit(LIMITE_DE_PASTAS),
    supabase
      .from("ai_agents")
      .select("id, name")
      .eq("organization_id", orgId)
      .is("archived_at", null)
      .order("name")
      .limit(LIMITE_DE_AGENTES),
  ]);
  for (const r of [regras, casca, favoritas, pastas, agentes]) lancar(r.error);

  const agentesDaOrg = (agentes.data ?? []).map((a) => ({ id: String(a.id), nome: String(a.name) }));
  const conhecidos = new Set(agentesDaOrg.map((a) => a.id));
  const daCasca = new Map<string, { pastaId: string | null; forma: FormaDeMontar | null }>();
  for (const c of casca.data ?? []) {
    daCasca.set(String(c.rule_id), {
      pastaId: (c.pasta_id as string | null) ?? null,
      forma: c.forma === "fluxo" || c.forma === "editor" ? c.forma : null,
    });
  }
  const idsFavoritos = new Set((favoritas.data ?? []).map((f) => String(f.rule_id)));

  return {
    automacoes: (regras.data ?? []).map((r) => {
      const org = daCasca.get(String(r.id));
      return {
        id: String(r.id),
        nome: String(r.name),
        ativa: Boolean(r.is_active),
        atualizadaEm: String(r.updated_at),
        pastaId: org?.pastaId ?? null,
        forma: org?.forma ?? null,
        favorita: idsFavoritos.has(String(r.id)),
        agentes: agentesDaRegra(r.actions, conhecidos),
      };
    }),
    pastas: (pastas.data ?? []).map((p) => ({
      id: String(p.id),
      nome: String(p.nome),
      cor: ehCorDaPasta(p.cor) ? p.cor : COR_PADRAO_DA_PASTA,
      icone: ehIconeDaPasta(p.icone) ? p.icone : ICONE_PADRAO_DA_PASTA,
    })),
    agentes: agentesDaOrg,
  };
}

export async function criarPasta(
  supabase: SupabaseClient,
  orgId: string,
  p: { nome: string; cor?: CorDaPasta; icone?: IconeDaPasta },
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("crm_pastas_de_automacao")
    .insert({
      organization_id: orgId,
      nome: p.nome,
      cor: p.cor ?? COR_PADRAO_DA_PASTA,
      icone: p.icone ?? ICONE_PADRAO_DA_PASTA,
    })
    .select("id")
    .single();
  lancar(error);
  return { id: String(data?.id) };
}

export async function editarPasta(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
  edicao: { nome?: string; cor?: CorDaPasta; icone?: IconeDaPasta },
): Promise<"ok" | "nao_encontrada"> {
  const { data, error } = await supabase
    .from("crm_pastas_de_automacao")
    .update({ ...edicao, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select("id");
  lancar(error);
  return (data ?? []).length > 0 ? "ok" : "nao_encontrada";
}

export async function excluirPasta(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
): Promise<"ok" | "nao_encontrada"> {
  const { data, error } = await supabase
    .from("crm_pastas_de_automacao")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId)
    .select("id");
  lancar(error);
  return (data ?? []).length > 0 ? "ok" : "nao_encontrada";
}

async function pastaExiste(supabase: SupabaseClient, orgId: string, pastaId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("crm_pastas_de_automacao")
    .select("id")
    .eq("id", pastaId)
    .eq("organization_id", orgId)
    .maybeSingle();
  lancar(error);
  return data !== null;
}

export async function organizarAutomacao(
  supabase: SupabaseClient,
  orgId: string,
  ruleId: string,
  o: { pasta_id?: string | null; forma?: FormaDeMontar },
): Promise<"ok" | "nao_encontrada" | "pasta_invalida"> {
  const { data: regra, error } = await supabase
    .from("automation_rules")
    .select("id")
    .eq("id", ruleId)
    .eq("organization_id", orgId)
    .maybeSingle();
  lancar(error);
  if (!regra) return "nao_encontrada";
  if (o.pasta_id && !(await pastaExiste(supabase, orgId, o.pasta_id))) return "pasta_invalida";
  const linha: Record<string, unknown> = {
    rule_id: ruleId,
    organization_id: orgId,
    updated_at: new Date().toISOString(),
  };
  if (o.pasta_id !== undefined) linha.pasta_id = o.pasta_id;
  if (o.forma !== undefined) linha.forma = o.forma;
  const { error: erroDoUpsert } = await supabase
    .from("crm_automacoes_da_casca")
    .upsert(linha, { onConflict: "rule_id" });
  lancar(erroDoUpsert);
  return "ok";
}

export async function marcarFavorita(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  ruleId: string,
  favorita: boolean,
): Promise<"ok" | "nao_encontrada"> {
  const { data: regra, error } = await supabase
    .from("automation_rules")
    .select("id")
    .eq("id", ruleId)
    .eq("organization_id", orgId)
    .maybeSingle();
  lancar(error);
  if (!regra) return "nao_encontrada";
  if (favorita) {
    const { error: e } = await supabase
      .from("crm_automacoes_favoritas")
      .upsert(
        { user_id: userId, rule_id: ruleId, organization_id: orgId },
        { onConflict: "user_id,rule_id", ignoreDuplicates: true },
      );
    lancar(e);
  } else {
    const { error: e } = await supabase
      .from("crm_automacoes_favoritas")
      .delete()
      .eq("user_id", userId)
      .eq("rule_id", ruleId)
      .eq("organization_id", orgId);
    lancar(e);
  }
  return "ok";
}

export async function duplicarAutomacao(
  supabase: SupabaseClient,
  ruleId: string,
  nome: string,
): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("fn_escale_duplicar_automacao", { p_regra: ruleId, p_nome: nome });
  if (error) {
    if (error.message.includes("automacao_nao_encontrada")) throw new NaoEncontrada();
    throw new Error(error.message);
  }
  return { id: String(data) };
}

export async function moverEmLote(
  supabase: SupabaseClient,
  orgId: string,
  ids: readonly string[],
  pastaId: string | null,
): Promise<{ movidas: string[]; falhas: string[] }> {
  if (pastaId && !(await pastaExiste(supabase, orgId, pastaId))) throw new PastaInvalida();
  const { data, error } = await supabase
    .from("automation_rules")
    .select("id")
    .in("id", [...ids])
    .eq("organization_id", orgId);
  lancar(error);
  const encontradas = (data ?? []).map((r) => String(r.id));
  if (encontradas.length > 0) {
    const agora = new Date().toISOString();
    const { error: e } = await supabase.from("crm_automacoes_da_casca").upsert(
      encontradas.map((rule_id) => ({ rule_id, organization_id: orgId, pasta_id: pastaId, updated_at: agora })),
      { onConflict: "rule_id" },
    );
    lancar(e);
  }
  const achadas = new Set(encontradas);
  return { movidas: encontradas, falhas: ids.filter((id) => !achadas.has(id)) };
}

export async function excluirEmLote(
  supabase: SupabaseClient,
  orgId: string,
  ids: readonly string[],
): Promise<{ excluidas: string[]; falhas: string[] }> {
  const { data, error } = await supabase
    .from("automation_rules")
    .delete()
    .in("id", [...ids])
    .eq("organization_id", orgId)
    .select("id");
  lancar(error);
  const excluidas = (data ?? []).map((r) => String(r.id));
  const feitas = new Set(excluidas);
  return { excluidas, falhas: ids.filter((id) => !feitas.has(id)) };
}
