# Casca igual à Clint — V1: Fundação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** criar a fundação visual da casca nova igual à Clint (variante com menu superior), sem mexer em nenhuma tela ainda:
- **tokens da casca** (`casca-*`): cores, raios e sombra medidos nos prints da Clint. Valem só com a casca ligada;
- **fonte Poppins** (400, 500 e 600) no lugar da "Escale Figtree" da casca;
- **ícones da casca** (`lib/ui/icons-da-casca.ts`, lucide);
- **períodos** (`lib/escale/ui/periodos.ts`, puro): atalhos Hoje…Esse ano, grade do mês com a semana começando no domingo;
- **seis componentes** em `components/escale/ui/`: `BotaoDaCasca`, `GatilhoDeFiltro`, `PainelSuspenso`, `CaixaDaCasca`, `SeletorDaCasca` e `CalendarioDePeriodo`.

As telas reais (topo, painel esquerdo, quadro) chegam na V2, na V3 e na V4, que consomem o que este plano cria.

**Architecture:**
- **Tokens:** cada token mora em três lugares:
  - no `:root` do `app/globals.css` (arquivo do original), com um fallback que é SEMPRE um token do próprio original (`var(--color-text)`…);
  - na ponte `@theme inline` (é o que gera `text-casca-texto`, `rounded-casca-gatilho`, `shadow-casca-painel`);
  - com o valor real em `app/escale-tema.css`, dentro de `body:has([data-escale-casca])` e do bloco escuro correspondente.

  Sem a casca, um utilitário `casca-*` pinta uma cor que o original já tinha. Os tons da marca (`casca-marca*`, `casca-dia`) são `var(--color-accent)` e `color-mix` declarados NO `body`, no mesmo elemento em que a marca da organização (`body:has([data-marca-org])`, injetada depois) redefine `--color-accent`. Assim vale a cor da marca da organização.
- **Componentes:** são todos do fork (`components/escale/ui/`). Botões e caixinha são `<button>` nativos (a cerca `controle-decorativo` vigia o `<Button>` do original, não estes). O painel usa o Popover do Radix que o original já tem. Não entra nenhum `<select>` nem `<input type="date">`. Todo texto visível passa por `t()`, com o espanhol num bloco do fork em `lib/i18n/dicionario.ts`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito (`noUncheckedIndexedAccess`), Tailwind 4 (config em CSS), Radix Popover, `lucide-react` 1.52 (já é dependência), `date-fns` 4.4 (já é dependência), Vitest 4 + Testing Library + user-event.

**Referência visual (abra os PNGs com a ferramenta Read; a ficha sozinha não basta):**
- Na pasta Deskcom CRM (fonte) e, depois da Task 1, também no repositório em `docs/escale/clint/`:
  - `clint-design-system.md`: valores exatos, já em px de CSS;
  - `clint-telas.md`: mede em px do PRINT. Divida por 1,25;
  - `contrato-casca-igual-a-clint.md`: os nomes que este plano produz;
  - `inventario-escale.md`: o nosso código e as cercas;
  - `crops/`: recortes ampliados. Os que esta fase usa são `datatabs.png`, `essasemana.png` e `filterbar.png`;
  - `prints-do-usuario/2026-10-15-filtro-data-aberto.png` (o calendário aberto) e `prints-do-usuario/2026-10-15-barra-de-filtros.png` (a barra, com hover em "Dono do negócio"). O `2026-10-15-escale-atual.png` é o NOSSO app de hoje e não serve de referência.
- Captura da Clint: `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-010-kanban-v1.png`.

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- Remotes:
  - `escale-crm` = `https://github.com/rgisjr/escale-crm.git` (o nosso);
  - `origin` = `https://github.com/melgarafael/DeskcommCRM.git` (o do Rafael).
- **Base:** `escale-crm/main` **com a Fase 1D mergeada** (merge `401860911`, PR #12). Se `git merge-base --is-ancestor 401860911 escale-crm/main` falhar, PARE e pergunte ao usuário.
- **Branch:** `feat/casca-clint-v1-fundacao`.
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:**
  - dar push em `origin`;
  - mergear;
  - publicar tag ou release;
  - mexer na VPS ou no banco (esta fase não tem migration).

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e sempre `corepack pnpm` (nunca `pnpm` direto).
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- Todo comando roda da raiz do repositório: `cd "/c/Documentos/projetos claude/Deskcom CRM/repo"`.

### Convenções do fork

- Código novo mora em arquivo só do fork: `components/escale/ui/`, `lib/escale/ui/`, `lib/ui/icons-da-casca.ts` e `app/escale-tema.css`.
- Arquivos do original recebem só encaixes, sempre com o comentário `FORK ESCALE · casca Clint V1`:
  - `app/globals.css`: um bloco no fim do `:root` e um bloco no fim do `@theme inline`. Eles passam de 10 linhas porque a cerca `tailwind-tokens` exige token no `:root` + ponte no `@theme`. É a exceção que o `CLAUDE.md` prevê ("crie o token do jeito que a cerca aceita"). Os blocos ficam contíguos e no fim de cada bloco, para o merge semanal com o Rafael não conflitar;
  - `lib/i18n/dicionario.ts`: um bloco, inserido logo ANTES da linha `  // ─── FORK ESCALE · filtros do quadro (Fase 1D`;
  - `app/fonts/README.md` e `app/fonts/OFL.txt`: uma linha cada.
- **Não mexer** em `lib/ui/icons.ts` (Phosphor), em `components/ui/*` nem no `[data-theme="light"]`/`[data-theme="dark"]` do `globals.css`.

### Cercas que este plano respeita (leia antes de editar)

- `tests/unit/tailwind-tokens.test.ts`:
  - todo `var()` da ponte existe no `:root`;
  - todo utilitário de cor usado tem ponte;
  - proibido usar `rounded` puro, `shadow` puro, `outline-none` (use `outline-hidden`) e `flex-shrink/grow` (use `shrink`/`grow`);
  - `text-<token>/<alfa>` precisa de contraste 4,5:1. **Não use alfa em cor de texto da casca.**
- `tests/unit/branding-tema-claro-escopavel.test.ts`: o `[data-theme="light"]` cobre EXATAMENTE o que o `[data-theme="dark"]` cobre, e cada declaração fica numa linha só. Por isso os tokens da casca NÃO entram em nenhum dos dois blocos do original. O escuro da casca mora no `escale-tema.css`.
- `tests/unit/branding-pares-pintados.test.ts` (`PARES_DE_HOJE = { claro: 18, escuro: 26 }`) e `extrairRegua` (`lib/branding/contraste.ts`):
  - todo token do `:root` cujo valor seja `var(--color-accent-NNN)` vira um "par" novo e quebra a contagem;
  - o mesmo vale para nome terminado em `-soft` ou `-fg`.

  Por isso, no `:root`, os fallbacks da casca usam só referência INDIRETA (`var(--color-accent)`, `var(--color-accent-soft)`, `var(--color-accent-hover)`) e nenhum nome termina em `-soft`/`-fg`.
- `tests/unit/escale-tema.test.ts`:
  - os blocos claro e escuro da casca são lidos da primeira ocorrência do seletor até a primeira `}`. Nunca escreva `}` nem `--algo:` dentro de comentário nesses blocos;
  - o teste exige as URLs de `@font-face` e que os arquivos existam. A Task 3 atualiza esse teste.
- `tests/unit/controle-decorativo.test.ts`: vigia `<Button>`. Os componentes da casca não usam `<Button>`.
- `tests/unit/selecao-longa-tem-busca.test.ts`: casa o TEXTO `<select …>…</select>` e `<SelectContent>…`. **Não escreva `<select` nem em comentário.**
- `tests/unit/i18n-espanhol-cobre-a-tela.test.ts`:
  - todo texto em português na tela passa por `t()` com literal ou com tabela `const` do mesmo arquivo (`t(TABELA[chave])`);
  - **nunca `t(<parâmetro>)`**, porque a cerca de "dado do operador" reprova. Rótulo que vem de quem chama (`rotulo`, `grupo`, `vazio`) é renderizado como veio, sem `t()`;
  - datas formatadas pelo date-fns usam `useLocaleDeData()` (`hooks/i18n/useLocaleDeData.ts`). Nunca importe `date-fns/locale`.
- `eslint` (`react-hooks` 7): nada de `new Date()` solto no corpo do componente. Use o inicializador do `useState` ou um handler.
- `tailwind-merge` 3 (`cn`): ele NÃO reconhece `rounded-casca-*` e `shadow-casca-*` como conflito de `rounded-md`/`shadow-md`. Por isso o `PainelSuspenso` é montado direto no primitivo do Radix, e não por cima do `PopoverContent` (que fixa `rounded-md shadow-md`).

### Regras de produto

- **REGRA DO PRODUTO (`CLAUDE.md` da pasta Deskcom CRM): tudo idêntico à Clint, conferindo os prints. Só a marca é nossa.** Onde a Clint usa o roxo (`#6C19DE`, `#7C00FF`), entra a cor da marca da organização (`casca-marca*`) no mesmo lugar e com o mesmo peso.
- **Sem print, não se inventa.**
  - Os nomes das 4 abas de tipo de data ("Data de criação", "Data de ganho", "Data de perda", "Data agendada") ficam como estão até chegar o print nº 24 do plano-índice.
  - O mesmo vale para o estado de "intervalo selecionado" e para o hover das abas.
- **Escuro:** a Clint escura nunca foi vista (não há print). Os valores escuros da casca são DERIVADOS da paleta escura que a casca já tem no `escale-tema.css`. Não foram copiados de lugar nenhum.
- **Datas:** sempre `dd/mm/aaaa` na tela. Internamente `AAAA-MM-DD`, montado com o calendário LOCAL (nunca `toISOString`).

### Commits, PR e testes

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- O corpo do PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Falhas que não são regressão:** testes que falham NESTA máquina Windows e também em `escale-crm/main`:
  - pdfjs com caminho `C:\…`;
  - `spawnSync bash ENOENT`;
  - `chmod 600`;
  - caminho com espaço;
  - `EPERM` em pasta temporária.

  Ver a memória `sincronizar-com-o-rafael`. Regressão é teste que passa em `escale-crm/main` e falha na branch.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `docs/superpowers/plans/2026-10-16-casca-clint-v1-fundacao.md` | novo | este plano |
| `docs/superpowers/plans/2026-10-16-contrato-casca-igual-a-clint.md` | novo | o contrato dos 4 planos |
| `docs/escale/clint/**` | novo | design system, telas, inventário, contrato, recortes e prints do usuário |
| `app/globals.css` | alterado (2 blocos do fork) | tokens da casca no `:root` (fallback) e na ponte `@theme inline` |
| `app/escale-tema.css` | alterado | valores reais da casca (claro e escuro), Poppins no lugar da Figtree |
| `tests/unit/escale-casca-tokens.test.ts` | novo | tokens existem, têm ponte, fallback do original, escopo da casca |
| `app/fonts/poppins-400-latin.woff2` | novo | Poppins Regular (Google Fonts, OFL) |
| `app/fonts/poppins-500-latin.woff2` | novo | Poppins Medium |
| `app/fonts/poppins-600-latin.woff2` | novo | Poppins SemiBold |
| `app/fonts/figtree-300-900-latin.woff2` | removido | a casca não usa mais |
| `app/fonts/README.md` | alterado (1 linha) | origem da Poppins |
| `app/fonts/OFL.txt` | alterado (1 linha) | copyright da Poppins |
| `tests/unit/escale-tema.test.ts` | alterado | 4 URLs de fonte e a Poppins nos 3 pesos |
| `lib/ui/icons-da-casca.ts` | novo | ícones lucide da casca |
| `tests/unit/escale-ui-icones-da-casca.test.tsx` | novo | os nomes do contrato existem e desenham |
| `lib/escale/ui/periodos.ts` | novo | atalhos, grade do mês, datas `AAAA-MM-DD` ↔ `dd/mm/aaaa` |
| `tests/unit/escale-ui-periodos.test.ts` | novo | datas fixas, domingo, viradas de mês e ano |
| `lib/i18n/dicionario.ts` | alterado (bloco do fork) | espanhol dos textos novos |
| `components/escale/ui/BotaoDaCasca.tsx` | novo | marca / novo / texto / ícone |
| `tests/unit/escale-ui-botao-da-casca.test.tsx` | novo | |
| `components/escale/ui/PainelSuspenso.tsx` | novo | painel do Popover no visual da Clint |
| `tests/unit/escale-ui-painel-suspenso.test.tsx` | novo | |
| `components/escale/ui/GatilhoDeFiltro.tsx` | novo | Data / Campos / Tags / Dono / Status / Mais filtros |
| `tests/unit/escale-ui-gatilho-de-filtro.test.tsx` | novo | |
| `components/escale/ui/CaixaDaCasca.tsx` | novo | checkbox próprio (`role="checkbox"`) |
| `tests/unit/escale-ui-caixa-da-casca.test.tsx` | novo | |
| `components/escale/ui/SeletorDaCasca.tsx` | novo | seletor próprio (combobox/listbox), com busca a partir de 8 |
| `tests/unit/escale-ui-seletor-da-casca.test.tsx` | novo | |
| `components/escale/ui/CalendarioDePeriodo.tsx` | novo | o "Data" da Clint: abas de tipo, atalhos, 2 meses |
| `tests/unit/escale-ui-calendario-de-periodo.test.tsx` | novo | |

Arquivos TEMPORÁRIOS da Task 13 (`app/vitrine-casca/page.tsx` e `app/vitrine-casca/_client.tsx`): criados só para a conferência visual e **apagados antes do commit. Nunca entram no repositório.**

---

### Task 1: Branch, plano, contrato e a pasta da Clint no repositório

**Files:**
- Create: `docs/superpowers/plans/2026-10-16-casca-clint-v1-fundacao.md` (cópia deste plano), `docs/superpowers/plans/2026-10-16-contrato-casca-igual-a-clint.md` (cópia do contrato), `docs/escale/clint/**` (cópia da pasta `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\`, inclusive `prints-do-usuario/` e `crops/`)

**Interfaces:**
- Consumes: nada.
- Produces: a branch `feat/casca-clint-v1-fundacao` e as referências dentro do repositório. Executores de outras sessões (V2 a V4) leem `docs/escale/clint/` e o contrato em `docs/superpowers/plans/`.

- [ ] **Step 1: Conferir a base e criar a branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git merge-base --is-ancestor 401860911 escale-crm/main && echo "1D na main"
```
Expected: `1D na main`. Sem essa linha, PARE: a Fase 1D ainda não está na `main`. Pergunte ao usuário.

```bash
git switch -c feat/casca-clint-v1-fundacao escale-crm/main
```

- [ ] **Step 2: Copiar o plano, o contrato e a pasta da Clint**

```bash
mkdir -p docs/superpowers/plans docs/escale
cp "../docs/superpowers/plans/2026-10-16-casca-clint-v1-fundacao.md" docs/superpowers/plans/
cp "../docs/clint/contrato-casca-igual-a-clint.md" docs/superpowers/plans/2026-10-16-contrato-casca-igual-a-clint.md
cp -r "../docs/clint" docs/escale/clint
ls docs/escale/clint docs/escale/clint/prints-do-usuario
```
Expected:
- em `docs/escale/clint`: `clint-design-system.md`, `clint-telas.md`, `contrato-casca-igual-a-clint.md`, `crops`, `inventario-escale.md` e `prints-do-usuario`;
- em `prints-do-usuario`: `2026-10-15-barra-de-filtros.png`, `2026-10-15-escale-atual.png` e `2026-10-15-filtro-data-aberto.png`.

- [ ] **Step 3: Conferir que as duas cópias do contrato já trazem as mudanças da V1**

O contrato da pasta `docs/clint/` já foi atualizado com tudo o que este plano muda (seção "Mudanças no contrato", no fim deste plano). Não acrescente nada nele: só confira.

```bash
grep -c "Mudanças feitas pela V1" docs/superpowers/plans/2026-10-16-contrato-casca-igual-a-clint.md docs/escale/clint/contrato-casca-igual-a-clint.md
grep -c "Conferência visual (regra única" docs/superpowers/plans/2026-10-16-contrato-casca-igual-a-clint.md docs/escale/clint/contrato-casca-igual-a-clint.md
```
Expected: um número ≥ 1 para cada arquivo, nos dois comandos. Com `0`, a cópia veio de uma versão velha do contrato: PARE e pergunte ao usuário.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-10-16-casca-clint-v1-fundacao.md docs/superpowers/plans/2026-10-16-contrato-casca-igual-a-clint.md docs/escale/clint
git commit -m "docs(escale): plano V1 da casca igual à Clint, contrato e referências da Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Os tokens da casca

**Files:**
- Create: `tests/unit/escale-casca-tokens.test.ts`
- Modify: `app/globals.css` (bloco do fork no fim do `:root` e no fim do `@theme inline`), `app/escale-tema.css` (tokens nos blocos claro e escuro da casca; a fonte muda na Task 3)

**Interfaces:**
- Consumes: os tokens do original (`--color-text`, `--color-text-muted`, `--color-text-subtle`, `--color-border`, `--color-border-strong`, `--color-surface-elevated`, `--color-accent`, `--color-accent-soft`, `--color-accent-hover`, `--color-error`).
- Produces (utilitários Tailwind que V2 a V4 usam):
  - cores: `text-|bg-|border-|ring-` + `casca-texto`, `casca-texto-2`, `casca-suave`, `casca-meta`, `casca-sobrelinha`, `casca-borda`, `casca-raia`, `casca-caixa-msg`, `casca-borda-msg`, `casca-busca`, `casca-contador`, `casca-cinza-selo`, `casca-dia`, `casca-marca`, `casca-marca-forte`, `casca-marca-suave`, `casca-marca-media`, `casca-novo`, `casca-alerta` e `casca-escuro`;
  - os cinco acrescentados por esta fase: `casca-chevron`, `casca-divisoria`, `casca-seta`, `casca-caixa` e `casca-caixa-borda`;
  - raios: `rounded-casca-gatilho` (6px), `rounded-casca-card` (10px) e `rounded-casca-raia` (16px);
  - sombra: `shadow-casca-painel`.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-casca-tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * OS TOKENS DA CASCA IGUAL À CLINT (fork Escale, V1).
 *
 * Cada token `casca-*` mora em três lugares:
 *  1. `:root` do `globals.css`, com um fallback que é SEMPRE um token do
 *     original — sem a casca, o utilitário pinta uma cor que já existia;
 *  2. a ponte `@theme inline`, que é o que faz o Tailwind gerar a classe;
 *  3. o valor de verdade no `escale-tema.css`, só dentro de
 *     `body:has([data-escale-casca])` (e do bloco escuro dele).
 *
 * Os valores claros são os do contrato
 * (docs/superpowers/plans/2026-10-16-contrato-casca-igual-a-clint.md), medidos
 * nos prints da Clint. O escuro da Clint nunca foi visto: aqui só se exige que
 * ele exista e seja legível.
 */
const RAIZ = join(__dirname, "..", "..");
const GLOBAIS = readFileSync(join(RAIZ, "app", "globals.css"), "utf8").replace(/\r\n/g, "\n");
const TEMA = readFileSync(join(RAIZ, "app", "escale-tema.css"), "utf8").replace(/\r\n/g, "\n");

const CLARO_DA_CASCA = "body:has([data-escale-casca])";
const ESCURO_DA_CASCA = '[data-theme="dark"] body:has([data-escale-casca])';

const CORES: Record<string, string> = {
  "--color-casca-texto": "#2f2c5d",
  "--color-casca-texto-2": "#3e3a6f",
  "--color-casca-suave": "#686d86",
  "--color-casca-meta": "#8c89b0",
  "--color-casca-sobrelinha": "#828282",
  "--color-casca-borda": "#e8e4f5",
  "--color-casca-raia": "#eff3ff",
  "--color-casca-caixa-msg": "#eff6ff",
  "--color-casca-borda-msg": "#e3ebff",
  "--color-casca-busca": "#f6f8ff",
  "--color-casca-contador": "#e8e4f5",
  "--color-casca-cinza-selo": "#e0e0e0",
  "--color-casca-novo": "#597eff",
  "--color-casca-alerta": "#ff4b4c",
  "--color-casca-escuro": "#2f2c5d",
  "--color-casca-chevron": "#7489a8",
  "--color-casca-divisoria": "#ebebeb",
  "--color-casca-seta": "#cccccc",
  "--color-casca-caixa": "#dfe2fd",
  "--color-casca-caixa-borda": "#d5dcff",
  "--color-casca-marca": "var(--color-accent)",
  "--color-casca-marca-forte": "color-mix(in oklab, var(--color-accent) 85%, black)",
  "--color-casca-marca-suave": "color-mix(in oklab, var(--color-accent) 8%, white)",
  "--color-casca-marca-media": "color-mix(in oklab, var(--color-accent) 18%, white)",
  "--color-casca-dia": "color-mix(in oklab, var(--color-accent) 4%, white)",
};
const RAIOS: Record<string, string> = {
  "--radius-casca-gatilho": "6px",
  "--radius-casca-card": "10px",
  "--radius-casca-raia": "16px",
};
const SOMBRA = "--shadow-casca-painel";
const SOMBRA_CLARA = "0 8px 16px rgb(17 24 39 / 0.1), 0 0 1px rgb(17 24 39 / 0.3)";
const TODOS = [...Object.keys(CORES), ...Object.keys(RAIOS), SOMBRA];
const TONS_DA_MARCA = [
  "--color-casca-marca",
  "--color-casca-marca-forte",
  "--color-casca-marca-suave",
  "--color-casca-marca-media",
  "--color-casca-dia",
];

/** Bloco do globals.css com o seletor sozinho na linha — o critério de branding-tema-claro-escopavel. */
function blocoDoGlobais(seletor: string): Map<string, string> {
  const linhas = GLOBAIS.split("\n");
  const inicio = linhas.findIndex((l) => l.trim() === `${seletor} {`);
  if (inicio === -1) throw new Error(`não achei \`${seletor} {\` no globals.css`);
  const decls = new Map<string, string>();
  for (let i = inicio + 1; i < linhas.length; i += 1) {
    const linha = (linhas[i] ?? "").trim();
    if (linha === "}") return decls;
    const m = /^(--[a-z0-9-]+)\s*:\s*(.+);$/.exec(linha);
    if (m) decls.set(m[1]!, m[2]!.trim());
  }
  throw new Error(`o bloco \`${seletor}\` não fecha`);
}

/** Bloco do escale-tema.css — o critério de escale-tema.test.ts (primeira ocorrência até a primeira chave). */
function blocoDoTema(seletor: string): Map<string, string> {
  const abre = `${seletor} {`;
  const i = TEMA.indexOf(abre);
  if (i < 0) throw new Error(`bloco ${seletor} não encontrado`);
  const corpo = TEMA.slice(i + abre.length, TEMA.indexOf("}", i));
  return new Map([...corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

function resolver(valor: string, mapa: Map<string, string>, passos = 0): string {
  const m = /^var\((--[\w-]+)\)$/.exec(valor);
  if (!m) return valor;
  if (passos > 8) throw new Error(`ciclo ao resolver ${valor}`);
  const proximo = mapa.get(m[1]!);
  if (proximo === undefined) throw new Error(`token ${m[1]} sem valor`);
  return resolver(proximo, mapa, passos + 1);
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

describe("tokens da casca no globals.css (o original)", () => {
  it(":root declara todos, e o fallback de cada cor é um token do próprio original", () => {
    const raiz = blocoDoGlobais(":root");
    expect(TODOS.filter((t) => !raiz.has(t))).toEqual([]);
    for (const cor of Object.keys(CORES)) {
      const fallback = raiz.get(cor) ?? "";
      const ref = /^var\((--color-[a-z0-9-]+)\)$/.exec(fallback)?.[1];
      expect(ref, `${cor} = ${fallback}`).toBeDefined();
      expect(ref!.startsWith("--color-casca-"), cor).toBe(false);
      // Sem a casca, o utilitário da casca pinta uma cor que o original já tinha.
      expect(resolver(fallback, raiz), cor).toMatch(/^#[0-9a-f]{6}$/i);
    }
    for (const [raio, px] of Object.entries(RAIOS)) expect(raiz.get(raio), raio).toBe(px);
    expect(raiz.get(SOMBRA)).toBe(SOMBRA_CLARA);
  });

  it("nenhum token da casca entra na régua da marca (nem grau da rampa, nem nome -soft/-fg)", () => {
    // extrairRegua (lib/branding/contraste.ts) conta todo `var(--color-accent-NNN)`
    // e todo `-soft`/`-fg` do :root como par a medir, e branding-pares-pintados
    // exige exatamente 18 pares no claro e 26 no escuro.
    const raiz = blocoDoGlobais(":root");
    for (const t of TODOS) {
      expect(t).not.toMatch(/-(soft|fg)$/);
      expect(raiz.get(t) ?? "", t).not.toMatch(/var\(\s*--color-accent-\d/);
    }
  });

  it("o @theme inline faz a ponte de cada um", () => {
    const ponte = blocoDoGlobais("@theme inline");
    expect(TODOS.filter((t) => ponte.get(t) !== `var(${t})`)).toEqual([]);
  });

  it("os blocos de tema do original não ganham token da casca", () => {
    // branding-tema-claro-escopavel exige que o claro espelhe exatamente o
    // escuro; o escuro da casca mora no escale-tema.css, não aqui.
    for (const seletor of ['[data-theme="light"]', '[data-theme="dark"]']) {
      const chaves = [...blocoDoGlobais(seletor).keys()];
      expect(chaves.filter((k) => k.includes("casca")), seletor).toEqual([]);
    }
  });
});

describe("tokens da casca no escale-tema.css (só com a casca ligada)", () => {
  it("o tema claro da casca tem os valores do contrato e a sombra da Clint", () => {
    const claro = blocoDoTema(CLARO_DA_CASCA);
    const errados = Object.entries(CORES)
      .filter(([t, v]) => (claro.get(t) ?? "").toLowerCase() !== v.toLowerCase())
      .map(([t]) => `${t} = ${claro.get(t) ?? "(ausente)"}`);
    expect(errados).toEqual([]);
    expect(claro.get(SOMBRA)).toBe(SOMBRA_CLARA);
  });

  it("o tema escuro da casca redefine todas as cores e a sombra", () => {
    const escuro = blocoDoTema(ESCURO_DA_CASCA);
    expect([...Object.keys(CORES), SOMBRA].filter((t) => !escuro.has(t))).toEqual([]);
  });

  it("os tons da marca derivam de var(--color-accent) no próprio body, nos dois temas", () => {
    // Declarados no body, resolvem com o --color-accent do body — e a marca da
    // organização (body:has([data-marca-org]), injetada depois) é quem o define.
    for (const bloco of [blocoDoTema(CLARO_DA_CASCA), blocoDoTema(ESCURO_DA_CASCA)]) {
      for (const t of TONS_DA_MARCA) expect(bloco.get(t) ?? "", t).toContain("var(--color-accent)");
    }
  });

  it("sem a casca nada muda: todo token do escale-tema.css está dentro de body:has([data-escale-casca])", () => {
    const semComentario = TEMA.replace(/\/\*[\s\S]*?\*\//g, "");
    const regras = [...semComentario.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
      seletor: m[1]!.trim(),
      corpo: m[2]!,
    }));
    expect(regras.length).toBeGreaterThan(2);
    const fora = regras
      .filter((r) => /--[\w-]+\s*:/.test(r.corpo) && !r.seletor.includes(CLARO_DA_CASCA))
      .map((r) => r.seletor);
    expect(fora).toEqual([]);
  });

  it("o texto da casca é legível nos dois temas", () => {
    const claro = blocoDoTema(CLARO_DA_CASCA);
    const escuro = blocoDoTema(ESCURO_DA_CASCA);
    for (const t of ["--color-casca-texto", "--color-casca-texto-2", "--color-casca-suave"]) {
      expect(contraste(claro.get(t)!, claro.get("--color-surface")!), t).toBeGreaterThanOrEqual(4.5);
    }
    for (const t of ["--color-casca-texto", "--color-casca-suave"]) {
      expect(contraste(escuro.get(t)!, escuro.get("--color-surface")!), t).toBeGreaterThanOrEqual(4.5);
    }
    // gatilho de filtro aberto: texto branco sobre o escuro
    expect(contraste("#ffffff", claro.get("--color-casca-escuro")!)).toBeGreaterThanOrEqual(4.5);
    expect(contraste("#ffffff", escuro.get("--color-casca-escuro")!)).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-casca-tokens.test.ts
```
Expected: FAIL. O primeiro caso reprova com a lista de todos os `--color-casca-*`, `--radius-casca-*` e `--shadow-casca-painel` ausentes do `:root`; os demais também falham.

- [ ] **Step 3: O bloco do fork no `:root` do `globals.css`**

Em `app/globals.css`, troque exatamente este trecho (é o fim do `:root`, logo antes do comentário "Espelho do tema claro para SUBÁRVORE"):

```css
  --agenda-pessoa-7: #7b5bad; /* violeta */
  --agenda-pessoa-8: #cc77b1; /* framboesa */
}

/* ─────────────────────────────────────────────────────────────────────────
   Espelho do tema claro para SUBÁRVORE.
```

por:

```css
  --agenda-pessoa-7: #7b5bad; /* violeta */
  --agenda-pessoa-8: #cc77b1; /* framboesa */

  /* ---- FORK ESCALE · casca Clint V1 ------------------------------------
   * Tokens que só a casca nova usa (`text-casca-texto`, `bg-casca-raia`…).
   * O valor de verdade mora em `app/escale-tema.css`, dentro de
   * `body:has([data-escale-casca])`. Aqui fica só o fallback, e ele é SEMPRE
   * um token do próprio original: sem a casca, um utilitário da casca pinta a
   * cor que o original já tinha.
   *
   * Duas regras, cada uma com uma cerca por trás:
   *  - nada disto vai para `[data-theme="light"]` nem `[data-theme="dark"]`:
   *    branding-tema-claro-escopavel exige que os dois cubram as mesmas
   *    chaves, e o escuro da casca mora no escale-tema.css;
   *  - nenhum fallback aponta para um grau da rampa do accent e nenhum nome
   *    termina em -soft ou -fg: a régua da marca contaria um par novo e
   *    branding-pares-pintados reprovaria.
   */
  --color-casca-texto: var(--color-text);
  --color-casca-texto-2: var(--color-text);
  --color-casca-suave: var(--color-text-muted);
  --color-casca-meta: var(--color-text-muted);
  --color-casca-sobrelinha: var(--color-text-muted);
  --color-casca-borda: var(--color-border);
  --color-casca-raia: var(--color-surface-elevated);
  --color-casca-caixa-msg: var(--color-surface-elevated);
  --color-casca-borda-msg: var(--color-border);
  --color-casca-busca: var(--color-surface-elevated);
  --color-casca-contador: var(--color-border);
  --color-casca-cinza-selo: var(--color-border-strong);
  --color-casca-dia: var(--color-accent-soft);
  --color-casca-marca: var(--color-accent);
  --color-casca-marca-forte: var(--color-accent-hover);
  --color-casca-marca-suave: var(--color-accent-soft);
  --color-casca-marca-media: var(--color-accent-soft);
  --color-casca-novo: var(--color-accent);
  --color-casca-alerta: var(--color-error);
  --color-casca-escuro: var(--color-text);
  --color-casca-chevron: var(--color-text-subtle);
  --color-casca-divisoria: var(--color-border);
  --color-casca-seta: var(--color-border-strong);
  --color-casca-caixa: var(--color-surface-elevated);
  --color-casca-caixa-borda: var(--color-border-strong);
  --radius-casca-gatilho: 6px;
  --radius-casca-card: 10px;
  --radius-casca-raia: 16px;
  --shadow-casca-painel: 0 8px 16px rgb(17 24 39 / 0.1), 0 0 1px rgb(17 24 39 / 0.3);
}

/* ─────────────────────────────────────────────────────────────────────────
   Espelho do tema claro para SUBÁRVORE.
```

- [ ] **Step 4: A ponte no fim do `@theme inline`**

Em `app/globals.css`, troque exatamente:

```css
  --ease-spring: var(--ease-spring);
}
```

por:

```css
  --ease-spring: var(--ease-spring);

  /* FORK ESCALE · casca Clint V1: ponte dos tokens da casca (valor no escale-tema.css) */
  --color-casca-texto: var(--color-casca-texto);
  --color-casca-texto-2: var(--color-casca-texto-2);
  --color-casca-suave: var(--color-casca-suave);
  --color-casca-meta: var(--color-casca-meta);
  --color-casca-sobrelinha: var(--color-casca-sobrelinha);
  --color-casca-borda: var(--color-casca-borda);
  --color-casca-raia: var(--color-casca-raia);
  --color-casca-caixa-msg: var(--color-casca-caixa-msg);
  --color-casca-borda-msg: var(--color-casca-borda-msg);
  --color-casca-busca: var(--color-casca-busca);
  --color-casca-contador: var(--color-casca-contador);
  --color-casca-cinza-selo: var(--color-casca-cinza-selo);
  --color-casca-dia: var(--color-casca-dia);
  --color-casca-marca: var(--color-casca-marca);
  --color-casca-marca-forte: var(--color-casca-marca-forte);
  --color-casca-marca-suave: var(--color-casca-marca-suave);
  --color-casca-marca-media: var(--color-casca-marca-media);
  --color-casca-novo: var(--color-casca-novo);
  --color-casca-alerta: var(--color-casca-alerta);
  --color-casca-escuro: var(--color-casca-escuro);
  --color-casca-chevron: var(--color-casca-chevron);
  --color-casca-divisoria: var(--color-casca-divisoria);
  --color-casca-seta: var(--color-casca-seta);
  --color-casca-caixa: var(--color-casca-caixa);
  --color-casca-caixa-borda: var(--color-casca-caixa-borda);
  --radius-casca-gatilho: var(--radius-casca-gatilho);
  --radius-casca-card: var(--radius-casca-card);
  --radius-casca-raia: var(--radius-casca-raia);
  --shadow-casca-painel: var(--shadow-casca-painel);
}
```

- [ ] **Step 5: Os valores reais no `escale-tema.css`**

Em `app/escale-tema.css`, no bloco claro, troque exatamente:

```css
  /* nome da marca quando não há logo */
  --color-escale-marca: #2965b3;
}
```

por:

```css
  /* nome da marca quando não há logo */
  --color-escale-marca: #2965b3;

  /* casca igual à Clint (V1): cores medidas nos prints da Clint, menu superior */
  --color-casca-texto: #2f2c5d;
  --color-casca-texto-2: #3e3a6f;
  --color-casca-suave: #686d86;
  --color-casca-meta: #8c89b0;
  --color-casca-sobrelinha: #828282;
  --color-casca-borda: #e8e4f5;
  --color-casca-raia: #eff3ff;
  --color-casca-caixa-msg: #eff6ff;
  --color-casca-borda-msg: #e3ebff;
  --color-casca-busca: #f6f8ff;
  --color-casca-contador: #e8e4f5;
  --color-casca-cinza-selo: #e0e0e0;
  --color-casca-novo: #597eff;
  --color-casca-alerta: #ff4b4c;
  --color-casca-escuro: #2f2c5d;
  --color-casca-chevron: #7489a8;
  --color-casca-divisoria: #ebebeb;
  --color-casca-seta: #cccccc;
  --color-casca-caixa: #dfe2fd;
  --color-casca-caixa-borda: #d5dcff;
  /* onde a Clint usa o roxo dela entra a marca da organização, no mesmo lugar */
  --color-casca-marca: var(--color-accent);
  --color-casca-marca-forte: color-mix(in oklab, var(--color-accent) 85%, black);
  --color-casca-marca-suave: color-mix(in oklab, var(--color-accent) 8%, white);
  --color-casca-marca-media: color-mix(in oklab, var(--color-accent) 18%, white);
  --color-casca-dia: color-mix(in oklab, var(--color-accent) 4%, white);
  --shadow-casca-painel: 0 8px 16px rgb(17 24 39 / 0.1), 0 0 1px rgb(17 24 39 / 0.3);
}
```

No bloco escuro, troque exatamente:

```css
  --color-neutral-900: #181b26;
  --color-neutral-950: #0d0f17;
}
```

por:

```css
  --color-neutral-900: #181b26;
  --color-neutral-950: #0d0f17;

  /* casca igual à Clint (V1), escuro: a Clint escura nunca foi vista (não há
     print). Valores DERIVADOS da paleta escura acima, não copiados. */
  --color-casca-texto: #e8eaf2;
  --color-casca-texto-2: #d3d6e6;
  --color-casca-suave: #a5aac0;
  --color-casca-meta: #8f94ad;
  --color-casca-sobrelinha: #9aa0b5;
  --color-casca-borda: #2a2f42;
  --color-casca-raia: #202433;
  --color-casca-caixa-msg: #232838;
  --color-casca-borda-msg: #30364b;
  --color-casca-busca: #202433;
  --color-casca-contador: #2a2f42;
  --color-casca-cinza-selo: #353b52;
  --color-casca-novo: #6f8fff;
  --color-casca-alerta: #ff5f60;
  --color-casca-escuro: #3e4560;
  --color-casca-chevron: #7d849c;
  --color-casca-divisoria: #2a2f42;
  --color-casca-seta: #4a5068;
  --color-casca-caixa: #2a2f42;
  --color-casca-caixa-borda: #3a4160;
  --color-casca-marca: var(--color-accent);
  --color-casca-marca-forte: color-mix(in oklab, var(--color-accent) 85%, white);
  --color-casca-marca-suave: color-mix(in oklab, var(--color-accent) 16%, #181b26);
  --color-casca-marca-media: color-mix(in oklab, var(--color-accent) 28%, #181b26);
  --color-casca-dia: color-mix(in oklab, var(--color-accent) 10%, #181b26);
  --shadow-casca-painel: 0 8px 16px rgb(0 0 0 / 0.45), 0 0 1px rgb(0 0 0 / 0.6);
}
```

- [ ] **Step 6: Rodar o teste novo e as cercas que leem o CSS**

```bash
corepack pnpm vitest run tests/unit/escale-casca-tokens.test.ts tests/unit/escale-tema.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/branding-tema-claro-escopavel.test.ts tests/unit/branding-pares-pintados.test.ts tests/unit/branding-regua-do-produto.test.ts tests/unit/branding-contraste.test.ts
```
Expected: todos PASS. Se `branding-pares-pintados` acusar a contagem 18/26, algum fallback do `:root` aponta para um grau da rampa (`var(--color-accent-NNN)`). Conserte o fallback, nunca o teste.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css app/escale-tema.css tests/unit/escale-casca-tokens.test.ts
git commit -m "feat(escale): tokens da casca igual à Clint (cores, raios e sombra), só com a casca ligada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A fonte Poppins na casca

**Files:**
- Create: `app/fonts/poppins-400-latin.woff2`, `app/fonts/poppins-500-latin.woff2`, `app/fonts/poppins-600-latin.woff2`
- Delete: `app/fonts/figtree-300-900-latin.woff2`
- Modify: `app/escale-tema.css` (cabeçalho, `@font-face`, `--font-atkinson` da casca), `app/fonts/README.md` (1 linha trocada), `app/fonts/OFL.txt` (1 linha), `tests/unit/escale-tema.test.ts`

**Interfaces:**
- Consumes: o mecanismo da Fase 0: a casca redefine `--font-atkinson` no `body`, e o `font-sans` do original lê essa variável.
- Produces: com a casca ligada, `font-sans` é a Poppins. Os pesos 400 (`font-normal`), 500 (`font-medium`) e 600 (`font-semibold`) têm arquivo próprio. Nada mais pesado que 600: a Clint não usa, e o navegador sintetizaria.

**Origem dos arquivos:** Google Fonts, família Poppins, licença SIL OFL 1.1. A convenção do repositório (`app/fonts/README.md`) é baixar o `.woff2` do subset `latin` servido pelo próprio Google Fonts (`fonts.gstatic.com`), pela API CSS2 e com o User-Agent do `next/font`. O subset `latin` cobre U+0000–00FF, ou seja, todos os acentos do português.

O repositório `google/fonts` no GitHub tem os mesmos desenhos em TTF:
- `https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf`;
- `https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Medium.ttf`;
- `https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-SemiBold.ttf`.

O padrão dessas URLs é o da pasta `ofl/poppins/` do repositório e precisa ser conferido antes de usar. Usamos esse repositório SÓ para ler a linha de copyright do `OFL.txt` (Step 4). Os TTFs têm cerca de 150 KB cada e trazem todos os subsets. Não os versione.

- [ ] **Step 1: Atualizar o teste do tema (vai falhar)**

Em `tests/unit/escale-tema.test.ts`, troque exatamente:

```ts
  it("as fontes do @font-face existem no repositório", () => {
    const urls = [...CSS.matchAll(/url\("\.\/(fonts\/[^"]+)"\)/g)].map((m) => m[1]!);
    expect(urls.length).toBe(2);
    expect(urls.filter((u) => !existsSync(join(RAIZ, "app", u)))).toEqual([]);
  });
```

por:

```ts
  it("as fontes do @font-face existem no repositório e são woff2 de verdade", () => {
    const urls = [...CSS.matchAll(/url\("\.\/(fonts\/[^"]+)"\)/g)].map((m) => m[1]!);
    expect(urls).toEqual([
      "fonts/poppins-400-latin.woff2",
      "fonts/poppins-500-latin.woff2",
      "fonts/poppins-600-latin.woff2",
      "fonts/jetbrains-mono-100-800-latin.woff2",
    ]);
    expect(urls.filter((u) => !existsSync(join(RAIZ, "app", u)))).toEqual([]);
    // Uma página de erro salva com o nome .woff2 passaria no existsSync.
    for (const u of urls) {
      expect(readFileSync(join(RAIZ, "app", u)).subarray(0, 4).toString("latin1"), u).toBe("wOF2");
    }
  });

  it("a casca usa a Poppins da Clint, só nos pesos 400, 500 e 600", () => {
    expect(CLARO["--font-atkinson"]).toMatch(/^"Escale Poppins",/);
    const pesos = [...CSS.matchAll(/font-family:\s*"Escale Poppins";[^}]*?font-weight:\s*(\d+);/g)].map(
      (m) => m[1],
    );
    expect(pesos).toEqual(["400", "500", "600"]);
    expect(CSS).not.toContain("Figtree");
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-tema.test.ts
```
Expected: FAIL nos dois casos novos:
- o primeiro: `expected [ 'fonts/figtree-300-900-latin.woff2', 'fonts/jetbrains-mono-100-800-latin.woff2' ] to deeply equal [ …poppins… ]`;
- o segundo: `--font-atkinson` ainda começa com `"Escale Figtree"`.

- [ ] **Step 3: Baixar a Poppins (subset latin, woff2) do Google Fonts**

Da raiz do repositório:

```bash
node - <<'NODE'
const fs = require("fs");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36";
(async () => {
  const resposta = await fetch("https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap", {
    headers: { "User-Agent": UA },
  });
  if (!resposta.ok) throw new Error(`API CSS2 respondeu ${resposta.status}`);
  const css = await resposta.text();
  const porPeso = new Map();
  for (const m of css.matchAll(/\/\* latin \*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    const peso = /font-weight:\s*(\d+)/.exec(m[1])?.[1];
    const url = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/.exec(m[1])?.[1];
    if (peso && url) porPeso.set(peso, url);
  }
  for (const peso of ["400", "500", "600"]) {
    const url = porPeso.get(peso);
    if (!url) throw new Error(`a resposta não trouxe o bloco latin do peso ${peso}`);
    const arquivo = Buffer.from(await (await fetch(url)).arrayBuffer());
    if (arquivo.subarray(0, 4).toString("latin1") !== "wOF2") throw new Error(`${url} não é woff2`);
    fs.writeFileSync(`app/fonts/poppins-${peso}-latin.woff2`, arquivo);
    console.log(peso, arquivo.length, url);
  }
})().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
NODE
```
Expected: três linhas no formato `400 <bytes> https://fonts.gstatic.com/s/poppins/vNN/….woff2` (o mesmo para 500 e 600), cada uma com uns 7 a 9 KB. **Anote o `vNN` que aparecer na URL**: ele vai para o README no Step 4.

Se a API não responder (sem rede), PARE e avise o usuário. Não troque por outra fonte nem pelo TTF.

- [ ] **Step 4: Licença e README; tirar a Figtree**

Confira a linha de copyright no repositório oficial:

```bash
curl -sL https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/OFL.txt | head -1
```
Expected: `Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins)`. Se vier outro texto, use o que veio no lugar da linha abaixo.

Em `app/fonts/OFL.txt`, logo DEPOIS da linha `Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)`, acrescente:

```
Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins)
```

Em `app/fonts/README.md`, troque a linha:

```
| `figtree-300-900-latin.woff2` | Figtree | variável 300–900 | latin | `figtree/v9` (fork Escale: fonte da casca nova) |
```

por (com o `vNN` anotado no Step 3):

```
| `poppins-{400,500,600}-latin.woff2` | Poppins | 400, 500, 600 (estáticas) | latin | `poppins/vNN` (fork Escale: fonte da casca nova, a mesma da Clint) |
```

E tire o arquivo da Figtree, que nada mais usa:

```bash
grep -rn "figtree" --include=*.ts --include=*.tsx --include=*.css --include=*.mjs -i app components lib hooks
git rm app/fonts/figtree-300-900-latin.woff2
```
Expected do `grep`: só as linhas do `app/escale-tema.css` que o Step 5 troca. Se aparecer outro arquivo, PARE e pergunte antes do `git rm`.

- [ ] **Step 5: `@font-face` e a variável da casca no `escale-tema.css`**

Em `app/escale-tema.css`, troque exatamente:

```css
 * confundir com a IA. Medido em `tests/unit/escale-tema.test.ts`.
 */

@font-face {
  font-family: "Escale Figtree";
  src: url("./fonts/figtree-300-900-latin.woff2") format("woff2");
  font-weight: 300 900;
  font-style: normal;
  font-display: swap;
}
```

por:

```css
 * confundir com a IA. Medido em `tests/unit/escale-tema.test.ts`.
 *
 * CASCA IGUAL À CLINT (V1, 16/10/2026). A casca nova copia a Clint (variante
 * com menu superior). A fonte passa a ser a Poppins, a mesma da Clint, nos
 * pesos 400, 500 e 600 (a Clint não passa de 600). Entram também os tokens
 * `casca-*`, com os valores medidos nos prints (docs/escale/clint/). Onde a
 * Clint usa o roxo dela, os tons `casca-marca` derivam de var(--color-accent)
 * declarados AQUI, no body: assim vale a cor da marca da organização, que o
 * mesmo body recebe depois. O escuro da Clint nunca foi visto (não há print),
 * então os valores escuros da casca são derivados da paleta escura abaixo.
 */

@font-face {
  font-family: "Escale Poppins";
  src: url("./fonts/poppins-400-latin.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Escale Poppins";
  src: url("./fonts/poppins-500-latin.woff2") format("woff2");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Escale Poppins";
  src: url("./fonts/poppins-600-latin.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
```

E troque exatamente:

```css
  --font-atkinson: "Escale Figtree", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

por:

```css
  --font-atkinson: "Escale Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

- [ ] **Step 6: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-tema.test.ts tests/unit/escale-casca-tokens.test.ts
```
Expected: PASS (os 8 casos do tema e os 9 dos tokens).

- [ ] **Step 7: Commit**

```bash
git add app/fonts/poppins-400-latin.woff2 app/fonts/poppins-500-latin.woff2 app/fonts/poppins-600-latin.woff2 app/fonts/README.md app/fonts/OFL.txt app/escale-tema.css tests/unit/escale-tema.test.ts
git commit -m "feat(escale): a casca nova usa a Poppins da Clint (400, 500 e 600) no lugar da Figtree

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(O `git rm` do Step 4 já deixou a remoção da Figtree no índice; ela entra neste commit.)

---

### Task 4: Os ícones da casca

**Files:**
- Create: `lib/ui/icons-da-casca.ts`, `tests/unit/escale-ui-icones-da-casca.test.tsx`

**Interfaces:**
- Consumes: `lucide-react` 1.52 (dependência que já existe). Nessa versão, `HelpCircle`, `CheckCircle2` e `MoreVertical` são apelidos oficiais de `CircleQuestionMark`, `CircleCheck` e `EllipsisVertical` (conferido em `node_modules/lucide-react/dist/lucide-react.d.ts` e no `dist/esm/lucide-react.mjs`: `EllipsisVertical as MoreVertical`, `CircleQuestionMark as HelpCircle`, `CircleCheck as CheckCircle2`).
- Produces: `import { … } from "@/lib/ui/icons-da-casca"`, com os nomes do contrato (`CalendarPlus, CalendarCheck, CalendarX, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Search, RefreshCw, Download, Settings, HelpCircle, Phone, MessageCircle, Mail, CheckCircle2, Clock, MoreVertical, Plus, Sparkles, LayoutGrid`), mais `Check` e `Minus` (caixinha), `EllipsisVertical` (o nome canônico do ⋮, que a V3 e a V4 usam) e o tipo `LucideIcon`. V2 a V4 acrescentam aqui o que precisarem, por script que pula o que já é exportado.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-ui-icones-da-casca.test.tsx`:

```tsx
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import * as icones from "@/lib/ui/icons-da-casca";

/**
 * A Clint desenha com Feather/Lucide (traço 2, grade 24). A casca usa o
 * lucide-react, reexportado por um arquivo só dela — o barril do original
 * (`lib/ui/icons.ts`, Phosphor) não é tocado.
 */
const NOMES = [
  "CalendarPlus",
  "CalendarCheck",
  "CalendarX",
  "CalendarClock",
  "ChevronDown",
  "ChevronLeft",
  "ChevronRight",
  "Search",
  "RefreshCw",
  "Download",
  "Settings",
  "HelpCircle",
  "Phone",
  "MessageCircle",
  "Mail",
  "CheckCircle2",
  "Clock",
  "MoreVertical",
  "Plus",
  "Sparkles",
  "LayoutGrid",
  "Check",
  "Minus",
  "EllipsisVertical",
] as const;

describe("ícones da casca", () => {
  it("reexporta cada ícone que o contrato nomeia", () => {
    expect(NOMES.filter((n) => !(n in icones))).toEqual([]);
  });

  it("cada ícone desenha um svg de traço 2, como os da Clint", () => {
    for (const nome of NOMES) {
      const Icone = icones[nome];
      const { container, unmount } = render(<Icone aria-hidden />);
      const svg = container.querySelector("svg");
      expect(svg, nome).not.toBeNull();
      expect(svg?.getAttribute("stroke-width"), nome).toBe("2");
      unmount();
    }
  });

  it("o barril do original continua só com Phosphor", () => {
    const fonte = readFileSync(join(__dirname, "..", "..", "lib", "ui", "icons.ts"), "utf8");
    expect(fonte).not.toContain("lucide-react");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-icones-da-casca.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/lib/ui/icons-da-casca"`.

- [ ] **Step 3: Implementar**

Create `lib/ui/icons-da-casca.ts`:

```ts
/**
 * ÍCONES DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * A Clint usa react-icons nas famílias Feather e Lucide (traço 2, cantos
 * redondos, grade 24). O equivalente aqui é o `lucide-react`, que já é
 * dependência. Este arquivo é só da casca: o resto do produto continua
 * importando Phosphor de `@/lib/ui/icons`, que não muda.
 *
 * `HelpCircle`, `CheckCircle2` e `MoreVertical` são apelidos oficiais do
 * lucide 1.x (de CircleQuestionMark, CircleCheck e EllipsisVertical) e são os
 * nomes que o contrato usa. O ⋮ também sai pelo nome canônico,
 * `EllipsisVertical`, que é o que a V3 e a V4 importam. Ícone novo da casca
 * entra AQUI.
 */
export {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  EllipsisVertical,
  HelpCircle,
  LayoutGrid,
  Mail,
  MessageCircle,
  Minus,
  MoreVertical,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
export type { LucideIcon } from "lucide-react";
```

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-icones-da-casca.test.tsx lib/ui/icons.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/ui/icons-da-casca.ts tests/unit/escale-ui-icones-da-casca.test.tsx
git commit -m "feat(escale): ícones da casca (lucide, traço 2 como na Clint)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Os períodos do calendário (puro)

**Files:**
- Create: `lib/escale/ui/periodos.ts`, `tests/unit/escale-ui-periodos.test.ts`

**Interfaces:**
- Consumes: `date-fns` 4.4 (já é dependência), com `weekStartsOn: 0`.
- Produces (o `CalendarioDePeriodo` usa; a V4 usa para o gatilho "Data" com período aplicado):
  - `type AtalhoDePeriodo = "hoje" | "ontem" | "essa-semana" | "semana-passada" | "esse-mes" | "mes-passado" | "esse-ano"`;
  - `ATALHOS_DE_PERIODO: readonly AtalhoDePeriodo[]`, na ordem da Clint;
  - `periodoDoAtalho(atalho, hoje: Date): { de: string; ate: string }`;
  - `diasDoMes(ano: number, mes0: number): { iso: string; doMes: boolean }[]`: semanas inteiras, de domingo a sábado;
  - `isoDaData(d: Date): string` (calendário local);
  - `dataDoIso(iso: string): Date` (meia-noite local; lança se não for `AAAA-MM-DD` válido);
  - `formatarDataBr(iso: string): string` (`dd/mm/aaaa`);
  - `ordenarIntervalo(a, b): { de; ate }`;
  - `dentroDoIntervalo(iso, de?, ate?): boolean` (exclui os extremos);
  - `mesVizinho(ano, mes0, passo): { ano; mes0 }`;
  - `atalhoDoPeriodo(de, ate, hoje): AtalhoDePeriodo | null`.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-ui-periodos.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  ATALHOS_DE_PERIODO,
  atalhoDoPeriodo,
  dataDoIso,
  dentroDoIntervalo,
  diasDoMes,
  formatarDataBr,
  isoDaData,
  mesVizinho,
  ordenarIntervalo,
  periodoDoAtalho,
} from "@/lib/escale/ui/periodos";

/** Quinta-feira, 15/10/2026, à tarde — o dia do print do usuário. Hora local. */
const QUINTA = new Date(2026, 9, 15, 14, 30);

describe("periodoDoAtalho", () => {
  it.each([
    ["hoje", "2026-10-15", "2026-10-15"],
    ["ontem", "2026-10-14", "2026-10-14"],
    ["essa-semana", "2026-10-11", "2026-10-17"],
    ["semana-passada", "2026-10-04", "2026-10-10"],
    ["esse-mes", "2026-10-01", "2026-10-31"],
    ["mes-passado", "2026-09-01", "2026-09-30"],
    ["esse-ano", "2026-01-01", "2026-12-31"],
  ] as const)("%s em 15/10/2026 vai de %s a %s", (atalho, de, ate) => {
    expect(periodoDoAtalho(atalho, QUINTA)).toEqual({ de, ate });
  });

  it("a semana começa no domingo: no domingo e no sábado, 'essa semana' é a mesma", () => {
    expect(periodoDoAtalho("essa-semana", new Date(2026, 9, 11, 8))).toEqual({ de: "2026-10-11", ate: "2026-10-17" });
    expect(periodoDoAtalho("essa-semana", new Date(2026, 9, 17, 23, 59))).toEqual({ de: "2026-10-11", ate: "2026-10-17" });
  });

  it("vira o ano: em 01/01/2026, ontem, a semana e o mês passado caem em 2025", () => {
    const anoNovo = new Date(2026, 0, 1, 9);
    expect(periodoDoAtalho("ontem", anoNovo)).toEqual({ de: "2025-12-31", ate: "2025-12-31" });
    expect(periodoDoAtalho("essa-semana", anoNovo)).toEqual({ de: "2025-12-28", ate: "2026-01-03" });
    expect(periodoDoAtalho("semana-passada", anoNovo)).toEqual({ de: "2025-12-21", ate: "2025-12-27" });
    expect(periodoDoAtalho("mes-passado", anoNovo)).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
  });

  it("mês passado respeita o fevereiro bissexto, partindo de um dia 31", () => {
    expect(periodoDoAtalho("mes-passado", new Date(2024, 2, 31, 12))).toEqual({ de: "2024-02-01", ate: "2024-02-29" });
    expect(periodoDoAtalho("mes-passado", new Date(2026, 2, 31, 12))).toEqual({ de: "2026-02-01", ate: "2026-02-28" });
  });

  it("não escorrega de dia perto da meia-noite (nada de UTC)", () => {
    expect(periodoDoAtalho("hoje", new Date(2026, 9, 15, 23, 59, 59))).toEqual({ de: "2026-10-15", ate: "2026-10-15" });
    expect(periodoDoAtalho("hoje", new Date(2026, 9, 15, 0, 0, 0))).toEqual({ de: "2026-10-15", ate: "2026-10-15" });
  });

  it("a lista dos atalhos segue a ordem da Clint", () => {
    expect(ATALHOS_DE_PERIODO).toEqual([
      "hoje",
      "ontem",
      "essa-semana",
      "semana-passada",
      "esse-mes",
      "mes-passado",
      "esse-ano",
    ]);
  });
});

describe("diasDoMes", () => {
  it("outubro de 2026 como no print da Clint: de 27/09 (domingo) a 31/10, cinco semanas", () => {
    const dias = diasDoMes(2026, 9);
    expect(dias).toHaveLength(35);
    expect(dias.slice(0, 5)).toEqual([
      { iso: "2026-09-27", doMes: false },
      { iso: "2026-09-28", doMes: false },
      { iso: "2026-09-29", doMes: false },
      { iso: "2026-09-30", doMes: false },
      { iso: "2026-10-01", doMes: true },
    ]);
    expect(dias[dias.length - 1]).toEqual({ iso: "2026-10-31", doMes: true });
  });

  it("novembro de 2026 começa num domingo e termina em 05/12, como no print", () => {
    const dias = diasDoMes(2026, 10);
    expect(dias).toHaveLength(35);
    expect(dias[0]).toEqual({ iso: "2026-11-01", doMes: true });
    expect(dias[dias.length - 1]).toEqual({ iso: "2026-12-05", doMes: false });
  });

  it("maio de 2026 precisa de seis semanas; fevereiro de 2026, de quatro", () => {
    expect(diasDoMes(2026, 4)).toHaveLength(42);
    const fevereiro = diasDoMes(2026, 1);
    expect(fevereiro).toHaveLength(28);
    expect(fevereiro[0]).toEqual({ iso: "2026-02-01", doMes: true });
  });

  it("vira o ano: dezembro de 2026 termina em 02/01/2027", () => {
    const dias = diasDoMes(2026, 11);
    expect(dias[0]?.iso).toBe("2026-11-29");
    expect(dias[dias.length - 1]).toEqual({ iso: "2027-01-02", doMes: false });
  });

  it("todo mês tem semanas inteiras começando no domingo", () => {
    for (let mes0 = 0; mes0 < 12; mes0 += 1) {
      const dias = diasDoMes(2026, mes0);
      expect(dias.length % 7, `mês ${mes0}`).toBe(0);
      expect(dataDoIso(dias[0]!.iso).getDay(), `mês ${mes0}`).toBe(0);
    }
  });
});

describe("datas em texto", () => {
  it("isoDaData usa o calendário local", () => {
    expect(isoDaData(new Date(2026, 9, 15, 23, 30))).toBe("2026-10-15");
    expect(isoDaData(new Date(2026, 0, 5, 0, 0))).toBe("2026-01-05");
  });

  it("dataDoIso devolve a meia-noite local e recusa o que não é data", () => {
    const d = dataDoIso("2026-10-15");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 15, 0]);
    expect(() => dataDoIso("15/10/2026")).toThrow();
    expect(() => dataDoIso("2026-02-31")).toThrow();
  });

  it("formatarDataBr mostra dd/mm/aaaa", () => {
    expect(formatarDataBr("2026-03-05")).toBe("05/03/2026");
    expect(formatarDataBr("2026-12-31")).toBe("31/12/2026");
  });
});

describe("intervalo", () => {
  it("os dois cliques valem em qualquer ordem", () => {
    expect(ordenarIntervalo("2026-10-20", "2026-10-12")).toEqual({ de: "2026-10-12", ate: "2026-10-20" });
    expect(ordenarIntervalo("2026-10-12", "2026-10-20")).toEqual({ de: "2026-10-12", ate: "2026-10-20" });
    expect(ordenarIntervalo("2026-10-12", "2026-10-12")).toEqual({ de: "2026-10-12", ate: "2026-10-12" });
  });

  it("dentroDoIntervalo exclui os extremos e exige os dois", () => {
    expect(dentroDoIntervalo("2026-10-15", "2026-10-12", "2026-10-20")).toBe(true);
    expect(dentroDoIntervalo("2026-10-12", "2026-10-12", "2026-10-20")).toBe(false);
    expect(dentroDoIntervalo("2026-10-20", "2026-10-12", "2026-10-20")).toBe(false);
    expect(dentroDoIntervalo("2026-10-15", "2026-10-12", undefined)).toBe(false);
  });

  it("mesVizinho atravessa o ano", () => {
    expect(mesVizinho(2026, 11, 1)).toEqual({ ano: 2027, mes0: 0 });
    expect(mesVizinho(2026, 0, -1)).toEqual({ ano: 2025, mes0: 11 });
    expect(mesVizinho(2026, 9, 1)).toEqual({ ano: 2026, mes0: 10 });
  });

  it("atalhoDoPeriodo reconhece o atalho do intervalo, e só ele", () => {
    expect(atalhoDoPeriodo("2026-10-11", "2026-10-17", QUINTA)).toBe("essa-semana");
    expect(atalhoDoPeriodo("2026-10-15", "2026-10-15", QUINTA)).toBe("hoje");
    expect(atalhoDoPeriodo("2026-10-12", "2026-10-17", QUINTA)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-periodos.test.ts
```
Expected: FAIL com `Failed to resolve import "@/lib/escale/ui/periodos"`.

- [ ] **Step 3: Implementar**

Create `lib/escale/ui/periodos.ts`:

```ts
import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

/**
 * PERÍODOS DO CALENDÁRIO DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * Funções puras. A data viaja como `AAAA-MM-DD`, montada com o calendário
 * LOCAL — nunca `toISOString()`, que converte para UTC e, em São Paulo, vira
 * o dia seguinte depois das 21h. Na tela ela aparece como `dd/mm/aaaa`.
 *
 * A semana começa no domingo, como no calendário da Clint
 * (DOM SEG TER QUA QUI SEX SÁB). "Essa semana", "Esse mês" e "Esse ano" vão
 * do primeiro ao último dia inteiro — a Clint não mostra se param em hoje
 * (print pendente, nº 24 do plano-índice).
 */

export type AtalhoDePeriodo =
  | "hoje"
  | "ontem"
  | "essa-semana"
  | "semana-passada"
  | "esse-mes"
  | "mes-passado"
  | "esse-ano";

/** Na ordem da lista da Clint. */
export const ATALHOS_DE_PERIODO: readonly AtalhoDePeriodo[] = [
  "hoje",
  "ontem",
  "essa-semana",
  "semana-passada",
  "esse-mes",
  "mes-passado",
  "esse-ano",
];

const SEMANA_NO_DOMINGO = { weekStartsOn: 0 } as const;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isoDaData(data: Date): string {
  return format(data, "yyyy-MM-dd");
}

export function dataDoIso(iso: string): Date {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`data fora do formato AAAA-MM-DD: ${iso}`);
  const data = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isoDaData(data) !== iso) throw new Error(`data que não existe: ${iso}`);
  return data;
}

export function formatarDataBr(iso: string): string {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`data fora do formato AAAA-MM-DD: ${iso}`);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function intervalo(de: Date, ate: Date): { de: string; ate: string } {
  return { de: isoDaData(de), ate: isoDaData(ate) };
}

export function periodoDoAtalho(atalho: AtalhoDePeriodo, hoje: Date): { de: string; ate: string } {
  switch (atalho) {
    case "hoje":
      return intervalo(hoje, hoje);
    case "ontem": {
      const ontem = subDays(hoje, 1);
      return intervalo(ontem, ontem);
    }
    case "essa-semana":
      return intervalo(startOfWeek(hoje, SEMANA_NO_DOMINGO), endOfWeek(hoje, SEMANA_NO_DOMINGO));
    case "semana-passada": {
      const passada = subWeeks(hoje, 1);
      return intervalo(startOfWeek(passada, SEMANA_NO_DOMINGO), endOfWeek(passada, SEMANA_NO_DOMINGO));
    }
    case "esse-mes":
      return intervalo(startOfMonth(hoje), endOfMonth(hoje));
    case "mes-passado": {
      const passado = subMonths(hoje, 1);
      return intervalo(startOfMonth(passado), endOfMonth(passado));
    }
    case "esse-ano":
      return intervalo(startOfYear(hoje), endOfYear(hoje));
  }
}

/** O atalho cujo período é exatamente este — ou nenhum. */
export function atalhoDoPeriodo(de: string, ate: string, hoje: Date): AtalhoDePeriodo | null {
  return (
    ATALHOS_DE_PERIODO.find((atalho) => {
      const p = periodoDoAtalho(atalho, hoje);
      return p.de === de && p.ate === ate;
    }) ?? null
  );
}

/** Semanas inteiras, de domingo a sábado, cobrindo o mês. `doMes` marca os dias dele. */
export function diasDoMes(ano: number, mes0: number): { iso: string; doMes: boolean }[] {
  const primeiro = new Date(ano, mes0, 1);
  const fim = endOfWeek(endOfMonth(primeiro), SEMANA_NO_DOMINGO);
  const dias: { iso: string; doMes: boolean }[] = [];
  for (let dia = startOfWeek(primeiro, SEMANA_NO_DOMINGO); dia <= fim; dia = addDays(dia, 1)) {
    dias.push({ iso: isoDaData(dia), doMes: dia.getMonth() === primeiro.getMonth() });
  }
  return dias;
}

export function mesVizinho(ano: number, mes0: number, passo: number): { ano: number; mes0: number } {
  const data = new Date(ano, mes0 + passo, 1);
  return { ano: data.getFullYear(), mes0: data.getMonth() };
}

/** Os dois cliques do calendário, em qualquer ordem. `AAAA-MM-DD` compara como texto. */
export function ordenarIntervalo(a: string, b: string): { de: string; ate: string } {
  return a <= b ? { de: a, ate: b } : { de: b, ate: a };
}

/** Entre os extremos, sem eles (os extremos têm pintura própria). */
export function dentroDoIntervalo(iso: string, de: string | undefined, ate: string | undefined): boolean {
  if (!de || !ate) return false;
  return iso > de && iso < ate;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-periodos.test.ts
```
Expected: PASS (todos os casos).

- [ ] **Step 5: Commit**

```bash
git add lib/escale/ui/periodos.ts tests/unit/escale-ui-periodos.test.ts
git commit -m "feat(escale): períodos do calendário da casca (atalhos da Clint, semana no domingo)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Os textos em espanhol

**Files:**
- Modify: `lib/i18n/dicionario.ts` (bloco do fork logo ANTES da linha `  // ─── FORK ESCALE · filtros do quadro (Fase 1D`)

**Interfaces:**
- Consumes: nada.
- Produces: o espanhol de todo texto das Tasks 7 a 12. As chaves que já existem ficam como estão:
  - `Hoje`, `Ontem`: chaves sem aspas, na linha ~7524;
  - `Data de criação`, `Data de ganho`;
  - `Mês anterior`, `Próximo mês`;
  - `Buscar…`, `Nenhum resultado`, `Selecione…`;
  - `Em breve` (bloco da Fase 1B): é a dica das abas desligadas do calendário (Task 12). Não entra na lista do script.

- [ ] **Step 1: Inserir o bloco por script (pula o que já existe, com ou sem aspas)**

Da raiz do repositório:

```bash
node - <<'NODE'
const fs = require("fs");
const ARQ = "lib/i18n/dicionario.ts";
const ANCORA = "  // ─── FORK ESCALE · filtros do quadro (Fase 1D";
const CAB = "  // ─── FORK ESCALE · casca igual à Clint (V1: botões, filtros, seletor, calendário) ───";
const ENTRADAS = [
  ["Hoje", "Hoy"],
  ["Ontem", "Ayer"],
  ["Essa semana", "Esta semana"],
  ["Semana passada", "Semana pasada"],
  ["Esse mês", "Este mes"],
  ["Mês passado", "Mes pasado"],
  ["Esse ano", "Este año"],
  ["Data de criação", "Fecha de creación"],
  ["Data de ganho", "Fecha de ganado"],
  ["Data de perda", "Fecha de pérdida"],
  ["Data agendada", "Fecha agendada"],
  ["Tipo de data", "Tipo de fecha"],
  ["Atalhos de período", "Atajos de período"],
  ["Mês anterior", "Mes anterior"],
  ["Próximo mês", "Mes siguiente"],
  ["De {de} a {ate}", "Del {de} al {ate}"],
  ["A partir de {de}", "Desde el {de}"],
  ["DOM", "DOM"],
  ["SEG", "LUN"],
  ["TER", "MAR"],
  ["QUA", "MIÉ"],
  ["QUI", "JUE"],
  ["SEX", "VIE"],
  ["SÁB", "SÁB"],
  ["Buscar…", "Buscar…"],
  ["Nenhum resultado", "Sin resultados"],
  ["Selecione…", "Selecciona…"],
];
let texto = fs.readFileSync(ARQ, "utf8");
if (texto.includes(CAB)) throw new Error("o bloco da casca V1 já está no dicionário");
const i = texto.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 1D não encontrada");
const eol = texto.includes("\r\n") ? "\r\n" : "\n";
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const existe = (pt) =>
  texto.includes(JSON.stringify(pt) + ":") || new RegExp("^\\s*" + escapar(pt) + ":", "m").test(texto);
const novas = [];
const puladas = [];
for (const [pt, es] of ENTRADAS) {
  if (existe(pt)) {
    puladas.push(pt);
    continue;
  }
  novas.push(`  ${JSON.stringify(pt)}: { es: ${JSON.stringify(es)} },`);
}
texto = texto.slice(0, i) + [CAB, ...novas].join(eol) + eol + texto.slice(i);
fs.writeFileSync(ARQ, texto);
console.log(`${novas.length} entradas novas; já existiam ${puladas.length}: ${puladas.join(" | ")}`);
NODE
```
Expected: `18 entradas novas; já existiam 9: Hoje | Ontem | Data de criação | Data de ganho | Mês anterior | Próximo mês | Buscar… | Nenhum resultado | Selecione…`. Se a contagem for diferente, confira se a chave pulada existe mesmo (`grep -n`) antes de seguir.

- [ ] **Step 2: Conferir o dicionário e o typecheck**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts
corepack pnpm typecheck
```
Expected: i18n PASS; typecheck sem erros novos. Chave repetida aparece como `An object literal cannot have multiple properties with the same name`. Se aparecer, apague do bloco da V1 a linha repetida.

- [ ] **Step 3: Commit**

```bash
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): textos em espanhol dos componentes da casca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: BotaoDaCasca

**Files:**
- Create: `components/escale/ui/BotaoDaCasca.tsx`, `tests/unit/escale-ui-botao-da-casca.test.tsx`

**Interfaces:**
- Consumes: tokens da Task 2; `cn` de `@/lib/utils`.
- Produces: `export const BotaoDaCasca = forwardRef<HTMLButtonElement, BotaoDaCascaProps>`, com `BotaoDaCascaProps = { variante: "marca" | "novo" | "texto" | "icone"; tamanho?: "md" | "sm" } & ButtonHTMLAttributes<HTMLButtonElement>`. O `type` padrão é `"button"`. Exporta também os tipos `VarianteDoBotaoDaCasca` e `TamanhoDoBotaoDaCasca`.

**Detalhes visuais (Clint, px de CSS):**
- `marca` ("Negócio +", 01-010): cor da marca, texto branco, ≈95×31, raio 6, texto 12–13px peso 500 (o "semibold" da Clint é 500), hover mais escuro (`#5B16BC` = 85% da marca + preto).
- `novo` ("Novo +" do topo): `#597EFF`, texto branco 11px/500, ≈53×22, raio ≈5.
- `texto`: sem fundo, `#3E3A6F`, hover `#EFF3FF`.
- `icone`: quadrado de 28px (ajuda, 28×28) com ícone de 16px `#686D86`.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-ui-botao-da-casca.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";

describe("<BotaoDaCasca>", () => {
  it("marca: o 'Negócio +' na cor da marca, 31px de altura e canto de 6px", () => {
    render(<BotaoDaCasca variante="marca">Negócio</BotaoDaCasca>);
    const botao = screen.getByRole("button", { name: "Negócio" });
    expect(botao).toHaveAttribute("type", "button");
    expect(botao).toHaveAttribute("data-variante", "marca");
    expect(botao).toHaveClass(
      "bg-casca-marca",
      "text-accent-foreground",
      "hover:bg-casca-marca-forte",
      "rounded-casca-gatilho",
      "h-[31px]",
      "font-medium",
    );
  });

  it("novo: o 'Novo +' azul do topo, que não é a cor da marca", () => {
    render(<BotaoDaCasca variante="novo">Novo</BotaoDaCasca>);
    const botao = screen.getByRole("button", { name: "Novo" });
    expect(botao).toHaveClass("bg-casca-novo", "text-white", "h-[22px]", "text-[11px]");
    expect(botao).not.toHaveClass("bg-casca-marca");
  });

  it("texto e ícone não têm fundo até o hover", () => {
    render(
      <>
        <BotaoDaCasca variante="texto">Cancelar</BotaoDaCasca>
        <BotaoDaCasca variante="icone" aria-label="Atualizar">
          <svg />
        </BotaoDaCasca>
      </>,
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveClass(
      "bg-transparent",
      "text-casca-texto-2",
      "hover:bg-casca-raia",
    );
    expect(screen.getByRole("button", { name: "Atualizar" })).toHaveClass(
      "size-7",
      "bg-transparent",
      "text-casca-suave",
      "hover:bg-casca-raia",
    );
  });

  it("o tamanho sm encolhe", () => {
    render(
      <>
        <BotaoDaCasca variante="marca" tamanho="sm">
          Pequeno
        </BotaoDaCasca>
        <BotaoDaCasca variante="icone" tamanho="sm" aria-label="Ajuda">
          <svg />
        </BotaoDaCasca>
      </>,
    );
    expect(screen.getByRole("button", { name: "Pequeno" })).toHaveClass("h-[26px]");
    expect(screen.getByRole("button", { name: "Ajuda" })).toHaveClass("size-6");
  });

  it("repassa ref, clique, type e className", async () => {
    const ref = createRef<HTMLButtonElement>();
    const aoClicar = vi.fn();
    render(
      <BotaoDaCasca ref={ref} variante="marca" type="submit" className="ml-auto" onClick={aoClicar}>
        Salvar
      </BotaoDaCasca>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toHaveAttribute("type", "submit");
    expect(ref.current).toHaveClass("ml-auto");
  });

  it("desabilitado não clica", async () => {
    const aoClicar = vi.fn();
    render(
      <BotaoDaCasca variante="novo" disabled onClick={aoClicar}>
        Novo
      </BotaoDaCasca>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Novo" }));
    expect(aoClicar).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-botao-da-casca.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/components/escale/ui/BotaoDaCasca"`.

- [ ] **Step 3: Implementar**

Create `components/escale/ui/BotaoDaCasca.tsx`:

```tsx
"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * O BOTÃO DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * Quatro formas, medidas nos prints da Clint (menu superior, px de CSS):
 * - `marca`: o "Negócio +" — cor da marca da organização no lugar do roxo da
 *   Clint, texto branco, 31px de altura, canto de 6px;
 * - `novo`: o "Novo +" do topo — azul #597EFF na Clint, que NÃO é a cor da
 *   marca dela, então é copiado como está;
 * - `texto`: sem fundo, texto escuro;
 * - `icone`: quadrado de 28px só com ícone (atualizar, engrenagem, ajuda).
 *   Quem usa passa `aria-label`.
 *
 * Não usa o `<Button>` do original: o visual é outro, e o `<Button>` traz a
 * altura de toque de 44px que a Clint não tem.
 */
export type VarianteDoBotaoDaCasca = "marca" | "novo" | "texto" | "icone";
export type TamanhoDoBotaoDaCasca = "md" | "sm";

export type BotaoDaCascaProps = {
  variante: VarianteDoBotaoDaCasca;
  tamanho?: TamanhoDoBotaoDaCasca;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const BASE =
  "inline-flex items-center justify-center whitespace-nowrap font-medium leading-[1.2] transition-colors duration-fast ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

const VARIANTES: Record<VarianteDoBotaoDaCasca, string> = {
  marca: "rounded-casca-gatilho bg-casca-marca text-accent-foreground hover:bg-casca-marca-forte",
  novo: "rounded-[5px] bg-casca-novo text-white hover:brightness-95",
  texto: "rounded-casca-gatilho bg-transparent text-casca-texto-2 hover:bg-casca-raia",
  icone: "rounded-casca-gatilho bg-transparent text-casca-suave hover:bg-casca-raia hover:text-casca-texto",
};

const TAMANHOS: Record<VarianteDoBotaoDaCasca, Record<TamanhoDoBotaoDaCasca, string>> = {
  marca: {
    md: "h-[31px] gap-2 px-3.5 text-[13px] [&_svg]:size-4",
    sm: "h-[26px] gap-1.5 px-3 text-xs [&_svg]:size-3.5",
  },
  novo: {
    md: "h-[22px] gap-1 px-2 text-[11px] [&_svg]:size-3",
    sm: "h-5 gap-1 px-1.5 text-[10px] [&_svg]:size-3",
  },
  texto: {
    md: "h-9 gap-2 px-2.5 text-[13px] [&_svg]:size-4",
    sm: "h-7 gap-1.5 px-2 text-xs [&_svg]:size-3.5",
  },
  icone: {
    md: "size-7 [&_svg]:size-4",
    sm: "size-6 [&_svg]:size-3.5",
  },
};

export const BotaoDaCasca = forwardRef<HTMLButtonElement, BotaoDaCascaProps>(function BotaoDaCasca(
  { variante, tamanho = "md", className, type = "button", ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-variante={variante}
      className={cn(BASE, VARIANTES[variante], TAMANHOS[variante][tamanho], className)}
      {...resto}
    />
  );
});
```

- [ ] **Step 4: Rodar e ver passar (com as cercas de classe)**

```bash
corepack pnpm vitest run tests/unit/escale-ui-botao-da-casca.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/escale/ui/BotaoDaCasca.tsx tests/unit/escale-ui-botao-da-casca.test.tsx
git commit -m "feat(escale): BotaoDaCasca (marca, novo, texto e ícone, como na Clint)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: PainelSuspenso

**Files:**
- Create: `components/escale/ui/PainelSuspenso.tsx`, `tests/unit/escale-ui-painel-suspenso.test.tsx`

**Interfaces:**
- Consumes: `@radix-ui/react-popover` (o mesmo primitivo de `components/ui/popover.tsx`, que exporta `Popover`, `PopoverTrigger`, `PopoverContent` e `PopoverAnchor`); a classe `ds-painel` do `globals.css` (animação de entrada e saída do original).
- Produces: `export function PainelSuspenso(props: React.ComponentProps<typeof PopoverContent>)` e o tipo `PainelSuspensoProps`. Vai dentro de um `<Popover>` do original, no lugar do `PopoverContent`. Padrões: `align="start"` (a Clint alinha o painel ao começo do gatilho) e `sideOffset={11}` (14px no print ÷ 1,25). Sem padding: quem usa decide.

**Por que no primitivo, e não por cima do `PopoverContent`:** o `PopoverContent` fixa `rounded-md` e `shadow-md`, e o `tailwind-merge` 3 não entende `rounded-casca-gatilho` nem `shadow-casca-painel` como conflito deles. As duas classes iriam juntas para o elemento, e quem ganharia seria a ordem do CSS gerado.

**Detalhes visuais:** fundo branco (`bg-surface`), borda 1px `#E8E4F5`, raio 6 (o `l3` do popover da Clint), sombra `lg` da Clint (`0 8px 16px …/.10, 0 0 1px …/.30`).

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-ui-painel-suspenso.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

function Painel(props: Partial<ComponentProps<typeof PainelSuspenso>>) {
  return (
    <div data-testid="raiz">
      <Popover>
        <PopoverTrigger>Abrir</PopoverTrigger>
        <PainelSuspenso {...props}>conteúdo</PainelSuspenso>
      </Popover>
    </div>
  );
}

describe("<PainelSuspenso>", () => {
  it("abre no portal, alinhado ao começo do gatilho, com o visual da Clint", async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    render(<Painel />);
    await u.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = await screen.findByRole("dialog");
    expect(painel).toHaveTextContent("conteúdo");
    expect(painel).toHaveClass("rounded-casca-gatilho", "border", "border-casca-borda", "shadow-casca-painel", "bg-surface");
    expect(painel).not.toHaveClass("rounded-md");
    expect(painel).not.toHaveClass("shadow-md");
    expect(painel).toHaveAttribute("data-align", "start");
    expect(screen.getByTestId("raiz")).not.toContainElement(painel);
  });

  it("aceita a largura, o padding e o alinhamento de quem usa", async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    render(<Painel className="w-[742px] p-0" align="end" />);
    await u.click(screen.getByRole("button", { name: "Abrir" }));
    const painel = await screen.findByRole("dialog");
    expect(painel).toHaveClass("w-[742px]", "p-0");
    expect(painel).toHaveAttribute("data-align", "end");
  });

  it("Esc fecha", async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    render(<Painel />);
    await u.click(screen.getByRole("button", { name: "Abrir" }));
    await screen.findByRole("dialog");
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-painel-suspenso.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/components/escale/ui/PainelSuspenso"`.

- [ ] **Step 3: Implementar**

Create `components/escale/ui/PainelSuspenso.tsx`:

```tsx
"use client";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentProps } from "react";

import type { PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * O PAINEL SUSPENSO DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * É o `PopoverContent` do original com o visual da Clint: fundo branco, borda
 * #E8E4F5, canto de 6px e a sombra `lg` dela. Vai dentro de um `<Popover>`
 * do original, no lugar do `PopoverContent`.
 *
 * Montado direto no primitivo do Radix de propósito: o `PopoverContent` fixa
 * `rounded-md shadow-md`, e o tailwind-merge não entende `rounded-casca-*` nem
 * `shadow-casca-*` como conflito deles — as duas classes iriam juntas.
 *
 * Alinha ao começo do gatilho, a 11px dele, como o "Data" da Clint (14px no
 * print, que tem escala 1,25). Sem padding: quem usa decide.
 */
export type PainelSuspensoProps = ComponentProps<typeof PopoverContent>;

export function PainelSuspenso({ className, align = "start", sideOffset = 11, ...props }: PainelSuspensoProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "ds-painel z-50 origin-(--radix-popover-content-transform-origin) rounded-casca-gatilho border border-casca-borda bg-surface text-casca-texto shadow-casca-painel outline-hidden",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-painel-suspenso.test.tsx tests/unit/tailwind-tokens.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/escale/ui/PainelSuspenso.tsx tests/unit/escale-ui-painel-suspenso.test.tsx
git commit -m "feat(escale): PainelSuspenso (popover no visual da Clint)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: GatilhoDeFiltro

**Files:**
- Create: `components/escale/ui/GatilhoDeFiltro.tsx`, `tests/unit/escale-ui-gatilho-de-filtro.test.tsx`

**Interfaces:**
- Consumes: `ChevronDown` (Task 4); tokens (Task 2); `PainelSuspenso` (Task 8, só no teste).
- Produces: `export const GatilhoDeFiltro = forwardRef<HTMLButtonElement, GatilhoDeFiltroProps>`, com `GatilhoDeFiltroProps = { rotulo: string; contagem?: number; aberto?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>`.
  - Foi feito para `<PopoverTrigger asChild>`. O estado "aberto" vem da prop `aberto` ou do `aria-expanded` que o Radix injeta.
  - `contagem > 0` vira o selo cinza.
  - O elemento ganha `data-aberto` quando está aberto.
  - O `rotulo` é texto de quem chama, já traduzido. O componente não o passa por `t()`.

**Detalhes visuais (prints `2026-10-15-barra-de-filtros.png` e `2026-10-15-filtro-data-aberto.png`; bundle `DateRangeButtonTrigger`):**
- repouso: sem fundo, texto `#3E3A6F` 0,7rem (11,2px) peso 500, chevron 11px `#7489A8`, gap 10px, altura 36px, padding 10px, raio 6;
- hover: fundo `#EFF3FF`, texto `#2F2C5D`;
- aberto: fundo `#2F2C5D`, texto e chevron brancos. O chevron não gira (print do Data aberto);
- contagem: círculo de 18px `#E0E0E0` com número 10px peso 600 `#2F2C5D`, entre o rótulo e o chevron ("Status 1").

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-ui-gatilho-de-filtro.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { GatilhoDeFiltro } from "@/components/escale/ui/GatilhoDeFiltro";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

describe("<GatilhoDeFiltro>", () => {
  it("em repouso: rótulo, chevron e nenhum fundo", () => {
    render(<GatilhoDeFiltro rotulo="Data" />);
    const gatilho = screen.getByRole("button", { name: "Data" });
    expect(gatilho).toHaveAttribute("type", "button");
    expect(gatilho).toHaveClass(
      "h-9",
      "gap-2.5",
      "px-2.5",
      "rounded-casca-gatilho",
      "text-[0.7rem]",
      "font-medium",
      "text-casca-texto-2",
      "hover:bg-casca-raia",
    );
    expect(gatilho).not.toHaveAttribute("data-aberto");
    expect(gatilho.querySelector("svg")).toHaveClass("text-casca-chevron");
  });

  it("a contagem vira o selo cinza; zero não aparece", () => {
    const { rerender } = render(<GatilhoDeFiltro rotulo="Status" contagem={1} />);
    const gatilho = screen.getByRole("button", { name: /^Status\s*1$/ });
    expect(within(gatilho).getByText("1")).toHaveClass("bg-casca-cinza-selo", "rounded-full", "size-[18px]");
    rerender(<GatilhoDeFiltro rotulo="Status" contagem={0} />);
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("dentro do Popover: aberto fica escuro com texto branco, e o Esc devolve ao repouso", async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <Popover>
        <PopoverTrigger asChild>
          <GatilhoDeFiltro rotulo="Data" />
        </PopoverTrigger>
        <PainelSuspenso>calendário</PainelSuspenso>
      </Popover>,
    );
    const gatilho = screen.getByRole("button", { name: "Data" });
    await u.click(gatilho);
    expect(await screen.findByRole("dialog")).toHaveTextContent("calendário");
    expect(gatilho).toHaveAttribute("aria-expanded", "true");
    expect(gatilho).toHaveAttribute("data-aberto");
    expect(gatilho).toHaveClass("bg-casca-escuro", "text-white");
    expect(gatilho.querySelector("svg")).toHaveClass("text-white");
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(gatilho).not.toHaveAttribute("data-aberto");
    expect(gatilho).toHaveClass("text-casca-texto-2");
  });

  it("a prop aberto força o estado, fora de Popover", () => {
    render(<GatilhoDeFiltro rotulo="Tags" aberto />);
    expect(screen.getByRole("button", { name: "Tags" })).toHaveClass("bg-casca-escuro", "text-white");
  });

  it("repassa a ref e o clique", async () => {
    const ref = createRef<HTMLButtonElement>();
    const aoClicar = vi.fn();
    render(<GatilhoDeFiltro ref={ref} rotulo="Campos" onClick={aoClicar} />);
    await userEvent.click(screen.getByRole("button", { name: "Campos" }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-gatilho-de-filtro.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/components/escale/ui/GatilhoDeFiltro"`.

- [ ] **Step 3: Implementar**

Create `components/escale/ui/GatilhoDeFiltro.tsx`:

```tsx
"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { ChevronDown } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O GATILHO DE FILTRO DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * "Data", "Campos", "Tags", "Dono do negócio", "Status" e "Mais filtros" na
 * barra da Clint (menu superior). Medido nos prints, em px de CSS:
 * - repouso: sem fundo, texto #3E3A6F 0,7rem peso 500, chevron 11px #7489A8,
 *   gap 10px, 36px de altura, 10px de padding, canto de 6px;
 * - hover: fundo #EFF3FF;
 * - aberto: fundo #2F2C5D, texto e chevron brancos (o chevron não gira);
 * - contagem: círculo de 18px #E0E0E0 com o número, antes do chevron.
 *
 * Feito para `<PopoverTrigger asChild>`: o "aberto" vem do `aria-expanded`
 * que o Radix injeta, ou da prop `aberto`. O `rotulo` chega traduzido.
 */
export type GatilhoDeFiltroProps = {
  rotulo: string;
  contagem?: number;
  aberto?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const GatilhoDeFiltro = forwardRef<HTMLButtonElement, GatilhoDeFiltroProps>(function GatilhoDeFiltro(
  { rotulo, contagem, aberto, className, type = "button", ...resto },
  ref,
) {
  const expandido = resto["aria-expanded"];
  const estaAberto = aberto ?? (expandido === true || expandido === "true");
  const temContagem = contagem !== undefined && contagem > 0;
  return (
    <button
      ref={ref}
      type={type}
      data-aberto={estaAberto ? "" : undefined}
      className={cn(
        "inline-flex h-9 items-center gap-2.5 whitespace-nowrap rounded-casca-gatilho px-2.5 text-[0.7rem] font-medium transition-colors duration-fast ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca",
        estaAberto
          ? "bg-casca-escuro text-white"
          : "bg-transparent text-casca-texto-2 hover:bg-casca-raia hover:text-casca-texto",
        className,
      )}
      {...resto}
    >
      <span>{rotulo}</span>
      {temContagem ? (
        <>
          {" "}
          <span className="grid size-[18px] place-items-center rounded-full bg-casca-cinza-selo text-[10px] font-semibold text-casca-texto">
            {contagem}
          </span>
        </>
      ) : null}
      <ChevronDown
        aria-hidden
        strokeWidth={2.5}
        className={cn("size-[11px] shrink-0", estaAberto ? "text-white" : "text-casca-chevron")}
      />
    </button>
  );
});
```

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-gatilho-de-filtro.test.tsx tests/unit/tailwind-tokens.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/escale/ui/GatilhoDeFiltro.tsx tests/unit/escale-ui-gatilho-de-filtro.test.tsx
git commit -m "feat(escale): GatilhoDeFiltro (repouso, hover, aberto e contagem, como na Clint)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: CaixaDaCasca

**Files:**
- Create: `components/escale/ui/CaixaDaCasca.tsx`, `tests/unit/escale-ui-caixa-da-casca.test.tsx`

**Interfaces:**
- Consumes: `Check`, `Minus` (Task 4); tokens `casca-caixa`, `casca-caixa-borda` e `casca-marca` (Task 2).
- Produces: `export function CaixaDaCasca(props: CaixaDaCascaProps)`, com `CaixaDaCascaProps = { marcada: boolean | "indeterminada"; aoMudar: (v: boolean) => void; rotulo?: string; "aria-label"?: string; desabilitada?: boolean }`.
  - É um `<button role="checkbox">` com `aria-checked` igual a `true`, `false` ou `mixed`.
  - O Espaço alterna e o Enter não.
  - Da parcial, um clique vai para marcada (`aoMudar(true)`).
  - Sem `rotulo`, quem usa passa `aria-label`.

**Detalhes visuais (Clint, `form.checkbox`):**
- vazia: 16px, borda `#D5DCFF`, fundo `#DFE2FD`, raio 2;
- marcada: fundo e borda na cor da marca (no lugar de `purple.solid`), com o check branco;
- texto do rótulo: 12px `#2F2C5D`.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-ui-caixa-da-casca.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";

describe("<CaixaDaCasca>", () => {
  it("é uma caixa de marcar de verdade: papel, estado e nome", () => {
    const { rerender } = render(<CaixaDaCasca marcada={false} aoMudar={vi.fn()} rotulo="Selecionar todos" />);
    const caixa = screen.getByRole("checkbox", { name: "Selecionar todos" });
    expect(caixa).toHaveAttribute("aria-checked", "false");
    rerender(<CaixaDaCasca marcada aoMudar={vi.fn()} rotulo="Selecionar todos" />);
    expect(caixa).toHaveAttribute("aria-checked", "true");
    rerender(<CaixaDaCasca marcada="indeterminada" aoMudar={vi.fn()} rotulo="Selecionar todos" />);
    expect(caixa).toHaveAttribute("aria-checked", "mixed");
  });

  it("o clique alterna; da parcial vai para marcada", async () => {
    const aoMudar = vi.fn();
    const { rerender } = render(<CaixaDaCasca marcada={false} aoMudar={aoMudar} aria-label="Ana" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Ana" }));
    expect(aoMudar).toHaveBeenLastCalledWith(true);
    rerender(<CaixaDaCasca marcada aoMudar={aoMudar} aria-label="Ana" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Ana" }));
    expect(aoMudar).toHaveBeenLastCalledWith(false);
    rerender(<CaixaDaCasca marcada="indeterminada" aoMudar={aoMudar} aria-label="Ana" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Ana" }));
    expect(aoMudar).toHaveBeenLastCalledWith(true);
  });

  it("o Espaço alterna; o Enter não", async () => {
    const aoMudar = vi.fn();
    const u = userEvent.setup();
    render(<CaixaDaCasca marcada={false} aoMudar={aoMudar} aria-label="Bia" />);
    const caixa = screen.getByRole("checkbox", { name: "Bia" });
    act(() => caixa.focus());
    await u.keyboard(" ");
    expect(aoMudar).toHaveBeenCalledTimes(1);
    expect(aoMudar).toHaveBeenLastCalledWith(true);
    await u.keyboard("{Enter}");
    expect(aoMudar).toHaveBeenCalledTimes(1);
  });

  it("desabilitada não muda", async () => {
    const aoMudar = vi.fn();
    render(<CaixaDaCasca marcada={false} aoMudar={aoMudar} aria-label="Caio" desabilitada />);
    const caixa = screen.getByRole("checkbox", { name: "Caio" });
    expect(caixa).toBeDisabled();
    await userEvent.click(caixa);
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it("o visual da Clint: vazia lilás, marcada na cor da marca com o check", () => {
    const { rerender } = render(<CaixaDaCasca marcada={false} aoMudar={vi.fn()} aria-label="Davi" />);
    const quadrado = () => screen.getByRole("checkbox", { name: "Davi" }).querySelector("span");
    expect(quadrado()).toHaveClass("size-4", "rounded-[2px]", "bg-casca-caixa", "border-casca-caixa-borda");
    expect(quadrado()?.querySelector("svg")).toBeNull();
    rerender(<CaixaDaCasca marcada aoMudar={vi.fn()} aria-label="Davi" />);
    expect(quadrado()).toHaveClass("bg-casca-marca", "border-casca-marca", "text-accent-foreground");
    expect(quadrado()?.querySelector("svg")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-caixa-da-casca.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/components/escale/ui/CaixaDaCasca"`.

- [ ] **Step 3: Implementar**

Create `components/escale/ui/CaixaDaCasca.tsx`:

```tsx
"use client";
import type { KeyboardEvent } from "react";

import { Check, Minus } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A CAIXA DE MARCAR DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * Substitui o checkbox nativo dentro da casca. Visual do `form.checkbox` da
 * Clint: 16px, canto de 2px; vazia com borda #D5DCFF e fundo #DFE2FD;
 * marcada com a cor da marca da organização (no lugar do roxo) e o check
 * branco. Responde como checkbox: `role="checkbox"`, `aria-checked` com
 * `mixed` para a parcial, o Espaço alterna e o Enter não.
 */
export type CaixaDaCascaProps = {
  marcada: boolean | "indeterminada";
  aoMudar: (v: boolean) => void;
  rotulo?: string;
  "aria-label"?: string;
  desabilitada?: boolean;
};

export function CaixaDaCasca({
  marcada,
  aoMudar,
  rotulo,
  "aria-label": rotuloAcessivel,
  desabilitada = false,
}: CaixaDaCascaProps) {
  const cheia = marcada !== false;

  function alternar() {
    if (!desabilitada) aoMudar(marcada !== true);
  }

  function tecla(e: KeyboardEvent<HTMLButtonElement>) {
    // Caixa de marcar responde ao Espaço (o padrão do botão); o Enter não marca.
    if (e.key === "Enter") e.preventDefault();
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada === "indeterminada" ? "mixed" : marcada}
      aria-label={rotuloAcessivel}
      disabled={desabilitada}
      onClick={alternar}
      onKeyDown={tecla}
      className="group inline-flex items-center gap-2 text-[12px] text-casca-texto focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-[2px] border transition-colors duration-fast ease-out group-focus-visible:ring-2 group-focus-visible:ring-casca-marca group-focus-visible:ring-offset-1",
          cheia ? "border-casca-marca bg-casca-marca text-accent-foreground" : "border-casca-caixa-borda bg-casca-caixa",
        )}
      >
        {marcada === true ? <Check className="size-3" strokeWidth={3} /> : null}
        {marcada === "indeterminada" ? <Minus className="size-3" strokeWidth={3} /> : null}
      </span>
      {rotulo ? <span>{rotulo}</span> : null}
    </button>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-caixa-da-casca.test.tsx tests/unit/tailwind-tokens.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/escale/ui/CaixaDaCasca.tsx tests/unit/escale-ui-caixa-da-casca.test.tsx
git commit -m "feat(escale): CaixaDaCasca (checkbox próprio no visual da Clint)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: SeletorDaCasca

**Files:**
- Create: `components/escale/ui/SeletorDaCasca.tsx`, `tests/unit/escale-ui-seletor-da-casca.test.tsx`

**Interfaces:**
- Consumes: `Popover` e `PopoverTrigger` (`components/ui/popover.tsx`); `PainelSuspenso` (Task 8); `filtrarOpcoes` (`lib/ui/filtrar-opcoes.ts`, a mesma busca por palavras, sem acento, do `SearchableSelect`); `ChevronDown` e `Search` (Task 4); `useT` (`@/hooks/i18n/useT`).
- Produces: `export function SeletorDaCasca<V extends string>(props: SeletorDaCascaProps<V>)` e os tipos:
  - `SeletorDaCascaProps<V> = { valor: V | ""; opcoes: OpcaoDoSeletor<V>[]; aoMudar: (v: V | "") => void; "aria-label": string; vazio?: string; buscaAPartirDe?: number }`;
  - `OpcaoDoSeletor<V> = { valor: V; rotulo: string; grupo?: string; desabilitada?: boolean }`.

  Comportamento:
  - o gatilho tem `role="combobox"` e o painel, `role="listbox"` com `option`s (e `group` por `grupo` consecutivo);
  - a busca (`type="search"`) aparece quando há `opcoes.length >= buscaAPartirDe`, padrão 8;
  - `vazio` vira a primeira opção (valor `""`) e o texto do gatilho sem valor. Sem `vazio`, o gatilho mostra "Selecione…";
  - teclado: ↓ no gatilho abre; ↑/↓ andam pulando as desabilitadas; Enter escolhe; Esc fecha (Radix) e devolve o foco ao gatilho;
  - os rótulos (`rotulo`, `grupo`, `vazio`) chegam traduzidos e não passam por `t()`.

  V3 e V4 trocam por este todo `<select>` nativo e todo `SearchableSelect` dentro da casca.

**Detalhes visuais:**
- gatilho igual aos selects da Clint (react-select legado e campos do modal 01-013): altura ≈44–45px, fundo `#EFF3FF`, sem borda visível, raio 4, texto 13px `#2F2C5D` (sem valor: `#686D86`), chevron `#7489A8`;
- lista igual ao menu Chakra da Clint: itens de 11px peso 400 com altura mínima de 34px e 12px de padding; destacado com fundo `purple.subtle` e texto `purple.fg`, que aqui viram `casca-marca-suave` e `casca-marca`; título de grupo de 11px peso 600, maiúsculo, com espaçamento de 0,6px;
- busca: fundo `#F6F8FF` com lupa `#686D86` à direita.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-ui-seletor-da-casca.test.tsx`:

```tsx
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SeletorDaCasca, type OpcaoDoSeletor } from "@/components/escale/ui/SeletorDaCasca";
import { IdiomaProvider } from "@/lib/i18n/IdiomaProvider";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

const DONOS: OpcaoDoSeletor<string>[] = [
  { valor: "ana", rotulo: "Ana" },
  { valor: "bia", rotulo: "Bia" },
  { valor: "caio", rotulo: "Caio", desabilitada: true },
];

const OITO: OpcaoDoSeletor<string>[] = ["Ana", "Bia", "Caio", "Davi", "Edu", "Fabi", "Gabi", "Mariana"].map(
  (nome) => ({ valor: nome.toLowerCase(), rotulo: nome }),
);

function Controlado(props: {
  inicial?: string;
  opcoes?: OpcaoDoSeletor<string>[];
  aoMudar?: (v: string) => void;
  vazio?: string;
  buscaAPartirDe?: number;
}) {
  const [valor, setValor] = useState(props.inicial ?? "");
  return (
    <SeletorDaCasca
      valor={valor}
      opcoes={props.opcoes ?? DONOS}
      aria-label="Dono"
      vazio={props.vazio}
      buscaAPartirDe={props.buscaAPartirDe}
      aoMudar={(v) => {
        setValor(v);
        props.aoMudar?.(v);
      }}
    />
  );
}

const usuario = () => userEvent.setup({ pointerEventsCheck: 0 });

describe("<SeletorDaCasca>", () => {
  it("mostra o valor e abre a lista, sem nenhum select nativo", async () => {
    const u = usuario();
    render(<Controlado inicial="ana" />);
    const seletor = screen.getByRole("combobox", { name: "Dono" });
    expect(seletor).toHaveTextContent("Ana");
    expect(seletor).toHaveClass("bg-casca-raia", "text-casca-texto", "rounded-[4px]");
    await u.click(seletor);
    const lista = await screen.findByRole("listbox", { name: "Dono" });
    expect(within(lista).getAllByRole("option").map((o) => o.textContent)).toEqual(["Ana", "Bia", "Caio"]);
    expect(within(lista).getByRole("option", { name: "Ana" })).toHaveAttribute("aria-selected", "true");
    expect(within(lista).getByRole("option", { name: "Ana" })).toHaveClass("bg-casca-marca-suave", "text-casca-marca");
    expect(within(lista).getByRole("option", { name: "Caio" })).toHaveAttribute("aria-disabled", "true");
    expect(seletor).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(document.querySelector("select")).toBeNull();
  });

  it("escolher com o mouse chama aoMudar e fecha", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado inicial="ana" aoMudar={aoMudar} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    await u.click(await screen.findByRole("option", { name: "Bia" }));
    expect(aoMudar).toHaveBeenCalledWith("bia");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("combobox", { name: "Dono" })).toHaveTextContent("Bia");
  });

  it("opção desabilitada não é escolhida", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado inicial="ana" aoMudar={aoMudar} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    await u.click(await screen.findByRole("option", { name: "Caio" }));
    expect(aoMudar).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("funciona pelo teclado: ↓ abre, ↓ anda pulando a desabilitada, Enter escolhe, o foco volta", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado inicial="ana" aoMudar={aoMudar} />);
    const seletor = screen.getByRole("combobox", { name: "Dono" });
    act(() => seletor.focus());
    await u.keyboard("{ArrowDown}");
    const lista = await screen.findByRole("listbox");
    await waitFor(() => expect(lista).toHaveFocus());
    const id = (nome: string) => within(lista).getByRole("option", { name: nome }).id;
    expect(lista).toHaveAttribute("aria-activedescendant", id("Ana"));
    await u.keyboard("{ArrowDown}");
    expect(lista).toHaveAttribute("aria-activedescendant", id("Bia"));
    await u.keyboard("{ArrowDown}");
    expect(lista).toHaveAttribute("aria-activedescendant", id("Bia"));
    await u.keyboard("{Enter}");
    expect(aoMudar).toHaveBeenCalledWith("bia");
    expect(screen.queryByRole("listbox")).toBeNull();
    await waitFor(() => expect(seletor).toHaveFocus());
  });

  it("Esc fecha sem escolher", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado inicial="ana" aoMudar={aoMudar} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    await screen.findByRole("listbox");
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it("vazio vira a primeira opção e o texto do gatilho sem valor", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado inicial="bia" vazio="Todos" aoMudar={aoMudar} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    const opcoes = within(await screen.findByRole("listbox")).getAllByRole("option");
    expect(opcoes[0]).toHaveTextContent("Todos");
    await u.click(opcoes[0]!);
    expect(aoMudar).toHaveBeenCalledWith("");
    expect(screen.getByRole("combobox", { name: "Dono" })).toHaveTextContent("Todos");
  });

  it("sem valor e sem vazio, o gatilho diz 'Selecione…' em cinza", () => {
    render(<Controlado />);
    const seletor = screen.getByRole("combobox", { name: "Dono" });
    expect(seletor).toHaveTextContent("Selecione…");
    expect(seletor).toHaveClass("text-casca-suave");
  });

  it("a partir de 8 opções aparece a busca, que filtra e aceita Enter", async () => {
    const u = usuario();
    const aoMudar = vi.fn();
    render(<Controlado opcoes={OITO} aoMudar={aoMudar} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    const busca = await screen.findByRole("searchbox", { name: "Buscar…" });
    expect(busca).toHaveAttribute("placeholder", "Buscar…");
    await waitFor(() => expect(busca).toHaveFocus());
    await u.type(busca, "bi");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Bia", "Fabi", "Gabi"]);
    await u.keyboard("{Enter}");
    expect(aoMudar).toHaveBeenCalledWith("bia");
  });

  it("busca sem resultado diz 'Nenhum resultado'", async () => {
    const u = usuario();
    render(<Controlado opcoes={OITO} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    await u.type(await screen.findByRole("searchbox"), "zzz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("Nenhum resultado")).toBeInTheDocument();
  });

  it("buscaAPartirDe muda o corte", async () => {
    const u = usuario();
    render(<Controlado buscaAPartirDe={3} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    expect(await screen.findByRole("searchbox")).toBeInTheDocument();
  });

  it("agrupa as opções pelo grupo, com o título do grupo", async () => {
    const u = usuario();
    const agrupadas: OpcaoDoSeletor<string>[] = [
      { valor: "nome", rotulo: "Nome", grupo: "Contato" },
      { valor: "email", rotulo: "E-mail", grupo: "Contato" },
      { valor: "valor", rotulo: "Valor", grupo: "Negócio" },
    ];
    render(<Controlado opcoes={agrupadas} />);
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    const contato = await screen.findByRole("group", { name: "Contato" });
    expect(within(contato).getAllByRole("option").map((o) => o.textContent)).toEqual(["Nome", "E-mail"]);
    expect(within(screen.getByRole("group", { name: "Negócio" })).getAllByRole("option")).toHaveLength(1);
  });

  it("em espanhol, os textos do próprio seletor mudam", async () => {
    const u = usuario();
    render(
      <IdiomaProvider locale="es">
        <Controlado opcoes={OITO} />
      </IdiomaProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Dono" })).toHaveTextContent("Selecciona…");
    await u.click(screen.getByRole("combobox", { name: "Dono" }));
    await u.type(await screen.findByRole("searchbox"), "zzz");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-seletor-da-casca.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/components/escale/ui/SeletorDaCasca"`.

- [ ] **Step 3: Implementar**

Create `components/escale/ui/SeletorDaCasca.tsx`:

```tsx
"use client";
import { Fragment, useId, useMemo, useState, type KeyboardEvent } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { filtrarOpcoes } from "@/lib/ui/filtrar-opcoes";
import { ChevronDown, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O SELETOR DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * Substitui, dentro da casca, o select nativo e o `SearchableSelect`. O visual
 * é o dos selects da Clint: gatilho de ~44px com fundo #EFF3FF, sem borda,
 * canto de 4px, texto 13px; lista no painel da casca com itens de 11px e 34px
 * de altura mínima, destacados na cor clara da marca (o `purple.subtle` da
 * Clint). A busca aparece a partir de 8 opções — o mesmo corte do
 * `SearchableSelect` do original — e procura por palavras, sem acento.
 *
 * Papéis: o gatilho é `combobox`; o painel, `listbox` com `option`s, e cada
 * grupo consecutivo vira `group`. Teclado: ↓ abre, ↑/↓ andam pulando as
 * desabilitadas, Enter escolhe, Esc fecha.
 *
 * Os rótulos (`rotulo`, `grupo`, `vazio`) chegam traduzidos de quem chama.
 */
export type OpcaoDoSeletor<V extends string> = {
  valor: V;
  rotulo: string;
  grupo?: string;
  desabilitada?: boolean;
};

export type SeletorDaCascaProps<V extends string> = {
  valor: V | "";
  opcoes: OpcaoDoSeletor<V>[];
  aoMudar: (v: V | "") => void;
  "aria-label": string;
  vazio?: string;
  buscaAPartirDe?: number;
};

/** O mesmo corte do `SearchableSelect` do original (`MINIMO_PARA_BUSCA`). */
const BUSCA_A_PARTIR_DE = 8;

type Linha<V extends string> = { valor: V | ""; rotulo: string; grupo?: string; desabilitada: boolean };
type Bloco<V extends string> = { grupo?: string; itens: { linha: Linha<V>; indice: number }[] };

function montarLinhas<V extends string>(
  opcoes: readonly OpcaoDoSeletor<V>[],
  busca: string,
  vazio: string | undefined,
): Linha<V>[] {
  const todas: Linha<V>[] = opcoes.map((o) => ({
    valor: o.valor,
    rotulo: o.rotulo,
    grupo: o.grupo,
    desabilitada: o.desabilitada === true,
  }));
  const termo = busca.trim();
  if (termo) {
    const achadas = filtrarOpcoes(
      todas.map((linha, i) => ({ value: String(i), label: linha.rotulo })),
      termo,
    );
    return achadas.flatMap((a) => {
      const linha = todas[Number(a.value)];
      return linha ? [linha] : [];
    });
  }
  return vazio === undefined ? todas : [{ valor: "", rotulo: vazio, desabilitada: false }, ...todas];
}

function proximaHabilitada<V extends string>(linhas: readonly Linha<V>[], de: number, passo: 1 | -1): number {
  for (let i = de; i >= 0 && i < linhas.length; i += passo) {
    if (linhas[i]?.desabilitada === false) return i;
  }
  return -1;
}

function emBlocos<V extends string>(linhas: readonly Linha<V>[]): Bloco<V>[] {
  const blocos: Bloco<V>[] = [];
  linhas.forEach((linha, indice) => {
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.grupo === linha.grupo) ultimo.itens.push({ linha, indice });
    else blocos.push({ grupo: linha.grupo, itens: [{ linha, indice }] });
  });
  return blocos;
}

export function SeletorDaCasca<V extends string>({
  valor,
  opcoes,
  aoMudar,
  "aria-label": rotuloAcessivel,
  vazio,
  buscaAPartirDe = BUSCA_A_PARTIR_DE,
}: SeletorDaCascaProps<V>) {
  const t = useT();
  const id = useId();
  const listaId = `${id}-lista`;
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(-1);

  const comBusca = opcoes.length >= buscaAPartirDe;
  const linhas = useMemo(() => montarLinhas(opcoes, busca, vazio), [opcoes, busca, vazio]);
  const atual = opcoes.find((o) => o.valor === valor);
  const textoDoGatilho = atual ? atual.rotulo : (vazio ?? t("Selecione…"));
  const idDoAtivo = linhas[ativo] ? `${id}-op-${ativo}` : undefined;

  function mudarAberto(proximo: boolean) {
    setAberto(proximo);
    if (!proximo) return;
    setBusca("");
    const iniciais = montarLinhas(opcoes, "", vazio);
    const selecionada = iniciais.findIndex((l) => l.valor === valor && !l.desabilitada);
    setAtivo(selecionada >= 0 ? selecionada : proximaHabilitada(iniciais, 0, 1));
  }

  function escolher(linha: Linha<V> | undefined) {
    if (!linha || linha.desabilitada) return;
    aoMudar(linha.valor);
    setAberto(false);
  }

  function mover(passo: 1 | -1) {
    const proximo = proximaHabilitada(linhas, ativo + passo, passo);
    if (proximo < 0) return;
    setAtivo(proximo);
    document.getElementById(`${id}-op-${proximo}`)?.scrollIntoView?.({ block: "nearest" });
  }

  function teclar(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      mover(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      escolher(linhas[ativo]);
    }
  }

  function buscar(texto: string) {
    setBusca(texto);
    setAtivo(proximaHabilitada(montarLinhas(opcoes, texto, vazio), 0, 1));
  }

  return (
    <Popover open={aberto} onOpenChange={mudarAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={rotuloAcessivel}
          aria-haspopup="listbox"
          aria-expanded={aberto}
          aria-controls={aberto ? listaId : undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && !aberto) {
              e.preventDefault();
              mudarAberto(true);
            }
          }}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-[4px] bg-casca-raia px-3 text-left text-[13px] transition-colors duration-fast ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca",
            atual ? "text-casca-texto" : "text-casca-suave",
          )}
        >
          <span className="truncate">{textoDoGatilho}</span>
          <ChevronDown aria-hidden className="size-3.5 shrink-0 text-casca-chevron" />
        </button>
      </PopoverTrigger>
      <PainelSuspenso className="w-(--radix-popover-trigger-width) min-w-[200px] p-1" onKeyDown={teclar}>
        {comBusca ? (
          <div className="relative mb-1">
            <input
              type="search"
              value={busca}
              onChange={(e) => buscar(e.target.value)}
              placeholder={t("Buscar…")}
              aria-label={t("Buscar…")}
              aria-controls={listaId}
              aria-activedescendant={idDoAtivo}
              className="h-8 w-full rounded-[4px] bg-casca-busca pl-2.5 pr-8 text-[12px] text-casca-texto placeholder:text-casca-suave focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca"
            />
            <Search
              aria-hidden
              className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-casca-suave"
            />
          </div>
        ) : null}
        <div
          id={listaId}
          role="listbox"
          aria-label={rotuloAcessivel}
          tabIndex={comBusca ? -1 : 0}
          aria-activedescendant={comBusca ? undefined : idDoAtivo}
          className="max-h-72 overflow-y-auto focus-visible:outline-hidden"
        >
          {emBlocos(linhas).map((bloco, b) => {
            const itens = bloco.itens.map(({ linha, indice }) => (
              <div
                key={`${linha.valor}-${indice}`}
                id={`${id}-op-${indice}`}
                role="option"
                aria-selected={linha.valor === valor}
                aria-disabled={linha.desabilitada || undefined}
                onMouseEnter={() => {
                  if (!linha.desabilitada) setAtivo(indice);
                }}
                onClick={() => escolher(linha)}
                className={cn(
                  "flex min-h-[34px] items-center rounded-[2px] px-3 text-[11px] text-casca-texto",
                  indice === ativo && "bg-casca-marca-suave text-casca-marca",
                  linha.desabilitada ? "cursor-not-allowed opacity-30" : "cursor-pointer",
                )}
              >
                <span className="truncate">{linha.rotulo}</span>
              </div>
            ));
            return bloco.grupo ? (
              <div key={`g-${b}`} role="group" aria-label={bloco.grupo}>
                <div
                  aria-hidden
                  className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-casca-suave"
                >
                  {bloco.grupo}
                </div>
                {itens}
              </div>
            ) : (
              <Fragment key={`g-${b}`}>{itens}</Fragment>
            );
          })}
        </div>
        {linhas.length === 0 ? <p className="px-3 py-2 text-[11px] text-casca-suave">{t("Nenhum resultado")}</p> : null}
      </PainelSuspenso>
    </Popover>
  );
}
```

- [ ] **Step 4: Rodar e ver passar (com as cercas de seleção, i18n e classes)**

```bash
corepack pnpm vitest run tests/unit/escale-ui-seletor-da-casca.test.tsx tests/unit/selecao-longa-tem-busca.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/tailwind-tokens.test.ts
```
Expected: PASS. Se `selecao-longa-tem-busca` reprovar, procure `<select` ou `SelectContent` escrito no arquivo (inclusive em comentário) e tire.

- [ ] **Step 5: Commit**

```bash
git add components/escale/ui/SeletorDaCasca.tsx tests/unit/escale-ui-seletor-da-casca.test.tsx
git commit -m "feat(escale): SeletorDaCasca (combobox próprio no visual da Clint, busca a partir de 8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: CalendarioDePeriodo

**Files:**
- Create: `components/escale/ui/CalendarioDePeriodo.tsx`, `tests/unit/escale-ui-calendario-de-periodo.test.tsx`

**Interfaces:**
- Consumes:
  - `lib/escale/ui/periodos.ts` (Task 5);
  - os ícones `CalendarPlus`, `CalendarCheck`, `CalendarX`, `CalendarClock`, `ChevronLeft`, `ChevronRight` e o tipo `LucideIcon` (Task 4);
  - `useT` e `useLocaleDeData` (`hooks/i18n/`);
  - `date-fns` (`format` e `addDays`).
- Produces:
  - `export type TipoDeData = "criacao" | "ganho" | "perda" | "agendado"`;
  - `export type Periodo = { tipo: TipoDeData; de?: string; ate?: string }` (`AAAA-MM-DD`);
  - `export type CalendarioDePeriodoProps`;
  - `export function CalendarioDePeriodo(props: { valor: Periodo; aoMudar: (p: Periodo) => void; tiposDisponiveis?: TipoDeData[] })`.

  Comportamento:
  - componente controlado: todo clique chama `aoMudar`;
  - o primeiro clique num dia dá `{ tipo, de }`. O segundo dá `{ tipo, de, ate }` em ordem. Um terceiro clique recomeça;
  - um atalho dá `{ tipo, de, ate }` e leva o calendário ao mês do `de`;
  - trocar de aba mantém `de` e `ate`;
  - **as 4 abas aparecem sempre.** As que não estão em `tiposDisponiveis` (padrão: as 4) ficam **desligadas**: `disabled`, dica `title` = "Em breve", sem clique, e as setas ←/→ pulam por cima delas. O nome acessível (`aria-label`) continua o nome do tipo. A V4 passa `["criacao", "ganho", "perda"]` e a aba do relógio ("Data agendada") fica desligada (decisão D3 da V4).

  A V4 põe este componente dentro de `<PainelSuspenso className="w-auto p-0">`, aberto pelo `GatilhoDeFiltro` "Data".

**Detalhes visuais (print `2026-10-15-filtro-data-aberto.png`, recortes `datatabs.png` e `essasemana.png`, em px de CSS):**
- painel de ≈742px: coluna esquerda de 184px com borda direita `#E8E4F5`, mais a área dos meses;
- abas de tipo: 4 de **34×23px**, gap 8 e padding 12. A soma (4×34 + 3×8 + 2×12 = 184) bate com a coluna; os "42×23" do design system somam 192 e não cabem. Só as pontas do grupo têm canto (5px). Ativa: fundo `#3E3A6F` e ícone claro. Inativas: fundo `#EFF3FF` e ícone `#3E3A6F`. Ícones de 14px. Linha `#EBEBEB` embaixo;
- atalhos: linhas de 42px com divisórias `#EBEBEB`, texto 0,7rem peso 500 `#3E3A6F` com 12px à esquerda. Hover e ativo em `#597EFF` (o "Essa semana" do print);
- meses: dois lado a lado com 18px entre eles. Cada grade tem 7×32px e 6px de gap, ou seja, 260px. As setas `#CCCCCC` ficam nas pontas (‹ à esquerda do 1º mês e › à direita do 2º). O título fica em minúsculas ("outubro 2026"), 14px peso 500 `#2F2C5D`;
- dias da semana: "DOM SEG TER QUA QUI SEX SÁB", 0,7rem peso 600, maiúsculas;
- células: 32×30, raio 6, gap horizontal 6 e vertical 7, fundo `#F7F7FE` (`casca-dia`, a marca a 4% no branco), número 0,8rem peso 500 na cor da marca (no lugar do `#6C19DE`). Os dias do mês vizinho têm o mesmo estilo (print);
- seleção (UI nova da Clint, `L5t`/`P5t`): os extremos ficam com fundo da marca e texto branco; o meio fica em `casca-marca-suave` com texto da marca. O intervalo selecionado da variante superior ainda não tem print (nº 24 do plano-índice).

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-ui-calendario-de-periodo.test.tsx`:

```tsx
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CalendarioDePeriodo,
  type Periodo,
  type TipoDeData,
} from "@/components/escale/ui/CalendarioDePeriodo";
import { IdiomaProvider } from "@/lib/i18n/IdiomaProvider";

function Controlado({
  inicial,
  aoMudar,
  tipos,
}: {
  inicial: Periodo;
  aoMudar?: (p: Periodo) => void;
  tipos?: TipoDeData[];
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <CalendarioDePeriodo
      valor={valor}
      tiposDisponiveis={tipos}
      aoMudar={(p) => {
        setValor(p);
        aoMudar?.(p);
      }}
    />
  );
}

const DATA_BR = /^\d{2}\/\d{2}\/\d{4}$/;
const diasDe = (grupo: HTMLElement) =>
  within(grupo)
    .getAllByRole("button")
    .filter((b) => DATA_BR.test(b.getAttribute("aria-label") ?? ""));

beforeEach(() => {
  // Só o relógio é falso: o user-event continua com os timers de verdade.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 15, 10, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("<CalendarioDePeriodo>", () => {
  it("abre no mês de hoje e no seguinte, com a semana começando no domingo, como no print", () => {
    render(<Controlado inicial={{ tipo: "criacao" }} />);
    const outubro = screen.getByRole("group", { name: "outubro 2026" });
    expect(screen.getByRole("group", { name: "novembro 2026" })).toBeInTheDocument();
    expect(
      within(outubro)
        .getAllByText(/^(DOM|SEG|TER|QUA|QUI|SEX|SÁB)$/)
        .map((e) => e.textContent),
    ).toEqual(["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]);
    const dias = diasDe(outubro);
    expect(dias).toHaveLength(35);
    expect(dias[0]).toHaveAccessibleName("27/09/2026");
    expect(dias[0]).toHaveTextContent("27");
    expect(dias[4]).toHaveAccessibleName("01/10/2026");
    // o dia do mês vizinho tem o mesmo estilo (print)
    expect(dias[0]).toHaveClass("bg-casca-dia", "text-casca-marca", "h-[30px]", "w-8", "rounded-[6px]");
    expect(dias[4]).toHaveClass("bg-casca-dia", "text-casca-marca");
  });

  it("quando o valor já tem data, abre no mês dela", () => {
    render(<Controlado inicial={{ tipo: "criacao", de: "2026-03-05" }} />);
    expect(screen.getByRole("group", { name: "março 2026" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "abril 2026" })).toBeInTheDocument();
  });

  it("escolhe o intervalo em dois cliques, em qualquer ordem, e o terceiro recomeça", async () => {
    const u = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Controlado inicial={{ tipo: "criacao" }} aoMudar={aoMudar} />);
    await u.click(screen.getByRole("button", { name: "20/10/2026" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "criacao", de: "2026-10-20" });
    await u.click(screen.getByRole("button", { name: "12/10/2026" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "criacao", de: "2026-10-12", ate: "2026-10-20" });
    expect(screen.getByRole("button", { name: "12/10/2026" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "20/10/2026" })).toHaveClass("bg-casca-marca", "text-accent-foreground");
    expect(screen.getByRole("button", { name: "15/10/2026" })).toHaveAttribute("data-no-intervalo");
    expect(screen.getByRole("button", { name: "15/10/2026" })).toHaveClass("bg-casca-marca-suave");
    expect(screen.getByRole("button", { name: "21/10/2026" })).not.toHaveAttribute("data-no-intervalo");
    expect(screen.getByRole("status")).toHaveTextContent("De 12/10/2026 a 20/10/2026");
    await u.click(screen.getByRole("button", { name: "05/11/2026" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "criacao", de: "2026-11-05" });
    expect(screen.getByRole("status")).toHaveTextContent("A partir de 05/11/2026");
  });

  it("os atalhos da Clint, na ordem, com o ativo em azul; o mês acompanha", async () => {
    const u = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Controlado inicial={{ tipo: "ganho" }} aoMudar={aoMudar} />);
    const atalhos = screen.getByRole("list", { name: "Atalhos de período" });
    expect(within(atalhos).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Hoje",
      "Ontem",
      "Essa semana",
      "Semana passada",
      "Esse mês",
      "Mês passado",
      "Esse ano",
    ]);
    await u.click(screen.getByRole("button", { name: "Essa semana" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "ganho", de: "2026-10-11", ate: "2026-10-17" });
    expect(screen.getByRole("button", { name: "Essa semana" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Essa semana" })).toHaveClass("text-casca-novo");
    expect(screen.getByRole("button", { name: "Hoje" })).toHaveClass("text-casca-texto-2");
    await u.click(screen.getByRole("button", { name: "Mês passado" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "ganho", de: "2026-09-01", ate: "2026-09-30" });
    expect(screen.getByRole("group", { name: "setembro 2026" })).toBeInTheDocument();
  });

  it("as quatro abas de tipo: só as pontas com canto, a ativa escura, e trocar mantém o período", async () => {
    const u = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Controlado inicial={{ tipo: "criacao", de: "2026-10-01", ate: "2026-10-05" }} aoMudar={aoMudar} />);
    const abas = screen.getByRole("tablist", { name: "Tipo de data" });
    const todas = within(abas).getAllByRole("tab");
    expect(todas.map((a) => a.getAttribute("aria-label"))).toEqual([
      "Data de criação",
      "Data de ganho",
      "Data de perda",
      "Data agendada",
    ]);
    expect(todas[0]).toHaveAttribute("aria-selected", "true");
    expect(todas[0]).toHaveClass("bg-casca-texto-2", "rounded-l-[5px]", "h-[23px]", "w-[34px]");
    expect(todas[1]).toHaveClass("bg-casca-raia", "text-casca-texto-2");
    expect(todas[1]).not.toHaveClass("rounded-l-[5px]");
    expect(todas[3]).toHaveClass("rounded-r-[5px]");
    await u.click(screen.getByRole("tab", { name: "Data de perda" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "perda", de: "2026-10-01", ate: "2026-10-05" });
    await u.keyboard("{ArrowRight}");
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "agendado", de: "2026-10-01", ate: "2026-10-05" });
    expect(screen.getByRole("tab", { name: "Data agendada" })).toHaveFocus();
  });

  it("tiposDisponiveis desliga as outras abas (dica 'Em breve'), e as setas pulam as desligadas", async () => {
    const u = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Controlado inicial={{ tipo: "perda" }} tipos={["criacao", "ganho", "perda"]} aoMudar={aoMudar} />);
    const todas = within(screen.getByRole("tablist", { name: "Tipo de data" })).getAllByRole("tab");
    // As 4 abas continuam no lugar, como no print; só a de fora da lista desliga.
    expect(todas).toHaveLength(4);
    const agendada = screen.getByRole("tab", { name: "Data agendada" });
    expect(agendada).toBeDisabled();
    expect(agendada).toHaveAttribute("title", "Em breve");
    expect(agendada).toHaveClass("rounded-r-[5px]");
    expect(screen.getByRole("tab", { name: "Data de ganho" })).toBeEnabled();
    await u.click(agendada);
    expect(aoMudar).not.toHaveBeenCalled();
    act(() => screen.getByRole("tab", { name: "Data de perda" }).focus());
    await u.keyboard("{ArrowRight}");
    // De "perda" a seta pula a desligada e volta ao começo.
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "criacao" });
    expect(screen.getByRole("tab", { name: "Data de criação" })).toHaveFocus();
  });

  it("as setas andam um mês", async () => {
    const u = userEvent.setup();
    render(<Controlado inicial={{ tipo: "criacao" }} />);
    await u.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByRole("group", { name: "novembro 2026" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "dezembro 2026" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "outubro 2026" })).toBeNull();
    await u.click(screen.getByRole("button", { name: "Mês anterior" }));
    await u.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByRole("group", { name: "setembro 2026" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "outubro 2026" })).toBeInTheDocument();
  });

  it("os dias andam pelo teclado (setas) e o Enter escolhe", async () => {
    const u = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Controlado inicial={{ tipo: "criacao", de: "2026-10-15", ate: "2026-10-15" }} aoMudar={aoMudar} />);
    const quinze = screen.getByRole("button", { name: "15/10/2026" });
    expect(quinze).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("button", { name: "16/10/2026" })).toHaveAttribute("tabindex", "-1");
    act(() => quinze.focus());
    await u.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "16/10/2026" })).toHaveFocus();
    await u.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "23/10/2026" })).toHaveFocus();
    await u.keyboard("{Enter}");
    expect(aoMudar).toHaveBeenLastCalledWith({ tipo: "criacao", de: "2026-10-23" });
  });

  it("em espanhol, meses, dias, atalhos e abas mudam", () => {
    render(
      <IdiomaProvider locale="es">
        <Controlado inicial={{ tipo: "criacao" }} />
      </IdiomaProvider>,
    );
    expect(screen.getByRole("group", { name: "octubre 2026" })).toBeInTheDocument();
    expect(screen.getAllByText("LUN")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Esta semana" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Fecha de creación" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-ui-calendario-de-periodo.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/components/escale/ui/CalendarioDePeriodo"`.

- [ ] **Step 3: Implementar**

Create `components/escale/ui/CalendarioDePeriodo.tsx`:

```tsx
"use client";
import { addDays, format } from "date-fns";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { useLocaleDeData } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import {
  ATALHOS_DE_PERIODO,
  atalhoDoPeriodo,
  dataDoIso,
  dentroDoIntervalo,
  diasDoMes,
  formatarDataBr,
  isoDaData,
  mesVizinho,
  ordenarIntervalo,
  periodoDoAtalho,
  type AtalhoDePeriodo,
} from "@/lib/escale/ui/periodos";
import {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O CALENDÁRIO DE PERÍODO DA CASCA (fork Escale, casca igual à Clint V1).
 *
 * O "Data" da Clint (menu superior), medido no print do usuário de 15/10:
 * coluna de 184px com as 4 abas de tipo (criação, ganho, perda, agendada) e
 * os atalhos (Hoje … Esse ano); ao lado, dois meses com a semana começando
 * no domingo. O intervalo se escolhe com dois cliques, em qualquer ordem.
 * Na tela, toda data é dd/mm/aaaa.
 *
 * Os números dos dias e a seleção usam a cor da marca da organização no
 * lugar do roxo da Clint. Os nomes das abas e o visual do intervalo
 * selecionado da variante superior ainda não têm print (nº 24 do plano-índice).
 *
 * As 4 abas aparecem sempre. As que não estão em `tiposDisponiveis` ficam
 * desligadas, com a dica "Em breve", e as setas pulam por cima delas.
 */
export type TipoDeData = "criacao" | "ganho" | "perda" | "agendado";
export type Periodo = { tipo: TipoDeData; de?: string; ate?: string };
export type CalendarioDePeriodoProps = {
  valor: Periodo;
  aoMudar: (p: Periodo) => void;
  tiposDisponiveis?: TipoDeData[];
};

const TIPOS_DE_DATA: readonly TipoDeData[] = ["criacao", "ganho", "perda", "agendado"];

const ROTULO_DO_TIPO = {
  criacao: "Data de criação",
  ganho: "Data de ganho",
  perda: "Data de perda",
  agendado: "Data agendada",
} as const satisfies Record<TipoDeData, string>;

const ICONE_DO_TIPO: Record<TipoDeData, LucideIcon> = {
  criacao: CalendarPlus,
  ganho: CalendarCheck,
  perda: CalendarX,
  agendado: CalendarClock,
};

const ROTULO_DO_ATALHO = {
  hoje: "Hoje",
  ontem: "Ontem",
  "essa-semana": "Essa semana",
  "semana-passada": "Semana passada",
  "esse-mes": "Esse mês",
  "mes-passado": "Mês passado",
  "esse-ano": "Esse ano",
} as const satisfies Record<AtalhoDePeriodo, string>;

const DIA_DA_SEMANA = {
  0: "DOM",
  1: "SEG",
  2: "TER",
  3: "QUA",
  4: "QUI",
  5: "SEX",
  6: "SÁB",
} as const;
const ORDEM_DOS_DIAS = [0, 1, 2, 3, 4, 5, 6] as const;

const PASSO_DA_TECLA: Partial<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

const FOCO = "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca";

type Mes = { ano: number; mes0: number };

function mesDe(data: Date): Mes {
  return { ano: data.getFullYear(), mes0: data.getMonth() };
}

type GradeDoMesProps = {
  mes: Mes;
  titulo: string;
  idBase: string;
  valor: Periodo;
  focado: string | undefined;
  diasDaSemana: readonly string[];
  navegacao: ReactNode;
  ladoDaNavegacao: "esquerda" | "direita";
  aoEscolher: (iso: string) => void;
  aoTeclar: (e: KeyboardEvent<HTMLDivElement>) => void;
};

function GradeDoMes({
  mes,
  titulo,
  idBase,
  valor,
  focado,
  diasDaSemana,
  navegacao,
  ladoDaNavegacao,
  aoEscolher,
  aoTeclar,
}: GradeDoMesProps) {
  const idDoTitulo = `${idBase}-titulo-${mes.ano}-${mes.mes0}`;
  const vazio = <span aria-hidden className="size-6" />;
  return (
    <div role="group" aria-labelledby={idDoTitulo} className="w-[260px]">
      <div className="mb-4 flex h-7 items-center justify-between">
        {ladoDaNavegacao === "esquerda" ? navegacao : vazio}
        <p id={idDoTitulo} className="text-sm font-medium text-casca-texto">
          {titulo}
        </p>
        {ladoDaNavegacao === "direita" ? navegacao : vazio}
      </div>
      <div aria-hidden className="mb-3 grid grid-cols-7 gap-x-1.5">
        {diasDaSemana.map((dia) => (
          <span key={dia} className="text-center text-[0.7rem] font-semibold uppercase text-casca-texto">
            {dia}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-x-1.5 gap-y-[7px]" onKeyDown={aoTeclar}>
        {diasDoMes(mes.ano, mes.mes0).map((d) => {
          const extremo = d.iso === valor.de || d.iso === valor.ate;
          const noMeio = dentroDoIntervalo(d.iso, valor.de, valor.ate);
          return (
            <button
              key={d.iso}
              id={d.doMes ? `${idBase}-dia-${d.iso}` : undefined}
              type="button"
              tabIndex={d.doMes && d.iso === focado ? 0 : -1}
              aria-label={formatarDataBr(d.iso)}
              aria-pressed={extremo}
              data-no-intervalo={noMeio ? "" : undefined}
              data-fora-do-mes={d.doMes ? undefined : ""}
              onClick={() => aoEscolher(d.iso)}
              className={cn(
                "h-[30px] w-8 rounded-[6px] text-[0.8rem] font-medium transition-colors duration-fast ease-out",
                FOCO,
                extremo
                  ? "bg-casca-marca text-accent-foreground"
                  : noMeio
                    ? "bg-casca-marca-suave text-casca-marca"
                    : "bg-casca-dia text-casca-marca hover:bg-casca-marca-suave",
              )}
            >
              {Number(d.iso.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarioDePeriodo({ valor, aoMudar, tiposDisponiveis = [...TIPOS_DE_DATA] }: CalendarioDePeriodoProps) {
  const t = useT();
  const locale = useLocaleDeData();
  const idBase = useId();
  const [hoje] = useState(() => new Date());
  const [primeiro, setPrimeiro] = useState<Mes>(() => mesDe(valor.de ? dataDoIso(valor.de) : new Date()));
  const [foco, setFoco] = useState<string | null>(null);
  const segundo = mesVizinho(primeiro.ano, primeiro.mes0, 1);

  const visiveis = [...diasDoMes(primeiro.ano, primeiro.mes0), ...diasDoMes(segundo.ano, segundo.mes0)]
    .filter((d) => d.doMes)
    .map((d) => d.iso);
  const focado = [foco, valor.de].find((iso): iso is string => !!iso && visiveis.includes(iso)) ?? visiveis[0];
  const atalhoAtivo = valor.de && valor.ate ? atalhoDoPeriodo(valor.de, valor.ate, hoje) : null;
  const diasDaSemana = ORDEM_DOS_DIAS.map((i) => t(DIA_DA_SEMANA[i]));
  const titulo = (mes: Mes) => format(new Date(mes.ano, mes.mes0, 1), "LLLL yyyy", { locale });
  const resumo =
    valor.de && valor.ate
      ? t("De {de} a {ate}").replace("{de}", formatarDataBr(valor.de)).replace("{ate}", formatarDataBr(valor.ate))
      : valor.de
        ? t("A partir de {de}").replace("{de}", formatarDataBr(valor.de))
        : "";

  function escolherTipo(tipo: TipoDeData) {
    if (tipo !== valor.tipo) aoMudar({ ...valor, tipo });
  }

  function escolherAtalho(atalho: AtalhoDePeriodo) {
    const periodo = periodoDoAtalho(atalho, hoje);
    setPrimeiro(mesDe(dataDoIso(periodo.de)));
    setFoco(periodo.de);
    aoMudar({ tipo: valor.tipo, ...periodo });
  }

  function escolherDia(iso: string) {
    setFoco(iso);
    if (valor.de && !valor.ate) {
      aoMudar({ tipo: valor.tipo, ...ordenarIntervalo(valor.de, iso) });
      return;
    }
    aoMudar({ tipo: valor.tipo, de: iso });
  }

  function navegar(passo: 1 | -1) {
    setPrimeiro((mes) => mesVizinho(mes.ano, mes.mes0, passo));
  }

  function teclaNasAbas(e: KeyboardEvent<HTMLDivElement>) {
    const passo = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (passo === 0) return;
    e.preventDefault();
    const total = tiposDisponiveis.length;
    const atual = tiposDisponiveis.indexOf(valor.tipo);
    const proximo = tiposDisponiveis[(atual + passo + total) % total];
    if (!proximo) return;
    escolherTipo(proximo);
    document.getElementById(`${idBase}-aba-${proximo}`)?.focus();
  }

  function teclaNosDias(e: KeyboardEvent<HTMLDivElement>) {
    const passo = PASSO_DA_TECLA[e.key];
    if (passo === undefined || !focado) return;
    e.preventDefault();
    const alvo = isoDaData(addDays(dataDoIso(focado), passo));
    if (!visiveis.includes(alvo)) return;
    setFoco(alvo);
    document.getElementById(`${idBase}-dia-${alvo}`)?.focus();
  }

  const seta = (passo: 1 | -1) => (
    <button
      type="button"
      onClick={() => navegar(passo)}
      aria-label={passo === -1 ? t("Mês anterior") : t("Próximo mês")}
      className={cn(
        "grid size-6 place-items-center rounded-[6px] text-casca-seta transition-colors duration-fast ease-out hover:text-casca-suave",
        FOCO,
      )}
    >
      {passo === -1 ? <ChevronLeft aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-4" />}
    </button>
  );

  return (
    <div data-calendario-de-periodo="" className="flex w-[742px] max-w-full text-casca-texto">
      <div className="flex w-[184px] shrink-0 flex-col border-r border-casca-borda">
        <div
          role="tablist"
          aria-label={t("Tipo de data")}
          onKeyDown={teclaNasAbas}
          className="flex gap-2 border-b border-casca-divisoria p-3"
        >
          {TIPOS_DE_DATA.map((tipo, i) => {
            const Icone = ICONE_DO_TIPO[tipo];
            const ativo = tipo === valor.tipo;
            // As 4 abas ficam sempre no lugar (print); a que não vale ainda fica desligada.
            const disponivel = tiposDisponiveis.includes(tipo);
            return (
              <button
                key={tipo}
                id={`${idBase}-aba-${tipo}`}
                type="button"
                role="tab"
                aria-selected={ativo}
                tabIndex={ativo ? 0 : -1}
                disabled={!disponivel}
                aria-label={t(ROTULO_DO_TIPO[tipo])}
                title={disponivel ? t(ROTULO_DO_TIPO[tipo]) : t("Em breve")}
                onClick={() => escolherTipo(tipo)}
                className={cn(
                  "grid h-[23px] w-[34px] place-items-center transition-colors duration-fast ease-out disabled:cursor-not-allowed disabled:opacity-40",
                  FOCO,
                  i === 0 && "rounded-l-[5px]",
                  i === TIPOS_DE_DATA.length - 1 && "rounded-r-[5px]",
                  ativo ? "bg-casca-texto-2 text-surface" : "bg-casca-raia text-casca-texto-2",
                )}
              >
                <Icone aria-hidden className="size-3.5" />
              </button>
            );
          })}
        </div>
        <ul aria-label={t("Atalhos de período")} className="flex flex-col">
          {ATALHOS_DE_PERIODO.map((atalho) => (
            <li key={atalho} className="border-b border-casca-divisoria last:border-b-0">
              <button
                type="button"
                aria-pressed={atalhoAtivo === atalho}
                onClick={() => escolherAtalho(atalho)}
                className={cn(
                  "flex h-[42px] w-full items-center pl-3 text-left text-[0.7rem] font-medium transition-colors duration-fast ease-out hover:text-casca-novo focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-casca-marca",
                  atalhoAtivo === atalho ? "text-casca-novo" : "text-casca-texto-2",
                )}
              >
                {t(ROTULO_DO_ATALHO[atalho])}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-[18px] px-2.5 py-4">
        <GradeDoMes
          mes={primeiro}
          titulo={titulo(primeiro)}
          idBase={idBase}
          valor={valor}
          focado={focado}
          diasDaSemana={diasDaSemana}
          navegacao={seta(-1)}
          ladoDaNavegacao="esquerda"
          aoEscolher={escolherDia}
          aoTeclar={teclaNosDias}
        />
        <GradeDoMes
          mes={segundo}
          titulo={titulo(segundo)}
          idBase={idBase}
          valor={valor}
          focado={focado}
          diasDaSemana={diasDaSemana}
          navegacao={seta(1)}
          ladoDaNavegacao="direita"
          aoEscolher={escolherDia}
          aoTeclar={teclaNosDias}
        />
      </div>
      <p role="status" className="sr-only">
        {resumo}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar (com as cercas de i18n, data, seleção e classes)**

```bash
corepack pnpm vitest run tests/unit/escale-ui-calendario-de-periodo.test.tsx tests/unit/escale-ui-periodos.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/i18n-a-data-segue-o-idioma.test.ts tests/unit/selecao-longa-tem-busca.test.ts tests/unit/tailwind-tokens.test.ts
```
Expected: PASS.
- Se a cerca de i18n acusar "dado do operador", algum `t()` recebeu um parâmetro solto. Troque por `t(TABELA[chave])`.
- Se o `eslint` reclamar de pureza mais tarde (Task 14), confira que `new Date()` só aparece nos inicializadores do `useState`.

- [ ] **Step 5: Commit**

```bash
git add components/escale/ui/CalendarioDePeriodo.tsx tests/unit/escale-ui-calendario-de-periodo.test.tsx
git commit -m "feat(escale): CalendarioDePeriodo (o Data da Clint: tipos, atalhos e dois meses)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Conferência visual com os prints (vitrine TEMPORÁRIA, não vai para o repositório)

**Files:**
- Create (temporários, apagados no Step 5): `app/vitrine-casca/page.tsx`, `app/vitrine-casca/_client.tsx`

**Interfaces:**
- Consumes: os seis componentes, os tokens, a fonte e os ícones.
- Produces: o relatório da conferência, com a lista das diferenças que sobraram em relação aos prints da Clint. Não produz commit.

**Por que uma vitrine e onde:** o repositório já tem o padrão `app/vitrine-agenda/` (rota `noindex`, fora de `app/app/**`, onde toda rota precisa de porta na navegação). Este plano copia esse padrão só para OLHAR. A vitrine não é commitada: o `git status` do Step 5 prova isso. Ela se marca com `data-escale-casca` sozinha, então os tokens e a Poppins valem mesmo fora do `/app`. As telas reais com estes componentes chegam na V2, na V3 e na V4.

- [ ] **Step 0: Onde conferir (regra única dos planos V1 a V4, contrato "Conferência visual")**

Da raiz do repositório:

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
if test -s .env.local \
  && grep -Eq '^NEXT_PUBLIC_SUPABASE_URL=.?https?://(127\.0\.0\.1|localhost)[:/]' .env.local \
  && ! grep -Eq 'jsrzgxyioczdgwiklkrc|hwpnnstguqrfhfnsvthv|escaleia\.com' .env.local; then
  echo "CAMINHO A: local, com banco de teste"
else
  echo "CAMINHO B: conferir depois do deploy"
fi
```

- **`CAMINHO A`** (existe `.env.local` e ele aponta para um Supabase local, não para o de produção): siga os Steps 1 a 5 abaixo.
- **`CAMINHO B`** (o normal hoje: em 16/10 não havia `.env.local`):
  - **não** crie `.env.local`, **não** suba o Supabase local nem o Docker sem o "pode fazer" do usuário e **nunca** aponte o dev server para o banco de produção (`jsrzgxyioczdgwiklkrc`) nem para o antigo (`hwpnnstguqrfhfnsvthv`);
  - pule os Steps 1 a 5 (a vitrine não é criada) e siga para a Task 14. No PR, a linha da conferência diz "pendente: depois do deploy, pela regra do contrato";
  - **depois do deploy** (quando o usuário avisar que mergeou, publicou a versão e atualizou a VPS; nada disso é deste plano): carregue a skill `chrome-browser` e as ferramentas do Claude in Chrome (`mcp__claude-in-chrome__*`) num único ToolSearch e trabalhe numa aba nova. Abra https://app.escaleia.com com a sessão do próprio usuário (se pedir login, PARE e peça para ele entrar; nunca digite senha) e ligue a casca com `https://app.escaleia.com/app/escale/menu?usar=topo&voltar=%2Fapp%2Fkanban` (só grava o cookie de preferência). **Só leitura:** navegar, abrir e fechar menus (Esc), passar o mouse, ler a página, medir com `javascript_tool` e tirar captura. Proibido arrastar card, criar, editar, salvar, arquivar, excluir ou mudar configuração: é o banco de produção. Janela com `resize_window` 1536×~880. Na V1 a tela real só mostra a **fonte**: confira que as telas da casca estão em Poppins (400/500/600) e que nada mudou de lugar. Os componentes da V1 são comparados com `datatabs.png`, `essasemana.png`, `filterbar.png`, `2026-10-15-filtro-data-aberto.png` e `2026-10-15-barra-de-filtros.png` na conferência da V2 (botão "Novo +", painel do "?") e da V4 (gatilhos, calendário, caixinha e seletor), onde eles aparecem na tela;
  - a lista das diferenças (cada uma com o porquê) vai num **PR de correção**: branch `fix/casca-clint-v1-conferencia` a partir de `escale-crm/main`, cada conserto com o teste da peça, commits com o rodapé `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, PR para `rgisjr/escale-crm` com o corpo terminando em `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Sem push em `origin`, sem merge, sem release, sem VPS.

- [ ] **Step 1: Criar a vitrine temporária (só no CAMINHO A)**

Create `app/vitrine-casca/page.tsx`:

```tsx
import type { Metadata } from "next";

import { VitrineDaCasca } from "./_client";

// TEMPORÁRIO (casca Clint V1, Task 13): só para conferir com os prints. Não commitar.
export const metadata: Metadata = {
  title: "Vitrine da casca",
  robots: { index: false, follow: false },
};

export default function VitrineDaCascaPage() {
  return <VitrineDaCasca />;
}
```

Create `app/vitrine-casca/_client.tsx`:

```tsx
"use client";
import { useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { CalendarioDePeriodo, type Periodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { GatilhoDeFiltro } from "@/components/escale/ui/GatilhoDeFiltro";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Download, HelpCircle, Plus, RefreshCw, Settings } from "@/lib/ui/icons-da-casca";

// TEMPORÁRIO (casca Clint V1, Task 13): só para conferir com os prints. Não commitar.
export function VitrineDaCasca() {
  const [periodo, setPeriodo] = useState<Periodo>({ tipo: "criacao" });
  const [marcada, setMarcada] = useState<boolean | "indeterminada">("indeterminada");
  const [dono, setDono] = useState<string>("");
  return (
    <div data-escale-casca="" className="min-h-dvh bg-surface p-8 font-sans text-casca-texto">
      <div className="mb-10 flex items-center gap-4">
        <BotaoDaCasca variante="marca">
          Negócio <Plus />
        </BotaoDaCasca>
        <BotaoDaCasca variante="novo">
          Novo <Plus />
        </BotaoDaCasca>
        <BotaoDaCasca variante="texto">+ Adicionar negócio</BotaoDaCasca>
        <BotaoDaCasca variante="icone" aria-label="Atualizar">
          <RefreshCw />
        </BotaoDaCasca>
        <BotaoDaCasca variante="icone" aria-label="Exportar">
          <Download />
        </BotaoDaCasca>
        <BotaoDaCasca variante="icone" aria-label="Configurações">
          <Settings />
        </BotaoDaCasca>
        <BotaoDaCasca variante="icone" aria-label="Ajuda">
          <HelpCircle />
        </BotaoDaCasca>
      </div>
      <div className="mb-10 flex items-center gap-4">
        <Popover defaultOpen>
          <PopoverTrigger asChild>
            <GatilhoDeFiltro rotulo="Data" />
          </PopoverTrigger>
          <PainelSuspenso className="w-auto p-0">
            <CalendarioDePeriodo valor={periodo} aoMudar={setPeriodo} />
          </PainelSuspenso>
        </Popover>
        <GatilhoDeFiltro rotulo="Campos" />
        <GatilhoDeFiltro rotulo="Tags" />
        <GatilhoDeFiltro rotulo="Dono do negócio" />
        <GatilhoDeFiltro rotulo="Status" contagem={1} />
        <GatilhoDeFiltro rotulo="Mais filtros" />
      </div>
      <div className="mt-[480px] flex items-center gap-8">
        <CaixaDaCasca marcada={marcada} aoMudar={setMarcada} rotulo="Selecionar todos" />
        <div className="w-64">
          <SeletorDaCasca
            valor={dono}
            vazio="Todos"
            aria-label="Dono do negócio"
            aoMudar={setDono}
            opcoes={[
              { valor: "ana", rotulo: "Ana" },
              { valor: "bia", rotulo: "Bia" },
              { valor: "caio", rotulo: "Caio", desabilitada: true },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Subir o servidor e ligar a casca**

```bash
corepack pnpm dev
```
(Rode em segundo plano e anote a porta que o Next imprimir, normalmente 3000.)

No navegador:
1. Entre no app (login local) e abra `http://localhost:3000/app/escale/menu?usar=topo`. Isso grava o cookie da casca e confirma, nas telas de hoje, que a fonte virou Poppins.
2. Abra `http://localhost:3000/vitrine-casca`.
3. Deixe o zoom do navegador em **125%** (a escala dos prints). Assim os pixels batem com os PNGs sem dividir por 1,25.

- [ ] **Step 3: Comparar lado a lado com os prints**

Abra com a ferramenta Read (ou num visualizador de imagens) e compare com a vitrine:
- `docs/escale/clint/prints-do-usuario/2026-10-15-filtro-data-aberto.png` contra o "Data" aberto da vitrine:
  - gatilho escuro, painel, abas, atalhos e os dois meses;
  - hoje é 15/10/2026, então devem aparecer outubro e novembro de 2026, como no print;
- `docs/escale/clint/crops/datatabs.png`: as 4 abas (34×23, só as pontas com canto);
- `docs/escale/clint/crops/essasemana.png`: a cor do atalho em hover;
- `docs/escale/clint/prints-do-usuario/2026-10-15-barra-de-filtros.png` e `docs/escale/clint/crops/filterbar.png`:
  - os seis gatilhos em repouso;
  - passe o mouse em "Dono do negócio" para ver o hover;
  - o selo do "Status 1";
- `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-010-kanban-v1.png`: o "Negócio +" (≈95×31 com raio 6) e o "Novo +" (≈53×22);
- o tema escuro (troque pelo menu do avatar) só precisa ficar legível, porque a Clint escura não tem print.

Confira, item a item:
- fonte Poppins;
- tamanhos (11,2px nos gatilhos e 0,8rem nos dias);
- cores (`#3E3A6F`, `#2F2C5D`, `#EFF3FF`, `#F7F7FE` tingido pela marca, `#E0E0E0`, `#EBEBEB`);
- raios e sombra do painel;
- espaçamentos (gap 10 no gatilho, 6/7 entre as células, 18 entre os meses, linhas de 42px nos atalhos).

Os ajustes de medida voltam para o componente da Task correspondente: mude a classe, rode o teste dessa Task e faça um commit `fix(escale): …` com o rodapé `Co-Authored-By`.

- [ ] **Step 4: Escrever o relatório da conferência**

Responda no relatório da tarefa (não em arquivo): uma lista "o que ficou diferente do print e por quê". Diferenças já esperadas, que só precisam ser confirmadas:
- a cor da marca no lugar do roxo, como manda a regra;
- o intervalo selecionado e os nomes das abas, ainda sem print (nº 24);
- o escuro, sem referência.

Toda outra diferença precisa de justificativa ou de ajuste. Diferença sem justificativa = tarefa não pronta.

- [ ] **Step 5: Apagar a vitrine e provar que nada dela fica**

```bash
rm -rf app/vitrine-casca
git status --porcelain
```
Expected: saída vazia (os ajustes do Step 3, se houve, já foram commitados). Pare o `pnpm dev`.

---

### Task 14: Gates e PR

**Files:**
- Nenhum arquivo novo. Só verificação e o PR.

**Interfaces:**
- Consumes: tudo das Tasks 1 a 13.
- Produces: o PR para `rgisjr/escale-crm`. Não mergear, não publicar release e não mexer na VPS.

- [ ] **Step 1: A vitrine não existe mais**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
test ! -e app/vitrine-casca && echo "sem vitrine"
```
Expected: `sem vitrine`.

- [ ] **Step 2: Os gates inteiros**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm cercas 2>&1 | tail -20
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:unit 2>&1 | tail -40
```
Expected:
- `cercas` verde;
- typecheck sem erros novos;
- lint sem erros (warnings antigos podem continuar);
- `test:unit` com falhas SÓ entre as conhecidas desta máquina (ver Global Constraints).

Para provar que uma falha não é regressão, rode o mesmo arquivo em `escale-crm/main` num worktree temporário:

```bash
git worktree add ../wt-main-v1 escale-crm/main && cd ../wt-main-v1 && corepack pnpm install --frozen-lockfile && corepack pnpm vitest run <arquivo> ; cd - && git worktree remove ../wt-main-v1 --force
```

Regressão é o que passa lá e falha aqui. Corrija antes de seguir.

- [ ] **Step 3: Push e PR**

```bash
git push -u escale-crm feat/casca-clint-v1-fundacao
gh pr create -R rgisjr/escale-crm --base main --head feat/casca-clint-v1-fundacao \
  --title "feat(escale): casca igual à Clint V1 — tokens, Poppins, ícones e componentes da casca" \
  --body-file - <<'PR'
## O que muda

Primeira das quatro partes da **casca igual à Clint** (variante com menu superior). Esta parte é a fundação. Nenhuma tela muda de layout. A única mudança visível é a fonte, como explicado abaixo.

- **Tokens da casca** (`casca-*`): cores, raios (6/10/16px) e a sombra do painel, medidos nos prints da Clint. Valem só com a casca ligada:
  - no `globals.css`, o fallback é sempre um token do próprio original;
  - o valor real fica no `escale-tema.css`, dentro de `body:has([data-escale-casca])`.

  Onde a Clint usa o roxo, os tokens `casca-marca*` derivam da cor da marca da organização.
- **Fonte:** a casca passa da Figtree para a **Poppins** (400, 500 e 600), a mesma da Clint. Arquivos `woff2` do Google Fonts (OFL), versionados em `app/fonts/`. Com a casca ligada, as telas de hoje já aparecem em Poppins.
- **Ícones da casca** (`lib/ui/icons-da-casca.ts`, lucide). O barril Phosphor do original não muda.
- **Períodos** (`lib/escale/ui/periodos.ts`): os atalhos da Clint (Hoje … Esse ano) e a grade do mês, com a semana começando no domingo. Datas `AAAA-MM-DD` no calendário local e `dd/mm/aaaa` na tela.
- **Componentes** (`components/escale/ui/`):
  - `BotaoDaCasca`;
  - `GatilhoDeFiltro`;
  - `PainelSuspenso`;
  - `CaixaDaCasca` (checkbox próprio);
  - `SeletorDaCasca` (combobox próprio, com busca a partir de 8);
  - `CalendarioDePeriodo` (o "Data" da Clint: 4 tipos, atalhos e dois meses, com o intervalo em dois cliques).

  Nenhum usa select ou date nativos. Todo texto passa por `t()`, com espanhol.

Sem a casca (`escale_menu` ≠ `topo`), nada muda: provado por `tests/unit/escale-casca-tokens.test.ts`.

## Pendências registradas (sem print da Clint)

- Nomes das 4 abas de tipo de data, visual do intervalo selecionado e o gatilho "Data" com período aplicado: print nº 24 do plano-índice.
- Clint no tema escuro: os valores escuros da casca são derivados, não copiados.

## Verificação

- [ ] `cercas`, `typecheck`, `lint` e `test:unit` (só as falhas conhecidas do Windows).
- [ ] Conferência lado a lado com os prints da Clint (Task 13 do plano): local, se houver banco de teste; senão, **pendente, depois do deploy**, em https://app.escaleia.com com o Claude in Chrome (só leitura), e as diferenças vão num PR de correção (`fix/casca-clint-v1-conferencia`).
- [ ] Na tela, com a casca nova, depois do deploy (usuário): a fonte é Poppins e nada mais muda de lugar.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PR
```
Expected: a URL do PR. Mostre a URL ao usuário e PARE. Merge, tag, release e VPS só com o "pode fazer" dele.

---

## Mudanças no contrato

O contrato (`docs/superpowers/plans/2026-10-16-contrato-casca-igual-a-clint.md`) continua valendo com estes ajustes. V2, V3 e V4 seguem o contrato MAIS esta lista.

1. **Cinco tokens a mais**, necessários para os componentes ficarem iguais à Clint:

   | Token | Claro | Escuro (derivado) | Papel |
   |---|---|---|---|
   | `casca-chevron` | `#7489A8` | `#7D849C` | chevron dos gatilhos e dos seletores |
   | `casca-divisoria` | `#EBEBEB` | `#2A2F42` | divisórias dos atalhos e sob as abas do calendário |
   | `casca-seta` | `#CCCCCC` | `#4A5068` | setas de mês do calendário |
   | `casca-caixa` | `#DFE2FD` | `#2A2F42` | fundo do checkbox vazio |
   | `casca-caixa-borda` | `#D5DCFF` | `#3A4160` | borda do checkbox vazio |

2. **Espelho nos blocos de tema:** os tokens da casca NÃO entram em `[data-theme="light"]` nem em `[data-theme="dark"]` do `globals.css`. O contrato pedia "espelhado em light". Só que `branding-tema-claro-escopavel` exige que o claro cubra exatamente o que o escuro cobre, e o escuro da casca mora no `escale-tema.css` (`[data-theme="dark"] body:has([data-escale-casca])`). O fallback do `:root` é sempre `var(<token do original>)`.
3. **Fallbacks do `:root`:** nunca `var(--color-accent-NNN)` e nenhum nome terminado em `-soft`/`-fg`, por causa da régua da marca e de `branding-pares-pintados` (18/26 pares).
4. **Raios e sombra:** o valor real fica direto no `:root`, porque são usados só por utilitários da casca. A sombra também é redefinida nos dois blocos da casca, mais forte no escuro. Os tons `casca-marca*` e `casca-dia` são declarados no `body` da casca para resolverem com a marca da organização.
5. **Assinaturas:**
   - `BotaoDaCasca` e `GatilhoDeFiltro` são `export const … = forwardRef(…)` (o contrato dizia "function … com forwardRef"). O uso é o mesmo.
   - Tipos exportados a mais: `BotaoDaCascaProps`, `VarianteDoBotaoDaCasca`, `TamanhoDoBotaoDaCasca`, `GatilhoDeFiltroProps`, `PainelSuspensoProps`, `CaixaDaCascaProps`, `OpcaoDoSeletor<V>`, `SeletorDaCascaProps<V>` e `CalendarioDePeriodoProps`.
6. **`PainelSuspenso`:** montado no primitivo do Radix, com a mesma assinatura (`ComponentProps<typeof PopoverContent>`), porque o `tailwind-merge` não resolve `rounded-casca-*`/`shadow-casca-*` contra o `rounded-md`/`shadow-md` do `PopoverContent`. Padrões: `align="start"`, `sideOffset={11}` e sem padding.
7. **`periodos.ts` exporta a mais:** `ATALHOS_DE_PERIODO`, `isoDaData`, `dataDoIso`, `formatarDataBr`, `ordenarIntervalo`, `dentroDoIntervalo`, `mesVizinho` e `atalhoDoPeriodo`. A V4 usa `formatarDataBr` no gatilho "Data" quando chegar o print.
8. **Ícones:** os nomes do contrato `HelpCircle`, `CheckCircle2` e `MoreVertical` existem no lucide 1.52 como apelidos (de `CircleQuestionMark`, `CircleCheck` e `EllipsisVertical`; conferido no `dist` instalado). Entraram também `Check`, `Minus` e `EllipsisVertical`, o nome canônico do ⋮, que a V3 e a V4 usam.
9. **Abas de tipo de data:** 34×23px, e não 42×23. Medido no recorte `datatabs.png`, e a soma bate com a coluna de 184px.
10. **`SeletorDaCasca` com `vazio`:** a opção vazia aparece só quando a busca está vazia.
11. **`CalendarioDePeriodo` com `tiposDisponiveis`:** as 4 abas aparecem sempre; as que não estão na lista ficam desligadas (`disabled`, dica "Em breve", puladas pelas setas). A V4 passa criação, ganho e perda, e a aba do relógio fica desligada.
12. **`className`:** `BotaoDaCasca`, `GatilhoDeFiltro` e `PainelSuspenso` juntam o `className` de quem usa com `cn(...)` e repassam as demais props ao elemento. `CaixaDaCasca`, `SeletorDaCasca` e `CalendarioDePeriodo` não recebem `className` (quem usa embrulha). O nome acessível da `CaixaDaCasca` com `rotulo` é o texto do próprio botão (o `aria-label`, se vier, tem precedência).
13. **Conferência visual:** a regra única dos quatro planos (local só com banco de teste; senão, depois do deploy, no app de produção, só leitura, com o Claude in Chrome, e as diferenças num PR de correção) está no contrato e na Task 13.

## Auto-revisão

| Item do contrato | Onde |
|---|---|
| 20 tokens de cor (`casca-texto` … `casca-escuro`), com os valores claros do contrato | Task 2 (Steps 3–5; teste confere valor a valor) |
| `casca-marca` = `var(--color-accent)`, `-forte` 85% + preto, `-suave` 8%, `-media` 18%, `casca-dia` tom claro da marca | Task 2 (Step 5; teste "tons da marca no próprio body") |
| `:root` com fallback + `@theme inline` + valor real no `escale-tema.css` + bloco escuro | Task 2 (testes 1, 3, 5 e 6) |
| Raios `casca-gatilho` 6, `casca-card` 10, `casca-raia` 16; sombra `casca-painel` | Task 2 |
| "Sem a casca nada muda" | Task 2 (fallback = token do original; todo token do `escale-tema.css` dentro de `body:has([data-escale-casca])`; blocos de tema do original intactos) |
| Poppins 400/500/600 no lugar da Figtree, ajustando `escale-tema.test.ts` | Task 3 |
| `lib/ui/icons-da-casca.ts` com os 21 nomes (mais `Check`, `Minus` e `EllipsisVertical`) | Task 4 |
| `periodos.ts`: `periodoDoAtalho`, `AtalhoDePeriodo`, `diasDoMes` | Task 5 (datas fixas, domingo, viradas de mês e ano, meia-noite) |
| `BotaoDaCasca` (`marca`/`novo`/`texto`/`icone`, `md`/`sm`, forwardRef, 31px na marca) | Task 7 |
| `PainelSuspenso` (branco, raio, `shadow-casca-painel`, `border-casca-borda`) | Task 8 |
| `GatilhoDeFiltro` (texto + chevron, hover `casca-raia`, aberto `casca-escuro` + branco, contagem em selo cinza, para `PopoverTrigger asChild`) | Task 9 |
| `CaixaDaCasca` (`role="checkbox"`, `aria-checked`, Espaço) | Task 10 |
| `SeletorDaCasca` (`combobox`/`listbox`/`option`, teclado, busca a partir de `buscaAPartirDe`=8, grupos, `vazio`) | Task 11 |
| `CalendarioDePeriodo` (`TipoDeData`, `Periodo`, 4 abas com os ícones lucide, atalhos à esquerda, 2 meses com setas, domingo, mês em minúsculas, DOM…SÁB, dois cliques, dd/mm/aaaa) | Task 12 |
| Nenhum select nem date nativo | Tasks 11–12 (teste + cerca `selecao-longa-tem-busca`) |
| Testes em `tests/unit/escale-ui-<nome>.test.tsx` | Tasks 4, 5 e 7–12 |
| Todo texto pt-BR por `t()`, espanhol no bloco do fork | Task 6 + casos "em espanhol" nas Tasks 11 e 12 |
| Critério de pronto visual (lado a lado com o PNG; local só com banco de teste, senão depois do deploy) | Task 13 |
| Abas fora de `tiposDisponiveis` desligadas (a V4 depende disso) | Task 12 |
| Branch `feat/casca-clint-v1-fundacao`, PR para `rgisjr/escale-crm`, rodapés | Tasks 1 e 14 |

Fora deste plano, de propósito:
- telas (topo, painel esquerdo, quadro): V2 a V4;
- a reescrita da Fase 1E;
- os prints que faltam, listados no plano-índice.
