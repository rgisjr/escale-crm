import { beforeEach, describe, expect, it, vi } from "vitest";

import { carregarCampanha } from "@/lib/campanhas/acoes";
import { duplicarDoAssistente } from "@/lib/escale/campanhas/acoes-do-assistente";
import { FILTRO_VAZIO } from "@/lib/campanhas/audiencia";
import {
  audienciaDosContatos,
  novaCampanhaComContatosAcao,
  tirarDaListaAcao,
} from "@/lib/escale/campanhas/detalhe/acoes";

vi.mock("@/lib/campanhas/acoes", () => ({ carregarCampanha: vi.fn() }));
vi.mock("@/lib/escale/campanhas/acoes-do-assistente", () => ({ duplicarDoAssistente: vi.fn() }));

const ORG = "org-1";
const ID = "c1";

/** Cada `from(tabela)` aguardado consome a próxima resposta da fila daquela tabela. */
function dbFalso(respostas: Record<string, unknown[]>) {
  const chamadas: Array<{ tabela: string; metodo: string; args: unknown[] }> = [];
  const db = {
    from: vi.fn((tabela: string) => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "update", "delete", "eq", "in", "is", "not"]) {
        c[m] = vi.fn((...args: unknown[]) => {
          chamadas.push({ tabela, metodo: m, args });
          return c;
        });
      }
      c.then = (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) =>
        Promise.resolve((respostas[tabela] ?? []).shift() ?? { data: null, error: null }).then(
          ok,
          erro,
        );
      return c;
    }),
  };
  const updates = (tabela: string) =>
    chamadas.filter((c) => c.tabela === tabela && c.metodo === "update").map((c) => c.args[0]);
  return { db, updates, chamadas };
}

const carregada = (status: string, filtro: Record<string, unknown> = FILTRO_VAZIO) =>
  ({
    ok: true,
    campanha: { id: ID, organization_id: ORG, status, audience_filter: filtro },
  }) as never;

beforeEach(() => {
  vi.mocked(carregarCampanha).mockReset();
  vi.mocked(duplicarDoAssistente).mockReset();
});

describe("audienciaDosContatos", () => {
  it("o filtro vazio do original com os contatos e o limite certo", () => {
    expect(audienciaDosContatos(["a", "a", "b"])).toEqual({
      ...FILTRO_VAZIO,
      incluir_contatos: ["a", "b"],
      limite: 2,
    });
  });
});

describe("novaCampanhaComContatosAcao (Criar campanha)", () => {
  it("duplica pelo original e grava os contatos no rascunho novo", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue(carregada("completed"));
    vi.mocked(duplicarDoAssistente).mockResolvedValue({ ok: true, id: "novo" });
    const { db, updates } = dbFalso({ campaigns: [{ error: null }] });
    const r = await novaCampanhaComContatosAcao(db as never, ORG, ID, ["k1", "k2"], "u1");
    expect(r).toEqual({ ok: true, id: "novo" });
    expect(vi.mocked(duplicarDoAssistente)).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ id: ID }),
      "u1",
    );
    expect(updates("campaigns")[0]).toEqual({
      audience_filter: { ...FILTRO_VAZIO, incluir_contatos: ["k1", "k2"], limite: 2 },
      escale_publico: {
        selecao: { tipo: "ids", ids: ["k1", "k2"] },
        avulsos: [],
        removidos: [],
      },
      updated_by: "u1",
    });
  });

  it("se gravar o público da cópia falha, desfaz a cópia e responde 500 (B8-14)", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue(carregada("completed"));
    vi.mocked(duplicarDoAssistente).mockResolvedValue({ ok: true, id: "novo" });
    const { db, chamadas } = dbFalso({ campaigns: [{ error: { message: "caiu" } }, { error: null }] });
    const r = await novaCampanhaComContatosAcao(db as never, ORG, ID, ["k1"], "u1");
    expect(r).toMatchObject({ ok: false, status: 500 });
    expect(chamadas.some((c) => c.tabela === "campaigns" && c.metodo === "delete")).toBe(true);
  });

  it("recusa vazio e acima de 5.000", async () => {
    const { db } = dbFalso({});
    expect(await novaCampanhaComContatosAcao(db as never, ORG, ID, [], "u1")).toMatchObject({
      ok: false,
      status: 422,
    });
    const muitos = Array.from({ length: 5001 }, (_, i) => `k${i}`);
    expect(await novaCampanhaComContatosAcao(db as never, ORG, ID, muitos, "u1")).toEqual({
      ok: false,
      codigo: "unprocessable_entity",
      mensagem: "No máximo 5.000 contatos numa campanha nova a partir da seleção.",
      status: 422,
    });
  });
});

describe("tirarDaListaAcao (Excluir selecionados)", () => {
  const alvos = [
    { destinatarioId: "r1", contatoId: "k1" },
    { destinatarioId: "r2", contatoId: "k2" },
  ];

  it("antes do envio: o filtro ganha os contatos, a lista marca 'excluído à mão' e o snapshot é recontado", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue(
      carregada("ready", { ...FILTRO_VAZIO, com_alguma_tag: ["vip"], excluir_contatos: ["k0"] }),
    );
    const { db, updates } = dbFalso({
      campaign_recipients: [
        { count: 0 },
        { data: [{ id: "r1" }, { id: "r2" }], error: null },
        { count: 28 },
        { count: 2 },
      ],
      campaigns: [{ data: [{ id: ID }], error: null }, { error: null }],
    });
    const r = await tirarDaListaAcao(db as never, ORG, ID, alvos, "u1");
    expect(r).toEqual({ ok: true, tirados: 2 });
    const [filtro, snapshot] = updates("campaigns") as Array<Record<string, unknown>>;
    expect(filtro).toEqual({
      audience_filter: {
        ...FILTRO_VAZIO,
        com_alguma_tag: ["vip"],
        excluir_contatos: ["k0", "k1", "k2"],
      },
      updated_by: "u1",
    });
    expect(snapshot).toEqual({ snapshot_eligible: 28, snapshot_excluded: 2 });
    expect(updates("campaign_recipients")[0]).toEqual({
      status: "skipped",
      eligibility_status: "excluded",
      exclusion_reason: "excluido_manualmente",
    });
  });

  it("campanha do assistente (8B): os contatos também entram nos removidos do público", async () => {
    const base = carregada("ready") as { campanha: Record<string, unknown> };
    vi.mocked(carregarCampanha).mockResolvedValue({
      ok: true,
      campanha: {
        ...base.campanha,
        escale_publico: {
          selecao: null,
          avulsos: ["00000000-0000-4000-8000-000000000001"],
          removidos: ["00000000-0000-4000-8000-000000000000"],
        },
      },
    } as never);
    const { db, updates } = dbFalso({
      campaign_recipients: [
        { count: 0 },
        { data: [{ id: "r1" }], error: null },
        { count: 1 },
        { count: 1 },
      ],
      campaigns: [{ data: [{ id: ID }], error: null }, { error: null }],
    });
    await tirarDaListaAcao(
      db as never,
      ORG,
      ID,
      [{ destinatarioId: "r1", contatoId: "00000000-0000-4000-8000-000000000001" }],
      "u1",
    );
    const [filtro] = updates("campaigns") as Array<Record<string, unknown>>;
    expect(filtro!.escale_publico).toEqual({
      selecao: null,
      avulsos: [],
      removidos: ["00000000-0000-4000-8000-000000000000", "00000000-0000-4000-8000-000000000001"],
    });
  });

  it("erro ao tirar os destinatários não vira '0 tirados' (B8-14)", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue(carregada("ready"));
    const { db } = dbFalso({
      campaign_recipients: [{ count: 0 }, { data: null, error: { message: "caiu" } }],
      campaigns: [{ data: [{ id: ID }], error: null }],
    });
    const r = await tirarDaListaAcao(db as never, ORG, ID, alvos, "u1");
    expect(r).toMatchObject({ ok: false, status: 500 });
  });

  it("depois de qualquer envio, ou com a campanha andando, recusa", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue(carregada("scheduled"));
    const { db } = dbFalso({ campaign_recipients: [{ count: 3 }] });
    expect(await tirarDaListaAcao(db as never, ORG, ID, alvos, "u1")).toEqual({
      ok: false,
      codigo: "campanha_estado_invalido",
      mensagem: "Só dá para tirar contatos da lista antes de o envio começar.",
      status: 409,
    });
    vi.mocked(carregarCampanha).mockResolvedValue(carregada("running"));
    const outro = dbFalso({ campaign_recipients: [{ count: 0 }] });
    expect(await tirarDaListaAcao(outro.db as never, ORG, ID, alvos, "u1")).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("o estado mudou no meio: 409 de corrida", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue(carregada("ready"));
    const { db } = dbFalso({
      campaign_recipients: [{ count: 0 }],
      campaigns: [{ data: [], error: null }],
    });
    expect(await tirarDaListaAcao(db as never, ORG, ID, alvos, "u1")).toMatchObject({
      ok: false,
      status: 409,
      mensagem: "O estado da campanha mudou enquanto esta ação era processada. Recarregue a tela.",
    });
  });
});
