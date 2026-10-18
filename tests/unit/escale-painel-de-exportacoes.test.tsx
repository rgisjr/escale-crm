import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PainelDeExportacoes } from "@/components/escale/contatos/massa/PainelDeExportacoes";
import { apiClient } from "@/lib/api/client";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u2", full_name: "Bia", role: "manager" }] }),
}));

const QUANDO = "2026-10-17T15:00:00Z";
const resumo = (id: string, status: string, extra: object = {}) => ({
  id,
  acao: "exportar",
  status,
  total: 10,
  feitos: 0,
  falhas: 0,
  tem_arquivo: false,
  created_at: QUANDO,
  ...extra,
});
const MINHAS = [
  resumo("a1", "aguardando_aprovacao"),
  resumo("a2", "concluida", { tem_arquivo: true }),
  resumo("a3", "recusada"),
  resumo("a4", "expirada"),
  resumo("a5", "na_fila"),
  { ...resumo("a6", "concluida"), acao: "incluir_tag" },
];
const PARA_APROVAR = [{ id: "p1", solicitante_id: "u2", total: 120, created_at: QUANDO }];

function montar(ehAdmin: boolean) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PainelDeExportacoes ehAdmin={ehAdmin} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(apiClient.get)
    .mockReset()
    .mockResolvedValue({ data: { minhas: MINHAS, para_aprovar: PARA_APROVAR } } as never);
  vi.mocked(apiClient.post)
    .mockReset()
    .mockResolvedValue({ data: { id: "p1", status: "na_fila" } } as never);
});

describe("PainelDeExportacoes (Q4)", () => {
  it("o selo conta as prontas; o painel mostra só as exportações, com o estado e o 'Baixar exportação' da pronta", async () => {
    montar(false);
    const botao = screen.getByRole("button", { name: "Ver exportações" });
    await waitFor(() => expect(botao).toHaveTextContent("1"));
    fireEvent.click(botao);
    expect(screen.getByText("Exportações")).toBeInTheDocument();
    for (const estado of ["Aguardando aprovação", "Pronta", "Recusada", "Expirada", "Gerando"]) {
      expect(screen.getByText(estado)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("link", { name: "Baixar exportação" })).toHaveAttribute(
      "href",
      "/api/v1/acoes-em-massa/a2/arquivo",
    );
    expect(screen.queryByText("Para aprovar")).not.toBeInTheDocument();
  });

  it("admin: 'Para aprovar' com quem pediu e quantos; Aprovar e Recusar chamam as rotas", async () => {
    montar(true);
    const botao = screen.getByRole("button", { name: "Ver exportações" });
    await waitFor(() => expect(botao).toHaveTextContent("2"));
    fireEvent.click(botao);
    expect(screen.getByText("Para aprovar")).toBeInTheDocument();
    expect(screen.getByText("Bia pediu 120 contatos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/acoes-em-massa/p1/aprovar", {}),
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Recusar" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/acoes-em-massa/p1/recusar", {}),
    );
  });
});
