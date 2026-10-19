import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FichaDaEmpresa } from "@/components/escale/empresas/FichaDaEmpresa";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/escale/contatos/JanelaNovoContato", () => ({ JanelaNovoContato: () => null }));

type Chamada = { url: string; metodo: string; corpo?: unknown };
const chamadas: Chamada[] = [];

const FICHA = {
  id: "e1",
  nome: "Atlas Distribuidora",
  cnpj: null,
  cidade: null,
  estado: null,
  campos: {},
  criada_em: "2026-10-01T12:00:00.000Z",
  valor_aberto: 1500.5,
  moeda: "BRL",
  principal: { id: "c1", nome: "Alex", telefone: "+5553999998393", tem_foto: false, conversa_id: null },
  contatos: 2,
  negocios: 1,
};
const CONTATOS = [
  { id: "c1", nome: "Alex", telefone: "+5553999998393", email: null, tags: [], tem_foto: false, conversa_id: null, principal: true, negocios: 1, negocio_unico: "l1" },
  { id: "c2", nome: "Bia", telefone: null, email: "bia@x.com", tags: [], tem_foto: false, conversa_id: null, principal: false, negocios: 0, negocio_unico: null },
];
const NEGOCIOS = [{ id: "l1", titulo: "Proposta Atlas", origem: "Leads", etapa: "Entrada", status: "open", valor: 1500.5, moeda: "BRL", contato: "Alex" }];
const G1 = "00000000-0000-4000-8000-0000000000a1";
const ROTULOS: Record<string, string> = { site: "Site", categoria: "Categoria", segmento: "Segmento", numero_de_funcionarios: "Número de funcionários" };
const CATALOGO = {
  grupos: [{ id: G1, chave: "informacoes_gerais", nome: "Informações Gerais", posicao: 0, padrao: true }],
  campos: Object.keys(ROTULOS).map((chave, i) => ({
    id: "e" + i,
    objeto: "empresa",
    chave,
    definicao: { label: ROTULOS[chave], type: chave === "numero_de_funcionarios" ? "number" : "text" },
    grupo_id: G1,
    papel_minimo: null,
    posicao: i,
    padrao: true,
  })),
};

vi.stubGlobal(
  "fetch",
  vi.fn(async (url: string, init?: RequestInit) => {
    chamadas.push({ url, metodo: init?.method ?? "GET", corpo: init?.body ? JSON.parse(String(init.body)) : undefined });
    const dados = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 });
    if (url.startsWith("/api/v1/campos-do-crm")) return dados(CATALOGO);
    if (url === "/api/v1/empresas/e1") return dados(FICHA);
    if (url === "/api/v1/empresas/e1/contatos") return dados(CONTATOS);
    if (url === "/api/v1/empresas/e1/negocios") return dados(NEGOCIOS);
    return dados({ id: "e1", desfecho: "removido" });
  }),
);

function montar(aba = "contatos", papel: "agent" | "manager" = "manager") {
  window.history.replaceState(null, "", "?aba=" + aba);
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FichaDaEmpresa id="e1" papel={papel} podeAdministrar={false} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  chamadas.length = 0;
});

describe("FichaDaEmpresa (Clint index-BYxUbJr8)", () => {
  it("o resumo: Valor em aberto R$ 1.500,50, Contato principal Alex, Criada em 01/10/2026; as três abas", async () => {
    montar();
    expect(await screen.findByText("Atlas Distribuidora")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.500,50")).toBeInTheDocument();
    expect(within(screen.getByTestId("resumo-da-empresa")).getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("01/10/2026")).toBeInTheDocument();
    for (const aba of ["Contatos", "Negócios", "Dados"]) expect(screen.getByRole("tab", { name: aba })).toBeInTheDocument();
  });

  it("Contatos: a estrela do principal, 'Tornar contato principal' na Bia, e remover o principal pede o novo", async () => {
    montar();
    await screen.findByText("Bia");
    expect(screen.getByRole("button", { name: "Contato principal · clique para remover" })).toBeInTheDocument();
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    await u.click(screen.getByRole("button", { name: "Ações de Bia" }));
    await u.click(screen.getByRole("menuitem", { name: "Tornar contato principal" }));
    await waitFor(() => expect(chamadas).toContainEqual({ url: "/api/v1/empresas/e1/principal", metodo: "PUT", corpo: { contato_id: "c2" } }));
    await u.click(screen.getByRole("button", { name: "Ações de Alex" }));
    await u.click(screen.getByRole("menuitem", { name: "Remover da empresa" }));
    expect(await screen.findByText("Este é o contato principal da empresa. Escolha quem será o novo contato principal antes de removê-lo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Definir e remover" })).toBeDisabled();
  });

  it("Negócios: busca e as colunas Negócio, Origem, Etapa, Status, Valor", async () => {
    montar("negocios");
    expect(await screen.findByPlaceholderText("Buscar negócios")).toBeInTheDocument();
    for (const c of ["Negócio", "Origem", "Etapa", "Status", "Valor"]) expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
  });

  it("Dados: os oito campos da Clint, editáveis para atendente; Excluir empresa só para gerente", async () => {
    montar("dados", "agent");
    for (const r of ["Nome da empresa", "Site", "Cidade", "Estado", "Categoria", "Segmento", "Número de funcionários", "CNPJ"]) {
      expect(await screen.findByText(r)).toBeInTheDocument();
    }
    expect(screen.queryByRole("menuitem", { name: "Excluir empresa" })).not.toBeInTheDocument();
  });
});
