import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ControleDosFiltros } from "@/components/escale/contatos/filtros/ControleDosFiltros";
import { FaixaDeFiltros } from "@/components/escale/contatos/filtros/FaixaDeFiltros";
import {
  SeletorDeFiltros,
  rotuloDoSeletor,
} from "@/components/escale/contatos/filtros/SeletorDeFiltros";
import { Popover } from "@/components/ui/popover";
import type { TagsDoFiltro } from "@/lib/escale/contatos/filtros";
import type { FiltroDaLista } from "@/lib/escale/listas/filtros-salvos";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u1", full_name: "Rafa", role: "agent" }] }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({
  useAssignableAgents: () => ({ data: [] }),
}));

const O1 = "11111111-1111-4111-8111-111111111111";
const OPCOES: OpcoesDoFiltro = {
  origens: [{ id: O1, nome: "Leads INSS", etapas: [] }],
  motivos: [],
  camposDoNegocio: [],
  camposDoContato: [],
  camposDaEmpresa: [],
};
const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const VIP: TagsDoFiltro = {
  combinar: "ou",
  grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: "vip" }] }],
};
const SALVOS: FiltroDaLista[] = [
  { id: "f1", nome: "VIPs", compartilhado: false, meu: true, criterios: { tags: VIP } },
  { id: "f2", nome: "Da equipe", compartilhado: true, meu: false, criterios: { telefone: "sem" } },
];

describe("FaixaDeFiltros (prints 2b-24 a 2b-26)", () => {
  const props = {
    opcoes: OPCOES,
    aoMudar: vi.fn(),
    aoAbrir: vi.fn(),
    podeResetar: true,
    aoResetar: vi.fn(),
    aoRecolher: vi.fn(),
  };

  it("um chip por critério; o × tira só ele; o chip abre a seção", () => {
    envolver(
      <FaixaDeFiltros {...props} filtros={{ telefone: "sem", negocio: { origens: [O1] } }} />,
    );
    expect(screen.getByText("Sem Telefone")).toBeInTheDocument();
    expect(screen.getByText("Leads INSS")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover filtro Telefone" }));
    expect(props.aoMudar).toHaveBeenLastCalledWith({ negocio: { origens: [O1] } });
    fireEvent.click(screen.getByText("Sem Telefone"));
    expect(props.aoAbrir).toHaveBeenLastCalledWith("contato");
    fireEvent.click(screen.getByRole("button", { name: "Filtro" }));
    expect(props.aoAbrir).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByRole("button", { name: "Resetar" }));
    expect(props.aoResetar).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Recolher filtros" }));
    expect(props.aoRecolher).toHaveBeenCalled();
  });

  it("o chip de Tags conta as condições dos grupos ('Tags 2 tags', print 2b-25)", () => {
    envolver(
      <FaixaDeFiltros
        {...props}
        filtros={{
          tags: {
            combinar: "ou",
            grupos: [
              { modo: "e", condicoes: [{ op: "possui", tag: "vip" }] },
              { modo: "e", condicoes: [{ op: "possui", tag: "frio" }] },
            ],
          },
        }}
      />,
    );
    expect(screen.getByText("2 tags")).toBeInTheDocument();
  });

  it("mais de 6 chips: os 6 primeiros e '+N'", () => {
    envolver(
      <FaixaDeFiltros
        {...props}
        filtros={{
          criadoEm: { de: "2026-10-01" },
          telefone: "com",
          negocio: {
            tem: "com",
            origens: [O1],
            status: ["open"],
            donos: ["u1"],
            motivos: ["price"],
          },
          tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "sem" }] }] },
        }}
      />,
    );
    expect(screen.getByRole("button", { name: "+2" })).toBeInTheDocument();
  });

  it("sem filtro: só '+ Filtro' e o ^ (print 2b-26)", () => {
    envolver(<FaixaDeFiltros {...props} podeResetar={false} filtros={{}} />);
    expect(screen.getByRole("button", { name: "Filtro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recolher filtros" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resetar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remover filtro/ })).not.toBeInTheDocument();
  });
});

describe("ControleDosFiltros (prints 2b-01 e 2b-24)", () => {
  it("faixa recolhida: 'Filtros' com o selo e o ⇕; faixa aberta: o par some", () => {
    const aoAlternarFaixa = vi.fn();
    const { rerender } = render(
      <Popover>
        <ControleDosFiltros faixaAberta={false} quantos={2} aoAlternarFaixa={aoAlternarFaixa} />
      </Popover>,
    );
    expect(screen.getByRole("button", { name: /Filtros/ })).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "Expandir filtros" }));
    expect(aoAlternarFaixa).toHaveBeenCalled();
    rerender(
      <Popover>
        <ControleDosFiltros faixaAberta quantos={2} aoAlternarFaixa={aoAlternarFaixa} />
      </Popover>,
    );
    expect(screen.queryByRole("button", { name: /Filtros/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expandir filtros" })).not.toBeInTheDocument();
  });
});

describe("rotuloDoSeletor (Clint `usePresetDirtySync`)", () => {
  it("visão sem filtro; 'Personalizado' com filtro; o nome do salvo enquanto bate", () => {
    expect(
      rotuloDoSeletor({ visao: "todos", filtros: {}, filtroSalvoId: null, salvos: SALVOS }),
    ).toEqual({ tipo: "visao", visao: "todos" });
    expect(
      rotuloDoSeletor({
        visao: "todos",
        filtros: { telefone: "com" },
        filtroSalvoId: null,
        salvos: SALVOS,
      }),
    ).toEqual({ tipo: "personalizado" });
    expect(
      rotuloDoSeletor({
        visao: "todos",
        filtros: { tags: VIP },
        filtroSalvoId: "f1",
        salvos: SALVOS,
      }),
    ).toEqual({ tipo: "salvo", id: "f1", nome: "VIPs" });
    expect(
      rotuloDoSeletor({
        visao: "todos",
        filtros: { telefone: "com" },
        filtroSalvoId: "f1",
        salvos: SALVOS,
      }),
    ).toEqual({ tipo: "personalizado" });
  });
});

describe("SeletorDeFiltros (prints 2b-02 a 2b-04)", () => {
  const props = {
    visao: "todos" as const,
    filtros: {},
    filtroSalvoId: null,
    salvos: SALVOS,
    aoEscolherVisao: vi.fn(),
    aoCompartilhar: vi.fn(),
    aoExcluir: vi.fn(),
  };

  it("Padrão, Meus filtros, Compartilhados e Criar filtro", async () => {
    const user = userEvent.setup();
    const aoAplicarSalvo = vi.fn();
    const aoCriarFiltro = vi.fn();
    envolver(
      <SeletorDeFiltros
        {...props}
        aoAplicarSalvo={aoAplicarSalvo}
        aoCriarFiltro={aoCriarFiltro}
        aoRenomear={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Todos os contatos/ }));
    expect(screen.getByText("Padrão")).toBeInTheDocument();
    expect(screen.getByText("Meus filtros")).toBeInTheDocument();
    expect(screen.getByText("Compartilhados")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Da equipe" }));
    expect(aoAplicarSalvo).toHaveBeenCalledWith(SALVOS[1]);
    await user.click(screen.getByRole("button", { name: /Todos os contatos/ }));
    await user.click(screen.getByRole("menuitem", { name: "Criar filtro" }));
    expect(aoCriarFiltro).toHaveBeenCalled();
  });

  it("o ⋮ do salvo: 'Renomear' vira um campo na própria linha, com ✓ e ✕", async () => {
    const user = userEvent.setup();
    const aoRenomear = vi.fn(async () => null);
    envolver(
      <SeletorDeFiltros
        {...props}
        aoAplicarSalvo={vi.fn()}
        aoCriarFiltro={vi.fn()}
        aoRenomear={aoRenomear}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Todos os contatos/ }));
    await user.click(screen.getByRole("menuitem", { name: "Ações VIPs" }));
    expect(screen.getByRole("menuitem", { name: "Excluir filtro" })).toBeInTheDocument();
    // O submenu do Radix fecha quando o ponteiro de teste sai do gatilho; o clique direto é o do Enter/toque.
    fireEvent.click(screen.getByRole("menuitem", { name: "Renomear" }));
    const campo = screen.getByRole("textbox", { name: "Nome do filtro" });
    expect(campo).toHaveValue("VIPs");
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    await user.clear(campo);
    await user.type(campo, "Clientes VIP");
    await user.click(screen.getByRole("button", { name: "Salvar nome" }));
    expect(aoRenomear).toHaveBeenCalledWith("f1", "Clientes VIP");
    expect(screen.queryByRole("textbox", { name: "Nome do filtro" })).not.toBeInTheDocument();
  });
});
