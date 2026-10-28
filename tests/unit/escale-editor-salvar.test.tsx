import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
const criarPainel = vi.fn();
const criarGrafico = vi.fn();
const atualizarGrafico = vi.fn();
vi.mock("@/hooks/escale/usePaineisDaCasca", () => ({
  usePaineis: () => ({
    data: [
      { id: "p1", nome: "Vendas" },
      { id: "p2", nome: "Gerência" },
    ],
  }),
  useAcoesDosPaineis: () => ({ criar: { mutate: criarPainel, isPending: false } }),
}));
vi.mock("@/hooks/escale/useSalvarGrafico", () => ({
  useSalvarGrafico: () => ({
    criar: { mutate: criarGrafico, isPending: false },
    atualizar: { mutate: atualizarGrafico, isPending: false },
  }),
}));

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { JanelaSalvarChart } from "@/components/escale/indicadores/editor/JanelaSalvarChart";
import { ApiError } from "@/lib/api/types";
import { opcoesComPadrao } from "@/lib/escale/indicadores/graficos/opcoes";
import { perguntaSchema } from "@/lib/escale/indicadores/pergunta";

const conteudo = () => ({
  tipo: "barra" as const,
  pergunta: perguntaSchema.parse({ indicadores: ["negocio.quantidade"] }),
  opcoes: opcoesComPadrao({}),
});
const atual = { id: "g1", painelId: "p1", nome: "Atual", descricao: null };
const montar = (p: Partial<React.ComponentProps<typeof JanelaSalvarChart>> = {}) =>
  render(<JanelaSalvarChart modo="novo" grafico={null} painelDeOrigem="p1" conteudo={conteudo} aoFechar={() => undefined} {...p} />);

beforeEach(() => vi.clearAllMocks());

describe("Salvar chart", () => {
  it("título, campos e o painel de origem escolhido", () => {
    montar();
    expect(screen.getByText("Salvar chart")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Dashboard" })).toHaveTextContent("Vendas");
    expect(screen.getByLabelText(/Nome do Chart/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Descrição/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Salvar como novo" })).toBeInTheDocument();
  });

  it("nome vazio mostra campo obrigatório e não salva", async () => {
    const user = userEvent.setup();
    montar();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByText("campo obrigatório")).toBeInTheDocument();
    expect(criarGrafico).not.toHaveBeenCalled();
  });

  it("o ⊕ troca o seletor pelo campo do novo dashboard, desliga o Salvar e o Adicionar cria o painel", async () => {
    const user = userEvent.setup();
    criarPainel.mockImplementation((_a, opcoes) => opcoes.onSuccess({ id: "p9" }));
    montar();
    await user.click(screen.getByRole("button", { name: "Criar um novo dashboard em branco" }));
    expect(screen.getByPlaceholderText("Digite o nome do novo dashboard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await user.type(screen.getByPlaceholderText("Digite o nome do novo dashboard"), "Time SDR");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(criarPainel).toHaveBeenCalledWith({ nome: "Time SDR" }, expect.anything());
    expect(screen.queryByPlaceholderText("Digite o nome do novo dashboard")).toBeNull();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("novo cria no painel com a pergunta e volta para o painel", async () => {
    const user = userEvent.setup();
    criarGrafico.mockImplementation((_p, opcoes) => opcoes.onSuccess({ id: "g9" }));
    montar();
    await user.type(screen.getByLabelText(/Nome do Chart/), "Meu chart");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(criarGrafico.mock.calls[0]?.[0]).toMatchObject({ painelId: "p1", nome: "Meu chart", tipo: "barra", descricao: null });
    expect(push).toHaveBeenCalledWith("/app/metrics/p1");
  });

  it("editar atualiza; trocando o painel manda painelId e o de origem; Salvar como novo cria", async () => {
    const user = userEvent.setup();
    atualizarGrafico.mockImplementation((_p, opcoes) => opcoes.onSuccess({ id: "g1" }));
    const { unmount } = montar({ modo: "editar", grafico: atual });
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    const sem = atualizarGrafico.mock.calls[0]?.[0];
    expect(sem).toMatchObject({ id: "g1", painelDeOrigem: "p1", nome: "Atual" });
    expect(sem).not.toHaveProperty("painelId");
    unmount();

    atualizarGrafico.mockClear();
    montar({ modo: "editar", grafico: atual });
    await user.click(screen.getByRole("combobox", { name: "Dashboard" }));
    await user.click(screen.getByRole("option", { name: "Gerência" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(atualizarGrafico.mock.calls[0]?.[0]).toMatchObject({ painelId: "p2", painelDeOrigem: "p1" });
    expect(push).toHaveBeenLastCalledWith("/app/metrics/p2");
  });

  it("Salvar como novo no editar cria uma cópia", async () => {
    const user = userEvent.setup();
    criarGrafico.mockImplementation((_p, opcoes) => opcoes.onSuccess({ id: "g2" }));
    montar({ modo: "editar", grafico: atual });
    await user.click(screen.getByRole("checkbox", { name: "Salvar como novo" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(criarGrafico).toHaveBeenCalled();
    expect(atualizarGrafico).not.toHaveBeenCalled();
  });

  it("erro 409 vai para o aviso; a descrição é cortada em 140", async () => {
    const user = userEvent.setup();
    const erro = new ApiError(409, "state_conflict", undefined, "r", "limite");
    criarGrafico.mockImplementation((_p, opcoes) => opcoes.onError(erro));
    montar();
    await user.type(screen.getByLabelText(/Nome do Chart/), "x");
    await user.click(screen.getByLabelText(/Descrição/));
    await user.paste("a".repeat(200));
    expect((screen.getByLabelText(/Descrição/) as HTMLTextAreaElement).value).toHaveLength(140);
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(showApiError).toHaveBeenCalledWith(erro);
  });
});
