# Fase 1B — Origens (abrir direto no funil, +, ⋮, arquivar, toda origem tem grupo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o painel Origens da casca nova ficar igual ao da Clint: o "Negócios" do menu do topo abre direto no último funil aberto; o painel ganha `<` (recolher painel), `^` (recolher lista), seta por grupo, `+` de Origens (Adicionar origem / Adicionar grupo de origens), `+` no grupo (nova origem dentro dele), ⋮ do grupo (Configurações, Selecionar origens [desligado], Customizar, Ocultar da minha barra lateral, Arquivar, Excluir), ⋮ da origem (Configurações, Selecionar origem [desligado], Arquivar, Excluir) e a seção Arquivados; e toda origem passa a ter grupo.

**Architecture:** A migration do fork **9002** dá ao grupo cor, ícone e "arquivado", troca a FK `crm_pipelines_group_fk` de `set null` para recusa (`no action`), cria um gatilho `security definer` que põe no grupo "Geral" da organização todo funil que chega sem grupo (inclusive os já existentes, num backfill) e torna `crm_pipelines.group_id` NOT NULL. As regras puras crescem em `lib/escale/origens/` (árvore com arquivados, funil inicial, preferências em cookie); as rotas do fork ganham GET, PATCH parcial, DELETE com grupo de destino e PUT sem nulo; criar, renomear, tornar padrão, arquivar e excluir origem reaproveitam as rotas do original (`/api/v1/pipelines…`). O painel vira um conjunto de componentes pequenos (`PainelOrigens`, `LinhasDoPainel`, `ArquivadosDoPainel`, `IconeDoGrupo`, `JanelasDeOrigens` + `JanelasDoGrupo` + `JanelasDaOrigem`) e a janela "Organizar origens" da Fase 1A sai. O "Negócios" do menu do topo passa a apontar para a rota nova `/app/escale/negocios`, que redireciona para o funil certo.

**Tech Stack:** Postgres 15+/Supabase (RLS, gatilho plpgsql), Next.js 16 App Router (Route Handler, Server Action, Server Component), React 19, TypeScript estrito, Zod 4, TanStack Query, Radix (DropdownMenu, Dialog), Vitest + Testing Library, Tailwind 4, Phosphor (via `@/lib/ui/icons`).

**Mockup aprovado:** https://claude.ai/artifact/DuMqGvwf5mdNATiGbgQaco

## Global Constraints

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`. Base: `escale-crm/main` (hoje `4bd3e4c40`). Branch: `feat/fase-1b-origens`. PR para `rgisjr/escale-crm` base `main`; quem aprova é o usuário. Nunca dar push em `origin` (Rafael). Não mergear, não publicar release, não mexer na VPS nem no banco de produção.
- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`. Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- Migration do fork: número **9002**, arquivo `supabase/migrations/20261014150000_9002_toda_origem_tem_grupo.sql`, com `-- manifest:` numa linha só na primeira linha. **Não** acrescentar linha no `supabase/migrations/MANIFEST.md`.
- O MESMO SQL vai para `supabase/baseline.sql`, logo ANTES da linha `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (portanto logo DEPOIS do bloco 9001), com o cabeçalho `-- ---- FORK ESCALE · toda origem tem grupo (migration 9002) ----`. Nunca no fim do arquivo.
- Regra de produto: **toda origem tem grupo.** Não existe "Sem grupo" na tela nem nas opções. Grupo excluído leva as origens para outro grupo escolhido; grupo vazio sai direto. Arquivar grupo leva as origens junto (somem do painel com ele), sem arquivar cada funil — elas continuam recebendo negócios.
- O grupo de reserva se chama **"Geral"** (uma por organização, criado sob demanda pelo gatilho).
- "Selecionar origens" / "Selecionar origem" aparecem no ⋮ **desligados**, com o selo "Em breve" (Fase 1C, Visualizações).
- "Ocultar da minha barra lateral", painel recolhido, lista recolhida e último funil aberto ficam em **cookies httpOnly** gravados por Server Action (padrão de `app/actions/shell/toggleSidebar.ts`), lidos no servidor e passados como props — nunca lidos do navegador num `useState`.
- Rotas: sessão por cookie, `requireSupportWrite()` + `requireRole("manager")` em todo handler de escrita (GET usa `requireRole("viewer")`), `organization_id` sempre da sessão, toda leitura e escrita filtrada por `organization_id`, resposta `{ data: Origens }` relida do banco.
- Os blocos do fork em arquivos do original vão em pontos fixos do MEIO: dicionário logo depois de `"Escolha um grupo válido para o funil.": …` (fim do bloco da Fase 1A); auditoria logo depois de `"pipeline.group_changed",`.
- Todo texto de tela passa por `t()` com literal (`t(MAPA[chave] ?? chave)` também é aceito, como em `SeletorDeCorDaEtiqueta`) e tem espanhol no dicionário. Chave repetida no dicionário quebra o typecheck.
- O painel só existe com a casca nova ligada (`escale_menu=topo`) e só em `md+`. Com a lateral, `/app/pipelines/*` e `/app/kanban` ficam exatamente como hoje, e o link "Negócios" da lateral continua indo para `/app/kanban`.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; corpo do PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Testes que falham NESTA máquina Windows e também em `escale-crm/main` (pdfjs com caminho `C:\…`, `spawnSync bash ENOENT`, `chmod 600`, caminho com espaço) não são regressão — ver memória `sincronizar-com-o-rafael`. Regressão é teste que passa em `escale-crm/main` e falha na branch.
- `pnpm test:db` precisa do Docker Desktop rodando. Se `docker info` falhar, PARE e peça ao usuário para abrir o Docker (se travar em "wsl-keepalive", a cura é `wsl --shutdown` e abrir o Docker de novo, com OK do usuário).

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `supabase/migrations/20261014150000_9002_toda_origem_tem_grupo.sql` | novo | cor/ícone/arquivado, gatilho do "Geral", backfill, FK que recusa, NOT NULL |
| `supabase/baseline.sql` | alterado (bloco no meio) | o mesmo SQL para o self-host |
| `tests/unit/escale-toda-origem-tem-grupo-migration.test.ts` | novo | migration ↔ baseline, posição, forma do SQL |
| `tests/invariants/escale-toda-origem-tem-grupo.test.ts` | novo | prova no Postgres do gatilho, da FK e dos CHECKs |
| `tests/invariants/escale-grupos-de-funis-rls.test.ts` | alterado (reescrito) | a prova da 9001 sem o "excluir solta os funis" |
| `lib/escale/origens/regras.ts` | alterado (reescrito) | tipos 1B, árvore com arquivados, funil inicial, ícones, cor |
| `lib/escale/origens/preferencias.ts` | novo | nomes e leitura/validação dos cookies do painel |
| `tests/unit/escale-origens-regras.test.ts` | alterado (reescrito) | regras puras 1B |
| `tests/unit/escale-origens-preferencias.test.ts` | novo | cookies do painel |
| `lib/i18n/dicionario.ts` | alterado (bloco) | textos novos em espanhol |
| `lib/escale/origens/ler-origens.ts` | alterado (reescrito) | lê grupos (cor, ícone, arquivado) e TODOS os funis |
| `lib/audit/actions.ts` | alterado (bloco) | 3 códigos novos |
| `app/api/v1/pipeline-groups/route.ts` | alterado | + GET |
| `app/api/v1/pipeline-groups/[id]/route.ts` | alterado (reescrito) | PATCH parcial, DELETE com destino |
| `app/api/v1/pipelines/[id]/grupo/route.ts` | alterado (reescrito) | PUT sem nulo e sem grupo arquivado |
| `tests/unit/escale-grupos-de-funis-rotas.test.ts` | alterado (reescrito) | as rotas 1B |
| `app/actions/escale/origens.ts` | novo | Server Action que grava os cookies do painel |
| `app/app/escale/negocios/route.ts` | novo | GET que redireciona para o funil inicial |
| `lib/escale/menu-do-topo.ts` | alterado | `destino` opcional no item; Negócios → `/app/escale/negocios` |
| `components/escale/menu/MenuDoTopo.tsx` | alterado | usa `item.destino ?? item.href` |
| `tests/unit/escale-negocios-entrada.test.ts` | novo | a rota de entrada e a Server Action |
| `tests/unit/escale-menu-do-topo.test.ts` | alterado | o destino de Negócios |
| `hooks/escale/useOrigens.ts` | alterado (reescrito) | mutações 1B |
| `components/escale/origens/texto-do-erro.ts` | novo | mensagem legível de erro de rota |
| `components/escale/origens/IconeDoGrupo.tsx` | novo | o quadradinho colorido do grupo |
| `components/escale/origens/JanelasDeOrigens.tsx` | novo | o Dialog e o despacho das janelas |
| `components/escale/origens/JanelasDoGrupo.tsx` | novo | adicionar, configurar, customizar, arquivar, excluir grupo |
| `components/escale/origens/JanelasDaOrigem.tsx` | novo | adicionar, configurar, arquivar, excluir origem |
| `tests/unit/escale-janelas-de-origens.test.tsx` | novo | as janelas |
| `components/escale/origens/LinhasDoPainel.tsx` | novo | linha do grupo, linha da origem, ⋮, nova origem no grupo |
| `components/escale/origens/ArquivadosDoPainel.tsx` | novo | seção Arquivados com Desarquivar |
| `components/escale/origens/PainelOrigens.tsx` | alterado (reescrito) | o painel 1B |
| `components/escale/origens/OrganizarOrigens.tsx` | **removido** | substituído pelo `+` e pelos ⋮ |
| `tests/unit/escale-organizar-origens.test.tsx` | **removido** | idem |
| `tests/unit/escale-painel-origens.test.tsx` | alterado (reescrito) | o painel 1B |
| `components/escale/origens/ComOrigens.tsx` | alterado | lê os cookies do painel |
| `tests/unit/escale-com-origens.test.tsx` | alterado (reescrito) | cookies → painel |

---

### Task 1: Branch, migration 9002 e o bloco do baseline

**Files:**
- Create: `supabase/migrations/20261014150000_9002_toda_origem_tem_grupo.sql`, `tests/unit/escale-toda-origem-tem-grupo-migration.test.ts`
- Modify: `supabase/baseline.sql` (bloco antes da linha da 0323, logo depois do bloco 9001)
- Copy: este plano para `docs/superpowers/plans/2026-10-14-fase-1b-origens.md` no repositório

**Interfaces:**
- Produces: colunas `crm_pipeline_groups.color text null` (CHECK `crm_pipeline_groups_cor_valida`: nulo ou `^#[0-9a-f]{6}$`), `crm_pipeline_groups.icon text not null default 'iniciais'` (CHECK `crm_pipeline_groups_icone_valido`: `iniciais|funil|pessoas|predio|loja|megafone|telefone`), `crm_pipeline_groups.is_archived boolean not null default false`; função `public.fn_escale_origem_sempre_em_grupo()` + gatilho `trg_crm_pipelines_sempre_em_grupo`; FK `crm_pipelines_group_fk` sem ação (recusa); `crm_pipelines.group_id` NOT NULL. As Tasks 2 e 4 dependem disso.

- [ ] **Step 1: Branch e plano no repositório**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git switch -c feat/fase-1b-origens escale-crm/main
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-14-fase-1b-origens.md" docs/superpowers/plans/
```

- [ ] **Step 2: Escrever o teste estático (vai falhar)**

Create `tests/unit/escale-toda-origem-tem-grupo-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * TODA ORIGEM TEM GRUPO (fork Escale, migration 9002): a migration e o bloco
 * do baseline são o MESMO SQL, e o bloco mora no ponto fixo do fork — depois
 * do bloco 9001 (que cria a tabela que este altera) e antes do bloco da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261014150000_9002_toda_origem_tem_grupo.sql";
const MIGRATION_9001 = "supabase/migrations/20261013220000_9001_grupos_de_funis.sql";
const CABECALHO = "-- ---- FORK ESCALE · toda origem tem grupo (migration 9002) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("toda origem tem grupo: migration 9002 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença", () => {
    const migration = ler(MIGRATION);
    expect(migration.length).toBeGreaterThan(1000);
    expect(ler("supabase/baseline.sql").includes(migration)).toBe(true);
  });

  it("o bloco mora depois do bloco 9001 e antes do bloco da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const de9001 = baseline.indexOf(ler(MIGRATION_9001));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(ler(MIGRATION));
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9001).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9001);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("o gatilho é definer com search_path fixo e fechado a anon e authenticated", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).toContain(
      "revoke all on function public.fn_escale_origem_sempre_em_grupo() from public, anon, authenticated;",
    );
    expect(sql).toContain("on conflict (organization_id, (lower(btrim(name)))) do nothing");
  });

  it("a FK passa a recusar e a coluna deixa de aceitar nulo", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("alter table public.crm_pipelines drop constraint if exists crm_pipelines_group_fk;");
    expect(sql).not.toContain("on delete set null");
    expect(sql).toContain("alter table public.crm_pipelines alter column group_id set not null;");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-toda-origem-tem-grupo-migration.test.ts
```
Expected: FAIL — `expected false to be true` no primeiro teste.

- [ ] **Step 4: Escrever a migration**

Create `supabase/migrations/20261014150000_9002_toda_origem_tem_grupo.sql` (primeira linha = `-- manifest:` numa linha só):

```sql
-- manifest: **Toda origem tem grupo (fork Escale, Fase 1B — painel Origens).** O grupo de funis ganha cor (um tom da paleta das etiquetas, ou nulo = automática), ícone (lista fechada) e "arquivado". Todo funil passa a ter grupo: o gatilho `trg_crm_pipelines_sempre_em_grupo` (definer, fechado a anon/authenticated) põe no grupo "Geral" da organização — criado sob demanda — o funil que chega sem grupo por qualquer caminho (lista de funis, IA, API, funil semeado da organização nova), e o backfill faz o mesmo com os que já existem. A FK `crm_pipelines_group_fk` deixa de soltar os funis (`set null`) e passa a recusar a exclusão de grupo com funil: quem exclui escolhe antes o grupo de destino. `crm_pipelines.group_id` vira NOT NULL.
-- 9002: toda origem tem grupo (fork Escale).

alter table public.crm_pipeline_groups
  add column if not exists color text,
  add column if not exists icon text not null default 'iniciais',
  add column if not exists is_archived boolean not null default false;

do $checks$
begin
  if not exists (select 1 from pg_constraint where conname = 'crm_pipeline_groups_cor_valida') then
    alter table public.crm_pipeline_groups
      add constraint crm_pipeline_groups_cor_valida
      check (color is null or color ~ '^#[0-9a-f]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'crm_pipeline_groups_icone_valido') then
    alter table public.crm_pipeline_groups
      add constraint crm_pipeline_groups_icone_valido
      check (icon in ('iniciais', 'funil', 'pessoas', 'predio', 'loja', 'megafone', 'telefone'));
  end if;
end $checks$;

comment on column public.crm_pipeline_groups.color is
  'Cor do ícone do grupo: um tom de PALETA_DE_ETIQUETAS (lib/tags/cor-da-etiqueta.ts) ou NULL = cor automática pelo id.';
comment on column public.crm_pipeline_groups.icon is
  'Ícone do grupo no painel Origens; iniciais = duas letras do nome.';
comment on column public.crm_pipeline_groups.is_archived is
  'Grupo arquivado some do painel COM as origens dele, que continuam vivas (recebem negócio). Desarquivar devolve tudo.';

-- ── O GRUPO DE RESERVA ─────────────────────────────────────────────────────
-- Definer porque quem cria funil nem sempre pode criar grupo (o funil semeado
-- da organização nova nasce dentro do INSERT em organizations). O nome "Geral"
-- é procurado sem caixa nem espaços nas pontas — a mesma régua do índice
-- `uq_crm_pipeline_groups_org_nome` —, então o `on conflict` resolve a corrida
-- de dois funis chegando juntos. Se o "Geral" estiver arquivado, ele volta: o
-- funil novo nunca nasce escondido.
create or replace function public.fn_escale_origem_sempre_em_grupo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_grupo uuid;
begin
  if new.group_id is not null then
    return new;
  end if;

  insert into public.crm_pipeline_groups (organization_id, name)
    values (new.organization_id, 'Geral')
    on conflict (organization_id, (lower(btrim(name)))) do nothing;

  select g.id into v_grupo
    from public.crm_pipeline_groups g
    where g.organization_id = new.organization_id
      and lower(btrim(g.name)) = 'geral'
    limit 1;

  update public.crm_pipeline_groups
    set is_archived = false
    where id = v_grupo and is_archived;

  new.group_id := v_grupo;
  return new;
end
$fn$;

revoke all on function public.fn_escale_origem_sempre_em_grupo() from public, anon, authenticated;

drop trigger if exists trg_crm_pipelines_sempre_em_grupo on public.crm_pipelines;
create trigger trg_crm_pipelines_sempre_em_grupo
  before insert or update of group_id on public.crm_pipelines
  for each row execute function public.fn_escale_origem_sempre_em_grupo();

-- Backfill pelo MESMO caminho: "pedir nulo" aciona o gatilho, que põe o funil
-- no "Geral". Uma regra só, sem segunda cópia em SQL solto.
update public.crm_pipelines set group_id = null where group_id is null;

-- A FK deixa de soltar funis: com NOT NULL, `set null` viraria erro no meio da
-- exclusão. Sem ação = recusa no fim do comando — o que também deixa excluir a
-- organização inteira, porque funis e grupos saem no mesmo comando.
alter table public.crm_pipelines drop constraint if exists crm_pipelines_group_fk;
alter table public.crm_pipelines
  add constraint crm_pipelines_group_fk
  foreign key (organization_id, group_id)
  references public.crm_pipeline_groups (organization_id, id);

alter table public.crm_pipelines alter column group_id set not null;

comment on column public.crm_pipelines.group_id is
  'Grupo de funis (crm_pipeline_groups) da MESMA organização (FK composta crm_pipelines_group_fk). Nunca nulo: o gatilho trg_crm_pipelines_sempre_em_grupo põe no grupo "Geral" quem chega sem grupo.';

notify pgrst, 'reload schema';
```

- [ ] **Step 5: Pôr o mesmo SQL no baseline, no ponto fixo**

Da raiz do repositório:

```bash
node -e '
const fs = require("fs");
const MIG = "supabase/migrations/20261014150000_9002_toda_origem_tem_grupo.sql";
const BASE = "supabase/baseline.sql";
const ANCORA = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const CAB = "-- ---- FORK ESCALE · toda origem tem grupo (migration 9002) ----";
const base = fs.readFileSync(BASE, "utf8");
if (base.includes(CAB)) throw new Error("o bloco 9002 já está no baseline");
if (!base.includes("-- ---- FORK ESCALE · grupos de funis (migration 9001) ----")) throw new Error("bloco 9001 ausente");
const i = base.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 0323 não encontrada");
const eol = base.includes("\r\n") ? "\r\n" : "\n";
let mig = fs.readFileSync(MIG, "utf8").replace(/\r\n/g, "\n");
if (!mig.endsWith("\n")) mig += "\n";
const bloco = (CAB + "\n" + mig + "\n").replace(/\n/g, eol);
fs.writeFileSync(BASE, base.slice(0, i) + bloco + base.slice(i));
console.log("bloco 9002 inserido antes da linha", base.slice(0, i).split("\n").length);
'
```
Expected: `bloco 9002 inserido antes da linha 325xx` (em torno de 32593).

- [ ] **Step 6: Rodar o teste e os gates do baseline**

```bash
corepack pnpm vitest run tests/unit/escale-toda-origem-tem-grupo-migration.test.ts tests/unit/escale-grupos-de-funis-migration.test.ts tests/unit/baseline-reaplicavel.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/check-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/apendice-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/sonda-do-baseline-ancora-na-ultima-definicao.test.ts tests/unit/baseline-no-piso-do-postgres.test.ts tests/unit/varredura-anon-e-o-ultimo-bloco.test.ts
```
Expected: PASS nos 9 arquivos.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261014150000_9002_toda_origem_tem_grupo.sql supabase/baseline.sql tests/unit/escale-toda-origem-tem-grupo-migration.test.ts docs/superpowers/plans/2026-10-14-fase-1b-origens.md
git commit -m "feat(escale): toda origem tem grupo (migration 9002)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Prova no Postgres

**Files:**
- Create: `tests/invariants/escale-toda-origem-tem-grupo.test.ts`
- Modify: `tests/invariants/escale-grupos-de-funis-rls.test.ts` (reescrito: o último caso da 9001 provava `set null`, que a 9002 trocou por recusa)

**Interfaces:**
- Consumes: schema da Task 1; `seedGov`, `sql`, `lastLine`, `countAs`, `writeCountAs`, `GOV_*` de `tests/invariants/gov-helpers.ts` (`sql` roda `psql -tA`: colunas separadas por `|`).
- Produces: nada (é prova).

- [ ] **Step 1: Escrever a prova da 9002**

Create `tests/invariants/escale-toda-origem-tem-grupo.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { lastLine, seedGov, sql } from "./gov-helpers";

/**
 * TODA ORIGEM TEM GRUPO (fork Escale, migration 9002) — prova contra Postgres
 * real: o gatilho do "Geral", a FK que recusa, o NOT NULL e os CHECKs de cor e
 * ícone. Roda via `pnpm test:db`.
 */
const ORG = "e5ca1e00-9002-4000-8000-000000000001";
const ORG_DESCARTE = "e5ca1e00-9002-4000-8000-000000000099";
const FUNIL_1 = "e5ca1e00-9002-4000-8000-000000000011";
const FUNIL_2 = "e5ca1e00-9002-4000-8000-000000000012";
const GRUPO_COM_FUNIL = "e5ca1e00-9002-4000-8000-000000000021";

const geralDe = (org: string) =>
  `select id from public.crm_pipeline_groups where organization_id = '${org}' and lower(btrim(name)) = 'geral'`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG}', 'escale-geral', 'Escale Geral Org', 'Escale Geral')
      on conflict do nothing;
  `);
});

describe("toda origem tem grupo (migration 9002)", () => {
  it("o funil semeado na organização nova já nasce num grupo", () => {
    expect(sql(`select count(*) from public.crm_pipelines where organization_id = '${ORG}' and group_id is null;`)).toBe("0");
  });

  it("funil criado sem grupo cai no grupo Geral da própria organização", () => {
    const out = sql(`
      insert into public.crm_pipelines (id, organization_id, name, slug)
        values ('${FUNIL_1}', '${ORG}', 'Funil sem grupo 1', 'escale-sem-grupo-1')
        on conflict do nothing;
      select g.name || '|' || (g.organization_id = '${ORG}')::text
        from public.crm_pipelines p join public.crm_pipeline_groups g on g.id = p.group_id
        where p.id = '${FUNIL_1}';
    `);
    expect(lastLine(out)).toBe("Geral|true");
  });

  it("o segundo funil sem grupo reaproveita o mesmo Geral", () => {
    const out = sql(`
      insert into public.crm_pipelines (id, organization_id, name, slug)
        values ('${FUNIL_2}', '${ORG}', 'Funil sem grupo 2', 'escale-sem-grupo-2')
        on conflict do nothing;
      select count(*) from (${geralDe(ORG)}) g;
    `);
    expect(lastLine(out)).toBe("1");
  });

  it("nenhum funil do banco está sem grupo, e a coluna não aceita nulo", () => {
    expect(sql(`select count(*) from public.crm_pipelines where group_id is null;`)).toBe("0");
    expect(
      sql(`select is_nullable from information_schema.columns
             where table_schema = 'public' and table_name = 'crm_pipelines' and column_name = 'group_id';`),
    ).toBe("NO");
  });

  it("pedir group_id nulo devolve o funil ao Geral", () => {
    const out = sql(`
      insert into public.crm_pipeline_groups (id, organization_id, name)
        values ('${GRUPO_COM_FUNIL}', '${ORG}', 'Com funil')
        on conflict do nothing;
      update public.crm_pipelines set group_id = '${GRUPO_COM_FUNIL}' where id = '${FUNIL_1}';
      update public.crm_pipelines set group_id = null where id = '${FUNIL_1}';
      select g.name from public.crm_pipelines p join public.crm_pipeline_groups g on g.id = p.group_id
        where p.id = '${FUNIL_1}';
    `);
    expect(lastLine(out)).toBe("Geral");
  });

  it("o banco recusa excluir grupo que ainda tem funil", () => {
    sql(`update public.crm_pipelines set group_id = '${GRUPO_COM_FUNIL}' where id = '${FUNIL_2}';`);
    expect(() => sql(`delete from public.crm_pipeline_groups where id = '${GRUPO_COM_FUNIL}';`)).toThrow(
      /crm_pipelines_group_fk/,
    );
  });

  it("o Geral arquivado volta a aparecer quando recebe funil", () => {
    const out = sql(`
      update public.crm_pipeline_groups set is_archived = true where id = (${geralDe(ORG)});
      update public.crm_pipelines set group_id = null where id = '${FUNIL_2}';
      select is_archived from public.crm_pipeline_groups where id = (${geralDe(ORG)});
    `);
    expect(lastLine(out)).toBe("f");
  });

  it("cor fora do formato e ícone fora da lista são recusados; tom da paleta passa", () => {
    expect(() => sql(`update public.crm_pipeline_groups set color = 'azul' where id = '${GRUPO_COM_FUNIL}';`)).toThrow(
      /crm_pipeline_groups_cor_valida/,
    );
    expect(() => sql(`update public.crm_pipeline_groups set icon = 'foguete' where id = '${GRUPO_COM_FUNIL}';`)).toThrow(
      /crm_pipeline_groups_icone_valido/,
    );
    expect(
      lastLine(
        sql(`update public.crm_pipeline_groups set color = '#0091ff', icon = 'pessoas' where id = '${GRUPO_COM_FUNIL}';
             select color || '|' || icon from public.crm_pipeline_groups where id = '${GRUPO_COM_FUNIL}';`),
      ),
    ).toBe("#0091ff|pessoas");
  });

  it("a função do gatilho não é executável por anon nem por authenticated", () => {
    expect(
      sql(`select has_function_privilege('anon', 'public.fn_escale_origem_sempre_em_grupo()', 'execute')::text
             || '|' || has_function_privilege('authenticated', 'public.fn_escale_origem_sempre_em_grupo()', 'execute')::text;`),
    ).toBe("false|false");
  });

  it("excluir a organização inteira não esbarra na FK dos grupos", () => {
    sql(`
      insert into public.organizations (id, slug, legal_name, display_name)
        values ('${ORG_DESCARTE}', 'escale-descarte', 'Escale Descarte', 'Descarte')
        on conflict do nothing;
    `);
    expect(sql(`select count(*) from public.crm_pipeline_groups where organization_id = '${ORG_DESCARTE}';`)).toBe("1");
    try {
      sql(`delete from public.organizations where id = '${ORG_DESCARTE}';`);
    } catch (err) {
      // Outra tabela do original pode segurar a exclusão; esta prova só cobra
      // que NÃO seja a FK dos grupos de funis.
      expect(String(err)).not.toMatch(/crm_pipelines_group_fk|crm_pipeline_groups/);
    }
  });
});
```

- [ ] **Step 2: Reescrever a prova da 9001**

Replace the whole content of `tests/invariants/escale-grupos-de-funis-rls.test.ts` with:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_MANAGER,
  GOV_ORG,
  GOV_PIPELINE,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * GRUPOS DE FUNIS (fork Escale, migrations 9001 e 9002) — prova contra Postgres real.
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

  it("excluir grupo que ainda tem funil é recusado (desde a 9002 nenhuma origem fica sem grupo)", () => {
    sql(`
      insert into public.crm_pipelines (id, organization_id, name, slug, group_id)
        values ('${FUNIL_SOLTO}', '${GOV_ORG}', 'Funil solto', 'escale-funil-solto', '${GRUPO_A}')
        on conflict do nothing;
    `);
    expect(() => sql(`delete from public.crm_pipeline_groups where id = '${GRUPO_A}';`)).toThrow(
      /crm_pipelines_group_fk/,
    );
  });
});
```

- [ ] **Step 3: Conferir o Docker**

```bash
docker info --format '{{.ServerVersion}}'
```
Expected: um número de versão. Se der erro, PARE e peça ao usuário para abrir o Docker Desktop.

- [ ] **Step 4: Rodar as provas no Postgres**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm test:db tests/invariants/escale-toda-origem-tem-grupo.test.ts tests/invariants/escale-grupos-de-funis-rls.test.ts tests/invariants/rls-completude-varredura.test.ts tests/invariants/travas-de-suporte-cobrem-toda-tabela-na-instalacao.test.ts tests/invariants/hardening-definer-varredura.test.ts 2>&1 | tail -25
```
Expected: os 5 arquivos PASS e `==> test:db verde` (o script aplica o baseline do zero com `ON_ERROR_STOP=1` e reaplica em modo update). Se o install falhar, corrija a MIGRATION, refaça o bloco do baseline (`git checkout -- supabase/baseline.sql` e o Step 5 da Task 1) e rode de novo.

- [ ] **Step 5: Commit**

```bash
git add tests/invariants/escale-toda-origem-tem-grupo.test.ts tests/invariants/escale-grupos-de-funis-rls.test.ts
git commit -m "test(escale): prova no Postgres de que toda origem tem grupo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Regras puras, preferências do painel e textos em espanhol

**Files:**
- Modify: `lib/escale/origens/regras.ts` (reescrito), `tests/unit/escale-origens-regras.test.ts` (reescrito), `lib/i18n/dicionario.ts` (bloco)
- Create: `lib/escale/origens/preferencias.ts`, `tests/unit/escale-origens-preferencias.test.ts`

**Interfaces:**
- Consumes: `normalizar` de `@/lib/catalogo/busca`; `PALETA_DE_ETIQUETAS` de `@/lib/tags/cor-da-etiqueta`.
- Produces (usados pelas Tasks 4–8):
  - `ICONES_DE_GRUPO: readonly ["iniciais","funil","pessoas","predio","loja","megafone","telefone"]`, `type IconeDeGrupo`, `ROTULO_DO_ICONE: Record<IconeDeGrupo, string>`, `iconeValido(v: unknown): IconeDeGrupo`, `corValida(v: unknown): string | null`
  - `interface GrupoDeFunis { id: string; name: string; color: string | null; icon: IconeDeGrupo; is_archived: boolean }`
  - `interface FunilDaOrigem { id: string; name: string; group_id: string | null; is_archived: boolean; is_default: boolean }`
  - `interface Origens { grupos: GrupoDeFunis[]; funis: FunilDaOrigem[] }`
  - `interface GrupoNaArvore extends GrupoDeFunis { funis: FunilDaOrigem[] }`
  - `interface ArvoreDeOrigens { grupos: GrupoNaArvore[]; semGrupo: FunilDaOrigem[]; gruposArquivados: GrupoNaArvore[]; funisArquivados: FunilDaOrigem[] }`
  - `NOME_DE_GRUPO_MAX = 60`, `type VereditoDeNome`, `validarNomeDeGrupo(bruto, grupos, ignorarId): VereditoDeNome`
  - `montarOrigens(o: Origens): ArvoreDeOrigens`, `filtrarArvore(a: ArvoreDeOrigens, busca: string): ArvoreDeOrigens`
  - `escolherFunilInicial(o: Origens, lembrado: string | null): string | null`
  - `funilDoCaminho(pathname: string): string | null`, `iniciais(nome: string): string`, `corDoGrupo(id: string): string`, `corEfetiva(g: Pick<GrupoDeFunis, "id" | "color">): string`
  - `COOKIE_ULTIMO_FUNIL = "escale_ultimo_funil"`, `COOKIE_PAINEL = "escale_origens_painel"`, `COOKIE_LISTA = "escale_origens_lista"`, `COOKIE_OCULTOS = "escale_origens_ocultos"`, `OCULTOS_MAX = 100`
  - `interface PreferenciasDoPainel { painelAberto: boolean; listaAberta: boolean; ocultos: string[] }`
  - `type PreferenciaDeOrigens = { nome: "painel"; valor: "aberto" | "fechado" } | { nome: "lista"; valor: "aberta" | "fechada" } | { nome: "ocultos"; valor: string[] } | { nome: "ultimo_funil"; valor: string }`
  - `lerUuid(v: string | null | undefined): string | null`, `lerOcultos(v: string | null | undefined): string[]`, `lerPreferenciasDoPainel(ler: (nome: string) => string | undefined): PreferenciasDoPainel`, `cookieDaPreferencia(p: unknown): { cookie: string; valor: string } | null`

- [ ] **Step 1: Reescrever o teste das regras (vai falhar)**

Replace the whole content of `tests/unit/escale-origens-regras.test.ts` with:

```ts
import { describe, expect, it } from "vitest";

import { DICIONARIO } from "@/lib/i18n/dicionario";
import { PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";
import {
  ICONES_DE_GRUPO,
  NOME_DE_GRUPO_MAX,
  ROTULO_DO_ICONE,
  corDoGrupo,
  corEfetiva,
  corValida,
  escolherFunilInicial,
  filtrarArvore,
  funilDoCaminho,
  iconeValido,
  iniciais,
  montarOrigens,
  validarNomeDeGrupo,
  type FunilDaOrigem,
  type GrupoDeFunis,
  type Origens,
} from "@/lib/escale/origens/regras";

const grupo = (id: string, name: string, extra: Partial<GrupoDeFunis> = {}): GrupoDeFunis => ({
  id,
  name,
  color: null,
  icon: "iniciais",
  is_archived: false,
  ...extra,
});
const funil = (id: string, name: string, group_id: string | null, extra: Partial<FunilDaOrigem> = {}): FunilDaOrigem => ({
  id,
  name,
  group_id,
  is_archived: false,
  is_default: false,
  ...extra,
});

const ORIGENS: Origens = {
  grupos: [
    grupo("g-obras", "INSS de obras"),
    grupo("g-cred", "Credenciados"),
    grupo("g-vazio", "Parcerias"),
    grupo("g-velho", "Antigo", { is_archived: true }),
  ],
  funis: [
    funil("f-leads", "Leads INSS WhatsApp", "g-obras"),
    funil("f-nayara", "Funil Nayara", "g-cred", { is_default: true }),
    funil("f-turma", "Turma 12", "g-cred"),
    funil("f-morto", "Funil morto", "g-cred", { is_archived: true }),
    funil("f-velho", "Pós-venda", "g-velho"),
    funil("f-solto", "Sem banco novo", null),
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
  });

  it("recusa nome repetido sem olhar caixa nem acento — inclusive de grupo arquivado — menos o do próprio grupo", () => {
    expect(validarNomeDeGrupo("inss DE óbras", ORIGENS.grupos, null)).toEqual({
      ok: false,
      erro: "Já existe um grupo com esse nome.",
    });
    expect(validarNomeDeGrupo("antigo", ORIGENS.grupos, null).ok).toBe(false);
    expect(validarNomeDeGrupo("INSS de Obras", ORIGENS.grupos, "g-obras")).toEqual({ ok: true, nome: "INSS de Obras" });
  });
});

describe("montarOrigens", () => {
  it("grupos ativos por nome, cada um com as origens vivas dele, inclusive o vazio", () => {
    const arvore = montarOrigens(ORIGENS);
    expect(arvore.grupos.map((g) => g.name)).toEqual(["Credenciados", "INSS de obras", "Parcerias"]);
    expect(arvore.grupos[0]!.funis.map((f) => f.id)).toEqual(["f-nayara", "f-turma"]);
    expect(arvore.grupos[2]!.funis).toEqual([]);
  });

  it("grupo arquivado sai da lista e vai para os arquivados com as origens dele", () => {
    const arvore = montarOrigens(ORIGENS);
    expect(arvore.gruposArquivados.map((g) => [g.name, g.funis.map((f) => f.id)])).toEqual([["Antigo", ["f-velho"]]]);
  });

  it("origem arquivada de grupo ativo vai para os arquivados soltos", () => {
    expect(montarOrigens(ORIGENS).funisArquivados.map((f) => f.id)).toEqual(["f-morto"]);
  });

  it("origem sem grupo (banco ainda sem a 9002) não some: vai para semGrupo", () => {
    expect(montarOrigens(ORIGENS).semGrupo.map((f) => f.id)).toEqual(["f-solto"]);
  });
});

describe("filtrarArvore", () => {
  const arvore = montarOrigens(ORIGENS);

  it("busca vazia devolve a árvore como está", () => {
    expect(filtrarArvore(arvore, "   ")).toBe(arvore);
  });

  it("achar pelo nome do grupo mostra o grupo inteiro; pelo da origem, só ela", () => {
    expect(filtrarArvore(arvore, "obras").grupos.map((g) => g.name)).toEqual(["INSS de obras"]);
    const r = filtrarArvore(arvore, "nayara");
    expect(r.grupos.map((g) => [g.name, g.funis.map((f) => f.id)])).toEqual([["Credenciados", ["f-nayara"]]]);
  });

  it("a busca não mexe nos arquivados", () => {
    expect(filtrarArvore(arvore, "nayara").gruposArquivados).toBe(arvore.gruposArquivados);
  });
});

describe("escolherFunilInicial", () => {
  it("abre o último funil aberto quando ele ainda está vivo e visível", () => {
    expect(escolherFunilInicial(ORIGENS, "f-turma")).toBe("f-turma");
  });

  it("sem lembrança válida, abre o funil padrão", () => {
    expect(escolherFunilInicial(ORIGENS, null)).toBe("f-nayara");
    expect(escolherFunilInicial(ORIGENS, "f-morto")).toBe("f-nayara");
    expect(escolherFunilInicial(ORIGENS, "f-velho")).toBe("f-nayara");
  });

  it("sem padrão visível, abre o primeiro da lista; sem nenhum, null", () => {
    const semPadrao: Origens = { ...ORIGENS, funis: ORIGENS.funis.map((f) => ({ ...f, is_default: false })) };
    expect(escolherFunilInicial(semPadrao, null)).toBe("f-leads");
    expect(escolherFunilInicial({ grupos: [], funis: [] }, null)).toBeNull();
  });
});

describe("funilDoCaminho e iniciais", () => {
  it("lê o funil do endereço do quadro", () => {
    expect(funilDoCaminho("/app/pipelines/abc")).toBe("abc");
    expect(funilDoCaminho("/app/kanban")).toBeNull();
  });

  it("iniciais pulam palavras curtas", () => {
    expect(iniciais("INSS de obras")).toBe("IO");
    expect(iniciais("Credenciados")).toBe("CR");
    expect(iniciais("  ")).toBe("?");
  });
});

describe("cor e ícone do grupo", () => {
  it("a cor automática sai da paleta das etiquetas e é estável", () => {
    for (const id of ["g-1", "g-2", "g-3"]) {
      expect(PALETA_DE_ETIQUETAS).toContain(corDoGrupo(id));
      expect(corDoGrupo(id)).toBe(corDoGrupo(id));
    }
  });

  it("a cor escolhida vence a automática; cor fora da paleta é recusada", () => {
    expect(corEfetiva({ id: "g-1", color: "#0091ff" })).toBe("#0091ff");
    expect(corEfetiva({ id: "g-1", color: null })).toBe(corDoGrupo("g-1"));
    expect(corValida("#0091ff")).toBe("#0091ff");
    expect(corValida("#123456")).toBeNull();
    expect(corValida(42)).toBeNull();
  });

  it("ícone fora da lista vira iniciais, e todo ícone tem rótulo em espanhol", () => {
    expect(iconeValido("pessoas")).toBe("pessoas");
    expect(iconeValido("foguete")).toBe("iniciais");
    const semEspanhol = ICONES_DE_GRUPO.map((i) => ROTULO_DO_ICONE[i]).filter((r) => !DICIONARIO[r]?.es);
    expect(semEspanhol).toEqual([]);
  });
});
```

- [ ] **Step 2: Escrever o teste das preferências (vai falhar)**

Create `tests/unit/escale-origens-preferencias.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  COOKIE_LISTA,
  COOKIE_OCULTOS,
  COOKIE_PAINEL,
  COOKIE_ULTIMO_FUNIL,
  OCULTOS_MAX,
  cookieDaPreferencia,
  lerOcultos,
  lerPreferenciasDoPainel,
  lerUuid,
} from "@/lib/escale/origens/preferencias";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

describe("preferências do painel Origens (cookies)", () => {
  it("lerUuid só aceita uuid", () => {
    expect(lerUuid(A)).toBe(A);
    expect(lerUuid("abc")).toBeNull();
    expect(lerUuid(undefined)).toBeNull();
  });

  it("lerOcultos aceita só uuids, sem repetir e com teto", () => {
    expect(lerOcultos(`${A},lixo,${B},${A}`)).toEqual([A, B]);
    expect(lerOcultos(undefined)).toEqual([]);
    const muitos = Array.from({ length: OCULTOS_MAX + 5 }, (_, i) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`);
    expect(lerOcultos(muitos.join(","))).toHaveLength(OCULTOS_MAX);
  });

  it("sem cookie, painel e lista abertos e nada oculto", () => {
    expect(lerPreferenciasDoPainel(() => undefined)).toEqual({ painelAberto: true, listaAberta: true, ocultos: [] });
  });

  it("lê painel fechado, lista fechada e os ocultos", () => {
    const cookies: Record<string, string> = {
      [COOKIE_PAINEL]: "fechado",
      [COOKIE_LISTA]: "fechada",
      [COOKIE_OCULTOS]: `${A},${B}`,
    };
    expect(lerPreferenciasDoPainel((nome) => cookies[nome])).toEqual({
      painelAberto: false,
      listaAberta: false,
      ocultos: [A, B],
    });
  });

  it("cookieDaPreferencia valida tudo que vem do navegador", () => {
    expect(cookieDaPreferencia({ nome: "painel", valor: "fechado" })).toEqual({ cookie: COOKIE_PAINEL, valor: "fechado" });
    expect(cookieDaPreferencia({ nome: "lista", valor: "aberta" })).toEqual({ cookie: COOKIE_LISTA, valor: "aberta" });
    expect(cookieDaPreferencia({ nome: "ocultos", valor: [A, "lixo", B] })).toEqual({ cookie: COOKIE_OCULTOS, valor: `${A},${B}` });
    expect(cookieDaPreferencia({ nome: "ultimo_funil", valor: A })).toEqual({ cookie: COOKIE_ULTIMO_FUNIL, valor: A });
    expect(cookieDaPreferencia({ nome: "ultimo_funil", valor: "../x" })).toBeNull();
    expect(cookieDaPreferencia({ nome: "painel", valor: "talvez" })).toBeNull();
    expect(cookieDaPreferencia({ nome: "outro", valor: "x" })).toBeNull();
    expect(cookieDaPreferencia("lixo")).toBeNull();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-origens-regras.test.ts tests/unit/escale-origens-preferencias.test.ts
```
Expected: FAIL — exports inexistentes (`corEfetiva`, `escolherFunilInicial`…) e `Failed to resolve import "@/lib/escale/origens/preferencias"`.

- [ ] **Step 4: Reescrever as regras**

Replace the whole content of `lib/escale/origens/regras.ts` with:

```ts
/**
 * ORIGENS (fork Escale, Fases 1A e 1B): os funis da organização arrumados em
 * GRUPOS, como o painel "Origens" da Clint. Regras puras — o painel, as janelas,
 * a entrada de Negócios e as rotas usam as mesmas, para nunca dizerem coisas
 * diferentes.
 *
 * Toda origem tem grupo (migration 9002). `semGrupo` existe só como defesa: num
 * banco que ainda não aplicou a 9002, origem sem grupo continua aparecendo em
 * vez de sumir do painel.
 */
import { normalizar } from "@/lib/catalogo/busca";
import { PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";

/** O mesmo CHECK `crm_pipeline_groups_icone_valido` (migration 9002). */
export const ICONES_DE_GRUPO = ["iniciais", "funil", "pessoas", "predio", "loja", "megafone", "telefone"] as const;
export type IconeDeGrupo = (typeof ICONES_DE_GRUPO)[number];

/** Chave do dicionário de cada ícone: o rótulo do botão na janela Customizar. */
export const ROTULO_DO_ICONE: Record<IconeDeGrupo, string> = {
  iniciais: "Iniciais",
  funil: "Funil",
  pessoas: "Pessoas",
  predio: "Prédio",
  loja: "Loja",
  megafone: "Megafone",
  telefone: "Telefone",
};

export function iconeValido(valor: unknown): IconeDeGrupo {
  return (ICONES_DE_GRUPO as readonly unknown[]).includes(valor) ? (valor as IconeDeGrupo) : "iniciais";
}

/** Só um tom da paleta das etiquetas (a paleta MEDIDA para daltonismo). */
export function corValida(valor: unknown): string | null {
  return typeof valor === "string" && PALETA_DE_ETIQUETAS.includes(valor) ? valor : null;
}

export interface GrupoDeFunis {
  id: string;
  name: string;
  color: string | null;
  icon: IconeDeGrupo;
  is_archived: boolean;
}

export interface FunilDaOrigem {
  id: string;
  name: string;
  group_id: string | null;
  is_archived: boolean;
  is_default: boolean;
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
  /** Grupos ativos, por nome, com as origens vivas de cada um. */
  grupos: GrupoNaArvore[];
  /** Defesa para banco sem a 9002 — com ela, sempre vazio. */
  semGrupo: FunilDaOrigem[];
  /** Grupos arquivados com as origens vivas deles (voltam juntas ao desarquivar). */
  gruposArquivados: GrupoNaArvore[];
  /** Origens arquivadas uma a uma, fora de grupo arquivado. */
  funisArquivados: FunilDaOrigem[];
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
  // seriam dois grupos indistinguíveis no painel. Arquivado conta: o índice não
  // é parcial, e desarquivar não pode esbarrar num nome repetido.
  const procurado = chave(nome);
  if (grupos.some((g) => g.id !== ignorarId && chave(g.name) === procurado)) {
    return { ok: false, erro: "Já existe um grupo com esse nome." };
  }
  return { ok: true, nome };
}

export function montarOrigens({ grupos, funis }: Origens): ArvoreDeOrigens {
  const porNome = [...grupos].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  const vivos = funis.filter((f) => !f.is_archived);
  const comFunis = (g: GrupoDeFunis): GrupoNaArvore => ({ ...g, funis: vivos.filter((f) => f.group_id === g.id) });
  const existentes = new Set(grupos.map((g) => g.id));
  const arquivados = new Set(grupos.filter((g) => g.is_archived).map((g) => g.id));
  return {
    grupos: porNome.filter((g) => !g.is_archived).map(comFunis),
    semGrupo: vivos.filter((f) => f.group_id === null || !existentes.has(f.group_id)),
    gruposArquivados: porNome.filter((g) => g.is_archived).map(comFunis),
    funisArquivados: funis.filter((f) => f.is_archived && !(f.group_id !== null && arquivados.has(f.group_id))),
  };
}

/**
 * Busca da lupa: o grupo cujo nome casa aparece inteiro; senão, só com as
 * origens que casam. Sem acento, sem caixa, sem pontuação. Os arquivados não
 * entram na busca — ficam como estão.
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
  return { ...arvore, grupos, semGrupo: arvore.semGrupo.filter((f) => casa(f.name)) };
}

/**
 * O funil que o "Negócios" do menu do topo abre: o último aberto (cookie),
 * se ainda está vivo e visível; senão o padrão da organização; senão o
 * primeiro da lista (as origens vêm na `position`). `null` = nenhum funil
 * visível, e a entrada cai na lista de funis.
 */
export function escolherFunilInicial(origens: Origens, lembrado: string | null): string | null {
  const ativos = new Set(origens.grupos.filter((g) => !g.is_archived).map((g) => g.id));
  const candidatos = origens.funis.filter(
    (f) => !f.is_archived && (f.group_id === null || ativos.has(f.group_id)),
  );
  return (
    candidatos.find((f) => f.id === lembrado)?.id ??
    candidatos.find((f) => f.is_default)?.id ??
    candidatos[0]?.id ??
    null
  );
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

/** Cor automática: um tom da paleta escolhido pelo id, estável sem coluna. */
export function corDoGrupo(id: string): string {
  let soma = 0;
  for (const letra of id) soma = (soma + letra.charCodeAt(0)) % 9973;
  return PALETA_DE_ETIQUETAS[soma % PALETA_DE_ETIQUETAS.length]!;
}

/** A cor que o ícone mostra: a escolhida em Customizar, ou a automática. */
export function corEfetiva(grupo: Pick<GrupoDeFunis, "id" | "color">): string {
  return corValida(grupo.color) ?? corDoGrupo(grupo.id);
}
```

- [ ] **Step 5: As preferências**

Create `lib/escale/origens/preferencias.ts`:

```ts
/**
 * PREFERÊNCIAS DO PAINEL ORIGENS (fork Escale, Fase 1B), por pessoa e por
 * navegador: painel recolhido, lista recolhida, grupos ocultos e o último funil
 * aberto (que o "Negócios" do menu do topo abre).
 *
 * Moram em cookies httpOnly, como "recolher a barra lateral"
 * (`app/actions/shell/toggleSidebar.ts`): o servidor lê e manda como prop — o
 * primeiro render já sai certo, sem `useState` lendo o navegador (ver
 * `tests/unit/hidratacao-useState-nao-le-o-navegador.test.ts`). Quem grava é a
 * Server Action `app/actions/escale/origens.ts`, que passa TUDO por
 * `cookieDaPreferencia` antes.
 */
export const COOKIE_ULTIMO_FUNIL = "escale_ultimo_funil";
export const COOKIE_PAINEL = "escale_origens_painel";
export const COOKIE_LISTA = "escale_origens_lista";
export const COOKIE_OCULTOS = "escale_origens_ocultos";

/** Teto de grupos ocultos guardados: o cookie não cresce sem limite. */
export const OCULTOS_MAX = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PreferenciasDoPainel {
  painelAberto: boolean;
  listaAberta: boolean;
  ocultos: string[];
}

export type PreferenciaDeOrigens =
  | { nome: "painel"; valor: "aberto" | "fechado" }
  | { nome: "lista"; valor: "aberta" | "fechada" }
  | { nome: "ocultos"; valor: string[] }
  | { nome: "ultimo_funil"; valor: string };

export function lerUuid(valor: string | null | undefined): string | null {
  return typeof valor === "string" && UUID.test(valor) ? valor : null;
}

function soUuids(lista: readonly unknown[]): string[] {
  const vistos = new Set<string>();
  for (const item of lista) {
    if (typeof item === "string" && UUID.test(item)) vistos.add(item);
    if (vistos.size === OCULTOS_MAX) break;
  }
  return [...vistos];
}

export function lerOcultos(valor: string | null | undefined): string[] {
  return valor ? soUuids(valor.split(",")) : [];
}

export function lerPreferenciasDoPainel(ler: (nome: string) => string | undefined): PreferenciasDoPainel {
  return {
    painelAberto: ler(COOKIE_PAINEL) !== "fechado",
    listaAberta: ler(COOKIE_LISTA) !== "fechada",
    ocultos: lerOcultos(ler(COOKIE_OCULTOS)),
  };
}

/** Valida o pedido que veio do navegador e diz qual cookie gravar, ou `null`. */
export function cookieDaPreferencia(pedido: unknown): { cookie: string; valor: string } | null {
  if (typeof pedido !== "object" || pedido === null) return null;
  const { nome, valor } = pedido as { nome?: unknown; valor?: unknown };
  if (nome === "painel" && (valor === "aberto" || valor === "fechado")) return { cookie: COOKIE_PAINEL, valor };
  if (nome === "lista" && (valor === "aberta" || valor === "fechada")) return { cookie: COOKIE_LISTA, valor };
  if (nome === "ocultos" && Array.isArray(valor)) return { cookie: COOKIE_OCULTOS, valor: soUuids(valor).join(",") };
  if (nome === "ultimo_funil") {
    const id = lerUuid(typeof valor === "string" ? valor : null);
    return id ? { cookie: COOKIE_ULTIMO_FUNIL, valor: id } : null;
  }
  return null;
}
```

- [ ] **Step 6: Os textos novos no dicionário**

Confira que nenhuma destas chaves existe (chave repetida quebra o typecheck):

```bash
while IFS= read -r k; do
  n=$(grep -cF "\"$k\":" lib/i18n/dicionario.ts)
  printf '%s\t%s\n' "$n" "$k"
done <<'EOF'
Escolha uma cor da paleta.
Este é o único grupo ativo. Crie outro grupo antes de arquivar este.
Escolha para qual grupo as origens deste grupo vão.
Adicionar origem
Adicionar grupo de origens
Recolher o painel de origens
Abrir o painel de origens
Recolher a lista de origens
Abrir a lista de origens
Mais ações de
Nova origem em
Selecionar origens
Selecionar origem
Em breve
Customizar
Ocultar da minha barra lateral
Mostrar na minha barra lateral
oculto
{n} grupo oculto
{n} grupos ocultos
Mostrar
Esconder
Arquivados
{n} origem
{n} origens
Nome da nova origem
Enter cria · Esc cancela
Nome da origem
Criar origem
Toda origem fica num grupo. Ela nasce com as etapas padrão e já abre no quadro.
Crie um grupo antes, pelo + ao lado da lupa.
O grupo nasce vazio. Use o + dele para criar origens dentro.
Configurações do grupo
Configurações da origem
Ícone
Prévia
Cor automática
Iniciais
Prédio
Megafone
Arquivar «{nome}»?
O grupo e as {n} origens dele saem do painel e vão para Arquivados. Nada é apagado, as origens continuam recebendo negócios e Desarquivar traz tudo de volta.
Excluir «{nome}»?
O grupo está vazio. Nenhuma origem e nenhum negócio é apagado.
Toda origem precisa de um grupo. Escolha para onde vão as {n} origens deste grupo. Nenhum negócio é apagado.
Mover as origens para
Mover e excluir grupo
Excluir grupo
«{nome}» é o único grupo
Toda origem precisa de um grupo. Crie outro grupo antes, pelo + ao lado da lupa, para as origens irem para lá.
Esta é a origem padrão da organização.
Tornar esta a origem padrão
Abre para quem ainda não abriu nenhuma origem.
As etapas continuam sendo editadas no próprio quadro.
A origem sai do painel e vai para Arquivados com os negócios dela. Desarquivar traz de volta.
Excluir «{nome}» de vez?
A origem e as etapas dela são apagadas, e isso não se desfaz. Origem com negócios não é excluída: aí o caminho é arquivar.
A origem foi criada, mas não apareceu na lista. Recarregue a página.
EOF
```
Expected: `0` em todas as linhas. Se alguma der `1` (ou mais), NÃO acrescente essa linha abaixo. Já existem e serão reusadas: `Adicionar`, `Configurações`, `Arquivar`, `Excluir`, `Desarquivar`, `Cor`, `Grupo`, `Cancelar`, `Salvar`, `Abrir`, `Fechar`, `Entendi`, `Pessoas`, `Funil`, `Loja`, `Telefone`, `Excluir de vez`, `Criar grupo`, `Nome do grupo`, `Nome do novo grupo`, `Sem grupo`, `Origens`, `Buscar grupo ou funil`, `Funis por grupo`, `Nada encontrado.`, `Nenhum funil neste grupo.`, `Grupo não encontrado.`, `Funil não encontrado.`, `Corpo não é JSON válido.`, `Não consegui completar essa ação. Tente de novo.`, `Dê um nome ao grupo.`, `Já existe um grupo com esse nome.`, `O nome do grupo pode ter até 60 caracteres.`, `Escolha um grupo válido para o funil.`.

Em `lib/i18n/dicionario.ts`, troque a linha:

```ts
  "Escolha um grupo válido para o funil.": { es: "Elija un grupo válido para el embudo." },
```

por:

```ts
  "Escolha um grupo válido para o funil.": { es: "Elija un grupo válido para el embudo." },
  // ─── FORK ESCALE · origens (Fase 1B: +, ⋮, arquivar, toda origem tem grupo) ───
  "Escolha uma cor da paleta.": { es: "Elija un color de la paleta." },
  "Este é o único grupo ativo. Crie outro grupo antes de arquivar este.": {
    es: "Este es el único grupo activo. Cree otro grupo antes de archivar este.",
  },
  "Escolha para qual grupo as origens deste grupo vão.": { es: "Elija a qué grupo van los orígenes de este grupo." },
  "Adicionar origem": { es: "Agregar origen" },
  "Adicionar grupo de origens": { es: "Agregar grupo de orígenes" },
  "Recolher o painel de origens": { es: "Contraer el panel de orígenes" },
  "Abrir o painel de origens": { es: "Abrir el panel de orígenes" },
  "Recolher a lista de origens": { es: "Contraer la lista de orígenes" },
  "Abrir a lista de origens": { es: "Abrir la lista de orígenes" },
  "Mais ações de": { es: "Más acciones de" },
  "Nova origem em": { es: "Nuevo origen en" },
  "Selecionar origens": { es: "Seleccionar orígenes" },
  "Selecionar origem": { es: "Seleccionar origen" },
  "Em breve": { es: "Próximamente" },
  "Customizar": { es: "Personalizar" },
  "Ocultar da minha barra lateral": { es: "Ocultar de mi barra lateral" },
  "Mostrar na minha barra lateral": { es: "Mostrar en mi barra lateral" },
  "oculto": { es: "oculto" },
  "{n} grupo oculto": { es: "{n} grupo oculto" },
  "{n} grupos ocultos": { es: "{n} grupos ocultos" },
  "Mostrar": { es: "Mostrar" },
  "Esconder": { es: "Ocultar" },
  "Arquivados": { es: "Archivados" },
  "{n} origem": { es: "{n} origen" },
  "{n} origens": { es: "{n} orígenes" },
  "Nome da nova origem": { es: "Nombre del nuevo origen" },
  "Enter cria · Esc cancela": { es: "Enter crea · Esc cancela" },
  "Nome da origem": { es: "Nombre del origen" },
  "Criar origem": { es: "Crear origen" },
  "Toda origem fica num grupo. Ela nasce com as etapas padrão e já abre no quadro.": {
    es: "Todo origen queda en un grupo. Nace con las etapas estándar y se abre en el tablero.",
  },
  "Crie um grupo antes, pelo + ao lado da lupa.": { es: "Cree un grupo antes, con el + junto a la lupa." },
  "O grupo nasce vazio. Use o + dele para criar origens dentro.": {
    es: "El grupo nace vacío. Use su + para crear orígenes dentro.",
  },
  "Configurações do grupo": { es: "Configuración del grupo" },
  "Configurações da origem": { es: "Configuración del origen" },
  "Ícone": { es: "Ícono" },
  "Prévia": { es: "Vista previa" },
  "Cor automática": { es: "Color automático" },
  "Iniciais": { es: "Iniciales" },
  "Prédio": { es: "Edificio" },
  "Megafone": { es: "Megáfono" },
  "Arquivar «{nome}»?": { es: "¿Archivar «{nome}»?" },
  "O grupo e as {n} origens dele saem do painel e vão para Arquivados. Nada é apagado, as origens continuam recebendo negócios e Desarquivar traz tudo de volta.": {
    es: "El grupo y sus {n} orígenes salen del panel y van a Archivados. No se borra nada, los orígenes siguen recibiendo negocios y Desarchivar devuelve todo.",
  },
  "Excluir «{nome}»?": { es: "¿Eliminar «{nome}»?" },
  "O grupo está vazio. Nenhuma origem e nenhum negócio é apagado.": {
    es: "El grupo está vacío. No se borra ningún origen ni ningún negocio.",
  },
  "Toda origem precisa de um grupo. Escolha para onde vão as {n} origens deste grupo. Nenhum negócio é apagado.": {
    es: "Todo origen necesita un grupo. Elija a dónde van los {n} orígenes de este grupo. No se borra ningún negocio.",
  },
  "Mover as origens para": { es: "Mover los orígenes a" },
  "Mover e excluir grupo": { es: "Mover y eliminar grupo" },
  "Excluir grupo": { es: "Eliminar grupo" },
  "«{nome}» é o único grupo": { es: "«{nome}» es el único grupo" },
  "Toda origem precisa de um grupo. Crie outro grupo antes, pelo + ao lado da lupa, para as origens irem para lá.": {
    es: "Todo origen necesita un grupo. Cree otro grupo antes, con el + junto a la lupa, para que los orígenes vayan allí.",
  },
  "Esta é a origem padrão da organização.": { es: "Este es el origen predeterminado de la organización." },
  "Tornar esta a origem padrão": { es: "Hacer de este el origen predeterminado" },
  "Abre para quem ainda não abriu nenhuma origem.": { es: "Se abre para quien aún no abrió ningún origen." },
  "As etapas continuam sendo editadas no próprio quadro.": { es: "Las etapas se siguen editando en el propio tablero." },
  "A origem sai do painel e vai para Arquivados com os negócios dela. Desarquivar traz de volta.": {
    es: "El origen sale del panel y va a Archivados con sus negocios. Desarchivar lo devuelve.",
  },
  "Excluir «{nome}» de vez?": { es: "¿Eliminar «{nome}» definitivamente?" },
  "A origem e as etapas dela são apagadas, e isso não se desfaz. Origem com negócios não é excluída: aí o caminho é arquivar.": {
    es: "El origen y sus etapas se borran, y no se puede deshacer. Un origen con negocios no se elimina: en ese caso, archívelo.",
  },
  "A origem foi criada, mas não apareceu na lista. Recarregue a página.": {
    es: "El origen se creó, pero no apareció en la lista. Recargue la página.",
  },
```

- [ ] **Step 7: Rodar e ver passar**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm vitest run tests/unit/escale-origens-regras.test.ts tests/unit/escale-origens-preferencias.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```
Expected: PASS nos 3 arquivos. (O typecheck ainda falha nos consumidores antigos — `ler-origens.ts`, `PainelOrigens.tsx`, `OrganizarOrigens.tsx` — e é consertado nas Tasks 4 e 7; não rode `typecheck` aqui.)

- [ ] **Step 8: Commit**

```bash
git add lib/escale/origens/regras.ts lib/escale/origens/preferencias.ts lib/i18n/dicionario.ts tests/unit/escale-origens-regras.test.ts tests/unit/escale-origens-preferencias.test.ts
git commit -m "feat(escale): regras 1B das origens, preferências do painel e textos em espanhol

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Leitura e rotas do fork

**Files:**
- Modify: `lib/escale/origens/ler-origens.ts` (reescrito), `app/api/v1/pipeline-groups/route.ts` (+ GET), `app/api/v1/pipeline-groups/[id]/route.ts` (reescrito), `app/api/v1/pipelines/[id]/grupo/route.ts` (reescrito), `lib/audit/actions.ts` (bloco), `tests/unit/escale-grupos-de-funis-rotas.test.ts` (reescrito)

**Interfaces:**
- Consumes: Task 3 (`Origens`, `validarNomeDeGrupo`, `ICONES_DE_GRUPO`, `iconeValido`, `corValida`); `lerJson`, `nomeRepetido`, `origensOuFalha`, `responderComOrigens` de `@/lib/escale/origens/respostas` (sem mudança); `PALETA_DE_ETIQUETAS`.
- Produces (Tasks 6–8):
  - `lerOrigens(supabase, orgId): Promise<Origens>` — grupos com `color/icon/is_archived`, TODOS os funis (inclusive arquivados) com `is_archived/is_default`, na `position`.
  - `GET /api/v1/pipeline-groups` → `200 { data: Origens }` (qualquer papel).
  - `PATCH /api/v1/pipeline-groups/:id` corpo parcial `{ name?, color?: string|null, icon?, is_archived? }` → `200 { data: Origens }`; 422 nome/cor inválidos ou arquivar o único grupo ativo.
  - `DELETE /api/v1/pipeline-groups/:id[?destino=<uuid>]` → `200 { data: Origens }`; grupo com origens exige `destino` (grupo ativo da organização, ≠ id), senão 422.
  - `PUT /api/v1/pipelines/:id/grupo` corpo `{ group_id: uuid }` (sem nulo; grupo arquivado = 404).

- [ ] **Step 1: Reescrever o teste das rotas (vai falhar)**

Replace the whole content of `tests/unit/escale-grupos-de-funis-rotas.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import type { Origens } from "@/lib/escale/origens/regras";
import { GET, POST } from "@/app/api/v1/pipeline-groups/route";
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
const G_VAZIO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4";
const G_ARQ = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5";
const G_VIZINHO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";
const F_LEADS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const F_NAYARA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

const grupoRow = (id: string, name: string, org = ORG_ID, extra: Record<string, unknown> = {}) => ({
  id,
  organization_id: org,
  name,
  color: null,
  icon: "iniciais",
  is_archived: false,
  ...extra,
});

/** Quatro grupos da organização (um vazio, um arquivado), um do vizinho, e dois funis. */
function banco(writeError?: DbOpts["writeError"]) {
  const db = makeDb({
    pipelines: [
      { id: F_LEADS, name: "Leads INSS WhatsApp", organization_id: ORG_ID, is_archived: false, is_default: true, position: 1000, group_id: G_OBRAS },
      { id: F_NAYARA, name: "Funil Nayara", organization_id: ORG_ID, is_archived: false, is_default: false, position: 2000, group_id: G_CRED },
    ] as unknown as PipelineRow[],
    writeError,
  });
  (db.tabelas as unknown as Record<string, unknown[]>).crm_pipeline_groups = [
    grupoRow(G_OBRAS, "INSS de obras"),
    grupoRow(G_CRED, "Credenciados"),
    grupoRow(G_VAZIO, "Parcerias"),
    grupoRow(G_ARQ, "Antigo", ORG_ID, { is_archived: true }),
    grupoRow(G_VIZINHO, "Grupo do vizinho", OUTRA_ORG),
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
const mudar = (id: string, body: unknown) => PATCH(pedido(`/api/v1/pipeline-groups/${id}`, "PATCH", body), ctx(id));
const excluir = (id: string, destino?: string) =>
  DELETE(pedido(`/api/v1/pipeline-groups/${id}${destino ? `?destino=${destino}` : ""}`, "DELETE"), ctx(id));
const mover = (id: string, body: unknown) => PUT(pedido(`/api/v1/pipelines/${id}/grupo`, "PUT", body), ctx(id));
const origensDe = async (res: Response) => ((await res.json()) as { data: Origens }).data;
const escritasEm = (db: ReturnType<typeof banco>, tabela: string) => db.escritas.filter((e) => e.table === tabela);

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  authOk();
});

describe("GET /api/v1/pipeline-groups", () => {
  it("devolve grupos (com cor, ícone e arquivado) e todos os funis da organização, sem os do vizinho", async () => {
    banco();
    const res = await GET();
    expect(res.status).toBe(200);
    const origens = await origensDe(res);
    expect(origens.grupos.map((g) => g.id)).not.toContain(G_VIZINHO);
    expect(origens.grupos.find((g) => g.id === G_ARQ)).toMatchObject({ is_archived: true, icon: "iniciais", color: null });
    expect(origens.funis.find((f) => f.id === F_LEADS)).toMatchObject({ group_id: G_OBRAS, is_default: true, is_archived: false });
    expect(vi.mocked(requireRole).mock.calls[0]![0]).toBe("viewer");
  });
});

describe("POST /api/v1/pipeline-groups", () => {
  it("cria o grupo na organização da sessão e devolve as origens relidas", async () => {
    const db = banco();
    const res = await criar({ name: "  Novos  " });
    expect(res.status).toBe(201);
    expect(escritasEm(db, "crm_pipeline_groups")[0]).toMatchObject({
      tipo: "insert",
      patch: { organization_id: ORG_ID, name: "Novos" },
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_group.created" }));
  });

  it("nome repetido (sem caixa nem acento, inclusive de arquivado) é 422 e nada é gravado", async () => {
    const db = banco();
    expect((await criar({ name: "antigo" })).status).toBe(422);
    expect(db.escritas).toEqual([]);
  });

  it("corpo que não é JSON é 400; índice único vencendo a corrida é 409", async () => {
    banco();
    expect((await criar("{quebrado")).status).toBe(400);
    banco((_n, tabela) => (tabela === "crm_pipeline_groups" ? { code: "23505", message: "duplicate key" } : null));
    expect((await criar({ name: "Novos" })).status).toBe(409);
  });

  it("quem não é gerente para no requireRole; o suporte somente leitura para antes", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await criar({ name: "Novos" })).status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(new Response(null, { status: 423 }) as never);
    expect((await criar({ name: "Novos" })).status).toBe(423);
  });
});

describe("PATCH /api/v1/pipeline-groups/:id", () => {
  it("renomeia filtrando por id e organização", async () => {
    const db = banco();
    expect((await mudar(G_OBRAS, { name: "INSS Obras 2026" })).status).toBe(200);
    const escrita = escritasEm(db, "crm_pipeline_groups")[0]!;
    expect(escrita.patch).toEqual({ name: "INSS Obras 2026" });
    expect(escrita.filtros).toEqual(expect.arrayContaining([["id", G_OBRAS], ["organization_id", ORG_ID]]));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_group.updated" }));
  });

  it("customiza cor da paleta e ícone; cor fora da paleta é 422", async () => {
    const db = banco();
    expect((await mudar(G_OBRAS, { color: "#0091ff", icon: "pessoas" })).status).toBe(200);
    expect(escritasEm(db, "crm_pipeline_groups")[0]!.patch).toEqual({ color: "#0091ff", icon: "pessoas" });
    expect((await mudar(G_OBRAS, { color: "#123456" })).status).toBe(422);
    expect((await mudar(G_OBRAS, { icon: "foguete" })).status).toBe(422);
  });

  it("volta para a cor automática com color: null", async () => {
    const db = banco();
    expect((await mudar(G_OBRAS, { color: null })).status).toBe(200);
    expect(escritasEm(db, "crm_pipeline_groups")[0]!.patch).toEqual({ color: null });
  });

  it("arquiva e desarquiva, com o código de auditoria de cada um", async () => {
    banco();
    expect((await mudar(G_CRED, { is_archived: true })).status).toBe(200);
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ action: "pipeline_group.archived" }));
    expect((await mudar(G_ARQ, { is_archived: false })).status).toBe(200);
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ action: "pipeline_group.unarchived" }));
  });

  it("não arquiva o único grupo ativo", async () => {
    const db = banco();
    (db.tabelas as unknown as Record<string, unknown[]>).crm_pipeline_groups = [grupoRow(G_OBRAS, "INSS de obras")];
    expect((await mudar(G_OBRAS, { is_archived: true })).status).toBe(422);
    expect(db.escritas).toEqual([]);
  });

  it("corpo vazio é 422; grupo do vizinho é 404 e nada é gravado", async () => {
    const db = banco();
    expect((await mudar(G_OBRAS, {})).status).toBe(422);
    expect((await mudar(G_VIZINHO, { name: "Meu agora" })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});

describe("DELETE /api/v1/pipeline-groups/:id", () => {
  it("grupo vazio sai direto, filtrando por id e organização", async () => {
    const db = banco();
    expect((await excluir(G_VAZIO)).status).toBe(200);
    expect(escritasEm(db, "crm_pipelines")).toEqual([]);
    const apagou = escritasEm(db, "crm_pipeline_groups")[0]!;
    expect(apagou.tipo).toBe("delete");
    expect(apagou.filtros).toEqual(expect.arrayContaining([["id", G_VAZIO], ["organization_id", ORG_ID]]));
  });

  it("grupo com origens sem destino é 422 e nada é gravado", async () => {
    const db = banco();
    expect((await excluir(G_OBRAS)).status).toBe(422);
    expect(db.escritas).toEqual([]);
  });

  it("com destino, move as origens primeiro e só depois exclui", async () => {
    const db = banco();
    const res = await excluir(G_OBRAS, G_CRED);
    expect(res.status).toBe(200);
    expect(db.escritas.map((e) => `${e.tipo}:${e.table}`)).toEqual(["update:crm_pipelines", "delete:crm_pipeline_groups"]);
    expect(db.escritas[0]!.patch).toEqual({ group_id: G_CRED });
    expect(db.escritas[0]!.filtros).toEqual(expect.arrayContaining([["organization_id", ORG_ID], ["group_id", G_OBRAS]]));
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline_group.deleted", metadata: { name: "INSS de obras", funis: 1, destino: G_CRED } }),
    );
    expect((await origensDe(res)).funis.find((f) => f.id === F_LEADS)?.group_id).toBe(G_CRED);
  });

  it("destino arquivado, do vizinho ou o próprio grupo é 422", async () => {
    const db = banco();
    for (const destino of [G_ARQ, G_VIZINHO, G_OBRAS]) {
      expect((await excluir(G_OBRAS, destino)).status).toBe(422);
    }
    expect(db.escritas).toEqual([]);
  });

  it("grupo do vizinho é 404", async () => {
    banco();
    expect((await excluir(G_VIZINHO)).status).toBe(404);
  });
});

describe("PUT /api/v1/pipelines/:id/grupo", () => {
  it("põe o funil no grupo, filtrando por funil e organização", async () => {
    const db = banco();
    expect((await mover(F_NAYARA, { group_id: G_OBRAS })).status).toBe(200);
    const escrita = escritasEm(db, "crm_pipelines")[0]!;
    expect(escrita.patch).toEqual({ group_id: G_OBRAS });
    expect(escrita.filtros).toEqual(expect.arrayContaining([["id", F_NAYARA], ["organization_id", ORG_ID]]));
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline.group_changed", metadata: { de: G_CRED, para: G_OBRAS } }),
    );
  });

  it("group_id nulo ou que não é uuid é 422 — toda origem tem grupo", async () => {
    banco();
    expect((await mover(F_LEADS, { group_id: null })).status).toBe(422);
    expect((await mover(F_LEADS, { group_id: "obras" })).status).toBe(422);
  });

  it("grupo arquivado ou do vizinho é 404 e o funil não muda", async () => {
    const db = banco();
    expect((await mover(F_NAYARA, { group_id: G_ARQ })).status).toBe(404);
    expect((await mover(F_NAYARA, { group_id: G_VIZINHO })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });

  it("funil fora da organização é 404; pedir o grupo atual não grava nem audita", async () => {
    const db = banco();
    expect((await mover("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9", { group_id: G_CRED })).status).toBe(404);
    expect((await mover(F_LEADS, { group_id: G_OBRAS })).status).toBe(200);
    expect(db.escritas).toEqual([]);
    expect(audit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-grupos-de-funis-rotas.test.ts
```
Expected: FAIL — `GET` não é exportado por `@/app/api/v1/pipeline-groups/route` (e vários casos 1B falham).

- [ ] **Step 3: A leitura**

Replace the whole content of `lib/escale/origens/ler-origens.ts` with:

```ts
/**
 * Lê os GRUPOS e TODOS os funis da organização (fork Escale, Fases 1A e 1B).
 *
 * Arquivados entram: o painel mostra a seção Arquivados, e as rotas precisam
 * enxergar a origem arquivada para movê-la junto quando o grupo é excluído.
 *
 * O filtro de `organization_id` não é redundante com a RLS — é o mesmo cuidado
 * de `app/app/kanban/page.tsx`: a policy libera TODAS as organizações do usuário.
 *
 * LANÇA no erro do banco — quem chama decide: a rota responde 500; o painel some
 * e o quadro abre sem ele (`ComOrigens`); a entrada de Negócios cai na lista.
 */
import type { createClient } from "@/lib/supabase/server";

import { corValida, iconeValido, type FunilDaOrigem, type GrupoDeFunis, type Origens } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface LinhaDeGrupo {
  id: string;
  name: string;
  color?: unknown;
  icon?: unknown;
  is_archived?: boolean | null;
}

interface LinhaDeFunil {
  id: string;
  name: string;
  group_id?: string | null;
  is_archived?: boolean | null;
  is_default?: boolean | null;
}

const paraGrupo = (g: LinhaDeGrupo): GrupoDeFunis => ({
  id: g.id,
  name: g.name,
  color: corValida(g.color),
  icon: iconeValido(g.icon),
  is_archived: g.is_archived === true,
});

const paraFunil = (f: LinhaDeFunil): FunilDaOrigem => ({
  id: f.id,
  name: f.name,
  group_id: f.group_id ?? null,
  is_archived: f.is_archived === true,
  is_default: f.is_default === true,
});

export async function lerOrigens(supabase: Supabase, orgId: string): Promise<Origens> {
  const [grupos, funis] = await Promise.all([
    supabase
      .from("crm_pipeline_groups")
      .select("id, name, color, icon, is_archived")
      .eq("organization_id", orgId)
      .order("name"),
    supabase
      .from("crm_pipelines")
      .select("id, name, group_id, is_archived, is_default")
      .eq("organization_id", orgId)
      .order("position"),
  ]);
  if (grupos.error) throw new Error(grupos.error.message);
  if (funis.error) throw new Error(funis.error.message);
  return {
    grupos: ((grupos.data ?? []) as LinhaDeGrupo[]).map(paraGrupo),
    funis: ((funis.data ?? []) as LinhaDeFunil[]).map(paraFunil),
  };
}
```

- [ ] **Step 4: Os códigos de auditoria**

Em `lib/audit/actions.ts`, troque a linha:

```ts
  "pipeline.group_changed",
```

por:

```ts
  "pipeline.group_changed",
  // FORK ESCALE · Fase 1B: customizar, arquivar e desarquivar grupo.
  "pipeline_group.updated",
  "pipeline_group.archived",
  "pipeline_group.unarchived",
```

- [ ] **Step 5: GET de grupos**

Em `app/api/v1/pipeline-groups/route.ts`, troque a linha:

```ts
const corpoSchema = z.object({ name: z.string().max(200) }).strict();
```

por:

```ts
const corpoSchema = z.object({ name: z.string().max(200) }).strict();

/**
 * GET — as origens inteiras da organização da sessão. Qualquer papel: ver o
 * painel é de todos; só escrever é de gerente. As janelas usam isto para reler
 * depois de uma escrita feita por uma rota do original (`/api/v1/pipelines…`).
 */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_pipeline_groups" });
  if (!authz.ok) return authz.response;
  return responderComOrigens(await createClient(), authz.org.orgId, requestId);
}
```

E no comentário do topo do mesmo arquivo, troque `POST /api/v1/pipeline-groups — cria um GRUPO DE FUNIS (fork Escale, Fase 1A).` por `GET/POST /api/v1/pipeline-groups — lê as origens / cria um GRUPO DE FUNIS (fork Escale, Fases 1A e 1B).`

- [ ] **Step 6: PATCH e DELETE do grupo**

Replace the whole content of `app/api/v1/pipeline-groups/[id]/route.ts` with:

```ts
/**
 * PATCH/DELETE /api/v1/pipeline-groups/[id] — mudar e excluir um GRUPO DE
 * FUNIS (fork Escale, Fases 1A e 1B).
 *
 * PATCH é parcial: nome, cor (tom da paleta ou `null` = automática), ícone e
 * arquivado. Arquivar NÃO arquiva cada funil: o grupo some do painel com as
 * origens, que continuam recebendo negócio.
 *
 * DELETE: toda origem tem grupo (migration 9002), e a FK recusa excluir grupo
 * com funil. Grupo com origens exige `?destino=<grupo ativo>`: a rota move
 * TODAS (inclusive as arquivadas) e só depois exclui. Grupo de outra
 * organização morre no 404 antes de qualquer escrita.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { ICONES_DE_GRUPO, corValida, validarNomeDeGrupo } from "@/lib/escale/origens/regras";
import { lerJson, nomeRepetido, origensOuFalha, responderComOrigens } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const corpoSchema = z
  .object({
    name: z.string().max(200).optional(),
    color: z.string().max(7).nullable().optional(),
    icon: z.enum(ICONES_DE_GRUPO).optional(),
    is_archived: z.boolean().optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0);

const destinoSchema = z.string().uuid();

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
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const pedido = parsed.data;

  const supabase = await createClient();
  const antes = await origensOuFalha(supabase, orgId, requestId);
  if (!antes.ok) return antes.resposta;

  const grupo = antes.origens.grupos.find((g) => g.id === id);
  if (!grupo) return fail("not_found", t("Grupo não encontrado."), 404, { requestId });

  const patch: Record<string, unknown> = {};
  if (pedido.name !== undefined) {
    const veredito = validarNomeDeGrupo(pedido.name, antes.origens.grupos, id);
    if (!veredito.ok) return fail("unprocessable_entity", t(veredito.erro), 422, { requestId });
    patch.name = veredito.nome;
  }
  if (pedido.color !== undefined) {
    if (pedido.color !== null && corValida(pedido.color) === null) {
      return fail("unprocessable_entity", t("Escolha uma cor da paleta."), 422, { requestId });
    }
    patch.color = pedido.color;
  }
  if (pedido.icon !== undefined) patch.icon = pedido.icon;
  if (pedido.is_archived !== undefined && pedido.is_archived !== grupo.is_archived) {
    const outrosAtivos = antes.origens.grupos.filter((g) => g.id !== id && !g.is_archived);
    if (pedido.is_archived && outrosAtivos.length === 0) {
      return fail(
        "unprocessable_entity",
        t("Este é o único grupo ativo. Crie outro grupo antes de arquivar este."),
        422,
        { requestId },
      );
    }
    patch.is_archived = pedido.is_archived;
  }
  // Nada a mudar (ex.: arquivar o que já está arquivado): sem escrita e sem auditoria.
  if (Object.keys(patch).length === 0) return ok(antes.origens, { requestId });

  const { error } = await supabase
    .from("crm_pipeline_groups")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId);
  if (error) return nomeRepetido(error, t, requestId) ?? fail("internal_error", error.message, 500, { requestId });

  void audit({
    action:
      patch.is_archived === true
        ? "pipeline_group.archived"
        : patch.is_archived === false
          ? "pipeline_group.unarchived"
          : "pipeline_group.updated",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_group",
    resourceId: id,
    requestId,
    metadata: {
      antes: { name: grupo.name, color: grupo.color, icon: grupo.icon, is_archived: grupo.is_archived },
      mudou: patch,
    },
  });

  return responderComOrigens(supabase, orgId, requestId);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx): Promise<Response> {
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

  const doGrupo = antes.origens.funis.filter((f) => f.group_id === id);
  let destino: string | null = null;
  if (doGrupo.length > 0) {
    const pedido = destinoSchema.safeParse(req.nextUrl.searchParams.get("destino"));
    const alvo = pedido.success
      ? antes.origens.grupos.find((g) => g.id === pedido.data && g.id !== id && !g.is_archived)
      : undefined;
    if (!alvo) {
      return fail("unprocessable_entity", t("Escolha para qual grupo as origens deste grupo vão."), 422, { requestId });
    }
    destino = alvo.id;
    // Duas escritas sem transação, nesta ordem de propósito: se a exclusão
    // falhar, sobra um grupo vazio — nunca uma origem sem grupo.
    const { error: moverErr } = await supabase
      .from("crm_pipelines")
      .update({ group_id: destino })
      .eq("organization_id", orgId)
      .eq("group_id", id);
    if (moverErr) return fail("internal_error", moverErr.message, 500, { requestId });
  }

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
    metadata: { name: grupo.name, funis: doGrupo.length, destino },
  });

  return responderComOrigens(supabase, orgId, requestId);
}
```

- [ ] **Step 7: PUT do grupo do funil**

Replace the whole content of `app/api/v1/pipelines/[id]/grupo/route.ts` with:

```ts
/**
 * PUT /api/v1/pipelines/[id]/grupo — põe o funil num GRUPO DE FUNIS (fork
 * Escale, Fases 1A e 1B). Toda origem tem grupo (migration 9002): `group_id` é
 * obrigatório e precisa ser um grupo ATIVO da organização da sessão.
 *
 * Arquivo NOVO de propósito, e não um campo a mais no PATCH do funil
 * (`../route.ts`): aquele schema é `.strict()` e é do original. A guarda de
 * organização é dupla: a rota só aceita funil e grupo da leitura da organização
 * da sessão, e o banco recusa a combinação cruzada pela FK composta.
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

const corpoSchema = z.object({ group_id: z.string().uuid() }).strict();

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
  if (!antes.origens.grupos.some((g) => g.id === para && !g.is_archived)) {
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

- [ ] **Step 8: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-grupos-de-funis-rotas.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts
```
Expected: PASS nos dois arquivos (21 testes no das rotas). Se o dublê ordenar mal os funis por `position`, não importa para estes testes.

- [ ] **Step 9: Commit**

```bash
git add lib/escale/origens/ler-origens.ts lib/audit/actions.ts app/api/v1/pipeline-groups "app/api/v1/pipelines/[id]/grupo" tests/unit/escale-grupos-de-funis-rotas.test.ts
git commit -m "feat(escale): rotas 1B — ler origens, customizar, arquivar e excluir grupo com destino

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Negócios abre direto no funil

**Files:**
- Create: `app/actions/escale/origens.ts`, `app/app/escale/negocios/route.ts`, `tests/unit/escale-negocios-entrada.test.ts`
- Modify: `lib/escale/menu-do-topo.ts`, `components/escale/menu/MenuDoTopo.tsx`, `tests/unit/escale-menu-do-topo.test.ts`

**Interfaces:**
- Consumes: `lerOrigens` (Task 4), `escolherFunilInicial` (Task 3), `cookieDaPreferencia`, `COOKIE_ULTIMO_FUNIL`, `lerUuid` (Task 3); `requireAuth`, `resolveActiveOrg` de `@/lib/auth/server`; `env.NEXT_PUBLIC_APP_URL` de `@/lib/env`; `cookieSecure` de `@/lib/supabase/cookie-secure`.
- Produces: `guardarPreferenciaDeOrigens(pedido: PreferenciaDeOrigens): Promise<void>` (Server Action, usada pela Task 7); `GET /app/escale/negocios` → 307 para `/app/pipelines/<id>` ou `/app/kanban`; `ItemDoTopo.destino?: string`.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-negocios-entrada.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = { valores: {} as Record<string, string>, set: vi.fn() };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) => (nome in store.valores ? { value: store.valores[nome] } : undefined),
    set: store.set,
  }),
}));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "https://app.exemplo.com" } }));
vi.mock("@/lib/supabase/cookie-secure", () => ({ cookieSecure: () => true }));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: "agent" })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/escale/origens/ler-origens", () => ({ lerOrigens: vi.fn() }));

import { resolveActiveOrg } from "@/lib/auth/server";
import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { guardarPreferenciaDeOrigens } from "@/app/actions/escale/origens";
import { GET } from "@/app/app/escale/negocios/route";
import { ITENS_DO_TOPO } from "@/lib/escale/menu-do-topo";

const F_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const F_B = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";

beforeEach(() => {
  store.valores = {};
  store.set.mockClear();
  vi.mocked(lerOrigens).mockReset();
  vi.mocked(lerOrigens).mockResolvedValue({
    grupos: [{ id: "g", name: "Geral", color: null, icon: "iniciais", is_archived: false }],
    funis: [
      { id: F_A, name: "A", group_id: "g", is_archived: false, is_default: false },
      { id: F_B, name: "B", group_id: "g", is_archived: false, is_default: true },
    ],
  });
});

describe("GET /app/escale/negocios", () => {
  it("abre o último funil aberto, pelo endereço público", async () => {
    store.valores.escale_ultimo_funil = F_A;
    const res = await GET();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`https://app.exemplo.com/app/pipelines/${F_A}`);
    expect(lerOrigens).toHaveBeenCalledWith(expect.anything(), "org-1");
  });

  it("sem lembrança, abre o funil padrão", async () => {
    expect((await GET()).headers.get("location")).toBe(`https://app.exemplo.com/app/pipelines/${F_B}`);
  });

  it("sem funil visível, ou com o banco fora do ar, cai na lista de funis", async () => {
    vi.mocked(lerOrigens).mockResolvedValueOnce({ grupos: [], funis: [] });
    expect((await GET()).headers.get("location")).toBe("https://app.exemplo.com/app/kanban");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(lerOrigens).mockRejectedValueOnce(new Error("fora do ar"));
    expect((await GET()).headers.get("location")).toBe("https://app.exemplo.com/app/kanban");
  });

  it("sem organização ativa, volta para /app", async () => {
    vi.mocked(resolveActiveOrg).mockResolvedValueOnce(null);
    expect((await GET()).headers.get("location")).toBe("https://app.exemplo.com/app");
  });
});

describe("guardarPreferenciaDeOrigens", () => {
  it("grava só o que passa na validação, em cookie httpOnly", async () => {
    await guardarPreferenciaDeOrigens({ nome: "ultimo_funil", valor: F_A });
    expect(store.set).toHaveBeenCalledWith(
      "escale_ultimo_funil",
      F_A,
      expect.objectContaining({ httpOnly: true, sameSite: "strict", path: "/" }),
    );
    store.set.mockClear();
    await guardarPreferenciaDeOrigens({ nome: "ultimo_funil", valor: "../../x" } as never);
    expect(store.set).not.toHaveBeenCalled();
  });
});

describe("o Negócios do menu do topo", () => {
  it("leva para a entrada nova, sem perder a régua de permissão de /app/kanban", () => {
    const negocios = ITENS_DO_TOPO.find((i) => i.rotulo === "Negócios");
    expect(negocios).toMatchObject({ href: "/app/kanban", destino: "/app/escale/negocios" });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-negocios-entrada.test.ts
```
Expected: FAIL — `Failed to resolve import "@/app/actions/escale/origens"`.

- [ ] **Step 3: A Server Action**

Create `app/actions/escale/origens.ts`:

```ts
"use server";
/**
 * Grava as preferências do painel Origens (fork Escale, Fase 1B) em cookie
 * httpOnly — painel/lista recolhidos, grupos ocultos e o último funil aberto.
 *
 * Preferência pessoal de tela, sem banco e sem organização (como
 * `app/actions/shell/toggleSidebar.ts`). Tudo passa por `cookieDaPreferencia`:
 * o navegador não escolhe nome de cookie nem grava texto livre.
 */
import { cookies } from "next/headers";

import { cookieDaPreferencia, type PreferenciaDeOrigens } from "@/lib/escale/origens/preferencias";
import { cookieSecure } from "@/lib/supabase/cookie-secure";

export async function guardarPreferenciaDeOrigens(pedido: PreferenciaDeOrigens): Promise<void> {
  const alvo = cookieDaPreferencia(pedido);
  if (!alvo) return;
  const store = await cookies();
  store.set(alvo.cookie, alvo.valor, {
    httpOnly: true,
    sameSite: "strict",
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
```

- [ ] **Step 4: A rota de entrada**

Create `app/app/escale/negocios/route.ts`:

```ts
/**
 * GET /app/escale/negocios — o "Negócios" do menu do topo (fork Escale, Fase 1B).
 *
 * Abre direto no quadro, como na Clint: o último funil aberto (cookie
 * `escale_ultimo_funil`), senão o padrão da organização, senão o primeiro da
 * lista (`escolherFunilInicial`). Sem funil visível — ou com o banco fora do
 * ar — cai na lista de funis, que continua existindo em `/app/kanban`.
 *
 * Route Handler, e não página: só redireciona (e assim não entra na régua de
 * telas de `tests/unit/navegacao-completude.test.ts`). O endereço do redirect é
 * o público (`NEXT_PUBLIC_APP_URL`): atrás do proxy, `req.url` é 0.0.0.0:3000.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { env } from "@/lib/env";
import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { COOKIE_ULTIMO_FUNIL, lerUuid } from "@/lib/escale/origens/preferencias";
import { escolherFunilInicial } from "@/lib/escale/origens/regras";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const para = (caminho: string) => NextResponse.redirect(new URL(caminho, env.NEXT_PUBLIC_APP_URL));

export async function GET(): Promise<NextResponse> {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) return para("/app");

  const lembrado = lerUuid((await cookies()).get(COOKIE_ULTIMO_FUNIL)?.value);
  let destino: string | null = null;
  try {
    destino = escolherFunilInicial(await lerOrigens(await createClient(), activeOrg.orgId), lembrado);
  } catch (err) {
    console.error("[escale/negocios] não consegui ler as origens; abro a lista de funis", err);
  }
  return para(destino ? `/app/pipelines/${destino}` : "/app/kanban");
}
```

- [ ] **Step 5: O item do menu aponta para a entrada**

Em `lib/escale/menu-do-topo.ts`, troque:

```ts
export interface ItemDoTopo {
  href: string;
```

por:

```ts
export interface ItemDoTopo {
  /** A tela do registro: decide permissão (`montarMenuDoTopo`) e o "ativo". */
  href: string;
  /** Para onde o clique leva, quando não é o próprio `href` (Fase 1B). */
  destino?: string;
```

e troque:

```ts
  { href: "/app/kanban", rotulo: "Negócios", ativoEm: ["/app/kanban", "/app/pipelines", "/app/leads"] },
```

por:

```ts
  {
    href: "/app/kanban",
    destino: "/app/escale/negocios",
    rotulo: "Negócios",
    ativoEm: ["/app/kanban", "/app/pipelines", "/app/leads"],
  },
```

Em `components/escale/menu/MenuDoTopo.tsx`, troque:

```tsx
              key={item.href}
              href={item.href}
```

por:

```tsx
              key={item.href}
              href={item.destino ?? item.href}
              // A entrada de Negócios só redireciona: pré-carregar não adianta nada.
              prefetch={item.destino ? false : undefined}
```

- [ ] **Step 6: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-negocios-entrada.test.ts tests/unit/escale-menu-do-topo.test.ts tests/unit/escale-menu-do-topo-tela.test.tsx tests/unit/navegacao-completude.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts
```
Expected: PASS nos 5 arquivos (`escale-menu-do-topo` continua comparando `href`, que não mudou). Se `escale-menu-do-topo-tela` conferir o `href` do link Negócios, troque o esperado para `/app/escale/negocios` nesse teste.

- [ ] **Step 7: Commit**

```bash
git add app/actions/escale/origens.ts app/app/escale/negocios/route.ts lib/escale/menu-do-topo.ts components/escale/menu/MenuDoTopo.tsx tests/unit/escale-negocios-entrada.test.ts tests/unit/escale-menu-do-topo.test.ts tests/unit/escale-menu-do-topo-tela.test.tsx
git commit -m "feat(escale): Negócios do menu do topo abre direto no último funil

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: As janelas (adicionar, configurar, customizar, arquivar, excluir)

**Files:**
- Modify: `hooks/escale/useOrigens.ts` (reescrito)
- Create: `components/escale/origens/texto-do-erro.ts`, `components/escale/origens/IconeDoGrupo.tsx`, `components/escale/origens/JanelasDeOrigens.tsx`, `components/escale/origens/JanelasDoGrupo.tsx`, `components/escale/origens/JanelasDaOrigem.tsx`, `tests/unit/escale-janelas-de-origens.test.tsx`

**Interfaces:**
- Consumes: rotas da Task 4; rotas do original `POST /api/v1/pipelines {name}` → `{ data: { pipelines: [{id,name}], arquivados } }`, `PATCH /api/v1/pipelines/:id {name} | {is_default: true} | {is_archived: false}`, `DELETE /api/v1/pipelines/:id` (arquiva), `DELETE /api/v1/pipelines/:id?definitivo=1` (exclui; 422 com a explicação quando tem negócio); `apiClient.{get,post,patch,put,delete}`; `ApiError`; `estiloDoChip`, `NOME_DO_TOM`, `PALETA_DE_ETIQUETAS`; `SearchableSelect`; `Dialog*`; ícones `Funnel, Users, Buildings, Storefront, Megaphone, Phone`.
- Produces (Task 7):
  - `type Janela = { tipo: "adicionar-origem"; grupoId: string | null } | { tipo: "adicionar-grupo" } | { tipo: "config-grupo" | "customizar" | "arquivar-grupo" | "excluir-grupo" | "config-origem" | "arquivar-origem" | "excluir-origem"; id: string }`
  - `JanelasDeOrigens({ janela: Janela | null; origens: Origens; onFechar: () => void; onOrigens: (o: Origens) => void; onAbrirOrigem: (id: string) => void })`
  - `IconeDoGrupo({ grupo: Pick<GrupoDeFunis, "id" | "name" | "color" | "icon"> })`
  - `textoDoErro(e: unknown, t: (s: string) => string): string`
  - hooks: `useCriarGrupo`, `useAtualizarGrupo`, `useExcluirGrupo`, `useMoverFunil`, `useCriarOrigem`, `useAtualizarOrigem`, `useArquivarOrigem`, `useDesarquivarOrigem`, `useExcluirOrigem` — todas resolvem `Origens` (a `useCriarOrigem` resolve `{ origens: Origens; id: string }`).

- [ ] **Step 1: Escrever o teste das janelas (vai falhar)**

Create `tests/unit/escale-janelas-de-origens.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import type { Origens } from "@/lib/escale/origens/regras";
import { JanelasDeOrigens, type Janela } from "@/components/escale/origens/JanelasDeOrigens";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras", color: null, icon: "iniciais", is_archived: false },
    { id: "g-cred", name: "Credenciados", color: null, icon: "iniciais", is_archived: false },
    { id: "g-vazio", name: "Parcerias", color: null, icon: "iniciais", is_archived: false },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras", is_archived: false, is_default: true },
    { id: "f-nayara", name: "Funil Nayara", group_id: "g-cred", is_archived: false, is_default: false },
  ],
};

function abrir(janela: Janela, origens: Origens = ORIGENS) {
  const onOrigens = vi.fn();
  const onFechar = vi.fn();
  const onAbrirOrigem = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <JanelasDeOrigens
        janela={janela}
        origens={origens}
        onFechar={onFechar}
        onOrigens={onOrigens}
        onAbrirOrigem={onAbrirOrigem}
      />
    </QueryClientProvider>,
  );
  return { onOrigens, onFechar, onAbrirOrigem, user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  for (const fn of [apiClient.get, apiClient.patch, apiClient.put, apiClient.delete]) {
    vi.mocked(fn).mockResolvedValue({ data: ORIGENS });
  }
  vi.mocked(apiClient.post).mockResolvedValue({ data: ORIGENS });
});

describe("janelas do grupo", () => {
  it("Adicionar grupo de origens cria e aplica as origens da resposta", async () => {
    const { onOrigens, onFechar, user } = abrir({ tipo: "adicionar-grupo" });
    await user.type(screen.getByRole("textbox", { name: "Nome do novo grupo" }), "Novos");
    await user.click(screen.getByRole("button", { name: "Criar grupo" }));
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipeline-groups", { name: "Novos" });
    await vi.waitFor(() => expect(onOrigens).toHaveBeenCalledWith(ORIGENS));
    expect(onFechar).toHaveBeenCalled();
  });

  it("Configurações renomeia o grupo", async () => {
    const { user } = abrir({ tipo: "config-grupo", id: "g-obras" });
    const campo = screen.getByRole("textbox", { name: "Nome do grupo" });
    expect(campo).toHaveValue("INSS de obras");
    await user.clear(campo);
    await user.type(campo, "INSS Obras 2026");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-obras", { name: "INSS Obras 2026" });
  });

  it("Customizar grava a cor da paleta e o ícone escolhidos", async () => {
    const { user } = abrir({ tipo: "customizar", id: "g-obras" });
    await user.click(screen.getByRole("button", { name: "Azul" }));
    await user.click(screen.getByRole("button", { name: "Pessoas" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-obras", { color: "#0091ff", icon: "pessoas" });
  });

  it("Arquivar avisa que as origens vão junto e arquiva", async () => {
    const { user } = abrir({ tipo: "arquivar-grupo", id: "g-obras" });
    expect(screen.getByText(/as origens continuam recebendo negócios/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Arquivar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-obras", { is_archived: true });
  });

  it("Excluir grupo vazio sai direto", async () => {
    const { user } = abrir({ tipo: "excluir-grupo", id: "g-vazio" });
    await user.click(screen.getByRole("button", { name: "Excluir grupo" }));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-vazio");
  });

  it("Excluir grupo com origens pede o destino e manda junto", async () => {
    const { user } = abrir({ tipo: "excluir-grupo", id: "g-obras" });
    await user.click(screen.getByRole("combobox", { name: "Mover as origens para" }));
    await user.click(await screen.findByRole("option", { name: "Parcerias" }));
    await user.click(screen.getByRole("button", { name: "Mover e excluir grupo" }));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-obras?destino=g-vazio");
  });

  it("o único grupo com origens não pode ser excluído", () => {
    abrir(
      { tipo: "excluir-grupo", id: "g-obras" },
      { grupos: [ORIGENS.grupos[0]!], funis: [ORIGENS.funis[0]!] },
    );
    expect(screen.getByText("«INSS de obras» é o único grupo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mover e excluir grupo" })).toBeNull();
  });
});

describe("janelas da origem", () => {
  it("Adicionar origem cria pelo original, põe no grupo e abre o quadro", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { pipelines: [{ id: "f-novo", name: "Leads Instagram" }], arquivados: [] } });
    const { onAbrirOrigem, onOrigens, user } = abrir({ tipo: "adicionar-origem", grupoId: "g-cred" });
    await user.type(screen.getByRole("textbox", { name: "Nome da origem" }), "Leads Instagram");
    await user.click(screen.getByRole("button", { name: "Criar origem" }));
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipelines", { name: "Leads Instagram" });
    await vi.waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-novo/grupo", { group_id: "g-cred" }),
    );
    await vi.waitFor(() => expect(onAbrirOrigem).toHaveBeenCalledWith("f-novo"));
    expect(onOrigens).toHaveBeenCalledWith(ORIGENS);
  });

  it("Configurações da origem renomeia, troca o grupo e torna padrão", async () => {
    const { user } = abrir({ tipo: "config-origem", id: "f-nayara" });
    const nome = screen.getByRole("textbox", { name: "Nome da origem" });
    await user.clear(nome);
    await user.type(nome, "Nayara 2026");
    await user.click(screen.getByRole("combobox", { name: "Grupo" }));
    await user.click(await screen.findByRole("option", { name: "Parcerias" }));
    await user.click(screen.getByRole("checkbox", { name: /Tornar esta a origem padrão/ }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await vi.waitFor(() =>
      expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-nayara/grupo", { group_id: "g-vazio" }),
    );
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-nayara", { name: "Nayara 2026" });
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-nayara", { is_default: true });
  });

  it("a origem padrão não mostra a caixa de tornar padrão", () => {
    abrir({ tipo: "config-origem", id: "f-leads" });
    expect(screen.getByText("Esta é a origem padrão da organização.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("Arquivar origem usa o arquivamento do original e relê as origens", async () => {
    const { user } = abrir({ tipo: "arquivar-origem", id: "f-nayara" });
    await user.click(screen.getByRole("button", { name: "Arquivar" }));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipelines/f-nayara");
    await vi.waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/api/v1/pipeline-groups"));
  });

  it("Excluir de vez com negócios mostra a recusa e oferece arquivar", async () => {
    vi.mocked(apiClient.delete).mockRejectedValueOnce(
      new ApiError(422, "unprocessable_entity", undefined, "r-1", "«Funil Nayara» tem 3 negócios. Arquive em vez de excluir."),
    );
    const { user } = abrir({ tipo: "excluir-origem", id: "f-nayara" });
    await user.click(screen.getByRole("button", { name: "Excluir de vez" }));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipelines/f-nayara?definitivo=1");
    expect(await screen.findByRole("alert")).toHaveTextContent("tem 3 negócios");
    await user.click(screen.getByRole("button", { name: "Arquivar" }));
    expect(apiClient.delete).toHaveBeenLastCalledWith("/api/v1/pipelines/f-nayara");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-janelas-de-origens.test.tsx
```
Expected: FAIL — `Failed to resolve import "@/components/escale/origens/JanelasDeOrigens"`.

- [ ] **Step 3: As mutações**

Replace the whole content of `hooks/escale/useOrigens.ts` with:

```ts
"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import type { IconeDeGrupo, Origens } from "@/lib/escale/origens/regras";

/**
 * A ESCRITA DO PAINEL ORIGENS (fork Escale, Fases 1A e 1B).
 *
 * Toda mutação RESOLVE as origens relidas do banco e a tela aplica isso — o
 * desenho de `hooks/pipelines/usePipelines.ts`: depender do `router.refresh()`
 * para mostrar o efeito da própria ação é corrida contra os prefetches. As rotas
 * do fork já devolvem `{ data: Origens }`; depois de uma rota do ORIGINAL
 * (`/api/v1/pipelines…`, que devolve a lista de funis dele) a mutação relê pelo
 * `GET /api/v1/pipeline-groups`. O refresh continua, para a PRÓXIMA navegação.
 */
export type RespostaDeOrigens = { data: Origens };
type ListaDoOriginal = { data: { pipelines: Array<{ id: string; name: string }> } };

const GRUPOS = "/api/v1/pipeline-groups";
const doGrupo = (id: string) => `${GRUPOS}/${encodeURIComponent(id)}`;
const doFunil = (id: string) => `/api/v1/pipelines/${encodeURIComponent(id)}`;
const grupoDoFunil = (id: string) => `${doFunil(id)}/grupo`;

async function reler(): Promise<Origens> {
  return (await apiClient.get<RespostaDeOrigens>(GRUPOS)).data;
}

function useAoTerminar() {
  const router = useRouter();
  return () => router.refresh();
}

export function useCriarGrupo() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (name: string) => (await apiClient.post<RespostaDeOrigens>(GRUPOS, { name })).data,
    onSettled,
  });
}

export interface MudancaDeGrupo {
  name?: string;
  color?: string | null;
  icon?: IconeDeGrupo;
  is_archived?: boolean;
}

export function useAtualizarGrupo() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ id, mudanca }: { id: string; mudanca: MudancaDeGrupo }) =>
      (await apiClient.patch<RespostaDeOrigens>(doGrupo(id), mudanca)).data,
    onSettled,
  });
}

export function useExcluirGrupo() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ id, destino }: { id: string; destino: string | null }) => {
      const caminho = destino ? `${doGrupo(id)}?destino=${encodeURIComponent(destino)}` : doGrupo(id);
      return (await apiClient.delete<RespostaDeOrigens>(caminho)).data;
    },
    onSettled,
  });
}

export function useMoverFunil() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ funilId, groupId }: { funilId: string; groupId: string }) =>
      (await apiClient.put<RespostaDeOrigens>(grupoDoFunil(funilId), { group_id: groupId })).data,
    onSettled,
  });
}

/**
 * Cria pela rota do original (que dá as etapas iniciais e o slug) e depois põe
 * no grupo. Entre as duas escritas o funil fica no "Geral" (gatilho da 9002) —
 * se a segunda falhar, ele aparece lá, nunca some.
 */
export function useCriarOrigem() {
  const onSettled = useAoTerminar();
  const t = useT();
  return useMutation({
    mutationFn: async ({ name, groupId }: { name: string; groupId: string }) => {
      const nome = name.trim();
      const lista = await apiClient.post<ListaDoOriginal>("/api/v1/pipelines", { name: nome });
      const novo = lista.data.pipelines.find((p) => p.name === nome);
      if (!novo) throw new Error(t("A origem foi criada, mas não apareceu na lista. Recarregue a página."));
      const origens = (await apiClient.put<RespostaDeOrigens>(grupoDoFunil(novo.id), { group_id: groupId })).data;
      return { origens, id: novo.id };
    },
    onSettled,
  });
}

export interface MudancaDeOrigem {
  name?: string;
  groupId?: string;
  tornarPadrao?: boolean;
}

export function useAtualizarOrigem() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ id, mudanca }: { id: string; mudanca: MudancaDeOrigem }) => {
      if (mudanca.name !== undefined) await apiClient.patch(doFunil(id), { name: mudanca.name.trim() });
      if (mudanca.tornarPadrao) await apiClient.patch(doFunil(id), { is_default: true });
      if (mudanca.groupId !== undefined) {
        return (await apiClient.put<RespostaDeOrigens>(grupoDoFunil(id), { group_id: mudanca.groupId })).data;
      }
      return reler();
    },
    onSettled,
  });
}

export function useArquivarOrigem() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(doFunil(id));
      return reler();
    },
    onSettled,
  });
}

export function useDesarquivarOrigem() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(doFunil(id), { is_archived: false });
      return reler();
    },
    onSettled,
  });
}

export function useExcluirOrigem() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${doFunil(id)}?definitivo=1`);
      return reler();
    },
    onSettled,
  });
}
```

- [ ] **Step 4: Erro legível e o ícone do grupo**

Create `components/escale/origens/texto-do-erro.ts`:

```ts
import { ApiError } from "@/lib/api/types";

/** A mensagem que a rota escreveu para gente (já traduzida, ou chave do dicionário). */
export function textoDoErro(e: unknown, t: (texto: string) => string): string {
  if (e instanceof ApiError) return t(e.message);
  if (e instanceof Error && e.message) return e.message;
  return t("Não consegui completar essa ação. Tente de novo.");
}
```

Create `components/escale/origens/IconeDoGrupo.tsx`:

```tsx
import { corEfetiva, iniciais, type GrupoDeFunis, type IconeDeGrupo } from "@/lib/escale/origens/regras";
import { estiloDoChip } from "@/lib/tags/cor-da-etiqueta";
import { Buildings, Funnel, Megaphone, Phone, Storefront, Users } from "@/lib/ui/icons";

const DESENHO: Record<Exclude<IconeDeGrupo, "iniciais">, typeof Funnel> = {
  funil: Funnel,
  pessoas: Users,
  predio: Buildings,
  loja: Storefront,
  megafone: Megaphone,
  telefone: Phone,
};

/**
 * O quadradinho do grupo no painel: a cor escolhida em Customizar (ou a
 * automática) e o ícone (ou as iniciais). `estiloDoChip` escolhe a frente
 * legível sobre o fundo.
 */
export function IconeDoGrupo({ grupo }: { grupo: Pick<GrupoDeFunis, "id" | "name" | "color" | "icon"> }) {
  const Desenho = grupo.icon === "iniciais" ? null : DESENHO[grupo.icon];
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold"
      style={estiloDoChip(corEfetiva(grupo))}
    >
      {Desenho ? <Desenho size={13} weight="bold" /> : iniciais(grupo.name)}
    </span>
  );
}
```

- [ ] **Step 5: O despacho das janelas**

Create `components/escale/origens/JanelasDeOrigens.tsx`:

```tsx
"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Origens } from "@/lib/escale/origens/regras";

import {
  FormAdicionarOrigem,
  FormArquivarOrigem,
  FormConfigOrigem,
  FormExcluirOrigem,
} from "./JanelasDaOrigem";
import {
  FormAdicionarGrupo,
  FormArquivarGrupo,
  FormConfigGrupo,
  FormCustomizarGrupo,
  FormExcluirGrupo,
} from "./JanelasDoGrupo";

export type Janela =
  | { tipo: "adicionar-origem"; grupoId: string | null }
  | { tipo: "adicionar-grupo" }
  | {
      tipo:
        | "config-grupo"
        | "customizar"
        | "arquivar-grupo"
        | "excluir-grupo"
        | "config-origem"
        | "arquivar-origem"
        | "excluir-origem";
      id: string;
    };

export interface PropsDaJanela {
  origens: Origens;
  onFechar: () => void;
  onOrigens: (origens: Origens) => void;
}

/**
 * As janelas do painel Origens (fork Escale, Fase 1B): um Dialog só, com o
 * conteúdo da ação pedida pelo `+` ou por um ⋮. Só gerente+ chega aqui — o
 * painel esconde os botões, e as rotas cobram `requireRole("manager")`.
 */
export function JanelasDeOrigens({
  janela,
  onAbrirOrigem,
  ...comuns
}: PropsDaJanela & { janela: Janela | null; onAbrirOrigem: (id: string) => void }) {
  return (
    <Dialog
      open={janela !== null}
      onOpenChange={(aberto) => {
        if (!aberto) comuns.onFechar();
      }}
    >
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
        {janela?.tipo === "adicionar-origem" && (
          <FormAdicionarOrigem {...comuns} grupoId={janela.grupoId} onAbrirOrigem={onAbrirOrigem} />
        )}
        {janela?.tipo === "adicionar-grupo" && <FormAdicionarGrupo {...comuns} />}
        {janela?.tipo === "config-grupo" && <FormConfigGrupo {...comuns} id={janela.id} />}
        {janela?.tipo === "customizar" && <FormCustomizarGrupo {...comuns} id={janela.id} />}
        {janela?.tipo === "arquivar-grupo" && <FormArquivarGrupo {...comuns} id={janela.id} />}
        {janela?.tipo === "excluir-grupo" && <FormExcluirGrupo {...comuns} id={janela.id} />}
        {janela?.tipo === "config-origem" && <FormConfigOrigem {...comuns} id={janela.id} />}
        {janela?.tipo === "arquivar-origem" && <FormArquivarOrigem {...comuns} id={janela.id} />}
        {janela?.tipo === "excluir-origem" && <FormExcluirOrigem {...comuns} id={janela.id} />}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: As janelas do grupo**

Create `components/escale/origens/JanelasDoGrupo.tsx`:

```tsx
"use client";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAtualizarGrupo, useCriarGrupo, useExcluirGrupo } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import {
  ICONES_DE_GRUPO,
  NOME_DE_GRUPO_MAX,
  ROTULO_DO_ICONE,
  type IconeDeGrupo,
} from "@/lib/escale/origens/regras";
import { NOME_DO_TOM, PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";
import { cn } from "@/lib/utils";

import { IconeDoGrupo } from "./IconeDoGrupo";
import type { PropsDaJanela } from "./JanelasDeOrigens";
import { textoDoErro } from "./texto-do-erro";

export function Alerta({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm">
      {texto}
    </p>
  );
}

function GrupoSumiu({ onFechar }: { onFechar: () => void }) {
  const t = useT();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("Grupo não encontrado.")}</DialogTitle>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" onClick={onFechar}>
          {t("Fechar")}
        </Button>
      </DialogFooter>
    </>
  );
}

export function FormAdicionarGrupo({ onFechar, onOrigens }: PropsDaJanela) {
  const t = useT();
  const criar = useCriarGrupo();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    criar.mutate(nome, {
      onSuccess: (origens) => {
        onOrigens(origens);
        onFechar();
      },
      onError: (err) => setErro(textoDoErro(err, t)),
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Adicionar grupo de origens")}</DialogTitle>
        <DialogDescription>{t("O grupo nasce vazio. Use o + dele para criar origens dentro.")}</DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label={t("Nome do novo grupo")}
        placeholder={t("Nome do novo grupo")}
        maxLength={NOME_DE_GRUPO_MAX}
      />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={criar.isPending || !nome.trim()}>
          {t("Criar grupo")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FormConfigGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const grupo = origens.grupos.find((g) => g.id === id);
  const [nome, setNome] = useState(grupo?.name ?? "");
  const [erro, setErro] = useState<string | null>(null);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    atualizar.mutate(
      { id, mudanca: { name: nome } },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Configurações do grupo")}</DialogTitle>
      </DialogHeader>
      <Alerta texto={erro} />
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label={t("Nome do grupo")}
        maxLength={NOME_DE_GRUPO_MAX}
      />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={atualizar.isPending || !nome.trim()}>
          {t("Salvar")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FormCustomizarGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const grupo = origens.grupos.find((g) => g.id === id);
  const [cor, setCor] = useState<string | null>(grupo?.color ?? null);
  const [icone, setIcone] = useState<IconeDeGrupo>(grupo?.icon ?? "iniciais");
  const [erro, setErro] = useState<string | null>(null);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;

  function salvar() {
    atualizar.mutate(
      { id, mudanca: { color: cor, icon: icone } },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  const quadrado = "size-8 rounded-md border-2 transition-colors";
  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {t("Customizar")} «{grupo.name}»
        </DialogTitle>
      </DialogHeader>
      <Alerta texto={erro} />
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">{t("Cor")}</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={cor === null}
            onClick={() => setCor(null)}
            className={cn(quadrado, "px-2 text-xs", cor === null ? "border-foreground" : "border-transparent bg-muted")}
          >
            {t("Cor automática")}
          </button>
          {PALETA_DE_ETIQUETAS.map((tom) => (
            <button
              key={tom}
              type="button"
              aria-label={t(NOME_DO_TOM[tom] ?? tom)}
              aria-pressed={cor === tom}
              onClick={() => setCor(tom)}
              className={cn(quadrado, cor === tom ? "border-foreground" : "border-transparent")}
              style={{ backgroundColor: tom }}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">{t("Ícone")}</legend>
        <div className="flex flex-wrap gap-2">
          {ICONES_DE_GRUPO.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={t(ROTULO_DO_ICONE[i] ?? i)}
              aria-pressed={icone === i}
              onClick={() => setIcone(i)}
              className={cn(
                "grid h-9 w-11 place-items-center rounded-md border",
                icone === i ? "border-accent bg-accent-soft" : "border-border",
              )}
            >
              <IconeDoGrupo grupo={{ ...grupo, color: cor, icon: i }} />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{t("Prévia")}</span>
        <IconeDoGrupo grupo={{ ...grupo, color: cor, icon: icone }} />
        <span className="font-semibold">{grupo.name}</span>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="button" onClick={salvar} disabled={atualizar.isPending}>
          {t("Salvar")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function FormArquivarGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const [erro, setErro] = useState<string | null>(null);
  const grupo = origens.grupos.find((g) => g.id === id);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;
  const n = origens.funis.filter((f) => f.group_id === id && !f.is_archived).length;

  function arquivar() {
    atualizar.mutate(
      { id, mudanca: { is_archived: true } },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Arquivar «{nome}»?").replace("{nome}", grupo.name)}</DialogTitle>
        <DialogDescription>
          {t(
            "O grupo e as {n} origens dele saem do painel e vão para Arquivados. Nada é apagado, as origens continuam recebendo negócios e Desarquivar traz tudo de volta.",
          ).replace("{n}", String(n))}
        </DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="button" onClick={arquivar} disabled={atualizar.isPending}>
          {t("Arquivar")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function FormExcluirGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const excluir = useExcluirGrupo();
  const outros = origens.grupos.filter((g) => g.id !== id && !g.is_archived);
  const [destino, setDestino] = useState<string | null>(outros[0]?.id ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const grupo = origens.grupos.find((g) => g.id === id);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;
  const n = origens.funis.filter((f) => f.group_id === id).length;

  function enviar() {
    excluir.mutate(
      { id, destino: n > 0 ? destino : null },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  if (n > 0 && outros.length === 0) {
    return (
      <div className="grid gap-4">
        <DialogHeader>
          <DialogTitle>{t("«{nome}» é o único grupo").replace("{nome}", grupo.name)}</DialogTitle>
          <DialogDescription>
            {t(
              "Toda origem precisa de um grupo. Crie outro grupo antes, pelo + ao lado da lupa, para as origens irem para lá.",
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={onFechar}>
            {t("Entendi")}
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Excluir «{nome}»?").replace("{nome}", grupo.name)}</DialogTitle>
        <DialogDescription>
          {n === 0
            ? t("O grupo está vazio. Nenhuma origem e nenhum negócio é apagado.")
            : t(
                "Toda origem precisa de um grupo. Escolha para onde vão as {n} origens deste grupo. Nenhum negócio é apagado.",
              ).replace("{n}", String(n))}
        </DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      {n > 0 && (
        <SearchableSelect
          options={outros.map((g) => ({ value: g.id, label: g.name }))}
          value={destino ?? undefined}
          onValueChange={setDestino}
          aria-label={t("Mover as origens para")}
        />
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={enviar}
          disabled={excluir.isPending || (n > 0 && !destino)}
        >
          {n === 0 ? t("Excluir grupo") : t("Mover e excluir grupo")}
        </Button>
      </DialogFooter>
    </div>
  );
}
```

- [ ] **Step 7: As janelas da origem**

Create `components/escale/origens/JanelasDaOrigem.tsx`:

```tsx
"use client";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  useArquivarOrigem,
  useAtualizarOrigem,
  useCriarOrigem,
  useExcluirOrigem,
  type MudancaDeOrigem,
} from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";

import type { PropsDaJanela } from "./JanelasDeOrigens";
import { Alerta } from "./JanelasDoGrupo";
import { textoDoErro } from "./texto-do-erro";

function OrigemSumiu({ onFechar }: { onFechar: () => void }) {
  const t = useT();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("Funil não encontrado.")}</DialogTitle>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" onClick={onFechar}>
          {t("Fechar")}
        </Button>
      </DialogFooter>
    </>
  );
}

export function FormAdicionarOrigem({
  origens,
  onFechar,
  onOrigens,
  grupoId,
  onAbrirOrigem,
}: PropsDaJanela & { grupoId: string | null; onAbrirOrigem: (id: string) => void }) {
  const t = useT();
  const criar = useCriarOrigem();
  const ativos = origens.grupos.filter((g) => !g.is_archived);
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState<string | null>(
    ativos.some((g) => g.id === grupoId) ? grupoId : (ativos[0]?.id ?? null),
  );
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !grupo) return;
    criar.mutate(
      { name: nome, groupId: grupo },
      {
        onSuccess: (r) => {
          onOrigens(r.origens);
          onAbrirOrigem(r.id);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Adicionar origem")}</DialogTitle>
        <DialogDescription>
          {ativos.length === 0
            ? t("Crie um grupo antes, pelo + ao lado da lupa.")
            : t("Toda origem fica num grupo. Ela nasce com as etapas padrão e já abre no quadro.")}
        </DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label={t("Nome da origem")}
        placeholder={t("Nome da origem")}
        maxLength={80}
      />
      <SearchableSelect
        options={ativos.map((g) => ({ value: g.id, label: g.name }))}
        value={grupo ?? undefined}
        onValueChange={setGrupo}
        aria-label={t("Grupo")}
      />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={criar.isPending || !nome.trim() || !grupo}>
          {t("Criar origem")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FormConfigOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarOrigem();
  const funil = origens.funis.find((f) => f.id === id);
  const ativos = origens.grupos.filter((g) => !g.is_archived || g.id === funil?.group_id);
  const [nome, setNome] = useState(funil?.name ?? "");
  const [grupo, setGrupo] = useState<string | null>(funil?.group_id ?? null);
  const [tornarPadrao, setTornarPadrao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const mudanca: MudancaDeOrigem = {};
    if (nome.trim() && nome.trim() !== funil!.name) mudanca.name = nome;
    if (grupo && grupo !== funil!.group_id) mudanca.groupId = grupo;
    if (tornarPadrao) mudanca.tornarPadrao = true;
    if (Object.keys(mudanca).length === 0) return onFechar();
    atualizar.mutate(
      { id, mudanca },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Configurações da origem")}</DialogTitle>
        <DialogDescription>{t("As etapas continuam sendo editadas no próprio quadro.")}</DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label={t("Nome da origem")}
        maxLength={80}
      />
      <SearchableSelect
        options={ativos.map((g) => ({ value: g.id, label: g.name }))}
        value={grupo ?? undefined}
        onValueChange={setGrupo}
        aria-label={t("Grupo")}
      />
      {funil.is_default ? (
        <p className="text-sm text-muted-foreground">{t("Esta é a origem padrão da organização.")}</p>
      ) : (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={tornarPadrao}
            onChange={(e) => setTornarPadrao(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            {t("Tornar esta a origem padrão")}
            <span className="block text-xs text-muted-foreground">
              {t("Abre para quem ainda não abriu nenhuma origem.")}
            </span>
          </span>
        </label>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={atualizar.isPending}>
          {t("Salvar")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function FormArquivarOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const arquivar = useArquivarOrigem();
  const [erro, setErro] = useState<string | null>(null);
  const funil = origens.funis.find((f) => f.id === id);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  function confirmar() {
    arquivar.mutate(id, {
      onSuccess: (r) => {
        onOrigens(r);
        onFechar();
      },
      onError: (err) => setErro(textoDoErro(err, t)),
    });
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Arquivar «{nome}»?").replace("{nome}", funil.name)}</DialogTitle>
        <DialogDescription>
          {t("A origem sai do painel e vai para Arquivados com os negócios dela. Desarquivar traz de volta.")}
        </DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="button" onClick={confirmar} disabled={arquivar.isPending}>
          {t("Arquivar")}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function FormExcluirOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const excluir = useExcluirOrigem();
  const arquivar = useArquivarOrigem();
  const [erro, setErro] = useState<string | null>(null);
  const funil = origens.funis.find((f) => f.id === id);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  const aoTerminar = {
    onSuccess: (r: Parameters<PropsDaJanela["onOrigens"]>[0]) => {
      onOrigens(r);
      onFechar();
    },
    onError: (err: unknown) => setErro(textoDoErro(err, t)),
  };

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{t("Excluir «{nome}» de vez?").replace("{nome}", funil.name)}</DialogTitle>
        <DialogDescription>
          {t(
            "A origem e as etapas dela são apagadas, e isso não se desfaz. Origem com negócios não é excluída: aí o caminho é arquivar.",
          )}
        </DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        {erro && !funil.is_archived && (
          <Button type="button" onClick={() => arquivar.mutate(id, aoTerminar)} disabled={arquivar.isPending}>
            {t("Arquivar")}
          </Button>
        )}
        <Button
          type="button"
          variant="destructive"
          onClick={() => excluir.mutate(id, aoTerminar)}
          disabled={excluir.isPending}
        >
          {t("Excluir de vez")}
        </Button>
      </DialogFooter>
    </div>
  );
}
```

- [ ] **Step 8: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-janelas-de-origens.test.tsx tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/selecao-longa-tem-busca.test.ts
```
Expected: PASS nos 3 arquivos (14 testes no das janelas). Se o i18n acusar texto fora de `t()`, envolva com `t("…")` literal e confira o espanhol.

- [ ] **Step 9: Commit**

```bash
git add hooks/escale/useOrigens.ts components/escale/origens/texto-do-erro.ts components/escale/origens/IconeDoGrupo.tsx components/escale/origens/JanelasDeOrigens.tsx components/escale/origens/JanelasDoGrupo.tsx components/escale/origens/JanelasDaOrigem.tsx tests/unit/escale-janelas-de-origens.test.tsx
git commit -m "feat(escale): janelas de adicionar, configurar, customizar, arquivar e excluir origens e grupos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: O painel (`<`, `^`, seta, `+`, ⋮, ocultos, arquivados)

**Files:**
- Create: `components/escale/origens/LinhasDoPainel.tsx`, `components/escale/origens/ArquivadosDoPainel.tsx`
- Modify: `components/escale/origens/PainelOrigens.tsx` (reescrito), `tests/unit/escale-painel-origens.test.tsx` (reescrito)
- Delete: `components/escale/origens/OrganizarOrigens.tsx`, `tests/unit/escale-organizar-origens.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`montarOrigens`, `filtrarArvore`, `funilDoCaminho`, `PreferenciasDoPainel`), Task 5 (`guardarPreferenciaDeOrigens`), Task 6 (`JanelasDeOrigens`, `Janela`, `IconeDoGrupo`, `textoDoErro`, `useCriarOrigem`, `useAtualizarGrupo`, `useDesarquivarOrigem`); `DropdownMenu*` de `@/components/ui/dropdown-menu`; ícones `CaretDown, CaretLeft, CaretRight, CaretUp, DotsThree, MagnifyingGlass, Plus`.
- Produces: `PainelOrigens({ origens: Origens; podeGerenciar: boolean; preferencias: PreferenciasDoPainel })` (usado pela Task 8).

- [ ] **Step 1: Reescrever o teste do painel (vai falhar)**

Replace the whole content of `tests/unit/escale-painel-origens.test.tsx` with:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/pipelines/f-leads",
  useRouter: () => ({ refresh: vi.fn(), push }),
}));
vi.mock("@/app/actions/escale/origens", () => ({ guardarPreferenciaDeOrigens: vi.fn(async () => undefined) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { guardarPreferenciaDeOrigens } from "@/app/actions/escale/origens";
import { apiClient } from "@/lib/api/client";
import type { Origens } from "@/lib/escale/origens/regras";
import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { PainelOrigens } from "@/components/escale/origens/PainelOrigens";

const G_OBRAS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const ORIGENS: Origens = {
  grupos: [
    { id: G_OBRAS, name: "INSS de obras", color: null, icon: "iniciais", is_archived: false },
    { id: "g-cred", name: "Credenciados", color: null, icon: "iniciais", is_archived: false },
    { id: "g-velho", name: "Antigo", color: null, icon: "iniciais", is_archived: true },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: G_OBRAS, is_archived: false, is_default: false },
    { id: "f-nayara", name: "Funil Nayara", group_id: "g-cred", is_archived: false, is_default: false },
    { id: "f-turma", name: "Turma 12", group_id: "g-cred", is_archived: false, is_default: false },
    { id: "f-pos", name: "Pós-venda", group_id: "g-velho", is_archived: false, is_default: false },
    { id: "f-morto", name: "Funil morto", group_id: "g-cred", is_archived: true, is_default: false },
  ],
};
const ABERTO: PreferenciasDoPainel = { painelAberto: true, listaAberta: true, ocultos: [] };

function renderizar(podeGerenciar = true, preferencias: PreferenciasDoPainel = ABERTO) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <PainelOrigens origens={ORIGENS} podeGerenciar={podeGerenciar} preferencias={preferencias} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

const lista = () => screen.getByRole("navigation", { name: "Funis por grupo" });
const setasDosGrupos = () =>
  within(lista())
    .getAllByRole("button", { name: /^(Abrir|Fechar) / })
    .map((b) => b.getAttribute("aria-label"));

beforeEach(() => {
  push.mockClear();
  vi.mocked(guardarPreferenciaDeOrigens).mockClear();
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("<PainelOrigens> — lista e navegação", () => {
  it("grupos ativos por nome, o grupo do funil aberto já aberto, e o último funil é lembrado", () => {
    renderizar();
    expect(setasDosGrupos()).toEqual(["Abrir Credenciados", "Fechar INSS de obras"]);
    expect(screen.getByRole("link", { name: "Leads INSS WhatsApp" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Funil Nayara" })).toBeNull();
    expect(screen.queryByText("Sem grupo")).toBeNull();
    expect(guardarPreferenciaDeOrigens).toHaveBeenCalledWith({ nome: "ultimo_funil", valor: "f-leads" });
  });

  it("a seta do grupo abre e fecha as origens dele", async () => {
    const user = renderizar();
    await user.click(within(lista()).getByRole("button", { name: "Abrir Credenciados" }));
    expect(screen.getByRole("link", { name: "Funil Nayara" })).toBeInTheDocument();
    await user.click(within(lista()).getByRole("button", { name: "Fechar Credenciados" }));
    expect(screen.queryByRole("link", { name: "Funil Nayara" })).toBeNull();
  });

  it("a lupa filtra sem acento", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Buscar grupo ou funil" }));
    await user.type(screen.getByRole("textbox", { name: "Buscar grupo ou funil" }), "nayara");
    expect(screen.getByRole("link", { name: "Funil Nayara" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Turma 12" })).toBeNull();
  });
});

describe("<PainelOrigens> — recolher", () => {
  it("< recolhe o painel inteiro e guarda a escolha", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Recolher o painel de origens" }));
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(guardarPreferenciaDeOrigens).toHaveBeenCalledWith({ nome: "painel", valor: "fechado" });
    await user.click(screen.getByRole("button", { name: "Abrir o painel de origens" }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
  });

  it("^ recolhe só a lista e guarda a escolha", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Recolher a lista de origens" }));
    expect(screen.queryByRole("navigation", { name: "Funis por grupo" })).toBeNull();
    expect(guardarPreferenciaDeOrigens).toHaveBeenCalledWith({ nome: "lista", valor: "fechada" });
  });

  it("respeita as preferências que vieram do servidor", () => {
    renderizar(true, { painelAberto: false, listaAberta: true, ocultos: [] });
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir o painel de origens" })).toBeInTheDocument();
  });
});

describe("<PainelOrigens> — + e ⋮ (gerente)", () => {
  it("o + de Origens oferece adicionar origem e grupo", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    await user.click(await screen.findByRole("menuitem", { name: "Adicionar grupo de origens" }));
    expect(await screen.findByRole("dialog", { name: "Adicionar grupo de origens" })).toBeInTheDocument();
  });

  it("o + do grupo cria a origem ali mesmo e abre o quadro dela", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { pipelines: [{ id: "f-nova", name: "Leads Insta" }], arquivados: [] } });
    vi.mocked(apiClient.put).mockResolvedValue({ data: ORIGENS });
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Nova origem em INSS de obras" }));
    await user.type(screen.getByRole("textbox", { name: "Nome da nova origem" }), "Leads Insta{Enter}");
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipelines", { name: "Leads Insta" });
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/app/pipelines/f-nova"));
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-nova/grupo", { group_id: G_OBRAS });
  });

  it("⋮ do grupo tem os itens da Clint, com Selecionar origens desligado", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de INSS de obras" }));
    const itens = (await screen.findAllByRole("menuitem")).map((i) => i.textContent);
    expect(itens).toEqual([
      "Configurações",
      "Selecionar origensEm breve",
      "Customizar",
      "Ocultar da minha barra lateral",
      "Arquivar",
      "Excluir",
    ]);
    expect(screen.getByRole("menuitem", { name: /Selecionar origens/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("Ocultar esconde o grupo só para quem clicou, e dá para mostrar de novo", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de INSS de obras" }));
    await user.click(await screen.findByRole("menuitem", { name: "Ocultar da minha barra lateral" }));
    expect(setasDosGrupos()).toEqual(["Abrir Credenciados"]);
    expect(guardarPreferenciaDeOrigens).toHaveBeenLastCalledWith({ nome: "ocultos", valor: [G_OBRAS] });
    await user.click(screen.getByRole("button", { name: "Mostrar" }));
    expect(setasDosGrupos()).toHaveLength(2);
  });

  it("⋮ da origem abre Configurações da origem", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de Leads INSS WhatsApp" }));
    const itens = (await screen.findAllByRole("menuitem")).map((i) => i.textContent);
    expect(itens).toEqual(["Configurações", "Selecionar origemEm breve", "Arquivar", "Excluir"]);
    await user.click(screen.getByRole("menuitem", { name: "Configurações" }));
    expect(await screen.findByRole("dialog", { name: "Configurações da origem" })).toBeInTheDocument();
  });

  it("Arquivados lista o grupo arquivado e a origem arquivada, com Desarquivar", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: ORIGENS });
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: /Arquivados \(2\)/ }));
    expect(screen.getByText(/Antigo/)).toBeInTheDocument();
    expect(screen.getByText("Funil morto")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Desarquivar Antigo" }));
    expect(apiClient.patch).toHaveBeenCalledWith(`/api/v1/pipeline-groups/g-velho`, { is_archived: false });
  });
});

describe("<PainelOrigens> — sem gerente", () => {
  it("vê grupos e origens, mas nada de +, ⋮ ou Arquivados", () => {
    renderizar(false);
    expect(setasDosGrupos()).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Adicionar" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Mais ações de/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Nova origem em/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Arquivados/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-painel-origens.test.tsx
```
Expected: FAIL — o painel da Fase 1A não tem `preferencias`, nem "Recolher o painel de origens", nem os ⋮.

- [ ] **Step 3: As linhas do painel**

Create `components/escale/origens/LinhasDoPainel.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useCriarOrigem } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import type { FunilDaOrigem, GrupoNaArvore, Origens } from "@/lib/escale/origens/regras";
import { CaretDown, CaretRight, DotsThree, Plus } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { IconeDoGrupo } from "./IconeDoGrupo";
import { textoDoErro } from "./texto-do-erro";

export type AcaoDoGrupo = "configurar" | "customizar" | "ocultar" | "arquivar" | "excluir";
export type AcaoDaOrigem = "configurar" | "arquivar" | "excluir";

export const BOTAO_DE_ICONE =
  "grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent-soft hover:text-foreground";
/** Os botões de gerente aparecem ao passar o mouse ou ao chegar pelo teclado, como na Clint. */
const SO_NO_FOCO = "flex items-center opacity-0 transition-opacity focus-within:opacity-100";

function Tres({ rotulo }: { rotulo: string }) {
  return (
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label={rotulo} className={BOTAO_DE_ICONE}>
        <DotsThree size={16} weight="bold" className="rotate-90" aria-hidden />
      </button>
    </DropdownMenuTrigger>
  );
}

function EmBreve({ children }: { children: string }) {
  const t = useT();
  return (
    <DropdownMenuItem disabled>
      {children}
      <span className="ml-auto pl-3 text-[10px] text-muted-foreground">{t("Em breve")}</span>
    </DropdownMenuItem>
  );
}

function MenuDoGrupo({ nome, oculto, onAcao }: { nome: string; oculto: boolean; onAcao: (a: AcaoDoGrupo) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <DropdownMenuContent align="start" side="right">
        <DropdownMenuItem onSelect={() => onAcao("configurar")}>{t("Configurações")}</DropdownMenuItem>
        <EmBreve>{t("Selecionar origens")}</EmBreve>
        <DropdownMenuItem onSelect={() => onAcao("customizar")}>{t("Customizar")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAcao("ocultar")}>
          {oculto ? t("Mostrar na minha barra lateral") : t("Ocultar da minha barra lateral")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAcao("arquivar")}>{t("Arquivar")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAcao("excluir")} className="text-destructive">
          {t("Excluir")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuDaOrigem({ nome, onAcao }: { nome: string; onAcao: (a: AcaoDaOrigem) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <DropdownMenuContent align="start" side="right">
        <DropdownMenuItem onSelect={() => onAcao("configurar")}>{t("Configurações")}</DropdownMenuItem>
        <EmBreve>{t("Selecionar origem")}</EmBreve>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAcao("arquivar")}>{t("Arquivar")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAcao("excluir")} className="text-destructive">
          {t("Excluir")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LinhaDaOrigem({
  funil,
  ativo,
  podeGerenciar,
  recuo,
  onAcao,
}: {
  funil: FunilDaOrigem;
  ativo: string | null;
  podeGerenciar: boolean;
  recuo: boolean;
  onAcao: (a: AcaoDaOrigem) => void;
}) {
  const atual = funil.id === ativo;
  return (
    <li
      className={cn(
        "group/origem flex items-center rounded-md pr-1",
        recuo && "ml-8",
        atual ? "bg-accent-soft" : "hover:bg-accent-soft",
      )}
    >
      <Link
        href={`/app/pipelines/${funil.id}`}
        aria-current={atual ? "page" : undefined}
        className={cn(
          "min-w-0 flex-1 truncate px-2 py-1 text-sm",
          atual ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {funil.name}
      </Link>
      {podeGerenciar && (
        <span className={cn(SO_NO_FOCO, "group-hover/origem:opacity-100")}>
          <MenuDaOrigem nome={funil.name} onAcao={onAcao} />
        </span>
      )}
    </li>
  );
}

function NovaOrigemNoGrupo({
  grupoId,
  onCriada,
  onCancelar,
}: {
  grupoId: string;
  onCriada: (origens: Origens, id: string) => void;
  onCancelar: () => void;
}) {
  const t = useT();
  const criar = useCriarOrigem();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function teclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancelar();
      return;
    }
    if (e.key !== "Enter" || !nome.trim() || criar.isPending) return;
    e.preventDefault();
    criar.mutate(
      { name: nome, groupId: grupoId },
      {
        onSuccess: (r) => onCriada(r.origens, r.id),
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <li className="ml-8 py-1 pr-2">
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={teclar}
        aria-label={t("Nome da nova origem")}
        placeholder={t("Nome da nova origem")}
        disabled={criar.isPending}
        maxLength={80}
        className="h-8"
      />
      {erro ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {erro}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">{t("Enter cria · Esc cancela")}</p>
      )}
    </li>
  );
}

export function LinhaDoGrupo({
  grupo,
  aberto,
  oculto,
  ativo,
  podeGerenciar,
  criandoAqui,
  onAlternar,
  onNovaOrigem,
  onAcao,
  onAcaoDaOrigem,
  onCriada,
  onCancelarCriacao,
}: {
  grupo: GrupoNaArvore;
  aberto: boolean;
  oculto: boolean;
  ativo: string | null;
  podeGerenciar: boolean;
  criandoAqui: boolean;
  onAlternar: () => void;
  onNovaOrigem: () => void;
  onAcao: (a: AcaoDoGrupo) => void;
  onAcaoDaOrigem: (funilId: string, a: AcaoDaOrigem) => void;
  onCriada: (origens: Origens, id: string) => void;
  onCancelarCriacao: () => void;
}) {
  const t = useT();
  return (
    <li>
      <div className="group/grupo flex items-center gap-1.5 rounded-md py-1 pl-0.5 pr-1 hover:bg-accent-soft">
        <button
          type="button"
          aria-expanded={aberto}
          aria-label={`${aberto ? t("Fechar") : t("Abrir")} ${grupo.name}`}
          onClick={onAlternar}
          className={BOTAO_DE_ICONE}
        >
          {aberto ? <CaretDown size={12} aria-hidden /> : <CaretRight size={12} aria-hidden />}
        </button>
        <IconeDoGrupo grupo={grupo} />
        <button
          type="button"
          tabIndex={-1}
          onClick={onAlternar}
          className="min-w-0 flex-1 truncate text-left text-sm font-semibold"
        >
          {grupo.name}
          {oculto && <span className="ml-1 text-xs font-normal text-muted-foreground">({t("oculto")})</span>}
        </button>
        {podeGerenciar && (
          <span className={cn(SO_NO_FOCO, "group-hover/grupo:opacity-100")}>
            <button
              type="button"
              aria-label={`${t("Nova origem em")} ${grupo.name}`}
              onClick={onNovaOrigem}
              className={BOTAO_DE_ICONE}
            >
              <Plus size={14} aria-hidden />
            </button>
            <MenuDoGrupo nome={grupo.name} oculto={oculto} onAcao={onAcao} />
          </span>
        )}
      </div>
      {aberto && (
        <ul className="space-y-0.5">
          {criandoAqui && (
            <NovaOrigemNoGrupo grupoId={grupo.id} onCriada={onCriada} onCancelar={onCancelarCriacao} />
          )}
          {grupo.funis.length === 0 && !criandoAqui ? (
            <li className="ml-10 py-1 text-xs text-muted-foreground">{t("Nenhum funil neste grupo.")}</li>
          ) : (
            grupo.funis.map((f) => (
              <LinhaDaOrigem
                key={f.id}
                funil={f}
                ativo={ativo}
                podeGerenciar={podeGerenciar}
                recuo
                onAcao={(a) => onAcaoDaOrigem(f.id, a)}
              />
            ))
          )}
        </ul>
      )}
    </li>
  );
}
```

Note: o botão do nome do grupo tem `tabIndex={-1}` — pelo teclado, a seta (que tem `aria-expanded`) é a única parada; o nome é atalho de mouse.

- [ ] **Step 4: A seção Arquivados**

Create `components/escale/origens/ArquivadosDoPainel.tsx`:

```tsx
"use client";
import { useState } from "react";

import { useAtualizarGrupo, useDesarquivarOrigem } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import type { ArvoreDeOrigens, Origens } from "@/lib/escale/origens/regras";
import { CaretDown, CaretRight } from "@/lib/ui/icons";

import { IconeDoGrupo } from "./IconeDoGrupo";
import { textoDoErro } from "./texto-do-erro";

/**
 * ARQUIVADOS no pé do painel (fork Escale, Fase 1B), só para gerente+: os
 * grupos arquivados (com as origens que voltam junto) e as origens arquivadas
 * uma a uma, cada um com Desarquivar.
 */
export function ArquivadosDoPainel({
  arvore,
  onOrigens,
}: {
  arvore: ArvoreDeOrigens;
  onOrigens: (origens: Origens) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const grupo = useAtualizarGrupo();
  const origem = useDesarquivarOrigem();
  const total = arvore.gruposArquivados.length + arvore.funisArquivados.length;
  if (total === 0) return null;

  const aoTerminar = {
    onSuccess: (r: Origens) => {
      setErro(null);
      onOrigens(r);
    },
    onError: (err: unknown) => setErro(textoDoErro(err, t)),
  };
  const ocupado = grupo.isPending || origem.isPending;

  return (
    <div className="mt-3 border-t pt-2">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <span>
          {t("Arquivados")} ({total})
        </span>
        {aberto ? <CaretDown size={12} aria-hidden /> : <CaretRight size={12} aria-hidden />}
      </button>
      {aberto && (
        <ul className="mt-1 space-y-0.5">
          {arvore.gruposArquivados.map((g) => {
            const n = g.funis.length;
            const quantas = n === 1 ? t("{n} origem") : t("{n} origens");
            return (
              <li key={g.id} className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                <IconeDoGrupo grupo={g} />
                <span className="min-w-0 flex-1 truncate">
                  {g.name} · {quantas.replace("{n}", String(n))}
                </span>
                <button
                  type="button"
                  aria-label={`${t("Desarquivar")} ${g.name}`}
                  disabled={ocupado}
                  onClick={() => grupo.mutate({ id: g.id, mudanca: { is_archived: false } }, aoTerminar)}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  {t("Desarquivar")}
                </button>
              </li>
            );
          })}
          {arvore.funisArquivados.map((f) => (
            <li key={f.id} className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`${t("Desarquivar")} ${f.name}`}
                disabled={ocupado}
                onClick={() => origem.mutate(f.id, aoTerminar)}
                className="text-xs font-semibold text-accent hover:underline"
              >
                {t("Desarquivar")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {erro && (
        <p role="alert" className="mt-1 px-2 text-xs text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: O painel**

Replace the whole content of `components/escale/origens/PainelOrigens.tsx` with:

```tsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { guardarPreferenciaDeOrigens } from "@/app/actions/escale/origens";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";
import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { filtrarArvore, funilDoCaminho, montarOrigens, type Origens } from "@/lib/escale/origens/regras";
import { CaretDown, CaretLeft, CaretRight, CaretUp, MagnifyingGlass, Plus } from "@/lib/ui/icons";

import { ArquivadosDoPainel } from "./ArquivadosDoPainel";
import { JanelasDeOrigens, type Janela } from "./JanelasDeOrigens";
import { BOTAO_DE_ICONE, LinhaDaOrigem, LinhaDoGrupo, type AcaoDaOrigem, type AcaoDoGrupo } from "./LinhasDoPainel";

const JANELA_DO_GRUPO: Record<Exclude<AcaoDoGrupo, "ocultar">, "config-grupo" | "customizar" | "arquivar-grupo" | "excluir-grupo"> = {
  configurar: "config-grupo",
  customizar: "customizar",
  arquivar: "arquivar-grupo",
  excluir: "excluir-grupo",
};
const JANELA_DA_ORIGEM: Record<AcaoDaOrigem, "config-origem" | "arquivar-origem" | "excluir-origem"> = {
  configurar: "config-origem",
  arquivar: "arquivar-origem",
  excluir: "excluir-origem",
};

/**
 * O PAINEL ORIGENS (fork Escale, Fases 1A e 1B): a coluna da esquerda de
 * Negócios na casca nova, como na Clint. `<` recolhe o painel, `^` recolhe a
 * lista, a seta abre o grupo, o `+` de cima adiciona origem ou grupo, o `+` do
 * grupo cria uma origem dentro dele, e os ⋮ levam às janelas
 * (`JanelasDeOrigens`). Só md+: no celular o quadro segue como sempre.
 *
 * As origens vêm do servidor (`ComOrigens`) e são trocadas pelo que cada
 * mutação devolve; quando o servidor manda novidade, o ajuste acontece durante
 * o render (padrão de `app/app/kanban/_client.tsx`). As preferências (painel,
 * lista, ocultos) também vêm do servidor, de cookie, e cada mudança é gravada
 * pela Server Action — nenhum `useState` lê o navegador.
 */
export function PainelOrigens({
  origens: doServidor,
  podeGerenciar,
  preferencias,
}: {
  origens: Origens;
  podeGerenciar: boolean;
  preferencias: PreferenciasDoPainel;
}) {
  const t = useT();
  const router = useRouter();
  const ativo = funilDoCaminho(usePathname() ?? "");

  const [origens, setOrigens] = useState<Origens>(doServidor);
  const [ultimoDoServidor, setUltimoDoServidor] = useState<Origens>(doServidor);
  if (doServidor !== ultimoDoServidor) {
    setUltimoDoServidor(doServidor);
    setOrigens(doServidor);
  }

  const [painelAberto, setPainelAberto] = useState(preferencias.painelAberto);
  const [listaAberta, setListaAberta] = useState(preferencias.listaAberta);
  const [ocultos, setOcultos] = useState<string[]>(preferencias.ocultos);
  const [verOcultos, setVerOcultos] = useState(false);
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => {
    const grupoDoAtivo = doServidor.funis.find((f) => f.id === ativo)?.group_id;
    return new Set(grupoDoAtivo ? [grupoDoAtivo] : []);
  });
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [novoEm, setNovoEm] = useState<string | null>(null);
  const [janela, setJanela] = useState<Janela | null>(null);

  // O "Negócios" do menu do topo abre o último funil aberto (`/app/escale/negocios`).
  useEffect(() => {
    if (ativo) void guardarPreferenciaDeOrigens({ nome: "ultimo_funil", valor: ativo });
  }, [ativo]);

  const arvore = useMemo(() => montarOrigens(origens), [origens]);
  const buscando = busca.trim().length > 0;
  const filtrada = buscando ? filtrarArvore(arvore, busca) : arvore;
  const visiveis = verOcultos ? filtrada.grupos : filtrada.grupos.filter((g) => !ocultos.includes(g.id));
  const quantosOcultos = arvore.grupos.filter((g) => ocultos.includes(g.id)).length;
  const nadaAchado = buscando && visiveis.length === 0 && filtrada.semGrupo.length === 0;

  function alternarPainel() {
    const proximo = !painelAberto;
    setPainelAberto(proximo);
    void guardarPreferenciaDeOrigens({ nome: "painel", valor: proximo ? "aberto" : "fechado" });
  }

  function alternarLista() {
    const proximo = !listaAberta;
    setListaAberta(proximo);
    void guardarPreferenciaDeOrigens({ nome: "lista", valor: proximo ? "aberta" : "fechada" });
  }

  function alternarGrupo(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function acaoDoGrupo(id: string, acao: AcaoDoGrupo) {
    if (acao === "ocultar") {
      const proximo = ocultos.includes(id) ? ocultos.filter((o) => o !== id) : [...ocultos, id];
      setOcultos(proximo);
      void guardarPreferenciaDeOrigens({ nome: "ocultos", valor: proximo });
      return;
    }
    setJanela({ tipo: JANELA_DO_GRUPO[acao], id });
  }

  function abrirOrigem(id: string) {
    router.push(`/app/pipelines/${id}`);
  }

  if (!painelAberto) {
    return (
      <div className="relative hidden w-0 shrink-0 md:block">
        <button
          type="button"
          aria-label={t("Abrir o painel de origens")}
          onClick={alternarPainel}
          className="absolute left-0 top-1 z-10 grid size-6 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
        >
          <CaretRight size={12} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label={t("Origens")}
      className="sticky top-0 hidden max-h-[calc(100dvh-6.5rem)] w-64 shrink-0 flex-col rounded-lg border bg-card md:flex"
    >
      <button
        type="button"
        aria-label={t("Recolher o painel de origens")}
        onClick={alternarPainel}
        className="absolute -right-3 top-2 z-10 grid size-6 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-foreground"
      >
        <CaretLeft size={12} aria-hidden />
      </button>

      <div className="flex items-center gap-1 border-b px-3 py-2">
        <h2 className="flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Origens")}</h2>
        {podeGerenciar && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={t("Adicionar")} className={BOTAO_DE_ICONE}>
                <Plus size={15} aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setJanela({ tipo: "adicionar-origem", grupoId: null })}>
                {t("Adicionar origem")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setJanela({ tipo: "adicionar-grupo" })}>
                {t("Adicionar grupo de origens")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <button
          type="button"
          aria-label={t("Buscar grupo ou funil")}
          aria-pressed={buscaAberta}
          onClick={() => {
            setBuscaAberta((v) => !v);
            setBusca("");
          }}
          className={BOTAO_DE_ICONE}
        >
          <MagnifyingGlass size={15} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={listaAberta ? t("Recolher a lista de origens") : t("Abrir a lista de origens")}
          aria-expanded={listaAberta}
          onClick={alternarLista}
          className={BOTAO_DE_ICONE}
        >
          {listaAberta ? <CaretUp size={14} aria-hidden /> : <CaretDown size={14} aria-hidden />}
        </button>
      </div>

      {buscaAberta && (
        <div className="px-3 pt-2">
          <Input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar grupo ou funil")}
            aria-label={t("Buscar grupo ou funil")}
            className="h-8"
          />
        </div>
      )}

      {listaAberta && (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <nav aria-label={t("Funis por grupo")}>
            <ul className="space-y-0.5">
              {visiveis.map((g) => (
                <LinhaDoGrupo
                  key={g.id}
                  grupo={g}
                  aberto={buscando || abertos.has(g.id) || novoEm === g.id}
                  oculto={ocultos.includes(g.id)}
                  ativo={ativo}
                  podeGerenciar={podeGerenciar}
                  criandoAqui={novoEm === g.id}
                  onAlternar={() => alternarGrupo(g.id)}
                  onNovaOrigem={() => setNovoEm(g.id)}
                  onAcao={(a) => acaoDoGrupo(g.id, a)}
                  onAcaoDaOrigem={(funilId, a) => setJanela({ tipo: JANELA_DA_ORIGEM[a], id: funilId })}
                  onCriada={(novas, id) => {
                    setOrigens(novas);
                    setNovoEm(null);
                    abrirOrigem(id);
                  }}
                  onCancelarCriacao={() => setNovoEm(null)}
                />
              ))}
            </ul>
            {filtrada.semGrupo.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("Sem grupo")}
                </p>
                <ul className="space-y-0.5">
                  {filtrada.semGrupo.map((f) => (
                    <LinhaDaOrigem
                      key={f.id}
                      funil={f}
                      ativo={ativo}
                      podeGerenciar={podeGerenciar}
                      recuo={false}
                      onAcao={(a) => setJanela({ tipo: JANELA_DA_ORIGEM[a], id: f.id })}
                    />
                  ))}
                </ul>
              </div>
            )}
          </nav>

          {nadaAchado && <p className="px-2 py-1 text-sm text-muted-foreground">{t("Nada encontrado.")}</p>}

          {quantosOcultos > 0 && (
            <div className="mt-3 flex items-center justify-between px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span>
                {(quantosOcultos === 1 ? t("{n} grupo oculto") : t("{n} grupos ocultos")).replace(
                  "{n}",
                  String(quantosOcultos),
                )}
              </span>
              <button type="button" onClick={() => setVerOcultos((v) => !v)} className="font-semibold hover:text-foreground">
                {verOcultos ? t("Esconder") : t("Mostrar")}
              </button>
            </div>
          )}

          {podeGerenciar && <ArquivadosDoPainel arvore={arvore} onOrigens={setOrigens} />}
        </div>
      )}

      {podeGerenciar && (
        <JanelasDeOrigens
          janela={janela}
          origens={origens}
          onFechar={() => setJanela(null)}
          onOrigens={setOrigens}
          onAbrirOrigem={abrirOrigem}
        />
      )}
    </aside>
  );
}
```

- [ ] **Step 6: Tirar a janela da Fase 1A**

```bash
git rm components/escale/origens/OrganizarOrigens.tsx tests/unit/escale-organizar-origens.test.tsx
grep -rn "OrganizarOrigens\|useRenomearGrupo" app components hooks lib tests --include=*.ts --include=*.tsx
```
Expected: o `grep` não acha nada.

- [ ] **Step 7: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-painel-origens.test.tsx tests/unit/escale-janelas-de-origens.test.tsx tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/hidratacao-useState-nao-le-o-navegador.test.ts tests/unit/selecao-longa-tem-busca.test.ts
```
Expected: PASS nos 5 arquivos (14 testes no do painel).

- [ ] **Step 8: Commit**

```bash
git add components/escale/origens/LinhasDoPainel.tsx components/escale/origens/ArquivadosDoPainel.tsx components/escale/origens/PainelOrigens.tsx tests/unit/escale-painel-origens.test.tsx
git commit -m "feat(escale): painel Origens com recolher, + e ⋮ de grupo e origem, ocultos e arquivados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: O encaixe lê os cookies, gates e PR

**Files:**
- Modify: `components/escale/origens/ComOrigens.tsx`, `tests/unit/escale-com-origens.test.tsx` (reescrito)

**Interfaces:**
- Consumes: `lerPreferenciasDoPainel` (Task 3), `PainelOrigens` com `preferencias` (Task 7).

- [ ] **Step 1: Reescrever o teste do encaixe (vai falhar)**

Replace the whole content of `tests/unit/escale-com-origens.test.tsx` with:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";

let cookies: Record<string, string> = {};
let papel = "manager";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nome: string) => (nome in cookies ? { value: cookies[nome] } : undefined) }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/pipelines/f-leads",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: papel })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/escale/origens/ler-origens", () => ({ lerOrigens: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: {} }));
vi.mock("@/app/actions/escale/origens", () => ({ guardarPreferenciaDeOrigens: vi.fn(async () => undefined) }));

import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { ComOrigens } from "@/components/escale/origens/ComOrigens";

const G = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";

function mostrar(elemento: ReactElement) {
  return render(<QueryClientProvider client={new QueryClient()}>{elemento}</QueryClientProvider>);
}

beforeEach(() => {
  cookies = { escale_menu: "topo" };
  papel = "manager";
  vi.mocked(lerOrigens).mockReset();
  vi.mocked(lerOrigens).mockResolvedValue({
    grupos: [{ id: G, name: "INSS de obras", color: null, icon: "iniciais", is_archived: false }],
    funis: [{ id: "f-leads", name: "Leads INSS WhatsApp", group_id: G, is_archived: false, is_default: true }],
  });
});

describe("<ComOrigens>", () => {
  it("com a casca nova, o painel Origens fica ao lado do quadro", async () => {
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
    expect(screen.getByText("o quadro")).toBeInTheDocument();
    expect(lerOrigens).toHaveBeenCalledWith(expect.anything(), "org-1");
  });

  it("com a lateral (ou sem a chave), é a tela de sempre e o banco nem é lido", async () => {
    for (const menu of ["lateral", undefined]) {
      cookies = menu ? { escale_menu: menu } : {};
      vi.mocked(lerOrigens).mockClear();
      const { unmount } = mostrar(await ComOrigens({ children: <p>o quadro</p> }));
      expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
      expect(lerOrigens).not.toHaveBeenCalled();
      unmount();
    }
  });

  it("o painel recolhido no cookie já chega recolhido", async () => {
    cookies = { escale_menu: "topo", escale_origens_painel: "fechado" };
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(screen.getByRole("button", { name: "Abrir o painel de origens" })).toBeInTheDocument();
  });

  it("o grupo oculto no cookie já chega oculto", async () => {
    cookies = { escale_menu: "topo", escale_origens_ocultos: G };
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.queryByRole("button", { name: /INSS de obras$/ })).toBeNull();
    expect(screen.getByText("1 grupo oculto")).toBeInTheDocument();
  });

  it("banco sem a migration (ou fora do ar): o quadro abre sem o painel", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(lerOrigens).mockRejectedValue(new Error('column "is_archived" does not exist'));
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(screen.getByText("o quadro")).toBeInTheDocument();
  });

  it("quem não é gerente vê o painel, mas não o + de Origens", async () => {
    papel = "agent";
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adicionar" })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-com-origens.test.tsx
```
Expected: FAIL — `ComOrigens` não passa `preferencias` (o painel quebra) e os casos de cookie falham.

- [ ] **Step 3: O encaixe lê as preferências**

Em `components/escale/origens/ComOrigens.tsx`, troque a linha:

```tsx
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
```

por:

```tsx
import { lerPreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
```

e troque:

```tsx
      <PainelOrigens origens={origens} podeGerenciar={ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager} />
```

por:

```tsx
      <PainelOrigens
        origens={origens}
        podeGerenciar={ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager}
        // Painel/lista recolhidos e grupos ocultos vêm de cookie: o primeiro render já sai certo.
        preferencias={lerPreferenciasDoPainel((nome) => store.get(nome)?.value)}
      />
```

- [ ] **Step 4: Rodar os testes da fase e o typecheck**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm vitest run tests/unit/escale-com-origens.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/escale-janelas-de-origens.test.tsx tests/unit/escale-grupos-de-funis-rotas.test.ts tests/unit/escale-origens-regras.test.ts tests/unit/escale-origens-preferencias.test.ts tests/unit/escale-negocios-entrada.test.ts tests/unit/escale-toda-origem-tem-grupo-migration.test.ts tests/unit/escale-grupos-de-funis-migration.test.ts tests/unit/escale-menu-do-topo.test.ts tests/unit/escale-menu-do-topo-tela.test.tsx "app/app/pipelines/[id]/trocar-funil.test.tsx" app/app/kanban/_client.test.tsx
corepack pnpm typecheck
```
Expected: 13 arquivos PASS; typecheck sem erros.

- [ ] **Step 5: Commit**

```bash
git add components/escale/origens/ComOrigens.tsx tests/unit/escale-com-origens.test.tsx
git commit -m "feat(escale): painel Origens chega com as preferências do cookie

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Lint, réguas e colisão de migration**

```bash
git diff --name-only escale-crm/main...HEAD | grep -E "\.(ts|tsx)$" | xargs corepack pnpm exec eslint
corepack pnpm lint:channels && corepack pnpm lint:role-rank
corepack pnpm checar:colisao-de-migration
```
Expected: eslint sem erro nos arquivos da branch (o erro antigo de `lib/escale/usa-tela-grande.ts` não está na branch); as duas réguas `ok`; o checador sem colisão para a `9002`.

- [ ] **Step 7: Suíte unitária, comparada com a main**

```bash
SP="$TEMP/fase1b"; mkdir -p "$SP"
corepack pnpm test:unit > "$SP/unit.log" 2>&1; grep -E "Test Files|Tests  " "$SP/unit.log"
grep -E "^ ❯ \|[a-z]+\| " "$SP/unit.log" | sed -E 's/^ ❯ \|[a-z]+\| ([^ ]+) .*/\1/' | sort -u > "$SP/falhas.txt"; cat "$SP/falhas.txt"
corepack pnpm vitest run $(cat "$SP/falhas.txt") > "$SP/branch.log" 2>&1
grep -E "^ (❯|×) .*\.test\.tsx? " "$SP/branch.log" | grep -oE "tests/unit/[^ ]+|app/[^ ]+\.test\.tsx?" | sort -u > "$SP/falha-branch.txt"
git switch -q --detach escale-crm/main
corepack pnpm vitest run $(cat "$SP/falha-branch.txt") > "$SP/main.log" 2>&1
git switch -q feat/fase-1b-origens
grep -E "^ (❯|×) .*\.test\.tsx? " "$SP/main.log" | grep -oE "tests/unit/[^ ]+|app/[^ ]+\.test\.tsx?" | sort -u > "$SP/falha-main.txt"
echo "=== falha na branch e NÃO na main:"; comm -23 "$SP/falha-branch.txt" "$SP/falha-main.txt"
```
Expected: nenhum arquivo `escale-*` em `falhas.txt`, e a última lista vazia (as falhas restantes são o ruído do Windows, iguais na main). Se aparecer arquivo na última lista, é defeito desta branch: investigue com superpowers:systematic-debugging e faça um commit `fix(escale): …`. Antes do `git switch`, `git status --porcelain` tem de estar vazio.

- [ ] **Step 8: Suíte de banco inteira**

```bash
corepack pnpm test:db > "$SP/db.log" 2>&1; grep -E "Test Files|Tests  |test:db verde" "$SP/db.log"
grep -E "FAIL|✗|×" "$SP/db.log" | head -20
```
Expected: todos os arquivos PASS e `==> test:db verde` (em 14/10 foram 440 arquivos; agora 441). Falha que cite `crm_pipeline_groups`, `group_id`, `9002` ou `sempre_em_grupo` é desta branch — em especial um teste do original que insere funil e espera `group_id` nulo, ou que exclui grupo: investigue antes de mexer.

- [ ] **Step 9: Push e PR**

```bash
git push -u escale-crm feat/fase-1b-origens
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-1b-origens \
  --title "feat(escale): Fase 1B — Origens como na Clint (abrir direto, +, ⋮, arquivar, toda origem tem grupo)" --body-file - <<'EOF'
## O que muda (só com o menu no topo ligado)
- **Negócios abre direto no quadro** do último funil aberto (na primeira vez, o funil padrão).
- Painel Origens: `<` recolhe o painel, `^` recolhe a lista, seta por grupo, `+` de Origens (Adicionar origem / Adicionar grupo de origens) e `+` no grupo (cria a origem ali mesmo).
- ⋮ do grupo: Configurações, Customizar (cor e ícone), Ocultar da minha barra lateral (só para quem clicou), Arquivar (as origens vão junto e continuam recebendo negócios), Excluir (pede para qual grupo as origens vão). "Selecionar origens" aparece desligado (Fase 1C).
- ⋮ da origem: Configurações (nome, grupo, origem padrão), Arquivar, Excluir (só sem negócios; com negócios, oferece arquivar). "Selecionar origem" desligado.
- Seção **Arquivados** no pé do painel, com Desarquivar.
- A janela "Organizar origens" da Fase 1A saiu: o `+` e os ⋮ fazem o que ela fazia.

Mockup aprovado: https://claude.ai/artifact/DuMqGvwf5mdNATiGbgQaco

## Banco — migration 9002
- **Toda origem tem grupo.** As origens que hoje estão sem grupo vão para um grupo **"Geral"** de cada organização (criado na hora). Origem criada por qualquer outro caminho (lista de funis, IA, API, organização nova) também cai no "Geral".
- O grupo ganha `color`, `icon` e `is_archived` (com CHECK).
- A exclusão de grupo com origens passa a ser recusada pelo banco: a tela move as origens antes.
- O mesmo SQL está no `baseline.sql` (logo depois do bloco 9001), então o `update.sh` aplica.
- Provas no Postgres: `tests/invariants/escale-toda-origem-tem-grupo.test.ts` e `escale-grupos-de-funis-rls.test.ts`.

## Onde toca o original
Blocos em pontos fixos: `baseline.sql` (bloco 9002), `lib/i18n/dicionario.ts`, `lib/audit/actions.ts` (3 códigos). O resto é arquivo do fork.

## Para publicar (decisão sua)
Mudança de banco: **backup antes** (`backup.sh`) e depois `update.sh --to <versão>`, só depois que o workflow das imagens terminar (`promover-stable`).

## Verificação
- [ ] Testes `escale-*` verdes; typecheck sem erro; eslint dos arquivos da branch sem erro
- [ ] `test:unit` sem regressão contra a main (ruído do Windows igual nas duas)
- [ ] `test:db` verde
- [ ] CI do fork verde (imagens amd64 e arm64)
- [ ] Depois de publicar, com o menu no topo: clicar em Negócios abre o último funil; criar grupo e origem pelo `+`; customizar; ocultar e mostrar; arquivar grupo (some com as origens) e desarquivar; excluir grupo escolhendo o destino; ⋮ da origem → Configurações (trocar grupo, tornar padrão); entrar como atendente e ver o painel sem `+`/⋮; desligar o menu do topo e ver Negócios como antes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

- [ ] **Step 10: Acompanhar o CI e entregar**

```bash
gh pr checks --repo rgisjr/escale-crm --watch --interval 30
```
Expected: verdes (`imagem-do-app-sobe` e `imagens-de-fundo-sobem`, amd64 e arm64). Informar o link do PR ao usuário. **Não mergear e não publicar**: merge, release, backup e atualização da VPS são decisões do usuário.
