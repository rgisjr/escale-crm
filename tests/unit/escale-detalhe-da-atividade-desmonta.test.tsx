import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { TooltipProvider } from "@/components/ui/tooltip";
import { DetalheDaAtividade } from "@/components/escale/negocio/abas/atividades/DetalheDaAtividade";

/** FORK ESCALE · Q0b (B2-5): desmontar com a gravação pendente não pode descartar o digitado. */
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const montar = (aoSalvarConteudo: (t: string) => void) =>
  render(
    <TooltipProvider>
      <DetalheDaAtividade
        tipo="tarefa"
        titulo="Ligar"
        conteudo="antigo"
        textoResolvido="antigo"
        editavel
        aoSalvarConteudo={aoSalvarConteudo}
        podeRemover={false}
      />
    </TooltipProvider>,
  );

describe("<DetalheDaAtividade> ao desmontar (Q0b, B2-5)", () => {
  it("grava o texto pendente na desmontagem, antes dos 750 ms", () => {
    const salvar = vi.fn();
    const { unmount } = montar(salvar);
    fireEvent.click(screen.getByRole("button", { name: "Modo edição" }));
    fireEvent.change(screen.getByLabelText("Conteúdo da atividade"), {
      target: { value: "novo texto" },
    });
    expect(salvar).not.toHaveBeenCalled();
    unmount();
    expect(salvar).toHaveBeenCalledTimes(1);
    expect(salvar).toHaveBeenCalledWith("novo texto");
  });

  it("sem nada pendente, desmontar não grava", () => {
    const salvar = vi.fn();
    const { unmount } = montar(salvar);
    unmount();
    expect(salvar).not.toHaveBeenCalled();
  });

  it("depois da gravação automática, desmontar não grava de novo", () => {
    const salvar = vi.fn();
    const { unmount } = montar(salvar);
    fireEvent.click(screen.getByRole("button", { name: "Modo edição" }));
    fireEvent.change(screen.getByLabelText("Conteúdo da atividade"), {
      target: { value: "novo texto" },
    });
    vi.advanceTimersByTime(800);
    expect(salvar).toHaveBeenCalledTimes(1);
    unmount();
    expect(salvar).toHaveBeenCalledTimes(1);
  });
});
