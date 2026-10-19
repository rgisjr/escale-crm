// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/escale/importacao/handler", () => ({ dependenciasReais: vi.fn(() => ({})) }));
vi.mock("@/lib/escale/importacao/banco", async (original) => ({
  ...(await original<typeof import("@/lib/escale/importacao/banco")>()),
  resolverLinha: vi.fn(),
  resolverEmLote: vi.fn(),
  cancelarImportacao: vi.fn(),
  lerImportacao: vi.fn(),
  linhasDaImportacao: vi.fn(async () => []),
}));

import { POST as cancelarPOST } from "@/app/api/v1/importacoes/[id]/cancelar/route";
import { POST as resolverPOST } from "@/app/api/v1/importacoes/[id]/linhas/[linhaId]/resolver/route";
import { POST as lotePOST } from "@/app/api/v1/importacoes/[id]/resolver-em-lote/route";
import { requireRole } from "@/lib/auth/require-role";
import {
  cancelarImportacao,
  ErroDaImportacao,
  lerImportacao,
  resolverEmLote,
  resolverLinha,
} from "@/lib/escale/importacao/banco";

const autorizado = (role = "manager") =>
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: "u-1", idioma: "pt-BR" },
    org: { orgId: "org-1", role },
  } as never);

describe("rotas da revisão da importação (Fase 2F)", () => {
  beforeEach(() => vi.clearAllMocks());

  const ID = "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
  const LINHA = "9e2a3c1b-4d5e-4f6a-9b0c-1d2e3f4a5b6c";
  const json = (url: string, corpo: unknown) =>
    new NextRequest(url, { method: "POST", body: JSON.stringify(corpo), headers: { "content-type": "application/json" } });

  it("resolver: 200 com o status novo da linha", async () => {
    autorizado();
    vi.mocked(resolverLinha).mockResolvedValue({ status: "importada", motivo: null, importacao: "concluida" });
    const res = await resolverPOST(json(`http://x/api/v1/importacoes/${ID}/linhas/${LINHA}/resolver`, { acao: "OVERWRITE" }), {
      params: Promise.resolve({ id: ID, linhaId: LINHA }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ status: "importada", motivo: null, importacao: "concluida" });
  });

  it("resolver: linha já resolvida é 409; ação desconhecida é 422; id ruim é 404", async () => {
    autorizado();
    vi.mocked(resolverLinha).mockRejectedValue(new ErroDaImportacao("estado", "Esta linha já foi resolvida."));
    const p = { params: Promise.resolve({ id: ID, linhaId: LINHA }) };
    expect((await resolverPOST(json(`http://x/a`, { acao: "KEEP_DB" }), p)).status).toBe(409);
    expect((await resolverPOST(json(`http://x/a`, { acao: "VOAR" }), p)).status).toBe(422);
    expect((await resolverPOST(json(`http://x/a`, { acao: "KEEP_DB" }), { params: Promise.resolve({ id: "x", linhaId: LINHA }) })).status).toBe(404);
  });

  it("em lote: devolve quantas linhas voltaram à fila", async () => {
    autorizado();
    vi.mocked(lerImportacao).mockResolvedValue({ id: ID } as never);
    vi.mocked(resolverEmLote).mockResolvedValue(7);
    const res = await lotePOST(json(`http://x/a`, { motivo: "MATCH_PHONE_DIFFERS", acao: "KEEP_DB" }), { params: Promise.resolve({ id: ID }) });
    expect((await res.json()).data).toEqual({ linhas: 7 });
  });

  it("cancelar: 409 quando já terminou", async () => {
    autorizado();
    vi.mocked(lerImportacao).mockResolvedValue({ id: ID } as never);
    vi.mocked(cancelarImportacao).mockRejectedValue(new ErroDaImportacao("estado", "Só se cancela uma importação na fila ou importando."));
    expect((await cancelarPOST(new NextRequest("http://x/a", { method: "POST" }), { params: Promise.resolve({ id: ID }) })).status).toBe(409);
  });
});
