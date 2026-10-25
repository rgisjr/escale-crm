import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * REVISÃO Q7b (fork Escale, migration 9402) — prova contra Postgres real que as
 * regras de acesso reescritas dão a MESMA visibilidade de antes.
 *
 * O "antes" é um banco de verdade: o baseline aplicado SEM o bloco da 9402, ao lado
 * do banco do arquivo (o baseline inteiro). Os dois recebem a mesma semeadura (três
 * organizações, origens com listas de pessoas, grupos e regras de visualização
 * diferentes, negócios de vários donos, um negócio com origem de outra organização,
 * conversas com setor pela conversa e pelo dispositivo, notas, atividades, links e
 * distribuição) e, para cada pessoa (viewer, atendentes, gerente, admin, membro de
 * duas organizações, vínculo revogado, sem vínculo, anon, suporte somente leitura,
 * suporte completo, platform admin sem sessão), comparamos:
 *   - as linhas visíveis de cada tabela tocada;
 *   - as linhas que UPDATE e DELETE alcançam, e o resultado de cada INSERT tentado;
 *   - a grade das funções de acesso reescritas (G7-10).
 * Tudo tem de ser igual, salvo a leitura da distribuição pelo platform admin (B7-9),
 * que só pode ALARGAR e só para ele. Também: nenhuma outra policy nem função mudou,
 * as 35 policies do G7-18 só trocaram `auth.uid()` por `(select auth.uid())`, e a
 * regra deixou de rodar por linha (contagem de chamadas). Roda via `pnpm test:db`.
 */
const CONTAINER = process.env.TEST_DB_CONTAINER ?? "";
const ANTES = "q7b_antes";
const DEPOIS = "postgres";
const CABECALHO = "-- ---- FORK ESCALE · revisão Q7b: regras de acesso (migration 9402) ----";

function psql(banco: string, script: string, extra: string[] = []): string {
  return execFileSync(
    "docker",
    ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", banco, "-tAq", ...extra, "-f", "-"],
    { input: script, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  ).trim();
}
const sqlEm = (banco: string, script: string) => psql(banco, script, ["-v", "ON_ERROR_STOP=1"]);
const nosDois = (script: string) => {
  sqlEm(ANTES, script);
  sqlEm(DEPOIS, script);
};

/** O prelude do harness (roles, auth, extensões), lido de scripts/test-db.sh. */
function preludeDoHarness(): string {
  const linhas = readFileSync("scripts/test-db.sh", "utf8").split("\n");
  const eco = linhas.findIndex((l) => l.startsWith('echo "==> prelude'));
  const inicio = linhas.findIndex((l, i) => i > eco && l.trim() === "psql_install <<'SQL'");
  const fim = linhas.findIndex((l, i) => i > inicio && l.trim() === "SQL");
  if (eco < 0 || inicio < 0 || fim < 0)
    throw new Error("prelude de scripts/test-db.sh não encontrado");
  return linhas.slice(inicio + 1, fim).join("\n");
}

/** O baseline sem o bloco da 9402: o banco como era antes desta migration. */
function baselineSemO9402(): string {
  const b = readFileSync("supabase/baseline.sql", "utf8");
  const i = b.indexOf(CABECALHO);
  const j = b.indexOf("\n-- ---- ", i + CABECALHO.length);
  if (i < 0 || j < 0) throw new Error("bloco da 9402 não encontrado no baseline");
  return b.slice(0, i) + b.slice(j + 1);
}

function montarAntes(): void {
  sqlEm("template1", `drop database if exists ${ANTES} with (force);\ncreate database ${ANTES};`);
  for (const script of [preludeDoHarness(), baselineSemO9402()]) {
    execFileSync(
      "docker",
      [
        "exec",
        "-i",
        CONTAINER,
        "psql",
        "-U",
        "postgres",
        "-d",
        ANTES,
        "-q",
        "-v",
        "ON_ERROR_STOP=1",
        "-f",
        "-",
      ],
      { input: script, stdio: ["pipe", "ignore", "pipe"], maxBuffer: 256 * 1024 * 1024 },
    );
  }
}

// ── ids ───────────────────────────────────────────────────────────────────────
const P = "e5ca1e00-9402-4000-8000-";
const id = (prefixo: string, n: number) =>
  `${P}${prefixo}${String(n).padStart(12 - prefixo.length, "0")}`;
const ORG_A = id("a0", 1);
const ORG_B = id("a0", 2);
const ORG_C = id("a0", 3);
const U = {
  viewer: id("b0", 1),
  ag1: id("b0", 2),
  ag2: id("b0", 3),
  ag3: id("b0", 4),
  mgr: id("b0", 5),
  adm: id("b0", 6),
  ub: id("b0", 7),
  multi: id("b0", 8),
  revogado: id("b0", 9),
  paLeitura: id("b0", 10),
  paCompleto: id("b0", 11),
  paSemSessao: id("b0", 12),
  nada: id("b0", 13),
  paEscopoLeitura: id("b0", 14),
} as const;
const SESSAO = {
  paLeitura: id("c0", 1),
  paCompleto: id("c0", 2),
  paEscopoLeitura: id("c0", 3),
} as const;
const G = {
  a0: id("d0", 1),
  a1: id("d0", 2),
  a2: id("d0", 3),
  b0: id("d0", 4),
  b1: id("d0", 5),
  c0: id("d0", 6),
};
type Origem = { id: string; org: string; grupo: string; settings: string };
const ORIGENS: Origem[] = [
  { id: id("e0", 1), org: ORG_A, grupo: G.a0, settings: "{}" },
  {
    id: id("e0", 2),
    org: ORG_A,
    grupo: G.a0,
    settings: `{"escale_pessoas":["${U.ag1}"],"escale_visualizacao":"all"}`,
  },
  { id: id("e0", 3), org: ORG_A, grupo: G.a1, settings: `{"escale_visualizacao":"own"}` },
  {
    id: id("e0", 4),
    org: ORG_A,
    grupo: G.a2,
    settings: `{"escale_pessoas":["${U.ag2}","${U.mgr}"],"escale_visualizacao":"own_and_unassigned"}`,
  },
  {
    id: id("e0", 5),
    org: ORG_A,
    grupo: G.a0,
    settings: `{"escale_pessoas":"nao-e-lista","escale_visualizacao":"invalida"}`,
  },
  { id: id("e0", 6), org: ORG_B, grupo: G.b0, settings: "{}" },
  { id: id("e0", 7), org: ORG_B, grupo: G.b0, settings: `{"escale_pessoas":["${U.multi}"]}` },
  { id: id("e0", 8), org: ORG_B, grupo: G.b1, settings: "{}" },
  { id: id("e0", 9), org: ORG_C, grupo: G.c0, settings: `{"escale_visualizacao":"own"}` },
];
const etapa = (o: Origem) => o.id.replace(`${P}e0`, `${P}f0`);
const DONOS = [null, U.ag1, U.ag2, U.ag3, U.mgr, U.multi, U.ub];
const S = { s1: id("10", 1), s2: id("10", 2), sb: id("10", 3) };
const CS = { a1: id("11", 1), a2: id("11", 2), b1: id("11", 3) };
const N_EM_MASSA = 150;

type Persona = { nome: string; papel: "authenticated" | "anon"; claims: string };
const claims = (sub: string, sessao?: string) =>
  sessao ? `{"sub":"${sub}","session_id":"${sessao}","aal":"aal1"}` : `{"sub":"${sub}"}`;
const PESSOAS: Persona[] = [
  { nome: "anon", papel: "anon", claims: "{}" },
  { nome: "viewer", papel: "authenticated", claims: claims(U.viewer) },
  {
    nome: "atendente 1 (setor 1, lista da origem 2)",
    papel: "authenticated",
    claims: claims(U.ag1),
  },
  {
    nome: "atendente 2 (setor 2, listas, também em C)",
    papel: "authenticated",
    claims: claims(U.ag2),
  },
  {
    nome: "atendente 3 (setor 1, sem Ver do setor)",
    papel: "authenticated",
    claims: claims(U.ag3),
  },
  { nome: "gerente", papel: "authenticated", claims: claims(U.mgr) },
  { nome: "admin", papel: "authenticated", claims: claims(U.adm) },
  { nome: "gerente de outra organização", papel: "authenticated", claims: claims(U.ub) },
  { nome: "atendente em A e admin em B", papel: "authenticated", claims: claims(U.multi) },
  { nome: "vínculo revogado", papel: "authenticated", claims: claims(U.revogado) },
  { nome: "sem vínculo", papel: "authenticated", claims: claims(U.nada) },
  {
    nome: "suporte somente leitura (escopo leitura)",
    papel: "authenticated",
    claims: claims(U.paLeitura, SESSAO.paLeitura),
  },
  {
    nome: "suporte somente leitura (escopo completo)",
    papel: "authenticated",
    claims: claims(U.paEscopoLeitura, SESSAO.paEscopoLeitura),
  },
  {
    nome: "suporte completo em B (membro atendente de A)",
    papel: "authenticated",
    claims: claims(U.paCompleto, SESSAO.paCompleto),
  },
  { nome: "platform admin sem sessão", papel: "authenticated", claims: claims(U.paSemSessao) },
];
const PLATFORM_ADMINS = new Set([
  "suporte somente leitura (escopo leitura)",
  "suporte somente leitura (escopo completo)",
  "suporte completo em B (membro atendente de A)",
  "platform admin sem sessão",
]);

// ── semeadura (igual nos dois bancos) ────────────────────────────────────────
function semeadura(): string {
  const usuarios = Object.entries(U)
    .map(([k, v]) => `('${v}', 'q7b-${k}@invariant.test')`)
    .join(",\n");
  const vinculos: Array<[string, string, string, string]> = [
    [U.viewer, ORG_A, "viewer", "null"],
    [U.ag1, ORG_A, "agent", "null"],
    [U.ag2, ORG_A, "agent", "null"],
    [U.ag2, ORG_C, "agent", "null"],
    [U.ag3, ORG_A, "agent", "null"],
    [U.mgr, ORG_A, "manager", "null"],
    [U.adm, ORG_A, "admin", "null"],
    [U.ub, ORG_B, "manager", "null"],
    [U.multi, ORG_A, "agent", "null"],
    [U.multi, ORG_B, "admin", "null"],
    [U.revogado, ORG_A, "agent", "now()"],
    [U.paLeitura, ORG_B, "agent", "null"],
    [U.paCompleto, ORG_A, "agent", "null"],
  ];
  const origens = ORIGENS.map(
    (o, i) =>
      `('${o.id}', '${o.org}', '${o.grupo}', 'Origem ${i}', 'q7b-origem-${i}', '${o.settings}'::jsonb)`,
  ).join(",\n");
  const etapas = ORIGENS.map(
    (o, i) => `('${etapa(o)}', '${o.org}', '${o.id}', 'Etapa ${i}', 'etapa-${i}', 1000)`,
  ).join(",\n");
  const negocios: string[] = [];
  let n = 0;
  for (const o of ORIGENS) {
    for (const dono of DONOS) {
      n += 1;
      negocios.push(
        `('${id("12", n)}', '${o.org}', '${o.id}', '${etapa(o)}', 'Negócio ${n}', ${dono ? `'${dono}'` : "null"})`,
      );
    }
  }
  // negócios cuja origem é de OUTRA organização (o admin os vê; a lista não)
  const pa1 = ORIGENS[0]!;
  const pb1 = ORIGENS[5]!;
  n += 1;
  negocios.push(
    `('${id("12", n)}', '${ORG_A}', '${pb1.id}', '${etapa(pb1)}', 'Cruzado A→B', '${U.ag1}')`,
  );
  n += 1;
  negocios.push(
    `('${id("12", n)}', '${ORG_B}', '${pa1.id}', '${etapa(pa1)}', 'Cruzado B→A', null)`,
  );
  const totalDeNegocios = n;
  const autorDaNota = (org: string) => (org === ORG_A ? U.adm : org === ORG_B ? U.ub : U.ag2);
  const orgDoNegocio = (i: number) =>
    i <= ORIGENS.length * DONOS.length
      ? ORIGENS[Math.floor((i - 1) / DONOS.length)]!.org
      : i === totalDeNegocios
        ? ORG_B
        : ORG_A;
  const filhos: string[] = [];
  for (let i = 1; i <= totalDeNegocios; i++) {
    const org = orgDoNegocio(i);
    filhos.push(`insert into public.crm_lead_activities (id, organization_id, lead_id, source_module, type)
      values ('${id("13", i)}', '${org}', '${id("12", i)}', 'q7b', 'nota');
    insert into public.crm_lead_links (id, organization_id, lead_id, target_kind, target_id, link_kind)
      values ('${id("14", i)}', '${org}', '${id("12", i)}', 'external', '${id("15", i)}', 'q7b');
    insert into public.crm_notas_do_negocio (id, organization_id, lead_id, user_id, texto)
      values ('${id("16", i)}', '${org}', '${id("12", i)}', '${autorDaNota(org)}', 'nota ${i}');`);
  }
  const contatos = Array.from(
    { length: 10 },
    (_, i) => `('${id("18", i + 1)}', '${i < 8 ? ORG_A : ORG_B}', 'Contato ${i}')`,
  ).join(",\n");
  // conversas: [n, org, dispositivo, atendente, setor da conversa ('-' = sem linha, 'nulo' = linha sem setor)]
  const conversas: Array<[number, string, string, string | null, string]> = [
    [1, ORG_A, CS.a1, U.ag1, "-"],
    [2, ORG_A, CS.a1, null, S.s1],
    [3, ORG_A, CS.a1, U.ag2, "nulo"],
    [4, ORG_A, CS.a2, U.mgr, S.s1],
    [5, ORG_A, CS.a2, null, "-"],
    [6, ORG_A, CS.a2, U.ag3, S.s2],
    [7, ORG_A, CS.a1, U.ub, S.s1],
    [8, ORG_A, CS.a2, U.ag1, S.s2],
    [9, ORG_B, CS.b1, null, S.sb],
    [10, ORG_B, CS.b1, U.ub, "-"],
  ];
  const linhasDeConversa = conversas
    .map(
      ([i, org, cs, quem]) =>
        `('${id("19", i)}', '${org}', '${id("18", i)}', '${cs}', '${quem ? "claimed" : "open"}', ${quem ? `'${quem}'` : "null"})`,
    )
    .join(",\n");
  const setorDaConversa = conversas
    .filter(([, , , , s]) => s !== "-")
    .map(([i, org, , , s]) => `('${id("19", i)}', '${org}', ${s === "nulo" ? "null" : `'${s}'`})`)
    .join(",\n");
  const emMassa = `insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, owner_user_id)
    select ('${P}' || '1f' || lpad(to_hex(g), 10, '0'))::uuid, '${ORG_A}', '${pa1.id}', '${etapa(pa1)}', 'Em massa ' || g,
           (array[null, '${U.ag1}', '${U.ag2}']::uuid[])[1 + g % 3]
      from generate_series(1, ${N_EM_MASSA}) g;`;
  return `
    set session_replication_role = replica;
    insert into auth.users (id, email) values ${usuarios};
    insert into public.organizations (id, slug, legal_name, display_name, settings) values
      ('${ORG_A}', 'q7b-a', 'Q7b A', 'Q7b A', '{"visibility_mode":"own"}'),
      ('${ORG_B}', 'q7b-b', 'Q7b B', 'Q7b B', '{}'),
      ('${ORG_C}', 'q7b-c', 'Q7b C', 'Q7b C', '{"visibility_mode":"all"}');
    insert into public.user_organizations (user_id, organization_id, role, accepted_at, revoked_at) values
      ${vinculos.map(([u, o, r, rev]) => `('${u}', '${o}', '${r}', now(), ${rev})`).join(",\n")};
    insert into auth.sessions (id, user_id, aal) values
      ('${SESSAO.paLeitura}', '${U.paLeitura}', 'aal1'),
      ('${SESSAO.paCompleto}', '${U.paCompleto}', 'aal1'),
      ('${SESSAO.paEscopoLeitura}', '${U.paEscopoLeitura}', 'aal1');
    insert into public.platform_admins (user_id, granted_by, scope, mfa_required, reason) values
      ('${U.paLeitura}', '${U.paLeitura}', 'support_readonly', false, 'q7b'),
      ('${U.paCompleto}', '${U.paCompleto}', 'full', false, 'q7b'),
      ('${U.paSemSessao}', '${U.paSemSessao}', 'full', false, 'q7b'),
      ('${U.paEscopoLeitura}', '${U.paEscopoLeitura}', 'full', false, 'q7b');
    insert into public.platform_support_sessions (id, organization_id, actor_user_id, auth_session_id, access_mode, expires_at) values
      ('${id("c1", 1)}', '${ORG_A}', '${U.paLeitura}', '${SESSAO.paLeitura}', 'support_readonly', now() + interval '1 hour'),
      ('${id("c1", 2)}', '${ORG_B}', '${U.paCompleto}', '${SESSAO.paCompleto}', 'full', now() + interval '1 hour'),
      ('${id("c1", 3)}', '${ORG_A}', '${U.paEscopoLeitura}', '${SESSAO.paEscopoLeitura}', 'support_readonly', now() + interval '1 hour');
    insert into public.crm_pipeline_groups (id, organization_id, name, settings) values
      ('${G.a0}', '${ORG_A}', 'Grupo A0', '{}'),
      ('${G.a1}', '${ORG_A}', 'Grupo A1', '{"escale_pessoas":["${U.ag2}"]}'),
      ('${G.a2}', '${ORG_A}', 'Grupo A2', '{"escale_pessoas":[]}'),
      ('${G.b0}', '${ORG_B}', 'Grupo B0', '{}'),
      ('${G.b1}', '${ORG_B}', 'Grupo B1', '{"escale_pessoas":["${U.ub}"]}'),
      ('${G.c0}', '${ORG_C}', 'Grupo C0', '{}');
    insert into public.crm_pipelines (id, organization_id, group_id, name, slug, settings) values ${origens};
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values ${etapas};
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, owner_user_id) values
      ${negocios.join(",\n")};
    ${emMassa}
    ${filhos.join("\n")}
    insert into public.contacts (id, organization_id, display_name) values ${contatos};
    insert into public.crm_notas_do_negocio (id, organization_id, lead_id, contact_id, user_id, texto) values
      ('${id("17", 1)}', '${ORG_A}', null, '${id("18", 1)}', '${U.adm}', 'solta com contato'),
      ('${id("17", 3)}', '${ORG_B}', null, '${id("18", 9)}', '${U.ub}', 'solta de B');
    insert into public.channel_sessions (id, organization_id, waha_session_name, webhook_secret_encrypted) values
      ('${CS.a1}', '${ORG_A}', 'q7b-a1', '\\x00'::bytea),
      ('${CS.a2}', '${ORG_A}', 'q7b-a2', '\\x00'::bytea),
      ('${CS.b1}', '${ORG_B}', 'q7b-b1', '\\x00'::bytea);
    insert into public.conversations (id, organization_id, contact_id, channel_session_id, status, assigned_to_user_id) values
      ${linhasDeConversa};
    insert into public.crm_setores (id, organization_id, nome) values
      ('${S.s1}', '${ORG_A}', 'Setor 1'), ('${S.s2}', '${ORG_A}', 'Setor 2'), ('${S.sb}', '${ORG_B}', 'Setor B');
    insert into public.crm_setores_membros (organization_id, setor_id, user_id) values
      ('${ORG_A}', '${S.s1}', '${U.ag1}'), ('${ORG_A}', '${S.s1}', '${U.ag3}'), ('${ORG_A}', '${S.s2}', '${U.ag2}'),
      ('${ORG_A}', '${S.s1}', '${U.multi}'), ('${ORG_B}', '${S.sb}', '${U.ag1}'), ('${ORG_A}', '${S.s2}', '${U.mgr}');
    insert into public.crm_setor_do_dispositivo (channel_session_id, organization_id, setor_id) values
      ('${CS.a1}', '${ORG_A}', '${S.s2}'), ('${CS.b1}', '${ORG_B}', '${S.sb}');
    insert into public.crm_setor_da_conversa (conversation_id, organization_id, setor_id) values ${setorDaConversa};
    insert into public.crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado) values
      ('${ORG_A}', '${U.ag3}', 'CHAT_VIEW_TEAM', false), ('${ORG_A}', '${U.viewer}', 'CHAT_VIEW_TEAM', true);
    insert into public.crm_distribuicao_de_dono (organization_id, pipeline_id, user_id, percentual, passo) values
      ('${ORG_A}', '${ORIGENS[0]!.id}', '${U.ag1}', 50, 1), ('${ORG_A}', '${ORIGENS[2]!.id}', '${U.ag2}', 100, 1),
      ('${ORG_B}', '${ORIGENS[5]!.id}', '${U.ub}', 100, 1);
    insert into public.crm_distribuicoes_feitas (id, organization_id, pipeline_id, lead_id) values
      ('${id("1a", 1)}', '${ORG_A}', '${ORIGENS[0]!.id}', '${id("12", 1)}'),
      ('${id("1a", 2)}', '${ORG_A}', '${ORIGENS[3]!.id}', '${id("12", 22)}'),
      ('${id("1a", 3)}', '${ORG_B}', '${ORIGENS[5]!.id}', '${id("12", 36)}');
    insert into public.crm_distribuicao_alteracoes (id, organization_id, pipeline_id, evento) values
      ('${id("1b", 1)}', '${ORG_A}', '${ORIGENS[1]!.id}', 'pessoa_entrou'),
      ('${id("1b", 2)}', '${ORG_B}', '${ORIGENS[7]!.id}', 'pessoa_saiu');
    set session_replication_role = origin;
  `;
}

// ── o que cada pessoa alcança (uma sessão de psql por pessoa e banco) ─────────
const TABELAS: Array<[string, string]> = [
  ["crm_leads", "id::text"],
  ["crm_lead_activities", "id::text"],
  ["crm_lead_links", "id::text"],
  ["crm_notas_do_negocio", "id::text"],
  ["crm_pipelines", "id::text"],
  ["crm_stages", "id::text"],
  ["crm_pipeline_groups", "id::text"],
  ["conversations", "id::text"],
  ["crm_distribuicao_de_dono", "pipeline_id::text || ':' || user_id::text"],
  ["crm_distribuicoes_feitas", "id::text"],
  ["crm_distribuicao_alteracoes", "id::text"],
];
const DISTRIBUICAO = new Set([
  "crm_distribuicao_de_dono",
  "crm_distribuicoes_feitas",
  "crm_distribuicao_alteracoes",
]);

const ORGS = [ORG_A, ORG_B, ORG_C, id("a0", 99)];
const GRUPOS = [...Object.values(G), id("d0", 99)];
const CHAVES = [
  "CHAT_VIEW_CHANNEL_ACCOUNT",
  "CHAT_VIEW_TEAM",
  "CHAT_CHANGE_ATTENDANT_TEAM",
  "CHAT_CHANGE_ATTENDANT_ALL",
  "CHAT_BULK_ACTIONS",
  "CHAT_EDIT_QUICK_RESPONSE",
  "CHAT_SHARE_QUICK_RESPONSE",
  "CHAT_EDIT_TEAMS",
  "CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS",
  "X_DESCONHECIDA",
];
const lista = (xs: Array<string | null>) =>
  `array[${xs.map((x) => (x === null ? "null" : `'${x}'`)).join(",")}]::uuid[]`;
const textos = (xs: string[]) => `array[${xs.map((x) => `'${x}'`).join(",")}]::text[]`;

function consultaDaGrade(): string {
  const origens = lista([...ORIGENS.map((o) => o.id), id("e0", 99)]);
  return `select 'R:' || string_agg(x, ';' order by x) from (
    select 'o:' || o || ':' || p || '=' || public.fn_escale_tem_acesso_a_origem(o, p) as x
      from unnest(${lista(ORGS)}) o, unnest(${origens}) p
    union all
    select 'g:' || o || ':' || g || '=' || public.fn_escale_tem_acesso_ao_grupo(o, g)
      from unnest(${lista(ORGS)}) o, unnest(${lista(GRUPOS)}) g
    union all
    select 'n:' || o || ':' || coalesce(d::text, '-') || ':' || p || '=' || public.fn_escale_pode_ver_negocio(o, d, p)
      from unnest(${lista(ORGS)}) o, unnest(${lista([...DONOS, U.adm])}) d, unnest(${origens}) p
    union all
    select 'k:' || o || ':' || k || '=' || public.fn_crm_pode(o, k)
      from unnest(${lista(ORGS)}) o, unnest(${textos(CHAVES)}) k
  ) t;`;
}

function blocoDeInsercoes(): string {
  const tentativas: string[] = [];
  for (const o of ORIGENS) {
    for (const org of [o.org, o.org === ORG_A ? ORG_B : ORG_A]) {
      for (const dono of [null, U.ag1, U.ag2, U.mgr]) {
        tentativas.push(`('${org}', '${o.id}', '${etapa(o)}', ${dono ? `'${dono}'` : "null"})`);
      }
    }
  }
  return `do $ins$
declare r record; acc text := '';
begin
  for r in select * from (values ${tentativas.join(",")}) v(org, pipeline, etapa, dono) loop
    begin
      insert into public.crm_leads (organization_id, pipeline_id, stage_id, title, owner_user_id)
        values (r.org::uuid, r.pipeline::uuid, r.etapa::uuid, 'q7b tentativa', r.dono::uuid);
      raise exception using errcode = 'QQ701';
    exception
      when sqlstate 'QQ701' then acc := acc || r.org || '/' || r.pipeline || '/' || coalesce(r.dono, '-') || '=ok;';
      when others then acc := acc || r.org || '/' || r.pipeline || '/' || coalesce(r.dono, '-') || '=' || sqlstate || ';';
    end;
  end loop;
  perform set_config('q7b.saida', acc, false);
end
$ins$;
select 'R:' || current_setting('q7b.saida');`;
}

function scriptDaPessoa(p: Persona): string {
  const partes: string[] = [
    "\\set VERBOSITY sqlstate",
    `select set_config('request.jwt.claims', '${p.claims}', false) is not null as ok \\gset`,
    `set role ${p.papel};`,
  ];
  for (const [t, chave] of TABELAS) {
    partes.push(`\\echo Q:ler:${t}`);
    partes.push(
      `select 'R:' || coalesce(string_agg(${chave}, ',' order by ${chave}), '') from public.${t};`,
    );
  }
  for (const [t, set, chave] of [
    ["crm_leads", "title = title", "id::text"],
    ["crm_pipelines", "name = name", "id::text"],
    ["crm_stages", "name = name", "id::text"],
  ] as const) {
    partes.push(`\\echo Q:atualizar:${t}`);
    partes.push(
      `begin; with w as (update public.${t} set ${set} returning ${chave} as k) select 'R:' || coalesce(string_agg(k, ',' order by k), '') from w; rollback;`,
    );
  }
  partes.push("\\echo Q:apagar:crm_leads");
  partes.push(
    "begin; with w as (delete from public.crm_leads returning id::text as k) select 'R:' || coalesce(string_agg(k, ',' order by k), '') from w; rollback;",
  );
  partes.push("\\echo Q:inserir:crm_leads");
  partes.push(`begin; ${blocoDeInsercoes()} rollback;`);
  partes.push("\\echo Q:grade");
  partes.push(consultaDaGrade());
  return partes.join("\n");
}

/** Roda o script da pessoa e devolve {consulta → resultado ou ERRO:<sqlstate>}. */
function alcance(banco: string, p: Persona): Record<string, string> {
  const saida = execFileSync(
    "docker",
    ["exec", "-i", CONTAINER, "sh", "-c", `psql -U postgres -d ${banco} -tAq -f - 2>&1`],
    { input: scriptDaPessoa(p), encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  const resultado: Record<string, string> = {};
  let atual: string | null = null;
  for (const linha of saida.split("\n")) {
    if (linha.startsWith("Q:")) {
      atual = linha.slice(2).trim();
    } else if (atual && linha.startsWith("R:")) {
      resultado[atual] = linha.slice(2).trim();
      atual = null;
    } else if (atual && /ERROR:/.test(linha)) {
      resultado[atual] = `ERRO:${linha.replace(/^.*ERROR:\s*/, "").trim()}`;
      atual = null;
    }
  }
  return resultado;
}

const ALCANCE_ANTES: Record<string, Record<string, string>> = {};
const ALCANCE_DEPOIS: Record<string, Record<string, string>> = {};

beforeAll(() => {
  if (!CONTAINER) throw new Error("TEST_DB_CONTAINER ausente — rode via `pnpm test:db`");
  montarAntes();
  nosDois(semeadura());
  for (const p of PESSOAS) {
    ALCANCE_ANTES[p.nome] = alcance(ANTES, p);
    ALCANCE_DEPOIS[p.nome] = alcance(DEPOIS, p);
  }
}, 300_000);

afterAll(() => {
  if (CONTAINER) sqlEm("template1", `drop database if exists ${ANTES} with (force);`);
});

const CONSULTAS = [
  ...TABELAS.map(([t]) => `ler:${t}`),
  "atualizar:crm_leads",
  "atualizar:crm_pipelines",
  "atualizar:crm_stages",
  "apagar:crm_leads",
  "inserir:crm_leads",
  "grade",
];

describe("migration 9402 — a semeadura e as sessões valem nos dois bancos", () => {
  it("o suporte está ativo (papel viewer/admin) e cada pessoa respondeu a todas as consultas", () => {
    for (const banco of [ANTES, DEPOIS]) {
      const papeis = sqlEm(
        banco,
        `select set_config('request.jwt.claims', '${claims(U.paLeitura, SESSAO.paLeitura)}', false);
         select public.fn_user_role_in_org('${ORG_A}');
         select set_config('request.jwt.claims', '${claims(U.paCompleto, SESSAO.paCompleto)}', false);
         select public.fn_user_role_in_org('${ORG_B}');`,
      ).split("\n");
      expect(papeis[1]).toBe("viewer");
      expect(papeis[3]).toBe("admin");
    }
    for (const p of PESSOAS) {
      for (const c of CONSULTAS) {
        expect(ALCANCE_ANTES[p.nome]?.[c], `${p.nome} / ${c} (antes)`).toBeDefined();
        expect(ALCANCE_DEPOIS[p.nome]?.[c], `${p.nome} / ${c} (depois)`).toBeDefined();
      }
    }
  });

  it("a semeadura cobre cada caso: o admin vê os negócios cruzados, o gerente não vê a origem fora da lista", () => {
    const leads = (nome: string) => (ALCANCE_DEPOIS[nome]?.["ler:crm_leads"] ?? "").split(",");
    expect(leads("admin")).toContain(id("12", ORIGENS.length * DONOS.length + 1));
    expect(leads("gerente")).not.toContain(id("12", 1 + DONOS.length * 2)); // origem 3 (grupo só do atendente 2)
    expect(leads("atendente 2 (setor 2, listas, também em C)").length).toBeGreaterThan(5);
    expect(
      ALCANCE_DEPOIS["atendente 1 (setor 1, lista da origem 2)"]?.["ler:conversations"],
    ).toContain(id("19", 2));
  });
});

describe("migration 9402 — mesma visibilidade e mesma escrita para cada pessoa", () => {
  for (const p of PESSOAS) {
    it(`${p.nome}: o que lê, atualiza, apaga, insere e a grade das funções são os de antes`, () => {
      const antes = ALCANCE_ANTES[p.nome]!;
      const depois = ALCANCE_DEPOIS[p.nome]!;
      for (const c of CONSULTAS) {
        const tabela = c.replace(/^ler:/, "");
        if (c.startsWith("ler:") && DISTRIBUICAO.has(tabela) && PLATFORM_ADMINS.has(p.nome))
          continue;
        expect(depois[c], `${p.nome} / ${c}`).toBe(antes[c]);
      }
    });
  }
});

describe("migration 9402 — B7-9: a distribuição alarga só para o platform admin", () => {
  it("o platform admin passa a ler todas as linhas; antes via um subconjunto", () => {
    for (const nome of PLATFORM_ADMINS) {
      for (const t of DISTRIBUICAO) {
        const todas = sqlEm(DEPOIS, `select count(*) from public.${t};`);
        const depois = ALCANCE_DEPOIS[nome]![`ler:${t}`]!;
        const antes = ALCANCE_ANTES[nome]![`ler:${t}`]!;
        expect(depois.split(",").filter(Boolean).length, `${nome} / ${t}`).toBe(Number(todas));
        for (const linha of antes.split(",").filter(Boolean))
          expect(depois.split(",")).toContain(linha);
      }
    }
    // o suporte somente leitura (papel viewer) não via nada da origem
    expect(
      ALCANCE_ANTES["suporte somente leitura (escopo leitura)"]!["ler:crm_distribuicao_de_dono"],
    ).toBe("");
  });

  it("viewer, atendente e vínculo revogado seguem sem ler a distribuição", () => {
    for (const nome of [
      "viewer",
      "atendente 1 (setor 1, lista da origem 2)",
      "vínculo revogado",
      "sem vínculo",
    ]) {
      for (const t of DISTRIBUICAO)
        expect(ALCANCE_DEPOIS[nome]![`ler:${t}`], `${nome} / ${t}`).toBe("");
    }
  });
});

describe("migration 9402 — isolamento entre organizações", () => {
  it("o gerente de B não alcança nada de A, e quem é só de A não alcança B", () => {
    const deA = new Set(
      sqlEm(
        DEPOIS,
        `select string_agg(id::text, ',') from public.crm_leads where organization_id = '${ORG_A}';`,
      ).split(","),
    );
    const doGerenteDeB =
      ALCANCE_DEPOIS["gerente de outra organização"]!["ler:crm_leads"]!.split(",").filter(Boolean);
    expect(doGerenteDeB.length).toBeGreaterThan(0);
    for (const l of doGerenteDeB) expect(deA.has(l)).toBe(false);
    const deB = new Set(
      sqlEm(
        DEPOIS,
        `select string_agg(id::text, ',') from public.crm_leads where organization_id = '${ORG_B}';`,
      ).split(","),
    );
    for (const l of ALCANCE_DEPOIS["admin"]!["ler:crm_leads"]!.split(","))
      expect(deB.has(l)).toBe(false);
    for (const t of ["ler:conversations", "ler:crm_pipelines", "ler:crm_notas_do_negocio"]) {
      expect(ALCANCE_DEPOIS["gerente de outra organização"]![t]).not.toContain(`${P}e0000000001`);
    }
  });
});

describe("migration 9402 — nada além do previsto mudou no catálogo", () => {
  const POLICIES_REESCRITAS = new Set([
    "crm_leads.crm_leads_select",
    "crm_leads.crm_leads_insert",
    "crm_leads.crm_leads_update",
    "crm_leads.crm_leads_delete",
    "crm_lead_activities.crm_lead_activities_select",
    "crm_lead_links.crm_lead_links_select",
    "crm_notas_do_negocio.crm_notas_do_negocio_select",
    "crm_pipelines.crm_pipelines_select",
    "crm_pipelines.crm_pipelines_manager_write",
    "crm_stages.crm_stages_select",
    "crm_stages.crm_stages_manager_write",
    "conversations.crm_conversations_select_setor",
    "crm_distribuicao_de_dono.crm_distribuicao_de_dono_select",
    "crm_distribuicoes_feitas.crm_distribuicoes_feitas_select",
    "crm_distribuicao_alteracoes.crm_distribuicao_alteracoes_select",
  ]);
  const EMBRULHADO = "( SELECT auth.uid() AS uid)";
  const embrulhar = (s: string) =>
    s
      .split(EMBRULHADO)
      .map((parte) => parte.split("auth.uid()").join(EMBRULHADO))
      .join(EMBRULHADO);

  type Policy = {
    chave: string;
    cmd: string;
    permissive: string;
    roles: string;
    qual: string;
    check: string;
  };
  function policies(banco: string): Map<string, Policy> {
    const saida = sqlEm(
      banco,
      `select json_agg(json_build_object('chave', tablename || '.' || policyname, 'cmd', cmd, 'permissive', permissive,
              'roles', roles::text, 'qual', coalesce(qual, ''), 'check', coalesce(with_check, '')))
         from pg_policies where schemaname = 'public';`,
    );
    return new Map((JSON.parse(saida) as Policy[]).map((p) => [p.chave, p]));
  }

  it("mesmas policies, mesmos comandos/papéis/tipo; só as previstas mudaram de expressão", () => {
    const antes = policies(ANTES);
    const depois = policies(DEPOIS);
    expect([...depois.keys()].sort()).toEqual([...antes.keys()].sort());
    let embrulhadas = 0;
    for (const [chave, a] of antes) {
      const d = depois.get(chave)!;
      expect([d.cmd, d.permissive, d.roles], chave).toEqual([a.cmd, a.permissive, a.roles]);
      if (POLICIES_REESCRITAS.has(chave)) continue;
      const tabela = chave.split(".")[0]!;
      const g718 = tabela.startsWith("crm_") && embrulhar(a.qual + a.check) !== a.qual + a.check;
      if (g718) embrulhadas += 1;
      expect(d.qual, `${chave} (using)`).toBe(g718 ? embrulhar(a.qual) : a.qual);
      expect(d.check, `${chave} (with check)`).toBe(g718 ? embrulhar(a.check) : a.check);
    }
    expect(embrulhadas).toBe(35);
    // o WITH CHECK da escrita do gerente nas origens e etapas não mudou
    for (const c of [
      "crm_pipelines.crm_pipelines_manager_write",
      "crm_stages.crm_stages_manager_write",
    ]) {
      expect(depois.get(c)!.check).toBe(antes.get(c)!.check);
    }
    // nenhuma policy crm_* ficou com auth.uid() solto
    for (const [chave, d] of depois) {
      if (!chave.startsWith("crm_") && !POLICIES_REESCRITAS.has(chave)) continue;
      expect((d.qual + d.check).split(EMBRULHADO).join(""), chave).not.toContain("auth.uid()");
    }
  });

  it("nenhuma outra função mudou; as novas são definer e fechadas a anon e PUBLIC", () => {
    const funcoes = (banco: string) =>
      new Map(
        (
          JSON.parse(
            sqlEm(
              banco,
              `select json_agg(json_build_array(p.oid::regprocedure::text, md5(pg_get_functiondef(p.oid)), coalesce(p.proacl::text, '')))
                 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.prokind = 'f';`,
            ),
          ) as Array<[string, string, string]>
        ).map(([f, md5, acl]) => [f, { md5, acl }]),
      );
    const antes = funcoes(ANTES);
    const depois = funcoes(DEPOIS);
    const reescritas = new Set([
      "fn_escale_tem_acesso_a_origem(uuid,uuid)",
      "fn_escale_tem_acesso_ao_grupo(uuid,uuid)",
      "fn_escale_pode_ver_negocio(uuid,uuid,uuid)",
      "fn_crm_pode(uuid,text)",
    ]);
    const novas = [
      "fn_escale_meus_papeis()",
      "fn_escale_origens_que_vejo()",
      "fn_crm_orgs_que_veem_pelo_setor()",
      "fn_crm_conversa_no_meu_setor(uuid,uuid,uuid)",
    ];
    for (const [f, a] of antes) {
      const d = depois.get(f);
      expect(d, f).toBeDefined();
      expect(d!.acl, `${f} (acl)`).toBe(a.acl);
      if (!reescritas.has(f)) expect(d!.md5, f).toBe(a.md5);
    }
    expect([...depois.keys()].filter((f) => !antes.has(f)).sort()).toEqual([...novas].sort());
    for (const f of novas) {
      const r = sqlEm(
        DEPOIS,
        `select p.prosecdef, has_function_privilege('anon', p.oid, 'execute'),
                has_function_privilege('authenticated', p.oid, 'execute'),
                exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0)
           from pg_proc p where p.oid = 'public.${f}'::regprocedure;`,
      );
      expect(r, f).toBe("t|f|t|f");
    }
  });
});

describe("migration 9402 — a regra deixou de rodar por linha (G7-4, G7-5)", () => {
  /** Chamadas de uma função durante a consulta, contadas pelo próprio banco. */
  function chamadas(banco: string, quem: string, funcao: string, consulta: string): number {
    const saida = sqlEm(
      banco,
      `set track_functions = 'all';
       begin;
       select set_config('request.jwt.claims', '${claims(quem)}', true);
       set local role authenticated;
       ${consulta}
       reset role;
       select coalesce(sum(pg_stat_get_xact_function_calls(p.oid)), 0) from pg_proc p
        where p.oid = 'public.${funcao}'::regprocedure;
       commit;`,
    ).split("\n");
    return Number(saida[saida.length - 1]);
  }

  it("ler o quadro chama fn_user_role_in_org um número fixo de vezes, não uma por negócio", () => {
    const consulta = "select count(*) from public.crm_leads;";
    const antes = chamadas(ANTES, U.ag2, "fn_user_role_in_org(uuid)", consulta);
    const depois = chamadas(DEPOIS, U.ag2, "fn_user_role_in_org(uuid)", consulta);
    expect(antes).toBeGreaterThan(N_EM_MASSA);
    expect(depois).toBeLessThan(20);
    const negocioAntes = chamadas(
      ANTES,
      U.ag2,
      "fn_escale_pode_ver_negocio(uuid,uuid,uuid)",
      consulta,
    );
    expect(negocioAntes).toBeGreaterThan(N_EM_MASSA);
    expect(chamadas(DEPOIS, U.ag2, "fn_escale_pode_ver_negocio(uuid,uuid,uuid)", consulta)).toBe(0);
  });

  it("a linha do tempo não chama mais a regra do negócio duas vezes por linha", () => {
    const consulta = "select count(*) from public.crm_lead_activities;";
    expect(chamadas(DEPOIS, U.ag2, "fn_escale_pode_ver_negocio(uuid,uuid,uuid)", consulta)).toBe(0);
    expect(chamadas(DEPOIS, U.ag2, "fn_user_role_in_org(uuid)", consulta)).toBeLessThan(20);
  });

  it("a fila do atendente resolve papel e permissão uma vez por organização", () => {
    const consulta = "select count(*) from public.conversations;";
    const antes = chamadas(ANTES, U.ag1, "fn_crm_pode(uuid,text)", consulta);
    const depois = chamadas(DEPOIS, U.ag1, "fn_crm_pode(uuid,text)", consulta);
    expect(antes).toBeGreaterThan(depois);
    expect(depois).toBeLessThanOrEqual(1);
  });
});
