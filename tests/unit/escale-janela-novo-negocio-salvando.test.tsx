import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { JanelaNovoNegocio } from "@/components/escale/contatos/JanelaNovoNegocio";
import { apiClient } from "@/lib/api/client";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ apiClient: { post: vi.fn() } }));
// Origem e etapa já escolhidas: o teste é sobre o estado de gravação, não sobre os seletores.
vi.mock("@/components/escale/contatos/CamposDaOportunidade", () => ({
  CamposDaOportunidade: ({ aoMudar }: { aoMudar: (v: { origemId: string; etapaId: string }) => void }) => (
    <button type="button" onClick={() => aoMudar({ origemId: "o1", etapaId: "e1" })}>escolher</button>
  ),
}));

const contato = { id: "c1", nome: "Ana", display_name: null, telefone: "+5511999999999" } as never;
const origens = [{ id: "o1", nome: "Vendas", etapas: [{ id: "e1", nome: "Novo" }] }];

/** Frente F (29/10/2026): mesmo padrão do Novo contato e do Adicionar campo. */
describe("JanelaNovoNegocio enquanto grava (Frente F)", () => {
  it("'Salvando…', Cancelar desabilitado e Esc não fecha enquanto o POST não responde", async () => {
    vi.mocked(apiClient.post).mockImplementation(() => new Promise(() => {}));
    const aoFechar = vi.fn();
    render(<QueryClientProvider client={new QueryClient()}><JanelaNovoNegocio contato={contato} aoFechar={aoFechar} origens={origens} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "escolher" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar negócio" }));
    expect(await screen.findByRole("button", { name: "Salvando…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(aoFechar).not.toHaveBeenCalled();
  });
});
