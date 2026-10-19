"use client";
import { useState, type ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import {
  SECOES_DO_FILTRO,
  contarNaSecao,
  limparSecao,
  type FiltrosDeContatos,
  type SecaoDoFiltro,
} from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import {
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ListChecks,
  Tag,
  User,
  X,
} from "@/lib/ui/icons-da-casca";

import { SecaoCamposDoFiltro } from "./SecaoCamposDoFiltro";
import { SecaoContatoDoFiltro } from "./SecaoContatoDoFiltro";
import { SecaoNegocioDoFiltro } from "./SecaoNegocioDoFiltro";
import { SecaoTagsDoFiltro } from "./SecaoTagsDoFiltro";

const TITULO: Record<SecaoDoFiltro, string> = {
  contato: "Contato",
  negocio: "Negócio",
  tags: "Tags",
  campos: "Campos",
};
const ICONE = { contato: User, negocio: Briefcase, tags: Tag, campos: ListChecks } as const;

/**
 * O PAINEL DE FILTROS DA LISTA DE CONTATOS (fork Escale, Fase 2B; Clint
 * `FilterPopover` + `FilterSections`; prints 2b-05 a 2b-23): acordeão com as seções
 * Contato, Negócio, Tags e Campos; cada uma com o selo da contagem e o × que
 * limpa só ela. Com `foco`, só aquela seção e o link "Todos os filtros" (é como
 * o chip da faixa abre o painel). O rodapé ("Salvar filtro", "Resetar") vem de
 * fora e só aparece sem foco. Aplica na hora: cada mudança chama `aoMudar`.
 */
export function PainelDeFiltros({
  filtros,
  aoMudar,
  opcoes,
  foco,
  aoMudarFoco,
  rodape,
}: {
  filtros: FiltrosDeContatos;
  aoMudar: (f: FiltrosDeContatos) => void;
  opcoes: OpcoesDoFiltro;
  foco: SecaoDoFiltro | null;
  aoMudarFoco: (s: SecaoDoFiltro | null) => void;
  rodape?: ReactNode;
}) {
  const t = useT();
  const [aberta, setAberta] = useState<SecaoDoFiltro | null>(
    foco ?? SECOES_DO_FILTRO.find((s) => contarNaSecao(filtros, s) > 0) ?? null,
  );
  const secoes = foco ? [foco] : SECOES_DO_FILTRO;

  const conteudo = (s: SecaoDoFiltro) => {
    if (s === "contato") return <SecaoContatoDoFiltro filtros={filtros} aoMudar={aoMudar} />;
    if (s === "negocio")
      return <SecaoNegocioDoFiltro filtros={filtros} aoMudar={aoMudar} opcoes={opcoes} />;
    if (s === "tags") return <SecaoTagsDoFiltro filtros={filtros} aoMudar={aoMudar} />;
    return (
      <SecaoCamposDoFiltro
        filtros={filtros}
        aoMudar={aoMudar}
        camposDoNegocio={opcoes.camposDoNegocio}
        camposDoContato={opcoes.camposDoContato}
      />
    );
  };

  return (
    <div className="flex max-h-[80vh] w-[356px] flex-col">
      {foco ? (
        <button
          type="button"
          onClick={() => aoMudarFoco(null)}
          className="flex h-10 shrink-0 items-center gap-1 border-b border-casca-borda px-4 text-[12px] font-medium text-casca-marca"
        >
          <ChevronLeft size={14} aria-hidden />
          {t("Todos os filtros")}
        </button>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {secoes.map((s) => {
          const Icone = ICONE[s];
          const n = contarNaSecao(filtros, s);
          const estaAberta = foco !== null || aberta === s;
          return (
            <section key={s} className="border-b border-casca-borda last:border-b-0">
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
                      onClick={() => aoMudar(limparSecao(filtros, s))}
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
              {estaAberta ? (
                <div className="space-y-4 bg-casca-raia px-5 py-5">{conteudo(s)}</div>
              ) : null}
            </section>
          );
        })}
      </div>
      {foco ? null : rodape}
    </div>
  );
}
