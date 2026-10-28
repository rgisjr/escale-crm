"use client";
import { useState } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { CatalogoDaTela } from "@/lib/escale/indicadores/editor/catalogo-da-tela";
import {
  ROTULO_DA_GRANULARIDADE,
  granularidadesDisponiveis,
  horaDisponivel,
} from "@/lib/escale/indicadores/editor/periodo-do-editor";
import {
  manterIndicadores,
  mudarFixo,
  mudarGranularidade,
  mudarOpcoes,
  mudarPeriodo,
  trocarTipo,
  type RascunhoDoGrafico,
} from "@/lib/escale/indicadores/editor/rascunho";
import { usaTotais } from "@/lib/escale/indicadores/editor/tipos-de-grafico";
import type { TipoPrincipal } from "@/lib/escale/indicadores/graficos/tipos";
import type { Granularidade } from "@/lib/escale/indicadores/pergunta";
import { Play } from "@/lib/ui/icons-da-casca";

import { AjudaDoEditor } from "./AjudaDoEditor";
import { JanelaLimiteDeIndicadores } from "./JanelaLimiteDeIndicadores";
import { SeletorDePeriodoDoEditor } from "./SeletorDePeriodoDoEditor";
import { SeletorDeTipoDoGrafico } from "./SeletorDeTipoDoGrafico";

type Props = {
  rascunho: RascunhoDoGrafico;
  catalogo: CatalogoDaTela | undefined;
  mudar: (f: (r: RascunhoDoGrafico) => RascunhoDoGrafico) => void;
  pendente: boolean;
  aoExecutar: () => void;
};

const NENHUMA = "nenhuma";
const SEM_CATALOGO: CatalogoDaTela = { assuntos: [], camposPersonalizados: { negocio: [], contato: [], empresa: [] } };

/** A faixa de controles (10-012, 10-037, 10-048, 10-054): tipo, totais, período, fixar, agrupamento e Executar. */
export function FaixaDoEditor({ rascunho, catalogo, mudar, pendente, aoExecutar }: Props) {
  const t = useT();
  const [excedente, setExcedente] = useState<{ tipo: TipoPrincipal; limite: number } | null>(null);
  const { periodo, granularidade, campo } = rascunho.tempo;

  function escolherTipo(tipo: TipoPrincipal) {
    const res = trocarTipo(rascunho, tipo);
    if ("excede" in res) setExcedente({ tipo, limite: res.excede.limite });
    else mudar(() => res.rascunho);
  }

  return (
    <div className="flex flex-wrap items-center gap-6 border-b border-casca-divisoria px-2 py-5">
      <SeletorDeTipoDoGrafico tipo={rascunho.tipo} aoEscolher={escolherTipo} />
      {usaTotais(rascunho.tipo) ? (
        <CaixaDaCasca
          marcada={rascunho.opcoes.tabela.totais}
          rotulo={t("Adicionar totais")}
          aoMudar={(v) => mudar((r) => mudarOpcoes(r, (o) => ({ ...o, tabela: { ...o.tabela, totais: v } })))}
        />
      ) : null}
      <SeletorDePeriodoDoEditor periodo={periodo} aoMudar={(p) => mudar((r) => mudarPeriodo(r, p))} />
      <label className="flex items-center gap-2 text-[13px] text-casca-texto">
        <InterruptorDaCasca
          aria-label={t("Fixar este período")}
          ligado={rascunho.tempo.fixo}
          aoMudar={(v) => mudar((r) => mudarFixo(r, v))}
        />
        {t("Fixar este período")}
        <AjudaDoEditor
          texto={t("Quando ativado, este gráfico ignora o filtro de data do dashboard e sempre exibe o período selecionado acima.")}
        />
      </label>
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-casca-suave">{t("Agrupamento por")}</span>
        <span
          className="w-[120px]"
          title={campo && !horaDisponivel(periodo) ? t("Disponível só para períodos de até 31 dias.") : undefined}
        >
          <SeletorDaCasca
            aria-label={t("Agrupamento por")}
            className="h-8 bg-casca-busca"
            valor={granularidade ?? NENHUMA}
            desabilitado={!campo}
            opcoes={granularidadesDisponiveis(periodo).map(({ g, ligada }) => ({
              valor: g ?? NENHUMA,
              rotulo: t(ROTULO_DA_GRANULARIDADE[g ?? NENHUMA]),
              desabilitada: !ligada,
            }))}
            aoMudar={(v) => v && mudar((r) => mudarGranularidade(r, v === NENHUMA ? null : (v as Granularidade)))}
          />
        </span>
      </div>
      {pendente ? (
        <button
          type="button"
          onClick={aoExecutar}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-casca-marca px-4 text-[13px] font-medium text-white hover:bg-casca-marca-forte"
        >
          <Play size={14} aria-hidden />
          {t("Executar")}
        </button>
      ) : null}
      {excedente ? (
        <JanelaLimiteDeIndicadores
          tipo={excedente.tipo}
          limite={excedente.limite}
          indicadores={rascunho.indicadores}
          catalogo={catalogo ?? SEM_CATALOGO}
          aoCancelar={() => setExcedente(null)}
          aoConfirmar={(escolhidos) => {
            mudar((r) => manterIndicadores(r, excedente.tipo, escolhidos));
            setExcedente(null);
          }}
        />
      ) : null}
    </div>
  );
}
