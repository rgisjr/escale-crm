"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useEffect, useState } from "react";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import type { FiltroDasSugestoes } from "@/hooks/escale/useSugestoesDeMescla";
import { useT } from "@/hooks/i18n/useT";
import { ORDENS_DA_MESCLA, ROTULO_DA_ORDEM, ROTULO_DA_FAIXA, faixaDaConfianca, type Sugestao } from "@/lib/escale/mescla/regras";
import { ArrowUpDown, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FiltrosDaMescla } from "./FiltrosDaMescla";
import { SeloDaConfianca } from "./SeloDaConfianca";

const nomesDaSugestao = (s: Sugestao) =>
  s.contatos.slice(0, 3).map((c) => c.nome ?? c.telefone ?? c.email ?? "—").join(", ");

/** A COLUNA DA ESQUERDA (300px): busca (350 ms), Filtros, Ordenar, "Selecionar todos", a lista e o rodapé. */
export function ListaDeSugestoes({
  filtro,
  aoMudarFiltro,
  sugestoes,
  total,
  carregando,
  erro,
  temMais,
  aoCarregarMais,
  escolhida,
  aoEscolher,
  marcadas,
  aoMarcar,
}: {
  filtro: FiltroDasSugestoes;
  aoMudarFiltro: (f: FiltroDasSugestoes) => void;
  sugestoes: Sugestao[];
  total: number;
  carregando: boolean;
  erro: boolean;
  temMais: boolean;
  aoCarregarMais: () => void;
  escolhida: string | null;
  aoEscolher: (chave: string) => void;
  marcadas: ReadonlySet<string>;
  aoMarcar: (chaves: string[], marcar: boolean) => void;
}) {
  const t = useT();
  const [busca, setBusca] = useState(filtro.q);
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (busca !== filtro.q) aoMudarFiltro({ ...filtro, q: busca });
    }, 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a busca digitada dispara
  }, [busca]);
  const marcaveis = sugestoes.filter((s) => !s.bloqueada).map((s) => s.chave);
  const todasMarcadas = marcaveis.length > 0 && marcaveis.every((c) => marcadas.has(c));

  return (
    <div className="flex w-[300px] shrink-0 flex-col border-r border-casca-borda">
      <div className="flex flex-col gap-2 border-b border-casca-borda p-3">
        <span className="relative">
          <input
            type="text"
            aria-label={t("Buscar telefone ou nome…")}
            placeholder={t("Buscar telefone ou nome…")}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 w-full rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta"
          />
          <Search size={14} aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
        </span>
        <div className="flex items-center gap-2">
          <FiltrosDaMescla filtro={filtro} aoMudar={aoMudarFiltro} />
          <MenuPrimitive.Root>
            <MenuPrimitive.Trigger className="flex h-8 items-center gap-1.5 rounded-casca-gatilho border border-casca-borda px-2.5 text-[13px] text-casca-texto hover:bg-casca-raia">
              <ArrowUpDown size={14} aria-hidden />
              {t("Ordenar")}
            </MenuPrimitive.Trigger>
            <MenuPrimitive.Portal>
              <MenuPrimitive.Content align="start" className={CAIXA_DO_MENU}>
                {ORDENS_DA_MESCLA.map((o) => (
                  <MenuPrimitive.Item key={o} className={cn(ITEM_DO_MENU, o === filtro.ordem && "font-semibold text-casca-marca")} onSelect={() => aoMudarFiltro({ ...filtro, ordem: o })}>
                    {t(ROTULO_DA_ORDEM[o])}
                  </MenuPrimitive.Item>
                ))}
              </MenuPrimitive.Content>
            </MenuPrimitive.Portal>
          </MenuPrimitive.Root>
        </div>
        <CaixaDaCasca
          marcada={todasMarcadas}
          aoMudar={(m) => aoMarcar(marcaveis, m)}
          rotulo={`${t("Selecionar todos")} (${marcaveis.length})`}
          aria-label={`${t("Selecionar todos")} (${marcaveis.length})`}
          desabilitada={marcaveis.length === 0}
        />
      </div>
      <ul
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (temMais && el.scrollTop + el.clientHeight >= el.scrollHeight - 80) aoCarregarMais();
        }}
      >
        {carregando ? (
          <li className="px-3 py-6 text-xs text-casca-suave">{t("Carregando…")}</li>
        ) : erro ? (
          <li className="px-3 py-6 text-xs text-casca-suave">{t("Falha ao carregar sugestões de mescla.")}</li>
        ) : sugestoes.length === 0 ? (
          <li className="px-3 py-6 text-xs text-casca-suave">{t("Nenhuma sugestão de mescla")}</li>
        ) : (
          sugestoes.map((s) => {
            const nomes = nomesDaSugestao(s);
            const faixa = t(ROTULO_DA_FAIXA[faixaDaConfianca(s.confianca)]);
            return (
              <li key={s.chave} className={cn("flex items-center gap-2 border-b border-casca-borda px-3 py-2.5", s.chave === escolhida && "bg-casca-raia")}>
                <CaixaDaCasca marcada={marcadas.has(s.chave)} aoMudar={(m) => aoMarcar([s.chave], m)} aria-label={`${t("Selecionar")} ${nomes}`} desabilitada={s.bloqueada} />
                <button type="button" aria-label={`${nomes}, ${s.confianca}% · ${faixa}`} onClick={() => aoEscolher(s.chave)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="flex shrink-0 -space-x-2">
                    {s.contatos.slice(0, 3).map((c) => (
                      <FotoDaLinha key={c.id} id={c.id} nome={c.nome ?? ""} temFoto={false} />
                    ))}
                    {s.contatos.length > 3 ? (
                      <span className="grid size-8 place-items-center rounded-full bg-casca-raia text-[11px] text-casca-suave">{`+${s.contatos.length - 3}`}</span>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-casca-texto">{nomes}</span>
                  <SeloDaConfianca confianca={s.confianca} />
                </button>
              </li>
            );
          })
        )}
      </ul>
      <p className="border-t border-casca-borda px-3 py-2 text-[12px] text-casca-suave">
        {marcadas.size > 0
          ? `${marcadas.size} ${marcadas.size === 1 ? t("marcada") : t("marcadas")}`
          : `${total} ${total === 1 ? t("sugestão") : t("sugestões")}`}
      </p>
    </div>
  );
}
