import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, lastLine, seedGov, sql } from "./gov-helpers";

/**
 * DISPAROS DE COMENTÁRIO (fork Escale, migration 9801) — prova contra Postgres real: a RLS (a
 * organização lê, ninguém logado grava), os dois índices únicos (por comentário e por pessoa), a
 * trava de mesma organização, o resumo do Insights e o cascade. Roda via `pnpm test:db`.
 */
const ID = (sufixo: string) => `e5ca1e00-9801-4000-8000-${sufixo.padStart(12, "0")}`;
const OUTRA_ORG = ID("f1");
const REGRA = ID("a1");
const REGRA_OUTRA = ID("a2");
const ACOES = `[{"type":"send_instagram_message","config":{}}]`;

const como = (userId: string, consulta: string): string =>
  sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${userId}"}', false); ${consulta}`);

/** Insere como service_role (a única que grava). Devolve a saída do psql, erro incluído. */
const gravar = (org: string, regra: string, campos: Record<string, string | boolean>): string => {
  const base: Record<string, string | boolean> = {
    caminho_id: "qualquer",
    plataforma: "instagram",
    comentario_id: "c-x",
    publicacao_id: "p-1",
    autor_id: "a-x",
    texto: "oi",
    ...campos,
  };
  const colunas = Object.keys(base).join(", ");
  const valores = Object.values(base)
    .map((v) => (typeof v === "boolean" ? String(v) : `'${v}'`))
    .join(", ");
  return sql(
    `set role service_role; insert into public.escale_disparos_de_comentario (organization_id, rule_id, comentado_em, ${colunas})
     values ('${org}', '${regra}', now(), ${valores});`,
  );
};

const resumo = (userId: string, regra: string, desde: string): Record<string, number> =>
  JSON.parse(lastLine(como(userId, `select public.fn_escale_resumo_dos_comentarios('${regra}', ${desde});`)));

const tentar = (consulta: string): string => {
  try {
    return sql(consulta);
  } catch (e) {
    return String((e as Error).message);
  }
};

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', 'org-9801', 'Org 9801', 'Org 9801') on conflict (id) do nothing;
    delete from public.automation_rules where id::text like 'e5ca1e00-9801-%';
    insert into public.automation_rules (id, organization_id, name, trigger_event, trigger_config, conditions, actions, is_active) values
      ('${REGRA}', '${GOV_ORG}', 'Regra 9801', 'comment.received', '{}', '[]', '${ACOES}', true),
      ('${REGRA_OUTRA}', '${OUTRA_ORG}', 'Regra 9801 outra', 'comment.received', '{}', '[]', '${ACOES}', true);
  `);
  gravar(GOV_ORG, REGRA, { comentario_id: "c-1", autor_id: "a-1", direct: "enviado", resposta: "publicada" });
  gravar(GOV_ORG, REGRA, { comentario_id: "c-2", autor_id: "a-2", direct: "falhou", resposta: "falhou", motivo: "prazo_vencido" });
  gravar(GOV_ORG, REGRA, { comentario_id: "c-3", autor_id: "a-1", repetido: true, direct: "pulado", resposta: "pulada" });
  gravar(OUTRA_ORG, REGRA_OUTRA, { comentario_id: "c-9", autor_id: "a-9" });
});

describe("RLS", () => {
  it("o membro da organização lê as linhas dela e não as da outra", () => {
    const minha = como(GOV_AGENT_A, `select count(*) from public.escale_disparos_de_comentario where rule_id = '${REGRA}';`);
    const alheia = como(GOV_AGENT_A, `select count(*) from public.escale_disparos_de_comentario where rule_id = '${REGRA_OUTRA}';`);
    expect(lastLine(minha)).toBe("3");
    expect(lastLine(alheia)).toBe("0");
  });

  it("anon não lê nada", () => {
    expect(tentar(`set role anon; select count(*) from public.escale_disparos_de_comentario;`)).toMatch(/permission denied/i);
  });

  it("authenticated não grava", () => {
    const id = lastLine(sql(`select id from public.escale_disparos_de_comentario where comentario_id = 'c-1' and rule_id = '${REGRA}';`));
    for (const dml of [
      `insert into public.escale_disparos_de_comentario (organization_id, rule_id, caminho_id, plataforma, comentario_id, publicacao_id, autor_id, texto, comentado_em) values ('${GOV_ORG}', '${REGRA}', 'q', 'instagram', 'c-z', 'p', 'a-z', 'oi', now())`,
      `update public.escale_disparos_de_comentario set motivo = 'x' where id = '${id}'`,
      `delete from public.escale_disparos_de_comentario where id = '${id}'`,
    ]) {
      expect(tentar(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${GOV_MANAGER}"}', false); ${dml};`)).toMatch(/permission denied/i);
    }
  });
});

describe("índices únicos", () => {
  it("o mesmo comentário na mesma regra → 23505", () => {
    expect(tentar(`${"set role service_role;"} insert into public.escale_disparos_de_comentario (organization_id, rule_id, caminho_id, plataforma, comentario_id, publicacao_id, autor_id, texto, comentado_em) values ('${GOV_ORG}', '${REGRA}', 'q', 'instagram', 'c-1', 'p', 'a-novo', 'oi', now());`)).toMatch(
      /uq_escale_disparos_de_comentario_comentario/,
    );
  });

  it("a mesma pessoa na mesma regra já não é barrada por índice", () => {
    // 9804 trocou o índice pela função fn_escale_reivindicar_disparo (provada em escale-comentarios-9804).
    expect(tentar(`begin; set local role service_role; insert into public.escale_disparos_de_comentario (organization_id, rule_id, caminho_id, plataforma, comentario_id, publicacao_id, autor_id, texto, comentado_em) values ('${GOV_ORG}', '${REGRA}', 'q', 'instagram', 'c-novo', 'p', 'a-1', 'oi', now()); rollback;`)).not.toMatch(
      /error/i,
    );
    expect(gravar(GOV_ORG, REGRA, { comentario_id: "c-4", autor_id: "a-1", repetido: true })).not.toMatch(/error/i);
  });
});

describe("mesma organização", () => {
  it("linha com a organização diferente da regra é recusada", () => {
    expect(tentar(`set role service_role; insert into public.escale_disparos_de_comentario (organization_id, rule_id, caminho_id, plataforma, comentario_id, publicacao_id, autor_id, texto, comentado_em) values ('${OUTRA_ORG}', '${REGRA}', 'q', 'instagram', 'c-w', 'p', 'a-w', 'oi', now());`)).toMatch(
      /automacao_de_outra_organizacao/,
    );
  });
});

describe("resumo", () => {
  it("conta comentários, repetidos, directs e respostas (a RLS filtra)", () => {
    expect(resumo(GOV_AGENT_A, REGRA, "null")).toMatchObject({
      comentarios: 2,
      repetidos: 2,
      directs: 1,
      directs_com_falha: 1,
      respostas: 1,
      respostas_com_falha: 1,
    });
  });

  it("outra organização vê tudo zero", () => {
    expect(resumo(GOV_AGENT_A, REGRA_OUTRA, "null")).toMatchObject({ comentarios: 0, repetidos: 0, directs: 0, respostas: 0 });
  });

  it("p_desde no futuro → zero", () => {
    expect(resumo(GOV_AGENT_A, REGRA, "now() + interval '1 day'")).toMatchObject({ comentarios: 0, repetidos: 0 });
  });
});

describe("cascade", () => {
  it("apagar a regra apaga as linhas", () => {
    sql(`delete from public.automation_rules where id = '${REGRA_OUTRA}';`);
    expect(lastLine(sql(`select count(*) from public.escale_disparos_de_comentario where rule_id = '${REGRA_OUTRA}';`))).toBe("0");
  });
});
