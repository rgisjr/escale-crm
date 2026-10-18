import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/tarefas/atividade", () => ({
  registraAtividadeDaTarefa: vi.fn(async () => ({ ok: true })),
}));

import { GET, POST } from "@/app/api/v1/leads/[id]/atividades/route";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { registraAtividadeDaTarefa } from "@/lib/tarefas/atividade";

/** FORK ESCALE · Fase 1I (C19): ler e criar as atividades do negócio. */
const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const LEAD = "33333333-3333-4333-8333-333333333333";
const PIPE = "44444444-4444-4444-8444-444444444444";
const ETAPA = "55555555-5555-4555-8555-555555555555";
const TAREFA = {
  id: "66666666-6666-4666-8666-666666666666",
  title: "Ligar",
  lead_id: LEAD,
  contact_id: "c1",
  due_date: null,
  priority: "medium",
  status: "pending",
};
const EXTRA = {
  tarefa_id: TAREFA.id,
  stage_id: ETAPA,
  atividade_id: null,
  tipo: "ligacao",
  visibilidade: "padrao",
  concluida_por: null,
  concluida_em: null,
};

type Linhas = Record<string, unknown[]>;

/** Um dublê do supabase que responde por tabela e grava inserts e deletes. */
function banco(linhas: Linhas, opts: { erroNoExtra?: boolean } = {}) {
  const gravados: Array<{ tabela: string; op: string; valor?: unknown }> = [];
  const from = vi.fn((tabela: string) => {
    let op = "select";
    let valor: unknown;
    const api = {
      select: () => api,
      eq: () => api,
      is: () => api,
      in: () => api,
      order: () => api,
      insert: (v: unknown) => {
        op = "insert";
        valor = v;
        gravados.push({ tabela, op, valor: v });
        return api;
      },
      delete: () => {
        op = "delete";
        gravados.push({ tabela, op });
        return api;
      },
      maybeSingle: async () => ({ data: (linhas[tabela] ?? [])[0] ?? null, error: null }),
      single: async () =>
        op === "insert" && tabela === "crm_tasks"
          ? { data: { ...TAREFA, ...(valor as object) }, error: null }
          : { data: (linhas[tabela] ?? [])[0] ?? null, error: null },
      then: (ok: (v: { data: unknown; error: unknown }) => unknown) =>
        Promise.resolve(
          op === "insert" && tabela === "crm_atividades_do_negocio" && opts.erroNoExtra
            ? { data: null, error: { code: "23503", message: "x" } }
            : { data: linhas[tabela] ?? [], error: null },
        ).then(ok),
    };
    return api;
  });
  return { from, gravados };
}

const ctx = (id = LEAD) => ({ params: Promise.resolve({ id }) });
const BASE: Linhas = {
  crm_leads: [{ id: LEAD, pipeline_id: PIPE, contact_id: "c1" }],
  crm_tasks: [TAREFA],
  crm_atividades_do_negocio: [EXTRA],
  crm_atividades_da_etapa: [],
  crm_stages: [{ id: ETAPA }],
};
const pedido = (corpo: unknown) =>
  new NextRequest(`http://x/api/v1/leads/${LEAD}/atividades`, {
    method: "POST",
    body: JSON.stringify(corpo),
  });
const NOVA = {
  titulo: "Ligar",
  tipo: "ligacao",
  due_date: "2026-10-20T10:00:00.000-03:00",
  stage_id: ETAPA,
};

beforeEach(() => {
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: USER, idioma: "pt-BR" },
    org: { orgId: ORG },
  } as never);
});

describe("GET /api/v1/leads/[id]/atividades", () => {
  it("junta a tarefa com a linha do fork e devolve o playbook da origem", async () => {
    vi.mocked(createClient).mockResolvedValue(banco(BASE) as never);
    const res = await GET(new NextRequest("http://x"), ctx());
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.atividades[0]).toMatchObject({ id: TAREFA.id, tipo: "ligacao", stage_id: ETAPA });
    expect(data.modelos).toEqual([]);
    expect(requireRole).toHaveBeenCalledWith("viewer", expect.anything());
  });
  it("negócio que a pessoa não vê: 404", async () => {
    vi.mocked(createClient).mockResolvedValue(banco({ ...BASE, crm_leads: [] }) as never);
    expect((await GET(new NextRequest("http://x"), ctx())).status).toBe(404);
  });
});

describe("POST /api/v1/leads/[id]/atividades", () => {
  it("cria a tarefa (responsável = quem criou) e a linha do fork, e grava na linha do tempo", async () => {
    const db = banco(BASE);
    vi.mocked(createClient).mockResolvedValue(db as never);
    const res = await POST(pedido(NOVA), ctx());
    expect(res.status).toBe(201);
    const tarefa = db.gravados.find((g) => g.tabela === "crm_tasks" && g.op === "insert")?.valor;
    expect(tarefa).toMatchObject({
      organization_id: ORG,
      title: "Ligar",
      lead_id: LEAD,
      contact_id: "c1",
      assigned_to: USER,
      created_by: USER,
      status: "pending",
      source_kind: "escale_ficha",
    });
    expect(db.gravados.find((g) => g.tabela === "crm_atividades_do_negocio")?.valor).toMatchObject({
      organization_id: ORG,
      lead_id: LEAD,
      stage_id: ETAPA,
      tipo: "ligacao",
      visibilidade: "padrao",
    });
    expect(registraAtividadeDaTarefa).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tipo: "task_created", actor: { type: "user", id: USER } }),
    );
    expect(requireRole).toHaveBeenCalledWith("agent", expect.anything());
  });
  it("corpo inválido: 422; etapa fora da origem do negócio: 422", async () => {
    vi.mocked(createClient).mockResolvedValue(banco(BASE) as never);
    expect((await POST(pedido({ ...NOVA, tipo: "linkedin" }), ctx())).status).toBe(422);
    vi.mocked(createClient).mockResolvedValue(banco({ ...BASE, crm_stages: [] }) as never);
    expect((await POST(pedido(NOVA), ctx())).status).toBe(422);
  });
  it("se a linha do fork falha, a tarefa é desfeita e a rota devolve 500", async () => {
    const db = banco(BASE, { erroNoExtra: true });
    vi.mocked(createClient).mockResolvedValue(db as never);
    expect((await POST(pedido(NOVA), ctx())).status).toBe(500);
    expect(db.gravados.some((g) => g.tabela === "crm_tasks" && g.op === "delete")).toBe(true);
  });
});
