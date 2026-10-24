import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { GET as contatosDaImportacao } from "@/app/api/v1/importacoes/[id]/contatos/route";
import { POST } from "@/app/api/v1/campanhas-da-casca/publico/route";
import {
  compilarPublico,
  idsDoPublico,
  paginaDoPublico,
} from "@/lib/escale/campanhas/publico-banco";
import { createClient } from "@/lib/supabase/server";
import { bancoDeMentira } from "@/tests/helpers/banco-de-mentira";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

const C1 = "bbbbbbbb-0000-4000-8000-000000000001";
const C2 = "bbbbbbbb-0000-4000-8000-000000000002";
const IMPORTACAO = "eeeeeeee-0000-4000-8000-000000000001";

const pagina = (ids: string[], total: number) => ({
  data: ids.map((contact_id) => ({ contact_id, total })),
  error: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  authOk("manager");
});

describe("compilarPublico", () => {
  it("ids passam como estão; sem seleção fica nulo", () => {
    expect(
      compilarPublico({ selecao: { tipo: "ids", ids: [C1] }, avulsos: [C2], removidos: [] }, "UTC"),
    ).toEqual({
      selecao: { tipo: "ids", ids: [C1] },
      avulsos: [C2],
      removidos: [],
    });
    expect(
      compilarPublico({ selecao: null, avulsos: [], removidos: [] }, "UTC").selecao,
    ).toBeNull();
  });

  it("o filtro vira o compilado da 2B (busca e filtros no fuso)", () => {
    const f = JSON.stringify({ telefone: "com" });
    const c = compilarPublico(
      {
        selecao: { tipo: "filtro", q: "ana", v: "com_negocio", f, quantidade: 50, excluidos: [C1] },
        avulsos: [],
        removidos: [],
      },
      "America/Sao_Paulo",
    );
    expect(c.selecao).toMatchObject({
      tipo: "filtro",
      visao: "com_negocio",
      quantidade: 50,
      excluidos: [C1],
    });
    expect((c.selecao as { padrao: string | null }).padrao).not.toBeNull();
    expect((c.selecao as { filtros: Record<string, unknown> }).filtros).toMatchObject({
      fuso: "America/Sao_Paulo",
    });
  });

  it("filtro que não lê é recusado", () => {
    expect(() =>
      compilarPublico(
        {
          selecao: { tipo: "filtro", v: "todos", f: "{quebrado", quantidade: null, excluidos: [] },
          avulsos: [],
          removidos: [],
        },
        "UTC",
      ),
    ).toThrow(/Filtro/);
  });
});

describe("idsDoPublico e paginaDoPublico", () => {
  it("lê em páginas até o total, mesmo quando a página volta curta", async () => {
    let chamada = 0;
    const { db, rpcs } = bancoDeMentira({
      rpc: {
        fn_escale_pagina_do_publico: () => (chamada++ === 0 ? pagina([C1], 2) : pagina([C2], 2)),
      },
    });
    const ids = await idsDoPublico(db as never, ORG_ID, {
      selecao: null,
      avulsos: [C1, C2],
      removidos: [],
    });
    expect(ids).toEqual([C1, C2]);
    expect(rpcs.map((r) => r.args.p_deslocamento)).toEqual([0, 1]);
  });

  it("a página vem hidratada e na ordem do banco", async () => {
    const { db } = bancoDeMentira({
      rpc: { fn_escale_pagina_do_publico: () => pagina([C2, C1], 2) },
      tabelas: {
        contacts: [
          {
            id: C1,
            name: "Ana",
            display_name: null,
            phone_number: "+5511999990001",
            email: null,
            tags: ["vip"],
          },
          {
            id: C2,
            name: null,
            display_name: "Bia",
            phone_number: null,
            email: "bia@x.com",
            tags: null,
          },
        ],
      },
    });
    const r = await paginaDoPublico(
      db as never,
      ORG_ID,
      { selecao: null, avulsos: [C2, C1], removidos: [] },
      1,
      10,
    );
    expect(r.total).toBe(2);
    expect(r.linhas.map((l) => l.nome)).toEqual(["Bia", "Ana"]);
    expect(r.linhas[1]).toMatchObject({ telefone: "+5511999990001", tags: ["vip"] });
  });
});

describe("POST /api/v1/campanhas-da-casca/publico", () => {
  const pedir = (corpo: unknown) =>
    POST(
      new NextRequest("http://x/api/v1/campanhas-da-casca/publico", {
        method: "POST",
        body: JSON.stringify(corpo),
      }),
    );

  it("devolve a página", async () => {
    const { db } = bancoDeMentira({
      rpc: { fn_escale_pagina_do_publico: () => pagina([C1], 1) },
      tabelas: {
        contacts: [
          { id: C1, name: "Ana", display_name: null, phone_number: null, email: null, tags: [] },
        ],
        organizations: [{ timezone: "UTC" }],
      },
    });
    vi.mocked(createClient).mockResolvedValue(db as never);
    const res = await pedir({
      publico: { selecao: { tipo: "ids", ids: [C1] }, avulsos: [], removidos: [] },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({
      linhas: [{ id: C1, nome: "Ana", telefone: null, email: null, tags: [] }],
      total: 1,
    });
  });

  it("público inválido é 422", async () => {
    vi.mocked(createClient).mockResolvedValue(bancoDeMentira().db as never);
    expect((await pedir({ publico: { selecao: { tipo: "ids", ids: ["x"] } } })).status).toBe(422);
  });
});

describe("GET /api/v1/importacoes/[id]/contatos", () => {
  it("os contatos que a importação criou ou atualizou, sem repetir", async () => {
    const { db } = bancoDeMentira({
      tabelas: {
        crm_importacoes_linhas: (c) =>
          c.filtros.some(([f]) => f === "gt")
            ? []
            : [
                { numero: 1, contato_id: C1 },
                { numero: 2, contato_id: C2 },
                { numero: 3, contato_id: C1 },
              ],
      },
    });
    vi.mocked(createClient).mockResolvedValue(db as never);
    const res = await contatosDaImportacao(
      new NextRequest(`http://x/api/v1/importacoes/${IMPORTACAO}/contatos`),
      {
        params: Promise.resolve({ id: IMPORTACAO }),
      },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ ids: [C1, C2] });
  });
});
