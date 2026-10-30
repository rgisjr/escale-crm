import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast };
});
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));

const mut = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
const acoes = {
  alternar: mut(), renomear: mut(), excluir: mut(), duplicar: mut(), favoritar: mut(),
  organizar: mut(), moverEmLote: mut(), excluirEmLote: mut(),
};
const pastasAcoes = { criar: mut(), editar: mut(), excluir: mut() };
const organizarAoCriar = vi.fn();
const estadoDaConsulta: { data: unknown; isLoading: boolean; isError: boolean; refetch: () => void } = {
  data: undefined, isLoading: false, isError: false, refetch: vi.fn(),
};
vi.mock("@/hooks/escale/useAutomacoesDaCasca", () => ({
  useListaDeAutomacoes: () => estadoDaConsulta,
  useAcoesDasAutomacoes: () => acoes,
  useAcoesDasPastas: () => pastasAcoes,
  useOrganizarAoCriar: () => organizarAoCriar,
}));
vi.mock("@/app/app/webhooks/_components/RuleEditor", () => ({
  RuleEditor: (p: { open: boolean; rule: { id: string } | null; nomeInicial?: string; daCasca?: boolean; aoCriar?: (r: { id: string }) => void }) =>
    p.open ? (
      <div data-testid="editor">
        {JSON.stringify({ rule: p.rule?.id ?? null, nome: p.nomeInicial ?? null, daCasca: p.daCasca === true })}
        <button type="button" onClick={() => p.aoCriar?.({ id: "r9" })}>
          criou
        </button>
      </div>
    ) : null,
}));

import { AutomacoesDaCasca } from "@/components/escale/automacoes/lista/AutomacoesDaCasca";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api/client";
import type { AutomacaoDaLista, ListaDeAutomacoes } from "@/lib/escale/automacoes/tipos";
import { toast } from "sonner";

function auto(i: number, over: Partial<AutomacaoDaLista> = {}): AutomacaoDaLista {
  return {
    id: `r${i}`, nome: `Auto ${String(i).padStart(2, "0")}`, ativa: true,
    atualizadaEm: `2026-10-${String(i).padStart(2, "0")}T13:24:17Z`,
    pastaId: null, forma: null, favorita: false, agentes: [], ...over,
  };
}
const LISTA: ListaDeAutomacoes = {
  automacoes: Array.from({ length: 12 }, (_, i) => auto(i + 1)),
  pastas: [{ id: "p1", nome: "Vendas", cor: "red", icone: "flag" }],
  agentes: [{ id: "g1", nome: "Ana Souza" }, { id: "g2", nome: "Beto" }],
};

function montar(lista: ListaDeAutomacoes = LISTA, editorAberto: string | null = null) {
  estadoDaConsulta.data = lista;
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Envolto = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
  render(<AutomacoesDaCasca fuso="America/Sao_Paulo" editorAberto={editorAberto} />, { wrapper: Envolto });
}

const nomesDasLinhas = () =>
  screen.getAllByRole("row").slice(1).map((r) => within(r).queryByRole("link")?.textContent ?? "");

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  estadoDaConsulta.isLoading = false;
  estadoDaConsulta.isError = false;
});

describe("estados", () => {
  it("carregando mostra 10 linhas-esqueleto", () => {
    estadoDaConsulta.isLoading = true;
    montar({ automacoes: [], pastas: [], agentes: [] });
    expect(document.querySelectorAll("tr[data-esqueleto]")).toHaveLength(10);
  });

  it("erro mostra os dois textos da Clint e 'Tentar de novo' recarrega", async () => {
    estadoDaConsulta.isError = true;
    montar();
    expect(screen.getByText("Não foi possível carregar as automações")).toBeTruthy();
    expect(screen.getByText("Tente recarregar a página.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(estadoDaConsulta.refetch).toHaveBeenCalled();
  });

  it("sem nenhuma automação mostra o vazio com '+ Nova automação'", () => {
    montar({ automacoes: [], pastas: [], agentes: [] });
    expect(screen.getByText("Nenhuma automação criada")).toBeTruthy();
    expect(screen.getByText("Crie automações para executar ações automaticamente no seu funil.")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Nova automação/ }).length).toBe(2);
  });

  it("Favoritos sem favorita mostra o mesmo vazio", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: /Favoritos/ }));
    expect(screen.getByText("Nenhuma automação criada")).toBeTruthy();
  });
});

describe("tabela", () => {
  it("12 automações: 10 na página 1, '12 itens' e a última alteração primeiro", () => {
    montar();
    const nomes = nomesDasLinhas();
    expect(nomes).toHaveLength(10);
    expect(nomes[0]).toBe("Auto 12");
    expect(screen.getByText("12 itens")).toBeTruthy();
  });

  it("clicar em NOME ordena A-Z e depois Z-A, com aria-sort", async () => {
    montar();
    const cab = screen.getByRole("columnheader", { name: /Nome/ });
    await userEvent.click(within(cab).getByRole("button"));
    expect(nomesDasLinhas()[0]).toBe("Auto 01");
    expect(cab.getAttribute("aria-sort")).toBe("ascending");
    await userEvent.click(within(cab).getByRole("button"));
    expect(nomesDasLinhas()[0]).toBe("Auto 12");
    expect(cab.getAttribute("aria-sort")).toBe("descending");
  });

  it("a data sai dd/mm/aaaa HH:mm:ss no fuso", () => {
    montar();
    expect(screen.getByText("12/10/2026 10:24:17")).toBeTruthy();
  });

  it("busca sem resultado: vazio e '0 itens', só depois dos 750 ms", async () => {
    montar();
    await userEvent.type(screen.getByRole("textbox", { name: "Buscar" }), "zzqx");
    expect(screen.getByText("12 itens")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("0 itens")).toBeTruthy(), { timeout: 3000 });
    expect(screen.getByText("Nenhuma automação criada")).toBeTruthy();
  });

  it("Status Pausada deixa só as pausadas", async () => {
    montar({ ...LISTA, automacoes: [auto(1), auto(2, { ativa: false })] });
    const barra = screen.getByRole("textbox", { name: "Buscar" }).closest("div") as HTMLElement;
    await userEvent.click(within(barra).getByRole("button", { name: /Status/ }));
    await userEvent.click(await screen.findByRole("checkbox", { name: "Pausada" }));
    expect(nomesDasLinhas()).toEqual(["Auto 02"]);
  });

  it("o vazio só por filtro tem 'Limpar filtro', que limpa", async () => {
    montar({ ...LISTA, automacoes: [auto(1), auto(2)] });
    const barra = screen.getByRole("textbox", { name: "Buscar" }).closest("div") as HTMLElement;
    await userEvent.click(within(barra).getByRole("button", { name: /Status/ }));
    await userEvent.click(await screen.findByRole("checkbox", { name: "Pausada" }));
    expect(screen.getByText("Nenhuma automação corresponde a este filtro")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtro" }));
    expect(nomesDasLinhas()).toHaveLength(2);
  });

  it("filtro Agente: busca no painel e 'Sem agente'; a coluna mostra o nome, '+1' e '—'", async () => {
    montar({
      ...LISTA,
      automacoes: [auto(1, { agentes: ["g1", "g2"] }), auto(2), auto(3, { agentes: ["g2"] })],
    });
    expect(screen.getByText("Ana Souza")).toBeTruthy();
    expect(screen.getByText("+1")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Agente/ }));
    await userEvent.type(await screen.findByRole("textbox", { name: "Buscar agente" }), "bet");
    expect(screen.queryByRole("checkbox", { name: "Ana Souza" })).toBeNull();
    await userEvent.clear(screen.getByRole("textbox", { name: "Buscar agente" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Sem agente" }));
    expect(nomesDasLinhas()).toEqual(["Auto 02"]);
  });

  it("interruptor e estrela chamam as ações", async () => {
    montar({ ...LISTA, automacoes: [auto(1)] });
    await userEvent.click(screen.getByRole("switch", { name: "Pausar Auto 01" }));
    expect(acoes.alternar.mutate).toHaveBeenCalledWith({ id: "r1", ativa: false });
    await userEvent.click(screen.getByRole("button", { name: "Adicionar aos favoritos" }));
    expect(acoes.favoritar.mutate).toHaveBeenCalledWith({ id: "r1", favorita: true });
  });
});

describe("abrir", () => {
  it("forma null é link para o fluxo", () => {
    montar({ ...LISTA, automacoes: [auto(1)] });
    expect(screen.getByRole("link", { name: "Auto 01" }).getAttribute("href")).toBe("/app/webhooks/automacoes/r1");
  });

  it("forma editor abre o editor com a regra lida na hora", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: "r1", name: "Auto 01" } });
    montar({ ...LISTA, automacoes: [auto(1, { forma: "editor" })] });
    await userEvent.click(screen.getByRole("link", { name: "Auto 01" }));
    expect(await screen.findByTestId("editor")).toBeTruthy();
    expect(screen.getByTestId("editor").textContent).toContain('"rule":"r1"');
    expect(screen.getByTestId("editor").textContent).toContain('"daCasca":true');
  });
});

describe("menu ⋮", () => {
  async function abrirMenu() {
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    return screen.findAllByRole("menuitem");
  }

  it("tem os itens na ordem, com ✓ na pasta atual", async () => {
    montar({ ...LISTA, automacoes: [auto(1, { pastaId: "p1" })] });
    const itens = await abrirMenu();
    expect(itens.map((i) => i.textContent)).toEqual([
      "Abrir no fluxo", "Editar no editor", "Renomear", "Duplicar automação", "Sem pasta", "Vendas", "Excluir",
    ]);
    expect(itens[5]?.querySelector("svg.lucide-check")).toBeTruthy();
  });

  it("mover chama organizar", async () => {
    montar({ ...LISTA, automacoes: [auto(1)] });
    await abrirMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Vendas" }));
    expect(acoes.organizar.mutate).toHaveBeenCalledWith({ id: "r1", pasta_id: "p1" }, expect.anything());
  });

  it("duplicar mostra o primeiro toast", async () => {
    montar({ ...LISTA, automacoes: [auto(1)] });
    await abrirMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Duplicar automação" }));
    expect(toast).toHaveBeenCalledWith("A automação está sendo duplicada, aguarde a finalização.");
    expect(acoes.duplicar.mutate).toHaveBeenCalledWith("r1", expect.anything());
  });

  it("excluir confirma e chama excluir", async () => {
    montar({ ...LISTA, automacoes: [auto(1)] });
    await abrirMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(await screen.findByText("Você deseja excluir esta automação?")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(acoes.excluir.mutate).toHaveBeenCalledWith("r1", expect.anything());
  });
});

describe("lote", () => {
  it("marcar duas mostra a barra; a caixa do cabeçalho fica indeterminada; mover e excluir", async () => {
    acoes.moverEmLote.mutate.mockImplementation((_p: unknown, o: { onSuccess: (r: unknown) => void }) =>
      o.onSuccess({ movidas: ["r12", "r11"], falhas: [] }),
    );
    acoes.excluirEmLote.mutate.mockImplementation((_p: unknown, o: { onSuccess: (r: unknown) => void }) =>
      o.onSuccess({ excluidas: ["r12"], falhas: ["r11"] }),
    );
    montar();
    const caixas = screen.getAllByRole("checkbox", { name: "Selecionar automação" });
    await userEvent.click(caixas[0] as HTMLElement);
    await userEvent.click(caixas[1] as HTMLElement);
    expect(screen.getByText("selecionados")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Selecionar todas as automações da página" }).getAttribute("aria-checked")).toBe("mixed");

    await userEvent.click(screen.getByRole("button", { name: /Mover para pasta/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Vendas" }));
    expect(acoes.moverEmLote.mutate).toHaveBeenCalledWith({ ids: ["r12", "r11"], pasta_id: "p1" }, expect.anything());
    expect(toast.success).toHaveBeenCalledWith("2 automações movidas");
    expect(screen.queryByText("selecionados")).toBeNull();

    const outras = screen.getAllByRole("checkbox", { name: "Selecionar automação" });
    await userEvent.click(outras[0] as HTMLElement);
    await userEvent.click(outras[1] as HTMLElement);
    await userEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));
    expect(await screen.findByText("Tem certeza que deseja excluir 2 automações? Esta ação não pode ser desfeita.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(toast.success).toHaveBeenCalledWith("1 automação excluída");
    expect(toast.error).toHaveBeenCalledWith("1 automação não pôde ser excluída");
  });

  it("o × limpa a seleção e marcar a página marca as 10", async () => {
    montar();
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar todas as automações da página" }));
    expect(screen.getByText("10")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Remover selecionados" }));
    expect(screen.queryByText("selecionados")).toBeNull();
  });
});

describe("lembrar", () => {
  it("a ordem volta do localStorage; localStorage que lança não quebra a tela", async () => {
    window.localStorage.setItem(
      "escale:automacoes:lista",
      JSON.stringify({ visao: { tipo: "todas" }, ordem: { coluna: "nome", direcao: "asc" }, porPagina: 25 }),
    );
    montar();
    await waitFor(() => expect(nomesDasLinhas()[0]).toBe("Auto 01"));
  });

  it("não quebra com armazenamento que lança", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    montar();
    expect(nomesDasLinhas()).toHaveLength(10);
    spy.mockRestore();
  });

  it("a visão de pasta que não existe mais volta a Todas", async () => {
    window.localStorage.setItem(
      "escale:automacoes:lista",
      JSON.stringify({ visao: { tipo: "pasta", id: "morta" }, ordem: { coluna: "atualizada", direcao: "desc" }, porPagina: 10 }),
    );
    montar();
    await waitFor(() => expect(nomesDasLinhas()).toHaveLength(10));
  });
});
