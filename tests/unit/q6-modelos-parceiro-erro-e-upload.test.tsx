import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * B6-6: erro ao listar os modelos não pode virar "Nenhum modelo espelhado".
 * B6-9: o upload da imagem do cabeçalho não pode falhar em silêncio (fetch que
 * lança, ou 413 do proxy devolvendo HTML).
 */
const getMock = vi.fn();
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: (...a: unknown[]) => getMock(...a), post: vi.fn() },
}));
const toastErro = vi.fn();
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: (m: string) => toastErro(m) } }));

import { TemplatesParceiroClient } from "@/components/connections/TemplatesParceiroClient";

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TemplatesParceiroClient />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getMock.mockReset();
  toastErro.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("modelos do parceiro", () => {
  it("erro de listagem mostra aviso com 'Tentar de novo', não o vazio", async () => {
    getMock.mockRejectedValueOnce(new Error("500"));
    montar();
    expect(await screen.findByText("Não foi possível carregar os modelos.")).toBeTruthy();
    expect(screen.queryByText(/Nenhum modelo espelhado/)).toBeNull();
    getMock.mockResolvedValueOnce({ data: { templates: [] } });
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText(/Nenhum modelo espelhado/)).toBeTruthy();
  });

  it.each([
    ["fetch lança", () => Promise.reject(new Error("rede"))],
    ["413 em HTML", () => Promise.resolve(new Response("<html>413</html>", { status: 413 }))],
  ])("upload com %s avisa o operador", async (_nome, resposta) => {
    getMock.mockResolvedValue({ data: { templates: [] } });
    vi.stubGlobal("fetch", vi.fn(resposta));
    montar();
    fireEvent.click(await screen.findByRole("button", { name: "Criar modelo" }));
    const input = await screen.findByLabelText("Imagem do cabeçalho");
    const arquivo = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [arquivo] } });
    await waitFor(() => expect(toastErro).toHaveBeenCalledWith("Não consegui subir a imagem."));
  });
});
