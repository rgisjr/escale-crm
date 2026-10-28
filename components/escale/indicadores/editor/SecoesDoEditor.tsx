"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { nomeDoChip, type AlvoDoCatalogo, type CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import type { ErroDoRascunho } from "@/lib/escale/indicadores/editor/pergunta-do-rascunho";
import {
  adicionarIndicador,
  adicionarVariavel,
  definirTempo,
  removerIndicador,
  removerVariavel,
  type RascunhoDoGrafico,
} from "@/lib/escale/indicadores/editor/rascunho";
import { VARIAVEIS_POR_PERGUNTA_MAX } from "@/lib/escale/indicadores/catalogo/tipos";
import { ChartNoAxesColumn, Clock, Gauge, Plus, type LucideIcon } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AjudaDoEditor } from "./AjudaDoEditor";
import { CatalogoDoEditor } from "./CatalogoDoEditor";
import { ChipDoEditor } from "./ChipDoEditor";

type Props = {
  rascunho: RascunhoDoGrafico;
  catalogo: CatalogoDaTela | undefined;
  erros: readonly ErroDoRascunho[];
  mudar: (f: (r: RascunhoDoGrafico) => RascunhoDoGrafico) => void;
};

const SEM_CATALOGO: CatalogoDaTela = { assuntos: [], camposPersonalizados: { negocio: [], contato: [], empresa: [] } };

function CabecalhoDaSecao({ Icone, titulo, dica }: { Icone: LucideIcon; titulo: string; dica: string }) {
  return (
    <h3 className="flex items-center gap-2 text-[13px] font-bold text-casca-texto">
      <Icone size={14} aria-hidden className="text-casca-suave" />
      {titulo}
      <AjudaDoEditor texto={dica} />
    </h3>
  );
}

/** Indicador, Variável e Tempo (10-012, 10-036, 10-061). O "+ Indicador calculado" e o Filtro Quantitativo entram na 7E. */
export function SecoesDoEditor({ rascunho, catalogo, erros, mudar }: Props) {
  const t = useT();
  const cat = catalogo ?? SEM_CATALOGO;
  const [aberto, setAberto] = useState<AlvoDoCatalogo | null>(null);
  const abrirOuFechar = (alvo: AlvoDoCatalogo) => (a: boolean) => setAberto(a ? alvo : aberto === alvo ? null : aberto);
  const acao = (alvo: AlvoDoCatalogo, rotulo: string) => (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2 text-[13px] text-casca-marca hover:bg-casca-raia",
        aberto === alvo && "bg-casca-raia",
      )}
    >
      <Plus size={14} aria-hidden />
      {rotulo}
    </button>
  );
  const erroDeIndicador = erros.some((e) => e.secao === "indicador");

  return (
    <div>
      <section aria-label={t("Indicador")}>
        <CabecalhoDaSecao Icone={Gauge} titulo={t("Indicador")} dica={t("Selecione os indicadores que você quer analisar no seu dashboard.")} />
        <div className="mt-3 flex flex-wrap gap-2">
          {rascunho.indicadores.map((id) => (
            <ChipDoEditor key={id} nome={nomeDoChip(id, cat)} aoRemover={() => mudar((r) => removerIndicador(r, id))} />
          ))}
        </div>
        <div className="mt-2">
          <CatalogoDoEditor
            alvo="indicador"
            catalogo={catalogo}
            rascunho={rascunho}
            aberto={aberto === "indicador"}
            aoMudarAberto={abrirOuFechar("indicador")}
            aoAdicionar={(id) => mudar((r) => adicionarIndicador(r, id, cat))}
          >
            {acao("indicador", t("Adicionar indicador"))}
          </CatalogoDoEditor>
        </div>
        {erroDeIndicador ? <p className="mt-1 text-[12px] text-casca-alerta">{t("campo obrigatório")}</p> : null}
      </section>

      <section aria-label={t("Variável")} className="mt-10">
        <CabecalhoDaSecao Icone={ChartNoAxesColumn} titulo={t("Variável")} dica={t("Escolha quais variáveis você quer acompanhar.")} />
        <div className="mt-3 flex flex-wrap gap-2">
          {rascunho.variaveis.map((id) => (
            <ChipDoEditor key={id} nome={nomeDoChip(id, cat)} aoRemover={() => mudar((r) => removerVariavel(r, id))} />
          ))}
        </div>
        {rascunho.variaveis.length < VARIAVEIS_POR_PERGUNTA_MAX ? (
          <div className="mt-2">
            <CatalogoDoEditor
              alvo="variavel"
              catalogo={catalogo}
              rascunho={rascunho}
              aberto={aberto === "variavel"}
              aoMudarAberto={abrirOuFechar("variavel")}
              aoAdicionar={(id) => mudar((r) => adicionarVariavel(r, id))}
            >
              {acao("variavel", t("Adicionar variável"))}
            </CatalogoDoEditor>
          </div>
        ) : null}
      </section>

      <section aria-label={t("Tempo")} className="mt-10">
        <CabecalhoDaSecao Icone={Clock} titulo={t("Tempo")} dica={t("Selecione a dimensão de tempo do gráfico.")} />
        {rascunho.tempo.campo ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <ChipDoEditor nome={nomeDoChip(rascunho.tempo.campo, cat)} aoRemover={() => mudar((r) => definirTempo(r, null))} />
          </div>
        ) : (
          <div className="mt-2">
            <CatalogoDoEditor
              alvo="tempo"
              catalogo={catalogo}
              rascunho={rascunho}
              aberto={aberto === "tempo"}
              aoMudarAberto={abrirOuFechar("tempo")}
              aoAdicionar={(id) => {
                mudar((r) => definirTempo(r, id));
                setAberto(null);
              }}
            >
              {acao("tempo", t("Adicionar campo de tempo"))}
            </CatalogoDoEditor>
          </div>
        )}
      </section>
    </div>
  );
}
