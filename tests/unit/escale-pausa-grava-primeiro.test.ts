import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as CRON } from "@/app/api/v1/cron/pausas-de-automacao/route";
import { DELETE, POST } from "@/app/api/v1/conversas-da-casca/[id]/pausa/route";
import { retomarEnrollmentsDaPausa } from "@/lib/escale/conversas/retomar-pausa";
import { pausaEnrollment } from "@/lib/followup/intervencao";

const CONVERSA = "c1c1c1c1-0000-4000-8000-000000000001";
const ORG = "22222222-2222-4222-8222-222222222222";
const ordem: string[] = [];
let tabelaDaPausa: { data: unknown; error: unknown };
let erroDoUpsert: unknown = null;
let erroDoDelete: unknown = null;
const apagou = vi.fn();
const atualizouPausa = vi.fn();

let listaDoCron: unknown[] = [];

/** Resultado esperável (await) que ainda aceita mais filtros encadeados. */
function esperavel(resultado: unknown, linhaUnica?: unknown) {
  const o: Record<string, unknown> = {};
  for (const m of ["eq", "in", "not", "lte", "limit", "select"]) o[m] = () => o;
  o.maybeSingle = async () => linhaUnica;
  o.then = (res: (v: unknown) => unknown) => res(resultado);
  return o;
}

/** Cadeia mínima do supabase: registra a ordem das escritas que importam. */
function fake() {
  return {
    from(tabela: string) {
      const leitura = {
        data:
          tabela === "followup_enrollments"
            ? [{ id: "e1", status: "active", next_eval_at: null }]
            : tabela === "crm_pausas_de_automacao"
              ? listaDoCron
              : [],
        error: null,
      };
      return {
        select: () =>
          esperavel(
            leitura,
            tabela === "crm_pausas_de_automacao" ? tabelaDaPausa : { data: null, error: null },
          ),
        upsert: async () => {
          ordem.push("upsert-pausa");
          return { error: erroDoUpsert };
        },
        update: (v: unknown) => {
          ordem.push(`update-${tabela}`);
          if (tabela === "crm_pausas_de_automacao") atualizouPausa(v);
          return esperavel({ error: null });
        },
        delete: () => {
          apagou(tabela);
          return esperavel({ error: erroDoDelete });
        },
      };
    },
  };
}

vi.mock("@/app/api/v1/conversas-da-casca/[id]/_comum", () => ({
  comAConversa: async (_p: unknown, corpo: (e: unknown) => Promise<Response>) =>
    corpo({
      authz: { org: { orgId: ORG }, user: { id: "u1" } },
      supabase: fake(),
      conversa: { id: CONVERSA, bot_silenced_until: null },
      requestId: "r1",
      t: (x: string) => x,
    }),
}));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/auth/cron-auth", () => ({ autorizaCron: () => true }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake() }));
vi.mock("@/lib/followup/intervencao", () => ({
  pausaEnrollment: vi.fn(async () => {
    ordem.push("pausa-enrollment");
    return { ok: true };
  }),
}));
vi.mock("@/lib/escale/conversas/retomar-pausa", () => ({ retomarEnrollmentsDaPausa: vi.fn() }));

const req = (metodo: string, corpo?: unknown) =>
  new NextRequest("http://localhost/x", {
    method: metodo,
    ...(corpo
      ? { body: JSON.stringify(corpo), headers: { "content-type": "application/json" } }
      : {}),
  });
const ctx = { params: Promise.resolve({ id: CONVERSA }) };

beforeEach(() => {
  ordem.length = 0;
  erroDoUpsert = null;
  erroDoDelete = null;
  listaDoCron = [];
  tabelaDaPausa = { data: { enrollments: ["e1"], ate: null }, error: null };
  apagou.mockClear();
  atualizouPausa.mockClear();
  vi.mocked(retomarEnrollmentsDaPausa).mockReset();
  vi.mocked(pausaEnrollment).mockClear();
});

describe("pausa de automação: grava a pausa antes de agir (B1-7 / B6-3)", () => {
  it("POST grava a pausa ANTES de silenciar o bot e pausar os follow-ups", async () => {
    const r = await POST(req("POST", { ate: null }), ctx);
    expect(r.status).toBe(200);
    expect(ordem).toEqual(["upsert-pausa", "update-conversations", "pausa-enrollment"]);
  });

  it("POST com a gravação da pausa falhando não silencia nem pausa nada", async () => {
    erroDoUpsert = { message: "falhou" };
    await expect(POST(req("POST", { ate: null }), ctx)).rejects.toBeTruthy();
    expect(ordem).toEqual(["upsert-pausa"]);
  });

  it("DELETE com follow-up que não retomou mantém a pausa só com ele e avisa", async () => {
    vi.mocked(retomarEnrollmentsDaPausa).mockResolvedValue(["e1"]);
    const r = await DELETE(req("DELETE"), ctx);
    expect(r.status).toBe(500);
    expect(apagou).not.toHaveBeenCalled();
    expect(atualizouPausa).toHaveBeenCalledWith({ enrollments: ["e1"] });
  });

  it("DELETE com tudo retomado apaga a pausa", async () => {
    vi.mocked(retomarEnrollmentsDaPausa).mockResolvedValue([]);
    const r = await DELETE(req("DELETE"), ctx);
    expect(r.status).toBe(204);
    expect(apagou).toHaveBeenCalledWith("crm_pausas_de_automacao");
  });

  it("cron: com follow-up pendente guarda só ele e não apaga a linha da pausa", async () => {
    listaDoCron = [
      { conversation_id: CONVERSA, organization_id: ORG, user_id: "u1", enrollments: ["e1", "e2"] },
    ];
    vi.mocked(retomarEnrollmentsDaPausa).mockResolvedValue(["e2"]);
    const r = await CRON(req("GET"));
    expect(apagou).not.toHaveBeenCalled();
    expect(atualizouPausa).toHaveBeenCalledWith({ enrollments: ["e2"] });
    expect(((await r.json()) as { data: { retomadas: number } }).data.retomadas).toBe(0);
  });

  it("cron: com tudo retomado apaga a linha da pausa", async () => {
    listaDoCron = [
      { conversation_id: CONVERSA, organization_id: ORG, user_id: "u1", enrollments: ["e1"] },
    ];
    vi.mocked(retomarEnrollmentsDaPausa).mockResolvedValue([]);
    const r = await CRON(req("GET"));
    expect(apagou).toHaveBeenCalledWith("crm_pausas_de_automacao");
    expect(((await r.json()) as { data: { retomadas: number } }).data.retomadas).toBe(1);
  });
});
