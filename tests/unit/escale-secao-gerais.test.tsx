import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { Origens } from "@/lib/escale/origens/regras";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false },
    { id: "g-2", name: "Parcerias", color: null, icon: "iniciais", is_archived: false },
  ],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};

const CONFIG: ConfiguracoesDaOrigem = {
  pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
  etapas: [],
  fork: {
    moeda: null,
    tagsPadrao: [],
    motivosInativos: [],
    aoSair: {},
    alerta: { geral: null, etapas: {} },
    visualizacao: null,
    pessoas: [],
  },
  motivos: [],
  campos: [],
  regras: [],
  moedaDaOrganizacao: "BRL",
  visualizacao: "own_and_unassigned",
  visualizacaoDaOrganizacao: "own_and_unassigned",
  pessoasDoGrupo: [],
  podeAdministrar: false,
};

function abrir(config: ConfiguracoesDaOrigem = CONFIG) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/pipelines/f-1/configuracoes") return { data: config };
    if (url === "/api/v1/pipeline-groups") return { data: ORIGENS };
    if (url === "/api/v1/contact-tags") return { data: ["vip", "quente"] };
    return { data: [] };
  });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: config });
  vi.mocked(apiClient.put).mockResolvedValue({ data: ORIGENS });
  const onFechar = vi.fn();
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={onFechar} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  return { onFechar, user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Configurações Gerais", () => {
  it("o que a Clint mostra: nome, grupo com +, visualização, moeda com bandeira, tags", async () => {
    abrir();
    expect(await screen.findByRole("textbox", { name: "Nome da origem" })).toHaveValue("Clayton");
    expect(screen.getByText("Configure aqui a sua origem de dados.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Grupo" })).toHaveTextContent("INSS");
    expect(screen.getByRole("button", { name: "Novo grupo" })).toBeInTheDocument();
    const seletor = screen.getByRole("combobox", { name: "Visualização de negócios" });
    expect(seletor).not.toHaveAttribute("aria-disabled", "true");
    expect(seletor).toHaveTextContent("Usuários visualizam seus negócios e sem dono");
    expect(screen.getByRole("combobox", { name: "Moeda da origem" })).toHaveTextContent(
      "Real (BRL)",
    );
    expect(screen.getByRole("button", { name: "Adicionar tag" })).toBeInTheDocument();
  });

  it("visualização de negócios: as três opções da Clint, na ordem do print 03; escolher liga o Salvar", async () => {
    const { user } = abrir();
    await user.click(await screen.findByRole("combobox", { name: "Visualização de negócios" }));
    expect(screen.getByRole("option", { name: "Usuários visualizam todos os negócios" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Usuários visualizam apenas seus negócios" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Usuários visualizam todos os negócios" }));
    expect(screen.getByRole("combobox", { name: "Visualização de negócios" })).toHaveTextContent(
      "Usuários visualizam todos os negócios",
    );
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await vi.waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith(
        "/api/v1/pipelines/f-1/configuracoes",
        expect.objectContaining({ gerais: expect.objectContaining({ visualizacao: "all" }) }),
      ),
    );
  });

  it("renomear e trocar o grupo vão pelas rotas da 1B; nada na rota de configurações; sem a caixinha de origem padrão", async () => {
    const { user, onFechar } = abrir();
    const nome = await screen.findByRole("textbox", { name: "Nome da origem" });
    expect(screen.queryByRole("checkbox", { name: "Tornar esta a origem padrão" })).toBeNull();
    await user.clear(nome);
    await user.type(nome, "Clayton 2026");
    await user.click(screen.getByRole("combobox", { name: "Grupo" }));
    await user.click(await screen.findByRole("option", { name: "Parcerias" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await vi.waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-1/grupo", {
        group_id: "g-2",
      }),
    );
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-1", { name: "Clayton 2026" });
    expect(apiClient.patch).not.toHaveBeenCalledWith(
      "/api/v1/pipelines/f-1",
      expect.objectContaining({ is_default: true }),
    );
    expect(apiClient.patch).not.toHaveBeenCalledWith(
      "/api/v1/pipelines/f-1/configuracoes",
      expect.anything(),
    );
    await vi.waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it("moeda e tag vão juntas na rota de configurações", async () => {
    const { user } = abrir();
    await screen.findByRole("textbox", { name: "Nome da origem" });
    await user.click(screen.getByRole("combobox", { name: "Moeda da origem" }));
    await user.click(await screen.findByRole("option", { name: "Dólar Americano (USD)" }));
    await user.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await user.type(
      await screen.findByRole("textbox", { name: "Nova tag" }),
      " Lead Instagram {Enter}",
    );
    expect(screen.getByRole("button", { name: "Tirar a tag lead instagram" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await vi.waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-1/configuracoes", {
        gerais: { moeda: "USD", tags_padrao: ["lead instagram"], visualizacao: "own_and_unassigned" },
      }),
    );
  });

  it("a tag do sistema é recusada; nome vazio barra o salvar com o texto da Clint", async () => {
    const { user } = abrir();
    const nome = await screen.findByRole("textbox", { name: "Nome da origem" });
    await user.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await user.type(await screen.findByRole("textbox", { name: "Nova tag" }), "Cliente{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A tag «cliente» é do sistema. Escolha outra.",
    );
    await user.keyboard("{Escape}");
    await user.clear(nome);
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(
      screen
        .getAllByRole("alert")
        .some((a) => a.textContent?.includes("Nome é um campo obrigatório!")),
    ).toBe(true);
  });

  it("a origem marcada como padrão no banco não ganha aviso nenhum (F12)", async () => {
    abrir({ ...CONFIG, pipeline: { ...CONFIG.pipeline, is_default: true } });
    await screen.findByRole("textbox", { name: "Nome da origem" });
    expect(screen.queryByText("Esta é a origem padrão da organização.")).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Tornar esta a origem padrão" })).toBeNull();
  });
});
