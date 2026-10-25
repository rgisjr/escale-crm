"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { EditContactDialog } from "@/components/contacts/EditContactDialog";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU } from "@/components/escale/menu/estilos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useContact } from "@/hooks/contacts/useContact";
import { mensagemDeBloqueioPorVinculo } from "@/hooks/contacts/useDeleteContact";
import { useExcluirContatoDaLista } from "@/hooks/escale/useExcluirContatoDaLista";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { EllipsisVertical, Pencil, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O ⋮ DA LINHA (Clint `bt-row-menu-v2`): "Editar" e, para quem pode excluir,
 * "Excluir" em vermelho com a confirmação em balão da Clint. Antes de confirmar,
 * a checagem de Agenda do original (`/vinculos`): contato com compromisso não
 * se exclui, e o aviso do original explica. Fase 2B (Q5): a exclusão leva os
 * negócios do contato, pela rota do fork (`DELETE /api/v1/lista-de-contatos/[id]`),
 * e o balão ganha a linha que avisa disso.
 */
/** O balão de confirmar: as consultas (vínculos, exclusão) só existem enquanto ele está aberto. */
function ConfirmacaoDeExclusao({ linha, aoFechar }: { linha: LinhaDeContato; aoFechar: () => void }) {
  const t = useT();
  const excluir = useExcluirContatoDaLista();
  const vinculos = useQuery({
    queryKey: ["contato-vinculos-para-excluir", linha.id],
    retry: false,
    queryFn: async () => {
      const corpo = await apiClient.get<{
        data?: { vinculos: string[]; por_tabela: Record<string, number> };
      }>(`/api/v1/contacts/${linha.id}/vinculos`);
      return corpo.data ?? { vinculos: [], por_tabela: {} };
    },
  });
  const bloqueio = mensagemDeBloqueioPorVinculo(vinculos.data, t);
  const ocupado = excluir.isPending || vinculos.isLoading;

  const confirmar = () =>
    excluir.mutate(linha.id, {
      onSuccess: () => {
        aoFechar();
        toast.success(t("Contato excluído."));
      },
    });

  if (bloqueio) return <p>{bloqueio}</p>;
  return (
    <>
      <p>{t("Tem certeza que deseja excluir o contato selecionado?")}</p>
      <p className="mt-1 text-[12px] text-casca-suave">
        {t("Os negócios associados ao contato também serão excluídos.")}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={aoFechar}
          className="h-8 rounded-[4px] border border-casca-borda px-3 font-medium hover:bg-casca-raia"
        >
          {t("Cancelar")}
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={ocupado}
          title={ocupado ? t("Aguarde…") : undefined}
          className="h-8 rounded-[4px] bg-casca-alerta px-3 font-medium text-white hover:brightness-95 disabled:opacity-60"
        >
          {t("Excluir")}
        </button>
      </div>
    </>
  );
}

/** A janela de edição: o contato completo só é buscado quando "Editar" é escolhido. */
function EdicaoDoContato({ id, aoFechar }: { id: string; aoFechar: () => void }) {
  const contato = useContact(id);
  if (!contato.data) return null;
  return <EditContactDialog contact={contato.data.data} open onOpenChange={(v) => !v && aoFechar()} />;
}

export function MenuDaLinha({
  linha,
  podeExcluir,
  aoEditar,
}: {
  linha: LinhaDeContato;
  podeExcluir: boolean;
  /** FORK ESCALE · Fase 2E (N4): "Editar" abre a janela do contato (aba Contato). */
  aoEditar?: () => void;
}) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  return (
    <>
      <Popover open={confirmando} onOpenChange={setConfirmando}>
        <DropdownMenu>
          {/* Âncora, não gatilho: o clique abre só o menu; a confirmação abre por "Excluir". */}
          <PopoverAnchor asChild>
            <DropdownMenuTrigger
              aria-label={t("Mais ações")}
              className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto"
            >
              <EllipsisVertical size={18} aria-hidden />
            </DropdownMenuTrigger>
          </PopoverAnchor>
          <DropdownMenuContent
            side="left"
            align="start"
            className={CONTEUDO_DO_MENU}
            // Escolhido "Excluir", o foco não volta ao ⋮: voltar contaria como "fora" do balão e o fecharia ao abrir.
            onCloseAutoFocus={(e) => {
              if (confirmando) e.preventDefault();
            }}
          >
            <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => (aoEditar ? aoEditar() : setEditando(true))}>
              <Pencil size={14} aria-hidden />
              {t("Editar")}
            </DropdownMenuItem>
            {podeExcluir && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={cn(ITEM_DO_MENU, "text-casca-alerta")}
                  onSelect={() => setConfirmando(true)}
                >
                  <Trash2 size={14} aria-hidden />
                  {t("Excluir")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <PopoverContent
          side="top"
          className="w-72 rounded-[8px] p-4 text-[13px] text-casca-texto shadow-casca-painel"
        >
          <ConfirmacaoDeExclusao linha={linha} aoFechar={() => setConfirmando(false)} />
        </PopoverContent>
      </Popover>
      {editando && <EdicaoDoContato id={linha.id} aoFechar={() => setEditando(false)} />}
    </>
  );
}
