import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  contas: [] as Array<{ id: string; nome: string; plataforma: string; conectada: boolean }>,
}));

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/escale/useComentarios", () => ({
  useContasSociais: () => ({ contas: h.contas, carregando: false }),
  useGarantirAssinatura: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

import { FormularioDoDirect } from "@/components/escale/automacoes/fluxo/comentario/FormularioDoDirect";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ConfigDoDirect } from "@/lib/escale/comentarios/schema";
import { configInicialDoDirect } from "@/lib/escale/comentarios/tela";

/** Fase 10D: o painel dos gatilhos de direct do Instagram. */
const IG = "11111111-1111-4111-8111-111111111111";
const FB = "22222222-2222-4222-8222-222222222222";

function Host({ evento, aoMudar }: { evento: string; aoMudar: (c: ConfigDoDirect) => void }) {
  const [config, setConfig] = useState(configInicialDoDirect("instagram.message_received"));
  return (
    <FormularioDoDirect
      evento={evento}
      config={config}
      aoMudar={(c) => {
        aoMudar(c);
        setConfig(c);
      }}
    />
  );
}
const montar = (evento: string) => {
  const aoMudar = vi.fn();
  const ui: ReactNode = (
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <Host evento={evento} aoMudar={aoMudar} />
      </TooltipProvider>
    </QueryClientProvider>
  );
  render(ui);
  return aoMudar;
};
const ultima = (m: ReturnType<typeof vi.fn>) => m.mock.calls.at(-1)![0] as ConfigDoDirect;

beforeEach(() => {
  h.contas = [
    { id: IG, nome: "@oregismarques", plataforma: "instagram", conectada: true },
    { id: FB, nome: "Página Escale", plataforma: "facebook", conectada: true },
  ];
});

describe("FormularioDoDirect", () => {
  it("menção: só o texto da Clint, sem filtro", () => {
    montar("instagram.story_mention");
    expect(screen.getByText("Este gatilho dispara para toda menção recebida pela conta. Não há texto para filtrar.")).toBeTruthy();
    expect(screen.queryByText("Filtro de mensagem")).toBeNull();
  });

  it("story esconde as páginas do Facebook; a mensagem mostra as duas redes", async () => {
    montar("instagram.story_reply");
    await userEvent.click(screen.getByRole("combobox", { name: "Conta do Instagram" }));
    expect(screen.queryByRole("option", { name: "Página Escale · Facebook" })).toBeNull();
    expect(screen.getByRole("option", { name: "@oregismarques · Instagram" })).toBeTruthy();
  });

  it("'Qualquer mensagem' mostra o aviso da IA; 'Com palavras' troca pela nota e abre o filtro", async () => {
    const aoMudar = montar("instagram.message_received");
    expect(screen.getByRole("note").textContent).toMatch(/10 minutos a cada mensagem desta conta/);
    await userEvent.click(screen.getByRole("button", { name: "Com palavras" }));
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getByText(/Quando a mensagem casar com o filtro/)).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Palavra do filtro"), "eu quero");
    expect(ultima(aoMudar).filtro).toMatchObject({ modo: "palavras", condicoes: [{ operador: "contem", valor: "eu quero" }] });
  });

  it("escolher a conta grava o canal", async () => {
    const aoMudar = montar("instagram.message_received");
    await userEvent.click(screen.getByRole("combobox", { name: "Conta do Instagram" }));
    await userEvent.click(screen.getByRole("option", { name: "@oregismarques · Instagram" }));
    expect(ultima(aoMudar).channel_session_id).toBe(IG);
  });
});
