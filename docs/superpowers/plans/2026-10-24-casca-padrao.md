# Casca da Clint como padrão · Plano

> **Para quem executa:** use superpowers:executing-plans, **inline, em Sonnet 5.5** (nunca subagent-driven-development). Um PR só. Sem revisor: mudança pequena e de baixo risco, sem migration, sem auth/RLS. Os passos usam caixas (`- [ ]`) para acompanhar.

**Objetivo:** quem nunca escolheu o menu (inclusive usuário novo) já entra na casca da Clint (menu no topo), e `/app` abre em **Negócios**.

**Arquitetura:** o padrão da chave `escale_menu` passa de `"lateral"` para `"topo"` em `lib/escale/preferencia-de-menu.ts`. Todas as telas que decidem pela casca já passam por `lerPreferenciaDeMenu`, então mudam juntas. A tela inicial ganha uma função pura `homeDaCasca` (fork Escale), usada por `app/app/page.tsx` só quando a casca está ligada.

**Tech Stack:** Next.js (App Router), TypeScript, Vitest, `corepack pnpm`.

## Decisões do usuário (21/10 e 24/10)

| # | Decisão |
|---|---|
| D1 | A casca é o padrão para todos. Quem já clicou em "Voltar ao menu lateral" (cookie `escale_menu=lateral`) continua na lateral. |
| D2 | Com a casca, a tela inicial é **Negócios** (`/app/escale/negocios`). |
| D3 | Publica sozinha, numa versão própria, logo depois do merge (não há frente aberta esperando publicação). |

## Restrições globais

- `pnpm` não está no PATH: sempre `corepack pnpm`. No Git Bash, antes: `export PATH="/c/Program Files/nodejs:$PATH"`.
- PR vai para `rgisjr/escale-crm`, base `main`. **Nunca** push em `origin` (Rafael).
- Durante a execução, só os testes desta mudança + typecheck + eslint dos arquivos alterados. Nada de `test:db` (não há migration) nem rodada cheia.
- Sem organização ativa, `/app/escale/negocios` redireciona para `/app`. Por isso `homeDaCasca` **só** manda para Negócios quando há papel (`role !== null`), senão um admin da plataforma sem organização entraria em laço.
- Não tocar no arquivo não rastreado `docs/superpowers/plans/2026-10-24-fase-1l-editar-etapas-na-aba.md` do `repo/` (é de outra frente).
- Atribuição do commit e do PR: a do system reminder da sessão de execução.

## Arquivos

| Arquivo | Muda | Por quê |
|---|---|---|
| `lib/escale/preferencia-de-menu.ts` | alterado | `MENU_PADRAO = "topo"` e comentário |
| `lib/escale/home-da-casca.ts` | novo | `homeDaCasca(raw, platform, role)` |
| `app/app/page.tsx` | alterado | com a casca, usa `homeDaCasca` |
| `app/app/_components/AppShell.tsx` | alterado | só o comentário da prop `menu` (L21) |
| `tests/unit/escale-home-da-casca.test.ts` | novo | função pura + a página `/app` |
| `tests/unit/escale-preferencia-de-menu.test.ts` | alterado | padrão vira `topo` |
| `tests/unit/escale-com-origens.test.tsx` | alterado | "sem a chave" passa a ser casca |
| `tests/unit/escale-ficha-rotas.test.ts` | alterado | "sem a casca" passa a ser `lateral` explícito |

---

### Task 0: Área de trabalho

- [ ] **Step 1: Worktree a partir da `main` do escale-crm**

No Git Bash, na pasta `repo/`:

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
git fetch escale-crm
git worktree add "../wt-casca-padrao" -b feat/casca-padrao escale-crm/main
cd "../wt-casca-padrao"
export PATH="/c/Program Files/nodejs:$PATH"
corepack pnpm install --frozen-lockfile
```

Esperado: worktree criada em `Deskcom CRM/wt-casca-padrao`, na branch `feat/casca-padrao`, e o install termina sem erro.

---

### Task 1: Casca padrão e `/app` abrindo em Negócios

**Interfaces:**
- Consome: `destinosDaInterface(raw, platform, role)` e `homeDaInterface(raw, platform, role)` de `@/lib/navigation/interface`; `Role` de `@/lib/auth/types`; `COOKIE_DO_MENU` e `lerPreferenciaDeMenu` de `@/lib/escale/preferencia-de-menu`.
- Produz: `NEGOCIOS_DA_CASCA = "/app/escale/negocios"` e `homeDaCasca(raw: unknown, platform: boolean, role: Role | null): string` em `@/lib/escale/home-da-casca`.

- [ ] **Step 1: Teste novo (vai falhar)**

Criar `tests/unit/escale-home-da-casca.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

/** FORK ESCALE: a casca da Clint é o padrão, e com ela `/app` abre em Negócios. */
const estado = vi.hoisted(() => ({
  menu: undefined as string | undefined,
  org: { role: "agent", interface_settings: null } as Record<string, unknown> | null,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) =>
      nome === "escale_menu" && estado.menu ? { value: estado.menu } : undefined,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1", is_platform_admin: false, support: null })),
  resolveActiveOrg: vi.fn(async () => estado.org),
}));

import AppHome from "@/app/app/page";
import { NEGOCIOS_DA_CASCA, homeDaCasca } from "@/lib/escale/home-da-casca";
import { homeDaInterface } from "@/lib/navigation/interface";

beforeEach(() => {
  estado.menu = undefined;
  estado.org = { role: "agent", interface_settings: null };
});

describe("homeDaCasca", () => {
  it("com organização e Negócios à vista, abre em Negócios", () => {
    expect(NEGOCIOS_DA_CASCA).toBe("/app/escale/negocios");
    expect(homeDaCasca({ preset: "completa" }, false, "agent")).toBe(NEGOCIOS_DA_CASCA);
    expect(homeDaCasca(null, false, "viewer")).toBe(NEGOCIOS_DA_CASCA);
  });

  it("a organização escondeu Negócios: a tela inicial de sempre", () => {
    const soProdutos = { preset: "completa", destinos: ["/app/products"] };
    expect(homeDaCasca(soProdutos, false, "admin")).toBe("/app/products");
  });

  it("sem organização ativa, nunca Negócios (a rota de Negócios voltaria para /app, em laço)", () => {
    expect(homeDaCasca(null, true, null)).toBe(homeDaInterface(null, true, null));
    expect(homeDaCasca(null, true, null)).not.toBe(NEGOCIOS_DA_CASCA);
  });
});

describe("a página /app", () => {
  it("sem a chave, vale o padrão (a casca): abre em Negócios", async () => {
    await expect(AppHome()).rejects.toThrow(`REDIRECT ${NEGOCIOS_DA_CASCA}`);
  });

  it("com a casca ligada: Negócios", async () => {
    estado.menu = "topo";
    await expect(AppHome()).rejects.toThrow(`REDIRECT ${NEGOCIOS_DA_CASCA}`);
  });

  it("quem escolheu a lateral fica com a tela inicial do original", async () => {
    estado.menu = "lateral";
    await expect(AppHome()).rejects.toThrow(`REDIRECT ${homeDaInterface(null, false, "agent")}`);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm exec vitest run tests/unit/escale-home-da-casca.test.ts
```

Esperado: FAIL, `Failed to resolve import "@/lib/escale/home-da-casca"`.

- [ ] **Step 3: A função `homeDaCasca`**

Criar `lib/escale/home-da-casca.ts`:

```ts
/**
 * A TELA INICIAL COM A CASCA NOVA (fork Escale): como na Clint, entrar no app abre Negócios.
 *
 * Só vai para Negócios quem tem organização ativa e enxerga "Negócios" (`/app/kanban`)
 * pela interface da organização; o resto segue a regra do original (`homeDaInterface`).
 * O papel é exigido porque, sem organização, `/app/escale/negocios` devolve para `/app`:
 * sem esta trava, um admin da plataforma sem organização ficaria num laço.
 */
import type { Role } from "@/lib/auth/types";
import { destinosDaInterface, homeDaInterface } from "@/lib/navigation/interface";

export const NEGOCIOS_DA_CASCA = "/app/escale/negocios";

export function homeDaCasca(raw: unknown, platform: boolean, role: Role | null): string {
  const veNegocios = destinosDaInterface(raw, platform, role).some((d) => d.href === "/app/kanban");
  return role && veNegocios ? NEGOCIOS_DA_CASCA : homeDaInterface(raw, platform, role);
}
```

- [ ] **Step 4: A página `/app` usa a casca**

Trocar o conteúdo inteiro de `app/app/page.tsx` por:

```tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { homeDaCasca } from "@/lib/escale/home-da-casca";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
import { homeDaInterface } from "@/lib/navigation/interface";
export default async function AppHome() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  const platform = user.is_platform_admin && !user.support;
  const role = org?.role ?? null;
  // Fork Escale: com a casca nova, entrar no app abre Negócios, como na Clint.
  const casca = lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo";
  redirect(
    casca
      ? homeDaCasca(org?.interface_settings, platform, role)
      : homeDaInterface(org?.interface_settings, platform, role),
  );
}
```

- [ ] **Step 5: O padrão vira `topo`**

Em `lib/escale/preferencia-de-menu.ts`, trocar o comentário do topo e a constante:

```ts
/**
 * A CHAVE DA CASCA NOVA (fork Escale): menu no topo + tema Escale, por pessoa.
 *
 * Mora num cookie, como "recolher a barra lateral" (`app/actions/shell/toggleSidebar.ts`):
 * cada pessoa escolhe para si, sem banco e sem mexer nas preferências de interface da
 * organização. Desde 24/10/2026 a casca é o PADRÃO: quem não escolheu nada (inclusive
 * usuário novo) entra nela; quem gravou `lateral` ("Voltar ao menu lateral") continua na lateral.
 */
export type PreferenciaDeMenu = "lateral" | "topo";

export const COOKIE_DO_MENU = "escale_menu";

export const MENU_PADRAO: PreferenciaDeMenu = "topo";
```

Em `app/app/_components/AppShell.tsx`, linha 21, trocar:

```ts
  /** Fork Escale: `"topo"` liga a casca nova (cookie `escale_menu`). Padrão: a lateral do original. */
```

por:

```ts
  /** Fork Escale: `"topo"` liga a casca nova (cookie `escale_menu`, padrão `topo`). Sem a prop: a lateral. */
```

(O valor padrão da prop continua `"lateral"`: quem monta o `AppShell` sem a prop segue igual; o layout sempre passa a prop.)

- [ ] **Step 6: Rodar o teste novo e ver passar**

```bash
corepack pnpm exec vitest run tests/unit/escale-home-da-casca.test.ts
```

Esperado: PASS, 6 testes.

- [ ] **Step 7: Ajustar os testes que esperavam lateral sem cookie**

`tests/unit/escale-preferencia-de-menu.test.ts`, trocar o primeiro `it`:

```ts
  it("o padrão é a casca (topo), e só 'topo' e 'lateral' são valores válidos", () => {
    expect(MENU_PADRAO).toBe("topo");
    expect(lerPreferenciaDeMenu("topo")).toBe("topo");
    expect(lerPreferenciaDeMenu("lateral")).toBe("lateral");
    expect(lerPreferenciaDeMenu("qualquer")).toBe("topo");
    expect(lerPreferenciaDeMenu(undefined)).toBe("topo");
  });
```

`tests/unit/escale-com-origens.test.tsx`, trocar o `it("com a lateral (ou sem a chave), ...")` inteiro por dois:

```tsx
  it("com a lateral, é a tela de sempre e o banco nem é lido", async () => {
    cookies = { escale_menu: "lateral" };
    vi.mocked(lerOrigens).mockClear();
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.queryByRole("complementary", { name: "Origens" })).toBeNull();
    expect(lerOrigens).not.toHaveBeenCalled();
  });

  it("sem a chave, vale o padrão: a casca, com o painel Origens", async () => {
    cookies = {};
    mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(screen.getByRole("complementary", { name: "Origens" })).toBeInTheDocument();
  });
```

`tests/unit/escale-ficha-rotas.test.ts`: nas três linhas `estado.menu = undefined;` (nos testes "sem a casca: o link estável…", "/app/leads/[id]: com a casca, a ficha; sem…" e "quadro com ?lead=: sem a casca…"), trocar por:

```ts
    estado.menu = "lateral";
```

E, dentro do `describe("as portas antigas", ...)`, logo depois do teste `/app/leads/[id]`, acrescentar:

```ts
  it("/app/leads/[id] sem a chave: vale o padrão, a ficha da casca", async () => {
    estado.menu = undefined;
    await expect(LeadPage(params(LEAD))).rejects.toThrow(`REDIRECT /app/negocios/${LEAD}`);
  });
```

- [ ] **Step 8: Rodar os testes tocados + vizinhos de navegação**

```bash
corepack pnpm exec vitest run tests/unit/escale-home-da-casca.test.ts tests/unit/escale-preferencia-de-menu.test.ts tests/unit/escale-com-origens.test.tsx tests/unit/escale-ficha-rotas.test.ts tests/unit/escale-casca-v2-original-intacto.test.tsx tests/unit/interface-por-vinculo.test.ts tests/unit/navegacao-completude.test.ts
```

Esperado: tudo PASS. Se `navegacao-completude` reclamar da página `/app`, ler a mensagem: a página continua só redirecionando, como antes.

Depois, como esta mudança vai sozinha para produção (é a "bateria" dela), a rodada de unitários inteira, **em segundo plano**, para pegar outro teste que dependa do padrão antigo sem citar o cookie:

```bash
corepack pnpm exec vitest run tests/unit --reporter=dot 2>&1 | tail -30
```

Esperado: nenhuma falha nova ligada à casca (falhas conhecidas de ruído do Windows, se aparecerem, não contam; conferir que não citam `escale_menu`, `MENU_PADRAO`, `AppHome` ou casca). Se aparecer falha ligada à casca, ajustar o teste do mesmo jeito do Step 7 (`lateral` explícito onde ele quer a tela de sempre).

- [ ] **Step 9: Typecheck e eslint**

```bash
corepack pnpm typecheck
corepack pnpm exec eslint lib/escale/home-da-casca.ts lib/escale/preferencia-de-menu.ts app/app/page.tsx app/app/_components/AppShell.tsx tests/unit/escale-home-da-casca.test.ts tests/unit/escale-preferencia-de-menu.test.ts tests/unit/escale-com-origens.test.tsx tests/unit/escale-ficha-rotas.test.ts
```

Esperado: sem erro.

- [ ] **Step 10: Reler o próprio diff**

```bash
git diff
```

Conferir: só os 8 arquivos da tabela; nenhum `console.log`; texto de tela novo nenhum (não precisa de espanhol no dicionário).

- [ ] **Step 11: Commit**

```bash
git add lib/escale/home-da-casca.ts lib/escale/preferencia-de-menu.ts app/app/page.tsx app/app/_components/AppShell.tsx tests/unit/escale-home-da-casca.test.ts tests/unit/escale-preferencia-de-menu.test.ts tests/unit/escale-com-origens.test.tsx tests/unit/escale-ficha-rotas.test.ts
git commit -m "feat(escale): a casca da Clint é o padrão e /app abre em Negócios

Quem nunca escolheu o menu (inclusive usuário novo) entra na casca;
quem gravou 'lateral' continua na lateral. Sem organização ativa,
/app segue a regra do original (evita laço com /app/escale/negocios).

<linha de atribuição do system reminder>"
```

---

### Task 2: Entrega até produção

- [ ] **Step 1: Copiar este plano para o repositório e abrir o PR**

```bash
cp "../docs/superpowers/plans/2026-10-24-casca-padrao.md" docs/superpowers/plans/
git add docs/superpowers/plans/2026-10-24-casca-padrao.md
git commit -m "docs(escale): plano da casca padrão

<linha de atribuição do system reminder>"
git push -u escale-crm feat/casca-padrao
gh pr create -R rgisjr/escale-crm --base main --head feat/casca-padrao \
  --title "feat(escale): a casca da Clint é o padrão e /app abre em Negócios" \
  --body "## O que muda
- \`MENU_PADRAO\` passa a \`topo\`: quem não escolheu o menu entra na casca da Clint.
- Quem clicou em \"Voltar ao menu lateral\" (cookie \`escale_menu=lateral\`) continua na lateral.
- Com a casca, \`/app\` abre em Negócios (\`/app/escale/negocios\`); sem Negócios na interface da organização, ou sem organização ativa, segue a regra do original.

## Testes
- \`escale-home-da-casca\` (novo), \`escale-preferencia-de-menu\`, \`escale-com-origens\`, \`escale-ficha-rotas\`, \`escale-casca-v2-original-intacto\`, \`interface-por-vinculo\`, \`navegacao-completude\`.
- typecheck e eslint dos arquivos alterados. Sem migration.

<rodapé de atribuição do system reminder>"
```

- [ ] **Step 2: Merge**

```bash
gh pr merge -R rgisjr/escale-crm --merge --delete-branch=false <número do PR>
git fetch escale-crm
```

- [ ] **Step 3: Tag e release**

Conferir a última tag (`git ls-remote --tags escale-crm 'v1.81.0-escale.*'`; em 24/10 era `v1.81.0-escale.16`). A próxima é `v1.81.0-escale.17`:

```bash
git tag -a v1.81.0-escale.17 escale-crm/main -m "Casca da Clint como padrão; /app abre em Negócios"
git push escale-crm v1.81.0-escale.17
gh release create v1.81.0-escale.17 -R rgisjr/escale-crm --latest \
  --title "v1.81.0-escale.17" \
  --notes "A casca da Clint (menu no topo) passa a ser o padrão para todos; quem escolheu o menu lateral continua nele. Com a casca, entrar no app abre Negócios. Sem migration."
```

- [ ] **Step 4: Esperar as imagens**

Esperar o workflow "Publicar imagem Docker (GHCR)" da tag chegar a `promover-stable: success` (cerca de 10 min), em segundo plano:

```bash
gh run list -R rgisjr/escale-crm --limit 3
gh run view <id> -R rgisjr/escale-crm --json jobs --jq '.jobs[] | "\(.name): \(.conclusion)"'
```

Não rodar o `update.sh` antes: sem a imagem, o preflight para.

- [ ] **Step 5: Backup e update na VPS**

```bash
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'cd /root/DeskcommCRM && bash hostgator-setup-kit/backup.sh'
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'cd /root/DeskcommCRM && nohup bash hostgator-setup-kit/update.sh --to v1.81.0-escale.17 > /root/update-v1.81.0-escale.17.log 2>&1 &'
```

Esperar numa chamada separada (o padrão `[u]` evita o `pgrep` achar a si mesmo):

```bash
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'while pgrep -f "[u]pdate.sh" >/dev/null; do sleep 10; done; tail -20 /root/update-v1.81.0-escale.17.log'
```

Esperado: o log fecha com o app no ar e saudável.

- [ ] **Step 6: Conferir a produção (só leitura)**

```bash
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'docker ps --format "{{.Names}} {{.Image}} {{.Status}}" | grep -i deskcomm; grep -ciE "error|erro" /root/update-v1.81.0-escale.17.log'
curl -s -o /dev/null -w "%{http_code}\n" https://app.escaleia.com/login
curl -s -o /dev/null -w "%{http_code}\n" https://app.escaleia.com/app
```

Esperado: app, worker e scheduler `healthy` na `1.81.0-escale.17`; `/login` 200; `/app` 307; nenhum erro novo no log. Se falhar: `update.sh --to v1.81.0-escale.16` e avisar o usuário.

- [ ] **Step 7: Fechar**

- Remover a worktree: `cd ../repo && git worktree remove ../wt-casca-padrao`.
- `LOG.md` (raiz da pasta Deskcom CRM): entrada nova no topo da linha do tempo ("24/10 — Casca da Clint como padrão → `v1.81.0-escale.17`") e, em "Onde estamos", trocar a linha "Casca nova (menu no topo): desligada por padrão…" por "ligada por padrão desde a escale.17; quem quiser sai em Mais › Voltar ao menu lateral".
- Memória `vps-producao-do-crm.md`: uma linha com a escale.17 e o backup.
- Mensagem curta ao usuário: versão no ar, o que entrou, e o que olhar: abrir o app numa janela anônima, entrar e cair em Negócios com o menu do topo. Quem tinha clicado em "Voltar ao menu lateral" volta à casca pelo link `https://app.escaleia.com/app/escale/menu?usar=topo&voltar=/app`.
