import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider, type NodeProps } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/escale/useComentarios", () => ({
  useContasSociais: () => ({ contas: [], carregando: false }),
}));
vi.mock("@/hooks/webhooks/useWebhookSources", () => ({
  useWebhookSources: () => ({ data: { data: [] } }),
  usePipelines: () => ({ data: { data: [] } }),
  usePipelineStages: () => ({ data: undefined }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: [] }),
  channelLabel: () => "",
}));

import type { NoDaAutomacao } from "@/app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao";
import { InsightsDoNoProvider, type InsightsDoNo } from "@/components/escale/automacoes/fluxo/insights/contexto";
import { NoDoFluxo } from "@/components/escale/automacoes/fluxo/NoDoFluxo";
import type { DadosDaCaixa, TelaDoGatilho } from "@/lib/automation/desenho-da-regra";
import { csvDasExecucoes } from "@/lib/escale/automacoes/insights/csv";
import { cartoesDoPasso } from "@/lib/escale/automacoes/insights/regras";
import type { LinhaDaExecucao, ResumoDaAutomacao } from "@/lib/escale/automacoes/insights/tipos";
import { cartoesDoGatilhoDeComentario, type ResumoDosComentarios } from "@/lib/escale/comentarios/resumo";

/** Fase 10B (D15): os números do gatilho de comentário e o passo Instagram nos Insights. */
const TELA: TelaDoGatilho = {
  fonte: null,
  data: { pipeline_id: "", campo: "", dias: "7" },
  tempo: { dias: "7", direcao: "da_equipe", proteger_pela_agenda: false },
};
const RESUMO: ResumoDaAutomacao = {
  total: 20,
  sucesso: 12,
  parcial: 0,
  falhou: 8,
  adiado: 0,
  ultima: null,
  passos: [{ indice: 0, tipo: "send_instagram_message", sucesso: 12, erro: 8, esperando: 0 }],
};
const COMENTARIOS: ResumoDosComentarios = {
  comentarios: 12345,
  repetidos: 3,
  directs: 9,
  directs_com_falha: 1,
  respostas: 9,
  respostas_com_falha: 1,
};

function montar(data: DadosDaCaixa, insights: Partial<InsightsDoNo>, evento = "comment.received") {
  const props = { id: "gatilho", data: { ...data, eventoDaRegra: evento }, selected: false } as unknown as NodeProps<NoDaAutomacao>;
  const valor: InsightsDoNo = {
    resumo: RESUMO,
    carregando: false,
    erro: false,
    acoesDosPassos: new Map(),
    aoAbrir: vi.fn(),
    ...insights,
  };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReactFlowProvider>
        <InsightsDoNoProvider valor={valor}>
          <NoDoFluxo {...props} />
        </InsightsDoNoProvider>
      </ReactFlowProvider>
    </QueryClientProvider>,
  );
}
const gatilho = (evento: string): DadosDaCaixa => ({ kind: "gatilho", evento, tela: TELA });

describe("nó do gatilho de comentário nos Insights", () => {
  it("mostra Comentários, Repetidos, Respostas públicas e Respostas com falha, em pt-BR e sem clique", () => {
    montar(gatilho("comment.received"), { comentarios: COMENTARIOS });
    for (const [rotulo, valor] of [
      ["Comentários", "12.345"],
      ["Repetidos", "3"],
      ["Respostas públicas", "9"],
      ["Respostas com falha", "1"],
    ]) {
      const botao = screen.getByText(rotulo!).closest("button") as HTMLButtonElement;
      expect(botao.textContent).toContain(valor);
    }
    expect(screen.getByText("Repetidos").closest("button")!.getAttribute("title")).toBe(
      "Pessoas que já tinham recebido esta automação: o fluxo não rodou de novo.",
    );
  });

  it("outro gatilho não ganha o overview", () => {
    montar(gatilho("lead.created"), { comentarios: COMENTARIOS }, "lead.created");
    expect(screen.queryByText("Comentários")).toBeNull();
    expect(screen.queryByText("Overview de resultados")).toBeNull();
  });
});

describe("cartões e rótulos", () => {
  it("cartoesDoGatilhoDeComentario traz os quatro sem filtro", () => {
    const cartoes = cartoesDoGatilhoDeComentario(COMENTARIOS);
    expect(cartoes.map((c) => c.chave)).toEqual(["comentarios", "repetidos", "respostas", "respostas_com_falha"]);
    expect(cartoes.every((c) => c.filtro === null)).toBe(true);
  });

  it("o passo Instagram tem os cartões de envio (Enviados / Esperando / Erro no envio)", () => {
    const cartoes = cartoesDoPasso(RESUMO, [{ indice: 0, tipo: "send_instagram_message" }], "send_instagram_message");
    expect(cartoes.map((c) => [c.rotulo, c.valor])).toEqual([
      ["Enviados", 12],
      ["Esperando", 0],
      ["Erro no envio", 8],
    ]);
  });

  it("o CSV usa o rótulo do passo Instagram", () => {
    const linhas: LinhaDaExecucao[] = [
      {
        id: "r1",
        status: "failed",
        criadaEm: "2026-11-01T15:00:00Z",
        eventoId: "e1",
        resultados: [{ type: "send_instagram_message", status: "failed", error: "botoes_recusados" }],
        contato: null,
        negocio: null,
      },
    ];
    const csv = csvDasExecucoes(linhas, [{ type: "send_instagram_message" }], (s) => s, "America/Sao_Paulo", (r) => r.error ?? "");
    expect(csv).toContain("1. Enviar mensagem no Instagram");
  });
});
