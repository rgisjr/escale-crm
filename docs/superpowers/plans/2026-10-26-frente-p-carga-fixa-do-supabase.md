# Frente P — Carga fixa do Supabase e toast só em ação do usuário · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (inline, sem subagent-driven-development). Steps use checkbox (`- [ ]`) syntax for tracking.

> **Frente P**, worktree `wt-p`, branch `feat/frente-p-carga-fixa` (criada a partir de `escale-crm/main` em `c933a8597`, v1.81.0-escale.31). **Sem migration.** Quatro fases, **um PR por fase**, mergeados em sequência na `main`; bateria uma vez no fim; uma tag/release (`v1.81.0-escale.32`); backup + update na VPS; conferência.
> Executor: Sonnet 5.5. Revisão da frente: **um** revisor Opus 5.5 (P1 toca auth: incluir o olhar de segurança).

## 1. Por que esta frente existe (evidência de 26/10/2026)

O app mostra "Erro inesperado. Tente novamente." e demora a carregar o Atendimento sem ninguém fazer nada. Causa medida (não é código, nem VPS, nem rede):

- O projeto Supabase `jsrzgxyioczdgwiklkrc` está no plano **Free**: servidor com **426 MB de RAM**, **522+ MB de swap em uso**, 61.700 s parado por disco e 22.100 s por memória em 17 dias, 5,5 TB lidos do disco para um banco de 80 MB.
- Quando o app dispara uma rajada (abrir o Atendimento = 470 a 1.339 chamadas/min), a consulta `select id from conversations limit 1` medida da VPS levou **30 s, 13 s, 25 s**; o PostgREST esgota o pool (`PGRST003`) e devolve 504. Passada a rajada, 0,14 s.
- Já acontecia todos os dias (edge_logs 19–26/10: 207 a 4.357 chamadas ≥ 5 s por dia; 517 erros 5xx em 21/10). Volume estável: 64k–106k chamadas/dia.
- Dessas, **55k–65k/dia são carga fixa**, com ou sem gente usando:

| Fonte | Chamadas/dia | Onde |
|---|---|---|
| 11 crons **todo minuto** no scheduler, 1–3 consultas cada | ~25–35k | `docker/scheduler/entrypoint.sh` (bloco `CRONS=`) |
| Laço do worker conferindo `event_log` a cada **10 s** ocioso (2 consultas por volta) | ~17k | `lib/agent-engine/env.ts` (`EVENT_LOG_DRAIN_IDLE_INTERVAL_MS`) |
| `supabase.auth.getUser()` indo ao GoTrue (`/auth/v1/user`) em **toda** rota autenticada | ~10–14k | `lib/auth/server.ts` (`loadAuthUser`) + rotas que chamam `getUser()` direto |

Agravantes:
- `apiClient` **repete 3×** todo GET que estoura os 10 s (`lib/api/client.ts`, `MAX_ATTEMPTS = 3`): triplica a carga exatamente no travamento e prende o usuário 30 s.
- O toast sai de 7 hooks de **consulta** que chamam `showApiError` dentro do `queryFn`; por isso dispara em atualização automática.

**O que esta frente NÃO faz:** não troca a máquina (decisão de custo do usuário; o Pro vem com 1 GB). Reduz a carga fixa em ~40% e a frequência dos travamentos; não os elimina.

## 2. Decisões do usuário (26/10)

| # | Decisão | Onde vale |
|---|---|---|
| D1 | Fazer os itens 2 (carga fixa) e 3 (toast); não subir para o Pro agora | toda a frente |
| D2 | P1b (cache em memória de 30 s de `platform_admins`/`user_organizations`/`fn_user_role_in_org`) **fica de fora** | — |
| D3 | Execução no Sonnet 5.5; revisão em Opus 5.5 | processo |

## 3. Regras de execução

- Durante a execução: só o teste que a task cria/toca + `pnpm typecheck` + `pnpm eslint` dos arquivos alterados. Nada de `test:db` nem rodada cheia.
- Conventional commits, em português, no estilo do repo (`fix(escale): …`, `perf(auth): …`). PR por fase, merge direto na `main` ao terminar.
- Comentários no código seguem a densidade e o tom do arquivo tocado (o repo explica o "porquê" em prosa). Não apagar os comentários históricos; acrescentar o novo motivo.
- Usar `corepack pnpm`.

---

## P1 — Autenticar sem ir ao GoTrue (`getClaims` no lugar de `getUser`)

**Objetivo:** zerar as ~10–14k chamadas/dia a `/auth/v1/user`. O projeto usa **chave assimétrica ES256** (JWKS em `https://jsrzgxyioczdgwiklkrc.supabase.co/auth/v1/.well-known/jwks.json`); `@supabase/auth-js` 2.117.3 (`node_modules/.pnpm/@supabase+auth-js@2.117.3`) tem `getClaims()` com cache de JWKS por processo, então a validação é local (assinatura + `exp`), sem rede depois da primeira busca da chave.

**Risco aceito:** sessão revogada no GoTrue continua válida até o token expirar (≤ 1 h, prazo padrão do access token). É o comportamento que o próprio Supabase recomenda para servidores. Escrever isso no comentário do código.

### Task P1.1 — Helper `usuarioDoToken`

- [ ] Criar `lib/auth/claims.ts` exportando:
  ```ts
  export interface UsuarioDoToken {
    id: string;              // claims.sub
    email: string;           // claims.email ?? ""
    user_metadata: Record<string, unknown>; // claims.user_metadata ?? {}
    app_metadata: Record<string, unknown>;  // claims.app_metadata ?? {}
  }
  export async function usuarioDoToken(supabase: SupabaseClient): Promise<{ usuario: UsuarioDoToken | null; error: AuthError | null }>
  ```
  Implementação: `const { data, error } = await supabase.auth.getClaims();` → sem `data?.claims` devolve `{ usuario: null, error }`. Manter o tratamento de `ehSessaoAusente(error)` (já existe em `lib/auth/server.ts`): sessão ausente é estado normal, não loga.
- [ ] Teste `lib/auth/claims.test.ts` (vitest, mock de `supabase.auth.getClaims`): (a) claims válidos → `usuario` com `id/email/user_metadata`; (b) `error` com `name: "AuthSessionMissingError"` → `usuario: null`, sem `logger.error`; (c) erro de assinatura/expirado (`error` com outro nome) → `usuario: null` e `logger.error` chamado uma vez com `name/code/status/message` (mesmas chaves que `loadAuthUser` já usa).

### Task P1.2 — `loadAuthUser` usa o helper

- [ ] Em `lib/auth/server.ts`, `loadAuthUser` (≈ linha 137): trocar `supabase.auth.getUser()` por `usuarioDoToken(supabase)`. O restante da função continua igual: `user.id` → `usuario.id`, `user.email` → `usuario.email`, `user.user_metadata?.full_name|avatar_url|locale|timezone` → `usuario.user_metadata.*`. O bloco de log de erro passa a viver no helper (não duplicar).
- [ ] Atualizar o comentário de cabeçalho da função ("Uses the user-scoped server client… `getUser()`") e o de `lib/supabase/server.ts` linha 4 ("Sempre use `getUser()` (valida JWT no…)"), explicando: validação local por JWKS, por que (10–14k chamadas/dia ao GoTrue numa máquina de 426 MB), e o risco aceito (revogação só no `exp`).
- [ ] Ajustar os testes que mockam `auth.getUser` para `loadAuthUser`: `lib/auth/require-role.test.ts`, `lib/auth/vinculo-revogado.test.ts` e qualquer outro que `git grep -l "getUser" -- tests lib app | xargs grep -l loadAuthUser` apontar. Mockar `getClaims` devolvendo `{ data: { claims: { sub, email, user_metadata } }, error: null }`.

### Task P1.3 — Rotas que chamam `getUser()` direto

- [ ] Levantar: `git grep -n "supabase.auth.getUser()" -- app/api app/app lib | grep -v test`. (Em 26/10 eram ~51 rotas chamando `getUser` e/ou `loadAuthUser`; ex.: `app/api/v1/conversations/[id]/messages/route.ts` faz `getUser()` na linha ~32 e `loadAuthUser()` na ~37 → duas idas ao GoTrue por pedido.)
- [ ] Regra por rota:
  - Se a rota já chama `loadAuthUser()` logo depois: **apagar** o `getUser()` e usar `authUser.id`.
  - Se usa só `getUser()` para id/email: trocar por `usuarioDoToken(supabase)`.
  - **Manter `getUser()`** onde precisa de dado fresco do GoTrue: fluxos de MFA (`isMfaEnrolled`, `exigenciaDeMfa`, `requiresMfa` em `lib/auth/server.ts` usam `supabase.auth.mfa.*` — não mexer), troca de senha/e-mail, aceite de convite (`lib/auth/aplicar-convite.ts`, `convite-no-gotrue.ts`), callbacks de login. Listar no PR quais ficaram e por quê.
- [ ] Rodar `pnpm typecheck` e os testes das rotas tocadas.

**Critério de pronto P1:** nenhuma rota de leitura do app (`/app/*`, `/api/v1/*` fora de auth/MFA/convite) chama `/auth/v1/user`; `pnpm typecheck` verde; testes tocados verdes. Depois de publicar, `/auth/v1/user` some do top de caminhos nos edge_logs.

---

## P2 — Cadência dos crons e do laço do worker

### Task P2.1 — `docker/scheduler/entrypoint.sh`

- [ ] No bloco `CRONS=` (linhas 49–67 em `c933a8597`), alterar só estas linhas (manter timeout e caminho):

| Rota | De | Para | Motivo |
|---|---|---|---|
| `api/v1/cron/agent-dispatcher` | `* * * * *` | `7 * * * *` | a rota devolve `{ skipped: true, deprecated: true }`; fica agendada só porque `tests/unit/cron-routes-scheduled.test.ts` exige toda rota do diretório na lista |
| `api/v1/cron/event-log-drain` | `* * * * *` | `*/5 * * * *` | o worker já drena a cada 2–10 s (`runEventLogDrainLoop`); o cron é só rede de segurança |
| `api/v1/cron/prospecting` | `* * * * *` | `*/5 * * * *` | timeout de 240 s todo minuto; prospecção não precisa de 1 min |
| `api/v1/cron/proposta-travada` | `* * * * *` | `*/5 * * * *` | watcher de proposta presa |
| `api/v1/cron/webhook-replay` | `* * * * *` | `*/2 * * * *` | replay de webhook falho |

  **Ficam em 1 min** (latência visível ao cliente): `followup-flow-worker`, `routing-worker`, `mensagens-agendadas`, `campaign-worker`, `channel-pause-scheduler`.
- [ ] Acrescentar, no comentário acima de `CRONS=`, o motivo (carga fixa de ~25–35k chamadas/dia ao Supabase numa máquina de 426 MB, 26/10/2026).
- [ ] Conferir se `hostgator-setup-kit/_common.sh` e `hostgator-setup-kit/README.md` repetem a lista (ambos citam `cron/event-log-drain`); se repetem, deixar igual.
- [ ] Rodar `tests/unit/cron-routes-scheduled.test.ts` (ele lê o `entrypoint.sh` e compara com `app/api/v1/cron/`).

### Task P2.2 — Laço do worker

- [ ] `lib/agent-engine/env.ts` linha ~144: `EVENT_LOG_DRAIN_IDLE_INTERVAL_MS` default `10_000` → `30_000`. (Com evento processado o laço volta a `EVENT_LOG_DRAIN_INTERVAL_MS` = 2 s; só a espera **ociosa** muda.) Atualizar o comentário ao lado e o cabeçalho de `lib/event-log/drain-loop.ts` se citar "10 s".
- [ ] `tests/unit/event-log-drain-loop.test.ts`: ajustar asserções que dependam do default antigo; manter o teste de `proximaEspera` (ocupado → `intervalMs`, ocioso → `idleIntervalMs`).
- [ ] `.env.example` / `.env.hostgator.example`: se documentam a variável com "10 s", atualizar. **Não** mexer no `.env` da VPS (o default no código basta).

**Critério de pronto P2:** teste `cron-routes-scheduled` verde; `event-log-drain-loop` verde; typecheck verde. Depois de publicar, `/rest/v1/event_log` cai de ~25k para < 8k chamadas/dia nos edge_logs.

---

## P3 — GET não repete 3× no travamento

- [ ] `lib/api/client.ts`: hoje `MAX_ATTEMPTS = 3` vale para (a) status 429/503 com `Retry-After` (linha ~319) e (b) timeout/erro de rede em GET (catch, linha ~401: `if (attempt < MAX_ATTEMPTS) { await sleep(backoffMs(attempt)); continue; }`). Criar `const MAX_ATTEMPTS_TIMEOUT = 2` e usar **só no caso (b)**; (a) continua com `MAX_ATTEMPTS`.
- [ ] Atualizar o comentário de cabeçalho (linhas ~21–70, que explica a história do retry das escritas) com o motivo: num travamento do banco, 3 tentativas × 10 s triplicam a carga e seguram a tela por 30 s; 2 tentativas cobrem o blip de rede e desistem em 20 s.
- [ ] `lib/api/client.test.ts`: novo teste com fake timers: GET cujo `fetch` estoura o timeout duas vezes → lança `TimeoutError` após **2** tentativas (contar chamadas de `fetch`); e teste de que 503 com `Retry-After` continua tentando até 3.

**Critério de pronto P3:** testes do client verdes; typecheck verde.

---

## P4 — Toast só quando foi ação do usuário

**Objetivo:** atualização automática que falha fica em silêncio (o TanStack mantém o dado anterior na tela); o toast "Erro inesperado" só aparece quando a consulta ainda não tem nada para mostrar (primeira carga) ou quando foi uma mutação (enviar, atribuir, salvar — essas não mudam).

### Task P4.1 — Helper

- [ ] Criar `lib/query/avisar-so-na-primeira-carga.ts`:
  ```ts
  import type { QueryClient, QueryKey } from "@tanstack/react-query";
  import { showApiError } from "@/components/feedback/ApiErrorToast";
  /** Toast só se a consulta ainda não tem dado na tela; refetch que falha fica em silêncio. */
  export function avisarSoNaPrimeiraCarga(qc: QueryClient, queryKey: QueryKey, err: unknown): void {
    if (qc.getQueryState(queryKey)?.data === undefined) showApiError(err);
  }
  ```
  Comentário explicando o porquê (26/10: toasts disparando em refetch automático durante travamento do banco).
- [ ] Teste `lib/query/avisar-so-na-primeira-carga.test.ts`: (a) sem dado em cache → `showApiError` chamado; (b) com dado em cache (`qc.setQueryData`) → não chamado.

### Task P4.2 — Aplicar nos 7 hooks

Cada um já tem `queryKey`; onde faltar, `const qc = useQueryClient()`. Trocar `showApiError(err)` dentro do `catch` do `queryFn` por `avisarSoNaPrimeiraCarga(qc, queryKey, err)` e manter o `throw err`.

- [ ] `hooks/escale/useFilaDeConversas.ts` (linha ~74; já tem `qc` e `queryKey`)
- [ ] `hooks/inbox/useMessagesRealtime.ts` (~35)
- [ ] `hooks/inbox/useConversationsRealtime.ts` (~183)
- [ ] `hooks/inbox/usePassagensDaConversa.ts` (~48)
- [ ] `hooks/inbox/useConversationNotes.ts` (~25)
- [ ] `hooks/escale/useColunasDaLista.ts` (~47)
- [ ] `hooks/escale/usePreferenciasDeConversas.ts` (~48)
- [ ] **Não tocar** em mutações (`onError: showApiError` em `useConversaDaCasca`, `useSetores`, `useSendMessage`, etc.) nem em `useDispositivosDaCasca` (toast próprio de MFA).
- [ ] Ajustar os testes existentes desses hooks que esperem toast em refetch (ex.: `tests/unit/escale-mensagens-em-cache.test.tsx`, `hooks/inbox/recargaDasConversas.test.tsx`): refetch com dado em cache → sem toast; primeira carga com erro → toast.

**Critério de pronto P4:** testes verdes; na tela, com o banco lento, a fila/mensagens já carregadas não disparam toast; a primeira abertura com erro ainda dispara.

---

## 4. Fechamento da frente (uma vez, depois de P1–P4 mergeadas)

- [ ] Bateria em segundo plano sobre a `main`: unitários completos (`corepack pnpm test`), `pnpm typecheck`, `pnpm lint`. **Sem `test:db`** (não há migration). Falha nova: corrigir antes de publicar; falhas já conhecidas da lista do projeto não bloqueiam.
- [ ] Revisão: um revisor **Opus 5.5** sobre o diff inteiro da frente (`git diff c933a8597...escale-crm/main`), com atenção a P1 (auth): o helper só aceita `data.claims` de `getClaims()` (assinatura verificada), nunca decodifica o JWT à mão; sessões ausentes não logam; nenhuma rota de MFA/convite/senha perdeu o `getUser()`.
- [ ] Tag `v1.81.0-escale.32` no tip da `main` + release; esperar `promover-stable: success`.
- [ ] VPS: `backup.sh`, `update.sh --to v1.81.0-escale.32`; conferir 3 containers healthy, `/login` 200, `/app` 307, 0 erros nos logs de app/worker/scheduler; `docker exec deskcommcrm-scheduler-1 cat /etc/crontabs/root` mostra as cadências novas.
- [ ] **Conferência do efeito (dia seguinte):** com o MCP `supabase-crm` (`query_logs`, serviço edge, `metadata.response.origin_time`), comparar com a tabela da seção 1: total de chamadas/dia (meta: < 55k), `/auth/v1/user` ausente do top, `/rest/v1/event_log` < 8k, chamadas ≥ 5 s. Registrar no `LOG.md` e na memória.

## 5. Fora do escopo / riscos

- Não resolve a raiz (426 MB de RAM). Se os travamentos continuarem com a carga reduzida, a saída é a máquina (Pro).
- P1b (cache de permissões de 30 s) ficou de fora por decisão do usuário (D2).
- A rajada ao **abrir** o Atendimento (10–15 pedidos em paralelo × 6 consultas cada) não é tratada aqui; é redesenho de telas.
- `fn_escale_fila_da_casca` (média 505 ms, pico 7 s para 10 conversas) e `fn_escale_lista_de_contatos` (956 ms) continuam caras; candidatas a uma frente de banco depois.
