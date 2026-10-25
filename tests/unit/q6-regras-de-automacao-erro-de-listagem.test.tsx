import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * B6-5: se a listagem das automações falha, a aba NÃO pode dizer "Crie sua
 * primeira automação" (levaria a recriar regras que já existem).
 */
const estado = vi.hoisted(() => ({
  q: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() },
}));

vi.mock("@/hooks/webhooks/useAutomationRules", () => ({
  useAutomationRules: () => estado.q,
  useUpdateAutomationRule: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteAutomationRule: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/app/app/webhooks/_components/RuleEditor", () => ({ RuleEditor: () => null }));

import { RulesTab } from "@/app/app/webhooks/_components/RulesTab";

function montar() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <RulesTab />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  estado.q = { data: undefined, isLoading: false, isError: false, refetch: vi.fn() };
});

describe("aba de automações com erro de listagem", () => {
  it("erro mostra aviso e 'Tentar de novo', nunca o vazio", () => {
    estado.q = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
    montar();
    expect(screen.queryByText("Crie sua primeira automação")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(estado.q.refetch).toHaveBeenCalledTimes(1);
  });

  it("CONTROLE: lista vazia sem erro continua mostrando o convite", () => {
    estado.q = { data: { data: [] }, isLoading: false, isError: false, refetch: vi.fn() };
    montar();
    expect(screen.getByText("Crie sua primeira automação")).toBeTruthy();
  });
});
