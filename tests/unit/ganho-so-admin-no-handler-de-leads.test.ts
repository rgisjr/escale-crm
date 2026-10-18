// @vitest-environment node
//
// FORK ESCALE · Fase 1K (revisão M1): "só o administrador marca ganho" (gatilho da
// 9014, PT403 `so_administrador_marca_ganho`) nas portas do `_handler` de leads
// (POST e PATCH de /leads, e a importação, que cria pelo mesmo handler) vira
// recusa de negócio (403 com a frase da Clint), nunca 500 com o texto cru do banco.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: async () => ({ error: null }) }),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/atendimento/origem", () => ({ observeServiceOrigin: async () => "humano" }));
vi.mock("@/lib/atendimento/fronteira-server", () => ({ guardServiceEffect: async () => {} }));

import { createLeadHandler, moveLeadHandler } from "@/app/api/v1/leads/_handler";
import { MENSAGEM_DO_GANHO_BLOQUEADO } from "@/lib/escale/ganho/recusa";

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FUNIL = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ETAPA_NOVO = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ETAPA_GANHO = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const LEAD = "ffffffff-ffff-4fff-8fff-ffffffffffff";

const ctx = {
  organization_id: ORG,
  actor: { type: "user" as const, id: "user-1" },
  requestId: "req-1",
  idioma: "pt-BR" as const,
};

type RecusaDoBanco = { code: string; message: string };
const RECUSA_DO_GANHO: RecusaDoBanco = { code: "PT403", message: "so_administrador_marca_ganho" };

/** Só o que criar e mover perguntam; o erro do banco sai no INSERT ou no UPDATE. */
function supabaseQueRecusa(recusa: RecusaDoBanco | null) {
  const lead = {
    id: LEAD,
    organization_id: ORG,
    pipeline_id: FUNIL,
    stage_id: ETAPA_NOVO,
    contact_id: null,
    status: "open",
    updated_at: "2026-10-18T12:00:00.000Z",
  };
  const from = (tabela: string) => {
    const q: Record<string, unknown> = {};
    let gravando = false;
    const cadeia = () => q;
    for (const nome of ["select", "eq", "neq", "is", "order", "limit"]) q[nome] = cadeia;
    q.insert = () => {
      gravando = true;
      return q;
    };
    q.update = () => {
      gravando = true;
      return q;
    };
    q.maybeSingle = async () => {
      if (gravando) return recusa ? { data: null, error: recusa } : { data: lead, error: null };
      if (tabela === "crm_stages") {
        return {
          data: {
            id: ETAPA_GANHO,
            pipeline_id: FUNIL,
            organization_id: ORG,
            name: "Ganho",
            is_won: true,
            is_lost: false,
          },
          error: null,
        };
      }
      if (tabela === "crm_leads") return { data: lead, error: null };
      if (tabela === "crm_pipelines") return { data: { settings: null }, error: null };
      if (tabela === "organizations") return { data: { currency: "BRL" }, error: null };
      return { data: null, error: null };
    };
    q.single = async () => (recusa ? { data: null, error: recusa } : { data: lead, error: null });
    q.then = (ok: (v: { data: null; error: null }) => void) => ok({ data: null, error: null });
    return q;
  };
  return { from } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("a recusa do ganho pelo banco nas portas de /leads", () => {
  it("POST (nascer em etapa de ganho): 403 com a frase da Clint, não 500 com o texto do banco", async () => {
    const erro = await createLeadHandler(supabaseQueRecusa(RECUSA_DO_GANHO), ctx, {
      pipeline_id: FUNIL,
      stage_id: ETAPA_GANHO,
      title: "Negócio já ganho",
      tags: [],
      source: "manual",
    }).catch((e: unknown) => e);
    expect(erro).toMatchObject({ name: "ApiError", status: 403, code: "forbidden" });
    expect((erro as Error).message).toBe(MENSAGEM_DO_GANHO_BLOQUEADO);
    expect((erro as Error).message).not.toContain("so_administrador_marca_ganho");
  });

  it("PATCH/mover para a etapa de ganho: o mesmo 403", async () => {
    const erro = await moveLeadHandler(supabaseQueRecusa(RECUSA_DO_GANHO), ctx, LEAD, {
      to_stage_id: ETAPA_GANHO,
      position_in_stage: 1000,
    }).catch((e: unknown) => e);
    expect(erro).toMatchObject({ name: "ApiError", status: 403, code: "forbidden" });
    expect((erro as Error).message).toBe(MENSAGEM_DO_GANHO_BLOQUEADO);
  });

  it("controle negativo: outro erro do banco continua 500 com a mensagem dele", async () => {
    const outro = { code: "XX000", message: "coluna secreta explodiu" };
    const criar = await createLeadHandler(supabaseQueRecusa(outro), ctx, {
      pipeline_id: FUNIL,
      stage_id: ETAPA_GANHO,
      title: "x",
      tags: [],
      source: "manual",
    }).catch((e: unknown) => e);
    expect(criar).toMatchObject({ status: 500, code: "internal_error" });
    const mover = await moveLeadHandler(supabaseQueRecusa(outro), ctx, LEAD, {
      to_stage_id: ETAPA_GANHO,
      position_in_stage: 1000,
    }).catch((e: unknown) => e);
    expect(mover).toMatchObject({ status: 500, code: "internal_error" });
  });
});
