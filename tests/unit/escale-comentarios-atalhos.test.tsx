import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/webhooks/useAutomationRules", () => ({
  useResendAutomationRun: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/app/app/webhooks/_components/ActivityTab", () => ({ explicacaoDe: () => null }));
vi.mock("@/components/escale/contatos/FotoDaLinha", () => ({ FotoDaLinha: () => <span /> }));

import { CartaoDaExecucao } from "@/components/escale/automacoes/fluxo/insights/CartaoDaExecucao";
import type { LinhaDaExecucao } from "@/lib/escale/automacoes/insights/tipos";

const LINHA: LinhaDaExecucao = {
  id: "x1",
  status: "success",
  criadaEm: "2026-11-01T10:00:00Z",
  eventoId: "ev1",
  resultados: [],
  contato: { id: "k1", nome: "Elza", telefone: null, email: null, temFoto: false },
  negocio: { id: "n1", titulo: "Negócio" },
  publicacao: { legenda: "Meu reels", link: "https://www.instagram.com/reel/abc/" },
};

const montar = (comentario?: boolean, linha: LinhaDaExecucao = LINHA) =>
  render(
    <ul>
      <CartaoDaExecucao linha={linha} acoes={[]} fuso="America/Sao_Paulo" comentario={comentario} />
    </ul>,
  );

describe("atalhos do Insights de comentário (Fase 10C)", () => {
  it("com comentario: Ver contato leva à janela do contato e Ver publicação abre a publicação", () => {
    montar(true);
    expect(screen.getByRole("link", { name: "Ver contato" }).getAttribute("href")).toBe("/app/contacts/k1");
    const pub = screen.getByRole("link", { name: /Ver publicação/ });
    expect(pub.getAttribute("href")).toBe("https://www.instagram.com/reel/abc/");
    expect(pub.getAttribute("target")).toBe("_blank");
    expect(pub.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByRole("link", { name: "Ver negócio" })).toBeTruthy();
  });

  it("sem link não há Ver publicação; sem contato não há Ver contato", () => {
    montar(true, { ...LINHA, contato: null, publicacao: { legenda: null, link: null } });
    expect(screen.queryByRole("link", { name: /Ver publicação/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Ver contato" })).toBeNull();
  });

  it("sem comentario, nenhum dos dois atalhos", () => {
    montar(false);
    expect(screen.queryByRole("link", { name: "Ver contato" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Ver publicação/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Ver negócio" })).toBeTruthy();
  });
});
