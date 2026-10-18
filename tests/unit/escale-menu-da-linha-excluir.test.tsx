import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MenuDaLinha } from "@/components/escale/contatos/MenuDaLinha";
import { apiClient } from "@/lib/api/client";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), delete: vi.fn() } }));
vi.mock("@/hooks/contacts/useContact", () => ({ useContact: () => ({ data: undefined }) }));
vi.mock("@/components/contacts/EditContactDialog", () => ({ EditContactDialog: () => null }));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));

describe("MenuDaLinha › Excluir (Q5)", () => {
  it("o balão da Clint avisa dos negócios e a exclusão vai pela rota do fork", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({ data: { vinculos: [], por_tabela: {} } } as never);
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { id: "c1", negocios: 2 } } as never);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MenuDaLinha linha={{ id: "c1" } as never} podeExcluir />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Mais ações" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(
      await screen.findByText("Tem certeza que deseja excluir o contato selecionado?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Os negócios associados ao contato também serão excluídos."),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Excluir" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() =>
      expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/lista-de-contatos/c1"),
    );
  });
});
