"use client";
import { useState } from "react";

import { CalendarioDePeriodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { useT } from "@/hooks/i18n/useT";
import {
  TIPOS_DE_DATA_DISPONIVEIS,
  comPeriodo,
  periodoDosFiltros,
  type PeriodoDoFiltro,
} from "@/lib/escale/filtros/periodo";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";

import { GatilhoComPainel } from "./GatilhoComPainel";

/**
 * "DATA" (fork Escale, Casca V4; print do usuário de 15/10,
 * `docs/escale/clint/prints-do-usuario/2026-10-15-filtro-data-aberto.png`): o
 * calendário da V1 com as abas de tipo, os atalhos e dois meses. As abas valem
 * criação, ganho e perda; a do relógio fica desligada (D3).
 *
 * A aba escolhida sem datas fica só na tela: filtro sem período não é filtro.
 * Trocar de aba com um período aplicado leva o período para o tipo novo.
 */
export function FiltroDeData({
  filtros,
  onMudar,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
}) {
  const t = useT();
  const aplicado = periodoDosFiltros(filtros);
  const [tipo, setTipo] = useState<PeriodoDoFiltro["tipo"]>(aplicado?.tipo ?? "criacao");
  const valor: PeriodoDoFiltro = aplicado && aplicado.tipo === tipo ? aplicado : { tipo };

  return (
    <GatilhoComPainel
      rotulo={t("Data")}
      contagem={aplicado ? 1 : 0}
      onLimpar={() => onMudar(comPeriodo(filtros, { tipo }))}
      className="w-auto p-0"
      testId="filtro-data"
    >
      <CalendarioDePeriodo
        valor={valor}
        tiposDisponiveis={[...TIPOS_DE_DATA_DISPONIVEIS]}
        aoMudar={(p) => {
          const soTrocouATela = p.tipo !== tipo && !p.de && !p.ate && aplicado !== null;
          setTipo(p.tipo);
          onMudar(
            comPeriodo(filtros, soTrocouATela && aplicado ? { ...aplicado, tipo: p.tipo } : p),
          );
        }}
      />
    </GatilhoComPainel>
  );
}
