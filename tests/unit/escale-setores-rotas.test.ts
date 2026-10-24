import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as REMOVER, PATCH as EDITAR } from "@/app/api/v1/setores/[id]/route";
import { GET as DAS_CONVERSAS } from "@/app/api/v1/setores/das-conversas/route";
import { PUT as DO_DISPOSITIVO } from "@/app/api/v1/setores/do-dispositivo/route";
import { GET as LISTAR, POST as CRIAR } from "@/app/api/v1/setores/route";
import { audit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const S1 = "a0000000-0000-4000-8000-000000000001";
const M1 = "b0000000-0000-4000-8000-000000000001";
const CS = "c0000000-0000-4000-8000-000000000003";
const CV = "d0000000-0000-4000-8000-000000000001";
const usar = (
  tabelas: Parameters<typeof bancoPorTabela>[0],
  opcoes?: Parameters<typeof bancoPorTabela>[1],
) => {
  const b = bancoPorTabela(tabelas, opcoes);
  vi.mocked(createClient).mockResolvedValue(b.db as never);
  return b;
};
const req = (metodo: string, url: string, corpo?: unknown) =>
  new NextRequest(url, {
    method: metodo,
    ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
  } as never);
const corpo = async (r: Response) =>
  (await r.json()) as { data: unknown; error?: { message: string } };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.mocked(audit).mockClear();
  authOk("admin");
});

describe("GET e POST /api/v1/setores", () => {
  it("lista com membros e contagem de dispositivos", async () => {
    usar({
      crm_setores: [{ id: S1, nome: "Atendimento", cor: "#0EA5C6" }],
      crm_setores_membros: [{ setor_id: S1, user_id: M1 }],
      crm_setor_do_dispositivo: [{ setor_id: S1, channel_session_id: CS }],
    });
    const { data } = await corpo(await LISTAR(req("GET", "http://x/api/v1/setores")));
    expect(data).toEqual([
      {
        id: S1,
        nome: "Atendimento",
        cor: "#0EA5C6",
        membros: [M1],
        dispositivos: 1,
        ids_dos_dispositivos: [CS],
      },
    ]);
  });
  it("cria o setor e os membros; nome repetido → 409; sem permissão → 403", async () => {
    const { escritas } = usar({ crm_setores: [{ id: S1 }] });
    const r = await CRIAR(
      req("POST", "http://x/api/v1/setores", { nome: " Vendas ", cor: "#1C3FD8", membros: [M1] }),
    );
    expect(r.status).toBe(201);
    expect(escritas[0]).toMatchObject({
      tabela: "crm_setores",
      op: "insert",
      valores: { organization_id: ORG_ID, nome: "Vendas", cor: "#1C3FD8", criado_por: USER_ID },
    });
    expect(
      escritas.find((e) => e.tabela === "crm_setores_membros" && e.op === "upsert")!.valores,
    ).toEqual([{ organization_id: ORG_ID, setor_id: S1, user_id: M1 }]);
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({ action: "crm_setor.created" });
    usar({}, { erros: { crm_setores: { code: "23505", message: "duplicate" } } });
    const r2 = await CRIAR(
      req("POST", "http://x/api/v1/setores", { nome: "Vendas", cor: "#1C3FD8", membros: [] }),
    );
    expect(r2.status).toBe(409);
    expect((await corpo(r2)).error?.message).toBe("Já existe um setor com esse nome.");
    usar({}, { erros: { crm_setores: { code: "42501", message: "rls" } } });
    expect(
      (
        await CRIAR(
          req("POST", "http://x/api/v1/setores", { nome: "X", cor: "#1C3FD8", membros: [] }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await CRIAR(
          req("POST", "http://x/api/v1/setores", { nome: "", cor: "#1C3FD8", membros: [] }),
        )
      ).status,
    ).toBe(422);
  });
});

describe("PATCH e DELETE /api/v1/setores/[id]", () => {
  it("edita nome/cor e troca os membros; remove", async () => {
    const { escritas } = usar({ crm_setores: [{ id: S1 }] });
    expect(
      (
        await EDITAR(
          req("PATCH", "http://x", { nome: "Suporte", cor: "#F0384B", membros: [M1] }),
          ctx(S1),
        )
      ).status,
    ).toBe(200);
    expect(escritas[0]).toMatchObject({
      tabela: "crm_setores",
      op: "update",
      valores: { nome: "Suporte", cor: "#F0384B" },
    });
    expect(escritas.some((e) => e.tabela === "crm_setores_membros" && e.op === "delete")).toBe(
      true,
    );
    const b2 = usar({ crm_setores: [{ id: S1 }] });
    expect((await REMOVER(req("DELETE", "http://x"), ctx(S1))).status).toBe(204);
    expect(b2.escritas[0]).toMatchObject({ tabela: "crm_setores", op: "delete" });
    usar({ crm_setores: [] });
    expect((await REMOVER(req("DELETE", "http://x"), ctx(S1))).status).toBe(404);
  });
});

describe("PUT /api/v1/setores/do-dispositivo", () => {
  it("upsert com setor; delete sem setor; agente → 403", async () => {
    const { escritas } = usar({});
    expect(
      (await DO_DISPOSITIVO(req("PUT", "http://x", { channel_session_id: CS, setor_id: S1 })))
        .status,
    ).toBe(204);
    expect(escritas[0]).toMatchObject({
      tabela: "crm_setor_do_dispositivo",
      op: "upsert",
      valores: { channel_session_id: CS, organization_id: ORG_ID, setor_id: S1 },
    });
    const b2 = usar({});
    expect(
      (await DO_DISPOSITIVO(req("PUT", "http://x", { channel_session_id: CS, setor_id: null })))
        .status,
    ).toBe(204);
    expect(b2.escritas[0]).toMatchObject({ op: "delete" });
    authOk("agent");
    const { requireRole } = await import("@/lib/auth/require-role");
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 403 }),
    } as never);
    expect(
      (await DO_DISPOSITIVO(req("PUT", "http://x", { channel_session_id: CS, setor_id: S1 })))
        .status,
    ).toBe(403);
  });
});

describe("GET /api/v1/setores/das-conversas", () => {
  it("o explícito vence o do dispositivo; em transferência traz o anterior", async () => {
    usar({
      conversations: [
        { id: CV, channel_session_id: CS },
        { id: "e0000000-0000-4000-8000-000000000002", channel_session_id: CS },
      ],
      crm_setor_da_conversa: [
        { conversation_id: CV, setor_id: "s2", em_transferencia: true, setor_anterior_id: S1 },
      ],
      crm_setor_do_dispositivo: [{ channel_session_id: CS, setor_id: S1 }],
      crm_setores: [
        { id: S1, nome: "Atendimento", cor: "#0EA5C6" },
        { id: "s2", nome: "Suporte", cor: "#F0384B" },
      ],
    });
    const r = await DAS_CONVERSAS(
      req(
        "GET",
        `http://x/api/v1/setores/das-conversas?ids=${CV},e0000000-0000-4000-8000-000000000002`,
      ),
    );
    expect((await corpo(r)).data).toEqual({
      [CV]: {
        setor: { id: "s2", nome: "Suporte", cor: "#F0384B" },
        em_transferencia: true,
        setor_anterior: { id: S1, nome: "Atendimento", cor: "#0EA5C6" },
      },
      "e0000000-0000-4000-8000-000000000002": {
        setor: { id: S1, nome: "Atendimento", cor: "#0EA5C6" },
        em_transferencia: false,
        setor_anterior: null,
      },
    });
    expect(
      (await DAS_CONVERSAS(req("GET", "http://x/api/v1/setores/das-conversas?ids="))).status,
    ).toBe(422);
  });
});
