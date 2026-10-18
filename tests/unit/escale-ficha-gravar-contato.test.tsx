import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContactPatch } from "@/lib/schemas/contacts";

const servidor = vi.hoisted(() => ({
  contato: {} as Record<string, unknown>,
  mutateAsync: vi.fn(),
}));
vi.mock("@/hooks/contacts/useUpdateContact", () => ({
  useUpdateContact: () => ({ mutateAsync: servidor.mutateAsync }),
}));

import { useGravarContato } from "@/hooks/escale/useGravarContato";

/** FORK ESCALE · Fase 1H (N4): gravar o contato invalida o quadro, que é de onde a ficha lê. */
function montar(qc: QueryClient) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useGravarContato("c1", "o1"), { wrapper }).result;
}

type Cache = { data: { custom_fields: Record<string, unknown> } };

beforeEach(() => {
  servidor.contato = { id: "c1", name: "Ana", custom_fields: { cargo: "CEO" } };
  servidor.mutateAsync.mockReset();
  // O servidor aplica o patch e devolve o contato inteiro, como o PATCH do original.
  servidor.mutateAsync.mockImplementation(async (patch: ContactPatch) => {
    await new Promise((r) => setTimeout(r, 5));
    servidor.contato = { ...servidor.contato, ...patch };
    return { data: servidor.contato };
  });
});

describe("useGravarContato", () => {
  it("manda o patch e invalida o quadro da origem e a linha do tempo", async () => {
    const qc = new QueryClient();
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    const result = montar(qc);
    await result.current.gravar({ name: "Ana" });
    expect(servidor.mutateAsync).toHaveBeenCalledWith({ name: "Ana" });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["board", "o1"] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["timeline"] });
  });

  // Revisão final (I1): o patch da segunda gravação é montado sobre a resposta da primeira.
  it("duas gravações seguidas: a segunda leva os dois valores", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["contact", "c1"], { data: servidor.contato });
    const result = montar(qc);
    const comCampo = (chave: string, valor: string) => (atual: Cache["data"]) => ({
      custom_fields: { ...atual.custom_fields, [chave]: valor },
    });
    await Promise.all([
      result.current.gravar(comCampo("a", "1")),
      result.current.gravar(comCampo("b", "2")),
    ]);
    expect(servidor.mutateAsync).toHaveBeenCalledTimes(2);
    expect(servidor.mutateAsync.mock.calls[1]![0]).toEqual({
      custom_fields: { cargo: "CEO", a: "1", b: "2" },
    });
    expect(qc.getQueryData<Cache>(["contact", "c1"])?.data.custom_fields).toEqual({
      cargo: "CEO",
      a: "1",
      b: "2",
    });
  });

  // Revisão final (C1): sem o contato carregado não há base para o `custom_fields` inteiro.
  it("sem o contato no cache, o patch montado não é enviado", async () => {
    const qc = new QueryClient();
    const result = montar(qc);
    await expect(
      result.current.gravar((atual) => ({ custom_fields: { ...atual.custom_fields, a: 1 } })),
    ).rejects.toThrow();
    expect(servidor.mutateAsync).not.toHaveBeenCalled();
  });

  it("uma falha não trava a fila: a próxima gravação segue", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["contact", "c1"], { data: servidor.contato });
    servidor.mutateAsync.mockRejectedValueOnce(new Error("500"));
    const result = montar(qc);
    const p1 = result.current.gravar({ name: "X" });
    const p2 = result.current.gravar({ name: "Y" });
    await expect(p1).rejects.toThrow("500");
    await p2;
    expect(servidor.mutateAsync).toHaveBeenLastCalledWith({ name: "Y" });
  });

  it("não espera o quadro recarregar para terminar (o spinner não fica preso)", async () => {
    const qc = new QueryClient();
    vi.spyOn(qc, "invalidateQueries").mockReturnValue(new Promise<void>(() => undefined));
    const result = montar(qc);
    await expect(result.current.gravar({ name: "Ana" })).resolves.toBe(true);
  });
});
