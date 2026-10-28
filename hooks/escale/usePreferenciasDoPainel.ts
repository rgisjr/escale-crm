"use client";
import { useCallback, useEffect, useState } from "react";

import { FILTRO_PADRAO, enxugarFiltroDoPainel } from "@/lib/escale/indicadores/painel/filtro";
import {
  ESTADO_PADRAO,
  gravarEstado,
  gravarIntervalo,
  lerEstado,
  lerIntervalo,
  type EstadoGuardado,
  type Intervalo,
} from "@/lib/escale/indicadores/painel/preferencias";
import type { FiltroDoPainel } from "@/lib/escale/indicadores/pergunta";

/**
 * O que o painel aberto lembra no navegador (fork Escale, Fase 7C): o filtro por painel, o filtro salvo
 * aplicado, a faixa aberta e o "Atualizar a cada". Lê depois de montar e grava a cada mudança.
 */
export function usePreferenciasDoPainel(painelId: string) {
  // O navegador só é lido depois de montar: ler no inicializador diverge do HTML do servidor na hidratação.
  const [estado, setEstado] = useState<EstadoGuardado>(ESTADO_PADRAO);
  const [intervalo, setIntervalo] = useState<Intervalo>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setEstado(lerEstado(painelId));
    setIntervalo(lerIntervalo());
    setPronto(true);
  }, [painelId]);

  const trocar = useCallback(
    (mudar: (e: EstadoGuardado) => EstadoGuardado) =>
      setEstado((atual) => {
        const novo = mudar(atual);
        gravarEstado(painelId, novo);
        return novo;
      }),
    [painelId],
  );

  return {
    /** `false` até o navegador ser lido: a grade espera, para não consultar com o filtro padrão antes da hora. */
    pronto,
    filtro: estado.filtro,
    filtroSalvoId: estado.filtroSalvoId,
    faixaAberta: estado.faixaAberta,
    intervalo,
    /** O filtro salvo aplicado continua: o seletor passa a mostrar "alterado". */
    mudarFiltro: (f: FiltroDoPainel) => trocar((e) => ({ ...e, filtro: enxugarFiltroDoPainel(f) })),
    aplicarSalvo: (id: string, f: FiltroDoPainel) =>
      trocar((e) => ({ ...e, filtro: enxugarFiltroDoPainel(f), filtroSalvoId: id })),
    aplicarPadrao: () => trocar((e) => ({ ...e, filtro: FILTRO_PADRAO, filtroSalvoId: null })),
    alternarFaixa: () => trocar((e) => ({ ...e, faixaAberta: !e.faixaAberta })),
    mudarIntervalo: (v: Intervalo) => {
      gravarIntervalo(v);
      setIntervalo(v);
    },
  };
}
