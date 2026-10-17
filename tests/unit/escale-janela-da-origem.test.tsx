import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
import { JanelasDeOrigens } from "@/components/escale/origens/JanelasDeOrigens";
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

function abrir(config: ConfiguracoesDaOrigem = CONFIG, origens: Origens = ORIGENS) {
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
      <JanelaDaOrigem id="f-1" origens={origens} onFechar={onFechar} onOrigens={vi.fn()} />
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
  it("Etapas: 'Salvar na origem' e a seta desligados têm a dica 'Em breve' e deixam a dica aparecer", async () => {
    const { user } = abrir();
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    await user.click(screen.getByRole("tab", { name: "Etapas e atividades" }));
    for (const nome of ["Salvar na origem", "Mais opções de salvar"]) {
      const botao = screen.getByRole("button", { name: nome });
      expect(botao).toBeDisabled();
      expect(botao).toHaveAttribute("title", "Em breve");
      expect(botao).toHaveClass("disabled:pointer-events-auto", "disabled:cursor-not-allowed");
    }
  });

  it("Etapas: a coluna mede 227px (P20)", async () => {
    const { user } = abrir();
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    await user.click(screen.getByRole("tab", { name: "Etapas e atividades" }));
    expect(screen.getAllByRole("region", { name: /Entrada Lead/ })[0]).toHaveClass("w-[227px]");
  });

  it("o título prefere o nome vivo da lista de origens; sem ele, o da configuração", async () => {
    const viva: Origens = {
      ...ORIGENS,
      funis: [{ ...ORIGENS.funis[0]!, name: "Clayton renomeado" }],
    };
    abrir(CONFIG, viva);
    expect(await screen.findByRole("dialog", { name: "Clayton renomeado" })).toBeInTheDocument();
  });

  it("o título cai no nome da configuração quando a origem não está na lista", async () => {
    abrir(CONFIG, { grupos: [], funis: [] });
    expect(await screen.findByRole("dialog", { name: "Clayton" })).toBeInTheDocument();
  });
});

describe("<JanelaDaOrigem> — fechar por fora e rascunho", () => {
  /** O clique na cortina escura, como a pessoa faz. */
  async function cliqueNaCortina(user: ReturnType<typeof userEvent.setup>) {
    const cortina = document.querySelector(".ds-cortina");
    expect(cortina).not.toBeNull();
    await user.click(cortina as Element);
  }

  async function comRascunho() {
    const ctx = abrir();
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    await ctx.user.type(screen.getByRole("textbox", { name: "Nome da origem" }), " X");
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled());
    // O Radix só liga o ouvinte de "fora" um instante depois de abrir.
    await new Promise((r) => setTimeout(r, 10));
    return ctx;
  }

  it("com alteração, clicar fora (na cortina) não fecha: o rascunho não se perde", async () => {
    const { onFechar, user } = await comRascunho();
    await cliqueNaCortina(user);
    expect(onFechar).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("com alteração, Esc e Cancelar continuam fechando", async () => {
    const { onFechar, user } = await comRascunho();
    await user.keyboard("{Escape}");
    expect(onFechar).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onFechar).toHaveBeenCalledTimes(2);
  });

  it("sem alteração, clicar fora fecha como antes", async () => {
    const { onFechar, user } = abrir();
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    await new Promise((r) => setTimeout(r, 10));
    await cliqueNaCortina(user);
    expect(onFechar).toHaveBeenCalled();
  });
});

describe("<JanelasDeOrigens> — outra origem não herda o rascunho", () => {
  it("trocar de f-1 para f-2 recomeça do zero, com o nome de f-2", async () => {
    const dois: Origens = {
      ...ORIGENS,
      funis: [
        ...ORIGENS.funis,
        { id: "f-2", name: "Outra", group_id: "g-1", is_archived: false, is_default: false },
      ],
    };
    const outra: ConfiguracoesDaOrigem = {
      ...CONFIG,
      pipeline: { id: "f-2", name: "Outra", group_id: "g-1", is_default: false },
    };
    vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
      url === "/api/v1/pipelines/f-1/configuracoes"
        ? { data: CONFIG }
        : url === "/api/v1/pipelines/f-2/configuracoes"
          ? { data: outra }
          : { data: [] },
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const cena = (id: string) => (
      <QueryClientProvider client={client}>
        <JanelasDeOrigens
          janela={{ tipo: "config-origem", id }}
          origens={dois}
          onFechar={vi.fn()}
          onOrigens={vi.fn()}
          onAbrirOrigem={vi.fn()}
        />
      </QueryClientProvider>
    );
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { rerender } = render(cena("f-1"));
    const campo = await screen.findByRole("textbox", { name: "Nome da origem" });
    await user.type(campo, " rascunho");
    expect(campo).toHaveValue("Clayton rascunho");
    rerender(cena("f-2"));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Nome da origem" })).toHaveValue("Outra"),
    );
  });
});
