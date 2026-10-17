import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import type { Origens } from "@/lib/escale/origens/regras";
import { JanelasDeOrigens, type Janela } from "@/components/escale/origens/JanelasDeOrigens";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras", color: null, icon: "iniciais", is_archived: false },
    { id: "g-cred", name: "Credenciados", color: null, icon: "iniciais", is_archived: false },
    { id: "g-vazio", name: "Parcerias", color: null, icon: "iniciais", is_archived: false },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras", is_archived: false, is_default: true },
    { id: "f-nayara", name: "Funil Nayara", group_id: "g-cred", is_archived: false, is_default: false },
  ],
};

function abrir(janela: Janela, origens: Origens = ORIGENS) {
  const onOrigens = vi.fn();
  const onFechar = vi.fn();
  const onAbrirOrigem = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <JanelasDeOrigens
        janela={janela}
        origens={origens}
        onFechar={onFechar}
        onOrigens={onOrigens}
        onAbrirOrigem={onAbrirOrigem}
      />
    </QueryClientProvider>,
  );
  return { onOrigens, onFechar, onAbrirOrigem, user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  for (const fn of [apiClient.get, apiClient.patch, apiClient.put, apiClient.delete]) {
    vi.mocked(fn).mockResolvedValue({ data: ORIGENS });
  }
  vi.mocked(apiClient.post).mockResolvedValue({ data: ORIGENS });
});

describe("janelas do grupo", () => {
  it("Adicionar grupo de origens cria e aplica as origens da resposta", async () => {
    const { onOrigens, onFechar, user } = abrir({ tipo: "adicionar-grupo" });
    await user.type(screen.getByRole("textbox", { name: "Nome do novo grupo" }), "Novos");
    await user.click(screen.getByRole("button", { name: "Criar grupo" }));
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipeline-groups", { name: "Novos" });
    await vi.waitFor(() => expect(onOrigens).toHaveBeenCalledWith(ORIGENS));
    expect(onFechar).toHaveBeenCalled();
  });

  it("Configurações renomeia o grupo", async () => {
    const { user } = abrir({ tipo: "config-grupo", id: "g-obras" });
    const campo = screen.getByRole("textbox", { name: "Nome do grupo" });
    expect(campo).toHaveValue("INSS de obras");
    await user.clear(campo);
    await user.type(campo, "INSS Obras 2026");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-obras", { name: "INSS Obras 2026" });
  });

  it("Customizar grava a cor da paleta e o ícone escolhidos", async () => {
    const { user } = abrir({ tipo: "customizar", id: "g-obras" });
    await user.click(screen.getByRole("button", { name: "Azul" }));
    await user.click(screen.getByRole("button", { name: "Pessoas" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-obras", { color: "#0091ff", icon: "pessoas" });
  });

  it("Arquivar avisa que as origens vão junto e arquiva", async () => {
    const { user } = abrir({ tipo: "arquivar-grupo", id: "g-obras" });
    expect(screen.getByText(/as origens continuam recebendo negócios/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Arquivar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-obras", { is_archived: true });
  });

  it("Excluir grupo vazio sai direto", async () => {
    const { user } = abrir({ tipo: "excluir-grupo", id: "g-vazio" });
    await user.click(screen.getByRole("button", { name: "Excluir grupo" }));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-vazio");
  });

  it("Excluir grupo com origens pede o destino e manda junto", async () => {
    const { user } = abrir({ tipo: "excluir-grupo", id: "g-obras" });
    await user.click(screen.getByRole("combobox", { name: "Mover as origens para" }));
    await user.click(await screen.findByRole("option", { name: "Parcerias" }));
    await user.click(screen.getByRole("button", { name: "Mover e excluir grupo" }));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-obras?destino=g-vazio");
  });

  it("o único grupo com origens não pode ser excluído", () => {
    abrir(
      { tipo: "excluir-grupo", id: "g-obras" },
      { grupos: [ORIGENS.grupos[0]!], funis: [ORIGENS.funis[0]!] },
    );
    expect(screen.getByText("«INSS de obras» é o único grupo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mover e excluir grupo" })).toBeNull();
  });
});

describe("janelas da origem", () => {
  it("Adicionar origem cria pelo original, põe no grupo e abre o quadro", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { pipelines: [{ id: "f-novo", name: "Leads Instagram" }], arquivados: [] } });
    const { onAbrirOrigem, onOrigens, user } = abrir({ tipo: "adicionar-origem", grupoId: "g-cred" });
    await user.type(screen.getByRole("textbox", { name: "Nome da origem" }), "Leads Instagram");
    await user.click(screen.getByRole("button", { name: "Criar origem" }));
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipelines", { name: "Leads Instagram" });
    await vi.waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-novo/grupo", { group_id: "g-cred" }),
    );
    await vi.waitFor(() => expect(onAbrirOrigem).toHaveBeenCalledWith("f-novo"));
    expect(onOrigens).toHaveBeenCalledWith(ORIGENS);
  });

  it("Arquivar origem usa o arquivamento do original e relê as origens", async () => {
    const { user } = abrir({ tipo: "arquivar-origem", id: "f-nayara" });
    await user.click(screen.getByRole("button", { name: "Arquivar" }));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipelines/f-nayara");
    await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/api/v1/pipeline-groups"));
  });

  it("Excluir de vez com negócios mostra a recusa e oferece arquivar", async () => {
    vi.mocked(apiClient.delete).mockRejectedValueOnce(
      new ApiError(422, "unprocessable_entity", undefined, "r-1", "«Funil Nayara» tem 3 negócios. Arquive em vez de excluir."),
    );
    const { user } = abrir({ tipo: "excluir-origem", id: "f-nayara" });
    await user.click(screen.getByRole("button", { name: "Excluir de vez" }));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipelines/f-nayara?definitivo=1");
    expect(await screen.findByRole("alert")).toHaveTextContent("tem 3 negócios");
    await user.click(screen.getByRole("button", { name: "Arquivar" }));
    expect(apiClient.delete).toHaveBeenLastCalledWith("/api/v1/pipelines/f-nayara");
  });
});

describe("casca V3 — janelas no visual do modal da Clint (01-013)", () => {
  it("a janela é a caixa branca de raio 8, com título 22px, campo #EFF3FF de 43px e o Salvar verde-menta", () => {
    abrir({ tipo: "config-grupo", id: "g-obras" });
    expect(screen.getByRole("dialog", { name: "Configurações do grupo" })).toHaveClass("rounded-[8px]", "bg-surface");
    expect(screen.getByRole("heading", { name: "Configurações do grupo" })).toHaveClass("text-[22px]", "font-normal");
    expect(screen.getByRole("textbox", { name: "Nome do grupo" })).toHaveClass("bg-casca-raia", "h-[43px]");
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveClass("bg-(--escale-salvar)", "text-(--escale-salvar-texto)");
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveClass("border-casca-borda", "bg-surface");
  });

  it("Excluir é o botão vermelho da casca", () => {
    abrir({ tipo: "excluir-grupo", id: "g-vazio" });
    expect(screen.getByRole("button", { name: "Excluir grupo" })).toHaveClass("bg-casca-alerta");
  });

  it("Customizar mostra a paleta nas cores da Clint; o tom gravado continua o da paleta", () => {
    abrir({ tipo: "customizar", id: "g-obras" });
    expect(screen.getByRole("button", { name: "Azul" })).toHaveStyle({ backgroundColor: "#83B4FF" });
  });
});
