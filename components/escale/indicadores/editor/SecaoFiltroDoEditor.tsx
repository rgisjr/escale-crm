"use client";
import { useState } from "react";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { nomeDoChip, tipoDoCampo, type CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { ROTULO_DO_OPERADOR, operadoresDoTipo, precisaDeValor } from "@/lib/escale/indicadores/editor/operadores";
import type { ErroDoRascunho } from "@/lib/escale/indicadores/editor/pergunta-do-rascunho";
import {
  CAIXAS_MAX,
  adicionarCondicao,
  mudarCondicao,
  mudarModoDaCaixa,
  novoGrupo,
  removerCondicao,
  type RascunhoDoGrafico,
} from "@/lib/escale/indicadores/editor/rascunho";
import { ListFilter, Plus, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CampoDoValor } from "./CampoDoValor";
import { CatalogoDoEditor } from "./CatalogoDoEditor";

type Props = {
  rascunho: RascunhoDoGrafico;
  catalogo: CatalogoDaTela | undefined;
  erros: readonly ErroDoRascunho[];
  mudar: (f: (r: RascunhoDoGrafico) => RascunhoDoGrafico) => void;
};

const SEM_CATALOGO: CatalogoDaTela = { assuntos: [], camposPersonalizados: { negocio: [], contato: [], empresa: [] } };
const BOTAO_DE_TEXTO = "inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2 text-[13px] text-casca-marca hover:bg-casca-raia";

/** A seção Filtro (10-012, 10-036, 10-038, 10-062 a 10-064): caixas com "Corresponde a", condições e "+ Novo grupo". */
export function SecaoFiltroDoEditor({ rascunho, catalogo, erros, mudar }: Props) {
  const t = useT();
  const cat = catalogo ?? SEM_CATALOGO;
  /** Qual catálogo está aberto: o índice da caixa, ou "vazio" (o "+ Adicionar filtro" sem nenhuma condição). */
  const [aberto, setAberto] = useState<number | "vazio" | null>(null);
  const semCondicao = rascunho.filtro.every((c) => c.condicoes.length === 0) && rascunho.filtro.length === 1;
  const comErro = (chave: string) => erros.some((e) => e.secao === "filtro" && e.condicao === chave);

  const catalogoDaCaixa = (caixa: number, aoAbrir: number | "vazio", gatilho: React.ReactNode) => (
    <CatalogoDoEditor
      alvo="filtro"
      catalogo={catalogo}
      rascunho={rascunho}
      aberto={aberto === aoAbrir}
      aoMudarAberto={(a) => setAberto(a ? aoAbrir : null)}
      aoAdicionar={(id) => {
        mudar((r) => adicionarCondicao(r, caixa, id, cat));
        setAberto(null);
      }}
    >
      {gatilho}
    </CatalogoDoEditor>
  );

  return (
    <section aria-label={t("Filtro")} className="mt-10">
      <h3 className="flex items-center gap-2 text-[13px] font-bold text-casca-texto">
        <ListFilter size={14} aria-hidden className="text-casca-suave" />
        {t("Filtro")}
      </h3>
      {semCondicao ? (
        <div className="mt-3">
          {catalogoDaCaixa(
            0,
            "vazio",
            <button type="button" className={cn(BOTAO_DE_TEXTO, aberto === "vazio" && "bg-casca-raia")}>
              <Plus size={14} aria-hidden />
              {t("Adicionar filtro")}
            </button>,
          )}
        </div>
      ) : (
        rascunho.filtro.map((caixa, i) => (
          <div key={caixa.chave} className="mt-3 rounded-[6px] border border-casca-borda bg-surface px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-casca-texto">{t("Corresponde a")}</span>
              <div className="w-[185px]">
                <SeletorDaCasca
                  aria-label={t("Corresponde a")}
                  className="h-8"
                  valor={caixa.modo}
                  opcoes={[
                    { valor: "todas", rotulo: t("todas as condições") },
                    { valor: "qualquer", rotulo: t("qualquer condição") },
                  ]}
                  aoMudar={(v) => v && mudar((r) => mudarModoDaCaixa(r, i, v))}
                />
              </div>
            </div>
            {caixa.condicoes.map((c) => {
              const tipo = (c.campo && tipoDoCampo(c.campo, cat)) || "texto";
              return (
                <div key={c.chave} className="mt-4 flex flex-col gap-3 border-b border-casca-divisoria pb-4 last:border-b-0">
                  <div className="flex h-8 items-center justify-between rounded-[4px] bg-casca-busca px-3 text-[13px] text-casca-texto">
                    <span className="truncate">{c.campo ? nomeDoChip(c.campo, cat) : ""}</span>
                    <button
                      type="button"
                      aria-label={t("Remover {nome}").replace("{nome}", c.campo ? nomeDoChip(c.campo, cat) : "")}
                      onClick={() => mudar((r) => removerCondicao(r, i, c.chave))}
                      className="grid shrink-0 place-items-center"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-[12px] text-casca-suave">{t("é")}</span>
                    <div className="min-w-0 flex-1">
                      <SeletorDaCasca
                        aria-label={t("Operador")}
                        className="h-8"
                        valor={c.op}
                        opcoes={operadoresDoTipo(tipo).map((op) => ({ valor: op, rotulo: t(ROTULO_DO_OPERADOR[op]) }))}
                        aoMudar={(v) => v && mudar((r) => mudarCondicao(r, i, c.chave, { op: v }))}
                      />
                    </div>
                  </div>
                  {precisaDeValor(c.op) ? (
                    <CampoDoValor
                      condicao={c}
                      catalogo={cat}
                      comErro={comErro(c.chave)}
                      aoMudar={(valor) => mudar((r) => mudarCondicao(r, i, c.chave, { valor }))}
                    />
                  ) : null}
                </div>
              );
            })}
            <div className="mt-4">
              {catalogoDaCaixa(
                i,
                i,
                <button
                  type="button"
                  aria-label={t("Adicionar filtro")}
                  className="grid size-8 place-items-center rounded-[4px] border border-casca-borda text-casca-marca hover:bg-casca-raia"
                >
                  <Plus size={16} aria-hidden />
                </button>,
              )}
            </div>
          </div>
        ))
      )}
      {!semCondicao && rascunho.filtro.length < CAIXAS_MAX ? (
        <button
          type="button"
          onClick={() => {
            const proxima = rascunho.filtro.length;
            mudar(novoGrupo);
            setAberto(proxima);
          }}
          className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-[6px] border border-casca-borda text-[13px] text-casca-marca hover:bg-casca-raia"
        >
          <Plus size={14} aria-hidden />
          {t("Novo grupo")}
        </button>
      ) : null}
    </section>
  );
}
