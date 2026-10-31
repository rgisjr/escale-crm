// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { subir, listar } = vi.hoisted(() => ({ subir: vi.fn(), listar: vi.fn() }));
vi.mock("@/lib/midia/ativos-banco", () => ({ subirAtivoPorUrl: subir, listarAtivos: listar }));

import { crmListMediaAssets, crmUploadMediaAsset } from "@/lib/mcp/tools/midia-escrita";

const ORG = "11111111-1111-4111-8111-111111111111";
const ctx = {
  organizationId: ORG,
  supabase: { tag: "admin" },
  requestId: "req-1",
  actor: { type: "user", id: "u1" },
} as never;

beforeEach(() => {
  subir.mockReset();
  listar.mockReset();
});

describe("mídia no MCP", () => {
  it("a escrita exige manager e usa a organização do contexto", async () => {
    expect(crmUploadMediaAsset).toMatchObject({ category: "write", requiresRole: "manager" });
    subir.mockResolvedValue({ id: "a1", mime: "audio/ogg", sizeBytes: 10, tipo: "audio" });
    const r = await crmUploadMediaAsset.handler({ nome: "bv1.ogg", url: "https://x.test/a.ogg" } as never, ctx);
    expect(r).toEqual({ asset_id: "a1", mime: "audio/ogg", tamanho: 10, tipo: "audio" });
    expect(subir).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ organizationId: ORG, actorUserId: "u1" }));
  });
  it("falha do envio vira erro da ferramenta", async () => {
    subir.mockRejectedValue(new Error("audio_precisa_ser_ogg_opus"));
    await expect(crmUploadMediaAsset.handler({ nome: "x", url: "https://x.test/a.wav" } as never, ctx)).rejects.toThrow(
      "audio_precisa_ser_ogg_opus",
    );
  });
  it("a listagem é de leitura e filtra a organização do contexto", async () => {
    expect(crmListMediaAssets).toMatchObject({ category: "read" });
    listar.mockResolvedValue([]);
    await crmListMediaAssets.handler({} as never, ctx);
    expect(listar).toHaveBeenCalledWith(expect.anything(), ORG);
  });
});
