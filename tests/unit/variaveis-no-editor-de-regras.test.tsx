import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(async () => ({ data: [] })), post: vi.fn(), patch: vi.fn(), put: vi.fn(), del: vi.fn() },
}));
vi.mock("@/hooks/pipelines/useDefaultPipeline", () => ({
  useDefaultPipeline: () => ({
    data: { pipeline: { settings: { fields: [{ key: "servico", label: "Serviço", type: "text" }] } } },
  }),
}));

import { ActionConfigForm, type ActionItem } from "@/app/app/webhooks/_components/ActionConfigForm";

/**
 * FORK ESCALE · Frente V (Task 7): "Enviar mensagem no WhatsApp" do Webhook
 * com a lista única (o caso que originou a frente: faltava "Primeiro nome").
 */
afterEach(() => cleanup());
beforeAll(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ data: { grupos: [], campos: [] } }), { status: 200 })),
  );
});

function montar(inicial: ActionItem) {
  const onChange = vi.fn();
  function Pai() {
    const [atual, setAtual] = React.useState(inicial);
    return (
      <ActionConfigForm
        action={atual}
        onChange={(next) => {
          setAtual(next);
          onChange(next);
        }}
      />
    );
  }
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Pai />
    </QueryClientProvider>,
  );
  return { onChange, user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

const whatsapp = (template: string): ActionItem =>
  ({ type: "send_whatsapp_message", config: { channel_session_id: "s-1", template } }) as ActionItem;

describe("variáveis no editor de regras", () => {
  it("'Primeiro nome' insere o token da Clint no cursor", async () => {
    const { user, onChange } = montar(whatsapp("Oi !"));
    const caixa = screen.getByPlaceholderText("Oi [CONTACT.FIRST_NAME], tudo bem?") as HTMLTextAreaElement;
    caixa.focus();
    caixa.setSelectionRange(3, 3);
    await user.click(screen.getByRole("button", { name: "Adicionar variáveis" }));
    const painel = screen.getByRole("dialog");
    await user.click(within(painel).getByRole("button", { name: "Contato" }));
    await user.click(within(painel).getByRole("button", { name: "Primeiro nome" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ template: "Oi [CONTACT.FIRST_NAME]!" }) }),
    );
  });

  it("o campo do funil entra no fim de Negócio", async () => {
    const { user, onChange } = montar(whatsapp(""));
    await user.click(screen.getByRole("button", { name: "Adicionar variáveis" }));
    const negocio = within(screen.getByRole("dialog")).getByRole("group", { name: "Negócio" });
    await user.click(within(negocio).getByRole("button", { name: "Serviço" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ template: "[DEAL.SERVICO]" }) }),
    );
  });

  it("a regra antiga com {{nome}} abre sem mudar", () => {
    const { onChange } = montar(whatsapp("Oi {{nome}}, tudo bem?"));
    expect(screen.getByDisplayValue("Oi {{nome}}, tudo bem?")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
