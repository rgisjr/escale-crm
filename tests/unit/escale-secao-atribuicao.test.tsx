import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL", role: "admin" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1K (D14): a subaba "Atribuição de ganho" (prints 01-012 e 01-027; código `Ks`). */
const ORIGENS: Origens = {
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};

function config(podeAdministrar = true): ConfiguracoesDaOrigem {
  return {
    pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
    etapas: [],
    motivos: [],
    campos: [],
    regras: [],
    fork: {
      moeda: null,
      tagsPadrao: [],
      motivosInativos: [],
      aoSair: {},
      alerta: { geral: null, etapas: {} },
      visualizacao: null,
      pessoas: [],
      soAdminGanha: false,
      atribuicao: { operador: "e", condicoes: [] },
    },
    moedaDaOrganizacao: "BRL",
    visualizacao: "own_and_unassigned",
    visualizacaoDaOrganizacao: "own_and_unassigned",
    pessoasDoGrupo: [],
    podeAdministrar,
    distribuicao: [],
    distribuicaoAtualizada: null,
  } as unknown as ConfiguracoesDaOrigem;
}

function abrir(c = config()) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/pipelines/f-1/configuracoes") return { data: c };
    if (url === "/api/v1/contact-tags") return { data: ["vip", "inss"] };
    return { data: [] };
  });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: c });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={vi.fn()} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

async function irPara(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("navigation", { name: "Configurações da origem" });
  await user.click(screen.getByRole("button", { name: "Atribuição de ganho" }));
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Atribuição de ganho", () => {
  it("os textos da Clint e uma linha vazia; o Salvar começa desligado", async () => {
    const user = abrir();
    await irPara(user);
    expect(
      screen.getByText("Configure aqui as regras de atribuição de ganho."),
    ).toBeInTheDocument();
    expect(screen.getByText("Atribuição de ganho pelo sistema")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "Se marcado, somente o administrador poderá alterar o status do negócio para ganho.",
      }),
    ).not.toBeChecked();
    expect(screen.getByText("Regras de atribuição de ganho")).toBeInTheDocument();
    expect(screen.getByText("Ter realizado")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Quantidade de vezes" })).toHaveValue("1");
    expect(screen.getByText("vezes a atividade do tipo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("a lista dos tipos na ordem do print 027; escolher e marcar a caixa grava o PATCH", async () => {
    const user = abrir();
    await irPara(user);
    await user.click(screen.getByRole("combobox", { name: "Tipo de atividade" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Ligação",
      "Email",
      "Agendamento",
      "Tarefa",
      "Reunião",
      "Whatsapp",
      "Instagram",
    ]);
    await user.click(screen.getByRole("option", { name: "Ligação" }));
    await user.click(
      screen.getByRole("checkbox", {
        name: "Se marcado, somente o administrador poderá alterar o status do negócio para ganho.",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-1/configuracoes", {
      atribuicao: {
        so_admin: true,
        operador: "e",
        condicoes: [{ tipo: "atividade", vezes: 1, atividade: "ligacao" }],
      },
    });
  });

  it("Nova condição → 'Escolha o tipo da condição:' → Tags; o E/Ou aparece entre as condições e vale para todas", async () => {
    const user = abrir();
    await irPara(user);
    await user.click(screen.getByRole("button", { name: "Nova condição" }));
    expect(screen.getByText("Escolha o tipo da condição:")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tags" }));
    expect(screen.getByText("Possuir a tag")).toBeInTheDocument();
    const operador = screen.getByRole("radiogroup", { name: "Como as regras se combinam" });
    expect(within(operador).getByRole("radio", { name: "E" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(within(operador).getByRole("radio", { name: "Ou" }));
    await user.click(screen.getByRole("combobox", { name: "Tag" }));
    await user.click(screen.getByRole("option", { name: "vip" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-1/configuracoes", {
      atribuicao: { so_admin: false, operador: "ou", condicoes: [{ tipo: "tag", tag: "vip" }] },
    });
  });

  it("quem não é admin vê tudo desligado e sem lixeira nem 'Nova condição'", async () => {
    const user = abrir(config(false));
    await irPara(user);
    expect(
      screen.getByRole("checkbox", {
        name: "Se marcado, somente o administrador poderá alterar o status do negócio para ganho.",
      }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Nova condição" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remover condição" })).toBeNull();
    expect(
      screen.getByText("Só o administrador altera a atribuição do ganho."),
    ).toBeInTheDocument();
  });
});
