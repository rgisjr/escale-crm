import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcoesEmMassa } from "@/components/escale/contatos/massa/AcoesEmMassa";
import { apiClient } from "@/lib/api/client";
import type { AlvoDaAcao } from "@/lib/escale/contatos/selecao";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["vip"], isLoading: false }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [] }),
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({ useCorDaEtiqueta: () => null }));

const ALVO: AlvoDaAcao = { tipo: "filtro", v: "todos", quantidade: null, excluidos: [] };
const CAMPOS = [
  { chave: "cargo", rotulo: "Cargo", tipo: "text" as const },
  { chave: "porte", rotulo: "Porte", tipo: "select" as const, opcoes: [{ value: "g", label: "Grande" }] },
  { chave: "nascimento", rotulo: "Data de nascimento", tipo: "date" as const },
  { chave: "link_site", rotulo: "Site", tipo: "url" as const },
];
const ORIGENS = [{ id: "o1", nome: "Leads INSS", etapas: [{ id: "e1", nome: "Entrada" }] }];

function montar() {
  const aoLimpar = vi.fn();
  const aoPedir = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AcoesEmMassa
        quantidade={3}
        alvo={ALVO}
        origens={ORIGENS}
        camposDoContato={CAMPOS}
        aoLimpar={aoLimpar}
        aoPedir={aoPedir}
      />
    </QueryClientProvider>,
  );
  return { aoLimpar, aoPedir };
}

const pedidoEnviado = () => vi.mocked(apiClient.post).mock.lastCall;

beforeEach(() => {
  vi.mocked(toast.success).mockReset();
  vi.mocked(apiClient.post)
    .mockReset()
    .mockResolvedValue({ data: { id: "a1", total: 3, status: "na_fila" } } as never);
});

describe("AcoesEmMassa (prints 2b-29 a 2b-39)", () => {
  it("a barra: número, SELECIONADOS, as ações e 'Campos' ligado (2C)", () => {
    montar();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("selecionados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Campos" })).not.toBeDisabled();
  });

  it("Campos › só os campos do catálogo; escolher, digitar e Aplicar manda alterar_campo (2b-32, 2b-33)", async () => {
    const { aoPedir } = montar();
    fireEvent.click(screen.getByRole("button", { name: "Campos" }));
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: "Campo" }));
    expect(screen.queryByRole("option", { name: "Data de nascimento" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Site" })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: "Cargo" }));
    fireEvent.change(screen.getByPlaceholderText("Digite o valor"), { target: { value: "CEO" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    await waitFor(() =>
      expect(pedidoEnviado()?.[1]).toMatchObject({
        acao: "alterar_campo",
        parametros: { chave: "cargo", valor: "CEO" },
      }),
    );
    expect(aoPedir).toHaveBeenCalledWith("a1", "alterar_campo");
  });

  it("Campos › Limpar campo manda limpar_campo sem valor; campo de seleção oferece as opções", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Campos" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Campo" }));
    fireEvent.click(screen.getByRole("option", { name: "Porte" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Valor" }));
    expect(screen.getByRole("option", { name: "Grande" })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    fireEvent.click(screen.getByRole("radio", { name: "Limpar campo" }));
    expect(screen.queryByRole("combobox", { name: "Valor" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    await waitFor(() =>
      expect(pedidoEnviado()?.[1]).toMatchObject({ acao: "limpar_campo", parametros: { chave: "porte" } }),
    );
  });

  it("Exportar: confirma, pede, limpa a seleção, acompanha e avisa que foi para aprovação (Q4)", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: "a1", total: 3, status: "aguardando_aprovacao" },
    } as never);
    const { aoLimpar, aoPedir } = montar();
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(screen.getByText("Tem certeza que deseja exportar 3 contatos?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(aoPedir).toHaveBeenCalledWith("a1", "exportar"));
    expect(pedidoEnviado()).toEqual([
      "/api/v1/acoes-em-massa",
      { lista: "contatos", acao: "exportar", alvo: ALVO, parametros: {} },
    ]);
    expect(aoLimpar).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(
      "A exportação foi enviada para aprovação de um administrador.",
    );
  });

  it("Exportar do único admin: o aviso da Clint de que a exportação começou", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "A exportação iniciou com sucesso, aguarde enquanto o arquivo é gerado.",
      ),
    );
  });

  it("Excluir: a frase dos negócios da Clint, e só liga depois de digitar 'Excluir' (Q5)", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));
    expect(
      screen.getByText("Os negócios associados aos contatos serão excluídos"),
    ).toBeInTheDocument();
    const apagar = screen.getByRole("button", { name: "Apagar Contatos" });
    expect(apagar).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Digite aqui..."), {
      target: { value: "Excluir" },
    });
    expect(apagar).not.toBeDisabled();
    fireEvent.click(apagar);
    await waitFor(() =>
      expect(pedidoEnviado()?.[1]).toMatchObject({ acao: "excluir", parametros: {} }),
    );
  });

  it("Criar negócio: origem, etapa e 'Adicionar negócio'", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Criar negócio" }));
    expect(screen.getByDisplayValue("3 Contatos selecionados")).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: "Origem" }));
    fireEvent.click(screen.getByRole("option", { name: "Leads INSS" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Etapa" }));
    fireEvent.click(screen.getByRole("option", { name: "Entrada" }));
    fireEvent.change(screen.getByPlaceholderText("Clique aqui para adicionar"), {
      target: { value: "1.500,00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar negócio" }));
    await waitFor(() =>
      expect(pedidoEnviado()?.[1]).toMatchObject({
        acao: "criar_negocios",
        parametros: {
          pipeline_id: "o1",
          stage_id: "e1",
          owner_user_id: null,
          valor_centavos: 150000,
        },
      }),
    );
  });

  it("Tag › Incluir: 'Alterar tag', '← Incluir Tag' e escolher a tag já aplica (prints 2b-34 a 2b-36)", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Tag" }));
    expect(screen.getByText("Alterar tag")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Incluir" }));
    expect(screen.getByRole("button", { name: "Incluir Tag" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Adicione uma tag")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "vip" }));
    await waitFor(() =>
      expect(pedidoEnviado()?.[1]).toMatchObject({
        acao: "incluir_tag",
        parametros: { tag: "vip" },
      }),
    );
  });

  it("Tag › Remover: escolher a tag pede a confirmação da Clint", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.getByPlaceholderText("Selecione a tag para remover")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "vip" }));
    expect(
      screen.getByText("Tem certeza que deseja remover a tag selecionada?"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(pedidoEnviado()?.[1]).toMatchObject({
        acao: "remover_tag",
        parametros: { tag: "vip" },
      }),
    );
  });
});
