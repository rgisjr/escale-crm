import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/webhooks/useWebhookSources", () => ({
  useWebhookSources: () => ({ data: { data: [] } }),
  usePipelines: () => ({ data: { data: [{ id: "p1", name: "Vendas", is_default: true, settings: null }] } }),
  usePipelineStages: () => ({ data: undefined }),
}));

import type { LinhaDeCondicao } from "@/lib/automation/desenho-da-regra";
import type { GrupoDeCondicoes } from "@/lib/escale/automacoes/fluxo/caixas";
import { PainelDasCondicoes } from "@/components/escale/automacoes/fluxo/painel/PainelDasCondicoes";

const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const SP = "America/Sao_Paulo";
const linha: LinhaDeCondicao = { field: "lead.title", op: "contains", value: "x" };

describe("PainelDasCondicoes em grupos (07-025)", () => {
  it("um grupo 'todas' de uma caixa antiga grava o formato de sempre (sem grupos)", async () => {
    const aoSalvar = vi.fn();
    envolver(<PainelDasCondicoes dados={{ kind: "condicoes", linhas: [linha] }} evento="message.received" fuso={SP} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    expect(screen.getByTestId("grupo-g1")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    await userEvent.keyboard("{Escape}");
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("'Novo grupo de condições' cria o segundo grupo com id estável e salva com grupos", async () => {
    const aoSalvar = vi.fn();
    envolver(<PainelDasCondicoes dados={{ kind: "condicoes", linhas: [linha] }} evento="message.received" fuso={SP} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    await userEvent.click(screen.getByRole("button", { name: "Novo grupo de condições" }));
    expect(screen.getByTestId("grupo-g2")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    const salvo = aoSalvar.mock.calls[0]![0];
    expect(salvo.grupos.map((g: { id: string }) => g.id)).toEqual(["g1", "g2"]);
    expect(salvo.linhas).toEqual([linha]);
  });

  it("trocar para 'qualquer condição' muda o modo e grava com grupos", async () => {
    const aoSalvar = vi.fn();
    envolver(<PainelDasCondicoes dados={{ kind: "condicoes", linhas: [linha] }} evento="message.received" fuso={SP} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Corresponde a 1" }));
    await userEvent.click(screen.getByRole("option", { name: "qualquer condição" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar.mock.calls[0]![0].grupos[0].modo).toBe("qualquer");
  });

  it("caixa já com grupos abre com eles e remove um grupo", async () => {
    const aoSalvar = vi.fn();
    const grupos: GrupoDeCondicoes[] = [
      { id: "g1", modo: "todas", linhas: [linha] },
      { id: "g2", modo: "todas", linhas: [] },
    ];
    envolver(<PainelDasCondicoes dados={{ kind: "condicoes", linhas: [linha], grupos }} evento="message.received" fuso={SP} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    await userEvent.click(screen.getByRole("button", { name: "Remover grupo 2" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar.mock.calls[0]![0].grupos).toHaveLength(1);
  });
});
