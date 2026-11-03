"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { tomDaTag } from "@/lib/escale/tags/paleta";
import { ChevronDown, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export type OpcaoDeTag = { tag: string; cor: string | null };

function ChipDaTag({ tag, cor }: OpcaoDeTag) {
  const tom = tomDaTag(cor, tag);
  return (
    <span
      className="inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[12px]"
      style={{ backgroundColor: tom.fundo, color: tom.texto }}
    >
      {tag}
    </span>
  );
}

/**
 * O SELETOR DE TAGS DA CLINT (print de 03/11/2026, "Tag adicionada ao contato"): campo branco com o
 * texto "Adicione ou crie uma tag", seta à direita e contorno na cor da marca quando aberto; a lista
 * tem uma caixinha e a tag no tom dela, e continua aberta ao marcar. As escolhidas viram chips
 * coloridos no campo. Digitar filtra; o que não existe aparece como tag nova (Enter ou clique).
 */
export function SeletorDeTagsDaCasca({
  valores,
  opcoes,
  aoMudar,
  "aria-label": rotulo,
  placeholder,
}: {
  valores: readonly string[];
  opcoes: readonly OpcaoDeTag[];
  aoMudar: (valores: string[]) => void;
  "aria-label": string;
  placeholder: string;
}) {
  const t = useT();
  const id = useId();
  const ancora = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const texto = busca.trim();
  const alvo = texto.toLowerCase();
  const corDe = (tag: string) => opcoes.find((o) => o.tag === tag)?.cor ?? null;
  const existentes = opcoes.filter((o) => o.tag.toLowerCase().includes(alvo));
  const ehNova = texto !== "" && !opcoes.some((o) => o.tag.toLowerCase() === alvo);
  const lista: OpcaoDeTag[] = [...(ehNova ? [{ tag: texto, cor: null }] : []), ...existentes];
  const marcada = (tag: string) => valores.some((v) => v.toLowerCase() === tag.toLowerCase());

  function alternar(tag: string) {
    aoMudar(marcada(tag) ? valores.filter((v) => v.toLowerCase() !== tag.toLowerCase()) : [...valores, tag]);
    setBusca("");
  }

  function teclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && texto !== "") {
      e.preventDefault();
      const primeira = lista[0];
      if (primeira) alternar(primeira.tag);
    } else if (e.key === "Backspace" && busca === "" && valores.length > 0) {
      aoMudar(valores.slice(0, -1));
    }
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverAnchor asChild>
        <div
          ref={ancora}
          onClick={() => setAberto(true)}
          className={cn(
            "flex min-h-[44px] w-full items-center gap-2 rounded-[5px] border bg-casca-superficie py-1.5 pr-3 pl-3",
            aberto ? "border-casca-marca" : "border-casca-borda",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {valores.map((v) => (
              <span key={v} className="inline-flex items-center gap-1">
                <ChipDaTag tag={v} cor={corDe(v)} />
                <button
                  type="button"
                  aria-label={`${t("Remover")} ${v}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    aoMudar(valores.filter((x) => x !== v));
                  }}
                  className="grid size-4 place-items-center rounded-full text-casca-suave hover:text-casca-texto"
                >
                  <X size={10} strokeWidth={3} aria-hidden />
                </button>
              </span>
            ))}
            <input
              role="combobox"
              aria-label={rotulo}
              aria-expanded={aberto}
              aria-controls={aberto ? `${id}-lista` : undefined}
              aria-autocomplete="list"
              value={busca}
              placeholder={valores.length === 0 ? placeholder : undefined}
              onChange={(e) => {
                setBusca(e.target.value);
                setAberto(true);
              }}
              onKeyDown={teclar}
              className="min-w-[2ch] flex-1 bg-transparent text-[14px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            />
          </div>
          <ChevronDown size={14} aria-hidden className={cn("shrink-0 text-casca-chevron", aberto && "rotate-180")} />
        </div>
      </PopoverAnchor>
      <PainelSuspenso
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (ancora.current?.contains(e.target as Node)) e.preventDefault();
        }}
        className="w-(--radix-popover-trigger-width) p-1"
      >
        <div id={`${id}-lista`} role="listbox" aria-multiselectable aria-label={rotulo} className="max-h-72 overflow-y-auto">
          {lista.length === 0 ? (
            <p className="py-2 text-center text-[12px] text-casca-meta">{t("Nenhum resultado")}</p>
          ) : (
            lista.map((o) => (
              <div
                key={o.tag}
                role="option"
                aria-selected={marcada(o.tag)}
                aria-label={o.tag}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => alternar(o.tag)}
                className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[2px] px-3 hover:bg-(--escale-seletor-hover)"
              >
                <input type="checkbox" readOnly tabIndex={-1} checked={marcada(o.tag)} aria-hidden className="size-4" />
                <ChipDaTag tag={o.tag} cor={o.cor} />
              </div>
            ))
          )}
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
