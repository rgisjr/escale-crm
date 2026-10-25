import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const permissao = vi.hoisted(() => ({ pode: true }));
const org = vi.hoisted(() => ({
  role: "agent" as string,
  visibility_mode: "own_and_unassigned" as string,
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  usePermission: () => permissao.pode,
  useActiveOrg: () => ({ orgId: "o1", role: org.role, visibility_mode: org.visibility_mode }),
}));
const quadro = vi.hoisted(() => ({ settings: {} as Record<string, unknown> }));
// Q2a (G2-24): status e dono leem `settings` pela prop; assinar o quadro (tempo real) aqui seria o defeito.
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => {
    throw new Error("StatusDaFicha/DonoDaFicha não podem assinar o quadro");
  },
}));
const captura = vi.hoisted(() => ({ onRetomada: (_r: unknown) => {} }));
const motivosDoFunil = vi.hoisted(() => ({ lista: ["Preço", "Sem retorno"] as string[] }));
const grava = vi.hoisted(() => ({
  ganhar: vi.fn(),
  perder: vi.fn(),
  editar: vi.fn(),
  mover: vi.fn(),
}));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({
  useWinLead: () => ({ mutate: grava.ganhar, isPending: false }),
  useLoseLead: () => ({ mutate: grava.perder, isPending: false }),
  useEditLead: () => ({ mutate: grava.editar, isPending: false }),
}));
vi.mock("@/hooks/kanban/useMoveCard", () => ({
  useMoveCard: (_funil: string, opcoes: { onRetomada: (r: unknown) => void }) => {
    captura.onRetomada = opcoes.onRetomada;
    return { mutate: grava.mover, isPending: false };
  },
}));
vi.mock("@/hooks/kanban/useMotivosDePerdaDoFunil", () => ({
  useMotivosDePerdaDoFunil: () => motivosDoFunil.lista,
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({
    data: [
      { user_id: "u1", full_name: "Camilly Victória" },
      { user_id: "u2", full_name: "Henrique" },
    ],
  }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({
  useAssignableAgents: () => ({ data: [{ agent_id: "a1", name: "Kaio IA", version_number: 3 }] }),
}));
vi.mock("@/components/kanban/RetomarComoNovoNegocioDialog", () => ({
  RetomarComoNovoNegocioDialog: (p: { leadId: string; stageId: string }) => (
    <div data-testid="retomada">{`${p.leadId}|${p.stageId}`}</div>
  ),
}));

import { DonoDaFicha } from "@/components/escale/negocio/DonoDaFicha";
import { StatusDaFicha } from "@/components/escale/negocio/StatusDaFicha";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G (C4, C5; prints 08 e 10): status e dono no cabeçalho, sobre o motor do original. */
const ETAPAS = [
  { id: "e1", position: 1, is_won: false, is_lost: false, is_archived: false },
  { id: "e2", position: 2, is_won: false, is_lost: false, is_archived: false },
  { id: "g", position: 9, is_won: true, is_lost: false, is_archived: false },
  { id: "p", position: 10, is_won: false, is_lost: true, is_archived: false },
] as Stage[];
const ABERTO = {
  id: "n1",
  status: "open",
  lost_reason: null,
  updated_at: "2026-10-14T10:00:00Z",
  owner_user_id: "u1",
  owner_agent_id: null,
  owner_kind: "user",
} as unknown as Lead;

beforeEach(() => {
  for (const f of Object.values(grava)) f.mockReset();
  permissao.pode = true;
  // Gerente por padrão: os testes antigos trocam o dono; os da 1J escolhem o papel e a regra.
  org.role = "manager";
  org.visibility_mode = "own_and_unassigned";
  quadro.settings = {};
  motivosDoFunil.lista = ["Preço", "Sem retorno"];
});

describe("status (C4)", () => {
  it("o menu da Clint: Aberto (atual), Ganho e Perdido; Ganho grava o ganho", async () => {
    render(
      <StatusDaFicha lead={ABERTO} stages={ETAPAS} pipelineId="o1" settings={quadro.settings} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Status do negócio/ }));
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Aberto",
      "Ganho",
      "Perdido",
    ]);
    await userEvent.click(screen.getByRole("menuitem", { name: "Ganho" }));
    expect(grava.ganhar).toHaveBeenCalledWith({ leadId: "n1" });
  });

  it("com 'só o administrador marca ganho' (1K, N21), quem não é admin não vê 'Ganho'; o admin vê", async () => {
    quadro.settings = { escale_so_admin_ganha: true };
    org.role = "agent";
    const { unmount } = render(
      <StatusDaFicha lead={ABERTO} stages={ETAPAS} pipelineId="o1" settings={quadro.settings} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Status do negócio/ }));
    expect(screen.queryByRole("menuitem", { name: "Ganho" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Perdido" })).toBeInTheDocument();
    unmount();
    org.role = "admin";
    render(
      <StatusDaFicha lead={ABERTO} stages={ETAPAS} pipelineId="o1" settings={quadro.settings} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Status do negócio/ }));
    expect(screen.getByRole("menuitem", { name: "Ganho" })).toBeInTheDocument();
  });

  it("Perdido pede o motivo ao lado e só grava ao escolher", async () => {
    render(
      <StatusDaFicha lead={ABERTO} stages={ETAPAS} pipelineId="o1" settings={quadro.settings} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Status do negócio/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Perdido" }));
    expect(grava.perder).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("combobox", { name: "Selecione o motivo da perda" }));
    await userEvent.click(screen.getByRole("option", { name: "Preço" }));
    expect(grava.perder).toHaveBeenCalledWith(
      { leadId: "n1", lostReason: "Preço" },
      expect.anything(),
    );
  });

  it("perdido: mostra 'Perdido' e o motivo (desligado, Q4); Aberto reabre na primeira etapa aberta", async () => {
    const perdido = { ...ABERTO, status: "lost", lost_reason: "Preço" } as Lead;
    render(
      <StatusDaFicha lead={perdido} stages={ETAPAS} pipelineId="o1" settings={quadro.settings} />,
    );
    expect(screen.getByRole("button", { name: /^Status do negócio/ })).toHaveTextContent("Perdido");
    expect(screen.getByRole("combobox", { name: "Selecione o motivo da perda" })).toHaveTextContent(
      "Preço",
    );
    await userEvent.click(screen.getByRole("button", { name: /^Status do negócio/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Aberto" }));
    expect(grava.mover).toHaveBeenCalledWith({
      leadId: "n1",
      stageId: "e1",
      positionInStage: 0,
      expectedUpdatedAt: "2026-10-14T10:00:00Z",
    });
  });

  it("ganho reabre na última etapa aberta (Q3)", async () => {
    render(
      <StatusDaFicha
        lead={{ ...ABERTO, status: "won" } as Lead}
        stages={ETAPAS}
        pipelineId="o1"
        settings={quadro.settings}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Status do negócio/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Aberto" }));
    expect(grava.mover).toHaveBeenCalledWith(expect.objectContaining({ stageId: "e2" }));
  });

  it("origem sem motivos cadastrados: oferece os canônicos e grava o escolhido", async () => {
    motivosDoFunil.lista = [];
    render(
      <StatusDaFicha lead={ABERTO} stages={ETAPAS} pipelineId="o1" settings={quadro.settings} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Status do negócio/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Perdido" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Selecione o motivo da perda" }));
    expect(screen.getByRole("option", { name: "Preço" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Levado para outro funil" })).toBeNull();
    await userEvent.click(screen.getByRole("option", { name: "Sem resposta do cliente" }));
    expect(grava.perder).toHaveBeenCalledWith(
      { leadId: "n1", lostReason: "no_response" },
      expect.anything(),
    );
  });

  it("perdido com motivo canônico: mostra o rótulo, desligado e com a dica de reabrir", () => {
    motivosDoFunil.lista = [];
    const perdido = { ...ABERTO, status: "lost", lost_reason: "moved_to_another_pipeline" } as Lead;
    render(
      <StatusDaFicha lead={perdido} stages={ETAPAS} pipelineId="o1" settings={quadro.settings} />,
    );
    const seletor = screen.getByRole("combobox", { name: "Selecione o motivo da perda" });
    expect(seletor).toHaveTextContent("Levado para outro funil");
    expect(seletor).toBeDisabled();
    expect(seletor).toHaveAttribute("title", "Para trocar o motivo, reabra o negócio.");
  });

  it("escolher o status atual não grava nada", async () => {
    render(
      <StatusDaFicha lead={ABERTO} stages={ETAPAS} pipelineId="o1" settings={quadro.settings} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Status do negócio/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Aberto" }));
    expect(grava.ganhar).not.toHaveBeenCalled();
    expect(grava.perder).not.toHaveBeenCalled();
    expect(grava.mover).not.toHaveBeenCalled();
  });

  it("a recusa de retomada do motor abre a janela 'Retomar como novo negócio'", () => {
    render(
      <StatusDaFicha lead={ABERTO} stages={ETAPAS} pipelineId="o1" settings={quadro.settings} />,
    );
    expect(screen.queryByTestId("retomada")).toBeNull();
    act(() => captura.onRetomada({ leadId: "n1", stageId: "e2" }));
    expect(screen.getByTestId("retomada")).toHaveTextContent("n1|e2");
  });

  it("sem permissão: desligado, com o texto da Clint", () => {
    permissao.pode = false;
    render(
      <StatusDaFicha lead={ABERTO} stages={ETAPAS} pipelineId="o1" settings={quadro.settings} />,
    );
    const gatilho = screen.getByRole("button", { name: /^Status do negócio/ });
    expect(gatilho).toBeDisabled();
    expect(gatilho).toHaveAttribute(
      "title",
      "As permissões de usuários não permitem você trocar de status.",
    );
  });
});

describe("dono (C5, print 10)", () => {
  it("sob 'só os seus' da origem, quem não é gerente não troca o dono: desligado com o texto da Clint (1J)", () => {
    quadro.settings = { escale_visualizacao: "own" };
    org.role = "agent";
    render(<DonoDaFicha lead={ABERTO} pipelineId="o1" settings={quadro.settings} />);
    const botao = screen.getByRole("button", { name: "Alterar usuário" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute(
      "title",
      "As permissões de usuários não permitem você trocar de dono",
    );
  });

  it("gerente troca sob qualquer regra; agente troca sob 'todos' (1J)", () => {
    quadro.settings = { escale_visualizacao: "own" };
    org.role = "manager";
    const { unmount } = render(
      <DonoDaFicha lead={ABERTO} pipelineId="o1" settings={quadro.settings} />,
    );
    expect(screen.getByRole("button", { name: "Alterar usuário" })).toBeEnabled();
    unmount();
    org.role = "agent";
    quadro.settings = { escale_visualizacao: "all" };
    render(<DonoDaFicha lead={ABERTO} pipelineId="o1" settings={quadro.settings} />);
    expect(screen.getByRole("button", { name: "Alterar usuário" })).toBeEnabled();
  });

  it("sem regra na origem vale a da organização (1J)", () => {
    org.visibility_mode = "own";
    org.role = "agent";
    render(<DonoDaFicha lead={ABERTO} pipelineId="o1" settings={quadro.settings} />);
    expect(screen.getByRole("button", { name: "Alterar usuário" })).toBeDisabled();
  });

  const abrir = async (lead: Lead = ABERTO) => {
    render(<DonoDaFicha lead={lead} pipelineId="o1" settings={quadro.settings} />);
    await userEvent.click(screen.getByRole("button", { name: "Alterar usuário" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Selecione um usuário" }));
  };

  it("'Alterar usuário' com pessoas e agentes; trocar de pessoa grava o dono", async () => {
    await abrir();
    expect(screen.getByText("Alterar usuário", { selector: "h5" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: "Henrique" }));
    expect(grava.editar).toHaveBeenCalledWith({ leadId: "n1", patch: { owner_user_id: "u2" } });
  });

  it("os grupos 'Pessoas' e 'Agentes de IA'", async () => {
    await abrir();
    expect(screen.getByText("Pessoas")).toBeInTheDocument();
    expect(screen.getByText("Agentes de IA")).toBeInTheDocument();
  });

  it("agente de IA e 'Sem responsável' (Q5)", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("option", { name: "Kaio IA" }));
    expect(grava.editar).toHaveBeenCalledWith({ leadId: "n1", patch: { owner_agent_id: "a1" } });
  });

  it('"Sem responsável" limpa o dono atual (Q5)', async () => {
    await abrir();
    await userEvent.click(screen.getByRole("option", { name: "Sem responsável" }));
    expect(grava.editar).toHaveBeenCalledWith({ leadId: "n1", patch: { owner_user_id: null } });
  });

  it("sem permissão: o círculo desligado com o texto da Clint", () => {
    permissao.pode = false;
    render(<DonoDaFicha lead={ABERTO} pipelineId="o1" settings={quadro.settings} />);
    const gatilho = screen.getByRole("button", { name: "Alterar usuário" });
    expect(gatilho).toBeDisabled();
    expect(gatilho).toHaveAttribute(
      "title",
      "As permissões de usuários não permitem você trocar de dono",
    );
  });
});
