import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as DELETE_CAMPO, PATCH as PATCH_CAMPO } from "@/app/api/v1/campos-do-crm/[id]/route";
import { POST as POST_GRUPO } from "@/app/api/v1/campos-do-crm/grupos/route";
import { GET, POST } from "@/app/api/v1/campos-do-crm/route";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

type Linha = Record<string, unknown>;
const GRUPO = { id: "00000000-0000-4000-8000-0000000000a1", organization_id: ORG_ID, objeto: "contato", chave: "informacoes_gerais", nome: "Informações Gerais", posicao: 0, padrao: true };

/** Banco de mentira: cada tabela tem as suas linhas; insert/update/delete gravam em `escrito`. */
function banco(tabelas: Record<string, Linha[]>, escrito: Linha[] = []) {
  const from = vi.fn((tabela: string) => {
    const linhas = tabelas[tabela] ?? [];
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "is", "order", "limit", "neq"]) cadeia[m] = vi.fn(() => cadeia);
    cadeia.maybeSingle = vi.fn().mockResolvedValue({ data: linhas[0] ?? null, error: null });
    cadeia.single = vi.fn().mockResolvedValue({ data: linhas[0] ?? null, error: null });
    cadeia.then = (ok: (r: { data: Linha[]; error: null }) => unknown) => Promise.resolve({ data: linhas, error: null }).then(ok);
    cadeia.insert = vi.fn((corpo: Linha) => {
      escrito.push({ tabela, insert: corpo });
      return cadeia;
    });
    cadeia.update = vi.fn((corpo: Linha) => {
      escrito.push({ tabela, update: corpo });
      return cadeia;
    });
    cadeia.delete = vi.fn(() => {
      escrito.push({ tabela, delete: true });
      return cadeia;
    });
    return cadeia;
  });
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
  vi.mocked(createAdminClient).mockReturnValue({ from, rpc } as never);
  return { from, rpc, escrito };
}

const pedido = (url: string, init?: RequestInit) => new NextRequest(new URL(url, "http://x"), init as never);
const json = (corpo: unknown, method = "POST") =>
  ({ method, body: JSON.stringify(corpo), headers: { "content-type": "application/json" } }) as RequestInit;

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
});

describe("GET /api/v1/campos-do-crm", () => {
  it("devolve só os campos que o papel enxerga", async () => {
    authOk("agent");
    banco({
      crm_grupos_de_campos: [GRUPO],
      crm_campos_do_crm: [
        { id: "c1", objeto: "contato", chave: "cargo", definicao: { label: "Cargo", type: "text" }, grupo_id: "00000000-0000-4000-8000-0000000000a1", papel_minimo: null, posicao: 0, padrao: false },
        { id: "c2", objeto: "contato", chave: "renda", definicao: { label: "Renda", type: "currency" }, grupo_id: "00000000-0000-4000-8000-0000000000a1", papel_minimo: "manager", posicao: 1, padrao: false },
      ],
    });
    const r = await GET(pedido("/api/v1/campos-do-crm?objeto=contato"));
    expect(r.status).toBe(200);
    const { data } = await r.json();
    expect(data.grupos.map((g: Linha) => g.chave)).toEqual(["informacoes_gerais"]);
    expect(data.campos.map((c: Linha) => c.chave)).toEqual(["cargo"]);
  });

  it("objeto inválido é 422", async () => {
    authOk("viewer");
    banco({});
    expect((await GET(pedido("/api/v1/campos-do-crm?objeto=produto"))).status).toBe(422);
  });
});

describe("POST /api/v1/campos-do-crm", () => {
  it("gerente não cria (403); administrador cria com a chave gerada do nome", async () => {
    authOk("manager");
    const b1 = banco({ crm_grupos_de_campos: [GRUPO] });
    expect((await POST(pedido("/api/v1/campos-do-crm", json({ objeto: "contato", nome: "Cargo", grupo_id: "00000000-0000-4000-8000-0000000000a1", tipo: "TEXT" })))).status).toBe(403);
    expect(b1.escrito).toHaveLength(0);

    authOk("admin");
    const b2 = banco({ crm_grupos_de_campos: [GRUPO], crm_campos_do_crm: [] });
    const r = await POST(pedido("/api/v1/campos-do-crm", json({ objeto: "contato", nome: "Número de funcionários", grupo_id: "00000000-0000-4000-8000-0000000000a1", tipo: "NUMBER" })));
    expect(r.status).toBe(201);
    const insert = b2.escrito.find((e) => e.insert)?.insert as Linha;
    expect(insert.chave).toBe("numero_de_funcionari");
    expect(insert.definicao).toEqual({ label: "Número de funcionários", type: "number" });
  });

  it("nome repetido no objeto é 422 com o texto da Clint", async () => {
    authOk("admin");
    banco({
      crm_grupos_de_campos: [GRUPO],
      crm_campos_do_crm: [{ id: "c1", objeto: "contato", chave: "cargo", definicao: { label: "Cargo", type: "text" }, grupo_id: "00000000-0000-4000-8000-0000000000a1", papel_minimo: null, posicao: 0, padrao: false }],
    });
    const r = await POST(pedido("/api/v1/campos-do-crm", json({ objeto: "contato", nome: "cargo", grupo_id: "00000000-0000-4000-8000-0000000000a1", tipo: "TEXT" })));
    expect(r.status).toBe(422);
    expect((await r.json()).error.message).toBe("Já existe um outro campo com o nome informado, o campo deve ser único.");
  });

  it("seleção exige ao menos uma opção; o negócio vai para crm_campos_do_negocio", async () => {
    authOk("admin");
    const b = banco({ crm_grupos_de_campos: [{ ...GRUPO, objeto: "negocio" }], crm_campos_do_negocio: [] });
    expect((await POST(pedido("/api/v1/campos-do-crm", json({ objeto: "negocio", nome: "Origem", grupo_id: "00000000-0000-4000-8000-0000000000a1", tipo: "SELECT", opcoes: [] })))).status).toBe(422);
    const r = await POST(pedido("/api/v1/campos-do-crm", json({ objeto: "negocio", nome: "Origem", grupo_id: "00000000-0000-4000-8000-0000000000a1", tipo: "SELECT", opcoes: ["Orgânico", "Pago"] })));
    expect(r.status).toBe(201);
    const insert = b.escrito.find((e) => e.insert)!;
    expect(insert.tabela).toBe("crm_campos_do_negocio");
    expect((insert.insert as Linha).definicao).toEqual({ label: "Origem", type: "select", options: [{ value: "Orgânico", label: "Orgânico" }, { value: "Pago", label: "Pago" }] });
  });
});

describe("PATCH e DELETE /api/v1/campos-do-crm/[id]", () => {
  const padrao = { id: "c9", objeto: "empresa", chave: "site", definicao: { label: "Site", type: "url" }, grupo_id: "00000000-0000-4000-8000-0000000000a1", papel_minimo: null, posicao: 0, padrao: true };
  it("campo padrão não renomeia nem se exclui (422 com o texto da Clint); a visibilidade pode mudar", async () => {
    authOk("admin");
    banco({ crm_campos_do_crm: [padrao] });
    const ctx = { params: Promise.resolve({ id: "c9" }) };
    const r1 = (await PATCH_CAMPO(pedido("/api/v1/campos-do-crm/c9?objeto=empresa", json({ nome: "Website" }, "PATCH")), ctx))!;
    expect(r1.status).toBe(422);
    expect((await r1.json()).error.message).toBe("Não é possível editar um campo padrão do sistema");
    expect((await PATCH_CAMPO(pedido("/api/v1/campos-do-crm/c9?objeto=empresa", json({ papel_minimo: "manager" }, "PATCH")), ctx))!.status).toBe(200);
    expect((await DELETE_CAMPO(pedido("/api/v1/campos-do-crm/c9?objeto=empresa", { method: "DELETE" }), ctx))!.status).toBe(422);
  });
});

describe("POST /api/v1/campos-do-crm/grupos", () => {
  it("cria com a chave do nome; nome vazio é 422 com o texto da Clint", async () => {
    authOk("admin");
    const b = banco({ crm_grupos_de_campos: [GRUPO] });
    const r = (await POST_GRUPO(pedido("/api/v1/campos-do-crm/grupos", json({ objeto: "contato", nome: "Kaio IA" }))))!;
    expect(r.status).toBe(201);
    expect((b.escrito[0]!.insert as Linha).chave).toBe("kaio_ia");
    const r2 = (await POST_GRUPO(pedido("/api/v1/campos-do-crm/grupos", json({ objeto: "contato", nome: "  " }))))!;
    expect(r2.status).toBe(422);
    expect((await r2.json()).error.message).toBe("O nome do grupo é obrigatório!");
  });
});
