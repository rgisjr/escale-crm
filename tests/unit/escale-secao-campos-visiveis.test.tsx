import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const G1 = "00000000-0000-4000-8000-0000000000a1";
const campo = (chave: string, label: string) => ({
  id: `c-${chave}`,
  objeto: "contato",
  chave,
  definicao: { label, type: "text" },
  grupo_id: G1,
  papel_minimo: null,
  posicao: 0,
  padrao: false,
});
vi.mock("@/hooks/escale/useCatalogoDeCampos", () => ({
  useCatalogoDeCampos: () => ({
    catalogo: {
      grupos: [{ id: G1, chave: "informacoes_gerais", nome: "Informações Gerais", posicao: 0, padrao: true }],
      campos: [campo("cargo", "Cargo"), campo("score", "Score")],
    },
    carregando: false,
    erro: false,
  }),
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { SecaoCamposVisiveis } from "@/components/escale/configuracoes/SecaoCamposVisiveis";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { RascunhoDaOrigem } from "@/lib/escale/configuracoes/rascunho";

const config = (extra: Partial<ConfiguracoesDaOrigem> = {}) =>
  ({
    pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
    ocultosDoGrupo: { usar_do_grupo: false, contato: ["score"], negocio: [], empresa: [] },
    podeAdministrar: true,
    ...extra,
  }) as unknown as ConfiguracoesDaOrigem;
const rascunho = (camposOcultos: RascunhoDaOrigem["camposOcultos"]) => ({ camposOcultos }) as unknown as RascunhoDaOrigem;
const VAZIO = { usar_do_grupo: false, contato: [], negocio: [], empresa: [] };

describe("SecaoCamposVisiveis (HiddenFields da Clint)", () => {
  it("a aba Contato lista os campos com interruptores ligados; desligar Cargo chama mudar com contato: ['cargo']", async () => {
    const mudar = vi.fn();
    render(<TooltipProvider><SecaoCamposVisiveis config={config()} rascunho={rascunho(VAZIO)} mudar={mudar} /></TooltipProvider>);
    expect(screen.getByRole("switch", { name: "Cargo" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("switch", { name: "Cargo" }));
    const f = mudar.mock.calls[0]![0] as (r: RascunhoDaOrigem) => RascunhoDaOrigem;
    expect(f(rascunho(VAZIO)).camposOcultos.contato).toEqual(["cargo"]);
  });

  it("'Utilizar a mesma configuração do grupo' desliga os interruptores e mostra a lista do grupo", async () => {
    const mudar = vi.fn();
    const { rerender } = render(<TooltipProvider><SecaoCamposVisiveis config={config()} rascunho={rascunho(VAZIO)} mudar={mudar} /></TooltipProvider>);
    await userEvent.click(screen.getByRole("checkbox", { name: "Utilizar a mesma configuração do grupo" }));
    const f = mudar.mock.calls[0]![0] as (r: RascunhoDaOrigem) => RascunhoDaOrigem;
    expect(f(rascunho(VAZIO)).camposOcultos.usar_do_grupo).toBe(true);
    rerender(<TooltipProvider><SecaoCamposVisiveis config={config()} rascunho={rascunho({ ...VAZIO, usar_do_grupo: true })} mudar={mudar} /></TooltipProvider>);
    expect(screen.getByRole("switch", { name: "Cargo" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Score" })).toHaveAttribute("aria-checked", "false");
  });

  it("sem lista do grupo, a caixa fica desligada; sem ser administrador, nada se mexe", () => {
    render(<TooltipProvider><SecaoCamposVisiveis config={config({ ocultosDoGrupo: null, podeAdministrar: false })} rascunho={rascunho(VAZIO)} mudar={vi.fn()} /></TooltipProvider>);
    expect(screen.getByRole("checkbox", { name: "Utilizar a mesma configuração do grupo" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: "Cargo" })).toBeDisabled();
  });
});
