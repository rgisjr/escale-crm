import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ComentarioDoContato, ComentariosDoContato } from "@/lib/escale/comentarios/origem";

vi.mock("@/hooks/i18n/useT", () => ({
  useT: () => (s: string, v?: Record<string, string | number>) =>
    v ? Object.entries(v).reduce((acc, [k, x]) => acc.replace(`{${k}}`, String(x)), s) : s,
}));

const consulta = vi.hoisted(() => ({
  estado: { data: undefined as unknown, isError: false, refetch: vi.fn() },
}));
vi.mock("@/hooks/escale/useComentariosDoContato", () => ({ useComentariosDoContato: () => consulta.estado }));

import { OrigemDoComentario } from "@/components/escale/contatos/ficha/OrigemDoComentario";

const comentario = (n: number, extra: Partial<ComentarioDoContato> = {}): ComentarioDoContato => ({
  id: `d${n}`,
  plataforma: "instagram",
  texto: `quero o material ${n}`,
  comentadoEm: "2026-11-01T13:05:00.000Z",
  repetido: false,
  publicacao: {
    id: "p1",
    legenda: "Meu reels",
    miniatura: null,
    link: "https://www.instagram.com/reel/abc/",
  },
  automacao: { id: "r1", nome: "Quero o Reels" },
  ...extra,
});

const dados = (origem: ComentarioDoContato | null, total = 1, recentes?: ComentarioDoContato[]): ComentariosDoContato => ({
  origem,
  recentes: recentes ?? (origem ? [origem] : []),
  total,
});

beforeEach(() => {
  consulta.estado = { data: undefined, isError: false, refetch: vi.fn() };
});

describe("OrigemDoComentario", () => {
  it("sem origem → nada", () => {
    consulta.estado.data = dados(null, 0);
    render(<OrigemDoComentario contatoId="c1" />);
    expect(screen.queryByText("Origem")).toBeNull();
  });

  it("com origem do Instagram mostra a publicação como link seguro, a automação, a data e o texto", () => {
    consulta.estado.data = dados(comentario(1));
    render(<OrigemDoComentario contatoId="c1" />);
    expect(screen.getByText("Origem")).toBeTruthy();
    expect(screen.getByText(/Comentário em/)).toBeTruthy();
    const link = screen.getByRole("link", { name: /Meu reels/ });
    expect(link.getAttribute("href")).toBe("https://www.instagram.com/reel/abc/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByText(/Quero o Reels/)).toBeTruthy();
    expect(screen.getByText(/\d{2}\/\d{2}\/2026 \d{2}:\d{2}$/)).toBeTruthy();
    expect(screen.getByText("“quero o material 1”")).toBeTruthy();
    expect(screen.queryByText(/Ver os/)).toBeNull();
  });

  it("sem link → legenda sem <a>; sem legenda → 'Sem legenda'; sem nome → 'Automação'", () => {
    consulta.estado.data = dados(
      comentario(1, {
        publicacao: { id: "p1", legenda: null, miniatura: null, link: null },
        automacao: { id: "r1", nome: "" },
      }),
    );
    render(<OrigemDoComentario contatoId="c1" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Sem legenda")).toBeTruthy();
    expect(screen.getByText(/Automação/)).toBeTruthy();
  });

  it("com vários comentários abre e fecha a lista, com o selo Repetido e o rodapé", async () => {
    const recentes = Array.from({ length: 10 }, (_, i) => comentario(i + 2, { repetido: i === 0 }));
    consulta.estado.data = dados(comentario(1), 12, recentes);
    render(<OrigemDoComentario contatoId="c1" />);
    const botao = screen.getByRole("button", { name: "Ver os 12 comentários" });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(botao);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getAllByText("Repetido")).toHaveLength(1);
    expect(screen.getByText("Mostrando os 10 mais recentes de 12.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Ocultar comentários" }));
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("erro → mensagem e 'Tentar de novo' chama refetch", async () => {
    consulta.estado = { data: undefined, isError: true, refetch: vi.fn() };
    render(<OrigemDoComentario contatoId="c1" />);
    expect(screen.getByRole("alert").textContent).toContain("Não foi possível carregar os comentários.");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(consulta.estado.refetch).toHaveBeenCalled();
  });
});
