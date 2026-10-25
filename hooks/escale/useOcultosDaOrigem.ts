"use client";

import { useQuery } from "@tanstack/react-query";

import { type CamposOcultos, OCULTOS_VAZIOS, lerOcultos } from "@/lib/escale/campos/ocultos";

/**
 * Os campos ocultos da origem. Sem "usar do grupo", saem do `settings` que a
 * ficha já tem; com ele, a rota devolve a lista do grupo (qualquer papel lê).
 *
 * FORK ESCALE · Fase 2E: sem origem (janela do contato) nada fica oculto.
 */
export function useOcultosDaOrigem(pipeline: { id: string; settings: unknown } | null): CamposOcultos {
  const daOrigem = pipeline ? lerOcultos(pipeline.settings) : OCULTOS_VAZIOS;
  const q = useQuery({
    queryKey: ["ocultos-da-origem", pipeline?.id ?? null],
    queryFn: async (): Promise<CamposOcultos> => {
      const r = await fetch(`/api/v1/pipelines/${pipeline?.id}/campos-ocultos`);
      // Falha não vira sucesso em cache: o campo que o grupo esconde reapareceria por 60 s sem aviso.
      if (!r.ok) throw new Error(`campos-ocultos ${r.status}`);
      const corpo = (await r.json().catch(() => null)) as { data?: unknown } | null;
      return corpo?.data ? lerOcultos({ escale_campos_ocultos: corpo.data }) : daOrigem;
    },
    enabled: !!pipeline && daOrigem.usar_do_grupo,
    staleTime: 60_000,
    retry: 1,
  });
  return daOrigem.usar_do_grupo ? (q.data ?? daOrigem) : (daOrigem ?? OCULTOS_VAZIOS);
}
