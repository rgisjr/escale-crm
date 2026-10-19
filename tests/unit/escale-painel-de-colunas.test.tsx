import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PainelDeColunas } from "@/components/escale/contatos/PainelDeColunas";
import {
  COLUNAS_NATIVAS,
  COLUNAS_PADRAO,
  ROTULO_DA_COLUNA,
  camposDeColuna,
} from "@/lib/escale/contatos/regras";
import {
  COLUNAS_NATIVAS_DE_EMPRESAS,
  COLUNAS_PADRAO_DE_EMPRESAS,
  ROTULO_DA_COLUNA_DE_EMPRESA,
} from "@/lib/escale/empresas/regras";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const SEM_CATALOGO = camposDeColuna({ grupos: [], campos: [] });
const NATIVAS = COLUNAS_NATIVAS.map((c) => ({ chave: c, rotulo: ROTULO_DA_COLUNA[c] }));
/** As props que a lista de contatos passa ao painel (a lista de empresas passa as dela). */
const DOS_CONTATOS = (camposDoContato = SEM_CATALOGO) => ({
  nativas: NATIVAS,
  campos: camposDoContato,
  tituloDosCampos: "Campos do contato",
  padrao: COLUNAS_PADRAO,
});
const abrir = () => fireEvent.click(screen.getByRole("button", { name: "Personalizar colunas" }));

describe("PainelDeColunas (03-002)", () => {
  it("o botão mostra a contagem; o painel tem os três grupos", () => {
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={vi.fn()} {...DOS_CONTATOS()} />);
    expect(screen.getByRole("button", { name: "Personalizar colunas" })).toHaveTextContent("3");
    abrir();
    expect(screen.getByText("Na tabela · 3")).toBeInTheDocument();
    expect(screen.getByText("arraste para reordenar")).toBeInTheDocument();
    expect(screen.getByText("Colunas")).toBeInTheDocument();
    expect(screen.getByText("Campos do contato")).toBeInTheDocument();
  });

  it("desligar Tags tira a coluna; ligar Status põe no fim", () => {
    const aoMudar = vi.fn();
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={aoMudar} {...DOS_CONTATOS()} />);
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
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={vi.fn()} {...DOS_CONTATOS(camposDoContato)} />);
    abrir();
    const grupo = screen.getByText("Campos do contato").closest("section")!;
    const rotulos = within(grupo).getAllByRole("switch").map((s) => s.getAttribute("aria-label"));
    expect(rotulos.slice(0, 3)).toEqual(["Cargo", "Data de nascimento", "Facebook"]);
    expect(rotulos).toContain("Score");
  });

  it("empresas: as cinco nativas, 'Campos da empresa' e Redefinir volta ao padrão da Clint", () => {
    const aoMudar = vi.fn();
    const nativas = COLUNAS_NATIVAS_DE_EMPRESAS.map((c) => ({ chave: c, rotulo: ROTULO_DA_COLUNA_DE_EMPRESA[c] }));
    render(
      <PainelDeColunas
        itens={[{ tipo: "nativa", chave: "contato_principal" }]}
        aoMudar={aoMudar}
        nativas={nativas}
        campos={[{ chave: "site", rotulo: "Site", tipo: "url" }]}
        tituloDosCampos="Campos da empresa"
        padrao={COLUNAS_PADRAO_DE_EMPRESAS}
      />,
    );
    abrir();
    expect(screen.getByText("Na tabela · 1")).toBeInTheDocument();
    expect(screen.getByText("Campos da empresa")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Redefinir" }));
    expect(aoMudar).toHaveBeenCalledWith(COLUNAS_PADRAO_DE_EMPRESAS);
  });

  it("a busca filtra; sem resultado mostra 'Nada encontrado.'", () => {
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={vi.fn()} {...DOS_CONTATOS()} />);
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
    const { rerender } = render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={aoMudar} {...DOS_CONTATOS()} />);
    abrir();
    expect(screen.queryByRole("button", { name: "Redefinir" })).not.toBeInTheDocument();
    rerender(<PainelDeColunas itens={[{ tipo: "nativa", chave: "tags" }]} aoMudar={aoMudar} {...DOS_CONTATOS()} />);
    fireEvent.click(screen.getByRole("button", { name: "Redefinir" }));
    expect(aoMudar).toHaveBeenLastCalledWith(COLUNAS_PADRAO);
  });
});
