import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
const permissao = vi.hoisted(() => ({ pode: true }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  usePermission: () => permissao.pode,
}));
const editarLead = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => undefined) }));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({ useEditLead: () => editarLead }));

import { useAtividadesDoNegocio } from "@/hooks/escale/useAtividadesDoNegocio";
import { apiClient } from "@/lib/api/client";
import type { AtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1I (C21): concluir na ficha um negócio sem dono faz quem concluiu virar o dono. */
const SEM_DONO = { id: "n1", pipeline_id: "p1", owner_user_id: null, owner_agent_id: null } as Lead;
const atividade = (status: "pending" | "done") => ({ id: "t1", status }) as AtividadeDoNegocio;

function montar(lead: Lead) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useAtividadesDoNegocio(lead), { wrapper: envolver });
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  vi.mocked(apiClient.get).mockResolvedValue({ data: { atividades: [], modelos: [] } });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
  editarLead.mutateAsync.mockClear();
  permissao.pode = true;
});

describe("useAtividadesDoNegocio", () => {
  it("lê a rota do negócio", async () => {
    const { result } = montar(SEM_DONO);
    await waitFor(() => expect(result.current.dados).toEqual({ atividades: [], modelos: [] }));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/leads/n1/atividades");
  });

  it("concluir grava 'done' e, sem dono, põe quem concluiu como dono", async () => {
    const { result } = montar(SEM_DONO);
    let saida = "";
    await act(async () => {
      saida = await result.current.alternar(atividade("pending"));
    });
    expect(saida).toBe("concluida");
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/tasks/t1", { status: "done" });
    expect(editarLead.mutateAsync).toHaveBeenCalledWith({
      leadId: "n1",
      patch: { owner_user_id: "u-eu" },
    });
  });

  it("negócio com dono (pessoa ou agente), reabrir, ou sem permissão: o dono não muda", async () => {
    for (const lead of [
      { ...SEM_DONO, owner_user_id: "u-outro" },
      { ...SEM_DONO, owner_agent_id: "ag-1" },
    ] as Lead[]) {
      const { result } = montar(lead);
      await act(async () => {
        await result.current.alternar(atividade("pending"));
      });
    }
    const { result } = montar(SEM_DONO);
    await act(async () => {
      expect(await result.current.alternar(atividade("done"))).toBe("reaberta");
    });
    expect(apiClient.patch).toHaveBeenLastCalledWith("/api/v1/tasks/t1", { status: "pending" });
    permissao.pode = false;
    const semPermissao = montar(SEM_DONO);
    await act(async () => {
      await semPermissao.result.current.alternar(atividade("pending"));
    });
    expect(editarLead.mutateAsync).not.toHaveBeenCalled();
  });

  it("criar, editar e excluir vão às rotas certas", async () => {
    const { result } = montar(SEM_DONO);
    vi.mocked(apiClient.post).mockResolvedValue({ data: { atividade: {} } });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { deleted: true } });
    await act(async () => {
      await result.current.criar({
        titulo: "X",
        tipo: "tarefa",
        due_date: "2026-10-20T10:00:00.000Z",
        stage_id: "e1",
      });
      await result.current.editar("t1", { due_date: "2026-10-21T10:00:00.000Z" });
      await result.current.excluir("t1");
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/leads/n1/atividades", {
      titulo: "X",
      tipo: "tarefa",
      due_date: "2026-10-20T10:00:00.000Z",
      stage_id: "e1",
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/tasks/t1", {
      due_date: "2026-10-21T10:00:00.000Z",
    });
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/tasks/t1");
  });
});
