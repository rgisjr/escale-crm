import { beforeAll, describe, expect, it } from "vitest";

import { CATALOGO } from "@/lib/escale/indicadores/catalogo";
import type { Assunto } from "@/lib/escale/indicadores/catalogo/tipos";
import { montarSql } from "@/lib/escale/indicadores/motor/sql";
import { perguntaSchema, type FiltroDoPainel } from "@/lib/escale/indicadores/pergunta";

import { inlinar } from "../helpers/sql-com-parametros";
import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_CONTACT_PROBE,
  GOV_MANAGER,
  GOV_ORG,
  GOV_SESSION,
  GOV_VIEWER,
  countAs,
  indexExists,
  seedGov,
  sql,
  tableExists,
  writeCountAs,
} from "./gov-helpers";

/**
 * PAINÉIS E GRÁFICOS DE INDICADORES (fork Escale, migration 9601) — prova contra Postgres real:
 * tabelas e índices, visibilidade por papel e por usuário (RLS), limite de 30 gráficos, o SQL de
 * TODO fragmento do catálogo contra o esquema, e o tradutor rodando como cada papel, com paridade
 * com `fn_attendant_metrics` (a página Desempenho). Roda via `pnpm test:db`.
 */
const P_ABERTO = "e5ca1e00-9601-4000-8000-0000000000a1";
const P_AGENTE_A = "e5ca1e00-9601-4000-8000-0000000000a2";
const P_GERENTES = "e5ca1e00-9601-4000-8000-0000000000a3";
const P_LIMITE = "e5ca1e00-9601-4000-8000-0000000000a4";
const CONV_A = "e5ca1e00-9601-4000-8000-0000000000c1";
const FUSO = "America/Sao_Paulo";
const AGORA = new Date();

const PERGUNTA_MINIMA = '{"indicadores":["negocio.ganhos"]}';
const comoPapel = (userId: string, consulta: string): string[] =>
  sql(
    `set role authenticated; select set_config('request.jwt.claims', '{"sub":"${userId}"}', false); ${consulta}`,
  )
    .split("\n")
    .filter((linha) => linha.includes("|"));

function rodarPergunta(userId: string, pergunta: unknown, painel?: FiltroDoPainel): string[] {
  const montado = montarSql(perguntaSchema.parse(pergunta), painel, {
    orgId: GOV_ORG,
    fuso: FUSO,
    agora: AGORA,
    camposDaOrg: new Map(),
  });
  return comoPapel(userId, `${inlinar(montado.text, montado.values)};`);
}

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_graficos where painel_id::text like 'e5ca1e00-9601-%';
    delete from public.crm_paineis where id::text like 'e5ca1e00-9601-%';
    insert into public.crm_paineis (id, organization_id, nome, permissoes_usuarios, permissoes_papeis) values
      ('${P_ABERTO}', '${GOV_ORG}', 'Aberto', '{}', '{}'),
      ('${P_AGENTE_A}', '${GOV_ORG}', 'Só o agente A', '{${GOV_AGENT_A}}', '{}'),
      ('${P_GERENTES}', '${GOV_ORG}', 'Gerentes', '{}', '{manager}'),
      ('${P_LIMITE}', '${GOV_ORG}', 'Limite', '{}', '{}');
    insert into public.crm_graficos (organization_id, painel_id, nome, pergunta)
      values ('${GOV_ORG}', '${P_AGENTE_A}', 'G1', '${PERGUNTA_MINIMA}');
  `);
});

describe("tabelas e índices", () => {
  it("existem", () => {
    expect(tableExists("crm_paineis")).toBe(true);
    expect(tableExists("crm_graficos")).toBe(true);
    for (const indice of [
      "idx_crm_paineis_org_vivos",
      "idx_crm_graficos_painel_vivos",
      "idx_escale_ind_leads_org_criado",
      "idx_escale_ind_conversas_org_criada",
      "idx_escale_ind_ligacoes_org_inicio",
    ]) {
      expect(indexExists(indice), indice).toBe(true);
    }
  });

  it("anon não executa a função de visibilidade", () => {
    expect(
      sql(`select has_function_privilege('anon', 'public.fn_escale_pode_ver_painel(uuid,uuid[],text[])', 'execute');`),
    ).toBe("f");
  });
});

describe("visibilidade dos painéis", () => {
  const ver = (id: string) => `select count(*) from public.crm_paineis where id = '${id}'`;

  it("painel aberto: gerente e agente veem; viewer não", () => {
    expect(countAs(GOV_MANAGER, ver(P_ABERTO))).toBe(1);
    expect(countAs(GOV_AGENT_A, ver(P_ABERTO))).toBe(1);
    expect(countAs(GOV_VIEWER, ver(P_ABERTO))).toBe(0);
  });

  it("painel de um usuário: o outro agente não vê, o admin vê", () => {
    expect(countAs(GOV_AGENT_A, ver(P_AGENTE_A))).toBe(1);
    expect(countAs(GOV_AGENT_B, ver(P_AGENTE_A))).toBe(0);
    expect(countAs(GOV_ADMIN, ver(P_AGENTE_A))).toBe(1);
  });

  it("painel por papel: só o papel listado (e o admin)", () => {
    expect(countAs(GOV_MANAGER, ver(P_GERENTES))).toBe(1);
    expect(countAs(GOV_AGENT_A, ver(P_GERENTES))).toBe(0);
    expect(countAs(GOV_ADMIN, ver(P_GERENTES))).toBe(1);
  });

  it("agente não cria painel; gerente cria", () => {
    const novo = `insert into public.crm_paineis (organization_id, nome) values ('${GOV_ORG}', 'Novo')`;
    expect(writeCountAs(GOV_AGENT_A, novo)).toBe(0);
    expect(writeCountAs(GOV_MANAGER, novo)).toBe(1);
  });

  it("gráfico de painel invisível é invisível", () => {
    const grafico = "select count(*) from public.crm_graficos where painel_id = ";
    expect(countAs(GOV_AGENT_A, `${grafico}'${P_AGENTE_A}'`)).toBe(1);
    expect(countAs(GOV_AGENT_B, `${grafico}'${P_AGENTE_A}'`)).toBe(0);
  });

  it("o 31º gráfico de um painel é recusado", () => {
    sql(`
      insert into public.crm_graficos (organization_id, painel_id, nome, pergunta)
      select '${GOV_ORG}', '${P_LIMITE}', 'G'||g, '${PERGUNTA_MINIMA}' from generate_series(1,30) g;
    `);
    expect(() =>
      sql(`insert into public.crm_graficos (organization_id, painel_id, nome, pergunta)
           values ('${GOV_ORG}', '${P_LIMITE}', 'G31', '${PERGUNTA_MINIMA}');`),
    ).toThrow(/limite_de_graficos/);
  });
});

/** Um `explain` por fragmento, num DO que junta as falhas: um esquema errado aponta todos de uma vez. */
function validarNoEsquema(itens: readonly { rotulo: string; sql: string }[]): void {
  const blocos = itens.map(
    (i) => `begin execute $qq$explain ${i.sql}$qq$; exception when others then falhas := falhas || $qr$${i.rotulo}: $qr$ || sqlerrm || E'\\n'; end;`,
  );
  const script = `do $chk$ declare falhas text := ''; begin ${blocos.join("\n")}
    if falhas <> '' then raise exception E'%', falhas; end if; end $chk$;`;
  try {
    sql(script);
  } catch (erro) {
    throw new Error((erro as { stderr?: string }).stderr ?? String(erro));
  }
}

function itensDoAssunto(a: Assunto) {
  const ctx = { orgId: GOV_ORG, fuso: FUSO, agora: AGORA, camposDaOrg: new Map() };
  const montar = (rotulo: string, pergunta: unknown) => {
    const m = montarSql(perguntaSchema.parse(pergunta), undefined, ctx);
    return { rotulo, sql: inlinar(m.text, m.values) };
  };
  const primeira = a.medidas[0]!.id;
  const itens = [
    ...a.medidas.map((m) => montar(m.id, { indicadores: [m.id] })),
    ...a.dimensoes.map((d) => montar(d.id, { indicadores: [primeira], variaveis: [d.id], filtro: { condicoes: [{ campo: d.id, op: "vazio" }] } })),
    ...a.tempos.map((t) =>
      montar(t.id, { indicadores: [primeira], tempo: { campo: t.id, granularidade: "dia", periodo: { atalho: "este_ano" } } }),
    ),
  ];
  // Detalhamento, filtros do painel e campos personalizados: todos os joins e todas as expressões de uma vez.
  const joins = Object.values(a.joins).map((j) => j.sql);
  const expressoes = [
    ...a.colunasDoDetalhamento.map((c) => c.sql),
    ...Object.values(a.filtroDoPainel).map((f) => f!.sql),
    ...Object.values(a.camposPersonalizados).map((f) => f!.sql),
  ].map((e) => e.replaceAll("$fuso", `'${FUSO}'`));
  itens.push({
    rotulo: `${a.id}.detalhamento`,
    sql: `select ${expressoes.join(", ")} from ${a.base.tabela} ${a.base.alias} ${joins.join(" ")} limit 0`,
  });
  return itens;
}

describe("o catálogo contra o esquema real", () => {
  it.each(CATALOGO.map((a) => [a.id, a] as const))("%s: todo fragmento é SQL válido", (_id, assunto) => {
    validarNoEsquema(itensDoAssunto(assunto));
  });
});

describe("o tradutor como cada papel", () => {
  const MES = { atalho: "este_mes" };
  const PERGUNTA = {
    indicadores: ["negocio.ganhos", "negocio.perdidos"],
    variaveis: ["negocio.dono"],
    tempo: { campo: "negocio.fechado_em", periodo: MES },
  };

  beforeAll(() => {
    sql(`
      delete from public.crm_leads where title like 'ind9601 %';
      insert into public.crm_leads (organization_id, pipeline_id, stage_id, title, status, owner_user_id, closed_at, lost_reason) values
        ('${GOV_ORG}', 'cccccccc-5555-4000-8000-000000000001', 'cccccccc-5555-4000-8000-000000000002', 'ind9601 a1', 'won', '${GOV_AGENT_A}', now(), null),
        ('${GOV_ORG}', 'cccccccc-5555-4000-8000-000000000001', 'cccccccc-5555-4000-8000-000000000002', 'ind9601 a2', 'won', '${GOV_AGENT_A}', now(), null),
        ('${GOV_ORG}', 'cccccccc-5555-4000-8000-000000000001', 'cccccccc-5555-4000-8000-000000000002', 'ind9601 b1', 'lost', '${GOV_AGENT_B}', now(), 'price');
      insert into public.conversations (id, organization_id, contact_id, channel_session_id, status, assigned_to_user_id, assigned_at, assignee_kind)
        values ('${CONV_A}', '${GOV_ORG}', '${GOV_CONTACT_PROBE}', '${GOV_SESSION}', 'claimed', '${GOV_AGENT_A}', now(), 'user')
        on conflict do nothing;
      delete from public.messages where conversation_id = '${CONV_A}';
      insert into public.messages (organization_id, conversation_id, channel_session_id, contact_id, type, direction, sent_via, sent_by_user_id, sent_at) values
        ('${GOV_ORG}', '${CONV_A}', '${GOV_SESSION}', '${GOV_CONTACT_PROBE}', 'text', 'inbound', 'crm', null, now() - interval '2 minutes'),
        ('${GOV_ORG}', '${CONV_A}', '${GOV_SESSION}', '${GOV_CONTACT_PROBE}', 'text', 'outbound', 'crm', '${GOV_AGENT_A}', now() - interval '30 seconds');
    `);
  });

  const total = (linhas: string[]) => linhas.reduce((n, l) => n + Number(l.split("|")[1]) + Number(l.split("|")[2]), 0);
  const visiveis = (userId: string) =>
    countAs(
      userId,
      `select count(*) from public.crm_leads where title like 'ind9601 %' and status in ('won','lost')`,
    );

  it("o gerente vê os três negócios decididos, agrupados por dono", () => {
    const linhas = rodarPergunta(GOV_MANAGER, PERGUNTA);
    expect(total(linhas)).toBe(3);
    expect(linhas.find((l) => l.startsWith(GOV_AGENT_A))).toMatch(/\|2\|0$/);
    expect(linhas.find((l) => l.startsWith(GOV_AGENT_B))).toMatch(/\|0\|1$/);
  });

  it("cada papel recebe exatamente o que a RLS das tabelas deixa ele ver", () => {
    for (const quem of [GOV_MANAGER, GOV_AGENT_A, GOV_AGENT_B, GOV_VIEWER]) {
      expect(total(rodarPergunta(quem, PERGUNTA)), quem).toBe(visiveis(quem));
    }
  });

  it("bate com a página Desempenho (fn_attendant_metrics)", () => {
    const de = "2020-01-01";
    const ate = "2031-01-01";
    const doBanco = sql(
      `select e->>'user_id', e->>'won', e->>'lost', e->>'conversations_handled', round((e->>'avg_first_response_seconds')::numeric)
         from jsonb_array_elements(public.fn_attendant_metrics('${GOV_ORG}', '${de}', '${ate}')->'attendants') e order by 1;`,
    )
      .split("\n")
      .filter((l) => l.includes("|"));
    const periodo = { atalho: "personalizado", de, ate: "2030-12-31" };
    const ganhosEPerdas = rodarPergunta(GOV_MANAGER, {
      indicadores: ["negocio.ganhos", "negocio.perdidos"],
      variaveis: ["negocio.dono"],
      tempo: { campo: "negocio.fechado_em", periodo },
    });
    const atendidas = rodarPergunta(GOV_MANAGER, {
      indicadores: ["conversa.atribuidas", "conversa.tempo_de_primeira_resposta"],
      variaveis: ["conversa.atendente"],
      tempo: { campo: "conversa.atribuida_em", periodo },
    });
    for (const linha of doBanco) {
      const [usuario, ganhos, perdas, conversas, ttfr] = linha.split("|");
      const lead = ganhosEPerdas.find((l) => l.startsWith(`${usuario}|`))?.split("|");
      const conv = atendidas.find((l) => l.startsWith(`${usuario}|`))?.split("|");
      if (Number(ganhos) + Number(perdas) > 0) {
        expect(lead?.slice(1, 3), `negócios de ${usuario}`).toEqual([ganhos, perdas].map((n) => String(Number(n))));
      }
      expect(Number(conv?.[1]), `conversas de ${usuario}`).toBe(Number(conversas));
      if (ttfr) expect(Math.round(Number(conv?.[2])), `1ª resposta de ${usuario}`).toBe(Number(ttfr));
    }
  });
});

describe("o filtro do painel no banco (fase 7C)", () => {
  const MES = { atalho: "este_mes" as const };
  const QUANTIDADE = { indicadores: ["negocio.quantidade"] };
  const contar = (painel?: FiltroDoPainel, pergunta: unknown = QUANTIDADE) =>
    Number(rodarPergunta(GOV_MANAGER, pergunta, painel)[0]?.split("|")[0] ?? 0);

  beforeAll(() => {
    sql(`
      delete from public.crm_leads where title like 'ind7c %';
      insert into public.crm_leads (organization_id, pipeline_id, stage_id, title, status, owner_user_id, tags, value_cents, created_at) values
        ('${GOV_ORG}', 'cccccccc-5555-4000-8000-000000000001', 'cccccccc-5555-4000-8000-000000000002', 'ind7c vip', 'open', '${GOV_AGENT_A}', '{vip}', 150000, now()),
        ('${GOV_ORG}', 'cccccccc-5555-4000-8000-000000000001', 'cccccccc-5555-4000-8000-000000000002', 'ind7c sem', 'open', '${GOV_AGENT_A}', '{}', 5000, now()),
        ('${GOV_ORG}', 'cccccccc-5555-4000-8000-000000000001', 'cccccccc-5555-4000-8000-000000000002', 'ind7c antigo', 'open', '${GOV_AGENT_A}', '{vip}', 5000, now() - interval '400 days');
    `);
  });

  const tituloIgual = { campo: "negocio.titulo", op: "contem" as const, valor: "ind7c" };
  const soDoTeste = { ...QUANTIDADE, filtro: { condicoes: [tituloIgual] } };
  const tags = (op: "possui" | "sem") => ({
    combinar: "e" as const,
    grupos: [{ modo: "e" as const, condicoes: [op === "possui" ? { op, tag: "vip" } : { op }] }],
  });

  it("tags: possui vip acha o com tag; sem tag acha o sem tag", () => {
    expect(contar({ tags: tags("possui") }, { ...soDoTeste, tempo: { campo: "negocio.criado_em", periodo: { atalho: "tudo" } } })).toBe(2);
    expect(contar({ tags: tags("sem") }, { ...soDoTeste, tempo: { campo: "negocio.criado_em", periodo: { atalho: "tudo" } } })).toBe(1);
  });

  it("campos do negócio: valor maior que 1000 acha só o de R$ 1.500", () => {
    const campos = {
      combinar: "e" as const,
      grupos: [{ modo: "e" as const, condicoes: [{ alvo: "negocio" as const, chave: "valor", tipo: "numero" as const, op: "maior" as const, valor: "1000" }] }],
    };
    expect(contar({ campos }, { ...soDoTeste, tempo: { campo: "negocio.criado_em", periodo: { atalho: "tudo" } } })).toBe(1);
  });

  it("o período do painel vale para o gráfico com tempo; o fixo ignora; sem tempo ignora", () => {
    const comTempo = (fixo: boolean) => ({ ...soDoTeste, tempo: { campo: "negocio.criado_em", periodo: { atalho: "tudo" }, fixo } });
    expect(contar({ periodo: MES }, comTempo(false))).toBe(2);
    expect(contar({ periodo: MES }, comTempo(true))).toBe(3);
    expect(contar({ periodo: MES }, soDoTeste)).toBe(3);
  });
});
