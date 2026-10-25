import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "org1", role: "manager" }, user: { id: "u1" } }),
  useActiveOrg: () => ({ orgId: "org1", role: "manager", currency: "BRL" }),
  useUser: () => ({ id: "u1", full_name: "Régis" }),
  usePermission: () => true,
}));
const negocios = vi.hoisted(() => ({
  data: [
    {
      id: "l1",
      pipeline_id: "p1",
      stage_id: "s1",
      status: "open",
      updated_at: "2026-10-18T10:00:00Z",
      origem: { id: "p1", nome: "Obra Futura", grupo: "INSS Vendas" },
    },
  ] as unknown[],
  isLoading: false,
  isError: false,
}));
vi.mock("@/hooks/escale/useNegociosDoContato", () => ({
  useNegociosDoContato: () => negocios,
}));
const quadro = vi.hoisted(() => ({
  data: {
    pipeline: { id: "p1", name: "Obra Futura", settings: {} },
    stages: [
      {
        id: "s1",
        name: "1. Entrada Lead",
        position: 1,
        is_won: false,
        is_lost: false,
        is_archived: false,
      },
      {
        id: "s2",
        name: "2. Contato",
        position: 2,
        is_won: false,
        is_lost: false,
        is_archived: false,
      },
    ],
    leads: [
      {
        id: "l1",
        pipeline_id: "p1",
        stage_id: "s1",
        status: "open",
        title: "Neto Santos",
        value_cents: 0,
        currency: "BRL",
        owner_user_id: "u1",
        owner_agent_id: null,
        owner_kind: "user",
        contact_id: "ct1",
        position_in_stage: 1,
        lost_reason: null,
        custom_fields: {},
        conversa: { id: "cv1" },
      },
      {
        id: "l2",
        pipeline_id: "p1",
        stage_id: "s1",
        status: "open",
        title: "Outro",
        value_cents: 0,
        currency: "BRL",
        owner_user_id: null,
        owner_agent_id: null,
        owner_kind: "user",
        contact_id: "ct2",
        position_in_stage: 2,
        lost_reason: null,
        custom_fields: {},
        conversa: { id: "cv2" },
      },
    ],
  },
  isLoading: false,
  error: null,
}));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => quadro,
  chaveDoQuadro: (id: string) => ["board", id],
}));
const ganhar = vi.hoisted(() => vi.fn());
const perder = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/kanban/useUpdateLead", () => ({
  useWinLead: () => ({ mutate: ganhar, isPending: false }),
  useLoseLead: () => ({ mutate: perder, isPending: false }),
  useEditLead: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));
const mover = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/kanban/useMoveCard", () => ({
  useMoveCard: () => ({ mutate: mover, isPending: false }),
}));
vi.mock("@/hooks/kanban/useMotivosDePerdaDoFunil", () => ({
  useMotivosDePerdaDoFunil: () => [],
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({
    data: [{ user_id: "u1", full_name: "Camilly Victória", role: "agent" }],
  }),
}));
vi.mock("@/components/escale/negocio/DonoDaFicha", () => ({
  DonoDaFicha: () => <span data-testid="dono" />,
}));
vi.mock("@/components/escale/negocio/TagsDaFicha", () => ({
  TagsDaFicha: () => <span data-testid="tags" />,
}));
vi.mock("@/components/escale/conversas/painel/SecoesDoPainel", () => ({
  SecoesDoPainel: () => <div data-testid="secoes" />,
}));
vi.mock("@/components/escale/contatos/JanelaNovoNegocio", () => ({
  JanelaNovoNegocio: ({ contato }: { contato: unknown }) =>
    contato ? <div data-testid="janela-novo-negocio" /> : null,
}));

import { PainelDoContato } from "@/components/escale/conversas/painel/PainelDoContato";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const envolver = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
const conversa = {
  id: "cv1",
  contact_id: "ct1",
  status: "open",
  contacts: {
    id: "ct1",
    display_name: "Neto Santos",
    name: null,
    phone_number: "+5511997903216",
    tags: ["Janeiro/27"],
  },
  channel_sessions: { provider: "meta_cloud" },
} as unknown as ConversationWithContact;

describe("PainelDoContato (c01, c02, c48)", () => {
  it("sem conversa: 'Nenhuma conversa selecionada'", () => {
    envolver(<PainelDoContato conversa={null} aoAbrirConversa={vi.fn()} origens={[]} />);
    expect(screen.getByText("Nenhuma conversa selecionada")).toBeInTheDocument();
  });

  it("com conversa e negócio: Próximo negócio, o cabeçalho, o cartão com grupo › origem, etapa 1/2, valor, dono e os três botões", () => {
    const aoAbrirConversa = vi.fn();
    envolver(
      <PainelDoContato conversa={conversa} aoAbrirConversa={aoAbrirConversa} origens={[]} />,
    );
    expect(screen.getByText("Próximo negócio")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Neto Santos" })).toBeInTheDocument();
    expect(screen.getByText("INSS Vendas")).toBeInTheDocument();
    expect(screen.getByText("Obra Futura")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1\. Entrada Lead/ })).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
    expect(screen.getByText("Camilly Victória")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aberto" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Ganho" }));
    expect(ganhar).toHaveBeenCalledWith({ leadId: "l1" });
    fireEvent.click(screen.getByRole("button", { name: "Próximo negócio" }));
    expect(aoAbrirConversa).toHaveBeenCalledWith("cv2");
    expect(screen.getByRole("button", { name: "Negócio anterior" })).toBeDisabled();
  });

  it("Perdido pede o motivo e grava com 'Não informar'", () => {
    envolver(<PainelDoContato conversa={conversa} aoAbrirConversa={vi.fn()} origens={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Perdido" }));
    const motivo = screen.getByRole("combobox", { name: "Motivo da perda" });
    fireEvent.click(motivo);
    fireEvent.click(screen.getByRole("option", { name: "Não informar" }));
    expect(perder).toHaveBeenCalledWith({ leadId: "l1", lostReason: "other" }, expect.anything());
  });

  it("sem negócio: 'Adicionar negócio' abre a janela da 2A; as seções continuam", () => {
    negocios.data = [];
    envolver(<PainelDoContato conversa={conversa} aoAbrirConversa={vi.fn()} origens={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar negócio" }));
    expect(screen.getByTestId("janela-novo-negocio")).toBeInTheDocument();
    expect(screen.getByTestId("secoes")).toBeInTheDocument();
    negocios.data = [
      {
        id: "l1",
        pipeline_id: "p1",
        stage_id: "s1",
        status: "open",
        updated_at: "2026-10-18T10:00:00Z",
        origem: { id: "p1", nome: "Obra Futura", grupo: "INSS Vendas" },
      },
    ];
  });

  it("falha ao ler os negócios: a frase da Clint", () => {
    negocios.isError = true;
    envolver(<PainelDoContato conversa={conversa} aoAbrirConversa={vi.fn()} origens={[]} />);
    expect(
      screen.getByText("Não foi possível carregar as informações do contato."),
    ).toBeInTheDocument();
    negocios.isError = false;
  });
});
