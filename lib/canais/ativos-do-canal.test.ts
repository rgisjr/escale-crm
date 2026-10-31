// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { lerAtivosDoCanal } from "@/lib/canais/ativos-do-canal";
import { mesclarVariaveis } from "@/lib/canais/variaveis";

const CANAL = "22222222-2222-4222-8222-222222222222";

function banco(linhas: Array<Record<string, unknown>>): SupabaseClient {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "or", "not", "is"]) q[m] = () => q;
  q.then = (ok: (r: unknown) => unknown) => Promise.resolve({ data: linhas, error: null }).then(ok);
  return { from: () => q } as unknown as SupabaseClient;
}

describe("lerAtivosDoCanal", () => {
  it("o ativo do número vence o padrão da organização", async () => {
    const r = await lerAtivosDoCanal(
      banco([
        { channel_session_id: null, chave: "bv1", asset_id: "ativo-padrao" },
        { channel_session_id: null, chave: "bv2", asset_id: "bv2-padrao" },
        { channel_session_id: CANAL, chave: "bv1", asset_id: "ativo-da-gaby" },
      ]),
      "org",
      CANAL,
    );
    expect(r).toEqual({ bv1: "ativo-da-gaby", bv2: "bv2-padrao" });
  });
});

describe("mesclarVariaveis com linhas de ativo", () => {
  it("linha de ativo (value_text nulo) não vira {{canal.*}}", () => {
    const r = mesclarVariaveis(
      [
        { channel_session_id: null, chave: "pix_banco", value_text: "Mercado Pago" },
        { channel_session_id: CANAL, chave: "bv1", value_text: null },
      ],
      CANAL,
    );
    expect(r).toEqual({ pix_banco: "Mercado Pago" });
  });
});
