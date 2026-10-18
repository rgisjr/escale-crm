# Fase 1H (C) — Acabamento da ficha: limite de envio, permissões, autor, erros de envio e conferência · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Origem:** as pendências que o PR #27 (1H, PR B, mergeado em 18/10) deixou registradas, menos a LGPD das notas e dos arquivos (fica para a Fase 2, decisão Q14 da 1H). **Um PR só**, pequeno: `feat/fase-1h-acabamento`.

**Goal:** fechar a 1H: o arquivo do contato vai até 25 MB (como na Clint); quem só lê não vê "Nova nota" nem "Novo arquivo" ligados; o nome do autor da nota e do arquivo nunca fica vazio; os erros de envio saem traduzidos e o modal "Novo documento" só fecha quando tudo subiu; e as telas novas da 1H (Arquivos, Conversas, Histórico, "Nova nota") são conferidas no navegador, com prints.

**Architecture:**
- **Limite:** o `proxy.ts` do original cobre `/api/*`, e o Next corta o corpo da requisição em 10 MB (`experimental.proxyClientMaxBodySize`, padrão 10485760). A opção sobe para `27mb` em `next.config.ts` (arquivo do original, uma linha), e `MAX_ARQUIVO_MB` volta a 25. A rota já lê o corpo aos pedaços com o teto de 25 MB + 1 MB.
- **Permissões na tela:** `usePermission("pipeline.move_card")` (agent+) para a nota, `usePermission("contact.update")` (agent+) para o arquivo — as mesmas réguas que o banco e as rotas já aplicam (`requireRole("agent")`).
- **Autor:** migration **9011** que só redefine `fn_escale_carimbar_autoria()` (da 9008): sem `full_name`, cai para a parte local do e-mail lida de `auth.users`. Nunca do valor que veio no INSERT.
- **Envio:** o hook devolve `{ nome, mensagem | null }` por falha; a tela traduz o genérico; o modal mantém só os arquivos que falharam.

**Tech Stack:** Next.js 16 (App Router), React 19, TanStack Query 5, Vitest + Testing Library, Supabase/Postgres (RLS), Playwright (prints).

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| H1 | **25 MB** por arquivo (o padrão da Clint, `maxFileSize`), com `proxyClientMaxBodySize: "27mb"` em `next.config.ts` | Hoje é 9 MB por causa do corte de 10 MB do proxy do Next (revisão do PR #27). 27 MB = 25 MB do arquivo + 1 MB das bordas do multipart + folga |
| H2 | Para quem não tem a permissão: o ícone de nota fica **desligado** com "Sem permissão"; o item "Nova nota" do ⋮ **some** (como os outros itens de escrita do ⋮); "Novo arquivo" fica **desligado** com "Sem permissão" | Mesmo padrão da 1G: ação rápida desligada com dica; item de menu de escrita escondido |
| H3 | Nome do autor: `full_name` do perfil, senão a parte local do e-mail (`fulano@x.com` → `fulano`), senão nulo | O "?" no avatar era o caso de quem não preencheu o nome; o e-mail é dado da própria sessão, não do INSERT |
| H4 | Falha de envio: toast "`nome.ext`: mensagem do servidor" (ou "Erro ao enviar arquivo(s)" quando não há mensagem); o modal fica aberto só com os que falharam | Hoje a mensagem crua "falha de rede"/`statusText` não passa por `t()`, e o modal fecha mesmo sem nada ter subido |
| H5 | Conferência visual com o app local (build de produção + Supabase local), prints em `docs/clint/prints-1h/` com o sufixo `ESCALE-B-` e a prova real de um envio de ~12 MB | O PR #27 saiu com "conferência visual pendente" |

## Global Constraints

### Repositório e Git
- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`. **Trabalhe numa worktree própria**, `C:\Documentos\projetos claude\Deskcom CRM\wt-1h-c`, para não mexer na branch da 1I nem nas rodadas que rodam em `repo/`.
- Base: `escale-crm/main` (com o PR #27). **Comece depois do merge do PR A da 1I (#28)**, se der: as duas fases põem bloco no `baseline.sql` no mesmo lugar (antes do bloco da 0323). Se a 1I ainda não tiver entrado, siga assim mesmo; o PR que entrar depois resolve o conflito do baseline mantendo os dois blocos (o da 9009 primeiro).
- **Migration:** `supabase/migrations/20261026120000_9011_autor_sem_perfil.sql`. A 9009 é da 1I e a 9010 está reservada pela 1J (planos de 17/10). A Task 3 confere: se `9011` ou `20261026120000` já existirem em alguma ref, use o próximo livre e troque em todos os lugares desta fase.
- Branch: `feat/fase-1h-acabamento`. PR para `rgisjr/escale-crm`, base `main`. **Quem mergeia é o usuário.**
- **Proibido:** push em `origin` (Rafael), merge, tag, release, VPS, banco de produção, ligar servidor local ao banco de produção (`jsrzgxyioczdgwiklkrc`, `hwpnnstguqrfhfnsvthv`).

### Ambiente
- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"`, `corepack pnpm`, `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` precisa do Docker (`docker info`). Se falhar, PARE e peça ao usuário.
- Comandos longos sempre em segundo plano, com saída para arquivo.

### Arquivos do original que mudam (e só estes)
| Arquivo | Mudança |
|---|---|
| `next.config.ts` | `proxyClientMaxBodySize: "27mb"` dentro de `experimental` (Task 1) |
| `supabase/baseline.sql` | o bloco da 9011, idêntico à migration (Task 3) |
| `tests/invariants/escale-notas-e-arquivos-rls.test.ts` | é do fork (9008); o caso "sem nome no perfil" muda de propósito (Task 3) |

### Testes que mudam de propósito
| Teste | O que pinava | Task |
|---|---|---|
| `tests/unit/escale-ficha-arquivos-regras.test.ts` | limite de 9 MB | 1 |
| `tests/unit/escale-ficha-acoes-e-menu.test.tsx` | "sem permissão de escrita: só Visualizar contato e Nova nota" | 2 |
| `tests/unit/escale-ficha-nome-e-tags.test.tsx` | o mock de `AuthProvider` sem `usePermission` | 2 |
| `tests/unit/escale-ficha-aba-arquivos.test.tsx` | o mock de `AuthProvider` sem `usePermission`; o modal sempre fecha | 2, 4 |
| `tests/invariants/escale-notas-e-arquivos-rls.test.ts` | "sem nome no perfil: fica nulo" | 3 |

### Cercas que precisam ficar verdes
`controle-decorativo` (todo botão desligado tem `title`), `tailwind-tokens`, `vocabulario-do-funil`, `i18n-espanhol-cobre-a-tela`, `escale-espanhol-registro-tu`, `hidratacao-useState-nao-le-o-navegador`, `manifest-x-migrations`, `hardening-definer-varredura` e `definer-nova-nasce-exposta` (db), `lib/random-id.test.ts`.

### Verificação (G1)
1. Em cada task: os testes que a task cria ou altera, os guardas que leem os arquivos tocados (`for f in <arquivos>; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u`), typecheck e eslint dos arquivos alterados; prettier só nos novos.
2. `test:db` só na Task 3 (o arquivo da 9008 mais as varreduras de `definer`).
3. Revisor: **um** só, no fim (Task 5), na branch inteira (Sonnet). Tasks pequenas: quem executa relê o próprio diff.
4. Uma rodada cheia no fim (Task 5), em segundo plano, comparada com `repo/.superpowers/sdd/falhas-conhecidas.txt`.

### Commits e PR
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório na Task 1.

## Arquivos

| Arquivo | Novo/alterado | Task | Responsabilidade |
|---|---|---|---|
| `next.config.ts` | alterado | 1 | o teto do corpo atrás do proxy |
| `lib/escale/negocio/arquivos.ts` | alterado | 1 | `MAX_ARQUIVO_MB = 25` |
| `tests/unit/escale-arquivos-limite-de-envio.test.ts` | novo | 1 | o teto do proxy cobre o arquivo + bordas |
| `components/escale/negocio/AcoesDaFicha.tsx`, `MenuDaFicha.tsx`, `abas/AbaArquivos.tsx` | alterados | 2 | permissões na tela |
| `supabase/migrations/20261026120000_9011_autor_sem_perfil.sql`, `supabase/baseline.sql` | novo / bloco | 3 | carimbo com fallback para o e-mail |
| `tests/unit/escale-autor-sem-perfil-migration.test.ts` | novo | 3 | forma do SQL e bloco do baseline |
| `hooks/escale/useArquivosDoContato.ts`, `components/escale/negocio/abas/JanelaDeNovoDocumento.tsx`, `abas/AbaArquivos.tsx` | alterados | 4 | erros de envio e o modal |
| `docs/clint/prints-1h/` (fora do repositório) | novos prints + LEIA-ME | 5 | conferência visual |

---

### Task 1: Worktree, branch e o limite de 25 MB

**Files:**
- Modify: `next.config.ts` (bloco `experimental`), `lib/escale/negocio/arquivos.ts` (constante e comentário), `tests/unit/escale-ficha-arquivos-regras.test.ts`
- Create: `tests/unit/escale-arquivos-limite-de-envio.test.ts`
- Copy: este plano para `docs/superpowers/plans/`

**Interfaces:**
- Produces: `MAX_ARQUIVO_MB = 25`, `MAX_ARQUIVO_BYTES = 25 * 1024 * 1024` (a rota e a tela já leem daí).

- [ ] **Step 1: A worktree e a branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:hooks/escale/useArquivosDoContato.ts && echo "1H B ok"
git log escale-crm/main --oneline | grep -q "fase-1i-playbook" && echo "1I A já na main" || echo "1I A ainda fora (ver Global Constraints)"
git worktree add -b feat/fase-1h-acabamento "../wt-1h-c" escale-crm/main
cd "../wt-1h-c"
corepack pnpm install --frozen-lockfile > /tmp/wt-1h-c-install.log 2>&1; echo "install=$?"
cp "../repo/.env.local" . 2>/dev/null || true
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-18-fase-1h-c-acabamento.md" docs/superpowers/plans/
```
Expected: `1H B ok`, `install=0`. **Daqui até o fim, todo comando roda em `C:\Documentos\projetos claude\Deskcom CRM\wt-1h-c`.** (`node_modules` real, nunca symlink: o Turbopack recusa.)

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-arquivos-limite-de-envio.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAX_ARQUIVO_BYTES, MAX_ARQUIVO_MB } from "@/lib/escale/negocio/arquivos";

/**
 * FORK ESCALE · Fase 1H (C): o arquivo do contato vai até 25 MB, como na Clint. O `proxy.ts`
 * cobre `/api/*`, e o Next corta o corpo da requisição em `experimental.proxyClientMaxBodySize`
 * (10 MB por padrão): o teto precisa caber o arquivo inteiro mais as bordas do multipart.
 */
const config = readFileSync(join(__dirname, "..", "..", "next.config.ts"), "utf8");
const MB = 1024 * 1024;

describe("limite de envio dos arquivos do contato", () => {
  it("o arquivo vai até 25 MB", () => {
    expect(MAX_ARQUIVO_MB).toBe(25);
    expect(MAX_ARQUIVO_BYTES).toBe(25 * MB);
  });

  it("o teto do corpo atrás do proxy cabe o arquivo e 1 MB de bordas do multipart", () => {
    const achado = config.match(/proxyClientMaxBodySize:\s*"(\d+)mb"/);
    expect(achado, "next.config.ts sem experimental.proxyClientMaxBodySize").not.toBeNull();
    expect(Number(achado?.[1]) * MB).toBeGreaterThanOrEqual(MAX_ARQUIVO_BYTES + MB);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-arquivos-limite-de-envio.test.ts`
Expected: FAIL (`expected 9 to be 25` e o `proxyClientMaxBodySize` ausente).

- [ ] **Step 3: A configuração e a constante**

Em `next.config.ts`, troque

```ts
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "lucide-react", "date-fns"],
  },
```

por

```ts
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "lucide-react", "date-fns"],
    // FORK ESCALE · Fase 1H (C): o `proxy.ts` cobre `/api/*`, e o Next corta o corpo da requisição
    // neste teto (10 MB por padrão). Os arquivos do contato vão até 25 MB (como na Clint) mais as
    // bordas do multipart; a rota lê o corpo aos pedaços e recusa o que passar de 26 MB.
    proxyClientMaxBodySize: "27mb",
  },
```

Em `lib/escale/negocio/arquivos.ts`, troque o comentário e a constante

```ts
/**
 * 9 MB, e não os 25 MB da Clint: o `proxy.ts` do original cobre `/api/*` e o Next
 * (experimental.proxyClientMaxBodySize) corta o corpo da requisição em 10 MB, o
 * que quebraria um envio maior com um erro confuso. Subir para 25 MB pede essa
 * opção em `next.config.ts` (arquivo do original): pendência registrada no PR.
 */
export const MAX_ARQUIVO_MB = 9;
```

por

```ts
/**
 * 25 MB, como na Clint (`maxFileSize`). O teto do corpo atrás do proxy do Next
 * (`experimental.proxyClientMaxBodySize` em `next.config.ts`) é 27 MB, para caber
 * o arquivo e as bordas do multipart (teste `escale-arquivos-limite-de-envio`).
 */
export const MAX_ARQUIVO_MB = 25;
```

Troque também, no comentário do topo do mesmo arquivo, `o limite de 9 MB` por `o limite de 25 MB`.

Em `tests/unit/escale-ficha-arquivos-regras.test.ts`, troque o nome do caso `"validarArquivo aceita a lista da Clint até 9 MB (teto do corpo atrás do proxy)"` por `"validarArquivo aceita a lista da Clint até 25 MB"` e `tamanho: 9 * 1024 * 1024 + 1` por `tamanho: 25 * 1024 * 1024 + 1`.

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-arquivos-limite-de-envio.test.ts tests/unit/escale-ficha-arquivos-regras.test.ts tests/unit/escale-ficha-arquivos-rotas.test.ts tests/unit/escale-ficha-aba-arquivos.test.tsx
corepack pnpm prettier --write tests/unit/escale-arquivos-limite-de-envio.test.ts
corepack pnpm eslint next.config.ts lib/escale/negocio/arquivos.ts tests/unit/escale-arquivos-limite-de-envio.test.ts
corepack pnpm typecheck
```
Expected: PASS. Os casos de 413 da rota continuam valendo (30 MB no cabeçalho e 27 MB no corpo passam do teto de 26 MB).

- [ ] **Step 5: Commit**

```bash
git add next.config.ts lib/escale/negocio/arquivos.ts tests/unit/escale-arquivos-limite-de-envio.test.ts tests/unit/escale-ficha-arquivos-regras.test.ts docs/superpowers/plans/2026-10-18-fase-1h-c-acabamento.md
git commit -m "feat(escale): arquivos do contato até 25 MB, com o teto do proxy do Next (1H-C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Quem só lê não escreve nota nem envia arquivo

**Files:**
- Modify: `components/escale/negocio/AcoesDaFicha.tsx`, `components/escale/negocio/MenuDaFicha.tsx`, `components/escale/negocio/abas/AbaArquivos.tsx`
- Modify (testes): `tests/unit/escale-ficha-acoes-e-menu.test.tsx`, `tests/unit/escale-ficha-nome-e-tags.test.tsx`, `tests/unit/escale-ficha-aba-arquivos.test.tsx`

**Interfaces:**
- Consumes: `usePermission(acao)` de `@/hooks/auth/AuthProvider` (`"pipeline.move_card"` e `"contact.update"` exigem agent).

- [ ] **Step 1: Os testes (vão falhar)**

Em `tests/unit/escale-ficha-acoes-e-menu.test.tsx`:
1. Logo depois do caso `"o ícone de nota está ligado e abre o modal 'Nova nota' (1H, C15)"`, acrescente:

```tsx
  it("sem permissão de escrita, o ícone de nota fica desligado com 'Sem permissão' (1H-C)", () => {
    permissao.pode = false;
    render(<AcoesDaFicha lead={LEAD} pipelineId="o1" />);
    const botao = screen.getByRole("button", { name: "Nova nota" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("title", "Sem permissão");
  });
```

2. Troque o caso `"sem permissão de escrita: só Visualizar contato e Nova nota"` inteiro por:

```tsx
  it("sem permissão de escrita: só Visualizar contato (1H-C: a nota também é escrita)", async () => {
    permissao.pode = false;
    await abrir();
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Visualizar contato",
    ]);
  });
```

Confira que o arquivo tem um `beforeEach` que volta `permissao.pode = true`; se não tiver, acrescente `beforeEach(() => { permissao.pode = true; });` logo depois dos mocks.

Em `tests/unit/escale-ficha-nome-e-tags.test.tsx`, troque

```tsx
vi.mock("@/hooks/auth/AuthProvider", () => ({ useActiveOrg: () => ({ orgId: "org1" }) }));
```

por

```tsx
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org1" }),
  usePermission: () => true,
}));
```

Em `tests/unit/escale-ficha-aba-arquivos.test.tsx`, troque o mock de `AuthProvider` por

```tsx
const permissao = vi.hoisted(() => ({ pode: true }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u1" }),
  useActiveOrg: () => ({ orgId: "org1", role: "agent" }),
  usePermission: () => permissao.pode,
}));
```

troque `beforeEach(() => vi.clearAllMocks());` por

```tsx
beforeEach(() => {
  vi.clearAllMocks();
  permissao.pode = true;
});
```

e, no `describe("Novo arquivo")`, acrescente:

```tsx
  it("sem permissão (quem só lê): 'Novo arquivo' desligado com 'Sem permissão'", () => {
    permissao.pode = false;
    render(<AbaArquivos lead={LEAD} />);
    for (const b of screen.getAllByRole("button", { name: "Novo arquivo" })) {
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", "Sem permissão");
    }
  });
```

Run: `corepack pnpm vitest run tests/unit/escale-ficha-acoes-e-menu.test.tsx tests/unit/escale-ficha-aba-arquivos.test.tsx`
Expected: FAIL nos três casos novos/trocados.

- [ ] **Step 2: A ação rápida**

Em `components/escale/negocio/AcoesDaFicha.tsx`:
- acrescente `import { usePermission } from "@/hooks/auth/AuthProvider";` depois do import de `BotaoDaCasca`;
- logo depois de `const [nota, setNota] = useState(false);`, acrescente `const podeAnotar = usePermission("pipeline.move_card");`;
- troque o botão da nota

```tsx
      <BotaoDaCasca
        variante="icone"
        title={t("Nova nota")}
        aria-label={t("Nova nota")}
        onClick={() => setNota(true)}
        className="text-casca-marca"
      >
        <StickyNote aria-hidden />
      </BotaoDaCasca>
```

por

```tsx
      <BotaoDaCasca
        variante="icone"
        disabled={!podeAnotar}
        title={podeAnotar ? t("Nova nota") : t("Sem permissão")}
        aria-label={t("Nova nota")}
        onClick={() => setNota(true)}
        className={podeAnotar ? "text-casca-marca" : EM_BREVE}
      >
        <StickyNote aria-hidden />
      </BotaoDaCasca>
```

- [ ] **Step 3: O ⋮**

Em `components/escale/negocio/MenuDaFicha.tsx`, troque

```tsx
            <MenuPrimitive.Item className={ITEM_DO_MENU} onSelect={() => setNota(true)}>
              <StickyNote size={14} aria-hidden />
              {t("Nova nota")}
            </MenuPrimitive.Item>
```

por

```tsx
            {podeEscrever ? (
              <MenuPrimitive.Item className={ITEM_DO_MENU} onSelect={() => setNota(true)}>
                <StickyNote size={14} aria-hidden />
                {t("Nova nota")}
              </MenuPrimitive.Item>
            ) : null}
```

(`podeEscrever` já existe no arquivo: `usePermission("pipeline.move_card")`.)

- [ ] **Step 4: A aba Arquivos**

Em `components/escale/negocio/abas/AbaArquivos.tsx`:
- troque `import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";` por `import { useActiveOrg, usePermission, useUser } from "@/hooks/auth/AuthProvider";`;
- logo depois de `const gerente = !!org && ROLE_RANK[org.role] >= ROLE_RANK.manager;`, acrescente `const podeEnviar = usePermission("contact.update");`;
- no `botaoNovo`, troque

```tsx
      disabled={semContato}
      title={semContato ? t("Este negócio não tem contato.") : undefined}
```

por

```tsx
      disabled={semContato || !podeEnviar}
      title={
        semContato
          ? t("Este negócio não tem contato.")
          : !podeEnviar
            ? t("Sem permissão")
            : undefined
      }
```

- [ ] **Step 5: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-ficha-acoes-e-menu.test.tsx tests/unit/escale-ficha-nome-e-tags.test.tsx tests/unit/escale-ficha-aba-arquivos.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/controle-decorativo.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts
corepack pnpm eslint components/escale/negocio/AcoesDaFicha.tsx components/escale/negocio/MenuDaFicha.tsx components/escale/negocio/abas/AbaArquivos.tsx
corepack pnpm typecheck
```
Expected: PASS. "Sem permissão" já tem espanhol no dicionário (1F).

- [ ] **Step 6: Commit**

```bash
git add components/escale/negocio/AcoesDaFicha.tsx components/escale/negocio/MenuDaFicha.tsx components/escale/negocio/abas/AbaArquivos.tsx tests/unit/escale-ficha-acoes-e-menu.test.tsx tests/unit/escale-ficha-nome-e-tags.test.tsx tests/unit/escale-ficha-aba-arquivos.test.tsx
git commit -m "fix(escale): quem só lê não vê Nova nota nem Novo arquivo ligados (1H-C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Migration 9011 — o nome do autor cai para o e-mail

**Files:**
- Create: `supabase/migrations/20261026120000_9011_autor_sem_perfil.sql`, `tests/unit/escale-autor-sem-perfil-migration.test.ts`
- Modify: `supabase/baseline.sql` (bloco novo), `tests/invariants/escale-notas-e-arquivos-rls.test.ts` (o caso "sem nome no perfil")

**Interfaces:**
- Produces: `fn_escale_carimbar_autoria()` redefinida (mesma assinatura, mesmos gatilhos da 9008).

- [ ] **Step 1: Conferir o número**

```bash
git fetch escale-crm --quiet
git ls-tree --name-only escale-crm/main supabase/migrations/ | grep -E "_90[0-9]{2}_" | sort | tail -3
for r in $(git for-each-ref --format='%(refname)' refs/remotes refs/heads); do git ls-tree --name-only "$r" supabase/migrations/ 2>/dev/null; done | grep -E "_9011_|20261026120000" | sort -u
```
Expected: a última 90xx da `main` é a 9008 ou a 9009; o segundo comando não imprime nada. Se imprimir, troque `9011` e `20261026120000` em todos os lugares desta task pelo próximo livre.

- [ ] **Step 2: O teste de forma (vai falhar)**

Create `tests/unit/escale-autor-sem-perfil-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * NOME DO AUTOR SEM PERFIL (fork Escale, Fase 1H-C, migration 9011): a migration só
 * redefine o carimbo da 9008, o bloco do baseline é o MESMO SQL e mora depois do da 9008
 * (a função precisa existir antes) e antes do da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261026120000_9011_autor_sem_perfil.sql";
const MIGRATION_9008 = "supabase/migrations/20261023120000_9008_notas_e_arquivos.sql";
const CABECALHO = "-- ---- FORK ESCALE · nome do autor sem perfil (migration 9011) ----";
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("autor sem perfil: migration 9011 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o bloco do baseline é idêntico, depois da 9008 e antes da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const de9008 = baseline.indexOf(ler(MIGRATION_9008));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(ler(MIGRATION));
    const ancora = baseline.indexOf(
      "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----",
    );
    expect(de9008).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9008);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("o nome vem do perfil ou do e-mail da sessão, nunca do INSERT; a função segue fechada", () => {
    const sql = ler(MIGRATION).replace(/\s+/g, " ");
    expect(sql).toContain("create or replace function public.fn_escale_carimbar_autoria()");
    expect(sql).toContain("nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')");
    expect(sql).toContain("nullif(split_part(coalesce(u.email, ''), '@', 1), '')");
    expect(sql).toContain("where u.id = auth.uid()");
    expect(sql).not.toMatch(/coalesce\([^)]*new\.user_nome/);
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain(
      "revoke execute on function public.fn_escale_carimbar_autoria() from public, anon, authenticated;",
    );
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-autor-sem-perfil-migration.test.ts`
Expected: FAIL (a migration não existe).

- [ ] **Step 3: A migration**

Create `supabase/migrations/20261026120000_9011_autor_sem_perfil.sql`:

```sql
-- manifest: **Nome do autor sem perfil (fork Escale, Fase 1H-C).** O carimbo de autoria das notas e dos arquivos (`fn_escale_carimbar_autoria`, 9008) gravava `user_nome` NULO quando o perfil de quem grava não tem `full_name`, e a ficha mostrava "?" no avatar. Agora cai para a parte local do e-mail da própria sessão (`fulano@x.com` → `fulano`), lida de `auth.users` — nunca do valor que veio no INSERT, que reabriria a falsificação do autor. Só redefine a função (`create or replace`, mesma assinatura): tabelas, gatilhos e grants da 9008 ficam como estão.
-- 9011: o nome do autor sem perfil cai para o e-mail (fork Escale).

create or replace function public.fn_escale_carimbar_autoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $f$
begin
  new.created_at := now();
  if auth.uid() is not null then
    new.user_nome := (
      select coalesce(
               nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
               nullif(split_part(coalesce(u.email, ''), '@', 1), '')
             )
        from auth.users u
       where u.id = auth.uid()
    );
  end if;
  return new;
end;
$f$;

revoke execute on function public.fn_escale_carimbar_autoria() from public, anon, authenticated;

notify pgrst, 'reload schema';
```

- [ ] **Step 4: O bloco do baseline**

O bloco entra logo ANTES da âncora da 0323 (depois do último bloco do fork, que é o da 9008 ou o da 9009):

```bash
python - <<'PY'
from pathlib import Path
base = Path("supabase/baseline.sql")
texto = base.read_text(encoding="utf8")
ancora = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----"
m9011 = Path("supabase/migrations/20261026120000_9011_autor_sem_perfil.sql").read_text(encoding="utf8").replace("\r\n", "\n")
assert texto.count(ancora) == 1, "âncora da 0323 não encontrada: PARE"
assert "(migration 9011)" not in texto, "o bloco da 9011 já está no baseline: PARE"
i = texto.index(ancora)
bloco = "-- ---- FORK ESCALE · nome do autor sem perfil (migration 9011) ----\n" + m9011 + "\n"
base.write_text(texto[:i] + bloco + texto[i:], encoding="utf8", newline="\n")
PY
corepack pnpm vitest run tests/unit/escale-autor-sem-perfil-migration.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/escale-notas-e-arquivos-migration.test.ts
```
Expected: PASS (o teste da 9008 continua achando o próprio bloco antes da âncora).

- [ ] **Step 5: A prova no Postgres**

Em `tests/invariants/escale-notas-e-arquivos-rls.test.ts`, troque o caso `"authenticated sem nome no perfil: o nome forjado é descartado (fica nulo), nunca mantido"` inteiro por:

```ts
  it("authenticated sem nome no perfil: cai para a parte local do e-mail da sessão, nunca para o forjado (9011)", () => {
    sql(
      `update auth.users set email = 'agente.a@exemplo.test', raw_user_meta_data = '{}'::jsonb where id = '${GOV_AGENT_A}';`,
    );
    expect(
      resultadoComoRole("authenticated", GOV_AGENT_A, medir(nota(GOV_ORG, GOV_LEAD, GOV_AGENT_A))),
    ).toBe("agente.a|true");
    expect(
      resultadoComoRole(
        "authenticated",
        GOV_AGENT_A,
        medir(arquivo(GOV_ORG, GOV_CONTACT_1, GOV_AGENT_A)),
      ),
    ).toBe("agente.a|true");
  });
```

Run (em segundo plano, com saída para arquivo):

```bash
docker info > /dev/null 2>&1 || echo "SEM DOCKER: PARE e peça ao usuário"
corepack pnpm test:db tests/invariants/escale-notas-e-arquivos-rls.test.ts tests/invariants/hardening-definer-varredura.test.ts tests/invariants/definer-nova-nasce-exposta.test.ts > /tmp/1h-c-db.log 2>&1; echo "db=$?" >> /tmp/1h-c-db.log
```
Expected: `db=0`. Se o `update auth.users` reclamar de e-mail duplicado, use outro endereço (`agente.a.1hc@exemplo.test`) e troque a expectativa para a parte local dele.

- [ ] **Step 6: Commit**

```bash
corepack pnpm prettier --write tests/unit/escale-autor-sem-perfil-migration.test.ts
git add supabase/migrations/20261026120000_9011_autor_sem_perfil.sql supabase/baseline.sql tests/unit/escale-autor-sem-perfil-migration.test.ts tests/invariants/escale-notas-e-arquivos-rls.test.ts
git commit -m "fix(escale): migration 9011, o nome do autor sem perfil cai para o e-mail (1H-C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Erros de envio traduzidos e o modal que só fecha quando tudo subiu

**Files:**
- Modify: `hooks/escale/useArquivosDoContato.ts`, `components/escale/negocio/abas/JanelaDeNovoDocumento.tsx`, `components/escale/negocio/abas/AbaArquivos.tsx`, `tests/unit/escale-ficha-aba-arquivos.test.tsx`

**Interfaces:**
- Produces: `FalhaDoEnvio = { nome: string; mensagem: string | null }`; `ResultadoDoEnvio = { enviados: number; falhas: FalhaDoEnvio[] }`; `JanelaDeNovoDocumento.aoSalvar: (arquivos: File[]) => Promise<string[]>` (devolve os nomes que falharam).

- [ ] **Step 1: O teste (vai falhar)**

Em `tests/unit/escale-ficha-aba-arquivos.test.tsx`, no `describe("Novo arquivo")`, acrescente:

```tsx
  it("se um envio falha: toast com o nome e o motivo traduzido, e o modal fica aberto só com o que falhou", async () => {
    const { toast } = await import("sonner");
    arquivos.enviar.mockResolvedValueOnce({
      enviados: 1,
      falhas: [{ nome: "contrato.pdf", mensagem: null }],
    });
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.click(screen.getByRole("button", { name: "Novo arquivo" }));
    const janela = await screen.findByRole("dialog", { name: "Novo documento" });
    await userEvent.upload(within(janela).getByLabelText("Adicionar"), [
      new File(["x"], "contrato.pdf", { type: "application/pdf" }),
      new File(["y"], "foto.png", { type: "image/png" }),
    ]);
    await userEvent.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(toast.success).toHaveBeenCalledWith("Arquivo(s) enviado(s) com sucesso");
    expect(toast.error).toHaveBeenCalledWith("contrato.pdf: Erro ao enviar arquivo(s)");
    expect(screen.getByRole("dialog", { name: "Novo documento" })).toBeInTheDocument();
    expect(within(janela).getByText("contrato.pdf")).toBeInTheDocument();
    expect(within(janela).queryByText("foto.png")).toBeNull();
  });
```

Troque também, no `vi.hoisted` de `arquivos`, a linha `enviar: vi.fn(async () => ({ enviados: 1, falhas: [] })),` por

```tsx
  enviar: vi.fn(async (): Promise<{ enviados: number; falhas: { nome: string; mensagem: string | null }[] }> => ({ enviados: 1, falhas: [] })),
```

Run: `corepack pnpm vitest run tests/unit/escale-ficha-aba-arquivos.test.tsx`
Expected: FAIL no caso novo (o toast sai no formato antigo e o modal fecha).

- [ ] **Step 2: O hook**

Em `hooks/escale/useArquivosDoContato.ts`, troque

```ts
export interface ResultadoDoEnvio {
  enviados: number;
  /** "nome.ext: mensagem" por arquivo que falhou. */
  falhas: string[];
}
```

por

```ts
/** Um arquivo que não subiu: a mensagem já vem traduzida pela rota; `null` = sem mensagem (rede, 5xx sem corpo). */
export interface FalhaDoEnvio {
  nome: string;
  mensagem: string | null;
}

export interface ResultadoDoEnvio {
  enviados: number;
  falhas: FalhaDoEnvio[];
}
```

e, dentro do laço, troque

```ts
            resultado.falhas.push(`${arquivo.name}: ${corpo?.error?.message ?? res.statusText}`);
          }
        } catch {
          resultado.falhas.push(`${arquivo.name}: falha de rede`);
        }
```

por

```ts
            resultado.falhas.push({ nome: arquivo.name, mensagem: corpo?.error?.message ?? null });
          }
        } catch {
          resultado.falhas.push({ nome: arquivo.name, mensagem: null });
        }
```

- [ ] **Step 3: A aba**

Em `components/escale/negocio/abas/AbaArquivos.tsx`, troque

```tsx
  async function salvarNovos(arquivos: File[]) {
    const r = await enviar.mutateAsync(arquivos);
    if (r.enviados > 0) toast.success(t("Arquivo(s) enviado(s) com sucesso"));
    for (const f of r.falhas) toast.error(`${t("Erro ao enviar arquivo(s)")}: ${f}`);
  }
```

por

```tsx
  /** Envia e devolve os nomes que falharam (o modal fica aberto só com eles). */
  async function salvarNovos(arquivos: File[]): Promise<string[]> {
    const r = await enviar.mutateAsync(arquivos);
    if (r.enviados > 0) toast.success(t("Arquivo(s) enviado(s) com sucesso"));
    for (const f of r.falhas) {
      toast.error(`${f.nome}: ${f.mensagem ?? t("Erro ao enviar arquivo(s)")}`);
    }
    return r.falhas.map((f) => f.nome);
  }
```

- [ ] **Step 4: O modal**

Em `components/escale/negocio/abas/JanelaDeNovoDocumento.tsx`, troque o tipo da prop `aoSalvar: (arquivos: File[]) => Promise<void>;` por `aoSalvar: (arquivos: File[]) => Promise<string[]>;` e a função

```tsx
  async function salvar() {
    setEnviando(true);
    try {
      await aoSalvar(lista);
      fechar();
    } finally {
      setEnviando(false);
    }
  }
```

por

```tsx
  async function salvar() {
    setEnviando(true);
    try {
      const falharam = await aoSalvar(lista);
      // Fecha só quando tudo subiu; senão fica com os que falharam, para tentar de novo.
      if (falharam.length === 0) fechar();
      else setLista((atual) => atual.filter((a) => falharam.includes(a.name)));
    } finally {
      setEnviando(false);
    }
  }
```

Atualize o comentário do topo do arquivo: troque `"Salvar" envia.` por `"Salvar" envia e fecha quando tudo subiu; o que falhou fica na lista.`

- [ ] **Step 5: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-ficha-aba-arquivos.test.tsx tests/unit/escale-ficha-arquivos-rotas.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts
grep -rlF "useArquivosDoContato" tests/unit --include='*.test.ts' --include='*.test.tsx' | xargs corepack pnpm vitest run
corepack pnpm eslint hooks/escale/useArquivosDoContato.ts components/escale/negocio/abas/JanelaDeNovoDocumento.tsx components/escale/negocio/abas/AbaArquivos.tsx
corepack pnpm typecheck
```
Expected: PASS. Nenhum texto novo de tela (as duas mensagens já têm espanhol).

- [ ] **Step 6: Commit**

```bash
git add hooks/escale/useArquivosDoContato.ts components/escale/negocio/abas/JanelaDeNovoDocumento.tsx components/escale/negocio/abas/AbaArquivos.tsx tests/unit/escale-ficha-aba-arquivos.test.tsx
git commit -m "fix(escale): erros de envio traduzidos e o modal Novo documento só fecha quando tudo subiu (1H-C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Rodada cheia, revisão, conferência visual com prova de envio real, PRD e PR

**Files:**
- Create (fora do repositório): `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1h\2026-10-18-ESCALE-B-*.png` e a seção "PR B" no `LEIA-ME.md` da mesma pasta.
- Modify (fora do repositório): `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`.

- [ ] **Step 1: A rodada cheia, em segundo plano**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
mkdir -p .superpowers/sdd
nohup bash -c '( corepack pnpm typecheck && corepack pnpm lint && corepack pnpm lint:channels && corepack pnpm lint:role-rank && bash scripts/checar-colisao-de-migration.sh escale-crm/main ) > .superpowers/sdd/1hc-gates.log 2>&1; echo "rapidos=$?" >> .superpowers/sdd/1hc-gates.log; corepack pnpm vitest run --reporter=json --outputFile=.superpowers/sdd/1hc-unit.json > .superpowers/sdd/1hc-unit.log 2>&1; echo "unit=$?" > .superpowers/sdd/1hc-unit.done; ( corepack pnpm test:db && corepack pnpm test:db:update ) > .superpowers/sdd/1hc-db.log 2>&1; echo "db=$?" > .superpowers/sdd/1hc-db.done' > /dev/null 2>&1 &
```

Quando `1hc-unit.done` existir, compare com as falhas conhecidas:

```bash
cp ../repo/.superpowers/sdd/falhas-conhecidas.txt .superpowers/sdd/ 2>/dev/null
node -e '
const fs = require("fs"), path = require("path");
const r = JSON.parse(fs.readFileSync(".superpowers/sdd/1hc-unit.json", "utf8"));
const conhecidas = new Set(fs.readFileSync(".superpowers/sdd/falhas-conhecidas.txt", "utf8").split(/\r?\n/).filter(Boolean));
const falhas = r.testResults.filter((t) => t.status === "failed").map((t) => path.relative(process.cwd(), t.name).split(path.sep).join("/"));
const novas = falhas.filter((f) => !conhecidas.has(f));
console.log("falharam:", falhas.length, "| novas:", novas.length);
for (const f of novas) console.log("NOVA", f);
'
```
Expected: `rapidos=0`, `novas: 0`, `db=0`. Falha nova: rode o arquivo sozinho; se continuar, é regressão desta fase e se corrige antes do PR.

- [ ] **Step 2: A revisão (um revisor, Sonnet), enquanto a rodada roda**

Gere o pacote do diff (`git log --oneline escale-crm/main..HEAD`, `git diff --stat escale-crm/main..HEAD` e `git diff -U10 escale-crm/main..HEAD` num arquivo só em `.superpowers/sdd/1hc-review.diff`) e despache **um** revisor `code-reviewer` (modelo `sonnet`) para conferir: o teto do proxy cobre o que a rota aceita e nada além; as três portas de escrita seguem a mesma régua que o banco (agent+); a 9011 não lê `new.user_nome` e segue fechada a `anon`/`authenticated`; o bloco do baseline é idêntico; o modal não perde nem reenvia arquivo. Corrija o que vier como Critical ou Important (com teste) e anote o resto no PR.

- [ ] **Step 3: Conferência visual e a prova do envio de ~12 MB**

Suba o app local como na conferência do PR A (o `LEIA-ME.md` de `docs/clint/prints-1h/` descreve: Supabase local com o `baseline.sql`, `scripts/bootstrap-owner.ts`, `next build` + `next start -p 3100`, casca ligada pelo `/app/escale/menu?usar=topo`, janela 1523×784, usuário `owner@escale.local`). Reaplique o baseline desta branch no banco local antes (ele traz a 9008 e a 9011): `docker exec -i $(docker ps --format '{{.Names}}' | grep supabase_db | head -1) psql -U postgres -d postgres < supabase/baseline.sql > .superpowers/sdd/1hc-baseline-local.log 2>&1`. **Nunca** aponte o app para o banco de produção.

Com o Playwright (o `chromium` do `node_modules/@playwright/test`), tire os prints abaixo em `docs/clint/prints-1h/` com o prefixo `2026-10-18-ESCALE-B-` e meça com `getBoundingClientRect`/`getComputedStyle`:
1. `01-nova-nota-modal` — o ícone de nota da ficha clicado: o modal "Nova nota".
2. `02-historico-com-nota` — o Histórico com a nota salva ("Ver nota") e uma mudança de etapa; `02b-historico-nota-aberta` com a nota expandida ("Editar nota" e a lixeira); `02c-historico-filtro-aberto` com o filtro de grupos aberto (compare com o print 12 da Clint).
3. `03-arquivos-vazio` (compare com o print 06), `03b-novo-documento` (o modal com dois arquivos na lista), `03c-arquivos-com-arquivo` (a tabela com uma linha; compare com 01-001), `03d-arquivos-filtros-abertos` (Data e Tipo de arquivo).
4. `04-conversas` — a aba Conversas (compare com o print 05).
5. **A prova do envio:** gere um PDF de ~12 MB (`node -e "const fs=require('fs');fs.writeFileSync('/tmp/doze-mb.pdf', Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(12*1024*1024, 32)]))"`), envie pela tela ("Novo arquivo" → "Adicionar" → "Salvar") e confirme: o toast "Arquivo(s) enviado(s) com sucesso" e a linha na tabela com o tamanho certo. Print `05-envio-12mb`. Se falhar, PARE: o teto do proxy não está valendo na build (a causa provável é o proxy reverso local; registre o erro e o status HTTP).

No `LEIA-ME.md`, acrescente a seção "PR B (1H-C, 18/10)" com a tabela dos prints (arquivo, o que mostra, referência da Clint), as medidas e **só as diferenças que mudam o USO** (regra do usuário de 17/10: organização, posição e interação; pixel não segura PR). Pare o `next start` e o Supabase local no fim.

- [ ] **Step 4: PRD**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`, seção 8, na linha `| 1H |`, troque a última coluna por `✅ PR A #26, PR B #27 e PR C #NN (acabamento: 25 MB, permissões, autor, erros de envio, conferência visual)`, com o número do PR desta fase.

- [ ] **Step 5: Push e PR**

```bash
git push -u escale-crm feat/fase-1h-acabamento
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-1h-acabamento --title "fix(escale): Fase 1H (C) — acabamento da ficha: 25 MB, permissões, autor, erros de envio e conferência visual" --body-file .superpowers/sdd/1hc-pr.md
```

O corpo do PR leva: o Goal; as decisões H1 a H5; o arquivo do original tocado (`next.config.ts`, uma opção) e a migration 9011 (só redefine uma função: nada muda em dado existente; notas e arquivos novos passam a ter o nome do autor mesmo sem perfil); o resultado da rodada cheia; a prova do envio de 12 MB; os prints e as diferenças que mudam o uso; o que segue pendente (LGPD das notas e dos arquivos na Fase 2). Termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Mostre a URL ao usuário e PARE. Merge, tag e publicação são pedidos à parte. Remova a worktree só depois do merge (`git worktree remove ../wt-1h-c`).

## Fora desta fase (registrado)

- A anonimização LGPD das notas e dos arquivos (e a limpeza dos binários no bucket quando o contato é excluído): Fase 2 (Contatos), decisão Q14 da 1H.
- O medidor de cota "0.00 GB / 5.00 GB" da aba Arquivos (PRD §9).
- Ícone do canal na foto da sessão, prévia do arquivo em tela cheia, "Ver automação" e antes/depois de campo no Histórico (previstos no plano da 1H).
