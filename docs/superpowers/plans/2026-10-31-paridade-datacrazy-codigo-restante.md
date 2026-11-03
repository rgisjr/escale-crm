# Paridade Datacrazy — o código que falta (mídia, sequência, botões e lista, anexo) — Plano de implementação

> **Para quem executa:** use `superpowers:executing-plans`, inline (regra do projeto: nunca trocar para subagent-driven-development). Os passos usam caixinhas (`- [ ]`). Plano escrito com a skill writing-plans em 31/10/2026.

**Objetivo:** terminar a parte de **código** do Escale OS para que uma automação mande áudio, imagem, arquivo, botões e lista no WhatsApp (uma automação servindo N números), configurável por MCP, e publicar a frente inteira.

**Arquitetura:** (1) repositório de mídia da organização no bucket privado já existente `whatsapp-media`; enviar um ativo = copiar o objeto para dentro da pasta da conversa e mandar pelo `sendMessageHandler` de sempre. (2) Um "passo de envio" (`texto | midia | interativo`) com UM orquestrador puro (`enviarPassos`), usado pela regra (`send_whatsapp_message.passos`) e pelo nó de ação do fluxo (`mode: "steps"`) nos **dois** caminhos que enviam o fluxo (o inline do relógio e o worker). (3) Botões e lista viajam como texto numerado (o que a equipe vê no inbox) + `metadata.interativo`; só o adaptador da API oficial (`meta_cloud`) transforma em `interactive`.

**Tecnologias:** Next.js 16, TypeScript 6 estrito, Zod 4, Supabase (Postgres + RLS + Storage), Vitest 4, `corepack pnpm`, MCP em `lib/mcp` (tools `crm_*`).

---

## Contexto: o que já está pronto (NÃO refazer)

Este plano continua `docs/superpowers/plans/2026-10-30-paridade-datacrazy-automacoes.md` (o "plano antigo"). Do plano antigo, **T1 a T12 estão feitas e na `main`** do `rgisjr/escale-crm` (PRs #139, #140, #142), **sem publicar**. A parte **operacional** do plano antigo (T18 runbook de migração, T19 grafos do ONPLAY, T22 migração do ONPLAY e o ensaio na organização do cliente da T20) **saiu deste projeto** e é feita no outro projeto do usuário. Aqui é só código.

Peças já existentes que este plano consome (confira com `grep` antes de usar):

| Peça | Onde | O que faz |
|---|---|---|
| `channel_variables` (migration 9702) | `supabase/migrations/20261202120000_9702_canal_variaveis.sql` | variáveis por número + padrão da organização (`channel_session_id` nulo). `value_text not null` hoje |
| `contextoDoCanal`, `mesclarVariaveis`, `renderizarVariaveisDoCanal`, `CHAVE_DE_VARIAVEL`, `CHAVES_RESERVADAS` | `lib/canais/variaveis.ts` | `{{canal.*}}` / `{{atendente.*}}` |
| `gravarVariaveisDoCanal`, `validarVariaveis` | `lib/canais/variaveis-escrita.ts` | escrita das variáveis (update-ou-insert) |
| `canalDaConversaOuDoContato` | `lib/canais/canal-da-conversa.ts` | canal da conversa (ou da mais recente do contato) |
| `anexarCanalAoContexto` | `lib/canais/anexar-ao-contexto.ts` | põe `canal`/`atendente` no contexto de render do fluxo |
| `resolverCanalDaAcao`, `CANAL_DA_CONVERSA` | `lib/automation/canal-da-acao.ts` | `channel_session_id: "conversation"` nas ações |
| `channel_business_hours` (9703), `adiarAteHorarioComercial` | `lib/canais/horario-comercial.ts` | horário comercial (já integrado em regra, fluxo inline e worker) |
| `ResultadoDeEscrita`, `falhaDeEscrita` | `lib/api/resultado-de-escrita.ts` | desfecho das escritas compartilhadas rota/MCP |
| tools MCP de escrita | `lib/mcp/tools/{automacao,fluxos,canais,respostas}-escrita.ts` | catálogo em `lib/mcp/tools/catalogo/{operacao,atendimento}.ts`, registro em `lib/mcp/tools/index.ts` |
| envio de mídia guardada | `app/api/v1/messages/_handler.ts` (~linha 1097) | `media_storage_path` assinado e repassado ao adaptador; exige caminho `{org}/{conversa}/…` (`isMediaPathOwnedBy`) |
| áudio como nota de voz | `lib/channels/adapters/meta-cloud.ts` (`mediaPayload`, ~linha 65) | `voice: true`; a Meta exige ogg/opus |
| anti-SSRF de URL externa | `lib/messaging/media/url-de-midia-externa.ts` (`assertUrlDeMidiaSegura`) | mesma guarda do envio por URL |
| clique em botão/lista chega como texto | `lib/channels/meta/webhook.ts` (`textoDoClique`, ~linha 247) | recepção já funciona |
| envio do worker com mídia | `lib/agent-engine/edge/crm/send-message.ts` (`corpoDoEnvio`, `sendTurnMessage`) | o worker já manda imagem por `media: { storagePath, mime }` |

## Decisões tomadas para este plano (revisão do plano antigo)

1. **Os DOIS caminhos de envio do fluxo.** O job `followup_turn` é consumido pelo envio inline (`lib/followup/enviar-texto-fixo.ts`, chamado pelo relógio em `lib/relogio/executar.ts`) **e** pelo worker (`lib/agent-engine/agent/followup-turn.ts`). O plano antigo só tratava o inline. Aqui o modo `steps` é tratado nos dois, pelo mesmo orquestrador.
2. **Sem pausa configurável entre passos.** O cron do relógio tem 25 s e trata até 5 jobs por rodada (`docker/scheduler/entrypoint.sh`, linha `followup-flow-worker`); pausas de segundos estourariam a rodada. O espaçamento anti-ban (`espacarEnvio`, ~1,2 s + jitter, mesmo número) já separa as mensagens. Quem precisar de intervalo maior usa um nó `wait` (mínimo 30 s, já existe).
3. **Áudio só `audio/ogg`** no repositório (vale nos dois canais: a Meta exige, o WAHA aceita). `.wav`/`.mp3` são recusados no upload com motivo claro.
4. **Telas.** Regra do projeto: tela igual à Clint, conferindo o print. Este plano **não cria tela nova de configuração**: sequência e botões são configurados por MCP (como as variáveis e o horário). O editor de fluxo só **mostra** um nó `steps` (resumo + aviso "configurado pelo MCP"), sem quebrar. O **chip de anexo no compositor** (Tarefa 8, passo 6) só é feito com print da Clint; sem print, **pare e peça ao usuário**.
5. **Migrations:** a `main` está em **9703**. Use **9704** (`20261202140000`) e **9705** (`20261202150000`); confira com `corepack pnpm checar:colisao-de-migration` (o aviso sobre a `9101` vs `9051` do `origin` é antigo e não é seu).

## Restrições globais (valem para todas as tarefas)

- **Regra pétrea e entrega:** o usuário autorizou executar este plano até produção. Ordem da frente: executa todas as tarefas (um PR por tarefa ou por par de tarefas, mergeado direto na `main` do `escale-crm`), **sem** `test:db` nem suíte cheia no meio; depois a Tarefa 9 (bateria única, revisão, publicação). Nada vai para produção antes da Tarefa 9.
- **Git:** remoto `escale-crm` (`rgisjr/escale-crm`), base `main`. **Nunca** push em `origin`. Worktree por PR: `git fetch escale-crm && git worktree add ../wt-paridade-<n> -b feat/paridade-<n> escale-crm/main`, depois `corepack pnpm install --frozen-lockfile` dentro dela.
- **Ambiente (Git Bash, Windows):** `export PATH="/c/Program Files/nodejs:$PATH"`; `corepack pnpm`; typecheck com `NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm typecheck` (demora uns minutos; rode em segundo plano). Erro já existente e aceito: `tests/unit/escale-fila-da-casca.test.tsx(67,4)`. Evite comandos Bash com vários heredocs cheios de aspas simples (o shell da ferramenta recusou alguns): prefira a ferramenta Write para criar arquivos.
- **Multi-tenant:** toda tabela nova com `organization_id uuid not null references organizations(id) on delete cascade` + RLS `tenant_isolation_<tabela>_all` com `fn_user_org_ids()` e escrita `fn_role_at_least(organization_id,'manager')`. Service role filtra `organization_id` em **toda** query, de fonte confiável (sessão/token/`ctx.organizationId`), nunca do corpo.
- **Migrations:** arquivo `supabase/migrations/<timestamp>_<NNNN>_<slug>.sql` com `-- manifest: …` na 1ª linha, idempotente, sem `BEGIN/COMMIT`; o MESMO bloco como apêndice no `supabase/baseline.sql`, rotulado `-- ---- FORK ESCALE · <coisa> (migration NNNN) ----`, colado **imediatamente antes** da linha `do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;` que precede `-- ---- VARREDURA anon` (é onde estão os blocos 9702 e 9703). `lib/database.types.ts`: sem Docker, acrescente a tabela à mão no padrão das vizinhas (`channel_business_hours` é o modelo). `tests/invariants/**`: só arquivo NOVO (os existentes são congelados).
- **Audit:** código novo acrescentado **no fim** do array em `lib/audit/actions.ts` (hoje termina em `"channel_business_hours.updated"`).
- **MCP:** tool nova = `McpToolDefinition` (`category`, `requiresRole: "manager"` para escrita, `requiresScope`), entrada no catálogo (`rotulo`, `explicacao` com 40+ caracteres em português de gente, `oQueToca`, `risco`, `pacotes`) e registro em `lib/mcp/tools/index.ts`. Args com dado sensível usam `redigirParaAuditoria`. Gates: `tests/unit/catalogo-tools-leigo-friendly.test.ts`, `tests/unit/catalogo-servido.test.ts` e as suítes `lib/mcp tests/unit/mcp tests/unit/catalogo`.
- **i18n:** frase nova em `t()`/`traduzir()` ganha linha em `lib/i18n/dicionario.ts` **só com `es`**; antes de acrescentar, `grep -n '^  "<frase>":' lib/i18n/dicionario.ts` (chave duplicada reprova o typecheck). Gate: `tests/unit/i18n-espanhol-cobre-a-tela.test.ts`.
- **Estilo:** sem `console.log` (use `logger` de `@/lib/logger`), arquivos ≤ 800 linhas, funções ≤ 50, imutabilidade, Zod em toda entrada externa, teste novo com `// @vitest-environment node` quando não for DOM.
- **Anti-ban:** todo envio automático passa por `espacarEnvio`, `checkDailyLimit`, janela do canal, horário comercial e guardas de contato — exatamente como `lib/automation/actions/send-whatsapp.ts` já faz.
- **Commits:** `feat: …`/`fix: …` em português, terminando com a linha de co-autoria pedida pela sessão. PR com corpo terminando em `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20261202140000_9704_ativos_de_midia.sql` | `org_media_assets` + `channel_variables.asset_id` |
| `lib/midia/ativos.ts` (+ `.test.ts`) | regras puras: tipo, mime aceito, caminho |
| `lib/midia/ativos-banco.ts` (+ `.test.ts`) | subir por URL, listar, copiar para a conversa |
| `lib/canais/ativos-do-canal.ts` (+ `.test.ts`) | `lerAtivosDoCanal` (chave → asset_id, padrão + número) |
| `lib/automation/envio-de-passos.ts` (+ `.test.ts`) | schema dos passos e orquestrador `enviarPassos` (puro, com enviador injetado) |
| `lib/automation/passos-pelo-handler.ts` (+ `.test.ts`) | enviador concreto pelo `sendMessageHandler` (regra e fluxo inline) |
| `lib/channels/interativo.ts` (+ `.test.ts`) | schema, payload `interactive`, texto numerado de reserva |
| `lib/mcp/tools/midia-escrita.ts` | `crm_upload_media_asset`, `crm_list_media_assets` |
| `supabase/migrations/20261202150000_9705_anexo_da_resposta_rapida.sql` | `crm_respostas_rapidas_anexos` |
| `app/api/v1/respostas-rapidas/[id]/anexo/route.ts` | copia o anexo da resposta para a conversa |

---

### Tarefa 1: Repositório de mídia da organização e variáveis de ativo por número

**Arquivos:**
- Criar: `supabase/migrations/20261202140000_9704_ativos_de_midia.sql`, `lib/midia/ativos.ts`, `lib/midia/ativos.test.ts`, `lib/canais/ativos-do-canal.ts`, `lib/canais/ativos-do-canal.test.ts`, `tests/invariants/org-media-assets-rls.test.ts`
- Modificar: `supabase/baseline.sql` (apêndice), `lib/database.types.ts`, `lib/canais/variaveis.ts` (ignorar linhas de ativo), `lib/canais/variaveis-escrita.ts` (gravar ativo), `lib/mcp/tools/canais-escrita.ts` (`crm_set_channel_variables` aceita `ativos`), `lib/audit/actions.ts` (`"media_asset.created"`)

**Interfaces:**
- Produz: `TipoDeMidia = "audio" | "image" | "video" | "document"`; `tipoDaMidia(mime: string): TipoDeMidia`; `validarMimeDoAtivo(mime: string): { ok: true } | { ok: false; motivo: string }`; `caminhoDoAtivo(organizationId: string, assetId: string, nome: string): string`; `extensaoDoMime(mime: string): string`; `TAMANHO_MAXIMO_DO_ATIVO = 16_777_216`; `lerAtivosDoCanal(admin, organizationId, channelSessionId: string | null): Promise<Record<string, string>>` (chave → `asset_id`); `gravarVariaveisDoCanal` passa a aceitar `ativos?: Record<string, string>` (chave → uuid do ativo).

- [ ] **Passo 1: Teste que falha (regras puras)**

```ts
// lib/midia/ativos.test.ts
// @vitest-environment node
import { describe, expect, it } from "vitest";

import { caminhoDoAtivo, extensaoDoMime, tipoDaMidia, validarMimeDoAtivo } from "@/lib/midia/ativos";

describe("caminhoDoAtivo", () => {
  it("fica sob a organização e o ativo, sem acento, espaço nem travessia", () => {
    expect(caminhoDoAtivo("org1", "a1", "Áudio de Boas Vindas (1).ogg")).toBe("org1/assets/a1/audio-de-boas-vindas-1.ogg");
    expect(caminhoDoAtivo("org1", "a1", "../../etc/passwd")).toBe("org1/assets/a1/etc-passwd");
  });
  it("nome vazio depois da limpeza vira 'arquivo'", () => {
    expect(caminhoDoAtivo("org1", "a1", "???")).toBe("org1/assets/a1/arquivo");
  });
});

describe("tipoDaMidia", () => {
  it.each([
    ["audio/ogg", "audio"],
    ["image/jpeg", "image"],
    ["image/png", "image"],
    ["video/mp4", "video"],
    ["application/pdf", "document"],
  ])("%s -> %s", (mime, tipo) => expect(tipoDaMidia(mime)).toBe(tipo));
});

describe("validarMimeDoAtivo", () => {
  it("áudio só ogg", () => {
    expect(validarMimeDoAtivo("audio/ogg")).toEqual({ ok: true });
    expect(validarMimeDoAtivo("audio/ogg; codecs=opus")).toEqual({ ok: true });
    expect(validarMimeDoAtivo("audio/wav")).toEqual({ ok: false, motivo: "audio_precisa_ser_ogg_opus" });
    expect(validarMimeDoAtivo("audio/mpeg").ok).toBe(false);
  });
  it("imagem, vídeo mp4 e pdf passam; o resto não", () => {
    for (const m of ["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"]) {
      expect(validarMimeDoAtivo(m)).toEqual({ ok: true });
    }
    expect(validarMimeDoAtivo("application/x-msdownload")).toEqual({ ok: false, motivo: "tipo_nao_aceito" });
  });
});

describe("extensaoDoMime", () => {
  it.each([
    ["audio/ogg", "ogg"],
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["video/mp4", "mp4"],
    ["application/pdf", "pdf"],
  ])("%s -> %s", (mime, ext) => expect(extensaoDoMime(mime)).toBe(ext));
});
```

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run lib/midia/ativos.test.ts` → FAIL ("Cannot find package '@/lib/midia/ativos'").

- [ ] **Passo 3: Implementar `lib/midia/ativos.ts`**

```ts
/**
 * Regras puras do repositório de mídia da organização (áudios, imagens e arquivos reutilizáveis em
 * automações e respostas rápidas). O arquivo mora no bucket privado `whatsapp-media`, em
 * `{organização}/assets/{ativo}/{nome}`; para enviar, é COPIADO para dentro da pasta da conversa.
 */
export type TipoDeMidia = "audio" | "image" | "video" | "document";

/** 16 MB: o Storage do self-host é uma cota de 1 GB dividida com `whatsapp-media`. */
export const TAMANHO_MAXIMO_DO_ATIVO = 16_777_216;

const ACEITOS: Record<string, string> = {
  "audio/ogg": "ogg",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

/** `audio/ogg; codecs=opus` → `audio/ogg`. */
function semParametros(mime: string): string {
  return mime.split(";")[0]!.trim().toLowerCase();
}

export function tipoDaMidia(mime: string): TipoDeMidia {
  const m = semParametros(mime);
  if (m.startsWith("audio/")) return "audio";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  return "document";
}

/** Áudio só ogg/opus: a API oficial não converte (e manda erro), o WAHA aceita. */
export function validarMimeDoAtivo(mime: string): { ok: true } | { ok: false; motivo: string } {
  const m = semParametros(mime);
  if (m.startsWith("audio/") && m !== "audio/ogg") return { ok: false, motivo: "audio_precisa_ser_ogg_opus" };
  return m in ACEITOS ? { ok: true } : { ok: false, motivo: "tipo_nao_aceito" };
}

export function extensaoDoMime(mime: string): string {
  return ACEITOS[semParametros(mime)] ?? "bin";
}

export function caminhoDoAtivo(organizationId: string, assetId: string, nome: string): string {
  const limpo =
    nome
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/\.{2,}/g, "")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|-(?=\.)|[-.]+$/g, "")
      .toLowerCase() || "arquivo";
  return `${organizationId}/assets/${assetId}/${limpo}`;
}
```

Rodar de novo: PASS. (Se o caso `../../etc/passwd` não der `etc-passwd`, ajuste só a regex de limpeza até passar; o requisito é: nenhum `/`, nenhum `..`, nada fora de `{org}/assets/{id}/`.)

- [ ] **Passo 4: Migration 9704**

```sql
-- manifest: repositório de mídia da organização (áudio, imagem, arquivo reutilizáveis) e variável do número que aponta para um ativo
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
  constraint org_media_assets_caminho check (position('/assets/' in storage_path) > 0)
);
create unique index if not exists org_media_assets_org_id_unica on public.org_media_assets (organization_id, id);
create index if not exists idx_org_media_assets_org on public.org_media_assets (organization_id, created_at desc);
alter table public.org_media_assets enable row level security;
drop policy if exists tenant_isolation_org_media_assets_all on public.org_media_assets;
create policy tenant_isolation_org_media_assets_all on public.org_media_assets
  for all
  using (organization_id in (select public.fn_user_org_ids()))
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));
revoke all on public.org_media_assets from anon;

-- A variável do número pode apontar para um ativo (o áudio de boas-vindas DESTE atendente).
-- FK composta: o ativo tem de ser da MESMA organização da variável.
alter table public.channel_variables add column if not exists asset_id uuid;
alter table public.channel_variables alter column value_text drop not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'channel_variables_ativo_fk') then
    alter table public.channel_variables add constraint channel_variables_ativo_fk
      foreign key (organization_id, asset_id) references public.org_media_assets(organization_id, id) on delete restrict;
  end if;
end $$;
alter table public.channel_variables drop constraint if exists channel_variables_valor_ou_ativo;
alter table public.channel_variables add constraint channel_variables_valor_ou_ativo
  check ((value_text is not null) <> (asset_id is not null));
```

Cole o mesmo corpo (sem a linha `-- manifest:`) no `baseline.sql` com o rótulo `-- ---- FORK ESCALE · ativos de mídia (migration 9704) ----`, logo **depois** do bloco `(migration 9703)`. Em `lib/database.types.ts`: tabela `org_media_assets` (Row/Insert/Update com as 7 colunas) e, em `channel_variables`, `asset_id: string | null` (Row), `asset_id?: string | null` (Insert/Update) e `value_text: string | null` (Row), `value_text?: string | null` (Insert). Acrescente `"media_asset.created"` no fim de `lib/audit/actions.ts`.

- [ ] **Passo 5: Variáveis de texto ignoram as de ativo; leitura dos ativos por número (teste antes)**

```ts
// lib/canais/ativos-do-canal.test.ts
// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { lerAtivosDoCanal } from "@/lib/canais/ativos-do-canal";
import { mesclarVariaveis } from "@/lib/canais/variaveis";

const CANAL = "22222222-2222-4222-8222-222222222222";

function banco(linhas: Array<Record<string, unknown>>): SupabaseClient {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "or", "not"]) q[m] = () => q;
  q.then = (ok: (r: unknown) => unknown) => Promise.resolve({ data: linhas, error: null }).then(ok);
  return { from: () => q } as unknown as SupabaseClient;
}

describe("lerAtivosDoCanal", () => {
  it("o ativo do número vence o padrão da organização", async () => {
    const r = await lerAtivosDoCanal(
      banco([
        { channel_session_id: null, chave: "bv1", asset_id: "ativo-padrao" },
        { channel_session_id: null, chave: "bv2", asset_id: "bv2-padrao" },
        { channel_session_id: CANAL, chave: "bv1", asset_id: "ativo-da-gaby" },
      ]),
      "org",
      CANAL,
    );
    expect(r).toEqual({ bv1: "ativo-da-gaby", bv2: "bv2-padrao" });
  });
});

describe("mesclarVariaveis com linhas de ativo", () => {
  it("linha de ativo (value_text nulo) não vira {{canal.*}}", () => {
    const r = mesclarVariaveis(
      [
        { channel_session_id: null, chave: "pix_banco", value_text: "Mercado Pago" },
        { channel_session_id: CANAL, chave: "bv1", value_text: null },
      ],
      CANAL,
    );
    expect(r).toEqual({ pix_banco: "Mercado Pago" });
  });
});
```

Implementação: em `lib/canais/variaveis.ts`, `LinhaDeVariavel.value_text` passa a `string | null` e `mesclarVariaveis` pula `value_text === null` nos dois laços (`if (l.value_text === null) continue;`). Novo arquivo:

```ts
// lib/canais/ativos-do-canal.ts
import type { SupabaseClient } from "@supabase/supabase-js";

interface LinhaDeAtivo {
  channel_session_id: string | null;
  chave: string;
  asset_id: string | null;
}

/** Chave → id do ativo, para `var:<chave>` nos passos: padrão da organização, sobrescrito pelo número. */
export async function lerAtivosDoCanal(
  admin: SupabaseClient,
  organizationId: string,
  channelSessionId: string | null,
): Promise<Record<string, string>> {
  let consulta = admin
    .from("channel_variables")
    .select("channel_session_id, chave, asset_id")
    .eq("organization_id", organizationId)
    .not("asset_id", "is", null);
  consulta =
    channelSessionId === null
      ? consulta.is("channel_session_id", null)
      : consulta.or(`channel_session_id.is.null,channel_session_id.eq.${channelSessionId}`);
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as LinhaDeAtivo[];
  const resultado: Record<string, string> = {};
  for (const l of linhas) if (l.channel_session_id === null && l.asset_id) resultado[l.chave] = l.asset_id;
  for (const l of linhas) if (l.channel_session_id !== null && l.asset_id) resultado[l.chave] = l.asset_id;
  return resultado;
}
```

(O dublê do teste não implementa `is`: acrescente `"is"` à lista de métodos do `q` no teste se precisar.)

- [ ] **Passo 6: Gravar variável de ativo (`gravarVariaveisDoCanal` e a tool)**

Em `lib/canais/variaveis-escrita.ts`, a entrada ganha `ativos?: Record<string, string>` (chave → uuid). Para cada ativo: valide a chave com `CHAVE_DE_VARIAVEL` e não-reservada; confirme que o ativo existe **na organização** (`org_media_assets` filtrando `organization_id` e `id`; ausente → `throw new Error("ativo_nao_encontrado:<chave>")`); grave com o mesmo update-ou-insert das variáveis de texto, mas com `{ asset_id, value_text: null }`. Uma chave não pode vir nos dois mapas (`chave_em_texto_e_ativo:<chave>`). O audit leva `{ chaves, ativos: Object.keys(ativos) }`.

Teste a mais em `lib/canais/variaveis-escrita.test.ts` (o dublê de lá já registra `inserts`/`updates`): (a) ativo de outra organização → recusa sem gravar; (b) ativo da organização → insert com `asset_id` e `value_text: null`.

Na tool `crm_set_channel_variables` (`lib/mcp/tools/canais-escrita.ts`): `valores` vira opcional (default `{}`), novo campo `ativos: z.record(z.string(), z.string().uuid()).optional()`, e o `refine` passa a exigir de 1 a 30 entradas somando os dois. Descrição ganha: "Para áudio por número use `ativos` (`{ bv1: <asset_id> }`), referenciado como `var:bv1` nos passos de envio." Ajuste o teste `tests/unit/mcp-canais-escrita.test.ts` (o caso "recusa objeto vazio" continua: sem `valores` nem `ativos` = recusa).

- [ ] **Passo 7: Teste de RLS (db, roda só na Tarefa 9)**

Crie `tests/invariants/org-media-assets-rls.test.ts` copiando a estrutura de `tests/invariants/channel-business-hours-rls.test.ts` (UUIDs próprios com prefixo `cafe0c03-`). Casos: agent lê da própria organização e zero da vizinha; agent não insere; manager insere; `channel_variables` com `asset_id` de ativo de OUTRA organização é recusada (FK composta); linha com `value_text` e `asset_id` juntos é recusada (`channel_variables_valor_ou_ativo`).

- [ ] **Passo 8: Rodar** — `corepack pnpm vitest run lib/midia lib/canais tests/unit/mcp-canais-escrita.test.ts lib/automation/canal-no-contexto.test.ts` → PASS; eslint dos arquivos alterados.

- [ ] **Passo 9: Commit** — `git add supabase lib tests && git commit -m "feat: repositório de mídia da organização e variável de ativo por número"`

---

### Tarefa 2: Subir ativo por URL, listar e copiar para a conversa (+ tools MCP)

**Arquivos:**
- Criar: `lib/midia/ativos-banco.ts`, `lib/midia/ativos-banco.test.ts`, `lib/mcp/tools/midia-escrita.ts`, `tests/unit/mcp-midia-escrita.test.ts`
- Modificar: `lib/mcp/tools/index.ts`, `lib/mcp/tools/catalogo/operacao.ts`

**Interfaces:**
- Consome: `caminhoDoAtivo`, `validarMimeDoAtivo`, `tipoDaMidia`, `extensaoDoMime`, `TAMANHO_MAXIMO_DO_ATIVO` (T1); `assertUrlDeMidiaSegura` de `@/lib/messaging/media/url-de-midia-externa` (leia a assinatura antes: `grep -n "export" lib/messaging/media/url-de-midia-externa.ts`).
- Produz: `AtivoLido = { id: string; nome: string; mime: string; sizeBytes: number; tipo: TipoDeMidia }`; `subirAtivoPorUrl(admin, { organizationId, nome, url, requestId, actorUserId }): Promise<AtivoLido>`; `listarAtivos(admin, organizationId): Promise<AtivoLido[]>`; `copiarAtivoParaConversa(admin, { organizationId, assetId, conversationId }): Promise<{ storagePath: string; mime: string; tipo: TipoDeMidia }>`; tools `crm_upload_media_asset`, `crm_list_media_assets`.

- [ ] **Passo 1: Teste que falha**

`lib/midia/ativos-banco.test.ts` com `vi.mock("@/lib/messaging/media/url-de-midia-externa")` (a guarda passa ou lança conforme o caso), `vi.stubGlobal("fetch", …)` e um admin falso que registra `storage.from(bucket).upload(caminho, …)`, `storage.from(bucket).copy(de, para)` e os inserts. Casos:
1. `subirAtivoPorUrl` com `content-type: audio/ogg` e 10 bytes: faz upload em `whatsapp-media` no caminho `org/assets/<id>/<nome>` e insere `org_media_assets` com `organization_id` do contexto; devolve `{ tipo: "audio" }`.
2. `content-type: audio/wav` → lança `audio_precisa_ser_ogg_opus` sem upload.
3. `content-length` acima de 16 MB (ou corpo maior) → lança `ativo_grande_demais` sem upload.
4. URL recusada pela guarda anti-SSRF → lança, sem `fetch`.
5. `copiarAtivoParaConversa` com ativo de outra organização (o `maybeSingle` filtrado devolve `null`) → lança `ativo_nao_encontrado`, sem `copy`.
6. `copiarAtivoParaConversa` com conversa de outra organização → lança `conversa_nao_encontrada`, sem `copy`.
7. caminho feliz: `copy("org/assets/a1/bv1.ogg", "org/conv1/auto-<uuid>.ogg")` e devolve `{ storagePath, mime: "audio/ogg", tipo: "audio" }`.

- [ ] **Passo 2: Implementar `lib/midia/ativos-banco.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { audit } from "@/lib/audit";
import { assertUrlDeMidiaSegura } from "@/lib/messaging/media/url-de-midia-externa";
import {
  caminhoDoAtivo,
  extensaoDoMime,
  TAMANHO_MAXIMO_DO_ATIVO,
  tipoDaMidia,
  validarMimeDoAtivo,
  type TipoDeMidia,
} from "@/lib/midia/ativos";

const BUCKET = "whatsapp-media";
const TEMPO_LIMITE_DO_DOWNLOAD_MS = 20_000;

export interface AtivoLido {
  id: string;
  nome: string;
  mime: string;
  sizeBytes: number;
  tipo: TipoDeMidia;
}

async function baixar(url: string): Promise<{ bytes: Uint8Array; mime: string }> {
  await assertUrlDeMidiaSegura(url);
  const resposta = await fetch(url, { signal: AbortSignal.timeout(TEMPO_LIMITE_DO_DOWNLOAD_MS), redirect: "error" });
  if (!resposta.ok) throw new Error(`download_falhou:${resposta.status}`);
  const declarado = Number(resposta.headers.get("content-length") ?? "0");
  if (declarado > TAMANHO_MAXIMO_DO_ATIVO) throw new Error("ativo_grande_demais");
  const mime = resposta.headers.get("content-type") ?? "application/octet-stream";
  const validacao = validarMimeDoAtivo(mime);
  if (!validacao.ok) throw new Error(validacao.motivo);
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("ativo_vazio");
  if (bytes.byteLength > TAMANHO_MAXIMO_DO_ATIVO) throw new Error("ativo_grande_demais");
  return { bytes, mime: mime.split(";")[0]!.trim().toLowerCase() };
}

/** Baixa da URL (anti-SSRF, 16 MB, 20 s), guarda no bucket privado e registra o ativo na organização. */
export async function subirAtivoPorUrl(
  admin: SupabaseClient,
  entrada: { organizationId: string; nome: string; url: string; requestId: string; actorUserId: string | null },
): Promise<AtivoLido> {
  const { bytes, mime } = await baixar(entrada.url);
  const id = randomUUID();
  const storagePath = caminhoDoAtivo(entrada.organizationId, id, entrada.nome);
  const { error: erroDoUpload } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: mime, upsert: false });
  if (erroDoUpload) throw new Error(`upload_falhou:${erroDoUpload.message}`);
  const { error } = await admin.from("org_media_assets").insert({
    id,
    organization_id: entrada.organizationId,
    nome: entrada.nome.slice(0, 120),
    mime,
    size_bytes: bytes.byteLength,
    storage_path: storagePath,
  });
  if (error) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }
  void audit({
    action: "media_asset.created",
    actorUserId: entrada.actorUserId,
    organizationId: entrada.organizationId,
    resourceType: "media_asset",
    resourceId: id,
    requestId: entrada.requestId,
    metadata: { mime, size_bytes: bytes.byteLength },
  });
  return { id, nome: entrada.nome, mime, sizeBytes: bytes.byteLength, tipo: tipoDaMidia(mime) };
}

export async function listarAtivos(admin: SupabaseClient, organizationId: string): Promise<AtivoLido[]> {
  const { data, error } = await admin
    .from("org_media_assets")
    .select("id, nome, mime, size_bytes")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: string; nome: string; mime: string; size_bytes: number }>).map((a) => ({
    id: a.id,
    nome: a.nome,
    mime: a.mime,
    sizeBytes: a.size_bytes,
    tipo: tipoDaMidia(a.mime),
  }));
}

/**
 * O `sendMessageHandler` só aceita `media_storage_path` dentro de `{org}/{conversa}/…` (anti-travessia):
 * enviar um ativo é COPIAR o objeto para lá. Ativo e conversa são lidos filtrando a organização.
 */
export async function copiarAtivoParaConversa(
  admin: SupabaseClient,
  entrada: { organizationId: string; assetId: string; conversationId: string },
): Promise<{ storagePath: string; mime: string; tipo: TipoDeMidia }> {
  const [{ data: ativo, error: erroDoAtivo }, { data: conversa, error: erroDaConversa }] = await Promise.all([
    admin
      .from("org_media_assets")
      .select("storage_path, mime")
      .eq("organization_id", entrada.organizationId)
      .eq("id", entrada.assetId)
      .maybeSingle(),
    admin
      .from("conversations")
      .select("id")
      .eq("organization_id", entrada.organizationId)
      .eq("id", entrada.conversationId)
      .maybeSingle(),
  ]);
  if (erroDoAtivo) throw new Error(erroDoAtivo.message);
  if (erroDaConversa) throw new Error(erroDaConversa.message);
  if (!ativo) throw new Error("ativo_nao_encontrado");
  if (!conversa) throw new Error("conversa_nao_encontrada");
  const { storage_path: origem, mime } = ativo as { storage_path: string; mime: string };
  const destino = `${entrada.organizationId}/${entrada.conversationId}/auto-${randomUUID()}.${extensaoDoMime(mime)}`;
  const { error } = await admin.storage.from(BUCKET).copy(origem, destino);
  if (error) throw new Error(`copia_falhou:${error.message}`);
  return { storagePath: destino, mime, tipo: tipoDaMidia(mime) };
}
```

Confira com `grep -n "isMediaPathOwnedBy" -A12 lib/messaging/media/upload-validation.ts` que `{org}/{conversa}/auto-<uuid>.<ext>` passa na régua; se a régua pedir outro formato, ajuste `destino` e o teste 7.

- [ ] **Passo 3: Tools MCP** (`lib/mcp/tools/midia-escrita.ts`)

```ts
import { z } from "zod";

import { listarAtivos, subirAtivoPorUrl } from "@/lib/midia/ativos-banco";

import type { McpToolDefinition } from "../types";

const subirShape = {
  nome: z.string().trim().min(1).max(120),
  url: z.string().url().max(2000),
};

export const crmUploadMediaAsset: McpToolDefinition<typeof subirShape> = {
  name: "crm_upload_media_asset",
  description:
    "Baixa um arquivo de uma URL pública e guarda no repositório de mídia da organização (áudio .ogg/opus, " +
    "imagem jpg/png/webp, vídeo mp4 ou pdf, até 16 MB). Devolve o asset_id, usado nos passos de envio " +
    "(`midia` com `asset`) ou ligado a um número com crm_set_channel_variables (`ativos`).",
  inputSchema: subirShape,
  category: "write",
  requiresRole: "manager",
  requiresScope: "mcp:write",
  handler: async (input, ctx) => {
    const ativo = await subirAtivoPorUrl(ctx.supabase, {
      organizationId: ctx.organizationId,
      nome: input.nome,
      url: input.url,
      requestId: ctx.requestId,
      actorUserId: ctx.actor.type === "user" ? ctx.actor.id : null,
    });
    return { asset_id: ativo.id, mime: ativo.mime, tamanho: ativo.sizeBytes, tipo: ativo.tipo };
  },
};

const listarShape = {};

export const crmListMediaAssets: McpToolDefinition<typeof listarShape> = {
  name: "crm_list_media_assets",
  description: "Lista os arquivos do repositório de mídia da organização: asset_id, nome, tipo e tamanho.",
  inputSchema: listarShape,
  category: "read",
  requiresRole: "manager",
  requiresScope: "mcp:read",
  handler: async (_input, ctx) => ({ ativos: await listarAtivos(ctx.supabase, ctx.organizationId) }),
};
```

Catálogo (`catalogo/operacao.ts`, antes de `// ---- time ----`): `crm_upload_media_asset` — `rotulo: "Guardar um áudio, imagem ou arquivo"`, `explicacao: "Traz um arquivo de um endereço da internet para a biblioteca da empresa, para as mensagens automáticas e respostas rápidas usarem."`, `oQueToca: "Biblioteca de mídia"`, `risco: "atencao"`, `pacotes: ["organizar"]`; `crm_list_media_assets` — `rotulo: "Ver a biblioteca de mídia"`, `explicacao: "Lista os áudios, imagens e arquivos guardados pela empresa, com o nome e o tipo de cada um."`, `risco: "seguro"`, `pacotes: ["organizar"]`. Registre as duas em `index.ts` (import + lista, junto de `crmSetChannelBusinessHours`). `tests/unit/mcp-midia-escrita.test.ts`: organização do contexto, categoria/papel, falha vira erro (mock de `@/lib/midia/ativos-banco`).

- [ ] **Passo 4: Rodar** — `corepack pnpm vitest run lib/midia tests/unit/mcp-midia-escrita.test.ts lib/mcp tests/unit/mcp tests/unit/catalogo` → PASS.

- [ ] **Passo 5: Commit + PR da Tarefa 1–2** — `git commit -m "feat: subir mídia por URL e copiar para a conversa (+ MCP)"`; push na branch; `gh pr create --repo rgisjr/escale-crm --base main …`; `gh pr merge <n> --repo rgisjr/escale-crm --merge`.

---

### Tarefa 3: Passos de envio — schema e orquestrador

**Arquivos:**
- Criar: `lib/automation/envio-de-passos.ts`, `lib/automation/envio-de-passos.test.ts`

**Interfaces:**
- Consome: `TipoDeMidia` (T1).
- Produz:
  - `passoTextoSchema`, `passoMidiaSchema`, `passosSchema` (1..5 passos; `interativo` entra na T7), `type PassoDeEnvio`.
  - `REFERENCIA_DE_ATIVO = /^([0-9a-f-]{36}|var:[a-z][a-z0-9_]{0,39})$/`.
  - `resolverReferenciaDeAtivo(ref: string, ativosDoCanal: Record<string, string>): string | null`.
  - `interface EnviadorDePassos { texto(corpo: string, chave: string): Promise<void>; midia(m: { assetId: string; legenda?: string }, chave: string): Promise<void>; }` (cada chamada já é idempotente pela `chave`).
  - `enviarPassos(passos: readonly PassoDeEnvio[], deps: { enviador: EnviadorDePassos; ativosDoCanal: Record<string, string>; renderizar: (texto: string) => string; chaveBase: string }): Promise<ResultadoDosPassos>` com `ResultadoDosPassos = { ok: true; enviados: number } | { ok: false; enviados: number; erro: string }`.

- [ ] **Passo 1: Teste que falha**

```ts
// lib/automation/envio-de-passos.test.ts
// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { enviarPassos, passosSchema, resolverReferenciaDeAtivo, type EnviadorDePassos } from "@/lib/automation/envio-de-passos";

const ATIVO = "11111111-1111-4111-8111-111111111111";

function enviador(falharNo?: number): EnviadorDePassos & { chamadas: string[] } {
  const chamadas: string[] = [];
  let n = 0;
  const registrar = async (o: string): Promise<void> => {
    n += 1;
    if (n === falharNo) throw new Error("meta_131026");
    chamadas.push(o);
  };
  return {
    chamadas,
    texto: vi.fn(async (corpo: string, chave: string) => registrar(`texto:${corpo}:${chave}`)),
    midia: vi.fn(async (m: { assetId: string }, chave: string) => registrar(`midia:${m.assetId}:${chave}`)),
  };
}

describe("passosSchema", () => {
  const texto = { tipo: "texto", texto: "oi" } as const;
  it("aceita de 1 a 5 passos", () => {
    expect(passosSchema.safeParse([texto]).success).toBe(true);
    expect(passosSchema.safeParse(Array(6).fill(texto)).success).toBe(false);
    expect(passosSchema.safeParse([]).success).toBe(false);
  });
  it("mídia aceita uuid ou var:<chave> e recusa o resto", () => {
    expect(passosSchema.safeParse([{ tipo: "midia", asset: ATIVO }]).success).toBe(true);
    expect(passosSchema.safeParse([{ tipo: "midia", asset: "var:bv1" }]).success).toBe(true);
    expect(passosSchema.safeParse([{ tipo: "midia", asset: "../x" }]).success).toBe(false);
  });
  it("não existe pausa configurável (o espaçamento anti-ban separa as mensagens)", () => {
    expect(passosSchema.safeParse([{ ...texto, pausa_ms: 4000 }]).success).toBe(false);
  });
});

describe("resolverReferenciaDeAtivo", () => {
  it("uuid passa, var:<chave> lê o número, ausente é null", () => {
    expect(resolverReferenciaDeAtivo(ATIVO, {})).toBe(ATIVO);
    expect(resolverReferenciaDeAtivo("var:bv1", { bv1: "do-numero" })).toBe("do-numero");
    expect(resolverReferenciaDeAtivo("var:nao_tem", {})).toBeNull();
  });
});

describe("enviarPassos", () => {
  const deps = (e: EnviadorDePassos) => ({
    enviador: e,
    ativosDoCanal: { bv1: "ativo-bv1" },
    renderizar: (t: string) => t.replace("{{canal.pix_chave}}", "519"),
    chaveBase: "job-1",
  });

  it("envia na ordem, renderiza o texto e dá uma chave por passo", async () => {
    const e = enviador();
    const r = await enviarPassos(
      [{ tipo: "midia", asset: "var:bv1" }, { tipo: "texto", texto: "PIX {{canal.pix_chave}}" }],
      deps(e),
    );
    expect(r).toEqual({ ok: true, enviados: 2 });
    expect(e.chamadas).toEqual(["midia:ativo-bv1:job-1:0", "texto:PIX 519:job-1:1"]);
  });

  it("variável de ativo ausente no número interrompe antes de enviar qualquer coisa", async () => {
    const e = enviador();
    const r = await enviarPassos([{ tipo: "texto", texto: "oi" }, { tipo: "midia", asset: "var:bv9" }], deps(e));
    expect(r).toEqual({ ok: false, enviados: 0, erro: "ativo_ausente_no_numero:bv9" });
    expect(e.chamadas).toEqual([]);
  });

  it("falha num passo interrompe os seguintes e diz qual", async () => {
    const e = enviador(2);
    const r = await enviarPassos(
      [{ tipo: "texto", texto: "a" }, { tipo: "texto", texto: "b" }, { tipo: "texto", texto: "c" }],
      deps(e),
    );
    expect(r).toEqual({ ok: false, enviados: 1, erro: "passo_falhou:1:meta_131026" });
    expect(e.chamadas).toEqual(["texto:a:job-1:0"]);
  });

  it("texto que fica vazio depois de renderizado não é enviado vazio", async () => {
    const e = enviador();
    const r = await enviarPassos([{ tipo: "texto", texto: "{{canal.x}}" }], { ...deps(e), renderizar: () => "  " });
    expect(r).toEqual({ ok: false, enviados: 0, erro: "texto_vazio:0" });
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run lib/automation/envio-de-passos.test.ts`.

- [ ] **Passo 3: Implementar**

```ts
// lib/automation/envio-de-passos.ts
/**
 * PASSOS DE ENVIO: uma sequência curta (até 5) de texto, mídia e — na Tarefa 7 — botões/lista, enviada
 * na ordem pela regra (`send_whatsapp_message.passos`) e pelo nó de ação do fluxo (`mode: "steps"`).
 *
 * Sem pausa configurável: o cron do relógio tem 25 s por rodada e o espaçamento anti-ban do número já
 * separa as mensagens. Intervalo maior é um nó `wait` do fluxo.
 *
 * `asset: "var:<chave>"` é o que faz UM fluxo servir N números com áudios diferentes: a chave é lida
 * das variáveis de ativo do número da conversa (`lerAtivosDoCanal`). Tudo é resolvido ANTES do primeiro
 * envio: faltando o áudio de um número, nada sai pela metade.
 */
import { z } from "zod";

export const REFERENCIA_DE_ATIVO = /^([0-9a-f-]{36}|var:[a-z][a-z0-9_]{0,39})$/;

export const passoTextoSchema = z.strictObject({
  tipo: z.literal("texto"),
  texto: z.string().trim().min(1).max(4000),
});

export const passoMidiaSchema = z.strictObject({
  tipo: z.literal("midia"),
  asset: z.string().regex(REFERENCIA_DE_ATIVO),
  legenda: z.string().max(1024).optional(),
});

export const passosSchema = z
  .array(z.discriminatedUnion("tipo", [passoTextoSchema, passoMidiaSchema]))
  .min(1)
  .max(5);

export type PassoDeEnvio = z.infer<typeof passosSchema>[number];

export interface EnviadorDePassos {
  texto(corpo: string, chave: string): Promise<void>;
  midia(m: { assetId: string; legenda?: string }, chave: string): Promise<void>;
}

export type ResultadoDosPassos = { ok: true; enviados: number } | { ok: false; enviados: number; erro: string };

export function resolverReferenciaDeAtivo(ref: string, ativosDoCanal: Record<string, string>): string | null {
  if (!ref.startsWith("var:")) return ref;
  const chave = ref.slice(4);
  return Object.hasOwn(ativosDoCanal, chave) ? (ativosDoCanal[chave] ?? null) : null;
}

type PassoPronto = { tipo: "texto"; corpo: string } | { tipo: "midia"; assetId: string; legenda?: string };

function preparar(
  passos: readonly PassoDeEnvio[],
  ativosDoCanal: Record<string, string>,
  renderizar: (texto: string) => string,
): PassoPronto[] | { erro: string } {
  const prontos: PassoPronto[] = [];
  for (const [i, p] of passos.entries()) {
    if (p.tipo === "texto") {
      const corpo = renderizar(p.texto).trim();
      if (corpo === "") return { erro: `texto_vazio:${i}` };
      prontos.push({ tipo: "texto", corpo });
      continue;
    }
    const assetId = resolverReferenciaDeAtivo(p.asset, ativosDoCanal);
    if (assetId === null) return { erro: `ativo_ausente_no_numero:${p.asset.slice(4)}` };
    const legenda = p.legenda === undefined ? undefined : renderizar(p.legenda).trim() || undefined;
    prontos.push({ tipo: "midia", assetId, ...(legenda ? { legenda } : {}) });
  }
  return prontos;
}

export async function enviarPassos(
  passos: readonly PassoDeEnvio[],
  deps: {
    enviador: EnviadorDePassos;
    ativosDoCanal: Record<string, string>;
    renderizar: (texto: string) => string;
    chaveBase: string;
  },
): Promise<ResultadoDosPassos> {
  const prontos = preparar(passos, deps.ativosDoCanal, deps.renderizar);
  if (!Array.isArray(prontos)) return { ok: false, enviados: 0, erro: prontos.erro };
  let enviados = 0;
  for (const [i, p] of prontos.entries()) {
    const chave = `${deps.chaveBase}:${i}`;
    try {
      if (p.tipo === "texto") await deps.enviador.texto(p.corpo, chave);
      else await deps.enviador.midia({ assetId: p.assetId, ...(p.legenda ? { legenda: p.legenda } : {}) }, chave);
      enviados += 1;
    } catch (err) {
      const motivo = err instanceof Error ? err.message : String(err);
      return { ok: false, enviados, erro: `passo_falhou:${i}:${motivo}` };
    }
  }
  return { ok: true, enviados };
}
```

- [ ] **Passo 4: Rodar** — PASS. **Passo 5: Commit** — `git commit -m "feat: passos de envio (texto e mídia) com orquestrador único"`

---

### Tarefa 4: Passos na regra automática (`send_whatsapp_message.passos`)

**Arquivos:**
- Criar: `lib/automation/passos-pelo-handler.ts`, `lib/automation/passos-pelo-handler.test.ts`, `lib/automation/actions/send-whatsapp-passos.test.ts`
- Modificar: `lib/schemas/webhooks.ts` (ação `send_whatsapp_message`), `lib/automation/actions/send-whatsapp.ts`, `lib/automation/engine.ts` (`regraUsaVariavelDoCanal` também olha `passos`), `app/app/webhooks/_components/ActionConfigForm.tsx` e `app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao.tsx` (só exibir), `lib/mcp/tools/automacao-escrita.ts` (descrição)

**Interfaces:**
- Consome: `enviarPassos`, `passosSchema`, `EnviadorDePassos` (T3); `copiarAtivoParaConversa` (T2); `lerAtivosDoCanal` (T1); `sendMessageHandler` de `@/app/api/v1/messages/_handler`.
- Produz: `enviadorPeloHandler(admin, { organizationId, conversationId, contexto: Parameters<typeof sendMessageHandler>[1], espacar: () => Promise<void> }): EnviadorDePassos` — usado aqui e no fluxo inline (T5).

- [ ] **Passo 1: Ler o envio atual** — `sed -n 1,90p lib/automation/actions/send-whatsapp.ts` e `grep -n "reportarEnvio" -A30 lib/automation/desfecho-do-envio.ts`. O `execute` monta `boundary` com `serviceForAutomation`, espaça com `espacarEnvio(sessionId)` e chama `sendMessageHandler`; `reportarEnvio` traduz o estado da mensagem. Os passos usam o mesmo `boundary`, o mesmo ator e o mesmo `requestId` (`rule:${ctx.ruleId}`).

- [ ] **Passo 2: Testes que falham**
  - `passos-pelo-handler.test.ts` (com `vi.mock` de `@/app/api/v1/messages/_handler` e de `@/lib/midia/ativos-banco`): `texto("oi","k:0")` chama `sendMessageHandler` com `{ conversation_id, type: "text", body: "oi", metadata: { idempotency_key: "k:0" } }` depois de `espacar()`; `midia({assetId},"k:1")` copia o ativo para a conversa e chama com `{ type: "audio", media_storage_path, media_mime: "audio/ogg", metadata: { idempotency_key: "k:1" } }` (sem `body` quando não há legenda); mensagem devolvida com `status: "failed"` → lança `envio_falhou:<error_code>`.
  - `actions/send-whatsapp-passos.test.ts` (modelo do dublê: `lib/automation/actions/send-ai-message.test.ts`): config `{ channel_session_id: "conversation", passos: [áudio var:bv1, texto] }` → duas chamadas ao handler na ordem; config com `template` continua o caminho de sempre; schema recusa `template` **e** `passos` juntos e recusa nenhum dos dois.

- [ ] **Passo 3: Implementar**

`lib/schemas/webhooks.ts`, ação `send_whatsapp_message`:

```ts
  z.object({
    type: z.literal("send_whatsapp_message"),
    config: z
      .object({
        // `conversation` = o número pelo qual a conversa acontece (uma automação, N canais).
        channel_session_id: z.union([z.string().uuid(), z.literal("conversation")]),
        template: z.string().min(1).max(2000).optional(),
        /** Sequência curta de texto e mídia (e botões/lista), no lugar do texto único. */
        passos: passosSchema.optional(),
      })
      .refine((c) => (c.template === undefined) !== (c.passos === undefined), {
        message: "Informe o texto da mensagem ou a sequência de passos (um dos dois).",
        path: ["template"],
      }),
  }),
```

(importe `passosSchema` de `@/lib/automation/envio-de-passos`; frase nova com linha `es` no dicionário.) `ActionConfigForm.tsx`: o tipo da ação ganha `passos?: unknown[]` e `template?: string`; quando `config.passos` existir, o formulário mostra só o aviso `t("Sequência de mensagens configurada pelo MCP. Edite pelo assistente.")` em vez do textarea (não destrua `passos` ao salvar: o `onChange` preserva `...config`). `CaixaDaAutomacao.tsx`: `case "send_whatsapp_message"` mostra `t("Sequência de {n} mensagens")` quando houver `passos` (use interpolação já existente no arquivo, ou `${n} ${t("mensagens em sequência")}`).

`lib/automation/passos-pelo-handler.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { sendMessageHandler } from "@/app/api/v1/messages/_handler";
import type { EnviadorDePassos } from "@/lib/automation/envio-de-passos";
import { copiarAtivoParaConversa } from "@/lib/midia/ativos-banco";

type ContextoDoEnvio = Parameters<typeof sendMessageHandler>[1];
type CorpoDoEnvio = Parameters<typeof sendMessageHandler>[2];

function conferir(mensagem: unknown): void {
  const m = mensagem as { status?: string; error_code?: string | null } | null;
  if (m?.status === "failed") throw new Error(`envio_falhou:${m.error_code ?? "sem_codigo"}`);
}

/** Envia cada passo pelo `sendMessageHandler` (a cadeia de sempre: ledger, janela, guardas do canal). */
export function enviadorPeloHandler(
  admin: SupabaseClient,
  entrada: { organizationId: string; conversationId: string; contexto: ContextoDoEnvio; espacar: () => Promise<void> },
): EnviadorDePassos {
  const enviar = async (corpo: CorpoDoEnvio): Promise<void> => {
    await entrada.espacar();
    conferir(await sendMessageHandler(admin, entrada.contexto, corpo));
  };
  return {
    texto: (body, chave) =>
      enviar({ conversation_id: entrada.conversationId, type: "text", body, metadata: { idempotency_key: chave } } as CorpoDoEnvio),
    midia: async ({ assetId, legenda }, chave) => {
      const copia = await copiarAtivoParaConversa(admin, {
        organizationId: entrada.organizationId,
        assetId,
        conversationId: entrada.conversationId,
      });
      await enviar({
        conversation_id: entrada.conversationId,
        type: copia.tipo,
        media_storage_path: copia.storagePath,
        media_mime: copia.mime,
        ...(legenda ? { body: legenda } : {}),
        metadata: { idempotency_key: chave },
      } as CorpoDoEnvio);
    },
  };
}
```

Confira os nomes de `type` aceitos para mídia: `grep -n "messageTypeSchema" -A6 lib/schemas/messaging.ts`. Se o vocabulário usar `file` em vez de `document`, mapeie `document → <o nome do schema>` aqui (e no teste).

Em `send-whatsapp.ts` (`execute`), depois de montar `boundary`/`conversationId`:

```ts
    const passos = Array.isArray(config.passos) ? passosSchema.safeParse(config.passos) : null;
    if (passos) {
      if (!passos.success) return { type: "send_whatsapp_message", status: "failed", error: "passos_invalidos" };
      const resultado = await enviarPassos(passos.data, {
        enviador: enviadorPeloHandler(ctx.admin, {
          organizationId: ctx.organizationId,
          conversationId,
          contexto: {
            organization_id: ctx.organizationId,
            serviceBoundary: boundary,
            proactiveContext: { organizationId: ctx.organizationId, contactId: contact.id },
            actor: { type: "webhook_source", id: ctx.ruleId },
            requestId: `rule:${ctx.ruleId}`,
          },
          espacar: () => espacarEnvio(sessionId),
        }),
        ativosDoCanal: await lerAtivosDoCanal(ctx.admin, ctx.organizationId, sessionId),
        renderizar: (t) => renderTemplate(t, ctx.context, undefined, fontes),
        chaveBase: `rule:${ctx.ruleId}:${ctx.event.id}:${ctx.actionIndex ?? 0}`,
      });
      return resultado.ok
        ? { type: "send_whatsapp_message", status: "success", detail: { passos: resultado.enviados } }
        : { type: "send_whatsapp_message", status: "failed", error: resultado.erro, detail: { enviados: resultado.enviados } };
    }
```

(O `template` passa a ser opcional: onde o `execute` hoje exige `template`, exija `template || passos`. `fontesDaAutomacao(ctx, [template])` recebe os textos dos passos quando houver passos: `passos.data.flatMap((p) => p.tipo === "texto" ? [p.texto] : p.legenda ? [p.legenda] : [])`.) Em `engine.ts`, `regraUsaVariavelDoCanal` já serializa `actions` inteiras — `{{canal.` dentro de `passos` já é detectado; acrescente um caso ao teste `lib/automation/canal-no-contexto.test.ts` provando isso.

- [ ] **Passo 4: Rodar** — `corepack pnpm vitest run lib/automation lib/schemas app/app/webhooks tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/paridade-datacrazy-contrato.test.ts` → PASS.

- [ ] **Passo 5: Commit** — `git commit -m "feat: regra automática envia sequência de texto e mídia"`

---

### Tarefa 5: Passos no fluxo (`mode: "steps"`) — nos DOIS caminhos de envio

**Arquivos:**
- Modificar: `lib/followup/graph-schema.ts` (`actionConfigSchema`), `lib/followup/engine.ts` (`turnPayloadExtras` + `FollowupJobRequest.payload.fixed_steps` + leitura de contexto também para `steps`), `lib/agent-engine/agent/followup-turn.ts` (schema do payload ~linha 102, `runFlowDrivenTurn`), `lib/followup/enviar-texto-fixo.ts` (inline), `lib/followup/validate-publish.ts` (`ativo_inexistente`), `lib/followup/eventos-legiveis.ts`, `lib/followup/graph-mappers.ts` (se o mapeamento por modo existir), `app/app/ai/followups/[id]/_components/nodes/nodeVisuals.ts` (resumo), form do nó `action` (`grep -rln "mode === \"text\"" app/app/ai/followups`) — só exibe aviso, sem editor
- Teste: `lib/followup/graph-schema.test.ts`, `lib/followup/passos-no-fluxo.test.ts`, teste do worker (`grep -rln "resolveFlowSendBody\|fixed_body" lib/agent-engine --include=*.test.ts` e acrescente o caso no arquivo que já testa `fixed_body`)

**Interfaces:**
- Consome: `passosSchema`, `enviarPassos` (T3), `enviadorPeloHandler` (T4), `lerAtivosDoCanal` (T1), `anexarCanalAoContexto` (já existe).
- Produz: nó `action` com `{ mode: "steps"; passos: PassoDeEnvio[] }`; payload do job `fixed_steps: PassoDeEnvio[]` com **os textos já renderizados** no enfileiramento (mesma regra do `fixed_body`: render no enfileiramento, uma passada só).

**Como funciona hoje (leia antes):** `turnPayloadExtras` (`lib/followup/engine.ts`, ~linha 338) põe `fixed_body` renderizado no payload do job `followup_turn`; o contexto de render vem de `db.loadRenderContext` só quando `node.config.mode === "text"` (~linha 950). O job é consumido por QUEM pegar primeiro: o inline `enviarTextoFixoPendente` (seleciona `kind = followup_turn` com `fixed_body`; chamado por `lib/relogio/executar.ts`) ou o worker (`followup-turn.ts`, `runFlowDrivenTurn` → `resolveFlowSendBody` → `sendFixedOutbound`). Os dois precisam saber mandar `fixed_steps`.

- [ ] **Passo 1: Testes que falham**
  - `graph-schema.test.ts`: `actionConfigSchema.safeParse({ mode: "steps", passos: [{ tipo: "midia", asset: "var:bv1" }, { tipo: "texto", texto: "oi" }] })` passa; `passos: []` falha.
  - `lib/followup/passos-no-fluxo.test.ts`: (a) `turnPayloadExtras` (exporte-a para teste, ou teste via `applyResult` como os testes vizinhos de `fixed_body` fazem: `grep -rln "fixed_body" lib/followup --include=*.test.ts`) com nó `steps` e contexto `{ canal: { pix_chave: "519" } }` gera `fixed_steps` com o texto `"PIX 519"` e a mídia `var:bv1` intacta; (b) o inline (`enviarTextoFixoPendente`) com job de `fixed_steps` envia os passos na ordem pelo `sendMessageHandler` (mock) e completa o turno; job sem `fixed_body` **e** sem `fixed_steps` continua ignorado como hoje.
  - Teste do worker: job com `fixed_steps` envia cada passo pelo `sendTurnMessage`/`sendFixedOutbound` (texto) e pelo envio de mídia do worker (`media: { storagePath, mime }`), na ordem, e completa com `kind: "sent"`.
  - `validate-publish.test.ts`: passo com `asset` uuid que não existe na organização → `ativo_inexistente`; `var:<chave>` sem nenhuma linha dessa chave (nem padrão nem número) → `ativo_inexistente` (a validação recebe a lista de ativos e chaves da organização, carregada pela rota de publicação / `publicarFluxo`, do mesmo jeito que `carregaEtapasCitadas` carrega as etapas).

- [ ] **Passo 2: Schema** — em `actionConfigSchema` acrescente:

```ts
  z.strictObject({
    mode: z.literal('steps'),
    /** Sequência curta de texto e mídia (e botões/lista); textos com `{{canal.*}}` saem pelo número da conversa. */
    passos: passosSchema,
  }),
```

(importe `passosSchema` de `@/lib/automation/envio-de-passos`; confira que `lib/followup/graph-schema.ts` pode importar de `lib/automation` sem ciclo: `grep -n "from \"@/lib/followup" lib/automation/envio-de-passos.ts` deve ser vazio.)

- [ ] **Passo 3: Enfileiramento** — em `engine.ts`: a leitura de contexto (`loadRenderContext`) passa a valer para `mode === "text" || mode === "steps"`; `turnPayloadExtras` ganha:

```ts
  if (node.type === "action" && node.config.mode === "steps") {
    return {
      fixed_steps: node.config.passos.map((p) =>
        p.tipo === "texto"
          ? { ...p, texto: interpolarVolta(p.texto, events, contexto) }
          : p.tipo === "midia" && p.legenda
            ? { ...p, legenda: interpolarVolta(p.legenda, events, contexto) }
            : p,
      ),
    };
  }
```

e `FollowupJobRequest.payload` ganha `fixed_steps?: PassoDeEnvio[]`. No schema do payload do worker (`followup-turn.ts` ~linha 102) acrescente `fixed_steps: passosSchema.optional()`.

- [ ] **Passo 4: Inline (`enviar-texto-fixo.ts`)** — a seleção de jobs aceita payload com `fixed_body` **ou** `fixed_steps` (o `continue` da linha `if (typeof body !== "string" || !body || …)` passa a checar `const passos = passosSchema.safeParse(payload.fixed_steps)` também). No lugar do `sendWithLedger(...)` de texto único, quando houver passos:

```ts
      const resultado = await enviarPassos(passos.data, {
        enviador: enviadorPeloHandler(admin, {
          organizationId: job.organization_id as string,
          conversationId,
          contexto: {
            organization_id: job.organization_id,
            actor: { type: "webhook_source", id: enrollmentId },
            serviceBoundary: boundary,
            proactiveContext,
            requestId: `${job.id}`,
          },
          espacar: async () => {},
        }),
        ativosDoCanal: await lerAtivosDoCanal(admin, job.organization_id as string, await canalDaConversaOuDoContato(admin, job.organization_id as string, { conversationId })),
        renderizar: (t) => t, // já renderizado no enfileiramento
        chaveBase: `${job.id}`,
      });
      if (!resultado.ok) throw new Error(resultado.erro);
```

Mantenha **todas** as guardas que já vêm antes (elegibilidade, janela/horário, agenda). O texto único continua pelo caminho de sempre.

- [ ] **Passo 5: Worker (`followup-turn.ts`)** — em `runFlowDrivenTurn`, antes de `resolveFlowSendBody`, quando `input.fixedSteps` existir: para cada passo pronto (resolva `var:` com `lerAtivosDoCanal(createAdminClient(), tenantId, target.channelSessionId)` e copie mídia com `copiarAtivoParaConversa(createAdminClient(), { organizationId: tenantId, assetId, conversationId: target.conversationId })`), envie texto pelo `sendFixedOutbound` que já existe (uma chamada por passo, `seq` = índice + 1) e mídia pelo `sendTurnMessage` com `media: { storagePath, mime }` (leia `lib/agent-engine/edge/crm/send-message.ts`: `corpoDoEnvio` hoje fixa `type: 'image'` para mídia — troque para `type: tipoDaMidia(input.media.mime)` mapeado ao vocabulário do schema, com teste). Use o `EnviadorDePassos` + `enviarPassos` (T3) para não duplicar a ordem/interrupção: escreva `enviadorDoWorker(...)` no próprio `followup-turn.ts` ou num arquivo `lib/agent-engine/agent/passos-do-worker.ts`. Fim: o mesmo `completeTurn` com `kind: "sent"`; falha → o mesmo tratamento de falha do texto único.

- [ ] **Passo 6: Publicação, legibilidade e editor**
  - `validate-publish.ts`: novo código `ativo_inexistente` no vocabulário (array de códigos no topo do arquivo) e checagem para nós `action` `steps`; os dados (ids de ativos da organização e chaves de ativo existentes) entram pelo mesmo objeto de contexto que já leva `etapas`, carregados em `publicarFluxo` (`lib/followup/escrita-de-fluxo.ts`) com `organization_id` explícito.
  - `eventos-legiveis.ts`: `steps` → `"envia uma sequência de N mensagens (áudio, texto…)"`.
  - `nodeVisuals.ts` (`describeNodeConfig`): `steps` → `t("Sequência")` + `: N`. O form do nó `action` com `mode === "steps"` mostra só `t("Sequência configurada pelo MCP. Edite pelo assistente.")` e não oferece trocar de modo sem confirmação (troca apagaria os passos).
  - Dicionário: as frases novas com `es`.

- [ ] **Passo 7: Rodar** — `corepack pnpm vitest run lib/followup lib/agent-engine lib/automation app/app/ai/followups tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/mcp-fluxos-escrita.test.ts` → PASS; typecheck em segundo plano.

- [ ] **Passo 8: Commit + PR das Tarefas 3–5** — `git commit -m "feat: sequência de texto e mídia nos fluxos (envio inline e worker)"`; PR e merge.

---

### Tarefa 6: Envio de botões e lista na API oficial (`interactive`)

**Arquivos:**
- Criar: `lib/channels/interativo.ts`, `lib/channels/interativo.test.ts`, `lib/channels/adapters/meta-cloud-interativo.test.ts`
- Modificar: `lib/channels/types.ts` (`ChannelCapabilities.interativo: boolean`; `OutboundEnvelope.interativo?: Interativo`), `lib/channels/capabilities.ts` (os 6 provedores: `interativo: true` só em `meta_cloud`), `lib/channels/adapters/meta-cloud.ts` (`send`, ~linha 338), `app/api/v1/messages/_handler.ts` (ramo de texto, ~linha 1178)

**Interfaces:**
- Produz: `interativoSchema`, `type Interativo = { tipo: "botoes"; corpo: string; botoes: Array<{ id: string; titulo: string }> } | { tipo: "lista"; corpo: string; botaoDaLista: string; linhas: Array<{ id: string; titulo: string; descricao?: string }> }`; `montarInterativo(i: Interativo): Record<string, unknown>`; `textoNumeradoDeReserva(i: Interativo): string`; `interativoDaMensagem(metadata: unknown): Interativo | null` (lê e valida `metadata.interativo`).

**Contrato:** a mensagem é gravada como `type: "text"`, `body = textoNumeradoDeReserva(...)` (é o que a equipe vê no inbox e o que sai em canal sem interativo) e `metadata.interativo` (o que o `meta_cloud` envia). Limites da Cloud API: botões 1–3, título ≤ 20; lista 1–10 linhas, título ≤ 24, descrição ≤ 72, botão da lista ≤ 20; corpo ≤ 1024 (confira na doc oficial via Context7/Meta antes de fixar; se mudou, ajuste schema e teste juntos).

- [ ] **Passo 1: Teste que falha (`lib/channels/interativo.test.ts`)**

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";

import { interativoDaMensagem, interativoSchema, montarInterativo, textoNumeradoDeReserva } from "@/lib/channels/interativo";

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
        sections: [
          { title: "Opções", rows: [{ id: "tv_android", title: "TV Android - Play Store" }, { id: "tv_samsung", title: "TV Samsung" }] },
        ],
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

describe("textoNumeradoDeReserva", () => {
  it("numera de 1 a N", () => {
    expect(textoNumeradoDeReserva(lista)).toBe("Aonde você quer fazer o teste?\n\n1 - TV Android - Play Store\n2 - TV Samsung");
  });
});

describe("interativoDaMensagem", () => {
  it("lê e valida metadata.interativo; o resto é null", () => {
    expect(interativoDaMensagem({ interativo: lista })).toEqual(lista);
    expect(interativoDaMensagem({ interativo: { tipo: "lista" } })).toBeNull();
    expect(interativoDaMensagem(null)).toBeNull();
  });
});
```

- [ ] **Passo 2: Implementar `lib/channels/interativo.ts`**

```ts
/**
 * Botões e lista do WhatsApp. A mensagem é gravada como TEXTO numerado (o que a equipe vê e o que sai em
 * canal sem interativo) com `metadata.interativo`; só o adaptador da API oficial monta o `interactive`.
 * O toque volta como texto com o rótulo (`textoDoClique`, `lib/channels/meta/webhook.ts`).
 */
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

export function interativoDaMensagem(metadata: unknown): Interativo | null {
  if (!metadata || typeof metadata !== "object") return null;
  const r = interativoSchema.safeParse((metadata as { interativo?: unknown }).interativo);
  return r.success ? r.data : null;
}
```

- [ ] **Passo 3: Capacidade, envelope, adaptador e handler**
  - `types.ts`: `ChannelCapabilities` ganha `interativo: boolean` (com comentário: "botões e lista nativos; sem isto, sai o texto numerado"); `OutboundEnvelope` ganha `interativo?: Interativo`.
  - `capabilities.ts`: `interativo: true` só em `meta_cloud`; `false` nos outros 5.
  - `meta-cloud.ts` (`send`): `const corpo = envelope.interativo ? { type: "interactive", interactive: montarInterativo(envelope.interativo) } : (contactPayload(envelope) ?? mediaPayload(envelope) ?? { type: "text", text: { body: envelope.body ?? "" } });`
  - `_handler.ts`, no `else` final (texto): `const interativo = CHANNEL_CAPABILITIES[<provider da sessão>]?.interativo ? interativoDaMensagem(outboundMetadata) : null;` e passe `...(interativo ? { interativo } : {})` no envelope. Descubra como o handler conhece o provider: `grep -n "provider" app/api/v1/messages/_handler.ts | head` (a junção `channel_sessions:channel_session_id(...)` já traz `provider`).
  - `meta-cloud-interativo.test.ts`: `fetch` simulado (siga o teste existente do adaptador: `grep -rln "meta-cloud" lib/channels --include=*.test.ts`); corpo enviado a `…/messages` tem `type: "interactive"` e o objeto montado; envelope sem `interativo` continua `type: "text"`.
  - Teste do handler (no arquivo que já testa o ramo de texto: `grep -rln "sendMessageHandler" app/api/v1/messages --include=*.test.ts`): com `metadata.interativo` válido e canal `meta_cloud`, o envelope leva `interativo`; com canal `waha`, não leva (sai o texto).

- [ ] **Passo 4: Rodar** — `corepack pnpm vitest run lib/channels app/api/v1/messages` → PASS; typecheck em segundo plano (a nova chave em `ChannelCapabilities` obriga os 6 provedores).

- [ ] **Passo 5: Commit** — `git commit -m "feat: botões e lista no WhatsApp Cloud API (texto numerado nos outros canais)"`

---

### Tarefa 7: Passo interativo nos passos de envio (regra e fluxo)

**Arquivos:**
- Modificar: `lib/automation/envio-de-passos.ts` (passo `interativo` + método no enviador), `lib/automation/passos-pelo-handler.ts`, o enviador do worker (T5), `lib/followup/eventos-legiveis.ts`, `tests/unit/paridade-datacrazy-contrato.test.ts`
- Teste: `lib/automation/envio-de-passos.test.ts` (casos novos), `lib/automation/passos-pelo-handler.test.ts` (caso novo)

**Interfaces:**
- Consome: `interativoSchema`, `textoNumeradoDeReserva` (T6).
- Produz: `passoInterativoSchema = z.strictObject({ tipo: z.literal("interativo"), interativo: interativoSchema })` na união de `passosSchema`; `EnviadorDePassos.interativo(i: Interativo, chave: string): Promise<void>`.

- [ ] **Passo 1: Testes que falham** — em `envio-de-passos.test.ts`: `passosSchema` aceita `{ tipo: "interativo", interativo: <lista válida> }` e recusa lista com 11 linhas; `enviarPassos` chama `enviador.interativo(i, "job-1:<n>")` na posição certa, com `corpo` e títulos renderizados (`{{canal.*}}` no corpo vira o valor). Em `passos-pelo-handler.test.ts`: `interativo(lista, "k:2")` chama o handler com `{ type: "text", body: textoNumeradoDeReserva(lista), metadata: { idempotency_key: "k:2", interativo: lista } }`.

- [ ] **Passo 2: Implementar** — acrescente `passoInterativoSchema` à união; `PassoPronto` ganha `{ tipo: "interativo"; interativo: Interativo }` (com `corpo` renderizado em `preparar`); `enviarPassos` despacha para `deps.enviador.interativo`. Em `enviadorPeloHandler`: `interativo: (i, chave) => enviar({ conversation_id, type: "text", body: textoNumeradoDeReserva(i), metadata: { idempotency_key: chave, interativo: i } })`. No enviador do worker: o mesmo corpo pelo `sendTurnMessage` (acrescente `metadata` extra ao `corpoDoEnvio` com teste; hoje ele só põe `idempotency_key`). A decisão nativo-vs-texto fica no `_handler` (T6), pela capacidade do canal — o enviador não decide nada.

- [ ] **Passo 3: Contrato** — em `tests/unit/paridade-datacrazy-contrato.test.ts`, caso novo: `flowGraphSchema` aceita um grafo com nó `action` `steps` (áudio `var:bv1`, lista de 9 aparelhos, áudio `var:bv2`) seguido de `match_reply` com o ramo `else` (qualquer resposta) e saída `no_reply`. **Não** suba o teto de 8 ramos do `match_reply`: a lista do Datacrazy (9 opções) não ramifica por aparelho; quem precisa ramificar por opção usa até 8 ramos `eq <título>`.

- [ ] **Passo 4: Rodar** — `corepack pnpm vitest run lib/automation lib/followup lib/agent-engine tests/unit/paridade-datacrazy-contrato.test.ts` → PASS.

- [ ] **Passo 5: Commit + PR das Tarefas 6–7** — `git commit -m "feat: passo de botões e lista nas regras e fluxos"`; PR e merge.

---

### Tarefa 8: Resposta rápida com anexo (fixo ou por número)

**Arquivos:**
- Criar: `supabase/migrations/20261202150000_9705_anexo_da_resposta_rapida.sql`, `app/api/v1/respostas-rapidas/[id]/anexo/route.ts`, `tests/unit/resposta-rapida-anexo-rota.test.ts`, `tests/invariants/respostas-rapidas-anexos-rls.test.ts`
- Modificar: `supabase/baseline.sql`, `lib/database.types.ts`, `lib/escale/conversas/respostas.ts` (`RespostaLida.anexo`), `lib/escale/conversas/respostas-banco.ts` (`lerRespostas` traz o anexo; `gravarExtras` grava/apaga), `lib/escale/conversas/respostas-escrita.ts`, `lib/mcp/tools/respostas-escrita.ts` (`anexo?: { asset: string }`), `lib/auth/public-paths.ts` **não** (rota de sessão)
- Tela (passo 6, só com print da Clint): `components/escale/conversas/centro/compositor/PainelRespostasRapidas.tsx`, `components/escale/conversas/centro/compositor/CompositorDaCasca.tsx`

**Interfaces:**
- Consome: `REFERENCIA_DE_ATIVO`, `resolverReferenciaDeAtivo` (T3); `lerAtivosDoCanal` (T1); `copiarAtivoParaConversa` (T2).
- Produz: `RespostaLida.anexo: { asset: string } | null`; `POST /api/v1/respostas-rapidas/[id]/anexo` com corpo `{ conversation_id }` → `{ media_storage_path, media_mime, type }`.

- [ ] **Passo 1: Migration 9705**

```sql
-- manifest: anexo (áudio, imagem, arquivo) em respostas rápidas, fixo (asset_id) ou por variável do número (var:<chave>)
create table if not exists public.crm_respostas_rapidas_anexos (
  template_id uuid primary key references public.message_templates(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset text not null,
  created_at timestamptz not null default now(),
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

Antes de colar, compare com as policies das tabelas irmãs (`grep -n "tenant_isolation_crm_respostas_rapidas_extras" supabase/baseline.sql`) e use a MESMA régua de escrita delas se for diferente desta. Apêndice no baseline depois do bloco 9704; tabela em `database.types.ts`.

- [ ] **Passo 2: Testes que falham**
  - `lerRespostas` devolve `anexo: { asset: "var:bv1" }` para a resposta que tem linha, `null` para as demais, com **uma** consulta a mais por lote (o teste conta as chamadas a `from("crm_respostas_rapidas_anexos")`).
  - `criarResposta`/`atualizarResposta` com `dados.anexo` gravam (upsert por `template_id`, com `organization_id`); `anexo: null` na atualização apaga a linha.
  - Rota (`tests/unit/resposta-rapida-anexo-rota.test.ts`, modelo: `tests/unit/escale-respostas-rapidas-rotas.test.ts` com `bancoPorTabela`): agent da organização + resposta com `var:bv1` + conversa do número com `bv1` → copia e devolve `{ media_storage_path, media_mime, type }`; resposta sem anexo → 404; conversa de outra organização → 404; **o corpo com `asset` é ignorado** (só vale o gravado).
- [ ] **Passo 3: Implementar** — `respostaSchema` ganha `anexo: z.object({ asset: z.string().regex(REFERENCIA_DE_ATIVO) }).nullable().optional()`; `gravarExtras` grava/apaga o anexo; `lerRespostas` faz o `select` do anexo junto com extras e setores (mesmo `Promise.all`). A rota: `requireSupportWrite` → `requireRole("agent")` → lê a resposta **pela sessão** (`createClient()`, RLS) filtrando `organization_id` → lê a conversa (`id`, `channel_session_id`) filtrando `organization_id` → resolve `var:` com `lerAtivosDoCanal(createAdminClient(), org, canal)` → `copiarAtivoParaConversa(createAdminClient(), …)` → `ok({ media_storage_path, media_mime, type })`. Erros com `fail()` e frases com `t()` (+ `es`). Tool MCP: `crm_create_quick_reply`/`crm_update_quick_reply` aceitam `anexo?: { asset }` (uuid tem de existir em `org_media_assets` da organização; `var:` só formato) e `null` para tirar.
- [ ] **Passo 4: Teste de RLS (db, roda na Tarefa 9)** — `tests/invariants/respostas-rapidas-anexos-rls.test.ts` no padrão de `channel-business-hours-rls.test.ts`: isolamento por organização; anexo apontando para `message_templates` de outra organização é recusado.
- [ ] **Passo 5: Rodar** — `corepack pnpm vitest run lib/escale/conversas tests/unit/resposta-rapida-anexo-rota.test.ts tests/unit/escale-respostas-rapidas-rotas.test.ts tests/unit/mcp-respostas-escrita.test.ts` → PASS. Commit: `git commit -m "feat: resposta rápida com anexo fixo ou por número (dados, rota e MCP)"`.
- [ ] **Passo 6: Tela (CONDICIONAL)** — o compositor mostra o anexo da resposta escolhida e, no envio, chama a rota e manda a mídia. **Antes de escrever qualquer linha:** procure a referência da Clint (`C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\` — módulo de conversas/respostas rápidas; abra os PNG). Se não houver imagem da Clint com resposta rápida + anexo, **pare e peça o print ao usuário**; não invente o visual. Com a referência: `PainelRespostasRapidas` passa `(texto, anexo)` a `aoEscolher`; `CompositorDaCasca` guarda o anexo, mostra igual à Clint, e no envio manda o texto (se houver) e depois `POST …/anexo` + o envio de mídia que `enviarArquivo` já usa. Teste com `@testing-library/react` no modelo do teste existente do painel (`grep -rln "PainelRespostasRapidas" tests components`). Conferência visual lado a lado com a imagem da Clint na Tarefa 9.
- [ ] **Passo 7: Commit + PR da Tarefa 8** — PR e merge.

---

### Tarefa 9: Bateria única, revisão e publicação da frente

> Só aqui roda o pesado (decisão de 18/10/2026). Tudo em segundo plano. Cobre também o que ficou pendente das fases já mergeadas (T1–T12 do plano antigo): `channel-variables-rls`, `channel-business-hours-rls`.

- [ ] **Passo 1: Base atualizada** — worktree nova a partir de `escale-crm/main` (`git fetch escale-crm`); `corepack pnpm install --frozen-lockfile`; `corepack pnpm checar:colisao-de-migration` (renumere 9704/9705 se outra migration entrou, trocando nome do arquivo **e** rótulo do apêndice).
- [ ] **Passo 2: Suíte unitária inteira** — `NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm gov:verify > ../gov.log 2>&1; echo "exit=$?" >> ../gov.log` (em segundo plano). Leia o **exit code**, o rodapé (`Test Files`/`Tests`/`Errors`) e `grep -aE "^ *FAIL " ../gov.log | sed 's/ > .*//' | sort | uniq -c`. Compare com a `main` antes das mudanças (rode o mesmo comando numa worktree limpa da `main` se houver falha, para separar falha nova de falha antiga). O vermelho de `lib/ai/dispatcher/rate-limit.test.ts` com Redis local desligado não é seu (ver `CLAUDE.md` do repo).
- [ ] **Passo 3: Banco** — Docker aberto; `corepack pnpm test:db > ../db.log 2>&1` e depois `corepack pnpm test:db:update > ../dbu.log 2>&1` (segundo plano). Verdes, incluindo `channel-variables-rls`, `channel-business-hours-rls`, `org-media-assets-rls`, `respostas-rapidas-anexos-rls` e a varredura de completude de RLS.
- [ ] **Passo 4: Revisão** — UM revisor (`code-reviewer`), modelo **Opus**, sobre o diff da frente inteira (`git diff <commit da main antes do PR #139>..escale-crm/main` — ache o commit com `git log --oneline escale-crm/main | grep -B1 "paridade-1"`). Foco: RLS e filtro de organização com service role, SSRF/limites no upload, cópia de mídia entre conversas, publicação de fluxo com `aprovado_por`, anti-laço do `message.sent`, envio ao cliente (idempotência por passo, guardas, janela/horário). Corrigir todo Critical/Important (TDD, commit próprio, PR, merge) antes de publicar.
- [ ] **Passo 5: Prova pela tela** — `next build` + `next start` num banco fresco do `baseline.sql` (receita do `CLAUDE.md` do repo). Pelo navegador: criar regra com gatilho "Quando a equipe enviar uma mensagem com uma palavra-chave"; ação "Remover tag"; ação "Atribuir a um atendente → Responsável do canal"; abrir um fluxo com nó de sequência (vê o resumo e o aviso, não quebra); espera de 0,5 min no nó `wait`; resposta rápida com `{{canal.pix_chave}}` no painel; o anexo (se a Tarefa 8 passo 6 foi feita). Evidência (screenshot) em `evidence/paridade-datacrazy/`. Conferência visual das telas tocadas com a Clint, listando cada diferença.
- [ ] **Passo 6: Publicar** — seguir o `CLAUDE.md` da pasta `Deskcom CRM` e `docs/runbooks/deploy.md`: próxima tag da série (`git tag --sort=-creatordate | head -3` no repo; a última conhecida é `v1.81.0-escale.41`); `git tag <tag> && git push escale-crm <tag>`; `gh release create <tag> --repo rgisjr/escale-crm`; esperar `promover-stable` e `imagens-ok` (`gh run watch`). Na **VPS nova `76.13.228.29`** (pasta e SSH na memória "VPS de produção do CRM"): `df -h` (disco), `bash hostgator-setup-kit/backup.sh`, depois `bash hostgator-setup-kit/update.sh --to <tag>`. Nunca mexer em `postgres_postgres`, rede `todanet`, n8n, evolution, traefik, portainer.
- [ ] **Passo 7: Conferir produção** — 3 containers `healthy`; `/` 200 e `/app` 307 (não 404); `/login` 200; sem erro nos logs de `app`, `worker`, `scheduler`; no banco, **só leitura**: `select to_regclass('public.channel_variables'), to_regclass('public.channel_business_hours'), to_regclass('public.org_media_assets'), to_regclass('public.crm_respostas_rapidas_anexos');` todos não nulos. Falhou: `update.sh --to <tag anterior>`, voltar o git da VPS à tag anterior e avisar.
- [ ] **Passo 8: Mensagem final ao usuário** — versão no ar, o que entrou (lista curta) e o que olhar no app. Atualizar a memória `frente-paridade-datacrazy` (frente publicada) e o `LOG.md` da pasta `Deskcom CRM` se o usuário pedir.

---

## Autorrevisão

**Cobertura (o que faltava do plano antigo, só código):** mídia (T13 → Tarefas 1–2), sequência em regra e fluxo (T14 → Tarefas 3–5, agora nos dois caminhos de envio e sem pausa), anexo em resposta rápida (T15 → Tarefa 8, tela condicionada ao print da Clint), interativo no canal oficial (T16 → Tarefa 6), passo interativo (T17 → Tarefa 7), teste/publicação (T20–T21 → Tarefa 9, sem o ensaio na organização do cliente). T18, T19 e T22 (operação do ONPLAY) saíram deste projeto.

**Correções em relação ao plano antigo:** (1) caminho do worker (`followup-turn.ts`) incluído; (2) `pausa_ms` removido; (3) `channel_variables.asset_id` com FK composta e leitura de texto ignorando linhas de ativo; `crm_set_channel_variables` aceita `ativos`; (4) migrations 9704/9705; (5) telas de configuração novas fora (MCP), tela do anexo só com print; (6) `corpoDoEnvio` do worker deixa de fixar `image` para toda mídia; (7) `interativo` decidido no `_handler` pela capacidade do canal, sem novo `type` de mensagem.

**Consistência de nomes:** `TipoDeMidia`, `tipoDaMidia`, `validarMimeDoAtivo`, `caminhoDoAtivo`, `extensaoDoMime` (T1) → T2; `copiarAtivoParaConversa` (T2) → T4, T5, T8; `lerAtivosDoCanal` (T1) → T4, T5, T8; `passosSchema`, `enviarPassos`, `EnviadorDePassos`, `REFERENCIA_DE_ATIVO`, `resolverReferenciaDeAtivo` (T3) → T4, T5, T7, T8; `enviadorPeloHandler` (T4) → T5, T7; `interativoSchema`, `textoNumeradoDeReserva`, `interativoDaMensagem`, `montarInterativo` (T6) → T7.

**Pontos que dependem de leitura no passo (sinalizados com o comando):** vocabulário de `type` de mídia em `messageTypeSchema`; régua de `isMediaPathOwnedBy`; como o `_handler` lê o provider; onde os testes existentes de `fixed_body` (motor, inline e worker) e do adaptador `meta-cloud` moram; policy das tabelas irmãs de resposta rápida.
