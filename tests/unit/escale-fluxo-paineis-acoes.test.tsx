import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/webhooks/useWebhookSources", () => ({
  useWebhookSources: () => ({ data: { data: [] } }),
  usePipelines: () => ({ data: { data: [{ id: "p1", name: "Vendas", is_default: true, settings: null }] } }),
  usePipelineStages: () => ({ data: { data: { stages: [{ id: "e1", name: "Proposta" }] } } }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({
    data: [
      { id: "s1", display_name: "Bathully", phone_number: null, waha_session_name: null, status: "WORKING" },
      { id: "s2", display_name: "Caído", phone_number: null, waha_session_name: null, status: "STOPPED" },
    ],
  }),
  channelLabel: (s: { display_name: string }) => s.display_name,
}));
vi.mock("@/hooks/pipelines/useDefaultPipeline", () => ({ useDefaultPipeline: () => ({ data: undefined }) }));
vi.mock("@/components/escale/variaveis/SeletorDeVariaveis", () => ({
  SeletorDeVariaveis: ({ gatilho, aoEscolher }: { gatilho: ReactNode; aoEscolher: (t: string) => void }) => (
    <div>
      {gatilho}
      <button type="button" onClick={() => aoEscolher("[CONTACT.FIRST_NAME]")}>
        inserir-variavel
      </button>
    </div>
  ),
}));
vi.mock("@/app/app/webhooks/_components/ActionConfigForm", () => ({
  ActionConfigForm: ({ onChange }: { onChange: (a: unknown) => void }) => (
    <button type="button" onClick={() => onChange({ type: "add_tag", config: { tags: ["nova"] } })}>
      form-da-acao
    </button>
  ),
}));

import { PainelDaAcao } from "@/components/escale/automacoes/fluxo/painel/PainelDaAcao";
import { PainelDaMensagem } from "@/components/escale/automacoes/fluxo/painel/PainelDaMensagem";
import { PainelDasCondicoes } from "@/components/escale/automacoes/fluxo/painel/PainelDasCondicoes";
import { MENSAGEM_DO_LACO_DE_LEAD } from "@/lib/schemas/webhooks";

const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("PainelDasCondicoes", () => {
  const dados = (linhas: { field: string; op: "eq" | "neq" | "contains"; value: string; avancado?: boolean }[]) =>
    ({ kind: "condicoes", linhas }) as const;

  it("mostra a frase fixa e uma linha por bloco; Salvar manda as linhas novas", async () => {
    const aoSalvar = vi.fn();
    envolver(
      <PainelDasCondicoes
        dados={dados([{ field: "contact.tags", op: "contains", value: "vip" }])}
        evento="contact.birthday"
        aoCancelar={vi.fn()}
        aoSalvar={aoSalvar}
      />,
    );
    expect(screen.getByText(/Corresponde a/)).toBeTruthy();
    expect(screen.getByText("todas as condições")).toBeTruthy();
    expect(screen.getAllByTestId(/^condicao-/)).toHaveLength(1);
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.clear(screen.getByRole("textbox", { name: "Valor" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Valor" }), "novo");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith({
      kind: "condicoes",
      linhas: [{ field: "contact.tags", op: "contains", value: "novo" }],
    });
  });

  it("campo Etapa troca o valor por seletor de etapas; 'usar campo avançado' vira texto e volta", async () => {
    envolver(
      <PainelDasCondicoes
        dados={dados([{ field: "event.to_stage_id", op: "eq", value: "" }])}
        evento="lead.stage_changed"
        aoCancelar={vi.fn()}
        aoSalvar={vi.fn()}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Etapa" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "usar campo avançado" }));
    expect(screen.getByRole("textbox", { name: "Campo" })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Etapa" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "usar campo da lista" }));
    expect(screen.getByRole("combobox", { name: "Campo" })).toBeTruthy();
  });

  it("a lixeira tira a linha; o + adiciona até 10 e então desabilita", async () => {
    envolver(
      <PainelDasCondicoes
        dados={dados([{ field: "contact.tags", op: "contains", value: "a" }])}
        evento="contact.birthday"
        aoCancelar={vi.fn()}
        aoSalvar={vi.fn()}
      />,
    );
    const mais = screen.getByRole("button", { name: "Adicionar condição" }) as HTMLButtonElement;
    for (let i = 0; i < 9; i += 1) await userEvent.click(mais);
    expect(screen.getAllByTestId(/^condicao-/)).toHaveLength(10);
    expect(mais.disabled).toBe(true);
    await userEvent.click(screen.getAllByRole("button", { name: "Remover condição" })[0]!);
    expect(screen.getAllByTestId(/^condicao-/)).toHaveLength(9);
    expect(mais.disabled).toBe(false);
  });

  it("sem evento o + fica desabilitado e o aviso aparece", () => {
    envolver(<PainelDasCondicoes dados={dados([])} evento="" aoCancelar={vi.fn()} aoSalvar={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Adicionar condição" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Escolha o gatilho primeiro: cada gatilho tem os seus campos.")).toBeTruthy();
  });
});

describe("PainelDaMensagem", () => {
  const whatsapp = { kind: "acao", acao: { type: "send_whatsapp_message", config: { channel_session_id: "", template: "" } } } as const;

  it("textos da Clint, sem janela, modelo nem botão; Salvar manda o número e o texto", async () => {
    const aoSalvar = vi.fn();
    envolver(<PainelDaMensagem dados={whatsapp} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    expect(screen.getByText("Enviar mensagem")).toBeTruthy();
    expect(screen.getByText("Selecione o dispositivo WhatsApp")).toBeTruthy();
    expect(screen.getByText("Configure sua mensagem")).toBeTruthy();
    for (const ausente of ["Fora da janela", "Dentro da janela", "Adicionar botão"]) {
      expect(screen.queryByText(ausente)).toBeNull();
    }
    await userEvent.click(screen.getByRole("combobox", { name: "Número de WhatsApp" }));
    const desligado = screen.getByRole("option", { name: /Caído/ });
    expect(desligado.getAttribute("aria-disabled")).toBe("true");
    await userEvent.click(screen.getByRole("option", { name: "Bathully" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Mensagem" }), "Olá");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith({
      kind: "acao",
      acao: { type: "send_whatsapp_message", config: { channel_session_id: "s1", template: "Olá" } },
    });
  });

  it("inserir variável põe o token no cursor", async () => {
    const aoSalvar = vi.fn();
    envolver(
      <PainelDaMensagem
        dados={{ kind: "acao", acao: { type: "send_whatsapp_message", config: { channel_session_id: "s1", template: "Oi !" } } }}
        aoCancelar={vi.fn()}
        aoSalvar={aoSalvar}
      />,
    );
    const caixa = screen.getByRole("textbox", { name: "Mensagem" }) as HTMLTextAreaElement;
    caixa.focus();
    caixa.setSelectionRange(3, 3);
    await userEvent.click(screen.getByRole("button", { name: "inserir-variavel" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith({
      kind: "acao",
      acao: { type: "send_whatsapp_message", config: { channel_session_id: "s1", template: "Oi [CONTACT.FIRST_NAME]!" } },
    });
  });
});

describe("PainelDaAcao", () => {
  it("add_tag mostra o formulário do original e o onChange vai para o rascunho", async () => {
    const aoSalvar = vi.fn();
    const { container } = envolver(
      <PainelDaAcao
        dados={{ kind: "acao", acao: { type: "add_tag", config: { tags: ["a"] } } }}
        evento="contact.tag_added"
        aoCancelar={vi.fn()}
        aoSalvar={aoSalvar}
      />,
    );
    expect(container.querySelector("[data-escale-editor-de-automacao]")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "form-da-acao" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith({ kind: "acao", acao: { type: "add_tag", config: { tags: ["nova"] } } });
  });

  it("ação que fecha laço mostra o aviso", () => {
    envolver(
      <PainelDaAcao
        dados={{ kind: "acao", acao: { type: "assign_owner", config: { user_id: "" } } }}
        evento="lead.assigned"
        aoCancelar={vi.fn()}
        aoSalvar={vi.fn()}
      />,
    );
    expect(screen.getByText(MENSAGEM_DO_LACO_DE_LEAD)).toBeTruthy();
  });

  it("ai_decide é só de leitura, sem Salvar", () => {
    envolver(
      <PainelDaAcao
        dados={{ kind: "acao", acao: { type: "ai_decide", config: { instrucao: "Escolha", opcoes: [] } } }}
        evento="lead.stage_changed"
        aoCancelar={vi.fn()}
        aoSalvar={vi.fn()}
      />,
    );
    expect(screen.getByText("A IA decide")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
  });

  it("os problemas do último Salvar aparecem em 'Para salvar, corrija:'", () => {
    envolver(
      <PainelDaAcao
        dados={{
          kind: "acao",
          acao: { type: "add_tag", config: { tags: [] } },
          problemas: [{ caixa: "acao-1", mensagem: "Revise os campos desta ação." }],
        }}
        evento="contact.tag_added"
        aoCancelar={vi.fn()}
        aoSalvar={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("Para salvar, corrija:");
    expect(screen.getByText("Revise os campos desta ação.")).toBeTruthy();
  });
});
