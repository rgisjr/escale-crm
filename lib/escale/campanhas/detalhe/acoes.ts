import type { SupabaseClient } from "@supabase/supabase-js";

import { carregarCampanha, type Desfecho } from "@/lib/campanhas/acoes";
import { FILTRO_VAZIO } from "@/lib/campanhas/audiencia";
import { publicoSchema } from "@/lib/escale/campanhas/assistente";
import { duplicarDoAssistente } from "@/lib/escale/campanhas/acoes-do-assistente";
import { semContato } from "@/lib/escale/campanhas/publico";

import { podeTirarDaLista } from "./apresentacao";

/**
 * AS AÇÕES DA SELEÇÃO QUE MEXEM NA CAMPANHA (fork Escale, Fase 8C; N11, N12).
 * Client ADMIN, como as rotas do original (o `authenticated` só tem SELECT em
 * `campaigns`); toda escrita filtra `organization_id` e prende o status
 * conferido (compare-and-set).
 *
 * - "Criar campanha": duplica pela cópia do assistente (leva a mensagem, o
 *   pós-envio, o quando, o funil, o agente e o rodízio) e troca o público pelos
 *   contatos marcados, no `escale_publico` e no `audience_filter` (`incluir_contatos`, o teto da API: 5.000).
 * - "Excluir selecionados": só antes de qualquer envio. O contato entra em
 *   `excluir_contatos` (vale na próxima preparação, com o motivo
 *   `excluido_manualmente`) e a lista já preparada marca o mesmo motivo agora.
 */
export const TETO_DA_NOVA_CAMPANHA = 5000;
export const TETO_DE_FORA_DA_LISTA = 5000;
const LOTE = 500;

type Alvo = { destinatarioId: string; contatoId: string };

const recusa = (
  codigo: "unprocessable_entity" | "campanha_estado_invalido" | "internal_error",
  mensagem: string,
  status: number,
) => ({ ok: false, codigo, mensagem, status }) as const;

const corrida = () =>
  recusa(
    "campanha_estado_invalido",
    "O estado da campanha mudou enquanto esta ação era processada. Recarregue a tela.",
    409,
  );

export function audienciaDosContatos(contatos: readonly string[]) {
  const unicos = [...new Set(contatos)];
  return {
    ...FILTRO_VAZIO,
    incluir_contatos: unicos,
    limite: Math.max(1, Math.min(unicos.length, TETO_DA_NOVA_CAMPANHA)),
  };
}

export async function novaCampanhaComContatosAcao(
  admin: SupabaseClient,
  orgId: string,
  campanhaId: string,
  contatos: readonly string[],
  autorId: string,
): Promise<Desfecho<{ id: string }>> {
  const unicos = [...new Set(contatos)];
  if (unicos.length === 0)
    return recusa("unprocessable_entity", "Nenhum contato selecionado.", 422);
  if (unicos.length > TETO_DA_NOVA_CAMPANHA) {
    return recusa(
      "unprocessable_entity",
      "No máximo 5.000 contatos numa campanha nova a partir da seleção.",
      422,
    );
  }
  const carregada = await carregarCampanha(admin, orgId, campanhaId);
  if (!carregada.ok) return carregada;
  const copia = await duplicarDoAssistente(admin, carregada.campanha, autorId);
  if (!copia.ok) return copia;
  const { error } = await admin
    .from("campaigns")
    .update({
      audience_filter: audienciaDosContatos(unicos),
      escale_publico: { selecao: { tipo: "ids", ids: unicos }, avulsos: [], removidos: [] },
      updated_by: autorId,
    })
    .eq("organization_id", orgId)
    .eq("id", copia.id)
    .eq("status", "draft");
  if (error) {
    // A cópia ficaria órfã, com o público inteiro da original: desfaz o que acabou de criar (B8-14).
    await admin.from("campaigns").delete().eq("organization_id", orgId).eq("id", copia.id).eq("status", "draft");
    return recusa("internal_error", error.message, 500);
  }
  return { ok: true, id: copia.id };
}

export async function contarEnviados(admin: SupabaseClient, campanhaId: string): Promise<number> {
  const { count } = await admin
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campanhaId)
    .not("sent_at", "is", null);
  return count ?? 0;
}

async function contar(
  admin: SupabaseClient,
  campanhaId: string,
  elegibilidade: "eligible" | "excluded",
) {
  const { count } = await admin
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campanhaId)
    .eq("eligibility_status", elegibilidade);
  return count ?? 0;
}

/**
 * A campanha do assistente da casca (8B) tem o público em `escale_publico`: o
 * contato tirado entra nos `removidos`, para a próxima preparação não o trazer
 * de volta. Campanha do formulário antigo não tem esse campo.
 */
function publicoSemOsTirados(
  publico: unknown,
  alvos: readonly Alvo[],
): { escale_publico?: unknown } {
  const lido = publicoSchema.safeParse(publico);
  if (!lido.success) return {};
  return { escale_publico: alvos.reduce((p, a) => semContato(p, a.contatoId), lido.data) };
}

export async function tirarDaListaAcao(
  admin: SupabaseClient,
  orgId: string,
  campanhaId: string,
  alvos: readonly Alvo[],
  autorId: string,
): Promise<Desfecho<{ tirados: number }>> {
  const carregada = await carregarCampanha(admin, orgId, campanhaId);
  if (!carregada.ok) return carregada;
  const c = carregada.campanha;
  if (!podeTirarDaLista(c.status, await contarEnviados(admin, campanhaId))) {
    return recusa(
      "campanha_estado_invalido",
      "Só dá para tirar contatos da lista antes de o envio começar.",
      409,
    );
  }

  const filtro = (c.audience_filter ?? {}) as Record<string, unknown>;
  const atuais = Array.isArray(filtro.excluir_contatos)
    ? (filtro.excluir_contatos as string[])
    : [];
  const excluir = [...new Set([...atuais, ...alvos.map((a) => a.contatoId)])];
  if (excluir.length > TETO_DE_FORA_DA_LISTA) {
    return recusa(
      "unprocessable_entity",
      "No máximo 5.000 contatos fora da lista por campanha.",
      422,
    );
  }

  const { data: gravada } = await admin
    .from("campaigns")
    .update({
      audience_filter: { ...filtro, excluir_contatos: excluir },
      ...publicoSemOsTirados(c.escale_publico, alvos),
      updated_by: autorId,
    })
    .eq("organization_id", orgId)
    .eq("id", campanhaId)
    .eq("status", c.status)
    .select("id");
  if ((gravada ?? []).length === 0) return corrida();

  let tirados = 0;
  const ids = alvos.map((a) => a.destinatarioId);
  for (let i = 0; i < ids.length; i += LOTE) {
    const { data, error } = await admin
      .from("campaign_recipients")
      .update({
        status: "skipped",
        eligibility_status: "excluded",
        exclusion_reason: "excluido_manualmente",
      })
      .eq("organization_id", orgId)
      .eq("campaign_id", campanhaId)
      .eq("eligibility_status", "eligible")
      .is("sent_at", null)
      .in("id", ids.slice(i, i + LOTE))
      .select("id");
    // Sem conferir, o filtro já mudou e os destinatários seguiam elegíveis, recebendo a mensagem ao iniciar.
    // Tirar de novo é idempotente: a pessoa repete e fecha o que faltou.
    if (error) return recusa("internal_error", error.message, 500);
    tirados += (data ?? []).length;
  }

  if (tirados > 0) {
    const elegiveis = await contar(admin, campanhaId, "eligible");
    const excluidos = await contar(admin, campanhaId, "excluded");
    await admin
      .from("campaigns")
      .update({ snapshot_eligible: elegiveis, snapshot_excluded: excluidos })
      .eq("organization_id", orgId)
      .eq("id", campanhaId);
  }
  return { ok: true, tirados };
}
