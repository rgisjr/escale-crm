import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { EditorDeCampo } from "@/components/escale/negocio/abas/EditorDeCampo";
import type { CampoEditavel } from "@/lib/escale/negocio/campos";

/** FORK ESCALE · Fase 1H (N1): o input em linha da Clint. */
const texto = (valor: unknown): CampoEditavel => ({
  chave: "cargo",
  rotulo: "Cargo",
  tipo: "text",
  valor,
});

describe("texto", () => {
  it("vazio mostra o placeholder da Clint; digitar mostra Cancelar/Salvar; Enter salva o texto", async () => {
    const aoSalvar = vi.fn(async () => undefined);
    render(<EditorDeCampo campo={texto(null)} aoSalvar={aoSalvar} />);
    const input = screen.getByRole("textbox", { name: "Cargo" });
    expect(input).toHaveAttribute("placeholder", "Clique aqui para adicionar");
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
    await userEvent.type(input, "CEO");
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    expect(aoSalvar).toHaveBeenCalledWith("CEO");
    expect(await screen.findByLabelText("Salvo")).toBeInTheDocument();
  });

  it("Esc e Cancelar voltam ao valor gravado; sair do campo não salva", async () => {
    const aoSalvar = vi.fn(async () => undefined);
    render(<EditorDeCampo campo={texto("CEO")} aoSalvar={aoSalvar} />);
    const input = screen.getByRole("textbox", { name: "Cargo" });
    await userEvent.clear(input);
    await userEvent.type(input, "CTO");
    await userEvent.tab();
    expect(aoSalvar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(input).toHaveValue("CEO");
    await userEvent.type(input, "X{Escape}");
    expect(input).toHaveValue("CEO");
  });

  it("valor inválido mostra o erro e não salva; erro do servidor aparece embaixo", async () => {
    const aoSalvar = vi.fn(async () => {
      throw new Error("Ocorreu um erro ao salvar o campo");
    });
    render(
      <EditorDeCampo
        campo={{ chave: "email", rotulo: "Email", tipo: "email", valor: null }}
        aoSalvar={aoSalvar}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    await userEvent.type(input, "ana@{Enter}");
    expect(screen.getByText("Necessário ser um email válido.")).toBeInTheDocument();
    expect(aoSalvar).not.toHaveBeenCalled();
    await userEvent.type(input, "b.co{Enter}");
    expect(aoSalvar).toHaveBeenCalledWith("ana@b.co");
    expect(await screen.findByText("Ocorreu um erro ao salvar o campo")).toBeInTheDocument();
  });
});

describe("outros tipos", () => {
  it("moeda mostra reais e grava número; data mostra dd/mm/aaaa e grava ISO", async () => {
    const aoSalvar = vi.fn(async () => undefined);
    const { rerender } = render(
      <EditorDeCampo
        campo={{ chave: "v", rotulo: "Valor", tipo: "currency", valor: 1500.5 }}
        aoSalvar={aoSalvar}
        moeda="BRL"
      />,
    );
    const valor = screen.getByRole("textbox", { name: "Valor" });
    expect(valor).toHaveValue("1.500,50");
    expect(screen.getByText("R$")).toBeInTheDocument();
    await userEvent.clear(valor);
    await userEvent.type(valor, "2000{Enter}");
    expect(aoSalvar).toHaveBeenCalledWith(2000);
    rerender(
      <EditorDeCampo
        campo={{ chave: "d", rotulo: "Data", tipo: "date", valor: "2026-10-17" }}
        aoSalvar={aoSalvar}
      />,
    );
    const data = screen.getByRole("textbox", { name: "Data" });
    expect(data).toHaveValue("17/10/2026");
    await userEvent.clear(data);
    await userEvent.type(data, "01/11/2026{Enter}");
    expect(aoSalvar).toHaveBeenLastCalledWith("2026-11-01");
  });

  it("lista grava ao escolher", async () => {
    const aoSalvar = vi.fn(async () => undefined);
    render(
      <EditorDeCampo
        campo={{
          chave: "o",
          rotulo: "Origem",
          tipo: "select",
          valor: null,
          opcoes: [{ value: "g", label: "Google" }],
        }}
        aoSalvar={aoSalvar}
      />,
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Origem" }));
    await userEvent.click(await screen.findByRole("option", { name: "Google" }));
    expect(aoSalvar).toHaveBeenCalledWith("g");
  });

  it("travado é só leitura, com a dica", () => {
    render(
      <EditorDeCampo
        campo={{ ...texto("x"), travado: true }}
        aoSalvar={vi.fn(async () => undefined)}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Cargo" });
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("title", "Este campo não pode ser editado aqui.");
  });

  it("o check some depois de 1s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const aoSalvar = vi.fn(async () => undefined);
    render(<EditorDeCampo campo={texto(null)} aoSalvar={aoSalvar} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Cargo" }), "A{Enter}");
    expect(await screen.findByLabelText("Salvo")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByLabelText("Salvo")).toBeNull();
    vi.useRealTimers();
  });
});
