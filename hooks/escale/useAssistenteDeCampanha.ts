"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { ResumoDaPreparacao, MotivoFora } from "@/lib/escale/campanhas/acoes-do-assistente";
import type { Assistente, PublicoDaCampanha } from "@/lib/escale/campanhas/assistente";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";
import type { LinhaDoDestinatario } from "@/lib/escale/campanhas/publico-banco";
import type { DadosDoAssistente } from "@/lib/escale/campanhas/rascunho";
import { CHAVE_DAS_CAMPANHAS } from "@/hooks/escale/useCampanhasDaCasca";

/** OS PEDIDOS DO ASSISTENTE (fork Escale, Fase 8B). */
export const CHAVE_DO_ASSISTENTE = "assistente-de-campanha";

export function useNumerosDaCampanha() {
  return useQuery({
    queryKey: [CHAVE_DO_ASSISTENTE, "numeros"],
    queryFn: async () =>
      (await apiClient.get<{ data: NumeroDaCampanha[] }>("/api/v1/campanhas-da-casca/numeros"))
        .data,
    staleTime: 30_000,
  });
}

export function useAssistenteSalvo(id: string | null) {
  return useQuery({
    queryKey: [CHAVE_DO_ASSISTENTE, "salvo", id],
    enabled: id !== null,
    queryFn: async () =>
      (
        await apiClient.get<{ data: DadosDoAssistente }>(
          `/api/v1/campanhas-da-casca/${id}/assistente`,
        )
      ).data,
    staleTime: Infinity,
    // Sem cache entre aberturas: reabrir "Editar" traz o que está no servidor, não o de minutos atrás (B8-3).
    gcTime: 0,
  });
}

export function useSalvarAssistente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campanhaId,
      dados,
    }: {
      campanhaId: string | null;
      dados: Assistente;
    }): Promise<string> => {
      if (campanhaId) {
        await apiClient.put(`/api/v1/campanhas-da-casca/${campanhaId}/assistente`, dados);
        return campanhaId;
      }
      return (await apiClient.post<{ data: { id: string } }>("/api/v1/campanhas-da-casca", dados))
        .data.id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] }),
  });
}

export function useAcaoDoAssistente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, acao }: { id: string; acao: "preparar" | "enviar" | "rascunho" }) =>
      (
        await apiClient.post<{ data: Record<string, unknown> }>(
          `/api/v1/campanhas-da-casca/${id}/${acao}`,
          {},
        )
      ).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] }),
  });
}

export type ResumoDoPreparo = ResumoDaPreparacao;

export function usePaginaDoPublico(
  publico: PublicoDaCampanha,
  pagina: number,
  porPagina: number,
  ativo: boolean,
) {
  return useQuery({
    queryKey: [CHAVE_DO_ASSISTENTE, "publico", publico, pagina, porPagina],
    enabled: ativo,
    placeholderData: (anterior) => anterior,
    queryFn: async () =>
      (
        await apiClient.post<{ data: { linhas: LinhaDoDestinatario[]; total: number } }>(
          "/api/v1/campanhas-da-casca/publico",
          {
            publico,
            pagina,
            porPagina,
          },
        )
      ).data,
  });
}

export function useForaDaLista(id: string | null, ativo: boolean) {
  return useQuery({
    queryKey: [CHAVE_DO_ASSISTENTE, "fora", id],
    enabled: ativo && id !== null,
    queryFn: async () =>
      (
        await apiClient.get<{ data: MotivoFora[] }>(
          `/api/v1/campanhas-da-casca/${id}/fora-da-lista`,
        )
      ).data,
  });
}

export async function contatosDaImportacao(id: string): Promise<string[]> {
  return (await apiClient.get<{ data: { ids: string[] } }>(`/api/v1/importacoes/${id}/contatos`))
    .data.ids;
}

const FINAIS = new Set(["concluida", "cancelada", "falhou"]);

/**
 * Acompanha a importação do .csv a cada 2 s até um estado final (N10). Em
 * "aguardando_revisao" continua: quando a revisão termina em Importações, a
 * importação conclui e os contatos entram na lista.
 */
export function useAcompanharImportacao(id: string | null) {
  return useQuery({
    queryKey: [CHAVE_DO_ASSISTENTE, "importacao", id],
    enabled: id !== null,
    queryFn: async () =>
      (await apiClient.get<{ data: { status: string } }>(`/api/v1/importacoes/${id}`)).data,
    refetchInterval: (q) => (q.state.data && FINAIS.has(q.state.data.status) ? false : 2000),
  });
}
