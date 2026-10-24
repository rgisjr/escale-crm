import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/channels/SeletorDeCanalParaConversa", () => ({
  useConversaNovaComEscolhaDeCanal: () => ({
    iniciarConversa: vi.fn(),
    abrindo: false,
    seletor: null,
  }),
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({ useCorDaEtiqueta: () => null }));

import { CelulaNegocios } from "@/components/escale/contatos/CelulasDoContato";
import { TabelaDeContatos } from "@/components/escale/contatos/TabelaDeContatos";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { COLUNAS_PADRAO } from "@/lib/escale/contatos/regras";

const ID = "11111111-2222-4333-8444-555555555555";
const linha = {
  id: ID, nome: "Ana Souza", display_name: null, telefone: "+5543998031566", email: null, instagram: null,
  tags: [], tem_foto: false, conversa_id: null, negocios: 2, negocio_unico: null, status: "ativo",
  ultima_atividade: null, criado_em: "2026-10-01T10:00:00Z", origem: "manual", nascimento: null, links: {},
} as unknown as LinhaDeContato;

describe("a lista abre a janela do contato (Fase 2E, N4)", () => {
  it("o nome abre na aba Contato, sem recarregar, e o link continua", () => {
    const aoAbrir = vi.fn();
    // O ⋮ da linha usa o React Query (vínculos e excluir): a tabela precisa do provedor.
    render(
      <QueryClientProvider client={new QueryClient()}>
      <TabelaDeContatos
        linhas={[linha]}
        colunas={COLUNAS_PADRAO}
        carregando={false}
        erro={false}
        aoTentarDeNovo={() => undefined}
        podeVerNegocios
        podeExcluir={false}
        aoAdicionarNegocio={() => undefined}
        aoAbrirContato={aoAbrir}
      />
      </QueryClientProvider>,
    );
    const nome = screen.getByRole("link", { name: "Ana Souza" });
    expect(nome).toHaveAttribute("href", `/app/contacts/${ID}`);
    const evento = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    nome.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
    expect(aoAbrir).toHaveBeenCalledWith(ID, "contato");
  });

  it("'Ver 2 negócios' abre na aba Negócios", () => {
    const aoVer = vi.fn();
    render(<CelulaNegocios linha={linha} aoAdicionar={() => undefined} aoVerNegocios={aoVer} />);
    fireEvent.click(screen.getByRole("link", { name: "Ver 2 negócios" }));
    expect(aoVer).toHaveBeenCalled();
  });

  it("a página do [id] tem o encaixe da casca e a saída para a página completa", () => {
    const pagina = readFileSync("app/app/contacts/[id]/page.tsx", "utf8");
    expect(pagina).toContain("FORK ESCALE · Fase 2E");
    expect(pagina).toContain("<ListaDeContatos");
    expect(pagina).toContain('"completa"');
  });
});
