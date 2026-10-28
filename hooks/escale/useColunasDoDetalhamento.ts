"use client";
import { useCallback, useState } from "react";

import {
  colunasGuardadas,
  gravarColunas,
  type ColunaDoDetalhamentoNaTela,
} from "@/lib/escale/indicadores/graficos/detalhamento";

/** As colunas escolhidas do detalhamento, guardadas no navegador por gráfico (T20); sempre fica uma. */
export function useColunasDoDetalhamento(graficoId: string, disponiveis: readonly ColunaDoDetalhamentoNaTela[]) {
  const [escolhidas, setEscolhidas] = useState<string[]>(() => colunasGuardadas(graficoId, disponiveis));
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
