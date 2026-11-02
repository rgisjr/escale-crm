"use client";
import { useMutation, useQueryClient, type InfiniteData, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  chaveDosComentarios,
  codigoDoErro,
  tirarComentarioDaCache,
  trocarComentarioNaCache,
  type PaginaDeComentarios,
} from "@/hooks/escale/useComentarios";
import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";
import type { ComentarioDaCaixa } from "@/lib/escale/comentarios/caixa";
import { useT } from "@/lib/i18n/IdiomaProvider";

/**
 * FORK ESCALE · Fase 10A: as ações da caixa de comentários (responder, direct, ocultar, apagar), com a
 * atualização otimista do plano (4.7). Separado de \`useComentarios.ts\` para ele ficar abaixo de 400
 * linhas; a 10D importa daqui.
 */
const RAIZ = "/api/v1/escale/comentarios";
type Cache = InfiniteData<PaginaDeComentarios> | undefined;

const alvo = (canal: string, publicacao: string) => ({ canal, publicacao });
const idNaUrl = (c: ComentarioDaCaixa) => encodeURIComponent(c.id);

function useCacheDosComentarios(canal: string, publicacao: string) {
  const qc = useQueryClient();
  const chave = chaveDosComentarios(canal, publicacao);
  return {
    chave,
    ler: () => qc.getQueryData<Cache>(chave),
    gravar: (dados: Cache) => qc.setQueryData(chave, dados),
    refazer: () => qc.invalidateQueries({ queryKey: chave }),
  };
}

export function useResponderComentario(
  canal: string,
  publicacao: string,
): UseMutationResult<{ commentId: string | null }, ApiError, { comentario: ComentarioDaCaixa; texto: string }> {
  const cache = useCacheDosComentarios(canal, publicacao);
  return useMutation<{ commentId: string | null }, ApiError, { comentario: ComentarioDaCaixa; texto: string }>({
    mutationFn: async ({ comentario, texto }) =>
      (
        await apiClient.post<{ data: { commentId: string | null } }>(`${RAIZ}/${idNaUrl(comentario)}/responder`, {
          ...alvo(canal, publicacao),
          texto,
        })
      ).data,
    onSuccess: (_r, { comentario }) => {
      cache.gravar(trocarComentarioNaCache(cache.ler(), comentario.id, (c) => ({ ...c, respondido: true })));
      void cache.refazer();
    },
  });
}

export function useDirectDoComentario(
  canal: string,
  publicacao: string,
): UseMutationResult<{ conversationId: string | null }, ApiError, { comentario: ComentarioDaCaixa; texto: string }> {
  const cache = useCacheDosComentarios(canal, publicacao);
  const marcarComoUsado = (id: string) =>
    cache.gravar(
      trocarComentarioNaCache(cache.ler(), id, (c) => ({ ...c, direct: { liberado: false, motivo: "ja_usado" } })),
    );
  return useMutation<{ conversationId: string | null }, ApiError, { comentario: ComentarioDaCaixa; texto: string }>({
    mutationFn: async ({ comentario, texto }) =>
      (
        await apiClient.post<{ data: { conversationId: string | null } }>(`${RAIZ}/${idNaUrl(comentario)}/direct`, {
          ...alvo(canal, publicacao),
          texto,
          comentadoEm: comentario.comentadoEm,
          autor: { id: comentario.autor.id, usuario: comentario.autor.usuario, nome: comentario.autor.nome },
        })
      ).data,
    onSuccess: (_r, { comentario }) => marcarComoUsado(comentario.id),
    onError: (erro, { comentario }) => {
      if (codigoDoErro(erro) === "resposta_privada_ja_usada") marcarComoUsado(comentario.id);
    },
  });
}

export function useOcultarComentario(
  canal: string,
  publicacao: string,
): UseMutationResult<
  { oculto: boolean },
  ApiError,
  { comentario: ComentarioDaCaixa; ocultar: boolean },
  { anterior: Cache }
> {
  const cache = useCacheDosComentarios(canal, publicacao);
  const t = useT();
  return useMutation<
    { oculto: boolean },
    ApiError,
    { comentario: ComentarioDaCaixa; ocultar: boolean },
    { anterior: Cache }
  >({
    mutationFn: async ({ comentario, ocultar }) => {
      const base = `${RAIZ}/${idNaUrl(comentario)}/ocultar`;
      const autor = comentario.autor.id;
      return (
        ocultar
          ? await apiClient.post<{ data: { oculto: boolean } }>(base, { ...alvo(canal, publicacao), autor })
          : await apiClient.delete<{ data: { oculto: boolean } }>(
              `${base}?canal=${encodeURIComponent(canal)}&publicacao=${encodeURIComponent(publicacao)}&autor=${encodeURIComponent(autor)}`,
            )
      ).data;
    },
    onMutate: ({ comentario, ocultar }) => {
      const anterior = cache.ler();
      cache.gravar(trocarComentarioNaCache(anterior, comentario.id, (c) => ({ ...c, oculto: ocultar })));
      return { anterior };
    },
    onError: (_erro, { ocultar }, contexto) => {
      cache.gravar(contexto?.anterior);
      toast.error(t(ocultar ? "Não consegui ocultar o comentário." : "Não consegui reexibir o comentário."));
    },
  });
}

export function useApagarComentario(
  canal: string,
  publicacao: string,
): UseMutationResult<{ apagado: true }, ApiError, { comentario: ComentarioDaCaixa }> {
  const cache = useCacheDosComentarios(canal, publicacao);
  const t = useT();
  return useMutation<{ apagado: true }, ApiError, { comentario: ComentarioDaCaixa }>({
    mutationFn: async ({ comentario }) =>
      (
        await apiClient.delete<{ data: { apagado: true } }>(
          `${RAIZ}/${idNaUrl(comentario)}?canal=${encodeURIComponent(canal)}&publicacao=${encodeURIComponent(publicacao)}&autor=${encodeURIComponent(comentario.autor.id)}`,
        )
      ).data,
    // Sem otimismo: apagar não tem volta. Sai da lista quando o Zernio confirma.
    onSuccess: (_r, { comentario }) => {
      cache.gravar(tirarComentarioDaCache(cache.ler(), comentario.id));
      toast.success(t("Comentário apagado."));
    },
    onError: () => toast.error(t("Não consegui apagar o comentário.")),
  });
}
