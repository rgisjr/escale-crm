import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

import { POST as DUPLICAR } from "@/app/api/v1/indicadores-da-casca/paineis/[id]/duplicar/route";
import { DELETE, PATCH } from "@/app/api/v1/indicadores-da-casca/paineis/[id]/route";
import { GET, POST } from "@/app/api/v1/indicadores-da-casca/paineis/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID } from "@/tests/helpers/stages-db-double";

const P1 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const OUTRO = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

function autenticar(papel: Role): void {
  vi.mocked(requireRole).mockImplementation((async (min: Role) =>
    roleAtLeast(papel, min)
      ? {
          ok: true,
          user: { id: USER_ID, idioma: "pt-BR", organizations: [] },
          org: { orgId: ORG_ID, name: "Org", role: papel },
        }
      : { ok: false, response: new Response(null, { status: 403 }) }) as never);
}

type Resposta = { data: unknown; error: { message: string } | null };
type Linha = Record<string, unknown>;

const linha = (over: Linha = {}): Linha => ({
  id: P1,
  nome: "Vendas",
  cor: "marca",
  icone: "briefcase",
  created_at: "2026-07-07T02:00:00Z",
  padrao: false,
  permissoes_usuarios: [],
  permissoes_papeis: [],
  ...over,
});

/** Um cliente falso que anota cada chamada (tabela, método, argumentos) e responde por tabela. */
function banco(opts: { paineis?: Linha[]; membros?: string[]; rpc?: Record<string, Resposta> } = {}) {
  const chamadas: { tabela: string; metodo: string; args: unknown[] }[] = [];
  const db = {
    chamadas,
    rpc: vi.fn((nome: string) => Promise.resolve(opts.rpc?.[nome] ?? { data: null, error: null })),
    from: vi.fn((tabela: string) => {
      const c: Record<string, unknown> = {};
      const resultado = (): Resposta =>
        tabela === "user_organizations"
          ? { data: (opts.membros ?? []).map((user_id) => ({ user_id })), error: null }
          : { data: opts.paineis ?? [], error: null };
      for (const m of ["select", "eq", "is", "not", "limit", "insert", "update"]) {
        c[m] = vi.fn((...args: unknown[]) => {
          chamadas.push({ tabela, metodo: m, args });
          return c;
        });
      }
      c.maybeSingle = vi.fn(async () => ({ data: (opts.paineis ?? [])[0] ?? null, error: null }));
      c.single = vi.fn(async () => ({ data: { id: "novo" }, error: null }));
      c.then = (ok: (r: Resposta) => unknown) => Promise.resolve(resultado()).then(ok);
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const patch = (id: string, corpo: unknown) =>
  PATCH(new NextRequest(new URL(`http://x/api/v1/indicadores-da-casca/paineis/${id}`), { method: "PATCH", body: JSON.stringify(corpo) }), ctx(id));
const pedido = (id: string) => new NextRequest(new URL(`http://x/api/v1/indicadores-da-casca/paineis/${id}`));
const corpo = async (r: Response) => (await r.json()) as { data?: Record<string, unknown>; error?: { message: string } };

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(audit).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
});

describe("GET /paineis", () => {
  it("agente recebe a lista em ordem alfabética, sem as listas de permissão", async () => {
    autenticar("agent");
    banco({ paineis: [linha({ id: "b", nome: "Zeta", permissoes_papeis: ["manager"] }), linha({ id: "a", nome: "Ágil" })] });
    const r = await GET();
    expect(r.status).toBe(200);
    const paineis = (await corpo(r)).data?.paineis as { nome: string; permissoesPapeis: string[]; criadoEm: string }[];
    expect(paineis.map((p) => p.nome)).toEqual(["Ágil", "Zeta"]);
    expect(paineis[1]?.permissoesPapeis).toEqual([]);
    expect(paineis[0]?.criadoEm).toBe("2026-07-07T02:00:00Z");
  });

  it("gerente recebe as listas de permissão", async () => {
    autenticar("manager");
    banco({ paineis: [linha({ permissoes_papeis: ["manager"] })] });
    const paineis = (await corpo(await GET())).data?.paineis as { permissoesPapeis: string[] }[];
    expect(paineis[0]?.permissoesPapeis).toEqual(["manager"]);
  });

  it("viewer leva 403", async () => {
    autenticar("viewer");
    expect((await GET()).status).toBe(403);
  });
});

describe("POST /paineis", () => {
  it("agente leva 403", async () => {
    autenticar("agent");
    expect((await POST()).status).toBe(403);
  });

  it("gerente cria em branco com o nome, a cor e o ícone padrão, na organização da sessão", async () => {
    autenticar("manager");
    const db = banco();
    const r = await POST();
    expect(r.status).toBe(201);
    expect((await corpo(r)).data).toEqual({ id: "novo" });
    const insert = db.chamadas.find((c) => c.metodo === "insert");
    expect(insert?.args[0]).toEqual({
      organization_id: ORG_ID,
      nome: "Novo dashboard",
      cor: "marca",
      icone: "briefcase",
      criado_por: USER_ID,
    });
    expect(vi.mocked(audit).mock.calls[0]?.[0]).toMatchObject({ action: "dashboard.created" });
  });

  it("aceita o nome do painel criado pelo editor de gráfico (7D)", async () => {
    autenticar("manager");
    const db = banco();
    const req = new NextRequest("http://localhost/x", { method: "POST", body: JSON.stringify({ nome: "Time SDR" }) });
    expect((await POST(req)).status).toBe(201);
    expect(db.chamadas.find((c) => c.metodo === "insert")?.args[0]).toMatchObject({ nome: "Time SDR" });
  });

  it("recusa nome vazio (7D)", async () => {
    autenticar("manager");
    banco();
    const req = new NextRequest("http://localhost/x", { method: "POST", body: JSON.stringify({ nome: "" }) });
    expect((await POST(req)).status).toBe(422);
  });

  it("suporte somente leitura recebe a resposta da trava", async () => {
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 423 }) as never);
    expect((await POST()).status).toBe(423);
  });
});

describe("PATCH /paineis/:id", () => {
  it("corpo inválido → 422 com o texto da Clint", async () => {
    autenticar("manager");
    banco({ paineis: [linha()] });
    const r = await patch(P1, { cor: "#000000" });
    expect(r.status).toBe(422);
    expect((await corpo(r)).error?.message).toBe("Falha na validação dos dados!");
  });

  it("painel que a pessoa não vê → 404", async () => {
    autenticar("manager");
    banco({ paineis: [] });
    expect((await patch(P1, { nome: "X" })).status).toBe(404);
  });

  it("usuário fora da equipe → 422", async () => {
    autenticar("manager");
    banco({ paineis: [linha()], membros: [USER_ID] });
    const r = await patch(P1, { permissoesUsuarios: [OUTRO] });
    expect(r.status).toBe(422);
    expect((await corpo(r)).error?.message).toBe("Este usuário não faz parte da equipe.");
  });

  it("gerente que tira a si e ao papel → 422 (Q5)", async () => {
    autenticar("manager");
    banco({ paineis: [linha()], membros: [USER_ID, OUTRO] });
    const r = await patch(P1, { permissoesUsuarios: [OUTRO], permissoesPapeis: ["agent"] });
    expect(r.status).toBe(422);
    expect((await corpo(r)).error?.message).toBe("Inclua você ou o seu papel para continuar vendo este dashboard.");
  });

  it("admin pode fazer o mesmo", async () => {
    autenticar("admin");
    banco({ paineis: [linha()], membros: [USER_ID, OUTRO] });
    expect((await patch(P1, { permissoesUsuarios: [OUTRO], permissoesPapeis: ["agent"] })).status).toBe(200);
  });

  it("grava só os campos enviados e audita", async () => {
    autenticar("manager");
    const db = banco({ paineis: [linha()] });
    const r = await patch(P1, { nome: " Novo nome " });
    expect(r.status).toBe(200);
    const update = db.chamadas.find((c) => c.metodo === "update");
    expect(Object.keys(update?.args[0] as object).sort()).toEqual(["nome", "updated_at"]);
    expect((update?.args[0] as { nome: string }).nome).toBe("Novo nome");
    expect(vi.mocked(audit).mock.calls[0]?.[0]).toMatchObject({
      action: "dashboard.updated",
      metadata: { campos: ["nome"] },
    });
  });
});

describe("DELETE /paineis/:id", () => {
  it.each([
    ["painel_protegido", 409, "Não é possível excluir um dashboard padrão ou template."],
    ["painel_nao_encontrado", 404, "Dashboard não encontrado."],
    ["sem_permissao", 403, "Sem permissão."],
  ])("%s → %i", async (erro, status, texto) => {
    autenticar("manager");
    banco({ rpc: { fn_escale_excluir_painel: { data: null, error: { message: erro } } } });
    const r = await DELETE(pedido(P1), ctx(P1));
    expect(r.status).toBe(status);
    expect((await corpo(r)).error?.message).toBe(texto);
  });

  it("sucesso → 200 e audita", async () => {
    autenticar("manager");
    const db = banco();
    const r = await DELETE(pedido(P1), ctx(P1));
    expect(r.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_excluir_painel", { p_painel: P1 });
    expect(vi.mocked(audit).mock.calls[0]?.[0]).toMatchObject({ action: "dashboard.deleted" });
  });
});

describe("POST /paineis/:id/duplicar", () => {
  it("chama a função com o nome da cópia", async () => {
    autenticar("manager");
    const db = banco({ paineis: [linha()], rpc: { fn_escale_duplicar_painel: { data: "copia", error: null } } });
    const r = await DUPLICAR(pedido(P1), ctx(P1));
    expect(r.status).toBe(201);
    expect((await corpo(r)).data).toEqual({ id: "copia" });
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_duplicar_painel", { p_painel: P1, p_nome: "Vendas (cópia)" });
  });

  it("painel não lido → 404", async () => {
    autenticar("manager");
    banco({ paineis: [] });
    expect((await DUPLICAR(pedido(P1), ctx(P1))).status).toBe(404);
  });

  it("id que não é uuid → 404 sem tocar no banco", async () => {
    autenticar("manager");
    const db = banco();
    expect((await DUPLICAR(pedido("x"), ctx("x"))).status).toBe(404);
    expect(db.from).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
