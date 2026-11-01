import { z } from "zod";

import { casaComPalavraChave } from "@/lib/automation/palavra-chave";

import { PLATAFORMAS_DE_COMENTARIO, PRAZO_DA_RESPOSTA_PRIVADA_MS } from "./constantes";
import { configDoComentarioSchema, type CaminhoDoGatilho, type FiltroDoCaminho } from "./schema";

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
    autor: z.object({ id: z.string().min(1), usuario: z.string().nullable(), nome: z.string().nullable() }),
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

export function casaComFiltro(texto: string, filtro: FiltroDoCaminho): boolean {
  if (filtro.modo === "qualquer") return true;
  const palavras = filtro.palavras.filter((p) => p.trim() !== "");
  if (palavras.length === 0) return false;
  const casa = (p: string) => casaComPalavraChave(texto, p, "contem");
  return filtro.combinar === "todas" ? palavras.every(casa) : palavras.some(casa);
}

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
  const caminho =
    config.data.escopo === "todos"
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
