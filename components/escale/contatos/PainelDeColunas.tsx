"use client";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { type ReactNode, useState } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  CAMPOS_DO_CONTATO_2A,
  COLUNAS_NATIVAS,
  COLUNAS_PADRAO,
  type ItemDeColuna,
  ROTULO_DA_COLUNA,
  chaveDoItem,
  mesmasColunas,
} from "@/lib/escale/contatos/regras";
import {
  ChevronDown,
  GripVertical,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "@/lib/ui/icons-da-casca";

import { rotuloDoItem } from "./CelulasDoContato";

/**
 * "PERSONALIZAR COLUNAS" (Clint `contactsColumnsPicker`, captura 03-002):
 * busca; "Na tabela · N" com alça para arrastar; "Colunas" (as nativas fora da
 * tabela); "Campos do contato"; "Redefinir" só fora do padrão. Cada mudança
 * chama `aoMudar` com a lista nova (quem chama grava).
 */
export function PainelDeColunas({
  itens,
  aoMudar,
}: {
  itens: ItemDeColuna[];
  aoMudar: (itens: ItemDeColuna[]) => void;
}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [fechados, setFechados] = useState<Record<string, boolean>>({});
  const casa = (rotulo: string) =>
    rotulo.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR"));
  const naTabela = new Set(itens.map(chaveDoItem));

  const nativasFora: ItemDeColuna[] = COLUNAS_NATIVAS.filter(
    (c) => !naTabela.has(`nativa:${c}`),
  ).map((chave) => ({
    tipo: "nativa",
    chave,
  }));
  const camposFora: ItemDeColuna[] = CAMPOS_DO_CONTATO_2A.filter(
    (c) => !naTabela.has(`campo:${c.chave}`),
  ).map((c) => ({
    tipo: "campo",
    chave: c.chave,
  }));
  const rotulo = (item: ItemDeColuna) => rotuloDoItem(item, t, ROTULO_DA_COLUNA);

  const tirar = (item: ItemDeColuna) =>
    aoMudar(itens.filter((i) => chaveDoItem(i) !== chaveDoItem(item)));
  const por = (item: ItemDeColuna) => aoMudar([...itens, item]);
  const soltar = (r: DropResult) => {
    if (!r.destination || r.destination.index === r.source.index) return;
    const nova = [...itens];
    const [movido] = nova.splice(r.source.index, 1);
    if (!movido) return;
    nova.splice(r.destination.index, 0, movido);
    aoMudar(nova);
  };

  const cabecaDoGrupo = (id: string, titulo: string, extra?: string) => (
    <button
      type="button"
      onClick={() => setFechados((f) => ({ ...f, [id]: !f[id] }))}
      className="flex w-full items-center gap-2 px-1 py-2 text-left text-[11px] font-semibold tracking-[0.06em] text-casca-texto uppercase"
    >
      <ChevronDown size={12} aria-hidden className={fechados[id] ? "-rotate-90" : ""} />
      {titulo}
      {extra && (
        <>
          <span aria-hidden className="font-normal text-casca-suave">
            ·
          </span>
          <span className="font-normal tracking-normal text-casca-suave normal-case">{extra}</span>
        </>
      )}
    </button>
  );
  const linha = (item: ItemDeColuna, ligado: boolean, alca?: ReactNode) => (
    <div className="flex h-8 items-center gap-2 px-1">
      {alca}
      <span className="flex-1 truncate text-[13px] text-casca-texto">{rotulo(item)}</span>
      <InterruptorDaCasca
        ligado={ligado}
        aoMudar={() => (ligado ? tirar(item) : por(item))}
        aria-label={rotulo(item)}
      />
    </div>
  );

  const fixasVisiveis = itens.filter((i) => casa(rotulo(i)));
  const nativasVisiveis = nativasFora.filter((i) => casa(rotulo(i)));
  const camposVisiveis = camposFora.filter((i) => casa(rotulo(i)));
  const nada = fixasVisiveis.length + nativasVisiveis.length + camposVisiveis.length === 0;
  const buscando = busca.trim() !== "";

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("Personalizar colunas")}
        title={t("Personalizar colunas")}
        className="flex h-8 items-center gap-1.5 rounded-casca-gatilho px-1.5 text-casca-suave hover:bg-casca-raia"
      >
        <SlidersHorizontal size={17} aria-hidden />
        <span className="grid size-5 place-items-center rounded-full bg-casca-raia text-[11px] font-semibold text-casca-texto">
          {itens.length}
        </span>
      </PopoverTrigger>
      <PainelSuspenso align="end" className="w-[334px] p-0">
        <div className="flex items-center gap-2 border-b border-casca-borda px-4 py-3">
          <span className="text-[14px] font-medium text-casca-texto">
            {t("Personalizar colunas")}
          </span>
          <span className="grid size-5 place-items-center rounded-full bg-casca-marca text-[11px] font-semibold text-white">
            {itens.length}
          </span>
          {!mesmasColunas(itens, COLUNAS_PADRAO) && (
            <button
              type="button"
              onClick={() => aoMudar(COLUNAS_PADRAO)}
              className="ml-auto text-[12px] font-medium text-casca-marca hover:underline"
            >
              {t("Redefinir")}
            </button>
          )}
        </div>
        <div className="p-3">
          <label className="flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
            <Search size={14} aria-hidden className="text-casca-meta" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={t("Buscar coluna ou campo")}
              className="w-full bg-transparent text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            />
            {busca && (
              <button type="button" aria-label={t("Fechar")} onClick={() => setBusca("")}>
                <X size={12} aria-hidden />
              </button>
            )}
          </label>
        </div>
        <div className="max-h-[400px] overflow-y-auto px-3 pb-3">
          {nada && (
            <p className="py-6 text-center text-[13px] text-casca-suave">{t("Nada encontrado.")}</p>
          )}
          {fixasVisiveis.length > 0 && (
            <section>
              {cabecaDoGrupo(
                "tabela",
                `${t("Na tabela")} · ${itens.length}`,
                t("arraste para reordenar"),
              )}
              {!fechados.tabela && (
                <DragDropContext onDragEnd={soltar}>
                  <Droppable droppableId="colunas-na-tabela" isDropDisabled={buscando}>
                    {(p) => (
                      <div ref={p.innerRef} {...p.droppableProps}>
                        {fixasVisiveis.map((item, i) => (
                          <Draggable
                            key={chaveDoItem(item)}
                            draggableId={chaveDoItem(item)}
                            index={i}
                            isDragDisabled={buscando}
                          >
                            {(d) => (
                              <div ref={d.innerRef} {...d.draggableProps}>
                                {linha(
                                  item,
                                  true,
                                  <span
                                    {...d.dragHandleProps}
                                    aria-label={t("arraste para reordenar")}
                                    className="cursor-grab text-casca-meta"
                                  >
                                    <GripVertical size={14} aria-hidden />
                                  </span>,
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {p.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </section>
          )}
          {nativasVisiveis.length > 0 && (
            <section className="mt-2 border-t border-casca-borda pt-1">
              {cabecaDoGrupo("colunas", t("Colunas"))}
              {!fechados.colunas &&
                nativasVisiveis.map((item) => (
                  <div key={chaveDoItem(item)}>{linha(item, false)}</div>
                ))}
            </section>
          )}
          {camposVisiveis.length > 0 && (
            <section className="mt-2 border-t border-casca-borda pt-1">
              <div className="flex items-center gap-1">
                <User size={12} aria-hidden className="text-casca-meta" />
                {cabecaDoGrupo("campos", t("Campos do contato"))}
              </div>
              {!fechados.campos &&
                camposVisiveis.map((item) => (
                  <div key={chaveDoItem(item)}>{linha(item, false)}</div>
                ))}
            </section>
          )}
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
