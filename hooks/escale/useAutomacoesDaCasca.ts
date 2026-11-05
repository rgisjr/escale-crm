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
import type { Desenho } from "@/lib/automation/desenho-da-regra";
import { ApiError } from "@/lib/api/types";
import { problemasDoServidor } from "@/lib/escale/automacoes/fluxo/erros-do-publish";

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

/** FORK ESCALE · 5D: a regra grava só o gatilho e UMA ação `start_message_flow`? Então pode ser uma automação em modo fluxo. */
export function podeSerModoFluxo(regra: { actions: Array<{ type: string }> } | null): boolean {
  return !!regra && regra.actions.length === 1 && regra.actions[0]!.type === "start_message_flow";
}

/** O desenho de uma automação em modo fluxo; `null` quando ela é só uma regra (404). */
export function useDesenhoDoFluxo(regraId: string | null) {
  return useQuery({
    queryKey: ["automation-rules", "fluxo", regraId],
    enabled: regraId !== null,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<Desenho | null> => {
      try {
        return (await apiClient.get<{ data: { desenho: Desenho } }>(`${BASE}/${regraId}/fluxo`)).data.desenho;
      } catch (erro) {
        if (erro instanceof ApiError && erro.code === "not_found") return null;
        throw erro;
      }
    },
  });
}

export type ResultadoDaGravacaoDoFluxo = { ruleId: string; pointerId: string; atualizadoEm: string | null };

/** Salva e publica a automação em modo fluxo (o servidor compila o desenho de novo). */
export function useGravarFluxo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string | null; nome: string; desenho: Desenho; versao: string | null }) =>
      (
        await apiClient.put<{ data: ResultadoDaGravacaoDoFluxo }>(`${BASE}/${p.id ?? "novo"}/fluxo`, {
          nome: p.nome,
          desenho: p.desenho,
          ...(p.versao ? { versao: p.versao } : {}),
        })
      ).data,
    // FORK ESCALE · 5D: a recusa com lista de erros a tela marca nas caixas; o resto vira o toast de sempre.
    onError: (e: unknown) => {
      if (problemasDoServidor(e) === null) showApiError(e);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules"] }),
  });
}

/** FORK ESCALE · automações: o rascunho salvo sem publicar (9708). */
export interface RascunhoDaAutomacao {
  nome: string;
  desenho: Desenho;
  atualizadoEm: string;
}

const chaveDoRascunho = (regraId: string) => ["automation-rules", "rascunho", regraId] as const;

/** O rascunho pendente da automação; `null` quando não há. Lido a cada abertura (nunca de cópia velha). */
export function useRascunhoDaAutomacao(regraId: string | null) {
  return useQuery({
    queryKey: chaveDoRascunho(regraId ?? ""),
    enabled: regraId !== null,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<RascunhoDaAutomacao | null> =>
      (await apiClient.get<{ data: { rascunho: RascunhoDaAutomacao | null } }>(`${BASE}/${regraId}/rascunho`)).data.rascunho,
  });
}

/** Grava o desenho como está. `id: null` = automação nova (a rota cria a regra pausada). */
export function useSalvarRascunho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string | null; nome: string; desenho: Desenho }) =>
      (
        await apiClient.put<{ data: { ruleId: string; atualizadoEm: string; criada: boolean } }>(`${BASE}/${p.id ?? "novo"}/rascunho`, {
          nome: p.nome,
          desenho: p.desenho,
        })
      ).data,
    onError: (e: unknown) => showApiError(e),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_AUTOMACOES }),
  });
}

export function useDescartarRascunho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (regraId: string) => {
      await apiClient.delete(`${BASE}/${regraId}/rascunho`);
    },
    onError: (e: unknown) => showApiError(e),
    onSuccess: (_dado, regraId) => {
      qc.setQueryData(chaveDoRascunho(regraId), null);
      void qc.invalidateQueries({ queryKey: CHAVE_DAS_AUTOMACOES });
    },
  });
}
