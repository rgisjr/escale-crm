import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/escale/importacao/JanelaDeImportacao", () => ({ JanelaDeImportacao: () => null }));
vi.mock("@/hooks/escale/useAcoesEmMassa", () => ({ useAcoesEmMassa: () => ({ data: { minhas: [], para_aprovar: [] } }) }));
const cancelar = vi.fn();
const itens = [
  { id: "a", tipo: "contato", arquivo: "a.csv", status: "aguardando_revisao", total: 10, importadas: 7, revisar: 3, puladas: 0, erros: 0, avisos: 0, created_at: "2026-10-19T13:05:00Z", origem_nome: null },
  { id: "b", tipo: "negocio", arquivo: "b.csv", status: "importando", total: 100, importadas: 40, revisar: 0, puladas: 10, erros: 0, avisos: 0, created_at: "2026-10-19T12:00:00Z", origem_nome: "Funil A" },
  { id: "c", tipo: "contato", arquivo: "c.csv", status: "concluida", total: 5, importadas: 4, revisar: 0, puladas: 1, erros: 0, avisos: 0, created_at: "2026-10-18T12:00:00Z", origem_nome: null },
];
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useImportacoes: () => ({ data: { itens, total: 3 }, isLoading: false, isError: false }),
  useCancelarImportacao: () => ({ mutate: cancelar, isPending: false }),
}));

import { ListaDeImportacoes } from "@/components/escale/importacao/ListaDeImportacoes";

describe("página Importações (Fase 2F)", () => {
  it("uma linha por importação, com status, resultado e ações", () => {
    render(<ListaDeImportacoes />);
    expect(screen.getByRole("heading", { name: "Importações" })).toBeInTheDocument();
    expect(screen.getByText("3 linhas precisam de revisão")).toBeInTheDocument();
    expect(screen.getByText("50 / 100")).toBeInTheDocument();
    expect(screen.getByText("4 importados · 1 pulados · 0 erros")).toBeInTheDocument();
    expect(screen.getByText(/Origem: Funil A/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));
    expect(push).toHaveBeenCalledWith("/app/imports/a?revisar=1");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(cancelar).toHaveBeenCalledWith("b");
  });

  it("Exportações troca a tabela e esconde Nova importação", () => {
    render(<ListaDeImportacoes />);
    fireEvent.click(screen.getByRole("tab", { name: "Exportações" }));
    expect(screen.getByText("Nenhuma exportação ainda")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nova importação/ })).not.toBeInTheDocument();
  });
});
