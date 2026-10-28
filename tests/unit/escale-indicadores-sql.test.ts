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
        date_trunc('month', (b.created_at at time zone $2)) as t,
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
    expect(r.values).toEqual([ORG, "America/Sao_Paulo", "2026-10-01", "2026-10-26", ["e1"], [USER]]);
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
      { tags: { modo: "lista", valores: [veneno], operador: "ou" } },
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
