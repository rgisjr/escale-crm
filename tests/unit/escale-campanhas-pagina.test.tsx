import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PaginaDeCampanhas } from "@/lib/escale/campanhas/tipos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const cookie = { valor: undefined as string | undefined };
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookie.valor ? { value: cookie.valor } : undefined) }),
}));
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
const push = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (u: string) => redirect(u),
  useRouter: () => ({ push }),
}));
const org = { papel: "manager" as string };
vi.mock("@/lib/auth/server", () => ({
  requireAuth: async () => ({ id: "u1" }),
  resolveActiveOrg: async () => ({
    orgId: "org-1",
    role: org.papel,
    name: "Org",
    timezone: "America/Sao_Paulo",
  }),
}));
vi.mock("@/app/app/campaigns/_client", () => ({
  ListaDeCampanhas: () => <div>LISTA DO ORIGINAL</div>,
}));
vi.mock("@/app/app/prospecting/_client", () => ({
  ProspectingClient: () => <div>PROSPECÇÃO DO ORIGINAL</div>,
}));
vi.mock("@/hooks/channels/useChannelSessions", async (orig) => ({
  ...(await orig<object>()),
  useChannelSessions: () => ({
    data: [{ id: "s1", display_name: "Comercial", phone_number: null, waha_session_name: null }],
  }),
}));
const lista = {
  data: undefined as PaginaDeCampanhas | undefined,
  isLoading: false,
  isError: false,
};
vi.mock("@/hooks/escale/useCampanhasDaCasca", () => ({
  useCampanhasAoVivo: vi.fn(),
  useListaDeCampanhas: () => ({ ...lista, refetch: vi.fn() }),
  useResumoDasCampanhas: () => ({ data: undefined, isLoading: false }),
  useAcoesDaCampanha: () => ({ mutate: vi.fn(), isPending: false }),
}));

import CampanhasPage from "@/app/app/campaigns/page";
import ProspectingPage from "@/app/app/prospecting/page";
import { CampanhasDaCasca } from "@/components/escale/campanhas/CampanhasDaCasca";

const linhaPadrao = {
  id: "c1",
  nome: "10.09",
  status: "completed" as const,
  numeroId: "s1",
  solicitados: 30,
  agendadaPara: null,
  iniciadaEm: "2026-09-10T15:39:00Z",
  criadaEm: "2026-09-10T12:00:00Z",
  adicionados: 30,
  enviados: 26,
  entregues: 24,
  lidos: 16,
  erros: 3,
};

beforeEach(() => {
  cookie.valor = undefined;
  org.papel = "manager";
  redirect.mockClear();
  lista.data = undefined;
});

describe("/app/campaigns", () => {
  it("sem a casca, a lista do original", async () => {
    render(await CampanhasPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("LISTA DO ORIGINAL")).toBeInTheDocument();
  });

  it("com a casca, a lista da Clint; quem não é gerente vai para o Atendimento", async () => {
    cookie.valor = "topo";
    lista.data = { linhas: [linhaPadrao], total: 1, pagina: 1, porPagina: 10 };
    render(await CampanhasPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "WhatsApp" })).toBeInTheDocument();
    expect(screen.getByText("10.09")).toBeInTheDocument();
    org.papel = "agent";
    await expect(CampanhasPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT /app/inbox",
    );
  });

  it("?aba=prospeccao só vale para admin", async () => {
    cookie.valor = "topo";
    org.papel = "admin";
    render(await CampanhasPage({ searchParams: Promise.resolve({ aba: "prospeccao" }) }));
    expect(screen.getByText("PROSPECÇÃO DO ORIGINAL")).toBeInTheDocument();
  });
});

describe("/app/prospecting com a casca", () => {
  it("o admin vai para a aba Prospecção de Campanhas", async () => {
    cookie.valor = "topo";
    org.papel = "admin";
    await expect(ProspectingPage()).rejects.toThrow("REDIRECT /app/campaigns?aba=prospeccao");
  });
});

describe("CampanhasDaCasca", () => {
  it("gerente: sem a faixa de abas; admin: WhatsApp e Prospecção", () => {
    lista.data = { linhas: [linhaPadrao], total: 1, pagina: 1, porPagina: 10 };
    const { unmount } = render(
      <CampanhasDaCasca papel="manager" organizacaoId="org-1" aba="whatsapp" />,
    );
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    unmount();
    render(<CampanhasDaCasca papel="admin" organizacaoId="org-1" aba="whatsapp" />);
    expect(screen.getAllByRole("tab").map((a) => a.textContent)).toEqual([
      "WhatsApp",
      "Prospecção",
    ]);
  });

  it("sem nenhuma campanha: o vazio da Clint no lugar dos filtros, do resumo e da tabela", () => {
    lista.data = { linhas: [], total: 0, pagina: 1, porPagina: 10 };
    render(<CampanhasDaCasca papel="manager" organizacaoId="org-1" aba="whatsapp" />);
    expect(screen.getByRole("heading", { name: "Crie sua primeira campanha" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Buscar campanha")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resumo das campanhas" })).not.toBeInTheDocument();
  });

  it("até 10 campanhas sem rodapé; mais de 10 com a paginação", () => {
    lista.data = { linhas: [linhaPadrao], total: 10, pagina: 1, porPagina: 10 };
    const { unmount } = render(
      <CampanhasDaCasca papel="manager" organizacaoId="org-1" aba="whatsapp" />,
    );
    expect(screen.queryByRole("navigation", { name: "Paginação" })).not.toBeInTheDocument();
    unmount();
    lista.data = { linhas: [linhaPadrao], total: 25, pagina: 1, porPagina: 10 };
    render(<CampanhasDaCasca papel="manager" organizacaoId="org-1" aba="whatsapp" />);
    expect(screen.getByRole("navigation", { name: "Paginação" })).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
  });
});
