import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => true }));

const estado = vi.hoisted(() => ({
  contato: { id: "c1", name: "Reginaldo Apolinario", display_name: null, phone_number: "+5543998031566", is_merged_into: null as string | null },
  negocios: [{ id: "n1" }] as unknown[],
  sugestao: null as unknown,
}));
vi.mock("@/hooks/contacts/useContact", () => ({
  useContact: () => ({ data: { data: estado.contato }, isLoading: false, isError: false, error: null }),
}));
vi.mock("@/hooks/escale/useFichaDeNegociosDoContato", () => ({
  useFichaDeNegociosDoContato: () => ({ data: { negocios: estado.negocios, etapas: {} } }),
}));
vi.mock("@/hooks/escale/useEmpresaDoContato", () => ({ useEmpresaDoContato: () => ({ data: { id: "e1", nome: "Atlas" } }) }));
vi.mock("@/hooks/escale/useConversasDoContato", () => ({ useConversasDoContato: () => ({ data: [{ id: "cv1" }] }) }));
vi.mock("@/hooks/escale/useSugestoesDeMescla", () => ({ useSugestaoDoContato: () => estado.sugestao }));
vi.mock("@/components/escale/contatos/ficha/NomeDoContato", () => ({
  NomeDoContato: ({ nome }: { nome: string }) => <h2>{nome}</h2>,
}));
vi.mock("@/components/escale/negocio/abas/AbasDeCampos", () => ({
  ContatoEditavel: () => <div>aba-contato</div>,
  AbaEmpresa: () => <div>aba-empresa</div>,
}));
vi.mock("@/components/escale/negocio/TagsDaFicha", () => ({ TagsDoContato: () => <div>tags</div> }));
vi.mock("@/components/escale/negocio/abas/AbaConversas", () => ({ AbaConversas: () => <div>aba-conversas</div> }));
vi.mock("@/components/escale/negocio/abas/AbaArquivos", () => ({ AbaArquivos: () => <div>aba-arquivos</div> }));
vi.mock("@/components/escale/negocio/abas/AbaHistorico", () => ({ AbaHistorico: () => <div>aba-historico</div> }));
vi.mock("@/components/escale/contatos/ficha/AbaNegociosDoContato", () => ({ AbaNegociosDoContato: () => <div>aba-negocios</div> }));
vi.mock("@/components/escale/negocio/JanelaDeNota", () => ({
  JanelaDeNota: ({ aberta, alvo }: { aberta: boolean; alvo: { id: string } }) => (aberta ? <div>nota-de-{alvo.id}</div> : null),
}));

import { JanelaDoContato } from "@/components/escale/contatos/ficha/JanelaDoContato";

const props = {
  contatoId: "c1",
  aba: "contato" as const,
  aoMudarAba: vi.fn(),
  aoTrocarContato: vi.fn(),
  aoFechar: vi.fn(),
  podeCriarNegocio: true,
  podeMesclar: true,
  aoAdicionarNegocio: vi.fn(),
  aoRevisarDuplicado: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  estado.contato.is_merged_into = null;
  estado.negocios = [{ id: "n1" }];
  estado.sugestao = null;
});

describe("JanelaDoContato (Fase 2E, C3; print 2b-10)", () => {
  it("título, cabeçalho com a empresa, ligar, conversa e nota", () => {
    render(<JanelaDoContato {...props} />);
    expect(screen.getByRole("dialog", { name: "Informações do contato" })).toBeInTheDocument();
    expect(screen.getByText("Atlas")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reginaldo Apolinario" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chamar" })).toHaveAttribute("href", "tel:+5543998031566");
    expect(screen.getByRole("link", { name: "Abrir em Conversas" })).toHaveAttribute("href", "/app/inbox?id=cv1");
    fireEvent.click(screen.getByRole("button", { name: "Nova nota" }));
    expect(screen.getByText("nota-de-c1")).toBeInTheDocument();
  });

  it("as seis abas da Clint, na ordem; Negócios só com negócio", () => {
    const { unmount } = render(<JanelaDoContato {...props} />);
    expect(screen.getAllByRole("tab").map((a) => a.textContent)).toEqual([
      "Contato", "Empresa", "Negócios", "Conversas", "Arquivos", "Histórico",
    ]);
    expect(screen.getByText("aba-contato")).toBeInTheDocument();
    expect(screen.getByText("tags")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Histórico" }));
    expect(props.aoMudarAba).toHaveBeenCalledWith("historico");
    unmount();
    estado.negocios = [];
    render(<JanelaDoContato {...props} aba="negocios" />);
    expect(screen.queryByRole("tab", { name: "Negócios" })).toBeNull();
    expect(screen.getByText("aba-contato")).toBeInTheDocument();
  });

  it("'Adicionar negócio' entrega o contato; o ⋮ leva à página completa", async () => {
    render(<JanelaDoContato {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar negócio" }));
    expect(props.aoAdicionarNegocio).toHaveBeenCalledWith({
      id: "c1", nome: "Reginaldo Apolinario", display_name: null, telefone: "+5543998031566",
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Mais" }), { button: 0, ctrlKey: false });
    expect(await screen.findByRole("menuitem", { name: "Abrir página completa" })).toHaveAttribute(
      "href", "/app/contacts/c1?pagina=completa",
    );
  });

  it("'Possível duplicado' só com sugestão e para quem mescla", () => {
    const { rerender } = render(<JanelaDoContato {...props} />);
    expect(screen.queryByRole("button", { name: "Possível duplicado" })).toBeNull();
    estado.sugestao = { chave: "c0" };
    rerender(<JanelaDoContato {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Possível duplicado" }));
    expect(props.aoRevisarDuplicado).toHaveBeenCalledWith("c1");
    rerender(<JanelaDoContato {...props} podeMesclar={false} />);
    expect(screen.queryByRole("button", { name: "Possível duplicado" })).toBeNull();
  });

  it("contato mesclado por fora troca para o vencedor; o ✕ fecha", () => {
    estado.contato.is_merged_into = "c9";
    render(<JanelaDoContato {...props} />);
    expect(props.aoTrocarContato).toHaveBeenCalledWith("c9");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Fechar" }));
    expect(props.aoFechar).toHaveBeenCalled();
  });
});
