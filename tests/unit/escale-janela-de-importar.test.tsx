import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("sonner", () => ({ toast }));

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { JanelaDeImportarNegocios } from "@/components/escale/quadro/JanelaDeImportarNegocios";

const fetchMock = vi.fn();
const aoImportar = vi.fn();
const onFechar = vi.fn();

const ETAPAS = [
  { id: "e-1", name: "Entrada" },
  { id: "e-2", name: "Proposta" },
];

function abrir() {
  render(
    <JanelaDeImportarNegocios
      aberta
      onFechar={onFechar}
      pipelineId="p-1"
      nomeDaOrigem="Vendas"
      etapas={ETAPAS}
      tagsDoQuadro={["vip"]}
      aoImportar={aoImportar}
    />,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

function escolherArquivo(arquivo: File) {
  fireEvent.change(screen.getByLabelText("Arquivo .CSV"), { target: { files: [arquivo] } });
}

const csv = (texto: string, nome = "negocios.csv") => new File([texto], nome, { type: "text/csv" });

async function continuar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Continuar/ }));
}

beforeEach(() => {
  fetchMock.mockReset();
  aoImportar.mockReset();
  onFechar.mockReset();
  toast.error.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("a janela Importar negócios (Clint v2, 4 passos)", () => {
  it("passo 1: indicador com os 4 rótulos, Negócios ativa, modelo para baixar e Continuar desligado", () => {
    abrir();
    const passos = within(screen.getByRole("list", { name: "Passos da importação" })).getAllByRole(
      "listitem",
    );
    expect(passos.map((p) => p.textContent)).toEqual([
      "1Arquivo",
      "2Mapeamento",
      "3Configurações",
      "4Prévia e confirmação",
    ]);
    expect(passos[0]).toHaveAttribute("aria-current", "step");
    expect(passos[1]).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("tab", { name: "Negócios" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Contatos" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Contatos" })).toHaveAttribute(
      "title",
      "Importe contatos em Contatos",
    );
    expect(screen.getByRole("link", { name: /Baixar arquivo de exemplo \.CSV/ })).toHaveAttribute(
      "href",
      "/api/v1/leads/import",
    );
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
  });

  it("Cancelar fecha a janela", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onFechar).toHaveBeenCalled();
  });

  it("erros do arquivo: só .csv, no máximo 5 MB e no máximo 500 linhas", async () => {
    abrir();
    escolherArquivo(new File(["a"], "lista.txt", { type: "text/plain" }));
    expect(await screen.findByText("Apenas arquivos CSV são aceitos.")).toBeInTheDocument();
    escolherArquivo(
      new File([new Uint8Array(6 * 1024 * 1024)], "grande.csv", { type: "text/csv" }),
    );
    expect(
      await screen.findByText("O arquivo CSV excede o limite máximo de 5 MB."),
    ).toBeInTheDocument();
    const linhas = ["nome", ...Array.from({ length: 501 }, (_, i) => `Negócio ${i}`)].join("\n");
    escolherArquivo(csv(linhas));
    expect(
      await screen.findByText("A planilha passa de 500 linhas. Divida em arquivos menores."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeDisabled();
  });

  it("arquivo escolhido: a área mostra o nome e 'Pronto para mapear', e o Continuar liga", async () => {
    abrir();
    escolherArquivo(csv("nome\nAna", "exemplo-importacao.csv"));
    expect(await screen.findByText("Pronto para mapear")).toBeInTheDocument();
    expect(screen.getByText("exemplo-importacao.csv")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeEnabled();
  });

  it("o arquivo também pode ser solto na área", async () => {
    abrir();
    const area = screen.getByLabelText("Arquivo .CSV").closest("label")!;
    fireEvent.drop(area, { dataTransfer: { files: [csv("nome\nAna", "solto.csv")] } });
    expect(await screen.findByText("solto.csv")).toBeInTheDocument();
  });

  it("passo 2: o mapeamento já vem sugerido; sem nome o Continuar fica desligado com a dica; trocar a coluna liga", async () => {
    const user = abrir();
    escolherArquivo(csv("Celular,Email\n11988887777,a@x.com"));
    await screen.findByText("Pronto para mapear");
    await continuar(user);

    expect(screen.getByText("Mapeie os campos do seu arquivo")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Campo da coluna Celular" })).toHaveTextContent(
      "Telefone",
    );
    expect(screen.getByRole("combobox", { name: "Campo da coluna Email" })).toHaveTextContent(
      "Email",
    );
    const botao = screen.getByRole("button", { name: /Continuar/ });
    expect(botao).toBeDisabled();
    await user.hover(botao.parentElement!);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Para continuar você precisa associar pelo menos o nome do negócio ou do contato.",
    );
    expect(screen.getByRole("button", { name: /Adicionar campo/ })).toBeDisabled();

    await user.click(screen.getByRole("combobox", { name: "Campo da coluna Celular" }));
    await user.click(screen.getByRole("option", { name: "Nome do contato" }));
    expect(screen.getByRole("combobox", { name: "Campo da coluna Celular" })).toHaveTextContent(
      "Nome do contato",
    );
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeEnabled();
  });

  it("passo 2: o × volta a coluna para 'Não importar esse campo' e o campo usado fica indisponível nas outras", async () => {
    const user = abrir();
    escolherArquivo(csv("Cliente,Celular\nAna,11988887777"));
    await screen.findByText("Pronto para mapear");
    await continuar(user);
    await user.click(screen.getByRole("combobox", { name: "Campo da coluna Cliente" }));
    await user.click(screen.getByRole("option", { name: "Telefone" }));
    // "Telefone" já era da coluna Celular: fica desabilitado nas outras.
    expect(screen.getByRole("combobox", { name: "Campo da coluna Cliente" })).toHaveTextContent(
      "Não importar esse campo",
    );
    await user.click(screen.getByRole("button", { name: "Não importar esse campo: Celular" }));
    expect(screen.getByRole("combobox", { name: "Campo da coluna Celular" })).toHaveTextContent(
      "Não importar esse campo",
    );
  });

  it("passo 3: origem do quadro desligada, etapa já na primeira, Ganho e Perdido 'Em breve'", async () => {
    const user = abrir();
    escolherArquivo(csv("Contato,Celular\nAna,11988887777"));
    await screen.findByText("Pronto para mapear");
    await continuar(user);
    await continuar(user);

    expect(screen.getByText("Configurações da importação")).toBeInTheDocument();
    const origem = screen.getByRole("combobox", { name: "Origem de destino" });
    expect(origem).toBeDisabled();
    expect(origem).toHaveTextContent("Vendas");
    expect(origem).toHaveAttribute("title", "A importação entra nesta origem");
    expect(screen.getByRole("combobox", { name: "Etapa inicial padrão" })).toHaveTextContent(
      "Entrada",
    );
    expect(screen.getByRole("button", { name: /Aberto/ })).toHaveAttribute("aria-pressed", "true");
    for (const nome of [/Ganho/, /Perdido/]) {
      const b = screen.getByRole("button", { name: nome });
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", "Em breve");
    }
  });

  it("passo 3: as tags do quadro entram como chips e saem pelo ×", async () => {
    const user = abrir();
    escolherArquivo(csv("Contato,Celular\nAna,11988887777"));
    await screen.findByText("Pronto para mapear");
    await continuar(user);
    await continuar(user);
    await user.click(screen.getByRole("button", { name: /Adicionar tag/ }));
    await user.click(screen.getByRole("checkbox", { name: "vip" }));
    expect(screen.getByText("vip", { selector: "[data-tag-escolhida] span" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remover tag vip" }));
    expect(screen.queryByText("vip", { selector: "[data-tag-escolhida] span" })).toBeNull();
  });

  async function ateOPasso4(user: ReturnType<typeof userEvent.setup>) {
    escolherArquivo(csv("Contato,Celular\nAna,11988887777"));
    await screen.findByText("Pronto para mapear");
    await continuar(user);
    await continuar(user);
    await user.click(screen.getByRole("combobox", { name: "Etapa inicial padrão" }));
    await user.click(screen.getByRole("option", { name: "Proposta" }));
    await continuar(user);
  }

  it("passo 4 e importação: confirma, manda o CSV mapeado e mostra o resumo", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          total_linhas: 1,
          criados: 1,
          contatos_criados: 1,
          erros: [],
          colunas_ignoradas: [],
        },
      }),
    });
    const user = abrir();
    await ateOPasso4(user);

    expect(screen.getByText("Confira e confirme a importação")).toBeInTheDocument();
    const resumo = within(screen.getByTestId("resumo-da-importacao"));
    expect(resumo.getByText("negocios.csv")).toBeInTheDocument();
    expect(resumo.getByText("Negócios")).toBeInTheDocument();
    expect(resumo.getByText("2")).toBeInTheDocument();
    expect(resumo.getByText("Proposta")).toBeInTheDocument();
    expect(resumo.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("A importação conclui agora.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Confirmar e importar/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; body: FormData }];
    expect(url).toBe("/api/v1/leads/import");
    expect(init.method).toBe("POST");
    expect(init.body.get("pipeline_id")).toBe("p-1");
    expect(init.body.get("stage_id")).toBe("e-2");
    const texto = await (init.body.get("file") as File).text();
    expect(texto.startsWith("nome do contato,telefone")).toBe(true);

    expect(await screen.findByText("1 negócio criado")).toBeInTheDocument();
    expect(screen.getByText("1 contato criado")).toBeInTheDocument();
    expect(aoImportar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirmar e importar/ })).toBeNull();
  });

  it("depois de importar, as linhas recusadas aparecem com o motivo", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          total_linhas: 3,
          criados: 2,
          contatos_criados: 0,
          erros: [{ linha: 3, motivo: "Valor inválido." }],
          colunas_ignoradas: [],
        },
      }),
    });
    const user = abrir();
    await ateOPasso4(user);
    await user.click(screen.getByRole("button", { name: /Confirmar e importar/ }));
    expect(await screen.findByText("2 negócios criados")).toBeInTheDocument();
    expect(screen.getByText("0 contatos criados")).toBeInTheDocument();
    expect(screen.getByText("Linha 3: Valor inválido.")).toBeInTheDocument();
  });

  it("recusa da rota: toast de erro com a mensagem dela e a janela fica no passo 4", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "A planilha está vazia." } }),
    });
    const user = abrir();
    await ateOPasso4(user);
    await user.click(screen.getByRole("button", { name: /Confirmar e importar/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("A planilha está vazia."));
    expect(aoImportar).not.toHaveBeenCalled();
    expect(screen.getByText("Confira e confirme a importação")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirmar e importar/ })).toBeEnabled();
  });

  it("Voltar anda um passo", async () => {
    const user = abrir();
    escolherArquivo(csv("Contato\nAna"));
    await screen.findByText("Pronto para mapear");
    await continuar(user);
    await user.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByText("Escolha o arquivo .CSV para criar negócios")).toBeInTheDocument();
  });
});
