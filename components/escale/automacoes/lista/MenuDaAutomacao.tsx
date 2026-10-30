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
import { rotaDoFluxo } from "@/lib/escale/automacoes/rotas";
import type { AutomacaoDaLista, PastaDeAutomacao } from "@/lib/escale/automacoes/tipos";
import {
  Check,
  Copy,
  EllipsisVertical,
  FolderOff,
  Pencil,
  SquarePen,
  Trash2,
  Workflow,
} from "@/lib/ui/icons-da-casca";

import { IconeDaPasta } from "./IconeDaPasta";

const ALTURA_DA_LISTA_DE_PASTAS = 216;

/** O ⋮ da linha (07-004, Q10): formas de abrir, renomear, duplicar, mover de pasta e excluir. */
export function MenuDaAutomacao({
  automacao,
  pastas,
  aoEditar,
  aoRenomear,
}: {
  automacao: AutomacaoDaLista;
  pastas: readonly PastaDeAutomacao[];
  aoEditar: (id: string) => void;
  aoRenomear: (a: AutomacaoDaLista) => void;
}) {
  const t = useT();
  const router = useRouter();
  const acoes = useAcoesDasAutomacoes();
  const [excluindo, setExcluindo] = useState(false);

  function irPara(id: string) {
    if (automacao.forma === "editor") aoEditar(id);
    else router.push(rotaDoFluxo(id));
  }

  function duplicar() {
    toast(t("A automação está sendo duplicada, aguarde a finalização."));
    acoes.duplicar.mutate(automacao.id, {
      onSuccess: ({ id }) =>
        toast.success(t("Automação duplicada com sucesso!"), {
          action: { label: t("Ir para a automação"), onClick: () => irPara(id) },
        }),
    });
  }

  function mover(pastaId: string | null) {
    acoes.organizar.mutate(
      { id: automacao.id, pasta_id: pastaId },
      { onSuccess: () => toast.success(t("Automação movida")) },
    );
  }

  function excluir() {
    acoes.excluir.mutate(automacao.id, { onSuccess: () => setExcluindo(false) });
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={t("Mais opções")}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-texto-2 hover:bg-casca-raia hover:text-casca-texto"
        >
          <EllipsisVertical size={16} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={CONTEUDO_DO_MENU} style={SOMBRA_DO_MENU}>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => router.push(rotaDoFluxo(automacao.id))}>
            <Workflow size={14} aria-hidden />
            {t("Abrir no fluxo")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => aoEditar(automacao.id)}>
            <SquarePen size={14} aria-hidden />
            {t("Editar no editor")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => aoRenomear(automacao)}>
            <Pencil size={14} aria-hidden />
            {t("Renomear")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={duplicar}>
            <Copy size={14} aria-hidden />
            {t("Duplicar automação")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div style={{ maxHeight: ALTURA_DA_LISTA_DE_PASTAS }} className="overflow-y-auto">
            <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => mover(null)}>
              <FolderOff size={14} aria-hidden />
              {t("Sem pasta")}
              {automacao.pastaId === null && <Check size={14} aria-hidden className="ml-auto text-casca-marca" />}
            </DropdownMenuItem>
            {pastas.map((p) => (
              <DropdownMenuItem key={p.id} className={ITEM_DO_MENU} onSelect={() => mover(p.id)}>
                <IconeDaPasta icone={p.icone} cor={p.cor} />
                {p.nome}
                {automacao.pastaId === p.id && <Check size={14} aria-hidden className="ml-auto text-casca-marca" />}
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={`${ITEM_DO_MENU} text-casca-alerta focus:text-casca-alerta`}
            onSelect={() => setExcluindo(true)}
          >
            <Trash2 size={14} aria-hidden />
            {t("Excluir")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <JanelaDeConfirmacao
        aberta={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo={t("Excluir automação")}
        rotuloDoConfirmar={t("Confirmar")}
        ocupado={acoes.excluir.isPending}
        aoConfirmar={excluir}
      >
        {t("Você deseja excluir esta automação?")}
      </JanelaDeConfirmacao>
    </>
  );
}
