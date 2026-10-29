"use client";
import { useCallback, useEffect, useState } from "react";

import {
  colunasGuardadas,
  gravarColunas,
  type ColunaDoDetalhamentoNaTela,
} from "@/lib/escale/indicadores/graficos/detalhamento";

/** As colunas escolhidas do detalhamento, guardadas no navegador por gráfico (T20); sempre fica uma. */
export function useColunasDoDetalhamento(graficoId: string, disponiveis: readonly ColunaDoDetalhamentoNaTela[]) {
  // O navegador só é lido depois da hidratação: o primeiro render usa o padrão, igual ao HTML do servidor.
  const [escolhidas, setEscolhidas] = useState<string[]>(() => disponiveis.filter((c) => c.padrao).map((c) => c.chave));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com o armazenamento do navegador
    setEscolhidas(colunasGuardadas(graficoId, disponiveis));
    // `disponiveis` muda de identidade a cada render; só o gráfico reabre as colunas guardadas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graficoId]);
  const gravar = useCallback(
    (proximas: string[]) => {
      setEscolhidas(proximas);
      gravarColunas(graficoId, proximas);
    },
    [graficoId],
  );
  const alternar = (chave: string) => {
    if (escolhidas.includes(chave)) {
      if (escolhidas.length > 1) gravar(escolhidas.filter((c) => c !== chave));
      return;
    }
    gravar(disponiveis.map((c) => c.chave).filter((c) => c === chave || escolhidas.includes(c)));
  };
  const todas = () => gravar(disponiveis.filter((c) => c.padrao).map((c) => c.chave));
  return { escolhidas, alternar, todas };
}
