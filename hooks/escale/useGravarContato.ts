"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useUpdateContact } from "@/hooks/contacts/useUpdateContact";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import type { ContactPatch } from "@/lib/schemas/contacts";
import type { Contact } from "@/lib/types/contacts";

/**
 * GRAVAR O CONTATO PELA FICHA DO NEGÓCIO (fork Escale, Fase 1H; N4).
 *
 * O `useUpdateContact` do original invalida o contato, a lista e as conversas,
 * mas não o quadro — e a ficha lê o nome, o telefone, o e-mail e os links do
 * cache do quadro (`["board", origem]`). O precedente é o `FormularioDeLinks`
 * do dossiê. A linha do tempo também, porque o PATCH grava `contact.updated`.
 *
 * ─── Sem perder gravação (revisão final, C1 e I1) ───────────────────────────
 *
 * O PATCH do original SUBSTITUI `custom_fields` e `tags`, então o patch é
 * montado sobre o contato MAIS RECENTE, no momento de enviar: `gravar` aceita
 * uma função `(atual) => patch`, que lê o cache `["contact", id]`. As gravações
 * do mesmo contato vão em fila (uma de cada vez) e a resposta de cada uma volta
 * para o cache antes da próxima montar o patch — duas edições rápidas não se
 * desfazem. Sem o contato no cache (carregando ou falhou), o patch montado NÃO
 * é enviado: um `custom_fields` montado sobre `{}` apagaria todos os outros.
 *
 * Devolve se algo foi enviado (`false` = o patch montado saiu vazio).
 * O quadro e a linha do tempo são invalidados sem esperar: o spinner do campo
 * termina com a resposta do PATCH, não com a recarga do quadro inteiro.
 */
export type MontarPatchDoContato = (atual: Contact) => ContactPatch | null;

export class ContatoNaoCarregado extends Error {
  constructor() {
    super("O contato ainda não foi carregado.");
    this.name = "ContatoNaoCarregado";
  }
}

// Uma fila por contato, para o nome, as tags e os campos (componentes diferentes) não se cruzarem.
const filas = new Map<string, Promise<unknown>>();

export function useGravarContato(contactId: string, pipelineId: string) {
  const qc = useQueryClient();
  const atualizar = useUpdateContact(contactId);
  const mutateAsync = atualizar.mutateAsync;
  const gravar = useCallback(
    (entrada: ContactPatch | MontarPatchDoContato): Promise<boolean> => {
      const chave = ["contact", contactId] as const;
      const anterior = filas.get(contactId) ?? Promise.resolve();
      const vez = anterior
        .catch(() => undefined)
        .then(async () => {
          let patch: ContactPatch | null;
          if (typeof entrada === "function") {
            const atual = qc.getQueryData<{ data?: Contact }>(chave)?.data;
            if (!atual) throw new ContatoNaoCarregado();
            patch = entrada(atual);
          } else {
            patch = entrada;
          }
          if (!patch) return false;
          const resposta = await mutateAsync(patch);
          if (resposta?.data) {
            // Fusão: o GET pode trazer campos que o PATCH não devolve.
            qc.setQueryData<{ data?: Contact }>(chave, (velho) => ({
              ...(velho ?? {}),
              data: { ...(velho?.data ?? {}), ...resposta.data } as Contact,
            }));
          }
          void qc.invalidateQueries({ queryKey: chaveDoQuadro(pipelineId) });
          void qc.invalidateQueries({ queryKey: ["timeline"] });
          return true;
        });
      filas.set(contactId, vez);
      void vez.then(
        () => filas.get(contactId) === vez && filas.delete(contactId),
        () => filas.get(contactId) === vez && filas.delete(contactId),
      );
      return vez;
    },
    [mutateAsync, qc, contactId, pipelineId],
  );
  return { gravar };
}
