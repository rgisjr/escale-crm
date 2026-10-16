import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { GatilhoDeFiltro } from "@/components/escale/ui/GatilhoDeFiltro";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

describe("<GatilhoDeFiltro>", () => {
  it("em repouso: rótulo, chevron e nenhum fundo", () => {
    render(<GatilhoDeFiltro rotulo="Data" />);
    const gatilho = screen.getByRole("button", { name: "Data" });
    expect(gatilho).toHaveAttribute("type", "button");
    expect(gatilho).toHaveClass(
      "h-9",
      "gap-2.5",
      "px-2.5",
      "rounded-casca-gatilho",
      "text-[0.7rem]",
      "font-medium",
      "text-casca-texto-2",
      "hover:bg-casca-raia",
    );
    expect(gatilho).not.toHaveAttribute("data-aberto");
    expect(gatilho.querySelector("svg")).toHaveClass("text-casca-chevron");
  });

  it("a contagem vira o selo cinza; zero não aparece", () => {
    const { rerender } = render(<GatilhoDeFiltro rotulo="Status" contagem={1} />);
    const gatilho = screen.getByRole("button", { name: /^Status\s*1$/ });
    expect(within(gatilho).getByText("1")).toHaveClass("bg-casca-cinza-selo", "rounded-full", "size-[18px]");
    rerender(<GatilhoDeFiltro rotulo="Status" contagem={0} />);
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("dentro do Popover: aberto fica escuro com texto branco, e o Esc devolve ao repouso", async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <Popover>
        <PopoverTrigger asChild>
          <GatilhoDeFiltro rotulo="Data" />
        </PopoverTrigger>
        <PainelSuspenso>calendário</PainelSuspenso>
      </Popover>,
    );
    const gatilho = screen.getByRole("button", { name: "Data" });
    await u.click(gatilho);
    expect(await screen.findByRole("dialog")).toHaveTextContent("calendário");
    expect(gatilho).toHaveAttribute("aria-expanded", "true");
    expect(gatilho).toHaveAttribute("data-aberto");
    expect(gatilho).toHaveClass("bg-casca-escuro", "text-white");
    expect(gatilho.querySelector("svg")).toHaveClass("text-white");
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(gatilho).not.toHaveAttribute("data-aberto");
    expect(gatilho).toHaveClass("text-casca-texto-2");
  });

  it("a prop aberto força o estado, fora de Popover", () => {
    render(<GatilhoDeFiltro rotulo="Tags" aberto />);
    expect(screen.getByRole("button", { name: "Tags" })).toHaveClass("bg-casca-escuro", "text-white");
  });

  it("repassa a ref e o clique", async () => {
    const ref = createRef<HTMLButtonElement>();
    const aoClicar = vi.fn();
    render(<GatilhoDeFiltro ref={ref} rotulo="Campos" onClick={aoClicar} />);
    await userEvent.click(screen.getByRole("button", { name: "Campos" }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
