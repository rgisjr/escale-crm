import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as APROVAR } from "@/app/api/v1/acoes-em-massa/[id]/aprovar/route";
import { GET as GET_ARQUIVO } from "@/app/api/v1/acoes-em-massa/[id]/arquivo/route";
import { POST as RECUSAR } from "@/app/api/v1/acoes-em-massa/[id]/recusar/route";
import { GET, POST } from "@/app/api/v1/acoes-em-massa/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Resposta = { data: unknown; error: { code?: string; message: string } | null };
const ACAO = "aaaaaaaa-0000-4000-8000-000000000001";
const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const P1 = "11111111-1111-4111-8111-111111111111";
const S1 = "22222222-2222-4222-8222-222222222222";
const OUTRA = "99999999-0000-4000-8000-000000000009";
const DIA = 24 * 60 * 60 * 1000;

/**
 * Supabase de mentira. `tabelas`: a mesma resposta em toda leitura da tabela;
 * `filas`: uma resposta por `from()` (o GET do admin lê a tabela duas vezes).
 */
function banco(opts: {
  rpc?: Resposta;
  tabelas?: Record<string, Resposta>;
  filas?: Record<string, Resposta[]>;
}) {
  const rpc = vi
    .fn()
    .mockResolvedValue(
      opts.rpc ?? { data: [{ acao_id: ACAO, quantidade: 3, status: "na_fila" }], error: null },
    );
  const from = vi.fn((tabela: string) => {
    const resposta = opts.filas?.[tabela]?.shift() ??
      opts.tabelas?.[tabela] ?? { data: [], error: null };
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "eq", "neq", "gte", "gt", "order", "limit"])
      cadeia[m] = vi.fn(() => cadeia);
    cadeia.maybeSingle = vi.fn(async () => resposta);
    cadeia.then = (ok: (r: Resposta) => unknown) => Promise.resolve(resposta).then(ok);
    return cadeia;
  });
  vi.mocked(createClient).mockResolvedValue({ rpc, from } as never);
  return { rpc, from };
}

const pedido = (url: string, corpo?: unknown) =>
  new NextRequest(new URL(url, "http://x"), {
    method: corpo === undefined ? "GET" : "POST",
    ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
  } as never);
const comId = { params: Promise.resolve({ id: ACAO }) };

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk("manager");
});

describe("POST /api/v1/acoes-em-massa", () => {
  const porIds = {
    lista: "contatos",
    acao: "incluir_tag",
    alvo: { tipo: "ids", ids: [C1] },
    parametros: { tag: "vip" },
  };

  it("pede gerente ou acima, e o acompanhamento só-leitura não grava", async () => {
    banco({});
    await POST(pedido("/api/v1/acoes-em-massa", porIds));
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("manager");
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    expect((await POST(pedido("/api/v1/acoes-em-massa", porIds))).status).toBe(403);
  });

  it("corpo inválido é 422", async () => {
    banco({});
    expect(
      (await POST(pedido("/api/v1/acoes-em-massa", { ...porIds, acao: "apagar_tudo" }))).status,
    ).toBe(422);
  });

  it("pelos ids: a função recebe os ids e filtro vazio; 201, o status e a auditoria", async () => {
    const { rpc } = banco({});
    const r = await POST(pedido("/api/v1/acoes-em-massa", porIds));
    expect(r.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith(
      "fn_escale_criar_acao_em_massa",
      expect.objectContaining({
        p_org: ORG_ID,
        p_acao: "incluir_tag",
        p_parametros: { tag: "vip" },
        p_ids: [C1],
        p_filtros: {},
      }),
    );
    expect(await r.json()).toEqual({ data: { id: ACAO, total: 3, status: "na_fila" } });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contacts.bulk_requested" }),
    );
  });

  it("pelo filtro: busca, visão, filtro compilado, quantidade e excluídos", async () => {
    const { rpc } = banco({
      tabelas: { organizations: { data: { timezone: "America/Manaus" }, error: null } },
    });
    const r = await POST(
      pedido("/api/v1/acoes-em-massa", {
        lista: "contatos",
        acao: "exportar",
        alvo: {
          tipo: "filtro",
          q: "ana",
          v: "com_negocio",
          f: JSON.stringify({ telefone: "com" }),
          quantidade: 50,
          excluidos: [C1],
        },
        parametros: {},
      }),
    );
    expect(r.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith(
      "fn_escale_criar_acao_em_massa",
      expect.objectContaining({
        p_ids: null,
        p_visao: "com_negocio",
        p_filtros: { fuso: "America/Manaus", telefone: "com" },
        p_quantidade: 50,
        p_excluidos: [C1],
      }),
    );
  });

  it("exportar que espera aprovação: devolve o status e audita a aprovação pendente (Q4)", async () => {
    banco({
      rpc: {
        data: [{ acao_id: ACAO, quantidade: 3, status: "aguardando_aprovacao" }],
        error: null,
      },
    });
    const r = await POST(
      pedido("/api/v1/acoes-em-massa", { ...porIds, acao: "exportar", parametros: {} }),
    );
    expect(await r.json()).toEqual({
      data: { id: ACAO, total: 3, status: "aguardando_aprovacao" },
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "contacts.bulk_requested",
        metadata: expect.objectContaining({ aprovacao: "pendente" }),
      }),
    );
  });

  it("criar negócios: etapa de outra origem é recusada", async () => {
    banco({
      tabelas: {
        crm_stages: { data: { id: S1, pipeline_id: "outra", is_archived: false }, error: null },
      },
    });
    const r = await POST(
      pedido("/api/v1/acoes-em-massa", {
        ...porIds,
        acao: "criar_negocios",
        parametros: { pipeline_id: P1, stage_id: S1 },
      }),
    );
    expect(r.status).toBe(422);
  });

  it("nenhum contato: 422 com o texto", async () => {
    banco({
      rpc: {
        data: null,
        error: { code: "P0001", message: "acao_em_massa_vazia: nenhum contato selecionado" },
      },
    });
    const r = await POST(pedido("/api/v1/acoes-em-massa", porIds));
    expect(r.status).toBe(422);
    expect(JSON.stringify(await r.json())).toContain("Nenhum contato selecionado.");
  });
});

describe("GET /api/v1/acoes-em-massa", () => {
  const futuro = () => new Date(Date.now() + 60_000).toISOString();
  const passado = () => new Date(Date.now() - 60_000).toISOString();
  const linhas = () => [
    {
      id: "a1",
      acao: "exportar",
      status: "concluida",
      total: 2,
      feitos: 2,
      falhas: 0,
      arquivo: "x.csv",
      expira_em: futuro(),
      created_at: new Date().toISOString(),
    },
    {
      id: "a2",
      acao: "exportar",
      status: "concluida",
      total: 2,
      feitos: 2,
      falhas: 0,
      arquivo: "y.csv",
      expira_em: passado(),
      created_at: new Date().toISOString(),
    },
    {
      id: "a3",
      acao: "exportar",
      status: "aguardando_aprovacao",
      total: 5,
      feitos: 0,
      falhas: 0,
      arquivo: null,
      expira_em: null,
      created_at: new Date(Date.now() - 7.5 * DIA).toISOString(),
    },
  ];

  it("gerente: as minhas, com 'tem_arquivo' só antes de vencer e o pedido velho como 'expirada'; nada para aprovar", async () => {
    const { from } = banco({ tabelas: { crm_acoes_em_massa: { data: linhas(), error: null } } });
    const corpo = (await (await GET()).json()) as {
      data: { minhas: Array<{ tem_arquivo: boolean; status: string }>; para_aprovar: unknown[] };
    };
    expect(corpo.data.minhas.map((a) => a.tem_arquivo)).toEqual([true, false, false]);
    expect(corpo.data.minhas.map((a) => a.status)).toEqual(["concluida", "concluida", "expirada"]);
    expect(corpo.data.para_aprovar).toEqual([]);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("admin: também os pedidos de outras pessoas para aprovar", async () => {
    authOk("admin");
    const criado = new Date().toISOString();
    banco({
      filas: {
        crm_acoes_em_massa: [
          { data: [], error: null },
          { data: [{ id: ACAO, user_id: OUTRA, total: 7, created_at: criado }], error: null },
        ],
      },
    });
    const corpo = (await (await GET()).json()) as { data: { para_aprovar: unknown[] } };
    expect(corpo.data.para_aprovar).toEqual([
      { id: ACAO, solicitante_id: OUTRA, total: 7, created_at: criado },
    ]);
  });
});

describe("POST /api/v1/acoes-em-massa/[id]/aprovar e /recusar (Q4)", () => {
  it("só admin, e o acompanhamento só-leitura não decide", async () => {
    authOk("admin");
    banco({ rpc: { data: "na_fila", error: null } });
    await APROVAR(pedido(`/x/${ACAO}/aprovar`, {}), comId);
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("admin");
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    expect((await APROVAR(pedido(`/x/${ACAO}/aprovar`, {}), comId)).status).toBe(403);
  });

  it("aprovar e recusar chamam a função e auditam", async () => {
    authOk("admin");
    const { rpc } = banco({ rpc: { data: "na_fila", error: null } });
    const r = await APROVAR(pedido(`/x/${ACAO}/aprovar`, {}), comId);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ data: { id: ACAO, status: "na_fila" } });
    expect(rpc).toHaveBeenCalledWith("fn_escale_decidir_exportacao", {
      p_acao: ACAO,
      p_aprovar: true,
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contacts.export_approved", actorUserId: USER_ID }),
    );
    const recusado = banco({ rpc: { data: "recusada", error: null } });
    expect((await RECUSAR(pedido(`/x/${ACAO}/recusar`, {}), comId)).status).toBe(200);
    expect(recusado.rpc).toHaveBeenCalledWith("fn_escale_decidir_exportacao", {
      p_acao: ACAO,
      p_aprovar: false,
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contacts.export_rejected" }),
    );
  });

  it("os erros da função viram 404, 403, 409 e 422", async () => {
    authOk("admin");
    const casos: Array<[string, number]> = [
      ["acao_em_massa_inexistente: x", 404],
      ["acao_em_massa_sem_permissao: x", 403],
      ["acao_em_massa_propria: x", 403],
      ["acao_em_massa_nao_aguarda: x", 409],
      ["acao_em_massa_expirada: x", 422],
    ];
    for (const [message, status] of casos) {
      banco({ rpc: { data: null, error: { code: "P0001", message } } });
      expect((await APROVAR(pedido(`/x/${ACAO}/aprovar`, {}), comId)).status).toBe(status);
    }
    expect(audit).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/acoes-em-massa/[id]/arquivo", () => {
  it("não achou ou venceu: 404", async () => {
    banco({ tabelas: { crm_acoes_em_massa: { data: null, error: null } } });
    expect((await GET_ARQUIVO(pedido(`/x/${ACAO}/arquivo`), comId)).status).toBe(404);
    banco({
      tabelas: {
        crm_acoes_em_massa: {
          data: { arquivo: "a.csv", expira_em: new Date(Date.now() - 1000).toISOString() },
          error: null,
        },
      },
    });
    expect((await GET_ARQUIVO(pedido(`/x/${ACAO}/arquivo`), comId)).status).toBe(404);
  });

  it("válido: 302 para a URL assinada de 60 s, e audita", async () => {
    banco({
      tabelas: {
        crm_acoes_em_massa: {
          data: {
            arquivo: `${ORG_ID}/${ACAO}/contatos-2026-10-17.csv`,
            expira_em: new Date(Date.now() + 60_000).toISOString(),
          },
          error: null,
        },
      },
    });
    const createSignedUrl = vi.fn(async () => ({
      data: { signedUrl: "https://storage/assinada" },
      error: null,
    }));
    vi.mocked(createAdminClient).mockReturnValue({
      storage: { from: () => ({ createSignedUrl }) },
    } as never);
    const r = await GET_ARQUIVO(pedido(`/x/${ACAO}/arquivo`), comId);
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("https://storage/assinada");
    expect(createSignedUrl).toHaveBeenCalledWith(`${ORG_ID}/${ACAO}/contatos-2026-10-17.csv`, 60, {
      download: "contatos-2026-10-17.csv",
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contacts.export_downloaded", actorUserId: USER_ID }),
    );
  });
});
