"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { GrupoDeCampos } from "@/lib/escale/campos/regras";
import { GripVertical, MoreVertical } from "@/lib/ui/icons-da-casca";

export interface GruposDoCatalogoProps {
  grupos: GrupoDeCampos[];
  ativo: GrupoDeCampos | null;
  aoEscolher: (grupo: GrupoDeCampos) => void;
  aoRenomear: (grupo: GrupoDeCampos, nome: string) => void;
  aoExcluir: (grupo: GrupoDeCampos) => void;
  aoReordenar: (ids: string[]) => void;
}

/** A coluna da esquerda (238px, como a `nav` da ficha): um grupo por linha, com ⋮ e arraste. */
export function GruposDoCatalogo(p: GruposDoCatalogoProps) {
  const t = useT();
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const ordenados = [...p.grupos].sort((a, b) => a.posicao - b.posicao);

  const aoSoltar = (r: DropResult) => {
    if (!r.destination) return;
    const ids = ordenados.map((g) => g.id);
    const [movido] = ids.splice(r.source.index, 1);
    if (movido === undefined) return;
    ids.splice(r.destination.index, 0, movido);
    p.aoReordenar(ids);
  };

  const confirmar = (grupo: GrupoDeCampos) => {
    const limpo = nome.trim();
    setRenomeando(null);
    if (limpo && limpo !== grupo.nome) p.aoRenomear(grupo, limpo);
  };

  return (
    <nav aria-label={t("Grupos de campos")} className="w-[238px] shrink-0 overflow-y-auto border-r border-casca-borda py-2">
      <DragDropContext onDragEnd={aoSoltar}>
        <Droppable droppableId="grupos">
          {(drop) => (
            <ul ref={drop.innerRef} {...drop.droppableProps}>
              {ordenados.map((grupo, i) => {
                const ehAtivo = p.ativo?.id === grupo.id;
                return (
                  <Draggable key={grupo.id} draggableId={grupo.id} index={i}>
                    {(drag) => (
                      <li
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={`group flex h-[38px] items-center gap-1 border-l-2 pr-1 pl-1 text-[13px] ${ehAtivo ? "border-casca-marca bg-casca-marca-suave font-medium text-casca-texto" : "border-transparent text-casca-texto"}`}
                      >
                        <span {...drag.dragHandleProps} title={t("Arraste para reordenar os grupos")} className="text-casca-meta">
                          <GripVertical size={14} />
                        </span>
                        {renomeando === grupo.id ? (
                          <input
                            autoFocus
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            onBlur={() => confirmar(grupo)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmar(grupo);
                              if (e.key === "Escape") setRenomeando(null);
                            }}
                            maxLength={60}
                            className="h-7 min-w-0 flex-1 rounded-[6px] bg-casca-busca px-2 text-[13px] outline-hidden"
                          />
                        ) : (
                          <button type="button" onClick={() => p.aoEscolher(grupo)} className="min-w-0 flex-1 truncate text-left">
                            {grupo.nome}
                          </button>
                        )}
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button type="button" aria-label={`${t("Ações de")} ${grupo.nome}`} className="rounded-[6px] p-1 text-casca-suave hover:bg-casca-raia">
                              <MoreVertical size={16} />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content align="end" sideOffset={6} className="z-[70] w-[200px] rounded-[8px] border border-casca-borda bg-casca-superficie p-1 shadow-casca">
                              <DropdownMenu.Item
                                onSelect={() => { setNome(grupo.nome); setRenomeando(grupo.id); }}
                                className="flex h-8 cursor-pointer items-center rounded-[6px] px-2 text-[13px] text-casca-texto outline-hidden data-[highlighted]:bg-casca-raia"
                              >
                                {t("Renomear grupo")}
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                disabled={grupo.padrao}
                                title={grupo.padrao ? t("Esse campo é padrão e não pode ser excluído.") : undefined}
                                onSelect={() => p.aoExcluir(grupo)}
                                className="flex h-8 cursor-pointer items-center rounded-[6px] px-2 text-[13px] text-casca-alerta outline-hidden data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-casca-raia"
                              >
                                {t("Excluir")}
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </li>
                    )}
                  </Draggable>
                );
              })}
              {drop.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </nav>
  );
}
