import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { PainelDosInsights } from "@/components/escale/automacoes/fluxo/insights/PainelDosInsights";
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import type { ResumoDaAutomacao } from "@/lib/escale/automacoes/insights/tipos";

const REGRA = { id: "r1", name: "A", trigger_event: "contact.tag_added" } as unknown as AutomationRuleRow;
const RESUMO: ResumoDaAutomacao = {
  total: 9602,
  sucesso: 9000,
  parcial: 2,
  falhou: 8,
  adiado: 592,
  ultima: "2026-09-10T15:40:00Z",
  passos: [],
};

function montar(
  consulta: Partial<{ data: ResumoDaAutomacao | undefined; isPending: boolean; isError: boolean }> = {},
  periodo: "7d" | "30d" | "90d" | "tudo" = "30d",
) {
  const aoAbrir = vi.fn();
  const aoMudarPeriodo = vi.fn();
  const refetch = vi.fn();
  render(
    <PainelDosInsights
      regra={REGRA}
      fuso="America/Sao_Paulo"
      periodo={periodo}
      aoMudarPeriodo={aoMudarPeriodo}
      consulta={{ data: RESUMO, isPending: false, isError: false, refetch, ...consulta } as never}
      aoAbrir={aoAbrir}
    />,
  );
  return { aoAbrir, aoMudarPeriodo, refetch };
}

describe("PainelDosInsights", () => {
  it("cabeçalho, título, descrição e o chip do gatilho sem seta", () => {
    montar();
    expect(screen.getAllByText("Automação").length).toBeGreaterThan(0);
    expect(screen.getByText("Resultados da automação")).toBeTruthy();
    expect(screen.getByText(/Clique num número para ver as execuções/)).toBeTruthy();
    const chip = screen.getByText("Tag adicionada ao contato");
    expect(chip.closest("button")).toBeNull();
    expect(screen.getByText("Geral")).toBeTruthy();
  });

  it("período: mostra 'Últimos 30 dias' e escolher 7 dias avisa", async () => {
    const { aoMudarPeriodo } = montar();
    const seletor = screen.getByRole("combobox", { name: "Período" });
    expect(seletor.textContent).toContain("Últimos 30 dias");
    await userEvent.click(seletor);
    await userEvent.click(screen.getByRole("option", { name: "Últimos 7 dias" }));
    expect(aoMudarPeriodo).toHaveBeenCalledWith("7d");
  });

  it("os cinco cartões: totais em pt-BR, Com erro = falhou + parcial, última em data BR", () => {
    montar();
    expect(screen.getByRole("button", { name: /Execuções/ }).textContent).toContain("9.602");
    expect(screen.getByRole("button", { name: /Sucesso/ }).textContent).toContain("9.000");
    expect(screen.getByRole("button", { name: /Com erro/ }).textContent).toContain("10");
    expect(screen.getByRole("button", { name: /Esperando/ }).textContent).toContain("592");
    expect(screen.getByText("10/09/2026 12:40")).toBeTruthy();
  });

  it("clicar num cartão abre a listagem com o filtro dele; a última execução não é botão", async () => {
    const { aoAbrir } = montar();
    await userEvent.click(screen.getByRole("button", { name: /Sucesso/ }));
    expect(aoAbrir).toHaveBeenCalledWith({ origem: "painel", situacoes: ["success"] });
    expect(screen.queryByRole("button", { name: /Última execução/ })).toBeNull();
  });

  it("total 0 mostra 'Nenhuma execução neste período.'", () => {
    montar({ data: { ...RESUMO, total: 0, sucesso: 0, parcial: 0, falhou: 0, adiado: 0, ultima: null } });
    expect(screen.getByText("Nenhuma execução neste período.")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("carregando: esqueletos nos cinco cartões", () => {
    montar({ data: undefined, isPending: true });
    expect(screen.getAllByTestId("esqueleto-do-painel")).toHaveLength(5);
  });

  it("erro: mensagem e 'Tentar de novo' chama refetch", async () => {
    const { refetch } = montar({ data: undefined, isError: true });
    expect(screen.getByText("Não foi possível carregar os insights.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(refetch).toHaveBeenCalled();
  });
});
