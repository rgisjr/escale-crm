import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { CorpoDoAtraso } from "@/components/escale/automacoes/fluxo/CorposDoNo";
import { PainelDoAtraso } from "@/components/escale/automacoes/fluxo/painel/PainelDoAtraso";

const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const atraso = { kind: "atraso", quantidade: 3, unidade: "minutos", janela: null } as const;

describe("PainelDoAtraso (07-028)", () => {
  it("tempo limite de continuação: horas com máscara, dias e Salvar com a janela", async () => {
    const aoSalvar = vi.fn();
    envolver(<PainelDoAtraso dados={atraso} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    expect(screen.queryByText("Continuar entre")).toBeNull();
    await userEvent.click(screen.getByRole("checkbox", { name: "Definir tempo limite de continuação" }));
    expect(screen.getByText("Continuar entre")).toBeTruthy();
    // Janela ainda incompleta: aviso na caixa, mas o Salvar da caixa não trava (D9).
    expect(screen.getByRole("note").textContent).toBe("Revise a janela de horário do Atraso: horário no formato 00:00 e pelo menos um dia.");
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(false);
    await userEvent.type(screen.getByRole("textbox", { name: "Hora inicial" }), "0800");
    await userEvent.type(screen.getByRole("textbox", { name: "Hora final" }), "1900");
    expect((screen.getByRole("textbox", { name: "Hora inicial" }) as HTMLInputElement).value).toBe("08:00");
    await userEvent.click(screen.getByRole("combobox", { name: "Dias da semana" }));
    for (const dia of ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]) {
      await userEvent.click(screen.getByRole("checkbox", { name: dia }));
    }
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith({
      kind: "atraso",
      quantidade: 3,
      unidade: "minutos",
      janela: { de: "08:00", ate: "19:00", dias: [1, 2, 3, 4, 5] },
    });
  });

  it("10 segundos mostra o mínimo de 30 e desliga o Salvar", async () => {
    envolver(<PainelDoAtraso dados={{ ...atraso, quantidade: 10, unidade: "segundos" }} aoCancelar={vi.fn()} aoSalvar={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toBe("O atraso mínimo é de 30 segundos.");
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("tempo abaixo do mínimo mostra o aviso e a caixa salva assim mesmo", async () => {
    const aoSalvar = vi.fn();
    envolver(<PainelDoAtraso dados={atraso} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Unidade" }));
    await userEvent.click(screen.getByRole("option", { name: "Segundos" }));
    const campo = screen.getByRole("textbox", { name: "Tempo" });
    await userEvent.clear(campo);
    await userEvent.type(campo, "10");
    expect(screen.getByRole("alert").textContent).toBe("O atraso mínimo é de 30 segundos.");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith(expect.objectContaining({ quantidade: 10, unidade: "segundos" }));
  });

  it("trocar o número e a unidade grava o novo tempo, sem janela", async () => {
    const aoSalvar = vi.fn();
    envolver(<PainelDoAtraso dados={atraso} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    const campo = screen.getByRole("textbox", { name: "Tempo" });
    await userEvent.clear(campo);
    await userEvent.type(campo, "2");
    await userEvent.click(screen.getByRole("combobox", { name: "Unidade" }));
    await userEvent.click(screen.getByRole("option", { name: "Horas" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith({ kind: "atraso", quantidade: 2, unidade: "horas", janela: null });
  });
});

describe("CorpoDoAtraso (07-026)", () => {
  it("'Aguardar 3 minutos' e, com janela, o intervalo e os dias", () => {
    const { rerender } = render(<CorpoDoAtraso dados={atraso} />);
    expect(screen.getByText("Aguardar 3 minutos")).toBeTruthy();
    rerender(<CorpoDoAtraso dados={{ ...atraso, quantidade: 1, janela: { de: "08:00", ate: "19:00", dias: [1, 2, 3, 4, 5] } }} />);
    expect(screen.getByText("Aguardar 1 minuto")).toBeTruthy();
    expect(screen.getByText("Continuar entre 08:00 e 19:00 · seg a sex")).toBeTruthy();
  });
});
