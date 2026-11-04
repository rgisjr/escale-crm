"use client";

import type { NodeProps } from "@xyflow/react";

import type { RFNode } from "@/lib/followup/graph-mappers";
import { useT } from "@/hooks/i18n/useT";
import { NodeCard } from "./NodeCard";
import { describeNodeConfig, NODE_VISUALS } from "./nodeVisuals";

/** FORK ESCALE · 5D: representação defensiva ao abrir no editor de follow-up um fluxo da automação. */
export function AutomationConditionsNode({ id, data, selected }: NodeProps<RFNode>) {
  const t = useT();
  return (
    <NodeCard
      id={id}
      visual={NODE_VISUALS.condicoes_da_automacao}
      label={data.label}
      subtitle={describeNodeConfig("condicoes_da_automacao", data.config, t)}
      selected={selected}
      errors={data.errors}
    />
  );
}
