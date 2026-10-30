import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const acoes = {
  criar: { mutate: vi.fn(), isPending: false },
  editar: { mutate: vi.fn(), isPending: false },
  excluir: { mutate: vi.fn(), isPending: false },
};
vi.mock("@/hooks/escale/useAutomacoesDaCasca", () => ({ useAcoesDasPastas: () => acoes }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { TrilhoDePastas } from "@/components/escale/automacoes/lista/TrilhoDePastas";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ContagensDoTrilho } from "@/lib/escale/automacoes/regras";
import type { PastaDeAutomacao, Visao } from "@/lib/escale/automacoes/tipos";
import { toast } from "sonner";

const PASTA: PastaDeAutomacao = { id: "p1", nome: "Vendas", cor: "red", icone: "flag" };
const CONTAGENS: ContagensDoTrilho = { todas: 5, favoritos: 2, porPasta: { p1: 3 }, semPasta: 2 };

function montar(p: { pastas?: PastaDeAutomacao[]; contagens?: ContagensDoTrilho; visao?: Visao; carregando?: boolean } = {}) {
  const aoMudarVisao = vi.fn();
  const qc = new QueryClient();
  const Envolto = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
  render(
    <TrilhoDePastas
      pastas={p.pastas ?? [PASTA]}
      contagens={p.contagens ?? CONTAGENS}
      visao={p.visao ?? { tipo: "todas" }}
      carregando={p.carregando ?? false}
      aoMudarVisao={aoMudarVisao}
    />,
    { wrapper: Envolto },
  );
  return aoMudarVisao;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TrilhoDePastas", () => {
  it("mostra Todas e Favoritos com os contadores e o rótulo PASTAS", () => {
    montar();
    expect(screen.getByRole("button", { name: /Todas/ }).textContent).toContain("Todas");
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getAllByText("2")).toHaveLength(2);
    expect(screen.getByText("Pastas")).toBeTruthy();
  });

  it("carregando mostra o esqueleto e nenhuma pasta", () => {
    montar({ carregando: true });
    expect(screen.getByTestId("trilho-esqueleto")).toBeTruthy();
    expect(screen.queryByText("Vendas")).toBeNull();
  });

  it("sem pastas: 'Nenhuma pasta criada' e sem 'Sem pasta'", () => {
    montar({ pastas: [] });
    expect(screen.getByText("Nenhuma pasta criada")).toBeTruthy();
    expect(screen.queryByText("Sem pasta")).toBeNull();
  });

  it("com pasta e automação sem pasta mostra 'Sem pasta'", () => {
    montar();
    expect(screen.getByText("Sem pasta")).toBeTruthy();
  });

  it("clicar numa pasta muda a visão; o ativo leva aria-current", async () => {
    const aoMudar = montar({ visao: { tipo: "pasta", id: "p1" } });
    expect(screen.getByRole("button", { name: /Vendas/ }).getAttribute("aria-current")).toBe("page");
    await userEvent.click(screen.getByRole("button", { name: /Todas/ }));
    expect(aoMudar).toHaveBeenCalledWith({ tipo: "todas" });
  });

  it("'Sem pasta' ativa sem ter o que mostrar volta para Todas", async () => {
    const aoMudar = montar({ visao: { tipo: "sem_pasta" }, contagens: { ...CONTAGENS, semPasta: 0 } });
    await waitFor(() => expect(aoMudar).toHaveBeenCalledWith({ tipo: "todas" }));
  });

  it("Nova pasta abre o editor com 8 cores e 8 ícones; cinza e pasta marcados", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Nova pasta" }));
    expect(document.activeElement).toBe(screen.getByPlaceholderText("Nome da pasta"));
    expect(screen.getByRole("button", { name: "Cinza" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Pasta" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getAllByRole("button", { pressed: false }).length).toBe(14);
  });

  it("Enter com nome vazio não salva; com nome salva com os padrões", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Nova pasta" }));
    await userEvent.keyboard("{Enter}");
    expect(acoes.criar.mutate).not.toHaveBeenCalled();
    await userEvent.type(screen.getByPlaceholderText("Nome da pasta"), "Pós venda{Enter}");
    expect(acoes.criar.mutate).toHaveBeenCalledWith({ nome: "Pós venda", cor: "gray", icone: "folder" }, expect.anything());
  });

  it("escolhe cor vermelha e ícone bandeira e salva", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Nova pasta" }));
    await userEvent.type(screen.getByPlaceholderText("Nome da pasta"), "X");
    await userEvent.click(screen.getByRole("button", { name: "Vermelho" }));
    await userEvent.click(screen.getByRole("button", { name: "Bandeira" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(acoes.criar.mutate).toHaveBeenCalledWith({ nome: "X", cor: "red", icone: "flag" }, expect.anything());
  });

  it("Esc fecha o editor e volta o link", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Nova pasta" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Nova pasta" })).toBeTruthy();
  });

  it("o ⋮ abre Renomear (editor com os valores) e salva só o que mudou", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Opções da pasta" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Renomear" }));
    const campo = screen.getByPlaceholderText("Nome da pasta") as HTMLInputElement;
    expect(campo.value).toBe("Vendas");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Pós{Enter}");
    expect(acoes.editar.mutate).toHaveBeenCalledWith({ id: "p1", nome: "Pós" }, expect.anything());
  });

  it("Excluir confirma com o texto da Clint e, sendo a pasta ativa, volta para Todas", async () => {
    acoes.excluir.mutate.mockImplementation((_id: string, o: { onSuccess: () => void }) => o.onSuccess());
    const aoMudar = montar({ visao: { tipo: "pasta", id: "p1" } });
    await userEvent.click(screen.getByRole("button", { name: "Opções da pasta" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Excluir" }));
    expect(await screen.findByText("Excluir esta pasta? As automações dentro dela ficarão sem pasta.")).toBeTruthy();
    const botoes = screen.getAllByRole("button", { name: "Excluir" });
    await userEvent.click(botoes[botoes.length - 1] as HTMLElement);
    expect(acoes.excluir.mutate).toHaveBeenCalledWith("p1", expect.anything());
    expect(aoMudar).toHaveBeenCalledWith({ tipo: "todas" });
    expect(toast.success).toHaveBeenCalledWith("Pasta excluída");
  });
});
