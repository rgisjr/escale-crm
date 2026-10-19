import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AbaEmpresa } from "@/components/escale/negocio/abas/AbasDeCampos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => true }));
vi.mock("@/components/escale/campos/JanelaDeGerenciarCampos", () => ({ JanelaDeGerenciarCampos: () => null }));

type Chamada = { url: string; metodo: string; corpo?: unknown };
const chamadas: Chamada[] = [];
const estado = vi.hoisted(() => ({ empresa: null as unknown }));

const ATLAS = {
  id: "e1",
  nome: "Atlas",
  cidade: null,
  estado: null,
  cnpj: null,
  campos: {},
  principal: true,
};
const G1 = "00000000-0000-4000-8000-0000000000a1";
const ROTULOS: Record<string, string> = {
  site: "Site",
  categoria: "Categoria",
  segmento: "Segmento",
  numero_de_funcionarios: "Número de funcionários",
};
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
    if (url === "/api/v1/contatos/c1/empresa") return dados(init?.method === "PUT" ? ATLAS : estado.empresa);
    if (url.startsWith("/api/v1/empresas?")) {
      return dados({ linhas: [{ id: "e1", nome: "Atlas" }, { id: "e2", nome: "Beta" }], total: 2 });
    }
    return dados({ id: "e1" });
  }),
);

function montar(empresa: unknown) {
  estado.empresa = empresa;
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AbaEmpresa lead={{ id: "l1", contact_id: "c1" } as never} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  chamadas.length = 0;
});

describe("aba Empresa do negócio (Clint OrganizationChange)", () => {
  it("sem empresa: só 'Nome da empresa' editável, com a busca que vincula", async () => {
    montar(null);
    const seletor = await screen.findByRole("combobox", { name: "Nome da empresa" });
    fireEvent.click(seletor);
    fireEvent.click(await screen.findByRole("option", { name: "Beta" }));
    await waitFor(() =>
      expect(chamadas).toContainEqual({ url: "/api/v1/contatos/c1/empresa", metodo: "PUT", corpo: { empresa_id: "e2" } }),
    );
  });

  it("com empresa: os campos editáveis e o atalho 'Ver dados da empresa Atlas'", async () => {
    montar(ATLAS);
    expect(await screen.findByRole("link", { name: "Ver dados da empresa Atlas" })).toHaveAttribute(
      "href",
      "/app/companies/e1?aba=dados",
    );
    const cidade = screen.getByLabelText("Cidade");
    fireEvent.change(cidade, { target: { value: "Pelotas" } });
    fireEvent.keyDown(cidade, { key: "Enter" });
    await waitFor(() =>
      expect(chamadas).toContainEqual({ url: "/api/v1/empresas/e1", metodo: "PATCH", corpo: { chave: "cidade", valor: "Pelotas" } }),
    );
  });

  it("digitar um nome novo com empresa atual abre 'Nova empresa' (Manter / Limpar)", async () => {
    montar(ATLAS);
    fireEvent.click(await screen.findByRole("combobox", { name: "Nome da empresa" }));
    fireEvent.change(screen.getByPlaceholderText("Escolha a empresa ou digite um nome novo"), {
      target: { value: "Gama" },
    });
    fireEvent.click(await screen.findByRole("option", { name: 'Criar a empresa "Gama"' }));
    expect(screen.getByText("Selecione o que deseja fazer com os campos da nova empresa:")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Manter informações dos campos/ }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(chamadas).toContainEqual({
        url: "/api/v1/contatos/c1/empresa",
        metodo: "PUT",
        corpo: { nova: { nome: "Gama", campos: "manter" } },
      }),
    );
  });
});
