import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_AGENT_A, GOV_MANAGER, GOV_ORG, lastLine, seedGov, sql } from "./gov-helpers";

/**
 * REVISÃO Q10 (fork Escale, migration 9407) — prova contra Postgres real das duas
 * gravações em lote: reordenar campos (tudo ou nada, RLS de administrador, grupo de
 * outra organização recusado) e gravar o desfecho de um lote de linhas da importação
 * (só linhas "processando" da importação pedida, CHECKs da 9107 de pé, fechada à
 * sessão). Roda via `pnpm test:db`.
 */
const ORG_B = "e5ca1e00-9407-4000-8000-0000000000b0";
const G1 = "e5ca1e00-9407-4000-8000-0000000000a1";
const G2 = "e5ca1e00-9407-4000-8000-0000000000a2";
const G_B = "e5ca1e00-9407-4000-8000-0000000000a3";
const C1 = "e5ca1e00-9407-4000-8000-0000000000c1";
const C2 = "e5ca1e00-9407-4000-8000-0000000000c2";
const C3 = "e5ca1e00-9407-4000-8000-0000000000c3";
const N1 = "e5ca1e00-9407-4000-8000-0000000000d1";
const N2 = "e5ca1e00-9407-4000-8000-0000000000d2";
const IMP = "e5ca1e00-9407-4000-8000-0000000000e1";
const IMP_2 = "e5ca1e00-9407-4000-8000-0000000000e2";
const CONTATO = "e5ca1e00-9407-4000-8000-0000000002c2";
const L = (n: number) => `e5ca1e00-9407-4000-8000-0000000001${n.toString().padStart(2, "0")}`;

const como = (usuario: string, script: string) =>
  sql(`set role authenticated;
    select set_config('request.jwt.claims', '{"sub":"${usuario}"}', false);
    ${script}`);
const reordenar = (usuario: string, objeto: string, grupos: string[], campos: unknown) =>
  como(
    usuario,
    `select public.fn_escale_reordenar_campos('${GOV_ORG}', '${objeto}', array[${grupos.map((g) => `'${g}'`).join(",")}]::uuid[], '${JSON.stringify(campos)}'::jsonb);`,
  );
const posicoes = (tabela: string, ids: string[]) =>
  lastLine(
    sql(
      `select string_agg(id::text || ':' || posicao || ':' || coalesce(grupo_id::text, '-'), ',' order by id) from public.${tabela} where id in (${ids.map((i) => `'${i}'`).join(",")})`,
    ),
  );
const posicaoDosGrupos = () =>
  lastLine(sql(`select string_agg(posicao::text, ',' order by id) from public.crm_grupos_de_campos where id in ('${G1}', '${G2}')`));
const def = (rotulo: string) => `'{"label":"${rotulo}","type":"text"}'::jsonb`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name) values ('${ORG_B}', 'org-b-9407', 'Org B 9407', 'Org B 9407') on conflict (id) do nothing;
    delete from public.crm_importacoes where organization_id = '${GOV_ORG}';
    delete from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and padrao = false;
    delete from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}';
    delete from public.crm_grupos_de_campos where organization_id in ('${GOV_ORG}', '${ORG_B}') and padrao = false;
    insert into public.crm_grupos_de_campos (id, organization_id, objeto, chave, nome, posicao) values
      ('${G1}', '${GOV_ORG}', 'contato', 'q10_a', 'A', 0),
      ('${G2}', '${GOV_ORG}', 'contato', 'q10_b', 'B', 1),
      ('${G_B}', '${ORG_B}', 'contato', 'q10_a', 'A', 0);
    insert into public.crm_campos_do_crm (id, organization_id, objeto, chave, definicao, grupo_id, posicao) values
      ('${C1}', '${GOV_ORG}', 'contato', 'q10_1', ${def('Campo 1')}, '${G1}', 0),
      ('${C2}', '${GOV_ORG}', 'contato', 'q10_2', ${def('Campo 2')}, '${G1}', 1),
      ('${C3}', '${GOV_ORG}', 'contato', 'q10_3', ${def('Campo 3')}, '${G2}', 0);
    insert into public.crm_campos_do_negocio (id, organization_id, chave, definicao, posicao) values
      ('${N1}', '${GOV_ORG}', 'q10_n1', ${def('Negocio 1')}, 0),
      ('${N2}', '${GOV_ORG}', 'q10_n2', ${def('Negocio 2')}, 1);
  `);
});

describe("fn_escale_reordenar_campos", () => {
  it("o administrador reordena grupos e campos e muda campo de grupo numa chamada só", () => {
    reordenar(GOV_ADMIN, "contato", [G2, G1], [
      { grupo_id: G2, ids: [C3, C1] },
      { grupo_id: G1, ids: [C2] },
    ]);
    expect(posicaoDosGrupos()).toBe("1,0");
    expect(posicoes("crm_campos_do_crm", [C1, C2, C3])).toBe(`${C1}:1:${G2},${C2}:0:${G1},${C3}:0:${G2}`);
  });

  it("falha no meio desfaz tudo: o grupo já reposicionado volta ao lugar", () => {
    const antes = posicaoDosGrupos();
    expect(() => reordenar(GOV_ADMIN, "contato", [G1, G2], [{ grupo_id: G1, ids: ["isto-nao-e-uuid"] }])).toThrow();
    expect(posicaoDosGrupos()).toBe(antes);
  });

  it("grupo de outra organização é recusado e nada muda", () => {
    const antes = posicoes("crm_campos_do_crm", [C1, C2, C3]);
    expect(() => reordenar(GOV_ADMIN, "contato", [G1], [{ grupo_id: G_B, ids: [C1] }])).toThrow(/grupo_sumiu/);
    expect(posicoes("crm_campos_do_crm", [C1, C2, C3])).toBe(antes);
  });

  it("grupo do objeto errado é recusado", () => {
    expect(() => reordenar(GOV_ADMIN, "empresa", [], [{ grupo_id: G1, ids: [C1] }])).toThrow(/grupo_sumiu/);
  });

  it("quem não é administrador não consegue gravar a ordem (RLS)", () => {
    const antes = posicoes("crm_campos_do_crm", [C1, C2, C3]);
    const gruposAntes = posicaoDosGrupos();
    for (const quem of [GOV_AGENT_A, GOV_MANAGER]) {
      reordenar(quem, "contato", [G1, G2], [{ grupo_id: G1, ids: [C3, C2, C1] }]);
    }
    expect(posicoes("crm_campos_do_crm", [C1, C2, C3])).toBe(antes);
    expect(posicaoDosGrupos()).toBe(gruposAntes);
  });

  it("o catálogo do negócio é reordenado na tabela dele", () => {
    reordenar(GOV_ADMIN, "negocio", [], [{ grupo_id: null, ids: [N2, N1] }]);
    expect(posicoes("crm_campos_do_negocio", [N1, N2])).toBe(`${N1}:1:-,${N2}:0:-`);
  });

  it("objeto inválido é recusado", () => {
    expect(() => reordenar(GOV_ADMIN, "lixo", [], [])).toThrow(/objeto_invalido/);
  });

  it("anon não executa; a sessão logada e o service_role sim", () => {
    const pode = (papel: string) =>
      lastLine(sql(`select has_function_privilege('${papel}', 'public.fn_escale_reordenar_campos(uuid, text, uuid[], jsonb)', 'execute')`));
    expect(pode("anon")).toBe("f");
    expect(pode("authenticated")).toBe("t");
    expect(pode("service_role")).toBe("t");
  });
});

describe("fn_escale_gravar_desfechos_da_importacao", () => {
  const linha = (imp: string, n: number, status: string) =>
    `insert into public.crm_importacoes_linhas (id, importacao_id, organization_id, numero, bruto, status)
     values ('${L(n)}', '${imp}', '${GOV_ORG}', ${n}, '["x"]'::jsonb, '${status}');`;
  const comoServico = (script: string) => sql(`set role service_role; ${script}`);
  const gravar = (imp: string, desfechos: unknown[]) =>
    lastLine(comoServico(`select public.fn_escale_gravar_desfechos_da_importacao('${imp}', '${JSON.stringify(desfechos)}'::jsonb);`));
  const estado = () =>
    lastLine(
      sql(
        `select string_agg(numero || ':' || status || ':' || coalesce(motivo, '-') || ':' || coalesce(contato_id::text, '-'), ',' order by numero) from public.crm_importacoes_linhas where id in (${[1, 2, 3, 4].map((n) => `'${L(n)}'`).join(",")})`,
      ),
    );

  beforeAll(() => {
    sql(`
      insert into public.crm_importacoes (id, organization_id, user_id, tipo, arquivo) values
        ('${IMP}', '${GOV_ORG}', '${GOV_ADMIN}', 'contato', 'a.csv'),
        ('${IMP_2}', '${GOV_ORG}', '${GOV_ADMIN}', 'contato', 'b.csv');
      ${linha(IMP, 1, "processando")}
      ${linha(IMP, 2, "processando")}
      ${linha(IMP, 3, "na_fila")}
      ${linha(IMP_2, 4, "processando")}
    `);
  });

  it("grava o lote numa chamada, só nas linhas da importação pedida", () => {
    const gravadas = gravar(IMP, [
      { id: L(1), status: "importada", motivo: null, detalhe: { avisos: {} }, com_aviso: false, contato_id: null, mensagem: null },
      { id: L(2), status: "pulada", motivo: "DUPLICATE_IN_BATCH", detalhe: {}, com_aviso: false, mensagem: null },
      { id: L(4), status: "importada" },
    ]);
    expect(gravadas).toBe("2");
    expect(estado()).toBe("1:importada:-:-,2:pulada:DUPLICATE_IN_BATCH:-,3:na_fila:-:-,4:processando:-:-");
  });

  it("o desfecho real vale mesmo se o cancelamento já marcou a linha como pulada", () => {
    sql(`update public.crm_importacoes_linhas set status = 'pulada', motivo = 'CANCELADA' where id = '${L(3)}'`);
    gravar(IMP, [{ id: L(3), status: "importada" }]);
    expect(lastLine(sql(`select status || ':' || coalesce(motivo, '-') from public.crm_importacoes_linhas where id = '${L(3)}'`))).toBe("importada:-");
    sql(`update public.crm_importacoes_linhas set status = 'na_fila', motivo = null where id = '${L(3)}'`);
  });

  it("uma linha que quebra o CHECK desfaz o lote inteiro", () => {
    sql(`update public.crm_importacoes_linhas set status = 'processando' where id in ('${L(1)}', '${L(2)}')`);
    const antes = estado();
    expect(() =>
      gravar(IMP, [
        { id: L(1), status: "importada" },
        { id: L(2), status: "revisar", motivo: null },
      ]),
    ).toThrow(/crm_importacoes_linhas_motivo_quando_revisa/);
    expect(estado()).toBe(antes);
  });

  it("contato_id ausente não apaga o que já estava gravado", () => {
    sql(`insert into public.contacts (id, organization_id, display_name) values ('${CONTATO}', '${GOV_ORG}', 'Q10') on conflict (id) do nothing;
         update public.crm_importacoes_linhas set status = 'processando', contato_id = '${CONTATO}' where id = '${L(1)}'`);
    gravar(IMP, [{ id: L(1), status: "erro", mensagem: "falhou" }]);
    expect(lastLine(sql(`select status || ':' || contato_id from public.crm_importacoes_linhas where id = '${L(1)}'`))).toBe(`erro:${CONTATO}`);
  });

  it("a lista tem de ser um array", () => {
    expect(() => comoServico(`select public.fn_escale_gravar_desfechos_da_importacao('${IMP}', '{}'::jsonb);`)).toThrow(/desfechos_invalidos/);
  });

  it("só o service_role executa", () => {
    const pode = (papel: string) =>
      lastLine(sql(`select has_function_privilege('${papel}', 'public.fn_escale_gravar_desfechos_da_importacao(uuid, jsonb)', 'execute')`));
    expect(pode("anon")).toBe("f");
    expect(pode("authenticated")).toBe("f");
    expect(pode("service_role")).toBe("t");
  });
});
