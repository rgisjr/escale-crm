import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/escale/campos/JanelaDeGerenciarCampos", () => ({ JanelaDeGerenciarCampos: () => null }));

import { PassoMapeamento } from "@/components/escale/importacao/PassoMapeamento";
import { opcoesDoMapeamento } from "@/lib/escale/importacao/mapeamento";

const vazio = { grupos: [], campos: [] };
const opcoes = opcoesDoMapeamento("contato", { contato: vazio, empresa: vazio, negocio: vazio });

describe("passo Mapeamento (Fase 2F; print v2-08)", () => {
  it("uma linha por coluna, com o destino escolhido ou 'Não importar esse campo'", () => {
    render(
      <PassoMapeamento
        tipo="contato"
        mapa={[{ csv: "Cliente", para: "none" }, { csv: "Celular", para: "phone" }]}
        opcoes={opcoes}
        podeCriarCampo={false}
        aoMudar={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Mapeie os campos do seu arquivo" })).toBeInTheDocument();
    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Campo da coluna Celular" })).toHaveTextContent("Telefone");
    expect(screen.getByRole("combobox", { name: "Campo da coluna Cliente" })).toHaveTextContent("Não importar esse campo");
    expect(screen.getByRole("button", { name: /Adicionar campo/ })).toBeDisabled();
  });

  it("o aviso sem o nome da empresa", () => {
    render(<PassoMapeamento tipo="contato" mapa={[{ csv: "Cidade", para: "org:cidade" }]} opcoes={opcoes} podeCriarCampo aoMudar={vi.fn()} />);
    expect(screen.getByText(/Nenhuma coluna está associada ao Nome da empresa/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar campo/ })).toBeEnabled();
  });
});
