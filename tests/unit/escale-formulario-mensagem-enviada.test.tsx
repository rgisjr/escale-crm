import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  sessoes: [] as Array<{ id: string; display_name: string; phone_number: null; waha_session_name: null; status: string }>,
}));

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: h.sessoes }),
  channelLabel: (s: { display_name: string }) => s.display_name,
}));

import { FormularioDaMensagemEnviada } from "@/components/escale/automacoes/fluxo/painel/FormularioDaMensagemEnviada";
import { TooltipProvider } from "@/components/ui/tooltip";
import { configInicialDaMensagemEnviada, type ConfigDaMensagemEnviada } from "@/lib/automation/mensagem-enviada";

/** O painel do gatilho "Equipe envia uma mensagem" (paridade Datacrazy). */
function Host({ aoMudar }: { aoMudar: (c: ConfigDaMensagemEnviada) => void }) {
  const [config, setConfig] = useState(configInicialDaMensagemEnviada());
  return (
    <FormularioDaMensagemEnviada
      config={config}
      aoMudar={(c) => {
        aoMudar(c);
        setConfig(c);
      }}
    />
  );
}
const montar = () => {
  const aoMudar = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <Host aoMudar={aoMudar} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return aoMudar;
};
const ultima = (m: ReturnType<typeof vi.fn>) => m.mock.calls.at(-1)![0] as ConfigDaMensagemEnviada;

beforeEach(() => {
  h.sessoes = [{ id: "44444444-4444-4444-8444-444444444444", display_name: "joao vendas1", phone_number: null, waha_session_name: null, status: "WORKING" }];
});

describe("FormularioDaMensagemEnviada", () => {
  it("a palavra digitada vai para a condição; aceita frase de mais de 60 caracteres", async () => {
    const user = userEvent.setup();
    const aoMudar = montar();
    const frase = "Logo nosso número do suporte vai te chamar para fazer a instalação, combinado?";
    await user.type(screen.getByLabelText("Palavra do filtro"), frase);
    const filtro = ultima(aoMudar).filtro;
    expect(filtro.modo === "palavras" && filtro.condicoes?.[0]).toEqual({ operador: "contem", valor: frase });
  });
  it("Qualquer mensagem tira o filtro e mostra o aviso", async () => {
    const user = userEvent.setup();
    const aoMudar = montar();
    await user.click(screen.getByRole("button", { name: "Qualquer mensagem" }));
    expect(ultima(aoMudar).filtro).toEqual({ modo: "qualquer" });
    expect(screen.getByRole("note")).toHaveTextContent("a cada mensagem que a equipe enviar");
    expect(screen.queryByLabelText("Palavra do filtro")).toBeNull();
  });
  it("grupos começa desligado e agendadas ligado; marcar muda a configuração", async () => {
    const user = userEvent.setup();
    const aoMudar = montar();
    const grupos = screen.getByRole("checkbox", { name: "Disparar também em mensagens enviadas em grupos" });
    const agendadas = screen.getByRole("checkbox", { name: "Considerar mensagens agendadas" });
    expect(grupos).toHaveAttribute("aria-checked", "false");
    expect(agendadas).toHaveAttribute("aria-checked", "true");
    await user.click(grupos);
    expect(ultima(aoMudar).em_grupos).toBe(true);
    await user.click(agendadas);
    expect(ultima(aoMudar).agendadas).toBe(false);
  });
});
