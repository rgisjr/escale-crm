import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";

describe("<CaixaDaCasca>", () => {
  it("é uma caixa de marcar de verdade: papel, estado e nome", () => {
    const { rerender } = render(<CaixaDaCasca marcada={false} aoMudar={vi.fn()} rotulo="Selecionar todos" />);
    const caixa = screen.getByRole("checkbox", { name: "Selecionar todos" });
    expect(caixa).toHaveAttribute("aria-checked", "false");
    rerender(<CaixaDaCasca marcada aoMudar={vi.fn()} rotulo="Selecionar todos" />);
    expect(caixa).toHaveAttribute("aria-checked", "true");
    rerender(<CaixaDaCasca marcada="indeterminada" aoMudar={vi.fn()} rotulo="Selecionar todos" />);
    expect(caixa).toHaveAttribute("aria-checked", "mixed");
  });

  it("o clique alterna; da parcial vai para marcada", async () => {
    const aoMudar = vi.fn();
    const { rerender } = render(<CaixaDaCasca marcada={false} aoMudar={aoMudar} aria-label="Ana" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Ana" }));
    expect(aoMudar).toHaveBeenLastCalledWith(true);
    rerender(<CaixaDaCasca marcada aoMudar={aoMudar} aria-label="Ana" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Ana" }));
    expect(aoMudar).toHaveBeenLastCalledWith(false);
    rerender(<CaixaDaCasca marcada="indeterminada" aoMudar={aoMudar} aria-label="Ana" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Ana" }));
    expect(aoMudar).toHaveBeenLastCalledWith(true);
  });

  it("o Espaço alterna; o Enter não", async () => {
    const aoMudar = vi.fn();
    const u = userEvent.setup();
    render(<CaixaDaCasca marcada={false} aoMudar={aoMudar} aria-label="Bia" />);
    const caixa = screen.getByRole("checkbox", { name: "Bia" });
    act(() => caixa.focus());
    await u.keyboard(" ");
    expect(aoMudar).toHaveBeenCalledTimes(1);
    expect(aoMudar).toHaveBeenLastCalledWith(true);
    await u.keyboard("{Enter}");
    expect(aoMudar).toHaveBeenCalledTimes(1);
  });

  it("desabilitada não muda", async () => {
    const aoMudar = vi.fn();
    render(<CaixaDaCasca marcada={false} aoMudar={aoMudar} aria-label="Caio" desabilitada />);
    const caixa = screen.getByRole("checkbox", { name: "Caio" });
    expect(caixa).toBeDisabled();
    await userEvent.click(caixa);
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it("o visual da Clint: vazia lilás, marcada na cor da marca com o check", () => {
    const { rerender } = render(<CaixaDaCasca marcada={false} aoMudar={vi.fn()} aria-label="Davi" />);
    const quadrado = () => screen.getByRole("checkbox", { name: "Davi" }).querySelector("span");
    expect(quadrado()).toHaveClass("size-4", "rounded-[2px]", "bg-casca-caixa", "border-casca-caixa-borda");
    expect(quadrado()?.querySelector("svg")).toBeNull();
    rerender(<CaixaDaCasca marcada aoMudar={vi.fn()} aria-label="Davi" />);
    expect(quadrado()).toHaveClass("bg-casca-marca", "border-casca-marca", "text-accent-foreground");
    expect(quadrado()?.querySelector("svg")).not.toBeNull();
  });
});
