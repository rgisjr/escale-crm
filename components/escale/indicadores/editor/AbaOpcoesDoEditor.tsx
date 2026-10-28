"use client";
import { useState, type ReactNode } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { CALCULOS_DO_FUNIL, type CalculoDoFunil } from "@/lib/escale/indicadores/graficos/opcoes";
import { nomeDoChip, type CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import { mudarOpcoes, mudarOrdem, type RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";
import {
  ACORDEOES_DAS_OPCOES,
  VISUALIZACAO_POR_TIPO,
  type ChaveDeVisualizacao,
} from "@/lib/escale/indicadores/editor/tipos-de-grafico";
import { ArrowDownAZ, ChevronDown, ChevronUp, LayoutList, type LucideIcon } from "@/lib/ui/icons-da-casca";

type Props = {
  rascunho: RascunhoDoGrafico;
  catalogo: CatalogoDaTela | undefined;
  mudar: (f: (r: RascunhoDoGrafico) => RascunhoDoGrafico) => void;
  /** As etapas do resultado executado (rótulos de `v0`); vazio antes do 1º Executar. */
  etapasDoResultado: ReadonlyArray<{ valor: string; rotulo: string }>;
};

const ROTULO_DA_VISUALIZACAO: Record<ChaveDeVisualizacao, string> = {
  valores: "Valores",
  legendas: "Legendas",
  grade: "Grade",
  linhaDeMedia: "Exibir linha de média",
  linhaDeMediana: "Exibir linha de mediana",
};
const ROTULO_DO_CALCULO: Record<CalculoDoFunil, string> = {
  automatico: "Automático",
  primeira_etapa: "Primeira etapa (topo)",
  etapa_anterior: "Etapa anterior",
  participacao: "Participação no total",
};
const TITULO_DO_CAMPO = "mb-2 text-[13px] text-casca-texto";

function Acordeao({ titulo, Icone, children }: { titulo: string; Icone: LucideIcon; children: ReactNode }) {
  const [aberto, setAberto] = useState(true);
  return (
    <section className="border-b border-casca-divisoria">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
        className="flex h-12 w-full items-center gap-2 text-left"
      >
        <Icone size={16} aria-hidden className="text-casca-suave" />
        <span className="flex-1 text-[14px] font-bold text-casca-texto">{titulo}</span>
        {aberto ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
      </button>
      {aberto ? <div className="flex flex-col gap-5 py-6">{children}</div> : null}
    </section>
  );
}

/** A aba Opções (10-015, 10-039, 10-041, 10-043, 10-044, 10-047): Visualização por tipo e Ordenação. Metas e projeções são da 7E. */
export function AbaOpcoesDoEditor({ rascunho, catalogo, mudar, etapasDoResultado }: Props) {
  const t = useT();
  const chaves = VISUALIZACAO_POR_TIPO[rascunho.tipo];
  const sobreOGrafico = [...rascunho.indicadores, ...rascunho.variaveis];
  const { funil } = rascunho.opcoes;
  const semResultado = etapasDoResultado.length === 0;

  const acordeoes: Record<(typeof ACORDEOES_DAS_OPCOES)[number], ReactNode> = {
    visualizacao:
      chaves.length === 0 ? null : (
        <Acordeao key="visualizacao" titulo={t("Visualização")} Icone={LayoutList}>
          {chaves.map((chave) => (
            <label key={chave} className="flex items-center gap-3 text-[13px] text-casca-texto">
              <InterruptorDaCasca
                aria-label={t(ROTULO_DA_VISUALIZACAO[chave])}
                ligado={rascunho.opcoes.visualizacao[chave]}
                aoMudar={(v) => mudar((r) => mudarOpcoes(r, (o) => ({ ...o, visualizacao: { ...o.visualizacao, [chave]: v } })))}
              />
              {t(ROTULO_DA_VISUALIZACAO[chave])}
            </label>
          ))}
        </Acordeao>
      ),
    ordenacao: (
      <Acordeao key="ordenacao" titulo={t("Ordenação")} Icone={ArrowDownAZ}>
        <div>
          <p className={TITULO_DO_CAMPO}>{t("Ordenar por")}</p>
          <SeletorDaCasca
            aria-label={t("Ordenar por")}
            className="h-8"
            vazio={t("Selecione um campo")}
            valor={rascunho.ordem.por ?? ""}
            opcoes={sobreOGrafico.map((id) => ({ valor: id, rotulo: catalogo ? nomeDoChip(id, catalogo) : id }))}
            aoMudar={(v) => mudar((r) => mudarOrdem(r, { por: v || null }))}
          />
        </div>
        <div>
          <p className={TITULO_DO_CAMPO}>{t("Direção")}</p>
          <SeletorDaCasca
            aria-label={t("Direção")}
            className="h-8"
            valor={rascunho.ordem.direcao}
            opcoes={[
              { valor: "asc", rotulo: t("Crescente") },
              { valor: "desc", rotulo: t("Decrescente") },
            ]}
            aoMudar={(v) => v && mudar((r) => mudarOrdem(r, { direcao: v }))}
          />
        </div>
        {rascunho.tipo === "funil" ? (
          <>
            <div>
              <p className={TITULO_DO_CAMPO}>{t("Primeira etapa (topo do funil)")}</p>
              <SeletorDaCasca
                aria-label={t("Primeira etapa (topo do funil)")}
                className="h-8"
                desabilitado={semResultado}
                valor={funil.primeiraEtapa ?? ""}
                opcoes={[{ valor: "", rotulo: t("Padrão (nenhuma etapa fixada)") }, ...etapasDoResultado]}
                aoMudar={(v) => mudar((r) => mudarOpcoes(r, (o) => ({ ...o, funil: { ...o.funil, primeiraEtapa: v || null } })))}
              />
            </div>
            <div>
              <p className={TITULO_DO_CAMPO}>{t("Cálculo da porcentagem")}</p>
              <SeletorDaCasca
                aria-label={t("Cálculo da porcentagem")}
                className="h-8"
                valor={funil.calculo}
                opcoes={CALCULOS_DO_FUNIL.map((c) => ({ valor: c, rotulo: t(ROTULO_DO_CALCULO[c]) }))}
                aoMudar={(v) => v && mudar((r) => mudarOpcoes(r, (o) => ({ ...o, funil: { ...o.funil, calculo: v } })))}
              />
            </div>
          </>
        ) : null}
      </Acordeao>
    ),
  };
  return <div>{ACORDEOES_DAS_OPCOES.map((a) => acordeoes[a])}</div>;
}
