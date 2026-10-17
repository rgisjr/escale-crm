import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_AGENT_A, GOV_MANAGER, GOV_ORG, GOV_PIPELINE, GOV_VIEWER, countAs, lastLine, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * CAMPOS DO CRM (fork Escale, migration 9006) — prova contra Postgres real:
 * todo membro lê o catálogo, só administrador escreve (e o que ele escreve
 * direto é validado); o catálogo aparece em todas as origens com a regra de cada
 * uma; gravar `settings.fields` adota (só administrador ou serviço) e o gerente
 * nunca altera uma definição; apagar tira de todas; a junção é por chave, a mais
 * antiga vence, as divergências guardam a definição inteira, rodar de novo não
 * muda nada e a reprojeção não reescreve a origem que não mudou; uma organização
 * não alcança o catálogo da outra. Roda via `pnpm test:db`.
 */
const ORG_B = "e5ca1e00-9006-4000-8000-000000000001";
const USER_B = "e5ca1e00-9006-4000-8000-000000000002";
const ORG_C = "e5ca1e00-9006-4000-8000-000000000003";
const ORG_D = "e5ca1e00-9006-4000-8000-000000000004";
const P1 = "e5ca1e00-9006-4000-8000-000000000011";
const P2 = "e5ca1e00-9006-4000-8000-000000000012";
const P3 = "e5ca1e00-9006-4000-8000-000000000013";
const P_D = "e5ca1e00-9006-4000-8000-000000000014";
const C1 = "e5ca1e00-9006-4000-8000-000000000031";
const C2 = "e5ca1e00-9006-4000-8000-000000000032";
const C3 = "e5ca1e00-9006-4000-8000-000000000033";
const DEF = (label: string, type = "text") => `'{"label":"${label}","type":"${type}"}'::jsonb`;

/** Roda uma instrução e devolve a última linha (o psql -tA também imprime as etiquetas dos comandos). */
const ultima = (script: string) => lastLine(sql(script));

/** As chaves de `settings.fields` de uma origem, em ordem alfabética. */
const chaves = (pipeline: string) =>
  sql(
    `select coalesce(string_agg(e->>'key', ',' order by e->>'key'), '') from public.crm_pipelines p, jsonb_array_elements(p.settings->'fields') e where p.id = '${pipeline}';`,
  );
const item = (pipeline: string, chave: string, campo: string) =>
  sql(
    `select coalesce((select e->>'${campo}' from public.crm_pipelines p, jsonb_array_elements(p.settings->'fields') e where p.id = '${pipeline}' and e->>'key' = '${chave}'), '-');`,
  );
const regra = (pipeline: string, chave: string, quando: string) =>
  sql(
    `select coalesce((select e->'obrigatorio_em'->>'${quando}' from public.crm_pipelines p, jsonb_array_elements(p.settings->'fields') e where p.id = '${pipeline}' and e->>'key' = '${chave}'), '-');`,
  );
const temRegra = (pipeline: string, chave: string) =>
  sql(
    `select count(*) from public.crm_pipelines p, jsonb_array_elements(p.settings->'fields') e where p.id = '${pipeline}' and e->>'key' = '${chave}' and e ? 'obrigatorio_em';`,
  );
const noCatalogo = (org: string, chave: string) =>
  sql(`select count(*) from public.crm_campos_do_negocio where organization_id = '${org}' and chave = '${chave}';`);
const doCatalogo = (org: string, chave: string, expressao: string) =>
  sql(`select ${expressao} from public.crm_campos_do_negocio where organization_id = '${org}' and chave = '${chave}';`);
/** Quantas origens da organização têm (ou não têm) a chave em settings.fields. */
const origensComAChave = (org: string, chave: string) =>
  sql(
    `select count(*) from public.crm_pipelines p where p.organization_id = '${org}' and exists (select 1 from jsonb_array_elements(p.settings->'fields') e where e->>'key' = '${chave}');`,
  );
/** A "impressão digital" da linha: se o xmin ou o updated_at mudaram, a linha foi reescrita. */
const marcaDaOrigem = (id: string) => sql(`select xmin::text || '|' || updated_at::text from public.crm_pipelines where id = '${id}';`);
const marcaDoCampo = (org: string, chave: string) =>
  doCatalogo(org, chave, `xmin::text || '|' || updated_at::text`);
const acrescentar = (pipeline: string, chave: string, label: string) =>
  `update public.crm_pipelines set settings = jsonb_set(settings, '{fields}', coalesce(settings->'fields', '[]'::jsonb) || '[{"key":"${chave}","label":"${label}","type":"number"}]'::jsonb) where id = '${pipeline}'`;

/** O SQLSTATE de uma instrução rodada como a pessoa (sessão authenticated com o JWT dela). */
function estadoComo(userId: string, dml: string): string {
  try {
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
      do $t$ begin ${dml}; exception when others then raise exception 'estado:%', sqlstate; end $t$;
    `);
    return "sem erro";
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr ?? "";
    const m = /estado:(\w{5})/.exec(stderr);
    if (!m?.[1]) throw err;
    return m[1];
  }
}

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email) values ('${USER_B}', 'escale-campos-b@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name) values
      ('${ORG_B}', 'escale-campos-b', 'Escale Campos Org B', 'Escale CPB'),
      ('${ORG_C}', 'escale-campos-c', 'Escale Campos Org C', 'Escale CPC')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now()) on conflict do nothing;
    delete from public.crm_campos_do_negocio where organization_id in ('${GOV_ORG}', '${ORG_B}', '${ORG_C}');
    delete from public.crm_pipelines where id in ('${P1}', '${P2}', '${P3}', '${C1}', '${C2}', '${C3}');
    insert into public.crm_pipelines (id, organization_id, name, slug) values
      ('${P1}', '${GOV_ORG}', 'Escale 9006 A', 'escale-9006-a'),
      ('${P2}', '${GOV_ORG}', 'Escale 9006 B', 'escale-9006-b');
    insert into public.crm_campos_do_negocio (organization_id, chave, definicao, posicao)
      values ('${GOV_ORG}', 'escale_cpf', ${DEF("CPF")}, 1);
  `);
});

afterAll(() => {
  sql(`
    delete from public.crm_campos_do_negocio where organization_id in ('${GOV_ORG}', '${ORG_B}', '${ORG_C}');
    delete from public.crm_pipelines where id in ('${P1}', '${P2}', '${P3}', '${C1}', '${C2}', '${C3}');
  `);
});

describe("o desenho: a tabela, os gatilhos e o que a sessão não alcança", () => {
  it("RLS ligada, anon sem acesso, authenticated só pelas policies", () => {
    expect(sql(`select relrowsecurity from pg_class where oid = 'public.crm_campos_do_negocio'::regclass;`)).toBe("t");
    for (const privilegio of ["select", "insert", "update", "delete"]) {
      expect(sql(`select has_table_privilege('anon', 'public.crm_campos_do_negocio', '${privilegio}');`)).toBe("f");
    }
    expect(
      sql(`select string_agg(policyname, ',' order by policyname) from pg_policies where schemaname = 'public' and tablename = 'crm_campos_do_negocio' and policyname in ('crm_campos_do_negocio_select', 'crm_campos_do_negocio_admin_write');`),
    ).toBe("crm_campos_do_negocio_admin_write,crm_campos_do_negocio_select");
  });

  it("os dois gatilhos existem e estão ligados", () => {
    expect(
      sql(`select tgenabled::text from pg_trigger where tgname = 'trg_escale_pipeline_campos_do_crm' and tgrelid = 'public.crm_pipelines'::regclass and not tgisinternal;`),
    ).toBe("O");
    expect(
      sql(`select tgenabled::text from pg_trigger where tgname = 'trg_escale_campos_do_negocio_reprojeta' and tgrelid = 'public.crm_campos_do_negocio'::regclass and not tgisinternal;`),
    ).toBe("O");
  });

  it("a FK da organização apaga o catálogo em cascata, sem erro, mesmo com origem junto", () => {
    sql(`
      insert into public.organizations (id, slug, legal_name, display_name)
        values ('${ORG_D}', 'escale-campos-d', 'Escale Campos Org D', 'Escale CPD') on conflict do nothing;
      insert into public.crm_pipelines (id, organization_id, name, slug) values ('${P_D}', '${ORG_D}', 'D', 'escale-9006-d') on conflict do nothing;
      insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${ORG_D}', 'campo_d', ${DEF("Do D")});
    `);
    // a organização nasce com a origem padrão do seed: o catálogo chega nela e na que entrou à mão
    const deD = sql(`select count(*) from public.crm_pipelines where organization_id = '${ORG_D}';`);
    expect(Number(deD)).toBeGreaterThanOrEqual(2);
    expect(origensComAChave(ORG_D, "campo_d")).toBe(deD);
    expect(() => sql(`delete from public.organizations where id = '${ORG_D}';`)).not.toThrow();
    expect(noCatalogo(ORG_D, "campo_d")).toBe("0");
    expect(sql(`select count(*) from public.crm_pipelines where organization_id = '${ORG_D}';`)).toBe("0");
  });

  it("os CHECKs da tabela: chave, definição (objeto, sem key/obrigatorio_em, até 256 KB) e divergências", () => {
    const org = GOV_ORG;
    const inserir = (chave: string, definicao: string, extra = "") =>
      sql(`insert into public.crm_campos_do_negocio (organization_id, chave, definicao${extra ? ", divergencias" : ""}) values ('${org}', '${chave}', ${definicao}${extra ? `, ${extra}` : ""});`);
    expect(() => inserir("1comeca_com_numero", DEF("x"))).toThrow(/crm_campos_do_negocio_chave_formato/);
    expect(() => inserir("a".repeat(41), DEF("x"))).toThrow(/crm_campos_do_negocio_chave_formato/);
    expect(() => inserir("escale_lista", "'[]'::jsonb")).toThrow(/crm_campos_do_negocio_definicao_objeto/);
    expect(() => inserir("escale_com_key", `'{"label":"x","type":"text","key":"y"}'::jsonb`)).toThrow(/crm_campos_do_negocio_definicao_objeto/);
    expect(() => inserir("escale_com_regra", `'{"label":"x","type":"text","obrigatorio_em":{}}'::jsonb`)).toThrow(/crm_campos_do_negocio_definicao_objeto/);
    expect(() => inserir("escale_gigante", `jsonb_build_object('label', 'x', 'type', 'text', 'blob', repeat('a', 300000))`)).toThrow(/crm_campos_do_negocio_definicao_tamanho/);
    expect(() => inserir("escale_diverg_objeto", DEF("x"), "'{}'::jsonb")).toThrow(/crm_campos_do_negocio_divergencias_lista/);
    expect(() => inserir("escale_diverg_grande", DEF("x"), `jsonb_build_array(repeat('a', 40000))`)).toThrow(/crm_campos_do_negocio_divergencias_lista/);
    expect(sql(`select count(*) from public.crm_campos_do_negocio where organization_id = '${org}' and chave like 'escale\\_%' and chave not in ('escale_cpf');`)).toBe("0");
  });

  it("o teto subiu para 256 KB: uma definição de 20 KB (acima dos 16 KB antigos) entra e aparece nas origens", () => {
    expect(
      ultima(`with w as (
                insert into public.crm_campos_do_negocio (organization_id, chave, definicao)
                values ('${GOV_ORG}', 'escale_grande', jsonb_build_object('label', 'Grande', 'type', 'text', 'blob', repeat('a', 20000)))
                returning 1) select count(*) from w;`),
    ).toBe("1");
    expect(origensComAChave(GOV_ORG, "escale_grande")).toBe(sql(`select count(*) from public.crm_pipelines where organization_id = '${GOV_ORG}';`));
    sql(`delete from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_grande';`);
    expect(origensComAChave(GOV_ORG, "escale_grande")).toBe("0");
  });
});

describe("crm_campos_do_negocio: RLS", () => {
  it("todo papel lê (viewer e agente, controles positivos); o vizinho não", () => {
    const q = `select count(*) from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_cpf';`;
    expect(countAs(GOV_VIEWER, q)).toBe(1);
    expect(countAs(GOV_AGENT_A, q)).toBe(1);
    expect(countAs(GOV_MANAGER, q)).toBe(1);
    expect(countAs(GOV_ADMIN, q)).toBe(1);
    expect(countAs(USER_B, q)).toBe(0);
  });

  it("só administrador escreve: o administrador cria (controle positivo); gerente, agente, viewer e vizinho não", () => {
    expect(
      writeCountAs(GOV_ADMIN, `insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${GOV_ORG}', 'escale_do_admin', ${DEF("Do admin")})`),
    ).toBe(1);
    expect(
      writeCountAs(GOV_MANAGER, `insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${GOV_ORG}', 'escale_do_gerente', ${DEF("Do gerente")})`),
    ).toBe(0);
    expect(
      writeCountAs(GOV_AGENT_A, `insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${GOV_ORG}', 'escale_do_agente', ${DEF("Do agente")})`),
    ).toBe(0);
    expect(writeCountAs(GOV_MANAGER, `update public.crm_campos_do_negocio set definicao = ${DEF("X")} where organization_id = '${GOV_ORG}' and chave = 'escale_cpf'`)).toBe(0);
    expect(writeCountAs(GOV_AGENT_A, `update public.crm_campos_do_negocio set definicao = ${DEF("X")} where organization_id = '${GOV_ORG}' and chave = 'escale_cpf'`)).toBe(0);
    expect(writeCountAs(GOV_MANAGER, `delete from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_cpf'`)).toBe(0);
    expect(writeCountAs(GOV_VIEWER, `delete from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_cpf'`)).toBe(0);
    expect(
      writeCountAs(USER_B, `insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${GOV_ORG}', 'escale_vizinho', ${DEF("Vizinho")})`),
    ).toBe(0);
    for (const chave of ["escale_do_gerente", "escale_do_agente", "escale_vizinho"]) expect(noCatalogo(GOV_ORG, chave)).toBe("0");
    expect(doCatalogo(GOV_ORG, "escale_cpf", "definicao->>'label'")).toBe("CPF");
    expect(noCatalogo(GOV_ORG, "escale_cpf")).toBe("1");
  });

  it("isolamento entre organizações: a B não lê nem escreve o catálogo da A, e vice-versa (com controles positivos)", () => {
    sql(`insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${ORG_B}', 'escale_da_b', ${DEF("Da B")});`);
    const daB = `select count(*) from public.crm_campos_do_negocio where organization_id = '${ORG_B}' and chave = 'escale_da_b';`;
    const daA = `select count(*) from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}';`;
    // leitura: cada lado vê o seu (controle positivo) e nada do outro
    expect(countAs(USER_B, daB)).toBe(1);
    expect(countAs(GOV_ADMIN, daA)).toBeGreaterThan(0);
    expect(countAs(GOV_ADMIN, daB)).toBe(0);
    expect(countAs(USER_B, daA)).toBe(0);
    // escrita: o administrador da B muda o da B (controle positivo) e o da A muda o da A
    expect(writeCountAs(USER_B, `update public.crm_campos_do_negocio set definicao = ${DEF("Da B 2")} where organization_id = '${ORG_B}' and chave = 'escale_da_b'`)).toBe(1);
    expect(writeCountAs(GOV_ADMIN, `update public.crm_campos_do_negocio set definicao = ${DEF("CPF")} where organization_id = '${GOV_ORG}' and chave = 'escale_cpf'`)).toBe(1);
    // ...e nenhum alcança o do outro, nem mesmo sendo administrador
    expect(writeCountAs(USER_B, `update public.crm_campos_do_negocio set definicao = ${DEF("Invadido")} where organization_id = '${GOV_ORG}'`)).toBe(0);
    expect(writeCountAs(USER_B, `delete from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}'`)).toBe(0);
    expect(writeCountAs(GOV_ADMIN, `update public.crm_campos_do_negocio set definicao = ${DEF("Invadido")} where organization_id = '${ORG_B}'`)).toBe(0);
    expect(writeCountAs(GOV_ADMIN, `delete from public.crm_campos_do_negocio where organization_id = '${ORG_B}'`)).toBe(0);
    expect(
      writeCountAs(GOV_ADMIN, `insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${ORG_B}', 'escale_plantado', ${DEF("Plantado")})`),
    ).toBe(0);
    expect(
      writeCountAs(USER_B, `insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${GOV_ORG}', 'escale_plantado', ${DEF("Plantado")})`),
    ).toBe(0);
    expect(doCatalogo(ORG_B, "escale_da_b", "definicao->>'label'")).toBe("Da B 2");
    expect(doCatalogo(GOV_ORG, "escale_cpf", "definicao->>'label'")).toBe("CPF");
    expect(noCatalogo(ORG_B, "escale_plantado")).toBe("0");
    expect(noCatalogo(GOV_ORG, "escale_plantado")).toBe("0");
  });
});

describe("escrita direta do administrador no catálogo é validada (23514)", () => {
  const INVALIDAS: ReadonlyArray<readonly [string, string]> = [
    ["rótulo vazio", `'{"label":"","type":"text"}'::jsonb`],
    ["sem rótulo", `'{"type":"text"}'::jsonb`],
    ["rótulo de 81 caracteres", `jsonb_build_object('label', repeat('a', 81), 'type', 'text')`],
    ["tipo que não existe", `'{"label":"X","type":"inexistente"}'::jsonb`],
    ["sem tipo", `'{"label":"X"}'::jsonb`],
  ];

  it("controle positivo: o administrador cria um campo válido (a mesma instrução, com definição boa)", () => {
    expect(estadoComo(GOV_ADMIN, `insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${GOV_ORG}', 'escale_valido', ${DEF("Válido")})`)).toBe("sem erro");
    expect(noCatalogo(GOV_ORG, "escale_valido")).toBe("1");
    expect(origensComAChave(GOV_ORG, "escale_valido")).toBe(sql(`select count(*) from public.crm_pipelines where organization_id = '${GOV_ORG}';`));
    sql(`delete from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_valido';`);
  });

  it.each(INVALIDAS)("INSERT com %s: recusado com 23514, nada entra no catálogo nem nas origens", (_nome, definicao) => {
    expect(
      estadoComo(GOV_ADMIN, `insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${GOV_ORG}', 'escale_ruim', ${definicao})`),
    ).toBe("23514");
    expect(noCatalogo(GOV_ORG, "escale_ruim")).toBe("0");
    expect(origensComAChave(GOV_ORG, "escale_ruim")).toBe("0");
  });

  it("UPDATE para uma definição inválida: recusado com 23514 e a definição antiga fica", () => {
    expect(
      estadoComo(GOV_ADMIN, `update public.crm_campos_do_negocio set definicao = '{"label":"","type":"text"}'::jsonb where organization_id = '${GOV_ORG}' and chave = 'escale_do_admin'`),
    ).toBe("23514");
    expect(doCatalogo(GOV_ORG, "escale_do_admin", "definicao->>'label'")).toBe("Do admin");
    expect(item(P1, "escale_do_admin", "label")).toBe("Do admin");
  });
});

describe("a projeção em cada origem", () => {
  it("o catálogo aparece em toda origem da organização (a do seed também), e só nelas", () => {
    expect(chaves(P1)).toContain("escale_cpf");
    expect(chaves(P2)).toContain("escale_do_admin");
    const todas = sql(`select count(*) from public.crm_pipelines where organization_id = '${GOV_ORG}';`);
    expect(Number(todas)).toBeGreaterThanOrEqual(3);
    expect(origensComAChave(GOV_ORG, "escale_cpf")).toBe(todas);
    expect(origensComAChave(GOV_ORG, "escale_do_admin")).toBe(todas);
    expect(chaves(GOV_PIPELINE)).toContain("escale_cpf");
    expect(sql(`select count(*) from public.crm_pipelines p, jsonb_array_elements(p.settings->'fields') e where p.organization_id <> '${GOV_ORG}' and e->>'key' in ('escale_cpf', 'escale_do_admin');`)).toBe("0");
  });

  it("a regra é da origem: mudar o rótulo no catálogo mantém o obrigatorio_em de A e não o leva para B", () => {
    sql(`
      update public.crm_pipelines
         set settings = jsonb_set(settings, '{fields}', (
           select jsonb_agg(case when e->>'key' = 'escale_cpf' then e || '{"obrigatorio_em":{"ao_ganhar":true}}'::jsonb else e end)
             from jsonb_array_elements(settings->'fields') e))
       where id = '${P1}';
    `);
    expect(temRegra(P1, "escale_cpf")).toBe("1");
    expect(temRegra(P2, "escale_cpf")).toBe("0");
    expect(writeCountAs(GOV_ADMIN, `update public.crm_campos_do_negocio set definicao = ${DEF("Documento")} where organization_id = '${GOV_ORG}' and chave = 'escale_cpf'`)).toBe(1);
    expect(item(P1, "escale_cpf", "label")).toBe("Documento");
    expect(item(P2, "escale_cpf", "label")).toBe("Documento");
    expect(temRegra(P1, "escale_cpf")).toBe("1");
    expect(regra(P1, "escale_cpf", "ao_ganhar")).toBe("true");
    expect(temRegra(P2, "escale_cpf")).toBe("0");
  });

  it("o gerente salva a origem: o obrigatorio_em dele fica; definição mudada, campo novo e campo tirado não valem", () => {
    const antes = marcaDoCampo(GOV_ORG, "escale_cpf");
    expect(
      writeCountAs(
        GOV_MANAGER,
        `update public.crm_pipelines set settings = jsonb_set(settings, '{fields}', (
           select jsonb_agg(case when e->>'key' = 'escale_cpf' then e || '{"label":"Hackeado","type":"number","obrigatorio_em":{"ao_ganhar":false}}'::jsonb else e end)
             from jsonb_array_elements(settings->'fields') e where e->>'key' <> 'escale_do_admin')
           || '[{"key":"escale_gerente","label":"Gerente","type":"text"}]'::jsonb)
         where id = '${P1}'`,
      ),
    ).toBe(1);
    // o catálogo não foi tocado: nem a definição, nem a linha
    expect(doCatalogo(GOV_ORG, "escale_cpf", "definicao->>'label' || '/' || (definicao->>'type')")).toBe("Documento/text");
    expect(marcaDoCampo(GOV_ORG, "escale_cpf")).toBe(antes);
    expect(noCatalogo(GOV_ORG, "escale_gerente")).toBe("0");
    expect(noCatalogo(GOV_ORG, "escale_do_admin")).toBe("1");
    // a origem voltou ao catálogo, menos a regra, que é dela
    expect(item(P1, "escale_cpf", "label")).toBe("Documento");
    expect(item(P1, "escale_cpf", "type")).toBe("text");
    expect(regra(P1, "escale_cpf", "ao_ganhar")).toBe("false");
    expect(chaves(P1)).toContain("escale_do_admin");
    expect(chaves(P1)).not.toContain("escale_gerente");
    // e a irmã não sentiu nada
    expect(item(P2, "escale_cpf", "label")).toBe("Documento");
    expect(temRegra(P2, "escale_cpf")).toBe("0");
  });

  it("apagar no catálogo tira o campo e a regra de todas as origens (controle positivo: ele estava em todas)", () => {
    const todas = sql(`select count(*) from public.crm_pipelines where organization_id = '${GOV_ORG}';`);
    expect(origensComAChave(GOV_ORG, "escale_cpf")).toBe(todas);
    expect(temRegra(P1, "escale_cpf")).toBe("1");
    expect(writeCountAs(GOV_ADMIN, `delete from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_cpf'`)).toBe(1);
    expect(origensComAChave(GOV_ORG, "escale_cpf")).toBe("0");
    expect(chaves(P1)).not.toContain("escale_cpf");
    expect(chaves(P2)).not.toContain("escale_cpf");
    expect(chaves(GOV_PIPELINE)).not.toContain("escale_cpf");
    expect(temRegra(P1, "escale_cpf")).toBe("0");
    // o que ficou no catálogo continua em todas
    expect(origensComAChave(GOV_ORG, "escale_do_admin")).toBe(todas);
  });

  it("a chave de um campo e a organização dele não mudam", () => {
    expect(() =>
      sql(`update public.crm_campos_do_negocio set chave = 'outra' where organization_id = '${GOV_ORG}' and chave = 'escale_do_admin';`),
    ).toThrow(/a chave de um campo do CRM não muda/);
    expect(() =>
      sql(`update public.crm_campos_do_negocio set organization_id = '${ORG_B}' where organization_id = '${GOV_ORG}' and chave = 'escale_do_admin';`),
    ).toThrow(/um campo do CRM não muda de organização/);
    expect(noCatalogo(GOV_ORG, "escale_do_admin")).toBe("1");
    expect(noCatalogo(ORG_B, "escale_do_admin")).toBe("0");
  });
});

describe("gravar settings.fields adota no catálogo (só administrador ou serviço)", () => {
  it("administrador: a chave nova vira campo do CRM, vai para o fim da ordem e aparece nas outras origens (controle positivo)", () => {
    expect(writeCountAs(GOV_ADMIN, acrescentar(P1, "escale_novo", "Novo"))).toBe(1);
    expect(noCatalogo(GOV_ORG, "escale_novo")).toBe("1");
    expect(chaves(P2)).toContain("escale_novo");
    expect(chaves(GOV_PIPELINE)).toContain("escale_novo");
    expect(
      sql(`select (select posicao from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_novo')
                > (select posicao from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_do_admin');`),
    ).toBe("t");
  });

  it("gerente: grava a origem, mas o campo novo não entra no catálogo nem fica na origem", () => {
    expect(writeCountAs(GOV_MANAGER, acrescentar(P1, "escale_gerente", "Gerente"))).toBe(1);
    expect(noCatalogo(GOV_ORG, "escale_gerente")).toBe("0");
    expect(chaves(P1)).not.toContain("escale_gerente");
    expect(chaves(P2)).not.toContain("escale_gerente");
  });

  it("agente e viewer nem gravam a origem (a RLS da origem é de gerente para cima)", () => {
    expect(writeCountAs(GOV_AGENT_A, acrescentar(P1, "escale_do_agente", "Agente"))).toBe(0);
    expect(writeCountAs(GOV_VIEWER, acrescentar(P1, "escale_do_viewer", "Viewer"))).toBe(0);
    expect(noCatalogo(GOV_ORG, "escale_do_agente")).toBe("0");
    expect(noCatalogo(GOV_ORG, "escale_do_viewer")).toBe("0");
  });

  it("administrador muda o rótulo numa origem: muda no catálogo e na outra", () => {
    expect(
      writeCountAs(
        GOV_ADMIN,
        `update public.crm_pipelines set settings = jsonb_set(settings, '{fields}', (select jsonb_agg(case when e->>'key' = 'escale_novo' then jsonb_set(e, '{label}', '"Novo 2"') else e end) from jsonb_array_elements(settings->'fields') e)) where id = '${P2}'`,
      ),
    ).toBe(1);
    expect(doCatalogo(GOV_ORG, "escale_novo", "definicao->>'label'")).toBe("Novo 2");
    expect(item(P1, "escale_novo", "label")).toBe("Novo 2");
    expect(item(P2, "escale_novo", "label")).toBe("Novo 2");
  });

  it("gravar sem a chave não apaga: o campo volta pela projeção", () => {
    expect(
      writeCountAs(
        GOV_ADMIN,
        `update public.crm_pipelines set settings = jsonb_set(settings, '{fields}', (select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements(settings->'fields') e where e->>'key' <> 'escale_novo')) where id = '${P1}'`,
      ),
    ).toBe(1);
    expect(noCatalogo(GOV_ORG, "escale_novo")).toBe("1");
    expect(chaves(P1)).toContain("escale_novo");
  });

  it("o serviço (sem sessão de pessoa) também adota", () => {
    sql(`${acrescentar(P2, "escale_servico", "Serviço")};`);
    expect(noCatalogo(GOV_ORG, "escale_servico")).toBe("1");
    expect(chaves(P1)).toContain("escale_servico");
  });

  it("origem nova nasce com o catálogo inteiro", () => {
    sql(`insert into public.crm_pipelines (id, organization_id, name, slug) values ('${P3}', '${GOV_ORG}', 'Escale 9006 C', 'escale-9006-c');`);
    expect(chaves(P3)).toBe(chaves(P1));
    expect(chaves(P3)).toContain("escale_servico");
    sql(`delete from public.crm_pipelines where id = '${P3}';`);
  });
});

describe("reprojetar só reescreve a origem que mudou", () => {
  it("o UPDATE do catálogo que não muda definição nem posição não reescreve nenhuma origem", () => {
    const antesDoCampo = marcaDoCampo(GOV_ORG, "escale_novo");
    const antes = [P1, P2, GOV_PIPELINE].map(marcaDaOrigem);
    sql(`update public.crm_campos_do_negocio set divergencias = '[]'::jsonb where organization_id = '${GOV_ORG}' and chave = 'escale_novo';`);
    expect(marcaDoCampo(GOV_ORG, "escale_novo")).not.toBe(antesDoCampo); // o UPDATE rodou de verdade
    expect([P1, P2, GOV_PIPELINE].map(marcaDaOrigem)).toEqual(antes);
  });

  it("mudar o rótulo reescreve as origens que mudam e deixa a que já estava igual (xmin e updated_at intactos)", () => {
    // P2 já guarda a projeção que o catálogo vai ter: ela não pode ser reescrita.
    sql(`
      begin;
      select set_config('escale.campos_do_crm', 'projetando', true);
      update public.crm_pipelines
         set settings = jsonb_set(settings, '{fields}', (
           select jsonb_agg(case when e->>'key' = 'escale_novo' then e || '{"label":"Novo 3"}'::jsonb else e end)
             from jsonb_array_elements(settings->'fields') e))
       where id = '${P2}';
      commit;
    `);
    expect(item(P2, "escale_novo", "label")).toBe("Novo 3");
    expect(doCatalogo(GOV_ORG, "escale_novo", "definicao->>'label'")).toBe("Novo 2");
    const p2Antes = marcaDaOrigem(P2);
    const p1Antes = marcaDaOrigem(P1);
    const seedAntes = marcaDaOrigem(GOV_PIPELINE);

    expect(
      writeCountAs(GOV_ADMIN, `update public.crm_campos_do_negocio set definicao = definicao || '{"label":"Novo 3"}'::jsonb where organization_id = '${GOV_ORG}' and chave = 'escale_novo'`),
    ).toBe(1);

    expect(marcaDaOrigem(P2)).toBe(p2Antes);
    expect(marcaDaOrigem(P1)).not.toBe(p1Antes);
    expect(marcaDaOrigem(GOV_PIPELINE)).not.toBe(seedAntes);
    for (const origem of [P1, P2, GOV_PIPELINE]) expect(item(origem, "escale_novo", "label")).toBe("Novo 3");
  });
});

describe("a junção dos campos de hoje", () => {
  beforeAll(() => {
    // As origens nascem como eram antes da 9006 (o 'projetando' faz o gatilho da
    // origem deixar a linha como veio; vale só nesta transação). C3 é arquivada e
    // tem posição menor: ainda assim vem depois das ativas. C2 traz um item de
    // 270 KB, acima do teto do catálogo.
    sql(`
      begin;
      select set_config('escale.campos_do_crm', 'projetando', true);
      insert into public.crm_pipelines (id, organization_id, name, slug, position, is_archived, settings) values
        ('${C1}', '${ORG_C}', 'C1', 'escale-9006-c1', 1, false,
         '{"fields":[{"key":"cpf","label":"CPF","type":"text"},{"key":"renda","label":"Renda","type":"number","obrigatorio_em":{"ao_ganhar":true}},{"key":"1ruim","label":"x","type":"text"}]}'::jsonb),
        ('${C2}', '${ORG_C}', 'C2', 'escale-9006-c2', 2, false,
         jsonb_build_object('fields', jsonb_build_array(
           '{"key":"cpf","label":"Documento","type":"number"}'::jsonb,
           '{"key":"bairro","label":"Bairro","type":"text"}'::jsonb,
           jsonb_build_object('key', 'enorme', 'label', 'Enorme', 'type', 'text', 'blob', repeat('a', 270000))))),
        ('${C3}', '${ORG_C}', 'C3', 'escale-9006-c3', 0, true,
         '{"fields":[{"key":"cpf","label":"Antigo","type":"date"},{"key":"renda","label":"Renda","type":"number"},{"key":"extra","label":"Extra","type":"text"}]}'::jsonb);
      commit;
    `);
  });

  const catalogoC = () =>
    sql(`select string_agg(chave || ':' || (definicao->>'type'), ',' order by posicao) from public.crm_campos_do_negocio where organization_id = '${ORG_C}';`);
  const fotoDoCatalogoC = () =>
    sql(
      `select coalesce(string_agg(id::text || '|' || chave || '|' || definicao::text || '|' || posicao || '|' || divergencias::text || '|' || xmin::text || '|' || updated_at::text, ';' order by chave), '') from public.crm_campos_do_negocio where organization_id = '${ORG_C}';`,
    );

  it("as origens de hoje estão como antes (controle: o inválido e o gigante ainda estão nelas)", () => {
    expect(chaves(C1)).toBe("1ruim,cpf,renda");
    expect(chaves(C2)).toBe("bairro,cpf,enorme");
    expect(noCatalogo(ORG_C, "cpf")).toBe("0");
  });

  it("junta por chave: ativas antes das arquivadas, a primeira vence, na ordem dela; inválido e gigante não entram; as origens não são tocadas", () => {
    const antes = [C1, C2, C3].map(marcaDaOrigem);
    // Como na migration: a junção roda antes de o gatilho do catálogo existir.
    sql(`
      begin;
      alter table public.crm_campos_do_negocio disable trigger trg_escale_campos_do_negocio_reprojeta;
      select public.fn_escale_juntar_campos_do_crm();
      alter table public.crm_campos_do_negocio enable trigger trg_escale_campos_do_negocio_reprojeta;
      commit;
    `);
    expect(catalogoC()).toBe("cpf:text,renda:number,bairro:text,extra:text");
    expect(noCatalogo(ORG_C, "1ruim")).toBe("0");
    expect(noCatalogo(ORG_C, "enorme")).toBe("0");
    expect([C1, C2, C3].map(marcaDaOrigem)).toEqual(antes);
    expect(sql(`select tgenabled::text from pg_trigger where tgname = 'trg_escale_campos_do_negocio_reprojeta' and not tgisinternal;`)).toBe("O");
  });

  it("a definição perdedora fica inteira em divergencias, na ordem do painel", () => {
    expect(doCatalogo(ORG_C, "cpf", "jsonb_array_length(divergencias)")).toBe("2");
    expect(doCatalogo(ORG_C, "cpf", "(divergencias->0->>'origem') || '|' || (divergencias->0->>'origem_id') || '|' || (divergencias->0->'definicao'->>'type') || '|' || (divergencias->0->'definicao'->>'label')")).toBe(`C2|${C2}|number|Documento`);
    expect(doCatalogo(ORG_C, "cpf", "(divergencias->1->>'origem') || '|' || (divergencias->1->'definicao'->>'type') || '|' || (divergencias->1->'definicao'->>'label')")).toBe("C3|date|Antigo");
    // sem divergência: quem só difere em obrigatorio_em, e quem só existe numa origem
    expect(doCatalogo(ORG_C, "renda", "jsonb_array_length(divergencias)")).toBe("0");
    expect(doCatalogo(ORG_C, "bairro", "jsonb_array_length(divergencias)")).toBe("0");
    expect(doCatalogo(ORG_C, "extra", "jsonb_array_length(divergencias)")).toBe("0");
  });

  it("rodar de novo não muda nada (catálogo, ids, xmin e updated_at idênticos; origens intocadas)", () => {
    const foto = fotoDoCatalogoC();
    const origens = [C1, C2, C3].map(marcaDaOrigem);
    sql(`select public.fn_escale_juntar_campos_do_crm();`);
    expect(fotoDoCatalogoC()).toBe(foto);
    expect(catalogoC()).toBe("cpf:text,renda:number,bairro:text,extra:text");
    expect(sql(`select count(*) from public.crm_campos_do_negocio where organization_id = '${ORG_C}';`)).toBe("4");
    expect([C1, C2, C3].map(marcaDaOrigem)).toEqual(origens);
  });

  it("projetar: todas as origens ficam com o catálogo, a regra de C1 fica só em C1, o inválido e o gigante somem", () => {
    sql(`update public.crm_pipelines set settings = settings where organization_id = '${ORG_C}';`);
    for (const origem of [C1, C2, C3]) expect(chaves(origem)).toBe("bairro,cpf,extra,renda");
    expect(item(C2, "cpf", "type")).toBe("text");
    expect(item(C3, "cpf", "label")).toBe("CPF");
    expect(temRegra(C1, "renda")).toBe("1");
    expect(regra(C1, "renda", "ao_ganhar")).toBe("true");
    expect(temRegra(C2, "renda")).toBe("0");
    expect(temRegra(C3, "renda")).toBe("0");
    // projetar não mexeu no catálogo: a divergência continua lá, a definição do C2 não foi adotada
    expect(doCatalogo(ORG_C, "cpf", "definicao->>'type'")).toBe("text");
    expect(doCatalogo(ORG_C, "cpf", "jsonb_array_length(divergencias)")).toBe("2");
    expect(noCatalogo(ORG_C, "enorme")).toBe("0");
  });

  it("rodar a junção de novo sobre as origens já projetadas também não muda nada", () => {
    const foto = fotoDoCatalogoC();
    sql(`select public.fn_escale_juntar_campos_do_crm();`);
    expect(fotoDoCatalogoC()).toBe(foto);
  });
});

describe("as funções novas não são alcançáveis pela sessão", () => {
  it.each([
    "public.fn_escale_campo_valido(jsonb)",
    "public.fn_escale_campos_projetados(uuid, jsonb)",
    "public.fn_escale_juntar_campos_do_crm()",
    "public.fn_escale_pipeline_campos_do_crm()",
    "public.fn_escale_campos_do_negocio_reprojeta()",
  ])("%s", (funcao) => {
    expect(sql(`select has_function_privilege('authenticated', '${funcao}', 'execute');`)).toBe("f");
    expect(sql(`select has_function_privilege('anon', '${funcao}', 'execute');`)).toBe("f");
  });
});
