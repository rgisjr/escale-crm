import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  consulta: { data: undefined as unknown, isLoading: false, isError: false, error: null as unknown, refetch: vi.fn() },
  codigo: "erro_ao_carregar",
}));

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/escale/useComentarios", () => ({
  usePublicacoesDaConta: () => h.consulta,
  codigoDoErro: () => h.codigo,
}));

import { SeletorDePublicacoes } from "@/components/escale/automacoes/fluxo/comentario/SeletorDePublicacoes";

/** Fase 10B (D6): o seletor "Selecionar publicações". */
const post = (id: string, legenda: string | null, tipo: string | null = "IMAGE") => ({
  id,
  legenda,
  miniatura: null,
  tipo,
  criadaEm: "2026-10-30T12:00:00.000Z",
  link: null,
  comentarios: 0,
});

function montar(extra: Partial<Parameters<typeof SeletorDePublicacoes>[0]> = {}) {
  const aoConcluir = vi.fn();
  render(
    <SeletorDePublicacoes
      aberta
      conta={{ id: "c1", nome: "@oregismarques" }}
      emUso={new Set()}
      totalCaminhos={0}
      totalPublicacoes={0}
      aoFechar={vi.fn()}
      aoConcluir={aoConcluir}
      {...extra}
    />,
  );
  return aoConcluir;
}

beforeEach(() => {
  h.consulta = {
    data: [post("11111", "Promoção de Março"), post("22222", "Bastidores do reel", "REELS"), post("33333", null, "CAROUSEL_ALBUM")],
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
  h.codigo = "erro_ao_carregar";
});

describe("SeletorDePublicacoes", () => {
  it("mostra o título, o subtítulo da conta, as abas e o aviso das mais recentes", () => {
    montar();
    expect(screen.getByText("Selecionar publicações")).toBeTruthy();
    expect(screen.getByText("@oregismarques · cada publicação vira um caminho no fluxo")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Pesquisar publicação" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Digitar o ID da publicação" })).toBeTruthy();
    expect(screen.getByText("Exibindo as publicações mais recentes. Para uma específica, use o ID.")).toBeTruthy();
  });

  it("carregando mostra os esqueletos", () => {
    h.consulta = { ...h.consulta, data: undefined, isLoading: true };
    montar();
    expect(screen.getByLabelText("Carregando publicações")).toBeTruthy();
  });

  it("vazio: 'Nenhuma publicação encontrada'", () => {
    h.consulta = { ...h.consulta, data: [] };
    montar();
    expect(screen.getByText("Nenhuma publicação encontrada")).toBeTruthy();
  });

  it("erro genérico oferece 'Tentar novamente'", async () => {
    h.consulta = { ...h.consulta, data: undefined, isError: true };
    montar();
    expect(screen.getByText("Erro ao carregar publicações")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(h.consulta.refetch).toHaveBeenCalled();
  });

  it.each([
    ["conta_desconectada", /está desconectada\. Vá até Canais e conecte a conta novamente/],
    ["acesso_recusado", /Não foi possível acessar esta conta do Instagram/],
  ])("erro %s mostra o texto da Clint", (codigo, texto) => {
    h.consulta = { ...h.consulta, data: undefined, isError: true };
    h.codigo = codigo;
    montar();
    expect(screen.getByText(texto)).toBeTruthy();
  });

  it("a busca ignora acento e caixa e o chip 'Reel' filtra por tipo", async () => {
    montar();
    await userEvent.type(screen.getByLabelText("Buscar por legenda"), "PROMOCAO");
    expect(screen.getByText("Promoção de Março")).toBeTruthy();
    expect(screen.queryByText("Bastidores do reel")).toBeNull();
    await userEvent.clear(screen.getByLabelText("Buscar por legenda"));
    await userEvent.click(screen.getByRole("button", { name: "Reel" }));
    expect(screen.getByText("Bastidores do reel")).toBeTruthy();
    expect(screen.queryByText("Promoção de Março")).toBeNull();
  });

  it("filtro sem resultado mostra a mensagem e 'Limpar filtro' devolve a lista", async () => {
    montar();
    await userEvent.type(screen.getByLabelText("Buscar por legenda"), "zzz");
    expect(screen.getByText("Nenhuma publicação corresponde aos filtros")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtro" }));
    expect(screen.getByText("Promoção de Março")).toBeTruthy();
  });

  it("publicação que já está no fluxo tem o selo e não seleciona", () => {
    montar({ emUso: new Set(["11111"]) });
    const cartao = screen.getByText("Promoção de Março").closest("button") as HTMLButtonElement;
    expect(cartao.disabled).toBe(true);
    expect(screen.getByText("No fluxo")).toBeTruthy();
  });

  it("'Concluir' manda as escolhidas; com 2+ aparece 'Agrupar em um único caminho'", async () => {
    const aoConcluir = montar();
    expect((screen.getByRole("button", { name: "Concluir" }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByText("Promoção de Março"));
    expect(screen.queryByText("Agrupar em um único caminho")).toBeNull();
    await userEvent.click(screen.getByText("Bastidores do reel"));
    await userEvent.click(screen.getByRole("switch", { name: "Agrupar em um único caminho" }));
    await userEvent.click(screen.getByRole("button", { name: "Concluir" }));
    const [escolhidas, agrupar] = aoConcluir.mock.calls[0]!;
    expect(escolhidas.map((p: { id: string }) => p.id)).toEqual(["11111", "22222"]);
    expect(agrupar).toBe(true);
  });

  it("passar do limite de caminhos desabilita 'Concluir' com o texto do limite", async () => {
    montar({ totalCaminhos: 10 });
    await userEvent.click(screen.getByText("Promoção de Março"));
    expect(screen.getByRole("alert").textContent).toBe("O gatilho aceita até 10 caminhos de publicação.");
    expect((screen.getByRole("button", { name: "Concluir" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("SeletorDePublicacoes · aba do ID", () => {
  async function abaDoId() {
    const aoConcluir = montar({ emUso: new Set(["99999"]) });
    await userEvent.click(screen.getByRole("tab", { name: "Digitar o ID da publicação" }));
    return aoConcluir;
  }
  const digitar = async (id: string) => {
    await userEvent.clear(screen.getByLabelText("ID da publicação"));
    await userEvent.type(screen.getByLabelText("ID da publicação"), id);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar" }));
  };

  it("recusa ID inválido, repetido e já no fluxo; aceita os dois formatos", async () => {
    const aoConcluir = await abaDoId();
    await digitar("abc");
    expect(screen.getByRole("alert").textContent).toBe("Use o ID numérico da publicação ou busque pela legenda.");
    await digitar("17912345678901234");
    await digitar("123456_7891011");
    expect(screen.getByText("17912345678901234")).toBeTruthy();
    expect(screen.getByText("123456_7891011")).toBeTruthy();
    await digitar("17912345678901234");
    expect(screen.getByRole("alert").textContent).toBe("Esta publicação já está selecionada.");
    await digitar("99999");
    expect(screen.getByRole("alert").textContent).toBe("Esta publicação já está no fluxo.");
    await userEvent.click(screen.getByRole("button", { name: "Concluir" }));
    expect(aoConcluir.mock.calls[0]![0].map((p: { id: string }) => p.id)).toEqual(["17912345678901234", "123456_7891011"]);
  });

  it("o × tira o ID", async () => {
    await abaDoId();
    await digitar("17912345678901234");
    await userEvent.click(screen.getByRole("button", { name: "Remover o ID 17912345678901234" }));
    expect(screen.queryByText("17912345678901234")).toBeNull();
  });
});
