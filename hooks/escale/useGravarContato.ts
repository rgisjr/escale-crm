"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useUpdateContact } from "@/hooks/contacts/useUpdateContact";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import type { ContactPatch } from "@/lib/schemas/contacts";

/**
 * GRAVAR O CONTATO PELA FICHA DO NEGÓCIO (fork Escale, Fase 1H; N4).
 *
 * O `useUpdateContact` do original invalida o contato, a lista e as conversas,
 * mas não o quadro — e a ficha lê o nome, o telefone, o e-mail e os links do
 * cache do quadro (`["board", origem]`). O precedente é o `FormularioDeLinks`
 * do dossiê. A linha do tempo também, porque o PATCH grava `contact.updated`.
 */
export function useGravarContato(contactId: string, pipelineId: string) {
  const qc = useQueryClient();
  const atualizar = useUpdateContact(contactId);
  const gravar = useCallback(
    async (patch: ContactPatch) => {
      await atualizar.mutateAsync(patch);
      await Promise.all([
        qc.invalidateQueries({ queryKey: chaveDoQuadro(pipelineId) }),
        qc.invalidateQueries({ queryKey: ["timeline"] }),
      ]);
    },
    [atualizar, qc, pipelineId],
  );
  return { gravar };
}
