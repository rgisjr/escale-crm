"use client";

import type { NodeProps } from "@xyflow/react";

import type { RFNode } from "@/lib/followup/graph-mappers";
import { useT } from "@/hooks/i18n/useT";
import { NodeCard } from "./NodeCard";
import { describeNodeConfig, NODE_VISUALS } from "./nodeVisuals";

/** FORK ESCALE · 5D: representação defensiva quando um ponteiro da automação é aberto no editor de follow-up. */
export function AutomationActionsNode({ id, data, selected }: NodeProps<RFNode>) {
  const t = useT();
  return (
    <NodeCard
      id={id}
      visual={NODE_VISUALS.acoes_da_automacao}
      label={data.label}
      subtitle={describeNodeConfig("acoes_da_automacao", data.config, t)}
      selected={selected}
      errors={data.errors}
    />
  );
}
