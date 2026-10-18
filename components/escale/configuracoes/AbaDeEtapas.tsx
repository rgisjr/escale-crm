"use client";
import { useState } from "react";

import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
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
  Plus,
  Share2,
  TriangleAlert,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ItemDoPlaybook } from "./playbook/ItemDoPlaybook";
import { JanelaConfiguracoesDeAtividades } from "./playbook/JanelaConfiguracoesDeAtividades";
import { JanelaNovaAtividade } from "./playbook/JanelaNovaAtividade";

/** Quantas atividades a coluna mostra antes do "Ver mais" (Clint). */
const VISIVEIS = 6;

type Lista = readonly AtividadeDoPlaybook[];

/**
 * A ABA "ETAPAS E ATIVIDADES" (fork Escale, Fase 1I; D10, P8; prints F20, F21
 * e 030). Uma coluna por etapa aberta com o playbook dela. Tudo mexe só no
 * RASCUNHO, que a `JanelaDaOrigem` guarda e grava no "Salvar na origem". Editar
 * etapas fica no original (Q13); os modelos de playbook ficam "Em breve" (Q12).
 */
export function AbaDeEtapas({
  config,
  atividades,
  temSalvas,
  mudar,
}: {
  config: ConfiguracoesDaOrigem;
  atividades: Lista;
  temSalvas: boolean;
  mudar: (f: (lista: Lista) => Lista) => void;
}) {
  const abertas = config.etapas.filter((e) => !e.is_won && !e.is_lost);
  const [novaEm, setNovaEm] = useState<{ id: string; name: string } | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <SeloDoModelo temSalvas={temSalvas} />
      <div className="flex min-h-0 flex-1 [scrollbar-width:thin] gap-2.5 overflow-x-auto pb-3">
        {abertas.map((etapa, i) => (
          <ColunaDaEtapa
            key={etapa.id}
            etapa={etapa}
            inicial={i === 0}
            daEtapa={atividadesDaEtapa(atividades, etapa.id)}
            todas={atividades}
            aoNova={() => setNovaEm({ id: etapa.id, name: etapa.name })}
            aoAbrir={setEditando}
            aoMover={(id, passo) => mudar((l) => trocarDeLugar(l, id, passo))}
            aoRemover={(id) => mudar((l) => removerAtividade(l, id))}
          />
        ))}
      </div>
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
          etapas={abertas}
          atividades={atividades}
          escolhidaId={editando}
          campos={config.campos.map((c) => ({ chave: c.campo, rotulo: c.rotulo }))}
          aoEscolher={setEditando}
          aoAtualizar={(id, m) => mudar((l) => atualizarAtividade(l, id, m))}
          aoNova={(etapaId) => {
            const etapa = abertas.find((e) => e.id === etapaId);
            setEditando(null);
            if (etapa) setNovaEm({ id: etapa.id, name: etapa.name });
          }}
          aoFechar={() => setEditando(null)}
        />
      ) : null}
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

function ColunaDaEtapa({
  etapa,
  inicial,
  daEtapa,
  todas,
  aoNova,
  aoAbrir,
  aoMover,
  aoRemover,
}: {
  etapa: { id: string; name: string };
  inicial: boolean;
  daEtapa: AtividadeDoPlaybook[];
  todas: Lista;
  aoNova: () => void;
  aoAbrir: (id: string) => void;
  aoMover: (id: string, passo: -1 | 1) => void;
  aoRemover: (id: string) => void;
}) {
  const t = useT();
  const [aberta, setAberta] = useState(true);
  const [todasVisiveis, setTodasVisiveis] = useState(false);
  const total = daEtapa.length;
  const mostradas = todasVisiveis ? daEtapa : daEtapa.slice(0, VISIVEIS);

  return (
    <section
      aria-label={etapa.name}
      className="flex h-full min-h-[340px] w-[227px] shrink-0 flex-col rounded-[4px] bg-casca-busca"
    >
      <header className="flex h-[38px] shrink-0 items-center gap-2 rounded-t-[4px] bg-casca-raia px-3">
        {inicial ? (
          <span
            role="img"
            aria-label={t("Etapa inicial")}
            className="grid size-[18px] place-items-center rounded-full bg-[#DCFCE7] text-[#16A34A]"
          >
            <Flag size={11} aria-hidden />
          </span>
        ) : null}
        <h4 className="truncate text-[12px] font-semibold text-casca-texto">{etapa.name}</h4>
      </header>
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
