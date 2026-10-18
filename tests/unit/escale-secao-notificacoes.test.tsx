import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL", role: "manager" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1K (D15): a subaba "Notificações" (código `Ie` da Clint; sem print). Aviso no app, não e-mail (Q1). */
const A = "aaaaaaaa-1111-4111-8111-111111111111";
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const ORIGENS: Origens = {
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};
const EQUIPE = [
  {
    user_id: A,
    role: "agent",
    full_name: "Ana Lima",
    email: "a@x.com",
    accepted_at: "2026-01-01",
    revoked_at: null,
    invited_at: null,
    created_at: "2026-01-01",
    last_sign_in_at: null,
  },
  {
    user_id: B,
    role: "agent",
    full_name: "Bruno Reis",
    email: "b@x.com",
    accepted_at: "2026-01-01",
    revoked_at: null,
    invited_at: null,
    created_at: "2026-01-01",
    last_sign_in_at: null,
  },
];
const CONFIG = {
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
    notificacoes: { novoNegocio: [], mudancaDeStatus: { status: [], pessoas: [] } },
  },
  moedaDaOrganizacao: "BRL",
  visualizacao: "own_and_unassigned",
  visualizacaoDaOrganizacao: "own_and_unassigned",
  pessoasDoGrupo: [],
  podeAdministrar: false,
  distribuicao: [],
  distribuicaoAtualizada: null,
} as unknown as ConfiguracoesDaOrigem;

function abrir() {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/pipelines/f-1/configuracoes") return { data: CONFIG };
    if (url === "/api/v1/team") return { data: EQUIPE };
    return { data: [] };
  });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: CONFIG });
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
  await user.click(screen.getByRole("button", { name: "Notificações" }));
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Notificações", () => {
  it("os dois blocos da Clint; o segundo seletor de usuários só aparece com algum status", async () => {
    const user = abrir();
    await irPara(user);
    expect(screen.getByRole("heading", { name: "Notificações" })).toBeInTheDocument();
    expect(
      screen.getByText("Configure aqui as notificações relacionadas a sua origem de dados."),
    ).toBeInTheDocument();
    expect(screen.getByText("Notificação de novo negócio")).toBeInTheDocument();
    expect(
      screen.getByText("Selecione os usuários que receberão as notificações"),
    ).toBeInTheDocument();
    expect(screen.getByText("Notificação de mudança de status")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Selecione os usuários que receberão as notificações e os status a serem notificados.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Usuários da mudança de status" })).toBeNull();
    await user.click(screen.getByRole("combobox", { name: "Status do negócio" }));
    await user.click(screen.getByRole("checkbox", { name: "Ganho" }));
    expect(
      screen.getByRole("combobox", { name: "Usuários da mudança de status" }),
    ).toBeInTheDocument();
  });

  it("status sem usuário: o Salvar mostra 'Selecione um usuário para continuar' e não grava", async () => {
    const user = abrir();
    await irPara(user);
    await user.click(screen.getByRole("combobox", { name: "Status do negócio" }));
    await user.click(screen.getByRole("checkbox", { name: "Perdido" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByText("Selecione um usuário para continuar")).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("escolher as pessoas mostra o contador e grava o PATCH", async () => {
    const user = abrir();
    await irPara(user);
    await user.click(screen.getByRole("combobox", { name: "Usuários do novo negócio" }));
    await user.click(screen.getByRole("checkbox", { name: "Ana Lima" }));
    expect(screen.getByText("1 usuário selecionado")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Status do negócio" }));
    await user.click(screen.getByRole("checkbox", { name: "Ganho" }));
    await user.click(screen.getByRole("combobox", { name: "Usuários da mudança de status" }));
    await user.click(screen.getByRole("checkbox", { name: "Bruno Reis" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-1/configuracoes", {
      notificacoes: {
        novo_negocio: { pessoas: [A] },
        mudanca_de_status: { status: ["won"], pessoas: [B] },
      },
    });
  });
});
