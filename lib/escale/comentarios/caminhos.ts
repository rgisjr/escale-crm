import { z } from "zod";

import { JANELA_DA_MENSAGEM_MS, PLATAFORMAS_DE_COMENTARIO, PRAZO_DA_RESPOSTA_PRIVADA_MS } from "./constantes";
import { casaComFiltro } from "./filtro";
import { configDoComentarioSchema, type CaminhoDoGatilho } from "./schema";

export { casaComFiltro } from "./filtro";
export { problemasDoGatilho } from "./problemas";

/** O que o evento `comment.received` emitido por `receberComentario` traz (plano 10B, seção 3.1). */
export const comentarioDoEventoSchema = z.object({
  contact_id: z.string().uuid(),
  channel_session_id: z.string().uuid(),
  plataforma: z.enum(PLATAFORMAS_DE_COMENTARIO),
  conta_id: z.string().min(1),
  comentario: z.object({
    id: z.string().min(1),
    texto: z.string(),
    comentado_em: z.string(),
    publicacao_id: z.string().min(1),
    publicacao_zernio_id: z.string().nullable(),
    autor: z.object({
      id: z.string().min(1),
      usuario: z.string().nullable(),
      nome: z.string().nullable(),
      /** FORK ESCALE · Fase 10D (D12): isFollower do Instagram; null = não informado. */
      seguidor: z.boolean().nullable().default(null),
    }),
  }),
  publicacao: z.object({
    legenda: z.string().nullable(),
    miniatura: z.string().nullable(),
    link: z.string().nullable(),
  }),
});
export type ComentarioDoEvento = z.infer<typeof comentarioDoEventoSchema>;

export function comentarioDoEvento(payload: unknown): ComentarioDoEvento | null {
  const lido = comentarioDoEventoSchema.safeParse(payload);
  return lido.success ? lido.data : null;
}

/** Só o que escolher o caminho precisa: o contato ainda não existe quando `receberComentario` pergunta. */
const payloadParcialSchema = z.object({
  channel_session_id: z.string().min(1),
  comentario: z.object({ publicacao_id: z.string().min(1), texto: z.string() }),
});

/**
 * O caminho que o comentário pega nesta regra, ou null. Conta errada, config ilegível ou
 * nenhum caminho com a publicação → null. "todos" = o primeiro caminho, sem olhar publicação.
 * "especificos" = o caminho que contém a publicação (uma publicação está em um caminho só).
 */
export function caminhoDoComentario(triggerConfig: unknown, payload: unknown): CaminhoDoGatilho | null {
  const config = configDoComentarioSchema.safeParse(triggerConfig);
  const evento = payloadParcialSchema.safeParse(payload);
  if (!config.success || !evento.success) return null;
  if (config.data.channel_session_id !== evento.data.channel_session_id) return null;

  const { publicacao_id: publicacaoId, texto } = evento.data.comentario;
  const { escopo, proxima } = config.data;
  // FORK ESCALE · Fase 10D (D11): "próxima" só vale depois de resolvida, e só para a publicação resolvida.
  if (escopo === "proxima" && proxima?.resolvida?.id !== publicacaoId) return null;
  const caminho =
    escopo === "todos" || escopo === "proxima"
      ? config.data.caminhos[0]
      : config.data.caminhos.find((c) => c.publicacoes.some((p) => p.id === publicacaoId));
  if (!caminho) return null;
  return casaComFiltro(texto, caminho.filtro) ? caminho : null;
}

/** Sorteia a variação não vazia (o `aleatorio` é injetável para teste). Nenhuma → null. */
export function sortearVariacao(variacoes: readonly string[], aleatorio: () => number = Math.random): string | null {
  const preenchidas = variacoes.filter((v) => v.trim() !== "");
  if (preenchidas.length === 0) return null;
  return preenchidas[Math.min(Math.floor(aleatorio() * preenchidas.length), preenchidas.length - 1)]!;
}

/** Meta: até 7 dias. Data ilegível → false (não arrisca gastar a resposta privada). */
export function dentroDoPrazo(comentadoEm: string, agora: Date): boolean {
  const quando = Date.parse(comentadoEm);
  if (Number.isNaN(quando)) return false;
  return agora.getTime() - quando <= PRAZO_DA_RESPOSTA_PRIVADA_MS;
}

/** D8: a Meta aceita mensagem comum até 24 h depois da última da pessoa. Data ilegível → false. */
export function dentroDaJanela(recebidaEm: string, agora: Date): boolean {
  const quando = Date.parse(recebidaEm);
  if (Number.isNaN(quando)) return false;
  return agora.getTime() - quando <= JANELA_DA_MENSAGEM_MS;
}
