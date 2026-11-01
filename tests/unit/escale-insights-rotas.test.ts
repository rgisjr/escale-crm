import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as GET_EXECUCOES } from "@/app/api/v1/automacoes-da-casca/[id]/execucoes/route";
import { GET as GET_EXPORTAR } from "@/app/api/v1/automacoes-da-casca/[id]/execucoes/exportar/route";
import { GET as GET_INSIGHTS } from "@/app/api/v1/automacoes-da-casca/[id]/insights/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

type Resposta = { data: unknown; error: { message: string } | null };

const ID = "e5ca1e00-9707-4000-8000-0000000000a1";
const REGRA = { id: ID, name: "Boas-vindas", actions: [{ type: "send_whatsapp_message" }] };
const RESUMO = { total: 3, sucesso: 2, parcial: 0, falhou: 1, adiado: 0, ultima: "2026-10-30T12:00:00Z", passos: [] };

function banco({ regra = REGRA as unknown, rpc = {} }: { regra?: unknown; rpc?: Record<string, Resposta> } = {}) {
  const db = {
    rpc: vi.fn((nome: string, _args?: unknown) => Promise.resolve(rpc[nome] ?? { data: null, error: null })),
    from: vi.fn(() => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
      c.maybeSingle = vi.fn().mockResolvedValue({ data: regra, error: null });
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

const pedido = (url: string) => new NextRequest(new URL(url, "http://x"));
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) });
const argsDaRpc = (db: ReturnType<typeof banco>) => db.rpc.mock.calls[0]![1] as Record<string, unknown>;

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockReset();
});

describe.each([
  ["insights", (id?: string) => GET_INSIGHTS(pedido("/x"), ctx(id))],
  ["execucoes", (id?: string) => GET_EXECUCOES(pedido("/x"), ctx(id))],
  ["exportar", (id?: string) => GET_EXPORTAR(pedido("/x"), ctx(id))],
])("a porta de %s", (_nome, chamar) => {
  it("id que não é uuid → 404 sem tocar no banco", async () => {
    authOk("manager");
    const r = await chamar("nao-e-uuid");
    expect(r.status).toBe(404);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("regra de outra organização → 404 e nenhuma RPC", async () => {
    authOk("manager");
    const db = banco({ regra: null });
    const r = await chamar();
    expect(r.status).toBe(404);
    expect((await r.json()).error.message).toBe("Regra não encontrada.");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("quem não é gerente recebe a resposta do requireRole", async () => {
    vi.mocked(requireRole).mockResolvedValue({ ok: false, response: new Response("no", { status: 403 }) } as never);
    const r = await chamar();
    expect(r.status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("GET /insights", () => {
  it("pede o resumo desde 7 dias atrás", async () => {
    authOk("manager");
    vi.useFakeTimers().setSystemTime(new Date("2026-10-31T12:00:00Z"));
    const db = banco({ rpc: { fn_escale_resumo_da_automacao: { data: RESUMO, error: null } } });
    const r = await GET_INSIGHTS(pedido("/x?periodo=7d"), ctx());
    vi.useRealTimers();
    expect(r.status).toBe(200);
    expect(argsDaRpc(db)).toEqual({ p_regra: ID, p_desde: "2026-10-24T12:00:00.000Z" });
    expect((await r.json()).data).toMatchObject({ total: 3, falhou: 1 });
  });

  it("período inválido → 422; erro da RPC → 500", async () => {
    authOk("manager");
    banco();
    expect((await GET_INSIGHTS(pedido("/x?periodo=xx"), ctx())).status).toBe(422);
    banco({ rpc: { fn_escale_resumo_da_automacao: { data: null, error: { message: "boom" } } } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await GET_INSIGHTS(pedido("/x"), ctx())).status).toBe(500);
  });
});

const LINHA = {
  id: "r1",
  status: "failed",
  created_at: "2026-10-30T12:00:00Z",
  event_id: "ev1",
  actions_result: [{ type: "call_webhook", status: "failed" }],
  contato_id: "k1",
  contato_nome: "Ana",
  contato_telefone: "+5553984555965",
  contato_email: null,
  contato_tem_foto: false,
  negocio_id: "n1",
  negocio_titulo: "Negócio",
};

describe("GET /execucoes", () => {
  it("página 3 → limite 10 e deslocamento 20; status viram p_situacoes", async () => {
    authOk("manager");
    const db = banco({ rpc: { fn_escale_execucoes_da_automacao: { data: { total: 25, linhas: [LINHA] }, error: null } } });
    const r = await GET_EXECUCOES(pedido("/x?pagina=3&situacoes=success,failed"), ctx());
    expect(r.status).toBe(200);
    expect(argsDaRpc(db)).toMatchObject({
      p_regra: ID,
      p_limite: 10,
      p_deslocamento: 20,
      p_situacoes: ["success", "failed"],
      p_passos: null,
      p_tipos: null,
    });
    const corpo = (await r.json()).data;
    expect(corpo.total).toBe(25);
    expect(corpo.linhas[0]).toMatchObject({
      id: "r1",
      criadaEm: "2026-10-30T12:00:00Z",
      eventoId: "ev1",
      contato: { id: "k1", nome: "Ana", telefone: "+5553984555965", temFoto: false },
      negocio: { id: "n1", titulo: "Negócio" },
    });
  });

  it("filtro por passo manda índices, tipos e resultados, e anula as situações", async () => {
    authOk("manager");
    const db = banco({ rpc: { fn_escale_execucoes_da_automacao: { data: { total: 0, linhas: [] }, error: null } } });
    await GET_EXECUCOES(pedido("/x?passos=1:call_webhook,2:add_tag&resultados=erro"), ctx());
    expect(argsDaRpc(db)).toMatchObject({
      p_passos: [1, 2],
      p_tipos: ["call_webhook", "add_tag"],
      p_resultados: ["erro"],
      p_situacoes: null,
    });
  });

  it("situação desconhecida → 422", async () => {
    authOk("manager");
    banco();
    expect((await GET_EXECUCOES(pedido("/x?situacoes=ok"), ctx())).status).toBe(422);
  });
});

describe("GET /execucoes/exportar", () => {
  const linhas = (n: number) => Array.from({ length: n }, (_, i) => ({ ...LINHA, id: `r${i}` }));

  it("5.001 linhas → 422 lista_grande_demais, sem auditoria", async () => {
    authOk("manager");
    banco({ rpc: { fn_escale_execucoes_da_automacao: { data: { total: 5001, linhas: linhas(5001) }, error: null } } });
    const r = await GET_EXPORTAR(pedido("/x"), ctx());
    expect(r.status).toBe(422);
    const corpo = await r.json();
    expect(corpo.error.code).toBe("lista_grande_demais");
    expect(corpo.error.message).toBe("A lista tem mais de 5.000 execuções. Refine os filtros para exportar um conjunto menor.");
    expect(audit).not.toHaveBeenCalled();
  });

  it("2 linhas → 200 com as linhas, as ações e o nome; audita; pediu 5.001 a partir de 0", async () => {
    authOk("manager");
    const db = banco({ rpc: { fn_escale_execucoes_da_automacao: { data: { total: 2, linhas: linhas(2) }, error: null } } });
    const r = await GET_EXPORTAR(pedido("/x?periodo=90d"), ctx());
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(argsDaRpc(db)).toMatchObject({ p_limite: 5001, p_deslocamento: 0 });
    const corpo = (await r.json()).data;
    expect(corpo.linhas).toHaveLength(2);
    expect(corpo.nome).toBe("Boas-vindas");
    expect(corpo.acoes).toEqual([{ type: "send_whatsapp_message" }]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "automation.runs_exported", resourceId: ID, metadata: { linhas: 2, periodo: "90d" } }),
    );
  });
});
