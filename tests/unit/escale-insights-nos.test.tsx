import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider, type NodeProps } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/webhooks/useWebhookSources", () => ({
  useWebhookSources: () => ({ data: { data: [] } }),
  usePipelines: () => ({ data: { data: [] } }),
  usePipelineStages: () => ({ data: undefined }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: [] }),
  channelLabel: (s: { display_name: string | null }) => s.display_name ?? "",
}));
vi.mock("@/hooks/ai/useAgents", () => ({ useAgentsList: () => ({ data: [] }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));

import type { NoDaAutomacao } from "@/app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao";
import { AcoesDoNoContext } from "@/components/escale/automacoes/fluxo/BarraDoNo";
import { InsightsDoNoProvider, type InsightsDoNo } from "@/components/escale/automacoes/fluxo/insights/contexto";
import { NoDoFluxo } from "@/components/escale/automacoes/fluxo/NoDoFluxo";
import type { DadosDaCaixa, TelaDoGatilho } from "@/lib/automation/desenho-da-regra";
import { dadosDoGrupo } from "@/lib/escale/automacoes/fluxo/grupos";
import type { ResumoDaAutomacao } from "@/lib/escale/automacoes/insights/tipos";

const TELA: TelaDoGatilho = {
  fonte: null,
  data: { pipeline_id: "", campo: "", dias: "7" },
  tempo: { dias: "7", direcao: "da_equipe", proteger_pela_agenda: false },
};

const RESUMO: ResumoDaAutomacao = {
  total: 9602,
  sucesso: 9000,
  parcial: 0,
  falhou: 10,
  adiado: 592,
  ultima: null,
  passos: [
    { indice: 0, tipo: "send_whatsapp_message", sucesso: 7, erro: 2, esperando: 1 },
    { indice: 1, tipo: "call_webhook", sucesso: 5, erro: 3, esperando: 0 },
  ],
};

const acao = (type: string): DadosDaCaixa => ({ kind: "acao", acao: { type, config: {} } });

function montar(
  id: string,
  data: DadosDaCaixa,
  insights: Partial<InsightsDoNo> | null,
  over: { selected?: boolean } = {},
) {
  const aoAbrir = vi.fn();
  const props = { id, data: { ...data, eventoDaRegra: "lead.created" }, selected: over.selected ?? false } as unknown as NodeProps<NoDaAutomacao>;
  const no = <NoDoFluxo {...props} />;
  const valor: InsightsDoNo = {
    resumo: RESUMO,
    carregando: false,
    erro: false,
    acoesDosPassos: new Map([
      ["acao-1", [{ indice: 0, tipo: "send_whatsapp_message" }]],
      ["acao-2", [{ indice: 1, tipo: "call_webhook" }]],
    ]),
    aoAbrir,
    ...insights,
  };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReactFlowProvider>
        <AcoesDoNoContext.Provider value={{ duplicar: vi.fn(), remover: vi.fn() }}>
          {insights === null ? no : <InsightsDoNoProvider valor={valor}>{no}</InsightsDoNoProvider>}
        </AcoesDoNoContext.Provider>
      </ReactFlowProvider>
    </QueryClientProvider>,
  );
  return aoAbrir;
}

describe("nó fora dos Insights", () => {
  it("é o da 5B: barra no passo e nenhum Overview", () => {
    montar("acao-1", acao("send_whatsapp_message"), null);
    expect(screen.queryByText("Overview de resultados")).toBeNull();
    expect(screen.getByRole("button", { name: "Remover passo" })).toBeTruthy();
  });
});

describe("nó nos Insights", () => {
  it("gatilho: nenhum cartão", () => {
    montar("gatilho", { kind: "gatilho", evento: "lead.created", tela: TELA }, {});
    expect(screen.queryByText("Overview de resultados")).toBeNull();
  });

  it("condições: 'Passaram' com o total em pt-BR e a dica no title", () => {
    montar("condicoes", { kind: "condicoes", linhas: [] }, {});
    expect(screen.getByText("Overview de resultados")).toBeTruthy();
    const cartao = screen.getByRole("button", { name: /Passaram/ });
    expect(cartao.textContent).toContain("9.602");
    expect(cartao.getAttribute("title")).toContain("Quem não passou não fica registrado");
  });

  it("WhatsApp: Enviados, Esperando e Erro no envio; clicar abre a listagem do passo", async () => {
    const aoAbrir = montar("acao-1", acao("send_whatsapp_message"), {});
    expect(screen.getByRole("button", { name: /Enviados/ }).textContent).toContain("7");
    expect(screen.getByRole("button", { name: /Esperando/ }).textContent).toContain("1");
    await userEvent.click(screen.getByRole("button", { name: /Erro no envio/ }));
    expect(aoAbrir).toHaveBeenCalledWith({
      origem: "passo",
      acoes: [{ indice: 0, tipo: "send_whatsapp_message" }],
      tipoDoCartao: "send_whatsapp_message",
      resultados: ["erro"],
    });
  });

  it("webhook: Acionaram soma tudo e Webhook falhou", () => {
    montar("acao-2", acao("call_webhook"), {});
    expect(screen.getByRole("button", { name: /Acionaram/ }).textContent).toContain("8");
    expect(screen.getByRole("button", { name: /Webhook falhou/ }).textContent).toContain("3");
  });

  it("passo 'Ações' junta as linhas das ações dele", () => {
    montar("acao-2", dadosDoGrupo([{ type: "call_webhook", config: {} }]), {});
    expect(screen.getByRole("button", { name: /Acionaram/ }).textContent).toContain("8");
    expect(screen.getByRole("button", { name: /Com erro/ }).textContent).toContain("3");
  });

  it("carregando: 3 esqueletos (1 nas condições)", () => {
    montar("acao-1", acao("send_whatsapp_message"), { carregando: true });
    expect(screen.getAllByTestId("esqueleto-do-no")).toHaveLength(3);
  });

  it("carregando nas condições: 1 esqueleto", () => {
    montar("condicoes", { kind: "condicoes", linhas: [] }, { carregando: true });
    expect(screen.getAllByTestId("esqueleto-do-no")).toHaveLength(1);
  });

  it("erro: traços e botões desligados", () => {
    montar("acao-1", acao("send_whatsapp_message"), { erro: true, resumo: null });
    const botoes = screen.getAllByRole("button");
    expect(botoes.length).toBeGreaterThan(0);
    for (const b of botoes) {
      expect((b as HTMLButtonElement).disabled).toBe(true);
      expect(b.textContent).toContain("—");
    }
  });

  it("sem barra do nó e sem borda de alerta, mesmo com problema", () => {
    montar("acao-1", { ...acao("send_whatsapp_message"), problemas: [{ mensagem: "x", campo: "y" }] } as DadosDaCaixa, {}, { selected: true });
    expect(screen.queryByRole("button", { name: "Remover passo" })).toBeNull();
    expect(screen.getByTestId("no-acao-1").className).not.toContain("border-casca-alerta");
  });
});
