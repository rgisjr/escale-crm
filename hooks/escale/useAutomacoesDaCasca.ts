"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import type { CorDaPasta, IconeDaPasta } from "@/lib/escale/automacoes/pastas";
import type { FormaDeMontar } from "@/lib/escale/automacoes/rotas";
import type { ListaDeAutomacoes } from "@/lib/escale/automacoes/tipos";

/**
 * OS DADOS DA LISTA DE AUTOMAÇÕES DA CASCA (fork Escale, Fase 5A). A chave leva o
 * prefixo do original (`["automation-rules", …]`): as mutações do editor e do fluxo
 * invalidam `["automation-rules"]` e, pelo casamento por prefixo, recarregam esta
 * lista também. Ligar/pausar, renomear e excluir uma usam as rotas do original.
 */
export const CHAVE_DAS_AUTOMACOES = ["automation-rules", "da-casca"] as const;
const BASE = "/api/v1/automacoes-da-casca";
const REGRAS = "/api/v1/automation-rules";
const STALE_MS = 15_000;

export function useListaDeAutomacoes() {
  return useQuery({
    queryKey: CHAVE_DAS_AUTOMACOES,
    queryFn: async () => (await apiClient.get<{ data: ListaDeAutomacoes }>(BASE)).data,
    staleTime: STALE_MS,
  });
}

export function useAcoesDasPastas() {
  const qc = useQueryClient();
  const aoTerminar = () => qc.invalidateQueries({ queryKey: CHAVE_DAS_AUTOMACOES });
  const criar = useMutation({
    mutationFn: async (p: { nome: string; cor?: CorDaPasta; icone?: IconeDaPasta }) =>
      (await apiClient.post<{ data: { id: string } }>(`${BASE}/pastas`, p)).data,
    onError: showApiError,
    onSuccess: aoTerminar,
  });
  const editar = useMutation({
    mutationFn: async ({ id, ...edicao }: { id: string; nome?: string; cor?: CorDaPasta; icone?: IconeDaPasta }) =>
      apiClient.patch(`${BASE}/pastas/${id}`, edicao),
    onError: showApiError,
    onSuccess: aoTerminar,
  });
  const excluir = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`${BASE}/pastas/${id}`),
    onError: showApiError,
    onSuccess: aoTerminar,
  });
  return { criar, editar, excluir };
}

type Anterior = { anterior: ListaDeAutomacoes | undefined };

export function useAcoesDasAutomacoes() {
  const qc = useQueryClient();
  const t = useT();
  const aoTerminar = () => qc.invalidateQueries({ queryKey: CHAVE_DAS_AUTOMACOES });

  /** Muda uma automação da lista na hora e devolve a cópia anterior, para desfazer se falhar. */
  const otimista = async (id: string, mudanca: { ativa?: boolean; favorita?: boolean }): Promise<Anterior> => {
    await qc.cancelQueries({ queryKey: CHAVE_DAS_AUTOMACOES });
    const anterior = qc.getQueryData<ListaDeAutomacoes>(CHAVE_DAS_AUTOMACOES);
    if (anterior) {
      qc.setQueryData<ListaDeAutomacoes>(CHAVE_DAS_AUTOMACOES, {
        ...anterior,
        automacoes: anterior.automacoes.map((a) => (a.id === id ? { ...a, ...mudanca } : a)),
      });
    }
    return { anterior };
  };
  const desfazer = (_erro: unknown, _v: unknown, ctx: Anterior | undefined) => {
    if (ctx?.anterior) qc.setQueryData(CHAVE_DAS_AUTOMACOES, ctx.anterior);
  };

  const alternar = useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) =>
      apiClient.patch(`${REGRAS}/${id}`, { is_active: ativa }),
    onMutate: ({ id, ativa }) => otimista(id, { ativa }),
    onError: (erro, v, ctx) => {
      desfazer(erro, v, ctx);
      showApiError(erro);
    },
    onSuccess: (_r, { ativa }) => toast.success(ativa ? t("Automação ligada.") : t("Automação pausada.")),
    onSettled: aoTerminar,
  });
  const favoritar = useMutation({
    mutationFn: async ({ id, favorita }: { id: string; favorita: boolean }) =>
      apiClient.put(`${BASE}/${id}/favorita`, { favorita }),
    onMutate: ({ id, favorita }) => otimista(id, { favorita }),
    onError: (erro, v, ctx) => {
      desfazer(erro, v, ctx);
      showApiError(erro);
    },
    onSettled: aoTerminar,
  });
  const renomear = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => apiClient.patch(`${REGRAS}/${id}`, { name: nome }),
    onError: showApiError,
    onSuccess: aoTerminar,
  });
  const excluir = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`${REGRAS}/${id}`),
    onError: showApiError,
    onSuccess: aoTerminar,
  });
  const duplicar = useMutation({
    mutationFn: async (id: string) => (await apiClient.post<{ data: { id: string } }>(`${BASE}/${id}/duplicar`, {})).data,
    onError: showApiError,
    onSuccess: aoTerminar,
  });
  const organizar = useMutation({
    mutationFn: async ({ id, ...o }: { id: string; pasta_id?: string | null; forma?: FormaDeMontar }) =>
      apiClient.put(`${BASE}/${id}/organizacao`, o),
    onError: showApiError,
    onSuccess: aoTerminar,
  });
  const moverEmLote = useMutation({
    mutationFn: async (p: { ids: string[]; pasta_id: string | null }) =>
      (await apiClient.post<{ data: { movidas: string[]; falhas: string[] } }>(`${BASE}/mover`, p)).data,
    onError: showApiError,
    onSettled: aoTerminar,
  });
  const excluirEmLote = useMutation({
    mutationFn: async (ids: string[]) =>
      (await apiClient.post<{ data: { excluidas: string[]; falhas: string[] } }>(`${BASE}/excluir`, { ids })).data,
    onError: showApiError,
    onSettled: aoTerminar,
  });
  return { alternar, renomear, excluir, duplicar, favoritar, organizar, moverEmLote, excluirEmLote };
}

/**
 * Depois que o fluxo ou o editor criam a automação, grava a pasta e a forma. Não lança:
 * se falhar, avisa e a automação fica sem pasta (abre no fluxo), como a Q4 manda.
 */
export function useOrganizarAoCriar(): (
  id: string,
  organizacao: { pasta_id: string | null; forma: FormaDeMontar },
) => Promise<void> {
  const qc = useQueryClient();
  const t = useT();
  return useCallback(
    async (id, organizacao) => {
      try {
        await apiClient.put(`${BASE}/${id}/organizacao`, organizacao);
        await qc.invalidateQueries({ queryKey: CHAVE_DAS_AUTOMACOES });
      } catch {
        toast.error(t("A automação foi criada, mas não foi possível colocá-la na pasta."));
      }
    },
    [qc, t],
  );
}
