"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { MoveToOtherPipelineDialog } from "@/components/kanban/MoveToOtherPipelineDialog";
import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useBulkAction } from "@/hooks/kanban/useBulkAction";
import { rotaDoQuadro } from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import {
  ArrowRightLeft,
  Briefcase,
  EllipsisVertical,
  StickyNote,
  Trash2,
  User,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O ⋮ DO CABEÇALHO DA FICHA (fork Escale, Fase 1G, C6; print 09).
 *
 * Novo negócio, Mudar origem e Excluir pedem a mesma permissão do ⋮ do card
 * (`pipeline.move_card`, agent ou acima); sem ela, nem aparecem (a Clint
 * esconde Excluir sem `DEAL_DELETE`). Mudar origem é o "Levar para outro funil"
 * do original (Q9). Excluir é a mesma ação em lote do card e volta ao quadro.
 */
const ITEM_VERMELHO = cn(
  ITEM_DO_MENU,
  "text-casca-alerta hover:text-casca-alerta focus-visible:text-casca-alerta data-[highlighted]:text-casca-alerta",
);

export function MenuDaFicha({
  lead,
  pipelineId,
  stages,
  leads,
}: {
  lead: Lead;
  pipelineId: string;
  stages: Stage[];
  leads: Lead[];
}) {
  const t = useT();
  const router = useRouter();
  const busca = useSearchParams();
  const podeEscrever = usePermission("pipeline.move_card");
  const lote = useBulkAction(pipelineId);
  const [novo, setNovo] = useState(false);
  const [mudar, setMudar] = useState(false);
  const [excluir, setExcluir] = useState(false);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <BotaoDaCasca variante="icone" aria-label={t("Ações do negócio")}>
            <EllipsisVertical aria-hidden />
          </BotaoDaCasca>
        </DropdownMenuTrigger>
        <MenuPrimitive.Portal>
          <MenuPrimitive.Content align="end" sideOffset={8} className={CAIXA_DO_MENU}>
            {lead.contact_id ? (
              <MenuPrimitive.Item asChild className={ITEM_DO_MENU}>
                <Link href={`/app/contacts/${lead.contact_id}`}>
                  <User size={14} aria-hidden />
                  {t("Visualizar contato")}
                </Link>
              </MenuPrimitive.Item>
            ) : (
              <MenuPrimitive.Item disabled title={t("Sem contato")} className={ITEM_DO_MENU}>
                <User size={14} aria-hidden />
                {t("Visualizar contato")}
              </MenuPrimitive.Item>
            )}
            {podeEscrever ? (
              <MenuPrimitive.Item className={ITEM_DO_MENU} onSelect={() => setNovo(true)}>
                <Briefcase size={14} aria-hidden />
                {t("Novo negócio")}
              </MenuPrimitive.Item>
            ) : null}
            {podeEscrever ? (
              <MenuPrimitive.Item className={ITEM_DO_MENU} onSelect={() => setMudar(true)}>
                <ArrowRightLeft size={14} aria-hidden />
                {t("Mudar origem")}
              </MenuPrimitive.Item>
            ) : null}
            <MenuPrimitive.Item disabled title={t("Em breve")} className={ITEM_DO_MENU}>
              <StickyNote size={14} aria-hidden />
              {t("Nova nota")}
            </MenuPrimitive.Item>
            {podeEscrever ? (
              <>
                <MenuPrimitive.Separator className="my-1 h-px bg-casca-borda" />
                <MenuPrimitive.Item className={ITEM_VERMELHO} onSelect={() => setExcluir(true)}>
                  <Trash2 size={14} aria-hidden />
                  {t("Excluir")}
                </MenuPrimitive.Item>
              </>
            ) : null}
          </MenuPrimitive.Content>
        </MenuPrimitive.Portal>
      </DropdownMenu>

      <NewLeadDialog
        open={novo}
        onOpenChange={setNovo}
        pipelineId={pipelineId}
        stages={stages}
        contactId={lead.contact_id}
        leads={leads}
      />
      <MoveToOtherPipelineDialog
        open={mudar}
        onOpenChange={setMudar}
        leadId={lead.id}
        pipelineId={pipelineId}
      />
      <AlertDialog open={excluir} onOpenChange={setExcluir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Excluir")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Tem certeza que deseja excluir este negócio?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={lote.isPending}
              onClick={(e) => {
                // Quem fecha é o sucesso (o mesmo cuidado do ⋮ do card).
                e.preventDefault();
                lote.mutate(
                  { action: "delete", lead_ids: [lead.id], params: {} },
                  {
                    onSuccess: () => {
                      setExcluir(false);
                      router.push(rotaDoQuadro(pipelineId, busca.toString()));
                    },
                  },
                );
              }}
            >
              {t("Excluir")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
