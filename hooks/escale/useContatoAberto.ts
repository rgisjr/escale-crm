"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import {
  PARAM_ABA_DO_CONTATO,
  abaDoContato,
  contatoDaRota,
  rotaDaListaSemContato,
  rotaDoContatoAberto,
  type AbaDoContato,
} from "@/lib/escale/ficha-do-contato/regras";

/**
 * O CONTATO ABERTO POR CIMA DA LISTA (fork Escale, Fase 2E; Q1, N1). Como a
 * Clint: abrir faz `pushState('/app/contacts/<id>')` (o "Voltar" do navegador
 * fecha), trocar de aba ou de contato faz `replaceState`, fechar volta à lista
 * com os parâmetros dela. O App Router sincroniza `usePathname` e
 * `useSearchParams` com o `history`, então nada recarrega.
 */
export function useContatoAberto() {
  const caminho = usePathname();
  const params = useSearchParams();
  const qs = params.toString();
  const contatoId = contatoDaRota(caminho);
  const aba = abaDoContato(params.get(PARAM_ABA_DO_CONTATO));

  const abrir = useCallback(
    (id: string, nova: AbaDoContato = "contato") => window.history.pushState(null, "", rotaDoContatoAberto(id, qs, nova)),
    [qs],
  );
  const mudarAba = useCallback(
    (nova: AbaDoContato) => {
      if (contatoId) window.history.replaceState(null, "", rotaDoContatoAberto(contatoId, qs, nova));
    },
    [contatoId, qs],
  );
  const trocar = useCallback(
    (id: string) => window.history.replaceState(null, "", rotaDoContatoAberto(id, qs, "contato")),
    [qs],
  );
  const fechar = useCallback(() => window.history.pushState(null, "", rotaDaListaSemContato(qs)), [qs]);

  return { contatoId, aba, abrir, mudarAba, trocar, fechar };
}
