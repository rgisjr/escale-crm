import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));

import { JanelaDeCamposPendentes } from "@/components/escale/configuracoes/JanelaDeCamposPendentes";
import { useMoverComCamposDaEtapa } from "@/hooks/escale/useMoverComCamposDaEtapa";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import { apiClient } from "@/lib/api/client";
import type { BoardData } from "@/lib/kanban/types";

const ARGS = {
  leadId: "l1",
  stageId: "e2",
  positionInStage: 1000,
  expectedUpdatedAt: "2026-10-16T10:00:00Z",
};

describe("JanelaDeCamposPendentes", () => {
  const recusa = {
    args: ARGS,
    faltando: [
      { chave: "proposta", rotulo: "Proposta", tipo: "text" },
      { chave: "aceite", rotulo: "Aceite", tipo: "boolean" },
    ],
  };

  it("pede os campos, só libera depois de preencher e devolve os valores", () => {
    const fn = vi.fn();
    render(
      <JanelaDeCamposPendentes
        aberta
        modo="mover"
        etapa="Reunião Agendada"
        recusa={recusa}
        onConfirmar={fn}
        onFechar={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Campos obrigatórios pendentes" })).toBeTruthy();
    expect(
      screen.getByText("Para mover para Reunião Agendada, preencha os campos abaixo."),
    ).toBeTruthy();
    const salvar = screen.getByRole("button", { name: "Salvar e mover" }) as HTMLButtonElement;
    expect(salvar.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Proposta"), { target: { value: "PDF" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Aceite" }));
    expect(salvar.disabled).toBe(false);
    fireEvent.click(salvar);
    expect(fn).toHaveBeenCalledWith({ customFields: { proposta: "PDF", aceite: true } });
  });

  it("no modo status, o botão e a descrição são os de alterar o status", () => {
    render(
      <JanelaDeCamposPendentes
        aberta
        modo="status"
        recusa={recusa}
        onConfirmar={vi.fn()}
        onFechar={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Salvar e alterar status" })).toBeTruthy();
    expect(
      screen.getByText("Preencha os campos abaixo para alterar o status deste negócio."),
    ).toBeTruthy();
  });
});

const PIPE = "44444444-4444-4444-8444-444444444444";
const E1 = "aaaaaaaa-0000-4000-8000-000000000001";
const E2 = "aaaaaaaa-0000-4000-8000-000000000002";

const etapa = (id: string, position: number) => ({
  id,
  position,
  is_won: false,
  is_lost: false,
  name: id,
});
const negocio = (id: string, stageId: string) => ({
  id,
  pipeline_id: PIPE,
  stage_id: stageId,
  position_in_stage: 1000,
  updated_at: "2026-10-15T10:00:00Z",
  custom_fields: {},
  won_reason: null,
});

const QUADRO = {
  pipeline: {
    id: PIPE,
    settings: {
      fields: [{ key: "proposta", label: "Proposta", type: "text" }],
      escale_ao_sair: { proposta: [E1] },
    },
  },
  stages: [etapa(E1, 1), etapa(E2, 2)],
  leads: [negocio("l1", E1), negocio("l2", E2)],
} as unknown as BoardData;

function montar({ comCache = true, conferir = true } = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  if (comCache) qc.setQueryData(chaveDoQuadro(PIPE), QUADRO);
  const onCamposFaltando = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useMoverComCamposDaEtapa(PIPE, { onCamposFaltando }, { conferir }),
    { wrapper },
  );
  return { result, onCamposFaltando };
}

const args = (leadId: string, stageId: string, extra: Record<string, unknown> = {}) => ({
  leadId,
  stageId,
  positionInStage: 2000,
  expectedUpdatedAt: "2026-10-15T10:00:00Z",
  ...extra,
});

describe("useMoverComCamposDaEtapa", () => {
  beforeEach(() => {
    for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { ...negocio("l1", E2), updated_at: "2026-10-15T10:01:00Z" },
    });
  });

  it("avançar da etapa com 'ao sair' vazio abre o modal e não move", () => {
    const { result, onCamposFaltando } = montar();
    act(() => result.current.mutate(args("l1", E2)));
    expect(onCamposFaltando).toHaveBeenCalledWith({
      args: args("l1", E2),
      faltando: [{ chave: "proposta", rotulo: "Proposta", tipo: "text" }],
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("com os campos do modal, o mesmo move vai ao servidor levando os valores", async () => {
    const { result, onCamposFaltando } = montar();
    act(() => result.current.mutate(args("l1", E2, { customFields: { proposta: "PDF" } })));
    await vi.waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/v1/leads/l1/move",
        expect.objectContaining({ stage_id: E2, custom_fields: { proposta: "PDF" } }),
      ),
    );
    expect(onCamposFaltando).not.toHaveBeenCalled();
  });

  it("voltar para uma etapa anterior passa livre", async () => {
    const { result, onCamposFaltando } = montar();
    act(() => result.current.mutate(args("l2", E1)));
    await vi.waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/leads/l2/move", expect.anything()),
    );
    expect(onCamposFaltando).not.toHaveBeenCalled();
  });

  it("sem o quadro no cache, move como antes (o servidor continua cobrando o que é dele)", async () => {
    const { result } = montar({ comCache: false });
    act(() => result.current.mutate(args("l1", E2)));
    await vi.waitFor(() => expect(apiClient.post).toHaveBeenCalled());
  });

  it("com conferir desligado (sem a casca), avançar sem o campo vai direto ao servidor", async () => {
    const { result, onCamposFaltando } = montar({ conferir: false });
    act(() => result.current.mutate(args("l1", E2)));
    await vi.waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    expect(onCamposFaltando).not.toHaveBeenCalled();
  });
});

describe("os encaixes do arrasto e do modal (leitura da fonte)", () => {
  const ler = (caminho: string) => readFileSync(join(__dirname, "..", "..", caminho), "utf8");

  it("KanbanBoard confere os campos só com a casca e desenha o modal da Clint na casca", () => {
    const fonte = ler("components/kanban/KanbanBoard.tsx");
    expect(fonte).toContain("FORK ESCALE · Fase 1F");
    expect(fonte).toContain("useMoverComCamposDaEtapa(pipelineId, {");
    expect(fonte).toContain('{ conferir: aparencia === "casca" }');
    expect(fonte).not.toContain("= useMoveCard(pipelineId");
    const aOndeAbre = fonte.indexOf('aparencia === "casca" ? (');
    const oModal = fonte.indexOf("<JanelaDeCamposPendentes");
    expect(aOndeAbre).toBeGreaterThan(-1);
    expect(oModal).toBeGreaterThan(aOndeAbre);
    expect(fonte).toContain("<CamposObrigatoriosDialog");
  });

  it("MotorDaOrigem confere sempre (a Visualização é da casca)", () => {
    const fonte = ler("components/escale/visualizacoes/MotorDaOrigem.tsx");
    expect(fonte).toContain("useMoverComCamposDaEtapa(pipelineId, {");
    expect(fonte).toContain("{ conferir: true }");
    expect(fonte).not.toContain("= useMoveCard(pipelineId");
  });

  it("QuadroCombinado usa o modal da Clint e não o diálogo do original", () => {
    const fonte = ler("components/escale/visualizacoes/QuadroCombinado.tsx");
    expect(fonte).toContain("<JanelaDeCamposPendentes");
    expect(fonte).not.toContain("CamposObrigatoriosDialog");
  });
});
