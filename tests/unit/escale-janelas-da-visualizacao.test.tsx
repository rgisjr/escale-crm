import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import type { Visualizacao } from "@/lib/escale/visualizacoes/regras";
import {
  JanelasDaVisualizacao,
  type JanelaDaVisualizacao,
} from "@/components/escale/visualizacoes/JanelasDaVisualizacao";

const EQUIPE = [
  { user_id: "u-ana", full_name: "Ana", email: "ana@x.com", accepted_at: "2026-01-01", revoked_at: null, role: "agent" },
  { user_id: "u-saiu", full_name: "Saiu", email: null, accepted_at: "2026-01-01", revoked_at: "2026-02-01", role: "agent" },
  { user_id: "u-convite", full_name: "Convidada", email: null, accepted_at: null, revoked_at: null, role: "agent" },
];
const VIS: Visualizacao = { id: "v-1", name: "Time", acesso: "escolhidos", origens: ["f-a"], pessoas: ["u-ana"] };

function abrir(janela: JanelaDaVisualizacao) {
  const props = { onFechar: vi.fn(), onVisualizacoes: vi.fn(), onCriada: vi.fn(), onExcluida: vi.fn() };
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <JanelasDaVisualizacao janela={janela} visualizacoes={[VIS]} {...props} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup({ pointerEventsCheck: 0 }), ...props };
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  vi.mocked(apiClient.get).mockResolvedValue({ data: EQUIPE });
});

describe("<JanelasDaVisualizacao> — nova", () => {
  it("com acesso de toda a organização, cria pela rota com as origens do rascunho e avisa o id", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: [VIS] });
    const { user, onVisualizacoes, onCriada } = abrir({ tipo: "nova", origens: ["f-a", "f-b"] });
    const janela = screen.getByRole("dialog", { name: "Nova visualização" });
    await user.type(within(janela).getByRole("textbox", { name: "Nome da visualização" }), "Análise");
    await user.click(within(janela).getByRole("button", { name: "Criar visualização" }));
    await waitFor(() => expect(onVisualizacoes).toHaveBeenCalledWith([VIS]));
    const corpo = vi.mocked(apiClient.post).mock.calls[0]![1] as { id: string };
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipeline-views", {
      id: corpo.id,
      name: "Análise",
      acesso: "todos",
      origens: ["f-a", "f-b"],
      pessoas: [],
    });
    expect(corpo.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(onCriada).toHaveBeenCalledWith(corpo.id);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("só as pessoas escolhidas: lista quem está ativo na equipe e exige ao menos uma", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: [VIS] });
    const { user } = abrir({ tipo: "nova", origens: ["f-a"] });
    await user.type(screen.getByRole("textbox", { name: "Nome da visualização" }), "Só Ana");
    await user.click(screen.getByRole("radio", { name: "Só as pessoas escolhidas" }));
    const ana = await screen.findByRole("checkbox", { name: "Ana" });
    expect(screen.queryByRole("checkbox", { name: "Saiu" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Convidada" })).toBeNull();
    expect(screen.getByRole("button", { name: "Criar visualização" })).toBeDisabled();
    await user.click(ana);
    await user.click(screen.getByRole("button", { name: "Criar visualização" }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/v1/pipeline-views",
        expect.objectContaining({ acesso: "escolhidos", pessoas: ["u-ana"] }),
      ),
    );
  });

  it("o erro da rota aparece na janela", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("Já existe uma visualização com esse nome."));
    const { user, onCriada } = abrir({ tipo: "nova", origens: ["f-a"] });
    await user.type(screen.getByRole("textbox", { name: "Nome da visualização" }), "Time");
    await user.click(screen.getByRole("button", { name: "Criar visualização" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe uma visualização com esse nome.");
    expect(onCriada).not.toHaveBeenCalled();
  });
});

describe("<JanelasDaVisualizacao> — configurar e excluir", () => {
  it("configurar vem preenchido e salva nome, acesso e pessoas", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: [VIS] });
    const { user, onFechar } = abrir({ tipo: "configurar", id: "v-1" });
    const nome = screen.getByRole("textbox", { name: "Nome da visualização" });
    expect(nome).toHaveValue("Time");
    expect(screen.getByRole("radio", { name: "Só as pessoas escolhidas" })).toBeChecked();
    expect(await screen.findByRole("checkbox", { name: "Ana" })).toBeChecked();
    await user.clear(nome);
    await user.type(nome, "Time 2");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-views/v-1", {
      name: "Time 2",
      acesso: "escolhidos",
      pessoas: ["u-ana"],
    });
  });

  it("excluir confirma, chama a rota e avisa quem chamou", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: [] });
    const { user, onExcluida } = abrir({ tipo: "excluir", id: "v-1" });
    expect(screen.getByRole("dialog", { name: "Excluir «Time»?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excluir visualização" }));
    await waitFor(() => expect(onExcluida).toHaveBeenCalledWith("v-1"));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipeline-views/v-1");
  });

  it("visualização que sumiu enquanto a janela abria", () => {
    abrir({ tipo: "configurar", id: "nao-existe" });
    expect(screen.getByText("Visualização não encontrada.")).toBeInTheDocument();
  });
});

describe("casca V3 — a janela da visualização no visual da Clint", () => {
  it("as pessoas escolhidas são caixinhas da casca, e o Criar é o verde-menta", async () => {
    const { user } = abrir({ tipo: "nova", origens: ["f-a"] });
    expect(screen.getByRole("dialog", { name: "Nova visualização" })).toHaveClass("rounded-[8px]");
    await user.click(screen.getByRole("radio", { name: "Só as pessoas escolhidas" }));
    expect(await screen.findByRole("checkbox", { name: "Ana" })).not.toBeChecked();
    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Criar visualização" })).toHaveClass("bg-(--escale-salvar)");
  });
});
