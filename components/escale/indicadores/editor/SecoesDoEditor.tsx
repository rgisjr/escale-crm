"use client";
import { useState } from "react";
import { toast } from "sonner";

import { useT } from "@/hooks/i18n/useT";
import { nomeDoChip, type AlvoDoCatalogo, type CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import type { ErroDoRascunho } from "@/lib/escale/indicadores/editor/pergunta-do-rascunho";
import {
  adicionarCalculado,
  adicionarIndicador,
  adicionarVariavel,
  definirTempo,
  editarCalculado,
  removerCalculado,
  removerIndicadorComAviso,
  removerVariavel,
  type RascunhoDoGrafico,
} from "@/lib/escale/indicadores/editor/rascunho";
import { VARIAVEIS_POR_PERGUNTA_MAX } from "@/lib/escale/indicadores/catalogo/tipos";
import { limiteDoTipo } from "@/lib/escale/indicadores/editor/tipos-de-grafico";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";
import type { Calculado } from "@/lib/escale/indicadores/pergunta";
import { Calculator, ChartNoAxesColumn, Clock, Gauge, Plus, X, type LucideIcon } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AjudaDoEditor } from "./AjudaDoEditor";
import { CatalogoDoEditor } from "./CatalogoDoEditor";
import { ChipDoEditor } from "./ChipDoEditor";
import { JanelaIndicadorCalculado } from "./JanelaIndicadorCalculado";

type Props = {
  rascunho: RascunhoDoGrafico;
  catalogo: CatalogoDaTela | undefined;
  erros: readonly ErroDoRascunho[];
  mudar: (f: (r: RascunhoDoGrafico) => RascunhoDoGrafico) => void;
  /** O resultado do último Executar, para a prévia do indicador calculado. */
  resultado?: Resultado | undefined;
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

/** Indicador (com o "+ Indicador calculado", 10-049 e 10-052), Variável e Tempo (10-012, 10-036, 10-061). */
export function SecoesDoEditor({ rascunho, catalogo, erros, mudar, resultado }: Props) {
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
  const [calculando, setCalculando] = useState<{ editando: Calculado | null } | null>(null);
  const cheio = rascunho.indicadores.length + rascunho.calculados.length >= limiteDoTipo(rascunho.tipo);
  const heatmap = rascunho.tipo === "heatmap";

  function tirarIndicador(id: string) {
    const { rascunho: proximo, removidos } = removerIndicadorComAviso(rascunho, id);
    mudar(() => proximo);
    if (removidos.length > 0) {
      toast.info(
        t("Indicador calculado removido junto: {names}. Ele dependia do indicador que saiu do gráfico.").replace("{names}", removidos.join(", ")),
      );
    }
  }

  return (
    <div>
      <section aria-label={t("Indicador")}>
        <CabecalhoDaSecao Icone={Gauge} titulo={t("Indicador")} dica={t("Selecione os indicadores que você quer analisar no seu dashboard.")} />
        <div className="mt-3 flex flex-wrap gap-2">
          {rascunho.indicadores.map((id) => (
            <ChipDoEditor key={id} nome={nomeDoChip(id, cat)} aoRemover={() => tirarIndicador(id)} />
          ))}
          {rascunho.calculados.map((c) => (
            <span
              key={c.id}
              className="inline-flex h-7 max-w-full items-center gap-2 rounded-[4px] border border-casca-marca-media bg-casca-marca-suave px-3 text-[13px] text-casca-marca"
            >
              <button type="button" onClick={() => setCalculando({ editando: c })} className="truncate">
                {c.nome}
              </button>
              <button
                type="button"
                aria-label={t("Remover {nome}").replace("{nome}", c.nome)}
                onClick={() => mudar((r) => removerCalculado(r, c.id))}
                className="grid shrink-0 place-items-center"
              >
                <X size={14} aria-hidden />
              </button>
            </span>
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
        {rascunho.indicadores.length > 0 && !cheio ? (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setCalculando({ editando: null })}
              className="inline-flex h-7 items-center gap-1.5 rounded-[4px] px-2 text-[13px] text-casca-marca hover:bg-casca-raia"
            >
              <Calculator size={14} aria-hidden />
              {t("Indicador calculado")}
            </button>
          </div>
        ) : null}
        {erroDeIndicador ? <p className="mt-1 text-[12px] text-casca-alerta">{t("campo obrigatório")}</p> : null}
        {calculando && catalogo ? (
          <JanelaIndicadorCalculado
            rascunho={rascunho}
            catalogo={catalogo}
            editando={calculando.editando}
            resultado={resultado}
            aoCancelar={() => setCalculando(null)}
            aoSalvar={(c) => {
              const editando = calculando.editando;
              mudar((r) => (editando ? editarCalculado(r, editando.id, c) : adicionarCalculado(r, c)));
              setCalculando(null);
            }}
          />
        ) : null}
      </section>

      <section aria-label={t("Variável")} className="mt-10">
        <CabecalhoDaSecao Icone={ChartNoAxesColumn} titulo={t("Variável")} dica={t("Escolha quais variáveis você quer acompanhar.")} />
        {heatmap ? <p className="mt-3 text-[12px] text-casca-suave">{t("O heatmap usa só o campo de tempo.")}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {rascunho.variaveis.map((id) => (
            <ChipDoEditor key={id} nome={nomeDoChip(id, cat)} aoRemover={() => mudar((r) => removerVariavel(r, id))} />
          ))}
        </div>
        {!heatmap && rascunho.variaveis.length < VARIAVEIS_POR_PERGUNTA_MAX ? (
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
