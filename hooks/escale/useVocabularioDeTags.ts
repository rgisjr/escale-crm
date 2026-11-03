"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { LinhaDeVocabulario } from "@/lib/schemas/tags";

/**
 * FORK ESCALE · automações: as tags da organização (contatos, negócios e conversas) para o gatilho de
 * tag. É a rota da tela de Tags, que pede gerente, a mesma régua de quem monta automação. Falhou: a
 * lista fica vazia e o seletor ainda mostra as tags já gravadas na regra.
 */
export function useVocabularioDeTags() {
  return useQuery({
    queryKey: ["vocabulario-de-tags-da-automacao"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      const res = await apiClient.get<{ data: LinhaDeVocabulario[] }>("/api/v1/tags/vocabulario");
      return res.data.map((linha) => linha.tag);
    },
  });
}
