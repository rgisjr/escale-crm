import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { FaixaDaSelecao } from "@/components/escale/contatos/massa/FaixaDaSelecao";
import { MenuDaSelecao } from "@/components/escale/contatos/massa/MenuDaSelecao";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("MenuDaSelecao (03-001, 18b)", () => {
  const props = {
    estado: false as const,
    total: 64001,
    naPagina: 10,
    aoMarcarPagina: vi.fn(),
    aoSelecionarTodos: vi.fn(),
    aoSelecionarQuantidade: vi.fn(),
  };

  it("a caixinha marca a página; a setinha oferece página, todos e 'Selecionar [N]'", () => {
    envolver(<MenuDaSelecao {...props} podeSelecionar />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Selecionar todos" }));
    expect(props.aoMarcarPagina).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    fireEvent.click(screen.getByRole("button", { name: "Selecionar todos os 64.001 contatos" }));
    expect(props.aoSelecionarTodos).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    expect(screen.getByRole("button", { name: "Selecionar esta página (10)" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantidade de contatos" }), {
      target: { value: "25" },
    });
    expect(props.aoSelecionarQuantidade).toHaveBeenLastCalledWith(25);
  });

  it("sem permissão: desligada, com a dica", () => {
    envolver(<MenuDaSelecao {...props} podeSelecionar={false} />);
    expect(screen.getByRole("checkbox", { name: "Selecionar todos" })).toBeDisabled();
    expect(screen.getAllByTitle("Disponível para gerente ou acima.").length).toBeGreaterThan(0);
  });
});

describe("FaixaDaSelecao (B3)", () => {
  it("página marcada: oferece todos; todos marcados: só limpar", () => {
    const aoSelecionarTodos = vi.fn();
    const aoLimpar = vi.fn();
    const { rerender } = render(
      <FaixaDaSelecao
        modo="pagina"
        naPagina={10}
        total={64001}
        aoSelecionarTodos={aoSelecionarTodos}
        aoLimpar={aoLimpar}
      />,
    );
    expect(screen.getByText("Os 10 contatos desta página estão selecionados.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Selecionar todos os 64.001 contatos" }));
    expect(aoSelecionarTodos).toHaveBeenCalled();
    rerender(
      <FaixaDaSelecao
        modo="todos"
        naPagina={10}
        total={64001}
        aoSelecionarTodos={aoSelecionarTodos}
        aoLimpar={aoLimpar}
      />,
    );
    expect(screen.getByText("Todos os 64.001 contatos estão selecionados.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(aoLimpar).toHaveBeenCalled();
  });

  it("sem modo, nada", () => {
    const { container } = render(
      <FaixaDaSelecao
        modo={null}
        naPagina={10}
        total={64001}
        aoSelecionarTodos={vi.fn()}
        aoLimpar={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
