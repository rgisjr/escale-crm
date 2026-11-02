# Fase 10C — Origem do comentário na ficha, filtro de contatos e atalhos do Insights · Implementation Plan

> **Para quem executa:** use superpowers:executing-plans, inline, em Sonnet 5.5 (memória `executar-planos-com-executing-plans`). Steps use checkbox (`- [ ]`) syntax for tracking. Mesmo padrão do plano da 10B: decisões, arquivos, interfaces, regras, SQL, textos e testes escritos aqui; o código de tela restante é escrito na execução seguindo os moldes citados.

> **PRD:** `docs/modulos/10-comentarios.md` (aprovado em 01/11/2026): linha 10C da seção 8 ("Origem do comentário na ficha do contato, filtro de contatos por isso, atalho do Insights para a ficha e para a publicação"), linha "Origem do contato" do quadro C da seção 4, seções 5 e 6 (filtros) e o risco "Sincronia com o original" da seção 12.
> **Frente 10-I** (10B → **10C** → 10A; executa tudo, testa tudo uma vez, publica tudo uma vez). **Depende da 10B mergeada** (tabela `escale_disparos_de_comentario`, migration 9801, `lib/escale/comentarios/*`). Worktree nova `wt-10c` a partir de `escale-crm/main` depois do merge da 10B. **Uma migration (9802).** Um PR (`feat/fase-10c-origem-do-comentario`).

**Goal:** com a casca ligada, a ficha de quem comentou mostra de que publicação e de que automação a pessoa veio (com o texto do comentário e o link da publicação), a lista de contatos filtra "Veio de comentário" / "Não veio de comentário", e cada execução do Insights de uma automação de comentário tem "Ver contato" e "Ver publicação".

**Architecture:**
- **A tabela de disparos da 10B é a fonte da origem.** Ela já liga contato, regra, publicação, texto e data. A 9802 acrescenta três colunas da publicação (legenda, miniatura, link), que a 10B já recebe no payload do evento mas não grava, e um índice por contato.
- **Disparo segue a mescla.** A mescla do original (`fn_mesclar_contatos`) só reaponta as tabelas dele. Um gatilho da 9802 em `contacts` (`after update of is_merged_into`) leva os disparos do contato mesclado para o vencedor.
- **Filtro no banco, como os outros.** `fn_escale_contatos_do_filtro` (última versão: 9105) é recriada com a cláusula `comentario` (`com`/`sem`). Lista, total, primeiros, ações em massa e público de campanha passam a entender o filtro sem mudar de assinatura.
- **Ficha:** rota de leitura `GET /api/v1/contatos/[id]/comentarios` (sessão de quem olha, RLS) e a linha "Origem" na aba Contato da janela do contato, abaixo de "Tags".
- **Insights:** a rota de execuções, quando o gatilho é de comentário, junta a publicação de cada execução pelo `run_id` do disparo; o cartão ganha "Ver contato" e "Ver publicação".

**Tech Stack:** Next.js 16 App Router, TypeScript estrito, zod 4, React Query, Radix, `lucide-react` 1.x e Phosphor pela `lib/ui/icons-da-casca.ts`, Supabase (RLS, RPC, gatilho), Vitest + Testing Library, `test:db` (Postgres efêmero, `gov-helpers`).

## Global Constraints

- **REGRA PÉTREA:** a execução só começa com o "pode fazer" do usuário. Depois, a entrega é do Claude, mas **nada da Frente 10-I vai para produção antes da 10A** (CLAUDE.md: executa tudo, testa tudo, publica tudo). A 10C é mergeada na `main` e fica parada.
- **Durante a execução:** só o teste que a task cria, `corepack pnpm typecheck` (com `NODE_OPTIONS=--max-old-space-size=10240`) e `corepack pnpm eslint <arquivos>`. **Exceção:** a Task 2 roda `corepack pnpm test:db tests/invariants/escale-comentarios-9802.test.ts` uma vez (pelo **Git Bash**, Docker aberto, com `CONFERENCIA_KIT_RELEASE=<última tag>`; memória `frente-automacoes-estado`). Rodada cheia, `test:db` completo e `test:db:update` ficam para a bateria da frente (fim da 10A).
- **Migration 9802:** `supabase/migrations/20261203130000_9802_origem_do_comentario.sql` (carimbo seguinte ao da 9801, `20261203120000`; se a `main` já tiver outro depois, pegar o seguinte). Cabeçalho `-- manifest:` obrigatório, sem linha no `MANIFEST.md`; `corepack pnpm checar:colisao-de-migration` antes do PR. O bloco vai colado no `supabase/baseline.sql` **logo depois do bloco da 9801** (`grep -n "migration 9801" supabase/baseline.sql`) e antes da varredura de anon (memória `baseline-ordem-dos-blocos-do-fork`).
- **Arquivos do Rafael:** nenhum. Tudo o que muda é do fork (`lib/escale/`, `components/escale/`, `hooks/escale/`, `app/api/v1/contatos/[id]/…` novo, `app/api/v1/automacoes-da-casca/…`). Em arquivo compartilhado (`lib/i18n/dicionario.ts`, `supabase/baseline.sql`) o bloco do fork entra no ponto fixo indicado, nunca no fim.
- **Sem a casca nada muda:** a janela do contato, o painel de filtros e o Insights só existem com a casca. A lista do original não usa `fn_escale_contatos_do_filtro`.
- **Igual à Clint:** a Clint **não tem** origem de comentário na ficha, filtro por comentário nem "Ver publicação" (o gatilho de comentário dela não mostra isso). O visual reaproveita peças que já seguem a Clint: a linha "Tags" da aba Contato (print 2b-10) para a linha "Origem", o `SeletorDaCasca` do grupo "Telefone" do filtro (Clint `index-A38akjUb`) para o grupo "Comentário", e o "Ver negócio" do cartão da execução (07-029) para os dois atalhos. Molde **provisório**; aprovar este plano vale como confirmação dele. **Não escrever caminho de imagem** neste plano nem no PR (cerca `evidencia-citada`). A conferência visual é da bateria da frente.
- **Marca:** link e destaque em `casca-marca-forte` (como os links da ficha), nada de cor nova.
- **Formatos BR:** datas `dd/mm/aaaa HH:mm` pelo `dataHoraBr` (`lib/escale/negocio/arquivos.ts`, como a aba Arquivos da ficha); números com `toLocaleString("pt-BR")`.
- **Textos de interface** em `lib/i18n/dicionario.ts` (pt e es), lidos por `useT()`, no bloco do fork da 10B.
- **Segurança:** link e miniatura vêm do webhook (dado de fora). Só se mostra link `https:` de `instagram.com`/`facebook.com`/`fb.com` (e subdomínios) e miniatura `https:`; o resto vira `null` no servidor (D7).
- **Imutabilidade, arquivos pequenos (≤ 400 linhas), sem `console.log`** (usar `logger` ou o `falhaInesperadaDoQuadro` das rotas da ficha). `corepack pnpm`. Commits convencionais, um por task.

---

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| D1 | **A publicação fica gravada no disparo** (`publicacao_legenda`, `publicacao_miniatura`, `publicacao_link`), copiada do payload do evento na hora da reivindicação. Nada de ler o Zernio para montar a ficha | O payload da 10B já traz `publicacao.{legenda, miniatura, link}`; ler sob demanda gastaria chamada por ficha aberta e quebraria quando o post fosse apagado |
| D2 | **Origem = o disparo mais antigo do contato.** A ficha mostra a origem e, se houver mais de um, a lista dos 10 mais recentes com o total | "Veio do comentário em <post>" é o primeiro contato; os seguintes são histórico |
| D3 | **Linhas `repetido` contam** como comentário (na ficha e no filtro) | A pessoa comentou, só não recebeu o fluxo de novo |
| D4 | **Disparo segue a mescla** por gatilho em `contacts` (definer, só no `update of is_merged_into`). Como a mescla do original achata a corrente (`is_merged_into` de quem já apontava para o secundário passa ao vencedor), o gatilho também achata | Sem isto, mesclar o contato do comentário com o do WhatsApp apagaria a origem da ficha e do filtro |
| D5 | **Filtro: grupo "Comentário" na seção Contato**, com "Veio de comentário" / "Não veio de comentário" (`comentario: "com" \| "sem"`). Sem filtro por automação ou por publicação nesta fase | PRD: "o filtro acha esses contatos". Por automação/publicação: pergunta 1 |
| D6 | **Ficha: linha "Origem" na aba Contato da janela do contato**, logo abaixo de "Tags". Só na janela do contato (não na aba Contato da ficha do negócio, que usa o `ContatoEditavel` compartilhado) | PRD fala da ficha do contato; mexer no `ContatoEditavel` levaria a linha para o negócio também |
| D7 | **Link só de Instagram/Facebook em `https:`**; miniatura só `https:`. Link abre em aba nova (`target="_blank" rel="noopener noreferrer"`) | Dado do webhook não é confiável (`javascript:` e afins) |
| D8 | **O nome da automação aparece como texto**, sem link | Automações é tela de gerente; a ficha é vista por qualquer membro |
| D9 | **Insights: "Ver contato" e "Ver publicação" só quando o gatilho da regra é o de comentário.** "Ver contato" abre `/app/contacts/{id}` (a janela do contato sobre a lista); "Ver publicação" abre o link da D7. O CSV não muda | É o que o PRD pede; nas outras automações o cartão segue igual à 07-029 |

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20261203130000_9802_origem_do_comentario.sql` | Colunas da publicação, índice por contato, gatilho da mescla, filtro `comentario` |
| `lib/escale/comentarios/origem.ts` | Puras: `linkDaPublicacao`, `miniaturaSegura`, `colunasDaPublicacao`, tipos `ComentarioDoContato`, `ComentariosDoContato` |
| `lib/escale/comentarios/do-contato.ts` | `comentariosDoContato` (servidor, sessão) |
| `lib/escale/comentarios/publicacoes-das-execucoes.ts` | `comPublicacoes` (servidor, sessão) |
| `app/api/v1/contatos/[id]/comentarios/route.ts` | GET da origem e dos comentários do contato |
| `hooks/escale/useComentariosDoContato.ts` | `useComentariosDoContato(contatoId)` |
| `components/escale/contatos/ficha/OrigemDoComentario.tsx` | A linha "Origem" da janela do contato |
| Fork que muda | `lib/escale/comentarios/disparos.ts` (10B), `lib/escale/contatos/{filtros,compilar-filtros}.ts`, `components/escale/contatos/filtros/{SecaoContatoDoFiltro,FaixaDeFiltros}.tsx`, `components/escale/contatos/ficha/JanelaDoContato.tsx`, `lib/escale/automacoes/insights/{banco,tipos}.ts`, `app/api/v1/automacoes-da-casca/[id]/execucoes/route.ts`, `components/escale/automacoes/fluxo/insights/{CartaoDaExecucao,JanelaDeExecucoes}.tsx`, `lib/i18n/dicionario.ts`, `supabase/baseline.sql` |
| Testes | `tests/unit/escale-comentarios-origem.test.ts`, `-do-contato.test.ts`, `-ficha.test.tsx`, `-filtro.test.tsx`, `-atalhos.test.tsx`; acrescentar em `tests/unit/escale-filtros-de-contatos-regras.test.ts` e `tests/unit/escale-comentarios-disparos.test.ts` (10B); `tests/invariants/escale-comentarios-9802.test.ts` |
| Docs | `docs/modulos/10-comentarios.md` (estado da 10C) |

---

## 1. Regras puras (`lib/escale/comentarios/origem.ts`)

```ts
import type { PlataformaDeComentario } from "./constantes";

/** FORK ESCALE · Fase 10C: o que a ficha do contato mostra de cada comentário. */
export interface ComentarioDoContato {
  id: string;                       // id do disparo
  plataforma: PlataformaDeComentario;
  texto: string;
  comentadoEm: string;              // ISO
  repetido: boolean;
  publicacao: { id: string; legenda: string | null; miniatura: string | null; link: string | null };
  automacao: { id: string; nome: string };
}
export interface ComentariosDoContato {
  /** O disparo mais antigo (D2); null = o contato não veio de comentário. */
  origem: ComentarioDoContato | null;
  /** Os 10 mais recentes (inclui a origem, se estiver entre eles). */
  recentes: ComentarioDoContato[];
  total: number;
}
export const COMENTARIOS_RECENTES_NA_FICHA = 10;

const HOSTS_DA_PUBLICACAO = ["instagram.com", "facebook.com", "fb.com"] as const;

/** D7: só `https:` de Instagram/Facebook (ou subdomínio). Qualquer outra coisa → null. */
export function linkDaPublicacao(link: string | null | undefined): string | null;

/** D7: só `https:`, até 2.000 caracteres. */
export function miniaturaSegura(url: string | null | undefined): string | null;

/** D1: as colunas da 9802 a partir do `publicacao` do payload (`ComentarioDoEvento`). Legenda cortada em 300. */
export function colunasDaPublicacao(publicacao: { legenda: string | null; miniatura: string | null; link: string | null }): {
  publicacao_legenda: string | null;
  publicacao_miniatura: string | null;
  publicacao_link: string | null;
};
```

- `linkDaPublicacao`: `new URL(link)` dentro de `try`; recusa se `protocol !== "https:"`, se o tamanho passa de 2.000, ou se o `hostname` (minúsculo) não é um dos três nem termina em `.${host}`. Ex.: `https://www.instagram.com/reel/abc/` passa; `http://instagram.com/p/x` → null; `https://instagram.com.evil.io/p` → null; `javascript:alert(1)` → null.
- `miniaturaSegura`: `https:` e até 2.000 caracteres (as miniaturas vêm de CDN da Meta, com host variável).
- `colunasDaPublicacao`: legenda `trim()`, vazia → null, cortada em 300; miniatura por `miniaturaSegura`; link por `linkDaPublicacao`. Grava já saneado, então a leitura não precisa repetir (mas repete por defesa: `do-contato.ts` e `publicacoes-das-execucoes.ts` passam o link por `linkDaPublicacao` de novo).

### 1.1 Filtro de contatos (`lib/escale/contatos/filtros.ts`, fork)

```ts
/** FORK ESCALE · Fase 10C: contato que veio (ou não) de comentário do Instagram/Facebook. */
export const OPCOES_DE_COMENTARIO = ["com", "sem"] as const;
export type OpcaoDeComentario = (typeof OPCOES_DE_COMENTARIO)[number];
export const ROTULO_DO_COMENTARIO: Record<OpcaoDeComentario, string> = {
  com: "Veio de comentário",
  sem: "Não veio de comentário",
};
```

- `filtrosDeContatosSchema` ganha `comentario: z.enum(OPCOES_DE_COMENTARIO).optional()` (depois de `telefone`).
- `enxugarFiltros` mantém `comentario` (depois de `telefone`, na mesma forma: `...(f.comentario ? { comentario: f.comentario } : {})`).
- `contarNaSecao(f, "contato")` passa a somar `(e.comentario ? 1 : 0)`.
- `limparSecao(f, "contato")` também limpa `comentario` (desestruturar `comentario` e repor fora da seção contato).
- `ChaveDoChip` ganha `"comentario"`; `chipsDosFiltros` põe `{ chave: "comentario", secao: "contato", quantidade: 1 }` logo depois do de telefone; `removerChip(f, "comentario")` → `{ ...e, comentario: undefined }`.
- `compilar-filtros.ts`: `FiltroCompilado` ganha `comentario?: OpcaoDeComentario` e `compilarFiltros` passa `...(f.comentario ? { comentario: f.comentario } : {})` (depois de `telefone`).

---

## 2. Banco

### 2.1 Migration 9802 (`supabase/migrations/20261203130000_9802_origem_do_comentario.sql`)

Antes de escrever, conferir na `main` (Task 0) que a última definição de `fn_escale_contatos_do_filtro` ainda é a da 9105 (`git grep -n "function public.fn_escale_contatos_do_filtro" supabase/migrations`). Se outra migration a recriou depois, partir **dela** e acrescentar só o bloco marcado `-- Contato › Comentário (10C)`.

```sql
-- manifest: **Origem do comentário (fork Escale, Fase 10C).** `escale_disparos_de_comentario` ganha a publicação de onde veio o comentário (`publicacao_legenda` até 300, `publicacao_miniatura` e `publicacao_link` até 2.000; a aplicação só grava link https de Instagram/Facebook) e o índice por contato (ficha e filtro). Gatilho `trg_escale_disparos_seguem_a_mescla` em `contacts` (`after update of is_merged_into`, função definer `fn_escale_disparos_seguem_a_mescla`, fechada a todos): quando um contato é mesclado, os disparos dele passam ao vencedor. `fn_escale_contatos_do_filtro` (9105) é recriada com a cláusula `comentario` (`com` = tem disparo; `sem` = não tem), mesma assinatura, invoker. Nenhuma tabela do original muda.
-- ---- FORK ESCALE · origem do comentário (migration 9802) ----

alter table public.escale_disparos_de_comentario
  add column if not exists publicacao_legenda text
    check (publicacao_legenda is null or char_length(publicacao_legenda) <= 300),
  add column if not exists publicacao_miniatura text
    check (publicacao_miniatura is null or char_length(publicacao_miniatura) <= 2000),
  add column if not exists publicacao_link text
    check (publicacao_link is null or char_length(publicacao_link) <= 2000);

create index if not exists idx_escale_disparos_de_comentario_contato
  on public.escale_disparos_de_comentario (organization_id, contact_id, created_at)
  where contact_id is not null;

-- A mescla do original (fn_mesclar_contatos) só reaponta as tabelas dele. Os disparos
-- do contato que virou lápide passam ao vencedor, para a ficha e o filtro não perderem a origem.
create or replace function public.fn_escale_disparos_seguem_a_mescla()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.escale_disparos_de_comentario d
     set contact_id = new.is_merged_into,
         updated_at = now()
   where d.organization_id = new.organization_id
     and d.contact_id = new.id;
  return null;
end;
$$;

revoke all on function public.fn_escale_disparos_seguem_a_mescla() from public, anon, authenticated;

drop trigger if exists trg_escale_disparos_seguem_a_mescla on public.contacts;
create trigger trg_escale_disparos_seguem_a_mescla
  after update of is_merged_into on public.contacts
  for each row
  when (new.is_merged_into is not null and new.is_merged_into is distinct from old.is_merged_into)
  execute function public.fn_escale_disparos_seguem_a_mescla();

create or replace function public.fn_escale_contatos_do_filtro(
  p_org uuid,
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_filtros jsonb
)
returns table (contact_id uuid, last_activity_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select c.id, c.last_activity_at
    from public.contacts c
   where c.organization_id = p_org
     and c.kind = 'person'
     and c.is_merged_into is null
     and c.is_personal = (p_visao = 'pessoais')
     -- a busca: a mesma da 9101, mais o nome da empresa (2D)
     and (
       (p_padrao is null and coalesce(cardinality(p_digitos), 0) = 0 and p_cpf_hash is null)
       or (p_padrao is not null and (
            c.name ~* p_padrao
            or c.display_name ~* p_padrao
            or c.email ~* p_padrao
            or c.phone_number ~* p_padrao
            or (c.custom_fields ->> 'link_instagram') ~* p_padrao
            or (c.person_id is not null and exists (
                 select 1 from public.company_people cp
                   join public.companies co on co.id = cp.company_id
                  where cp.person_id = c.person_id and cp.organization_id = c.organization_id
                    and (co.trade_name ~* p_padrao or co.legal_name ~* p_padrao)))))
       or exists (
            select 1 from unnest(coalesce(p_digitos, '{}'::text[])) d
             where c.phone_number like '%' || d || '%')
       or (p_cpf_hash is not null and c.cpf_hash = p_cpf_hash)
     )
     -- a visão pronta
     and (
       p_visao in ('todos', 'pessoais')
       or (p_visao = 'com_negocio' and exists (
            select 1
              from public.crm_leads l
              join public.crm_pipelines p on p.id = l.pipeline_id
             where l.contact_id = c.id
               and l.organization_id = c.organization_id
               and not p.is_archived))
       or (p_visao = 'sem_negocio' and not exists (
            select 1
              from public.crm_leads l
              join public.crm_pipelines p on p.id = l.pipeline_id
             where l.contact_id = c.id
               and l.organization_id = c.organization_id
               and not p.is_archived))
     )
     -- Contato › Data de criação (no fuso da organização)
     and (p_filtros ->> 'criado_de' is null
          or (c.created_at at time zone (p_filtros ->> 'fuso'))::date >= (p_filtros ->> 'criado_de')::date)
     and (p_filtros ->> 'criado_ate' is null
          or (c.created_at at time zone (p_filtros ->> 'fuso'))::date <= (p_filtros ->> 'criado_ate')::date)
     -- Contato › Telefone
     and (case p_filtros ->> 'telefone'
            when 'com' then c.phone_number is not null
            when 'sem' then c.phone_number is null
            when 'internacional' then c.phone_number ~ '^\+[1-9][0-9]{7,14}$' and c.phone_number !~ '^\+55'
            when 'invalido' then c.phone_number is not null
              and c.phone_number !~ '^\+55[1-9][0-9](9[0-9]{8}|[2-8][0-9]{7})$'
              and not (c.phone_number ~ '^\+[1-9][0-9]{7,14}$' and c.phone_number !~ '^\+55')
            else true
          end)
     -- Contato › Comentário (10C): tem (ou não) disparo de comentário, repetido incluído
     and (case p_filtros ->> 'comentario'
            when 'com' then exists (
              select 1 from public.escale_disparos_de_comentario d
               where d.organization_id = c.organization_id and d.contact_id = c.id)
            when 'sem' then not exists (
              select 1 from public.escale_disparos_de_comentario d
               where d.organization_id = c.organization_id and d.contact_id = c.id)
            else true
          end)
     -- Negócio
     and (p_filtros -> 'negocio' is null or public.fn_escale_negocio_passa(c, p_filtros -> 'negocio'))
     -- Tags: grupos E/OU, sem caixa (5b)
     and (p_filtros -> 'tags' is null or public.fn_escale_tags_passam(c.tags, p_filtros -> 'tags'))
     -- Campos: grupos combinados por E ou OU
     and (p_filtros -> 'campos' is null or (
            case when coalesce(p_filtros #>> '{campos,combinar}', 'ou') = 'ou'
              then exists (
                select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g
                 where public.fn_escale_grupo_passa(c, g))
              else not exists (
                select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g
                 where not public.fn_escale_grupo_passa(c, g))
            end))
$$;

revoke all on function public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb) from public, anon;
grant execute on function public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb) to authenticated, service_role;

notify pgrst, 'reload schema';
```

O índice da 9801 é por regra; o novo (`organization_id, contact_id, created_at`) serve à ficha (mais antigo e mais recentes) e ao `exists` do filtro. A RLS da 9801 (leitura pela organização) já vale para a função invoker.

### 2.2 Invariantes (`tests/invariants/escale-comentarios-9802.test.ts`)

Molde `tests/invariants/escale-filtros-de-contatos.test.ts` (`seedGov()`, `sql`, `countAs`; contagem pela função com `filtro(f)`) e `tests/invariants/escale-comentarios-9801.test.ts` (10B). Ids `e5ca1e00-9802-4000-8000-…`. Semente: uma regra `comment.received` da `GOV_ORG`, contatos Ana (com disparo), Bruno (com disparo `repetido`), Carla (sem disparo), Davi e Eva (Davi com disparo; Eva sem), todos com o mesmo prefixo de nome para a busca `'comentdois'`. Casos:
- `{ comentario: "com" }` conta Ana, Bruno e Davi (3); `{ comentario: "sem" }` conta Carla e Eva (2); sem a chave conta os 5;
- `comentario` junto com `telefone` combina por E;
- `countAs(GOV_VIEWER, …)` na `GOV_ORG` vê os mesmos números (RLS da 9801 deixa ler); um membro de outra organização conta 0;
- mescla: `update public.contacts set is_merged_into = '<Eva>' where id = '<Davi>'` (como superusuário: o gatilho dispara igual ao `fn_mesclar_contatos`) → o disparo de Davi passa a `contact_id = Eva`, `updated_at` mudou; `{ comentario: "com" }` passa a contar Ana, Bruno e Eva; um terceiro contato mesclado em Eva **depois** (achatamento) leva os disparos dele também;
- update de outro campo do contato (`name`) não mexe nos disparos;
- `authenticated` não executa `fn_escale_disparos_seguem_a_mescla()` (erro de permissão); a função é `security definer` com `search_path = ''` (ler `pg_proc.prosecdef` e `proconfig`);
- as colunas novas: legenda de 301 caracteres → `23514`; link de 2.001 → `23514`; nulos entram.

---

## 3. Servidor

### 3.1 O disparo grava a publicação (`lib/escale/comentarios/disparos.ts`, 10B)

Em `reivindicarDisparos`, o objeto inserido para cada regra ganha `...colunasDaPublicacao(evento.publicacao)` (o `evento` é o `comentarioDoEvento(row.payload)` que a função já lê). A linha `repetido` também leva as colunas. Nada mais muda na 10B.

### 3.2 Comentários do contato (`lib/escale/comentarios/do-contato.ts`)

```ts
export async function comentariosDoContato(
  sb: SupabaseClient,
  orgId: string,
  contatoId: string,
): Promise<ComentariosDoContato | null>;
```

1. Contato da organização (`contacts` `id` por `organization_id` e `id`, `maybeSingle`), molde `negociosDoContato` (`lib/escale/ficha-do-contato/banco.ts`); não achou → `null` (rota 404).
2. Em paralelo, na `escale_disparos_de_comentario` com `eq("organization_id", orgId).eq("contact_id", contatoId)` e as colunas `id, rule_id, plataforma, texto, comentado_em, repetido, publicacao_id, publicacao_legenda, publicacao_miniatura, publicacao_link, created_at`:
   - **origem:** `order("created_at", { ascending: true }).limit(1)`;
   - **recentes:** `select(colunas, { count: "exact" }).order("created_at", { ascending: false }).limit(COMENTARIOS_RECENTES_NA_FICHA)` (o `count` é o `total`).
3. Sem nenhuma linha → `{ origem: null, recentes: [], total: 0 }`.
4. Nomes das regras: `automation_rules` `select("id, name")` por `organization_id` e `in("id", ids únicos)` (consulta separada, sem embed: memória `postgrest-embed-ambiguo`). Regra sem nome achado → `nome: ""` (a tela mostra "Automação").
5. Mapeia para `ComentarioDoContato` com `linkDaPublicacao` e `miniaturaSegura` de novo (D7). Todo erro do Supabase **lança** (a rota trata).

### 3.3 Rota (`app/api/v1/contatos/[id]/comentarios/route.ts`)

Molde exato `app/api/v1/contatos/[id]/negocios/route.ts`: `requireRole("viewer", { requestId, resource: "contacts" })`, id não-uuid → 404 "Não consegui carregar o contato.", `comentariosDoContato(await createClient(), authz.org.orgId, id)`, `null` → 404, ok → `ok(dados, { requestId })`, erro → `falhaInesperadaDoQuadro(err, { rota: "GET /api/v1/contatos/[id]/comentarios", operacao: "ler os comentários do contato" }, t, requestId)`. Comentário de cabeçalho: `/** FORK ESCALE · Fase 10C: de que comentário o contato veio (origem e os mais recentes). */`. Só GET (leitura), então sem `requireSupportWrite`.

### 3.4 Publicação das execuções (`lib/escale/comentarios/publicacoes-das-execucoes.ts`)

```ts
/** D9: junta a publicação do disparo a cada execução (pelo `run_id`). Devolve linhas novas, não muda a entrada. */
export async function comPublicacoes(
  sb: SupabaseClient,
  regraId: string,
  linhas: readonly LinhaDaExecucao[],
): Promise<LinhaDaExecucao[]>;
```

Sem linhas → `[]` sem consultar. Senão `escale_disparos_de_comentario` `select("run_id, publicacao_legenda, publicacao_link")` com `eq("rule_id", regraId).in("run_id", ids)`; erro lança; `Map` por `run_id`; cada linha vira `{ ...l, publicacao: achou ? { legenda, link: linkDaPublicacao(link) } : null }`.

### 3.5 Insights (fork da 5C)

- `lib/escale/automacoes/insights/banco.ts`: `RegraDosInsights` ganha `trigger_event: string`; `regraDaOrganizacao` lê `"id, name, actions, trigger_event"` e devolve `trigger_event: String(linha.trigger_event ?? "")`.
- `lib/escale/automacoes/insights/tipos.ts`: `export interface PublicacaoDaExecucao { legenda: string | null; link: string | null }` e `LinhaDaExecucao` ganha `/** FORK ESCALE · Fase 10C: só nas automações de comentário. */ publicacao?: PublicacaoDaExecucao | null;` (opcional: as linhas e os testes da 5C seguem válidos).
- `app/api/v1/automacoes-da-casca/[id]/execucoes/route.ts`: `const lidas = await lerExecucoes(...)`; `const linhas = c.regra.trigger_event === GATILHO_DE_COMENTARIO ? await comPublicacoes(c.supabase, c.regra.id, lidas.linhas) : lidas.linhas;` → `ok({ ...lidas, linhas }, …)`. A rota `exportar` não muda.

---

## 4. Telas (provisórias: a Clint não tem estas peças; molde pelas peças da casca citadas)

### 4.1 Linha "Origem" na janela do contato (`OrigemDoComentario`, D2, D6–D8)

`JanelaDoContato.tsx`, ramo `atual === "contato"`: logo depois do `<div className="mb-4 flex items-center gap-3">` das Tags, `<OrigemDoComentario contatoId={contato.id} />`.

`OrigemDoComentario` (usa `useComentariosDoContato(contatoId)`):
- **Carregando:** nada (a linha só aparece quando há o que mostrar; a aba não pula porque a linha fica abaixo das Tags).
- **Erro:** `div role="alert"` 12 px `casca-texto-2` "Não foi possível carregar os comentários." + botão de texto "Tentar de novo" (`refetch`).
- **Sem origem:** nada.
- **Com origem:** `div className="mb-4 flex items-start gap-3"`; rótulo `span text-[13px] text-casca-suave` "Origem" (mesma classe do rótulo "Tags"); conteúdo `flex min-w-0 flex-col gap-1 text-[13px] text-casca-texto`:
  1. Linha 1: `InstagramLogo`/`FacebookLogo` 14 (`aria-hidden`) + "Comentário em" + a publicação: com link, `<a href target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 text-casca-marca-forte hover:underline" title={t("Abrir a publicação no Instagram" | "Abrir a publicação no Facebook")}>` com a legenda `truncate max-w-[320px]` (ou "Sem legenda") e `ExternalLink` 12; sem link, a legenda em texto. Depois `· {nome da automação || t("Automação")}` em `casca-texto-2`.
  2. Linha 2, 12 px `casca-suave`: `dataHoraBr(origem.comentadoEm)`.
  3. Linha 3, 12 px itálico `casca-texto-2` `line-clamp-2`: `“{texto}”` (texto vazio: a linha some).
  4. Com `total > 1`: botão de texto 12 px `casca-marca-forte` "Ver os {n} comentários" (`aria-expanded`), que alterna para "Ocultar comentários" e mostra a lista `ul` dos `recentes`, cada `li` `flex gap-3 rounded-lg bg-casca-raia px-3 py-2`: miniatura 32×32 `rounded-md object-cover` (sem miniatura: quadrado `bg-surface` com o logo 14), e à direita a legenda (link como na linha 1), `“{texto}”` (`line-clamp-2`), e `{automação} · {data}` 11 px `casca-suave`; selo 10 px "Repetido" (`bg-casca-raia text-casca-texto-2 rounded px-1.5`, dica "A pessoa já tinha recebido esta automação.") quando `repetido`. Com `total > recentes.length`, rodapé 11 px `casca-suave` "Mostrando os 10 mais recentes de {total}." (`total` com `toLocaleString("pt-BR")`).

Hook `hooks/escale/useComentariosDoContato.ts` (molde `hooks/escale/useEmpresaDoContato.ts`, mesmo `pedir` com `fetchComTempoMaximo`): `queryKey ["comentarios-do-contato", contatoId]`, `GET /api/v1/contatos/${contatoId}/comentarios`, `enabled: Boolean(contatoId)`, `staleTime: 15_000`.

### 4.2 Filtro "Comentário" (D5)

- `SecaoContatoDoFiltro.tsx`: terceiro `GrupoDoFiltro rotulo={t("Comentário")}` depois de "Telefone", com `SeletorDaCasca valor={filtros.comentario ?? ""} opcoes={OPCOES_DE_COMENTARIO.map((o) => ({ valor: o, rotulo: t(ROTULO_DO_COMENTARIO[o]) }))} aoMudar={(v) => aoMudar({ ...filtros, comentario: (v || undefined) as OpcaoDeComentario | undefined })} vazio={t("Com/Sem comentário")} aria-label={t("Comentário")}`. Atualizar o comentário do componente: "Seção Contato (Clint `index-A38akjUb`): "Data de criação" e "Telefone"; "Comentário" é do fork (Fase 10C)."
- `FaixaDeFiltros.tsx`, `texto(chip)`: `case "comentario": return { titulo: t("Comentário"), valor: filtros.comentario ? t(ROTULO_DO_COMENTARIO[filtros.comentario]) : "" };`.
- Vale em todo lugar que usa o painel de filtros de contatos (lista de contatos, filtros salvos, público da campanha da 8B), sem código a mais: todos compilam por `compilarFiltros` e avaliam em `fn_escale_contatos_do_filtro`.

### 4.3 Atalhos no Insights (D9)

- `JanelaDeExecucoes.tsx`: `<CartaoDaExecucao … comentario={regra.trigger_event === GATILHO_DE_COMENTARIO} />`.
- `CartaoDaExecucao.tsx`: prop `comentario?: boolean` (padrão `false`). No grupo de ações à direita, **antes** do "Ver negócio", com `comentario`:
  - `contato` → `<Link href={rotaDoContatoAberto(contato.id, "", "contato")} className="text-casca-texto hover:underline">{t("Ver contato")}</Link>` (`lib/escale/ficha-do-contato/regras.ts`);
  - `linha.publicacao?.link` → `<a href target="_blank" rel="noopener noreferrer" title={linha.publicacao.legenda ?? undefined} className="inline-flex items-center gap-1 text-casca-texto hover:underline">{t("Ver publicação")}<ExternalLink size={12} aria-hidden /></a>`.
  Sem `comentario`, o cartão é exatamente o de hoje. Atualizar o comentário do componente com "Fase 10C: "Ver contato" e "Ver publicação" nas automações de comentário."

---

## 5. Textos (pt → es)

Nossos (a Clint não tem): Origem → Origen; Comentário em → Comentario en; Automação → Automatización; Abrir a publicação no Instagram → Abrir la publicación en Instagram; Abrir a publicação no Facebook → Abrir la publicación en Facebook; Ver os {n} comentários → Ver los {n} comentarios; Ocultar comentários → Ocultar comentarios; Repetido → Repetido; A pessoa já tinha recebido esta automação. → La persona ya había recibido esta automatización.; Mostrando os 10 mais recentes de {total}. → Mostrando los 10 más recientes de {total}.; Não foi possível carregar os comentários. → No fue posible cargar los comentarios.; Comentário → Comentario; Veio de comentário → Vino de un comentario; Não veio de comentário → No vino de un comentario; Com/Sem comentário → Con/Sin comentario; Ver contato → Ver contacto; Ver publicação → Ver publicación. ("Sem legenda", "Tentar de novo" e "Não consegui carregar o contato." já existem: conferir com `grep` e não duplicar.)

---

## 6. Tasks

Cada task: teste primeiro (RED), rodar `corepack pnpm vitest run <arquivo>` e ver falhar, implementar, ver passar, `corepack pnpm typecheck`, `corepack pnpm eslint <arquivos>`, commit.

### Task 0: Worktree e nomes
- [ ] Conferir que a 10B está na `main` (`git -C repo fetch escale-crm && git -C repo log --oneline -5 escale-crm/main` mostra o merge da `feat/fase-10b-gatilho-de-comentario`). Se não estiver, **parar**: a 10C depende dela.
- [ ] `git -C repo worktree add ../wt-10c -b feat/fase-10c-origem-do-comentario escale-crm/main`; `corepack pnpm install --frozen-lockfile`; copiar este plano para `wt-10c/docs/superpowers/plans/`.
- [ ] Conferir na `main` e ajustar o plano se divergir: a última definição de `fn_escale_contatos_do_filtro` (seção 2.1); o carimbo da 9801 e o último carimbo de migration; o nome da variável que `reivindicarDisparos` usa para o payload lido (`comentarioDoEvento`); `PlataformaDeComentario` exportado de `lib/escale/comentarios/constantes.ts`; `rotaDoContatoAberto` e `dataHoraBr` com as assinaturas citadas; os testes que montam `RegraDosInsights` (`git grep -n "actions: \[" tests/unit/escale-insights-rotas.test.ts`), que vão precisar de `trigger_event`.

### Task 1: Regras puras e filtro
**Files:** create `lib/escale/comentarios/origem.ts`; modify `lib/escale/contatos/{filtros,compilar-filtros}.ts`; tests `tests/unit/escale-comentarios-origem.test.ts` (novo) e acrescentar em `tests/unit/escale-filtros-de-contatos-regras.test.ts`.
**Produces:** seção 1 inteira (nomes e tipos exatos).
- [ ] `linkDaPublicacao`: `https://www.instagram.com/reel/abc/` e `https://m.facebook.com/123_456` passam; `https://fb.com/x` passa; `http://instagram.com/p/x`, `https://instagram.com.evil.io/p`, `javascript:alert(1)`, `""`, `null` e um link de 2.001 caracteres → null.
- [ ] `miniaturaSegura`: `https://scontent.cdninstagram.com/a.jpg` passa; `http://…` e `data:image/png;base64,…` → null.
- [ ] `colunasDaPublicacao`: legenda de 400 vira 300; legenda `"  "` → null; link e miniatura saneados; não muda a entrada (`Object.freeze` no teste).
- [ ] Filtro: `filtrosDaUrl('{"comentario":"com"}')` → `{ comentario: "com" }`; `"talvez"` → `{}`; `contarNaSecao(..., "contato")` com telefone e comentário → 2; `limparSecao(..., "contato")` tira os dois e mantém `tags`; `chipsDosFiltros` põe o chip `comentario` logo depois do de telefone; `removerChip(f, "comentario")` tira só ele; `mesmosFiltros({comentario:"sem"}, {comentario:"sem"})` → true; `compilarFiltros({ comentario: "com" }, "America/Sao_Paulo")` → `{ fuso, comentario: "com" }`.
- [ ] Implementar; rodar; commit: `feat(escale): regras da origem do comentário e filtro de contatos`.

### Task 2: Migration 9802, baseline e invariantes
**Files:** create a migration (2.1); colar no `supabase/baseline.sql` (Global Constraints); create `tests/invariants/escale-comentarios-9802.test.ts` (2.2).
- [ ] Escrever o teste de invariantes; escrever a migration; colar o bloco no baseline.
- [ ] `corepack pnpm test:db tests/invariants/escale-comentarios-9802.test.ts` (Git Bash, Docker aberto) até ficar verde; `corepack pnpm checar:colisao-de-migration`.
- [ ] Rodar também `corepack pnpm vitest run tests/unit/escale-filtros-de-contatos-migration.test.ts` (lê a 9102 e o baseline: segue verde).
- [ ] Commit: `feat(escale): migration 9802 (origem do comentário)`.

### Task 3: Disparo com publicação, comentários do contato e rota
**Files:** modify `lib/escale/comentarios/disparos.ts`; create `lib/escale/comentarios/do-contato.ts`, `app/api/v1/contatos/[id]/comentarios/route.ts`, `hooks/escale/useComentariosDoContato.ts`; tests: acrescentar em `tests/unit/escale-comentarios-disparos.test.ts` (10B) e criar `tests/unit/escale-comentarios-do-contato.test.ts` (molde `tests/unit/escale-ficha-do-contato-rotas.test.ts`: Supabase e `requireRole` dublados).
**Consumes:** Task 1. **Produces:** `comentariosDoContato`, `GET /api/v1/contatos/[id]/comentarios`, `useComentariosDoContato`.
- [ ] Disparos: o insert da reivindicação leva `publicacao_legenda`, `publicacao_miniatura` e `publicacao_link` do payload (saneados), também na linha `repetido`; payload com link `http://` grava `publicacao_link: null`.
- [ ] `comentariosDoContato`: contato de outra org → null; sem disparo → `{ origem: null, recentes: [], total: 0 }` sem ler `automation_rules`; com 12 disparos → `origem` é o mais antigo, `recentes` tem 10 do mais novo para o mais velho, `total: 12`, o nome da automação vem de `automation_rules`; link gravado inválido sai `null`; erro do Supabase lança.
- [ ] Rota: sem papel → a resposta do `requireRole`; id `abc` → 404; contato não achado → 404; ok → `{ data: { origem, recentes, total } }`; erro → 500 com `requestId`.
- [ ] Commit: `feat(escale): comentários do contato (origem) com rota de leitura`.

### Task 4: Linha "Origem" na janela do contato
**Files:** create `components/escale/contatos/ficha/OrigemDoComentario.tsx`; modify `components/escale/contatos/ficha/JanelaDoContato.tsx`; test `tests/unit/escale-comentarios-ficha.test.tsx` (hook mockado; molde `tests/unit/escale-ficha-nome-e-tags.test.tsx`).
- [ ] Testes: sem origem → nada de "Origem"; com origem do Instagram → "Origem", "Comentário em", a legenda como link com `href` da publicação, `target="_blank"` e `rel="noopener noreferrer"`, o nome da automação, a data `dd/mm/aaaa HH:mm` e o texto entre aspas; origem sem link → legenda sem `<a>`; sem legenda → "Sem legenda"; nome da automação vazio → "Automação"; `total: 1` → sem "Ver os"; `total: 12` → "Ver os 12 comentários", clicar mostra 10 itens, o selo "Repetido" no repetido e "Mostrando os 10 mais recentes de 12.", clicar de novo ("Ocultar comentários") esconde; erro → "Não foi possível carregar os comentários." e "Tentar de novo" chama `refetch`.
- [ ] Janela: rodar `tests/unit/escale-ficha-do-contato-regras.test.ts` e os testes da janela que já existem (`git grep -ln "JanelaDoContato" tests/unit`): verdes.
- [ ] Commit: `feat(escale): origem do comentário na ficha do contato`.

### Task 5: Filtro "Comentário" no painel e na faixa
**Files:** modify `components/escale/contatos/filtros/{SecaoContatoDoFiltro,FaixaDeFiltros}.tsx`; test `tests/unit/escale-comentarios-filtro.test.tsx`.
- [ ] Testes: a seção Contato mostra "Comentário" com o vazio "Com/Sem comentário"; escolher "Veio de comentário" chama `aoMudar` com `comentario: "com"` e mantém o resto do filtro (sem mutar a entrada); limpar o seletor manda `comentario: undefined`; a faixa mostra o chip "Comentário: Não veio de comentário" e o × chama `aoMudar` sem `comentario`.
- [ ] Commit: `feat(escale): filtro de contatos por comentário`.

### Task 6: Atalhos no Insights
**Files:** create `lib/escale/comentarios/publicacoes-das-execucoes.ts`; modify `lib/escale/automacoes/insights/{banco,tipos}.ts`, `app/api/v1/automacoes-da-casca/[id]/execucoes/route.ts`, `components/escale/automacoes/fluxo/insights/{CartaoDaExecucao,JanelaDeExecucoes}.tsx`; test `tests/unit/escale-comentarios-atalhos.test.tsx`; ajustar `tests/unit/escale-insights-rotas.test.ts` só se o dublê da regra precisar de `trigger_event`.
- [ ] `comPublicacoes`: sem linhas → `[]` sem consulta; duas linhas, uma com disparo → só ela ganha `publicacao` (`link` saneado), a outra `publicacao: null`; não muda a entrada; erro lança.
- [ ] Rota de execuções: regra de comentário → as linhas voltam com `publicacao`; outra regra → `comPublicacoes` não é chamada e o corpo é o de hoje.
- [ ] Cartão: com `comentario` e contato → "Ver contato" com `href="/app/contacts/<id>"`; com `publicacao.link` → "Ver publicação" com `target="_blank"` e `rel`; sem `comentario` → nenhum dos dois (e "Ver negócio" como hoje).
- [ ] Rodar `tests/unit/escale-insights-*.test.ts(x)`: verdes.
- [ ] Commit: `feat(escale): ver contato e ver publicação no Insights da automação de comentário`.

### Task 7: Textos, documentos e fechamento
**Files:** modify `lib/i18n/dicionario.ts`, `docs/modulos/10-comentarios.md`.
- [ ] Textos da seção 5 no dicionário (pt e es), no bloco do fork da 10B; rodar o teste de completude do dicionário, se existir (`corepack pnpm vitest run tests/unit/i18n*`).
- [ ] PRD 10, seção 8: estado da 10C "Mergeada, sem publicar".
- [ ] `corepack pnpm typecheck`; `corepack pnpm eslint lib/escale/comentarios lib/escale/contatos components/escale/contatos components/escale/automacoes/fluxo/insights hooks/escale/useComentariosDoContato.ts "app/api/v1/contatos/[id]/comentarios" "app/api/v1/automacoes-da-casca/[id]/execucoes" lib/escale/automacoes/insights tests/unit/escale-comentarios-*`; `corepack pnpm vitest run tests/unit/escale-comentarios-* tests/unit/escale-filtros-* tests/unit/escale-ficha-* tests/unit/escale-insights-*`.
- [ ] Cercas: `corepack pnpm vitest run -c vitest.cercas.ts`. Corrigir o que for novo sem mexer na cerca; as falhas antigas do Windows ficam anotadas (memória `frente-automacoes-estado`).
- [ ] Diff do original: `git diff --stat escale-crm/main -- lib app/app/webhooks components/ui` mostra só arquivos do fork (nenhum do Rafael).
- [ ] Olhar no navegador local (`corepack pnpm dev`, casca ligada; sem `.env` na worktree, anotar e deixar para a bateria): ficha de um contato com disparo de teste, filtro "Veio de comentário" na lista, "Ver contato"/"Ver publicação" no Insights.
- [ ] Auto-revisão do diff pela checklist de `code-review.md` (o revisor Opus 5.5 é um por frente, na bateria; pedir atenção ao gatilho definer em `contacts` e à função do filtro recriada).
- [ ] PR para `escale-crm/main`: itens do PRD cobertos, decisões D1–D9, o provisório (linha "Origem", grupo "Comentário", atalhos), a nota "não publica: Frente 10-I em andamento". Merge direto. Atualizar `LOG.md` (feito / onde estamos / próximo: plano da 10A).
- [ ] Commit do LOG: `docs: LOG da fase 10C`.

---

## 7. Critério de pronto (linha 10C da seção 8 do PRD)

- Com a casca, a janela de quem comentou mostra "Origem: Comentário em <publicação> · <automação>", a data e o texto; com vários comentários, a lista dos mais recentes.
- O filtro "Comentário › Veio de comentário" da lista de contatos acha esses contatos (e "Não veio de comentário" os outros); vale nos filtros salvos e no público de campanha.
- O Insights de uma automação de comentário tem "Ver contato" e "Ver publicação" em cada execução.
- Mesclar o contato do comentário com outro mantém a origem no vencedor (Task 2).
- **Na bateria da Frente 10-I:** com o Reels de teste do @oregismarques, a ficha de cada pessoa que comentou mostra a publicação e a automação, o filtro conta as N pessoas e os atalhos abrem a ficha e o Reels.

## 8. Riscos desta fase

| Risco | Mitigação |
|---|---|
| Recriar `fn_escale_contatos_do_filtro` apagar uma mudança feita depois da 9105 | Task 0 confere a última definição; a 9802 parte dela; invariantes da 9102 rodam na bateria |
| Gatilho em `contacts` (tabela do original) pesar ou falhar a mescla | Só dispara com `is_merged_into` mudando (`when`); um `update` por índice (`organization_id, contact_id`); prova de mescla na Task 2; revisor Opus olha na bateria |
| Link ou miniatura maliciosos vindos do webhook | Saneados ao gravar e de novo ao ler (D7); teste com `javascript:` e host parecido |
| Apagar a automação apaga os disparos (cascade da 9801) e a origem some da ficha | Pergunta 2 abaixo; comportamento atual documentado no PR |
| Muitas fichas abertas = muitas leituras | Duas consultas pequenas por índice, `staleTime` 15 s |

## 9. Perguntas ao usuário (não bloqueiam a execução)

1. **Filtro por automação ou por publicação (D5):** o plano filtra só "veio / não veio de comentário". Quer também escolher **qual automação** ou **qual publicação** (ex.: "quem comentou no Reels X", para mandar uma campanha)? Dá para entrar nesta fase com mais uma task.
2. **Apagar a automação:** hoje (9801) os disparos são apagados junto com a automação, então a ficha perde a origem. Prefere que a origem fique (o disparo guarda a automação como "apagada")? Isso muda a chave da tabela da 10B; entraria na 9802.
3. **LGPD:** o disparo guarda @, nome e texto de quem comentou. Quando o contato pede exclusão (LGPD), esses dados deveriam ser apagados junto. Não está no PRD da 10C; quer que entre aqui ou numa fase de ajustes?
4. **PRD desatualizado em dois pontos:** o risco "IA pausada pela automação" diz "Coberto na 10C" e o "contato duplicado" fala da "prova de identidade da 10A antes de escrever a 10C"; os dois já foram para a 10B (D13 e risco do plano da 10B). E "Ver, no comentário, se a pessoa já é contato" aparece como 10C no quadro A e como 10A no quadro C e na seção 8; o plano seguiu a seção 8 (10A). Posso corrigir essas linhas no PRD na Task 7?
