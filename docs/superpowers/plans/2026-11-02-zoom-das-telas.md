# Zoom das telas igual ao da Clint — Plano de correção

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, decisão do usuário de 18/10) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As telas do Escale OS (a começar por Automações) abrirem no mesmo tamanho da Clint, sem a "diferencinha de zoom" que o usuário vê toda vez.

**Architecture:** O diagnóstico achou duas causas independentes. (1) O Chrome do usuário guardou zoom de 90% para `app.escaleia.com` — isso encolhe **todas** as telas e não é código. (2) O canvas do fluxo de automação enquadra com `padding 0.2` e teto de zoom `1`, enquanto a Clint usa o padrão do React Flow (`padding 0.1`) com teto `1.15` — isso deixa o fluxo ainda mais "longe" que o resto. O plano corrige (1) com uma ação de 10 segundos do usuário, (2) com uma constante única de zoom usada pelos três pontos do fluxo, e (3) põe uma trava na conferência visual para a diferença não voltar.

**Tech Stack:** Next.js, React, `@xyflow/react` ^12.12, Vitest, Playwright (conferência visual).

## Global Constraints

- REGRA DO PRODUTO: tudo idêntico à Clint (`CLAUDE.md` do projeto). Referências: `Escale IA OS\clint-documentacao\modulos\07-automacoes\imagens\07-013-editor-painel-de-gatilhos.png`, `07-026-fluxo-inteiro.png`, `07-001-lista-de-automacoes.png`.
- AJUSTE CIRÚRGICO: só muda o zoom. Nós, cores, textos, paleta, painéis e fluxo ficam como estão.
- Valores da Clint (lidos em `clint-model\raw-v2\js\index-CmJ0MjJM.js.txt`, editor de automação): `minZoom: .25`, `maxZoom: 1.15`, `fitView: !0` **sem** `fitViewOptions`; o botão de reenquadrar chama `fitView({ duration: 500 })`.
- Medida de referência: prints e conferência sempre com o navegador a **100%** (`window.devicePixelRatio` igual ao da aba da Clint; no computador do usuário, `1.25`, viewport 1536 px).
- Frente = esta correção sozinha (1 fase). Bateria leve no fim: unitários tocados + typecheck + eslint; sem `test:db` (não há migration).

---

## Diagnóstico (o que foi medido em 02/11, só leitura)

| Medida | Clint (`app.useclint.com`) | Escale OS (`app.escaleia.com`) |
|---|---|---|
| `devicePixelRatio` na mesma janela | **1.25** | **1.125** |
| `innerWidth` | 1536 | 1707 |
| Zoom do navegador que isso dá | 100% | **90%** |
| Enquadramento do canvas | `padding 0.1`, até `1.15×` | `padding 0.2`, até `1.0×` |

- Mesma janela, mesma tela (`screen.width` 1536 nas duas abas). A única coisa que muda o `devicePixelRatio` entre abas é o zoom do Chrome por site → o Chrome guardou 90% para `app.escaleia.com`. Por isso "sempre tem a diferencinha" em todas as telas.
- Com o navegador a 100%, os tamanhos da listagem já ficam próximos dos do print 07-001 (título 18 px, "Todas" 13 px, colunas 10 px). Um ponto ficou visivelmente menor mesmo descontando o zoom: o botão "Nova automação" (12 px / 26 px de altura contra ~14 px / 32 px no print). Ele **não entra** neste plano sem confirmar a 100% (Task 4 decide).
- O nó do fluxo tem 352 px de largura, igual à Clint (07-013). O tamanho do nó está certo; o que está errado é o zoom inicial.
- Somando as duas causas, um fluxo pequeno abre a `0.9 × 1.0 = 0.90` do tamanho real no Escale contra `1.15` na Clint: **~22% menor**. É o "tá muito longe".

---

### Task 1: Zerar o zoom salvo do Chrome (ação do usuário, sem código)

**Files:** nenhum.

- [ ] **Step 1: Usuário abre `https://app.escaleia.com` e aperta `Ctrl + 0`.**
  Alternativa: `chrome://settings/content/zoomLevels` → remover a linha `app.escaleia.com`.
- [ ] **Step 2: Conferir.** No console da aba do Escale (F12):
  ```js
  [devicePixelRatio, innerWidth]
  ```
  Esperado: `[1.25, 1536]` — igual ao da aba da Clint.
- [ ] **Step 3: O usuário olha Automações de novo** e diz se o resto das telas ficou no tamanho certo. Se ficou, as Tasks 2–3 resolvem só o canvas; se alguma tela ainda parecer pequena, ela entra na Task 4.

---

### Task 2: Zoom do canvas igual ao da Clint (constante única)

**Files:**
- Create: `components/escale/automacoes/fluxo/zoom.ts`
- Modify: `components/escale/automacoes/fluxo/CanvasDoFluxo.tsx` (props do `<ReactFlow>`, linhas ~99-102)
- Modify: `components/escale/automacoes/fluxo/insights/CanvasDosInsights.tsx` (linhas ~36-39)
- Modify: `components/escale/automacoes/fluxo/TelaDoFluxo.tsx` (linha ~53, `aoReorganizar`)
- Test: `tests/unit/escale-automacoes-zoom-igual-a-clint.test.ts`

**Interfaces:**
- Produces: `ZOOM_DO_FLUXO` (`{ minZoom: 0.25; maxZoom: 1.15 }`) e `REENQUADRAR_O_FLUXO` (`{ duration: 500 }`), exportados de `components/escale/automacoes/fluxo/zoom.ts`.

- [ ] **Step 1: Escrever o teste (cerca de leitura de código, como as outras cercas do repo)**

```ts
// tests/unit/escale-automacoes-zoom-igual-a-clint.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { REENQUADRAR_O_FLUXO, ZOOM_DO_FLUXO } from "@/components/escale/automacoes/fluxo/zoom";

const raiz = join(__dirname, "..", "..");
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

const CANVAS = [
  "components/escale/automacoes/fluxo/CanvasDoFluxo.tsx",
  "components/escale/automacoes/fluxo/insights/CanvasDosInsights.tsx",
];

describe("zoom do fluxo igual ao da Clint (07-013, 07-026)", () => {
  it("usa os limites da Clint: 0,25 a 1,15", () => {
    expect(ZOOM_DO_FLUXO).toEqual({ minZoom: 0.25, maxZoom: 1.15 });
  });

  it("reenquadra como o botão da Clint, sem padding próprio", () => {
    expect(REENQUADRAR_O_FLUXO).toEqual({ duration: 500 });
  });

  it.each(CANVAS)("%s enquadra com o padrão do React Flow, sem fitViewOptions", (arquivo) => {
    const codigo = ler(arquivo);
    expect(codigo).toContain("{...ZOOM_DO_FLUXO}");
    expect(codigo).not.toMatch(/fitViewOptions/);
    expect(codigo).not.toMatch(/minZoom=|maxZoom=/);
  });

  it("o botão Reorganizar usa o mesmo enquadramento", () => {
    const codigo = ler("components/escale/automacoes/fluxo/TelaDoFluxo.tsx");
    expect(codigo).toContain("fitView(REENQUADRAR_O_FLUXO)");
    expect(codigo).not.toMatch(/padding:\s*0\.2/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-automacoes-zoom-igual-a-clint.test.ts`
Expected: FAIL — `Cannot find module '@/components/escale/automacoes/fluxo/zoom'`.

- [ ] **Step 3: Criar a constante**

```ts
// components/escale/automacoes/fluxo/zoom.ts
/**
 * O ZOOM DO FLUXO, igual ao editor da Clint (07-013, 07-026): de 0,25 a 1,15 e `fitView` com o
 * padding padrão do React Flow (0,1). Um fluxo pequeno abre a 1,15×, como lá.
 */
export const ZOOM_DO_FLUXO = { minZoom: 0.25, maxZoom: 1.15 } as const;

/** O "Reorganizar" reenquadra como o botão da Clint: só a animação, sem padding próprio. */
export const REENQUADRAR_O_FLUXO = { duration: 500 } as const;
```

- [ ] **Step 4: Usar no `CanvasDoFluxo.tsx`**

Import (junto dos imports locais):
```ts
import { ZOOM_DO_FLUXO } from "./zoom";
```
Trocar:
```tsx
        minZoom={0.25}
        maxZoom={1.15}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
```
por:
```tsx
        {...ZOOM_DO_FLUXO}
        fitView
```

- [ ] **Step 5: Usar no `CanvasDosInsights.tsx`**

Import:
```ts
import { ZOOM_DO_FLUXO } from "../zoom";
```
Mesma troca do Step 4 (as quatro linhas `minZoom`/`maxZoom`/`fitView`/`fitViewOptions` viram `{...ZOOM_DO_FLUXO}` + `fitView`).

- [ ] **Step 6: Usar no `TelaDoFluxo.tsx`**

Import:
```ts
import { REENQUADRAR_O_FLUXO } from "./zoom";
```
Trocar:
```ts
    window.setTimeout(() => void fitView({ padding: 0.2, duration: 200 }), 0);
```
por:
```ts
    window.setTimeout(() => void fitView(REENQUADRAR_O_FLUXO), 0);
```

- [ ] **Step 7: Rodar o teste, typecheck e eslint dos arquivos**

Run:
```bash
corepack pnpm vitest run tests/unit/escale-automacoes-zoom-igual-a-clint.test.ts
corepack pnpm typecheck
corepack pnpm eslint components/escale/automacoes/fluxo tests/unit/escale-automacoes-zoom-igual-a-clint.test.ts
```
Expected: 5 testes PASS; typecheck e eslint sem erro.

- [ ] **Step 8: Rodar os testes de automação que já existem e tocam o canvas**

Run: `corepack pnpm vitest run tests/unit/escale-automacoes`
Expected: PASS (nenhum depende de `padding 0.2`; se algum depender, ajustar o teste para o valor da Clint).

- [ ] **Step 9: Commit**

```bash
git add components/escale/automacoes/fluxo/zoom.ts components/escale/automacoes/fluxo/CanvasDoFluxo.tsx components/escale/automacoes/fluxo/insights/CanvasDosInsights.tsx components/escale/automacoes/fluxo/TelaDoFluxo.tsx tests/unit/escale-automacoes-zoom-igual-a-clint.test.ts
git commit -m "fix(escale): canvas da automação abre no zoom da Clint (0,25–1,15, padding padrão)"
```

> Fora do escopo: o designer antigo em `app/app/webhooks/automacoes/[id]/_components/CanvasDaAutomacao.tsx` (casca desligada) e o `FlowCanvas` de follow-ups. Não são telas clonadas da Clint; ficam como estão.

---

### Task 3: Trava na conferência visual (para a diferença não voltar)

A causa de "sempre ter a diferencinha" é comparar o Escale com zoom diferente da Clint. A trava é: a conferência só vale com os dois navegadores na mesma escala.

**Files:**
- Create: `tests/e2e/utils/escala.ts` (arquivo próprio, sem importar Playwright, para o Vitest carregar)
- Modify: `docs/roteiro.md` (seção da conferência visual — uma linha)

- [ ] **Step 1: Escrever o teste do helper**

```ts
// tests/unit/conferencia-visual-mesma-escala.test.ts
import { describe, expect, it } from "vitest";
import { escalaConfere } from "@/tests/e2e/utils/escala";

describe("conferência visual só vale na mesma escala da Clint", () => {
  it("aceita 1,25 contra 1,25", () => {
    expect(escalaConfere(1.25, 1.25)).toBe(true);
  });
  it("recusa o Escale a 90% (1,125) contra a Clint a 100% (1,25)", () => {
    expect(escalaConfere(1.125, 1.25)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/conferencia-visual-mesma-escala.test.ts`
Expected: FAIL — `Cannot find module .../escala`.

- [ ] **Step 3: Implementar no helper**

Criar `tests/e2e/utils/escala.ts`:
```ts
/**
 * A conferência lado a lado com a Clint só vale com os dois navegadores na mesma escala
 * (`devicePixelRatio`). Zoom salvo por site no Chrome (ex.: 90% no Escale) encolhe a tela
 * inteira e parece "diferença de layout" (02/11).
 */
export function escalaConfere(escalaDoEscale: number, escalaDaClint: number): boolean {
  return Math.abs(escalaDoEscale - escalaDaClint) < 0.001;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/conferencia-visual-mesma-escala.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Uma linha no roteiro da conferência visual** (`docs/roteiro.md`, onde fala de "conferência visual"):
```md
- Antes de comparar com a Clint: `devicePixelRatio` e `innerWidth` iguais nas duas abas (Ctrl+0 nas duas). Escala diferente invalida a conferência.
```

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/utils/escala.ts tests/unit/conferencia-visual-mesma-escala.test.ts docs/roteiro.md
git commit -m "test(escale): conferência visual recusa escala diferente da Clint"
```

---

### Task 4: Conferência visual a 100% e o que sobrar

**Files:** nenhum até o resultado (só abre tarefa nova se houver diferença confirmada).

- [ ] **Step 1:** Com a Task 1 feita, abrir lado a lado, na mesma janela, `app.escaleia.com/app/automacoes` e o print `07-001-lista-de-automacoes.png`; depois um fluxo com só o gatilho contra `07-013`, e um fluxo grande contra `07-026`. Conferir `devicePixelRatio` igual (Task 3).
- [ ] **Step 2:** Listar por escrito cada diferença de tamanho que sobrou (elemento, Clint px, Escale px). Candidato já visto: botão "Nova automação" (Clint ~14 px / 32 px de altura; Escale 12 px / 26 px).
- [ ] **Step 3:** Mostrar a lista ao usuário e **parar**. Cada ajuste aprovado vira uma task pequena (um componente, um valor), no mesmo molde da Task 2.

---

### Fechamento da frente

- [ ] PR único `fix/zoom-igual-a-clint` para `escale-crm/main`, merge.
- [ ] Bateria leve: `corepack pnpm vitest run tests/unit` + typecheck + eslint (sem migration → sem `test:db`).
- [ ] Revisor: não precisa (mudança pequena de UI, sem risco; autorrevisão do diff).
- [ ] Tag `v1.81.0-escale.N`, release, `backup.sh`, `update.sh --to`, conferência da produção (regra de entrega do projeto).
- [ ] Atualizar `LOG.md`.
