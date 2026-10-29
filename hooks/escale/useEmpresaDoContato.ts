"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { EmpresaDoContato } from "@/lib/escale/empresas/banco";
import { fetchComTempoMaximo } from "@/lib/escale/fetch-com-tempo-maximo";

// Tempo máximo (Frente F, 29/10/2026): ver lib/escale/fetch-com-tempo-maximo.ts.
async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetchComTempoMaximo(url, init);
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(corpo?.error?.message ?? "Não foi possível completar a ação.");
  return corpo.data as T;
}

/** A empresa do contato (o vínculo principal, senão o mais antigo); `null` = sem empresa. */
export function useEmpresaDoContato(contatoId: string | null) {
  return useQuery({
    queryKey: ["empresa-do-contato", contatoId],
    queryFn: () => pedir<EmpresaDoContato | null>(`/api/v1/contatos/${contatoId}/empresa`),
    enabled: Boolean(contatoId),
    staleTime: 15_000,
  });
}

export type TrocaDaEmpresa =
  | { empresa_id: string | null }
  | { nova: { nome: string; campos: "manter" | "limpar" } };

/** Vincula a uma empresa existente, tira da atual ou cria uma nova (PUT na rota do contato). */
export function useTrocarEmpresa(contatoId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (troca: TrocaDaEmpresa) =>
      pedir<EmpresaDoContato | null>(`/api/v1/contatos/${contatoId}/empresa`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(troca),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["empresa-do-contato", contatoId] });
      void qc.invalidateQueries({ queryKey: ["companies"] });
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
