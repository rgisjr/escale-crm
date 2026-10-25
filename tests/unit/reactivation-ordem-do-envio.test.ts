import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/leads/activity-emitter", () => ({ emitLeadActivity: vi.fn() }));
vi.mock("@/lib/leads/activity-write-failure", () => ({
  registraFalhaDeAtividade: vi.fn(async () => undefined),
}));

import { POST } from "@/app/api/v1/leads/[id]/reactivation/route";
import { requireRole } from "@/lib/auth/require-role";
import { emitLeadActivity } from "@/lib/leads/activity-emitter";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Q2a (B2-7): o envio só é agendado depois que a atividade da decisão foi gravada. */
const ORG = "11111111-1111-4111-8111-111111111111";
const LEAD = "33333333-3333-4333-8333-333333333333";
const PROPOSTA = "44444444-4444-4444-8444-444444444444";

const eventos: string[] = [];

function supabase() {
  const from = vi.fn((tabela: string) => {
    const api: Record<string, unknown> = {};
    for (const m of ["select", "update", "eq"]) api[m] = () => api;
    api.maybeSingle = async () => ({
      data: tabela === "crm_lead_reactivations" ? { id: PROPOSTA } : { contact_id: "c1" },
      error: null,
    });
    return api;
  });
  return { from };
}

function admin() {
  const from = vi.fn((tabela: string) => {
    const api: Record<string, unknown> = {};
    for (const m of ["select", "eq", "gt"]) api[m] = () => api;
    api.maybeSingle = async () => ({ data: null, error: null });
    api.insert = async () => {
      eventos.push(`insert:${tabela}`);
      return { error: null };
    };
    return api;
  });
  return { from };
}

function chamar() {
  const req = new NextRequest("http://localhost/api/v1/leads/x/reactivation", {
    method: "POST",
    body: JSON.stringify({ decision: "accept", proposal_id: PROPOSTA }),
  });
  return POST(req, { params: Promise.resolve({ id: LEAD }) });
}

beforeEach(() => {
  eventos.length = 0;
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: "u1", idioma: "pt-BR" },
    org: { orgId: ORG },
  } as never);
  vi.mocked(createClient).mockResolvedValue(supabase() as never);
  vi.mocked(createAdminClient).mockReturnValue(admin() as never);
});

describe("POST /leads/[id]/reactivation: ordem do envio", () => {
  it("atividade que falha: responde 500 e NÃO agenda o envio", async () => {
    vi.mocked(emitLeadActivity).mockImplementation(async () => {
      eventos.push("atividade");
      return { ok: false, error: "boom" } as never;
    });
    const r = await chamar();
    expect(r.status).toBe(500);
    expect(eventos).not.toContain("insert:cron_jobs");
  });

  it("atividade gravada: agenda o envio depois dela e informa envio_agendado", async () => {
    vi.mocked(emitLeadActivity).mockImplementation(async () => {
      eventos.push("atividade");
      return { ok: true } as never;
    });
    const r = await chamar();
    expect(r.status).toBe(200);
    expect(eventos).toEqual(["atividade", "insert:cron_jobs"]);
    expect((await r.json()).data.envio_agendado).toBe(true);
  });
});
