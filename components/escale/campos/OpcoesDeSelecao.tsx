"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { GripVertical, Plus, X } from "@/lib/ui/icons-da-casca";

/** "Opções de seleção" do AddFieldForm: alça, número, texto, X e "Nova opção". */
export function OpcoesDeSelecao({ opcoes, aoMudar }: { opcoes: string[]; aoMudar: (opcoes: string[]) => void }) {
  const t = useT();
  const soltar = (r: DropResult) => {
    if (!r.destination) return;
    const novas = [...opcoes];
    const [m] = novas.splice(r.source.index, 1);
    if (m === undefined) return;
    novas.splice(r.destination.index, 0, m);
    aoMudar(novas);
  };
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-casca-texto">{t("Opções de seleção")}</p>
      <DragDropContext onDragEnd={soltar}>
        <Droppable droppableId="opcoes">
          {(drop) => (
            <div ref={drop.innerRef} {...drop.droppableProps} className="flex flex-col gap-1.5">
              {opcoes.map((o, i) => (
                <Draggable key={i} draggableId={`opcao-${i}`} index={i}>
                  {(drag) => (
                    <div ref={drag.innerRef} {...drag.draggableProps} className="flex items-center gap-2">
                      <span {...drag.dragHandleProps} className="text-casca-meta"><GripVertical size={16} /></span>
                      <span className="w-5 text-center text-[12px] text-casca-suave">{i + 1}</span>
                      <CampoDeTexto aria-label={`${t("Opção")} ${i + 1}`} value={o} onChange={(e) => aoMudar(opcoes.map((x, j) => (j === i ? e.target.value : x)))} />
                      <button type="button" aria-label={t("Remover opção")} onClick={() => aoMudar(opcoes.filter((_, j) => j !== i))} className="text-casca-meta hover:text-casca-texto">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {drop.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <button type="button" onClick={() => aoMudar([...opcoes, ""])} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-casca-marca">
        {t("Nova opção")} <Plus size={14} />
      </button>
    </div>
  );
}
