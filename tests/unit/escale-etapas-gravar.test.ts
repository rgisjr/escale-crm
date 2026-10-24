import { beforeEach, describe, expect, it, vi } from "vitest";

const op = vi.hoisted(() => ({
  criarEtapa: vi.fn(),
  atualizarEtapa: vi.fn(),
  arquivarEtapa: vi.fn(),
  funil: [] as unknown[],
}));

vi.mock("@/lib/leads/stage-operations", () => ({
  criarEtapa: op.criarEtapa,
  atualizarEtapa: op.atualizarEtapa,
  arquivarEtapa: op.arquivarEtapa,
  funilOuNadaFeito: async () => op.funil,
  lerFunil: async () => op.funil,
  corpo: (e: unknown[]) => ({ etapas: e }),
  autorDoAudit: () => ({ actorUserId: "u1", metadata: {} }),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

import { ApiError } from "@/lib/api/types";
import { gravarEtapasEAtividades, pedidoDeEtapasSchema } from "@/lib/escale/etapas/gravar";

/** FORK ESCALE · Fase 1L: a ordem de gravação e as recusas de `gravarEtapasEAtividades`. */
const U = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const [E1, E2, E3] = [U(1), U(2), U(3)];
const etapa = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  description: null,
  is_won: false,
  is_lost: false,
  is_archived: false,
  position: 1,
  ...extra,
});

const chamadas: string[] = [];
let negociosPorEtapa: Record<string, number> = {};
let rpcErro: { code: string; message: string } | null = null;

function banco() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: (_c: string, stage: string) =>
            Promise.resolve({ count: negociosPorEtapa[stage] ?? 0, error: null }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: (_c: string, stage: string) => ({
            select: () => {
              chamadas.push(`apagar:${stage}`);
              return Promise.resolve({ data: [{ id: "n1" }], error: null });
            },
          }),
        }),
      }),
    }),
    rpc: (nome: string) => {
      chamadas.push(`rpc:${nome}`);
      return Promise.resolve({ error: nome === "fn_escale_salvar_playbook" ? rpcErro : null });
    },
  };
}

const deps = () =>
  ({
    supabase: banco(),
    organizationId: "org",
    actor: { type: "user", id: "u1", role: "manager" },
    requestId: "r1",
  }) as never;

const pedido = (p: Record<string, unknown>) =>
  pedidoDeEtapasSchema.parse({ etapas: [], excluidas: [], atividades: [], ...p });

beforeEach(() => {
  chamadas.length = 0;
  negociosPorEtapa = {};
  rpcErro = null;
  op.funil = [
    etapa(E1, "1. Entrada", { position: 1 }),
    etapa(E2, "2. Atendimento", { position: 2 }),
  ];
  op.criarEtapa.mockReset().mockImplementation(async () => {
    chamadas.push("criar");
    return { stageId: E3 };
  });
  op.atualizarEtapa
    .mockReset()
    .mockImplementation(async (_d: unknown, i: { stageId: string; pedido: object }) => {
      chamadas.push(`atualizar:${i.stageId}:${JSON.stringify(i.pedido)}`);
    });
  op.arquivarEtapa
    .mockReset()
    .mockImplementation(async (_d: unknown, i: { stageId: string; destinoId: string | null }) => {
      chamadas.push(`arquivar:${i.stageId}:${i.destinoId}`);
    });
});

describe("gravarEtapasEAtividades", () => {
  it("cria, renomeia, reordena, grava o playbook e só então arquiva, nessa ordem", async () => {
    const r = await gravarEtapasEAtividades(deps(), {
      pipelineId: U(9),
      pedido: pedido({
        etapas: [
          { id: "novo:a", nome: "Nova Etapa 3", descricao: "desc" },
          { id: E2, nome: "2. Atendimento", descricao: null },
        ],
        excluidas: [{ id: E1, negocios: { acao: "mover", destino_id: E2 } }],
      }),
    });
    expect(chamadas).toEqual([
      "criar",
      `atualizar:${E3}:{"depois_de":null}`,
      "rpc:fn_escale_salvar_playbook",
      `arquivar:${E1}:${E2}`,
    ]);
    expect(r.ids).toEqual({ "novo:a": E3 });
  });

  it("troca o id provisório pelo real nas atividades do playbook", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const d = { ...(deps() as object), supabase: { ...banco(), rpc } } as never;
    await gravarEtapasEAtividades(d, {
      pipelineId: U(9),
      pedido: pedido({
        etapas: [
          { id: E1, nome: "1. Entrada", descricao: null },
          { id: E2, nome: "2. Atendimento", descricao: null },
          { id: "novo:a", nome: "Nova", descricao: null },
        ],
        atividades: [
          {
            id: U(7),
            stage_id: "novo:a",
            titulo: "Oi",
            tipo: "whatsapp",
            visibilidade: "padrao",
            prazo_minutos: 0,
            ordem: 0,
            conteudo: null,
          },
        ],
      }),
    });
    const enviado = rpc.mock.calls[0]![1].p_atividades as Array<{ stage_id: string }>;
    expect(enviado[0]!.stage_id).toBe(E3);
  });

  it("só reordena quem saiu do lugar e só atualiza quem mudou nome ou descrição", async () => {
    await gravarEtapasEAtividades(deps(), {
      pipelineId: U(9),
      pedido: pedido({
        etapas: [
          { id: E2, nome: "2. Atendimento", descricao: null },
          { id: E1, nome: "Entrada nova", descricao: null },
        ],
      }),
    });
    expect(chamadas).toEqual([
      `atualizar:${E1}:{"name":"Entrada nova"}`,
      `atualizar:${E2}:{"depois_de":null}`,
      "rpc:fn_escale_salvar_playbook",
    ]);
  });

  it("pede a decisão dos negócios ANTES de gravar qualquer coisa", async () => {
    negociosPorEtapa = { [E1]: 3 };
    const erro = await gravarEtapasEAtividades(deps(), {
      pipelineId: U(9),
      pedido: pedido({
        etapas: [
          { id: "novo:a", nome: "Nova", descricao: null },
          { id: E2, nome: "2. Atendimento", descricao: null },
        ],
        excluidas: [{ id: E1 }],
      }),
    }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).details).toEqual({
      precisa_destino: [{ id: E1, nome: "1. Entrada", negocios: 3 }],
    });
    expect(chamadas).toEqual([]);
  });

  it("'excluir todos os negócios' apaga os negócios, avisa o evento e depois arquiva sem destino", async () => {
    negociosPorEtapa = { [E1]: 2 };
    await gravarEtapasEAtividades(deps(), {
      pipelineId: U(9),
      pedido: pedido({
        etapas: [{ id: E2, nome: "2. Atendimento", descricao: null }],
        excluidas: [{ id: E1, negocios: { acao: "excluir" } }],
      }),
    });
    expect(chamadas).toEqual([
      "rpc:fn_escale_salvar_playbook",
      `apagar:${E1}`,
      "rpc:emit_event",
      `arquivar:${E1}:null`,
    ]);
  });

  it("recusa (409) quando a tela não viu o funil inteiro, sem gravar nada", async () => {
    const erro = await gravarEtapasEAtividades(deps(), {
      pipelineId: U(9),
      pedido: pedido({ etapas: [{ id: E1, nome: "1. Entrada", descricao: null }] }),
    }).catch((e: unknown) => e);
    expect((erro as ApiError).status).toBe(409);
    expect(chamadas).toEqual([]);
  });

  it("recusa destino que não é etapa mantida", async () => {
    negociosPorEtapa = { [E1]: 1 };
    const erro = await gravarEtapasEAtividades(deps(), {
      pipelineId: U(9),
      pedido: pedido({
        etapas: [{ id: E2, nome: "2. Atendimento", descricao: null }],
        excluidas: [{ id: E1, negocios: { acao: "mover", destino_id: E1 } }],
      }),
    }).catch((e: unknown) => e);
    expect((erro as ApiError).status).toBe(422);
    expect(chamadas).toEqual([]);
  });

  it("traduz a recusa 22023 do playbook e não arquiva depois dela", async () => {
    rpcErro = { code: "22023", message: "x" };
    const erro = await gravarEtapasEAtividades(deps(), {
      pipelineId: U(9),
      pedido: pedido({
        etapas: [{ id: E2, nome: "2. Atendimento", descricao: null }],
        excluidas: [{ id: E1, negocios: { acao: "excluir" } }],
      }),
    }).catch((e: unknown) => e);
    expect((erro as ApiError).status).toBe(422);
    expect(chamadas.some((c) => c.startsWith("arquivar") || c.startsWith("apagar"))).toBe(false);
  });
});

describe("nomes", () => {
  it("recusa antes de gravar nome final repetido ou igual ao de ganho/perda", async () => {
    op.funil = [etapa(E1, "1. Entrada"), etapa(E2, "2. Atendimento"), etapa(U(5), "Ganho", { is_won: true })];
    for (const nome of ["1. entrada", "GANHO"]) {
      const erro = await gravarEtapasEAtividades(deps(), {
        pipelineId: U(9),
        pedido: pedido({
          etapas: [
            { id: E1, nome: "1. Entrada", descricao: null },
            { id: E2, nome, descricao: null },
          ],
        }),
      }).catch((e: unknown) => e);
      expect((erro as ApiError).status).toBe(422);
    }
    expect(chamadas).toEqual([]);
  });

  it("excluir uma etapa e dar o nome dela a outra: a que sai ganha nome provisório antes", async () => {
    await gravarEtapasEAtividades(deps(), {
      pipelineId: U(9),
      pedido: pedido({
        etapas: [{ id: E2, nome: "1. Entrada", descricao: null }],
        excluidas: [{ id: E1 }],
      }),
    });
    expect(chamadas[0]).toMatch(new RegExp(`^atualizar:${E1}:\\{"name":"1\\. Entrada \\(`));
    expect(chamadas[1]).toBe(`atualizar:${E2}:{"name":"1. Entrada"}`);
    expect(chamadas.at(-1)).toBe(`arquivar:${E1}:null`);
  });
});

describe("pedidoDeEtapasSchema", () => {
  it("aceita id provisório e recusa campo desconhecido, nome longo e lista de etapas vazia", () => {
    const base = {
      etapas: [{ id: "novo:a", nome: "ok", descricao: null }],
      excluidas: [],
      atividades: [],
    };
    expect(pedidoDeEtapasSchema.safeParse(base).success).toBe(true);
    expect(pedidoDeEtapasSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(
      pedidoDeEtapasSchema.safeParse({
        ...base,
        etapas: [{ id: E1, nome: "x".repeat(41), descricao: null }],
      }).success,
    ).toBe(false);
    expect(pedidoDeEtapasSchema.safeParse({ ...base, etapas: [] }).success).toBe(false);
    expect(
      pedidoDeEtapasSchema.safeParse({
        ...base,
        etapas: [{ id: "qualquer", nome: "ok", descricao: null }],
      }).success,
    ).toBe(false);
  });
});
