import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const roteador = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const parametros = vi.hoisted(() => ({ atual: new URLSearchParams() }));
vi.mock("next/navigation", () => ({
  useRouter: () => roteador,
  useSearchParams: () => parametros.atual,
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org1", role: "agent" } }) }));
vi.mock("@/lib/escale/usa-tela-grande", () => ({ useTelaExtraGrande: () => false }));

type Consulta = Record<string, unknown>;
const q = vi.hoisted(() => ({
  contas: { data: [] as unknown[], isLoading: false } as Consulta,
  publicacoes: {} as Consulta,
  comentarios: {} as Consulta,
  sessoes: { contas: [] as unknown[] },
}));
vi.mock("@/hooks/escale/useComentarios", async (original) => ({
  ...((await original()) as object),
  useContasDaCaixa: () => q.contas,
  usePublicacoesDaCaixa: () => q.publicacoes,
  useComentariosDaPublicacao: () => q.comentarios,
  useContasSociais: () => ({ contas: q.sessoes.contas, carregando: false }),
}));
vi.mock("@/hooks/escale/useAcoesNoComentario", () => {
  const mutacao = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  return { useResponderComentario: mutacao, useDirectDoComentario: mutacao, useOcultarComentario: mutacao, useApagarComentario: mutacao };
});

import { BotaoDosComentarios } from "@/components/escale/conversas/fila/BotaoDosComentarios";
import { TelaDeComentarios } from "@/components/escale/conversas/comentarios/TelaDeComentarios";
import { ApiError } from "@/lib/api/types";

/** Fase 10A: a tela da caixa e a entrada na barra da fila — SEM TooltipProvider no wrapper (a tela traz o dela). */
const CONTA = { id: "canal-1", nome: "@oregis", plataforma: "instagram", conectada: true, podeApagar: false };
const publicacao = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  legenda: `Legenda ${id}`,
  miniatura: null,
  link: null,
  tipo: null,
  publicadaEm: "2026-10-01T12:00:00Z",
  ultimoComentarioEm: "2026-11-01T12:00:00Z",
  comentarios: 1234,
  semResposta: null,
  ...extra,
});
const paginas = (...p: unknown[]) => ({ data: { pages: [{ publicacoes: p, proximo: null }] } });

beforeEach(() => {
  roteador.push.mockReset();
  roteador.replace.mockReset();
  parametros.atual = new URLSearchParams();
  q.contas = { data: [CONTA], isLoading: false };
  q.publicacoes = { ...paginas(publicacao("p1"), publicacao("p2", { legenda: null, semResposta: 3 })), isLoading: false, isError: false, hasNextPage: false };
  q.comentarios = { data: undefined, isLoading: false, isError: false, hasNextPage: false };
  q.sessoes.contas = [];
});

describe("TelaDeComentarios", () => {
  it("lista as publicações: legenda, 'Sem legenda', total em pt-BR e contador só com sem-resposta", () => {
    render(<TelaDeComentarios />);
    expect(screen.getByText("Legenda p1")).toBeInTheDocument();
    expect(screen.getByText("Sem legenda")).toBeInTheDocument();
    expect(screen.getAllByText("1.234 comentários")).toHaveLength(2);
    expect(screen.getAllByTitle(/sem resposta/)).toHaveLength(1);
    expect(screen.getByText("Escolha uma publicação para ver os comentários.")).toBeInTheDocument();
  });

  it("abas: Comentários escolhida e Conversas leva a /app/inbox", async () => {
    render(<TelaDeComentarios />);
    expect(screen.getByRole("tab", { name: "Comentários" })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("tab", { name: "Conversas" }));
    expect(roteador.push).toHaveBeenCalledWith("/app/inbox");
  });

  it("escolher a publicação grava p na URL e limpa o comentário", async () => {
    parametros.atual = new URLSearchParams("conta=canal-1&c=antigo");
    render(<TelaDeComentarios />);
    await userEvent.click(screen.getByText("Legenda p1"));
    const url = roteador.replace.mock.calls[0]?.[0] as string;
    expect(url).toContain("/app/inbox/comentarios?");
    expect(url).toContain("p=p1");
    expect(url).not.toContain("c=");
  });

  it("trocar a conta limpa p e c", async () => {
    q.contas = { data: [CONTA, { ...CONTA, id: "canal-2", nome: "@outra" }], isLoading: false };
    parametros.atual = new URLSearchParams("conta=canal-1&p=p1&c=c1");
    render(<TelaDeComentarios />);
    await userEvent.click(screen.getByRole("combobox", { name: "Conta do Instagram" }));
    await userEvent.click(screen.getByRole("option", { name: /@outra/ }));
    const url = roteador.replace.mock.calls[0]?.[0] as string;
    expect(url).toContain("conta=canal-2");
    expect(url).not.toContain("p=");
    expect(url).not.toContain("c=");
  });

  it("'Carregar mais' aparece com cursor e chama a próxima página", async () => {
    const fetchNextPage = vi.fn();
    q.publicacoes = { ...(q.publicacoes as object), hasNextPage: true, fetchNextPage };
    render(<TelaDeComentarios />);
    await userEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it("estados: sem conta, desconectada, acesso recusado, vazio e erro", () => {
    q.contas = { data: [], isLoading: false };
    const { unmount } = render(<TelaDeComentarios />);
    expect(screen.getByText("Nenhuma conta do Instagram ou do Facebook liberada para você.")).toBeInTheDocument();
    unmount();

    q.contas = { data: [{ ...CONTA, conectada: false }], isLoading: false };
    const b = render(<TelaDeComentarios />);
    expect(screen.getByText("Esta conta está desconectada. Reconecte em Configurações › Canais.")).toBeInTheDocument();
    b.unmount();

    q.contas = { data: [CONTA], isLoading: false };
    q.publicacoes = { isLoading: false, isError: true, error: new ApiError(409, "acesso_recusado", undefined, "r"), data: undefined };
    const c = render(<TelaDeComentarios />);
    expect(screen.getByText(/O Zernio recusou o acesso/)).toBeInTheDocument();
    c.unmount();

    q.publicacoes = { ...paginas(), isLoading: false, isError: false };
    const d = render(<TelaDeComentarios />);
    expect(screen.getByText("Nenhuma publicação com comentários no período.")).toBeInTheDocument();
    d.unmount();

    q.publicacoes = { isLoading: false, isError: true, error: new Error("x"), data: undefined, refetch: vi.fn() };
    render(<TelaDeComentarios />);
    expect(screen.getByText("Erro ao carregar os comentários.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});

describe("BotaoDosComentarios", () => {
  it("sem conta social não aparece; com conta é o link para a caixa", () => {
    const { container } = render(<BotaoDosComentarios />);
    expect(container).toBeEmptyDOMElement();
    q.sessoes.contas = [{ id: "c", nome: "x", plataforma: "instagram", conectada: true }];
    render(<BotaoDosComentarios />);
    expect(screen.getByRole("link", { name: "Comentários" })).toHaveAttribute("href", "/app/inbox/comentarios");
  });
});
