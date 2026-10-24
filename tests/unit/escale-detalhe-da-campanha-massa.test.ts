import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/campanhas-da-casca/[id]/massa/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  novaCampanhaComContatosAcao,
  tirarDaListaAcao,
} from "@/lib/escale/campanhas/detalhe/acoes";
import { alvoDaSelecaoDaCampanha } from "@/lib/escale/campanhas/detalhe/massa";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ admin: true })) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/escale/campanhas/detalhe/acoes", () => ({
  novaCampanhaComContatosAcao: vi.fn(),
  tirarDaListaAcao: vi.fn(),
}));

const ID = "e5ca1e00-8c00-4000-8000-0000000000c1";
const R1 = "e5ca1e00-8c00-4000-8000-0000000000d1";
const R2 = "e5ca1e00-8c00-4000-8000-0000000000d2";
const R3 = "e5ca1e00-8c00-4000-8000-0000000000d3";
const PIPE = "e5ca1e00-8c00-4000-8000-0000000000f1";
const ETAPA = "e5ca1e00-8c00-4000-8000-0000000000f2";

function sessao(selecao: unknown[], etapa: unknown = null) {
  const db = {
    faixas: [] as Array<[number, number]>,
    rpc: vi.fn((nome: string) => {
      if (nome === "fn_escale_selecao_da_campanha")
        // Como o PostgREST: a resposta vem em faixas (`.range`), no máximo 1.000 por vez.
        return {
          range: (de: number, ate: number) => {
            db.faixas.push([de, ate]);
            return Promise.resolve({ data: selecao.slice(de, ate + 1), error: null });
          },
        };
      return Promise.resolve({
        data: [{ acao_id: "a1", quantidade: 1, status: "na_fila" }],
        error: null,
      });
    }),
    from: vi.fn(() => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
      c.maybeSingle = vi.fn().mockResolvedValue({ data: etapa, error: null });
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

const pedir = (corpo: unknown) =>
  POST(
    new NextRequest(new URL("http://x/massa"), { method: "POST", body: JSON.stringify(corpo) }),
    { params: Promise.resolve({ id: ID }) },
  );

const DOIS = [
  { destinatario_id: R1, contato_id: "k1" },
  { destinatario_id: R2, contato_id: "k1" },
];

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(audit).mockReset();
  vi.mocked(novaCampanhaComContatosAcao).mockReset();
  vi.mocked(tirarDaListaAcao).mockReset();
});

describe("alvoDaSelecaoDaCampanha", () => {
  it("ids marcados ou o filtro menos os desmarcados", () => {
    expect(alvoDaSelecaoDaCampanha({ tipo: "ids", ids: [R1] }, {})).toEqual({
      tipo: "ids",
      ids: [R1],
    });
    expect(
      alvoDaSelecaoDaCampanha(
        { tipo: "todos", quantidade: null, excluidos: [R3] },
        { situacoes: ["nao_enviado"] },
      ),
    ).toEqual({ tipo: "filtro", f: '{"situacoes":["nao_enviado"]}', excluidos: [R3] });
    expect(alvoDaSelecaoDaCampanha({ tipo: "todos", quantidade: null, excluidos: [] }, {})).toEqual(
      {
        tipo: "filtro",
        excluidos: [],
      },
    );
  });
});

describe("POST /api/v1/campanhas-da-casca/[id]/massa", () => {
  it("tag: resolve a seleção, tira contato repetido e põe na fila da 2B", async () => {
    authOk("manager");
    const db = sessao(DOIS);
    const r = await pedir({
      acao: "incluir_tag",
      alvo: { tipo: "ids", ids: [R1, R2] },
      parametros: { tag: "vip" },
    });
    expect(r.status).toBe(201);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_selecao_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_filtros: {},
      p_ids: [R1, R2],
      p_excluidos: null,
    });
    expect(db.rpc).toHaveBeenCalledWith(
      "fn_escale_criar_acao_em_massa",
      expect.objectContaining({
        p_org: ORG_ID,
        p_acao: "incluir_tag",
        p_parametros: { tag: "vip" },
        p_ids: ["k1"],
      }),
    );
    expect((await r.json()).data).toEqual({
      tipo: "acao_em_massa",
      id: "a1",
      total: 1,
      status: "na_fila",
    });
    expect(vi.mocked(audit)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contacts.bulk_requested" }),
    );
  });

  it("seleção com mais de 1.000 alvos: lê em faixas de 1.000 e age em todos", async () => {
    authOk("manager");
    const muitos = Array.from({ length: 2300 }, (_, i) => ({
      destinatario_id: `d${i}`,
      contato_id: `k${i}`,
    }));
    const db = sessao(muitos);
    const r = await pedir({
      acao: "incluir_tag",
      alvo: { tipo: "filtro", excluidos: [] },
      parametros: { tag: "vip" },
    });
    expect(r.status).toBe(201);
    expect(db.faixas).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
      [2300, 3299],
    ]);
    const criar = (db.rpc.mock.calls as unknown as Array<[string, { p_ids: string[] }]>).find(
      ([n]) => n === "fn_escale_criar_acao_em_massa",
    );
    expect(criar?.[1].p_ids).toHaveLength(2300);
  });

  it("Criar campanha pelo filtro: compila, passa os desmarcados e devolve o rascunho novo", async () => {
    authOk("manager");
    const db = sessao([{ destinatario_id: R1, contato_id: "k1" }]);
    vi.mocked(novaCampanhaComContatosAcao).mockResolvedValue({ ok: true, id: "novo" });
    const r = await pedir({
      acao: "nova_campanha",
      alvo: { tipo: "filtro", f: JSON.stringify({ situacoes: ["nao_enviado"] }), excluidos: [R3] },
    });
    expect(r.status).toBe(201);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_selecao_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_filtros: { situacoes: ["nao_enviado"] },
      p_ids: null,
      p_excluidos: [R3],
    });
    expect(vi.mocked(novaCampanhaComContatosAcao)).toHaveBeenCalledWith(
      { admin: true },
      ORG_ID,
      ID,
      ["k1"],
      USER_ID,
    );
    expect((await r.json()).data).toEqual({ tipo: "campanha", id: "novo" });
    expect(vi.mocked(audit)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "campaign.duplicated" }),
    );
  });

  it("Excluir selecionados repassa a recusa do motor", async () => {
    authOk("manager");
    sessao(DOIS);
    vi.mocked(tirarDaListaAcao).mockResolvedValue({
      ok: false,
      codigo: "campanha_estado_invalido",
      mensagem: "Só dá para tirar contatos da lista antes de o envio começar.",
      status: 409,
    });
    const r = await pedir({ acao: "tirar_da_lista", alvo: { tipo: "ids", ids: [R1, R2] } });
    expect(r.status).toBe(409);
    expect((await r.json()).error.message).toBe(
      "Só dá para tirar contatos da lista antes de o envio começar.",
    );
  });

  it("seleção vazia, etapa de outra origem e corpo ruim são 422", async () => {
    authOk("manager");
    sessao([]);
    expect((await pedir({ acao: "nova_campanha", alvo: { tipo: "ids", ids: [R1] } })).status).toBe(
      422,
    );
    sessao(DOIS, { pipeline_id: "outra", is_archived: false });
    const r = await pedir({
      acao: "criar_negocios",
      alvo: { tipo: "ids", ids: [R1] },
      parametros: { pipeline_id: PIPE, stage_id: ETAPA },
    });
    expect(r.status).toBe(422);
    expect((await r.json()).error.message).toBe("Escolha a origem e a etapa.");
    expect((await pedir({ acao: "xyz" })).status).toBe(422);
  });
});
