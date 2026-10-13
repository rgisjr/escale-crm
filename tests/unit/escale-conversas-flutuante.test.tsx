import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let caminho = "/app/kanban";
vi.mock("next/navigation", () => ({ usePathname: () => caminho }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));
vi.mock("@/components/shell/ContadorDaFila", () => ({ ContadorDaFila: () => null }));

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

describe("<ConversasFlutuante>", () => {
  it("só busca quando abre, e lista contato, prévia e não lidas", async () => {
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

  it("sobe acima de peça fixa do rodapé", () => {
    const { container } = renderizar(80);
    // jsdom (via cssstyle) reordena os operandos do calc() ao normalizar o
    // valor armazenado em `style` — "calc(1rem + 80px)" sai como
    // "calc(80px + 1rem)" mesmo sem nenhuma mudança no componente. A adição é
    // comutativa, então o efeito visual é idêntico; o teste verifica o valor
    // já canonicalizado pelo jsdom em vez do literal escrito no componente.
    expect((container.firstElementChild as HTMLElement).style.bottom).toBe("calc(80px + 1rem)");
  });
});
