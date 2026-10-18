import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_CONTACT_1,
  GOV_CONTACT_2,
  GOV_LEAD,
  GOV_MANAGER,
  GOV_ORG,
  GOV_PIPELINE,
  GOV_STAGE,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * NOTAS E ARQUIVOS DA FICHA (fork Escale, migration 9008) — prova contra Postgres
 * real: zero linhas do vizinho nos dois sentidos, viewer não escreve, agent
 * escreve só como autor, o autor apaga o que é seu, gerente apaga o dos outros,
 * e a FK composta recusa nota de negócio de outra organização.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const ORG_B = "e5ca1e00-9008-4000-8000-000000000001";
const USER_B = "e5ca1e00-9008-4000-8000-000000000002";
const CONTATO_B = "e5ca1e00-9008-4000-8000-000000000003";
const FUNIL_B = "e5ca1e00-9008-4000-8000-000000000004";
const ETAPA_B = "e5ca1e00-9008-4000-8000-000000000005";
const LEAD_B = "e5ca1e00-9008-4000-8000-000000000006";
const LEAD_DO_B_AGENT = "e5ca1e00-9008-4000-8000-000000000007";
const NOTA_A = "e5ca1e00-9008-4000-8000-000000000011";
const NOTA_DO_B_AGENT = "e5ca1e00-9008-4000-8000-000000000012";
const NOTA_B = "e5ca1e00-9008-4000-8000-000000000013";
const ARQ_A = "e5ca1e00-9008-4000-8000-000000000021";
const ARQ_B = "e5ca1e00-9008-4000-8000-000000000022";

/** Texto de erro (mensagem + stderr do psql) de uma chamada que deve falhar; "" se não falhar. */
function erroDe(fn: () => unknown): string {
  try {
    fn();
    return "";
  } catch (err) {
    const e = err as { message?: string; stderr?: string };
    return `${e.message ?? ""} ${e.stderr ?? ""}`;
  }
}

/** Roda `corpo` como a role dada (e, se for authenticated, com as claims do usuário) DENTRO de uma
 * transação que sempre volta atrás; devolve a linha `RESULT:` que o corpo imprimiu. */
function resultadoComoRole(
  role: "authenticated" | "service_role",
  userId: string | null,
  corpo: string,
): string {
  const claims = userId
    ? `select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);`
    : "";
  const out = sql(`
    begin;
    set local role ${role};
    ${claims}
    ${corpo}
    rollback;
  `);
  const linha = out.split("\n").find((l) => l.startsWith("RESULT:"));
  if (!linha) throw new Error(`sem linha RESULT: ${out}`);
  return linha.slice("RESULT:".length);
}

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email) values ('${USER_B}', 'escale-notas-b@invariant.test') on conflict do nothing;
    update auth.users set raw_user_meta_data = '{"full_name":"Admin B Verdadeiro"}'::jsonb where id = '${USER_B}';
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-notas-b', 'Escale Notas Org B', 'Escale NB') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now()) on conflict do nothing;
    insert into public.contacts (id, organization_id, name) values ('${CONTATO_B}', '${ORG_B}', 'Contato B') on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug) values ('${FUNIL_B}', '${ORG_B}', 'Funil B', 'escale-notas-funil-b') on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position)
      values ('${ETAPA_B}', '${ORG_B}', '${FUNIL_B}', 'Etapa B', 'etapa-b', 0) on conflict do nothing;
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, contact_id, title)
      values ('${LEAD_B}', '${ORG_B}', '${FUNIL_B}', '${ETAPA_B}', '${CONTATO_B}', 'Negócio B') on conflict do nothing;
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, owner_user_id, title)
      values ('${LEAD_DO_B_AGENT}', '${GOV_ORG}', '${GOV_PIPELINE}', '${GOV_STAGE}', '${GOV_AGENT_B}', 'Negócio do agent B') on conflict do nothing;
    insert into public.crm_notas_do_negocio (id, organization_id, lead_id, contact_id, user_id, user_nome, texto) values
      ('${NOTA_A}', '${GOV_ORG}', '${GOV_LEAD}', '${GOV_CONTACT_1}', '${GOV_AGENT_A}', 'Agent A', 'nota da A'),
      ('${NOTA_DO_B_AGENT}', '${GOV_ORG}', '${GOV_LEAD}', '${GOV_CONTACT_1}', '${GOV_AGENT_B}', 'Agent B', 'nota do agent B'),
      ('${NOTA_B}', '${ORG_B}', '${LEAD_B}', '${CONTATO_B}', '${USER_B}', 'B', 'nota da B')
      on conflict do nothing;
    insert into public.crm_arquivos_do_contato (id, organization_id, contact_id, lead_id, user_id, user_nome, nome, extensao, mime, tamanho, storage_path) values
      ('${ARQ_A}', '${GOV_ORG}', '${GOV_CONTACT_1}', '${GOV_LEAD}', '${GOV_AGENT_A}', 'Agent A', 'contrato.pdf', 'pdf', 'application/pdf', 1234, '${GOV_ORG}/${GOV_CONTACT_1}/a.pdf'),
      ('${ARQ_B}', '${ORG_B}', '${CONTATO_B}', null, '${USER_B}', 'B', 'foto.png', 'png', 'image/png', 99, '${ORG_B}/${CONTATO_B}/b.png')
      on conflict do nothing;
  `);
});

describe("autoria e data carimbadas pelo banco (trigger de INSERT)", () => {
  const FORJADO = "Fulano Forjado";
  const nota = (org: string, lead: string, autor: string) =>
    `insert into public.crm_notas_do_negocio (organization_id, lead_id, user_id, user_nome, texto, created_at)
       values ('${org}', '${lead}', '${autor}', '${FORJADO}', 'carimbo', '2001-01-01T00:00:00Z')
       returning user_nome, created_at`;
  const arquivo = (org: string, contato: string, autor: string) =>
    `insert into public.crm_arquivos_do_contato (organization_id, contact_id, user_id, user_nome, nome, extensao, mime, tamanho, storage_path, created_at)
       values ('${org}', '${contato}', '${autor}', '${FORJADO}', 'n.pdf', 'pdf', 'application/pdf', 1, '${org}/${contato}/carimbo.pdf', '2001-01-01T00:00:00Z')
       returning user_nome, created_at`;
  /** `nome|true` quando created_at é o relógio do banco (na mesma transação now() é fixo). */
  const medir = (insert: string) =>
    `with i as (${insert}) select 'RESULT:' || coalesce(user_nome, '<nulo>') || '|' || (created_at = now())::text from i;`;

  it("authenticated: o nome vem do perfil de quem grava e a data é a do banco (nota e arquivo)", () => {
    for (const insert of [nota(ORG_B, LEAD_B, USER_B), arquivo(ORG_B, CONTATO_B, USER_B)]) {
      expect(resultadoComoRole("authenticated", USER_B, medir(insert))).toBe(
        "Admin B Verdadeiro|true",
      );
    }
  });

  it("authenticated sem nome no perfil: o nome forjado é descartado (fica nulo), nunca mantido", () => {
    expect(
      resultadoComoRole("authenticated", GOV_AGENT_A, medir(nota(GOV_ORG, GOV_LEAD, GOV_AGENT_A))),
    ).toBe("<nulo>|true");
    expect(
      resultadoComoRole(
        "authenticated",
        GOV_AGENT_A,
        medir(arquivo(GOV_ORG, GOV_CONTACT_1, GOV_AGENT_A)),
      ),
    ).toBe("<nulo>|true");
  });

  it("service role (rotas, sem auth.uid()): o nome informado é mantido, a data continua do banco", () => {
    for (const insert of [nota(ORG_B, LEAD_B, USER_B), arquivo(ORG_B, CONTATO_B, USER_B)]) {
      expect(resultadoComoRole("service_role", null, medir(insert))).toBe(`${FORJADO}|true`);
    }
  });

  it("a função do trigger não é executável por anon nem authenticated (só dispara)", () => {
    expect(
      sql(`select has_function_privilege('anon', 'public.fn_escale_carimbar_autoria()', 'EXECUTE')::text
                 || ',' || has_function_privilege('authenticated', 'public.fn_escale_carimbar_autoria()', 'EXECUTE')::text`),
    ).toBe("false,false");
  });
});

describe("caminho do arquivo: pasta da organização, sem `..`", () => {
  const com = (path: string) =>
    `insert into public.crm_arquivos_do_contato (organization_id, contact_id, user_id, nome, extensao, mime, tamanho, storage_path)
       values ('${GOV_ORG}', '${GOV_CONTACT_1}', '${GOV_AGENT_A}', 'n.pdf', 'pdf', 'application/pdf', 1, '${path}')`;

  it("recusa caminho fora da pasta da organização e caminho com `..`", () => {
    for (const path of [
      "solto.pdf",
      `${ORG_B}/${GOV_CONTACT_1}/x.pdf`,
      `${GOV_ORG}/${GOV_CONTACT_1}/../../${ORG_B}/x.pdf`,
    ]) {
      expect(erroDe(() => sql(com(path)))).toMatch(/crm_arquivos_do_contato_caminho_valido/);
    }
  });

  it("aceita o caminho que a rota monta (org/contato/id.ext), sem amarrar ao contato", () => {
    const ok = `${GOV_ORG}/${GOV_CONTACT_2}/e5ca1e00-9008-4000-8000-0000000000aa.pdf`;
    expect(
      resultadoComoRole(
        "service_role",
        null,
        `with i as (${com(ok)} returning 1) select 'RESULT:' || count(*) from i;`,
      ),
    ).toBe("1");
  });
});

describe("INSERT e UPDATE/DELETE da nota respeitam a visibilidade do negócio por conta própria", () => {
  const SONDA = "sonda-m3-politica-de-insert";
  const ORFA = "e5ca1e00-9008-4000-8000-0000000000b1";
  const insertSemRetorno = (autor: string) =>
    `insert into public.crm_notas_do_negocio (organization_id, lead_id, user_id, texto) values ('${GOV_ORG}', '${LEAD_DO_B_AGENT}', '${autor}', '${SONDA}')`;
  const comoAgent = (userId: string, corpo: string) =>
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
      ${corpo};
    `);

  it("INSERT sem RETURNING (a policy de SELECT não mascara): agent não grava em negócio que não enxerga", () => {
    expect(erroDe(() => comoAgent(GOV_AGENT_A, insertSemRetorno(GOV_AGENT_A)))).toMatch(
      /row-level security/,
    );
    expect(sql(`select count(*) from public.crm_notas_do_negocio where texto = '${SONDA}'`)).toBe(
      "0",
    );
  });

  it("controle positivo: o dono do negócio grava a mesma nota sem RETURNING", () => {
    expect(
      resultadoComoRole(
        "authenticated",
        GOV_AGENT_B,
        `${insertSemRetorno(GOV_AGENT_B)};
         reset role;
         select 'RESULT:' || count(*) from public.crm_notas_do_negocio where texto = '${SONDA}';`,
      ),
    ).toBe("1");
  });

  // A nota órfã: o autor (agent A) escreveu quando o negócio era dele; o negócio passou a outro dono
  // e A deixou de enxergá-lo. UPDATE/DELETE SEM WHERE não lê coluna, então a policy de SELECT não
  // entra: só a repetição do `exists` na própria policy segura.
  const rodarComOrfa = (corpo: string, medicao: string): string => {
    const out = sql(`
      begin;
      insert into public.crm_notas_do_negocio (id, organization_id, lead_id, user_id, texto)
        values ('${ORFA}', '${GOV_ORG}', '${LEAD_DO_B_AGENT}', '${GOV_AGENT_A}', 'orfa');
      set local role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${GOV_AGENT_A}"}', false);
      ${corpo}
      reset role;
      ${medicao}
      rollback;
    `);
    const linha = out.split("\n").find((l) => l.startsWith("RESULT:"));
    if (!linha) throw new Error(`sem linha RESULT: ${out}`);
    return linha.slice("RESULT:".length);
  };

  it("UPDATE sem filtro não altera a nota de negócio que o autor deixou de enxergar", () => {
    expect(
      rodarComOrfa(
        "update public.crm_notas_do_negocio set texto = 'invadida';",
        `select 'RESULT:' || texto from public.crm_notas_do_negocio where id = '${ORFA}';`,
      ),
    ).toBe("orfa");
  });

  it("DELETE sem filtro não apaga a nota de negócio que o autor deixou de enxergar", () => {
    expect(
      rodarComOrfa(
        "delete from public.crm_notas_do_negocio;",
        `select 'RESULT:' || count(*) from public.crm_notas_do_negocio where id = '${ORFA}';`,
      ),
    ).toBe("1");
  });
});

describe("escrita cruzada entre organizações (admin da B contra a org A) e anon", () => {
  const notaDaA = (autor: string) =>
    `insert into public.crm_notas_do_negocio (organization_id, lead_id, user_id, texto) values ('${GOV_ORG}', '${GOV_LEAD}', '${autor}', 'invasora')`;
  const arquivoDaA = (autor: string) =>
    `insert into public.crm_arquivos_do_contato (organization_id, contact_id, user_id, nome, extensao, mime, tamanho, storage_path) values ('${GOV_ORG}', '${GOV_CONTACT_1}', '${autor}', 'n.pdf', 'pdf', 'application/pdf', 1, '${GOV_ORG}/${GOV_CONTACT_1}/invasor.pdf')`;

  it("o admin da B não insere, não edita e não apaga nota da org A (nem assinando como si mesmo)", () => {
    expect(writeCountAs(USER_B, notaDaA(USER_B))).toBe(0);
    expect(writeCountAs(USER_B, notaDaA(GOV_AGENT_A))).toBe(0);
    expect(
      writeCountAs(
        USER_B,
        `update public.crm_notas_do_negocio set texto = 'x' where id = '${NOTA_A}'`,
      ),
    ).toBe(0);
    expect(
      writeCountAs(USER_B, `delete from public.crm_notas_do_negocio where id = '${NOTA_A}'`),
    ).toBe(0);
    expect(
      sql(
        `select count(*) from public.crm_notas_do_negocio where id = '${NOTA_A}' and texto <> 'x'`,
      ),
    ).toBe("1");
  });

  it("o admin da B não envia nem apaga arquivo da org A; e lê o da própria org (controle positivo)", () => {
    expect(writeCountAs(USER_B, arquivoDaA(USER_B))).toBe(0);
    expect(
      writeCountAs(USER_B, `delete from public.crm_arquivos_do_contato where id = '${ARQ_A}'`),
    ).toBe(0);
    expect(sql(`select count(*) from public.crm_arquivos_do_contato where id = '${ARQ_A}'`)).toBe(
      "1",
    );
    expect(
      countAs(
        USER_B,
        `select count(*) from public.crm_arquivos_do_contato where organization_id = '${ORG_B}'`,
      ),
    ).toBe(1);
  });

  it("anon não lê nem escreve nas duas tabelas", () => {
    for (const tabela of ["crm_notas_do_negocio", "crm_arquivos_do_contato"]) {
      expect(erroDe(() => sql(`set role anon; select count(*) from public.${tabela};`))).toMatch(
        /permission denied/,
      );
    }
    expect(erroDe(() => sql(`set role anon; ${notaDaA(GOV_AGENT_A)};`))).toMatch(
      /permission denied/,
    );
    expect(erroDe(() => sql(`set role anon; ${arquivoDaA(GOV_AGENT_A)};`))).toMatch(
      /permission denied/,
    );
  });
});

describe("notas: isolamento e papéis", () => {
  it("a organização vê as suas e ZERO do vizinho, nos dois sentidos", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.crm_notas_do_negocio where organization_id = '${GOV_ORG}'`,
      ),
    ).toBe(2);
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.crm_notas_do_negocio where organization_id = '${ORG_B}'`,
      ),
    ).toBe(0);
    expect(
      countAs(
        USER_B,
        `select count(*) from public.crm_notas_do_negocio where organization_id = '${GOV_ORG}'`,
      ),
    ).toBe(0);
    expect(
      countAs(
        USER_B,
        `select count(*) from public.crm_notas_do_negocio where organization_id = '${ORG_B}'`,
      ),
    ).toBe(1);
  });

  it("viewer não escreve; agent escreve só como autor", () => {
    const linha = (autor: string) =>
      `insert into public.crm_notas_do_negocio (organization_id, lead_id, contact_id, user_id, texto) values ('${GOV_ORG}', '${GOV_LEAD}', '${GOV_CONTACT_1}', '${autor}', 'x')`;
    expect(writeCountAs(GOV_VIEWER, linha(GOV_VIEWER))).toBe(0);
    expect(writeCountAs(GOV_AGENT_A, linha(GOV_AGENT_B))).toBe(0);
    expect(writeCountAs(GOV_AGENT_A, linha(GOV_AGENT_A))).toBe(1);
  });

  it("o autor apaga a sua, não a do outro; gerente apaga a dos outros", () => {
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `delete from public.crm_notas_do_negocio where id = '${NOTA_DO_B_AGENT}'`,
      ),
    ).toBe(0);
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `update public.crm_notas_do_negocio set texto = 'editada' where id = '${NOTA_A}'`,
      ),
    ).toBe(1);
    expect(
      writeCountAs(
        GOV_MANAGER,
        `delete from public.crm_notas_do_negocio where id = '${NOTA_DO_B_AGENT}'`,
      ),
    ).toBe(1);
  });

  it("agent não escreve nem lê nota de negócio que não enxerga (de outro dono)", () => {
    const linha = `insert into public.crm_notas_do_negocio (organization_id, lead_id, user_id, texto) values ('${GOV_ORG}', '${LEAD_DO_B_AGENT}', '${GOV_AGENT_A}', 'x')`;
    expect(writeCountAs(GOV_AGENT_A, linha)).toBe(0);
    expect(writeCountAs(GOV_AGENT_B, linha.replace(GOV_AGENT_A, GOV_AGENT_B))).toBe(1);
    expect(
      countAs(
        GOV_AGENT_A,
        `select count(*) from public.crm_notas_do_negocio where lead_id = '${LEAD_DO_B_AGENT}'`,
      ),
    ).toBe(0);
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.crm_notas_do_negocio where lead_id = '${LEAD_DO_B_AGENT}'`,
      ),
    ).toBe(1);
  });

  it("gerente não assina como outro autor; ninguém move a nota nem troca o autor (só o texto edita)", () => {
    const linha = `insert into public.crm_notas_do_negocio (organization_id, lead_id, user_id, texto) values ('${GOV_ORG}', '${GOV_LEAD}', '${GOV_AGENT_A}', 'x')`;
    expect(writeCountAs(GOV_MANAGER, linha)).toBe(0);
    for (const coluna of [
      `lead_id = '${GOV_LEAD}'`,
      `user_id = '${GOV_MANAGER}'`,
      `organization_id = '${ORG_B}'`,
    ]) {
      expect(
        erroDe(() =>
          writeCountAs(
            GOV_MANAGER,
            `update public.crm_notas_do_negocio set ${coluna} where id = '${NOTA_A}'`,
          ),
        ),
      ).toMatch(/permission denied/);
    }
  });

  it("a FK composta recusa nota apontando para contato de outra organização", () => {
    expect(
      erroDe(() =>
        sql(
          `insert into public.crm_notas_do_negocio (organization_id, lead_id, contact_id, user_id, texto) values ('${GOV_ORG}', '${GOV_LEAD}', '${CONTATO_B}', '${GOV_AGENT_A}', 'x')`,
        ),
      ),
    ).toMatch(/foreign key/);
  });

  it("a FK composta recusa nota apontando para negócio de outra organização", () => {
    expect(
      erroDe(() =>
        sql(
          `insert into public.crm_notas_do_negocio (organization_id, lead_id, user_id, texto) values ('${GOV_ORG}', '${LEAD_B}', '${GOV_AGENT_A}', 'x')`,
        ),
      ),
    ).toMatch(/foreign key/);
  });
});

describe("arquivos: isolamento e papéis", () => {
  it("a organização vê os seus e ZERO do vizinho", () => {
    expect(
      countAs(
        GOV_VIEWER,
        `select count(*) from public.crm_arquivos_do_contato where organization_id = '${GOV_ORG}'`,
      ),
    ).toBe(1);
    expect(
      countAs(
        GOV_VIEWER,
        `select count(*) from public.crm_arquivos_do_contato where organization_id = '${ORG_B}'`,
      ),
    ).toBe(0);
    expect(
      countAs(
        USER_B,
        `select count(*) from public.crm_arquivos_do_contato where organization_id = '${GOV_ORG}'`,
      ),
    ).toBe(0);
  });

  it("viewer não envia; agent envia como autor; apaga o autor ou gerente", () => {
    const linha = (autor: string, path: string) =>
      `insert into public.crm_arquivos_do_contato (organization_id, contact_id, user_id, nome, extensao, mime, tamanho, storage_path) values ('${GOV_ORG}', '${GOV_CONTACT_1}', '${autor}', 'n.pdf', 'pdf', 'application/pdf', 1, '${path}')`;
    const caminho = (nome: string) => `${GOV_ORG}/${GOV_CONTACT_1}/${nome}`;
    expect(writeCountAs(GOV_VIEWER, linha(GOV_VIEWER, caminho("v.pdf")))).toBe(0);
    expect(writeCountAs(GOV_AGENT_B, linha(GOV_AGENT_B, caminho("b1.pdf")))).toBe(1);
    expect(
      writeCountAs(GOV_AGENT_B, `delete from public.crm_arquivos_do_contato where id = '${ARQ_A}'`),
    ).toBe(0);
    expect(
      writeCountAs(GOV_MANAGER, `delete from public.crm_arquivos_do_contato where id = '${ARQ_A}'`),
    ).toBe(1);
  });
});
