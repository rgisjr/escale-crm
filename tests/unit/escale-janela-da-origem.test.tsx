import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
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
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};

export const CONFIG: ConfiguracoesDaOrigem = {
  pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
  etapas: [
    {
      id: "aaaaaaaa-0000-4000-8000-000000000001",
      name: "1. Entrada Lead",
      position: 1,
      is_won: false,
      is_lost: false,
    },
    {
      id: "aaaaaaaa-0000-4000-8000-000000000002",
      name: "2. Em atendimento",
      position: 2,
      is_won: false,
      is_lost: false,
    },
    {
      id: "aaaaaaaa-0000-4000-8000-000000000003",
      name: "Ganho",
      position: 3,
      is_won: true,
      is_lost: false,
    },
  ],
  fork: {
    moeda: null,
    tagsPadrao: [],
    motivosInativos: [],
    aoSair: {},
    alerta: { geral: null, etapas: {} },
  },
  motivos: [],
  campos: [],
  regras: [],
  moedaDaOrganizacao: "BRL",
  visualizacao: "own_and_unassigned",
  podeAdministrar: true,
};

function abrir(config: ConfiguracoesDaOrigem = CONFIG) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
    url === "/api/v1/pipelines/f-1/configuracoes" ? { data: config } : { data: [] },
  );
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

describe("<JanelaDaOrigem>", () => {
  it("título é o nome da origem, sem X; duas abas; o menu interno da Clint", async () => {
    abrir();
    const janela = await screen.findByRole("dialog", { name: "Clayton" });
    expect(within(janela).queryByRole("button", { name: "Fechar" })).toBeNull();
    expect(within(janela).getByRole("tab", { name: "Geral" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(janela).getByRole("tab", { name: "Etapas e atividades" })).toBeInTheDocument();
    expect(within(janela).queryByRole("tab", { name: "Integrações" })).toBeNull();
    const menu = await within(janela).findByRole("navigation", { name: "Configurações da origem" });
    expect(
      within(menu)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual([
      "Configurações Gerais",
      "Motivo de Perda",
      "Distribuição de dono",
      "Permissão de usuários",
      "Atribuição de ganho",
      "Visualização de campos",
      "Campos obrigatórios",
      "Alerta de tempo na etapa",
      "Notificações",
    ]);
  });

  it("Salvar começa desligado; Cancelar fecha", async () => {
    const { user, onFechar } = abrir();
    // O título já aparece com o nome da lista de origens; o menu só depois de ler as configurações.
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onFechar).toHaveBeenCalled();
  });

  it("subaba de outra fase mostra Em breve", async () => {
    const { user } = abrir();
    // O título já aparece com o nome da lista de origens; o menu só depois de ler as configurações.
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    await user.click(screen.getByRole("button", { name: "Distribuição de dono" }));
    expect(
      screen.getByText("Chega na fase 1K, com a distribuição por percentual."),
    ).toBeInTheDocument();
  });

  it("Etapas e atividades: uma coluna por etapa aberta, a bandeira na primeira, Nova atividade e Salvar na origem desligados", async () => {
    const { user } = abrir();
    // O título já aparece com o nome da lista de origens; o menu só depois de ler as configurações.
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    await user.click(screen.getByRole("tab", { name: "Etapas e atividades" }));
    const colunas = screen.getAllByRole("region", { name: /Entrada Lead|Em atendimento/ });
    expect(colunas).toHaveLength(2);
    expect(within(colunas[0]!).getByRole("img", { name: "Etapa inicial" })).toBeInTheDocument();
    expect(within(colunas[0]!).getByText("Nenhuma atividade nessa etapa")).toBeInTheDocument();
    expect(within(colunas[0]!).getByRole("button", { name: /Nova atividade/ })).toBeDisabled();
    expect(screen.queryByRole("region", { name: "Ganho" })).toBeNull();
    expect(screen.getByRole("button", { name: "Salvar na origem" })).toBeDisabled();
  });

  it("erro ao ler mostra o aviso com Tentar de novo", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("falhou"));
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={vi.fn()} onOrigens={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não consegui abrir as configurações desta origem.",
    );
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
