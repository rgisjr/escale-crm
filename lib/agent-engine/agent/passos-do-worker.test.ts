// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { copiar, lerAtivos } = vi.hoisted(() => ({ copiar: vi.fn(), lerAtivos: vi.fn() }));
vi.mock("@/lib/midia/ativos-banco", () => ({ copiarAtivoParaConversa: copiar }));
vi.mock("@/lib/canais/ativos-do-canal", () => ({ lerAtivosDoCanal: lerAtivos }));

import { enviarPassosDoWorker, type DesfechoDoPasso, type ExtraDoPasso } from "./passos-do-worker";

const lista = { tipo: "lista" as const, corpo: "Aparelho?", botaoDaLista: "Escolher", linhas: [{ id: "a", titulo: "TV" }] };

function montar(respostas: DesfechoDoPasso[] = []) {
  const chamadas: Array<{ body: string; extra: ExtraDoPasso }> = [];
  const enviarFixo = vi.fn(async (body: string, extra: ExtraDoPasso): Promise<DesfechoDoPasso> => {
    chamadas.push({ body, extra });
    return respostas[chamadas.length - 1] ?? { kind: "sent" };
  });
  return {
    chamadas,
    deps: { admin: {} as never, organizationId: "org", conversationId: "conv", channelSessionId: "canal", enviarFixo },
  };
}

beforeEach(() => {
  copiar.mockReset().mockResolvedValue({ storagePath: "org/conv/auto-x.ogg", mime: "audio/ogg", tipo: "audio" });
  lerAtivos.mockReset().mockResolvedValue({ bv1: "ativo-bv1" });
});

describe("enviarPassosDoWorker", () => {
  it("envia áudio, texto e lista na ordem, cada um com a sua seq no ledger", async () => {
    const { chamadas, deps } = montar();
    const r = await enviarPassosDoWorker(
      [{ tipo: "midia", asset: "var:bv1" }, { tipo: "texto", texto: "Oi" }, { tipo: "interativo", interativo: lista }],
      deps,
    );
    expect(r).toEqual({ kind: "sent" });
    expect(chamadas.map((c) => c.extra.seq)).toEqual([1, 2, 3]);
    expect(chamadas[0]).toMatchObject({ body: "", extra: { media: { storagePath: "org/conv/auto-x.ogg", mime: "audio/ogg" } } });
    expect(chamadas[1]!.body).toBe("Oi");
    expect(chamadas[2]).toMatchObject({ body: "Aparelho?\n\n1 - TV", extra: { metadata: { interativo: lista } } });
  });
  it("passo adiado interrompe a sequência e devolve o adiamento", async () => {
    const until = new Date("2026-11-01T11:00:00Z");
    const { chamadas, deps } = montar([{ kind: "sent" }, { kind: "deferred", until, reason: "outside_window" }]);
    const r = await enviarPassosDoWorker(
      [{ tipo: "texto", texto: "a" }, { tipo: "texto", texto: "b" }, { tipo: "texto", texto: "c" }],
      deps,
    );
    expect(r).toEqual({ kind: "deferred", until, reason: "outside_window" });
    expect(chamadas).toHaveLength(2);
  });
  it("passo vetado devolve skipped", async () => {
    const { deps } = montar([{ kind: "skipped" }]);
    expect(await enviarPassosDoWorker([{ tipo: "texto", texto: "a" }], deps)).toEqual({ kind: "skipped" });
  });
  it("áudio ausente no número lança, sem enviar nada", async () => {
    const { chamadas, deps } = montar();
    await expect(
      enviarPassosDoWorker([{ tipo: "texto", texto: "a" }, { tipo: "midia", asset: "var:bv9" }], deps),
    ).rejects.toThrow("ativo_ausente_no_numero:bv9");
    expect(chamadas).toHaveLength(0);
  });
});
