import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  contas: [] as Array<{ id: string; nome: string; plataforma: string; conectada: boolean }>,
  garantir: vi.fn(),
  assinatura: { isPending: false, isError: false, error: null as null | { message: string } },
}));

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/escale/useComentarios", () => ({
  useContasSociais: () => ({ contas: h.contas, carregando: false }),
  useGarantirAssinatura: () => ({ mutate: h.garantir, ...h.assinatura }),
  usePublicacoesDaConta: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  codigoDoErro: () => "erro_ao_carregar",
}));

import { FormularioDoComentario } from "@/components/escale/automacoes/fluxo/comentario/FormularioDoComentario";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ConfigDoComentario } from "@/lib/escale/comentarios/schema";
import { configInicialDoComentario } from "@/lib/escale/comentarios/tela";

/** Fase 10B: o painel do gatilho "Alguém comenta em um post". */
const IG = "11111111-1111-4111-8111-111111111111";
const FB = "22222222-2222-4222-8222-222222222222";
const DESCONECTADA = "33333333-3333-4333-8333-333333333333";

const pub = (id: string) => ({ id, legenda: `Post ${id}`, miniatura: null, tipo: null });
const envolver = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );

/** Guarda a config como o painel faz (rascunho) e avisa cada mudança. */
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
  envolver(<Host inicial={inicial} aoMudar={aoMudar} />);
  return aoMudar;
};
const ultima = (m: ReturnType<typeof vi.fn>) => m.mock.calls.at(-1)![0] as ConfigDoComentario;

beforeEach(() => {
  h.garantir.mockReset();
  h.assinatura = { isPending: false, isError: false, error: null };
  h.contas = [
    { id: IG, nome: "@oregismarques", plataforma: "instagram", conectada: true },
    { id: FB, nome: "Página Escale", plataforma: "facebook", conectada: true },
    { id: DESCONECTADA, nome: "@antiga", plataforma: "instagram", conectada: false },
  ];
});

describe("FormularioDoComentario · conta", () => {
  it("lista as contas das duas redes e deixa a desconectada desabilitada", async () => {
    montar(configInicialDoComentario());
    expect(screen.getByText("Selecione o dispositivo Instagram")).toBeTruthy();
    await userEvent.click(screen.getByRole("combobox", { name: "Conta do Instagram" }));
    expect(screen.getByRole("option", { name: "@oregismarques · Instagram" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "Página Escale · Facebook" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "@antiga · Instagram — desconectada" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("escolher a conta grava o canal e garante a assinatura", async () => {
    const aoMudar = montar(configInicialDoComentario());
    await userEvent.click(screen.getByRole("combobox", { name: "Conta do Instagram" }));
    await userEvent.click(screen.getByRole("option", { name: "@oregismarques · Instagram" }));
    expect(ultima(aoMudar).channel_session_id).toBe(IG);
    expect(h.garantir).toHaveBeenCalledWith(IG);
  });

  it("erro da assinatura mostra o aviso e 'Tentar novamente' chama de novo", async () => {
    h.assinatura = { isPending: false, isError: true, error: { message: "Sem assinatura." } };
    montar({ ...configInicialDoComentario(), channel_session_id: IG });
    expect(screen.getByRole("alert").textContent).toContain("Não consegui ligar o recebimento de comentários nesta conta.");
    h.garantir.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(h.garantir).toHaveBeenCalledWith(IG);
  });

  it("trocar de conta com publicações pede confirmação e limpa os caminhos", async () => {
    const aoMudar = montar({
      channel_session_id: IG,
      escopo: "especificos",
      caminhos: [{ id: "caminho-1", publicacoes: [pub("179")], filtro: { modo: "qualquer" }, resposta: null }],
    });
    await userEvent.click(screen.getByRole("combobox", { name: "Conta do Instagram" }));
    await userEvent.click(screen.getByRole("option", { name: "Página Escale · Facebook" }));
    expect(screen.getByText("Trocar a conta do Instagram?")).toBeTruthy();
    expect(aoMudar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Trocar conta e remover caminhos" }));
    expect(ultima(aoMudar)).toMatchObject({ channel_session_id: FB, caminhos: [] });
  });
});

describe("FormularioDoComentario · escopo e caminhos", () => {
  it("'Todos os posts' mostra um caminho 'Qualquer publicação'", () => {
    montar({ ...configInicialDoComentario(), channel_session_id: IG });
    expect(screen.getByText("Qualquer publicação")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Todos os posts/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("'Posts específicos' sem caminho mostra o texto vazio da Clint; 'Adicionar publicação' desabilitado sem conta", async () => {
    montar(configInicialDoComentario());
    await userEvent.click(screen.getByRole("button", { name: /Posts específicos/ }));
    expect(screen.getByText(/Nenhuma publicação no gatilho ainda/)).toBeTruthy();
    const adicionar = screen.getByRole("button", { name: "Adicionar publicação" }) as HTMLButtonElement;
    expect(adicionar.disabled).toBe(true);
    expect(adicionar.title).toBe("Selecione um dispositivo para ver as publicações.");
  });

  it("trocar de escopo com caminhos preenchidos pede confirmação", async () => {
    const aoMudar = montar({
      channel_session_id: IG,
      escopo: "especificos",
      caminhos: [{ id: "caminho-1", publicacoes: [pub("179")], filtro: { modo: "qualquer" }, resposta: null }],
    });
    await userEvent.click(screen.getByRole("button", { name: /Todos os posts/ }));
    expect(screen.getByText("Trocar as publicações do gatilho?")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Trocar" }));
    expect(ultima(aoMudar)).toMatchObject({ escopo: "todos", caminhos: [{ id: "qualquer", publicacoes: [] }] });
  });

  it("resumo '{n} publicações · {m} caminhos no fluxo'", () => {
    montar({
      channel_session_id: IG,
      escopo: "especificos",
      caminhos: [
        { id: "caminho-1", publicacoes: [pub("1"), pub("2")], filtro: { modo: "qualquer" }, resposta: null },
        { id: "caminho-2", publicacoes: [pub("3")], filtro: { modo: "qualquer" }, resposta: null },
      ],
    });
    expect(screen.getByText("3 publicações · 2 caminhos no fluxo")).toBeTruthy();
    expect(screen.getByText("Grupo · 2 publicações")).toBeTruthy();
  });
});

describe("FormularioDoComentario · filtro e resposta", () => {
  const base = (): ConfigDoComentario => ({ ...configInicialDoComentario(), channel_session_id: IG });

  it("'Com palavras' (10D): condições com operador, 'Combinar' só com duas positivas e remover", async () => {
    const aoMudar = montar(base());
    await userEvent.click(screen.getByRole("button", { name: "Com palavras" }));
    expect(ultima(aoMudar).caminhos[0]!.filtro).toEqual({
      modo: "palavras",
      condicoes: [{ operador: "contem", valor: "" }],
      combinar: "qualquer",
    });
    await userEvent.type(screen.getByLabelText("Palavra do filtro"), "link");
    expect(ultima(aoMudar).caminhos[0]!.filtro).toMatchObject({ condicoes: [{ operador: "contem", valor: "link" }] });
    expect(screen.queryByRole("combobox", { name: "Combinar palavras com" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    expect(screen.getAllByLabelText("Palavra do filtro")).toHaveLength(2);
    await userEvent.type(screen.getAllByLabelText("Palavra do filtro")[1]!, "preço");
    await userEvent.click(screen.getByRole("combobox", { name: "Combinar palavras com" }));
    await userEvent.click(screen.getByRole("option", { name: "Todas as palavras" }));
    expect(ultima(aoMudar).caminhos[0]!.filtro).toMatchObject({ combinar: "todas" });
    await userEvent.click(screen.getAllByRole("button", { name: "Remover condição" })[0]!);
    expect(ultima(aoMudar).caminhos[0]!.filtro).toMatchObject({ condicoes: [{ valor: "preço" }] });
  });

  it("resposta: cria com o texto padrão, adiciona variação até 5 e remove", async () => {
    const aoMudar = montar(base());
    await userEvent.click(screen.getByRole("button", { name: "Adicionar resposta ao comentário" }));
    expect(ultima(aoMudar).caminhos[0]!.resposta).toEqual({ variacoes: ["Te respondi no direct, dá uma olhada!"] });
    expect(screen.getByText("1/5 variações")).toBeTruthy();
    for (let i = 0; i < 4; i++) await userEvent.click(screen.getByRole("button", { name: "Adicionar variação" }));
    expect(screen.getByText("5/5 variações")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Adicionar variação" }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Remover resposta ao comentário" }));
    expect(ultima(aoMudar).caminhos[0]!.resposta).toBeNull();
    expect(screen.getByRole("button", { name: "Adicionar resposta ao comentário" })).toBeTruthy();
  });

  it("cada mudança manda uma config nova, sem mutar a anterior", async () => {
    const inicial = Object.freeze(base());
    const aoMudar = vi.fn();
    envolver(<Host inicial={inicial} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar resposta ao comentário" }));
    expect(ultima(aoMudar)).not.toBe(inicial);
    expect(inicial.caminhos[0]!.resposta).toBeNull();
  });
});
