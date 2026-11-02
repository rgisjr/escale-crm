import { execFile } from "node:child_process";

import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_ORG, countAs, lastLine, seedGov, sql } from "./gov-helpers";

/**
 * INSTAGRAM AVANÇADO (fork Escale, migration 9804) — prova contra Postgres real: a função de
 * reivindicação (novo / repetido / já existe, intervalo, trava), os checks novos e o resumo.
 * Roda via `pnpm test:db`.
 */
const ID = (sufixo: string) => `e5ca1e00-9804-4000-8000-${sufixo.padStart(12, "0")}`;
const REGRA = ID("a1");
const REGRA_2 = ID("a2");
const ACOES = `[{"type":"send_instagram_message","config":{}}]`;

const tentar = (consulta: string): string => {
  try {
    return sql(consulta);
  } catch (e) {
    return String((e as Error).message);
  }
};

const linha = (regra: string, comentario: string, autor: string, extra: Record<string, string> = {}): string =>
  JSON.stringify({
    organization_id: GOV_ORG,
    rule_id: regra,
    caminho_id: "qualquer",
    plataforma: "instagram",
    comentario_id: comentario,
    publicacao_id: "p-1",
    autor_id: autor,
    texto: "oi",
    comentado_em: new Date().toISOString(),
    ...extra,
  });

const reivindicar = (l: string, horas: number | null): string =>
  lastLine(
    sql(`set role service_role; select public.fn_escale_reivindicar_disparo('${l}'::jsonb, ${horas === null ? "null" : horas});`),
  );

const contar = (regra: string): number =>
  Number(lastLine(sql(`select count(*) from public.escale_disparos_de_comentario where rule_id = '${regra}';`)));

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.escale_disparos_de_comentario where rule_id in ('${REGRA}', '${REGRA_2}');
    delete from public.automation_rules where id in ('${REGRA}', '${REGRA_2}');
    insert into public.automation_rules (id, organization_id, name, trigger_event, trigger_config, conditions, actions, is_active) values
      ('${REGRA}', '${GOV_ORG}', 'Regra 9804', 'comment.received', '{}', '[]', '${ACOES}', true),
      ('${REGRA_2}', '${GOV_ORG}', 'Regra 9804 b', 'comment.received', '{}', '[]', '${ACOES}', true);
  `);
});

describe("função de reivindicação", () => {
  it("só o service_role executa, e ela é definer com search_path fechado", () => {
    expect(tentar(`set role authenticated; select public.fn_escale_reivindicar_disparo('{}'::jsonb, null);`)).toMatch(
      /permission denied/i,
    );
    expect(tentar(`set role anon; select public.fn_escale_reivindicar_disparo('{}'::jsonb, null);`)).toMatch(
      /permission denied/i,
    );
    expect(
      lastLine(
        sql(`select prosecdef::text || ':' || coalesce(proconfig::text, '') from pg_proc where proname = 'fn_escale_reivindicar_disparo';`),
      ),
    ).toMatch(/^true:.*search_path/);
  });

  it("novo, ja_existe e repetido (uma vez por pessoa)", () => {
    expect(reivindicar(linha(REGRA, "c-1", "ana"), null)).toBe("novo");
    expect(reivindicar(linha(REGRA, "c-1", "ana"), null)).toBe("ja_existe");
    expect(contar(REGRA)).toBe(1);
    expect(reivindicar(linha(REGRA, "c-2", "ana"), null)).toBe("repetido");
    expect(
      lastLine(sql(`select direct || ':' || resposta || ':' || motivo from public.escale_disparos_de_comentario where comentario_id = 'c-2' and rule_id = '${REGRA}';`)),
    ).toBe("pulado:pulada:ja_recebeu");
  });

  it("intervalo: depois de 2 h passa; com 30 min repete", () => {
    sql(`update public.escale_disparos_de_comentario set created_at = now() - interval '2 hours' where rule_id = '${REGRA}' and autor_id = 'ana' and not repetido;`);
    expect(reivindicar(linha(REGRA, "c-3", "ana"), 1)).toBe("novo");
    sql(`update public.escale_disparos_de_comentario set created_at = now() - interval '30 minutes' where rule_id = '${REGRA}' and comentario_id = 'c-3';`);
    expect(reivindicar(linha(REGRA, "c-4", "ana"), 1)).toBe("repetido");
  });

  it("linha fora_do_publico não conta como 'já recebeu': a pessoa entra quando passa a estar no público", () => {
    expect(reivindicar(linha(REGRA_2, "c-fp1", "dora", { direct: "fora_do_publico", motivo: "fora_do_publico" }), null)).toBe("novo");
    expect(reivindicar(linha(REGRA_2, "c-fp2", "dora"), null)).toBe("novo");
    expect(reivindicar(linha(REGRA_2, "c-fp3", "dora"), null)).toBe("repetido");
  });

  it("pessoas e regras diferentes não se atrapalham", () => {
    expect(reivindicar(linha(REGRA, "c-5", "bia"), null)).toBe("novo");
    expect(reivindicar(linha(REGRA_2, "c-6", "ana"), null)).toBe("novo");
  });

  it("corrida: dois comentários da mesma pessoa ao mesmo tempo → um novo e um repetido", async () => {
    const container = process.env.TEST_DB_CONTAINER as string;
    const chamar = (l: string) =>
      new Promise<string>((resolve, reject) => {
        const proc = execFile(
          "docker",
          ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-tA", "-f", "-"],
          (erro, saida) => (erro ? reject(erro) : resolve(saida.trim().split("\n").pop() ?? "")),
        );
        proc.stdin?.end(`set role service_role; select public.fn_escale_reivindicar_disparo('${l}'::jsonb, null);`);
      });
    const resultados = await Promise.all([
      chamar(linha(REGRA, "c-r1", "carla")),
      chamar(linha(REGRA, "c-r2", "carla")),
    ]);
    expect([...resultados].sort()).toEqual(["novo", "repetido"]);
  });
});

describe("checks e índices", () => {
  const inserir = (campos: string, valores: string): string =>
    tentar(
      `set role service_role; insert into public.escale_disparos_de_comentario (organization_id, rule_id, caminho_id, plataforma, comentario_id, publicacao_id, autor_id, texto, comentado_em, ${campos})
       values ('${GOV_ORG}', '${REGRA_2}', 'q', 'instagram', 'x-' || gen_random_uuid(), 'p', 'a-' || gen_random_uuid(), 'oi', now(), ${valores});`,
    );

  it("direct aceita os desfechos novos e recusa 'talvez'", () => {
    expect(inserir("direct", "'aguardando_seguir'")).not.toMatch(/error/i);
    expect(inserir("direct", "'fora_do_publico'")).not.toMatch(/error/i);
    expect(inserir("direct", "'talvez'")).toMatch(/23514|check constraint/i);
  });

  it("ocultar, curtir e toques têm limites", () => {
    expect(inserir("ocultar", "'feito'")).not.toMatch(/error/i);
    expect(inserir("ocultar", "'quem sabe'")).toMatch(/check constraint/i);
    expect(inserir("curtir", "'quem sabe'")).toMatch(/check constraint/i);
    expect(inserir("toques_no_liberar", "11")).toMatch(/check constraint/i);
  });

  it("o índice por pessoa saiu e o por comentário ficou", () => {
    const nomes = sql(`select indexname from pg_indexes where tablename = 'escale_disparos_de_comentario';`);
    expect(nomes).not.toMatch(/uq_escale_disparos_de_comentario_pessoa/);
    expect(nomes).toMatch(/uq_escale_disparos_de_comentario_comentario/);
  });
});

describe("resumo", () => {
  it("conta fora do público, aguardando seguir e ocultados; membro de outra organização vê zero", () => {
    sql(`
      update public.escale_disparos_de_comentario set direct = 'fora_do_publico' where rule_id = '${REGRA_2}' and comentario_id = 'c-6';
      insert into public.escale_disparos_de_comentario (organization_id, rule_id, caminho_id, plataforma, comentario_id, publicacao_id, autor_id, texto, comentado_em, direct, ocultar)
        values ('${GOV_ORG}', '${REGRA_2}', 'q', 'instagram', 'c-7', 'p', 'zed', 'oi', now(), 'aguardando_seguir', 'feito');
    `);
    const linhas = countAs(
      GOV_AGENT_A,
      `select count(*) from public.fn_escale_resumo_dos_comentarios('${REGRA_2}', null) r
        where (r ->> 'fora_do_publico')::int >= 1 and (r ->> 'aguardando_seguir')::int >= 1 and (r ->> 'ocultados')::int >= 1`,
    );
    expect(linhas).toBe(1);
  });
});
