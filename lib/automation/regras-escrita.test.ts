// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { cifrar } = vi.hoisted(() => ({ cifrar: vi.fn() }));
vi.mock("@/lib/webhooks/secrets", () => ({ encryptRuleActionSecrets: cifrar }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

import { atualizarRegra, criarRegra } from "@/lib/automation/regras-escrita";
import type { CreateAutomationRuleInput } from "@/lib/schemas/webhooks";

const ORG = "11111111-1111-4111-8111-111111111111";
const FONTE = "33333333-3333-4333-8333-333333333333";

interface Ops {
  inserts: Array<Record<string, unknown>>;
  updates: Array<Record<string, unknown>>;
}

/** Banco falso: `webhook_sources` existe só se `fonteExiste`; `existente` é a regra lida no update. */
function banco(ops: Ops, opcoes: { fonteExiste?: boolean; existente?: Record<string, unknown> | null; conflito?: boolean } = {}) {
  return {
    from: (tabela: string) => {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) q[m] = () => q;
      q.insert = (v: Record<string, unknown>) => {
        ops.inserts.push(v);
        return q;
      };
      q.update = (v: Record<string, unknown>) => {
        ops.updates.push(v);
        return q;
      };
      q.single = async () => ({ data: { id: "r1", ...ops.inserts.at(-1) }, error: null });
      q.maybeSingle = async () => {
        if (tabela === "webhook_sources") return { data: opcoes.fonteExiste ? { id: FONTE } : null, error: null };
        if (ops.updates.length > 0) return { data: opcoes.conflito ? null : { id: "r1", ...ops.updates.at(-1) }, error: null };
        return { data: opcoes.existente ?? null, error: null };
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

const dados = (extra: Partial<CreateAutomationRuleInput> = {}): CreateAutomationRuleInput =>
  ({
    name: "Mudar tag",
    trigger_event: "lead.created",
    trigger_config: {},
    conditions: [],
    actions: [{ type: "add_tag", config: { tags: ["x"] } }],
    ...extra,
  }) as CreateAutomationRuleInput;

beforeEach(() => {
  cifrar.mockReset();
  cifrar.mockImplementation(async (_admin: unknown, actions: unknown) => actions);
});

describe("criarRegra", () => {
  it("grava a organização do CONTEXTO e nasce sem is_active", async () => {
    const ops: Ops = { inserts: [], updates: [] };
    const r = await criarRegra(banco(ops), { organizationId: ORG, criadoPorUserId: null, requestId: "req", dados: dados() });
    expect(r.ok).toBe(true);
    expect(ops.inserts[0]).toMatchObject({ organization_id: ORG, created_by_user_id: null, name: "Mudar tag" });
    expect(ops.inserts[0]).not.toHaveProperty("is_active");
  });

  it("recusa fonte de outra organização", async () => {
    const ops: Ops = { inserts: [], updates: [] };
    const r = await criarRegra(banco(ops, { fonteExiste: false }), {
      organizationId: ORG,
      criadoPorUserId: null,
      requestId: "req",
      dados: dados({ trigger_config: { webhook_source_id: FONTE } }),
    });
    expect(r).toMatchObject({ ok: false, codigo: "invalid_request", status: 422 });
    expect(ops.inserts).toHaveLength(0);
  });

  it("sem chave de cifra, recusa com encryption_unavailable", async () => {
    cifrar.mockResolvedValue(null);
    const ops: Ops = { inserts: [], updates: [] };
    const r = await criarRegra(banco(ops), { organizationId: ORG, criadoPorUserId: null, requestId: "req", dados: dados() });
    expect(r).toMatchObject({ ok: false, codigo: "encryption_unavailable", status: 422 });
  });
});

describe("atualizarRegra", () => {
  const base = { organizationId: ORG, regraId: "r1", requestId: "req", actor: { type: "user", id: "u1", role: "manager" } as const };

  it("regra que não existe nesta organização: not_found", async () => {
    const ops: Ops = { inserts: [], updates: [] };
    const r = await atualizarRegra(banco(ops, { existente: null }), { ...base, patch: { name: "novo" } });
    expect(r).toMatchObject({ ok: false, codigo: "not_found", status: 404 });
  });

  it("atualiza e grava a autoria da mudança", async () => {
    const ops: Ops = { inserts: [], updates: [] };
    const r = await atualizarRegra(
      banco(ops, { existente: { id: "r1", trigger_event: "lead.created", actions: [] } }),
      { ...base, patch: { name: "novo" } },
    );
    expect(r.ok).toBe(true);
    expect(ops.updates[0]).toMatchObject({ name: "novo", last_change_actor_kind: "user" });
  });

  it("versão lida velha: state_conflict", async () => {
    const ops: Ops = { inserts: [], updates: [] };
    const r = await atualizarRegra(
      banco(ops, { existente: { id: "r1", trigger_event: "lead.created", actions: [] }, conflito: true }),
      { ...base, patch: { name: "novo", versao_lida: "2026-01-01T00:00:00Z" } },
    );
    expect(r).toMatchObject({ ok: false, codigo: "state_conflict", status: 409 });
  });
});
