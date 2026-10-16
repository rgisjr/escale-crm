"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { parametroDoAlvo, type AlvoDoFiltro, type FiltroSalvo } from "@/lib/escale/filtros/filtros-salvos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";

/**
 * OS FILTROS SALVOS DE UM QUADRO (fork Escale, Fase 1D). Toda escrita RESOLVE a
 * lista relida do banco (a rota devolve), e ela vai direto para a cache: o menu
 * mostra o resultado sem esperar outra ida ao servidor.
 */
type Resposta = { data: FiltroSalvo[] };

const ROTA = "/api/v1/filtros-salvos";

export const chaveDosFiltrosSalvos = (alvo: AlvoDoFiltro) => ["filtros-salvos", alvo.tipo, alvo.id] as const;

export interface NovoFiltroSalvo {
  id: string;
  nome: string;
  compartilhado: boolean;
  criterios: FiltrosDoQuadro;
}

export interface MudancaDoFiltroSalvo {
  nome?: string;
  compartilhado?: boolean;
  criterios?: FiltrosDoQuadro;
}

export function useFiltrosSalvos(alvo: AlvoDoFiltro) {
  return useQuery({
    queryKey: chaveDosFiltrosSalvos(alvo),
    queryFn: async () =>
      (await apiClient.get<Resposta>(`${ROTA}?${parametroDoAlvo(alvo)}=${encodeURIComponent(alvo.id)}`)).data,
    staleTime: 30_000,
  });
}

function useGravar<A>(alvo: AlvoDoFiltro, enviar: (args: A) => Promise<Resposta>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: A) => (await enviar(args)).data,
    onSuccess: (lista) => qc.setQueryData(chaveDosFiltrosSalvos(alvo), lista),
    // 404/403 (o filtro sumiu ou mudou de dono em outra aba): relê a lista para a entrada velha sair do menu.
    // O erro continua indo para quem chamou (mutate/mutateAsync).
    onError: () => qc.invalidateQueries({ queryKey: chaveDosFiltrosSalvos(alvo) }),
  });
}

export function useCriarFiltroSalvo(alvo: AlvoDoFiltro) {
  return useGravar(alvo, (novo: NovoFiltroSalvo) =>
    apiClient.post<Resposta>(ROTA, { ...novo, [parametroDoAlvo(alvo)]: alvo.id }),
  );
}

export function useMudarFiltroSalvo(alvo: AlvoDoFiltro) {
  return useGravar(alvo, ({ id, mudanca }: { id: string; mudanca: MudancaDoFiltroSalvo }) =>
    apiClient.patch<Resposta>(`${ROTA}/${encodeURIComponent(id)}`, mudanca),
  );
}

export function useExcluirFiltroSalvo(alvo: AlvoDoFiltro) {
  return useGravar(alvo, (id: string) => apiClient.delete<Resposta>(`${ROTA}/${encodeURIComponent(id)}`));
}
