"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { apiClient } from "@/lib/api/client";
import {
  fonteDeTemplates,
  rotaDeTemplates,
  type FonteDeTemplates,
} from "@/lib/channels/templates-fonte";

/** Espelha o que `JanelaFechadaAviso` lê da rota de modelos (`slots`, `components`, `savedValues`). */
export interface SlotDoModelo {
  key: string;
  expects: string;
  onde: string;
  valueKey: string;
}
export interface ModeloAprovado {
  name: string;
  language: string;
  status: string;
  category?: string;
  slots?: SlotDoModelo[];
  components?: unknown[];
  savedValues?: Record<string, string>;
}

const RECENTES_MAX = 5;
const chaveDosRecentes = (orgId: string) => `escale_modelos_recentes:${orgId}`;
const EVENTO = "escale:modelos-recentes";

function lerRecentes(orgId: string): string[] {
  try {
    const bruto = window.localStorage.getItem(chaveDosRecentes(orgId));
    const lista = bruto ? (JSON.parse(bruto) as unknown) : [];
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * OS MODELOS DE MENSAGEM DA CONVERSA (fork Escale, Fase 3B; C7): a mesma rota
 * que a `JanelaFechadaAviso` do original usa (`rotaDeTemplates(fonte)`), mais
 * os "usados recentemente" (c63), guardados no navegador por organização.
 */
export function useModelosDeMensagem(provider: string | null | undefined) {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.orgId ?? "sem-org";
  const qc = useQueryClient();
  const fonte: FonteDeTemplates | null = fonteDeTemplates(provider);
  const rota = fonte ? rotaDeTemplates(fonte) : null;
  const q = useQuery({
    queryKey: ["modelos-de-mensagem", rota],
    enabled: rota !== null,
    queryFn: async () => apiClient.get<{ data: { templates: ModeloAprovado[] } }>(rota!),
    select: (r) => r.data.templates.filter((m) => m.status?.toUpperCase() === "APPROVED"),
    staleTime: 60_000,
  });

  const recentesBrutos = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENTO, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENTO, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => window.localStorage.getItem(chaveDosRecentes(orgId)) ?? "[]",
    () => "[]",
  );
  const recentes = useMemo(() => {
    void recentesBrutos;
    return lerRecentes(orgId);
  }, [orgId, recentesBrutos]);

  const marcarUsado = useCallback(
    (name: string) => {
      const proximos = [name, ...lerRecentes(orgId).filter((n) => n !== name)].slice(
        0,
        RECENTES_MAX,
      );
      try {
        window.localStorage.setItem(chaveDosRecentes(orgId), JSON.stringify(proximos));
      } catch {
        /* navegador sem armazenamento: os recentes só não persistem */
      }
      window.dispatchEvent(new Event(EVENTO));
    },
    [orgId],
  );

  return {
    modelos: q.data ?? [],
    carregando: q.isLoading,
    recarregar: () => void qc.invalidateQueries({ queryKey: ["modelos-de-mensagem", rota] }),
    fonte,
    recentes,
    marcarUsado,
  };
}
