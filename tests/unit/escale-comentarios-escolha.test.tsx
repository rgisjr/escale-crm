import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { EscolhaDoGatilho } from "@/components/escale/automacoes/fluxo/painel/EscolhaDoGatilho";

/** Fase 10B (07-020): a fonte Instagram na escolha do gatilho. */
describe("EscolhaDoGatilho · fonte Instagram", () => {
  it("mostra os quatro cartões na ordem da Clint: três 'Em breve' sem clique e o comentário que escolhe", async () => {
    const aoEscolher = vi.fn();
    render(<EscolhaDoGatilho evento="lead.won" aoEscolher={aoEscolher} />);
    await userEvent.click(screen.getByRole("button", { name: "Instagram" }));

    const titulos = screen
      .getAllByText(/^(Contato envia uma mensagem|Alguém comenta em um post|Alguém marca a conta em um story|Alguém responde a um story)$/)
      .map((e) => e.textContent);
    expect(titulos).toEqual([
      "Contato envia uma mensagem",
      "Alguém comenta em um post",
      "Alguém marca a conta em um story",
      "Alguém responde a um story",
    ]);
    expect(screen.getAllByText("Em breve")).toHaveLength(3);

    const emBreve = screen.getByText("Alguém marca a conta em um story").closest("[aria-disabled]") as HTMLElement;
    expect(emBreve.getAttribute("aria-disabled")).toBe("true");
    await userEvent.click(emBreve);
    expect(aoEscolher).not.toHaveBeenCalled();

    const comentario = screen.getByRole("button", { name: /Alguém comenta em um post/ });
    expect(within(comentario).getByText("Quando alguém comenta em um post da conta do Instagram")).toBeTruthy();
    await userEvent.click(comentario);
    expect(aoEscolher).toHaveBeenCalledWith("comment.received");
  });

  it("abre na fonte Instagram quando o evento atual é o comentário", () => {
    render(<EscolhaDoGatilho evento="comment.received" aoEscolher={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Alguém comenta em um post/ }).getAttribute("aria-pressed")).toBe("true");
  });
});
