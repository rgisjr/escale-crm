import { describe, expect, it } from "vitest";

import { listConversationsHandler } from "@/app/api/v1/conversations/_handler";

/**
 * B6-4: o cursor da lista de conversas precisa atravessar a fronteira entre a
 * região preenchida e a região NULL da coluna de ordenação (nulos no fim).
 * Sem `col.is.null` no `or=`, a última linha preenchida gerava um cursor cujo
 * próximo filtro (`col > X`) nunca deixava um NULL passar: as conversas com
 * `awaiting_since` NULL sumiam da página 2 em diante.
 */

interface Chamada {
  metodo: string;
  args: unknown[];
}

function fakeSupabase() {
  const chamadas: Chamada[] = [];
  const client = {
    from: (tabela: string) => {
      const proxy: Record<string, unknown> = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === "then") {
              return (ok: (v: unknown) => unknown) => ok({ data: [], error: null });
            }
            return (...args: unknown[]) => {
              if (tabela === "conversations") chamadas.push({ metodo: String(prop), args });
              return proxy;
            };
          },
        },
      );
      return proxy;
    },
  };
  return { client: client as never, chamadas };
}

const ctx = {
  organization_id: "org-1",
  requestId: "req-1",
  actor: { type: "user" as const, id: "user-1" },
} as never;

const cursor = (p: object) => Buffer.from(JSON.stringify(p), "utf8").toString("base64url");

async function ors(query: Record<string, unknown>) {
  const { client, chamadas } = fakeSupabase();
  await listConversationsHandler(client, ctx, { limit: 50, ...query } as never);
  return chamadas.filter((c) => c.metodo === "or").map((c) => String(c.args[0]));
}

describe("cursor da lista de conversas e a região NULL", () => {
  it("ordem=espera: depois da última preenchida, os NULL continuam elegíveis", async () => {
    const lista = await ors({
      ordem: "espera",
      cursor: cursor({ sort: "2026-10-01T10:00:00Z", id: "c1" }),
    });
    expect(lista.some((o) => o.includes("awaiting_since.is.null"))).toBe(true);
  });

  it("ordem padrão: last_message_at NULL também entra depois da fronteira", async () => {
    const lista = await ors({ cursor: cursor({ sort: "2026-10-01T10:00:00Z", id: "c1" }) });
    expect(lista.some((o) => o.includes("last_message_at.is.null"))).toBe(true);
  });

  it("já dentro da região NULL, pagina só por id (sem `or`)", async () => {
    const lista = await ors({ ordem: "espera", cursor: cursor({ sort: null, id: "c1" }) });
    expect(lista.some((o) => o.includes("awaiting_since"))).toBe(false);
  });
});
