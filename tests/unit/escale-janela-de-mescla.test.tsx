import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaDeMescla } from "@/components/escale/contatos/mescla/JanelaDeMescla";
import type { ContatoDaMescla, Sugestao } from "@/lib/escale/mescla/regras";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const c = (id: string, extra: Partial<ContatoDaMescla> = {}): ContatoDaMescla => ({
  id, nome: null, telefone: null, email: null, instagram: null, whatsapp: null, empresa: null, tags: [],
  criado_em: "2026-10-01T10:00:00Z", atualizado_em: "2026-10-01T10:00:00Z", atendimento_ativo: false, ...extra,
});
const ANA: Sugestao = {
  chave: "a1",
  contatos: [
    c("a1", { nome: "Ana", telefone: "+5543998031566" }),
    c("a2", { nome: "Ana Souza", telefone: "+5543998031566", email: "ana@x.com" }),
  ],
  casou: ["telefone"], conflitos: [], confianca: 90, bloqueada: false, criada_em: "2026-10-02T10:00:00Z",
};
const BETO: Sugestao = {
  chave: "b1",
  contatos: [c("b1", { nome: "Beto", atendimento_ativo: true }), c("b2", { nome: "Beto", atendimento_ativo: true })],
  casou: ["email", "nome"], conflitos: ["telefone"], confianca: 70, bloqueada: true, criada_em: "2026-10-03T10:00:00Z",
};

const chamadas: Array<{ url: string; metodo: string; corpo?: unknown }> = [];
beforeEach(() => {
  chamadas.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      chamadas.push({ url, metodo: init?.method ?? "GET", corpo: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.startsWith("/api/v1/mesclas/sugestoes")) return Response.json({ data: [ANA, BETO], meta: { total: 2 } });
      if (url === "/api/v1/mesclas") return Response.json({ data: { contato_id: "a2", contatos_mesclados: ["a1"] } });
      return Response.json({ data: { mesclados: [], falhas: [] } });
    }),
  );
});

function montar(extra: Partial<Parameters<typeof JanelaDeMescla>[0]> = {}) {
  const props = { aberta: true, aoFechar: vi.fn(), aoMesclar: vi.fn(), aoVerContato: vi.fn(), ...extra };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><JanelaDeMescla {...props} /></QueryClientProvider>);
  return props;
}

describe("JanelaDeMescla (Fase 2E, C2)", () => {
  it("a lista com a confiança e o vazio da direita", async () => {
    montar();
    expect(screen.getByRole("dialog", { name: "Mesclar contatos duplicados" })).toBeInTheDocument();
    expect(await screen.findByText("90% · Alta")).toBeInTheDocument();
    expect(screen.getByText("70% · Média")).toBeInTheDocument();
    expect(screen.getByText("2 sugestões")).toBeInTheDocument();
    expect(screen.getByText("Selecione uma sugestão para mesclar")).toBeInTheDocument();
  });

  it("escolher por campo, ver o resultante, confirmar e mesclar", async () => {
    const props = montar();
    fireEvent.click(await screen.findByRole("button", { name: /^Ana, Ana Souza/ }));
    expect(screen.getByText("Comparar contatos e escolher por campo")).toBeInTheDocument();
    expect(screen.getByText(/1 campos a decidir/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nome: Ana Souza" }));
    const resultante = screen.getByRole("region", { name: "Contato resultante" });
    expect(within(resultante).getByText("Ana Souza")).toBeInTheDocument();
    expect(within(resultante).getByText("ana@x.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mesclar contatos para Ana Souza" }));
    expect(screen.getByText("Confirmar mescla irreversível")).toBeInTheDocument();
    const confirmar = screen.getByRole("button", { name: "Confirmar e mesclar (2)" });
    expect(confirmar).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Entendo que a mescla é definitiva e não pode ser desfeita." }));
    fireEvent.click(confirmar);
    await waitFor(() =>
      expect(chamadas).toContainEqual({
        url: "/api/v1/mesclas",
        metodo: "POST",
        corpo: { principal_id: "a2", secundarios: ["a1"], escolhas: { nome: "a2", email: "a2", telefone: "a1" } },
      }),
    );
    expect(await screen.findByText("Contatos mesclados")).toBeInTheDocument();
    expect(screen.getByText("2 contatos mesclados.")).toBeInTheDocument();
    expect(props.aoMesclar).toHaveBeenCalledWith({ contato_id: "a2", contatos_mesclados: ["a1"] });
    fireEvent.click(screen.getByRole("button", { name: "Ver contato" }));
    expect(props.aoVerContato).toHaveBeenCalledWith("a2");
  });

  it("grupo com dois atendimentos ativos fica bloqueado", async () => {
    montar();
    fireEvent.click(await screen.findByRole("button", { name: /^Beto, Beto/ }));
    expect(screen.getByText("Atendimento ativo impede a mescla deste grupo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mesclar contatos para/ })).toBeDisabled();
  });

  it("aberta pelo contato, já vem na sugestão dele", async () => {
    montar({ contatoInicial: "a2" });
    await waitFor(() => expect(chamadas.some((ch) => ch.url.includes("contato=a2"))).toBe(true));
    expect(await screen.findByText("Comparar contatos e escolher por campo")).toBeInTheDocument();
  });

  it("em massa: duas marcadas, o critério e o pedido com os grupos", async () => {
    const outra: Sugestao = { ...ANA, chave: "c1", contatos: [c("c1", { nome: "Caio" }), c("c2", { nome: "Caio" })] };
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      chamadas.push({ url: String(url), metodo: init?.method ?? "GET", corpo: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (String(url).startsWith("/api/v1/mesclas/sugestoes")) return Response.json({ data: [ANA, outra], meta: { total: 2 } });
      return Response.json({ data: { mesclados: [{ contato_id: "a1", contatos_mesclados: ["a2"] }, { contato_id: "c1", contatos_mesclados: ["c2"] }], falhas: [] } });
    });
    montar();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Selecionar todos (2)" }));
    expect(screen.getByText("Mesclando em massa")).toBeInTheDocument();
    expect(screen.getByText("2 marcadas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mesclar 2 grupos selecionados" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Entendo que a mescla é definitiva e não pode ser desfeita." }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e mesclar (2)" }));
    await waitFor(() =>
      expect(chamadas).toContainEqual({
        url: "/api/v1/mesclas/em-massa",
        metodo: "POST",
        corpo: { grupos: [["a1", "a2"], ["c1", "c2"]], prioridade: "criado_por_ultimo" },
      }),
    );
    expect(await screen.findByText("2 contatos mesclados.")).toBeInTheDocument();
  });
});
