# Automações: Atraso que aparece, publica e não duplica; erros do salvar na caixa certa — Plano de Implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: `superpowers:executing-plans`, inline, nesta sessão (decisão do usuário: nunca subagent-driven). Os passos usam checkbox (`- [ ]`).

**Objetivo:** corrigir os defeitos da 5D (no ar na `v1.81.0-escale.50`) que fazem o editor de Automações errar ao salvar: o Atraso aparece como caixa vazia; todo Atraso de menos de 24 h é recusado no publish; o erro do servidor não diz qual caixa está errada; e o Atraso curto, quando passar, não pode inscrever o mesmo contato duas vezes.

**Arquitetura:** quatro correções pequenas sobre o que a 5D já tem. (1) Registrar o tipo `atraso` no `nodeTypes` do canvas. (2) No validador do publish, o piso de 24 h da espera imune passa a valer só para o follow-up, não para `surface = 'crm_automation'`. (3) Em `enrollFollowupFlow`, uma automação recusa inscrever quem já espera `dormente` nela, porque a espera imune fica fora do índice único de inscrição viva. (4) Um módulo puro `erros-do-publish.ts` traduz os erros do validador (ids de nós do grafo) para problemas de caixa (ids da tela). Ele é usado antes de enviar, com o validador rodando no navegador, e depois, lendo a resposta 422 do servidor.

**Stack:** Next.js 16 + React 19 + TypeScript 6, `@xyflow/react`, TanStack Query, Vitest + Testing Library, `corepack pnpm`.

## Restrições globais

- Repositório: worktree `C:\Documentos\projetos claude\Deskcom CRM\wt-5d-tela`, remoto `escale-crm` (rgisjr/escale-crm). PR vai para `escale-crm/main`. Nunca push em `origin` (Rafael).
- Ajuste cirúrgico: mudar só o que cada tarefa diz. Texto, estrutura e fluxo já aprovados ficam como estão.
- Marcar as mudanças no código herdado com o comentário `FORK ESCALE · 5D`.
- Toda frase nova de tela entra em `lib/i18n/dicionario.ts` com a tradução `es`.
- Sem migration, sem RLS e sem mudança de permissão: não roda `test:db`. Os testes são os da área, mais typecheck e eslint dos arquivos alterados. A suíte unitária inteira NÃO roda no computador do usuário.
- Formatos BR em qualquer texto novo.
- **Fora deste plano** (pendentes de decisão do usuário): o Atraso começar em 0 segundos e mostrar "+ Adicionar atraso" como na Clint; o painel "Definir horário" (falta captura); a saída negativa da Condição sem grupo (falta o OK do desvio da Clint).

## Mapa de arquivos

| Arquivo | O que muda |
|---|---|
| `components/escale/automacoes/fluxo/CanvasDoFluxo.tsx` | `nodeTypes` ganha `atraso` |
| `tests/unit/escale-fluxo-tipos-do-canvas.test.tsx` | novo: todo tipo de caixa tem desenho |
| `lib/followup/validate-publish.ts` | piso de 24 h da espera imune fora de `crm_automation` |
| `lib/followup/espera-imune.test.ts` | casos: follow-up recusa, automação aceita |
| `lib/escale/automacoes/fluxo/compilar.test.ts` | caso: o grafo compilado passa no publish da automação |
| `lib/followup/enroll.ts` | automação recusa contato que já espera `dormente` nela |
| `lib/followup/enroll.test.ts` | casos: automação recusa, follow-up não |
| `lib/escale/automacoes/fluxo/erros-do-publish.ts` | novo: erros do validador → problemas de caixa |
| `lib/escale/automacoes/fluxo/erros-do-publish.test.ts` | novo |
| `hooks/escale/useAutomacoesDaCasca.ts` | `useGravarFluxo` não mostra o toast genérico quando a recusa vem com a lista de erros |
| `components/escale/automacoes/fluxo/useFluxo.ts` | `salvar` confere antes de enviar e marca nas caixas a recusa do servidor |
| `lib/i18n/dicionario.ts` | 5 frases novas |
| `.changes/automacoes-atraso-e-erros-do-salvar.md` | novo: nota da versão |

---

### Tarefa 0: Preparar a branch

**Arquivos:** nenhum.

- [ ] **Passo 1: Conferir que a worktree está limpa e atualizar a main**

```powershell
cd "C:\Documentos\projetos claude\Deskcom CRM\wt-5d-tela"
git status --short
git fetch escale-crm
```

Esperado: `git status --short` vazio. Se houver sujeira que não é desta sessão, PARE e avise.

- [ ] **Passo 2: Criar a branch a partir de `escale-crm/main`**

```powershell
git switch -c fix/automacoes-atraso-e-salvar escale-crm/main
git log --oneline -1
```

Esperado: o topo é `0983da991 Merge pull request #165` ou um merge mais novo.

---

### Tarefa 1: O Atraso aparece no canvas

**Arquivos:**
- Modificar: `components/escale/automacoes/fluxo/CanvasDoFluxo.tsx:24`
- Criar: `tests/unit/escale-fluxo-tipos-do-canvas.test.tsx`

**Interfaces:**
- Consome: `nodeTypes` (exportado de `CanvasDoFluxo.tsx`) e `NoDoFluxo`.
- Produz: `nodeTypes.atraso === NoDoFluxo`.

**Por quê:** `useFluxo.ts:247` cria a caixa do Atraso com `type: "atraso"`, e `paraNos` repassa esse `type` ao React Flow. Como `nodeTypes` só conhece `gatilho`, `condicoes` e `acao`, o React Flow cai no nó padrão: o retângulo vazio com alças em cima e embaixo da captura. O desenho certo do Atraso já existe em `NoDoFluxo` e é coberto por `tests/unit/escale-automacoes-modo-fluxo.test.tsx`.

- [ ] **Passo 1: Escrever o teste que falha**

Criar `tests/unit/escale-fluxo-tipos-do-canvas.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/webhooks/useWebhookSources", () => ({
  useWebhookSources: () => ({ data: { data: [] } }),
  usePipelines: () => ({ data: { data: [] } }),
  usePipelineStages: () => ({ data: undefined }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({ useChannelSessions: () => ({ data: [] }), channelLabel: () => "" }));
vi.mock("@/hooks/ai/useAgents", () => ({ useAgentsList: () => ({ data: [] }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));

import { nodeTypes } from "@/components/escale/automacoes/fluxo/CanvasDoFluxo";
import { NoDoFluxo } from "@/components/escale/automacoes/fluxo/NoDoFluxo";

// Os tipos de caixa que a rota `/fluxo` aceita (`desenhoSchema` em app/api/v1/automacoes-da-casca/[id]/fluxo/route.ts).
const TIPOS_DE_CAIXA = ["gatilho", "condicoes", "acao", "atraso"] as const;

describe("canvas do fluxo", () => {
  it.each(TIPOS_DE_CAIXA)("desenha a caixa '%s' com o nó do fluxo (nunca o nó padrão do React Flow)", (tipo) => {
    expect(nodeTypes[tipo]).toBe(NoDoFluxo);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

```powershell
corepack pnpm vitest run tests/unit/escale-fluxo-tipos-do-canvas.test.tsx
```

Esperado: 3 passam e 1 FALHA, o caso `'atraso'` (`expected undefined to be [Function NoDoFluxo]`).

- [ ] **Passo 3: Implementar**

Em `components/escale/automacoes/fluxo/CanvasDoFluxo.tsx`, trocar a linha 24:

```tsx
export const nodeTypes: NodeTypes = { gatilho: NoDoFluxo, condicoes: NoDoFluxo, acao: NoDoFluxo };
```

por:

```tsx
// FORK ESCALE · 5D: o Atraso também; sem ele o React Flow desenha o nó padrão (caixa vazia).
export const nodeTypes: NodeTypes = { gatilho: NoDoFluxo, condicoes: NoDoFluxo, acao: NoDoFluxo, atraso: NoDoFluxo };
```

- [ ] **Passo 4: Rodar e ver passar**

```powershell
corepack pnpm vitest run tests/unit/escale-fluxo-tipos-do-canvas.test.tsx tests/unit/escale-automacoes-modo-fluxo.test.tsx
```

Esperado: tudo PASS.

- [ ] **Passo 5: Commit**

```powershell
git add components/escale/automacoes/fluxo/CanvasDoFluxo.tsx tests/unit/escale-fluxo-tipos-do-canvas.test.tsx
git commit -m "fix(automacoes): o Atraso aparece no canvas em vez da caixa vazia" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 2: Atraso de menos de 24 h passa no publish da automação

**Arquivos:**
- Modificar: `lib/followup/validate-publish.ts:765-780`
- Teste: `lib/followup/espera-imune.test.ts` (acrescentar no fim)
- Teste: `lib/escale/automacoes/fluxo/compilar.test.ts` (acrescentar no fim)

**Interfaces:**
- Consome: `validateFlowForPublish(graph, { surface })`, que já existe.
- Produz: com `surface: "crm_automation"`, um `wait` com `immune_to_reply: true` e menos de 24 h NÃO gera `immune_wait_too_short`. Com `surface` ausente ou `"followup"`, nada muda.

**Por quê:** `compilar.ts:164` grava todo Atraso como `wait` imune, porque na automação a resposta do contato não pode cortar o Atraso, como na Clint. O piso de 24 h (`validate-publish.ts:769`) foi feito para a cadência longa do follow-up e reprova todo Atraso de 30 s a 24 h. Os limites do Atraso da automação (30 s a 90 dias) já são conferidos pelo compilador (`caixas.ts:24-27`).

- [ ] **Passo 1: Escrever os testes que falham**

Acrescentar no fim de `lib/followup/espera-imune.test.ts`:

```ts
describe("o piso de 24 h da espera imune é do follow-up, não da automação", () => {
  const UM_MINUTO = 60_000;
  const grafo = {
    nodes: [
      { id: "t1", type: "trigger", label: "Gatilho", position: { x: 0, y: 0 }, config: {} },
      noWait(true, UM_MINUTO),
      { id: "a1", type: "end", label: "Fim", position: { x: 0, y: 0 }, config: { outcome: "exhausted" } },
    ],
    edges: [{ id: "e0", source: "t1", target: "w1", priority: 0, condition: { type: "always" as const } }, arestaSempre],
  } as unknown as Parameters<typeof validateFlowForPublish>[0];

  it("follow-up: espera imune de 1 minuto continua recusada", () => {
    const r = validateFlowForPublish(grafo);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.map((e) => e.code)).toContain("immune_wait_too_short");
  });

  it("automação: o Atraso de 1 minuto passa", () => {
    expect(validateFlowForPublish(grafo, { surface: "crm_automation" })).toEqual({ ok: true });
  });
});
```

Acrescentar no fim de `lib/escale/automacoes/fluxo/compilar.test.ts`, com o import novo no topo junto dos outros:

```ts
import { validateFlowForPublish } from "@/lib/followup/validate-publish";
```

```ts
describe("o grafo compilado passa no publish da automação", () => {
  it("o Lead novo GERAL (Atraso de 30 s e de 1 min) não é recusado", () => {
    const r = compilar({ nome: "Lead novo", desenho: leadNovo, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error("compilou errado");
    expect(validateFlowForPublish(r.grafo, { surface: "crm_automation", exigeModeloForaDaJanela: false })).toEqual({ ok: true });
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

```powershell
corepack pnpm vitest run lib/followup/espera-imune.test.ts lib/escale/automacoes/fluxo/compilar.test.ts
```

Esperado: o caso "automação: o Atraso de 1 minuto passa" e o caso "o Lead novo GERAL…" FALHAM com `immune_wait_too_short`. O caso do follow-up passa. Se o "Lead novo GERAL" falhar com OUTRO código além de `immune_wait_too_short`, PARE: é um terceiro defeito, que entra como tarefa nova e é avisado ao usuário.

- [ ] **Passo 3: Implementar**

Em `lib/followup/validate-publish.ts`, trocar:

```ts
  for (const node of [...nodes].sort(byId)) {
    if (node.type !== 'wait') continue;
    const cfg = node.config;
    if (cfg.mode !== 'fixed' || cfg.immune_to_reply !== true) continue;
```

por:

```ts
  // FORK ESCALE · 5D: na automação o Atraso é SEMPRE imune (a resposta do contato não o corta,
  // como na Clint) e vai de 30 s a 90 dias — o compilador confere os limites. O piso é do follow-up.
  for (const node of surface === 'crm_automation' ? [] : [...nodes].sort(byId)) {
    if (node.type !== 'wait') continue;
    const cfg = node.config;
    if (cfg.mode !== 'fixed' || cfg.immune_to_reply !== true) continue;
```

- [ ] **Passo 4: Rodar e ver passar**

```powershell
corepack pnpm vitest run lib/followup/espera-imune.test.ts lib/escale/automacoes/fluxo/compilar.test.ts lib/followup/validate-publish.test.ts
```

Esperado: tudo PASS. Se `lib/followup/validate-publish.test.ts` não existir, rodar só os dois primeiros.

- [ ] **Passo 5: Commit**

```powershell
git add lib/followup/validate-publish.ts lib/followup/espera-imune.test.ts lib/escale/automacoes/fluxo/compilar.test.ts
git commit -m "fix(automacoes): Atraso de menos de 24 h passa no publish da automação" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

> **Não publicar a Tarefa 2 sem a Tarefa 3.** Sozinha, ela deixa o Atraso curto ir para produção com o risco de inscrição dupla descrito abaixo.

---

### Tarefa 3: Durante o Atraso, a mesma automação não inscreve o contato de novo

**Arquivos:**
- Modificar: `lib/followup/enroll.ts` (depois do bloco `if (pointer.status !== "active" ...)`, linhas 67-74)
- Teste: `lib/followup/enroll.test.ts`

**Interfaces:**
- Consome: `pointer.surface`, já lido na linha 49.
- Produz: `enrollFollowupFlow` devolve `{ ok: false, code: "conflict", status: 409 }` quando `pointer.surface === "crm_automation"` e já existe inscrição `dormente` do mesmo contato no mesmo ponteiro. `start-message-flow.ts` já traduz `conflict` para `live_enrollment_exists`.

**Por quê:** a espera imune deixa a inscrição `dormente` (`node-handlers.ts:663-676`), e `dormente` fica FORA do índice único de inscrição viva (`node-handlers.ts:25-33`). Numa automação com gatilho "mensagem recebida", cada mensagem do contato durante o Atraso abriria outra inscrição, e as boas-vindas sairiam em dobro. Até a escale.50 isso só acontecia com Atraso de 24 h ou mais, porque o resto não publicava. Com a Tarefa 2, passaria a acontecer em todo Atraso.

- [ ] **Passo 1: Escrever os testes que falham**

Em `lib/followup/enroll.test.ts`:

1. Trocar a assinatura e a tabela de inscrições do `fakeDb`:

```ts
function fakeDb(pointer: Row) {
  const tables: Record<string, Row[]> = {
    followup_flow_pointers: [pointer],
    contacts: [{ id: CONTACT, organization_id: ORG }],
    followup_flow_versions: [{ id: VERSION, organization_id: ORG, graph: GRAPH }],
    followup_enrollments: [],
```

por:

```ts
function fakeDb(pointer: Row, inscricoes: Row[] = []) {
  const tables: Record<string, Row[]> = {
    followup_flow_pointers: [pointer],
    contacts: [{ id: CONTACT, organization_id: ORG }],
    followup_flow_versions: [{ id: VERSION, organization_id: ORG, graph: GRAPH }],
    followup_enrollments: [...inscricoes],
```

2. No objeto `b` do `fakeDb`, logo depois de `select() { return b; },`, acrescentar:

```ts
        limit() {
          return b;
        },
```

3. Acrescentar dentro do `describe("enrollFollowupFlow", ...)`:

```ts
  const esperando = { id: "enr-0", organization_id: ORG, pointer_id: POINTER, contact_id: CONTACT, status: "dormente" };
  const entrada = { organizationId: ORG, pointerId: POINTER, contactId: CONTACT, actorUserId: null, requestId: "r1" };

  it("automação: recusa o contato que já espera num Atraso desta automação", async () => {
    const db = fakeDb({ id: POINTER, organization_id: ORG, status: "active", active_version_id: VERSION, surface: "crm_automation" }, [esperando]);
    const result = await enrollFollowupFlow(db as never, entrada);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("conflict");
  });

  it("automação: inscreve quando não há ninguém esperando", async () => {
    const db = fakeDb({ id: POINTER, organization_id: ORG, status: "active", active_version_id: VERSION, surface: "crm_automation" });
    expect((await enrollFollowupFlow(db as never, entrada)).ok).toBe(true);
  });

  it("follow-up: a inscrição dormente NÃO barra (a cadência longa libera o slot de propósito)", async () => {
    const db = fakeDb({ id: POINTER, organization_id: ORG, status: "active", active_version_id: VERSION, surface: "followup" }, [esperando]);
    expect((await enrollFollowupFlow(db as never, entrada)).ok).toBe(true);
  });
```

- [ ] **Passo 2: Rodar e ver falhar**

```powershell
corepack pnpm vitest run lib/followup/enroll.test.ts
```

Esperado: "automação: recusa o contato que já espera…" FALHA (`expected true to be false`). Os outros passam.

- [ ] **Passo 3: Implementar**

Em `lib/followup/enroll.ts`, logo DEPOIS do bloco:

```ts
  if (pointer.status !== "active" || !pointer.active_version_id) {
    return {
      ok: false,
      code: "flow_not_active",
      message: "Fluxo não está ativo (precisa estar publicado).",
      status: 422,
    };
  }
```

acrescentar:

```ts
  // FORK ESCALE · 5D: o Atraso da automação deixa a inscrição `dormente`, que fica fora do índice
  // único de inscrição viva. Sem esta conferência, cada mensagem do contato durante o Atraso abriria
  // outra inscrição na mesma automação (boas-vindas em dobro). O follow-up não entra: lá a espera
  // longa libera o slot de propósito.
  if (pointer.surface === "crm_automation") {
    const { data: esperando, error: esperandoErr } = await supabase
      .from("followup_enrollments")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("pointer_id", pointerId)
      .eq("contact_id", contactId)
      .eq("status", "dormente")
      .limit(1)
      .maybeSingle();
    if (esperandoErr) return { ok: false, code: "internal_error", message: esperandoErr.message, status: 500 };
    if (esperando) {
      return {
        ok: false,
        code: "conflict",
        message: "Este contato já está nesta automação, esperando um Atraso.",
        status: 409,
      };
    }
  }
```

- [ ] **Passo 4: Rodar e ver passar**

```powershell
corepack pnpm vitest run lib/followup/enroll.test.ts lib/automation/actions/start-message-flow.test.ts
```

Esperado: tudo PASS.

- [ ] **Passo 5: Commit**

```powershell
git add lib/followup/enroll.ts lib/followup/enroll.test.ts
git commit -m "fix(automacoes): contato esperando um Atraso não entra de novo na mesma automação" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 4: A recusa do publish aparece na caixa certa

**Arquivos:**
- Criar: `lib/escale/automacoes/fluxo/erros-do-publish.ts`
- Criar: `lib/escale/automacoes/fluxo/erros-do-publish.test.ts`
- Modificar: `hooks/escale/useAutomacoesDaCasca.ts` (`useGravarFluxo`, linha 198)
- Modificar: `components/escale/automacoes/fluxo/useFluxo.ts` (`salvar`, linhas 355-419)
- Modificar: `lib/i18n/dicionario.ts` (depois da linha `"O atraso mínimo é de 30 segundos."`)

**Interfaces:**
- Consome: `PublishValidationError` e `PublishErrorCode` (`lib/followup/validate-publish.ts`), `ApiError` (`lib/api/types.ts`, com `code` e `details`), `idNaTela` (`grupos.ts`), `ID_DO_FIM` (`caixas.ts`), `ProblemaDoDesenho = { caixa: string | null; mensagem: string }`.
- Produz:
  - `problemasDoPublish(erros: readonly ErroDoPublish[]): ProblemaDoDesenho[]`
  - `problemasDoServidor(err: unknown): ProblemaDoDesenho[] | null` (null = não é recusa com lista)
  - `TEXTO_DA_RECUSA_DO_PUBLISH` (usado na Tarefa 5 e no dicionário)

**Por quê:** a rota `PUT /api/v1/automacoes-da-casca/:id/fluxo` devolve 422 com `details.errors`, que é a lista do validador com `node_id` e `code` (`escrita-de-fluxo.ts:328`). Ela também pode devolver `details.problemas`, quando o compilador do servidor recusa (`route.ts:90`). `useGravarFluxo` manda tudo para o `showApiError`, que só mostra "Fluxo reprovado na validação de publish." e o ID. A pessoa não sabe qual caixa corrigir.

- [ ] **Passo 1: Escrever o teste que falha**

Criar `lib/escale/automacoes/fluxo/erros-do-publish.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/types";
import { problemasDoPublish, problemasDoServidor, TEXTO_DA_RECUSA_DO_PUBLISH } from "@/lib/escale/automacoes/fluxo/erros-do-publish";

describe("problemasDoPublish", () => {
  it("leva o erro do nó para a caixa da tela (resposta da mensagem e ação agrupada)", () => {
    expect(
      problemasDoPublish([
        { node_id: "msg__resposta", code: "unreachable_node", message: "x" },
        { node_id: "acao-1__2", code: "max_steps_exceeded", message: "y" },
      ]),
    ).toEqual([
      { caixa: "msg", mensagem: TEXTO_DA_RECUSA_DO_PUBLISH.unreachable_node },
      { caixa: "acao-1", mensagem: TEXTO_DA_RECUSA_DO_PUBLISH.max_steps_exceeded },
    ]);
  });

  it("o nó de fim e o erro sem nó viram aviso geral", () => {
    expect(
      problemasDoPublish([
        { node_id: "fim", code: "no_end_path", message: "x" },
        { node_id: null, code: "no_trigger", message: "O fluxo precisa de exatamente um nó trigger." },
      ]),
    ).toEqual([
      { caixa: null, mensagem: TEXTO_DA_RECUSA_DO_PUBLISH.no_end_path },
      { caixa: null, mensagem: "O fluxo precisa de exatamente um nó trigger." },
    ]);
  });

  it("código sem texto próprio usa a mensagem do validador; repetido não duplica", () => {
    const erro = { node_id: "move", code: "etapa_destino_ausente" as const, message: "Escolha a etapa de destino." };
    expect(problemasDoPublish([erro, erro])).toEqual([{ caixa: "move", mensagem: "Escolha a etapa de destino." }]);
  });
});

describe("problemasDoServidor", () => {
  it("lê a lista de erros do 422 do publish", () => {
    const err = new ApiError(422, "validation_failed", { errors: [{ node_id: "espera", code: "cycle_without_wait", message: "x" }] }, "req-1");
    expect(problemasDoServidor(err)).toEqual([{ caixa: "espera", mensagem: TEXTO_DA_RECUSA_DO_PUBLISH.cycle_without_wait }]);
  });

  it("lê os problemas do compilador do servidor", () => {
    const err = new ApiError(422, "validation_failed", { problemas: [{ caixa: "acao-1__2", mensagem: "O atraso mínimo é de 30 segundos." }] }, "req-1");
    expect(problemasDoServidor(err)).toEqual([{ caixa: "acao-1", mensagem: "O atraso mínimo é de 30 segundos." }]);
  });

  it("devolve null para o que não é recusa com lista (o toast de sempre continua)", () => {
    expect(problemasDoServidor(new ApiError(409, "state_conflict", undefined, "req-1"))).toBeNull();
    expect(problemasDoServidor(new ApiError(422, "validation_failed", undefined, "req-1"))).toBeNull();
    expect(problemasDoServidor(new ApiError(422, "validation_failed", { errors: [{ lixo: 1 }] }, "req-1"))).toBeNull();
    expect(problemasDoServidor(new Error("rede"))).toBeNull();
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

```powershell
corepack pnpm vitest run lib/escale/automacoes/fluxo/erros-do-publish.test.ts
```

Esperado: FALHA ao importar (`Failed to resolve import "@/lib/escale/automacoes/fluxo/erros-do-publish"`).

- [ ] **Passo 3: Implementar o módulo**

Criar `lib/escale/automacoes/fluxo/erros-do-publish.ts`:

```ts
/**
 * FORK ESCALE · 5D: as recusas do publish do fluxo, na caixa da tela a que pertencem.
 * O validador fala de nós do grafo compilado (`msg__resposta`, `acao-1__2`, `fim`); a tela fala
 * de caixas. Usado ANTES de enviar (validador no navegador) e DEPOIS (o 422 do servidor).
 */
import { ApiError } from "@/lib/api/types";
import type { ProblemaDoDesenho } from "@/lib/automation/desenho-da-regra";
import type { FlowGraph } from "@/lib/followup/graph-schema";
import { validateFlowForPublish, type PublishErrorCode, type PublishValidationError } from "@/lib/followup/validate-publish";

import { ID_DO_FIM } from "./caixas";
import { idNaTela } from "./grupos";

type ErroDoPublish = Pick<PublishValidationError, "node_id" | "code" | "message">;

/** O texto da tela para os códigos cuja mensagem do validador é técnica (os outros já são legíveis). */
export const TEXTO_DA_RECUSA_DO_PUBLISH = {
  unreachable_node: "Este passo não está ligado ao gatilho. Ligue-o ao fluxo ou apague-o.",
  no_end_path: "Este caminho volta para um passo anterior e nunca chega ao fim.",
  cycle_without_wait: "Este caminho volta para trás sem um Atraso de pelo menos 5 minutos no meio.",
  long_wait_needs_template: "Depois de 24 horas de espera, o WhatsApp só aceita mensagem com modelo aprovado.",
  max_steps_exceeded: "A automação passou do número máximo de passos em sequência.",
} as const satisfies Partial<Record<PublishErrorCode, string>>;

const TEXTOS: Partial<Record<string, string>> = TEXTO_DA_RECUSA_DO_PUBLISH;

function caixaDoNo(nodeId: string | null): string | null {
  return nodeId === null || nodeId === ID_DO_FIM ? null : idNaTela(nodeId);
}

export function problemasDoPublish(erros: readonly ErroDoPublish[]): ProblemaDoDesenho[] {
  const saida: ProblemaDoDesenho[] = [];
  for (const e of erros) {
    const problema = { caixa: caixaDoNo(e.node_id), mensagem: TEXTOS[e.code] ?? e.message };
    if (!saida.some((p) => p.caixa === problema.caixa && p.mensagem === problema.mensagem)) saida.push(problema);
  }
  return saida;
}

/** As regras do publish que não dependem do banco (etapas, mídia e janela ficam com o servidor). */
export function problemasAntesDoPublish(grafo: FlowGraph): ProblemaDoDesenho[] {
  const v = validateFlowForPublish(grafo, { surface: "crm_automation", exigeModeloForaDaJanela: false });
  return v.ok ? [] : problemasDoPublish(v.errors);
}

const ehErroDoPublish = (e: unknown): e is ErroDoPublish => {
  if (typeof e !== "object" || e === null) return false;
  const x = e as Record<string, unknown>;
  return typeof x.code === "string" && typeof x.message === "string" && (x.node_id === null || typeof x.node_id === "string");
};

const ehProblema = (p: unknown): p is ProblemaDoDesenho => {
  if (typeof p !== "object" || p === null) return false;
  const x = p as Record<string, unknown>;
  return typeof x.mensagem === "string" && (x.caixa === null || typeof x.caixa === "string");
};

/** A recusa do servidor em problemas de caixa; `null` quando o erro não traz lista (o toast de sempre vale). */
export function problemasDoServidor(err: unknown): ProblemaDoDesenho[] | null {
  if (!(err instanceof ApiError) || err.code !== "validation_failed") return null;
  const detalhes = (err.details ?? {}) as { errors?: unknown; problemas?: unknown };
  if (Array.isArray(detalhes.errors)) {
    const erros = detalhes.errors.filter(ehErroDoPublish);
    return erros.length > 0 ? problemasDoPublish(erros) : null;
  }
  if (Array.isArray(detalhes.problemas)) {
    const lidos = detalhes.problemas
      .filter(ehProblema)
      .map((p) => ({ caixa: p.caixa === null ? null : idNaTela(p.caixa), mensagem: p.mensagem }));
    return lidos.length > 0 ? lidos : null;
  }
  return null;
}
```

- [ ] **Passo 4: Rodar e ver passar**

```powershell
corepack pnpm vitest run lib/escale/automacoes/fluxo/erros-do-publish.test.ts
```

Esperado: PASS (6 casos).

- [ ] **Passo 5: Ligar no hook da mutação**

Em `hooks/escale/useAutomacoesDaCasca.ts`, acrescentar o import junto dos outros `@/lib/...`:

```ts
import { problemasDoServidor } from "@/lib/escale/automacoes/fluxo/erros-do-publish";
```

E, dentro de `useGravarFluxo`, trocar:

```ts
    onError: showApiError,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules"] }),
```

por:

```ts
    // FORK ESCALE · 5D: a recusa com lista de erros a tela marca nas caixas; o resto vira o toast de sempre.
    onError: (e: unknown) => {
      if (problemasDoServidor(e) === null) showApiError(e);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules"] }),
```

Conferir que só o `useGravarFluxo` mudou: o arquivo tem outros `onError: showApiError` (linhas 40 e 46), que ficam como estão.

- [ ] **Passo 6: Ligar no `salvar`**

Em `components/escale/automacoes/fluxo/useFluxo.ts`:

1. Acrescentar o import junto dos outros `@/lib/escale/automacoes/fluxo/...`:

```ts
import { problemasAntesDoPublish, problemasDoServidor } from "@/lib/escale/automacoes/fluxo/erros-do-publish";
```

2. Logo ANTES de `const salvar = useCallback(`, acrescentar:

```ts
  /** Marca cada problema na caixa dele (e tira os antigos); os sem caixa vão para o aviso geral. */
  const mostrarProblemas = useCallback(
    (problemas: readonly ProblemaDoDesenho[]) => {
      const porCaixa = new Map<string, ProblemaDoDesenho[]>();
      for (const p of problemas) {
        if (p.caixa) porCaixa.set(p.caixa, [...(porCaixa.get(p.caixa) ?? []), p]);
      }
      setNos((atuais) => atuais.map((n) => ({ ...n, data: { ...n.data, problemas: porCaixa.get(n.id) } })));
      setProblemasGerais(problemas.filter((p) => p.caixa === null));
    },
    [setNos],
  );
```

3. Dentro de `salvar`, trocar:

```ts
    if (!resultado.ok) resultado.problemas.forEach(juntar);
    gruposVazios(desenho).forEach((c) => juntar({ caixa: c.id, mensagem: PROBLEMA_DO_GRUPO_VAZIO }));
    const porCaixa = new Map<string, ProblemaDoDesenho[]>();
    for (const p of problemas) {
      if (p.caixa) porCaixa.set(p.caixa, [...(porCaixa.get(p.caixa) ?? []), p]);
    }
    setNos((atuais) => atuais.map((n) => ({ ...n, data: { ...n.data, problemas: porCaixa.get(n.id) } })));
    setProblemasGerais(problemas.filter((p) => p.caixa === null));
    if (!resultado.ok || problemas.length > 0) {
```

por:

```ts
    if (!resultado.ok) resultado.problemas.forEach(juntar);
    gruposVazios(desenho).forEach((c) => juntar({ caixa: c.id, mensagem: PROBLEMA_DO_GRUPO_VAZIO }));
    mostrarProblemas(problemas);
    if (!resultado.ok || problemas.length > 0) {
```

4. Trocar o `catch` do fim de `salvar`:

```ts
    } catch {
      /* showApiError já mostrou o toast */
      return "falhou";
    }
  }, [nome, desenho, achatado, regraGravada, regra, versao, atualizar, criar, gravarFluxo, router, qc, setNos, t]);
```

por:

```ts
    } catch (err) {
      // FORK ESCALE · 5D: a recusa do publish volta para as caixas. O resto, o showApiError já mostrou.
      const doServidor = modoFluxo ? problemasDoServidor(err) : null;
      if (!doServidor) return "falhou";
      mostrarProblemas(doServidor);
      setSelecionado(null);
      toast.error(t(toastDaRecusa(doServidor)));
      return "recusado";
    }
  }, [nome, desenho, achatado, regraGravada, regra, versao, atualizar, criar, gravarFluxo, router, qc, setNos, t, mostrarProblemas]);
```

(`problemasAntesDoPublish` entra na Tarefa 5, e o import já fica pronto aqui.)

- [ ] **Passo 7: Frases no dicionário**

Em `lib/i18n/dicionario.ts`, logo depois da linha:

```ts
  "O atraso mínimo é de 30 segundos.": { es: "El retraso mínimo es de 30 segundos." },
```

acrescentar:

```ts
  "Este passo não está ligado ao gatilho. Ligue-o ao fluxo ou apague-o.": { es: "Este paso no está conectado al disparador. Conéctalo al flujo o bórralo." },
  "Este caminho volta para um passo anterior e nunca chega ao fim.": { es: "Este camino vuelve a un paso anterior y nunca llega al final." },
  "Este caminho volta para trás sem um Atraso de pelo menos 5 minutos no meio.": { es: "Este camino vuelve atrás sin un retraso de al menos 5 minutos en el medio." },
  "Depois de 24 horas de espera, o WhatsApp só aceita mensagem com modelo aprovado.": { es: "Después de 24 horas de espera, WhatsApp solo acepta mensajes con plantilla aprobada." },
  "A automação passou do número máximo de passos em sequência.": { es: "La automatización superó el número máximo de pasos en secuencia." },
```

- [ ] **Passo 8: Typecheck, eslint e testes da área**

```powershell
corepack pnpm typecheck
corepack pnpm eslint lib/escale/automacoes/fluxo/erros-do-publish.ts hooks/escale/useAutomacoesDaCasca.ts components/escale/automacoes/fluxo/useFluxo.ts
corepack pnpm vitest run lib/escale/automacoes/fluxo tests/unit/escale-automacoes-modo-fluxo.test.tsx tests/unit/escale-fluxo-cabecalho.test.tsx
```

Esperado: typecheck e eslint zerados; testes PASS.

- [ ] **Passo 9: Commit**

```powershell
git add lib/escale/automacoes/fluxo/erros-do-publish.ts lib/escale/automacoes/fluxo/erros-do-publish.test.ts hooks/escale/useAutomacoesDaCasca.ts components/escale/automacoes/fluxo/useFluxo.ts lib/i18n/dicionario.ts
git commit -m "fix(automacoes): a recusa do publish aparece na caixa certa, com texto claro" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 5: Conferir antes de enviar

**Arquivos:**
- Modificar: `components/escale/automacoes/fluxo/useFluxo.ts` (`salvar`)
- Teste: `lib/escale/automacoes/fluxo/erros-do-publish.test.ts` (acrescentar)

**Interfaces:**
- Consome: `problemasAntesDoPublish(grafo: FlowGraph): ProblemaDoDesenho[]` (Tarefa 4) e o retorno de `compilar` (`{ ok: true; modo: "fluxo"; grafo: FlowGraph; ... }`).
- Produz: ao clicar em Salvar, caixa solta, laço sem espera e caminho sem fim aparecem na hora, sem ir ao servidor.

**Por quê:** hoje a tela só confere o que o compilador confere. O que o validador do publish confere (alcance, fim, laço, número de passos) só aparece depois de gravar o rascunho no servidor, e foi isso que gerou o "muito erro ao salvar". O validador é puro, e o próprio editor de follow-up já o importa no navegador (`nodeVisuals.ts`).

- [ ] **Passo 1: Escrever o teste que falha**

Acrescentar no fim de `lib/escale/automacoes/fluxo/erros-do-publish.test.ts`, com os imports novos no topo:

```ts
import { compilar } from "@/lib/escale/automacoes/fluxo/compilar";
import { problemasAntesDoPublish } from "@/lib/escale/automacoes/fluxo/erros-do-publish";
import type { Desenho } from "@/lib/automation/desenho-da-regra";
```

```ts
describe("problemasAntesDoPublish", () => {
  const p = { x: 0, y: 0 };
  const tela = { fonte: null, data: { pipeline_id: "", campo: "", dias: "7" }, tempo: { dias: "7", direcao: "da_equipe" as const, proteger_pela_agenda: false }, criado: { pipeline_id: "", stage_id: "" }, tags: [] };
  const desenho: Desenho = {
    caixas: [
      { id: "gatilho", type: "gatilho", position: p, data: { kind: "gatilho", evento: "message.received", tela } },
      { id: "espera", type: "atraso", position: p, data: { kind: "atraso", quantidade: 1, unidade: "minutos", janela: null } },
    ],
    ligacoes: [{ id: "l1", source: "gatilho", target: "espera" }],
  };

  function grafo() {
    const r = compilar({ nome: "x", desenho, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error(JSON.stringify(r));
    return r.grafo;
  }

  it("o desenho certo não tem problema", () => {
    expect(problemasAntesDoPublish(grafo())).toEqual([]);
  });

  it("um passo solto é marcado na caixa dele", () => {
    const g = grafo();
    const solto = { id: "solta", type: "wait", label: "Atraso", position: p, config: { mode: "fixed", duration_ms: 60_000, immune_to_reply: true } };
    expect(problemasAntesDoPublish({ ...g, nodes: [...g.nodes, solto] } as typeof g)).toEqual([
      { caixa: "solta", mensagem: TEXTO_DA_RECUSA_DO_PUBLISH.unreachable_node },
    ]);
  });
});
```

- [ ] **Passo 2: Rodar**

```powershell
corepack pnpm vitest run lib/escale/automacoes/fluxo/erros-do-publish.test.ts
```

Esperado: PASS, porque a função já existe desde a Tarefa 4 e a Tarefa 2 já deixou o Atraso de 1 min passar. Se "o desenho certo não tem problema" FALHAR, a mensagem do `expect` mostra qual regra do publish o grafo mínimo viola. Corrija antes de seguir e avise o usuário. O que ainda falta, e esta tarefa liga, é a chamada no `salvar`.

- [ ] **Passo 3: Ligar no `salvar`**

Em `components/escale/automacoes/fluxo/useFluxo.ts`, dentro de `salvar`, trocar:

```ts
    if (!resultado.ok) resultado.problemas.forEach(juntar);
    gruposVazios(desenho).forEach((c) => juntar({ caixa: c.id, mensagem: PROBLEMA_DO_GRUPO_VAZIO }));
```

por:

```ts
    if (!resultado.ok) resultado.problemas.forEach(juntar);
    // FORK ESCALE · 5D: o que o publish recusaria e não depende do banco, conferido antes de enviar.
    if (resultado.ok && resultado.modo === "fluxo") problemasAntesDoPublish(resultado.grafo).forEach(juntar);
    gruposVazios(desenho).forEach((c) => juntar({ caixa: c.id, mensagem: PROBLEMA_DO_GRUPO_VAZIO }));
```

- [ ] **Passo 4: Typecheck, eslint e testes da área**

```powershell
corepack pnpm typecheck
corepack pnpm eslint components/escale/automacoes/fluxo/useFluxo.ts lib/escale/automacoes/fluxo/erros-do-publish.test.ts
corepack pnpm vitest run lib/escale/automacoes/fluxo tests/unit/escale-automacoes-modo-fluxo.test.tsx tests/unit/escale-fluxo-cabecalho.test.tsx tests/unit/escale-fluxo-regras.test.ts
```

Esperado: tudo zerado e PASS.

- [ ] **Passo 5: Commit**

```powershell
git add components/escale/automacoes/fluxo/useFluxo.ts lib/escale/automacoes/fluxo/erros-do-publish.test.ts
git commit -m "fix(automacoes): o salvar confere antes de enviar o que o publish recusaria" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 6: Testar, revisar e publicar

**Arquivos:**
- Criar: `.changes/automacoes-atraso-e-erros-do-salvar.md`

- [ ] **Passo 1: Nota da versão**

Criar `.changes/automacoes-atraso-e-erros-do-salvar.md`:

```markdown
---
impacto: nada_mudou
secao: corrigido
titulo: Automações com Atraso voltam a salvar, e o erro aponta a caixa
---

No editor de Automações, a caixa do Atraso aparecia vazia e todo Atraso de menos
de 24 horas era recusado ao salvar ("Fluxo reprovado na validação de publish").
Agora o Atraso aparece com o tempo e o "Próximo passo", salva de 30 segundos a
90 dias, e o contato que está esperando um Atraso não entra de novo na mesma
automação. Quando algo impede o salvar, a caixa com o problema fica marcada em
vermelho com o motivo, e passo solto ou caminho sem fim aparecem antes de enviar.
```

```powershell
corepack pnpm release:conferir
git add .changes/automacoes-atraso-e-erros-do-salvar.md
git commit -m "docs(changes): nota das correções do Atraso e do salvar" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Esperado: `release:conferir` sem erro de forma.

- [ ] **Passo 2: Testes da área (uma rodada)**

```powershell
corepack pnpm vitest run lib/escale/automacoes lib/followup/enroll.test.ts lib/followup/espera-imune.test.ts lib/followup/validate-publish.test.ts lib/automation/actions/start-message-flow.test.ts tests/unit/escale-automacoes-modo-fluxo.test.tsx tests/unit/escale-automacoes-condicoes-grupos.test.tsx tests/unit/escale-fluxo-regras.test.ts tests/unit/escale-fluxo-cabecalho.test.tsx tests/unit/escale-fluxo-paineis-acoes.test.tsx tests/unit/escale-fluxo-tipos-do-canvas.test.tsx tests/unit/mcp-fluxos-escrita.test.ts > $env:TEMP\vt-atraso.log 2>&1; "exit=$LASTEXITCODE"
Select-String -Path $env:TEMP\vt-atraso.log -Pattern "Test Files|Tests |Errors " | Select-Object -Last 3
```

Esperado: `exit=0`, nenhuma linha `failed` e nenhuma linha `Errors`. Arquivo que não existir: tirar da lista e anotar. Falha nova: corrigir antes de seguir.

- [ ] **Passo 3: Um revisor (Opus 5.5, high)**

Disparar UM agente `code-reviewer` com `model: "opus"`. O briefing:
- o diff é `git diff escale-crm/main...HEAD`;
- o objetivo: as 4 correções deste plano;
- pontos de risco a olhar: a recusa em `enroll.ts` (corrida entre duas mensagens, efeito no follow-up), o validador com `surface === 'crm_automation'` (se outro caminho publica `crm_automation` sem passar pelo compilador) e o `onError` do `useGravarFluxo` (se algum erro fica sem toast nenhum);
- o relatório: só achados, com severidade.

Corrigir todo Critical/High (e Important) antes de seguir, com commit próprio.

- [ ] **Passo 4: PR e merge**

```powershell
git push -u escale-crm fix/automacoes-atraso-e-salvar
gh pr create --repo rgisjr/escale-crm --base main --head fix/automacoes-atraso-e-salvar --title "fix(automacoes): Atraso aparece, publica e não duplica; erros do salvar na caixa certa" --body "Corrige os erros ao salvar automações com Atraso (5D, escale.50): Atraso registrado no canvas; piso de 24 h da espera imune só no follow-up; contato esperando um Atraso não reentra na mesma automação; recusa do publish marcada na caixa, com texto claro, e conferida antes de enviar. Sem migration.`n`n🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr merge --repo rgisjr/escale-crm --merge fix/automacoes-atraso-e-salvar
```

- [ ] **Passo 5: Tag e release**

```powershell
git fetch escale-crm
git log --oneline v1.81.0-escale.50..escale-crm/main
git diff --name-only v1.81.0-escale.50 escale-crm/main -- supabase/migrations
```

Esperado: só os commits deste plano, e nenhuma migration. Se aparecer trabalho de outra frente ou uma migration, PARE e avise antes de tagear.

```powershell
git tag -a v1.81.0-escale.51 escale-crm/main -m "Automações: Atraso aparece, publica e não duplica; erros do salvar na caixa certa"
git push escale-crm v1.81.0-escale.51
gh release create v1.81.0-escale.51 --repo rgisjr/escale-crm --latest --title "v1.81.0-escale.51" --notes "Automações com Atraso voltam a salvar; o erro aponta a caixa; contato esperando um Atraso não reentra na mesma automação. Sem migration."
```

Esperar o workflow "Publicar imagem Docker (GHCR)" chegar a `promover-stable: success`:

```powershell
gh run list --repo rgisjr/escale-crm --workflow "Publicar imagem Docker (GHCR)" --limit 1
```

Não seguir para a VPS antes disso.

- [ ] **Passo 6: Backup e update na VPS**

```powershell
ssh -i ~/.ssh/vps_deskcomm root@76.13.228.29 "cd /root/DeskcommCRM && df -h / | tail -1 && bash hostgator-setup-kit/backup.sh"
ssh -i ~/.ssh/vps_deskcomm root@76.13.228.29 "cd /root/DeskcommCRM && nohup bash hostgator-setup-kit/update.sh --to v1.81.0-escale.51 > /root/update-v1.81.0-escale.51.log 2>&1 &"
```

Esperar, numa chamada separada, até `pgrep -f "[u]pdate.sh"` voltar vazio. Depois:

```powershell
ssh -i ~/.ssh/vps_deskcomm root@76.13.228.29 "tail -20 /root/update-v1.81.0-escale.51.log; docker ps --format '{{.Names}} {{.Status}} {{.Image}}' | grep -i deskcomm"
curl.exe -s -o NUL -w "%{http_code}`n" https://app.escaleia.com/login
curl.exe -s -o NUL -w "%{http_code}`n" https://app.escaleia.com/app
```

Esperado: 3 containers `healthy` na `1.81.0-escale.51`, `/login` 200, `/app` 307 e o log do update fechando sem erro. Se a checagem de saúde falhar por pooler saturado (lição da escale.50), esperar o worker ficar 60 s sem erro e rodar `update.sh --to v1.81.0-escale.51 --force`. Se a conferência falhar, voltar para a `v1.81.0-escale.50` e avisar.

- [ ] **Passo 7: Conferência pela tela (sem gravar dado de cliente)**

No Chrome, em https://app.escaleia.com, abrir a automação "ONPLAY 1 - Lead novo: Tem interesse + boas-vindas" e conferir, SEM clicar em Salvar:
- a caixa do Atraso aparece como card ("Atraso" em vermelho, "Aguardar 1 minuto", "Continuar entre…", "Próximo passo"), não como retângulo vazio;
- o console não tem erro.

Comparar o card com a captura da Clint e listar por escrito as diferenças que sobrarem. As esperadas, pendentes de decisão: valor zero com "+ Adicionar atraso" e o painel "Definir horário".

O teste de salvar fica com o usuário: salvar a ONPLAY 1 com o Atraso de 1 minuto deve dar "Automação salva com sucesso!".

- [ ] **Passo 8: Registrar**

Atualizar a memória `vps-producao-do-crm.md` (linha da escale.51) e `frente-automacoes-fluxo-completo-5d.md`. Atualizar o `LOG.md` na raiz da pasta Deskcom CRM, separando "validado por execução" (testes, update, card no Chrome) de "validado por leitura" (salvar pela tela, que é do usuário).

---

## Autorrevisão

- **Cobertura:** caixa vazia → T1; "Fluxo reprovado…" com Atraso curto → T2; inscrição dupla que a T2 abriria → T3; erro sem caixa → T4; erro só depois de enviar → T5; publicar e conferir → T6. Os três pontos que dependem do usuário estão listados em "Restrições globais" como fora do plano.
- **Sem lacunas:** todo passo de código traz o código. As paradas são condicionais e explícitas (terceiro defeito na T2, trabalho de outra frente na T6).
- **Nomes:** `problemasDoPublish`, `problemasAntesDoPublish`, `problemasDoServidor`, `TEXTO_DA_RECUSA_DO_PUBLISH` e `mostrarProblemas` são os mesmos nas Tarefas 4, 5 e 6.
