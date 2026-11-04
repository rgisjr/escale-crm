import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider, type NodeProps } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
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

import type { NoDaAutomacao } from "@/app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao";
import { AcoesDoNoContext } from "@/components/escale/automacoes/fluxo/BarraDoNo";
import { NoDoFluxo } from "@/components/escale/automacoes/fluxo/NoDoFluxo";
import type { DadosDaCaixa } from "@/lib/automation/desenho-da-regra";

function montar(id: string, data: DadosDaCaixa) {
  const props = { id, data: { ...data, eventoDaRegra: "message.received" }, selected: false } as unknown as NodeProps<NoDaAutomacao>;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReactFlowProvider>
        <AcoesDoNoContext.Provider value={{ duplicar: vi.fn(), remover: vi.fn() }}>
          <NoDoFluxo {...props} />
        </AcoesDoNoContext.Provider>
      </ReactFlowProvider>
    </QueryClientProvider>,
  );
}

const botoes = [{ id: "b-1", titulo: "Sim" }, { id: "b-2", titulo: "Não" }];
const whats = (extra: Record<string, unknown>): DadosDaCaixa => ({
  kind: "acao",
  acao: { type: "send_whatsapp_message", config: { channel_session_id: "conversation", passos: [{ tipo: "interativo", interativo: { tipo: "botoes", corpo: "Quer?", botoes } }], ...extra } },
});

describe("nós do modo fluxo: uma saída por ramo", () => {
  it("Atraso: título vermelho, 'Aguardar' e Próximo passo", () => {
    montar("a", { kind: "atraso", quantidade: 30, unidade: "segundos", janela: null });
    expect(screen.getByText("Atraso")).toBeTruthy();
    expect(screen.getByText("Aguardar 30 segundos")).toBeTruthy();
    expect(screen.getByTestId("saida-proximo")).toBeTruthy();
  });

  it("WhatsApp com botões e tempo de resposta: Próximo passo, um por botão e Não respondeu", () => {
    montar("m", whats({ tempo_de_resposta: { quantidade: 15, unidade: "minutos" } }));
    expect(["saida-proximo", "saida-botao:b-1", "saida-botao:b-2", "saida-nao_respondeu"].every((id) => screen.queryByTestId(id))).toBe(true);
    expect(screen.getByText("Sim")).toBeTruthy();
    expect(screen.getByText("Não respondeu")).toBeTruthy();
  });

  it("WhatsApp sem tempo de resposta não tem a saída Não respondeu", () => {
    montar("m", whats({}));
    expect(screen.queryByTestId("saida-nao_respondeu")).toBeNull();
  });

  it("Condições em grupos: uma saída por grupo e a faixa 'Não corresponde a nenhuma condição'", () => {
    montar("c", { kind: "condicoes", linhas: [], grupos: [{ id: "g1", modo: "todas", linhas: [] }, { id: "g2", modo: "qualquer", linhas: [] }] });
    expect(screen.getByTestId("saida-grupo:g1")).toBeTruthy();
    expect(screen.getByTestId("saida-grupo:g2")).toBeTruthy();
    expect(screen.getByTestId("saida-nenhuma").textContent).toBe("Não corresponde a nenhuma condição");
    expect(screen.queryByTestId("saida-proximo")).toBeNull();
    expect(screen.getByText("qualquer condição")).toBeTruthy();
  });

  it("Condições de hoje (sem grupos) seguem com o Próximo passo", () => {
    montar("c", { kind: "condicoes", linhas: [] });
    expect(screen.getByTestId("saida-proximo")).toBeTruthy();
  });
});
