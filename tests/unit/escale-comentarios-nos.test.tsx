import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider, type NodeProps } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const h = vi.hoisted(() => ({
  contas: [{ id: "11111111-1111-4111-8111-111111111111", nome: "@oregismarques", plataforma: "instagram", conectada: true }],
}));

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/escale/useComentarios", () => ({
  useContasSociais: () => ({ contas: h.contas, carregando: false }),
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
vi.mock("@/hooks/pipelines/useDefaultPipeline", () => ({ useDefaultPipeline: () => ({ data: undefined }) }));
vi.mock("@/hooks/escale/useVariaveisDisponiveis", () => ({
  useVariaveisDisponiveis: () => ({ grupos: [], isLoading: false }),
}));

import type { NoDaAutomacao } from "@/app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AcoesDoNoContext } from "@/components/escale/automacoes/fluxo/BarraDoNo";
import { PainelDoInstagram } from "@/components/escale/automacoes/fluxo/comentario/PainelDoInstagram";
import { NoDoFluxo } from "@/components/escale/automacoes/fluxo/NoDoFluxo";
import type { DadosDaAcao, DadosDaCaixa, TelaDoGatilho } from "@/lib/automation/desenho-da-regra";
import type { ConfigDoComentario } from "@/lib/escale/comentarios/schema";

/** Fase 10B: o nó do gatilho de comentário, o nó do passo Instagram e o painel dele. */
const CANAL = "11111111-1111-4111-8111-111111111111";
const TELA: TelaDoGatilho = {
  fonte: null,
  data: { pipeline_id: "", campo: "", dias: "7" },
  tempo: { dias: "7", direcao: "da_equipe", proteger_pela_agenda: false },
  criado: { pipeline_id: "", stage_id: "" },
  tags: [],
};
const pub = (id: string, legenda: string | null = null) => ({ id, legenda, miniatura: null, tipo: null });

function noDe(id: string, data: DadosDaCaixa, selected = false) {
  const props = { id, data: { ...data, eventoDaRegra: "comment.received" }, selected } as unknown as NodeProps<NoDaAutomacao>;
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
const gatilho = (config: ConfigDoComentario | undefined): DadosDaCaixa => ({
  kind: "gatilho",
  evento: "comment.received",
  tela: { ...TELA, configPropria: config },
});

describe("nó do gatilho de comentário", () => {
  it("'Todos os posts': chip da conta, 'Qualquer publicação' e 'Qualquer comentário'", () => {
    noDe("gatilho", gatilho({
      channel_session_id: CANAL,
      escopo: "todos",
      caminhos: [{ id: "qualquer", publicacoes: [], filtro: { modo: "qualquer" }, resposta: null }],
    }));
    expect(screen.getByText("Alguém comenta em um post")).toBeTruthy();
    expect(screen.getByTestId("conta-do-gatilho").textContent).toBe("@oregismarques");
    expect(screen.getByText("Qualquer publicação")).toBeTruthy();
    expect(screen.getByText("Qualquer comentário")).toBeTruthy();
    expect(screen.getByText("Caminhos sem conexão seguem pelo Próximo passo da automação.")).toBeTruthy();
  });

  it("dois caminhos com palavras e resposta; grupo mostra a contagem", () => {
    noDe("gatilho", gatilho({
      channel_session_id: CANAL,
      escopo: "especificos",
      caminhos: [
        {
          id: "caminho-1",
          publicacoes: [pub("1", "Promo de Março")],
          filtro: { modo: "palavras", palavras: ["link", "preço"], combinar: "qualquer" },
          resposta: { variacoes: ["Te respondi no direct!"] },
        },
        { id: "caminho-2", publicacoes: [pub("2"), pub("3"), pub("4")], filtro: { modo: "qualquer" }, resposta: null },
      ],
    }));
    expect(screen.getAllByTestId("caminho-do-no")).toHaveLength(2);
    expect(screen.getByText("Promo de Março")).toBeTruthy();
    expect(screen.getByText("Contém · link")).toBeTruthy();
    expect(screen.getByText("Contém · preço")).toBeTruthy();
    expect(screen.getByText("“Te respondi no direct!”")).toBeTruthy();
    expect(screen.getByText("Grupo · 3 publicações")).toBeTruthy();
  });

  it("sem conta: 'Dispositivo não configurado'; específicos sem caminho: 'Nenhuma publicação selecionada'", () => {
    noDe("gatilho", gatilho({ channel_session_id: "", escopo: "especificos", caminhos: [] }));
    expect(screen.getByText("Dispositivo não configurado")).toBeTruthy();
    expect(screen.getByText("Nenhuma publicação selecionada")).toBeTruthy();
  });
});

describe("nó do passo Instagram", () => {
  const passo = (config: Record<string, unknown>): DadosDaCaixa => ({ kind: "acao", acao: { type: "send_instagram_message", config } });

  it("rótulo, título, balão e pílulas dos botões", () => {
    noDe("acao-1", passo({ texto: "Oi, aqui o link!", botoes: [{ titulo: "Ver agora", url: "https://a.com" }] }));
    expect(screen.getByText("Instagram")).toBeTruthy();
    expect(screen.getByText("Enviar mensagem no Instagram")).toBeTruthy();
    expect(screen.getByText("Oi, aqui o link!")).toBeTruthy();
    expect(screen.getByText("Ver agora")).toBeTruthy();
  });

  it("sem texto mostra 'Escreva a mensagem'; selecionado ganha a borda do tipo", () => {
    noDe("acao-1", passo({ texto: "", botoes: [] }), true);
    expect(screen.getByText("Escreva a mensagem")).toBeTruthy();
    expect(screen.getByTestId("no-acao-1").className).toContain("border-casca-fluxo-instagram");
  });
});

describe("painel do passo Instagram", () => {
  const dados = (config: Record<string, unknown> = { texto: "", botoes: [] }): DadosDaAcao => ({
    kind: "acao",
    acao: { type: "send_instagram_message", config },
  });
  let aoSalvar: Mock<(d: DadosDaCaixa) => void>;

  function abrir(inicial?: Record<string, unknown>) {
    aoSalvar = vi.fn<(d: DadosDaCaixa) => void>();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TooltipProvider>
          <PainelDoInstagram dados={dados(inicial)} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />
        </TooltipProvider>
      </QueryClientProvider>,
    );
  }
  beforeEach(() => abrir());

  it("a nota da resposta privada e o contador 0/1000 que vira /640 com botão", async () => {
    expect(screen.getByText(/Esta mensagem sai como resposta privada ao comentário/)).toBeTruthy();
    expect(screen.getByText("0/1000")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar botão" }));
    expect(screen.getByText("0/640")).toBeTruthy();
    expect(screen.getByText(/Se a pessoa não segue a conta/)).toBeTruthy();
  });

  it("'Adicionar botão' vai até 3; título de 21 caracteres deixa o contador vermelho", async () => {
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole("button", { name: "Adicionar botão" }));
    expect((screen.getByRole("button", { name: "Adicionar botão" }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(document.getElementById("titulo-0") as HTMLInputElement, "x".repeat(21));
    expect(screen.getByText("21/20").className).toContain("text-casca-alerta");
  });

  it("link http mostra o erro de https", async () => {
    await userEvent.click(screen.getByRole("button", { name: "Adicionar botão" }));
    await userEvent.type(document.getElementById("link-0") as HTMLInputElement, "http://a.com");
    expect(screen.getByText("O link do botão começa com https://.")).toBeTruthy();
  });

  it("'Salvar' manda a ação com texto e botões", async () => {
    await userEvent.type(screen.getByLabelText("Mensagem"), "Oi!");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar botão" }));
    await userEvent.type(document.getElementById("titulo-0") as HTMLInputElement, "Ver");
    await userEvent.type(document.getElementById("link-0") as HTMLInputElement, "https://a.com");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith({
      kind: "acao",
      acao: { type: "send_instagram_message", config: { texto: "Oi!", botoes: [{ titulo: "Ver", url: "https://a.com" }] } },
    });
  });

  it("remover botão tira o bloco", async () => {
    await userEvent.click(screen.getByRole("button", { name: "Adicionar botão" }));
    await userEvent.click(screen.getByRole("button", { name: "Remover botão" }));
    expect(screen.queryByTestId("botao-0")).toBeNull();
  });
});
