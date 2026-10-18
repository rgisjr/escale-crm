import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { TabelaDeContatos } from "@/components/escale/contatos/TabelaDeContatos";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { COLUNAS_PADRAO } from "@/lib/escale/contatos/regras";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/channels/SeletorDeCanalParaConversa", () => ({
  useConversaNovaComEscolhaDeCanal: () => ({
    iniciarConversa: vi.fn(),
    abrindo: false,
    seletor: null,
  }),
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({ useCorDaEtiqueta: () => null }));

const linha = (extra: Partial<LinhaDeContato>): LinhaDeContato => ({
  id: "c1",
  nome: "Karoll",
  display_name: null,
  telefone: "+5564999446816",
  email: "karoll@exemplo.com",
  instagram: null,
  tags: ["calculadora"],
  tem_foto: false,
  conversa_id: null,
  negocios: 1,
  negocio_unico: "l1",
  status: "ativo",
  ultima_atividade: null,
  criado_em: "2026-10-01T10:00:00Z",
  origem: "manual",
  nascimento: null,
  links: {},
  ...extra,
});

const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const props = {
  colunas: COLUNAS_PADRAO,
  carregando: false,
  erro: false,
  aoTentarDeNovo: vi.fn(),
  podeVerNegocios: true,
  podeExcluir: true,
  aoAdicionarNegocio: vi.fn(),
};

describe("TabelaDeContatos (03-001)", () => {
  it("cabeçalho NOME, CONTATO, TAGS, NEGÓCIOS e a caixinha desligada sem permissão", () => {
    envolver(<TabelaDeContatos {...props} linhas={[linha({})]} />);
    for (const r of ["Nome", "Contato", "Tags", "Negócios"]) {
      expect(screen.getByRole("columnheader", { name: r })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("checkbox")[0]).toBeDisabled();
    expect(screen.getAllByTitle("Disponível para gerente ou acima.").length).toBeGreaterThan(0);
  });

  it("com a seleção ligada, a caixinha da linha marca pelo índice da página", () => {
    const aoAlternar = vi.fn();
    envolver(
      <TabelaDeContatos
        {...props}
        linhas={[linha({})]}
        selecao={{ podeSelecionar: true, marcada: () => false, aoAlternar }}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Selecionar contato" }));
    expect(aoAlternar).toHaveBeenCalledWith("c1", 0, true);
  });

  it("linha: nome leva ao contato, telefone no formato BR, e-mail, tag e 'Ver 1 negócio' leva ao negócio", () => {
    envolver(<TabelaDeContatos {...props} linhas={[linha({})]} />);
    const row = screen.getByRole("row", { name: /Karoll/ });
    expect(within(row).getByRole("link", { name: "Karoll" })).toHaveAttribute(
      "href",
      "/app/contacts/c1",
    );
    expect(within(row).getByText("(64) 99944-6816")).toBeInTheDocument();
    expect(within(row).getByText("karoll@exemplo.com")).toBeInTheDocument();
    expect(within(row).getByText("calculadora")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Ver 1 negócio" })).toHaveAttribute(
      "href",
      "/app/leads/l1",
    );
    expect(within(row).getByRole("link", { name: "Chamar" })).toHaveAttribute(
      "href",
      "tel:+5564999446816",
    );
  });

  it("dois negócios levam à página do contato; nenhum mostra 'Adicionar negócio'", () => {
    envolver(
      <TabelaDeContatos
        {...props}
        linhas={[
          linha({ id: "c2", nome: "Bruno", negocios: 2, negocio_unico: null }),
          linha({ id: "c3", nome: "Carla", negocios: 0, negocio_unico: null }),
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Ver 2 negócios" })).toHaveAttribute(
      "href",
      "/app/contacts/c2",
    );
    const carla = screen.getByRole("row", { name: /Carla/ });
    within(carla).getByRole("button", { name: "Adicionar negócio" }).click();
    expect(props.aoAdicionarNegocio).toHaveBeenCalledWith(expect.objectContaining({ id: "c3" }));
  });

  it("sem permissão de negócio, a coluna Negócios não tem botões", () => {
    envolver(<TabelaDeContatos {...props} podeVerNegocios={false} linhas={[linha({})]} />);
    expect(screen.queryByRole("link", { name: "Ver 1 negócio" })).not.toBeInTheDocument();
  });

  it("Instagram aparece com @; conversa existente vira 'Abrir em Conversas'", () => {
    envolver(
      <TabelaDeContatos
        {...props}
        linhas={[linha({ instagram: "dapenhamaria", conversa_id: "cv1" })]}
      />,
    );
    expect(screen.getByText("dapenhamaria")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir em Conversas" })).toHaveAttribute(
      "href",
      "/app/inbox?id=cv1",
    );
  });

  it("vazio e erro com os textos da Clint", () => {
    const { rerender } = envolver(<TabelaDeContatos {...props} linhas={[]} />);
    expect(screen.getByText("Não foram encontrados contatos.")).toBeInTheDocument();
    expect(screen.getByText("Tente ajustar a busca ou os filtros.")).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <TabelaDeContatos {...props} linhas={[]} erro />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Não foi possível carregar os contatos.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("colunas escolhidas: Status e um link aparecem, na ordem", () => {
    envolver(
      <TabelaDeContatos
        {...props}
        colunas={[
          { tipo: "nativa", chave: "status" },
          { tipo: "campo", chave: "link_site" },
        ]}
        linhas={[linha({ links: { site: "https://exemplo.com" } })]}
      />,
    );
    const titulos = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(titulos.slice(1, 4)).toEqual(["Nome", "Status", expect.any(String)]);
  });
});
