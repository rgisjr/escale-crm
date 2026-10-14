# Fase 1C — Visualizações (quadro que junta origens, com acesso configurável) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao painel Origens a seção **Visualizações** da Clint. Uma visualização junta várias origens num quadro só, onde etapas com exatamente o mesmo nome somam os cards e etapas diferentes viram colunas próprias. No quadro dá para fazer tudo o que se faz no funil: arrastar, abrir o card, selecionar, agir em lote, filtrar e criar negócio. Cada visualização tem configuração de acesso: "Toda a organização" ou "Só as pessoas escolhidas". E o "Selecionar origens" do ⋮ do grupo e o "Selecionar origem" do ⋮ da origem passam a funcionar: abrem a seleção com caixinhas no painel e terminam em "Salvar como visualização".

**Architecture:** A migration do fork **9003** cria `crm_pipeline_views` (nome e acesso), `crm_pipeline_view_origens` (origens na ordem das colunas, FK composta para o funil, `on delete cascade`) e `crm_pipeline_view_pessoas` (quem vê quando o acesso é "escolhidos", FK composta para `user_organizations`). A RLS decide quem vê cada visualização. Os negócios dentro dela continuam sob a RLS de cada origem, porque o quadro combinado lê cada origem pela rota de sempre (`GET /api/v1/pipelines/:id/board`) com a sessão de quem olha. A gravação passa por `fn_escale_salvar_visualizacao` (security invoker, uma transação). O quadro combinado é do fork: `useQueries` lê os quadros das origens com a mesma chave de cache do funil, um `MotorDaOrigem` invisível por origem reaproveita `useBoard` (tempo real) e `useMoveCard` (arrasto com campos obrigatórios e retomada), e a `ColunaDaVisualizacao` desenha os `KanbanCard` do original com o `pipelineId` de cada card. As regras puras (colunas, soltura, seleção, validação) moram em `lib/escale/visualizacoes/regras.ts`.

**Tech Stack:** Postgres 15+/Supabase (RLS, plpgsql invoker), Next.js 16 App Router (Route Handler, Server Component), React 19, TypeScript estrito, Zod 4, TanStack Query 5 (`useQueries`), `@hello-pangea/dnd`, Radix (DropdownMenu, Dialog), Vitest + Testing Library, Tailwind 4, Phosphor (via `@/lib/ui/icons`).

**Referência visual:** `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\telas\01-014-grupos-origens-visualizacoes.md`, `01-026-configuracao-visualizacoes.md` (seleção com caixinhas, rodapé "N origens selecionadas · Rascunho", "Cancelar", "Salvar como visualização") e `01-010-kanban-v1.md` (seções ORIGENS / VISUALIZAÇÕES / RECENTES na barra da esquerda).

## Global Constraints

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`. Base: `escale-crm/main` (hoje `ea69fbea8`). Branch: `feat/fase-1c-visualizacoes`. PR para `rgisjr/escale-crm` base `main`; quem aprova é o usuário. Nunca dar push em `origin` (Rafael). Não mergear, não publicar release, não mexer na VPS nem no banco de produção.
- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`. Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- Migration do fork: número **9003**, arquivo `supabase/migrations/20261014200000_9003_visualizacoes_de_origens.sql`, com `-- manifest:` numa linha só na primeira linha. **Não** acrescentar linha no `supabase/migrations/MANIFEST.md`.
- O MESMO SQL vai para `supabase/baseline.sql`, logo ANTES da linha `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (portanto logo DEPOIS do bloco 9002), com o cabeçalho `-- ---- FORK ESCALE · visualizações de origens (migration 9003) ----`. Nunca no fim do arquivo.
- **Princípio do produto (decisão do usuário, 14/10): quase tudo tem configuração de acesso, e os filtros filtram por quase tudo.** Aqui: a visualização tem acesso configurável ("Toda a organização" / "Só as pessoas escolhidas"; gerente e admin sempre veem). O que cada pessoa vê DENTRO dela vem das permissões de cada origem: o quadro lê cada origem com a sessão de quem olha, nunca com o cliente de serviço, e nunca copia permissão. O quadro usa o mesmo `FilterBar` do funil.
- Quem cria, edita e exclui visualização: gerente ou admin (`requireRole("manager")` + RLS). Ver e abrir: quem o acesso deixa.
- Etapas juntam pelo nome **exato** depois de tirar espaço das pontas (`"Proposta"` ≠ `"proposta"`). Ordem das colunas: as origens na ordem da visualização; etapa nova entra logo depois da última coluna daquela origem.
- Arrastar no quadro combinado leva o card para a etapa de mesmo nome **na origem do card**. Origem sem essa etapa recusa com aviso. Renomear etapa NÃO existe no quadro combinado (cabeçalho só leitura): renomear é na própria origem.
- Ação em lote: com cards de UMA origem selecionados, a barra do funil (`BulkActionBar`) inteira; com cards de várias origens, um aviso pedindo uma origem por vez, e "Limpar seleção".
- Uma visualização junta de **1 a 20** origens (cada origem é um quadro inteiro lido). Origem arquivada ou apagada some do quadro sozinha.
- Recentes fica para depois (decisão do usuário). "Selecionar origens/origem" deixam de ser "Em breve".
- Rotas: sessão por cookie, `requireSupportWrite()` + `requireRole("manager")` em todo handler de escrita (GET usa `requireRole("viewer")`), `organization_id` sempre da sessão, toda leitura e escrita filtrada por `organization_id`, resposta `{ data: Visualizacao[] }` relida do banco.
- Os blocos do fork em arquivos do original vão em pontos fixos do MEIO: dicionário logo depois da entrada `"A origem foi criada, mas não apareceu na lista. Recarregue a página.": { … },` (fim do bloco da Fase 1B); auditoria logo depois de `"pipeline_group.unarchived",`; varredura de RLS logo depois da entrada `crm_pipeline_groups` de `PROVA_PROPRIA`.
- Todo texto de tela passa por `t()` com literal e tem espanhol no dicionário. Chave repetida no dicionário quebra o typecheck (palavras soltas como `Cancelar`, `Salvar`, `Selecionar`, `Configurações`, `Excluir`, `Fechar`, `vazio`, `Rascunho` JÁ existem — não repetir).
- O painel só existe com a casca nova ligada (`escale_menu=topo`) e só em `md+`. Com a lateral, nada muda.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; corpo do PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Testes que falham NESTA máquina Windows e também em `escale-crm/main` (pdfjs com caminho `C:\…`, `spawnSync bash ENOENT`, `chmod 600`, caminho com espaço) não são regressão — ver memória `sincronizar-com-o-rafael`. Regressão é teste que passa em `escale-crm/main` e falha na branch.
- `pnpm test:db` precisa do Docker Desktop rodando. Se `docker info` falhar, PARE e peça ao usuário para abrir o Docker (se travar em "wsl-keepalive", a cura é `wsl --shutdown` e abrir o Docker de novo, com OK do usuário).

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `supabase/migrations/20261014200000_9003_visualizacoes_de_origens.sql` | novo | 3 tabelas, FKs compostas, RLS, função de gravação, travas do suporte |
| `supabase/baseline.sql` | alterado (bloco no meio) | o mesmo SQL para o self-host |
| `tests/unit/escale-visualizacoes-migration.test.ts` | novo | migration ↔ baseline, posição, forma do SQL |
| `tests/invariants/escale-visualizacoes-rls.test.ts` | novo | prova no Postgres: isolamento, acesso, papel, FKs, função |
| `tests/invariants/rls-completude-varredura.test.ts` | alterado (3 entradas) | registra a prova das tabelas novas |
| `lib/escale/visualizacoes/regras.ts` | novo | tipos, validação, seleção, colunas combinadas, soltura |
| `tests/unit/escale-visualizacoes-regras.test.ts` | novo | regras puras |
| `lib/escale/origens/regras.ts` | alterado | `funilDoCaminho` ignora `/app/pipelines/visualizacoes/…` |
| `tests/unit/escale-origens-regras.test.ts` | alterado (1 caso) | idem |
| `lib/i18n/dicionario.ts` | alterado (bloco) | textos novos em espanhol |
| `lib/escale/visualizacoes/ler-visualizacoes.ts` | novo | lê visualizações + origens + pessoas (RLS decide quais) |
| `lib/escale/visualizacoes/respostas.ts` | novo | releitura e erros do banco com nome |
| `lib/audit/actions.ts` | alterado (bloco) | 3 códigos novos |
| `app/api/v1/pipeline-views/route.ts` | novo | GET lista, POST cria |
| `app/api/v1/pipeline-views/[id]/route.ts` | novo | PATCH parcial, DELETE |
| `tests/unit/escale-visualizacoes-rotas.test.ts` | novo | as quatro rotas |
| `hooks/escale/useQuadrosDaVisualizacao.ts` | novo | lê os quadros das origens (mesma cache do funil) |
| `components/escale/visualizacoes/MotorDaOrigem.tsx` | novo | tempo real + arrasto de UMA origem, invisível |
| `components/escale/visualizacoes/ColunaDaVisualizacao.tsx` | novo | coluna combinada com os cards do original |
| `components/escale/visualizacoes/QuadroCombinado.tsx` | novo | DnD, dossiê, campos obrigatórios, retomada |
| `tests/unit/escale-quadro-combinado.test.tsx` | novo | colunas, origem no card, dossiê |
| `components/escale/visualizacoes/LoteDaVisualizacao.tsx` | novo | barra de lote por origem |
| `components/escale/visualizacoes/QuadroDaVisualizacao.tsx` | novo | a página: título, novo negócio, filtros, quadro, lote |
| `app/app/pipelines/visualizacoes/[id]/page.tsx` | novo | Server Component: acha a visualização e as origens vivas |
| `tests/unit/escale-quadro-da-visualizacao.test.tsx` | novo | página, lote, novo negócio, filtros |
| `hooks/escale/useVisualizacoes.ts` | novo | mutações (TanStack Query) |
| `components/escale/visualizacoes/JanelasDaVisualizacao.tsx` | novo | nova, configurar (nome + acesso), excluir |
| `components/escale/visualizacoes/SecaoVisualizacoes.tsx` | novo | a seção do painel com o + e o ⋮ |
| `components/escale/visualizacoes/RodapeDaSelecao.tsx` | novo | "N origens selecionadas · Rascunho", Cancelar, Salvar |
| `tests/unit/escale-janelas-da-visualizacao.test.tsx` | novo | as janelas |
| `components/escale/origens/LinhasDoPainel.tsx` | alterado | caixinhas no modo seleção; ⋮ "Selecionar" ligado |
| `components/escale/origens/PainelOrigens.tsx` | alterado | seção Visualizações + modo seleção |
| `tests/unit/escale-painel-origens.test.tsx` | alterado | ⋮ ligado, seleção, seção |
| `components/escale/origens/ComOrigens.tsx` | alterado | lê as visualizações (falha = lista vazia) |
| `tests/unit/escale-com-origens.test.tsx` | alterado | idem |

---

### Task 1: Branch, migration 9003 e o bloco do baseline

**Files:**
- Create: `supabase/migrations/20261014200000_9003_visualizacoes_de_origens.sql`, `tests/unit/escale-visualizacoes-migration.test.ts`
- Modify: `supabase/baseline.sql` (bloco antes da linha da 0323, logo depois do bloco 9002)
- Copy: este plano para `docs/superpowers/plans/2026-10-14-fase-1c-visualizacoes.md` no repositório

**Interfaces:**
- Produces: tabelas `public.crm_pipeline_views (id, organization_id, name, acesso, created_at, updated_at)` com CHECKs `crm_pipeline_views_nome_valido` (1–60) e `crm_pipeline_views_acesso_valido` (`todos|escolhidos`) e índice único `uq_crm_pipeline_views_org_nome`; `public.crm_pipeline_view_origens (view_id, organization_id, pipeline_id, position)` com FKs `crm_pipeline_view_origens_view_fk` e `crm_pipeline_view_origens_funil_fk` (cascade); `public.crm_pipeline_view_pessoas (view_id, organization_id, user_id)` com FKs `crm_pipeline_view_pessoas_view_fk` e `crm_pipeline_view_pessoas_membro_fk` (cascade); função `public.fn_escale_salvar_visualizacao(p_id uuid, p_org uuid, p_nome text, p_acesso text, p_origens uuid[], p_pessoas uuid[]) returns void`. As Tasks 2 e 4 dependem disso.

- [ ] **Step 1: Branch e plano no repositório**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git switch -c feat/fase-1c-visualizacoes escale-crm/main
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-14-fase-1c-visualizacoes.md" docs/superpowers/plans/
```

- [ ] **Step 2: Escrever o teste estático (vai falhar)**

Create `tests/unit/escale-visualizacoes-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * VISUALIZAÇÕES DE ORIGENS (fork Escale, migration 9003): a migration e o bloco
 * do baseline são o MESMO SQL, e o bloco mora no ponto fixo do fork — depois
 * do bloco 9002 e antes do bloco da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261014200000_9003_visualizacoes_de_origens.sql";
const MIGRATION_9002 = "supabase/migrations/20261014150000_9002_toda_origem_tem_grupo.sql";
const CABECALHO = "-- ---- FORK ESCALE · visualizações de origens (migration 9003) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("visualizações de origens: migration 9003 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença", () => {
    const migration = ler(MIGRATION);
    expect(migration.length).toBeGreaterThan(3000);
    expect(ler("supabase/baseline.sql").includes(migration)).toBe(true);
  });

  it("o bloco mora depois do bloco 9002 e antes do bloco da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const de9002 = baseline.indexOf(ler(MIGRATION_9002));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(ler(MIGRATION));
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9002).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9002);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("as três tabelas têm RLS e só gerente ou admin escreve", () => {
    const sql = ler(MIGRATION);
    for (const tabela of ["crm_pipeline_views", "crm_pipeline_view_origens", "crm_pipeline_view_pessoas"]) {
      expect(sql).toContain(`alter table public.${tabela} enable row level security;`);
      expect(sql).toContain(`create policy ${tabela}_manager_write on public.${tabela}`);
      expect(sql).toContain(`revoke all on public.${tabela} from anon;`);
    }
    expect(sql).toContain("acesso = 'todos'");
  });

  it("as FKs são compostas e apagam junto, sem cruzar organização", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("references public.crm_pipelines (organization_id, id) on delete cascade");
    expect(sql).toContain("references public.user_organizations (user_id, organization_id) on delete cascade");
    expect(sql).toContain("references public.crm_pipeline_views (organization_id, id) on delete cascade");
  });

  it("o alvo da FK do funil é criado só se ainda não existe um índice único igual", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("and i.indisunique");
    expect(sql).toContain("create unique index uq_crm_pipelines_org_id on public.crm_pipelines (organization_id, id);");
  });

  it("a função de gravação roda como quem chama, com search_path fixo e fechada a anon", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("security invoker");
    expect(sql).not.toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).toContain(
      "revoke all on function public.fn_escale_salvar_visualizacao(uuid, uuid, text, text, uuid[], uuid[]) from public, anon;",
    );
    expect(sql).toContain("do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-visualizacoes-migration.test.ts
```
Expected: FAIL — "a migration existe" (`existsSync` false) e os demais com ENOENT.

- [ ] **Step 4: Escrever a migration**

Create `supabase/migrations/20261014200000_9003_visualizacoes_de_origens.sql` (a primeira linha é UMA linha só):

```sql
-- manifest: **Visualizações de origens (fork Escale, Fase 1C — painel Origens).** Três tabelas novas: `crm_pipeline_views` (nome único por organização sem olhar caixa, e `acesso` = `todos` ou `escolhidos`), `crm_pipeline_view_origens` (as origens de cada visualização, na ordem das colunas, por FK COMPOSTA para `crm_pipelines (organization_id, id)` com `on delete cascade`) e `crm_pipeline_view_pessoas` (quem vê quando o acesso é `escolhidos`, por FK composta para `user_organizations (user_id, organization_id)` com `on delete cascade`). RLS: acesso `todos` é visto pela organização inteira; `escolhidos`, só por gerente/admin e pelas pessoas escolhidas; só gerente ou admin escreve. Os negócios dentro da visualização continuam sob a RLS de cada origem. `fn_escale_salvar_visualizacao` grava a visualização e as duas listas numa transação, como quem chama (security invoker).
-- 9003: visualizações de origens (fork Escale).

-- Alvo da FK composta das origens: índice único (organization_id, id) em
-- crm_pipelines. No baseline este bloco roda ANTES do bloco que cria esse
-- índice para as campanhas; criar só se não houver índice único sobre
-- exatamente essas duas colunas, com o MESMO nome que aquele bloco usaria (ele
-- confere pelas colunas e então pula).
do $alvo$
begin
  if not exists (
    select 1
      from pg_index i
      join pg_class t on t.oid = i.indrelid
     where t.relname = 'crm_pipelines'
       and t.relnamespace = 'public'::regnamespace
       and i.indisunique
       and i.indnatts = 2
       and (
         select array_agg(a.attname::text order by k.ord)
           from unnest(i.indkey) with ordinality as k(attnum, ord)
           join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
       ) = array['organization_id', 'id']
  ) then
    create unique index uq_crm_pipelines_org_id on public.crm_pipelines (organization_id, id);
  end if;
end $alvo$;

create table if not exists public.crm_pipeline_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  acesso text not null default 'todos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_pipeline_views_nome_valido check (char_length(btrim(name)) between 1 and 60),
  constraint crm_pipeline_views_acesso_valido check (acesso in ('todos', 'escolhidos')),
  constraint crm_pipeline_views_org_id_key unique (organization_id, id)
);

-- Nome único por organização, sem olhar caixa (a rota confere antes, também sem
-- acento); o índice é a guarda contra corrida entre duas abas.
create unique index if not exists uq_crm_pipeline_views_org_nome
  on public.crm_pipeline_views (organization_id, lower(btrim(name)));

create table if not exists public.crm_pipeline_view_origens (
  view_id uuid not null,
  organization_id uuid not null,
  pipeline_id uuid not null,
  position integer not null,
  primary key (view_id, pipeline_id),
  constraint crm_pipeline_view_origens_view_fk foreign key (organization_id, view_id)
    references public.crm_pipeline_views (organization_id, id) on delete cascade,
  constraint crm_pipeline_view_origens_funil_fk foreign key (organization_id, pipeline_id)
    references public.crm_pipelines (organization_id, id) on delete cascade
);

create index if not exists idx_crm_pipeline_view_origens_funil
  on public.crm_pipeline_view_origens (organization_id, pipeline_id);

create table if not exists public.crm_pipeline_view_pessoas (
  view_id uuid not null,
  organization_id uuid not null,
  user_id uuid not null,
  primary key (view_id, user_id),
  constraint crm_pipeline_view_pessoas_view_fk foreign key (organization_id, view_id)
    references public.crm_pipeline_views (organization_id, id) on delete cascade,
  constraint crm_pipeline_view_pessoas_membro_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create index if not exists idx_crm_pipeline_view_pessoas_membro
  on public.crm_pipeline_view_pessoas (user_id, organization_id);

alter table public.crm_pipeline_views enable row level security;
alter table public.crm_pipeline_view_origens enable row level security;
alter table public.crm_pipeline_view_pessoas enable row level security;

drop policy if exists crm_pipeline_views_select on public.crm_pipeline_views;
drop policy if exists crm_pipeline_views_manager_write on public.crm_pipeline_views;
drop policy if exists crm_pipeline_view_origens_select on public.crm_pipeline_view_origens;
drop policy if exists crm_pipeline_view_origens_manager_write on public.crm_pipeline_view_origens;
drop policy if exists crm_pipeline_view_pessoas_select on public.crm_pipeline_view_pessoas;
drop policy if exists crm_pipeline_view_pessoas_manager_write on public.crm_pipeline_view_pessoas;

-- Quem vê a visualização: a organização inteira quando o acesso é `todos`;
-- quando é `escolhidos`, gerente/admin e as pessoas da lista. O que aparece
-- DENTRO dela não é decidido aqui: cada origem é lida com a sessão de quem olha.
create policy crm_pipeline_views_select on public.crm_pipeline_views
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (acesso = 'todos'
             or public.fn_role_at_least(organization_id, 'manager')
             or exists (
               select 1 from public.crm_pipeline_view_pessoas p
                where p.view_id = crm_pipeline_views.id
                  and p.user_id = auth.uid()
             )))
  );

-- As origens seguem a visualização: a subconsulta roda sob a RLS acima.
create policy crm_pipeline_view_origens_select on public.crm_pipeline_view_origens
  for select using (
    exists (select 1 from public.crm_pipeline_views v where v.id = crm_pipeline_view_origens.view_id)
  );

-- A lista de pessoas: cada um vê a própria linha; gerente/admin veem todas
-- (para editar). Não consulta crm_pipeline_views — sem ciclo entre policies.
create policy crm_pipeline_view_pessoas_select on public.crm_pipeline_view_pessoas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager')))
  );

-- Escrever é configuração: manager+, a mesma régua dos grupos (migration 9001).
create policy crm_pipeline_views_manager_write on public.crm_pipeline_views
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

create policy crm_pipeline_view_origens_manager_write on public.crm_pipeline_view_origens
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

create policy crm_pipeline_view_pessoas_manager_write on public.crm_pipeline_view_pessoas
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

revoke all on public.crm_pipeline_views from anon;
revoke all on public.crm_pipeline_view_origens from anon;
revoke all on public.crm_pipeline_view_pessoas from anon;
grant select, insert, update, delete on public.crm_pipeline_views to authenticated;
grant select, insert, update, delete on public.crm_pipeline_view_origens to authenticated;
grant select, insert, update, delete on public.crm_pipeline_view_pessoas to authenticated;
grant all on public.crm_pipeline_views to service_role;
grant all on public.crm_pipeline_view_origens to service_role;
grant all on public.crm_pipeline_view_pessoas to service_role;

drop trigger if exists trg_crm_pipeline_views_updated_at on public.crm_pipeline_views;
create trigger trg_crm_pipeline_views_updated_at
  before update on public.crm_pipeline_views
  for each row execute function public.fn_set_updated_at();

-- Grava a visualização e as duas listas numa transação só. INVOKER: a RLS de
-- quem chama vale em cada comando (agent e viewer param no 42501), e as FKs
-- compostas recusam origem ou pessoa de outra organização (23503).
create or replace function public.fn_escale_salvar_visualizacao(
  p_id uuid,
  p_org uuid,
  p_nome text,
  p_acesso text,
  p_origens uuid[],
  p_pessoas uuid[]
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if coalesce(cardinality(p_origens), 0) not between 1 and 20 then
    raise exception 'uma visualização junta de 1 a 20 origens' using errcode = '22023';
  end if;

  update public.crm_pipeline_views
     set name = btrim(p_nome), acesso = p_acesso
   where id = p_id and organization_id = p_org;
  if not found then
    insert into public.crm_pipeline_views (id, organization_id, name, acesso)
      values (p_id, p_org, btrim(p_nome), p_acesso);
  end if;

  delete from public.crm_pipeline_view_origens where view_id = p_id and organization_id = p_org;
  insert into public.crm_pipeline_view_origens (view_id, organization_id, pipeline_id, position)
    select p_id, p_org, o.pipeline_id, o.ordem::integer
      from unnest(p_origens) with ordinality as o(pipeline_id, ordem);

  delete from public.crm_pipeline_view_pessoas where view_id = p_id and organization_id = p_org;
  if p_acesso = 'escolhidos' then
    insert into public.crm_pipeline_view_pessoas (view_id, organization_id, user_id)
      select distinct p_id, p_org, u.user_id
        from unnest(coalesce(p_pessoas, '{}'::uuid[])) as u(user_id);
  end if;
end;
$$;

revoke all on function public.fn_escale_salvar_visualizacao(uuid, uuid, text, text, uuid[], uuid[]) from public, anon;
grant execute on function public.fn_escale_salvar_visualizacao(uuid, uuid, text, text, uuid[], uuid[])
  to authenticated, service_role;

comment on table public.crm_pipeline_views is
  'Visualizações de origens (fork Escale, migration 9003): um quadro que junta várias origens. acesso = todos (a organização inteira vê) ou escolhidos (gerente/admin e as pessoas de crm_pipeline_view_pessoas). Os negócios dentro dela seguem a RLS de cada origem.';
comment on table public.crm_pipeline_view_origens is
  'As origens (crm_pipelines) de cada visualização, na ordem das colunas (position). FK composta: origem da mesma organização; apagar a origem tira ela da visualização.';
comment on table public.crm_pipeline_view_pessoas is
  'Quem vê a visualização quando o acesso é escolhidos. FK composta para user_organizations: só membro da organização; sair da organização tira a pessoa da lista.';
comment on function public.fn_escale_salvar_visualizacao(uuid, uuid, text, text, uuid[], uuid[]) is
  'Cria ou atualiza a visualização p_id da organização p_org e troca as origens (na ordem de p_origens) e as pessoas (só com acesso escolhidos) numa transação. Security invoker: a RLS de quem chama vale. Chamador: app/api/v1/pipeline-views.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
-- Na cadeia de migrations, esta chamada é o que dá as três travas
-- support_write_* às tabelas novas. No baseline.sql o bloco mora ANTES da
-- última chamada do arquivo, que também as cobre; chamar aqui é idempotente.
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

- [ ] **Step 5: Pôr o mesmo SQL no baseline, no ponto fixo**

Da raiz do repositório:

```bash
node -e '
const fs = require("fs");
const MIG = "supabase/migrations/20261014200000_9003_visualizacoes_de_origens.sql";
const BASE = "supabase/baseline.sql";
const ANCORA = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const CAB = "-- ---- FORK ESCALE · visualizações de origens (migration 9003) ----";
const base = fs.readFileSync(BASE, "utf8");
if (base.includes(CAB)) throw new Error("o bloco 9003 já está no baseline");
if (!base.includes("-- ---- FORK ESCALE · toda origem tem grupo (migration 9002) ----")) throw new Error("bloco 9002 ausente");
const i = base.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 0323 não encontrada");
const eol = base.includes("\r\n") ? "\r\n" : "\n";
let mig = fs.readFileSync(MIG, "utf8").replace(/\r\n/g, "\n");
if (!mig.endsWith("\n")) mig += "\n";
const bloco = (CAB + "\n" + mig + "\n").replace(/\n/g, eol);
fs.writeFileSync(BASE, base.slice(0, i) + bloco + base.slice(i));
console.log("bloco 9003 inserido antes da linha", base.slice(0, i).split("\n").length);
'
```
Expected: `bloco 9003 inserido antes da linha 327xx` (em torno de 32714).

- [ ] **Step 6: Rodar o teste e os gates do baseline**

```bash
corepack pnpm vitest run tests/unit/escale-visualizacoes-migration.test.ts tests/unit/escale-toda-origem-tem-grupo-migration.test.ts tests/unit/escale-grupos-de-funis-migration.test.ts tests/unit/baseline-reaplicavel.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/check-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/apendice-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/sonda-do-baseline-ancora-na-ultima-definicao.test.ts tests/unit/baseline-no-piso-do-postgres.test.ts tests/unit/varredura-anon-e-o-ultimo-bloco.test.ts
```
Expected: PASS nos 10 arquivos. Se um gate do baseline reclamar de algo da 9003 (por exemplo, uma regra sobre `grant`/`revoke` de função ou sobre índice), corrija a MIGRATION, refaça o bloco (`git checkout -- supabase/baseline.sql` e o Step 5) e rode de novo.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261014200000_9003_visualizacoes_de_origens.sql supabase/baseline.sql tests/unit/escale-visualizacoes-migration.test.ts docs/superpowers/plans/2026-10-14-fase-1c-visualizacoes.md
git commit -m "feat(escale): visualizações de origens (migration 9003)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Prova no Postgres

**Files:**
- Create: `tests/invariants/escale-visualizacoes-rls.test.ts`
- Modify: `tests/invariants/rls-completude-varredura.test.ts` (3 entradas em `PROVA_PROPRIA`, logo depois da de `crm_pipeline_groups`)

**Interfaces:**
- Consumes: schema da Task 1; `seedGov`, `sql`, `lastLine`, `countAs`, `writeCountAs`, `GOV_ORG`, `GOV_PIPELINE`, `GOV_VIEWER`, `GOV_AGENT_A`, `GOV_AGENT_B`, `GOV_MANAGER` de `tests/invariants/gov-helpers.ts` (`sql` roda `psql -tA`: colunas separadas por `|`; `countAs`/`writeCountAs` rodam como `authenticated` com o JWT do usuário).
- Produces: nada (é prova).

- [ ] **Step 1: Escrever a prova da 9003**

Create `tests/invariants/escale-visualizacoes-rls.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
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
 * VISUALIZAÇÕES DE ORIGENS (fork Escale, migration 9003) — prova contra Postgres
 * real: dois tenants por JWT, o acesso "todos" e "escolhidos", quem escreve, as
 * FKs compostas e a função de gravação rodando como quem chama.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const ORG_B = "e5ca1e00-9003-4000-8000-000000000001";
const USER_B = "e5ca1e00-9003-4000-8000-000000000002";
const FUNIL_B = "e5ca1e00-9003-4000-8000-000000000003";
const FUNIL_A2 = "e5ca1e00-9003-4000-8000-000000000004";
const V_TODOS = "e5ca1e00-9003-4000-8000-000000000011";
const V_ESCOLHIDOS = "e5ca1e00-9003-4000-8000-000000000012";
const V_B = "e5ca1e00-9003-4000-8000-000000000013";
const V_RPC = "e5ca1e00-9003-4000-8000-000000000014";
const V_RECUSADA = "e5ca1e00-9003-4000-8000-000000000015";

/** Roda o script como `authenticated` com o JWT do usuário; devolve a última linha. */
function comoUsuario(userId: string, script: string): string {
  return lastLine(
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
      ${script}
    `),
  );
}

const salvar = (id: string, nome: string, acesso: string, origens: string[], pessoas: string[]) =>
  `select public.fn_escale_salvar_visualizacao('${id}', '${GOV_ORG}', '${nome}', '${acesso}',
     array[${origens.map((o) => `'${o}'`).join(", ")}]::uuid[],
     array[${pessoas.map((p) => `'${p}'`).join(", ")}]::uuid[]);`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email)
      values ('${USER_B}', 'escale-visualizacoes-b@invariant.test')
      on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-visualizacoes-b', 'Escale Visualizações Org B', 'Escale VB')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${FUNIL_B}', '${ORG_B}', 'Funil da B', 'escale-vis-funil-b'),
             ('${FUNIL_A2}', '${GOV_ORG}', 'Segundo funil da A', 'escale-vis-funil-a2')
      on conflict do nothing;
    insert into public.crm_pipeline_views (id, organization_id, name, acesso)
      values ('${V_TODOS}', '${GOV_ORG}', 'Todos os funis', 'todos'),
             ('${V_ESCOLHIDOS}', '${GOV_ORG}', 'Só da Ana', 'escolhidos'),
             ('${V_B}', '${ORG_B}', 'Todos os funis', 'todos')
      on conflict do nothing;
    insert into public.crm_pipeline_view_origens (view_id, organization_id, pipeline_id, position)
      values ('${V_TODOS}', '${GOV_ORG}', '${GOV_PIPELINE}', 1),
             ('${V_TODOS}', '${GOV_ORG}', '${FUNIL_A2}', 2),
             ('${V_ESCOLHIDOS}', '${GOV_ORG}', '${GOV_PIPELINE}', 1),
             ('${V_B}', '${ORG_B}', '${FUNIL_B}', 1)
      on conflict do nothing;
    insert into public.crm_pipeline_view_pessoas (view_id, organization_id, user_id)
      values ('${V_ESCOLHIDOS}', '${GOV_ORG}', '${GOV_AGENT_A}')
      on conflict do nothing;
  `);
});

const vistas = (id: string) => `select count(*) from public.crm_pipeline_views where id = '${id}';`;

describe("crm_pipeline_views — isolamento entre organizações (RLS)", () => {
  it("o mesmo nome pode existir em duas organizações", () => {
    expect(sql(`select count(*) from public.crm_pipeline_views where id in ('${V_TODOS}', '${V_B}');`)).toBe("2");
  });

  it("cada organização vê a própria visualização e nenhuma do vizinho, nos dois sentidos", () => {
    expect(countAs(GOV_VIEWER, vistas(V_TODOS))).toBe(1);
    expect(countAs(GOV_VIEWER, vistas(V_B))).toBe(0);
    expect(countAs(USER_B, vistas(V_B))).toBe(1);
    expect(countAs(USER_B, vistas(V_TODOS))).toBe(0);
    expect(countAs(USER_B, `select count(*) from public.crm_pipeline_view_origens where view_id = '${V_TODOS}';`)).toBe(0);
  });
});

describe("crm_pipeline_views — o acesso", () => {
  it("acesso todos: a organização inteira vê a visualização e as origens dela", () => {
    expect(countAs(GOV_AGENT_B, vistas(V_TODOS))).toBe(1);
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_pipeline_view_origens where view_id = '${V_TODOS}';`)).toBe(2);
  });

  it("acesso escolhidos: veem o gerente e a pessoa escolhida (controles positivos)", () => {
    expect(countAs(GOV_MANAGER, vistas(V_ESCOLHIDOS))).toBe(1);
    expect(countAs(GOV_AGENT_A, vistas(V_ESCOLHIDOS))).toBe(1);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_pipeline_view_origens where view_id = '${V_ESCOLHIDOS}';`)).toBe(1);
  });

  it("acesso escolhidos: quem não foi escolhido não vê a visualização, as origens nem a lista", () => {
    expect(countAs(GOV_AGENT_B, vistas(V_ESCOLHIDOS))).toBe(0);
    expect(countAs(GOV_VIEWER, vistas(V_ESCOLHIDOS))).toBe(0);
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_pipeline_view_origens where view_id = '${V_ESCOLHIDOS}';`)).toBe(0);
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_pipeline_view_pessoas where view_id = '${V_ESCOLHIDOS}';`)).toBe(0);
  });

  it("a pessoa escolhida vê só a própria linha da lista; o gerente vê a lista inteira", () => {
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_pipeline_view_pessoas where view_id = '${V_ESCOLHIDOS}';`)).toBe(1);
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_pipeline_view_pessoas where view_id = '${V_ESCOLHIDOS}';`)).toBe(1);
  });
});

describe("crm_pipeline_views — quem escreve", () => {
  it("viewer e agent não criam visualização", () => {
    expect(
      writeCountAs(GOV_VIEWER, `insert into public.crm_pipeline_views (organization_id, name) values ('${GOV_ORG}', 'Do viewer')`),
    ).toBe(0);
    expect(
      writeCountAs(GOV_AGENT_A, `insert into public.crm_pipeline_views (organization_id, name) values ('${GOV_ORG}', 'Do agent')`),
    ).toBe(0);
  });

  it("manager cria na própria organização (controle positivo), e não na do vizinho", () => {
    expect(
      writeCountAs(GOV_MANAGER, `insert into public.crm_pipeline_views (organization_id, name) values ('${GOV_ORG}', 'Do gerente')`),
    ).toBe(1);
    expect(
      writeCountAs(GOV_MANAGER, `insert into public.crm_pipeline_views (organization_id, name) values ('${ORG_B}', 'Na casa do vizinho')`),
    ).toBe(0);
  });
});

describe("crm_pipeline_views — as FKs compostas", () => {
  it("o banco recusa origem de outra organização", () => {
    expect(() =>
      sql(`insert into public.crm_pipeline_view_origens (view_id, organization_id, pipeline_id, position)
             values ('${V_TODOS}', '${GOV_ORG}', '${FUNIL_B}', 9);`),
    ).toThrow(/crm_pipeline_view_origens_funil_fk/);
  });

  it("o banco recusa pessoa que não é da organização", () => {
    expect(() =>
      sql(`insert into public.crm_pipeline_view_pessoas (view_id, organization_id, user_id)
             values ('${V_ESCOLHIDOS}', '${GOV_ORG}', '${USER_B}');`),
    ).toThrow(/crm_pipeline_view_pessoas_membro_fk/);
  });

  it("apagar a origem ou a visualização leva as linhas junto", () => {
    expect(
      sql(`select string_agg(conname || '=' || confdeltype, ',' order by conname) from pg_constraint
            where conname in ('crm_pipeline_view_origens_funil_fk', 'crm_pipeline_view_origens_view_fk',
                              'crm_pipeline_view_pessoas_membro_fk', 'crm_pipeline_view_pessoas_view_fk');`),
    ).toBe(
      "crm_pipeline_view_origens_funil_fk=c,crm_pipeline_view_origens_view_fk=c,crm_pipeline_view_pessoas_membro_fk=c,crm_pipeline_view_pessoas_view_fk=c",
    );
  });
});

describe("fn_escale_salvar_visualizacao", () => {
  it("o gerente cria com origens na ordem e pessoas escolhidas, e depois troca tudo", () => {
    comoUsuario(GOV_MANAGER, salvar(V_RPC, "Da função", "escolhidos", [FUNIL_A2, GOV_PIPELINE], [GOV_AGENT_B]));
    expect(
      sql(`select string_agg(pipeline_id::text || ':' || position, ',' order by position)
             from public.crm_pipeline_view_origens where view_id = '${V_RPC}';`),
    ).toBe(`${FUNIL_A2}:1,${GOV_PIPELINE}:2`);
    expect(sql(`select count(*) from public.crm_pipeline_view_pessoas where view_id = '${V_RPC}';`)).toBe("1");

    comoUsuario(GOV_MANAGER, salvar(V_RPC, "Da função 2", "todos", [GOV_PIPELINE], [GOV_AGENT_B]));
    expect(sql(`select name || '|' || acesso from public.crm_pipeline_views where id = '${V_RPC}';`)).toBe("Da função 2|todos");
    expect(sql(`select count(*) from public.crm_pipeline_view_origens where view_id = '${V_RPC}';`)).toBe("1");
    expect(sql(`select count(*) from public.crm_pipeline_view_pessoas where view_id = '${V_RPC}';`)).toBe("0");
  });

  it("o agent para na RLS e nada é gravado", () => {
    expect(() => comoUsuario(GOV_AGENT_A, salvar(V_RECUSADA, "Do agent", "todos", [GOV_PIPELINE], []))).toThrow(
      /row-level security/,
    );
    expect(sql(`select count(*) from public.crm_pipeline_views where id = '${V_RECUSADA}';`)).toBe("0");
  });

  it("sem origem nenhuma, a função recusa (22023)", () => {
    expect(() => comoUsuario(GOV_MANAGER, salvar(V_RECUSADA, "Vazia", "todos", [], []))).toThrow(/1 a 20 origens/);
  });
});
```

- [ ] **Step 2: Registrar a prova na varredura de RLS**

Em `tests/invariants/rls-completude-varredura.test.ts`, logo DEPOIS do fechamento da entrada de `crm_pipeline_groups` em `PROVA_PROPRIA` (o `},` que vem depois do texto "…a FK composta recusa ligar funil a grupo de outra organização.\","), acrescente:

```ts
  {
    tabela: "crm_pipeline_views",
    razao:
      "tests/invariants/escale-visualizacoes-rls.test.ts — fork Escale (migration 9003): dois tenants reais por JWT " +
      "(leitura positiva local e ZERO do vizinho nos dois sentidos), acesso 'escolhidos' visto só por gerente e pela pessoa " +
      "escolhida, viewer e agent não escrevem, manager escreve só na própria organização.",
  },
  {
    tabela: "crm_pipeline_view_origens",
    razao:
      "tests/invariants/escale-visualizacoes-rls.test.ts — fork Escale (migration 9003): as origens seguem a visualização " +
      "(zero do vizinho e zero da visualização 'escolhidos' para quem não foi escolhido), e a FK composta recusa origem de outra organização.",
  },
  {
    tabela: "crm_pipeline_view_pessoas",
    razao:
      "tests/invariants/escale-visualizacoes-rls.test.ts — fork Escale (migration 9003): cada pessoa vê só a própria linha, " +
      "gerente vê a lista, e a FK composta para user_organizations recusa quem não é da organização.",
  },
```

- [ ] **Step 3: Rodar a prova (Docker)**

```bash
docker info --format '{{.ServerVersion}}'
```
Expected: uma versão (ex. `28.x`). Se falhar, PARE e peça ao usuário para abrir o Docker Desktop.

```bash
corepack pnpm test:db tests/invariants/escale-visualizacoes-rls.test.ts tests/invariants/rls-completude-varredura.test.ts tests/invariants/travas-de-suporte-cobrem-toda-tabela-na-instalacao.test.ts tests/invariants/hardening-definer-varredura.test.ts tests/invariants/escale-grupos-de-funis-rls.test.ts 2>&1 | tail -25
```
Expected: os 5 arquivos PASS e `==> test:db verde` (o script aplica o baseline do zero com `ON_ERROR_STOP=1` e reaplica em modo update). Se o install falhar, corrija a MIGRATION, refaça o bloco do baseline (`git checkout -- supabase/baseline.sql` e o Step 5 da Task 1) e rode de novo. Se um caso da prova falhar, a falha é da migration, não da prova: leia a mensagem antes de mexer em qualquer `expect`.

- [ ] **Step 4: Commit**

```bash
git add tests/invariants/escale-visualizacoes-rls.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "test(escale): prova no Postgres do acesso das visualizações

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Regras puras das visualizações, o caminho do funil e os textos em espanhol

**Files:**
- Create: `lib/escale/visualizacoes/regras.ts`, `tests/unit/escale-visualizacoes-regras.test.ts`
- Modify: `lib/escale/origens/regras.ts` (`funilDoCaminho`), `tests/unit/escale-origens-regras.test.ts` (1 caso), `lib/i18n/dicionario.ts` (bloco)

**Interfaces:**
- Consumes: `Origens`, `ArvoreDeOrigens`, `FunilDaOrigem`, `GrupoNaArvore`, `VereditoDeNome` de `lib/escale/origens/regras.ts`; `normalizar` de `@/lib/catalogo/busca`; `midpoint` de `@/lib/kanban/fractional-indexing` (`midpoint(null, null) === 1000`, empate → `NaN`); `proximoNaEtapaInteira(acima, abaixoVisivel, etapaInteira, arrastadoId)` de `@/lib/kanban/vizinho-na-etapa`; `BoardData`, `Stage` de `@/lib/kanban/types`; `Lead` de `@/lib/types/leads`.
- Produces (todos em `lib/escale/visualizacoes/regras.ts`):
  - `ACESSOS_DE_VISUALIZACAO = ["todos", "escolhidos"] as const`, `type AcessoDaVisualizacao`
  - `NOME_DE_VISUALIZACAO_MAX = 60`, `VISUALIZACAO_MAX_ORIGENS = 20`
  - `interface Visualizacao { id: string; name: string; acesso: AcessoDaVisualizacao; origens: string[]; pessoas: string[] }`
  - `validarNomeDeVisualizacao(bruto: string, visualizacoes: readonly Pick<Visualizacao, "id" | "name">[], ignorarId: string | null): VereditoDeNome`
  - `validarOrigensDaVisualizacao(pedidas: readonly string[], origens: Origens): { ok: true; ids: string[] } | { ok: false; erro: string }`
  - `interface GravacaoDeVisualizacao { nome: string; acesso: AcessoDaVisualizacao; origens: string[]; pessoas: string[] }`
  - `montarGravacao(pedido: { name: string; acesso: AcessoDaVisualizacao; origens: readonly string[]; pessoas: readonly string[] }, origens: Origens, visualizacoes: readonly Visualizacao[], ignorarId: string | null): { ok: true; gravacao: GravacaoDeVisualizacao } | { ok: false; erro: string }`
  - `origensVivasDaVisualizacao(v: Pick<Visualizacao, "origens">, origens: Origens): FunilDaOrigem[]`
  - `ordenarNaArvore(marcadas: ReadonlySet<string>, arvore: ArvoreDeOrigens): string[]`
  - `type EstadoDaCaixa = "marcada" | "parcial" | "vazia"`, `estadoDoGrupo(grupo: Pick<GrupoNaArvore, "funis">, marcadas: ReadonlySet<string>): EstadoDaCaixa`
  - `alternarNaSelecao(marcadas: ReadonlySet<string>, ids: readonly string[], marcar: boolean): Set<string>`
  - `visualizacaoDoCaminho(pathname: string): string | null`
  - `interface ColunaCombinada { chave: string; nome: string; cor: string | null; destinos: Record<string, string>; etapas: string[] }`
  - `montarColunas(quadros: readonly Pick<BoardData, "pipeline" | "stages">[]): ColunaCombinada[]`
  - `cardsDaColuna(coluna: Pick<ColunaCombinada, "etapas">, leads: readonly Lead[]): Lead[]`
  - `type Soltura = { tipo: "nada" } | { tipo: "recusa" } | { tipo: "mover"; pipelineId: string; stageId: string; positionInStage: number }`
  - `planejarSoltura(args: { lead: Pick<Lead, "id" | "pipeline_id">; coluna: Pick<ColunaCombinada, "destinos">; visiveis: readonly Lead[]; indice: number; etapaInteira: readonly Lead[] | null }): Soltura`
  - `settingsDaVisualizacao(quadros: readonly Pick<BoardData, "pipeline">[]): Record<string, unknown>`
  - E em `lib/escale/origens/regras.ts`: `funilDoCaminho("/app/pipelines/visualizacoes/x") === null`.

- [ ] **Step 1: Escrever os testes das regras (vão falhar)**

Create `tests/unit/escale-visualizacoes-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { BoardData, Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { montarOrigens, type Origens } from "@/lib/escale/origens/regras";
import {
  VISUALIZACAO_MAX_ORIGENS,
  alternarNaSelecao,
  cardsDaColuna,
  estadoDoGrupo,
  montarColunas,
  montarGravacao,
  ordenarNaArvore,
  origensVivasDaVisualizacao,
  planejarSoltura,
  settingsDaVisualizacao,
  validarNomeDeVisualizacao,
  validarOrigensDaVisualizacao,
  visualizacaoDoCaminho,
  type Visualizacao,
} from "@/lib/escale/visualizacoes/regras";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras", color: null, icon: "iniciais", is_archived: false },
    { id: "g-cred", name: "Credenciados", color: null, icon: "iniciais", is_archived: false },
  ],
  funis: [
    { id: "f-leads", name: "Leads", group_id: "g-obras", is_archived: false, is_default: true },
    { id: "f-pa", name: "Leads PA", group_id: "g-obras", is_archived: false, is_default: false },
    { id: "f-nayara", name: "Nayara", group_id: "g-cred", is_archived: false, is_default: false },
    { id: "f-morto", name: "Morto", group_id: "g-cred", is_archived: true, is_default: false },
  ],
};

const vis = (id: string, name: string, origens: string[] = ["f-leads"]): Visualizacao => ({
  id,
  name,
  acesso: "todos",
  origens,
  pessoas: [],
});

const etapa = (id: string, pipeline_id: string, name: string, position: number, color: string | null = null) =>
  ({ id, pipeline_id, name, position, color }) as unknown as Stage;
const quadro = (id: string, stages: Stage[], settings: Record<string, unknown> = {}) =>
  ({ pipeline: { id, name: id, settings } as unknown as Pipeline, stages, leads: [] }) as BoardData;
const card = (id: string, pipeline_id: string, stage_id: string, position_in_stage: number) =>
  ({ id, pipeline_id, stage_id, position_in_stage, updated_at: "2026-10-14T00:00:00Z" }) as unknown as Lead;

describe("validarNomeDeVisualizacao", () => {
  it("apara, junta espaços e recusa vazio e longo demais", () => {
    expect(validarNomeDeVisualizacao("  Time   comercial ", [], null)).toEqual({ ok: true, nome: "Time comercial" });
    expect(validarNomeDeVisualizacao("   ", [], null)).toEqual({ ok: false, erro: "Dê um nome à visualização." });
    expect(validarNomeDeVisualizacao("x".repeat(61), [], null)).toEqual({
      ok: false,
      erro: "O nome da visualização pode ter até 60 caracteres.",
    });
  });

  it("nome repetido sem olhar caixa nem acento é recusado, menos o da própria", () => {
    const existentes = [vis("v1", "Análise")];
    expect(validarNomeDeVisualizacao("analise", existentes, null)).toEqual({
      ok: false,
      erro: "Já existe uma visualização com esse nome.",
    });
    expect(validarNomeDeVisualizacao("ANÁLISE", existentes, "v1")).toEqual({ ok: true, nome: "ANÁLISE" });
  });
});

describe("validarOrigensDaVisualizacao", () => {
  it("tira repetidas e mantém a ordem pedida", () => {
    expect(validarOrigensDaVisualizacao(["f-nayara", "f-leads", "f-nayara"], ORIGENS)).toEqual({
      ok: true,
      ids: ["f-nayara", "f-leads"],
    });
  });

  it("recusa nenhuma, mais de 20, arquivada e desconhecida", () => {
    const faixa = { ok: false, erro: "Uma visualização junta de 1 a 20 origens." };
    expect(validarOrigensDaVisualizacao([], ORIGENS)).toEqual(faixa);
    const muitas = Array.from({ length: VISUALIZACAO_MAX_ORIGENS + 1 }, (_, i) => `f-${i}`);
    expect(validarOrigensDaVisualizacao(muitas, ORIGENS)).toEqual(faixa);
    const invalida = { ok: false, erro: "Escolha origens ativas desta organização." };
    expect(validarOrigensDaVisualizacao(["f-leads", "f-morto"], ORIGENS)).toEqual(invalida);
    expect(validarOrigensDaVisualizacao(["f-do-vizinho"], ORIGENS)).toEqual(invalida);
  });
});

describe("montarGravacao", () => {
  it("acesso todos zera a lista de pessoas", () => {
    expect(
      montarGravacao({ name: " Time ", acesso: "todos", origens: ["f-pa"], pessoas: ["u1"] }, ORIGENS, [], null),
    ).toEqual({ ok: true, gravacao: { nome: "Time", acesso: "todos", origens: ["f-pa"], pessoas: [] } });
  });

  it("acesso escolhidos exige pelo menos uma pessoa e tira repetidas", () => {
    expect(montarGravacao({ name: "Time", acesso: "escolhidos", origens: ["f-pa"], pessoas: [] }, ORIGENS, [], null)).toEqual({
      ok: false,
      erro: "Escolha quem vê a visualização.",
    });
    expect(
      montarGravacao({ name: "Time", acesso: "escolhidos", origens: ["f-pa"], pessoas: ["u1", "u1", "u2"] }, ORIGENS, [], null),
    ).toEqual({ ok: true, gravacao: { nome: "Time", acesso: "escolhidos", origens: ["f-pa"], pessoas: ["u1", "u2"] } });
  });

  it("o erro do nome vem antes do das origens", () => {
    expect(montarGravacao({ name: "", acesso: "todos", origens: [], pessoas: [] }, ORIGENS, [], null)).toEqual({
      ok: false,
      erro: "Dê um nome à visualização.",
    });
  });
});

describe("origens da visualização e seleção do painel", () => {
  it("as origens vivas, na ordem da visualização, sem arquivada nem apagada", () => {
    const v = vis("v1", "Time", ["f-nayara", "f-morto", "f-apagada", "f-leads"]);
    expect(origensVivasDaVisualizacao(v, ORIGENS).map((f) => f.id)).toEqual(["f-nayara", "f-leads"]);
  });

  it("a seleção sai na ordem do painel: grupos por nome, origens na posição", () => {
    const arvore = montarOrigens(ORIGENS);
    expect(ordenarNaArvore(new Set(["f-leads", "f-nayara", "f-pa"]), arvore)).toEqual(["f-nayara", "f-leads", "f-pa"]);
  });

  it("a caixinha do grupo é marcada, parcial ou vazia", () => {
    const [cred, obras] = montarOrigens(ORIGENS).grupos;
    expect(estadoDoGrupo(obras!, new Set(["f-leads", "f-pa"]))).toBe("marcada");
    expect(estadoDoGrupo(obras!, new Set(["f-leads"]))).toBe("parcial");
    expect(estadoDoGrupo(cred!, new Set(["f-leads"]))).toBe("vazia");
  });

  it("alternar marca e desmarca várias de uma vez sem mexer no conjunto de origem", () => {
    const antes = new Set(["f-leads"]);
    const depois = alternarNaSelecao(antes, ["f-pa", "f-nayara"], true);
    expect([...depois].sort()).toEqual(["f-leads", "f-nayara", "f-pa"]);
    expect([...alternarNaSelecao(depois, ["f-leads", "f-pa"], false)]).toEqual(["f-nayara"]);
    expect([...antes]).toEqual(["f-leads"]);
  });

  it("lê a visualização do endereço do quadro", () => {
    expect(visualizacaoDoCaminho("/app/pipelines/visualizacoes/v-1")).toBe("v-1");
    expect(visualizacaoDoCaminho("/app/pipelines/v-1")).toBeNull();
  });
});

describe("montarColunas", () => {
  it("etapas com o mesmo nome viram uma coluna, e a nova entra depois da última da mesma origem", () => {
    const colunas = montarColunas([
      quadro("A", [etapa("a1", "A", "Entrada", 1, "#111111"), etapa("a2", "A", "Atendimento", 2), etapa("a3", "A", "Proposta", 3)]),
      quadro("B", [etapa("b1", "B", "Entrada", 1), etapa("b2", "B", "Qualificação", 2), etapa("b3", "B", " Proposta ", 3)]),
    ]);
    expect(colunas.map((c) => c.nome)).toEqual(["Entrada", "Qualificação", "Atendimento", "Proposta"]);
    expect(colunas[0]).toMatchObject({ chave: "coluna:Entrada", cor: "#111111", destinos: { A: "a1", B: "b1" }, etapas: ["a1", "b1"] });
    expect(colunas[3]).toMatchObject({ destinos: { A: "a3", B: "b3" } });
    expect(colunas[2]).toMatchObject({ destinos: { A: "a2" }, etapas: ["a2"] });
  });

  it("o nome junta exato: caixa diferente é outra coluna", () => {
    const colunas = montarColunas([
      quadro("A", [etapa("a1", "A", "Proposta", 1)]),
      quadro("B", [etapa("b1", "B", "proposta", 1)]),
    ]);
    expect(colunas.map((c) => c.nome)).toEqual(["Proposta", "proposta"]);
  });

  it("a ordem vem da posição da etapa, e nome repetido na mesma origem cai na mesma coluna", () => {
    const colunas = montarColunas([
      quadro("A", [etapa("a2", "A", "Fim", 2), etapa("a1", "A", "Início", 1), etapa("a3", "A", "Fim", 3)]),
    ]);
    expect(colunas.map((c) => c.nome)).toEqual(["Início", "Fim"]);
    expect(colunas[1]).toMatchObject({ destinos: { A: "a2" }, etapas: ["a2", "a3"] });
  });
});

describe("cardsDaColuna e planejarSoltura", () => {
  const coluna = { chave: "coluna:Proposta", nome: "Proposta", cor: null, destinos: { A: "a3", B: "b3" }, etapas: ["a3", "b3"] };

  it("os cards da coluna são de todas as origens, pela posição", () => {
    const leads = [card("l1", "A", "a3", 3000), card("l2", "B", "b3", 1000), card("l3", "A", "a1", 500)];
    expect(cardsDaColuna(coluna, leads).map((l) => l.id)).toEqual(["l2", "l1"]);
  });

  it("origem sem a etapa recusa", () => {
    const soltura = planejarSoltura({
      lead: card("l9", "C", "c1", 1000),
      coluna,
      visiveis: [],
      indice: 0,
      etapaInteira: null,
    });
    expect(soltura).toEqual({ tipo: "recusa" });
  });

  it("a posição sai dos vizinhos da MESMA etapa de destino, pulando os cards das outras origens", () => {
    const visiveis = [card("x1", "A", "a3", 1000), card("y1", "B", "b3", 1500), card("x2", "A", "a3", 3000)];
    const soltura = planejarSoltura({
      lead: card("novo", "A", "a1", 10),
      coluna,
      visiveis,
      indice: 2,
      etapaInteira: [visiveis[0]!, visiveis[2]!],
    });
    expect(soltura).toEqual({ tipo: "mover", pipelineId: "A", stageId: "a3", positionInStage: 2000 });
  });

  it("coluna vazia para a origem: a primeira posição", () => {
    const soltura = planejarSoltura({
      lead: card("novo", "B", "b1", 10),
      coluna,
      visiveis: [card("x1", "A", "a3", 1000)],
      indice: 1,
      etapaInteira: [],
    });
    expect(soltura).toEqual({ tipo: "mover", pipelineId: "B", stageId: "b3", positionInStage: 1000 });
  });

  it("vizinhos empatados (posição já gravada igual) não movem", () => {
    const visiveis = [card("x1", "A", "a3", 1000), card("x2", "A", "a3", 1000)];
    const soltura = planejarSoltura({
      lead: card("novo", "A", "a1", 10),
      coluna,
      visiveis,
      indice: 1,
      etapaInteira: null,
    });
    expect(soltura).toEqual({ tipo: "nada" });
  });
});

describe("settingsDaVisualizacao", () => {
  it("junta os motivos de perda de todas as origens", () => {
    expect(
      settingsDaVisualizacao([
        quadro("A", [], { lost_reasons: ["Preço"] }),
        quadro("B", [], { lost_reasons: [{ label: "Sumiu", categoria: "Cliente" }] }),
        quadro("C", [], {}),
      ]),
    ).toEqual({ lost_reasons: ["Preço", { label: "Sumiu", categoria: "Cliente" }] });
  });
});
```

Em `tests/unit/escale-origens-regras.test.ts`, dentro do `it("lê o funil do endereço do quadro", …)`, logo depois de `expect(funilDoCaminho("/app/kanban")).toBeNull();`, acrescente:

```ts
    expect(funilDoCaminho("/app/pipelines/visualizacoes/v-1")).toBeNull();
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-visualizacoes-regras.test.ts tests/unit/escale-origens-regras.test.ts
```
Expected: FAIL — `Failed to resolve import "@/lib/escale/visualizacoes/regras"` e, no segundo arquivo, `expected 'visualizacoes' to be null`.

- [ ] **Step 3: Escrever as regras**

Create `lib/escale/visualizacoes/regras.ts`:

```ts
/**
 * VISUALIZAÇÕES (fork Escale, Fase 1C): um quadro que junta várias origens, como
 * as "Visualizações" da Clint. Regras puras — o painel, as janelas, as rotas e o
 * quadro combinado usam as mesmas, para nunca dizerem coisas diferentes.
 *
 * Etapas com EXATAMENTE o mesmo nome (sem espaço nas pontas) viram uma coluna e
 * somam os cards; nomes diferentes viram colunas próprias. Cada card continua na
 * origem dele: arrastar leva para a etapa de mesmo nome NA ORIGEM DO CARD, e a
 * origem que não tem essa etapa recusa.
 *
 * Quem vê a visualização é a RLS (migration 9003); o que aparece dentro dela é a
 * RLS de cada origem, porque o quadro lê cada uma com a sessão de quem olha.
 */
import { normalizar } from "@/lib/catalogo/busca";
import { midpoint } from "@/lib/kanban/fractional-indexing";
import type { BoardData, Stage } from "@/lib/kanban/types";
import { proximoNaEtapaInteira } from "@/lib/kanban/vizinho-na-etapa";
import type { Lead } from "@/lib/types/leads";

import type { ArvoreDeOrigens, FunilDaOrigem, GrupoNaArvore, Origens, VereditoDeNome } from "../origens/regras";

/** O mesmo CHECK `crm_pipeline_views_acesso_valido` (migration 9003). */
export const ACESSOS_DE_VISUALIZACAO = ["todos", "escolhidos"] as const;
export type AcessoDaVisualizacao = (typeof ACESSOS_DE_VISUALIZACAO)[number];

/** O mesmo teto do CHECK `crm_pipeline_views_nome_valido`. */
export const NOME_DE_VISUALIZACAO_MAX = 60;
/** O mesmo teto de `fn_escale_salvar_visualizacao`: cada origem é um quadro inteiro lido. */
export const VISUALIZACAO_MAX_ORIGENS = 20;

export interface Visualizacao {
  id: string;
  name: string;
  acesso: AcessoDaVisualizacao;
  /** Os funis, na ordem das colunas. */
  origens: string[];
  /** Quem vê com acesso "escolhidos". Só gerente+ recebe a lista inteira (RLS). */
  pessoas: string[];
}

const chave = (nome: string) => normalizar(nome).trim();

export function validarNomeDeVisualizacao(
  bruto: string,
  visualizacoes: readonly Pick<Visualizacao, "id" | "name">[],
  ignorarId: string | null,
): VereditoDeNome {
  const nome = bruto.trim().replace(/\s+/g, " ");
  if (!nome) return { ok: false, erro: "Dê um nome à visualização." };
  if (nome.length > NOME_DE_VISUALIZACAO_MAX) {
    return { ok: false, erro: "O nome da visualização pode ter até 60 caracteres." };
  }
  // Mais estrito que o índice do banco (que só ignora caixa), como nos grupos.
  const procurado = chave(nome);
  if (visualizacoes.some((v) => v.id !== ignorarId && chave(v.name) === procurado)) {
    return { ok: false, erro: "Já existe uma visualização com esse nome." };
  }
  return { ok: true, nome };
}

export function validarOrigensDaVisualizacao(
  pedidas: readonly string[],
  origens: Origens,
): { ok: true; ids: string[] } | { ok: false; erro: string } {
  const ids = [...new Set(pedidas)];
  if (ids.length === 0 || ids.length > VISUALIZACAO_MAX_ORIGENS) {
    return { ok: false, erro: "Uma visualização junta de 1 a 20 origens." };
  }
  // `origens` é o que a sessão lê da PRÓPRIA organização: id do vizinho não está aqui.
  const vivas = new Set(origens.funis.filter((f) => !f.is_archived).map((f) => f.id));
  if (ids.some((id) => !vivas.has(id))) return { ok: false, erro: "Escolha origens ativas desta organização." };
  return { ok: true, ids };
}

export interface GravacaoDeVisualizacao {
  nome: string;
  acesso: AcessoDaVisualizacao;
  origens: string[];
  pessoas: string[];
}

/** O que a rota manda para `fn_escale_salvar_visualizacao`, já validado. `erro` é chave do dicionário. */
export function montarGravacao(
  pedido: { name: string; acesso: AcessoDaVisualizacao; origens: readonly string[]; pessoas: readonly string[] },
  origens: Origens,
  visualizacoes: readonly Visualizacao[],
  ignorarId: string | null,
): { ok: true; gravacao: GravacaoDeVisualizacao } | { ok: false; erro: string } {
  const nome = validarNomeDeVisualizacao(pedido.name, visualizacoes, ignorarId);
  if (!nome.ok) return nome;
  const escolhidas = validarOrigensDaVisualizacao(pedido.origens, origens);
  if (!escolhidas.ok) return escolhidas;
  // Acesso "todos" não guarda lista: uma lista esquecida voltaria a valer se
  // alguém trocasse para "escolhidos" sem olhar.
  const pessoas = pedido.acesso === "escolhidos" ? [...new Set(pedido.pessoas)] : [];
  if (pedido.acesso === "escolhidos" && pessoas.length === 0) {
    return { ok: false, erro: "Escolha quem vê a visualização." };
  }
  return { ok: true, gravacao: { nome: nome.nome, acesso: pedido.acesso, origens: escolhidas.ids, pessoas } };
}

/** As origens que o quadro abre: as da visualização, na ordem dela, sem arquivada nem apagada. */
export function origensVivasDaVisualizacao(v: Pick<Visualizacao, "origens">, origens: Origens): FunilDaOrigem[] {
  const porId = new Map(origens.funis.map((f) => [f.id, f]));
  return v.origens.flatMap((id) => {
    const funil = porId.get(id);
    return funil && !funil.is_archived ? [funil] : [];
  });
}

/** A seleção do painel na ordem do próprio painel: é a ordem das colunas. */
export function ordenarNaArvore(marcadas: ReadonlySet<string>, arvore: ArvoreDeOrigens): string[] {
  return [...arvore.grupos.flatMap((g) => g.funis), ...arvore.semGrupo]
    .map((f) => f.id)
    .filter((id) => marcadas.has(id));
}

export type EstadoDaCaixa = "marcada" | "parcial" | "vazia";

export function estadoDoGrupo(grupo: Pick<GrupoNaArvore, "funis">, marcadas: ReadonlySet<string>): EstadoDaCaixa {
  const marcadasAqui = grupo.funis.filter((f) => marcadas.has(f.id)).length;
  if (marcadasAqui === 0) return "vazia";
  return marcadasAqui === grupo.funis.length ? "marcada" : "parcial";
}

export function alternarNaSelecao(marcadas: ReadonlySet<string>, ids: readonly string[], marcar: boolean): Set<string> {
  const proxima = new Set(marcadas);
  for (const id of ids) {
    if (marcar) proxima.add(id);
    else proxima.delete(id);
  }
  return proxima;
}

/** A visualização aberta no quadro (`/app/pipelines/visualizacoes/<id>`), ou `null` fora dele. */
export function visualizacaoDoCaminho(pathname: string): string | null {
  return /^\/app\/pipelines\/visualizacoes\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
}

// ── O quadro combinado ──────────────────────────────────────────────────────

export interface ColunaCombinada {
  /** O `droppableId`: o nome, que é o que junta as etapas. */
  chave: string;
  nome: string;
  /** A cor da primeira etapa que deu nome à coluna. */
  cor: string | null;
  /** Origem → a etapa de destino dela nesta coluna (a primeira com esse nome). */
  destinos: Record<string, string>;
  /** Todas as etapas com esse nome, de todas as origens. */
  etapas: string[];
}

export function montarColunas(quadros: readonly Pick<BoardData, "pipeline" | "stages">[]): ColunaCombinada[] {
  const colunas: ColunaCombinada[] = [];
  for (const quadro of quadros) {
    // A coluna nova de uma origem entra logo depois da última coluna DESSA
    // origem: "Entrada, Atendimento, Proposta" + "Entrada, Qualificação,
    // Proposta" dá "Entrada, Qualificação, Atendimento, Proposta".
    let anterior = -1;
    const etapas = [...quadro.stages].sort((a, b) => a.position - b.position);
    for (const etapa of etapas) {
      const nome = etapa.name.trim();
      let indice = colunas.findIndex((c) => c.nome === nome);
      if (indice < 0) {
        indice = anterior + 1;
        colunas.splice(indice, 0, { chave: `coluna:${nome}`, nome, cor: etapa.color, destinos: {}, etapas: [] });
      }
      const coluna = colunas[indice]!;
      coluna.etapas.push(etapa.id);
      if (!(quadro.pipeline.id in coluna.destinos)) coluna.destinos[quadro.pipeline.id] = etapa.id;
      anterior = indice;
    }
  }
  return colunas;
}

/** Os cards da coluna, de todas as origens, na ordem das posições. */
export function cardsDaColuna(coluna: Pick<ColunaCombinada, "etapas">, leads: readonly Lead[]): Lead[] {
  const etapas = new Set(coluna.etapas);
  return leads.filter((l) => etapas.has(l.stage_id)).sort((a, b) => a.position_in_stage - b.position_in_stage);
}

export type Soltura =
  | { tipo: "nada" }
  | { tipo: "recusa" }
  | { tipo: "mover"; pipelineId: string; stageId: string; positionInStage: number };

/**
 * Onde o card cai. `visiveis` é a coluna como está na tela (filtrada); a posição
 * só faz sentido entre cards da MESMA etapa de destino, então os vizinhos de
 * outras origens são pulados. `etapaInteira` é a etapa de destino sem filtro, do
 * cache do quadro da origem do card (o mesmo cuidado de #2545 no funil).
 */
export function planejarSoltura(args: {
  lead: Pick<Lead, "id" | "pipeline_id">;
  coluna: Pick<ColunaCombinada, "destinos">;
  visiveis: readonly Lead[];
  indice: number;
  etapaInteira: readonly Lead[] | null;
}): Soltura {
  const stageId = args.coluna.destinos[args.lead.pipeline_id];
  if (!stageId) return { tipo: "recusa" };
  const lista = args.visiveis.filter((l) => l.id !== args.lead.id);
  const daEtapa = (l: Lead) => l.stage_id === stageId;
  const acima = [...lista.slice(0, args.indice)].reverse().find(daEtapa) ?? null;
  const abaixo = lista.slice(args.indice).find(daEtapa) ?? null;
  const depois = proximoNaEtapaInteira(acima, abaixo, args.etapaInteira, args.lead.id);
  const posicao = midpoint(acima?.position_in_stage ?? null, depois?.position_in_stage ?? null);
  if (Number.isNaN(posicao)) return { tipo: "nada" };
  return { tipo: "mover", pipelineId: args.lead.pipeline_id, stageId, positionInStage: posicao };
}

/**
 * Os `settings` que o filtro do quadro combinado lê: os motivos de perda de
 * todas as origens juntos, para o filtro por categoria enxergar todos.
 */
export function settingsDaVisualizacao(quadros: readonly Pick<BoardData, "pipeline">[]): Record<string, unknown> {
  const lost_reasons = quadros.flatMap((q) => {
    const bruto = (q.pipeline.settings as { lost_reasons?: unknown } | null | undefined)?.lost_reasons;
    return Array.isArray(bruto) ? bruto : [];
  });
  return { lost_reasons };
}
```

Em `lib/escale/origens/regras.ts`, troque:

```ts
/** O funil aberto no quadro (`/app/pipelines/<id>`), ou `null` fora dele. */
export function funilDoCaminho(pathname: string): string | null {
  return /^\/app\/pipelines\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
}
```

por:

```ts
/**
 * O funil aberto no quadro (`/app/pipelines/<id>`), ou `null` fora dele. O
 * quadro de uma visualização mora em `/app/pipelines/visualizacoes/<id>` (Fase
 * 1C) e não é funil: sem a exceção, o "último funil aberto" viraria a palavra
 * "visualizacoes".
 */
export function funilDoCaminho(pathname: string): string | null {
  const id = /^\/app\/pipelines\/([^/?#]+)/.exec(pathname)?.[1] ?? null;
  return id === "visualizacoes" ? null : id;
}
```

- [ ] **Step 4: Os textos em espanhol**

Em `lib/i18n/dicionario.ts`, logo DEPOIS da entrada

```ts
  "A origem foi criada, mas não apareceu na lista. Recarregue a página.": {
    es: "El origen se creó, pero no apareció en la lista. Recargue la página.",
  },
```

(o fim do bloco da Fase 1B), acrescente:

```ts
  // ─── FORK ESCALE · visualizações (Fase 1C: quadro que junta origens, com acesso) ───
  "Visualizações": { es: "Vistas" },
  "Visualização": { es: "Vista" },
  "Criar visualização": { es: "Crear vista" },
  "Nenhuma visualização ainda.": { es: "Todavía no hay vistas." },
  "Editar origens": { es: "Editar orígenes" },
  "{n} origem selecionada · Rascunho": { es: "{n} origen seleccionado · Borrador" },
  "{n} origens selecionadas · Rascunho": { es: "{n} orígenes seleccionados · Borrador" },
  "Uma visualização junta de 1 a 20 origens.": { es: "Una vista reúne de 1 a 20 orígenes." },
  "Salvar como visualização": { es: "Guardar como vista" },
  "Salvar origens": { es: "Guardar orígenes" },
  "Nova visualização": { es: "Nueva vista" },
  "Configurações da visualização": { es: "Configuración de la vista" },
  "Nome da visualização": { es: "Nombre de la vista" },
  "Quem vê": { es: "Quién la ve" },
  "Toda a organização": { es: "Toda la organización" },
  "Só as pessoas escolhidas": { es: "Solo las personas elegidas" },
  "Gerentes e administradores sempre veem. Dentro da visualização, cada pessoa vê só os negócios que já vê em cada origem.": {
    es: "Gerentes y administradores siempre la ven. Dentro de la vista, cada persona ve solo los negocios que ya ve en cada origen.",
  },
  "Escolha quem vê a visualização.": { es: "Elija quién ve la vista." },
  "Etapas com o mesmo nome viram uma coluna só e somam os cards.": {
    es: "Las etapas con el mismo nombre se vuelven una sola columna y suman las tarjetas.",
  },
  "A visualização sai do painel. Nenhuma origem e nenhum negócio é apagado.": {
    es: "La vista sale del panel. No se borra ningún origen ni ningún negocio.",
  },
  "Excluir visualização": { es: "Eliminar vista" },
  "Visualização não encontrada.": { es: "Vista no encontrada." },
  "Dê um nome à visualização.": { es: "Dé un nombre a la vista." },
  "O nome da visualização pode ter até 60 caracteres.": { es: "El nombre de la vista puede tener hasta 60 caracteres." },
  "Já existe uma visualização com esse nome.": { es: "Ya existe una vista con ese nombre." },
  "Escolha origens ativas desta organização.": { es: "Elija orígenes activos de esta organización." },
  "Escolha origens e pessoas desta organização.": { es: "Elija orígenes y personas de esta organización." },
  "Só gerente ou administrador muda visualizações.": { es: "Solo un gerente o administrador cambia las vistas." },
  "Em qual origem?": { es: "¿En qué origen?" },
  "A origem «{origem}» não tem a etapa «{etapa}».": { es: "El origen «{origem}» no tiene la etapa «{etapa}»." },
  "{n} origem desta visualização não abriu para você.": { es: "{n} origen de esta vista no se abrió para usted." },
  "{n} origens desta visualização não abriram para você.": { es: "{n} orígenes de esta vista no se abrieron para usted." },
  "Nenhuma origem desta visualização está ativa. Edite as origens pelo ⋮ da visualização.": {
    es: "Ningún origen de esta vista está activo. Edite los orígenes con el ⋮ de la vista.",
  },
  "{n} negócios de {k} origens selecionados. A ação em lote vale para uma origem por vez.": {
    es: "{n} negocios de {k} orígenes seleccionados. La acción en lote vale para un origen a la vez.",
  },
```

- [ ] **Step 5: Rodar os testes e o typecheck**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm vitest run tests/unit/escale-visualizacoes-regras.test.ts tests/unit/escale-origens-regras.test.ts
corepack pnpm typecheck
```
Expected: os 2 arquivos PASS; typecheck sem erros. Se o typecheck acusar `An object literal cannot have multiple properties with the same name` no dicionário, a chave já existia: apague a linha REPETIDA do bloco novo (nunca a do original).

- [ ] **Step 6: Commit**

```bash
git add lib/escale/visualizacoes/regras.ts tests/unit/escale-visualizacoes-regras.test.ts lib/escale/origens/regras.ts tests/unit/escale-origens-regras.test.ts lib/i18n/dicionario.ts
git commit -m "feat(escale): regras das visualizações (colunas combinadas, soltura, seleção) e textos em espanhol

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Leitura e rotas das visualizações

**Files:**
- Create: `lib/escale/visualizacoes/ler-visualizacoes.ts`, `lib/escale/visualizacoes/respostas.ts`, `app/api/v1/pipeline-views/route.ts`, `app/api/v1/pipeline-views/[id]/route.ts`, `tests/unit/escale-visualizacoes-rotas.test.ts`
- Modify: `lib/audit/actions.ts` (bloco logo depois de `"pipeline_group.unarchived",`)

**Interfaces:**
- Consumes: Task 3 (`Visualizacao`, `ACESSOS_DE_VISUALIZACAO`, `montarGravacao`, `origensVivasDaVisualizacao`); `lerJson`, `origensOuFalha` de `lib/escale/origens/respostas.ts`; `requireRole` (`@/lib/auth/require-role`), `requireSupportWrite` (`@/lib/impersonate/support`), `audit` (`@/lib/audit`), `fail`/`ok` (`@/lib/api/wrappers`), `traduzir` (`@/lib/i18n/dicionario`), `createClient` (`@/lib/supabase/server`); o dublê `makeDb`/`authOk`/`ORG_ID`/`OUTRA_ORG` de `tests/helpers/stages-db-double.ts` (o `rpc` do dublê só registra em `db.rpcs` e responde `{ data: null, error: null }`).
- Produces:
  - `lerVisualizacoes(supabase, orgId: string): Promise<Visualizacao[]>` — LANÇA no erro do banco; ordena por nome.
  - `visualizacoesOuFalha(supabase, orgId, requestId)`, `responderComVisualizacoes(supabase, orgId, requestId, status?: 200 | 201): Promise<Response>`, `falhaDaGravacao(erro: { code?: string; message?: string }, t, requestId): Response`.
  - `GET/POST /api/v1/pipeline-views` e `PATCH/DELETE /api/v1/pipeline-views/:id`, todas respondendo `{ data: Visualizacao[] }`. POST recebe `{ id: uuid, name, acesso, origens: uuid[], pessoas?: uuid[] }` (o id vem da tela, para ela já saber para onde ir). PATCH recebe qualquer subconjunto de `{ name, acesso, origens, pessoas }`.
  - Códigos de auditoria `pipeline_view.created`, `pipeline_view.updated`, `pipeline_view.deleted`.

- [ ] **Step 1: Escrever os testes das rotas (vão falhar)**

Create `tests/unit/escale-visualizacoes-rotas.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import type { Visualizacao } from "@/lib/escale/visualizacoes/regras";
import { GET, POST } from "@/app/api/v1/pipeline-views/route";
import { DELETE, PATCH } from "@/app/api/v1/pipeline-views/[id]/route";
import { ORG_ID, OUTRA_ORG, authOk, makeDb, type PipelineRow } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const G = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const F_LEADS = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const F_NAYARA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const F_MORTO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3";
const F_VIZINHO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4";
const V_TIME = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const V_VIZINHO = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
const V_NOVA = "cccccccc-cccc-4ccc-8ccc-ccccccccccc3";
const P_ANA = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const P_BIA = "dddddddd-dddd-4ddd-8ddd-ddddddddddd2";

/** Três origens da organização (uma arquivada), uma do vizinho, e uma visualização de cada lado. */
function banco() {
  const db = makeDb({
    pipelines: [
      { id: F_LEADS, name: "Leads", organization_id: ORG_ID, is_archived: false, is_default: true, position: 1000, group_id: G },
      { id: F_NAYARA, name: "Nayara", organization_id: ORG_ID, is_archived: false, is_default: false, position: 2000, group_id: G },
      { id: F_MORTO, name: "Morto", organization_id: ORG_ID, is_archived: true, is_default: false, position: 3000, group_id: G },
      { id: F_VIZINHO, name: "Do vizinho", organization_id: OUTRA_ORG, is_archived: false, is_default: false, position: 1000, group_id: null },
    ] as unknown as PipelineRow[],
  });
  const tabelas = db.tabelas as unknown as Record<string, unknown[]>;
  tabelas.crm_pipeline_groups = [
    { id: G, organization_id: ORG_ID, name: "INSS", color: null, icon: "iniciais", is_archived: false },
  ];
  tabelas.crm_pipeline_views = [
    { id: V_TIME, organization_id: ORG_ID, name: "Time comercial", acesso: "escolhidos" },
    { id: V_VIZINHO, organization_id: OUTRA_ORG, name: "Do vizinho", acesso: "todos" },
  ];
  tabelas.crm_pipeline_view_origens = [
    { view_id: V_TIME, organization_id: ORG_ID, pipeline_id: F_NAYARA, position: 1 },
    { view_id: V_TIME, organization_id: ORG_ID, pipeline_id: F_MORTO, position: 2 },
    { view_id: V_TIME, organization_id: ORG_ID, pipeline_id: F_LEADS, position: 3 },
    { view_id: V_VIZINHO, organization_id: OUTRA_ORG, pipeline_id: F_VIZINHO, position: 1 },
  ];
  tabelas.crm_pipeline_view_pessoas = [{ view_id: V_TIME, organization_id: ORG_ID, user_id: P_ANA }];
  return db;
}

/** Faz o `rpc` do dublê devolver o erro que o Postgres devolveria. */
function rpcFalha(db: ReturnType<typeof banco>, code: string) {
  (db.client as { rpc: unknown }).rpc = async (nome: string, args: unknown) => {
    db.rpcs.push({ nome, args });
    return { data: null, error: { code, message: `erro ${code}` } };
  };
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
const criar = (body: unknown) => POST(pedido("/api/v1/pipeline-views", "POST", body));
const mudar = (id: string, body: unknown) => PATCH(pedido(`/api/v1/pipeline-views/${id}`, "PATCH", body), ctx(id));
const excluir = (id: string) => DELETE(pedido(`/api/v1/pipeline-views/${id}`, "DELETE"), ctx(id));
const listaDe = async (res: Response) => ((await res.json()) as { data: Visualizacao[] }).data;
const novaValida = { id: V_NOVA, name: "Análise", acesso: "todos", origens: [F_LEADS, F_NAYARA] };

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  authOk();
});

describe("GET /api/v1/pipeline-views", () => {
  it("devolve as visualizações da organização com origens na ordem e pessoas, sem as do vizinho", async () => {
    banco();
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await listaDe(res)).toEqual([
      { id: V_TIME, name: "Time comercial", acesso: "escolhidos", origens: [F_NAYARA, F_MORTO, F_LEADS], pessoas: [P_ANA] },
    ]);
    expect(vi.mocked(requireRole).mock.calls[0]![0]).toBe("viewer");
  });
});

describe("POST /api/v1/pipeline-views", () => {
  it("grava pela função, com a organização da sessão, e responde 201 com a lista relida", async () => {
    const db = banco();
    const res = await criar({ ...novaValida, pessoas: [P_ANA] });
    expect(res.status).toBe(201);
    expect(db.rpcs).toEqual([
      {
        nome: "fn_escale_salvar_visualizacao",
        args: { p_id: V_NOVA, p_org: ORG_ID, p_nome: "Análise", p_acesso: "todos", p_origens: [F_LEADS, F_NAYARA], p_pessoas: [] },
      },
    ]);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline_view.created", resourceId: V_NOVA, organizationId: ORG_ID }),
    );
  });

  it("acesso escolhidos leva as pessoas, sem repetir", async () => {
    const db = banco();
    await criar({ ...novaValida, acesso: "escolhidos", pessoas: [P_ANA, P_BIA, P_ANA] });
    expect((db.rpcs[0]!.args as { p_pessoas: string[] }).p_pessoas).toEqual([P_ANA, P_BIA]);
  });

  it("recusa com 422, sem gravar: nome repetido, origem arquivada ou do vizinho, mais de 20 e escolhidos sem ninguém", async () => {
    const db = banco();
    expect((await criar({ ...novaValida, name: "time COMERCIAL" })).status).toBe(422);
    expect((await criar({ ...novaValida, origens: [F_LEADS, F_MORTO] })).status).toBe(422);
    expect((await criar({ ...novaValida, origens: [F_VIZINHO] })).status).toBe(422);
    const vinteEUma = Array.from({ length: 21 }, (_, i) => `bbbbbbbb-bbbb-4bbb-8bbb-${String(i).padStart(12, "0")}`);
    expect((await criar({ ...novaValida, origens: vinteEUma })).status).toBe(422);
    expect((await criar({ ...novaValida, acesso: "escolhidos", pessoas: [] })).status).toBe(422);
    expect(db.rpcs).toEqual([]);
  });

  it("corpo que não é JSON é 400; chave a mais é 422", async () => {
    banco();
    expect((await criar("{quebrado")).status).toBe(400);
    expect((await criar({ ...novaValida, organization_id: OUTRA_ORG })).status).toBe(422);
  });

  it("os erros do banco têm nome: 23505 é 409, 23503 é 422, 42501 é 403", async () => {
    for (const [code, status] of [
      ["23505", 409],
      ["23503", 422],
      ["42501", 403],
    ] as const) {
      const db = banco();
      rpcFalha(db, code);
      expect((await criar(novaValida)).status).toBe(status);
    }
    expect(audit).not.toHaveBeenCalled();
  });

  it("quem não é gerente para no requireRole; o suporte somente leitura para antes", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await criar(novaValida)).status).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(new Response(null, { status: 423 }) as never);
    expect((await criar(novaValida)).status).toBe(423);
  });
});

describe("PATCH /api/v1/pipeline-views/:id", () => {
  it("trocar só o nome mantém acesso e pessoas, e tira a origem arquivada", async () => {
    const db = banco();
    expect((await mudar(V_TIME, { name: "Time de vendas" })).status).toBe(200);
    expect(db.rpcs[0]!.args).toEqual({
      p_id: V_TIME,
      p_org: ORG_ID,
      p_nome: "Time de vendas",
      p_acesso: "escolhidos",
      p_origens: [F_NAYARA, F_LEADS],
      p_pessoas: [P_ANA],
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_view.updated", resourceId: V_TIME }));
  });

  it("trocar as origens e passar para todos", async () => {
    const db = banco();
    await mudar(V_TIME, { origens: [F_LEADS], acesso: "todos" });
    expect(db.rpcs[0]!.args).toMatchObject({ p_origens: [F_LEADS], p_acesso: "todos", p_pessoas: [] });
  });

  it("visualização do vizinho ou inexistente é 404; corpo vazio é 422", async () => {
    const db = banco();
    expect((await mudar(V_VIZINHO, { name: "Minha" })).status).toBe(404);
    expect((await mudar(V_NOVA, { name: "Minha" })).status).toBe(404);
    expect((await mudar(V_TIME, {})).status).toBe(422);
    expect(db.rpcs).toEqual([]);
  });
});

describe("DELETE /api/v1/pipeline-views/:id", () => {
  it("apaga filtrando por id e organização e audita", async () => {
    const db = banco();
    const res = await excluir(V_TIME);
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipeline_views")!;
    expect(escrita.tipo).toBe("delete");
    expect(escrita.filtros).toEqual(expect.arrayContaining([["id", V_TIME], ["organization_id", ORG_ID]]));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_view.deleted", resourceId: V_TIME }));
  });

  it("visualização do vizinho é 404 e nada é apagado", async () => {
    const db = banco();
    expect((await excluir(V_VIZINHO)).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-visualizacoes-rotas.test.ts
```
Expected: FAIL — `Failed to resolve import "@/app/api/v1/pipeline-views/route"`.

- [ ] **Step 3: A leitura e as respostas**

Create `lib/escale/visualizacoes/ler-visualizacoes.ts`:

```ts
/**
 * Lê as VISUALIZAÇÕES da organização (fork Escale, Fase 1C) com as origens (na
 * ordem das colunas) e as pessoas de cada uma.
 *
 * Quais aparecem é a RLS que decide (migration 9003): com acesso "escolhidos",
 * quem não foi escolhido nem recebe a linha; e só gerente+ recebe a lista
 * inteira de pessoas. O filtro de `organization_id` não é redundante — a policy
 * libera TODAS as organizações do usuário (o mesmo cuidado de `ler-origens.ts`).
 *
 * LANÇA no erro do banco — quem chama decide: a rota responde 500; o painel
 * mostra a seção vazia (`ComOrigens`); a página do quadro cai no erro.
 */
import type { createClient } from "@/lib/supabase/server";

import { ACESSOS_DE_VISUALIZACAO, type AcessoDaVisualizacao, type Visualizacao } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Valor fora da lista (impossível com o CHECK) cai no MAIS fechado. */
const acessoValido = (valor: unknown): AcessoDaVisualizacao =>
  (ACESSOS_DE_VISUALIZACAO as readonly unknown[]).includes(valor) ? (valor as AcessoDaVisualizacao) : "escolhidos";

export async function lerVisualizacoes(supabase: Supabase, orgId: string): Promise<Visualizacao[]> {
  const [vistas, origens, pessoas] = await Promise.all([
    supabase.from("crm_pipeline_views").select("id, name, acesso").eq("organization_id", orgId),
    supabase
      .from("crm_pipeline_view_origens")
      .select("view_id, pipeline_id, position")
      .eq("organization_id", orgId)
      .order("position"),
    supabase.from("crm_pipeline_view_pessoas").select("view_id, user_id").eq("organization_id", orgId),
  ]);
  if (vistas.error) throw new Error(vistas.error.message);
  if (origens.error) throw new Error(origens.error.message);
  if (pessoas.error) throw new Error(pessoas.error.message);

  const linhasDeOrigem = (origens.data ?? []) as Array<{ view_id: string; pipeline_id: string; position: number }>;
  const linhasDePessoa = (pessoas.data ?? []) as Array<{ view_id: string; user_id: string }>;
  return ((vistas.data ?? []) as Array<{ id: string; name: string; acesso: unknown }>)
    .map((v) => ({
      id: v.id,
      name: v.name,
      acesso: acessoValido(v.acesso),
      origens: linhasDeOrigem
        .filter((o) => o.view_id === v.id)
        .sort((a, b) => a.position - b.position)
        .map((o) => o.pipeline_id),
      pessoas: linhasDePessoa.filter((p) => p.view_id === v.id).map((p) => p.user_id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}
```

Create `lib/escale/visualizacoes/respostas.ts`:

```ts
/**
 * O que as rotas de visualizações compartilham (fork Escale, Fase 1C): reler a
 * lista e dar nome aos erros do banco.
 *
 * `requireSupportWrite()` e `requireRole()` NÃO moram aqui de propósito: o gate
 * `tests/unit/suporte-cobertura-de-efeitos.test.ts` lê cada handler e exige a
 * guarda de suporte escrita nele.
 */
import { fail, ok } from "@/lib/api/wrappers";
import type { createClient } from "@/lib/supabase/server";

import { lerVisualizacoes } from "./ler-visualizacoes";
import type { Visualizacao } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function visualizacoesOuFalha(
  supabase: Supabase,
  orgId: string,
  requestId: string,
): Promise<{ ok: true; visualizacoes: Visualizacao[] } | { ok: false; resposta: Response }> {
  try {
    return { ok: true, visualizacoes: await lerVisualizacoes(supabase, orgId) };
  } catch (err) {
    return { ok: false, resposta: fail("internal_error", (err as Error).message, 500, { requestId }) };
  }
}

/** Responde com a lista RELIDA do banco: a tela aplica o corpo, sem esperar o refresh. */
export async function responderComVisualizacoes(
  supabase: Supabase,
  orgId: string,
  requestId: string,
  status: 200 | 201 = 200,
): Promise<Response> {
  const lido = await visualizacoesOuFalha(supabase, orgId, requestId);
  return lido.ok ? ok(lido.visualizacoes, { status, requestId }) : lido.resposta;
}

/**
 * A função grava como quem chama (security invoker): o que o banco recusa tem
 * nome para gente. 23505 = o índice do nome venceu a corrida; 23503 = a FK
 * composta recusou origem ou pessoa de fora; 22023 = a faixa de 1 a 20; 42501 =
 * a RLS (o papel mudou entre o `requireRole` e a escrita).
 */
export function falhaDaGravacao(
  erro: { code?: string; message?: string },
  t: (texto: string) => string,
  requestId: string,
): Response {
  if (erro.code === "23505") return fail("state_conflict", t("Já existe uma visualização com esse nome."), 409, { requestId });
  if (erro.code === "23503") {
    return fail("unprocessable_entity", t("Escolha origens e pessoas desta organização."), 422, { requestId });
  }
  if (erro.code === "22023") return fail("unprocessable_entity", t("Uma visualização junta de 1 a 20 origens."), 422, { requestId });
  if (erro.code === "42501") return fail("forbidden", t("Só gerente ou administrador muda visualizações."), 403, { requestId });
  return fail("internal_error", erro.message ?? "", 500, { requestId });
}
```

- [ ] **Step 4: Os códigos de auditoria**

Em `lib/audit/actions.ts`, logo DEPOIS da linha `  "pipeline_group.unarchived",`, acrescente:

```ts
  // FORK ESCALE · Fase 1C: visualizações de origens (migration 9003).
  "pipeline_view.created",
  "pipeline_view.updated",
  "pipeline_view.deleted",
```

- [ ] **Step 5: As rotas**

Create `app/api/v1/pipeline-views/route.ts`:

```ts
/**
 * GET/POST /api/v1/pipeline-views — lista / cria uma VISUALIZAÇÃO de origens
 * (fork Escale, Fase 1C).
 *
 * GET: qualquer papel; a RLS decide quais visualizações a pessoa vê. POST:
 * gerente+. O `id` vem da tela (uuid novo), para ela já saber para onde ir depois
 * de criar. A `organization_id` sai da sessão, nunca do corpo. A gravação é
 * `fn_escale_salvar_visualizacao` (uma transação, como quem chama).
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerJson, origensOuFalha } from "@/lib/escale/origens/respostas";
import { ACESSOS_DE_VISUALIZACAO, montarGravacao } from "@/lib/escale/visualizacoes/regras";
import {
  falhaDaGravacao,
  responderComVisualizacoes,
  visualizacoesOuFalha,
} from "@/lib/escale/visualizacoes/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const corpoSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().max(200),
    acesso: z.enum(ACESSOS_DE_VISUALIZACAO),
    origens: z.array(z.string().uuid()).max(100),
    pessoas: z.array(z.string().uuid()).max(500).default([]),
  })
  .strict();

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_pipeline_views" });
  if (!authz.ok) return authz.response;
  return responderComVisualizacoes(await createClient(), authz.org.orgId, requestId);
}

export async function POST(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_views" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const supabase = await createClient();
  const [origens, visualizacoes] = await Promise.all([
    origensOuFalha(supabase, orgId, requestId),
    visualizacoesOuFalha(supabase, orgId, requestId),
  ]);
  if (!origens.ok) return origens.resposta;
  if (!visualizacoes.ok) return visualizacoes.resposta;

  const veredito = montarGravacao(parsed.data, origens.origens, visualizacoes.visualizacoes, null);
  if (!veredito.ok) return fail("unprocessable_entity", t(veredito.erro), 422, { requestId });
  const { gravacao } = veredito;

  const { error } = await supabase.rpc("fn_escale_salvar_visualizacao", {
    p_id: parsed.data.id,
    p_org: orgId,
    p_nome: gravacao.nome,
    p_acesso: gravacao.acesso,
    p_origens: gravacao.origens,
    p_pessoas: gravacao.pessoas,
  });
  if (error) return falhaDaGravacao(error, t, requestId);

  void audit({
    action: "pipeline_view.created",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_view",
    resourceId: parsed.data.id,
    requestId,
    metadata: { name: gravacao.nome, acesso: gravacao.acesso, origens: gravacao.origens.length },
  });

  return responderComVisualizacoes(supabase, orgId, requestId, 201);
}
```

Create `app/api/v1/pipeline-views/[id]/route.ts`:

```ts
/**
 * PATCH/DELETE /api/v1/pipeline-views/[id] — mudar e excluir uma VISUALIZAÇÃO de
 * origens (fork Escale, Fase 1C). Gerente+.
 *
 * PATCH é parcial (nome, acesso, origens, pessoas): o que não veio fica como
 * está — menos as origens arquivadas ou apagadas, que saem na gravação (o quadro
 * já não as mostrava). DELETE apaga a visualização; as listas vão junto (FK
 * cascade) e nenhuma origem ou negócio é tocado. Visualização de outra
 * organização morre no 404 antes de qualquer escrita.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerJson, origensOuFalha } from "@/lib/escale/origens/respostas";
import {
  ACESSOS_DE_VISUALIZACAO,
  montarGravacao,
  origensVivasDaVisualizacao,
} from "@/lib/escale/visualizacoes/regras";
import {
  falhaDaGravacao,
  responderComVisualizacoes,
  visualizacoesOuFalha,
} from "@/lib/escale/visualizacoes/respostas";
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
    acesso: z.enum(ACESSOS_DE_VISUALIZACAO).optional(),
    origens: z.array(z.string().uuid()).max(100).optional(),
    pessoas: z.array(z.string().uuid()).max(500).optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0);

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_views" });
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

  const supabase = await createClient();
  const [origens, visualizacoes] = await Promise.all([
    origensOuFalha(supabase, orgId, requestId),
    visualizacoesOuFalha(supabase, orgId, requestId),
  ]);
  if (!origens.ok) return origens.resposta;
  if (!visualizacoes.ok) return visualizacoes.resposta;

  const atual = visualizacoes.visualizacoes.find((v) => v.id === id);
  if (!atual) return fail("not_found", t("Visualização não encontrada."), 404, { requestId });

  const veredito = montarGravacao(
    {
      name: parsed.data.name ?? atual.name,
      acesso: parsed.data.acesso ?? atual.acesso,
      origens: parsed.data.origens ?? origensVivasDaVisualizacao(atual, origens.origens).map((f) => f.id),
      pessoas: parsed.data.pessoas ?? atual.pessoas,
    },
    origens.origens,
    visualizacoes.visualizacoes,
    id,
  );
  if (!veredito.ok) return fail("unprocessable_entity", t(veredito.erro), 422, { requestId });
  const { gravacao } = veredito;

  const { error } = await supabase.rpc("fn_escale_salvar_visualizacao", {
    p_id: id,
    p_org: orgId,
    p_nome: gravacao.nome,
    p_acesso: gravacao.acesso,
    p_origens: gravacao.origens,
    p_pessoas: gravacao.pessoas,
  });
  if (error) return falhaDaGravacao(error, t, requestId);

  void audit({
    action: "pipeline_view.updated",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_view",
    resourceId: id,
    requestId,
    metadata: { campos: Object.keys(parsed.data), acesso: gravacao.acesso, origens: gravacao.origens.length },
  });

  return responderComVisualizacoes(supabase, orgId, requestId);
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipeline_views" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const visualizacoes = await visualizacoesOuFalha(supabase, orgId, requestId);
  if (!visualizacoes.ok) return visualizacoes.resposta;
  const atual = visualizacoes.visualizacoes.find((v) => v.id === id);
  if (!atual) return fail("not_found", t("Visualização não encontrada."), 404, { requestId });

  const { error } = await supabase.from("crm_pipeline_views").delete().eq("id", id).eq("organization_id", orgId);
  if (error) return fail("internal_error", error.message, 500, { requestId });

  void audit({
    action: "pipeline_view.deleted",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_pipeline_view",
    resourceId: id,
    requestId,
    metadata: { name: atual.name },
  });

  return responderComVisualizacoes(supabase, orgId, requestId);
}
```

- [ ] **Step 6: Rodar os testes, o gate do suporte e o typecheck**

```bash
corepack pnpm vitest run tests/unit/escale-visualizacoes-rotas.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts
corepack pnpm typecheck
```
Expected: os 2 arquivos PASS; typecheck sem erros. Se `suporte-cobertura-de-efeitos` reclamar das rotas novas, confira que `requireSupportWrite()` está escrito DENTRO de cada handler de escrita (POST, PATCH, DELETE), como acima. Se o typecheck reclamar do nome da função em `supabase.rpc(...)` (tipos gerados do banco sem a 9003), troque a chamada por `supabase.rpc("fn_escale_salvar_visualizacao" as never, { … } as never)` nas DUAS rotas — e confira antes, com `grep -rn "rpc(\"fn_" app/api/v1 | head`, como o original chama funções que ainda não estão nos tipos.

- [ ] **Step 7: Commit**

```bash
git add lib/escale/visualizacoes/ler-visualizacoes.ts lib/escale/visualizacoes/respostas.ts lib/audit/actions.ts app/api/v1/pipeline-views tests/unit/escale-visualizacoes-rotas.test.ts
git commit -m "feat(escale): rotas das visualizações (listar, criar, mudar, excluir) com acesso

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: O quadro combinado (colunas, arrasto, dossiê)

**Files:**
- Create: `hooks/escale/useQuadrosDaVisualizacao.ts`, `components/escale/visualizacoes/MotorDaOrigem.tsx`, `components/escale/visualizacoes/ColunaDaVisualizacao.tsx`, `components/escale/visualizacoes/QuadroCombinado.tsx`, `tests/unit/escale-quadro-combinado.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`montarColunas`, `cardsDaColuna`, `planejarSoltura`, `alternarNaSelecao`, `ColunaCombinada`); do original, sem alterar: `chaveDoQuadro(pipelineId)` e `useBoard(pipelineId)` (`hooks/kanban/useBoard.ts`, devolve `pulses: Map<string, number>`), `useMoveCard(pipelineId, { onCamposFaltando, onRetomada })` e os tipos `RecusaDeCampos` (com `args`) e `RetomadaPendente` (`hooks/kanban/useMoveCard.ts`), `KanbanCard` + `GestoDeSelecao` (`components/kanban/KanbanCard.tsx`, recebe `pipelineId` POR CARD), `buildCardInput` (`lib/kanban/card-state.ts`), `intervaloDaColuna` (`lib/kanban/selecao.ts`), `somaPorMoeda`/`formatSomaPorMoeda`/`formatValorDoNegocio`/`MOEDA_PADRAO` (`lib/money`), `LeadDossier`, `CamposObrigatoriosDialog`, `RetomarComoNovoNegocioDialog`, `camposDoFunil`, `useAssignableMembers`, `useAtRiskLeads`, `useReactivations`, `toast` de `sonner`.
- Produces:
  - `useQuadrosDaVisualizacao(pipelineIds: readonly string[]): { quadros: BoardData[]; carregando: boolean; indisponiveis: string[] }`
  - `MotorDaOrigem` + `type Mover = (args: RecusaDeCampos["args"]) => void`
  - `ColunaDaVisualizacao` + `interface ContextoDosCards`
  - `QuadroCombinado({ quadros: BoardData[]; leads: Lead[]; selecionados: string[]; onSelecao: (ids: string[]) => void; leadInicial?: string | null })`

- [ ] **Step 1: Escrever o teste do quadro combinado (vai falhar)**

Create `tests/unit/escale-quadro-combinado.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BoardData } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

const capturado = vi.hoisted(() => ({ onDragEnd: null as ((r: unknown) => void) | null }));
const movers = vi.hoisted(() => ({ A: vi.fn(), B: vi.fn() }) as Record<string, ReturnType<typeof vi.fn>>);
const SEM_PULSOS = vi.hoisted(() => new Map<string, number>());

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ onDragEnd, children }: { onDragEnd: (r: unknown) => void; children: ReactNode }) => {
    capturado.onDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  Droppable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, { isDraggingOver: false }),
}));
vi.mock("@/components/kanban/KanbanCard", () => ({
  KanbanCard: ({
    card,
    lead,
    pipelineId,
    onOpen,
  }: {
    card: { title: string; stageName: string };
    lead: { id: string };
    pipelineId: string;
    onOpen?: (id: string) => void;
  }) => (
    <button type="button" data-pipeline={pipelineId} onClick={() => onOpen?.(lead.id)}>
      {`${card.title} — ${card.stageName}`}
    </button>
  ),
}));
vi.mock("@/lib/kanban/card-state", () => ({
  buildCardInput: (lead: { title: string }, opts: { stageName: string }) => ({ title: lead.title, stageName: opts.stageName }),
}));
vi.mock("@/components/kanban/LeadDossier", () => ({
  LeadDossier: ({ pipelineId, stageName }: { pipelineId: string; stageName: string }) => (
    <p>{`dossiê ${pipelineId} ${stageName}`}</p>
  ),
}));
vi.mock("@/components/kanban/CamposObrigatoriosDialog", () => ({ CamposObrigatoriosDialog: () => null }));
vi.mock("@/components/kanban/RetomarComoNovoNegocioDialog", () => ({ RetomarComoNovoNegocioDialog: () => null }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/leads/useAtRiskLeads", () => ({ useAtRiskLeads: () => ({ data: null }) }));
vi.mock("@/hooks/leads/useReactivations", () => ({ useReactivations: () => ({ data: [] }) }));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => ({ pulses: SEM_PULSOS }),
  chaveDoQuadro: (id: string | null) => ["board", id],
}));
vi.mock("@/hooks/kanban/useMoveCard", () => ({
  useMoveCard: (pipelineId: string) => ({ mutate: movers[pipelineId] }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { toast } from "sonner";
import { QuadroCombinado } from "@/components/escale/visualizacoes/QuadroCombinado";

const lead = (id: string, pipeline_id: string, stage_id: string, title: string) =>
  ({ id, pipeline_id, stage_id, title, position_in_stage: 1000, updated_at: `upd-${id}` }) as unknown as Lead;
const etapa = (id: string, pipeline_id: string, name: string, position: number) => ({ id, pipeline_id, name, position, color: null });
const LEAD_A = lead("l-a", "A", "a1", "Ana");
const LEAD_B = lead("l-b", "B", "b1", "Bia");
const QUADROS = [
  {
    pipeline: { id: "A", name: "Leads", settings: {} },
    stages: [etapa("a1", "A", "Entrada", 1), etapa("a2", "A", "Proposta", 2)],
    leads: [LEAD_A],
  },
  {
    pipeline: { id: "B", name: "Parceiros", settings: {} },
    stages: [etapa("b1", "B", "Entrada", 1), etapa("b2", "B", "Qualificação", 2)],
    leads: [LEAD_B],
  },
] as unknown as BoardData[];

const onSelecao = vi.fn();

function renderizar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QuadroCombinado quadros={QUADROS} leads={[LEAD_A, LEAD_B]} selecionados={[]} onSelecao={onSelecao} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

const soltar = (draggableId: string, de: string, para: string, index = 0) =>
  act(async () => {
    capturado.onDragEnd?.({
      draggableId,
      source: { droppableId: de, index: 0 },
      destination: { droppableId: para, index },
      reason: "DROP",
      type: "LEAD",
      mode: "FLUID",
    });
  });

beforeEach(() => {
  capturado.onDragEnd = null;
  movers.A!.mockReset();
  movers.B!.mockReset();
  onSelecao.mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("<QuadroCombinado>", () => {
  it("etapas de mesmo nome juntam os cards das origens, e cada card diz de qual origem é", () => {
    renderizar();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Entrada",
      "Qualificação",
      "Proposta",
    ]);
    const entrada = document.querySelector('[data-coluna-da-visualizacao="Entrada"]') as HTMLElement;
    expect(within(entrada).getByRole("button", { name: "Ana — Entrada · Leads" })).toHaveAttribute("data-pipeline", "A");
    expect(within(entrada).getByRole("button", { name: "Bia — Entrada · Parceiros" })).toHaveAttribute("data-pipeline", "B");
  });

  it("soltar numa coluna que a origem do card não tem recusa com aviso e não move", async () => {
    renderizar();
    await soltar("l-a", "coluna:Entrada", "coluna:Qualificação");
    expect(toast.error).toHaveBeenCalledWith("A origem «Leads» não tem a etapa «Qualificação».");
    expect(movers.A).not.toHaveBeenCalled();
  });

  it("soltar numa coluna com a etapa move pela origem do card, com o updated_at dele", async () => {
    renderizar();
    await soltar("l-a", "coluna:Entrada", "coluna:Proposta");
    expect(movers.A).toHaveBeenCalledWith({
      leadId: "l-a",
      stageId: "a2",
      positionInStage: 1000,
      expectedUpdatedAt: "upd-l-a",
    });
    expect(movers.B).not.toHaveBeenCalled();
  });

  it("abrir o card abre o dossiê com a origem e a etapa dele", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Bia — Entrada · Parceiros" }));
    expect(screen.getByText("dossiê B Entrada")).toBeInTheDocument();
  });

  it("selecionar a coluna inteira marca os cards das duas origens", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("checkbox", { name: "Selecionar todos em Entrada" }));
    expect(onSelecao).toHaveBeenCalledWith(["l-a", "l-b"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-combinado.test.tsx
```
Expected: FAIL — `Failed to resolve import "@/components/escale/visualizacoes/QuadroCombinado"`.

- [ ] **Step 3: A leitura dos quadros e o motor de cada origem**

Create `hooks/escale/useQuadrosDaVisualizacao.ts`:

```ts
"use client";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";

import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import { apiClient } from "@/lib/api/client";
import type { BoardData } from "@/lib/kanban/types";

/**
 * OS QUADROS DAS ORIGENS DE UMA VISUALIZAÇÃO (fork Escale, Fase 1C).
 *
 * Cada origem é lida pela MESMA rota e com a MESMA chave de cache do funil
 * (`chaveDoQuadro`). É isso que faz a permissão de cada origem valer aqui sem
 * cópia (a rota lê com a sessão de quem olha), e faz o arrasto, as ações do
 * card e o tempo real — que escrevem nessa chave — aparecerem no quadro
 * combinado sem código novo. Origem que a pessoa não pode abrir (403/404) entra
 * em `indisponiveis` e o resto do quadro abre.
 */
async function buscarQuadro(pipelineId: string): Promise<BoardData> {
  const res = await apiClient.get<{ data: BoardData }>(`/api/v1/pipelines/${pipelineId}/board`);
  // O mesmo cuidado do `fetchBoard` do funil: aceita o envelope e o corpo cru.
  return res && typeof res === "object" && "data" in res ? res.data : (res as unknown as BoardData);
}

export interface QuadrosDaVisualizacao {
  quadros: BoardData[];
  carregando: boolean;
  indisponiveis: string[];
}

export function useQuadrosDaVisualizacao(pipelineIds: readonly string[]): QuadrosDaVisualizacao {
  const combine = useCallback(
    (resultados: UseQueryResult<BoardData>[]): QuadrosDaVisualizacao => ({
      quadros: resultados.flatMap((r) => (r.data ? [r.data] : [])),
      carregando: resultados.some((r) => r.isPending),
      indisponiveis: resultados.flatMap((r, i) => (r.isError && !r.data ? [pipelineIds[i]!] : [])),
    }),
    [pipelineIds],
  );
  return useQueries({
    queries: pipelineIds.map((id) => ({ queryKey: chaveDoQuadro(id), queryFn: () => buscarQuadro(id) })),
    combine,
  });
}
```

Create `components/escale/visualizacoes/MotorDaOrigem.tsx`:

```tsx
"use client";
import { useEffect } from "react";

import { useBoard } from "@/hooks/kanban/useBoard";
import { useMoveCard, type RecusaDeCampos, type RetomadaPendente } from "@/hooks/kanban/useMoveCard";

export type Mover = (args: RecusaDeCampos["args"]) => void;

/**
 * O MOTOR DE UMA ORIGEM dentro do quadro combinado (fork Escale, Fase 1C).
 *
 * Não desenha nada. Liga o tempo real e a rede de segurança dessa origem
 * (`useBoard`) e o arrasto dela (`useMoveCard`, com a recusa de campos
 * obrigatórios e a retomada como novo negócio), e entrega ao quadro o `mover` e
 * os pulsos. São os hooks do funil, sem cópia — um motor por origem porque cada
 * hook é amarrado a um `pipelineId`, e hook não roda dentro de laço.
 */
export function MotorDaOrigem({
  pipelineId,
  onMover,
  onPulsos,
  onCamposFaltando,
  onRetomada,
}: {
  pipelineId: string;
  onMover: (pipelineId: string, mover: Mover | null) => void;
  onPulsos: (pipelineId: string, pulsos: Map<string, number>) => void;
  onCamposFaltando: (pipelineId: string, recusa: RecusaDeCampos) => void;
  onRetomada: (pipelineId: string, retomada: RetomadaPendente) => void;
}) {
  const { pulses } = useBoard(pipelineId);
  const { mutate } = useMoveCard(pipelineId, {
    onCamposFaltando: (recusa) => onCamposFaltando(pipelineId, recusa),
    onRetomada: (retomada) => onRetomada(pipelineId, retomada),
  });

  useEffect(() => {
    onMover(pipelineId, mutate);
    return () => onMover(pipelineId, null);
  }, [pipelineId, mutate, onMover]);

  useEffect(() => {
    onPulsos(pipelineId, pulses);
  }, [pipelineId, pulses, onPulsos]);

  return null;
}
```

- [ ] **Step 4: A coluna combinada**

Create `components/escale/visualizacoes/ColunaDaVisualizacao.tsx`:

```tsx
"use client";
import { Droppable } from "@hello-pangea/dnd";
import { useRef, type CSSProperties } from "react";

import { KanbanCard, type GestoDeSelecao } from "@/components/kanban/KanbanCard";
import { useT } from "@/hooks/i18n/useT";
import type { ColunaCombinada } from "@/lib/escale/visualizacoes/regras";
import { buildCardInput } from "@/lib/kanban/card-state";
import { intervaloDaColuna } from "@/lib/kanban/selecao";
import { formatSomaPorMoeda, formatValorDoNegocio, MOEDA_PADRAO, somaPorMoeda } from "@/lib/money";
import type { Lead } from "@/lib/types/leads";
import { cn } from "@/lib/utils";

/** O que todo card do quadro combinado precisa, resolvido uma vez no quadro. */
export interface ContextoDosCards {
  /** Origem → nome: o "em Proposta · Leads PA" do rodapé do card. */
  nomeDaOrigem: Record<string, string>;
  /** Origem → `settings.canonical_tags` (a tag que fica no card é a da origem DELE). */
  tagsCanonicas: Record<string, string[]>;
  ownerNames: Map<string, string | null>;
  coolingIds: Set<string>;
  reactivations: Map<string, { proposalId: string; expiresAt: string }>;
  pulses: Map<string, number>;
}

/**
 * UMA COLUNA DO QUADRO COMBINADO (fork Escale, Fase 1C): as etapas de mesmo nome
 * de várias origens. Os cards são os do funil (`KanbanCard`), cada um com o
 * `pipelineId` da PRÓPRIA origem — é o que faz ganhar, perder, editar e mover
 * para outro funil funcionarem igual ao funil. O cabeçalho é só leitura:
 * renomear uma coluna seria renomear etapas de várias origens, e isso se faz em
 * cada origem.
 */
export function ColunaDaVisualizacao({
  coluna,
  leads,
  contexto,
  selecionados,
  onSelectMany,
  onOpen,
}: {
  coluna: ColunaCombinada;
  leads: Lead[];
  contexto: ContextoDosCards;
  selecionados: Set<string>;
  onSelectMany: (ids: string[], marcar: boolean) => void;
  onOpen: (leadId: string) => void;
}) {
  const t = useT();
  // O total por moeda e a moeda que vem primeiro: a mesma régua de `StageColumn`.
  const moedaDoLead = (l: Lead) => l.currency ?? MOEDA_PADRAO;
  const totais = somaPorMoeda(leads, (l) => l.value_cents, moedaDoLead);
  const primeira = [...somaPorMoeda(leads, (l) => (l.value_cents == null ? null : 1), moedaDoLead)].sort(
    ([ma, na], [mb, nb]) => nb - na || ma.localeCompare(mb),
  )[0]?.[0];
  const temTotal = [...totais.values()].some((cents) => cents > 0);

  const ids = leads.map((l) => l.id);
  const aqui = ids.filter((id) => selecionados.has(id)).length;
  const todos = ids.length > 0 && aqui === ids.length;
  const ancora = useRef<string | null>(null);

  const aoSelecionar = (leadId: string, gesto: GestoDeSelecao) => {
    if (gesto === "intervalo") {
      const faixa = intervaloDaColuna(ids, ancora.current, leadId);
      ancora.current = leadId;
      onSelectMany(faixa, true);
      return;
    }
    ancora.current = leadId;
    onSelectMany([leadId], !selecionados.has(leadId));
  };
  const alternarColuna = () => {
    ancora.current = null;
    onSelectMany(ids, !todos);
  };
  const cor: CSSProperties | undefined = coluna.cor ? { backgroundColor: coluna.cor } : undefined;

  return (
    <div
      className="bg-surface-muted/40 flex min-h-full w-[85vw] max-w-80 shrink-0 snap-center flex-col rounded-lg border border-border md:w-80"
      data-coluna-da-visualizacao={coluna.nome}
    >
      <div className="sticky top-0 z-10 rounded-t-lg bg-background">
        <div className="bg-surface-muted/40 rounded-t-lg">
          <div className="group/etapa flex items-center gap-2 border-b border-border px-3 py-2.5">
            <input
              type="checkbox"
              checked={todos}
              ref={(el) => {
                if (el) el.indeterminate = aqui > 0 && !todos;
              }}
              disabled={ids.length === 0}
              onChange={alternarColuna}
              aria-label={todos ? `${t("Desmarcar todos em")} ${coluna.nome}` : `${t("Selecionar todos em")} ${coluna.nome}`}
              className={cn(
                "h-4 w-4 shrink-0 cursor-pointer accent-accent transition-opacity focus:opacity-100 disabled:cursor-default",
                aqui > 0 ? "opacity-100" : "opacity-0 group-hover/etapa:opacity-100 pointer-coarse:opacity-100",
              )}
            />
            <span className={cn("h-2 w-2 rounded-full", !coluna.cor && "bg-text-muted/40")} style={cor} aria-hidden />
            <h2 className="flex-1 truncate text-sm font-semibold text-text">{coluna.nome}</h2>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-muted tabular-nums">
              {aqui > 0 ? `${aqui}/${leads.length}` : leads.length}
            </span>
          </div>
          {temTotal && (
            <div className="border-b border-border px-3 py-1.5 text-[11px] text-text-muted tabular-nums">
              {formatSomaPorMoeda(totais, formatValorDoNegocio, { primeira })}
            </div>
          )}
        </div>
      </div>

      <Droppable droppableId={coluna.chave} type="LEAD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn("flex flex-1 flex-col gap-2 p-2 transition-colors", snapshot.isDraggingOver && "bg-accent/5")}
          >
            {leads.map((lead, idx) => (
              <KanbanCard
                key={lead.id}
                card={buildCardInput(lead, {
                  stageName: `${coluna.nome} · ${contexto.nomeDaOrigem[lead.pipeline_id] ?? ""}`,
                  ownerNames: contexto.ownerNames,
                  coolingIds: contexto.coolingIds,
                  reactivations: contexto.reactivations,
                  canonicalTags: contexto.tagsCanonicas[lead.pipeline_id] ?? [],
                })}
                lead={lead}
                index={idx}
                pipelineId={lead.pipeline_id}
                isSelected={selecionados.has(lead.id)}
                isSelecting={selecionados.size > 0}
                pulseCount={contexto.pulses.get(lead.id) ?? 0}
                onSelect={aoSelecionar}
                onOpen={onOpen}
              />
            ))}
            {provided.placeholder}
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex h-20 items-center justify-center text-[11px] text-text-muted">{t("vazio")}</div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
```

- [ ] **Step 5: O quadro combinado**

Create `components/escale/visualizacoes/QuadroCombinado.tsx`:

```tsx
"use client";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CamposObrigatoriosDialog } from "@/components/kanban/CamposObrigatoriosDialog";
import { LeadDossier } from "@/components/kanban/LeadDossier";
import { RetomarComoNovoNegocioDialog } from "@/components/kanban/RetomarComoNovoNegocioDialog";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import type { RecusaDeCampos, RetomadaPendente } from "@/hooks/kanban/useMoveCard";
import { useAtRiskLeads } from "@/hooks/leads/useAtRiskLeads";
import { useReactivations } from "@/hooks/leads/useReactivations";
import { alternarNaSelecao, cardsDaColuna, montarColunas, planejarSoltura } from "@/lib/escale/visualizacoes/regras";
import type { BoardData } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { Lead } from "@/lib/types/leads";

import { ColunaDaVisualizacao, type ContextoDosCards } from "./ColunaDaVisualizacao";
import { MotorDaOrigem, type Mover } from "./MotorDaOrigem";

interface RecusaNaOrigem {
  pipelineId: string;
  recusa: RecusaDeCampos;
}
interface RetomadaNaOrigem {
  pipelineId: string;
  retomada: RetomadaPendente;
}

/**
 * O QUADRO DE UMA VISUALIZAÇÃO (fork Escale, Fase 1C): as colunas combinadas
 * (`montarColunas`), o arrasto, o dossiê e as duas janelas que o arrasto do
 * funil abre (campos obrigatórios e retomada). Tudo o que muda um card usa os
 * hooks do funil com a origem DO CARD — o `MotorDaOrigem` de cada origem
 * entrega o `mover` dela.
 *
 * `leads` chega já filtrado pela página; o `after` do arrasto sai do cache SEM
 * filtro da origem do card, como no funil (#2545).
 */
export function QuadroCombinado({
  quadros,
  leads,
  selecionados,
  onSelecao,
  leadInicial,
}: {
  quadros: BoardData[];
  leads: Lead[];
  selecionados: string[];
  onSelecao: (ids: string[]) => void;
  leadInicial?: string | null;
}) {
  const t = useT();
  const qc = useQueryClient();
  const colunas = useMemo(() => montarColunas(quadros), [quadros]);
  const quadroDe = useMemo(() => new Map(quadros.map((q) => [q.pipeline.id, q])), [quadros]);
  const selecionadosSet = useMemo(() => new Set(selecionados), [selecionados]);

  // `useRef`: trocar o `mover` registrado não muda nada na tela.
  const movers = useRef<ReadonlyMap<string, Mover>>(new Map());
  const registrarMover = useCallback((pipelineId: string, mover: Mover | null) => {
    const proximo = new Map(movers.current);
    if (mover) proximo.set(pipelineId, mover);
    else proximo.delete(pipelineId);
    movers.current = proximo;
  }, []);

  const [pulsosPorOrigem, setPulsosPorOrigem] = useState<Readonly<Record<string, Map<string, number>>>>({});
  const registrarPulsos = useCallback((pipelineId: string, pulsos: Map<string, number>) => {
    setPulsosPorOrigem((atual) => (atual[pipelineId] === pulsos ? atual : { ...atual, [pipelineId]: pulsos }));
  }, []);
  const [recusa, setRecusa] = useState<RecusaNaOrigem | null>(null);
  const [retomada, setRetomada] = useState<RetomadaNaOrigem | null>(null);
  const aoFaltarCampos = useCallback((pipelineId: string, r: RecusaDeCampos) => setRecusa({ pipelineId, recusa: r }), []);
  const aoRetomar = useCallback(
    (pipelineId: string, r: RetomadaPendente) => setRetomada({ pipelineId, retomada: r }),
    [],
  );

  const { data: members } = useAssignableMembers(true);
  const { data: atRisk } = useAtRiskLeads();
  const { data: propostasVivas } = useReactivations();

  const contexto = useMemo<ContextoDosCards>(() => {
    const origens = new Set(quadros.map((q) => q.pipeline.id));
    return {
      nomeDaOrigem: Object.fromEntries(quadros.map((q) => [q.pipeline.id, q.pipeline.name])),
      tagsCanonicas: Object.fromEntries(
        quadros.map((q) => {
          const bruto = (q.pipeline.settings ?? {}).canonical_tags;
          return [q.pipeline.id, Array.isArray(bruto) ? bruto.filter((x): x is string => typeof x === "string") : []];
        }),
      ),
      ownerNames: new Map((members ?? []).map((m) => [m.user_id, m.full_name])),
      // Esfriando vem do MESMO radar do funil, recortado pelas origens daqui.
      coolingIds: new Set(
        (atRisk?.items ?? [])
          .filter((i) => origens.has(i.pipeline_id) && (i.risk === "em_risco" || i.risk === "critico"))
          .map((i) => i.id),
      ),
      reactivations: new Map(
        (propostasVivas ?? []).map((p) => [p.lead_id, { proposalId: p.proposal_id, expiresAt: p.expires_at }]),
      ),
      pulses: new Map(Object.values(pulsosPorOrigem).flatMap((m) => [...m])),
    };
  }, [quadros, members, atRisk, propostasVivas, pulsosPorOrigem]);

  const [dossieId, setDossieId] = useState<string | null>(leadInicial ?? null);
  const leadDoDossie = dossieId ? (leads.find((l) => l.id === dossieId) ?? null) : null;
  const quadroDoDossie = leadDoDossie ? quadroDe.get(leadDoDossie.pipeline_id) : undefined;

  const selecionarVarios = useCallback(
    (ids: string[], marcar: boolean) => onSelecao([...alternarNaSelecao(selecionadosSet, ids, marcar)]),
    [onSelecao, selecionadosSet],
  );

  const aoSoltar = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;
      const lead = leads.find((l) => l.id === draggableId);
      const coluna = colunas.find((c) => c.chave === destination.droppableId);
      if (!lead || !coluna) return;

      const destino = coluna.destinos[lead.pipeline_id];
      const etapaInteira = destino
        ? (qc.getQueryData<BoardData>(chaveDoQuadro(lead.pipeline_id))?.leads.filter((l) => l.stage_id === destino) ?? null)
        : null;
      const soltura = planejarSoltura({
        lead,
        coluna,
        visiveis: cardsDaColuna(coluna, leads),
        indice: destination.index,
        etapaInteira,
      });
      if (soltura.tipo === "recusa") {
        toast.error(
          t("A origem «{origem}» não tem a etapa «{etapa}».")
            .replace("{origem}", quadroDe.get(lead.pipeline_id)?.pipeline.name ?? "")
            .replace("{etapa}", coluna.nome),
        );
        return;
      }
      if (soltura.tipo === "nada") return;
      movers.current.get(soltura.pipelineId)?.({
        leadId: lead.id,
        stageId: soltura.stageId,
        positionInStage: soltura.positionInStage,
        expectedUpdatedAt: lead.updated_at,
      });
    },
    [leads, colunas, qc, quadroDe, t],
  );

  return (
    <>
      {quadros.map((q) => (
        <MotorDaOrigem
          key={q.pipeline.id}
          pipelineId={q.pipeline.id}
          onMover={registrarMover}
          onPulsos={registrarPulsos}
          onCamposFaltando={aoFaltarCampos}
          onRetomada={aoRetomar}
        />
      ))}
      <DragDropContext onDragEnd={aoSoltar}>
        {/* Um contêiner de rolagem só, como o quadro do funil (`KanbanBoard`). */}
        <div className="flex min-h-0 flex-1 items-start gap-3 overflow-auto px-4 pb-4" data-quadro-da-visualizacao>
          {colunas.map((coluna) => (
            <ColunaDaVisualizacao
              key={coluna.chave}
              coluna={coluna}
              leads={cardsDaColuna(coluna, leads)}
              contexto={contexto}
              selecionados={selecionadosSet}
              onSelectMany={selecionarVarios}
              onOpen={setDossieId}
            />
          ))}
        </div>
      </DragDropContext>

      {leadDoDossie && quadroDoDossie && (
        <LeadDossier
          open
          onOpenChange={(aberto: boolean) => !aberto && setDossieId(null)}
          lead={leadDoDossie}
          pipelineId={leadDoDossie.pipeline_id}
          fieldDefs={camposDoFunil(quadroDoDossie.pipeline.settings ?? null)}
          stageName={quadroDoDossie.stages.find((s) => s.id === leadDoDossie.stage_id)?.name ?? "—"}
          ownerNames={contexto.ownerNames}
        />
      )}

      <CamposObrigatoriosDialog
        open={recusa !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setRecusa(null);
        }}
        recusa={recusa?.recusa ?? null}
        isPending={false}
        onConfirmar={({ customFields, wonReason }) => {
          if (!recusa) return;
          const { pipelineId, recusa: pendente } = recusa;
          setRecusa(null);
          movers.current.get(pipelineId)?.({
            ...pendente.args,
            customFields,
            ...(wonReason !== undefined ? { wonReason } : {}),
          });
        }}
      />
      {retomada && (
        <RetomarComoNovoNegocioDialog
          open
          onOpenChange={(aberto: boolean) => !aberto && setRetomada(null)}
          leadId={retomada.retomada.leadId}
          stageId={retomada.retomada.stageId}
          pipelineId={retomada.pipelineId}
        />
      )}
    </>
  );
}
```

- [ ] **Step 6: Rodar os testes e o typecheck**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-combinado.test.tsx
corepack pnpm typecheck
```
Expected: 5 testes PASS; typecheck sem erros. Se o typecheck reclamar de um prop de `CamposObrigatoriosDialog`, `LeadDossier` ou `RetomarComoNovoNegocioDialog`, compare com o uso em `components/kanban/KanbanBoard.tsx` (é a referência — a chamada aqui tem de ser a mesma de lá, só com o `pipelineId` da origem do card).

- [ ] **Step 7: Commit**

```bash
git add hooks/escale/useQuadrosDaVisualizacao.ts components/escale/visualizacoes/MotorDaOrigem.tsx components/escale/visualizacoes/ColunaDaVisualizacao.tsx components/escale/visualizacoes/QuadroCombinado.tsx tests/unit/escale-quadro-combinado.test.tsx
git commit -m "feat(escale): quadro combinado da visualização (colunas por nome, arrasto pela origem do card, dossiê)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: A página da visualização (título, novo negócio, filtros, lote)

**Files:**
- Create: `components/escale/visualizacoes/LoteDaVisualizacao.tsx`, `components/escale/visualizacoes/QuadroDaVisualizacao.tsx`, `app/app/pipelines/visualizacoes/[id]/page.tsx`, `tests/unit/escale-quadro-da-visualizacao.test.tsx`, `tests/unit/escale-pagina-da-visualizacao.test.tsx`

**Interfaces:**
- Consumes: Task 5 (`useQuadrosDaVisualizacao`, `QuadroCombinado`); Task 3 (`settingsDaVisualizacao`, `origensVivasDaVisualizacao`); Task 4 (`lerVisualizacoes`); `lerOrigens` (`lib/escale/origens/ler-origens.ts`); do original: `FilterBar` (`{ filters, onChange, leads, settings }`), `BulkActionBar` (`{ selectedIds, stages, pipelineId, vocabulary, tagsExistentes, onClear }`), `NewLeadDialog` (`{ open, onOpenChange, pipelineId, stages, leads }`), `applyFilters`/`filtersFromParams`/`filtersToParams`/`LeadFilters` (`lib/kanban/filters.ts`), `categoriaDoMotivo` (`lib/leads/motivos-de-perda-do-funil.ts`), `requireAuth`/`resolveActiveOrg` (`lib/auth/server.ts`).
- Produces: a rota `/app/pipelines/visualizacoes/<id>` (dentro do layout de `app/app/pipelines`, então o painel Origens fica ao lado); `QuadroDaVisualizacao({ nome: string; origens: Array<{ id: string; name: string }> })`; `LoteDaVisualizacao({ selecionados: string[]; quadros: BoardData[]; onLimpar: () => void })`.

- [ ] **Step 1: Escrever os testes da página (vão falhar)**

Create `tests/unit/escale-quadro-da-visualizacao.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BoardData } from "@/lib/kanban/types";

const busca = vi.hoisted(() => ({ atual: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/pipelines/visualizacoes/v-1",
  useSearchParams: () => new URLSearchParams(busca.atual),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/escale/useQuadrosDaVisualizacao", () => ({ useQuadrosDaVisualizacao: vi.fn() }));
vi.mock("@/components/escale/visualizacoes/QuadroCombinado", () => ({
  QuadroCombinado: ({ leads }: { leads: Array<{ id: string }> }) => (
    <ul aria-label="quadro">
      {leads.map((l) => (
        <li key={l.id}>{l.id}</li>
      ))}
    </ul>
  ),
}));
vi.mock("@/components/kanban/FilterBar", () => ({ FilterBar: () => <div>filtros</div> }));
vi.mock("@/components/kanban/BulkActionBar", () => ({
  BulkActionBar: ({ pipelineId, stages, selectedIds }: { pipelineId: string; stages: unknown[]; selectedIds: string[] }) => (
    <p>{`lote ${pipelineId} ${stages.length} ${selectedIds.length}`}</p>
  ),
}));
vi.mock("@/components/kanban/NewLeadDialog", () => ({
  NewLeadDialog: ({ pipelineId, stages }: { pipelineId: string; stages: unknown[] }) => (
    <p>{`novo em ${pipelineId} com ${stages.length} etapas`}</p>
  ),
}));

import { useQuadrosDaVisualizacao } from "@/hooks/escale/useQuadrosDaVisualizacao";
import { LoteDaVisualizacao } from "@/components/escale/visualizacoes/LoteDaVisualizacao";
import { QuadroDaVisualizacao } from "@/components/escale/visualizacoes/QuadroDaVisualizacao";

const lead = (id: string, pipeline_id: string, status: string) =>
  ({ id, pipeline_id, status, stage_id: `${pipeline_id}1`, tags: [], owner_user_id: null, owner_agent_id: null }) as never;
const QUADROS = [
  {
    pipeline: { id: "A", name: "Leads", settings: {}, vocabulary: null },
    stages: [{ id: "A1", name: "Entrada" }],
    leads: [lead("a-aberto", "A", "open"), lead("a-ganho", "A", "won")],
  },
  {
    pipeline: { id: "B", name: "Parceiros", settings: {}, vocabulary: null },
    stages: [{ id: "B1", name: "Entrada" }, { id: "B2", name: "Proposta" }],
    leads: [lead("b-aberto", "B", "open")],
  },
] as unknown as BoardData[];
const ORIGENS = [
  { id: "A", name: "Leads" },
  { id: "B", name: "Parceiros" },
  { id: "C", name: "Fechada para mim" },
];

beforeEach(() => {
  busca.atual = "";
  vi.mocked(useQuadrosDaVisualizacao).mockReturnValue({ quadros: QUADROS, carregando: false, indisponiveis: [] });
});

const idsNoQuadro = () =>
  Array.from(screen.getByRole("list", { name: "quadro" }).querySelectorAll("li")).map((li) => li.textContent);

describe("<QuadroDaVisualizacao>", () => {
  it("mostra o nome, quantas origens junta e as origens que não abriram para quem olha", () => {
    vi.mocked(useQuadrosDaVisualizacao).mockReturnValue({ quadros: QUADROS, carregando: false, indisponiveis: ["C"] });
    render(<QuadroDaVisualizacao nome="Time comercial" origens={ORIGENS} />);
    expect(screen.getByRole("heading", { level: 1, name: "Time comercial" })).toBeInTheDocument();
    expect(screen.getByText("Visualização")).toBeInTheDocument();
    expect(screen.getByText("3 origens")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 origem desta visualização não abriu para você.");
    expect(useQuadrosDaVisualizacao).toHaveBeenLastCalledWith(["A", "B", "C"]);
  });

  it("os cards das origens vão juntos para o quadro, e o filtro da URL vale em todas", () => {
    render(<QuadroDaVisualizacao nome="Time" origens={ORIGENS} />);
    expect(idsNoQuadro()).toEqual(["a-aberto", "a-ganho", "b-aberto"]);
    busca.atual = "status=open";
    render(<QuadroDaVisualizacao nome="Time 2" origens={ORIGENS} />);
    expect(Array.from(screen.getAllByRole("list", { name: "quadro" })[1]!.querySelectorAll("li")).map((li) => li.textContent)).toEqual([
      "a-aberto",
      "b-aberto",
    ]);
  });

  it("Novo Lead pergunta em qual origem e abre o formulário com as etapas dela", async () => {
    render(<QuadroDaVisualizacao nome="Time" origens={ORIGENS} />);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole("button", { name: /Novo Lead/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Parceiros" }));
    expect(screen.getByText("novo em B com 2 etapas")).toBeInTheDocument();
  });

  it("sem origem ativa, explica o que fazer; carregando, avisa", () => {
    const { unmount } = render(<QuadroDaVisualizacao nome="Time" origens={[]} />);
    expect(
      screen.getByText("Nenhuma origem desta visualização está ativa. Edite as origens pelo ⋮ da visualização."),
    ).toBeInTheDocument();
    unmount();
    vi.mocked(useQuadrosDaVisualizacao).mockReturnValue({ quadros: [], carregando: true, indisponiveis: [] });
    render(<QuadroDaVisualizacao nome="Time" origens={ORIGENS} />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });
});

describe("<LoteDaVisualizacao>", () => {
  it("cards de uma origem só: a barra de lote do funil, com as etapas dessa origem", () => {
    render(<LoteDaVisualizacao selecionados={["b-aberto"]} quadros={QUADROS} onLimpar={vi.fn()} />);
    expect(screen.getByText("lote B 2 1")).toBeInTheDocument();
  });

  it("cards de várias origens: avisa que o lote é uma origem por vez e oferece limpar", async () => {
    const onLimpar = vi.fn();
    render(<LoteDaVisualizacao selecionados={["a-aberto", "b-aberto"]} quadros={QUADROS} onLimpar={onLimpar} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 negócios de 2 origens selecionados. A ação em lote vale para uma origem por vez.",
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(onLimpar).toHaveBeenCalled();
  });

  it("nada selecionado: nada aparece", () => {
    const { container } = render(<LoteDaVisualizacao selecionados={[]} quadros={QUADROS} onLimpar={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

Create `tests/unit/escale-pagina-da-visualizacao.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: "agent" })),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/escale/visualizacoes/ler-visualizacoes", () => ({ lerVisualizacoes: vi.fn() }));
vi.mock("@/lib/escale/origens/ler-origens", () => ({ lerOrigens: vi.fn() }));
vi.mock("@/components/escale/visualizacoes/QuadroDaVisualizacao", () => ({ QuadroDaVisualizacao: () => null }));

import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { lerVisualizacoes } from "@/lib/escale/visualizacoes/ler-visualizacoes";
import VisualizacaoPage from "@/app/app/pipelines/visualizacoes/[id]/page";

beforeEach(() => {
  vi.mocked(lerVisualizacoes).mockResolvedValue([
    { id: "v-1", name: "Time", acesso: "todos", origens: ["f-b", "f-morto", "f-a"], pessoas: [] },
  ]);
  vi.mocked(lerOrigens).mockResolvedValue({
    grupos: [{ id: "g", name: "G", color: null, icon: "iniciais", is_archived: false }],
    funis: [
      { id: "f-a", name: "A", group_id: "g", is_archived: false, is_default: true },
      { id: "f-b", name: "B", group_id: "g", is_archived: false, is_default: false },
      { id: "f-morto", name: "Morto", group_id: "g", is_archived: true, is_default: false },
    ],
  });
});

const abrir = (id: string) => VisualizacaoPage({ params: Promise.resolve({ id }) });

describe("página /app/pipelines/visualizacoes/[id]", () => {
  it("passa o nome e as origens vivas, na ordem da visualização", async () => {
    const pagina = (await abrir("v-1")) as { props: { nome: string; origens: Array<{ id: string; name: string }> } };
    expect(pagina.props.nome).toBe("Time");
    expect(pagina.props.origens).toEqual([
      { id: "f-b", name: "B" },
      { id: "f-a", name: "A" },
    ]);
    expect(lerVisualizacoes).toHaveBeenCalledWith(expect.anything(), "org-1");
  });

  it("visualização que a pessoa não vê (ou que não existe) é 404", async () => {
    await expect(abrir("v-outra")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-da-visualizacao.test.tsx tests/unit/escale-pagina-da-visualizacao.test.tsx
```
Expected: FAIL — `Failed to resolve import "@/components/escale/visualizacoes/LoteDaVisualizacao"` e `… "@/app/app/pipelines/visualizacoes/[id]/page"`.

- [ ] **Step 3: O lote por origem**

Create `components/escale/visualizacoes/LoteDaVisualizacao.tsx`:

```tsx
"use client";
import { useMemo } from "react";

import { BulkActionBar } from "@/components/kanban/BulkActionBar";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import type { BoardData } from "@/lib/kanban/types";

/**
 * A AÇÃO EM LOTE NO QUADRO COMBINADO (fork Escale, Fase 1C).
 *
 * Com cards de UMA origem, é a barra do funil inteira (mover para etapa,
 * responsável, tag, excluir) com as etapas e o vocabulário dessa origem. Com
 * cards de várias, um aviso: "mover para a etapa X" não tem um destino só, e a
 * barra do funil foi desenhada para um funil por vez.
 */
export function LoteDaVisualizacao({
  selecionados,
  quadros,
  onLimpar,
}: {
  selecionados: string[];
  quadros: BoardData[];
  onLimpar: () => void;
}) {
  const t = useT();
  const origemDe = useMemo(
    () => new Map(quadros.flatMap((q) => q.leads.map((l) => [l.id, q.pipeline.id] as const))),
    [quadros],
  );
  if (selecionados.length === 0) return null;

  const origens = [...new Set(selecionados.flatMap((id) => origemDe.get(id) ?? []))];
  const quadro = origens.length === 1 ? quadros.find((q) => q.pipeline.id === origens[0]) : undefined;
  if (quadro) {
    return (
      <BulkActionBar
        selectedIds={selecionados}
        stages={quadro.stages}
        pipelineId={quadro.pipeline.id}
        vocabulary={quadro.pipeline.vocabulary ?? null}
        tagsExistentes={[...new Set(quadro.leads.flatMap((l) => l.tags))].sort()}
        onClear={onLimpar}
      />
    );
  }

  return (
    <div
      role="status"
      className="sticky bottom-4 z-30 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-md"
    >
      <span className="text-sm">
        {t("{n} negócios de {k} origens selecionados. A ação em lote vale para uma origem por vez.")
          .replace("{n}", String(selecionados.length))
          .replace("{k}", String(origens.length))}
      </span>
      <Button size="sm" variant="outline" onClick={onLimpar}>
        {t("Limpar seleção")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: A página do quadro**

Create `components/escale/visualizacoes/QuadroDaVisualizacao.tsx`:

```tsx
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { FilterBar } from "@/components/kanban/FilterBar";
import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuadrosDaVisualizacao } from "@/hooks/escale/useQuadrosDaVisualizacao";
import { useT } from "@/hooks/i18n/useT";
import { settingsDaVisualizacao } from "@/lib/escale/visualizacoes/regras";
import { applyFilters, filtersFromParams, filtersToParams, type LeadFilters } from "@/lib/kanban/filters";
import { categoriaDoMotivo } from "@/lib/leads/motivos-de-perda-do-funil";
import { Plus } from "@/lib/ui/icons";

import { LoteDaVisualizacao } from "./LoteDaVisualizacao";
import { QuadroCombinado } from "./QuadroCombinado";

/**
 * A PÁGINA DE UMA VISUALIZAÇÃO (fork Escale, Fase 1C): o mesmo esqueleto da
 * página do funil (`app/app/pipelines/[id]/_client.tsx`) — título, "Novo Lead",
 * filtros na URL, quadro e lote — com as origens da visualização no lugar de um
 * funil só.
 *
 * O filtro é o MESMO `FilterBar` do funil e roda POR ORIGEM: a categoria de um
 * motivo de perda é da origem do card (#1537), e um `categoriaDo` único
 * classificaria o card de uma origem pela régua da outra.
 */
export function QuadroDaVisualizacao({ nome, origens }: { nome: string; origens: Array<{ id: string; name: string }> }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const setFilters = useCallback(
    (next: LeadFilters) => {
      const qs = filtersToParams(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const ids = useMemo(() => origens.map((o) => o.id), [origens]);
  const { quadros, carregando, indisponiveis } = useQuadrosDaVisualizacao(ids);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [novoEm, setNovoEm] = useState<string | null>(null);

  const todosOsLeads = useMemo(() => quadros.flatMap((q) => q.leads), [quadros]);
  const filtrados = useMemo(
    () =>
      quadros.flatMap((q) =>
        applyFilters(q.leads, filters, { categoriaDo: (motivo) => categoriaDoMotivo(motivo, q.pipeline.settings) }),
      ),
    [quadros, filters],
  );
  const settings = useMemo(() => settingsDaVisualizacao(quadros), [quadros]);
  const quadroDoNovo = quadros.find((q) => q.pipeline.id === novoEm);

  if (origens.length === 0) {
    return (
      <p className="rounded-md border p-4 text-sm text-muted-foreground">
        {t("Nenhuma origem desta visualização está ativa. Edite as origens pelo ⋮ da visualização.")}
      </p>
    );
  }

  return (
    // A mesma altura da página do funil (ver o comentário longo lá): o quadro
    // cabe na tela e quem rola é ele.
    <div className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("Visualização")}</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{nome}</h1>
          <p className="text-xs text-muted-foreground">
            {(origens.length === 1 ? t("{n} origem") : t("{n} origens")).replace("{n}", String(origens.length))}
          </p>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button disabled={quadros.length === 0} className="shrink-0">
              <Plus size={16} className="mr-2" /> {t("Novo Lead")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("Em qual origem?")}</DropdownMenuLabel>
            {quadros.map((q) => (
              <DropdownMenuItem key={q.pipeline.id} onSelect={() => setNovoEm(q.pipeline.id)}>
                {q.pipeline.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {quadroDoNovo && (
        <NewLeadDialog
          open
          onOpenChange={(aberto: boolean) => !aberto && setNovoEm(null)}
          pipelineId={quadroDoNovo.pipeline.id}
          stages={quadroDoNovo.stages}
          leads={quadroDoNovo.leads}
        />
      )}

      {indisponiveis.length > 0 && (
        <p role="status" className="rounded-md border border-border bg-surface-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {(indisponiveis.length === 1
            ? t("{n} origem desta visualização não abriu para você.")
            : t("{n} origens desta visualização não abriram para você.")
          ).replace("{n}", String(indisponiveis.length))}
        </p>
      )}

      <FilterBar filters={filters} onChange={setFilters} leads={todosOsLeads} settings={settings} />

      {carregando && quadros.length === 0 ? (
        <div className="flex flex-1 animate-pulse items-center justify-center text-muted-foreground">{t("Carregando…")}</div>
      ) : (
        <QuadroCombinado
          quadros={quadros}
          leads={filtrados}
          selecionados={selecionados}
          onSelecao={setSelecionados}
          leadInicial={searchParams.get("lead")}
        />
      )}

      <LoteDaVisualizacao selecionados={selecionados} quadros={quadros} onLimpar={() => setSelecionados([])} />
    </div>
  );
}
```

Create `app/app/pipelines/visualizacoes/[id]/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";

import { QuadroDaVisualizacao } from "@/components/escale/visualizacoes/QuadroDaVisualizacao";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { lerVisualizacoes } from "@/lib/escale/visualizacoes/ler-visualizacoes";
import { origensVivasDaVisualizacao } from "@/lib/escale/visualizacoes/regras";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * O QUADRO DE UMA VISUALIZAÇÃO (fork Escale, Fase 1C). Mora dentro de
 * `app/app/pipelines/` para herdar o layout com o painel Origens.
 *
 * A visualização é lida com a sessão: se a RLS não deixa a pessoa vê-la (acesso
 * "escolhidos" sem ela na lista), ela não vem, e a resposta é 404 — o mesmo de
 * um id que não existe, sem dizer qual dos dois.
 */
export default async function VisualizacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");

  const { id } = await params;
  const supabase = await createClient();
  const [visualizacoes, origens] = await Promise.all([
    lerVisualizacoes(supabase, activeOrg.orgId),
    lerOrigens(supabase, activeOrg.orgId),
  ]);
  const visualizacao = visualizacoes.find((v) => v.id === id);
  if (!visualizacao) notFound();

  return (
    <QuadroDaVisualizacao
      nome={visualizacao.name}
      origens={origensVivasDaVisualizacao(visualizacao, origens).map((f) => ({ id: f.id, name: f.name }))}
    />
  );
}
```

- [ ] **Step 5: Rodar os testes e o typecheck**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-da-visualizacao.test.tsx tests/unit/escale-pagina-da-visualizacao.test.tsx tests/unit/escale-quadro-combinado.test.tsx
corepack pnpm typecheck
```
Expected: os 3 arquivos PASS; typecheck sem erros. Se o typecheck reclamar de `visualizacao` possivelmente `undefined` depois do `notFound()`, confira que `notFound` vem de `next/navigation` (o tipo dele é `never`); não acrescente `!`.

- [ ] **Step 6: Commit**

```bash
git add components/escale/visualizacoes/LoteDaVisualizacao.tsx components/escale/visualizacoes/QuadroDaVisualizacao.tsx "app/app/pipelines/visualizacoes/[id]/page.tsx" tests/unit/escale-quadro-da-visualizacao.test.tsx tests/unit/escale-pagina-da-visualizacao.test.tsx
git commit -m "feat(escale): página da visualização com filtros, novo negócio e lote por origem

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: As janelas da visualização e a seção do painel

**Files:**
- Create: `hooks/escale/useVisualizacoes.ts`, `components/escale/visualizacoes/JanelasDaVisualizacao.tsx`, `components/escale/visualizacoes/SecaoVisualizacoes.tsx`, `tests/unit/escale-janelas-da-visualizacao.test.tsx`
- Modify: `components/escale/origens/LinhasDoPainel.tsx` (exporta `SO_NO_FOCO` e `Tres`)

**Interfaces:**
- Consumes: Task 3 (`Visualizacao`, `AcessoDaVisualizacao`, `NOME_DE_VISUALIZACAO_MAX`, `origensVivasDaVisualizacao`); Task 4 (as rotas `/api/v1/pipeline-views`); `Alerta` (`components/escale/origens/JanelasDoGrupo.tsx`), `textoDoErro` (`components/escale/origens/texto-do-erro.ts`), `BOTAO_DE_ICONE` (`LinhasDoPainel.tsx`), `useTeamMembers({ enabled })` (`hooks/team/useTeamMembers.ts`, devolve `{ data: { data: TeamMember[] } }` com `user_id`, `full_name`, `email`, `accepted_at`, `revoked_at`), `randomId()` (`lib/random-id.ts` — código de tela NUNCA chama `crypto.randomUUID()` cru), `apiClient.get/post/patch/delete`.
- Produces:
  - `useCriarVisualizacao()`, `useAtualizarVisualizacao()` (`{ id, mudanca: { name?, acesso?, origens?, pessoas? } }`), `useExcluirVisualizacao()` — cada mutação resolve `Visualizacao[]`.
  - `type JanelaDaVisualizacao = { tipo: "nova"; origens: string[] } | { tipo: "configurar"; id: string } | { tipo: "excluir"; id: string }`
  - `JanelasDaVisualizacao({ janela, visualizacoes, onFechar, onVisualizacoes, onCriada, onExcluida })`
  - `type AcaoDaVisualizacao = "editar-origens" | "configurar" | "excluir"`
  - `SecaoVisualizacoes({ visualizacoes, origens, ativa, podeGerenciar, onCriar, onAcao })`
  - `LinhasDoPainel.tsx` passa a exportar `SO_NO_FOCO` e `Tres`.

- [ ] **Step 1: Escrever o teste das janelas (vai falhar)**

Create `tests/unit/escale-janelas-da-visualizacao.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import type { Visualizacao } from "@/lib/escale/visualizacoes/regras";
import {
  JanelasDaVisualizacao,
  type JanelaDaVisualizacao,
} from "@/components/escale/visualizacoes/JanelasDaVisualizacao";

const EQUIPE = [
  { user_id: "u-ana", full_name: "Ana", email: "ana@x.com", accepted_at: "2026-01-01", revoked_at: null, role: "agent" },
  { user_id: "u-saiu", full_name: "Saiu", email: null, accepted_at: "2026-01-01", revoked_at: "2026-02-01", role: "agent" },
  { user_id: "u-convite", full_name: "Convidada", email: null, accepted_at: null, revoked_at: null, role: "agent" },
];
const VIS: Visualizacao = { id: "v-1", name: "Time", acesso: "escolhidos", origens: ["f-a"], pessoas: ["u-ana"] };

function abrir(janela: JanelaDaVisualizacao) {
  const props = { onFechar: vi.fn(), onVisualizacoes: vi.fn(), onCriada: vi.fn(), onExcluida: vi.fn() };
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <JanelasDaVisualizacao janela={janela} visualizacoes={[VIS]} {...props} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup({ pointerEventsCheck: 0 }), ...props };
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  vi.mocked(apiClient.get).mockResolvedValue({ data: EQUIPE });
});

describe("<JanelasDaVisualizacao> — nova", () => {
  it("com acesso de toda a organização, cria pela rota com as origens do rascunho e avisa o id", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: [VIS] });
    const { user, onVisualizacoes, onCriada } = abrir({ tipo: "nova", origens: ["f-a", "f-b"] });
    const janela = screen.getByRole("dialog", { name: "Nova visualização" });
    await user.type(within(janela).getByRole("textbox", { name: "Nome da visualização" }), "Análise");
    await user.click(within(janela).getByRole("button", { name: "Criar visualização" }));
    await waitFor(() => expect(onVisualizacoes).toHaveBeenCalledWith([VIS]));
    const corpo = vi.mocked(apiClient.post).mock.calls[0]![1] as { id: string };
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipeline-views", {
      id: corpo.id,
      name: "Análise",
      acesso: "todos",
      origens: ["f-a", "f-b"],
      pessoas: [],
    });
    expect(corpo.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(onCriada).toHaveBeenCalledWith(corpo.id);
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("só as pessoas escolhidas: lista quem está ativo na equipe e exige ao menos uma", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: [VIS] });
    const { user } = abrir({ tipo: "nova", origens: ["f-a"] });
    await user.type(screen.getByRole("textbox", { name: "Nome da visualização" }), "Só Ana");
    await user.click(screen.getByRole("radio", { name: "Só as pessoas escolhidas" }));
    const ana = await screen.findByRole("checkbox", { name: "Ana" });
    expect(screen.queryByRole("checkbox", { name: "Saiu" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "Convidada" })).toBeNull();
    expect(screen.getByRole("button", { name: "Criar visualização" })).toBeDisabled();
    await user.click(ana);
    await user.click(screen.getByRole("button", { name: "Criar visualização" }));
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/v1/pipeline-views",
        expect.objectContaining({ acesso: "escolhidos", pessoas: ["u-ana"] }),
      ),
    );
  });

  it("o erro da rota aparece na janela", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error("Já existe uma visualização com esse nome."));
    const { user, onCriada } = abrir({ tipo: "nova", origens: ["f-a"] });
    await user.type(screen.getByRole("textbox", { name: "Nome da visualização" }), "Time");
    await user.click(screen.getByRole("button", { name: "Criar visualização" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe uma visualização com esse nome.");
    expect(onCriada).not.toHaveBeenCalled();
  });
});

describe("<JanelasDaVisualizacao> — configurar e excluir", () => {
  it("configurar vem preenchido e salva nome, acesso e pessoas", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: [VIS] });
    const { user, onFechar } = abrir({ tipo: "configurar", id: "v-1" });
    const nome = screen.getByRole("textbox", { name: "Nome da visualização" });
    expect(nome).toHaveValue("Time");
    expect(screen.getByRole("radio", { name: "Só as pessoas escolhidas" })).toBeChecked();
    expect(await screen.findByRole("checkbox", { name: "Ana" })).toBeChecked();
    await user.clear(nome);
    await user.type(nome, "Time 2");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-views/v-1", {
      name: "Time 2",
      acesso: "escolhidos",
      pessoas: ["u-ana"],
    });
  });

  it("excluir confirma, chama a rota e avisa quem chamou", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: [] });
    const { user, onExcluida } = abrir({ tipo: "excluir", id: "v-1" });
    expect(screen.getByRole("dialog", { name: "Excluir «Time»?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excluir visualização" }));
    await waitFor(() => expect(onExcluida).toHaveBeenCalledWith("v-1"));
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/pipeline-views/v-1");
  });

  it("visualização que sumiu enquanto a janela abria", () => {
    abrir({ tipo: "configurar", id: "nao-existe" });
    expect(screen.getByText("Visualização não encontrada.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-janelas-da-visualizacao.test.tsx
```
Expected: FAIL — `Failed to resolve import "@/components/escale/visualizacoes/JanelasDaVisualizacao"`.

- [ ] **Step 3: As mutações**

Create `hooks/escale/useVisualizacoes.ts`:

```ts
"use client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api/client";
import type { AcessoDaVisualizacao, Visualizacao } from "@/lib/escale/visualizacoes/regras";

/**
 * A ESCRITA DAS VISUALIZAÇÕES (fork Escale, Fase 1C) — o desenho de
 * `hooks/escale/useOrigens.ts`: toda mutação RESOLVE a lista relida do banco e a
 * tela aplica isso; o `router.refresh()` fica para a PRÓXIMA navegação.
 */
type RespostaDeVisualizacoes = { data: Visualizacao[] };

const VISUALIZACOES = "/api/v1/pipeline-views";
const daVisualizacao = (id: string) => `${VISUALIZACOES}/${encodeURIComponent(id)}`;

export interface NovaVisualizacao {
  id: string;
  name: string;
  acesso: AcessoDaVisualizacao;
  origens: string[];
  pessoas: string[];
}

export interface MudancaDeVisualizacao {
  name?: string;
  acesso?: AcessoDaVisualizacao;
  origens?: string[];
  pessoas?: string[];
}

function useAoTerminar() {
  const router = useRouter();
  return () => router.refresh();
}

export function useCriarVisualizacao() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (nova: NovaVisualizacao) =>
      (await apiClient.post<RespostaDeVisualizacoes>(VISUALIZACOES, nova)).data,
    onSettled,
  });
}

export function useAtualizarVisualizacao() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ id, mudanca }: { id: string; mudanca: MudancaDeVisualizacao }) =>
      (await apiClient.patch<RespostaDeVisualizacoes>(daVisualizacao(id), mudanca)).data,
    onSettled,
  });
}

export function useExcluirVisualizacao() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.delete<RespostaDeVisualizacoes>(daVisualizacao(id))).data,
    onSettled,
  });
}
```

- [ ] **Step 4: As janelas**

Create `components/escale/visualizacoes/JanelasDaVisualizacao.tsx`:

```tsx
"use client";
import { useState, type FormEvent } from "react";

import { Alerta } from "@/components/escale/origens/JanelasDoGrupo";
import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useAtualizarVisualizacao,
  useCriarVisualizacao,
  useExcluirVisualizacao,
} from "@/hooks/escale/useVisualizacoes";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import {
  NOME_DE_VISUALIZACAO_MAX,
  type AcessoDaVisualizacao,
  type Visualizacao,
} from "@/lib/escale/visualizacoes/regras";
import { randomId } from "@/lib/random-id";

export type JanelaDaVisualizacao =
  | { tipo: "nova"; origens: string[] }
  | { tipo: "configurar"; id: string }
  | { tipo: "excluir"; id: string };

interface PropsComuns {
  visualizacoes: Visualizacao[];
  onFechar: () => void;
  onVisualizacoes: (lista: Visualizacao[]) => void;
}

/**
 * As janelas das visualizações (fork Escale, Fase 1C): um Dialog só, como
 * `JanelasDeOrigens`. Só gerente+ chega aqui — o painel esconde o + e o ⋮, e as
 * rotas cobram `requireRole("manager")`.
 */
export function JanelasDaVisualizacao({
  janela,
  onCriada,
  onExcluida,
  ...comuns
}: PropsComuns & {
  janela: JanelaDaVisualizacao | null;
  onCriada: (id: string) => void;
  onExcluida: (id: string) => void;
}) {
  const alvo = janela && janela.tipo !== "nova" ? comuns.visualizacoes.find((v) => v.id === janela.id) : undefined;
  return (
    <Dialog
      open={janela !== null}
      onOpenChange={(aberto) => {
        if (!aberto) comuns.onFechar();
      }}
    >
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
        {janela?.tipo === "nova" && <FormDaVisualizacao {...comuns} origens={janela.origens} onCriada={onCriada} />}
        {janela?.tipo === "configurar" &&
          (alvo ? <FormDaVisualizacao {...comuns} atual={alvo} /> : <VisualizacaoSumiu onFechar={comuns.onFechar} />)}
        {janela?.tipo === "excluir" &&
          (alvo ? (
            <FormExcluirVisualizacao {...comuns} atual={alvo} onExcluida={onExcluida} />
          ) : (
            <VisualizacaoSumiu onFechar={comuns.onFechar} />
          ))}
      </DialogContent>
    </Dialog>
  );
}

function VisualizacaoSumiu({ onFechar }: { onFechar: () => void }) {
  const t = useT();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("Visualização não encontrada.")}</DialogTitle>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" onClick={onFechar}>
          {t("Fechar")}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Nome e QUEM VÊ (princípio do produto: quase tudo tem acesso configurável).
 * Sem `atual` é a janela "Nova visualização", com as origens do rascunho; com
 * `atual` é "Configurações da visualização" (as origens se trocam pelo
 * "Editar origens" do ⋮, no próprio painel).
 */
function FormDaVisualizacao({
  atual,
  origens = [],
  onCriada,
  onFechar,
  onVisualizacoes,
}: PropsComuns & { atual?: Visualizacao; origens?: string[]; onCriada?: (id: string) => void }) {
  const t = useT();
  const criar = useCriarVisualizacao();
  const atualizar = useAtualizarVisualizacao();
  // O id nasce aqui para a tela saber para onde ir assim que a rota responder.
  const [id] = useState(() => atual?.id ?? randomId());
  const [nome, setNome] = useState(atual?.name ?? "");
  const [acesso, setAcesso] = useState<AcessoDaVisualizacao>(atual?.acesso ?? "todos");
  const [pessoas, setPessoas] = useState<ReadonlySet<string>>(() => new Set(atual?.pessoas ?? []));
  const [erro, setErro] = useState<string | null>(null);
  const { data: equipe, isLoading } = useTeamMembers({ enabled: acesso === "escolhidos" });
  // Quem ainda não aceitou o convite ou já saiu não entra na lista: a FK do
  // banco recusaria quem não é membro.
  const membros = (equipe?.data ?? []).filter((m) => m.accepted_at && !m.revoked_at);
  const pendente = criar.isPending || atualizar.isPending;
  const podeSalvar = nome.trim().length > 0 && (acesso === "todos" || pessoas.size > 0) && !pendente;

  function alternarPessoa(userId: string) {
    setPessoas((antes) => {
      const depois = new Set(antes);
      if (depois.has(userId)) depois.delete(userId);
      else depois.add(userId);
      return depois;
    });
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!podeSalvar) return;
    const escolhidas = acesso === "escolhidos" ? [...pessoas] : [];
    const aoErrar = (err: unknown) => setErro(textoDoErro(err, t));
    if (atual) {
      atualizar.mutate(
        { id, mudanca: { name: nome, acesso, pessoas: escolhidas } },
        {
          onSuccess: (lista) => {
            onVisualizacoes(lista);
            onFechar();
          },
          onError: aoErrar,
        },
      );
      return;
    }
    criar.mutate(
      { id, name: nome, acesso, origens, pessoas: escolhidas },
      {
        onSuccess: (lista) => {
          onVisualizacoes(lista);
          onFechar();
          onCriada?.(id);
        },
        onError: aoErrar,
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{atual ? t("Configurações da visualização") : t("Nova visualização")}</DialogTitle>
        <DialogDescription>{t("Etapas com o mesmo nome viram uma coluna só e somam os cards.")}</DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <Input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        aria-label={t("Nome da visualização")}
        placeholder={t("Nome da visualização")}
        maxLength={NOME_DE_VISUALIZACAO_MAX}
      />
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t("Quem vê")}</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="acesso-da-visualizacao"
            checked={acesso === "todos"}
            onChange={() => setAcesso("todos")}
            className="accent-accent"
          />
          {t("Toda a organização")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="acesso-da-visualizacao"
            checked={acesso === "escolhidos"}
            onChange={() => setAcesso("escolhidos")}
            className="accent-accent"
          />
          {t("Só as pessoas escolhidas")}
        </label>
        <p className="text-xs text-muted-foreground">
          {t("Gerentes e administradores sempre veem. Dentro da visualização, cada pessoa vê só os negócios que já vê em cada origem.")}
        </p>
        {acesso === "escolhidos" &&
          (isLoading ? (
            <p className="text-xs text-muted-foreground">{t("Carregando…")}</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
              {membros.map((m) => (
                <li key={m.user_id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={pessoas.has(m.user_id)}
                      onChange={() => alternarPessoa(m.user_id)}
                      className="size-4 accent-accent"
                    />
                    {m.full_name ?? m.email ?? t("Sem nome")}
                  </label>
                </li>
              ))}
            </ul>
          ))}
      </fieldset>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={!podeSalvar}>
          {atual ? t("Salvar") : t("Criar visualização")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function FormExcluirVisualizacao({
  atual,
  onFechar,
  onVisualizacoes,
  onExcluida,
}: PropsComuns & { atual: Visualizacao; onExcluida: (id: string) => void }) {
  const t = useT();
  const excluir = useExcluirVisualizacao();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("Excluir «{nome}»?").replace("{nome}", atual.name)}</DialogTitle>
        <DialogDescription>{t("A visualização sai do painel. Nenhuma origem e nenhum negócio é apagado.")}</DialogDescription>
      </DialogHeader>
      <Alerta texto={erro} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={excluir.isPending}
          onClick={() =>
            excluir.mutate(atual.id, {
              onSuccess: (lista) => {
                onVisualizacoes(lista);
                onFechar();
                onExcluida(atual.id);
              },
              onError: (err) => setErro(textoDoErro(err, t)),
            })
          }
        >
          {t("Excluir visualização")}
        </Button>
      </DialogFooter>
    </>
  );
}
```

- [ ] **Step 5: Exportar o que a seção reaproveita das linhas do painel**

Em `components/escale/origens/LinhasDoPainel.tsx`, troque:

```tsx
const SO_NO_FOCO = "flex items-center opacity-0 transition-opacity focus-within:opacity-100";

function Tres({ rotulo }: { rotulo: string }) {
```

por:

```tsx
export const SO_NO_FOCO = "flex items-center opacity-0 transition-opacity focus-within:opacity-100";

export function Tres({ rotulo }: { rotulo: string }) {
```

- [ ] **Step 6: A seção Visualizações**

Create `components/escale/visualizacoes/SecaoVisualizacoes.tsx`:

```tsx
"use client";
import Link from "next/link";

import { BOTAO_DE_ICONE, SO_NO_FOCO, Tres } from "@/components/escale/origens/LinhasDoPainel";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { Origens } from "@/lib/escale/origens/regras";
import { origensVivasDaVisualizacao, type Visualizacao } from "@/lib/escale/visualizacoes/regras";
import { Plus } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

export type AcaoDaVisualizacao = "editar-origens" | "configurar" | "excluir";

function MenuDaVisualizacao({ nome, onAcao }: { nome: string; onAcao: (a: AcaoDaVisualizacao) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <DropdownMenuContent align="start" side="right">
        <DropdownMenuItem onSelect={() => onAcao("editar-origens")}>{t("Editar origens")}</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAcao("configurar")}>{t("Configurações")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAcao("excluir")} className="text-destructive">
          {t("Excluir")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A SEÇÃO VISUALIZAÇÕES do painel Origens (fork Escale, Fase 1C), como na
 * Clint: cada visualização com quantas origens vivas junta. O `+` entra no modo
 * seleção (as caixinhas nas origens) e o ⋮ edita as origens, o nome e o acesso,
 * ou exclui. Quem não é gerente vê só as que o acesso deixa (RLS), sem `+` e
 * sem ⋮.
 */
export function SecaoVisualizacoes({
  visualizacoes,
  origens,
  ativa,
  podeGerenciar,
  onCriar,
  onAcao,
}: {
  visualizacoes: Visualizacao[];
  origens: Origens;
  ativa: string | null;
  podeGerenciar: boolean;
  onCriar: () => void;
  onAcao: (id: string, acao: AcaoDaVisualizacao) => void;
}) {
  const t = useT();
  return (
    <section aria-label={t("Visualizações")} className="mt-3 border-t pt-2">
      <div className="flex items-center gap-1 px-2">
        <h3 className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("Visualizações")}
        </h3>
        {podeGerenciar && (
          <button type="button" aria-label={t("Criar visualização")} onClick={onCriar} className={BOTAO_DE_ICONE}>
            <Plus size={14} aria-hidden />
          </button>
        )}
      </div>
      {visualizacoes.length === 0 ? (
        <p className="px-2 py-1 text-xs text-muted-foreground">{t("Nenhuma visualização ainda.")}</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {visualizacoes.map((v) => {
            const quantas = origensVivasDaVisualizacao(v, origens).length;
            const atual = v.id === ativa;
            return (
              <li
                key={v.id}
                className={cn("group/vis flex items-center rounded-md pr-1", atual ? "bg-accent-soft" : "hover:bg-accent-soft")}
              >
                <Link
                  href={`/app/pipelines/visualizacoes/${v.id}`}
                  aria-current={atual ? "page" : undefined}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 px-2 py-1 text-sm",
                    atual ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="truncate">{v.name}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                    {(quantas === 1 ? t("{n} origem") : t("{n} origens")).replace("{n}", String(quantas))}
                  </span>
                </Link>
                {podeGerenciar && (
                  <span className={cn(SO_NO_FOCO, "group-hover/vis:opacity-100")}>
                    <MenuDaVisualizacao nome={v.name} onAcao={(a) => onAcao(v.id, a)} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Rodar os testes e o typecheck**

```bash
corepack pnpm vitest run tests/unit/escale-janelas-da-visualizacao.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/escale-janelas-de-origens.test.tsx lib/random-id.test.ts
corepack pnpm typecheck
```
Expected: os 4 arquivos PASS (o painel ainda não usa a seção; ele só não pode ter quebrado com os `export`); typecheck sem erros.

- [ ] **Step 8: Commit**

```bash
git add hooks/escale/useVisualizacoes.ts components/escale/visualizacoes/JanelasDaVisualizacao.tsx components/escale/visualizacoes/SecaoVisualizacoes.tsx components/escale/origens/LinhasDoPainel.tsx tests/unit/escale-janelas-da-visualizacao.test.tsx
git commit -m "feat(escale): janelas da visualização (nome e quem vê) e seção Visualizações

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: O modo seleção no painel e o ⋮ "Selecionar" ligado

**Files:**
- Create: `components/escale/visualizacoes/RodapeDaSelecao.tsx`
- Modify: `components/escale/origens/LinhasDoPainel.tsx`, `components/escale/origens/PainelOrigens.tsx` (reescrito), `components/escale/origens/ComOrigens.tsx` (`visualizacoes={[]}` provisório), `lib/escale/visualizacoes/regras.ts` (+ `filtrarVisualizacoes`), `tests/unit/escale-visualizacoes-regras.test.ts` (1 caso), `tests/unit/escale-painel-origens.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`estadoDoGrupo`, `alternarNaSelecao`, `ordenarNaArvore`, `origensVivasDaVisualizacao`, `visualizacaoDoCaminho`, `VISUALIZACAO_MAX_ORIGENS`), Task 7 (`SecaoVisualizacoes`, `AcaoDaVisualizacao`, `JanelasDaVisualizacao`, `JanelaDaVisualizacao`, `useAtualizarVisualizacao`).
- Produces:
  - `AcaoDoGrupo` e `AcaoDaOrigem` ganham `"selecionar"`; `interface SelecaoNoPainel { marcadas: ReadonlySet<string>; onAlternar: (ids: string[], marcar: boolean) => void }` exportada de `LinhasDoPainel.tsx`; `LinhaDoGrupo` e `LinhaDaOrigem` aceitam `selecao?: SelecaoNoPainel`.
  - `filtrarVisualizacoes<V extends Pick<Visualizacao, "name">>(lista: readonly V[], busca: string): V[]`
  - `RodapeDaSelecao({ quantas: number; editando: boolean; salvando: boolean; erro: string | null; onCancelar: () => void; onSalvar: () => void })`
  - `PainelOrigens` ganha a prop obrigatória `visualizacoes: Visualizacao[]` (a Task 9 passa do servidor).

- [ ] **Step 1: Escrever os testes (vão falhar)**

Em `tests/unit/escale-visualizacoes-regras.test.ts`, acrescente `filtrarVisualizacoes,` ao import de `@/lib/escale/visualizacoes/regras` e, no fim do arquivo:

```ts
describe("filtrarVisualizacoes", () => {
  it("a lupa procura no nome sem acento nem caixa; sem termo, devolve todas", () => {
    const lista = [vis("v1", "Análise"), vis("v2", "Time comercial")];
    expect(filtrarVisualizacoes(lista, "ANALI").map((v) => v.id)).toEqual(["v1"]);
    expect(filtrarVisualizacoes(lista, "  ").map((v) => v.id)).toEqual(["v1", "v2"]);
  });
});
```

Em `tests/unit/escale-painel-origens.test.tsx`:

1. Troque o import de tipos

```tsx
import type { Origens } from "@/lib/escale/origens/regras";
```

por

```tsx
import type { Origens } from "@/lib/escale/origens/regras";
import type { Visualizacao } from "@/lib/escale/visualizacoes/regras";
```

2. Logo depois de `const ABERTO: PreferenciasDoPainel = …;`, acrescente:

```tsx
const VISUALIZACOES: Visualizacao[] = [
  { id: "v-time", name: "Time comercial", acesso: "todos", origens: ["f-nayara", "f-morto", "f-leads"], pessoas: [] },
];
```

3. Troque a função `renderizar` inteira por:

```tsx
function renderizar(
  podeGerenciar = true,
  preferencias: PreferenciasDoPainel = ABERTO,
  visualizacoes: Visualizacao[] = VISUALIZACOES,
) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <PainelOrigens
        origens={ORIGENS}
        visualizacoes={visualizacoes}
        podeGerenciar={podeGerenciar}
        preferencias={preferencias}
      />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}
```

4. Troque o caso `it("⋮ do grupo tem os itens da Clint, com Selecionar origens desligado", …)` inteiro por:

```tsx
  it("⋮ do grupo tem os itens da Clint, todos ligados", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de INSS de obras" }));
    const itens = (await screen.findAllByRole("menuitem")).map((i) => i.textContent);
    expect(itens).toEqual([
      "Configurações",
      "Selecionar origens",
      "Customizar",
      "Ocultar da minha barra lateral",
      "Arquivar",
      "Excluir",
    ]);
    expect(screen.getByRole("menuitem", { name: "Selecionar origens" })).not.toHaveAttribute("aria-disabled");
  });
```

5. No caso `it("⋮ da origem abre Configurações da origem", …)`, troque

```tsx
    expect(itens).toEqual(["Configurações", "Selecionar origemEm breve", "Arquivar", "Excluir"]);
```

por

```tsx
    expect(itens).toEqual(["Configurações", "Selecionar origem", "Arquivar", "Excluir"]);
```

6. No fim do arquivo, acrescente:

```tsx
describe("<PainelOrigens> — visualizações e seleção (Fase 1C)", () => {
  const secao = () => screen.getByRole("region", { name: "Visualizações" });

  it("a seção lista as visualizações com quantas origens vivas cada uma junta", () => {
    renderizar();
    expect(within(secao()).getByRole("link", { name: /Time comercial/ })).toHaveAttribute(
      "href",
      "/app/pipelines/visualizacoes/v-time",
    );
    expect(within(secao()).getByText("2 origens")).toBeInTheDocument();
  });

  it("quem não é gerente vê as visualizações, sem + e sem ⋮", () => {
    renderizar(false);
    expect(within(secao()).getByRole("link", { name: /Time comercial/ })).toBeInTheDocument();
    expect(within(secao()).queryByRole("button")).toBeNull();
  });

  it("a lupa também procura nas visualizações", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Buscar grupo ou funil" }));
    await user.type(screen.getByRole("textbox", { name: "Buscar grupo ou funil" }), "nayara");
    expect(within(secao()).queryByRole("link", { name: /Time comercial/ })).toBeNull();
    expect(within(secao()).getByText("Nenhuma visualização ainda.")).toBeInTheDocument();
  });

  it("Selecionar origens do ⋮ do grupo marca as origens dele e mostra o rascunho", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de Credenciados" }));
    await user.click(await screen.findByRole("menuitem", { name: "Selecionar origens" }));
    expect(screen.getByRole("checkbox", { name: "Funil Nayara" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Turma 12" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Selecionar Credenciados" })).toBeChecked();
    expect(screen.getByText("2 origens selecionadas · Rascunho")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Visualizações" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nova origem em Credenciados" })).toBeNull();
  });

  it("Selecionar origem do ⋮ da origem marca só ela", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de Leads INSS WhatsApp" }));
    await user.click(await screen.findByRole("menuitem", { name: "Selecionar origem" }));
    expect(screen.getByRole("checkbox", { name: "Leads INSS WhatsApp" })).toBeChecked();
    expect(screen.getByText("1 origem selecionada · Rascunho")).toBeInTheDocument();
  });

  it("Criar visualização: marca pelo grupo e pela origem, salva e abre o quadro novo", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: VISUALIZACOES });
    const user = renderizar();
    await user.click(within(secao()).getByRole("button", { name: "Criar visualização" }));
    expect(screen.getByText("0 origens selecionadas · Rascunho")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar como visualização" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Selecionar Credenciados" }));
    await user.click(screen.getByRole("checkbox", { name: "Leads INSS WhatsApp" }));
    await user.click(screen.getByRole("button", { name: "Salvar como visualização" }));
    const janela = await screen.findByRole("dialog", { name: "Nova visualização" });
    await user.type(within(janela).getByRole("textbox", { name: "Nome da visualização" }), "Todos INSS");
    await user.click(within(janela).getByRole("button", { name: "Criar visualização" }));
    await vi.waitFor(() =>
      expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/app\/pipelines\/visualizacoes\/[0-9a-f-]{36}$/)),
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/v1/pipeline-views",
      expect.objectContaining({ name: "Todos INSS", acesso: "todos", origens: ["f-nayara", "f-turma", "f-leads"], pessoas: [] }),
    );
    expect(screen.queryByText(/Rascunho/)).toBeNull();
  });

  it("Editar origens: a seleção vem com as origens vivas da visualização e grava só as origens", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: VISUALIZACOES });
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de Time comercial" }));
    await user.click(await screen.findByRole("menuitem", { name: "Editar origens" }));
    expect(screen.getByText("2 origens selecionadas · Rascunho")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Funil Nayara" }));
    await user.click(screen.getByRole("button", { name: "Salvar origens" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/app/pipelines/visualizacoes/v-time"));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-views/v-time", { origens: ["f-leads"] });
  });

  it("Cancelar sai do modo seleção sem gravar", async () => {
    const user = renderizar();
    await user.click(within(secao()).getByRole("button", { name: "Criar visualização" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByText(/Rascunho/)).toBeNull();
    expect(secao()).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-painel-origens.test.tsx tests/unit/escale-visualizacoes-regras.test.ts
```
Expected: FAIL — `filtrarVisualizacoes is not a function`, os itens do ⋮ ainda com "Em breve", e a seção "Visualizações" ausente.

- [ ] **Step 3: A lupa nas visualizações**

Em `lib/escale/visualizacoes/regras.ts`, logo DEPOIS da função `visualizacaoDoCaminho`, acrescente:

```ts
/** A lupa do painel também procura nas visualizações (sem acento, sem caixa). */
export function filtrarVisualizacoes<V extends Pick<Visualizacao, "name">>(lista: readonly V[], busca: string): V[] {
  const termo = chave(busca);
  return termo ? lista.filter((v) => chave(v.name).includes(termo)) : [...lista];
}
```

- [ ] **Step 4: As linhas do painel com caixinha e o ⋮ ligado**

Em `components/escale/origens/LinhasDoPainel.tsx`:

(a) Logo depois de `import type { FunilDaOrigem, GrupoNaArvore, Origens } from "@/lib/escale/origens/regras";`, acrescente:

```tsx
import { estadoDoGrupo } from "@/lib/escale/visualizacoes/regras";
```

(b) Troque:

```tsx
export type AcaoDoGrupo = "configurar" | "customizar" | "ocultar" | "arquivar" | "excluir";
export type AcaoDaOrigem = "configurar" | "arquivar" | "excluir";
```

por:

```tsx
export type AcaoDoGrupo = "configurar" | "selecionar" | "customizar" | "ocultar" | "arquivar" | "excluir";
export type AcaoDaOrigem = "configurar" | "selecionar" | "arquivar" | "excluir";

/** O modo seleção do painel (Fase 1C): o que está marcado e como marcar/desmarcar várias de uma vez. */
export interface SelecaoNoPainel {
  marcadas: ReadonlySet<string>;
  onAlternar: (ids: string[], marcar: boolean) => void;
}
```

(c) Apague a função `EmBreve` inteira (do `function EmBreve(` até o `}` que a fecha).

(d) Em `MenuDoGrupo`, troque `<EmBreve>{t("Selecionar origens")}</EmBreve>` por:

```tsx
        <DropdownMenuItem onSelect={() => onAcao("selecionar")}>{t("Selecionar origens")}</DropdownMenuItem>
```

(e) Em `MenuDaOrigem`, troque `<EmBreve>{t("Selecionar origem")}</EmBreve>` por:

```tsx
        <DropdownMenuItem onSelect={() => onAcao("selecionar")}>{t("Selecionar origem")}</DropdownMenuItem>
```

(f) Troque a função `LinhaDaOrigem` inteira por:

```tsx
export function LinhaDaOrigem({
  funil,
  ativo,
  podeGerenciar,
  recuo,
  selecao,
  onAcao,
}: {
  funil: FunilDaOrigem;
  ativo: string | null;
  podeGerenciar: boolean;
  recuo: boolean;
  /** Presente no modo seleção: a linha vira caixinha (clicar marca, não abre o quadro). */
  selecao?: SelecaoNoPainel;
  onAcao: (a: AcaoDaOrigem) => void;
}) {
  if (selecao) {
    const marcada = selecao.marcadas.has(funil.id);
    return (
      <li className={cn("flex items-center rounded-md hover:bg-accent-soft", recuo && "ml-8")}>
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1 text-sm">
          <input
            type="checkbox"
            checked={marcada}
            onChange={() => selecao.onAlternar([funil.id], !marcada)}
            className="size-4 shrink-0 cursor-pointer accent-accent"
          />
          <span className="truncate">{funil.name}</span>
        </label>
      </li>
    );
  }
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
```

(g) Troque a função `LinhaDoGrupo` inteira por:

```tsx
export function LinhaDoGrupo({
  grupo,
  aberto,
  oculto,
  ativo,
  podeGerenciar,
  criandoAqui,
  selecao,
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
  /** Presente no modo seleção: caixinha no grupo (marca todas) e nas origens; sem + e sem ⋮. */
  selecao?: SelecaoNoPainel;
  onAlternar: () => void;
  onNovaOrigem: () => void;
  onAcao: (a: AcaoDoGrupo) => void;
  onAcaoDaOrigem: (funilId: string, a: AcaoDaOrigem) => void;
  onCriada: (origens: Origens, id: string) => void;
  onCancelarCriacao: () => void;
}) {
  const t = useT();
  const estado = selecao ? estadoDoGrupo(grupo, selecao.marcadas) : "vazia";
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
        {selecao && (
          <input
            type="checkbox"
            aria-label={`${t("Selecionar")} ${grupo.name}`}
            checked={estado === "marcada"}
            ref={(el) => {
              if (el) el.indeterminate = estado === "parcial";
            }}
            disabled={grupo.funis.length === 0}
            onChange={() => selecao.onAlternar(grupo.funis.map((f) => f.id), estado !== "marcada")}
            className="size-4 shrink-0 cursor-pointer accent-accent"
          />
        )}
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
        {podeGerenciar && !selecao && (
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
          {criandoAqui && !selecao && (
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
                selecao={selecao}
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

- [ ] **Step 5: O rodapé do rascunho**

Create `components/escale/visualizacoes/RodapeDaSelecao.tsx`:

```tsx
"use client";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import { VISUALIZACAO_MAX_ORIGENS } from "@/lib/escale/visualizacoes/regras";

/**
 * O RODAPÉ DO MODO SELEÇÃO (fork Escale, Fase 1C), como o da Clint: "N origens
 * selecionadas · Rascunho", Cancelar e Salvar. Salvar fica desligado fora da
 * faixa de 1 a 20 origens — a mesma da rota e da função do banco.
 */
export function RodapeDaSelecao({
  quantas,
  editando,
  salvando,
  erro,
  onCancelar,
  onSalvar,
}: {
  quantas: number;
  editando: boolean;
  salvando: boolean;
  erro: string | null;
  onCancelar: () => void;
  onSalvar: () => void;
}) {
  const t = useT();
  const foraDaFaixa = quantas === 0 || quantas > VISUALIZACAO_MAX_ORIGENS;
  return (
    <div className="border-t px-3 py-2">
      <p className="text-xs font-medium text-accent" aria-live="polite">
        {(quantas === 1 ? t("{n} origem selecionada · Rascunho") : t("{n} origens selecionadas · Rascunho")).replace(
          "{n}",
          String(quantas),
        )}
      </p>
      {quantas > VISUALIZACAO_MAX_ORIGENS && (
        <p className="mt-1 text-xs text-destructive">{t("Uma visualização junta de 1 a 20 origens.")}</p>
      )}
      {erro && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {erro}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>
          {t("Cancelar")}
        </Button>
        <Button type="button" size="sm" disabled={foraDaFaixa || salvando} onClick={onSalvar}>
          {editando ? t("Salvar origens") : t("Salvar como visualização")}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: O painel com a seção e o modo seleção**

Troque o conteúdo inteiro de `components/escale/origens/PainelOrigens.tsx` por:

```tsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { guardarPreferenciaDeOrigens } from "@/app/actions/escale/origens";
import {
  JanelasDaVisualizacao,
  type JanelaDaVisualizacao,
} from "@/components/escale/visualizacoes/JanelasDaVisualizacao";
import { RodapeDaSelecao } from "@/components/escale/visualizacoes/RodapeDaSelecao";
import { SecaoVisualizacoes, type AcaoDaVisualizacao } from "@/components/escale/visualizacoes/SecaoVisualizacoes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAtualizarVisualizacao } from "@/hooks/escale/useVisualizacoes";
import { useT } from "@/hooks/i18n/useT";
import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { filtrarArvore, funilDoCaminho, montarOrigens, type Origens } from "@/lib/escale/origens/regras";
import {
  alternarNaSelecao,
  filtrarVisualizacoes,
  ordenarNaArvore,
  origensVivasDaVisualizacao,
  visualizacaoDoCaminho,
  type Visualizacao,
} from "@/lib/escale/visualizacoes/regras";
import { CaretDown, CaretLeft, CaretRight, CaretUp, MagnifyingGlass, Plus } from "@/lib/ui/icons";

import { ArquivadosDoPainel } from "./ArquivadosDoPainel";
import { JanelasDeOrigens, type Janela } from "./JanelasDeOrigens";
import {
  BOTAO_DE_ICONE,
  LinhaDaOrigem,
  LinhaDoGrupo,
  type AcaoDaOrigem,
  type AcaoDoGrupo,
  type SelecaoNoPainel,
} from "./LinhasDoPainel";
import { textoDoErro } from "./texto-do-erro";

const JANELA_DO_GRUPO: Record<
  Exclude<AcaoDoGrupo, "ocultar" | "selecionar">,
  "config-grupo" | "customizar" | "arquivar-grupo" | "excluir-grupo"
> = {
  configurar: "config-grupo",
  customizar: "customizar",
  arquivar: "arquivar-grupo",
  excluir: "excluir-grupo",
};
const JANELA_DA_ORIGEM: Record<Exclude<AcaoDaOrigem, "selecionar">, "config-origem" | "arquivar-origem" | "excluir-origem"> = {
  configurar: "config-origem",
  arquivar: "arquivar-origem",
  excluir: "excluir-origem",
};

/**
 * O modo seleção (Fase 1C): caixinhas nas origens e o rodapé "Rascunho".
 * `editando` é a visualização cujas origens estão sendo trocadas; `null` é uma
 * visualização nova.
 */
interface Selecao {
  editando: string | null;
  marcadas: ReadonlySet<string>;
}

/**
 * O PAINEL ORIGENS (fork Escale, Fases 1A, 1B e 1C): a coluna da esquerda de
 * Negócios na casca nova, como na Clint. `<` recolhe o painel, `^` recolhe a
 * lista, a seta abre o grupo, o `+` de cima adiciona origem ou grupo, o `+` do
 * grupo cria uma origem dentro dele, e os ⋮ levam às janelas
 * (`JanelasDeOrigens`). Abaixo das origens, a seção Visualizações; o `+` dela e
 * o "Selecionar" dos ⋮ entram no modo seleção. Só md+: no celular o quadro
 * segue como sempre.
 *
 * Origens e visualizações vêm do servidor (`ComOrigens`) e são trocadas pelo que
 * cada mutação devolve; quando o servidor manda novidade, o ajuste acontece
 * durante o render (padrão de `app/app/kanban/_client.tsx`). As preferências
 * (painel, lista, ocultos) também vêm do servidor, de cookie, e cada mudança é
 * gravada pela Server Action — nenhum `useState` lê o navegador.
 */
export function PainelOrigens({
  origens: doServidor,
  visualizacoes: visualizacoesDoServidor,
  podeGerenciar,
  preferencias,
}: {
  origens: Origens;
  visualizacoes: Visualizacao[];
  podeGerenciar: boolean;
  preferencias: PreferenciasDoPainel;
}) {
  const t = useT();
  const router = useRouter();
  const caminho = usePathname() ?? "";
  const ativo = funilDoCaminho(caminho);
  const visualizacaoAtiva = visualizacaoDoCaminho(caminho);

  const [origens, setOrigens] = useState<Origens>(doServidor);
  const [ultimoDoServidor, setUltimoDoServidor] = useState<Origens>(doServidor);
  if (doServidor !== ultimoDoServidor) {
    setUltimoDoServidor(doServidor);
    setOrigens(doServidor);
  }
  const [visualizacoes, setVisualizacoes] = useState<Visualizacao[]>(visualizacoesDoServidor);
  const [ultimasDoServidor, setUltimasDoServidor] = useState<Visualizacao[]>(visualizacoesDoServidor);
  if (visualizacoesDoServidor !== ultimasDoServidor) {
    setUltimasDoServidor(visualizacoesDoServidor);
    setVisualizacoes(visualizacoesDoServidor);
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
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [erroDaSelecao, setErroDaSelecao] = useState<string | null>(null);
  const [janelaDaVisualizacao, setJanelaDaVisualizacao] = useState<JanelaDaVisualizacao | null>(null);
  const atualizarVisualizacao = useAtualizarVisualizacao();

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
  const visualizacoesVisiveis = filtrarVisualizacoes(visualizacoes, busca);

  const noModoSelecao: SelecaoNoPainel | undefined = selecao
    ? {
        marcadas: selecao.marcadas,
        onAlternar: (ids, marcar) =>
          setSelecao((atual) => atual && { ...atual, marcadas: alternarNaSelecao(atual.marcadas, ids, marcar) }),
      }
    : undefined;

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

  /** Entra no modo seleção já com `ids` marcadas, abrindo os grupos delas. */
  function selecionar(ids: string[], editando: string | null) {
    setErroDaSelecao(null);
    setSelecao({ editando, marcadas: new Set(ids) });
    // Sem a lista aberta o modo seleção seria invisível; não grava a preferência.
    setListaAberta(true);
    const grupos = origens.funis.filter((f) => ids.includes(f.id)).flatMap((f) => (f.group_id ? [f.group_id] : []));
    setAbertos((atual) => new Set([...atual, ...grupos]));
  }

  function acaoDoGrupo(id: string, acao: AcaoDoGrupo) {
    if (acao === "ocultar") {
      const proximo = ocultos.includes(id) ? ocultos.filter((o) => o !== id) : [...ocultos, id];
      setOcultos(proximo);
      void guardarPreferenciaDeOrigens({ nome: "ocultos", valor: proximo });
      return;
    }
    if (acao === "selecionar") {
      selecionar(arvore.grupos.find((g) => g.id === id)?.funis.map((f) => f.id) ?? [], null);
      setAbertos((atual) => new Set([...atual, id]));
      return;
    }
    setJanela({ tipo: JANELA_DO_GRUPO[acao], id });
  }

  function acaoDaOrigem(id: string, acao: AcaoDaOrigem) {
    if (acao === "selecionar") {
      selecionar([id], null);
      return;
    }
    setJanela({ tipo: JANELA_DA_ORIGEM[acao], id });
  }

  function acaoDaVisualizacao(id: string, acao: AcaoDaVisualizacao) {
    if (acao === "editar-origens") {
      const alvo = visualizacoes.find((v) => v.id === id);
      if (alvo) selecionar(origensVivasDaVisualizacao(alvo, origens).map((f) => f.id), id);
      return;
    }
    setJanelaDaVisualizacao({ tipo: acao, id });
  }

  function abrirOrigem(id: string) {
    router.push(`/app/pipelines/${id}`);
  }

  function abrirVisualizacao(id: string) {
    router.push(`/app/pipelines/visualizacoes/${id}`);
  }

  function salvarSelecao() {
    if (!selecao) return;
    // A ordem das colunas é a ordem do painel, não a ordem dos cliques.
    const ids = ordenarNaArvore(selecao.marcadas, arvore);
    if (selecao.editando === null) {
      setJanelaDaVisualizacao({ tipo: "nova", origens: ids });
      return;
    }
    const id = selecao.editando;
    atualizarVisualizacao.mutate(
      { id, mudanca: { origens: ids } },
      {
        onSuccess: (lista) => {
          setVisualizacoes(lista);
          setSelecao(null);
          abrirVisualizacao(id);
        },
        onError: (err) => setErroDaSelecao(textoDoErro(err, t)),
      },
    );
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
        {podeGerenciar && !selecao && (
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
                  selecao={noModoSelecao}
                  onAlternar={() => alternarGrupo(g.id)}
                  onNovaOrigem={() => setNovoEm(g.id)}
                  onAcao={(a) => acaoDoGrupo(g.id, a)}
                  onAcaoDaOrigem={acaoDaOrigem}
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
                      selecao={noModoSelecao}
                      onAcao={(a) => acaoDaOrigem(f.id, a)}
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

          {!selecao && (
            <SecaoVisualizacoes
              visualizacoes={visualizacoesVisiveis}
              origens={origens}
              ativa={visualizacaoAtiva}
              podeGerenciar={podeGerenciar}
              onCriar={() => selecionar([], null)}
              onAcao={acaoDaVisualizacao}
            />
          )}

          {podeGerenciar && !selecao && <ArquivadosDoPainel arvore={arvore} onOrigens={setOrigens} />}
        </div>
      )}

      {selecao && (
        <RodapeDaSelecao
          quantas={selecao.marcadas.size}
          editando={selecao.editando !== null}
          salvando={atualizarVisualizacao.isPending}
          erro={erroDaSelecao}
          onCancelar={() => setSelecao(null)}
          onSalvar={salvarSelecao}
        />
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
      {podeGerenciar && (
        <JanelasDaVisualizacao
          janela={janelaDaVisualizacao}
          visualizacoes={visualizacoes}
          onFechar={() => setJanelaDaVisualizacao(null)}
          onVisualizacoes={setVisualizacoes}
          onCriada={(id) => {
            setSelecao(null);
            abrirVisualizacao(id);
          }}
          onExcluida={(id) => {
            if (visualizacaoAtiva === id) router.push("/app/escale/negocios");
          }}
        />
      )}
    </aside>
  );
}
```

Em `components/escale/origens/ComOrigens.tsx`, para a branch continuar compilando até a Task 9 ligar a leitura, troque:

```tsx
      <PainelOrigens
        origens={origens}
        podeGerenciar={ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager}
```

por:

```tsx
      <PainelOrigens
        origens={origens}
        visualizacoes={[]}
        podeGerenciar={ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager}
```

- [ ] **Step 7: Rodar os testes e o typecheck**

```bash
corepack pnpm vitest run tests/unit/escale-painel-origens.test.tsx tests/unit/escale-visualizacoes-regras.test.ts tests/unit/escale-janelas-de-origens.test.tsx tests/unit/escale-janelas-da-visualizacao.test.tsx tests/unit/escale-com-origens.test.tsx
corepack pnpm typecheck
```
Expected: os 5 arquivos PASS; typecheck sem erros.

- [ ] **Step 8: Commit**

```bash
git add components/escale/visualizacoes/RodapeDaSelecao.tsx components/escale/origens/LinhasDoPainel.tsx components/escale/origens/PainelOrigens.tsx components/escale/origens/ComOrigens.tsx lib/escale/visualizacoes/regras.ts tests/unit/escale-visualizacoes-regras.test.ts tests/unit/escale-painel-origens.test.tsx
git commit -m "feat(escale): modo seleção no painel Origens (Selecionar origens/origem, criar e editar visualização)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: O encaixe lê as visualizações, gates e PR

**Files:**
- Modify: `components/escale/origens/ComOrigens.tsx`, `tests/unit/escale-com-origens.test.tsx`

**Interfaces:**
- Consumes: `lerVisualizacoes` (Task 4), `PainelOrigens` com `visualizacoes` (Task 8).
- Produces: o painel recebe as visualizações do servidor; banco sem a 9003 (ou fora do ar) abre o painel com a seção vazia — Negócios nunca fica fora do ar por causa dela.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Em `tests/unit/escale-com-origens.test.tsx`:

1. Logo depois de `vi.mock("@/lib/escale/origens/ler-origens", () => ({ lerOrigens: vi.fn() }));`, acrescente:

```tsx
vi.mock("@/lib/escale/visualizacoes/ler-visualizacoes", () => ({ lerVisualizacoes: vi.fn() }));
```

2. Logo depois de `import { lerOrigens } from "@/lib/escale/origens/ler-origens";`, acrescente:

```tsx
import { lerVisualizacoes } from "@/lib/escale/visualizacoes/ler-visualizacoes";
```

3. No fim do `beforeEach`, antes do `});` que o fecha, acrescente:

```tsx
  vi.mocked(lerVisualizacoes).mockReset();
  vi.mocked(lerVisualizacoes).mockResolvedValue([
    { id: "v-1", name: "Time comercial", acesso: "todos", origens: ["f-leads"], pessoas: [] },
  ]);
```

4. Dentro do `describe("<ComOrigens>", …)`, depois do último caso, acrescente:

```tsx
  it("as visualizações chegam na seção do painel, lidas da organização ativa", async () => {
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("link", { name: /Time comercial/ })).toHaveAttribute(
      "href",
      "/app/pipelines/visualizacoes/v-1",
    );
    expect(lerVisualizacoes).toHaveBeenCalledWith(expect.anything(), "org-1");
  });

  it("banco sem a migration 9003 (ou fora do ar): o painel abre com a seção vazia", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(lerVisualizacoes).mockRejectedValue(new Error('relation "crm_pipeline_views" does not exist'));
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
    expect(screen.getByText("Nenhuma visualização ainda.")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-com-origens.test.tsx
```
Expected: FAIL — os dois casos novos (`lerVisualizacoes` nunca chamado; sem link da visualização).

- [ ] **Step 3: O encaixe lê as visualizações**

Em `components/escale/origens/ComOrigens.tsx`:

(a) Troque:

```tsx
import { lerPreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
```

por:

```tsx
import { lerPreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { lerVisualizacoes } from "@/lib/escale/visualizacoes/ler-visualizacoes";
import type { Visualizacao } from "@/lib/escale/visualizacoes/regras";
```

(b) Logo ANTES de `export async function ComOrigens(`, acrescente:

```tsx
type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Banco sem a 9003 (ou fora do ar): o painel abre com a seção Visualizações vazia. */
async function visualizacoesOuNada(supabase: Supabase, orgId: string): Promise<Visualizacao[]> {
  try {
    return await lerVisualizacoes(supabase, orgId);
  } catch (err) {
    console.error("[escale/visualizacoes] não consegui ler as visualizações; o painel abre sem elas", err);
    return [];
  }
}
```

(c) Troque:

```tsx
  let origens: Origens;
  try {
    origens = await lerOrigens(await createClient(), activeOrg.orgId);
  } catch (err) {
```

por:

```tsx
  const supabase = await createClient();
  let origens: Origens;
  try {
    origens = await lerOrigens(supabase, activeOrg.orgId);
  } catch (err) {
```

(d) Troque (a linha provisória da Task 8):

```tsx
      <PainelOrigens
        origens={origens}
        visualizacoes={[]}
        podeGerenciar={ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager}
```

por:

```tsx
      <PainelOrigens
        origens={origens}
        visualizacoes={await visualizacoesOuNada(supabase, activeOrg.orgId)}
        podeGerenciar={ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager}
```

- [ ] **Step 4: Rodar os testes da fase e o typecheck**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm vitest run tests/unit/escale-com-origens.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/escale-janelas-da-visualizacao.test.tsx tests/unit/escale-janelas-de-origens.test.tsx tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx tests/unit/escale-pagina-da-visualizacao.test.tsx tests/unit/escale-visualizacoes-rotas.test.ts tests/unit/escale-visualizacoes-regras.test.ts tests/unit/escale-visualizacoes-migration.test.ts tests/unit/escale-origens-regras.test.ts tests/unit/escale-grupos-de-funis-rotas.test.ts tests/unit/escale-negocios-entrada.test.ts "app/app/pipelines/[id]/trocar-funil.test.tsx" tests/unit/arrastar-le-o-updated-at-do-cache.test.tsx
corepack pnpm typecheck
```
Expected: 15 arquivos PASS; typecheck sem erros.

- [ ] **Step 5: Commit**

```bash
git add components/escale/origens/ComOrigens.tsx tests/unit/escale-com-origens.test.tsx
git commit -m "feat(escale): painel Origens chega com as visualizações da organização

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Lint, réguas e colisão de migration**

```bash
git diff --name-only escale-crm/main...HEAD | grep -E "\.(ts|tsx)$" | xargs corepack pnpm exec eslint
corepack pnpm lint:channels && corepack pnpm lint:role-rank
corepack pnpm checar:colisao-de-migration
```
Expected: eslint sem erro nos arquivos da branch; as duas réguas `ok`; o checador sem colisão para a `9003`. Se o eslint pedir `exhaustive-deps` em algum `useCallback`/`useMemo` novo, acrescente a dependência que ele aponta (não desligue a regra).

- [ ] **Step 7: Suíte unitária, comparada com a main**

```bash
SP="$TEMP/fase1c"; mkdir -p "$SP"
corepack pnpm test:unit > "$SP/unit.log" 2>&1; grep -E "Test Files|Tests  " "$SP/unit.log"
grep -E "^ ❯ \|[a-z]+\| " "$SP/unit.log" | sed -E 's/^ ❯ \|[a-z]+\| ([^ ]+) .*/\1/' | sort -u > "$SP/falhas.txt"; cat "$SP/falhas.txt"
corepack pnpm vitest run $(cat "$SP/falhas.txt") > "$SP/branch.log" 2>&1
grep -E "^ (❯|×) .*\.test\.tsx? " "$SP/branch.log" | grep -oE "tests/unit/[^ ]+|app/[^ ]+\.test\.tsx?|lib/[^ ]+\.test\.tsx?" | sort -u > "$SP/falha-branch.txt"
git switch -q --detach escale-crm/main
corepack pnpm vitest run $(cat "$SP/falha-branch.txt") > "$SP/main.log" 2>&1
git switch -q feat/fase-1c-visualizacoes
grep -E "^ (❯|×) .*\.test\.tsx? " "$SP/main.log" | grep -oE "tests/unit/[^ ]+|app/[^ ]+\.test\.tsx?|lib/[^ ]+\.test\.tsx?" | sort -u > "$SP/falha-main.txt"
echo "=== falha na branch e NÃO na main:"; comm -23 "$SP/falha-branch.txt" "$SP/falha-main.txt"
```
Expected: nenhum arquivo `escale-*` em `falhas.txt`, e a última lista vazia (as falhas restantes são o ruído do Windows, iguais na main). Se aparecer arquivo na última lista, é defeito desta branch: investigue com superpowers:systematic-debugging e faça um commit `fix(escale): …`. Antes do `git switch`, `git status --porcelain` tem de estar vazio. Atenção especial a testes que varrem o código à procura de padrões (por exemplo, `crypto.randomUUID` cru em tela, `createAdminClient` em leitura de usuário, texto sem `t()`): um deles reprovando é regra do projeto, e a correção é no código novo.

- [ ] **Step 8: Suíte de banco inteira**

```bash
corepack pnpm test:db > "$SP/db.log" 2>&1; grep -E "Test Files|Tests  |test:db verde" "$SP/db.log"
grep -E "FAIL|✗|×" "$SP/db.log" | head -20
```
Expected: todos os arquivos PASS e `==> test:db verde` (um arquivo a mais que na Fase 1B). Falha que cite `crm_pipeline_view`, `9003`, `fn_escale_salvar_visualizacao` ou `uq_crm_pipelines_org_id` é desta branch — em especial um teste do original que conta índices de `crm_pipelines` ou que apaga funil e confere o que sobra: investigue antes de mexer.

- [ ] **Step 9: Push e PR**

```bash
git push -u escale-crm feat/fase-1c-visualizacoes
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-1c-visualizacoes \
  --title "feat(escale): Fase 1C — Visualizações (quadro que junta origens, com acesso configurável)" --body-file - <<'EOF'
## O que muda (só com o menu no topo ligado)
- Painel Origens ganha a seção **Visualizações**, como na Clint: cada visualização com quantas origens junta.
- **Criar visualização** (o `+` da seção), **Selecionar origens** (⋮ do grupo) e **Selecionar origem** (⋮ da origem) entram no modo seleção: caixinhas nas origens (a do grupo marca todas), rodapé "N origens selecionadas · Rascunho", Cancelar e Salvar como visualização.
- Ao salvar: nome e **Quem vê** — "Toda a organização" ou "Só as pessoas escolhidas" (gerente e admin sempre veem).
- ⋮ da visualização: Editar origens, Configurações (nome e quem vê), Excluir.
- **O quadro da visualização** (`/app/pipelines/visualizacoes/<id>`): etapas com exatamente o mesmo nome viram uma coluna só e somam os cards; nomes diferentes viram colunas próprias. Cada card diz de qual origem é ("3d em Proposta · Leads PA").
- No quadro dá para fazer o que se faz no funil: arrastar (vai para a etapa de mesmo nome NA ORIGEM DO CARD; a origem sem essa etapa recusa com aviso), abrir o card, selecionar, ação em lote (uma origem por vez), filtrar (o mesmo filtro do funil, na URL) e criar negócio (pergunta em qual origem).
- Dentro da visualização cada pessoa vê só os negócios que já vê em cada origem: o quadro lê cada origem pela rota de sempre, com a sessão de quem olha.

## Banco — migration 9003
- Tabelas `crm_pipeline_views`, `crm_pipeline_view_origens` e `crm_pipeline_view_pessoas`, com RLS (acesso `todos`/`escolhidos`; só gerente/admin escreve) e FKs compostas (origem e pessoa da mesma organização; apagar a origem tira ela da visualização).
- `fn_escale_salvar_visualizacao` (security invoker) grava tudo numa transação.
- Cria o índice único `(organization_id, id)` de `crm_pipelines` só se ainda não existir um igual.
- O mesmo SQL está no `baseline.sql` (logo depois do bloco 9002), então o `update.sh` aplica.
- Prova no Postgres: `tests/invariants/escale-visualizacoes-rls.test.ts`.

## Onde toca o original
Blocos em pontos fixos: `baseline.sql` (bloco 9003), `lib/i18n/dicionario.ts`, `lib/audit/actions.ts` (3 códigos), `tests/invariants/rls-completude-varredura.test.ts` (3 entradas). Nenhum componente do original foi alterado: o quadro combinado reaproveita `KanbanCard`, `useBoard`, `useMoveCard`, `FilterBar`, `BulkActionBar`, `NewLeadDialog` e `LeadDossier` como estão.

## Para publicar (decisão sua)
Mudança de banco: **backup antes** (`backup.sh`) e depois `update.sh --to <versão>`, só depois que o workflow das imagens terminar (`promover-stable`).

## Verificação
- [ ] Testes `escale-*` verdes; typecheck sem erro; eslint dos arquivos da branch sem erro
- [ ] `test:unit` sem regressão contra a main (ruído do Windows igual nas duas)
- [ ] `test:db` verde
- [ ] CI do fork verde (imagens amd64 e arm64)
- [ ] Depois de publicar, com o menu no topo: criar visualização pelo `+` (marcar grupo inteiro e origem solta), abrir o quadro e ver as etapas de mesmo nome juntas; arrastar um card para uma etapa que a origem dele tem e para uma que não tem (aviso); abrir um card; selecionar cards de uma origem e usar o lote; filtrar; criar negócio escolhendo a origem; ⋮ do grupo → Selecionar origens; ⋮ da visualização → Editar origens, Configurações (trocar para "Só as pessoas escolhidas") e Excluir; entrar como atendente escolhido e não escolhido e conferir quem vê a visualização

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

- [ ] **Step 10: Acompanhar o CI e entregar**

```bash
gh pr checks --repo rgisjr/escale-crm --watch --interval 30
```
Expected: verdes (`imagem-do-app-sobe` e `imagens-de-fundo-sobem`, amd64 e arm64). Informar o link do PR ao usuário. **Não mergear e não publicar**: merge, release, backup e atualização da VPS são decisões do usuário.

---

## Fora desta fase (registrado para não se perder)

- **Recentes** no painel (decisão do usuário: fica para depois).
- **Prévia ao vivo do rascunho** (a Clint mostra o quadro do rascunho enquanto as caixinhas mudam): aqui o quadro abre depois de salvar.
- **Renomear coluna no quadro combinado**: renomear é na origem.
- **Lote com cards de várias origens**: hoje é uma origem por vez.
- **Permissão por origem** (a Clint tem "Permissões de usuários" na origem): quando existir, a visualização herda sozinha, porque o quadro lê cada origem com a sessão de quem olha.
- **Filtros por tudo** (campos personalizados, atividades, tempo na etapa…): é a fase dos Filtros; o quadro combinado usa o `FilterBar` do funil e ganha o que ele ganhar.
