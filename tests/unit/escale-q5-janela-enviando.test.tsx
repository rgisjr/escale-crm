import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "org-1", role: "manager" } }),
}));
vi.mock("@/hooks/escale/useCatalogoDeCampos", () => ({
  useCatalogoDeCampos: () => ({ catalogo: { grupos: [], campos: [] } }),
}));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: [] }),
}));
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useCriarImportacao: () => ({ mutateAsync: vi.fn(), isPending: true }),
  useDestinosDaImportacao: () => ({ data: [] }),
}));

import { JanelaDeImportacao } from "@/components/escale/importacao/JanelaDeImportacao";

describe("JanelaDeImportacao enviando (Q5, B5-2)", () => {
  const montar = (aoFechar: () => void) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <JanelaDeImportacao aberta aoFechar={aoFechar} tipoInicial="contato" />
      </QueryClientProvider>,
    );

  it("Cancelar fecha mesmo com o envio em andamento", () => {
    const aoFechar = vi.fn();
    montar(aoFechar);
    const botao = screen.getByRole("button", { name: "Cancelar" });
    expect(botao).toBeEnabled();
    fireEvent.click(botao);
    expect(aoFechar).toHaveBeenCalled();
  });

  it("Esc fecha mesmo com o envio em andamento", () => {
    const aoFechar = vi.fn();
    montar(aoFechar);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(aoFechar).toHaveBeenCalled();
  });
});
