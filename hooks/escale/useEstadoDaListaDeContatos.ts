"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import {
  filtrosDaUrl,
  filtrosParaUrl,
  type FiltrosDeContatos,
} from "@/lib/escale/contatos/filtros";
import { VISOES_DE_CONTATOS, type VisaoDeContatos } from "@/lib/escale/contatos/regras";
import { PARAM_ABA_DO_CONTATO, ROTA_DA_LISTA_DE_CONTATOS } from "@/lib/escale/ficha-do-contato/regras";

/**
 * O ESTADO DA LISTA DE CONTATOS NA URL (fork Escale, 2A e 2B): busca `q`, visão
 * `v`, página `p`, filtro `f` (JSON enxuto) e o filtro salvo aplicado `fs`.
 */
export function useEstadoDaListaDeContatos() {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const v = params.get("v") ?? "";
  const visao: VisaoDeContatos = (VISOES_DE_CONTATOS as readonly string[]).includes(v)
    ? (v as VisaoDeContatos)
    : "todos";
  const pagina = Math.max(1, Number(params.get("p")) || 1);
  const textoDoFiltro = params.get("f");
  const filtros = useMemo(() => filtrosDaUrl(textoDoFiltro), [textoDoFiltro]);

  const irPara = (mudar: Record<string, string | null>) => {
    const novo = new URLSearchParams(params.toString());
    for (const [k, valor] of Object.entries(mudar)) {
      if (valor === null || valor === "") novo.delete(k);
      else novo.set(k, valor);
    }
    // FORK ESCALE · Fase 2E (N1): com a janela do contato aberta o caminho é /app/contacts/<id>; mexer na lista volta à lista.
    novo.delete(PARAM_ABA_DO_CONTATO);
    const base = caminho.startsWith(ROTA_DA_LISTA_DE_CONTATOS) ? ROTA_DA_LISTA_DE_CONTATOS : caminho;
    router.replace(`${base}?${novo.toString()}`, { scroll: false });
  };

  return {
    visao,
    pagina,
    busca: params.get("q") ?? "",
    filtros,
    f: filtrosParaUrl(filtros),
    filtroSalvoId: params.get("fs"),
    irPara,
    mudarFiltros: (novos: FiltrosDeContatos, salvoId: string | null = null) =>
      irPara({ f: filtrosParaUrl(novos), fs: salvoId, p: null }),
  };
}
