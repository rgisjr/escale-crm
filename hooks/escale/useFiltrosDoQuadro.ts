"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { filtrosDaUrl, filtrosParaUrl } from "@/lib/escale/filtros/url";

/**
 * OS FILTROS DO QUADRO NA URL (fork Escale, Fase 1D): lê a query string e troca
 * com `router.replace`, sem empilhar histórico a cada clique (como o quadro do
 * original). `mudar(filtros, filtroSalvoId)`: sem o id, o filtro salvo deixa de
 * estar aplicado.
 */
export function useFiltrosDoQuadro() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { filtros, filtroSalvoId } = useMemo(() => filtrosDaUrl(searchParams), [searchParams]);
  const mudar = useCallback(
    (proximos: FiltrosDoQuadro, salvoId: string | null = null) => {
      const qs = filtrosParaUrl(proximos, salvoId);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );
  return { filtros, filtroSalvoId, mudar };
}
