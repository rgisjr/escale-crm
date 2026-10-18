import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const papel = vi.hoisted(() => ({ valor: "admin" }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", role: papel.valor }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaAtribuicaoDeGanho } from "@/components/escale/negocio/JanelaAtribuicaoDeGanho";

/** FORK ESCALE · Fase 1K (D14, N18): a janela "Atribuição de ganho" do negócio ganho (DealWonModal da Clint; sem print). */
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const EQUIPE = [
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

function abrir(ganho: unknown) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/leads/l-1/atribuicao-de-ganho") return { data: ganho };
    if (url === "/api/v1/team") return { data: EQUIPE };
    return { data: [] };
  });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: ganho });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <JanelaAtribuicaoDeGanho aberta aoFechar={vi.fn()} leadId="l-1" />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

beforeEach(() => {
  papel.valor = "admin";
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("<JanelaAtribuicaoDeGanho>", () => {
  it("mostra a pessoa creditada e, quando houve regra, as frases ligadas por 'e'", async () => {
    abrir({
      creditadoA: B,
      ganhoEm: "2026-10-18T13:00:00.000Z",
      pelaRegra: true,
      corrigidoEm: null,
      regras: {
        operador: "e",
        condicoes: [
          { tipo: "atividade", vezes: 2, atividade: "ligacao" },
          { tipo: "tag", tag: "vip" },
        ],
      },
    });
    expect(await screen.findByRole("dialog", { name: "Atribuição de ganho" })).toBeInTheDocument();
    expect(
      await screen.findByText("As seguintes regras foram aplicadas para a atribuição do ganho:"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ter realizado 2 vezes a atividade do tipo Ligação e"),
    ).toBeInTheDocument();
    expect(screen.getByText("Possuir a tag vip")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Atribuir ganho ao usuário" })).toHaveTextContent(
      "Bruno Reis",
    );
  });

  it("o admin salva a correção", async () => {
    const user = abrir({
      creditadoA: B,
      ganhoEm: "2026-10-18T13:00:00.000Z",
      pelaRegra: false,
      corrigidoEm: null,
      regras: null,
    });
    await user.click(await screen.findByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/leads/l-1/atribuicao-de-ganho", {
      creditado_a: B,
      ganho_em: "2026-10-18T13:00:00.000Z",
    });
  });

  it("quem não é admin vê tudo desligado, sem Salvar", async () => {
    papel.valor = "agent";
    abrir({
      creditadoA: B,
      ganhoEm: "2026-10-18T13:00:00.000Z",
      pelaRegra: false,
      corrigidoEm: null,
      regras: null,
    });
    expect(
      await screen.findByRole("combobox", { name: "Atribuir ganho ao usuário" }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
  });
});
