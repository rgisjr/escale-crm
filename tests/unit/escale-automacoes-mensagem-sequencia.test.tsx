import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: [] }),
  channelLabel: () => "",
}));
vi.mock("@/hooks/pipelines/useDefaultPipeline", () => ({ useDefaultPipeline: () => ({ data: undefined }) }));
vi.mock("@/hooks/escale/useAtivosDeMidia", () => ({ useAtivosDeMidia: () => ({ data: [] }) }));
vi.mock("@/components/escale/variaveis/SeletorDeVariaveis", () => ({ SeletorDeVariaveis: () => null }));

import { PainelDaMensagem } from "@/components/escale/automacoes/fluxo/painel/PainelDaMensagem";
import { passosSchema } from "@/lib/automation/envio-de-passos";

const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const dados = { kind: "acao", acao: { type: "send_whatsapp_message", config: { channel_session_id: "conversation", template: "" } } } as const;

async function adicionar(tipo: string) {
  await userEvent.click(screen.getByRole("button", { name: "Adicionar" }));
  await userEvent.click(screen.getByRole("button", { name: tipo }));
}

describe("PainelDaMensagem em sequência (07-027)", () => {
  it("pausa como primeiro item recusa com a frase da Clint e não adiciona", async () => {
    envolver(<PainelDaMensagem dados={{ ...dados, acao: { ...dados.acao, config: { ...dados.acao.config } } }} aoCancelar={vi.fn()} aoSalvar={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Remover item 1" }));
    await adicionar("Pausa");
    expect(within(screen.getByTestId("sequencia-da-mensagem")).getByRole("alert").textContent).toBe("O primeiro item da lista não pode ser um atraso.");
    expect(screen.queryByTestId("item-0")).toBeNull();
  });

  it("duas pausas seguidas recusam a segunda", async () => {
    envolver(<PainelDaMensagem dados={dados} aoCancelar={vi.fn()} aoSalvar={vi.fn()} />);
    await adicionar("Pausa");
    await adicionar("Pausa");
    expect(within(screen.getByTestId("sequencia-da-mensagem")).getByRole("alert").textContent).toBe("Não é possível adicionar mais delay entre as mensagens.");
    expect(screen.getAllByLabelText("Segundos de pausa")).toHaveLength(1);
  });

  it("texto com botões, pausa e texto final: Salvar manda passos válidos e o tempo de resposta", async () => {
    const aoSalvar = vi.fn();
    envolver(<PainelDaMensagem dados={dados} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Mensagem" }), "Quer testar?");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar botão" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Botão 1" }), "Sim");
    await userEvent.click(screen.getByRole("checkbox", { name: "Se o contato não responder em" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    const config = aoSalvar.mock.calls[0]![0].acao.config;
    expect(config.tempo_de_resposta).toEqual({ quantidade: 15, unidade: "minutos" });
    expect(passosSchema.parse(config.passos)[0]).toMatchObject({ tipo: "interativo", interativo: { tipo: "botoes", corpo: "Quer testar?" } });
  });

  it("mais de 3 botões avisa que vai como lista e grava a lista", async () => {
    const aoSalvar = vi.fn();
    envolver(<PainelDaMensagem dados={dados} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Mensagem" }), "Aonde?");
    for (let i = 1; i <= 4; i += 1) {
      await userEvent.click(screen.getByRole("button", { name: "Adicionar botão" }));
      await userEvent.type(screen.getByRole("textbox", { name: `Botão ${i}` }), `Op ${i}`);
    }
    expect(screen.getByText("Com mais de 3 opções, a mensagem vai como lista.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(passosSchema.parse(aoSalvar.mock.calls[0]![0].acao.config.passos)[0]).toMatchObject({ interativo: { tipo: "lista", botaoDaLista: "Ver opções" } });
  });

  it("botão com mais de 20 caracteres mostra a frase e desliga o Salvar", async () => {
    envolver(<PainelDaMensagem dados={dados} aoCancelar={vi.fn()} aoSalvar={vi.fn()} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Mensagem" }), "Oi");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar botão" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Botão 1" }), "x".repeat(21));
    expect(screen.getAllByText("O texto do botão deve ter no máximo 20 caracteres").length).toBeGreaterThan(0);
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
