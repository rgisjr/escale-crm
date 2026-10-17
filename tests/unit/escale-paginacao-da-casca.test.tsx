import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const base = {
  total: 64001,
  porPagina: 10,
  opcoesPorPagina: [10, 25, 50, 100] as const,
  aoMudarPagina: vi.fn(),
  aoMudarPorPagina: vi.fn(),
};

describe("PaginacaoDaCasca (03-001)", () => {
  it("mostra 1–4, reticências e a última; a atual marcada", () => {
    render(<PaginacaoDaCasca {...base} pagina={1} />);
    for (const n of ["1", "2", "3", "4", "6401"])
      expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
    expect(screen.getByText("…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
  });

  it("Anterior desligado na primeira; Próximo leva à 2", () => {
    const aoMudarPagina = vi.fn();
    render(<PaginacaoDaCasca {...base} pagina={1} aoMudarPagina={aoMudarPagina} />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(aoMudarPagina).toHaveBeenCalledWith(2);
  });

  it("Próximo desligado na última", () => {
    render(<PaginacaoDaCasca {...base} pagina={6401} />);
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
  });

  it("o seletor mostra '10 por página' e troca o tamanho", () => {
    const aoMudarPorPagina = vi.fn();
    render(<PaginacaoDaCasca {...base} pagina={1} aoMudarPorPagina={aoMudarPorPagina} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Por página" }));
    fireEvent.click(screen.getByRole("option", { name: "25 por página" }));
    expect(aoMudarPorPagina).toHaveBeenCalledWith(25);
  });
});
