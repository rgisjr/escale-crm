import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { gravarEvento } from "@/app/api/v1/conversas-da-casca/[id]/_comum";
import { agendarRecargaDasConversas } from "@/hooks/inbox/recargaDasConversas";
import { decisaoDoDispositivo } from "@/lib/escale/conversas/criacao-de-negocio-banco";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

describe("gravarEvento (B1-13)", () => {
  it("falha ao gravar o evento não derruba a rota: só vai para o log", async () => {
    const db = {
      from: () => ({ insert: async () => ({ error: { code: "XX", message: "caiu" } }) }),
    };
    await expect(gravarEvento(db as never, "o", "c", "encerrado", "u")).resolves.toBeUndefined();
  });
});

describe("recarga agendada (B1-21)", () => {
  it("o setor da linha também fica velho quando chega evento ao vivo", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["setores-das-conversas", "a,b"], {});
    agendarRecargaDasConversas(qc);
    await vi.waitFor(() => expect(qc.getQueryState(["setores-das-conversas", "a,b"])?.isInvalidated).toBe(true));
  });
});

describe("decisaoDoDispositivo (B1-22)", () => {
  it("erro ao ler a configuração não vira 'padrao' (criaria negócio com o dispositivo desligado)", async () => {
    const leitura = (resposta: unknown) => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq", "order", "limit"]) c[m] = () => c;
      c.maybeSingle = async () => resposta;
      return c;
    };
    const db = {
      from: (t: string) =>
        t === "conversations"
          ? leitura({ data: { id: "c", channel_session_id: "s" }, error: null })
          : leitura({ data: null, error: { message: "timeout" } }),
    };
    const r = await decisaoDoDispositivo(db as never, {
      organizationId: "o",
      conversationId: "c",
      texto: "oi",
      messageId: null,
    });
    expect(r).toEqual({ tipo: "erro", detalhe: "timeout" });
  });
});
