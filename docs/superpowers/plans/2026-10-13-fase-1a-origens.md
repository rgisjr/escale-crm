# Fase 1A — Origens (grupos de funis + painel Origens) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar à tela de Negócios da casca nova o painel **Origens** da V1 da Clint — grupos de funis que abrem os funis de cada um, busca pela lupa e a janela "Organizar origens" (criar, renomear e excluir grupo, mover funil de grupo) — com os grupos guardados no banco e isolados por organização.

**Architecture:** Uma migration do fork (`9001`) cria `crm_pipeline_groups` e a coluna `crm_pipelines.group_id`, ligada por FK **composta** `(organization_id, group_id)`, que impede no banco ligar funil a grupo de outra organização; o mesmo SQL entra no `baseline.sql` num ponto fixo do meio do arquivo. As regras puras ficam em `lib/escale/origens/`, quatro rotas novas (arquivos novos) escrevem e devolvem as origens inteiras relidas do banco, e o painel é um componente novo que um `layout.tsx` novo põe ao lado de `/app/pipelines/*` e `/app/kanban` **só quando a casca nova (cookie `escale_menu=topo`) está ligada**. Arquivos do original tocados só por blocos pequenos em pontos fixos: `supabase/baseline.sql`, `lib/i18n/dicionario.ts`, `lib/audit/actions.ts` e `tests/invariants/rls-completude-varredura.test.ts`.

**Tech Stack:** Postgres 15+/Supabase (RLS), Next.js 16 App Router, React 19, TypeScript estrito, Zod 4, TanStack Query, Vitest + Testing Library, Tailwind 4 (tokens em CSS), Phosphor (via `@/lib/ui/icons`).

## Global Constraints

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`. Base: `escale-crm/main`. Branch: `feat/fase-1a-origens`. PR para `rgisjr/escale-crm` base `main`; quem aprova é o usuário. Nunca dar push em `origin` (Rafael). Não mergear, não publicar release, não mexer na VPS nem no banco de produção.
- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`. Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- Migration do fork: número **9001** (faixa 9001+ é do fork; a regra do repo só proíbe número repetido). Arquivo `supabase/migrations/20261013220000_9001_grupos_de_funis.sql`, com `-- manifest:` na primeira linha. **Não** acrescentar linha no `supabase/migrations/MANIFEST.md`.
- O MESMO SQL vai para `supabase/baseline.sql`, logo ANTES da linha `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----`, com o cabeçalho `-- ---- FORK ESCALE · grupos de funis (migration 9001) ----`. Nunca no fim do arquivo (é onde o original acrescenta).
- Regra de acesso de `crm_pipeline_groups` = a de `crm_pipelines`: SELECT para membros da organização (+ `fn_is_platform_admin()`); escrita só `manager`+ (+ `fn_is_platform_admin_full()`).
- Rotas: sessão por cookie, `requireSupportWrite()` + `requireRole("manager")` em todo handler de escrita, `organization_id` sempre da sessão (nunca do corpo/URL), toda leitura e escrita filtrada por `organization_id`, e a resposta é sempre `{ data: Origens }` relido do banco.
- Os blocos do fork em arquivos do original vão em pontos fixos do MEIO: dicionário logo depois de `"Não consegui carregar as conversas.": …` (fim do bloco da Fase 0); auditoria logo depois de `"pipeline.unarchived",`; `PROVA_PROPRIA` logo depois de `const PROVA_PROPRIA: readonly Excecao[] = [`.
- Todo texto de tela passa por `t()` com literal (nunca `t(variavel)`; `t(obj.prop)` é aceito) e tem espanhol no dicionário. Chave repetida no dicionário quebra o typecheck.
- O painel só existe com a casca nova ligada e só em `md+`. Com `escale_menu` ausente ou `lateral`, `/app/pipelines/*` e `/app/kanban` renderizam exatamente como hoje.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; corpo do PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Testes que falham NESTA máquina Windows e também no original (pdfjs com caminho `C:\…`, `spawnSync bash ENOENT`, `chmod 600`, caminho com espaço) não são regressão — ver memória `sincronizar-com-o-rafael`. Regressão é teste que passa em `escale-crm/main` e falha na branch.
- `pnpm test:db` precisa do Docker Desktop rodando. Se não estiver, PARE e peça ao usuário para abrir o Docker.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `supabase/migrations/20261013220000_9001_grupos_de_funis.sql` | novo | tabela, coluna, FK composta, RLS, travas do suporte |
| `supabase/baseline.sql` | alterado (bloco no meio) | o mesmo SQL para o self-host (`install.sh`/`update.sh`) |
| `tests/unit/escale-grupos-de-funis-migration.test.ts` | novo | migration ↔ baseline, posição do bloco, forma do SQL |
| `tests/invariants/escale-grupos-de-funis-rls.test.ts` | novo | prova no Postgres: isolamento, papel, FK, set null |
| `tests/invariants/rls-completude-varredura.test.ts` | alterado (1 entrada) | registra a prova da tabela nova em `PROVA_PROPRIA` |
| `lib/escale/origens/regras.ts` | novo | tipos, nome de grupo, árvore, busca, iniciais, cor |
| `lib/i18n/dicionario.ts` | alterado (bloco) | 19 textos novos em espanhol |
| `tests/unit/escale-origens-regras.test.ts` | novo | regras puras |
| `lib/escale/origens/ler-origens.ts` | novo | leitura de grupos + funis vivos da organização |
| `lib/escale/origens/respostas.ts` | novo | JSON, releitura e conflito de nome das rotas |
| `lib/audit/actions.ts` | alterado (bloco) | 4 códigos de auditoria |
| `app/api/v1/pipeline-groups/route.ts` | novo | `POST` cria grupo |
| `app/api/v1/pipeline-groups/[id]/route.ts` | novo | `PATCH` renomeia, `DELETE` exclui |
| `app/api/v1/pipelines/[id]/grupo/route.ts` | novo | `PUT` põe/tira o funil de um grupo |
| `tests/unit/escale-grupos-de-funis-rotas.test.ts` | novo | as quatro rotas |
| `hooks/escale/useOrigens.ts` | novo | mutações (TanStack Query) |
| `components/escale/origens/OrganizarOrigens.tsx` | novo | janela de organizar |
| `components/escale/origens/PainelOrigens.tsx` | novo | painel da esquerda |
| `tests/unit/escale-organizar-origens.test.tsx` | novo | janela |
| `tests/unit/escale-painel-origens.test.tsx` | novo | painel |
| `components/escale/origens/ComOrigens.tsx` | novo | Server Component: chave + leitura + encaixe |
| `app/app/pipelines/layout.tsx` | novo | põe o painel ao lado do quadro |
| `app/app/kanban/layout.tsx` | novo | põe o painel ao lado da lista de funis |
| `tests/unit/escale-com-origens.test.tsx` | novo | chave ligada/desligada, banco sem a migration |

---

### Task 1: Branch, migration 9001 e o bloco do baseline

**Files:**
- Create: `supabase/migrations/20261013220000_9001_grupos_de_funis.sql`, `tests/unit/escale-grupos-de-funis-migration.test.ts`
- Modify: `supabase/baseline.sql` (bloco antes da linha `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----`)
- Copy: este plano para `docs/superpowers/plans/2026-10-13-fase-1a-origens.md` no repositório

**Interfaces:**
- Produces: tabela `public.crm_pipeline_groups (id uuid, organization_id uuid, name text, created_at, updated_at)`; coluna `public.crm_pipelines.group_id uuid null`; constraints/índices com os nomes `crm_pipeline_groups_nome_valido`, `crm_pipeline_groups_org_id_key`, `uq_crm_pipeline_groups_org_nome`, `crm_pipelines_group_fk`, `idx_crm_pipelines_group_id`; policies `crm_pipeline_groups_select`, `crm_pipeline_groups_manager_write`. A Task 2 prova isso no Postgres; a Task 4 lê e escreve essas colunas.

- [ ] **Step 1: Branch e plano no repositório**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git switch -c feat/fase-1a-origens escale-crm/main
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-13-fase-1a-origens.md" docs/superpowers/plans/
```

- [ ] **Step 2: Escrever o teste estático (vai falhar)**

Create `tests/unit/escale-grupos-de-funis-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * GRUPOS DE FUNIS (fork Escale, migration 9001): a migration e o apêndice do
 * baseline são o MESMO SQL, e o bloco mora no ponto fixo do fork.
 *
 * O kit self-host (`install.sh` e `update.sh`) aplica SÓ o `baseline.sql`; a
 * migration é a fonte da verdade da cadeia. Divergir entre os dois entrega um
 * produto diferente do que o repositório diz.
 *
 * Ponto fixo: DEPOIS da definição de `fn_aplicar_travas_de_suporte()` (o bloco
 * chama a função, e a instalação nova aplica o arquivo em ordem, com
 * ON_ERROR_STOP) e ANTES do bloco da 0323 — no meio do arquivo, longe do fim,
 * onde o original acrescenta os blocos dele e o conflito de sincronização mora.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261013220000_9001_grupos_de_funis.sql";
const CABECALHO = "-- ---- FORK ESCALE · grupos de funis (migration 9001) ----";

/** O checkout do Windows traz CRLF; o do CI, LF. A comparação é de conteúdo. */
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("grupos de funis: migration 9001 e apêndice do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença", () => {
    const migration = ler(MIGRATION);
    expect(migration.length).toBeGreaterThan(1000);
    expect(ler("supabase/baseline.sql").includes(migration)).toBe(true);
  });

  it("o bloco mora no ponto fixo do fork: depois da função das travas, antes do bloco da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const migration = ler(MIGRATION);
    const travas = baseline.indexOf("create or replace function public.fn_aplicar_travas_de_suporte()");
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(migration);
    const ancora = baseline.indexOf(
      "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----",
    );
    expect(travas).toBeGreaterThan(-1);
    expect(ancora).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(travas);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("a tabela nova nasce com RLS, escrita de gerente, FK composta e travas do suporte", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("alter table public.crm_pipeline_groups enable row level security;");
    expect(sql).toContain("public.fn_role_at_least(organization_id, 'manager')");
    expect(sql).toContain("foreign key (organization_id, group_id)");
    expect(sql).toContain("on delete set null (group_id)");
    expect(sql).toContain("revoke all on public.crm_pipeline_groups from anon;");
    expect(sql).toContain("perform public.fn_aplicar_travas_de_suporte()");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-grupos-de-funis-migration.test.ts
```
Expected: FAIL — `expected false to be true` no primeiro teste (a migration não existe).

- [ ] **Step 4: Escrever a migration**

Create `supabase/migrations/20261013220000_9001_grupos_de_funis.sql` (a primeira linha é o `-- manifest:`, numa linha só):

```sql
-- manifest: **Grupos de funis (fork Escale, Fase 1A — painel Origens).** Tabela nova `crm_pipeline_groups` (organização + nome, único por organização sem olhar caixa) e coluna `crm_pipelines.group_id`, ligada por FK COMPOSTA `(organization_id, group_id)` → `crm_pipeline_groups (organization_id, id)`: o banco recusa ligar funil a grupo de outra organização, e excluir o grupo solta os funis (`on delete set null (group_id)`, pg15+) sem apagar nenhum. RLS igual à de `crm_pipelines`: toda a organização lê, só gerente ou admin escreve. Numeração 9001+ é a faixa do fork, para nunca disputar número com o original.
-- 9001: grupos de funis (fork Escale).

create table if not exists public.crm_pipeline_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_pipeline_groups_nome_valido check (char_length(btrim(name)) between 1 and 60),
  constraint crm_pipeline_groups_org_id_key unique (organization_id, id)
);

-- Nome único por organização, sem olhar caixa: "INSS" e "inss" seriam dois
-- grupos iguais no painel. A rota confere antes (e também sem acento); o índice
-- é a guarda contra corrida entre duas abas.
create unique index if not exists uq_crm_pipeline_groups_org_nome
  on public.crm_pipeline_groups (organization_id, lower(btrim(name)));

alter table public.crm_pipeline_groups enable row level security;

-- A mesma régua de crm_pipelines (migrations 0030 e 0533): ver e abrir é de
-- qualquer papel; organizar é configuração, manager+. O bypass da plataforma na
-- escrita é o `_full`, que o suporte em modo somente leitura não tem.
drop policy if exists crm_pipeline_groups_select on public.crm_pipeline_groups;
drop policy if exists crm_pipeline_groups_manager_write on public.crm_pipeline_groups;

create policy crm_pipeline_groups_select on public.crm_pipeline_groups
  for select using (
    (organization_id in (select public.fn_user_org_ids()))
    or public.fn_is_platform_admin()
  );

create policy crm_pipeline_groups_manager_write on public.crm_pipeline_groups
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

revoke all on public.crm_pipeline_groups from anon;
grant select, insert, update, delete on public.crm_pipeline_groups to authenticated;
grant all on public.crm_pipeline_groups to service_role;

drop trigger if exists trg_crm_pipeline_groups_updated_at on public.crm_pipeline_groups;
create trigger trg_crm_pipeline_groups_updated_at
  before update on public.crm_pipeline_groups
  for each row execute function public.fn_set_updated_at();

alter table public.crm_pipelines add column if not exists group_id uuid;

-- FK COMPOSTA: com `organization_id` dos dois lados, funil da organização A não
-- aponta para grupo da B nem por engano da aplicação. `set null (group_id)` só
-- zera o grupo — `organization_id` é NOT NULL e fica onde está.
do $grupo$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_pipelines_group_fk'
  ) then
    alter table public.crm_pipelines
      add constraint crm_pipelines_group_fk
      foreign key (organization_id, group_id)
      references public.crm_pipeline_groups (organization_id, id)
      on delete set null (group_id);
  end if;
end $grupo$;

create index if not exists idx_crm_pipelines_group_id
  on public.crm_pipelines (group_id) where group_id is not null;

comment on table public.crm_pipeline_groups is
  'Grupos de funis (fork Escale, migration 9001): o painel Origens de Negócios mostra cada grupo abrindo os funis dele. Excluir o grupo solta os funis (group_id vira null), nunca apaga funil.';
comment on column public.crm_pipelines.group_id is
  'Grupo de funis (crm_pipeline_groups) da MESMA organização — a FK composta crm_pipelines_group_fk recusa grupo de outra. NULL = "Sem grupo".';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
-- Na cadeia de migrations, esta chamada é o que dá as três travas
-- support_write_* à tabela nova. No baseline.sql o bloco mora ANTES da última
-- chamada do arquivo, que também a cobre; chamar aqui é idempotente.
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

- [ ] **Step 5: Pôr o mesmo SQL no baseline, no ponto fixo**

Rode da raiz do repositório (o script respeita o fim de linha do arquivo e recusa rodar duas vezes):

```bash
node -e '
const fs = require("fs");
const MIG = "supabase/migrations/20261013220000_9001_grupos_de_funis.sql";
const BASE = "supabase/baseline.sql";
const ANCORA = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const CAB = "-- ---- FORK ESCALE · grupos de funis (migration 9001) ----";
const base = fs.readFileSync(BASE, "utf8");
if (base.includes(CAB)) throw new Error("o bloco 9001 já está no baseline");
const i = base.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 0323 não encontrada");
const eol = base.includes("\r\n") ? "\r\n" : "\n";
let mig = fs.readFileSync(MIG, "utf8").replace(/\r\n/g, "\n");
if (!mig.endsWith("\n")) mig += "\n";
const bloco = (CAB + "\n" + mig + "\n").replace(/\n/g, eol);
fs.writeFileSync(BASE, base.slice(0, i) + bloco + base.slice(i));
console.log("bloco 9001 inserido antes da linha", base.slice(0, i).split("\n").length);
'
```
Expected: `bloco 9001 inserido antes da linha 325xx` (número em torno de 32505).

- [ ] **Step 6: Rodar o teste e os gates do baseline**

```bash
corepack pnpm vitest run tests/unit/escale-grupos-de-funis-migration.test.ts tests/unit/baseline-reaplicavel.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/check-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/apendice-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/sonda-do-baseline-ancora-na-ultima-definicao.test.ts tests/unit/baseline-no-piso-do-postgres.test.ts
```
Expected: PASS nos 7 arquivos. Se `manifest-x-migrations` reclamar, confira se a PRIMEIRA linha da migration é `-- manifest: …` (uma linha só) e se nada foi acrescentado ao `MANIFEST.md`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261013220000_9001_grupos_de_funis.sql supabase/baseline.sql tests/unit/escale-grupos-de-funis-migration.test.ts docs/superpowers/plans/2026-10-13-fase-1a-origens.md
git commit -m "feat(escale): grupos de funis no banco (migration 9001)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Prova no Postgres (isolamento, papel, FK) e registro na varredura de RLS

**Files:**
- Create: `tests/invariants/escale-grupos-de-funis-rls.test.ts`
- Modify: `tests/invariants/rls-completude-varredura.test.ts` (1 entrada no topo de `PROVA_PROPRIA`)

**Interfaces:**
- Consumes: o schema da Task 1; `seedGov`, `sql`, `countAs`, `writeCountAs`, `lastLine`, `GOV_ORG`, `GOV_PIPELINE`, `GOV_VIEWER`, `GOV_AGENT_A`, `GOV_MANAGER` de `tests/invariants/gov-helpers.ts`.
- Produces: nada para outras tasks (é prova).

- [ ] **Step 1: Escrever a prova**

Create `tests/invariants/escale-grupos-de-funis-rls.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_MANAGER,
  GOV_ORG,
  GOV_PIPELINE,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * GRUPOS DE FUNIS (fork Escale, migration 9001) — prova contra Postgres real.
 *
 * RLS ligada e policy presente não é isolamento (ver o cabeçalho de
 * `rls-completude-varredura.test.ts`): aqui dois tenants reais leem por JWT e
 * contam o que veem; a escrita é medida por papel; e a FK composta é medida
 * tentando o cruzamento que ela existe para impedir.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const ORG_B = "e5ca1e00-9001-4000-8000-000000000001";
const USER_B = "e5ca1e00-9001-4000-8000-000000000002";
const FUNIL_B = "e5ca1e00-9001-4000-8000-000000000003";
const FUNIL_SOLTO = "e5ca1e00-9001-4000-8000-000000000004";
const GRUPO_A = "e5ca1e00-9001-4000-8000-000000000011";
const GRUPO_B = "e5ca1e00-9001-4000-8000-000000000012";
const GRUPO_TEMPORARIO = "e5ca1e00-9001-4000-8000-000000000013";

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email)
      values ('${USER_B}', 'escale-grupos-b@invariant.test')
      on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-grupos-b', 'Escale Grupos Org B', 'Escale B')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${FUNIL_B}', '${ORG_B}', 'Funil da B', 'escale-funil-da-b')
      on conflict do nothing;
    insert into public.crm_pipeline_groups (id, organization_id, name)
      values ('${GRUPO_A}', '${GOV_ORG}', 'INSS de obras'),
             ('${GRUPO_B}', '${ORG_B}', 'INSS de obras')
      on conflict do nothing;
    update public.crm_pipelines set group_id = '${GRUPO_A}' where id = '${GOV_PIPELINE}';
  `);
});

describe("crm_pipeline_groups — isolamento entre organizações (RLS)", () => {
  it("o mesmo nome pode existir em duas organizações: o único é por organização", () => {
    expect(
      sql(`select count(*) from public.crm_pipeline_groups where id in ('${GRUPO_A}', '${GRUPO_B}');`),
    ).toBe("2");
  });

  it("cada organização vê o próprio grupo e nenhum do vizinho, nos dois sentidos", () => {
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_pipeline_groups where id = '${GRUPO_A}';`)).toBe(1);
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_pipeline_groups where id = '${GRUPO_B}';`)).toBe(0);
    expect(countAs(USER_B, `select count(*) from public.crm_pipeline_groups where id = '${GRUPO_B}';`)).toBe(1);
    expect(countAs(USER_B, `select count(*) from public.crm_pipeline_groups where id = '${GRUPO_A}';`)).toBe(0);
  });
});

describe("crm_pipeline_groups — quem escreve", () => {
  it("viewer e agent não criam grupo", () => {
    expect(
      writeCountAs(GOV_VIEWER, `insert into public.crm_pipeline_groups (organization_id, name) values ('${GOV_ORG}', 'Do viewer')`),
    ).toBe(0);
    expect(
      writeCountAs(GOV_AGENT_A, `insert into public.crm_pipeline_groups (organization_id, name) values ('${GOV_ORG}', 'Do agent')`),
    ).toBe(0);
  });

  it("manager cria grupo na própria organização (controle positivo), e não na do vizinho", () => {
    expect(
      writeCountAs(GOV_MANAGER, `insert into public.crm_pipeline_groups (organization_id, name) values ('${GOV_ORG}', 'Do gestor')`),
    ).toBe(1);
    expect(
      writeCountAs(GOV_MANAGER, `insert into public.crm_pipeline_groups (organization_id, name) values ('${ORG_B}', 'Invasão')`),
    ).toBe(0);
    sql(`delete from public.crm_pipeline_groups where name in ('Do gestor', 'Invasão');`);
  });
});

describe("crm_pipeline_groups — o que o banco recusa", () => {
  it("nome repetido na mesma organização, com outra caixa, é recusado", () => {
    expect(() =>
      sql(`insert into public.crm_pipeline_groups (organization_id, name) values ('${GOV_ORG}', 'inss DE OBRAS');`),
    ).toThrow(/uq_crm_pipeline_groups_org_nome/);
  });

  it("nome em branco é recusado", () => {
    expect(() =>
      sql(`insert into public.crm_pipeline_groups (organization_id, name) values ('${GOV_ORG}', '   ');`),
    ).toThrow(/crm_pipeline_groups_nome_valido/);
  });

  it("funil não se liga a grupo de outra organização (FK composta)", () => {
    expect(() =>
      sql(`update public.crm_pipelines set group_id = '${GRUPO_B}' where id = '${GOV_PIPELINE}';`),
    ).toThrow(/crm_pipelines_group_fk/);
  });

  it("excluir o grupo solta os funis e não apaga nenhum", () => {
    const out = sql(`
      insert into public.crm_pipelines (id, organization_id, name, slug)
        values ('${FUNIL_SOLTO}', '${GOV_ORG}', 'Funil solto', 'escale-funil-solto')
        on conflict do nothing;
      insert into public.crm_pipeline_groups (id, organization_id, name)
        values ('${GRUPO_TEMPORARIO}', '${GOV_ORG}', 'Grupo temporário')
        on conflict do nothing;
      update public.crm_pipelines set group_id = '${GRUPO_TEMPORARIO}' where id = '${FUNIL_SOLTO}';
      delete from public.crm_pipeline_groups where id = '${GRUPO_TEMPORARIO}';
      select coalesce(group_id::text, 'nulo') from public.crm_pipelines where id = '${FUNIL_SOLTO}';
    `);
    expect(lastLine(out)).toBe("nulo");
  });
});
```

- [ ] **Step 2: Registrar a prova na varredura de RLS**

Em `tests/invariants/rls-completude-varredura.test.ts`, troque a linha:

```ts
const PROVA_PROPRIA: readonly Excecao[] = [
```

por:

```ts
const PROVA_PROPRIA: readonly Excecao[] = [
  {
    tabela: "crm_pipeline_groups",
    razao:
      "tests/invariants/escale-grupos-de-funis-rls.test.ts — fork Escale (migration 9001): dois tenants reais por JWT " +
      "(leitura positiva local e ZERO do vizinho nos dois sentidos), viewer e agent não escrevem, manager escreve só na " +
      "própria organização, e a FK composta recusa ligar funil a grupo de outra organização.",
  },
```

- [ ] **Step 3: Conferir o Docker**

```bash
docker info --format '{{.ServerVersion}}'
```
Expected: um número de versão. Se der erro, PARE e peça ao usuário para abrir o Docker Desktop.

- [ ] **Step 4: Rodar a prova, a varredura e as travas do suporte no Postgres**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm test:db tests/invariants/escale-grupos-de-funis-rls.test.ts tests/invariants/rls-completude-varredura.test.ts tests/invariants/travas-de-suporte-cobrem-toda-tabela-na-instalacao.test.ts 2>&1 | tail -25
```
Expected: os 3 arquivos PASS (o script aplica o baseline em modo install com `ON_ERROR_STOP=1` e depois em modo update — é a prova de que o bloco 9001 sobe do zero e é reaplicável). Se o install falhar, a mensagem do psql aponta a linha: corrija a MIGRATION, refaça o bloco do baseline (`git checkout -- supabase/baseline.sql` e o Step 5 da Task 1 de novo) e rode outra vez.

- [ ] **Step 5: Commit**

```bash
git add tests/invariants/escale-grupos-de-funis-rls.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "test(escale): prova de isolamento dos grupos de funis no Postgres

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Regras puras das origens e textos em espanhol

**Files:**
- Create: `lib/escale/origens/regras.ts`, `tests/unit/escale-origens-regras.test.ts`
- Modify: `lib/i18n/dicionario.ts` (bloco logo depois do bloco da Fase 0)

**Interfaces:**
- Consumes: `normalizar(texto: string): string` de `@/lib/catalogo/busca`; `PALETA_DE_ETIQUETAS: readonly string[]` de `@/lib/tags/cor-da-etiqueta`.
- Produces (usados pelas Tasks 4, 5 e 6):
  - `interface GrupoDeFunis { id: string; name: string }`
  - `interface FunilDaOrigem { id: string; name: string; group_id: string | null }`
  - `interface Origens { grupos: GrupoDeFunis[]; funis: FunilDaOrigem[] }`
  - `interface GrupoNaArvore extends GrupoDeFunis { funis: FunilDaOrigem[] }`
  - `interface ArvoreDeOrigens { grupos: GrupoNaArvore[]; semGrupo: FunilDaOrigem[] }`
  - `const NOME_DE_GRUPO_MAX = 60`
  - `type VereditoDeNome = { ok: true; nome: string } | { ok: false; erro: string }`
  - `validarNomeDeGrupo(bruto: string, grupos: readonly GrupoDeFunis[], ignorarId: string | null): VereditoDeNome`
  - `montarOrigens(origens: Origens): ArvoreDeOrigens`
  - `filtrarArvore(arvore: ArvoreDeOrigens, busca: string): ArvoreDeOrigens`
  - `funilDoCaminho(pathname: string): string | null`
  - `iniciais(nome: string): string`
  - `corDoGrupo(id: string): string`

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-origens-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { DICIONARIO } from "@/lib/i18n/dicionario";
import { PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";
import {
  NOME_DE_GRUPO_MAX,
  corDoGrupo,
  filtrarArvore,
  funilDoCaminho,
  iniciais,
  montarOrigens,
  validarNomeDeGrupo,
  type Origens,
} from "@/lib/escale/origens/regras";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras" },
    { id: "g-cred", name: "Credenciados" },
    { id: "g-vazio", name: "Parcerias" },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras" },
    { id: "f-nayara", name: "Funil Nayara", group_id: "g-cred" },
    { id: "f-turma", name: "Turma 12", group_id: "g-cred" },
    { id: "f-solto", name: "Pós-venda", group_id: null },
    { id: "f-orfao", name: "Funil órfão", group_id: "g-apagado" },
  ],
};

describe("validarNomeDeGrupo", () => {
  it("apara as pontas e junta os espaços do meio", () => {
    expect(validarNomeDeGrupo("  Parcerias   novas ", [], null)).toEqual({ ok: true, nome: "Parcerias novas" });
  });

  it("recusa nome vazio e nome acima do limite", () => {
    expect(validarNomeDeGrupo("   ", [], null)).toEqual({ ok: false, erro: "Dê um nome ao grupo." });
    expect(validarNomeDeGrupo("x".repeat(NOME_DE_GRUPO_MAX + 1), [], null)).toEqual({
      ok: false,
      erro: "O nome do grupo pode ter até 60 caracteres.",
    });
    expect(validarNomeDeGrupo("x".repeat(NOME_DE_GRUPO_MAX), [], null).ok).toBe(true);
  });

  it("recusa nome repetido sem olhar caixa nem acento — menos o do próprio grupo", () => {
    expect(validarNomeDeGrupo("inss DE óbras", ORIGENS.grupos, null)).toEqual({
      ok: false,
      erro: "Já existe um grupo com esse nome.",
    });
    expect(validarNomeDeGrupo("INSS de Obras", ORIGENS.grupos, "g-obras")).toEqual({
      ok: true,
      nome: "INSS de Obras",
    });
  });

  it("toda mensagem de recusa tem espanhol no dicionário", () => {
    const erros = ["Dê um nome ao grupo.", "O nome do grupo pode ter até 60 caracteres.", "Já existe um grupo com esse nome."];
    expect(erros.filter((e) => !DICIONARIO[e]?.es)).toEqual([]);
  });
});

describe("montarOrigens", () => {
  it("ordena os grupos pelo nome, põe cada funil no seu grupo e mantém grupo vazio", () => {
    const arvore = montarOrigens(ORIGENS);
    expect(arvore.grupos.map((g) => g.name)).toEqual(["Credenciados", "INSS de obras", "Parcerias"]);
    expect(arvore.grupos[0]!.funis.map((f) => f.id)).toEqual(["f-nayara", "f-turma"]);
    expect(arvore.grupos[2]!.funis).toEqual([]);
  });

  it("funil sem grupo — ou com grupo que não existe mais — vai para Sem grupo", () => {
    expect(montarOrigens(ORIGENS).semGrupo.map((f) => f.id)).toEqual(["f-solto", "f-orfao"]);
  });
});

describe("filtrarArvore", () => {
  const arvore = montarOrigens(ORIGENS);

  it("busca vazia devolve a árvore como está", () => {
    expect(filtrarArvore(arvore, "   ")).toBe(arvore);
  });

  it("achar pelo nome do grupo mostra o grupo inteiro", () => {
    const r = filtrarArvore(arvore, "obras");
    expect(r.grupos.map((g) => g.name)).toEqual(["INSS de obras"]);
    expect(r.grupos[0]!.funis.map((f) => f.id)).toEqual(["f-leads"]);
    expect(r.semGrupo).toEqual([]);
  });

  it("achar pelo nome do funil mostra só esse funil dentro do grupo dele", () => {
    const r = filtrarArvore(arvore, "nayara");
    expect(r.grupos.map((g) => g.name)).toEqual(["Credenciados"]);
    expect(r.grupos[0]!.funis.map((f) => f.id)).toEqual(["f-nayara"]);
  });

  it("ignora acento e pontuação, e também procura em Sem grupo", () => {
    const r = filtrarArvore(arvore, "pos venda");
    expect(r.grupos).toEqual([]);
    expect(r.semGrupo.map((f) => f.id)).toEqual(["f-solto"]);
  });
});

describe("funilDoCaminho", () => {
  it("lê o funil do endereço do quadro, com ou sem query", () => {
    expect(funilDoCaminho("/app/pipelines/abc")).toBe("abc");
    expect(funilDoCaminho("/app/pipelines/abc?lead=1")).toBe("abc");
    expect(funilDoCaminho("/app/kanban")).toBeNull();
  });
});

describe("iniciais e cor do grupo", () => {
  it("iniciais pulam palavras curtas como 'de'", () => {
    expect(iniciais("INSS de obras")).toBe("IO");
    expect(iniciais("Funil da Nayara")).toBe("FN");
    expect(iniciais("Credenciados")).toBe("CR");
    expect(iniciais("  ")).toBe("?");
  });

  it("a cor sai da paleta medida das etiquetas, é sempre a mesma para o mesmo grupo e varia entre grupos", () => {
    const ids = ["g-1", "g-2", "g-3", "g-4", "g-5", "g-6", "g-7", "g-8"];
    for (const id of ids) {
      expect(PALETA_DE_ETIQUETAS).toContain(corDoGrupo(id));
      expect(corDoGrupo(id)).toBe(corDoGrupo(id));
    }
    expect(new Set(ids.map(corDoGrupo)).size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-origens-regras.test.ts
```
Expected: FAIL — `Failed to resolve import "@/lib/escale/origens/regras"`.

- [ ] **Step 3: Implementar as regras**

Create `lib/escale/origens/regras.ts`:

```ts
/**
 * ORIGENS (fork Escale, Fase 1A): os funis da organização arrumados em GRUPOS,
 * como o painel "Origens" da V1 da Clint. Regras puras — o painel, a janela de
 * organizar e as rotas usam as mesmas, para nunca dizerem coisas diferentes.
 */
import { normalizar } from "@/lib/catalogo/busca";
import { PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";

export interface GrupoDeFunis {
  id: string;
  name: string;
}

export interface FunilDaOrigem {
  id: string;
  name: string;
  group_id: string | null;
}

/** O que o servidor lê e o que toda rota de escrita devolve, relido do banco. */
export interface Origens {
  grupos: GrupoDeFunis[];
  funis: FunilDaOrigem[];
}

export interface GrupoNaArvore extends GrupoDeFunis {
  funis: FunilDaOrigem[];
}

export interface ArvoreDeOrigens {
  grupos: GrupoNaArvore[];
  semGrupo: FunilDaOrigem[];
}

/** O mesmo teto do CHECK `crm_pipeline_groups_nome_valido` (migration 9001). */
export const NOME_DE_GRUPO_MAX = 60;

/** `erro` é chave do dicionário: a rota responde `t(erro)`. */
export type VereditoDeNome = { ok: true; nome: string } | { ok: false; erro: string };

const chave = (nome: string) => normalizar(nome).trim();

export function validarNomeDeGrupo(
  bruto: string,
  grupos: readonly GrupoDeFunis[],
  ignorarId: string | null,
): VereditoDeNome {
  const nome = bruto.trim().replace(/\s+/g, " ");
  if (!nome) return { ok: false, erro: "Dê um nome ao grupo." };
  if (nome.length > NOME_DE_GRUPO_MAX) {
    return { ok: false, erro: "O nome do grupo pode ter até 60 caracteres." };
  }
  // Mais estrito que o índice do banco (que só ignora caixa): "Obras" e "Óbras"
  // seriam dois grupos indistinguíveis no painel.
  const procurado = chave(nome);
  if (grupos.some((g) => g.id !== ignorarId && chave(g.name) === procurado)) {
    return { ok: false, erro: "Já existe um grupo com esse nome." };
  }
  return { ok: true, nome };
}

/**
 * Grupos em ordem de nome, cada um com os seus funis na ordem que veio (a
 * `position` da lista de funis). Funil sem grupo — ou apontando para um grupo
 * que não está na leitura — vai para "Sem grupo": nenhum funil some do painel.
 */
export function montarOrigens({ grupos, funis }: Origens): ArvoreDeOrigens {
  const ordenados = [...grupos].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  const existentes = new Set(ordenados.map((g) => g.id));
  return {
    grupos: ordenados.map((g) => ({ ...g, funis: funis.filter((f) => f.group_id === g.id) })),
    semGrupo: funis.filter((f) => f.group_id === null || !existentes.has(f.group_id)),
  };
}

/**
 * Busca da lupa: o grupo cujo nome casa aparece inteiro; senão, aparece só com
 * os funis que casam. Sem acento, sem caixa, sem pontuação (o `normalizar` da
 * busca do catálogo).
 */
export function filtrarArvore(arvore: ArvoreDeOrigens, busca: string): ArvoreDeOrigens {
  const termo = chave(busca);
  if (!termo) return arvore;
  const casa = (nome: string) => chave(nome).includes(termo);
  const grupos = arvore.grupos.flatMap((g) => {
    if (casa(g.name)) return [g];
    const funis = g.funis.filter((f) => casa(f.name));
    return funis.length > 0 ? [{ ...g, funis }] : [];
  });
  return { grupos, semGrupo: arvore.semGrupo.filter((f) => casa(f.name)) };
}

/** O funil aberto no quadro (`/app/pipelines/<id>`), ou `null` fora dele. */
export function funilDoCaminho(pathname: string): string | null {
  return /^\/app\/pipelines\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
}

/** Duas letras para o ícone do grupo; palavras de até 2 letras ("de", "da") não contam. */
export function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  const fortes = palavras.filter((p) => p.length > 2);
  const base = fortes.length > 0 ? fortes : palavras;
  if (base.length === 0) return "?";
  if (base.length === 1) return base[0]!.slice(0, 2).toUpperCase();
  return (base[0]![0]! + base[1]![0]!).toUpperCase();
}

/**
 * A cor do ícone do grupo: um tom da paleta das etiquetas — a paleta MEDIDA
 * para separação em dicromacia (`tests/unit/tags-cor-de-etiqueta.test.ts`) —,
 * escolhido pelo id, para o mesmo grupo ter sempre a mesma cor sem coluna nova.
 * Quem pinta usa `estiloDoChip`, que escolhe a frente legível.
 */
export function corDoGrupo(id: string): string {
  let soma = 0;
  for (const letra of id) soma = (soma + letra.charCodeAt(0)) % 9973;
  return PALETA_DE_ETIQUETAS[soma % PALETA_DE_ETIQUETAS.length]!;
}
```

- [ ] **Step 4: Acrescentar os textos ao dicionário**

Confira que nenhuma destas chaves já existe (chave repetida quebra o typecheck; chaves de uma palavra podem estar sem aspas):

```bash
while IFS= read -r k; do
  n=$(grep -cE "^\s*(\"$k\"|$k)\s*:" lib/i18n/dicionario.ts 2>/dev/null)
  printf '%s\t%s\n' "$n" "$k"
done <<'EOF'
Origens
Buscar grupo ou funil
Organizar origens
Funis por grupo
Sem grupo
Nenhum funil neste grupo.
Nada encontrado.
Nome do novo grupo
Criar grupo
Nome do grupo
Grupo do funil
Nenhum grupo ainda. Crie o primeiro acima.
Dê um nome ao grupo.
O nome do grupo pode ter até 60 caracteres.
Já existe um grupo com esse nome.
Grupo não encontrado.
Escolha um grupo válido para o funil.
EOF
grep -cF 'Agrupe os funis para achar cada um mais rápido.' lib/i18n/dicionario.ts
grep -cF 'Ao excluir, os funis do grupo vão para' lib/i18n/dicionario.ts
```
Expected: `0` em todas as linhas. Se alguma der `1`, não acrescente essa chave abaixo. (Já existem e serão REUSADAS: `Grupos`, `Funis`, `Renomear`, `Salvar`, `Cancelar`, `Excluir`, `Confirmar exclusão`, `Corpo não é JSON válido.`, `Funil não encontrado.`, `Não consegui completar essa ação. Tente de novo.`)

Em `lib/i18n/dicionario.ts`, troque a linha:

```ts
  "Não consegui carregar as conversas.": { es: "No pude cargar las conversaciones." },
```

por:

```ts
  "Não consegui carregar as conversas.": { es: "No pude cargar las conversaciones." },
  // ─── FORK ESCALE · origens (grupos de funis, Fase 1A) ───
  "Origens": { es: "Orígenes" },
  "Buscar grupo ou funil": { es: "Buscar grupo o embudo" },
  "Organizar origens": { es: "Organizar orígenes" },
  "Funis por grupo": { es: "Embudos por grupo" },
  "Sem grupo": { es: "Sin grupo" },
  "Nenhum funil neste grupo.": { es: "Ningún embudo en este grupo." },
  "Nada encontrado.": { es: "No se encontró nada." },
  "Agrupe os funis para achar cada um mais rápido. Funil sem grupo aparece em «Sem grupo».": {
    es: "Agrupe los embudos para encontrar cada uno más rápido. El embudo sin grupo aparece en «Sin grupo».",
  },
  "Nome do novo grupo": { es: "Nombre del nuevo grupo" },
  "Criar grupo": { es: "Crear grupo" },
  "Nome do grupo": { es: "Nombre del grupo" },
  "Ao excluir, os funis do grupo vão para «Sem grupo». Nenhum negócio é apagado.": {
    es: "Al eliminar, los embudos del grupo pasan a «Sin grupo». No se borra ningún negocio.",
  },
  "Grupo do funil": { es: "Grupo del embudo" },
  "Nenhum grupo ainda. Crie o primeiro acima.": { es: "Aún no hay grupos. Cree el primero arriba." },
  "Dê um nome ao grupo.": { es: "Póngale un nombre al grupo." },
  "O nome do grupo pode ter até 60 caracteres.": { es: "El nombre del grupo puede tener hasta 60 caracteres." },
  "Já existe um grupo com esse nome.": { es: "Ya existe un grupo con ese nombre." },
  "Grupo não encontrado.": { es: "Grupo no encontrado." },
  "Escolha um grupo válido para o funil.": { es: "Elija un grupo válido para el embudo." },
```

- [ ] **Step 5: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-origens-regras.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```
Expected: PASS nos dois arquivos.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/origens/regras.ts lib/i18n/dicionario.ts tests/unit/escale-origens-regras.test.ts
git commit -m "feat(escale): regras das origens (grupos de funis) e textos em espanhol

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Leitura e as quatro rotas de escrita

**Files:**
- Create: `lib/escale/origens/ler-origens.ts`, `lib/escale/origens/respostas.ts`, `app/api/v1/pipeline-groups/route.ts`, `app/api/v1/pipeline-groups/[id]/route.ts`, `app/api/v1/pipelines/[id]/grupo/route.ts`, `tests/unit/escale-grupos-de-funis-rotas.test.ts`
- Modify: `lib/audit/actions.ts` (bloco logo depois de `"pipeline.unarchived",`)

**Interfaces:**
- Consumes: `Origens`, `validarNomeDeGrupo` (Task 3); `requireRole(min, { requestId, resource })` de `@/lib/auth/require-role`; `requireSupportWrite()` de `@/lib/impersonate/support`; `createClient()` de `@/lib/supabase/server`; `ok`, `fail` de `@/lib/api/wrappers`; `audit()` de `@/lib/audit`; `traduzir(texto, idioma)` de `@/lib/i18n/dicionario`. Nos testes: `makeDb`, `authOk`, `ORG_ID`, `OUTRA_ORG`, `type DbOpts`, `type PipelineRow` de `@/tests/helpers/stages-db-double`.
- Produces (usados pelas Tasks 5 e 6):
  - `lerOrigens(supabase, orgId: string): Promise<Origens>` — lança no erro do banco.
  - `POST /api/v1/pipeline-groups` corpo `{ name }` → `201 { data: Origens }`
  - `PATCH /api/v1/pipeline-groups/:id` corpo `{ name }` → `200 { data: Origens }`
  - `DELETE /api/v1/pipeline-groups/:id` → `200 { data: Origens }`
  - `PUT /api/v1/pipelines/:id/grupo` corpo `{ group_id: string | null }` → `200 { data: Origens }`
  - Erros: 400 JSON inválido, 422 nome/corpo inválido, 404 grupo/funil fora da organização, 409 nome repetido no banco.

- [ ] **Step 1: Escrever o teste das rotas (vai falhar)**

Create `tests/unit/escale-grupos-de-funis-rotas.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import type { Origens } from "@/lib/escale/origens/regras";
import { POST } from "@/app/api/v1/pipeline-groups/route";
import { DELETE, PATCH } from "@/app/api/v1/pipeline-groups/[id]/route";
import { PUT } from "@/app/api/v1/pipelines/[id]/grupo/route";
import {
  ORG_ID,
  OUTRA_ORG,
  authOk,
  makeDb,
  type DbOpts,
  type PipelineRow,
} from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const G_OBRAS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const G_CRED = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const G_VIZINHO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const F_LEADS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const F_NAYARA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

/** Dois grupos da organização, um do vizinho, e dois funis vivos (um em grupo, um solto). */
function banco(writeError?: DbOpts["writeError"]) {
  const db = makeDb({
    pipelines: [
      { id: F_LEADS, name: "Leads INSS WhatsApp", organization_id: ORG_ID, is_archived: false, position: 1000, group_id: G_OBRAS },
      { id: F_NAYARA, name: "Funil Nayara", organization_id: ORG_ID, is_archived: false, position: 2000, group_id: null },
    ] as unknown as PipelineRow[],
    writeError,
  });
  (db.tabelas as unknown as Record<string, unknown[]>).crm_pipeline_groups = [
    { id: G_OBRAS, organization_id: ORG_ID, name: "INSS de obras" },
    { id: G_CRED, organization_id: ORG_ID, name: "Credenciados" },
    { id: G_VIZINHO, organization_id: OUTRA_ORG, name: "Grupo do vizinho" },
  ];
  return db;
}

function pedido(caminho: string, method: string, body?: unknown): NextRequest {
  if (body === undefined) return new NextRequest(`http://localhost${caminho}`, { method });
  return new NextRequest(`http://localhost${caminho}`, {
    method,
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const criar = (body: unknown) => POST(pedido("/api/v1/pipeline-groups", "POST", body));
const renomear = (id: string, body: unknown) => PATCH(pedido(`/api/v1/pipeline-groups/${id}`, "PATCH", body), ctx(id));
const excluir = (id: string) => DELETE(pedido(`/api/v1/pipeline-groups/${id}`, "DELETE"), ctx(id));
const mover = (id: string, body: unknown) => PUT(pedido(`/api/v1/pipelines/${id}/grupo`, "PUT", body), ctx(id));
const origensDe = async (res: Response) => ((await res.json()) as { data: Origens }).data;

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  authOk();
});

describe("POST /api/v1/pipeline-groups", () => {
  it("cria o grupo na organização da sessão e devolve as origens relidas, sem as do vizinho", async () => {
    const db = banco();
    const res = await criar({ name: "  Parcerias  " });
    expect(res.status).toBe(201);
    const escrita = db.escritas.find((e) => e.table === "crm_pipeline_groups");
    expect(escrita).toMatchObject({ tipo: "insert", patch: { organization_id: ORG_ID, name: "Parcerias" } });
    const origens = await origensDe(res);
    expect(origens.grupos.map((g) => g.name)).toContain("Parcerias");
    expect(origens.grupos.map((g) => g.id)).not.toContain(G_VIZINHO);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline_group.created", organizationId: ORG_ID }),
    );
  });

  it("nome repetido (sem olhar caixa nem acento) é 422 e nada é gravado", async () => {
    const db = banco();
    const res = await criar({ name: "inss DE óbras" });
    expect(res.status).toBe(422);
    expect(db.escritas).toEqual([]);
  });

  it("nome em branco é 422; corpo que não é JSON é 400", async () => {
    banco();
    expect((await criar({ name: "   " })).status).toBe(422);
    expect((await criar("{quebrado")).status).toBe(400);
  });

  it("o índice único do banco vencendo a corrida vira 409", async () => {
    banco((_n, tabela) => (tabela === "crm_pipeline_groups" ? { code: "23505", message: "duplicate key" } : null));
    expect((await criar({ name: "Parcerias" })).status).toBe(409);
  });

  it("quem não é gerente para no requireRole, antes de abrir o banco", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await criar({ name: "Parcerias" })).status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("o suporte em modo somente leitura para antes de tudo", async () => {
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(new Response(null, { status: 423 }) as never);
    expect((await criar({ name: "Parcerias" })).status).toBe(423);
    expect(requireRole).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/v1/pipeline-groups/:id", () => {
  it("renomeia filtrando por id e organização", async () => {
    const db = banco();
    const res = await renomear(G_OBRAS, { name: "INSS Obras 2026" });
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipeline_groups");
    expect(escrita?.tipo).toBe("update");
    expect(escrita?.patch).toEqual({ name: "INSS Obras 2026" });
    expect(escrita?.filtros).toEqual(expect.arrayContaining([["id", G_OBRAS], ["organization_id", ORG_ID]]));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_group.renamed" }));
  });

  it("mudar só a caixa do próprio nome é permitido", async () => {
    banco();
    expect((await renomear(G_OBRAS, { name: "INSS de Obras" })).status).toBe(200);
  });

  it("grupo de outra organização é 404, como se não existisse, e nada é gravado", async () => {
    const db = banco();
    expect((await renomear(G_VIZINHO, { name: "Meu agora" })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});

describe("DELETE /api/v1/pipeline-groups/:id", () => {
  it("exclui filtrando por id e organização e audita quantos funis ficaram sem grupo", async () => {
    const db = banco();
    const res = await excluir(G_OBRAS);
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipeline_groups");
    expect(escrita?.tipo).toBe("delete");
    expect(escrita?.filtros).toEqual(expect.arrayContaining([["id", G_OBRAS], ["organization_id", ORG_ID]]));
    expect(db.escritas.filter((e) => e.table === "crm_pipelines")).toEqual([]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline_group.deleted", metadata: { name: "INSS de obras", funis: 1 } }),
    );
    expect((await origensDe(res)).grupos.map((g) => g.id)).not.toContain(G_OBRAS);
  });

  it("grupo de outra organização é 404 e nada é apagado", async () => {
    const db = banco();
    expect((await excluir(G_VIZINHO)).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});

describe("PUT /api/v1/pipelines/:id/grupo", () => {
  it("põe o funil no grupo, filtrando por funil e organização", async () => {
    const db = banco();
    const res = await mover(F_NAYARA, { group_id: G_CRED });
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines");
    expect(escrita?.patch).toEqual({ group_id: G_CRED });
    expect(escrita?.filtros).toEqual(expect.arrayContaining([["id", F_NAYARA], ["organization_id", ORG_ID]]));
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline.group_changed", metadata: { de: null, para: G_CRED } }),
    );
  });

  it("group_id null tira o funil do grupo", async () => {
    const db = banco();
    expect((await mover(F_LEADS, { group_id: null })).status).toBe(200);
    expect(db.escritas.find((e) => e.table === "crm_pipelines")?.patch).toEqual({ group_id: null });
  });

  it("grupo do vizinho é 404 e o funil não muda", async () => {
    const db = banco();
    expect((await mover(F_NAYARA, { group_id: G_VIZINHO })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });

  it("funil que não está na organização é 404", async () => {
    banco();
    expect((await mover("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9", { group_id: G_CRED })).status).toBe(404);
  });

  it("pedir o grupo em que o funil já está não grava nem audita", async () => {
    const db = banco();
    expect((await mover(F_LEADS, { group_id: G_OBRAS })).status).toBe(200);
    expect(db.escritas).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });

  it("group_id que não é uuid é 422", async () => {
    banco();
    expect((await mover(F_LEADS, { group_id: "obras" })).status).toBe(422);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-grupos-de-funis-rotas.test.ts
```
Expected: FAIL — `Failed to resolve import "@/app/api/v1/pipeline-groups/route"`.

- [ ] **Step 3: A leitura**

Create `lib/escale/origens/ler-origens.ts`:

```ts
/**
 * Lê os GRUPOS e os funis VIVOS da organização (fork Escale, Fase 1A).
 *
 * O filtro de `organization_id` não é redundante com a RLS — é o mesmo cuidado
 * de `app/app/kanban/page.tsx`: a policy libera TODAS as organizações do usuário,
 * e quem participa de duas veria as duas misturadas. A RLS responde "pode ver?";
 * aqui a pergunta é "quer ver agora?".
 *
 * LANÇA no erro do banco — quem chama decide: a rota responde 500; o painel some
 * e o quadro abre sem ele (`ComOrigens`).
 */
import type { createClient } from "@/lib/supabase/server";

import type { FunilDaOrigem, GrupoDeFunis, Origens } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function lerOrigens(supabase: Supabase, orgId: string): Promise<Origens> {
  const [grupos, funis] = await Promise.all([
    supabase.from("crm_pipeline_groups").select("id, name").eq("organization_id", orgId).order("name"),
    supabase
      .from("crm_pipelines")
      .select("id, name, group_id")
      .eq("organization_id", orgId)
      .eq("is_archived", false)
      .order("position"),
  ]);
  if (grupos.error) throw new Error(grupos.error.message);
  if (funis.error) throw new Error(funis.error.message);
  return {
    grupos: ((grupos.data ?? []) as GrupoDeFunis[]).map((g) => ({ id: g.id, name: g.name })),
    funis: ((funis.data ?? []) as FunilDaOrigem[]).map((f) => ({
      id: f.id,
      name: f.name,
      group_id: f.group_id ?? null,
    })),
  };
}
```

- [ ] **Step 4: O que as rotas compartilham**

Create `lib/escale/origens/respostas.ts`:

```ts
/**
 * O que as rotas de origens compartilham (fork Escale, Fase 1A): ler o corpo,
 * reler as origens e traduzir o conflito de nome do banco.
 *
 * `requireSupportWrite()` e `requireRole()` NÃO moram aqui de propósito: o gate
 * `tests/unit/suporte-cobertura-de-efeitos.test.ts` lê cada handler e exige a
 * guarda de suporte escrita nele.
 */
import { fail, ok } from "@/lib/api/wrappers";
import type { createClient } from "@/lib/supabase/server";

import { lerOrigens } from "./ler-origens";
import type { Origens } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function lerJson(req: Request): Promise<{ ok: true; json: unknown } | { ok: false }> {
  try {
    return { ok: true, json: await req.json() };
  } catch {
    return { ok: false };
  }
}

export async function origensOuFalha(
  supabase: Supabase,
  orgId: string,
  requestId: string,
): Promise<{ ok: true; origens: Origens } | { ok: false; resposta: Response }> {
  try {
    return { ok: true, origens: await lerOrigens(supabase, orgId) };
  } catch (err) {
    return { ok: false, resposta: fail("internal_error", (err as Error).message, 500, { requestId }) };
  }
}

/**
 * Responde com as origens RELIDAS do banco: a tela aplica o corpo em vez de
 * esperar o `router.refresh()` (ver `hooks/escale/useOrigens.ts`).
 */
export async function responderComOrigens(
  supabase: Supabase,
  orgId: string,
  requestId: string,
  status = 200,
): Promise<Response> {
  const lido = await origensOuFalha(supabase, orgId, requestId);
  return lido.ok ? ok(lido.origens, { status, requestId }) : lido.resposta;
}

/** `uq_crm_pipeline_groups_org_nome` venceu a corrida (outra aba criou o mesmo nome). */
export function nomeRepetido(
  erro: { code?: string } | null | undefined,
  t: (texto: string) => string,
  requestId: string,
): Response | null {
  if (erro?.code !== "23505") return null;
  return fail("state_conflict", t("Já existe um grupo com esse nome."), 409, { requestId });
}
```

- [ ] **Step 5: Os códigos de auditoria**

Em `lib/audit/actions.ts`, troque a linha:

```ts
  "pipeline.unarchived",
```

por:

```ts
  "pipeline.unarchived",
  // FORK ESCALE · grupos de funis (migration 9001, Fase 1A). No meio da lista, e
  // não no fim, onde o original acrescenta os dele: o fim conflita a cada
  // sincronização.
  "pipeline_group.created",
  "pipeline_group.renamed",
  "pipeline_group.deleted",
  "pipeline.group_changed",
```

- [ ] **Step 6: Criar grupo**

Create `app/api/v1/pipeline-groups/route.ts`:

```ts
/**
 * POST /api/v1/pipeline-groups — cria um GRUPO DE FUNIS (fork Escale, Fase 1A).
 *
 * Auth: sessão por cookie, papel manager+ (o mesmo de criar funil). A
 * `organization_id` sai da sessão, nunca do corpo. Responde com as origens
 * inteiras relidas do banco.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { validarNomeDeGrupo } from "@/lib/escale/origens/regras";
import { lerJson, nomeRepetido, origensOuFalha, responderComOrigens } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const corpoSchema = z.object({ name: z.string().max(200) }).strict();

export async function POST(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_groups" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Dê um nome ao grupo."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const supabase = await createClient();
  const antes = await origensOuFalha(supabase, orgId, requestId);
  if (!antes.ok) return antes.resposta;

  const veredito = validarNomeDeGrupo(parsed.data.name, antes.origens.grupos, null);
  if (!veredito.ok) return fail("unprocessable_entity", t(veredito.erro), 422, { requestId });

  const { data: criado, error } = await supabase
    .from("crm_pipeline_groups")
    .insert({ organization_id: orgId, name: veredito.nome })
    .select("id")
    .single();
  if (error) return nomeRepetido(error, t, requestId) ?? fail("internal_error", error.message, 500, { requestId });

  void audit({
    action: "pipeline_group.created",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_group",
    resourceId: (criado as { id: string }).id,
    requestId,
    metadata: { name: veredito.nome },
  });

  return responderComOrigens(supabase, orgId, requestId, 201);
}
```

- [ ] **Step 7: Renomear e excluir grupo**

Create `app/api/v1/pipeline-groups/[id]/route.ts`:

```ts
/**
 * PATCH/DELETE /api/v1/pipeline-groups/[id] — renomear e excluir um GRUPO DE
 * FUNIS (fork Escale, Fase 1A).
 *
 * Excluir NÃO apaga funil: a FK `crm_pipelines_group_fk` é `on delete set null
 * (group_id)` (migration 9001), então os funis do grupo voltam para "Sem grupo"
 * no mesmo comando. Grupo de outra organização morre no 404 antes de qualquer
 * escrita — a mesma resposta de um grupo inexistente (dizer "existe, mas não é
 * seu" já vaza a existência).
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { validarNomeDeGrupo } from "@/lib/escale/origens/regras";
import { lerJson, nomeRepetido, origensOuFalha, responderComOrigens } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const corpoSchema = z.object({ name: z.string().max(200) }).strict();

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_groups" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Dê um nome ao grupo."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const supabase = await createClient();
  const antes = await origensOuFalha(supabase, orgId, requestId);
  if (!antes.ok) return antes.resposta;

  const grupo = antes.origens.grupos.find((g) => g.id === id);
  if (!grupo) return fail("not_found", t("Grupo não encontrado."), 404, { requestId });

  const veredito = validarNomeDeGrupo(parsed.data.name, antes.origens.grupos, id);
  if (!veredito.ok) return fail("unprocessable_entity", t(veredito.erro), 422, { requestId });

  const { error } = await supabase
    .from("crm_pipeline_groups")
    .update({ name: veredito.nome })
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) return nomeRepetido(error, t, requestId) ?? fail("internal_error", error.message, 500, { requestId });

  void audit({
    action: "pipeline_group.renamed",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_group",
    resourceId: id,
    requestId,
    metadata: { de: grupo.name, para: veredito.nome },
  });

  return responderComOrigens(supabase, orgId, requestId);
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_groups" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const antes = await origensOuFalha(supabase, orgId, requestId);
  if (!antes.ok) return antes.resposta;

  const grupo = antes.origens.grupos.find((g) => g.id === id);
  if (!grupo) return fail("not_found", t("Grupo não encontrado."), 404, { requestId });

  const { error } = await supabase
    .from("crm_pipeline_groups")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) return fail("internal_error", error.message, 500, { requestId });

  void audit({
    action: "pipeline_group.deleted",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_group",
    resourceId: id,
    requestId,
    metadata: { name: grupo.name, funis: antes.origens.funis.filter((f) => f.group_id === id).length },
  });

  return responderComOrigens(supabase, orgId, requestId);
}
```

- [ ] **Step 8: Mover funil de grupo**

Create `app/api/v1/pipelines/[id]/grupo/route.ts`:

```ts
/**
 * PUT /api/v1/pipelines/[id]/grupo — põe o funil num GRUPO DE FUNIS, ou tira
 * (`group_id: null`). Fork Escale, Fase 1A.
 *
 * Arquivo NOVO de propósito, e não um campo a mais no PATCH do funil
 * (`../route.ts`): aquele schema é `.strict()` e é do original — mexer nele
 * conflita a cada sincronização. A guarda de organização é dupla: a rota só
 * aceita funil e grupo que estão na leitura da organização da sessão, e o banco
 * recusa a combinação cruzada pela FK composta `crm_pipelines_group_fk`.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerJson, origensOuFalha, responderComOrigens } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const corpoSchema = z.object({ group_id: z.string().uuid().nullable() }).strict();

export async function PUT(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id: funilId } = await ctx.params;

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Escolha um grupo válido para o funil."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const para = parsed.data.group_id;

  const supabase = await createClient();
  const antes = await origensOuFalha(supabase, orgId, requestId);
  if (!antes.ok) return antes.resposta;

  const funil = antes.origens.funis.find((f) => f.id === funilId);
  if (!funil) return fail("not_found", t("Funil não encontrado."), 404, { requestId });
  if (para !== null && !antes.origens.grupos.some((g) => g.id === para)) {
    return fail("not_found", t("Grupo não encontrado."), 404, { requestId });
  }
  // Nada a mudar: sem escrita e sem linha de auditoria que não aconteceu.
  if (funil.group_id === para) return ok(antes.origens, { requestId });

  const { error } = await supabase
    .from("crm_pipelines")
    .update({ group_id: para })
    .eq("id", funilId)
    .eq("organization_id", orgId);
  if (error) {
    // 23503 = a FK composta recusou: o grupo sumiu entre a leitura e a escrita.
    if (error.code === "23503") return fail("not_found", t("Grupo não encontrado."), 404, { requestId });
    return fail("internal_error", error.message, 500, { requestId });
  }

  void audit({
    action: "pipeline.group_changed",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline",
    resourceId: funilId,
    requestId,
    metadata: { de: funil.group_id, para },
  });

  return responderComOrigens(supabase, orgId, requestId);
}
```

- [ ] **Step 9: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-grupos-de-funis-rotas.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts
```
Expected: PASS nos dois arquivos (17 testes no das rotas).

- [ ] **Step 10: Commit**

```bash
git add lib/escale/origens/ler-origens.ts lib/escale/origens/respostas.ts lib/audit/actions.ts app/api/v1/pipeline-groups app/api/v1/pipelines/[id]/grupo tests/unit/escale-grupos-de-funis-rotas.test.ts
git commit -m "feat(escale): rotas para criar, renomear e excluir grupo e mover funil de grupo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: O painel Origens e a janela "Organizar origens"

**Files:**
- Create: `hooks/escale/useOrigens.ts`, `components/escale/origens/OrganizarOrigens.tsx`, `components/escale/origens/PainelOrigens.tsx`, `tests/unit/escale-organizar-origens.test.tsx`, `tests/unit/escale-painel-origens.test.tsx`

**Interfaces:**
- Consumes: as rotas da Task 4 (`{ data: Origens }`); `montarOrigens`, `filtrarArvore`, `funilDoCaminho`, `iniciais`, `corDoGrupo`, tipos `Origens`, `FunilDaOrigem` (Task 3); `apiClient.{post,patch,put,delete}` de `@/lib/api/client`; `ApiError` de `@/lib/api/types`; `estiloDoChip(cor)` de `@/lib/tags/cor-da-etiqueta`; `SearchableSelect` de `@/components/ui/searchable-select`; `Dialog*` de `@/components/ui/dialog`; `Input`, `Button`; ícones `CaretDown`, `CaretRight`, `Gear`, `MagnifyingGlass` de `@/lib/ui/icons`.
- Produces (usados pela Task 6):
  - `PainelOrigens({ origens: Origens; podeGerenciar: boolean })`
  - `OrganizarOrigens({ open: boolean; onOpenChange: (aberto: boolean) => void; origens: Origens; onOrigens: (origens: Origens) => void })`
  - `const SEM_GRUPO = "sem-grupo"`
  - hooks `useCriarGrupo`, `useRenomearGrupo`, `useExcluirGrupo`, `useMoverFunil`; tipo `RespostaDeOrigens = { data: Origens }`.

- [ ] **Step 1: Escrever o teste da janela (vai falhar)**

Create `tests/unit/escale-organizar-origens.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import type { Origens } from "@/lib/escale/origens/regras";
import { OrganizarOrigens } from "@/components/escale/origens/OrganizarOrigens";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras" },
    { id: "g-cred", name: "Credenciados" },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras" },
    { id: "f-solto", name: "Pós-venda", group_id: null },
  ],
};
const NOVAS: Origens = { grupos: [...ORIGENS.grupos, { id: "g-novo", name: "Parcerias" }], funis: ORIGENS.funis };

function abrir() {
  const onOrigens = vi.fn();
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <OrganizarOrigens open onOpenChange={() => {}} origens={ORIGENS} onOrigens={onOrigens} />
    </QueryClientProvider>,
  );
  return { onOrigens, user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  vi.mocked(apiClient.post).mockResolvedValue({ data: NOVAS });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: NOVAS });
  vi.mocked(apiClient.put).mockResolvedValue({ data: NOVAS });
  vi.mocked(apiClient.delete).mockResolvedValue({ data: NOVAS });
});

describe("<OrganizarOrigens>", () => {
  it("cria um grupo e aplica as origens da resposta", async () => {
    const { onOrigens, user } = abrir();
    await user.type(screen.getByRole("textbox", { name: "Nome do novo grupo" }), "Parcerias");
    await user.click(screen.getByRole("button", { name: "Criar grupo" }));
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipeline-groups", { name: "Parcerias" });
    await vi.waitFor(() => expect(onOrigens).toHaveBeenCalledWith(NOVAS));
  });

  it("renomeia um grupo", async () => {
    const { user } = abrir();
    await user.click(screen.getByRole("button", { name: "Renomear INSS de obras" }));
    const campo = screen.getByRole("textbox", { name: "Nome do grupo" });
    expect(campo).toHaveValue("INSS de obras");
    await user.clear(campo);
    await user.type(campo, "INSS Obras 2026");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-obras", { name: "INSS Obras 2026" });
  });

  it("excluir pede confirmação e avisa que nenhum funil é apagado", async () => {
    const { user } = abrir();
    await user.click(screen.getByRole("button", { name: "Excluir Credenciados" }));
    expect(screen.getByText(/Nenhum negócio é apagado/)).toBeInTheDocument();
    expect(apiClient.delete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-cred");
  });

  it("move o funil para outro grupo e para Sem grupo", async () => {
    const { user } = abrir();
    await user.click(screen.getByRole("combobox", { name: "Grupo do funil Leads INSS WhatsApp" }));
    await user.click(await screen.findByRole("option", { name: "Credenciados" }));
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-leads/grupo", { group_id: "g-cred" });
    // A caixa fica desabilitada enquanto a mutação corre; espera ela voltar.
    await vi.waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Grupo do funil Leads INSS WhatsApp" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("combobox", { name: "Grupo do funil Leads INSS WhatsApp" }));
    await user.click(await screen.findByRole("option", { name: "Sem grupo" }));
    expect(apiClient.put).toHaveBeenLastCalledWith("/api/v1/pipelines/f-leads/grupo", { group_id: null });
  });

  it("a recusa da rota aparece na janela", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(
      new ApiError(422, "unprocessable_entity", undefined, "r-1", "Já existe um grupo com esse nome."),
    );
    const { onOrigens, user } = abrir();
    await user.type(screen.getByRole("textbox", { name: "Nome do novo grupo" }), "Credenciados");
    await user.click(screen.getByRole("button", { name: "Criar grupo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe um grupo com esse nome.");
    expect(onOrigens).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Escrever o teste do painel (vai falhar)**

Create `tests/unit/escale-painel-origens.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/pipelines/f-leads",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/api/client", () => ({ apiClient: {} }));

import type { Origens } from "@/lib/escale/origens/regras";
import { PainelOrigens } from "@/components/escale/origens/PainelOrigens";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras" },
    { id: "g-cred", name: "Credenciados" },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras" },
    { id: "f-nayara", name: "Funil Nayara", group_id: "g-cred" },
    { id: "f-turma", name: "Turma 12", group_id: "g-cred" },
    { id: "f-solto", name: "Pós-venda", group_id: null },
  ],
};

function renderizar(podeGerenciar = true) {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <PainelOrigens origens={ORIGENS} podeGerenciar={podeGerenciar} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

const menu = () => screen.getByRole("navigation", { name: "Funis por grupo" });

describe("<PainelOrigens>", () => {
  it("lista os grupos por nome, com as iniciais, e abre o grupo do funil aberto", () => {
    renderizar();
    expect(within(menu()).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "CRCredenciados",
      "IOINSS de obras",
    ]);
    expect(within(menu()).getByRole("button", { name: "INSS de obras" })).toHaveAttribute("aria-expanded", "true");
    expect(within(menu()).getByRole("button", { name: "Credenciados" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Leads INSS WhatsApp" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Leads INSS WhatsApp" })).toHaveAttribute("href", "/app/pipelines/f-leads");
    expect(screen.queryByRole("link", { name: "Funil Nayara" })).toBeNull();
  });

  it("clicar no grupo abre e fecha os funis dele", async () => {
    const user = renderizar();
    await user.click(within(menu()).getByRole("button", { name: "Credenciados" }));
    expect(screen.getByRole("link", { name: "Funil Nayara" })).toBeInTheDocument();
    await user.click(within(menu()).getByRole("button", { name: "Credenciados" }));
    expect(screen.queryByRole("link", { name: "Funil Nayara" })).toBeNull();
  });

  it("funil sem grupo aparece em Sem grupo", () => {
    renderizar();
    expect(screen.getByText("Sem grupo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pós-venda" })).toBeInTheDocument();
  });

  it("a lupa filtra por grupo ou funil, sem acento, e diz quando não acha nada", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Buscar grupo ou funil" }));
    const busca = screen.getByRole("textbox", { name: "Buscar grupo ou funil" });
    await user.type(busca, "nayara");
    expect(screen.getByRole("link", { name: "Funil Nayara" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Turma 12" })).toBeNull();
    expect(within(menu()).queryByRole("button", { name: "INSS de obras" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Pós-venda" })).toBeNull();
    await user.clear(busca);
    await user.type(busca, "zzz");
    expect(screen.getByText("Nada encontrado.")).toBeInTheDocument();
  });

  it("gerente abre Organizar origens; quem não é gerente não vê o botão", async () => {
    const user = renderizar(true);
    await user.click(screen.getByRole("button", { name: "Organizar origens" }));
    expect(await screen.findByRole("dialog", { name: "Organizar origens" })).toBeInTheDocument();
  });

  it("sem permissão de gerente, nada de Organizar origens", () => {
    renderizar(false);
    expect(screen.queryByRole("button", { name: "Organizar origens" })).toBeNull();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-organizar-origens.test.tsx tests/unit/escale-painel-origens.test.tsx
```
Expected: FAIL — `Failed to resolve import "@/components/escale/origens/OrganizarOrigens"` (e `PainelOrigens`).

- [ ] **Step 4: As mutações**

Create `hooks/escale/useOrigens.ts`:

```ts
"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api/client";
import type { Origens } from "@/lib/escale/origens/regras";

/**
 * A ESCRITA DO PAINEL ORIGENS (fork Escale, Fase 1A).
 *
 * As quatro rotas releem grupos e funis do banco antes de responder, e a tela
 * APLICA O CORPO — o desenho de `hooks/pipelines/usePipelines.ts`, pelo motivo
 * medido lá: depender do `router.refresh()` para mostrar o efeito da própria
 * ação é corrida contra os prefetches. O refresh continua, para a PRÓXIMA
 * navegação encontrar o servidor em dia.
 */
export type RespostaDeOrigens = { data: Origens };

const GRUPOS = "/api/v1/pipeline-groups";
const doGrupo = (id: string) => `${GRUPOS}/${encodeURIComponent(id)}`;
const grupoDoFunil = (id: string) => `/api/v1/pipelines/${encodeURIComponent(id)}/grupo`;

function useReler() {
  const router = useRouter();
  return () => router.refresh();
}

export function useCriarGrupo() {
  const reler = useReler();
  return useMutation({
    mutationFn: (name: string) => apiClient.post<RespostaDeOrigens>(GRUPOS, { name }),
    onSettled: reler,
  });
}

export function useRenomearGrupo() {
  const reler = useReler();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiClient.patch<RespostaDeOrigens>(doGrupo(id), { name }),
    onSettled: reler,
  });
}

export function useExcluirGrupo() {
  const reler = useReler();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<RespostaDeOrigens>(doGrupo(id)),
    onSettled: reler,
  });
}

export function useMoverFunil() {
  const reler = useReler();
  return useMutation({
    mutationFn: ({ funilId, groupId }: { funilId: string; groupId: string | null }) =>
      apiClient.put<RespostaDeOrigens>(grupoDoFunil(funilId), { group_id: groupId }),
    onSettled: reler,
  });
}
```

- [ ] **Step 5: A janela "Organizar origens"**

Create `components/escale/origens/OrganizarOrigens.tsx`:

```tsx
"use client";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useCriarGrupo,
  useExcluirGrupo,
  useMoverFunil,
  useRenomearGrupo,
  type RespostaDeOrigens,
} from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import { NOME_DE_GRUPO_MAX, montarOrigens, type Origens } from "@/lib/escale/origens/regras";

/** O valor da opção "Sem grupo" na caixa de cada funil (vira `group_id: null`). */
export const SEM_GRUPO = "sem-grupo";

function textoDoErro(e: unknown, t: (texto: string) => string): string {
  if (e instanceof ApiError) return t(e.message);
  if (e instanceof Error && e.message) return e.message;
  return t("Não consegui completar essa ação. Tente de novo.");
}

/**
 * ORGANIZAR ORIGENS (fork Escale, Fase 1A): criar, renomear e excluir grupo, e
 * escolher o grupo de cada funil. Só gerente+ chega aqui (o painel esconde o
 * botão, e as rotas cobram `requireRole("manager")`).
 *
 * Toda resposta traz as origens relidas do banco, e `onOrigens` as entrega ao
 * painel — a janela e o painel mostram a mesma coisa sem esperar o refresh.
 */
export function OrganizarOrigens({
  open,
  onOpenChange,
  origens,
  onOrigens,
}: {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  origens: Origens;
  onOrigens: (origens: Origens) => void;
}) {
  const t = useT();
  const criar = useCriarGrupo();
  const renomear = useRenomearGrupo();
  const excluir = useExcluirGrupo();
  const mover = useMoverFunil();

  const [novo, setNovo] = useState("");
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const ocupado = criar.isPending || renomear.isPending || excluir.isPending || mover.isPending;
  const { grupos } = montarOrigens(origens);
  const opcoes = [{ value: SEM_GRUPO, label: t("Sem grupo") }, ...grupos.map((g) => ({ value: g.id, label: g.name }))];

  function aplicar(r: RespostaDeOrigens) {
    setErro(null);
    onOrigens(r.data);
  }
  const falhar = (e: unknown) => setErro(textoDoErro(e, t));

  function criarGrupo(e: FormEvent) {
    e.preventDefault();
    const nome = novo.trim();
    if (!nome) return;
    criar.mutate(nome, {
      onSuccess: (r) => {
        aplicar(r);
        setNovo("");
      },
      onError: falhar,
    });
  }

  function salvarNome(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    renomear.mutate(
      { id: editando.id, name: editando.nome },
      {
        onSuccess: (r) => {
          aplicar(r);
          setEditando(null);
        },
        onError: falhar,
      },
    );
  }

  function excluirGrupo(id: string) {
    excluir.mutate(id, {
      onSuccess: (r) => {
        aplicar(r);
        setExcluindo(null);
      },
      onError: falhar,
    });
  }

  function moverFunil(funilId: string, valor: string) {
    mover.mutate({ funilId, groupId: valor === SEM_GRUPO ? null : valor }, { onSuccess: aplicar, onError: falhar });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Organizar origens")}</DialogTitle>
          <DialogDescription>
            {t("Agrupe os funis para achar cada um mais rápido. Funil sem grupo aparece em «Sem grupo».")}
          </DialogDescription>
        </DialogHeader>

        {erro && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm">
            {erro}
          </p>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("Grupos")}</h3>
          <form onSubmit={criarGrupo} className="flex gap-2">
            <Input
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              placeholder={t("Nome do novo grupo")}
              aria-label={t("Nome do novo grupo")}
              maxLength={NOME_DE_GRUPO_MAX}
            />
            <Button type="submit" disabled={ocupado || !novo.trim()} className="shrink-0">
              {t("Criar grupo")}
            </Button>
          </form>
          {grupos.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Nenhum grupo ainda. Crie o primeiro acima.")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {grupos.map((g) => (
                <li key={g.id} className="flex items-center gap-2 px-3 py-2">
                  {editando?.id === g.id ? (
                    <form onSubmit={salvarNome} className="flex flex-1 gap-2">
                      <Input
                        autoFocus
                        value={editando.nome}
                        onChange={(e) => setEditando({ id: g.id, nome: e.target.value })}
                        aria-label={t("Nome do grupo")}
                        maxLength={NOME_DE_GRUPO_MAX}
                      />
                      <Button type="submit" size="sm" disabled={ocupado || !editando.nome.trim()}>
                        {t("Salvar")}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(null)}>
                        {t("Cancelar")}
                      </Button>
                    </form>
                  ) : excluindo === g.id ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <p className="min-w-0 flex-1 text-sm">
                        {t("Ao excluir, os funis do grupo vão para «Sem grupo». Nenhum negócio é apagado.")}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={ocupado}
                        onClick={() => excluirGrupo(g.id)}
                      >
                        {t("Confirmar exclusão")}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setExcluindo(null)}>
                        {t("Cancelar")}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm">{g.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`${t("Renomear")} ${g.name}`}
                        onClick={() => setEditando({ id: g.id, nome: g.name })}
                      >
                        {t("Renomear")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`${t("Excluir")} ${g.name}`}
                        onClick={() => setExcluindo(g.id)}
                      >
                        {t("Excluir")}
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("Funis")}</h3>
          <ul className="divide-y rounded-md border">
            {origens.funis.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                <SearchableSelect
                  className="w-56"
                  options={opcoes}
                  value={f.group_id ?? SEM_GRUPO}
                  onValueChange={(valor) => moverFunil(f.id, valor)}
                  aria-label={`${t("Grupo do funil")} ${f.name}`}
                  disabled={ocupado}
                />
              </li>
            ))}
          </ul>
        </section>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: O painel**

Create `components/escale/origens/PainelOrigens.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";
import {
  corDoGrupo,
  filtrarArvore,
  funilDoCaminho,
  iniciais,
  montarOrigens,
  type FunilDaOrigem,
  type Origens,
} from "@/lib/escale/origens/regras";
import { estiloDoChip } from "@/lib/tags/cor-da-etiqueta";
import { CaretDown, CaretRight, Gear, MagnifyingGlass } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { OrganizarOrigens } from "./OrganizarOrigens";

/**
 * O PAINEL ORIGENS (fork Escale, Fase 1A): a coluna da esquerda de Negócios na
 * casca nova, como na V1 da Clint — grupos que abrem os funis, busca pela lupa
 * e, para gerente, "Organizar origens". Só md+: no celular o quadro segue como
 * sempre (o seletor de funil do cabeçalho continua lá).
 *
 * As origens vêm do servidor (`ComOrigens`) e são trocadas pelo CORPO das
 * respostas de escrita; quando o servidor manda novidade (navegação, refresh),
 * o ajuste acontece durante o render — o padrão de `app/app/kanban/_client.tsx`.
 */
export function PainelOrigens({ origens: doServidor, podeGerenciar }: { origens: Origens; podeGerenciar: boolean }) {
  const t = useT();
  const ativo = funilDoCaminho(usePathname() ?? "");

  const [origens, setOrigens] = useState<Origens>(doServidor);
  const [ultimoDoServidor, setUltimoDoServidor] = useState<Origens>(doServidor);
  if (doServidor !== ultimoDoServidor) {
    setUltimoDoServidor(doServidor);
    setOrigens(doServidor);
  }

  // Começa aberto o grupo do funil que está no quadro, como na V1.
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => {
    const grupoDoAtivo = doServidor.funis.find((f) => f.id === ativo)?.group_id;
    return new Set(grupoDoAtivo ? [grupoDoAtivo] : []);
  });
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [organizando, setOrganizando] = useState(false);

  const arvore = useMemo(() => montarOrigens(origens), [origens]);
  const buscando = busca.trim().length > 0;
  const visivel = buscando ? filtrarArvore(arvore, busca) : arvore;
  const nadaAchado = buscando && visivel.grupos.length === 0 && visivel.semGrupo.length === 0;

  function alternar(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  return (
    <aside
      aria-label={t("Origens")}
      className="sticky top-0 hidden max-h-[calc(100dvh-6.5rem)] w-60 shrink-0 flex-col gap-2 overflow-y-auto rounded-lg border bg-card p-3 md:flex"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Origens")}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t("Buscar grupo ou funil")}
            aria-pressed={buscaAberta}
            onClick={() => {
              setBuscaAberta((v) => !v);
              setBusca("");
            }}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent-soft hover:text-foreground"
          >
            <MagnifyingGlass size={16} aria-hidden />
          </button>
          {podeGerenciar && (
            <button
              type="button"
              aria-label={t("Organizar origens")}
              onClick={() => setOrganizando(true)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent-soft hover:text-foreground"
            >
              <Gear size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {buscaAberta && (
        <Input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t("Buscar grupo ou funil")}
          aria-label={t("Buscar grupo ou funil")}
          className="h-8"
        />
      )}

      <nav aria-label={t("Funis por grupo")}>
        <ul className="space-y-0.5">
          {visivel.grupos.map((g) => {
            const aberto = buscando || abertos.has(g.id);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  aria-expanded={aberto}
                  onClick={() => alternar(g.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors hover:bg-accent-soft"
                >
                  <span
                    aria-hidden
                    className="flex size-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold"
                    style={estiloDoChip(corDoGrupo(g.id))}
                  >
                    {iniciais(g.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  {aberto ? <CaretDown size={14} aria-hidden /> : <CaretRight size={14} aria-hidden />}
                </button>
                {aberto &&
                  (g.funis.length > 0 ? (
                    <ListaDeFunis funis={g.funis} ativo={ativo} recuo />
                  ) : (
                    <p className="py-1 pl-10 text-xs text-muted-foreground">{t("Nenhum funil neste grupo.")}</p>
                  ))}
              </li>
            );
          })}
        </ul>
        {visivel.semGrupo.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("Sem grupo")}
            </p>
            <ListaDeFunis funis={visivel.semGrupo} ativo={ativo} />
          </div>
        )}
      </nav>

      {nadaAchado && <p className="px-2 text-sm text-muted-foreground">{t("Nada encontrado.")}</p>}

      {podeGerenciar && (
        <OrganizarOrigens open={organizando} onOpenChange={setOrganizando} origens={origens} onOrigens={setOrigens} />
      )}
    </aside>
  );
}

function ListaDeFunis({
  funis,
  ativo,
  recuo = false,
}: {
  funis: FunilDaOrigem[];
  ativo: string | null;
  recuo?: boolean;
}) {
  return (
    <ul className={cn("space-y-0.5", recuo && "pl-8")}>
      {funis.map((f) => {
        const atual = f.id === ativo;
        return (
          <li key={f.id}>
            <Link
              href={`/app/pipelines/${f.id}`}
              aria-current={atual ? "page" : undefined}
              className={cn(
                "block truncate rounded-md px-2 py-1 text-sm transition-colors",
                atual
                  ? "bg-accent-soft font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-accent-soft hover:text-foreground",
              )}
            >
              {f.name}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 7: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-organizar-origens.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/selecao-longa-tem-busca.test.ts
```
Expected: PASS nos 4 arquivos. Se o `i18n-espanhol-cobre-a-tela` acusar texto fora de `t()`, envolva-o com `t("…")` literal (nunca `t(variavel)`) e confira o espanhol no dicionário.

- [ ] **Step 8: Commit**

```bash
git add hooks/escale/useOrigens.ts components/escale/origens/OrganizarOrigens.tsx components/escale/origens/PainelOrigens.tsx tests/unit/escale-organizar-origens.test.tsx tests/unit/escale-painel-origens.test.tsx
git commit -m "feat(escale): painel Origens e a janela Organizar origens

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: O encaixe — painel ao lado do quadro, só na casca nova

**Files:**
- Create: `components/escale/origens/ComOrigens.tsx`, `app/app/pipelines/layout.tsx`, `app/app/kanban/layout.tsx`, `tests/unit/escale-com-origens.test.tsx`

**Interfaces:**
- Consumes: `COOKIE_DO_MENU`, `lerPreferenciaDeMenu` de `@/lib/escale/preferencia-de-menu` (Fase 0); `requireAuth()`, `resolveActiveOrg(user)` de `@/lib/auth/server`; `ROLE_RANK` de `@/lib/auth/types`; `createClient()` de `@/lib/supabase/server`; `lerOrigens` (Task 4); `PainelOrigens` (Task 5).
- Produces: `ComOrigens({ children }: { children: ReactNode }): Promise<JSX.Element>` (Server Component); os dois layouts.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-com-origens.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

let menu: string | undefined = "topo";
let papel = "manager";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) => (nome === "escale_menu" && menu ? { value: menu } : undefined),
  }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/pipelines/f-leads",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: papel })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/escale/origens/ler-origens", () => ({ lerOrigens: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: {} }));

import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { ComOrigens } from "@/components/escale/origens/ComOrigens";

function mostrar(elemento: ReactElement) {
  render(<QueryClientProvider client={new QueryClient()}>{elemento}</QueryClientProvider>);
}

beforeEach(() => {
  menu = "topo";
  papel = "manager";
  vi.mocked(lerOrigens).mockReset();
  vi.mocked(lerOrigens).mockResolvedValue({
    grupos: [{ id: "g-obras", name: "INSS de obras" }],
    funis: [{ id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras" }],
  });
});

describe("<ComOrigens>", () => {
  it("com a casca nova, o painel Origens fica ao lado do quadro", async () => {
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "INSS de obras" })).toBeInTheDocument();
    expect(screen.getByText("o quadro")).toBeInTheDocument();
    expect(lerOrigens).toHaveBeenCalledWith(expect.anything(), "org-1");
  });

  it("com a lateral (ou sem a chave), é a tela de sempre e o banco nem é lido", async () => {
    for (const valor of ["lateral", undefined]) {
      menu = valor;
      vi.mocked(lerOrigens).mockClear();
      const { unmount } = render(await ComOrigens({ children: <p>o quadro</p> }));
      expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
      expect(screen.getByText("o quadro")).toBeInTheDocument();
      expect(lerOrigens).not.toHaveBeenCalled();
      unmount();
    }
  });

  it("banco sem a migration 9001 (ou fora do ar): o quadro abre sem o painel", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(lerOrigens).mockRejectedValue(new Error('relation "public.crm_pipeline_groups" does not exist'));
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(screen.getByText("o quadro")).toBeInTheDocument();
  });

  it("quem não é gerente vê o painel, mas não Organizar origens", async () => {
    papel = "agent";
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Organizar origens" })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-com-origens.test.tsx
```
Expected: FAIL — `Failed to resolve import "@/components/escale/origens/ComOrigens"`.

- [ ] **Step 3: O encaixe (Server Component)**

Create `components/escale/origens/ComOrigens.tsx`:

```tsx
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import type { Origens } from "@/lib/escale/origens/regras";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
import { createClient } from "@/lib/supabase/server";

import { PainelOrigens } from "./PainelOrigens";

/**
 * O PAINEL ORIGENS AO LADO DE NEGÓCIOS (fork Escale, Fase 1A).
 *
 * Só com a casca nova ligada (cookie `escale_menu=topo`, Fase 0): na lateral do
 * original a tela é exatamente a de sempre, e o banco nem é consultado. O
 * marcador de gerente é o mesmo critério das rotas (`requireRole("manager")`,
 * sem atalho de platform admin) — mostrar um botão que o servidor recusaria
 * seria prometer o que não se cumpre (ver `app/app/kanban/page.tsx`).
 *
 * Se a leitura falhar (banco ainda sem a migration 9001, ou fora do ar), o
 * quadro abre sem o painel: Negócios nunca fica fora do ar por causa dele.
 */
export async function ComOrigens({ children }: { children: ReactNode }) {
  const store = await cookies();
  if (lerPreferenciaDeMenu(store.get(COOKIE_DO_MENU)?.value) !== "topo") return <>{children}</>;

  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) return <>{children}</>;

  let origens: Origens;
  try {
    origens = await lerOrigens(await createClient(), activeOrg.orgId);
  } catch (err) {
    console.error("[escale/origens] não consegui ler os grupos de funis; o quadro abre sem o painel", err);
    return <>{children}</>;
  }

  return (
    <div className="flex items-start gap-4">
      <PainelOrigens origens={origens} podeGerenciar={ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Os dois layouts**

Create `app/app/pipelines/layout.tsx`:

```tsx
import type { ReactNode } from "react";

import { ComOrigens } from "@/components/escale/origens/ComOrigens";

// Fork Escale: painel Origens ao lado do quadro, só na casca nova (menu no topo).
// Layout acima de `[id]`: trocar de funil mantém o painel montado.
export default function PipelinesLayout({ children }: { children: ReactNode }) {
  return <ComOrigens>{children}</ComOrigens>;
}
```

Create `app/app/kanban/layout.tsx`:

```tsx
import type { ReactNode } from "react";

import { ComOrigens } from "@/components/escale/origens/ComOrigens";

// Fork Escale: "Negócios" do menu do topo abre aqui; o painel Origens vem junto,
// só na casca nova.
export default function KanbanLayout({ children }: { children: ReactNode }) {
  return <ComOrigens>{children}</ComOrigens>;
}
```

- [ ] **Step 5: Rodar os testes da fase e o typecheck**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm vitest run tests/unit/escale-com-origens.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/escale-organizar-origens.test.tsx tests/unit/escale-grupos-de-funis-rotas.test.ts tests/unit/escale-origens-regras.test.ts tests/unit/escale-grupos-de-funis-migration.test.ts app/app/pipelines/[id]/trocar-funil.test.tsx app/app/kanban/_client.test.tsx
corepack pnpm typecheck
```
Expected: 8 arquivos PASS; typecheck sem erros.

- [ ] **Step 6: Commit**

```bash
git add components/escale/origens/ComOrigens.tsx app/app/pipelines/layout.tsx app/app/kanban/layout.tsx tests/unit/escale-com-origens.test.tsx
git commit -m "feat(escale): painel Origens ao lado de Negócios na casca nova

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Gates do repositório e PR

**Files:** nenhum novo (correções só se um gate apontar defeito desta branch).

- [ ] **Step 1: Lint, réguas e colisão de migration**

```bash
corepack pnpm lint 2>&1 | tail -5
corepack pnpm lint:channels && corepack pnpm lint:role-rank
corepack pnpm checar:colisao-de-migration
```
Expected: `0 errors` no lint (avisos antigos existem); as duas réguas `ok`; o checador sem colisão para a `9001`.

- [ ] **Step 2: Suíte unitária, comparada com a main**

```bash
corepack pnpm test:unit > /tmp/unit-fase1a.log 2>&1; grep -E "Test Files|Tests  " /tmp/unit-fase1a.log
grep -E "^ ❯ \|[a-z]+\| " /tmp/unit-fase1a.log | sed -E 's/^ ❯ \|[a-z]+\| ([^ ]+) .*/\1/' | sort -u > /tmp/falhas-fase1a.txt; cat /tmp/falhas-fase1a.txt
```
Expected: nenhum arquivo `escale-*` na lista. Para cada arquivo da lista, rode-o isolado; se continuar falhando, confira se falha também em `escale-crm/main` (worktree limpa em `C:\tmp`, sem espaço no caminho — receita na memória `sincronizar-com-o-rafael`). Só é defeito desta branch o que passa na main e falha aqui; corrija esse e faça um commit `fix(escale): …`.

- [ ] **Step 3: Suíte de banco inteira**

```bash
corepack pnpm test:db > /tmp/db-fase1a.log 2>&1; grep -E "Test Files|Tests  " /tmp/db-fase1a.log
grep -E "FAIL|✗|×" /tmp/db-fase1a.log | head -20
```
Expected: todos os arquivos PASS (na sincronização de 11/10 foram 439 arquivos verdes nesta máquina). Qualquer falha que cite `crm_pipeline_groups`, `group_id` ou `9001` é desta branch: investigue com superpowers:systematic-debugging antes de mexer.

- [ ] **Step 4: Push e PR**

```bash
git push -u escale-crm feat/fase-1a-origens
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-1a-origens \
  --title "feat(escale): Fase 1A — Origens (grupos de funis + painel Origens)" --body-file - <<'EOF'
## O que é
O painel **Origens** de Negócios, como na V1 da Clint, para quem está com a casca nova ligada:
- **Grupos de funis**: cada grupo abre os funis dele; o grupo do funil aberto já vem aberto; funil sem grupo aparece em "Sem grupo".
- **Lupa**: busca grupo ou funil, sem acento e sem caixa.
- **Organizar origens** (gerente/admin): criar, renomear e excluir grupo, e escolher o grupo de cada funil. Excluir grupo **não apaga funil nem negócio**.
- Aparece em `/app/pipelines/*` e em `/app/kanban` (o "Negócios" do menu do topo), só em tela média ou maior. Com o menu lateral, nada muda.

## Banco
Migration **9001** (faixa do fork): tabela `crm_pipeline_groups` e coluna `crm_pipelines.group_id`.
- RLS igual à dos funis: toda a organização lê, só gerente/admin escreve.
- FK composta `(organization_id, group_id)`: o banco recusa ligar funil a grupo de outra organização; excluir o grupo solta os funis (`on delete set null (group_id)`).
- O mesmo SQL está no `baseline.sql` (bloco no meio do arquivo, antes do bloco da 0323), então o `update.sh` aplica na VPS.
- Prova no Postgres: `tests/invariants/escale-grupos-de-funis-rls.test.ts`.

## Onde toca o original
Só blocos em pontos fixos: `baseline.sql` (bloco 9001), `lib/i18n/dicionario.ts` (19 textos), `lib/audit/actions.ts` (4 códigos), `tests/invariants/rls-completude-varredura.test.ts` (1 entrada). Rotas, componentes e layouts são arquivos novos.

## Para publicar (decisão sua)
É a primeira mudança de banco do fork: **backup antes** (`backup.sh`) e depois `update.sh --to <versão>`. Sem a migration aplicada, o quadro abre normalmente, só sem o painel.

## Verificação
- [ ] Testes `tests/unit/escale-*` e `tests/invariants/escale-*` verdes; typecheck e lint sem erro; `test:db` verde
- [ ] CI verde (`invariants` aplica o baseline do zero e reaplicado)
- [ ] Depois de publicar, com a casca nova ligada: criar dois grupos, mover funis, renomear, excluir um grupo (os funis vão para "Sem grupo"), buscar pela lupa; entrar com um atendente e ver o painel sem "Organizar origens"; desligar a casca e ver Negócios como antes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

- [ ] **Step 5: Acompanhar o CI**

```bash
gh pr checks --repo rgisjr/escale-crm --watch
```
Expected: todos verdes, em especial `invariants` (baseline do zero + reaplicado) e `imagem-do-app-sobe`. Se falhar, investigar com superpowers:systematic-debugging antes de mexer.

- [ ] **Step 6: Entregar ao usuário**

Informar o link do PR e o que testar. **Não mergear e não publicar:** merge, release, backup e atualização da VPS são decisões do usuário (a atualização da VPS ele roda à mão).
