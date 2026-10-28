"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/types";
import type { CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";

const FRESCOR_MS = 300_000;

/** O catálogo de Indicadores para o editor (fork Escale, Fase 7D): uma vez por sessão, sem o `sql`. */
export function useCatalogoDeIndicadores() {
  return useQuery<CatalogoDaTela, ApiError>({
    queryKey: ["catalogo-de-indicadores"],
    queryFn: async () => (await apiClient.get<{ data: CatalogoDaTela }>("/api/v1/indicadores-da-casca/catalogo")).data,
    staleTime: FRESCOR_MS,
  });
}
