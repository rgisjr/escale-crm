import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
const useExecucoes = vi.fn();
const exportar = vi.fn();

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/hooks/webhooks/useAutomationRules", () => ({
  useResendAutomationRun: () => ({ mutate, isPending: false }),
}));
vi.mock("@/hooks/escale/useInsightsDaAutomacao", async (importar) => ({
  ...(await importar<typeof import("@/hooks/escale/useInsightsDaAutomacao")>()),
  useExecucoesDaAutomacao: (...args: unknown[]) => useExecucoes(...args),
  exportarExecucoesEmCsv: (...args: unknown[]) => exportar(...args),
}));
vi.mock("@/app/app/webhooks/_components/ActivityTab", () => ({
  explicacaoDe: (r: { error?: string }) => (r.error === "http_500" ? "O sistema de destino devolveu erro." : null),
}));
vi.mock("@/components/escale/contatos/FotoDaLinha", () => ({ FotoDaLinha: () => <span data-testid="foto" /> }));

import { toast } from "sonner";

import { JanelaDeExecucoes } from "@/components/escale/automacoes/fluxo/insights/JanelaDeExecucoes";
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import { ApiError } from "@/lib/api/types";
import type { FiltroDasExecucoes, LinhaDaExecucao } from "@/lib/escale/automacoes/insights/tipos";

const REGRA = {
  id: "r1",
  name: "Boas-vindas",
  actions: [{ type: "send_whatsapp_message" }, { type: "call_webhook" }],
} as unknown as AutomationRuleRow;

const LINHA: LinhaDaExecucao = {
  id: "x1",
  status: "failed",
  criadaEm: "2026-09-10T15:40:00Z",
  eventoId: "ev1",
  resultados: [
    { type: "send_whatsapp_message", status: "success" },
    { type: "call_webhook", status: "failed", error: "http_500" },
  ],
  contato: { id: "k1", nome: "Elza Maria", telefone: "+5553984555965", email: "elza@x.com", temFoto: false },
  negocio: { id: "n1", titulo: "Negócio" },
};

const PAINEL: FiltroDasExecucoes = { origem: "painel", situacoes: ["success"] };

function dados(linhas: LinhaDaExecucao[], total = linhas.length) {
  useExecucoes.mockReturnValue({ data: { total, linhas }, isPending: false, isError: false, refetch: vi.fn() });
}

function montar(filtro: FiltroDasExecucoes = PAINEL) {
  render(<JanelaDeExecucoes regra={REGRA} fuso="America/Sao_Paulo" periodo="30d" filtroInicial={filtro} aoFechar={vi.fn()} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  dados([LINHA]);
});

describe("JanelaDeExecucoes", () => {
  it("título, busca, Eventos com contador, Exportar CSV e o total", () => {
    dados([LINHA], 12);
    montar();
    expect(screen.getByText("Listagem de execuções")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Buscar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Eventos/ }).textContent).toContain("1");
    expect(screen.getByRole("button", { name: "Exportar CSV" })).toBeTruthy();
    expect(screen.getByText("12 execuções")).toBeTruthy();
  });

  it("singular: '1 execução'", () => {
    montar();
    expect(screen.getByText("1 execução")).toBeTruthy();
  });

  it("o cartão: nome, telefone, e-mail, data, selo, Ver negócio e a segunda linha do passo", () => {
    montar();
    expect(screen.getByText("Elza Maria")).toBeTruthy();
    expect(screen.getByText("(53) 98455-5965")).toBeTruthy();
    expect(screen.getByText("elza@x.com")).toBeTruthy();
    expect(screen.getByText("10/09/2026 12:40")).toBeTruthy();
    expect(screen.getByText("Falhou")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver negócio" }).getAttribute("href")).toBe("/app/negocios/n1");
    expect(screen.getByText(/Passo 2 · Avisar outro sistema \(webhook\):/)).toBeTruthy();
    expect(screen.getByText("O sistema de destino devolveu erro.")).toBeTruthy();
  });

  it("sem contato e sem negócio", () => {
    dados([{ ...LINHA, contato: null, negocio: null, resultados: [], status: "success" }]);
    montar();
    expect(screen.getByText("Contato não identificado")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Ver negócio" })).toBeNull();
  });

  it("Reenviar só com webhook falho e evento; clicar reenvia e avisa", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Reenviar" }));
    expect(mutate).toHaveBeenCalledWith("x1", expect.objectContaining({ onSuccess: expect.any(Function) }));
    mutate.mock.calls[0]![1].onSuccess();
    expect(toast.success).toHaveBeenCalledWith("Reenviado.");
  });

  it("sem evento não há Reenviar", () => {
    dados([{ ...LINHA, eventoId: null }]);
    montar();
    expect(screen.queryByRole("button", { name: "Reenviar" })).toBeNull();
  });

  it("aberta pelo painel: 4 opções, só 'Sucesso' marcada; a última não desmarca; marcar 'Falhou' pede de novo", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: /Eventos/ }));
    const caixas = screen.getAllByRole("checkbox");
    expect(caixas).toHaveLength(4);
    const marcadas = caixas.filter((c) => c.getAttribute("aria-checked") === "true");
    expect(marcadas).toHaveLength(1);
    expect((marcadas[0] as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("checkbox", { name: "Falhou" }));
    const ultima = useExecucoes.mock.calls.at(-1)!;
    expect(ultima[3]).toEqual(["success", "failed"]);
    expect(ultima[5]).toBe(1);
  });

  it("aberta por um passo de WhatsApp: as 3 opções de envio", async () => {
    montar({
      origem: "passo",
      acoes: [{ indice: 0, tipo: "send_whatsapp_message" }],
      tipoDoCartao: "send_whatsapp_message",
      resultados: ["erro"],
    });
    await userEvent.click(screen.getByRole("button", { name: /Eventos/ }));
    expect(screen.getAllByRole("checkbox").map((c) => c.getAttribute("aria-label") ?? c.textContent)).toEqual(
      expect.arrayContaining(["Enviados", "Esperando", "Erro no envio"]),
    );
  });

  it("pelas condições: Eventos desligado, com a dica", () => {
    montar({ origem: "condicoes" });
    const botao = screen.getByRole("button", { name: /Eventos/ }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    expect(botao.getAttribute("title")).toBe("Todas as execuções passaram nas condições.");
  });

  it("paginação: total 25 → 3 páginas; clicar 2 pede a página 2", async () => {
    dados([LINHA], 25);
    montar();
    const nav = screen.getByRole("navigation", { name: "Paginação" });
    expect(within(nav).getByRole("button", { name: "3" })).toBeTruthy();
    await userEvent.click(within(nav).getByRole("button", { name: "2" }));
    expect(useExecucoes.mock.calls.at(-1)![5]).toBe(2);
  });

  it("exportar: avisa, exporta com os filtros e confirma", async () => {
    exportar.mockResolvedValue(undefined);
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    expect(toast.info).toHaveBeenCalledWith("Exportando...");
    expect(exportar).toHaveBeenCalledWith("r1", "periodo=30d&situacoes=success", "America/Sao_Paulo", expect.any(Function));
    expect(toast.success).toHaveBeenCalledWith(
      "Exportação realizada com sucesso! Seu arquivo CSV foi gerado e está sendo baixado.",
    );
  });

  it("exportar: o teto mostra a mensagem da rota; outro erro, a frase da Clint", async () => {
    exportar.mockRejectedValueOnce(new ApiError(422, "lista_grande_demais", undefined, "q", "A lista tem mais de 5.000 execuções."));
    montar();
    await userEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    expect(toast.error).toHaveBeenCalledWith("A lista tem mais de 5.000 execuções.");
    exportar.mockRejectedValueOnce(new Error("rede"));
    await userEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));
    expect(toast.error).toHaveBeenLastCalledWith("Não foi possível exportar o arquivo CSV. Tente novamente.");
  });

  it("total 0: botão de exportar desligado e 'Nenhuma execução encontrada.'", () => {
    dados([], 0);
    montar();
    expect((screen.getByRole("button", { name: "Exportar CSV" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Nenhuma execução encontrada.")).toBeTruthy();
  });

  it("carregando: 5 esqueletos; erro: mensagem com 'Tentar de novo'", () => {
    useExecucoes.mockReturnValue({ data: undefined, isPending: true, isError: false, refetch: vi.fn() });
    montar();
    expect(screen.getAllByTestId("esqueleto-da-execucao")).toHaveLength(5);
  });

  it("erro de leitura", () => {
    useExecucoes.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch: vi.fn() });
    montar();
    expect(screen.getByText("Não foi possível carregar as execuções.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeTruthy();
  });
});
