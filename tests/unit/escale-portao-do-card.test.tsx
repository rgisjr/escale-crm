import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));

import { usePortaoAoSair } from "@/hooks/escale/usePortaoAoSair";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import { apiClient } from "@/lib/api/client";
import type { BoardData } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

const PIPE = "44444444-4444-4444-8444-444444444444";
const E1 = "aaaaaaaa-0000-4000-8000-000000000001";
const EG = "aaaaaaaa-0000-4000-8000-000000000003";

const LEAD = {
  id: "l1",
  pipeline_id: PIPE,
  stage_id: E1,
  position_in_stage: 1000,
  updated_at: "2026-10-15T10:00:00Z",
  custom_fields: {},
  won_reason: null,
} as unknown as Lead;

const QUADRO = {
  pipeline: {
    id: PIPE,
    settings: {
      fields: [{ key: "proposta", label: "Proposta", type: "text" }],
      escale_ao_sair: { proposta: [E1] },
    },
  },
  stages: [
    { id: E1, position: 1, is_won: false, is_lost: false },
    { id: EG, position: 2, is_won: true, is_lost: false },
  ],
  leads: [LEAD],
} as unknown as BoardData;

function comQuadro(filho: ReactNode, quadro: BoardData = QUADRO) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  qc.setQueryData(chaveDoQuadro(PIPE), quadro);
  return render(<QueryClientProvider client={qc}>{filho}</QueryClientProvider>);
}

function Portao({
  lead,
  continuar,
  ativo = true,
}: {
  lead: Lead;
  continuar: () => void;
  ativo?: boolean;
}) {
  const portao = usePortaoAoSair(PIPE, lead, { ativo });
  return (
    <>
      <button type="button" onClick={() => portao.antes("won", continuar)}>
        ganhar
      </button>
      {portao.janela}
    </>
  );
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  vi.mocked(apiClient.patch).mockResolvedValue({
    data: { ...LEAD, custom_fields: { proposta: "PDF" } },
  });
});

describe("usePortaoAoSair", () => {
  it("com pendência, pede os campos; Salvar e alterar status grava e só então continua", async () => {
    const continuar = vi.fn();
    comQuadro(<Portao lead={LEAD} continuar={continuar} />);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole("button", { name: "ganhar" }));
    expect(screen.getByRole("dialog", { name: "Campos obrigatórios pendentes" })).toBeTruthy();
    expect(continuar).not.toHaveBeenCalled();
    await user.type(screen.getByRole("textbox", { name: "Proposta" }), "PDF");
    await user.click(screen.getByRole("button", { name: "Salvar e alterar status" }));
    await vi.waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/leads/l1", {
        custom_fields: { proposta: "PDF" },
      }),
    );
    await vi.waitFor(() => expect(continuar).toHaveBeenCalledTimes(1));
  });

  it("sem pendência, continua na hora, sem diálogo", async () => {
    const continuar = vi.fn();
    const preenchido = { ...LEAD, custom_fields: { proposta: "ok" } } as Lead;
    // O portão confere o negócio do cache do quadro (o mais fresco), então é ele que vai preenchido.
    comQuadro(<Portao lead={preenchido} continuar={continuar} />, {
      ...QUADRO,
      leads: [preenchido],
    } as BoardData);
    await userEvent.setup().click(screen.getByRole("button", { name: "ganhar" }));
    expect(continuar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("com ativo desligado (sem a casca), continua direto mesmo com pendência", async () => {
    const continuar = vi.fn();
    comQuadro(<Portao lead={LEAD} continuar={continuar} ativo={false} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "ganhar" }));
    expect(continuar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("os encaixes no ⋮ do card (leitura da fonte)", () => {
  const ler = (caminho: string) => readFileSync(join(__dirname, "..", "..", caminho), "utf8");

  it("ganhar, perder e levar para outro funil passam pelo portão, dentro da barreira de clique", () => {
    const fonte = ler("components/kanban/KanbanCardActions.tsx");
    expect(fonte).toContain("FORK ESCALE · Fase 1F");
    expect(fonte).toContain("casca?: boolean");
    expect(fonte).toContain("usePortaoAoSair(pipelineId, lead, { ativo: casca === true })");
    expect(fonte).toContain('portao.antes("won", () => winMutation.mutate({ leadId: lead.id }))');
    expect(fonte).toContain('portao.antes("lost", () => setLoseOpen(true))');
    expect(fonte).toContain('portao.antes("lost", () => setMoveOpen(true))');
    expect(fonte).toContain('t("Marcar como perdido")');
    const barreira = fonte.indexOf(
      '<span className="contents" onClick={(e) => e.stopPropagation()}>',
    );
    const janela = fonte.indexOf("{portao.janela}");
    expect(barreira).toBeGreaterThan(-1);
    expect(janela).toBeGreaterThan(barreira);
    expect(janela).toBeLessThan(fonte.lastIndexOf("</span>"));
  });

  it("só o card da casca liga o portão (F8)", () => {
    const fonte = ler("components/escale/quadro/CardDaCasca.tsx");
    expect(fonte).toContain("<KanbanCardActions lead={lead} pipelineId={pipelineId} casca />");
  });
});
