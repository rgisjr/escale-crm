import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { MenuNegocioMais } from "@/components/escale/quadro/MenuNegocioMais";

describe("<MenuNegocioMais> (Negócio + da Clint superior)", () => {
  it("abre o menu com Novo negócio e Importar negócios; o + gira", async () => {
    const aoNovo = vi.fn();
    const aoImportar = vi.fn();
    render(<MenuNegocioMais desabilitado={false} aoNovo={aoNovo} aoImportar={aoImportar} podeImportar />);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const botao = screen.getByRole("button", { name: /^Negócio/ });
    await user.click(botao);
    expect(botao).toHaveAttribute("data-aberto", "true");
    await user.click(screen.getByRole("menuitem", { name: "Novo negócio" }));
    expect(aoNovo).toHaveBeenCalled();
    await user.click(botao);
    await user.click(screen.getByRole("menuitem", { name: "Importar negócios" }));
    expect(aoImportar).toHaveBeenCalled();
  });

  it("desligado mostra a dica e não abre", () => {
    render(
      <MenuNegocioMais desabilitado dica="Sem permissão" aoNovo={vi.fn()} aoImportar={vi.fn()} podeImportar />,
    );
    expect(screen.getByRole("button", { name: /^Negócio/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Negócio/ })).toHaveAttribute(
      "title",
      "Sem permissão",
    );
  });

  it("sem permissão de importar (atendente): o item fica desligado, com a dica de gerente", async () => {
    const aoImportar = vi.fn();
    render(<MenuNegocioMais desabilitado={false} aoNovo={vi.fn()} aoImportar={aoImportar} podeImportar={false} />);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole("button", { name: /^Negócio/ }));
    const item = screen.getByRole("menuitem", { name: "Importar negócios" });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveAttribute("title", "Disponível para gerente ou acima.");
    await user.click(item);
    expect(aoImportar).not.toHaveBeenCalled();
  });
});
