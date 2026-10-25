"use client";
import { useState } from "react";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useCreateNote } from "@/hooks/inbox/useCreateNote";

/** "Adicionar nota interna" (c12; C8; N15): a janela de 448px com a caixa amarela; salva pelo `useCreateNote` do original. */
export function JanelaNotaInterna({
  aberta,
  aoFechar,
  conversationId,
}: {
  aberta: boolean;
  aoFechar: () => void;
  conversationId: string;
}) {
  const t = useT();
  const criar = useCreateNote();
  const [texto, setTexto] = useState("");
  const fechar = () => {
    setTexto("");
    aoFechar();
  };
  const salvar = async () => {
    const body = texto.trim();
    if (!body) return;
    try {
      await criar.mutateAsync({ conversation_id: conversationId, body });
    } catch {
      return; // o aviso vem do hook; a janela fica aberta com o texto
    }
    fechar();
  };
  return (
    <JanelaDaCasca aberta={aberta} onFechar={fechar} className="w-[448px]">
      <CabecaDaJanela
        titulo={t("Adicionar nota interna")}
        descricao={t("O contato não vê esta nota, somente você e sua equipe")}
      />
      <textarea
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={t("Adicione aqui uma anotação do seu atendimento")}
        aria-label={t("Nota interna")}
        className="mt-3 h-32 w-full resize-none rounded-casca-gatilho border border-casca-nota-borda bg-casca-nota p-3 text-[15px] text-casca-texto outline-hidden placeholder:text-casca-meta"
      />
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={fechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela
          variante="salvar"
          disabled={!texto.trim() || criar.isPending}
          onClick={() => void salvar()}
        >
          {t("Salvar nota")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
