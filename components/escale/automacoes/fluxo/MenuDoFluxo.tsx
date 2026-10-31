"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAcoesDasAutomacoes } from "@/hooks/escale/useAutomacoesDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ROTA_DA_LISTA_DE_AUTOMACOES, rotaDoFluxo } from "@/lib/escale/automacoes/rotas";
import { Copy, EllipsisVertical, LayoutGrid, SquarePen, Trash2 } from "@/lib/ui/icons-da-casca";

/**
 * O ⋮ DO CABEÇALHO (07-016; D6): Editar no editor, Organizar, Duplicar automação e
 * Excluir, com divisória entre todos. Na automação nova só "Organizar". "Duplicar"
 * fica desabilitado com alterações não salvas: a cópia é da versão gravada.
 */
export function MenuDoFluxo({
  id,
  sujo,
  aoEditarNoEditor,
  aoOrganizar,
}: {
  /** `null` = automação nova (ainda não gravada). */
  id: string | null;
  sujo: boolean;
  aoEditarNoEditor: () => void;
  aoOrganizar: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const acoes = useAcoesDasAutomacoes();
  const [excluindo, setExcluindo] = useState(false);

  function duplicar() {
    if (!id) return;
    toast(t("A automação está sendo duplicada, aguarde a finalização."));
    acoes.duplicar.mutate(id, {
      onSuccess: ({ id: novoId }) =>
        toast.success(t("Automação duplicada com sucesso!"), {
          action: { label: t("Ir para a automação"), onClick: () => router.push(rotaDoFluxo(novoId)) },
        }),
    });
  }

  function excluir() {
    if (!id) return;
    acoes.excluir.mutate(id, {
      onSuccess: () => {
        setExcluindo(false);
        router.push(ROTA_DA_LISTA_DE_AUTOMACOES);
      },
    });
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={t("Mais opções")}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-texto-2 hover:bg-casca-raia hover:text-casca-texto"
        >
          <EllipsisVertical size={18} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={CONTEUDO_DO_MENU} style={SOMBRA_DO_MENU}>
          {id ? (
            <>
              <DropdownMenuItem className={ITEM_DO_MENU} onSelect={aoEditarNoEditor}>
                <SquarePen size={14} aria-hidden />
                {t("Editar no editor")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={aoOrganizar}>
            <LayoutGrid size={14} aria-hidden />
            {t("Organizar")}
          </DropdownMenuItem>
          {id ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={ITEM_DO_MENU}
                disabled={sujo}
                title={sujo ? t("Salve antes de duplicar.") : undefined}
                onSelect={duplicar}
              >
                <Copy size={14} aria-hidden />
                {t("Duplicar automação")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={`${ITEM_DO_MENU} text-casca-alerta focus:text-casca-alerta`}
                onSelect={() => setExcluindo(true)}
              >
                <Trash2 size={14} aria-hidden />
                {t("Excluir")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <JanelaDeConfirmacao
        aberta={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo={t("Excluir automação")}
        perigo
        rotuloDoConfirmar={t("Confirmar")}
        ocupado={acoes.excluir.isPending}
        aoConfirmar={excluir}
      >
        {t("Você deseja excluir esta automação?")}
      </JanelaDeConfirmacao>
    </>
  );
}
