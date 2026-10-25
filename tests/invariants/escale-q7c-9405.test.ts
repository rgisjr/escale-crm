import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_MANAGER,
  GOV_ORG,
  GOV_SESSION,
  indexExists,
  lastLine,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * REVISÃO Q7c (fork Escale, migration 9405) — prova contra Postgres real: `fn_escale_fila_tem_grupos`
 * (EXISTS) responde o mesmo que `fn_escale_contar_fila_da_casca(grupos) > 0`, com a RLS de quem
 * pergunta, e respeita o que a fila esconde (contato pessoal); a função é invoker e fechada ao
 * `anon`; o índice parcial só guarda grupos. Roda via `pnpm test:db`.
 */
const P = "e5ca1e00-9405-4000-8000-";
const CONTATO = `${P}0000000000c1`;
const PESSOAL = `${P}0000000000c2`;
const GRUPO = `${P}0000000000d1`;
const GRUPO_PESSOAL = `${P}0000000000d2`;

const comPessoa = (quem: string, consulta: string) =>
  lastLine(
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${quem}"}', false);
      ${consulta}
    `),
  );
const temGrupos = (quem: string) =>
  comPessoa(quem, `select public.fn_escale_fila_tem_grupos('${GOV_ORG}');`);
const contagem = (quem: string) =>
  Number(
    comPessoa(
      quem,
      `select public.fn_escale_contar_fila_da_casca('${GOV_ORG}', '{"grupos":"grupos"}'::jsonb);`,
    ),
  );
const limpar = () =>
  sql(`
    delete from public.conversations where id::text like '${P}%';
    delete from public.contacts where id::text like '${P}%';
  `);

beforeAll(() => {
  seedGov();
  limpar();
  sql(`
    insert into public.contacts (id, organization_id, display_name, is_personal) values
      ('${CONTATO}', '${GOV_ORG}', 'Q7c Grupo', false),
      ('${PESSOAL}', '${GOV_ORG}', 'Q7c Pessoal', true);
  `);
});

afterAll(limpar);

describe("fn_escale_fila_tem_grupos (9405)", () => {
  it("sem grupo, é falso; com um grupo visível, é verdadeiro — e bate com a contagem", () => {
    expect(contagem(GOV_MANAGER)).toBe(0);
    expect(temGrupos(GOV_MANAGER)).toBe("f");
    for (const quem of [GOV_MANAGER, GOV_AGENT_A, GOV_AGENT_B]) {
      expect(temGrupos(quem)).toBe(contagem(quem) > 0 ? "t" : "f");
    }
    sql(`
      insert into public.conversations
        (id, organization_id, contact_id, channel_session_id, status, is_group)
        values ('${GRUPO}', '${GOV_ORG}', '${CONTATO}', '${GOV_SESSION}', 'open', true);
    `);
    expect(temGrupos(GOV_MANAGER)).toBe("t");
    expect(contagem(GOV_MANAGER)).toBeGreaterThan(0);
    for (const quem of [GOV_MANAGER, GOV_AGENT_A, GOV_AGENT_B]) {
      expect(temGrupos(quem)).toBe(contagem(quem) > 0 ? "t" : "f");
    }
  });

  it("grupo de contato pessoal não conta (o que a fila esconde)", () => {
    sql(`delete from public.conversations where id = '${GRUPO}';
      insert into public.conversations
        (id, organization_id, contact_id, channel_session_id, status, is_group)
        values ('${GRUPO_PESSOAL}', '${GOV_ORG}', '${PESSOAL}', '${GOV_SESSION}', 'open', true);`);
    expect(temGrupos(GOV_MANAGER)).toBe("f");
    expect(
      comPessoa(
        GOV_MANAGER,
        `select exists (select 1 from public.conversations c where c.id = '${GRUPO_PESSOAL}'
           and public.fn_escale_conversa_passa(c, '{"grupos":"grupos"}'::jsonb));`,
      ),
    ).toBe("f");
  });

  it("é invoker e o anon não executa", () => {
    expect(
      sql(
        `select prosecdef from pg_proc where proname = 'fn_escale_fila_tem_grupos';`,
      ).trim(),
    ).toBe("f");
    expect(
      sql(
        `select has_function_privilege('anon', 'public.fn_escale_fila_tem_grupos(uuid)', 'execute');`,
      ).trim(),
    ).toBe("f");
  });

  it("o índice parcial só guarda grupos", () => {
    expect(indexExists("idx_conversations_org_grupos")).toBe(true);
    expect(
      sql(
        `select indexdef from pg_indexes where schemaname = 'public' and indexname = 'idx_conversations_org_grupos';`,
      ).trim(),
    ).toMatch(/\(organization_id\) WHERE is_group$/);
  });
});
