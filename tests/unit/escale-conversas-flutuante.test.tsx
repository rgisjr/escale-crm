import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let caminho = "/app/kanban";
vi.mock("next/navigation", () => ({ usePathname: () => caminho }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));
vi.mock("@/components/escale/menu/ContadorDaFilaDaCasca", () => ({
  ContadorDaFilaDaCasca: ({ limite }: { limite: number }) => <span data-testid="selo-do-fab" data-limite={limite} />,
}));

import { apiClient } from "@/lib/api/client";
import { ConversasFlutuante } from "@/components/escale/ConversasFlutuante";

function renderizar(reserva = 0) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConversasFlutuante reservaDoRodape={reserva} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  caminho = "/app/kanban";
  vi.mocked(apiClient.get).mockReset();
});

describe("<ConversasFlutuante> (FAB da Clint)", () => {
  it("círculo de 50px com o selo da fila limitado a +9", () => {
    renderizar();
    const botao = screen.getByRole("button", { name: "Conversas recentes" });
    expect(botao).toHaveClass("size-[50px]", "rounded-full");
    expect(within(botao).getByTestId("selo-do-fab")).toHaveAttribute("data-limite", "9");
    expect(botao).not.toHaveAttribute("data-aberto");
  });

  it("só busca quando abre; aberto, vira X, o selo some e o painel tem o título Conversas", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        {
          id: "c-1",
          last_message_preview: "Tem CNO aberto já",
          unread_count_for_assignee: 2,
          contacts: { display_name: "Marcos Teixeira", name: null },
        },
      ],
    });
    const user = userEvent.setup();
    renderizar();
    expect(apiClient.get).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Conversas recentes" }));
    const botao = screen.getByRole("button", { name: "Conversas recentes" });
    expect(botao).toHaveAttribute("data-aberto");
    expect(within(botao).queryByTestId("selo-do-fab")).toBeNull();
    const painel = screen.getByRole("dialog", { name: "Conversas recentes" });
    expect(within(painel).getByRole("heading", { name: "Conversas" })).toBeInTheDocument();
    expect(await screen.findByText("Marcos Teixeira")).toBeInTheDocument();
    expect(screen.getByText("Tem CNO aberto já")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Marcos Teixeira/ })).toHaveAttribute("href", "/app/inbox/c-1");
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/conversations?limit=5&exclude_finished=true");
  });

  it("sem conversa, diz que não há", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    const user = userEvent.setup();
    renderizar();
    await user.click(screen.getByRole("button", { name: "Conversas recentes" }));
    expect(await screen.findByText("Nenhuma conversa ainda.")).toBeInTheDocument();
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
