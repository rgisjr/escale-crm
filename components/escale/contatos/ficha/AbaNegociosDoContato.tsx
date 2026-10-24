"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { chaveDaFichaDeNegociosDoContato } from "@/hooks/escale/useFichaDeNegociosDoContato";
import { useT } from "@/hooks/i18n/useT";
import { useBulkAction } from "@/hooks/kanban/useBulkAction";
import type { FichaDeNegociosDoContato } from "@/lib/escale/ficha-do-contato/banco";
import {
  ROTULO_DO_STATUS_DO_NEGOCIO,
  negociosParaMostrar,
  temPerdido,
  type NegocioDoContato,
} from "@/lib/escale/ficha-do-contato/regras";
import { ArrowRight, EllipsisVertical, Trash2, User } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const TH = "h-[50px] px-4 text-left text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase";
const TD = "px-4 text-[14px] text-casca-texto";

/**
 * A ABA NEGÓCIOS DA JANELA DO CONTATO (fork Escale, Fase 2E; C3, N9; Clint
 * `index-BhVJ8kAx`). Os negócios do contato, mais novos primeiro: o dono na foto
 * ("Dono: {nome}" / "Sem dono"), Negócio, Origem, Etapa, Status, "Motivo de perda"
 * só com perdido, e o ⋮ com "Ir para o negócio" e "Excluir negócio". "Arquivado" é
 * o negócio de origem arquivada, escondido até "Mostrar arquivados".
 */
export function AbaNegociosDoContato({ contatoId, ficha }: { contatoId: string; ficha: FichaDeNegociosDoContato }) {
  const t = useT();
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [excluindo, setExcluindo] = useState<NegocioDoContato | null>(null);
  const temArquivado = ficha.negocios.some((n) => n.origem_arquivada);
  const lista = negociosParaMostrar(ficha.negocios, mostrarArquivados);
  const comPerda = temPerdido(lista);

  return (
    <div className="py-5">
      {temArquivado ? (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setMostrarArquivados((m) => !m)}
            className="text-[13px] font-medium text-casca-marca hover:underline"
          >
            {mostrarArquivados ? t("Ocultar arquivados") : t("Mostrar arquivados")}
          </button>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-casca-borda">
        <table className="w-full border-collapse">
          <thead className="border-b border-casca-borda">
            <tr>
              <th className={cn(TH, "w-14")} aria-label={t("Dono")} />
              <th className={TH}>{t("Negócio")}</th>
              <th className={TH}>{t("Origem")}</th>
              <th className={TH}>{t("Etapa")}</th>
              <th className={TH}>{t("Status")}</th>
              {comPerda ? <th className={TH}>{t("Motivo de perda")}</th> : null}
              <th className={cn(TH, "w-16 text-right")}>{t("Ações")}</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((n) => (
              <tr key={n.id} aria-label={n.titulo} className="h-16 border-b border-casca-borda last:border-0 hover:bg-casca-raia">
                <td className={TD}>
                  <span
                    title={n.dono_nome ? `${t("Dono:")} ${n.dono_nome}` : t("Sem dono")}
                    className="grid size-8 place-items-center rounded-full bg-casca-marca-suave text-[12px] font-semibold text-casca-marca"
                  >
                    {n.dono_nome ? n.dono_nome.charAt(0).toUpperCase() : <User size={14} aria-hidden />}
                  </span>
                </td>
                <td className={cn(TD, "font-medium")}>
                  <span className="flex items-center gap-2">
                    {n.titulo}
                    {n.origem_arquivada ? (
                      <span className="rounded-sm bg-casca-cinza-selo/20 px-1.5 text-[11px] text-casca-suave">{t("Arquivado")}</span>
                    ) : null}
                  </span>
                </td>
                <td className={cn(TD, "text-casca-suave")}>{n.origem_nome}</td>
                <td className={cn(TD, "text-casca-suave")}>{n.etapa_nome ?? "—"}</td>
                <td className={TD}>{t(ROTULO_DO_STATUS_DO_NEGOCIO[n.status])}</td>
                {comPerda ? <td className={cn(TD, "text-casca-suave")}>{n.motivo_de_perda ?? "—"}</td> : null}
                <td className={cn(TD, "text-right")}>
                  <MenuDoNegocio negocio={n} aoExcluir={() => setExcluindo(n)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {excluindo ? <ConfirmarExclusao contatoId={contatoId} negocio={excluindo} aoFechar={() => setExcluindo(null)} /> : null}
    </div>
  );
}

function MenuDoNegocio({ negocio, aoExcluir }: { negocio: NegocioDoContato; aoExcluir: () => void }) {
  const t = useT();
  const podeExcluir = usePermission("pipeline.move_card");
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        aria-label={t("Ações")}
        className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
      >
        <EllipsisVertical size={16} aria-hidden />
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content align="end" className={CAIXA_DO_MENU}>
          <MenuPrimitive.Item asChild className={ITEM_DO_MENU}>
            <Link href={`/app/negocios/${negocio.id}`}>
              <ArrowRight size={14} aria-hidden />
              {t("Ir para o negócio")}
            </Link>
          </MenuPrimitive.Item>
          {podeExcluir ? (
            <MenuPrimitive.Item className={cn(ITEM_DO_MENU, "text-casca-alerta")} onSelect={aoExcluir}>
              <Trash2 size={14} aria-hidden />
              {t("Excluir negócio")}
            </MenuPrimitive.Item>
          ) : null}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

function ConfirmarExclusao({
  contatoId,
  negocio,
  aoFechar,
}: {
  contatoId: string;
  negocio: NegocioDoContato;
  aoFechar: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const lote = useBulkAction(negocio.origem_id);
  return (
    <JanelaDeConfirmacao
      aberta
      aoFechar={aoFechar}
      titulo={t("Excluir negócio")}
      rotuloDoConfirmar={t("Excluir")}
      perigo
      ocupado={lote.isPending}
      aoConfirmar={() =>
        lote.mutate(
          { action: "delete", lead_ids: [negocio.id], params: {} },
          {
            onSuccess: () => {
              void qc.invalidateQueries({ queryKey: chaveDaFichaDeNegociosDoContato(contatoId) });
              aoFechar();
            },
          },
        )
      }
    >
      {t("Tem certeza que deseja excluir o negócio selecionado?")}
    </JanelaDeConfirmacao>
  );
}
