import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import {
  filtroAlterado,
  nomeRepetido,
  separarFiltrosSalvos,
  validarNomeDoFiltro,
  type FiltroSalvo,
} from "@/lib/escale/filtros/filtros-salvos";
import { GET, POST } from "@/app/api/v1/filtros-salvos/route";
import { DELETE, PATCH } from "@/app/api/v1/filtros-salvos/[id]/route";
import { ORG_ID, OUTRA_ORG, USER_ID, authOk, makeDb, type PipelineRow } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const F1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const F_VIZINHO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const V1 = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const V_INEXISTENTE = "cccccccc-cccc-4ccc-8ccc-ccccccccccc9";
const OUTRA_PESSOA = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const S_QUENTES = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1";
const S_FRIOS = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2";
const S_DO_TIME = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3";
const S_PARTICULAR = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4";
const S_NA_VISUALIZACAO = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5";
const S_DO_VIZINHO = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6";
const S_NOVO = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7";
const ABERTOS = { status: ["open"] };
const ABERTOS_VIP = { status: ["open"], tags: ["vip"] };

const linha = (id: string, user_id: string, over: Record<string, unknown>) => ({
  id,
  organization_id: ORG_ID,
  user_id,
  pipeline_id: null,
  view_id: null,
  compartilhado: false,
  criterios: ABERTOS,
  ...over,
});

function banco(opts: Parameters<typeof makeDb>[0] = {}) {
  const db = makeDb({
    pipelines: [
      { id: F1, name: "Leads", organization_id: ORG_ID, is_archived: false },
      { id: F_VIZINHO, name: "Do vizinho", organization_id: OUTRA_ORG, is_archived: false },
    ] as unknown as PipelineRow[],
    ...opts,
  });
  const tabelas = db.tabelas as unknown as Record<string, unknown[]>;
  tabelas.crm_pipeline_views = [{ id: V1, organization_id: ORG_ID, name: "Time", acesso: "todos" }];
  tabelas.crm_filtros_salvos = [
    linha(S_QUENTES, USER_ID, { pipeline_id: F1, nome: "Quentes" }),
    linha(S_FRIOS, USER_ID, { pipeline_id: F1, nome: "Frios" }),
    linha(S_DO_TIME, OUTRA_PESSOA, { pipeline_id: F1, nome: "Do time", compartilhado: true }),
    linha(S_PARTICULAR, OUTRA_PESSOA, { pipeline_id: F1, nome: "Particular" }),
    linha(S_NA_VISUALIZACAO, USER_ID, { view_id: V1, nome: "Na visualização" }),
    { ...linha(S_DO_VIZINHO, OUTRA_PESSOA, { pipeline_id: F_VIZINHO, nome: "Vizinho", compartilhado: true }), organization_id: OUTRA_ORG },
  ];
  return db;
}

function pedido(caminho: string, method: string, body?: unknown): NextRequest {
  if (body === undefined) return new NextRequest(`http://localhost${caminho}`, { method });
  return new NextRequest(`http://localhost${caminho}`, {
    method,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const listar = (busca: string) => GET(pedido(`/api/v1/filtros-salvos?${busca}`, "GET"));
const criar = (body: unknown) => POST(pedido("/api/v1/filtros-salvos", "POST", body));
const mudar = (id: string, body: unknown) => PATCH(pedido(`/api/v1/filtros-salvos/${id}`, "PATCH", body), ctx(id));
const excluir = (id: string) => DELETE(pedido(`/api/v1/filtros-salvos/${id}`, "DELETE"), ctx(id));
const listaDe = async (res: Response) => ((await res.json()) as { data: FiltroSalvo[] }).data;
const novoValido = { id: S_NOVO, origem: F1, nome: "Fechando", compartilhado: true, criterios: ABERTOS_VIP };

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  authOk();
});

describe("regras dos filtros salvos", () => {
  it("nome: obrigatório, até 60, sem espaço nas pontas; repetido sem olhar caixa nem acento", () => {
    expect(validarNomeDoFiltro("  Quentes ")).toEqual({ ok: true, nome: "Quentes" });
    expect(validarNomeDoFiltro("  ")).toEqual({ ok: false, erro: "Dê um nome ao filtro." });
    expect(validarNomeDoFiltro("x".repeat(61))).toEqual({ ok: false, erro: "O nome do filtro pode ter até 60 caracteres." });
    const meus = [{ id: "1", nome: "Negócios à vista" }];
    expect(nomeRepetido("negocios a VISTA", meus)).toBe(true);
    expect(nomeRepetido("negocios a VISTA", meus, "1")).toBe(false);
  });

  it("separa os meus dos compartilhados, por nome, e sabe quando o aplicado foi alterado", () => {
    const f = (id: string, nome: string, meu: boolean): FiltroSalvo => ({ id, nome, meu, compartilhado: !meu, criterios: { status: ["open"] } });
    const { meus, compartilhados } = separarFiltrosSalvos([f("b", "Zeta", true), f("a", "alfa", true), f("c", "Do time", false)]);
    expect(meus.map((x) => x.nome)).toEqual(["alfa", "Zeta"]);
    expect(compartilhados.map((x) => x.nome)).toEqual(["Do time"]);
    expect(filtroAlterado(f("a", "alfa", true), { status: ["open"] })).toBe(false);
    expect(filtroAlterado(f("a", "alfa", true), { status: ["open", "won"] })).toBe(true);
  });
});

describe("GET /api/v1/filtros-salvos", () => {
  it("devolve os meus e os compartilhados da origem, sem os particulares de outra pessoa nem os do vizinho", async () => {
    banco();
    const res = await listar(`origem=${F1}`);
    expect(res.status).toBe(200);
    expect(await listaDe(res)).toEqual([
      { id: S_DO_TIME, nome: "Do time", compartilhado: true, meu: false, criterios: ABERTOS },
      { id: S_FRIOS, nome: "Frios", compartilhado: false, meu: true, criterios: ABERTOS },
      { id: S_QUENTES, nome: "Quentes", compartilhado: false, meu: true, criterios: ABERTOS },
    ]);
    expect(vi.mocked(requireRole).mock.calls[0]![0]).toBe("viewer");
  });

  it("os da visualização vêm por ?visualizacao=; sem alvo, com os dois ou com lixo é 422", async () => {
    banco();
    expect((await listaDe(await listar(`visualizacao=${V1}`))).map((f) => f.id)).toEqual([S_NA_VISUALIZACAO]);
    expect((await listar("")).status).toBe(422);
    expect((await listar(`origem=${F1}&visualizacao=${V1}`)).status).toBe(422);
    expect((await listar("origem=nao-e-uuid")).status).toBe(422);
  });
});

describe("POST /api/v1/filtros-salvos", () => {
  it("grava com a organização e a pessoa da sessão, responde 201 com a lista relida e audita", async () => {
    const db = banco();
    const res = await criar({ ...novoValido, nome: "  Fechando  " });
    expect(res.status).toBe(201);
    const escrita = db.escritas.find((e) => e.table === "crm_filtros_salvos")!;
    expect(escrita.tipo).toBe("insert");
    expect(escrita.patch).toEqual({
      id: S_NOVO,
      organization_id: ORG_ID,
      user_id: USER_ID,
      pipeline_id: F1,
      view_id: null,
      nome: "Fechando",
      compartilhado: true,
      criterios: ABERTOS_VIP,
    });
    expect((await listaDe(res)).find((f) => f.id === S_NOVO)).toEqual({
      id: S_NOVO,
      nome: "Fechando",
      compartilhado: true,
      meu: true,
      criterios: ABERTOS_VIP,
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline_filter.created", resourceId: S_NOVO, organizationId: ORG_ID }),
    );
  });

  it("na visualização, grava view_id e deixa pipeline_id nulo", async () => {
    const db = banco();
    const { origem: _origem, ...semOrigem } = novoValido;
    expect((await criar({ ...semOrigem, visualizacao: V1 })).status).toBe(201);
    expect(db.escritas[0]!.patch).toMatchObject({ pipeline_id: null, view_id: V1 });
  });

  it("origem do vizinho ou visualização que não existe é 404, sem gravar", async () => {
    const db = banco();
    expect((await criar({ ...novoValido, origem: F_VIZINHO })).status).toBe(404);
    const { origem: _origem, ...semOrigem } = novoValido;
    expect((await criar({ ...semOrigem, visualizacao: V_INEXISTENTE })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });

  it("nome repetido entre os MEUS é 409; o mesmo nome de um compartilhado de outra pessoa pode", async () => {
    const db = banco();
    expect((await criar({ ...novoValido, nome: "QUENTES" })).status).toBe(409);
    expect(db.escritas).toEqual([]);
    expect((await criar({ ...novoValido, nome: "Do time" })).status).toBe(201);
  });

  it("no limite de 20 filtros meus nesta origem, recusa com 422 e o texto da Clint", async () => {
    const db = banco();
    const tabelas = db.tabelas as unknown as Record<string, unknown[]>;
    for (let i = 0; i < 18; i++) {
      tabelas.crm_filtros_salvos!.push(linha(`ffffffff-ffff-4fff-8fff-${String(i).padStart(12, "0")}`, USER_ID, { pipeline_id: F1, nome: `Filtro ${i}` }));
    }
    const res = await criar(novoValido);
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe(
      "Limite de 20 filtros salvos atingido. Exclua algum para salvar outro.",
    );
    expect(db.escritas).toEqual([]);
  });

  it("corpo que não é JSON é 400; chave a mais, alvo duplo ou ausente, critério inválido e nome vazio são 422", async () => {
    banco();
    expect((await criar("{quebrado")).status).toBe(400);
    expect((await criar({ ...novoValido, organization_id: OUTRA_ORG })).status).toBe(422);
    expect((await criar({ ...novoValido, visualizacao: V1 })).status).toBe(422);
    const { origem: _origem, ...semAlvo } = novoValido;
    expect((await criar(semAlvo)).status).toBe(422);
    expect((await criar({ ...novoValido, criterios: { status: [] } })).status).toBe(422);
    expect((await criar({ ...novoValido, nome: "   " })).status).toBe(422);
  });

  it("os erros do banco têm nome: 23505 é 409 e 42501 é 403", async () => {
    for (const [code, status] of [
      ["23505", 409],
      ["42501", 403],
    ] as const) {
      banco({ writeError: (_n, table) => (table === "crm_filtros_salvos" ? { code, message: `erro ${code}` } : null) });
      expect((await criar(novoValido)).status).toBe(status);
    }
    expect(audit).not.toHaveBeenCalled();
  });

  it("o suporte somente leitura para antes de tudo", async () => {
    banco();
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(new Response(null, { status: 423 }) as never);
    expect((await criar(novoValido)).status).toBe(423);
  });
});

describe("PATCH /api/v1/filtros-salvos/:id", () => {
  it("renomeia e compartilha o próprio filtro, filtrando por id, organização e dono", async () => {
    const db = banco();
    const res = await mudar(S_QUENTES, { nome: "Muito quentes", compartilhado: true });
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_filtros_salvos")!;
    expect(escrita.tipo).toBe("update");
    expect(escrita.patch).toEqual({ nome: "Muito quentes", compartilhado: true });
    expect(escrita.filtros).toEqual(expect.arrayContaining([["id", S_QUENTES], ["organization_id", ORG_ID], ["user_id", USER_ID]]));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_filter.updated", resourceId: S_QUENTES }));
  });

  it("salvar os critérios atuais no filtro; manter o próprio nome não é repetido", async () => {
    const db = banco();
    expect((await mudar(S_QUENTES, { nome: "Quentes", criterios: ABERTOS_VIP })).status).toBe(200);
    expect(db.escritas[0]!.patch).toEqual({ nome: "Quentes", criterios: ABERTOS_VIP });
  });

  it("nome de outro filtro meu é 409; filtro de outra pessoa ou do vizinho é 404; corpo vazio é 422", async () => {
    const db = banco();
    expect((await mudar(S_QUENTES, { nome: "frios" })).status).toBe(409);
    expect((await mudar(S_DO_TIME, { nome: "Meu agora" })).status).toBe(404);
    expect((await mudar(S_DO_VIZINHO, { nome: "Meu agora" })).status).toBe(404);
    expect((await mudar(S_QUENTES, {})).status).toBe(422);
    expect((await mudar("nao-e-uuid", { nome: "x" })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});

describe("DELETE /api/v1/filtros-salvos/:id", () => {
  it("apaga o próprio filtro filtrando por id, organização e dono, e devolve a lista sem ele", async () => {
    const db = banco();
    const res = await excluir(S_QUENTES);
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_filtros_salvos")!;
    expect(escrita.tipo).toBe("delete");
    expect(escrita.filtros).toEqual(expect.arrayContaining([["id", S_QUENTES], ["organization_id", ORG_ID], ["user_id", USER_ID]]));
    expect((await listaDe(res)).map((f) => f.id)).toEqual([S_DO_TIME, S_FRIOS]);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_filter.deleted", resourceId: S_QUENTES }));
  });

  it("filtro compartilhado de outra pessoa é 404 e nada é apagado", async () => {
    const db = banco();
    expect((await excluir(S_DO_TIME)).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});
