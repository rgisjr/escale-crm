import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/webhooks/useWebhookSources", () => ({
  useWebhookSources: () => ({ data: { data: [{ id: "f1", name: "Site" }] } }),
  usePipelines: () => ({ data: { data: [] } }),
  usePipelineStages: () => ({ data: undefined }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: [{ id: "s1", display_name: "Bathully", phone_number: null, waha_session_name: null }] }),
  channelLabel: (s: { display_name: string | null }) => s.display_name ?? "",
}));
vi.mock("@/hooks/ai/useAgents", () => ({ useAgentsList: () => ({ data: [] }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));

import { AcoesDoNoContext } from "@/components/escale/automacoes/fluxo/BarraDoNo";
import { NoDoFluxo } from "@/components/escale/automacoes/fluxo/NoDoFluxo";
import type { DadosDaCaixa, TelaDoGatilho } from "@/lib/automation/desenho-da-regra";

const TELA: TelaDoGatilho = {
  fonte: null,
  data: { pipeline_id: "", campo: "", dias: "7" },
  tempo: { dias: "7", direcao: "da_equipe", proteger_pela_agenda: false },
};

function montar(id: string, data: DadosDaCaixa, over: { selected?: boolean; evento?: string } = {}) {
  const acoes = { duplicar: vi.fn(), remover: vi.fn() };
  const props = {
    id,
    data: { ...data, eventoDaRegra: over.evento ?? "contact.tag_added" },
    selected: over.selected ?? false,
  } as never;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReactFlowProvider>
        <AcoesDoNoContext.Provider value={acoes}>
          <NoDoFluxo {...props} />
        </AcoesDoNoContext.Provider>
      </ReactFlowProvider>
    </QueryClientProvider>,
  );
  return acoes;
}

const acao = (type: string, config: Record<string, unknown> = {}): DadosDaCaixa => ({ kind: "acao", acao: { type, config } });

describe("nó do fluxo", () => {
  it("gatilho: título, evento em maiúsculas, Próximo passo, sem entrada e sem barra", () => {
    montar("gatilho", { kind: "gatilho", evento: "contact.tag_added", tela: TELA });
    expect(screen.getByText("Iniciar quando...")).toBeTruthy();
    const evento = screen.getByText("Tag adicionada ao contato");
    expect(evento.className).toContain("uppercase");
    expect(screen.getByText("Próximo passo")).toBeTruthy();
    expect(document.querySelector(".react-flow__handle.target")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remover passo" })).toBeNull();
  });

  it("lead.created com fonte mostra o nome da fonte; sem evento convida a escolher", () => {
    montar("gatilho", { kind: "gatilho", evento: "lead.created", tela: { ...TELA, fonte: "f1" } });
    expect(screen.getByText("Site")).toBeTruthy();
  });

  it("gatilho sem evento", () => {
    montar("gatilho", { kind: "gatilho", evento: "", tela: TELA });
    expect(screen.getByText("Escolha o gatilho que dará início à automação")).toBeTruthy();
  });

  it("condições: 2 completas e 1 vazia viram 2 blocos e o rodapé", () => {
    montar("condicoes", {
      kind: "condicoes",
      linhas: [
        { field: "contact.tags", op: "contains", value: "vip" },
        { field: "event.added_tags", op: "contains", value: "x" },
        { field: "", op: "eq", value: "" },
      ],
    });
    expect(screen.getAllByTestId("condicao-do-no")).toHaveLength(2);
    expect(screen.getByText(/Corresponde a/)).toBeTruthy();
    expect(screen.getByText("todas")).toBeTruthy();
    expect(screen.getByText("Se não corresponder, a automação para aqui.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remover passo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Duplicar passo" })).toBeNull();
  });

  it("WhatsApp sem número e sem texto, e com os dois", () => {
    const { unmount } = (() => {
      montar("acao-1", acao("send_whatsapp_message", { channel_session_id: "", template: "" }));
      return { unmount: () => document.body.replaceChildren() };
    })();
    expect(screen.getByText("Dispositivo não configurado")).toBeTruthy();
    expect(screen.getByText("Escreva a mensagem")).toBeTruthy();
    expect(screen.getByText("Enviar mensagem")).toBeTruthy();
    unmount();
    montar("acao-2", acao("send_whatsapp_message", { channel_session_id: "s1", template: "Olá!" }));
    expect(screen.getByText("Bathully")).toBeTruthy();
    expect(screen.getByText("Olá!")).toBeTruthy();
  });

  it("add_tag: rótulo Ações, título e as tags", () => {
    montar("acao-1", acao("add_tag", { tags: ["vip", "novo"] }));
    expect(screen.getByText("Ações")).toBeTruthy();
    expect(screen.getByText("Adicionar tag")).toBeTruthy();
    expect(screen.getByText("vip, novo")).toBeTruthy();
  });

  it("send_ai_message: rótulo Inteligência Artificial", () => {
    montar("acao-1", acao("send_ai_message", { agent_id: "", channel_session_id: "", instruction: "" }));
    expect(screen.getByText("Inteligência Artificial")).toBeTruthy();
  });

  it("selecionado leva a borda da cor do tipo; com problema, a de alerta e a dica", () => {
    montar("acao-1", acao("add_tag", { tags: ["a"] }), { selected: true });
    expect(screen.getByTestId("no-acao-1").className).toContain("border-casca-fluxo-acoes");
    document.body.replaceChildren();
    montar("acao-1", { ...acao("add_tag", { tags: [] }), problemas: [{ caixa: "acao-1", mensagem: "Revise os campos desta ação." }] } as DadosDaCaixa);
    const no = screen.getByTestId("no-acao-1");
    expect(no.className).toContain("border-casca-alerta");
    expect(no.getAttribute("title")).toBe("Revise os campos desta ação.");
  });

  it("a barra de uma ação duplica e remove", async () => {
    const acoes = montar("acao-1", acao("add_tag", { tags: ["a"] }));
    await userEvent.click(screen.getByRole("button", { name: "Duplicar passo" }));
    await userEvent.click(screen.getByRole("button", { name: "Remover passo" }));
    expect(acoes.duplicar).toHaveBeenCalledWith("acao-1");
    expect(acoes.remover).toHaveBeenCalledWith("acao-1");
  });
});

describe("tokens do fluxo", () => {
  const RAIZ = join(__dirname, "..", "..");
  const GLOBALS = readFileSync(join(RAIZ, "app", "globals.css"), "utf8");
  const TEMA = readFileSync(join(RAIZ, "app", "escale-tema.css"), "utf8");
  const NOMES = [
    "fluxo",
    "fluxo-aresta",
    "fluxo-gatilho",
    "fluxo-gatilho-suave",
    "fluxo-whatsapp",
    "fluxo-whatsapp-suave",
    "fluxo-canal",
    "fluxo-canal-suave",
    "fluxo-acoes",
    "fluxo-acoes-suave",
  ];

  it("os 10 tokens existem no padrão do original, na ponte do tema e nos dois temas da casca", () => {
    for (const n of NOMES) {
      const decl = new RegExp(`--color-casca-${n}:`, "g");
      expect((GLOBALS.match(decl) ?? []).length, `globals: ${n}`).toBe(2);
      expect((TEMA.match(decl) ?? []).length, `tema: ${n}`).toBe(2);
    }
  });
});
