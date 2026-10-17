import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { PREFS_PADRAO } from "@/lib/escale/capa/tipos";
import { GET, PUT } from "@/app/api/v1/capas-do-card/route";
import { ORG_ID, USER_ID, authOk, makeDb } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Linha = Record<string, unknown>;
const OUTRA = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const SEM_TAGS = { ...PREFS_PADRAO, itens: { ...PREFS_PADRAO.itens, tags: false } };

function banco(linhas: Linha[] = [], opts: Parameters<typeof makeDb>[0] = {}) {
  const db = makeDb(opts);
  (db.tabelas as unknown as Record<string, Linha[]>).crm_capas_do_card = linhas;
  return db;
}
const linhasDe = (db: ReturnType<typeof banco>) =>
  (db.tabelas as unknown as Record<string, Linha[]>).crm_capas_do_card ?? [];
const ler = () => GET(new NextRequest("http://localhost/api/v1/capas-do-card"));
const gravar = (body: unknown) =>
  PUT(
    new NextRequest("http://localhost/api/v1/capas-do-card", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(logger.error).mockClear();
  authOk();
});

describe("/api/v1/capas-do-card", () => {
  it("GET devolve a minha (e só a minha); sem nada, null; gravada fora da forma, null", async () => {
    banco([
      { id: "c1", organization_id: ORG_ID, user_id: USER_ID, capa: SEM_TAGS },
      { id: "c2", organization_id: ORG_ID, user_id: OUTRA, capa: PREFS_PADRAO },
    ]);
    expect(((await (await ler()).json()) as { data: unknown }).data).toEqual({ prefs: SEM_TAGS });
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("viewer");
    banco();
    expect(((await (await ler()).json()) as { data: unknown }).data).toEqual({ prefs: null });
    banco([{ id: "c1", organization_id: ORG_ID, user_id: USER_ID, capa: { itens: 1 } }]);
    expect(((await (await ler()).json()) as { data: unknown }).data).toEqual({ prefs: null });
  });

  it("PUT grava a minha, uma linha por pessoa (a segunda gravação atualiza) e audita", async () => {
    const db = banco();
    expect((await gravar({ prefs: SEM_TAGS })).status).toBe(200);
    expect((await gravar({ prefs: PREFS_PADRAO })).status).toBe(200);
    const minhas = linhasDe(db).filter((l) => l.user_id === USER_ID);
    expect(minhas).toHaveLength(1);
    expect(minhas[0]).toMatchObject({ organization_id: ORG_ID, capa: PREFS_PADRAO });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "card_cover.updated" }));
  });

  it("fora da forma é 422; corpo que não é JSON é 400; suporte somente leitura para antes", async () => {
    const db = banco();
    expect((await gravar({ prefs: { ...PREFS_PADRAO, extra: 1 } })).status).toBe(422);
    expect((await gravar({ prefs: PREFS_PADRAO, user_id: OUTRA })).status).toBe(422);
    expect((await gravar("{nao é json")).status).toBe(400);
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(
      new Response(null, { status: 423 }) as never,
    );
    expect((await gravar({ prefs: PREFS_PADRAO })).status).toBe(423);
    expect(linhasDe(db)).toEqual([]);
  });

  it("erro do banco é 500 genérico: a mensagem crua vai só para o log", async () => {
    const CRU = 'relation "crm_capas_do_card" violates something internal';
    banco([], {
      readError: (tabela) =>
        tabela === "crm_capas_do_card" ? { code: "XX000", message: CRU } : null,
    });
    const res = await ler();
    const corpo = await res.text();
    expect(res.status).toBe(500);
    expect(corpo).toContain("Não consegui completar essa ação. Tente de novo.");
    expect(corpo).not.toContain("crm_capas_do_card");
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ codigo: "XX000", erro: CRU }),
    );
  });
});
