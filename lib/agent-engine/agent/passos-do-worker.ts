/**
 * Sequência de passos (texto e mídia) do nó `steps` pelo WORKER do agente — o irmão de
 * `lib/followup/enviar-texto-fixo.ts` (envio inline). Os dois usam o MESMO orquestrador
 * (`enviarPassos`); aqui cada passo sai por `enviarFixo`, que é o `sendFixedOutbound` do turno
 * (cadeia de guardrails, ledger por (job, seq), janela e horário do canal).
 *
 * Um passo que não sai (adiado pela janela ou vetado) INTERROMPE a sequência e devolve o desfecho
 * tal como veio: o job volta a rodar na abertura, e os passos já enviados voltam como `already_sent`
 * do ledger (mesma `seq`), então nada sai em dobro.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { enviarPassos, type EnviadorDePassos, type PassoDeEnvio } from '@/lib/automation/envio-de-passos';
import { lerAtivosDoCanal } from '@/lib/canais/ativos-do-canal';
import type { Interativo } from '@/lib/channels/interativo';
import { textoNumeradoDeReserva } from '@/lib/channels/interativo';
import { copiarAtivoParaConversa } from '@/lib/midia/ativos-banco';

export type DesfechoDoPasso =
  | { kind: 'sent' }
  | { kind: 'deferred'; until: Date; reason: string }
  | { kind: 'skipped' };

export interface ExtraDoPasso {
  seq: number;
  media?: { storagePath: string; mime: string };
  metadata?: Record<string, unknown>;
}

export interface DepsDosPassosDoWorker {
  admin: SupabaseClient;
  organizationId: string;
  conversationId: string;
  channelSessionId: string;
  /** Envia UM passo pelo `sendFixedOutbound` do turno. */
  enviarFixo: (body: string, extra: ExtraDoPasso) => Promise<DesfechoDoPasso>;
}

/** `sent` = a sequência inteira saiu. Erro de configuração ou de envio LANÇA (a fila tenta de novo). */
export async function enviarPassosDoWorker(
  passos: readonly PassoDeEnvio[],
  deps: DepsDosPassosDoWorker,
): Promise<DesfechoDoPasso> {
  let seq = 0;
  const estado: { parada: DesfechoDoPasso | null } = { parada: null };

  const registrar = async (body: string, extra: Omit<ExtraDoPasso, 'seq'>): Promise<void> => {
    seq += 1;
    const desfecho = await deps.enviarFixo(body, { ...extra, seq });
    if (desfecho.kind !== 'sent') {
      estado.parada = desfecho;
      throw new Error('passo_nao_enviado');
    }
  };

  const enviador: EnviadorDePassos = {
    texto: (corpo) => registrar(corpo, {}),
    midia: async ({ assetId, legenda }) => {
      const copia = await copiarAtivoParaConversa(deps.admin, {
        organizationId: deps.organizationId,
        assetId,
        conversationId: deps.conversationId,
      });
      await registrar(legenda ?? '', { media: { storagePath: copia.storagePath, mime: copia.mime } });
    },
    interativo: (i: Interativo) => registrar(textoNumeradoDeReserva(i), { metadata: { interativo: i } }),
  };

  const resultado = await enviarPassos(passos, {
    enviador,
    ativosDoCanal: await lerAtivosDoCanal(deps.admin, deps.organizationId, deps.channelSessionId),
    // O texto já chegou renderizado do enfileiramento (`turnPayloadExtras`): renderizar de novo leria dado do cadastro como modelo.
    renderizar: (texto) => texto,
    chaveBase: `passos:${deps.conversationId}`,
  });
  if (resultado.ok) return { kind: 'sent' };
  if (estado.parada !== null) return estado.parada;
  throw new Error(resultado.erro);
}
