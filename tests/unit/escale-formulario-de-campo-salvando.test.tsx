import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FormularioDeCampo } from "@/components/escale/campos/FormularioDeCampo";
import { ErroDoCatalogoNoCliente } from "@/hooks/escale/useCatalogoDeCampos";
import { CATALOGO_VAZIO } from "@/lib/escale/campos/regras";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const grupo = { id: "g1", chave: "equipe", nome: "Equipe e origem", posicao: 0, padrao: false };
const catalogo = { ...CATALOGO_VAZIO, grupos: [grupo] };

function preencher() {
  fireEvent.change(screen.getByLabelText("Nome do campo"), { target: { value: "Link WhatsApp" } });
  fireEvent.click(screen.getByRole("radio", { name: "Texto" }));
}

/** Frente E (29/10/2026): o Salvar só ficava desbotado; a pessoa achava que travou. */
describe("FormularioDeCampo enquanto grava (Frente E)", () => {
  it("mostra 'Salvando…', desabilita Salvar e Cancelar, Esc não fecha, e volta ao normal ao terminar", async () => {
    let resolver: (v: unknown) => void = () => {};
    const aoSalvar = vi.fn(() => new Promise((r) => { resolver = r; }));
    const aoFechar = vi.fn();
    render(<FormularioDeCampo objeto="negocio" catalogo={catalogo} grupoSugerido={grupo} aoFechar={aoFechar} aoSalvar={aoSalvar} aoCriarGrupo={vi.fn()} />);
    preencher();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByRole("button", { name: "Salvando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(aoFechar).not.toHaveBeenCalled();
    resolver(undefined);
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled());
  });

  it("quando o tempo estoura, mostra a mensagem do catálogo e libera os botões", async () => {
    const aoSalvar = vi.fn(() => Promise.reject(new ErroDoCatalogoNoCliente("Demorou demais. Confira a lista e tente de novo.", true)));
    render(<FormularioDeCampo objeto="negocio" catalogo={catalogo} grupoSugerido={grupo} aoFechar={vi.fn()} aoSalvar={aoSalvar} aoCriarGrupo={vi.fn()} />);
    preencher();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Demorou demais. Confira a lista e tente de novo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
  });
});
