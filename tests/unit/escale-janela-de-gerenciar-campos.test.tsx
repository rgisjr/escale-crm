import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { JanelaDeGerenciarCampos } from "@/components/escale/campos/JanelaDeGerenciarCampos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CATALOGO = {
  grupos: [
    { id: "00000000-0000-4000-8000-0000000000a1", chave: "informacoes_gerais", nome: "Informações Gerais", posicao: 0, padrao: true },
    { id: "00000000-0000-4000-8000-0000000000a2", chave: "kaio_ia", nome: "Kaio IA", posicao: 1, padrao: false },
  ],
  campos: [
    { id: "c1", objeto: "contato", chave: "cargo", definicao: { label: "Cargo", type: "text" }, grupo_id: "00000000-0000-4000-8000-0000000000a1", papel_minimo: null, posicao: 0, padrao: false },
    { id: "c2", objeto: "contato", chave: "renda", definicao: { label: "Renda", type: "currency" }, grupo_id: "00000000-0000-4000-8000-0000000000a1", papel_minimo: "manager", posicao: 1, padrao: false },
    { id: "c3", objeto: "contato", chave: "score", definicao: { label: "Score", type: "number" }, grupo_id: "00000000-0000-4000-8000-0000000000a2", papel_minimo: null, posicao: 0, padrao: false },
  ],
};

const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  if (url.startsWith("/api/v1/campos-do-crm?objeto=contato")) return new Response(JSON.stringify({ data: CATALOGO }));
  if (url.startsWith("/api/v1/campos-do-crm?objeto=")) return new Response(JSON.stringify({ data: { grupos: [], campos: [] } }));
  return new Response(JSON.stringify({ data: { id: "novo" } }), { status: init?.method === "POST" ? 201 : 200 });
});
vi.stubGlobal("fetch", fetchMock);

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <JanelaDeGerenciarCampos aberta aoFechar={vi.fn()} objetoInicial="contato" />
    </QueryClientProvider>,
  );

describe("JanelaDeGerenciarCampos (FieldsConfigTab da Clint)", () => {
  it("título, subtítulo, as três abas e os botões", async () => {
    montar();
    expect(await screen.findByText("Gerenciamento de campos")).toBeInTheDocument();
    expect(screen.getByText("Campos cadastrados")).toBeInTheDocument();
    for (const aba of ["Contato", "Empresa", "Negócio"]) expect(screen.getByRole("tab", { name: aba })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar grupo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar campo" })).toBeInTheDocument();
  });

  it("os grupos à esquerda; o ativo filtra a lista; a pílula de visibilidade", async () => {
    montar();
    await screen.findByText("Cargo");
    const grupos = screen.getByRole("navigation", { name: "Grupos de campos" });
    expect(within(grupos).getByText("Informações Gerais")).toBeInTheDocument();
    expect(screen.getByText("Cargo")).toBeInTheDocument();
    expect(screen.getByText("Renda")).toBeInTheDocument();
    expect(screen.queryByText("Score")).not.toBeInTheDocument();
    expect(screen.getByText("Restrito para A partir de gerente")).toBeInTheDocument();
    fireEvent.click(within(grupos).getByText("Kaio IA"));
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.queryByText("Cargo")).not.toBeInTheDocument();
  });

  it("o ⋮ tem Editar nome, Restringir visibilidade, Usar como variável, Copiar identificador e Excluir; excluir confirma com os dois avisos", async () => {
    montar();
    await screen.findByText("Cargo");
    await userEvent.setup({ pointerEventsCheck: 0 }).click(screen.getByRole("button", { name: "Ações de Cargo" }));
    for (const item of ["Editar nome do campo", "Restringir visibilidade", "Usar como variável", "Copiar identificador", "Excluir"]) {
      expect(screen.getByRole("menuitem", { name: item })).toBeInTheDocument();
    }
    await userEvent.setup({ pointerEventsCheck: 0 }).click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(await screen.findByText("A exclusão desse campo remove em toda origem. Deseja continuar?")).toBeInTheDocument();
    expect(screen.getByText("Se este campo estiver configurado como obrigatório em alguma origem, a regra será removida.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/campos-do-crm/c1?objeto=contato", expect.objectContaining({ method: "DELETE" })));
  });

  it("um grupo vazio mostra o texto da Clint; a busca sem resultado também", async () => {
    montar();
    await screen.findByText("Cargo");
    fireEvent.change(screen.getByPlaceholderText("Buscar coluna ou campo"), { target: { value: "zzz" } });
    expect(screen.getByText("Nenhum campo encontrado")).toBeInTheDocument();
    expect(screen.getByText("Tente ajustar o termo da busca ou limpar o filtro.")).toBeInTheDocument();
  });
});
