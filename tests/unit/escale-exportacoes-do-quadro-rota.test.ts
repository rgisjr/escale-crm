import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/v1/exportacoes-do-quadro/route";
import {
  ORG_ID,
  OUTRA_ORG,
  authOk,
  makeDb,
  type PipelineRow,
} from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { logger } from "@/lib/logger";

const F1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const F_VIZINHO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9";

const exportar = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/v1/exportacoes-do-quadro", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(logger.error).mockClear();
  authOk();
  makeDb({
    pipelines: [
      { id: F1, name: "Leads", organization_id: ORG_ID, is_archived: false },
      { id: F_VIZINHO, name: "Do vizinho", organization_id: OUTRA_ORG, is_archived: false },
    ] as unknown as PipelineRow[],
  });
});

describe("POST /api/v1/exportacoes-do-quadro", () => {
  it("pede gerente, registra na auditoria quantos cards saíram e responde 201", async () => {
    const res = await exportar({ origem: F1, quantidade: 21 });
    expect(res.status).toBe(201);
    expect(vi.mocked(requireRole).mock.calls[0]?.[0]).toBe("manager");
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "pipeline.cards_exported",
        resourceId: F1,
        metadata: { quantidade: 21 },
      }),
    );
  });

  it("erro inesperado do banco é 500 genérico: a mensagem crua vai para o log, não para o cliente", async () => {
    const CRU = 'relation "crm_pipelines" violates something internal';
    makeDb({
      pipelines: [
        { id: F1, name: "Leads", organization_id: ORG_ID, is_archived: false },
      ] as unknown as PipelineRow[],
      readError: (tabela) => (tabela === "crm_pipelines" ? { code: "XX000", message: CRU } : null),
    });
    const res = await exportar({ origem: F1, quantidade: 1 });
    const corpo = await res.text();
    expect(res.status).toBe(500);
    expect(corpo).toContain("Não consegui completar essa ação. Tente de novo.");
    expect(corpo).not.toContain("crm_pipelines");
    expect(corpo).not.toContain("violates");
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        rota: "POST /api/v1/exportacoes-do-quadro",
        codigo: "XX000",
        erro: CRU,
        requestId: expect.any(String),
      }),
    );
    expect(audit).not.toHaveBeenCalled();
  });

  it("origem de outra organização é 404 e não registra nada", async () => {
    expect((await exportar({ origem: F_VIZINHO, quantidade: 1 })).status).toBe(404);
    expect(audit).not.toHaveBeenCalled();
  });

  it("corpo fora da forma é 422; sem o papel, a resposta do requireRole volta", async () => {
    expect((await exportar({ origem: "lixo", quantidade: 1 })).status).toBe(422);
    expect((await exportar({ origem: F1, quantidade: -1 })).status).toBe(422);
    expect((await exportar({ origem: F1, quantidade: 1, extra: true })).status).toBe(422);
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    expect((await exportar({ origem: F1, quantidade: 1 })).status).toBe(403);
    expect(audit).not.toHaveBeenCalled();
  });
});
