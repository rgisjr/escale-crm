import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));
const contatos = vi.hoisted(() => ({
  data: {
    pages: [
      {
        data: [
          {
            id: "ct1",
            name: "Neto Santos",
            display_name: null,
            phone_number: "+5511997903216",
            email: "nettodagi@gmail.com",
            tags: [],
          },
        ],
      },
    ],
  },
  isLoading: false,
}));
vi.mock("@/hooks/contacts/useContactList", () => ({ useContactList: () => contatos }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({
    data: [
      {
        id: "ch1",
        provider: "waha",
        status: "WORKING",
        display_name: "Sara - 2230",
        phone_number: "+5511953042230",
        waha_session_name: "sara",
      },
      {
        id: "ch2",
        provider: "meta_cloud",
        status: "WORKING",
        display_name: "Suporte SAO",
        phone_number: "+5511900000000",
        waha_session_name: "sao",
      },
      {
        id: "ch3",
        provider: "waha",
        status: "STOPPED",
        display_name: "Camilly - 7066",
        phone_number: "+5562981027066",
        waha_session_name: "cam",
      },
    ],
    isLoading: false,
  }),
}));
vi.mock("@/components/escale/contatos/JanelaNovoContato", () => ({
  JanelaNovoContato: ({ aberta, nomeInicial }: { aberta: boolean; nomeInicial?: string }) =>
    aberta ? <div data-testid="janela-novo-contato">{nomeInicial}</div> : null,
}));

import { NovaConversa } from "@/components/escale/conversas/centro/NovaConversa";

const envolver = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );

describe("NovaConversa (c21, c84–c86)", () => {
  it("busca o contato, mostra telefone e e-mail, 'Criar' abre a janela com o nome", () => {
    envolver(<NovaConversa origens={[]} aoAbrirConversa={vi.fn()} aoCancelar={vi.fn()} />);
    expect(screen.getByText("Crie ou selecione um contato")).toBeInTheDocument();
    const busca = screen.getByRole("combobox", { name: "Pesquisar" });
    fireEvent.click(busca);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Neto" } });
    expect(screen.getByText("(11) 99790-3216")).toBeInTheDocument();
    expect(screen.getByText("nettodagi@gmail.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: 'Criar "Neto"' }));
    expect(screen.getByTestId("janela-novo-contato")).toHaveTextContent("Neto");
  });

  it("escolhido o contato, os dispositivos agrupados; escolher um abre a conversa", async () => {
    api.post.mockResolvedValueOnce({ data: { conversation_id: "cv9", contact_id: "ct1" } });
    const aoAbrirConversa = vi.fn();
    envolver(<NovaConversa origens={[]} aoAbrirConversa={aoAbrirConversa} aoCancelar={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Pesquisar" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Neto" } });
    fireEvent.click(screen.getByRole("option", { name: /Neto Santos/ }));
    expect(screen.getByRole("heading", { name: "Neto Santos" })).toBeInTheDocument();
    expect(screen.getByText("Selecione um dispositivo ou conta")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "Selecionar dispositivo ou conta" }));
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp Oficial")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Camilly - 7066/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    fireEvent.click(screen.getByRole("option", { name: /Sara - 2230/ }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/api/v1/conversations/open-with-contact", {
        contact_id: "ct1",
        channel_session_id: "ch1",
      }),
    );
    await waitFor(() => expect(aoAbrirConversa).toHaveBeenCalledWith("cv9"));
  });
});
