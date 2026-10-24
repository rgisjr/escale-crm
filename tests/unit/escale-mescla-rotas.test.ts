import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const papel = { atual: "manager" as "viewer" | "agent" | "manager" };
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(async (minimo: string) => {
    const ordem = ["viewer", "agent", "manager", "admin"];
    if (ordem.indexOf(papel.atual) < ordem.indexOf(minimo)) {
      return { ok: false, response: new Response(JSON.stringify({ error: { code: "forbidden" } }), { status: 403 }) };
    }
    return { ok: true, user: { id: "u1", idioma: "pt-BR" }, org: { orgId: "o1", role: papel.atual } };
  }),
}));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));

const banco = vi.hoisted(() => ({
  lerSugestoes: vi.fn(),
  contatosDaMescla: vi.fn(),
  mesclarGrupo: vi.fn(),
}));
vi.mock("@/lib/escale/mescla/banco", async (importar) => {
  const real = await importar<typeof import("@/lib/escale/mescla/banco")>();
  return { ...real, ...banco };
});

import { GET } from "@/app/api/v1/mesclas/sugestoes/route";
import { POST as POST_MESCLAR } from "@/app/api/v1/mesclas/route";
import { POST as POST_EM_MASSA } from "@/app/api/v1/mesclas/em-massa/route";
import { ErroDaMescla } from "@/lib/escale/mescla/banco";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const pedir = (url: string, corpo?: unknown) =>
  new NextRequest(`http://x${url}`, corpo === undefined ? undefined : { method: "POST", body: JSON.stringify(corpo) });

beforeEach(() => {
  papel.atual = "manager";
  vi.clearAllMocks();
});

describe("GET /api/v1/mesclas/sugestoes", () => {
  it("gerente lê a página com o total", async () => {
    banco.lerSugestoes.mockResolvedValue({ data: [{ chave: ID(1) }], total: 7 });
    const r = await GET(pedir("/api/v1/mesclas/sugestoes?ordem=mais_recentes&n=20"));
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.data).toEqual([{ chave: ID(1) }]);
    expect(corpo.meta.total).toBe(7);
    expect(banco.lerSugestoes.mock.calls[0]![2]).toMatchObject({ ordem: "mais_recentes", n: 20 });
  });

  it("atendente não lê (403) e a consulta inválida dá 422", async () => {
    papel.atual = "agent";
    expect((await GET(pedir("/api/v1/mesclas/sugestoes"))).status).toBe(403);
    papel.atual = "manager";
    expect((await GET(pedir("/api/v1/mesclas/sugestoes?ordem=outra"))).status).toBe(422);
  });
});

describe("POST /api/v1/mesclas", () => {
  it("mescla o grupo com as escolhas", async () => {
    banco.mesclarGrupo.mockResolvedValue({ contato_id: ID(1), contatos_mesclados: [ID(2)] });
    const r = await POST_MESCLAR(pedir("/api/v1/mesclas", { principal_id: ID(1), secundarios: [ID(2)], escolhas: { email: ID(2) } }));
    expect(r.status).toBe(200);
    expect(banco.mesclarGrupo.mock.calls[0]!.slice(2)).toEqual(["o1", "u1", ID(1), [ID(2)], { email: ID(2) }]);
  });

  it("o erro previsto vira a mensagem da Clint", async () => {
    banco.mesclarGrupo.mockRejectedValue(new ErroDaMescla("identidade_em_uso"));
    const r = await POST_MESCLAR(pedir("/api/v1/mesclas", { principal_id: ID(1), secundarios: [ID(2)] }));
    expect(r.status).toBe(409);
    expect((await r.json()).error.message).toBe("Outro contato já usa este telefone");
  });

  it("escolha fora do grupo dá 422; atendente dá 403", async () => {
    expect((await POST_MESCLAR(pedir("/api/v1/mesclas", { principal_id: ID(1), secundarios: [ID(2)], escolhas: { nome: ID(9) } }))).status).toBe(422);
    papel.atual = "agent";
    expect((await POST_MESCLAR(pedir("/api/v1/mesclas", { principal_id: ID(1), secundarios: [ID(2)] }))).status).toBe(403);
  });
});

describe("POST /api/v1/mesclas/em-massa", () => {
  it("cada grupo pela prioridade; a falha de um não para os outros", async () => {
    banco.contatosDaMescla.mockResolvedValue(
      new Map([
        [ID(1), { id: ID(1), criado_em: "2026-10-01", atualizado_em: "2026-10-01" }],
        [ID(2), { id: ID(2), criado_em: "2026-10-05", atualizado_em: "2026-10-01" }],
        [ID(3), { id: ID(3), criado_em: "2026-10-01", atualizado_em: "2026-10-01" }],
        [ID(4), { id: ID(4), criado_em: "2026-10-02", atualizado_em: "2026-10-01" }],
      ]),
    );
    banco.mesclarGrupo
      .mockResolvedValueOnce({ contato_id: ID(2), contatos_mesclados: [ID(1)] })
      .mockRejectedValueOnce(new ErroDaMescla("atendimento_ativo"));
    const r = await POST_EM_MASSA(
      pedir("/api/v1/mesclas/em-massa", { grupos: [[ID(1), ID(2)], [ID(3), ID(4)]], prioridade: "criado_por_ultimo" }),
    );
    expect(r.status).toBe(200);
    const { data } = await r.json();
    expect(banco.mesclarGrupo.mock.calls[0]!.slice(4, 6)).toEqual([ID(2), [ID(1)]]);
    expect(data.mesclados).toHaveLength(1);
    expect(data.falhas).toEqual([{ grupo: [ID(3), ID(4)], erro: "Atendimento ativo impede a mescla deste grupo." }]);
  });

  it("mais de 100 grupos: 'Seleção acima do limite'", async () => {
    const r = await POST_EM_MASSA(
      pedir("/api/v1/mesclas/em-massa", { grupos: Array(101).fill([ID(1), ID(2)]), prioridade: "criado_por_ultimo" }),
    );
    expect(r.status).toBe(422);
    expect((await r.json()).error.message).toBe("Seleção acima do limite");
  });
});
