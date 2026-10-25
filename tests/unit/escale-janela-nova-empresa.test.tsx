import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaNovaEmpresa } from "@/components/escale/empresas/JanelaNovaEmpresa";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const sucesso = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => sucesso(...a), error: vi.fn() } }));

const chamadas: Array<{ url: string; corpo?: unknown }> = [];
let falhasDaEmpresa = 0;
vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
  chamadas.push({ url, corpo: init?.body ? JSON.parse(String(init.body)) : undefined });
  if (url.startsWith("/api/v1/lista-de-contatos")) {
    return new Response(JSON.stringify({ data: { linhas: [{ id: "c1", nome: "Alex", telefone: "+5553999998393", email: null }], total: 1 } }));
  }
  if (url === "/api/v1/contacts") return new Response(JSON.stringify({ data: { contact: { id: "c9", name: "Bia" } } }), { status: 201 });
  if (url === "/api/v1/empresas" && falhasDaEmpresa > 0) {
    falhasDaEmpresa -= 1;
    return new Response(JSON.stringify({ error: { message: "CNPJ já cadastrado." } }), { status: 409 });
  }
  if (url === "/api/v1/empresas") return new Response(JSON.stringify({ data: { id: "e1" } }), { status: 201 });
  return new Response("{}", { status: 404 });
}));

const montar = () => render(<QueryClientProvider client={new QueryClient()}><JanelaNovaEmpresa aberta aoFechar={vi.fn()} /></QueryClientProvider>);

describe("JanelaNovaEmpresa (OrganizationCreateWizard da Clint)", () => {
  beforeEach(() => {
    chamadas.length = 0;
  });

  it("passo Empresa: título, subtítulo, CNPJ com máscara, Continuar só com o nome", () => {
    montar();
    expect(screen.getByText("Nova empresa")).toBeInTheDocument();
    expect(screen.getByText("Dados da empresa — no próximo passo você vincula um contato.")).toBeInTheDocument();
    const continuar = screen.getByRole("button", { name: "Continuar" });
    expect(continuar).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Ex.: Atlas Distribuidora"), { target: { value: "Atlas" } });
    fireEvent.change(screen.getByPlaceholderText("00.000.000/0000-00"), { target: { value: "11222333000181" } });
    expect(screen.getByDisplayValue("11.222.333/0001-81")).toBeInTheDocument();
    expect(continuar).toBeEnabled();
  });

  it("CNPJ inválido segura o Continuar com o aviso", () => {
    montar();
    fireEvent.change(screen.getByPlaceholderText("Ex.: Atlas Distribuidora"), { target: { value: "Atlas" } });
    fireEvent.change(screen.getByPlaceholderText("00.000.000/0000-00"), { target: { value: "11222333000180" } });
    expect(screen.getByText("CNPJ inválido.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("passo Contato: vincular existente cria a empresa com ele e abre a ficha", async () => {
    montar();
    fireEvent.change(screen.getByPlaceholderText("Ex.: Atlas Distribuidora"), { target: { value: "Atlas" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Contato da empresa")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar contato por nome, telefone ou e-mail"), { target: { value: "Ale" } });
    fireEvent.click(await screen.findByRole("option", { name: /Alex/ }));
    fireEvent.click(screen.getByRole("button", { name: "Criar empresa" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/companies/e1"));
    expect(chamadas.find((c) => c.url === "/api/v1/empresas")?.corpo).toEqual({ nome: "Atlas", cnpj: "", site: "", contato_id: "c1" });
    expect(sucesso).toHaveBeenCalledWith('Empresa "Atlas" criada e vinculada a Alex.');
  });

  it("criar novo: cria o contato primeiro e depois a empresa; Voltar mantém o passo 1", async () => {
    montar();
    fireEvent.change(screen.getByPlaceholderText("Ex.: Atlas Distribuidora"), { target: { value: "Atlas" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("radio", { name: "Criar novo" }));
    expect(screen.getByText("Será definido como contato principal da empresa e aparecerá em destaque na listagem.")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), { target: { value: "Bia" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar empresa" }));
    await waitFor(() => expect(chamadas.find((c) => c.url === "/api/v1/empresas")?.corpo).toMatchObject({ contato_id: "c9" }));
    expect(chamadas.find((c) => c.url === "/api/v1/contacts")?.corpo).toMatchObject({ name: "Bia", source: "manual" });
  });

  it("empresa que falha depois do contato novo: tentar de novo reaproveita o contato criado (B3-5)", async () => {
    falhasDaEmpresa = 1;
    montar();
    fireEvent.change(screen.getByPlaceholderText("Ex.: Atlas Distribuidora"), { target: { value: "Atlas" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("radio", { name: "Criar novo" }));
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), { target: { value: "Bia" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar empresa" }));
    expect(await screen.findByText("CNPJ já cadastrado.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Criar empresa" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/companies/e1"));
    expect(chamadas.filter((c) => c.url === "/api/v1/contacts")).toHaveLength(1);
  });

  it("erro de rede ao criar mostra a mensagem em vez de rejeitar sem aviso (B3-5)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("rede caiu"));
    montar();
    fireEvent.change(screen.getByPlaceholderText("Ex.: Atlas Distribuidora"), { target: { value: "Atlas" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("radio", { name: "Criar novo" }));
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), { target: { value: "Bia" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar empresa" }));
    expect(await screen.findByText("Não foi possível criar a empresa. Tente novamente.")).toBeInTheDocument();
  });
});
