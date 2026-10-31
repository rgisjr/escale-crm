// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { canalDaConversaOuDoContato } from "@/lib/canais/canal-da-conversa";

function bancoComConversas(porId: Record<string, string>, maisRecenteDoContato: string | null) {
  const consulta = () => {
    const filtros: Record<string, unknown> = {};
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = (coluna: string, valor: unknown) => {
      filtros[coluna] = valor;
      return q;
    };
    for (const m of ["order", "limit"]) q[m] = () => q;
    q.maybeSingle = async () => {
      const id = filtros.id;
      if (typeof id === "string") {
        return { data: porId[id] ? { channel_session_id: porId[id] } : null, error: null };
      }
      return { data: maisRecenteDoContato ? { channel_session_id: maisRecenteDoContato } : null, error: null };
    };
    return q;
  };
  return { from: consulta } as unknown as SupabaseClient;
}

describe("canalDaConversaOuDoContato", () => {
  const banco = bancoComConversas({ conv1: "canal-1" }, "canal-recente");

  it("a conversa informada manda", async () => {
    expect(await canalDaConversaOuDoContato(banco, "org", { conversationId: "conv1", contactId: "c" })).toBe("canal-1");
  });
  it("sem conversa, cai na mais recente do contato", async () => {
    expect(await canalDaConversaOuDoContato(banco, "org", { contactId: "c" })).toBe("canal-recente");
  });
  it("conversa que não existe cai na mais recente do contato", async () => {
    expect(await canalDaConversaOuDoContato(banco, "org", { conversationId: "nada", contactId: "c" })).toBe(
      "canal-recente",
    );
  });
  it("sem conversa nem contato, null", async () => {
    expect(await canalDaConversaOuDoContato(banco, "org", {})).toBeNull();
  });
});
