"use client";

import { useQuery } from "@tanstack/react-query";

import type { ComentariosDoContato } from "@/lib/escale/comentarios/origem";
import { fetchComTempoMaximo } from "@/lib/escale/fetch-com-tempo-maximo";

async function pedir<T>(url: string): Promise<T> {
  const r = await fetchComTempoMaximo(url);
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(corpo?.error?.message ?? "Não foi possível completar a ação.");
  return corpo.data as T;
}

/** FORK ESCALE · Fase 10C: a origem do comentário e os comentários mais recentes do contato. */
export function useComentariosDoContato(contatoId: string | null) {
  return useQuery({
    queryKey: ["comentarios-do-contato", contatoId],
    queryFn: () => pedir<ComentariosDoContato>(`/api/v1/contatos/${contatoId}/comentarios`),
    enabled: Boolean(contatoId),
    staleTime: 15_000,
  });
}
