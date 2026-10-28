"use client";
import type { ReactNode } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { mudarComparacao, mudarOpcoes, type RascunhoDoGrafico } from "@/lib/escale/indicadores/editor/rascunho";
import { opcoesDoTipo } from "@/lib/escale/indicadores/editor/tipos-de-grafico";
import {
  CORES_DO_FUNIL,
  ESCALAS_DO_HEATMAP,
  FORMATOS_DA_BARRA_100,
  JANELAS_DO_HEATMAP,
  type OpcoesDoGrafico,
} from "@/lib/escale/indicadores/graficos/opcoes";
import { MODOS_DE_COMPARACAO, type ModoDeComparacao } from "@/lib/escale/indicadores/pergunta";
import { textoDoNumeroBr } from "@/lib/escale/indicadores/editor/operadores";
import { SlidersHorizontal } from "@/lib/ui/icons-da-casca";

import { Acordeao, AJUDA_DO_CAMPO, TITULO_DO_CAMPO } from "./AcordeaoDaAba";

type Mudar = (f: (r: RascunhoDoGrafico) => RascunhoDoGrafico) => void;
type Etapas = ReadonlyArray<{ valor: string; rotulo: string }>;

const ROTULO_DO_MODO: Record<ModoDeComparacao, string> = {
  equivalente: "Período anterior equivalente",
  mes_anterior: "Mês anterior (MoM)",
  ano_anterior: "Ano anterior (YoY)",
};
const ROTULO_DAS_CORES = { por_etapa: "Uma cor por etapa", iguais: "Todas iguais", degrade: "Degradê" } as const;

function Campo({ titulo, ajuda, children }: { titulo: string; ajuda?: string; children: ReactNode }) {
  return (
    <div>
      <p className={TITULO_DO_CAMPO}>{titulo}</p>
      {children}
      {ajuda ? <p className={AJUDA_DO_CAMPO}>{ajuda}</p> : null}
    </div>
  );
}
function Chave({ titulo, ajuda, ligado, aoMudar, desabilitado, dica }: { titulo: string; ajuda?: string; ligado: boolean; aoMudar: (v: boolean) => void; desabilitado?: boolean; dica?: string }) {
  return (
    <div>
      <label className="flex items-center gap-3 text-[13px] text-casca-texto">
        <InterruptorDaCasca aria-label={titulo} ligado={ligado} aoMudar={aoMudar} {...(desabilitado ? { desabilitado } : {})} {...(dica ? { title: dica } : {})} />
        {titulo}
      </label>
      {ajuda ? <p className={`${AJUDA_DO_CAMPO} pl-10`}>{ajuda}</p> : null}
    </div>
  );
}

/** "Opções do gráfico" (prints 10-042, 10-044, 10-045, 10-068, 10-069): o que cada tipo oferece. */
export function AcordeaoOpcoesDoGrafico({ rascunho, mudar, etapas }: { rascunho: RascunhoDoGrafico; mudar: Mudar; etapas: Etapas }) {
  const t = useT();
  const secoes = opcoesDoTipo(rascunho.tipo);
  if (secoes.length === 0) return null;
  const o = rascunho.opcoes;
  const funil = (parcial: Partial<OpcoesDoGrafico["funil"]>) => mudar((r) => mudarOpcoes(r, (x) => ({ ...x, funil: { ...x.funil, ...parcial } })));
  const semTempo = !rascunho.tempo.campo;
  const segundaVariavel = rascunho.variaveis.length >= 2;

  return (
    <Acordeao titulo={t("Opções do gráfico")} Icone={SlidersHorizontal}>
      {secoes.includes("comparacao") ? (
        <>
          <Chave
            titulo={t("Comparar com período anterior")}
            ligado={rascunho.comparar}
            desabilitado={semTempo}
            dica={semTempo ? t("Adicione um campo de tempo.") : ""}
            aoMudar={(v) => mudar((r) => mudarComparacao(r, v))}
          />
          {rascunho.comparar ? (
            <Campo titulo={t("Modo de comparação")} ajuda={t("Define o período de referência para o cálculo da variação percentual.")}>
              <SeletorDaCasca
                aria-label={t("Modo de comparação")}
                className="h-8"
                valor={rascunho.comparacao ?? "equivalente"}
                opcoes={MODOS_DE_COMPARACAO.map((m) => ({ valor: m, rotulo: t(ROTULO_DO_MODO[m]) }))}
                aoMudar={(v) => v && mudar((r) => mudarComparacao(r, true, v))}
              />
            </Campo>
          ) : null}
        </>
      ) : null}

      {secoes.includes("barra100") ? (
        <Campo titulo={t("Formato da barra")}>
          <SeletorDaCasca
            aria-label={t("Formato da barra")}
            className="h-8"
            valor={o.barra100.formato}
            opcoes={FORMATOS_DA_BARRA_100.map((f) => ({ valor: f, rotulo: t(f === "resumo" ? "Resumo" : "Por data") }))}
            aoMudar={(v) => v && mudar((r) => mudarOpcoes(r, (x) => ({ ...x, barra100: { formato: v } })))}
          />
        </Campo>
      ) : null}

      {secoes.includes("funil") ? (
        <>
          <Campo titulo={t("Última etapa (fim do funil)")}>
            <SeletorDaCasca
              aria-label={t("Última etapa (fim do funil)")}
              className="h-8"
              desabilitado={etapas.length === 0}
              valor={o.funil.ultimaEtapa ?? ""}
              opcoes={[{ valor: "", rotulo: t("Padrão (última etapa)") }, ...etapas]}
              aoMudar={(v) => funil({ ultimaEtapa: v || null })}
            />
          </Campo>
          <Campo titulo={t("Etapas exibidas")} ajuda={t("Etapas ocultas não entram no cálculo.")}>
            <SeletorMultiploDaCasca
              aria-label={t("Etapas exibidas")}
              vazio={t("Selecione as etapas")}
              valores={o.funil.etapasExibidas ?? etapas.map((e) => e.valor)}
              opcoes={[...etapas]}
              aoMudar={(v) => funil({ etapasExibidas: v.length === etapas.length ? null : v })}
            />
          </Campo>
          <Campo titulo={t("Casas decimais")}>
            <SeletorDaCasca
              aria-label={t("Casas decimais")}
              className="h-8"
              valor={String(o.funil.casasDecimais)}
              opcoes={[
                { valor: "0", rotulo: t("Nenhuma (12%)") },
                { valor: "1", rotulo: t("Uma (12,3%)") },
                { valor: "2", rotulo: t("Duas (12,34%)") },
              ]}
              aoMudar={(v) => v && funil({ casasDecimais: Number(v) as 0 | 1 | 2 })}
            />
          </Campo>
          <Chave
            titulo={t("Destacar maior queda")}
            ajuda={t("Pinta de vermelho a etapa que menos avança. Vale para o cálculo por etapa anterior.")}
            ligado={o.funil.destacarMaiorQueda}
            aoMudar={(v) => funil({ destacarMaiorQueda: v })}
          />
          <Chave
            titulo={t("Meta de conversão entre etapas")}
            ajuda={t("Marca em vermelho as etapas abaixo da taxa mínima.")}
            ligado={o.funil.metaDeConversao.ligada}
            aoMudar={(v) => funil({ metaDeConversao: { ...o.funil.metaDeConversao, ligada: v } })}
          />
          {o.funil.metaDeConversao.ligada ? (
            <Campo titulo={t("Taxa mínima entre etapas (%)")}>
              <input
                inputMode="decimal"
                aria-label={t("Taxa mínima entre etapas (%)")}
                defaultValue={String(o.funil.metaDeConversao.taxaMinima).replace(".", ",")}
                onChange={(e) => {
                  const n = textoDoNumeroBr(e.target.value);
                  if (n !== null && n >= 0 && n <= 100) funil({ metaDeConversao: { ...o.funil.metaDeConversao, taxaMinima: n } });
                }}
                className="h-8 w-24 rounded-[4px] border border-casca-borda bg-surface px-2 text-[13px] outline-none focus-visible:border-casca-marca"
              />
            </Campo>
          ) : null}
          <Campo titulo={t("Destaque")} ajuda={t("O que fica em evidência na barra e no total.")}>
            <SeletorDaCasca
              aria-label={t("Destaque")}
              className="h-8"
              valor={o.funil.destaque}
              opcoes={[
                { valor: "valor", rotulo: t("Valor (1.240)") },
                { valor: "percentual", rotulo: t("Percentual (12%)") },
              ]}
              aoMudar={(v) => v && funil({ destaque: v })}
            />
          </Campo>
          <Campo titulo={t("Formato dos números")}>
            <SeletorDaCasca
              aria-label={t("Formato dos números")}
              className="h-8"
              valor={o.funil.formatoDosNumeros}
              opcoes={[
                { valor: "completo", rotulo: t("Completo (1.240)") },
                { valor: "compacto", rotulo: t("Compacto (1,2 mil)") },
              ]}
              aoMudar={(v) => v && funil({ formatoDosNumeros: v })}
            />
          </Campo>
          <Campo titulo={t("Cores das etapas")}>
            <SeletorDaCasca
              aria-label={t("Cores das etapas")}
              className="h-8"
              valor={o.funil.cores}
              opcoes={CORES_DO_FUNIL.map((c) => ({ valor: c, rotulo: t(ROTULO_DAS_CORES[c]) }))}
              aoMudar={(v) => v && funil({ cores: v })}
            />
          </Campo>
          <Chave titulo={t("Última etapa em verde")} ligado={o.funil.ultimaEmVerde} aoMudar={(v) => funil({ ultimaEmVerde: v })} />
          <Chave
            titulo={t("Gargalo entre etapas")}
            ajuda={t("Desligado, as etapas ficam conectadas como um funil contínuo.")}
            ligado={o.funil.gargalo}
            aoMudar={(v) => funil({ gargalo: v })}
          />
        </>
      ) : null}

      {secoes.includes("ranking") ? (
        <Campo titulo={t("Faixas fora da meta")} ajuda={t("Define quais faixas contam como fora da meta e a cor do percentual.")}>
          <SeletorMultiploDaCasca
            aria-label={t("Faixas fora da meta")}
            vazio={segundaVariavel ? t("Selecione as faixas") : t("Adicione uma segunda variável")}
            desabilitado={!segundaVariavel}
            valores={o.ranking.faixasForaDaMeta}
            opcoes={etapas.map((e) => ({ valor: e.valor, rotulo: e.rotulo }))}
            aoMudar={(v) => mudar((r) => mudarOpcoes(r, (x) => ({ ...x, ranking: { faixasForaDaMeta: v } })))}
          />
        </Campo>
      ) : null}

      {secoes.includes("heatmap") ? (
        <>
          <Campo titulo={t("Escala de cor")}>
            <SeletorDaCasca
              aria-label={t("Escala de cor")}
              className="h-8"
              valor={o.heatmap.escala}
              opcoes={ESCALAS_DO_HEATMAP.map((e) => ({ valor: e, rotulo: t(e === "linear" ? "Linear" : "Percentil") }))}
              aoMudar={(v) => v && mudar((r) => mudarOpcoes(r, (x) => ({ ...x, heatmap: { ...x.heatmap, escala: v } })))}
            />
          </Campo>
          <Campo titulo={t("Janela de horas")}>
            <SeletorDaCasca
              aria-label={t("Janela de horas")}
              className="h-8"
              valor={o.heatmap.janela}
              opcoes={JANELAS_DO_HEATMAP.map((j) => ({ valor: j, rotulo: t(j === "24h" ? "24 horas" : "Comercial, 07h às 18h") }))}
              aoMudar={(v) => v && mudar((r) => mudarOpcoes(r, (x) => ({ ...x, heatmap: { ...x.heatmap, janela: v } })))}
            />
          </Campo>
        </>
      ) : null}
    </Acordeao>
  );
}
