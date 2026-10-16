import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

function Painel(props: Partial<ComponentProps<typeof PainelSuspenso>>) {
  return (
    <div data-testid="raiz">
      <Popover>
        <PopoverTrigger>Abrir</PopoverTrigger>
        <PainelSuspenso {...props}>conteúdo</PainelSuspenso>
      </Popover>
    </div>
  );
}

describe("<PainelSuspenso>", () => {
  it("abre no portal, alinhado ao começo do gatilho, com o visual da Clint", async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    render(<Painel />);
    await u.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = await screen.findByRole("dialog");
    expect(painel).toHaveTextContent("conteúdo");
    expect(painel).toHaveClass("rounded-casca-gatilho", "border", "border-casca-borda", "shadow-casca-painel", "bg-surface");
    expect(painel).not.toHaveClass("rounded-md");
    expect(painel).not.toHaveClass("shadow-md");
    expect(painel).toHaveAttribute("data-align", "start");
    expect(screen.getByTestId("raiz")).not.toContainElement(painel);
  });

  it("aceita a largura, o padding e o alinhamento de quem usa", async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    render(<Painel className="w-[742px] p-0" align="end" />);
    await u.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = await screen.findByRole("dialog");
    expect(painel).toHaveClass("w-[742px]", "p-0");
    expect(painel).toHaveAttribute("data-align", "end");
  });

  it("Esc fecha", async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    render(<Painel />);
    await u.click(screen.getByRole("button", { name: "Abrir" }));
    await screen.findByRole("dialog");
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
