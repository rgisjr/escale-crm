// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/users/nome-do-atendente", () => ({
  nomesDosAtendentes: vi.fn(async (ids: string[]) => new Map(ids.map((id) => [id, `Nome de ${id}`]))),
}));

import { anexarCanalAoContexto } from "@/lib/canais/anexar-ao-contexto";
import { renderizarTextoDeFollowup } from "@/lib/automation/texto-do-followup";

const CANAL_A = "canal-a";
const CANAL_B = "canal-b";

/** Duas conversas, dois canais, uma chave PIX por canal e um responsável por canal. */
function banco(): SupabaseClient {
  const conversas: Record<string, string> = { "conv-a": CANAL_A, "conv-b": CANAL_B };
  const pix: Record<string, string> = { [CANAL_A]: "pix-do-canal-a", [CANAL_B]: "pix-do-canal-b" };
  const dono: Record<string, string> = { [CANAL_A]: "ana", [CANAL_B]: "bia" };
  return {
    from: (tabela: string) => {
      const f: Record<string, string> = {};
      let canalNoOr: string | null = null;
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = (coluna: string, valor: string) => {
        f[coluna] = valor;
        return q;
      };
      q.or = (expr: string) => {
        canalNoOr = expr.split("eq.")[1] ?? null;
        return q;
      };
      for (const m of ["order", "limit"]) q[m] = () => q;
      const linhas = async () => {
        if (tabela === "channel_variables" && canalNoOr) {
          return { data: [{ channel_session_id: canalNoOr, chave: "pix_chave", value_text: pix[canalNoOr] }], error: null };
        }
        if (tabela === "channel_routing_responsibles") {
          return { data: [{ user_id: dono[(f.policy_id ?? "").replace("p-", "")] }], error: null };
        }
        return { data: [], error: null };
      };
      q.maybeSingle = async () => {
        if (tabela === "conversations") {
          const canal = f.id ? conversas[f.id] : undefined;
          return { data: canal ? { channel_session_id: canal } : null, error: null };
        }
        if (tabela === "channel_sessions") return { data: { display_name: f.id, phone_number: "" }, error: null };
        if (tabela === "channel_routing_policies") {
          return { data: { id: `p-${f.channel_session_id}` }, error: null };
        }
        return { data: null, error: null };
      };
      q.then = (ok: (r: unknown) => unknown) => linhas().then(ok);
      return q;
    },
  } as unknown as SupabaseClient;
}

describe("anexarCanalAoContexto", () => {
  it("usa a chave do canal DA CONVERSA, não a de outro canal da organização", async () => {
    const ctx = await anexarCanalAoContexto(banco(), "org", { contact: { name: "Maria" } }, "conv-b", "c1");
    expect(renderizarTextoDeFollowup("PIX {{canal.pix_chave}}", ctx)).toBe("PIX pix-do-canal-b");
    const ctxA = await anexarCanalAoContexto(banco(), "org", { contact: { name: "Maria" } }, "conv-a", "c1");
    expect(renderizarTextoDeFollowup("PIX {{canal.pix_chave}}", ctxA)).toBe("PIX pix-do-canal-a");
  });

  it("o atendente é o responsável do canal", async () => {
    const ctx = await anexarCanalAoContexto(banco(), "org", {}, "conv-b", "c1");
    expect(ctx.atendente).toEqual({ nome: "Nome de bia", id: "bia" });
  });

  it("sem conversa alguma, devolve o contexto como veio", async () => {
    const original = { contact: { name: "Maria" } };
    const ctx = await anexarCanalAoContexto(banco(), "org", original, null, "c1");
    expect(ctx).toBe(original);
  });
});
