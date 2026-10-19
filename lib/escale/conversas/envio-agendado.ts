import type { SupabaseClient } from "@supabase/supabase-js";

import { sendMessageHandler } from "@/app/api/v1/messages/_handler";
import { logger } from "@/lib/logger";

import { decidirEnvio, type MensagemAgendada } from "./agendadas";

export interface LinhaParaEnviar {
  id: string;
  organization_id: string;
  conversation_id: string;
  criado_por: string;
  tipo: MensagemAgendada["tipo"];
  corpo: string | null;
  template: { name: string; language: string; values: Record<string, string> } | null;
  canal: { status: string; provider: string | null };
  lastInboundAt: string | null;
}

export type ResultadoDoEnvio =
  { status: "enviada"; message_id: string } | { status: "falhou"; erro: string };

/**
 * UM ENVIO AGENDADO (fork Escale, Fase 3B; C9). O mesmo `sendMessageHandler`
 * do botão Enviar, em nome de quem agendou (`actor: user`), depois das duas
 * checagens da Clint: o dispositivo de pé e, fora da janela, só modelo.
 * Nunca lança: o cron grava o resultado na linha.
 */
export async function enviarAgendada(
  admin: SupabaseClient,
  linha: LinhaParaEnviar,
  agora: Date,
  requestId: string,
): Promise<ResultadoDoEnvio> {
  const decisao = decidirEnvio({
    canal: linha.canal,
    lastInboundAt: linha.lastInboundAt,
    tipo: linha.tipo,
    agora,
  });
  if (!decisao.ok) return { status: "falhou", erro: decisao.erro };
  const input =
    linha.tipo === "template" && linha.template
      ? {
          conversation_id: linha.conversation_id,
          type: "template" as const,
          template_name: linha.template.name,
          template_language: linha.template.language,
          template_values: linha.template.values,
        }
      : { conversation_id: linha.conversation_id, type: "text" as const, body: linha.corpo ?? "" };
  try {
    const mensagem = await sendMessageHandler(
      admin,
      {
        organization_id: linha.organization_id,
        actor: { type: "user", id: linha.criado_por },
        requestId,
      },
      input,
    );
    return { status: "enviada", message_id: mensagem.id };
  } catch (err) {
    const e = err as { message?: string };
    logger.warn("escale/agendadas: envio falhou", {
      agendamento: linha.id,
      conversation_id: linha.conversation_id,
      erro: e.message,
    });
    return { status: "falhou", erro: e.message ?? "Falha no envio" };
  }
}
