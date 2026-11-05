# Automação sempre salva (rascunho) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (decisão do usuário, 18/10: inline, nunca subagent-driven) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** no editor de fluxo das Automações (casca), o botão **Salvar nunca perde o trabalho**: com tudo certo ele publica como hoje; com qualquer pendência (caixa incompleta, erro do servidor, outra pessoa salvou por cima) ele grava um **rascunho** no banco, marca as caixas e a automação no ar não muda. Publicar (e ligar) continua exigindo tudo certo.

**Architecture:** tabela nova `crm_rascunhos_de_automacao` (uma linha por regra) guarda o desenho da tela como está. O motor nunca a lê. Automação **nova** salva como rascunho nasce como regra-**esqueleto**: pausada e sem ação; ligar regra sem ação passa a ser recusado no servidor (PATCH e MCP). O editor abre o rascunho quando existe, mostra uma faixa e o selo "Rascunho", e apaga o rascunho quando a publicação dá certo.

**Tech Stack:** Next.js 16 + React 19 + TypeScript, Supabase (Postgres + RLS), Zod, TanStack Query, Vitest + Testing Library, `corepack pnpm`.

## Global Constraints

- REGRA PÉTREA: só executa depois do "pode fazer" do usuário. Depois dele, o ciclo inteiro até produção é do Claude (CLAUDE.md, 18/10).
- **Tem migration (9708).** Então, no fim, rodam `test:db` e `test:db:update` (decisão do usuário, 03/11: obrigatórios com migration). Durante as tasks, nenhum teste pesado: só os arquivos de teste citados em cada task, `eslint` dos arquivos alterados e `typecheck` em segundo plano (`NODE_OPTIONS=--max-old-space-size=8192`). Nunca a suíte unitária inteira.
- Migration versionada **e** apêndice idempotente no `supabase/baseline.sql`, com `-- manifest:` no cabeçalho do `.sql` (nada no `MANIFEST.md`).
- Multi-tenant: toda consulta filtra `organization_id`; RLS na tabela nova; `anon` sem acesso; travas de suporte (`fn_aplicar_travas_de_suporte`).
- Toda rota mutante chama `requireSupportWrite()` antes do efeito e audita.
- Textos de tela passam por `t()` e ganham entrada `es` em `lib/i18n/dicionario.ts` (sem duplicar chave). Data no formato BR (`dataHoraBr`).
- **Clint:** a Clint não tem rascunho de automação. O visual segue o molde da casca (selo amarelo de "Alterações não salvas", faixa e `JanelaDeConfirmacao` que a tela já usa). Desvio pedido pelo usuário em 04/11/2026.
- Fora do escopo: o designer antigo (`app/app/webhooks/automacoes/[id]/_components/CanvasDaAutomacao.tsx`, sem a casca) e o editor em formulário (`RuleEditor.tsx`) não mudam.
- Commits em português, conventional commits, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisões (tomadas pelo Claude a pedido do usuário, 04/11/2026)

| # | Decisão |
|---|---|
| D1 | **Um botão só, "Salvar".** Sem pendência → publica (igual hoje). Com pendência → grava rascunho, marca as caixas e avisa "Corrija os pontos marcados para publicar." Nada de botão novo para aprender. |
| D2 | **Rascunho aceita qualquer estado do desenho**, inclusive erro estrutural (ciclo, caixa solta, laço). Ele nunca roda; só a publicação confere tudo. |
| D3 | **Automação no ar com rascunho pendente continua rodando a última versão publicada.** Editar não pausa nem quebra o que está funcionando. |
| D4 | **Automação nova salva como rascunho vira regra-esqueleto:** pausada, sem ação, com o gatilho escolhido. Ela aparece na lista com o selo "Rascunho" e reabre no rascunho. |
| D5 | **Única trava do rascunho: automação nova sem gatilho escolhido** ("Escolha o gatilho para salvar o rascunho."). Sem gatilho não existe automação para guardar, e o gatilho é a primeira coisa que se escolhe. |
| D6 | **Ligar regra sem ação é recusado no servidor** (PATCH da rota e `crm_set_automation_rule_active` do MCP). Na tela, o interruptor fica desligado com a explicação. Pausar nunca é recusado. |
| D7 | **409 (outra tela salvou depois) e recusa do servidor ao publicar** também viram rascunho em vez de perder a edição. |
| D8 | **Reabrir mostra o rascunho**, com faixa "Rascunho não publicado, salvo em dd/mm/aaaa às HH:MM…" e as pendências já marcadas nas caixas. Na automação já publicada há "Descartar rascunho" (com confirmação), que volta para a versão no ar. |
| D9 | **Painéis das caixas também param de travar:** a caixa de Mensagem salva com aviso (texto vazio, botão grande); o Atraso salva com tempo fora do limite ou janela incompleta. Só o campo de tempo vazio segue desligando o Salvar da caixa (não há número para guardar). A publicação confere tudo de novo. |

## Mapa de arquivos

| Arquivo | O quê |
|---|---|
| `supabase/migrations/20261204120000_9708_rascunho_de_automacao.sql` (novo) | Tabela, gatilho de mesma organização, RLS, grants, travas. |
| `supabase/baseline.sql` | Apêndice idempotente da 9708. |
| `tests/invariants/escale-automacoes-9708.test.ts` (novo) | RLS por papel, cascade, gatilho, CHECK. |
| `lib/escale/automacoes/fluxo/desenho-schema.ts` (novo) | `desenhoSchema` (sai da rota do fluxo, é reusado). |
| `app/api/v1/automacoes-da-casca/[id]/fluxo/route.ts` | Importa `desenhoSchema`. |
| `lib/escale/automacoes/fluxo/frases-do-rascunho.ts` (novo) | As frases do rascunho. |
| `lib/escale/automacoes/rascunho.ts` (novo) | Schema, evento do gatilho, leitura/gravação/descarte, esqueleto. |
| `tests/unit/escale-automacoes-rascunho.test.ts` (novo) | Testes do módulo. |
| `app/api/v1/automacoes-da-casca/[id]/rascunho/route.ts` (novo) | GET / PUT / DELETE. |
| `tests/unit/escale-automacoes-rascunho-rota.test.ts` (novo) | Testes da rota. |
| `lib/audit/actions.ts` | `automation.draft_saved`, `automation.draft_discarded`. |
| `lib/automation/rascunho-nao-liga.ts` (novo) | A frase e a régua "regra sem ação não liga". |
| `lib/automation/regras-escrita.ts`, `lib/operacao/regras-automaticas.ts` | A recusa de ligar. |
| `lib/automation/regras-escrita.test.ts`, `tests/unit/operacao-do-agente.test.ts` | Casos novos; fixture que ligava regra sem ação ganha uma ação. |
| `lib/escale/automacoes/fluxo/caixas.ts` | `RECUSA_JANELA_DO_ATRASO`. |
| `lib/escale/automacoes/fluxo/pendencias.ts` (novo) + `tests/unit/escale-fluxo-pendencias.test.ts` (novo) | O que os painéis deixavam de salvar e a publicação passa a conferir. |
| `hooks/escale/useAutomacoesDaCasca.ts` | `useRascunhoDaAutomacao`, `useSalvarRascunho`, `useDescartarRascunho`. |
| `components/escale/automacoes/fluxo/useFluxo.ts` | Salvar com rascunho, publicar apaga rascunho, ligar recusa esqueleto. |
| `tests/unit/escale-fluxo-rascunho.test.tsx` (novo) | Testes do hook. |
| `components/escale/automacoes/fluxo/FluxoDaCasca.tsx`, `TelaDoFluxo.tsx`, `CabecalhoDoFluxo.tsx`, `FaixaDoRascunho.tsx` (novo) | Abrir no rascunho, faixa, selo, interruptor, descartar. |
| `tests/unit/escale-fluxo-cabecalho.test.tsx` | Selo "Rascunho" e interruptor desligado. |
| `components/escale/automacoes/fluxo/painel/PainelDaMensagem.tsx`, `PainelDoAtraso.tsx` + `tests/unit/escale-automacoes-mensagem-sequencia.test.tsx`, `tests/unit/escale-automacoes-atraso.test.tsx` | D9. |
| `lib/escale/automacoes/tipos.ts`, `lib/escale/automacoes/banco.ts`, `components/escale/automacoes/lista/LinhaDaAutomacao.tsx`, `tests/unit/escale-automacoes-rotas.test.ts` | Selo "Rascunho" na lista; interruptor desligado no esqueleto. |
| `lib/i18n/dicionario.ts` | Frases em espanhol. |
| `.changes/automacoes-salvar-rascunho.md` (novo) | Nota de versão. |

---

### Task 0: Preparar o ambiente

**Files:** nenhum arquivo de código.

- [ ] **Step 1: Worktree nova a partir da `main` do fork**

```bash
cd "C:/Documentos/projetos claude/Deskcom CRM/repo"
git fetch escale-crm
git worktree add ../wt-rascunho -b feat/automacao-salva-rascunho escale-crm/main
cd ../wt-rascunho
corepack pnpm install --frozen-lockfile
```

Expected: install termina sem erro. Todos os caminhos daqui para baixo são relativos a `wt-rascunho`.

---

### Task 1: A tabela do rascunho (migration 9708)

**Files:**
- Create: `supabase/migrations/20261204120000_9708_rascunho_de_automacao.sql`
- Modify: `supabase/baseline.sql` (bloco novo logo antes da linha `-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----`)
- Test: `tests/invariants/escale-automacoes-9708.test.ts`

**Interfaces:**
- Produces: tabela `public.crm_rascunhos_de_automacao (rule_id uuid pk, organization_id uuid, nome text, desenho jsonb, salvo_por uuid, created_at, updated_at)`.

- [ ] **Step 1: Escrever o teste de invariante** — `tests/invariants/escale-automacoes-9708.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, GOV_VIEWER, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * RASCUNHO DE AUTOMAÇÃO (fork Escale, migration 9708) — prova contra Postgres real: só gerente ou acima
 * lê e grava, cada organização vê só o seu, o rascunho sai junto com a regra e o desenho precisa ser objeto.
 * Roda via `pnpm test:db`.
 */
const OUTRA_ORG = "e5ca1e00-9708-4000-8000-0000000000f1";
const R1 = "e5ca1e00-9708-4000-8000-0000000000a1";
const R_OUTRA = "e5ca1e00-9708-4000-8000-0000000000a2";
const R_APAGAR = "e5ca1e00-9708-4000-8000-0000000000a3";
const DESENHO = `{"caixas":[],"ligacoes":[]}`;

const erroDe = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as { stderr?: string }).stderr ?? String(e);
  }
  return "";
};

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', 'org-9708', 'Org 9708', 'Org 9708') on conflict (id) do nothing;
    delete from public.automation_rules where id::text like 'e5ca1e00-9708-%';
    insert into public.automation_rules (id, organization_id, name, trigger_event, actions, is_active) values
      ('${R1}', '${GOV_ORG}', 'Regra 9708', 'lead.created', '[]', false),
      ('${R_OUTRA}', '${OUTRA_ORG}', 'Regra outra org', 'lead.created', '[]', false),
      ('${R_APAGAR}', '${GOV_ORG}', 'Regra a apagar', 'lead.created', '[]', false);
    insert into public.crm_rascunhos_de_automacao (rule_id, organization_id, nome, desenho) values
      ('${R_OUTRA}', '${OUTRA_ORG}', 'Outra', '${DESENHO}'),
      ('${R_APAGAR}', '${GOV_ORG}', 'Apagar', '${DESENHO}');
  `);
});

describe("estrutura", () => {
  it("RLS ligada, trava do suporte e anon sem acesso", () => {
    expect(sql(`select relrowsecurity from pg_class where oid = 'public.crm_rascunhos_de_automacao'::regclass;`)).toBe("t");
    expect(
      sql(`select count(*) from pg_policies where tablename = 'crm_rascunhos_de_automacao' and policyname like 'support_write_%';`),
    ).not.toBe("0");
    expect(sql(`select has_table_privilege('anon', 'public.crm_rascunhos_de_automacao', 'select');`)).toBe("f");
  });

  it("o desenho precisa ser um objeto", () => {
    expect(
      erroDe(() =>
        sql(`insert into public.crm_rascunhos_de_automacao (rule_id, organization_id, desenho) values ('${R1}', '${GOV_ORG}', '[]');`),
      ),
    ).toMatch(/check/i);
  });
});

describe("quem lê e grava", () => {
  it("gerente grava, lê, atualiza e apaga o da própria organização", () => {
    expect(
      writeCountAs(
        GOV_MANAGER,
        `insert into public.crm_rascunhos_de_automacao (rule_id, organization_id, nome, desenho) values ('${R1}', '${GOV_ORG}', 'Meu', '${DESENHO}')`,
      ),
    ).toBe(1);
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_rascunhos_de_automacao where rule_id = '${R1}';`)).toBe(1);
    expect(writeCountAs(GOV_MANAGER, `update public.crm_rascunhos_de_automacao set nome = 'Outro' where rule_id = '${R1}'`)).toBe(1);
    expect(writeCountAs(GOV_MANAGER, `delete from public.crm_rascunhos_de_automacao where rule_id = '${R1}'`)).toBe(1);
  });

  it("agente e leitor não leem nem gravam", () => {
    for (const quem of [GOV_AGENT_A, GOV_VIEWER]) {
      expect(countAs(quem, `select count(*) from public.crm_rascunhos_de_automacao where rule_id = '${R_APAGAR}';`)).toBe(0);
      expect(
        writeCountAs(
          quem,
          `insert into public.crm_rascunhos_de_automacao (rule_id, organization_id, desenho) values ('${R1}', '${GOV_ORG}', '${DESENHO}')`,
        ),
      ).toBe(0);
    }
  });

  it("gerente não vê o rascunho de outra organização", () => {
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_rascunhos_de_automacao where rule_id = '${R_OUTRA}';`)).toBe(0);
  });
});

describe("integridade", () => {
  it("o gatilho recusa rascunho com organização diferente da regra", () => {
    expect(
      erroDe(() =>
        sql(`insert into public.crm_rascunhos_de_automacao (rule_id, organization_id, desenho) values ('${R1}', '${OUTRA_ORG}', '${DESENHO}');`),
      ),
    ).toMatch(/automacao_de_outra_organizacao/);
  });

  it("apagar a regra apaga o rascunho", () => {
    sql(`delete from public.automation_rules where id = '${R_APAGAR}';`);
    expect(sql(`select count(*) from public.crm_rascunhos_de_automacao where rule_id = '${R_APAGAR}';`)).toBe("0");
  });
});
```

- [ ] **Step 2: A migration** — `supabase/migrations/20261204120000_9708_rascunho_de_automacao.sql`:

```sql
-- manifest: **Rascunho de automação (fork Escale).** Tabela nova `crm_rascunhos_de_automacao`: uma linha por regra (`rule_id` PK, FK cascade para `automation_rules`) com o nome e o desenho da tela (jsonb objeto, até 1 MB) que a pessoa salvou sem conseguir publicar. O motor nunca lê esta tabela: a regra no ar segue a última versão publicada. O gatilho `fn_escale_automacao_da_mesma_org` (9701) recusa linha de outra organização. RLS: só gerente ou acima da organização lê e grava; anon sem acesso; travas de suporte aplicadas. `automation_rules` não muda.

create table if not exists public.crm_rascunhos_de_automacao (
  rule_id uuid primary key references public.automation_rules(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 120),
  desenho jsonb not null check (jsonb_typeof(desenho) = 'object' and octet_length(desenho::text) <= 1048576),
  salvo_por uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_rascunhos_de_automacao_org
  on public.crm_rascunhos_de_automacao (organization_id);

drop trigger if exists trg_escale_rascunho_de_automacao_mesma_org on public.crm_rascunhos_de_automacao;
create trigger trg_escale_rascunho_de_automacao_mesma_org before insert or update on public.crm_rascunhos_de_automacao
  for each row execute function public.fn_escale_automacao_da_mesma_org();

alter table public.crm_rascunhos_de_automacao enable row level security;
revoke all on table public.crm_rascunhos_de_automacao from anon;

drop policy if exists crm_rascunhos_de_automacao_gerente on public.crm_rascunhos_de_automacao;
create policy crm_rascunhos_de_automacao_gerente on public.crm_rascunhos_de_automacao
  using (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')))
  with check (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')));

grant select, insert, update, delete on public.crm_rascunhos_de_automacao to authenticated;
grant all on public.crm_rascunhos_de_automacao to service_role;

comment on table public.crm_rascunhos_de_automacao is
  'Fork Escale (9708): o desenho salvo sem publicar de cada automação. O motor não lê; a regra no ar é a última versão publicada.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

- [ ] **Step 3: O apêndice no baseline** — em `supabase/baseline.sql`, logo ANTES da linha `-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----`, colar:

```sql
-- ---- FORK ESCALE · rascunho de automação (migration 9708) ----

create table if not exists public.crm_rascunhos_de_automacao (
  rule_id uuid primary key references public.automation_rules(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 120),
  desenho jsonb not null check (jsonb_typeof(desenho) = 'object' and octet_length(desenho::text) <= 1048576),
  salvo_por uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_rascunhos_de_automacao_org
  on public.crm_rascunhos_de_automacao (organization_id);

drop trigger if exists trg_escale_rascunho_de_automacao_mesma_org on public.crm_rascunhos_de_automacao;
create trigger trg_escale_rascunho_de_automacao_mesma_org before insert or update on public.crm_rascunhos_de_automacao
  for each row execute function public.fn_escale_automacao_da_mesma_org();

alter table public.crm_rascunhos_de_automacao enable row level security;
revoke all on table public.crm_rascunhos_de_automacao from anon;

drop policy if exists crm_rascunhos_de_automacao_gerente on public.crm_rascunhos_de_automacao;
create policy crm_rascunhos_de_automacao_gerente on public.crm_rascunhos_de_automacao
  using (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')))
  with check (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')));

grant select, insert, update, delete on public.crm_rascunhos_de_automacao to authenticated;
grant all on public.crm_rascunhos_de_automacao to service_role;

comment on table public.crm_rascunhos_de_automacao is
  'Fork Escale (9708): o desenho salvo sem publicar de cada automação. O motor não lê; a regra no ar é a última versão publicada.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

```

- [ ] **Step 4: Conferir número, manifesto e cercas (leves)**

Run:
```bash
corepack pnpm checar:colisao-de-migration
corepack pnpm vitest run tests/unit/manifest-x-migrations.test.ts
corepack pnpm cercas
```
Expected: o checar não acusa colisão de `9708` nem do timestamp; manifesto e cercas verdes. Se o checar acusar `9708` tomado, use o próximo livre em `97xx` (no nome do arquivo, no rótulo do bloco do baseline e no teste) e rode de novo. O `test:db` deste arquivo roda só na Task 8.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261204120000_9708_rascunho_de_automacao.sql supabase/baseline.sql tests/invariants/escale-automacoes-9708.test.ts
git commit -m "feat(automacoes): tabela do rascunho de automação (9708)"
```

---

### Task 2: O módulo do rascunho (servidor)

**Files:**
- Create: `lib/escale/automacoes/fluxo/desenho-schema.ts`
- Modify: `app/api/v1/automacoes-da-casca/[id]/fluxo/route.ts:25-40` (o `desenhoSchema` local sai)
- Create: `lib/escale/automacoes/fluxo/frases-do-rascunho.ts`
- Create: `lib/escale/automacoes/rascunho.ts`
- Test: `tests/unit/escale-automacoes-rascunho.test.ts`

**Interfaces:**
- Produces:
  - `desenhoSchema` (zod)
  - frases: `RECUSA_RASCUNHO_SEM_GATILHO`, `TOAST_RASCUNHO_SALVO`, `TOAST_RASCUNHO_COM_VERSAO_NO_AR`, `AVISO_CORRIJA_PARA_PUBLICAR`, `AVISO_CONFLITO_VIROU_RASCUNHO`
  - `rascunhoSchema`, `type EntradaDoRascunho`, `interface RascunhoLido { nome: string; desenho: Desenho; atualizadoEm: string }`
  - `eventoDoRascunho(desenho): TriggerEvent | null`
  - `lerRascunho(db, orgId, ruleId): Promise<RascunhoLido | null>`
  - `regraDaOrganizacao(db, orgId, ruleId): Promise<boolean>`
  - `gravarRascunho(db, { orgId, ruleId, userId, nome, desenho }): Promise<string>` (devolve `updated_at`)
  - `descartarRascunho(db, orgId, ruleId): Promise<void>`
  - `criarEsqueleto(db, { orgId, userId, nome, evento }): Promise<string>` (devolve o id da regra)
  - `descartarEsqueleto(db, orgId, ruleId): Promise<void>`

- [ ] **Step 1: Escrever o teste que falha** — `tests/unit/escale-automacoes-rascunho.test.ts`:

```ts
// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { criarEsqueleto, eventoDoRascunho, gravarRascunho, lerRascunho, rascunhoSchema } from "@/lib/escale/automacoes/rascunho";

const ORG = "11111111-1111-4111-8111-111111111111";
const R1 = "22222222-2222-4222-8222-222222222222";
const gatilho = (evento: string) => ({ id: "gatilho", type: "gatilho", position: { x: 0, y: 0 }, data: { kind: "gatilho", evento, tela: {} } });

type Chamada = { metodo: string; args: unknown[] };

/** Cliente falso: anota cada chamada e responde sempre a mesma coisa. */
function banco(resposta: { data: unknown; error: { message: string } | null }) {
  const chamadas: Chamada[] = [];
  const q: Record<string, unknown> = {};
  for (const m of ["from", "select", "eq", "upsert", "insert", "delete"]) {
    q[m] = (...args: unknown[]) => {
      chamadas.push({ metodo: m, args });
      return q;
    };
  }
  q.maybeSingle = async () => resposta;
  q.single = async () => resposta;
  q.then = (ok: (r: unknown) => unknown, erro?: (e: unknown) => unknown) => Promise.resolve(resposta).then(ok, erro);
  return { db: q as unknown as SupabaseClient, chamadas };
}
const args = (chamadas: Chamada[], metodo: string) => chamadas.filter((c) => c.metodo === metodo).map((c) => c.args);

describe("eventoDoRascunho", () => {
  it("o evento do gatilho quando é um gatilho conhecido", () => {
    expect(eventoDoRascunho({ caixas: [gatilho("lead.created")] })).toBe("lead.created");
  });
  it("sem gatilho escolhido, evento desconhecido ou sem caixa: null", () => {
    expect(eventoDoRascunho({ caixas: [gatilho("")] })).toBeNull();
    expect(eventoDoRascunho({ caixas: [gatilho("nao.existe")] })).toBeNull();
    expect(eventoDoRascunho({ caixas: [] })).toBeNull();
  });
});

describe("rascunhoSchema", () => {
  it("aceita desenho com caixa incompleta (é rascunho)", () => {
    const acao = {
      id: "acao-1",
      type: "acao",
      position: { x: 1, y: 1 },
      data: { kind: "acao", acao: { type: "send_whatsapp_message", config: { template: "" } } },
    };
    expect(rascunhoSchema.safeParse({ nome: "", desenho: { caixas: [gatilho(""), acao], ligacoes: [] } }).success).toBe(true);
  });
  it("recusa nome acima de 120 e desenho sem caixas", () => {
    expect(rascunhoSchema.safeParse({ nome: "x".repeat(121), desenho: { caixas: [gatilho("")], ligacoes: [] } }).success).toBe(false);
    expect(rascunhoSchema.safeParse({ nome: "A", desenho: { caixas: [], ligacoes: [] } }).success).toBe(false);
  });
});

describe("banco do rascunho", () => {
  it("gravar faz upsert por regra, com a organização e quem salvou", async () => {
    const { db, chamadas } = banco({ data: { updated_at: "2026-11-04T12:00:00Z" }, error: null });
    const em = await gravarRascunho(db, { orgId: ORG, ruleId: R1, userId: "u1", nome: "A", desenho: { caixas: [gatilho("")], ligacoes: [] } });
    expect(em).toBe("2026-11-04T12:00:00Z");
    expect(args(chamadas, "from")[0]).toEqual(["crm_rascunhos_de_automacao"]);
    const [linha, opcoes] = args(chamadas, "upsert")[0]!;
    expect(linha).toMatchObject({ rule_id: R1, organization_id: ORG, salvo_por: "u1", nome: "A" });
    expect(opcoes).toEqual({ onConflict: "rule_id" });
  });

  it("ler filtra a organização e a regra, e devolve null para desenho torto", async () => {
    const { db, chamadas } = banco({ data: { nome: "A", desenho: { caixas: "x" }, updated_at: "t" }, error: null });
    expect(await lerRascunho(db, ORG, R1)).toBeNull();
    expect(args(chamadas, "eq")).toContainEqual(["organization_id", ORG]);
    expect(args(chamadas, "eq")).toContainEqual(["rule_id", R1]);
  });

  it("o esqueleto nasce pausado, sem ação e com nome mesmo vazio", async () => {
    const { db, chamadas } = banco({ data: { id: R1 }, error: null });
    expect(await criarEsqueleto(db, { orgId: ORG, userId: "u1", nome: "  ", evento: "lead.created" })).toBe(R1);
    expect(args(chamadas, "insert")[0]![0]).toMatchObject({
      organization_id: ORG,
      name: "Sem nome",
      trigger_event: "lead.created",
      actions: [],
      conditions: [],
      is_active: false,
      created_by_user_id: "u1",
    });
  });

  it("erro do banco vira exceção", async () => {
    const { db } = banco({ data: null, error: { message: "boom" } });
    await expect(lerRascunho(db, ORG, R1)).rejects.toThrow("boom");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-automacoes-rascunho.test.ts`
Expected: FAIL, "Failed to resolve import @/lib/escale/automacoes/rascunho".

- [ ] **Step 3: O schema do desenho em arquivo próprio** — criar `lib/escale/automacoes/fluxo/desenho-schema.ts`:

```ts
import { z } from "zod";

/**
 * O desenho da tela como o cliente manda (FORK ESCALE · 5D; reusado pelo rascunho). Aqui só a
 * forma e o tamanho: o que cada caixa diz é conferido por quem compila ou publica.
 */
export const desenhoSchema = z.object({
  caixas: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        type: z.enum(["gatilho", "condicoes", "acao", "atraso"]),
        position: z.object({ x: z.number(), y: z.number() }),
        data: z.looseObject({ kind: z.enum(["gatilho", "condicoes", "acao", "atraso"]) }),
      }),
    )
    .min(1)
    .max(80),
  ligacoes: z
    .array(z.object({ id: z.string().min(1).max(80), source: z.string().min(1), target: z.string().min(1), saida: z.string().max(80).optional() }))
    .max(160),
});
```

Em `app/api/v1/automacoes-da-casca/[id]/fluxo/route.ts`, apagar o bloco `const desenhoSchema = z.object({ … });` (linhas 25–40) e acrescentar, junto dos imports de `@/lib/escale/automacoes/fluxo/...`:

```ts
import { desenhoSchema } from "@/lib/escale/automacoes/fluxo/desenho-schema";
```

- [ ] **Step 4: As frases** — criar `lib/escale/automacoes/fluxo/frases-do-rascunho.ts`:

```ts
/** FORK ESCALE · automações: as frases do rascunho (a tela as passa por `t()`; o servidor, por `traduzir`). */
export const RECUSA_RASCUNHO_SEM_GATILHO = "Escolha o gatilho para salvar o rascunho.";
export const TOAST_RASCUNHO_SALVO = "Rascunho salvo.";
export const TOAST_RASCUNHO_COM_VERSAO_NO_AR = "Rascunho salvo. A automação no ar continua com a última versão publicada.";
export const AVISO_CORRIJA_PARA_PUBLICAR = "Corrija os pontos marcados para publicar.";
export const AVISO_CONFLITO_VIROU_RASCUNHO =
  "Outra pessoa salvou esta automação depois que você abriu. As suas alterações ficaram guardadas como rascunho.";
```

- [ ] **Step 5: O módulo** — criar `lib/escale/automacoes/rascunho.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Desenho } from "@/lib/automation/desenho-da-regra";
import { TRIGGER_EVENTS } from "@/lib/schemas/webhooks";

import { desenhoSchema } from "./fluxo/desenho-schema";

/**
 * O RASCUNHO DE UMA AUTOMAÇÃO (fork Escale, migration 9708). Salvar nunca perde o trabalho: o desenho
 * que ainda não pode ser publicado fica aqui. O motor não lê esta tabela. Sempre com a sessão de quem
 * pede (a RLS decide) e com `organization_id` filtrado também aqui.
 */
export const NOME_SEM_NOME = "Sem nome";

export const rascunhoSchema = z.object({ nome: z.string().max(120), desenho: desenhoSchema });
export type EntradaDoRascunho = z.infer<typeof rascunhoSchema>;

export interface RascunhoLido {
  nome: string;
  desenho: Desenho;
  atualizadoEm: string;
}

type EventoDoGatilho = (typeof TRIGGER_EVENTS)[number];

/** O gatilho escolhido no desenho, quando é um gatilho que existe; senão `null`. */
export function eventoDoRascunho(desenho: { caixas: ReadonlyArray<{ data: Record<string, unknown> }> }): EventoDoGatilho | null {
  const evento = desenho.caixas.find((c) => c.data.kind === "gatilho")?.data.evento;
  return typeof evento === "string" && (TRIGGER_EVENTS as readonly string[]).includes(evento) ? (evento as EventoDoGatilho) : null;
}

function lancar(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function lerRascunho(db: SupabaseClient, orgId: string, ruleId: string): Promise<RascunhoLido | null> {
  const { data, error } = await db
    .from("crm_rascunhos_de_automacao")
    .select("nome, desenho, updated_at")
    .eq("organization_id", orgId)
    .eq("rule_id", ruleId)
    .maybeSingle();
  lancar(error);
  if (!data) return null;
  const linha = data as { nome?: unknown; desenho?: unknown; updated_at?: unknown };
  const desenho = desenhoSchema.safeParse(linha.desenho);
  if (!desenho.success) return null;
  return { nome: String(linha.nome ?? ""), desenho: desenho.data as unknown as Desenho, atualizadoEm: String(linha.updated_at) };
}

export async function regraDaOrganizacao(db: SupabaseClient, orgId: string, ruleId: string): Promise<boolean> {
  const { data, error } = await db.from("automation_rules").select("id").eq("id", ruleId).eq("organization_id", orgId).maybeSingle();
  lancar(error);
  return !!data;
}

export async function gravarRascunho(
  db: SupabaseClient,
  p: { orgId: string; ruleId: string; userId: string; nome: string; desenho: EntradaDoRascunho["desenho"] },
): Promise<string> {
  const agora = new Date().toISOString();
  const { data, error } = await db
    .from("crm_rascunhos_de_automacao")
    .upsert(
      { rule_id: p.ruleId, organization_id: p.orgId, nome: p.nome, desenho: p.desenho, salvo_por: p.userId, updated_at: agora },
      { onConflict: "rule_id" },
    )
    .select("updated_at")
    .single();
  lancar(error);
  return String((data as { updated_at?: unknown } | null)?.updated_at ?? agora);
}

export async function descartarRascunho(db: SupabaseClient, orgId: string, ruleId: string): Promise<void> {
  const { error } = await db.from("crm_rascunhos_de_automacao").delete().eq("organization_id", orgId).eq("rule_id", ruleId);
  lancar(error);
}

/**
 * A automação nova salva como rascunho: a regra nasce PAUSADA e SEM AÇÃO (o esqueleto). O motor só lê
 * regra ligada, e ligar regra sem ação é recusado (`lib/automation/rascunho-nao-liga.ts`).
 */
export async function criarEsqueleto(
  db: SupabaseClient,
  p: { orgId: string; userId: string; nome: string; evento: string },
): Promise<string> {
  const { data, error } = await db
    .from("automation_rules")
    .insert({
      organization_id: p.orgId,
      name: p.nome.trim() || NOME_SEM_NOME,
      trigger_event: p.evento,
      trigger_config: {},
      conditions: [],
      actions: [],
      is_active: false,
      created_by_user_id: p.userId,
      last_change_actor_kind: "user",
      last_change_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  lancar(error);
  return String((data as { id?: unknown } | null)?.id);
}

/** Só para desfazer o esqueleto que acabou de nascer quando o rascunho dele não gravou. */
export async function descartarEsqueleto(db: SupabaseClient, orgId: string, ruleId: string): Promise<void> {
  const { error } = await db.from("automation_rules").delete().eq("id", ruleId).eq("organization_id", orgId);
  lancar(error);
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-automacoes-rascunho.test.ts tests/unit/escale-fluxo-tipos-do-canvas.test.tsx`
Expected: PASS (o segundo arquivo usa a rota do fluxo e prova que tirar o schema dela não mudou nada).

- [ ] **Step 7: Commit**

```bash
git add lib/escale/automacoes/fluxo/desenho-schema.ts "app/api/v1/automacoes-da-casca/[id]/fluxo/route.ts" lib/escale/automacoes/fluxo/frases-do-rascunho.ts lib/escale/automacoes/rascunho.ts tests/unit/escale-automacoes-rascunho.test.ts
git commit -m "feat(automacoes): módulo do rascunho de automação"
```

---

### Task 3: A rota do rascunho

**Files:**
- Modify: `lib/audit/actions.ts` (depois de `"automation.flow_published",`)
- Create: `app/api/v1/automacoes-da-casca/[id]/rascunho/route.ts`
- Test: `tests/unit/escale-automacoes-rascunho-rota.test.ts`
- Modify: `lib/i18n/dicionario.ts`

**Interfaces:**
- Consumes: tudo de `lib/escale/automacoes/rascunho.ts` e `RECUSA_RASCUNHO_SEM_GATILHO` (Task 2)
- Produces:
  - `GET /api/v1/automacoes-da-casca/:id/rascunho` → `{ data: { rascunho: RascunhoLido | null } }`
  - `PUT /api/v1/automacoes-da-casca/:id/rascunho` (`:id` = uuid ou `novo`), corpo `{ nome, desenho }` → `{ data: { ruleId, atualizadoEm, criada } }`
  - `DELETE /api/v1/automacoes-da-casca/:id/rascunho` → `{ data: { descartado: true } }`

- [ ] **Step 1: Escrever o teste que falha** — `tests/unit/escale-automacoes-rascunho-rota.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/escale/automacoes/rascunho", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/escale/automacoes/rascunho")>()),
  lerRascunho: vi.fn(),
  gravarRascunho: vi.fn(),
  descartarRascunho: vi.fn(),
  criarEsqueleto: vi.fn(),
  descartarEsqueleto: vi.fn(async () => undefined),
  regraDaOrganizacao: vi.fn(),
}));

import { DELETE, GET, PUT } from "@/app/api/v1/automacoes-da-casca/[id]/rascunho/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { requireSupportWrite } from "@/lib/impersonate/support";
import {
  criarEsqueleto,
  descartarEsqueleto,
  descartarRascunho,
  gravarRascunho,
  lerRascunho,
  regraDaOrganizacao,
} from "@/lib/escale/automacoes/rascunho";

const ORG = "11111111-1111-4111-8111-111111111111";
const R1 = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const NOVA = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

function autenticar(papel: Role): void {
  vi.mocked(requireRole).mockImplementation((async (min: Role) =>
    roleAtLeast(papel, min)
      ? { ok: true, user: { id: "u1", idioma: "pt-BR", organizations: [] }, org: { orgId: ORG, name: "Org", role: papel } }
      : { ok: false, response: new Response(null, { status: 403 }) }) as never);
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (metodo: string, corpo?: unknown) =>
  new NextRequest("http://teste/api", { method: metodo, ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }) });
const desenho = (evento: string) => ({
  caixas: [{ id: "gatilho", type: "gatilho", position: { x: 0, y: 0 }, data: { kind: "gatilho", evento, tela: {} } }],
  ligacoes: [],
});
const corpo = async (r: Response) => (await r.json()) as { data?: Record<string, unknown>; error?: { message: string } };
const acoesAuditadas = () => vi.mocked(audit).mock.calls.map((c) => (c[0] as { action: string }).action);

beforeEach(() => {
  vi.clearAllMocks();
  autenticar("manager");
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
});

describe("GET rascunho", () => {
  it("agente não lê", async () => {
    autenticar("agent");
    expect((await GET(req("GET"), ctx(R1))).status).toBe(403);
    expect(lerRascunho).not.toHaveBeenCalled();
  });

  it("gerente lê o rascunho da própria organização", async () => {
    vi.mocked(lerRascunho).mockResolvedValue({ nome: "A", desenho: desenho("lead.created") as never, atualizadoEm: "t" });
    const r = await GET(req("GET"), ctx(R1));
    expect(r.status).toBe(200);
    expect((await corpo(r)).data?.rascunho).toMatchObject({ nome: "A", atualizadoEm: "t" });
    expect(lerRascunho).toHaveBeenCalledWith(expect.anything(), ORG, R1);
  });

  it("id que não é uuid: 404", async () => {
    expect((await GET(req("GET"), ctx("abc"))).status).toBe(404);
  });
});

describe("PUT rascunho", () => {
  it("automação nova sem gatilho: 422 com a frase, e nada é criado", async () => {
    const r = await PUT(req("PUT", { nome: "Nova", desenho: desenho("") }), ctx("novo"));
    expect(r.status).toBe(422);
    expect((await corpo(r)).error?.message).toBe("Escolha o gatilho para salvar o rascunho.");
    expect(criarEsqueleto).not.toHaveBeenCalled();
  });

  it("automação nova com gatilho: cria o esqueleto e grava o rascunho nele", async () => {
    vi.mocked(criarEsqueleto).mockResolvedValue(NOVA);
    vi.mocked(gravarRascunho).mockResolvedValue("2026-11-04T12:00:00Z");
    const r = await PUT(req("PUT", { nome: "Nova", desenho: desenho("lead.created") }), ctx("novo"));
    expect(r.status).toBe(200);
    expect((await corpo(r)).data).toEqual({ ruleId: NOVA, atualizadoEm: "2026-11-04T12:00:00Z", criada: true });
    expect(criarEsqueleto).toHaveBeenCalledWith(expect.anything(), { orgId: ORG, userId: "u1", nome: "Nova", evento: "lead.created" });
    expect(gravarRascunho).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ orgId: ORG, ruleId: NOVA, userId: "u1", nome: "Nova" }));
    expect(acoesAuditadas()).toEqual(["automation.rule_created", "automation.draft_saved"]);
  });

  it("se o rascunho da nova falha, o esqueleto recém-criado sai", async () => {
    vi.mocked(criarEsqueleto).mockResolvedValue(NOVA);
    vi.mocked(gravarRascunho).mockRejectedValue(new Error("boom"));
    expect((await PUT(req("PUT", { nome: "Nova", desenho: desenho("lead.created") }), ctx("novo"))).status).toBe(500);
    expect(descartarEsqueleto).toHaveBeenCalledWith(expect.anything(), ORG, NOVA);
  });

  it("regra de outra organização: 404 e nada é gravado", async () => {
    vi.mocked(regraDaOrganizacao).mockResolvedValue(false);
    expect((await PUT(req("PUT", { nome: "A", desenho: desenho("") }), ctx(R1))).status).toBe(404);
    expect(gravarRascunho).not.toHaveBeenCalled();
  });

  it("regra existente grava mesmo sem gatilho escolhido", async () => {
    vi.mocked(regraDaOrganizacao).mockResolvedValue(true);
    vi.mocked(gravarRascunho).mockResolvedValue("t2");
    const r = await PUT(req("PUT", { nome: "A", desenho: desenho("") }), ctx(R1));
    expect(r.status).toBe(200);
    expect((await corpo(r)).data).toEqual({ ruleId: R1, atualizadoEm: "t2", criada: false });
    expect(criarEsqueleto).not.toHaveBeenCalled();
    expect(acoesAuditadas()).toEqual(["automation.draft_saved"]);
  });

  it("corpo inválido: 422", async () => {
    expect((await PUT(req("PUT", { nome: "A" }), ctx(R1))).status).toBe(422);
  });

  it("suporte só leitura não grava", async () => {
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    expect((await PUT(req("PUT", { nome: "A", desenho: desenho("") }), ctx(R1))).status).toBe(403);
    expect(gravarRascunho).not.toHaveBeenCalled();
  });

  it("agente não grava", async () => {
    autenticar("agent");
    expect((await PUT(req("PUT", { nome: "A", desenho: desenho("") }), ctx(R1))).status).toBe(403);
    expect(gravarRascunho).not.toHaveBeenCalled();
  });
});

describe("DELETE rascunho", () => {
  it("descarta o rascunho da regra e audita", async () => {
    vi.mocked(descartarRascunho).mockResolvedValue(undefined);
    expect((await DELETE(req("DELETE"), ctx(R1))).status).toBe(200);
    expect(descartarRascunho).toHaveBeenCalledWith(expect.anything(), ORG, R1);
    expect(acoesAuditadas()).toEqual(["automation.draft_discarded"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-automacoes-rascunho-rota.test.ts`
Expected: FAIL, "Failed to resolve import …/rascunho/route".

- [ ] **Step 3: Os códigos de auditoria** — em `lib/audit/actions.ts`, trocar:

```ts
  // FORK ESCALE · 5D: automação gravada em modo fluxo (regra + fluxo publicados juntos).
  "automation.flow_published",
] as const;
```

por:

```ts
  // FORK ESCALE · 5D: automação gravada em modo fluxo (regra + fluxo publicados juntos).
  "automation.flow_published",
  // FORK ESCALE · automações: o rascunho salvo sem publicar (9708).
  "automation.draft_saved",
  "automation.draft_discarded",
] as const;
```

- [ ] **Step 4: A rota** — criar `app/api/v1/automacoes-da-casca/[id]/rascunho/route.ts`:

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { RECUSA_RASCUNHO_SEM_GATILHO } from "@/lib/escale/automacoes/fluxo/frases-do-rascunho";
import {
  criarEsqueleto,
  descartarEsqueleto,
  descartarRascunho,
  eventoDoRascunho,
  gravarRascunho,
  lerRascunho,
  rascunhoSchema,
  regraDaOrganizacao,
} from "@/lib/escale/automacoes/rascunho";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

// FORK ESCALE · automações: o rascunho de uma automação — ler (GET), salvar sem publicar (PUT) e descartar (DELETE).
export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };

const uuid = z.string().uuid();
const idDoPut = z.union([z.literal("novo"), z.string().uuid()]);

/** GET /api/v1/automacoes-da-casca/:id/rascunho — o rascunho pendente; `null` quando não há. */
export async function GET(_req: NextRequest, ctx: Contexto): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
  try {
    const rascunho = await lerRascunho(await createClient(), authz.org.orgId, id);
    return ok({ rascunho }, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] ler rascunho", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}

/**
 * PUT /api/v1/automacoes-da-casca/:id/rascunho — grava o desenho como está, sem publicar. `novo` cria a
 * regra-esqueleto (pausada, sem ação) com o gatilho escolhido; é a única recusa: sem gatilho.
 */
export async function PUT(req: NextRequest, ctx: Contexto): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!idDoPut.safeParse(id).success) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
  const lido = rascunhoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return fail("validation_failed", t("Falha na validação dos dados!"), 422, { requestId });

  const db = await createClient();
  const orgId = authz.org.orgId;
  const nova = id === "novo";
  try {
    let ruleId = id;
    if (nova) {
      const evento = eventoDoRascunho(lido.data.desenho);
      if (!evento) return fail("validation_failed", t(RECUSA_RASCUNHO_SEM_GATILHO), 422, { requestId });
      ruleId = await criarEsqueleto(db, { orgId, userId: authz.user.id, nome: lido.data.nome, evento });
      void audit({
        action: "automation.rule_created",
        actorUserId: authz.user.id,
        organizationId: orgId,
        resourceType: "automation_rule",
        resourceId: ruleId,
        requestId,
        metadata: { rascunho: true },
      });
    } else if (!(await regraDaOrganizacao(db, orgId, id))) {
      return fail("not_found", t("Regra não encontrada."), 404, { requestId });
    }

    let atualizadoEm: string;
    try {
      atualizadoEm = await gravarRascunho(db, { orgId, ruleId, userId: authz.user.id, ...lido.data });
    } catch (err) {
      // A regra que acabou de nascer sem o rascunho ficaria vazia na lista: sai junto (só ela).
      if (nova) await descartarEsqueleto(db, orgId, ruleId).catch(() => undefined);
      throw err;
    }
    void audit({
      action: "automation.draft_saved",
      actorUserId: authz.user.id,
      organizationId: orgId,
      resourceType: "automation_rule",
      resourceId: ruleId,
      requestId,
    });
    return ok({ ruleId, atualizadoEm, criada: nova }, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] gravar rascunho", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}

/** DELETE /api/v1/automacoes-da-casca/:id/rascunho — descarta o rascunho; a versão publicada não muda. */
export async function DELETE(_req: NextRequest, ctx: Contexto): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "automation_rules" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return fail("not_found", t("Regra não encontrada."), 404, { requestId });
  try {
    await descartarRascunho(await createClient(), authz.org.orgId, id);
    void audit({
      action: "automation.draft_discarded",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "automation_rule",
      resourceId: id,
      requestId,
    });
    return ok({ descartado: true }, { requestId });
  } catch (err) {
    console.error("[automacoes-da-casca] descartar rascunho", requestId, err);
    return fail("internal_error", t("Erro inesperado."), 500, { requestId });
  }
}
```

- [ ] **Step 5: Espanhol das frases do servidor e da tela** — antes, conferir o que já existe:

```bash
grep -n '"Rascunho"\|"Rascunho salvo.\|"Escolha o gatilho para salvar o rascunho.\|"Corrija os pontos marcados para publicar.\|"Outra pessoa salvou esta automação\|"Esta automação ainda é um rascunho\|"Rascunho não publicado\|"Rascunho salvo em\|"O desenho salvo como rascunho\|"Revise a janela de horário do Atraso' lib/i18n/dicionario.ts
```

Em `lib/i18n/dicionario.ts`, logo depois da linha `"Descartar rascunho": {"es": "Descartar borrador"},`, acrescentar só as que o grep NÃO achou:

```ts
  "Rascunho": { es: "Borrador" },
  "Rascunho salvo.": { es: "Borrador guardado." },
  "Rascunho salvo. A automação no ar continua com a última versão publicada.": { es: "Borrador guardado. La automatización activa sigue con la última versión publicada." },
  "Escolha o gatilho para salvar o rascunho.": { es: "Elija el disparador para guardar el borrador." },
  "Corrija os pontos marcados para publicar.": { es: "Corrija los puntos marcados para publicar." },
  "Outra pessoa salvou esta automação depois que você abriu. As suas alterações ficaram guardadas como rascunho.": { es: "Otra persona guardó esta automatización después de que usted la abrió. Sus cambios quedaron guardados como borrador." },
  "Esta automação ainda é um rascunho: corrija os pontos marcados e salve antes de ligar.": { es: "Esta automatización todavía es un borrador: corrija los puntos marcados y guarde antes de activarla." },
  "Rascunho não publicado, salvo em {data}. A automação no ar segue a última versão publicada até você salvar sem pendências.": { es: "Borrador no publicado, guardado el {data}. La automatización activa sigue la última versión publicada hasta que guarde sin pendientes." },
  "Rascunho salvo em {data}. Corrija os pontos marcados e salve para poder ligar a automação.": { es: "Borrador guardado el {data}. Corrija los puntos marcados y guarde para poder activar la automatización." },
  "O desenho salvo como rascunho será apagado e a tela volta para a versão publicada.": { es: "El diseño guardado como borrador se eliminará y la pantalla vuelve a la versión publicada." },
  "Revise a janela de horário do Atraso: horário no formato 00:00 e pelo menos um dia.": { es: "Revise la franja horaria del Retraso: horario en formato 00:00 y al menos un día." },
```

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-automacoes-rascunho-rota.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts tests/unit/audit-lista-do-painel-e-derivada.test.tsx`
Expected: PASS nos três (a cerca do suporte acha o `requireSupportWrite` no PUT e no DELETE).

- [ ] **Step 7: Commit**

```bash
git add lib/audit/actions.ts "app/api/v1/automacoes-da-casca/[id]/rascunho/route.ts" tests/unit/escale-automacoes-rascunho-rota.test.ts lib/i18n/dicionario.ts
git commit -m "feat(automacoes): rota para salvar, ler e descartar o rascunho"
```

---

### Task 4: Regra sem ação não liga (servidor)

**Files:**
- Create: `lib/automation/rascunho-nao-liga.ts`
- Modify: `lib/automation/regras-escrita.ts` (`atualizarRegra`, logo depois do `if (!existente) return falhaDeEscrita("not_found", …)`)
- Modify: `lib/operacao/regras-automaticas.ts` (`regraDaOrg` e `definirRegraAtiva`)
- Test: `lib/automation/regras-escrita.test.ts`, `tests/unit/operacao-do-agente.test.ts`

**Interfaces:**
- Produces: `MENSAGEM_DO_RASCUNHO_NAO_LIGA: string`, `semAcaoParaLigar(acoes: unknown): boolean`

- [ ] **Step 1: Escrever os testes que falham**

Em `lib/automation/regras-escrita.test.ts`, acrescentar ao import do topo:

```ts
import { MENSAGEM_DO_RASCUNHO_NAO_LIGA } from "@/lib/automation/rascunho-nao-liga";
```

e, dentro do `describe("atualizarRegra", …)`, depois do caso "versão lida velha: state_conflict":

```ts
  it("ligar regra sem ação (rascunho que nunca foi publicado) é recusado e nada é gravado", async () => {
    const ops: Ops = { inserts: [], updates: [] };
    const r = await atualizarRegra(
      banco(ops, { existente: { id: "r1", trigger_event: "lead.created", actions: [] } }),
      { ...base, patch: { is_active: true } },
    );
    expect(r).toMatchObject({ ok: false, codigo: "validation_failed", status: 422, mensagem: MENSAGEM_DO_RASCUNHO_NAO_LIGA });
    expect(ops.updates).toEqual([]);
  });

  it("ligar regra com ação segue", async () => {
    const ops: Ops = { inserts: [], updates: [] };
    const r = await atualizarRegra(
      banco(ops, { existente: { id: "r1", trigger_event: "lead.created", actions: [{ type: "add_tag", config: { tags: ["x"] } }] } }),
      { ...base, patch: { is_active: true } },
    );
    expect(r.ok).toBe(true);
    expect(ops.updates[0]).toMatchObject({ is_active: true });
  });

  it("pausar regra sem ação nunca é recusado", async () => {
    const ops: Ops = { inserts: [], updates: [] };
    const r = await atualizarRegra(
      banco(ops, { existente: { id: "r1", trigger_event: "lead.created", actions: [] } }),
      { ...base, patch: { is_active: false } },
    );
    expect(r.ok).toBe(true);
  });
```

Em `tests/unit/operacao-do-agente.test.ts`, a fixture `REGRA` (perto da linha 309) liga uma regra sem ação — estado que deixa de existir. Trocar:

```ts
    { id: "r1", organization_id: ORG_ID, name: "Boas-vindas", is_active: false, actions: [], conditions: [] },
```

por:

```ts
    { id: "r1", organization_id: ORG_ID, name: "Boas-vindas", is_active: false, actions: [{ type: "add_tag", config: { tags: ["x"] } }], conditions: [] },
```

e, logo depois do caso "⭐ regra ligada pelo AGENTE grava autoria 'ai'", acrescentar:

```ts
  it("ligar regra sem ação (rascunho) é recusado com 422, e nada é escrito", async () => {
    const db = makeDb({
      automationRules: [{ id: "r9", organization_id: ORG_ID, name: "Rascunho", is_active: false, actions: [], conditions: [] }],
    });
    const erro = await recusa(() => definirRegraAtiva(deps(db), { id: "r9", ativa: true }));
    expect(erro.status).toBe(422);
    expect(db.escritas).toEqual([]);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run lib/automation/regras-escrita.test.ts tests/unit/operacao-do-agente.test.ts`
Expected: FAIL (import inexistente; o ligar sem ação ainda grava).

- [ ] **Step 3: A régua** — criar `lib/automation/rascunho-nao-liga.ts`:

```ts
/**
 * FORK ESCALE · automações: a regra que nasceu de um rascunho e nunca foi publicada não tem ação
 * (o esqueleto, `lib/escale/automacoes/rascunho.ts`). Ligar faria o motor rodar uma regra que não faz
 * nada no lugar da que a pessoa ainda está montando. Pausar nunca é recusado.
 */
export const MENSAGEM_DO_RASCUNHO_NAO_LIGA =
  "Esta automação ainda é um rascunho: corrija os pontos marcados e salve antes de ligar.";

export function semAcaoParaLigar(acoes: unknown): boolean {
  return !Array.isArray(acoes) || acoes.length === 0;
}
```

- [ ] **Step 4: A recusa no PATCH** — em `lib/automation/regras-escrita.ts`, acrescentar o import:

```ts
import { MENSAGEM_DO_RASCUNHO_NAO_LIGA, semAcaoParaLigar } from "@/lib/automation/rascunho-nao-liga";
```

e, logo depois de `if (!existente) return falhaDeEscrita("not_found", "Regra não encontrada.", 404);`:

```ts
  // FORK ESCALE · automações: regra sem ação (rascunho nunca publicado) não liga.
  if (pedido.is_active === true && semAcaoParaLigar(pedido.actions ?? (existente as { actions?: unknown }).actions)) {
    return falhaDeEscrita("validation_failed", MENSAGEM_DO_RASCUNHO_NAO_LIGA, 422);
  }
```

- [ ] **Step 5: A recusa no MCP** — em `lib/operacao/regras-automaticas.ts`, acrescentar o import:

```ts
import { MENSAGEM_DO_RASCUNHO_NAO_LIGA, semAcaoParaLigar } from "@/lib/automation/rascunho-nao-liga";
```

trocar a função `regraDaOrg` inteira por:

```ts
async function regraDaOrg(
  deps: DepsDaOperacao,
  id: string,
): Promise<{ id: string; name: string; is_active: boolean; actions: unknown }> {
  const { data, error } = await deps.supabase
    .from("automation_rules")
    .select("id, name, is_active, actions")
    .eq("id", id)
    .eq("organization_id", deps.organizationId)
    .maybeSingle();
  if (error) throw new ApiError(500, "internal_error", undefined, deps.requestId, error.message);
  if (!data) {
    throw new ApiError(404, "not_found", undefined, deps.requestId, "Essa regra não existe aqui.");
  }
  return data as unknown as { id: string; name: string; is_active: boolean; actions: unknown };
}
```

e, em `definirRegraAtiva`, logo depois de `const antes = await regraDaOrg(deps, input.id);`:

```ts
  if (input.ativa && semAcaoParaLigar(antes.actions)) {
    throw new ApiError(422, "validation_failed", undefined, deps.requestId, MENSAGEM_DO_RASCUNHO_NAO_LIGA);
  }
```

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run lib/automation/regras-escrita.test.ts tests/unit/operacao-do-agente.test.ts "app/api/v1/automation-rules/[id]/route.test.ts" tests/unit/mcp-regras-escrita.test.ts`
Expected: PASS nos quatro.

- [ ] **Step 7: Commit**

```bash
git add lib/automation/rascunho-nao-liga.ts lib/automation/regras-escrita.ts lib/operacao/regras-automaticas.ts lib/automation/regras-escrita.test.ts tests/unit/operacao-do-agente.test.ts
git commit -m "feat(automacoes): regra sem ação (rascunho) não liga, nem pela tela nem pelo MCP"
```

---

### Task 5: O que a publicação confere a mais (pendências)

**Files:**
- Modify: `lib/escale/automacoes/fluxo/caixas.ts` (depois de `RECUSA_ATRASO_MAXIMO`)
- Create: `lib/escale/automacoes/fluxo/pendencias.ts`
- Test: `tests/unit/escale-fluxo-pendencias.test.ts`

**Interfaces:**
- Produces: `RECUSA_JANELA_DO_ATRASO: string`, `pendenciasDasCaixas(desenho: Desenho): ProblemaDoDesenho[]`

- [ ] **Step 1: Escrever o teste que falha** — `tests/unit/escale-fluxo-pendencias.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { Desenho } from "@/lib/automation/desenho-da-regra";
import { RECUSA_JANELA_DO_ATRASO } from "@/lib/escale/automacoes/fluxo/caixas";
import { pendenciasDasCaixas } from "@/lib/escale/automacoes/fluxo/pendencias";

const desenho = (caixas: Desenho["caixas"]): Desenho => ({ caixas, ligacoes: [] });
const msg = (id: string, config: Record<string, unknown>) => ({
  id,
  type: "acao" as const,
  position: { x: 0, y: 0 },
  data: { kind: "acao" as const, acao: { type: "send_whatsapp_message", config } },
});
const atraso = (id: string, janela: unknown) => ({
  id,
  type: "atraso" as const,
  position: { x: 0, y: 0 },
  data: { kind: "atraso" as const, quantidade: 5, unidade: "minutos" as const, janela: janela as never },
});

describe("pendenciasDasCaixas", () => {
  it("mensagem em sequência com botão grande é pendência na própria caixa", () => {
    const passos = [{ tipo: "interativo", interativo: { tipo: "botoes", corpo: "Quer?", botoes: [{ id: "b1", titulo: "x".repeat(21) }] } }];
    expect(pendenciasDasCaixas(desenho([msg("m1", { channel_session_id: "conversation", passos })]))).toEqual([
      { caixa: "m1", mensagem: "O texto do botão deve ter no máximo 20 caracteres" },
    ]);
  });

  it("mensagem de texto único (template) não é conferida aqui: o schema da ação já confere", () => {
    expect(pendenciasDasCaixas(desenho([msg("m1", { channel_session_id: "conversation", template: "" })]))).toEqual([]);
  });

  it("Atraso com janela incompleta é pendência; janela certa ou sem janela não", () => {
    expect(pendenciasDasCaixas(desenho([atraso("a1", { de: "08:00", ate: "", dias: [1] })]))).toEqual([
      { caixa: "a1", mensagem: RECUSA_JANELA_DO_ATRASO },
    ]);
    expect(pendenciasDasCaixas(desenho([atraso("a1", { de: "08:00", ate: "19:00", dias: [] })]))).toHaveLength(1);
    expect(pendenciasDasCaixas(desenho([atraso("a1", { de: "08:00", ate: "19:00", dias: [1, 2] }), atraso("a2", null)]))).toEqual([]);
  });
});
```

Antes de rodar, conferir a frase do botão grande com `grep -n "RECUSA_BOTAO_GRANDE =" lib/escale/automacoes/fluxo/*.ts`; se o texto for outro, use-o no primeiro `toEqual`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-fluxo-pendencias.test.ts`
Expected: FAIL (import inexistente).

- [ ] **Step 3: A frase** — em `lib/escale/automacoes/fluxo/caixas.ts`, logo depois de `export const RECUSA_ATRASO_MAXIMO = "O atraso máximo é de 90 dias.";`:

```ts
export const RECUSA_JANELA_DO_ATRASO = "Revise a janela de horário do Atraso: horário no formato 00:00 e pelo menos um dia.";
```

- [ ] **Step 4: As pendências** — criar `lib/escale/automacoes/fluxo/pendencias.ts`:

```ts
import type { Desenho, ProblemaDoDesenho } from "@/lib/automation/desenho-da-regra";
import { janelaDoAtrasoSchema } from "@/lib/followup/janela-do-atraso";

import { RECUSA_JANELA_DO_ATRASO, type TempoDeResposta } from "./caixas";
import { itensDaConfig, problemaDaSequencia } from "./sequencia";

/**
 * FORK ESCALE · automações: o que os painéis das caixas deixavam de salvar e agora salvam (a caixa
 * guarda o que a pessoa digitou). A PUBLICAÇÃO confere aqui, para nada sair incompleto. A mensagem de
 * texto único (`template`) fica de fora de propósito: o schema da ação já a confere, e mexer nela
 * pegaria por engano as regras antigas que não usam `passos`.
 */
export function pendenciasDasCaixas(desenho: Desenho): ProblemaDoDesenho[] {
  const problemas: ProblemaDoDesenho[] = [];
  for (const c of desenho.caixas) {
    if (c.data.kind === "acao" && c.data.acao.type === "send_whatsapp_message") {
      const config = c.data.acao.config as Record<string, unknown>;
      if (!Array.isArray(config.passos)) continue;
      const tempo = (config.tempo_de_resposta as TempoDeResposta | undefined) ?? null;
      const problema = problemaDaSequencia(itensDaConfig(config), tempo);
      if (problema) problemas.push({ caixa: c.id, mensagem: problema });
    }
    if (c.data.kind === "atraso" && c.data.janela && !janelaDoAtrasoSchema.safeParse(c.data.janela).success) {
      problemas.push({ caixa: c.id, mensagem: RECUSA_JANELA_DO_ATRASO });
    }
  }
  return problemas;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-fluxo-pendencias.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/automacoes/fluxo/caixas.ts lib/escale/automacoes/fluxo/pendencias.ts tests/unit/escale-fluxo-pendencias.test.ts
git commit -m "feat(automacoes): a publicação confere mensagem em sequência e janela do Atraso"
```

---

### Task 6: O hook do fluxo salva como rascunho

**Files:**
- Modify: `hooks/escale/useAutomacoesDaCasca.ts` (no fim do arquivo)
- Modify: `components/escale/automacoes/fluxo/useFluxo.ts`
- Test: `tests/unit/escale-fluxo-rascunho.test.tsx`

**Interfaces:**
- Consumes: rota da Task 3; `MENSAGEM_DO_RASCUNHO_NAO_LIGA` (Task 4); `pendenciasDasCaixas` (Task 5); frases (Task 2)
- Produces:
  - `interface RascunhoDaAutomacao { nome: string; desenho: Desenho; atualizadoEm: string }`
  - `useRascunhoDaAutomacao(regraId: string | null)`, `useSalvarRascunho()`, `useDescartarRascunho()`
  - `OpcoesDoFluxo.rascunho?: RascunhoDaAutomacao | null`
  - `ResultadoDoSalvar` ganha `"rascunho"`
  - `EstadoDoFluxo` ganha `rascunhoEm: string | null`, `publicada: boolean`, `descartarRascunho: () => Promise<boolean>`

- [ ] **Step 1: Escrever o teste que falha** — `tests/unit/escale-fluxo-rascunho.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  replace: vi.fn(),
  criar: vi.fn(),
  atualizar: vi.fn(),
  alternar: vi.fn(),
  gravarFluxo: vi.fn(),
  gravarRascunho: vi.fn(),
  apagarRascunho: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: h.replace, push: vi.fn() }) }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: h.toast }));
vi.mock("@/hooks/webhooks/useAutomationRules", () => ({
  useCreateAutomationRule: () => ({ mutateAsync: h.criar, isPending: false }),
  useUpdateAutomationRule: () => ({ mutateAsync: h.atualizar, mutate: h.alternar, isPending: false }),
}));
vi.mock("@/hooks/escale/useAutomacoesDaCasca", () => ({
  useGravarFluxo: () => ({ mutateAsync: h.gravarFluxo, isPending: false }),
  useSalvarRascunho: () => ({ mutateAsync: h.gravarRascunho, isPending: false }),
  useDescartarRascunho: () => ({ mutate: h.apagarRascunho, mutateAsync: h.apagarRascunho, isPending: false }),
}));

import { useFluxo } from "@/components/escale/automacoes/fluxo/useFluxo";
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import { ApiError } from "@/lib/api/types";
import { desenhoDaRegra, telaDoGatilho } from "@/lib/automation/desenho-da-regra";
import { MENSAGEM_DO_RASCUNHO_NAO_LIGA } from "@/lib/automation/rascunho-nao-liga";
import { regraGravadaDe } from "@/lib/escale/automacoes/fluxo/estado";
import {
  AVISO_CONFLITO_VIROU_RASCUNHO,
  RECUSA_RASCUNHO_SEM_GATILHO,
  TOAST_RASCUNHO_COM_VERSAO_NO_AR,
} from "@/lib/escale/automacoes/fluxo/frases-do-rascunho";

const ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const NOVA = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const TAG = { type: "add_tag", config: { tags: ["vip"] } };
const regra = (acoes: Array<{ type: string; config: Record<string, unknown> }>): AutomationRuleRow =>
  ({
    id: ID,
    organization_id: "o1",
    name: "Regra",
    trigger_event: "lead.created",
    conditions: [],
    actions: acoes,
    trigger_config: {},
    is_active: false,
    last_run_at: null,
    run_count: 0,
    updated_at: "2026-11-04T10:00:00Z",
  }) as unknown as AutomationRuleRow;

const envolver = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <ReactFlowProvider>{children}</ReactFlowProvider>
  </QueryClientProvider>
);
const montar = (r: AutomationRuleRow | null, opcoes: Parameters<typeof useFluxo>[1] = {}) =>
  renderHook(() => useFluxo(r, opcoes), { wrapper: envolver });

beforeEach(() => {
  vi.clearAllMocks();
  h.atualizar.mockResolvedValue({ data: { updated_at: "2026-11-04T11:00:00Z" } });
  h.gravarRascunho.mockResolvedValue({ ruleId: ID, atualizadoEm: "2026-11-04T12:00:00Z", criada: false });
});

describe("salvar: publica quando está tudo certo", () => {
  it("regra completa publica pela rota de sempre e não grava rascunho", async () => {
    const { result } = montar(regra([TAG]));
    let r: string | undefined;
    await act(async () => {
      r = await result.current.salvar();
    });
    expect(r).toBe("salvo");
    expect(h.atualizar).toHaveBeenCalledWith(expect.objectContaining({ id: ID, versao_lida: "2026-11-04T10:00:00Z" }));
    expect(h.gravarRascunho).not.toHaveBeenCalled();
  });

  it("publicar com um rascunho aberto apaga o rascunho", async () => {
    const r0 = regra([TAG]);
    const rascunho = { nome: "Regra", desenho: desenhoDaRegra(regraGravadaDe(r0)), atualizadoEm: "2026-11-04T09:00:00Z" };
    const { result } = montar(r0, { rascunho });
    expect(result.current.rascunhoEm).toBe("2026-11-04T09:00:00Z");
    await act(async () => {
      await result.current.salvar();
    });
    expect(h.atualizar).toHaveBeenCalled();
    expect(h.apagarRascunho).toHaveBeenCalledWith(ID);
    expect(result.current.rascunhoEm).toBeNull();
  });
});

describe("salvar: com pendência vira rascunho", () => {
  it("regra no ar com a ação removida grava rascunho e não publica", async () => {
    const { result } = montar(regra([TAG]));
    act(() => result.current.removerNo("acao-1"));
    let r: string | undefined;
    await act(async () => {
      r = await result.current.salvar();
    });
    expect(r).toBe("rascunho");
    expect(h.atualizar).not.toHaveBeenCalled();
    expect(h.gravarRascunho).toHaveBeenCalledWith(expect.objectContaining({ id: ID, nome: "Regra" }));
    expect(h.toast.success).toHaveBeenCalledWith(TOAST_RASCUNHO_COM_VERSAO_NO_AR);
    expect(result.current.rascunhoEm).toBe("2026-11-04T12:00:00Z");
    expect(result.current.sujo).toBe(false);
  });

  it("409 na publicação: nada se perde, vira rascunho", async () => {
    h.atualizar.mockRejectedValue(new ApiError(409, "state_conflict", undefined, "r", "versão velha"));
    const { result } = montar(regra([TAG]));
    let r: string | undefined;
    await act(async () => {
      r = await result.current.salvar();
    });
    expect(r).toBe("rascunho");
    expect(h.gravarRascunho).toHaveBeenCalled();
    expect(h.toast.info).toHaveBeenCalledWith(AVISO_CONFLITO_VIROU_RASCUNHO);
  });

  it("automação nova sem gatilho: recusa com a frase e não grava nada", async () => {
    const { result } = montar(null, { nomeInicial: "Nova" });
    let r: string | undefined;
    await act(async () => {
      r = await result.current.salvar();
    });
    expect(r).toBe("recusado");
    expect(h.toast.error).toHaveBeenCalledWith(RECUSA_RASCUNHO_SEM_GATILHO);
    expect(h.gravarRascunho).not.toHaveBeenCalled();
  });

  it("automação nova incompleta com gatilho: cria pelo rascunho, organiza e vai para a regra", async () => {
    h.gravarRascunho.mockResolvedValue({ ruleId: NOVA, atualizadoEm: "t", criada: true });
    const aoCriar = vi.fn(async () => undefined);
    const { result } = montar(null, { nomeInicial: "Nova", aoCriar });
    act(() => result.current.trocarGatilho("lead.created", telaDoGatilho(null)));
    let r: string | undefined;
    await act(async () => {
      r = await result.current.salvar();
    });
    expect(r).toBe("criado");
    expect(h.gravarRascunho).toHaveBeenCalledWith(expect.objectContaining({ id: null, nome: "Nova" }));
    expect(aoCriar).toHaveBeenCalledWith(NOVA);
    expect(h.replace).toHaveBeenCalledWith(`/app/webhooks/automacoes/${NOVA}`);
    expect(h.criar).not.toHaveBeenCalled();
  });
});

describe("ligar", () => {
  it("regra que nunca foi publicada (sem ação) não liga", () => {
    const { result } = montar(regra([]));
    expect(result.current.publicada).toBe(false);
    act(() => result.current.alternarAtivo(true));
    expect(h.alternar).not.toHaveBeenCalled();
    expect(h.toast.error).toHaveBeenCalledWith(MENSAGEM_DO_RASCUNHO_NAO_LIGA);
  });

  it("regra publicada liga normalmente", () => {
    const { result } = montar(regra([TAG]));
    act(() => result.current.alternarAtivo(true));
    expect(h.alternar).toHaveBeenCalledWith({ id: ID, is_active: true }, expect.anything());
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-fluxo-rascunho.test.tsx`
Expected: FAIL (imports inexistentes / `salvar` ainda recusa).

- [ ] **Step 3: Os hooks** — no fim de `hooks/escale/useAutomacoesDaCasca.ts`:

```ts
/** FORK ESCALE · automações: o rascunho salvo sem publicar (9708). */
export interface RascunhoDaAutomacao {
  nome: string;
  desenho: Desenho;
  atualizadoEm: string;
}

const chaveDoRascunho = (regraId: string) => ["automation-rules", "rascunho", regraId] as const;

/** O rascunho pendente da automação; `null` quando não há. Lido a cada abertura (nunca de cópia velha). */
export function useRascunhoDaAutomacao(regraId: string | null) {
  return useQuery({
    queryKey: chaveDoRascunho(regraId ?? ""),
    enabled: regraId !== null,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<RascunhoDaAutomacao | null> =>
      (await apiClient.get<{ data: { rascunho: RascunhoDaAutomacao | null } }>(`${BASE}/${regraId}/rascunho`)).data.rascunho,
  });
}

/** Grava o desenho como está. `id: null` = automação nova (a rota cria a regra pausada). */
export function useSalvarRascunho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string | null; nome: string; desenho: Desenho }) =>
      (
        await apiClient.put<{ data: { ruleId: string; atualizadoEm: string; criada: boolean } }>(`${BASE}/${p.id ?? "novo"}/rascunho`, {
          nome: p.nome,
          desenho: p.desenho,
        })
      ).data,
    onError: (e: unknown) => showApiError(e),
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_AUTOMACOES }),
  });
}

export function useDescartarRascunho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (regraId: string) => {
      await apiClient.delete(`${BASE}/${regraId}/rascunho`);
    },
    onError: (e: unknown) => showApiError(e),
    onSuccess: (_dado, regraId) => {
      qc.setQueryData(chaveDoRascunho(regraId), null);
      void qc.invalidateQueries({ queryKey: CHAVE_DAS_AUTOMACOES });
    },
  });
}
```

- [ ] **Step 4: O hook do fluxo — imports e tipos** — em `components/escale/automacoes/fluxo/useFluxo.ts`:

(a) trocar `import { useGravarFluxo } from "@/hooks/escale/useAutomacoesDaCasca";` por:

```ts
import {
  useDescartarRascunho,
  useGravarFluxo,
  useSalvarRascunho,
  type RascunhoDaAutomacao,
} from "@/hooks/escale/useAutomacoesDaCasca";
import { ApiError } from "@/lib/api/types";
import { MENSAGEM_DO_RASCUNHO_NAO_LIGA } from "@/lib/automation/rascunho-nao-liga";
import {
  AVISO_CONFLITO_VIROU_RASCUNHO,
  AVISO_CORRIJA_PARA_PUBLICAR,
  RECUSA_RASCUNHO_SEM_GATILHO,
  TOAST_RASCUNHO_COM_VERSAO_NO_AR,
  TOAST_RASCUNHO_SALVO,
} from "@/lib/escale/automacoes/fluxo/frases-do-rascunho";
import { pendenciasDasCaixas } from "@/lib/escale/automacoes/fluxo/pendencias";
```

(b) na linha do import de `@/lib/escale/automacoes/fluxo/estado`, tirar `toastDaRecusa` (deixa de ser usado):

```ts
import { copiaDaCaixa, regraGravadaDe, retratoDoFluxo } from "@/lib/escale/automacoes/fluxo/estado";
```

(c) em `OpcoesDoFluxo`, depois de `desenhoDoFluxo?: Desenho | null;`:

```ts
  /** O rascunho salvo sem publicar: quando há, a tela abre nele (e não na versão no ar). */
  rascunho?: RascunhoDaAutomacao | null;
```

(d) trocar `export type ResultadoDoSalvar = "salvo" | "criado" | "recusado" | "falhou";` por:

```ts
export type ResultadoDoSalvar = "salvo" | "criado" | "rascunho" | "recusado" | "falhou";
```

(e) em `EstadoDoFluxo`, depois de `alternarAtivo: (ligar: boolean) => void;`:

```ts
  /** `updated_at` do rascunho pendente; `null` quando a tela está na versão publicada. */
  rascunhoEm: string | null;
  /** A regra já foi publicada (tem ação). Sem isto, ligar é recusado. */
  publicada: boolean;
  descartarRascunho: () => Promise<boolean>;
```

- [ ] **Step 5: O hook do fluxo — estado inicial** — no corpo de `useFluxo`:

(a) trocar o `useMemo` do `inicial` por:

```ts
  const inicial = useMemo(
    // FORK ESCALE · Fase 10B: o gatilho de comentário abre com a configuração gravada na tela.
    // FORK ESCALE · automações: com rascunho, a tela abre nele, como foi salvo.
    () =>
      opcoes.rascunho
        ? normalizarSaidas(opcoes.rascunho.desenho)
        : opcoes.desenhoDoFluxo
          ? normalizarSaidas(agruparNoFluxo(opcoes.desenhoDoFluxo))
          : organizarNaHorizontal(agrupar(comConfigPropria(desenhoDaRegra(regraGravada), regraGravada))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
```

(b) trocar as duas linhas do `nome` e do `salvo`:

```ts
  const [nome, setNome] = useState(regra?.name ?? opcoes.nomeInicial ?? "");
  const [salvo, setSalvo] = useState(() => retratoDoFluxo(regra?.name ?? "", inicial));
```

por:

```ts
  const [nome, setNome] = useState(opcoes.rascunho ? opcoes.rascunho.nome : (regra?.name ?? opcoes.nomeInicial ?? ""));
  const [salvo, setSalvo] = useState(() => retratoDoFluxo(opcoes.rascunho ? opcoes.rascunho.nome : (regra?.name ?? ""), inicial));
```

(c) logo depois de `const [problemasGerais, setProblemasGerais] = useState<ProblemaDoDesenho[]>([]);`:

```ts
  const [rascunhoEm, setRascunhoEm] = useState<string | null>(opcoes.rascunho?.atualizadoEm ?? null);
  const [publicada, setPublicada] = useState(() => (regra?.actions.length ?? 0) > 0);
```

(d) trocar as linhas das mutações e do `salvando`:

```ts
  const gravarFluxo = useGravarFluxo();
  const criar = useCreateAutomationRule();
  const atualizar = useUpdateAutomationRule();
  const salvando = criar.isPending || atualizar.isPending || gravarFluxo.isPending;
```

por:

```ts
  const gravarFluxo = useGravarFluxo();
  const criar = useCreateAutomationRule();
  const atualizar = useUpdateAutomationRule();
  const gravarRascunho = useSalvarRascunho();
  const apagarRascunho = useDescartarRascunho();
  const salvando = criar.isPending || atualizar.isPending || gravarFluxo.isPending || gravarRascunho.isPending;
```

- [ ] **Step 6: O hook do fluxo — salvar, publicar, descartar e ligar** — trocar TODO o trecho que vai de `const salvar = useCallback(async (): Promise<ResultadoDoSalvar> => {` até o fim do `const alternarAtivo = useCallback( … );` (inclusive) por:

```ts
  /** Tudo que impede PUBLICAR, já na caixa da tela. Salvar como rascunho nunca depende disto. */
  const conferir = useCallback(() => {
    // FORK ESCALE · 5D: com Atraso, ramos ou tempo de resposta o desenho grava como fluxo; senão, como regra de sempre.
    const modoFluxo = modoDoDesenho(achatado) === "fluxo";
    const resultado = modoFluxo
      ? compilar({ nome, desenho: achatado, regraGravada })
      : validarDesenho({ nome, desenho: achatado, regraGravada });
    // Os problemas vêm da fila do motor; cada um volta para a caixa da tela a que a ação pertence.
    const problemas: ProblemaDoDesenho[] = [];
    const juntar = (p: ProblemaDoDesenho) => {
      const caixa = p.caixa === null ? null : idNaTela(p.caixa);
      if (!problemas.some((q) => q.caixa === caixa && q.mensagem === p.mensagem)) problemas.push({ caixa, mensagem: p.mensagem });
    };
    if (!resultado.ok) resultado.problemas.forEach(juntar);
    // FORK ESCALE · 5D: o que o publish recusaria e não depende do banco, conferido antes de enviar.
    if (resultado.ok && "grafo" in resultado) problemasAntesDoPublish(resultado.grafo).forEach(juntar);
    gruposVazios(desenho).forEach((c) => juntar({ caixa: c.id, mensagem: PROBLEMA_DO_GRUPO_VAZIO }));
    pendenciasDasCaixas(achatado).forEach(juntar);
    return { modoFluxo, resultado, problemas };
  }, [nome, desenho, achatado, regraGravada]);

  // Um rascunho reaberto já mostra, nas caixas, o que falta para publicar.
  useEffect(() => {
    if (opcoesRef.current.rascunho) mostrarProblemas(conferir().problemas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * FORK ESCALE · automações (decisão do usuário, 04/11/2026): salvar NUNCA perde o trabalho. O que não
   * pode ser publicado vira rascunho; a automação no ar não muda. Só a nova sem gatilho não tem onde ficar.
   */
  const guardarRascunho = useCallback(
    async (aviso: string): Promise<ResultadoDoSalvar> => {
      if (!regra && !evento) {
        toast.error(t(RECUSA_RASCUNHO_SEM_GATILHO));
        return "recusado";
      }
      try {
        const r = await gravarRascunho.mutateAsync({ id: regra?.id ?? null, nome, desenho });
        setSalvo(retratoDoFluxo(nome, desenho));
        setRascunhoEm(r.atualizadoEm);
        toast.success(t(regra && publicada ? TOAST_RASCUNHO_COM_VERSAO_NO_AR : TOAST_RASCUNHO_SALVO));
        toast.info(t(aviso));
        if (regra) return "rascunho";
        await opcoesRef.current.aoCriar?.(r.ruleId); // pasta e forma, antes de trocar de tela
        router.replace(rotaDoFluxo(r.ruleId));
        return "criado";
      } catch {
        return "falhou"; // o showApiError do hook já mostrou
      }
    },
    [regra, evento, gravarRascunho, nome, desenho, publicada, router, t],
  );

  /** Publicou: a regra pode ligar, e o rascunho (se havia) sai. */
  const concluirPublicacao = useCallback(
    (ruleId: string) => {
      setPublicada(true);
      if (rascunhoEm === null) return;
      setRascunhoEm(null);
      apagarRascunho.mutate(ruleId);
    },
    [rascunhoEm, apagarRascunho],
  );

  const salvar = useCallback(async (): Promise<ResultadoDoSalvar> => {
    const { modoFluxo, resultado, problemas } = conferir();
    mostrarProblemas(problemas);
    if (!resultado.ok || problemas.length > 0) {
      setSelecionado(null);
      return guardarRascunho(AVISO_CORRIJA_PARA_PUBLICAR);
    }
    try {
      if (modoFluxo) {
        const gravado = await gravarFluxo.mutateAsync({ id: regra?.id ?? null, nome, desenho: achatado, versao });
        setVersao(gravado.atualizadoEm);
        setSalvo(retratoDoFluxo(nome, desenho));
        toast.success(t("Automação salva com sucesso!"));
        if (regra) {
          concluirPublicacao(regra.id);
          return "salvo";
        }
        toast.info(t("Ela nasce pausada: ligue quando estiver pronta."));
        await opcoesRef.current.aoCriar?.(gravado.ruleId);
        router.replace(rotaDoFluxo(gravado.ruleId));
        return "criado";
      }
      if (!resultado.ok || "modo" in resultado) return "recusado";
      if (regra) {
        const gravada = await atualizar.mutateAsync({
          id: regra.id,
          ...resultado.corpo,
          ...(versao ? { versao_lida: versao } : {}),
        });
        setVersao(gravada.data.updated_at);
        setSalvo(retratoDoFluxo(nome, desenho));
        toast.success(t("Automação salva com sucesso!"));
        concluirPublicacao(regra.id);
        return "salvo";
      }
      const criada = await criar.mutateAsync(resultado.corpo);
      setSalvo(retratoDoFluxo(nome, desenho));
      toast.success(t("Automação salva com sucesso!"));
      toast.info(t("Ela nasce pausada: ligue quando estiver pronta."));
      // A regra nova entra na lista já; a tela da automação gravada a lê do banco.
      qc.setQueryData<{ data: AutomationRuleRow[] }>(["automation-rules"], (velho) =>
        velho ? { data: [...velho.data.filter((r) => r.id !== criada.data.id), criada.data] } : { data: [criada.data] },
      );
      await opcoesRef.current.aoCriar?.(criada.data.id); // pasta e forma, antes de trocar de tela
      router.replace(rotaDoFluxo(criada.data.id));
      return "criado";
    } catch (err) {
      // FORK ESCALE · 5D: a recusa do publish volta para as caixas — e o desenho fica salvo como rascunho.
      const doServidor = modoFluxo ? problemasDoServidor(err) : null;
      if (doServidor) {
        mostrarProblemas(doServidor);
        setSelecionado(null);
        return guardarRascunho(AVISO_CORRIJA_PARA_PUBLICAR);
      }
      // Outra tela salvou por cima: nada se perde, o desenho daqui vira rascunho.
      if (err instanceof ApiError && err.code === "state_conflict") return guardarRascunho(AVISO_CONFLITO_VIROU_RASCUNHO);
      return "falhou";
    }
  }, [
    conferir,
    mostrarProblemas,
    guardarRascunho,
    concluirPublicacao,
    nome,
    desenho,
    achatado,
    regra,
    versao,
    atualizar,
    criar,
    gravarFluxo,
    router,
    qc,
    t,
  ]);

  /** Apaga o rascunho; quem chama remonta a tela na versão publicada. */
  const descartarRascunho = useCallback(async (): Promise<boolean> => {
    if (!regra) return false;
    try {
      await apagarRascunho.mutateAsync(regra.id);
      setRascunhoEm(null);
      return true;
    } catch {
      return false;
    }
  }, [regra, apagarRascunho]);

  const alternarAtivo = useCallback(
    (ligarRegra: boolean) => {
      if (!regra) return;
      // FORK ESCALE · automações: a regra que nunca foi publicada não tem o que rodar.
      if (ligarRegra && !publicada) {
        toast.error(t(MENSAGEM_DO_RASCUNHO_NAO_LIGA));
        return;
      }
      setAtivo(ligarRegra);
      atualizar.mutate(
        { id: regra.id, is_active: ligarRegra },
        {
          onSuccess: (gravada) => {
            // Ligar/pausar também troca a versão: sem isto, o próximo salvar daria conflito consigo mesmo.
            setVersao(gravada.data.updated_at);
            toast.success(ligarRegra ? t("Automação ligada.") : t("Automação pausada."));
          },
          onError: () => setAtivo(!ligarRegra),
        },
      );
    },
    [regra, publicada, atualizar, t],
  );
```

(f) no objeto devolvido no fim de `useFluxo`, depois de `alternarAtivo,`:

```ts
    rascunhoEm,
    publicada,
    descartarRascunho,
```

Se `evento` for declarado depois de `guardarRascunho` no arquivo, mova `guardarRascunho` para baixo dele (o `evento` vem de `percurso`, logo depois do `useMemo` do `percurso`).

- [ ] **Step 7: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-fluxo-rascunho.test.tsx tests/unit/escale-fluxo-estado.test.tsx tests/unit/escale-fluxo-mesmo-corpo.test.ts tests/unit/escale-automacoes-hooks.test.tsx`
Expected: PASS nos quatro.

- [ ] **Step 8: Commit**

```bash
git add hooks/escale/useAutomacoesDaCasca.ts components/escale/automacoes/fluxo/useFluxo.ts tests/unit/escale-fluxo-rascunho.test.tsx
git commit -m "feat(automacoes): salvar nunca perde o trabalho — o que não publica vira rascunho"
```

---

### Task 7: A tela (abrir no rascunho, faixa, selo, interruptor, painéis, lista)

**Files:**
- Create: `components/escale/automacoes/fluxo/FaixaDoRascunho.tsx`
- Modify: `components/escale/automacoes/fluxo/FluxoDaCasca.tsx`, `TelaDoFluxo.tsx`, `CabecalhoDoFluxo.tsx`
- Modify: `components/escale/automacoes/fluxo/painel/PainelDaMensagem.tsx:63`, `painel/PainelDoAtraso.tsx:71-77` e o JSX do aviso
- Modify: `lib/escale/automacoes/tipos.ts`, `lib/escale/automacoes/banco.ts`, `components/escale/automacoes/lista/LinhaDaAutomacao.tsx`
- Test: `tests/unit/escale-fluxo-cabecalho.test.tsx`, `tests/unit/escale-automacoes-mensagem-sequencia.test.tsx`, `tests/unit/escale-automacoes-atraso.test.tsx`, `tests/unit/escale-automacoes-rotas.test.ts`

**Interfaces:**
- Consumes: `useRascunhoDaAutomacao`, `RascunhoDaAutomacao` e o estado novo de `useFluxo` (Task 6); `MENSAGEM_DO_RASCUNHO_NAO_LIGA` (Task 4); `RECUSA_JANELA_DO_ATRASO` (Task 5)
- Produces: `CabecalhoDoFluxo` aceita `rascunho?: boolean` e `podeLigar?: boolean`; `AutomacaoDaLista` ganha `rascunho?: boolean` e `publicada?: boolean`

- [ ] **Step 1: Escrever/ajustar os testes que falham**

(a) `tests/unit/escale-fluxo-cabecalho.test.tsx` — conferir com `grep -n "CabecalhoDoFluxo\b\|function montar\|const montar" tests/unit/escale-fluxo-cabecalho.test.tsx` como o arquivo monta o cabeçalho e, no `describe` do cabeçalho, acrescentar dois casos usando o mesmo `montar` (com `existe: true`):

```tsx
  it("com rascunho pendente o selo diz Rascunho", () => {
    montar({ existe: true, sujo: false, ativo: true, rascunho: true });
    expect(screen.getByText("Rascunho")).toBeTruthy();
  });

  it("regra que nunca foi publicada: interruptor desligado, com a explicação", () => {
    montar({ existe: true, ativo: false, podeLigar: false });
    const chave = screen.getByRole("switch", { name: "Ligar automação" });
    expect(chave.hasAttribute("disabled") || chave.getAttribute("aria-disabled") === "true").toBe(true);
    expect(chave.getAttribute("title")).toBe("Esta automação ainda é um rascunho: corrija os pontos marcados e salve antes de ligar.");
  });
```

Se o `montar` do arquivo não aceitar um objeto parcial de props, acrescente `rascunho` e `podeLigar` ao tipo que ele recebe e repasse para o `<CabecalhoDoFluxo>`. Se o interruptor não tiver `role="switch"`, use o mesmo seletor que o arquivo já usa para ele.

(b) `tests/unit/escale-automacoes-mensagem-sequencia.test.tsx` — trocar o caso "botão com mais de 20 caracteres mostra a frase e desliga o Salvar" por:

```tsx
  it("botão com mais de 20 caracteres mostra a frase, mas a caixa salva (a publicação confere)", async () => {
    const aoSalvar = vi.fn();
    envolver(<PainelDaMensagem dados={dados} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Mensagem" }), "Oi");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar botão" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Botão 1" }), "x".repeat(21));
    expect(screen.getAllByText("O texto do botão deve ter no máximo 20 caracteres").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalled();
  });
```

(c) `tests/unit/escale-automacoes-atraso.test.tsx` — no primeiro caso, trocar a linha 22:

```tsx
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(true);
```

por:

```tsx
    // Janela ainda incompleta: aviso na caixa, mas o Salvar da caixa não trava (D9).
    expect(screen.getByRole("note").textContent).toBe("Revise a janela de horário do Atraso: horário no formato 00:00 e pelo menos um dia.");
    expect((screen.getByRole("button", { name: "Salvar" }) as HTMLButtonElement).disabled).toBe(false);
```

e acrescentar, depois do caso "10 segundos mostra o mínimo de 30 e desliga o Salvar":

```tsx
  it("tempo abaixo do mínimo mostra o aviso e a caixa salva assim mesmo", async () => {
    const aoSalvar = vi.fn();
    envolver(<PainelDoAtraso dados={atraso} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Unidade" }));
    await userEvent.click(screen.getByRole("option", { name: "Segundos" }));
    const campo = screen.getByRole("textbox", { name: "Tempo" });
    await userEvent.clear(campo);
    await userEvent.type(campo, "10");
    expect(screen.getByRole("alert").textContent).toBe("O atraso mínimo é de 30 segundos.");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith(expect.objectContaining({ quantidade: 10, unidade: "segundos" }));
  });
```

Conferir os nomes acessíveis do seletor de unidade e de suas opções com `grep -n "aria-label\|rotulo:" components/escale/automacoes/fluxo/painel/PainelDoAtraso.tsx` e usar os que o painel tem.

(d) `tests/unit/escale-automacoes-rotas.test.ts`, no caso "devolve automações sem o campo actions, com agentes pela Q1": acrescentar ao `banco({ … })` a tabela `crm_rascunhos_de_automacao: [{ rule_id: R1 }],` e trocar o objeto esperado por:

```ts
    expect(autos[0]).toEqual({
      id: R1, nome: "A", ativa: true, atualizadaEm: "2026-10-01T00:00:00Z",
      pastaId: P1, forma: "editor", favorita: true, agentes: ["g1"], rascunho: true, publicada: true,
    });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-fluxo-cabecalho.test.tsx tests/unit/escale-automacoes-mensagem-sequencia.test.tsx tests/unit/escale-automacoes-atraso.test.tsx tests/unit/escale-automacoes-rotas.test.ts`
Expected: FAIL nos casos novos/ajustados.

- [ ] **Step 3: A faixa** — criar `components/escale/automacoes/fluxo/FaixaDoRascunho.tsx`:

```tsx
"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { dataHoraBr } from "@/lib/escale/negocio/arquivos";

/**
 * A FAIXA DO RASCUNHO (fork Escale; a Clint não tem rascunho — molde: o amarelo do selo "Alterações não
 * salvas"). Diz que a tela está num rascunho e, na automação já publicada, deixa descartá-lo.
 */
export function FaixaDoRascunho({
  salvoEm,
  publicada,
  fuso,
  aoDescartar,
}: {
  salvoEm: string;
  publicada: boolean;
  fuso: string;
  aoDescartar: () => void;
}) {
  const t = useT();
  const data = dataHoraBr(salvoEm, fuso);
  return (
    <div role="status" className="flex shrink-0 items-center gap-3 border-b border-casca-divisoria bg-warning-bg px-5 py-2 text-[12px] text-warning-fg">
      <p className="min-w-0 flex-1">
        {publicada
          ? t("Rascunho não publicado, salvo em {data}. A automação no ar segue a última versão publicada até você salvar sem pendências.").replace("{data}", data)
          : t("Rascunho salvo em {data}. Corrija os pontos marcados e salve para poder ligar a automação.").replace("{data}", data)}
      </p>
      {publicada ? (
        <BotaoDaCasca variante="texto" tamanho="sm" onClick={aoDescartar}>
          {t("Descartar rascunho")}
        </BotaoDaCasca>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: O cabeçalho** — em `components/escale/automacoes/fluxo/CabecalhoDoFluxo.tsx`:

(a) import novo, junto dos outros:

```tsx
import { MENSAGEM_DO_RASCUNHO_NAO_LIGA } from "@/lib/automation/rascunho-nao-liga";
```

(b) trocar a função `Selo` inteira por:

```tsx
/** O selo do estado: Nova, Alterações não salvas (amarelo), Rascunho (amarelo), Ativa (verde) ou Pausada. */
function Selo({ existe, sujo, ativo, rascunho }: { existe: boolean; sujo: boolean; ativo: boolean; rascunho: boolean }) {
  const t = useT();
  const [rotulo, classe] = !existe
    ? [t("Nova"), "bg-casca-raia text-casca-texto-2"]
    : sujo
      ? [t("Alterações não salvas"), "bg-warning-bg text-warning-fg"]
      : rascunho
        ? [t("Rascunho"), "bg-warning-bg text-warning-fg"]
        : ativo
          ? [t("Ativa"), "bg-success-bg text-success-fg"]
          : [t("Pausada"), "bg-casca-raia text-casca-texto-2"];
  return <span className={cn("rounded px-1.5 py-0.5 text-[11px]", classe)}>{rotulo}</span>;
}
```

(c) nas props desestruturadas de `CabecalhoDoFluxo`, depois de `menu,`, acrescentar `rascunho = false,` e `podeLigar = true,`; e no tipo, depois de `menu: ReactNode;`:

```tsx
  /** FORK ESCALE · automações: há rascunho pendente (selo "Rascunho"). */
  rascunho?: boolean;
  /** A regra já foi publicada; sem isto o interruptor não liga. */
  podeLigar?: boolean;
```

(d) trocar `<Selo existe={existe} sujo={sujo} ativo={ativo} />` por:

```tsx
            <Selo existe={existe} sujo={sujo} ativo={ativo} rascunho={rascunho} />
```

(e) trocar o `<InterruptorDaCasca … />` por:

```tsx
              <InterruptorDaCasca
                ligado={ativo}
                aoMudar={aoAlternarAtivo}
                desabilitado={salvando || (!ativo && !podeLigar)}
                title={!ativo && !podeLigar ? t(MENSAGEM_DO_RASCUNHO_NAO_LIGA) : undefined}
                aria-label={ativo ? t("Pausar automação") : t("Ligar automação")}
              />
```

- [ ] **Step 5: Carregar o rascunho** — em `components/escale/automacoes/fluxo/FluxoDaCasca.tsx`:

(a) imports:

```tsx
import { useState } from "react";
```

e trocar a linha do import de `@/hooks/escale/useAutomacoesDaCasca` por:

```tsx
import {
  podeSerModoFluxo,
  useDesenhoDoFluxo,
  useOrganizarAoCriar,
  useRascunhoDaAutomacao,
} from "@/hooks/escale/useAutomacoesDaCasca";
```

(b) trocar o trecho de `const fluxo = useDesenhoDoFluxo(…)` até o `if (!nova && !regra) {` por:

```tsx
  const fluxo = useDesenhoDoFluxo(podeSerModoFluxo(regra) ? regra!.id : null);
  // FORK ESCALE · automações: o rascunho pendente, lido a cada abertura.
  const rascunho = useRascunhoDaAutomacao(nova ? null : id);
  // Descartar o rascunho remonta a tela na versão publicada.
  const [geracao, setGeracao] = useState(0);
  const falhouRascunho = !nova && rascunho.isError;

  if (
    !nova &&
    ((isPending && !isError) || (podeSerModoFluxo(regra) && fluxo.isPending) || (rascunho.isPending && !rascunho.isError))
  ) {
    return <Carregando />;
  }
  if (!nova && (!regra || falhouRascunho)) {
```

e, dentro desse `if`, trocar `{falhou` por `{falhou || falhouRascunho`.

(c) no `<TelaDoFluxo …>`, trocar `key={regra?.id ?? "nova"}` por `key={`${regra?.id ?? "nova"}:${geracao}`}` e acrescentar as props:

```tsx
        rascunho={nova ? null : (rascunho.data ?? null)}
        aoDescartarRascunho={() => setGeracao((g) => g + 1)}
```

- [ ] **Step 6: A tela do fluxo** — em `components/escale/automacoes/fluxo/TelaDoFluxo.tsx`:

(a) imports:

```tsx
import type { RascunhoDaAutomacao } from "@/hooks/escale/useAutomacoesDaCasca";
import { FaixaDoRascunho } from "./FaixaDoRascunho";
```

(b) nas props de `TelaDoFluxo`, depois de `aoCriar,` acrescentar `rascunho = null,` e `aoDescartarRascunho,`; e no tipo, depois de `aoCriar?: (id: string) => Promise<void>;`:

```tsx
  /** FORK ESCALE · automações: o rascunho pendente (a tela abre nele). */
  rascunho?: RascunhoDaAutomacao | null;
  /** Depois de descartar o rascunho: quem monta a tela a remonta na versão publicada. */
  aoDescartarRascunho?: () => void;
```

(c) trocar `const fluxo = useFluxo(regra, { nomeInicial, aoCriar, aoReorganizar, desenhoDoFluxo });` por:

```tsx
  const fluxo = useFluxo(regra, { nomeInicial, aoCriar, aoReorganizar, desenhoDoFluxo, rascunho });
```

(d) junto dos outros `useState`, acrescentar:

```tsx
  const [descartando, setDescartando] = useState(false);
```

(e) no `<CabecalhoDoFluxo …>`, depois de `aoAlternarAtivo={fluxo.alternarAtivo}`:

```tsx
          rascunho={fluxo.rascunhoEm !== null}
          podeLigar={fluxo.publicada}
```

(f) logo depois do `</CabecalhoDoFluxo>` (antes de `{aba === "insights" && regra ? (`):

```tsx
        {aba === "editor" && fluxo.rascunhoEm ? (
          <FaixaDoRascunho salvoEm={fluxo.rascunhoEm} publicada={fluxo.publicada} fuso={fuso} aoDescartar={() => setDescartando(true)} />
        ) : null}
```

(g) depois da última `<JanelaDeConfirmacao>` (a do "Configuração … não salva"), acrescentar:

```tsx
        <JanelaDeConfirmacao
          aberta={descartando}
          aoFechar={() => setDescartando(false)}
          perigo
          titulo={t("Descartar rascunho")}
          rotuloDoConfirmar={t("Descartar rascunho")}
          aoConfirmar={() => {
            setDescartando(false);
            void fluxo.descartarRascunho().then((ok) => {
              if (ok) aoDescartarRascunho?.();
            });
          }}
        >
          <p>{t("O desenho salvo como rascunho será apagado e a tela volta para a versão publicada.")}</p>
        </JanelaDeConfirmacao>
```

- [ ] **Step 7: Os painéis (D9)**

`components/escale/automacoes/fluxo/painel/PainelDaMensagem.tsx`, linha 63: trocar `salvarDesabilitado={!sujo || problema !== null}` por `salvarDesabilitado={!sujo}`.

`components/escale/automacoes/fluxo/painel/PainelDoAtraso.tsx`:

(a) no import de `@/lib/escale/automacoes/fluxo/caixas` (linhas 10–18), acrescentar `RECUSA_JANELA_DO_ATRASO,`.

(b) trocar:

```ts
  const podeSalvar = quantidade !== null && erroDoTempo === null && janelaValida;
```

por:

```ts
  // FORK ESCALE · automações (D9): a caixa guarda o que foi digitado; a publicação confere tempo e janela.
  const podeSalvar = quantidade !== null;
```

e, em `salvar()`, trocar `if (quantidade === null || !podeSalvar) return;` por `if (quantidade === null) return;`.

(c) logo depois do bloco `{erroDoTempo ? ( … ) : null}` do JSX, acrescentar:

```tsx
      {rascunho.limite && !janelaValida ? (
        <p role="note" className="text-[12px] text-casca-suave">
          {fraseDoFluxo(RECUSA_JANELA_DO_ATRASO, t)}
        </p>
      ) : null}
```

- [ ] **Step 8: A lista** —

`lib/escale/automacoes/tipos.ts`, em `AutomacaoDaLista`, depois de `agentes: string[];`:

```ts
  /** FORK ESCALE · automações: há rascunho salvo sem publicar (9708). */
  rascunho?: boolean;
  /** A regra tem ação (já foi publicada); sem isto o interruptor não liga. */
  publicada?: boolean;
```

`lib/escale/automacoes/banco.ts`, em `lerListaDeAutomacoes`:

(a) trocar `const [regras, casca, favoritas, pastas, agentes] = await Promise.all([` por `const [regras, casca, favoritas, pastas, agentes, rascunhos] = await Promise.all([` e acrescentar, depois da consulta de `ai_agents` (antes do `]);`):

```ts
    supabase.from("crm_rascunhos_de_automacao").select("rule_id").eq("organization_id", orgId),
```

(b) trocar `for (const r of [regras, casca, favoritas, pastas, agentes]) lancar(r.error);` por:

```ts
  for (const r of [regras, casca, favoritas, pastas, agentes, rascunhos]) lancar(r.error);
  const comRascunho = new Set((rascunhos.data ?? []).map((r) => String(r.rule_id)));
```

(c) no objeto de cada automação, depois de `agentes: agentesDaRegra(r.actions, conhecidos),`:

```ts
        rascunho: comRascunho.has(String(r.id)),
        publicada: Array.isArray(r.actions) && r.actions.length > 0,
```

`components/escale/automacoes/lista/LinhaDaAutomacao.tsx`:

(a) import, junto dos outros:

```tsx
import { MENSAGEM_DO_RASCUNHO_NAO_LIGA } from "@/lib/automation/rascunho-nao-liga";
```

(b) trocar o `<td className="px-3">` que contém o `<Link …>{a.nome}</Link>` por:

```tsx
      <td className="px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={rotaDeAbrir(a)}
            onClick={(e) => {
              if (a.forma === "editor") {
                e.preventDefault();
                aoEditar(a.id);
              }
            }}
            className="block truncate text-[13px] font-medium text-casca-texto hover:underline"
          >
            {a.nome}
          </Link>
          {a.rascunho ? (
            <span className="shrink-0 rounded bg-warning-bg px-1.5 py-0.5 text-[11px] text-warning-fg">{t("Rascunho")}</span>
          ) : null}
        </div>
      </td>
```

(c) no `<InterruptorDaCasca … />` da linha, acrescentar:

```tsx
          desabilitado={!a.ativa && a.publicada === false}
          title={!a.ativa && a.publicada === false ? t(MENSAGEM_DO_RASCUNHO_NAO_LIGA) : undefined}
```

- [ ] **Step 9: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-fluxo-cabecalho.test.tsx tests/unit/escale-automacoes-mensagem-sequencia.test.tsx tests/unit/escale-automacoes-atraso.test.tsx tests/unit/escale-automacoes-rotas.test.ts tests/unit/escale-automacoes-lista.test.tsx tests/unit/escale-fluxo-paineis.test.tsx tests/unit/escale-fluxo-paineis-acoes.test.tsx tests/unit/escale-fluxo-nos.test.tsx tests/unit/escale-fluxo-pagina.test.tsx tests/unit/escale-fluxo-rascunho.test.tsx`
Expected: PASS em todos.

- [ ] **Step 10: Commit**

```bash
git add components/escale/automacoes/fluxo/FaixaDoRascunho.tsx components/escale/automacoes/fluxo/FluxoDaCasca.tsx components/escale/automacoes/fluxo/TelaDoFluxo.tsx components/escale/automacoes/fluxo/CabecalhoDoFluxo.tsx components/escale/automacoes/fluxo/painel/PainelDaMensagem.tsx components/escale/automacoes/fluxo/painel/PainelDoAtraso.tsx lib/escale/automacoes/tipos.ts lib/escale/automacoes/banco.ts components/escale/automacoes/lista/LinhaDaAutomacao.tsx tests/unit/escale-fluxo-cabecalho.test.tsx tests/unit/escale-automacoes-mensagem-sequencia.test.tsx tests/unit/escale-automacoes-atraso.test.tsx tests/unit/escale-automacoes-rotas.test.ts
git commit -m "feat(automacoes): a tela abre no rascunho, mostra o selo e a faixa, e as caixas salvam com aviso"
```

---

### Task 8: Verificação, revisão e entrega

**Files:**
- Create: `.changes/automacoes-salvar-rascunho.md`

- [ ] **Step 1: Nota de versão**

```markdown
---
impacto: capacidade_nova
secao: adicionado
titulo: Automações sempre salvam: o que não pode ser publicado vira rascunho
---

No editor de Automações, o botão Salvar não perde mais o trabalho. Com tudo certo, ele publica
como antes. Se faltar algo (uma caixa incompleta, por exemplo), a automação é salva como
rascunho: as caixas com pendência ficam marcadas e a versão que já estava no ar continua
funcionando até você corrigir e salvar de novo. Ao reabrir, a tela mostra o rascunho, com a data
em que foi salvo e a opção de descartá-lo. Uma automação nova salva como rascunho fica pausada e
só pode ser ligada depois de publicada.
```

Run: `corepack pnpm release:conferir`
Expected: aceita o fragmento (`secao` precisa ser `adicionado`, `alterado` ou `corrigido`).

- [ ] **Step 2: Testes da área, cercas, eslint e typecheck**

```bash
corepack pnpm vitest run tests/unit/escale-automacoes-rascunho.test.ts tests/unit/escale-automacoes-rascunho-rota.test.ts tests/unit/escale-fluxo-pendencias.test.ts tests/unit/escale-fluxo-rascunho.test.tsx tests/unit/escale-fluxo-cabecalho.test.tsx tests/unit/escale-automacoes-atraso.test.tsx tests/unit/escale-automacoes-mensagem-sequencia.test.tsx tests/unit/escale-automacoes-rotas.test.ts tests/unit/escale-automacoes-lista.test.tsx tests/unit/escale-automacoes-hooks.test.tsx tests/unit/escale-fluxo-estado.test.tsx tests/unit/escale-fluxo-mesmo-corpo.test.ts tests/unit/escale-fluxo-paineis.test.tsx tests/unit/escale-fluxo-paineis-acoes.test.tsx tests/unit/escale-fluxo-nos.test.tsx tests/unit/escale-fluxo-pagina.test.tsx tests/unit/escale-fluxo-tipos-do-canvas.test.tsx lib/automation/regras-escrita.test.ts tests/unit/operacao-do-agente.test.ts "app/api/v1/automation-rules/[id]/route.test.ts" tests/unit/mcp-regras-escrita.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts tests/unit/audit-lista-do-painel-e-derivada.test.tsx
corepack pnpm cercas
corepack pnpm eslint lib/escale/automacoes/rascunho.ts lib/escale/automacoes/fluxo/desenho-schema.ts lib/escale/automacoes/fluxo/frases-do-rascunho.ts lib/escale/automacoes/fluxo/pendencias.ts lib/escale/automacoes/fluxo/caixas.ts "app/api/v1/automacoes-da-casca/[id]/rascunho/route.ts" "app/api/v1/automacoes-da-casca/[id]/fluxo/route.ts" lib/automation/rascunho-nao-liga.ts lib/automation/regras-escrita.ts lib/operacao/regras-automaticas.ts lib/audit/actions.ts hooks/escale/useAutomacoesDaCasca.ts components/escale/automacoes/fluxo/useFluxo.ts components/escale/automacoes/fluxo/FluxoDaCasca.tsx components/escale/automacoes/fluxo/TelaDoFluxo.tsx components/escale/automacoes/fluxo/CabecalhoDoFluxo.tsx components/escale/automacoes/fluxo/FaixaDoRascunho.tsx components/escale/automacoes/fluxo/painel/PainelDaMensagem.tsx components/escale/automacoes/fluxo/painel/PainelDoAtraso.tsx lib/escale/automacoes/tipos.ts lib/escale/automacoes/banco.ts components/escale/automacoes/lista/LinhaDaAutomacao.tsx
NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm typecheck   # em segundo plano
```

Expected: testes PASS; cercas verdes; eslint sem erro (avisos antigos do `react-hooks/set-state-in-effect` não contam); typecheck só com o erro já conhecido e alheio, se aparecer, de `tests/unit/escale-fila-da-casca.test.tsx(67)`. Falha nova: corrigir antes de seguir.

- [ ] **Step 3: Banco (obrigatório: tem migration)** — em segundo plano:

```bash
corepack pnpm test:db tests/invariants/escale-automacoes-9708.test.ts tests/invariants/escale-automacoes-9701.test.ts > /tmp/db-9708.log 2>&1; echo "exit=$?"
corepack pnpm test:db:update > /tmp/dbu-9708.log 2>&1; echo "exit=$?"
```

Expected: os dois com `exit=0`. Ler o rodapé (`Test Files`, `Tests`, `Errors`) dos dois logs antes de concluir; o exit code é a autoridade.

- [ ] **Step 4: Revisão** — um revisor (`code-reviewer`, Opus, esforço medium; é migration + RLS) sobre `git diff escale-crm/main...HEAD`, com foco em: RLS e grants da 9708; filtro de `organization_id` em todas as consultas novas; a rota só cria esqueleto com gatilho válido e desfaz o esqueleto se o rascunho falhar; a recusa de ligar regra sem ação nos dois caminhos (PATCH e MCP) sem pegar regra legítima; o `useFluxo` nunca publica com pendência e nunca perde a edição (rascunho no 409 e na recusa do servidor); o `inicial` do rascunho. Sem Critical/High aberto; MEDIUM que valha corrigir, corrigir num commit à parte e rodar de novo só os testes da área tocada.

- [ ] **Step 5: Commit da nota, PR e merge** —

```bash
git add .changes/automacoes-salvar-rascunho.md
git commit -m "docs(changes): nota de versão do rascunho de automação"
git push -u escale-crm feat/automacao-salva-rascunho
```

PR para `rgisjr/escale-crm` `main` (nunca `origin`), corpo com o que entrou, as decisões D1–D9, a migration 9708 e o plano de teste (incluindo `test:db` e `test:db:update`), terminando com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Mergear.

- [ ] **Step 6: Publicação** — na `repo` (main do fork atualizada): conferir com `git log --oneline v1.82.0-escale.1..escale-crm/main` e `git diff --name-only v1.82.0-escale.1..escale-crm/main -- supabase/migrations` que só entrou esta frente; `corepack pnpm release:cortar`, commit `release(<versão>): …` e push na `main`; tag anotada `v<versão>-escale.1` (ou o próximo `escale.N` da mesma versão) e `gh release create … --latest` em `rgisjr/escale-crm`; esperar `promover-stable: success`. Na VPS `76.13.228.29`: `df -h /`, `bash hostgator-setup-kit/backup.sh`, `nohup bash hostgator-setup-kit/update.sh --to <tag> > /root/update-<tag>.log 2>&1 &` e esperar o processo acabar numa chamada separada. Conferir: 3 containers healthy, `https://app.escaleia.com/` 200, `/login` 200, `/app` 307, sem erro nos logs do app e do worker, `.env` com a imagem da tag e, só leitura, a tabela `crm_rascunhos_de_automacao` com RLS ligada e a policy `crm_rascunhos_de_automacao_gerente`. Falhou a conferência: voltar para a versão anterior e avisar.
