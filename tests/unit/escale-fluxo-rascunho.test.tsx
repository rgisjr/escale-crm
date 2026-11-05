import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  replace: vi.fn(),
  criar: vi.fn(),
  atualizar: vi.fn(),
  alternar: vi.fn(),
  gravarFluxo: vi.fn(),
  gravarRascunho: vi.fn(),
  apagarRascunho: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: h.replace, push: vi.fn() }) }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: h.toast }));
vi.mock("@/hooks/webhooks/useAutomationRules", () => ({
  useCreateAutomationRule: () => ({ mutateAsync: h.criar, isPending: false }),
  useUpdateAutomationRule: () => ({ mutateAsync: h.atualizar, mutate: h.alternar, isPending: false }),
}));
vi.mock("@/hooks/escale/useAutomacoesDaCasca", () => ({
  useGravarFluxo: () => ({ mutateAsync: h.gravarFluxo, isPending: false }),
  useSalvarRascunho: () => ({ mutateAsync: h.gravarRascunho, isPending: false }),
  useDescartarRascunho: () => ({ mutate: h.apagarRascunho, mutateAsync: h.apagarRascunho, isPending: false }),
}));

import { useFluxo } from "@/components/escale/automacoes/fluxo/useFluxo";
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import { ApiError } from "@/lib/api/types";
import { desenhoDaRegra, telaDoGatilho } from "@/lib/automation/desenho-da-regra";
import { MENSAGEM_DO_RASCUNHO_NAO_LIGA } from "@/lib/automation/rascunho-nao-liga";
import { regraGravadaDe } from "@/lib/escale/automacoes/fluxo/estado";
import {
  AVISO_CONFLITO_VIROU_RASCUNHO,
  RECUSA_RASCUNHO_SEM_GATILHO,
  TOAST_RASCUNHO_COM_VERSAO_NO_AR,
} from "@/lib/escale/automacoes/fluxo/frases-do-rascunho";

const ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const NOVA = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const TAG = { type: "add_tag", config: { tags: ["vip"] } };
const regra = (acoes: Array<{ type: string; config: Record<string, unknown> }>): AutomationRuleRow =>
  ({
    id: ID,
    organization_id: "o1",
    name: "Regra",
    trigger_event: "lead.created",
    conditions: [],
    actions: acoes,
    trigger_config: {},
    is_active: false,
    last_run_at: null,
    run_count: 0,
    updated_at: "2026-11-04T10:00:00Z",
  }) as unknown as AutomationRuleRow;

const envolver = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <ReactFlowProvider>{children}</ReactFlowProvider>
  </QueryClientProvider>
);
const montar = (r: AutomationRuleRow | null, opcoes: Parameters<typeof useFluxo>[1] = {}) =>
  renderHook(() => useFluxo(r, opcoes), { wrapper: envolver });

beforeEach(() => {
  vi.clearAllMocks();
  h.atualizar.mockResolvedValue({ data: { updated_at: "2026-11-04T11:00:00Z" } });
  h.gravarRascunho.mockResolvedValue({ ruleId: ID, atualizadoEm: "2026-11-04T12:00:00Z", criada: false });
});

describe("salvar: publica quando está tudo certo", () => {
  it("regra completa publica pela rota de sempre e não grava rascunho", async () => {
    const { result } = montar(regra([TAG]));
    let r: string | undefined;
    await act(async () => {
      r = await result.current.salvar();
    });
    expect(r).toBe("salvo");
    expect(h.atualizar).toHaveBeenCalledWith(expect.objectContaining({ id: ID, versao_lida: "2026-11-04T10:00:00Z" }));
    expect(h.gravarRascunho).not.toHaveBeenCalled();
  });

  it("publicar com um rascunho aberto apaga o rascunho", async () => {
    const r0 = regra([TAG]);
    const rascunho = { nome: "Regra", desenho: desenhoDaRegra(regraGravadaDe(r0)), atualizadoEm: "2026-11-04T09:00:00Z" };
    const { result } = montar(r0, { rascunho });
    expect(result.current.rascunhoEm).toBe("2026-11-04T09:00:00Z");
    await act(async () => {
      await result.current.salvar();
    });
    expect(h.atualizar).toHaveBeenCalled();
    expect(h.apagarRascunho).toHaveBeenCalledWith(ID);
    expect(result.current.rascunhoEm).toBeNull();
  });
});

describe("salvar: com pendência vira rascunho", () => {
  it("regra no ar com a ação removida grava rascunho e não publica", async () => {
    const { result } = montar(regra([TAG]));
    act(() => result.current.removerNo("acao-1"));
    let r: string | undefined;
    await act(async () => {
      r = await result.current.salvar();
    });
    expect(r).toBe("rascunho");
    expect(h.atualizar).not.toHaveBeenCalled();
    expect(h.gravarRascunho).toHaveBeenCalledWith(expect.objectContaining({ id: ID, nome: "Regra" }));
    expect(h.toast.success).toHaveBeenCalledWith(TOAST_RASCUNHO_COM_VERSAO_NO_AR);
    expect(result.current.rascunhoEm).toBe("2026-11-04T12:00:00Z");
    expect(result.current.sujo).toBe(false);
  });

  it("409 na publicação: nada se perde, vira rascunho", async () => {
    h.atualizar.mockRejectedValue(new ApiError(409, "state_conflict", undefined, "r", "versão velha"));
    const { result } = montar(regra([TAG]));
    let r: string | undefined;
    await act(async () => {
      r = await result.current.salvar();
    });
    expect(r).toBe("rascunho");
    expect(h.gravarRascunho).toHaveBeenCalled();
    expect(h.toast.info).toHaveBeenCalledWith(AVISO_CONFLITO_VIROU_RASCUNHO);
  });

  it("automação nova sem gatilho: recusa com a frase e não grava nada", async () => {
    const { result } = montar(null, { nomeInicial: "Nova" });
    let r: string | undefined;
    await act(async () => {
      r = await result.current.salvar();
    });
    expect(r).toBe("recusado");
    expect(h.toast.error).toHaveBeenCalledWith(RECUSA_RASCUNHO_SEM_GATILHO);
    expect(h.gravarRascunho).not.toHaveBeenCalled();
  });

  it("automação nova incompleta com gatilho: cria pelo rascunho, organiza e vai para a regra", async () => {
    h.gravarRascunho.mockResolvedValue({ ruleId: NOVA, atualizadoEm: "t", criada: true });
    const aoCriar = vi.fn(async () => undefined);
    const { result } = montar(null, { nomeInicial: "Nova", aoCriar });
    act(() => result.current.trocarGatilho("lead.created", telaDoGatilho(null)));
    let r: string | undefined;
    await act(async () => {
      r = await result.current.salvar();
    });
    expect(r).toBe("criado");
    expect(h.gravarRascunho).toHaveBeenCalledWith(expect.objectContaining({ id: null, nome: "Nova" }));
    expect(aoCriar).toHaveBeenCalledWith(NOVA);
    expect(h.replace).toHaveBeenCalledWith(`/app/webhooks/automacoes/${NOVA}`);
    expect(h.criar).not.toHaveBeenCalled();
  });
});

describe("ligar", () => {
  it("regra que nunca foi publicada (sem ação) não liga", () => {
    const { result } = montar(regra([]));
    expect(result.current.publicada).toBe(false);
    act(() => result.current.alternarAtivo(true));
    expect(h.alternar).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(MENSAGEM_DO_RASCUNHO_NAO_LIGA);
  });

  it("regra publicada liga normalmente", () => {
    const { result } = montar(regra([TAG]));
    act(() => result.current.alternarAtivo(true));
    expect(h.alternar).toHaveBeenCalledWith({ id: ID, is_active: true }, expect.anything());
  });
});
