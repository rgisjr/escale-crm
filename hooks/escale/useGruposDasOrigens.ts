"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { Origens } from "@/lib/escale/origens/regras";

/** Os grupos de origens ativos (1A), por nome — o "Negócio nos grupos" do painel (N20). */
export function useGruposDasOrigens() {
  return useQuery({
    queryKey: ["pipeline-groups", "ativos"],
    staleTime: 5 * 60_000,
    queryFn: async () => (await apiClient.get<{ data: Origens }>("/api/v1/pipeline-groups")).data,
    select: (o) =>
      o.grupos
        .filter((g) => !g.is_archived)
        .map((g) => ({ id: g.id, nome: g.name }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  });
}
