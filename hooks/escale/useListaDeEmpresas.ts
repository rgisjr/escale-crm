"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { PaginaDeEmpresas } from "@/lib/escale/empresas/banco";
import type { EscopoDeEmpresas } from "@/lib/escale/empresas/regras";

export interface ConsultaDaTelaDeEmpresas { q?: string; e: EscopoDeEmpresas; p: number; n: number; f?: string }

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(corpo?.error?.message ?? "Não foi possível completar a ação.");
  return corpo.data as T;
}

/** A página mais o total da consulta (Q7d): o total é uma chamada à parte, sem página nem tamanho na chave. */
export type ListaDeEmpresasDaTela = PaginaDeEmpresas & { total: number };

export function useListaDeEmpresas(consulta: ConsultaDaTelaDeEmpresas) {
  const qs = new URLSearchParams(Object.entries(consulta).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
  const { e, f } = consulta;
  const q = consulta.q?.trim() || undefined;
  const qsTotal = new URLSearchParams(Object.entries({ q, e, f }).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
  const pagina = useQuery({
    queryKey: ["companies", "lista-da-casca", consulta],
    queryFn: () => pedir<PaginaDeEmpresas>(`/api/v1/empresas?${qs}`),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
  const total = useQuery({
    queryKey: ["companies", "total-da-casca", { q, e, f }],
    queryFn: async () => (await pedir<{ total: number }>(`/api/v1/empresas/total?${qsTotal}`)).total,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
  const data = useMemo<ListaDeEmpresasDaTela | undefined>(
    () => (pagina.data !== undefined && total.data !== undefined ? { ...pagina.data, total: total.data } : undefined),
    [pagina.data, total.data],
  );
  return {
    data,
    isLoading: pagina.isLoading || total.isLoading,
    isError: pagina.isError || total.isError,
    error: pagina.error ?? total.error,
    isFetching: pagina.isFetching || total.isFetching,
    refetch: () => Promise.all([pagina.refetch(), total.refetch()]),
  };
}

export function useExcluirEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pedir(`/api/v1/empresas/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}
