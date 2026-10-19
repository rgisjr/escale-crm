import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CartaoPausarAutomacao } from "@/components/escale/conversas/painel/CartaoPausarAutomacao";
import type { EstadoDaPausa } from "@/hooks/escale/useConversaDaCasca";

const pausar = vi.fn();
const retomar = vi.fn();
let estado: EstadoDaPausa = {
  pausa: null,
  agenteAtivo: true,
  followups: { ativos: 0, proximoEm: null },
};
vi.mock("@/hooks/escale/useConversaDaCasca", () => ({
  useConversaDaCasca: () => ({
    pausa: estado,
    pausar: { mutate: pausar, isPending: false },
    retomar: { mutate: retomar, isPending: false },
  }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u2", role: "agent", full_name: "Bia Lima" }] }),
}));
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  pausar.mockClear();
  retomar.mockClear();
  estado = { pausa: null, agenteAtivo: true, followups: { ativos: 0, proximoEm: null } };
});

describe("CartaoPausarAutomacao (c06, c07, c74)", () => {
  it("fechado mostra o título; aberto mostra 'Nenhuma automação ativa' e 'Pausar ▾' com os 4 prazos, Até retomar e Escolher data e hora", () => {
    estado = { ...estado, agenteAtivo: false };
    wrap(<CartaoPausarAutomacao conversationId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: /Pausar automação/ }));
    expect(screen.getByText("Nenhuma automação ativa")).toBeInTheDocument();
    expect(screen.getByText("Nesta conversa")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(screen.getByText("Pausar todas por")).toBeInTheDocument();
    for (const r of [
      "30 minutos",
      "1 hora",
      "4 horas",
      "1 dia",
      "Até retomar",
      "Escolher data e hora",
    ])
      expect(screen.getByText(r)).toBeInTheDocument();
    fireEvent.click(screen.getByText("1 hora"));
    const ate = pausar.mock.calls[0]![0].ate as string;
    expect(Math.abs(Date.parse(ate) - (Date.now() + 3_600_000))).toBeLessThan(5_000);
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    fireEvent.click(screen.getByText("Até retomar"));
    expect(pausar).toHaveBeenLastCalledWith({ ate: null });
  });
  it("com pausa vigente mostra 'Pausa de todas', o selo, quem pausou e 'Retomar'", () => {
    estado = {
      pausa: { ate: null, user_id: "u2", created_at: "2026-10-18T10:00:00Z" },
      agenteAtivo: false,
      followups: { ativos: 1, proximoEm: null },
    };
    wrap(<CartaoPausarAutomacao conversationId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: /Pausar automação/ }));
    expect(screen.getByText("Pausa de todas")).toBeInTheDocument();
    expect(screen.getByText("Até retomar")).toBeInTheDocument();
    expect(screen.getByText(/Por Bia Lima/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retomar" }));
    expect(retomar).toHaveBeenCalled();
  });
});
