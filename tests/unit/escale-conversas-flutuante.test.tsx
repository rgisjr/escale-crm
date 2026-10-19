import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let caminho = "/app/kanban";
vi.mock("next/navigation", () => ({
  usePathname: () => caminho,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "o1", role: "agent" } }),
}));
const filaMock = vi.hoisted(() => ({
  fila: vi.fn(),
  resposta: { data: { pages: [{ data: [] as unknown[] }] }, isLoading: false, isError: false },
}));
vi.mock("@/hooks/escale/useFilaDeConversas", () => ({
  useFilaDeConversas: (...args: unknown[]) => {
    filaMock.fila(...args);
    return filaMock.resposta;
  },
}));
const preferencias = vi.hoisted(() => ({ data: { visualizacao: {} } }));
vi.mock("@/hooks/escale/usePreferenciasDeConversas", () => ({
  usePreferenciasDeConversas: () => preferencias,
}));
vi.mock("@/components/escale/conversas/fila/MenuDePresets", () => ({
  MenuDePresets: () => <button type="button">Todos</button>,
}));
vi.mock("@/components/escale/conversas/fila/MenuDeOrdem", () => ({ MenuDeOrdem: () => null }));
vi.mock("@/components/escale/conversas/fila/FotoDaConversa", () => ({
  FotoDaConversa: () => null,
}));
vi.mock("@/components/escale/conversas/fila/LinhaDaFila", () => ({
  LinhaDaFila: ({ conversa }: { conversa: { id: string; contacts?: { name?: string } } }) => (
    <span>linha {conversa.contacts?.name}</span>
  ),
}));
vi.mock("@/components/escale/conversas/ConversaEmbutida", () => ({ ConversaEmbutida: () => null }));
vi.mock("@/components/escale/menu/ContadorDaFilaDaCasca", () => ({
  ContadorDaFilaDaCasca: ({ limite }: { limite: number }) => (
    <span data-testid="selo-do-fab" data-limite={limite} />
  ),
}));

import { ConversasFlutuante } from "@/components/escale/ConversasFlutuante";

function renderizar(reserva = 0) {
  return render(<ConversasFlutuante reservaDoRodape={reserva} />);
}

beforeEach(() => {
  caminho = "/app/kanban";
  filaMock.fila.mockClear();
  filaMock.resposta = { data: { pages: [{ data: [] }] }, isLoading: false, isError: false };
});

describe("<ConversasFlutuante> (FAB da Clint)", () => {
  it("círculo de 50px com o selo da fila limitado a +9", () => {
    renderizar();
    const botao = screen.getByRole("button", { name: "Conversas recentes" });
    expect(botao).toHaveClass("size-[50px]", "rounded-full");
    expect(within(botao).getByTestId("selo-do-fab")).toHaveAttribute("data-limite", "9");
    expect(botao).not.toHaveAttribute("data-aberto");
  });

  it("só busca quando abre; aberto, vira X, o selo some e o painel traz a mini-fila da Clint", async () => {
    filaMock.resposta = {
      data: { pages: [{ data: [{ id: "c-1", contacts: { name: "Marcos Teixeira" } }] }] },
      isLoading: false,
      isError: false,
    };
    const user = userEvent.setup();
    renderizar();
    expect(filaMock.fila).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Conversas recentes" }));
    const botao = screen.getByRole("button", { name: "Conversas recentes" });
    expect(botao).toHaveAttribute("data-aberto");
    expect(within(botao).queryByTestId("selo-do-fab")).toBeNull();
    const painel = screen.getByRole("dialog", { name: "Conversas recentes" });
    expect(within(painel).getByRole("heading", { name: "Conversas" })).toBeInTheDocument();
    expect(within(painel).getByRole("searchbox", { name: "Pesquisar" })).toBeInTheDocument();
    expect(within(painel).getByText("linha Marcos Teixeira")).toBeInTheDocument();
    expect(filaMock.fila).toHaveBeenCalled();
  });

  it("sem conversa, diz que não há", async () => {
    const user = userEvent.setup();
    renderizar();
    await user.click(screen.getByRole("button", { name: "Conversas recentes" }));
    expect(screen.getByText("Nenhuma conversa ainda.")).toBeInTheDocument();
  });

  it("não aparece dentro de Conversas, onde seria repetição", () => {
    caminho = "/app/inbox/c-1";
    renderizar();
    expect(screen.queryByRole("button", { name: "Conversas recentes" })).toBeNull();
  });

  it("fica a 30px da direita e 36px da base, e sobe acima de peça fixa do rodapé", () => {
    const { container, unmount } = renderizar(0);
    const solto = container.firstElementChild as HTMLElement;
    expect(solto.style.right).toBe("30px");
    expect(solto.style.bottom).toBe("36px");
    unmount();
    const comPeca = renderizar(80).container.firstElementChild as HTMLElement;
    expect(comPeca.style.bottom).toBe("116px");
  });

  it("Fase 1G (C9): aparece por cima da ficha do negócio, que é página e não tem cortina", () => {
    caminho = "/app/negocios/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
    renderizar();
    expect(screen.getByRole("button", { name: "Conversas recentes" })).toBeInTheDocument();
  });
});
