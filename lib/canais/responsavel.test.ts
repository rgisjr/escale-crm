// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { responsavelDoCanal } from "@/lib/canais/responsavel";

const ORG = "11111111-1111-4111-8111-111111111111";
const CANAL = "22222222-2222-4222-8222-222222222222";

function bancoFalso(politica: { id: string } | null, responsaveis: string[]): SupabaseClient {
  const consulta = (tabela: string) => {
    const q: Record<string, unknown> = {};
    const devolve = async () => ({
      data: tabela === "channel_routing_policies" ? politica : responsaveis.map((user_id) => ({ user_id })),
      error: null,
    });
    for (const m of ["select", "eq"]) q[m] = () => q;
    q.maybeSingle = devolve;
    q.then = (ok: (r: unknown) => unknown) => devolve().then(ok);
    return q;
  };
  return { from: consulta } as unknown as SupabaseClient;
}

describe("responsavelDoCanal", () => {
  it("um responsável = único", async () => {
    const r = await responsavelDoCanal(bancoFalso({ id: "p1" }, ["u1"]), ORG, CANAL);
    expect(r).toEqual({ tipo: "unico", userId: "u1" });
  });
  it("vários responsáveis = varios", async () => {
    const r = await responsavelDoCanal(bancoFalso({ id: "p1" }, ["u1", "u2"]), ORG, CANAL);
    expect(r).toEqual({ tipo: "varios", userIds: ["u1", "u2"] });
  });
  it("sem política ou política vazia = nenhum", async () => {
    expect(await responsavelDoCanal(bancoFalso(null, []), ORG, CANAL)).toEqual({ tipo: "nenhum" });
    expect(await responsavelDoCanal(bancoFalso({ id: "p1" }, []), ORG, CANAL)).toEqual({ tipo: "nenhum" });
  });
});
