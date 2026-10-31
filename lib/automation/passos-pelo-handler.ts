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
  entrada: { organizationId: string; conversationId: string; contexto: ContextoDoEnvio; espacar: () => Promise<void> },
): EnviadorDePassos {
  const enviar = async (corpo: CorpoDoEnvio): Promise<void> => {
    await entrada.espacar();
    conferir(await sendMessageHandler(admin, entrada.contexto, corpo));
  };
  return {
    texto: (body, chave) =>
      enviar({
        conversation_id: entrada.conversationId,
        type: "text",
        body,
        metadata: { idempotency_key: chave },
      } as CorpoDoEnvio),
    // A decisão nativo-vs-texto é do `_handler`, pela capacidade do canal: aqui vai o texto numerado + metadata.
    interativo: (i, chave) =>
      enviar({
        conversation_id: entrada.conversationId,
        type: "text",
        body: textoNumeradoDeReserva(i),
        metadata: { idempotency_key: chave, interativo: i },
      } as CorpoDoEnvio),
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
      } as CorpoDoEnvio);
    },
  };
}
