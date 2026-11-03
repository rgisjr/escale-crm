# Arrastar origens: os dois achados Minor da revisão — Plano de implementação

> **Para quem executa:** use `superpowers:executing-plans`, inline, na própria sessão (regra do projeto: nunca trocar para subagent-driven-development). Execução em Sonnet 5.5. Os passos usam caixinhas (`- [ ]`).

**Objetivo:** fechar os dois Minor da revisão da frente "Arrastar origens e marca" antes de ela ser publicada:
- **M1:** quando a origem muda de grupo e só a gravação da posição falha, a tela mostra a origem no grupo novo (onde ela já está no banco) e uma mensagem que diz isso. Hoje a tela volta a origem ao grupo antigo e, logo depois, o `router.refresh()` a faz "pular" para o grupo novo com o erro ainda na tela.
- **M2:** a mensagem de erro do arraste some quando a pessoa abre ou usa a busca e quando entra no modo seleção. Hoje ela só some no próximo arraste.

**Arquitetura:** `useMoverOrigem` já faz duas escritas: `PUT …/grupo` e depois `PATCH` com `depois_de`. Se o `PATCH` falha depois de o `PUT` ter passado, a mutação relê as origens e lança um erro próprio, `PosicaoNaoGravada`, que leva a causa e a lista relida. O painel reconhece esse erro, aplica a lista relida em vez de voltar à de antes e junta à mensagem da rota uma frase nova. Para o M2, o painel limpa `erroDoArraste` nos três pontos em que a pessoa sai do arrastar: o botão da busca, o campo da busca e `selecionar()`.

**Tecnologias:** Next.js (App Router), React, TanStack Query, `@hello-pangea/dnd` 18, Vitest + Testing Library.

## Restrições globais

- Regra pétrea: o plano só roda depois de um "pode fazer" do usuário. Aprovado, a entrega vai até produção sem pedir de novo (CLAUDE.md, "A entrega até produção é do Claude").
- **Entra na frente "Arrastar origens e marca"**, ainda não publicada: é mais um PR dela, mergeado antes da publicação (`v1.81.0-escale.33`). A bateria da frente (unitários completos) roda **depois** deste PR. Se a bateria que já estava rodando terminar antes, ela não vale para publicar: roda de novo, uma vez, com este PR dentro.
- Sem migration: `test:db` e `test:db:update` não são exigidos.
- Toda frase nova em `t()` precisa de linha no `lib/i18n/dicionario.ts` **só com `es`**. O tipo do dicionário é `Partial<Record<"es", string>>`, e uma linha `en` reprova no typecheck. Sem a linha, o guarda `tests/unit/i18n-espanhol-cobre-a-tela.test.ts` reprova.
- A Clint não tem esse arrastar, então a frase nova é nossa. Mantenha o tom das mensagens do painel: curta, sem jargão.
- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm` (o `pnpm` não está no PATH).
- O `typecheck` estoura a memória com o heap padrão: rodar com `NODE_OPTIONS=--max-old-space-size=8192`. O erro em `tests/unit/escale-fila-da-casca.test.tsx(67)` já existe na `main` e não é desta frente.
- PR vai para `rgisjr/escale-crm`, base `main`. Nunca push em `origin` (Rafael).

## Fora deste plano

- Fazer a mensagem sumir sozinha por tempo, ou ter um "×" para fechar. A revisão só pediu que ela não fique presa na busca e no modo seleção.
- Desfazer a troca de grupo quando a posição falha (um `PUT` de volta). Seria uma terceira escrita que também pode falhar. Mostrar a verdade do banco é mais simples e não mente.

## Mapa dos arquivos

| Arquivo | O que muda |
|---|---|
| `lib/escale/origens/mover.ts` | A classe `PosicaoNaoGravada` (erro com `causa` e `origens`). |
| `hooks/escale/useOrigens.ts` | `useMoverOrigem` lança `PosicaoNaoGravada` quando o `PATCH` falha depois do `PUT`. |
| `components/escale/origens/PainelOrigens.tsx` | `aoSoltar` trata `PosicaoNaoGravada`; `erroDoArraste` é limpo na busca e em `selecionar()`. |
| `lib/i18n/dicionario.ts` | A frase nova, em `es`. |
| `tests/unit/escale-arrastar-origens.test.tsx` | `renderizar` devolve o `user`; três testes novos. |

---

### Task 1: M1 — falha da posição depois da troca de grupo

**Arquivos:**
- Modificar: `lib/escale/origens/mover.ts` (classe nova no fim)
- Modificar: `hooks/escale/useOrigens.ts` (`useMoverOrigem` e um import)
- Modificar: `components/escale/origens/PainelOrigens.tsx` (`aoSoltar` e um import)
- Modificar: `lib/i18n/dicionario.ts` (uma linha)
- Teste: `tests/unit/escale-arrastar-origens.test.tsx`

**Interfaces:**
- Consome: `MovimentoDeOrigem`, `moverNaLista`, `movimentoDoArraste` (`lib/escale/origens/mover.ts`) e `textoDoErro(e: unknown, t)` (`components/escale/origens/texto-do-erro.ts`), todos já existentes.
- Produz: `class PosicaoNaoGravada extends Error { readonly causa: unknown; readonly origens: Origens }`, exportada de `lib/escale/origens/mover.ts`.

- [ ] **Passo 0: Worktree e branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
git fetch escale-crm
git worktree add ../wt-arrastar-minors -b fix/arrastar-origens-minors escale-crm/main
cd ../wt-arrastar-minors
export PATH="/c/Program Files/nodejs:$PATH"
corepack pnpm install --frozen-lockfile
cp ../repo/docs/superpowers/plans/2026-10-27-arrastar-origens-minors.md docs/superpowers/plans/
```

Esperado: `node_modules` instalado e plano copiado. A `main` já tem os PRs #115, #116 e #117. Daqui em diante, todos os comandos rodam em `wt-arrastar-minors`.

- [ ] **Passo 1: `renderizar` devolve o `user`**

Em `tests/unit/escale-arrastar-origens.test.tsx`, no fim da função `renderizar`, depois do `await user.click(screen.getByRole("button", { name: "Abrir Credenciados" }));`, acrescentar:

```tsx
  return user;
```

Os testes que já existem ignoram o retorno e não mudam.

- [ ] **Passo 2: Escrever o teste que falha**

No mesmo arquivo, dentro do `describe("<PainelOrigens> — arrastar origens", …)`, logo depois do teste `"se a gravação falha, a origem volta ao lugar e a mensagem aparece"`:

```tsx
  it("se o grupo trocou e só a posição falhou, a origem fica no grupo novo e a mensagem diz isso", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: ORIGENS });
    vi.mocked(apiClient.patch).mockRejectedValue(new Error("Os funis desta lista estão empatados na ordenação."));
    // O banco depois do PUT: a Nayara já está em INSS de obras, na posição de sempre (logo depois da f-leads).
    vi.mocked(apiClient.get).mockResolvedValue({
      data: moverNaLista(ORIGENS, { id: "f-nayara", grupoNovo: G_OBRAS, depoisDe: "f-leads" }),
    });
    await renderizar();

    await soltar("f-nayara", [G_CRED, 0], [G_OBRAS, 0]);

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("empatados na ordenação");
    expect(alerta).toHaveTextContent("A origem já está no grupo novo; só a posição não foi gravada.");
    expect(nomes()).toEqual(["Turma 12", "Leads INSS WhatsApp", "Funil Nayara"]);
  });
```

- [ ] **Passo 3: Rodar e ver falhar**

Rodar: `corepack pnpm vitest run tests/unit/escale-arrastar-origens.test.tsx`
Esperado: o teste novo falha em `toHaveTextContent("A origem já está no grupo novo…")`, porque hoje a mensagem só tem o texto da rota. Os outros passam.

- [ ] **Passo 4: A classe `PosicaoNaoGravada`**

No fim de `lib/escale/origens/mover.ts`:

```ts
/**
 * Arrastar para outro grupo são duas escritas (grupo, depois posição). Quando só a
 * segunda falha, a origem JÁ está no grupo novo no banco: `origens` é a lista relida
 * de lá, para a tela não voltar a origem a um grupo onde ela não está mais.
 */
export class PosicaoNaoGravada extends Error {
  constructor(
    public readonly causa: unknown,
    public readonly origens: Origens,
  ) {
    super(causa instanceof Error ? causa.message : "posição não gravada");
    this.name = "PosicaoNaoGravada";
  }
}
```

(O `Origens` já está importado no topo do arquivo, junto com `montarOrigens` e `FunilDaOrigem`.)

- [ ] **Passo 5: `useMoverOrigem` lança o erro novo**

Em `hooks/escale/useOrigens.ts`, trocar o import do tipo:

```ts
import type { MovimentoDeOrigem } from "@/lib/escale/origens/mover";
```

por:

```ts
import { PosicaoNaoGravada, type MovimentoDeOrigem } from "@/lib/escale/origens/mover";
```

E trocar o `useMoverOrigem` inteiro, comentário incluído, por:

```ts
/**
 * Arrastar no painel: troca o grupo (só se mudou) e depois grava a posição pelo
 * `depois_de` da rota do original. Nessa ordem porque a régua da posição é a da
 * organização inteira, e o grupo só decide em que lista a origem aparece. Se a
 * posição falhar depois de o grupo ter trocado, relê e lança `PosicaoNaoGravada`
 * com a lista do banco; se nem a releitura vier, lança o erro da posição.
 */
export function useMoverOrigem() {
  const onSettled = useAoTerminar();
  return useMutation({
    mutationFn: async ({ id, grupoNovo, depoisDe }: MovimentoDeOrigem) => {
      if (!grupoNovo) {
        await apiClient.patch(doFunil(id), { depois_de: depoisDe });
        return reler();
      }
      await apiClient.put(grupoDoFunil(id), { group_id: grupoNovo });
      try {
        await apiClient.patch(doFunil(id), { depois_de: depoisDe });
      } catch (causa) {
        const relidas = await reler().catch(() => null);
        throw relidas ? new PosicaoNaoGravada(causa, relidas) : causa;
      }
      return reler();
    },
    onSettled,
  });
}
```

- [ ] **Passo 6: O painel trata o erro novo**

Em `components/escale/origens/PainelOrigens.tsx`, trocar o import:

```ts
import { moverNaLista, movimentoDoArraste } from "@/lib/escale/origens/mover";
```

por:

```ts
import { moverNaLista, movimentoDoArraste, PosicaoNaoGravada } from "@/lib/escale/origens/mover";
```

Em `aoSoltar`, trocar o comentário da função e o `onError`:

```ts
  /**
   * Soltou: a lista muda na hora; se o servidor recusar, volta como estava e diz por quê.
   * Se o grupo trocou e só a posição falhou, fica a lista do banco (a origem no grupo novo).
   */
  function aoSoltar(r: DropResult) {
```

```ts
    moverOrigem.mutate(movimento, {
      onSuccess: setOrigens,
      onError: (err) => {
        if (err instanceof PosicaoNaoGravada) {
          setOrigens(err.origens);
          setErroDoArraste(
            `${textoDoErro(err.causa, t)} ${t("A origem já está no grupo novo; só a posição não foi gravada.")}`,
          );
          return;
        }
        setOrigens(antes);
        setErroDoArraste(textoDoErro(err, t));
      },
    });
```

- [ ] **Passo 7: Dicionário**

Em `lib/i18n/dicionario.ts`, logo abaixo do bloco `"Para mover a origem, aperte espaço, use as setas e aperte espaço de novo para soltar. Esc cancela.": { … },`:

```ts
  "A origem já está no grupo novo; só a posição não foi gravada.": {
    es: "El origen ya está en el grupo nuevo; solo no se guardó la posición.",
  },
```

- [ ] **Passo 8: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-arrastar-origens.test.tsx tests/unit/escale-mover-origem.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```

Esperado: tudo verde. Os testes antigos `"levar para outro grupo troca o grupo antes de gravar a posição"` e `"se a gravação falha, a origem volta ao lugar…"` continuam passando: o primeiro não tem falha, e o segundo não troca de grupo, então segue pelo caminho de voltar a `antes`.

- [ ] **Passo 9: Commit**

```bash
git add lib/escale/origens/mover.ts hooks/escale/useOrigens.ts components/escale/origens/PainelOrigens.tsx lib/i18n/dicionario.ts tests/unit/escale-arrastar-origens.test.tsx docs/superpowers/plans/2026-10-27-arrastar-origens-minors.md
git commit -m "fix(escale): origem fica no grupo novo quando só a posição falha"
```

---

### Task 2: M2 — a mensagem do arraste some na busca e no modo seleção

**Arquivos:**
- Modificar: `components/escale/origens/PainelOrigens.tsx` (botão da busca, campo da busca, `selecionar`)
- Teste: `tests/unit/escale-arrastar-origens.test.tsx`

**Interfaces:**
- Consome: `erroDoArraste` / `setErroDoArraste` (estado que já existe no `PainelOrigens`) e `renderizar()` devolvendo o `user` (Task 1, Passo 1).
- Produz: nada novo para fora.

- [ ] **Passo 1: Escrever os testes que falham**

Em `tests/unit/escale-arrastar-origens.test.tsx`, dentro do mesmo `describe`, depois do teste novo da Task 1:

```tsx
  it("a mensagem do arraste some ao abrir a busca", async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(new Error("Os funis desta lista estão empatados na ordenação."));
    const user = await renderizar();
    await soltar("f-turma", [G_CRED, 1], [G_CRED, 0]);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Buscar grupo ou funil" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("a mensagem do arraste some ao entrar no modo seleção", async () => {
    vi.mocked(apiClient.patch).mockRejectedValue(new Error("Os funis desta lista estão empatados na ordenação."));
    const user = await renderizar();
    await soltar("f-turma", [G_CRED, 1], [G_CRED, 0]);
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mais ações de Credenciados" }));
    await user.click(await screen.findByRole("menuitem", { name: "Selecionar origens" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
```

- [ ] **Passo 2: Rodar e ver falhar**

Rodar: `corepack pnpm vitest run tests/unit/escale-arrastar-origens.test.tsx`
Esperado: os dois testes novos falham em `not.toBeInTheDocument()`, porque o alerta continua. Se o segundo falhar antes, ao achar o menu, conferir como `tests/unit/escale-painel-origens.test.tsx:153-163` abre o "Selecionar origens" e usar o mesmo jeito. Não mude o componente para o teste passar.

- [ ] **Passo 3: Limpar a mensagem nos três pontos**

Em `components/escale/origens/PainelOrigens.tsx`:

1. Em `selecionar`, logo abaixo de `setErroDaSelecao(null);`:

```ts
    setErroDoArraste(null);
```

2. No `onClick` do botão `aria-label={t("Buscar grupo ou funil")}` (o da lupa), trocar:

```tsx
              onClick={() => {
                setBuscaAberta((v) => !v);
                setBusca("");
              }}
```

por:

```tsx
              onClick={() => {
                setBuscaAberta((v) => !v);
                setBusca("");
                setErroDoArraste(null);
              }}
```

3. No `onChange` do `<input>` da busca, trocar:

```tsx
                onChange={(e) => setBusca(e.target.value)}
```

por:

```tsx
                onChange={(e) => {
                  setBusca(e.target.value);
                  setErroDoArraste(null);
                }}
```

- [ ] **Passo 4: Rodar o arquivo e os vizinhos**

```bash
corepack pnpm vitest run tests/unit/escale-arrastar-origens.test.tsx tests/unit/escale-mover-origem.test.ts tests/unit/escale-painel-origens.test.tsx tests/unit/escale-pecas-do-painel.test.tsx tests/unit/escale-janelas-de-origens.test.tsx tests/unit/escale-com-origens.test.tsx tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```

Esperado: tudo verde.

- [ ] **Passo 5: Typecheck e lint dos arquivos mexidos**

```bash
NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm typecheck
corepack pnpm eslint lib/escale/origens/mover.ts hooks/escale/useOrigens.ts components/escale/origens/PainelOrigens.tsx tests/unit/escale-arrastar-origens.test.tsx
```

Esperado: o eslint sem erro. O typecheck só com o erro que já existe em `tests/unit/escale-fila-da-casca.test.tsx(67)`; qualquer outro é desta mudança e se corrige.

- [ ] **Passo 6: Commit, PR e merge**

```bash
git add components/escale/origens/PainelOrigens.tsx tests/unit/escale-arrastar-origens.test.tsx
git commit -m "fix(escale): mensagem do arraste some na busca e no modo seleção"
git push -u escale-crm fix/arrastar-origens-minors
gh pr create --repo rgisjr/escale-crm --base main --head fix/arrastar-origens-minors \
  --title "fix(escale): arrastar origens — os dois Minor da revisão" \
  --body "$(cat <<'EOF'
Os dois achados Minor da revisão da frente "Arrastar origens e marca":

- **M1:** quando a origem muda de grupo e só a gravação da posição falha, a tela mostra a lista relida do banco (a origem já no grupo novo) e a mensagem diz "A origem já está no grupo novo; só a posição não foi gravada." Antes, a tela voltava a origem ao grupo antigo e o refresh a fazia pular de volta, com o erro ainda na tela. O erro novo é `PosicaoNaoGravada` em `lib/escale/origens/mover.ts`.
- **M2:** a mensagem de erro do arraste some ao abrir ou usar a busca e ao entrar no modo seleção.

Plano: `docs/superpowers/plans/2026-10-27-arrastar-origens-minors.md`.

## Testes
- [x] `escale-arrastar-origens` (três testes novos) e os testes do painel
- [x] typecheck e eslint dos arquivos
- [ ] Bateria da frente (unitários completos) antes de publicar

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --repo rgisjr/escale-crm --merge fix/arrastar-origens-minors
```

Esperado: PR mergeado na `main`.

- [ ] **Passo 7: Voltar à frente**

- Remover a worktree: `cd ../repo && git worktree remove ../wt-arrastar-minors`.
- Seguir o plano `docs/superpowers/plans/2026-10-27-arrastar-origens-e-marca.md` a partir da **Task 4** (bateria completa na `main` atualizada, que agora inclui este PR). Depois vem a Task 5 (publicar a `v1.81.0-escale.33`, configurar a marca e conferir). Este PR não precisa de revisor próprio: são duas correções pequenas e cobertas por teste, e a frente já teve o seu revisor.
