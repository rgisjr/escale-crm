# Respostas rápidas no "/" do compositor — Plano de correção

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, decisão do usuário de 18/10) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao digitar "/" no compositor de uma conversa, o painel "Respostas rápidas" volta a listar as respostas cadastradas (relato: empresa OnPlay, 03/11/2026).

**Architecture:** A rota `GET /api/v1/respostas-rapidas/da-conversa` pede `channel_sessions ( provider, social_platform )`, mas `channel_sessions` não tem a coluna `social_platform`: o dado fica em `metadata`. O PostgREST devolve erro, a rota ignora o `error`, lê `data: null` e responde 404 "Conversa não encontrada". O painel fica vazio para **todas as empresas**, desde a Fase 3C (commit `c9a29aa00`, 19/10). A correção lê o campo como a lista de conversas já faz (`social_platform:metadata->>social_platform`, em `app/api/v1/conversations/_handler.ts:96`) e passa a tratar o erro da consulta como 500, em vez de mascará-lo como 404.

**Tech Stack:** Next.js (route handler), Supabase/PostgREST, Vitest, corepack pnpm.

## Global Constraints

- REGRA PÉTREA: execução só depois do "pode fazer" do usuário para ESTE plano.
- Depois de autorizada, a entrega até produção é do Claude (CLAUDE.md, 18/10): PR em `escale-crm/main`, merge, tag `vX.Y.Z-escale.N`, release, esperar `promover-stable`, `backup.sh`, `update.sh --to <tag>` e conferência.
- Nunca push em `origin` (Rafael). Remoto certo: `escale-crm`. Usar `corepack pnpm`.
- Sem migration, sem mudança de tela: é um hotfix fora de frente. Não se aplica a bateria completa; roda o teste da rota, a cerca de colunas, typecheck e eslint dos arquivos tocados.
- Commits com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Validado por leitura (03/11): as 30 respostas da OnPlay estão compartilhadas, com `canais = {whatsapp}` e `todos_os_setores = true`. O número da OnPlay é `waha` (WhatsApp). O `Row` de `channel_sessions` em `lib/database.types.ts` tem `metadata` e `provider`, e não tem `social_platform`.

---

## Arquivos

- Modify: `app/api/v1/respostas-rapidas/da-conversa/route.ts` (o select da conversa e o tratamento do erro, linhas 28–36)
- Modify (test): `tests/unit/escale-respostas-rapidas-rotas.test.ts` (dois testes novos em `describe("as da conversa")`)

Mais nada muda: `canalDaConversa` e o tipo `{ provider, social_platform }` continuam iguais, porque o apelido `social_platform:` devolve o mesmo formato.

---

### Task 0: Worktree a partir da main do fork

- [ ] **Step 1: Criar a worktree**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
git fetch escale-crm
git worktree add "../wt-respostas-barra" -b fix/respostas-rapidas-no-compositor escale-crm/main
cd "../wt-respostas-barra"
corepack pnpm install --frozen-lockfile > ../wt-respostas-barra-install.log 2>&1
```

Expected: worktree em `fix/respostas-rapidas-no-compositor`, install sem erro.

- [ ] **Step 2: Copiar este plano para a worktree**

```bash
cp "../repo/docs/superpowers/plans/2026-11-03-respostas-rapidas-no-compositor.md" docs/superpowers/plans/
```

---

### Task 1: A rota lê `social_platform` de `metadata` e não esconde erro do banco

**Files:**
- Modify: `app/api/v1/respostas-rapidas/da-conversa/route.ts:28-36`
- Test: `tests/unit/escale-respostas-rapidas-rotas.test.ts`

**Interfaces:**
- Consumes: `usar()`, `req()`, `CV`, `ORG_ID`, `tpl()` já existentes no arquivo de teste; `bancoPorTabela` devolve `{ db: { from, rpc }, escritas }`, e `from` é `vi.fn`.
- Produces: nada novo. A resposta da rota continua `{ respostas, setorDaConversa, podeOutrosSetores }`.

- [ ] **Step 1: Escrever os testes que falham**

No topo de `tests/unit/escale-respostas-rapidas-rotas.test.ts`, junto dos imports:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
```

Logo depois das constantes (`OUTRO`, `tpl`):

```ts
/** As colunas do `Row` de uma tabela em `lib/database.types.ts` (o mesmo jeito da cerca `variaveis-colunas-existem`). */
function colunasDoRow(tabela: string): Set<string> {
  const tipos = readFileSync(join(process.cwd(), "lib/database.types.ts"), "utf8");
  const inicio = tipos.indexOf(`\n      ${tabela}: {\n        Row: {`);
  if (inicio < 0) throw new Error(`tabela ${tabela} fora de database.types.ts`);
  const fim = tipos.indexOf("\n        }", inicio + 10);
  return new Set([...tipos.slice(inicio, fim).matchAll(/^\s{10}(\w+)\??:/gm)].map((m) => m[1]!));
}
const conversaWaha = {
  id: CV,
  organization_id: ORG_ID,
  channel_session_id: "cs",
  channel_sessions: { provider: "waha", social_platform: null },
};
```

No fim de `describe("as da conversa", () => { ... })`, antes do `});` que fecha o describe:

```ts
  it("o embed de channel_sessions só pede colunas que existem (social_platform vem de metadata)", async () => {
    const { sessao } = usar({
      conversations: [conversaWaha],
      crm_setor_da_conversa: [],
      crm_setor_do_dispositivo: [],
      message_templates: [tpl({ owner_user_id: null })],
      crm_respostas_rapidas_extras: [],
      crm_respostas_rapidas_setores: [],
    });
    const r = await DA_CONVERSA(req("GET", `http://x?conversation_id=${CV}`));
    expect(r.status).toBe(200);
    const from = sessao.db.from;
    const i = from.mock.calls.findIndex(([t]) => t === "conversations");
    const cadeia = from.mock.results[i]!.value as { select: { mock: { calls: unknown[][] } } };
    const select = String(cadeia.select.mock.calls[0]![0]);
    const embed = /channel_sessions:channel_session_id\s*\(([^)]*)\)/.exec(select)?.[1] ?? "";
    const colunas = embed
      .split(",")
      .map((c) => c.trim().split(":").pop()!.split("->")[0]!.trim())
      .filter(Boolean);
    expect(colunas).toEqual(expect.arrayContaining(["provider", "metadata"]));
    const existentes = colunasDoRow("channel_sessions");
    expect(colunas.filter((c) => !existentes.has(c))).toEqual([]);
  });

  it("erro do banco ao ler a conversa vira 500, não 'Conversa não encontrada'", async () => {
    const { sessao } = usar({
      conversations: [conversaWaha],
      message_templates: [],
    });
    const original = sessao.db.from.getMockImplementation()!;
    sessao.db.from.mockImplementation((tabela: string) => {
      const cadeia = original(tabela) as Record<string, unknown>;
      if (tabela === "conversations") {
        cadeia.maybeSingle = vi.fn(async () => ({
          data: null,
          error: { code: "42703", message: "column channel_sessions_1.social_platform does not exist" },
        }));
      }
      return cadeia as never;
    });
    const r = await DA_CONVERSA(req("GET", `http://x?conversation_id=${CV}`));
    expect(r.status).toBe(500);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-respostas-rapidas-rotas.test.ts
```

Expected: FAIL nos dois testes novos. O primeiro acusa `["social_platform"]` em vez de `[]` e não acha `metadata`. O segundo recebe 404 em vez de 500. Os testes antigos continuam passando.

- [ ] **Step 3: Corrigir a rota**

Em `app/api/v1/respostas-rapidas/da-conversa/route.ts`, trocar:

```ts
    const { data: conversa } = await supabase
      .from("conversations")
      .select(
        "id, channel_session_id, assigned_to_user_id, channel_sessions:channel_session_id ( provider, social_platform )",
      )
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversationId)
      .maybeSingle();
    if (!conversa) return fail("not_found", "Conversa não encontrada.", 404, { requestId });
```

por:

```ts
    // `channel_sessions` não tem coluna `social_platform`: a rede social fica em `metadata` (igual a /conversations).
    const { data: conversa, error: erroDaConversa } = await supabase
      .from("conversations")
      .select(
        "id, channel_session_id, assigned_to_user_id, channel_sessions:channel_session_id ( provider, social_platform:metadata->>social_platform )",
      )
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversationId)
      .maybeSingle();
    if (erroDaConversa) throw new Error(erroDaConversa.message);
    if (!conversa) return fail("not_found", "Conversa não encontrada.", 404, { requestId });
```

O `throw` cai no `catch` que já existe na rota e responde `fail("internal_error", ..., 500)`.

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-respostas-rapidas-rotas.test.ts tests/unit/escale-compositor-da-casca.test.tsx tests/unit/respostas-da-conversa-com-variaveis.test.ts
```

Expected: PASS em tudo.

- [ ] **Step 5: Typecheck e eslint dos arquivos tocados**

```bash
corepack pnpm typecheck
corepack pnpm eslint app/api/v1/respostas-rapidas/da-conversa/route.ts tests/unit/escale-respostas-rapidas-rotas.test.ts
```

Expected: sem erro novo.

- [ ] **Step 6: Varrer o mesmo erro em outras rotas (só leitura)**

```bash
git grep -n "social_platform )" -- app lib
git grep -nE "channel_sessions[^(]*\([^)]*\bsocial_platform\b" -- app lib | grep -v "metadata->>"
```

Expected: nenhuma linha. Se aparecer alguma, parar e avisar o usuário antes de mexer, porque isso muda o escopo.

- [ ] **Step 7: Commit**

```bash
git add app/api/v1/respostas-rapidas/da-conversa/route.ts tests/unit/escale-respostas-rapidas-rotas.test.ts docs/superpowers/plans/2026-11-03-respostas-rapidas-no-compositor.md
git commit -m "fix: respostas rápidas voltam a aparecer no / do compositor

A rota da-conversa pedia channel_sessions.social_platform, coluna que não
existe (o dado fica em metadata). O PostgREST falhava, a rota ignorava o
erro e respondia 404, e o painel ficava vazio em todas as empresas desde
a Fase 3C. Agora lê metadata->>social_platform e erro do banco vira 500.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: PR, merge e publicação

Revisor: pelo `code-review.md` é dispensável (correção de um arquivo, sem migration, RLS ou auth). Basta a autorrevisão do diff.

- [ ] **Step 1: Autorrevisão do diff**

```bash
git diff escale-crm/main...HEAD
```

Conferir: só os dois arquivos e o plano; nenhum `console.log`; o 404 continua valendo para conversa de outra org (o filtro `organization_id` não mudou).

- [ ] **Step 2: PR e merge**

```bash
git push -u escale-crm fix/respostas-rapidas-no-compositor
gh pr create --repo rgisjr/escale-crm --base main --title "fix: respostas rápidas no / do compositor" --body "$(cat <<'EOF'
## O que estava errado
Digitar "/" na conversa abria o painel "Respostas rápidas" vazio em todas as empresas (relato: OnPlay). A rota `GET /api/v1/respostas-rapidas/da-conversa` pedia `channel_sessions.social_platform`, que não existe; o PostgREST falhava, a rota ignorava o erro e respondia 404. Bug desde a Fase 3C (c9a29aa00), escondido pelo banco falso dos testes.

## O que muda
- Lê `social_platform:metadata->>social_platform`, como `/api/v1/conversations`.
- Erro do banco ao ler a conversa vira 500 (antes virava "Conversa não encontrada").
- Teste que confere as colunas do embed contra `lib/database.types.ts` e teste do 500.

## Teste
- [x] `vitest run tests/unit/escale-respostas-rapidas-rotas.test.ts` (+ compositor e variáveis)
- [x] typecheck e eslint dos arquivos tocados
- [ ] Produção: conversa da OnPlay, digitar "/", as respostas aparecem

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --repo rgisjr/escale-crm --merge
```

- [ ] **Step 3: Conferir a base antes de tagear**

```bash
git fetch escale-crm --tags
ULTIMA=$(git tag -l "v*-escale.*" --sort=-v:refname | head -1); echo "$ULTIMA"
git log --oneline "$ULTIMA"..escale-crm/main
git diff --name-only "$ULTIMA"..escale-crm/main -- supabase/migrations
```

Expected: entre a última tag e a main, só este PR. Se houver commit de outra frente ainda não testado, ou migration nova, tagear no commit do merge deste PR sobre a última tag (lição da escale.17 e da escale.36) e avisar.

- [ ] **Step 4: Tag e release**

Próximo número = última `escale.N` + 1 (hoje a última publicada é a `v1.81.0-escale.47`, então seria a `v1.81.0-escale.48`; confirmar no Step 3).

```bash
git tag -a v1.81.0-escale.48 <commit> -m "v1.81.0-escale.48: respostas rápidas no / do compositor"
git push escale-crm v1.81.0-escale.48
gh release create v1.81.0-escale.48 --repo rgisjr/escale-crm --latest --title "v1.81.0-escale.48" --notes "Respostas rápidas voltam a aparecer ao digitar / na conversa (rota da-conversa lia coluna inexistente). Sem migration."
```

Esperar o workflow "Publicar imagem Docker (GHCR)" até `promover-stable: success`, num loop `gh run view` em segundo plano.

- [ ] **Step 5: Backup e update na VPS**

```bash
ssh -i ~/.ssh/vps_deskcomm root@76.13.228.29 'df -h / | tail -1; cd /root/DeskcommCRM && bash hostgator-setup-kit/backup.sh'
ssh -i ~/.ssh/vps_deskcomm root@76.13.228.29 'cd /root/DeskcommCRM && nohup bash hostgator-setup-kit/update.sh --to v1.81.0-escale.48 > /root/update-v1.81.0-escale.48.log 2>&1 &'
```

Esperar numa chamada separada com `pgrep -f "[u]pdate.sh"` até acabar, e ler o fim do log.

- [ ] **Step 6: Conferir a produção**

```bash
ssh -i ~/.ssh/vps_deskcomm root@76.13.228.29 'docker ps --format "{{.Names}} {{.Status}} {{.Image}}" | grep -i deskcomm; curl -s -o /dev/null -w "/login %{http_code}\n" https://app.escaleia.com/login; curl -s -o /dev/null -w "/app %{http_code}\n" https://app.escaleia.com/app'
```

Expected: 3 containers healthy na `1.81.0-escale.48`, `/login 200`, `/app 307`, sem erro no log do update.

Depois, no Chrome (aba nova): abrir uma conversa da OnPlay em `/app/inbox`, digitar "/" e conferir que o painel lista as respostas em "Gerais" (ex.: `/ANDROID1`, `/BV2`, `/Cartão`). Conferir também que, na aba de rede, `GET /api/v1/respostas-rapidas/da-conversa` dá 200. Não clicar em nenhuma resposta e não enviar nada.

Se a conferência falhar: `update.sh --to v1.81.0-escale.47`, voltar o git da VPS para a tag anterior e avisar.

- [ ] **Step 7: Fechar**

Remover a worktree (`git worktree remove ../wt-respostas-barra`), anotar a versão na memória `vps-producao-do-crm.md` e mandar ao usuário a mensagem curta: versão no ar, o que entrou e o que olhar no app.
