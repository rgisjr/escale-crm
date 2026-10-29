"use client";
import { useState } from "react";
import { toast } from "sonner";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAcoesDosModelos } from "@/hooks/escale/useModelosDeIndicadores";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import type { ModeloNaLista } from "@/lib/escale/indicadores/modelos/tipos";
import { EllipsisVertical, SquarePen, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CapaDoModelo } from "./CapaDoModelo";

/**
 * O CARD DE UM MODELO (10-005, 10-017): capa, nome no rodapé e, no hover, o botão "Usar modelo". Template da
 * organização ganha o ⋮ com "Excluir" (U9). O botão existe sempre no DOM (alcançável por teclado); o card não é clicável.
 */
export function CardDoModelo({ modelo, aoUsar }: { modelo: ModeloNaLista; aoUsar: (m: ModeloNaLista) => void }) {
  const t = useT();
  const { excluirTemplate } = useAcoesDosModelos();
  const [confirmando, setConfirmando] = useState(false);

  function excluir() {
    excluirTemplate.mutate(modelo.id, {
      onSuccess: () => {
        setConfirmando(false);
        toast.success(t("Template excluído com sucesso!"));
      },
      onError: (err) => {
        setConfirmando(false);
        if (err instanceof ApiError) showApiError(err);
        else toast.error(t("Falha na exclusão do template."));
      },
    });
  }

  return (
    <li className="group relative overflow-hidden rounded-[6px] border border-casca-borda bg-surface transition-shadow hover:shadow-md focus-within:shadow-md">
      <div className="relative">
        <CapaDoModelo cor={modelo.cor} icone={modelo.icone} nome={modelo.nome} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" />
        <button
          type="button"
          aria-label={t("Usar modelo {nome}").replace("{nome}", modelo.nome)}
          onClick={() => aoUsar(modelo)}
          className="absolute bottom-3 left-3 inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-casca-marca px-3 text-[13px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 hover:bg-casca-marca-forte"
        >
          <SquarePen size={14} aria-hidden />
          {t("Usar modelo")}
        </button>
        {modelo.origem === "organizacao" ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger
              aria-label={t("Opções do template")}
              className="absolute top-2 right-2 grid size-7 place-items-center rounded-casca-gatilho text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/20 focus-visible:opacity-100 data-[state=open]:opacity-100"
            >
              <EllipsisVertical size={16} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className={cn(CONTEUDO_DO_MENU, "min-w-[160px]")} style={SOMBRA_DO_MENU}>
              <DropdownMenuItem
                className={cn(ITEM_DO_MENU, "text-casca-alerta focus:text-casca-alerta")}
                onSelect={() => setConfirmando(true)}
              >
                <Trash2 size={14} aria-hidden />
                {t("Excluir")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      <p className="flex h-14 items-center truncate bg-casca-raia px-4 text-[13px] text-casca-texto">{modelo.nome}</p>
      {modelo.origem === "organizacao" ? (
        <JanelaDeConfirmacao
          aberta={confirmando}
          aoFechar={() => setConfirmando(false)}
          titulo={t("Excluir template")}
          perigo
          rotuloDoConfirmar={t("Excluir")}
          aoConfirmar={excluir}
          ocupado={excluirTemplate.isPending}
        >
          <p>{t("Tem certeza que deseja excluir o template selecionado?")}</p>
        </JanelaDeConfirmacao>
      ) : null}
    </li>
  );
}
