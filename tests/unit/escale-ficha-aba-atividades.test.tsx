import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "o", name: "Escale IA", role: "manager" }),
  useUser: () => ({ id: "u-eu", full_name: "Régis Junior", email: "r@e.com" }),
  usePermission: () => true,
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u-ana", full_name: "Ana Atendente" }] }),
}));
vi.mock("@/hooks/contacts/useContact", () => ({ useContact: () => ({ data: undefined }) }));
const engrenagem = vi.hoisted(() => ({ aoConfigurar: vi.fn() }));
vi.mock("@/lib/escale/configuracoes/abrir", () => ({
  useEngrenagemDaOrigem: () => ({
    aoConfigurar: engrenagem.aoConfigurar,
    dicaDaEngrenagem: "Sem permissão",
  }),
}));
const ativ = vi.hoisted(() => ({
  dados: null as unknown,
  alternar: vi.fn(async () => "concluida"),
  editar: vi.fn(async () => undefined),
  excluir: vi.fn(async () => undefined),
  criar: vi.fn(async () => undefined),
}));
vi.mock("@/hooks/escale/useAtividadesDoNegocio", () => ({
  useAtividadesDoNegocio: () => ({
    dados: ativ.dados,
    carregando: false,
    falhou: false,
    recarregar: vi.fn(),
    alternar: ativ.alternar,
    editar: ativ.editar,
    excluir: ativ.excluir,
    criar: ativ.criar,
  }),
}));

import { AbaAtividades } from "@/components/escale/negocio/abas/AbaAtividades";
import type { Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { toast } from "sonner";

/** FORK ESCALE · Fase 1I (C19–C21): a aba Atividades da ficha (prints G01, 017 e 003). */
const ORIGEM = { id: "p1", settings: { fields: [] } } as unknown as Pipeline;
const etapa = (id: string, position: number, name: string, extra: Partial<Stage> = {}): Stage =>
  ({ id, name, position, is_won: false, is_lost: false, is_archived: false, ...extra }) as Stage;
const ETAPAS = [
  etapa("e1", 1, "1. Entrada Lead"),
  etapa("e2", 2, "2. Em atendimento"),
  etapa("e3", 3, "3. Docs"),
  etapa("g", 9, "Ganho", { is_won: true }),
];
const LEAD = {
  id: "n1",
  pipeline_id: "p1",
  stage_id: "e2",
  contact_id: "c1",
  title: "Ana Souza",
  value_cents: 150000,
  currency: "BRL",
  contact_phone: "+5543999990000",
  custom_fields: {},
  owner_user_id: null,
  owner_agent_id: null,
} as unknown as Lead;
const amanha = new Date(Date.now() + 86_400_000);
const ontem = new Date(Date.now() - 86_400_000);
const base = {
  organization_id: "o",
  description: null,
  priority: "medium",
  lead_id: "n1",
  contact_id: "c1",
  demanda_id: null,
  assigned_to: null,
  created_by: null,
  created_at: ontem.toISOString(),
  updated_at: ontem.toISOString(),
  visibilidade: "padrao",
  atividade_id: "m1",
  concluida_por: null,
  concluida_em: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  ativ.dados = {
    atividades: [
      {
        ...base,
        id: "w",
        title: "Entrada de Lead",
        tipo: "whatsapp",
        stage_id: "e2",
        status: "pending",
        due_date: amanha.toISOString(),
        description: "Olá [CONTACT.FIRST_NAME], tudo bem?",
      },
      {
        ...base,
        id: "l",
        title: "Ligação 1",
        tipo: "ligacao",
        stage_id: "e2",
        status: "pending",
        due_date: ontem.toISOString(),
        visibilidade: "nao_listada",
      },
      {
        ...base,
        id: "f",
        title: "Feita",
        tipo: "tarefa",
        stage_id: "e2",
        status: "done",
        due_date: ontem.toISOString(),
        concluida_por: "u-ana",
        concluida_em: ontem.toISOString(),
      },
      {
        ...base,
        id: "manual",
        title: "Avulsa",
        tipo: "tarefa",
        stage_id: "e2",
        status: "pending",
        due_date: amanha.toISOString(),
        atividade_id: null,
      },
      {
        ...base,
        id: "velha",
        title: "Da etapa 1",
        tipo: "tarefa",
        stage_id: "e1",
        status: "pending",
        due_date: amanha.toISOString(),
      },
    ],
    modelos: [
      {
        id: "m9",
        stage_id: "e3",
        titulo: "Coleta de docs",
        tipo: "tarefa",
        visibilidade: "padrao",
        prazo_minutos: 1440,
        ordem: 0,
        conteudo: null,
      },
    ],
  };
});

const abrir = () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(<AbaAtividades lead={LEAD} stages={ETAPAS} pipeline={ORIGEM} />);
  return user;
};

describe("aba Atividades", () => {
  it("o trilho: etapas abertas; a atual marcada; a anterior com ✓; a etapa atual é a vista", () => {
    abrir();
    const trilho = screen.getByRole("list", { name: "Etapas da origem" });
    const passos = within(trilho).getAllByRole("listitem");
    expect(passos).toHaveLength(3);
    expect(passos[1]).toHaveAttribute("aria-current", "step");
    expect(within(passos[0]!).queryByText("1")).toBeNull();
    expect(within(passos[1]!).getByRole("button", { name: /Em atendimento/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Próximas atividades" })).toBeInTheDocument();
  });

  it("a lista mostra só a etapa vista; a atrasada em vermelho; a feita riscada; a não listada com o olho", () => {
    abrir();
    const lista = screen.getByRole("region", { name: "Próximas atividades" });
    expect(within(lista).queryByText("Da etapa 1")).toBeNull();
    expect(
      within(lista).getByText("Ligação 1").closest("li")!.querySelector(".text-casca-alerta"),
    ).not.toBeNull();
    expect(within(lista).getByText("Feita")).toHaveClass("line-through");
    expect(within(lista).getByRole("img", { name: "Atividade não listada" })).toBeInTheDocument();
  });

  it("clicar na etapa anterior mostra as atividades dela; na futura, o playbook com a dica e sem caixa", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: /Entrada Lead/ }));
    expect(
      within(screen.getByRole("region", { name: "Atividades · 1. Entrada Lead" })).getByText(
        "Da etapa 1",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /3\. Docs/ }));
    expect(screen.getByRole("heading", { name: "Atividades · 3. Docs" })).toBeInTheDocument();
    expect(screen.getByText("1º dia")).toBeInTheDocument();
    expect(screen.getAllByText("Coleta de docs").length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("a coluna Dias filtra a lista e 'Todas' volta", async () => {
    const user = abrir();
    const dias = screen.getByRole("navigation", { name: "Dias" });
    const [, primeiroDia] = within(dias).getAllByRole("button");
    await user.click(primeiroDia!);
    expect(screen.queryByText("Entrada de Lead")).toBeNull();
    await user.click(within(dias).getByRole("button", { name: "Todas" }));
    expect(screen.getByText("Entrada de Lead")).toBeInTheDocument();
  });

  it("a caixa conclui com o toast da Clint", async () => {
    const user = abrir();
    await user.click(screen.getByRole("checkbox", { name: "Ligação 1" }));
    expect(ativ.alternar).toHaveBeenCalledWith(expect.objectContaining({ id: "l" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Tarefa concluída com sucesso"));
  });

  it("a caixa da feita diz quem concluiu", () => {
    abrir();
    expect(screen.getByRole("checkbox", { name: "Feita" }).getAttribute("title")).toMatch(
      /Ana Atendente/,
    );
  });

  it("o ⋮: 'Excluir atividade' só na criada à mão, com a confirmação da Clint", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: "Opções de Ligação 1" }));
    expect(screen.queryByRole("menuitem", { name: "Excluir atividade" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Marcar como concluída" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Opções de Avulsa" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir atividade" }));
    expect(screen.getByText("Tem certeza que deseja excluir esta atividade?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(ativ.excluir).toHaveBeenCalledWith("manual");
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Atividade removida com sucesso"),
    );
  });

  it("a engrenagem é 'Configurar etapa' e abre a origem", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: "Configurar etapa" }));
    expect(engrenagem.aoConfigurar).toHaveBeenCalled();
  });

  it("o detalhe do WhatsApp mostra o balão com a variável trocada; o lápis edita e salva ao sair", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: /^Entrada de Lead/ }));
    const detalhe = screen.getByRole("region", { name: "Detalhes da atividade" });
    expect(within(detalhe).getByText("Olá Ana, tudo bem?")).toBeInTheDocument();
    await user.click(within(detalhe).getByRole("button", { name: "Modo edição" }));
    const caixa = within(detalhe).getByRole("textbox", { name: "Conteúdo da atividade" });
    expect(caixa).toHaveValue("Olá [CONTACT.FIRST_NAME], tudo bem?");
    await user.type(caixa, "!");
    await user.click(within(detalhe).getByRole("button", { name: "Sair do modo edição" }));
    expect(ativ.editar).toHaveBeenCalledWith("w", {
      description: "Olá [CONTACT.FIRST_NAME], tudo bem?!",
    });
  });

  it("'Nova atividade' abre a janela da ficha na etapa vista", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: "Nova atividade" }));
    const janela = screen.getByRole("dialog", { name: "Nova atividade" });
    expect(within(janela).getByText("2. Em atendimento")).toBeInTheDocument();
  });

  it("sem atividade na etapa atual: o vazio da Clint", () => {
    ativ.dados = { atividades: [], modelos: [] };
    abrir();
    expect(screen.getByText("Sem atividades configuradas")).toBeInTheDocument();
    expect(
      screen.getByText("Crie a primeira atividade para acompanhar este negócio."),
    ).toBeInTheDocument();
  });
});
