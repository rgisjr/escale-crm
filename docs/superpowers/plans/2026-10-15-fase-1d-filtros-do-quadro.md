# Fase 1D — Filtros e ordenação do quadro de Negócios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao quadro de Negócios (funil e Visualização) a barra de filtros da Clint, itens B1 a B9 do PRD `docs/modulos/1-negocios.md`:
- o quadro abre em **"Em aberto"**, e o status aceita várias escolhas. As colunas de ganho e de perda somem quando o status não as pede;
- **filtros salvos**, pessoais ou compartilhados (caixinha "compartilhar");
- filtros novos:
  - do negócio: data de criação e valor, este agora com tela;
  - da conversa: com ou sem, não lidas, não respondidas, status, canal e atendente;
  - por campos personalizados do negócio e pelos campos fixos do contato;
  - atividades concluídas, mínimo e máximo;
  - tempo na etapa e tempo desde a entrada, com unidade;
- **ordenação** por até 3 critérios: contato, negócio, campos personalizados, atividades e atendimento;
- **contagem** "N negócios" e botão **Atualizar**;
- o resumo dos filtros ativos fica visível com o painel fechado.

**Architecture:** O filtro continua rodando no navegador, porque a rota do quadro já entrega o funil inteiro. A forma única dos filtros (`FiltrosDoQuadro`, um schema Zod em `lib/escale/filtros/tipos.ts`) vale para três lugares:
- **a URL:** as chaves do original continuam (`owner`, `tag`, `q`…), o status vai em `st` e o resto em `f` (JSON);
- **o filtro salvo:** a tabela nova `crm_filtros_salvos` (migration **9004**);
- **a tela:** `components/escale/filtros/`.

A rota do quadro ganha, no meio da cadeia (onde as cercas permitem), uma etapa do fork, `comDadosDosFiltros`. Ela traz o que os filtros novos leem e o payload não tinha:
- quantas atividades concluídas, pela função `fn_escale_atividades_concluidas` (invoker);
- o nome do contato;
- status, canal, atendente e quem falou por último na conversa da capa.

O recorte (`recortarQuadro`) esconde as colunas que o status não pede e aplica os filtros. O comparador da ordenação entra no `KanbanBoard` e no quadro combinado por uma prop nova. Com ordenação ativa, arrastar dentro da coluna não faz nada, e mudar de etapa põe o card no fim da etapa.

**Tech Stack:** Postgres 15+/Supabase (RLS, SQL invoker), Next.js 16 App Router, React 19, TypeScript estrito, Zod 4, TanStack Query 5, `@hello-pangea/dnd`, Radix (Popover, DropdownMenu, Dialog, AlertDialog), Vitest + Testing Library, Tailwind 4, Phosphor (via `@/lib/ui/icons`).

**Referência visual e de vocabulário:**
- Fichas da Clint em `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\telas\`:
  - `01-018-filtros-negocios.md`: painel com acordeões Negócio, Conversas, Tags, Campos e Outros; "ATIVIDADES CONCLUÍDAS Min/Max"; "TEMPO NA ETAPA Min/Max + dias na etapa";
  - `01-020-kanban-negocios.md`: "Pesquisar nessa origem…", "Em aberto", "Filtros 1", "21 Negócios", "Ordenar", Atualizar.
- Textos da Clint observados em `reverse engenering/clint-model/catalog-v2/i18n-pt.txt`:
  - `DealSortControl.*`: "Ordenar por", "Adicionar critério", "Ordenação ativa · arrastar para reordenar dentro da coluna está desabilitado. Mover de etapa continua funcionando.";
  - `FilterPresetsMenu.capReached`: "Limite de 20 filtros salvos atingido. Exclua algum para salvar outro.";
  - `DealsFilter.chat.*`.

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- **Base:** `escale-crm/main` **já com a sincronização do Rafael v1.81.0 mergeada**, ou seja, a `main` contém o commit `6f842cb01` (branch `sync/upstream-2026-10-15`). Esse merge muda o quadro (tarefas no card, calendário). Se `git merge-base --is-ancestor 6f842cb01 escale-crm/main` falhar, PARE e pergunte ao usuário.
- **Branch:** `feat/fase-1d-filtros-do-quadro`.
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:**
  - dar push em `origin` (o repositório do Rafael);
  - mergear;
  - publicar release;
  - mexer na VPS ou no banco de produção.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.

### Migration 9004

- Arquivo: `supabase/migrations/20261019120000_9004_filtros_salvos.sql`. O timestamp fica depois do último do original (`20261018120001_0676`).
- A primeira linha é `-- manifest:`, numa linha só.
- **Não** acrescentar linha no `supabase/migrations/MANIFEST.md`.
- O MESMO SQL vai para `supabase/baseline.sql`:
  - **onde:** logo ANTES da linha `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----`, portanto logo DEPOIS do bloco 9003. Nunca no fim do arquivo;
  - **cabeçalho:** `-- ---- FORK ESCALE · filtros salvos do quadro (migration 9004) ----`.

### Regras de produto

- **Princípio do produto (decisão do usuário, 14/10): quase tudo tem configuração de acesso, e os filtros filtram por quase tudo.** Aplicado aos filtros salvos:
  - cada filtro é pessoal ou compartilhado;
  - qualquer membro (viewer ou acima) salva os seus (decisão de 15/10, pergunta 4 do PRD);
  - só quem criou muda ou exclui;
  - o compartilhado aparece para quem enxerga a origem ou a visualização. A RLS consulta `crm_pipelines` e `crm_pipeline_views` com a sessão de quem olha e nunca copia permissão. Quando a 1J restringir quem vê cada origem, o filtro compartilhado segue sozinho.
- **Motor de status (decisão de 15/10, caminho A):**
  - ganho e perda continuam sendo etapas;
  - o quadro esconde a coluna de ganho e a de perda quando o status não as pede;
  - marcar ganho ou perda continua pelo menu do card.
- **A barra nova vem com a casca nova (cookie `escale_menu=topo`).**
  - Com a lateral, o quadro do funil continua o do original (`FilterBar`, status "todos").
  - A Visualização só existe na casca nova, então ela usa sempre a barra nova.

### Filtragem e desempenho

- **Filtrar continua no navegador.**
  - A rota do quadro já devolve o funil inteiro, sem paginar, e os filtros novos não leem nada além do que ela entrega.
  - O risco de funil grande (PRD, seção 11) é medido na Task 14, que mostra o número ao usuário. Paginar no servidor NÃO é escopo desta fase.

### Limites

| Limite | Valor |
|---|---|
| Filtros salvos por pessoa, em cada origem ou visualização | 20 (o mesmo limite e texto da Clint) |
| Nome do filtro | 1 a 60 caracteres |
| Condições de campo | 10 |
| Critérios de ordenação | 3 |

### Onde o fork entra nos arquivos do original

Os blocos do fork vão em pontos fixos:

| Arquivo | Ponto fixo |
|---|---|
| Dicionário | Logo depois da entrada `"{n} negócios de {k} origens selecionados. A ação em lote vale para uma origem por vez.": { … },`, que fecha o bloco da 1C |
| Auditoria | Logo depois de `"pipeline_view.deleted",` |
| Varredura de RLS | Logo depois da entrada `crm_pipeline_view_pessoas` de `PROVA_PROPRIA` |
| Ícones | Logo depois de `FrameCorners,` em `lib/ui/icons.ts` |
| Rota do quadro | ENTRE `withTarefas` e `withConversas`. As cercas `kanban-atalho-conversa`, `funil-filtro-de-tag-le-as-duas-caixas` e `funil-mostra-dados-do-cliente` exigem `withConversas → withMarcadoresDoContato → resposta` |

Em `KanbanBoard.tsx`, `_client.tsx` e `page.tsx` do funil, cada trecho novo leva o comentário `FORK ESCALE · Fase 1D`.

### Textos e i18n

- Todo texto de tela passa por `t()` com literal e tem espanhol no dicionário.
- Chave repetida no dicionário quebra o typecheck. A Task 8 insere por script e PULA as chaves que já existem.

### Commits, PR e testes

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- O corpo do PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Falhas que não são regressão:** testes que falham NESTA máquina Windows e também em `escale-crm/main` (pdfjs com caminho `C:\…`, `spawnSync bash ENOENT`, `chmod 600`, caminho com espaço, `EPERM` em pasta temporária). Ver a memória `sincronizar-com-o-rafael`.
  - Regressão é teste que passa em `escale-crm/main` e falha na branch.
- **Docker para o `test:db`:** `pnpm test:db` precisa do Docker Desktop rodando.
  - Se `docker info` falhar, PARE e peça ao usuário para abrir o Docker.
  - Se travar em "wsl-keepalive", a cura é `wsl --shutdown` e abrir o Docker de novo, com OK do usuário.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `supabase/migrations/20261019120000_9004_filtros_salvos.sql` | novo | tabela `crm_filtros_salvos`, RLS, FKs compostas, `fn_escale_atividades_concluidas` |
| `supabase/baseline.sql` | alterado (bloco no meio) | o mesmo SQL para o self-host |
| `tests/unit/escale-filtros-salvos-migration.test.ts` | novo | migration ↔ baseline, posição, forma do SQL |
| `tests/invariants/escale-filtros-salvos-rls.test.ts` | novo | prova no Postgres: dono, compartilhado herdado, escrita, FKs, função |
| `tests/invariants/rls-completude-varredura.test.ts` | alterado (1 entrada) | registra a prova da tabela nova |
| `lib/escale/filtros/tipos.ts` | novo | schema, tipos, padrão, enxugar, contagem por seção, critérios ativos |
| `lib/escale/filtros/url.ts` | novo | URL ↔ filtros (chaves do original + `st`, `f`, `fs`) |
| `lib/escale/filtros/dados-do-quadro.ts` | novo | o que a rota anexa ao negócio para os filtros (puro) |
| `tests/helpers/negocio-do-quadro.ts` | novo | fábrica de `Lead` dos testes da fase |
| `tests/unit/escale-filtros-tipos-e-url.test.ts` | novo | tipos e URL |
| `tests/unit/escale-dados-dos-filtros.test.ts` | novo | anexar os dados (puro) |
| `lib/escale/filtros/campos.ts` | novo | campos filtráveis, operadores, condição |
| `lib/escale/filtros/aplicar.ts` | novo | aplicar os filtros, colunas visíveis, recorte do quadro |
| `tests/unit/escale-filtros-aplicar.test.ts` | novo | campos, aplicar, recorte |
| `lib/escale/filtros/ordenar.ts` | novo | opções, comparador, posição no fim da etapa |
| `tests/unit/escale-filtros-ordenar.test.ts` | novo | ordenação |
| `lib/escale/filtros/ler-dados-do-quadro.ts` | novo | leitura no servidor (função, contatos, conversas) |
| `app/api/v1/pipelines/[id]/board/route.ts` | alterado (1 etapa) | chama `comDadosDosFiltros` entre tarefas e conversas |
| `tests/unit/escale-dados-dos-filtros-na-rota.test.ts` | novo | leitura no servidor e a fiação da rota |
| `lib/escale/filtros/filtros-salvos.ts` | novo | regras puras dos filtros salvos |
| `lib/escale/filtros/ler-filtros-salvos.ts` | novo | leitura (RLS decide; filtro de defesa) |
| `lib/escale/filtros/respostas.ts` | novo | releitura, alvo da busca, erros com nome |
| `lib/audit/actions.ts` | alterado (bloco) | 3 códigos novos |
| `app/api/v1/filtros-salvos/route.ts` | novo | GET lista, POST cria |
| `app/api/v1/filtros-salvos/[id]/route.ts` | novo | PATCH, DELETE (só o dono) |
| `tests/unit/escale-filtros-salvos-rotas.test.ts` | novo | as quatro rotas |
| `lib/i18n/dicionario.ts` | alterado (bloco) | textos em espanhol |
| `lib/ui/icons.ts` | alterado (2 nomes) | `ArrowsDownUp`, `BookmarkSimple` |
| `components/escale/filtros/controles.tsx` | novo | caixinha, número, texto, rótulo do grupo |
| `components/escale/filtros/SecaoNegocio.tsx` | novo | dono, criação, valor, atrasados, perda |
| `components/escale/filtros/SecaoConversas.tsx` | novo | filtros da conversa |
| `components/escale/filtros/SecaoTags.tsx` | novo | tags com E/OU |
| `components/escale/filtros/SecaoCampos.tsx` | novo | condições de campo |
| `components/escale/filtros/SecaoOutros.tsx` | novo | atividades, tempo na etapa, tempo desde a entrada |
| `components/escale/filtros/PainelDeFiltros.tsx` | novo | o botão "Filtros" e os acordeões |
| `components/escale/filtros/ResumoDosFiltros.tsx` | novo | os chips com o painel fechado |
| `components/escale/filtros/StatusDoQuadro.tsx` | novo | status com várias escolhas |
| `tests/unit/escale-painel-de-filtros.test.tsx` | novo | status, painel, seções, resumo |
| `hooks/escale/useFiltrosSalvos.ts` | novo | leitura e escrita (TanStack Query) |
| `components/escale/filtros/MenuDeFiltrosSalvos.tsx` | novo | o menu dos filtros salvos |
| `components/escale/filtros/JanelaDoFiltroSalvo.tsx` | novo | salvar e editar (nome, compartilhar) |
| `tests/unit/escale-filtros-salvos-menu.test.tsx` | novo | menu e janela |
| `hooks/escale/useFiltrosDoQuadro.ts` | novo | os filtros da URL |
| `components/escale/filtros/OrdenarCards.tsx` | novo | "Ordenar por" |
| `components/escale/filtros/BarraDoQuadro.tsx` | novo | a barra inteira |
| `tests/unit/escale-barra-do-quadro.test.tsx` | novo | busca, contagem, ordenar, atualizar |
| `components/kanban/KanbanBoard.tsx` | alterado (prop nova) | `ordemDosCards` |
| `app/app/pipelines/[id]/_client.tsx` | alterado (bloco) | barra nova com a casca nova |
| `app/app/pipelines/[id]/page.tsx` | alterado (cookie) | passa `cascaNova` |
| `tests/unit/escale-quadro-ordenado.test.tsx` | novo | `KanbanBoard` com ordenação |
| `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx` | novo | a página do funil com a casca nova |
| `hooks/escale/useQuadrosDaVisualizacao.ts` | alterado | `atualizar` e `atualizando` |
| `lib/escale/visualizacoes/regras.ts` | alterado | `cardsDaColuna` aceita o comparador |
| `components/escale/visualizacoes/QuadroCombinado.tsx` | alterado | `ordemDosCards` |
| `components/escale/visualizacoes/QuadroDaVisualizacao.tsx` | alterado | barra nova, recorte, alvo |
| `app/app/pipelines/visualizacoes/[id]/page.tsx` | alterado | passa o `id` |
| `tests/unit/escale-quadro-da-visualizacao.test.tsx` | alterado | barra nova e "Em aberto" |
| `tests/unit/escale-quadro-combinado.test.tsx` | alterado | ordenação no quadro combinado |
| `tests/unit/escale-visualizacoes-regras.test.ts` | alterado (1 caso) | comparador em `cardsDaColuna` |

---

### Task 1: Branch, migration 9004 e o bloco do baseline

**Files:**
- Create: `supabase/migrations/20261019120000_9004_filtros_salvos.sql`, `tests/unit/escale-filtros-salvos-migration.test.ts`
- Modify: `supabase/baseline.sql` (bloco antes da linha da 0323, logo depois do bloco 9003)
- Copy: este plano para `docs/superpowers/plans/2026-10-15-fase-1d-filtros-do-quadro.md` no repositório

**Interfaces:**
- Consumes: `crm_pipelines (organization_id, id)` com índice único (criado na 9003), `crm_pipeline_views` com `crm_pipeline_views_org_id_key (organization_id, id)` (9003), `user_organizations (user_id, organization_id)`, `crm_tasks (organization_id, lead_id, status)`.
- Produces:
  - **Tabela** `public.crm_filtros_salvos`:
    - colunas `id, organization_id, user_id, pipeline_id, view_id, nome, compartilhado, criterios jsonb, created_at, updated_at`;
    - CHECKs `crm_filtros_salvos_um_alvo`, `crm_filtros_salvos_nome_valido` (1–60), `crm_filtros_salvos_criterios_objeto` e `crm_filtros_salvos_criterios_tamanho`;
    - FKs `crm_filtros_salvos_dono_fk`, `crm_filtros_salvos_origem_fk` e `crm_filtros_salvos_visualizacao_fk`, todas com cascade;
    - índice único `uq_crm_filtros_salvos_nome`.
  - **Função** `public.fn_escale_atividades_concluidas(p_org uuid, p_leads uuid[]) returns table (lead_id uuid, total integer)`.

  As Tasks 2, 6 e 7 dependem disso.

- [ ] **Step 1: Conferir a base, criar a branch e copiar o plano**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git merge-base --is-ancestor 6f842cb01 escale-crm/main && echo "sync ok"
```
Expected: `sync ok`. Sem essa linha, PARE: a sincronização v1.81.0 ainda não está na `main`. Pergunte ao usuário.

```bash
git switch -c feat/fase-1d-filtros-do-quadro escale-crm/main
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-15-fase-1d-filtros-do-quadro.md" docs/superpowers/plans/
```

- [ ] **Step 2: Escrever o teste estático (vai falhar)**

Create `tests/unit/escale-filtros-salvos-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * FILTROS SALVOS DO QUADRO (fork Escale, migration 9004): a migration e o bloco
 * do baseline são o MESMO SQL, e o bloco mora no ponto fixo do fork — depois
 * do bloco 9003 e antes do bloco da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261019120000_9004_filtros_salvos.sql";
const MIGRATION_9003 = "supabase/migrations/20261014200000_9003_visualizacoes_de_origens.sql";
const CABECALHO = "-- ---- FORK ESCALE · filtros salvos do quadro (migration 9004) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("filtros salvos: migration 9004 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença", () => {
    const migration = ler(MIGRATION);
    expect(migration.length).toBeGreaterThan(3000);
    expect(ler("supabase/baseline.sql").includes(migration)).toBe(true);
  });

  it("o bloco mora depois do bloco 9003 e antes do bloco da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const de9003 = baseline.indexOf(ler(MIGRATION_9003));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(ler(MIGRATION));
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9003).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9003);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("RLS: escreve só quem criou; o compartilhado lê a origem e a visualização com a sessão de quem olha", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("alter table public.crm_filtros_salvos enable row level security;");
    expect(sql).toContain("create policy crm_filtros_salvos_select on public.crm_filtros_salvos");
    expect(sql).toContain("create policy crm_filtros_salvos_dono_write on public.crm_filtros_salvos");
    expect(sql).toContain("and user_id = auth.uid()");
    expect(sql).toContain("select 1 from public.crm_pipelines p where p.id = crm_filtros_salvos.pipeline_id");
    expect(sql).toContain("select 1 from public.crm_pipeline_views v where v.id = crm_filtros_salvos.view_id");
    expect(sql).toContain("revoke all on public.crm_filtros_salvos from anon;");
  });

  it("um alvo só, e as FKs compostas apagam junto sem cruzar organização", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("check ((pipeline_id is null) <> (view_id is null))");
    expect(sql).toContain("references public.crm_pipelines (organization_id, id) on delete cascade");
    expect(sql).toContain("references public.crm_pipeline_views (organization_id, id) on delete cascade");
    expect(sql).toContain("references public.user_organizations (user_id, organization_id) on delete cascade");
  });

  it("a contagem de atividades roda como quem chama, com search_path fixo e fechada a anon", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("create or replace function public.fn_escale_atividades_concluidas(p_org uuid, p_leads uuid[])");
    expect(sql).toContain("security invoker");
    expect(sql).not.toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).toContain("revoke all on function public.fn_escale_atividades_concluidas(uuid, uuid[]) from public, anon;");
    expect(sql).toContain("do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-salvos-migration.test.ts
```
Expected: FAIL. O caso "a migration existe" falha com `existsSync` false, e os demais falham com ENOENT.

- [ ] **Step 4: Escrever a migration**

Create `supabase/migrations/20261019120000_9004_filtros_salvos.sql`. A primeira linha é UMA linha só:

```sql
-- manifest: **Filtros salvos do quadro de negócios (fork Escale, Fase 1D).** Tabela nova `crm_filtros_salvos`: cada pessoa salva os filtros de UMA origem (`pipeline_id`) ou de UMA visualização (`view_id`), com nome (único por pessoa e alvo, sem olhar caixa), os critérios (`criterios`, jsonb validado pela rota) e `compartilhado`. RLS: quem criou vê e escreve; o filtro compartilhado é visto por quem enxerga a origem ou a visualização, porque a policy consulta `crm_pipelines`/`crm_pipeline_views` com a sessão de quem olha (nenhuma permissão copiada). FKs compostas com `on delete cascade` para a origem, a visualização e `user_organizations`. Função `fn_escale_atividades_concluidas` (security invoker): quantas tarefas concluídas cada negócio tem, para o filtro e a ordenação do quadro.
-- 9004: filtros salvos do quadro e contagem de atividades concluídas (fork Escale).

create table if not exists public.crm_filtros_salvos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  pipeline_id uuid,
  view_id uuid,
  nome text not null,
  compartilhado boolean not null default false,
  criterios jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Um filtro é de uma origem OU de uma visualização, nunca dos dois nem de nenhum.
  constraint crm_filtros_salvos_um_alvo check ((pipeline_id is null) <> (view_id is null)),
  constraint crm_filtros_salvos_nome_valido check (char_length(btrim(nome)) between 1 and 60),
  constraint crm_filtros_salvos_criterios_objeto check (jsonb_typeof(criterios) = 'object'),
  constraint crm_filtros_salvos_criterios_tamanho check (octet_length(criterios::text) <= 16384),
  constraint crm_filtros_salvos_dono_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade,
  constraint crm_filtros_salvos_origem_fk foreign key (organization_id, pipeline_id)
    references public.crm_pipelines (organization_id, id) on delete cascade,
  constraint crm_filtros_salvos_visualizacao_fk foreign key (organization_id, view_id)
    references public.crm_pipeline_views (organization_id, id) on delete cascade
);

-- Nome único por pessoa e alvo, sem olhar caixa (a rota confere antes, também
-- sem acento); o índice é a guarda contra corrida entre duas abas.
create unique index if not exists uq_crm_filtros_salvos_nome
  on public.crm_filtros_salvos (organization_id, user_id, coalesce(pipeline_id, view_id), lower(btrim(nome)));

create index if not exists idx_crm_filtros_salvos_origem
  on public.crm_filtros_salvos (organization_id, pipeline_id);
create index if not exists idx_crm_filtros_salvos_visualizacao
  on public.crm_filtros_salvos (organization_id, view_id);
create index if not exists idx_crm_filtros_salvos_dono
  on public.crm_filtros_salvos (user_id, organization_id);

alter table public.crm_filtros_salvos enable row level security;

drop policy if exists crm_filtros_salvos_select on public.crm_filtros_salvos;
drop policy if exists crm_filtros_salvos_dono_write on public.crm_filtros_salvos;

-- Quem vê: quem criou; e, se compartilhado, quem enxerga a origem ou a
-- visualização. As duas subconsultas rodam sob a RLS de quem olha — é isso
-- que faz o filtro seguir a permissão da origem/visualização sem copiá-la.
create policy crm_filtros_salvos_select on public.crm_filtros_salvos
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (user_id = auth.uid()
             or (compartilhado
                 and (exists (select 1 from public.crm_pipelines p where p.id = crm_filtros_salvos.pipeline_id)
                      or exists (select 1 from public.crm_pipeline_views v where v.id = crm_filtros_salvos.view_id)))))
  );

-- Quem escreve: só quem criou, dentro da própria organização. Qualquer papel
-- salva os seus filtros (decisão de 15/10); o suporte somente leitura para nas
-- travas support_write_* (chamada no fim deste arquivo).
create policy crm_filtros_salvos_dono_write on public.crm_filtros_salvos
  using ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid())
  with check ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid());

revoke all on public.crm_filtros_salvos from anon;
grant select, insert, update, delete on public.crm_filtros_salvos to authenticated;
grant all on public.crm_filtros_salvos to service_role;

drop trigger if exists trg_crm_filtros_salvos_updated_at on public.crm_filtros_salvos;
create trigger trg_crm_filtros_salvos_updated_at
  before update on public.crm_filtros_salvos
  for each row execute function public.fn_set_updated_at();

-- Quantas tarefas CONCLUÍDAS cada negócio tem. Contar no banco, e não trazer as
-- linhas: o PostgREST corta toda leitura em 1000 linhas sem erro, e um lote de
-- 100 negócios com histórico longo passaria disso calado. INVOKER: a RLS de
-- crm_tasks de quem chama vale.
create or replace function public.fn_escale_atividades_concluidas(p_org uuid, p_leads uuid[])
returns table (lead_id uuid, total integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select t.lead_id, count(*)::integer
    from public.crm_tasks t
   where t.organization_id = p_org
     and t.lead_id = any(p_leads)
     and t.status = 'done'
   group by t.lead_id
$$;

revoke all on function public.fn_escale_atividades_concluidas(uuid, uuid[]) from public, anon;
grant execute on function public.fn_escale_atividades_concluidas(uuid, uuid[]) to authenticated, service_role;

comment on table public.crm_filtros_salvos is
  'Filtros salvos do quadro de negócios (fork Escale, migration 9004): de uma origem (pipeline_id) ou de uma visualização (view_id). Pessoal ou compartilhado; o compartilhado é visto por quem enxerga a origem/visualização (RLS com a sessão de quem olha). Só quem criou escreve.';
comment on function public.fn_escale_atividades_concluidas(uuid, uuid[]) is
  'Conta as tarefas concluídas (crm_tasks.status = done) de cada negócio de p_leads na organização p_org. Security invoker. Chamador: lib/escale/filtros/ler-dados-do-quadro.ts (rota do quadro).';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
-- Na cadeia de migrations, esta chamada é o que dá as três travas
-- support_write_* à tabela nova. No baseline.sql o bloco mora ANTES da última
-- chamada do arquivo, que também a cobre; chamar aqui é idempotente.
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

- [ ] **Step 5: Pôr o mesmo SQL no baseline, no ponto fixo**

Da raiz do repositório:

```bash
node -e '
const fs = require("fs");
const MIG = "supabase/migrations/20261019120000_9004_filtros_salvos.sql";
const BASE = "supabase/baseline.sql";
const ANCORA = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const CAB = "-- ---- FORK ESCALE · filtros salvos do quadro (migration 9004) ----";
const base = fs.readFileSync(BASE, "utf8");
if (base.includes(CAB)) throw new Error("o bloco 9004 já está no baseline");
if (!base.includes("-- ---- FORK ESCALE · visualizações de origens (migration 9003) ----")) throw new Error("bloco 9003 ausente");
const i = base.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 0323 não encontrada");
const eol = base.includes("\r\n") ? "\r\n" : "\n";
let mig = fs.readFileSync(MIG, "utf8").replace(/\r\n/g, "\n");
if (!mig.endsWith("\n")) mig += "\n";
const bloco = (CAB + "\n" + mig + "\n").replace(/\n/g, eol);
fs.writeFileSync(BASE, base.slice(0, i) + bloco + base.slice(i));
console.log("bloco 9004 inserido antes da linha", base.slice(0, i).split("\n").length);
'
```
Expected: `bloco 9004 inserido antes da linha 329xx` (a âncora estava na linha ~32954 antes da sincronização; o número exato depende da base).

- [ ] **Step 6: Rodar o teste e os gates do baseline**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-salvos-migration.test.ts tests/unit/escale-visualizacoes-migration.test.ts tests/unit/escale-toda-origem-tem-grupo-migration.test.ts tests/unit/escale-grupos-de-funis-migration.test.ts tests/unit/baseline-reaplicavel.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/check-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/apendice-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/sonda-do-baseline-ancora-na-ultima-definicao.test.ts tests/unit/baseline-no-piso-do-postgres.test.ts tests/unit/varredura-anon-e-o-ultimo-bloco.test.ts
```
Expected: PASS nos 11 arquivos. Algum arquivo pode não existir mais depois da sincronização. Nesse caso o vitest avisa "No test files found" para ele, e isso não é falha; liste os que sobraram com `ls tests/unit | grep -E "baseline|manifest|varredura-anon"`. Se um gate do baseline reclamar de algo da 9004, corrija a MIGRATION, refaça o bloco (`git checkout -- supabase/baseline.sql` e o Step 5) e rode de novo.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261019120000_9004_filtros_salvos.sql supabase/baseline.sql tests/unit/escale-filtros-salvos-migration.test.ts docs/superpowers/plans/2026-10-15-fase-1d-filtros-do-quadro.md
git commit -m "feat(escale): filtros salvos do quadro e contagem de atividades concluídas (migration 9004)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Prova no Postgres

**Files:**
- Create: `tests/invariants/escale-filtros-salvos-rls.test.ts`
- Modify: `tests/invariants/rls-completude-varredura.test.ts` (1 entrada em `PROVA_PROPRIA`, logo depois da de `crm_pipeline_view_pessoas`)

**Interfaces:**
- Consumes: schema da Task 1. Os helpers vêm de `tests/invariants/gov-helpers.ts`:
  - `seedGov`, que cria a organização, os 5 usuários, `GOV_PIPELINE`, `GOV_STAGE` e `GOV_LEAD`;
  - `sql`, `lastLine`, `countAs` e `writeCountAs`. `sql` roda `psql -tA`; `countAs` e `writeCountAs` rodam como `authenticated` com o JWT do usuário;
  - as constantes `GOV_ORG`, `GOV_PIPELINE`, `GOV_LEAD`, `GOV_VIEWER`, `GOV_AGENT_A`, `GOV_AGENT_B` e `GOV_MANAGER`.
- Produces: nada (é prova).

- [ ] **Step 1: Escrever a prova da 9004**

Create `tests/invariants/escale-filtros-salvos-rls.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_LEAD,
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
 * FILTROS SALVOS DO QUADRO (fork Escale, migration 9004) — prova contra Postgres
 * real: o filtro pessoal só para quem criou, o compartilhado herdando quem vê a
 * origem e a visualização (sem copiar permissão), só o dono escreve, as FKs
 * compostas e a contagem de atividades rodando como quem chama.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const ORG_B = "e5ca1e00-9004-4000-8000-000000000001";
const USER_B = "e5ca1e00-9004-4000-8000-000000000002";
const FUNIL_B = "e5ca1e00-9004-4000-8000-000000000003";
const V_ESCOLHIDOS = "e5ca1e00-9004-4000-8000-000000000011";
const F_PRIVADO = "e5ca1e00-9004-4000-8000-000000000021";
const F_COMPARTILHADO = "e5ca1e00-9004-4000-8000-000000000022";
const F_NA_VISUALIZACAO = "e5ca1e00-9004-4000-8000-000000000023";
const F_B = "e5ca1e00-9004-4000-8000-000000000024";
const T_FEITA_1 = "e5ca1e00-9004-4000-8000-000000000031";
const T_FEITA_2 = "e5ca1e00-9004-4000-8000-000000000032";
const T_ABERTA = "e5ca1e00-9004-4000-8000-000000000033";

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

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email)
      values ('${USER_B}', 'escale-filtros-b@invariant.test')
      on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-filtros-b', 'Escale Filtros Org B', 'Escale FB')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${FUNIL_B}', '${ORG_B}', 'Funil da B', 'escale-filtros-funil-b')
      on conflict do nothing;
    insert into public.crm_pipeline_views (id, organization_id, name, acesso)
      values ('${V_ESCOLHIDOS}', '${GOV_ORG}', 'Só da Ana (filtros)', 'escolhidos')
      on conflict do nothing;
    insert into public.crm_pipeline_view_origens (view_id, organization_id, pipeline_id, position)
      values ('${V_ESCOLHIDOS}', '${GOV_ORG}', '${GOV_PIPELINE}', 1)
      on conflict do nothing;
    insert into public.crm_pipeline_view_pessoas (view_id, organization_id, user_id)
      values ('${V_ESCOLHIDOS}', '${GOV_ORG}', '${GOV_AGENT_A}')
      on conflict do nothing;
    insert into public.crm_filtros_salvos (id, organization_id, user_id, pipeline_id, view_id, nome, compartilhado, criterios)
      values ('${F_PRIVADO}', '${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', null, 'Meus quentes', false, '{"status":["open"]}'),
             ('${F_COMPARTILHADO}', '${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', null, 'Do time', true, '{"status":["open"]}'),
             ('${F_NA_VISUALIZACAO}', '${GOV_ORG}', '${GOV_AGENT_A}', null, '${V_ESCOLHIDOS}', 'Na visualização', true, '{"status":["open"]}'),
             ('${F_B}', '${ORG_B}', '${USER_B}', '${FUNIL_B}', null, 'Do time', true, '{"status":["open"]}')
      on conflict do nothing;
    insert into public.crm_tasks (id, organization_id, title, status, lead_id)
      values ('${T_FEITA_1}', '${GOV_ORG}', 'Ligar', 'done', '${GOV_LEAD}'),
             ('${T_FEITA_2}', '${GOV_ORG}', 'Mandar proposta', 'done', '${GOV_LEAD}'),
             ('${T_ABERTA}', '${GOV_ORG}', 'Cobrar', 'pending', '${GOV_LEAD}')
      on conflict do nothing;
  `);
});

const visto = (id: string) => `select count(*) from public.crm_filtros_salvos where id = '${id}';`;

describe("crm_filtros_salvos — o filtro pessoal", () => {
  it("quem criou vê (controle positivo); outra pessoa da organização não vê", () => {
    expect(countAs(GOV_AGENT_A, visto(F_PRIVADO))).toBe(1);
    expect(countAs(GOV_AGENT_B, visto(F_PRIVADO))).toBe(0);
    expect(countAs(GOV_MANAGER, visto(F_PRIVADO))).toBe(0);
  });
});

describe("crm_filtros_salvos — o compartilhado segue quem vê o alvo", () => {
  it("compartilhado numa origem: a organização vê; a vizinha não, nos dois sentidos", () => {
    expect(countAs(GOV_AGENT_B, visto(F_COMPARTILHADO))).toBe(1);
    expect(countAs(GOV_VIEWER, visto(F_COMPARTILHADO))).toBe(1);
    expect(countAs(USER_B, visto(F_COMPARTILHADO))).toBe(0);
    expect(countAs(GOV_VIEWER, visto(F_B))).toBe(0);
    expect(countAs(USER_B, visto(F_B))).toBe(1);
  });

  it("compartilhado numa visualização 'escolhidos': vê quem vê a visualização, e só", () => {
    expect(countAs(GOV_MANAGER, visto(F_NA_VISUALIZACAO))).toBe(1);
    expect(countAs(GOV_AGENT_A, visto(F_NA_VISUALIZACAO))).toBe(1);
    expect(countAs(GOV_AGENT_B, visto(F_NA_VISUALIZACAO))).toBe(0);
    expect(countAs(GOV_VIEWER, visto(F_NA_VISUALIZACAO))).toBe(0);
  });
});

describe("crm_filtros_salvos — quem escreve", () => {
  it("ninguém muda nem apaga o filtro de outra pessoa, nem o compartilhado", () => {
    expect(writeCountAs(GOV_AGENT_B, `update public.crm_filtros_salvos set nome = 'Tomado' where id = '${F_COMPARTILHADO}'`)).toBe(0);
    expect(writeCountAs(GOV_MANAGER, `delete from public.crm_filtros_salvos where id = '${F_COMPARTILHADO}'`)).toBe(0);
    expect(sql(`select nome from public.crm_filtros_salvos where id = '${F_COMPARTILHADO}';`)).toBe("Do time");
  });

  it("ninguém cria filtro em nome de outra pessoa nem em outra organização", () => {
    expect(
      writeCountAs(GOV_AGENT_B, `insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', 'Em nome da Ana')`),
    ).toBe(0);
    expect(
      writeCountAs(USER_B, `insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${USER_B}', '${GOV_PIPELINE}', 'Na casa do vizinho')`),
    ).toBe(0);
  });

  it("qualquer papel salva o próprio filtro (controles positivos: agent e viewer)", () => {
    expect(
      writeCountAs(GOV_AGENT_B, `insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_B}', '${GOV_PIPELINE}', 'Do agent B')`),
    ).toBe(1);
    expect(
      writeCountAs(GOV_VIEWER, `insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_VIEWER}', '${GOV_PIPELINE}', 'Do viewer')`),
    ).toBe(1);
  });
});

describe("crm_filtros_salvos — CHECKs, índice e FKs", () => {
  it("o banco recusa filtro sem alvo e com dois alvos", () => {
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'Sem alvo');`),
    ).toThrow(/crm_filtros_salvos_um_alvo/);
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, view_id, nome)
             values ('${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', '${V_ESCOLHIDOS}', 'Dois alvos');`),
    ).toThrow(/crm_filtros_salvos_um_alvo/);
  });

  it("o banco recusa origem de outra organização e nome repetido (sem olhar caixa) da mesma pessoa no mesmo alvo", () => {
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', '${FUNIL_B}', 'Fora');`),
    ).toThrow(/crm_filtros_salvos_origem_fk/);
    expect(() =>
      sql(`insert into public.crm_filtros_salvos (organization_id, user_id, pipeline_id, nome) values ('${GOV_ORG}', '${GOV_AGENT_A}', '${GOV_PIPELINE}', ' MEUS QUENTES ');`),
    ).toThrow(/uq_crm_filtros_salvos_nome/);
  });

  it("apagar a origem, a visualização ou a pessoa da organização leva o filtro junto", () => {
    expect(
      sql(`select string_agg(conname || '=' || confdeltype, ',' order by conname) from pg_constraint
            where conname in ('crm_filtros_salvos_dono_fk', 'crm_filtros_salvos_origem_fk', 'crm_filtros_salvos_visualizacao_fk');`),
    ).toBe("crm_filtros_salvos_dono_fk=c,crm_filtros_salvos_origem_fk=c,crm_filtros_salvos_visualizacao_fk=c");
  });
});

describe("fn_escale_atividades_concluidas", () => {
  it("conta só as concluídas, como quem chama", () => {
    expect(
      comoUsuario(GOV_MANAGER, `select total from public.fn_escale_atividades_concluidas('${GOV_ORG}', array['${GOV_LEAD}']::uuid[]);`),
    ).toBe("2");
  });

  it("quem é de outra organização não conta nada (a RLS de crm_tasks vale)", () => {
    expect(
      comoUsuario(USER_B, `select count(*) from public.fn_escale_atividades_concluidas('${GOV_ORG}', array['${GOV_LEAD}']::uuid[]);`),
    ).toBe("0");
  });

  it("é invoker", () => {
    expect(sql(`select prosecdef from pg_proc where proname = 'fn_escale_atividades_concluidas';`)).toBe("f");
  });
});
```

- [ ] **Step 2: Registrar a prova na varredura de RLS**

Em `tests/invariants/rls-completude-varredura.test.ts`, logo DEPOIS do fechamento da entrada de `crm_pipeline_view_pessoas` em `PROVA_PROPRIA` (o `},` que vem depois do texto "…recusa quem não é da organização.\","), acrescente:

```ts
  {
    tabela: "crm_filtros_salvos",
    razao:
      "tests/invariants/escale-filtros-salvos-rls.test.ts — fork Escale (migration 9004): o filtro pessoal só para quem criou " +
      "(zero para o gerente), o compartilhado visto por quem vê a origem ou a visualização e ZERO para o vizinho nos dois sentidos, " +
      "só o dono escreve, e as FKs compostas recusam origem de outra organização.",
  },
```

- [ ] **Step 3: Rodar a prova (Docker)**

```bash
docker info --format '{{.ServerVersion}}'
```
Expected: uma versão (ex. `28.x`). Se falhar, PARE e peça ao usuário para abrir o Docker Desktop.

```bash
corepack pnpm test:db tests/invariants/escale-filtros-salvos-rls.test.ts tests/invariants/rls-completude-varredura.test.ts tests/invariants/travas-de-suporte-cobrem-toda-tabela-na-instalacao.test.ts tests/invariants/hardening-definer-varredura.test.ts tests/invariants/escale-visualizacoes-rls.test.ts 2>&1 | tail -25
```
Expected: os 5 arquivos PASS e `==> test:db verde`. Se o install falhar, corrija a MIGRATION, refaça o bloco do baseline (`git checkout -- supabase/baseline.sql` e o Step 5 da Task 1) e rode de novo. Se um caso da prova falhar, a falha é da migration, não da prova: leia a mensagem antes de mexer em qualquer `expect`. Se a contagem der `0` para o gerente, confira se `seedGov` deu ao `GOV_MANAGER` acesso ao `GOV_LEAD`. Se não deu, troque o caso para `comoUsuario(GOV_ADMIN, …)`, importando `GOV_ADMIN` dos helpers.

- [ ] **Step 4: Commit**

```bash
git add tests/invariants/escale-filtros-salvos-rls.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "test(escale): prova no Postgres dos filtros salvos e da contagem de atividades

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: A forma dos filtros, a URL e o que a rota anexa ao negócio

**Files:**
- Create: `lib/escale/filtros/tipos.ts`, `lib/escale/filtros/url.ts`, `lib/escale/filtros/dados-do-quadro.ts`, `tests/helpers/negocio-do-quadro.ts`, `tests/unit/escale-filtros-tipos-e-url.test.ts`, `tests/unit/escale-dados-dos-filtros.test.ts`

**Interfaces:**
- Consumes: do original, `filtersFromParams`, `filtersToParams`, `marcadoresDoFiltro` e `LeadFilters` (`@/lib/kanban/filters`), e `Lead` (`@/lib/types/leads`).
- Produces:
  - **`tipos.ts`**:
    - constantes: `STATUS_DO_NEGOCIO`, `UNIDADES_DE_TEMPO`, `CANAIS_DA_CONVERSA`, `SITUACOES_DA_CONVERSA`, `STATUS_DE_CONVERSA_ENCERRADA`, `SEM_ATENDENTE = "nenhum"`, `ALVOS_DE_CAMPO`, `OPERADORES_DE_CAMPO`, `CAMPOS_FIXOS_DE_ORDEM`, `PREFIXO_DE_CAMPO = "campo:"`, `CONDICOES_DE_CAMPO_MAX = 10` e `CRITERIOS_DE_ORDEM_MAX = 3`;
    - `filtrosDoQuadroSchema` (Zod, strict) e os tipos `FiltrosDoQuadro`, `StatusDoNegocio`, `UnidadeDeTempo`, `CanalDaConversa`, `AlvoDeCampo`, `OperadorDeCampo`, `CondicaoDeCampo`, `CriterioDeOrdem`, `FiltroDeConversa`, `Intervalo` e `IntervaloDeTempo`;
    - `FILTROS_PADRAO = { status: ["open"] }`;
    - funções: `normalizarStatus(lista: readonly string[]): StatusDoNegocio[]`, `ehStatusPadrao(status): boolean`, `enxugar(f): FiltrosDoQuadro`, `contarPorSecao(f): Record<SecaoDeFiltro, number>`, `limparSecao(f, secao)`, `limparCriterios(f)`, `temCriterios(f): boolean`, `mesmosFiltros(a, b): boolean`, `criteriosAtivos(f): CriterioAtivo[]` e `removerCriterio(f, id: ChaveDeCriterio)`;
    - os tipos `SecaoDeFiltro` (`"negocio" | "conversas" | "tags" | "campos" | "outros"`), `ChaveDeCriterio` e `CriterioAtivo = { id; rotulo; n? }`.
  - **`url.ts`**:
    - `filtrosDaUrl(sp): { filtros: FiltrosDoQuadro; filtroSalvoId: string | null }`;
    - `filtrosParaUrl(filtros, filtroSalvoId?: string | null): string`;
    - as constantes `PARAM_STATUS = "st"`, `PARAM_AVANCADOS = "f"` e `PARAM_FILTRO_SALVO = "fs"`.
  - **`dados-do-quadro.ts`**:
    - os tipos `ConversaDoFiltro`, `DadosDeFiltroDoNegocio`, `NegocioComFiltros` e `LinhasDosFiltros`;
    - as funções `dadosDeFiltro(lead): DadosDeFiltroDoNegocio | undefined` e `anexarDadosDosFiltros(leads, linhas): Lead[]`.
  - **`tests/helpers/negocio-do-quadro.ts`**: `AGORA`, `horasAtras(h)` e `negocio(id, over?, filtros?)`.

- [ ] **Step 1: A fábrica de negócio dos testes**

Create `tests/helpers/negocio-do-quadro.ts`:

```ts
import type { DadosDeFiltroDoNegocio } from "@/lib/escale/filtros/dados-do-quadro";
import type { Lead } from "@/lib/types/leads";

/**
 * Negócio de teste da Fase 1D (filtros do quadro). `AGORA` é meio-dia UTC: longe
 * da virada do dia em qualquer fuso do Brasil, para "data de criação" não
 * depender da máquina.
 */
export const AGORA = new Date("2026-10-15T12:00:00Z");

export const horasAtras = (horas: number) => new Date(AGORA.getTime() - horas * 3_600_000).toISOString();

export function negocio(id: string, over: Partial<Lead> = {}, filtros?: Partial<DadosDeFiltroDoNegocio>): Lead {
  const base = {
    id,
    organization_id: "org-1",
    pipeline_id: "p-1",
    stage_id: "e-entrada",
    contact_id: null,
    title: `Negócio ${id}`,
    description: null,
    status: "open",
    lost_reason: null,
    position_in_stage: 1000,
    value_cents: null,
    currency: null,
    owner_user_id: null,
    owner_kind: null,
    owner_agent_id: null,
    assigned_at: null,
    last_activity_at: null,
    stage_changed_at: horasAtras(1),
    expected_close_date: null,
    closed_at: null,
    source: "manual",
    source_metadata: {},
    external_id: null,
    custom_fields: {},
    tags: [],
    created_at: horasAtras(2),
    updated_at: horasAtras(1),
    created_by_user_id: null,
  } as Lead;
  const lead = { ...base, ...over };
  if (!filtros) return lead;
  return { ...lead, filtros_escale: { atividades_concluidas: 0, contato_nome: null, conversa: null, ...filtros } } as Lead;
}
```

- [ ] **Step 2: Escrever os testes da forma e da URL (vão falhar)**

Create `tests/unit/escale-filtros-tipos-e-url.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  FILTROS_PADRAO,
  contarPorSecao,
  criteriosAtivos,
  enxugar,
  filtrosDoQuadroSchema,
  limparCriterios,
  limparSecao,
  mesmosFiltros,
  normalizarStatus,
  removerCriterio,
  temCriterios,
  type FiltrosDoQuadro,
} from "@/lib/escale/filtros/tipos";
import { filtrosDaUrl, filtrosParaUrl } from "@/lib/escale/filtros/url";

const ID_SALVO = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const url = (texto: string) => filtrosDaUrl(new URLSearchParams(texto));

const COMPLETO: FiltrosDoQuadro = {
  status: ["open", "won"],
  busca: "ana",
  dono: "agent:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
  tags: ["vip", "quente"],
  modoDasTags: "ou",
  atrasados: true,
  criadoEm: { de: "2026-10-01", ate: "2026-10-15" },
  valor: { min: 100000 },
  conversa: { naoLidas: true, canais: ["whatsapp"], atendentes: ["nenhum"] },
  campos: [{ alvo: "negocio", chave: "cidade", op: "contem", valor: "Natal" }],
  atividadesConcluidas: { min: 2, max: 5 },
  tempoNaEtapa: { min: 3, unidade: "dias" },
  tempoDesdeEntrada: { max: 48, unidade: "horas" },
  ordem: [{ campo: "negocio.valor", direcao: "desc" }],
};

describe("os filtros na URL", () => {
  it("sem nada na URL, o quadro abre em Em aberto e sem filtro salvo", () => {
    expect(url("")).toEqual({ filtros: { status: ["open"] }, filtroSalvoId: null });
    expect(FILTROS_PADRAO).toEqual({ status: ["open"] });
  });

  it("st junta status na ordem fixa; status= de link antigo ainda vale; lixo vira o padrão", () => {
    expect(url("st=won,open").filtros.status).toEqual(["open", "won"]);
    expect(url("status=lost").filtros.status).toEqual(["lost"]);
    expect(url("status=all").filtros.status).toEqual(["open", "won", "lost"]);
    expect(url("st=open&status=lost").filtros.status).toEqual(["open"]);
    expect(url("st=qualquer").filtros.status).toEqual(["open"]);
  });

  it("ida e volta: o que vai para a URL volta igual, com o filtro salvo", () => {
    expect(url(filtrosParaUrl(COMPLETO, ID_SALVO))).toEqual({ filtros: enxugar(COMPLETO), filtroSalvoId: ID_SALVO });
  });

  it("as chaves do original continuam as mesmas, e o padrão não escreve st nem f", () => {
    const p = new URLSearchParams(
      filtrosParaUrl({ status: ["open"], dono: "u-1", tags: ["vip", "quente"], modoDasTags: "ou", busca: "ana", atrasados: true }),
    );
    expect(p.get("owner")).toBe("u-1");
    expect(p.getAll("tag")).toEqual(["vip", "quente"]);
    expect(p.get("modo")).toBe("ou");
    expect(p.get("q")).toBe("ana");
    expect(p.get("overdue")).toBe("1");
    expect(p.has("st")).toBe(false);
    expect(p.has("status")).toBe(false);
    expect(p.has("f")).toBe(false);
  });

  it("f quebrado ou fora do schema é ignorado, sem erro; fs que não é uuid também", () => {
    expect(url("f=%7Bquebrado").filtros).toEqual({ status: ["open"] });
    expect(url(`f=${encodeURIComponent(JSON.stringify({ valor: { min: -5 } }))}`).filtros).toEqual({ status: ["open"] });
    expect(url("fs=nao-e-uuid").filtroSalvoId).toBeNull();
  });
});

describe("enxugar, seções e critérios ativos", () => {
  it("tira o que está vazio e põe o status padrão quando falta", () => {
    expect(
      enxugar({
        status: [],
        busca: "  ",
        dono: "any",
        tags: [],
        conversa: {},
        campos: [],
        valor: {},
        tempoNaEtapa: { unidade: "dias" },
        ordem: [],
      }),
    ).toEqual({ status: ["open"] });
  });

  it("'sem conversa' apaga os outros filtros de conversa; E/OU só fica com duas tags", () => {
    expect(enxugar({ status: ["open"], conversa: { existe: "sem", naoLidas: true } }).conversa).toEqual({ existe: "sem" });
    expect(enxugar({ status: ["open"], tags: ["vip"], modoDasTags: "ou" }).modoDasTags).toBeUndefined();
  });

  it("conta os critérios por seção (status e busca não contam: têm controle próprio)", () => {
    expect(contarPorSecao(COMPLETO)).toEqual({ negocio: 4, conversas: 3, tags: 1, campos: 1, outros: 3 });
    expect(contarPorSecao({ status: ["lost"], busca: "x" })).toEqual({ negocio: 0, conversas: 0, tags: 0, campos: 0, outros: 0 });
    expect(temCriterios({ status: ["lost"], ordem: COMPLETO.ordem })).toBe(false);
    expect(temCriterios({ status: ["open"], atrasados: true })).toBe(true);
  });

  it("limpar uma seção tira só ela; limpar filtros mantém status e ordenação", () => {
    expect(limparSecao(COMPLETO, "conversas").conversa).toBeUndefined();
    expect(limparSecao(COMPLETO, "conversas").tags).toEqual(["vip", "quente"]);
    expect(limparSecao(COMPLETO, "tags").modoDasTags).toBeUndefined();
    expect(limparCriterios(COMPLETO)).toEqual({ status: ["open", "won"], ordem: [{ campo: "negocio.valor", direcao: "desc" }] });
  });

  it("os critérios ativos viram chips (sem a busca), e tirar tags leva o E/OU junto", () => {
    expect(criteriosAtivos(COMPLETO).map((c) => [c.id, c.n])).toEqual([
      ["dono", undefined],
      ["criadoEm", undefined],
      ["valor", undefined],
      ["atrasados", undefined],
      ["conversa", undefined],
      ["tags", 2],
      ["campos", 1],
      ["atividadesConcluidas", undefined],
      ["tempoNaEtapa", undefined],
      ["tempoDesdeEntrada", undefined],
    ]);
    const semTags = removerCriterio(COMPLETO, "tags");
    expect(semTags.tags).toBeUndefined();
    expect(semTags.modoDasTags).toBeUndefined();
  });

  it("dois filtros são iguais sem olhar a ordem das chaves nem o que está vazio", () => {
    const a: FiltrosDoQuadro = { status: ["open"], campos: [{ alvo: "negocio", chave: "x", op: "contem", valor: "1" }], busca: "" };
    const b = JSON.parse('{"campos":[{"valor":"1","op":"contem","chave":"x","alvo":"negocio"}],"status":["open"]}') as FiltrosDoQuadro;
    expect(mesmosFiltros(a, b)).toBe(true);
    expect(mesmosFiltros(a, { ...b, campos: [{ alvo: "negocio", chave: "x", op: "contem", valor: "2" }] })).toBe(false);
  });

  it("o schema recusa chave a mais, status vazio, número negativo e campo de ordem desconhecido", () => {
    expect(filtrosDoQuadroSchema.safeParse(COMPLETO).success).toBe(true);
    expect(filtrosDoQuadroSchema.safeParse({ status: [] }).success).toBe(false);
    expect(filtrosDoQuadroSchema.safeParse({ status: ["open"], organization_id: "x" }).success).toBe(false);
    expect(filtrosDoQuadroSchema.safeParse({ status: ["open"], valor: { min: -1 } }).success).toBe(false);
    expect(
      filtrosDoQuadroSchema.safeParse({ status: ["open"], ordem: [{ campo: "qualquer.coisa", direcao: "asc" }] }).success,
    ).toBe(false);
    expect(normalizarStatus(["lost", "lost", "open"])).toEqual(["open", "lost"]);
  });
});
```

- [ ] **Step 3: Escrever os testes do que a rota anexa (vão falhar)**

Create `tests/unit/escale-dados-dos-filtros.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { anexarDadosDosFiltros, dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

const conversa = (contact_id: string, last_message_at: string | null, over: Record<string, unknown> = {}) => ({
  contact_id,
  status: "open",
  channel: "whatsapp",
  assigned_to_user_id: null,
  last_inbound_at: null,
  last_outbound_at: null,
  last_message_at,
  ...over,
});

describe("anexarDadosDosFiltros", () => {
  it("conta as concluídas por negócio; quem não tem fica com zero", () => {
    const [a, b] = anexarDadosDosFiltros([negocio("a"), negocio("b")], {
      concluidas: [{ lead_id: "a", total: 3 }],
      contatos: [],
      conversas: [],
    });
    expect(dadosDeFiltro(a!)?.atividades_concluidas).toBe(3);
    expect(dadosDeFiltro(b!)?.atividades_concluidas).toBe(0);
  });

  it("o nome do contato prefere o nome de exibição e some quando o contato foi anonimizado", () => {
    const leads = anexarDadosDosFiltros(
      [negocio("a", { contact_id: "c1" }), negocio("b", { contact_id: "c2" }), negocio("c", { contact_id: "c3" }), negocio("d")],
      {
        concluidas: [],
        conversas: [],
        contatos: [
          { id: "c1", name: "Ana Souza", display_name: "Aninha", is_anonymized: false },
          { id: "c2", name: "Bruno", display_name: "  ", is_anonymized: false },
          { id: "c3", name: "Carla", display_name: null, is_anonymized: true },
        ],
      },
    );
    expect(leads.map((l) => dadosDeFiltro(l)?.contato_nome)).toEqual(["Aninha", "Bruno", null, null]);
  });

  it("a conversa é a mais recente do contato — a mesma da capa —, venha na ordem que vier", () => {
    const [lead] = anexarDadosDosFiltros([negocio("a", { contact_id: "c1" })], {
      concluidas: [],
      contatos: [],
      conversas: [
        conversa("c1", "2026-10-10T10:00:00Z", { channel: "instagram" }),
        conversa("c1", null, { channel: "facebook" }),
        conversa("c1", "2026-10-14T10:00:00Z", {
          status: "resolved",
          assigned_to_user_id: "u-1",
          last_inbound_at: "2026-10-14T10:00:00Z",
          last_outbound_at: "2026-10-13T10:00:00Z",
        }),
      ],
    });
    expect(dadosDeFiltro(lead!)?.conversa).toEqual({
      status: "resolved",
      canal: "whatsapp",
      atendente_id: "u-1",
      ultima_entrada: "2026-10-14T10:00:00Z",
      ultima_saida: "2026-10-13T10:00:00Z",
    });
  });

  it("negócio sem contato ou contato sem conversa: conversa nula", () => {
    const leads = anexarDadosDosFiltros([negocio("a"), negocio("b", { contact_id: "c9" })], {
      concluidas: [],
      contatos: [],
      conversas: [],
    });
    expect(leads.map((l) => dadosDeFiltro(l)?.conversa)).toEqual([null, null]);
  });

  it("não muda o negócio de entrada", () => {
    const original = negocio("a");
    anexarDadosDosFiltros([original], { concluidas: [{ lead_id: "a", total: 1 }], contatos: [], conversas: [] });
    expect(dadosDeFiltro(original)).toBeUndefined();
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-tipos-e-url.test.ts tests/unit/escale-dados-dos-filtros.test.ts
```
Expected: FAIL. Os dois arquivos param em `Failed to resolve import "@/lib/escale/filtros/tipos"` e `"@/lib/escale/filtros/dados-do-quadro"`.

- [ ] **Step 5: A forma dos filtros**

Create `lib/escale/filtros/tipos.ts`:

```ts
import { z } from "zod";

/**
 * OS FILTROS DO QUADRO DE NEGÓCIOS (fork Escale, Fase 1D).
 *
 * Uma forma só para os três lugares que falam de filtro: a URL do quadro
 * (`url.ts`), o filtro salvo (`crm_filtros_salvos.criterios`) e a tela
 * (`components/escale/filtros/`). O schema mora aqui para a rota recusar
 * exatamente o que a tela não consegue montar.
 *
 * Status é uma LISTA: "Em aberto" é o padrão, como na Clint, e dá para juntar
 * ganhos e perdidos. Ganho e perda continuam sendo ETAPAS (motor do original,
 * decisão de 15/10): o quadro esconde a coluna de ganho e a de perda quando o
 * status não as pede (`etapasVisiveis`, em `aplicar.ts`).
 */
export const STATUS_DO_NEGOCIO = ["open", "won", "lost"] as const;
export type StatusDoNegocio = (typeof STATUS_DO_NEGOCIO)[number];

export const UNIDADES_DE_TEMPO = ["horas", "dias"] as const;
export type UnidadeDeTempo = (typeof UNIDADES_DE_TEMPO)[number];

/** Os canais do CHECK `conversations_channel_check`. */
export const CANAIS_DA_CONVERSA = ["whatsapp", "instagram", "facebook"] as const;
export type CanalDaConversa = (typeof CANAIS_DA_CONVERSA)[number];

/** "Aberta" e "Encerrada": a mesma régua do cabeçalho do Inbox (`ConversationHeader`). */
export const SITUACOES_DA_CONVERSA = ["aberta", "encerrada"] as const;
export type SituacaoDaConversa = (typeof SITUACOES_DA_CONVERSA)[number];
export const STATUS_DE_CONVERSA_ENCERRADA: readonly string[] = ["resolved", "closed", "archived"];

/** O "ninguém" do filtro de atendentes ("Não atribuídos"). */
export const SEM_ATENDENTE = "nenhum";

export const ALVOS_DE_CAMPO = ["negocio", "contato"] as const;
export type AlvoDeCampo = (typeof ALVOS_DE_CAMPO)[number];
export const OPERADORES_DE_CAMPO = ["contem", "igual", "entre", "preenchido", "vazio"] as const;
export type OperadorDeCampo = (typeof OPERADORES_DE_CAMPO)[number];

export const CAMPOS_FIXOS_DE_ORDEM = [
  "contato.nome",
  "negocio.titulo",
  "negocio.criado",
  "negocio.atualizado",
  "negocio.valor",
  "negocio.previsao",
  "negocio.ganho",
  "negocio.perdido",
  "negocio.tempo_na_etapa",
  "atividades.concluidas",
  "atividades.abertas",
  "atendimento.ultima_mensagem",
  "atendimento.nao_lidas",
] as const;
/** Campo personalizado do negócio na ordenação: `campo:<chave>`. */
export const PREFIXO_DE_CAMPO = "campo:";

export const CONDICOES_DE_CAMPO_MAX = 10;
export const CRITERIOS_DE_ORDEM_MAX = 3;

const numero = z.number().finite().min(0).max(1e12);
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const intervaloSchema = z.object({ min: numero.optional(), max: numero.optional() }).strict();
const intervaloDeTempoSchema = z
  .object({ min: numero.optional(), max: numero.optional(), unidade: z.enum(UNIDADES_DE_TEMPO) })
  .strict();

export const condicaoDeCampoSchema = z
  .object({
    alvo: z.enum(ALVOS_DE_CAMPO),
    chave: z.string().min(1).max(40),
    op: z.enum(OPERADORES_DE_CAMPO),
    valor: z.string().max(200).optional(),
    ate: z.string().max(200).optional(),
  })
  .strict();

export const criterioDeOrdemSchema = z
  .object({
    campo: z
      .string()
      .max(60)
      .refine((c) => (CAMPOS_FIXOS_DE_ORDEM as readonly string[]).includes(c) || /^campo:[a-z][a-z0-9_]*$/i.test(c)),
    direcao: z.enum(["asc", "desc"]),
  })
  .strict();

export const filtroDeConversaSchema = z
  .object({
    existe: z.enum(["com", "sem"]).optional(),
    naoLidas: z.boolean().optional(),
    semResposta: z.boolean().optional(),
    situacao: z.array(z.enum(SITUACOES_DA_CONVERSA)).max(2).optional(),
    canais: z.array(z.enum(CANAIS_DA_CONVERSA)).max(3).optional(),
    atendentes: z.array(z.string().min(1).max(80)).max(100).optional(),
  })
  .strict();

export const filtrosDoQuadroSchema = z
  .object({
    status: z.array(z.enum(STATUS_DO_NEGOCIO)).min(1).max(3),
    busca: z.string().max(200).optional(),
    /** O `owner` do original: uuid, `agent:<uuid>` ou `unassigned`. */
    dono: z.string().min(1).max(80).optional(),
    tags: z.array(z.string().min(1).max(80)).max(50).optional(),
    /** Só o OU é guardado: E é o padrão (`lib/kanban/filters.ts`). */
    modoDasTags: z.literal("ou").optional(),
    atrasados: z.literal(true).optional(),
    motivoDePerda: z.string().min(1).max(200).optional(),
    categoriaDePerda: z.string().min(1).max(200).optional(),
    criadoEm: z.object({ de: dia.optional(), ate: dia.optional() }).strict().optional(),
    /** Centavos, na moeda da organização (a régua da #1531 em `applyFilters`). */
    valor: intervaloSchema.optional(),
    conversa: filtroDeConversaSchema.optional(),
    campos: z.array(condicaoDeCampoSchema).max(CONDICOES_DE_CAMPO_MAX).optional(),
    atividadesConcluidas: intervaloSchema.optional(),
    tempoNaEtapa: intervaloDeTempoSchema.optional(),
    tempoDesdeEntrada: intervaloDeTempoSchema.optional(),
    ordem: z.array(criterioDeOrdemSchema).max(CRITERIOS_DE_ORDEM_MAX).optional(),
  })
  .strict();

export type FiltrosDoQuadro = z.infer<typeof filtrosDoQuadroSchema>;
export type CondicaoDeCampo = z.infer<typeof condicaoDeCampoSchema>;
export type CriterioDeOrdem = z.infer<typeof criterioDeOrdemSchema>;
export type FiltroDeConversa = z.infer<typeof filtroDeConversaSchema>;
export type Intervalo = z.infer<typeof intervaloSchema>;
export type IntervaloDeTempo = z.infer<typeof intervaloDeTempoSchema>;

export const FILTROS_PADRAO: FiltrosDoQuadro = { status: ["open"] };

/** Status sem repetição, na ordem fixa; nada válido vira o padrão ("Em aberto"). */
export function normalizarStatus(lista: readonly string[]): StatusDoNegocio[] {
  const escolhidos = STATUS_DO_NEGOCIO.filter((s) => lista.includes(s));
  return escolhidos.length > 0 ? escolhidos : [...FILTROS_PADRAO.status];
}

export const ehStatusPadrao = (status: readonly StatusDoNegocio[]) => status.length === 1 && status[0] === "open";

const semIndefinidos = <T extends object>(objeto: T): T =>
  Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined)) as T;

function intervalo<T extends { min?: number; max?: number }>(i: T | undefined): T | undefined {
  if (!i || (i.min === undefined && i.max === undefined)) return undefined;
  return semIndefinidos(i);
}

function enxugarConversa(c: FiltroDeConversa | undefined): FiltroDeConversa | undefined {
  if (!c) return undefined;
  // "Sem conversa" não combina com nenhum outro critério de conversa.
  if (c.existe === "sem") return { existe: "sem" };
  const limpo = semIndefinidos<FiltroDeConversa>({
    existe: c.existe,
    naoLidas: c.naoLidas || undefined,
    semResposta: c.semResposta || undefined,
    situacao: c.situacao?.length ? [...c.situacao] : undefined,
    canais: c.canais?.length ? [...c.canais] : undefined,
    atendentes: c.atendentes?.length ? [...c.atendentes] : undefined,
  });
  return Object.keys(limpo).length > 0 ? limpo : undefined;
}

/**
 * O filtro sem nada vazio: é o que vai para a URL e para o filtro salvo, e é
 * sobre ele que se conta e se compara. Uma seção "aberta e vazia" não é filtro.
 */
export function enxugar(f: FiltrosDoQuadro): FiltrosDoQuadro {
  const tags = f.tags?.length ? [...f.tags] : undefined;
  const criadoEm = f.criadoEm && (f.criadoEm.de || f.criadoEm.ate) ? semIndefinidos({ de: f.criadoEm.de || undefined, ate: f.criadoEm.ate || undefined }) : undefined;
  return semIndefinidos<FiltrosDoQuadro>({
    status: normalizarStatus(f.status),
    busca: f.busca?.trim() || undefined,
    dono: f.dono && f.dono !== "any" ? f.dono : undefined,
    tags,
    modoDasTags: tags && tags.length > 1 ? f.modoDasTags : undefined,
    atrasados: f.atrasados || undefined,
    motivoDePerda: f.motivoDePerda?.trim() ? f.motivoDePerda : undefined,
    categoriaDePerda: f.categoriaDePerda?.trim() ? f.categoriaDePerda : undefined,
    criadoEm,
    valor: intervalo(f.valor),
    conversa: enxugarConversa(f.conversa),
    campos: f.campos?.length ? [...f.campos] : undefined,
    atividadesConcluidas: intervalo(f.atividadesConcluidas),
    tempoNaEtapa: intervalo(f.tempoNaEtapa),
    tempoDesdeEntrada: intervalo(f.tempoDesdeEntrada),
    ordem: f.ordem?.length ? [...f.ordem] : undefined,
  });
}

// ── As seções do painel (Clint: Negócio, Conversas, Tags, Campos, Outros) ──

export const SECOES_DE_FILTRO = ["negocio", "conversas", "tags", "campos", "outros"] as const;
export type SecaoDeFiltro = (typeof SECOES_DE_FILTRO)[number];

const CHAVES_DA_SECAO: Record<SecaoDeFiltro, ReadonlyArray<keyof FiltrosDoQuadro>> = {
  negocio: ["dono", "criadoEm", "valor", "atrasados", "motivoDePerda", "categoriaDePerda"],
  conversas: ["conversa"],
  tags: ["tags", "modoDasTags"],
  campos: ["campos"],
  outros: ["atividadesConcluidas", "tempoNaEtapa", "tempoDesdeEntrada"],
};

/** Quantos critérios cada seção tem ligados. Status e busca têm controle próprio e não contam. */
export function contarPorSecao(f: FiltrosDoQuadro): Record<SecaoDeFiltro, number> {
  const e = enxugar(f);
  const presentes = (chaves: ReadonlyArray<keyof FiltrosDoQuadro>) => chaves.filter((k) => e[k] !== undefined).length;
  return {
    negocio: presentes(CHAVES_DA_SECAO.negocio),
    conversas: e.conversa ? Object.keys(e.conversa).length : 0,
    tags: e.tags ? 1 : 0,
    campos: e.campos?.length ?? 0,
    outros: presentes(CHAVES_DA_SECAO.outros),
  };
}

function semChaves(f: FiltrosDoQuadro, chaves: ReadonlyArray<keyof FiltrosDoQuadro>): FiltrosDoQuadro {
  const copia: Partial<FiltrosDoQuadro> = { ...f };
  for (const chave of chaves) delete copia[chave];
  return enxugar({ ...copia, status: f.status });
}

export const limparSecao = (f: FiltrosDoQuadro, secao: SecaoDeFiltro) => semChaves(f, CHAVES_DA_SECAO[secao]);

/** "Limpar filtros": tira os critérios e mantém status e ordenação, que têm controle próprio. */
export function limparCriterios(f: FiltrosDoQuadro): FiltrosDoQuadro {
  return enxugar({ status: f.status, ordem: f.ordem });
}

export function temCriterios(f: FiltrosDoQuadro): boolean {
  return Object.keys(enxugar(f)).some((k) => k !== "status" && k !== "ordem");
}

function canonico(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(canonico);
  if (valor && typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    return Object.fromEntries(Object.keys(objeto).sort().map((k) => [k, canonico(objeto[k])]));
  }
  return valor;
}

/**
 * Dois filtros dizem a mesma coisa? Sem olhar a ordem das chaves: o jsonb do
 * banco devolve as chaves numa ordem e a URL em outra.
 */
export function mesmosFiltros(a: FiltrosDoQuadro, b: FiltrosDoQuadro): boolean {
  return JSON.stringify(canonico(enxugar(a))) === JSON.stringify(canonico(enxugar(b)));
}

// ── O resumo (chips) com o painel fechado ──────────────────────────────────

export type ChaveDeCriterio =
  | "dono"
  | "criadoEm"
  | "valor"
  | "atrasados"
  | "motivoDePerda"
  | "categoriaDePerda"
  | "conversa"
  | "tags"
  | "campos"
  | "atividadesConcluidas"
  | "tempoNaEtapa"
  | "tempoDesdeEntrada";

/** Rótulos em português: a tela passa por `t()`. A ordem é a do chip na tela. */
const ROTULOS_DOS_CRITERIOS: Record<ChaveDeCriterio, string> = {
  dono: "Dono",
  criadoEm: "Data de criação",
  valor: "Valor",
  atrasados: "Apenas atrasados",
  motivoDePerda: "Motivo de perda",
  categoriaDePerda: "Categoria de perda",
  conversa: "Conversas",
  tags: "Tags",
  campos: "Campos",
  atividadesConcluidas: "Atividades concluídas",
  tempoNaEtapa: "Tempo na etapa",
  tempoDesdeEntrada: "Tempo desde a entrada",
};

export interface CriterioAtivo {
  id: ChaveDeCriterio;
  rotulo: string;
  /** Tags e campos dizem quantos ("2 tags"). */
  n?: number;
}

export function criteriosAtivos(f: FiltrosDoQuadro): CriterioAtivo[] {
  const e = enxugar(f);
  return (Object.keys(ROTULOS_DOS_CRITERIOS) as ChaveDeCriterio[])
    .filter((id) => e[id] !== undefined)
    .map((id) => ({
      id,
      rotulo: ROTULOS_DOS_CRITERIOS[id],
      ...(id === "tags" ? { n: e.tags?.length } : id === "campos" ? { n: e.campos?.length } : {}),
    }));
}

export const removerCriterio = (f: FiltrosDoQuadro, id: ChaveDeCriterio) =>
  semChaves(f, id === "tags" ? ["tags", "modoDasTags"] : [id]);
```

- [ ] **Step 6: A URL**

Create `lib/escale/filtros/url.ts`:

```ts
import type { z } from "zod";

import { filtersFromParams, filtersToParams, marcadoresDoFiltro, type LeadFilters } from "@/lib/kanban/filters";

import { STATUS_DO_NEGOCIO, ehStatusPadrao, enxugar, filtrosDoQuadroSchema, normalizarStatus, type FiltrosDoQuadro } from "./tipos";

/**
 * OS FILTROS DO QUADRO NA URL (fork Escale, Fase 1D) — o link do quadro com
 * filtro continua compartilhável e sobrevive ao F5.
 *
 * As chaves do original (`owner`, `tag`, `modo`, `q`, `overdue`, `motivo`,
 * `categoria`) continuam as mesmas, lidas e escritas pelas funções do original
 * (`lib/kanban/filters.ts`): um link antigo abre igual. O status vai em `st`
 * (lista: `st=open,won`; ausente = "Em aberto"), e um `status=` de link antigo
 * ainda vale quando não há `st`. O resto vai como JSON em `f`, validado pelo
 * schema: parâmetro colado à mão que não passa vira "sem filtro", nunca erro.
 * `fs` é o filtro salvo aplicado.
 */
export const PARAM_STATUS = "st";
export const PARAM_AVANCADOS = "f";
export const PARAM_FILTRO_SALVO = "fs";

type Busca = { get(chave: string): string | null; getAll?: (chave: string) => string[] };

const avancadosSchema = filtrosDoQuadroSchema.pick({
  criadoEm: true,
  valor: true,
  conversa: true,
  campos: true,
  atividadesConcluidas: true,
  tempoNaEtapa: true,
  tempoDesdeEntrada: true,
  ordem: true,
});
type Avancados = z.infer<typeof avancadosSchema>;
const CHAVES_AVANCADAS = Object.keys(avancadosSchema.shape) as Array<keyof Avancados>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function statusDaUrl(st: string | null, legado: string | null): FiltrosDoQuadro["status"] {
  if (st !== null) return normalizarStatus(st.split(","));
  if (legado === "all") return [...STATUS_DO_NEGOCIO];
  if (legado === "open" || legado === "won" || legado === "lost") return [legado];
  return normalizarStatus([]);
}

function avancadosDaUrl(bruto: string | null): Avancados {
  if (!bruto) return {};
  try {
    const lido = avancadosSchema.safeParse(JSON.parse(bruto));
    return lido.success ? lido.data : {};
  } catch {
    return {};
  }
}

export function filtrosDaUrl(sp: Busca): { filtros: FiltrosDoQuadro; filtroSalvoId: string | null } {
  const base = filtersFromParams(sp);
  const salvo = sp.get(PARAM_FILTRO_SALVO);
  return {
    filtros: enxugar({
      ...avancadosDaUrl(sp.get(PARAM_AVANCADOS)),
      status: statusDaUrl(sp.get(PARAM_STATUS), sp.get("status")),
      busca: base.search,
      dono: base.owner,
      tags: marcadoresDoFiltro(base.tag),
      modoDasTags: base.tagMode === "ou" ? "ou" : undefined,
      atrasados: base.overdueOnly ? true : undefined,
      motivoDePerda: base.lostReason,
      categoriaDePerda: base.lostCategory,
    }),
    filtroSalvoId: salvo && UUID.test(salvo) ? salvo : null,
  };
}

export function filtrosParaUrl(filtros: FiltrosDoQuadro, filtroSalvoId: string | null = null): string {
  const f = enxugar(filtros);
  // `status: "all"` faz o original NÃO escrever `status=`: o status do fork vai em `st`.
  const base: LeadFilters = {
    status: "all",
    owner: f.dono,
    tag: f.tags,
    tagMode: f.modoDasTags,
    search: f.busca,
    overdueOnly: f.atrasados,
    lostReason: f.motivoDePerda,
    lostCategory: f.categoriaDePerda,
  };
  const p = new URLSearchParams(filtersToParams(base));
  if (!ehStatusPadrao(f.status)) p.set(PARAM_STATUS, f.status.join(","));
  const avancados = Object.fromEntries(CHAVES_AVANCADAS.flatMap((k) => (f[k] === undefined ? [] : [[k, f[k]]])));
  if (Object.keys(avancados).length > 0) p.set(PARAM_AVANCADOS, JSON.stringify(avancados));
  if (filtroSalvoId) p.set(PARAM_FILTRO_SALVO, filtroSalvoId);
  return p.toString();
}
```

- [ ] **Step 7: O que a rota anexa ao negócio**

Create `lib/escale/filtros/dados-do-quadro.ts`:

```ts
import type { Lead } from "@/lib/types/leads";

/**
 * O QUE OS FILTROS DO QUADRO LEEM E O CARD NÃO TINHA (fork Escale, Fase 1D).
 *
 * A rota do quadro anexa isto a cada negócio (`filtros_escale`) numa etapa do
 * fork (`ler-dados-do-quadro.ts`). Não é coluna e não entra no tipo `Lead` do
 * original: quem lê usa `dadosDeFiltro(lead)`, e ausente (payload antigo, quadro
 * de teste) vale como "nada a dizer".
 *
 * PURO de propósito, como `anexarDadosDoContato`: a regra fica testável sem banco.
 */
export interface ConversaDoFiltro {
  /** `conversations.status` cru; "aberta/encerrada" é decisão de `aplicar.ts`. */
  status: string;
  canal: string;
  atendente_id: string | null;
  /** Última mensagem do cliente e última da equipe: "não respondida" compara as duas. */
  ultima_entrada: string | null;
  ultima_saida: string | null;
}

export interface DadosDeFiltroDoNegocio {
  atividades_concluidas: number;
  /** Nulo sem contato, com contato anonimizado (LGPD) ou sem nome. */
  contato_nome: string | null;
  /** A conversa MAIS RECENTE do contato: a mesma da capa (`withConversas`). */
  conversa: ConversaDoFiltro | null;
}

export type NegocioComFiltros = Lead & { filtros_escale?: DadosDeFiltroDoNegocio };

export function dadosDeFiltro(lead: Lead): DadosDeFiltroDoNegocio | undefined {
  return (lead as NegocioComFiltros).filtros_escale;
}

export interface LinhasDosFiltros {
  concluidas: ReadonlyArray<{ lead_id: string; total: number }>;
  contatos: ReadonlyArray<{ id: string; name: string | null; display_name: string | null; is_anonymized: boolean | null }>;
  conversas: ReadonlyArray<{
    contact_id: string;
    status: string;
    channel: string;
    assigned_to_user_id: string | null;
    last_inbound_at: string | null;
    last_outbound_at: string | null;
    last_message_at: string | null;
  }>;
}

const instante = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0);

export function anexarDadosDosFiltros(leads: readonly Lead[], linhas: LinhasDosFiltros): Lead[] {
  const concluidas = new Map(linhas.concluidas.map((c) => [c.lead_id, c.total]));
  const nomes = new Map(
    linhas.contatos.map((c) => [c.id, c.is_anonymized ? null : c.display_name?.trim() || c.name?.trim() || null]),
  );
  // A mais recente primeiro, sem data por último: a ordem de `withConversas`.
  const conversas = new Map<string, ConversaDoFiltro>();
  for (const c of [...linhas.conversas].sort((a, b) => instante(b.last_message_at) - instante(a.last_message_at))) {
    if (conversas.has(c.contact_id)) continue;
    conversas.set(c.contact_id, {
      status: c.status,
      canal: c.channel,
      atendente_id: c.assigned_to_user_id,
      ultima_entrada: c.last_inbound_at,
      ultima_saida: c.last_outbound_at,
    });
  }
  return leads.map(
    (lead): NegocioComFiltros => ({
      ...lead,
      filtros_escale: {
        atividades_concluidas: concluidas.get(lead.id) ?? 0,
        contato_nome: lead.contact_id ? (nomes.get(lead.contact_id) ?? null) : null,
        conversa: lead.contact_id ? (conversas.get(lead.contact_id) ?? null) : null,
      },
    }),
  );
}
```

- [ ] **Step 8: Rodar os testes e o typecheck**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-tipos-e-url.test.ts tests/unit/escale-dados-dos-filtros.test.ts
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
```
Expected: os 2 arquivos PASS. O typecheck fica sem erros novos; o único erro conhecido da base é o de `tests/unit/condicao-sim-nao-por-ramo.test.ts`, se a sincronização ainda não o corrigiu. Se o `pick` do Zod reclamar no `avancadosSchema`, confira a versão (`zod@4`): `.pick({ chave: true })` é a forma certa.

- [ ] **Step 9: Commit**

```bash
git add lib/escale/filtros/tipos.ts lib/escale/filtros/url.ts lib/escale/filtros/dados-do-quadro.ts tests/helpers/negocio-do-quadro.ts tests/unit/escale-filtros-tipos-e-url.test.ts tests/unit/escale-dados-dos-filtros.test.ts
git commit -m "feat(escale): forma dos filtros do quadro, URL e dados anexados ao negócio

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Campos filtráveis e aplicar os filtros

**Files:**
- Create: `lib/escale/filtros/campos.ts`, `lib/escale/filtros/aplicar.ts`, `tests/unit/escale-filtros-aplicar.test.ts`

**Interfaces:**
- Consumes:
  - da Task 3: `FiltrosDoQuadro`, `CondicaoDeCampo`, `OperadorDeCampo`, `AlvoDeCampo`, `enxugar`, `SEM_ATENDENTE`, `STATUS_DE_CONVERSA_ENCERRADA` e `dadosDeFiltro`;
  - do original: `camposDoFunil` (`@/lib/leads/campos-do-funil`), `CustomFieldDef` (`@/lib/schemas/settings`), `applyFilters`/`LeadFilters` (`@/lib/kanban/filters`), `categoriaDoMotivo` (`@/lib/leads/motivos-de-perda-do-funil`) e `BoardData`/`Stage` (`@/lib/kanban/types`).
- Produces:
  - **`campos.ts`**:
    - os tipos `TipoFiltravel` e `CampoFiltravel { alvo; chave; rotulo; tipo; opcoes? }`;
    - a constante `CAMPOS_DO_CONTATO`;
    - funções: `camposFiltraveis(settings[]): CampoFiltravel[]`, `chaveDoCampo({alvo, chave}): string`, `operadoresDoTipo(tipo)`, `condicaoNova(campo): CondicaoDeCampo`, `numeroDoValor(v): number | null` e `passaCondicao(lead, condicao, campo?): boolean`.
  - **`aplicar.ts`**:
    - o tipo `ContextoDoRecorte { moeda; campos; agora?; categoriaDo? }`;
    - funções: `aplicarFiltrosDoQuadro(leads, filtros, ctx): Lead[]`, `etapasVisiveis(stages, status): Stage[]`, `situacaoDaConversa(status): "aberta" | "encerrada"` e `recortarQuadro(quadro, filtros, ctx sem categoriaDo): { stages: Stage[]; leads: Lead[] }`.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Create `tests/unit/escale-filtros-aplicar.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { aplicarFiltrosDoQuadro, etapasVisiveis, recortarQuadro, type ContextoDoRecorte } from "@/lib/escale/filtros/aplicar";
import {
  camposFiltraveis,
  condicaoNova,
  numeroDoValor,
  operadoresDoTipo,
  passaCondicao,
  type CampoFiltravel,
} from "@/lib/escale/filtros/campos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import type { BoardData, Stage } from "@/lib/kanban/types";
import { categoriaDoMotivo } from "@/lib/leads/motivos-de-perda-do-funil";
import type { Lead } from "@/lib/types/leads";
import { AGORA, horasAtras, negocio } from "@/tests/helpers/negocio-do-quadro";

const SETTINGS = {
  fields: [
    { key: "cidade", label: "Cidade", type: "text" },
    { key: "plano", label: "Plano", type: "select", options: [{ value: "ouro", label: "Ouro" }, { value: "prata", label: "Prata" }] },
    { key: "interesses", label: "Interesses", type: "multiselect", options: [{ value: "a", label: "A" }] },
    { key: "renda", label: "Renda", type: "currency" },
    { key: "nascimento", label: "Nascimento", type: "date" },
    { key: "vip", label: "VIP", type: "boolean" },
  ],
};
const CAMPOS = camposFiltraveis([SETTINGS]);
const CTX: ContextoDoRecorte = { moeda: "BRL", campos: CAMPOS, agora: AGORA };
const campo = (chave: string): CampoFiltravel => CAMPOS.find((c) => c.chave === chave)!;
const aplicar = (leads: Lead[], f: Partial<FiltrosDoQuadro>) =>
  aplicarFiltrosDoQuadro(leads, { status: ["open", "won", "lost"], ...f }, CTX).map((l) => l.id);
const etapa = (id: string, over: Partial<Stage> = {}) =>
  ({ id, pipeline_id: "p-1", name: id, position: 1, is_won: false, is_lost: false, is_archived: false, color: null, ...over }) as Stage;

describe("campos filtráveis", () => {
  it("os do negócio vêm das origens (o primeiro com a chave vence) e os do contato vêm sempre", () => {
    const campos = camposFiltraveis([
      SETTINGS,
      { fields: [{ key: "cidade", label: "Município", type: "text" }, { key: "novo", label: "Novo", type: "number" }] },
      null,
    ]);
    expect(campos.map((c) => `${c.alvo}:${c.chave}:${c.tipo}`)).toEqual([
      "negocio:cidade:texto",
      "negocio:plano:opcao",
      "negocio:interesses:opcoes",
      "negocio:renda:numero",
      "negocio:nascimento:data",
      "negocio:vip:booleano",
      "negocio:novo:numero",
      "contato:nome:texto",
      "contato:email:texto",
      "contato:telefone:texto",
    ]);
    expect(campos[0]!.rotulo).toBe("Cidade");
  });

  it("cada tipo tem os seus operadores, e a condição nova nasce com o primeiro", () => {
    expect(operadoresDoTipo("booleano")).toEqual(["igual"]);
    expect(operadoresDoTipo("numero")).toEqual(["entre", "preenchido", "vazio"]);
    expect(condicaoNova(campo("vip"))).toEqual({ alvo: "negocio", chave: "vip", op: "igual", valor: "true" });
    expect(condicaoNova(campo("cidade"))).toEqual({ alvo: "negocio", chave: "cidade", op: "contem" });
  });

  it("lê número escrito como número ou como texto", () => {
    expect(numeroDoValor(12)).toBe(12);
    expect(numeroDoValor("1.500,00")).toBe(1500);
    expect(numeroDoValor("1500.5")).toBe(1500.5);
    expect(numeroDoValor("1.000")).toBe(1000);
    expect(numeroDoValor("R$ 10")).toBe(10);
    expect(numeroDoValor("abc")).toBeNull();
    expect(numeroDoValor("")).toBeNull();
    expect(numeroDoValor(true)).toBeNull();
  });
});

describe("passaCondicao", () => {
  const com = (custom_fields: Record<string, unknown>) => negocio("x", { custom_fields });

  it("texto: contém, sem olhar acento nem caixa; condição sem valor não restringe", () => {
    const lead = com({ cidade: "São Gonçalo" });
    expect(passaCondicao(lead, { alvo: "negocio", chave: "cidade", op: "contem", valor: "sao" }, campo("cidade"))).toBe(true);
    expect(passaCondicao(lead, { alvo: "negocio", chave: "cidade", op: "contem", valor: "rio" }, campo("cidade"))).toBe(false);
    expect(passaCondicao(lead, { alvo: "negocio", chave: "cidade", op: "contem", valor: " " }, campo("cidade"))).toBe(true);
  });

  it("opção: é igual a; várias opções: contém a escolhida", () => {
    expect(passaCondicao(com({ plano: "ouro" }), { alvo: "negocio", chave: "plano", op: "igual", valor: "ouro" }, campo("plano"))).toBe(true);
    expect(passaCondicao(com({ plano: "prata" }), { alvo: "negocio", chave: "plano", op: "igual", valor: "ouro" }, campo("plano"))).toBe(false);
    expect(
      passaCondicao(com({ interesses: ["a", "b"] }), { alvo: "negocio", chave: "interesses", op: "contem", valor: "a" }, campo("interesses")),
    ).toBe(true);
  });

  it("número e data: está entre, com valor escrito como texto; vazio não passa", () => {
    const entre = (valor: string, ate: string) => ({ alvo: "negocio" as const, chave: "renda", op: "entre" as const, valor, ate });
    expect(passaCondicao(com({ renda: "1.500,00" }), entre("1000", "2000"), campo("renda"))).toBe(true);
    expect(passaCondicao(com({ renda: "1.500,00" }), entre("1000", "1200"), campo("renda"))).toBe(false);
    expect(passaCondicao(com({}), entre("1000", ""), campo("renda"))).toBe(false);
    expect(
      passaCondicao(
        com({ nascimento: "1990-05-10" }),
        { alvo: "negocio", chave: "nascimento", op: "entre", valor: "1990-01-01", ate: "1990-12-31" },
        campo("nascimento"),
      ),
    ).toBe(true);
  });

  it("sim/não: 'não' vale também para o campo nunca preenchido", () => {
    const sim = { alvo: "negocio" as const, chave: "vip", op: "igual" as const, valor: "true" };
    const nao = { ...sim, valor: "false" };
    expect(passaCondicao(com({ vip: true }), sim, campo("vip"))).toBe(true);
    expect(passaCondicao(com({}), sim, campo("vip"))).toBe(false);
    expect(passaCondicao(com({}), nao, campo("vip"))).toBe(true);
    expect(passaCondicao(com({ vip: false }), nao, campo("vip"))).toBe(true);
  });

  it("preenchido e vazio", () => {
    expect(passaCondicao(com({ cidade: "Natal" }), { alvo: "negocio", chave: "cidade", op: "preenchido" }, campo("cidade"))).toBe(true);
    expect(passaCondicao(com({ cidade: "  " }), { alvo: "negocio", chave: "cidade", op: "vazio" }, campo("cidade"))).toBe(true);
  });

  it("os campos do contato leem o nome anexado pela rota e o e-mail da capa", () => {
    const lead = negocio("x", { contact_email: "ana@x.com" }, { contato_nome: "Ana Souza" });
    expect(passaCondicao(lead, { alvo: "contato", chave: "nome", op: "contem", valor: "souza" })).toBe(true);
    expect(passaCondicao(lead, { alvo: "contato", chave: "email", op: "preenchido" })).toBe(true);
    expect(passaCondicao(lead, { alvo: "contato", chave: "telefone", op: "vazio" })).toBe(true);
  });
});

describe("aplicar: status, busca, criação, valor e os filtros do original", () => {
  it("status com várias escolhas", () => {
    const leads = [negocio("aberto"), negocio("ganho", { status: "won" }), negocio("perdido", { status: "lost" })];
    expect(aplicar(leads, { status: ["open", "lost"] })).toEqual(["aberto", "perdido"]);
    expect(aplicar(leads, { status: ["won"] })).toEqual(["ganho"]);
  });

  it("a busca olha título, nome do contato (sem acento), e-mail e os dígitos do telefone", () => {
    const leads = [
      negocio("titulo", { title: "Proposta Acme" }),
      negocio("nome", {}, { contato_nome: "João Silva" }),
      negocio("email", { contact_email: "maria@empresa.com" }),
      negocio("fone", { contact_phone: "+55 (11) 98765-4321" }),
      negocio("nada"),
    ];
    expect(aplicar(leads, { busca: "acme" })).toEqual(["titulo"]);
    expect(aplicar(leads, { busca: "joao" })).toEqual(["nome"]);
    expect(aplicar(leads, { busca: "MARIA@" })).toEqual(["email"]);
    expect(aplicar(leads, { busca: "98765 4321" })).toEqual(["fone"]);
  });

  it("data de criação, de e até, no dia local", () => {
    const leads = [negocio("dia10", { created_at: "2026-10-10T15:00:00Z" }), negocio("dia12", { created_at: "2026-10-12T15:00:00Z" })];
    expect(aplicar(leads, { criadoEm: { de: "2026-10-11" } })).toEqual(["dia12"]);
    expect(aplicar(leads, { criadoEm: { ate: "2026-10-11" } })).toEqual(["dia10"]);
    expect(aplicar(leads, { criadoEm: { de: "2026-10-10", ate: "2026-10-12" } })).toEqual(["dia10", "dia12"]);
  });

  it("valor só compara na moeda da organização (negócio sem moeda é da organização)", () => {
    const leads = [
      negocio("pouco", { value_cents: 50000, currency: "BRL" }),
      negocio("muito", { value_cents: 200000, currency: "BRL" }),
      negocio("sem-moeda", { value_cents: 300000, currency: null }),
      negocio("euro", { value_cents: 500000, currency: "EUR" }),
    ];
    expect(aplicar(leads, { valor: { min: 100000 } })).toEqual(["muito", "sem-moeda"]);
    expect(aplicar(leads, { valor: { max: 100000 } })).toEqual(["pouco"]);
  });

  it("dono, tags e atrasados seguem as regras do original", () => {
    const leads = [
      negocio("da-ana", { owner_user_id: "u-ana", owner_kind: "user", tags: ["vip"] }),
      negocio("sem-dono", { contact_tags: ["vip"] }),
      negocio("atrasado", { expected_close_date: "2026-10-01" }),
    ];
    expect(aplicar(leads, { dono: "u-ana" })).toEqual(["da-ana"]);
    expect(aplicar(leads, { dono: "unassigned" })).toEqual(["sem-dono", "atrasado"]);
    expect(aplicar(leads, { tags: ["vip"] })).toEqual(["da-ana", "sem-dono"]);
    expect(aplicar(leads, { atrasados: true })).toEqual(["atrasado"]);
  });
});

describe("aplicar: conversa", () => {
  const SEM_CONTATO = negocio("sem-contato", {}, {});
  const SEM_CONVERSA = negocio("sem-conversa", { contact_id: "c2", conversa: null }, {});
  const WHATS = negocio(
    "whats",
    { contact_id: "c3", conversa: { id: "v3", preview: null, last_message_at: horasAtras(1), unread: 2 } },
    { conversa: { status: "open", canal: "whatsapp", atendente_id: "u-1", ultima_entrada: horasAtras(1), ultima_saida: horasAtras(3) } },
  );
  const INSTA = negocio(
    "insta",
    { contact_id: "c4", conversa: { id: "v4", preview: null, last_message_at: horasAtras(5), unread: 0 } },
    { conversa: { status: "resolved", canal: "instagram", atendente_id: null, ultima_entrada: horasAtras(6), ultima_saida: horasAtras(5) } },
  );
  const TODOS = [SEM_CONTATO, SEM_CONVERSA, WHATS, INSTA];

  it("com e sem conversa", () => {
    expect(aplicar(TODOS, { conversa: { existe: "sem" } })).toEqual(["sem-contato", "sem-conversa"]);
    expect(aplicar(TODOS, { conversa: { existe: "com" } })).toEqual(["whats", "insta"]);
  });

  it("não lidas e não respondidas pelo atendente", () => {
    expect(aplicar(TODOS, { conversa: { naoLidas: true } })).toEqual(["whats"]);
    expect(aplicar(TODOS, { conversa: { semResposta: true } })).toEqual(["whats"]);
  });

  it("status, canal e atendente (com 'não atribuídos')", () => {
    expect(aplicar(TODOS, { conversa: { situacao: ["encerrada"] } })).toEqual(["insta"]);
    expect(aplicar(TODOS, { conversa: { situacao: ["aberta"] } })).toEqual(["whats"]);
    expect(aplicar(TODOS, { conversa: { canais: ["instagram", "facebook"] } })).toEqual(["insta"]);
    expect(aplicar(TODOS, { conversa: { atendentes: ["nenhum"] } })).toEqual(["insta"]);
    expect(aplicar(TODOS, { conversa: { atendentes: ["u-1", "nenhum"] } })).toEqual(["whats", "insta"]);
  });
});

describe("aplicar: campos, atividades e tempo", () => {
  it("as condições de campo se somam (E)", () => {
    const leads = [
      negocio("natal-ouro", { custom_fields: { cidade: "Natal", plano: "ouro" } }),
      negocio("natal-prata", { custom_fields: { cidade: "Natal", plano: "prata" } }),
    ];
    expect(
      aplicar(leads, {
        campos: [
          { alvo: "negocio", chave: "cidade", op: "contem", valor: "natal" },
          { alvo: "negocio", chave: "plano", op: "igual", valor: "ouro" },
        ],
      }),
    ).toEqual(["natal-ouro"]);
  });

  it("atividades concluídas, mínimo e máximo; sem o dado conta como zero", () => {
    const leads = [
      negocio("zero", {}, { atividades_concluidas: 0 }),
      negocio("duas", {}, { atividades_concluidas: 2 }),
      negocio("cinco", {}, { atividades_concluidas: 5 }),
      negocio("sem-dado"),
    ];
    expect(aplicar(leads, { atividadesConcluidas: { min: 2, max: 3 } })).toEqual(["duas"]);
    expect(aplicar(leads, { atividadesConcluidas: { max: 0 } })).toEqual(["zero", "sem-dado"]);
  });

  it("tempo na etapa em dias inteiros e em horas; sem a data da etapa, conta da criação", () => {
    const leads = [
      negocio("50h", { stage_changed_at: horasAtras(50) }),
      negocio("47h", { stage_changed_at: horasAtras(47) }),
      negocio("9h", { stage_changed_at: horasAtras(9) }),
      negocio("sem-data", { stage_changed_at: null, created_at: horasAtras(30) }),
    ];
    expect(aplicar(leads, { tempoNaEtapa: { min: 2, unidade: "dias" } })).toEqual(["50h"]);
    expect(aplicar(leads, { tempoNaEtapa: { min: 1, max: 1, unidade: "dias" } })).toEqual(["47h", "sem-data"]);
    expect(aplicar(leads, { tempoNaEtapa: { max: 10, unidade: "horas" } })).toEqual(["9h"]);
  });

  it("tempo desde a entrada conta da criação", () => {
    const leads = [negocio("30h", { created_at: horasAtras(30) }), negocio("49h", { created_at: horasAtras(49) })];
    expect(aplicar(leads, { tempoDesdeEntrada: { max: 1, unidade: "dias" } })).toEqual(["30h"]);
  });
});

describe("colunas visíveis e o recorte do quadro", () => {
  const ETAPAS = [etapa("entrada"), etapa("ganho", { is_won: true }), etapa("perdido", { is_lost: true })];

  it("a coluna de ganho e a de perda só aparecem quando o status as pede", () => {
    expect(etapasVisiveis(ETAPAS, ["open"]).map((s) => s.id)).toEqual(["entrada"]);
    expect(etapasVisiveis(ETAPAS, ["open", "won"]).map((s) => s.id)).toEqual(["entrada", "ganho"]);
    expect(etapasVisiveis(ETAPAS, ["won", "lost"]).map((s) => s.id)).toEqual(["entrada", "ganho", "perdido"]);
  });

  it("o recorte devolve as colunas visíveis e só os cards delas, com a categoria de perda da origem", () => {
    const quadro = {
      pipeline: { id: "p-1", settings: {} },
      stages: ETAPAS,
      leads: [
        negocio("aberto", { stage_id: "entrada" }),
        negocio("perdido-preco", { stage_id: "perdido", status: "lost", lost_reason: "price" }),
        negocio("aberto-na-coluna-de-ganho", { stage_id: "ganho" }),
      ],
    } as unknown as BoardData;
    const ctx = { moeda: "BRL", campos: CAMPOS, agora: AGORA };
    const soAbertos = recortarQuadro(quadro, { status: ["open"] }, ctx);
    expect(soAbertos.stages.map((s) => s.id)).toEqual(["entrada"]);
    expect(soAbertos.leads.map((l) => l.id)).toEqual(["aberto"]);

    const categoria = categoriaDoMotivo("price", {})!;
    const perdas = recortarQuadro(quadro, { status: ["lost"], categoriaDePerda: categoria }, ctx);
    expect(perdas.leads.map((l) => l.id)).toEqual(["perdido-preco"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-aplicar.test.ts
```
Expected: FAIL com `Failed to resolve import "@/lib/escale/filtros/aplicar"`.

- [ ] **Step 3: Os campos filtráveis**

Create `lib/escale/filtros/campos.ts`:

```ts
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { CustomFieldDef } from "@/lib/schemas/settings";
import type { Lead } from "@/lib/types/leads";

import { dadosDeFiltro } from "./dados-do-quadro";
import type { AlvoDeCampo, CondicaoDeCampo, OperadorDeCampo } from "./tipos";

/**
 * OS CAMPOS QUE O FILTRO "CAMPOS" OFERECE (fork Escale, Fase 1D).
 *
 * Os do NEGÓCIO são os campos personalizados das origens (`settings.fields`):
 * numa visualização, a união das origens, e o primeiro com a chave vence. Os do
 * CONTATO são os fixos que todo negócio tem (nome, e-mail, telefone): os campos
 * personalizados do contato chegam com os grupos de campos (Fase 2, Contatos).
 */
export type TipoFiltravel = "texto" | "opcao" | "opcoes" | "booleano" | "numero" | "data";

export interface CampoFiltravel {
  alvo: AlvoDeCampo;
  chave: string;
  /** O dos campos do contato é texto de interface (passa por `t()`); o do negócio é dado. */
  rotulo: string;
  tipo: TipoFiltravel;
  opcoes?: ReadonlyArray<{ value: string; label: string }>;
}

const TIPO_DO_CAMPO: Record<CustomFieldDef["type"], TipoFiltravel> = {
  text: "texto",
  textarea: "texto",
  email: "texto",
  phone: "texto",
  url: "texto",
  select: "opcao",
  multiselect: "opcoes",
  boolean: "booleano",
  number: "numero",
  currency: "numero",
  date: "data",
};

export const CAMPOS_DO_CONTATO: readonly CampoFiltravel[] = [
  { alvo: "contato", chave: "nome", rotulo: "Nome do contato", tipo: "texto" },
  { alvo: "contato", chave: "email", rotulo: "E-mail do contato", tipo: "texto" },
  { alvo: "contato", chave: "telefone", rotulo: "Telefone do contato", tipo: "texto" },
];

export function camposFiltraveis(settings: ReadonlyArray<Record<string, unknown> | null | undefined>): CampoFiltravel[] {
  const doNegocio = new Map<string, CampoFiltravel>();
  for (const s of settings) {
    for (const def of camposDoFunil(s ?? null)) {
      if (doNegocio.has(def.key)) continue;
      doNegocio.set(def.key, {
        alvo: "negocio",
        chave: def.key,
        rotulo: def.label,
        tipo: TIPO_DO_CAMPO[def.type],
        ...(def.options?.length ? { opcoes: def.options } : {}),
      });
    }
  }
  return [...doNegocio.values(), ...CAMPOS_DO_CONTATO];
}

export const chaveDoCampo = (c: { alvo: AlvoDeCampo; chave: string }) => `${c.alvo}:${c.chave}`;

const OPERADORES: Record<TipoFiltravel, readonly OperadorDeCampo[]> = {
  texto: ["contem", "preenchido", "vazio"],
  opcao: ["igual", "preenchido", "vazio"],
  opcoes: ["contem", "preenchido", "vazio"],
  booleano: ["igual"],
  numero: ["entre", "preenchido", "vazio"],
  data: ["entre", "preenchido", "vazio"],
};

export const operadoresDoTipo = (tipo: TipoFiltravel) => OPERADORES[tipo];

export function condicaoNova(campo: CampoFiltravel): CondicaoDeCampo {
  return {
    alvo: campo.alvo,
    chave: campo.chave,
    op: OPERADORES[campo.tipo][0]!,
    ...(campo.tipo === "booleano" ? { valor: "true" } : {}),
  };
}

function valorDoCampo(lead: Lead, c: Pick<CondicaoDeCampo, "alvo" | "chave">): unknown {
  if (c.alvo === "negocio") return lead.custom_fields?.[c.chave];
  if (c.chave === "nome") return dadosDeFiltro(lead)?.contato_nome ?? null;
  if (c.chave === "email") return lead.contact_email ?? null;
  if (c.chave === "telefone") return lead.contact_phone ?? null;
  return null;
}

const vazio = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Número escrito como número ou como texto ("1.500,00", "1500.5", "R$ 10"). O
 * campo de moeda do negócio já foi gravado das duas formas, conforme a tela.
 */
export function numeroDoValor(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const limpo = v.replace(/[^\d,.-]/g, "");
  // "1.500,00" e "1.000" (milhar com ponto) são do jeito brasileiro; "1500.5" é decimal com ponto.
  const milharComPonto = !limpo.includes(",") && /^-?\d{1,3}(\.\d{3})+$/.test(limpo);
  const normal = limpo.includes(",") || milharComPonto ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  if (normal === "" || normal === "-") return null;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

/**
 * O negócio passa na condição? Condição incompleta (sem valor) não restringe:
 * a pessoa ainda está montando o filtro, e esconder tudo no meio do caminho
 * pareceria defeito.
 */
export function passaCondicao(lead: Lead, c: CondicaoDeCampo, campo?: CampoFiltravel): boolean {
  const v = valorDoCampo(lead, c);
  const tipo = campo?.tipo ?? "texto";
  if (c.op === "preenchido") return !vazio(v);
  if (c.op === "vazio") return vazio(v);
  if (c.op === "igual") {
    // "Não" vale também para o campo nunca preenchido.
    if (tipo === "booleano") return c.valor === "false" ? v !== true : v === true;
    if (!c.valor) return true;
    return !vazio(v) && String(v) === c.valor;
  }
  if (c.op === "contem") {
    const procurado = c.valor?.trim();
    if (!procurado) return true;
    if (vazio(v)) return false;
    if (Array.isArray(v)) return v.map(String).includes(procurado);
    return semAcento(String(v)).includes(semAcento(procurado));
  }
  if (!c.valor && !c.ate) return true;
  if (vazio(v)) return false;
  if (tipo === "data") {
    const dia = String(v).slice(0, 10);
    return (!c.valor || dia >= c.valor) && (!c.ate || dia <= c.ate);
  }
  const n = numeroDoValor(v);
  if (n === null) return false;
  const min = c.valor ? numeroDoValor(c.valor) : null;
  const max = c.ate ? numeroDoValor(c.ate) : null;
  return (min === null || n >= min) && (max === null || n <= max);
}
```

- [ ] **Step 4: Aplicar os filtros e recortar o quadro**

Create `lib/escale/filtros/aplicar.ts`:

```ts
import { applyFilters, type LeadFilters } from "@/lib/kanban/filters";
import type { BoardData, Stage } from "@/lib/kanban/types";
import { categoriaDoMotivo } from "@/lib/leads/motivos-de-perda-do-funil";
import type { Lead } from "@/lib/types/leads";

import { chaveDoCampo, passaCondicao, type CampoFiltravel } from "./campos";
import { dadosDeFiltro, type ConversaDoFiltro } from "./dados-do-quadro";
import {
  SEM_ATENDENTE,
  STATUS_DE_CONVERSA_ENCERRADA,
  enxugar,
  type FiltroDeConversa,
  type FiltrosDoQuadro,
  type Intervalo,
  type IntervaloDeTempo,
  type StatusDoNegocio,
} from "./tipos";

/**
 * APLICAR OS FILTROS DO QUADRO (fork Escale, Fase 1D).
 *
 * O que o original já filtra (dono, tags com E/OU nas três caixas, atrasados,
 * motivo e categoria de perda, valor na moeda da organização) continua com as
 * regras DELE (`applyFilters`): filtrar por uma régua e mostrar por outra é o
 * defeito que o filtro de marcador já teve. O fork acrescenta o resto: status
 * com várias escolhas, a busca que também olha o contato, data de criação,
 * conversa, campos, atividades e tempo.
 */
export interface ContextoDoRecorte {
  /** A moeda da organização: o filtro de valor só compara negócios nela (#1531). */
  moeda: string | null;
  campos: readonly CampoFiltravel[];
  agora?: Date;
  /** A categoria de um motivo de perda, na régua da origem do card (#1537). */
  categoriaDo?: (motivo: string) => string | undefined;
}

const HORA_MS = 3_600_000;
const HORAS_POR_UNIDADE = { horas: 1, dias: 24 } as const;

function paraLeadFilters(f: FiltrosDoQuadro, moeda: string | null): LeadFilters {
  return {
    status: "all",
    owner: f.dono,
    tag: f.tags,
    tagMode: f.modoDasTags,
    overdueOnly: f.atrasados,
    lostReason: f.motivoDePerda,
    lostCategory: f.categoriaDePerda,
    valueCentsMin: f.valor?.min ?? null,
    valueCentsMax: f.valor?.max ?? null,
    valueCurrency: moeda,
  };
}

const normalizar = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

function passaBusca(l: Lead, busca: string): boolean {
  if (!busca) return true;
  const texto = [l.title, l.description, dadosDeFiltro(l)?.contato_nome, l.contact_email, l.contact_phone]
    .filter(Boolean)
    .join(" ");
  if (normalizar(texto).includes(busca)) return true;
  // Telefone se digita de qualquer jeito: com 4 dígitos ou mais, compara só os dígitos.
  const digitos = busca.replace(/\D/g, "");
  return digitos.length >= 4 && (l.contact_phone ?? "").replace(/\D/g, "").includes(digitos);
}

/** O dia LOCAL (fuso de quem olha) de um instante ISO, como `YYYY-MM-DD`. */
function diaLocal(iso: string): string {
  const d = new Date(iso);
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

const dentro = (n: number, i: Intervalo | undefined) =>
  !i || ((i.min === undefined || n >= i.min) && (i.max === undefined || n <= i.max));

/** Unidades INTEIRAS desde `desde` ("2 dias na etapa" = de 48h a 71h59). */
function passaTempo(desde: string | null, i: IntervaloDeTempo | undefined, agora: Date): boolean {
  if (!i) return true;
  const inicio = desde ? Date.parse(desde) : Number.NaN;
  if (Number.isNaN(inicio)) return false;
  return dentro(Math.floor((agora.getTime() - inicio) / HORA_MS / HORAS_POR_UNIDADE[i.unidade]), i);
}

export function situacaoDaConversa(status: string): "aberta" | "encerrada" {
  return STATUS_DE_CONVERSA_ENCERRADA.includes(status) ? "encerrada" : "aberta";
}

/** A última mensagem é do cliente: a equipe ainda não respondeu. */
function aguardandoResposta(c: ConversaDoFiltro): boolean {
  const entrada = c.ultima_entrada ? Date.parse(c.ultima_entrada) : Number.NaN;
  if (Number.isNaN(entrada)) return false;
  const saida = c.ultima_saida ? Date.parse(c.ultima_saida) : Number.NaN;
  return Number.isNaN(saida) || entrada > saida;
}

function passaConversa(l: Lead, c: FiltroDeConversa | undefined): boolean {
  if (!c) return true;
  const extra = dadosDeFiltro(l)?.conversa ?? null;
  const tem = Boolean(l.conversa) || extra !== null;
  if (c.existe === "sem") return !tem;
  // Qualquer outro critério de conversa (o filtro chega enxuto) pede uma conversa.
  if (!tem) return false;
  if (c.naoLidas && !((l.conversa?.unread ?? 0) > 0)) return false;
  if (c.semResposta && !(extra && aguardandoResposta(extra))) return false;
  if (c.situacao && !(extra && c.situacao.includes(situacaoDaConversa(extra.status)))) return false;
  if (c.canais && !(extra && (c.canais as readonly string[]).includes(extra.canal))) return false;
  if (c.atendentes && !c.atendentes.includes(extra?.atendente_id ?? SEM_ATENDENTE)) return false;
  return true;
}

export function aplicarFiltrosDoQuadro(leads: readonly Lead[], filtros: FiltrosDoQuadro, ctx: ContextoDoRecorte): Lead[] {
  const f = enxugar(filtros);
  const agora = ctx.agora ?? new Date();
  const status = new Set<string>(f.status);
  const busca = normalizar(f.busca ?? "");
  const campos = new Map(ctx.campos.map((c) => [chaveDoCampo(c), c]));
  const criadoEm = f.criadoEm;
  return applyFilters([...leads], paraLeadFilters(f, ctx.moeda), { categoriaDo: ctx.categoriaDo }).filter((l) => {
    if (!status.has(l.status)) return false;
    if (!passaBusca(l, busca)) return false;
    if (criadoEm) {
      const dia = diaLocal(l.created_at);
      if ((criadoEm.de && dia < criadoEm.de) || (criadoEm.ate && dia > criadoEm.ate)) return false;
    }
    if (!passaConversa(l, f.conversa)) return false;
    if (!(f.campos ?? []).every((c) => passaCondicao(l, c, campos.get(chaveDoCampo(c))))) return false;
    if (!dentro(dadosDeFiltro(l)?.atividades_concluidas ?? 0, f.atividadesConcluidas)) return false;
    if (!passaTempo(l.stage_changed_at ?? l.created_at, f.tempoNaEtapa, agora)) return false;
    return passaTempo(l.created_at, f.tempoDesdeEntrada, agora);
  });
}

/**
 * As colunas que o quadro mostra: a de ganho só quando o status pede ganhos; a
 * de perda, só quando pede perdidos (decisão de 15/10, caminho A).
 */
export function etapasVisiveis(stages: readonly Stage[], status: readonly StatusDoNegocio[]): Stage[] {
  return stages.filter((s) => (!s.is_won || status.includes("won")) && (!s.is_lost || status.includes("lost")));
}

/** O quadro de UMA origem como a tela mostra: colunas visíveis e os cards filtrados delas. */
export function recortarQuadro(
  quadro: Pick<BoardData, "pipeline" | "stages" | "leads">,
  filtros: FiltrosDoQuadro,
  ctx: Omit<ContextoDoRecorte, "categoriaDo">,
): { stages: Stage[]; leads: Lead[] } {
  const stages = etapasVisiveis(quadro.stages, enxugar(filtros).status);
  const visiveis = new Set(stages.map((s) => s.id));
  const leads = aplicarFiltrosDoQuadro(quadro.leads, filtros, {
    ...ctx,
    categoriaDo: (motivo) => categoriaDoMotivo(motivo, quadro.pipeline.settings),
  }).filter((l) => visiveis.has(l.stage_id));
  return { stages, leads };
}
```

- [ ] **Step 5: Rodar os testes**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-aplicar.test.ts tests/unit/escale-filtros-tipos-e-url.test.ts tests/unit/escale-dados-dos-filtros.test.ts
```
Expected: os 3 arquivos PASS. Se o caso "dono, tags e atrasados" falhar no `atrasados`, confira em `applyFilters` (`lib/kanban/filters.ts`) a régua de "atrasado". Ela compara `expected_close_date` com HOJE do relógio da máquina: `2026-10-01` só está no passado se o relógio já passou de 01/10/2026. Se o relógio estiver antes disso, troque a data do teste por `2020-01-01`.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/filtros/campos.ts lib/escale/filtros/aplicar.ts tests/unit/escale-filtros-aplicar.test.ts
git commit -m "feat(escale): aplicar os filtros do quadro (status, conversa, campos, atividades, tempo)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: A ordenação

**Files:**
- Create: `lib/escale/filtros/ordenar.ts`, `tests/unit/escale-filtros-ordenar.test.ts`

**Interfaces:**
- Consumes: `CampoFiltravel` e `numeroDoValor` (Task 4), `dadosDeFiltro` (Task 3), `CriterioDeOrdem` e `PREFIXO_DE_CAMPO` (Task 3), e `midpoint` (`@/lib/kanban/fractional-indexing`).
- Produces:
  - tipos: `GrupoDeOrdem`, `TipoDeOrdem` e `OpcaoDeOrdem { campo; rotulo; grupo; tipo }`;
  - a constante `GRUPOS_DE_ORDEM`;
  - funções:
    - `opcoesDeOrdem(campos): OpcaoDeOrdem[]`;
    - `rotulosDaDirecao(tipo): { asc: string; desc: string }`;
    - `comparadorDaOrdem(ordem, campos?, agora?): ((a: Lead, b: Lead) => number) | undefined`;
    - `posicaoNoFimDaEtapa(leads, stageId, ignorarId): number`.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Create `tests/unit/escale-filtros-ordenar.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { comparadorDaOrdem, opcoesDeOrdem, posicaoNoFimDaEtapa, rotulosDaDirecao } from "@/lib/escale/filtros/ordenar";
import type { CriterioDeOrdem } from "@/lib/escale/filtros/tipos";
import type { Lead } from "@/lib/types/leads";
import { AGORA, horasAtras, negocio } from "@/tests/helpers/negocio-do-quadro";

const CAMPOS = camposFiltraveis([
  {
    fields: [
      { key: "renda", label: "Renda", type: "currency" },
      { key: "interesses", label: "Interesses", type: "multiselect" },
      { key: "cidade", label: "Cidade", type: "text" },
    ],
  },
]);
const ordenar = (leads: Lead[], ordem: CriterioDeOrdem[]) => [...leads].sort(comparadorDaOrdem(ordem, CAMPOS, AGORA)!).map((l) => l.id);

describe("opções de ordenação", () => {
  it("as fixas da Clint e os campos do negócio que dá para ordenar (várias opções não dá)", () => {
    const opcoes = opcoesDeOrdem(CAMPOS);
    expect(opcoes[0]).toEqual({ campo: "contato.nome", rotulo: "Nome do contato", grupo: "contato", tipo: "texto" });
    expect(opcoes.filter((o) => o.grupo === "campos").map((o) => [o.campo, o.tipo])).toEqual([
      ["campo:renda", "numero"],
      ["campo:cidade", "texto"],
    ]);
  });

  it("a direção fala a língua do tipo", () => {
    expect(rotulosDaDirecao("texto")).toEqual({ asc: "Alfabético de A a Z", desc: "Alfabético de Z a A" });
    expect(rotulosDaDirecao("tempo")).toEqual({ asc: "Menor tempo na etapa", desc: "Maior tempo na etapa" });
    expect(rotulosDaDirecao("numero")).toEqual({ asc: "Crescente", desc: "Decrescente" });
  });
});

describe("comparadorDaOrdem", () => {
  it("sem critério não há comparador: vale a ordem manual", () => {
    expect(comparadorDaOrdem(undefined)).toBeUndefined();
    expect(comparadorDaOrdem([])).toBeUndefined();
  });

  it("valor nas duas direções: vazio sempre no fim, e o empate cai na posição manual", () => {
    const leads = [
      negocio("a", { value_cents: 100, position_in_stage: 1000 }),
      negocio("b", { value_cents: null, position_in_stage: 500 }),
      negocio("c", { value_cents: 300, position_in_stage: 2000 }),
      negocio("d", { value_cents: 100, position_in_stage: 500 }),
    ];
    expect(ordenar(leads, [{ campo: "negocio.valor", direcao: "desc" }])).toEqual(["c", "d", "a", "b"]);
    expect(ordenar(leads, [{ campo: "negocio.valor", direcao: "asc" }])).toEqual(["d", "a", "c", "b"]);
  });

  it("nome do contato de A a Z, respeitando acento e caixa", () => {
    const leads = [
      negocio("bruno", {}, { contato_nome: "Bruno" }),
      negocio("agata", {}, { contato_nome: "Ágata" }),
      negocio("carla", {}, { contato_nome: "carla" }),
    ];
    expect(ordenar(leads, [{ campo: "contato.nome", direcao: "asc" }])).toEqual(["agata", "bruno", "carla"]);
  });

  it("o segundo critério desempata o primeiro", () => {
    const leads = [
      negocio("b", { value_cents: 100, title: "Beta" }),
      negocio("a", { value_cents: 100, title: "Alfa" }),
      negocio("z", { value_cents: 50, title: "Zeta" }),
    ];
    expect(
      ordenar(leads, [
        { campo: "negocio.valor", direcao: "desc" },
        { campo: "negocio.titulo", direcao: "asc" },
      ]),
    ).toEqual(["a", "b", "z"]);
  });

  it("maior tempo na etapa primeiro; sem a data da etapa, conta da criação", () => {
    const leads = [
      negocio("10h", { stage_changed_at: horasAtras(10) }),
      negocio("50h", { stage_changed_at: horasAtras(50) }),
      negocio("criado-20h", { stage_changed_at: null, created_at: horasAtras(20) }),
    ];
    expect(ordenar(leads, [{ campo: "negocio.tempo_na_etapa", direcao: "desc" }])).toEqual(["50h", "criado-20h", "10h"]);
  });

  it("campo personalizado de moeda gravado como texto ordena como número", () => {
    const leads = [
      negocio("mil-e-quinhentos", { custom_fields: { renda: "1.500,00" } }),
      negocio("duzentos", { custom_fields: { renda: "200" } }),
      negocio("novecentos", { custom_fields: { renda: 900 } }),
    ];
    expect(ordenar(leads, [{ campo: "campo:renda", direcao: "asc" }])).toEqual(["duzentos", "novecentos", "mil-e-quinhentos"]);
  });

  it("atividades concluídas e mensagens não lidas", () => {
    const leads = [
      negocio("uma", { conversa: { id: "v1", preview: null, last_message_at: null, unread: 5 } }, { atividades_concluidas: 1 }),
      negocio("tres", { conversa: { id: "v2", preview: null, last_message_at: null, unread: 0 } }, { atividades_concluidas: 3 }),
    ];
    expect(ordenar(leads, [{ campo: "atividades.concluidas", direcao: "desc" }])).toEqual(["tres", "uma"]);
    expect(ordenar(leads, [{ campo: "atendimento.nao_lidas", direcao: "desc" }])).toEqual(["uma", "tres"]);
  });
});

describe("posicaoNoFimDaEtapa", () => {
  const leads = [
    negocio("x", { stage_id: "s1", position_in_stage: 3000 }),
    negocio("y", { stage_id: "s1", position_in_stage: 1000 }),
    negocio("z", { stage_id: "s2", position_in_stage: 9000 }),
  ];

  it("depois do último card da etapa inteira", () => {
    expect(posicaoNoFimDaEtapa(leads, "s1", "novo")).toBe(4000);
  });

  it("sem contar o próprio card que está sendo movido", () => {
    expect(posicaoNoFimDaEtapa(leads, "s1", "x")).toBe(2000);
  });

  it("etapa vazia: a primeira posição", () => {
    expect(posicaoNoFimDaEtapa(leads, "s3", "x")).toBe(1000);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-ordenar.test.ts
```
Expected: FAIL com `Failed to resolve import "@/lib/escale/filtros/ordenar"`.

- [ ] **Step 3: Implementar**

Create `lib/escale/filtros/ordenar.ts`:

```ts
import { midpoint } from "@/lib/kanban/fractional-indexing";
import type { Lead } from "@/lib/types/leads";

import { numeroDoValor, type CampoFiltravel } from "./campos";
import { dadosDeFiltro } from "./dados-do-quadro";
import { PREFIXO_DE_CAMPO, type CriterioDeOrdem } from "./tipos";

/**
 * ORDENAR OS CARDS DO QUADRO (fork Escale, Fase 1D) — o "Ordenar por" da Clint:
 * um ou mais critérios, e a ordem das linhas define a prioridade. Com ordenação
 * ativa, a posição manual (`position_in_stage`) só desempata; arrastar dentro
 * da coluna deixa de fazer sentido e é desligado (ver `KanbanBoard`).
 *
 * Empresa (grupo da Clint) chega com o módulo Empresas, na Fase 2.
 */
export type GrupoDeOrdem = "contato" | "negocio" | "campos" | "atividades" | "atendimento";
export type TipoDeOrdem = "texto" | "numero" | "data" | "tempo";

export interface OpcaoDeOrdem {
  campo: string;
  /** Texto de interface nas fixas (passa por `t()`); nos campos personalizados, é dado. */
  rotulo: string;
  grupo: GrupoDeOrdem;
  tipo: TipoDeOrdem;
}

export const GRUPOS_DE_ORDEM: ReadonlyArray<{ grupo: GrupoDeOrdem; rotulo: string }> = [
  { grupo: "contato", rotulo: "Contato" },
  { grupo: "negocio", rotulo: "Negócio" },
  { grupo: "campos", rotulo: "Campos personalizados" },
  { grupo: "atividades", rotulo: "Atividades" },
  { grupo: "atendimento", rotulo: "Atendimento" },
];

const FIXAS: readonly OpcaoDeOrdem[] = [
  { campo: "contato.nome", rotulo: "Nome do contato", grupo: "contato", tipo: "texto" },
  { campo: "negocio.titulo", rotulo: "Título do negócio", grupo: "negocio", tipo: "texto" },
  { campo: "negocio.criado", rotulo: "Data de criação", grupo: "negocio", tipo: "data" },
  { campo: "negocio.atualizado", rotulo: "Última atualização", grupo: "negocio", tipo: "data" },
  { campo: "negocio.valor", rotulo: "Valor do negócio", grupo: "negocio", tipo: "numero" },
  { campo: "negocio.previsao", rotulo: "Previsão de fechamento", grupo: "negocio", tipo: "data" },
  { campo: "negocio.ganho", rotulo: "Data de ganho", grupo: "negocio", tipo: "data" },
  { campo: "negocio.perdido", rotulo: "Data de perdido", grupo: "negocio", tipo: "data" },
  { campo: "negocio.tempo_na_etapa", rotulo: "Tempo na etapa", grupo: "negocio", tipo: "tempo" },
  { campo: "atividades.concluidas", rotulo: "Atividades concluídas", grupo: "atividades", tipo: "numero" },
  { campo: "atividades.abertas", rotulo: "Atividades em aberto", grupo: "atividades", tipo: "numero" },
  { campo: "atendimento.ultima_mensagem", rotulo: "Última mensagem", grupo: "atendimento", tipo: "data" },
  { campo: "atendimento.nao_lidas", rotulo: "Mensagens não lidas", grupo: "atendimento", tipo: "numero" },
];

export function opcoesDeOrdem(campos: readonly CampoFiltravel[]): OpcaoDeOrdem[] {
  const personalizados = campos
    .filter((c) => c.alvo === "negocio" && c.tipo !== "opcoes")
    .map(
      (c): OpcaoDeOrdem => ({
        campo: `${PREFIXO_DE_CAMPO}${c.chave}`,
        rotulo: c.rotulo,
        grupo: "campos",
        tipo: c.tipo === "numero" ? "numero" : c.tipo === "data" ? "data" : "texto",
      }),
    );
  return [...FIXAS, ...personalizados];
}

const DIRECOES: Record<TipoDeOrdem, { asc: string; desc: string }> = {
  texto: { asc: "Alfabético de A a Z", desc: "Alfabético de Z a A" },
  tempo: { asc: "Menor tempo na etapa", desc: "Maior tempo na etapa" },
  numero: { asc: "Crescente", desc: "Decrescente" },
  data: { asc: "Crescente", desc: "Decrescente" },
};

export const rotulosDaDirecao = (tipo: TipoDeOrdem) => DIRECOES[tipo];

function ms(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const n = Date.parse(iso);
  return Number.isNaN(n) ? null : n;
}

function valorDeOrdem(lead: Lead, campo: string, agora: number, numericos: ReadonlySet<string>): string | number | null {
  switch (campo) {
    case "contato.nome":
      return dadosDeFiltro(lead)?.contato_nome ?? null;
    case "negocio.titulo":
      return lead.title?.trim() || null;
    case "negocio.criado":
      return ms(lead.created_at);
    case "negocio.atualizado":
      return ms(lead.updated_at);
    case "negocio.valor":
      return lead.value_cents ?? null;
    case "negocio.previsao":
      return ms(lead.expected_close_date);
    case "negocio.ganho":
      return lead.status === "won" ? ms(lead.closed_at) : null;
    case "negocio.perdido":
      return lead.status === "lost" ? ms(lead.closed_at) : null;
    case "negocio.tempo_na_etapa": {
      const desde = ms(lead.stage_changed_at) ?? ms(lead.created_at);
      return desde === null ? null : agora - desde;
    }
    case "atividades.concluidas":
      return dadosDeFiltro(lead)?.atividades_concluidas ?? 0;
    case "atividades.abertas":
      return lead.tarefas?.abertas ?? 0;
    case "atendimento.ultima_mensagem":
      return ms(lead.conversa?.last_message_at);
    case "atendimento.nao_lidas":
      return lead.conversa?.unread ?? 0;
  }
  if (!campo.startsWith(PREFIXO_DE_CAMPO)) return null;
  const chave = campo.slice(PREFIXO_DE_CAMPO.length);
  const bruto = lead.custom_fields?.[chave];
  if (bruto === null || bruto === undefined || bruto === "") return null;
  if (numericos.has(chave)) return numeroDoValor(bruto);
  if (typeof bruto === "number") return bruto;
  if (typeof bruto === "boolean") return bruto ? 1 : 0;
  return String(bruto);
}

export function comparadorDaOrdem(
  ordem: readonly CriterioDeOrdem[] | undefined,
  campos: readonly CampoFiltravel[] = [],
  agora: Date = new Date(),
): ((a: Lead, b: Lead) => number) | undefined {
  if (!ordem || ordem.length === 0) return undefined;
  const numericos = new Set(campos.filter((c) => c.alvo === "negocio" && c.tipo === "numero").map((c) => c.chave));
  const instante = agora.getTime();
  return (a, b) => {
    for (const { campo, direcao } of ordem) {
      const va = valorDeOrdem(a, campo, instante, numericos);
      const vb = valorDeOrdem(b, campo, instante, numericos);
      if (va === vb) continue;
      // Vazio fica no fim nas DUAS direções: "sem valor" não é o menor valor.
      if (va === null) return 1;
      if (vb === null) return -1;
      const r =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR", { sensitivity: "base", numeric: true });
      if (r !== 0) return direcao === "asc" ? r : -r;
    }
    return a.position_in_stage - b.position_in_stage;
  };
}

/**
 * Com ordenação ativa, soltar o card em outra etapa o põe DEPOIS do último card
 * da etapa INTEIRA (sem filtro), como na Clint: o lugar na coluna é o da
 * ordenação, não o do ponteiro.
 */
export function posicaoNoFimDaEtapa(
  leads: ReadonlyArray<Pick<Lead, "id" | "stage_id" | "position_in_stage">>,
  stageId: string,
  ignorarId: string,
): number {
  let maior: number | null = null;
  for (const l of leads) {
    if (l.stage_id !== stageId || l.id === ignorarId) continue;
    if (maior === null || l.position_in_stage > maior) maior = l.position_in_stage;
  }
  return midpoint(maior, null);
}
```

- [ ] **Step 4: Rodar os testes**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-ordenar.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/escale/filtros/ordenar.ts tests/unit/escale-filtros-ordenar.test.ts
git commit -m "feat(escale): ordenação dos cards do quadro por até 3 critérios

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: A rota do quadro anexa o que os filtros leem

**Files:**
- Create: `lib/escale/filtros/ler-dados-do-quadro.ts`, `tests/unit/escale-dados-dos-filtros-na-rota.test.ts`
- Modify: `app/api/v1/pipelines/[id]/board/route.ts` (1 import e 1 etapa entre `withTarefas` e `withConversas`)

**Interfaces:**
- Consumes: `anexarDadosDosFiltros`, `LinhasDosFiltros` e `dadosDeFiltro` (Task 3); `buscaEmLotes` (`@/lib/supabase/em-lotes`); a função `fn_escale_atividades_concluidas` (Task 1).
- Produces: `comDadosDosFiltros(supabase, orgId: string, leads: Lead[]): Promise<{ leads: Lead[]; error: string | null }>`. Todo negócio da resposta de `GET /api/v1/pipelines/:id/board` passa a ter `filtros_escale`.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Create `tests/unit/escale-dados-dos-filtros-na-rota.test.ts`:

```ts
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import { comDadosDosFiltros } from "@/lib/escale/filtros/ler-dados-do-quadro";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

type Resposta = { data: unknown[] | null; error: { message: string } | null };

/** Um cliente mínimo: registra cada leitura (tabela e filtros) e responde o que a tabela tem. */
function clienteFalso(tabelas: Record<string, unknown[]>, rpc: Resposta) {
  const chamadas: Array<{ alvo: string; filtros: Array<[string, unknown]> }> = [];
  const from = (alvo: string) => {
    const registro = { alvo, filtros: [] as Array<[string, unknown]> };
    chamadas.push(registro);
    const b = {
      select: () => b,
      eq: (coluna: string, valor: unknown) => {
        registro.filtros.push([coluna, valor]);
        return b;
      },
      in: (coluna: string, valor: unknown) => {
        registro.filtros.push([coluna, valor]);
        return b;
      },
      order: () => b,
      then: (ok: (r: Resposta) => unknown, falha?: (e: unknown) => unknown) =>
        Promise.resolve({ data: tabelas[alvo] ?? [], error: null }).then(ok, falha),
    };
    return b;
  };
  const rpcFn = (nome: string, args: Record<string, unknown>) => {
    chamadas.push({ alvo: `rpc:${nome}`, filtros: Object.entries(args) });
    return Promise.resolve(rpc);
  };
  return { client: { from, rpc: rpcFn } as never, chamadas };
}

describe("comDadosDosFiltros", () => {
  it("conta pela função do banco e lê nome e conversa, sempre pela organização do funil", async () => {
    const { client, chamadas } = clienteFalso(
      {
        contacts: [{ id: "c1", name: "Ana", display_name: null, is_anonymized: false }],
        conversations: [
          {
            contact_id: "c1",
            status: "open",
            channel: "whatsapp",
            assigned_to_user_id: null,
            last_inbound_at: null,
            last_outbound_at: null,
            last_message_at: "2026-10-14T10:00:00Z",
          },
        ],
      },
      { data: [{ lead_id: "a", total: 2 }], error: null },
    );
    const r = await comDadosDosFiltros(client, "org-1", [negocio("a", { contact_id: "c1" }), negocio("b")]);
    expect(r.error).toBeNull();
    expect(dadosDeFiltro(r.leads[0]!)).toEqual({
      atividades_concluidas: 2,
      contato_nome: "Ana",
      conversa: { status: "open", canal: "whatsapp", atendente_id: null, ultima_entrada: null, ultima_saida: null },
    });
    expect(dadosDeFiltro(r.leads[1]!)?.atividades_concluidas).toBe(0);
    expect(chamadas.find((c) => c.alvo === "rpc:fn_escale_atividades_concluidas")?.filtros).toEqual([
      ["p_org", "org-1"],
      ["p_leads", ["a", "b"]],
    ]);
    expect(chamadas.find((c) => c.alvo === "contacts")?.filtros).toEqual([
      ["organization_id", "org-1"],
      ["id", ["c1"]],
    ]);
    expect(chamadas.find((c) => c.alvo === "conversations")?.filtros).toEqual([
      ["organization_id", "org-1"],
      ["contact_id", ["c1"]],
    ]);
  });

  it("erro do banco sobe com a mensagem, e os negócios voltam como vieram", async () => {
    const { client } = clienteFalso({}, { data: null, error: { message: "boom" } });
    const r = await comDadosDosFiltros(client, "org-1", [negocio("a")]);
    expect(r.error).toBe("boom");
    expect(dadosDeFiltro(r.leads[0]!)).toBeUndefined();
  });

  it("quadro vazio não consulta nada; sem contato, só a contagem", async () => {
    const vazio = clienteFalso({}, { data: [], error: null });
    expect((await comDadosDosFiltros(vazio.client, "org-1", [])).leads).toEqual([]);
    expect(vazio.chamadas).toEqual([]);

    const semContato = clienteFalso({}, { data: [], error: null });
    await comDadosDosFiltros(semContato.client, "org-1", [negocio("a")]);
    expect(semContato.chamadas.map((c) => c.alvo)).toEqual(["rpc:fn_escale_atividades_concluidas"]);
  });
});

describe("a fiação na rota do quadro", () => {
  const rota = readFileSync("app/api/v1/pipelines/[id]/board/route.ts", "utf8");

  it("chama comDadosDosFiltros com o resultado das tarefas e entrega o dela às conversas", () => {
    expect(rota).toMatch(/leadsComFiltros\s*=\s*await comDadosDosFiltros\(\s*supabase,[\s\S]*?leadsComTarefas\.leads/);
    expect(rota).toMatch(/if \(leadsComFiltros\.error\)/);
    expect(rota).toMatch(/withConversas\(\s*supabase,[\s\S]*?leadsComFiltros\.leads/);
  });

  it("a cadeia que as cercas do quadro vigiam continua: conversas → marcadores → resposta", () => {
    expect(rota).toMatch(/leadsComConversa\s*=\s*await withConversas/);
    expect(rota).toMatch(/withMarcadoresDoContato\(\s*supabase,[\s\S]*?leadsComConversa\.leads/);
    expect(rota).toMatch(/leads:\s*leadsComMarcadores\.leads/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-dados-dos-filtros-na-rota.test.ts
```
Expected: FAIL com `Failed to resolve import "@/lib/escale/filtros/ler-dados-do-quadro"`.

- [ ] **Step 3: A leitura no servidor**

Create `lib/escale/filtros/ler-dados-do-quadro.ts`:

```ts
import type { createClient } from "@/lib/supabase/server";
import { buscaEmLotes } from "@/lib/supabase/em-lotes";
import type { Lead } from "@/lib/types/leads";

import { anexarDadosDosFiltros, type LinhasDosFiltros } from "./dados-do-quadro";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * A ETAPA DO FORK NA ROTA DO QUADRO (Fase 1D). Lê o que os filtros novos e a
 * ordenação precisam e o payload não trazia:
 *
 * - quantas atividades concluídas, pela função `fn_escale_atividades_concluidas`,
 *   que CONTA no banco (trazer as linhas bateria no corte de 1000 do PostgREST);
 * - o nome do contato;
 * - status, canal, atendente e a última mensagem de cada lado da conversa da capa.
 *
 * Tudo com a sessão de quem olha (a RLS vale) e filtrado pela organização do
 * funil, que a rota já leu sob RLS. Erro sobe como nas outras etapas da rota: um
 * quadro que perde o dado em silêncio filtraria errado sem aviso.
 */
export async function comDadosDosFiltros(
  supabase: Supabase,
  orgId: string,
  leads: Lead[],
): Promise<{ leads: Lead[]; error: string | null }> {
  if (leads.length === 0) return { leads, error: null };
  const contatos = [...new Set(leads.map((l) => l.contact_id).filter((c): c is string => !!c))];
  const [concluidas, pessoas, conversas] = await Promise.all([
    buscaEmLotes(
      leads.map((l) => l.id),
      (lote) => supabase.rpc("fn_escale_atividades_concluidas", { p_org: orgId, p_leads: lote }),
    ),
    buscaEmLotes(contatos, (lote) =>
      supabase.from("contacts").select("id, name, display_name, is_anonymized").eq("organization_id", orgId).in("id", lote),
    ),
    buscaEmLotes(contatos, (lote) =>
      supabase
        .from("conversations")
        .select("contact_id, status, channel, assigned_to_user_id, last_inbound_at, last_outbound_at, last_message_at")
        .eq("organization_id", orgId)
        .in("contact_id", lote)
        .order("last_message_at", { ascending: false, nullsFirst: false }),
    ),
  ]);
  const erro = concluidas.error ?? pessoas.error ?? conversas.error;
  if (erro) return { leads, error: erro.message };
  return {
    leads: anexarDadosDosFiltros(leads, {
      concluidas: concluidas.data as LinhasDosFiltros["concluidas"],
      contatos: pessoas.data as LinhasDosFiltros["contatos"],
      conversas: conversas.data as LinhasDosFiltros["conversas"],
    }),
    error: null,
  };
}
```

- [ ] **Step 4: A etapa na rota do quadro**

Em `app/api/v1/pipelines/[id]/board/route.ts`, logo DEPOIS da linha

```ts
import { anexarTarefasAosNegocios, type LinhaDaTarefaNoQuadro } from "@/lib/kanban/tarefas-no-quadro";
```

acrescente:

```ts
// FORK ESCALE · Fase 1D: o que os filtros e a ordenação do quadro leem.
import { comDadosDosFiltros } from "@/lib/escale/filtros/ler-dados-do-quadro";
```

E troque o trecho

```ts
  const leadsComConversa = await withConversas(
    supabase,
    (pipeline as Pipeline).organization_id,
    leadsComTarefas.leads,
  );
```

por:

```ts
  // FORK ESCALE · Fase 1D: atividades concluídas, nome do contato e a conversa
  // da capa para os filtros e a ordenação do quadro. No MEIO da cadeia, como as
  // tarefas: as cercas vigiam withConversas → withMarcadoresDoContato → resposta,
  // e cada etapa só acrescenta o próprio campo ao lead.
  const leadsComFiltros = await comDadosDosFiltros(
    supabase,
    (pipeline as Pipeline).organization_id,
    leadsComTarefas.leads,
  );
  if (leadsComFiltros.error) {
    return fail("internal_error", leadsComFiltros.error, 500, { requestId });
  }

  const leadsComConversa = await withConversas(
    supabase,
    (pipeline as Pipeline).organization_id,
    leadsComFiltros.leads,
  );
```

Se o trecho não bater letra por letra (a sincronização pode ter mexido nele), PARE e mostre ao usuário o trecho atual entre `withTarefas` e `withConversas`, antes de editar.

- [ ] **Step 5: Rodar os testes novos e as cercas do quadro**

```bash
corepack pnpm vitest run tests/unit/escale-dados-dos-filtros-na-rota.test.ts tests/unit/kanban-atalho-conversa.test.tsx tests/unit/funil-filtro-de-tag-le-as-duas-caixas.test.ts tests/unit/funil-mostra-dados-do-cliente.test.tsx tests/unit/contato-pessoal-funil.test.ts
corepack pnpm typecheck
```
Expected: os 5 arquivos PASS; typecheck sem erros novos. Se o typecheck reclamar do nome da função em `supabase.rpc(...)` (tipos do banco sem a 9004), troque a chamada por `supabase.rpc("fn_escale_atividades_concluidas" as never, { p_org: orgId, p_leads: lote } as never)`.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/filtros/ler-dados-do-quadro.ts app/api/v1/pipelines/[id]/board/route.ts tests/unit/escale-dados-dos-filtros-na-rota.test.ts
git commit -m "feat(escale): a rota do quadro anexa atividades concluídas, nome do contato e conversa para os filtros

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: As rotas dos filtros salvos

**Files:**
- Create: `lib/escale/filtros/filtros-salvos.ts`, `lib/escale/filtros/ler-filtros-salvos.ts`, `lib/escale/filtros/respostas.ts`, `app/api/v1/filtros-salvos/route.ts`, `app/api/v1/filtros-salvos/[id]/route.ts`, `tests/unit/escale-filtros-salvos-rotas.test.ts`
- Modify: `lib/audit/actions.ts` (bloco logo depois de `"pipeline_view.deleted",`)

**Interfaces:**
- Consumes:
  - da Task 3: `filtrosDoQuadroSchema`, `FiltrosDoQuadro` e `mesmosFiltros`;
  - da 1B: `lerJson`, de `lib/escale/origens/respostas.ts`;
  - do original: `requireRole` (`@/lib/auth/require-role`), `requireSupportWrite` (`@/lib/impersonate/support`), `audit` (`@/lib/audit`), `fail`/`ok` (`@/lib/api/wrappers`), `traduzir` (`@/lib/i18n/dicionario`) e `createClient` (`@/lib/supabase/server`);
  - o dublê `makeDb`/`authOk`/`ORG_ID`/`OUTRA_ORG`/`USER_ID`, de `tests/helpers/stages-db-double.ts`.
- Produces:
  - **`filtros-salvos.ts`**:
    - constantes: `FILTROS_SALVOS_MAX = 20` e `NOME_DO_FILTRO_MAX = 60`;
    - tipos: `AlvoDoFiltro { tipo: "origem" | "visualizacao"; id }` e `FiltroSalvo { id; nome; compartilhado; meu; criterios: FiltrosDoQuadro }`;
    - funções: `validarNomeDoFiltro(bruto)`, `nomeRepetido(nome, meus, ignorarId?)`, `separarFiltrosSalvos(lista): { meus; compartilhados }`, `filtroAlterado(salvo, atuais): boolean` e `parametroDoAlvo(alvo): "origem" | "visualizacao"`.
  - **`ler-filtros-salvos.ts`**: `lerFiltrosSalvos(supabase, orgId, userId, alvo): Promise<FiltroSalvo[]>`, `alvoExiste(supabase, orgId, alvo): Promise<boolean>`, `meuFiltro(supabase, orgId, userId, id)` e `alvoDaLinha(linha): AlvoDoFiltro`.
  - **`respostas.ts`**: `alvoDaBusca(params): AlvoDoFiltro | null`, `filtrosSalvosOuFalha(...)`, `responderComFiltrosSalvos(...)` e `falhaDaGravacaoDoFiltro(erro, t, requestId)`.
  - **Rotas**, todas respondendo `{ data: FiltroSalvo[] }` (a lista daquele alvo, relida do banco):
    - `GET /api/v1/filtros-salvos?origem=<uuid>` ou `?visualizacao=<uuid>`;
    - `POST /api/v1/filtros-salvos`, com o corpo `{ id, origem? | visualizacao?, nome, compartilhado, criterios }`;
    - `PATCH /api/v1/filtros-salvos/:id`, com `{ nome?, compartilhado?, criterios? }`;
    - `DELETE /api/v1/filtros-salvos/:id`.
  - **Auditoria:** `pipeline_filter.created`, `pipeline_filter.updated` e `pipeline_filter.deleted`.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Create `tests/unit/escale-filtros-salvos-rotas.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import {
  filtroAlterado,
  nomeRepetido,
  separarFiltrosSalvos,
  validarNomeDoFiltro,
  type FiltroSalvo,
} from "@/lib/escale/filtros/filtros-salvos";
import { GET, POST } from "@/app/api/v1/filtros-salvos/route";
import { DELETE, PATCH } from "@/app/api/v1/filtros-salvos/[id]/route";
import { ORG_ID, OUTRA_ORG, USER_ID, authOk, makeDb, type PipelineRow } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const F1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const F_VIZINHO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const V1 = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const V_INEXISTENTE = "cccccccc-cccc-4ccc-8ccc-ccccccccccc9";
const OUTRA_PESSOA = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const S_QUENTES = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1";
const S_FRIOS = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2";
const S_DO_TIME = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3";
const S_PARTICULAR = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4";
const S_NA_VISUALIZACAO = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5";
const S_DO_VIZINHO = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee6";
const S_NOVO = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee7";
const ABERTOS = { status: ["open"] };
const ABERTOS_VIP = { status: ["open"], tags: ["vip"] };

const linha = (id: string, user_id: string, over: Record<string, unknown>) => ({
  id,
  organization_id: ORG_ID,
  user_id,
  pipeline_id: null,
  view_id: null,
  compartilhado: false,
  criterios: ABERTOS,
  ...over,
});

function banco(opts: Parameters<typeof makeDb>[0] = {}) {
  const db = makeDb({
    pipelines: [
      { id: F1, name: "Leads", organization_id: ORG_ID, is_archived: false },
      { id: F_VIZINHO, name: "Do vizinho", organization_id: OUTRA_ORG, is_archived: false },
    ] as unknown as PipelineRow[],
    ...opts,
  });
  const tabelas = db.tabelas as unknown as Record<string, unknown[]>;
  tabelas.crm_pipeline_views = [{ id: V1, organization_id: ORG_ID, name: "Time", acesso: "todos" }];
  tabelas.crm_filtros_salvos = [
    linha(S_QUENTES, USER_ID, { pipeline_id: F1, nome: "Quentes" }),
    linha(S_FRIOS, USER_ID, { pipeline_id: F1, nome: "Frios" }),
    linha(S_DO_TIME, OUTRA_PESSOA, { pipeline_id: F1, nome: "Do time", compartilhado: true }),
    linha(S_PARTICULAR, OUTRA_PESSOA, { pipeline_id: F1, nome: "Particular" }),
    linha(S_NA_VISUALIZACAO, USER_ID, { view_id: V1, nome: "Na visualização" }),
    { ...linha(S_DO_VIZINHO, OUTRA_PESSOA, { pipeline_id: F_VIZINHO, nome: "Vizinho", compartilhado: true }), organization_id: OUTRA_ORG },
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
const listar = (busca: string) => GET(pedido(`/api/v1/filtros-salvos?${busca}`, "GET"));
const criar = (body: unknown) => POST(pedido("/api/v1/filtros-salvos", "POST", body));
const mudar = (id: string, body: unknown) => PATCH(pedido(`/api/v1/filtros-salvos/${id}`, "PATCH", body), ctx(id));
const excluir = (id: string) => DELETE(pedido(`/api/v1/filtros-salvos/${id}`, "DELETE"), ctx(id));
const listaDe = async (res: Response) => ((await res.json()) as { data: FiltroSalvo[] }).data;
const novoValido = { id: S_NOVO, origem: F1, nome: "Fechando", compartilhado: true, criterios: ABERTOS_VIP };

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  authOk();
});

describe("regras dos filtros salvos", () => {
  it("nome: obrigatório, até 60, sem espaço nas pontas; repetido sem olhar caixa nem acento", () => {
    expect(validarNomeDoFiltro("  Quentes ")).toEqual({ ok: true, nome: "Quentes" });
    expect(validarNomeDoFiltro("  ")).toEqual({ ok: false, erro: "Dê um nome ao filtro." });
    expect(validarNomeDoFiltro("x".repeat(61))).toEqual({ ok: false, erro: "O nome do filtro pode ter até 60 caracteres." });
    const meus = [{ id: "1", nome: "Negócios à vista" }];
    expect(nomeRepetido("negocios a VISTA", meus)).toBe(true);
    expect(nomeRepetido("negocios a VISTA", meus, "1")).toBe(false);
  });

  it("separa os meus dos compartilhados, por nome, e sabe quando o aplicado foi alterado", () => {
    const f = (id: string, nome: string, meu: boolean): FiltroSalvo => ({ id, nome, meu, compartilhado: !meu, criterios: { status: ["open"] } });
    const { meus, compartilhados } = separarFiltrosSalvos([f("b", "Zeta", true), f("a", "alfa", true), f("c", "Do time", false)]);
    expect(meus.map((x) => x.nome)).toEqual(["alfa", "Zeta"]);
    expect(compartilhados.map((x) => x.nome)).toEqual(["Do time"]);
    expect(filtroAlterado(f("a", "alfa", true), { status: ["open"] })).toBe(false);
    expect(filtroAlterado(f("a", "alfa", true), { status: ["open", "won"] })).toBe(true);
  });
});

describe("GET /api/v1/filtros-salvos", () => {
  it("devolve os meus e os compartilhados da origem, sem os particulares de outra pessoa nem os do vizinho", async () => {
    banco();
    const res = await listar(`origem=${F1}`);
    expect(res.status).toBe(200);
    expect(await listaDe(res)).toEqual([
      { id: S_DO_TIME, nome: "Do time", compartilhado: true, meu: false, criterios: ABERTOS },
      { id: S_FRIOS, nome: "Frios", compartilhado: false, meu: true, criterios: ABERTOS },
      { id: S_QUENTES, nome: "Quentes", compartilhado: false, meu: true, criterios: ABERTOS },
    ]);
    expect(vi.mocked(requireRole).mock.calls[0]![0]).toBe("viewer");
  });

  it("os da visualização vêm por ?visualizacao=; sem alvo, com os dois ou com lixo é 422", async () => {
    banco();
    expect((await listaDe(await listar(`visualizacao=${V1}`))).map((f) => f.id)).toEqual([S_NA_VISUALIZACAO]);
    expect((await listar("")).status).toBe(422);
    expect((await listar(`origem=${F1}&visualizacao=${V1}`)).status).toBe(422);
    expect((await listar("origem=nao-e-uuid")).status).toBe(422);
  });
});

describe("POST /api/v1/filtros-salvos", () => {
  it("grava com a organização e a pessoa da sessão, responde 201 com a lista relida e audita", async () => {
    const db = banco();
    const res = await criar({ ...novoValido, nome: "  Fechando  " });
    expect(res.status).toBe(201);
    const escrita = db.escritas.find((e) => e.table === "crm_filtros_salvos")!;
    expect(escrita.tipo).toBe("insert");
    expect(escrita.patch).toEqual({
      id: S_NOVO,
      organization_id: ORG_ID,
      user_id: USER_ID,
      pipeline_id: F1,
      view_id: null,
      nome: "Fechando",
      compartilhado: true,
      criterios: ABERTOS_VIP,
    });
    expect((await listaDe(res)).find((f) => f.id === S_NOVO)).toEqual({
      id: S_NOVO,
      nome: "Fechando",
      compartilhado: true,
      meu: true,
      criterios: ABERTOS_VIP,
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline_filter.created", resourceId: S_NOVO, organizationId: ORG_ID }),
    );
  });

  it("na visualização, grava view_id e deixa pipeline_id nulo", async () => {
    const db = banco();
    const { origem: _origem, ...semOrigem } = novoValido;
    expect((await criar({ ...semOrigem, visualizacao: V1 })).status).toBe(201);
    expect(db.escritas[0]!.patch).toMatchObject({ pipeline_id: null, view_id: V1 });
  });

  it("origem do vizinho ou visualização que não existe é 404, sem gravar", async () => {
    const db = banco();
    expect((await criar({ ...novoValido, origem: F_VIZINHO })).status).toBe(404);
    const { origem: _origem, ...semOrigem } = novoValido;
    expect((await criar({ ...semOrigem, visualizacao: V_INEXISTENTE })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });

  it("nome repetido entre os MEUS é 409; o mesmo nome de um compartilhado de outra pessoa pode", async () => {
    const db = banco();
    expect((await criar({ ...novoValido, nome: "QUENTES" })).status).toBe(409);
    expect(db.escritas).toEqual([]);
    expect((await criar({ ...novoValido, nome: "Do time" })).status).toBe(201);
  });

  it("no limite de 20 filtros meus nesta origem, recusa com 422 e o texto da Clint", async () => {
    const db = banco();
    const tabelas = db.tabelas as unknown as Record<string, unknown[]>;
    for (let i = 0; i < 18; i++) {
      tabelas.crm_filtros_salvos!.push(linha(`ffffffff-ffff-4fff-8fff-${String(i).padStart(12, "0")}`, USER_ID, { pipeline_id: F1, nome: `Filtro ${i}` }));
    }
    const res = await criar(novoValido);
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe(
      "Limite de 20 filtros salvos atingido. Exclua algum para salvar outro.",
    );
    expect(db.escritas).toEqual([]);
  });

  it("corpo que não é JSON é 400; chave a mais, alvo duplo ou ausente, critério inválido e nome vazio são 422", async () => {
    banco();
    expect((await criar("{quebrado")).status).toBe(400);
    expect((await criar({ ...novoValido, organization_id: OUTRA_ORG })).status).toBe(422);
    expect((await criar({ ...novoValido, visualizacao: V1 })).status).toBe(422);
    const { origem: _origem, ...semAlvo } = novoValido;
    expect((await criar(semAlvo)).status).toBe(422);
    expect((await criar({ ...novoValido, criterios: { status: [] } })).status).toBe(422);
    expect((await criar({ ...novoValido, nome: "   " })).status).toBe(422);
  });

  it("os erros do banco têm nome: 23505 é 409 e 42501 é 403", async () => {
    for (const [code, status] of [
      ["23505", 409],
      ["42501", 403],
    ] as const) {
      banco({ writeError: (_n, table) => (table === "crm_filtros_salvos" ? { code, message: `erro ${code}` } : null) });
      expect((await criar(novoValido)).status).toBe(status);
    }
    expect(audit).not.toHaveBeenCalled();
  });

  it("o suporte somente leitura para antes de tudo", async () => {
    banco();
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(new Response(null, { status: 423 }) as never);
    expect((await criar(novoValido)).status).toBe(423);
  });
});

describe("PATCH /api/v1/filtros-salvos/:id", () => {
  it("renomeia e compartilha o próprio filtro, filtrando por id, organização e dono", async () => {
    const db = banco();
    const res = await mudar(S_QUENTES, { nome: "Muito quentes", compartilhado: true });
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_filtros_salvos")!;
    expect(escrita.tipo).toBe("update");
    expect(escrita.patch).toEqual({ nome: "Muito quentes", compartilhado: true });
    expect(escrita.filtros).toEqual(expect.arrayContaining([["id", S_QUENTES], ["organization_id", ORG_ID], ["user_id", USER_ID]]));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_filter.updated", resourceId: S_QUENTES }));
  });

  it("salvar os critérios atuais no filtro; manter o próprio nome não é repetido", async () => {
    const db = banco();
    expect((await mudar(S_QUENTES, { nome: "Quentes", criterios: ABERTOS_VIP })).status).toBe(200);
    expect(db.escritas[0]!.patch).toEqual({ nome: "Quentes", criterios: ABERTOS_VIP });
  });

  it("nome de outro filtro meu é 409; filtro de outra pessoa ou do vizinho é 404; corpo vazio é 422", async () => {
    const db = banco();
    expect((await mudar(S_QUENTES, { nome: "frios" })).status).toBe(409);
    expect((await mudar(S_DO_TIME, { nome: "Meu agora" })).status).toBe(404);
    expect((await mudar(S_DO_VIZINHO, { nome: "Meu agora" })).status).toBe(404);
    expect((await mudar(S_QUENTES, {})).status).toBe(422);
    expect((await mudar("nao-e-uuid", { nome: "x" })).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});

describe("DELETE /api/v1/filtros-salvos/:id", () => {
  it("apaga o próprio filtro filtrando por id, organização e dono, e devolve a lista sem ele", async () => {
    const db = banco();
    const res = await excluir(S_QUENTES);
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_filtros_salvos")!;
    expect(escrita.tipo).toBe("delete");
    expect(escrita.filtros).toEqual(expect.arrayContaining([["id", S_QUENTES], ["organization_id", ORG_ID], ["user_id", USER_ID]]));
    expect((await listaDe(res)).map((f) => f.id)).toEqual([S_DO_TIME, S_FRIOS]);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline_filter.deleted", resourceId: S_QUENTES }));
  });

  it("filtro compartilhado de outra pessoa é 404 e nada é apagado", async () => {
    const db = banco();
    expect((await excluir(S_DO_TIME)).status).toBe(404);
    expect(db.escritas).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-salvos-rotas.test.ts
```
Expected: FAIL com `Failed to resolve import "@/lib/escale/filtros/filtros-salvos"`.

- [ ] **Step 3: As regras puras**

Create `lib/escale/filtros/filtros-salvos.ts`:

```ts
import { mesmosFiltros, type FiltrosDoQuadro } from "./tipos";

/**
 * FILTROS SALVOS DO QUADRO (fork Escale, Fase 1D). Cada pessoa salva os filtros
 * de uma origem ou de uma visualização; marca "compartilhar" para quem vê o alvo
 * (decisão de 15/10). Quem vê o compartilhado é a RLS que decide (migration 9004).
 */
export const FILTROS_SALVOS_MAX = 20;
export const NOME_DO_FILTRO_MAX = 60;

export interface AlvoDoFiltro {
  tipo: "origem" | "visualizacao";
  id: string;
}

export interface FiltroSalvo {
  id: string;
  nome: string;
  compartilhado: boolean;
  /** É de quem está olhando: só esse pode mudar ou excluir. */
  meu: boolean;
  criterios: FiltrosDoQuadro;
}

export function validarNomeDoFiltro(bruto: string): { ok: true; nome: string } | { ok: false; erro: string } {
  const nome = bruto.trim();
  if (!nome) return { ok: false, erro: "Dê um nome ao filtro." };
  if (nome.length > NOME_DO_FILTRO_MAX) return { ok: false, erro: "O nome do filtro pode ter até 60 caracteres." };
  return { ok: true, nome };
}

const chaveDoNome = (nome: string) => nome.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Entre os MEUS filtros do alvo, sem olhar caixa nem acento. */
export function nomeRepetido(nome: string, meus: ReadonlyArray<Pick<FiltroSalvo, "id" | "nome">>, ignorarId?: string): boolean {
  const alvo = chaveDoNome(nome);
  return meus.some((f) => f.id !== ignorarId && chaveDoNome(f.nome) === alvo);
}

export function separarFiltrosSalvos(lista: readonly FiltroSalvo[]): { meus: FiltroSalvo[]; compartilhados: FiltroSalvo[] } {
  const porNome = (a: FiltroSalvo, b: FiltroSalvo) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
  return {
    meus: lista.filter((f) => f.meu).sort(porNome),
    compartilhados: lista.filter((f) => !f.meu).sort(porNome),
  };
}

/** O filtro aplicado foi mexido depois de aplicado? */
export const filtroAlterado = (salvo: Pick<FiltroSalvo, "criterios">, atuais: FiltrosDoQuadro) =>
  !mesmosFiltros(salvo.criterios, atuais);

export const parametroDoAlvo = (alvo: AlvoDoFiltro) => (alvo.tipo === "origem" ? "origem" : "visualizacao");
```

- [ ] **Step 4: A leitura e as respostas**

Create `lib/escale/filtros/ler-filtros-salvos.ts`:

```ts
import type { createClient } from "@/lib/supabase/server";

import type { AlvoDoFiltro, FiltroSalvo } from "./filtros-salvos";
import { filtrosDoQuadroSchema } from "./tipos";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Os filtros salvos de UM alvo que a pessoa vê: os dela e os compartilhados.
 * Quem vê o compartilhado é a RLS (migration 9004, com a sessão de quem olha); o
 * filtro "meu ou compartilhado" aqui é defesa, a mesma pergunta da policy. O
 * critério que não passa no schema de hoje (versão antiga) some da lista em vez
 * de quebrar a tela. LANÇA no erro do banco.
 */
export async function lerFiltrosSalvos(
  supabase: Supabase,
  orgId: string,
  userId: string,
  alvo: AlvoDoFiltro,
): Promise<FiltroSalvo[]> {
  const { data, error } = await supabase
    .from("crm_filtros_salvos")
    .select("id, user_id, nome, compartilhado, criterios")
    .eq("organization_id", orgId)
    .eq(alvo.tipo === "origem" ? "pipeline_id" : "view_id", alvo.id);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: string; user_id: string; nome: string; compartilhado: boolean; criterios: unknown }>)
    .filter((r) => r.user_id === userId || r.compartilhado)
    .flatMap((r) => {
      const criterios = filtrosDoQuadroSchema.safeParse(r.criterios);
      return criterios.success
        ? [{ id: r.id, nome: r.nome, compartilhado: r.compartilhado, meu: r.user_id === userId, criterios: criterios.data }]
        : [];
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

/** A origem ou a visualização existe e a pessoa a vê (RLS)? LANÇA no erro do banco. */
export async function alvoExiste(supabase: Supabase, orgId: string, alvo: AlvoDoFiltro): Promise<boolean> {
  const tabela = alvo.tipo === "origem" ? "crm_pipelines" : "crm_pipeline_views";
  const { data, error } = await supabase.from(tabela).select("id").eq("organization_id", orgId).eq("id", alvo.id).maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}

export interface LinhaDoMeuFiltro {
  id: string;
  pipeline_id: string | null;
  view_id: string | null;
  nome: string;
}

/** O filtro `id` SE for da pessoa (de outra pessoa = nulo). LANÇA no erro do banco. */
export async function meuFiltro(supabase: Supabase, orgId: string, userId: string, id: string): Promise<LinhaDoMeuFiltro | null> {
  const { data, error } = await supabase
    .from("crm_filtros_salvos")
    .select("id, pipeline_id, view_id, nome")
    .eq("id", id)
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as LinhaDoMeuFiltro | null) ?? null;
}

export const alvoDaLinha = (l: Pick<LinhaDoMeuFiltro, "pipeline_id" | "view_id">): AlvoDoFiltro =>
  l.pipeline_id ? { tipo: "origem", id: l.pipeline_id } : { tipo: "visualizacao", id: l.view_id as string };
```

Create `lib/escale/filtros/respostas.ts`:

```ts
/**
 * O que as rotas de filtros salvos compartilham (fork Escale, Fase 1D): o alvo
 * da busca, reler a lista e dar nome aos erros do banco.
 *
 * `requireSupportWrite()` e `requireRole()` NÃO moram aqui de propósito: o gate
 * `tests/unit/suporte-cobertura-de-efeitos.test.ts` lê cada handler e exige a
 * guarda de suporte escrita nele.
 */
import { fail, ok } from "@/lib/api/wrappers";
import type { createClient } from "@/lib/supabase/server";

import type { AlvoDoFiltro, FiltroSalvo } from "./filtros-salvos";
import { lerFiltrosSalvos } from "./ler-filtros-salvos";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `?origem=<uuid>` OU `?visualizacao=<uuid>` — um e só um. */
export function alvoDaBusca(params: URLSearchParams): AlvoDoFiltro | null {
  const origem = params.get("origem");
  const visualizacao = params.get("visualizacao");
  if (origem && !visualizacao && UUID.test(origem)) return { tipo: "origem", id: origem };
  if (visualizacao && !origem && UUID.test(visualizacao)) return { tipo: "visualizacao", id: visualizacao };
  return null;
}

export async function filtrosSalvosOuFalha(
  supabase: Supabase,
  orgId: string,
  userId: string,
  alvo: AlvoDoFiltro,
  requestId: string,
): Promise<{ ok: true; filtros: FiltroSalvo[] } | { ok: false; resposta: Response }> {
  try {
    return { ok: true, filtros: await lerFiltrosSalvos(supabase, orgId, userId, alvo) };
  } catch (err) {
    return { ok: false, resposta: fail("internal_error", (err as Error).message, 500, { requestId }) };
  }
}

/** Responde com a lista do alvo RELIDA do banco: a tela aplica o corpo. */
export async function responderComFiltrosSalvos(
  supabase: Supabase,
  orgId: string,
  userId: string,
  alvo: AlvoDoFiltro,
  requestId: string,
  status: 200 | 201 = 200,
): Promise<Response> {
  const lido = await filtrosSalvosOuFalha(supabase, orgId, userId, alvo, requestId);
  return lido.ok ? ok(lido.filtros, { status, requestId }) : lido.resposta;
}

/**
 * O que o banco recusa tem nome para gente. 23505 = o índice do nome (ou o id
 * repetido) venceu a corrida; 23503 = a FK composta recusou um alvo de fora;
 * 23514 = um CHECK (alvo, nome, critérios); 42501 = a RLS (não é o dono).
 */
export function falhaDaGravacaoDoFiltro(
  erro: { code?: string; message?: string },
  t: (texto: string) => string,
  requestId: string,
): Response {
  if (erro.code === "23505") {
    return erro.message?.includes("crm_filtros_salvos_pkey")
      ? fail("state_conflict", t("Esse filtro já existe."), 409, { requestId })
      : fail("state_conflict", t("Você já tem um filtro com esse nome aqui."), 409, { requestId });
  }
  if (erro.code === "23503") return fail("not_found", t("Origem ou visualização não encontrada."), 404, { requestId });
  if (erro.code === "23514") {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, { requestId });
  }
  if (erro.code === "42501") return fail("forbidden", t("Só quem criou o filtro pode mudá-lo."), 403, { requestId });
  return fail("internal_error", erro.message ?? "", 500, { requestId });
}
```

- [ ] **Step 5: Os códigos de auditoria**

Em `lib/audit/actions.ts`, logo DEPOIS da linha `  "pipeline_view.deleted",`, acrescente:

```ts
  // FORK ESCALE · Fase 1D: filtros salvos do quadro (migration 9004).
  "pipeline_filter.created",
  "pipeline_filter.updated",
  "pipeline_filter.deleted",
```

- [ ] **Step 6: As rotas**

Create `app/api/v1/filtros-salvos/route.ts`:

```ts
/**
 * GET/POST /api/v1/filtros-salvos — os FILTROS SALVOS do quadro de uma origem ou
 * de uma visualização (fork Escale, Fase 1D).
 *
 * Qualquer papel lista e salva os próprios filtros (decisão de 15/10); quem vê os
 * compartilhados é a RLS. O `id` vem da tela (uuid novo), para ela já marcar o
 * filtro como aplicado. `organization_id` e `user_id` saem da sessão, nunca do
 * corpo. Até 20 filtros por pessoa em cada origem ou visualização.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  FILTROS_SALVOS_MAX,
  nomeRepetido,
  validarNomeDoFiltro,
  type AlvoDoFiltro,
} from "@/lib/escale/filtros/filtros-salvos";
import { alvoExiste } from "@/lib/escale/filtros/ler-filtros-salvos";
import {
  alvoDaBusca,
  falhaDaGravacaoDoFiltro,
  filtrosSalvosOuFalha,
  responderComFiltrosSalvos,
} from "@/lib/escale/filtros/respostas";
import { filtrosDoQuadroSchema } from "@/lib/escale/filtros/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const corpoSchema = z
  .object({
    id: z.string().uuid(),
    origem: z.string().uuid().optional(),
    visualizacao: z.string().uuid().optional(),
    nome: z.string().max(200),
    compartilhado: z.boolean(),
    criterios: filtrosDoQuadroSchema,
  })
  .strict()
  .refine((b) => (b.origem === undefined) !== (b.visualizacao === undefined));

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_salvos" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const alvo = alvoDaBusca(req.nextUrl.searchParams);
  if (!alvo) {
    return fail("unprocessable_entity", t("Diga de qual origem ou visualização são os filtros."), 422, { requestId });
  }
  return responderComFiltrosSalvos(await createClient(), authz.org.orgId, authz.user.id, alvo, requestId);
}

export async function POST(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_salvos" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const userId = authz.user.id;

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const nome = validarNomeDoFiltro(parsed.data.nome);
  if (!nome.ok) return fail("unprocessable_entity", t(nome.erro), 422, { requestId });
  const alvo: AlvoDoFiltro = parsed.data.origem
    ? { tipo: "origem", id: parsed.data.origem }
    : { tipo: "visualizacao", id: parsed.data.visualizacao as string };

  const supabase = await createClient();
  let existe: boolean;
  try {
    existe = await alvoExiste(supabase, orgId, alvo);
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
  if (!existe) return fail("not_found", t("Origem ou visualização não encontrada."), 404, { requestId });

  const atuais = await filtrosSalvosOuFalha(supabase, orgId, userId, alvo, requestId);
  if (!atuais.ok) return atuais.resposta;
  const meus = atuais.filtros.filter((f) => f.meu);
  if (nomeRepetido(nome.nome, meus)) {
    return fail("state_conflict", t("Você já tem um filtro com esse nome aqui."), 409, { requestId });
  }
  if (meus.length >= FILTROS_SALVOS_MAX) {
    return fail(
      "unprocessable_entity",
      t("Limite de 20 filtros salvos atingido. Exclua algum para salvar outro."),
      422,
      { requestId },
    );
  }

  const { error } = await supabase.from("crm_filtros_salvos").insert({
    id: parsed.data.id,
    organization_id: orgId,
    user_id: userId,
    pipeline_id: alvo.tipo === "origem" ? alvo.id : null,
    view_id: alvo.tipo === "visualizacao" ? alvo.id : null,
    nome: nome.nome,
    compartilhado: parsed.data.compartilhado,
    criterios: parsed.data.criterios,
  });
  if (error) return falhaDaGravacaoDoFiltro(error, t, requestId);

  void audit({
    action: "pipeline_filter.created",
    actorUserId: userId,
    organizationId: orgId,
    resourceType: "crm_filtro_salvo",
    resourceId: parsed.data.id,
    requestId,
    metadata: { alvo: alvo.tipo, compartilhado: parsed.data.compartilhado },
  });

  return responderComFiltrosSalvos(supabase, orgId, userId, alvo, requestId, 201);
}
```

Create `app/api/v1/filtros-salvos/[id]/route.ts`:

```ts
/**
 * PATCH/DELETE /api/v1/filtros-salvos/[id] — mudar e excluir um FILTRO SALVO
 * (fork Escale, Fase 1D). Só quem criou: filtro de outra pessoa (compartilhado
 * ou não) e de outra organização morrem no 404 antes de qualquer escrita, e a
 * RLS (migration 9004) recusa de novo no banco.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { nomeRepetido, validarNomeDoFiltro } from "@/lib/escale/filtros/filtros-salvos";
import { alvoDaLinha, meuFiltro, type LinhaDoMeuFiltro } from "@/lib/escale/filtros/ler-filtros-salvos";
import {
  falhaDaGravacaoDoFiltro,
  filtrosSalvosOuFalha,
  responderComFiltrosSalvos,
} from "@/lib/escale/filtros/respostas";
import { filtrosDoQuadroSchema } from "@/lib/escale/filtros/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const corpoSchema = z
  .object({
    nome: z.string().max(200).optional(),
    compartilhado: z.boolean().optional(),
    criterios: filtrosDoQuadroSchema.optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0);

const ehUuid = (id: string) => z.string().uuid().safeParse(id).success;

/** O filtro do id SE for de quem chama; senão, a resposta (404 ou 500). */
async function acharMeuFiltro(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string,
  id: string,
  t: (texto: string) => string,
  requestId: string,
): Promise<{ ok: true; linha: LinhaDoMeuFiltro } | { ok: false; resposta: Response }> {
  const naoAchou = { ok: false as const, resposta: fail("not_found", t("Filtro não encontrado."), 404, { requestId }) };
  if (!ehUuid(id)) return naoAchou;
  try {
    const linha = await meuFiltro(supabase, orgId, userId, id);
    return linha ? { ok: true, linha } : naoAchou;
  } catch (err) {
    return { ok: false, resposta: fail("internal_error", (err as Error).message, 500, { requestId }) };
  }
}

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_salvos" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const userId = authz.user.id;
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
  const achado = await acharMeuFiltro(supabase, orgId, userId, id, t, requestId);
  if (!achado.ok) return achado.resposta;
  const alvo = alvoDaLinha(achado.linha);

  const patch: Record<string, unknown> = {};
  if (parsed.data.nome !== undefined) {
    const nome = validarNomeDoFiltro(parsed.data.nome);
    if (!nome.ok) return fail("unprocessable_entity", t(nome.erro), 422, { requestId });
    const atuais = await filtrosSalvosOuFalha(supabase, orgId, userId, alvo, requestId);
    if (!atuais.ok) return atuais.resposta;
    if (nomeRepetido(nome.nome, atuais.filtros.filter((f) => f.meu), id)) {
      return fail("state_conflict", t("Você já tem um filtro com esse nome aqui."), 409, { requestId });
    }
    patch.nome = nome.nome;
  }
  if (parsed.data.compartilhado !== undefined) patch.compartilhado = parsed.data.compartilhado;
  if (parsed.data.criterios !== undefined) patch.criterios = parsed.data.criterios;

  const { error } = await supabase
    .from("crm_filtros_salvos")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (error) return falhaDaGravacaoDoFiltro(error, t, requestId);

  void audit({
    action: "pipeline_filter.updated",
    actorUserId: userId,
    organizationId: orgId,
    resourceType: "crm_filtro_salvo",
    resourceId: id,
    requestId,
    metadata: { campos: Object.keys(patch) },
  });

  return responderComFiltrosSalvos(supabase, orgId, userId, alvo, requestId);
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_salvos" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const userId = authz.user.id;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const achado = await acharMeuFiltro(supabase, orgId, userId, id, t, requestId);
  if (!achado.ok) return achado.resposta;

  const { error } = await supabase
    .from("crm_filtros_salvos")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (error) return falhaDaGravacaoDoFiltro(error, t, requestId);

  void audit({
    action: "pipeline_filter.deleted",
    actorUserId: userId,
    organizationId: orgId,
    resourceType: "crm_filtro_salvo",
    resourceId: id,
    requestId,
    metadata: { nome: achado.linha.nome },
  });

  return responderComFiltrosSalvos(supabase, orgId, userId, alvoDaLinha(achado.linha), requestId);
}
```

- [ ] **Step 7: Rodar os testes, o gate do suporte e o typecheck**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-salvos-rotas.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts
corepack pnpm typecheck
```
Expected: os 2 arquivos PASS; typecheck sem erros novos.
- Se `suporte-cobertura-de-efeitos` reclamar das rotas novas, confira que `requireSupportWrite()` está escrito DENTRO de POST, PATCH e DELETE, como acima.
- Se o `error.message` do 422 do limite vier em outro caminho do JSON, olhe a forma do envelope em `lib/api/wrappers.ts` (`fail`) e ajuste SÓ a leitura no teste (`(await res.json()).error.message`). Não ajuste a rota.

- [ ] **Step 8: Commit**

```bash
git add lib/escale/filtros/filtros-salvos.ts lib/escale/filtros/ler-filtros-salvos.ts lib/escale/filtros/respostas.ts lib/audit/actions.ts app/api/v1/filtros-salvos tests/unit/escale-filtros-salvos-rotas.test.ts
git commit -m "feat(escale): rotas dos filtros salvos (listar, salvar, mudar, excluir; pessoal ou compartilhado)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Os textos em espanhol e os dois ícones

**Files:**
- Modify: `lib/i18n/dicionario.ts` (bloco logo depois do fim da entrada `"{n} negócios de {k} origens selecionados. A ação em lote vale para uma origem por vez."`), `lib/ui/icons.ts` (2 nomes logo depois de `FrameCorners,`)

**Interfaces:**
- Consumes: nada.
- Produces: o espanhol de todo texto das Tasks 7, 9, 10, 11, 12 e 13 (as chaves que já existem no dicionário ficam como estão), e os ícones `ArrowsDownUp` e `BookmarkSimple` em `@/lib/ui/icons`.

- [ ] **Step 1: Inserir o bloco do dicionário por script (pula o que já existe)**

Da raiz do repositório:

```bash
node - <<'NODE'
const fs = require("fs");
const ARQ = "lib/i18n/dicionario.ts";
const ANCORA = '"{n} negócios de {k} origens selecionados. A ação em lote vale para uma origem por vez.": {';
const CAB = "  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───";
const ENTRADAS = [
  ["Pesquisar nessa origem…", "Buscar en este origen…"],
  ["Pesquisar nessa visualização…", "Buscar en esta vista…"],
  ["{n} negócio", "{n} negocio"],
  ["{n} negócios", "{n} negocios"],
  ["Atualizar", "Actualizar"],
  ["Ordenação ativa · arrastar para reordenar dentro da coluna está desabilitado. Mover de etapa continua funcionando.", "Orden activo · arrastrar para reordenar dentro de la columna está desactivado. Mover de etapa sigue funcionando."],
  ["Em aberto", "Abiertos"],
  ["Ganhos", "Ganados"],
  ["Perdidos", "Perdidos"],
  ["Todos os status", "Todos los estados"],
  ["Status do negócio", "Estado del negocio"],
  ["Mostrar todos", "Mostrar todos"],
  ["Filtros", "Filtros"],
  ["Negócio", "Negocio"],
  ["Conversas", "Conversaciones"],
  ["Tags", "Etiquetas"],
  ["Campos", "Campos"],
  ["Outros", "Otros"],
  ["Limpar", "Limpiar"],
  ["Dono do negócio", "Responsable del negocio"],
  ["Todos", "Todos"],
  ["Todas", "Todas"],
  ["Eu", "Yo"],
  ["Sem responsável", "Sin responsable"],
  ["Sem nome", "Sin nombre"],
  ["Data de criação", "Fecha de creación"],
  ["Criado a partir de", "Creado desde"],
  ["Criado até", "Creado hasta"],
  ["Só entram negócios na moeda da organização.", "Solo entran negocios en la moneda de la organización."],
  ["Valor", "Valor"],
  ["Mínimo", "Mínimo"],
  ["Máximo", "Máximo"],
  ["Apenas atrasados", "Solo atrasados"],
  ["Motivo de perda", "Motivo de pérdida"],
  ["Categoria de perda", "Categoría de pérdida"],
  ["Conversa", "Conversación"],
  ["Com ou sem conversa", "Con o sin conversación"],
  ["Com conversa", "Con conversación"],
  ["Sem conversa", "Sin conversación"],
  ["Não lidas", "No leídas"],
  ["Não respondidas pelo atendente", "No respondidas por el agente"],
  ["Status da conversa", "Estado de la conversación"],
  ["Aberta", "Abierta"],
  ["Encerrada", "Cerrada"],
  ["Canais", "Canales"],
  ["Atendentes", "Agentes"],
  ["Não atribuídos", "No asignados"],
  ["Nenhuma tag nos negócios deste quadro.", "Ninguna etiqueta en los negocios de este tablero."],
  ["Como juntar as tags", "Cómo combinar las etiquetas"],
  ["Todas (E)", "Todas (Y)"],
  ["Qualquer uma (OU)", "Cualquiera (O)"],
  ["Condição", "Condición"],
  ["Campo", "Campo"],
  ["Contato", "Contacto"],
  ["Remover condição", "Quitar condición"],
  ["Operador", "Operador"],
  ["contém", "contiene"],
  ["é igual a", "es igual a"],
  ["está entre", "está entre"],
  ["está preenchido", "está completo"],
  ["está vazio", "está vacío"],
  ["Adicionar condição", "Agregar condición"],
  ["Sim", "Sí"],
  ["Não", "No"],
  ["Escolha", "Elija"],
  ["De", "Desde"],
  ["Até", "Hasta"],
  ["Nome do contato", "Nombre del contacto"],
  ["E-mail do contato", "Correo del contacto"],
  ["Telefone do contato", "Teléfono del contacto"],
  ["Atividades concluídas", "Actividades completadas"],
  ["Conta as atividades marcadas como concluídas neste negócio.", "Cuenta las actividades marcadas como completadas en este negocio."],
  ["Mín.", "Mín."],
  ["Máx.", "Máx."],
  ["Tempo na etapa", "Tiempo en la etapa"],
  ["Conta desde a última vez que o negócio entrou na etapa em que está.", "Cuenta desde la última vez que el negocio entró en la etapa en la que está."],
  ["dias na etapa", "días en la etapa"],
  ["horas na etapa", "horas en la etapa"],
  ["Tempo desde a entrada", "Tiempo desde la entrada"],
  ["Conta desde que o negócio foi criado nesta origem.", "Cuenta desde que el negocio se creó en este origen."],
  ["dias desde a entrada", "días desde la entrada"],
  ["horas desde a entrada", "horas desde la entrada"],
  ["Unidade", "Unidad"],
  ["{n} tag", "{n} etiqueta"],
  ["{n} tags", "{n} etiquetas"],
  ["{n} campo", "{n} campo"],
  ["{n} campos", "{n} campos"],
  ["Dono", "Responsable"],
  ["Filtros ativos", "Filtros activos"],
  ["Remover filtro", "Quitar filtro"],
  ["Limpar filtros", "Limpiar filtros"],
  ["Ordenar", "Ordenar"],
  ["Ordenar por", "Ordenar por"],
  ["Defina um ou mais critérios. A ordem das linhas define a prioridade.", "Defina uno o más criterios. El orden de las filas define la prioridad."],
  ["Nenhum critério de ordenação", "Ningún criterio de orden"],
  ["Adicione um critério para ordenar ou aplique para voltar à ordem manual.", "Agregue un criterio para ordenar o aplique para volver al orden manual."],
  ["Direção", "Dirección"],
  ["Remover critério", "Quitar criterio"],
  ["Adicionar critério", "Agregar criterio"],
  ["Cancelar", "Cancelar"],
  ["Aplicar", "Aplicar"],
  ["Campos personalizados", "Campos personalizados"],
  ["Atividades", "Actividades"],
  ["Atendimento", "Atención"],
  ["Título do negócio", "Título del negocio"],
  ["Última atualização", "Última actualización"],
  ["Valor do negócio", "Valor del negocio"],
  ["Previsão de fechamento", "Previsión de cierre"],
  ["Data de ganho", "Fecha de ganado"],
  ["Data de perdido", "Fecha de perdido"],
  ["Atividades em aberto", "Actividades abiertas"],
  ["Última mensagem", "Último mensaje"],
  ["Mensagens não lidas", "Mensajes no leídos"],
  ["Alfabético de A a Z", "Alfabético de la A a la Z"],
  ["Alfabético de Z a A", "Alfabético de la Z a la A"],
  ["Menor tempo na etapa", "Menor tiempo en la etapa"],
  ["Maior tempo na etapa", "Mayor tiempo en la etapa"],
  ["Crescente", "Ascendente"],
  ["Decrescente", "Descendente"],
  ["Filtros salvos", "Filtros guardados"],
  ["alterado", "modificado"],
  ["Salvar filtro atual…", "Guardar filtro actual…"],
  ["Salvar alterações neste filtro", "Guardar cambios en este filtro"],
  ["Renomear ou compartilhar…", "Renombrar o compartir…"],
  ["Excluir filtro", "Eliminar filtro"],
  ["Não consegui carregar os filtros salvos.", "No pude cargar los filtros guardados."],
  ["Nenhum filtro salvo ainda.", "Todavía no hay filtros guardados."],
  ["Meus filtros", "Mis filtros"],
  ["Compartilhados com você", "Compartidos con usted"],
  ["Compartilhado", "Compartido"],
  ["Limite de 20 filtros salvos atingido. Exclua algum para salvar outro.", "Se alcanzó el límite de 20 filtros guardados. Elimine alguno para guardar otro."],
  ["Filtro atualizado.", "Filtro actualizado."],
  ["Excluir o filtro «{nome}»?", "¿Eliminar el filtro «{nome}»?"],
  ["Ele some para você e, se estiver compartilhado, para todo mundo. Nenhum negócio é tocado.", "Desaparece para usted y, si está compartido, para todos. No se toca ningún negocio."],
  ["Excluir", "Eliminar"],
  ["Filtro excluído.", "Filtro eliminado."],
  ["Editar filtro salvo", "Editar filtro guardado"],
  ["Salvar filtro", "Guardar filtro"],
  ["O nome e quem vê. Para mudar os critérios, aplique o filtro, ajuste e use “Salvar alterações neste filtro”.", "El nombre y quién lo ve. Para cambiar los criterios, aplique el filtro, ajústelo y use “Guardar cambios en este filtro”."],
  ["Salva os filtros, o status e a ordenação que estão na tela agora.", "Guarda los filtros, el estado y el orden que están en pantalla ahora."],
  ["Nome do filtro", "Nombre del filtro"],
  ["Ex.: Clientes em aberto", "Ej.: Clientes abiertos"],
  ["Compartilhar com quem vê esta origem", "Compartir con quien ve este origen"],
  ["Compartilhar com quem vê esta visualização", "Compartir con quien ve esta vista"],
  ["Filtro compartilhado aparece para quem tem acesso. Só você muda ou exclui.", "El filtro compartido aparece para quien tiene acceso. Solo usted lo cambia o elimina."],
  ["Salvar", "Guardar"],
  ["Filtro salvo.", "Filtro guardado."],
  ["Você já tem um filtro com esse nome aqui.", "Ya tiene un filtro con ese nombre aquí."],
  ["Dê um nome ao filtro.", "Dé un nombre al filtro."],
  ["O nome do filtro pode ter até 60 caracteres.", "El nombre del filtro puede tener hasta 60 caracteres."],
  ["Diga de qual origem ou visualização são os filtros.", "Indique de qué origen o vista son los filtros."],
  ["Origem ou visualização não encontrada.", "Origen o vista no encontrado."],
  ["Filtro não encontrado.", "Filtro no encontrado."],
  ["Esse filtro já existe.", "Ese filtro ya existe."],
  ["Só quem criou o filtro pode mudá-lo.", "Solo quien creó el filtro puede cambiarlo."],
  ["Corpo não é JSON válido.", "El cuerpo no es un JSON válido."],
  ["Não consegui completar essa ação. Tente de novo.", "No pude completar esa acción. Intente de nuevo."],
];
let texto = fs.readFileSync(ARQ, "utf8");
if (texto.includes(CAB)) throw new Error("o bloco da 1D já está no dicionário");
const i = texto.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 1C não encontrada");
const fimDaEntrada = /\r?\n  \},/.exec(texto.slice(i));
if (!fimDaEntrada) throw new Error("fim da entrada da âncora não encontrado");
const depois = i + fimDaEntrada.index + fimDaEntrada[0].length;
const eol = texto.includes("\r\n") ? "\r\n" : "\n";
const vistas = new Set();
const novas = [];
const puladas = [];
for (const [pt, es] of ENTRADAS) {
  if (vistas.has(pt)) continue;
  vistas.add(pt);
  if (texto.includes(JSON.stringify(pt) + ":")) {
    puladas.push(pt);
    continue;
  }
  novas.push(`  ${JSON.stringify(pt)}: { es: ${JSON.stringify(es)} },`);
}
texto = texto.slice(0, depois) + eol + [CAB, ...novas].join(eol) + texto.slice(depois);
fs.writeFileSync(ARQ, texto);
console.log(`${novas.length} entradas novas; já existiam ${puladas.length}: ${puladas.join(" | ")}`);
NODE
```
Expected: uma linha `N entradas novas; já existiam M: …`. N + M é o tamanho da lista sem repetidas. As que já existiam (por exemplo `Cancelar`, `Salvar`, `Todos`, `Limpar filtros`, `Apenas atrasados`) ficam com a tradução de antes, e está certo assim.

- [ ] **Step 2: Os dois ícones**

Em `lib/ui/icons.ts`, logo DEPOIS da linha `  FrameCorners,`, acrescente:

```ts
  // quadro de negócios (Fase 1D): ordenar e filtros salvos
  ArrowsDownUp,
  BookmarkSimple,
```

- [ ] **Step 3: Conferir o dicionário e o typecheck**

```bash
corepack pnpm vitest run tests/unit/i18n lib/ui/icons.test.ts
corepack pnpm typecheck
```
Expected: os testes de i18n (`tests/unit/i18n-*`) e o dos ícones PASS; typecheck sem erros novos. Chave repetida aparece como `An object literal cannot have multiple properties with the same name`. Se isso acontecer, apague a linha nova repetida do bloco da 1D.

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/dicionario.ts lib/ui/icons.ts
git commit -m "feat(escale): textos em espanhol e ícones dos filtros do quadro

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 9: O painel de filtros, o status e o resumo

**Files:**
- Create: `components/escale/filtros/controles.tsx`, `components/escale/filtros/SecaoNegocio.tsx`, `components/escale/filtros/SecaoConversas.tsx`, `components/escale/filtros/SecaoTags.tsx`, `components/escale/filtros/SecaoCampos.tsx`, `components/escale/filtros/SecaoOutros.tsx`, `components/escale/filtros/PainelDeFiltros.tsx`, `components/escale/filtros/ResumoDosFiltros.tsx`, `components/escale/filtros/StatusDoQuadro.tsx`, `tests/unit/escale-painel-de-filtros.test.tsx`

**Interfaces:**
- Consumes:
  - Tasks 3 e 4: `FiltrosDoQuadro`, `contarPorSecao`, `limparSecao`, `criteriosAtivos`, `removerCriterio`, `normalizarStatus`, `STATUS_DO_NEGOCIO`, `CANAIS_DA_CONVERSA`, `SEM_ATENDENTE`, `CONDICOES_DE_CAMPO_MAX`, `CampoFiltravel`, `chaveDoCampo`, `operadoresDoTipo`, `condicaoNova` e `numeroDoValor`;
  - Task 8: os textos e os ícones;
  - do original: `useUser`/`useActiveOrg` (`@/hooks/auth/AuthProvider`), `useAssignableMembers`, `useAssignableAgents`, `agentOwnerFilter`, `marcadoresDoCard`, `PontoDaEtiqueta`, `categoriaDoMotivo`, `rotuloDoMotivoDePerda`, `simboloDaMoeda`/`MOEDA_PADRAO` (`@/lib/money`) e os componentes de `components/ui`.
- Produces:
  - `<StatusDoQuadro status onMudar(status: StatusDoNegocio[]) />`;
  - `<PainelDeFiltros filtros onMudar(filtros) leads campos settings? />`;
  - `<ResumoDosFiltros filtros onMudar(filtros) onLimpar() />`;
  - de `controles.tsx`: `CampoNumerico`, `CampoDeTexto`, `Caixinha`, `RotuloDoGrupo`, `classeDoSeletor` e `alternarNaLista`.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Create `tests/unit/escale-painel-de-filtros.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u-ana", full_name: "Ana" }] }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: [] }) }));

import { PainelDeFiltros } from "@/components/escale/filtros/PainelDeFiltros";
import { ResumoDosFiltros } from "@/components/escale/filtros/ResumoDosFiltros";
import { StatusDoQuadro } from "@/components/escale/filtros/StatusDoQuadro";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

// Polyfills que o Radix exige e o jsdom não tem (mesmo padrão de trocar-funil.test.tsx).
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const LEADS = [negocio("l1", { tags: ["vip"], contact_tags: ["quente"] }), negocio("l2", { status: "lost", lost_reason: "price" })];
const CAMPOS = camposFiltraveis([{ fields: [{ key: "renda", label: "Renda", type: "number" }] }]);
const novoUsuario = () => userEvent.setup({ pointerEventsCheck: 0 });

function painel(filtros: FiltrosDoQuadro) {
  const onMudar = vi.fn();
  render(<PainelDeFiltros filtros={filtros} onMudar={onMudar} leads={LEADS} campos={CAMPOS} settings={{}} />);
  return { onMudar, u: novoUsuario() };
}

async function abrir(u: ReturnType<typeof novoUsuario>, secao?: RegExp) {
  await u.click(screen.getByRole("button", { name: /Filtros/ }));
  if (secao) await u.click(await screen.findByRole("button", { name: secao }));
}

describe("<StatusDoQuadro>", () => {
  it("mostra Em aberto, junta Ganhos, não deixa o último sair e mostra todos", async () => {
    const onMudar = vi.fn();
    render(<StatusDoQuadro status={["open"]} onMudar={onMudar} />);
    const u = novoUsuario();
    await u.click(screen.getByRole("button", { name: /Em aberto/ }));
    await u.click(screen.getByRole("menuitemcheckbox", { name: "Ganhos" }));
    expect(onMudar).toHaveBeenLastCalledWith(["open", "won"]);
    await u.click(screen.getByRole("menuitemcheckbox", { name: "Em aberto" }));
    expect(onMudar).toHaveBeenCalledTimes(1);
    await u.click(screen.getByRole("menuitem", { name: "Mostrar todos" }));
    expect(onMudar).toHaveBeenLastCalledWith(["open", "won", "lost"]);
  });

  it("o rótulo resume o que está marcado", () => {
    const { rerender } = render(<StatusDoQuadro status={["open", "lost"]} onMudar={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("Em aberto + Perdidos");
    rerender(<StatusDoQuadro status={["open", "won", "lost"]} onMudar={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("Todos os status");
  });
});

describe("<PainelDeFiltros>", () => {
  it("o botão conta os critérios, e o X de uma seção limpa só ela", async () => {
    const { onMudar, u } = painel({ status: ["open"], conversa: { naoLidas: true }, tags: ["vip"] });
    expect(screen.getByRole("button", { name: /Filtros/ })).toHaveTextContent(/Filtros\s*2/);
    await abrir(u);
    await u.click(screen.getByRole("button", { name: "Limpar: Conversas" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open"], tags: ["vip"] });
  });

  it("Negócio: dono, valor (digitado em reais, guardado em centavos) e data de criação", async () => {
    const { onMudar, u } = painel({ status: ["open"] });
    await abrir(u);
    await u.selectOptions(screen.getByRole("combobox", { name: "Dono do negócio" }), "u-ana");
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], dono: "u-ana" });
    await u.type(screen.getByRole("textbox", { name: "Mínimo" }), "1.500");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], valor: { min: 150000 } });
    fireEvent.change(screen.getByLabelText("Criado a partir de"), { target: { value: "2026-10-01" } });
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], criadoEm: { de: "2026-10-01" } });
    expect(screen.queryByRole("combobox", { name: "Motivo de perda" })).not.toBeInTheDocument();
  });

  it("Negócio com perdidos no status: o motivo de perda vem dos cards perdidos", async () => {
    const { onMudar, u } = painel({ status: ["open", "lost"] });
    await abrir(u);
    await u.selectOptions(screen.getByRole("combobox", { name: "Motivo de perda" }), "price");
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open", "lost"], motivoDePerda: "price" });
  });

  it("Conversas: não lidas e sem conversa; 'sem conversa' esconde o resto", async () => {
    const { onMudar, u } = painel({ status: ["open"] });
    await abrir(u, /^Conversas/);
    await u.click(screen.getByRole("checkbox", { name: "Não lidas" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], conversa: { naoLidas: true } });
    await u.selectOptions(screen.getByRole("combobox", { name: "Conversa" }), "sem");
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], conversa: { existe: "sem" } });
  });

  it("Conversas com 'sem conversa' marcado: os outros critérios somem", async () => {
    const { u } = painel({ status: ["open"], conversa: { existe: "sem" } });
    await abrir(u, /^Conversas/);
    expect(screen.queryByRole("checkbox", { name: "Não lidas" })).not.toBeInTheDocument();
  });

  it("Tags: as três caixas do card viram opções; com duas escolhidas, aparece o E/OU", async () => {
    const { onMudar, u } = painel({ status: ["open"] });
    await abrir(u, /^Tags/);
    expect(screen.getByRole("checkbox", { name: /quente/ })).toBeInTheDocument();
    await u.click(screen.getByRole("checkbox", { name: /vip/ }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tags: ["vip"] });
  });

  it("Tags com duas escolhidas: o OU", async () => {
    const { onMudar, u } = painel({ status: ["open"], tags: ["vip", "quente"] });
    await abrir(u, /^Tags/);
    await u.click(screen.getByRole("radio", { name: "Qualquer uma (OU)" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tags: ["vip", "quente"], modoDasTags: "ou" });
  });

  it("Campos: adicionar uma condição começa pelo primeiro campo do negócio", async () => {
    const { onMudar, u } = painel({ status: ["open"] });
    await abrir(u, /^Campos/);
    await u.click(screen.getByRole("button", { name: "Adicionar condição" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], campos: [{ alvo: "negocio", chave: "renda", op: "entre" }] });
  });

  it("Campos: a condição mostra campo, operador e valor, e sai pelo X", async () => {
    const { onMudar, u } = painel({ status: ["open"], campos: [{ alvo: "contato", chave: "nome", op: "contem", valor: "ana" }] });
    await abrir(u, /^Campos/);
    expect(screen.getByRole("combobox", { name: "Campo" })).toHaveValue("contato:nome");
    expect(screen.getByRole("combobox", { name: "Operador" })).toHaveValue("contem");
    expect(screen.getByRole("textbox", { name: "Valor" })).toHaveValue("ana");
    await u.click(screen.getByRole("button", { name: "Remover condição" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], campos: undefined });
  });

  it("Outros: atividades concluídas e tempo na etapa com a unidade escolhida", async () => {
    const { onMudar, u } = painel({ status: ["open"] });
    await abrir(u, /^Outros/);
    await u.type(screen.getByRole("textbox", { name: "Atividades concluídas: Mín." }), "2");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], atividadesConcluidas: { min: 2 } });
    await u.selectOptions(screen.getByRole("combobox", { name: "Tempo na etapa: Unidade" }), "horas");
    await u.type(screen.getByRole("textbox", { name: "Tempo na etapa: Máx." }), "10");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tempoNaEtapa: { max: 10, unidade: "horas" } });
  });
});

describe("<ResumoDosFiltros>", () => {
  it("mostra os critérios ativos, tira um por vez e limpa tudo", async () => {
    const onMudar = vi.fn();
    const onLimpar = vi.fn();
    render(
      <ResumoDosFiltros
        filtros={{ status: ["open"], tags: ["vip", "quente"], tempoNaEtapa: { min: 2, unidade: "dias" } }}
        onMudar={onMudar}
        onLimpar={onLimpar}
      />,
    );
    expect(screen.getByText("2 tags")).toBeInTheDocument();
    expect(screen.getByText("Tempo na etapa")).toBeInTheDocument();
    const u = novoUsuario();
    await u.click(screen.getByRole("button", { name: "Remover filtro: 2 tags" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open"], tempoNaEtapa: { min: 2, unidade: "dias" } });
    await u.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onLimpar).toHaveBeenCalled();
  });

  it("sem critério nenhum, não aparece", () => {
    const { container } = render(<ResumoDosFiltros filtros={{ status: ["open"] }} onMudar={vi.fn()} onLimpar={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-painel-de-filtros.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/components/escale/filtros/PainelDeFiltros"`.

- [ ] **Step 3: As peças pequenas**

Create `components/escale/filtros/controles.tsx`:

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { numeroDoValor } from "@/lib/escale/filtros/campos";
import { cn } from "@/lib/utils";

/**
 * Peças pequenas do painel de filtros (fork Escale, Fase 1D).
 *
 * Número e texto só valem quando a pessoa TERMINA de digitar (sai do campo ou dá
 * Enter): cada tecla seria uma troca de URL, e "1," no meio do caminho seria lido
 * como 1. Quem usa dá `key` com o valor de fora, para "Limpar" refletir aqui.
 */
export const classeDoSeletor = "h-9 w-full rounded-md border border-border bg-background px-2 text-sm";

export function RotuloDoGrupo({ children, ajuda }: { children: ReactNode; ajuda?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>
      {ajuda ? <p className="text-xs text-muted-foreground">{ajuda}</p> : null}
    </div>
  );
}

export function Caixinha({
  marcada,
  onMudar,
  children,
}: {
  marcada: boolean;
  onMudar: (marcada: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex cursor-pointer select-none items-center gap-2 text-sm", marcada && "font-medium")}>
      <input type="checkbox" checked={marcada} onChange={(e) => onMudar(e.target.checked)} />
      {children}
    </label>
  );
}

export function CampoNumerico({
  rotulo,
  dica,
  valor,
  onMudar,
}: {
  rotulo: string;
  dica?: string;
  valor: number | undefined;
  onMudar: (valor: number | undefined) => void;
}) {
  const [texto, setTexto] = useState(valor === undefined ? "" : String(valor));
  function confirmar() {
    if (texto.trim() === "") {
      if (valor !== undefined) onMudar(undefined);
      return;
    }
    const n = numeroDoValor(texto);
    if (n !== null && n >= 0) {
      if (n !== valor) onMudar(n);
      return;
    }
    setTexto(valor === undefined ? "" : String(valor));
  }
  return (
    <Input
      aria-label={rotulo}
      placeholder={dica ?? rotulo}
      inputMode="decimal"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
      }}
      className="h-9"
    />
  );
}

export function CampoDeTexto({
  rotulo,
  valor,
  onMudar,
}: {
  rotulo: string;
  valor: string | undefined;
  onMudar: (valor: string | undefined) => void;
}) {
  const [texto, setTexto] = useState(valor ?? "");
  function confirmar() {
    const limpo = texto.trim() || undefined;
    if (limpo !== valor) onMudar(limpo);
  }
  return (
    <Input
      aria-label={rotulo}
      placeholder={rotulo}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
      }}
      className="h-9"
    />
  );
}

/** Marca ou desmarca `valor`; a lista vazia vira `undefined` (filtro desligado). */
export function alternarNaLista<T>(lista: readonly T[] | undefined, valor: T): T[] | undefined {
  const atual = lista ?? [];
  const proxima = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
  return proxima.length > 0 ? proxima : undefined;
}
```

- [ ] **Step 4: O status**

Create `components/escale/filtros/StatusDoQuadro.tsx`:

```tsx
"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { STATUS_DO_NEGOCIO, normalizarStatus, type StatusDoNegocio } from "@/lib/escale/filtros/tipos";
import { CaretDown } from "@/lib/ui/icons";

const ROTULOS: Record<StatusDoNegocio, string> = { open: "Em aberto", won: "Ganhos", lost: "Perdidos" };

/**
 * O STATUS DO QUADRO (fork Escale, Fase 1D): "Em aberto" é o padrão, como na
 * Clint, e dá para juntar ganhos e perdidos. Pelo menos um fica marcado: um
 * quadro sem status nenhum seria vazio sem explicação.
 */
export function StatusDoQuadro({
  status,
  onMudar,
}: {
  status: readonly StatusDoNegocio[];
  onMudar: (status: StatusDoNegocio[]) => void;
}) {
  const t = useT();
  const rotulo =
    status.length === STATUS_DO_NEGOCIO.length ? t("Todos os status") : status.map((s) => t(ROTULOS[s])).join(" + ");

  function alternar(s: StatusDoNegocio) {
    const proximos = status.includes(s) ? status.filter((x) => x !== s) : [...status, s];
    if (proximos.length === 0) return;
    onMudar(normalizarStatus(proximos));
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" data-testid="status-do-quadro">
          {rotulo}
          <CaretDown size={14} aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{t("Status do negócio")}</DropdownMenuLabel>
        {STATUS_DO_NEGOCIO.map((s) => (
          <DropdownMenuCheckboxItem
            key={s}
            checked={status.includes(s)}
            onCheckedChange={() => alternar(s)}
            onSelect={(e) => e.preventDefault()}
          >
            {t(ROTULOS[s])}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onMudar([...STATUS_DO_NEGOCIO])}>{t("Mostrar todos")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 5: As cinco seções**

Create `components/escale/filtros/SecaoNegocio.tsx`:

```tsx
"use client";
import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { agentOwnerFilter } from "@/lib/kanban/filters";
import { categoriaDoMotivo } from "@/lib/leads/motivos-de-perda-do-funil";
import { MOEDA_PADRAO, simboloDaMoeda } from "@/lib/money";
import { rotuloDoMotivoDePerda } from "@/lib/schemas/leads";
import type { Lead } from "@/lib/types/leads";

import { Caixinha, CampoNumerico, RotuloDoGrupo, classeDoSeletor } from "./controles";

const emReais = (centavos: number | undefined) => (centavos === undefined ? undefined : centavos / 100);
const emCentavos = (reais: number | undefined) => (reais === undefined ? undefined : Math.round(reais * 100));

/** Negócio: dono, data de criação, valor, atrasados e (com perdidos no status) motivo e categoria de perda. */
export function SecaoNegocio({
  filtros,
  onMudar,
  leads,
  settings,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  leads: readonly Lead[];
  settings?: Record<string, unknown>;
}) {
  const t = useT();
  const user = useUser();
  const org = useActiveOrg();
  const { data: membros } = useAssignableMembers(true);
  const { data: agentes } = useAssignableAgents(true);
  const moeda = simboloDaMoeda(org?.currency ?? MOEDA_PADRAO);

  // As opções vêm do que ESTÁ no quadro (a regra do `FilterBar` do original).
  const motivos = useMemo(
    () =>
      [...new Set(leads.filter((l) => l.status === "lost" && l.lost_reason).map((l) => l.lost_reason as string))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [leads],
  );
  const categorias = useMemo(
    () =>
      [...new Set(motivos.map((m) => categoriaDoMotivo(m, settings)).filter((c): c is string => !!c))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [motivos, settings],
  );
  const rotuloDoMotivo = (motivo: string) => {
    const rotulo = rotuloDoMotivoDePerda(motivo);
    return rotulo === motivo ? motivo : t(rotulo);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <RotuloDoGrupo>{t("Dono do negócio")}</RotuloDoGrupo>
        <select
          aria-label={t("Dono do negócio")}
          className={classeDoSeletor}
          value={filtros.dono ?? ""}
          onChange={(e) => onMudar({ ...filtros, dono: e.target.value || undefined })}
        >
          <option value="">{t("Todos")}</option>
          <option value={user.id}>{t("Eu")}</option>
          <option value="unassigned">{t("Sem responsável")}</option>
          {(membros ?? [])
            .filter((m) => m.user_id !== user.id)
            .map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name ?? t("Sem nome")}
              </option>
            ))}
          {(agentes ?? []).map((a) => (
            <option key={a.agent_id} value={agentOwnerFilter(a.agent_id)}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <RotuloDoGrupo>{t("Data de criação")}</RotuloDoGrupo>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            aria-label={t("Criado a partir de")}
            value={filtros.criadoEm?.de ?? ""}
            onChange={(e) => onMudar({ ...filtros, criadoEm: { ...filtros.criadoEm, de: e.target.value || undefined } })}
            className="h-9"
          />
          <Input
            type="date"
            aria-label={t("Criado até")}
            value={filtros.criadoEm?.ate ?? ""}
            onChange={(e) => onMudar({ ...filtros, criadoEm: { ...filtros.criadoEm, ate: e.target.value || undefined } })}
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <RotuloDoGrupo ajuda={t("Só entram negócios na moeda da organização.")}>{`${t("Valor")} (${moeda})`}</RotuloDoGrupo>
        <div className="grid grid-cols-2 gap-2">
          <CampoNumerico
            key={`vmin:${filtros.valor?.min ?? ""}`}
            rotulo={t("Mínimo")}
            valor={emReais(filtros.valor?.min)}
            onMudar={(v) => onMudar({ ...filtros, valor: { ...filtros.valor, min: emCentavos(v) } })}
          />
          <CampoNumerico
            key={`vmax:${filtros.valor?.max ?? ""}`}
            rotulo={t("Máximo")}
            valor={emReais(filtros.valor?.max)}
            onMudar={(v) => onMudar({ ...filtros, valor: { ...filtros.valor, max: emCentavos(v) } })}
          />
        </div>
      </div>

      <Caixinha marcada={!!filtros.atrasados} onMudar={(m) => onMudar({ ...filtros, atrasados: m || undefined })}>
        {t("Apenas atrasados")}
      </Caixinha>

      {filtros.status.includes("lost") && motivos.length > 0 ? (
        <div className="space-y-2">
          <RotuloDoGrupo>{t("Motivo de perda")}</RotuloDoGrupo>
          <select
            aria-label={t("Motivo de perda")}
            className={classeDoSeletor}
            value={filtros.motivoDePerda ?? ""}
            onChange={(e) => onMudar({ ...filtros, motivoDePerda: e.target.value || undefined })}
          >
            <option value="">{t("Todos")}</option>
            {motivos.map((m) => (
              <option key={m} value={m}>
                {rotuloDoMotivo(m)}
              </option>
            ))}
          </select>
          {categorias.length > 0 ? (
            <select
              aria-label={t("Categoria de perda")}
              className={classeDoSeletor}
              value={filtros.categoriaDePerda ?? ""}
              onChange={(e) => onMudar({ ...filtros, categoriaDePerda: e.target.value || undefined })}
            >
              <option value="">{t("Todas")}</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
```

Create `components/escale/filtros/SecaoConversas.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import {
  SEM_ATENDENTE,
  type CanalDaConversa,
  type FiltroDeConversa,
  type FiltrosDoQuadro,
} from "@/lib/escale/filtros/tipos";

import { Caixinha, RotuloDoGrupo, alternarNaLista, classeDoSeletor } from "./controles";

/** Nomes de marca: iguais em todo idioma. */
const CANAIS: ReadonlyArray<{ valor: CanalDaConversa; nome: string }> = [
  { valor: "whatsapp", nome: "WhatsApp" },
  { valor: "instagram", nome: "Instagram" },
  { valor: "facebook", nome: "Facebook" },
];

/**
 * Conversas (Clint: "Conversas"), adaptado ao que o original tem: com ou sem
 * conversa, não lidas, não respondidas, status, canal e atendente. Olha a
 * conversa MAIS RECENTE do contato — a mesma que a capa do card mostra. O
 * original não tem setor; quando tiver, entra aqui.
 */
export function SecaoConversas({ filtros, onMudar }: { filtros: FiltrosDoQuadro; onMudar: (filtros: FiltrosDoQuadro) => void }) {
  const t = useT();
  const { data: membros } = useAssignableMembers(true);
  const c = filtros.conversa ?? {};
  const mudar = (parcial: Partial<FiltroDeConversa>) => onMudar({ ...filtros, conversa: { ...c, ...parcial } });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <RotuloDoGrupo>{t("Conversa")}</RotuloDoGrupo>
        <select
          aria-label={t("Conversa")}
          className={classeDoSeletor}
          value={c.existe ?? ""}
          onChange={(e) => {
            const existe = e.target.value;
            mudar({ existe: existe === "com" || existe === "sem" ? existe : undefined });
          }}
        >
          <option value="">{t("Com ou sem conversa")}</option>
          <option value="com">{t("Com conversa")}</option>
          <option value="sem">{t("Sem conversa")}</option>
        </select>
      </div>

      {c.existe === "sem" ? null : (
        <>
          <div className="space-y-2">
            <Caixinha marcada={!!c.naoLidas} onMudar={(m) => mudar({ naoLidas: m || undefined })}>
              {t("Não lidas")}
            </Caixinha>
            <Caixinha marcada={!!c.semResposta} onMudar={(m) => mudar({ semResposta: m || undefined })}>
              {t("Não respondidas pelo atendente")}
            </Caixinha>
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Status da conversa")}</RotuloDoGrupo>
            <Caixinha marcada={!!c.situacao?.includes("aberta")} onMudar={() => mudar({ situacao: alternarNaLista(c.situacao, "aberta") })}>
              {t("Aberta")}
            </Caixinha>
            <Caixinha
              marcada={!!c.situacao?.includes("encerrada")}
              onMudar={() => mudar({ situacao: alternarNaLista(c.situacao, "encerrada") })}
            >
              {t("Encerrada")}
            </Caixinha>
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Canais")}</RotuloDoGrupo>
            {CANAIS.map((canal) => (
              <Caixinha
                key={canal.valor}
                marcada={!!c.canais?.includes(canal.valor)}
                onMudar={() => mudar({ canais: alternarNaLista(c.canais, canal.valor) })}
              >
                {canal.nome}
              </Caixinha>
            ))}
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Atendentes")}</RotuloDoGrupo>
            <Caixinha
              marcada={!!c.atendentes?.includes(SEM_ATENDENTE)}
              onMudar={() => mudar({ atendentes: alternarNaLista(c.atendentes, SEM_ATENDENTE) })}
            >
              {t("Não atribuídos")}
            </Caixinha>
            {(membros ?? []).map((m) => (
              <Caixinha
                key={m.user_id}
                marcada={!!c.atendentes?.includes(m.user_id)}
                onMudar={() => mudar({ atendentes: alternarNaLista(c.atendentes, m.user_id) })}
              >
                {m.full_name ?? t("Sem nome")}
              </Caixinha>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

Create `components/escale/filtros/SecaoTags.tsx`:

```tsx
"use client";
import { useMemo } from "react";

import { PontoDaEtiqueta } from "@/components/tags/PontoDaEtiqueta";
import { useT } from "@/hooks/i18n/useT";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { marcadoresDoCard } from "@/lib/kanban/marcadores-do-card";
import type { Lead } from "@/lib/types/leads";

import { Caixinha, alternarNaLista } from "./controles";

/**
 * Tags: as TRÊS caixas do card (negócio, contato e conversa), a mesma régua de
 * quem filtra (`applyFilters`). Com duas ou mais escolhidas, E ou OU.
 */
export function SecaoTags({
  filtros,
  onMudar,
  leads,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  leads: readonly Lead[];
}) {
  const t = useT();
  const opcoes = useMemo(
    () => [...new Set(leads.flatMap((l) => marcadoresDoCard(l)))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [leads],
  );
  const escolhidas = filtros.tags ?? [];

  if (opcoes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("Nenhuma tag nos negócios deste quadro.")}</p>;
  }

  return (
    <div className="space-y-3">
      {escolhidas.length > 1 ? (
        <div role="radiogroup" aria-label={t("Como juntar as tags")} className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="modo-das-tags"
              checked={filtros.modoDasTags !== "ou"}
              onChange={() => onMudar({ ...filtros, modoDasTags: undefined })}
            />
            {t("Todas (E)")}
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="modo-das-tags"
              checked={filtros.modoDasTags === "ou"}
              onChange={() => onMudar({ ...filtros, modoDasTags: "ou" })}
            />
            {t("Qualquer uma (OU)")}
          </label>
        </div>
      ) : null}
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {opcoes.map((tag) => (
          <Caixinha
            key={tag}
            marcada={escolhidas.includes(tag)}
            onMudar={() => onMudar({ ...filtros, tags: alternarNaLista(filtros.tags, tag) })}
          >
            <PontoDaEtiqueta tag={tag} />
            {tag}
          </Caixinha>
        ))}
      </div>
    </div>
  );
}
```

Create `components/escale/filtros/SecaoCampos.tsx`:

```tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";
import {
  chaveDoCampo,
  condicaoNova,
  operadoresDoTipo,
  type CampoFiltravel,
} from "@/lib/escale/filtros/campos";
import {
  CONDICOES_DE_CAMPO_MAX,
  type CondicaoDeCampo,
  type FiltrosDoQuadro,
  type OperadorDeCampo,
} from "@/lib/escale/filtros/tipos";
import { Plus, X } from "@/lib/ui/icons";

import { CampoDeTexto, CampoNumerico, classeDoSeletor } from "./controles";

const ROTULO_DO_OPERADOR: Record<OperadorDeCampo, string> = {
  contem: "contém",
  igual: "é igual a",
  entre: "está entre",
  preenchido: "está preenchido",
  vazio: "está vazio",
};

/**
 * Campos (Clint: "Campos"): condições sobre os campos personalizados do negócio
 * e os campos fixos do contato. As condições se somam (E).
 */
export function SecaoCampos({
  filtros,
  onMudar,
  campos,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  campos: readonly CampoFiltravel[];
}) {
  const t = useT();
  const condicoes = filtros.campos ?? [];
  const porChave = new Map(campos.map((c) => [chaveDoCampo(c), c]));
  const doNegocio = campos.filter((c) => c.alvo === "negocio");
  const doContato = campos.filter((c) => c.alvo === "contato");
  const primeiro = doNegocio[0] ?? doContato[0];

  function trocar(indice: number, nova: CondicaoDeCampo | null) {
    const proximas = nova === null ? condicoes.filter((_, j) => j !== indice) : condicoes.map((c, j) => (j === indice ? nova : c));
    onMudar({ ...filtros, campos: proximas.length > 0 ? proximas : undefined });
  }

  return (
    <div className="space-y-3">
      {condicoes.map((condicao, indice) => {
        const campo = porChave.get(chaveDoCampo(condicao));
        const tipo = campo?.tipo ?? "texto";
        return (
          <fieldset key={indice} className="space-y-2 rounded-md border border-border p-2">
            <legend className="sr-only">{`${t("Condição")} ${indice + 1}`}</legend>
            <div className="flex gap-2">
              <select
                aria-label={t("Campo")}
                className={classeDoSeletor}
                value={chaveDoCampo(condicao)}
                onChange={(e) => {
                  const novo = porChave.get(e.target.value);
                  if (novo) trocar(indice, condicaoNova(novo));
                }}
              >
                {campo ? null : <option value={chaveDoCampo(condicao)}>{condicao.chave}</option>}
                {doNegocio.length > 0 ? (
                  <optgroup label={t("Negócio")}>
                    {doNegocio.map((c) => (
                      <option key={chaveDoCampo(c)} value={chaveDoCampo(c)}>
                        {c.rotulo}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <optgroup label={t("Contato")}>
                  {doContato.map((c) => (
                    <option key={chaveDoCampo(c)} value={chaveDoCampo(c)}>
                      {t(c.rotulo)}
                    </option>
                  ))}
                </optgroup>
              </select>
              <button
                type="button"
                aria-label={t("Remover condição")}
                onClick={() => trocar(indice, null)}
                className="shrink-0 rounded-md px-2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
            <select
              aria-label={t("Operador")}
              className={classeDoSeletor}
              value={condicao.op}
              onChange={(e) => {
                const op = e.target.value as OperadorDeCampo;
                trocar(indice, { alvo: condicao.alvo, chave: condicao.chave, op, ...(tipo === "booleano" ? { valor: "true" } : {}) });
              }}
            >
              {operadoresDoTipo(tipo).map((op) => (
                <option key={op} value={op}>
                  {t(ROTULO_DO_OPERADOR[op])}
                </option>
              ))}
            </select>
            <ValorDaCondicao condicao={condicao} campo={campo} onMudar={(nova) => trocar(indice, nova)} />
          </fieldset>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!primeiro || condicoes.length >= CONDICOES_DE_CAMPO_MAX}
        onClick={() => primeiro && onMudar({ ...filtros, campos: [...condicoes, condicaoNova(primeiro)] })}
      >
        <Plus size={14} className="mr-1" aria-hidden />
        {t("Adicionar condição")}
      </Button>
    </div>
  );
}

function ValorDaCondicao({
  condicao: c,
  campo,
  onMudar,
}: {
  condicao: CondicaoDeCampo;
  campo: CampoFiltravel | undefined;
  onMudar: (nova: CondicaoDeCampo) => void;
}) {
  const t = useT();
  if (c.op === "preenchido" || c.op === "vazio") return null;
  const tipo = campo?.tipo ?? "texto";

  if (tipo === "booleano") {
    return (
      <select aria-label={t("Valor")} className={classeDoSeletor} value={c.valor ?? "true"} onChange={(e) => onMudar({ ...c, valor: e.target.value })}>
        <option value="true">{t("Sim")}</option>
        <option value="false">{t("Não")}</option>
      </select>
    );
  }
  if ((tipo === "opcao" || tipo === "opcoes") && campo?.opcoes?.length) {
    return (
      <select
        aria-label={t("Valor")}
        className={classeDoSeletor}
        value={c.valor ?? ""}
        onChange={(e) => onMudar({ ...c, valor: e.target.value || undefined })}
      >
        <option value="">{t("Escolha")}</option>
        {campo.opcoes.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (c.op === "entre" && tipo === "data") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" aria-label={t("De")} value={c.valor ?? ""} onChange={(e) => onMudar({ ...c, valor: e.target.value || undefined })} className="h-9" />
        <Input type="date" aria-label={t("Até")} value={c.ate ?? ""} onChange={(e) => onMudar({ ...c, ate: e.target.value || undefined })} className="h-9" />
      </div>
    );
  }
  if (c.op === "entre") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <CampoNumerico
          key={`min:${c.valor ?? ""}`}
          rotulo={t("Mínimo")}
          valor={c.valor ? Number(c.valor) : undefined}
          onMudar={(v) => onMudar({ ...c, valor: v === undefined ? undefined : String(v) })}
        />
        <CampoNumerico
          key={`max:${c.ate ?? ""}`}
          rotulo={t("Máximo")}
          valor={c.ate ? Number(c.ate) : undefined}
          onMudar={(v) => onMudar({ ...c, ate: v === undefined ? undefined : String(v) })}
        />
      </div>
    );
  }
  return <CampoDeTexto key={`txt:${c.valor ?? ""}`} rotulo={t("Valor")} valor={c.valor} onMudar={(v) => onMudar({ ...c, valor: v })} />;
}
```

Create `components/escale/filtros/SecaoOutros.tsx`:

```tsx
"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { FiltrosDoQuadro, IntervaloDeTempo, UnidadeDeTempo } from "@/lib/escale/filtros/tipos";

import { CampoNumerico, RotuloDoGrupo, classeDoSeletor } from "./controles";

type ChaveDeTempo = "tempoNaEtapa" | "tempoDesdeEntrada";

/**
 * Outros (Clint: "ATIVIDADES CONCLUÍDAS Min/Max" e "TEMPO NA ETAPA Min/Max +
 * dias na etapa"), mais o tempo desde a entrada que o usuário descreveu. A
 * unidade escolhida sem número ainda fica guardada aqui, para não se perder.
 */
export function SecaoOutros({ filtros, onMudar }: { filtros: FiltrosDoQuadro; onMudar: (filtros: FiltrosDoQuadro) => void }) {
  const t = useT();
  const [unidadeNaEtapa, setUnidadeNaEtapa] = useState<UnidadeDeTempo>(filtros.tempoNaEtapa?.unidade ?? "dias");
  const [unidadeDesdeEntrada, setUnidadeDesdeEntrada] = useState<UnidadeDeTempo>(filtros.tempoDesdeEntrada?.unidade ?? "dias");
  const atividades = filtros.atividadesConcluidas;
  const rotuloDasAtividades = t("Atividades concluídas");

  function mudarTempo(chave: ChaveDeTempo, unidade: UnidadeDeTempo, parcial: { min?: number; max?: number }) {
    const novo: IntervaloDeTempo = { ...filtros[chave], ...parcial, unidade };
    onMudar(chave === "tempoNaEtapa" ? { ...filtros, tempoNaEtapa: novo } : { ...filtros, tempoDesdeEntrada: novo });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <RotuloDoGrupo ajuda={t("Conta as atividades marcadas como concluídas neste negócio.")}>{rotuloDasAtividades}</RotuloDoGrupo>
        <div className="grid grid-cols-2 gap-2">
          <CampoNumerico
            key={`amin:${atividades?.min ?? ""}`}
            rotulo={`${rotuloDasAtividades}: ${t("Mín.")}`}
            dica={t("Mín.")}
            valor={atividades?.min}
            onMudar={(v) => onMudar({ ...filtros, atividadesConcluidas: { ...atividades, min: v } })}
          />
          <CampoNumerico
            key={`amax:${atividades?.max ?? ""}`}
            rotulo={`${rotuloDasAtividades}: ${t("Máx.")}`}
            dica={t("Máx.")}
            valor={atividades?.max}
            onMudar={(v) => onMudar({ ...filtros, atividadesConcluidas: { ...atividades, max: v } })}
          />
        </div>
      </div>
      <BlocoDeTempo
        titulo={t("Tempo na etapa")}
        ajuda={t("Conta desde a última vez que o negócio entrou na etapa em que está.")}
        intervalo={filtros.tempoNaEtapa}
        unidade={unidadeNaEtapa}
        rotulos={{ dias: t("dias na etapa"), horas: t("horas na etapa") }}
        onUnidade={(u) => {
          setUnidadeNaEtapa(u);
          if (filtros.tempoNaEtapa) mudarTempo("tempoNaEtapa", u, {});
        }}
        onIntervalo={(parcial) => mudarTempo("tempoNaEtapa", unidadeNaEtapa, parcial)}
      />
      <BlocoDeTempo
        titulo={t("Tempo desde a entrada")}
        ajuda={t("Conta desde que o negócio foi criado nesta origem.")}
        intervalo={filtros.tempoDesdeEntrada}
        unidade={unidadeDesdeEntrada}
        rotulos={{ dias: t("dias desde a entrada"), horas: t("horas desde a entrada") }}
        onUnidade={(u) => {
          setUnidadeDesdeEntrada(u);
          if (filtros.tempoDesdeEntrada) mudarTempo("tempoDesdeEntrada", u, {});
        }}
        onIntervalo={(parcial) => mudarTempo("tempoDesdeEntrada", unidadeDesdeEntrada, parcial)}
      />
    </div>
  );
}

function BlocoDeTempo({
  titulo,
  ajuda,
  intervalo,
  unidade,
  rotulos,
  onUnidade,
  onIntervalo,
}: {
  titulo: string;
  ajuda: string;
  intervalo: IntervaloDeTempo | undefined;
  unidade: UnidadeDeTempo;
  rotulos: Record<UnidadeDeTempo, string>;
  onUnidade: (unidade: UnidadeDeTempo) => void;
  onIntervalo: (parcial: { min?: number; max?: number }) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-1.5">
      <RotuloDoGrupo ajuda={ajuda}>{titulo}</RotuloDoGrupo>
      <div className="grid grid-cols-2 gap-2">
        <CampoNumerico
          key={`min:${intervalo?.min ?? ""}`}
          rotulo={`${titulo}: ${t("Mín.")}`}
          dica={t("Mín.")}
          valor={intervalo?.min}
          onMudar={(v) => onIntervalo({ min: v })}
        />
        <CampoNumerico
          key={`max:${intervalo?.max ?? ""}`}
          rotulo={`${titulo}: ${t("Máx.")}`}
          dica={t("Máx.")}
          valor={intervalo?.max}
          onMudar={(v) => onIntervalo({ max: v })}
        />
      </div>
      <select
        aria-label={`${titulo}: ${t("Unidade")}`}
        className={classeDoSeletor}
        value={unidade}
        onChange={(e) => onUnidade(e.target.value === "horas" ? "horas" : "dias")}
      >
        <option value="dias">{rotulos.dias}</option>
        <option value="horas">{rotulos.horas}</option>
      </select>
    </div>
  );
}
```

- [ ] **Step 6: O painel e o resumo**

Create `components/escale/filtros/PainelDeFiltros.tsx`:

```tsx
"use client";
import { useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import { contarPorSecao, limparSecao, type FiltrosDoQuadro, type SecaoDeFiltro } from "@/lib/escale/filtros/tipos";
import type { Lead } from "@/lib/types/leads";
import { CaretDown, CaretUp, ChatCircle, ClipboardText, DotsThree, Funnel, Kanban, Tag, X } from "@/lib/ui/icons";

import { SecaoCampos } from "./SecaoCampos";
import { SecaoConversas } from "./SecaoConversas";
import { SecaoNegocio } from "./SecaoNegocio";
import { SecaoOutros } from "./SecaoOutros";
import { SecaoTags } from "./SecaoTags";

const SECOES: ReadonlyArray<{ id: SecaoDeFiltro; titulo: string; Icone: ComponentType<{ size?: number; "aria-hidden"?: boolean }> }> = [
  { id: "negocio", titulo: "Negócio", Icone: Kanban },
  { id: "conversas", titulo: "Conversas", Icone: ChatCircle },
  { id: "tags", titulo: "Tags", Icone: Tag },
  { id: "campos", titulo: "Campos", Icone: ClipboardText },
  { id: "outros", titulo: "Outros", Icone: DotsThree },
];

/**
 * O BOTÃO "FILTROS" E O PAINEL DE ACORDEÕES (fork Escale, Fase 1D; ficha 01-018
 * da Clint): Negócio, Conversas, Tags, Campos e Outros. Cada seção mostra quantos
 * critérios tem ligados e um X que limpa só ela. Filtros de seções diferentes se
 * somam.
 */
export function PainelDeFiltros({
  filtros,
  onMudar,
  leads,
  campos,
  settings,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  leads: readonly Lead[];
  campos: readonly CampoFiltravel[];
  settings?: Record<string, unknown>;
}) {
  const t = useT();
  const [aberta, setAberta] = useState<SecaoDeFiltro | null>("negocio");
  const contagem = contarPorSecao(filtros);
  const total = SECOES.reduce((soma, s) => soma + contagem[s.id], 0);

  function corpo(id: SecaoDeFiltro) {
    if (id === "negocio") return <SecaoNegocio filtros={filtros} onMudar={onMudar} leads={leads} settings={settings} />;
    if (id === "conversas") return <SecaoConversas filtros={filtros} onMudar={onMudar} />;
    if (id === "tags") return <SecaoTags filtros={filtros} onMudar={onMudar} leads={leads} />;
    if (id === "campos") return <SecaoCampos filtros={filtros} onMudar={onMudar} campos={campos} />;
    return <SecaoOutros filtros={filtros} onMudar={onMudar} />;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Funnel size={16} aria-hidden />
          {t("Filtros")}
          {total > 0 ? <span className="rounded-full bg-accent/15 px-1.5 text-xs font-semibold text-accent">{total}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={t("Filtros")} className="max-h-[70vh] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto p-0">
        {SECOES.map(({ id, titulo, Icone }) => (
          <section key={id} className="border-b border-border last:border-b-0">
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                type="button"
                aria-expanded={aberta === id}
                onClick={() => setAberta(aberta === id ? null : id)}
                className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
              >
                <Icone size={16} aria-hidden />
                <span>{t(titulo)}</span>
                {contagem[id] > 0 ? <span className="rounded bg-accent/15 px-1.5 text-xs text-accent">{contagem[id]}</span> : null}
                <span className="ml-auto text-muted-foreground">
                  {aberta === id ? <CaretUp size={14} aria-hidden /> : <CaretDown size={14} aria-hidden />}
                </span>
              </button>
              {contagem[id] > 0 ? (
                <button
                  type="button"
                  aria-label={`${t("Limpar")}: ${t(titulo)}`}
                  onClick={() => onMudar(limparSecao(filtros, id))}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} aria-hidden />
                </button>
              ) : null}
            </div>
            {aberta === id ? <div className="px-4 pb-4">{corpo(id)}</div> : null}
          </section>
        ))}
      </PopoverContent>
    </Popover>
  );
}
```

Create `components/escale/filtros/ResumoDosFiltros.tsx`:

```tsx
"use client";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import { criteriosAtivos, removerCriterio, type CriterioAtivo, type FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { X } from "@/lib/ui/icons";

/**
 * O RESUMO DOS FILTROS ATIVOS, visível com o painel fechado (ficha 01-018: "o
 * resumo de filtros ativos precisa permanecer visível quando o painel fechar").
 * Cada chip sai pelo X; "Limpar filtros" tira todos e solta o filtro salvo.
 */
export function ResumoDosFiltros({
  filtros,
  onMudar,
  onLimpar,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  onLimpar: () => void;
}) {
  const t = useT();
  const ativos = criteriosAtivos(filtros);
  if (ativos.length === 0) return null;

  const rotulo = (c: CriterioAtivo) => {
    const n = String(c.n ?? 0);
    if (c.id === "tags") return (c.n === 1 ? t("{n} tag") : t("{n} tags")).replace("{n}", n);
    if (c.id === "campos") return (c.n === 1 ? t("{n} campo") : t("{n} campos")).replace("{n}", n);
    return t(c.rotulo);
  };

  return (
    <div role="group" aria-label={t("Filtros ativos")} className="flex flex-wrap items-center gap-2">
      {ativos.map((c) => (
        <span key={c.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-xs">
          {rotulo(c)}
          <button
            type="button"
            aria-label={`${t("Remover filtro")}: ${rotulo(c)}`}
            onClick={() => onMudar(removerCriterio(filtros, c.id))}
            className="text-muted-foreground hover:text-foreground"
          >
            <X size={12} aria-hidden />
          </button>
        </span>
      ))}
      <Button variant="ghost" size="sm" onClick={onLimpar}>
        {t("Limpar filtros")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 7: Rodar os testes, o guarda do espanhol e o lint**

```bash
corepack pnpm vitest run tests/unit/escale-painel-de-filtros.test.tsx tests/unit/i18n
corepack pnpm exec eslint components/escale/filtros
```
Expected: PASS; o eslint sem erros (warnings de `set-state-in-effect` não devem aparecer aqui, porque nada nesta task usa effect).
- Se o guarda `i18n-espanhol-cobre-a-tela` apontar um texto sem espanhol, acrescente a entrada ao bloco da 1D no dicionário (Task 8), à mão, no mesmo formato.
- Se ele apontar "prosa portuguesa fora de `t()`" em `ROTULOS`, `ROTULO_DO_OPERADOR` ou `SECOES`, siga o padrão que o guarda aceita para listas de rótulos (o `STATUS_OPTIONS` de `components/kanban/FilterBar.tsx` é o exemplo do original) e mova a lista para `lib/escale/filtros/` se for preciso.

- [ ] **Step 8: Commit**

```bash
git add components/escale/filtros tests/unit/escale-painel-de-filtros.test.tsx
git commit -m "feat(escale): painel de filtros do quadro (Negócio, Conversas, Tags, Campos, Outros), status e resumo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Os filtros salvos na tela

**Files:**
- Create: `hooks/escale/useFiltrosSalvos.ts`, `components/escale/filtros/MenuDeFiltrosSalvos.tsx`, `components/escale/filtros/JanelaDoFiltroSalvo.tsx`, `tests/unit/escale-filtros-salvos-menu.test.tsx`

**Interfaces:**
- Consumes:
  - Task 7: as rotas, `FiltroSalvo`, `AlvoDoFiltro`, `FILTROS_SALVOS_MAX`, `NOME_DO_FILTRO_MAX`, `validarNomeDoFiltro`, `nomeRepetido`, `separarFiltrosSalvos`, `filtroAlterado` e `parametroDoAlvo`;
  - Task 9: `Caixinha`;
  - da 1C: `Alerta` (`components/escale/origens/JanelasDoGrupo`) e `textoDoErro` (`components/escale/origens/texto-do-erro`);
  - do original: `randomId` (`@/lib/random-id`), `apiClient` e `toast` (`sonner`).
- Produces:
  - hooks: `useFiltrosSalvos(alvo)`, `useCriarFiltroSalvo(alvo)`, `useMudarFiltroSalvo(alvo)` e `useExcluirFiltroSalvo(alvo)`, mais `chaveDosFiltrosSalvos(alvo)`;
  - `<MenuDeFiltrosSalvos alvo filtros filtroSalvoId onAplicar(filtros, id | null) />`;
  - `<JanelaDoFiltroSalvo alvo janela filtros meus onFechar onSalvo(id, criterios) />`.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Create `tests/unit/escale-filtros-salvos-menu.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutacoes = vi.hoisted(() => ({ criar: vi.fn(), mudar: vi.fn(), excluir: vi.fn() }));
const lista = vi.hoisted(() => ({ atual: [] as unknown[], erro: false }));

vi.mock("@/hooks/escale/useFiltrosSalvos", () => ({
  useFiltrosSalvos: () => ({ data: lista.atual, isError: lista.erro }),
  useCriarFiltroSalvo: () => ({ mutate: mutacoes.criar, isPending: false }),
  useMudarFiltroSalvo: () => ({ mutate: mutacoes.mudar, isPending: false }),
  useExcluirFiltroSalvo: () => ({ mutate: mutacoes.excluir, isPending: false }),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from "sonner";
import { MenuDeFiltrosSalvos } from "@/components/escale/filtros/MenuDeFiltrosSalvos";
import type { FiltroSalvo } from "@/lib/escale/filtros/filtros-salvos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const QUENTES: FiltroSalvo = {
  id: "11111111-1111-4111-8111-111111111111",
  nome: "Quentes",
  compartilhado: false,
  meu: true,
  criterios: { status: ["open"], tags: ["vip"] },
};
const DO_TIME: FiltroSalvo = {
  id: "22222222-2222-4222-8222-222222222222",
  nome: "Do time",
  compartilhado: true,
  meu: false,
  criterios: { status: ["open", "won"] },
};

function menu(filtroSalvoId: string | null = null, filtros: FiltrosDoQuadro = { status: ["open"] }) {
  const onAplicar = vi.fn();
  render(<MenuDeFiltrosSalvos alvo={{ tipo: "origem", id: "p-1" }} filtros={filtros} filtroSalvoId={filtroSalvoId} onAplicar={onAplicar} />);
  return { onAplicar, u: userEvent.setup({ pointerEventsCheck: 0 }) };
}

const abrirMenu = (u: ReturnType<typeof userEvent.setup>) => u.click(screen.getByTestId("filtros-salvos"));

beforeEach(() => {
  lista.atual = [QUENTES, DO_TIME];
  lista.erro = false;
  for (const m of Object.values(mutacoes)) m.mockReset();
  vi.mocked(toast.error).mockReset();
});

describe("<MenuDeFiltrosSalvos>", () => {
  it("lista os meus e os compartilhados; aplicar leva os critérios e o id", async () => {
    const { onAplicar, u } = menu();
    await abrirMenu(u);
    expect(screen.getByText("Meus filtros")).toBeInTheDocument();
    expect(screen.getByText("Compartilhados com você")).toBeInTheDocument();
    await u.click(screen.getByRole("menuitem", { name: "Do time" }));
    expect(onAplicar).toHaveBeenCalledWith(DO_TIME.criterios, DO_TIME.id);
  });

  it("filtro meu aplicado e mexido: o botão avisa, e o menu salva as alterações", async () => {
    const { u } = menu(QUENTES.id, { status: ["open"] });
    expect(screen.getByTestId("filtros-salvos")).toHaveTextContent("Quentes");
    expect(screen.getByTestId("filtros-salvos")).toHaveTextContent("(alterado)");
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Salvar alterações neste filtro" }));
    expect(mutacoes.mudar).toHaveBeenCalledWith({ id: QUENTES.id, mudanca: { criterios: { status: ["open"] } } }, expect.anything());
  });

  it("aplicado sem mudança: sem aviso nem 'salvar alterações'; renomear e excluir aparecem", async () => {
    const { u } = menu(QUENTES.id, QUENTES.criterios);
    expect(screen.getByTestId("filtros-salvos")).not.toHaveTextContent("(alterado)");
    await abrirMenu(u);
    expect(screen.queryByRole("menuitem", { name: "Salvar alterações neste filtro" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Renomear ou compartilhar…" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Excluir filtro" })).toBeInTheDocument();
  });

  it("salvar o filtro atual, compartilhado, cria com os filtros da tela e já o aplica", async () => {
    mutacoes.criar.mockImplementation((_novo: unknown, opcoes: { onSuccess: () => void }) => opcoes.onSuccess());
    const atuais: FiltrosDoQuadro = { status: ["open"], atrasados: true };
    const { onAplicar, u } = menu(null, atuais);
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Salvar filtro atual…" }));
    const janela = await screen.findByRole("dialog", { name: "Salvar filtro" });
    await u.type(within(janela).getByRole("textbox", { name: "Nome do filtro" }), "Fechando");
    await u.click(within(janela).getByRole("checkbox", { name: "Compartilhar com quem vê esta origem" }));
    await u.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(mutacoes.criar).toHaveBeenCalledWith(
      { id: expect.any(String), nome: "Fechando", compartilhado: true, criterios: atuais },
      expect.anything(),
    );
    const { id } = mutacoes.criar.mock.calls[0]![0] as { id: string };
    expect(onAplicar).toHaveBeenCalledWith(atuais, id);
  });

  it("nome repetido entre os meus é recusado na janela, sem chamar a rota", async () => {
    const { u } = menu();
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Salvar filtro atual…" }));
    const janela = await screen.findByRole("dialog", { name: "Salvar filtro" });
    await u.type(within(janela).getByRole("textbox", { name: "Nome do filtro" }), "quentes");
    await u.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(within(janela).getByRole("alert")).toHaveTextContent("Você já tem um filtro com esse nome aqui.");
    expect(mutacoes.criar).not.toHaveBeenCalled();
  });

  it("no limite de 20 filtros meus, avisa com o texto da Clint e não abre a janela", async () => {
    lista.atual = Array.from({ length: 20 }, (_, i) => ({ ...QUENTES, id: `id-${i}`, nome: `Filtro ${i}` }));
    const { u } = menu();
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Salvar filtro atual…" }));
    expect(toast.error).toHaveBeenCalledWith("Limite de 20 filtros salvos atingido. Exclua algum para salvar outro.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("excluir pede confirmação e solta o filtro aplicado", async () => {
    mutacoes.excluir.mockImplementation((_id: string, opcoes: { onSuccess: () => void }) => opcoes.onSuccess());
    const { onAplicar, u } = menu(QUENTES.id, QUENTES.criterios);
    await abrirMenu(u);
    await u.click(screen.getByRole("menuitem", { name: "Excluir filtro" }));
    const confirmacao = await screen.findByRole("alertdialog", { name: "Excluir o filtro «Quentes»?" });
    await u.click(within(confirmacao).getByRole("button", { name: "Excluir" }));
    expect(mutacoes.excluir).toHaveBeenCalledWith(QUENTES.id, expect.anything());
    expect(onAplicar).toHaveBeenCalledWith(QUENTES.criterios, null);
  });

  it("erro ao carregar aparece no menu", async () => {
    lista.atual = [];
    lista.erro = true;
    const { u } = menu();
    await abrirMenu(u);
    expect(screen.getByText("Não consegui carregar os filtros salvos.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-salvos-menu.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/components/escale/filtros/MenuDeFiltrosSalvos"`.

- [ ] **Step 3: Os hooks**

Create `hooks/escale/useFiltrosSalvos.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { parametroDoAlvo, type AlvoDoFiltro, type FiltroSalvo } from "@/lib/escale/filtros/filtros-salvos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";

/**
 * OS FILTROS SALVOS DE UM QUADRO (fork Escale, Fase 1D). Toda escrita RESOLVE a
 * lista relida do banco (a rota devolve), e ela vai direto para a cache: o menu
 * mostra o resultado sem esperar outra ida ao servidor.
 */
type Resposta = { data: FiltroSalvo[] };

const ROTA = "/api/v1/filtros-salvos";

export const chaveDosFiltrosSalvos = (alvo: AlvoDoFiltro) => ["filtros-salvos", alvo.tipo, alvo.id] as const;

export interface NovoFiltroSalvo {
  id: string;
  nome: string;
  compartilhado: boolean;
  criterios: FiltrosDoQuadro;
}

export interface MudancaDoFiltroSalvo {
  nome?: string;
  compartilhado?: boolean;
  criterios?: FiltrosDoQuadro;
}

export function useFiltrosSalvos(alvo: AlvoDoFiltro) {
  return useQuery({
    queryKey: chaveDosFiltrosSalvos(alvo),
    queryFn: async () =>
      (await apiClient.get<Resposta>(`${ROTA}?${parametroDoAlvo(alvo)}=${encodeURIComponent(alvo.id)}`)).data,
    staleTime: 30_000,
  });
}

function useGravar<A>(alvo: AlvoDoFiltro, enviar: (args: A) => Promise<Resposta>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: A) => (await enviar(args)).data,
    onSuccess: (lista) => qc.setQueryData(chaveDosFiltrosSalvos(alvo), lista),
  });
}

export function useCriarFiltroSalvo(alvo: AlvoDoFiltro) {
  return useGravar(alvo, (novo: NovoFiltroSalvo) =>
    apiClient.post<Resposta>(ROTA, { ...novo, [parametroDoAlvo(alvo)]: alvo.id }),
  );
}

export function useMudarFiltroSalvo(alvo: AlvoDoFiltro) {
  return useGravar(alvo, ({ id, mudanca }: { id: string; mudanca: MudancaDoFiltroSalvo }) =>
    apiClient.patch<Resposta>(`${ROTA}/${encodeURIComponent(id)}`, mudanca),
  );
}

export function useExcluirFiltroSalvo(alvo: AlvoDoFiltro) {
  return useGravar(alvo, (id: string) => apiClient.delete<Resposta>(`${ROTA}/${encodeURIComponent(id)}`));
}
```

- [ ] **Step 4: A janela e o menu**

Create `components/escale/filtros/JanelaDoFiltroSalvo.tsx`:

```tsx
"use client";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Alerta } from "@/components/escale/origens/JanelasDoGrupo";
import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCriarFiltroSalvo, useMudarFiltroSalvo } from "@/hooks/escale/useFiltrosSalvos";
import { useT } from "@/hooks/i18n/useT";
import {
  NOME_DO_FILTRO_MAX,
  nomeRepetido,
  validarNomeDoFiltro,
  type AlvoDoFiltro,
  type FiltroSalvo,
} from "@/lib/escale/filtros/filtros-salvos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { randomId } from "@/lib/random-id";

import { Caixinha } from "./controles";

export type JanelaDoFiltro = { modo: "novo" } | { modo: "editar"; filtro: FiltroSalvo };

interface Props {
  alvo: AlvoDoFiltro;
  janela: JanelaDoFiltro | null;
  /** Os filtros na tela agora: é o que "Salvar filtro" guarda. */
  filtros: FiltrosDoQuadro;
  meus: readonly FiltroSalvo[];
  onFechar: () => void;
  /** Depois de salvar um novo: a barra já o marca como aplicado. */
  onSalvo: (id: string, criterios: FiltrosDoQuadro) => void;
}

/**
 * SALVAR E EDITAR UM FILTRO (fork Escale, Fase 1D): nome e a caixinha
 * "compartilhar" (decisão de 15/10). Editar muda nome e compartilhamento; os
 * critérios mudam pelo "Salvar alterações neste filtro" do menu.
 */
export function JanelaDoFiltroSalvo({ janela, ...resto }: Props) {
  return (
    <Dialog
      open={janela !== null}
      onOpenChange={(aberta) => {
        if (!aberta) resto.onFechar();
      }}
    >
      <DialogContent className="max-w-md">
        {janela ? <FormDoFiltro key={janela.modo === "editar" ? janela.filtro.id : "novo"} janela={janela} {...resto} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FormDoFiltro({ alvo, janela, filtros, meus, onFechar, onSalvo }: Omit<Props, "janela"> & { janela: JanelaDoFiltro }) {
  const t = useT();
  const criar = useCriarFiltroSalvo(alvo);
  const mudar = useMudarFiltroSalvo(alvo);
  const atual = janela.modo === "editar" ? janela.filtro : null;
  // O id nasce aqui para a barra marcar o filtro como aplicado assim que a rota responder.
  const [id] = useState(() => atual?.id ?? randomId());
  const [nome, setNome] = useState(atual?.nome ?? "");
  const [compartilhado, setCompartilhado] = useState(atual?.compartilhado ?? false);
  const [erro, setErro] = useState<string | null>(null);
  const pendente = criar.isPending || mudar.isPending;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const validado = validarNomeDoFiltro(nome);
    if (!validado.ok) {
      setErro(t(validado.erro));
      return;
    }
    if (nomeRepetido(validado.nome, meus, atual?.id)) {
      setErro(t("Você já tem um filtro com esse nome aqui."));
      return;
    }
    const aoErrar = (err: unknown) => setErro(textoDoErro(err, t));
    if (atual) {
      mudar.mutate(
        { id: atual.id, mudanca: { nome: validado.nome, compartilhado } },
        {
          onSuccess: () => {
            toast.success(t("Filtro atualizado."));
            onFechar();
          },
          onError: aoErrar,
        },
      );
      return;
    }
    criar.mutate(
      { id, nome: validado.nome, compartilhado, criterios: filtros },
      {
        onSuccess: () => {
          toast.success(t("Filtro salvo."));
          onSalvo(id, filtros);
          onFechar();
        },
        onError: aoErrar,
      },
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{atual ? t("Editar filtro salvo") : t("Salvar filtro")}</DialogTitle>
        <DialogDescription>
          {atual
            ? t("O nome e quem vê. Para mudar os critérios, aplique o filtro, ajuste e use “Salvar alterações neste filtro”.")
            : t("Salva os filtros, o status e a ordenação que estão na tela agora.")}
        </DialogDescription>
      </DialogHeader>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">{t("Nome do filtro")}</span>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={t("Ex.: Clientes em aberto")}
          maxLength={NOME_DO_FILTRO_MAX}
          autoFocus
        />
      </label>
      <div className="space-y-1">
        <Caixinha marcada={compartilhado} onMudar={setCompartilhado}>
          {alvo.tipo === "origem" ? t("Compartilhar com quem vê esta origem") : t("Compartilhar com quem vê esta visualização")}
        </Caixinha>
        <p className="text-xs text-muted-foreground">{t("Filtro compartilhado aparece para quem tem acesso. Só você muda ou exclui.")}</p>
      </div>
      <Alerta texto={erro} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onFechar}>
          {t("Cancelar")}
        </Button>
        <Button type="submit" disabled={pendente}>
          {t("Salvar")}
        </Button>
      </DialogFooter>
    </form>
  );
}
```

Create `components/escale/filtros/MenuDeFiltrosSalvos.tsx`:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExcluirFiltroSalvo, useFiltrosSalvos, useMudarFiltroSalvo } from "@/hooks/escale/useFiltrosSalvos";
import { useT } from "@/hooks/i18n/useT";
import {
  FILTROS_SALVOS_MAX,
  filtroAlterado,
  separarFiltrosSalvos,
  type AlvoDoFiltro,
  type FiltroSalvo,
} from "@/lib/escale/filtros/filtros-salvos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { BookmarkSimple, CaretDown, Users } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { JanelaDoFiltroSalvo, type JanelaDoFiltro } from "./JanelaDoFiltroSalvo";

/**
 * OS FILTROS SALVOS DO QUADRO (fork Escale, Fase 1D). O botão mostra o filtro
 * aplicado (e "alterado" quando ele foi mexido depois). O menu aplica os meus e
 * os compartilhados, salva o filtro atual (até 20 por pessoa em cada origem ou
 * visualização, como na Clint) e, para o MEU filtro aplicado, salva alterações,
 * renomeia ou compartilha, e exclui.
 */
export function MenuDeFiltrosSalvos({
  alvo,
  filtros,
  filtroSalvoId,
  onAplicar,
}: {
  alvo: AlvoDoFiltro;
  filtros: FiltrosDoQuadro;
  filtroSalvoId: string | null;
  onAplicar: (filtros: FiltrosDoQuadro, filtroSalvoId: string | null) => void;
}) {
  const t = useT();
  const { data: lista = [], isError } = useFiltrosSalvos(alvo);
  const mudar = useMudarFiltroSalvo(alvo);
  const excluir = useExcluirFiltroSalvo(alvo);
  const [janela, setJanela] = useState<JanelaDoFiltro | null>(null);
  const [apagar, setApagar] = useState<FiltroSalvo | null>(null);
  const { meus, compartilhados } = separarFiltrosSalvos(lista);
  const ativo = lista.find((f) => f.id === filtroSalvoId);
  const alterado = ativo ? filtroAlterado(ativo, filtros) : false;

  function salvarNovo() {
    if (meus.length >= FILTROS_SALVOS_MAX) {
      toast.error(t("Limite de 20 filtros salvos atingido. Exclua algum para salvar outro."));
      return;
    }
    setJanela({ modo: "novo" });
  }

  function salvarAlteracoes(filtro: FiltroSalvo) {
    mudar.mutate(
      { id: filtro.id, mudanca: { criterios: filtros } },
      { onSuccess: () => toast.success(t("Filtro atualizado.")), onError: (e) => toast.error(textoDoErro(e, t)) },
    );
  }

  function confirmarExclusao() {
    const filtro = apagar;
    setApagar(null);
    if (!filtro) return;
    excluir.mutate(filtro.id, {
      onSuccess: () => {
        if (filtro.id === filtroSalvoId) onAplicar(filtros, null);
        toast.success(t("Filtro excluído."));
      },
      onError: (e) => toast.error(textoDoErro(e, t)),
    });
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-[16rem] gap-1.5" data-testid="filtros-salvos">
            <BookmarkSimple size={16} aria-hidden />
            <span className="truncate">{ativo ? ativo.nome : t("Filtros salvos")}</span>
            {alterado ? <span className="text-xs text-muted-foreground">{`(${t("alterado")})`}</span> : null}
            <CaretDown size={14} aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem onSelect={salvarNovo}>{t("Salvar filtro atual…")}</DropdownMenuItem>
          {ativo?.meu && alterado ? (
            <DropdownMenuItem onSelect={() => salvarAlteracoes(ativo)}>{t("Salvar alterações neste filtro")}</DropdownMenuItem>
          ) : null}
          {ativo?.meu ? (
            <>
              <DropdownMenuItem onSelect={() => setJanela({ modo: "editar", filtro: ativo })}>
                {t("Renomear ou compartilhar…")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setApagar(ativo)} className="text-destructive">
                {t("Excluir filtro")}
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          {isError ? <DropdownMenuItem disabled>{t("Não consegui carregar os filtros salvos.")}</DropdownMenuItem> : null}
          {!isError && lista.length === 0 ? <DropdownMenuItem disabled>{t("Nenhum filtro salvo ainda.")}</DropdownMenuItem> : null}
          {meus.length > 0 ? (
            <>
              <DropdownMenuLabel>{t("Meus filtros")}</DropdownMenuLabel>
              {meus.map((f) => (
                <ItemDoFiltro key={f.id} filtro={f} ativo={f.id === filtroSalvoId} onAplicar={onAplicar} />
              ))}
            </>
          ) : null}
          {compartilhados.length > 0 ? (
            <>
              <DropdownMenuLabel>{t("Compartilhados com você")}</DropdownMenuLabel>
              {compartilhados.map((f) => (
                <ItemDoFiltro key={f.id} filtro={f} ativo={f.id === filtroSalvoId} onAplicar={onAplicar} />
              ))}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <JanelaDoFiltroSalvo
        alvo={alvo}
        janela={janela}
        filtros={filtros}
        meus={meus}
        onFechar={() => setJanela(null)}
        onSalvo={(id, criterios) => onAplicar(criterios, id)}
      />

      <AlertDialog
        open={apagar !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setApagar(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Excluir o filtro «{nome}»?").replace("{nome}", apagar?.nome ?? "")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Ele some para você e, se estiver compartilhado, para todo mundo. Nenhum negócio é tocado.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>{t("Excluir")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ItemDoFiltro({
  filtro,
  ativo,
  onAplicar,
}: {
  filtro: FiltroSalvo;
  ativo: boolean;
  onAplicar: (filtros: FiltrosDoQuadro, filtroSalvoId: string | null) => void;
}) {
  const t = useT();
  return (
    <DropdownMenuItem onSelect={() => onAplicar(filtro.criterios, filtro.id)} className={cn(ativo && "font-semibold")}>
      <span className="truncate">{filtro.nome}</span>
      {filtro.meu && filtro.compartilhado ? (
        <span className="ml-auto text-muted-foreground" title={t("Compartilhado")}>
          <Users size={14} aria-hidden />
        </span>
      ) : null}
    </DropdownMenuItem>
  );
}
```

- [ ] **Step 5: Rodar os testes e o guarda do espanhol**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-salvos-menu.test.tsx tests/unit/i18n
```
Expected: PASS. Se `Alerta` não for exportado por `components/escale/origens/JanelasDoGrupo` (a 1C importa dali), confira com `grep -n "export function Alerta" components/escale/origens/*.tsx` e ajuste o import.

- [ ] **Step 6: Commit**

```bash
git add hooks/escale/useFiltrosSalvos.ts components/escale/filtros/MenuDeFiltrosSalvos.tsx components/escale/filtros/JanelaDoFiltroSalvo.tsx tests/unit/escale-filtros-salvos-menu.test.tsx
git commit -m "feat(escale): filtros salvos no quadro (aplicar, salvar, compartilhar, salvar alterações, excluir)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: A barra do quadro e a ordenação

**Files:**
- Create: `hooks/escale/useFiltrosDoQuadro.ts`, `components/escale/filtros/OrdenarCards.tsx`, `components/escale/filtros/BarraDoQuadro.tsx`, `tests/unit/escale-barra-do-quadro.test.tsx`

**Interfaces:**
- Consumes:
  - Tasks 3, 5, 9 e 10: `filtrosDaUrl`, `filtrosParaUrl`, `limparCriterios`, `CRITERIOS_DE_ORDEM_MAX`, `CriterioDeOrdem`, `opcoesDeOrdem`, `rotulosDaDirecao`, `GRUPOS_DE_ORDEM`, `StatusDoQuadro`, `PainelDeFiltros`, `ResumoDosFiltros`, `MenuDeFiltrosSalvos` e `classeDoSeletor`;
  - `next/navigation`.
- Produces:
  - `useFiltrosDoQuadro(): { filtros: FiltrosDoQuadro; filtroSalvoId: string | null; mudar(filtros, filtroSalvoId?: string | null): void }`;
  - `<OrdenarCards ordem campos onAplicar(ordem | undefined) />`;
  - `<BarraDoQuadro {...BarraDoQuadroProps} />`, com `BarraDoQuadroProps = { alvo; filtros; filtroSalvoId; onMudar(filtros, filtroSalvoId); leads; campos; settings?; contagem; onAtualizar(); atualizando? }`.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Create `tests/unit/escale-barra-do-quadro.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: [] }) }));
vi.mock("@/components/escale/filtros/MenuDeFiltrosSalvos", () => ({ MenuDeFiltrosSalvos: () => <p>filtros salvos</p> }));

import { BarraDoQuadro, type BarraDoQuadroProps } from "@/components/escale/filtros/BarraDoQuadro";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const CAMPOS = camposFiltraveis([{ fields: [{ key: "renda", label: "Renda", type: "number" }] }]);
const ORDEM = [{ campo: "negocio.valor", direcao: "desc" as const }];

function barra(filtros: FiltrosDoQuadro = { status: ["open"] }, extra: Partial<BarraDoQuadroProps> = {}) {
  const props: BarraDoQuadroProps = {
    alvo: { tipo: "origem", id: "p-1" },
    filtros,
    filtroSalvoId: "s-1",
    onMudar: vi.fn(),
    leads: [negocio("l1", { tags: ["vip"] })],
    campos: CAMPOS,
    contagem: 21,
    onAtualizar: vi.fn(),
    ...extra,
  };
  const { rerender } = render(<BarraDoQuadro {...props} />);
  return { ...props, props, rerender, u: userEvent.setup({ pointerEventsCheck: 0 }) };
}

describe("<BarraDoQuadro>", () => {
  it("mostra a contagem, a busca da origem e o status Em aberto", () => {
    const { props, rerender } = barra();
    expect(screen.getByText("21 negócios")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Pesquisar nessa origem…")).toBeInTheDocument();
    expect(screen.getByTestId("status-do-quadro")).toHaveTextContent("Em aberto");
    rerender(<BarraDoQuadro {...props} contagem={1} />);
    expect(screen.getByText("1 negócio")).toBeInTheDocument();
  });

  it("na visualização, a busca diz 'nessa visualização'", () => {
    barra({ status: ["open"] }, { alvo: { tipo: "visualizacao", id: "v-1" } });
    expect(screen.getByPlaceholderText("Pesquisar nessa visualização…")).toBeInTheDocument();
  });

  it("a busca espera a pessoa parar de digitar e mantém o filtro salvo aplicado", async () => {
    const { onMudar, u } = barra();
    await u.type(screen.getByRole("searchbox"), "ana");
    await waitFor(() => expect(onMudar).toHaveBeenCalledWith({ status: ["open"], busca: "ana" }, "s-1"));
    expect(onMudar).toHaveBeenCalledTimes(1);
  });

  it("o status muda pela barra, mantendo o filtro salvo aplicado", async () => {
    const { onMudar, u } = barra();
    await u.click(screen.getByTestId("status-do-quadro"));
    await u.click(screen.getByRole("menuitemcheckbox", { name: "Ganhos" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open", "won"] }, "s-1");
  });

  it("Ordenar: monta os critérios (com os campos do negócio) e aplica", async () => {
    const { onMudar, u } = barra();
    await u.click(screen.getByRole("button", { name: /^Ordenar/ }));
    expect(screen.getByText("Nenhum critério de ordenação")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Adicionar critério" }));
    expect(screen.getByRole("option", { name: "Renda" })).toBeInTheDocument();
    await u.selectOptions(screen.getByRole("combobox", { name: "Campo 1" }), "negocio.valor");
    await u.selectOptions(screen.getByRole("combobox", { name: "Direção 1" }), "desc");
    await u.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open"], ordem: ORDEM }, "s-1");
  });

  it("com ordenação ativa, avisa que arrastar dentro da coluna está desligado", () => {
    barra({ status: ["open"], ordem: ORDEM });
    expect(screen.getByText(/Ordenação ativa/)).toBeInTheDocument();
  });

  it("Atualizar relê o quadro", async () => {
    const { onAtualizar, u } = barra();
    await u.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(onAtualizar).toHaveBeenCalled();
  });

  it("o resumo fica visível com o painel fechado, e Limpar filtros solta o filtro salvo", async () => {
    const { onMudar, u } = barra({ status: ["open", "won"], tags: ["vip"], ordem: ORDEM });
    expect(screen.getByText("1 tag")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open", "won"], ordem: ORDEM }, null);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-barra-do-quadro.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/components/escale/filtros/BarraDoQuadro"`.

- [ ] **Step 3: O hook da URL**

Create `hooks/escale/useFiltrosDoQuadro.ts`:

```ts
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { filtrosDaUrl, filtrosParaUrl } from "@/lib/escale/filtros/url";

/**
 * OS FILTROS DO QUADRO NA URL (fork Escale, Fase 1D): lê a query string e troca
 * com `router.replace`, sem empilhar histórico a cada clique (como o quadro do
 * original). `mudar(filtros, filtroSalvoId)`: sem o id, o filtro salvo deixa de
 * estar aplicado.
 */
export function useFiltrosDoQuadro() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { filtros, filtroSalvoId } = useMemo(() => filtrosDaUrl(searchParams), [searchParams]);
  const mudar = useCallback(
    (proximos: FiltrosDoQuadro, salvoId: string | null = null) => {
      const qs = filtrosParaUrl(proximos, salvoId);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );
  return { filtros, filtroSalvoId, mudar };
}
```

- [ ] **Step 4: Ordenar**

Create `components/escale/filtros/OrdenarCards.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import { GRUPOS_DE_ORDEM, opcoesDeOrdem, rotulosDaDirecao } from "@/lib/escale/filtros/ordenar";
import { CRITERIOS_DE_ORDEM_MAX, type CriterioDeOrdem } from "@/lib/escale/filtros/tipos";
import { ArrowsDownUp, Plus, X } from "@/lib/ui/icons";

import { classeDoSeletor } from "./controles";

/**
 * "ORDENAR POR" (fork Escale, Fase 1D; textos da Clint, `DealSortControl`): um
 * ou mais critérios (até 3), a ordem das linhas é a prioridade, e nada muda até
 * "Aplicar". Aplicar sem critério volta à ordem manual.
 */
export function OrdenarCards({
  ordem,
  campos,
  onAplicar,
}: {
  ordem: readonly CriterioDeOrdem[] | undefined;
  campos: readonly CampoFiltravel[];
  onAplicar: (ordem: CriterioDeOrdem[] | undefined) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<CriterioDeOrdem[]>([]);
  const opcoes = useMemo(() => opcoesDeOrdem(campos), [campos]);
  const porCampo = new Map(opcoes.map((o) => [o.campo, o]));
  const livre = opcoes.find((o) => !rascunho.some((r) => r.campo === o.campo));

  function abrir(sim: boolean) {
    if (sim) setRascunho([...(ordem ?? [])]);
    setAberto(sim);
  }

  function trocar(indice: number, novo: CriterioDeOrdem | null) {
    setRascunho((antes) => (novo === null ? antes.filter((_, j) => j !== indice) : antes.map((r, j) => (j === indice ? novo : r))));
  }

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ArrowsDownUp size={16} aria-hidden />
          {t("Ordenar")}
          {ordem?.length ? <span className="rounded-full bg-accent/15 px-1.5 text-xs text-accent">{ordem.length}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={t("Ordenar por")} className="w-[min(30rem,calc(100vw-2rem))] space-y-3">
        <div>
          <p className="text-sm font-semibold">{t("Ordenar por")}</p>
          <p className="text-xs text-muted-foreground">{t("Defina um ou mais critérios. A ordem das linhas define a prioridade.")}</p>
        </div>
        {rascunho.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-3 text-center">
            <p className="text-sm font-medium">{t("Nenhum critério de ordenação")}</p>
            <p className="text-xs text-muted-foreground">{t("Adicione um critério para ordenar ou aplique para voltar à ordem manual.")}</p>
          </div>
        ) : (
          rascunho.map((criterio, indice) => {
            const opcao = porCampo.get(criterio.campo);
            const direcoes = rotulosDaDirecao(opcao?.tipo ?? "texto");
            return (
              <div key={indice} className="flex items-center gap-2">
                <select
                  aria-label={`${t("Campo")} ${indice + 1}`}
                  className={classeDoSeletor}
                  value={criterio.campo}
                  onChange={(e) => trocar(indice, { campo: e.target.value, direcao: criterio.direcao })}
                >
                  {opcao ? null : <option value={criterio.campo}>{criterio.campo}</option>}
                  {GRUPOS_DE_ORDEM.map((g) => {
                    const doGrupo = opcoes.filter((o) => o.grupo === g.grupo);
                    if (doGrupo.length === 0) return null;
                    return (
                      <optgroup key={g.grupo} label={t(g.rotulo)}>
                        {doGrupo.map((o) => (
                          <option
                            key={o.campo}
                            value={o.campo}
                            disabled={o.campo !== criterio.campo && rascunho.some((r) => r.campo === o.campo)}
                          >
                            {o.grupo === "campos" ? o.rotulo : t(o.rotulo)}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <select
                  aria-label={`${t("Direção")} ${indice + 1}`}
                  className={classeDoSeletor}
                  value={criterio.direcao}
                  onChange={(e) => trocar(indice, { campo: criterio.campo, direcao: e.target.value === "desc" ? "desc" : "asc" })}
                >
                  <option value="asc">{t(direcoes.asc)}</option>
                  <option value="desc">{t(direcoes.desc)}</option>
                </select>
                <button
                  type="button"
                  aria-label={`${t("Remover critério")} ${indice + 1}`}
                  onClick={() => trocar(indice, null)}
                  className="shrink-0 rounded-md px-2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            );
          })
        )}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!livre || rascunho.length >= CRITERIOS_DE_ORDEM_MAX}
            onClick={() => {
              if (livre) setRascunho((antes) => [...antes, { campo: livre.campo, direcao: "asc" }]);
            }}
          >
            <Plus size={14} className="mr-1" aria-hidden />
            {t("Adicionar critério")}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
              {t("Cancelar")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onAplicar(rascunho.length > 0 ? rascunho : undefined);
                setAberto(false);
              }}
            >
              {t("Aplicar")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 5: A barra**

Create `components/escale/filtros/BarraDoQuadro.tsx`:

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import type { AlvoDoFiltro } from "@/lib/escale/filtros/filtros-salvos";
import { limparCriterios, type FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import type { Lead } from "@/lib/types/leads";
import { ArrowsClockwise } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { MenuDeFiltrosSalvos } from "./MenuDeFiltrosSalvos";
import { OrdenarCards } from "./OrdenarCards";
import { PainelDeFiltros } from "./PainelDeFiltros";
import { ResumoDosFiltros } from "./ResumoDosFiltros";
import { StatusDoQuadro } from "./StatusDoQuadro";

export interface BarraDoQuadroProps {
  alvo: AlvoDoFiltro;
  filtros: FiltrosDoQuadro;
  /** O filtro salvo aplicado (fica aplicado enquanto a pessoa ajusta: vira "alterado"). */
  filtroSalvoId: string | null;
  onMudar: (filtros: FiltrosDoQuadro, filtroSalvoId: string | null) => void;
  /** Todos os cards, SEM filtro: é deles que saem as opções de tags e de motivos. */
  leads: readonly Lead[];
  campos: readonly CampoFiltravel[];
  settings?: Record<string, unknown>;
  /** Quantos negócios o quadro mostra agora (Clint: "21 Negócios"). */
  contagem: number;
  onAtualizar: () => void;
  atualizando?: boolean;
}

const ESPERA_DA_BUSCA_MS = 250;

/**
 * A BARRA DO QUADRO (fork Escale, Fase 1D; ficha 01-020 da Clint): busca,
 * status, Filtros, filtros salvos, a contagem, Ordenar e Atualizar. Embaixo, o
 * resumo dos filtros ativos, visível com o painel fechado.
 */
export function BarraDoQuadro({
  alvo,
  filtros,
  filtroSalvoId,
  onMudar,
  leads,
  campos,
  settings,
  contagem,
  onAtualizar,
  atualizando = false,
}: BarraDoQuadroProps) {
  const t = useT();
  // Muda só quando os filtros vêm de fora da digitação (filtro salvo, limpar):
  // é o que reinicia a caixa de busca com o texto novo.
  const [geracao, setGeracao] = useState(0);
  const mudar = useCallback((proximos: FiltrosDoQuadro) => onMudar(proximos, filtroSalvoId), [onMudar, filtroSalvoId]);
  const buscar = useCallback((busca: string) => mudar({ ...filtros, busca: busca || undefined }), [mudar, filtros]);

  function trocarTudo(proximos: FiltrosDoQuadro, salvoId: string | null) {
    setGeracao((g) => g + 1);
    onMudar(proximos, salvoId);
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-2">
      <div className="flex flex-wrap items-center gap-2">
        <CampoDeBusca
          key={geracao}
          atual={filtros.busca ?? ""}
          onBuscar={buscar}
          placeholder={alvo.tipo === "origem" ? t("Pesquisar nessa origem…") : t("Pesquisar nessa visualização…")}
        />
        <StatusDoQuadro status={filtros.status} onMudar={(status) => mudar({ ...filtros, status })} />
        <PainelDeFiltros filtros={filtros} onMudar={mudar} leads={leads} campos={campos} settings={settings} />
        <MenuDeFiltrosSalvos alvo={alvo} filtros={filtros} filtroSalvoId={filtroSalvoId} onAplicar={trocarTudo} />
        <div className="ml-auto flex items-center gap-1">
          <span className="px-2 text-sm text-muted-foreground" aria-live="polite">
            {(contagem === 1 ? t("{n} negócio") : t("{n} negócios")).replace("{n}", String(contagem))}
          </span>
          <OrdenarCards ordem={filtros.ordem} campos={campos} onAplicar={(ordem) => mudar({ ...filtros, ordem })} />
          <Button variant="ghost" size="sm" onClick={onAtualizar} disabled={atualizando} aria-label={t("Atualizar")} title={t("Atualizar")}>
            <ArrowsClockwise size={16} className={cn(atualizando && "animate-spin")} aria-hidden />
          </Button>
        </div>
      </div>
      <ResumoDosFiltros filtros={filtros} onMudar={mudar} onLimpar={() => trocarTudo(limparCriterios(filtros), null)} />
      {filtros.ordem?.length ? (
        <p className="px-1 text-xs text-muted-foreground">
          {t("Ordenação ativa · arrastar para reordenar dentro da coluna está desabilitado. Mover de etapa continua funcionando.")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A busca espera a pessoa parar de digitar (250ms, o mesmo do `FilterBar` do
 * original). Compara com o valor de FORA (`atual`): depois que a URL muda, o
 * efeito roda de novo e para, sem mandar a mesma busca duas vezes.
 */
function CampoDeBusca({ atual, placeholder, onBuscar }: { atual: string; placeholder: string; onBuscar: (busca: string) => void }) {
  const [valor, setValor] = useState(atual);
  useEffect(() => {
    if (valor === atual) return;
    const id = setTimeout(() => onBuscar(valor), ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(id);
  }, [valor, atual, onBuscar]);
  return (
    <Input
      type="search"
      placeholder={placeholder}
      aria-label={placeholder}
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      className="h-9 w-full sm:w-64"
    />
  );
}
```

- [ ] **Step 6: Rodar os testes da barra, das peças e o lint**

```bash
corepack pnpm vitest run tests/unit/escale-barra-do-quadro.test.tsx tests/unit/escale-painel-de-filtros.test.tsx tests/unit/escale-filtros-salvos-menu.test.tsx tests/unit/i18n
corepack pnpm exec eslint components/escale/filtros hooks/escale
```
Expected: PASS; eslint sem erros.

- [ ] **Step 7: Commit**

```bash
git add hooks/escale/useFiltrosDoQuadro.ts components/escale/filtros/OrdenarCards.tsx components/escale/filtros/BarraDoQuadro.tsx tests/unit/escale-barra-do-quadro.test.tsx
git commit -m "feat(escale): barra do quadro (busca, status, filtros, salvos, contagem, ordenar, atualizar)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 12: O quadro do funil usa a barra nova (casca nova)

**Files:**
- Modify: `components/kanban/KanbanBoard.tsx` (prop `ordemDosCards`), `app/app/pipelines/[id]/_client.tsx` (bloco do fork), `app/app/pipelines/[id]/page.tsx` (cookie da casca)
- Create: `tests/unit/escale-quadro-ordenado.test.tsx`, `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`

**Interfaces:**
- Consumes:
  - Task 4: `recortarQuadro`;
  - Task 5: `comparadorDaOrdem` e `posicaoNoFimDaEtapa`;
  - Task 4: `camposFiltraveis`;
  - Task 11: `useFiltrosDoQuadro` e `BarraDoQuadro`;
  - Fase 0: `COOKIE_DO_MENU` e `lerPreferenciaDeMenu` (`@/lib/escale/preferencia-de-menu`);
  - do original: `useActiveOrg`.
- Produces:
  - `KanbanBoard` aceita `ordemDosCards?: (a: Lead, b: Lead) => number`;
  - `PipelinePageClient` aceita `cascaNova?: boolean`;
  - com a casca nova, o funil abre em "Em aberto", sem as colunas de ganho e de perda, com a barra nova.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Create `tests/unit/escale-quadro-ordenado.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BoardData, Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

const capturado = vi.hoisted(() => ({ onDragEnd: null as ((r: unknown) => void) | null }));
const mover = vi.hoisted(() => vi.fn());

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ onDragEnd, children }: { onDragEnd: (r: unknown) => void; children: ReactNode }) => {
    capturado.onDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
}));
vi.mock("@/components/kanban/StageColumn", () => ({
  StageColumn: ({ stage, leads }: { stage: { id: string }; leads: Array<{ id: string }> }) => (
    <ol aria-label={stage.id}>
      {leads.map((l) => (
        <li key={l.id}>{l.id}</li>
      ))}
    </ol>
  ),
}));
vi.mock("@/components/kanban/LeadDossier", () => ({ LeadDossier: () => null }));
vi.mock("@/components/kanban/CamposObrigatoriosDialog", () => ({ CamposObrigatoriosDialog: () => null }));
vi.mock("@/components/kanban/RetomarComoNovoNegocioDialog", () => ({ RetomarComoNovoNegocioDialog: () => null }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/leads/useAtRiskLeads", () => ({ useAtRiskLeads: () => ({ data: null }) }));
vi.mock("@/hooks/leads/useReactivations", () => ({ useReactivations: () => ({ data: [] }) }));
vi.mock("@/hooks/kanban/useRenameStage", () => ({ useRenameStage: () => ({ mutate: vi.fn() }) }));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => ({ data: undefined, isLoading: false, isError: false, error: null, pulses: new Map() }),
  chaveDoQuadro: (id: string | null) => ["board", id],
}));
vi.mock("@/hooks/kanban/useMoveCard", () => ({ useMoveCard: () => ({ mutate: mover, isPending: false }) }));

import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { comparadorDaOrdem } from "@/lib/escale/filtros/ordenar";

const etapa = (id: string) => ({ id, pipeline_id: "p-1", name: id, position: 1, is_won: false, is_lost: false }) as Stage;
const lead = (id: string, stage_id: string, value_cents: number, position_in_stage: number) =>
  ({ id, stage_id, value_cents, position_in_stage, pipeline_id: "p-1", status: "open", updated_at: `upd-${id}` }) as unknown as Lead;

const ETAPAS = [etapa("e1"), etapa("e2")];
const LEADS = [lead("barato", "e1", 100, 1000), lead("caro", "e1", 900, 2000), lead("medio", "e1", 500, 3000), lead("outro", "e2", 50, 5000)];
const PELO_VALOR = comparadorDaOrdem([{ campo: "negocio.valor", direcao: "desc" }]);

function renderizar(ordemDosCards?: (a: Lead, b: Lead) => number) {
  const qc = new QueryClient();
  // O quadro SEM filtro na cache: tem um card que a tela não mostra, no fim da e2.
  qc.setQueryData(["board", "p-1"], { pipeline: {}, stages: ETAPAS, leads: [...LEADS, lead("escondido", "e2", 0, 9000)] } as unknown as BoardData);
  render(
    <QueryClientProvider client={qc}>
      <KanbanBoard pipelineId="p-1" stages={ETAPAS} leads={LEADS} pipeline={{ settings: {} } as Pipeline} ordemDosCards={ordemDosCards} />
    </QueryClientProvider>,
  );
}

const cardsDe = (etapaId: string) =>
  Array.from(screen.getByRole("list", { name: etapaId }).querySelectorAll("li")).map((li) => li.textContent);

const soltar = (draggableId: string, de: string, para: string, index = 0) =>
  act(async () => {
    capturado.onDragEnd?.({
      draggableId,
      source: { droppableId: de, index: 0 },
      destination: { droppableId: para, index },
      reason: "DROP",
      type: "DEFAULT",
      mode: "FLUID",
    });
  });

beforeEach(() => {
  capturado.onDragEnd = null;
  mover.mockReset();
});

describe("<KanbanBoard> com a ordenação da barra (Fase 1D)", () => {
  it("sem ordenação, a coluna segue a ordem manual", () => {
    renderizar();
    expect(cardsDe("e1")).toEqual(["barato", "caro", "medio"]);
  });

  it("com ordenação, a coluna segue o comparador", () => {
    renderizar(PELO_VALOR);
    expect(cardsDe("e1")).toEqual(["caro", "medio", "barato"]);
  });

  it("com ordenação, arrastar dentro da coluna não move", async () => {
    renderizar(PELO_VALOR);
    await soltar("barato", "e1", "e1", 2);
    expect(mover).not.toHaveBeenCalled();
  });

  it("com ordenação, soltar em outra etapa põe o card depois do último da etapa INTEIRA", async () => {
    renderizar(PELO_VALOR);
    await soltar("caro", "e1", "e2");
    expect(mover).toHaveBeenCalledWith({ leadId: "caro", stageId: "e2", positionInStage: 10000, expectedUpdatedAt: "upd-caro" });
  });

  it("sem ordenação, arrastar dentro da coluna continua movendo (o comportamento do original)", async () => {
    renderizar();
    await soltar("barato", "e1", "e1", 2);
    expect(mover).toHaveBeenCalledWith(expect.objectContaining({ leadId: "barato", stageId: "e1" }));
  });
});
```

Create `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const busca = vi.hoisted(() => ({ atual: "" }));
const quadro = vi.hoisted(() => {
  const lead = (id: string, stage_id: string, status: string) => ({
    id,
    stage_id,
    status,
    pipeline_id: "p-1",
    title: id,
    description: null,
    tags: [],
    owner_user_id: null,
    owner_agent_id: null,
    value_cents: null,
    currency: null,
    lost_reason: status === "lost" ? "price" : null,
    expected_close_date: null,
    position_in_stage: 1000,
    created_at: "2026-10-14T12:00:00Z",
    stage_changed_at: "2026-10-14T12:00:00Z",
    updated_at: "2026-10-14T12:00:00Z",
    custom_fields: {},
  });
  return {
    refetch: vi.fn(),
    dados: {
      pipeline: { id: "p-1", name: "Vendas", vocabulary: null, settings: {} },
      stages: [
        { id: "entrada", name: "Entrada", position: 1, is_won: false, is_lost: false },
        { id: "proposta", name: "Proposta", position: 2, is_won: false, is_lost: false },
        { id: "ganho", name: "Ganho", position: 3, is_won: true, is_lost: false },
        { id: "perdido", name: "Perdido", position: 4, is_won: false, is_lost: true },
      ],
      leads: [lead("l-aberto", "entrada", "open"), lead("l-ganho", "ganho", "won"), lead("l-perdido", "perdido", "lost")],
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/app/pipelines/p-1",
  useSearchParams: () => new URLSearchParams(busca.atual),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-1" }),
  useActiveOrg: () => ({ orgId: "org-1", role: "agent", currency: "BRL" }),
  usePermission: () => false,
}));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => ({
    data: quadro.dados,
    isLoading: false,
    error: null,
    pulses: new Map(),
    realtimeStatus: "SUBSCRIBED",
    seguranca: { divergencias: 0, ultimaVerificacao: null },
    refetch: quadro.refetch,
    isFetching: false,
  }),
  chaveDoQuadro: (id: string | null) => ["board", id],
}));
vi.mock("@/components/kanban/KanbanBoard", () => ({
  KanbanBoard: (p: { stages: Array<{ name: string }>; leads: Array<{ id: string }>; ordemDosCards?: unknown }) => (
    <div>
      <p>{`etapas: ${p.stages.map((s) => s.name).join(", ")}`}</p>
      <p>{`cards: ${p.leads.map((l) => l.id).join(", ")}`}</p>
      <p>{`ordem: ${typeof p.ordemDosCards}`}</p>
    </div>
  ),
}));
vi.mock("@/components/escale/filtros/BarraDoQuadro", () => ({
  BarraDoQuadro: (p: { contagem: number; onAtualizar: () => void }) => (
    <button type="button" onClick={p.onAtualizar}>{`barra nova: ${p.contagem}`}</button>
  ),
}));
vi.mock("@/components/kanban/FilterBar", () => ({ FilterBar: () => <p>barra do original</p> }));
vi.mock("@/components/kanban/BulkActionBar", () => ({ BulkActionBar: () => null }));
vi.mock("@/components/kanban/NewLeadDialog", () => ({ NewLeadDialog: () => null }));
vi.mock("@/components/kanban/CalendarioDoFunil", () => ({ CalendarioDoFunil: () => null }));

import { PipelinePageClient } from "@/app/app/pipelines/[id]/_client";

const abrir = (cascaNova: boolean) =>
  render(
    <PipelinePageClient pipelineId="p-1" initialName="Vendas" role="agent" funis={[{ id: "p-1", name: "Vendas" }]} cascaNova={cascaNova} />,
  );

beforeEach(() => {
  busca.atual = "";
  quadro.refetch.mockReset();
});

describe("a página do funil com a casca nova (Fase 1D)", () => {
  it("abre em Em aberto: as colunas de ganho e de perda somem, e a contagem é a dos abertos", () => {
    abrir(true);
    expect(screen.getByText("etapas: Entrada, Proposta")).toBeInTheDocument();
    expect(screen.getByText("cards: l-aberto")).toBeInTheDocument();
    expect(screen.getByText("barra nova: 1")).toBeInTheDocument();
    expect(screen.getByText("ordem: undefined")).toBeInTheDocument();
  });

  it("status com ganhos traz a coluna de ganho e os ganhos de volta", () => {
    busca.atual = "st=open,won";
    abrir(true);
    expect(screen.getByText("etapas: Entrada, Proposta, Ganho")).toBeInTheDocument();
    expect(screen.getByText("cards: l-aberto, l-ganho")).toBeInTheDocument();
    expect(screen.getByText("barra nova: 2")).toBeInTheDocument();
  });

  it("a ordenação da URL chega ao quadro", () => {
    busca.atual = `f=${encodeURIComponent(JSON.stringify({ ordem: [{ campo: "negocio.valor", direcao: "desc" }] }))}`;
    abrir(true);
    expect(screen.getByText("ordem: function")).toBeInTheDocument();
  });

  it("Atualizar relê o quadro", async () => {
    abrir(true);
    await userEvent.setup().click(screen.getByRole("button", { name: "barra nova: 1" }));
    expect(quadro.refetch).toHaveBeenCalled();
  });

  it("sem a casca nova, o quadro do original fica como está", () => {
    abrir(false);
    expect(screen.getByText("barra do original")).toBeInTheDocument();
    expect(screen.getByText("etapas: Entrada, Proposta, Ganho, Perdido")).toBeInTheDocument();
    expect(screen.getByText("cards: l-aberto, l-ganho, l-perdido")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-ordenado.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
```
Expected: FAIL.
- `escale-quadro-ordenado`: o caso "com ordenação, a coluna segue o comparador" vê `barato, caro, medio`, e os casos de arrasto movem quando não deviam.
- `escale-quadro-do-funil-com-filtros`: aparece "barra do original" onde se esperava "barra nova".

- [ ] **Step 3: `KanbanBoard` aceita a ordenação**

Em `components/kanban/KanbanBoard.tsx`:

1. Logo DEPOIS da linha `import { camposDoFunil } from "@/lib/leads/campos-do-funil";`, acrescente:

```ts
// FORK ESCALE · Fase 1D: com ordenação ativa, soltar em outra etapa vai para o fim dela.
import { posicaoNoFimDaEtapa } from "@/lib/escale/filtros/ordenar";
```

2. Troque

```ts
  podeRenomearEtapa?: boolean;
}

function groupLeadsByStage(stages: Stage[], leads: Lead[]): Map<string, Lead[]> {
```

por

```ts
  podeRenomearEtapa?: boolean;
  /**
   * FORK ESCALE · Fase 1D: a ordenação escolhida na barra do quadro (casca
   * nova). Com ela, a coluna mostra os cards nessa ordem, arrastar DENTRO da
   * coluna não faz nada (a posição manual não é a ordem da tela) e soltar em
   * outra etapa põe o card no fim dela. Ausente = a ordem manual de sempre.
   */
  ordemDosCards?: (a: Lead, b: Lead) => number;
}

function groupLeadsByStage(
  stages: Stage[],
  leads: Lead[],
  ordem?: (a: Lead, b: Lead) => number,
): Map<string, Lead[]> {
```

3. Troque

```ts
  for (const list of map.values()) {
    list.sort((a, b) => a.position_in_stage - b.position_in_stage);
  }
```

por

```ts
  // FORK ESCALE · Fase 1D: com ordenação escolhida, ela manda.
  for (const list of map.values()) {
    list.sort(ordem ?? ((a, b) => a.position_in_stage - b.position_in_stage));
  }
```

4. Troque

```ts
  podeRenomearEtapa = false,
}: KanbanBoardProps) {
```

por

```ts
  podeRenomearEtapa = false,
  ordemDosCards,
}: KanbanBoardProps) {
```

5. Troque

```ts
    return groupLeadsByStage(data.stages, data.leads);
  }, [data]);
```

por

```ts
    return groupLeadsByStage(data.stages, data.leads, ordemDosCards);
  }, [data, ordemDosCards]);
```

6. Em `handleDragEnd`, troque

```ts
      const destStageId = destination.droppableId;
```

por

```ts
      const destStageId = destination.droppableId;

      // FORK ESCALE · Fase 1D: com ordenação ativa, a posição na coluna é a da
      // ordenação, não a do ponteiro. Mesma coluna = nada; outra coluna = fim da
      // etapa INTEIRA (o cache sem filtro, o mesmo cuidado da #2545 abaixo).
      if (ordemDosCards) {
        if (source.droppableId === destStageId) return;
        const etapaInteira = qc.getQueryData<BoardData>(chaveDoQuadro(pipelineId))?.leads ?? data.leads;
        moveCard.mutate({
          leadId: lead.id,
          stageId: destStageId,
          positionInStage: posicaoNoFimDaEtapa(etapaInteira, destStageId, lead.id),
          expectedUpdatedAt: lead.updated_at,
        });
        return;
      }
```

e, no fim do mesmo `useCallback`, troque `[data, grouped, moveCard, qc, pipelineId],` por `[data, grouped, moveCard, qc, pipelineId, ordemDosCards],`.

Se algum dos trechos acima não bater letra por letra (a sincronização pode ter mexido no arquivo), PARE e mostre o trecho atual ao usuário antes de editar.

- [ ] **Step 4: A página do funil liga a barra nova com a casca nova**

Em `app/app/pipelines/[id]/_client.tsx`:

1. Logo DEPOIS da linha `import { cn } from "@/lib/utils";`, acrescente:

```ts
// FORK ESCALE · Fase 1D: a barra do quadro da casca nova (status com várias
// escolhas, filtros novos, filtros salvos, ordenação, contagem e Atualizar).
import { BarraDoQuadro } from "@/components/escale/filtros/BarraDoQuadro";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useFiltrosDoQuadro } from "@/hooks/escale/useFiltrosDoQuadro";
import { recortarQuadro } from "@/lib/escale/filtros/aplicar";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { comparadorDaOrdem } from "@/lib/escale/filtros/ordenar";
```

2. Troque

```ts
  role,
  funis,
}: {
  pipelineId: string;
  initialName: string;
  role: Role;
```

por

```ts
  role,
  funis,
  cascaNova = false,
}: {
  pipelineId: string;
  initialName: string;
  role: Role;
  /**
   * FORK ESCALE · Fase 1D: com a casca nova (cookie `escale_menu=topo`), a barra
   * do quadro da Escale entra no lugar do `FilterBar`. Sem ela, nada muda.
   */
  cascaNova?: boolean;
```

3. Troque

```ts
  const { data, isLoading, error, pulses, realtimeStatus, seguranca } = useBoard(pipelineId);
```

por

```ts
  const { data, isLoading, error, pulses, realtimeStatus, seguranca, refetch, isFetching } = useBoard(pipelineId);
```

4. Logo DEPOIS da linha `const filteredLeads = data ? applyFilters(data.leads, filters, { categoriaDo }) : [];`, acrescente:

```ts
  // FORK ESCALE · Fase 1D: com a casca nova, quem filtra é a barra nova. O
  // recorte esconde as colunas de ganho e de perda que o status não pede e
  // aplica os filtros; a ordenação vale em todas as colunas.
  const filtrosEscale = useFiltrosDoQuadro();
  const orgAtiva = useActiveOrg();
  const camposDoQuadro = useMemo(() => camposFiltraveis([data?.pipeline.settings]), [data?.pipeline.settings]);
  const recorte = useMemo(
    () =>
      cascaNova && data
        ? recortarQuadro(data, filtrosEscale.filtros, { moeda: orgAtiva?.currency ?? null, campos: camposDoQuadro })
        : null,
    [cascaNova, data, filtrosEscale.filtros, orgAtiva?.currency, camposDoQuadro],
  );
  const ordemDosCards = useMemo(
    () => (cascaNova ? comparadorDaOrdem(filtrosEscale.filtros.ordem, camposDoQuadro) : undefined),
    [cascaNova, filtrosEscale.filtros.ordem, camposDoQuadro],
  );
```

5. Troque

```tsx
      <FilterBar
        filters={filters}
        onChange={setFilters}
        leads={data?.leads ?? []}
        settings={data?.pipeline.settings}
      />
```

por

```tsx
      {cascaNova ? (
        <BarraDoQuadro
          alvo={{ tipo: "origem", id: pipelineId }}
          filtros={filtrosEscale.filtros}
          filtroSalvoId={filtrosEscale.filtroSalvoId}
          onMudar={filtrosEscale.mudar}
          leads={data?.leads ?? []}
          campos={camposDoQuadro}
          settings={data?.pipeline.settings}
          contagem={recorte?.leads.length ?? 0}
          onAtualizar={() => void refetch()}
          atualizando={isFetching}
        />
      ) : (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          leads={data?.leads ?? []}
          settings={data?.pipeline.settings}
        />
      )}
```

6. No `<CalendarioDoFunil … />`, troque `leads={filteredLeads}` por `leads={recorte?.leads ?? filteredLeads}`.

7. No `<KanbanBoard … />`, troque

```tsx
          stages={data.stages}
          leads={filteredLeads}
```

por

```tsx
          stages={recorte?.stages ?? data.stages}
          leads={recorte?.leads ?? filteredLeads}
```

e, logo depois da linha `podeRenomearEtapa={ROLE_RANK[role] >= ROLE_RANK.manager}`, acrescente `ordemDosCards={ordemDosCards}`.

Em `app/app/pipelines/[id]/page.tsx`:

1. Logo DEPOIS da linha `import { PipelinePageClient } from "./_client";`, acrescente:

```ts
// FORK ESCALE · Fase 1D: a barra nova do quadro vem com a casca nova.
import { cookies } from "next/headers";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
```

2. Logo ANTES da linha `  return (` (a do `<PipelinePageClient`), acrescente:

```ts
  // FORK ESCALE · Fase 1D: a barra nova do quadro vem com a casca nova (cookie
  // `escale_menu=topo`); com a lateral, o quadro continua o do original.
  const cascaNova = lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo";
```

3. Logo depois da linha `      funis={funis ?? []}`, acrescente `      cascaNova={cascaNova}`.

- [ ] **Step 5: Rodar os testes novos e os do quadro e da página**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-ordenado.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx "app/app/pipelines/[id]/trocar-funil.test.tsx" tests/unit/novo-lead-escolhe-contato.test.tsx tests/unit/tag-em-lote-mostra-existentes.test.tsx tests/unit/selecao-longa-tem-busca.test.ts tests/unit/kanban-atalho-conversa.test.tsx tests/unit/funil-mostra-dados-do-cliente.test.tsx
grep -rln "pipelines/\[id\]/page" tests app --include=*.test.ts --include=*.test.tsx
corepack pnpm typecheck
```
Expected: os testes PASS e o typecheck fica sem erros novos. O `grep` lista os testes que importam a `page.tsx` do funil. Se algum existir e falhar por `cookies()` fora de requisição, acrescente nele `vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }))`. Se algum teste do original que renderiza a `_client` quebrar por `useActiveOrg` sem `currency`, isso não é erro: o mock dele não tem o campo, e a moeda cai em `null`. Leia a falha antes de mexer.

- [ ] **Step 6: Commit**

```bash
git add components/kanban/KanbanBoard.tsx "app/app/pipelines/[id]/_client.tsx" "app/app/pipelines/[id]/page.tsx" tests/unit/escale-quadro-ordenado.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
git commit -m "feat(escale): o quadro do funil usa a barra nova com a casca nova (Em aberto, filtros, ordenação)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: A Visualização usa a barra nova

**Files:**
- Modify: `hooks/escale/useQuadrosDaVisualizacao.ts`, `lib/escale/visualizacoes/regras.ts` (`cardsDaColuna`), `components/escale/visualizacoes/QuadroCombinado.tsx`, `components/escale/visualizacoes/QuadroDaVisualizacao.tsx`, `app/app/pipelines/visualizacoes/[id]/page.tsx`, `tests/unit/escale-quadro-da-visualizacao.test.tsx`, `tests/unit/escale-quadro-combinado.test.tsx`, `tests/unit/escale-visualizacoes-regras.test.ts`

**Interfaces:**
- Consumes: Tasks 4, 5 e 11, mais `settingsDaVisualizacao` e `montarColunas` da 1C.
- Produces:
  - `useQuadrosDaVisualizacao(ids)` devolve também `atualizar(): void` e `atualizando: boolean`;
  - `cardsDaColuna(coluna, leads, comparar?)`;
  - `QuadroCombinado` aceita `ordemDosCards?`;
  - `QuadroDaVisualizacao` recebe `id` (o alvo dos filtros salvos).

- [ ] **Step 1: Ajustar os testes da 1C ao comportamento novo (vão falhar)**

Em `tests/unit/escale-visualizacoes-regras.test.ts`, acrescente este caso como o ÚLTIMO do `describe("cardsDaColuna e planejarSoltura", …)`. Se o arquivo ainda não importa `type Lead` de `@/lib/types/leads`, acrescente o import.

```ts
  it("com um comparador (a ordenação da Fase 1D), a coluna segue ele", () => {
    const coluna = { etapas: ["a1", "b1"] };
    const leads = [
      { id: "l1", stage_id: "a1", position_in_stage: 1, title: "Bia" },
      { id: "l2", stage_id: "b1", position_in_stage: 2, title: "Ana" },
    ] as unknown as Lead[];
    expect(cardsDaColuna(coluna, leads, (x, y) => x.title.localeCompare(y.title)).map((l) => l.id)).toEqual(["l2", "l1"]);
  });
```

Em `tests/unit/escale-quadro-combinado.test.tsx`:

1. Troque a função `renderizar` por:

```tsx
function renderizar(ordemDosCards?: (a: Lead, b: Lead) => number) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <QuadroCombinado
        quadros={QUADROS}
        leads={[LEAD_A, LEAD_B]}
        selecionados={[]}
        onSelecao={onSelecao}
        ordemDosCards={ordemDosCards}
      />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}
```

2. Acrescente no FIM do arquivo:

```tsx
describe("<QuadroCombinado> com ordenação (Fase 1D)", () => {
  const PELO_TITULO_DESC = (a: Lead, b: Lead) => b.title.localeCompare(a.title);

  it("a coluna combinada segue a ordenação escolhida", () => {
    renderizar(PELO_TITULO_DESC);
    const entrada = document.querySelector('[data-coluna-da-visualizacao="Entrada"]') as HTMLElement;
    expect(within(entrada).getAllByRole("button", { name: /—/ }).map((b) => b.textContent)).toEqual([
      "Bia — Entrada · Parceiros",
      "Ana — Entrada · Leads",
    ]);
  });

  it("arrastar dentro da mesma coluna não move", async () => {
    renderizar(PELO_TITULO_DESC);
    await soltar("l-a", "coluna:Entrada", "coluna:Entrada", 1);
    expect(movers.A).not.toHaveBeenCalled();
  });

  it("soltar em outra coluna põe o card no fim da etapa da origem dele", async () => {
    renderizar(PELO_TITULO_DESC);
    await soltar("l-a", "coluna:Entrada", "coluna:Proposta");
    expect(movers.A).toHaveBeenCalledWith({ leadId: "l-a", stageId: "a2", positionInStage: 1000, expectedUpdatedAt: "upd-l-a" });
  });

  it("origem sem a etapa: recusa com aviso, como sem ordenação", async () => {
    renderizar(PELO_TITULO_DESC);
    await soltar("l-a", "coluna:Entrada", "coluna:Qualificação");
    expect(toast.error).toHaveBeenCalledWith("A origem «Leads» não tem a etapa «Qualificação».");
    expect(movers.A).not.toHaveBeenCalled();
  });
});
```

Em `tests/unit/escale-quadro-da-visualizacao.test.tsx`:

1. Troque a linha

```tsx
vi.mock("@/components/kanban/FilterBar", () => ({ FilterBar: () => <div>filtros</div> }));
```

por

```tsx
vi.mock("@/components/escale/filtros/BarraDoQuadro", () => ({
  BarraDoQuadro: (p: { alvo: { tipo: string; id: string }; contagem: number; onAtualizar: () => void }) => (
    <button type="button" onClick={p.onAtualizar}>{`barra ${p.alvo.tipo} ${p.alvo.id}: ${p.contagem}`}</button>
  ),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }) }));
```

2. Logo depois da linha `import { QuadroDaVisualizacao } from "@/components/escale/visualizacoes/QuadroDaVisualizacao";`, acrescente:

```tsx
const atualizarOrigens = vi.fn();
```

3. Os retornos do hook ganham os dois campos novos, e a página passa a receber `id`. Da raiz do repositório:

```bash
node -e '
const fs = require("fs");
const ARQ = "tests/unit/escale-quadro-da-visualizacao.test.tsx";
let s = fs.readFileSync(ARQ, "utf8");
const antes = s;
s = s.replace(/indisponiveis: (\[[^\]]*\]) \}\)/g, "indisponiveis: $1, atualizar: atualizarOrigens, atualizando: false })");
s = s.split("<QuadroDaVisualizacao nome=").join("<QuadroDaVisualizacao id=\"v-1\" nome=");
if (s === antes) throw new Error("nada trocado");
fs.writeFileSync(ARQ, s);
console.log("ok");
'
```
Expected: `ok`. Confira com `grep -n "atualizar: atualizarOrigens" tests/unit/escale-quadro-da-visualizacao.test.tsx`: devem aparecer 3 linhas (o `beforeEach`, o caso das indisponíveis e o caso "carregando").

4. Troque o caso inteiro

```tsx
  it("os cards das origens vão juntos para o quadro, e o filtro da URL vale em todas", () => {
    render(<QuadroDaVisualizacao id="v-1" nome="Time" origens={ORIGENS} />);
    expect(idsNoQuadro()).toEqual(["a-aberto", "a-ganho", "b-aberto"]);
    busca.atual = "status=open";
    render(<QuadroDaVisualizacao id="v-1" nome="Time 2" origens={ORIGENS} />);
    expect(Array.from(screen.getAllByRole("list", { name: "quadro" })[1]!.querySelectorAll("li")).map((li) => li.textContent)).toEqual([
      "a-aberto",
      "b-aberto",
    ]);
  });
```

por

```tsx
  it("os cards das origens vão juntos; abre em Em aberto, e o status da URL vale em todas", () => {
    render(<QuadroDaVisualizacao id="v-1" nome="Time" origens={ORIGENS} />);
    expect(idsNoQuadro()).toEqual(["a-aberto", "b-aberto"]);
    busca.atual = "st=open,won,lost";
    render(<QuadroDaVisualizacao id="v-1" nome="Time 2" origens={ORIGENS} />);
    expect(Array.from(screen.getAllByRole("list", { name: "quadro" })[1]!.querySelectorAll("li")).map((li) => li.textContent)).toEqual([
      "a-aberto",
      "a-ganho",
      "b-aberto",
    ]);
  });

  it("a barra é da visualização (alvo dos filtros salvos), conta os cards e Atualizar relê as origens", async () => {
    render(<QuadroDaVisualizacao id="v-1" nome="Time" origens={ORIGENS} />);
    const botao = screen.getByRole("button", { name: "barra visualizacao v-1: 2" });
    await userEvent.setup().click(botao);
    expect(atualizarOrigens).toHaveBeenCalled();
  });
```

(O passo 3 já trocou o `render(` do caso antigo para `id="v-1"`; o texto acima é o caso já com essa troca.)

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-visualizacoes-regras.test.ts tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx
```
Expected: FAIL nos casos novos:
- o comparador é ignorado: a coluna sai `l1, l2` e `Ana` antes de `Bia`;
- arrastar dentro da coluna move;
- a página mostra `a-ganho` com o padrão;
- não existe o botão "barra visualizacao v-1: 2".

- [ ] **Step 3: O hook relê as origens**

Em `hooks/escale/useQuadrosDaVisualizacao.ts`, troque

```ts
export interface QuadrosDaVisualizacao {
  quadros: BoardData[];
  carregando: boolean;
  indisponiveis: string[];
}
```

por

```ts
export interface QuadrosDaVisualizacao {
  quadros: BoardData[];
  carregando: boolean;
  indisponiveis: string[];
  /** Relê todas as origens (o botão Atualizar da barra, Fase 1D). */
  atualizar: () => void;
  atualizando: boolean;
}
```

e troque

```ts
      indisponiveis: resultados.flatMap((r, i) => (r.isError && !r.data ? [pipelineIds[i]!] : [])),
    }),
```

por

```ts
      indisponiveis: resultados.flatMap((r, i) => (r.isError && !r.data ? [pipelineIds[i]!] : [])),
      atualizar: () => {
        for (const r of resultados) void r.refetch();
      },
      atualizando: resultados.some((r) => r.isFetching),
    }),
```

- [ ] **Step 4: `cardsDaColuna` aceita o comparador**

Em `lib/escale/visualizacoes/regras.ts`, troque

```ts
/** Os cards da coluna, de todas as origens, na ordem das posições. */
export function cardsDaColuna(coluna: Pick<ColunaCombinada, "etapas">, leads: readonly Lead[]): Lead[] {
  const etapas = new Set(coluna.etapas);
  return leads.filter((l) => etapas.has(l.stage_id)).sort((a, b) => a.position_in_stage - b.position_in_stage);
}
```

por

```ts
/**
 * Os cards da coluna, de todas as origens, na ordem das posições — ou na
 * ordenação escolhida na barra do quadro (Fase 1D).
 */
export function cardsDaColuna(
  coluna: Pick<ColunaCombinada, "etapas">,
  leads: readonly Lead[],
  comparar?: (a: Lead, b: Lead) => number,
): Lead[] {
  const etapas = new Set(coluna.etapas);
  return leads.filter((l) => etapas.has(l.stage_id)).sort(comparar ?? ((a, b) => a.position_in_stage - b.position_in_stage));
}
```

- [ ] **Step 5: O quadro combinado respeita a ordenação**

Em `components/escale/visualizacoes/QuadroCombinado.tsx`:

1. Logo depois da linha `import { alternarNaSelecao, cardsDaColuna, montarColunas, planejarSoltura } from "@/lib/escale/visualizacoes/regras";`, acrescente:

```ts
import { posicaoNoFimDaEtapa } from "@/lib/escale/filtros/ordenar";
```

2. Troque

```tsx
  leadInicial,
}: {
  quadros: BoardData[];
  leads: Lead[];
  selecionados: string[];
  onSelecao: (ids: string[]) => void;
  leadInicial?: string | null;
}) {
```

por

```tsx
  leadInicial,
  ordemDosCards,
}: {
  quadros: BoardData[];
  leads: Lead[];
  selecionados: string[];
  onSelecao: (ids: string[]) => void;
  leadInicial?: string | null;
  /** A ordenação da barra (Fase 1D). Com ela, arrastar só muda de etapa, e o card vai para o fim. */
  ordemDosCards?: (a: Lead, b: Lead) => number;
}) {
```

3. Troque o `aoSoltar` inteiro, de `  const aoSoltar = useCallback(` até o `  );` que fecha o `useCallback` (o que termina em `[leads, colunas, qc, quadroDe, t],`), por:

```tsx
  const aoSoltar = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;
      const lead = leads.find((l) => l.id === draggableId);
      const coluna = colunas.find((c) => c.chave === destination.droppableId);
      if (!lead || !coluna) return;
      const recusar = () =>
        toast.error(
          t("A origem «{origem}» não tem a etapa «{etapa}».")
            .replace("{origem}", quadroDe.get(lead.pipeline_id)?.pipeline.name ?? "")
            .replace("{etapa}", coluna.nome),
        );

      // Fase 1D: com ordenação ativa, a posição na coluna é a da ordenação. Mesma
      // coluna = nada; outra coluna = fim da etapa (inteira, do cache da origem).
      if (ordemDosCards) {
        if (source.droppableId === destination.droppableId) return;
        const stageId = coluna.destinos[lead.pipeline_id];
        if (!stageId) {
          recusar();
          return;
        }
        const daOrigem = qc.getQueryData<BoardData>(chaveDoQuadro(lead.pipeline_id))?.leads ?? leads;
        movers.current.get(lead.pipeline_id)?.({
          leadId: lead.id,
          stageId,
          positionInStage: posicaoNoFimDaEtapa(daOrigem, stageId, lead.id),
          expectedUpdatedAt: lead.updated_at,
        });
        return;
      }

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
        recusar();
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
    [leads, colunas, qc, quadroDe, t, ordemDosCards],
  );
```

4. No `<ColunaDaVisualizacao … />`, troque `leads={cardsDaColuna(coluna, leads)}` por `leads={cardsDaColuna(coluna, leads, ordemDosCards)}`.

- [ ] **Step 6: A página da visualização usa a barra**

Troque o conteúdo de `components/escale/visualizacoes/QuadroDaVisualizacao.tsx` por:

```tsx
"use client";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { BarraDoQuadro } from "@/components/escale/filtros/BarraDoQuadro";
import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useFiltrosDoQuadro } from "@/hooks/escale/useFiltrosDoQuadro";
import { useQuadrosDaVisualizacao } from "@/hooks/escale/useQuadrosDaVisualizacao";
import { useT } from "@/hooks/i18n/useT";
import { recortarQuadro } from "@/lib/escale/filtros/aplicar";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { comparadorDaOrdem } from "@/lib/escale/filtros/ordenar";
import { settingsDaVisualizacao } from "@/lib/escale/visualizacoes/regras";
import { Plus } from "@/lib/ui/icons";

import { LoteDaVisualizacao } from "./LoteDaVisualizacao";
import { QuadroCombinado } from "./QuadroCombinado";

/**
 * A PÁGINA DE UMA VISUALIZAÇÃO (fork Escale, Fases 1C e 1D): o mesmo esqueleto
 * da página do funil — título, "Novo Lead", a barra do quadro, quadro e lote —
 * com as origens da visualização no lugar de um funil só.
 *
 * Os filtros rodam POR ORIGEM: a categoria de um motivo de perda e as colunas de
 * ganho e de perda são da origem do card. Os filtros salvos são da VISUALIZAÇÃO
 * (o `alvo` da barra), não das origens.
 */
export function QuadroDaVisualizacao({
  id,
  nome,
  origens,
}: {
  id: string;
  nome: string;
  origens: Array<{ id: string; name: string }>;
}) {
  const t = useT();
  const searchParams = useSearchParams();
  const { filtros, filtroSalvoId, mudar } = useFiltrosDoQuadro();
  const orgAtiva = useActiveOrg();

  // Estável entre renders: o `combine` do hook depende deste array.
  const ids = useMemo(() => origens.map((o) => o.id), [origens]);
  const { quadros, carregando, indisponiveis, atualizar, atualizando } = useQuadrosDaVisualizacao(ids);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [novoEm, setNovoEm] = useState<string | null>(null);

  const campos = useMemo(() => camposFiltraveis(quadros.map((q) => q.pipeline.settings)), [quadros]);
  const recortes = useMemo(
    () => quadros.map((q) => ({ quadro: q, ...recortarQuadro(q, filtros, { moeda: orgAtiva?.currency ?? null, campos }) })),
    [quadros, filtros, orgAtiva?.currency, campos],
  );
  // As colunas do quadro combinado saem só das etapas visíveis de cada origem.
  const quadrosVisiveis = useMemo(() => recortes.map((r) => ({ ...r.quadro, stages: r.stages })), [recortes]);
  const filtrados = useMemo(() => recortes.flatMap((r) => r.leads), [recortes]);
  const ordemDosCards = useMemo(() => comparadorDaOrdem(filtros.ordem, campos), [filtros.ordem, campos]);
  const todosOsLeads = useMemo(() => quadros.flatMap((q) => q.leads), [quadros]);
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

      <BarraDoQuadro
        alvo={{ tipo: "visualizacao", id }}
        filtros={filtros}
        filtroSalvoId={filtroSalvoId}
        onMudar={mudar}
        leads={todosOsLeads}
        campos={campos}
        settings={settings}
        contagem={filtrados.length}
        onAtualizar={atualizar}
        atualizando={atualizando}
      />

      {carregando && quadros.length === 0 ? (
        <div className="flex flex-1 animate-pulse items-center justify-center text-muted-foreground">{t("Carregando…")}</div>
      ) : (
        <QuadroCombinado
          quadros={quadrosVisiveis}
          leads={filtrados}
          selecionados={selecionados}
          onSelecao={setSelecionados}
          leadInicial={searchParams.get("lead")}
          ordemDosCards={ordemDosCards}
        />
      )}

      <LoteDaVisualizacao selecionados={selecionados} quadros={quadros} onLimpar={() => setSelecionados([])} />
    </div>
  );
}
```

O link direto do card (`?lead=`) continua valendo: a página lê `searchParams.get("lead")` como na 1C.

Em `app/app/pipelines/visualizacoes/[id]/page.tsx`, troque

```tsx
    <QuadroDaVisualizacao
      nome={visualizacao.name}
```

por

```tsx
    <QuadroDaVisualizacao
      id={visualizacao.id}
      nome={visualizacao.name}
```

- [ ] **Step 7: Rodar os testes da visualização**

```bash
corepack pnpm vitest run tests/unit/escale-visualizacoes-regras.test.ts tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx tests/unit/escale-pagina-da-visualizacao.test.tsx
corepack pnpm typecheck
```
Expected: os 4 arquivos PASS; typecheck sem erros novos.

- [ ] **Step 8: Commit**

```bash
git add hooks/escale/useQuadrosDaVisualizacao.ts lib/escale/visualizacoes/regras.ts components/escale/visualizacoes/QuadroCombinado.tsx components/escale/visualizacoes/QuadroDaVisualizacao.tsx "app/app/pipelines/visualizacoes/[id]/page.tsx" tests/unit/escale-visualizacoes-regras.test.ts tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx
git commit -m "feat(escale): a visualização usa a barra do quadro (Em aberto, filtros, salvos, ordenação, atualizar)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Gates, medição do maior funil e PR

**Files:**
- Nenhum arquivo novo. Só verificação, medição e o PR.

**Interfaces:**
- Consumes: tudo das Tasks 1 a 13.
- Produces: o PR para `rgisjr/escale-crm`. Não mergear, não publicar release e não mexer na VPS.

- [ ] **Step 1: Os gates inteiros**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:unit 2>&1 | tail -40
```
Expected:
- typecheck sem erros novos;
- lint sem erros (warnings antigos podem continuar);
- `test:unit` com falhas SÓ entre as conhecidas desta máquina.

Para provar que uma falha não é regressão, rode o mesmo arquivo em `escale-crm/main` num worktree temporário:

```bash
git worktree add ../wt-main-1d escale-crm/main && cd ../wt-main-1d && corepack pnpm install --frozen-lockfile && corepack pnpm vitest run <arquivo> ; cd - && git worktree remove ../wt-main-1d --force
```

Regressão é o que passa lá e falha aqui: corrija antes de seguir.

- [ ] **Step 2: A prova no Postgres inteira**

```bash
docker info --format '{{.ServerVersion}}'
corepack pnpm test:db 2>&1 | tail -30
```
Expected: `==> test:db verde`. Se o Docker não responder, PARE e peça ao usuário para abrir o Docker Desktop.

- [ ] **Step 3: Medir o maior funil em produção (só leitura)**

Risco do PRD, seção 11: o quadro carrega o funil inteiro e filtra no navegador. Rode, SÓ LEITURA, no projeto `jsrzgxyioczdgwiklkrc`:

```sql
select p.name, count(l.id) as negocios
  from public.crm_pipelines p
  join public.crm_leads l on l.pipeline_id = p.id and l.status <> 'archived'
 group by p.id, p.name
 order by negocios desc
 limit 5;
```

Use o MCP de leitura `supabase-crm`. Se ele não estiver disponível nesta sessão, peça ao usuário para rodar o SQL no painel do Supabase e colar o resultado. NÃO use o MCP de escrita. Anote o maior número no corpo do PR. Se passar de 2.000 negócios num funil, escreva no PR que paginar ou filtrar no servidor deve virar fase própria. Não é escopo desta.

- [ ] **Step 4: Push e PR**

```bash
git push -u escale-crm feat/fase-1d-filtros-do-quadro
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-1d-filtros-do-quadro \
  --title "feat(escale): Fase 1D — filtros e ordenação do quadro de Negócios" \
  --body-file - <<'PR'
## O que muda

Com a **casca nova** (`escale_menu=topo`), o quadro de Negócios (funil e Visualização) ganha a barra da Clint. Itens B1 a B9 do PRD `docs/modulos/1-negocios.md`:

- **Status com várias escolhas, padrão "Em aberto".** As colunas de ganho e de perda somem quando o status não as pede e voltam quando ele pede ganhos ou perdidos (decisão de 15/10, caminho A).
- **Filtros salvos, pessoais ou compartilhados.**
  - Qualquer pessoa salva os seus, e só quem criou muda ou exclui.
  - O compartilhado aparece para quem vê a origem ou a visualização, pela RLS e com a sessão de quem olha.
  - O limite é de 20 filtros por pessoa em cada origem ou visualização.
- **Painel Filtros** (Negócio, Conversas, Tags, Campos, Outros):
  - data de criação e valor, este agora com tela;
  - conversa: com ou sem, não lidas, não respondidas, status, canal e atendente;
  - campos personalizados do negócio e campos fixos do contato;
  - atividades concluídas, mínimo e máximo;
  - tempo na etapa e tempo desde a entrada, em horas ou dias.
- **Resumo dos filtros ativos**, visível com o painel fechado.
- **Ordenar por até 3 critérios:** contato, negócio, campos personalizados, atividades e atendimento. Com ordenação ativa, arrastar dentro da coluna fica desligado, e mudar de etapa põe o card no fim.
- **Contagem** "N negócios" e botão **Atualizar**.

Com a lateral, o quadro do funil continua o do original.

## Banco

Migration **9004**:
- tabela `crm_filtros_salvos`, com RLS, FKs compostas com cascade e CHECKs;
- função `fn_escale_atividades_concluidas` (invoker), que conta no banco por causa do corte de 1000 linhas do PostgREST.

A rota do quadro ganha a etapa do fork `comDadosDosFiltros`, entre tarefas e conversas. As cercas do quadro continuam verdes.

## Fora desta fase (registrado)

- **Setor** no filtro de conversa: o original não tem.
- **Campos personalizados do contato:** chegam com a Fase 2.
- **Empresa** no Ordenar: chega com a Fase 2.
- **Paginar ou filtrar no servidor:** maior funil em produção = **<N> negócios** (medido na Task 14).

## Verificação

- [ ] `typecheck`, `lint` e `test:unit` (só as falhas conhecidas do Windows).
- [ ] `test:db` verde (prova da 9004 e varredura de RLS).
- [ ] Na tela, com a casca nova, depois do deploy (usuário):
  - [ ] o funil abre em "Em aberto", sem as colunas de ganho e de perda;
  - [ ] marcar "Ganhos" traz a coluna de volta;
  - [ ] salvar um filtro compartilhado, abrir com outra pessoa e ver o filtro;
  - [ ] cada seção do painel restringe os cards, também na Visualização;
  - [ ] ordenar por valor vale em todas as colunas, e arrastar só muda de etapa;
  - [ ] a contagem bate com os cards, e Atualizar relê.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PR
```

Antes de rodar, troque `<N>` no corpo pelo número medido no Step 3. Expected: a URL do PR. Mostre a URL ao usuário e PARE: merge, tag, release e VPS só com o "pode fazer" dele.
