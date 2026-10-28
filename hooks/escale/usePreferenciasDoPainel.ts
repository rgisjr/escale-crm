"use client";
import { useCallback, useState } from "react";

import { FILTRO_PADRAO, enxugarFiltroDoPainel } from "@/lib/escale/indicadores/painel/filtro";
import {
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
 * aplicado, a faixa aberta e o "Atualizar a cada". Lê no primeiro render do cliente e grava a cada mudança.
 */
export function usePreferenciasDoPainel(painelId: string) {
  const [estado, setEstado] = useState<EstadoGuardado>(() => lerEstado(painelId));
  const [intervalo, setIntervalo] = useState<Intervalo>(() => lerIntervalo());

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
