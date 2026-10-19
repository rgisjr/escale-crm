import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { PainelDeFiltros } from "@/components/escale/contatos/filtros/PainelDeFiltros";
import {
  camposDoContatoDoFiltro,
  type FiltrosDeContatos,
  type SecaoDoFiltro,
  type TagsDoFiltro,
} from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u1", full_name: "Rafa", role: "agent" }] }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({
  useAssignableAgents: () => ({ data: [] }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["vip", "frio"], isLoading: false }),
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({ useCorDaEtiqueta: () => null }));

const O1 = "11111111-1111-4111-8111-111111111111";
const E1 = "22222222-2222-4222-8222-222222222222";
const OPCOES: OpcoesDoFiltro = {
  origens: [{ id: O1, nome: "Leads INSS", etapas: [{ id: E1, nome: "Entrada" }] }],
  motivos: [{ valor: "price", rotulo: "Preço" }],
  camposDoNegocio: [
    { alvo: "negocio", chave: "valor", rotulo: "Valor do negócio", tipo: "numero" },
  ],
  // Fase 2C: os fixos do contato mais um campo do catálogo (Renda).
  camposDoContato: camposDoContatoDoFiltro({
    grupos: [],
    campos: [
      { id: "c1", objeto: "contato", chave: "renda", definicao: { label: "Renda", type: "currency" }, grupo_id: null, papel_minimo: null, posicao: 0, padrao: false },
    ],
  }),
};
const SO_QUALQUER: TagsDoFiltro = {
  combinar: "ou",
  grupos: [{ modo: "e", condicoes: [{ op: "qualquer" }] }],
};

function Painel({
  inicial = {},
  foco = null,
  espia,
  aoMudarFoco = vi.fn(),
}: {
  inicial?: FiltrosDeContatos;
  foco?: SecaoDoFiltro | null;
  espia: (f: FiltrosDeContatos) => void;
  aoMudarFoco?: (s: SecaoDoFiltro | null) => void;
}) {
  const [f, setF] = useState<FiltrosDeContatos>(inicial);
  return (
    <QueryClientProvider client={new QueryClient()}>
      <PainelDeFiltros
        filtros={f}
        aoMudar={(n) => {
          setF(n);
          espia(n);
        }}
        opcoes={OPCOES}
        foco={foco}
        aoMudarFoco={aoMudarFoco}
      />
    </QueryClientProvider>
  );
}

const abrir = (secao: string) => fireEvent.click(screen.getByRole("button", { name: secao }));
/** O seletor suspenso das condições (Tags e Campos) é uma região com nome. */
const seletor = (nome: string) => screen.getByRole("region", { name: nome });

describe("PainelDeFiltros (prints 2b-05 a 2b-23)", () => {
  it("as quatro seções da Clint, com o selo e o × que limpa só a seção", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} inicial={{ telefone: "com", tags: SO_QUALQUER }} />);
    for (const s of ["Contato", "Negócio", "Tags", "Campos"]) {
      expect(screen.getByRole("button", { name: s })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Limpar Contato" }));
    expect(espia).toHaveBeenLastCalledWith({ tags: SO_QUALQUER });
  });

  it("Contato › Telefone", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Contato");
    fireEvent.click(screen.getByRole("combobox", { name: "Telefone" }));
    fireEvent.click(screen.getByRole("option", { name: "Sem Telefone" }));
    expect(espia).toHaveBeenLastCalledWith({ telefone: "sem" });
  });

  it("Negócio › a etapa só liga com a origem escolhida", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Negócio");
    expect(screen.getByRole("combobox", { name: "Etapa" })).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: "Origens" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Leads INSS" }));
    expect(espia).toHaveBeenLastCalledWith({ negocio: { origens: [O1], etapas: [] } });
    expect(screen.getByRole("combobox", { name: "Etapa" })).not.toBeDisabled();
  });

  it("Negócio › escolher motivo de perda põe o status em Perdido (Clint)", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Negócio");
    fireEvent.click(screen.getByRole("combobox", { name: "Motivo de perda" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Preço" }));
    expect(espia).toHaveBeenLastCalledWith({ negocio: { motivos: ["price"], status: ["lost"] } });
  });

  it("Tags › vazio: o botão largo abre o seletor; a tag, 'Não possui a tag' e Aplicar viram o GRUPO 1", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Tags");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    const tags = seletor("Escolher tag");
    expect(within(tags).getByRole("button", { name: "Qualquer tag" })).toBeInTheDocument();
    expect(within(tags).getByRole("button", { name: "Sem tag" })).toBeInTheDocument();
    fireEvent.click(within(tags).getByRole("button", { name: "vip" }));
    expect(screen.getByRole("radio", { name: "Possui a tag" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("radio", { name: "Não possui a tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(espia).toHaveBeenLastCalledWith({
      tags: {
        combinar: "ou",
        grupos: [{ modo: "e", condicoes: [{ op: "nao_possui", tag: "vip" }] }],
      },
    });
    expect(screen.getByText("Grupo 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar grupo" })).toBeInTheDocument();
  });

  it("Tags › 'Qualquer tag' aplica na hora; 'Adicionar grupo' cria o GRUPO 2; a lixeira tira o grupo", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Tags");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    fireEvent.click(within(seletor("Escolher tag")).getByRole("button", { name: "Qualquer tag" }));
    expect(espia).toHaveBeenLastCalledWith({ tags: SO_QUALQUER });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar grupo" }));
    fireEvent.click(within(seletor("Escolher tag")).getByRole("button", { name: "Sem tag" }));
    expect(espia).toHaveBeenLastCalledWith({
      tags: {
        combinar: "ou",
        grupos: [
          { modo: "e", condicoes: [{ op: "qualquer" }] },
          { modo: "e", condicoes: [{ op: "sem" }] },
        ],
      },
    });
    expect(screen.getByText("Grupo 2")).toBeInTheDocument();
    expect(screen.getByText("combinar grupos por")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir grupo Grupo 1" }));
    expect(espia).toHaveBeenLastCalledWith({
      tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "sem" }] }] },
    });
  });

  it("Campos › Contato, Negócio e Empresa (em breve); o grupo abre; 'Contém' já vem marcado; valor e Aplicar", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Campos");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    const campos = seletor("Escolher campo");
    expect(within(campos).getByRole("button", { name: "Empresa" })).toBeDisabled();
    expect(within(campos).queryByRole("button", { name: "Nome" })).not.toBeInTheDocument();
    fireEvent.click(within(campos).getByRole("button", { name: "Contato" }));
    fireEvent.click(within(campos).getByRole("button", { name: "Nome" }));
    expect(screen.getByRole("radio", { name: "Contém" })).toHaveAttribute("aria-checked", "true");
    fireEvent.change(screen.getByPlaceholderText("Digite o texto a buscar"), {
      target: { value: "ana" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(espia).toHaveBeenLastCalledWith({
      campos: {
        combinar: "ou",
        grupos: [
          {
            modo: "e",
            condicoes: [
              { alvo: "contato", chave: "nome", tipo: "texto", op: "contem", valor: "ana" },
            ],
          },
        ],
      },
    });
    expect(screen.getByText("Grupo 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar grupo" })).toBeInTheDocument();
  });

  it("Campos › o grupo Contato lista o campo do catálogo (Renda) com os operadores de número (2C)", () => {
    render(<Painel espia={vi.fn()} />);
    abrir("Campos");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    const campos = seletor("Escolher campo");
    fireEvent.click(within(campos).getByRole("button", { name: "Contato" }));
    fireEvent.click(within(campos).getByRole("button", { name: "Renda" }));
    for (const op of ["Igual", "Maior que", "Menor que"]) {
      expect(screen.getByRole("radio", { name: op })).toBeInTheDocument();
    }
  });

  it("Campos › a busca abre o grupo do que achou; número no formato brasileiro vira número", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Campos");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    fireEvent.change(
      within(seletor("Escolher campo")).getByRole("textbox", { name: "Buscar campo" }),
      {
        target: { value: "valor" },
      },
    );
    fireEvent.click(
      within(seletor("Escolher campo")).getByRole("button", { name: "Valor do negócio" }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "Maior que" }));
    fireEvent.change(screen.getByPlaceholderText("Digite o valor"), {
      target: { value: "1.500,50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(espia.mock.lastCall?.[0].campos.grupos[0].condicoes[0]).toEqual({
      alvo: "negocio",
      chave: "valor",
      tipo: "numero",
      op: "maior",
      valor: "1500.5",
    });
  });

  it("com foco, só a seção e o 'Todos os filtros'", () => {
    const aoMudarFoco = vi.fn();
    render(<Painel espia={vi.fn()} foco="tags" aoMudarFoco={aoMudarFoco} />);
    expect(screen.queryByRole("button", { name: "Contato" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Todos os filtros" }));
    expect(aoMudarFoco).toHaveBeenCalledWith(null);
  });
});
