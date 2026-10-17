"use client";
import { Fragment, useId, useMemo, useState, type KeyboardEvent } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { filtrarOpcoes } from "@/lib/ui/filtrar-opcoes";
import { ChevronDown, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O SELETOR DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * Substitui, dentro da casca, o select nativo e o `SearchableSelect`. O visual
 * é o dos selects da Clint: gatilho de ~44px com fundo #EFF3FF, sem borda,
 * canto de 4px, texto 13px; lista no painel da casca com itens de 11px e 34px
 * de altura mínima, destacados na cor clara da marca (o `purple.subtle` da
 * Clint). A busca aparece a partir de 8 opções — o mesmo corte do
 * `SearchableSelect` do original — e procura por palavras, sem acento.
 *
 * Papéis: o gatilho é `combobox`; o painel, `listbox` com `option`s, e cada
 * grupo consecutivo vira `group`. Teclado: ↓ abre, ↑/↓ andam pulando as
 * desabilitadas, Enter escolhe, Esc fecha.
 *
 * Os rótulos (`rotulo`, `grupo`, `vazio`) chegam traduzidos de quem chama.
 */
export type OpcaoDoSeletor<V extends string> = {
  valor: V;
  rotulo: string;
  grupo?: string;
  desabilitada?: boolean;
};

export type SeletorDaCascaProps<V extends string> = {
  valor: V | "";
  opcoes: OpcaoDoSeletor<V>[];
  aoMudar: (v: V | "") => void;
  "aria-label": string;
  vazio?: string;
  buscaAPartirDe?: number;
  /** Fase 1E: o gatilho desligado (a origem da importação, que é a do quadro). */
  desabilitado?: boolean;
  /** Fase 1E: a dica do gatilho (o motivo de estar desligado). */
  dica?: string;
  /** Fase 1E: ajuste do gatilho (a janela de importar usa 32px no lugar dos 44px). */
  className?: string;
};

/** O mesmo corte do `SearchableSelect` do original (`MINIMO_PARA_BUSCA`). */
const BUSCA_A_PARTIR_DE = 8;

type Linha<V extends string> = { valor: V | ""; rotulo: string; grupo?: string; desabilitada: boolean };
type Bloco<V extends string> = { grupo?: string; itens: { linha: Linha<V>; indice: number }[] };

function montarLinhas<V extends string>(
  opcoes: readonly OpcaoDoSeletor<V>[],
  busca: string,
  vazio: string | undefined,
): Linha<V>[] {
  const todas: Linha<V>[] = opcoes.map((o) => ({
    valor: o.valor,
    rotulo: o.rotulo,
    grupo: o.grupo,
    desabilitada: o.desabilitada === true,
  }));
  const termo = busca.trim();
  if (termo) {
    const achadas = filtrarOpcoes(
      todas.map((linha, i) => ({ value: String(i), label: linha.rotulo })),
      termo,
    );
    return achadas.flatMap((a) => {
      const linha = todas[Number(a.value)];
      return linha ? [linha] : [];
    });
  }
  return vazio === undefined ? todas : [{ valor: "", rotulo: vazio, desabilitada: false }, ...todas];
}

function proximaHabilitada<V extends string>(linhas: readonly Linha<V>[], de: number, passo: 1 | -1): number {
  for (let i = de; i >= 0 && i < linhas.length; i += passo) {
    if (linhas[i]?.desabilitada === false) return i;
  }
  return -1;
}

function emBlocos<V extends string>(linhas: readonly Linha<V>[]): Bloco<V>[] {
  const blocos: Bloco<V>[] = [];
  linhas.forEach((linha, indice) => {
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.grupo === linha.grupo) ultimo.itens.push({ linha, indice });
    else blocos.push({ grupo: linha.grupo, itens: [{ linha, indice }] });
  });
  return blocos;
}

export function SeletorDaCasca<V extends string>({
  valor,
  opcoes,
  aoMudar,
  "aria-label": rotuloAcessivel,
  vazio,
  buscaAPartirDe = BUSCA_A_PARTIR_DE,
  desabilitado = false,
  dica,
  className,
}: SeletorDaCascaProps<V>) {
  const t = useT();
  const id = useId();
  const listaId = `${id}-lista`;
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(-1);

  const comBusca = opcoes.length >= buscaAPartirDe;
  const linhas = useMemo(() => montarLinhas(opcoes, busca, vazio), [opcoes, busca, vazio]);
  const atual = opcoes.find((o) => o.valor === valor);
  const textoDoGatilho = atual ? atual.rotulo : (vazio ?? t("Selecione…"));
  const idDoAtivo = linhas[ativo] ? `${id}-op-${ativo}` : undefined;

  function mudarAberto(proximo: boolean) {
    setAberto(proximo);
    if (!proximo) return;
    setBusca("");
    const iniciais = montarLinhas(opcoes, "", vazio);
    const selecionada = iniciais.findIndex((l) => l.valor === valor && !l.desabilitada);
    setAtivo(selecionada >= 0 ? selecionada : proximaHabilitada(iniciais, 0, 1));
  }

  function escolher(linha: Linha<V> | undefined) {
    if (!linha || linha.desabilitada) return;
    aoMudar(linha.valor);
    setAberto(false);
  }

  function mover(passo: 1 | -1) {
    const proximo = proximaHabilitada(linhas, ativo + passo, passo);
    if (proximo < 0) return;
    setAtivo(proximo);
    document.getElementById(`${id}-op-${proximo}`)?.scrollIntoView?.({ block: "nearest" });
  }

  function teclar(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      mover(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      escolher(linhas[ativo]);
    }
  }

  function buscar(texto: string) {
    setBusca(texto);
    setAtivo(proximaHabilitada(montarLinhas(opcoes, texto, vazio), 0, 1));
  }

  return (
    <Popover open={aberto} onOpenChange={mudarAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={rotuloAcessivel}
          disabled={desabilitado}
          title={dica}
          aria-haspopup="listbox"
          aria-expanded={aberto}
          aria-controls={aberto ? listaId : undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !aberto) {
              e.preventDefault();
              mudarAberto(true);
            }
          }}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-[4px] bg-casca-raia px-3 text-left text-[13px] transition-colors duration-fast ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca",
            atual ? "text-casca-texto" : "text-casca-suave",
            desabilitado && "cursor-not-allowed opacity-70",
            className,
          )}
        >
          <span className="truncate">{textoDoGatilho}</span>
          <ChevronDown aria-hidden className="size-3.5 shrink-0 text-casca-chevron" />
        </button>
      </PopoverTrigger>
      <PainelSuspenso className="w-(--radix-popover-trigger-width) min-w-[200px] p-1" onKeyDown={teclar}>
        {comBusca ? (
          <div className="relative mb-1">
            <input
              type="search"
              value={busca}
              onChange={(e) => buscar(e.target.value)}
              placeholder={t("Buscar…")}
              aria-label={t("Buscar…")}
              aria-controls={listaId}
              aria-activedescendant={idDoAtivo}
              className="h-8 w-full rounded-[4px] bg-casca-busca pl-2.5 pr-8 text-[12px] text-casca-texto placeholder:text-casca-suave focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca"
            />
            <Search
              aria-hidden
              className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-casca-suave"
            />
          </div>
        ) : null}
        <div
          id={listaId}
          role="listbox"
          aria-label={rotuloAcessivel}
          tabIndex={comBusca ? -1 : 0}
          aria-activedescendant={comBusca ? undefined : idDoAtivo}
          className="max-h-72 overflow-y-auto focus-visible:outline-hidden"
        >
          {emBlocos(linhas).map((bloco, b) => {
            const itens = bloco.itens.map(({ linha, indice }) => (
              <div
                key={`${linha.valor}-${indice}`}
                id={`${id}-op-${indice}`}
                role="option"
                aria-selected={linha.valor === valor}
                aria-disabled={linha.desabilitada || undefined}
                onMouseEnter={() => {
                  if (!linha.desabilitada) setAtivo(indice);
                }}
                onClick={() => escolher(linha)}
                className={cn(
                  "flex min-h-[34px] items-center rounded-[2px] px-3 text-[11px] text-casca-texto",
                  indice === ativo && "bg-casca-marca-suave text-casca-marca",
                  linha.desabilitada ? "cursor-not-allowed opacity-30" : "cursor-pointer",
                )}
              >
                <span className="truncate">{linha.rotulo}</span>
              </div>
            ));
            return bloco.grupo ? (
              <div key={`g-${b}`} role="group" aria-label={bloco.grupo}>
                <div
                  aria-hidden
                  className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-casca-suave"
                >
                  {bloco.grupo}
                </div>
                {itens}
              </div>
            ) : (
              <Fragment key={`g-${b}`}>{itens}</Fragment>
            );
          })}
        </div>
        {linhas.length === 0 ? <p className="px-3 py-2 text-[11px] text-casca-suave">{t("Nenhum resultado")}</p> : null}
      </PainelSuspenso>
    </Popover>
  );
}
