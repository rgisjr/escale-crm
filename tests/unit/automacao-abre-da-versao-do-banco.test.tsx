import * as React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Salvar e reabrir mostrava a versão antiga (28/10/2026): o editor abria da
 * cópia da lista, que podia estar velha. Agora "Editar automação" lê a regra do
 * banco antes de abrir, e o editor recebe ESSA versão.
 */
const h = vi.hoisted(() => ({ buscar: vi.fn() }));

const naLista = {
  id: "r1",
  name: "Primeira msg csa",
  trigger_event: "contact.tag_added",
  actions: [{ type: "send_whatsapp_message", config: { template: "Olá {{nome}}" } }],
  is_active: true,
  last_change_actor_kind: null,
  last_change_at: null,
};
const noBanco = {
  ...naLista,
  actions: [{ type: "send_whatsapp_message", config: { template: "Olá [CONTACT.FIRST_NAME]" } }],
};

vi.mock("@/hooks/webhooks/useAutomationRules", () => ({
  useAutomationRules: () => ({ data: { data: [naLista] }, isLoading: false, isError: false, refetch: vi.fn() }),
  opcoesDaRegra: (id: string) => ({ queryKey: ["automation-rule", id], queryFn: () => h.buscar(id), staleTime: 0 }),
  useUpdateAutomationRule: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteAutomationRule: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/app/app/webhooks/_components/RuleEditor", () => ({
  RuleEditor: ({ open, rule }: { open: boolean; rule: typeof naLista | null }) =>
    open ? <p data-testid="editor">{String(rule?.actions[0]?.config.template)}</p> : null,
}));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));

import { RulesTab } from "@/app/app/webhooks/_components/RulesTab";
import { showApiError } from "@/components/feedback/ApiErrorToast";

function montar() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RulesTab />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  h.buscar.mockReset();
});

describe("editar automação abre da versão do banco", () => {
  it("o editor recebe a regra lida na hora, não a cópia da lista", async () => {
    h.buscar.mockResolvedValue({ data: noBanco });
    montar();

    fireEvent.click(screen.getByRole("button", { name: "Editar automação" }));

    expect(await screen.findByTestId("editor")).toHaveTextContent("Olá [CONTACT.FIRST_NAME]");
    expect(h.buscar).toHaveBeenCalledWith("r1");
  });

  it("se a leitura falha, avisa e não abre a versão velha", async () => {
    h.buscar.mockRejectedValue(new Error("rede"));
    montar();

    fireEvent.click(screen.getByRole("button", { name: "Editar automação" }));

    await waitFor(() => expect(showApiError).toHaveBeenCalled());
    expect(screen.queryByTestId("editor")).toBeNull();
  });
});
