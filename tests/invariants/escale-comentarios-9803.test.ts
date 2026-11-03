import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, indexExists, lastLine, seedGov, sql } from "./gov-helpers";

/**
 * AÇÕES NO COMENTÁRIO (fork Escale, migration 9803) — prova contra Postgres real: a RLS (a
 * organização lê, ninguém logado grava), o índice único parcial do direct (um por comentário) e os
 * `check` da tabela. Roda via `pnpm test:db`.
 */
const ID = (sufixo: string) => `e5ca1e00-9803-4000-8000-${sufixo.padStart(12, "0")}`;
const OUTRA_ORG = ID("f1");

const como = (userId: string, consulta: string): string =>
  sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${userId}"}', false); ${consulta}`);

const tentar = (consulta: string): string => {
  try {
    return sql(consulta);
  } catch (e) {
    return String((e as Error).message);
  }
};

/** Insere como service_role (a única que grava). Devolve a saída do psql, erro incluído. */
const gravar = (org: string, campos: Record<string, string>): string => {
  const base: Record<string, string> = {
    plataforma: "instagram",
    comentario_id: "c-x",
    publicacao_id: "p-1",
    acao: "resposta",
    status: "feito",
    ...campos,
  };
  const colunas = Object.keys(base).join(", ");
  const valores = Object.values(base)
    .map((v) => `'${v}'`)
    .join(", ");
  return tentar(`set role service_role; insert into public.escale_acoes_no_comentario (organization_id, ${colunas}) values ('${org}', ${valores});`);
};

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', 'org-9803', 'Org 9803', 'Org 9803') on conflict (id) do nothing;
    delete from public.escale_acoes_no_comentario where comentario_id like 'c9803-%';
  `);
  gravar(GOV_ORG, { comentario_id: "c9803-a", acao: "resposta" });
  gravar(OUTRA_ORG, { comentario_id: "c9803-b", acao: "resposta" });
});

describe("RLS", () => {
  it("o membro lê as linhas da organização e não as da outra", () => {
    const minha = como(GOV_AGENT_A, `select count(*) from public.escale_acoes_no_comentario where comentario_id = 'c9803-a';`);
    const alheia = como(GOV_AGENT_A, `select count(*) from public.escale_acoes_no_comentario where comentario_id = 'c9803-b';`);
    expect(lastLine(minha)).toBe("1");
    expect(lastLine(alheia)).toBe("0");
  });

  it("anon não lê nada", () => {
    expect(tentar(`set role anon; select count(*) from public.escale_acoes_no_comentario;`)).toMatch(/permission denied/i);
  });

  it("authenticated não insere, não atualiza e não apaga", () => {
    const id = lastLine(sql(`select id from public.escale_acoes_no_comentario where comentario_id = 'c9803-a';`));
    for (const dml of [
      `insert into public.escale_acoes_no_comentario (organization_id, plataforma, comentario_id, publicacao_id, acao) values ('${GOV_ORG}', 'instagram', 'c9803-z', 'p', 'resposta')`,
      `update public.escale_acoes_no_comentario set motivo = 'x' where id = '${id}'`,
      `delete from public.escale_acoes_no_comentario where id = '${id}'`,
    ]) {
      expect(tentar(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${GOV_MANAGER}"}', false); ${dml};`)).toMatch(
        /permission denied/i,
      );
    }
  });
});

describe("índice único do direct", () => {
  it("segundo direct enviando ou feito no mesmo comentário → 23505", () => {
    expect(gravar(GOV_ORG, { comentario_id: "c9803-d", acao: "direct", status: "enviando" })).not.toMatch(/error/i);
    expect(gravar(GOV_ORG, { comentario_id: "c9803-d", acao: "direct", status: "enviando" })).toMatch(/uq_escale_acoes_no_comentario_direct/);
    expect(gravar(GOV_ORG, { comentario_id: "c9803-d", acao: "direct", status: "feito" })).toMatch(/uq_escale_acoes_no_comentario_direct/);
  });

  it("o primeiro vira falhou → um novo enviando entra", () => {
    sql(`set role service_role; update public.escale_acoes_no_comentario set status = 'falhou' where comentario_id = 'c9803-d' and status = 'enviando';`);
    expect(gravar(GOV_ORG, { comentario_id: "c9803-d", acao: "direct", status: "enviando" })).not.toMatch(/error/i);
  });

  it("o índice é por organização", () => {
    expect(gravar(OUTRA_ORG, { comentario_id: "c9803-d", acao: "direct", status: "enviando" })).not.toMatch(/error/i);
  });

  it("resposta duas vezes no mesmo comentário → ok (só o direct é único)", () => {
    expect(gravar(GOV_ORG, { comentario_id: "c9803-r", acao: "resposta" })).not.toMatch(/error/i);
    expect(gravar(GOV_ORG, { comentario_id: "c9803-r", acao: "resposta" })).not.toMatch(/error/i);
  });
});

describe("check", () => {
  it("ação, status, plataforma e texto fora do limite → 23514", () => {
    expect(gravar(GOV_ORG, { comentario_id: "c9803-k1", acao: "fixar" })).toMatch(/check constraint/i);
    expect(gravar(GOV_ORG, { comentario_id: "c9803-k2", status: "talvez" })).toMatch(/check constraint/i);
    expect(gravar(GOV_ORG, { comentario_id: "c9803-k3", plataforma: "tiktok" })).toMatch(/check constraint/i);
    expect(gravar(GOV_ORG, { comentario_id: "c9803-k4", texto: "a".repeat(1001) })).toMatch(/check constraint/i);
  });
});

describe("índices", () => {
  it("os dois índices novos de escale_disparos_de_comentario existem, e os da 9801 continuam", () => {
    expect(indexExists("idx_escale_disparos_de_comentario_por_comentario")).toBe(true);
    expect(indexExists("idx_escale_disparos_de_comentario_por_autor")).toBe(true);
    expect(indexExists("uq_escale_disparos_de_comentario_comentario")).toBe(true);
    // 9804 trocou o índice único por pessoa pela função fn_escale_reivindicar_disparo.
    expect(indexExists("uq_escale_disparos_de_comentario_pessoa")).toBe(false);
  });
});

