import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Desenho } from "@/lib/automation/desenho-da-regra";
import { TRIGGER_EVENTS } from "@/lib/schemas/webhooks";
import { encryptRuleActionSecrets } from "@/lib/webhooks/secrets";

import { desenhoSchema } from "./fluxo/desenho-schema";

/**
 * O RASCUNHO DE UMA AUTOMAÇÃO (fork Escale, migration 9708). Salvar nunca perde o trabalho: o desenho
 * que ainda não pode ser publicado fica aqui. O motor não lê esta tabela. Sempre com a sessão de quem
 * pede (a RLS decide) e com `organization_id` filtrado também aqui.
 */
export const NOME_SEM_NOME = "Sem nome";

export const rascunhoSchema = z.object({
  nome: z.string().max(120),
  desenho: desenhoSchema,
  /** O `updated_at` da regra em que a tela se baseou: se outra pessoa publicou depois, a tela avisa. */
  versao_base: z.string().max(64).nullish(),
});
export type EntradaDoRascunho = z.infer<typeof rascunhoSchema>;

export interface RascunhoLido {
  nome: string;
  desenho: Desenho;
  atualizadoEm: string;
  versaoBase: string | null;
}

type EventoDoGatilho = (typeof TRIGGER_EVENTS)[number];

/** O gatilho escolhido no desenho, quando é um gatilho que existe; senão `null`. */
export function eventoDoRascunho(desenho: { caixas: ReadonlyArray<{ data: Record<string, unknown> }> }): EventoDoGatilho | null {
  const evento = desenho.caixas.find((c) => c.data.kind === "gatilho")?.data.evento;
  return typeof evento === "string" && (TRIGGER_EVENTS as readonly string[]).includes(evento) ? (evento as EventoDoGatilho) : null;
}

type Objeto = Record<string, unknown>;
const ehObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);

/** A ação "Enviar Webhook" com a senha digitada ainda em texto aberto. */
const webhookComSenha = (v: Objeto): v is Objeto & { config: Objeto } =>
  v.type === "call_webhook" && ehObjeto(v.config) && typeof v.config.secret === "string" && v.config.secret !== "";

/**
 * A senha de um webhook NUNCA fica em texto aberto no banco: o rascunho guarda como a regra publicada
 * (`secret` → `secret_enc`, cifrado). Sem chave de cifra a senha digitada é descartada (a pessoa digita
 * de novo) — mas o resto do rascunho é salvo, que é o ponto: não perder o trabalho. Percorre o desenho
 * inteiro, então pega também a ação que está dentro de um passo "Ações" (grupo).
 */
export async function cifrarSegredosDoDesenho<T>(admin: SupabaseClient, desenho: T): Promise<T> {
  const percorrer = async (no: unknown): Promise<unknown> => {
    if (Array.isArray(no)) return Promise.all(no.map(percorrer));
    if (!ehObjeto(no)) return no;
    if (webhookComSenha(no)) {
      const [cifrada] = (await encryptRuleActionSecrets(admin, [no as never])) ?? [];
      if (cifrada) return cifrada;
      const { secret: _aberta, ...resto } = no.config;
      return { ...no, config: resto };
    }
    const saida: Objeto = {};
    for (const [chave, valor] of Object.entries(no)) saida[chave] = await percorrer(valor);
    return saida;
  };
  return (await percorrer(desenho)) as T;
}

function lancar(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function lerRascunho(db: SupabaseClient, orgId: string, ruleId: string): Promise<RascunhoLido | null> {
  const { data, error } = await db
    .from("crm_rascunhos_de_automacao")
    .select("nome, desenho, versao_base, updated_at")
    .eq("organization_id", orgId)
    .eq("rule_id", ruleId)
    .maybeSingle();
  lancar(error);
  if (!data) return null;
  const linha = data as { nome?: unknown; desenho?: unknown; versao_base?: unknown; updated_at?: unknown };
  const desenho = desenhoSchema.safeParse(linha.desenho);
  if (!desenho.success) return null;
  return {
    nome: String(linha.nome ?? ""),
    desenho: desenho.data as unknown as Desenho,
    atualizadoEm: String(linha.updated_at),
    versaoBase: typeof linha.versao_base === "string" ? linha.versao_base : null,
  };
}

export async function regraDaOrganizacao(db: SupabaseClient, orgId: string, ruleId: string): Promise<boolean> {
  const { data, error } = await db.from("automation_rules").select("id").eq("id", ruleId).eq("organization_id", orgId).maybeSingle();
  lancar(error);
  return !!data;
}

export async function gravarRascunho(
  db: SupabaseClient,
  p: {
    orgId: string;
    ruleId: string;
    userId: string;
    nome: string;
    desenho: EntradaDoRascunho["desenho"];
    versaoBase?: string | null;
  },
): Promise<string> {
  const agora = new Date().toISOString();
  const { data, error } = await db
    .from("crm_rascunhos_de_automacao")
    .upsert(
      {
        rule_id: p.ruleId,
        organization_id: p.orgId,
        nome: p.nome,
        desenho: p.desenho,
        versao_base: p.versaoBase ?? null,
        salvo_por: p.userId,
        updated_at: agora,
      },
      { onConflict: "rule_id" },
    )
    .select("updated_at")
    .single();
  lancar(error);
  return String((data as { updated_at?: unknown } | null)?.updated_at ?? agora);
}

export async function descartarRascunho(db: SupabaseClient, orgId: string, ruleId: string): Promise<void> {
  const { error } = await db.from("crm_rascunhos_de_automacao").delete().eq("organization_id", orgId).eq("rule_id", ruleId);
  lancar(error);
}

/**
 * A automação nova salva como rascunho: a regra nasce PAUSADA e SEM AÇÃO (o esqueleto). O motor só lê
 * regra ligada, e ligar regra sem ação é recusado (`lib/automation/rascunho-nao-liga.ts`).
 */
export async function criarEsqueleto(
  db: SupabaseClient,
  p: { orgId: string; userId: string; nome: string; evento: string },
): Promise<string> {
  const { data, error } = await db
    .from("automation_rules")
    .insert({
      organization_id: p.orgId,
      name: p.nome.trim() || NOME_SEM_NOME,
      trigger_event: p.evento,
      trigger_config: {},
      conditions: [],
      actions: [],
      is_active: false,
      created_by_user_id: p.userId,
      last_change_actor_kind: "user",
      last_change_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  lancar(error);
  return String((data as { id?: unknown } | null)?.id);
}

/** Só para desfazer o esqueleto que acabou de nascer quando o rascunho dele não gravou. */
export async function descartarEsqueleto(db: SupabaseClient, orgId: string, ruleId: string): Promise<void> {
  const { error } = await db.from("automation_rules").delete().eq("id", ruleId).eq("organization_id", orgId);
  lancar(error);
}
