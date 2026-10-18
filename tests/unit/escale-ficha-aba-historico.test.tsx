import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u1" }),
  useActiveOrg: () => ({ orgId: "o", role: "agent" }),
}));
const hist = vi.hoisted(() => ({
  grupo: "todos",
  itens: [
    {
      id: "1",
      type: "task_completed",
      performed_at: new Date().toISOString(),
      payload: {},
      metadata: {},
      source_module: "tarefas",
      actor_kind: "user",
      actor_user_name: "Camilly Victória",
      reason: "Atividade Entrada de Lead concluída",
    },
    {
      id: "2",
      type: "stage_changed",
      performed_at: new Date(Date.now() - 86_400_000).toISOString(),
      payload: { from_stage_id: "e1", to_stage_id: "e2" },
      metadata: {},
      source_module: "crm",
      actor_kind: "user",
      actor_user_name: "Henrique",
      reason: "",
    },
    {
      id: "3",
      type: "note",
      performed_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      payload: { nota_id: "x1" },
      metadata: {},
      source_module: "escale",
      actor_kind: "user",
      actor_user_name: "Ana",
      reason: "Nova nota",
    },
  ],
  temMais: true,
  carregarMais: vi.fn(),
}));
vi.mock("@/hooks/escale/useHistoricoDoNegocio", () => ({
  useHistoricoDoNegocio: (_lead: string, grupo: string) => {
    hist.grupo = grupo;
    return {
      itens: hist.itens,
      isLoading: false,
      isError: false,
      temMais: hist.temMais,
      carregarMais: hist.carregarMais,
      carregandoMais: false,
    };
  },
}));
const notas = vi.hoisted(() => ({ excluir: vi.fn(async () => undefined) }));
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({
  useNotasDoNegocio: () => ({
    data: [
      {
        id: "x1",
        lead_id: "n1",
        user_id: "u1",
        user_nome: "Ana",
        texto: "Ligar amanhã cedo",
        created_at: "",
        updated_at: "",
      },
    ],
  }),
  useExcluirNota: () => ({ mutateAsync: notas.excluir }),
  useCriarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEditarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { AbaHistorico } from "@/components/escale/negocio/abas/AbaHistorico";
import { CartaoDoHistorico } from "@/components/escale/negocio/abas/CartaoDoHistorico";
import type { TimelineItemView } from "@/lib/types/contacts";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1H (C18, N12): o Histórico da Clint (prints 07 e 12). */
const LEAD = { id: "n1", contact_id: "c1" } as unknown as Lead;
const STAGES = [
  { id: "e1", name: "1. Entrada Lead", position: 0 },
  { id: "e2", name: "2. Qualificação", position: 1 },
] as unknown as Stage[];
beforeEach(() => vi.clearAllMocks());

describe("AbaHistorico", () => {
  it("seções Hoje/Ontem e os cartões com título, corpo e autor; a etapa com os nomes do quadro", () => {
    render(<AbaHistorico lead={LEAD} stages={STAGES} />);
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.getByText("Ontem")).toBeInTheDocument();
    const etapa = screen.getByText("Mudou de etapa").closest("li") as HTMLElement;
    expect(within(etapa).getByText("1. Entrada Lead")).toBeInTheDocument();
    expect(within(etapa).getByText("2. Qualificação")).toBeInTheDocument();
    expect(within(etapa).getByText(/(?<![a-z])por(?![a-z])/)).toHaveTextContent("Henrique");
  });

  it("a busca filtra na tela; o filtro de grupo vai ao hook", async () => {
    render(<AbaHistorico lead={LEAD} stages={STAGES} />);
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Buscar no histórico..." }),
      "qualifica",
    );
    expect(screen.getByText("Mudou de etapa")).toBeInTheDocument();
    expect(screen.queryByText("Nova nota")).toBeNull();
    await userEvent.clear(screen.getByRole("searchbox", { name: "Buscar no histórico..." }));
    await userEvent.click(screen.getByRole("combobox", { name: "Selecione um grupo" }));
    await userEvent.click(await screen.findByRole("option", { name: "Notas" }));
    expect(hist.grupo).toBe("notas");
  });

  it("a nota mostra 'Ver nota'; expandida, o texto, 'Editar nota' e a lixeira com a confirmação", async () => {
    render(<AbaHistorico lead={LEAD} stages={STAGES} />);
    await userEvent.click(screen.getByRole("button", { name: "Ver nota" }));
    expect(screen.getByText("Ligar amanhã cedo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar nota" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remover nota" }));
    expect(await screen.findByText("Deseja remover a nota?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(notas.excluir).toHaveBeenCalledWith("x1");
  });

  it("'Carregar mais' enquanto houver página; sem resultado, o texto da Clint", async () => {
    render(<AbaHistorico lead={LEAD} stages={STAGES} />);
    await userEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    expect(hist.carregarMais).toHaveBeenCalled();
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar no histórico..." }), "zzzz");
    expect(screen.getByText("Os resultados não foram encontrados.")).toBeInTheDocument();
  });

  it("só diz que a nota foi removida quando a lista de notas carregou e não a traz", () => {
    const item = hist.itens[2] as unknown as TimelineItemView;
    const props = { item, nomesDasEtapas: {}, leadId: "n1", podeEditarNota: false };
    const { rerender } = render(<CartaoDoHistorico {...props} />);
    expect(screen.queryByText("Esta nota foi removida.")).toBeNull();
    rerender(<CartaoDoHistorico {...props} notaRemovida />);
    expect(screen.getByText("Esta nota foi removida.")).toBeInTheDocument();
  });
});
