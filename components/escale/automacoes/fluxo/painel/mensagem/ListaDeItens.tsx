"use client";
import { useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { fraseDoFluxo } from "@/lib/escale/automacoes/fluxo/frases";
import {
  novoIdDeBotao,
  novoItem,
  recusaDeAdicionar,
  type ItemDaSequencia,
  type TipoDeItem,
} from "@/lib/escale/automacoes/fluxo/sequencia";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "@/lib/ui/icons-da-casca";

import { ItemDeMidia, ItemDePausa } from "./ItemDeMidiaEPausa";
import { ItemDeTexto } from "./ItemDeTexto";

const TITULO: Record<TipoDeItem, string> = { texto: "Texto", midia: "Áudio ou arquivo", pausa: "Pausa" };

/**
 * A SEQUÊNCIA DA MENSAGEM (07-027): os itens em cartões (texto, mídia, pausa), reordenáveis com setas, e o menu
 * "+ Adicionar" ao fim. A pausa não vai no começo, no fim nem duas seguidas (as frases da Clint).
 */
export function ListaDeItens({
  itens,
  aoMudar,
}: {
  itens: readonly ItemDaSequencia[];
  aoMudar: (itens: ItemDaSequencia[]) => void;
}) {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const ultimoTexto = itens.reduce((ultimo, item, i) => (item.tipo === "texto" ? i : ultimo), -1);

  function adicionar(tipo: TipoDeItem) {
    setMenu(false);
    const recusa = recusaDeAdicionar(itens, tipo);
    setAviso(recusa);
    if (!recusa) aoMudar([...itens, novoItem(tipo)]);
  }
  function mover(i: number, para: number) {
    if (para < 0 || para >= itens.length) return;
    const copia = [...itens];
    const [item] = copia.splice(i, 1);
    copia.splice(para, 0, item!);
    aoMudar(copia);
  }
  const trocar = (i: number, item: ItemDaSequencia) => aoMudar(itens.map((x, j) => (j === i ? item : x)));

  return (
    <div className="flex flex-col gap-3" data-testid="sequencia-da-mensagem">
      {itens.map((item, i) => (
        <div key={item.chave} className="flex flex-col gap-2 rounded-lg border border-casca-divisoria p-3" data-testid={`item-${i}`}>
          <div className="flex items-center gap-1">
            <span className="flex-1 text-[12px] font-semibold text-casca-texto-2">{t(TITULO[item.tipo])}</span>
            <button type="button" aria-label={`${t("Subir item")} ${i + 1}`} disabled={i === 0} onClick={() => mover(i, i - 1)} className="grid size-6 place-items-center rounded text-casca-suave hover:bg-casca-raia disabled:opacity-40">
              <ChevronUp size={14} aria-hidden />
            </button>
            <button type="button" aria-label={`${t("Descer item")} ${i + 1}`} disabled={i === itens.length - 1} onClick={() => mover(i, i + 1)} className="grid size-6 place-items-center rounded text-casca-suave hover:bg-casca-raia disabled:opacity-40">
              <ChevronDown size={14} aria-hidden />
            </button>
            <button type="button" aria-label={`${t("Remover item")} ${i + 1}`} onClick={() => aoMudar(itens.filter((_, j) => j !== i))} className="grid size-6 place-items-center rounded text-casca-suave hover:text-casca-alerta">
              <Trash2 size={14} aria-hidden />
            </button>
          </div>
          {item.tipo === "texto" ? (
            <ItemDeTexto item={item} comBotoes={i === ultimoTexto} novoIdDeBotao={() => novoIdDeBotao(itens)} aoMudar={(novo) => trocar(i, novo)} />
          ) : item.tipo === "midia" ? (
            <ItemDeMidia item={item} aoMudar={(novo) => trocar(i, novo)} />
          ) : (
            <ItemDePausa item={item} aoMudar={(novo) => trocar(i, novo)} />
          )}
        </div>
      ))}
      <Popover open={menu} onOpenChange={setMenu}>
        <PopoverTrigger asChild>
          <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-casca-divisoria text-[13px] font-medium text-casca-marca-forte hover:bg-casca-raia">
            <Plus size={14} aria-hidden />
            {t("Adicionar")}
          </button>
        </PopoverTrigger>
        <PainelSuspenso aria-label={t("Adicionar")} sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-1">
          {(["texto", "midia", "pausa"] as const).map((tipo) => (
            <button key={tipo} type="button" onClick={() => adicionar(tipo)} className="flex w-full rounded-[2px] px-3 py-2 text-left text-[13px] text-casca-texto hover:bg-(--escale-seletor-hover)">
              {t(TITULO[tipo])}
            </button>
          ))}
        </PainelSuspenso>
      </Popover>
      {aviso ? (
        <p role="alert" className="text-[12px] text-casca-alerta">
          {fraseDoFluxo(aviso, t)}
        </p>
      ) : null}
    </div>
  );
}
