"use client";
import { useState, type KeyboardEvent } from "react";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU } from "@/components/escale/menu/estilos";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { FiltroDaLista, ListaComFiltros } from "@/lib/escale/listas/filtros-salvos";
import { Bookmark, Check, EllipsisVertical, Pencil, Trash2, Users, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export const ROTULO_DO_GRUPO =
  "px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.06em] text-casca-meta uppercase";
export const ATIVO = "bg-casca-marca-suave text-casca-marca";

/**
 * A LINHA DE UM FILTRO SALVO no seletor (prints 2b-03 e 2b-04): o nome (aplica), e, nos meus, o ⋮
 * com "Renomear" (vira um campo na própria linha, com ✓ e ✕), "Compartilhar com a equipe" e
 * "Excluir filtro". Extraída do seletor da lista de contatos na 7C para o seletor do painel reusar.
 * O estado do campo de renomear mora aqui: o menu fechado desmonta a linha e o zera.
 */
export function LinhaDoFiltroSalvo<L extends ListaComFiltros>({
  filtro,
  ativo,
  aoAplicar,
  aoRenomear,
  aoCompartilhar,
  aoPedirExclusao,
}: {
  filtro: FiltroDaLista<L>;
  ativo: boolean;
  aoAplicar: (f: FiltroDaLista<L>) => void;
  aoRenomear: (id: string, nome: string) => Promise<string | null>;
  aoCompartilhar: (id: string, compartilhado: boolean) => void;
  aoPedirExclusao: (f: FiltroDaLista<L>) => void;
}) {
  const t = useT();
  const [renomeando, setRenomeando] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const f = filtro;

  function cancelarRenomear() {
    setRenomeando(false);
    setErro(null);
  }

  async function confirmarRenomear() {
    if (!nome.trim()) return;
    const problema = await aoRenomear(f.id, nome);
    if (problema) return setErro(problema);
    cancelarRenomear();
  }

  /** O menu do Radix procura item pela letra digitada: dentro do campo, a tecla fica no campo. */
  function teclaNoCampo(e: KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      void confirmarRenomear();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelarRenomear();
    }
  }

  if (renomeando) {
    return (
      <div className="px-1 py-0.5">
        <div className="flex h-8 items-center gap-1.5 rounded-[4px] bg-casca-marca-suave px-2">
          <Bookmark size={14} aria-hidden className="shrink-0 fill-current text-casca-marca" />
          <input
            autoFocus
            value={nome}
            maxLength={60}
            aria-label={t("Nome do filtro")}
            onChange={(e) => {
              setNome(e.target.value);
              setErro(null);
            }}
            onKeyDown={teclaNoCampo}
            className="h-6 min-w-0 flex-1 rounded-[4px] border border-casca-marca bg-surface px-1.5 text-[13px] text-casca-texto outline-hidden"
          />
          <button
            type="button"
            aria-label={t("Salvar nome")}
            disabled={!nome.trim()}
            title={!nome.trim() ? t("Dê um nome ao filtro.") : undefined}
            onClick={() => void confirmarRenomear()}
            className="grid size-6 shrink-0 place-items-center rounded-[4px] bg-casca-marca text-white hover:bg-casca-marca-forte disabled:opacity-50"
          >
            <Check size={14} aria-hidden />
          </button>
          <button
            type="button"
            aria-label={t("Cancelar")}
            onClick={cancelarRenomear}
            className="grid size-6 shrink-0 place-items-center text-casca-suave hover:text-casca-texto"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
        {erro ? (
          <p role="alert" className="px-2 pt-1 text-[12px] text-casca-alerta">
            {erro}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex items-center">
      <DropdownMenuItem
        className={cn(ITEM_DO_MENU, "min-w-0 flex-1", ativo && ATIVO)}
        onSelect={() => aoAplicar(f)}
      >
        <Bookmark size={14} aria-hidden className="shrink-0 fill-current text-casca-marca" />
        <span className="truncate">{f.nome}</span>
        {ativo ? <Check size={14} aria-hidden className="ml-auto text-casca-marca" /> : null}
      </DropdownMenuItem>
      {f.meu ? (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            aria-label={`${t("Ações")} ${f.nome}`}
            className="grid size-7 shrink-0 place-items-center rounded-[4px] text-casca-suave [&>svg:last-child]:hidden"
          >
            <EllipsisVertical size={14} aria-hidden />
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className={CONTEUDO_DO_MENU}>
            <DropdownMenuItem
              className={ITEM_DO_MENU}
              onSelect={(e) => {
                // O menu continua aberto: o nome vira um campo na própria linha (print 2b-04).
                e.preventDefault();
                setNome(f.nome);
                setErro(null);
                setRenomeando(true);
              }}
            >
              <Pencil size={14} aria-hidden />
              {t("Renomear")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={ITEM_DO_MENU}
              onSelect={() => aoCompartilhar(f.id, !f.compartilhado)}
            >
              <Users size={14} aria-hidden />
              {f.compartilhado ? t("Deixar de compartilhar") : t("Compartilhar com a equipe")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn(ITEM_DO_MENU, "text-casca-alerta")}
              onSelect={() => aoPedirExclusao(f)}
            >
              <Trash2 size={14} aria-hidden />
              {t("Excluir filtro")}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ) : null}
    </div>
  );
}
