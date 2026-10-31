// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { responsavelDoCanal } = vi.hoisted(() => ({ responsavelDoCanal: vi.fn() }));
vi.mock("@/lib/canais/responsavel", () => ({ responsavelDoCanal }));

import { getAction } from "@/lib/automation/actions";
import "@/lib/automation/actions/assign-owner";
import type { ActionCtx } from "@/lib/automation/types";

const ORG = "88800000-0000-4000-8000-000000000001";
const USER = "88800000-0000-4000-8000-000000000002";
const LEAD = "88800000-0000-4000-8000-000000000003";

type Escrita = { tabela: string; valores: Record<string, unknown> };

function ctx(escritas: Escrita[], payload: Record<string, unknown> = { channel_session_id: "canal-1" }): ActionCtx {
  const admin = {
    from: (nome: string) => {
      const q: Record<string, unknown> = {};
      for (const m of ["select", "eq", "is", "order", "limit"]) q[m] = () => q;
      q.maybeSingle = async () => ({ data: { user_id: USER, role: "agent" }, error: null });
      q.update = (valores: Record<string, unknown>) => {
        escritas.push({ tabela: nome, valores });
        return q;
      };
      q.then = (ok: (v: { error: null }) => unknown) => ok({ error: null });
      return q;
    },
  } as unknown as SupabaseClient;
  return {
    admin,
    organizationId: ORG,
    ruleId: "r",
    ruleName: "regra",
    requestId: "req",
    event: { payload },
    context: { lead: { id: LEAD } },
  } as unknown as ActionCtx;
}

const executar = (c: ActionCtx, config: Record<string, unknown>) => getAction("assign_owner")!.execute(c, config);

beforeEach(() => responsavelDoCanal.mockReset());

describe("assign_owner modo responsavel_do_canal", () => {
  it("canal com um responsável: o negócio vai para ele", async () => {
    responsavelDoCanal.mockResolvedValue({ tipo: "unico", userId: USER });
    const escritas: Escrita[] = [];
    const r = await executar(ctx(escritas), { modo: "responsavel_do_canal" });
    expect(r.status).toBe("success");
    expect(escritas[0]).toMatchObject({ tabela: "crm_leads", valores: { owner_user_id: USER } });
    expect(responsavelDoCanal).toHaveBeenCalledWith(expect.anything(), ORG, "canal-1");
  });

  it("vários responsáveis: pula, sem escolher por conta própria", async () => {
    responsavelDoCanal.mockResolvedValue({ tipo: "varios", userIds: ["a", "b"] });
    const escritas: Escrita[] = [];
    const r = await executar(ctx(escritas), { modo: "responsavel_do_canal" });
    expect(r).toMatchObject({ status: "skipped", detail: { reason: "varios_responsaveis" } });
    expect(escritas).toHaveLength(0);
  });

  it("nenhum responsável: pula", async () => {
    responsavelDoCanal.mockResolvedValue({ tipo: "nenhum" });
    const r = await executar(ctx([]), { modo: "responsavel_do_canal" });
    expect(r).toMatchObject({ status: "skipped", detail: { reason: "sem_responsavel_no_canal" } });
  });

  it("sem canal no evento nem conversa: pula", async () => {
    const r = await executar(ctx([], {}), { modo: "responsavel_do_canal" });
    expect(r).toMatchObject({ status: "skipped", detail: { reason: "sem_canal" } });
    expect(responsavelDoCanal).not.toHaveBeenCalled();
  });

  it("a config antiga { user_id } continua igual e não consulta o canal", async () => {
    const escritas: Escrita[] = [];
    const r = await executar(ctx(escritas), { user_id: USER });
    expect(r.status).toBe("success");
    expect(escritas[0]).toMatchObject({ valores: { owner_user_id: USER } });
    expect(responsavelDoCanal).not.toHaveBeenCalled();
  });
});
