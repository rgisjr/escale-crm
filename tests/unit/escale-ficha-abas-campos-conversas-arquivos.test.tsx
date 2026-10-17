import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

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

const linhaDe = (rotulo: string) =>
  screen.getByText(rotulo, { selector: "dt" }).parentElement as HTMLElement;

describe("aba Negócio (print 04)", () => {
  it("Valor e os campos do CRM num grupo só, 'Informações Gerais', só leitura", () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    expect(screen.getByRole("heading", { name: "Campos de negócio" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Grupos de campos" })).getByText(
        "Informações Gerais",
      ),
    ).toHaveAttribute("aria-current", "true");
    expect(within(linhaDe("Valor")).getByText(/R\$\s1\.500/)).toBeInTheDocument();
    expect(within(linhaDe("origem_organico")).getByText("Google")).toBeInTheDocument();
    expect(within(linhaDe("Notas")).getByText("Clique aqui para adicionar")).toBeInTheDocument();
  });

  it("Ocultar vazios, Gerenciar campos e a busca são da 1H: desligados, com 'Em breve'", () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    for (const nome of ["Ocultar vazios", "Gerenciar campos"]) {
      expect(screen.getByRole("button", { name: nome })).toBeDisabled();
      expect(screen.getByRole("button", { name: nome })).toHaveAttribute("title", "Em breve");
    }
    expect(screen.getByPlaceholderText("Pesquisar campos...")).toBeDisabled();
  });
});

describe("abas Contato e Empresa (prints 02 e 03)", () => {
  it("Contato: nome, telefone e e-mail do contato do negócio", () => {
    render(<AbaContato lead={LEAD} />);
    expect(screen.getByRole("heading", { name: "Campos de contato" })).toBeInTheDocument();
    expect(within(linhaDe("Telefone")).getByText("+55 43 99803 1566")).toBeInTheDocument();
    expect(within(linhaDe("Email")).getByText("Clique aqui para adicionar")).toBeInTheDocument();
  });

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
