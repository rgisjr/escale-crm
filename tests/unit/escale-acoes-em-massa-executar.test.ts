import { describe, expect, it, vi } from "vitest";

import type { EventRow } from "@/lib/event-log/dispatcher";
import { ApiError } from "@/lib/api/types";
import { csvDeContatos, dataHoraBr, linhaDoCsv } from "@/lib/escale/massa/csv-de-contatos";
import { ORCAMENTO_MS, processarAcaoEmMassa, type Dependencias } from "@/lib/escale/massa/executar";

const ORG = "cccccccc-0000-4000-8000-000000000001";
const ACAO = "aaaaaaaa-0000-4000-8000-000000000001";
const USER = "bbbbbbbb-0000-4000-8000-000000000001";

type Resposta = { data: unknown; error: { message: string } | null };

/** Supabase de mentira: cada tabela tem uma fila de respostas (uma por leitura); toda escrita fica anotada. */
function banco(filas: Record<string, Resposta[]>) {
  const anotado: Array<{ tabela: string; tipo: string; corpo?: unknown }> = [];
  const from = vi.fn((tabela: string) => {
    let escrita = false;
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "eq", "gt", "lt", "in", "not", "order", "limit"])
      cadeia[m] = vi.fn(() => cadeia);
    const proxima = (): Resposta =>
      escrita ? { data: null, error: null } : (filas[tabela]?.shift() ?? { data: [], error: null });
    cadeia.maybeSingle = vi.fn(async () => proxima());
    cadeia.then = (ok: (r: Resposta) => unknown) => Promise.resolve(proxima()).then(ok);
    for (const tipo of ["update", "insert", "delete"]) {
      cadeia[tipo] = vi.fn((corpo?: unknown) => {
        escrita = true;
        anotado.push({ tabela, tipo, corpo });
        return cadeia;
      });
    }
    return cadeia;
  });
  const upload = vi.fn(async () => ({ data: {}, error: null }));
  const remove = vi.fn(async () => ({ data: [], error: null }));
  const storage = { from: vi.fn(() => ({ upload, remove })) };
  return { db: { from, storage } as never, anotado, upload, remove };
}

const evento = (attempts = 0): EventRow => ({
  id: "ev",
  organization_id: ORG,
  event_type: "contatos.acao_em_massa_requested",
  entity_kind: "crm_acao_em_massa",
  entity_id: ACAO,
  payload: { acao_id: ACAO },
  metadata: {},
  consumed_by: [],
  attempts,
});

const acao = (tipo: string, parametros: object = {}, extra: object = {}) => ({
  data: {
    id: ACAO,
    organization_id: ORG,
    user_id: USER,
    acao: tipo,
    parametros,
    status: "na_fila",
    total: 2,
    feitos: 0,
    falhas: 0,
    erros: [],
    ...extra,
  },
  error: null,
});

function deps(db: never, extra: Partial<Dependencias> = {}): Dependencias {
  return {
    db,
    agora: () => 0,
    criarNegocio: vi.fn(async () => ({})),
    mudarContato: vi.fn(async () => ({})),
    excluirContato: vi.fn(async () => ({ id: "x" })),
    ...extra,
  };
}

describe("processarAcaoEmMassa", () => {
  it("sem acao_id no evento: pula", async () => {
    const { db } = banco({});
    const r = await processarAcaoEmMassa({ ...evento(), payload: {} }, deps(db));
    expect(r.status).toBe("skipped");
  });

  it("ação já terminada: não faz nada", async () => {
    const { db, anotado } = banco({
      crm_acoes_em_massa: [acao("incluir_tag", { tag: "vip" }, { status: "concluida" })],
    });
    expect((await processarAcaoEmMassa(evento(), deps(db))).status).toBe("ok");
    expect(anotado).toHaveLength(0);
  });

  it("ação fora da fila (aguardando aprovação, recusada, em preparo): pula, sem escrever (Q4)", async () => {
    for (const status of ["aguardando_aprovacao", "recusada", "preparando"]) {
      const { db, anotado } = banco({ crm_acoes_em_massa: [acao("exportar", {}, { status })] });
      expect((await processarAcaoEmMassa(evento(), deps(db))).status).toBe("skipped");
      expect(anotado).toHaveLength(0);
    }
  });

  it("incluir tag: marca o lote antes de agir, pula quem já tem, grava as contagens e conclui", async () => {
    const { db, anotado } = banco({
      crm_acoes_em_massa: [acao("incluir_tag", { tag: "vip" })],
      crm_acoes_em_massa_itens: [
        { data: [{ contact_id: "c1" }, { contact_id: "c2" }], error: null },
        { data: [], error: null },
      ],
      contacts: [
        {
          data: [
            { id: "c1", tags: ["a"] },
            { id: "c2", tags: ["VIP"] },
          ],
          error: null,
        },
      ],
    });
    const d = deps(db);
    const ordem: string[] = [];
    d.mudarContato = vi.fn(async () => {
      ordem.push(`mudar:${anotado.filter((a) => a.tabela === "crm_acoes_em_massa_itens").length}`);
      return {};
    });
    expect((await processarAcaoEmMassa(evento(), d)).status).toBe("ok");
    expect(d.mudarContato).toHaveBeenCalledTimes(1);
    expect(d.mudarContato).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: ORG }),
      "c1",
      { tags: ["a", "vip"] },
    );
    expect(ordem).toEqual(["mudar:1"]);
    expect(anotado.at(-1)).toMatchObject({
      tabela: "crm_acoes_em_massa",
      corpo: { status: "concluida", feitos: 2, falhas: 0 },
    });
  });

  it("excluir: a trava da Agenda vira falha com motivo", async () => {
    const { db, anotado } = banco({
      crm_acoes_em_massa: [acao("excluir")],
      crm_acoes_em_massa_itens: [
        { data: [{ contact_id: "c1" }, { contact_id: "c2" }], error: null },
        { data: [], error: null },
      ],
      contacts: [
        {
          data: [
            { id: "c1", tags: [] },
            { id: "c2", tags: [] },
          ],
          error: null,
        },
      ],
    });
    const d = deps(db, {
      excluirContato: vi.fn(async (_ctx, id: string) => {
        if (id === "c2")
          throw new ApiError(409, "state_conflict", { vinculos: ["agenda"] }, "r", "bloqueado");
        return { id };
      }),
    });
    await processarAcaoEmMassa(evento(), d);
    expect(anotado.at(-1)?.corpo).toMatchObject({
      status: "concluida",
      feitos: 1,
      falhas: 1,
      erros: [{ contato: "c2", motivo: "Contato com compromisso na agenda não é excluído" }],
    });
  });

  it("criar negócios: pela rotina do original, com o nome do contato e sem follow-up de planilha", async () => {
    const { db } = banco({
      crm_acoes_em_massa: [
        acao("criar_negocios", {
          pipeline_id: "p1",
          stage_id: "s1",
          owner_user_id: USER,
          valor_centavos: 15000,
        }),
      ],
      crm_acoes_em_massa_itens: [
        { data: [{ contact_id: "c1" }], error: null },
        { data: [], error: null },
      ],
      contacts: [
        {
          data: [{ id: "c1", name: "Maria", display_name: null, phone_number: null, tags: [] }],
          error: null,
        },
      ],
    });
    const d = deps(db);
    await processarAcaoEmMassa(evento(), d);
    expect(d.criarNegocio).toHaveBeenCalledWith(
      expect.objectContaining({ actor: { type: "user", id: USER } }),
      expect.objectContaining({
        pipeline_id: "p1",
        stage_id: "s1",
        title: "Maria",
        contact_id: "c1",
        owner_user_id: USER,
        value_cents: 15000,
        via_planilha: true,
      }),
    );
  });

  it("estourou o orçamento: devolve retry e continua depois", async () => {
    const { db } = banco({
      crm_acoes_em_massa: [acao("remover_tag", { tag: "vip" })],
      crm_acoes_em_massa_itens: [{ data: [{ contact_id: "c1" }], error: null }],
      contacts: [{ data: [{ id: "c1", tags: ["vip"] }], error: null }],
    });
    let t = 0;
    const r = await processarAcaoEmMassa(evento(), deps(db, { agora: () => (t += ORCAMENTO_MS) }));
    expect(r.status).toBe("retry");
    expect(r.retry_at).toBeTruthy();
  });

  it("exportar: o CSV vai para o bucket privado, a ação guarda o caminho e vence em 24 h", async () => {
    const { db, anotado, upload } = banco({
      crm_acoes_em_massa: [acao("exportar"), { data: [], error: null }],
      organizations: [{ data: { timezone: "America/Sao_Paulo" }, error: null }],
      crm_acoes_em_massa_itens: [
        { data: [{ contact_id: "c1", posicao: 1 }], error: null },
        { data: [], error: null },
      ],
      contacts: [
        {
          data: [
            {
              id: "c1",
              name: "=1+1",
              display_name: null,
              email: "a@b.c",
              phone_number: "+5564999446816",
              tags: ["vip"],
              custom_fields: {},
              birthdate: null,
              source: "manual",
              created_at: "2026-10-17T15:00:00Z",
              last_activity_at: null,
            },
          ],
          error: null,
        },
      ],
    });
    await processarAcaoEmMassa(evento(), deps(db, { agora: () => Date.UTC(2026, 9, 17, 15) }));
    const [caminho, conteudo] = upload.mock.calls[0] as unknown as [string, Blob];
    expect(caminho).toBe(`${ORG}/${ACAO}/contatos-2026-10-17.csv`);
    expect(conteudo).toBeInstanceOf(Blob);
    expect(anotado.at(-1)?.corpo).toMatchObject({
      status: "concluida",
      arquivo: caminho,
      feitos: 1,
    });
  });
});

describe("o CSV dos contatos", () => {
  it("cabeçalho, telefone brasileiro, data no fuso e guarda de fórmula", () => {
    const linha = linhaDoCsv(
      {
        name: "=1+1",
        display_name: null,
        email: "a@b.c",
        phone_number: "+5564999446816",
        tags: ["vip", "frio"],
        custom_fields: {},
        birthdate: "1990-05-01",
        source: "manual",
        created_at: "2026-10-17T15:00:00Z",
        last_activity_at: null,
      },
      "America/Sao_Paulo",
    );
    expect(linha.slice(0, 2)).toEqual(["=1+1", "(64) 99944-6816"]);
    const csv = csvDeContatos([linha]);
    expect(csv.startsWith("﻿Nome,Telefone,E-mail,Instagram,Tags")).toBe(true);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("01/05/1990");
    expect(dataHoraBr("2026-10-17T15:00:00Z", "America/Sao_Paulo")).toBe("17/10/2026 12:00");
  });
});
