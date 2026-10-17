"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { filtrarOpcoes } from "@/lib/ui/filtrar-opcoes";
import { ChevronDown, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O SELETOR COM CHIPS DA CLINT (Motivo de Perda na variante superior, P07 e
 * P08 de docs/clint/prints-1f; react-select `isMulti`). As escolhidas viram
 * chips cinza com "×"; à direita, o "×" que limpa tudo e a seta. Digitar filtra
 * a lista, que mostra só as que faltam; sem nenhuma, "Nenhum resultado".
 * Aberto, o contorno fica azul (o padrão do react-select que a Clint mantém).
 */
export function SeletorDeChipsDaCasca({
  valores,
  opcoes,
  aoMudar,
  "aria-label": rotulo,
  desabilitado = false,
}: {
  valores: readonly string[];
  opcoes: readonly string[];
  aoMudar: (valores: string[]) => void;
  "aria-label": string;
  desabilitado?: boolean;
}) {
  const t = useT();
  const id = useId();
  const ancora = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(0);
  const faltam = opcoes.filter((o) => !valores.includes(o));
  const lista = busca.trim()
    ? filtrarOpcoes(
        faltam.map((o) => ({ value: o, label: o })),
        busca,
      ).map((a) => a.value)
    : faltam;
  const listaId = `${id}-lista`;

  function escolher(o: string | undefined) {
    if (!o) return;
    aoMudar([...valores, o]);
    setBusca("");
    setAtivo(0);
    setAberto(false);
  }

  function teclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAberto(true);
      setAtivo((i) => Math.min(i + 1, Math.max(lista.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && aberto) {
      e.preventDefault();
      escolher(lista[ativo]);
    } else if (e.key === "Backspace" && busca === "" && valores.length > 0) {
      aoMudar(valores.slice(0, -1));
    }
  }

  return (
    <Popover open={aberto && !desabilitado} onOpenChange={setAberto}>
      <PopoverAnchor asChild>
        <div
          ref={ancora}
          onClick={() => !desabilitado && setAberto(true)}
          className={cn(
            "flex min-h-[44px] w-full items-center gap-2 rounded-[5px] border bg-casca-raia py-1.5 pr-2 pl-2.5",
            aberto
              ? "border-(--escale-seletor-foco) shadow-[0_0_0_1px_var(--escale-seletor-foco)]"
              : "border-transparent",
            desabilitado && "cursor-not-allowed opacity-60",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {valores.map((v) => (
              <span
                key={v}
                data-chip=""
                className="flex items-center gap-1 rounded-[2px] bg-(--escale-chip) py-0.5 pr-1 pl-1.5 text-[10px] text-casca-texto"
              >
                {v}
                {desabilitado ? null : (
                  <button
                    type="button"
                    aria-label={`${t("Remover")} ${v}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      aoMudar(valores.filter((x) => x !== v));
                    }}
                    className="grid size-3.5 place-items-center rounded-[2px] text-casca-texto hover:bg-casca-marca-suave"
                  >
                    <X size={10} strokeWidth={3} aria-hidden />
                  </button>
                )}
              </span>
            ))}
            <input
              role="combobox"
              aria-label={rotulo}
              aria-expanded={aberto}
              aria-controls={aberto ? listaId : undefined}
              aria-autocomplete="list"
              disabled={desabilitado}
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setAtivo(0);
                setAberto(true);
              }}
              onKeyDown={teclar}
              className="min-w-[2ch] flex-1 bg-transparent text-[11px] text-casca-texto outline-hidden disabled:cursor-not-allowed"
            />
          </div>
          {valores.length > 0 && !desabilitado ? (
            <button
              type="button"
              aria-label={t("Limpar tudo")}
              onClick={(e) => {
                e.stopPropagation();
                aoMudar([]);
              }}
              className="text-casca-chevron hover:text-casca-texto"
            >
              <X size={14} aria-hidden />
            </button>
          ) : null}
          <ChevronDown size={14} aria-hidden className="shrink-0 text-casca-chevron" />
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
        <div id={listaId} role="listbox" aria-label={rotulo} className="max-h-60 overflow-y-auto">
          {lista.length === 0 ? (
            <p className="py-2 text-center text-[12px] text-casca-meta">{t("Nenhum resultado")}</p>
          ) : (
            lista.map((o, i) => (
              <div
                key={o}
                role="option"
                aria-selected={false}
                onMouseEnter={() => setAtivo(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(o)}
                className={cn(
                  "flex min-h-[34px] cursor-pointer items-center rounded-[2px] px-3 text-[11px] text-casca-texto",
                  i === ativo && "bg-(--escale-seletor-hover)",
                )}
              >
                {o}
              </div>
            ))
          )}
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
