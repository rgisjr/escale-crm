"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useMemo } from "react";

import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DA_VISIBILIDADE, type CampoDoCatalogo, type Catalogo, type GrupoDeCampos, camposPorGrupo } from "@/lib/escale/campos/regras";
import { GripVertical, MoreVertical } from "@/lib/ui/icons-da-casca";

import { IconeDoTipo } from "./IconeDoTipo";

export interface ListaDeCamposProps {
  catalogo: Catalogo;
  grupoAtivo: GrupoDeCampos | null;
  busca: string;
  aoEditarNome: (campo: CampoDoCatalogo) => void;
  aoRestringir: (campo: CampoDoCatalogo, ancora: HTMLElement) => void;
  aoCopiarVariavel: (campo: CampoDoCatalogo) => void;
  aoCopiarIdentificador: (campo: CampoDoCatalogo) => void;
  aoExcluir: (campo: CampoDoCatalogo) => void;
  aoReordenar: (grupoId: string, ids: string[]) => void;
}

/** As linhas de campo de um grupo (FieldsConfig da Clint): alça, ícone, nome, identificador, visibilidade e ⋮. */
export function ListaDeCampos(p: ListaDeCamposProps) {
  const t = useT();
  const porGrupo = useMemo(() => camposPorGrupo(p.catalogo), [p.catalogo]);
  const termo = p.busca.trim().toLowerCase();
  const visiveis = useMemo(() => {
    const base = termo ? porGrupo.flatMap((g) => g.campos) : (porGrupo.find((g) => g.grupo.id === p.grupoAtivo?.id)?.campos ?? []);
    return termo ? base.filter((c) => String(c.definicao.label).toLowerCase().includes(termo) || c.chave.includes(termo)) : base;
  }, [porGrupo, termo, p.grupoAtivo]);

  if (termo && visiveis.length === 0) {
    return (
      <Vazio titulo={t("Nenhum campo encontrado")} texto={t("Tente ajustar o termo da busca ou limpar o filtro.")} />
    );
  }
  if (!termo && visiveis.length === 0) {
    return <Vazio titulo={t("Nenhum campo neste grupo")} texto={t("Adicione um campo para começar a coletar informações neste grupo.")} />;
  }

  const aoSoltar = (r: DropResult) => {
    if (!r.destination || termo || !p.grupoAtivo) return;
    const ids = visiveis.map((c) => c.id);
    const [movido] = ids.splice(r.source.index, 1);
    if (movido === undefined) return;
    ids.splice(r.destination.index, 0, movido);
    p.aoReordenar(p.grupoAtivo.id, ids);
  };

  return (
    <DragDropContext onDragEnd={aoSoltar}>
      <Droppable droppableId="campos" isDropDisabled={Boolean(termo)}>
        {(drop) => (
          <ul ref={drop.innerRef} {...drop.droppableProps} className="flex flex-col">
            {visiveis.map((campo, i) => (
              <Draggable key={campo.id} draggableId={campo.id} index={i} isDragDisabled={Boolean(termo)}>
                {(drag) => (
                  <li ref={drag.innerRef} {...drag.draggableProps} className="flex h-12 items-center gap-3 border-b border-casca-borda px-2">
                    <span {...drag.dragHandleProps} className="text-casca-meta" aria-label={t("arraste para reordenar")}>
                      <GripVertical size={16} />
                    </span>
                    <IconeDoTipo tipo={campo.definicao.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-casca-texto">{String(campo.definicao.label)}</span>
                      <span className="block font-mono text-[11px] text-casca-suave">{campo.chave}</span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${campo.papel_minimo ? "bg-casca-marca-suave text-casca-marca" : "bg-casca-raia text-casca-suave"}`}
                    >
                      {campo.papel_minimo ? `${t("Restrito para")} ${t(ROTULO_DA_VISIBILIDADE[campo.papel_minimo])}` : t("Sempre visível")}
                    </span>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button type="button" aria-label={`${t("Ações de")} ${String(campo.definicao.label)}`} className="rounded-[6px] p-1 text-casca-suave hover:bg-casca-raia">
                          <MoreVertical size={18} />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content align="end" sideOffset={6} className="z-[70] w-[232px] rounded-[8px] border border-casca-borda bg-casca-superficie p-1 shadow-casca">
                          <Item rotulo={t("Editar nome do campo")} desabilitado={campo.padrao} dica={campo.padrao ? t("Não é possível editar um campo padrão do sistema") : undefined} onSelect={() => p.aoEditarNome(campo)} />
                          <Item rotulo={t("Restringir visibilidade")} onSelect={(e) => p.aoRestringir(campo, e.currentTarget as HTMLElement)} />
                          <Item rotulo={t("Usar como variável")} onSelect={() => p.aoCopiarVariavel(campo)} />
                          <Item rotulo={t("Copiar identificador")} onSelect={() => p.aoCopiarIdentificador(campo)} />
                          <DropdownMenu.Separator className="my-1 h-px bg-casca-borda" />
                          <Item rotulo={t("Excluir")} perigo desabilitado={campo.padrao} dica={campo.padrao ? t("Esse campo é padrão e não pode ser excluído.") : undefined} onSelect={() => p.aoExcluir(campo)} />
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </li>
                )}
              </Draggable>
            ))}
            {drop.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
}

function Item({ rotulo, onSelect, desabilitado, dica, perigo }: { rotulo: string; onSelect: (e: Event) => void; desabilitado?: boolean; dica?: string; perigo?: boolean }) {
  return (
    <DropdownMenu.Item
      disabled={desabilitado}
      title={dica}
      onSelect={onSelect}
      className={`flex h-8 cursor-pointer items-center rounded-[6px] px-2 text-[13px] outline-hidden data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-casca-raia ${perigo ? "text-casca-alerta" : "text-casca-texto"}`}
    >
      {rotulo}
    </DropdownMenu.Item>
  );
}

function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-12 text-center">
      <p className="text-[13px] font-medium text-casca-texto">{titulo}</p>
      <p className="text-[12px] text-casca-suave">{texto}</p>
    </div>
  );
}
