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
  grupos: [],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};
const E1 = "aaaaaaaa-0000-4000-8000-000000000001";
const E2 = "aaaaaaaa-0000-4000-8000-000000000002";
const CONFIG: ConfiguracoesDaOrigem = {
  pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
  etapas: [
    { id: E1, name: "Novo", position: 1, is_won: false, is_lost: false },
    { id: E2, name: "Reunião Agendada", position: 2, is_won: false, is_lost: false },
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
  podeAdministrar: false,
};

async function abrirAlerta(config: ConfiguracoesDaOrigem = CONFIG) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
    url === "/api/v1/pipelines/f-1/configuracoes" ? { data: config } : { data: [] },
  );
  vi.mocked(apiClient.patch).mockResolvedValue({ data: config });
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={vi.fn()} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(await screen.findByRole("button", { name: "Alerta de tempo na etapa" }));
  return user;
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Alerta de tempo na etapa", () => {
  it("sem regra: o vazio da Clint e Definir regra geral", async () => {
    await abrirAlerta();
    expect(
      screen.getByText(
        "Sem regra geral. Apenas as etapas listadas em Exceções abaixo terão alerta de tempo.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nenhuma exceção configurada. Todas as etapas seguem a regra geral."),
    ).toBeInTheDocument();
  });

  it("definir a regra geral, uma exceção com unidade própria, e salvar", async () => {
    const user = await abrirAlerta();
    await user.click(screen.getByRole("button", { name: "Definir regra geral" }));
    expect(
      screen.getByRole("textbox", { name: "Limite de atenção — Regra geral do funil" }),
    ).toHaveValue("4");
    await user.click(screen.getByRole("button", { name: "Adicionar etapa" }));
    await user.click(await screen.findByRole("button", { name: "Reunião Agendada" }));
    const critico = screen.getByRole("textbox", { name: "Limite crítico — Reunião Agendada" });
    await user.clear(critico);
    await user.type(critico, "2");
    await user.click(
      screen.getByRole("combobox", { name: "Unidade do limite crítico — Reunião Agendada" }),
    );
    await user.click(await screen.findByRole("option", { name: "Dias" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await vi.waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-1/configuracoes", {
        alerta: {
          geral: { atencao: 4, atencao_unidade: "horas", critico: 8, critico_unidade: "horas" },
          etapas: {
            "aaaaaaaa-0000-4000-8000-000000000002": {
              atencao: 4,
              atencao_unidade: "horas",
              critico: 2,
              critico_unidade: "dias",
            },
          },
        },
      }),
    );
  });

  it("crítico menor que atenção barra o salvar com o texto da Clint", async () => {
    const user = await abrirAlerta();
    await user.click(screen.getByRole("button", { name: "Definir regra geral" }));
    const critico = screen.getByRole("textbox", {
      name: "Limite crítico — Regra geral do funil",
    });
    await user.clear(critico);
    await user.type(critico, "2");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "O limite crítico deve ser maior que o limite de atenção.",
    );
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("Como aparece no card mostra as três pílulas ao passar o mouse", async () => {
    const user = await abrirAlerta();
    await user.hover(screen.getByRole("button", { name: "Como aparece no card" }));
    const dica = screen.getByRole("tooltip");
    expect(dica).toHaveTextContent("No rodapé do card");
    expect(dica).toHaveTextContent("dentro do prazo · cinza");
    expect(dica).toHaveTextContent("passou de atenção · âmbar");
    expect(dica).toHaveTextContent("passou de crítico · vermelho");
  });
});
