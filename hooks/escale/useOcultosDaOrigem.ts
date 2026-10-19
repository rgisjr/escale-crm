"use client";

import { useQuery } from "@tanstack/react-query";

import { type CamposOcultos, OCULTOS_VAZIOS, lerOcultos } from "@/lib/escale/campos/ocultos";

/**
 * Os campos ocultos da origem. Sem "usar do grupo", saem do `settings` que a
 * ficha já tem; com ele, a rota devolve a lista do grupo (qualquer papel lê).
 */
export function useOcultosDaOrigem(pipeline: { id: string; settings: unknown }): CamposOcultos {
  const daOrigem = lerOcultos(pipeline.settings);
  const q = useQuery({
    queryKey: ["ocultos-da-origem", pipeline.id],
    queryFn: async (): Promise<CamposOcultos> => {
      const r = await fetch(`/api/v1/pipelines/${pipeline.id}/campos-ocultos`);
      if (!r.ok) return daOrigem;
      const corpo = (await r.json().catch(() => null)) as { data?: unknown } | null;
      return corpo?.data ? lerOcultos({ escale_campos_ocultos: corpo.data }) : daOrigem;
    },
    enabled: daOrigem.usar_do_grupo,
    staleTime: 60_000,
  });
  return daOrigem.usar_do_grupo ? (q.data ?? daOrigem) : (daOrigem ?? OCULTOS_VAZIOS);
}
