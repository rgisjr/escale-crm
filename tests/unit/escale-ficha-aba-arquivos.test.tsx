import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const permissao = vi.hoisted(() => ({ pode: true }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u1" }),
  useActiveOrg: () => ({ orgId: "org1", role: "agent" }),
  usePermission: () => permissao.pode,
}));
const arquivos = vi.hoisted(() => ({
  lista: [
    {
      id: "a1",
      contact_id: "c1",
      lead_id: "n1",
      user_id: "u1",
      user_nome: "Ana",
      nome: "contrato.pdf",
      extensao: "pdf",
      mime: "application/pdf",
      tamanho: 1536,
      created_at: "2026-10-17T13:05:09Z",
    },
    {
      id: "a2",
      contact_id: "c1",
      lead_id: null,
      user_id: "u2",
      user_nome: "Bia",
      nome: "foto.png",
      extensao: "png",
      mime: "image/png",
      tamanho: 10,
      created_at: "2026-10-10T10:00:00Z",
    },
  ],
  enviar: vi.fn(
    async (): Promise<{
      enviados: number;
      falhas: { nome: string; mensagem: string | null }[];
    }> => ({ enviados: 1, falhas: [] }),
  ),
  excluir: vi.fn(async () => undefined),
}));
vi.mock("@/hooks/escale/useArquivosDoContato", () => ({
  useArquivosDoContato: () => ({ data: arquivos.lista, isLoading: false, isError: false }),
  useEnviarArquivos: () => ({ mutateAsync: arquivos.enviar, isPending: false }),
  useExcluirArquivo: () => ({ mutateAsync: arquivos.excluir, isPending: false }),
}));

import { AbaArquivos } from "@/components/escale/negocio/abas/AbaArquivos";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1H (C17): a aba Arquivos da Clint (print 06). */
const LEAD = { id: "n1", contact_id: "c1" } as unknown as Lead;
beforeEach(() => {
  vi.clearAllMocks();
  permissao.pode = true;
});

describe("a tabela", () => {
  it("lista nome, tamanho, data e usuário; data desc por padrão; clicar no cabeçalho reordena", async () => {
    render(<AbaArquivos lead={LEAD} />);
    const linhas = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((r) => within(r).getAllByRole("cell")[0]?.textContent);
    expect(linhas()[0]).toContain("contrato.pdf");
    expect(linhas()[0]).toContain("1,5 KB");
    expect(screen.getByText(/17\/10\/2026 \d{2}:05:09/)).toBeInTheDocument();
    expect(screen.getByTitle("Bia")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Arquivo" }));
    expect(linhas()[0]).toContain("contrato.pdf");
    await userEvent.click(screen.getByRole("button", { name: "Arquivo" }));
    expect(linhas()[0]).toContain("foto.png");
  });

  it("busca e filtro por extensão; 'Limpar filtros' aparece e limpa", async () => {
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Pesquisar..." }), "foto");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getAllByRole("row")).toHaveLength(3);
    await userEvent.click(screen.getByRole("combobox", { name: "Tipo de arquivo" }));
    await userEvent.click(await screen.findByRole("checkbox", { name: "PDF" }));
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("o ⋯ da linha: Baixar abre a rota de download; Excluir pede confirmação e chama o excluir", async () => {
    const abrir = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Mais opções" })[0]!);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Baixar arquivo" }));
    expect(abrir).toHaveBeenCalledWith(
      "/api/v1/contacts/c1/arquivos/a1",
      "_blank",
      "noopener,noreferrer",
    );
    await userEvent.click(screen.getAllByRole("button", { name: "Mais opções" })[0]!);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Excluir" }));
    expect(
      await screen.findByText("Tem certeza que deseja apagar este arquivo?"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(arquivos.excluir).toHaveBeenCalledWith("a1");
  });

  it("clicar na linha abre o arquivo; o clique no ⋯ não abre", async () => {
    const abrir = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.click(screen.getByText("contrato.pdf"));
    expect(abrir).toHaveBeenCalledWith(
      "/api/v1/contacts/c1/arquivos/a1",
      "_blank",
      "noopener,noreferrer",
    );
    abrir.mockClear();
    await userEvent.click(screen.getAllByRole("button", { name: "Mais opções" })[0]!);
    expect(abrir).not.toHaveBeenCalled();
  });

  it("o arquivo de outra pessoa não tem Excluir para agent", async () => {
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Mais opções" })[1]!);
    expect(await screen.findByRole("menuitem", { name: "Baixar arquivo" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Excluir" })).toBeNull();
  });
});

describe("Novo arquivo", () => {
  it("se um envio falha: toast com o nome e o motivo traduzido, e o modal fica aberto só com o que falhou", async () => {
    const { toast } = await import("sonner");
    arquivos.enviar.mockResolvedValueOnce({
      enviados: 1,
      falhas: [{ nome: "contrato.pdf", mensagem: null }],
    });
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.click(screen.getByRole("button", { name: "Novo arquivo" }));
    const janela = await screen.findByRole("dialog", { name: "Novo documento" });
    await userEvent.upload(within(janela).getByLabelText("Adicionar"), [
      new File(["x"], "contrato.pdf", { type: "application/pdf" }),
      new File(["y"], "foto.png", { type: "image/png" }),
    ]);
    await userEvent.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(toast.success).toHaveBeenCalledWith("Arquivo(s) enviado(s) com sucesso");
    expect(toast.error).toHaveBeenCalledWith("contrato.pdf: Erro ao enviar arquivo(s)");
    expect(screen.getByRole("dialog", { name: "Novo documento" })).toBeInTheDocument();
    expect(within(janela).getByText("contrato.pdf")).toBeInTheDocument();
    expect(within(janela).queryByText("foto.png")).toBeNull();
  });

  it("sem permissão (quem só lê): 'Novo arquivo' desligado com 'Sem permissão'", () => {
    permissao.pode = false;
    render(<AbaArquivos lead={LEAD} />);
    for (const b of screen.getAllByRole("button", { name: "Novo arquivo" })) {
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", "Sem permissão");
    }
  });

  it("abre 'Novo documento'; adicionar lista o arquivo; Salvar envia e mostra o toast da Clint", async () => {
    const { toast } = await import("sonner");
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.click(screen.getByRole("button", { name: "Novo arquivo" }));
    const janela = await screen.findByRole("dialog", { name: "Novo documento" });
    expect(within(janela).getByText("Nenhum documento adicionado")).toBeInTheDocument();
    const input = within(janela).getByLabelText("Adicionar") as HTMLInputElement;
    expect(input).toHaveAttribute("accept", expect.stringContaining(".pdf"));
    await userEvent.upload(input, new File(["x"], "proposta.pdf", { type: "application/pdf" }));
    expect(within(janela).getByText("proposta.pdf")).toBeInTheDocument();
    await userEvent.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(arquivos.enviar).toHaveBeenCalledWith([
      expect.objectContaining({ name: "proposta.pdf" }),
    ]);
    expect(toast.success).toHaveBeenCalledWith("Arquivo(s) enviado(s) com sucesso");
  });

  it("arquivo fora da lista ou acima do teto nem entra na lista, com o aviso", async () => {
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.click(screen.getByRole("button", { name: "Novo arquivo" }));
    const janela = await screen.findByRole("dialog", { name: "Novo documento" });
    // O seletor filtraria pelo `accept`; a validação da tela é o que se prova aqui.
    await userEvent
      .setup({ applyAccept: false })
      .upload(within(janela).getByLabelText("Adicionar"), new File(["x"], "virus.exe"));
    expect(within(janela).getByText("Nenhum documento adicionado")).toBeInTheDocument();
    expect(
      within(janela).getByText("virus.exe: Tipo de arquivo não suportado."),
    ).toBeInTheDocument();
  });

  it("negócio sem contato: o vazio com 'Novo arquivo' desligado", () => {
    render(<AbaArquivos lead={{ id: "n1", contact_id: null } as unknown as Lead} />);
    for (const b of screen.getAllByRole("button", { name: "Novo arquivo" })) {
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", "Este negócio não tem contato.");
    }
  });
});
