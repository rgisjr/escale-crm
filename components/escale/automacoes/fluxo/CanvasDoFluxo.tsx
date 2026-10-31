"use client";
import { useMemo } from "react";
import {
  ConnectionLineType,
  Controls,
  MarkerType,
  ReactFlow,
  useReactFlow,
  type EdgeMouseHandler,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { DND_DA_AUTOMACAO } from "@/app/app/webhooks/automacoes/[id]/_components/PaletaDaAutomacao";
import type { NoDaAutomacao } from "@/app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao";
import type { PassoDaPaleta } from "@/lib/escale/automacoes/fluxo/paleta";

import { NoDoFluxo } from "./NoDoFluxo";
import type { EstadoDoFluxo } from "./useFluxo";

// Fora do componente: o React Flow remonta os nós se `nodeTypes` muda a cada render.
const nodeTypes: NodeTypes = { gatilho: NoDoFluxo, condicoes: NoDoFluxo, acao: NoDoFluxo };

const OPCOES_DA_ARESTA = {
  type: "default",
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "var(--color-casca-fluxo-aresta)" },
} as const;

/**
 * O CANVAS DO FLUXO (07-013, 07-026; D15, D16): fundo lilás liso, arestas curvas com
 * seta, zoom de 0,25 a 1,15 e os controles no canto de baixo à esquerda. Clicar numa
 * aresta a remove; Delete com um passo selecionado pede a confirmação.
 */
export function CanvasDoFluxo({
  fluxo,
  aoClicarNo,
  aoClicarFundo,
  aoSoltar,
  aoPedirRemover,
}: {
  fluxo: EstadoDoFluxo;
  aoClicarNo: (id: string) => void;
  aoClicarFundo: () => void;
  aoSoltar: (passo: PassoDaPaleta, posicao: { x: number; y: number }) => void;
  aoPedirRemover: (id: string) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const { nos, ligacoes, evento, selecionado } = fluxo;

  const nosNaTela = useMemo(
    () => nos.map((n) => ({ ...n, selected: n.id === selecionado, data: { ...n.data, eventoDaRegra: evento } })),
    [nos, selecionado, evento],
  );

  const onNodeClick: NodeMouseHandler<NoDaAutomacao> = (_, no) => aoClicarNo(no.id);
  const onEdgeClick: EdgeMouseHandler = (_, ligacao) => fluxo.removerLigacao(ligacao.id);

  function soltar(e: React.DragEvent) {
    e.preventDefault();
    const passo = e.dataTransfer.getData(DND_DA_AUTOMACAO) as PassoDaPaleta | "";
    if (!passo) return;
    const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    aoSoltar(passo, { x: Math.round(p.x - 176), y: Math.round(p.y - 24) });
  }

  return (
    <div
      className="relative h-full flex-1 bg-casca-fluxo"
      data-testid="canvas-do-fluxo"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={soltar}
      onKeyDown={(e) => {
        const alvo = e.target as HTMLElement;
        const digitando = /INPUT|TEXTAREA|SELECT/.test(alvo.tagName) || alvo.isContentEditable;
        const no = nos.find((n) => n.id === selecionado);
        if ((e.key === "Delete" || e.key === "Backspace") && !digitando && no && no.data.kind !== "gatilho") {
          e.preventDefault();
          aoPedirRemover(no.id);
        }
      }}
    >
      <ReactFlow
        nodes={nosNaTela}
        edges={ligacoes}
        nodeTypes={nodeTypes}
        onNodesChange={fluxo.onNodesChange}
        onEdgesChange={fluxo.onEdgesChange}
        onConnect={fluxo.ligar}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={aoClicarFundo}
        deleteKeyCode={null}
        defaultEdgeOptions={OPCOES_DA_ARESTA}
        connectionLineType={ConnectionLineType.Bezier}
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
