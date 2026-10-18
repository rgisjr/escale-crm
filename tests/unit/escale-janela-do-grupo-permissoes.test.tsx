import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { FormConfigGrupo } from "@/components/escale/origens/JanelasDoGrupo";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1J (Q6): a seção "Permissão de usuários" da janela do grupo (código `StepConfig` da Clint; sem print). */
const U = (n: number) => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const EQUIPE = [
  {
    user_id: U(1),
    role: "agent",
    full_name: "Ana",
    email: "a@x.com",
    accepted_at: "2026-01-01",
    revoked_at: null,
  },
  {
    user_id: U(2),
    role: "manager",
    full_name: "Bia",
    email: "b@x.com",
    accepted_at: "2026-01-01",
    revoked_at: null,
  },
];
const origens = (pessoas: string[]): Origens => ({
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false, pessoas }],
  funis: [],
});

function abrir(pessoas: string[] = []) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
    url === "/api/v1/team" ? { data: EQUIPE } : { data: origens(pessoas) },
  );
  vi.mocked(apiClient.patch).mockResolvedValue({ data: origens(pessoas) });
  const onFechar = vi.fn();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <JanelaDaCasca aberta onFechar={onFechar}>
        <FormConfigGrupo
          id="g-1"
          origens={origens(pessoas)}
          onFechar={onFechar}
          onOrigens={vi.fn()}
        />
      </JanelaDaCasca>
    </QueryClientProvider>,
  );
  return { user: userEvent.setup({ pointerEventsCheck: 0 }), onFechar };
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Configurações do grupo: Permissão de usuários", () => {
  it("mostra a descrição da Clint e o seletor múltiplo; escolher mostra o contador e grava pessoas junto do nome", async () => {
    const { user } = abrir();
    expect(screen.getByText("Permissão de usuários")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Somente os usuários selecionados poderão ver o grupo. Caso nenhum usuário seja selecionado, a visualização não terá restrição.",
      ),
    ).toBeInTheDocument();
    await user.click(
      await screen.findByRole("combobox", {
        name: "Selecione os usuários que poderão visualizar o grupo",
      }),
    );
    await user.click(await screen.findByRole("checkbox", { name: "Ana" }));
    expect(screen.getByText("1 usuário selecionado")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await vi.waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-1", {
        name: "INSS",
        pessoas: [U(1)],
      }),
    );
  });

  it("abre com a lista que o grupo já tem", async () => {
    abrir([U(2)]);
    expect(await screen.findByText("1 usuário selecionado")).toBeInTheDocument();
  });
});
