// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/escale/importacao/banco", async (original) => ({
  ...(await original<typeof import("@/lib/escale/importacao/banco")>()),
  criarImportacao: vi.fn(async () => ({ id: "imp-1", total: 2 })),
  listarImportacoes: vi.fn(async () => ({ itens: [], total: 0 })),
}));

import { POST, GET } from "@/app/api/v1/importacoes/route";
import { requireRole } from "@/lib/auth/require-role";
import { criarImportacao, ErroDaImportacao } from "@/lib/escale/importacao/banco";

const autorizado = (role = "manager") =>
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: "u-1", idioma: "pt-BR" },
    org: { orgId: "org-1", role },
  } as never);

const pedido = {
  tipo: "contato",
  nivel: "conservador",
  decisoes: {},
  mapeamento: [{ csv: "Email", para: "email" }],
  configuracao: {},
};
const requisicao = (corpo: { arquivo?: File; pedido?: string }) => {
  const form = new FormData();
  if (corpo.arquivo) form.append("arquivo", corpo.arquivo);
  if (corpo.pedido) form.append("pedido", corpo.pedido);
  return new NextRequest("http://x/api/v1/importacoes", { method: "POST", body: form });
};
const csv = () => new File(["Email\na@x.com\n"], "a.csv", { type: "text/csv" });

describe("POST /api/v1/importacoes (Fase 2F)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gerente cria: 201 com id e total", async () => {
    autorizado();
    const res = await POST(requisicao({ arquivo: csv(), pedido: JSON.stringify(pedido) }));
    expect(res.status).toBe(201);
    expect((await res.json()).data).toEqual({ id: "imp-1", total: 2 });
    expect(vi.mocked(criarImportacao).mock.calls[0]?.[2]).toMatchObject({ orgId: "org-1", userId: "u-1", nomeDoArquivo: "a.csv" });
  });

  it("atendente: o 403 do requireRole", async () => {
    vi.mocked(requireRole).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await POST(requisicao({ arquivo: csv(), pedido: JSON.stringify(pedido) }))).status).toBe(403);
  });

  it("sem arquivo, pedido inválido ou erro da importação: 422", async () => {
    autorizado();
    expect((await POST(requisicao({ pedido: JSON.stringify(pedido) }))).status).toBe(422);
    expect((await POST(requisicao({ arquivo: csv(), pedido: "{" }))).status).toBe(422);
    vi.mocked(criarImportacao).mockRejectedValueOnce(new ErroDaImportacao("arquivo", "O arquivo não tem linhas para importar."));
    const res = await POST(requisicao({ arquivo: csv(), pedido: JSON.stringify(pedido) }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.message).toBe("O arquivo não tem linhas para importar.");
  });

  it("GET lista com o tipo e a página", async () => {
    autorizado();
    const res = await GET(new NextRequest("http://x/api/v1/importacoes?tipo=negocio&p=2"));
    expect(res.status).toBe(200);
  });
});
