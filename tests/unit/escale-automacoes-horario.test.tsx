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
vi.mock("@/hooks/channels/useChannelSessions", () => ({ useChannelSessions: () => ({ data: [] }), channelLabel: () => "" }));

import { CorpoDasCondicoes } from "@/components/escale/automacoes/fluxo/CorposDoNo";
import { EditorDeHorario } from "@/components/escale/automacoes/fluxo/painel/condicoes/EditorDeHorario";
import { PainelDasCondicoes } from "@/components/escale/automacoes/fluxo/painel/PainelDasCondicoes";

const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const SP = "America/Sao_Paulo";

describe("EditorDeHorario", () => {
  it("Hora › Entre: máscara, dias e Confirmar só com o valor completo", async () => {
    const aoConfirmar = vi.fn();
    envolver(<EditorDeHorario campo="agora.hora" fuso={SP} aoCancelar={vi.fn()} aoConfirmar={aoConfirmar} aoVoltar={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Voltar" })).toBeTruthy();
    expect(screen.getByText("(UTC -3)")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Depois de" }).getAttribute("aria-checked")).toBe("true");
    await userEvent.click(screen.getByRole("radio", { name: "Entre" }));
    const confirmar = screen.getByRole("button", { name: "Confirmar" }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    await userEvent.type(screen.getByRole("textbox", { name: "Hora inicial" }), "0800");
    await userEvent.type(screen.getByRole("textbox", { name: "Hora final" }), "1800");
    expect((screen.getByRole("textbox", { name: "Hora inicial" }) as HTMLInputElement).value).toBe("08:00");
    await userEvent.click(screen.getByRole("combobox", { name: "Dias da semana" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Segunda" }));
    await userEvent.click(confirmar);
    expect(aoConfirmar).toHaveBeenCalledWith("entre", '{"de":"08:00","ate":"18:00","dias":[1]}');
  });

  it("Data › Depois de: dd/MM/yyyy HH:mm e sem dias da semana", async () => {
    const aoConfirmar = vi.fn();
    envolver(<EditorDeHorario campo="agora.data" fuso={SP} aoCancelar={vi.fn()} aoConfirmar={aoConfirmar} />);
    expect(screen.queryByRole("combobox", { name: "Dias da semana" })).toBeNull();
    await userEvent.type(screen.getByRole("textbox", { name: "Data" }), "031120261400");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(aoConfirmar).toHaveBeenCalledWith("depois_de", '{"de":"2026-11-03T14:00"}');
  });
});

describe("PainelDasCondicoes com Horário atual", () => {
  it("o seletor da Clint: categorias, Em breve, e Hora adiciona a linha com o resumo", async () => {
    const aoSalvar = vi.fn();
    envolver(
      <PainelDasCondicoes dados={{ kind: "condicoes", linhas: [] }} evento="contact.birthday" fuso={SP} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    expect(screen.getByText("Recomendados")).toBeTruthy();
    for (const c of ["Campos", "Contato", "Negócio"]) expect(screen.getByRole("button", { name: c })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Horário atual" }));
    expect(screen.getByText("Em breve")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Hora" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Hora" }), "0800");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getByText("é depois de")).toBeTruthy();
    expect(screen.getByText("08:00 · todos os dias")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith({
      kind: "condicoes",
      linhas: [{ field: "agora.hora", op: "depois_de", value: '{"de":"08:00","dias":[]}' }],
    });
  });

  it("a busca filtra e diz quando não acha", async () => {
    envolver(<PainelDasCondicoes dados={{ kind: "condicoes", linhas: [] }} evento="contact.birthday" fuso={SP} aoCancelar={vi.fn()} aoSalvar={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Buscar" }), "zzz");
    expect(screen.getByText(/Sem resultados para/)).toBeTruthy();
  });
});

describe("o nó de condições", () => {
  it("mostra 'Horário atual' com a frase e o intervalo", () => {
    envolver(
      <CorpoDasCondicoes
        evento="contact.birthday"
        dados={{ kind: "condicoes", linhas: [{ field: "agora.hora", op: "entre", value: '{"de":"08:00","ate":"18:00","dias":[1,2]}' }] }}
      />,
    );
    expect(screen.getByText("está entre")).toBeTruthy();
    expect(screen.getByText("08:00 até 18:00 · seg, ter")).toBeTruthy();
  });
});
