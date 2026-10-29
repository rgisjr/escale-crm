"use client";
import { useState } from "react";
import { toast } from "sonner";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAcoesDosModelos } from "@/hooks/escale/useModelosDeIndicadores";
import { useAcoesDosPaineis } from "@/hooks/escale/usePaineisDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import type { PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";
import { Copy, EllipsisVertical, Pencil, SquareDashed, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O ⋮ DO PAINEL (10-002): Tornar template, Duplicar, Editar, divisor, Excluir. Só aparece no hover
 * do card (ou no foco, pelo teclado). Painel padrão não tem Excluir; "Tornar
 * template" é o primeiro item (7F). `modal={false}`: a janela que o item abre não herda o
 * bloqueio de clique do menu. Duplicar e excluir não mostram toast de sucesso
 * (a Clint não revela texto): o resultado aparece na lista.
 */
export function MenuDoPainel({ painel, aoEditar }: { painel: PainelDaLista; aoEditar: (p: PainelDaLista) => void }) {
  const t = useT();
  const { duplicar, excluir } = useAcoesDosPaineis();
  const { tornarTemplate } = useAcoesDosModelos();
  const [confirmando, setConfirmando] = useState(false);
  const falhou = (err: unknown) => (err instanceof ApiError ? showApiError(err) : toast.error(t("Erro inesperado.")));

  function tornar() {
    tornarTemplate.mutate(painel.id, {
      onSuccess: () => toast.success(t("Template criado com sucesso!")),
      onError: () => toast.error(t("Falha na criação do template.")),
    });
  }

  function confirmarExclusao() {
    excluir.mutate(painel.id, {
      onSuccess: () => setConfirmando(false),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.error(t("Não é possível excluir um dashboard padrão ou template."));
          setConfirmando(false);
        } else falhou(err);
      },
    });
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={t("Opções do dashboard")}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-texto-2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-casca-raia hover:text-casca-texto focus-visible:opacity-100 data-[state=open]:opacity-100"
        >
          <EllipsisVertical size={16} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          className={cn(CONTEUDO_DO_MENU, "min-w-[200px]")}
          style={SOMBRA_DO_MENU}
        >
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={tornar}>
            <SquareDashed size={14} aria-hidden />
            {t("Tornar template")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => duplicar.mutate(painel.id, { onError: falhou })}>
            <Copy size={14} aria-hidden />
            {t("Duplicar")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => aoEditar(painel)}>
            <Pencil size={14} aria-hidden />
            {t("Editar")}
          </DropdownMenuItem>
          {painel.padrao ? null : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={cn(ITEM_DO_MENU, "text-casca-alerta focus:text-casca-alerta")}
                onSelect={() => setConfirmando(true)}
              >
                <Trash2 size={14} aria-hidden />
                {t("Excluir")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <JanelaDeConfirmacao
        aberta={confirmando}
        aoFechar={() => setConfirmando(false)}
        titulo={t("Excluir Dashboard")}
        perigo
        rotuloDoConfirmar={t("Excluir")}
        aoConfirmar={confirmarExclusao}
        ocupado={excluir.isPending}
      >
        <p>{t("Tem certeza que deseja excluir o dashboard selecionado?")}</p>
      </JanelaDeConfirmacao>
    </>
  );
}
