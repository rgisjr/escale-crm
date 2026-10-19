"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { filtrosDaUrl, filtrosParaUrl, type FiltrosDeContatos } from "@/lib/escale/contatos/filtros";
import { ESCOPO_PADRAO, ESCOPOS_DE_EMPRESAS, type EscopoDeEmpresas } from "@/lib/escale/empresas/regras";

/**
 * O ESTADO DA LISTA DE EMPRESAS NA URL (fork Escale, Fase 2D): busca `q`, escopo
 * `e`, página `p` e o filtro por campos `f` (o mesmo JSON enxuto dos contatos).
 */
export function useEstadoDaListaDeEmpresas() {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const e = params.get("e") ?? "";
  const escopo: EscopoDeEmpresas = (ESCOPOS_DE_EMPRESAS as readonly string[]).includes(e)
    ? (e as EscopoDeEmpresas)
    : ESCOPO_PADRAO;
  const pagina = Math.max(1, Number(params.get("p")) || 1);
  const textoDoFiltro = params.get("f");
  const filtros = useMemo(() => filtrosDaUrl(textoDoFiltro), [textoDoFiltro]);

  const irPara = (mudar: Record<string, string | null>) => {
    const novo = new URLSearchParams(params.toString());
    for (const [k, valor] of Object.entries(mudar)) {
      if (valor === null || valor === "") novo.delete(k);
      else novo.set(k, valor);
    }
    const texto = novo.toString();
    router.replace(texto ? `${caminho}?${texto}` : caminho, { scroll: false });
  };

  return {
    escopo,
    pagina,
    busca: params.get("q") ?? "",
    novaNaUrl: params.get("nova") === "1",
    filtros,
    f: filtrosParaUrl(filtros) ?? undefined,
    irPara,
    mudarFiltros: (novos: FiltrosDeContatos) => irPara({ f: filtrosParaUrl(novos), p: null }),
  };
}
