import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";

describe("<BotaoDaCasca>", () => {
  it("marca: o 'Negócio +' na cor da marca, 31px de altura e canto de 6px", () => {
    render(<BotaoDaCasca variante="marca">Negócio</BotaoDaCasca>);
    const botao = screen.getByRole("button", { name: "Negócio" });
    expect(botao).toHaveAttribute("type", "button");
    expect(botao).toHaveAttribute("data-variante", "marca");
    expect(botao).toHaveClass(
      "bg-casca-marca",
      "text-accent-foreground",
      "hover:bg-casca-marca-forte",
      "rounded-casca-gatilho",
      "h-[31px]",
      "font-medium",
    );
  });

  it("novo: o 'Novo +' azul do topo, que não é a cor da marca", () => {
    render(<BotaoDaCasca variante="novo">Novo</BotaoDaCasca>);
    const botao = screen.getByRole("button", { name: "Novo" });
    expect(botao).toHaveClass("bg-casca-novo", "text-white", "h-[22px]", "text-[11px]");
    expect(botao).not.toHaveClass("bg-casca-marca");
  });

  it("texto e ícone não têm fundo até o hover", () => {
    render(
      <>
        <BotaoDaCasca variante="texto">Cancelar</BotaoDaCasca>
        <BotaoDaCasca variante="icone" aria-label="Atualizar">
          <svg />
        </BotaoDaCasca>
      </>,
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveClass(
      "bg-transparent",
      "text-casca-texto-2",
      "hover:bg-casca-raia",
    );
    expect(screen.getByRole("button", { name: "Atualizar" })).toHaveClass(
      "size-7",
      "bg-transparent",
      "text-casca-suave",
      "hover:bg-casca-raia",
    );
  });

  it("o tamanho sm encolhe", () => {
    render(
      <>
        <BotaoDaCasca variante="marca" tamanho="sm">
          Pequeno
        </BotaoDaCasca>
        <BotaoDaCasca variante="icone" tamanho="sm" aria-label="Ajuda">
          <svg />
        </BotaoDaCasca>
      </>,
    );
    expect(screen.getByRole("button", { name: "Pequeno" })).toHaveClass("h-[26px]");
    expect(screen.getByRole("button", { name: "Ajuda" })).toHaveClass("size-6");
  });

  it("repassa ref, clique, type e className", async () => {
    const ref = createRef<HTMLButtonElement>();
    const aoClicar = vi.fn();
    render(
      <BotaoDaCasca ref={ref} variante="marca" type="submit" className="ml-auto" onClick={aoClicar}>
        Salvar
      </BotaoDaCasca>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toHaveAttribute("type", "submit");
    expect(ref.current).toHaveClass("ml-auto");
  });

  it("desabilitado não clica", async () => {
    const aoClicar = vi.fn();
    render(
      <BotaoDaCasca variante="novo" disabled onClick={aoClicar}>
        Novo
      </BotaoDaCasca>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Novo" }));
    expect(aoClicar).not.toHaveBeenCalled();
  });
});
