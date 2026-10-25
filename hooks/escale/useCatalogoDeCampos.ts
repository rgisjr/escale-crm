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
  // `alvo` é o objeto do catálogo mexido: o da aba, ou o escolhido no formulário de novo campo.
  const depoisEm = (alvo: ObjetoDeCampo) => {
    void qc.invalidateQueries({ queryKey: CHAVE_DO_CATALOGO(alvo) });
    if (alvo === "negocio") {
      void qc.invalidateQueries({ queryKey: ["board"] });
      void qc.invalidateQueries({ queryKey: ["pipelines"] });
    }
    void qc.invalidateQueries({ queryKey: ["contact"] });
  };
  const depois = () => depoisEm(objeto);
  const base = `/api/v1/campos-do-crm`;
  return {
    criarCampo: useMutation({
      mutationFn: (e: NovoCampo) => pedir(base, { method: "POST", body: JSON.stringify(e) }),
      onSuccess: (_dados, e) => depoisEm(e.objeto),
    }),
    mudarCampo: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: PatchDoCampo }) => pedir(`${base}/${id}?objeto=${objeto}`, { method: "PATCH", body: JSON.stringify(patch) }),
      onSuccess: depois,
    }),
    excluirCampo: useMutation({ mutationFn: (id: string) => pedir(`${base}/${id}?objeto=${objeto}`, { method: "DELETE" }), onSuccess: depois }),
    // Pelo formulário de novo campo o grupo nasce no objeto escolhido lá, que pode não ser o da aba.
    criarGrupo: useMutation({
      mutationFn: (g: string | { nome: string; objeto: ObjetoDeCampo }) => {
        const { nome, objeto: alvo } = typeof g === "string" ? { nome: g, objeto } : g;
        return pedir(`${base}/grupos`, { method: "POST", body: JSON.stringify({ objeto: alvo, nome }) });
      },
      onSuccess: (_dados, g) => depoisEm(typeof g === "string" ? objeto : g.objeto),
    }),
    renomearGrupo: useMutation({
      mutationFn: ({ id, nome }: { id: string; nome: string }) => pedir(`${base}/grupos/${id}`, { method: "PATCH", body: JSON.stringify({ nome }) }),
      onSuccess: depois,
    }),
    excluirGrupo: useMutation({ mutationFn: (id: string) => pedir(`${base}/grupos/${id}`, { method: "DELETE" }), onSuccess: depois }),
    reordenar: useMutation({ mutationFn: (ordem: OrdemDoCatalogo) => pedir(`${base}/ordem`, { method: "PUT", body: JSON.stringify(ordem) }), onSuccess: depois }),
  };
}
