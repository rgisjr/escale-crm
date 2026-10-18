import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { GET, POST } from "@/app/api/v1/leads/[id]/notas/route";
import { DELETE, PATCH } from "@/app/api/v1/leads/[id]/notas/[notaId]/route";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
const atividade = vi.hoisted(() => ({ emitLeadActivity: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/leads/activity-emitter", () => ({ emitLeadActivity: atividade.emitLeadActivity }));

/** FORK ESCALE · Fase 1H (C15): as rotas das notas do negócio. */
const ORG = "22222222-2222-4222-8222-222222222222";
const USER = "11111111-1111-4111-8111-111111111111";
const LEAD = "33333333-3333-4333-8333-333333333333";
const NOTA = "44444444-4444-4444-8444-444444444444";

type Linha = Record<string, unknown>;
/** Um Supabase de mentira, encadeável: guarda a última operação por tabela. */
function fakeSupabase(
  estado: { leads: Linha[]; notas: Linha[] },
  falha?: { code: string; message: string },
  rlsSemLinhas = false,
) {
  const op = {
    tabela: "",
    acao: "select" as "select" | "insert" | "update" | "delete",
    filtros: [] as [string, unknown][],
    valores: {} as Linha,
  };
  const resolver = () => {
    if (falha && op.tabela === "crm_notas_do_negocio" && op.acao !== "select")
      return { data: null, error: falha };
    const achadas = (op.tabela === "crm_leads" ? estado.leads : estado.notas).filter((l) =>
      op.filtros.every(([c, v]) => l[c] === v),
    );
    // A RLS de UPDATE/DELETE some com a linha: zero afetadas, sem erro. A leitura passa.
    const linhas = rlsSemLinhas && (op.acao === "update" || op.acao === "delete") ? [] : achadas;
    if (op.acao === "insert") {
      const nova = {
        id: NOTA,
        created_at: "2026-10-17T10:00:00Z",
        updated_at: "2026-10-17T10:00:00Z",
        ...op.valores,
      };
      estado.notas.push(nova);
      return { data: nova, error: null };
    }
    if (op.acao === "update") {
      linhas.forEach((l) => Object.assign(l, op.valores));
      return { data: linhas[0] ?? null, error: null };
    }
    if (op.acao === "delete") {
      estado.notas = estado.notas.filter((l) => !linhas.includes(l));
      return { data: linhas, error: null, count: linhas.length };
    }
    return { data: linhas, error: null };
  };
  const cadeia: Record<string, unknown> = {};
  const self = () => cadeia;
  Object.assign(cadeia, {
    from: (tabela: string) => {
      op.tabela = tabela;
      op.acao = "select";
      op.filtros = [];
      op.valores = {};
      return cadeia;
    },
    select: self,
    order: self,
    insert: (v: Linha) => ((op.acao = "insert"), (op.valores = v), cadeia),
    update: (v: Linha) => ((op.acao = "update"), (op.valores = v), cadeia),
    delete: () => ((op.acao = "delete"), cadeia),
    eq: (c: string, v: unknown) => (op.filtros.push([c, v]), cadeia),
    maybeSingle: async () => {
      const r = resolver();
      return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
    },
    single: async () => {
      const r = resolver();
      return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
    },
    then: (res: (v: unknown) => void) => res(resolver()),
  });
  // Só `from` sai daqui: a cadeia é "thenable" e `await createClient()` a consumiria.
  return { from: cadeia.from };
}

function sessao(
  role: "viewer" | "agent" | "manager",
  extra: { full_name?: string | null; email?: string } = {},
) {
  vi.mocked(requireRole).mockImplementation(async (min) => {
    const rank = { viewer: 1, agent: 2, manager: 3 };
    if (rank[role] < rank[min as "viewer" | "agent" | "manager"]) {
      return { ok: false, response: new Response(null, { status: 403 }) } as never;
    }
    return {
      ok: true,
      user: { id: USER, full_name: "Ana", email: "ana@escale.com", idioma: "pt-BR", ...extra },
      org: { orgId: ORG, role },
    } as never;
  });
}

const pedido = (caminho: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${caminho}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
const ctx = (extra: { notaId?: string } = {}) => ({
  params: Promise.resolve({ id: LEAD, notaId: NOTA, ...extra }),
});

let estado: { leads: Linha[]; notas: Linha[] };
beforeEach(() => {
  vi.clearAllMocks();
  estado = {
    leads: [{ id: LEAD, organization_id: ORG, contact_id: "c1", pipeline_id: "p1" }],
    notas: [
      {
        id: NOTA,
        organization_id: ORG,
        lead_id: LEAD,
        contact_id: "c1",
        user_id: USER,
        user_nome: "Ana",
        texto: "antiga",
      },
    ],
  };
  vi.mocked(createClient).mockResolvedValue(fakeSupabase(estado) as never);
});

describe("GET /api/v1/leads/[id]/notas", () => {
  it("viewer lista as notas do negócio", async () => {
    sessao("viewer");
    const res = await GET(pedido(`/api/v1/leads/${LEAD}/notas`, "GET"), ctx());
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { texto: string }[] };
    expect(corpo.data.map((n) => n.texto)).toEqual(["antiga"]);
  });
});

describe("POST", () => {
  it("agent cria a nota como autor e emite a atividade note com o ponteiro", async () => {
    sessao("agent");
    const res = await POST(
      pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "  Ligar amanhã  " }),
      ctx(),
    );
    expect(res.status).toBe(201);
    const corpo = (await res.json()) as {
      data: { texto: string; user_id: string; user_nome: string };
    };
    expect(corpo.data).toMatchObject({ texto: "Ligar amanhã", user_id: USER, user_nome: "Ana" });
    expect(atividade.emitLeadActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "note",
        leadId: LEAD,
        sourceModule: "escale",
        reason: "Nova nota",
        payload: { nota_id: NOTA },
      }),
    );
  });
  it("viewer recebe 403; texto vazio ou acima de 4000 recebe 422; negócio de outra organização, 404", async () => {
    sessao("viewer");
    expect(
      (await POST(pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "x" }), ctx())).status,
    ).toBe(403);
    sessao("agent");
    expect(
      (await POST(pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "   " }), ctx())).status,
    ).toBe(422);
    expect(
      (
        await POST(
          pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "a".repeat(4001) }),
          ctx(),
        )
      ).status,
    ).toBe(422);
    estado.leads = [];
    expect(
      (await POST(pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "x" }), ctx())).status,
    ).toBe(404);
  });
  it("não confia no corpo: organização, contato e autor vêm da sessão e do negócio; o texto não vai à atividade nem ao audit", async () => {
    sessao("agent");
    const res = await POST(
      pedido(`/api/v1/leads/${LEAD}/notas`, "POST", {
        texto: "segredo",
        organization_id: "x",
        contact_id: "y",
        user_nome: "Fulano",
      }),
      ctx(),
    );
    expect(res.status).toBe(422);
    const ok = await POST(
      pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "segredo" }),
      ctx(),
    );
    expect(ok.status).toBe(201);
    const gravada = estado.notas.at(-1) as Linha;
    expect(gravada).toMatchObject({
      organization_id: ORG,
      contact_id: "c1",
      user_id: USER,
      user_nome: "Ana",
    });
    expect(JSON.stringify(atividade.emitLeadActivity.mock.calls)).not.toContain("segredo");
    expect(JSON.stringify(vi.mocked(audit).mock.calls)).not.toContain("segredo");
    expect(vi.mocked(audit)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "lead.note_added",
        organizationId: ORG,
        actorUserId: USER,
        resourceId: NOTA,
      }),
    );
  });
  it("sem nome no perfil, o autor sai da parte local do e-mail", async () => {
    sessao("agent", { full_name: null, email: "bia.souza@escale.com" });
    await POST(pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "oi" }), ctx());
    expect((estado.notas.at(-1) as Linha).user_nome).toBe("bia.souza");
  });
  it("a RLS barrando a gravação responde 403, não 500", async () => {
    sessao("agent");
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase(estado, {
        code: "42501",
        message: "new row violates row-level security policy",
      }) as never,
    );
    expect(
      (await POST(pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "x" }), ctx())).status,
    ).toBe(403);
  });
});

describe("PATCH e DELETE", () => {
  it("edita o texto e apaga (a RLS decide quem pode; a rota só confere o negócio)", async () => {
    sessao("agent");
    const res = await PATCH(
      pedido(`/api/v1/leads/${LEAD}/notas/${NOTA}`, "PATCH", { texto: "nova" }),
      ctx({ notaId: NOTA }),
    );
    expect(res.status).toBe(200);
    expect(estado.notas[0]?.texto).toBe("nova");
    const del = await DELETE(
      pedido(`/api/v1/leads/${LEAD}/notas/${NOTA}`, "DELETE"),
      ctx({ notaId: NOTA }),
    );
    expect(del.status).toBe(204);
    expect(estado.notas).toHaveLength(0);
    expect(vi.mocked(audit)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "lead.note_edited", resourceId: NOTA }),
    );
    expect(vi.mocked(audit)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "lead.note_removed", resourceId: NOTA }),
    );
  });
  it("nota que a RLS não deixa apagar (zero linhas) responde 404", async () => {
    sessao("agent");
    const del = await DELETE(
      pedido(`/api/v1/leads/${LEAD}/notas/99999999-9999-4999-8999-999999999999`, "DELETE"),
      ctx({ notaId: "99999999-9999-4999-8999-999999999999" }),
    );
    expect(del.status).toBe(404);
  });
  it("nota que existe mas a RLS não deixa mexer (de outra pessoa) responde 403; id inexistente, 404", async () => {
    sessao("agent");
    vi.mocked(createClient).mockResolvedValue(fakeSupabase(estado, undefined, true) as never);
    const res = await PATCH(
      pedido(`/api/v1/leads/${LEAD}/notas/${NOTA}`, "PATCH", { texto: "nova" }),
      ctx({ notaId: NOTA }),
    );
    expect(res.status).toBe(403);
    expect(estado.notas[0]?.texto).toBe("antiga");
    expect(vi.mocked(audit)).not.toHaveBeenCalled();
  });
  it("erro de permissão do banco responde 403, nunca 500", async () => {
    sessao("agent");
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase(estado, { code: "42501", message: "permission denied" }) as never,
    );
    expect(
      (
        await PATCH(
          pedido(`/api/v1/leads/${LEAD}/notas/${NOTA}`, "PATCH", { texto: "n" }),
          ctx({ notaId: NOTA }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await DELETE(pedido(`/api/v1/leads/${LEAD}/notas/${NOTA}`, "DELETE"), ctx({ notaId: NOTA })))
        .status,
    ).toBe(403);
  });
});
