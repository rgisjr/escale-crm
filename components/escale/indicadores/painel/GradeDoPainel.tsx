"use client";
import ReactGridLayout, { useContainerWidth, verticalCompactor } from "react-grid-layout";
import "react-grid-layout/css/styles.css";

import { useAcoesDosGraficos } from "@/hooks/escale/useGraficosDoPainel";
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { layoutsMudados } from "@/lib/escale/indicadores/graficos/regras-do-card";
import {
  ALTURA_DA_LINHA,
  COLUNAS_DA_GRADE,
  ESPACO_DA_GRADE,
  TAMANHO_MINIMO,
  type GraficoDoPainel,
} from "@/lib/escale/indicadores/graficos/tipos";
import type { Intervalo } from "@/lib/escale/indicadores/painel/preferencias";
import type { FiltroDoPainel } from "@/lib/escale/indicadores/pergunta";
import { useTelaGrande } from "@/lib/escale/usa-tela-grande";

import { CardDoGrafico } from "./CardDoGrafico";

/**
 * A GRADE DO PAINEL (prints 10-006, 10-021): `react-grid-layout` de 24 colunas, linha de 40 px e espaço
 * de 12 px, mínimo 2 × 2, compactação vertical e alça só no canto inferior direito. No celular, uma
 * coluna e sem arrastar. Ao soltar, grava só os itens que mudaram. Só gerente para cima arruma a grade.
 */
export function GradeDoPainel({
  graficos,
  filtro,
  rodada,
  intervalo,
  papel,
  painelId,
}: {
  graficos: GraficoDoPainel[];
  filtro: FiltroDoPainel;
  rodada: number;
  intervalo: Intervalo;
  papel: Role;
  painelId: string;
}) {
  const telaGrande = useTelaGrande();
  const { width, mounted, containerRef } = useContainerWidth();
  const { salvarLayout } = useAcoesDosGraficos(painelId);
  const podeEditar = roleAtLeast(papel, "manager") && telaGrande;

  const ordenados = [...graficos].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);
  const layout = ordenados.map((g) => ({
    i: g.id,
    ...(telaGrande ? g.layout : { ...g.layout, x: 0, w: 1 }),
    minW: telaGrande ? TAMANHO_MINIMO : 1,
    minH: TAMANHO_MINIMO,
  }));

  function salvar(novo: ReadonlyArray<{ i: string; x: number; y: number; w: number; h: number }>) {
    if (!podeEditar) return;
    const mudados = layoutsMudados(graficos, novo);
    if (mudados.length > 0) salvarLayout.mutate(mudados);
  }

  return (
    <div ref={containerRef} className="mx-[11px] mt-3 mb-[100px]">
      {mounted ? (
        <ReactGridLayout
          width={width}
          layout={layout}
          gridConfig={{ cols: telaGrande ? COLUNAS_DA_GRADE : 1, rowHeight: ALTURA_DA_LINHA, margin: [ESPACO_DA_GRADE, ESPACO_DA_GRADE] }}
          dragConfig={{ enabled: podeEditar, cancel: ".nao-arrasta" }}
          resizeConfig={{ enabled: podeEditar, handles: ["se"] }}
          compactor={verticalCompactor}
          onDragStop={salvar}
          onResizeStop={salvar}
        >
          {ordenados.map((g) => (
            <div key={g.id}>
              <CardDoGrafico
                grafico={g}
                filtro={filtro}
                rodadaDoPainel={rodada}
                intervalo={intervalo}
                papel={papel}
                painelId={painelId}
                total={graficos.length}
              />
            </div>
          ))}
        </ReactGridLayout>
      ) : null}
    </div>
  );
}
