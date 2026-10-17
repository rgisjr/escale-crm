import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR" }));
const tarefas = vi.hoisted(() => ({ lista: [] as unknown[] }));
vi.mock("@/hooks/tasks/useTasks", () => ({
  useTasks: () => ({ tarefas: tarefas.lista, carregando: false, falhou: false }),
}));
const linha = vi.hoisted(() => ({ itens: [] as unknown[] }));
vi.mock("@/hooks/leads/useLeadTimeline", () => ({
  useLeadTimeline: () => ({ itens: linha.itens, isLoading: false, isError: false }),
}));

import { AbaAtividades } from "@/components/escale/negocio/abas/AbaAtividades";
import { AbaHistorico } from "@/components/escale/negocio/abas/AbaHistorico";
import { activityLabel } from "@/lib/leads/activity-vocabulary";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G (C2): Atividades e Histórico mostram o que existe, com a cara da Clint (prints 01 e 07). */
const etapa = (id: string, position: number, name: string, extra: Partial<Stage> = {}): Stage => ({
  id,
  organization_id: "o",
  pipeline_id: "p",
  name,
  slug: id,
  position,
  color: null,
  is_won: false,
  is_lost: false,
  is_archived: false,
  expected_duration_hours: null,
  ...extra,
});
const LEAD = { id: "n1", stage_id: "e1", contact_id: "c1", title: "Ana" } as Lead;
const ETAPAS = [
  etapa("e2", 2, "2. Em atendimento"),
  etapa("g", 9, "Ganho", { is_won: true }),
  etapa("e1", 1, "1. Entrada Lead"),
  etapa("p", 10, "Perdido", { is_lost: true }),
];

beforeEach(() => {
  tarefas.lista = [
    {
      id: "t1",
      title: "Pré-qualificação",
      description: "Apenas oportunidades novas devem ficar nesta etapa.",
      due_date: new Date(2026, 9, 15, 16, 21).toISOString(),
      status: "done",
    },
    {
      id: "t2",
      title: "Ligação 1",
      description: "Roteiro da ligação",
      due_date: new Date(2026, 9, 14, 16, 21).toISOString(),
      status: "pending",
    },
  ];
  linha.itens = [];
});
afterEach(() => vi.useRealTimers());

describe("aba Atividades (C2, print 01)", () => {
  it("o trilho mostra só as etapas abertas, numeradas, e marca a atual", () => {
    render(<AbaAtividades lead={LEAD} stages={ETAPAS} />);
    const trilho = screen.getByRole("list", { name: "Etapas da origem" });
    const passos = within(trilho).getAllByRole("listitem");
    expect(passos.map((p) => p.textContent)).toEqual(["11. Entrada Lead", "22. Em atendimento"]);
    expect(passos[0]).toHaveAttribute("aria-current", "step");
    expect(passos[1]).not.toHaveAttribute("aria-current");
  });

  it("as tarefas do negócio por dia, com o chip de quantidade, e o detalhe da escolhida", async () => {
    render(<AbaAtividades lead={LEAD} stages={ETAPAS} />);
    expect(screen.getByRole("heading", { name: "Próximas atividades" })).toBeInTheDocument();
    expect(screen.getByText("Qui, 15 Out")).toBeInTheDocument();
    expect(screen.getByText("Qua, 14 Out")).toBeInTheDocument();
    expect(screen.getAllByText("1 atividade")).toHaveLength(2);
    expect(screen.getAllByText("16:21")).toHaveLength(2);
    expect(
      screen.getByText("Apenas oportunidades novas devem ficar nesta etapa."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Ligação 1/ }));
    expect(screen.getByText("Roteiro da ligação")).toBeInTheDocument();
  });

  it("concluir e criar ficam para a 1I: desligados, com 'Em breve'", () => {
    render(<AbaAtividades lead={LEAD} stages={ETAPAS} />);
    const caixas = screen.getAllByRole("checkbox", { name: "Concluída" });
    expect(caixas[0]).toHaveAttribute("aria-checked", "true");
    expect(caixas[0]).toHaveAttribute("aria-disabled", "true");
    expect(caixas[0]).toHaveAttribute("title", "Em breve");
    expect(screen.getByRole("button", { name: "Nova atividade" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nova atividade" })).toHaveAttribute(
      "title",
      "Em breve",
    );
  });

  it("negócio sem tarefa: o aviso, e o trilho continua", () => {
    tarefas.lista = [];
    render(<AbaAtividades lead={LEAD} stages={ETAPAS} />);
    expect(screen.getByText("Nenhuma atividade neste negócio.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Etapas da origem" })).toBeInTheDocument();
  });
});

describe("aba Histórico (C2, print 07)", () => {
  it("a linha do tempo do original em cartões, por semana, com 'há N dias por Nome'", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 17, 12));
    linha.itens = [
      {
        id: "h1",
        type: "stage_changed",
        reason: "Mudou para 2. Em atendimento",
        performed_at: new Date(2026, 9, 14, 10).toISOString(),
        actor_kind: "user",
        actor_user_name: "Camilly Victória",
      },
    ];
    render(<AbaHistorico lead={LEAD} />);
    expect(screen.getByText("Esta semana")).toBeInTheDocument();
    expect(screen.getByText("14 Out")).toBeInTheDocument();
    expect(screen.getByText(activityLabel("stage_changed"))).toBeInTheDocument();
    expect(screen.getByText("Mudou para 2. Em atendimento")).toBeInTheDocument();
    expect(screen.getByText("há 3 dias por Camilly Victória")).toBeInTheDocument();
  });

  it("busca e filtro de tipo são da 1H: desligados, com 'Em breve'", () => {
    render(<AbaHistorico lead={LEAD} />);
    expect(screen.getByPlaceholderText("Buscar no histórico")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Todos" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("title", "Em breve");
    expect(screen.getByText("Nenhum evento ainda.")).toBeInTheDocument();
  });
});
