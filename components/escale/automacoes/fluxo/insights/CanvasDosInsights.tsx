"use client";
import { useMemo } from "react";
import { ConnectionLineType, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Desenho } from "@/lib/automation/desenho-da-regra";
import { paraLigacoes, paraNos } from "@/lib/escale/automacoes/fluxo/nos";

import { OPCOES_DA_ARESTA, nodeTypes } from "../CanvasDoFluxo";

/**
 * O CANVAS SÓ DE LEITURA DOS INSIGHTS (07-011, 07-012; fork Escale, Fase 5C; I2): a regra como está
 * gravada, sem arrastar, ligar, selecionar nem paleta. Anda e dá zoom, como na Clint.
 */
export function CanvasDosInsights({ desenho, evento }: { desenho: Desenho; evento: string }) {
  const nos = useMemo(
    () => paraNos(desenho).map((n) => ({ ...n, data: { ...n.data, eventoDaRegra: evento } })),
    [desenho, evento],
  );
  const ligacoes = useMemo(() => paraLigacoes(desenho), [desenho]);
  return (
    <div className="relative h-full flex-1 bg-casca-fluxo" data-testid="canvas-dos-insights">
      <ReactFlow
        nodes={nos}
        edges={ligacoes}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={OPCOES_DA_ARESTA}
        connectionLineType={ConnectionLineType.Bezier}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable={false}
        panOnDrag
        zoomOnScroll
        deleteKeyCode={null}
        minZoom={0.25}
        maxZoom={1.15}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        proOptions={{ hideAttribution: false }}
      >
        <Controls position="bottom-left" showInteractive />
      </ReactFlow>
    </div>
  );
}
