"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { Resolucao } from "@/lib/escale/importacao/classificar";
import type { Acao, Motivo } from "@/lib/escale/importacao/regras";
import { STATUS_EM_ANDAMENTO, type StatusDaLinha } from "@/lib/escale/importacao/textos";
import type { ImportacaoLida, LinhaLida, PedidoDeImportacao } from "@/lib/escale/importacao/tipos";

/** Ler e mexer nas importações (fork Escale, Fase 2F). */
export const CHAVE_DAS_IMPORTACOES = ["importacoes"] as const;
const INTERVALO_MS = 5000;
/** O envio do arquivo (até 25 MB) e a gravação dos lotes podem demorar, mas não para sempre. */
export const TEMPO_LIMITE_DO_ENVIO_MS = 180_000;

export type DestinoDaImportacao = {
  id: string;
  nome: string;
  grupo: string | null;
  etapas: Array<{ id: string; nome: string }>;
  motivos: Array<{ valor: string; rotulo: string }>;
};

const emAndamento = (lista: readonly ImportacaoLida[] | undefined) =>
  (lista ?? []).some((i) => STATUS_EM_ANDAMENTO.includes(i.status));

/** A lista: pergunta a cada 5 s enquanto há importação na fila ou rodando, ou quando `perguntarRapido` (30 s depois de criar). */
export function useImportacoes(tipo: "todas" | "contato" | "negocio", pagina: number, perguntarRapido: boolean) {
  return useQuery({
    queryKey: [...CHAVE_DAS_IMPORTACOES, "lista", tipo, pagina],
    queryFn: async () =>
      (await apiClient.get<{ data: { itens: ImportacaoLida[]; total: number } }>(`/api/v1/importacoes?tipo=${tipo}&p=${pagina}`)).data,
    refetchInterval: (q) => (perguntarRapido || emAndamento(q.state.data?.itens) ? INTERVALO_MS : false),
  });
}

export function useImportacao(id: string) {
  return useQuery({
    queryKey: [...CHAVE_DAS_IMPORTACOES, "uma", id],
    queryFn: async () => (await apiClient.get<{ data: ImportacaoLida }>(`/api/v1/importacoes/${id}`)).data,
    refetchInterval: (q) => (q.state.data && STATUS_EM_ANDAMENTO.includes(q.state.data.status) ? INTERVALO_MS : false),
  });
}

export function useLinhasDaImportacao(id: string, quais: "revisar" | "relatorio") {
  return useQuery({
    queryKey: [...CHAVE_DAS_IMPORTACOES, "linhas", id, quais],
    queryFn: async () => (await apiClient.get<{ data: LinhaLida[] }>(`/api/v1/importacoes/${id}/linhas?quais=${quais}`)).data,
  });
}

export function useDestinosDaImportacao(ativo: boolean) {
  return useQuery({
    queryKey: [...CHAVE_DAS_IMPORTACOES, "destinos"],
    queryFn: async () => (await apiClient.get<{ data: DestinoDaImportacao[] }>("/api/v1/importacoes/destinos")).data,
    enabled: ativo,
    staleTime: 60_000,
  });
}

/** Multipart (o arquivo vai inteiro): por isso `fetch` e não o `apiClient`. Um proxy (413, 502) responde HTML, não JSON. */
export function useCriarImportacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ arquivo, pedido, signal }: { arquivo: File; pedido: PedidoDeImportacao; signal?: AbortSignal }) => {
      const form = new FormData();
      form.append("arquivo", arquivo);
      form.append("pedido", JSON.stringify(pedido));
      // Tempo limite + cancelamento de quem fechou a janela: sem isso uma conexão pendurada trava a tela.
      const limite = new AbortController();
      let estourou = false;
      const relogio = setTimeout(() => {
        estourou = true;
        limite.abort();
      }, TEMPO_LIMITE_DO_ENVIO_MS);
      type Resposta = { data?: { id: string; total: number }; error?: { message?: string } };
      let res: Response;
      let json: Resposta | null;
      try {
        res = await fetch("/api/v1/importacoes", { method: "POST", body: form, signal: signal ? AbortSignal.any([signal, limite.signal]) : limite.signal });
        json = (await res.json().catch(() => null)) as Resposta | null;
      } catch (e) {
        if (estourou) throw new Error("O envio demorou demais. Confira a lista de importações e tente de novo.");
        throw e;
      } finally {
        clearTimeout(relogio);
      }
      if (res.status === 413) throw new Error("O arquivo passa de 25 MB.");
      if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? "Não foi possível iniciar a importação.");
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_IMPORTACOES }),
  });
}

export function useResolverLinha(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ linhaId, resolucao }: { linhaId: string; resolucao: Resolucao }) =>
      (
        await apiClient.post<{ data: { status: StatusDaLinha; motivo: Motivo | null; importacao: string } }>(
          `/api/v1/importacoes/${id}/linhas/${linhaId}/resolver`,
          resolucao,
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CHAVE_DAS_IMPORTACOES, "uma", id] }),
  });
}

export function useResolverEmLote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lote: { motivo: Motivo; acao: Acao }) =>
      (await apiClient.post<{ data: { linhas: number } }>(`/api/v1/importacoes/${id}/resolver-em-lote`, lote)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_IMPORTACOES }),
  });
}

export function useCancelarImportacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<{ data: { status: string } }>(`/api/v1/importacoes/${id}/cancelar`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_IMPORTACOES }),
  });
}
