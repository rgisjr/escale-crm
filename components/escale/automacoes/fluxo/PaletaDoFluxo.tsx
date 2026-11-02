"use client";
import { useState } from "react";

import { DND_DA_AUTOMACAO } from "@/app/app/webhooks/automacoes/[id]/_components/PaletaDaAutomacao";
import { useT } from "@/hooks/i18n/useT";
import {
  ROTULO_DA_SECAO,
  SECOES_DA_PALETA,
  filtrarPaleta,
  tipoDoNo,
  type ItemDaPaleta,
  type PassoDaPaleta,
} from "@/lib/escale/automacoes/fluxo/paleta";
import { ChevronLeft, ChevronRight, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ICONE_DA_ACAO, VISUAL_DO_NO, type VisualDoNo } from "./visual-do-fluxo";

/** O visual de cada item da paleta: gatilho, condições e "Ações" têm o seu; os canais, o do tipo da ação. */
function visualDoItem(passo: PassoDaPaleta): { visual: VisualDoNo; Icone: VisualDoNo["icone"] } {
  if (passo === "gatilho") return { visual: VISUAL_DO_NO.gatilho, Icone: VISUAL_DO_NO.gatilho.icone };
  if (passo === "condicoes") return { visual: VISUAL_DO_NO.condicoes, Icone: VISUAL_DO_NO.condicoes.icone };
  if (passo === "acoes") return { visual: VISUAL_DO_NO.acoes, Icone: VISUAL_DO_NO.acoes.icone };
  const visual = VISUAL_DO_NO[tipoDoNo({ kind: "acao", acao: { type: passo } })];
  // FORK ESCALE · Fase 10B: o passo Instagram não está em `ICONE_DA_ACAO` (ele vem do desenho do tipo).
  if (passo === "send_instagram_message") return { visual, Icone: visual.icone };
  return { visual, Icone: ICONE_DA_ACAO[passo] };
}

/**
 * A PALETA "ADICIONAR PASSO" (07-013, 07-014, 07-015; D9): barra à direita,
 * 78 px fechada (só ícones) e 344 px aberta. Clicar põe o passo logo depois do
 * selecionado; arrastar solta onde cair.
 */
export function PaletaDoFluxo({
  aoEscolher,
  desligados = {},
}: {
  aoEscolher: (passo: PassoDaPaleta) => void;
  /** FORK ESCALE · Fase 10B: passos sem uso neste fluxo (o passo Instagram fora do gatilho de comentário), com a dica. */
  desligados?: Partial<Record<PassoDaPaleta, string>>;
}) {
  const t = useT();
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const itens = filtrarPaleta(busca, t);

  function arrastar(e: React.DragEvent, item: ItemDaPaleta) {
    if (desligados[item.passo]) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(DND_DA_AUTOMACAO, item.passo);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside
      data-testid="paleta-do-fluxo"
      className={cn(
        "flex shrink-0 flex-col border-l border-casca-divisoria bg-surface transition-[width] duration-300",
        aberta ? "w-[344px]" : "w-[78px]",
      )}
    >
      {!aberta ? (
        <>
          <button
            type="button"
            aria-label={t("Abrir paleta de passos")}
            onClick={() => setAberta(true)}
            className="mx-auto mt-4 grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <div className="mt-3 flex flex-col items-center gap-3 overflow-y-auto pb-4">
            {itens.map((item) => {
              const { visual, Icone } = visualDoItem(item.passo);
              return (
                <button
                  key={item.passo}
                  type="button"
                  title={desligados[item.passo] ? t(desligados[item.passo]!) : t(item.titulo)}
                  aria-label={t(item.titulo)}
                  aria-disabled={desligados[item.passo] ? true : undefined}
                  draggable={!desligados[item.passo]}
                  onDragStart={(e) => arrastar(e, item)}
                  onClick={() => !desligados[item.passo] && aoEscolher(item.passo)}
                  className={cn(
                    "grid size-10 place-items-center rounded-lg border border-casca-divisoria hover:bg-casca-raia",
                    desligados[item.passo] ? "cursor-not-allowed opacity-50" : "cursor-grab",
                  )}
                >
                  <Icone size={20} className={visual.texto} aria-hidden />
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-3 px-5 pt-4 pb-3">
            <button
              type="button"
              aria-label={t("Fechar paleta de passos")}
              onClick={() => setAberta(false)}
              className="grid size-7 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
            >
              <ChevronRight size={16} aria-hidden />
            </button>
            <div>
              <p className="text-[13px] font-medium text-casca-texto">{t("Adicionar passo")}</p>
              <p className="text-[12px] text-casca-suave">{t("Arraste para o canvas ou clique")}</p>
            </div>
          </div>
          <div className="relative mx-5">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={t("Buscar passo…")}
              aria-label={t("Buscar passo…")}
              className="h-8 w-full rounded-[4px] border-0 bg-casca-raia pr-8 pl-3 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
            />
            <Search size={14} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-casca-suave" aria-hidden />
          </div>
          <div className="mt-2 flex-1 overflow-y-auto pb-4">
            {itens.length === 0 ? (
              <p className="px-6 pt-4 text-[12px] text-casca-suave">{t("Sem resultados para “{busca}”").replace("{busca}", busca)}</p>
            ) : (
              SECOES_DA_PALETA.map((secao) => {
                const daSecao = itens.filter((i) => i.secao === secao);
                if (daSecao.length === 0) return null;
                return (
                  <section key={secao}>
                    <h2 className="px-6 pt-3 pb-1 text-[10px] font-medium tracking-wide text-casca-suave uppercase">
                      {t(ROTULO_DA_SECAO[secao])}
                    </h2>
                    {daSecao.map((item) => {
                      const { visual, Icone } = visualDoItem(item.passo);
                      return (
                        <button
                          key={item.passo}
                          type="button"
                          title={desligados[item.passo] ? t(desligados[item.passo]!) : undefined}
                          aria-disabled={desligados[item.passo] ? true : undefined}
                          draggable={!desligados[item.passo]}
                          onDragStart={(e) => arrastar(e, item)}
                          onClick={() => !desligados[item.passo] && aoEscolher(item.passo)}
                          className={cn(
                            "flex w-full items-center gap-3 px-6 py-2 text-left hover:bg-casca-raia",
                            desligados[item.passo] ? "cursor-not-allowed opacity-50" : "cursor-grab",
                          )}
                        >
                          <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-md", visual.fundo)}>
                            <Icone size={18} className={visual.texto} aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-medium text-casca-texto">{t(item.titulo)}</span>
                            <span className="block text-[12px] text-casca-suave">{t(item.descricao)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </section>
                );
              })
            )}
          </div>
        </>
      )}
    </aside>
  );
}
