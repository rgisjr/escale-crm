// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/v1/midia/ativos/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

const { listar, subir, limite } = vi.hoisted(() => ({ listar: vi.fn(), subir: vi.fn(), limite: vi.fn() }));
vi.mock("@/lib/midia/ativos-banco", () => ({ listarAtivos: listar, subirAtivoDeArquivo: subir }));
vi.mock("@/lib/ai/dispatcher/rate-limit", () => ({ checkRateLimit: limite }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));

function enviar(arquivo: File | null) {
  const form = new FormData();
  if (arquivo) form.append("file", arquivo);
  return POST(new NextRequest("http://x/api/v1/midia/ativos", { method: "POST", body: form }));
}
const ogg = () => new File([new Uint8Array([1, 2, 3])], "bv1.ogg", { type: "audio/ogg" });

beforeEach(() => {
  authOk("agent");
  vi.mocked(createAdminClient).mockReturnValue({} as never);
  listar.mockReset().mockResolvedValue([{ id: "a1", nome: "bv1.ogg", mime: "audio/ogg", sizeBytes: 3, tipo: "audio" }]);
  subir.mockReset().mockResolvedValue({ id: "a2", nome: "bv1.ogg", mime: "audio/ogg", sizeBytes: 3, tipo: "audio" });
  limite.mockReset().mockResolvedValue({ allowed: true });
});

describe("GET /midia/ativos", () => {
  it("lista a biblioteca SÓ da organização do contexto", async () => {
    const r = await GET();
    expect(r.status).toBe(200);
    expect(listar).toHaveBeenCalledWith(expect.anything(), ORG_ID);
    expect(((await r.json()) as { data: unknown[] }).data).toHaveLength(1);
  });
});

describe("POST /midia/ativos", () => {
  it("sobe o arquivo na organização do contexto e devolve o ativo (201)", async () => {
    const r = await enviar(ogg());
    expect(r.status).toBe(201);
    expect(subir).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ organizationId: ORG_ID, nome: "bv1.ogg", mime: "audio/ogg" }),
    );
  });
  it("sem arquivo → 422, sem subir nada", async () => {
    expect((await enviar(null)).status).toBe(422);
    expect(subir).not.toHaveBeenCalled();
  });
  it("tipo recusado pela regra do domínio → 415 com a frase para a pessoa", async () => {
    subir.mockRejectedValue(new Error("audio_precisa_ser_ogg_opus"));
    const r = await enviar(new File([new Uint8Array([1])], "a.wav", { type: "audio/wav" }));
    expect(r.status).toBe(415);
    expect(JSON.stringify(await r.json())).toContain("ogg");
  });
  it("estourou o teto de envios → 429, sem subir nada", async () => {
    limite.mockResolvedValue({ allowed: false });
    expect((await enviar(ogg())).status).toBe(429);
    expect(subir).not.toHaveBeenCalled();
  });
  it("falha inesperada → 500 sem vazar a causa", async () => {
    subir.mockRejectedValue(new Error("upload_falhou:segredo-do-bucket"));
    const r = await enviar(ogg());
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toContain("segredo-do-bucket");
  });
});
