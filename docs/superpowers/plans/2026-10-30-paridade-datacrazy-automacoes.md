# Paridade Datacrazy nas automações (ONPLAY) e configuração do Escale OS por MCP — Plano de implementação

> **SITUAÇÃO EM 31/10/2026 — este plano foi dividido.**
> - **T1 a T12: feitas** e mergeadas na `main` do `escale-crm` (PRs #139, #140, #142), sem publicar. Migrations renumeradas para **9702** (variáveis do canal) e **9703** (horário comercial).
> - **O código que falta (T13 a T17, mais teste e publicação) está no plano novo:** `docs/superpowers/plans/2026-10-31-paridade-datacrazy-codigo-restante.md`, revisado (caminho do worker incluído, sem pausa configurável, migrations 9704/9705). **Execute por lá, não por aqui.**
> - **T18, T19, T22 e o ensaio na organização do cliente (parte da T20) saíram deste projeto:** a operação do ONPLAY é feita no outro projeto do usuário.

> **Para quem executa:** use `superpowers:executing-plans`, inline, na própria sessão (regra do projeto: nunca trocar para subagent-driven-development). Os passos usam caixinhas (`- [ ]`). Usei a skill writing-plans para montar este plano.

**Objetivo:** migrar o cliente Hiago (organização ONPLAY) do Datacrazy para o Escale OS com as 5 automações se comportando exatamente como no Datacrazy (mesmas barras `/`, mesmas frases-gatilho, mesmos áudios, mesmos botões), e deixar o Escale OS configurável de ponta a ponta por MCP, para toda migração de cliente futura.

**Arquitetura:** (1) o modelo passa a ser **uma automação, N canais**: variáveis e responsável vivem no canal (número) e a automação os lê pelo canal da própria conversa, então criar usuário ou número novo não cria automação nova. (2) As lacunas do motor entram como o menor delta sobre o que já existe: gatilho `message.sent` com palavra-chave, ação de remover tag, esperas curtas, horário comercial por dia da semana, mídia e mensagens interativas (botões e lista) no WhatsApp Cloud API. (3) O MCP ganha ferramentas de escrita finas, que chamam **funções de escrita extraídas das rotas REST** (nada de lógica duplicada, nada de converter rota para bearer).

**Tecnologias:** Next.js 16 (App Router), TypeScript 6 estrito, Zod 4, Supabase (Postgres + RLS + Storage), Vitest 4, pnpm (via `corepack pnpm`), MCP em `lib/mcp` (tools `crm_*`).

## Restrições globais

Todas valem para todas as tarefas. Elas vêm de `CLAUDE.md` e `AGENTS.md` do repo e do `CLAUDE.md` da pasta `Deskcom CRM`.

- **Regra pétrea:** o plano só roda depois de um "pode fazer" do usuário. Aprovado, o ciclo vai até produção sem pedir de novo ("A ENTREGA ATÉ PRODUÇÃO É DO CLAUDE", 18/10/2026). O usuário autorizou o deploy depois da revisão.
- **Velocidade (decisão de 18/10/2026):** executa tudo, testa tudo uma vez, publica tudo uma vez. Durante a execução só roda o teste que a própria tarefa cria, `typecheck` e `eslint` dos arquivos alterados. Nada de `test:db` nem rodada cheia no meio. Um PR por fase, mergeado logo ao terminar (merge direto na `main`). Nada vai para produção no meio da frente.
- **Git:** remoto do produto é `escale-crm` (`rgisjr/escale-crm`), base `main`. **Nunca** push em `origin` (Rafael). Atualize a branch com a main antes de começar (`git fetch escale-crm && git merge --ff-only escale-crm/main`). Worktree por fase: `git worktree add ../wt-paridade-<fase> -b feat/paridade-<fase> escale-crm/main`.
- **Ambiente (Git Bash):** `export PATH="/c/Program Files/nodejs:$PATH"`; use `corepack pnpm` (o `pnpm` não está no PATH); `typecheck` com `NODE_OPTIONS=--max-old-space-size=8192`. O erro em `tests/unit/escale-fila-da-casca.test.tsx(67)` já existe na `main`.
- **Multi-tenant:** toda tabela nova tem `organization_id uuid not null references organizations(id) on delete cascade` e RLS `tenant_isolation_<tabela>_all` com `fn_user_org_ids()`. Handler com service role filtra `organization_id` em **toda** query, vindo de fonte confiável (token/sessão), **nunca** do body. A ferramenta MCP recebe a organização de `ctx.organizationId`.
- **Migrations:** arquivo em `supabase/migrations/<timestamp>_<NNNN>_<slug>.sql` + apêndice idempotente no `supabase/baseline.sql` + linha `-- manifest: …` no cabeçalho do `.sql` (o `MANIFEST.md` é histórico, não recebe linha). Sem `BEGIN`/`COMMIT`, idempotente (`if not exists`, `create or replace`). A última migration é a `20261126120000_9406_…`; os números `9407+` abaixo são **provisórios**: rode `corepack pnpm checar:colisao-de-migration` e renumere se colidir. Regenere `lib/database.types.ts`. `tipo` é `text` + `check`, nunca enum. `jsonb` só onde não vira caminho lido pela UI (anti-pattern 6).
- **Audit:** toda mutação nova grava `audit(...)` (fire-and-forget) com código **acrescentado no fim** de `lib/audit/actions.ts` (array único). Ferramenta MCP já passa por `auditMcpToolCall` (`lib/mcp/audit.ts`); o código de domínio vai além disso.
- **MCP:** toda tool nova precisa de (a) `McpToolDefinition` em `lib/mcp/tools/*.ts` com `category: "write"`, `requiresRole: "manager"`, `requiresScope: "mcp:write"`, (b) entrada no catálogo `lib/mcp/tools/catalogo/*.ts` (`rotulo`, `explicacao` com 40+ caracteres, `oQueToca`, `risco`, `pacotes`), (c) registro em `lib/mcp/tools/index.ts`. Tools que mexem em mensagem ao cliente ou publicam são `risco: "critico"` e `apenasHumano: true` (o agente publicado nunca as alcança; o Claude operador, com token `dsk_`, sim). Gates: `tests/unit/catalogo-tools-leigo-friendly.test.ts`, `tests/unit/catalogo-servido.test.ts`.
- **Publicação de fluxo é ato humano** (skill `deskcomm-cliente-novo`): o MCP cria **rascunho**; publicar exige o parâmetro `aprovado_por` (nome de quem aprovou, 3+ caracteres), gravado no audit.
- **i18n:** frase nova em `t()`/`traduzir()` precisa de linha em `lib/i18n/dicionario.ts` **só com `es`** (o tipo é `Partial<Record<"es", string>>`; linha `en` reprova no typecheck). Sem a linha, `tests/unit/i18n-espanhol-cobre-a-tela.test.ts` reprova. Rótulos de gatilho/ação em `app/app/webhooks/_components/labels.ts`.
- **Estilo:** sem `console.log` (use `logger`), arquivos até 800 linhas, funções até 50, imutabilidade, Zod em toda entrada externa. Teste novo com `// @vitest-environment node` quando não for DOM.
- **Anti-ban:** envio automático passa por `espacarEnvio`, `checkDailyLimit`, janela do canal e guardas de contato (`checarGuardasDeContato`). Nenhuma ação nova pula isso.
- **Marca:** produto é "Escale OS" (nunca só "Escale"); não copiar identidade da Clint. Não há tela nova de grande porte neste plano.
- **Banco de produção:** proibido gravar fora das migrations. A configuração do ONPLAY (Tarefa 22) é feita **pelas ferramentas MCP**, que é o caminho de produto, com a organização ONPLAY, e só depois da publicação.

## Modelo: uma automação, N canais

Hoje o Datacrazy tem uma cópia de automação por atendente ("Mudar tag João", "Mudar tag Nath", "Mudar tag jean/gaby") e ramos por atendente dentro do RMK. A causa é que o Datacrazy amarra a automação ao número ou ao atendente. No Escale OS a regra é outra:

> **Um canal WhatsApp (número) = um atendente.** A automação é desenhada **uma vez** e vale para todos os canais. O que muda de um canal para outro (chave PIX, banco, nome do titular, telefone do suporte, áudios) é **dado do canal**, lido na hora do envio pelo **canal da própria conversa**.

Quatro mecanismos, cada um com a sua tarefa:

| # | Mecanismo | O que já existe | O delta (tarefa) |
|---|---|---|---|
| 1 | Variáveis por canal usáveis como `{{canal.pix_chave}}` e `{{atendente.nome}}` | `renderTemplate` (`lib/automation/template.ts`) já resolve caminho pontuado (`{{contact.name}}`, `{{lead.custom_fields.x}}`) a partir do contexto. Não existe tabela de variáveis do canal. `channel_sessions.metadata jsonb` existe mas não tem contrato. | Tabela `channel_variables` + `contextoDoCanal()` injetado no contexto da regra, do fluxo e das respostas rápidas (T1, T2) |
| 2 | Lead que entra pelo canal X fica com o atendente do canal X | `channel_routing_policies` / `channel_routing_responsibles` ligam canal → responsáveis e o `routing-worker` atribui a **conversa** (depende de disponibilidade e capacidade). A ação `assign_owner` só aceita `user_id` fixo. `regra-por-fonte` é por **formulário** (`webhook_source_id`), não por canal. | Modo `responsavel_do_canal` em `assign_owner` (T3) |
| 3 | Gatilho por palavra-chave enviada e envio pelo canal da conversa | Os **fluxos** já enviam pela conversa da inscrição (`enviarTextoFixoPendente` usa `boundary.conversation_id`). A ação de **regra** `send_whatsapp_message` exige `channel_session_id` fixo. | Valor `"conversation"` em `channel_session_id` (T3); gatilho `message.sent` (T8) |
| 4 | Respostas rápidas por atendente viram uma só | `message_templates` (+ `crm_respostas_rapidas_extras/setores`), sem variáveis de canal e sem anexo. O compositor só interpola `{{nome}}` e `{{primeiro_nome}}` (`lib/inbox/template-vars.ts`). | Variáveis de canal no servidor (T2); anexo por "slot" resolvido pelo canal (T15) |

Resultado para o ONPLAY: as 3 cópias de "Mudar tag" viram **uma** automação; os 4 ramos por atendente do RMK e da boas-vindas viram **um** fluxo; `/fechamento1`, `/fechamento2`, `/fechamento gaby` viram `/fechamento`; `/SUPORTE NATH|JOÃO|SANT` e `/suporte gabi` viram `/suporte`; `/BV1`, `/BV1 - GABY`, `/BV2`, `/BV2 - GABY`, `/Val1`, `/valores gaby`, `/apppago`, `/apppago/gaby` viram um por assunto, com o **áudio** vindo do slot do canal. Criar o sétimo atendente = conectar o número, escolher o responsável e preencher as variáveis do canal. **Zero automação nova.**

## O que o código já tem (verificado) e o que falta

| Capacidade | Veredito | Evidência | O que este plano faz |
|---|---|---|---|
| A. MCP de escrita | **Parcial.** Existem só leituras e `crm_set_automation_rule_active`; o texto da própria tool diz "criar, editar e apagar regra não é possível por aqui, de propósito" (`lib/mcp/tools/operacao.ts:508`). | `app/api/v1/automation-rules`, `…/respostas-rapidas`, `…/pipelines` usam `requireRole` (cookie). `…/ai/followup-flows` (GET lista e POST criar) **já aceitam bearer** (`resolveAuthDual`), mas `PATCH`, `publish` não. | Extrair a escrita para `lib/**` e chamar das rotas e do MCP. **Não** converter rotas para bearer. |
| B. Gatilho de mensagem enviada com palavra-chave | **Parcial.** O banco já emite `message.sent` (trigger `fn_emit_message_event`, só em INSERT com status `sent`) e o `sendMessageHandler` emite `message.sent` via `emit_event` (payload sem `body`, `contact_id`, `channel_session_id`). Mas `message.sent` **não está** em `TRIGGER_EVENTS` e não existe filtro de palavra-chave. | `app/api/v1/messages/_handler.ts:1413`; `supabase/baseline.sql` `fn_emit_message_event` | Gatilho + filtro + payload completo (T8). |
| C. Mídia (áudio, imagem, arquivo) | **Parcial.** O adaptador Cloud (`lib/channels/adapters/meta-cloud.ts`) já manda áudio como nota de voz (`voice: true`, exige ogg/opus), imagem e documento; `sendMessageHandler` aceita `media_storage_path` (exige `{org}/{conversa}/…`). As ações de regra e de fluxo só mandam texto. Não há repositório de mídia da organização. | `meta-cloud.ts:71-90`; `lib/messaging/media/upload-validation.ts:16` | Tabela de ativos da organização, upload por URL, passo de mídia em regra e fluxo (T13, T14). |
| D. Botões e lista interativos | **Falta o envio.** A **recepção** já funciona: toque em botão/lista chega como mensagem de texto com o rótulo (`textoDoClique`, `lib/channels/meta/webhook.ts:247`). Não existe envio `interactive`. `messages.type` não aceita `interactive`. | `webhook.ts:296-325`, `messages_type_check` no baseline | Envio `interactive` no adaptador, passo de fluxo com fallback numerado, ramo pelo rótulo (T16, T17). |
| E. Avisar o atendente | **Já existe, sem delta de código.** Ação de regra `create_task` com `atribuir_a: "dono_do_lead"` cria tarefa interna com push ao responsável (`lib/tarefas/criar-tarefa.ts`). | `lib/schemas/webhooks.ts:334` | Só uso e teste de contrato na migração (T10). "Lead Clicou Botao" = fluxo põe a tag `Clicou Botao` → regra `lead.tag_added` → `create_task`. |
| F. Remover tag | **Falta.** Não há ação `remove_tag`; o nó `edit_lead_tag` só adiciona (`editLeadTagConfigSchema` = `{ tags }`). | `lib/followup/graph-schema.ts:316` | `remove_tag` em regras e `remover` no nó (T9). |
| G. Digitando N segundos, uma vez por contato, horário por dia | **Parcial.** `wait` fixo tem piso de 5 min (`300_000`). "Uma vez por contato" **já existe**: o gatilho `lead_created` nasce uma vez por negócio e há índice de uma inscrição viva por contato. Janela do canal (`channel_knobs`) é por hora cheia, um único intervalo e domingo sim/não, compartilhada com o agente de IA. | `graph-schema.ts:107`; `lib/followup/janela-de-disparo.ts`; `lib/automation/janela-do-canal.ts` | Piso do `wait` cai para 30 s; horário comercial por dia da semana em tabela própria, composto como terceira régua (T11, T12). |
| H. Esperar resposta com tempo-limite | **Já existe.** `match_reply` estaciona em `waiting_reply`, tem `grace_timeout_ms` (mínimo 15 min) e saída `no_reply`. Os tempos do Datacrazy (30, 35, 60 min) cabem. | `graph-schema.ts:181`; `node-handlers.ts:797` | Só teste de contrato com o grafo do ONPLAY (T10). |
| I. Distribuição pelo número que recebeu | **Parcial.** Ver mecanismo 2. | `lib/routing/channel-policies.ts`, `eligibles.ts` | T3. A escolha dos responsáveis do canal continua sendo ato humano na tela (RPC `fn_set_channel_routing` exige sessão humana com MFA). |
| J. Migração do ONPLAY | Operacional | — | T18 a T22 |

**Item que o usuário trouxe como "pendente" e foi descartado:** "Mudar tag Natane" é igual às outras "Mudar tag" (só muda o usuário). Não falta insumo nenhum; o modelo "uma automação, N canais" a absorve.

## Fora deste plano (decisão explícita)

- **Tela** de variáveis do canal e de horário comercial. Neste plano a configuração é por MCP/REST (o objetivo é o Claude configurar). A tela entra depois, seguindo a regra de clonar a Clint onde houver tela equivalente.
- Alterar `channel_routing_*` por MCP: a RPC exige sessão humana + MFA de propósito. Fica na tela **Configurações › Atendimento**.
- Disparo em massa/campanha, agente de IA, templates HSM (já existem e não mudam).
- Reproduzir a janela "08:00–09:00 do dia seguinte" do Datacrazy: o Escale retoma na abertura da faixa (09:30). Ver "Perguntas abertas".

## Perguntas abertas (levar ao usuário antes do corte, não bloqueiam a execução)

1. Datacrazy retoma mensagens retidas entre 08:00 e 09:00 mesmo com a janela abrindo às 09:30. No Escale retoma às 09:30 (início da faixa). Aceitável?
2. `/fechamento1` (chave = celular) e `/fechamento2` (chave = e-mail) hoje são duas respostas do Iago Cardoso. Vão virar `/fechamento` com `{{canal.pix_chave}}` (uma chave por canal). Se a equipe usa as duas chaves no mesmo canal, o plano mantém `/fechamento2` como segunda resposta com `{{canal.pix_chave_2}}`.
3. "Aguardar o lead parar de digitar (30 s)" vira espera fixa de 30 s imune à resposta (o Escale não vê o "digitando…" do Cloud API). Confirmar na sandbox.
4. `/chamar` é restrito à Sant Vendas no Datacrazy. Entra como resposta geral com `{{canal.suporte_telefone}}`; se o texto "o número foi bloqueado por excesso de mensagem" só serve à Sant, ela vira variável `{{canal.aviso_suporte}}`.
5. No RMK 23H do Datacrazy o Douglas não recebe a mensagem. No Escale ela sai pelo canal da conversa para todos; se o Douglas deve ficar de fora, vira variável de canal que faz o passo ser pulado. Decidir com o Hiago.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20261127120000_9407_canal_variaveis.sql` | tabela `channel_variables` + RLS |
| `supabase/migrations/20261127130000_9408_horario_comercial_do_canal.sql` | tabela `channel_business_hours` + RLS |
| `supabase/migrations/20261127140000_9409_ativos_de_midia.sql` | tabela `org_media_assets`, `channel_variables.asset_id`, anexo da resposta rápida |
| `lib/canais/variaveis.ts` (+ `.test.ts`) | mesclar padrão da organização + canal; `contextoDoCanal()` |
| `lib/canais/responsavel.ts` (+ `.test.ts`) | `responsavelDoCanal()` a partir de `channel_routing_*` |
| `lib/canais/horario-comercial.ts` (+ `.test.ts`) | `proximaAberturaComercial()` pura + leitura |
| `lib/automation/canal-da-acao.ts` (+ `.test.ts`) | `resolverCanalDaAcao()` ("conversation" → canal real) |
| `lib/automation/regras-escrita.ts` (+ `.test.ts`) | `criarRegra`, `atualizarRegra` (extraído da rota) |
| `lib/automation/palavra-chave.ts` (+ `.test.ts`) | `casaComPalavraChave()` pura |
| `lib/automation/actions/remove-tag.ts` (+ `.test.ts`) | ação `remove_tag` |
| `lib/followup/escrita-de-fluxo.ts` (+ `.test.ts`) | `criarFluxo`, `salvarFluxo`, `publicarFluxo` (extraído das rotas) |
| `lib/escale/conversas/respostas-escrita.ts` (+ `.test.ts`) | `criarResposta`, `atualizarResposta`, `excluirResposta` (extraído das rotas) |
| `lib/midia/ativos.ts` (+ `.test.ts`) | subir ativo por URL segura, copiar para a conversa |
| `lib/channels/interativo.ts` (+ `.test.ts`) | montar payload `interactive`, texto numerado de reserva |
| `lib/mcp/tools/automacao-escrita.ts`, `fluxos-escrita.ts`, `canais-escrita.ts`, `respostas-escrita.ts` | tools MCP de escrita (+ entradas em `catalogo/operacao.ts` ou arquivo novo `catalogo/migracao.ts`) |
| `docs/runbooks/migracao-de-cliente-por-mcp.md` | receita reutilizável (T22) |

---

## Fase 1 — Modelo por canal

### Tarefa 1: Variáveis do canal e responsável do canal

**Arquivos:**
- Criar: `supabase/migrations/20261127120000_9407_canal_variaveis.sql`
- Modificar: `supabase/baseline.sql` (apêndice no fim), `lib/audit/actions.ts` (acrescentar `"channel_variables.updated"` no fim do array), `lib/database.types.ts` (regenerar)
- Criar: `lib/canais/variaveis.ts`, `lib/canais/responsavel.ts`
- Testes: `lib/canais/variaveis.test.ts`, `lib/canais/responsavel.test.ts`, `tests/invariants/channel-variables-rls.test.ts`

**Interfaces:**
- Produz: `CHAVE_DE_VARIAVEL: RegExp`; `mesclarVariaveis(linhas: readonly LinhaDeVariavel[], channelSessionId: string | null): Record<string, string>`; `contextoDoCanal(admin: SupabaseClient, organizationId: string, channelSessionId: string | null, donoDoLeadId?: string | null): Promise<ContextoDoCanal>`; `responsavelDoCanal(admin, organizationId, channelSessionId): Promise<ResponsavelDoCanal>`.
- Tipos: `LinhaDeVariavel = { channel_session_id: string | null; chave: string; value_text: string }`; `ContextoDoCanal = { canal: Record<string, string>; atendente: { nome: string; id: string | null } }`; `ResponsavelDoCanal = { tipo: "unico"; userId: string } | { tipo: "varios"; userIds: string[] } | { tipo: "nenhum" }`.

- [ ] **Passo 1: Escrever o teste que falha (mesclagem e responsável)**

```ts
// lib/canais/variaveis.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CHAVE_DE_VARIAVEL, mesclarVariaveis } from "@/lib/canais/variaveis";

const CANAL_A = "11111111-1111-4111-8111-111111111111";
const CANAL_B = "22222222-2222-4222-8222-222222222222";

describe("mesclarVariaveis", () => {
  const linhas = [
    { channel_session_id: null, chave: "pix_banco", value_text: "Mercado Pago" },
    { channel_session_id: null, chave: "pix_nome", value_text: "Iago cardoso" },
    { channel_session_id: CANAL_B, chave: "pix_nome", value_text: "Teresinha" },
    { channel_session_id: CANAL_B, chave: "pix_chave", value_text: "51999600190" },
  ];

  it("o valor do canal vence o padrão da organização", () => {
    expect(mesclarVariaveis(linhas, CANAL_B)).toEqual({
      pix_banco: "Mercado Pago",
      pix_nome: "Teresinha",
      pix_chave: "51999600190",
    });
  });

  it("canal sem valor próprio herda só o padrão", () => {
    expect(mesclarVariaveis(linhas, CANAL_A)).toEqual({
      pix_banco: "Mercado Pago",
      pix_nome: "Iago cardoso",
    });
  });

  it("sem canal, só o padrão", () => {
    expect(mesclarVariaveis(linhas, null)).toEqual({ pix_banco: "Mercado Pago", pix_nome: "Iago cardoso" });
  });
});

describe("CHAVE_DE_VARIAVEL", () => {
  it.each(["pix_chave", "suporte_telefone", "a1"])("aceita %s", (c) => expect(CHAVE_DE_VARIAVEL.test(c)).toBe(true));
  it.each(["Pix", "1pix", "pix chave", "pix.chave", ""])("recusa %s", (c) => expect(CHAVE_DE_VARIAVEL.test(c)).toBe(false));
});
```

```ts
// lib/canais/responsavel.test.ts
// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { responsavelDoCanal } from "@/lib/canais/responsavel";

const ORG = "11111111-1111-4111-8111-111111111111";
const CANAL = "22222222-2222-4222-8222-222222222222";

function bancoFalso(politica: { id: string } | null, responsaveis: string[]): SupabaseClient {
  const consulta = (tabela: string) => {
    const q: Record<string, unknown> = {};
    const devolve = async () => ({
      data: tabela === "channel_routing_policies" ? politica : responsaveis.map((user_id) => ({ user_id })),
      error: null,
    });
    for (const m of ["select", "eq"]) q[m] = () => q;
    q.maybeSingle = devolve;
    q.then = (ok: (r: unknown) => unknown) => devolve().then(ok);
    return q;
  };
  return { from: consulta } as unknown as SupabaseClient;
}

describe("responsavelDoCanal", () => {
  it("um responsável = único", async () => {
    const r = await responsavelDoCanal(bancoFalso({ id: "p1" }, ["u1"]), ORG, CANAL);
    expect(r).toEqual({ tipo: "unico", userId: "u1" });
  });
  it("vários responsáveis = varios", async () => {
    const r = await responsavelDoCanal(bancoFalso({ id: "p1" }, ["u1", "u2"]), ORG, CANAL);
    expect(r).toEqual({ tipo: "varios", userIds: ["u1", "u2"] });
  });
  it("sem política ou política vazia = nenhum", async () => {
    expect(await responsavelDoCanal(bancoFalso(null, []), ORG, CANAL)).toEqual({ tipo: "nenhum" });
    expect(await responsavelDoCanal(bancoFalso({ id: "p1" }, []), ORG, CANAL)).toEqual({ tipo: "nenhum" });
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run lib/canais/variaveis.test.ts lib/canais/responsavel.test.ts`
Esperado: FAIL com "Failed to resolve import @/lib/canais/variaveis".

- [ ] **Passo 3: Migration**

```sql
-- manifest: variáveis por canal (padrão da organização + valor do número) para uma automação servir N canais
create table if not exists public.channel_variables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_session_id uuid,
  chave text not null,
  value_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_variables_chave_formato check (chave ~ '^[a-z][a-z0-9_]{0,39}$'),
  constraint channel_variables_valor_tamanho check (char_length(value_text) between 1 and 2000),
  constraint channel_variables_canal_fk foreign key (organization_id, channel_session_id)
    references public.channel_sessions(organization_id, id) on delete cascade
);
create unique index if not exists channel_variables_unica
  on public.channel_variables (organization_id, coalesce(channel_session_id, '00000000-0000-0000-0000-000000000000'::uuid), chave);
create index if not exists idx_channel_variables_canal on public.channel_variables (organization_id, channel_session_id);

alter table public.channel_variables enable row level security;
drop policy if exists tenant_isolation_channel_variables_all on public.channel_variables;
create policy tenant_isolation_channel_variables_all on public.channel_variables
  for all
  using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));
revoke all on public.channel_variables from anon;
```

Replique o mesmo bloco como apêndice rotulado `-- ---- canal_variaveis (migration 9407) ----` no fim de `supabase/baseline.sql`.

- [ ] **Passo 4: Implementação**

```ts
// lib/canais/variaveis.ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { responsavelDoCanal } from "@/lib/canais/responsavel";
import { nomesDosAtendentes } from "@/lib/users/nome-do-atendente";

/** Chave de variável: minúscula, dígito e sublinhado. Vira `{{canal.<chave>}}`. */
export const CHAVE_DE_VARIAVEL = /^[a-z][a-z0-9_]{0,39}$/;
/** Chaves que o sistema preenche sozinho e que a variável do canal não pode sobrescrever. */
export const CHAVES_RESERVADAS = ["nome", "telefone"] as const;

export interface LinhaDeVariavel {
  channel_session_id: string | null;
  chave: string;
  value_text: string;
}
export interface ContextoDoCanal {
  canal: Record<string, string>;
  atendente: { nome: string; id: string | null };
}

export function mesclarVariaveis(
  linhas: readonly LinhaDeVariavel[],
  channelSessionId: string | null,
): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const l of linhas) if (l.channel_session_id === null) resultado[l.chave] = l.value_text;
  if (channelSessionId !== null) {
    for (const l of linhas) if (l.channel_session_id === channelSessionId) resultado[l.chave] = l.value_text;
  }
  return resultado;
}

const VAZIO: ContextoDoCanal = { canal: {}, atendente: { nome: "", id: null } };

/**
 * O que `{{canal.*}}` e `{{atendente.*}}` valem para este canal. NUNCA lança por
 * dado faltando: canal sem variável devolve só `nome`/`telefone`, e o
 * `renderTemplate` deixa a marcação vazia (o mesmo que faz com qualquer caminho
 * desconhecido). O atendente é o responsável ÚNICO do canal; com vários ou
 * nenhum, cai no dono do negócio (`donoDoLeadId`), se houver.
 */
export async function contextoDoCanal(
  admin: SupabaseClient,
  organizationId: string,
  channelSessionId: string | null,
  donoDoLeadId: string | null = null,
): Promise<ContextoDoCanal> {
  if (channelSessionId === null) return VAZIO;
  const [{ data: sessao, error: erroSessao }, { data: linhas, error: erroLinhas }, responsavel] =
    await Promise.all([
      admin
        .from("channel_sessions")
        .select("display_name, phone_number")
        .eq("organization_id", organizationId)
        .eq("id", channelSessionId)
        .maybeSingle(),
      admin
        .from("channel_variables")
        .select("channel_session_id, chave, value_text")
        .eq("organization_id", organizationId)
        .or(`channel_session_id.is.null,channel_session_id.eq.${channelSessionId}`),
      responsavelDoCanal(admin, organizationId, channelSessionId),
    ]);
  if (erroSessao) throw new Error(erroSessao.message);
  if (erroLinhas) throw new Error(erroLinhas.message);

  const variaveis = mesclarVariaveis((linhas ?? []) as LinhaDeVariavel[], channelSessionId);
  const s = sessao as { display_name?: string | null; phone_number?: string | null } | null;
  const canal = { ...variaveis, nome: s?.display_name ?? "", telefone: s?.phone_number ?? "" };

  const atendenteId = responsavel.tipo === "unico" ? responsavel.userId : donoDoLeadId;
  if (atendenteId === null) return { canal, atendente: { nome: "", id: null } };
  const nomes = await nomesDosAtendentes([atendenteId]);
  return { canal, atendente: { nome: nomes.get(atendenteId) ?? "", id: atendenteId } };
}
```

```ts
// lib/canais/responsavel.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type ResponsavelDoCanal =
  | { tipo: "unico"; userId: string }
  | { tipo: "varios"; userIds: string[] }
  | { tipo: "nenhum" };

/** Quem responde por este número, segundo Configurações › Atendimento (`channel_routing_*`). */
export async function responsavelDoCanal(
  admin: SupabaseClient,
  organizationId: string,
  channelSessionId: string,
): Promise<ResponsavelDoCanal> {
  const { data: politica, error: erroPolitica } = await admin
    .from("channel_routing_policies")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("channel_session_id", channelSessionId)
    .maybeSingle();
  if (erroPolitica) throw new Error(erroPolitica.message);
  if (!politica) return { tipo: "nenhum" };
  const { data, error } = await admin
    .from("channel_routing_responsibles")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("policy_id", (politica as { id: string }).id);
  if (error) throw new Error(error.message);
  const ids = ((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);
  if (ids.length === 0) return { tipo: "nenhum" };
  return ids.length === 1 ? { tipo: "unico", userId: ids[0]! } : { tipo: "varios", userIds: ids };
}
```

- [ ] **Passo 5: Teste de RLS (db)**

Copie o esqueleto de `tests/invariants/agenda-rls.test.ts` (usa `TEST_DB_CONTAINER`, `psql` via `docker exec`). Casos: (1) usuário `agent` da org A lê as variáveis da org A e **zero** da org B; (2) `agent` não consegue `insert` (a policy exige `manager`); (3) `manager` consegue; (4) o índice único impede duas linhas iguais `(org, canal, chave)` e duas linhas `(org, null, chave)`. O teste genérico `agenda-nenhuma-tabela-sem-rls.test.ts` já cobre a completude (a tabela nova entra sozinha).

- [ ] **Passo 6: Verificação da tarefa**

Run: `corepack pnpm vitest run lib/canais && NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm typecheck && corepack pnpm eslint lib/canais`
Esperado: PASS. `pnpm test:db tests/invariants/channel-variables-rls.test.ts` roda **na fase de teste da frente**, não agora.

- [ ] **Passo 7: Commit**

```bash
git add supabase lib/canais lib/audit/actions.ts lib/database.types.ts tests/invariants/channel-variables-rls.test.ts
git commit -m "feat: variáveis por canal e responsável do canal"
```

---

### Tarefa 2: Variáveis do canal nas mensagens (regra, fluxo e resposta rápida)

**Arquivos:**
- Modificar: `lib/automation/engine.ts` (função `buildContext`, ~linha 68-150), `lib/automation/texto-do-followup.ts`, `app/api/v1/respostas-rapidas/da-conversa/route.ts`, `components/escale/conversas/centro/compositor/PainelRespostasRapidas.tsx:69`, `lib/escale/conversas/respostas.ts` (campo `corpo_pronto`), `lib/i18n/dicionario.ts` (se houver frase nova)
- Teste: `lib/automation/canal-no-contexto.test.ts`, `tests/unit/respostas-da-conversa-com-variaveis.test.ts`

**Interfaces:**
- Consome: `contextoDoCanal`, `ContextoDoCanal` (T1).
- Produz: `context.canal` e `context.atendente` em todo contexto de regra cujo evento tenha canal; `RespostaLida.corpo_pronto: string` devolvido por `GET /api/v1/respostas-rapidas/da-conversa`.

- [ ] **Passo 1: Ler o ponto de injeção**

Run: `grep -n "context.contact = contact\|context.lead\|return context" lib/automation/engine.ts` e `sed -n 1,60p lib/automation/texto-do-followup.ts`. A injeção entra **no fim de `buildContext`**, antes do `return context`, para que qualquer entidade (mensagem, negócio, contato) ganhe `canal`.

- [ ] **Passo 2: Teste que falha**

```ts
// lib/automation/canal-no-contexto.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderTemplate } from "@/lib/automation/template";
import { canalDoContexto } from "@/lib/automation/canal-da-acao";

describe("{{canal.*}} e {{atendente.*}} no template", () => {
  const contexto = {
    contact: { name: "Maria Souza" },
    canal: { pix_chave: "51999600190", pix_banco: "Mercado Pago", nome: "joao vendas1" },
    atendente: { nome: "Teresinha" },
  };
  it("renderiza as variáveis do canal", () => {
    const texto = "PIX: {{canal.pix_chave}} ({{canal.pix_banco}}) — {{atendente.nome}}";
    expect(renderTemplate(texto, contexto)).toBe("PIX: 51999600190 (Mercado Pago) — Teresinha");
  });
  it("variável sem valor fica vazia, sem lançar", () => {
    expect(renderTemplate("x{{canal.nao_existe}}y", contexto)).toBe("xy");
  });
});

describe("canalDoContexto", () => {
  it("lê o canal do payload da mensagem", () => {
    expect(canalDoContexto({ channel_session_id: "c1" })).toBe("c1");
  });
  it("devolve null sem canal", () => {
    expect(canalDoContexto({})).toBeNull();
  });
});
```

(`canalDoContexto` nasce na T3; nesta tarefa, escreva o teste de `renderTemplate` e **deixe o `describe("canalDoContexto")` para a T3**. Remova-o deste arquivo.)

- [ ] **Passo 3: Injetar no contexto**

No fim de `buildContext`, antes de `return context;`:

```ts
  // Variáveis do canal e atendente: uma automação serve N canais (lib/canais/variaveis.ts).
  const canalId = await canalDoEventoOuDoContato(admin, row, context);
  if (canalId !== null) {
    const dono = (context.lead as { owner_user_id?: string | null } | undefined)?.owner_user_id ?? null;
    const { canal, atendente } = await contextoDoCanal(admin, row.organization_id, canalId, dono);
    context.canal = canal;
    context.atendente = atendente;
  }
```

e, no mesmo arquivo, a função auxiliar (importa `contextoDoCanal` de `@/lib/canais/variaveis`):

```ts
/** Canal do evento: payload primeiro; senão a conversa mais recente do contato (não-grupo). */
async function canalDoEventoOuDoContato(
  admin: SupabaseClient,
  row: EventRow,
  context: Record<string, unknown>,
): Promise<string | null> {
  const doPayload = row.payload.channel_session_id;
  if (typeof doPayload === "string" && doPayload !== "") return doPayload;
  const contatoId = (context.contact as { id?: string } | undefined)?.id;
  if (!contatoId) return null;
  const { data, error } = await admin
    .from("conversations")
    .select("channel_session_id")
    .eq("organization_id", row.organization_id)
    .eq("contact_id", contatoId)
    .eq("is_group", false)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { channel_session_id?: string } | null)?.channel_session_id ?? null;
}
```

- [ ] **Passo 4: Texto do fluxo (follow-up)**

Em `lib/automation/texto-do-followup.ts` (o texto fixo do nó `action`/`mode: text`), garanta que o corpo passe por `renderTemplate(body, contexto)` com o mesmo `contextoDoCanal(…)` do canal **da conversa da inscrição** (`boundary.conversation_id` → `conversations.channel_session_id`). Escreva primeiro o teste em `lib/followup/enviar-texto-fixo.test.ts` (arquivo existente: acrescente o caso) afirmando que `"PIX {{canal.pix_chave}}"` sai com a chave do canal da conversa e **não** com a de outro canal da mesma organização.

- [ ] **Passo 5: Resposta rápida com variáveis**

Em `da-conversa/route.ts`, depois de calcular `respostas`, devolva também o corpo pronto:

```ts
    const { canal, atendente } = await contextoDoCanal(
      createAdminClient(),
      authz.org.orgId,
      c.channel_session_id,
      conversa.assigned_to_user_id ?? null,
    );
    const prontas = respostas.map((r) => ({
      ...r,
      corpo_pronto: renderTemplate(r.corpo, { canal, atendente }),
    }));
    return ok({ respostas: prontas, setorDaConversa: setorId, podeOutrosSetores }, { requestId });
```

(inclua `assigned_to_user_id` no `select` da conversa e importe `createAdminClient`, `contextoDoCanal`, `renderTemplate`). A leitura usa o client admin **com** `organization_id` explícito (já é o argumento). `PainelRespostasRapidas.tsx:69` passa a usar `interpolateTemplate(r.corpo_pronto ?? r.corpo, contato)`. Acrescente `corpo_pronto?: string` ao tipo `RespostaLida`.

- [ ] **Passo 6: Rodar**

Run: `corepack pnpm vitest run lib/automation/canal-no-contexto.test.ts lib/followup/enviar-texto-fixo.test.ts tests/unit/respostas-da-conversa-com-variaveis.test.ts`
Esperado: PASS (o último teste monta a rota com `supabase-por-tabela.ts` de `tests/helpers` e confere que `corpo_pronto` contém a chave PIX do canal da conversa).

- [ ] **Passo 7: Commit**

```bash
git add lib app components tests
git commit -m "feat: variáveis do canal em regras, fluxos e respostas rápidas"
```

---

### Tarefa 3: Canal da conversa e responsável do canal nas ações

**Arquivos:**
- Criar: `lib/automation/canal-da-acao.ts`, `lib/automation/canal-da-acao.test.ts`
- Modificar: `lib/schemas/webhooks.ts` (ação `send_whatsapp_message` ~linha 240 e `assign_owner` ~linha 290), `lib/automation/actions/send-whatsapp.ts` (`postponeUntil` e `execute`), `lib/automation/actions/assign-owner.ts`, `lib/automation/desenho-da-regra.ts` (se a ação aparecer no desenho), `app/app/webhooks/_components/labels.ts`
- Teste: `lib/automation/actions/assign-owner-canal.test.ts`

**Interfaces:**
- Consome: `responsavelDoCanal` (T1), `ActionCtx` (`lib/automation/types.ts`: `admin`, `organizationId`, `context`, `event`).
- Produz: `CANAL_DA_CONVERSA = "conversation"`; `canalDoContexto(payload: Record<string, unknown>): string | null`; `resolverCanalDaAcao(ctx: ActionCtx, valor: unknown): Promise<string | null>`; config `assign_owner` `{ user_id: uuid } | { modo: "responsavel_do_canal" }`.

- [ ] **Passo 1: Teste que falha**

```ts
// lib/automation/canal-da-acao.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CANAL_DA_CONVERSA, canalDoContexto, resolverCanalDaAcao } from "@/lib/automation/canal-da-acao";
import type { ActionCtx } from "@/lib/automation/types";

const ctxCom = (payload: Record<string, unknown>, contatoId?: string): ActionCtx =>
  ({
    organizationId: "org",
    event: { payload },
    context: contatoId ? { contact: { id: contatoId } } : {},
    admin: {
      from: () => {
        const q: Record<string, unknown> = {};
        for (const m of ["select", "eq", "order", "limit"]) q[m] = () => q;
        q.maybeSingle = async () => ({ data: { channel_session_id: "canal-da-conversa" }, error: null });
        return q;
      },
    },
  }) as unknown as ActionCtx;

describe("canalDoContexto", () => {
  it("lê o canal do payload", () => expect(canalDoContexto({ channel_session_id: "c1" })).toBe("c1"));
  it("null sem canal", () => expect(canalDoContexto({})).toBeNull());
});

describe("resolverCanalDaAcao", () => {
  it("uuid fixo passa direto", async () => {
    expect(await resolverCanalDaAcao(ctxCom({}), "fixo")).toBe("fixo");
  });
  it('"conversation" usa o canal do evento', async () => {
    expect(await resolverCanalDaAcao(ctxCom({ channel_session_id: "c1" }), CANAL_DA_CONVERSA)).toBe("c1");
  });
  it('"conversation" sem canal no evento cai na conversa mais recente do contato', async () => {
    expect(await resolverCanalDaAcao(ctxCom({}, "contato-1"), CANAL_DA_CONVERSA)).toBe("canal-da-conversa");
  });
  it('"conversation" sem nada devolve null', async () => {
    expect(await resolverCanalDaAcao(ctxCom({}), CANAL_DA_CONVERSA)).toBeNull();
  });
});
```

```ts
// lib/automation/actions/assign-owner-canal.test.ts  (esqueleto: copie o dublê de assign-owner existente)
// Casos: (1) canal com 1 responsável -> owner_user_id = ele; (2) 2 responsáveis -> skipped "varios_responsaveis";
// (3) nenhum -> skipped "sem_responsavel_no_canal"; (4) config { user_id } antiga continua igual.
```

Escreva o teste (4) com o dublê que o teste existente de `assign_owner` usa (`grep -rn "assign_owner" lib/automation --include=*.test.ts -l` para achá-lo) e complete os casos (1) a (3) com `vi.mock("@/lib/canais/responsavel")`.

- [ ] **Passo 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run lib/automation/canal-da-acao.test.ts`
Esperado: FAIL, módulo inexistente.

- [ ] **Passo 3: Implementação**

```ts
// lib/automation/canal-da-acao.ts
import type { ActionCtx } from "@/lib/automation/types";

/** Valor de `channel_session_id` que significa "o canal da própria conversa". */
export const CANAL_DA_CONVERSA = "conversation" as const;

export function canalDoContexto(payload: Record<string, unknown>): string | null {
  const v = payload.channel_session_id;
  return typeof v === "string" && v !== "" ? v : null;
}

export async function resolverCanalDaAcao(ctx: ActionCtx, valor: unknown): Promise<string | null> {
  if (typeof valor !== "string" || valor === "") return null;
  if (valor !== CANAL_DA_CONVERSA) return valor;
  const doEvento = canalDoContexto(ctx.event.payload);
  if (doEvento !== null) return doEvento;
  const contatoId = (ctx.context.contact as { id?: string } | undefined)?.id;
  if (!contatoId) return null;
  const { data, error } = await ctx.admin
    .from("conversations")
    .select("channel_session_id")
    .eq("organization_id", ctx.organizationId)
    .eq("contact_id", contatoId)
    .eq("is_group", false)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { channel_session_id?: string } | null)?.channel_session_id ?? null;
}
```

Em `lib/schemas/webhooks.ts`, trocar as duas linhas de ação:

```ts
  z.object({
    type: z.literal("send_whatsapp_message"),
    config: z.object({
      // `conversation` = o número pelo qual a conversa acontece (uma automação, N canais).
      channel_session_id: z.union([z.string().uuid(), z.literal("conversation")]),
      template: z.string().min(1).max(2000),
    }),
  }),
```

```ts
  z.object({
    type: z.literal("assign_owner"),
    config: z.union([
      z.object({ user_id: z.string().uuid() }),
      z.object({ modo: z.literal("responsavel_do_canal") }),
    ]),
  }),
```

Em `send-whatsapp.ts`, substitua a leitura do `sessionId` nos dois pontos (`postponeUntil` e `execute`) por `const sessionId = await resolverCanalDaAcao(ctx, config.channel_session_id);` (ambas já são `async`). Em `assign-owner.ts`, antes da leitura de `user_id`:

```ts
  let userId = typeof config.user_id === "string" ? config.user_id : null;
  if (userId === null && config.modo === "responsavel_do_canal") {
    const canalId = await resolverCanalDaAcao(ctx, CANAL_DA_CONVERSA);
    if (canalId === null) return { type: "assign_owner", status: "skipped", detail: { reason: "sem_canal" } };
    const r = await responsavelDoCanal(ctx.admin, ctx.organizationId, canalId);
    if (r.tipo === "varios") return { type: "assign_owner", status: "skipped", detail: { reason: "varios_responsaveis" } };
    if (r.tipo === "nenhum") return { type: "assign_owner", status: "skipped", detail: { reason: "sem_responsavel_no_canal" } };
    userId = r.userId;
  }
```

(o resto da ação — validação de membership ativa, viewer não atende, gravação de `owner_user_id` — segue igual, usando `userId`). Rótulo na tela: em `labels.ts` acrescente o texto "Responsável do canal" para a opção nova, e a linha `es` em `lib/i18n/dicionario.ts`.

⚠️ `assign_owner` está em `ACOES_QUE_REGRAVAM_O_LEAD`: continua vetada em `lead.won/lost/reopened/assigned`. O uso previsto é em `lead.created` ou `lead.tag_added`. Não altere o veto.

- [ ] **Passo 4: Rodar**

Run: `corepack pnpm vitest run lib/automation lib/schemas` e `eslint` dos arquivos alterados.
Esperado: PASS. Atenção aos testes existentes de `webhooks.ts` que fixam o formato do `send_whatsapp_message`: o `union` mantém o formato antigo válido.

- [ ] **Passo 5: Commit**

```bash
git add lib app
git commit -m "feat: ações de regra usam o canal da conversa e o responsável do canal"
```

---

## Fase 2 — MCP de escrita (capacidade A)

> Padrão de todas as tarefas da fase: (1) extrair para `lib/**` a escrita que hoje mora dentro da rota, **sem mudar o comportamento da rota** (o teste da rota existente continua verde); (2) a rota chama a função extraída; (3) a tool MCP chama a mesma função com `ctx.supabase`, `ctx.organizationId`, `ctx.actor`; (4) catálogo + registro; (5) audit. Isso cumpre "reusar validadores e handlers" sem converter rota para bearer.

### Tarefa 4: Criar e atualizar regras automáticas por MCP

**Arquivos:**
- Criar: `lib/automation/regras-escrita.ts`, `lib/automation/regras-escrita.test.ts`, `lib/mcp/tools/automacao-escrita.ts`
- Modificar: `app/api/v1/automation-rules/route.ts` (POST), `app/api/v1/automation-rules/[id]/route.ts` (PATCH, ~linhas 26-130), `lib/mcp/tools/index.ts`, `lib/mcp/tools/catalogo/operacao.ts`, `lib/mcp/tools/operacao.ts:508` (texto da descrição de `crm_set_automation_rule_active`: remover "Criar, editar e apagar regra não é possível por aqui, de propósito")
- Teste: `tests/unit/mcp-regras-escrita.test.ts`

**Interfaces:**
- Consome: `createAutomationRuleSchema`, `updateAutomationRuleSchema` (já em `lib/schemas/webhooks.ts`, linhas ~448 e ~534), `encryptRuleActionSecrets` (importado hoje pela rota; use o mesmo import).
- Produz: `criarRegra(admin, entrada: { organizationId: string; criadoPorUserId: string | null; requestId: string; dados: CreateAutomationRule }): Promise<ResultadoDeEscrita<RegraCriada>>` e `atualizarRegra(admin, { organizationId, regraId, requestId, patch }): Promise<ResultadoDeEscrita<RegraCriada>>`, com `ResultadoDeEscrita<T> = { ok: true; dado: T } | { ok: false; codigo: string; mensagem: string; status: number; detalhes?: unknown }`. Tools `crm_create_automation_rule` e `crm_update_automation_rule`.

- [ ] **Passo 1: Ler as rotas e o schema**

Run: `sed -n 26,135p "app/api/v1/automation-rules/[id]/route.ts"` e `grep -n "created_by_user_id" supabase/baseline.sql | head`. Confirme que `automation_rules.created_by_user_id` aceita null (se não aceitar, a migration `20261127150000_9410_regra_criada_por_mcp.sql` faz `alter table public.automation_rules alter column created_by_user_id drop not null` com cabeçalho `-- manifest:` e apêndice no baseline).

- [ ] **Passo 2: Teste que falha**

```ts
// lib/automation/regras-escrita.test.ts
// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/automation/criptografia-de-acoes", () => ({
  encryptRuleActionSecrets: vi.fn(async (_admin: unknown, actions: unknown) => actions),
}));

import { criarRegra } from "@/lib/automation/regras-escrita";

const ORG = "11111111-1111-4111-8111-111111111111";
const CANAL = "22222222-2222-4222-8222-222222222222";

function bancoQueGrava(linhas: Array<Record<string, unknown>>): SupabaseClient {
  return {
    from: () => ({
      insert: (valores: Record<string, unknown>) => {
        linhas.push(valores);
        return { select: () => ({ single: async () => ({ data: { id: "r1", ...valores }, error: null }) }) };
      },
    }),
  } as unknown as SupabaseClient;
}

describe("criarRegra", () => {
  it("grava a organização do CONTEXTO, nunca a do corpo", async () => {
    const linhas: Array<Record<string, unknown>> = [];
    const r = await criarRegra(bancoQueGrava(linhas), {
      organizationId: ORG,
      criadoPorUserId: null,
      requestId: "req",
      dados: {
        name: "Mudar tag",
        trigger_event: "message.sent",
        trigger_config: { palavra_chave: "Põe estes dados", modo: "contem" },
        conditions: [],
        actions: [{ type: "send_whatsapp_message", config: { channel_session_id: "conversation", template: "{{canal.pix_chave}}" } }],
      } as never,
    });
    expect(r.ok).toBe(true);
    expect(linhas[0]).toMatchObject({ organization_id: ORG, created_by_user_id: null });
    expect(CANAL).toBeTruthy();
  });
});
```

(O `trigger_event: "message.sent"` só valida depois da T8; neste teste a função extraída recebe dados **já validados** e não revalida. O teste ponta a ponta com o schema completo entra na T8.)

- [ ] **Passo 3: Extrair**

Mova o miolo do POST (cifrar segredos de `call_webhook`, validar `webhook_source_id` na organização, `insert`, `audit("automation.rule_created")`) para `criarRegra`. O corpo da rota vira: `requireSupportWrite` → `requireRole("manager")` → `createAutomationRuleSchema.safeParse` → `criarRegra(supabaseDaSessao, {...})` → `ok/fail`. Mesma coisa para o PATCH (`atualizarRegra`). **Não** altere mensagens de erro, status ou o audit existente. Para o MCP o `admin` é service role: `criarRegra` filtra `organization_id` em toda query.

```ts
// lib/mcp/tools/automacao-escrita.ts (trecho)
import { z } from "zod";

import { criarRegra, atualizarRegra } from "@/lib/automation/regras-escrita";
import { createAutomationRuleSchema, updateAutomationRuleSchema } from "@/lib/schemas/webhooks";
import type { McpToolDefinition } from "../types";

const criarShape = { regra: createAutomationRuleSchema };

export const crmCreateAutomationRule: McpToolDefinition<typeof criarShape> = {
  name: "crm_create_automation_rule",
  description:
    "Cria uma regra automática, SEMPRE DESLIGADA (is_active=false). Confira com crm_list_automation_rules e ligue " +
    "com crm_set_automation_rule_active depois de um humano aprovar: ligada, ela envia mensagem a clientes sozinha.",
  inputSchema: criarShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  handler: async (input, ctx) => {
    const r = await criarRegra(ctx.supabase, {
      organizationId: ctx.organizationId,
      criadoPorUserId: ctx.actor.type === "user" ? ctx.actor.id : null,
      requestId: ctx.requestId,
      dados: input.regra,
    });
    if (!r.ok) throw new Error(`${r.codigo}: ${r.mensagem}`);
    return { id: r.dado.id, ativa: false };
  },
};
```

⚠️ A regra nasce **desligada**: confirme em `criarRegra` que o `insert` não passa `is_active: true` (o default do banco é a fonte; confira com `grep -n "is_active" supabase/baseline.sql | grep automation_rules`). Se o default for `true`, o `insert` da `criarRegra` passa `is_active: false` **só no caminho MCP** via parâmetro `ativaAoCriar: boolean` (default `true` para a rota, `false` para a tool). Escreva o teste para o parâmetro.

`crm_update_automation_rule` tem `{ rule_id: uuid, alteracoes: updateAutomationRuleSchema }` e **recusa** `is_active` (ligar/desligar fica na tool própria que já existe, `apenasHumano`).

- [ ] **Passo 4: Catálogo, registro, descrição**

Duas entradas em `catalogo/operacao.ts`: `risco: "critico"`, `pacotes: ["organizar"]`, `apenasHumano: true`, `oQueToca: "Regras automáticas"`, `explicacao` "Cria ou altera o que a empresa deixa acontecer sozinho. A regra nasce desligada; só passa a falar com clientes quando uma pessoa liga." Registre ambas em `tools/index.ts` (import e lista, junto de `crmSetAutomationRuleActive`, linhas ~70 e ~169).

- [ ] **Passo 5: Rodar**

Run: `corepack pnpm vitest run lib/automation/regras-escrita.test.ts tests/unit/mcp-regras-escrita.test.ts tests/unit/catalogo-tools-leigo-friendly.test.ts tests/unit/catalogo-servido.test.ts "app/api/v1/automation-rules"`
Esperado: PASS (o teste de rota existente prova que a extração não mudou o comportamento).

- [ ] **Passo 6: Commit**

```bash
git add lib app tests supabase
git commit -m "feat(mcp): criar e atualizar regras automáticas (regra nasce desligada)"
```

---

### Tarefa 5: Fluxos de follow-up por MCP (rascunho, grafo, publicar com aprovação)

**Arquivos:**
- Criar: `lib/followup/escrita-de-fluxo.ts`, `lib/followup/escrita-de-fluxo.test.ts`, `lib/mcp/tools/fluxos-escrita.ts`
- Modificar: `app/api/v1/ai/followup-flows/route.ts` (POST), `app/api/v1/ai/followup-flows/[id]/route.ts` (PATCH), `app/api/v1/ai/followup-flows/[id]/publish/route.ts` (miolo ~linhas 60-170), `lib/mcp/tools/index.ts`, `lib/mcp/tools/catalogo/operacao.ts`, `lib/audit/actions.ts` (acrescentar `"followup_flow.published_by_mcp"`)
- Teste: `tests/unit/mcp-fluxos-escrita.test.ts`

**Interfaces:**
- Consome: `createFollowupFlowSchema`, `patchFollowupFlowSchema` (`lib/followup/api-schemas.ts`), `validateFlowForPublish`, `publishFollowupFlowVersion` (`lib/followup/publish.ts`), `rascunhoDoFluxo` (`lib/followup/rascunho.ts`).
- Produz: `criarFluxo`, `salvarFluxo`, `publicarFluxo(admin, { organizationId, pointerId, aprovadoPor, requestId }): Promise<ResultadoDeEscrita<{ versionId: string }>>` (mesmo `ResultadoDeEscrita` da T4, movido para `lib/api/resultado-de-escrita.ts` nesta tarefa e reimportado pela T4). Tools `crm_list_followup_flows`, `crm_get_followup_flow`, `crm_create_followup_flow`, `crm_update_followup_flow`, `crm_publish_followup_flow`.

- [ ] **Passo 1: Ler o publish inteiro**

Run: `sed -n 40,200p "app/api/v1/ai/followup-flows/[id]/publish/route.ts"`. O miolo (módulo `fluxos_atendimento`, allowlist `KINDS_COM_MOTOR`, etapa que não existe mais, `validateFlowForPublish`, `publishFollowupFlowVersion`, `audit("followup_flow.published")`) vira `publicarFluxo`, **igual**, recebendo `idioma` opcional para as mensagens traduzidas (a tool usa pt-BR).

- [ ] **Passo 2: Teste que falha (publicar exige aprovação)**

```ts
// tests/unit/mcp-fluxos-escrita.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { crmPublishFollowupFlow } from "@/lib/mcp/tools/fluxos-escrita";
import { z } from "zod";

describe("crm_publish_followup_flow", () => {
  const schema = z.object(crmPublishFollowupFlow.inputSchema);
  it("recusa publicar sem aprovado_por", () => {
    expect(schema.safeParse({ flow_id: "11111111-1111-4111-8111-111111111111" }).success).toBe(false);
  });
  it("recusa aprovado_por curto", () => {
    expect(schema.safeParse({ flow_id: "11111111-1111-4111-8111-111111111111", aprovado_por: "ok" }).success).toBe(false);
  });
  it("aceita com aprovador nomeado", () => {
    expect(schema.safeParse({ flow_id: "11111111-1111-4111-8111-111111111111", aprovado_por: "Régis" }).success).toBe(true);
  });
  it("é crítica e só de humano", () => {
    expect(crmPublishFollowupFlow.category).toBe("write");
    expect(crmPublishFollowupFlow.requiresRole).toBe("manager");
  });
});
```

- [ ] **Passo 3: Implementar**

```ts
// lib/mcp/tools/fluxos-escrita.ts (trecho da publicação)
const publicarShape = {
  flow_id: z.string().uuid(),
  aprovado_por: z.string().trim().min(3).max(80),
};

export const crmPublishFollowupFlow: McpToolDefinition<typeof publicarShape> = {
  name: "crm_publish_followup_flow",
  description:
    "Publica um fluxo de follow-up (a versão publicada passa a valer para clientes de verdade). Exige aprovado_por: " +
    "o nome da pessoa que revisou e aprovou o rascunho. O motivo é regra do produto: publicar é ato humano.",
  inputSchema: publicarShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  handler: async (input, ctx) => {
    const r = await publicarFluxo(ctx.supabase, {
      organizationId: ctx.organizationId,
      pointerId: input.flow_id,
      aprovadoPor: input.aprovado_por,
      requestId: ctx.requestId,
    });
    if (!r.ok) throw new Error(`${r.codigo}: ${r.mensagem}`);
    return { versao: r.dado.versionId };
  },
};
```

`publicarFluxo` grava, além do `followup_flow.published` de sempre, o `followup_flow.published_by_mcp` com `metadata: { aprovado_por }`. `crm_update_followup_flow` recebe `{ flow_id, nome?, draft_graph?, trigger_config?, handoff_policy? }` validados por `patchFollowupFlowSchema`, e **nunca** publica. `crm_create_followup_flow` recebe `createFollowupFlowSchema` (`name`, `surface` opcional). As listas/leitura usam `followup_flow_pointers` com `organization_id` explícito e devolvem `draft_graph` e `active_version_id`.

Catálogo: `crm_publish_followup_flow` e `crm_update_followup_flow` `risco: "critico"`, `apenasHumano: true`; `crm_create_followup_flow` `risco: "atencao"`; as duas leituras `risco: "seguro"`. `pacotes: ["escalar", "organizar"]`.

- [ ] **Passo 4: Rodar**

Run: `corepack pnpm vitest run tests/unit/mcp-fluxos-escrita.test.ts lib/followup/escrita-de-fluxo.test.ts "app/api/v1/ai/followup-flows" tests/unit/catalogo-tools-leigo-friendly.test.ts`
Esperado: PASS.

- [ ] **Passo 5: Commit**

```bash
git add lib app tests
git commit -m "feat(mcp): fluxos de follow-up (rascunho, grafo e publicação com aprovação)"
```

---

### Tarefa 6: Funil, canais, variáveis e horário comercial por MCP

**Arquivos:**
- Criar: `lib/mcp/tools/canais-escrita.ts`, `lib/canais/variaveis-escrita.ts`, `lib/canais/variaveis-escrita.test.ts`
- Modificar: `app/api/v1/pipelines/route.ts` (POST ~linhas 71-130) e `_handler.ts`/`_funis.ts` (se o miolo já estiver lá, chame-o direto), `lib/mcp/tools/pipelines.ts`, `lib/mcp/tools/index.ts`, `lib/mcp/tools/catalogo/operacao.ts`
- Teste: `tests/unit/mcp-canais-escrita.test.ts`

**Interfaces:**
- Consome: `CHAVE_DE_VARIAVEL`, `CHAVES_RESERVADAS` (T1).
- Produz: tools `crm_create_pipeline`, `crm_list_channels` (read), `crm_set_channel_variables`. (`crm_set_channel_business_hours` entra na T12.)

- [ ] **Passo 1: Pipeline**

Run: `sed -n 60,140p app/api/v1/pipelines/route.ts` e `grep -n "export" app/api/v1/pipelines/_handler.ts app/api/v1/pipelines/_funis.ts`. O `GET` já chama `listPipelinesHandler(ctx.supabase, {organization_id, actor, requestId}, …)` no MCP; o `POST` deve ter um `createPipelineHandler` análogo em `_handler.ts`. Se existir, a tool `crm_create_pipeline` o chama (mesmo padrão de `crm_list_pipelines`); se o miolo estiver inline na rota, extraia para `_handler.ts` como `createPipelineHandler`. Entrada: `{ name: string, slug?: string, description?: string, stages?: Array<{ name: string, color?: string, is_won?: boolean, is_lost?: boolean }> }`. Se `stages` vier, cria as etapas na ordem pelo mesmo escritor de etapas que `crm_create_stage` já usa (`grep -rn "crm_create_stage" lib/mcp/tools`). Etapa com `is_won: true` é o que faz "mover para Cliente Novo" fechar o negócio como ganho (ver T22).

- [ ] **Passo 2: Teste de variáveis que falha**

```ts
// lib/canais/variaveis-escrita.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validarVariaveis } from "@/lib/canais/variaveis-escrita";

describe("validarVariaveis", () => {
  it("aceita chaves válidas", () => {
    expect(validarVariaveis({ pix_chave: "51999600190" })).toEqual({ ok: true });
  });
  it("recusa chave reservada", () => {
    expect(validarVariaveis({ nome: "x" })).toEqual({ ok: false, motivo: "chave_reservada:nome" });
  });
  it("recusa chave com formato inválido", () => {
    expect(validarVariaveis({ "Pix Chave": "x" })).toEqual({ ok: false, motivo: "chave_invalida:Pix Chave" });
  });
  it("recusa valor vazio ou acima de 2000", () => {
    expect(validarVariaveis({ a: "" }).ok).toBe(false);
    expect(validarVariaveis({ a: "x".repeat(2001) }).ok).toBe(false);
  });
});
```

- [ ] **Passo 3: Implementar**

```ts
// lib/canais/variaveis-escrita.ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { audit } from "@/lib/audit";
import { CHAVE_DE_VARIAVEL, CHAVES_RESERVADAS } from "@/lib/canais/variaveis";

export type ValidacaoDeVariaveis = { ok: true } | { ok: false; motivo: string };

export function validarVariaveis(valores: Record<string, string>): ValidacaoDeVariaveis {
  for (const [chave, valor] of Object.entries(valores)) {
    if ((CHAVES_RESERVADAS as readonly string[]).includes(chave)) return { ok: false, motivo: `chave_reservada:${chave}` };
    if (!CHAVE_DE_VARIAVEL.test(chave)) return { ok: false, motivo: `chave_invalida:${chave}` };
    if (valor.length < 1 || valor.length > 2000) return { ok: false, motivo: `valor_invalido:${chave}` };
  }
  return { ok: true };
}

/** `channelSessionId = null` grava o PADRÃO da organização. Upsert por (org, canal, chave). */
export async function gravarVariaveisDoCanal(
  admin: SupabaseClient,
  entrada: { organizationId: string; channelSessionId: string | null; valores: Record<string, string>; requestId: string; actorUserId: string | null },
): Promise<void> {
  const v = validarVariaveis(entrada.valores);
  if (!v.ok) throw new Error(v.motivo);
  if (entrada.channelSessionId !== null) {
    const { data, error } = await admin
      .from("channel_sessions")
      .select("id")
      .eq("organization_id", entrada.organizationId)
      .eq("id", entrada.channelSessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("canal_nao_encontrado");
  }
  for (const [chave, value_text] of Object.entries(entrada.valores)) {
    // Sem onConflict por expressão no PostgREST: atualiza se existe, senão insere.
    const base = admin
      .from("channel_variables")
      .update({ value_text, updated_at: new Date().toISOString() })
      .eq("organization_id", entrada.organizationId)
      .eq("chave", chave);
    const alvo = entrada.channelSessionId === null ? base.is("channel_session_id", null) : base.eq("channel_session_id", entrada.channelSessionId);
    const { data: atualizadas, error } = await alvo.select("id");
    if (error) throw new Error(error.message);
    if ((atualizadas ?? []).length === 0) {
      const { error: erroInsert } = await admin.from("channel_variables").insert({
        organization_id: entrada.organizationId,
        channel_session_id: entrada.channelSessionId,
        chave,
        value_text,
      });
      if (erroInsert) throw new Error(erroInsert.message);
    }
  }
  void audit({
    action: "channel_variables.updated",
    actorUserId: entrada.actorUserId,
    organizationId: entrada.organizationId,
    resourceType: "channel_session",
    resourceId: entrada.channelSessionId ?? entrada.organizationId,
    requestId: entrada.requestId,
    metadata: { chaves: Object.keys(entrada.valores) },
  });
}
```

`crm_list_channels` devolve, por canal da organização: `id`, `display_name`, `phone_number`, `provider`, `status`, `responsaveis` (nomes via `responsavelDoCanal` + `nomesDosAtendentes`), `variaveis` (mescladas, valores **truncados em 40 caracteres**: a PIX é dado financeiro que vai ao contexto de um modelo, devolva só as chaves e um prefixo) e `horario_comercial` (T12). `crm_set_channel_variables` recebe `{ channel_session_id: uuid | null, valores: Record<string,string> }`; `risco: "atencao"`.

- [ ] **Passo 4: Rodar**

Run: `corepack pnpm vitest run lib/canais tests/unit/mcp-canais-escrita.test.ts tests/unit/catalogo-tools-leigo-friendly.test.ts "app/api/v1/pipelines"`
Esperado: PASS.

- [ ] **Passo 5: Commit**

```bash
git add lib app tests
git commit -m "feat(mcp): criar funil, listar canais e gravar variáveis do canal"
```

---

### Tarefa 7: Respostas rápidas por MCP (texto, setores)

**Arquivos:**
- Criar: `lib/escale/conversas/respostas-escrita.ts`, `lib/escale/conversas/respostas-escrita.test.ts`, `lib/mcp/tools/respostas-escrita.ts`
- Modificar: `app/api/v1/respostas-rapidas/route.ts` (POST ~linhas 65-125), `app/api/v1/respostas-rapidas/[id]/route.ts` (PATCH/DELETE), `lib/mcp/tools/index.ts`, `lib/mcp/tools/catalogo/atendimento.ts`

**Interfaces:**
- Consome: `respostaSchema`, `gravarExtras`, `lerRespostas` (`lib/escale/conversas/respostas*.ts`).
- Produz: `criarResposta(db, { organizationId, donoUserId: string | null, criadoPor: string | null, dados: NovaResposta, requestId }): Promise<ResultadoDeEscrita<{ id: string }>>`, `atualizarResposta`, `excluirResposta`; tools `crm_list_quick_replies` (read), `crm_create_quick_reply`, `crm_update_quick_reply`, `crm_delete_quick_reply`.

- [ ] **Passo 1: Teste que falha**

```ts
// lib/escale/conversas/respostas-escrita.test.ts
// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/escale/conversas/respostas-banco", () => ({ gravarExtras: vi.fn(async () => undefined) }));

import { criarResposta } from "@/lib/escale/conversas/respostas-escrita";

const ORG = "11111111-1111-4111-8111-111111111111";

describe("criarResposta", () => {
  it("compartilhada: owner_user_id nulo e atalho sem a barra", async () => {
    const gravado: Array<Record<string, unknown>> = [];
    const db = {
      from: () => ({
        insert: (v: Record<string, unknown>) => {
          gravado.push(v);
          return { select: () => ({ single: async () => ({ data: { id: "t1" }, error: null }) }) };
        },
      }),
    } as unknown as SupabaseClient;
    const r = await criarResposta(db, {
      organizationId: ORG,
      donoUserId: null,
      criadoPor: null,
      requestId: "req",
      dados: { atalho: "fechamento", corpo: "PIX {{canal.pix_chave}}", canais: ["whatsapp"], compartilhar: true, todos_os_setores: true, setores: [] },
    });
    expect(r).toEqual({ ok: true, dado: { id: "t1" } });
    expect(gravado[0]).toMatchObject({ organization_id: ORG, owner_user_id: null, shortcut: "fechamento", title: "fechamento" });
  });
});
```

- [ ] **Passo 2: Extrair e expor**

`criarResposta` recebe o `db` (a rota passa o client de sessão ou o admin conforme a regra de compartilhar que **fica na rota**, pois depende do papel do usuário). A tool usa `ctx.supabase` (admin), `donoUserId: null` (compartilhada, sem dono humano) e `criadoPor: null`. Atalho normalizado: `atalho.replace(/^\/+/, "")` (o Datacrazy mostra `/Dados`; o campo guarda `Dados`; `comBarra` já exibe a barra). Setores: a visibilidade "por atendente" do Datacrazy é, no Escale, **por setor** (`crm_respostas_rapidas_setores`); a tool aceita `setores: uuid[]` e `todos_os_setores`. Para restringir a uma pessoa, crie um setor com uma pessoa só (isso existe em Configurações › Setores). Com as variáveis de canal (T1/T2), a maioria das restrições deixa de ser necessária.

`risco: "atencao"` (é texto que a equipe vai enviar), `pacotes: ["atender"]`, não `apenasHumano`.

- [ ] **Passo 3: Rodar**

Run: `corepack pnpm vitest run lib/escale/conversas tests/unit/catalogo-tools-leigo-friendly.test.ts "app/api/v1/respostas-rapidas"`
Esperado: PASS.

- [ ] **Passo 4: Commit**

```bash
git add lib app tests
git commit -m "feat(mcp): CRUD de respostas rápidas"
```

---

## Fase 3 — Gatilhos e ações que faltam

### Tarefa 8: Gatilho "mensagem enviada contendo palavra-chave" (capacidade B)

**Arquivos:**
- Criar: `lib/automation/palavra-chave.ts`, `lib/automation/palavra-chave.test.ts`
- Modificar: `lib/schemas/webhooks.ts` (`ENTIDADE_ESPERADA_POR_GATILHO` ~linha 28-95; `createAutomationRuleSchema` ~448 e `updateAutomationRuleSchema` ~534: `superRefine` da config), `lib/automation/engine.ts` (`buildContext` mensagem; filtro `applicable` ~linha 303), `app/api/v1/messages/_handler.ts:1413` (payload do `emit_event`), `app/app/webhooks/_components/labels.ts`, `lib/i18n/dicionario.ts`
- Teste: `lib/automation/mensagem-enviada-no-motor.test.ts` (modelo: `lib/automation/regra-por-fonte-no-motor.test.ts`)

**Interfaces:**
- Consome: `canalDoContexto` (T3), `criarRegra` (T4).
- Produz: gatilho `"message.sent"`; `trigger_config = { palavra_chave: string (1..200); modo: "contem" | "igual"; channel_session_id?: uuid }`; `casaComPalavraChave(texto: string, palavra: string, modo: "contem" | "igual"): boolean`; `context.message = { id, body, sent_via, sent_by_user_id, direction, channel_session_id, conversation_id }`.

**Fatos verificados que sustentam o desenho:** o `sendMessageHandler` emite `message.sent` com `entity_kind='message'`, `entity_id=message.id` e payload `{status, conversation_id}`; o trigger do banco só emite `message.sent` em INSERT com `status='sent'` (eco de aparelho externo), então **uma mensagem gera um único `message.sent`** por caminho. Mensagem de automação/IA/sistema também gera o evento: o filtro por quem enviou (`sent_via`) é o anti-laço.

- [ ] **Passo 1: Teste da função pura (falha)**

```ts
// lib/automation/palavra-chave.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { casaComPalavraChave } from "@/lib/automation/palavra-chave";

describe("casaComPalavraChave", () => {
  const texto = "Põe estes dados, acessa o aplicativo e pode testar!";
  it("contém, sem diferenciar caixa nem acento", () => {
    expect(casaComPalavraChave(texto, "põe estes dados", "contem")).toBe(true);
    expect(casaComPalavraChave(texto, "POE ESTES DADOS", "contem")).toBe(true);
  });
  it("ignora espaços repetidos e quebras de linha", () => {
    expect(casaComPalavraChave("Logo  nosso\nnúmero do suporte vai te chamar", "logo nosso número do suporte", "contem")).toBe(true);
  });
  it("igual exige a mensagem inteira", () => {
    expect(casaComPalavraChave("Dados", "dados", "igual")).toBe(true);
    expect(casaComPalavraChave(texto, "põe estes dados", "igual")).toBe(false);
  });
  it("não casa frase diferente", () => {
    expect(casaComPalavraChave(texto, "logo nosso número", "contem")).toBe(false);
  });
});
```

- [ ] **Passo 2: Implementar a função**

```ts
// lib/automation/palavra-chave.ts
function normalizar(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function casaComPalavraChave(texto: string, palavra: string, modo: "contem" | "igual"): boolean {
  const t = normalizar(texto);
  const p = normalizar(palavra);
  if (p === "") return false;
  return modo === "igual" ? t === p : t.includes(p);
}

/** Quem enviou conta como "o atendente": pessoa no sistema ou no aparelho. Automação, IA e sistema NÃO (anti-laço). */
export const ORIGENS_HUMANAS = ["user", "external_device"] as const;
export function foiEnviadaPorPessoa(sentVia: string | null | undefined): boolean {
  return (ORIGENS_HUMANAS as readonly string[]).includes(sentVia ?? "");
}
```

- [ ] **Passo 3: Teste do motor (falha) e implementação**

O teste do motor segue o dublê de `regra-por-fonte-no-motor.test.ts` (banco falso por tabela + `registerAction`). Casos, todos com `row.event_type = "message.sent"` e a regra `trigger_config = { palavra_chave: "Põe estes dados", modo: "contem" }`: (1) mensagem de `sent_via='user'` com a frase → a ação roda; (2) mesma frase com `sent_via='automation'` → **não** roda (anti-laço); (3) `sent_via='user'` sem a frase → não roda; (4) `payload.status = 'failed'` → não roda; (5) regra com `channel_session_id` de outro canal → não roda; (6) regra sem `channel_session_id` roda em qualquer canal.

Mudanças:

1. `ENTIDADE_ESPERADA_POR_GATILHO`: acrescentar `"message.sent": "message",` junto de `"message.received"`. Isso, sozinho, faz `automationRulesHandler` assinar o evento (`events: [...TRIGGER_EVENTS]`) — o comentário do arquivo explica por quê.

2. Schema da config (junto de `exigirConfigDosGatilhosDeTempo`):

```ts
const configDaPalavraChaveSchema = z.object({
  palavra_chave: z.string().trim().min(1).max(200),
  modo: z.enum(["contem", "igual"]).default("contem"),
  channel_session_id: z.string().uuid().optional(),
});

function exigirPalavraChave(regra: { trigger_event: string; trigger_config?: Record<string, unknown> }, ctx: z.RefinementCtx): void {
  if (regra.trigger_event !== "message.sent") return;
  if (configDaPalavraChaveSchema.safeParse(regra.trigger_config).success) return;
  ctx.addIssue({ code: "custom", path: ["trigger_config"], message: "Informe a palavra-chave (palavra_chave) da mensagem enviada." });
}
```

chame `exigirPalavraChave` nos mesmos `superRefine` que já chamam `exigirConfigDosGatilhosDeTempo` (create e update).

3. `buildContext`, ramo `entity_kind === "message"`: além do contato, carregue a mensagem:

```ts
    const { data: mensagem } = await admin
      .from("messages")
      .select("id, body, sent_via, sent_by_user_id, direction, channel_session_id, conversation_id")
      .eq("id", row.entity_id)
      .eq("organization_id", org)
      .maybeSingle();
    if (mensagem) context.message = mensagem;
```

4. Filtro `applicable` (engine.ts ~linha 303): para `row.event_type === "message.sent"` acrescente

```ts
    if (row.event_type === "message.sent") {
      const cfg = configDaPalavraChaveSchema.safeParse(rule.trigger_config);
      const msg = context.message as { body?: string | null; sent_via?: string | null; channel_session_id?: string | null } | undefined;
      if (!cfg.success || !msg || row.payload.status === "failed") return false;
      if (!foiEnviadaPorPessoa(msg.sent_via)) return false;
      if (cfg.data.channel_session_id && cfg.data.channel_session_id !== msg.channel_session_id) return false;
      if (!casaComPalavraChave(msg.body ?? "", cfg.data.palavra_chave, cfg.data.modo)) return false;
    }
```

(exporte `configDaPalavraChaveSchema` de `lib/schemas/webhooks.ts`.)

5. `_handler.ts:1413`: o payload do `emit_event` passa a ser `{ status: message.status, conversation_id: c.id, contact_id: c.contact_id, channel_session_id: c.channel_session_id }` (confirme os nomes das colunas no `select` da conversa `c` dentro do handler; se `contact_id` não estiver no `select`, acrescente). Isso também alimenta `canalDoContexto` (T3) e `contextoDoCanal` (T2): **o `{{canal.pix_chave}}` na resposta da regra sai com o canal certo**.

6. Rótulo "Mensagem enviada pela equipe" em `labels.ts` e `es` em `dicionario.ts`; o seletor de gatilho da tela de regra mostra o campo "palavra-chave" quando o gatilho for esse (siga o padrão dos campos de `lead.silent_for` no editor: `grep -rn "silent_for" app/app/webhooks --include=*.tsx -l`).

- [ ] **Passo 4: Rodar**

Run: `corepack pnpm vitest run lib/automation lib/schemas tests/unit/automacao-gatilhos-e-rotulos.test.ts` (se o nome não existir, rode `grep -rln "TRIGGER_LABELS\|labels" tests/unit | head` e inclua o teste de rótulos que a busca achar).
Esperado: PASS, incluindo o gate que obriga rótulo para cada gatilho.

- [ ] **Passo 5: Commit**

```bash
git add lib app tests
git commit -m "feat: gatilho de mensagem enviada pela equipe com palavra-chave"
```

---

### Tarefa 9: Remover tag (regras e fluxos) (capacidade F)

**Arquivos:**
- Criar: `lib/automation/actions/remove-tag.ts`, `lib/automation/actions/remove-tag.test.ts`
- Modificar: `lib/schemas/webhooks.ts` (acrescentar a ação em `acoesFixas`), `lib/automation/actions/register-all.ts`, `lib/followup/graph-schema.ts:316` (`editLeadTagConfigSchema`), `lib/followup/node-handlers.ts` (handler do nó `edit_lead_tag`), `lib/followup/validate-publish.ts` (`tag_ausente`), `app/app/ai/followups/[id]/_components/forms/EditLeadTagForm.tsx`, `app/app/ai/followups/[id]/_components/nodes/EditLeadTagNode.tsx`, `lib/followup/eventos-legiveis.ts`, `app/app/webhooks/_components/labels.ts`, `lib/i18n/dicionario.ts`

**Interfaces:**
- Consome: padrão de `lib/automation/actions/add-tag.ts` (leia-o inteiro antes: ele define como o negócio é lido e como a tag é gravada).
- Produz: ação `{ type: "remove_tag", config: { tags: string[] } }` (1 a 10 tags de até 60 caracteres, mesmo limite do `add_tag`); nó `edit_lead_tag` com `config: { tags: string[]; remover?: string[] }`.

- [ ] **Passo 1: Ler** `lib/automation/actions/add-tag.ts` e o `case "edit_lead_tag"` em `node-handlers.ts` (`grep -n "edit_lead_tag" lib/followup/node-handlers.ts`).

- [ ] **Passo 2: Testes que falham**

```ts
// lib/automation/actions/remove-tag.test.ts  (modelo: add-tag.test.ts — copie o dublê do banco dele)
// Casos: (1) lead com ["Tem interese","Já testou"] e config { tags: ["Tem interese"] } -> grava ["Já testou"];
// (2) tag que o lead não tem -> status "success" sem escrever (idempotente);
// (3) sem lead no contexto -> "skipped" com reason "missing_input";
// (4) escreve filtrando organization_id e id do lead.
```

```ts
// acrescentar em lib/followup/graph-schema.test.ts
import { editLeadTagConfigSchema } from "@/lib/followup/graph-schema";
it("edit_lead_tag aceita remover", () => {
  expect(editLeadTagConfigSchema.safeParse({ tags: ["Já testou"], remover: ["Tem interese"] }).success).toBe(true);
});
it("edit_lead_tag sem nada para fazer continua rascunho válido, mas o publish recusa", () => {
  expect(editLeadTagConfigSchema.safeParse({ tags: [] }).success).toBe(true);
});
```

- [ ] **Passo 3: Implementar**

Em `graph-schema.ts`:

```ts
export const editLeadTagConfigSchema = z.strictObject({
  tags: z.array(z.string().max(60, "Tag muito longa: máximo de 60 caracteres.")).max(10, "No máximo 10 tags por caixa."),
  /** Tags a TIRAR do negócio (o `remove_tag` do motor de regras). Ausente = não tira nenhuma. */
  remover: z.array(z.string().max(60)).max(10).optional(),
});
```

`validate-publish.ts`: `tag_ausente` passa a valer só quando `tags` **e** `remover` estão vazios. No handler do nó, depois do merge de `tags`, aplique a remoção com a mesma leitura/gravação (um único `update` do array resultante, filtrando `organization_id`). `remove-tag.ts` é o espelho de `add-tag.ts` com `filter` em vez de merge, registrado em `register-all.ts`. Form e visual do nó mostram "Tirar: …" quando `remover` existir. `eventos-legiveis.ts` ganha a frase "Tirou a tag X" (com `es`).

- [ ] **Passo 4: Rodar**

Run: `corepack pnpm vitest run lib/automation/actions/remove-tag.test.ts lib/followup/graph-schema.test.ts lib/followup/validate-publish.test.ts lib/followup/node-handlers.test.ts lib/followup/eventos-legiveis.test.ts`
Esperado: PASS.

- [ ] **Passo 5: Commit**

```bash
git add lib app
git commit -m "feat: remover tag em regras e fluxos"
```

---

### Tarefa 10: Provas de contrato do que já existe (capacidades E e H)

**Arquivos:**
- Criar: `tests/unit/paridade-datacrazy-contrato.test.ts`

Não há código de produto nesta tarefa: ela fixa em teste que **o que já existe cobre** o Datacrazy, para que ninguém quebre isso depois e para o executor não reescrever o que existe.

- [ ] **Passo 1: Escrever o teste**

```ts
// tests/unit/paridade-datacrazy-contrato.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { flowGraphSchema, matchReplyConfigSchema } from "@/lib/followup/graph-schema";
import { createAutomationRuleSchema } from "@/lib/schemas/webhooks";

const MIN = 60_000;

describe("H — esperar resposta com tempo-limite (Datacrazy: 30/35/60 min)", () => {
  it.each([30, 35, 60])("match_reply aceita grace_timeout de %i min", (min) => {
    const r = matchReplyConfigSchema.safeParse({
      branches: [{ id: "plano", label: "Plano", op: "contem", pattern: "mes" }],
      grace_timeout_ms: min * MIN,
    });
    expect(r.success).toBe(true);
  });
});

describe("E — avisar o atendente quando o lead clica no botão", () => {
  it("regra lead.tag_added -> create_task para o dono do negócio é válida", () => {
    const r = createAutomationRuleSchema.safeParse({
      name: "Lead clicou botão",
      trigger_event: "lead.tag_added",
      trigger_config: {},
      conditions: [{ field: "tag", op: "eq", value: "Clicou Botao" }],
      actions: [{ type: "create_task", config: { titulo: "Lead clicou: {{contact.name}}", vence_em_dias: 0, atribuir_a: "dono_do_lead", prioridade: "high" } }],
    });
    expect(r.success).toBe(true);
  });
});

describe("grafo de pós-teste cabe no schema atual", () => {
  it("existe o schema do grafo", () => {
    expect(flowGraphSchema).toBeDefined();
  });
});
```

Se o nome do campo da condição de tag em `lead.tag_added` for outro, ajuste lendo `grep -rn "tag_added" lib/automation lib/schemas | head` — a condição correta é a que o editor de regra oferece para esse gatilho.

- [ ] **Passo 2: Rodar**

Run: `corepack pnpm vitest run tests/unit/paridade-datacrazy-contrato.test.ts`
Esperado: PASS (se o `branches[]` do `matchReplyBranchSchema` exigir outros campos, ajuste o fixture ao schema real lido em `graph-schema.ts:140-172`).

- [ ] **Passo 3: Commit**

```bash
git add tests/unit/paridade-datacrazy-contrato.test.ts
git commit -m "test: contrato do que já cobre o Datacrazy (espera com tempo-limite e aviso ao atendente)"
```

---

### Tarefa 11: Espera curta (30 s) nos fluxos (capacidade G, parte 1)

**Arquivos:**
- Modificar: `lib/followup/graph-schema.ts:107` (piso do `wait` fixo), o formulário do nó de espera (`grep -rn "300_000\|300000" app/app/ai/followups lib/followup --include=*.ts --include=*.tsx | grep -v test`)
- Teste: `lib/followup/graph-schema.test.ts`

**Interfaces:** `waitConfigSchema` fixo passa de `min(300_000)` para `min(30_000)`.

**Por que 30 s e não menos:** o `followup-flow-worker` roda por cron de 1 minuto (`docker/scheduler/entrypoint.sh`). Espera de 30 s significa "no próximo tique", entre 30 e 90 s. Pausas de 4 s entre mensagens **não** são esperas de fluxo: são o `pausa_ms` do passo de mídia (T14).

- [ ] **Passo 1: Teste que falha**

```ts
import { waitConfigSchema } from "@/lib/followup/graph-schema";
it("wait fixo aceita 30 s", () => {
  expect(waitConfigSchema.safeParse({ mode: "fixed", duration_ms: 30_000 }).success).toBe(true);
});
it("wait fixo recusa menos de 30 s", () => {
  expect(waitConfigSchema.safeParse({ mode: "fixed", duration_ms: 29_999 }).success).toBe(false);
});
```

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run lib/followup/graph-schema.test.ts` (FAIL no primeiro caso).

- [ ] **Passo 3: Trocar** `min(300_000)` por `min(30_000)` em `duration_ms` do modo `fixed` e atualizar o comentário. Ajuste o formulário do nó (mínimo e unidade "segundos" quando < 5 min) e o texto de ajuda: "A precisão é de um minuto".

- [ ] **Passo 4: Rodar** — `corepack pnpm vitest run lib/followup`. Esperado: PASS (testes que fixavam o piso antigo, se houver, são atualizados no mesmo commit: `grep -rn "300_000" lib/followup --include=*.test.ts`).

- [ ] **Passo 5: Commit**

```bash
git add lib app
git commit -m "feat: espera fixa a partir de 30 segundos nos fluxos"
```

---

### Tarefa 12: Horário comercial por dia da semana no canal (capacidade G, parte 2)

**Arquivos:**
- Criar: `supabase/migrations/20261127130000_9408_horario_comercial_do_canal.sql`, `lib/canais/horario-comercial.ts`, `lib/canais/horario-comercial.test.ts`, `tests/invariants/channel-business-hours-rls.test.ts`
- Modificar: `supabase/baseline.sql` (apêndice), `lib/followup/janela-de-disparo.ts` (laço de `decidirAdiamentoPorJanela`, ~linhas 160-195), `lib/automation/actions/send-whatsapp.ts` (`postponeUntil`), `lib/mcp/tools/canais-escrita.ts` (tool `crm_set_channel_business_hours`), `lib/mcp/tools/catalogo/operacao.ts`, `lib/audit/actions.ts` (`"channel_business_hours.updated"`)

**Interfaces:**
- Produz: `FaixaComercial = { diaDaSemana: number /*0=dom..6=sáb*/; inicioMin: number; fimMin: number }`; `proximaAberturaComercial(agora: Date, fuso: string, faixas: readonly FaixaComercial[]): Date | null` (`null` = aberto agora, ou sem faixas configuradas); `lerHorarioComercial(admin, organizationId, channelSessionId): Promise<FaixaComercial[]>`; `adiarAteHorarioComercial(admin, organizationId, channelSessionId, agora?): Promise<string | null>`.

**Por que tabela nova e não `channel_knobs`:** `channel_knobs` é hora cheia, um intervalo, e é compartilhado com o agente de IA e a prospecção. Dois horários (seg–sex 09:30–23:00 e sáb–dom 09:30–22:00) não cabem, e mexer na régua do pacing tem raio de explosão maior que este pedido. A faixa nova entra como **terceira régua** no laço que já compõe a janela do canal e a faixa do agente (comentário de `decidirAdiamentoPorJanela`: pula de abertura em abertura até todas concordarem). Sem faixas configuradas, nada muda (compatível com todo cliente existente).

- [ ] **Passo 1: Teste que falha**

```ts
// lib/canais/horario-comercial.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { proximaAberturaComercial, type FaixaComercial } from "@/lib/canais/horario-comercial";

const SP = "America/Sao_Paulo"; // UTC-3 o ano todo desde 2019
const MIN = (h: number, m: number) => h * 60 + m;
// ONPLAY: seg–sex 09:30–23:00, sáb–dom 09:30–22:00
const faixas: FaixaComercial[] = [
  ...[1, 2, 3, 4, 5].map((d) => ({ diaDaSemana: d, inicioMin: MIN(9, 30), fimMin: MIN(23, 0) })),
  ...[6, 0].map((d) => ({ diaDaSemana: d, inicioMin: MIN(9, 30), fimMin: MIN(22, 0) })),
];
const utc = (iso: string) => new Date(iso);

describe("proximaAberturaComercial", () => {
  it("aberto: terça 14:00 em SP -> null", () => {
    expect(proximaAberturaComercial(utc("2026-11-03T17:00:00Z"), SP, faixas)).toBeNull();
  });
  it("antes de abrir: terça 08:00 -> terça 09:30", () => {
    expect(proximaAberturaComercial(utc("2026-11-03T11:00:00Z"), SP, faixas)?.toISOString()).toBe("2026-11-03T12:30:00.000Z");
  });
  it("depois de fechar na sexta 23:30 -> sábado 09:30", () => {
    expect(proximaAberturaComercial(utc("2026-11-07T02:30:00Z"), SP, faixas)?.toISOString()).toBe("2026-11-07T12:30:00.000Z");
  });
  it("sábado fecha às 22:00: sábado 22:30 -> domingo 09:30", () => {
    expect(proximaAberturaComercial(utc("2026-11-08T01:30:00Z"), SP, faixas)?.toISOString()).toBe("2026-11-08T12:30:00.000Z");
  });
  it("sem faixas configuradas -> null (não restringe)", () => {
    expect(proximaAberturaComercial(utc("2026-11-03T03:00:00Z"), SP, [])).toBeNull();
  });
});
```

(Confira as datas: 2026-11-03 é terça; 17:00Z = 14:00 SP; 11:00Z = 08:00 SP; 2026-11-07T02:30Z = sexta 23:30 SP; 2026-11-08T01:30Z = sábado 22:30 SP.)

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run lib/canais/horario-comercial.test.ts`.

- [ ] **Passo 3: Migration**

```sql
-- manifest: horário comercial por dia da semana e por canal (faixas em minutos), terceira régua do envio automático
create table if not exists public.channel_business_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_session_id uuid not null,
  dia_da_semana smallint not null,
  inicio_min smallint not null,
  fim_min smallint not null,
  created_at timestamptz not null default now(),
  constraint channel_business_hours_dia check (dia_da_semana between 0 and 6),
  constraint channel_business_hours_faixa check (inicio_min >= 0 and fim_min <= 1440 and inicio_min < fim_min),
  constraint channel_business_hours_canal_fk foreign key (organization_id, channel_session_id)
    references public.channel_sessions(organization_id, id) on delete cascade,
  constraint channel_business_hours_unica unique (organization_id, channel_session_id, dia_da_semana)
);
alter table public.channel_business_hours enable row level security;
drop policy if exists tenant_isolation_channel_business_hours_all on public.channel_business_hours;
create policy tenant_isolation_channel_business_hours_all on public.channel_business_hours
  for all
  using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));
revoke all on public.channel_business_hours from anon;
```

Mesmo bloco no apêndice do `baseline.sql`; teste de RLS no padrão da T1 (leitura isolada por organização, escrita só `manager`, unicidade por dia).

- [ ] **Passo 4: Implementar**

```ts
// lib/canais/horario-comercial.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface FaixaComercial {
  diaDaSemana: number;
  inicioMin: number;
  fimMin: number;
}

const DIA_POR_NOME: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function relogioLocal(instante: Date, fuso: string): { dia: number; minutos: number; segundos: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instante);
  const pega = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "0";
  return {
    dia: DIA_POR_NOME[pega("weekday")] ?? 0,
    minutos: Number(pega("hour")) * 60 + Number(pega("minute")),
    segundos: Number(pega("second")),
  };
}

/**
 * `null` = pode enviar agora (dentro de uma faixa) OU o canal não tem faixa
 * nenhuma (sem restrição). Senão, o instante da próxima abertura.
 * Nota: soma de minutos corridos; o fuso brasileiro não tem horário de verão
 * desde 2019. Um fuso com DST pode errar por 1 h no dia da virada, e o laço de
 * `decidirAdiamentoPorJanela` reavalia na volta seguinte.
 */
export function proximaAberturaComercial(
  agora: Date,
  fuso: string,
  faixas: readonly FaixaComercial[],
): Date | null {
  if (faixas.length === 0) return null;
  const l = relogioLocal(agora, fuso);
  const hoje = faixas.find((f) => f.diaDaSemana === l.dia);
  if (hoje && l.minutos >= hoje.inicioMin && l.minutos < hoje.fimMin) return null;
  for (let passo = 0; passo <= 7; passo += 1) {
    const f = faixas.find((x) => x.diaDaSemana === (l.dia + passo) % 7);
    if (!f) continue;
    if (passo === 0 && l.minutos >= f.inicioMin) continue; // já passou da abertura de hoje (e não está aberto)
    const minutos = passo * 1440 + f.inicioMin - l.minutos;
    return new Date(agora.getTime() + minutos * 60_000 - l.segundos * 1000);
  }
  return null;
}

export async function lerHorarioComercial(
  admin: SupabaseClient,
  organizationId: string,
  channelSessionId: string,
): Promise<FaixaComercial[]> {
  const { data, error } = await admin
    .from("channel_business_hours")
    .select("dia_da_semana, inicio_min, fim_min")
    .eq("organization_id", organizationId)
    .eq("channel_session_id", channelSessionId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ dia_da_semana: number; inicio_min: number; fim_min: number }>).map((r) => ({
    diaDaSemana: r.dia_da_semana,
    inicioMin: r.inicio_min,
    fimMin: r.fim_min,
  }));
}
```

Integração no laço de `decidirAdiamentoPorJanela` (`janela-de-disparo.ts`): antes do laço, `const faixasComerciais = sessionId === null ? [] : await lerHorarioComercial(admin, entrada.organizationId, sessionId);` e `fuso` passa a ser lido sempre (hoje só lê quando há `followup`; leia o fuso da organização também quando `faixasComerciais.length > 0`). Dentro do laço, depois da checagem da faixa do follow-up:

```ts
    const aberturaComercial = fuso === null ? null : proximaAberturaComercial(instante, fuso, faixasComerciais);
    if (aberturaComercial !== null) {
      instante = aberturaComercial;
      motivo = "business_hours";
      continue;
    }
```

Em `send-whatsapp.ts` (`postponeUntil`), depois do bloco `foraDaJanela`: leia faixas e fuso da organização e `return proximaAberturaComercial(...)?.toISOString() ?? null`. Escreva antes o teste de `decidirAdiamentoPorJanela` com faixas (acrescente em `lib/followup/janela-de-disparo.test.ts`) afirmando `reason: "business_hours"` para sexta 23:30.

`crm_set_channel_business_hours`: `{ channel_session_id: uuid, faixas: Array<{ dias: number[], inicio: "HH:MM", fim: "HH:MM" }> }` — substitui as faixas do canal (apaga e regrava os dias informados), valida `inicio < fim`, audit `channel_business_hours.updated`.

- [ ] **Passo 5: Rodar**

Run: `corepack pnpm vitest run lib/canais/horario-comercial.test.ts lib/followup/janela-de-disparo.test.ts lib/automation`
Esperado: PASS.

- [ ] **Passo 6: Commit**

```bash
git add supabase lib tests
git commit -m "feat: horário comercial por dia da semana no canal"
```

---

## Fase 4 — Mídia (capacidade C)

### Tarefa 13: Repositório de mídia da organização e upload por URL

**Arquivos:**
- Criar: `supabase/migrations/20261127140000_9409_ativos_de_midia.sql`, `lib/midia/ativos.ts`, `lib/midia/ativos.test.ts`, `tests/invariants/org-media-assets-rls.test.ts`, `lib/mcp/tools/midia-escrita.ts`
- Modificar: `supabase/baseline.sql` (apêndice), `lib/audit/actions.ts` (`"media_asset.created"`), `lib/mcp/tools/index.ts`, `lib/mcp/tools/catalogo/operacao.ts`

**Interfaces:**
- Consome: `assertUrlDeMidiaSegura` (já usado em `app/api/v1/messages/_handler.ts:621`, descubra o import com `grep -n "assertUrlDeMidiaSegura" app/api/v1/messages/_handler.ts`), `isMediaPathOwnedBy` (`lib/messaging/media/upload-validation.ts`).
- Produz: tabela `org_media_assets (id, organization_id, nome, mime, size_bytes, storage_path, created_at)`; `subirAtivoPorUrl(admin, { organizationId, nome, url, requestId, actorUserId }): Promise<{ id: string; mime: string; sizeBytes: number }>`; `copiarAtivoParaConversa(admin, { organizationId, assetId, conversationId }): Promise<{ storagePath: string; mime: string; tipo: "audio" | "image" | "video" | "document" }>`; tool `crm_upload_media_asset`.

**Desenho:** os arquivos ficam no bucket privado **já existente** `whatsapp-media`, em `{organization_id}/assets/{asset_id}/{nome}` (nenhum bucket novo, nenhum acesso público). Como `sendMessageHandler` só aceita `media_storage_path` dentro de `{org}/{conversa}/…` (anti-travessia), enviar um ativo = **copiar** o objeto para `{org}/{conversa}/auto-{uuid}.{ext}` (`storage.copy`) e mandar o novo caminho. Áudio: validar `audio/ogg` (a Meta não converte); outro formato é recusado no upload com mensagem clara (o Datacrazy do Hiago já usa `.ogg`; os `.wav` extras de `/apppago` ficam de fora).

- [ ] **Passo 1: Teste que falha**

```ts
// lib/midia/ativos.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { caminhoDoAtivo, tipoDaMidia, validarMimeParaWhatsapp } from "@/lib/midia/ativos";

describe("caminhoDoAtivo", () => {
  it("fica sob a organização e o ativo, sem travessia", () => {
    expect(caminhoDoAtivo("org1", "a1", "áudio de boas vindas (1).ogg")).toBe("org1/assets/a1/audio-de-boas-vindas-1.ogg");
  });
});

describe("tipoDaMidia / validarMimeParaWhatsapp", () => {
  it.each([
    ["audio/ogg", "audio"],
    ["image/jpeg", "image"],
    ["image/png", "image"],
    ["video/mp4", "video"],
    ["application/pdf", "document"],
  ])("%s -> %s", (mime, tipo) => expect(tipoDaMidia(mime)).toBe(tipo));
  it("áudio só ogg", () => {
    expect(validarMimeParaWhatsapp("audio/ogg").ok).toBe(true);
    expect(validarMimeParaWhatsapp("audio/wav")).toEqual({ ok: false, motivo: "audio_precisa_ser_ogg_opus" });
    expect(validarMimeParaWhatsapp("audio/mpeg").ok).toBe(false);
  });
  it("recusa tipo desconhecido", () => {
    expect(validarMimeParaWhatsapp("application/x-msdownload").ok).toBe(false);
  });
});
```

- [ ] **Passo 2: Migration**

```sql
-- manifest: repositório de mídia da organização (áudios, imagens e arquivos reutilizáveis em automações e respostas rápidas)
create table if not exists public.org_media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null,
  mime text not null,
  size_bytes bigint not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  constraint org_media_assets_nome_tamanho check (char_length(nome) between 1 and 120),
  constraint org_media_assets_tamanho check (size_bytes between 1 and 16777216),
  constraint org_media_assets_caminho check (storage_path like organization_id::text || '/assets/%')
);
create index if not exists idx_org_media_assets_org on public.org_media_assets (organization_id, created_at desc);
alter table public.org_media_assets enable row level security;
drop policy if exists tenant_isolation_org_media_assets_all on public.org_media_assets;
create policy tenant_isolation_org_media_assets_all on public.org_media_assets
  for all
  using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));
revoke all on public.org_media_assets from anon;

-- A variável do canal pode apontar para um ativo (o áudio de boas-vindas DESTE atendente).
alter table public.channel_variables add column if not exists asset_id uuid references public.org_media_assets(id) on delete restrict;
alter table public.channel_variables alter column value_text drop not null;
alter table public.channel_variables drop constraint if exists channel_variables_valor_ou_ativo;
alter table public.channel_variables add constraint channel_variables_valor_ou_ativo
  check ((value_text is not null) <> (asset_id is not null));
```

(Se `char_length` do `check` com `organization_id::text ||` for recusado no `check`, troque por `check (position('/assets/' in storage_path) > 0)`; o isolamento por organização já vem da RLS e do prefixo gravado pelo código.) O apêndice do `baseline.sql` repete tudo. Atenção ao limite do bucket `whatsapp-media` e à cota de 1 GB compartilhada (CLAUDE.md, retenção): 16 MB por ativo é o teto.

- [ ] **Passo 3: Implementar**

```ts
// lib/midia/ativos.ts (trechos puros; o resto segue o padrão de upload do repo)
export type TipoDeMidia = "audio" | "image" | "video" | "document";

export function tipoDaMidia(mime: string): TipoDeMidia {
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

const DOCUMENTOS = new Set(["application/pdf"]);

export function validarMimeParaWhatsapp(mime: string): { ok: true } | { ok: false; motivo: string } {
  if (mime.startsWith("audio/")) {
    return mime === "audio/ogg" ? { ok: true } : { ok: false, motivo: "audio_precisa_ser_ogg_opus" };
  }
  if (["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(mime) || DOCUMENTOS.has(mime)) return { ok: true };
  return { ok: false, motivo: "tipo_nao_aceito" };
}

export function caminhoDoAtivo(organizationId: string, assetId: string, nome: string): string {
  const limpo = nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-(?=\.)|-$/g, "")
    .toLowerCase();
  return `${organizationId}/assets/${assetId}/${limpo}`;
}
```

`subirAtivoPorUrl`: `assertUrlDeMidiaSegura(url)` (anti-SSRF, a mesma do envio) → `fetch` com limite de 16 MB e timeout 20 s → `validarMimeParaWhatsapp(content-type)` → `admin.storage.from("whatsapp-media").upload(caminhoDoAtivo(...), buffer, { contentType, upsert: false })` → `insert` em `org_media_assets` (com `organization_id`) → `audit("media_asset.created")`. `copiarAtivoParaConversa`: lê o ativo **filtrando `organization_id`**, confere que a conversa é da organização, `storage.copy(origem, "${org}/${conversa}/auto-${uuid}.${ext}")`. A tool `crm_upload_media_asset` recebe `{ nome, url }` (o Claude passa a URL do CDN do Datacrazy), `risco: "atencao"`, e devolve `{ asset_id, mime, tamanho }`.

- [ ] **Passo 4: Rodar**

Run: `corepack pnpm vitest run lib/midia tests/unit/catalogo-tools-leigo-friendly.test.ts`
Esperado: PASS.

- [ ] **Passo 5: Commit**

```bash
git add supabase lib tests
git commit -m "feat: repositório de mídia da organização e upload por URL"
```

---

### Tarefa 14: Enviar áudio, imagem e arquivo em regras e fluxos (passos com pausa)

**Arquivos:**
- Criar: `lib/automation/envio-de-passos.ts`, `lib/automation/envio-de-passos.test.ts`
- Modificar: `lib/schemas/webhooks.ts` (ação `send_whatsapp_message`: `template` vira opcional + `passos`), `lib/automation/actions/send-whatsapp.ts`, `lib/followup/graph-schema.ts:246` (`actionConfigSchema`: modo novo `steps`), `lib/followup/enviar-texto-fixo.ts` (envio dos passos), `lib/followup/validate-publish.ts`, `app/app/ai/followups/[id]/_components/forms/` (form do nó `action`), `lib/followup/eventos-legiveis.ts`
- Teste: `lib/followup/graph-schema.test.ts`, `lib/automation/actions/send-whatsapp-passos.test.ts`

**Interfaces:**
- Consome: `copiarAtivoParaConversa` (T13), `renderTemplate` e `contextoDoCanal` (T1/T2), `sendMessageHandler`.
- Produz: tipo `PassoDeEnvio = { tipo: "texto"; texto: string } | { tipo: "midia"; asset: string /*uuid do ativo OU "var:<chave>"*/; legenda?: string } | { tipo: "interativo"; … } (T16) ` e `pausa_ms?: number` (0..10_000) antes do passo; `enviarPassos(ctx, passos): Promise<ResultadoDosPassos>`; `actionConfigSchema` ganha `{ mode: "steps"; passos: PassoDeEnvio[] (1..5) }`.

**O `asset: "var:bv1"`:** é o que faz um **único** fluxo servir N canais com **áudios diferentes**: o passo aponta para a variável `bv1` do canal (`channel_variables.asset_id`), e a resolução usa `mesclarVariaveis`-com-ativo do canal da conversa (padrão da organização como reserva).

- [ ] **Passo 1: Teste que falha (limite de tempo dos passos e resolução do ativo)**

```ts
// lib/automation/envio-de-passos.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { passosSchema, resolverReferenciaDeAtivo, TEMPO_MAXIMO_DOS_PASSOS_MS } from "@/lib/automation/envio-de-passos";

describe("passosSchema", () => {
  const texto = { tipo: "texto", texto: "oi" } as const;
  it("aceita de 1 a 5 passos", () => {
    expect(passosSchema.safeParse([texto]).success).toBe(true);
    expect(passosSchema.safeParse(Array(6).fill(texto)).success).toBe(false);
    expect(passosSchema.safeParse([]).success).toBe(false);
  });
  it("a soma das pausas cabe no orçamento do tique do worker", () => {
    const longo = Array(5).fill({ tipo: "texto", texto: "x", pausa_ms: 5_000 });
    expect(passosSchema.safeParse(longo).success).toBe(false); // 25 s > TEMPO_MAXIMO
    expect(TEMPO_MAXIMO_DOS_PASSOS_MS).toBe(20_000);
  });
  it("pausa individual até 10 s", () => {
    expect(passosSchema.safeParse([{ ...texto, pausa_ms: 10_001 }]).success).toBe(false);
  });
});

describe("resolverReferenciaDeAtivo", () => {
  const variaveis = { bv1: "ativo-do-canal" };
  it("uuid fixo passa", () => {
    expect(resolverReferenciaDeAtivo("11111111-1111-4111-8111-111111111111", variaveis)).toBe("11111111-1111-4111-8111-111111111111");
  });
  it("var:<chave> lê a variável de ativo do canal", () => {
    expect(resolverReferenciaDeAtivo("var:bv1", variaveis)).toBe("ativo-do-canal");
  });
  it("var ausente devolve null", () => {
    expect(resolverReferenciaDeAtivo("var:nao_tem", variaveis)).toBeNull();
  });
});
```

O orçamento `TEMPO_MAXIMO_DOS_PASSOS_MS = 20_000` existe porque o cron `followup-flow-worker` roda com timeout de 25 s (`docker/scheduler/entrypoint.sh`: `*/25*`): pausa maior vira estouro. Passos com soma de pausas acima disso são **recusados no schema**, não cortados em silêncio.

- [ ] **Passo 2: Implementar o schema e a resolução**

```ts
// lib/automation/envio-de-passos.ts (núcleo)
import { z } from "zod";

export const TEMPO_MAXIMO_DOS_PASSOS_MS = 20_000;
const PAUSA = z.number().int().min(0).max(10_000).optional();

export const passoTextoSchema = z.strictObject({ tipo: z.literal("texto"), texto: z.string().min(1).max(4000), pausa_ms: PAUSA });
export const passoMidiaSchema = z.strictObject({
  tipo: z.literal("midia"),
  asset: z.string().regex(/^([0-9a-f-]{36}|var:[a-z][a-z0-9_]{0,39})$/),
  legenda: z.string().max(1024).optional(),
  pausa_ms: PAUSA,
});
// O passo `interativo` entra na T16 (união estendida lá).
export const passosSchema = z
  .array(z.discriminatedUnion("tipo", [passoTextoSchema, passoMidiaSchema]))
  .min(1)
  .max(5)
  .refine((p) => p.reduce((s, x) => s + (x.pausa_ms ?? 0), 0) <= TEMPO_MAXIMO_DOS_PASSOS_MS, {
    message: "A soma das pausas passa de 20 segundos.",
  });
export type PassoDeEnvio = z.infer<typeof passosSchema>[number];

export function resolverReferenciaDeAtivo(ref: string, variaveisDeAtivo: Record<string, string>): string | null {
  if (!ref.startsWith("var:")) return ref;
  return variaveisDeAtivo[ref.slice(4)] ?? null;
}
```

`enviarPassos(ctx, passos)`: para cada passo — `await sleep(pausa_ms)` (usa `setTimeout` promisificado) → texto: `renderTemplate(texto, ctx.context)` + `sendMessageHandler({ type: "text", body })`; mídia: resolve a referência (`lerAtivosDoCanal(admin, org, canalId)` devolve `Record<chave, asset_id>` mesclando padrão da organização + canal, a partir de `channel_variables.asset_id`), `copiarAtivoParaConversa`, e `sendMessageHandler({ type: tipoDaMidia(mime), media_storage_path, media_mime, body: legenda })`. **Idempotência:** `metadata.idempotency_key = "${chaveDoEnvio}:${indice}"` (mesmo padrão de `enviar-texto-fixo.ts:196`), para o reenvio do mesmo job não duplicar áudio. Falha em um passo interrompe os seguintes e devolve `failed` com o índice (`passo_falhou:2`). Todo envio passa por `espacarEnvio` e pelas guardas já usadas em `send-whatsapp.ts`.

Ligações:
- **Regra:** `send_whatsapp_message.config` aceita `template` **ou** `passos` (exatamente um; `superRefine`), com `channel_session_id` (incluindo `"conversation"`).
- **Fluxo:** `actionConfigSchema` ganha `{ mode: "steps", passos }`; `enviar-texto-fixo.ts` trata `steps` com `enviarPassos` usando o contexto de `contextoDoCanal(admin, org, canalDaConversa, dono)`; `validate-publish.ts` ganha `ativo_inexistente` (ativo/variável de ativo que não existe na organização) e `passos_vazios`.
- Form do nó `action`: modo "Sequência" com lista de passos (texto, áudio/imagem/arquivo a partir da lista de ativos, pausa em segundos).

- [ ] **Passo 3: Rodar**

Run: `corepack pnpm vitest run lib/automation lib/followup tests/unit/mcp-fluxos-escrita.test.ts`
Esperado: PASS.

- [ ] **Passo 4: Commit**

```bash
git add lib app tests
git commit -m "feat: sequência de texto, áudio, imagem e arquivo em regras e fluxos"
```

---

### Tarefa 15: Respostas rápidas com anexo (e ativo por canal)

**Arquivos:**
- Modificar: `supabase/migrations/20261127140000_9409_ativos_de_midia.sql` (mesma migration da T13, **se ainda não publicada**; senão migration nova `20261127150000_9411_anexo_da_resposta_rapida.sql`) com a tabela `crm_respostas_rapidas_anexos`
- Criar: `app/api/v1/respostas-rapidas/[id]/anexo/route.ts`
- Modificar: `lib/escale/conversas/respostas-escrita.ts` (campo `anexo`), `lib/escale/conversas/respostas-banco.ts` (`lerRespostas` devolve `anexo`), `lib/escale/conversas/respostas.ts` (`RespostaLida.anexo`), `components/escale/conversas/centro/compositor/PainelRespostasRapidas.tsx`, `components/escale/conversas/centro/compositor/CompositorDaCasca.tsx` (~linhas 259-310), `lib/mcp/tools/respostas-escrita.ts`, `lib/i18n/dicionario.ts`
- Teste: `tests/unit/resposta-rapida-com-anexo.test.tsx`

**Interfaces:**
- Consome: `copiarAtivoParaConversa`, `tipoDaMidia` (T13), `lerAtivosDoCanal` (T14).
- Produz: `RespostaLida.anexo: { asset: string /* uuid ou "var:<chave>" */; tipo: TipoDeMidia } | null`; `POST /api/v1/respostas-rapidas/[id]/anexo { conversation_id }` → `{ media_storage_path, media_mime, type }` (a rota resolve `var:` pelo canal da conversa e copia o objeto para dentro da conversa).

- [ ] **Passo 1: Migration (tabela do anexo)**

```sql
-- manifest: anexo (áudio, imagem, arquivo) em respostas rápidas, fixo ou por variável do canal
create table if not exists public.crm_respostas_rapidas_anexos (
  template_id uuid primary key references public.message_templates(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset text not null,
  constraint crm_respostas_rapidas_anexos_asset check (asset ~ '^([0-9a-f-]{36}|var:[a-z][a-z0-9_]{0,39})$')
);
alter table public.crm_respostas_rapidas_anexos enable row level security;
drop policy if exists tenant_isolation_crm_respostas_rapidas_anexos_all on public.crm_respostas_rapidas_anexos;
create policy tenant_isolation_crm_respostas_rapidas_anexos_all on public.crm_respostas_rapidas_anexos
  for all
  using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids())
              and exists (select 1 from public.message_templates t
                          where t.id = template_id and t.organization_id = crm_respostas_rapidas_anexos.organization_id));
revoke all on public.crm_respostas_rapidas_anexos from anon;
```

(Mesma régua das tabelas irmãs `crm_respostas_rapidas_extras/setores`, baseline linhas ~37362-37410. A escrita herda a regra do `message_templates` pela existência da linha pai na mesma organização.) Apêndice no `baseline.sql`.

- [ ] **Passo 2: Teste que falha (o painel entrega o anexo junto do texto)**

```tsx
// tests/unit/resposta-rapida-com-anexo.test.tsx
// @vitest-environment jsdom
// Modelo: o teste existente do PainelRespostasRapidas (grep -rln "PainelRespostasRapidas" tests components).
// Caso 1: resposta com anexo { asset: "var:bv1", tipo: "audio" } -> ao clicar, aoEscolher recebe (texto, anexo).
// Caso 2: resposta sem anexo -> aoEscolher recebe (texto, null).
// Caso 3: o compositor mostra o chip "Áudio anexado" e, ao enviar, chama POST …/anexo e depois o envio de mídia
//         com o media_storage_path devolvido (mock do fetch).
```

Escreva os três casos com `@testing-library/react`, seguindo o teste vizinho do painel.

- [ ] **Passo 3: Implementar**

`lerRespostas` passa a fazer `select` do anexo junto dos extras (mesma consulta de `gravarExtras`/leitura de extras; **uma** consulta a mais por lote, não por linha). `PainelRespostasRapidas` chama `aoEscolher(texto, anexo)`; `CompositorDaCasca` guarda `anexoDaResposta` em estado, mostra o chip com botão "Remover" e, no envio: (1) envia o texto de sempre se houver; (2) se houver anexo, `POST /api/v1/respostas-rapidas/{id}/anexo` e depois o mesmo caminho de envio de mídia que `enviarArquivo` usa (`media_storage_path` devolvido). Em áudio, o texto vai **antes**, como mensagem separada (áudio no Cloud API não leva legenda), com `pausa` natural entre os dois pela fila de envio. Frases novas em `es`.

A rota `[id]/anexo`: `requireRole("agent")` → lê a resposta **na sessão do usuário** (RLS) → resolve `var:` com `lerAtivosDoCanal(createAdminClient(), org, canalDaConversa)` (o canal vem da conversa, que é lida com `organization_id`) → `copiarAtivoParaConversa` → devolve o caminho. **A rota não aceita `asset` do corpo:** só o que está gravado na resposta.

`crm_create_quick_reply` / `crm_update_quick_reply` ganham `anexo?: { asset: string }`; o MCP valida que o `asset` (uuid) pertence à organização ou que `var:<chave>` é uma chave válida.

- [ ] **Passo 4: Rodar**

Run: `corepack pnpm vitest run tests/unit/resposta-rapida-com-anexo.test.tsx lib/escale/conversas "app/api/v1/respostas-rapidas" tests/unit/i18n-espanhol-cobre-a-tela.test.ts`
Esperado: PASS.

- [ ] **Passo 5: Commit**

```bash
git add supabase app components lib tests
git commit -m "feat: respostas rápidas com anexo fixo ou por canal"
```

---

## Fase 5 — Mensagens interativas (capacidade D)

### Tarefa 16: Envio `interactive` (botões e lista) no canal oficial

**Arquivos:**
- Criar: `lib/channels/interativo.ts`, `lib/channels/interativo.test.ts`
- Modificar: `lib/channels/types.ts` (`OutboundKind` + `OutboundEnvelope.interativo`), `lib/channels/adapters/meta-cloud.ts` (`send`, ~linha 345), `app/api/v1/messages/_handler.ts` (aceitar `type: "text"` com `interativo` no corpo; grava como texto com `metadata.interativo`), `lib/channels/capabilities.ts` (capacidade `interativo` só para `meta_cloud`)
- Teste: `lib/channels/adapters/meta-cloud-interativo.test.ts`

**Interfaces:**
- Produz: `type Interativo = { tipo: "botoes"; corpo: string; botoes: Array<{ id: string; titulo: string }> /*1..3*/ } | { tipo: "lista"; corpo: string; botaoDaLista: string; linhas: Array<{ id: string; titulo: string; descricao?: string }> /*1..10*/ }`; `montarInterativo(i: Interativo): Record<string, unknown>` (o objeto `interactive` da Cloud API); `textoNumeradoDeReserva(i: Interativo): string`.

**Limites da Cloud API (verifique na doc oficial antes de fixar no código — consulte via Context7/Meta docs):** botões de resposta: até 3, título até 20 caracteres; lista: até 10 linhas, título da linha até 24, descrição até 72, texto do botão da lista até 20; corpo até 1024. Resposta interativa só é aceita dentro da janela de 24 h de atendimento (fora dela só template HSM): a ação `interativo` falha com `outside_24h_window` e cai na reserva de texto (que também depende da janela; sem janela, o passo é adiado, como qualquer mensagem livre).

- [ ] **Passo 1: Teste que falha**

```ts
// lib/channels/interativo.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";
import { interativoSchema, montarInterativo, textoNumeradoDeReserva } from "@/lib/channels/interativo";

const lista = {
  tipo: "lista",
  corpo: "Aonde você quer fazer o teste?",
  botaoDaLista: "Escolher aparelho",
  linhas: [
    { id: "tv_android", titulo: "TV Android - Play Store" },
    { id: "tv_samsung", titulo: "TV Samsung" },
  ],
} as const;

describe("interativoSchema", () => {
  it("lista aceita até 10 linhas e recusa 11", () => {
    const linhas = Array.from({ length: 11 }, (_, i) => ({ id: `l${i}`, titulo: `Linha ${i}` }));
    expect(interativoSchema.safeParse({ ...lista, linhas }).success).toBe(false);
    expect(interativoSchema.safeParse({ ...lista, linhas: linhas.slice(0, 10) }).success).toBe(true);
  });
  it("botões aceitam até 3 e título até 20", () => {
    const botoes = [1, 2, 3, 4].map((n) => ({ id: `b${n}`, titulo: `Plano ${n}` }));
    expect(interativoSchema.safeParse({ tipo: "botoes", corpo: "Qual plano?", botoes }).success).toBe(false);
    expect(interativoSchema.safeParse({ tipo: "botoes", corpo: "Qual plano?", botoes: botoes.slice(0, 3) }).success).toBe(true);
    expect(interativoSchema.safeParse({ tipo: "botoes", corpo: "x", botoes: [{ id: "a", titulo: "x".repeat(21) }] }).success).toBe(false);
  });
});

describe("montarInterativo", () => {
  it("lista -> objeto interactive da Cloud API", () => {
    expect(montarInterativo(lista)).toEqual({
      type: "list",
      body: { text: "Aonde você quer fazer o teste?" },
      action: {
        button: "Escolher aparelho",
        sections: [{ title: "Opções", rows: [{ id: "tv_android", title: "TV Android - Play Store" }, { id: "tv_samsung", title: "TV Samsung" }] }],
      },
    });
  });
  it("botões -> reply buttons", () => {
    expect(montarInterativo({ tipo: "botoes", corpo: "Qual plano?", botoes: [{ id: "p1", titulo: "1 Mês R$ 24,90" }] })).toEqual({
      type: "button",
      body: { text: "Qual plano?" },
      action: { buttons: [{ type: "reply", reply: { id: "p1", title: "1 Mês R$ 24,90" } }] },
    });
  });
});

describe("textoNumeradoDeReserva (o que o Datacrazy faz quando o botão falha)", () => {
  it("numera de 1 a N", () => {
    expect(textoNumeradoDeReserva(lista)).toBe("Aonde você quer fazer o teste?\n\n1 - TV Android - Play Store\n2 - TV Samsung");
  });
});
```

- [ ] **Passo 2: Implementar**

```ts
// lib/channels/interativo.ts
import { z } from "zod";

const ID = z.string().min(1).max(200);

export const interativoSchema = z.discriminatedUnion("tipo", [
  z.strictObject({
    tipo: z.literal("botoes"),
    corpo: z.string().min(1).max(1024),
    botoes: z.array(z.strictObject({ id: ID, titulo: z.string().min(1).max(20) })).min(1).max(3),
  }),
  z.strictObject({
    tipo: z.literal("lista"),
    corpo: z.string().min(1).max(1024),
    botaoDaLista: z.string().min(1).max(20),
    linhas: z
      .array(z.strictObject({ id: ID, titulo: z.string().min(1).max(24), descricao: z.string().max(72).optional() }))
      .min(1)
      .max(10),
  }),
]);
export type Interativo = z.infer<typeof interativoSchema>;

export function montarInterativo(i: Interativo): Record<string, unknown> {
  if (i.tipo === "botoes") {
    return {
      type: "button",
      body: { text: i.corpo },
      action: { buttons: i.botoes.map((b) => ({ type: "reply", reply: { id: b.id, title: b.titulo } })) },
    };
  }
  return {
    type: "list",
    body: { text: i.corpo },
    action: {
      button: i.botaoDaLista,
      sections: [
        {
          title: "Opções",
          rows: i.linhas.map((l) => ({ id: l.id, title: l.titulo, ...(l.descricao ? { description: l.descricao } : {}) })),
        },
      ],
    },
  };
}

export function textoNumeradoDeReserva(i: Interativo): string {
  const itens = i.tipo === "botoes" ? i.botoes.map((b) => b.titulo) : i.linhas.map((l) => l.titulo);
  return `${i.corpo}\n\n${itens.map((t, n) => `${n + 1} - ${t}`).join("\n")}`;
}
```

No adaptador `meta-cloud.ts`, o `corpo` do POST ganha um primeiro caso: `envelope.interativo ? { type: "interactive", interactive: montarInterativo(envelope.interativo) } : (contactPayload(...) ?? mediaPayload(...) ?? texto)`. `OutboundEnvelope.interativo?: Interativo`. O `_handler` grava a mensagem como `type: "text"` com `body = textoNumeradoDeReserva(...)` (o que o time vê no inbox) e `metadata.interativo` (o que foi enviado). Teste do adaptador: `fetch` simulado, conferir que o corpo enviado a `…/messages` contém `type: "interactive"` e o objeto montado. Canais que não são `meta_cloud` (WAHA, Zernio, Datafy) **não** anunciam a capacidade `interativo`: o envio cai direto na reserva numerada.

- [ ] **Passo 3: Rodar**

Run: `corepack pnpm vitest run lib/channels && NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm typecheck`
Esperado: PASS.

- [ ] **Passo 4: Commit**

```bash
git add lib app
git commit -m "feat: envio de botões e lista no WhatsApp Cloud API"
```

---

### Tarefa 17: Passo interativo em fluxos, com fallback numerado e ramo pela escolha

**Arquivos:**
- Modificar: `lib/automation/envio-de-passos.ts` (passo `interativo`), `lib/followup/graph-schema.ts` (nenhuma mudança além do `steps` da T14), `lib/followup/validate-publish.ts`, form do nó `action`, `lib/followup/eventos-legiveis.ts`
- Teste: `lib/automation/envio-interativo.test.ts`, `tests/unit/paridade-datacrazy-contrato.test.ts` (caso novo)

**Interfaces:**
- Consome: `interativoSchema`, `montarInterativo`, `textoNumeradoDeReserva` (T16); `enviarPassos` (T14).
- Produz: passo `{ tipo: "interativo"; interativo: Interativo; pausa_ms? }` na união de `passosSchema`.

**Como a escolha vira ramo (já existe, só é usado):** o toque chega como mensagem de texto com o **rótulo** do botão/linha (`textoDoClique`). O nó `match_reply` que vem depois ramifica por `op: "eq"` + `pattern: <título da opção>`. No fallback numerado, o lead digita "3": o mesmo nó tem um segundo ramo `eq "3"` para a mesma saída (um ramo por forma de responder, as duas arestas apontam para o mesmo próximo nó). O gerador de grafo da T19 monta essas duas formas por opção.

- [ ] **Passo 1: Teste que falha**

```ts
// lib/automation/envio-interativo.test.ts
// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { enviarInterativoComReserva } from "@/lib/automation/envio-de-passos";

const lista = {
  tipo: "lista" as const,
  corpo: "Aonde você quer fazer o teste?",
  botaoDaLista: "Escolher",
  linhas: [{ id: "a", titulo: "TV Box" }],
};

describe("enviarInterativoComReserva", () => {
  it("envia interativo quando o canal aceita", async () => {
    const enviarInterativo = vi.fn(async () => ({ ok: true as const }));
    const enviarTexto = vi.fn(async () => ({ ok: true as const }));
    await enviarInterativoComReserva({ interativo: lista, canalAceitaInterativo: true, enviarInterativo, enviarTexto });
    expect(enviarInterativo).toHaveBeenCalledOnce();
    expect(enviarTexto).not.toHaveBeenCalled();
  });
  it("cai no texto numerado quando o interativo falha", async () => {
    const enviarInterativo = vi.fn(async () => { throw new Error("meta_131009: parameter invalid"); });
    const enviarTexto = vi.fn(async () => ({ ok: true as const }));
    const r = await enviarInterativoComReserva({ interativo: lista, canalAceitaInterativo: true, enviarInterativo, enviarTexto });
    expect(enviarTexto).toHaveBeenCalledWith("Aonde você quer fazer o teste?\n\n1 - TV Box");
    expect(r).toEqual({ via: "reserva_numerada" });
  });
  it("canal sem interativo vai direto para o texto numerado", async () => {
    const enviarInterativo = vi.fn();
    const enviarTexto = vi.fn(async () => ({ ok: true as const }));
    const r = await enviarInterativoComReserva({ interativo: lista, canalAceitaInterativo: false, enviarInterativo, enviarTexto });
    expect(enviarInterativo).not.toHaveBeenCalled();
    expect(r).toEqual({ via: "reserva_numerada" });
  });
});
```

- [ ] **Passo 2: Implementar**

```ts
// em lib/automation/envio-de-passos.ts
import { textoNumeradoDeReserva, type Interativo } from "@/lib/channels/interativo";

export async function enviarInterativoComReserva(args: {
  interativo: Interativo;
  canalAceitaInterativo: boolean;
  enviarInterativo: (i: Interativo) => Promise<unknown>;
  enviarTexto: (texto: string) => Promise<unknown>;
}): Promise<{ via: "interativo" | "reserva_numerada" }> {
  if (args.canalAceitaInterativo) {
    try {
      await args.enviarInterativo(args.interativo);
      return { via: "interativo" };
    } catch (erro) {
      // Mesma saída do Datacrazy: pergunta idêntica como lista numerada. O erro entra no log estruturado
      // pelo chamador (logger), nunca em console.
      void erro;
    }
  }
  await args.enviarTexto(textoNumeradoDeReserva(args.interativo));
  return { via: "reserva_numerada" };
}
```

Acrescente `passoInterativoSchema` (`tipo: "interativo"`, `interativo: interativoSchema`, `pausa_ms`) à união de `passosSchema`; o `enviarPassos` usa `enviarInterativoComReserva`, registrando no resultado do passo `{ via }` (visível no dossiê da inscrição e em `automation_rule_runs`). Substitua o `void erro;` pelo `logger.warn("passo_interativo_falhou_usando_reserva", { code: … })` do repo (`import { logger } from "@/lib/logger"`) — sem `console`.

Acrescente ao `tests/unit/paridade-datacrazy-contrato.test.ts` o caso: grafo com nó `action` modo `steps` (áudio `var:bv1`, lista de 9 aparelhos, áudio `var:bv2`) seguido de `match_reply` com 9 ramos **mais** o `else` é aceito por `flowGraphSchema`. **Atenção:** `match_reply` aceita no máximo 8 ramos (`branches.max(8)`) e a lista do Datacrazy tem 9 aparelhos; ver o próximo passo.

- [ ] **Passo 3: Os 9 aparelhos e o limite de 8 ramos**

A lista tem 9 opções e o `match_reply` tem teto de 8 ramos. O Datacrazy não ramifica por aparelho depois do clique (só **notifica** o atendente e deixa a conversa seguir). Então o desenho do ONPLAY é: o nó `match_reply` tem **um** ramo (`contem` com o texto de qualquer opção não é possível), por isso use a abordagem do mundo real do Datacrazy: depois da lista, `edit_lead_tag` (`Clicou Botao`) **no ramo `else`** do `match_reply` (qualquer resposta) e o `no_reply` em 35 min vai para a recuperação. Não suba o teto de 8 (ele é limite de desenho da tela). Registre isto no teste:

```ts
it("clique em qualquer opção cai no ramo else e marca a tag", () => { /* grafo da T19 */ });
```

- [ ] **Passo 4: Rodar**

Run: `corepack pnpm vitest run lib/automation lib/channels tests/unit/paridade-datacrazy-contrato.test.ts`
Esperado: PASS.

- [ ] **Passo 5: Commit**

```bash
git add lib app tests
git commit -m "feat: passo interativo com reserva numerada nos fluxos"
```

---

## Fase 6 — Migração do ONPLAY (operacional, pelas ferramentas MCP)

> Esta fase **usa** o que as fases 1 a 5 entregaram. Ela só começa depois da publicação (Tarefa 21), porque grava na organização de produção e a regra do repo proíbe gravar no banco de produção fora de migrations **exceto pelo caminho de produto** (as ferramentas MCP, com o token da organização ONPLAY). Preparo e ensaio (T20) rodam numa organização **sandbox** do mesmo servidor antes de mexer no ONPLAY.

### Tarefa 18: Receita reutilizável de migração por MCP

**Arquivos:**
- Criar: `docs/runbooks/migracao-de-cliente-por-mcp.md`, `tests/unit/documentacao-aponta-para-o-que-existe.test.ts` (já existe: apenas rode; ele reprova path citado que não exista)
- Modificar: `docs/index.md` (uma linha), `docs/current-state.md` (capacidades novas)

- [ ] **Passo 1: Escrever o runbook** com a ordem: (1) funil e etapas (`crm_create_pipeline`, `crm_create_stage`; etapa "ganho" com `is_won`); (2) tags; (3) canais (conectar o número na tela de Conexões; **Configurações › Atendimento**: escolher o responsável de cada canal, ato humano com MFA); (4) variáveis do canal (`crm_set_channel_variables`) e horário comercial (`crm_set_channel_business_hours`); (5) mídia (`crm_upload_media_asset` com a URL do CDN de origem, depois `crm_set_channel_variables` com `asset_id` para os áudios por canal); (6) respostas rápidas (`crm_create_quick_reply`); (7) regras (`crm_create_automation_rule`, nascem desligadas) e fluxos (`crm_create_followup_flow` + `crm_update_followup_flow`); (8) ensaio na sandbox; (9) `crm_publish_followup_flow` com `aprovado_por`; (10) `crm_set_automation_rule_active`; (11) paralelo com o sistema antigo; (12) corte.
- [ ] **Passo 2: Rodar** `corepack pnpm vitest run tests/unit/documentacao-aponta-para-o-que-existe.test.ts` (todo path citado precisa existir). Esperado: PASS.
- [ ] **Passo 3: Commit** `git commit -m "docs: runbook de migração de cliente por MCP"`

---

### Tarefa 19: Gerador de grafo do ONPLAY (script de migração, sem gravar)

**Arquivos:**
- Criar: `scripts/migracao/onplay-grafos.ts`, `scripts/migracao/onplay-grafos.test.ts`

**Interfaces:** `grafoBoasVindas(ids): FlowGraph`, `grafoPosTeste(ids): FlowGraph`, `grafoRemarketing(ids): FlowGraph`, `regrasDoOnplay(ids): CreateAutomationRule[]`, com `ids = { pipelineId, etapas: { temInteresse, jaTestou, clienteNovo, semEtiqueta }, ativos: {…} }`. São funções **puras** que devolvem os dados que o MCP vai gravar: testáveis sem banco, versionadas no repo, reutilizáveis como exemplo.

O desenho, uma automação para N canais (traduzido de `automacoes-datacrazy.md`):

1. **Regra "Lead novo"** — gatilho `lead.created`, ações: `assign_owner {modo:"responsavel_do_canal"}`, `add_tag ["Tem interese"]`, `start_message_flow` (fluxo Boas-vindas). Substitui "Lead novo GERAL" e os 5 gatilhos por número.
2. **Fluxo Boas-vindas** (gatilho manual/regra): `wait 30 s` (imune à resposta) → `action steps`: áudio `var:bv1` → pausa 4 s → lista de 9 aparelhos (interativo com reserva numerada) → pausa 4 s → áudio `var:bv2` → `match_reply` (ramo `else` = qualquer resposta → `edit_lead_tag ["Clicou Botao"]`; `no_reply` → fim). O horário comercial do canal (T12) segura o envio fora de 09:30–23:00/22:00.
3. **Regra "Lead clicou botão"** — `lead.tag_added` (tag `Clicou Botao`) → `create_task` para `dono_do_lead` (aviso ao atendente).
4. **Regra "Mudar tag — Dados"** — gatilho `message.sent` com palavra-chave `Põe estes dados` (qualquer canal) → condição: negócio na etapa `Tem interese` → ações: `start_message_flow` (fluxo Pós-teste). O movimento de etapa e a troca de tag ficam **dentro do fluxo** (nós `move_lead` → `Já testou`, `edit_lead_tag` com `tags:["Já testou"]`, `remover:["Tem interese"]`), para não depender de ação de regra que regrava o lead.
5. **Fluxo Pós-teste** (uma só cópia): `move_lead` Já testou → `edit_lead_tag` → `wait 15 min` → (se ainda Já testou) áudio `var:pos_teste` → `wait 5 min` → botões de plano (`1 Mês R$ 24,90`, `3 Meses R$ 69,90`, `6 Meses R$ 129,90`) → `match_reply` (qualquer resposta → `wait 30 s` → texto PIX com `{{canal.pix_chave}} / {{canal.pix_banco}} / {{canal.pix_nome}}` → `match_reply` 35 min: `no_reply` → áudio `var:recuperacao` → `match_reply` 60 min: `no_reply` → "O que impediu de fechar…"; `no_reply` dos 30 min dos planos → áudio de recuperação).
6. **Regra "Mudar tag — Logo"** — `message.sent` com `Logo nosso número do suporte` → condição etapa `Já testou` → `start_message_flow` (fluxo Fechamento: `move_lead` para a etapa **Cliente Novo** (`is_won`), `edit_lead_tag ["Cliente Novo"]` com `remover:["Já testou"]`).
7. **Fluxo RMK 23H** — gatilho `silence`/tag: o Datacrazy dispara por tag `Tem interese` + 21 h. No Escale: gatilho de fluxo `stage_change` para `Tem interese`; `wait 21 h`; condição "ainda na etapa Tem interese"; texto "Opa, tá aí? Vamos continuar com o teste do aplicativo?"; `edit_lead_tag` (remove `Tem interese`); `move_lead` → `SemEtiqueta`. Pelo canal da própria conversa — **sem ramo por atendente**, e o Douglas (que no Datacrazy não recebe) é uma exceção a decidir (pergunta aberta 5).

- [ ] **Passo 1: Escrever o teste** (`onplay-grafos.test.ts`): cada função devolve um grafo que `flowGraphSchema.safeParse` aceita; as regras passam em `createAutomationRuleSchema`; o texto do PIX contém `{{canal.pix_chave}}` e **não** contém nenhum número de PIX literal (`/\d{11}/` não casa); nenhum grafo contém mais de um `start_message_flow`/ramo por atendente.
- [ ] **Passo 2: Implementar** as funções puras.
- [ ] **Passo 3: Rodar** `corepack pnpm vitest run scripts/migracao` → PASS.
- [ ] **Passo 4: Commit** `git commit -m "feat: grafos e regras do ONPLAY como dados versionados"`

---

## Fase 7 — Teste final, publicação e migração

### Tarefa 20: Teste da frente inteira, uma vez

> Só aqui roda o pesado (decisão de 18/10/2026). Tudo em segundo plano.

- [ ] **Passo 1:** Atualizar a branch da frente com a main (`git fetch escale-crm && git merge escale-crm/main`) e renumerar migrations se `corepack pnpm checar:colisao-de-migration` apontar colisão (renomear o arquivo **e** o apêndice do baseline).
- [ ] **Passo 2:** `NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm gov:verify` (typecheck + lint + lint:channels + lint:role-rank + test:unit **sem caminho**). Esperado: nenhuma falha nova em relação à `main`.
- [ ] **Passo 3:** `corepack pnpm test:db` e `corepack pnpm test:db:update` em segundo plano (há migrations). Esperado: verdes, incluindo `channel-variables-rls`, `channel-business-hours-rls`, `org-media-assets-rls` e o teste de completude de RLS.
- [ ] **Passo 4:** Um revisor, **Opus**, sobre o diff inteiro da frente (risco: RLS, mídia/SSRF, publicação de fluxo, envio ao cliente). Resolver todo Critical/Important.
- [ ] **Passo 5:** Prova pela tela (DoD): subir `next build` + `next start` num banco fresco do `baseline.sql` (receita do CLAUDE.md), conferir pelo navegador: criar regra com gatilho "Mensagem enviada pela equipe", editar resposta rápida com `{{canal.pix_chave}}`, abrir fluxo com passo de sequência. Evidência em `evidence/paridade-datacrazy/`.
- [ ] **Passo 6:** Ensaio ponta a ponta numa **organização sandbox** com dois canais de teste (WAHA/Cloud sandbox) e duas pessoas: configurar tudo só por MCP (T18), mandar `/Dados` e conferir que a regra dispara **uma vez** e que o PIX sai com a chave **do canal da conversa**; repetir no segundo canal e ver a chave diferente. Conferir áudio como nota de voz, lista de 9 e a reserva numerada (desligar o interativo no canal de teste).

### Tarefa 21: Publicar (deploy em produção)

Segue "A ENTREGA ATÉ PRODUÇÃO É DO CLAUDE" e `docs/runbooks/deploy.md`. Só publica com T20 verde.

- [ ] **Passo 1:** PRs por fase, todos mergeados na `main` do `rgisjr/escale-crm` (nunca `origin`). Uma tag/release **só** com a frente inteira: a próxima da série `vX.Y.Z-escale.N` (a última hoje é `v1.81.0-escale.41`; confirme com `git tag --sort=-creatordate | head -3`).
- [ ] **Passo 2:** `git tag v1.81.0-escale.42 && git push escale-crm v1.81.0-escale.42` (ajuste o número) e criar a release (`gh release create`). Esperar o workflow `promover-stable` e o job `imagens-ok` verdes (`gh run watch`).
- [ ] **Passo 3:** Na **VPS nova `76.13.228.29`** (a antiga `179.197.64.188` não é produção; não mexer em `postgres_postgres` nem na rede `todanet`): `bash hostgator-setup-kit/backup.sh` e, só depois, `bash hostgator-setup-kit/update.sh --to <tag>`. Todo `up -d` leva os **dois** `-f` (`docker-compose.prod.yml` e `docker-compose.traefik.yml`).
- [ ] **Passo 4:** Conferência: 3 containers `healthy`; `https://app.escaleia.com/` responde **200** e `/app` responde **307** (não 404); `/login` 200; sem erro nos logs do `app`, `worker` e `scheduler`; objetos das migrations no banco **em modo leitura** (`select to_regclass('public.channel_variables'), to_regclass('public.channel_business_hours'), to_regclass('public.org_media_assets'), to_regclass('public.crm_respostas_rapidas_anexos');` todos não nulos). Falhou a conferência: voltar à versão anterior (`update.sh --to <tag anterior>`) e avisar.
- [ ] **Passo 5:** Mensagem curta ao usuário: versão no ar, o que entrou e o que olhar no app.

### Tarefa 22: Migração do ONPLAY (equipe do Hiago não muda a forma de trabalhar)

> Executada pelo Claude com o token MCP da organização ONPLAY, **depois** do deploy. Ensaie primeiro na sandbox com os mesmos comandos. O que for ato humano está marcado **[humano]**.

- [ ] **Passo 1: Estrutura.** O funil Principal já foi replicado via MCP (etapas SemEtiqueta, Tem interese, Já testou, Cliente Novo, atribuir nath). Conferir com `crm_list_pipelines`; garantir que **Cliente Novo** tem `is_won = true` (é o que faz o "Logo nosso número…" fechar o negócio como ganho). Criar as tags do Datacrazy (`Já testou`, `Cliente Novo`, `Tem interese`, `SemEtiqueta`, `Clicou Botao`) com `crm_manage_tags`.
- [ ] **Passo 2: Canais [humano em parte].** Conectar os números na API oficial do WhatsApp Cloud (os mesmos que hoje estão no Datacrazy: **joao vendas1** e **João vendas2**, e os demais ativos; confirmar com o Hiago quais números continuam — os fluxos citam instâncias antigas que não aparecem mais). **[humano]** Em Configurações › Atendimento, escolher **um responsável por canal** (João, Principal Nath, Sant Vendas, Gabriela; Douglas e Iago Cardoso conforme o Hiago definir). Convidar os atendentes (João, Principal Nath, Sant Vendas, Gabriela, Douglas, Iago Cardoso) por Configurações › Equipe.
- [ ] **Passo 3: Variáveis por canal** (`crm_set_channel_variables`), por exemplo para o canal da Gabriela: `pix_chave=51999600190`, `pix_banco=Mercado Pago`, `pix_nome=Teresinha`, `suporte_nome=ONPLAY SUPORTE`, `suporte_telefone=51 9132-3393`; canal do João: `pix_chave=51991439748`, `pix_nome=Iago cardoso`, `suporte_telefone=51991439748`; canal da Nath: `suporte_telefone=51998468932`; canal da Sant: `suporte_nome=SANTPLUS SUPORTE`, `suporte_telefone=51981205356`. Padrão da organização (`channel_session_id = null`): `pix_banco=Mercado Pago`.
- [ ] **Passo 4: Horário.** `crm_set_channel_business_hours` em todos os canais: seg–sex 09:30–23:00, sáb–dom 09:30–22:00, fuso `America/Sao_Paulo` (fuso da organização).
- [ ] **Passo 5: Mídia.** Baixar e re-hospedar com `crm_upload_media_asset` (URL do CDN do Datacrazy, ver `mensagens-rapidas-datacrazy.md`) os áudios `.ogg`: boas-vindas (BV1) e BV2 da Gabriela e do grupo geral, Val1, Tempo de teste, Remarketing, apppago (e `apppago/gaby`), mais as imagens de guia (onplay.jpg, guia TV Roku/LG/Samsung, Smarters, Firestick, Clouddy, Notebook, Android1). Os `.wav` duplicados de `/apppago` ficam de fora (Cloud API exige ogg/opus). Ligar cada áudio ao seu canal com `crm_set_channel_variables` (`asset_id`): `bv1`, `bv2`, `valores`, `pos_teste`, `recuperacao`, `apppago`. **Os 5 áudios dos fluxos e os das respostas rápidas usam o mesmo mecanismo.**
- [ ] **Passo 6: Respostas rápidas (as 40 viram ~25).** Criar com `crm_create_quick_reply`, uma por assunto, mesmos atalhos do dia a dia (`/Dados`, `/Logo`, `/Instala`, `/TVLG`, `/TVSAMSUNG`, `/TVROKU`, `/CELULAR ANDROID`, `/CELULAR IOS`, `/FIRESTICK`, `/NOTEBOOK`, `/ANDROID1`, `/CLOUDDY`, `/Teste`, `/Simultaneo`, `/Procedimento`, `/Pediuvalor`, `/Nome`, `/Finalera`, `/GOLPE`, `/Cartão`, `/aplicativo`, `/chamar`…), e **colapsar as variantes por atendente**:

  | Datacrazy (variantes) | Escale OS (uma só) |
  |---|---|
  | `/fechamento1`, `/fechamento2`, `/fechamento gaby` | `/fechamento` com `{{canal.pix_chave}}`, `{{canal.pix_banco}}`, `{{canal.pix_nome}}` (+ `/fechamento2` se a pergunta 2 exigir) |
  | `/SUPORTE NATH`, `/SUPORTE JOÃO`, `/SUPORTE SANT`, `/suporte gabi` | `/suporte` com `{{canal.suporte_nome}}: {{canal.suporte_telefone}}` |
  | `/BV1`, `/BV1 - GABY` | `/BV1` com anexo `var:bv1` |
  | `/BV2`, `/BV2 - GABY` | `/BV2` com anexo `var:bv2` + a lista numerada |
  | `/Val1`, `/valores gaby` | `/Val1` com anexo `var:valores` |
  | `/Val2` | `/Val2` (texto dos planos) |
  | `/apppago`, `/apppago/gaby` | `/apppago` com anexo `var:apppago` e o texto de cada canal em `{{canal.texto_apppago}}` |
  | `/Remarketing`, `/Tempo de teste` | um cada, anexo `var:remarketing` e `var:tempo_de_teste` |

  O texto de `/Dados` ("Põe estes dados, acessa o aplicativo e pode testar!") e de `/Logo` ("Logo nosso número do suporte vai te chamar para finalizar o atendimento e salvar o seu contato, obrigado.") ficam **idênticos** ao Datacrazy: são as frases-gatilho das regras.
- [ ] **Passo 7: Automações.** Rodar `scripts/migracao/onplay-grafos.ts` (T19) para gerar os dados e gravá-los com as tools: `crm_create_automation_rule` (3 regras nascem desligadas) e `crm_create_followup_flow` + `crm_update_followup_flow` (3 fluxos). **As 4 cópias do Datacrazy "Mudar tag" (João, Nath, jean/gaby e Natane) viram UMA automação (duas regras: Dados e Logo + dois fluxos); os ramos por atendente do RMK e da boas-vindas viram UM fluxo cada.** Nada a exportar de "Mudar tag Natane": é igual às outras.
- [ ] **Passo 8: Aprovação humana e publicação.** **[humano]** O Régis (ou o Hiago) revisa os 3 fluxos na tela. O Claude publica com `crm_publish_followup_flow { aprovado_por: "<nome de quem aprovou>" }` e liga as regras com `crm_set_automation_rule_active`.
- [ ] **Passo 9: Teste na sandbox da própria ONPLAY.** Com um número de teste (o filtro "telefone contém 83013515" do Datacrazy é o do Régis): lead novo recebe áudio, lista de 9, áudio; clique marca `Clicou Botao` e cria tarefa ao dono; `/Dados` move para Já testou, tira Tem interese e dispara 15 min → áudio → 5 min → botões de plano → PIX **com a chave do canal certo**; `/Logo` move para Cliente Novo e fecha como ganho; 21 h depois, RMK move para SemEtiqueta. Compare cada passo com `automacoes-datacrazy.md`.
- [ ] **Passo 10: Paralelo.** Um período de **em paralelo** com o Datacrazy: as automações do Datacrazy seguem ligadas só nos números que **ainda não** migraram; migre **um número por vez** (os dois já na Cloud API primeiro) e desligue as automações correspondentes no Datacrazy no mesmo dia, para o lead não receber a boas-vindas duas vezes. Acompanhar `crm_list_automation_runs only_failures=true` diariamente.
- [ ] **Passo 11: Corte.** Quando os números do Hiago estiverem todos no Escale OS e sem falha por uma semana, desligar as automações restantes no Datacrazy (o usuário ou o Hiago; não é ato do Claude) e arquivar a exportação de `elonbot/clientes/hiago/levantamento/`.

---

## Autorrevisão

**Cobertura da especificação**
- A (MCP de escrita): T4 (regras), T5 (fluxos + publicar com aprovação), T6 (funil, canais, variáveis), T7 (respostas rápidas), T13 (mídia por URL), T12 (horário). Funções extraídas das rotas, sem converter rota para bearer.
- B: T8. C: T13, T14, T15. D: T16, T17. E: T10 (já existe, prova de contrato). F: T9. G: T11 + T12 ("uma vez por contato" já existe, T10 documenta). H: T10 (já existe). I: T3 (e a escolha do responsável fica humana). J: T18 a T22.
- Novo requisito (uma automação, N canais): seção "Modelo", T1 (variáveis e responsável), T2 (mensagens), T3 (canal da conversa e atribuição), T8 (envio pelo canal da conversa e gatilho), T14/T15 (ativo por canal), T22 (colapso das cópias).
- "Mudar tag Natane" descartado como pendência (seção de verificação e T22).
- Deploy: T21 segue `docs/runbooks/deploy.md` e o `CLAUDE.md` da pasta do projeto.

**Varredura de placeholders:** nenhum "a definir". Onde o plano manda "ler/ajustar ao schema real" (T10 fixtures, T7/T15 modelos de teste existentes, T6 miolo do pipeline), há o comando exato de descoberta e a regra de decisão. Dois pontos dependem de leitura do código no passo e estão sinalizados: o default de `automation_rules.is_active` (T4) e o `check` de `storage_path` (T13).

**Consistência de tipos:** `ResultadoDeEscrita` nasce na T4 e é movido para `lib/api/resultado-de-escrita.ts` na T5 (a T4 já importa de lá se a T5 for executada junto; executando em ordem, a T5 faz o move e ajusta o import da T4 no mesmo commit). `contextoDoCanal`/`ContextoDoCanal` (T1) → T2, T3, T14. `responsavelDoCanal` (T1) → T3. `canalDoContexto` e `resolverCanalDaAcao` (T3) → T8. `copiarAtivoParaConversa`/`tipoDaMidia` (T13) → T14, T15. `interativoSchema`/`montarInterativo`/`textoNumeradoDeReserva` (T16) → T17. `lerAtivosDoCanal` é definido na T14 e usado na T15. `passosSchema` nasce na T14 com `texto|midia` e ganha `interativo` na T17.

**Riscos registrados:** (1) o `routing-worker` também atribui a conversa pelo canal (depende de disponibilidade); `assign_owner` do canal atribui o **negócio** e não depende disso. (2) Espera de 30 s tem precisão de 1 minuto (cron). (3) Interativo só dentro da janela de 24 h. (4) Cota de 1 GB do Storage compartilhada com `whatsapp-media`: ~35 mídias de ~1 MB são desprezíveis, mas o limite de 16 MB por ativo existe por isso. (5) `message.sent` também dispara para eco de aparelho externo (`external_device`): é desejado (atendente que digita a frase no celular) e o anti-laço exclui automação, IA e sistema.
