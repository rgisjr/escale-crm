import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGravarContato } from "@/hooks/escale/useGravarContato";
import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";
import { AbaArquivos } from "@/components/escale/negocio/abas/AbaArquivos";
import { AbaConversas } from "@/components/escale/negocio/abas/AbaConversas";

vi.mock("@/hooks/contacts/useUpdateContact", () => ({
  useUpdateContact: () => ({
    mutateAsync: vi.fn(async (patch: Record<string, unknown>) => ({ data: { id: "c1", ...patch } })),
  }),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u1" }),
  useActiveOrg: () => ({ orgId: "o1", role: "agent" }),
  usePermission: () => true,
}));
vi.mock("@/components/inbox/ChatThread", () => ({
  ChatThread: ({ conversationId }: { conversationId: string }) => <div data-testid="thread">{conversationId}</div>,
}));

const chamadas: Array<{ url: string; metodo: string; corpo?: unknown }> = [];
beforeEach(() => {
  chamadas.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      chamadas.push({ url, metodo: init?.method ?? "GET", corpo: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.startsWith("/api/v1/conversations") && url.includes("contact_id=c2")) {
        return Response.json({
          data: [
            { id: "cv1", status: "open", last_message_at: "2026-10-17T19:31:00Z", last_message_preview: "Olá", unread_count_for_assignee: 0, assigned_to_user_name: null, channel_sessions: { provider: "waha", display_name: "Grupo" } },
            { id: "cv2", status: "closed", last_message_at: "2026-10-16T10:00:00Z", last_message_preview: "Olá de novo", unread_count_for_assignee: 0, assigned_to_user_name: null, channel_sessions: { provider: "waha", display_name: "Grupo" } },
          ],
        });
      }
      if (url.startsWith("/api/v1/conversations")) {
        return Response.json({
          data: [
            { id: "cv1", status: "open", last_message_at: "2026-10-17T19:31:00Z", last_message_preview: "Olá", unread_count_for_assignee: 0, assigned_to_user_name: null, channel_sessions: { provider: "waha", display_name: "Grupo" } },
          ],
        });
      }
      if (url.includes("/arquivos")) return Response.json({ data: [] });
      return Response.json({ data: { id: "nt1" } }, { status: 201 });
    }),
  );
});

function comConsulta(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("as abas da ficha servem ao contato (Fase 2E, N5)", () => {
  it("nota do contato vai para a rota do contato", async () => {
    comConsulta(<JanelaDeNota alvo={{ tipo: "contato", id: "c1" }} aberta onFechar={() => undefined} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ligar amanhã" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(chamadas).toContainEqual({ url: "/api/v1/contatos/c1/notas", metodo: "POST", corpo: { texto: "ligar amanhã" } }),
    );
  });

  it("Conversas pelo contato: a primeira sessão abre à direita (N7)", async () => {
    comConsulta(<AbaConversas contatoId="c1" foto={null} />);
    expect(await screen.findByTestId("thread")).toHaveTextContent("cv1");
    expect(screen.getByRole("link", { name: /Abrir em Conversas/ })).toHaveAttribute("href", "/app/inbox?id=cv1");
  });

  it("Arquivos pelo contato, sem negócio", async () => {
    comConsulta(<AbaArquivos contatoId="c1" leadId={null} />);
    await waitFor(() => expect(chamadas.some((c) => c.url === "/api/v1/contacts/c1/arquivos")).toBe(true));
  });

  it("clicar em outra sessão troca a conversa da direita", async () => {
    comConsulta(<AbaConversas contatoId="c2" foto={null} />);
    expect(await screen.findByTestId("thread")).toHaveTextContent("cv1");
    fireEvent.click(screen.getByRole("button", { name: /Olá de novo/ }));
    expect(await screen.findByTestId("thread")).toHaveTextContent("cv2");
    expect(screen.getByRole("button", { name: /Olá de novo/ })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("useGravarContato sem origem (janela do contato)", () => {
  it("grava e não refaz quadro nenhum", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["contact", "c1"], { data: { id: "c1", name: "A", tags: [], custom_fields: {} } });
    const espiao = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useGravarContato("c1", null), {
      wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
    });
    await act(async () => {
      await result.current.gravar({ name: "Ana" } as never);
    });
    const chaves = espiao.mock.calls.map(([f]) => (f as { queryKey?: readonly unknown[] } | undefined)?.queryKey?.[0]);
    expect(chaves).toContain("timeline");
    expect(chaves).not.toContain("board");
  });
});
