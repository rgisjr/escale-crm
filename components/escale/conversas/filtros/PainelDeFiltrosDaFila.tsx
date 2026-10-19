"use client";
import { useState, type ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import {
  SECOES_DA_FILA,
  contarNaSecaoDaFila,
  limparSecaoDaFila,
  temCriterios,
  type FiltrosDoPainel,
  type SecaoDaFila,
} from "@/lib/escale/conversas/filtros-da-fila";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Smartphone,
  User,
  Users,
  X,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";

import { SecaoCanaisDaFila } from "./SecaoCanaisDaFila";
import { SecaoContatosDaFila } from "./SecaoContatosDaFila";
import { SecaoConversasDaFila } from "./SecaoConversasDaFila";
import { SecaoGruposDaFila } from "./SecaoGruposDaFila";
import { SecaoNegociosDaFila } from "./SecaoNegociosDaFila";

const TITULO: Record<SecaoDaFila, string> = {
  conversas: "Conversas",
  grupos: "Grupos",
  negocios: "Negócios",
  contatos: "Contatos",
  canais: "Canais",
};
const ICONE: Record<SecaoDaFila, LucideIcon> = {
  conversas: MessageSquare,
  grupos: Users,
  negocios: Briefcase,
  contatos: User,
  canais: Smartphone,
};
const CHAVE_DOS_ACORDEOES = "escale_acordeoes_da_fila";

function lerAbertos(): SecaoDaFila[] {
  try {
    const lido = JSON.parse(window.localStorage.getItem(CHAVE_DOS_ACORDEOES) ?? "null") as unknown;
    return Array.isArray(lido)
      ? lido.filter((s): s is SecaoDaFila => (SECOES_DA_FILA as readonly string[]).includes(s))
      : ["conversas"];
  } catch {
    return ["conversas"];
  }
}

/**
 * O PAINEL "FILTROS" DA FILA (fork Escale, Fase 3D; B1; c32, c64): 360px sobre a
 * esquerda do centro; acordeões que se abrem juntos e ficam lembrados no
 * navegador; cada um com o selo e o X; "Resetar" (e o "Salvar filtro" que vem em
 * `cabecalho`) só com critério. Aplica na hora.
 */
export function PainelDeFiltrosDaFila({
  painel,
  aoMudar,
  aoFechar,
  opcoes,
  temGrupos,
  cabecalho,
}: {
  painel: FiltrosDoPainel;
  aoMudar: (f: FiltrosDoPainel) => void;
  aoFechar: () => void;
  opcoes: OpcoesDoFiltro;
  temGrupos: boolean;
  cabecalho?: ReactNode;
}) {
  const t = useT();
  const [abertos, setAbertos] = useState<SecaoDaFila[]>(lerAbertos);
  const secoes = SECOES_DA_FILA.filter((s) => s !== "grupos" || temGrupos);

  function alternar(s: SecaoDaFila) {
    const proximos = abertos.includes(s) ? abertos.filter((x) => x !== s) : [...abertos, s];
    setAbertos(proximos);
    try {
      window.localStorage.setItem(CHAVE_DOS_ACORDEOES, JSON.stringify(proximos));
    } catch {
      // navegador sem armazenamento: o estado vale só nesta tela
    }
  }

  const conteudo = (s: SecaoDaFila) => {
    if (s === "conversas") return <SecaoConversasDaFila painel={painel} aoMudar={aoMudar} />;
    if (s === "grupos") return <SecaoGruposDaFila painel={painel} aoMudar={aoMudar} />;
    if (s === "negocios")
      return <SecaoNegociosDaFila painel={painel} aoMudar={aoMudar} opcoes={opcoes} />;
    if (s === "contatos") return <SecaoContatosDaFila painel={painel} aoMudar={aoMudar} />;
    return <SecaoCanaisDaFila painel={painel} aoMudar={aoMudar} />;
  };

  return (
    <aside
      aria-label={t("Filtros")}
      className="absolute inset-y-0 left-0 z-20 flex w-[360px] max-w-full flex-col border-r border-casca-borda bg-surface shadow-casca-painel"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-casca-borda px-4">
        <span className="flex-1 text-[15px] font-medium text-casca-texto">{t("Filtros")}</span>
        {temCriterios(painel) ? (
          <>
            {cabecalho}
            <button
              type="button"
              onClick={() => aoMudar({})}
              className="h-7 rounded-casca-gatilho px-2 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
            >
              {t("Resetar")}
            </button>
          </>
        ) : null}
        <button
          type="button"
          aria-label={t("Fechar")}
          onClick={aoFechar}
          className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {secoes.map((s) => {
          const Icone = ICONE[s];
          const n = contarNaSecaoDaFila(painel, s);
          const aberta = abertos.includes(s);
          return (
            <section key={s} className="border-b border-casca-borda">
              <div className="flex h-14 items-center gap-2 px-4">
                <button
                  type="button"
                  aria-expanded={aberta}
                  onClick={() => alternar(s)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] font-medium text-casca-texto"
                >
                  <Icone size={16} aria-hidden className="text-casca-suave" />
                  {t(TITULO[s])}
                </button>
                {n > 0 ? (
                  <>
                    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-[4px] bg-casca-marca-suave px-1 text-[11px] font-semibold text-casca-marca">
                      {n}
                    </span>
                    <button
                      type="button"
                      aria-label={`${t("Limpar")} ${t(TITULO[s])}`}
                      onClick={() => aoMudar(limparSecaoDaFila(painel, s))}
                      className="grid size-5 place-items-center text-casca-suave hover:text-casca-texto"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </>
                ) : null}
                {aberta ? (
                  <ChevronUp size={14} aria-hidden className="text-casca-suave" />
                ) : (
                  <ChevronDown size={14} aria-hidden className="text-casca-suave" />
                )}
              </div>
              {aberta ? (
                <div className="flex flex-col gap-4 bg-casca-raia px-5 py-4">{conteudo(s)}</div>
              ) : null}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
