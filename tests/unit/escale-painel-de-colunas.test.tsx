import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PainelDeColunas } from "@/components/escale/contatos/PainelDeColunas";
import { COLUNAS_PADRAO, camposDeColuna } from "@/lib/escale/contatos/regras";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const SEM_CATALOGO = camposDeColuna({ grupos: [], campos: [] });
const abrir = () => fireEvent.click(screen.getByRole("button", { name: "Personalizar colunas" }));

describe("PainelDeColunas (03-002)", () => {
  it("o botão mostra a contagem; o painel tem os três grupos", () => {
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={vi.fn()} camposDoContato={SEM_CATALOGO} />);
    expect(screen.getByRole("button", { name: "Personalizar colunas" })).toHaveTextContent("3");
    abrir();
    expect(screen.getByText("Na tabela · 3")).toBeInTheDocument();
    expect(screen.getByText("arraste para reordenar")).toBeInTheDocument();
    expect(screen.getByText("Colunas")).toBeInTheDocument();
    expect(screen.getByText("Campos do contato")).toBeInTheDocument();
  });

  it("desligar Tags tira a coluna; ligar Status põe no fim", () => {
    const aoMudar = vi.fn();
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={aoMudar} camposDoContato={SEM_CATALOGO} />);
    abrir();
    fireEvent.click(screen.getByRole("switch", { name: "Tags" }));
    expect(aoMudar).toHaveBeenLastCalledWith([
      { tipo: "nativa", chave: "contato" },
      { tipo: "nativa", chave: "negocios" },
    ]);
    fireEvent.click(screen.getByRole("switch", { name: "Status" }));
    expect(aoMudar).toHaveBeenLastCalledWith([
      ...COLUNAS_PADRAO,
      { tipo: "nativa", chave: "status" },
    ]);
  });

  it("o grupo Campos do contato lista o catálogo em ordem alfabética, junto com nascimento e links", () => {
    const camposDoContato = camposDeColuna({
      grupos: [],
      campos: [
        { id: "c1", objeto: "contato", chave: "cargo", definicao: { label: "Cargo", type: "text" }, grupo_id: null, papel_minimo: null, posicao: 0, padrao: false },
        { id: "c2", objeto: "contato", chave: "score", definicao: { label: "Score", type: "number" }, grupo_id: null, papel_minimo: null, posicao: 1, padrao: false },
      ],
    });
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={vi.fn()} camposDoContato={camposDoContato} />);
    abrir();
    const grupo = screen.getByText("Campos do contato").closest("section")!;
    const rotulos = within(grupo).getAllByRole("switch").map((s) => s.getAttribute("aria-label"));
    expect(rotulos.slice(0, 3)).toEqual(["Cargo", "Data de nascimento", "Facebook"]);
    expect(rotulos).toContain("Score");
  });

  it("a busca filtra; sem resultado mostra 'Nada encontrado.'", () => {
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={vi.fn()} camposDoContato={SEM_CATALOGO} />);
    abrir();
    fireEvent.change(screen.getByPlaceholderText("Buscar coluna ou campo"), {
      target: { value: "nasc" },
    });
    expect(screen.getByRole("switch", { name: "Data de nascimento" })).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Tags" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar coluna ou campo"), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("Nada encontrado.")).toBeInTheDocument();
  });

  it("'Redefinir' só aparece fora do padrão e volta ao padrão", () => {
    const aoMudar = vi.fn();
    const { rerender } = render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={aoMudar} camposDoContato={SEM_CATALOGO} />);
    abrir();
    expect(screen.queryByRole("button", { name: "Redefinir" })).not.toBeInTheDocument();
    rerender(<PainelDeColunas itens={[{ tipo: "nativa", chave: "tags" }]} aoMudar={aoMudar} camposDoContato={SEM_CATALOGO} />);
    fireEvent.click(screen.getByRole("button", { name: "Redefinir" }));
    expect(aoMudar).toHaveBeenLastCalledWith(COLUNAS_PADRAO);
  });
});
