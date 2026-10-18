import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), busca: "st=open" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), refresh: nav.refresh }),
  useSearchParams: () => new URLSearchParams(nav.busca),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const permissao = vi.hoisted(() => ({ pode: true }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  usePermission: () => permissao.pode,
  useActiveOrg: () => ({ orgId: "org1" }),
}));
// FORK ESCALE · Fase 1H (C10): as tags do cabeçalho leem e gravam o contato.
vi.mock("@/hooks/contacts/useContact", () => ({
  useContact: () => ({ data: { data: { id: "c1", name: "Ana", tags: [], custom_fields: {} } } }),
}));
vi.mock("@/hooks/escale/useGravarContato", () => ({
  useGravarContato: () => ({ gravar: vi.fn(async () => undefined) }),
}));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: [] }),
}));
// FORK ESCALE · Fase 1H (C15): a nota abre o modal, que grava pelos hooks das notas.
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({
  useCriarNota: () => ({ mutateAsync: vi.fn(async () => ({})), isPending: false }),
  useEditarNota: () => ({ mutateAsync: vi.fn(async () => ({})), isPending: false }),
}));
const lote = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/hooks/kanban/useBulkAction", () => ({
  useBulkAction: () => ({ mutate: lote.mutate, isPending: false }),
}));
vi.mock("@/components/kanban/NewLeadDialog", () => ({
  NewLeadDialog: ({
    open,
    contactId,
    leads,
    onCreated,
  }: {
    open: boolean;
    contactId?: string | null;
    leads: unknown[];
    onCreated?: () => void;
  }) =>
    open ? (
      <div>
        <p>novo negócio para {contactId}</p>
        <p>funil com {leads.length} negócios</p>
        <button onClick={onCreated}>simular criado</button>
      </div>
    ) : null,
}));
vi.mock("@/components/kanban/MoveToOtherPipelineDialog", () => ({
  MoveToOtherPipelineDialog: ({ open }: { open: boolean }) =>
    open ? <p>levar para outra origem</p> : null,
}));

import { AcoesDaFicha } from "@/components/escale/negocio/AcoesDaFicha";
import { ContadorDeNegocios } from "@/components/escale/negocio/ContadorDeNegocios";
import { MenuDaFicha } from "@/components/escale/negocio/MenuDaFicha";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G (C3, C6, C7; prints 01, 09 e 017). */
const LEAD = {
  id: "n1",
  contact_id: "c1",
  title: "Ana",
  contact_phone: "+5543998031566",
  contact_email: "",
  conversa: { id: "cv1", preview: null, last_message_at: null, unread: 0 },
} as unknown as Lead;

beforeEach(() => {
  nav.push.mockReset();
  nav.refresh.mockReset();
  lote.mutate.mockReset();
  permissao.pode = true;
});

describe("ações rápidas (C3)", () => {
  it("ligar, conversa e e-mail funcionam quando há dado; sem e-mail, o ícone apagado", () => {
    render(<AcoesDaFicha lead={LEAD} pipelineId="o1" />);
    expect(screen.getByRole("link", { name: "Ligar" })).toHaveAttribute(
      "href",
      "tel:+5543998031566",
    );
    expect(screen.getByRole("link", { name: "Enviar Whatsapp" })).toHaveAttribute(
      "href",
      "/app/inbox?id=cv1",
    );
    expect(screen.getByRole("img", { name: "Sem e-mail" })).toBeInTheDocument();
  });

  it("agendar e lembretes: no lugar, desligados com 'Em breve'", () => {
    render(<AcoesDaFicha lead={LEAD} pipelineId="o1" />);
    for (const nome of ["Agendar", "Lembretes"]) {
      const b = screen.getByRole("button", { name: nome });
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", "Em breve");
    }
  });

  it("o ícone de nota está ligado e abre o modal 'Nova nota' (1H, C15)", async () => {
    render(<AcoesDaFicha lead={LEAD} pipelineId="o1" />);
    const botao = screen.getByRole("button", { name: "Nova nota" });
    expect(botao).toBeEnabled();
    await userEvent.click(botao);
    expect(screen.getByRole("dialog", { name: "Nova nota" })).toBeInTheDocument();
  });

  it("sem permissão de escrita, o ícone de nota fica desligado com 'Sem permissão' (1H-C)", () => {
    permissao.pode = false;
    render(<AcoesDaFicha lead={LEAD} pipelineId="o1" />);
    const botao = screen.getByRole("button", { name: "Nova nota" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("title", "Sem permissão");
  });

  it("'+ Adicionar tags' está ligado (1H, C10)", () => {
    render(<AcoesDaFicha lead={LEAD} pipelineId="o1" />);
    expect(screen.getByRole("button", { name: /Adicionar tags/ })).toBeEnabled();
  });
});

describe("o ⋮ do cabeçalho (C6, print 09)", () => {
  const abrir = async () => {
    render(<MenuDaFicha lead={LEAD} pipelineId="o1" stages={[]} leads={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Ações do negócio" }));
  };

  it("negócio ganho ganha 'Ver atribuição de ganho' depois de 'Visualizar contato' (1K, D14)", async () => {
    render(<MenuDaFicha lead={{ ...LEAD, status: "won" }} pipelineId="o1" stages={[]} leads={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Ações do negócio" }));
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent).slice(0, 2)).toEqual([
      "Visualizar contato",
      "Ver atribuição de ganho",
    ]);
  });

  it("os cinco itens da Clint, na ordem", async () => {
    await abrir();
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Visualizar contato",
      "Novo negócio",
      "Mudar origem",
      "Nova nota",
      "Excluir",
    ]);
    expect(screen.getByRole("menuitem", { name: "Visualizar contato" })).toHaveAttribute(
      "href",
      "/app/contacts/c1",
    );
    expect(screen.getByRole("menuitem", { name: "Nova nota" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("Nova nota abre o modal da nota (1H, C15)", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("menuitem", { name: "Nova nota" }));
    expect(screen.getByRole("dialog", { name: "Nova nota" })).toBeInTheDocument();
  });

  it("Novo negócio abre o do original já com o contato; Mudar origem, a janela de levar", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("menuitem", { name: "Novo negócio" }));
    expect(screen.getByText("novo negócio para c1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ações do negócio" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Mudar origem" }));
    expect(screen.getByText("levar para outra origem")).toBeInTheDocument();
  });

  it("Novo negócio recebe o funil inteiro e, ao criar, refaz a página (contador do servidor)", async () => {
    render(<MenuDaFicha lead={LEAD} pipelineId="o1" stages={[]} leads={[LEAD, LEAD]} />);
    await userEvent.click(screen.getByRole("button", { name: "Ações do negócio" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Novo negócio" }));
    expect(screen.getByText("funil com 2 negócios")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "simular criado" }));
    expect(nav.refresh).toHaveBeenCalledTimes(1);
  });

  it("itens desligados ficam apagados e sem hover de ativo", async () => {
    const semContato = { ...LEAD, contact_id: null } as unknown as Lead;
    render(<MenuDaFicha lead={semContato} pipelineId="o1" stages={[]} leads={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Ações do negócio" }));
    const contato = screen.getByRole("menuitem", { name: "Visualizar contato" });
    expect(contato).toHaveAttribute("aria-disabled", "true");
    expect(contato.className).toContain("data-[disabled]:text-casca-meta");
    expect(contato.className).toContain("data-[disabled]:hover:bg-transparent");
  });

  it("Excluir pede confirmação com o texto da Clint e volta ao quadro com os filtros", async () => {
    lote.mutate.mockImplementation((_corpo: unknown, opcoes: { onSuccess: () => void }) =>
      opcoes.onSuccess(),
    );
    await abrir();
    await userEvent.click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(screen.getByText("Tem certeza que deseja excluir este negócio?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(lote.mutate).toHaveBeenCalledWith(
      { action: "delete", lead_ids: ["n1"], params: {} },
      expect.anything(),
    );
    expect(nav.push).toHaveBeenCalledWith("/app/pipelines/o1?st=open");
  });

  it("sem permissão de escrita: só Visualizar contato (1H-C: a nota também é escrita)", async () => {
    permissao.pode = false;
    await abrir();
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Visualizar contato",
    ]);
  });
});

describe("contador 'N Negócios' (C7)", () => {
  it("só com mais de um, e leva ao contato", () => {
    const { rerender } = render(<ContadorDeNegocios total={1} contatoId="c1" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    rerender(<ContadorDeNegocios total={3} contatoId="c1" />);
    expect(screen.getByRole("link", { name: "3 Negócios" })).toHaveAttribute(
      "href",
      "/app/contacts/c1",
    );
  });
});
