import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ModuloDoGravar from "@/hooks/escale/useGravarContato";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// FORK ESCALE · Fase 1H (C15): as ações da ficha montam o modal da nota (hooks das notas).
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({
  useCriarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEditarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org1" }),
  usePermission: () => true,
}));
const contato = vi.hoisted(() => ({
  data: { data: { id: "c1", name: "Ana", tags: ["vip"], custom_fields: {} } },
}));
vi.mock("@/hooks/contacts/useContact", () => ({ useContact: () => contato }));
// O `gravar` de verdade monta o patch sobre o contato MAIS RECENTE do cache (`base`).
const gravar = vi.hoisted(() => {
  const enviado = vi.fn();
  const base = { atual: null as Record<string, unknown> | null };
  return {
    enviado,
    base,
    gravar: vi.fn(async (entrada: unknown) => {
      const patch =
        typeof entrada === "function"
          ? (entrada as (c: unknown) => unknown)(base.atual ?? contato.data.data)
          : entrada;
      if (patch) enviado(patch);
      return Boolean(patch);
    }),
  };
});
vi.mock("@/hooks/escale/useGravarContato", async (original) => ({
  ...(await original<typeof ModuloDoGravar>()),
  useGravarContato: () => gravar,
}));
const editar = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({
  useEditLead: () => ({ mutateAsync: editar.mutateAsync }),
}));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["vip", "quente", "frio"] }),
}));

import { toast } from "sonner";

import { AcoesDaFicha } from "@/components/escale/negocio/AcoesDaFicha";
import { CabecalhoDaFicha } from "@/components/escale/negocio/CabecalhoDaFicha";
import { NomeDaFicha } from "@/components/escale/negocio/NomeDaFicha";
import { ContatoNaoCarregado } from "@/hooks/escale/useGravarContato";
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
  gravar.enviado.mockClear();
  gravar.base.atual = null;
  editar.mutateAsync.mockClear();
  vi.mocked(toast.error).mockClear();
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
    expect(gravar.enviado).toHaveBeenCalledWith({ name: "Ana Nunes" });
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Nome do contato" }), "X{Escape}");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(gravar.enviado).toHaveBeenCalledTimes(1);
  });

  it("vazio ou igual só cancela; ✓ e ✕ têm os nomes da Clint", async () => {
    render(<NomeDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    expect(screen.getByRole("button", { name: "Salvar nome" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Salvar nome" }));
    expect(gravar.enviado).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Nome do contato" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(gravar.enviado).not.toHaveBeenCalled();
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
    expect(gravar.enviado).toHaveBeenCalledWith({ tags: ["vip", "quente"] });
  });

  it("texto sem correspondência oferece 'Criar «texto»', normalizado", async () => {
    render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tags" }));
    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Adicione uma tag" }),
      "  Morno ",
    );
    await userEvent.click(screen.getByRole("option", { name: "Criar morno" }));
    expect(gravar.enviado).toHaveBeenCalledWith({ tags: ["vip", "morno"] });
  });

  it("o × do chip pede confirmação e grava sem a tag", async () => {
    render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Remover a tag vip" }));
    expect(await screen.findByText("Deseja remover esta tag do contato?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(gravar.enviado).toHaveBeenCalledWith({ tags: [] });
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

describe("revisão final do PR A", () => {
  const OUTRO = {
    ...LEAD,
    id: "n2",
    contact_id: "c2",
    title: "Bruno",
    contact_tags: ["vip"],
    filtros_escale: { contato_nome: "Bruno" },
  } as unknown as Lead;

  // I6: o estado do nome e das tags é do negócio aberto, não sobrevive à troca.
  it("trocar de negócio fecha a edição do nome e o pedido de remover tag", async () => {
    const { rerender } = render(<CabecalhoDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Nome do contato" }), "X");
    rerender(<CabecalhoDaFicha lead={OUTRO} pipelineId="o1" />);
    expect(screen.queryByRole("textbox", { name: "Nome do contato" })).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Bruno" })).toBeInTheDocument();

    const acoes = render(<AcoesDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Remover a tag vip" }));
    expect(await screen.findByText("Deseja remover esta tag do contato?")).toBeInTheDocument();
    acoes.rerender(<AcoesDaFicha lead={OUTRO} pipelineId="o1" />);
    expect(screen.queryByText("Deseja remover esta tag do contato?")).toBeNull();
  });

  it("o erro da API ao salvar o nome vira um toast só (o do hook)", async () => {
    gravar.gravar.mockRejectedValueOnce(new Error("500"));
    render(<NomeDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Nome do contato" }), "X{Enter}");
    expect(gravar.gravar).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    // A edição continua aberta para tentar de novo.
    expect(screen.getByRole("textbox", { name: "Nome do contato" })).toBeInTheDocument();
  });

  it("negócio sem contato: título de 1 caractere não é enviado (o schema pede 2)", async () => {
    render(
      <NomeDaFicha
        lead={{ ...LEAD, contact_id: null, filtros_escale: {} } as unknown as Lead}
        pipelineId="o1"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    const input = screen.getByRole("textbox", { name: "Nome do contato" });
    await userEvent.clear(input);
    await userEvent.type(input, "A{Enter}");
    expect(editar.mutateAsync).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("O título precisa ter pelo menos 2 caracteres.");
  });

  it("as tags são montadas sobre o contato mais recente, não sobre as do render", async () => {
    gravar.base.atual = { id: "c1", tags: ["vip", "quente"] };
    render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tags" }));
    const painel = await screen.findByRole("listbox", { name: "Adicione uma tag" });
    await userEvent.click(within(painel).getByRole("option", { name: "frio" }));
    expect(gravar.enviado).toHaveBeenCalledWith({ tags: ["vip", "quente", "frio"] });
  });

  it("erro ao gravar a tag: sem toast duplicado; contato não carregado avisa", async () => {
    gravar.gravar.mockRejectedValueOnce(new Error("500"));
    render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tags" }));
    await userEvent.click(
      within(await screen.findByRole("listbox", { name: "Adicione uma tag" })).getByRole("option", {
        name: "quente",
      }),
    );
    expect(toast.error).not.toHaveBeenCalled();
    gravar.gravar.mockRejectedValueOnce(new ContatoNaoCarregado());
    await userEvent.click(screen.getByRole("button", { name: "Remover a tag vip" }));
    await userEvent.click(await screen.findByRole("button", { name: "Remover" }));
    expect(toast.error).toHaveBeenCalledWith("Não consegui carregar o contato.");
  });

  it("enquanto o contato não carrega, as tags não se editam", () => {
    const salvo = contato.data;
    (contato as { data: unknown }).data = undefined;
    render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    contato.data = salvo;
    const botao = screen.getByRole("button", { name: "Adicionar tags" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("title", "Carregando…");
    expect(screen.getByRole("button", { name: "Remover a tag vip" })).toBeDisabled();
  });
});
