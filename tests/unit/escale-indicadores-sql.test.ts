import { describe, expect, it } from "vitest";

import type { CampoDinamico } from "@/lib/escale/indicadores/catalogo/campos-personalizados";
import { montarSql, type Contexto } from "@/lib/escale/indicadores/motor/sql";
import { perguntaSchema, type FiltroDoPainel } from "@/lib/escale/indicadores/pergunta";

const ORG = "11111111-1111-1111-1111-111111111111";
const USER = "22222222-2222-2222-2222-222222222222";
const ctx = (extra: Partial<Contexto> = {}): Contexto => ({
  orgId: ORG,
  fuso: "America/Sao_Paulo",
  agora: new Date("2026-10-27T02:30:00Z"),
  camposDaOrg: new Map(),
  ...extra,
});
const pergunta = (o: unknown) => perguntaSchema.parse(o);
const plano = (s: string) => s.replace(/\s+/g, " ").trim();

const EXEMPLO = {
  indicadores: ["negocio.ganhos", "negocio.soma_de_valores"],
  variaveis: ["negocio.origem"],
  tempo: { campo: "negocio.criado_em", granularidade: "mes", periodo: { atalho: "este_mes" } },
  filtro: { condicoes: [{ campo: "negocio.etapa", op: "diferente_de", valor: ["e1"] }] },
};

describe("montarSql", () => {
  it("gera a consulta do exemplo, byte a byte, com os valores na ordem de uso", () => {
    const r = montarSql(pergunta(EXEMPLO), { usuarios: [USER] }, ctx());
    expect(plano(r.text)).toBe(
      plano(`select b.pipeline_id as v0, p.name as v0_rotulo,
        to_char(date_trunc('month', (b.created_at at time zone $2)), 'YYYY-MM-DD"T"HH24:MI:SS') as t,
        count(*) filter (where b.status = 'won') as i0,
        sum(b.value_cents) / 100.0 as i1,
        count(distinct b.currency) as moedas
      from public.crm_leads b
      left join public.crm_pipelines p on p.id = b.pipeline_id and p.organization_id = b.organization_id
      where b.organization_id = $1
        and b.created_at >= ($3::date)::timestamp at time zone $2
        and b.created_at < ($4::date + 1)::timestamp at time zone $2
        and (b.stage_id::text is null or b.stage_id::text <> all($5::text[]))
        and b.owner_user_id = any($6::uuid[])
      group by 1, 2, 3
      order by t asc, i0 desc
      limit 1001`),
    );
    expect(r.values).toEqual([ORG, "America/Sao_Paulo", "2026-10-01", "2026-10-31", ["e1"], [USER]]);
    expect(r.temMoeda).toBe(true);
    expect(r.colunas.map((c) => c.chave)).toEqual(["v0", "v0_rotulo", "t", "i0", "i1", "moedas"]);
  });

  it("sem variáveis nem tempo não agrupa nem ordena", () => {
    const r = montarSql(pergunta({ indicadores: ["negocio.ganhos"] }), undefined, ctx());
    expect(r.text).not.toMatch(/group by|order by/);
    expect(r.text).not.toContain("count(distinct");
  });

  it("o join de grupo puxa o da origem; o lateral só entra quando uma medida precisa", () => {
    const g = montarSql(pergunta({ indicadores: ["negocio.ganhos"], variaveis: ["negocio.grupo_de_origem"] }), undefined, ctx());
    expect(g.text.indexOf("crm_pipelines p")).toBeLessThan(g.text.indexOf("crm_pipeline_groups g"));
    const sem = montarSql(pergunta({ indicadores: ["conversa.iniciadas"] }), undefined, ctx());
    expect(sem.text).not.toContain("lateral");
    const com = montarSql(pergunta({ indicadores: ["conversa.tempo_de_primeira_resposta"] }), undefined, ctx());
    expect(com.text).toContain("left join lateral (select min(m.sent_at)");
  });

  it("aplica a condição fixa do histórico e a granularidade", () => {
    const r = montarSql(
      pergunta({ indicadores: ["historico.mudancas_de_etapa"], tempo: { campo: "historico.mudou_em", granularidade: "semana", periodo: { atalho: "7_dias" } } }),
      undefined,
      ctx(),
    );
    expect(r.text).toContain("b.type = 'stage_changed'");
    expect(r.text).toContain("date_trunc('week'");
    const q = montarSql(
      pergunta({ indicadores: ["negocio.ganhos"], tempo: { campo: "negocio.criado_em", granularidade: "trimestre", periodo: { atalho: "tudo" } } }),
      undefined,
      ctx(),
    );
    expect(q.text).toContain("date_trunc('quarter'");
    expect(q.text).not.toContain("::date");
  });

  it("ignora o filtro do painel que o assunto não aceita", () => {
    const painel: FiltroDoPainel = { origens: [USER], usuarios: [USER] };
    const r = montarSql(pergunta({ indicadores: ["conversa.iniciadas"] }), painel, ctx());
    expect(r.ignorados).toEqual(["origens"]);
    expect(r.text).toContain("b.assigned_to_user_id = any(");
  });

  it("o período do painel vale, a não ser que o tempo do gráfico seja fixo", () => {
    const base = { indicadores: ["negocio.ganhos"], tempo: { campo: "negocio.criado_em", periodo: { atalho: "hoje" } } };
    const painel: FiltroDoPainel = { periodo: { atalho: "ontem" } };
    expect(montarSql(pergunta(base), painel, ctx()).values).toContain("2026-10-25");
    const fixo = { ...base, tempo: { ...base.tempo, fixo: true } };
    expect(montarSql(pergunta(fixo), painel, ctx()).values).toContain("2026-10-26");
  });

  it("gráfico sem tempo ignora o período do painel e avisa", () => {
    const r = montarSql(pergunta({ indicadores: ["negocio.ganhos"] }), { periodo: { atalho: "ontem" } }, ctx());
    expect(r.ignorados).toEqual(["periodo"]);
    expect(r.text).not.toContain("::date");
  });

  it("período do painel sobrepõe o do gráfico, e o fixo ganha do painel", () => {
    const base = { indicadores: ["negocio.ganhos"], tempo: { campo: "negocio.criado_em", periodo: { atalho: "mes_passado" } } };
    const painel: FiltroDoPainel = { periodo: { atalho: "este_mes" } };
    expect(montarSql(pergunta(base), painel, ctx()).values).toEqual(expect.arrayContaining(["2026-10-01", "2026-10-31"]));
    const fixo = { ...base, tempo: { ...base.tempo, fixo: true } };
    expect(montarSql(pergunta(fixo), painel, ctx()).values).toEqual(expect.arrayContaining(["2026-09-01", "2026-09-30"]));
  });

  it("hora com o período do painel acima de 31 dias vira dia e avisa", () => {
    const hora = { indicadores: ["negocio.ganhos"], tempo: { campo: "negocio.criado_em", granularidade: "hora", periodo: { atalho: "hoje" } } };
    const r = montarSql(pergunta(hora), { periodo: { atalho: "este_ano" } }, ctx());
    expect(r.text).toContain("date_trunc('day'");
    expect(r.granularidadeAjustada).toBe(true);
    expect(montarSql(pergunta(hora), undefined, ctx()).granularidadeAjustada).toBe(false);
  });

  it("tags do painel usam fn_escale_tags_passam sobre a coluna do assunto", () => {
    const tags = { combinar: "ou" as const, grupos: [{ modo: "e" as const, condicoes: [{ op: "possui" as const, tag: "VIP" }] }] };
    const r = montarSql(pergunta({ indicadores: ["negocio.ganhos"] }), { tags }, ctx());
    expect(r.text).toContain("public.fn_escale_tags_passam(b.tags, $3::jsonb)");
    expect(JSON.parse(String(r.values[2])).grupos[0].condicoes[0].tag).toBe("vip");
  });

  describe("filtro fixo do gráfico (7F)", () => {
    const U2 = "33333333-3333-4333-8333-333333333333";
    const U1 = "22222222-2222-4222-8222-222222222222";
    it("aplica usuários depois das condições e antes do filtro do painel, com `and`", () => {
      const p = pergunta({ indicadores: ["negocio.ganhos"], filtroFixo: { usuarios: [U1] } });
      const so = montarSql(p, undefined, ctx());
      expect(plano(so.text)).toContain("b.owner_user_id = any($3::uuid[])");
      expect(so.values[2]).toEqual([U1]);
      const dois = montarSql(p, { usuarios: [U2] }, ctx());
      expect(plano(dois.text)).toContain("b.owner_user_id = any($3::uuid[]) and b.owner_user_id = any($4::uuid[])");
      expect(dois.values.slice(2)).toEqual([[U1], [U2]]);
    });
    it("chave que o assunto não aceita é ignorada e volta como fixo:<chave>", () => {
      const r = montarSql(pergunta({ indicadores: ["conversa.iniciadas"], filtroFixo: { origens: [U1] } }), undefined, ctx());
      expect(r.ignorados).toContain("fixo:origens");
      expect(r.text).not.toContain("any($3::uuid[])");
    });
    it("tags usam fn_escale_tags_passam com o JSON em values", () => {
      const tags = { combinar: "ou" as const, grupos: [{ modo: "e" as const, condicoes: [{ op: "possui" as const, tag: "VIP" }] }] };
      const r = montarSql(pergunta({ indicadores: ["negocio.ganhos"], filtroFixo: { tags } }), undefined, ctx());
      expect(r.text).toContain("public.fn_escale_tags_passam(b.tags, $3::jsonb)");
    });
    it("injeção em tags[].tag nunca chega ao texto do SQL", () => {
      const tag = "x'); drop table crm_leads; --";
      const tags = { combinar: "ou" as const, grupos: [{ modo: "e" as const, condicoes: [{ op: "possui" as const, tag }] }] };
      const r = montarSql(pergunta({ indicadores: ["negocio.ganhos"], filtroFixo: { tags } }), undefined, ctx());
      expect(r.text).not.toContain("drop table");
      expect(JSON.stringify(r.values)).toContain("drop table");
    });
  });

  it("campos do painel: fixo por coluna, personalizado com a chave em parâmetro", () => {
    const campos = {
      combinar: "e" as const,
      grupos: [
        {
          modo: "e" as const,
          condicoes: [
            { alvo: "contato" as const, chave: "email", tipo: "texto" as const, op: "contem" as const, valor: "@x" },
            { alvo: "contato" as const, chave: "cargo", tipo: "texto" as const, op: "igual" as const, valor: "dono" },
            { alvo: "negocio" as const, chave: "valor", tipo: "numero" as const, op: "maior" as const, valor: "10" },
          ],
        },
      ],
    };
    const r = montarSql(pergunta({ indicadores: ["negocio.ganhos"] }), { campos }, ctx());
    expect(r.text).toContain("fn_escale_passa_condicao(to_jsonb(c.email), ");
    expect(r.text).toContain("(c.custom_fields -> $");
    expect(r.text).toContain("to_jsonb(b.value_cents / 100.0)");
    expect(r.text).not.toContain("cargo");
    expect(r.values).toContain("cargo");
    expect(r.text).toContain("left join public.contacts c");
  });

  it("campo de empresa num assunto sem empresa é ignorado", () => {
    const campos = {
      combinar: "e" as const,
      grupos: [{ modo: "e" as const, condicoes: [{ alvo: "empresa" as const, chave: "cidade", tipo: "texto" as const, op: "igual" as const, valor: "SP" }] }],
    };
    const r = montarSql(pergunta({ indicadores: ["negocio.ganhos"] }), { campos }, ctx());
    expect(r.ignorados).toContain("campos");
  });

  it("o nome do indicador leva o assunto, como a legenda da Clint", () => {
    const r = montarSql(pergunta({ indicadores: ["negocio.quantidade"] }), undefined, ctx());
    expect(r.colunas.find((c) => c.papel === "indicador")?.nome).toBe("Negócio Quantidade");
  });

  it("campo personalizado usa a chave como parâmetro", () => {
    const campo: CampoDinamico = { id: "campo:negocio:valor_do_imovel", nome: "Valor do imóvel", objeto: "negocio", chave: "valor_do_imovel", tipo: "texto" };
    const r = montarSql(
      pergunta({ indicadores: ["negocio.ganhos"], variaveis: ["campo:negocio:valor_do_imovel"] }),
      undefined,
      ctx({ camposDaOrg: new Map([[campo.id, campo]]) }),
    );
    expect(r.text).toContain("(b.custom_fields ->> $3) as v0");
    expect(r.values[2]).toBe("valor_do_imovel");
  });

  it("não deixa texto do cliente entrar no SQL (injeção)", () => {
    const veneno = "'; drop table crm_leads; --";
    const r = montarSql(
      pergunta({
        indicadores: ["negocio.ganhos"],
        filtro: {
          modo: "qualquer",
          condicoes: [
            { campo: "negocio.titulo", op: "igual_a", valor: veneno },
            { campo: "negocio.titulo", op: "contem", valor: veneno },
          ],
        },
      }),
      { tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: veneno }] }] } },
      ctx(),
    );
    expect(r.text.toLowerCase()).not.toContain("drop");
    expect(r.values.flat()).toContain(veneno);
    expect(() => montarSql(pergunta({ indicadores: ["negocio.nao_existe"] }), undefined, ctx())).toThrow();
  });

  it("respeita ordem e limite pedidos", () => {
    const r = montarSql(
      pergunta({ indicadores: ["negocio.ganhos"], variaveis: ["negocio.dono"], ordem: { por: "negocio.dono", direcao: "asc" }, limite: 5 }),
      undefined,
      ctx(),
    );
    expect(r.text).toContain("order by v0 asc limit 6");
  });
});

describe("joins das condições", () => {
  it("filtrar pelo grupo de origem junta a origem, mas filtrar por etapa não junta a etapa", () => {
    const grupo = montarSql(
      pergunta({ indicadores: ["negocio.ganhos"], filtro: { condicoes: [{ campo: "negocio.grupo_de_origem", op: "igual_a", valor: "g" }] } }),
      undefined,
      ctx(),
    );
    expect(grupo.text).toContain("crm_pipelines p");
    expect(grupo.text).not.toContain("crm_pipeline_groups g");
  });
});

describe("ordem natural da etapa (fase 7D)", () => {
  const base = { indicadores: ["negocio.quantidade"], variaveis: ["negocio.etapa"] };
  it("sem ordem, a etapa sai na ordem do quadro", () => {
    expect(plano(montarSql(pergunta(base), undefined, ctx()).text)).toContain("order by min(s.position) asc nulls last, i0 desc");
  });
  it("com tempo, o tempo vem antes", () => {
    const comTempo = { ...base, tempo: { campo: "negocio.criado_em", granularidade: "dia", periodo: { atalho: "este_mes" } } };
    expect(plano(montarSql(pergunta(comTempo), undefined, ctx()).text)).toContain("order by t asc, min(s.position) asc nulls last, i0 desc");
  });
  it("com ordem pedida, vale a ordem pedida", () => {
    const sql = plano(montarSql(pergunta({ ...base, ordem: { por: "negocio.quantidade", direcao: "asc" } }), undefined, ctx()).text);
    expect(sql).toContain("order by i0 asc");
    expect(sql).not.toContain("min(s.position)");
  });
  it("variável sem ordem natural (origem) segue a 7A", () => {
    const sql = plano(montarSql(pergunta({ ...base, variaveis: ["negocio.origem"] }), undefined, ctx()).text);
    expect(sql).toContain("order by i0 desc");
  });
});
