# Fase 0 — Casca Escale (identidade + menu no topo + conversas flutuantes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao Escale IA OS a casca nova — cores e fontes do site escaleia.com, menu horizontal no topo (modelo V1 da Clint) com o painel "Mais" para as demais telas, e um botão flutuante de conversas — ligada por uma chave por pessoa, sem mudar nada para quem não ligou.

**Architecture:** Tudo novo mora em arquivos novos do fork (`lib/escale/`, `components/escale/`, `app/escale-tema.css`, `app/app/escale/`). O original (Rafael) é tocado só em pontos de encaixe de 1–10 linhas: `app/layout.tsx` (1 import), `app/app/layout.tsx` (ler a chave), `app/app/_components/AppShell.tsx` (trocar lateral ↔ topo) e `lib/i18n/dicionario.ts` (textos em espanhol). A chave é um cookie `escale_menu` (`topo`|`lateral`, padrão `lateral`), gravado por `GET /app/escale/menu?usar=…`. Com a chave em `topo`, a casca põe o marcador `data-escale-casca` na página, e é esse marcador que ativa o tema (`body:has([data-escale-casca])`): identidade e menu ligam e desligam juntos.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, Tailwind 4 (tokens em CSS), Vitest + Testing Library, TanStack Query, Phosphor (via `@/lib/ui/icons`).

## Global Constraints

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`. Base: `escale-crm/main`. Branch: `feat/fase-0-casca-escale`. PR para `rgisjr/escale-crm` base `main`; quem aprova é o usuário. Nunca dar push em `origin` (Rafael).
- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`. Typecheck e testes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- Sem migration e sem mudança de banco nesta fase.
- Cores (do site, medidas): azul de ação `#3f5ff0` (o `#5274ff` do site um passo mais escuro, para texto branco passar AA 4,5:1), rampa azul `#f0f3ff…#1a2250`, fundo `#f8faff`, títulos `#2b2e3b`, laranja da IA `#ff914c`, atenção amarelo `#f2c94c`/`#a67900`, marca `#2965b3`.
- Fontes: Figtree (texto) e JetBrains Mono (números), arquivos `.woff2` versionados em `app/fonts/` (o repo não baixa fonte no build — ver `app/fonts/README.md`).
- Itens do topo, nesta ordem: Negócios (`/app/kanban`), Conversas (`/app/inbox`), Contatos (`/app/contacts`), Empresas (`/app/companies`), Atividades (`/app/tasks`), Agenda (`/app/agenda`), Agentes IA (`/app/ai/agents`), Automações (`/app/settings/automacoes`), Indicadores (`/app/metrics`), e o botão **Mais**. Item que o papel/módulo da pessoa não permite **não aparece** (a regra de permissão é a do registro existente, `searchable()`).
- Todo texto de tela passa por `t()` e tem espanhol no `lib/i18n/dicionario.ts` (gate `tests/unit/i18n-espanhol-cobre-a-tela.test.ts`). Chave repetida no dicionário quebra o typecheck: conferir antes de acrescentar.
- Celular (< `md`): continua a barra atual (`TopBar` + gaveta + barra inferior). O menu do topo e o botão flutuante são só `md+`.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; corpo do PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Testes que já falham NESTA máquina Windows e também falham no original (pdfjs com caminho `C:\…`, `spawnSync bash ENOENT`, `chmod 600`, caminho com espaço) não são regressão — ver memória `sincronizar-com-o-rafael`. Regressão é teste que passa em `escale-crm/main` e falha na branch.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `app/fonts/figtree-300-900-latin.woff2` | novo | fonte Figtree (Google Fonts, latin) |
| `app/fonts/README.md` | alterado (1 linha na tabela) | origem da fonte nova |
| `app/escale-tema.css` | novo | tokens Escale (claro/escuro) + `@font-face`, escopo `body:has([data-escale-casca])` |
| `app/layout.tsx` | alterado (1 linha) | importa o tema depois do `globals.css` |
| `lib/escale/preferencia-de-menu.ts` | novo | cookie, padrão, leitura e destino seguro |
| `app/app/escale/menu/route.ts` | novo | `GET /app/escale/menu?usar=topo\|lateral&voltar=…` grava a chave |
| `lib/escale/menu-do-topo.ts` | novo | itens do topo, montagem do "Mais", item ativo |
| `components/escale/menu/MarcaNoTopo.tsx` | novo | logo/nome da marca (mesma regra da lateral) |
| `components/escale/menu/PainelMais.tsx` | novo | painel com todas as outras telas |
| `components/escale/menu/MenuDoTopo.tsx` | novo | barra do topo (md+) |
| `components/escale/ConversasFlutuante.tsx` | novo | botão flutuante + últimas 5 conversas |
| `app/app/_components/AppShell.tsx` | alterado | casca lateral × topo + marcador |
| `app/app/layout.tsx` | alterado (3 linhas) | lê o cookie e passa `menu` |
| `lib/i18n/dicionario.ts` | alterado (bloco) | 10 textos novos em espanhol |
| `tests/unit/escale-tema.test.ts` | novo | tokens nos dois temas, contraste AA, fontes, encaixe |
| `tests/unit/escale-preferencia-de-menu.test.ts` | novo | cookie e rota |
| `tests/unit/escale-menu-do-topo.test.ts` | novo | regra do menu e permissões |
| `tests/unit/escale-menu-do-topo-tela.test.tsx` | novo | componente do topo + Mais |
| `tests/unit/escale-conversas-flutuante.test.tsx` | novo | botão flutuante |

---

### Task 1: Branch, fonte e tema Escale

**Files:**
- Create: `app/fonts/figtree-300-900-latin.woff2`, `app/escale-tema.css`, `tests/unit/escale-tema.test.ts`
- Modify: `app/fonts/README.md` (tabela), `app/layout.tsx` (linha `import "./globals.css";`)
- Copy: este plano para `docs/superpowers/plans/2026-10-13-fase-0-casca-escale.md` no repositório

**Interfaces:**
- Produces: tokens CSS `--color-ai`, `--color-ai-soft`, `--color-ai-fg`, `--color-escale-marca` (usados pela Task 4 e pelas fases seguintes); seletor `body:has([data-escale-casca])` (o marcador nasce na Task 6).

- [ ] **Step 1: Branch e plano no repositório**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git switch -c feat/fase-0-casca-escale escale-crm/main
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-13-fase-0-casca-escale.md" docs/superpowers/plans/
```

- [ ] **Step 2: Baixar a Figtree pelo mesmo caminho das outras fontes do repo**

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
URL=$(curl -sA "$UA" 'https://fonts.googleapis.com/css2?family=Figtree:wght@300..900&display=swap' \
  | awk '/\/\* latin \*\//{f=1} f && /src:/{match($0,/https:[^)]+/); print substr($0,RSTART,RLENGTH); exit}')
echo "$URL"
curl -fsSL -o app/fonts/figtree-300-900-latin.woff2 "$URL"
head -c 4 app/fonts/figtree-300-900-latin.woff2; echo; wc -c < app/fonts/figtree-300-900-latin.woff2
```
Expected: a URL termina em `.woff2` e contém `/figtree/v`; o arquivo começa com `wOF2` e tem mais de 15000 bytes. Anote a versão (`figtree/vNN`) para o Step 3.

- [ ] **Step 3: Registrar a origem no README das fontes**

Em `app/fonts/README.md`, logo abaixo da linha da `jetbrains-mono-100-800-latin.woff2` na tabela, acrescente (troque `vNN` pela versão do Step 2):

```markdown
| `figtree-300-900-latin.woff2` | Figtree | variável 300–900 | latin | `figtree/vNN` (fork Escale: fonte da casca nova) |
```

- [ ] **Step 4: Escrever o teste do tema (vai falhar)**

Create `tests/unit/escale-tema.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O TEMA ESCALE SÓ VALE NA CASCA NOVA, E TEM DE SER LEGÍVEL NOS DOIS TEMAS.
 *
 * `app/escale-tema.css` redefine os tokens do original dentro de
 * `body:has([data-escale-casca])` — o marcador que a casca põe na página quando a
 * pessoa liga o menu do topo. Sem marcador, nada muda (o original fica intacto).
 */
const RAIZ = join(__dirname, "..", "..");
const CSS = readFileSync(join(RAIZ, "app", "escale-tema.css"), "utf8");
const LAYOUT_RAIZ = readFileSync(join(RAIZ, "app", "layout.tsx"), "utf8");

const SELETOR_CLARO = "body:has([data-escale-casca])";
const SELETOR_ESCURO = '[data-theme="dark"] body:has([data-escale-casca])';

function bloco(seletor: string): Record<string, string> {
  const abre = seletor + " {";
  const i = CSS.indexOf(abre);
  if (i < 0) throw new Error(`bloco ${seletor} não encontrado`);
  const fim = CSS.indexOf("}", i);
  const corpo = CSS.slice(i + abre.length, fim);
  return Object.fromEntries(
    [...corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]),
  );
}

// O bloco claro vem ANTES do escuro no arquivo; `indexOf` acha o claro primeiro.
const CLARO = bloco(SELETOR_CLARO);
const ESCURO = bloco(SELETOR_ESCURO);

function resolver(valor: string, mapa: Record<string, string>): string {
  const m = /^var\((--[\w-]+)\)$/.exec(valor);
  if (!m) return valor;
  const proximo = mapa[m[1]!];
  if (proximo === undefined) throw new Error(`token ${m[1]} sem valor`);
  return resolver(proximo, mapa);
}

function luminancia(hex: string): number {
  const h = hex.replace("#", "");
  const canais = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

const PAPEIS = [
  "--color-bg",
  "--color-surface",
  "--color-surface-elevated",
  "--color-text",
  "--color-text-muted",
  "--color-text-subtle",
  "--color-border",
  "--color-border-strong",
  "--color-accent",
  "--color-accent-fg",
  "--color-accent-soft",
  "--color-accent-hover",
  "--color-warning",
  "--color-warning-bg",
  "--color-warning-fg",
  "--color-ai",
  "--color-ai-soft",
  "--color-ai-fg",
  "--color-escale-marca",
];

describe("tema Escale", () => {
  it("o layout raiz carrega o tema da Escale depois do tema do original", () => {
    const original = LAYOUT_RAIZ.indexOf('import "./globals.css";');
    const escale = LAYOUT_RAIZ.indexOf('import "./escale-tema.css";');
    expect(original).toBeGreaterThan(-1);
    expect(escale).toBeGreaterThan(original);
  });

  it("o tema claro redefine todos os papéis e a rampa azul", () => {
    const faltando = [...PAPEIS, "--color-accent-400", "--color-accent-600", "--font-atkinson", "--font-mono"].filter(
      (t) => CLARO[t] === undefined,
    );
    expect(faltando).toEqual([]);
  });

  it("o tema escuro redefine os mesmos papéis", () => {
    expect(PAPEIS.filter((t) => ESCURO[t] === undefined)).toEqual([]);
  });

  it("texto do botão sobre a cor de ação passa AA (4,5:1) nos dois temas", () => {
    const mapaEscuro = { ...CLARO, ...ESCURO };
    expect(contraste(resolver(CLARO["--color-accent"]!, CLARO), CLARO["--color-accent-fg"]!)).toBeGreaterThanOrEqual(4.5);
    expect(
      contraste(resolver(ESCURO["--color-accent"]!, mapaEscuro), ESCURO["--color-accent-fg"]!),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("texto principal e secundário sobre o fundo passam AA nos dois temas", () => {
    for (const tema of [CLARO, ESCURO]) {
      expect(contraste(tema["--color-text"]!, tema["--color-bg"]!)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(tema["--color-text-muted"]!, tema["--color-bg"]!)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("as fontes do @font-face existem no repositório", () => {
    const urls = [...CSS.matchAll(/url\("\.\/(fonts\/[^"]+)"\)/g)].map((m) => m[1]!);
    expect(urls.length).toBe(2);
    expect(urls.filter((u) => !existsSync(join(RAIZ, "app", u)))).toEqual([]);
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
corepack pnpm vitest run tests/unit/escale-tema.test.ts
```
Expected: FAIL — `ENOENT ... app/escale-tema.css`.

- [ ] **Step 6: Criar o tema**

Create `app/escale-tema.css`:

```css
/*
 * TEMA ESCALE IA — a identidade do site escaleia.com aplicada ao app.
 *
 * Arquivo do FORK (escale-crm). O tema do original (`globals.css`) fica intacto:
 * este arquivo só redefine os mesmos tokens, e só dentro da casca nova
 * (`body:has([data-escale-casca])`, marcador que o AppShell põe quando a pessoa
 * liga o menu do topo). Sem marcador, a tela é exatamente a do original.
 *
 * Especificidade: `body:has([data-escale-casca])` = (0,1,1), acima do `:root`
 * (0,1,0) do original. A marca escolhida pela organização em Configurações › Marca
 * (`body:has([data-marca-org])`, mesma especificidade, injetada depois) continua
 * vencendo — a escolha da empresa manda.
 *
 * Azul de ação = #3f5ff0: o #5274ff do site um passo mais escuro, para o texto
 * branco do botão passar AA (4,5:1). Laranja = cor do que a IA faz (tokens
 * --color-ai*), usada a partir da Fase 2. Atenção = amarelo, para não se
 * confundir com a IA. Medido em `tests/unit/escale-tema.test.ts`.
 */

@font-face {
  font-family: "Escale Figtree";
  src: url("./fonts/figtree-300-900-latin.woff2") format("woff2");
  font-weight: 300 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Escale JetBrains Mono";
  src: url("./fonts/jetbrains-mono-100-800-latin.woff2") format("woff2");
  font-weight: 100 800;
  font-style: normal;
  font-display: swap;
}

body:has([data-escale-casca]) {
  /* fontes: o original usa var(--font-atkinson) e var(--font-mono) */
  --font-atkinson: "Escale Figtree", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: "Escale JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* superfícies e texto */
  --color-bg: #f8faff;
  --color-surface: #ffffff;
  --color-surface-elevated: #f1f4fe;
  --color-overlay: rgba(43, 46, 59, 0.32);
  --color-text: #2b2e3b;
  --color-text-muted: #5f6478;
  --color-text-subtle: #767b8f;
  --color-border: #e3e8f8;
  --color-border-strong: #d2d9f0;

  /* rampa azul (igual nos dois temas, como no original) */
  --color-accent-50: #f0f3ff;
  --color-accent-100: #e1e8ff;
  --color-accent-200: #c6d2ff;
  --color-accent-300: #a3b5ff;
  --color-accent-400: #7d97ff;
  --color-accent-500: #5274ff;
  --color-accent-600: #3f5ff0;
  --color-accent-700: #3249cc;
  --color-accent-800: #2b3ea3;
  --color-accent-900: #283880;
  --color-accent-950: #1a2250;
  --color-accent: var(--color-accent-600);
  --color-accent-fg: #ffffff;
  --color-accent-soft: #ecf0fe;
  --color-accent-hover: var(--color-accent-700);

  /* neutros frios */
  --color-neutral-50: #f8faff;
  --color-neutral-100: #f1f4fe;
  --color-neutral-200: #e3e8f8;
  --color-neutral-300: #d2d9f0;
  --color-neutral-400: #a9afc4;
  --color-neutral-500: #8c90a0;
  --color-neutral-600: #5f6478;
  --color-neutral-700: #474b5c;
  --color-neutral-800: #2f3240;
  --color-neutral-900: #1f2230;
  --color-neutral-950: #12141c;

  /* atenção (amarelo) */
  --color-warning: #a67900;
  --color-warning-bg: rgba(242, 201, 76, 0.2);
  --color-warning-fg: #7a5600;

  /* o que a IA faz (laranja da marca) */
  --color-ai: #ff914c;
  --color-ai-soft: #fff1e7;
  --color-ai-fg: #c2560f;

  /* nome da marca quando não há logo */
  --color-escale-marca: #2965b3;
}

[data-theme="dark"] body:has([data-escale-casca]) {
  --color-bg: #12141c;
  --color-surface: #181b26;
  --color-surface-elevated: #202433;
  --color-overlay: rgba(0, 0, 0, 0.55);
  --color-text: #e8eaf2;
  --color-text-muted: #a5aac0;
  --color-text-subtle: #7d849c;
  --color-border: #2a2f42;
  --color-border-strong: #353b52;

  --color-accent: var(--color-accent-400);
  --color-accent-fg: #12141c;
  --color-accent-soft: rgba(125, 151, 255, 0.16);
  --color-accent-hover: var(--color-accent-300);

  --color-warning: #f2c94c;
  --color-warning-bg: rgba(242, 201, 76, 0.13);
  --color-warning-fg: #f5d77a;

  --color-ai: #ff9f66;
  --color-ai-soft: rgba(255, 145, 76, 0.13);
  --color-ai-fg: #ffb283;

  --color-escale-marca: #8fb2ea;
}
```

- [ ] **Step 7: Encaixar no layout raiz**

Em `app/layout.tsx`, troque a linha:

```ts
import "./globals.css";
```

por:

```ts
import "./globals.css";
// Fork Escale: tema da casca nova. Só vale com o marcador `data-escale-casca`.
import "./escale-tema.css";
```

- [ ] **Step 8: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-tema.test.ts
```
Expected: PASS (6 testes).

- [ ] **Step 9: Commit**

```bash
git add app/fonts/figtree-300-900-latin.woff2 app/fonts/README.md app/escale-tema.css app/layout.tsx tests/unit/escale-tema.test.ts docs/superpowers/plans/2026-10-13-fase-0-casca-escale.md
git commit -m "feat(escale): tema da casca nova com as cores e fontes do site

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: A chave do menu (cookie + rota)

**Files:**
- Create: `lib/escale/preferencia-de-menu.ts`, `app/app/escale/menu/route.ts`, `tests/unit/escale-preferencia-de-menu.test.ts`

**Interfaces:**
- Produces:
  - `type PreferenciaDeMenu = "lateral" | "topo"`
  - `const COOKIE_DO_MENU = "escale_menu"`
  - `const MENU_PADRAO: PreferenciaDeMenu` (= `"lateral"`)
  - `lerPreferenciaDeMenu(valor: string | null | undefined): PreferenciaDeMenu`
  - `destinoSeguro(voltar: string | null): string`
  - `caminhoDaChave(usar: PreferenciaDeMenu, voltar: string): string` → `"/app/escale/menu?usar=…&voltar=…"`
  - `GET /app/escale/menu?usar=topo|lateral&voltar=/app/...` → 307 para `voltar`, gravando o cookie.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-preferencia-de-menu.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/cookie-secure", () => ({ cookieSecure: () => false }));

import {
  COOKIE_DO_MENU,
  MENU_PADRAO,
  caminhoDaChave,
  destinoSeguro,
  lerPreferenciaDeMenu,
} from "@/lib/escale/preferencia-de-menu";
import { GET } from "@/app/app/escale/menu/route";

const req = (qs: string) => new NextRequest(`http://localhost/app/escale/menu?${qs}`);

describe("preferência de menu", () => {
  it("o padrão é a lateral, e só 'topo' e 'lateral' são valores válidos", () => {
    expect(MENU_PADRAO).toBe("lateral");
    expect(lerPreferenciaDeMenu("topo")).toBe("topo");
    expect(lerPreferenciaDeMenu("lateral")).toBe("lateral");
    expect(lerPreferenciaDeMenu("qualquer")).toBe("lateral");
    expect(lerPreferenciaDeMenu(undefined)).toBe("lateral");
  });

  it("o destino de volta fica dentro do app", () => {
    expect(destinoSeguro("/app/inbox")).toBe("/app/inbox");
    expect(destinoSeguro("/app")).toBe("/app");
    expect(destinoSeguro("/app/pipelines/p-1?lead=x")).toBe("/app/pipelines/p-1?lead=x");
    expect(destinoSeguro("//evil.com")).toBe("/app");
    expect(destinoSeguro("https://evil.com")).toBe("/app");
    expect(destinoSeguro("/apple")).toBe("/app");
    expect(destinoSeguro("/app\\..\\x")).toBe("/app");
    expect(destinoSeguro(null)).toBe("/app");
  });

  it("monta o link da chave com a tela de volta codificada", () => {
    expect(caminhoDaChave("lateral", "/app/pipelines/p-1")).toBe(
      "/app/escale/menu?usar=lateral&voltar=%2Fapp%2Fpipelines%2Fp-1",
    );
  });
});

describe("GET /app/escale/menu", () => {
  it("usar=topo grava o cookie e volta para a tela de onde veio", () => {
    const res = GET(req("usar=topo&voltar=%2Fapp%2Finbox"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/app/inbox");
    expect(res.cookies.get(COOKIE_DO_MENU)?.value).toBe("topo");
  });

  it("usar=lateral grava 'lateral'", () => {
    const res = GET(req("usar=lateral"));
    expect(res.cookies.get(COOKIE_DO_MENU)?.value).toBe("lateral");
    expect(res.headers.get("location")).toBe("http://localhost/app");
  });

  it("valor desconhecido não grava nada, e destino de fora cai em /app", () => {
    const res = GET(req("usar=roxo&voltar=%2F%2Fevil.com"));
    expect(res.cookies.get(COOKIE_DO_MENU)).toBeUndefined();
    expect(res.headers.get("location")).toBe("http://localhost/app");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-preferencia-de-menu.test.ts
```
Expected: FAIL — `Failed to resolve import "@/lib/escale/preferencia-de-menu"`.

- [ ] **Step 3: Implementar a regra**

Create `lib/escale/preferencia-de-menu.ts`:

```ts
/**
 * A CHAVE DA CASCA NOVA (fork Escale): menu no topo + tema Escale, por pessoa.
 *
 * Mora num cookie, como "recolher a barra lateral" (`app/actions/shell/toggleSidebar.ts`):
 * cada pessoa liga para si, sem banco e sem mexer nas preferências de interface da
 * organização. Quando a casca nova for aprovada, trocar `MENU_PADRAO` para `"topo"`
 * liga para todo mundo (quem gravou `lateral` continua na lateral).
 */
export type PreferenciaDeMenu = "lateral" | "topo";

export const COOKIE_DO_MENU = "escale_menu";

export const MENU_PADRAO: PreferenciaDeMenu = "lateral";

export function lerPreferenciaDeMenu(valor: string | null | undefined): PreferenciaDeMenu {
  return valor === "topo" || valor === "lateral" ? valor : MENU_PADRAO;
}

/** Só volta para dentro do app: `/app` ou `/app/...`. O resto cai em `/app`. */
export function destinoSeguro(voltar: string | null): string {
  if (!voltar) return "/app";
  if (voltar.includes("\\") || voltar.startsWith("//")) return "/app";
  if (voltar === "/app" || voltar.startsWith("/app/") || voltar.startsWith("/app?")) return voltar;
  return "/app";
}

export function caminhoDaChave(usar: PreferenciaDeMenu, voltar: string): string {
  return `/app/escale/menu?usar=${usar}&voltar=${encodeURIComponent(voltar)}`;
}
```

- [ ] **Step 4: Implementar a rota**

Create `app/app/escale/menu/route.ts`:

```ts
/**
 * GET /app/escale/menu?usar=topo|lateral&voltar=/app/... — liga ou desliga a casca
 * nova (menu no topo + tema Escale) para QUEM CHAMOU, e volta para a tela de origem.
 *
 * Fica sob `/app`, então o `proxy.ts` já exige sessão. Não toca banco: a escolha é
 * só um cookie de preferência visual, como o de recolher a barra lateral.
 */
import { NextResponse, type NextRequest } from "next/server";

import { cookieSecure } from "@/lib/supabase/cookie-secure";
import { COOKIE_DO_MENU, destinoSeguro } from "@/lib/escale/preferencia-de-menu";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest): NextResponse {
  const usar = req.nextUrl.searchParams.get("usar");
  const destino = destinoSeguro(req.nextUrl.searchParams.get("voltar"));
  const res = NextResponse.redirect(new URL(destino, req.url));
  if (usar === "topo" || usar === "lateral") {
    res.cookies.set(COOKIE_DO_MENU, usar, {
      httpOnly: true,
      sameSite: "strict",
      secure: cookieSecure(),
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
```

- [ ] **Step 5: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-preferencia-de-menu.test.ts
```
Expected: PASS (6 testes).

- [ ] **Step 6: Commit**

```bash
git add lib/escale/preferencia-de-menu.ts app/app/escale/menu/route.ts tests/unit/escale-preferencia-de-menu.test.ts
git commit -m "feat(escale): chave por pessoa para ligar a casca nova

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A regra do menu do topo

**Files:**
- Create: `lib/escale/menu-do-topo.ts`, `tests/unit/escale-menu-do-topo.test.ts`
- Modify: `lib/i18n/dicionario.ts` (bloco do fork)

**Interfaces:**
- Consumes: `searchable(isPlatformAdmin, role, settings?, modulos?, capacidades?): NavDestination[]`, `NAV_GROUPS`, tipos `NavDestination`, `NavGroup` — todos de `@/lib/navigation/registry`.
- Produces:
  - `interface ItemDoTopo { href: string; rotulo: string; contador?: "fila"; ativoEm: readonly string[] }`
  - `const ITENS_DO_TOPO: readonly ItemDoTopo[]`
  - `interface SecaoDoMais { secao: string; itens: NavDestination[] }`
  - `interface GrupoDoMais { grupo: NavGroup; secoes: SecaoDoMais[] }`
  - `interface MenuDoTopo { topo: ItemDoTopo[]; mais: GrupoDoMais[] }`
  - `montarMenuDoTopo(visiveis: readonly NavDestination[]): MenuDoTopo`
  - `itemAtivo(pathname: string, item: ItemDoTopo): boolean`
  - `destinoAtivo(pathname: string, href: string): boolean`

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-menu-do-topo.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { DICIONARIO } from "@/lib/i18n/dicionario";
import type { ModuloOpcional } from "@/lib/instalacao/modulos";
import { NAV_GROUPS, searchable } from "@/lib/navigation/registry";
import {
  ITENS_DO_TOPO,
  destinoAtivo,
  itemAtivo,
  montarMenuDoTopo,
} from "@/lib/escale/menu-do-topo";

const COM_EMPRESAS: ModuloOpcional[] = ["crm_b2b"];
const ADMIN = searchable(false, "admin", undefined, COM_EMPRESAS, []);
const AGENT = searchable(false, "agent", undefined, [], []);

describe("menu do topo", () => {
  it("admin com o módulo de empresas vê os 9 itens, na ordem combinada", () => {
    expect(montarMenuDoTopo(ADMIN).topo.map((i) => i.rotulo)).toEqual([
      "Negócios",
      "Conversas",
      "Contatos",
      "Empresas",
      "Atividades",
      "Agenda",
      "Agentes IA",
      "Automações",
      "Indicadores",
    ]);
  });

  it("item que o papel ou o módulo não permite não aparece (mesma regra da lateral)", () => {
    expect(montarMenuDoTopo(AGENT).topo.map((i) => i.href)).toEqual([
      "/app/kanban",
      "/app/inbox",
      "/app/contacts",
      "/app/tasks",
      "/app/agenda",
      "/app/metrics",
    ]);
  });

  it("toda tela visível aparece exatamente uma vez: no topo ou no Mais", () => {
    for (const visiveis of [ADMIN, AGENT]) {
      const menu = montarMenuDoTopo(visiveis);
      const alcancaveis = [
        ...menu.topo.map((i) => i.href),
        ...menu.mais.flatMap((g) => g.secoes.flatMap((s) => s.itens.map((d) => d.href))),
      ];
      expect(new Set(alcancaveis).size).toBe(alcancaveis.length);
      expect([...alcancaveis].sort()).toEqual(visiveis.map((d) => d.href).sort());
    }
  });

  it("o Mais segue a ordem dos grupos do registro e não repete o topo", () => {
    const menu = montarMenuDoTopo(ADMIN);
    const ordem = NAV_GROUPS.map((g) => g.id);
    const vistos = menu.mais.map((g) => g.grupo.id);
    expect(vistos).toEqual(ordem.filter((id) => vistos.includes(id)));
    const noTopo = new Set(menu.topo.map((i) => i.href));
    const repetidos = menu.mais.flatMap((g) => g.secoes.flatMap((s) => s.itens)).filter((d) => noTopo.has(d.href));
    expect(repetidos).toEqual([]);
  });

  it("o item fica ativo também nas telas de dentro dele", () => {
    const [negocios, conversas] = ITENS_DO_TOPO;
    expect(itemAtivo("/app/pipelines/p-1", negocios!)).toBe(true);
    expect(itemAtivo("/app/leads/l-1", negocios!)).toBe(true);
    expect(itemAtivo("/app/kanban", negocios!)).toBe(true);
    expect(itemAtivo("/app/inbox/c-9", conversas!)).toBe(true);
    expect(itemAtivo("/app/inboxx", conversas!)).toBe(false);
    expect(destinoAtivo("/app/webhooks/regra-1", "/app/webhooks")).toBe(true);
    expect(destinoAtivo("/app/webhooksx", "/app/webhooks")).toBe(false);
  });

  it("todo rótulo do topo tem espanhol no dicionário", () => {
    expect(ITENS_DO_TOPO.filter((i) => !DICIONARIO[i.rotulo]?.es).map((i) => i.rotulo)).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-menu-do-topo.test.ts
```
Expected: FAIL — `Failed to resolve import "@/lib/escale/menu-do-topo"`.

- [ ] **Step 3: Implementar a regra**

Create `lib/escale/menu-do-topo.ts`:

```ts
/**
 * O MENU DO TOPO (fork Escale, modelo V1 da Clint): 9 itens fixos + "Mais".
 *
 * Não decide permissão: recebe a lista de telas que a pessoa PODE ver
 * (`searchable()` do registro — a mesma régua da barra lateral e do ⌘K) e só
 * reparte. Item do topo que a pessoa não pode ver some; toda tela visível que não
 * está no topo vai para o "Mais", na ordem de grupos e seções do registro.
 */
import { NAV_GROUPS, type NavDestination, type NavGroup } from "@/lib/navigation/registry";

export interface ItemDoTopo {
  href: string;
  /** Chave em português do dicionário (`t(rotulo)`). */
  rotulo: string;
  contador?: "fila";
  /** Prefixos de rota em que o item aparece como atual. */
  ativoEm: readonly string[];
}

export const ITENS_DO_TOPO: readonly ItemDoTopo[] = [
  { href: "/app/kanban", rotulo: "Negócios", ativoEm: ["/app/kanban", "/app/pipelines", "/app/leads"] },
  { href: "/app/inbox", rotulo: "Conversas", contador: "fila", ativoEm: ["/app/inbox"] },
  { href: "/app/contacts", rotulo: "Contatos", ativoEm: ["/app/contacts"] },
  { href: "/app/companies", rotulo: "Empresas", ativoEm: ["/app/companies"] },
  { href: "/app/tasks", rotulo: "Atividades", ativoEm: ["/app/tasks"] },
  { href: "/app/agenda", rotulo: "Agenda", ativoEm: ["/app/agenda"] },
  { href: "/app/ai/agents", rotulo: "Agentes IA", ativoEm: ["/app/ai/agents"] },
  { href: "/app/settings/automacoes", rotulo: "Automações", ativoEm: ["/app/settings/automacoes"] },
  { href: "/app/metrics", rotulo: "Indicadores", ativoEm: ["/app/metrics"] },
];

export interface SecaoDoMais {
  secao: string;
  itens: NavDestination[];
}

export interface GrupoDoMais {
  grupo: NavGroup;
  secoes: SecaoDoMais[];
}

export interface MenuDoTopo {
  topo: ItemDoTopo[];
  mais: GrupoDoMais[];
}

export function destinoAtivo(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href + "?");
}

export function itemAtivo(pathname: string, item: ItemDoTopo): boolean {
  return item.ativoEm.some((prefixo) => destinoAtivo(pathname, prefixo));
}

export function montarMenuDoTopo(visiveis: readonly NavDestination[]): MenuDoTopo {
  const hrefs = new Set(visiveis.map((d) => d.href));
  const topo = ITENS_DO_TOPO.filter((i) => hrefs.has(i.href));
  const noTopo = new Set(topo.map((i) => i.href));

  const mais: GrupoDoMais[] = [];
  for (const grupo of NAV_GROUPS) {
    const porSecao = new Map<string, NavDestination[]>();
    for (const d of visiveis) {
      if (d.group !== grupo.id || noTopo.has(d.href)) continue;
      const secao = d.section ?? "";
      const lista = porSecao.get(secao);
      if (lista) lista.push(d);
      else porSecao.set(secao, [d]);
    }
    if (porSecao.size > 0) {
      mais.push({ grupo, secoes: [...porSecao.entries()].map(([secao, itens]) => ({ secao, itens })) });
    }
  }
  return { topo, mais };
}
```

- [ ] **Step 4: Acrescentar os textos novos ao dicionário**

Primeiro confira que nenhuma destas chaves já existe (chave repetida quebra o typecheck):

```bash
for k in "Agentes IA" "Indicadores" "Menu principal" "Todas as telas" "Voltar ao menu lateral" "Conversas recentes" "Abrir Conversas" "Nenhuma conversa ainda." "Sem mensagem" "Não consegui carregar as conversas."; do
  printf '%-40s %s\n' "$k" "$(grep -cE "^\s*\"$k\"\s*:" lib/i18n/dicionario.ts)"; done
```
Expected: todas `0`. Se alguma der `1`, não a acrescente abaixo.

Em `lib/i18n/dicionario.ts`, logo DEPOIS da linha `  "Trocar de funil": { es: "Cambiar de embudo" },` (ponto estável no meio do arquivo, longe do fim onde o original acrescenta), insira:

```ts
  // ─── FORK ESCALE · casca nova (menu do topo, Mais, conversas flutuantes) ───
  "Agentes IA": { es: "Agentes IA" },
  "Indicadores": { es: "Indicadores" },
  "Menu principal": { es: "Menú principal" },
  "Todas as telas": { es: "Todas las pantallas" },
  "Voltar ao menu lateral": { es: "Volver al menú lateral" },
  "Conversas recentes": { es: "Conversaciones recientes" },
  "Abrir Conversas": { es: "Abrir Conversaciones" },
  "Nenhuma conversa ainda.": { es: "Aún no hay conversaciones." },
  "Sem mensagem": { es: "Sin mensaje" },
  "Não consegui carregar as conversas.": { es: "No pude cargar las conversaciones." },
```

- [ ] **Step 5: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-menu-do-topo.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```
Expected: PASS nos dois arquivos.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/menu-do-topo.ts lib/i18n/dicionario.ts tests/unit/escale-menu-do-topo.test.ts
git commit -m "feat(escale): regra do menu do topo e do painel Mais

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: A barra do topo (marca, itens, Mais)

**Files:**
- Create: `components/escale/menu/MarcaNoTopo.tsx`, `components/escale/menu/PainelMais.tsx`, `components/escale/menu/MenuDoTopo.tsx`, `tests/unit/escale-menu-do-topo-tela.test.tsx`

**Interfaces:**
- Consumes: `montarMenuDoTopo`, `itemAtivo`, `destinoAtivo`, `GrupoDoMais` (Task 3); `caminhoDaChave` (Task 2); `searchable` (registro); `useAuth()` → `{ user, activeOrg }`; `useMarcaDaInstalacao()` → `{ name, logoUrl, logoDarkUrl }`; componentes existentes `SearchTrigger`, `AlertsBell`, `AvisoDePropostaEmDestaque`, `UserMenu`, `TenantSwitcher`, `ContadorDaFila({ compacto })`.
- Produces: `MenuDoTopo(): JSX.Element` (sem props), `PainelMais({ grupos, pathnameAtual, onNavegar })`, `MarcaNoTopo()`.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-menu-do-topo-tela.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/pipelines/p-1" }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { is_platform_admin: false, support: null },
    activeOrg: {
      role: "admin",
      interface_settings: undefined,
      modulos_ligados: ["crm_b2b"],
      capacidades_ligadas: [],
    },
  }),
}));
vi.mock("@/components/shell/AlertsBell", () => ({ AlertsBell: () => null }));
vi.mock("@/components/shell/AvisoDePropostaEmDestaque", () => ({ AvisoDePropostaEmDestaque: () => null }));
vi.mock("@/components/shell/ContadorDaFila", () => ({ ContadorDaFila: () => null }));
vi.mock("@/components/shell/SearchTrigger", () => ({ SearchTrigger: () => null }));
vi.mock("@/components/shell/TenantSwitcher", () => ({ TenantSwitcher: () => null }));
vi.mock("@/components/shell/UserMenu", () => ({ UserMenu: () => null }));
vi.mock("@/components/escale/menu/MarcaNoTopo", () => ({ MarcaNoTopo: () => null }));

import { MenuDoTopo } from "@/components/escale/menu/MenuDoTopo";

describe("<MenuDoTopo>", () => {
  it("mostra os 9 itens na ordem e marca Negócios dentro de um funil", () => {
    render(<MenuDoTopo />);
    const nav = screen.getByRole("navigation", { name: "Menu principal" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Negócios",
      "Conversas",
      "Contatos",
      "Empresas",
      "Atividades",
      "Agenda",
      "Agentes IA",
      "Automações",
      "Indicadores",
    ]);
    expect(within(nav).getByRole("link", { name: "Negócios" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Conversas" })).not.toHaveAttribute("aria-current");
  });

  it("Mais abre as outras telas, sem repetir as do topo, e Esc fecha", async () => {
    const user = userEvent.setup();
    render(<MenuDoTopo />);
    await user.click(screen.getByRole("button", { name: "Mais" }));
    const painel = screen.getByRole("dialog", { name: "Todas as telas" });
    expect(within(painel).getByRole("link", { name: "Webhooks" })).toHaveAttribute("href", "/app/webhooks");
    expect(within(painel).queryByRole("link", { name: "Contatos" })).toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Todas as telas" })).toBeNull();
  });

  it("o caminho de volta ao menu lateral leva a tela atual", async () => {
    const user = userEvent.setup();
    render(<MenuDoTopo />);
    await user.click(screen.getByRole("button", { name: "Mais" }));
    expect(screen.getByRole("link", { name: "Voltar ao menu lateral" })).toHaveAttribute(
      "href",
      "/app/escale/menu?usar=lateral&voltar=%2Fapp%2Fpipelines%2Fp-1",
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-menu-do-topo-tela.test.tsx
```
Expected: FAIL — `Failed to resolve import "@/components/escale/menu/MenuDoTopo"`.

- [ ] **Step 3: A marca (mesma regra de logo da barra lateral)**

Create `components/escale/menu/MarcaNoTopo.tsx`:

```tsx
"use client";
import Link from "next/link";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { useMarcaDaInstalacao } from "@/lib/branding/contexto";
import { cn } from "@/lib/utils";

/**
 * Logo da organização (Configurações › Marca) quando houver; senão o nome da marca
 * na cor `--color-escale-marca`. Mesma precedência de `components/shell/Sidebar.tsx`:
 * marca da organização acima da marca da instalação.
 */
export function MarcaNoTopo() {
  const { activeOrg } = useAuth();
  const brand = useMarcaDaInstalacao();
  const nome = activeOrg?.marca?.nome ?? brand.name;
  const logo = activeOrg?.marca?.logoUrl || brand.logoUrl;
  const logoEscuro =
    activeOrg?.marca?.logoDarkUrl !== undefined
      ? activeOrg.marca.logoDarkUrl
      : activeOrg?.marca?.logoUrl
        ? null
        : brand.logoDarkUrl;

  return (
    <Link href="/app" className="flex shrink-0 items-center" aria-label={nome}>
      {logo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt={nome}
            className={cn("h-7 w-auto max-w-[10rem] object-contain", logoEscuro && "dark:hidden")}
          />
          {logoEscuro ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoEscuro}
              alt=""
              aria-hidden
              className="hidden h-7 w-auto max-w-[10rem] object-contain dark:block"
            />
          ) : null}
        </>
      ) : (
        <span
          className="max-w-[12rem] truncate text-lg font-bold tracking-tight"
          style={{ color: "var(--color-escale-marca)" }}
        >
          {nome}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 4: O painel Mais**

Create `components/escale/menu/PainelMais.tsx`:

```tsx
"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { caminhoDaChave } from "@/lib/escale/preferencia-de-menu";
import { destinoAtivo, type GrupoDoMais } from "@/lib/escale/menu-do-topo";
import { cn } from "@/lib/utils";

export function PainelMais({
  grupos,
  pathnameAtual,
  onNavegar,
}: {
  grupos: GrupoDoMais[];
  pathnameAtual: string;
  onNavegar: () => void;
}) {
  const t = useT();
  return (
    <div
      role="dialog"
      aria-label={t("Todas as telas")}
      className="absolute right-0 top-full z-40 mt-2 grid max-h-[70dvh] w-[min(52rem,calc(100vw-2rem))] grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-6 overflow-auto rounded-lg border bg-card p-5 text-card-foreground shadow-lg"
    >
      {grupos.map(({ grupo, secoes }) => (
        <section key={grupo.id} className="min-w-0 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-primary">{t(grupo.label)}</h2>
          {secoes.map(({ secao, itens }) => (
            <div key={secao || "_"} className="space-y-1">
              {secao ? <p className="text-[11px] text-muted-foreground">{t(secao)}</p> : null}
              <ul className="space-y-0.5">
                {itens.map((d) => {
                  const ativo = destinoAtivo(pathnameAtual, d.href);
                  return (
                    <li key={d.href}>
                      <Link
                        href={d.href}
                        onClick={onNavegar}
                        aria-current={ativo ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                          ativo ? "bg-accent-soft font-semibold" : "hover:bg-accent-soft",
                        )}
                      >
                        <d.icon size={16} aria-hidden />
                        {t(d.label)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <div className="col-span-full flex justify-end border-t pt-3">
        {/* <a> e não <Link>: a rota grava o cookie e o layout precisa ser refeito no servidor. */}
        <a
          href={caminhoDaChave("lateral", pathnameAtual)}
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          {t("Voltar ao menu lateral")}
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: A barra do topo**

Create `components/escale/menu/MenuDoTopo.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AlertsBell } from "@/components/shell/AlertsBell";
import { AvisoDePropostaEmDestaque } from "@/components/shell/AvisoDePropostaEmDestaque";
import { ContadorDaFila } from "@/components/shell/ContadorDaFila";
import { SearchTrigger } from "@/components/shell/SearchTrigger";
import { TenantSwitcher } from "@/components/shell/TenantSwitcher";
import { UserMenu } from "@/components/shell/UserMenu";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { itemAtivo, montarMenuDoTopo } from "@/lib/escale/menu-do-topo";
import { searchable } from "@/lib/navigation/registry";
import { CaretDown } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import { MarcaNoTopo } from "./MarcaNoTopo";
import { PainelMais } from "./PainelMais";

/**
 * A barra do topo da casca nova (md+). No celular a casca mostra a `TopBar` de
 * sempre (gaveta + barra inferior), então este componente se esconde abaixo de `md`.
 */
export function MenuDoTopo() {
  const t = useT();
  const pathname = usePathname() ?? "/app";
  const { user, activeOrg } = useAuth();
  const menu = useMemo(
    () =>
      montarMenuDoTopo(
        searchable(
          user.is_platform_admin && !user.support,
          activeOrg?.role ?? null,
          activeOrg?.interface_settings,
          activeOrg?.modulos_ligados ?? [],
          activeOrg?.capacidades_ligadas ?? [],
        ),
      ),
    [
      user.is_platform_admin,
      user.support,
      activeOrg?.role,
      activeOrg?.interface_settings,
      activeOrg?.modulos_ligados,
      activeOrg?.capacidades_ligadas,
    ],
  );

  // O painel fica aberto "nesta tela": trocar de tela fecha sem precisar de efeito
  // (estado derivado, e não setState dentro de useEffect).
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const maisAberto = abertoEm === pathname;
  const ancoraDoMais = useRef<HTMLDivElement>(null);

  // Clique fora ou Esc fecham o painel.
  useEffect(() => {
    if (!maisAberto) return;
    const aoClicar = (e: MouseEvent) => {
      if (ancoraDoMais.current && !ancoraDoMais.current.contains(e.target as Node)) setAbertoEm(null);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbertoEm(null);
    };
    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [maisAberto]);

  return (
    <header
      data-testid="menu-do-topo"
      className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur md:flex"
    >
      <MarcaNoTopo />
      <TenantSwitcher />
      <nav aria-label={t("Menu principal")} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
        {menu.topo.map((item) => {
          const ativo = itemAtivo(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors",
                ativo
                  ? "bg-accent-soft font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-accent-soft hover:text-foreground",
              )}
            >
              {t(item.rotulo)}
              {item.contador === "fila" && <ContadorDaFila compacto={false} />}
            </Link>
          );
        })}
      </nav>
      {menu.mais.length > 0 && (
        <div ref={ancoraDoMais} className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={maisAberto}
            onClick={() => setAbertoEm((v) => (v === pathname ? null : pathname))}
            className={cn(
              "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm transition-colors",
              maisAberto ? "bg-accent-soft text-foreground" : "text-muted-foreground hover:bg-accent-soft hover:text-foreground",
            )}
          >
            {t("Mais")}
            <CaretDown size={14} aria-hidden />
          </button>
          {maisAberto && (
            <PainelMais grupos={menu.mais} pathnameAtual={pathname} onNavegar={() => setAbertoEm(null)} />
          )}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2">
        <div className="w-56">
          <SearchTrigger />
        </div>
        <AlertsBell />
        <AvisoDePropostaEmDestaque />
        <UserMenu />
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-menu-do-topo-tela.test.tsx
```
Expected: PASS (3 testes). Se o nome acessível de algum link vier com espaço extra (por causa do contador mockado), o `textContent` do teste continua igual porque o mock renderiza `null`.

- [ ] **Step 7: Commit**

```bash
git add components/escale/menu tests/unit/escale-menu-do-topo-tela.test.tsx
git commit -m "feat(escale): barra do topo com os 9 itens e o painel Mais

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Botão flutuante de conversas

**Files:**
- Create: `components/escale/ConversasFlutuante.tsx`, `tests/unit/escale-conversas-flutuante.test.tsx`

**Interfaces:**
- Consumes: `apiClient.get<T>(path)` (`@/lib/api/client`); `GET /api/v1/conversations?limit=5&exclude_finished=true` → `{ data: Conversa[] }` com `id`, `last_message_preview`, `unread_count_for_assignee`, `contacts: { display_name, name } | null`; `ContadorDaFila({ compacto })`.
- Produces: `ConversasFlutuante({ reservaDoRodape }: { reservaDoRodape: number })`.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-conversas-flutuante.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let caminho = "/app/kanban";
vi.mock("next/navigation", () => ({ usePathname: () => caminho }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));
vi.mock("@/components/shell/ContadorDaFila", () => ({ ContadorDaFila: () => null }));

import { apiClient } from "@/lib/api/client";
import { ConversasFlutuante } from "@/components/escale/ConversasFlutuante";

function renderizar(reserva = 0) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConversasFlutuante reservaDoRodape={reserva} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  caminho = "/app/kanban";
  vi.mocked(apiClient.get).mockReset();
});

describe("<ConversasFlutuante>", () => {
  it("só busca quando abre, e lista contato, prévia e não lidas", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        {
          id: "c-1",
          last_message_preview: "Tem CNO aberto já",
          unread_count_for_assignee: 2,
          contacts: { display_name: "Marcos Teixeira", name: null },
        },
      ],
    });
    const user = userEvent.setup();
    renderizar();
    expect(apiClient.get).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Conversas recentes" }));
    expect(await screen.findByText("Marcos Teixeira")).toBeInTheDocument();
    expect(screen.getByText("Tem CNO aberto já")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Marcos Teixeira/ })).toHaveAttribute("href", "/app/inbox/c-1");
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/conversations?limit=5&exclude_finished=true");
  });

  it("sem conversa, diz que não há", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    const user = userEvent.setup();
    renderizar();
    await user.click(screen.getByRole("button", { name: "Conversas recentes" }));
    expect(await screen.findByText("Nenhuma conversa ainda.")).toBeInTheDocument();
  });

  it("não aparece dentro de Conversas, onde seria repetição", () => {
    caminho = "/app/inbox/c-1";
    renderizar();
    expect(screen.queryByRole("button", { name: "Conversas recentes" })).toBeNull();
  });

  it("sobe acima de peça fixa do rodapé", () => {
    const { container } = renderizar(80);
    expect((container.firstElementChild as HTMLElement).style.bottom).toBe("calc(1rem + 80px)");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-conversas-flutuante.test.tsx
```
Expected: FAIL — `Failed to resolve import "@/components/escale/ConversasFlutuante"`.

- [ ] **Step 3: Implementar**

Create `components/escale/ConversasFlutuante.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ContadorDaFila } from "@/components/shell/ContadorDaFila";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { ChatCircle } from "@/lib/ui/icons";

interface ConversaResumo {
  id: string;
  last_message_preview: string | null;
  unread_count_for_assignee: number | null;
  contacts: { display_name: string | null; name: string | null } | null;
}

/**
 * Botão flutuante (canto inferior direito, md+) com as 5 conversas mais recentes,
 * como o da Clint. Só busca quando abre. Não aparece dentro de Conversas.
 * `reservaDoRodape` vem do AppShell (painel de chamada etc.) para não ficar por baixo.
 */
export function ConversasFlutuante({ reservaDoRodape }: { reservaDoRodape: number }) {
  const t = useT();
  const pathname = usePathname() ?? "/app";
  // Aberto "nesta tela": trocar de tela fecha sem setState dentro de useEffect.
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === pathname;
  const ancora = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["escale", "conversas-recentes"],
    queryFn: async () =>
      (await apiClient.get<{ data: ConversaResumo[] }>("/api/v1/conversations?limit=5&exclude_finished=true")).data,
    enabled: aberto,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (e: MouseEvent) => {
      if (ancora.current && !ancora.current.contains(e.target as Node)) setAbertoEm(null);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbertoEm(null);
    };
    document.addEventListener("mousedown", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  if (pathname === "/app/inbox" || pathname.startsWith("/app/inbox/")) return null;

  return (
    <div
      ref={ancora}
      className="fixed right-4 z-40 hidden md:block"
      style={{ bottom: `calc(1rem + ${reservaDoRodape}px)` }}
    >
      {aberto && (
        <div
          role="dialog"
          aria-label={t("Conversas recentes")}
          className="absolute bottom-16 right-0 w-80 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-lg"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold">{t("Conversas recentes")}</h2>
            <Link href="/app/inbox" className="text-sm text-primary hover:underline">
              {t("Abrir Conversas")}
            </Link>
          </div>
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{t("Carregando…")}</p>
          ) : isError ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{t("Não consegui carregar as conversas.")}</p>
          ) : !data || data.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{t("Nenhuma conversa ainda.")}</p>
          ) : (
            <ul>
              {data.map((c) => {
                const naoLidas = c.unread_count_for_assignee ?? 0;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/app/inbox/${c.id}`}
                      className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent-soft"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {c.contacts?.display_name || c.contacts?.name || t("Sem nome")}
                        </span>
                        <span className="block truncate text-sm text-muted-foreground">
                          {c.last_message_preview || t("Sem mensagem")}
                        </span>
                      </span>
                      {naoLidas > 0 && (
                        <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums">
                          {naoLidas}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <button
        type="button"
        aria-label={t("Conversas recentes")}
        aria-expanded={aberto}
        onClick={() => setAbertoEm((v) => (v === pathname ? null : pathname))}
        className="relative grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-accent-hover"
      >
        <ChatCircle size={22} aria-hidden />
        <span className="absolute -right-1 -top-1">
          <ContadorDaFila compacto={false} />
        </span>
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-conversas-flutuante.test.tsx
```
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add components/escale/ConversasFlutuante.tsx tests/unit/escale-conversas-flutuante.test.tsx
git commit -m "feat(escale): botão flutuante com as conversas recentes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Encaixar na casca do app

**Files:**
- Modify: `app/app/_components/AppShell.tsx`, `app/app/layout.tsx`
- Test: `tests/unit/escale-tema.test.ts` (acrescentar 1 teste de encaixe)

**Interfaces:**
- Consumes: `PreferenciaDeMenu`, `COOKIE_DO_MENU`, `lerPreferenciaDeMenu` (Task 2); `MenuDoTopo` (Task 4); `ConversasFlutuante` (Task 5).
- Produces: prop opcional `menu?: PreferenciaDeMenu` no `AppShell` (padrão `"lateral"` — quem já monta o AppShell sem a prop continua igual); atributo `data-escale-casca` na raiz da casca quando `menu === "topo"`.

- [ ] **Step 1: Escrever o teste de encaixe (vai falhar)**

Acrescente ao fim do `describe("tema Escale", ...)` em `tests/unit/escale-tema.test.ts` (antes do `});` final):

```ts
  it("a casca põe o marcador do tema só no modo topo, e o layout lê a chave do cookie", () => {
    const shell = readFileSync(join(RAIZ, "app", "app", "_components", "AppShell.tsx"), "utf8");
    const layoutApp = readFileSync(join(RAIZ, "app", "app", "layout.tsx"), "utf8");
    expect(shell).toContain('data-escale-casca={menu === "topo" ? "" : undefined}');
    expect(shell).toContain("<MenuDoTopo />");
    expect(layoutApp).toContain("lerPreferenciaDeMenu(store.get(COOKIE_DO_MENU)?.value)");
    expect(layoutApp).toContain("menu={menu}");
  });
```

```bash
corepack pnpm vitest run tests/unit/escale-tema.test.ts
```
Expected: FAIL — `expected '…' to contain 'data-escale-casca=…'`.

- [ ] **Step 2: AppShell — imports e prop**

Em `app/app/_components/AppShell.tsx`, troque:

```ts
import { estiloDaReserva, useOcupacaoDoRodape } from "@/lib/ui/rodape-ocupado";
```

por:

```ts
import { estiloDaReserva, useOcupacaoDoRodape } from "@/lib/ui/rodape-ocupado";
// Fork Escale: casca nova (menu no topo + tema), ligada por pessoa.
import { MenuDoTopo } from "@/components/escale/menu/MenuDoTopo";
import { ConversasFlutuante } from "@/components/escale/ConversasFlutuante";
import type { PreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
```

Troque:

```ts
interface AppShellProps {
  sidebarCollapsed: boolean;
```

por:

```ts
interface AppShellProps {
  sidebarCollapsed: boolean;
  /** Fork Escale: `"topo"` liga a casca nova (cookie `escale_menu`). Padrão: a lateral do original. */
  menu?: PreferenciaDeMenu;
```

Troque:

```ts
export function AppShell({ sidebarCollapsed, podeAtender, children }: AppShellProps) {
```

por:

```ts
export function AppShell({ sidebarCollapsed, podeAtender, menu = "lateral", children }: AppShellProps) {
```

- [ ] **Step 3: AppShell — lateral × topo**

Troque:

```tsx
    <div className="flex min-h-dvh w-full bg-background">
      <BarraDeProgressoNavegacao />
      <div className="hidden md:block">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>
```

por:

```tsx
    <div
      className="flex min-h-dvh w-full bg-background"
      data-escale-casca={menu === "topo" ? "" : undefined}
    >
      <BarraDeProgressoNavegacao />
      {menu === "lateral" && (
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>
      )}
```

Troque (é a única ocorrência no arquivo):

```tsx
        <TopBar />
```

por:

```tsx
        {menu === "topo" ? (
          <>
            <MenuDoTopo />
            {/* No celular a casca nova usa a barra de sempre (gaveta + barra inferior). */}
            <div className="md:hidden">
              <TopBar />
            </div>
          </>
        ) : (
          <TopBar />
        )}
```

Troque:

```tsx
      <BarraInferior />
    </div>
  );
```

por:

```tsx
      {menu === "topo" && <ConversasFlutuante reservaDoRodape={ocupacaoDoRodape} />}
      <BarraInferior />
    </div>
  );
```

- [ ] **Step 4: Layout do app — ler a chave**

Em `app/app/layout.tsx`, troque:

```ts
import { acessoFoiRevogado } from "@/lib/auth/vinculo-revogado";
```

por:

```ts
import { acessoFoiRevogado } from "@/lib/auth/vinculo-revogado";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
```

Troque:

```ts
  const collapsed = store.get("sidebar_collapsed")?.value === "1";
```

por:

```ts
  const collapsed = store.get("sidebar_collapsed")?.value === "1";
  // Fork Escale: casca nova por pessoa (GET /app/escale/menu?usar=topo|lateral).
  const menu = lerPreferenciaDeMenu(store.get(COOKIE_DO_MENU)?.value);
```

Troque:

```tsx
          sidebarCollapsed={collapsed}
```

por:

```tsx
          sidebarCollapsed={collapsed}
          menu={menu}
```

- [ ] **Step 5: Rodar os testes da fase e o typecheck**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm vitest run tests/unit/escale-tema.test.ts tests/unit/escale-preferencia-de-menu.test.ts tests/unit/escale-menu-do-topo.test.ts tests/unit/escale-menu-do-topo-tela.test.tsx tests/unit/escale-conversas-flutuante.test.tsx
corepack pnpm typecheck
```
Expected: 5 arquivos PASS; typecheck sem erros.

- [ ] **Step 6: Commit**

```bash
git add app/app/_components/AppShell.tsx app/app/layout.tsx tests/unit/escale-tema.test.ts
git commit -m "feat(escale): a casca troca entre a lateral e o menu do topo pela chave da pessoa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Gates do repositório e PR

**Files:** nenhum novo (correções só se um gate apontar defeito desta branch).

- [ ] **Step 1: Lint e réguas do repositório**

```bash
corepack pnpm lint 2>&1 | tail -5
corepack pnpm lint:channels && corepack pnpm lint:role-rank
```
Expected: `0 errors` no lint (avisos antigos existem); as duas réguas `ok`.

- [ ] **Step 2: Suíte unitária, comparada com a main**

```bash
corepack pnpm test:unit > /tmp/unit-fase0.log 2>&1; grep -E "Test Files|Tests  " /tmp/unit-fase0.log
grep -E "^ ❯ \|[a-z]+\| " /tmp/unit-fase0.log | sed -E 's/^ ❯ \|[a-z]+\| ([^ ]+) .*/\1/' | sort -u > /tmp/falhas-fase0.txt; cat /tmp/falhas-fase0.txt
```
Expected: nenhum arquivo `escale-*` na lista. Para cada arquivo da lista, rode-o isolado; se continuar falhando, confira se falha também em `escale-crm/main` (worktree limpa em `C:\tmp`, sem espaço no caminho — receita na memória `sincronizar-com-o-rafael`). Só é defeito desta branch o que passa na main e falha aqui; corrija esse e faça um commit `fix(escale): …`.

- [ ] **Step 3: Push e PR**

```bash
git push -u escale-crm feat/fase-0-casca-escale
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-0-casca-escale \
  --title "feat(escale): Fase 0 — casca nova (identidade Escale + menu no topo + conversas flutuantes)" --body-file - <<'EOF'
## O que é
A casca nova do Escale IA OS, **desligada para todo mundo** até alguém ligar para si:
- **Identidade Escale:** cores do site escaleia.com (azul de ação, fundo branco-azulado, laranja reservado à IA, atenção em amarelo) e fontes Figtree + JetBrains Mono — `app/escale-tema.css`, que só vale com a casca ligada.
- **Menu no topo** (modelo V1 da Clint): Negócios, Conversas, Contatos, Empresas, Atividades, Agenda, Agentes IA, Automações, Indicadores e **Mais** (todas as outras telas, por grupo). Permissões: as mesmas da lateral.
- **Botão flutuante** com as 5 conversas mais recentes.

## Como ligar / desligar (por pessoa)
- Ligar: abrir `https://app.escaleia.com/app/escale/menu?usar=topo`
- Desligar: "Voltar ao menu lateral", no rodapé do painel **Mais** (ou `…/app/escale/menu?usar=lateral`).
- Para ligar para todos depois de aprovado: `MENU_PADRAO = "topo"` em `lib/escale/preferencia-de-menu.ts`.

## Onde toca o original
Só encaixes: 1 import em `app/layout.tsx`, 3 linhas em `app/app/layout.tsx`, a troca lateral × topo em `AppShell.tsx` e 10 textos no `dicionario.ts` (bloco do fork). Sem migration.

## Verificação
- [ ] Testes novos (`tests/unit/escale-*`) verdes, typecheck e lint sem erro
- [ ] `imagem-do-app-sobe` verde no CI (prova o build com o CSS e a fonte nova)
- [ ] Depois de publicar: ligar a chave, conferir topo, Mais, logo/nome, cores nos temas claro e escuro, botão flutuante; desligar e ver tudo como antes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

- [ ] **Step 4: Acompanhar o CI**

```bash
gh pr checks --repo rgisjr/escale-crm --watch
```
Expected: todos verdes, em especial `imagem-do-app-sobe (amd64…)` — é ele que prova que o `next build` aceita o CSS e o `.woff2` novos. Se falhar, investigar com superpowers:systematic-debugging antes de mexer.

- [ ] **Step 5: Entregar ao usuário**

Informar o link do PR e como ligar a casca. **Não mergear e não publicar:** merge, release e atualização da VPS são decisões do usuário (a atualização da VPS ele roda à mão — o modo automático bloqueia).
