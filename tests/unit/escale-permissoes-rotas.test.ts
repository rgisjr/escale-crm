import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DELETE as RESETAR,
  GET as LER,
  PUT as GRAVAR,
} from "@/app/api/v1/permissoes-de-atendimento/route";
import { PUT as SETORES_DA_PESSOA } from "@/app/api/v1/usuarios-da-casca/[user_id]/setores/route";
import { GET as USUARIOS } from "@/app/api/v1/usuarios-da-casca/route";
import { audit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const ALVO = "b0000000-0000-4000-8000-000000000001";
const S1 = "a0000000-0000-4000-8000-000000000001";
const usar = (tabelas: Parameters<typeof bancoPorTabela>[0]) => {
  const b = bancoPorTabela(tabelas);
  vi.mocked(createClient).mockResolvedValue(b.db as never);
  return b;
};
const req = (metodo: string, url: string, corpo?: unknown) =>
  new NextRequest(url, {
    method: metodo,
    ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
  } as never);
const json = async (r: Response) => (await r.json()) as { data: unknown };

beforeEach(() => {
  vi.mocked(audit).mockClear();
  authOk("admin");
});

describe("permissões de uma pessoa", () => {
  it("lê as exceções", async () => {
    usar({ crm_permissoes_de_atendimento: [{ chave: "CHAT_BULK_ACTIONS", ligado: true }] });
    const { data } = await json(await LER(req("GET", `http://x?user_id=${ALVO}`)));
    expect(data).toEqual({ excecoes: { CHAT_BULK_ACTIONS: true } });
  });
  it("grava (upsert) e apaga (null); recusa chave travada, piso e admin", async () => {
    const { escritas } = usar({
      user_organizations: [{ role: "agent" }],
      crm_permissoes_de_atendimento: [{ chave: "CHAT_BULK_ACTIONS", ligado: true }],
    });
    const r = await GRAVAR(
      req("PUT", "http://x", {
        user_id: ALVO,
        valores: { CHAT_BULK_ACTIONS: true, CHAT_VIEW_TEAM: null },
      }),
    );
    expect(r.status).toBe(200);
    expect(escritas.find((e) => e.op === "upsert")!.valores).toEqual([
      {
        organization_id: ORG_ID,
        user_id: ALVO,
        chave: "CHAT_BULK_ACTIONS",
        ligado: true,
        atualizado_por: USER_ID,
        updated_at: expect.any(String),
      },
    ]);
    expect(escritas.find((e) => e.op === "delete")!.filtros).toEqual(
      expect.arrayContaining([["in:chave", ["CHAT_VIEW_TEAM"]]]),
    );
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({
      action: "crm_permissoes.updated",
    });
    usar({ user_organizations: [{ role: "agent" }] });
    expect(
      (await GRAVAR(req("PUT", "http://x", { user_id: ALVO, valores: { CHAT_VIEW_ALL: true } })))
        .status,
    ).toBe(422);
    usar({ user_organizations: [{ role: "agent" }] });
    expect(
      (await GRAVAR(req("PUT", "http://x", { user_id: ALVO, valores: { CHAT_EDIT_TEAMS: true } })))
        .status,
    ).toBe(422);
    usar({ user_organizations: [{ role: "admin" }] });
    expect(
      (
        await GRAVAR(
          req("PUT", "http://x", { user_id: ALVO, valores: { CHAT_BULK_ACTIONS: false } }),
        )
      ).status,
    ).toBe(422);
    usar({ user_organizations: [] });
    expect(
      (
        await GRAVAR(
          req("PUT", "http://x", { user_id: ALVO, valores: { CHAT_BULK_ACTIONS: false } }),
        )
      ).status,
    ).toBe(404);
  });
  it("resetar apaga todas e audita", async () => {
    const { escritas } = usar({});
    expect((await RESETAR(req("DELETE", `http://x?user_id=${ALVO}`))).status).toBe(204);
    expect(escritas[0]).toMatchObject({ tabela: "crm_permissoes_de_atendimento", op: "delete" });
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({
      action: "crm_permissoes.reset",
    });
  });
});

describe("usuários da casca", () => {
  it("devolve setores e o número de exceções de cada pessoa", async () => {
    usar({
      crm_setores_membros: [{ user_id: ALVO, setor_id: S1 }],
      crm_permissoes_de_atendimento: [
        { user_id: ALVO, chave: "CHAT_BULK_ACTIONS" },
        { user_id: ALVO, chave: "CHAT_VIEW_TEAM" },
      ],
    });
    const { data } = await json(await USUARIOS(req("GET", "http://x")));
    expect(data).toEqual({ [ALVO]: { setores: [S1], excecoes: 2 } });
  });
  it("troca os setores de uma pessoa", async () => {
    const { escritas } = usar({});
    const r = await SETORES_DA_PESSOA(req("PUT", "http://x", { setor_ids: [S1] }), {
      params: Promise.resolve({ user_id: ALVO }),
    });
    expect(r.status).toBe(204);
    expect(escritas[0]).toMatchObject({ tabela: "crm_setores_membros", op: "delete" });
    expect(escritas[1]).toMatchObject({
      tabela: "crm_setores_membros",
      op: "insert",
      valores: [{ organization_id: ORG_ID, setor_id: S1, user_id: ALVO }],
    });
  });
});
