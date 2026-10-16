# V2 — Topo da casca igual à Clint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Com a casca nova ligada (cookie `escale_menu=topo`, tela ≥ 768px), o topo do Escale OS fica igual ao da Clint na variante **menu superior** (print 01-010-kanban-v1.png):
- **barra de 44px**, branca, com borda de baixo de 1px `border-casca-borda`;
- **marca nossa** (`MarcaNoTopo`) no lugar do logo da Clint;
- **7 itens**, nesta ordem: Negócios, Contatos, Atividades, Atendimento (o nosso Conversas, com o selo vermelho "99+" da fila), Automações, Campanhas, Indicadores. Depois vem **⠿ Mais**. O item ativo ganha um bloco de altura inteira `bg-casca-marca-suave` e fica em semibold;
- **Empresas, Agenda e Agentes IA** passam para o Mais;
- **lado direito igual ao da Clint:** ✦ (IA), "?" (ajuda, círculo lilás), botão azul **Novo +** e **avatar quadrado ▾**;
- dentro do menu do avatar ficam: troca de organização, busca ⌘K, central de avisos, idioma, tema, modo administrador e sair. Os atalhos ⌘K e ⌘⇧L continuam valendo em qualquer tela, e o som da central de avisos continua tocando;
- **painel Mais** com o visual do `12-001` (variante lateral; falta print da superior);
- **botão flutuante de conversas** (FAB): círculo de 50px, degradê feito com a cor da marca, balão branco e selo vermelho "+N".

Sem a casca, nada muda: a `TopBar` e a `Sidebar` do original continuam exatamente como estão, e um teste prova isso.

**Architecture:** O plano só mexe em arquivos do fork. **Nenhum arquivo do original muda.**
- **Lógica pura** em `lib/escale/menu-do-topo.ts`: a lista dos 7 itens, as ações do "Novo +", a porta do ✦ e o texto do selo.
- **Peças da tela** em `components/escale/menu/`:
  - `MenuDoTopo` monta a barra e o Mais;
  - `BotaoDaIa`, `AjudaDoTopo`, `NovoDoTopo` e `MenuDaConta` formam o lado direito;
  - `SeloDaCasca` e `ContadorDaFilaDaCasca` desenham o selo vermelho.
- **Peças compartilhadas do original** (`TenantSwitcher`, `SearchTrigger`, `AlertsBell`, `UserMenu`, `SeletorDeIdioma`, `ThemeToggle`, `ContadorDaFila`) não são tocadas nem montadas no topo novo. O menu da conta refaz o que elas fazem:
  - troca de organização e de idioma, por dois ganchos do fork em `hooks/escale/` que repetem a mesma sequência do original;
  - `CommandPalette`, `useAgentInbox` e `useSonsDaCentral` são reaproveitados como estão.
- O `ConversasFlutuante`, que só existe na casca, é reestilizado no lugar.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, Tailwind 4 (tokens da casca da V1), Radix (DropdownMenu, Popover), `lucide-react` (via `@/lib/ui/icons-da-casca`), `react-hotkeys-hook` 5, TanStack Query 5, Vitest + Testing Library.

**Referência visual** (cópias estáveis; no repositório, a V1 copia a pasta para `docs/escale/clint/`):
- `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\contrato-casca-igual-a-clint.md`: nomes e decisões. Este plano consome a V1 sem mudar nome nenhum;
- `...\docs\clint\clint-design-system.md`, §2, §3.3, §4.4, §6.1, §6.5 e §6.13 (px de CSS);
- `...\docs\clint\clint-telas.md`, §1.1 a §1.4, §7, §8 e §9 (px do print: dividir por 1,25);
- `...\docs\clint\inventario-escale.md`, §1 e §5 (cercas);
- recortes em `...\docs\clint\crops\`: top-left.png, top-right.png e fab.png;
- prints:
  - C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-010-kanban-v1.png (topo e FAB);
  - ...\modulos\01-negocios\imagens\01-025-botao-flutuante-conversas.png (painel do FAB, variante lateral);
  - ...\modulos\12-configuracoes-e-mais\imagens\12-001-menu-mais.png (Mais, variante lateral);
- o Escale de hoje: ...\docs\clint\prints-do-usuario\2026-10-15-escale-atual.png.

**Medidas usadas** (print ÷ 1,25). Os prints da variante superior foram cortados à direita em larguras diferentes (1896 a 1919 px), mas o ▾ do avatar termina sempre em x=1901 e o FAB sempre em x=1882. Por isso a janela de referência é **1536px CSS** de largura (1920 ÷ 1,25), e as distâncias da direita saem dessa janela.

| Peça | Medida (px CSS) | Fonte |
|---|---|---|
| Barra | altura 44 com a borda de 1px; marca a 18 da esquerda; 18 entre a marca e o 1º item | 01-010 y 8–62, x 23 e 113 |
| Item | texto 14/400 `#2F2C5D`; padding lateral 9, sem gap entre itens; ativo com fundo de altura inteira, ~74 de largura em "Negócios", em semibold | 01-010 x 113–205; telas §1.1 |
| Selo "99+" | 28×14, `#FF4B4C`, 9px bold branco, 6 depois do rótulo | 01-010 x 517–551, y 27–43 |
| "Mais" | 5 a mais de espaço antes; ícone de 4 pontos (2×2) | 01-010 x 901→930 |
| Lado direito | ▾ termina a 14 da direita; avatar 28×28 com raio 5 e o ▾ 2px depois; Novo 53×22; "?" em círculo de 24; ✦ ~14; **18 entre as peças** | 01-010 x 1668–1901 |
| FAB | 50×50, 30 da direita, 36 da base; selo de 18 que passa 6 para a direita e 1 para cima, com anel branco | 01-001…01-011 x 1820–1882 |

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- **Base:** `escale-crm/main` **com a V1 (fundação) já mergeada**. A Task 1 confere. Sem a V1, PARE e pergunte ao usuário.
- **Branch:** `feat/casca-clint-v2-topo`.
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:**
  - dar push em `origin` (o repositório do Rafael);
  - mergear;
  - publicar release;
  - mexer na VPS ou no banco de produção;
  - rodar o app contra o banco de produção.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.

### Onde o fork entra

- **Nenhum arquivo do original muda nesta parte.** Os arquivos alterados são todos do fork: `lib/escale/menu-do-topo.ts`, `components/escale/menu/*`, `components/escale/ConversasFlutuante.tsx`, `lib/ui/icons-da-casca.ts` (da V1), o bloco do fork no dicionário e os testes `escale-*`.
- O `AppShell` não muda. A cerca `tests/unit/escale-tema.test.ts` exige nele os literais `data-escale-casca={menu === "topo" ? "" : undefined}` e `<MenuDoTopo />`.
- Se alguma task parecer exigir mudança num arquivo do original, PARE e pergunte. Se o usuário aprovar, o trecho leva o comentário `FORK ESCALE · casca V2` e fica com 1 a 10 linhas.
- O dicionário (`lib/i18n/dicionario.ts`) é a exceção combinada: o bloco do fork entra logo ANTES da linha `  // ─── FORK ESCALE · origens (grupos de funis, Fase 1A) ───`, ou seja, no fim do bloco da casca da Fase 0.

### Regras de produto

- **Regra do usuário (16/10):** tudo que se vê e se usa fica IDÊNTICO à Clint, variante menu superior.
  - Só a marca é nossa. Onde a Clint usa o roxo, vai a cor da marca (`casca-marca` e seus tons).
  - O azul do "Novo +" (`bg-casca-novo`) e o vermelho dos selos (`bg-casca-alerta`) são copiados.
- **Sem print, não se inventa.** O que a pasta não mostra fica com o mínimo de visual e o comportamento que já existe, e entra em "Prints que faltam desta parte".
- **Controles:** nenhum `<select>` nem `<input type="date">` nativo, e nenhum `<Button>` do original sem ação (cerca `controle-decorativo`). Usamos `<button>`, `BotaoDaCasca` e os menus Radix.

### Textos e i18n

- Todo texto de tela passa por `t()` com literal e tem espanhol no bloco do fork.
- O script da Task 4 pula as chaves que já existem, **com ou sem aspas** (o dicionário tem chaves como `Mais:` e `Novo:`, sem aspas). Chave repetida quebra o typecheck.

### Commits, PR e testes

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- O corpo do PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Falhas que não são regressão:** testes que falham NESTA máquina Windows e falham igual em `escale-crm/main` (pdfjs com caminho `C:\…`, `spawnSync bash ENOENT`, `chmod 600`, caminho com espaço, `EPERM` em pasta temporária). Ver a memória `sincronizar-com-o-rafael`.
  - Regressão é teste que passa em `escale-crm/main` e falha na branch.
- Esta parte não tem SQL: o `test:db` não precisa rodar.

## Decisões desta parte (e as que vão ao usuário)

| # | Decisão | Por quê | Vai ao usuário? |
|---|---|---|---|
| D1 | **Campanhas** aponta para `/app/campaigns`, o módulo de campanhas que já existe (registro: "Fale com uma lista de contatos…"). Ele fica visível para viewer ou acima | É a tela equivalente | Não |
| D2 | **✦** leva ao hub **"Agente de IA"** (`/app/ai`). Só aparece se a pessoa enxerga alguma tela do grupo IA | O Escale não tem assistente global como a "Aura" da Clint. O hub é a porta de IA mais próxima | **Sim** |
| D3 | **"?"** abre um painel "Ajuda" só com os atalhos que existem (⌘K e ⌘⇧L), **sem selo** | Não há tela de ajuda no Escale, nem fonte para o "2" do selo da Clint. Inventar número é proibido | **Sim** |
| D4 | **"Novo +"** cria Contato (abre a janela de novo contato na própria tela), Campanha (`/app/campaigns/new`, gerente ou acima) e Proposta (`/app/proposals/novo`, agente ou acima, com a capacidade ligada). **Negócio fica de fora** | Criar negócio exige origem e etapa. O "Negócio +" da página do quadro fica com a V4, e o menu da Clint é print que falta | **Sim** |
| D5 | O **avatar** usa a cor da marca como fundo e a inicial em branco | A Clint pinta cada pessoa com uma cor (`#8D6E63` no print), e não temos essa cor por pessoa | **Sim** |
| D6 | Com aviso aberto, o **avatar ganha o selo vermelho** com o número de avisos | O sino saiu do topo. Sem o selo, ninguém veria que há aviso esperando | **Sim** |
| D7 | O seletor de organização sai do topo e entra no menu do avatar. A troca continua a mesma: aviso de transição, server action e documento novo | A Clint não tem seletor de organização no topo | Não |
| D8 | O selo da fila no topo vai até "99+". O do FAB mostra "+9" acima de 9 | Igual aos prints. A regra do "+9" é inferida | Não |
| D9 | O painel do FAB só muda a moldura: 400px de largura, cabeçalho lilás "Conversas" e o FAB vira **X** quando abre (01-025). Busca, "Todos" e ordenação não entram | O conteúdo é de dados e a variante superior é print que falta | Não |
| D10 | O topo passa de 56px para 44px. As páginas que descontam o topo da altura (`_client.tsx` do funil, `QuadroDaVisualizacao`, `PainelOrigens`) ficam com **12px de folga embaixo** até a V3 e a V4, sem quebrar nada. Esta parte não mexe nelas | O ajuste tem dono único (contrato, "Medidas comuns"): a **V3** troca a altura do `PainelOrigens` por `calc(100dvh-2.75rem)`; a **V4** dá ao `_client.tsx` e à `QuadroDaVisualizacao` a classe da casca com `2.75rem` | Não |

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `tests/unit/escale-casca-v2-original-intacto.test.tsx` | novo | prova que sem a casca o topo e a lateral do original não mudam |
| `lib/escale/menu-do-topo.ts` | alterado | 7 itens da Clint, `ACOES_DE_CRIAR`/`acoesDeCriar`, `entradaDaIa`, `textoDoSelo` |
| `tests/unit/escale-menu-do-topo.test.ts` | alterado | lista, Mais, ações, IA, selo |
| `lib/ui/icons-da-casca.ts` | alterado (linha de export) | `Bell, Check, FileText, LogOut, Megaphone, MessageCircleMore, Plus, Search, ShieldCheck, Sparkle, UserPlus, X` |
| `lib/i18n/dicionario.ts` | alterado (bloco) | espanhol dos textos novos |
| `components/escale/menu/estilos.ts` | novo | classes dos menus suspensos da casca |
| `components/escale/menu/SeloDaCasca.tsx` | novo | selo vermelho |
| `components/escale/menu/ContadorDaFilaDaCasca.tsx` | novo | o selo com a fila de conversas |
| `tests/unit/escale-selo-da-casca.test.tsx` | novo | selo e contador |
| `hooks/escale/useTrocarDeOrganizacao.ts` | novo | troca de organização (mesma sequência do `TenantSwitcher`) |
| `hooks/escale/useTrocarDeIdioma.ts` | novo | troca de idioma (mesma sequência do `SeletorDeIdioma`) |
| `tests/unit/escale-trocas-da-conta.test.tsx` | novo | os dois ganchos |
| `components/escale/menu/MenuDaConta.tsx` | novo | avatar ▾ e o menu (organização, busca, avisos, idioma, tema, admin, sair), mais os atalhos |
| `tests/unit/escale-menu-da-conta.test.tsx` | novo | menu da conta |
| `components/escale/menu/BotaoDaIa.tsx` | novo | ✦ |
| `components/escale/menu/AjudaDoTopo.tsx` | novo | "?" e o painel de atalhos |
| `components/escale/menu/NovoDoTopo.tsx` | novo | "Novo +" e o menu de criar |
| `tests/unit/escale-topo-acoes.test.tsx` | novo | ✦, ?, Novo + |
| `components/escale/menu/MenuDoTopo.tsx` | alterado (reescrito) | a barra de 44px, os itens e o lado direito |
| `components/escale/menu/PainelMais.tsx` | alterado (reescrito) | o painel Mais no visual do 12-001 |
| `tests/unit/escale-menu-do-topo-tela.test.tsx` | alterado (reescrito) | a barra na tela |
| `components/escale/ConversasFlutuante.tsx` | alterado (reescrito) | o FAB e a moldura do painel |
| `tests/unit/escale-conversas-flutuante.test.tsx` | alterado | posição nova, X e cabeçalho |

---

### Task 1: Branch, conferir a V1 e copiar o plano

**Files:**
- Copy: este plano para `docs/superpowers/plans/2026-10-16-casca-clint-v2-topo.md` no repositório

**Interfaces:**
- Consumes: da V1, já na `main`:
  - `components/escale/ui/BotaoDaCasca.tsx`, com `BotaoDaCasca` e `variante: "marca" | "novo" | "texto" | "icone"`;
  - `components/escale/ui/PainelSuspenso.tsx`, com `PainelSuspenso`;
  - `lib/ui/icons-da-casca.ts`;
  - os tokens `casca-*` em `app/escale-tema.css`;
  - a pasta `docs/escale/clint/`.
- Produces: a branch `feat/casca-clint-v2-topo`.

- [ ] **Step 1: Conferir a base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
for f in components/escale/ui/BotaoDaCasca.tsx components/escale/ui/PainelSuspenso.tsx lib/ui/icons-da-casca.ts docs/escale/clint/clint-design-system.md; do
  git cat-file -e "escale-crm/main:$f" 2>/dev/null && echo "ok $f" || echo "FALTA $f"
done
git show escale-crm/main:app/escale-tema.css | grep -c -- "--color-casca-marca"
```
Expected: quatro linhas `ok …` e um número ≥ 1. Com qualquer `FALTA` ou com `0`, PARE: a V1 ainda não está na `main`. Pergunte ao usuário.

- [ ] **Step 2: Criar a branch, conferir a assinatura dos componentes da V1 e copiar o plano**

```bash
git switch -c feat/casca-clint-v2-topo escale-crm/main
grep -n "variante\|forwardRef\|className" components/escale/ui/BotaoDaCasca.tsx | head -20
grep -n "export function PainelSuspenso" components/escale/ui/PainelSuspenso.tsx
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-16-casca-clint-v2-topo.md" docs/superpowers/plans/
```
Expected:
- `BotaoDaCasca` aceita `variante="novo"`, usa `forwardRef` e repassa `className` por `cn(...)`;
- `PainelSuspenso` existe.

Se a assinatura estiver diferente do contrato, PARE e pergunte. O contrato manda a V1 registrar qualquer mudança de nome.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-10-16-casca-clint-v2-topo.md
git commit -m "docs(escale): plano da V2 da casca (topo igual à Clint)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: A cerca "sem a casca, nada muda"

**Files:**
- Create: `tests/unit/escale-casca-v2-original-intacto.test.tsx`

**Interfaces:**
- Consumes: `AppShell` (`@/app/app/_components/AppShell`), `ProvedorDaOcupacaoDoRodape` (`@/lib/ui/rodape-ocupado`) e a `TopBar` real.
- Produces: a prova que vale do começo ao fim desta parte:
  - com `menu="lateral"`, a casca é a `Sidebar` mais a `TopBar` com as 6 peças de sempre, na ordem;
  - com `menu="topo"` em tela grande, o `MenuDoTopo` toma o lugar da `TopBar`;
  - nenhuma peça compartilhada do original importa nada do fork.

- [ ] **Step 1: Escrever o teste**

Create `tests/unit/escale-casca-v2-original-intacto.test.tsx`:

```tsx
/**
 * SEM A CASCA, NADA MUDA (fork Escale, casca igual à Clint — V2).
 *
 * A V2 reescreve o topo da casca nova: itens, lado direito, menu da conta, Mais
 * e botão de conversas. Quem não ligou a casca (cookie `escale_menu` ≠ `topo`)
 * continua com a barra lateral e a `TopBar` do original, com as mesmas peças, na
 * mesma ordem. E as peças compartilhadas (organização, busca, sino, conta) não
 * podem conhecer o fork: a casca nova usa as suas próprias, em
 * `components/escale/menu/`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/components/shell/Sidebar", () => ({ Sidebar: () => <nav data-testid="sidebar-original" /> }));
vi.mock("@/components/shell/MobileSidebar", () => ({ MobileSidebar: () => <span data-testid="peca-MobileSidebar" /> }));
vi.mock("@/components/shell/TenantSwitcher", () => ({ TenantSwitcher: () => <span data-testid="peca-TenantSwitcher" /> }));
vi.mock("@/components/shell/SearchTrigger", () => ({ SearchTrigger: () => <span data-testid="peca-SearchTrigger" /> }));
vi.mock("@/components/shell/AlertsBell", () => ({ AlertsBell: () => <span data-testid="peca-AlertsBell" /> }));
vi.mock("@/components/shell/AvisoDePropostaEmDestaque", () => ({
  AvisoDePropostaEmDestaque: () => <span data-testid="peca-AvisoDePropostaEmDestaque" />,
}));
vi.mock("@/components/shell/UserMenu", () => ({ UserMenu: () => <span data-testid="peca-UserMenu" /> }));
vi.mock("@/components/escale/menu/MenuDoTopo", () => ({ MenuDoTopo: () => <header data-testid="menu-do-topo" /> }));
vi.mock("@/components/escale/ConversasFlutuante", () => ({
  ConversasFlutuante: () => <span data-testid="conversas-flutuante" />,
}));
vi.mock("@/components/shell/BarraDeProgressoNavegacao", () => ({ BarraDeProgressoNavegacao: () => null }));
vi.mock("@/components/shell/BarraInferior", () => ({ BarraInferior: () => null }));
vi.mock("@/hooks/atendimento/useSinalDePresenca", () => ({ useSinalDePresenca: () => {} }));
vi.mock("@/hooks/notifications/useInboundMessageAlerts", () => ({ useInboundMessageAlerts: () => {} }));
vi.mock("@/hooks/notifications/useCrmAlerts", () => ({ useCrmAlerts: () => {} }));
vi.mock("@/hooks/calls/useInboundCallAlerts", () => ({ useInboundCallAlerts: () => {} }));
vi.mock("@/lib/notifications/notify_open", () => ({ useNotifyOpenFromServiceWorker: () => {} }));

import { AppShell } from "@/app/app/_components/AppShell";
import { ProvedorDaOcupacaoDoRodape } from "@/lib/ui/rodape-ocupado";

const RAIZ = join(__dirname, "..", "..");
const PECAS_DA_TOPBAR = [
  "MobileSidebar",
  "TenantSwitcher",
  "SearchTrigger",
  "AlertsBell",
  "AvisoDePropostaEmDestaque",
  "UserMenu",
];
const PECAS_COMPARTILHADAS = [
  "components/shell/TopBar.tsx",
  "components/shell/Sidebar.tsx",
  "components/shell/TenantSwitcher.tsx",
  "components/shell/SearchTrigger.tsx",
  "components/shell/AlertsBell.tsx",
  "components/shell/UserMenu.tsx",
  "components/shell/SeletorDeIdioma.tsx",
  "components/shell/ContadorDaFila.tsx",
  "components/shell/CommandPalette.tsx",
  "components/theme/theme-toggle.tsx",
];

function montar(menu: "lateral" | "topo") {
  return render(
    <ProvedorDaOcupacaoDoRodape>
      <AppShell sidebarCollapsed={false} podeAtender={false} menu={menu}>
        <p>tela</p>
      </AppShell>
    </ProvedorDaOcupacaoDoRodape>,
  );
}

const matchMediaOriginal = window.matchMedia;
afterEach(() => {
  window.matchMedia = matchMediaOriginal;
});

describe("sem a casca, o topo e a lateral do original ficam como estão", () => {
  it("menu lateral: Sidebar + TopBar com as 6 peças de sempre, na ordem, e nada da casca", () => {
    const { container } = montar("lateral");
    expect(screen.getByTestId("sidebar-original")).toBeInTheDocument();
    const pecas = PECAS_DA_TOPBAR.map((p) => screen.getByTestId(`peca-${p}`));
    for (let i = 1; i < pecas.length; i++) {
      expect(pecas[i - 1]!.compareDocumentPosition(pecas[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.queryByTestId("menu-do-topo")).toBeNull();
    expect(screen.queryByTestId("conversas-flutuante")).toBeNull();
    expect(container.querySelector("[data-escale-casca]")).toBeNull();
  });

  it("casca em tela grande: o topo novo entra no lugar da TopBar, e a lateral sai", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    const { container } = montar("topo");
    expect(screen.getByTestId("menu-do-topo")).toBeInTheDocument();
    expect(screen.getByTestId("conversas-flutuante")).toBeInTheDocument();
    expect(screen.queryByTestId("peca-TenantSwitcher")).toBeNull();
    expect(screen.queryByTestId("sidebar-original")).toBeNull();
    expect(container.querySelector("[data-escale-casca]")).not.toBeNull();
  });

  it.each(PECAS_COMPARTILHADAS)("%s não importa nada do fork", (arquivo) => {
    const fonte = readFileSync(join(RAIZ, arquivo), "utf8");
    expect(fonte).not.toMatch(/from\s+["']@\/(?:components|lib|hooks)\/escale\//);
  });
});
```

- [ ] **Step 2: Rodar (é uma cerca: passa já na base e tem de continuar passando)**

```bash
corepack pnpm vitest run tests/unit/escale-casca-v2-original-intacto.test.tsx
```
Expected: PASS, 12 testes (2 casos + 10 do `it.each`). Se o caso da lateral falhar já na base, PARE: o original mudou desde o inventário. Mostre a diferença ao usuário.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/escale-casca-v2-original-intacto.test.tsx
git commit -m "test(escale): cerca da V2 — sem a casca, o topo e a lateral do original não mudam

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A lista do topo, as ações do "Novo +", a porta do ✦ e o selo

**Files:**
- Modify: `lib/escale/menu-do-topo.ts` (arquivo do fork, reescrito), `tests/unit/escale-menu-do-topo.test.ts` (reescrito), `tests/unit/escale-menu-do-topo-tela.test.tsx` (só o 1º caso, até a Task 9 reescrever o arquivo)

**Interfaces:**
- Consumes:
  - `NAV_GROUPS`, `NavDestination`, `NavGroup` e `searchable` (`@/lib/navigation/registry`);
  - `roleAtLeast` e `Role` (`@/lib/auth/types`).
- Produces (`@/lib/escale/menu-do-topo`):
  - de antes, sem mudança: `ItemDoTopo`, `SecaoDoMais`, `GrupoDoMais`, `MenuDoTopo` (tipo), `destinoAtivo`, `itemAtivo` e `montarMenuDoTopo`;
  - `ITENS_DO_TOPO`, agora com os 7 itens da Clint;
  - `AcaoDeCriar = { id: "contato" | "campanha" | "proposta"; rotulo: string; destino: string | null; exige: string; papel: Role }`;
  - `ACOES_DE_CRIAR` e `acoesDeCriar(visiveis, papel: Role | null): AcaoDeCriar[]`;
  - `ENTRADA_DA_IA = "/app/ai"` e `entradaDaIa(visiveis): string | null`;
  - `textoDoSelo(valor: number, limite: 9 | 99): string | null`.

- [ ] **Step 1: Escrever o teste da lógica (vai falhar)**

Replace the whole content of `tests/unit/escale-menu-do-topo.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { DICIONARIO } from "@/lib/i18n/dicionario";
import type { ModuloOpcional } from "@/lib/instalacao/modulos";
import { NAV_GROUPS, searchable } from "@/lib/navigation/registry";
import {
  ACOES_DE_CRIAR,
  ITENS_DO_TOPO,
  acoesDeCriar,
  destinoAtivo,
  entradaDaIa,
  itemAtivo,
  montarMenuDoTopo,
  textoDoSelo,
} from "@/lib/escale/menu-do-topo";

const COM_EMPRESAS: ModuloOpcional[] = ["crm_b2b"];
const ADMIN = searchable(false, "admin", undefined, COM_EMPRESAS, []);
const AGENT = searchable(false, "agent", undefined, [], []);
const AGENT_COM_PROPOSTAS = searchable(false, "agent", undefined, [], ["propostas"]);
const VIEWER = searchable(false, "viewer", undefined, [], []);

describe("menu do topo (igual ao da Clint, variante superior)", () => {
  it("admin vê os 7 itens da Clint, na ordem da Clint", () => {
    expect(montarMenuDoTopo(ADMIN).topo.map((i) => i.rotulo)).toEqual([
      "Negócios",
      "Contatos",
      "Atividades",
      "Atendimento",
      "Automações",
      "Campanhas",
      "Indicadores",
    ]);
  });

  it("Atendimento é o nosso Conversas, com o contador da fila; Campanhas é a tela de campanhas", () => {
    const topo = montarMenuDoTopo(ADMIN).topo;
    expect(topo.find((i) => i.rotulo === "Atendimento")).toMatchObject({ href: "/app/inbox", contador: "fila" });
    expect(topo.find((i) => i.rotulo === "Campanhas")?.href).toBe("/app/campaigns");
  });

  it("Empresas, Agenda e Agentes IA saem do topo e vão para o Mais", () => {
    const menu = montarMenuDoTopo(ADMIN);
    const saem = ["/app/companies", "/app/agenda", "/app/ai/agents"];
    const noMais = menu.mais.flatMap((g) => g.secoes.flatMap((s) => s.itens.map((d) => d.href)));
    expect(noMais).toEqual(expect.arrayContaining(saem));
    expect(menu.topo.some((i) => saem.includes(i.href))).toBe(false);
  });

  it("item que o papel ou o módulo não permite não aparece (mesma regra da lateral)", () => {
    expect(montarMenuDoTopo(AGENT).topo.map((i) => i.href)).toEqual([
      "/app/kanban",
      "/app/contacts",
      "/app/tasks",
      "/app/inbox",
      "/app/campaigns",
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
    const negocios = ITENS_DO_TOPO[0]!;
    const atendimento = ITENS_DO_TOPO.find((i) => i.href === "/app/inbox")!;
    expect(itemAtivo("/app/pipelines/p-1", negocios)).toBe(true);
    expect(itemAtivo("/app/leads/l-1", negocios)).toBe(true);
    expect(itemAtivo("/app/kanban", negocios)).toBe(true);
    expect(itemAtivo("/app/inbox/c-9", atendimento)).toBe(true);
    expect(itemAtivo("/app/inboxx", atendimento)).toBe(false);
    expect(destinoAtivo("/app/webhooks/regra-1", "/app/webhooks")).toBe(true);
    expect(destinoAtivo("/app/webhooksx", "/app/webhooks")).toBe(false);
  });

  it("todo rótulo do topo e do Novo + tem espanhol no dicionário", () => {
    const rotulos = [...ITENS_DO_TOPO.map((i) => i.rotulo), ...ACOES_DE_CRIAR.map((a) => a.rotulo)];
    expect(rotulos.filter((r) => !DICIONARIO[r]?.es)).toEqual([]);
  });
});

describe("o que o Novo + cria", () => {
  it("só entra o que a pessoa enxerga e o papel deixa criar", () => {
    expect(acoesDeCriar(ADMIN, "admin").map((a) => a.id)).toEqual(["contato", "campanha"]);
    expect(acoesDeCriar(AGENT, "agent").map((a) => a.id)).toEqual(["contato"]);
    expect(acoesDeCriar(AGENT_COM_PROPOSTAS, "agent").map((a) => a.id)).toEqual(["contato", "proposta"]);
    expect(acoesDeCriar(VIEWER, "viewer")).toEqual([]);
    expect(acoesDeCriar(ADMIN, null)).toEqual([]);
  });

  it("contato abre a janela na própria tela; campanha e proposta vão para a tela de criar", () => {
    expect(ACOES_DE_CRIAR.map((a) => [a.id, a.destino])).toEqual([
      ["contato", null],
      ["campanha", "/app/campaigns/new"],
      ["proposta", "/app/proposals/novo"],
    ]);
  });
});

describe("a porta do ✦ e o selo vermelho", () => {
  it("✦ leva ao hub de IA quando a pessoa enxerga alguma tela do grupo IA", () => {
    expect(entradaDaIa(ADMIN)).toBe("/app/ai");
    expect(entradaDaIa(ADMIN.filter((d) => d.group !== "ia"))).toBeNull();
    expect(entradaDaIa([])).toBeNull();
  });

  it("o selo some no zero, vai até 99+ no topo e até +9 no botão de conversas", () => {
    expect(textoDoSelo(0, 99)).toBeNull();
    expect(textoDoSelo(-3, 9)).toBeNull();
    expect(textoDoSelo(5, 99)).toBe("5");
    expect(textoDoSelo(99, 99)).toBe("99");
    expect(textoDoSelo(100, 99)).toBe("99+");
    expect(textoDoSelo(9, 9)).toBe("9");
    expect(textoDoSelo(10, 9)).toBe("+9");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-menu-do-topo.test.ts
```
Expected: FAIL. `acoesDeCriar`, `entradaDaIa`, `textoDoSelo` e `ACOES_DE_CRIAR` não existem (`is not a function` ou `undefined`). Os casos de ordem falham porque a lista ainda tem os 9 itens antigos.

- [ ] **Step 3: Reescrever a lógica**

Replace the whole content of `lib/escale/menu-do-topo.ts`:

```ts
/**
 * O MENU DO TOPO (fork Escale): igual ao da Clint na variante "menu superior"
 * (V2 da casca igual à Clint). São 7 itens fixos e mais o "⠿ Mais".
 *
 * Não decide permissão. Recebe a lista de telas que a pessoa PODE ver
 * (`searchable()` do registro — a mesma régua da barra lateral e do ⌘K) e só
 * reparte:
 *   - item do topo que a pessoa não pode ver some;
 *   - toda tela visível que não está no topo vai para o "Mais", na ordem de
 *     grupos e seções do registro.
 * Empresas, Agenda e Agentes IA saíram do topo (a Clint não os tem lá) e caem no
 * "Mais" por essa mesma regra.
 */
import { roleAtLeast, type Role } from "@/lib/auth/types";
import { NAV_GROUPS, type NavDestination, type NavGroup } from "@/lib/navigation/registry";

export interface ItemDoTopo {
  /** A tela do registro: decide permissão (`montarMenuDoTopo`) e o "ativo". */
  href: string;
  /** Para onde o clique leva, quando não é o próprio `href` (Fase 1B). */
  destino?: string;
  /** Chave em português do dicionário (`t(rotulo)`). */
  rotulo: string;
  contador?: "fila";
  /** Prefixos de rota em que o item aparece como atual. */
  ativoEm: readonly string[];
}

export const ITENS_DO_TOPO: readonly ItemDoTopo[] = [
  {
    href: "/app/kanban",
    destino: "/app/escale/negocios",
    rotulo: "Negócios",
    ativoEm: ["/app/kanban", "/app/pipelines", "/app/leads"],
  },
  { href: "/app/contacts", rotulo: "Contatos", ativoEm: ["/app/contacts"] },
  { href: "/app/tasks", rotulo: "Atividades", ativoEm: ["/app/tasks"] },
  // "Atendimento" na Clint é o nosso Conversas (Inbox), com o contador da fila.
  { href: "/app/inbox", rotulo: "Atendimento", contador: "fila", ativoEm: ["/app/inbox"] },
  { href: "/app/settings/automacoes", rotulo: "Automações", ativoEm: ["/app/settings/automacoes"] },
  { href: "/app/campaigns", rotulo: "Campanhas", ativoEm: ["/app/campaigns"] },
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

/**
 * O que o botão "Novo +" cria. O menu aberto da Clint é print que falta, então
 * só entra o que JÁ tem tela de criar no Escale. Negócio fica de fora: criar
 * negócio pede origem e etapa, e o "Negócio +" da página do quadro é da V4.
 */
export interface AcaoDeCriar {
  id: "contato" | "campanha" | "proposta";
  /** Chave em português do dicionário (`t(rotulo)`). */
  rotulo: string;
  /** Para onde vai. `null` abre a janela de novo contato sem sair da tela. */
  destino: string | null;
  /** A tela que a pessoa precisa enxergar (papel, módulo, capacidade e interface). */
  exige: string;
  /** O papel que a rota ou a página de criar exige. */
  papel: Role;
}

export const ACOES_DE_CRIAR: readonly AcaoDeCriar[] = [
  // POST /api/v1/contacts: requireRole("agent").
  { id: "contato", rotulo: "Contato", destino: null, exige: "/app/contacts", papel: "agent" },
  // POST /api/v1/campaigns: requireRole("manager").
  { id: "campanha", rotulo: "Campanha", destino: "/app/campaigns/new", exige: "/app/campaigns", papel: "manager" },
  // app/app/proposals/novo/page.tsx: agent ou acima (e a capacidade "propostas" ligada).
  { id: "proposta", rotulo: "Proposta", destino: "/app/proposals/novo", exige: "/app/proposals", papel: "agent" },
];

export function acoesDeCriar(visiveis: readonly NavDestination[], papel: Role | null): AcaoDeCriar[] {
  const hrefs = new Set(visiveis.map((d) => d.href));
  return ACOES_DE_CRIAR.filter((a) => hrefs.has(a.exige) && roleAtLeast(papel, a.papel));
}

/**
 * A porta do ✦. Na Clint ele abre a "Aura" (assistente de IA). O Escale não tem
 * assistente global, e a porta de IA mais próxima é o hub "Agente de IA".
 */
export const ENTRADA_DA_IA = "/app/ai";

export function entradaDaIa(visiveis: readonly NavDestination[]): string | null {
  return visiveis.some((d) => d.group === "ia") ? ENTRADA_DA_IA : null;
}

/**
 * O texto do selo vermelho: "99+" no menu do topo, "+9" no botão de conversas.
 * Zero ou menos não desenha selo — número que nunca some ensina a ignorar o número.
 */
export function textoDoSelo(valor: number, limite: 9 | 99): string | null {
  if (!(valor > 0)) return null;
  if (valor <= limite) return String(Math.floor(valor));
  return limite === 99 ? "99+" : "+9";
}
```

- [ ] **Step 4: Ajustar o 1º caso do teste de tela (a Task 9 reescreve o arquivo inteiro)**

Em `tests/unit/escale-menu-do-topo-tela.test.tsx`, troque o bloco:

```tsx
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
```

por:

```tsx
  it("mostra os 7 itens da Clint na ordem e marca Negócios dentro de um funil", () => {
    render(<MenuDoTopo />);
    const nav = screen.getByRole("navigation", { name: "Menu principal" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Negócios",
      "Contatos",
      "Atividades",
      "Atendimento",
      "Automações",
      "Campanhas",
      "Indicadores",
    ]);
    expect(within(nav).getByRole("link", { name: "Negócios" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Atendimento" })).not.toHaveAttribute("aria-current");
  });
```

- [ ] **Step 5: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-menu-do-topo.test.ts tests/unit/escale-menu-do-topo-tela.test.tsx tests/unit/escale-casca-v2-original-intacto.test.tsx
```
Expected: PASS nos três arquivos.

Se o caso "item que o papel ou o módulo não permite" falhar, o registro mudou para o papel `agent` (por exemplo, `/app/campaigns` ganhou `minRole`). Confira em `lib/navigation/catalogo.ts` e ajuste a lista esperada ao que o registro diz, sem mudar a ordem.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/menu-do-topo.ts tests/unit/escale-menu-do-topo.test.ts tests/unit/escale-menu-do-topo-tela.test.tsx
git commit -m "feat(escale): menu do topo com os 7 itens da Clint, ações do Novo +, porta do ✦ e selo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Os textos em espanhol e os ícones

**Files:**
- Modify: `lib/i18n/dicionario.ts` (bloco logo antes da linha `  // ─── FORK ESCALE · origens (grupos de funis, Fase 1A) ───`), `lib/ui/icons-da-casca.ts` (uma linha de export no fim, só com os nomes que faltam)

**Interfaces:**
- Consumes: nada.
- Produces:
  - o espanhol de todo texto das Tasks 5 a 10 (as chaves que já existem ficam como estão);
  - em `@/lib/ui/icons-da-casca`: `Bell`, `Check`, `FileText`, `LogOut`, `Megaphone`, `MessageCircleMore`, `Plus`, `Search`, `ShieldCheck`, `Sparkle`, `UserPlus` e `X`.

- [ ] **Step 1: Inserir o bloco do dicionário por script (pula o que já existe, com ou sem aspas)**

Da raiz do repositório:

```bash
node - <<'NODE'
const fs = require("fs");
const ARQ = "lib/i18n/dicionario.ts";
const ANCORA = "  // ─── FORK ESCALE · origens (grupos de funis, Fase 1A) ───";
const CAB = "  // ─── FORK ESCALE · casca igual à Clint (V2: topo, menu da conta, Novo +, Mais, botão de conversas) ───";
const ENTRADAS = [
  ["Atendimento", "Atención"],
  ["Campanhas", "Campañas"],
  ["Indicadores", "Indicadores"],
  ["Mais", "Más"],
  ["Agente de IA", "Agente de IA"],
  ["Ajuda", "Ayuda"],
  ["Atalhos do teclado", "Atajos de teclado"],
  ["Buscar uma tela", "Buscar una pantalla"],
  ["Trocar o tema", "Cambiar el tema"],
  ["Novo", "Nuevo"],
  ["Contato", "Contacto"],
  ["Campanha", "Campaña"],
  ["Proposta", "Propuesta"],
  ["Menu do usuário", "Menú del usuario"],
  ["Organização", "Organización"],
  ["Gerenciar organizações", "Gestionar organizaciones"],
  ["Saia do acompanhamento para trocar de organização", "Salga del acompañamiento para cambiar de organización"],
  ["Carregando organização…", "Cargando organización…"],
  ["Não foi possível trocar de organização. Seu acesso pode ter mudado. Tente novamente.", "No fue posible cambiar de organización. Su acceso puede haber cambiado. Intente nuevamente."],
  ["Não foi possível trocar o idioma. Tente de novo.", "No fue posible cambiar el idioma. Intente de nuevo."],
  ["Buscar", "Buscar"],
  ["Central de avisos", "Central de avisos"],
  ["em aberto", "abiertos"],
  ["Idioma", "Idioma"],
  ["Tema", "Tema"],
  ["Claro", "Claro"],
  ["Escuro", "Oscuro"],
  ["Sistema", "Sistema"],
  ["Modo administrador", "Modo administrador"],
  ["Configurar este servidor", "Configurar este servidor"],
  ["Sair", "Cerrar sesión"],
  ["Conversas", "Conversaciones"],
  ["1 conversa esperando uma pessoa", "1 conversación esperando a una persona"],
  ["conversas esperando uma pessoa", "conversaciones esperando a una persona"],
];
let texto = fs.readFileSync(ARQ, "utf8");
if (texto.includes(CAB)) throw new Error("o bloco da V2 já está no dicionário");
const i = texto.indexOf(ANCORA);
if (i < 0) throw new Error("âncora (bloco da Fase 1A) não encontrada");
const eol = texto.includes("\r\n") ? "\r\n" : "\n";
const ehIdentificador = (s) => /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(s);
const existe = (pt) =>
  texto.includes(JSON.stringify(pt) + ":") ||
  (ehIdentificador(pt) && new RegExp(`^\\s+${pt}:\\s`, "mu").test(texto));
const vistas = new Set();
const novas = [];
const puladas = [];
for (const [pt, es] of ENTRADAS) {
  if (vistas.has(pt)) continue;
  vistas.add(pt);
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
Expected: uma linha `N entradas novas; já existiam M: …`, com N + M = 34.
- Pela leitura de 16/10, as novas são as 8 que ainda não existiam: `Ajuda`, `Atalhos do teclado`, `Buscar uma tela`, `Trocar o tema`, `Saia do acompanhamento…`, `Tema`, `Claro` e `Escuro`. Se a V1 já tiver acrescentado alguma delas, N cai.
- As que já existiam (`Mais`, `Novo`, `Sair`, `Organização`…) ficam com a tradução de antes, e está certo assim.

- [ ] **Step 2: Os ícones (só os que faltam)**

```bash
node - <<'NODE'
const fs = require("fs");
const ARQ = "lib/ui/icons-da-casca.ts";
const NOMES = ["Bell", "Check", "FileText", "LogOut", "Megaphone", "MessageCircleMore", "Plus", "Search", "ShieldCheck", "Sparkle", "UserPlus", "X"];
let texto = fs.readFileSync(ARQ, "utf8");
const exportados = new Set(
  [...texto.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g)].flatMap((m) =>
    m[1].split(",").map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean),
  ),
);
const faltam = NOMES.filter((n) => !exportados.has(n));
if (faltam.length === 0) {
  console.log("nada a acrescentar");
} else {
  const eol = texto.includes("\r\n") ? "\r\n" : "\n";
  texto = texto.replace(/\s*$/, "") + eol + eol +
    "// V2 — topo da casca: ✦, menu da conta, Novo +, botão de conversas" + eol +
    `export { ${faltam.join(", ")} } from "lucide-react";` + eol;
  fs.writeFileSync(ARQ, texto);
  console.log("acrescentados: " + faltam.join(", "));
}
NODE
```
Expected: `acrescentados: …` com os nomes que a V1 ainda não exportava (o contrato já lista `Plus`, então ele não deve aparecer).

- [ ] **Step 3: Conferir o dicionário e o typecheck**

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/escale-menu-do-topo.test.ts
corepack pnpm typecheck
```
Expected: PASS, e typecheck sem erros novos.
- Chave repetida aparece como `An object literal cannot have multiple properties with the same name`. Se isso acontecer, apague do bloco da V2 a linha repetida.
- Export repetido aparece como `Module … has already exported a member named`. Se isso acontecer, tire o nome da linha nova de `icons-da-casca.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/dicionario.ts lib/ui/icons-da-casca.ts
git commit -m "feat(escale): textos em espanhol e ícones do topo da casca (V2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: O selo vermelho e o contador da fila da casca

**Files:**
- Create: `components/escale/menu/estilos.ts`, `components/escale/menu/SeloDaCasca.tsx`, `components/escale/menu/ContadorDaFilaDaCasca.tsx`, `tests/unit/escale-selo-da-casca.test.tsx`

**Interfaces:**
- Consumes:
  - `textoDoSelo` (Task 3);
  - `useConversationCounts(orgId)` (`@/hooks/inbox/useConversationCounts`), que devolve `data?.fila` e `data?.unassigned`;
  - `useAuth` (`@/hooks/auth/AuthProvider`).
- Produces:
  - `estilos.ts`: `CONTEUDO_DO_MENU`, `SOMBRA_DO_MENU`, `ITEM_DO_MENU` e `ROTULO_DO_MENU`;
  - `SeloDaCasca({ valor: number; limite: 9 | 99; rotulo: string; className?: string })`, com `data-testid="selo-da-casca"`;
  - `ContadorDaFilaDaCasca({ limite: 9 | 99; className?: string })`.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Create `tests/unit/escale-selo-da-casca.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contagem = vi.hoisted(() => ({ data: undefined as { fila?: number; unassigned?: number } | undefined }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org-1" } }) }));
vi.mock("@/hooks/inbox/useConversationCounts", () => ({ useConversationCounts: () => ({ data: contagem.data }) }));

import { ContadorDaFilaDaCasca } from "@/components/escale/menu/ContadorDaFilaDaCasca";
import { SeloDaCasca } from "@/components/escale/menu/SeloDaCasca";

beforeEach(() => {
  contagem.data = undefined;
});

describe("<SeloDaCasca>", () => {
  it("zero não desenha nada", () => {
    const { container } = render(<SeloDaCasca valor={0} limite={99} rotulo="nada" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("vermelho da Clint, com o número limitado e o rótulo para leitor de tela", () => {
    render(<SeloDaCasca valor={120} limite={99} rotulo="120 conversas" />);
    const selo = screen.getByTestId("selo-da-casca");
    expect(selo).toHaveTextContent("99+");
    expect(selo).toHaveAttribute("aria-label", "120 conversas");
    expect(selo).toHaveClass("bg-casca-alerta", "text-white", "rounded-full");
  });

  it("no botão de conversas, acima de 9 vira +9", () => {
    render(<SeloDaCasca valor={12} limite={9} rotulo="12" />);
    expect(screen.getByTestId("selo-da-casca")).toHaveTextContent("+9");
  });
});

describe("<ContadorDaFilaDaCasca>", () => {
  it("mostra a fila com o rótulo de sempre", () => {
    contagem.data = { fila: 3 };
    render(<ContadorDaFilaDaCasca limite={99} />);
    expect(screen.getByLabelText("3 conversas esperando uma pessoa")).toHaveTextContent("3");
  });

  it("uma conversa: rótulo no singular; sem `fila`, usa `unassigned`", () => {
    contagem.data = { unassigned: 1 };
    render(<ContadorDaFilaDaCasca limite={9} />);
    expect(screen.getByLabelText("1 conversa esperando uma pessoa")).toHaveTextContent("1");
  });

  it("fila vazia: sem selo", () => {
    contagem.data = { fila: 0 };
    render(<ContadorDaFilaDaCasca limite={99} />);
    expect(screen.queryByTestId("selo-da-casca")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-selo-da-casca.test.tsx
```
Expected: FAIL, `Failed to resolve import "@/components/escale/menu/ContadorDaFilaDaCasca"`.

- [ ] **Step 3: Escrever os estilos, o selo e o contador**

Create `components/escale/menu/estilos.ts`:

```ts
/**
 * As classes dos menus suspensos da casca (fork Escale, V2).
 *
 * Medidas dos menus de contexto da variante superior (01-032 e 01-033, ÷ 1,25):
 * ~215px de largura, itens de ~36px com ícone de 14px e texto de ~12px
 * `#2F2C5D`, raio ~8 e sombra suave.
 *
 * A sombra vai por `style` (`SOMBRA_DO_MENU`). O `shadow-md` do
 * `DropdownMenuContent` do original não sai com `cn()`, porque o tailwind-merge
 * lê `shadow-casca-painel` como cor de sombra e mantém as duas classes.
 */
export const CONTEUDO_DO_MENU = "min-w-[215px] rounded-md border-casca-borda p-1";

export const SOMBRA_DO_MENU = { boxShadow: "var(--shadow-casca-painel)" } as const;

export const ITEM_DO_MENU =
  "min-h-9 cursor-pointer gap-2.5 px-3 text-xs text-casca-texto focus:bg-casca-marca-suave focus:text-casca-texto [&>svg]:size-3.5";

export const ROTULO_DO_MENU =
  "px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha";
```

Create `components/escale/menu/SeloDaCasca.tsx`:

```tsx
import { textoDoSelo } from "@/lib/escale/menu-do-topo";
import { cn } from "@/lib/utils";

/**
 * O selo vermelho da Clint (`#FF4B4C`, texto branco em negrito): "99+" ao lado
 * de "Atendimento" no topo e "+9" no botão de conversas. Quem usa decide o
 * tamanho por `className`, porque cada lugar tem a sua medida no print.
 */
export function SeloDaCasca({
  valor,
  limite,
  rotulo,
  className,
}: {
  valor: number;
  limite: 9 | 99;
  rotulo: string;
  className?: string;
}) {
  const texto = textoDoSelo(valor, limite);
  if (texto === null) return null;
  return (
    <span
      data-testid="selo-da-casca"
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-casca-alerta font-bold leading-none text-white tabular-nums",
        className,
      )}
    >
      {texto}
    </span>
  );
}
```

Create `components/escale/menu/ContadorDaFilaDaCasca.tsx`:

```tsx
"use client";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useConversationCounts } from "@/hooks/inbox/useConversationCounts";

import { SeloDaCasca } from "./SeloDaCasca";

/**
 * A fila de conversas (as que esperam uma PESSOA) no selo vermelho da casca. É a
 * MESMA contagem do `ContadorDaFila` do original (mesma chave do React Query),
 * só com o desenho da Clint. O original continua intacto na barra lateral.
 */
export function ContadorDaFilaDaCasca({ limite, className }: { limite: 9 | 99; className?: string }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const { data } = useConversationCounts(activeOrg?.orgId ?? null);
  const esperando = data?.fila ?? data?.unassigned ?? 0;
  const rotulo =
    esperando === 1 ? t("1 conversa esperando uma pessoa") : `${esperando} ${t("conversas esperando uma pessoa")}`;
  return <SeloDaCasca valor={esperando} limite={limite} rotulo={rotulo} className={className} />;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-selo-da-casca.test.tsx tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```
Expected: PASS nos dois.

- [ ] **Step 5: Commit**

```bash
git add components/escale/menu/estilos.ts components/escale/menu/SeloDaCasca.tsx components/escale/menu/ContadorDaFilaDaCasca.tsx tests/unit/escale-selo-da-casca.test.tsx
git commit -m "feat(escale): selo vermelho da Clint e contador da fila da casca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Trocar de organização e de idioma pelo menu da conta

**Files:**
- Create: `hooks/escale/useTrocarDeOrganizacao.ts`, `hooks/escale/useTrocarDeIdioma.ts`, `tests/unit/escale-trocas-da-conta.test.tsx`

**Interfaces:**
- Consumes:
  - `setActiveOrg(orgId): Promise<{ ok: boolean; error?: string }>` (`@/app/actions/shell/setActiveOrg`);
  - `useOrganizationTransition()` (`@/components/shell/OrganizationTransitionProvider`), com `begin(label)` e `cancel()`;
  - `useActiveOrg()`;
  - `trocarIdioma(idioma)` (`@/app/actions/settings/trocarIdioma`);
  - `useIdioma()` e `useAplicarIdioma()` (`@/lib/i18n/IdiomaProvider`);
  - `Idioma` (`@/lib/i18n/idiomas`);
  - `toast` (`sonner`).
- Produces:
  - `useTrocarDeOrganizacao(): { trocando: boolean; trocar: (orgId: string) => Promise<void> }`;
  - `useTrocarDeIdioma(): { idioma: Idioma; salvando: boolean; escolher: (novo: Idioma) => void }`.

- [ ] **Step 1: Escrever os testes (vão falhar)**

Create `tests/unit/escale-trocas-da-conta.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  setActiveOrg: vi.fn(),
  trocarIdioma: vi.fn(),
  begin: vi.fn(),
  cancel: vi.fn(),
  aplicar: vi.fn(),
  toastErro: vi.fn(),
}));

vi.mock("@/app/actions/shell/setActiveOrg", () => ({ setActiveOrg: m.setActiveOrg }));
vi.mock("@/app/actions/settings/trocarIdioma", () => ({ trocarIdioma: m.trocarIdioma }));
vi.mock("@/components/shell/OrganizationTransitionProvider", () => ({
  useOrganizationTransition: () => ({ begin: m.begin, cancel: m.cancel }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useActiveOrg: () => ({ orgId: "org-1" }) }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/lib/i18n/IdiomaProvider", () => ({
  useIdioma: () => "pt-BR",
  useAplicarIdioma: () => m.aplicar,
  useT: () => (texto: string) => texto,
}));
vi.mock("sonner", () => ({ toast: { error: m.toastErro } }));

import { useTrocarDeIdioma } from "@/hooks/escale/useTrocarDeIdioma";
import { useTrocarDeOrganizacao } from "@/hooks/escale/useTrocarDeOrganizacao";

const original = window.location;
const assign = vi.fn();
const reload = vi.fn();

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset();
  assign.mockReset();
  reload.mockReset();
  // `window.location` não é substituível direto no jsdom (mesma saída de OrganizationTransitionProvider.test).
  Object.defineProperty(window, "location", { configurable: true, value: { ...original, assign, reload } });
});
afterEach(() => {
  Object.defineProperty(window, "location", { configurable: true, value: original });
});

describe("useTrocarDeOrganizacao (a mesma sequência do TenantSwitcher)", () => {
  it("a organização que já está aberta não faz nada", async () => {
    const { result } = renderHook(() => useTrocarDeOrganizacao());
    await act(() => result.current.trocar("org-1"));
    expect(m.setActiveOrg).not.toHaveBeenCalled();
  });

  it("troca: avisa a transição, grava e abre um documento novo em /app/inbox", async () => {
    m.setActiveOrg.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useTrocarDeOrganizacao());
    await act(() => result.current.trocar("org-2"));
    expect(m.begin).toHaveBeenCalledWith("Carregando organização…");
    expect(m.setActiveOrg).toHaveBeenCalledWith("org-2");
    expect(assign).toHaveBeenCalledWith("/app/inbox");
  });

  it("falhou: desfaz a transição, avisa e não navega", async () => {
    m.setActiveOrg.mockResolvedValue({ ok: false, error: "forbidden" });
    const { result } = renderHook(() => useTrocarDeOrganizacao());
    await act(() => result.current.trocar("org-2"));
    expect(m.cancel).toHaveBeenCalled();
    expect(m.toastErro).toHaveBeenCalledWith(
      "Não foi possível trocar de organização. Seu acesso pode ter mudado. Tente novamente.",
    );
    expect(assign).not.toHaveBeenCalled();
    expect(result.current.trocando).toBe(false);
  });
});

describe("useTrocarDeIdioma (a mesma sequência do SeletorDeIdioma)", () => {
  it("o idioma em vigor não faz nada", () => {
    const { result } = renderHook(() => useTrocarDeIdioma());
    act(() => result.current.escolher("pt-BR"));
    expect(m.trocarIdioma).not.toHaveBeenCalled();
  });

  it("troca: pinta na hora, grava e recarrega", async () => {
    m.trocarIdioma.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useTrocarDeIdioma());
    act(() => result.current.escolher("es"));
    expect(m.aplicar).toHaveBeenCalledWith("es");
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(m.trocarIdioma).toHaveBeenCalledWith("es");
  });

  it("falhou: volta ao idioma de antes e avisa", async () => {
    m.trocarIdioma.mockResolvedValue({ ok: false, error: "x" });
    const { result } = renderHook(() => useTrocarDeIdioma());
    act(() => result.current.escolher("es"));
    await vi.waitFor(() => expect(m.toastErro).toHaveBeenCalledWith("Não foi possível trocar o idioma. Tente de novo."));
    expect(m.aplicar).toHaveBeenLastCalledWith("pt-BR");
    expect(reload).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-trocas-da-conta.test.tsx
```
Expected: FAIL, `Failed to resolve import "@/hooks/escale/useTrocarDeIdioma"`.

- [ ] **Step 3: Escrever os dois ganchos**

Create `hooks/escale/useTrocarDeOrganizacao.ts`:

```ts
"use client";
import { useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";

import { setActiveOrg } from "@/app/actions/shell/setActiveOrg";
import { useOrganizationTransition } from "@/components/shell/OrganizationTransitionProvider";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";

/**
 * Trocar de organização pelo menu do avatar da casca (fork Escale, V2).
 *
 * A Clint não tem seletor de organização no topo, então a casca nova não monta o
 * `TenantSwitcher` do original. A troca, porém, é a MESMA sequência dele, e
 * precisa continuar sendo:
 *   1. aviso de transição pintado antes de qualquer espera (`flushSync`);
 *   2. server action;
 *   3. documento novo em /app/inbox, que elimina QueryClient, assinaturas e
 *      respostas em voo da organização anterior.
 * Se o original mudar essa sequência, este gancho acompanha.
 */
export function useTrocarDeOrganizacao(): { trocando: boolean; trocar: (orgId: string) => Promise<void> } {
  const t = useT();
  const ativa = useActiveOrg();
  const transicao = useOrganizationTransition();
  const [trocando, setTrocando] = useState(false);

  const trocar = async (orgId: string) => {
    if (orgId === ativa?.orgId) return;
    flushSync(() => {
      setTrocando(true);
      transicao.begin(t("Carregando organização…"));
    });
    try {
      const resultado = await setActiveOrg(orgId);
      if (!resultado.ok) throw new Error(resultado.error);
      window.location.assign("/app/inbox");
    } catch {
      transicao.cancel();
      setTrocando(false);
      toast.error(t("Não foi possível trocar de organização. Seu acesso pode ter mudado. Tente novamente."));
    }
  };

  return { trocando, trocar };
}
```

Create `hooks/escale/useTrocarDeIdioma.ts`:

```ts
"use client";
import { useTransition } from "react";
import { toast } from "sonner";

import { trocarIdioma } from "@/app/actions/settings/trocarIdioma";
import { useT } from "@/hooks/i18n/useT";
import { useAplicarIdioma, useIdioma } from "@/lib/i18n/IdiomaProvider";
import type { Idioma } from "@/lib/i18n/idiomas";

/**
 * Trocar de idioma pelo menu do avatar da casca (fork Escale, V2). É a MESMA
 * sequência do `SeletorDeIdioma` do original:
 *   - pinta na hora;
 *   - grava;
 *   - se o servidor recusar, volta ao idioma anterior e avisa;
 *   - se gravou, recarrega a página inteira. O `router.refresh()` foi medido no
 *     original e não resolve: o cache do cliente guarda o layout no idioma velho.
 */
export function useTrocarDeIdioma(): { idioma: Idioma; salvando: boolean; escolher: (novo: Idioma) => void } {
  const t = useT();
  const idioma = useIdioma();
  const aplicar = useAplicarIdioma();
  const [salvando, startTransition] = useTransition();

  const escolher = (novo: Idioma) => {
    if (novo === idioma) return;
    const anterior = idioma;
    aplicar(novo);
    startTransition(async () => {
      const resultado = await trocarIdioma(novo);
      if (!resultado.ok) {
        aplicar(anterior);
        toast.error(t("Não foi possível trocar o idioma. Tente de novo."));
        return;
      }
      window.location.reload();
    });
  };

  return { idioma, salvando, escolher };
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-trocas-da-conta.test.tsx
```
Expected: PASS, 6 testes.

- [ ] **Step 5: Commit**

```bash
git add hooks/escale/useTrocarDeOrganizacao.ts hooks/escale/useTrocarDeIdioma.ts tests/unit/escale-trocas-da-conta.test.tsx
git commit -m "feat(escale): trocar de organização e de idioma pelo menu da conta da casca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: O avatar quadrado ▾ e o menu da conta

**Files:**
- Create: `components/escale/menu/MenuDaConta.tsx`, `tests/unit/escale-menu-da-conta.test.tsx`

**Interfaces:**
- Consumes:
  - das Tasks 5 e 6: `SeloDaCasca`, `CONTEUDO_DO_MENU`, `SOMBRA_DO_MENU`, `ITEM_DO_MENU`, `ROTULO_DO_MENU`, `useTrocarDeOrganizacao` e `useTrocarDeIdioma`;
  - do original: `CommandPalette({ open, onOpenChange })`, `useAgentInbox("open")` (devolve `data.items` e `data.open_count`), `useSonsDaCentral(items)`, `useTheme()` com `Theme`, `IDIOMAS_VISIVEIS` e `useAuth()` (`user`, `activeOrg`, `signOut`);
  - os primitivos `Avatar` e `DropdownMenu*`.
- Produces: `MenuDaConta({ veAvisos: boolean })`, com o gatilho `data-testid="menu-da-conta"`. Enquanto está montado, vale também:
  - **⌘K / Ctrl+K** abre a paleta;
  - **⌘⇧L** cicla o tema (claro, escuro, sistema);
  - o som da central de avisos toca (quando `veAvisos`).

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-menu-da-conta.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORGS = [
  { organization_id: "org-1", organization_name: "Escale IA" },
  { organization_id: "org-2", organization_name: "Loja do Centro" },
];
const sessao = vi.hoisted(() => ({
  user: {
    full_name: "Régis Silva",
    email: "regis@escale.ia",
    avatar_url: null as string | null,
    is_platform_admin: false,
    support: null as unknown,
    organizations: [] as { organization_id: string; organization_name: string }[],
  },
  signOut: vi.fn(async () => {}),
}));
const tema = vi.hoisted(() => ({ theme: "light" as "light" | "dark" | "system", setTheme: vi.fn() }));
const trocas = vi.hoisted(() => ({ trocar: vi.fn(async () => {}), escolher: vi.fn() }));
const central = vi.hoisted(() => ({
  useAgentInbox: vi.fn(() => ({ data: { items: [], open_count: 3 } })),
  useSonsDaCentral: vi.fn(),
}));

vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: sessao.user,
    activeOrg: { orgId: "org-1", name: "Escale IA", role: "admin" },
    signOut: sessao.signOut,
  }),
}));
vi.mock("@/lib/theme", () => ({ useTheme: () => tema }));
vi.mock("@/hooks/escale/useTrocarDeOrganizacao", () => ({
  useTrocarDeOrganizacao: () => ({ trocando: false, trocar: trocas.trocar }),
}));
vi.mock("@/hooks/escale/useTrocarDeIdioma", () => ({
  useTrocarDeIdioma: () => ({ idioma: "pt-BR", salvando: false, escolher: trocas.escolher }),
}));
vi.mock("@/hooks/ai/useAgentInbox", () => ({ useAgentInbox: central.useAgentInbox }));
vi.mock("@/hooks/notifications/useSonsDaCentral", () => ({ useSonsDaCentral: central.useSonsDaCentral }));
vi.mock("@/components/shell/CommandPalette", () => ({
  CommandPalette: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Paleta de navegação" /> : null),
}));

import { MenuDaConta } from "@/components/escale/menu/MenuDaConta";

const u = () => userEvent.setup({ pointerEventsCheck: 0 });
const abrir = (ator: ReturnType<typeof userEvent.setup>) =>
  ator.click(screen.getByRole("button", { name: "Menu do usuário" }));

beforeEach(() => {
  sessao.user.organizations = [...ORGS];
  sessao.user.is_platform_admin = false;
  sessao.signOut.mockClear();
  tema.theme = "light";
  tema.setTheme.mockReset();
  trocas.trocar.mockClear();
  trocas.escolher.mockReset();
  central.useAgentInbox.mockClear();
  central.useSonsDaCentral.mockClear();
});

describe("<MenuDaConta> (avatar quadrado ▾ da Clint)", () => {
  it("o avatar mostra a inicial, o selo dos avisos abertos, e o som da central continua tocando", () => {
    render(<MenuDaConta veAvisos />);
    expect(screen.getByRole("button", { name: "Menu do usuário" })).toHaveTextContent("R");
    expect(screen.getByLabelText("Central de avisos — 3 em aberto")).toHaveTextContent("3");
    expect(central.useSonsDaCentral).toHaveBeenCalledWith([]);
  });

  it("o menu tem organização, busca, avisos, idioma, tema e sair", async () => {
    const ator = u();
    render(<MenuDaConta veAvisos />);
    await abrir(ator);
    expect(screen.getByRole("menuitem", { name: "Escale IA" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Loja do Centro" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /^Buscar/ })).toHaveTextContent("⌘K");
    expect(screen.getByRole("menuitem", { name: "Central de avisos — 3 em aberto" })).toHaveAttribute(
      "href",
      "/app/ai/inbox",
    );
    expect(screen.getByRole("menuitem", { name: "Español" })).toBeInTheDocument();
    for (const nome of ["Claro", "Escuro", "Sistema", "Sair"]) {
      expect(screen.getByRole("menuitem", { name: nome })).toBeInTheDocument();
    }
  });

  it("escolher outra organização usa a troca de sempre", async () => {
    const ator = u();
    render(<MenuDaConta veAvisos />);
    await abrir(ator);
    await ator.click(screen.getByRole("menuitem", { name: "Loja do Centro" }));
    expect(trocas.trocar).toHaveBeenCalledWith("org-2");
  });

  it("Buscar abre a paleta; Ctrl+K abre a paleta com o menu fechado", async () => {
    const ator = u();
    const { unmount } = render(<MenuDaConta veAvisos />);
    await abrir(ator);
    await ator.click(screen.getByRole("menuitem", { name: /^Buscar/ }));
    expect(screen.getByRole("dialog", { name: "Paleta de navegação" })).toBeInTheDocument();
    unmount();

    render(<MenuDaConta veAvisos />);
    expect(screen.queryByRole("dialog", { name: "Paleta de navegação" })).toBeNull();
    await ator.keyboard("{Control>}k{/Control}");
    expect(screen.getByRole("dialog", { name: "Paleta de navegação" })).toBeInTheDocument();
  });

  it("tema e idioma pelo menu; Ctrl+Shift+L continua ciclando o tema", async () => {
    const ator = u();
    render(<MenuDaConta veAvisos />);
    await abrir(ator);
    await ator.click(screen.getByRole("menuitem", { name: "Escuro" }));
    expect(tema.setTheme).toHaveBeenCalledWith("dark");
    await abrir(ator);
    await ator.click(screen.getByRole("menuitem", { name: "Español" }));
    expect(trocas.escolher).toHaveBeenCalledWith("es");
    tema.setTheme.mockReset();
    await ator.keyboard("{Control>}{Shift>}L{/Shift}{/Control}");
    expect(tema.setTheme).toHaveBeenCalledWith("dark");
  });

  it("sem a central de avisos: nem selo, nem item, nem som", async () => {
    const ator = u();
    render(<MenuDaConta veAvisos={false} />);
    expect(central.useAgentInbox).not.toHaveBeenCalled();
    expect(central.useSonsDaCentral).not.toHaveBeenCalled();
    await abrir(ator);
    expect(screen.queryByRole("menuitem", { name: /Central de avisos/ })).toBeNull();
  });

  it("com uma organização só (e sem ser dono da plataforma), a seção de organização some", async () => {
    sessao.user.organizations = [ORGS[0]!];
    const ator = u();
    render(<MenuDaConta veAvisos />);
    await abrir(ator);
    expect(screen.queryByText("Organização")).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Escale IA" })).toBeNull();
  });

  it("dono da plataforma vê o modo administrador e gerenciar organizações; Sair chama o signOut", async () => {
    sessao.user.is_platform_admin = true;
    const ator = u();
    render(<MenuDaConta veAvisos />);
    await abrir(ator);
    expect(screen.getByRole("menuitem", { name: /Modo administrador/ })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("menuitem", { name: "Gerenciar organizações" })).toHaveAttribute("href", "/admin/tenants");
    await ator.click(screen.getByRole("menuitem", { name: "Sair" }));
    expect(sessao.signOut).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-menu-da-conta.test.tsx
```
Expected: FAIL, `Failed to resolve import "@/components/escale/menu/MenuDaConta"`.

- [ ] **Step 3: Escrever o menu da conta**

Create `components/escale/menu/MenuDaConta.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { CommandPalette } from "@/components/shell/CommandPalette";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgentInbox } from "@/hooks/ai/useAgentInbox";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useTrocarDeIdioma } from "@/hooks/escale/useTrocarDeIdioma";
import { useTrocarDeOrganizacao } from "@/hooks/escale/useTrocarDeOrganizacao";
import { useT } from "@/hooks/i18n/useT";
import { useSonsDaCentral } from "@/hooks/notifications/useSonsDaCentral";
import { IDIOMAS_VISIVEIS } from "@/lib/i18n/registro";
import { useTheme, type Theme } from "@/lib/theme";
import { Bell, Check, LogOut, Search, ShieldCheck } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU, ROTULO_DO_MENU, SOMBRA_DO_MENU } from "./estilos";
import { SeloDaCasca } from "./SeloDaCasca";

const PROXIMO_TEMA: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };

/**
 * O AVATAR QUADRADO ▾ DA CLINT (fork Escale, casca igual à Clint — V2).
 *
 * O topo da Clint só tem ✦, "?", "Novo +" e o avatar. Tudo o que o topo do
 * original deixava solto mora aqui dentro: organização, busca ⌘K, sino, idioma,
 * tema e conta. Este componente fica montado o tempo todo na casca (md+), e por
 * isso é ele quem mantém vivo o que não pode depender do menu aberto:
 *   - o atalho ⌘K (antes no `SearchTrigger`);
 *   - o atalho ⌘⇧L (antes no `ThemeToggle`);
 *   - o som da central de avisos (antes no `AlertsBell`).
 *
 * `modal={false}`: o menu abre a paleta e outras janelas por cima. Um menu modal
 * deixaria o `pointer-events: none` do Radix preso no `body`.
 */
export function MenuDaConta({ veAvisos }: { veAvisos: boolean }) {
  return veAvisos ? <MenuComAvisos /> : <Menu avisos={null} />;
}

function MenuComAvisos() {
  const { data } = useAgentInbox("open");
  // O som da organização para o aviso que pede gente — o mesmo do sino do original.
  useSonsDaCentral(data?.items);
  return <Menu avisos={data?.open_count ?? 0} />;
}

function Menu({ avisos }: { avisos: number | null }) {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const [buscaAberta, setBuscaAberta] = useState(false);

  // `enableOnFormTags`: o atalho vale com o cursor dentro do composer do inbox.
  useHotkeys("mod+k", () => setBuscaAberta(true), { preventDefault: true, enableOnFormTags: true });
  useHotkeys("mod+shift+l", () => setTheme(PROXIMO_TEMA[theme]), { preventDefault: true }, [theme]);

  const rotuloDosAvisos = avisos ? `${t("Central de avisos")} — ${avisos} ${t("em aberto")}` : t("Central de avisos");
  return (
    <>
      <DropdownMenu modal={false}>
        <GatilhoDoAvatar avisos={avisos} rotuloDosAvisos={rotuloDosAvisos} />
        <DropdownMenuContent align="end" sideOffset={8} className={cn(CONTEUDO_DO_MENU, "w-60")} style={SOMBRA_DO_MENU}>
          <CabecalhoDaConta />
          <SecaoDaOrganizacao />
          <DropdownMenuSeparator />
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => setBuscaAberta(true)}>
            <Search aria-hidden />
            {t("Buscar")}
            <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
          {avisos !== null ? (
            <DropdownMenuItem asChild className={ITEM_DO_MENU}>
              <Link href="/app/ai/inbox" aria-label={rotuloDosAvisos}>
                <Bell aria-hidden />
                {t("Central de avisos")}
                <SeloDaCasca
                  valor={avisos}
                  limite={99}
                  rotulo={rotuloDosAvisos}
                  className="ml-auto h-[14px] min-w-[14px] px-[5px] text-[9px]"
                />
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <SecaoDoIdioma />
          <DropdownMenuSeparator />
          <SecaoDoTema />
          <RodapeDaConta />
        </DropdownMenuContent>
      </DropdownMenu>
      <CommandPalette open={buscaAberta} onOpenChange={setBuscaAberta} />
    </>
  );
}

/** 28×28, raio 5, inicial branca; ▾ escuro 2px depois (01-010 x 1855–1901, ÷ 1,25). */
function GatilhoDoAvatar({ avisos, rotuloDosAvisos }: { avisos: number | null; rotuloDosAvisos: string }) {
  const t = useT();
  const { user } = useAuth();
  const inicial = ((user.full_name ?? "").trim() || user.email).charAt(0).toUpperCase();
  return (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label={t("Menu do usuário")}
        data-testid="menu-da-conta"
        className="relative flex items-center gap-[2px] rounded-[5px] outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca"
      >
        <Avatar className="size-7 rounded-[5px]">
          {user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
          <AvatarFallback className="rounded-[5px] bg-casca-marca text-base font-normal text-white">
            {inicial}
          </AvatarFallback>
        </Avatar>
        <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden className="text-casca-texto">
          <path d="M0 0h8L4 5z" fill="currentColor" />
        </svg>
        {avisos ? (
          <SeloDaCasca
            valor={avisos}
            limite={99}
            rotulo={rotuloDosAvisos}
            className="absolute -right-1 -top-1.5 h-[14px] min-w-[14px] px-1 text-[9px] ring-2 ring-surface"
          />
        ) : null}
      </button>
    </DropdownMenuTrigger>
  );
}

function CabecalhoDaConta() {
  const { user } = useAuth();
  return (
    <DropdownMenuLabel className="px-3 py-2">
      <span className="block truncate text-xs font-semibold text-casca-texto">{user.full_name ?? user.email}</span>
      <span className="block truncate text-[11px] font-normal text-casca-suave">{user.email}</span>
    </DropdownMenuLabel>
  );
}

function SecaoDaOrganizacao() {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const { trocando, trocar } = useTrocarDeOrganizacao();
  if (user.organizations.length <= 1 && !user.is_platform_admin) return null;
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className={ROTULO_DO_MENU}>{t("Organização")}</DropdownMenuLabel>
      {user.organizations.map((o) => (
        <DropdownMenuItem
          key={o.organization_id}
          className={ITEM_DO_MENU}
          disabled={trocando || !!user.support}
          title={user.support ? t("Saia do acompanhamento para trocar de organização") : undefined}
          onSelect={() => void trocar(o.organization_id)}
        >
          <Check aria-hidden className={o.organization_id === activeOrg?.orgId ? "" : "invisible"} />
          <span className="truncate">{o.organization_name}</span>
        </DropdownMenuItem>
      ))}
      {user.is_platform_admin ? (
        <DropdownMenuItem asChild className={ITEM_DO_MENU}>
          <Link href="/admin/tenants">{t("Gerenciar organizações")}</Link>
        </DropdownMenuItem>
      ) : null}
    </>
  );
}

function SecaoDoIdioma() {
  const t = useT();
  const { idioma, salvando, escolher } = useTrocarDeIdioma();
  return (
    <>
      <DropdownMenuLabel className={ROTULO_DO_MENU}>{t("Idioma")}</DropdownMenuLabel>
      {IDIOMAS_VISIVEIS.map(({ codigo, nomeNativo }) => (
        <DropdownMenuItem
          key={codigo}
          className={ITEM_DO_MENU}
          disabled={salvando}
          data-testid={`casca-idioma-${codigo}`}
          aria-current={codigo === idioma}
          onSelect={() => escolher(codigo)}
        >
          <Check aria-hidden className={codigo === idioma ? "" : "invisible"} />
          {nomeNativo}
        </DropdownMenuItem>
      ))}
    </>
  );
}

function SecaoDoTema() {
  const t = useT();
  const { theme, setTheme } = useTheme();
  const temas: { valor: Theme; rotulo: string }[] = [
    { valor: "light", rotulo: t("Claro") },
    { valor: "dark", rotulo: t("Escuro") },
    { valor: "system", rotulo: t("Sistema") },
  ];
  return (
    <>
      <DropdownMenuLabel className={ROTULO_DO_MENU}>{t("Tema")}</DropdownMenuLabel>
      {temas.map((tm) => (
        <DropdownMenuItem key={tm.valor} className={ITEM_DO_MENU} onSelect={() => setTheme(tm.valor)}>
          <Check aria-hidden className={tm.valor === theme ? "" : "invisible"} />
          {tm.rotulo}
        </DropdownMenuItem>
      ))}
    </>
  );
}

function RodapeDaConta() {
  const t = useT();
  const { user, signOut } = useAuth();
  const [saindo, startSaida] = useTransition();
  return (
    <>
      {user.is_platform_admin ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className={ITEM_DO_MENU}>
            <Link href="/admin" data-testid="casca-modo-administrador">
              <ShieldCheck aria-hidden />
              <span className="flex flex-col">
                <span>{t("Modo administrador")}</span>
                <span className="text-[11px] text-casca-suave">{t("Configurar este servidor")}</span>
              </span>
            </Link>
          </DropdownMenuItem>
        </>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className={ITEM_DO_MENU}
        disabled={saindo}
        onSelect={() =>
          startSaida(async () => {
            await signOut();
          })
        }
      >
        <LogOut aria-hidden />
        {t("Sair")}
      </DropdownMenuItem>
    </>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-menu-da-conta.test.tsx tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/controle-decorativo.test.ts
```
Expected: PASS nos três.

Se o caso do Ctrl+Shift+L falhar porque a tecla chega como `l` minúsculo, troque `L` por `l` no `keyboard` do teste. O `react-hotkeys-hook` 5 compara pelo `code` (`KeyL`), que é o mesmo nos dois casos.

- [ ] **Step 5: Commit**

```bash
git add components/escale/menu/MenuDaConta.tsx tests/unit/escale-menu-da-conta.test.tsx
git commit -m "feat(escale): avatar quadrado ▾ com organização, busca, avisos, idioma, tema e sair

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: ✦, "?" e "Novo +"

**Files:**
- Create: `components/escale/menu/BotaoDaIa.tsx`, `components/escale/menu/AjudaDoTopo.tsx`, `components/escale/menu/NovoDoTopo.tsx`, `tests/unit/escale-topo-acoes.test.tsx`

**Interfaces:**
- Consumes:
  - `AcaoDeCriar` e `ACOES_DE_CRIAR` (Task 3), `CONTEUDO_DO_MENU`, `SOMBRA_DO_MENU` e `ITEM_DO_MENU` (Task 5);
  - da V1: `BotaoDaCasca` (`variante="novo"`) e `PainelSuspenso`;
  - do original: `NewContactDialog({ open, onOpenChange })`, `Popover` e `PopoverTrigger`, e os primitivos `DropdownMenu*`.
- Produces:
  - `BotaoDaIa({ destino: string | null })` (`data-testid="ia-do-topo"`);
  - `AjudaDoTopo()` (`data-testid="ajuda-do-topo"`);
  - `NovoDoTopo({ acoes: readonly AcaoDeCriar[] })` (`data-testid="novo-do-topo"`).

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-topo-acoes.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/contacts/NewContactDialog", () => ({
  NewContactDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Novo contato" /> : null),
}));

import { AjudaDoTopo } from "@/components/escale/menu/AjudaDoTopo";
import { BotaoDaIa } from "@/components/escale/menu/BotaoDaIa";
import { NovoDoTopo } from "@/components/escale/menu/NovoDoTopo";
import { ACOES_DE_CRIAR } from "@/lib/escale/menu-do-topo";

const u = () => userEvent.setup({ pointerEventsCheck: 0 });
const CONTATO_E_CAMPANHA = ACOES_DE_CRIAR.filter((a) => a.id !== "proposta");

describe("✦ (IA)", () => {
  it("leva ao hub de IA", () => {
    render(<BotaoDaIa destino="/app/ai" />);
    expect(screen.getByRole("link", { name: "Agente de IA" })).toHaveAttribute("href", "/app/ai");
  });

  it("sem tela de IA visível, some", () => {
    render(<BotaoDaIa destino={null} />);
    expect(screen.queryByRole("link", { name: "Agente de IA" })).toBeNull();
  });
});

describe('"?" (ajuda)', () => {
  it("abre o painel com os atalhos que existem", async () => {
    const ator = u();
    render(<AjudaDoTopo />);
    expect(screen.getByRole("button", { name: "Ajuda" })).toHaveTextContent("?");
    await ator.click(screen.getByRole("button", { name: "Ajuda" }));
    expect(screen.getByText("Atalhos do teclado")).toBeInTheDocument();
    expect(screen.getByText("Buscar uma tela")).toBeInTheDocument();
    expect(screen.getByText("⌘K")).toBeInTheDocument();
    expect(screen.getByText("Trocar o tema")).toBeInTheDocument();
    expect(screen.getByText("⌘⇧L")).toBeInTheDocument();
  });
});

describe('"Novo +"', () => {
  it("lista o que a pessoa pode criar; campanha vai para a tela de criar", async () => {
    const ator = u();
    render(<NovoDoTopo acoes={CONTATO_E_CAMPANHA} />);
    await ator.click(screen.getByRole("button", { name: "Novo" }));
    expect(screen.getByRole("menuitem", { name: "Contato" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Campanha" })).toHaveAttribute("href", "/app/campaigns/new");
    expect(screen.queryByRole("menuitem", { name: "Proposta" })).toBeNull();
  });

  it("Contato abre a janela de novo contato na própria tela", async () => {
    const ator = u();
    render(<NovoDoTopo acoes={CONTATO_E_CAMPANHA} />);
    await ator.click(screen.getByRole("button", { name: "Novo" }));
    await ator.click(screen.getByRole("menuitem", { name: "Contato" }));
    expect(await screen.findByRole("dialog", { name: "Novo contato" })).toBeInTheDocument();
  });

  it("sem nada para criar, o botão some", () => {
    render(<NovoDoTopo acoes={[]} />);
    expect(screen.queryByRole("button", { name: "Novo" })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-topo-acoes.test.tsx
```
Expected: FAIL, `Failed to resolve import "@/components/escale/menu/AjudaDoTopo"`.

- [ ] **Step 3: Escrever as três peças**

Create `components/escale/menu/BotaoDaIa.tsx`:

```tsx
"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { Sparkle } from "@/lib/ui/icons-da-casca";

/**
 * O ✦ do topo da Clint: estrela de 4 pontas preenchida, ~14px, escura.
 *
 * Na Clint ele abre a "Aura" (assistente de IA). O Escale não tem assistente
 * global, então ele leva ao hub "Agente de IA". Decisão D2, a confirmar com o
 * usuário. O estado aberto é print que falta.
 */
export function BotaoDaIa({ destino }: { destino: string | null }) {
  const t = useT();
  if (!destino) return null;
  return (
    <Link
      href={destino}
      aria-label={t("Agente de IA")}
      title={t("Agente de IA")}
      data-testid="ia-do-topo"
      className="grid size-7 place-items-center rounded-casca-gatilho text-casca-texto transition-colors hover:bg-casca-raia"
    >
      <Sparkle size={15} fill="currentColor" strokeWidth={0} aria-hidden />
    </Link>
  );
}
```

Create `components/escale/menu/AjudaDoTopo.tsx`:

```tsx
"use client";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";

/**
 * O "?" do topo da Clint: "?" na cor da marca (`#7C00FF` na Clint) sobre um
 * círculo lilás de 24px (`#F2EDFF` → `casca-marca-suave`).
 *
 * O que ele abre na Clint é print que falta, e o Escale não tem central de
 * ajuda. Por isso o painel mostra só os atalhos que existem. O selo vermelho
 * ("2" na Clint) não aparece: não temos de onde tirar o número. Decisão D3.
 */
export function AjudaDoTopo() {
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("Ajuda")}
          data-testid="ajuda-do-topo"
          className="grid size-6 place-items-center rounded-full bg-casca-marca-suave text-[13px] font-semibold leading-none text-casca-marca outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca"
        >
          ?
        </button>
      </PopoverTrigger>
      <PainelSuspenso align="end" sideOffset={8} className="w-64 p-3">
        <p className="text-xs font-semibold text-casca-texto">{t("Ajuda")}</p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha">
          {t("Atalhos do teclado")}
        </p>
        <ul className="mt-1.5 space-y-1.5">
          <li className="flex items-center justify-between text-xs text-casca-texto">
            <span>{t("Buscar uma tela")}</span>
            <kbd className="rounded-sm bg-casca-raia px-1.5 py-0.5 text-[10px] text-casca-texto-2">⌘K</kbd>
          </li>
          <li className="flex items-center justify-between text-xs text-casca-texto">
            <span>{t("Trocar o tema")}</span>
            <kbd className="rounded-sm bg-casca-raia px-1.5 py-0.5 text-[10px] text-casca-texto-2">⌘⇧L</kbd>
          </li>
        </ul>
      </PainelSuspenso>
    </Popover>
  );
}
```

Create `components/escale/menu/NovoDoTopo.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useState } from "react";

import { NewContactDialog } from "@/components/contacts/NewContactDialog";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { AcaoDeCriar } from "@/lib/escale/menu-do-topo";
import { FileText, Megaphone, Plus, UserPlus } from "@/lib/ui/icons-da-casca";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "./estilos";

const ICONE = { contato: UserPlus, campanha: Megaphone, proposta: FileText } as const;

/**
 * O "Novo +" azul do topo da Clint: 53×22, `#597EFF` (copiado; não é a marca),
 * texto branco 11px/500 e raio ~5.
 *
 * O menu aberto da Clint é print que falta. Entram só as criações que o Escale
 * já tem (Decisão D4).
 */
export function NovoDoTopo({ acoes }: { acoes: readonly AcaoDeCriar[] }) {
  const t = useT();
  const [contatoAberto, setContatoAberto] = useState(false);
  if (acoes.length === 0) return null;
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <BotaoDaCasca variante="novo" data-testid="novo-do-topo" className="h-[22px] gap-1 px-2 text-[11px] font-medium">
            {t("Novo")}
            <Plus size={12} strokeWidth={2.5} aria-hidden />
          </BotaoDaCasca>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className={CONTEUDO_DO_MENU} style={SOMBRA_DO_MENU}>
          {acoes.map((a) => {
            const Icone = ICONE[a.id];
            return a.destino ? (
              <DropdownMenuItem key={a.id} asChild className={ITEM_DO_MENU}>
                <Link href={a.destino}>
                  <Icone aria-hidden />
                  {t(a.rotulo)}
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={a.id} className={ITEM_DO_MENU} onSelect={() => setContatoAberto(true)}>
                <Icone aria-hidden />
                {t(a.rotulo)}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {contatoAberto ? <NewContactDialog open onOpenChange={setContatoAberto} /> : null}
    </>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-topo-acoes.test.tsx tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/controle-decorativo.test.ts
```
Expected: PASS nos três.

- [ ] **Step 5: Commit**

```bash
git add components/escale/menu/BotaoDaIa.tsx components/escale/menu/AjudaDoTopo.tsx components/escale/menu/NovoDoTopo.tsx tests/unit/escale-topo-acoes.test.tsx
git commit -m "feat(escale): ✦, ? e Novo + do topo da casca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: A barra do topo e o painel Mais

**Files:**
- Modify: `components/escale/menu/MenuDoTopo.tsx` (reescrito), `components/escale/menu/PainelMais.tsx` (reescrito), `tests/unit/escale-menu-do-topo-tela.test.tsx` (reescrito)

**Interfaces:**
- Consumes:
  - das Tasks 3, 5, 7 e 8: `montarMenuDoTopo`, `acoesDeCriar`, `entradaDaIa`, `itemAtivo`, `destinoAtivo`, `GrupoDoMais`, `ContadorDaFilaDaCasca`, `MenuDaConta`, `BotaoDaIa`, `AjudaDoTopo` e `NovoDoTopo`;
  - da casca: `MarcaNoTopo`, `caminhoDaChave` e `AvisoDePropostaEmDestaque` (do original; só o portal do cartão);
  - do registro: `searchable`.
- Produces:
  - `MenuDoTopo()`, com o mesmo nome e a mesma exportação. O `AppShell` não muda;
  - `PainelMais({ grupos, pathnameAtual, onNavegar })`, com a mesma assinatura.

- [ ] **Step 1: Reescrever o teste de tela (vai falhar)**

Replace the whole content of `tests/unit/escale-menu-do-topo-tela.test.tsx`:

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
vi.mock("@/components/shell/AvisoDePropostaEmDestaque", () => ({ AvisoDePropostaEmDestaque: () => null }));
vi.mock("@/components/escale/menu/ContadorDaFilaDaCasca", () => ({ ContadorDaFilaDaCasca: () => null }));
vi.mock("@/components/escale/menu/MarcaNoTopo", () => ({ MarcaNoTopo: () => null }));
vi.mock("@/components/escale/menu/BotaoDaIa", () => ({
  BotaoDaIa: ({ destino }: { destino: string | null }) => <span data-testid="ia-do-topo" data-destino={destino ?? ""} />,
}));
vi.mock("@/components/escale/menu/AjudaDoTopo", () => ({ AjudaDoTopo: () => <span data-testid="ajuda-do-topo" /> }));
vi.mock("@/components/escale/menu/NovoDoTopo", () => ({
  NovoDoTopo: ({ acoes }: { acoes: readonly { id: string }[] }) => (
    <span data-testid="novo-do-topo" data-acoes={acoes.map((a) => a.id).join(",")} />
  ),
}));
vi.mock("@/components/escale/menu/MenuDaConta", () => ({
  MenuDaConta: ({ veAvisos }: { veAvisos: boolean }) => <span data-testid="menu-da-conta" data-avisos={String(veAvisos)} />,
}));

import { MenuDoTopo } from "@/components/escale/menu/MenuDoTopo";

describe("<MenuDoTopo> (igual ao da Clint, variante superior)", () => {
  it("barra de 44px com borda de baixo, os 7 itens na ordem, Negócios ativo num funil", () => {
    render(<MenuDoTopo />);
    expect(screen.getByTestId("menu-do-topo")).toHaveClass("h-11", "border-b", "border-casca-borda", "bg-surface");
    const nav = screen.getByRole("navigation", { name: "Menu principal" });
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Negócios",
      "Contatos",
      "Atividades",
      "Atendimento",
      "Automações",
      "Campanhas",
      "Indicadores",
    ]);
    const negocios = within(nav).getByRole("link", { name: "Negócios" });
    expect(negocios).toHaveAttribute("aria-current", "page");
    expect(negocios).toHaveClass("bg-casca-marca-suave", "font-semibold");
    expect(within(nav).getByRole("link", { name: "Atendimento" })).toHaveAttribute("href", "/app/inbox");
    expect(within(nav).getByRole("link", { name: "Campanhas" })).toHaveAttribute("href", "/app/campaigns");
  });

  it("Mais abre o painel: Empresas, Agenda e Agentes estão lá, o topo não se repete, e Esc fecha", async () => {
    const user = userEvent.setup();
    render(<MenuDoTopo />);
    await user.click(screen.getByRole("button", { name: "Mais" }));
    const painel = screen.getByRole("dialog", { name: "Todas as telas" });
    expect(within(painel).getByText("Mais")).toBeInTheDocument();
    expect(within(painel).getByRole("link", { name: "Webhooks" })).toHaveAttribute("href", "/app/webhooks");
    expect(within(painel).getByRole("link", { name: "Empresas" })).toHaveAttribute("href", "/app/companies");
    expect(within(painel).getByRole("link", { name: "Agenda" })).toHaveAttribute("href", "/app/agenda");
    expect(within(painel).getByRole("link", { name: "Agentes" })).toHaveAttribute("href", "/app/ai/agents");
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

  it("à direita: ✦, ?, Novo + e o avatar, nessa ordem; busca, sino, idioma e organização não ficam soltos", () => {
    render(<MenuDoTopo />);
    const ordem = ["ia-do-topo", "ajuda-do-topo", "novo-do-topo", "menu-da-conta"].map((id) => screen.getByTestId(id));
    for (let i = 1; i < ordem.length; i++) {
      expect(ordem[i - 1]!.compareDocumentPosition(ordem[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByTestId("ia-do-topo")).toHaveAttribute("data-destino", "/app/ai");
    expect(screen.getByTestId("novo-do-topo")).toHaveAttribute("data-acoes", "contato,campanha");
    expect(screen.getByTestId("menu-da-conta")).toHaveAttribute("data-avisos", "true");
    expect(screen.queryByRole("button", { name: /Buscar/ })).toBeNull();
    for (const id of ["tenant-switcher", "alerts-bell", "seletor-de-idioma"]) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-menu-do-topo-tela.test.tsx
```
Expected: FAIL. O `MenuDoTopo` antigo ainda monta `TenantSwitcher`, `SearchTrigger`, `AlertsBell` e `UserMenu`, que o teste novo não substitui por dublês. Os casos quebram com erro de provider (`useUser`/`useActiveOrg`), ou, onde chegam a renderizar:
- o 1º falha em `toHaveClass("h-11", …)`;
- o 4º falha em `Unable to find an element by: [data-testid="ia-do-topo"]`.

- [ ] **Step 3: Reescrever a barra**

Replace the whole content of `components/escale/menu/MenuDoTopo.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { AvisoDePropostaEmDestaque } from "@/components/shell/AvisoDePropostaEmDestaque";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import {
  acoesDeCriar,
  entradaDaIa,
  itemAtivo,
  montarMenuDoTopo,
  type GrupoDoMais,
} from "@/lib/escale/menu-do-topo";
import { searchable } from "@/lib/navigation/registry";
import { cn } from "@/lib/utils";

import { AjudaDoTopo } from "./AjudaDoTopo";
import { BotaoDaIa } from "./BotaoDaIa";
import { ContadorDaFilaDaCasca } from "./ContadorDaFilaDaCasca";
import { MarcaNoTopo } from "./MarcaNoTopo";
import { MenuDaConta } from "./MenuDaConta";
import { NovoDoTopo } from "./NovoDoTopo";
import { PainelMais } from "./PainelMais";

/**
 * Item do topo da Clint (01-010, ÷ 1,25): texto 14/400 `#2F2C5D`, padding
 * lateral de 9px e nenhum gap entre os blocos.
 * - Ativo: fundo de altura inteira na cor da marca bem clara (`#F8F6FD` na
 *   Clint), em semibold, sem sublinhado.
 * - Hover: são os tokens da Clint (`navHover` rgba(0,0,0,.03) e texto na cor da
 *   marca). O print do hover falta.
 */
const ITEM = "flex shrink-0 items-center gap-1.5 whitespace-nowrap px-[9px] text-sm text-casca-texto transition-colors";
const ITEM_ATIVO = "bg-casca-marca-suave font-semibold";
const ITEM_PARADO = "hover:bg-black/[.03] hover:text-casca-marca";

/**
 * A barra do topo da casca nova (md+), igual à da Clint na variante "menu
 * superior". No celular a casca mostra a `TopBar` de sempre (gaveta + barra
 * inferior), então este componente se esconde abaixo de `md`.
 *
 * Medidas (01-010, ÷ 1,25; janela de 1536px):
 *   - altura de 44px com a borda;
 *   - marca a 18px da esquerda e 18px até o 1º item;
 *   - ▾ do avatar a 14px da direita;
 *   - 18px entre as peças do lado direito.
 */
export function MenuDoTopo() {
  const t = useT();
  const pathname = usePathname() ?? "/app";
  const { user, activeOrg } = useAuth();
  const visiveis = useMemo(
    () =>
      searchable(
        user.is_platform_admin && !user.support,
        activeOrg?.role ?? null,
        activeOrg?.interface_settings,
        activeOrg?.modulos_ligados ?? [],
        activeOrg?.capacidades_ligadas ?? [],
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
  const menu = useMemo(() => montarMenuDoTopo(visiveis), [visiveis]);
  const acoes = useMemo(() => acoesDeCriar(visiveis, activeOrg?.role ?? null), [visiveis, activeOrg?.role]);

  return (
    <header
      data-testid="menu-do-topo"
      className="sticky top-0 z-30 hidden h-11 shrink-0 items-stretch border-b border-casca-borda bg-surface pl-[18px] pr-[14px] md:flex"
    >
      <div className="flex shrink-0 items-center pr-[18px]">
        <MarcaNoTopo />
      </div>
      <nav aria-label={t("Menu principal")} className="flex min-w-0 items-stretch overflow-x-auto">
        {menu.topo.map((item) => {
          const ativo = itemAtivo(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.destino ?? item.href}
              // A entrada de Negócios só redireciona: pré-carregar não adianta nada.
              prefetch={item.destino ? false : undefined}
              aria-current={ativo ? "page" : undefined}
              className={cn(ITEM, ativo ? ITEM_ATIVO : ITEM_PARADO)}
            >
              {t(item.rotulo)}
              {item.contador === "fila" && (
                <ContadorDaFilaDaCasca limite={99} className="h-[14px] min-w-[14px] px-[5px] text-[9px]" />
              )}
            </Link>
          );
        })}
      </nav>
      {menu.mais.length > 0 && <BotaoMais grupos={menu.mais} pathname={pathname} />}
      <div className="ml-auto flex shrink-0 items-center gap-[18px] pl-4">
        <BotaoDaIa destino={entradaDaIa(visiveis)} />
        <AjudaDoTopo />
        <NovoDoTopo acoes={acoes} />
        <MenuDaConta veAvisos={visiveis.some((d) => d.href === "/app/ai/inbox")} />
        <AvisoDePropostaEmDestaque />
      </div>
    </header>
  );
}

/** "⠿ Mais": 4 pontos (2×2) antes do rótulo, com 5px a mais de espaço antes (01-010 x 901→930). */
function BotaoMais({ grupos, pathname }: { grupos: GrupoDoMais[]; pathname: string }) {
  const t = useT();
  // O painel fica aberto "nesta tela": trocar de tela fecha sem precisar de efeito
  // (estado derivado, e não setState dentro de useEffect).
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === pathname;
  const ancora = useRef<HTMLDivElement>(null);

  // Clique fora ou Esc fecham o painel.
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

  return (
    <div ref={ancora} className="relative ml-[5px] flex shrink-0 items-stretch">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={() => setAbertoEm((v) => (v === pathname ? null : pathname))}
        className={cn(ITEM, aberto ? ITEM_ATIVO : ITEM_PARADO)}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="currentColor">
          <circle cx="2" cy="2" r="1.6" />
          <circle cx="8" cy="2" r="1.6" />
          <circle cx="2" cy="8" r="1.6" />
          <circle cx="8" cy="8" r="1.6" />
        </svg>
        {t("Mais")}
      </button>
      {aberto && <PainelMais grupos={grupos} pathnameAtual={pathname} onNavegar={() => setAbertoEm(null)} />}
    </div>
  );
}
```

- [ ] **Step 4: Reescrever o painel Mais**

Replace the whole content of `components/escale/menu/PainelMais.tsx`:

```tsx
"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { caminhoDaChave } from "@/lib/escale/preferencia-de-menu";
import { destinoAtivo, type GrupoDoMais } from "@/lib/escale/menu-do-topo";
import { cn } from "@/lib/utils";

/**
 * O painel "Mais" com o visual do `12-001` da Clint. Esse print é da variante
 * lateral, porque o "⠿ Mais" aberto na superior é print que falta.
 *
 * Medidas (÷ 1,25):
 *   - painel de 280px, branco, borda `#E8E4F5`;
 *   - título "Mais" centralizado numa faixa de 54px;
 *   - grupos com cabeçalho em maiúsculas, espaçado, na cor da marca;
 *   - itens de 33px com ícone de 14px na cor da marca e texto de 12px
 *     `#2F2C5D`, a 20px da borda.
 * A Clint não tem subseções, então as seções do registro viram uma lista só
 * dentro de cada grupo. "Voltar ao menu lateral" é nosso e fica no rodapé.
 */
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
      className="absolute left-0 top-[calc(100%+1px)] z-40 flex max-h-[70dvh] w-[280px] flex-col overflow-hidden rounded-b-md border border-casca-borda bg-surface"
      style={{ boxShadow: "var(--shadow-casca-painel)" }}
    >
      <p className="flex h-[54px] shrink-0 items-center justify-center border-b border-casca-borda text-sm font-semibold text-casca-texto">
        {t("Mais")}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3">
        {grupos.map(({ grupo, secoes }) => (
          <section key={grupo.id} className="pt-4">
            <h2 className="pb-1 text-[10px] font-medium uppercase tracking-[.12em] text-casca-marca">{t(grupo.label)}</h2>
            <ul>
              {secoes
                .flatMap((s) => s.itens)
                .map((d) => {
                  const ativo = destinoAtivo(pathnameAtual, d.href);
                  return (
                    <li key={d.href}>
                      <Link
                        href={d.href}
                        onClick={onNavegar}
                        aria-current={ativo ? "page" : undefined}
                        className={cn(
                          "flex h-[33px] items-center gap-3 text-xs text-casca-texto transition-colors hover:text-casca-marca",
                          ativo && "font-semibold",
                        )}
                      >
                        <d.icon size={14} aria-hidden className="shrink-0 text-casca-marca" />
                        {t(d.label)}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
      <div className="shrink-0 border-t border-casca-borda px-5 py-2.5">
        {/* <a> e não <Link>: a rota grava o cookie e o layout precisa ser refeito no servidor. */}
        <a
          href={caminhoDaChave("lateral", pathnameAtual)}
          className="text-xs text-casca-suave underline-offset-2 hover:underline"
        >
          {t("Voltar ao menu lateral")}
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rodar e ver passar (com as cercas da casca)**

```bash
corepack pnpm vitest run tests/unit/escale-menu-do-topo-tela.test.tsx tests/unit/escale-menu-do-topo.test.ts tests/unit/escale-casca-v2-original-intacto.test.tsx tests/unit/escale-tema.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/controle-decorativo.test.ts
corepack pnpm typecheck
```
Expected: PASS em todos, e typecheck sem erros novos.

Se `tailwind-tokens` reclamar de `hover:bg-black/[.03]`, troque a classe por `hover:bg-casca-raia` nas duas constantes `ITEM_PARADO` (o hover da Clint é print que falta) e anote no relatório da Task 11.

- [ ] **Step 6: Commit**

```bash
git add components/escale/menu/MenuDoTopo.tsx components/escale/menu/PainelMais.tsx tests/unit/escale-menu-do-topo-tela.test.tsx
git commit -m "feat(escale): barra do topo e painel Mais iguais aos da Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: O botão flutuante de conversas (FAB)

**Files:**
- Modify: `components/escale/ConversasFlutuante.tsx` (reescrito), `tests/unit/escale-conversas-flutuante.test.tsx` (reescrito)

**Interfaces:**
- Consumes: `ContadorDaFilaDaCasca` (Task 5), `MessageCircleMore` e `X` (Task 4), e do original `apiClient` e `rotuloDoContato`.
- Produces: `ConversasFlutuante({ reservaDoRodape: number })`, com a mesma assinatura (o `AppShell` não muda). O botão tem `data-testid="botao-de-conversas"` e ganha `data-aberto` quando o painel está aberto.

- [ ] **Step 1: Reescrever o teste (vai falhar)**

Replace the whole content of `tests/unit/escale-conversas-flutuante.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let caminho = "/app/kanban";
vi.mock("next/navigation", () => ({ usePathname: () => caminho }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));
vi.mock("@/components/escale/menu/ContadorDaFilaDaCasca", () => ({
  ContadorDaFilaDaCasca: ({ limite }: { limite: number }) => <span data-testid="selo-do-fab" data-limite={limite} />,
}));

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

describe("<ConversasFlutuante> (FAB da Clint)", () => {
  it("círculo de 50px com o selo da fila limitado a +9", () => {
    renderizar();
    const botao = screen.getByRole("button", { name: "Conversas recentes" });
    expect(botao).toHaveClass("size-[50px]", "rounded-full");
    expect(within(botao).getByTestId("selo-do-fab")).toHaveAttribute("data-limite", "9");
    expect(botao).not.toHaveAttribute("data-aberto");
  });

  it("só busca quando abre; aberto, vira X, o selo some e o painel tem o título Conversas", async () => {
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
    const botao = screen.getByRole("button", { name: "Conversas recentes" });
    expect(botao).toHaveAttribute("data-aberto");
    expect(within(botao).queryByTestId("selo-do-fab")).toBeNull();
    const painel = screen.getByRole("dialog", { name: "Conversas recentes" });
    expect(within(painel).getByRole("heading", { name: "Conversas" })).toBeInTheDocument();
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

  it("fica a 30px da direita e 36px da base, e sobe acima de peça fixa do rodapé", () => {
    const { container, unmount } = renderizar(0);
    const solto = container.firstElementChild as HTMLElement;
    expect(solto.style.right).toBe("30px");
    expect(solto.style.bottom).toBe("36px");
    unmount();
    const comPeca = renderizar(80).container.firstElementChild as HTMLElement;
    expect(comPeca.style.bottom).toBe("116px");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-conversas-flutuante.test.tsx
```
Expected: FAIL. `toHaveClass("size-[50px]", …)` não bate, `data-aberto` não existe, o heading "Conversas" não existe e `style.right` vale `""`.

- [ ] **Step 3: Reescrever o FAB**

Replace the whole content of `components/escale/ConversasFlutuante.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { ContadorDaFilaDaCasca } from "@/components/escale/menu/ContadorDaFilaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import { MessageCircleMore, X } from "@/lib/ui/icons-da-casca";

interface ConversaResumo {
  id: string;
  last_message_preview: string | null;
  unread_count_for_assignee: number | null;
  contacts: { display_name: string | null; name: string | null } | null;
}

/**
 * Medidas da Clint (01-001…01-011, ÷ 1,25; janela de 1536px): círculo de 50px,
 * a 30px da direita e 36px da base. A posição vai por `style`, nunca por
 * `fixed bottom-N` na classe (cerca `rodape-ocupado-contrato`): a reserva do
 * rodapé (painel de chamada etc.) entra somada.
 */
const DIREITA = 30;
const BASE = 36;

/**
 * O degradê da Clint (`#D1A8F5` → `#8B5CFF`) refeito com a cor da marca: 35% e
 * 80% da marca sobre o branco. Com o roxo da Clint (`#6C19DE`), isso dá
 * `#CCAFF3` → `#8947E4`.
 */
const DEGRADE_DA_MARCA =
  "linear-gradient(180deg, color-mix(in srgb, var(--color-casca-marca) 35%, white), color-mix(in srgb, var(--color-casca-marca) 80%, white))";

/**
 * Botão flutuante (canto inferior direito, md+) com as 5 conversas mais recentes,
 * como o da Clint. Só busca quando abre. Não aparece dentro de Conversas.
 * `reservaDoRodape` vem do AppShell para o botão não ficar por baixo de peça fixa.
 */
export function ConversasFlutuante({ reservaDoRodape }: { reservaDoRodape: number }) {
  const t = useT();
  const pathname = usePathname() ?? "/app";
  // Aberto "nesta tela": trocar de tela fecha sem setState dentro de useEffect.
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === pathname;
  const ancora = useRef<HTMLDivElement>(null);

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
      className="fixed z-40 hidden md:block"
      style={{ right: DIREITA, bottom: BASE + reservaDoRodape }}
    >
      {aberto && <PainelDeConversas />}
      <button
        type="button"
        aria-label={t("Conversas recentes")}
        aria-expanded={aberto}
        data-testid="botao-de-conversas"
        data-aberto={aberto ? "" : undefined}
        onClick={() => setAbertoEm((v) => (v === pathname ? null : pathname))}
        className="relative grid size-[50px] place-items-center rounded-full text-white transition-[filter] hover:brightness-105"
        style={{ background: aberto ? "var(--color-casca-marca)" : DEGRADE_DA_MARCA }}
      >
        {aberto ? <X size={22} aria-hidden /> : <BalaoComPontos />}
        {!aberto && (
          <ContadorDaFilaDaCasca
            limite={9}
            className="absolute -right-1.5 -top-px h-[18px] min-w-[18px] px-1 text-[10px] font-semibold ring-2 ring-white"
          />
        )}
      </button>
    </div>
  );
}

/** O balão branco com três pontos na cor da marca (crops/fab.png). */
function BalaoComPontos() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3C6.5 3 2 6.9 2 11.7c0 2.6 1.3 4.9 3.4 6.5L4.6 21.5l4-1.9c1.1.3 2.2.5 3.4.5 5.5 0 10-3.9 10-8.4S17.5 3 12 3Z"
        fill="white"
      />
      <circle cx="7.8" cy="11.7" r="1.3" fill="var(--color-casca-marca)" />
      <circle cx="12" cy="11.7" r="1.3" fill="var(--color-casca-marca)" />
      <circle cx="16.2" cy="11.7" r="1.3" fill="var(--color-casca-marca)" />
    </svg>
  );
}

/**
 * A moldura do painel da Clint (01-025, variante lateral): ~400px, cantos
 * arredondados, sombra e cabeçalho lilás com "Conversas" e um balão. A busca,
 * o "Todos" e a ordenação da Clint não entram: o painel da variante superior é
 * print que falta, e o conteúdo continua o de antes.
 */
function PainelDeConversas() {
  const t = useT();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["escale", "conversas-recentes"],
    queryFn: async () =>
      (await apiClient.get<{ data: ConversaResumo[] }>("/api/v1/conversations?limit=5&exclude_finished=true")).data,
    staleTime: 15_000,
  });
  return (
    <div
      role="dialog"
      aria-label={t("Conversas recentes")}
      className="absolute bottom-[62px] right-0 w-[400px] overflow-hidden rounded-[13px] border border-casca-borda bg-surface"
      style={{ boxShadow: "var(--shadow-casca-painel)" }}
    >
      <div className="flex items-center justify-between bg-casca-marca-suave px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-casca-texto">
          {t("Conversas")}
          <MessageCircleMore size={16} aria-hidden className="text-casca-marca" />
        </h2>
        <Link href="/app/inbox" className="text-xs text-casca-marca hover:underline">
          {t("Abrir Conversas")}
        </Link>
      </div>
      {isLoading ? (
        <p className="px-4 py-6 text-xs text-casca-suave">{t("Carregando…")}</p>
      ) : isError ? (
        <p className="px-4 py-6 text-xs text-casca-suave">{t("Não consegui carregar as conversas.")}</p>
      ) : !data || data.length === 0 ? (
        <p className="px-4 py-6 text-xs text-casca-suave">{t("Nenhuma conversa ainda.")}</p>
      ) : (
        <ul>
          {data.map((c) => {
            const naoLidas = c.unread_count_for_assignee ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/app/inbox/${c.id}`}
                  className="flex items-start gap-3 border-b border-casca-borda px-4 py-3 last:border-b-0 hover:bg-casca-raia"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-casca-texto">
                      {rotuloDoContato(c.contacts, t)}
                    </span>
                    <span className="block truncate text-xs text-casca-suave">
                      {c.last_message_preview || t("Sem mensagem")}
                    </span>
                  </span>
                  {naoLidas > 0 && (
                    <span className="rounded-sm bg-casca-novo px-1.5 text-[11px] font-semibold text-white tabular-nums">
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
  );
}
```

O `useQuery` saiu do botão e entrou no `PainelDeConversas`, que só monta quando o painel abre. Com isso, "só busca quando abre" continua valendo sem o `enabled`.

- [ ] **Step 4: Rodar e ver passar (com a cerca do rodapé)**

```bash
corepack pnpm vitest run tests/unit/escale-conversas-flutuante.test.tsx tests/unit/rodape-ocupado-contrato.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/escale-casca-v2-original-intacto.test.tsx
```
Expected: PASS em todos.

- [ ] **Step 5: Commit**

```bash
git add components/escale/ConversasFlutuante.tsx tests/unit/escale-conversas-flutuante.test.tsx
git commit -m "feat(escale): botão flutuante de conversas igual ao da Clint, com a cor da marca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Verificação visual lado a lado com a Clint

**Files:**
- Nenhum arquivo do repositório. O resultado é a lista de diferenças que sobraram, que vai para o corpo do PR na Task 12.

**Interfaces:**
- Consumes: tudo das Tasks 3 a 10.
- Produces: capturas da tela com a casca e a lista das diferenças que sobraram, cada uma com justificativa (falta de print ou decisão D1 a D10). **Diferença sem justificativa = a tarefa não está pronta:** volte à task que desenha a peça e ajuste.

- [ ] **Step 1: Onde conferir (regra única dos planos V1 a V4, contrato "Conferência visual")**

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

- **`CAMINHO A`** (existe `.env.local` e ele aponta para um Supabase local, não para o de produção): siga os Steps 2 a 6, com o dev server em `http://localhost:3000`.
- **`CAMINHO B`** (o normal hoje: em 16/10 não havia `.env.local`):
  - **não** crie `.env.local`, **não** suba o Supabase local nem o Docker sem o "pode fazer" do usuário e **nunca** aponte o `pnpm dev` para o banco de produção (`jsrzgxyioczdgwiklkrc`) nem para o antigo (`hwpnnstguqrfhfnsvthv`);
  - vá para a Task 12. No corpo do PR, `<DIFERENÇAS>` vira: "Conferência visual pendente: feita depois do deploy, em https://app.escaleia.com, pela regra do contrato; as diferenças vão num PR de correção (`fix/casca-clint-v2-conferencia`)". As decisões D2 a D6 seguem para o usuário no corpo do PR;
  - **depois do deploy** (quando o usuário avisar que mergeou, publicou a versão e atualizou a VPS; nada disso é deste plano), faça os Steps 2 a 6 no app de produção, com estas trocas:
    - carregue a skill `chrome-browser` e as ferramentas do Claude in Chrome (`mcp__claude-in-chrome__*`) num único ToolSearch e trabalhe numa aba nova;
    - no lugar de `http://localhost:3000`, use `https://app.escaleia.com`, com a sessão do próprio usuário (se pedir login, PARE e peça para ele entrar; nunca digite senha). Não suba dev server;
    - **só leitura:** navegar, abrir e fechar menus e painéis (Esc), passar o mouse, ler a página, medir com `javascript_tool` e tirar captura. Proibido criar contato ou campanha pelo "Novo +", trocar de organização, de idioma ou de tema e entrar no modo administrador: é o banco de produção. Abra os menus só para olhar;
    - a janela vai em 1536×~880 pelo `resize_window`;
    - a lista das diferenças (cada uma com o porquê) vai num **PR de correção**: branch `fix/casca-clint-v2-conferencia` a partir de `escale-crm/main`, cada conserto com o teste da peça, commits com o rodapé `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, PR para `rgisjr/escale-crm` com o corpo terminando em `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Sem push em `origin`, sem merge, sem release, sem VPS.

- [ ] **Step 2: Subir o servidor e ligar a casca (CAMINHO A; no B, só ligar a casca no app de produção)**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
corepack pnpm dev
```
(rodar em segundo plano). Depois, no navegador (Claude in Chrome, se estiver disponível; se não, peça ao usuário):
1. Entre em `http://localhost:3000` com um usuário admin.
2. Ligue a casca em `http://localhost:3000/app/escale/menu?usar=topo&voltar=%2Fapp%2Fkanban`.
3. Abra um funil, que é a tela do `01-010`.
4. Deixe a janela com **1536 × 805 px de área visível** e zoom de 100% (DPR 1). É a janela do print a 125%.

- [ ] **Step 3: Medir**

Cole no console da página (ou rode pelo `javascript_tool`):

```js
(() => {
  const q = (s) => document.querySelector(s);
  const caixa = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      direita: Math.round(innerWidth - r.right), base: Math.round(innerHeight - r.bottom) };
  };
  const topo = q('[data-testid="menu-do-topo"]');
  const ativo = topo?.querySelector('[aria-current="page"]');
  const estilo = (el) => el && getComputedStyle(el);
  return JSON.stringify({
    janela: [innerWidth, innerHeight],
    topo: caixa(topo), bordaDoTopo: estilo(topo)?.borderBottomColor,
    ativo: caixa(ativo), fundoDoAtivo: estilo(ativo)?.backgroundColor,
    fonteDoAtivo: ativo && `${estilo(ativo).fontSize} ${estilo(ativo).fontWeight} ${estilo(ativo).fontFamily.split(",")[0]}`,
    selo: caixa(topo?.querySelector('[data-testid="selo-da-casca"]')),
    ia: caixa(q('[data-testid="ia-do-topo"]')), ajuda: caixa(q('[data-testid="ajuda-do-topo"]')),
    novo: caixa(q('[data-testid="novo-do-topo"]')), conta: caixa(q('[data-testid="menu-da-conta"]')),
    fab: caixa(q('[data-testid="botao-de-conversas"]')),
  }, null, 1);
})()
```

Compare com o esperado (px de CSS, janela de 1536):

| Peça | Esperado |
|---|---|
| `topo` | `h` 44; `bordaDoTopo` = `rgb(232, 228, 245)` |
| `ativo` | `h` 43; começa 18px depois do fim da marca; `fonteDoAtivo` = `14px 600 Poppins`; fundo = tom bem claro da marca |
| `selo` (com fila > 0) | `h` 14, `w` ≥ 14 (28 com "99+") |
| `conta` | `direita` 14; avatar 28×28 |
| `novo` | `w` 53 ± 2, `h` 22; `direita` ≈ 70; `y` ≈ 11 |
| `ajuda` | 24×24; centro ≈ 152px da direita |
| `ia` | 28×28; centro ≈ 197px da direita |
| `fab` | 50×50; `direita` 30; `base` 36 |

- [ ] **Step 4: Capturar e comparar lado a lado**

Tire estas capturas e compare cada uma com a referência:
- **o topo inteiro:** compare com o topo de 01-010-kanban-v1.png e com docs/escale/clint/crops/top-left.png e top-right.png;
- **o FAB:** compare com docs/escale/clint/crops/fab.png;
- **o Mais aberto:** compare com 12-001-menu-mais.png;
- **o "Novo +", o "?" e o avatar abertos:** sem print, só registre como ficaram;
- **o painel do FAB aberto:** compare com 01-025-botao-flutuante-conversas.png.

Anote numa lista cada diferença que sobrou e a justificativa dela. Exemplos de justificativa aceita:
- "logo é a nossa marca";
- "D5: fundo do avatar na cor da marca";
- "hover: print que falta".

- [ ] **Step 5: Conferir que sem a casca nada mudou**

Abra `http://localhost:3000/app/escale/menu?usar=lateral&voltar=%2Fapp%2Fkanban`.

Expected:
- a barra lateral e a `TopBar` de sempre: organização, busca ⌘K, sino, idioma, tema e avatar redondo;
- nenhum FAB.

Pare o `pnpm dev` (CAMINHO A). No CAMINHO B, volte a casca para o topo depois (`…/app/escale/menu?usar=topo`), para deixar o navegador do usuário como estava.

- [ ] **Step 6: Mostrar ao usuário**

Mostre as capturas, a tabela medida e a lista de diferenças. Peça a confirmação das decisões D2 a D6 antes do PR. Se ele pedir ajuste, volte à task da peça.

---

### Task 12: Gates e PR

**Files:**
- Nenhum arquivo novo. Só verificação e o PR.

**Interfaces:**
- Consumes: tudo das Tasks 1 a 11.
- Produces: o PR para `rgisjr/escale-crm`. Não mergear, não publicar release e não mexer na VPS.

- [ ] **Step 1: Nenhum arquivo do original mudou**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
git diff --stat escale-crm/main...HEAD -- components/shell components/theme components/ui components/contacts app/app/_components app/app/layout.tsx lib/navigation hooks/auth hooks/inbox hooks/ai hooks/notifications lib/theme.tsx
```
Expected: saída vazia. Se aparecer algum arquivo, PARE. Desfaça a mudança ou pergunte ao usuário.

- [ ] **Step 2: Os gates inteiros**

```bash
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

Para provar que uma falha não é regressão, rode o mesmo arquivo numa árvore limpa de `escale-crm/main`, num caminho sem espaço (memória `sincronizar-com-o-rafael`):

```bash
git worktree add --detach C:/tmp/cmp-v2 escale-crm/main && cd C:/tmp/cmp-v2 && corepack pnpm install --frozen-lockfile && corepack pnpm vitest run <arquivo> ; cd - && git worktree remove C:/tmp/cmp-v2 --force
```

Regressão é o que passa lá e falha aqui: corrija antes de seguir.

- [ ] **Step 3: Push e PR**

Troque `<DIFERENÇAS>` pela lista da Task 11 (uma diferença por linha, com a justificativa) ou, no CAMINHO B da Task 11, pela linha "Conferência visual pendente: feita depois do deploy, em https://app.escaleia.com, pela regra do contrato; as diferenças vão num PR de correção (`fix/casca-clint-v2-conferencia`)". Depois rode:

```bash
git push -u escale-crm feat/casca-clint-v2-topo
gh pr create -R rgisjr/escale-crm --base main --head feat/casca-clint-v2-topo \
  --title "feat(escale): V2 — topo da casca igual à Clint" \
  --body-file - <<'PR'
## O que muda

Com a **casca nova** (`escale_menu=topo`, tela ≥ 768px), o topo fica igual ao da Clint na variante menu superior (`01-010`):

- **Barra de 44px**, branca, borda de baixo `#E8E4F5`, marca nossa à esquerda.
- **7 itens:** Negócios, Contatos, Atividades, Atendimento (o nosso Conversas, com o selo vermelho "99+" da fila), Automações, Campanhas, Indicadores. Depois vem **⠿ Mais**. O item ativo ganha fundo de altura inteira no tom claro da marca e fica em semibold.
- **Empresas, Agenda e Agentes IA** foram para o Mais, que agora tem o visual do `12-001`.
- **À direita:**
  - ✦ (leva ao hub Agente de IA);
  - "?" (atalhos do teclado);
  - **Novo +** azul (Contato, Campanha, Proposta, conforme o papel);
  - **avatar quadrado ▾**, que guarda organização, busca ⌘K, central de avisos, idioma, tema, modo administrador e sair.
  Os atalhos ⌘K e ⌘⇧L e o som da central continuam valendo em qualquer tela.
- **Botão flutuante de conversas:** 50px, degradê feito com a cor da marca, balão branco, selo "+N". Aberto, vira X, e o painel ganha o cabeçalho "Conversas".

**Sem a casca, nada muda.** Nenhum arquivo do original foi alterado, e `tests/unit/escale-casca-v2-original-intacto.test.tsx` prova que a lateral e a `TopBar` continuam com as mesmas peças.

## Decisões para confirmar

- D2: ✦ → hub "Agente de IA" (não temos assistente global como a Aura).
- D3: "?" → painel com os atalhos; sem selo (não temos fonte para o número).
- D4: Novo + sem "Negócio" (fica com o "Negócio +" da página, na V4).
- D5: fundo do avatar na cor da marca (a Clint usa uma cor por pessoa).
- D6: selo de avisos no avatar, porque o sino saiu do topo.

## Diferenças que sobraram (verificação visual, Task 11)

<DIFERENÇAS>

## Prints que faltam (pedir à Clint)

Mais aberto, Novo + aberto, avatar aberto, "?" aberto, ✦ clicado, painel do FAB na variante superior e hover de item do topo.

## Verificação

- [ ] `typecheck`, `lint` e `test:unit` (só as falhas conhecidas do Windows).
- [ ] Nenhum arquivo do original no diff.
- [ ] Na tela, com a casca, depois do deploy (usuário):
  - [ ] o topo bate com o `01-010`;
  - [ ] ⌘K abre a busca em qualquer tela;
  - [ ] trocar de organização e de idioma pelo avatar funciona;
  - [ ] Novo + → Contato abre a janela;
  - [ ] o FAB abre e fecha.
- [ ] Sem a casca, o topo e a lateral de sempre.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PR
```

Expected: a URL do PR. Mostre a URL ao usuário e PARE: merge, tag, release e VPS só com o "pode fazer" dele.

---

## Prints que faltam desta parte

Todos na **variante com menu superior**, na mesma resolução do `01-010` (de `clint-telas.md` §7, itens 1 a 7):

1. **⠿ Mais** aberto. Hoje: visual do `12-001` (lateral).
2. **Novo +** aberto (o menu de criação global). Hoje: Contato, Campanha e Proposta (D4).
3. **Avatar** aberto (o menu da conta). Hoje: organização, busca, avisos, idioma, tema, admin e sair, no estilo dos menus `01-032/033`.
4. **"?"** (com o selo "2") aberto. Hoje: painel de atalhos, sem selo (D3).
5. **✦** clicado (IA/Aura). Hoje: leva ao hub de IA (D2).
6. **Painel do FAB** aberto. Hoje: moldura do `01-025` (lateral), conteúdo de antes (D9).
7. **Hover** de um item do topo. Hoje: tokens da Clint (`rgba(0,0,0,.03)` e texto na cor da marca).

## Fora desta parte (registrado)

- **Páginas que descontam `3.5rem`** da altura (funil, Visualização, painel de origens): com o topo de 44px, sobram 12px embaixo. A V3 ajusta o painel de origens e a V4 ajusta o funil e a Visualização (D10).
- **"Negócio" no Novo +:** precisa de uma porta global para criar negócio (origem e etapa). Fica para depois do print 2.
- **Cor por pessoa no avatar:** precisa de dado novo (não existe hoje).
- **Busca, "Todos" e ordenação no painel do FAB:** dependem do print 6.
- **No celular**, a casca continua com a `TopBar` de sempre. A Clint mobile não está na pasta.

## Auto-revisão

**Cobertura do pedido:**

| Pedido | Onde |
|---|---|
| Branch `feat/casca-clint-v2-topo` a partir de `escale-crm/main` com a V1 | Task 1 |
| Teste que prova que sem o cookie nada muda | Task 2, mais a Task 12 (Step 1) e a Task 11 (Step 5) |
| Barra de 44px, branca, borda `border-casca-borda`, ativo de altura inteira `bg-casca-marca-suave` + semibold, tipografia e espaços do DS | Task 9 (`ITEM`, `ITEM_ATIVO`, `h-11`) e Task 11 (medição) |
| 7 itens, Atendimento com selo "99+", Campanhas na rota real, Empresas/Agenda/Agentes no Mais, `menu-do-topo.ts` e testes | Tasks 3 e 9; Campanhas = `/app/campaigns` (D1) |
| Marca nossa no lugar do logo; seletor de organização dentro do avatar | Tasks 9 e 7, mais a Task 6 (D7) |
| ✦ ligado à entrada de IA mais próxima, com a escolha sinalizada | Tasks 3 e 8 (D2) |
| "?" em círculo lilás com selo, ligado à ajuda ou sinalizado | Task 8 (D3: sem selo e sem ajuda no Escale, sinalizado) |
| Novo + azul (`BotaoDaCasca variante="novo"`) com as criações que existem | Tasks 3 e 8 (D4) |
| Avatar quadrado ▾ com organização, busca ⌘K (atalho global), avisos, idioma, tema e perfil/sair | Tasks 6 e 7 |
| Peças compartilhadas sem mudar para o original: variantes do fork em `components/escale/menu/` | Tasks 5 a 9; nenhum arquivo de `components/shell` muda (Task 2 e Task 12, Step 1) |
| Mais no visual do 12-001, sinalizado como sem print | Task 9 e "Prints que faltam" |
| FAB de 50px, degradê da marca por `color-mix`, balão branco, selo "+N", posição por `style` | Task 10 |
| Todo texto por `t()` com espanhol, pulando chaves que já existem | Task 4 (script que também reconhece chave sem aspas) |
| Verificação visual e a lista das diferenças (local só com banco de teste; senão depois do deploy, no app de produção, só leitura, com o PR de correção) | Task 11 |
| Gates e PR | Task 12 |

**Placeholders:** só o `<DIFERENÇAS>` do corpo do PR. A Task 12 manda trocá-lo pela lista medida na Task 11 (ou pela linha "conferência pendente, depois do deploy"), como o `<N>` da 1D.

**Consistência de nomes entre tasks:**
- `textoDoSelo`, `acoesDeCriar`, `ACOES_DE_CRIAR`, `entradaDaIa` e `AcaoDeCriar` (Task 3) são usados nas Tasks 5, 8 e 9 com as mesmas assinaturas.
- `ContadorDaFilaDaCasca({ limite, className })` (Task 5) é usado na Task 9 com limite 99 e na Task 10 com limite 9.
- `MenuDaConta({ veAvisos })` (Task 7), `BotaoDaIa({ destino })`, `AjudaDoTopo()` e `NovoDoTopo({ acoes })` (Task 8) aparecem assim no `MenuDoTopo` e nos dublês do teste de tela (Task 9).
- Os `data-testid` medidos na Task 11 existem nas peças: `menu-do-topo`, `selo-da-casca`, `ia-do-topo`, `ajuda-do-topo`, `novo-do-topo`, `menu-da-conta` e `botao-de-conversas`.

**Contrato da V1:** nenhum nome mudou. Usados:
- tokens: `casca-texto`, `casca-texto-2`, `casca-suave`, `casca-sobrelinha`, `casca-borda`, `casca-raia`, `casca-marca`, `casca-marca-suave`, `casca-novo`, `casca-alerta`, `rounded-casca-gatilho` e `--shadow-casca-painel`;
- componentes: `BotaoDaCasca` e `PainelSuspenso`;
- ícones: os de `icons-da-casca.ts`.

**Riscos conhecidos:**
- A largura da janela de referência (1536) foi inferida pelos prints cortados. A Task 11 mede pelo lado direito, que é constante entre os prints.
- O `shadow-md` do menu do original não sai com `cn()`. Por isso a sombra vai por `style`.
- O `hover:bg-black/[.03]` pode esbarrar na cerca `tailwind-tokens`; a Task 9 diz o que fazer.
