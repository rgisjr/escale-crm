import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TabelaDeEmpresas } from "@/components/escale/empresas/TabelaDeEmpresas";
import type { LinhaDeEmpresa } from "@/lib/escale/empresas/banco";
import { COLUNAS_PADRAO_DE_EMPRESAS } from "@/lib/escale/empresas/regras";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const linha = (extra: Partial<LinhaDeEmpresa> = {}): LinhaDeEmpresa => ({
  id: "e1",
  nome: "Daiane Feijó Barreto Incorporação Ltda",
  cnpj: null,
  campos: {},
  contatos: 1,
  negocios: 0,
  negocio_unico: null,
  valor_aberto: 0,
  principal: { id: "c1", nome: "Alex", telefone: "+5553999998393", tem_foto: false, conversa_id: "v1" },
  ...extra,
});

const props = {
  colunas: [...COLUNAS_PADRAO_DE_EMPRESAS],
  camposDaEmpresa: [],
  moeda: "BRL",
  carregando: false,
  erro: false,
  busca: "",
  podeExcluir: true,
  aoTentarDeNovo: vi.fn(),
  aoLimparBusca: vi.fn(),
  aoNovaEmpresa: vi.fn(),
  aoExcluir: vi.fn(),
};
const envolver = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("TabelaDeEmpresas (04-001)", () => {
  it("cabeçalho NOME, CONTATO PRINCIPAL, SEGMENTO, CONTATOS, VALOR EM ABERTO, NEGÓCIOS", () => {
    envolver(<TabelaDeEmpresas {...props} linhas={[linha()]} />);
    for (const r of ["Nome", "Contato principal", "Segmento", "Contatos", "Valor em aberto", "Negócios"]) {
      expect(screen.getByRole("columnheader", { name: r })).toBeInTheDocument();
    }
  });

  it("a linha: monograma DL, ★ Alex, (53) 99999-8393, —, Ver 1 contato, R$ 0,00 e — nos negócios", () => {
    envolver(<TabelaDeEmpresas {...props} linhas={[linha()]} />);
    const tr = screen.getByText("Daiane Feijó Barreto Incorporação Ltda").closest("tr")!;
    expect(within(tr).getByText("DL")).toBeInTheDocument();
    expect(within(tr).getByText("Alex")).toBeInTheDocument();
    expect(within(tr).getByText("(53) 99999-8393")).toBeInTheDocument();
    expect(within(tr).getByRole("button", { name: "Ver 1 contato" })).toBeInTheDocument();
    expect(within(tr).getByText("R$ 0,00")).toBeInTheDocument();
    expect(within(tr).getAllByText("—")).toHaveLength(2);
  });

  it("'Ver 1 negócio' abre a ficha na aba Negócios; clicar na linha abre a empresa", () => {
    envolver(<TabelaDeEmpresas {...props} linhas={[linha({ negocios: 1, negocio_unico: "l1", valor_aberto: 1500.5 })]} />);
    expect(screen.getByText("R$ 1.500,50")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver 1 negócio" }));
    expect(push).toHaveBeenLastCalledWith("/app/companies/e1?aba=negocios");
    fireEvent.click(screen.getByText("Daiane Feijó Barreto Incorporação Ltda"));
    expect(push).toHaveBeenLastCalledWith("/app/companies/e1");
  });

  it("a lixeira pede a confirmação da Clint; sem permissão não aparece", async () => {
    const aoExcluir = vi.fn();
    const { unmount } = envolver(<TabelaDeEmpresas {...props} aoExcluir={aoExcluir} linhas={[linha()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir empresa" }));
    expect(await screen.findByText('Tem certeza que deseja excluir "Daiane Feijó Barreto Incorporação Ltda"? Os contatos serão mantidos.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(aoExcluir).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" })));
    unmount();
    envolver(<TabelaDeEmpresas {...props} podeExcluir={false} linhas={[linha()]} />);
    expect(screen.queryByRole("button", { name: "Excluir empresa" })).not.toBeInTheDocument();
  });

  it("vazio sem busca e com busca", () => {
    const { unmount } = envolver(<TabelaDeEmpresas {...props} linhas={[]} />);
    expect(screen.getByText("Organize seus contatos por empresa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova empresa" })).toBeInTheDocument();
    unmount();
    envolver(<TabelaDeEmpresas {...props} busca="xyz" linhas={[]} />);
    expect(screen.getByText('Nenhuma empresa encontrada para "xyz".')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar busca" })).toBeInTheDocument();
  });

  it("uma coluna de campo da empresa mostra o valor pelo tipo", () => {
    envolver(
      <TabelaDeEmpresas
        {...props}
        colunas={[{ tipo: "campo", chave: "numero_de_funcionarios" }]}
        camposDaEmpresa={[{ chave: "numero_de_funcionarios", rotulo: "Número de funcionários", tipo: "number" }]}
        linhas={[linha({ campos: { numero_de_funcionarios: 1200 } })]}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Número de funcionários" })).toBeInTheDocument();
    expect(screen.getByText("1.200")).toBeInTheDocument();
  });
});
