import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const editar = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({
  useEditLead: () => ({ mutateAsync: editar.mutateAsync, isPending: false }),
}));
const permissao = vi.hoisted(() => ({ pode: true }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => permissao.pode }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const contato = vi.hoisted(() => ({
  data: {
    data: {
      id: "c1",
      name: "Ana",
      email: "ana@b.co",
      phone_number: "+5543998031566",
      tags: ["vip"],
      custom_fields: { cargo: "CEO", link_instagram: "https://instagram.com/ana" },
    },
  },
  isLoading: false,
}));
vi.mock("@/hooks/contacts/useContact", () => ({ useContact: () => contato }));
// O `gravar` de verdade monta o patch sobre o contato do cache; o mock monta sobre o do `useContact`.
const gravar = vi.hoisted(() => {
  const enviado = vi.fn();
  return {
    enviado,
    gravar: vi.fn(async (entrada: unknown) => {
      const patch =
        typeof entrada === "function"
          ? (entrada as (c: unknown) => unknown)(contato.data.data)
          : entrada;
      if (patch) enviado(patch);
      return Boolean(patch);
    }),
  };
});
vi.mock("@/hooks/escale/useGravarContato", () => ({ useGravarContato: () => gravar }));

import { AbaArquivos } from "@/components/escale/negocio/abas/AbaArquivos";
import { AbaConversas } from "@/components/escale/negocio/abas/AbaConversas";
import { AbaContato, AbaEmpresa, AbaNegocio } from "@/components/escale/negocio/abas/AbasDeCampos";
import type { Pipeline } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G (C2): as abas de campos, Conversas e Arquivos com a cara da Clint (prints 02 a 06). */
const LEAD = {
  id: "n1",
  contact_id: "c1",
  title: "Ana",
  value_cents: 150000,
  currency: "BRL",
  custom_fields: { origem_organico: "google" },
  contact_phone: "+55 43 99803 1566",
  conversa: { id: "cv1", preview: "Olá, me chamo Camilly", last_message_at: null, unread: 0 },
} as unknown as Lead;
const PIPELINE = {
  id: "o1",
  settings: {
    fields: [
      {
        key: "origem_organico",
        label: "origem_organico",
        type: "select",
        options: [{ value: "google", label: "Google" }],
      },
      { key: "notas", label: "Notas", type: "text" },
    ],
  },
} as unknown as Pipeline;

describe("aba Negócio (print 04, C14)", () => {
  beforeEach(() => {
    editar.mutateAsync.mockClear();
    permissao.pode = true;
    window.localStorage.clear();
  });

  it("Valor e os campos do CRM num grupo só, cada um num input; a lista com ▾", () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    expect(screen.getByRole("heading", { name: "Campos de negócio" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Grupos de campos" })).getByText(
        "Informações Gerais",
      ),
    ).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("textbox", { name: "Valor" })).toHaveValue("1.500,00");
    expect(screen.getByRole("combobox", { name: "origem_organico" })).toHaveTextContent("Google");
    expect(screen.getByRole("textbox", { name: "Notas" })).toHaveAttribute(
      "placeholder",
      "Clique aqui para adicionar",
    );
  });

  it("editar o Valor grava value_cents; editar um campo grava só aquela chave", async () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    const valor = screen.getByRole("textbox", { name: "Valor" });
    await userEvent.clear(valor);
    await userEvent.type(valor, "2.000,50{Enter}");
    expect(editar.mutateAsync).toHaveBeenCalledWith({
      leadId: "n1",
      patch: { value_cents: 200050 },
    });
    await userEvent.type(screen.getByRole("textbox", { name: "Notas" }), "Ligar amanhã{Enter}");
    expect(editar.mutateAsync).toHaveBeenLastCalledWith({
      leadId: "n1",
      patch: { custom_fields: { notas: "Ligar amanhã" } },
    });
  });

  // Revisão final: o schema do negócio recusa valor negativo (422) — a tela explica antes.
  it("Valor negativo não é enviado e mostra o motivo", async () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    const valor = screen.getByRole("textbox", { name: "Valor" });
    await userEvent.clear(valor);
    await userEvent.type(valor, "-5{Enter}");
    expect(editar.mutateAsync).not.toHaveBeenCalled();
    expect(await screen.findByText("O valor não pode ser negativo.")).toBeInTheDocument();
  });

  // Revisão final (I5): um campo do CRM chamado `valor` não vira o Valor do negócio.
  it("campo do CRM com chave valor grava em custom_fields", async () => {
    const comValor = {
      ...PIPELINE,
      settings: { fields: [{ key: "valor", label: "Valor do contrato", type: "text" }] },
    } as unknown as Pipeline;
    render(<AbaNegocio lead={LEAD} pipeline={comValor} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Valor do contrato" }), "X{Enter}");
    expect(editar.mutateAsync).toHaveBeenCalledWith({
      leadId: "n1",
      patch: { custom_fields: { valor: "X" } },
    });
  });

  it("Ocultar vazios esconde os sem valor, lembra no localStorage e mostra o aviso da Clint", async () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    await userEvent.click(screen.getByRole("button", { name: "Ocultar vazios" }));
    expect(screen.queryByRole("textbox", { name: "Notas" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Valor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mostrar vazios" })).toBeInTheDocument();
    expect(screen.getByText("Porque não vejo alguns campos?")).toHaveAttribute(
      "title",
      'Os campos vazios estão sendo ocultados. Você pode clicar no canto superior direito dessa aba para "Mostrar campos vazios".',
    );
    expect(window.localStorage.getItem("escale_campos_vazios_negocio")).toBe("1");
  });

  it("Pesquisar campos filtra pelo rótulo; sem resultado, 'Nenhum campo encontrado'", async () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Pesquisar campos..." }), "nota");
    expect(screen.getByRole("textbox", { name: "Notas" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Valor" })).toBeNull();
    await userEvent.type(screen.getByRole("searchbox", { name: "Pesquisar campos..." }), "xyz");
    expect(screen.getByText("Nenhum campo encontrado")).toBeInTheDocument();
  });

  it("Gerenciar campos leva à tela de campos para quem administra; para os outros fica desligado", () => {
    const { unmount } = render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    expect(screen.getByRole("link", { name: "Gerenciar campos" })).toHaveAttribute(
      "href",
      "/app/settings/tenant/pipelines",
    );
    unmount();
    permissao.pode = false;
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    const botao = screen.getByRole("button", { name: "Gerenciar campos" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("title", "Só quem administra a conta gerencia os campos.");
  });

  it("um campo condicional escondido não aparece (camposVisiveis)", () => {
    const comCondicional = {
      ...PIPELINE,
      settings: {
        fields: [
          ...(PIPELINE.settings as { fields: unknown[] }).fields,
          {
            key: "cnpj",
            label: "CNPJ",
            type: "text",
            mostrar_quando: { campo: "origem_organico", operador: "igual", valor: "meta" },
          },
        ],
      },
    } as unknown as Pipeline;
    render(<AbaNegocio lead={LEAD} pipeline={comCondicional} />);
    expect(screen.queryByRole("textbox", { name: "CNPJ" })).toBeNull();
  });
});

describe("aba Contato (print 02, C10)", () => {
  beforeEach(() => gravar.enviado.mockClear());

  it("Nome, Telefone (para exibição), Email, os links e os campos do CRM, cada um num input", () => {
    render(<AbaContato lead={LEAD} pipeline={PIPELINE} />);
    expect(screen.getByRole("heading", { name: "Campos de contato" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nome" })).toHaveValue("Ana");
    expect(screen.getByRole("textbox", { name: "Telefone" })).toHaveValue("+5543998031566");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("ana@b.co");
    expect(screen.getByRole("textbox", { name: "Instagram" })).toHaveValue(
      "https://instagram.com/ana",
    );
    expect(screen.getByRole("textbox", { name: "Site" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Notas" })).toHaveValue("");
  });

  it("editar o nome grava name; um campo do CRM grava custom_fields INTEIRO; o telefone vai canônico", async () => {
    render(<AbaContato lead={LEAD} pipeline={PIPELINE} />);
    const nome = screen.getByRole("textbox", { name: "Nome" });
    await userEvent.clear(nome);
    await userEvent.type(nome, "Ana Nunes{Enter}");
    expect(gravar.enviado).toHaveBeenCalledWith({ name: "Ana Nunes" });
    await userEvent.type(screen.getByRole("textbox", { name: "Notas" }), "VIP{Enter}");
    expect(gravar.enviado).toHaveBeenLastCalledWith({
      custom_fields: { cargo: "CEO", link_instagram: "https://instagram.com/ana", notas: "VIP" },
    });
    const tel = screen.getByRole("textbox", { name: "Telefone" });
    await userEvent.clear(tel);
    await userEvent.type(tel, "(43) 3222-3344{Enter}");
    expect(gravar.enviado).toHaveBeenLastCalledWith({ phone_number: "+554332223344" });
  });

  it("apagar o e-mail não grava e explica (Q4)", async () => {
    render(<AbaContato lead={LEAD} pipeline={PIPELINE} />);
    await userEvent.clear(screen.getByRole("textbox", { name: "Email" }));
    await userEvent.keyboard("{Enter}");
    expect(gravar.enviado).not.toHaveBeenCalled();
    expect(screen.getByText("Para apagar o e-mail, use a ficha do contato.")).toBeInTheDocument();
  });

  it("negócio sem contato: a moldura só leitura com o aviso", () => {
    render(<AbaContato lead={{ ...LEAD, contact_id: null } as Lead} pipeline={PIPELINE} />);
    expect(screen.getByText("Este negócio não tem contato.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Nome" })).toBeNull();
  });
});

describe("aba Empresa (print 03)", () => {
  it("Empresa: os oito campos da Clint, vazios até a 1H vincular a empresa (Q6)", () => {
    render(<AbaEmpresa />);
    expect(screen.getByRole("heading", { name: "Campos de empresa" })).toBeInTheDocument();
    expect(screen.getAllByRole("term").map((d) => d.textContent)).toEqual([
      "Nome da empresa",
      "Site",
      "Cidade",
      "Estado",
      "Categoria",
      "Segmento",
      "Número de funcionários",
      "CNPJ",
    ]);
  });
});

describe("aba Conversas (print 05)", () => {
  it("a conversa do negócio na lista, que abre no Inbox, e o vazio da direita", () => {
    render(<AbaConversas lead={LEAD} />);
    expect(screen.getByText("Abra as conversas sem marcá-las como lidas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ativar modo espião" })).toHaveAttribute(
      "title",
      "Em breve",
    );
    expect(screen.getByText("1 sessões")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Olá, me chamo Camilly/ })).toHaveAttribute(
      "href",
      "/app/inbox?id=cv1",
    );
    expect(screen.getByText("Selecione uma conversa")).toBeInTheDocument();
    expect(
      screen.getByText("Escolha uma conversa ao lado para ver as mensagens."),
    ).toBeInTheDocument();
  });

  it("contato sem conversa: o texto da Clint", () => {
    render(<AbaConversas lead={{ ...LEAD, conversa: null } as Lead} />);
    expect(
      screen.getByText("Este contato não possui conversas no atendimento"),
    ).toBeInTheDocument();
  });
});

describe("aba Arquivos (print 06)", () => {
  it("a barra, a tabela e o vazio da Clint; enviar é da 1H", () => {
    render(<AbaArquivos />);
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "Arquivo",
      "Data de upload",
      "Usuário",
    ]);
    expect(screen.getByText("Nenhum arquivo encontrado")).toBeInTheDocument();
    expect(
      screen.getByText("Envie arquivos para mantê-los junto deste contato."),
    ).toBeInTheDocument();
    for (const b of screen.getAllByRole("button", { name: "Novo arquivo" })) {
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", "Em breve");
    }
    expect(screen.getByRole("button", { name: "Data" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tipo de arquivo" })).toBeDisabled();
  });
});
