import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_MANAGER,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * DISTRIBUIÇÃO DE DONO (fork Escale, migration 9013) — prova contra Postgres
 * real. Organização própria (namespace e5ca1e00-9013) com os membros do
 * seedGov e três origens: LIVRE (sem lista de pessoas), LISTA (escale_pessoas
 * = [A]) e VAZIA (sem distribuição). Cada teste cria os próprios negócios.
 *
 * Roda via `pnpm test:db`.
 */
const ORG = "e5ca1e00-9013-4000-8000-000000000001";
const P_LIVRE = "e5ca1e00-9013-4000-8000-000000000011";
const P_LISTA = "e5ca1e00-9013-4000-8000-000000000012";
const P_VAZIA = "e5ca1e00-9013-4000-8000-000000000013";
const ORIGENS = [P_LIVRE, P_LISTA, P_VAZIA];
const ETAPA = (p: string) => p.replace("-0000000000", "-0000000001");

let seq = 0;
const novoId = () => `e5ca1e00-9013-4000-9000-${String(++seq).padStart(12, "0")}`;
const n = (q: string) => Number(lastLine(sql(q)));

function salvar(origem: string, pessoas: Array<[string, number]>, reiniciar = false) {
  const lista = JSON.stringify(pessoas.map(([user_id, percentual]) => ({ user_id, percentual })));
  sql(
    `select public.fn_escale_salvar_distribuicao('${ORG}', '${origem}', '${GOV_ADMIN}', '${lista}'::jsonb, ${reiniciar});`,
  );
}

/** Cria `quantos` negócios na origem; `extra` = colunas a mais (`owner_user_id`, `created_by_user_id`). */
function criar(origem: string, quantos: number, extra: Record<string, string> = {}): string[] {
  const ids = Array.from({ length: quantos }, novoId);
  const colunas = Object.keys(extra)
    .map((c) => `, ${c}`)
    .join("");
  const valores = Object.values(extra)
    .map((v) => `, '${v}'`)
    .join("");
  for (const id of ids) {
    sql(`insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title${colunas})
         values ('${id}', '${ORG}', '${origem}', '${ETAPA(origem)}', 'prova 9013'${valores});`);
  }
  return ids;
}

const dono = (id: string) =>
  lastLine(
    sql(`select coalesce(owner_user_id::text, 'nenhum') from public.crm_leads where id = '${id}';`),
  );
const lista = (ids: string[]) => ids.map((i) => `'${i}'`).join(",");

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG}', 'escale-distribuicao', 'Escale Distribuição Org', 'Escale Distribuição')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values
      ('${GOV_AGENT_A}', '${ORG}', 'agent', now()),
      ('${GOV_AGENT_B}', '${ORG}', 'agent', now()),
      ('${GOV_VIEWER}', '${ORG}', 'viewer', now()),
      ('${GOV_MANAGER}', '${ORG}', 'manager', now()),
      ('${GOV_ADMIN}', '${ORG}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug, settings) values
      ('${P_LIVRE}', '${ORG}', 'Livre', 'escale-dist-livre', '{}'::jsonb),
      ('${P_LISTA}', '${ORG}', 'Lista', 'escale-dist-lista', '{"escale_pessoas":["${GOV_AGENT_A}"]}'::jsonb),
      ('${P_VAZIA}', '${ORG}', 'Vazia', 'escale-dist-vazia', '{}'::jsonb)
      on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values
      ${ORIGENS.map((p) => `('${ETAPA(p)}', '${ORG}', '${p}', 'Novo', 'novo', 1000)`).join(",\n      ")}
      on conflict do nothing;
  `);
});

describe("o rodízio ponderado (N5)", () => {
  it("75/25 e oito negócios sem dono: 6 para A, 2 para B; contador, feitas e lead.assigned batem", () => {
    salvar(
      P_LIVRE,
      [
        [GOV_AGENT_A, 75],
        [GOV_AGENT_B, 25],
      ],
      true,
    );
    const ids = criar(P_LIVRE, 8);
    expect(ids.filter((i) => dono(i) === GOV_AGENT_A)).toHaveLength(6);
    expect(ids.filter((i) => dono(i) === GOV_AGENT_B)).toHaveLength(2);
    const contador = (u: string) =>
      n(
        `select contador from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}' and user_id = '${u}';`,
      );
    expect(contador(GOV_AGENT_A)).toBe(6);
    expect(contador(GOV_AGENT_B)).toBe(2);
    expect(
      n(`select count(*) from public.crm_distribuicoes_feitas where lead_id in (${lista(ids)});`),
    ).toBe(8);
    expect(
      n(`select count(*) from public.event_log
          where event_type = 'lead.assigned' and payload->>'via' = 'distribuicao'
            and payload->>'lead_id' in (${lista(ids)});`),
    ).toBe(8);
    expect(
      n(`select count(*) from public.crm_leads
          where id in (${lista(ids)}) and owner_kind = 'user' and assigned_at is not null;`),
    ).toBe(8);
  });

  it("quem nasce com dono ou criado por uma pessoa não entra", () => {
    salvar(
      P_LIVRE,
      [
        [GOV_AGENT_A, 50],
        [GOV_AGENT_B, 50],
      ],
      true,
    );
    const [comDono] = criar(P_LIVRE, 1, { owner_user_id: GOV_MANAGER });
    const [porPessoa] = criar(P_LIVRE, 1, { created_by_user_id: GOV_MANAGER });
    expect(dono(comDono!)).toBe(GOV_MANAGER);
    expect(dono(porPessoa!)).toBe("nenhum");
    expect(
      n(
        `select coalesce(sum(contador), 0) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}';`,
      ),
    ).toBe(0);
  });

  it("origem sem distribuição: nasce sem dono, como hoje", () => {
    const [id] = criar(P_VAZIA, 1);
    expect(dono(id!)).toBe("nenhum");
  });

  it("pessoa revogada sai do rodízio; ninguém elegível = sem dono, e a criação não cai", () => {
    salvar(
      P_LIVRE,
      [
        [GOV_AGENT_A, 50],
        [GOV_AGENT_B, 50],
      ],
      true,
    );
    sql(`update public.user_organizations set revoked_at = now()
          where user_id = '${GOV_AGENT_B}' and organization_id = '${ORG}';`);
    try {
      const ids = criar(P_LIVRE, 3);
      expect(ids.map(dono)).toEqual([GOV_AGENT_A, GOV_AGENT_A, GOV_AGENT_A]);
      sql(`update public.user_organizations set revoked_at = now()
            where user_id = '${GOV_AGENT_A}' and organization_id = '${ORG}';`);
      const [semNinguem] = criar(P_LIVRE, 1);
      expect(dono(semNinguem!)).toBe("nenhum");
    } finally {
      sql(
        `update public.user_organizations set revoked_at = null where organization_id = '${ORG}';`,
      );
    }
  });
});

describe("salvar valida de novo (N7)", () => {
  it("soma diferente de 100, percentual 0 e pessoa repetida: 22023", () => {
    expect(() =>
      salvar(P_LIVRE, [
        [GOV_AGENT_A, 50],
        [GOV_AGENT_B, 40],
      ]),
    ).toThrow(/distribuicao_invalida/);
    expect(() =>
      salvar(P_LIVRE, [
        [GOV_AGENT_A, 100],
        [GOV_AGENT_B, 0],
      ]),
    ).toThrow(/distribuicao_invalida/);
    expect(() =>
      salvar(P_LIVRE, [
        [GOV_AGENT_A, 50],
        [GOV_AGENT_A, 50],
      ]),
    ).toThrow(/distribuicao_invalida/);
  });

  it("viewer não recebe; fora da lista da origem também não (PT422); admin sempre", () => {
    expect(() => salvar(P_LIVRE, [[GOV_VIEWER, 100]])).toThrow(/pessoa_sem_permissao/);
    expect(() =>
      salvar(P_LISTA, [
        [GOV_AGENT_A, 50],
        [GOV_AGENT_B, 50],
      ]),
    ).toThrow(/pessoa_sem_permissao/);
    salvar(P_LISTA, [
      [GOV_AGENT_A, 50],
      [GOV_ADMIN, 50],
    ]);
    expect(
      n(`select count(*) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LISTA}';`),
    ).toBe(2);
  });

  it("o histórico registra quem entrou, saiu e mudou, com o autor; salvar recomeça o rodízio", () => {
    salvar(
      P_LIVRE,
      [
        [GOV_AGENT_A, 50],
        [GOV_AGENT_B, 50],
      ],
      true,
    );
    criar(P_LIVRE, 3);
    salvar(P_LIVRE, [
      [GOV_AGENT_A, 60],
      [GOV_MANAGER, 40],
    ]);
    const eventos = lastLine(
      sql(`select string_agg(evento || ':' || coalesce(pessoa_id::text, '-'), ',' order by evento, pessoa_id)
             from public.crm_distribuicao_alteracoes
            where pipeline_id = '${P_LIVRE}' and autor_id = '${GOV_ADMIN}'
              and created_at = (select max(created_at) from public.crm_distribuicao_alteracoes
                                 where pipeline_id = '${P_LIVRE}');`),
    );
    expect(eventos).toBe(
      `percentual_alterado:${GOV_AGENT_A},pessoa_entrou:${GOV_MANAGER},pessoa_saiu:${GOV_AGENT_B}`,
    );
    expect(
      n(
        `select coalesce(sum(indice), 0) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}';`,
      ),
    ).toBe(0);
    expect(
      n(`select contador from public.crm_distribuicao_de_dono
          where pipeline_id = '${P_LIVRE}' and user_id = '${GOV_AGENT_A}';`),
    ).toBeGreaterThan(0);
  });

  it("reiniciar zera contador e índice, apaga as feitas e registra o reinício", () => {
    salvar(P_LIVRE, [
      [GOV_AGENT_A, 50],
      [GOV_AGENT_B, 50],
    ]);
    criar(P_LIVRE, 2);
    sql(`select public.fn_escale_reiniciar_distribuicao('${ORG}', '${P_LIVRE}', '${GOV_ADMIN}');`);
    expect(
      n(`select coalesce(sum(contador), 0) + coalesce(sum(indice), 0)
           from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}';`),
    ).toBe(0);
    expect(
      n(`select count(*) from public.crm_distribuicoes_feitas where pipeline_id = '${P_LIVRE}';`),
    ).toBe(0);
    expect(
      n(`select count(*) from public.crm_distribuicao_alteracoes
          where pipeline_id = '${P_LIVRE}' and evento = 'contagem_reiniciada' and autor_id = '${GOV_ADMIN}';`),
    ).toBeGreaterThan(0);
  });
});

describe("RLS e funções fechadas (N7, N8)", () => {
  it("gerente e admin leem; agente e viewer leem zero", () => {
    salvar(P_LIVRE, [
      [GOV_AGENT_A, 50],
      [GOV_AGENT_B, 50],
    ]);
    const q = `select count(*) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}'`;
    expect(countAs(GOV_MANAGER, q)).toBe(2);
    expect(countAs(GOV_ADMIN, q)).toBe(2);
    expect(countAs(GOV_AGENT_A, q)).toBe(0);
    expect(countAs(GOV_VIEWER, q)).toBe(0);
    expect(
      countAs(
        GOV_AGENT_A,
        `select count(*) from public.crm_distribuicao_alteracoes where pipeline_id = '${P_LIVRE}'`,
      ),
    ).toBe(0);
  });

  it("gerente fora da lista de pessoas da origem não lê a distribuição dela (1J); o admin lê", () => {
    // P_LISTA tem escale_pessoas = [A]: o gerente não está nela.
    salvar(P_LISTA, [[GOV_AGENT_A, 100]]);
    for (const tabela of [
      "crm_distribuicao_de_dono",
      "crm_distribuicoes_feitas",
      "crm_distribuicao_alteracoes",
    ]) {
      const q = `select count(*) from public.${tabela} where pipeline_id = '${P_LISTA}'`;
      expect(countAs(GOV_MANAGER, q)).toBe(0);
    }
    const q = `select count(*) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LISTA}'`;
    expect(countAs(GOV_ADMIN, q)).toBe(1);
    // E na origem livre (sem lista) o gerente continua lendo.
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}'`,
      ),
    ).toBeGreaterThan(0);
  });

  it("ninguém com sessão escreve nas tabelas nem executa as funções", () => {
    const comoAdmin = (script: string) =>
      sql(`set role authenticated;
           select set_config('request.jwt.claims', '{"sub":"${GOV_ADMIN}"}', false);
           ${script}`);
    // Sem o privilégio de escrita (revoke da 9013), o banco recusa; nada muda.
    expect(() =>
      comoAdmin(
        `update public.crm_distribuicao_de_dono set contador = 99 where pipeline_id = '${P_LIVRE}';`,
      ),
    ).toThrow(/permission denied/);
    expect(
      n(
        `select max(contador) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}';`,
      ),
    ).not.toBe(99);
    expect(() =>
      comoAdmin(
        `select public.fn_escale_reiniciar_distribuicao('${ORG}', '${P_LIVRE}', '${GOV_ADMIN}');`,
      ),
    ).toThrow(/permission denied/);
    expect(() =>
      comoAdmin(
        `select public.fn_escale_recebe_da_origem('${ORG}', '${P_LIVRE}', '${GOV_AGENT_A}');`,
      ),
    ).toThrow(/permission denied/);
  });
});
