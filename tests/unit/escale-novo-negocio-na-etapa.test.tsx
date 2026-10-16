import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import type { Stage } from "@/lib/kanban/types";

vi.mock("@/hooks/kanban/useCreateLead", () => ({
  useCreateLead: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/contacts/useContactList", () => ({
  useContactList: () => ({ data: { pages: [{ data: [] }] }, isLoading: false }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ currency: "BRL", country: null }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const ETAPAS = [
  { id: "e-1", name: "Entrada", is_won: false, is_lost: false, is_archived: false },
  { id: "e-2", name: "Proposta", is_won: false, is_lost: false, is_archived: false },
] as unknown as Stage[];

const dialogo = (open: boolean, etapaInicial?: string | null) => (
  <NewLeadDialog
    open={open}
    onOpenChange={() => {}}
    pipelineId="p-1"
    stages={ETAPAS}
    etapaInicial={etapaInicial}
  />
);

afterEach(cleanup);

describe("<NewLeadDialog etapaInicial> (Fase 1E)", () => {
  it("abre na etapa da coluna", () => {
    render(dialogo(true, "e-2"));
    expect(screen.getByRole("combobox")).toHaveTextContent("Proposta");
  });

  it("fechar e abrir de novo pelo 'Novo negócio' (null) volta para a etapa padrão", () => {
    const { rerender } = render(dialogo(true, "e-2"));
    rerender(dialogo(false, null));
    rerender(dialogo(true, null));
    expect(screen.getByRole("combobox")).toHaveTextContent("Entrada");
  });

  it("sem a prop (lateral e Inbox), nada muda: abre na primeira etapa aberta", () => {
    render(dialogo(true));
    expect(screen.getByRole("combobox")).toHaveTextContent("Entrada");
  });
});
