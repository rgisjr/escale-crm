"use client";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import type { PublicoDaCampanha } from "@/lib/escale/campanhas/assistente";

import { ListaDeDestinatarios } from "./ListaDeDestinatarios";

/** "CONTATOS SELECIONADOS" (fork Escale, Fase 8B; 09-045): a lista do passo 2, só leitura. */
export function JanelaContatosSelecionados({
  aberta,
  aoFechar,
  publico,
}: {
  aberta: boolean;
  aoFechar: () => void;
  publico: PublicoDaCampanha;
}) {
  const t = useT();
  return (
    <JanelaDaCasca
      aberta={aberta}
      onFechar={aoFechar}
      className="w-[min(1152px,calc(100vw-2rem))] max-w-none rounded-[12px] p-4"
    >
      <DialogTitle className="pb-4 text-center text-[15px] font-medium text-casca-texto">
        {t("Contatos selecionados")}
      </DialogTitle>
      <div className="max-h-[70vh] overflow-y-auto">
        <ListaDeDestinatarios publico={publico} somenteLeitura />
      </div>
    </JanelaDaCasca>
  );
}
