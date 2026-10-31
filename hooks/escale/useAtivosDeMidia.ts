"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { apiClient } from "@/lib/api/client";
import { ApiError, type ApiErrorBody } from "@/lib/api/types";
import type { AtivoLido } from "@/lib/midia/ativos-banco";

const CHAVE = ["ativos-de-midia"];

/** A biblioteca de mídia da organização (áudios, imagens, vídeos e PDFs reutilizáveis). */
export function useAtivosDeMidia(enabled = true) {
  return useQuery({
    queryKey: CHAVE,
    enabled,
    queryFn: async () => apiClient.get<{ data: AtivoLido[] }>("/api/v1/midia/ativos"),
    select: (r) => r.data,
    staleTime: 30_000,
  });
}

export function useSubirAtivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arquivo: File): Promise<AtivoLido> => {
      const form = new FormData();
      form.append("file", arquivo, arquivo.name);
      const res = await fetch("/api/v1/midia/ativos", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as Partial<ApiErrorBody> & { data?: AtivoLido };
      if (!res.ok || !json.data) {
        const e = json.error;
        throw new ApiError(res.status, e?.code ?? "upload_failed", e?.details, e?.request_id ?? "", e?.message);
      }
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
    onError: showApiError,
  });
}
