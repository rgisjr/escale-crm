"use client";
import { useState } from "react";

import { BOTAO_DA_BARRA_DE_LOTE } from "@/components/escale/contatos/massa/BarraDeLote";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { PastaDeAutomacao } from "@/lib/escale/automacoes/tipos";
import { FolderInput, FolderOff, Trash2, X } from "@/lib/ui/icons-da-casca";

import { IconeDaPasta } from "./IconeDaPasta";

/** A barra de seleção (07-010): "×", o número, SELECIONADOS, "Mover para pasta" e a lixeira. */
export function BarraDeLoteDasAutomacoes({
  quantidade,
  pastas,
  aoLimpar,
  aoMover,
  aoExcluir,
  ocupado,
}: {
  quantidade: number;
  pastas: readonly PastaDeAutomacao[];
  aoLimpar: () => void;
  aoMover: (pastaId: string | null) => void;
  aoExcluir: () => void;
  ocupado: boolean;
}) {
  const t = useT();
  const [excluindo, setExcluindo] = useState(false);
  const texto =
    quantidade === 1
      ? t("Tem certeza que deseja excluir 1 automação? Esta ação não pode ser desfeita.")
      : t("Tem certeza que deseja excluir {n} automações? Esta ação não pode ser desfeita.").replace(
          "{n}",
          quantidade.toLocaleString("pt-BR"),
        );
  return (
    <>
      <div
        role="toolbar"
        aria-label={t("Ações em massa")}
        className="fixed bottom-3 left-1/2 z-40 flex h-[52px] -translate-x-1/2 items-center gap-1 rounded-[8px] bg-casca-marca px-4 text-white shadow-casca-painel"
      >
        <button type="button" aria-label={t("Remover selecionados")} title={t("Remover selecionados")} onClick={aoLimpar} className={BOTAO_DA_BARRA_DE_LOTE}>
          <X size={16} aria-hidden />
        </button>
        <span className="ml-2 text-[13px] font-semibold">{quantidade.toLocaleString("pt-BR")}</span>
        <span className="mr-2 ml-3 text-[11px] font-medium uppercase">{t("selecionados")}</span>
        <span aria-hidden className="mx-1 h-full w-px bg-surface opacity-40" />
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger disabled={ocupado} className={BOTAO_DA_BARRA_DE_LOTE}>
            <FolderInput size={16} aria-hidden />
            {t("Mover para pasta")}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="center" className={CONTEUDO_DO_MENU} style={SOMBRA_DO_MENU}>
            <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => aoMover(null)}>
              <FolderOff size={14} aria-hidden />
              {t("Sem pasta")}
            </DropdownMenuItem>
            {pastas.map((p) => (
              <DropdownMenuItem key={p.id} className={ITEM_DO_MENU} onSelect={() => aoMover(p.id)}>
                <IconeDaPasta icone={p.icone} cor={p.cor} />
                {p.nome}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          aria-label={t("Excluir selecionados")}
          title={t("Excluir selecionados")}
          disabled={ocupado}
          onClick={() => setExcluindo(true)}
          className={BOTAO_DA_BARRA_DE_LOTE}
        >
          <Trash2 size={18} aria-hidden />
        </button>
      </div>
      <JanelaDeConfirmacao
        aberta={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo={t("Excluir automações")}
        rotuloDoConfirmar={t("Confirmar")}
        ocupado={ocupado}
        aoConfirmar={() => {
          setExcluindo(false);
          aoExcluir();
        }}
      >
        {texto}
      </JanelaDeConfirmacao>
    </>
  );
}
