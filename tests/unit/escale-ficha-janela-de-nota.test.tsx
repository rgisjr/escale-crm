import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const notas = vi.hoisted(() => ({
  criar: vi.fn(async () => ({})),
  editar: vi.fn(async () => ({})),
}));
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({
  useCriarNota: () => ({ mutateAsync: notas.criar, isPending: false }),
  useEditarNota: () => ({ mutateAsync: notas.editar, isPending: false }),
}));

import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";

/** FORK ESCALE · Fase 1H (C15, N7): o modal "Nova nota" da Clint. */
beforeEach(() => vi.clearAllMocks());

describe("JanelaDeNota", () => {
  it("título, dica, textarea e Salvar desligado até haver texto; salvar cria e fecha", async () => {
    const onFechar = vi.fn();
    render(<JanelaDeNota leadId="n1" aberta onFechar={onFechar} />);
    expect(screen.getByRole("dialog", { name: "Nova nota" })).toBeInTheDocument();
    // A dica só monta o balão no hover: o "i" carrega o texto no nome acessível.
    expect(
      screen.getByRole("button", {
        name: /Ao inserir e salvar uma nota, ela estará automaticamente disponível no histórico do contato\./,
      }),
    ).toBeInTheDocument();
    const caixa = screen.getByRole("textbox", { name: "Nova nota" });
    expect(caixa).toHaveAttribute("placeholder", "Clique aqui para adicionar");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await userEvent.type(caixa, "Ligar amanhã");
    expect(screen.getByText("12/4000")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(notas.criar).toHaveBeenCalledWith("Ligar amanhã");
    expect(onFechar).toHaveBeenCalled();
  });

  it("com nota, é 'Editar nota' e grava pelo editar", async () => {
    const onFechar = vi.fn();
    render(
      <JanelaDeNota leadId="n1" aberta onFechar={onFechar} nota={{ id: "x1", texto: "antiga" }} />,
    );
    expect(screen.getByRole("dialog", { name: "Editar nota" })).toBeInTheDocument();
    const caixa = screen.getByRole("textbox", { name: "Editar nota" });
    expect(caixa).toHaveValue("antiga");
    await userEvent.type(caixa, " e nova");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(notas.editar).toHaveBeenCalledWith({ notaId: "x1", texto: "antiga e nova" });
  });

  it("erro ao salvar mostra o toast da Clint e não fecha", async () => {
    const { toast } = await import("sonner");
    notas.criar.mockRejectedValueOnce(new Error("x"));
    const onFechar = vi.fn();
    render(<JanelaDeNota leadId="n1" aberta onFechar={onFechar} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Nova nota" }), "a");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(toast.error).toHaveBeenCalledWith("Ocorreu um erro ao salvar a nota!");
    expect(onFechar).not.toHaveBeenCalled();
  });
});
