import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  contas: [] as Array<{ id: string; nome: string; plataforma: string; conectada: boolean }>,
}));

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/escale/useComentarios", () => ({
  useContasSociais: () => ({ contas: h.contas, carregando: false }),
  useGarantirAssinatura: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  usePublicacoesDaConta: () => ({ data: [{ id: "p1" }, { id: "p2" }], isLoading: false, isError: false, refetch: vi.fn() }),
  codigoDoErro: () => "erro_ao_carregar",
}));

import { FormularioDoComentario } from "@/components/escale/automacoes/fluxo/comentario/FormularioDoComentario";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ConfigDoComentario } from "@/lib/escale/comentarios/schema";
import { configInicialDoComentario } from "@/lib/escale/comentarios/tela";

/** Fase 10D: próxima publicação, público, repetição e ações no caminho do gatilho de comentário. */
const IG = "11111111-1111-4111-8111-111111111111";
const FB = "22222222-2222-4222-8222-222222222222";

function Host({ inicial, aoMudar }: { inicial: ConfigDoComentario; aoMudar: (c: ConfigDoComentario) => void }) {
  const [config, setConfig] = useState(inicial);
  return (
    <FormularioDoComentario
      config={config}
      aoMudar={(c) => {
        aoMudar(c);
        setConfig(c);
      }}
    />
  );
}
const montar = (inicial: ConfigDoComentario) => {
  const aoMudar = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <Host inicial={inicial} aoMudar={aoMudar} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return aoMudar;
};
const ultima = (m: ReturnType<typeof vi.fn>) => m.mock.calls.at(-1)![0] as ConfigDoComentario;
const com = (canal: string): ConfigDoComentario => ({ ...configInicialDoComentario(), channel_session_id: canal });

beforeEach(() => {
  h.contas = [
    { id: IG, nome: "@oregismarques", plataforma: "instagram", conectada: true },
    { id: FB, nome: "Página Escale", plataforma: "facebook", conectada: true },
  ];
});

describe("Próxima publicação (D11)", () => {
  it("desabilitada sem conta", () => {
    montar(configInicialDoComentario());
    expect((screen.getByRole("button", { name: /Próxima publicação/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("escolher arma a regra com as publicações listadas e mostra a espera", async () => {
    const aoMudar = montar(com(IG));
    await userEvent.click(screen.getByRole("button", { name: /Próxima publicação/ }));
    const config = ultima(aoMudar);
    expect(config.escopo).toBe("proxima");
    expect(config.caminhos).toHaveLength(1);
    expect(config.proxima).toMatchObject({ conhecidas: ["p1", "p2"], resolvida: null });
    expect(screen.getByText(/Aguardando a próxima publicação da conta/)).toBeTruthy();
  });

  it("resolvida mostra a publicação e a data dd/mm/aaaa HH:mm", () => {
    montar({
      ...com(IG),
      escopo: "proxima",
      proxima: {
        armada_em: "2026-11-02T10:00:00Z",
        conhecidas: [],
        resolvida: { id: "p9", legenda: "Meu Reels", miniatura: null, tipo: null, publicada_em: "2026-11-02T15:30:00Z" },
      },
    });
    expect(screen.getByText("Meu Reels")).toBeTruthy();
    expect(screen.getByText(/Publicada em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)).toBeTruthy();
    expect(screen.getByText("Esta automação agora vale só para esta publicação.")).toBeTruthy();
  });
});

describe("Público (D12/D13)", () => {
  it("só aparece com conta do Instagram", () => {
    montar(com(FB));
    expect(screen.queryByTestId("publico-do-comentario")).toBeNull();
  });

  it("'Só seguidores' preenche o padrão e mostra 'Siga para liberar' com contadores", async () => {
    const aoMudar = montar(com(IG));
    expect(screen.getByTestId("publico-do-comentario")).toBeTruthy();
    expect(screen.queryByText("Siga para liberar")).toBeNull();
    await userEvent.click(screen.getByRole("combobox", { name: "Quem recebe a mensagem" }));
    await userEvent.click(screen.getByRole("option", { name: "Só seguidores" }));
    expect(ultima(aoMudar).publico).toMatchObject({ quem: "seguidores", quando_nao_informado: "enviar" });
    expect(screen.getByText("Siga para liberar")).toBeTruthy();
    expect(screen.getByText(/\/640/, { selector: "span" })).toBeTruthy();
    expect(screen.getByText("17/20")).toBeTruthy();
  });

  it("'Pedir para seguir' só existe em 'Só seguidores'", async () => {
    montar(com(IG));
    await userEvent.click(screen.getByRole("combobox", { name: "Quem recebe a mensagem" }));
    await userEvent.click(screen.getByRole("option", { name: "Só quem não segue" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Quando o Instagram não informar" }));
    expect(screen.queryByRole("option", { name: "Pedir para seguir" })).toBeNull();
  });

  it("voltar para 'Todos' limpa o público", async () => {
    const aoMudar = montar({ ...com(IG) });
    await userEvent.click(screen.getByRole("combobox", { name: "Quem recebe a mensagem" }));
    await userEvent.click(screen.getByRole("option", { name: "Só seguidores" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Quem recebe a mensagem" }));
    await userEvent.click(screen.getByRole("option", { name: "Todos" }));
    expect(ultima(aoMudar).publico).toBeNull();
  });
});

describe("Repetição (D10)", () => {
  it("'De novo depois de' grava 24 h; 0 e 721 mostram o erro", async () => {
    const aoMudar = montar(com(IG));
    await userEvent.click(screen.getByRole("button", { name: "De novo depois de" }));
    expect(ultima(aoMudar).repeticao).toEqual({ modo: "intervalo", horas: 24 });
    const campo = screen.getByRole("textbox", { name: "Horas" });
    await userEvent.clear(campo);
    await userEvent.type(campo, "0");
    expect(screen.getByRole("alert").textContent).toMatch(/1 a 720/);
    await userEvent.clear(campo);
    await userEvent.type(campo, "721");
    expect(screen.getByRole("alert")).toBeTruthy();
    await userEvent.clear(campo);
    await userEvent.type(campo, "48");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Ações no caminho (D14)", () => {
  it("'Ocultar' nas duas redes; 'Curtir o comentário' só no Facebook", async () => {
    const aoMudar = montar(com(IG));
    expect(screen.queryByRole("switch", { name: "Curtir o comentário" })).toBeNull();
    await userEvent.click(screen.getByRole("switch", { name: "Ocultar o comentário depois do direct" }));
    expect(ultima(aoMudar).caminhos[0]!.ocultar_depois).toBe(true);
  });

  it("no Facebook o interruptor de curtir aparece", async () => {
    const aoMudar = montar(com(FB));
    await userEvent.click(screen.getByRole("switch", { name: "Curtir o comentário" }));
    expect(ultima(aoMudar).caminhos[0]!.curtir).toBe(true);
  });
});
