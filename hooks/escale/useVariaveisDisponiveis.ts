"use client";

import { useMemo } from "react";

import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import {
  gruposComCampos,
  type CampoDaVariavel,
  type CamposPorObjeto,
  type ExtraDasVariaveis,
  type GrupoDeVariaveis,
} from "@/lib/variaveis/catalogo";

/**
 * A lista única com os campos personalizados do catálogo da 2C (negócio,
 * contato e empresa) no fim de cada grupo (fork Escale, Frente V). O catálogo
 * só é lido com `ativo` (o popover aberto). `adicionais` são campos que a tela
 * conhece por outro caminho (os `settings.fields` da origem, no playbook):
 * entram depois dos do catálogo, sem repetir chave.
 */
export function useVariaveisDisponiveis(
  ativo: boolean,
  extras: readonly ExtraDasVariaveis[] = [],
  adicionais: CamposPorObjeto = {},
): { grupos: GrupoDeVariaveis[]; carregando: boolean } {
  const negocio = useCatalogoDeCampos("negocio", ativo);
  const contato = useCatalogoDeCampos("contato", ativo);
  const empresa = useCatalogoDeCampos("empresa", ativo);
  const chaveDosExtras = extras.join(",");
  const chaveDosAdicionais = JSON.stringify(adicionais);
  const grupos = useMemo(() => {
    const mais = JSON.parse(chaveDosAdicionais) as CamposPorObjeto;
    const juntar = (c: typeof negocio, outros: readonly CampoDaVariavel[] = []) => {
      const doCatalogo = c.catalogo.campos.map((x) => ({ chave: x.chave, rotulo: x.definicao.label }));
      const vistos = new Set(doCatalogo.map((x) => x.chave));
      return [...doCatalogo, ...outros.filter((x) => !vistos.has(x.chave))];
    };
    return gruposComCampos(
      {
        negocio: juntar(negocio, mais.negocio),
        contato: juntar(contato, mais.contato),
        empresa: juntar(empresa, mais.empresa),
      },
      chaveDosExtras ? (chaveDosExtras.split(",") as ExtraDasVariaveis[]) : [],
    );
  }, [negocio, contato, empresa, chaveDosExtras, chaveDosAdicionais]);
  return { grupos, carregando: negocio.carregando || contato.carregando || empresa.carregando };
}
