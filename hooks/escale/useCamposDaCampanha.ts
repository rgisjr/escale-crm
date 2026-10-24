"use client";

import { useMemo } from "react";

import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { useT } from "@/hooks/i18n/useT";
import { CAMPO_DA_VARIAVEL } from "@/lib/escale/campanhas/assistente";
import type { CampoPersonalizado } from "@/lib/escale/campanhas/previa";

/**
 * Os campos personalizados que uma variável da campanha pode usar (fork Escale,
 * Fase 8B; N5): os do contato (`{{contato.x}}`) e os do negócio (`{{lead.x}}`)
 * do catálogo da 2C. Só os que o renderizador aceita (a chave do catálogo).
 */
export function useCamposDaCampanha(): CampoPersonalizado[] {
  const t = useT();
  const contato = useCatalogoDeCampos("contato");
  const negocio = useCatalogoDeCampos("negocio");
  return useMemo(
    () =>
      [
        ...contato.catalogo.campos.map((c) => ({
          campo: `contato.${c.chave}`,
          rotulo: c.definicao.label,
        })),
        ...negocio.catalogo.campos.map((c) => ({
          campo: `lead.${c.chave}`,
          rotulo: `${c.definicao.label} (${t("negócio")})`,
        })),
      ].filter((c) => CAMPO_DA_VARIAVEL.test(c.campo)),
    [contato.catalogo.campos, negocio.catalogo.campos, t],
  );
}
