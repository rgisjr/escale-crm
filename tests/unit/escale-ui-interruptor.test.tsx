import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";

describe("<InterruptorDaCasca>", () => {
  it("é um switch com o estado no aria-checked; clicar pede o contrário", () => {
    const aoMudar = vi.fn();
    render(<InterruptorDaCasca ligado={false} aoMudar={aoMudar} aria-label="Tags" />);
    const s = screen.getByRole("switch", { name: "Tags" });
    expect(s).toHaveAttribute("aria-checked", "false");
    fireEvent.click(s);
    expect(aoMudar).toHaveBeenCalledWith(true);
  });

  it("desabilitado não muda e mostra a dica", () => {
    const aoMudar = vi.fn();
    render(
      <InterruptorDaCasca
        ligado={false}
        aoMudar={aoMudar}
        aria-label="Renda"
        desabilitado
        title="Limite de 10 campos atingido"
      />,
    );
    const s = screen.getByRole("switch", { name: "Renda" });
    expect(s).toBeDisabled();
    expect(s).toHaveAttribute("title", "Limite de 10 campos atingido");
    fireEvent.click(s);
    expect(aoMudar).not.toHaveBeenCalled();
  });
});
