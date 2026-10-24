import type { SupabaseClient } from "@supabase/supabase-js";

import type { Recusa } from "@/lib/campanhas/acoes";
import { ehEditavel, ehStatusDaCampanha } from "@/lib/campanhas/maquina-de-estados";
import { gravarPool, lerPoolExtra } from "@/lib/campanhas/pool-de-numeros";

import {
  COLUNAS_DO_ASSISTENTE,
  assistenteDaLinha,
  colunasDoAssistente,
  type Assistente,
  type LinhaDoAssistente,
} from "./assistente";
import { conferirAssistente } from "./conferir";

/**
 * O RASCUNHO DO ASSISTENTE (fork Escale, Fase 8B; N14). Client admin na escrita,
 * como as rotas do original (`authenticated` só tem SELECT em `campaigns`, 0375);
 * a organização vem do papel conferido, nunca do corpo.
 */
export async function criarRascunho(
  admin: SupabaseClient,
  org: string,
  userId: string,
  a: Assistente,
): Promise<{ ok: true; id: string } | Recusa> {
  const negado = await conferirAssistente(admin, org, a);
  if (negado) return negado;
  const { data, error } = await admin
    .from("campaigns")
    .insert({ organization_id: org, created_by: userId, ...colunasDoAssistente(a) })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Não foi possível criar a campanha.");
  const id = (data as { id: string }).id;
  await gravarPool(admin, {
    organizationId: org,
    campanhaId: id,
    principal: a.numeroId,
    extras: a.numerosExtras,
  });
  return { ok: true, id };
}

export async function salvarRascunho(
  admin: SupabaseClient,
  org: string,
  userId: string,
  id: string,
  a: Assistente,
): Promise<{ ok: true } | Recusa> {
  const { data: atual } = await admin
    .from("campaigns")
    .select("id, status, message_body, escale_mensagem, content_version")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  const c = atual as {
    status: string;
    message_body: string | null;
    escale_mensagem: unknown;
    content_version: number;
  } | null;
  if (!c)
    return {
      ok: false,
      codigo: "campanha_nao_encontrada",
      mensagem: "Campanha não encontrada.",
      status: 404,
    };
  if (!ehStatusDaCampanha(c.status) || !ehEditavel(c.status)) {
    return {
      ok: false,
      codigo: "campanha_nao_editavel",
      mensagem: "Só um rascunho aceita mudar o texto e o público.",
      status: 409,
    };
  }
  const negado = await conferirAssistente(admin, org, a);
  if (negado) return negado;
  const colunas = colunasDoAssistente(a);
  const mudouMensagem =
    colunas.message_body !== c.message_body ||
    JSON.stringify(colunas.escale_mensagem) !== JSON.stringify(c.escale_mensagem);
  const { data, error } = await admin
    .from("campaigns")
    .update({
      ...colunas,
      updated_by: userId,
      ...(mudouMensagem ? { content_version: c.content_version + 1 } : {}),
    })
    .eq("organization_id", org)
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error) throw new Error(error.message);
  if ((data ?? []).length === 0) {
    return {
      ok: false,
      codigo: "campanha_nao_editavel",
      mensagem: "O estado da campanha mudou enquanto esta edição era salva. Recarregue a tela.",
      status: 409,
    };
  }
  await gravarPool(admin, {
    organizationId: org,
    campanhaId: id,
    principal: a.numeroId,
    extras: a.numerosExtras,
  });
  return { ok: true };
}

export interface DadosDoAssistente {
  campanhaId: string;
  status: string;
  assistente: Assistente;
  publicoAntigo: boolean;
}

/** `db` é a sessão (RLS de gerente); `admin` lê o rodízio, como o GET do original. */
export async function lerAssistente(
  db: SupabaseClient,
  admin: SupabaseClient,
  org: string,
  id: string,
): Promise<DadosDoAssistente | null> {
  const { data } = await db
    .from("campaigns")
    .select(COLUNAS_DO_ASSISTENTE)
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const linha = data as unknown as LinhaDoAssistente;
  const extras = await lerPoolExtra(admin, org, id);
  const { assistente, publicoAntigo } = assistenteDaLinha(linha, extras);
  return { campanhaId: linha.id, status: linha.status, assistente, publicoAntigo };
}
