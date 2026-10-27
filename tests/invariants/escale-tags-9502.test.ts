import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, lastLine, seedGov, sql } from "./gov-helpers";

/** MIGRATION 9502 (fork Escale): gravar tag da casca (cor, descrição, quem criou). Roda via `pnpm test:db`. */
function gravarComo(usuario: string, tag: string, cor: string | null, descricao: string | null): string {
  const lit = (v: string | null) => (v === null ? "null" : `'${v.replace(/'/g, "''")}'`);
  return lastLine(
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${usuario}"}', false);
      select public.fn_escale_tag_gravar('${GOV_ORG}', ${lit(tag)}, ${lit(cor)}, ${lit(descricao)})::text;
    `),
  );
}
const entrada = (tag: string) =>
  sql(`select e::text from public.organizations o, jsonb_array_elements(o.settings->'tags') e
       where o.id = '${GOV_ORG}' and jsonb_typeof(e) = 'object' and e->>'tag' = '${tag}';`);

beforeAll(() => {
  seedGov();
  sql(`update public.organizations set settings = jsonb_set(coalesce(settings,'{}'::jsonb), '{tags}', '["antiga"]'::jsonb) where id = '${GOV_ORG}';`);
});

describe("fn_escale_tag_gravar (9502)", () => {
  it("cria a tag com cor, quem criou e quando", () => {
    const r = JSON.parse(gravarComo(GOV_MANAGER, " Nova9502 ", "#E91E63", null));
    expect(r.tag).toBe("nova9502");
    expect(r.cor).toBe("#e91e63");
    expect(r.criada_por).toBe(GOV_MANAGER);
    expect(r.criada_em).toBeTruthy();
  });

  it("editar troca cor e descrição e preserva quem criou", () => {
    gravarComo(GOV_MANAGER, "nova9502", "#4caf50", "Leads quentes");
    const e = JSON.parse(entrada("nova9502"));
    expect(e.cor).toBe("#4caf50");
    expect(e.descricao).toBe("Leads quentes");
    expect(e.criada_por).toBe(GOV_MANAGER);
    gravarComo(GOV_MANAGER, "nova9502", "#4caf50", null);
    expect(JSON.parse(entrada("nova9502")).descricao).toBeUndefined();
  });

  it("entrada antiga em texto vira objeto, sem duplicar", () => {
    gravarComo(GOV_MANAGER, "antiga", "#795548", null);
    const total = sql(`select count(*) from public.organizations o, jsonb_array_elements(o.settings->'tags') e
      where o.id = '${GOV_ORG}' and (e #>> '{}' = 'antiga' or e->>'tag' = 'antiga');`);
    expect(total).toBe("1");
  });

  it("atendente não grava; valores inválidos são recusados", () => {
    expect(() => gravarComo(GOV_AGENT_A, "x9502", null, null)).toThrow(/sem permissão/);
    expect(() => gravarComo(GOV_MANAGER, "x9502", "azul", null)).toThrow(/cor_invalida/);
    expect(() => gravarComo(GOV_MANAGER, "x9502", null, "a".repeat(161))).toThrow(/descricao_longa/);
    expect(() => gravarComo(GOV_MANAGER, "   ", null, null)).toThrow(/tag_invalida/);
  });

  it("anon não executa a função", () => {
    expect(
      sql(`select has_function_privilege('anon', 'public.fn_escale_tag_gravar(uuid,text,text,text)', 'execute');`),
    ).toBe("f");
  });
});
