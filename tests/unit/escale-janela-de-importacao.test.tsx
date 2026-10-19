import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org-1", role: "manager" } }) }));
vi.mock("@/hooks/escale/useCatalogoDeCampos", () => ({ useCatalogoDeCampos: () => ({ catalogo: { grupos: [], campos: [] } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({ useContactTagVocabulary: () => ({ data: [] }) }));
const criar = vi.fn(async () => ({ id: "imp-1", total: 1 }));
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useCriarImportacao: () => ({ mutateAsync: criar, isPending: false }),
  useDestinosDaImportacao: () => ({ data: [] }),
}));

import { JanelaDeImportacao } from "@/components/escale/importacao/JanelaDeImportacao";

const montar = (aoImportar = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <JanelaDeImportacao aberta aoFechar={vi.fn()} tipoInicial="contato" aoImportar={aoImportar} />
    </QueryClientProvider>,
  );

describe("JanelaDeImportacao (Fase 2F)", () => {
  it("cinco passos, do arquivo à confirmação", async () => {
    const aoImportar = vi.fn();
    montar(aoImportar);
    expect(screen.getByRole("list", { name: "Passos da importação" })).toHaveTextContent("Prévia e confirmação");
    const arquivo = new File(["Nome,Email\nAna,ana@x.com\n"], "contatos.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("Arquivo .CSV"), { target: { files: [arquivo] } });
    await screen.findByText("Pronto para mapear");
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    expect(screen.getByRole("combobox", { name: "Campo da coluna Email" })).toHaveTextContent("Email");
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    expect(screen.getByRole("heading", { name: "Escolha o nível de automação" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    expect(screen.getByTestId("resumo-da-importacao")).toHaveTextContent("contatos.csv");
    fireEvent.click(screen.getByRole("button", { name: /Confirmar e importar/ }));
    await waitFor(() => expect(aoImportar).toHaveBeenCalledWith("imp-1"));
    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({
        pedido: expect.objectContaining({
          tipo: "contato",
          nivel: "conservador",
          mapeamento: [
            { csv: "Nome", para: "name" },
            { csv: "Email", para: "email" },
          ],
        }),
      }),
    );
  });

  it("arquivo que não é .CSV mostra o erro", async () => {
    montar();
    fireEvent.change(screen.getByLabelText("Arquivo .CSV"), { target: { files: [new File(["x"], "planilha.xlsx")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Selecione um arquivo .CSV válido.");
  });
});
