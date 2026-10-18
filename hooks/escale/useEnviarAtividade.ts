"use client";
import { useState } from "react";

import { useUser } from "@/hooks/auth/AuthProvider";
import { apiClient } from "@/lib/api/client";
import type { AtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import { MAX_CONTEUDO_DA_ATIVIDADE } from "@/lib/escale/playbook/regras";
import { estaEncerrada } from "@/lib/tarefas/tipos";
import type { Lead } from "@/lib/types/leads";

export type ResultadoDoEnvio =
  | { tipo: "enviada"; assumiu: boolean; concluida: boolean }
  | { tipo: "outro-atendente"; atendenteId: string; conversaId: string };

/**
 * ENVIAR A MENSAGEM DA ATIVIDADE (fork Escale, Fase 1I; C20, P14), como a
 * Clint: sem confirmação, a não ser que o contato esteja com OUTRA pessoa.
 *
 * 1. A conversa do contato: a que o quadro já trouxe, ou a que o
 *    `open-with-contact` reabre ou cria (o mesmo do "Abrir conversa" do card).
 * 2. Quem atende: com outra pessoa, devolve "outro-atendente" sem enviar; a
 *    tela pergunta e, confirmando, chama de novo com `assumir` (o claim com
 *    `expected_assignee`, que só toma a conversa se ela ainda for daquela pessoa).
 * 3. Envia pelo `POST /api/v1/messages` do inbox e conclui a atividade (com
 *    a regra do dono, C21). O texto já vem com as variáveis trocadas.
 */
export function useEnviarAtividade(
  lead: Lead,
  alternar: (a: AtividadeDoNegocio) => Promise<unknown>,
  /** O canal que a tela mostra (`dispositivoDeEnvio`): a conversa e o envio saem por ele. */
  sessaoId?: string,
) {
  const user = useUser();
  const [enviando, setEnviando] = useState(false);

  async function conversaDoContato(): Promise<string> {
    if (!sessaoId && lead.conversa?.id) return lead.conversa.id;
    const r = await apiClient.post<{ data: { conversation_id: string } }>(
      "/api/v1/conversations/open-with-contact",
      { contact_id: lead.contact_id, ...(sessaoId ? { channel_session_id: sessaoId } : {}) },
    );
    return r.data.conversation_id;
  }

  async function enviar(
    a: AtividadeDoNegocio,
    texto: string,
    assumir?: { conversaId: string; atendenteId: string },
  ): Promise<ResultadoDoEnvio> {
    setEnviando(true);
    try {
      const conversaId = assumir?.conversaId ?? (await conversaDoContato());
      if (assumir) {
        await apiClient.post(`/api/v1/conversations/${conversaId}/claim`, {
          expected_assignee: assumir.atendenteId,
        });
      } else {
        const conversa = await apiClient.get<{ data: { assigned_to_user_id: string | null } }>(
          `/api/v1/conversations/${conversaId}`,
        );
        const atendente = conversa.data.assigned_to_user_id;
        if (atendente && atendente !== user.id)
          return { tipo: "outro-atendente", atendenteId: atendente, conversaId };
      }
      const enviada = await apiClient.post<{ data: { status?: string } }>("/api/v1/messages", {
        conversation_id: conversaId,
        body: texto.slice(0, MAX_CONTEUDO_DA_ATIVIDADE),
        type: "text",
      });
      // O envio responde 201 mesmo quando a mensagem não sai (canal parado, sem telefone): não conclui.
      if (enviada.data?.status === "failed") throw new Error("mensagem_nao_enviada");
      let concluida = true;
      if (!estaEncerrada(a)) {
        try {
          await alternar(a);
        } catch {
          concluida = false;
        }
      }
      return { tipo: "enviada", assumiu: !!assumir, concluida };
    } finally {
      setEnviando(false);
    }
  }

  return { enviar, enviando, conversaDoContato };
}
