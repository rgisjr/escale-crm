import { fireEvent, render, screen } from "@testing-library/react";
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

import { MenuDaColuna } from "@/components/escale/quadro/MenuDaColuna";

function menu() {
  const aoSelecionar = vi.fn();
  render(<MenuDaColuna nome="Entrada" total={7} aoSelecionar={aoSelecionar} />);
  return { aoSelecionar, user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

describe("<MenuDaColuna> (⋮ da etapa da Clint)", () => {
  it("'Selecionar todos...' marca a etapa toda e fecha", async () => {
    const { aoSelecionar, user } = menu();
    await user.click(screen.getByRole("button", { name: "Ações da etapa Entrada" }));
    await user.click(screen.getByRole("button", { name: "Selecionar todos..." }));
    expect(aoSelecionar).toHaveBeenCalledWith(7);
    expect(screen.queryByRole("button", { name: "Selecionar todos..." })).toBeNull();
  });

  it("o campo numérico começa em 0; mudar o número seleciona na hora; vazio desmarca", async () => {
    const { aoSelecionar, user } = menu();
    await user.click(screen.getByRole("button", { name: "Ações da etapa Entrada" }));
    const campo = screen.getByRole("spinbutton", { name: "Selecione" });
    expect(campo).toHaveValue(0);
    fireEvent.change(campo, { target: { value: "3" } });
    expect(campo).toHaveValue(3);
    expect(aoSelecionar).toHaveBeenLastCalledWith(3);
    fireEvent.change(campo, { target: { value: "" } });
    expect(aoSelecionar).toHaveBeenLastCalledWith(0);
    expect(
      screen.getByLabelText("Escolha quantos negócios você quer selecionar"),
    ).toBeInTheDocument();
  });
  async function abrirCampo() {
    const ctx = menu();
    await ctx.user.click(screen.getByRole("button", { name: "Ações da etapa Entrada" }));
    return { ...ctx, campo: screen.getByRole("spinbutton", { name: "Selecione" }) };
  }

  it("decimal não vira outro número: 2.5 seleciona 2, não 25", async () => {
    const { aoSelecionar, campo } = await abrirCampo();
    fireEvent.change(campo, { target: { value: "2.5" } });
    expect(aoSelecionar).toHaveBeenLastCalledWith(2);
    expect(aoSelecionar).not.toHaveBeenCalledWith(25);
    expect(campo).toHaveValue(2);
  });

  it("acima do total limita ao total, no campo e na seleção", async () => {
    const { aoSelecionar, campo } = await abrirCampo();
    fireEvent.change(campo, { target: { value: "99" } });
    expect(aoSelecionar).toHaveBeenLastCalledWith(7);
    expect(campo).toHaveValue(7);
  });

  it("negativo vira 0", async () => {
    const { aoSelecionar, campo } = await abrirCampo();
    fireEvent.change(campo, { target: { value: "3" } });
    fireEvent.change(campo, { target: { value: "-4" } });
    expect(aoSelecionar).toHaveBeenLastCalledWith(0);
    expect(campo).toHaveValue(0);
  });

  it("digitação parcial inválida (o navegador informa vazio) não desmarca nem apaga o campo", async () => {
    const { aoSelecionar, campo } = await abrirCampo();
    fireEvent.change(campo, { target: { value: "3" } });
    aoSelecionar.mockClear();
    Object.defineProperty(campo, "validity", { value: { badInput: true }, configurable: true });
    fireEvent.change(campo, { target: { value: "" } });
    expect(aoSelecionar).not.toHaveBeenCalled();
    expect(campo).toHaveValue(3);
  });

  it("setas do teclado (uma mudança de cada vez) seguem o número e param no total", async () => {
    const { aoSelecionar, campo } = await abrirCampo();
    fireEvent.change(campo, { target: { value: "1" } });
    expect(aoSelecionar).toHaveBeenLastCalledWith(1);
    fireEvent.change(campo, { target: { value: "2" } });
    expect(aoSelecionar).toHaveBeenLastCalledWith(2);
    fireEvent.change(campo, { target: { value: "1" } });
    expect(aoSelecionar).toHaveBeenLastCalledWith(1);
  });
});
