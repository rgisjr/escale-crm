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
  it("a barra: número, SELECIONADOS, as ações e 'Campos' em breve", () => {
    montar();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("selecionados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Campos" })).toHaveAttribute("title", "Em breve");
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
