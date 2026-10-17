import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ push: vi.fn(), busca: "st=open" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.busca),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const permissao = vi.hoisted(() => ({ pode: true }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => permissao.pode }));
const lote = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/hooks/kanban/useBulkAction", () => ({
  useBulkAction: () => ({ mutate: lote.mutate, isPending: false }),
}));
vi.mock("@/components/kanban/NewLeadDialog", () => ({
  NewLeadDialog: ({ open, contactId }: { open: boolean; contactId?: string | null }) =>
    open ? <p>novo negócio para {contactId}</p> : null,
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
  lote.mutate.mockReset();
  permissao.pode = true;
});

describe("ações rápidas (C3)", () => {
  it("ligar, conversa e e-mail funcionam quando há dado; sem e-mail, o ícone apagado", () => {
    render(<AcoesDaFicha lead={LEAD} />);
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

  it("agendar, nota, lembretes e tags: no lugar, desligados com 'Em breve'", () => {
    render(<AcoesDaFicha lead={LEAD} />);
    for (const nome of ["Agendar", "Nova nota", "Lembretes", "Adicionar tags"]) {
      const b = screen.getByRole("button", { name: nome });
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", "Em breve");
    }
  });
});

describe("o ⋮ do cabeçalho (C6, print 09)", () => {
  const abrir = async () => {
    render(<MenuDaFicha lead={LEAD} pipelineId="o1" stages={[]} leads={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Ações do negócio" }));
  };

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
    expect(screen.getByRole("menuitem", { name: "Nova nota" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("Novo negócio abre o do original já com o contato; Mudar origem, a janela de levar", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("menuitem", { name: "Novo negócio" }));
    expect(screen.getByText("novo negócio para c1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ações do negócio" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Mudar origem" }));
    expect(screen.getByText("levar para outra origem")).toBeInTheDocument();
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

  it("sem permissão de escrita: só Visualizar contato e Nova nota", async () => {
    permissao.pode = false;
    await abrir();
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Visualizar contato",
      "Nova nota",
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
