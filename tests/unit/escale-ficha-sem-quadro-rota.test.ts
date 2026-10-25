import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/app/api/v1/conversations/_handler", () => ({ idsDeContatosPessoais: vi.fn() }));

import { GET } from "@/app/api/v1/leads/[id]/ficha/route";
import { idsDeContatosPessoais } from "@/app/api/v1/conversations/_handler";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

/** G2-9: a ficha por link lê UM negócio com as etapas, não o quadro inteiro. */
const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const LEAD = "33333333-3333-4333-8333-333333333333";
const PIPE = "44444444-4444-4444-8444-444444444444";
const CONTATO = "55555555-5555-4555-8555-555555555555";

type Linhas = Record<string, unknown[]>;

/** Um dublê do supabase que responde por tabela e anota o que foi lido. */
function banco(linhas: Linhas) {
  const lidas: string[] = [];
  const from = vi.fn((tabela: string) => {
    lidas.push(tabela);
    const api = {
      select: () => api,
      eq: () => api,
      neq: () => api,
      in: () => api,
      order: () => api,
      maybeSingle: async () => ({ data: (linhas[tabela] ?? [])[0] ?? null, error: null }),
      then: (ok: (v: { data: unknown; error: unknown }) => unknown) =>
        Promise.resolve({ data: linhas[tabela] ?? [], error: null }).then(ok),
    };
    return api;
  });
  const rpc = vi.fn(async () => ({ data: [], error: null }));
  return { client: { from, rpc }, lidas };
}

const BASE: Linhas = {
  crm_leads: [{ id: LEAD, pipeline_id: PIPE, contact_id: CONTATO, status: "open", organization_id: ORG }],
  crm_pipelines: [{ id: PIPE, organization_id: ORG, name: "Vendas", settings: {} }],
  crm_stages: [
    { id: "s1", pipeline_id: PIPE, name: "Novo" },
    { id: "s2", pipeline_id: PIPE, name: "Proposta" },
  ],
  contacts: [{ id: CONTATO, name: "Ana", tags: ["vip"], phone_number: "5511999990000", email: null, custom_fields: null }],
  conversations: [],
};

const ctx = (id = LEAD) => ({ params: Promise.resolve({ id }) });
const chama = (id = LEAD) => GET(new NextRequest(`http://x/api/v1/leads/${id}/ficha`), ctx(id));

function com(linhas: Linhas) {
  const b = banco(linhas);
  vi.mocked(createClient).mockResolvedValue(b.client as never);
  return b;
}

beforeEach(() => {
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: USER, idioma: "pt-BR" },
    org: { orgId: ORG },
  } as never);
  vi.mocked(idsDeContatosPessoais).mockResolvedValue([]);
});

describe("GET /api/v1/leads/[id]/ficha", () => {
  it("devolve o formato do quadro com UM negócio e as etapas do funil", async () => {
    com(BASE);
    const res = await chama();
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.pipeline.id).toBe(PIPE);
    expect(data.stages.map((s: { id: string }) => s.id)).toEqual(["s1", "s2"]);
    expect(data.leads).toHaveLength(1);
    expect(data.leads[0].id).toBe(LEAD);
  });

  it("anexa o contato (tags e telefone) como o quadro anexa", async () => {
    com(BASE);
    const { data } = await (await chama()).json();
    expect(data.leads[0].contact_tags).toEqual(["vip"]);
    expect(data.leads[0].contact_phone).toBe("5511999990000");
  });

  it("contato sem conversa sai com `conversa: null`, não ausente (\"Abrir conversa\")", async () => {
    com(BASE);
    const { data } = await (await chama()).json();
    expect(data.leads[0]).toHaveProperty("conversa", null);
  });

  it("traz a conversa mais recente do contato", async () => {
    com({
      ...BASE,
      conversations: [
        { id: "cv1", contact_id: CONTATO, last_message_preview: "oi", last_message_at: "2026-10-25T10:00:00Z", unread_count_for_assignee: 2, tags: null },
      ],
    });
    const { data } = await (await chama()).json();
    expect(data.leads[0].conversa).toMatchObject({ id: "cv1", preview: "oi", unread: 2 });
  });

  it("não lê a próxima ação nem o score (a ficha não os mostra e um GET não escreve na caixa)", async () => {
    const { lidas } = com(BASE);
    await chama();
    expect(lidas).not.toContain("lead_state");
    expect(lidas).not.toContain("crm_lead_scores");
    expect(lidas).not.toContain("agent_inbox_items");
  });

  it("id que não é uuid responde 404 sem ir ao banco", async () => {
    const { lidas } = com(BASE);
    const res = await chama("nao-e-uuid");
    expect(res.status).toBe(404);
    expect(lidas).toEqual([]);
  });

  it("negócio que não existe (ou arquivado) responde 404", async () => {
    com({ ...BASE, crm_leads: [] });
    expect((await chama()).status).toBe(404);
  });

  it("funil que sumiu responde 404", async () => {
    com({ ...BASE, crm_pipelines: [] });
    expect((await chama()).status).toBe(404);
  });

  it("negócio de contato pessoal responde 404, como some do quadro", async () => {
    vi.mocked(idsDeContatosPessoais).mockResolvedValue([CONTATO]);
    com(BASE);
    expect((await chama()).status).toBe(404);
  });

  it("sem sessão devolve a resposta do requireRole", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: new Response(null, { status: 401 }),
    } as never);
    expect((await chama()).status).toBe(401);
  });
});
