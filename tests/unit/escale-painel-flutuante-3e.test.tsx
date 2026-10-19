import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "o1", role: "agent" } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/app",
}));
vi.mock("@/hooks/escale/useFilaDeConversas", () => ({
  useFilaDeConversas: () => ({
    data: { pages: [{ data: [{ id: "cv1", contacts: { name: "Maria" } }] }] },
    isLoading: false,
    isError: false,
  }),
}));
vi.mock("@/hooks/escale/usePreferenciasDeConversas", () => ({
  usePreferenciasDeConversas: () => ({ data: { visualizacao: {} } }),
}));
vi.mock("@/components/escale/conversas/fila/MenuDePresets", () => ({
  MenuDePresets: () => <button type="button">Todos</button>,
}));
vi.mock("@/components/escale/conversas/fila/MenuDeOrdem", () => ({ MenuDeOrdem: () => null }));
vi.mock("@/components/escale/conversas/fila/LinhaDaFila", () => ({
  LinhaDaFila: ({
    conversa,
    aoSelecionar,
  }: {
    conversa: { id: string };
    aoSelecionar: (id: string) => void;
  }) => (
    <button type="button" onClick={() => aoSelecionar(conversa.id)}>
      linha {conversa.id}
    </button>
  ),
}));
vi.mock("@/components/escale/conversas/fila/FotoDaConversa", () => ({
  FotoDaConversa: () => null,
}));
vi.mock("@/components/escale/conversas/ConversaEmbutida", () => ({
  ConversaEmbutida: ({ conversationId }: { conversationId: string }) => (
    <div data-testid="embutida">{conversationId}</div>
  ),
}));

import { PainelDeConversas } from "@/components/escale/ConversasFlutuante";

describe("o painel flutuante (01-025; F3, N12)", () => {
  it("a mini-fila com 'Pesquisar' e o botão de presets; clicar abre a conversa dentro; ‹ volta", () => {
    render(<PainelDeConversas />);
    expect(screen.getByRole("searchbox", { name: "Pesquisar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "linha cv1" }));
    expect(screen.getByTestId("embutida")).toHaveTextContent("cv1");
    expect(screen.getByRole("link", { name: /Abrir em Conversas/ })).toHaveAttribute(
      "href",
      "/app/inbox?id=cv1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("button", { name: "linha cv1" })).toBeInTheDocument();
  });
});
