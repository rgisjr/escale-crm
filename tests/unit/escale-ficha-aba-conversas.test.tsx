import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const conversas = vi.hoisted(() => ({
  data: [
    {
      id: "cv1",
      status: "open",
      channel: "whatsapp",
      last_message_at: "2026-10-14T10:00:00Z",
      last_message_preview: "Olá, me chamo Camilly",
      unread_count_for_assignee: 2,
      assigned_to_user_name: "Camilly Victória",
    },
    {
      id: "cv2",
      status: "closed",
      channel: "instagram",
      last_message_at: "2026-09-01T10:00:00Z",
      last_message_preview: "Obrigada",
      unread_count_for_assignee: 0,
      assigned_to_user_name: null,
    },
  ],
  isLoading: false,
  isError: false,
}));
vi.mock("@/hooks/escale/useConversasDoContato", () => ({ useConversasDoContato: () => conversas }));

import { AbaConversas } from "@/components/escale/negocio/abas/AbaConversas";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1H (C16, N9): todas as sessões do contato, como na Clint (print 05). */
const LEAD = { id: "n1", contact_id: "c1", title: "Ana" } as unknown as Lead;

describe("AbaConversas", () => {
  it("'N sessões', cada sessão com status, prévia, não lidas e atendente; clique abre no Inbox", () => {
    render(<AbaConversas lead={LEAD} />);
    expect(screen.getByText("2 sessões")).toBeInTheDocument();
    const itens = screen.getAllByRole("link");
    expect(itens[0]).toHaveAttribute("href", "/app/inbox?id=cv1");
    expect(within(itens[0]!).getByText("Em aberto")).toBeInTheDocument();
    expect(within(itens[0]!).getByText("Olá, me chamo Camilly")).toBeInTheDocument();
    expect(within(itens[0]!).getByText("2")).toBeInTheDocument();
    expect(within(itens[0]!).getByTitle("Atendente: Camilly Victória")).toHaveTextContent("C");
    expect(within(itens[1]!).getByText("Encerrada")).toBeInTheDocument();
    expect(screen.getByText("Selecione uma conversa")).toBeInTheDocument();
  });

  it("vazio, erro e negócio sem contato", () => {
    conversas.data = [];
    const { unmount } = render(<AbaConversas lead={LEAD} />);
    expect(
      screen.getByText("Este contato não possui conversas no atendimento"),
    ).toBeInTheDocument();
    unmount();
    conversas.isError = true;
    const r2 = render(<AbaConversas lead={LEAD} />);
    expect(screen.getByText("Não foi possível carregar as conversas.")).toBeInTheDocument();
    r2.unmount();
    conversas.isError = false;
    render(<AbaConversas lead={{ ...LEAD, contact_id: null } as unknown as Lead} />);
    expect(screen.getByText("Este negócio não tem contato.")).toBeInTheDocument();
  });

  it("o modo espião continua 'Em breve' (Fase 3)", () => {
    render(<AbaConversas lead={LEAD} />);
    expect(screen.getByRole("button", { name: "Ativar modo espião" })).toHaveAttribute(
      "title",
      "Em breve",
    );
  });
});
