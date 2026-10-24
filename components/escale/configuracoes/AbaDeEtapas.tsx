"use client";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvidedDragHandleProps,
  type DropResult,
} from "@hello-pangea/dnd";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import {
  criarEtapaProvisoria,
  editarEtapa,
  excluirEtapa,
  moverEtapa,
  rascunhoInicialDasEtapas,
  type EtapaDoRascunho,
  type RascunhoDasEtapas,
} from "@/lib/escale/etapas/rascunho";
import {
  adicionarAtividade,
  atividadesDaEtapa,
  atualizarAtividade,
  removerAtividade,
  rotuloDoModelo,
  trocarDeLugar,
  vizinhaDeMesmoPrazo,
  type AtividadeDoPlaybook,
} from "@/lib/escale/playbook/regras";
import {
  ChevronDown,
  EllipsisVertical,
  Flag,
  LayoutPanelLeft,
  ListChecks,
  Pencil,
  Plus,
  Share2,
  Trash2,
  TriangleAlert,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { JanelaDaEtapa, MARCA_DO_LAPIS } from "./etapas/JanelaDaEtapa";
import { NovaEtapa } from "./etapas/NovaEtapa";
import { ItemDoPlaybook } from "./playbook/ItemDoPlaybook";
import { JanelaConfiguracoesDeAtividades } from "./playbook/JanelaConfiguracoesDeAtividades";
import { JanelaNovaAtividade } from "./playbook/JanelaNovaAtividade";

/** Quantas atividades a coluna mostra antes do "Ver mais" (Clint). */
const VISIVEIS = 6;

type Lista = readonly AtividadeDoPlaybook[];
type Alca = DraggableProvidedDragHandleProps | null | undefined;

/**
 * A ABA "ETAPAS E ATIVIDADES" (fork Escale, Fases 1I e 1L; prints F20, F21, 030 e os de
 * 24/10). Uma coluna por etapa aberta com o playbook dela. Com `mudarEtapas`, as etapas
 * também se editam como na Clint (lápis, lixeira, arrastar e "+ Nova Etapa"). Tudo mexe só
 * no RASCUNHO, que a `JanelaDaOrigem` guarda e grava no "Salvar na origem". Sem
 * `mudarEtapas` a aba só mostra as etapas (modo leitura). Os modelos de playbook ficam
 * "Em breve" (Q12 da 1I).
 */
export function AbaDeEtapas({
  config,
  atividades,
  temSalvas,
  mudar,
  etapas,
  mudarEtapas,
}: {
  config: ConfiguracoesDaOrigem;
  atividades: Lista;
  temSalvas: boolean;
  mudar: (f: (lista: Lista) => Lista) => void;
  etapas?: RascunhoDasEtapas;
  mudarEtapas?: (f: (r: RascunhoDasEtapas) => RascunhoDasEtapas) => void;
}) {
  const rascunho = useMemo(
    () => etapas ?? rascunhoInicialDasEtapas(config.etapas),
    [etapas, config.etapas],
  );
  const abertas = rascunho.etapas;
  const podeEditar = mudarEtapas !== undefined;
  const [novaEm, setNovaEm] = useState<{ id: string; name: string } | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [lapisEm, setLapisEm] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<EtapaDoRascunho | null>(null);
  const t = useT();

  const aoSoltar = (r: DropResult) => {
    if (!r.destination || !mudarEtapas) return;
    const { index: de } = r.source;
    const { index: para } = r.destination;
    mudarEtapas((x) => moverEtapa(x, de, para));
  };

  function excluir(e: EtapaDoRascunho) {
    if (!mudarEtapas) return;
    // A etapa criada agora some com as atividades que ganhou; a salva só vai para a lista de exclusões.
    if (e.nova) mudar((l) => l.filter((a) => a.etapaId !== e.id));
    mudarEtapas((x) => excluirEtapa(x, e.id));
  }

  const coluna = (e: EtapaDoRascunho, i: number, alca?: Alca) => (
    <ColunaDaEtapa
      etapa={e}
      inicial={i === 0}
      alca={alca}
      daEtapa={atividadesDaEtapa(atividades, e.id)}
      todas={atividades}
      aoNova={() => setNovaEm({ id: e.id, name: e.nome })}
      aoAbrir={setEditando}
      aoMover={(id, passo) => mudar((l) => trocarDeLugar(l, id, passo))}
      aoRemover={(id) => mudar((l) => removerAtividade(l, id))}
      edicao={
        podeEditar
          ? {
              abertaAqui: lapisEm === e.id,
              aoLapis: () => setLapisEm((v) => (v === e.id ? null : e.id)),
              aoFecharLapis: () => setLapisEm(null),
              aoSalvarLapis: (v) => {
                mudarEtapas?.((x) => editarEtapa(x, e.id, v));
                setLapisEm(null);
              },
              aoExcluir: () => (e.nova ? setExcluindo(e) : excluir(e)),
            }
          : undefined
      }
    />
  );

  return (
    <div className="flex h-full flex-col">
      <SeloDoModelo temSalvas={temSalvas} />
      <DragDropContext onDragEnd={aoSoltar}>
        <Droppable
          droppableId="etapas"
          direction="horizontal"
          // A janela da origem usa `transform`: a coluna arrastada é desenhada fora dela.
          renderClone={(prov, _snap, r) =>
            createPortal(
              <div
                ref={prov.innerRef}
                {...prov.draggableProps}
                style={{ ...prov.draggableProps.style, zIndex: 1300 }}
              >
                {coluna(abertas[r.source.index]!, r.source.index, prov.dragHandleProps)}
              </div>,
              document.body,
            )
          }
        >
          {(prov) => (
            <div
              ref={prov.innerRef}
              {...prov.droppableProps}
              className="flex min-h-0 flex-1 [scrollbar-width:thin] gap-2.5 overflow-x-auto pb-3"
            >
              {abertas.map((e, i) => (
                <Draggable key={e.id} draggableId={e.id} index={i} isDragDisabled={!podeEditar}>
                  {(p) => (
                    <div ref={p.innerRef} {...p.draggableProps} className="shrink-0">
                      {coluna(e, i, p.dragHandleProps)}
                    </div>
                  )}
                </Draggable>
              ))}
              {prov.placeholder}
              {podeEditar ? (
                <NovaEtapa aoCriar={() => mudarEtapas?.((x) => criarEtapaProvisoria(x))} />
              ) : null}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {novaEm ? (
        <JanelaNovaAtividade
          aberta
          etapa={novaEm}
          aoFechar={() => setNovaEm(null)}
          aoContinuar={(nova) => {
            mudar((l) => adicionarAtividade(l, nova));
            setNovaEm(null);
            setEditando(nova.id);
          }}
        />
      ) : null}
      {editando ? (
        <JanelaConfiguracoesDeAtividades
          aberta
          etapas={abertas.map((e) => ({ id: e.id, name: e.nome }))}
          atividades={atividades}
          escolhidaId={editando}
          campos={config.campos.map((c) => ({ chave: c.campo, rotulo: c.rotulo }))}
          aoEscolher={setEditando}
          aoAtualizar={(id, m) => mudar((l) => atualizarAtividade(l, id, m))}
          aoNova={(etapaId) => {
            const etapa = abertas.find((e) => e.id === etapaId);
            setEditando(null);
            if (etapa) setNovaEm({ id: etapa.id, name: etapa.nome });
          }}
          aoFechar={() => setEditando(null)}
        />
      ) : null}
      <AlertDialog open={excluindo !== null} onOpenChange={(a) => !a && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Deletar etapa")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Tem certeza que deseja excluir esta etapa em rascunho?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (excluindo) excluir(excluindo);
                setExcluindo(null);
              }}
            >
              {t("Confirmar")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SeloDoModelo({ temSalvas }: { temSalvas: boolean }) {
  const t = useT();
  return (
    <div className="flex h-8 shrink-0 items-center justify-end gap-2 pb-2 text-casca-texto">
      <LayoutPanelLeft size={14} aria-hidden />
      {temSalvas ? (
        <DicaEscura texto={t("As etapas e atividades desta origem foram customizadas.")}>
          <span
            role="img"
            aria-label={t("Origem customizada")}
            className="text-(--escale-ponto-atencao)"
          >
            <TriangleAlert size={13} aria-hidden />
          </span>
        </DicaEscura>
      ) : null}
      <span className="text-[10px] font-semibold tracking-[0.2em] uppercase">
        {t(rotuloDoModelo(temSalvas))}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("Opções do modelo")}
            className="grid size-6 place-items-center rounded-[4px] hover:bg-casca-raia"
          >
            <EllipsisVertical size={16} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={CAIXA_DO_MENU}>
          <DropdownMenuItem disabled title={t("Em breve")} className={ITEM_DO_MENU}>
            <LayoutPanelLeft size={14} aria-hidden />
            {t("Escolher um modelo")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled title={t("Em breve")} className={ITEM_DO_MENU}>
            <Share2 size={14} aria-hidden />
            {t("Compartilhar modelo")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface EdicaoDaColuna {
  abertaAqui: boolean;
  aoLapis: () => void;
  aoFecharLapis: () => void;
  aoSalvarLapis: (v: { nome: string; descricao: string }) => void;
  aoExcluir: () => void;
}

function ColunaDaEtapa({
  etapa,
  inicial,
  alca,
  daEtapa,
  todas,
  aoNova,
  aoAbrir,
  aoMover,
  aoRemover,
  edicao,
}: {
  etapa: EtapaDoRascunho;
  inicial: boolean;
  alca?: Alca;
  daEtapa: AtividadeDoPlaybook[];
  todas: Lista;
  aoNova: () => void;
  aoAbrir: (id: string) => void;
  aoMover: (id: string, passo: -1 | 1) => void;
  aoRemover: (id: string) => void;
  edicao?: EdicaoDaColuna;
}) {
  const t = useT();
  const [aberta, setAberta] = useState(true);
  const [todasVisiveis, setTodasVisiveis] = useState(false);
  const total = daEtapa.length;
  const mostradas = todasVisiveis ? daEtapa : daEtapa.slice(0, VISIVEIS);
  const titulo = (
    <h4 className="min-w-0 flex-1 truncate text-[12px] font-semibold text-casca-texto">
      {etapa.nome}
    </h4>
  );

  return (
    <section
      aria-label={etapa.nome}
      className="relative flex h-full min-h-[340px] w-[227px] shrink-0 flex-col rounded-[4px] bg-casca-busca"
    >
      <header
        {...alca}
        className="group flex h-[38px] shrink-0 items-center gap-2 rounded-t-[4px] bg-casca-raia px-3"
      >
        {inicial ? (
          <span
            role="img"
            aria-label={t("Etapa inicial")}
            className="grid size-[18px] place-items-center rounded-full bg-[#DCFCE7] text-[#16A34A]"
          >
            <Flag size={11} aria-hidden />
          </span>
        ) : null}
        {etapa.descricao ? (
          <DicaEscura texto={`${etapa.nome} — ${etapa.descricao}`}>{titulo}</DicaEscura>
        ) : (
          titulo
        )}
        {edicao ? (
          <div className="flex items-center gap-2 text-casca-texto opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <DicaEscura texto={t("Deletar etapa")}>
              <button
                type="button"
                aria-label={t("Deletar etapa")}
                onClick={edicao.aoExcluir}
                className="grid size-5 place-items-center"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </DicaEscura>
            <DicaEscura texto={t("Editar etapa")}>
              <button
                type="button"
                aria-label={t("Editar etapa")}
                {...{ [MARCA_DO_LAPIS]: "" }}
                onClick={edicao.aoLapis}
                className="grid size-5 place-items-center"
              >
                <Pencil size={12} aria-hidden />
              </button>
            </DicaEscura>
          </div>
        ) : null}
      </header>
      {edicao?.abertaAqui ? (
        <JanelaDaEtapa
          nome={etapa.nome}
          descricao={etapa.descricao}
          aoSalvar={edicao.aoSalvarLapis}
          aoFechar={edicao.aoFecharLapis}
        />
      ) : null}
      {total === 0 ? (
        <p className="mx-3 border-b border-casca-borda py-3 text-[11px] font-semibold text-casca-texto">
          {t("Nenhuma atividade nessa etapa")}
        </p>
      ) : (
        <button
          type="button"
          aria-expanded={aberta}
          onClick={() => setAberta((a) => !a)}
          className="mx-3 flex items-center gap-2 border-b border-casca-borda py-3 text-left text-[11px] font-semibold text-casca-texto"
        >
          <ListChecks size={13} aria-hidden className="text-casca-marca" />
          {`${total} ${t("Atividades nessa etapa")}`}
        </button>
      )}
      {aberta && total > 0 ? (
        <ul className="py-1">
          {mostradas.map((a) => (
            <ItemDoPlaybook
              key={a.id}
              atividade={a}
              podeSubir={vizinhaDeMesmoPrazo(todas, a.id, -1) !== null}
              podeDescer={vizinhaDeMesmoPrazo(todas, a.id, 1) !== null}
              aoAbrir={() => aoAbrir(a.id)}
              aoSubir={() => aoMover(a.id, -1)}
              aoDescer={() => aoMover(a.id, 1)}
              aoRemover={() => aoRemover(a.id)}
            />
          ))}
        </ul>
      ) : null}
      {aberta && total > VISIVEIS ? (
        <button
          type="button"
          onClick={() => setTodasVisiveis((v) => !v)}
          className="mx-3 flex items-center gap-1 py-1 text-[11px] font-semibold text-casca-marca"
        >
          {todasVisiveis ? t("Ver menos") : t("Ver mais")}
          <ChevronDown size={13} aria-hidden className={cn(todasVisiveis && "rotate-180")} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={aoNova}
        className="mx-auto mt-4 flex items-center gap-1 text-[12px] font-medium text-casca-novo hover:underline"
      >
        <Plus size={13} aria-hidden />
        {t("Nova atividade")}
      </button>
    </section>
  );
}
