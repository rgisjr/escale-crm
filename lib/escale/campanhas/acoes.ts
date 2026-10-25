import type { SupabaseClient } from "@supabase/supabase-js";

import type { CampanhaCarregada, Desfecho, Recusa } from "@/lib/campanhas/acoes";
import { podeTransitar } from "@/lib/campanhas/maquina-de-estados";

/**
 * AS AÇÕES NOVAS DA LISTA (fork Escale, Fase 8A; N10): alterar horário, voltar a
 * rascunho e excluir rascunho. Mesmo molde das ações do original
 * (`lib/campanhas/acoes.ts`): a máquina decide, a escrita prende o status que
 * foi conferido (compare-and-set) e a recusa volta como `Desfecho`.
 */
function conflito(): Recusa {
  return {
    ok: false,
    codigo: "campanha_estado_invalido",
    mensagem: "O estado da campanha mudou enquanto esta ação era processada. Recarregue a tela.",
    status: 409,
  };
}

/** A mesma pergunta do original (`jaEnviou`, privada lá): saiu alguma mensagem? */
async function jaEnviou(admin: SupabaseClient, campanhaId: string): Promise<boolean> {
  const { count, error } = await admin
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campanhaId)
    .not("sent_at", "is", null);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function reagendarAcao(
  admin: SupabaseClient,
  c: CampanhaCarregada,
  quando: Date,
  agora: Date,
): Promise<Desfecho<{ scheduled_at: string }>> {
  if (c.status !== "scheduled") {
    return {
      ok: false,
      codigo: "campanha_estado_invalido",
      mensagem: "Só uma campanha agendada pode mudar de horário.",
      status: 409,
    };
  }
  if (Number.isNaN(quando.getTime()) || quando.getTime() <= agora.getTime()) {
    return {
      ok: false,
      codigo: "campanha_agenda_invalida",
      mensagem: "O novo horário precisa ser no futuro.",
      status: 422,
    };
  }
  const iso = quando.toISOString();
  const { data, error } = await admin
    .from("campaigns")
    .update({ scheduled_at: iso })
    .eq("organization_id", c.organization_id)
    .eq("id", c.id)
    .eq("status", "scheduled")
    .select("id");
  if (error) throw new Error(error.message);
  if ((data ?? []).length === 0) return conflito();
  return { ok: true, scheduled_at: iso };
}

/**
 * Pronta, agendada (ou falha) → rascunho. O snapshot fica: a próxima preparação
 * o apaga e refaz, como já acontece com `ready → draft` no original.
 */
export async function voltarAoRascunhoAcao(
  admin: SupabaseClient,
  c: CampanhaCarregada,
): Promise<Desfecho> {
  // Já é rascunho: o resultado pedido já vale (o "Voltar" do assistente chama sempre, B8-2).
  if (c.status === "draft") return { ok: true };
  const r = podeTransitar(c.status, "draft");
  if (!r.pode)
    return { ok: false, codigo: "campanha_estado_invalido", mensagem: r.motivo, status: 409 };
  if (await jaEnviou(admin, c.id)) {
    return {
      ok: false,
      codigo: "campanha_nao_editavel",
      mensagem: "Esta campanha já enviou mensagens. Para parar o envio, cancele a campanha.",
      status: 409,
    };
  }
  const { data, error } = await admin
    .from("campaigns")
    .update({ status: "draft", scheduled_at: null })
    .eq("organization_id", c.organization_id)
    .eq("id", c.id)
    .eq("status", c.status)
    .select("id");
  if (error) throw new Error(error.message);
  if ((data ?? []).length === 0) return conflito();
  return { ok: true };
}

/** Só rascunho que nunca enviou: destinatários e rodízio vão junto (`on delete cascade`). */
export async function excluirRascunhoAcao(
  admin: SupabaseClient,
  c: CampanhaCarregada,
): Promise<Desfecho> {
  if (c.status !== "draft") {
    return {
      ok: false,
      codigo: "campanha_nao_editavel",
      mensagem: "Só um rascunho pode ser excluído.",
      status: 409,
    };
  }
  if (await jaEnviou(admin, c.id)) {
    return {
      ok: false,
      codigo: "campanha_nao_editavel",
      mensagem: "Este rascunho já enviou mensagens e fica no histórico.",
      status: 409,
    };
  }
  const { data, error } = await admin
    .from("campaigns")
    .delete()
    .eq("organization_id", c.organization_id)
    .eq("id", c.id)
    .eq("status", "draft")
    .select("id");
  if (error) throw new Error(error.message);
  if ((data ?? []).length === 0) return conflito();
  return { ok: true };
}
