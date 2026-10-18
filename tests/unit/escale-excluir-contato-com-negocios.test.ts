import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteContactHandler, vinculosDoContatoHandler } from "@/app/api/v1/contacts/_handler";
import { audit } from "@/lib/audit";
import { excluirContatoComNegocios } from "@/lib/escale/contatos/excluir";

vi.mock("@/app/api/v1/contacts/_handler", () => ({
  vinculosDoContatoHandler: vi.fn(),
  deleteContactHandler: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

const ORG = "cccccccc-0000-4000-8000-000000000001";
const USER = "bbbbbbbb-0000-4000-8000-000000000001";
const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const ctx = { organization_id: ORG, actor: { type: "user" as const, id: USER }, requestId: "r1" };

/** Supabase de mentira: o DELETE de `crm_leads` devolve os negócios apagados; o `rpc` fica anotado. */
function banco(negocios: Array<{ id: string }>) {
  const filtros: Array<[string, string]> = [];
  const apagar: Record<string, unknown> = {};
  apagar.eq = vi.fn((coluna: string, valor: string) => {
    filtros.push([coluna, valor]);
    return apagar;
  });
  apagar.select = vi.fn(async () => ({ data: negocios, error: null }));
  const from = vi.fn(() => ({ delete: vi.fn(() => apagar) }));
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  return { db: { from, rpc } as never, from, rpc, filtros };
}

beforeEach(() => {
  vi.mocked(vinculosDoContatoHandler)
    .mockReset()
    .mockResolvedValue({ vinculos: [], por_tabela: {} });
  vi.mocked(deleteContactHandler).mockReset().mockResolvedValue({ id: C1 });
  vi.mocked(audit).mockReset();
});

describe("excluirContatoComNegocios (Q5)", () => {
  it("com compromisso na Agenda: 409 e nada é apagado", async () => {
    vi.mocked(vinculosDoContatoHandler).mockResolvedValue({
      vinculos: ["1 compromisso(s) na agenda"],
      por_tabela: { calendar_appointments: 1 },
    });
    const { db, from } = banco([{ id: "l1" }]);
    await expect(excluirContatoComNegocios(db, ctx, C1)).rejects.toMatchObject({
      status: 409,
      code: "state_conflict",
    });
    expect(from).not.toHaveBeenCalled();
    expect(deleteContactHandler).not.toHaveBeenCalled();
  });

  it("apaga TODOS os negócios do contato na organização, pelo caminho do lote do original, e depois o contato", async () => {
    const { db, from, rpc, filtros } = banco([{ id: "l1" }, { id: "l2" }]);
    expect(await excluirContatoComNegocios(db, ctx, C1)).toEqual({ id: C1, negocios: 2 });
    expect(from).toHaveBeenCalledWith("crm_leads");
    expect(filtros).toEqual([
      ["organization_id", ORG],
      ["contact_id", C1],
    ]);
    expect(rpc).toHaveBeenCalledWith(
      "emit_event",
      expect.objectContaining({
        p_event_type: "lead.bulk_deleted",
        p_organization_id: ORG,
        p_payload: expect.objectContaining({ action: "delete", lead_ids: ["l1", "l2"] }),
      }),
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "lead.bulk_action",
        actorUserId: USER,
        organizationId: ORG,
      }),
    );
    expect(deleteContactHandler).toHaveBeenCalledWith(db, ctx, C1);
    expect(vi.mocked(deleteContactHandler).mock.invocationCallOrder[0]).toBeGreaterThan(
      from.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it("sem negócio: nem evento nem auditoria de negócios; o contato sai", async () => {
    const { db, rpc } = banco([]);
    expect(await excluirContatoComNegocios(db, ctx, C1)).toEqual({ id: C1, negocios: 0 });
    expect(rpc).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
    expect(deleteContactHandler).toHaveBeenCalledWith(db, ctx, C1);
  });
});
