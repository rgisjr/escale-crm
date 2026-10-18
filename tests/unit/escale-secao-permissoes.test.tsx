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

/** FORK ESCALE · Fase 1J (D12): a subaba "Permissão de usuários" da Clint (código `Ps`; sem print). */
const U = (n: number) => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const ORIGENS: Origens = {
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};
const EQUIPE = [
  ...Array.from({ length: 12 }, (_, i) => ({
    user_id: U(i + 1),
    role: "agent",
    full_name: `Pessoa ${String(i + 1).padStart(2, "0")}`,
    email: `p${i + 1}@x.com`,
    accepted_at: "2026-01-01",
    revoked_at: null,
  })),
  {
    user_id: U(99),
    role: "agent",
    full_name: "Revogada",
    email: "r@x.com",
    accepted_at: "2026-01-01",
    revoked_at: "2026-02-01",
  },
];

const config = (pessoas: string[], pessoasDoGrupo: string[] = []): ConfiguracoesDaOrigem => ({
  pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
  etapas: [],
  fork: {
    moeda: null,
    tagsPadrao: [],
    motivosInativos: [],
    aoSair: {},
    alerta: { geral: null, etapas: {} },
    visualizacao: null,
    pessoas,
    soAdminGanha: false,
    atribuicao: { operador: "e", condicoes: [] },
  },
  motivos: [],
  campos: [],
  regras: [],
  moedaDaOrganizacao: "BRL",
  visualizacao: "own_and_unassigned",
  visualizacaoDaOrganizacao: "own_and_unassigned",
  pessoasDoGrupo,
  podeAdministrar: false,
  distribuicao: [],
  distribuicaoAtualizada: null,
});

function abrir(pessoas: string[] = [], pessoasDoGrupo: string[] = []) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/pipelines/f-1/configuracoes")
      return { data: config(pessoas, pessoasDoGrupo) };
    if (url === "/api/v1/pipeline-groups") return { data: ORIGENS };
    if (url === "/api/v1/team") return { data: EQUIPE };
    return { data: [] };
  });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: config(pessoas, pessoasDoGrupo) });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={vi.fn()} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

async function irParaPermissoes(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("navigation", { name: "Configurações da origem" });
  await user.click(screen.getByRole("button", { name: "Permissão de usuários" }));
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Permissão de usuários (origem)", () => {
  it("sem ninguém: a descrição da Clint, a ajuda nossa, a tabela vazia e o seletor; sem contador", async () => {
    const { user } = abrir();
    await irParaPermissoes(user);
    expect(screen.getByRole("heading", { name: "Permissão de usuários" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Somente os usuários selecionados poderão ver a origem. Caso nenhum usuário seja selecionado, a visualização não terá restrição.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Administradores sempre veem os negócios desta origem."),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Usuários" })).toBeInTheDocument();
    expect(screen.queryByText(/^d+ usuários? selecionados?$/)).toBeNull();
    expect(screen.getByRole("combobox", { name: "Adicione um usuário..." })).toBeInTheDocument();
  });

  it("com lista no grupo, a descrição diz que a origem segue o grupo (Q6)", async () => {
    const { user } = abrir([], [U(5)]);
    await irParaPermissoes(user);
    expect(
      screen.getByText(
        "Somente os usuários selecionados poderão ver a origem. Sem nenhum usuário selecionado, a origem segue as permissões do grupo.",
      ),
    ).toBeInTheDocument();
  });

  it("adicionar pela busca põe na tabela, mostra o contador e liga o Salvar com a lista", async () => {
    const { user } = abrir();
    await irParaPermissoes(user);
    await user.click(screen.getByRole("combobox", { name: "Adicione um usuário..." }));
    await user.type(screen.getByRole("searchbox"), "Pessoa 03");
    await user.click(screen.getByRole("option", { name: "Pessoa 03" }));
    expect(screen.getByText("1 usuário selecionado")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Pessoa 03/ })).toHaveTextContent(
      "Pessoa 03 <p3@x.com>",
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await vi.waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith(
        "/api/v1/pipelines/f-1/configuracoes",
        expect.objectContaining({ permissoes: { pessoas: [U(3)] } }),
      ),
    );
  });

  it("o ✕ tira da lista sem confirmação; a pessoa revogada e as já listadas não são oferecidas", async () => {
    const { user } = abrir([U(1), U(2)]);
    await irParaPermissoes(user);
    expect(screen.getByText("2 usuários selecionados")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remover Pessoa 01" }));
    expect(screen.getByText("1 usuário selecionado")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Adicione um usuário..." }));
    expect(screen.queryByRole("option", { name: "Revogada" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Pessoa 02" })).toBeNull();
  });

  it("pagina de 10 em 10 com 'n / N'; com todos na lista o seletor some", async () => {
    const { user } = abrir(Array.from({ length: 12 }, (_, i) => U(i + 1)));
    await irParaPermissoes(user);
    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Adicione um usuário..." })).toBeNull();
  });
});
