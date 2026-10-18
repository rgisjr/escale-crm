"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { mensagemDeBloqueioPorVinculo } from "@/hooks/contacts/useDeleteContact";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import { traduzir } from "@/lib/i18n/dicionario";
import { idiomaAtual } from "@/lib/i18n/IdiomaProvider";

/**
 * O "Excluir" do ⋮ da linha (fork Escale, Fase 2B; Q5): o contato e os negócios dele,
 * pela rota do fork. A trava da Agenda dá o mesmo aviso do original
 * (`mensagemDeBloqueioPorVinculo`); o resto, o toast de erro do original.
 */
export function useExcluirContatoDaLista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (
        await apiClient.delete<{ data: { id: string; negocios: number } }>(
          `/api/v1/lista-de-contatos/${id}`,
        )
      ).data,
    onError: (err) => {
      const t = (s: string) => traduzir(s, idiomaAtual());
      const bloqueio =
        err instanceof ApiError ? mensagemDeBloqueioPorVinculo(err.details, t) : null;
      if (bloqueio) toast.error(bloqueio);
      else showApiError(err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}
