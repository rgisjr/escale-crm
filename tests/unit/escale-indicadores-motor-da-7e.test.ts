import type pg from "pg";
import { describe, expect, it, vi } from "vitest";

import { sqlDoCalculado, unidadeDoCalculado } from "@/lib/escale/indicadores/motor/calculados";
import { montarSqlDoDetalhamento } from "@/lib/escale/indicadores/motor/detalhamento";
import { detalhar, detalharParaCsv, consultar, type Sessao } from "@/lib/escale/indicadores/motor/executar";
import { montarSql, type Contexto } from "@/lib/escale/indicadores/motor/sql";
import { detalhamentoParaCsvSchema, detalhamentoSchema, perguntaSchema } from "@/lib/escale/indicadores/pergunta";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const ORG = "11111111-1111-1111-1111-111111111111";
const ctx = (): Contexto => ({
  orgId: ORG,
  fuso: "America/Sao_Paulo",
  agora: new Date("2026-10-27T02:30:00Z"),
  camposDaOrg: new Map(),
});
const pergunta = (o: unknown) => perguntaSchema.parse(o);
const plano = (s: string) => s.replace(/\s+/g, " ").trim();
const TICKET = { id: "calc:ticket", nome: "Ticket", a: "negocio.soma_de_valores", op: "divisao", b: "negocio.ganhos", formato: "moeda" } as const;
const TEMPO = { campo: "negocio.criado_em", granularidade: "dia", periodo: { atalho: "este_mes" } };

describe("calculados", () => {
  const sql = (id: string) => (id === "a" ? "sum(x)" : "count(*)");
  it("escreve as quatro operações", () => {
    const c = { id: "calc:x", nome: "n", a: "a", b: "b", formato: "numero" } as never;
    expect(sqlDoCalculado({ ...(c as object), op: "soma" } as never, sql)).toBe("((sum(x)) + (count(*)))");
    expect(sqlDoCalculado({ ...(c as object), op: "subtracao" } as never, sql)).toBe("((sum(x)) - (count(*)))");
    expect(sqlDoCalculado({ ...(c as object), op: "multiplicacao" } as never, sql)).toBe("((sum(x)) * (count(*)))");
    expect(sqlDoCalculado({ ...(c as object), op: "divisao" } as never, sql)).toBe("((sum(x)) / nullif((count(*)), 0))");
    expect(sqlDoCalculado({ ...(c as object), op: "divisao", formato: "percentual" } as never, sql)).toBe(
      "(100.0 * (sum(x)) / nullif((count(*)), 0))",
    );
  });
  it("a unidade segue o formato", () => {
    expect(unidadeDoCalculado(TICKET)).toBe("valor");
    expect(unidadeDoCalculado({ ...TICKET, formato: "percentual" })).toBe("percentual");
    expect(unidadeDoCalculado({ ...TICKET, formato: "numero" })).toBe("contagem");
  });
});

describe("montarSql com recursos da 7E", () => {
  it("calculado vira a coluna c0 e o operando fora da tela não vira coluna", () => {
    const r = montarSql(pergunta({ indicadores: ["negocio.ganhos"], calculados: [TICKET] }), undefined, ctx());
    expect(r.text).toContain("((sum(b.value_cents) / 100.0) / nullif((count(*) filter (where b.status = 'won')), 0)) as c0");
    expect(r.text).not.toContain(" as i1");
    expect(r.colunas.find((c) => c.chave === "c0")).toMatchObject({ unidade: "valor", calculado: true, nome: "Ticket" });
    expect(r.temMoeda).toBe(true);
  });

  it("o nome do calculado nunca entra no SQL", () => {
    const r = montarSql(
      pergunta({ indicadores: ["negocio.ganhos"], calculados: [{ ...TICKET, nome: "x'); drop table crm_leads; --" }] }),
      undefined,
      ctx(),
    );
    expect(r.text).not.toContain("drop table");
  });

  it("having com maior_que, diferente_de e calculado, depois do group by", () => {
    const r = montarSql(
      pergunta({
        indicadores: ["negocio.ganhos"],
        variaveis: ["negocio.origem"],
        calculados: [TICKET],
        filtroQuantitativo: [
          { indicador: "negocio.ganhos", op: "maior_que", valor: 10 },
          { indicador: "negocio.ganhos", op: "diferente_de", valor: 3 },
          { indicador: "calc:ticket", op: "menor_ou_igual_a", valor: 99 },
        ],
      }),
      undefined,
      ctx(),
    );
    const t = plano(r.text);
    expect(t).toContain("group by 1, 2 having count(*) filter (where b.status = 'won') > $3::numeric");
    expect(t).toContain("and coalesce(count(*) filter (where b.status = 'won'), 0) <> $4::numeric");
    expect(t).toContain("and ((sum(b.value_cents) / 100.0) / nullif((count(*) filter (where b.status = 'won')), 0)) <= $5::numeric");
    expect(r.values.slice(2)).toEqual([10, 3, 99]);
  });

  it("sem group by, o having vem depois do where", () => {
    const r = montarSql(
      pergunta({ indicadores: ["negocio.ganhos"], filtroQuantitativo: [{ indicador: "negocio.ganhos", op: "maior_que", valor: 1 }] }),
      undefined,
      ctx(),
    );
    expect(plano(r.text)).toMatch(/where b\.organization_id = \$1 having count/);
  });

  it("ordena por calculado", () => {
    const r = montarSql(
      pergunta({ indicadores: ["negocio.ganhos"], variaveis: ["negocio.origem"], calculados: [TICKET], ordem: { por: "calc:ticket", direcao: "desc" } }),
      undefined,
      ctx(),
    );
    expect(r.text).toContain("order by c0 desc");
  });

  it("matriz dia × hora troca o bucket por isodow e hora", () => {
    const r = montarSql(
      pergunta({ indicadores: ["mensagem.total"], tempo: { campo: "mensagem.enviada_em", periodo: { atalho: "este_mes" } }, matrizDeTempo: true }),
      undefined,
      ctx(),
    );
    expect(r.text).toContain("extract(isodow from");
    expect(r.text).toContain(")::int as dsem");
    expect(r.text).toContain("as hora");
    expect(r.text).not.toContain("date_trunc");
    expect(plano(r.text)).toMatch(/group by 1, 2 order by 1, 2 limit 169$/);
    expect(r.colunas.map((c) => c.chave)).toEqual(["dsem", "hora", "i0"]);
  });

  it("comparação gera dois ramos com datas próprias e a coluna periodo fora das colunas de tela", () => {
    const r = montarSql(
      pergunta({ indicadores: ["negocio.ganhos"], tempo: TEMPO, comparacao: { modo: "equivalente" } }),
      undefined,
      ctx(),
    );
    expect(plano(r.text)).toBe(
      plano(`(select 'atual'::text as periodo, to_char(date_trunc('day', (b.created_at at time zone $2)), 'YYYY-MM-DD"T"HH24:MI:SS') as t,
          count(*) filter (where b.status = 'won') as i0
        from public.crm_leads b
        where b.organization_id = $1 and b.created_at >= ($3::date)::timestamp at time zone $2
          and b.created_at < ($4::date + 1)::timestamp at time zone $2
        group by 1, 2 order by t asc, i0 desc limit 1001)
      union all
      (select 'anterior'::text as periodo, to_char(date_trunc('day', (b.created_at at time zone $2)), 'YYYY-MM-DD"T"HH24:MI:SS') as t,
          count(*) filter (where b.status = 'won') as i0
        from public.crm_leads b
        where b.organization_id = $1 and b.created_at >= ($5::date)::timestamp at time zone $2
          and b.created_at < ($6::date + 1)::timestamp at time zone $2
        group by 1, 2 order by t asc, i0 desc limit 1001)`),
    );
    expect(r.values).toEqual([ORG, "America/Sao_Paulo", "2026-10-01", "2026-10-31", "2026-08-31", "2026-09-30"]);
    expect(r.comparacao).toBe(true);
    expect(r.periodo).toEqual({ de: "2026-10-01", ate: "2026-10-31" });
  });

  it("comparação com filtro repete os parâmetros do filtro em cada ramo", () => {
    const r = montarSql(
      pergunta({
        indicadores: ["negocio.ganhos"],
        tempo: TEMPO,
        comparacao: { modo: "mes_anterior" },
        filtro: { condicoes: [{ campo: "negocio.etapa", op: "diferente_de", valor: ["e1"] }] },
      }),
      undefined,
      ctx(),
    );
    expect(r.values).toEqual([ORG, "America/Sao_Paulo", "2026-10-01", "2026-10-31", ["e1"], "2026-09-01", "2026-09-30", ["e1"]]);
  });

  it("comparação sem período (tudo) roda sem union all e avisa", () => {
    const r = montarSql(
      pergunta({ indicadores: ["negocio.ganhos"], tempo: { ...TEMPO, periodo: { atalho: "tudo" } }, comparacao: { modo: "equivalente" } }),
      undefined,
      ctx(),
    );
    expect(r.text).not.toContain("union all");
    expect(r.comparacao).toBe(false);
    expect(r.comparacaoSemPeriodo).toBe(true);
  });
});

describe("montarSqlDoDetalhamento", () => {
  const pedido = (o: Record<string, unknown> = {}) =>
    detalhamentoSchema.parse({
      pergunta: { indicadores: ["negocio.ganhos"], variaveis: ["negocio.origem"], tempo: TEMPO },
      indicador: "negocio.ganhos",
      ponto: { variaveis: [{ id: "negocio.origem", valor: "p1" }] },
      ...o,
    });

  it("página 2 de 10 do ponto, com predicado, CTE de 10.001 e count(*) over()", () => {
    const r = montarSqlDoDetalhamento(pedido({ pagina: 2, ordem: { coluna: "valor", direcao: "desc" } }), ctx());
    const t = plano(r.text);
    expect(t).toMatch(/^with base as \(select b\.id as k0, .* from public\.crm_leads b /);
    expect(t).toContain("b.value_cents / 100.0 as k7");
    expect(t).toContain("(b.status = 'won')");
    expect(t).toContain("b.pipeline_id::text = $5");
    expect(t).toContain("order by k7 desc nulls last, b.id asc limit 10001)");
    expect(t).toMatch(/select \*, count\(\*\) over\(\) as total from base offset \$6 limit \$7$/);
    expect(r.values).toEqual([ORG, "America/Sao_Paulo", "2026-10-01", "2026-10-31", "p1", 10, 10]);
    expect(r.colunas[7]).toMatchObject({ chave: "valor", formato: "valor" });
  });

  it("ponto nulo vira is null; ponto de tempo e de heatmap viram igualdades parametrizadas", () => {
    const nulo = montarSqlDoDetalhamento(pedido({ ponto: { variaveis: [{ id: "negocio.origem", valor: null }], t: "2026-10-05T00:00:00" } }), ctx());
    expect(nulo.text).toContain("b.pipeline_id is null");
    expect(nulo.text).toContain("date_trunc('day', (b.created_at at time zone $2)) = $5::timestamp");
    const heat = montarSqlDoDetalhamento(
      detalhamentoSchema.parse({
        pergunta: { indicadores: ["mensagem.total"], tempo: { campo: "mensagem.enviada_em", periodo: { atalho: "este_mes" } }, matrizDeTempo: true },
        indicador: "mensagem.total",
        ponto: { diaDaSemana: 2, hora: 14 },
      }),
      ctx(),
    );
    expect(heat.text).toContain("extract(isodow from (b.sent_at at time zone $2))::int = $5::int");
    expect(heat.text).toContain("extract(hour from (b.sent_at at time zone $2))::int = $6::int");
  });

  it("dimensão multivalorada mantém o join e compara a tag", () => {
    const r = montarSqlDoDetalhamento(
      detalhamentoSchema.parse({
        pergunta: { indicadores: ["negocio.ganhos"], variaveis: ["negocio.tag"] },
        indicador: "negocio.ganhos",
        ponto: { variaveis: [{ id: "negocio.tag", valor: "vip" }] },
      }),
      ctx(),
    );
    expect(r.text).toContain("left join lateral unnest(b.tags) tg(tag) on true");
    expect(r.text).toContain("tg.tag::text = $3");
  });

  it("colunas pedidas, campo personalizado em $n e CSV com 20.001 e sem offset", () => {
    const campos = new Map([["campo:negocio:plano", { id: "campo:negocio:plano", nome: "Plano", objeto: "negocio", chave: "plano", tipo: "texto" } as never]]);
    const r = montarSqlDoDetalhamento(
      detalhamentoParaCsvSchema.parse({
        pergunta: { indicadores: ["negocio.ganhos"] },
        indicador: "negocio.ganhos",
        colunas: ["valor", "campo:negocio:plano"],
      }),
      { ...ctx(), camposDaOrg: campos },
      "csv",
    );
    expect(r.colunas.map((c) => c.chave)).toEqual(["valor", "campo:negocio:plano"]);
    expect(r.text).toContain("b.value_cents / 100.0 as k0");
    expect(r.text).toContain("limit 20001");
    expect(r.text).not.toContain("offset");
    expect(r.values).toContain("plano");
  });

  it("calculado usa os predicados de A e B unidos por or", () => {
    const r = montarSqlDoDetalhamento(
      detalhamentoSchema.parse({
        pergunta: {
          indicadores: ["negocio.ganhos"],
          calculados: [{ id: "calc:x", nome: "x", a: "negocio.ganhos", op: "divisao", b: "negocio.perdidos", formato: "percentual" }],
        },
        indicador: "calc:x",
      }),
      ctx(),
    );
    expect(r.text).toContain("((b.status = 'won') or (b.status = 'lost'))");
  });

  it("não deixa texto do cliente entrar no SQL", () => {
    const mau = "x'; drop table crm_leads; --";
    const r = montarSqlDoDetalhamento(
      pedido({ ponto: { variaveis: [{ id: "negocio.origem", valor: mau }], t: "2026-10-05T00:00:00" } }),
      ctx(),
    );
    expect(r.text).not.toContain("drop table");
    expect(r.values).toContain(mau);
  });
});

function poolFalso(rows: unknown[][]) {
  const chamadas: string[] = [];
  const cliente = {
    query: vi.fn(async (q: string | { text: string }) => {
      const texto = typeof q === "string" ? q : q.text;
      chamadas.push(texto);
      return { rows: /^(\(select|select \*|with|select count|select b)/.test(texto) && !texto.startsWith("select set_config") ? rows : [] };
    }),
    release: vi.fn(),
  };
  return { pool: { connect: vi.fn(async () => cliente) } as unknown as pg.Pool, chamadas, cliente };
}
const SESSAO: Sessao = { orgId: ORG, userId: "u1", fuso: "America/Sao_Paulo" };

describe("executor da 7E", () => {
  it("consultar separa os ramos atual e anterior e devolve o período", async () => {
    const { pool } = poolFalso([
      ["atual", "2026-10-01T00:00:00", 3],
      ["atual", "2026-10-02T00:00:00", 4],
      ["anterior", "2026-09-01T00:00:00", 1],
    ]);
    const r = await consultar(pool, SESSAO, pergunta({ indicadores: ["negocio.ganhos"], tempo: TEMPO, comparacao: { modo: "mes_anterior" } }), undefined, {
      agora: () => new Date("2026-10-15T15:00:00Z"),
    });
    expect(r.colunas.map((c) => c.chave)).toEqual(["t", "i0"]);
    expect(r.linhas).toHaveLength(2);
    expect(r.comparacao?.linhas).toEqual([{ t: "2026-09-01T00:00:00", i0: 1 }]);
    expect(r.comparacao?.periodo).toEqual({ de: "2026-09-01", ate: "2026-09-30" });
    expect(r.periodo).toEqual({ de: "2026-10-01", ate: "2026-10-31", hoje: "2026-10-15" });
  });

  it("detalhar roda a sequência da sessão, lê o total e marca o teto", async () => {
    const { pool, chamadas } = poolFalso([["id1", "t", "c", "u", "o", "e", "won", 10, "BRL", "d1", "d2", null, 10001]]);
    const r = await detalhar(pool, SESSAO, detalhamentoSchema.parse({ pergunta: { indicadores: ["negocio.ganhos"] }, indicador: "negocio.ganhos" }));
    expect(chamadas.map((c) => c.split(" ").slice(0, 3).join(" "))[0]).toBe("begin read only");
    expect(chamadas.at(-1)).toBe("rollback");
    expect(r.total).toBe(10001);
    expect(r.teto).toBe(true);
    expect(r.linhas[0]).toMatchObject({ id: "id1", valor: 10 });
  });

  it("detalhar sem linhas devolve total 0", async () => {
    const { pool } = poolFalso([]);
    const r = await detalhar(pool, SESSAO, detalhamentoSchema.parse({ pergunta: { indicadores: ["negocio.ganhos"] }, indicador: "negocio.ganhos" }));
    expect(r.total).toBe(0);
    expect(r.teto).toBe(false);
  });

  it("detalharParaCsv entrega uma linha por vez e marca o truncamento", async () => {
    const linhas = Array.from({ length: 20001 }, (_, i) => [`id${i}`]);
    const { pool } = poolFalso(linhas);
    const recebidas: Record<string, unknown>[] = [];
    const r = await detalharParaCsv(
      pool,
      SESSAO,
      { pergunta: pergunta({ indicadores: ["negocio.ganhos"] }), indicador: "negocio.ganhos", ponto: { variaveis: [] }, colunas: ["id"] },
      (l) => recebidas.push(l),
    );
    expect(r.linhas).toBe(20000);
    expect(r.truncado).toBe(true);
    expect(recebidas).toHaveLength(20000);
  });
});
