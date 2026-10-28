"use client";
import { useState, type ReactNode } from "react";

import { SecaoCamposDoFiltro } from "@/components/escale/contatos/filtros/SecaoCamposDoFiltro";
import { SecaoTagsDoFiltro } from "@/components/escale/contatos/filtros/SecaoTagsDoFiltro";
import { useT } from "@/hooks/i18n/useT";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import {
  SECOES_DO_PAINEL,
  contarNaSecaoDoPainel,
  limparSecaoDoPainel,
  type SecaoDoPainel,
} from "@/lib/escale/indicadores/painel/filtro";
import type { FiltroDoPainel } from "@/lib/escale/indicadores/pergunta";
import { ArrowLeft, ChevronDown, ChevronUp, List, SlidersHorizontal, Tag, X } from "@/lib/ui/icons-da-casca";

import { SecaoSegmentacao } from "./SecaoSegmentacao";

const TITULO: Record<SecaoDoPainel, string> = { segmentacao: "Segmentação", tags: "Tags", campos: "Campos" };
const ICONE = { segmentacao: SlidersHorizontal, tags: Tag, campos: List } as const;

/**
 * O POPOVER DE FILTROS DO PAINEL (prints 10-025 a 10-030): acordeão Segmentação / Tags / Campos, com o selo
 * da contagem e o × que limpa só a seção. Com `foco` (aberto pelo chip, 10-026) mostra só a seção, com o
 * "← Todos os filtros". Aplica na hora. Molde: `PainelDeFiltros` da lista de contatos (2B).
 */
export function PainelDeFiltrosDoPainel({
  filtro,
  aoMudar,
  opcoes,
  foco,
  aoMudarFoco,
  rodape,
}: {
  filtro: FiltroDoPainel;
  aoMudar: (f: FiltroDoPainel) => void;
  opcoes: OpcoesDoFiltro;
  foco: SecaoDoPainel | null;
  aoMudarFoco: (s: SecaoDoPainel | null) => void;
  rodape?: ReactNode;
}) {
  const t = useT();
  const [aberta, setAberta] = useState<SecaoDoPainel | null>(
    foco ?? SECOES_DO_PAINEL.find((s) => contarNaSecaoDoPainel(filtro, s) > 0) ?? "segmentacao",
  );
  const secoes = foco ? [foco] : SECOES_DO_PAINEL;

  const conteudo = (s: SecaoDoPainel) => {
    if (s === "segmentacao") return <SecaoSegmentacao filtro={filtro} aoMudar={aoMudar} opcoes={opcoes} />;
    if (s === "tags") {
      return (
        <SecaoTagsDoFiltro
          filtros={{ ...(filtro.tags ? { tags: filtro.tags } : {}) }}
          aoMudar={(novos) => {
            const { tags: _, ...resto } = filtro;
            aoMudar(novos.tags ? { ...resto, tags: novos.tags } : resto);
          }}
        />
      );
    }
    return (
      <SecaoCamposDoFiltro
        filtros={{ ...(filtro.campos ? { campos: filtro.campos } : {}) }}
        aoMudar={(novos) => {
          const { campos: _, ...resto } = filtro;
          aoMudar(novos.campos ? { ...resto, campos: novos.campos } : resto);
        }}
        camposDoNegocio={opcoes.camposDoNegocio}
        camposDoContato={opcoes.camposDoContato}
        camposDaEmpresa={opcoes.camposDaEmpresa}
      />
    );
  };

  return (
    <div className="flex max-h-[80vh] w-[356px] flex-col">
      {foco ? (
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-casca-borda px-4">
          <button
            type="button"
            onClick={() => aoMudarFoco(null)}
            className="flex items-center gap-1 text-[12px] font-medium text-casca-texto"
          >
            <ArrowLeft size={14} aria-hidden />
            {t("Todos os filtros")}
          </button>
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-casca-texto">
            {(() => {
              const Icone = ICONE[foco];
              return <Icone size={14} aria-hidden className="text-casca-suave" />;
            })()}
            {t(TITULO[foco])}
          </span>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {secoes.map((s) => {
          const Icone = ICONE[s];
          const n = contarNaSecaoDoPainel(filtro, s);
          const estaAberta = foco !== null || aberta === s;
          return (
            <section key={s} className="border-b border-casca-borda last:border-b-0">
              {foco ? null : (
                <div className="flex h-14 items-center gap-2 px-5">
                  <button
                    type="button"
                    aria-expanded={estaAberta}
                    onClick={() => setAberta(estaAberta ? null : s)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] font-medium text-casca-texto"
                  >
                    <Icone size={15} aria-hidden className="text-casca-suave" />
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
                        onClick={() => aoMudar(limparSecaoDoPainel(filtro, s))}
                        className="grid size-5 place-items-center text-casca-suave hover:text-casca-texto"
                      >
                        <X size={14} aria-hidden />
                      </button>
                    </>
                  ) : null}
                  {estaAberta ? (
                    <ChevronUp size={14} aria-hidden className="text-casca-suave" />
                  ) : (
                    <ChevronDown size={14} aria-hidden className="text-casca-suave" />
                  )}
                </div>
              )}
              {estaAberta ? <div className="space-y-4 bg-casca-raia px-5 py-5">{conteudo(s)}</div> : null}
            </section>
          );
        })}
      </div>
      {foco ? null : rodape}
    </div>
  );
}
