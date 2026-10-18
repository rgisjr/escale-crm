"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { rotaDosArquivos, type Arquivo } from "@/lib/escale/negocio/arquivos";

/** ARQUIVOS DO CONTATO (fork Escale, Fase 1H; C17): ler, enviar (um por vez, multipart) e excluir. */
export const chaveDosArquivos = (contactId: string) => ["arquivos-do-contato", contactId] as const;

export function useArquivosDoContato(contactId: string | null) {
  return useQuery({
    queryKey: chaveDosArquivos(contactId ?? ""),
    enabled: !!contactId,
    queryFn: async () =>
      (await apiClient.get<{ data: Arquivo[] }>(rotaDosArquivos(contactId as string))).data,
  });
}

/** Um arquivo que não subiu: a mensagem já vem traduzida pela rota; `null` = sem mensagem (rede, 5xx sem corpo). */
export interface FalhaDoEnvio {
  /** O próprio arquivo (a tela casa por referência: dois arquivos podem ter o mesmo nome). */
  arquivo: File;
  nome: string;
  mensagem: string | null;
}

export interface ResultadoDoEnvio {
  enviados: number;
  falhas: FalhaDoEnvio[];
}

export function useEnviarArquivos(contactId: string, leadId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arquivos: File[]): Promise<ResultadoDoEnvio> => {
      const resultado: ResultadoDoEnvio = { enviados: 0, falhas: [] };
      const rota = leadId
        ? `${rotaDosArquivos(contactId)}?negocio=${encodeURIComponent(leadId)}`
        : rotaDosArquivos(contactId);
      for (const arquivo of arquivos) {
        const fd = new FormData();
        fd.append("file", arquivo);
        // `apiClient` manda JSON; o multipart vai por `fetch` cru, com o cookie da sessão.
        try {
          const res = await fetch(rota, { method: "POST", body: fd, credentials: "same-origin" });
          if (res.ok) {
            resultado.enviados += 1;
          } else {
            const corpo = (await res.json().catch(() => null)) as {
              error?: { message?: string };
            } | null;
            resultado.falhas.push({
              arquivo,
              nome: arquivo.name,
              mensagem: corpo?.error?.message ?? null,
            });
          }
        } catch {
          resultado.falhas.push({ arquivo, nome: arquivo.name, mensagem: null });
        }
      }
      return resultado;
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: chaveDosArquivos(contactId) }),
  });
}

export function useExcluirArquivo(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arquivoId: string) =>
      apiClient.delete<void>(`${rotaDosArquivos(contactId)}/${arquivoId}`),
    // `onSettled`: com falha no bucket a linha já saiu da tabela, e a lista precisa refletir isso.
    onSettled: () => void qc.invalidateQueries({ queryKey: chaveDosArquivos(contactId) }),
  });
}
