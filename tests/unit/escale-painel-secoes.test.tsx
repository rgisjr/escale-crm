import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { SECOES_PADRAO } from "@/lib/escale/conversas/secoes";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org1", role: "manager" }),
  useUser: () => ({ id: "u1" }),
  usePermission: () => true,
}));
vi.mock("@/hooks/escale/useAtividadesDoNegocio", () => ({
  useAtividadesDoNegocio: () => ({
    dados: {
      atividades: [
        {
          id: "a1",
          title: "Pré-qualificação",
          due_date: "2026-10-01T10:00:00Z",
          status: "pending",
          tipo: "tarefa",
        },
        {
          id: "a2",
          title: "Ligação 1",
          due_date: "2099-01-01T10:00:00Z",
          status: "pending",
          tipo: "ligacao",
        },
      ],
      modelos: [],
    },
    carregando: false,
    falhou: false,
    alternar: vi.fn(),
    excluir: vi.fn(),
    editar: vi.fn(),
    recarregar: vi.fn(),
  }),
}));
const gravarContato = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/hooks/escale/useGravarContato", () => ({
  useGravarContato: () => ({ gravar: gravarContato }),
  ContatoNaoCarregado: class extends Error {},
}));
vi.mock("@/hooks/contacts/useContact", () => ({
  useContact: () => ({
    data: {
      data: {
        id: "ct1",
        name: "Neto Santos",
        email: "nettodagi@gmail.com",
        phone_number: "+5511997903216",
        tags: ["Janeiro/27"],
        custom_fields: {},
      },
    },
    isError: false,
  }),
}));
vi.mock("@/components/escale/negocio/TagsDaFicha", () => ({
  TagsDaFicha: () => <span data-testid="tags" />,
}));
const notas = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false }));
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({
  useNotasDoNegocio: () => notas,
  useCriarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEditarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/components/escale/negocio/JanelaDeNota", () => ({
  JanelaDeNota: ({ aberta }: { aberta: boolean }) =>
    aberta ? <div data-testid="janela-de-nota" /> : null,
}));
vi.mock("@/components/escale/conversas/painel/secoes/SecaoAtividades", () => ({
  SecaoAtividades: () => <div data-testid="secao-atividades" />,
}));
vi.mock("@/components/escale/conversas/painel/secoes/SecaoNegocio", () => ({
  SecaoNegocio: () => <div data-testid="secao-negocio" />,
}));
vi.mock("@/components/escale/conversas/painel/secoes/SecaoAnexos", () => ({
  SecaoAnexos: () => <div data-testid="secao-anexos" />,
}));
vi.mock("@/components/escale/conversas/painel/secoes/SecaoHistorico", () => ({
  SecaoHistorico: () => <div data-testid="secao-historico" />,
}));
vi.mock("@/components/escale/conversas/painel/secoes/SecaoConversas", () => ({
  SecaoConversas: () => <div data-testid="secao-conversas" />,
}));

import { SecoesDoPainel } from "@/components/escale/conversas/painel/SecoesDoPainel";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const conversa = {
  id: "cv1",
  contact_id: "ct1",
  contacts: {
    id: "ct1",
    display_name: "Neto Santos",
    name: null,
    phone_number: "+5511997903216",
    tags: [],
  },
} as unknown as ConversationWithContact;
const quadro = {
  lead: {
    id: "l1",
    pipeline_id: "p1",
    stage_id: "s1",
    status: "open",
    contact_id: "ct1",
    custom_fields: {},
    value_cents: 0,
    currency: "BRL",
  },
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
  ],
  leads: [],
} as unknown as QuadroDoNegocio;

describe("SecoesDoPainel (c15, c49, c48)", () => {
  it("as 8 seções com o contador e '1 atrasada' em Atividades; sem negócio, sem Atividades e Negócio", () => {
    const { rerender } = envolver(
      <SecoesDoPainel
        conversa={conversa}
        quadro={quadro}
        secoes={SECOES_PADRAO}
        aoMudarSecoes={vi.fn()}
        aoAbrirConversa={vi.fn()}
      />,
    );
    const lista = screen.getByRole("list", { name: "Seções" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(8);
    const atividades = within(lista).getByRole("button", { name: /Atividades/ });
    expect(atividades).toHaveTextContent("2");
    expect(atividades).toHaveTextContent("1 atrasada");
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <SecoesDoPainel
          conversa={conversa}
          quadro={null}
          secoes={SECOES_PADRAO}
          aoMudarSecoes={vi.fn()}
          aoAbrirConversa={vi.fn()}
        />
      </QueryClientProvider>,
    );
    expect(
      within(screen.getByRole("list", { name: "Seções" })).getAllByRole("listitem"),
    ).toHaveLength(6);
  });

  it("'Seções visíveis' liga e desliga; 'Mostrar todas' liga as 8", () => {
    const aoMudarSecoes = vi.fn();
    envolver(
      <SecoesDoPainel
        conversa={conversa}
        quadro={quadro}
        secoes={{ ...SECOES_PADRAO, notas: false }}
        aoMudarSecoes={aoMudarSecoes}
        aoAbrirConversa={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /^Notas/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Personalizar seções" }));
    fireEvent.click(screen.getByRole("switch", { name: "Notas" }));
    expect(aoMudarSecoes).toHaveBeenCalledWith({ notas: true });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar todas" }));
    expect(aoMudarSecoes).toHaveBeenLastCalledWith(SECOES_PADRAO);
  });

  it("abrir Contato mostra os campos e salva; 'Voltar' retorna", async () => {
    envolver(
      <SecoesDoPainel
        conversa={conversa}
        quadro={quadro}
        secoes={SECOES_PADRAO}
        aoMudarSecoes={vi.fn()}
        aoAbrirConversa={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Contato/ }));
    expect(screen.getByRole("heading", { name: "Contato" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Neto Santos")).toBeInTheDocument();
    expect(screen.getByDisplayValue("nettodagi@gmail.com")).toBeInTheDocument();
    expect(screen.getByTestId("tags")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("list", { name: "Seções" })).toBeInTheDocument();
  });

  it("Empresa é a moldura 'Clique aqui para adicionar'; Notas tem '+ Adicionar nota' e o vazio", () => {
    envolver(
      <SecoesDoPainel
        conversa={conversa}
        quadro={quadro}
        secoes={SECOES_PADRAO}
        aoMudarSecoes={vi.fn()}
        aoAbrirConversa={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Empresa/ }));
    expect(screen.getByText("Nome da empresa")).toBeInTheDocument();
    expect(screen.getByText("Clique aqui para adicionar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("button", { name: /^Notas/ }));
    expect(screen.getByText("Nenhuma nota ainda.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar nota" }));
    expect(screen.getByTestId("janela-de-nota")).toBeInTheDocument();
  });
});
