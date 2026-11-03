# Arrastar origens e marca Escale OS — Plano de implementação

> **Para quem executa:** use `superpowers:executing-plans`, inline, na própria sessão (regra do projeto: nunca trocar para subagent-driven-development). Execução em Sonnet 5.5; o revisor do fim roda em Opus 5.5. Os passos usam caixinhas (`- [ ]`).

**Objetivo:** (1) quem gerencia origens arrasta uma origem no painel ORIGENS para mudar a ordem dentro do grupo ou para outro grupo aberto; (2) a aba do navegador passa a dizer "Escale OS" com o ícone "AI" da Escale IA, e o canto esquerdo do menu de cima mostra a logo seguida do nome.

**Arquitetura:** o banco e as rotas já sabem fazer as duas coisas do arrastar: `PATCH /api/v1/pipelines/[id]` com `depois_de` muda a posição e `PUT /api/v1/pipelines/[id]/grupo` troca o grupo. O trabalho é na tela: `@hello-pangea/dnd` (já usado nas etapas e no quadro), um módulo puro que calcula o `depois_de` e a lista otimista, e um hook novo em `useOrigens`. A marca é configuração do sistema de white-label que já existe (`/admin/marca` grava nome, logo e ícone da aba na tabela `platform_branding`). O único código da marca é o `MarcaNoTopo`, que hoje mostra a logo **ou** o nome e passa a mostrar os dois.

**Tecnologias:** Next.js (App Router), React, TanStack Query, `@hello-pangea/dnd` 18, Vitest + Testing Library.

## Restrições globais

- Regra pétrea: este plano só roda depois de um "pode fazer" do usuário. Aprovado o plano, a entrega vai até produção sem pedir de novo (CLAUDE.md, "A entrega até produção é do Claude").
- Ordem da frente: executar as duas fases (um PR por fase, mergeado logo), **depois** a bateria de testes uma vez, **depois** uma publicação só. Nada de rodada cheia nem `test:db` no meio.
- Sem migration nesta frente: `test:db` e `test:db:update` não são exigidos.
- Revisão: um revisor só para a frente, `code-reviewer` em Opus 5.5 (nunca Sonnet).
- Toda frase nova em `t()` precisa de linha no `lib/i18n/dicionario.ts` com `es` (o guarda `tests/unit/i18n-espanhol-cobre-a-tela` reprova sem ela).
- Nome do app: **"Escale OS"**, nunca só "Escale". Logo: `C:\Users\regis\Downloads\escale-ia-icone-1024-transparente.png` ("AI" azul e laranja, fundo transparente, 229 KB; o limite do upload é 512 KB, PNG ou JPEG).
- Arrastar só para quem pode gerenciar origens (gerente ou admin), e desligado na busca, no modo seleção e enquanto uma gravação de arraste está em andamento.
- A Clint não tem arrastar no painel Origens (nem nas capturas, nem nas fichas, nem no código). O visual é nosso e o mínimo possível: sem alça, a linha inteira arrasta, e a linha arrastada fica branca com a sombra `shadow-casca-painel`.
- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm` (o `pnpm` não está no PATH).
- PR vai para `rgisjr/escale-crm`, base `main`. Nunca push em `origin` (Rafael).

## Fora desta frente

- Arrastar **grupos** (precisaria de migration com `position` em `crm_pipeline_groups`). O usuário escolheu só origens + troca de grupo em 27/10/2026.
- Soltar a origem em cima de um grupo **fechado**. Para levar a origem a outro grupo, a pessoa abre o grupo de destino antes de arrastar.
- Arrastar na lista "Sem grupo" (é só defesa para banco sem a migration 9002; com ela fica sempre vazia).

## Mapa dos arquivos

| Arquivo | O que muda |
|---|---|
| `lib/escale/origens/mover.ts` (novo) | Regras puras: `movimentoDoArraste` (o que gravar) e `moverNaLista` (a lista otimista). |
| `tests/unit/escale-mover-origem.test.ts` (novo) | Testes das duas regras. |
| `hooks/escale/useOrigens.ts` | Hook `useMoverOrigem`: troca o grupo (se mudou), grava a posição e relê as origens. |
| `components/escale/origens/LinhasDoPainel.tsx` | `LinhaDaOrigem` aceita `arraste`; `LinhaDoGrupo` aceita `podeArrastar` e vira `Droppable` com `Draggable` por origem. |
| `components/escale/origens/PainelOrigens.tsx` | `DragDropContext`, `aoSoltar`, estado otimista, desfazer e erro. |
| `lib/i18n/dicionario.ts` | A instrução de teclado do arrastar, em `es` e `en`. |
| `tests/unit/escale-arrastar-origens.test.tsx` (novo) | O painel solta, chama as rotas certas, mostra a nova ordem e desfaz no erro. |
| `components/escale/menu/MarcaNoTopo.tsx` | Logo + nome. |
| `tests/unit/escale-marca-no-topo.test.tsx` (novo) | Testes do `MarcaNoTopo`. |
| `/admin/marca` e Configurações › Marca (produção, pela tela) | Nome "Escale OS", logo e ícone da aba; nome da organização vazio. |

## Como a ordem funciona (ler antes da Task 1)

- `crm_pipelines.position` é **uma régua só para a organização inteira**. `lerOrigens` lê os funis por `position`, e `montarOrigens` filtra cada grupo mantendo essa ordem. A ordem dentro de um grupo é a ordem da régua.
- A rota `PATCH /api/v1/pipelines/[id]` recebe `depois_de` = o funil **ativo** logo acima na régua (`null` = primeiro da régua) e calcula a posição entre ele e o seguinte. A régua da rota é `funis.filter(f => !f.is_archived && f.id !== alvo)`. A conta da tela usa exatamente a mesma régua.
- Vizinho de cima para soltar no índice `i` do grupo de destino (`resto` = origens do grupo sem a arrastada):
  - `i > 0`: `resto[i - 1]`.
  - `i = 0` com o grupo não vazio: o funil que vem antes de `resto[0]` na régua (ou `null` se `resto[0]` é o primeiro). Assim a origem sobe só no próprio grupo e não passa à frente das origens de outros grupos.
  - Grupo vazio: o último da régua (a origem vai para o fim).
- Posições empatadas fazem a rota responder 409 ("Os funis desta lista estão empatados na ordenação…"). A tela desfaz e mostra a mensagem. A Task 5 confere em produção se há empate.

---

### Task 1: Regras puras do arrastar

**Arquivos:**
- Criar: `lib/escale/origens/mover.ts`
- Teste: `tests/unit/escale-mover-origem.test.ts`

**Interfaces:**
- Consome: `montarOrigens`, `Origens`, `FunilDaOrigem` de `lib/escale/origens/regras.ts`.
- Produz:
  - `interface MovimentoDeOrigem { id: string; grupoNovo: string | null; depoisDe: string | null }`
  - `interface Arraste { id: string; de: string; para: string; indice: number }`
  - `movimentoDoArraste(origens: Origens, arraste: Arraste): MovimentoDeOrigem | null`
  - `moverNaLista(origens: Origens, movimento: MovimentoDeOrigem): Origens`

- [ ] **Passo 0: Worktree e branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
git fetch escale-crm
git worktree add ../wt-arrastar -b feat/arrastar-origens escale-crm/main
cd ../wt-arrastar
export PATH="/c/Program Files/nodejs:$PATH"
corepack pnpm install --frozen-lockfile
cp ../repo/docs/superpowers/plans/2026-10-27-arrastar-origens-e-marca.md docs/superpowers/plans/
```

Esperado: `node_modules` instalado, plano copiado. Daqui em diante, todos os comandos rodam em `wt-arrastar`.

- [ ] **Passo 1: Escrever o teste que falha**

`tests/unit/escale-mover-origem.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { montarOrigens, type Origens } from "@/lib/escale/origens/regras";
import { moverNaLista, movimentoDoArraste } from "@/lib/escale/origens/mover";

// Régua ativa da organização: f1, f2, f3, f5 (f4 está arquivado).
// Grupo A mostra f1, f3, f5; grupo B mostra f2; grupo C está vazio.
const ORIGENS: Origens = {
  grupos: [
    { id: "g-a", name: "A", color: null, icon: "iniciais", is_archived: false },
    { id: "g-b", name: "B", color: null, icon: "iniciais", is_archived: false },
    { id: "g-c", name: "C", color: null, icon: "iniciais", is_archived: false },
  ],
  funis: [
    { id: "f1", name: "Um", group_id: "g-a", is_archived: false, is_default: true },
    { id: "f2", name: "Dois", group_id: "g-b", is_archived: false, is_default: false },
    { id: "f3", name: "Três", group_id: "g-a", is_archived: false, is_default: false },
    { id: "f4", name: "Quatro", group_id: "g-a", is_archived: true, is_default: false },
    { id: "f5", name: "Cinco", group_id: "g-a", is_archived: false, is_default: false },
  ],
};

const doGrupo = (origens: Origens, id: string) =>
  montarOrigens(origens).grupos.find((g) => g.id === id)?.funis.map((f) => f.id);

describe("movimentoDoArraste", () => {
  it("subir para o topo do grupo vai para antes da primeira dele na régua", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f5", de: "g-a", para: "g-a", indice: 0 })).toEqual({
      id: "f5",
      grupoNovo: null,
      depoisDe: null,
    });
  });

  it("descer no grupo fica logo abaixo da vizinha de cima", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f1", de: "g-a", para: "g-a", indice: 1 })).toEqual({
      id: "f1",
      grupoNovo: null,
      depoisDe: "f3",
    });
    expect(movimentoDoArraste(ORIGENS, { id: "f1", de: "g-a", para: "g-a", indice: 2 })).toEqual({
      id: "f1",
      grupoNovo: null,
      depoisDe: "f5",
    });
  });

  it("no topo de outro grupo, fica logo abaixo de quem vem antes dele na régua", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f3", de: "g-a", para: "g-b", indice: 0 })).toEqual({
      id: "f3",
      grupoNovo: "g-b",
      depoisDe: "f1",
    });
  });

  it("num grupo vazio, vai para o fim da régua", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f1", de: "g-a", para: "g-c", indice: 0 })).toEqual({
      id: "f1",
      grupoNovo: "g-c",
      depoisDe: "f5",
    });
  });

  it("soltar no mesmo lugar não grava nada", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f3", de: "g-a", para: "g-a", indice: 1 })).toBeNull();
  });

  it("grupo de destino desconhecido não grava nada", () => {
    expect(movimentoDoArraste(ORIGENS, { id: "f3", de: "g-a", para: "g-x", indice: 0 })).toBeNull();
  });
});

describe("moverNaLista", () => {
  it("põe a origem no topo do grupo", () => {
    const depois = moverNaLista(ORIGENS, { id: "f5", grupoNovo: null, depoisDe: null });
    expect(doGrupo(depois, "g-a")).toEqual(["f5", "f1", "f3"]);
  });

  it("troca o grupo e põe logo abaixo do vizinho", () => {
    const depois = moverNaLista(ORIGENS, { id: "f3", grupoNovo: "g-b", depoisDe: "f1" });
    expect(doGrupo(depois, "g-b")).toEqual(["f3", "f2"]);
    expect(doGrupo(depois, "g-a")).toEqual(["f1", "f5"]);
  });

  it("não muda a lista original", () => {
    moverNaLista(ORIGENS, { id: "f5", grupoNovo: null, depoisDe: null });
    expect(ORIGENS.funis.map((f) => f.id)).toEqual(["f1", "f2", "f3", "f4", "f5"]);
  });

  it("origem desconhecida devolve a mesma lista", () => {
    expect(moverNaLista(ORIGENS, { id: "f9", grupoNovo: null, depoisDe: null })).toBe(ORIGENS);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Rodar: `corepack pnpm vitest run tests/unit/escale-mover-origem.test.ts`
Esperado: FAIL, "Failed to resolve import "@/lib/escale/origens/mover"".

- [ ] **Passo 3: Implementar**

`lib/escale/origens/mover.ts`:

```ts
/**
 * ARRASTAR ORIGENS NO PAINEL (fork Escale): o que gravar quando alguém solta
 * uma origem, e como a lista fica até o servidor responder.
 *
 * A ordem das origens é a `position` de `crm_pipelines`, UMA régua para a
 * organização inteira; cada grupo mostra as suas na ordem dessa régua. Por isso
 * o vizinho mandado ao servidor (`depois_de` de `PATCH /api/v1/pipelines/[id]`)
 * é sempre um funil ATIVO da régua, e a régua daqui é a mesma da rota: ativos,
 * sem a origem arrastada.
 */
import { montarOrigens, type FunilDaOrigem, type Origens } from "./regras";

export interface MovimentoDeOrigem {
  id: string;
  /** O grupo novo, só quando a origem muda de grupo. */
  grupoNovo: string | null;
  /** O funil ativo logo acima na régua da organização; `null` = primeiro da régua. */
  depoisDe: string | null;
}

/** O que o `@hello-pangea/dnd` conta ao soltar: a origem, o grupo de saída, o de chegada e a posição nele. */
export interface Arraste {
  id: string;
  de: string;
  para: string;
  indice: number;
}

/** `null` quando não há o que gravar (mesmo lugar ou grupo que não está na árvore). */
export function movimentoDoArraste(origens: Origens, { id, de, para, indice }: Arraste): MovimentoDeOrigem | null {
  const destino = montarOrigens(origens).grupos.find((g) => g.id === para);
  if (!destino) return null;
  if (de === para && destino.funis.findIndex((f) => f.id === id) === indice) return null;
  const resto = destino.funis.filter((f) => f.id !== id);
  const regua = origens.funis.filter((f) => !f.is_archived && f.id !== id);
  return { id, grupoNovo: de === para ? null : para, depoisDe: vizinhoDeCima(resto, regua, indice) };
}

function vizinhoDeCima(resto: FunilDaOrigem[], regua: FunilDaOrigem[], indice: number): string | null {
  if (indice > 0) return resto[indice - 1]?.id ?? null;
  const primeira = resto[0];
  // Grupo vazio: a origem vai para o fim da régua.
  if (!primeira) return regua.at(-1)?.id ?? null;
  // Topo do grupo: logo abaixo de quem vem antes da atual primeira, sem passar
  // à frente das origens dos outros grupos.
  const k = regua.findIndex((f) => f.id === primeira.id);
  return k > 0 ? (regua[k - 1]?.id ?? null) : null;
}

/** A lista como fica depois do movimento, sem esperar o servidor. Nova lista; a original não muda. */
export function moverNaLista(origens: Origens, { id, grupoNovo, depoisDe }: MovimentoDeOrigem): Origens {
  const alvo = origens.funis.find((f) => f.id === id);
  if (!alvo) return origens;
  const movido = grupoNovo ? { ...alvo, group_id: grupoNovo } : alvo;
  const resto = origens.funis.filter((f) => f.id !== id);
  const i = depoisDe === null ? 0 : resto.findIndex((f) => f.id === depoisDe) + 1;
  return { ...origens, funis: [...resto.slice(0, i), movido, ...resto.slice(i)] };
}
```

- [ ] **Passo 4: Rodar e ver passar**

Rodar: `corepack pnpm vitest run tests/unit/escale-mover-origem.test.ts`
Esperado: 10 testes passando.

- [ ] **Passo 5: Commit**

```bash
git add lib/escale/origens/mover.ts tests/unit/escale-mover-origem.test.ts docs/superpowers/plans/2026-10-27-arrastar-origens-e-marca.md
git commit -m "feat(escale): regras do arrastar origens no painel"
```

---

### Task 2: Arrastar no painel (hook, linhas e painel)

**Arquivos:**
- Modificar: `hooks/escale/useOrigens.ts` (hook novo no fim)
- Modificar: `components/escale/origens/LinhasDoPainel.tsx` (`LinhaDaOrigem` e `LinhaDoGrupo`)
- Modificar: `components/escale/origens/PainelOrigens.tsx`
- Modificar: `lib/i18n/dicionario.ts` (uma linha)
- Teste: `tests/unit/escale-arrastar-origens.test.tsx`

**Interfaces:**
- Consome: `MovimentoDeOrigem`, `movimentoDoArraste`, `moverNaLista` (Task 1).
- Produz:
  - `useMoverOrigem()`: `useMutation<Origens, Error, MovimentoDeOrigem>`.
  - `interface ArrasteDaLinha { provided: DraggableProvided; arrastando: boolean }` exportada de `LinhasDoPainel.tsx`.
  - Prop nova `arraste?: ArrasteDaLinha` em `LinhaDaOrigem`; prop nova `podeArrastar?: boolean` (padrão `false`) em `LinhaDoGrupo`.

- [ ] **Passo 1: Escrever o teste que falha**

`tests/unit/escale-arrastar-origens.test.tsx`:

```tsx
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// O DnD de verdade precisa de mouse e layout; aqui o teste guarda o `onDragEnd`
// e solta "na mão", como a biblioteca faria. O atributo `data-arrastavel` vem da
// alça falsa e mostra quais linhas viraram arrastáveis.
const dnd = vi.hoisted(() => ({ soltar: null as null | ((r: unknown) => void) }));
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children, onDragEnd }: { children: ReactNode; onDragEnd: (r: unknown) => void }) => {
    dnd.soltar = onDragEnd;
    return <>{children}</>;
  },
  Droppable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, { isDraggingOver: false }),
  Draggable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children(
      { innerRef: () => {}, draggableProps: {}, dragHandleProps: { "data-arrastavel": "" } },
      { isDragging: false },
    ),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/pipelines/f-leads",
  useRouter: () => ({ refresh: vi.fn(), push }),
}));
vi.mock("@/lib/escale/origens/guardar-preferencia", () => ({ guardarPreferenciaDeOrigens: vi.fn(async () => undefined) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { moverNaLista } from "@/lib/escale/origens/mover";
import type { Origens } from "@/lib/escale/origens/regras";
import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { PainelOrigens } from "@/components/escale/origens/PainelOrigens";

const G_OBRAS = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const G_CRED = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const ORIGENS: Origens = {
  grupos: [
    { id: G_OBRAS, name: "INSS de obras", color: null, icon: "iniciais", is_archived: false },
    { id: G_CRED, name: "Credenciados", color: null, icon: "iniciais", is_archived: false },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: G_OBRAS, is_archived: false, is_default: false },
    { id: "f-nayara", name: "Funil Nayara", group_id: G_CRED, is_archived: false, is_default: false },
    { id: "f-turma", name: "Turma 12", group_id: G_CRED, is_archived: false, is_default: false },
  ],
};
const ABERTO: PreferenciasDoPainel = {
  painelAberto: true,
  listaAberta: true,
  visualizacoesAbertas: true,
  recentesAbertos: false,
  ocultos: [],
};

async function renderizar(podeGerenciar = true) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <PainelOrigens origens={ORIGENS} visualizacoes={[]} podeGerenciar={podeGerenciar} preferencias={ABERTO} />
    </QueryClientProvider>,
  );
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  // INSS de obras já vem aberto (tem a origem aberta); abre Credenciados também.
  await user.click(screen.getByRole("button", { name: "Abrir Credenciados" }));
}

const lista = () => screen.getByRole("navigation", { name: "Funis por grupo" });
const nomes = () => within(lista()).getAllByRole("link").map((l) => l.textContent);

function soltar(id: string, de: [string, number], para: [string, number]) {
  return act(async () => {
    dnd.soltar?.({
      draggableId: id,
      type: "origem",
      reason: "DROP",
      mode: "FLUID",
      combine: null,
      source: { droppableId: de[0], index: de[1] },
      destination: { droppableId: para[0], index: para[1] },
    });
  });
}

beforeEach(() => {
  dnd.soltar = null;
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("<PainelOrigens> — arrastar origens", () => {
  it("só quem gerencia arrasta", async () => {
    await renderizar(false);
    expect(lista().querySelectorAll("[data-arrastavel]")).toHaveLength(0);
  });

  it("subir no grupo grava a posição e mostra a nova ordem", async () => {
    const depois = moverNaLista(ORIGENS, { id: "f-turma", grupoNovo: null, depoisDe: "f-leads" });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.get).mockResolvedValue({ data: depois });
    await renderizar();
    expect(lista().querySelectorAll("[data-arrastavel]")).toHaveLength(3);
    expect(nomes()).toEqual(["Funil Nayara", "Turma 12", "Leads INSS WhatsApp"]);

    await soltar("f-turma", [G_CRED, 1], [G_CRED, 0]);

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-turma", { depois_de: "f-leads" }),
    );
    expect(apiClient.put).not.toHaveBeenCalled();
    expect(nomes()).toEqual(["Turma 12", "Funil Nayara", "Leads INSS WhatsApp"]);
  });

  it("levar para outro grupo troca o grupo antes de gravar a posição", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: ORIGENS });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.get).mockResolvedValue({
      data: moverNaLista(ORIGENS, { id: "f-nayara", grupoNovo: G_OBRAS, depoisDe: "f-leads" }),
    });
    await renderizar();

    await soltar("f-nayara", [G_CRED, 0], [G_OBRAS, 1]);

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-nayara", { depois_de: "f-leads" }),
    );
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-nayara/grupo", { group_id: G_OBRAS });
    expect(vi.mocked(apiClient.put).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(apiClient.patch).mock.invocationCallOrder[0]!,
    );
    expect(nomes()).toEqual(["Turma 12", "Leads INSS WhatsApp", "Funil Nayara"]);
  });

  it("se a gravação falha, a origem volta ao lugar e a mensagem aparece", async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(new Error("Os funis desta lista estão empatados na ordenação."));
    await renderizar();

    await soltar("f-turma", [G_CRED, 1], [G_CRED, 0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("empatados na ordenação");
    expect(nomes()).toEqual(["Funil Nayara", "Turma 12", "Leads INSS WhatsApp"]);
  });

  it("soltar no mesmo lugar ou fora da lista não grava nada", async () => {
    await renderizar();

    await soltar("f-nayara", [G_CRED, 0], [G_CRED, 0]);
    await act(async () => {
      dnd.soltar?.({
        draggableId: "f-nayara",
        type: "origem",
        reason: "DROP",
        mode: "FLUID",
        combine: null,
        source: { droppableId: G_CRED, index: 0 },
        destination: null,
      });
    });

    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(apiClient.put).not.toHaveBeenCalled();
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Rodar: `corepack pnpm vitest run tests/unit/escale-arrastar-origens.test.tsx`
Esperado: FAIL. "só quem gerencia arrasta" passa por acaso; os outros falham porque `dnd.soltar` é `null` (o painel ainda não tem `DragDropContext`) e nenhuma rota é chamada.

- [ ] **Passo 3: Hook `useMoverOrigem`**

No fim de `hooks/escale/useOrigens.ts`, e o import novo no topo junto dos outros:

```ts
import type { MovimentoDeOrigem } from "@/lib/escale/origens/mover";
```

```ts
/**
 * Arrastar no painel: troca o grupo (só se mudou) e depois grava a posição pelo
 * `depois_de` da rota do original. Nessa ordem porque a régua da posição é a da
 * organização inteira, e o grupo só decide em que lista a origem aparece: se a
 * segunda escrita falhar, a origem já está no grupo novo e a releitura mostra isso.
 */
export function useMoverOrigem() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ id, grupoNovo, depoisDe }: MovimentoDeOrigem) => {
      if (grupoNovo) await apiClient.put(grupoDoFunil(id), { group_id: grupoNovo });
      await apiClient.patch(doFunil(id), { depois_de: depoisDe });
      return reler();
    },
    onSettled,
  });
}
```

- [ ] **Passo 4: `LinhaDaOrigem` aceita `arraste`**

Em `components/escale/origens/LinhasDoPainel.tsx`, import novo no topo:

```ts
import { Draggable, Droppable, type DraggableProvided } from "@hello-pangea/dnd";
```

Logo abaixo de `export interface SelecaoNoPainel { … }`:

```ts
/** Presente quando a linha da origem pode ser arrastada (fork Escale: ordem das origens no painel). */
export interface ArrasteDaLinha {
  provided: DraggableProvided;
  arrastando: boolean;
}
```

Em `LinhaDaOrigem`, acrescentar a prop e trocar o `<li>` da linha normal (o do modo seleção fica como está). O comentário da função ganha uma linha.

```tsx
/**
 * A linha da origem (01-032/033), de 34px e de borda a borda, só com texto.
 * - O texto fica a 43px quando a origem está dentro de um grupo.
 * - A origem aberta ganha o fundo #EFF3FF e a barra de 3px da marca.
 * - O hover pinta de #F3F3F3 e mostra o ⋮.
 * - No modo seleção, a caixinha da casca vem antes do nome; clicar no nome também marca.
 * - Com `arraste`, a linha inteira arrasta (sem alça; a Clint não tem esse arrastar).
 */
export function LinhaDaOrigem({
  funil,
  ativo,
  podeGerenciar,
  recuo,
  selecao,
  arraste,
  onAcao,
}: {
  funil: FunilDaOrigem;
  ativo: string | null;
  podeGerenciar: boolean;
  recuo: boolean;
  /** Presente no modo seleção: a linha vira caixinha (clicar marca, não abre o quadro). */
  selecao?: SelecaoNoPainel;
  arraste?: ArrasteDaLinha;
  onAcao: (a: AcaoDaOrigem) => void;
}) {
```

```tsx
  const atual = funil.id === ativo;
  return (
    <li
      ref={arraste?.provided.innerRef}
      {...arraste?.provided.draggableProps}
      {...arraste?.provided.dragHandleProps}
      className={cn(
        "group/origem",
        LINHA,
        atual ? LINHA_ATUAL : LINHA_COM_HOVER,
        "pr-1",
        arraste?.arrastando && "bg-surface shadow-casca-painel",
      )}
    >
```

(O resto do `<li>`, com o `Link` e o `MenuDaOrigem`, não muda.)

- [ ] **Passo 5: `LinhaDoGrupo` vira lista arrastável**

Na assinatura de `LinhaDoGrupo`, acrescentar `podeArrastar = false` na desestruturação e no tipo:

```ts
  /** Lista arrastável (fork Escale): quem gerencia, fora da busca e do modo seleção. */
  podeArrastar?: boolean;
```

Trocar o bloco `{aberto && ( <ul> … </ul> )}` inteiro por:

```tsx
      {aberto &&
        (podeArrastar ? (
          <Droppable droppableId={grupo.id} type="origem">
            {(prov) => (
              <ul ref={prov.innerRef} {...prov.droppableProps}>
                {novaOrigem}
                {grupo.funis.length === 0 && !criandoAqui
                  ? vazio
                  : grupo.funis.map((f, i) => (
                      <Draggable key={f.id} draggableId={f.id} index={i}>
                        {(p, s) => origem(f, { provided: p, arrastando: s.isDragging })}
                      </Draggable>
                    ))}
                {prov.placeholder}
              </ul>
            )}
          </Droppable>
        ) : (
          <ul>
            {novaOrigem}
            {grupo.funis.length === 0 && !criandoAqui ? vazio : grupo.funis.map((f) => origem(f))}
          </ul>
        ))}
```

E, logo depois de `const temAOrigemAberta = …`, as três peças que os dois ramos usam:

```tsx
  const novaOrigem = criandoAqui && !selecao && (
    <NovaOrigemNoGrupo grupoId={grupo.id} onCriada={onCriada} onCancelar={onCancelarCriacao} />
  );
  const vazio = (
    <li className={cn("flex h-[34px] items-center pr-3 text-[11px] text-casca-suave", RECUO_DO_TEXTO)}>
      {t("Nenhum funil neste grupo.")}
    </li>
  );
  const origem = (f: FunilDaOrigem, arraste?: ArrasteDaLinha) => (
    <LinhaDaOrigem
      key={f.id}
      funil={f}
      ativo={ativo}
      podeGerenciar={podeGerenciar}
      recuo
      selecao={selecao}
      arraste={arraste}
      onAcao={(a) => onAcaoDaOrigem(f.id, a)}
    />
  );
```

- [ ] **Passo 6: O painel solta**

Em `components/escale/origens/PainelOrigens.tsx`:

Imports novos (junto dos outros, na ordem alfabética do arquivo):

```ts
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
```

```ts
import { useMoverOrigem } from "@/hooks/escale/useOrigens";
```

```ts
import { moverNaLista, movimentoDoArraste } from "@/lib/escale/origens/mover";
```

Depois de `const atualizarVisualizacao = useAtualizarVisualizacao();`:

```ts
  const moverOrigem = useMoverOrigem();
  const [erroDoArraste, setErroDoArraste] = useState<string | null>(null);
```

Depois de `const visualizacoesVisiveis = filtrarVisualizacoes(visualizacoes, busca);`:

```ts
  // Uma gravação de cada vez: a resposta de um arraste antigo não pode desfazer o seguinte.
  const podeArrastar = podeGerenciar && !selecao && !buscando && !moverOrigem.isPending;
```

Depois de `function abrirVisualizacao(…) { … }`:

```ts
  /** Soltou: a lista muda na hora; se o servidor recusar, volta como estava e diz por quê. */
  function aoSoltar(r: DropResult) {
    if (!r.destination) return;
    const movimento = movimentoDoArraste(origens, {
      id: r.draggableId,
      de: r.source.droppableId,
      para: r.destination.droppableId,
      indice: r.destination.index,
    });
    if (!movimento) return;
    const antes = origens;
    setErroDoArraste(null);
    setOrigens(moverNaLista(origens, movimento));
    moverOrigem.mutate(movimento, {
      onSuccess: setOrigens,
      onError: (err) => {
        setOrigens(antes);
        setErroDoArraste(textoDoErro(err, t));
      },
    });
  }
```

No JSX, envolver a `<ul>` dos grupos (dentro da `<nav aria-label={t("Funis por grupo")}>`) com o contexto, e passar `podeArrastar` a cada `LinhaDoGrupo`:

```tsx
              <nav aria-label={t("Funis por grupo")}>
                <DragDropContext
                  onDragEnd={aoSoltar}
                  dragHandleUsageInstructions={t(
                    "Para mover a origem, aperte espaço, use as setas e aperte espaço de novo para soltar. Esc cancela.",
                  )}
                >
                  <ul>
                    {visiveis.map((g) => (
                      <LinhaDoGrupo
                        key={g.id}
                        grupo={g}
                        aberto={buscando || abertos.has(g.id) || novoEm === g.id}
                        oculto={ocultos.includes(g.id)}
                        ativo={ativo}
                        podeGerenciar={podeGerenciar}
                        podeArrastar={podeArrastar}
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
                </DragDropContext>
```

(O bloco "Sem grupo" logo abaixo, ainda dentro da `<nav>`, fica fora do `DragDropContext` e não muda.)

Logo depois do `</nav>`, antes de `{nadaAchado && (`:

```tsx
              {erroDoArraste && (
                <p role="alert" className="px-4 py-1 text-[11px] text-casca-alerta">
                  {erroDoArraste}
                </p>
              )}
```

- [ ] **Passo 7: Dicionário**

Em `lib/i18n/dicionario.ts`, logo abaixo da linha `"Nenhum funil neste grupo.": { es: "Ningún embudo en este grupo." },`:

```ts
  "Para mover a origem, aperte espaço, use as setas e aperte espaço de novo para soltar. Esc cancela.": {
    en: "To move the source, press space, use the arrow keys and press space again to drop. Esc cancels.",
    es: "Para mover el origen, pulsa espacio, usa las flechas y pulsa espacio otra vez para soltar. Esc cancela.",
  },
```

- [ ] **Passo 8: Rodar o teste novo e os vizinhos**

Rodar:

```bash
corepack pnpm vitest run tests/unit/escale-arrastar-origens.test.tsx tests/unit/escale-mover-origem.test.ts tests/unit/escale-painel-origens.test.tsx tests/unit/escale-pecas-do-painel.test.tsx tests/unit/escale-janelas-de-origens.test.tsx tests/unit/escale-com-origens.test.tsx tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```

Esperado: tudo verde. Se `escale-painel-origens` falhar por causa da alça da biblioteca de verdade (`role="button"` no `<li>` atrapalhando uma busca por papel), ajustar a busca do teste para o nome exato, não o componente. Se o nome do arquivo do guarda de i18n for outro, achar com `ls tests/unit | grep i18n-espanhol`.

- [ ] **Passo 9: Typecheck e lint dos arquivos mexidos**

```bash
corepack pnpm typecheck
corepack pnpm eslint lib/escale/origens/mover.ts hooks/escale/useOrigens.ts components/escale/origens/LinhasDoPainel.tsx components/escale/origens/PainelOrigens.tsx tests/unit/escale-arrastar-origens.test.tsx tests/unit/escale-mover-origem.test.ts
```

Esperado: sem erro.

- [ ] **Passo 10: Ver funcionando no navegador (dev local)**

Subir o app local do jeito de sempre da worktree (`corepack pnpm dev`) e, no Chrome, em Negócios com a casca: arrastar uma origem para cima e para baixo no mesmo grupo, e para outro grupo aberto. Recarregar a página: a ordem continua. Conferir que, sem permissão, na busca e no modo seleção, a linha não arrasta, e que clicar na origem ainda abre o quadro. Se não houver pilha local disponível, esta conferência passa para a Task 5 (produção não, a conferência é no `pnpm dev`; sem pilha, anotar e fazer depois do deploy).

- [ ] **Passo 11: Commit, PR e merge**

```bash
git add hooks/escale/useOrigens.ts components/escale/origens/LinhasDoPainel.tsx components/escale/origens/PainelOrigens.tsx lib/i18n/dicionario.ts tests/unit/escale-arrastar-origens.test.tsx
git commit -m "feat(escale): arrastar origens no painel para mudar a ordem e o grupo"
git push -u escale-crm feat/arrastar-origens
gh pr create --repo rgisjr/escale-crm --base main --head feat/arrastar-origens \
  --title "feat(escale): arrastar origens no painel" \
  --body "$(cat <<'EOF'
Quem gerencia origens arrasta uma origem no painel ORIGENS: muda a ordem no grupo ou leva para outro grupo aberto. Usa as rotas que já existem (`PATCH /api/v1/pipelines/[id]` com `depois_de` e `PUT /api/v1/pipelines/[id]/grupo`). Sem migration.

- Regras puras em `lib/escale/origens/mover.ts` (vizinho de cima na régua da organização, lista otimista).
- `useMoverOrigem` em `hooks/escale/useOrigens.ts`.
- Painel: `DragDropContext`, a lista muda na hora e volta como estava se o servidor recusar.
- Desligado sem permissão, na busca, no modo seleção e durante uma gravação.

Plano: `docs/superpowers/plans/2026-10-27-arrastar-origens-e-marca.md` (Fase A).

## Testes
- [x] `escale-mover-origem`, `escale-arrastar-origens` e os testes do painel
- [x] typecheck e eslint dos arquivos
- [ ] Bateria da frente (unitários completos) antes de publicar

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --repo rgisjr/escale-crm --merge feat/arrastar-origens
```

Esperado: PR mergeado na `main`.

---

### Task 3: Logo + nome no menu de cima

**Arquivos:**
- Modificar: `components/escale/menu/MarcaNoTopo.tsx`
- Teste: `tests/unit/escale-marca-no-topo.test.tsx`

**Interfaces:**
- Consome: `useAuth().activeOrg.marca` (`{ nome?, logoUrl?, logoDarkUrl? }`) e `useMarcaDaInstalacao()` (`{ name, logoUrl, logoDarkUrl? }`), sem mudança.
- Produz: o mesmo `MarcaNoTopo()` sem props.

- [ ] **Passo 0: Branch nova da `main` atualizada**

```bash
git fetch escale-crm
git switch -c feat/marca-escale-os escale-crm/main
```

- [ ] **Passo 1: Escrever o teste que falha**

`tests/unit/escale-marca-no-topo.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const estado = vi.hoisted(() => ({
  org: null as null | { marca?: { nome?: string; logoUrl?: string | null; logoDarkUrl?: string | null } },
  instalacao: { name: "Escale OS", logoUrl: null as string | null, logoDarkUrl: null as string | null, initial: "E" },
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: estado.org }) }));
vi.mock("@/lib/branding/contexto", () => ({ useMarcaDaInstalacao: () => estado.instalacao }));

import { MarcaNoTopo } from "@/components/escale/menu/MarcaNoTopo";

beforeEach(() => {
  estado.org = null;
  estado.instalacao = { name: "Escale OS", logoUrl: null, logoDarkUrl: null, initial: "E" };
});

describe("<MarcaNoTopo>", () => {
  it("sem logo, mostra só o nome", () => {
    render(<MarcaNoTopo />);
    const link = screen.getByRole("link", { name: "Escale OS" });
    expect(link).toHaveTextContent("Escale OS");
    expect(link.querySelector("img")).toBeNull();
  });

  it("com logo, mostra a logo e o nome ao lado", () => {
    estado.instalacao = { ...estado.instalacao, logoUrl: "https://cdn.exemplo/logo.png" };
    render(<MarcaNoTopo />);
    const link = screen.getByRole("link", { name: "Escale OS" });
    expect(link.querySelector("img")).toHaveAttribute("src", "https://cdn.exemplo/logo.png");
    expect(link).toHaveTextContent("Escale OS");
  });

  it("o nome e a logo da organização vencem os da instalação", () => {
    estado.instalacao = { ...estado.instalacao, logoUrl: "https://cdn.exemplo/logo.png" };
    estado.org = { marca: { nome: "Acme", logoUrl: "https://cdn.exemplo/acme.png" } };
    render(<MarcaNoTopo />);
    const link = screen.getByRole("link", { name: "Acme" });
    expect(link.querySelector("img")).toHaveAttribute("src", "https://cdn.exemplo/acme.png");
    expect(link).toHaveTextContent("Acme");
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Rodar: `corepack pnpm vitest run tests/unit/escale-marca-no-topo.test.tsx`
Esperado: o 1º passa; o 2º e o 3º falham em `toHaveTextContent` (hoje, com logo, o nome não aparece).

- [ ] **Passo 3: Implementar**

`components/escale/menu/MarcaNoTopo.tsx`, trocar o comentário da função e o `return`:

```tsx
/**
 * A logo (Configurações › Marca, ou a da instalação em /admin/marca) seguida do
 * nome da marca na cor `--color-escale-marca`, como o "clint" no canto da Clint.
 * Sem logo, fica só o nome. Mesma precedência de `components/shell/Sidebar.tsx`:
 * marca da organização acima da marca da instalação.
 */
```

```tsx
  return (
    <Link href="/app" className="flex shrink-0 items-center gap-2" aria-label={nome}>
      {logo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt=""
            aria-hidden
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
      ) : null}
      <span
        className="max-w-[12rem] truncate text-lg font-bold tracking-tight"
        style={{ color: "var(--color-escale-marca)" }}
      >
        {nome}
      </span>
    </Link>
  );
```

(O `alt` da logo fica vazio porque o nome está escrito ao lado e o link já tem `aria-label`; com `alt={nome}` o leitor de tela diria o nome duas vezes.)

- [ ] **Passo 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-marca-no-topo.test.tsx tests/unit/escale-menu-do-topo-tela.test.tsx
corepack pnpm eslint components/escale/menu/MarcaNoTopo.tsx tests/unit/escale-marca-no-topo.test.tsx
```

Esperado: verde.

- [ ] **Passo 5: Commit, PR e merge**

```bash
git add components/escale/menu/MarcaNoTopo.tsx tests/unit/escale-marca-no-topo.test.tsx
git commit -m "feat(escale): logo e nome lado a lado no menu de cima"
git push -u escale-crm feat/marca-escale-os
gh pr create --repo rgisjr/escale-crm --base main --head feat/marca-escale-os \
  --title "feat(escale): logo e nome lado a lado no menu de cima" \
  --body "$(cat <<'EOF'
O canto esquerdo do menu de cima mostrava a logo OU o nome. Agora mostra a logo seguida do nome, como o "clint" na Clint. Sem logo, segue só o nome. O nome e a logo da aba do navegador vêm da configuração em /admin/marca (sem código).

Plano: `docs/superpowers/plans/2026-10-27-arrastar-origens-e-marca.md` (Fase B).

## Testes
- [x] `escale-marca-no-topo` (novo) e `escale-menu-do-topo-tela`
- [ ] Bateria da frente (unitários completos) antes de publicar

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --repo rgisjr/escale-crm --merge feat/marca-escale-os
```

---

### Task 4: Bateria da frente e revisão

- [ ] **Passo 1: Unitários completos na `main` atualizada, em segundo plano**

```bash
git fetch escale-crm && git switch --detach escale-crm/main
corepack pnpm typecheck
corepack pnpm vitest run > ../repo/.superpowers/sdd/arrastar-unit.log 2>&1
```

O `vitest run` vai em segundo plano (`run_in_background`). Não mexer na worktree enquanto ele roda.

- [ ] **Passo 2: Comparar falhas com a lista conhecida**

```bash
grep -E "FAIL|✗" ../repo/.superpowers/sdd/arrastar-unit.log | sort -u > /tmp/falhas-arrastar.txt
comm -23 /tmp/falhas-arrastar.txt <(sort -u ../repo/.superpowers/sdd/falhas-conhecidas.txt)
```

Esperado: nada novo. Falha nova: corrigir num PR `fix/…` mergeado antes de publicar. Tempo limite em teste lento que passa sozinho não é regressão.

- [ ] **Passo 3: Um revisor para a frente**

Disparar um `code-reviewer` (modelo Opus 5.5, sem passar `model`), com o pedido: revisar `git diff v1.81.0-escale.32..escale-crm/main` (só os dois PRs desta frente); foco em: a conta do `depois_de` bater com a régua da rota `PATCH /api/v1/pipelines/[id]`; o estado otimista e o desfazer; corrida entre dois arrastes; acessibilidade da linha arrastável (o `<li>` ganha `role="button"` da biblioteca com um `<a>` dentro); o `MarcaNoTopo`. Relatório curto: só achados, com gravidade. Critical ou Important aberto: corrigir antes de publicar.

---

### Task 5: Publicar, configurar a marca e conferir

- [ ] **Passo 1: Conferir empate de posição em produção (só leitura)**

```bash
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'bash -s' <<'REMOTO'
cd /root/DeskcommCRM
URL=$(grep '^SUPABASE_DB_URL=' .env | cut -d= -f2- | tr -d "\"'\r")
docker run -i --rm --network host postgres:16-alpine psql "$URL" -At <<'SQL'
select organization_id, position, count(*) from crm_pipelines
where not is_archived group by 1, 2 having count(*) > 1;
select 'instalacao', coalesce(app_name, '(vazio)'), coalesce(logo_path, '(vazio)'), coalesce(favicon_path, '(vazio)') from platform_branding;
select 'org', name, coalesce(settings->'branding'->>'name', '(vazio)') from organizations;
SQL
REMOTO
```

Esperado: a primeira consulta sem linhas. Se houver empate, avisar o usuário: o arrastar daquelas origens vai responder "empatados" até a ordem ser refeita (fora desta frente). As outras duas mostram de onde vem hoje "DeskcommCRM" (instalação vazia) e "EscaleIA" (nome da organização).

- [ ] **Passo 2: Tag e release**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
git fetch escale-crm --tags
git log --oneline v1.81.0-escale.32..escale-crm/main
git diff --name-only v1.81.0-escale.32 escale-crm/main -- supabase/migrations
```

Esperado: só os commits desta frente (e os de correção da bateria) e nenhuma migration. Se aparecer trabalho de outra frente sem bateria, tagear no último commit desta frente, não na ponta.

```bash
git tag -a v1.81.0-escale.33 -m "Arrastar origens no painel; logo e nome no menu de cima" escale-crm/main
git push escale-crm v1.81.0-escale.33
gh release create v1.81.0-escale.33 --repo rgisjr/escale-crm --latest \
  --title "v1.81.0-escale.33" \
  --notes "Arrastar origens no painel ORIGENS (ordem e grupo). Logo e nome lado a lado no menu de cima. Sem migration."
```

Esperar o workflow "Publicar imagem Docker (GHCR)" chegar a `promover-stable: success` (`gh run list --repo rgisjr/escale-crm --limit 3` e `gh run watch <id>` em segundo plano).

- [ ] **Passo 3: Backup e update na VPS**

```bash
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'cd /root/DeskcommCRM && df -h / && bash hostgator-setup-kit/backup.sh'
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'cd /root/DeskcommCRM && nohup bash hostgator-setup-kit/update.sh --to v1.81.0-escale.33 > /root/update-v1.81.0-escale.33.log 2>&1 &'
```

Espaço livre baixo (menos de 10 GB): parar e limpar imagens antigas antes, como em 26/10. Esperar o fim do update numa segunda chamada, sem `pgrep -f "update.sh…"` no mesmo comando remoto (casa consigo mesmo); usar `pgrep -f '[u]pdate.sh'`.

- [ ] **Passo 4: Conferir a produção**

```bash
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'docker ps --format "{{.Names}} {{.Image}} {{.Status}}" | grep -i deskcomm; tail -20 /root/update-v1.81.0-escale.33.log; grep -ci error /root/update-v1.81.0-escale.33.log'
curl -s -o /dev/null -w "%{http_code}\n" https://app.escaleia.com/login
curl -s -o /dev/null -w "%{http_code}\n" https://app.escaleia.com/app
```

Esperado: 3 containers healthy na `1.81.0-escale.33`, `/login` 200, `/app` 307, sem erro no log. Falhou: voltar para a `v1.81.0-escale.32` com `update.sh --to v1.81.0-escale.32` e avisar.

- [ ] **Passo 5: Configurar a marca (escrita em produção pela tela do app; autorizada com a aprovação deste plano)**

No Chrome, logado como o usuário em https://app.escaleia.com:

1. `/admin/marca`:
   - "Nome do sistema": `Escale OS`.
   - Logo (tema claro): subir `C:\Users\regis\Downloads\escale-ia-icone-1024-transparente.png`.
   - Ícone da aba: subir o mesmo arquivo.
   - Não mexer na cor da marca nem no CSS personalizado. Salvar.
2. Configurações › Marca da organização: se o nome estiver `EscaleIA`, apagar o campo (vazio = vale o "Escale OS" da instalação) e salvar. Se a tela não aceitar vazio, gravar `Escale OS`. Não subir logo na organização (a da instalação já vale).

Se `/admin/marca` não abrir (usuário sem acesso de plataforma) ou não tiver o campo do ícone da aba, parar e avisar o usuário, sem procurar outro caminho de escrita.

- [ ] **Passo 6: Conferir a marca e o arrastar**

```bash
curl -s https://app.escaleia.com/login | grep -o "<title>[^<]*</title>\|<link rel=\"icon\"[^>]*>"
```

Esperado: `<title>Entrar · Escale OS</title>` (até 1 min de cache da marca) e o `icon` apontando para o arquivo no storage.

No Chrome:
- A aba mostra "… · Escale OS" com o ícone "AI".
- O canto esquerdo do menu de cima mostra o "AI" seguido de "Escale OS".
- Negócios: arrastar uma origem dentro do grupo e para outro grupo aberto, recarregar e ver a ordem mantida; console sem erro (`read_console_messages`).
- Lado a lado com a Clint: o menu de cima e o painel seguem iguais a 01-010 (só a marca é nossa). Listar por escrito qualquer diferença nova.

- [ ] **Passo 7: Fechar**

- Atualizar o `LOG.md` da pasta Deskcom CRM e a memória `vps-producao-do-crm` com a linha da escale.33.
- Remover a worktree: `git worktree remove ../wt-arrastar`.
- Mensagem curta ao usuário: versão no ar, o que entrou e o que olhar no app (arrastar origens; aba e menu com "Escale OS"). Avisar também que os e-mails do sistema (convite, recuperação de senha) passam a sair com o nome "Escale OS", porque usam a mesma marca da instalação.
