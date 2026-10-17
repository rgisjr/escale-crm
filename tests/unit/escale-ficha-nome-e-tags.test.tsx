import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useActiveOrg: () => ({ orgId: "org1" }) }));
const contato = vi.hoisted(() => ({
  data: { data: { id: "c1", name: "Ana", tags: ["vip"], custom_fields: {} } },
}));
vi.mock("@/hooks/contacts/useContact", () => ({ useContact: () => contato }));
const gravar = vi.hoisted(() => ({ gravar: vi.fn(async () => undefined) }));
vi.mock("@/hooks/escale/useGravarContato", () => ({ useGravarContato: () => gravar }));
const editar = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({
  useEditLead: () => ({ mutateAsync: editar.mutateAsync }),
}));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["vip", "quente", "frio"] }),
}));

import { NomeDaFicha } from "@/components/escale/negocio/NomeDaFicha";
import { TagsDaFicha } from "@/components/escale/negocio/TagsDaFicha";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1H (C10): o lápis do nome e "+ Adicionar tags", como na Clint. */
const LEAD = {
  id: "n1",
  contact_id: "c1",
  title: "Ana | Nunes Regularize",
  contact_tags: ["vip"],
  filtros_escale: { contato_nome: "Ana | Nunes Regularize" },
} as unknown as Lead;

beforeEach(() => {
  gravar.gravar.mockClear();
  editar.mutateAsync.mockClear();
});

describe("o nome (N5)", () => {
  it("o lápis abre o input com o nome; Enter grava o nome do contato; Esc cancela", async () => {
    render(<NomeDaFicha lead={LEAD} pipelineId="o1" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Ana | Nunes Regularize" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    const input = screen.getByRole("textbox", { name: "Nome do contato" });
    expect(input).toHaveValue("Ana | Nunes Regularize");
    expect(input).toHaveAttribute("maxlength", "80");
    await userEvent.clear(input);
    await userEvent.type(input, "Ana Nunes{Enter}");
    expect(gravar.gravar).toHaveBeenCalledWith({ name: "Ana Nunes" });
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Nome do contato" }), "X{Escape}");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(gravar.gravar).toHaveBeenCalledTimes(1);
  });

  it("vazio ou igual só cancela; ✓ e ✕ têm os nomes da Clint", async () => {
    render(<NomeDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    expect(screen.getByRole("button", { name: "Salvar nome" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Salvar nome" }));
    expect(gravar.gravar).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Nome do contato" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(gravar.gravar).not.toHaveBeenCalled();
  });

  it("negócio sem contato grava o título do negócio", async () => {
    render(
      <NomeDaFicha
        lead={{ ...LEAD, contact_id: null, filtros_escale: {} } as unknown as Lead}
        pipelineId="o1"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Nome do contato" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Nome do contato" }),
      "Obra 12{Enter}",
    );
    expect(editar.mutateAsync).toHaveBeenCalledWith({ leadId: "n1", patch: { title: "Obra 12" } });
  });
});

describe("as tags (N6)", () => {
  it("mostra os chips do contato e o '+'; sem tags, '+ Adicionar tags'", () => {
    const { unmount } = render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    expect(screen.getByText("vip")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar tags" })).toBeInTheDocument();
    expect(screen.queryByText("+ Adicionar tags")).toBeNull();
    unmount();
    contato.data.data.tags = [];
    render(<TagsDaFicha lead={{ ...LEAD, contact_tags: [] } as unknown as Lead} pipelineId="o1" />);
    expect(screen.getByRole("button", { name: "+ Adicionar tags" })).toBeInTheDocument();
    contato.data.data.tags = ["vip"];
  });

  it("o painel lista as tags que faltam; escolher uma grava a lista inteira", async () => {
    render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tags" }));
    const painel = await screen.findByRole("listbox", { name: "Adicione uma tag" });
    expect(within(painel).queryByRole("option", { name: "vip" })).toBeNull();
    await userEvent.click(within(painel).getByRole("option", { name: "quente" }));
    expect(gravar.gravar).toHaveBeenCalledWith({ tags: ["vip", "quente"] });
  });

  it("texto sem correspondência oferece 'Criar «texto»', normalizado", async () => {
    render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tags" }));
    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Adicione uma tag" }),
      "  Morno ",
    );
    await userEvent.click(screen.getByRole("option", { name: "Criar «morno»" }));
    expect(gravar.gravar).toHaveBeenCalledWith({ tags: ["vip", "morno"] });
  });

  it("o × do chip pede confirmação e grava sem a tag", async () => {
    render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Remover a tag vip" }));
    expect(await screen.findByText("Deseja remover esta tag do contato?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(gravar.gravar).toHaveBeenCalledWith({ tags: [] });
  });

  it("negócio sem contato: o botão fica desligado", () => {
    // O `useContact("")` real fica desligado (sem dado); o mock devolve sempre o contato, então o esvaziamos.
    contato.data.data.tags = [];
    render(
      <TagsDaFicha
        lead={{ ...LEAD, contact_id: null, contact_tags: [] } as unknown as Lead}
        pipelineId="o1"
      />,
    );
    contato.data.data.tags = ["vip"];
    const botao = screen.getByRole("button", { name: "+ Adicionar tags" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("title", "Este negócio não tem contato.");
  });
});
