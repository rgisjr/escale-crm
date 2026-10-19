"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PaginaDeEmpresas } from "@/lib/escale/empresas/banco";
import type { EscopoDeEmpresas } from "@/lib/escale/empresas/regras";

export interface ConsultaDaTelaDeEmpresas { q?: string; e: EscopoDeEmpresas; p: number; n: number; f?: string }

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(corpo?.error?.message ?? "Não foi possível completar a ação.");
  return corpo.data as T;
}

export function useListaDeEmpresas(consulta: ConsultaDaTelaDeEmpresas) {
  const qs = new URLSearchParams(Object.entries(consulta).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
  return useQuery({
    queryKey: ["companies", "lista-da-casca", consulta],
    queryFn: () => pedir<PaginaDeEmpresas>(`/api/v1/empresas?${qs}`),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useExcluirEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pedir(`/api/v1/empresas/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}
