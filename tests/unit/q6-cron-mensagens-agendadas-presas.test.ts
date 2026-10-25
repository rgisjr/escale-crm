import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/cron/mensagens-agendadas/route";
import { enviarAgendada } from "@/lib/escale/conversas/envio-agendado";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * B6-8: linha em `processando` há mais de 15 min (processo caiu depois do
 * envio) vai para `falhou` com motivo, sem reenviar; e o update do desfecho é
 * repetido uma vez antes de desistir.
 */
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/cron-auth", () => ({ autorizaCron: () => true }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/lib/escale/conversas/envio-agendado", () => ({ enviarAgendada: vi.fn() }));

interface Op {
  op: string;
  valores?: Record<string, unknown>;
  filtros: Array<[string, unknown[]]>;
}

const VENCIDA = {
  id: "a1",
  organization_id: "org-1",
  conversation_id: "cv-1",
  criado_por: "u-1",
  tipo: "texto",
  corpo: "oi",
  template: null,
  conversations: { last_inbound_at: null },
  channel_sessions: { status: "WORKING", provider: "waha" },
  organizations: { status: "active" },
};

/** `errosDoUpdate`: fila de erros devolvidos pelos updates de desfecho (por ordem). */
function banco(opts: { vencidas?: unknown[]; errosDoDesfecho?: Array<string | null> } = {}) {
  const ops: Op[] = [];
  const erros = [...(opts.errosDoDesfecho ?? [])];
  const from = vi.fn(() => {
    const atual: Op = { op: "select", filtros: [] };
    const cadeia: Record<string, unknown> = {};
    for (const m of ["eq", "lt", "lte", "order", "limit"])
      cadeia[m] = vi.fn((...a: unknown[]) => {
        atual.filtros.push([m, a]);
        return cadeia;
      });
    cadeia.select = vi.fn(() => cadeia);
    cadeia.update = vi.fn((valores: Record<string, unknown>) => {
      atual.op = "update";
      atual.valores = valores;
      ops.push(atual);
      return cadeia;
    });
    const resolver = () => {
      if (atual.op === "update" && atual.valores?.status === "processando")
        return { data: [{ id: "a1" }], error: null };
      if (atual.op === "update" && atual.filtros.some(([m]) => m === "lt"))
        return { data: [{ id: "x1" }], error: null };
      if (atual.op === "update") {
        const msg = erros.shift() ?? null;
        return { data: null, error: msg ? { message: msg } : null };
      }
      return { data: opts.vencidas ?? [], error: null };
    };
    cadeia.maybeSingle = vi.fn(async () => {
      const r = resolver();
      return { data: Array.isArray(r.data) ? r.data[0] : r.data, error: r.error };
    });
    cadeia.then = (ok: (r: unknown) => unknown) => Promise.resolve(resolver()).then(ok);
    return cadeia;
  });
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);
  return { ops };
}

const req = () => new NextRequest("http://x/api/v1/cron/mensagens-agendadas");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(enviarAgendada).mockResolvedValue({ status: "enviada", message_id: "m1" } as never);
});

describe("cron de mensagens agendadas: linhas presas e desfecho", () => {
  it("solta as presas em `processando` há mais de 15 min como `falhou`, sem reenviar", async () => {
    const { ops } = banco();
    const antes = Date.now();
    const r = await GET(req());
    const varredura = ops.find((o) => o.filtros.some(([m]) => m === "lt"));
    expect(varredura?.valores?.status).toBe("falhou");
    expect(String(varredura?.valores?.erro)).toMatch(/confira a conversa/i);
    expect(varredura?.filtros).toContainEqual(["eq", ["status", "processando"]]);
    const corte = new Date(String(varredura?.filtros.find(([m]) => m === "lt")?.[1][1])).getTime();
    expect(antes - corte).toBeGreaterThanOrEqual(14 * 60_000);
    expect(enviarAgendada).not.toHaveBeenCalled();
    expect((await r.json()).data.presas).toBe(1);
  });

  it("repete o update do desfecho quando a primeira gravação falha", async () => {
    const { ops } = banco({ vencidas: [VENCIDA], errosDoDesfecho: ["timeout", null] });
    await GET(req());
    const desfechos = ops.filter((o) => o.valores?.status === "enviada");
    expect(desfechos).toHaveLength(2);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("registra o erro só depois de esgotar as tentativas", async () => {
    const { ops } = banco({ vencidas: [VENCIDA], errosDoDesfecho: ["a", "b"] });
    await GET(req());
    expect(ops.filter((o) => o.valores?.status === "enviada")).toHaveLength(2);
    expect(logger.error).toHaveBeenCalledWith(
      "cron mensagens-agendadas: desfecho não gravado",
      expect.objectContaining({ agendamento: "a1", error: "b" }),
    );
  });
});
