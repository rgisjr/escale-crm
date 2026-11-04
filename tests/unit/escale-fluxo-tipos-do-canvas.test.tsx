import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/webhooks/useWebhookSources", () => ({
  useWebhookSources: () => ({ data: { data: [] } }),
  usePipelines: () => ({ data: { data: [] } }),
  usePipelineStages: () => ({ data: undefined }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({ useChannelSessions: () => ({ data: [] }), channelLabel: () => "" }));
vi.mock("@/hooks/ai/useAgents", () => ({ useAgentsList: () => ({ data: [] }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));

import { nodeTypes } from "@/components/escale/automacoes/fluxo/CanvasDoFluxo";
import { NoDoFluxo } from "@/components/escale/automacoes/fluxo/NoDoFluxo";

// Os tipos de caixa que a rota `/fluxo` aceita (`desenhoSchema` em app/api/v1/automacoes-da-casca/[id]/fluxo/route.ts).
const TIPOS_DE_CAIXA = ["gatilho", "condicoes", "acao", "atraso"] as const;

describe("canvas do fluxo", () => {
  it.each(TIPOS_DE_CAIXA)("desenha a caixa '%s' com o nó do fluxo (nunca o nó padrão do React Flow)", (tipo) => {
    expect(nodeTypes[tipo]).toBe(NoDoFluxo);
  });
});
