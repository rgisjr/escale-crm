"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { NovoCampo, OrdemDoCatalogo, PatchDoCampo } from "@/lib/escale/campos/banco";
import { CATALOGO_VAZIO, type Catalogo, type ObjetoDeCampo } from "@/lib/escale/campos/regras";

export const CHAVE_DO_CATALOGO = (objeto: ObjetoDeCampo) => ["catalogo-de-campos", objeto] as const;

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(corpo?.error?.message ?? "Ocorreu um erro ao salvar");
  return corpo.data as T;
}

export function useCatalogoDeCampos(objeto: ObjetoDeCampo, ativo = true) {
  const q = useQuery({
    queryKey: CHAVE_DO_CATALOGO(objeto),
    queryFn: () => pedir<Catalogo>(`/api/v1/campos-do-crm?objeto=${objeto}`),
    enabled: ativo,
    staleTime: 60_000,
  });
  return { catalogo: q.data ?? CATALOGO_VAZIO, carregando: q.isLoading, erro: q.isError };
}

export function useMudarCatalogo(objeto: ObjetoDeCampo) {
  const qc = useQueryClient();
  const depois = () => {
    void qc.invalidateQueries({ queryKey: CHAVE_DO_CATALOGO(objeto) });
    if (objeto === "negocio") {
      void qc.invalidateQueries({ queryKey: ["board"] });
      void qc.invalidateQueries({ queryKey: ["pipelines"] });
    }
    void qc.invalidateQueries({ queryKey: ["contact"] });
  };
  const base = `/api/v1/campos-do-crm`;
  return {
    criarCampo: useMutation({ mutationFn: (e: NovoCampo) => pedir(base, { method: "POST", body: JSON.stringify(e) }), onSuccess: depois }),
    mudarCampo: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: PatchDoCampo }) => pedir(`${base}/${id}?objeto=${objeto}`, { method: "PATCH", body: JSON.stringify(patch) }),
      onSuccess: depois,
    }),
    excluirCampo: useMutation({ mutationFn: (id: string) => pedir(`${base}/${id}?objeto=${objeto}`, { method: "DELETE" }), onSuccess: depois }),
    criarGrupo: useMutation({ mutationFn: (nome: string) => pedir(`${base}/grupos`, { method: "POST", body: JSON.stringify({ objeto, nome }) }), onSuccess: depois }),
    renomearGrupo: useMutation({
      mutationFn: ({ id, nome }: { id: string; nome: string }) => pedir(`${base}/grupos/${id}`, { method: "PATCH", body: JSON.stringify({ nome }) }),
      onSuccess: depois,
    }),
    excluirGrupo: useMutation({ mutationFn: (id: string) => pedir(`${base}/grupos/${id}`, { method: "DELETE" }), onSuccess: depois }),
    reordenar: useMutation({ mutationFn: (ordem: OrdemDoCatalogo) => pedir(`${base}/ordem`, { method: "PUT", body: JSON.stringify(ordem) }), onSuccess: depois }),
  };
}
