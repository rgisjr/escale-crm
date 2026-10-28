"use client";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCatalogoDeIndicadores } from "@/hooks/escale/useCatalogoDeIndicadores";
import { useRascunhoDoGrafico } from "@/hooks/escale/useRascunhoDoGrafico";
import { useResultadoDoGrafico } from "@/hooks/escale/useResultadoDoGrafico";
import type { Role } from "@/lib/auth/types";
import { perguntaDoRascunho, rascunhoDoGrafico } from "@/lib/escale/indicadores/editor/pergunta-do-rascunho";
import { rascunhoNovo } from "@/lib/escale/indicadores/editor/rascunho";
import type { GraficoParaEditar } from "@/lib/escale/indicadores/graficos/banco";
import type { PainelDaLista } from "@/lib/escale/indicadores/paineis/tipos";

import { AreaDoGrafico } from "./AreaDoGrafico";
import { CabecalhoDoEditor } from "./CabecalhoDoEditor";
import { FaixaDoEditor } from "./FaixaDoEditor";
import { JanelaSalvarChart, type ConteudoDoGrafico } from "./JanelaSalvarChart";
import { LateralDoEditor } from "./LateralDoEditor";

const SEM_FILTRO_DO_PAINEL = {};

type Props = {
  modo: "novo" | "editar";
  grafico: GraficoParaEditar | null;
  painelDeOrigem: PainelDaLista | null;
  papel: Role;
};

/**
 * O EDITOR DE GRÁFICO (fork Escale, Fase 7D): lateral com Filtros e Opções, faixa de controles e a prévia, que
 * só consulta ao Executar (D10) e é desenhada pelo mesmo `DesenhoDoGrafico` do painel. Ao editar, a prévia
 * já roda uma vez para o gráfico aparecer.
 */
export function EditorDeGrafico({ modo, grafico, painelDeOrigem }: Props) {
  const catalogo = useCatalogoDeIndicadores();
  const inicial = useMemo(() => (grafico ? rascunhoDoGrafico(grafico) : rascunhoNovo()), [grafico]);
  const { rascunho, mudar, erros, foto, rodada, executar, validar, pendente } = useRascunhoDoGrafico(inicial, catalogo.data);
  const resultado = useResultadoDoGrafico({
    graficoId: grafico?.id ?? "novo",
    pergunta: foto,
    filtro: SEM_FILTRO_DO_PAINEL,
    ligado: foto !== null,
    rodada,
    intervaloMin: null,
  });
  const [salvando, setSalvando] = useState(false);

  const jaExecutou = useRef(false);
  useEffect(() => {
    if (modo === "editar" && catalogo.data && !jaExecutou.current) {
      jaExecutou.current = true;
      executar();
    }
  }, [modo, catalogo.data, executar]);

  const etapas = useMemo(
    () =>
      rascunho.tipo === "funil" && resultado.data
        ? resultado.data.linhas.map((l) => ({ valor: String(l.v0 ?? ""), rotulo: String(l.v0_rotulo ?? l.v0 ?? "") }))
        : [],
    [rascunho.tipo, resultado.data],
  );

  function conteudo(): ConteudoDoGrafico | null {
    if (!catalogo.data) return null;
    const res = perguntaDoRascunho(rascunho, catalogo.data);
    return res.ok ? { tipo: rascunho.tipo, pergunta: res.pergunta, opcoes: rascunho.opcoes } : null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <CabecalhoDoEditor
        modo={modo}
        nome={grafico?.nome ?? null}
        painelDeOrigem={painelDeOrigem ? { id: painelDeOrigem.id, nome: painelDeOrigem.nome } : null}
        aoSalvar={() => {
          if (validar()) setSalvando(true);
        }}
      />
      <div className="flex min-h-0 flex-1">
        <LateralDoEditor
          rascunho={rascunho}
          catalogo={catalogo.data}
          erroDoCatalogo={catalogo.isError}
          aoTentarOCatalogo={() => void catalogo.refetch()}
          erros={erros}
          mudar={mudar}
          etapasDoResultado={etapas}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <FaixaDoEditor rascunho={rascunho} catalogo={catalogo.data} mudar={mudar} pendente={pendente} aoExecutar={executar} />
          <AreaDoGrafico
            tipo={rascunho.tipo}
            foto={foto}
            opcoes={rascunho.opcoes}
            resultado={resultado.data}
            carregando={resultado.isFetching}
            erro={resultado.error}
            aoExecutar={executar}
          />
        </div>
      </div>
      {salvando ? (
        <JanelaSalvarChart
          modo={modo}
          grafico={grafico ? { id: grafico.id, painelId: grafico.painelId, nome: grafico.nome, descricao: grafico.descricao } : null}
          painelDeOrigem={painelDeOrigem?.id ?? null}
          conteudo={conteudo}
          aoFechar={() => setSalvando(false)}
        />
      ) : null}
    </div>
  );
}
