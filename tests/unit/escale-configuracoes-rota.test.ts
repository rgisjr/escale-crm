import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { GET, PATCH } from "@/app/api/v1/pipelines/[id]/configuracoes/route";
import {
  ORG_ID,
  OUTRA_ORG,
  PIPE,
  authOk,
  etapa,
  funilRow,
  makeDb,
} from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const acesso = vi.hoisted(() => ({
  modo: "own" as "all" | "own" | "own_and_unassigned",
  membros: ["11111111-1111-4111-8111-111111111111", "66666666-6666-4666-8666-666666666666"],
}));
vi.mock("@/lib/escale/acesso/modo-da-organizacao", () => ({
  modoDaOrganizacao: vi.fn(async () => acesso.modo),
}));
vi.mock("@/lib/escale/acesso/membros", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/escale/acesso/membros")>()),
  membrosAtivos: vi.fn(async () => ({ ok: true, ids: acesso.membros })),
}));
const MEMBRO_2 = "66666666-6666-4666-8666-666666666666";
const NAO_MEMBRO = "77777777-7777-4777-8777-777777777777";

const E1 = "aaaaaaaa-0000-4000-8000-000000000001";
const E2 = "aaaaaaaa-0000-4000-8000-000000000002";
const EG = "aaaaaaaa-0000-4000-8000-000000000003";
const ARQUIVADA = "aaaaaaaa-0000-4000-8000-000000000009";

const LIDO_EM = "2026-10-17T12:00:00.000000+00:00";
const ALTERADO_EM = "2026-10-17T12:00:05.000000+00:00";

const SETTINGS = {
  fields: [{ key: "proposta", label: "Proposta", type: "text" }],
  lost_reasons: ["Preço", "Sumiu"],
  canonical_tags: ["meta_ads"],
};

function banco(
  opts: {
    org?: string;
    writeError?: (n: number, table: string) => { code: string; message: string } | null;
    readError?: (
      table: string,
      filtros: Array<[string, unknown]>,
    ) => { code: string; message: string } | null;
    settings?: Record<string, unknown>;
  } = {},
) {
  // `funilRow` não tem `updated_at` (o dublê é de outras rotas): a coluna entra por cima.
  const comCarimbo = (row: ReturnType<typeof funilRow>) =>
    ({ ...row, updated_at: LIDO_EM }) as ReturnType<typeof funilRow>;
  return makeDb({
    pipelines: [
      comCarimbo(
        funilRow({
          id: PIPE,
          name: "Pedidos",
          settings: opts.settings ?? SETTINGS,
          organization_id: opts.org ?? ORG_ID,
        }),
      ),
      comCarimbo(
        funilRow({
          id: "55555555-5555-4555-8555-555555555555",
          name: "Outra",
          settings: { lost_reasons: ["Concorrente"] },
        }),
      ),
    ],
    stages: [
      etapa({ id: E2, name: "Proposta", position: 2 }),
      etapa({ id: E1, name: "Novo", position: 1 }),
      etapa({ id: EG, name: "Ganho", position: 3, is_won: true }),
      etapa({ id: ARQUIVADA, name: "Velha", position: 4, is_archived: true }),
    ],
    writeError: opts.writeError,
    readError: opts.readError,
  });
}

/** Troca o carimbo da origem na terceira leitura, depois de a rota já ter lido a primeira. */
function outraGravacaoNoMeio(db: ReturnType<typeof banco>) {
  return (table: string, filtros: Array<[string, unknown]>) => {
    if (table === "crm_pipelines" && !filtros.some(([c]) => c === "id")) {
      for (const linha of db.tabelas.crm_pipelines) linha.updated_at = ALTERADO_EM;
    }
    return null;
  };
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function pedido(method: string, body?: unknown): NextRequest {
  const url = `http://localhost/api/v1/pipelines/${PIPE}/configuracoes`;
  if (body === undefined) return new NextRequest(url, { method });
  return new NextRequest(url, {
    method,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

async function corpo(res: Response) {
  return (await res.json()) as { data?: Record<string, unknown>; error?: { message: string } };
}

const GERAIS_VAZIO = { gerais: { moeda: null, tags_padrao: [], visualizacao: "own_and_unassigned" } };

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
  authOk();
});

describe("GET /api/v1/pipelines/:id/configuracoes", () => {
  it("devolve a origem, as etapas vivas em ordem e o que o gerente pode", async () => {
    banco();
    const res = await GET(pedido("GET"), ctx(PIPE));
    expect(res.status).toBe(200);
    const { data } = await corpo(res);
    expect((data?.pipeline as { name: string }).name).toBe("Pedidos");
    expect((data?.etapas as Array<{ name: string }>).map((e) => e.name)).toEqual([
      "Novo",
      "Proposta",
      "Ganho",
    ]);
    expect(data?.podeAdministrar).toBe(false);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.anything());
  });

  it("o administrador pode mexer em motivos e campos", async () => {
    authOk("admin");
    banco();
    const { data } = await corpo(await GET(pedido("GET"), ctx(PIPE)));
    expect(data?.podeAdministrar).toBe(true);
  });

  it("o catálogo de motivos junta as origens da organização", async () => {
    banco();
    const { data } = await corpo(await GET(pedido("GET"), ctx(PIPE)));
    expect(
      (data?.motivos as Array<{ rotulo: string; selecionado: boolean }>).map((m) => [
        m.rotulo,
        m.selecionado,
      ]),
    ).toEqual([
      ["Preço", true],
      ["Sumiu", true],
      ["Concorrente", false],
    ]);
  });

  it("traz os campos do CRM, a moeda servida e a regra em vigor: a da organização quando a origem não tem", async () => {
    acesso.modo = "own";
    banco();
    const { data } = await corpo(await GET(pedido("GET"), ctx(PIPE)));
    expect((data?.campos as Array<{ campo: string }>).map((c) => c.campo)).toEqual(["proposta"]);
    expect(data?.moedaDaOrganizacao).toBe("BRL");
    expect(data?.visualizacao).toBe("own");
    expect(data?.visualizacaoDaOrganizacao).toBe("own");
    expect(data?.pessoasDoGrupo).toEqual([]);
    expect(data?.fork as { visualizacao: unknown; pessoas: unknown }).toMatchObject({ visualizacao: null, pessoas: [] });
  });

  it("a regra da origem vence a da organização, e a lista de pessoas vem lida", async () => {
    acesso.modo = "own";
    banco({ settings: { ...SETTINGS, escale_visualizacao: "all", escale_pessoas: [MEMBRO_2, MEMBRO_2] } });
    const { data } = await corpo(await GET(pedido("GET"), ctx(PIPE)));
    expect(data?.visualizacao).toBe("all");
    expect(data?.visualizacaoDaOrganizacao).toBe("own");
    expect(data?.fork as { visualizacao: unknown; pessoas: unknown }).toMatchObject({ visualizacao: "all", pessoas: [MEMBRO_2] });
  });

  it("origem de outra organização e id inválido são 404", async () => {
    banco({ org: OUTRA_ORG });
    expect((await GET(pedido("GET"), ctx(PIPE))).status).toBe(404);
    expect((await GET(pedido("GET"), ctx("nao-e-uuid"))).status).toBe(404);
  });
});

describe("PATCH /api/v1/pipelines/:id/configuracoes", () => {
  it("gerais grava a visualização escolhida na origem", async () => {
    const db = banco();
    const res = await PATCH(pedido("PATCH", { gerais: { moeda: null, tags_padrao: [], visualizacao: "all" } }), ctx(PIPE));
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines" && e.tipo === "update");
    expect(escrita?.patch).toEqual({ settings: { ...SETTINGS, escale_visualizacao: "all" } });
  });

  it("permissoes grava a lista de pessoas (sem repetição) e audita a seção", async () => {
    const db = banco();
    const res = await PATCH(pedido("PATCH", { permissoes: { pessoas: [MEMBRO_2, MEMBRO_2.toUpperCase()] } }), ctx(PIPE));
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines" && e.tipo === "update");
    expect(escrita?.patch).toEqual({ settings: { ...SETTINGS, escale_pessoas: [MEMBRO_2] } });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ metadata: { secoes: ["permissoes"], via: "escale" } }));
  });

  it("lista vazia apaga a chave (sem restrição)", async () => {
    const db = banco({ settings: { ...SETTINGS, escale_pessoas: [MEMBRO_2] } });
    const res = await PATCH(pedido("PATCH", { permissoes: { pessoas: [] } }), ctx(PIPE));
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines" && e.tipo === "update");
    expect(escrita?.patch).toEqual({ settings: { ...SETTINGS } });
  });

  it("quem não é membro ativo não entra na lista (422), e nada é gravado", async () => {
    const db = banco();
    const res = await PATCH(pedido("PATCH", { permissoes: { pessoas: [NAO_MEMBRO] } }), ctx(PIPE));
    expect(res.status).toBe(422);
    expect((await corpo(res)).error?.message).toBe("Este usuário não faz parte da equipe.");
    expect(db.escritas.filter((e) => e.table === "crm_pipelines")).toHaveLength(0);
  });

  it("gerais sem visualizacao é 422 (o campo é obrigatório no patch de gerais)", async () => {
    banco();
    expect((await PATCH(pedido("PATCH", { gerais: { moeda: null, tags_padrao: [] } }), ctx(PIPE))).status).toBe(422);
  });

  it("gerais: grava moeda e tags no settings, com a organização no filtro, e audita", async () => {
    const db = banco();
    const res = await PATCH(
      pedido("PATCH", { gerais: { moeda: "USD", tags_padrao: ["Lead Instagram"], visualizacao: "own_and_unassigned" } }),
      ctx(PIPE),
    );
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines" && e.tipo === "update");
    expect(escrita?.patch).toEqual({
      settings: {
        ...SETTINGS,
        escale_moeda: "USD",
        escale_tags_padrao: ["lead instagram"],
        escale_visualizacao: "own_and_unassigned",
      },
    });
    expect(escrita?.filtros).toContainEqual(["organization_id", ORG_ID]);
    expect(escrita?.filtros).toContainEqual(["id", PIPE]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "pipeline.config_updated",
        resourceId: PIPE,
        actorUserId: expect.any(String),
        organizationId: ORG_ID,
        metadata: { secoes: ["gerais"], via: "escale" },
      }),
    );
  });

  it("a gravação é condicional ao updated_at lido e audita uma vez só", async () => {
    const db = banco();
    const res = await PATCH(pedido("PATCH", GERAIS_VAZIO), ctx(PIPE));
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines" && e.tipo === "update");
    expect(escrita?.filtros).toContainEqual(["updated_at", LIDO_EM]);
    expect(audit).toHaveBeenCalledTimes(1);
  });

  it("gerente que manda só o alerta grava (a trava de administrador não barra a seção)", async () => {
    const db = banco();
    const res = await PATCH(
      pedido("PATCH", {
        alerta: {
          geral: { atencao: 1, atencao_unidade: "horas", critico: 2, critico_unidade: "horas" },
          etapas: {},
        },
      }),
      ctx(PIPE),
    );
    expect(res.status).toBe(200);
    expect(db.escritas.filter((e) => e.table === "crm_pipelines")).toHaveLength(1);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { secoes: ["alerta"], via: "escale" } }),
    );
  });

  it("salvar os gerais não apaga as regras de campos nem o alerta que já estavam no settings", async () => {
    const guardados = {
      ...SETTINGS,
      escale_ao_sair: { proposta: [E1] },
      escale_alerta_tempo: {
        geral: { atencao: 1, atencao_unidade: "horas", critico: 2, critico_unidade: "horas" },
        etapas: {},
      },
    };
    const db = banco({ settings: guardados });
    const res = await PATCH(
      pedido("PATCH", { gerais: { moeda: "USD", tags_padrao: [], visualizacao: "own_and_unassigned" } }),
      ctx(PIPE),
    );
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines" && e.tipo === "update");
    const gravado = (escrita?.patch as { settings: Record<string, unknown> }).settings;
    expect(gravado.escale_ao_sair).toEqual(guardados.escale_ao_sair);
    expect(gravado.escale_alerta_tempo).toEqual(guardados.escale_alerta_tempo);
    expect(gravado.escale_moeda).toBe("USD");
  });

  it("outra gravação no meio (updated_at mudou): 409 de tentar de novo, nada gravado e nada auditado", async () => {
    const db: ReturnType<typeof banco> = banco({
      readError: (table, filtros) => outraGravacaoNoMeio(db)(table, filtros),
    });
    const res = await PATCH(
      pedido("PATCH", { gerais: { moeda: "USD", tags_padrao: [], visualizacao: "own_and_unassigned" } }),
      ctx(PIPE),
    );
    expect(res.status).toBe(409);
    expect(((await corpo(res)) as { error?: { code?: string } }).error?.code).toBe("state_conflict");
    const alvo = db.tabelas.crm_pipelines.find((l) => l.id === PIPE);
    expect(alvo?.settings).toEqual(SETTINGS);
    expect(audit).not.toHaveBeenCalled();
  });

  it("o update que não acha linha (origem apagada no meio ou RLS filtrando) é 409, sem auditoria", async () => {
    const db: ReturnType<typeof banco> = banco({
      readError: (table, filtros) => {
        if (table === "crm_pipelines" && !filtros.some(([c]) => c === "id")) {
          db.tabelas.crm_pipelines.splice(0);
        }
        return null;
      },
    });
    const res = await PATCH(pedido("PATCH", GERAIS_VAZIO), ctx(PIPE));
    expect(res.status).toBe(409);
    expect(db.escritas.filter((e) => e.table === "crm_pipelines")).toHaveLength(1);
    expect(audit).not.toHaveBeenCalled();
  });

  it("várias seções no mesmo pedido saem num update só e a auditoria lista todas", async () => {
    authOk("admin");
    const db = banco();
    const res = await PATCH(
      pedido("PATCH", {
        gerais: { moeda: "USD", tags_padrao: [], visualizacao: "own_and_unassigned" },
        motivos: { selecionados: ["Preço"], novos: [] },
      }),
      ctx(PIPE),
    );
    expect(res.status).toBe(200);
    expect(db.escritas.filter((e) => e.table === "crm_pipelines")).toHaveLength(1);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { secoes: ["gerais", "motivos"], via: "escale" } }),
    );
  });

  it("motivos e campos: o gerente é barrado antes de qualquer escrita", async () => {
    const db = banco();
    for (const body of [
      { motivos: { selecionados: ["Preço"], novos: [] } },
      { campos: { regras: [] } },
      { gerais: { moeda: null, tags_padrao: [], visualizacao: "own_and_unassigned" }, campos: { regras: [] } },
    ]) {
      expect((await PATCH(pedido("PATCH", body), ctx(PIPE))).status).toBe(403);
    }
    expect(db.escritas).toHaveLength(0);
    expect(audit).not.toHaveBeenCalled();
  });

  it("campos: o administrador grava; etapa arquivada ou de fora é 422", async () => {
    authOk("admin");
    const db = banco();
    const ok = await PATCH(
      pedido("PATCH", {
        campos: { regras: [{ campo: "proposta", quando: "ao_sair", etapas: [E1], status: [] }] },
      }),
      ctx(PIPE),
    );
    expect(ok.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines");
    expect(
      (escrita?.patch as { settings: Record<string, unknown> }).settings.escale_ao_sair,
    ).toEqual({ proposta: [E1] });

    const fora = await PATCH(
      pedido("PATCH", {
        campos: {
          regras: [{ campo: "proposta", quando: "ao_entrar", etapas: [ARQUIVADA], status: [] }],
        },
      }),
      ctx(PIPE),
    );
    expect(fora.status).toBe(422);
    expect((await corpo(fora)).error?.message).toBe("Escolha etapas desta origem.");
  });

  it("campos: regravar as regras não muda a definição dos campos do CRM", async () => {
    authOk("admin");
    const db = banco();
    await PATCH(
      pedido("PATCH", {
        campos: { regras: [{ campo: "proposta", quando: "ao_entrar", etapas: [E1], status: [] }] },
      }),
      ctx(PIPE),
    );
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines");
    const fields = (escrita?.patch as { settings: { fields: Array<Record<string, unknown>> } })
      .settings.fields;
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ key: "proposta", label: "Proposta", type: "text" });
  });

  it("corpo que não é JSON é 400; corpo fora do schema é 422", async () => {
    const db = banco();
    expect((await PATCH(pedido("PATCH", "{nao json"), ctx(PIPE))).status).toBe(400);
    expect(
      (await PATCH(pedido("PATCH", { gerais: { moeda: "XYZ", tags_padrao: [], visualizacao: "own_and_unassigned" } }), ctx(PIPE)))
        .status,
    ).toBe(422);
    expect((await PATCH(pedido("PATCH", {}), ctx(PIPE))).status).toBe(422);
    expect(
      (await PATCH(pedido("PATCH", { ...GERAIS_VAZIO, organization_id: OUTRA_ORG }), ctx(PIPE)))
        .status,
    ).toBe(422);
    expect(db.escritas).toHaveLength(0);
  });

  it("origem de outra organização e id inválido são 404, sem escrita", async () => {
    const db = banco({ org: OUTRA_ORG });
    expect((await PATCH(pedido("PATCH", GERAIS_VAZIO), ctx(PIPE))).status).toBe(404);
    expect((await PATCH(pedido("PATCH", GERAIS_VAZIO), ctx("nao-e-uuid"))).status).toBe(404);
    expect(db.escritas).toHaveLength(0);
    expect(audit).not.toHaveBeenCalled();
  });

  it("o suporte somente leitura para antes do papel", async () => {
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(
      new Response(null, { status: 423 }) as never,
    );
    expect((await PATCH(pedido("PATCH", GERAIS_VAZIO), ctx(PIPE))).status).toBe(423);
    expect(requireRole).not.toHaveBeenCalled();
  });

  it("RLS recusando a escrita é 403; erro desconhecido é 500 sem a mensagem do banco", async () => {
    banco({
      writeError: () => ({ code: "42501", message: "permission denied for table crm_pipelines" }),
    });
    expect((await PATCH(pedido("PATCH", GERAIS_VAZIO), ctx(PIPE))).status).toBe(403);

    banco({ writeError: () => ({ code: "XX000", message: "coluna secreta explodiu" }) });
    const res = await PATCH(pedido("PATCH", GERAIS_VAZIO), ctx(PIPE));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await corpo(res))).not.toContain("coluna secreta");
    expect(audit).not.toHaveBeenCalled();
  });

  it("deadlock e falha de serialização (40P01, 40001) pedem para tentar de novo; 23514 é validação", async () => {
    for (const code of ["40P01", "40001"]) {
      banco({ writeError: () => ({ code, message: "detalhe interno do banco" }) });
      const res = await PATCH(pedido("PATCH", GERAIS_VAZIO), ctx(PIPE));
      expect(res.status).toBe(409);
      expect(JSON.stringify(await corpo(res))).not.toContain("detalhe interno");
    }
    banco({ writeError: () => ({ code: "23514", message: "check constraint do banco violada" }) });
    const invalido = await PATCH(pedido("PATCH", GERAIS_VAZIO), ctx(PIPE));
    expect(invalido.status).toBe(422);
    expect(JSON.stringify(await corpo(invalido))).not.toContain("check constraint");
    expect(audit).not.toHaveBeenCalled();
  });
});
