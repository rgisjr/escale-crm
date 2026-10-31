import type { SupabaseClient } from "@supabase/supabase-js";

import { sendMessageHandler } from "@/app/api/v1/messages/_handler";
import type { EnviadorDePassos } from "@/lib/automation/envio-de-passos";
import { textoNumeradoDeReserva } from "@/lib/channels/interativo";
import { copiarAtivoParaConversa } from "@/lib/midia/ativos-banco";

type ContextoDoEnvio = Parameters<typeof sendMessageHandler>[1];
type CorpoDoEnvio = Parameters<typeof sendMessageHandler>[2];

function conferir(mensagem: unknown): void {
  const m = mensagem as { status?: string; error_code?: string | null } | null;
  if (m?.status === "failed") throw new Error(`envio_falhou:${m.error_code ?? "sem_codigo"}`);
}

/** Envia cada passo pelo `sendMessageHandler` (a cadeia de sempre: ledger, janela, guardas do canal). */
export function enviadorPeloHandler(
  admin: SupabaseClient,
  entrada: {
    organizationId: string;
    conversationId: string;
    contexto: ContextoDoEnvio;
    espacar: () => Promise<void>;
    /**
     * Idempotência por passo. Quando informado, cada envio passa por aqui com o texto do passo e uma função que
     * faz o envio de fato (`key` e `messageId` do ledger): quem chama usa `sendWithLedger` e, numa nova tentativa do
     * job, o passo que já saiu volta como `already_sent` em vez de sair de novo.
     */
    executar?: (
      texto: string,
      enviar: (key: string, messageId: string) => Promise<unknown>,
    ) => Promise<void>;
  },
): EnviadorDePassos {
  const enviar = async (corpo: CorpoDoEnvio, textoDoLedger: string): Promise<void> => {
    await entrada.espacar();
    if (!entrada.executar) {
      conferir(await sendMessageHandler(admin, entrada.contexto, corpo));
      return;
    }
    await entrada.executar(textoDoLedger, async (key, messageId) => {
      const mensagem = await sendMessageHandler(
        admin,
        { ...entrada.contexto, internalMessageId: messageId, requestId: key },
        { ...corpo, metadata: { ...((corpo as { metadata?: Record<string, unknown> }).metadata ?? {}), idempotency_key: key } } as CorpoDoEnvio,
      );
      conferir(mensagem);
      return mensagem;
    });
  };
  return {
    texto: (body, chave) =>
      enviar({
        conversation_id: entrada.conversationId,
        type: "text",
        body,
        metadata: { idempotency_key: chave },
      } as CorpoDoEnvio, body),
    // A decisão nativo-vs-texto é do `_handler`, pela capacidade do canal: aqui vai o texto numerado + metadata.
    interativo: (i, chave) =>
      enviar({
        conversation_id: entrada.conversationId,
        type: "text",
        body: textoNumeradoDeReserva(i),
        metadata: { idempotency_key: chave, interativo: i },
      } as CorpoDoEnvio, textoNumeradoDeReserva(i)),
    midia: async ({ assetId, legenda }, chave) => {
      const copia = await copiarAtivoParaConversa(admin, {
        organizationId: entrada.organizationId,
        assetId,
        conversationId: entrada.conversationId,
      });
      await enviar({
        conversation_id: entrada.conversationId,
        type: copia.tipo,
        media_storage_path: copia.storagePath,
        media_mime: copia.mime,
        ...(legenda ? { body: legenda } : {}),
        metadata: { idempotency_key: chave },
      } as CorpoDoEnvio, legenda ?? "");
    },
  };
}
