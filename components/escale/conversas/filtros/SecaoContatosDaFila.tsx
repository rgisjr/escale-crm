"use client";
import { SecaoTagsDoFiltro } from "@/components/escale/contatos/filtros/SecaoTagsDoFiltro";
import type { FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";

/** Contatos › Tags (c33, c34; N7): a seção de tags da 2B, sobre as tags do contato. */
export function SecaoContatosDaFila({
  painel,
  aoMudar,
}: {
  painel: FiltrosDoPainel;
  aoMudar: (f: FiltrosDoPainel) => void;
}) {
  return (
    <SecaoTagsDoFiltro
      filtros={painel.contatos?.tags ? { tags: painel.contatos.tags } : {}}
      aoMudar={(f) => aoMudar({ ...painel, contatos: f.tags ? { tags: f.tags } : undefined })}
    />
  );
}
