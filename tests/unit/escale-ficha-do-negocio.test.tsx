import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), busca: "foo=1" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.busca),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const quadro = vi.hoisted(() => ({
  estado: { data: undefined as unknown, isLoading: false, error: null as unknown },
}));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => ({ ...quadro.estado, refetch: vi.fn() }),
  chaveDoQuadro: (id: string) => ["board", id],
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
const recentes = vi.hoisted(() => ({ registrar: vi.fn() }));
vi.mock("@/hooks/escale/useNegociosRecentes", () => ({
  useChaveDosRecentes: () => "chave",
  useNegociosRecentes: () => ({ registrar: recentes.registrar }),
}));
vi.mock("@/components/escale/negocio/ConteudoDaAba", () => ({
  ConteudoDaAba: ({ aba }: { aba: string }) => <p>conteúdo {aba}</p>,
}));

vi.mock("@/components/escale/negocio/ProximoNegocio", () => ({
  ProximoNegocio: () => <span data-testid="proximo" />,
}));
vi.mock("@/components/escale/negocio/MenuDaFicha", () => ({ MenuDaFicha: () => <span data-testid="menu" /> }));
vi.mock("@/components/escale/negocio/StatusDaFicha", () => ({ StatusDaFicha: () => <span data-testid="status" /> }));
vi.mock("@/components/escale/negocio/DonoDaFicha", () => ({ DonoDaFicha: () => <span data-testid="dono" /> }));
vi.mock("@/components/escale/negocio/AcoesDaFicha", () => ({ AcoesDaFicha: () => <span data-testid="acoes" /> }));

import { FichaDoNegocio } from "@/components/escale/negocio/FichaDoNegocio";
import { useFichaDoNegocio } from "@/hooks/escale/useFichaDoNegocio";

/** FORK ESCALE · Fase 1G (C1, C2): a moldura da ficha do negócio (print 01). */
const LEAD = {
  id: "n1",
  pipeline_id: "o1",
  stage_id: "e1",
  contact_id: "c1",
  title: "Ana | Nunes Regularize",
  status: "open",
  position_in_stage: 1,
  value_cents: null,
  currency: null,
  owner_user_id: null,
  owner_agent_id: null,
  owner_kind: null,
  custom_fields: {},
  tags: [],
  contact_tags: [],
  last_activity_at: null,
  stage_changed_at: null,
  created_at: "2026-10-14T10:00:00Z",
  updated_at: "2026-10-14T10:00:00Z",
};
const QUADRO = {
  pipeline: { id: "o1", name: "Leads INSS Whatsapp", settings: {} },
  stages: [
    {
      id: "e1",
      name: "1. Entrada Lead",
      position: 1,
      is_won: false,
      is_lost: false,
      is_archived: false,
    },
  ],
  leads: [LEAD],
};
const PROPS = {
  negocioId: "n1",
  origem: { id: "o1", nome: "Leads INSS Whatsapp" },
  grupo: "INSS Vendas",
  negociosDoContato: 1,
};

beforeEach(() => {
  nav.push.mockReset();
  nav.replace.mockReset();
  nav.busca = "foo=1";
  recentes.registrar.mockReset();
  quadro.estado = { data: QUADRO, isLoading: false, error: null };
});

describe("useFichaDoNegocio", () => {
  it("carregando, erro, sumiu e pronto, a partir do cache do quadro", () => {
    const busca = new URLSearchParams();
    quadro.estado = { data: undefined, isLoading: true, error: null };
    expect(renderHook(() => useFichaDoNegocio("n1", "o1", busca)).result.current.estado).toBe(
      "carregando",
    );
    quadro.estado = { data: undefined, isLoading: false, error: new Error("x") };
    expect(renderHook(() => useFichaDoNegocio("n1", "o1", busca)).result.current.estado).toBe(
      "erro",
    );
    quadro.estado = { data: QUADRO, isLoading: false, error: null };
    expect(renderHook(() => useFichaDoNegocio("outro", "o1", busca)).result.current.estado).toBe(
      "sumiu",
    );
    const pronto = renderHook(() => useFichaDoNegocio("n1", "o1", busca)).result.current;
    expect(pronto.estado === "pronto" && pronto.lead.id).toBe("n1");
  });

  it("refetch que falha com o quadro em cache mantém a ficha pronta", () => {
    quadro.estado = { data: QUADRO, isLoading: false, error: new Error("rede") };
    const ficha = renderHook(() => useFichaDoNegocio("n1", "o1", new URLSearchParams())).result
      .current;
    expect(ficha.estado).toBe("pronto");
  });

  it("corta pela moeda da origem antes da moeda da organização", () => {
    const busca = new URLSearchParams({ f: JSON.stringify({ valor: { min: 1 } }) });
    const emDolar = { ...LEAD, currency: "USD", value_cents: 500 };
    const recorte = (settings: unknown) => {
      quadro.estado = {
        data: { ...QUADRO, pipeline: { ...QUADRO.pipeline, settings }, leads: [emDolar] },
        isLoading: false,
        error: null,
      };
      const f = renderHook(() => useFichaDoNegocio("n1", "o1", busca)).result.current;
      return f.estado === "pronto" ? f.leadsDoRecorte.length : -1;
    };
    // Organização em BRL: sem moeda na origem, o negócio em USD fica fora do filtro de valor.
    expect(recorte({})).toBe(0);
    // Com a origem em USD, a moeda dela vale antes da da organização.
    expect(recorte({ escale_moeda: "USD" })).toBe(1);
  });
});

describe("<FichaDoNegocio>", () => {
  it("o caminho grupo › origem › negócio; a origem volta ao quadro com os filtros", () => {
    render(<FichaDoNegocio {...PROPS} />);
    const caminho = screen.getByRole("navigation", { name: "Caminho do negócio" });
    expect(caminho).toHaveTextContent("INSS Vendas");
    expect(screen.getByTestId("proximo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leads INSS Whatsapp" })).toHaveAttribute(
      "href",
      "/app/pipelines/o1?foo=1",
    );
    expect(
      screen.getByText("Ana | Nunes Regularize", { selector: "[aria-current='page']" }),
    ).toBeInTheDocument();
  });

  it("o cabeçalho: nome e lápis desligado (editar é 1H)", () => {
    render(<FichaDoNegocio {...PROPS} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Ana | Nunes Regularize" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar nome" })).toHaveAttribute(
      "title",
      "Em breve",
    );
    expect(screen.getByTestId("menu")).toBeInTheDocument();
    expect(screen.getByTestId("status")).toBeInTheDocument();
    expect(screen.getByTestId("dono")).toBeInTheDocument();
    expect(screen.getByTestId("acoes")).toBeInTheDocument();
  });

  it("as sete abas da Clint, Atividades por padrão, e trocar de aba vai na URL", async () => {
    render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getAllByRole("tab").map((a) => a.textContent)).toEqual([
      "Atividades",
      "Contato",
      "Empresa",
      "Negócio",
      "Conversas",
      "Arquivos",
      "Histórico",
    ]);
    expect(screen.getByRole("tab", { name: "Atividades" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("conteúdo atividades")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Histórico" }));
    // Só a URL muda, sem ir ao servidor.
    expect(window.location.pathname + window.location.search).toBe(
      "/app/negocios/n1?foo=1&aba=historico",
    );
    expect(nav.replace).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("trocar de aba mantém o pe da URL", async () => {
    nav.busca = "foo=1&pe=abc";
    render(<FichaDoNegocio {...PROPS} />);
    await userEvent.click(screen.getByRole("tab", { name: "Contato" }));
    expect(window.location.pathname + window.location.search).toBe(
      "/app/negocios/n1?foo=1&aba=contato&pe=abc",
    );
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("a aba da URL abre direto", () => {
    nav.busca = "aba=negocio";
    render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getByRole("tab", { name: "Negócio" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("conteúdo negocio")).toBeInTheDocument();
  });

  it("abrir a ficha põe o negócio nos Recentes, uma vez", () => {
    const { rerender } = render(<FichaDoNegocio {...PROPS} />);
    rerender(<FichaDoNegocio {...PROPS} />);
    expect(recentes.registrar).toHaveBeenCalledTimes(1);
    expect(recentes.registrar.mock.calls[0]![0]).toMatchObject({
      id: "n1",
      origemId: "o1",
      origem: "Leads INSS Whatsapp",
    });
  });

  it("negócio que sumiu: o texto da Clint e Voltar ao quadro", async () => {
    quadro.estado = { data: { ...QUADRO, leads: [] }, isLoading: false, error: null };
    render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getByText("Esse negócio não existe ou foi removido")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(nav.push).toHaveBeenCalledWith("/app/pipelines/o1?foo=1");
  });

  it("carregando e erro", () => {
    quadro.estado = { data: undefined, isLoading: true, error: null };
    const { unmount } = render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    unmount();
    quadro.estado = { data: undefined, isLoading: false, error: new Error("x") };
    render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getByText("Não consegui carregar este negócio.")).toBeInTheDocument();
  });
});
