# Automações: gatilho de tag, "Negócio criado" e condição de horário (Plano de implementação)

> **Para quem executa:** use `superpowers:executing-plans`, inline (regra do projeto: nunca trocar para subagent-driven-development). Os passos usam caixinhas (`- [ ]`). Plano escrito com a skill writing-plans em 03/11/2026.

**Objetivo:** fechar três faltas do módulo Automações da casca, igual à Clint: (1) o gatilho de tag passa a escolher **quais** tags disparam; (2) "Negócio criado pelo formulário" vira **"Negócio criado"**, com origem e etapa; (3) as condições ganham **"Horário atual" → Hora e Data**.

**Arquitetura:** nada de migration. (1) e (2) são um recorte do `trigger_config` que o motor confere num arquivo puro novo (`lib/automation/filtro-do-gatilho.ts`), chamado pelo `engine.ts` junto dos recortes que já existem. (3) mantém a condição no MESMO formato de hoje (`{ field, op, value }`): `field` = `agora.hora` ou `agora.data`, `op` = `depois_de` | `antes_de` | `entre`, `value` = um JSON pequeno; quem avalia é um arquivo puro novo (`lib/automation/condicoes-de-horario.ts`) no relógio de parede da organização. A tela ganha o seletor de condição da Clint (busca + categorias) e o editor de Hora/Data.

**Tecnologias:** Next.js 16, TypeScript estrito, Zod 4, React Query, Radix Popover, Vitest 4, `corepack pnpm`.

---

## O que já existe (conferido em 03/11/2026 na `escale-crm/main` = `765276ef1`)

| Peça | Onde | O que importa aqui |
|---|---|---|
| `lead.created` | emitido em `app/api/v1/leads/_handler.ts` (~778, criação manual, API, webhook, clone, retomar), `lib/leads/nascimento-do-lead.ts` (~471, conversa vira negócio) e `lib/escale/conversas/criacao-de-negocio-banco.ts` (~131, criação pelo dispositivo) | **o motor já dispara em toda criação**; o payload traz `pipeline_id` e `stage_id`. Só o rótulo da casca diz "pelo formulário" |
| recorte por fonte | `lib/automation/engine.ts` ~383-391 (`webhook_source_id`) | o filtro novo entra no mesmo `applicable.filter` |
| `lead.tag_added` / `contact.tag_added` | payload `{ added_tags, tags, service_origin }` (`leads/_handler.ts` ~1067, `contacts/_handler.ts` ~753, `actions/add-tag.ts`, `mcp/tools/governance.ts`) | hoje dispara para **qualquer** tag |
| condições | `lib/automation/conditions.ts` (eq/neq/contains, E), `conditionSchema` em `lib/schemas/webhooks.ts` ~249 | formato `{ field, op, value }`, sem horário |
| relógio de parede | `partesNoFuso`, `offsetEmMinutos` em `lib/agenda/fuso.ts`; `fusoUtilizavel`, `FUSO_PADRAO` em `lib/tempo/fusos.ts` | puro, sem dependência de servidor |
| catálogo de gatilhos da casca | `lib/escale/automacoes/fluxo/gatilhos.ts` | título "Negócio criado pelo formulário"; `COM_FORMULARIO` |
| tela do gatilho | `lib/automation/desenho-da-regra.ts` (`TelaDoGatilho`, `telaDoGatilho`, `triggerConfigDaTela`), `components/escale/automacoes/fluxo/painel/FormularioDoGatilho.tsx`, `CorposDoNo.tsx` (`useDetalheDoGatilho`) | compartilhado com o designer antigo (`app/app/webhooks/automacoes/[id]/_components`) |
| painel das condições | `components/escale/automacoes/fluxo/painel/PainelDasCondicoes.tsx` | linhas com seletor de campo; "+" quadrado no canto |
| vocabulário de tags | `GET /api/v1/tags/vocabulario` (gerente, mesma régua de quem monta automação), tipo `LinhaDeVocabulario` em `lib/schemas/tags.ts` (campo `tag`) | contatos, negócios e conversas |
| componentes da casca | `SeletorDaCasca`, `SeletorDeChipsDaCasca` (combobox + `role="option"`), `SeletorMultiploDaCasca` (combobox + caixinhas), `PainelSuspenso`, `CampoDeTexto`/`Campo` (`components/escale/origens/JanelaDaCasca.tsx`) | usar estes; nunca `<select>`, `<input type="date|time">` |
| fuso na tela | `TelaDoFluxo` já recebe `fuso` (da organização) | passar para o painel das condições |

## Referências da Clint (abrir antes de desenhar)

- **Gatilho Negócios:** `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\07-automacoes\imagens\07-022-novo-gatilho-negocios.png` — cartão "Negócio criado" / "Um negócio foi criado em uma determinada origem e etapa". Formulário (textos do código da Clint): "O negócio foi criado na origem", "E na etapa (opcional)".
- **Gatilho Contatos:** `...\07-024-novo-gatilho-contatos.png` — "Tag adicionada ao contato". O formulário da tag **não tem print**; resumo no nó da Clint: "Nenhuma tag selecionada".
- **Condições (prints do usuário em 03/11/2026, valem mais que as fichas):**
  1. seletor aberto: busca "Buscar" (fundo cinza, lupa à direita); coluna esquerda "Recomendados" (cinza), "Campos", "Contato", "Negócio", "Horário atual" (marcado na cor da marca); à direita, com ícone: "Hora" (relógio), "Data" (calendário), "Horário de atendimento" (relógio); linha divisória vertical entre as colunas;
  2. editor **Data**: "< Voltar" na cor da marca, título "📅 Data" em negrito, opções "Depois de" (marcada) / "Antes de" / "Entre" à esquerda com divisória, campo cinza "dd/MM/yyyy HH:mm", "(UTC -3)", rodapé "Cancelar" (contorno) e "Confirmar" (sólido);
  3. editor **Hora** com "Entre": "08:00" "até" "18:00" (campos cinza pequenos), "Dias da semana", seletor "Selecione os dias", "(UTC -3)", Cancelar / Confirmar;
  4. o painel "Condições" com "Corresponde a todas as condições" e o botão tracejado de largura total "+ Adicionar condição";
  5. Configurações › "Horários de atendimento" (tela vazia "Nenhum horário de atendimento ainda" + "Criar horário").
- Textos da Clint para o nó (código, `component.automation.ConditionCurrentTime.*`): "Horário atual", "é depois de", "é antes de", "está entre", "todos os dias", "seg ter qua qui sex sáb dom"; popover: "Depois de", "Antes de", "Entre", "até", "Dias da semana", "Recomendados", "Sem resultados para".

## Decisões deste plano

1. **Sem migration.** `trigger_config` e `conditions` são `jsonb` sem CHECK. Por isso não há `test:db` nem `test:db:update` obrigatórios na bateria.
2. **Regras antigas não mudam.** Tag sem `tags` (ou lista vazia) = qualquer tag, como hoje. "Negócio criado" sem origem = qualquer origem. O corpo gravado de uma regra antiga volta **byte a byte** ao salvar (o teste `tests/unit/escale-fluxo-mesmo-corpo.test.ts` continua verde): a chave nova vazia só é gravada quando já existia (para limpar).
3. **"Fonte do formulário" fica**, abaixo dos dois campos da Clint, porque regras já gravadas usam `webhook_source_id`. É a única diferença do formulário "Negócio criado" em relação à Clint.
4. **Comparação de tag sem caixa** (`Vip` = `vip`), a mesma régua do `contains` em lista (#956).
5. **Hora/Data no relógio da organização** (`organizations.timezone`, padrão `America/Sao_Paulo`). "Depois de" inclui o minuto escolhido; "Antes de" e o fim do "Entre" não incluem. "Entre 22:00 e 06:00" atravessa a meia-noite. Dias vazios = todos os dias. "Dias da semana" aparece nas três opções da Hora (o print só mostra o "Entre"; a Clint tem a frase "todos os dias" no nó, então vale para todas).
6. **"Horário de atendimento" entra como "Em breve"** (opaco, sem clique, mesmo selo do Instagram na 10B). Ele depende da tela Configurações › Horários de atendimento (grade semanal, feriados, vínculo com setores), que é uma frente própria e não tem print do formulário de criação. Não se inventa aqui.
7. **Seletor de condição:** o "+ Adicionar condição" abre o seletor da Clint. "Contato" lista os campos `contact.*` do gatilho; "Negócio", os `lead.*`; "Campos", os `event.*` e "Campo personalizado" (a linha em modo avançado de hoje); "Horário atual", Hora / Data / Horário de atendimento. "Recomendados" é só o rótulo cinza do topo (como no print). As linhas de campo continuam com o visual de hoje (ajuste cirúrgico); só a linha de horário é nova. "Corresponde a" continua fixo em "todas as condições" (o motor só tem E).
8. **Formulário da tag sem print:** rótulo "Tags", seletor com chips (`SeletorDeChipsDaCasca`) e a dica "Sem tag escolhida, a automação inicia com qualquer tag.". Provisório: **peça ao usuário o print do formulário "Tag adicionada ao contato" da Clint** antes da conferência visual (Tarefa 5) e ajuste se divergir.
9. **Designer antigo** (sem a casca): continua funcionando. Uma linha de horário aparece nele como campo avançado (`agora.hora`) e não é editável por lá; aceitável, a casca é o caminho.
10. **Esta entrega é uma frente só**: Tarefas 1–4 executadas e mergeadas sem publicar; Tarefa 5 = bateria única, um revisor, conferência visual e UMA publicação.

## Restrições globais (valem para todas as tarefas)

- **Git:** remoto `escale-crm` (`rgisjr/escale-crm`), base `main`. **Nunca** push em `origin`. Dois PRs: PR A = Tarefas 1–2 (gatilhos), PR B = Tarefas 3–4 (horário). Worktree por PR: `git fetch escale-crm && git worktree add ../wt-auto-<a|b> -b feat/automacoes-<gatilhos|horario> escale-crm/main` (a partir de `C:\Documentos\projetos claude\Deskcom CRM\repo`), depois `corepack pnpm install --frozen-lockfile` dentro dela. O PR B nasce da `main` **depois** do merge do PR A.
- **Ambiente (Git Bash, Windows):** `export PATH="/c/Program Files/nodejs:$PATH"`; sempre `corepack pnpm`; typecheck com `NODE_OPTIONS=--max-old-space-size=10240 corepack pnpm typecheck` em segundo plano. Erro de tipo já existente e aceito: `tests/unit/escale-fila-da-casca.test.tsx(67,…)`. Prefira a ferramenta Write para criar arquivos.
- **Durante as tarefas:** só o teste que a tarefa cria ou toca, mais `corepack pnpm eslint <arquivos alterados>` e o typecheck. Nada de suíte cheia antes da Tarefa 5.
- **i18n:** todo texto de tela passa por `t()` e precisa de entrada em `lib/i18n/dicionario.ts` no formato `  "Texto": { es: "Texto en español" },`. Antes de acrescentar, confira com `grep -n '"<texto>":' lib/i18n/dicionario.ts` (muitas já existem; não duplique). Quem cobra é `tests/unit/i18n-espanhol-cobre-a-tela.test.ts`: rode-o ao fim de cada tarefa de tela. Não use `t(variavel)` nem `` t(`...${x}`) `` (o guarda de chave de runtime reprova); use literal, `t(TABELA[chave])` ou `t(objeto.campo)`.
- **Clint:** layout, textos e componentes iguais aos prints listados acima; cor da marca Escale onde a Clint usa o roxo/azul dela (`casca-marca`). Datas e horas sempre no formato brasileiro (dd/mm/aaaa, 24 h).
- **Comentários:** o repo marca o que é do fork com `// FORK ESCALE · <assunto>:` nos arquivos herdados do original (`engine.ts`, `conditions.ts`, `webhooks.ts`, `desenho-da-regra.ts`). Siga.
- **Commits:** conventional commits em português, terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Corpo do PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

### Tarefa 1: O motor recorta o gatilho por tag e por origem/etapa

**Arquivos:**
- Criar: `lib/automation/filtro-do-gatilho.ts`
- Criar: `lib/automation/filtro-do-gatilho.test.ts`
- Modificar: `lib/schemas/webhooks.ts` (refinamento novo nas duas portas)
- Modificar: `lib/automation/engine.ts:383-398` (uma linha no `applicable.filter`)

**Interfaces:**
- Produz: `GATILHOS_DE_TAG`, `GATILHO_DE_NEGOCIO_CRIADO`, `MAXIMO_DE_TAGS_NO_GATILHO`, `configDasTagsDoGatilhoSchema`, `configDoNegocioCriadoSchema`, `ehGatilhoDeTag(evento: string): boolean`, `tagsDoGatilho(config: unknown): string[]`, `gatilhoCasaComAConfig(evento: string, config: Record<string, unknown> | null | undefined, payload: Record<string, unknown> | null | undefined, lead?: { pipeline_id?: unknown; stage_id?: unknown } | null): boolean`.

- [ ] **Passo 1: Escrever o teste que falha**

`lib/automation/filtro-do-gatilho.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { gatilhoCasaComAConfig, tagsDoGatilho } from "@/lib/automation/filtro-do-gatilho";
import { createAutomationRuleSchema } from "@/lib/schemas/webhooks";

const FUNIL = "11111111-1111-4111-8111-111111111111";
const OUTRO_FUNIL = "22222222-2222-4222-8222-222222222222";
const ETAPA = "33333333-3333-4333-8333-333333333333";
const ACAO = [{ type: "add_tag", config: { tags: ["x"] } }];

describe("gatilho de tag", () => {
  it("sem tags escolhidas dispara com qualquer tag (regras antigas seguem iguais)", () => {
    expect(gatilhoCasaComAConfig("contact.tag_added", {}, { added_tags: ["qualquer"] })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.tag_added", { tags: [] }, { added_tags: ["qualquer"] })).toBe(true);
  });

  it("com tags escolhidas só dispara quando uma delas foi adicionada, sem diferenciar caixa", () => {
    const config = { tags: ["VIP", "cliente"] };
    expect(gatilhoCasaComAConfig("contact.tag_added", config, { added_tags: ["vip"] })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.tag_added", config, { added_tags: ["novo", "Cliente"] })).toBe(true);
    expect(gatilhoCasaComAConfig("contact.tag_added", config, { added_tags: ["novo"] })).toBe(false);
    expect(gatilhoCasaComAConfig("contact.tag_added", config, {})).toBe(false);
  });

  it("configuração torta nunca dispara", () => {
    expect(gatilhoCasaComAConfig("contact.tag_added", { tags: "vip" }, { added_tags: ["vip"] })).toBe(false);
  });

  it("tagsDoGatilho devolve as tags gravadas, ou [] quando não há", () => {
    expect(tagsDoGatilho({ tags: [" vip ", "cliente"] })).toEqual(["vip", "cliente"]);
    expect(tagsDoGatilho({})).toEqual([]);
    expect(tagsDoGatilho(null)).toEqual([]);
    expect(tagsDoGatilho({ tags: [1, 2] })).toEqual([]);
  });
});

describe("gatilho Negócio criado", () => {
  it("sem origem dispara em qualquer criação, com ou sem fonte de formulário gravada", () => {
    expect(gatilhoCasaComAConfig("lead.created", {}, { pipeline_id: FUNIL, stage_id: ETAPA })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.created", { webhook_source_id: null }, { pipeline_id: FUNIL })).toBe(true);
  });

  it("com origem e etapa, só o negócio que nasceu ali", () => {
    const config = { pipeline_id: FUNIL, stage_id: ETAPA };
    expect(gatilhoCasaComAConfig("lead.created", config, { pipeline_id: FUNIL, stage_id: ETAPA })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.created", config, { pipeline_id: OUTRO_FUNIL, stage_id: ETAPA })).toBe(false);
    expect(gatilhoCasaComAConfig("lead.created", { pipeline_id: FUNIL }, { pipeline_id: FUNIL, stage_id: "outra" })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.created", config, { pipeline_id: FUNIL, stage_id: "outra" })).toBe(false);
  });

  it("sem origem no payload usa a do negócio", () => {
    expect(gatilhoCasaComAConfig("lead.created", { pipeline_id: FUNIL }, {}, { pipeline_id: FUNIL })).toBe(true);
    expect(gatilhoCasaComAConfig("lead.created", { pipeline_id: FUNIL }, {}, null)).toBe(false);
  });

  it("outros gatilhos não são recortados aqui", () => {
    expect(gatilhoCasaComAConfig("lead.won", { tags: ["x"] }, {})).toBe(true);
  });
});

describe("a porta da regra", () => {
  const regra = (trigger_event: string, trigger_config: Record<string, unknown>) =>
    createAutomationRuleSchema.safeParse({ name: "r", trigger_event, conditions: [], actions: ACAO, trigger_config });

  it("aceita tags e origem/etapa válidas, e o null que limpa", () => {
    expect(regra("contact.tag_added", { tags: ["vip"] }).success).toBe(true);
    expect(regra("lead.created", { pipeline_id: FUNIL, stage_id: ETAPA, webhook_source_id: null }).success).toBe(true);
    expect(regra("lead.created", { pipeline_id: null, stage_id: null }).success).toBe(true);
  });

  it("recusa etapa sem origem, origem que não é uuid e tags demais", () => {
    expect(regra("lead.created", { stage_id: ETAPA }).success).toBe(false);
    expect(regra("lead.created", { pipeline_id: "vendas" }).success).toBe(false);
    expect(regra("lead.tag_added", { tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }).success).toBe(false);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run lib/automation/filtro-do-gatilho.test.ts`
Expected: FAIL (`Failed to resolve import "@/lib/automation/filtro-do-gatilho"`).

- [ ] **Passo 3: Escrever o filtro**

`lib/automation/filtro-do-gatilho.ts`:

```ts
/**
 * O RECORTE DO GATILHO PELA CONFIGURAÇÃO (fork Escale · automações: tag e "Negócio criado").
 *
 * O motor casa a regra pelo `event_type`; este arquivo diz se a configuração do gatilho aceita
 * AQUELE evento:
 *  - tag adicionada (negócio ou contato): `trigger_config.tags` escolhe as tags. Ausente ou vazia =
 *    qualquer tag, o comportamento das regras gravadas antes desta entrega. Sem diferenciar caixa,
 *    a mesma régua do `contains` em lista (#956).
 *  - negócio criado: `trigger_config.pipeline_id` (a origem) e `stage_id` (a etapa, opcional) dizem
 *    onde o negócio nasceu. Vem do payload do `lead.created` (o lugar do nascimento); sem ele, do
 *    negócio. Ausentes = qualquer origem/etapa.
 *
 * Configuração torta (só por SQL ou import: a porta do schema recusa) nunca dispara.
 */
import { z } from "zod";

import { tagSchema } from "@/lib/schemas/tags";

export const GATILHOS_DE_TAG = ["lead.tag_added", "contact.tag_added"] as const;
export const GATILHO_DE_NEGOCIO_CRIADO = "lead.created";
export const MAXIMO_DE_TAGS_NO_GATILHO = 20;

export const configDasTagsDoGatilhoSchema = z.object({
  tags: z.array(tagSchema).max(MAXIMO_DE_TAGS_NO_GATILHO).optional(),
});

export const configDoNegocioCriadoSchema = z
  .object({
    pipeline_id: z.string().uuid().nullish(),
    stage_id: z.string().uuid().nullish(),
  })
  .refine((c) => !c.stage_id || !!c.pipeline_id, {
    message: "Escolha a origem antes da etapa.",
    path: ["stage_id"],
  });

export function ehGatilhoDeTag(evento: string): boolean {
  return (GATILHOS_DE_TAG as readonly string[]).includes(evento);
}

/** As tags gravadas no gatilho, como a tela mostra. Ausente ou torta = []. */
export function tagsDoGatilho(config: unknown): string[] {
  const lido = configDasTagsDoGatilhoSchema.safeParse(config ?? {});
  return lido.success ? (lido.data.tags ?? []) : [];
}

const normalizar = (tag: unknown): string => String(tag).trim().toLowerCase();

function tagCasa(config: unknown, payload: Record<string, unknown> | null | undefined): boolean {
  const lido = configDasTagsDoGatilhoSchema.safeParse(config ?? {});
  if (!lido.success) return false;
  const escolhidas = (lido.data.tags ?? []).map(normalizar);
  if (escolhidas.length === 0) return true;
  const adicionadas = Array.isArray(payload?.added_tags) ? payload.added_tags.map(normalizar) : [];
  return adicionadas.some((tag) => escolhidas.includes(tag));
}

function negocioCriadoCasa(
  config: unknown,
  payload: Record<string, unknown> | null | undefined,
  lead: { pipeline_id?: unknown; stage_id?: unknown } | null | undefined,
): boolean {
  const lido = configDoNegocioCriadoSchema.safeParse(config ?? {});
  if (!lido.success) return false;
  const { pipeline_id, stage_id } = lido.data;
  const origem = payload?.pipeline_id ?? lead?.pipeline_id;
  const etapa = payload?.stage_id ?? lead?.stage_id;
  if (pipeline_id && origem !== pipeline_id) return false;
  if (stage_id && etapa !== stage_id) return false;
  return true;
}

/** A configuração do gatilho aceita este evento? Gatilhos sem recorte aqui: sempre sim. */
export function gatilhoCasaComAConfig(
  evento: string,
  config: Record<string, unknown> | null | undefined,
  payload: Record<string, unknown> | null | undefined,
  lead?: { pipeline_id?: unknown; stage_id?: unknown } | null,
): boolean {
  if (ehGatilhoDeTag(evento)) return tagCasa(config, payload);
  if (evento === GATILHO_DE_NEGOCIO_CRIADO) return negocioCriadoCasa(config, payload, lead);
  return true;
}
```

(`tagsDoGatilho` devolve o texto como gravado; o teste espera `" vip "` → `"vip"` porque `tagSchema` faz `trim`.)

- [ ] **Passo 4: A porta do schema**

Em `lib/schemas/webhooks.ts`, junto dos imports de `gatilhos-de-tempo`:

```ts
// FORK ESCALE · automações: o recorte do gatilho de tag e do "Negócio criado".
import {
  configDasTagsDoGatilhoSchema,
  configDoNegocioCriadoSchema,
  ehGatilhoDeTag,
  GATILHO_DE_NEGOCIO_CRIADO,
  MAXIMO_DE_TAGS_NO_GATILHO,
} from "@/lib/automation/filtro-do-gatilho";
```

Logo depois de `function exigirIdDaFonteWebhook(...) { ... }`:

```ts
/**
 * FORK ESCALE · automações: as tags do gatilho de tag e a origem/etapa do "Negócio criado". Só confere o
 * que veio; sem `trigger_config` (PATCH parcial) não há o que conferir.
 */
function exigirRecorteDoGatilho(
  regra: { trigger_event?: string; trigger_config?: Record<string, unknown> },
  ctx: z.RefinementCtx,
): void {
  if (!regra.trigger_event || regra.trigger_config === undefined) return;
  if (ehGatilhoDeTag(regra.trigger_event) && !configDasTagsDoGatilhoSchema.safeParse(regra.trigger_config).success) {
    ctx.addIssue({
      code: "custom",
      path: ["trigger_config", "tags"],
      message: `Escolha até ${MAXIMO_DE_TAGS_NO_GATILHO} tags, cada uma com até 60 caracteres.`,
    });
  }
  if (regra.trigger_event === GATILHO_DE_NEGOCIO_CRIADO) {
    const lido = configDoNegocioCriadoSchema.safeParse(regra.trigger_config);
    if (!lido.success) {
      const recusa = lido.error.issues[0];
      ctx.addIssue({
        code: "custom",
        path: ["trigger_config"],
        message: recusa?.code === "custom" ? recusa.message : "Escolha uma origem e uma etapa válidas.",
      });
    }
  }
}
```

Acrescente `.superRefine(exigirRecorteDoGatilho)` no `createAutomationRuleSchema` (logo depois de `.superRefine(exigirIdDaFonteWebhook)`) e no `updateAutomationRuleSchema` (logo depois de `.superRefine(exigirIdDaFonteWebhook)`).

- [ ] **Passo 5: O motor usa o filtro**

Em `lib/automation/engine.ts`, import:

```ts
// FORK ESCALE · automações: o recorte do gatilho de tag e do "Negócio criado".
import { gatilhoCasaComAConfig } from "@/lib/automation/filtro-do-gatilho";
```

E no `applicable = matched.filter((rule) => { ... })`, antes do `return evaluateConditions(...)`:

```ts
    // FORK ESCALE · automações: as tags escolhidas e a origem/etapa onde o negócio nasceu.
    if (
      !gatilhoCasaComAConfig(
        row.event_type,
        rule.trigger_config,
        row.payload,
        context.lead as { pipeline_id?: unknown; stage_id?: unknown } | undefined,
      )
    ) {
      return false;
    }
```

- [ ] **Passo 6: Rodar**

Run: `corepack pnpm vitest run lib/automation/filtro-do-gatilho.test.ts lib/automation lib/schemas tests/unit/escale-fluxo-mesmo-corpo.test.ts`
Expected: PASS. Depois `corepack pnpm eslint lib/automation/filtro-do-gatilho.ts lib/automation/filtro-do-gatilho.test.ts lib/schemas/webhooks.ts lib/automation/engine.ts` sem erro.

- [ ] **Passo 7: Commit**

```bash
git add lib/automation/filtro-do-gatilho.ts lib/automation/filtro-do-gatilho.test.ts lib/schemas/webhooks.ts lib/automation/engine.ts
git commit -m "feat: gatilho de tag escolhe as tags e Negócio criado recorta origem e etapa (motor)"
```

---

### Tarefa 2: A tela do gatilho: "Negócio criado" e a escolha das tags

**Arquivos:**
- Modificar: `lib/automation/desenho-da-regra.ts` (`TelaDoGatilho`, `telaDoGatilho`, `triggerConfigDaTela`)
- Modificar: `lib/escale/automacoes/fluxo/gatilhos.ts` (título, descrição, `COM_FORMULARIO`)
- Criar: `hooks/escale/useVocabularioDeTags.ts`
- Modificar: `components/escale/automacoes/fluxo/painel/FormularioDoGatilho.tsx`
- Modificar: `components/escale/automacoes/fluxo/CorposDoNo.tsx` (`useDetalheDoGatilho`)
- Modificar: `lib/i18n/dicionario.ts`
- Teste: `lib/automation/desenho-da-regra.test.ts`, `tests/unit/escale-fluxo-paineis.test.tsx`

**Interfaces:**
- Consome: `ehGatilhoDeTag`, `tagsDoGatilho` (Tarefa 1).
- Produz: `TelaDoGatilho.criado: { pipeline_id: string; stage_id: string }` e `TelaDoGatilho.tags: string[]`; `useVocabularioDeTags(): UseQueryResult<string[]>`.

- [ ] **Passo 1: Testes do desenho que falham**

Acrescente ao fim de `lib/automation/desenho-da-regra.test.ts` (os imports de `telaDoGatilho` e `triggerConfigDaTela` já existem no arquivo; se não, importe de `@/lib/automation/desenho-da-regra`):

```ts
describe("FORK ESCALE · Negócio criado e tag no desenho", () => {
  const FUNIL_A = "11111111-1111-4111-8111-111111111111";
  const ETAPA_A = "33333333-3333-4333-8333-333333333333";

  it("lê a origem, a etapa e as tags gravadas", () => {
    const tela = telaDoGatilho({ pipeline_id: FUNIL_A, stage_id: ETAPA_A, tags: ["vip"] });
    expect(tela.criado).toEqual({ pipeline_id: FUNIL_A, stage_id: ETAPA_A });
    expect(tela.tags).toEqual(["vip"]);
    expect(telaDoGatilho(null).criado).toEqual({ pipeline_id: "", stage_id: "" });
    expect(telaDoGatilho(null).tags).toEqual([]);
  });

  it("Negócio criado grava origem e etapa; vazio não cria chave nova", () => {
    const base = telaDoGatilho(null);
    expect(triggerConfigDaTela("lead.created", { ...base, criado: { pipeline_id: FUNIL_A, stage_id: ETAPA_A } }, null)).toEqual({
      webhook_source_id: null,
      pipeline_id: FUNIL_A,
      stage_id: ETAPA_A,
    });
    expect(triggerConfigDaTela("lead.created", base, null)).toEqual({ webhook_source_id: null });
  });

  it("limpar a origem que estava gravada grava null", () => {
    const gravada = { trigger_event: "lead.created", trigger_config: { pipeline_id: FUNIL_A, stage_id: ETAPA_A } };
    const tela = { ...telaDoGatilho(gravada.trigger_config), criado: { pipeline_id: "", stage_id: "" } };
    expect(triggerConfigDaTela("lead.created", tela, gravada)).toEqual({
      webhook_source_id: null,
      pipeline_id: null,
      stage_id: null,
    });
  });

  it("tag grava as tags escolhidas; lista vazia sem tags gravadas não cria a chave", () => {
    const base = telaDoGatilho(null);
    expect(triggerConfigDaTela("contact.tag_added", { ...base, tags: ["vip"] }, null)).toEqual({ tags: ["vip"] });
    expect(triggerConfigDaTela("lead.tag_added", base, null)).toEqual({});
    const gravada = { trigger_event: "lead.tag_added", trigger_config: { tags: ["vip"] } };
    expect(triggerConfigDaTela("lead.tag_added", base, gravada)).toEqual({ tags: [] });
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run lib/automation/desenho-da-regra.test.ts`
Expected: FAIL (`tela.criado` é `undefined`).

- [ ] **Passo 3: O desenho**

Em `lib/automation/desenho-da-regra.ts`:

1. Import:

```ts
// FORK ESCALE · automações: as tags do gatilho de tag.
import { ehGatilhoDeTag, tagsDoGatilho } from "@/lib/automation/filtro-do-gatilho";
```

2. Em `TelaDoGatilho`, depois de `tempo`:

```ts
  /** FORK ESCALE · automações: onde o negócio nasceu ("Negócio criado"); "" = qualquer origem/etapa. */
  criado: { pipeline_id: string; stage_id: string };
  /** FORK ESCALE · automações: as tags do gatilho de tag; vazio = qualquer tag. */
  tags: string[];
```

3. Em `telaDoGatilho`, troque o cálculo de `fonte` e o `return` por:

```ts
  const bruto =
    config && typeof config === "object" && !Array.isArray(config) ? (config as Record<string, unknown>) : {};
  const fonte = bruto.webhook_source_id;
  return {
    fonte: typeof fonte === "string" ? fonte : null,
    data: data
      ? { pipeline_id: data.pipeline_id, campo: data.campo, dias: String(data.dias) }
      : { pipeline_id: "", campo: "", dias: DIAS_PADRAO },
    tempo: {
      dias: tempo ? String(tempo.dias) : DIAS_PADRAO,
      direcao: silencio ? silencio.direcao : "da_equipe",
      proteger_pela_agenda: tempo ? tempo.proteger_pela_agenda : false,
    },
    criado: {
      pipeline_id: typeof bruto.pipeline_id === "string" ? bruto.pipeline_id : "",
      stage_id: typeof bruto.stage_id === "string" ? bruto.stage_id : "",
    },
    tags: tagsDoGatilho(bruto),
  };
```

4. Em `triggerConfigDaTela`, troque o bloco `if (evento === "lead.created") { ... }` por:

```ts
  if (evento === "lead.created") {
    // FORK ESCALE · automações: origem e etapa do "Negócio criado"; null limpa o que estava gravado.
    return semVaziosNovos(
      configAoSalvarDaTela({
        ...base,
        configDaTela: {
          webhook_source_id: tela.fonte,
          pipeline_id: tela.criado.pipeline_id || null,
          stage_id: tela.criado.stage_id || null,
        },
      }),
      regraGravada,
      evento,
      ["pipeline_id", "stage_id"],
    );
  }
  if (ehGatilhoDeTag(evento)) {
    return semVaziosNovos(configAoSalvarDaTela({ ...base, configDaTela: { tags: tela.tags } }), regraGravada, evento, ["tags"]);
  }
```

5. Logo acima de `triggerConfigDaTela`:

```ts
/**
 * FORK ESCALE · automações: a chave nova só é gravada vazia (null ou []) quando já estava na regra
 * gravada do MESMO gatilho, para limpar. Sem isso, toda regra antiga ganharia `pipeline_id: null` ou
 * `tags: []` no primeiro salvar e deixaria de voltar byte a byte.
 */
function semVaziosNovos(
  config: Record<string, unknown>,
  regraGravada: Pick<RegraGravada, "trigger_event" | "trigger_config"> | null,
  evento: string,
  chaves: readonly string[],
): Record<string, unknown> {
  const antes = regraGravada?.trigger_event === evento ? (regraGravada.trigger_config ?? {}) : {};
  const vazio = (v: unknown) => v === null || (Array.isArray(v) && v.length === 0);
  return Object.fromEntries(
    Object.entries(config).filter(([chave, valor]) => !(chaves.includes(chave) && vazio(valor) && !(chave in antes))),
  );
}
```

- [ ] **Passo 4: Rodar o desenho**

Run: `corepack pnpm vitest run lib/automation/desenho-da-regra.test.ts tests/unit/escale-fluxo-mesmo-corpo.test.ts lib/automation/config-ao-salvar.test.ts`
Expected: PASS. Se algum teste antigo comparar `telaDoGatilho(...)` com `toEqual` de um objeto sem `criado`/`tags`, acrescente `criado: { pipeline_id: "", stage_id: "" }, tags: []` ao esperado (é só o formato novo, não comportamento).

- [ ] **Passo 5: Testes da tela que falham**

Em `tests/unit/escale-fluxo-paineis.test.tsx`:

1. Junto dos outros `vi.mock` do topo:

```ts
vi.mock("@/hooks/escale/useVocabularioDeTags", () => ({ useVocabularioDeTags: () => ({ data: ["vip", "cliente"] }) }));
```

2. Troque o teste `"'Negócio criado pelo formulário' abre 'Fonte do formulário' com 'Qualquer fonte'"` inteiro por:

```ts
  it("'Negócio criado' abre origem, etapa (desligada sem origem) e a fonte do formulário", async () => {
    const aoTrocar = montar(gatilho("contact.tag_added"));
    await userEvent.click(screen.getByRole("button", { name: "Trocar gatilho" }));
    await userEvent.click(screen.getByRole("button", { name: /Negócios/ }));
    expect(screen.getByText("Um negócio foi criado em uma determinada origem e etapa")).toBeTruthy();
    await userEvent.click(screen.getByText("Negócio criado"));
    expect(screen.getByRole("combobox", { name: "O negócio foi criado na origem" }).textContent).toContain("Qualquer origem");
    expect(screen.getByRole("combobox", { name: "E na etapa (opcional)" }).textContent).toContain("Qualquer etapa");
    expect(screen.getByRole("combobox", { name: "Fonte do formulário" }).textContent).toContain("Qualquer fonte");
    await userEvent.click(screen.getByRole("combobox", { name: "O negócio foi criado na origem" }));
    await userEvent.click(screen.getByRole("option", { name: "Vendas" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoTrocar).toHaveBeenCalledWith(
      "lead.created",
      expect.objectContaining({ criado: { pipeline_id: "p1", stage_id: "" } }),
    );
  });

  it("'Tag adicionada ao contato' abre 'Tags' e guarda a escolha", async () => {
    const aoTrocar = montar(gatilho("lead.won"));
    await userEvent.click(screen.getByRole("button", { name: "Trocar gatilho" }));
    await userEvent.click(screen.getByRole("button", { name: /Contatos/ }));
    await userEvent.click(screen.getByText("Tag adicionada ao contato"));
    expect(screen.getByText("Sem tag escolhida, a automação inicia com qualquer tag.")).toBeTruthy();
    await userEvent.click(screen.getByRole("combobox", { name: "Tags" }));
    await userEvent.click(screen.getByRole("option", { name: "cliente" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoTrocar).toHaveBeenCalledWith("contact.tag_added", expect.objectContaining({ tags: ["cliente"] }));
  });
```

(Se `"E na etapa (opcional)"` desligado não expuser `combobox` no `SeletorDaCasca`, troque a conferência por `screen.getByText("Qualquer etapa")`.)

- [ ] **Passo 6: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-fluxo-paineis.test.tsx`
Expected: FAIL ("Unable to find an element with the text: Um negócio foi criado em uma determinada origem e etapa").

- [ ] **Passo 7: O catálogo de gatilhos**

Em `lib/escale/automacoes/fluxo/gatilhos.ts`:

1. A opção de `lead.created` vira (textos da Clint, 07-022):

```ts
      { evento: "lead.created", titulo: "Negócio criado", descricao: "Um negócio foi criado em uma determinada origem e etapa", icone: "maleta" },
```

2. Em `COM_FORMULARIO`, acrescente `"lead.tag_added",` e `"contact.tag_added",` (depois de `"lead.created",`).

- [ ] **Passo 8: O vocabulário de tags**

`hooks/escale/useVocabularioDeTags.ts`:

```ts
"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { LinhaDeVocabulario } from "@/lib/schemas/tags";

/**
 * FORK ESCALE · automações: as tags da organização (contatos, negócios e conversas) para o gatilho de
 * tag. É a rota da tela de Tags, que pede gerente, a mesma régua de quem monta automação. Falhou: a
 * lista fica vazia e o seletor ainda mostra as tags já gravadas na regra.
 */
export function useVocabularioDeTags() {
  return useQuery({
    queryKey: ["vocabulario-de-tags-da-automacao"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      const res = await apiClient.get<{ data: LinhaDeVocabulario[] }>("/api/v1/tags/vocabulario");
      return res.data.map((linha) => linha.tag);
    },
  });
}
```

- [ ] **Passo 9: O formulário do gatilho**

Em `components/escale/automacoes/fluxo/painel/FormularioDoGatilho.tsx`:

1. Imports (acrescentar):

```ts
import { SeletorDeChipsDaCasca } from "@/components/escale/ui/SeletorDeChipsDaCasca";
import { useVocabularioDeTags } from "@/hooks/escale/useVocabularioDeTags";
import { usePipelineStages, usePipelines, useWebhookSources } from "@/hooks/webhooks/useWebhookSources";
import { ehGatilhoDeTag } from "@/lib/automation/filtro-do-gatilho";
```

(o import antigo de `usePipelines, useWebhookSources` some, substituído pela linha acima).

2. Depois de `const fontes = fontesRes?.data ?? [];`:

```ts
  // FORK ESCALE · automações: as etapas da origem do "Negócio criado" e as tags da organização.
  const { data: quadroDoCriado } = usePipelineStages(evento === "lead.created" && tela.criado.pipeline_id ? tela.criado.pipeline_id : null);
  const etapasDoCriado = quadroDoCriado?.data?.stages ?? [];
  const { data: vocabulario = [] } = useVocabularioDeTags();
```

3. Troque o bloco `{evento === "lead.created" ? ( <Campo rotulo={t("Fonte do formulário")}> ... </Campo> ) : null}` por:

```tsx
      {evento === "lead.created" ? (
        <>
          {/* FORK ESCALE · automações: os dois campos do "Negócio criado" da Clint; a fonte do formulário fica embaixo (regras gravadas usam). */}
          <Campo rotulo={t("O negócio foi criado na origem")}>
            <SeletorDaCasca
              aria-label={t("O negócio foi criado na origem")}
              aparencia="janela"
              valor={tela.criado.pipeline_id}
              vazio={t("Qualquer origem")}
              aoMudar={(v) => aoMudarTela({ ...tela, criado: { pipeline_id: v, stage_id: "" } })}
              opcoes={[
                ...(tela.criado.pipeline_id && !funis.some((p) => p.id === tela.criado.pipeline_id)
                  ? [{ valor: tela.criado.pipeline_id, rotulo: t("Origem removida") }]
                  : []),
                ...funis.map((p) => ({ valor: p.id, rotulo: p.name })),
              ]}
            />
          </Campo>
          <Campo rotulo={t("E na etapa (opcional)")}>
            <SeletorDaCasca
              aria-label={t("E na etapa (opcional)")}
              aparencia="janela"
              valor={tela.criado.stage_id}
              vazio={t("Qualquer etapa")}
              desabilitado={!tela.criado.pipeline_id}
              aoMudar={(v) => aoMudarTela({ ...tela, criado: { ...tela.criado, stage_id: v } })}
              opcoes={etapasDoCriado.map((s) => ({ valor: s.id, rotulo: s.name }))}
            />
          </Campo>
          <Campo rotulo={t("Fonte do formulário")}>
            <SeletorDaCasca
              aria-label={t("Fonte do formulário")}
              aparencia="janela"
              valor={tela.fonte ?? ""}
              vazio={t("Qualquer fonte")}
              aoMudar={(v) => aoMudarTela({ ...tela, fonte: v === "" ? null : v })}
              opcoes={[
                ...(tela.fonte && !fontes.some((f) => f.id === tela.fonte)
                  ? [{ valor: tela.fonte, rotulo: t("Fonte removida") }]
                  : []),
                ...fontes.map((f) => ({ valor: f.id, rotulo: f.name })),
              ]}
            />
            <p className="text-[12px] text-casca-suave">
              {t("Escolha uma fonte para limitar esta automação a um formulário. Qualquer fonte mantém o comportamento geral.")}
            </p>
          </Campo>
        </>
      ) : null}

      {ehGatilhoDeTag(evento) ? (
        <Campo rotulo={t("Tags")}>
          {/* FORK ESCALE · automações: sem print do formulário da Clint; provisório (ver o plano, decisão 8). */}
          <SeletorDeChipsDaCasca
            aria-label={t("Tags")}
            valores={tela.tags}
            opcoes={[...new Set([...vocabulario, ...tela.tags])]}
            aoMudar={(tags) => aoMudarTela({ ...tela, tags })}
          />
          <p className="text-[12px] text-casca-suave">{t("Sem tag escolhida, a automação inicia com qualquer tag.")}</p>
        </Campo>
      ) : null}
```

- [ ] **Passo 10: O detalhe do gatilho no nó**

Em `components/escale/automacoes/fluxo/CorposDoNo.tsx`, import `import { ehGatilhoDeTag } from "@/lib/automation/filtro-do-gatilho";` e troque o começo de `useDetalheDoGatilho` (até o fim do `if (evento === "lead.created") { ... }`) por:

```ts
function useDetalheDoGatilho(dados: DadosDoGatilho): string {
  const t = useT();
  const { data: fontes } = useWebhookSources();
  const { data: funis } = usePipelines();
  const { evento, tela } = dados;
  // FORK ESCALE · automações: a etapa do "Negócio criado" (o hook roda sempre; sem origem, não busca).
  const { data: quadroDoCriado } = usePipelineStages(evento === "lead.created" && tela.criado.pipeline_id ? tela.criado.pipeline_id : null);
  if (evento === "lead.created") {
    const funil = funis?.data?.find((p) => p.id === tela.criado.pipeline_id);
    const partes = [tela.criado.pipeline_id ? (funil?.name ?? t("Origem removida")) : t("Qualquer origem")];
    if (tela.criado.stage_id) {
      partes.push(quadroDoCriado?.data?.stages.find((s) => s.id === tela.criado.stage_id)?.name ?? t("Etapa removida"));
    }
    if (tela.fonte) {
      const fonte = fontes?.data?.find((f) => f.id === tela.fonte);
      partes.push(fonte ? fonte.name : t("Fonte removida"));
    }
    return partes.join(" · ");
  }
  if (ehGatilhoDeTag(evento)) return tela.tags.length > 0 ? tela.tags.join(", ") : t("Qualquer tag");
```

(o resto da função — data do funil, silêncio, etapa parada — fica igual).

- [ ] **Passo 11: Dicionário**

Acrescente em `lib/i18n/dicionario.ts` as que ainda não existem (confira cada uma com `grep`):

```ts
  "Um negócio foi criado em uma determinada origem e etapa": { es: "Se creó un negocio en un origen y etapa determinados" },
  "O negócio foi criado na origem": { es: "El negocio se creó en el origen" },
  "E na etapa (opcional)": { es: "Y en la etapa (opcional)" },
  "Qualquer origem": { es: "Cualquier origen" },
  "Origem removida": { es: "Origen eliminado" },
  "Etapa removida": { es: "Etapa eliminada" },
  "Sem tag escolhida, a automação inicia com qualquer tag.": { es: "Sin etiqueta elegida, la automatización inicia con cualquier etiqueta." },
  "Escolha a origem antes da etapa.": { es: "Elija el origen antes de la etapa." },
  "Escolha uma origem e uma etapa válidas.": { es: "Elija un origen y una etapa válidos." },
```

("Negócio criado", "Qualquer etapa", "Qualquer tag", "Tags", "Fonte do formulário" e "Qualquer fonte" já existem.)

- [ ] **Passo 12: Rodar**

Run: `corepack pnpm vitest run tests/unit/escale-fluxo-paineis.test.tsx tests/unit/escale-fluxo-nos.test.tsx lib/automation tests/unit/i18n-espanhol-cobre-a-tela.test.ts`
Expected: PASS. Depois eslint dos arquivos alterados e o typecheck em segundo plano (o tipo novo de `TelaDoGatilho` obriga quem monta o objeto à mão a acrescentar `criado` e `tags`; corrija cada lugar que o typecheck apontar com `criado: { pipeline_id: "", stage_id: "" }, tags: []`).

- [ ] **Passo 13: Commit e PR A**

```bash
git add lib/automation/desenho-da-regra.ts lib/automation/desenho-da-regra.test.ts lib/escale/automacoes/fluxo/gatilhos.ts hooks/escale/useVocabularioDeTags.ts components/escale/automacoes/fluxo/painel/FormularioDoGatilho.tsx components/escale/automacoes/fluxo/CorposDoNo.tsx lib/i18n/dicionario.ts tests/unit/escale-fluxo-paineis.test.tsx
git commit -m "feat: gatilho Negócio criado com origem e etapa, e gatilho de tag com as tags escolhidas (tela)"
git push -u escale-crm feat/automacoes-gatilhos
gh pr create --repo rgisjr/escale-crm --base main --title "feat: automações — gatilho de tag e Negócio criado" --body-file <arquivo com resumo, plano de teste e a linha final do Claude Code>
gh pr merge <n> --repo rgisjr/escale-crm --merge
```

---

### Tarefa 3: O motor avalia "Horário atual" (Hora e Data)

**Arquivos:**
- Criar: `lib/automation/condicoes-de-horario.ts`
- Criar: `lib/automation/condicoes-de-horario.test.ts`
- Modificar: `lib/automation/conditions.ts` (+ testes em `lib/automation/conditions.test.ts`)
- Modificar: `lib/schemas/webhooks.ts` (`conditionSchema`)
- Modificar: `lib/automation/engine.ts` (relógio das condições)
- Modificar: `lib/automation/desenho-da-regra.ts` (`OperadorDaCondicao`, recusa da condição)
- Modificar: `lib/mcp/tools/automacao-escrita.ts` (uma frase na descrição)

**Interfaces:**
- Produz: `CAMPO_HORA = "agora.hora"`, `CAMPO_DATA = "agora.data"`, `type CampoDeHorario`, `OPERADORES_DE_HORARIO`, `type OperadorDeHorario = "depois_de" | "antes_de" | "entre"`, `ehCampoDeHorario(campo: string): campo is CampoDeHorario`, `ehOperadorDeHorario(op: string): op is OperadorDeHorario`, `lerValorDaHora(op: string, valor: string): ValorDaHora | null`, `lerValorDaData(op: string, valor: string): ValorDaData | null`, `valorDeHorarioValido(campo: string, op: string, valor: string): boolean`, `avaliarCondicaoDeHorario(cond: { field: string; op: string; value: string }, agora: Date, fuso: string): boolean`, `rotuloDoFuso(fuso: string, agora?: Date): string`; em `conditions.ts`: `interface RelogioDasCondicoes { agora: Date; fuso: string }`, `usaCondicaoDeHorario(conditions): boolean`, `evaluateConditions(conditions, context, relogio?)`; `MENSAGEM_DO_HORARIO_INVALIDO` em `webhooks.ts`.

- [ ] **Passo 1: Escrever o teste que falha**

`lib/automation/condicoes-de-horario.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  avaliarCondicaoDeHorario,
  lerValorDaData,
  lerValorDaHora,
  rotuloDoFuso,
  valorDeHorarioValido,
} from "@/lib/automation/condicoes-de-horario";
import { conditionSchema } from "@/lib/schemas/webhooks";

const SP = "America/Sao_Paulo";
// 03/11/2026 é terça (dia 2). 13:30 UTC = 10:30 em São Paulo (UTC -3, sem horário de verão).
const TERCA_10H30 = new Date("2026-11-03T13:30:00Z");
const hora = (op: string, v: object) => ({ field: "agora.hora", op, value: JSON.stringify(v) });
const data = (op: string, v: object) => ({ field: "agora.data", op, value: JSON.stringify(v) });

describe("Hora", () => {
  it("depois de inclui o minuto; antes de não inclui", () => {
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "10:30" }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "10:31" }), TERCA_10H30, SP)).toBe(false);
    expect(avaliarCondicaoDeHorario(hora("antes_de", { de: "10:30" }), TERCA_10H30, SP)).toBe(false);
    expect(avaliarCondicaoDeHorario(hora("antes_de", { de: "11:00" }), TERCA_10H30, SP)).toBe(true);
  });

  it("entre, no dia e fora dele, e atravessando a meia-noite", () => {
    expect(avaliarCondicaoDeHorario(hora("entre", { de: "08:00", ate: "18:00" }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("entre", { de: "08:00", ate: "10:30" }), TERCA_10H30, SP)).toBe(false);
    const terca23h = new Date("2026-11-04T02:00:00Z");
    expect(avaliarCondicaoDeHorario(hora("entre", { de: "22:00", ate: "06:00" }), terca23h, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("entre", { de: "22:00", ate: "06:00" }), TERCA_10H30, SP)).toBe(false);
  });

  it("dias da semana: vazio é todo dia; terça só passa com o 2", () => {
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "08:00", dias: [] }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "08:00", dias: [1, 2] }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "08:00", dias: [1, 3] }), TERCA_10H30, SP)).toBe(false);
  });

  it("usa o fuso da organização, não o do servidor", () => {
    // 10:30 em São Paulo = 13:30 em Lisboa (UTC +0 em novembro).
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "13:00" }), TERCA_10H30, "Europe/Lisbon")).toBe(true);
    expect(avaliarCondicaoDeHorario(hora("depois_de", { de: "13:00" }), TERCA_10H30, SP)).toBe(false);
  });

  it("valor torto ou que não fecha com o operador é falso", () => {
    expect(lerValorDaHora("entre", JSON.stringify({ de: "08:00" }))).toBeNull();
    expect(lerValorDaHora("depois_de", JSON.stringify({ de: "08:00", ate: "18:00" }))).toBeNull();
    expect(lerValorDaHora("entre", JSON.stringify({ de: "08:00", ate: "08:00" }))).toBeNull();
    expect(lerValorDaHora("depois_de", JSON.stringify({ de: "8:00" }))).toBeNull();
    expect(lerValorDaHora("depois_de", "não é json")).toBeNull();
    expect(avaliarCondicaoDeHorario({ field: "agora.hora", op: "depois_de", value: "x" }, TERCA_10H30, SP)).toBe(false);
  });
});

describe("Data", () => {
  it("depois de, antes de e entre, na hora de parede da organização", () => {
    expect(avaliarCondicaoDeHorario(data("depois_de", { de: "2026-11-03T10:30" }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(data("antes_de", { de: "2026-11-03T10:30" }), TERCA_10H30, SP)).toBe(false);
    expect(avaliarCondicaoDeHorario(data("antes_de", { de: "2026-12-01T00:00" }), TERCA_10H30, SP)).toBe(true);
    expect(avaliarCondicaoDeHorario(data("entre", { de: "2026-11-01T00:00", ate: "2026-11-03T10:30" }), TERCA_10H30, SP)).toBe(false);
    expect(avaliarCondicaoDeHorario(data("entre", { de: "2026-11-01T00:00", ate: "2026-11-03T10:31" }), TERCA_10H30, SP)).toBe(true);
  });

  it("recusa data inexistente e fim antes do começo", () => {
    expect(lerValorDaData("depois_de", JSON.stringify({ de: "2026-02-31T10:00" }))).toBeNull();
    expect(lerValorDaData("entre", JSON.stringify({ de: "2026-11-03T10:00", ate: "2026-11-03T09:00" }))).toBeNull();
  });
});

describe("rótulo do fuso e validação", () => {
  it("(UTC -3), (UTC +0) e (UTC +5:30)", () => {
    expect(rotuloDoFuso(SP, TERCA_10H30)).toBe("(UTC -3)");
    expect(rotuloDoFuso("Europe/Lisbon", TERCA_10H30)).toBe("(UTC +0)");
    expect(rotuloDoFuso("Asia/Kolkata", TERCA_10H30)).toBe("(UTC +5:30)");
  });

  it("valorDeHorarioValido só aceita campo e operador de horário que combinam", () => {
    expect(valorDeHorarioValido("agora.hora", "entre", JSON.stringify({ de: "08:00", ate: "18:00", dias: [1] }))).toBe(true);
    expect(valorDeHorarioValido("agora.hora", "eq", JSON.stringify({ de: "08:00" }))).toBe(false);
    expect(valorDeHorarioValido("lead.title", "depois_de", JSON.stringify({ de: "08:00" }))).toBe(false);
  });

  it("a porta da condição recusa horário torto e operador trocado", () => {
    expect(conditionSchema.safeParse(hora("entre", { de: "08:00", ate: "18:00" })).success).toBe(true);
    expect(conditionSchema.safeParse(hora("entre", { de: "08:00" })).success).toBe(false);
    expect(conditionSchema.safeParse({ field: "agora.hora", op: "eq", value: "x" }).success).toBe(false);
    expect(conditionSchema.safeParse({ field: "lead.title", op: "depois_de", value: "x" }).success).toBe(false);
    expect(conditionSchema.safeParse({ field: "lead.title", op: "eq", value: "Ana" }).success).toBe(true);
  });
});
```

E acrescente ao fim de `lib/automation/conditions.test.ts`:

```ts
describe("FORK ESCALE · Horário atual em evaluateConditions", () => {
  const relogio = { agora: new Date("2026-11-03T13:30:00Z"), fuso: "America/Sao_Paulo" };
  const entre8e18 = { field: "agora.hora", op: "entre" as const, value: JSON.stringify({ de: "08:00", ate: "18:00" }) };

  it("avalia a hora com o relógio e junta com as outras em E", () => {
    expect(evaluateConditions([entre8e18], {}, relogio)).toBe(true);
    expect(evaluateConditions([entre8e18, { field: "lead.title", op: "eq", value: "Bia" }], ctx, relogio)).toBe(false);
  });

  it("sem relógio a condição de horário é falsa", () => {
    expect(evaluateConditions([entre8e18], {})).toBe(false);
  });

  it("usaCondicaoDeHorario acha a linha de horário", () => {
    expect(usaCondicaoDeHorario([entre8e18])).toBe(true);
    expect(usaCondicaoDeHorario([{ field: "lead.title" }])).toBe(false);
    expect(usaCondicaoDeHorario(null)).toBe(false);
  });
});
```

(no topo desse arquivo, o import passa a ser `import { evaluateConditions, resolveField, usaCondicaoDeHorario } from "@/lib/automation/conditions";`).

- [ ] **Passo 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run lib/automation/condicoes-de-horario.test.ts lib/automation/conditions.test.ts`
Expected: FAIL (`Failed to resolve import "@/lib/automation/condicoes-de-horario"`).

- [ ] **Passo 3: A condição de horário**

`lib/automation/condicoes-de-horario.ts`:

```ts
/**
 * CONDIÇÃO "HORÁRIO ATUAL" (fork Escale · automações; Hora e Data da Clint).
 *
 * A condição mora no MESMO formato das outras (`{ field, op, value }`), para o banco, o desenho e os
 * dois editores seguirem iguais:
 *  - `field`: `agora.hora` ou `agora.data`;
 *  - `op`: `depois_de` | `antes_de` | `entre`;
 *  - `value`: um JSON pequeno. Hora: `{"de":"08:00","ate":"18:00","dias":[1,2,3,4,5]}` (`ate` só no
 *    "entre"; `dias` 0 = domingo … 6 = sábado, a régua de `lib/canais/horario-comercial.ts`; vazio =
 *    todos os dias). Data: `{"de":"2026-11-03T14:00","ate":"2026-11-10T18:00"}`, hora de parede, sem fuso.
 *
 * O relógio é o de parede da organização (o fuso dela; "(UTC -3)" na tela). "Depois de" inclui o
 * minuto escolhido; "antes de" e o fim do "entre" não incluem. Hora "entre 22:00 e 06:00" atravessa a
 * meia-noite. Valor torto é condição falsa, nunca erro.
 */
import { z } from "zod";

import { offsetEmMinutos, partesNoFuso } from "@/lib/agenda/fuso";

export const CAMPO_HORA = "agora.hora";
export const CAMPO_DATA = "agora.data";
export const CAMPOS_DE_HORARIO = [CAMPO_HORA, CAMPO_DATA] as const;
export type CampoDeHorario = (typeof CAMPOS_DE_HORARIO)[number];

export const OPERADORES_DE_HORARIO = ["depois_de", "antes_de", "entre"] as const;
export type OperadorDeHorario = (typeof OPERADORES_DE_HORARIO)[number];

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA_E_HORA = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d$/;

function dataExiste(texto: string): boolean {
  const m = DATA_E_HORA.exec(texto);
  if (!m) return false;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

const dataEHora = z.string().refine(dataExiste);

const valorDaHoraSchema = z.object({
  de: z.string().regex(HORA),
  ate: z.string().regex(HORA).optional(),
  dias: z.array(z.number().int().min(0).max(6)).max(7).default([]),
});
const valorDaDataSchema = z.object({ de: dataEHora, ate: dataEHora.optional() });

export type ValorDaHora = z.infer<typeof valorDaHoraSchema>;
export type ValorDaData = z.infer<typeof valorDaDataSchema>;

export function ehCampoDeHorario(campo: string): campo is CampoDeHorario {
  return (CAMPOS_DE_HORARIO as readonly string[]).includes(campo);
}

export function ehOperadorDeHorario(op: string): op is OperadorDeHorario {
  return (OPERADORES_DE_HORARIO as readonly string[]).includes(op);
}

function lerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/** O valor da Hora, ou `null` quando o texto gravado não fecha com o operador. */
export function lerValorDaHora(op: string, valor: string): ValorDaHora | null {
  const lido = valorDaHoraSchema.safeParse(lerJson(valor));
  if (!lido.success) return null;
  if ((op === "entre") !== (lido.data.ate !== undefined)) return null;
  if (lido.data.ate === lido.data.de) return null;
  return lido.data;
}

/** O valor da Data, ou `null` quando não fecha com o operador ou o fim não vem depois do começo. */
export function lerValorDaData(op: string, valor: string): ValorDaData | null {
  const lido = valorDaDataSchema.safeParse(lerJson(valor));
  if (!lido.success) return null;
  if ((op === "entre") !== (lido.data.ate !== undefined)) return null;
  if (lido.data.ate !== undefined && lido.data.ate <= lido.data.de) return null;
  return lido.data;
}

export function valorDeHorarioValido(campo: string, op: string, valor: string): boolean {
  if (!ehOperadorDeHorario(op)) return false;
  if (campo === CAMPO_HORA) return lerValorDaHora(op, valor) !== null;
  if (campo === CAMPO_DATA) return lerValorDaData(op, valor) !== null;
  return false;
}

const minutosDe = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const dois = (n: number): string => String(n).padStart(2, "0");

/** A condição de horário vale AGORA, no relógio de parede do fuso? */
export function avaliarCondicaoDeHorario(
  cond: { field: string; op: string; value: string },
  agora: Date,
  fuso: string,
): boolean {
  const parede = partesNoFuso(agora, fuso);
  if (cond.field === CAMPO_HORA) {
    const v = lerValorDaHora(cond.op, cond.value);
    if (!v) return false;
    const diaDaSemana = new Date(Date.UTC(parede.ano, parede.mes - 1, parede.dia)).getUTCDay();
    if (v.dias.length > 0 && !v.dias.includes(diaDaSemana)) return false;
    const minuto = parede.hora * 60 + parede.minuto;
    const de = minutosDe(v.de);
    if (cond.op === "depois_de") return minuto >= de;
    if (cond.op === "antes_de") return minuto < de;
    const ate = minutosDe(v.ate ?? v.de);
    return de < ate ? minuto >= de && minuto < ate : minuto >= de || minuto < ate;
  }
  if (cond.field === CAMPO_DATA) {
    const v = lerValorDaData(cond.op, cond.value);
    if (!v) return false;
    const agoraNaParede = `${parede.ano}-${dois(parede.mes)}-${dois(parede.dia)}T${dois(parede.hora)}:${dois(parede.minuto)}`;
    if (cond.op === "depois_de") return agoraNaParede >= v.de;
    if (cond.op === "antes_de") return agoraNaParede < v.de;
    return agoraNaParede >= v.de && agoraNaParede < (v.ate ?? v.de);
  }
  return false;
}

/** "(UTC -3)": o deslocamento do fuso neste instante, como a Clint mostra embaixo do horário. */
export function rotuloDoFuso(fuso: string, agora: Date = new Date()): string {
  const total = offsetEmMinutos(agora, fuso);
  const sinal = total < 0 ? "-" : "+";
  const abs = Math.abs(total);
  const resto = abs % 60;
  return `(UTC ${sinal}${Math.floor(abs / 60)}${resto ? `:${dois(resto)}` : ""})`;
}
```

- [ ] **Passo 4: `conditions.ts`**

Em `lib/automation/conditions.ts`:

```ts
// FORK ESCALE · automações: a condição "Horário atual" (Hora e Data).
import { avaliarCondicaoDeHorario, ehCampoDeHorario, type OperadorDeHorario } from "@/lib/automation/condicoes-de-horario";

export type ConditionOp = "eq" | "neq" | "contains" | OperadorDeHorario;

/** FORK ESCALE · automações: o relógio da condição de horário — o instante e o fuso da organização. */
export interface RelogioDasCondicoes {
  agora: Date;
  fuso: string;
}
```

No começo de `matches` (que ganha o terceiro parâmetro `relogio?: RelogioDasCondicoes`):

```ts
  // FORK ESCALE · automações: sem relógio (quem chamou não o montou), a condição de horário é falsa.
  if (ehCampoDeHorario(cond.field)) return relogio ? avaliarCondicaoDeHorario(cond, relogio.agora, relogio.fuso) : false;
  // Operador de horário num campo comum não tem significado: falso, nunca "diferente".
  if (cond.op !== "eq" && cond.op !== "neq" && cond.op !== "contains") return false;
```

E a função pública:

```ts
export function evaluateConditions(
  conditions: RuleCondition[],
  context: Record<string, unknown>,
  relogio?: RelogioDasCondicoes,
): boolean {
  return conditions.every((c) => matches(c, context, relogio));
}

/** FORK ESCALE · automações: a regra tem condição de horário (só ela paga a leitura do fuso)? */
export function usaCondicaoDeHorario(conditions: readonly { field: string }[] | null | undefined): boolean {
  return (conditions ?? []).some((c) => ehCampoDeHorario(c.field));
}
```

- [ ] **Passo 5: A porta da condição**

Em `lib/schemas/webhooks.ts`, import:

```ts
// FORK ESCALE · automações: a condição "Horário atual".
import {
  ehCampoDeHorario,
  ehOperadorDeHorario,
  OPERADORES_DE_HORARIO,
  valorDeHorarioValido,
} from "@/lib/automation/condicoes-de-horario";
```

E troque `export const conditionSchema = z.object({ ... });` por:

```ts
export const MENSAGEM_DO_HORARIO_INVALIDO = "Revise o horário da condição.";

const OPERADORES_DA_CONDICAO = ["eq", "neq", "contains", ...OPERADORES_DE_HORARIO] as const;

export const conditionSchema = z
  .object({
    field: z.string().min(1).max(200),
    op: z.enum(OPERADORES_DA_CONDICAO),
    value: z.string().max(500),
  })
  // FORK ESCALE · automações: campo de horário só com operador de horário (e vice-versa), e o valor tem que fechar.
  .superRefine((c, ctx) => {
    const campoDeHorario = ehCampoDeHorario(c.field);
    if (campoDeHorario !== ehOperadorDeHorario(c.op)) {
      ctx.addIssue({ code: "custom", path: ["op"], message: MENSAGEM_DO_HORARIO_INVALIDO });
      return;
    }
    if (campoDeHorario && !valorDeHorarioValido(c.field, c.op, c.value)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: MENSAGEM_DO_HORARIO_INVALIDO });
    }
  });
```

- [ ] **Passo 6: O motor monta o relógio**

Em `lib/automation/engine.ts`:

1. O import de `conditions` passa a ser:

```ts
import {
  evaluateConditions,
  usaCondicaoDeHorario,
  type RelogioDasCondicoes,
  type RuleCondition,
} from "@/lib/automation/conditions";
import { fusoUtilizavel } from "@/lib/tempo/fusos";
```

2. Antes de `export async function runAutomationForEvent`:

```ts
/**
 * FORK ESCALE · automações: o relógio da condição "Horário atual" — agora, no fuso da organização.
 * Falha ao ler o fuso cai no padrão do produto, nomeada no log: a regra não pode calar por isso.
 */
async function relogioDasCondicoes(admin: SupabaseClient, organizationId: string): Promise<RelogioDasCondicoes> {
  const { data, error } = await admin.from("organizations").select("timezone").eq("id", organizationId).maybeSingle();
  if (error) {
    logger.warn("[automation.engine] fuso da organização ilegível — condição de horário no fuso padrão", {
      organization_id: organizationId,
      error: error.message,
    });
  }
  return { agora: new Date(), fuso: fusoUtilizavel((data as { timezone?: string | null } | null)?.timezone) };
}
```

3. Logo antes de `const applicable = matched.filter(...)`:

```ts
  // FORK ESCALE · automações: só a regra com condição de horário paga a leitura do fuso.
  const relogio = matched.some((r) => usaCondicaoDeHorario(r.conditions))
    ? await relogioDasCondicoes(admin, row.organization_id)
    : undefined;
```

4. A última linha do filtro vira `return evaluateConditions(rule.conditions ?? [], context, relogio);`.

(O evento adiado pela janela de envio volta inteiro e as condições são conferidas de novo na hora do retorno: uma regra "entre 08:00 e 18:00" que esperou a janela abrir às 19h não envia. É o comportamento certo; registre no PR.)

- [ ] **Passo 7: O desenho aceita o operador novo**

Em `lib/automation/desenho-da-regra.ts`:

1. `export type OperadorDaCondicao = "eq" | "neq" | "contains" | OperadorDeHorario;` com `import type { OperadorDeHorario } from "@/lib/automation/condicoes-de-horario";`.
2. Em `problemaDaRecusa`, no `if (raiz === "conditions") { ... }`, a recusa escrita em português passa adiante:

```ts
  if (raiz === "conditions") {
    // FORK ESCALE · automações: a recusa da condição de horário já vem em português.
    if (recusa.code === "custom") return { caixa: percurso.condicoes?.id ?? gatilho, mensagem: recusa.message };
    return {
      caixa: percurso.condicoes?.id ?? gatilho,
      mensagem: indice === undefined ? PROBLEMAS.condicoesDemais : PROBLEMAS.condicaoGrandeDemais,
    };
  }
```

- [ ] **Passo 8: A ferramenta MCP conta as opções novas**

Em `lib/mcp/tools/automacao-escrita.ts`, no fim da `description` de `crmCreateAutomationRule` (antes do `,`), acrescente:

```ts
      " Gatilho de tag (lead.tag_added/contact.tag_added): trigger_config.tags (vazia = qualquer tag). " +
      "lead.created: trigger_config.pipeline_id e stage_id opcionais (onde o negócio nasceu). Condição de horário: " +
      "field 'agora.hora' ou 'agora.data', op 'depois_de'|'antes_de'|'entre', value JSON {de, ate?, dias?} " +
      "(hora HH:MM e dias 0=domingo…6=sábado; data AAAA-MM-DDTHH:MM) no fuso da organização."
```

- [ ] **Passo 9: Rodar**

Run: `corepack pnpm vitest run lib/automation lib/schemas tests/unit/escale-fluxo-mesmo-corpo.test.ts tests/unit/mcp`
Expected: PASS. Eslint dos arquivos alterados; typecheck em segundo plano. Se o typecheck acusar `OperadorDaCondicao` não cabendo em `Op` (`app/app/webhooks/_components/RuleEditor.tsx`, `app/app/webhooks/automacoes/[id]/_components/*`), o designer antigo só mostra a linha: converta no ponto de leitura com `op as Op` e um comentário `// FORK ESCALE · automações: a linha de horário só é editada pela casca.`.

- [ ] **Passo 10: Commit**

```bash
git add lib/automation/condicoes-de-horario.ts lib/automation/condicoes-de-horario.test.ts lib/automation/conditions.ts lib/automation/conditions.test.ts lib/schemas/webhooks.ts lib/automation/engine.ts lib/automation/desenho-da-regra.ts lib/mcp/tools/automacao-escrita.ts
git commit -m "feat: condição Horário atual (Hora e Data) no motor de automações"
```

---

### Tarefa 4: A tela da condição: seletor da Clint e editor de Hora/Data

**Arquivos:**
- Criar: `lib/escale/automacoes/fluxo/condicoes.ts`
- Criar: `lib/escale/automacoes/fluxo/condicoes.test.ts`
- Criar: `components/escale/automacoes/fluxo/painel/condicoes/EditorDeHorario.tsx`
- Criar: `components/escale/automacoes/fluxo/painel/condicoes/SeletorDeCondicao.tsx`
- Criar: `components/escale/automacoes/fluxo/painel/condicoes/LinhaDeHorario.tsx`
- Modificar: `components/escale/automacoes/fluxo/painel/PainelDasCondicoes.tsx`
- Modificar: `components/escale/automacoes/fluxo/TelaDoFluxo.tsx` (passa `fuso`)
- Modificar: `components/escale/automacoes/fluxo/CorposDoNo.tsx` (`CorpoDasCondicoes`)
- Modificar: `lib/i18n/dicionario.ts`
- Teste: `tests/unit/escale-fluxo-paineis-acoes.test.tsx`, criar `tests/unit/escale-automacoes-horario.test.tsx`

**Interfaces:**
- Consome: `CAMPO_HORA`, `CAMPO_DATA`, `CampoDeHorario`, `OperadorDeHorario`, `ehCampoDeHorario`, `ehOperadorDeHorario`, `lerValorDaHora`, `lerValorDaData`, `rotuloDoFuso` (Tarefa 3); `CuratedField`, `CURATED_FIELDS` de `app/app/webhooks/_components/RuleEditor.tsx`.
- Produz (em `lib/escale/automacoes/fluxo/condicoes.ts`): `type CategoriaDaCondicao = "campos" | "contato" | "negocio" | "horario"`, `type ItemDaCondicao`, `ORDEM_DAS_CATEGORIAS`, `ROTULO_DA_CATEGORIA`, `itensDaCategoria(categoria, campos)`, `rotuloDoItem(item)`, `buscarItens(busca, campos, traduzir)`, `mascaraDeHora(texto)`, `mascaraDeDataEHora(texto)`, `paredeDoTexto(texto)`, `textoDaParede(parede)`, `SIGLA_DO_DIA`, `NOME_DO_DIA`, `DIAS_NA_ORDEM`, `FRASE_DO_OPERADOR`, `type ResumoDoHorario`, `resumoDoHorario(linha)`, `textoDoResumoDoHorario(campo, resumo, t)`, `montarValorDoHorario(campo, op, de, ate, dias)`, `estadoDoEditorDeHorario(campo, inicial?)`; componentes `EditorDeHorario`, `SeletorDeCondicao` (com `type EscolhaDaCondicao`), `LinhaDeHorario`.

- [ ] **Passo 1: Testes puros que falham**

`lib/escale/automacoes/fluxo/condicoes.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { CuratedField } from "@/app/app/webhooks/_components/RuleEditor";
import {
  buscarItens,
  estadoDoEditorDeHorario,
  itensDaCategoria,
  mascaraDeDataEHora,
  mascaraDeHora,
  montarValorDoHorario,
  paredeDoTexto,
  resumoDoHorario,
  textoDaParede,
  textoDoResumoDoHorario,
} from "@/lib/escale/automacoes/fluxo/condicoes";

const CAMPOS: CuratedField[] = [
  { value: "lead.tags", label: "Tags do lead", op: "contains", lista: true },
  { value: "contact.tags", label: "Tags do contato", op: "contains", lista: true },
  { value: "event.added_tags", label: "Tag adicionada", op: "contains", lista: true },
];
const t = (s: string) => s;

describe("categorias do seletor", () => {
  it("Contato = contact.*, Negócio = lead.*, Campos = event.* + campo personalizado, Horário atual = Hora, Data e o Em breve", () => {
    expect(itensDaCategoria("contato", CAMPOS).map((i) => (i.tipo === "campo" ? i.campo.value : i.tipo))).toEqual(["contact.tags"]);
    expect(itensDaCategoria("negocio", CAMPOS).map((i) => (i.tipo === "campo" ? i.campo.value : i.tipo))).toEqual(["lead.tags"]);
    expect(itensDaCategoria("campos", CAMPOS).map((i) => i.tipo)).toEqual(["campo", "avancado"]);
    expect(itensDaCategoria("horario", CAMPOS).map((i) => i.tipo)).toEqual(["horario", "horario", "em_breve"]);
  });

  it("a busca procura em todas as categorias pelo rótulo", () => {
    expect(buscarItens("tags", CAMPOS, t)).toHaveLength(2);
    expect(buscarItens("hora", CAMPOS, t).map((i) => (i.tipo === "campo" ? i.campo.label : i.rotulo))).toEqual(["Hora", "Horário de atendimento"]);
    expect(buscarItens("zzz", CAMPOS, t)).toEqual([]);
  });
});

describe("máscaras e data de parede", () => {
  it("hora e data e hora a partir dos dígitos", () => {
    expect(mascaraDeHora("0830")).toBe("08:30");
    expect(mascaraDeHora("08")).toBe("08");
    expect(mascaraDeHora("12:345")).toBe("12:34");
    expect(mascaraDeDataEHora("031120261400")).toBe("03/11/2026 14:00");
    expect(mascaraDeDataEHora("0311")).toBe("03/11");
  });

  it("dd/mm/aaaa hh:mm ↔ AAAA-MM-DDTHH:MM, recusando data que não existe", () => {
    expect(paredeDoTexto("03/11/2026 14:00")).toBe("2026-11-03T14:00");
    expect(paredeDoTexto("31/02/2026 14:00")).toBeNull();
    expect(paredeDoTexto("03/11/2026")).toBeNull();
    expect(textoDaParede("2026-11-03T14:00")).toBe("03/11/2026 14:00");
  });
});

describe("valor e resumo", () => {
  it("monta o valor da Hora e da Data; inválido = null", () => {
    expect(montarValorDoHorario("agora.hora", "entre", "08:00", "18:00", ["5", "1"])).toBe('{"de":"08:00","ate":"18:00","dias":[1,5]}');
    expect(montarValorDoHorario("agora.hora", "depois_de", "08:00", "18:00", [])).toBe('{"de":"08:00","dias":[]}');
    expect(montarValorDoHorario("agora.hora", "entre", "08:00", "", [])).toBeNull();
    expect(montarValorDoHorario("agora.data", "antes_de", "03/11/2026 14:00", "", [])).toBe('{"de":"2026-11-03T14:00"}');
    expect(montarValorDoHorario("agora.data", "entre", "03/11/2026 14:00", "03/11/2026 13:00", [])).toBeNull();
  });

  it("o editor reabre com o que estava gravado", () => {
    expect(estadoDoEditorDeHorario("agora.hora", { op: "entre", value: '{"de":"08:00","ate":"18:00","dias":[1]}' })).toEqual({
      op: "entre",
      de: "08:00",
      ate: "18:00",
      dias: ["1"],
    });
    expect(estadoDoEditorDeHorario("agora.data")).toEqual({ op: "depois_de", de: "", ate: "", dias: [] });
  });

  it("o resumo do nó: frase da Clint, intervalo e dias", () => {
    const r = resumoDoHorario({ field: "agora.hora", op: "entre", value: '{"de":"08:00","ate":"18:00","dias":[0,1,2]}' });
    expect(r?.frase).toBe("está entre");
    expect(textoDoResumoDoHorario("agora.hora", r!, t)).toBe("08:00 até 18:00 · seg, ter, dom");
    const todos = resumoDoHorario({ field: "agora.hora", op: "depois_de", value: '{"de":"08:00"}' });
    expect(textoDoResumoDoHorario("agora.hora", todos!, t)).toBe("08:00 · todos os dias");
    const d = resumoDoHorario({ field: "agora.data", op: "depois_de", value: '{"de":"2026-11-03T14:00"}' });
    expect(d?.frase).toBe("é depois de");
    expect(textoDoResumoDoHorario("agora.data", d!, t)).toBe("03/11/2026 14:00");
    expect(resumoDoHorario({ field: "agora.hora", op: "entre", value: "x" })).toBeNull();
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run lib/escale/automacoes/fluxo/condicoes.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Passo 3: As peças puras**

`lib/escale/automacoes/fluxo/condicoes.ts`:

```ts
/**
 * FORK ESCALE · automações: as peças puras do seletor de condição da Clint (busca + categorias) e do
 * editor de "Horário atual". Sem React: a tela usa, os testes batem sem renderizar.
 *
 * Categorias (decisão do plano 2026-11-03): "Contato" = campos `contact.*` do gatilho, "Negócio" =
 * `lead.*`, "Campos" = os demais (`event.*`) e o campo personalizado (a linha em modo avançado),
 * "Horário atual" = Hora, Data e "Horário de atendimento" (Em breve: depende da tela Configurações ›
 * Horários de atendimento, que é outra frente).
 */
import type { CuratedField } from "@/app/app/webhooks/_components/RuleEditor";
import {
  CAMPO_DATA,
  CAMPO_HORA,
  ehOperadorDeHorario,
  lerValorDaData,
  lerValorDaHora,
  type CampoDeHorario,
  type OperadorDeHorario,
} from "@/lib/automation/condicoes-de-horario";

export type CategoriaDaCondicao = "campos" | "contato" | "negocio" | "horario";

export type ItemDaCondicao =
  | { tipo: "campo"; campo: CuratedField }
  | { tipo: "avancado"; rotulo: string }
  | { tipo: "horario"; campo: CampoDeHorario; rotulo: string }
  | { tipo: "em_breve"; rotulo: string };

export const ORDEM_DAS_CATEGORIAS: readonly CategoriaDaCondicao[] = ["campos", "contato", "negocio", "horario"];

export const ROTULO_DA_CATEGORIA: Record<CategoriaDaCondicao, string> = {
  campos: "Campos",
  contato: "Contato",
  negocio: "Negócio",
  horario: "Horário atual",
};

const ITENS_DO_HORARIO: readonly ItemDaCondicao[] = [
  { tipo: "horario", campo: CAMPO_HORA, rotulo: "Hora" },
  { tipo: "horario", campo: CAMPO_DATA, rotulo: "Data" },
  { tipo: "em_breve", rotulo: "Horário de atendimento" },
];

export function itensDaCategoria(categoria: CategoriaDaCondicao, campos: readonly CuratedField[]): ItemDaCondicao[] {
  if (categoria === "horario") return [...ITENS_DO_HORARIO];
  if (categoria === "contato") return campos.filter((c) => c.value.startsWith("contact.")).map((campo) => ({ tipo: "campo", campo }));
  if (categoria === "negocio") return campos.filter((c) => c.value.startsWith("lead.")).map((campo) => ({ tipo: "campo", campo }));
  return [
    ...campos
      .filter((c) => !c.value.startsWith("contact.") && !c.value.startsWith("lead."))
      .map((campo): ItemDaCondicao => ({ tipo: "campo", campo })),
    { tipo: "avancado", rotulo: "Campo personalizado" },
  ];
}

export function rotuloDoItem(item: ItemDaCondicao): string {
  return item.tipo === "campo" ? item.campo.label : item.rotulo;
}

/** A busca da Clint: todos os itens de todas as categorias cujo rótulo traduzido contém o texto. */
export function buscarItens(busca: string, campos: readonly CuratedField[], traduzir: (s: string) => string): ItemDaCondicao[] {
  const alvo = busca.trim().toLowerCase();
  return ORDEM_DAS_CATEGORIAS.flatMap((c) => itensDaCategoria(c, campos)).filter((item) =>
    traduzir(rotuloDoItem(item)).toLowerCase().includes(alvo),
  );
}

/** "0830" → "08:30": só dígitos, até 4, com os dois-pontos no lugar. */
export function mascaraDeHora(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

/** "031120261400" → "03/11/2026 14:00". */
export function mascaraDeDataEHora(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 12);
  let saida = d.slice(0, 2);
  if (d.length > 2) saida += `/${d.slice(2, 4)}`;
  if (d.length > 4) saida += `/${d.slice(4, 8)}`;
  if (d.length > 8) saida += ` ${d.slice(8, 10)}`;
  if (d.length > 10) saida += `:${d.slice(10, 12)}`;
  return saida;
}

/** "03/11/2026 14:00" → "2026-11-03T14:00"; incompleto ou data que não existe → null. */
export function paredeDoTexto(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const parede = `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}`;
  return lerValorDaData("depois_de", JSON.stringify({ de: parede })) ? parede : null;
}

/** "2026-11-03T14:00" → "03/11/2026 14:00". */
export function textoDaParede(parede: string): string {
  const [data = "", hora = ""] = parede.split("T");
  const [ano = "", mes = "", dia = ""] = data.split("-");
  return `${dia}/${mes}/${ano} ${hora}`;
}

/** 0 = domingo … 6 = sábado, as siglas da Clint no nó. */
export const SIGLA_DO_DIA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;
export const NOME_DO_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
/** A ordem da lista: segunda primeiro, domingo no fim. */
export const DIAS_NA_ORDEM = [1, 2, 3, 4, 5, 6, 0] as const;

export const FRASE_DO_OPERADOR: Record<OperadorDeHorario, string> = {
  depois_de: "é depois de",
  antes_de: "é antes de",
  entre: "está entre",
};

export type ResumoDoHorario = { frase: string; de: string; ate: string | null; dias: number[] };

export function resumoDoHorario(linha: { field: string; op: string; value: string }): ResumoDoHorario | null {
  if (!ehOperadorDeHorario(linha.op)) return null;
  const frase = FRASE_DO_OPERADOR[linha.op];
  if (linha.field === CAMPO_HORA) {
    const v = lerValorDaHora(linha.op, linha.value);
    return v ? { frase, de: v.de, ate: v.ate ?? null, dias: DIAS_NA_ORDEM.filter((d) => v.dias.includes(d)) } : null;
  }
  if (linha.field === CAMPO_DATA) {
    const v = lerValorDaData(linha.op, linha.value);
    return v ? { frase, de: textoDaParede(v.de), ate: v.ate ? textoDaParede(v.ate) : null, dias: [] } : null;
  }
  return null;
}

/** "08:00 até 18:00 · seg, ter" (Hora) ou "03/11/2026 14:00" (Data). */
export function textoDoResumoDoHorario(campo: string, resumo: ResumoDoHorario, t: (s: string) => string): string {
  const intervalo = resumo.ate ? `${resumo.de} ${t("até")} ${resumo.ate}` : resumo.de;
  if (campo !== CAMPO_HORA) return intervalo;
  const todos = resumo.dias.length === 0 || resumo.dias.length === 7;
  const dias = todos ? t("todos os dias") : resumo.dias.map((d) => t(SIGLA_DO_DIA[d] ?? "")).join(", ");
  return `${intervalo} · ${dias}`;
}

/** O `value` gravado a partir do que está no editor; o que ainda não fecha devolve null (Confirmar desligado). */
export function montarValorDoHorario(
  campo: CampoDeHorario,
  op: OperadorDeHorario,
  de: string,
  ate: string,
  dias: readonly string[],
): string | null {
  const entre = op === "entre";
  if (campo === CAMPO_HORA) {
    const valor = JSON.stringify({ de, ...(entre ? { ate } : {}), dias: dias.map(Number).sort((a, b) => a - b) });
    return lerValorDaHora(op, valor) ? valor : null;
  }
  const deNaParede = paredeDoTexto(de);
  const ateNaParede = entre ? paredeDoTexto(ate) : null;
  if (!deNaParede || (entre && !ateNaParede)) return null;
  const valor = JSON.stringify({ de: deNaParede, ...(entre ? { ate: ateNaParede } : {}) });
  return lerValorDaData(op, valor) ? valor : null;
}

export type EstadoDoEditorDeHorario = { op: OperadorDeHorario; de: string; ate: string; dias: string[] };

/** O que o editor mostra ao abrir: a condição gravada, ou "Depois de" vazio. */
export function estadoDoEditorDeHorario(
  campo: CampoDeHorario,
  inicial?: { op: string; value: string },
): EstadoDoEditorDeHorario {
  const vazio: EstadoDoEditorDeHorario = { op: "depois_de", de: "", ate: "", dias: [] };
  if (!inicial || !ehOperadorDeHorario(inicial.op)) return vazio;
  if (campo === CAMPO_HORA) {
    const v = lerValorDaHora(inicial.op, inicial.value);
    return v ? { op: inicial.op, de: v.de, ate: v.ate ?? "", dias: v.dias.map(String) } : vazio;
  }
  const v = lerValorDaData(inicial.op, inicial.value);
  return v ? { op: inicial.op, de: textoDaParede(v.de), ate: v.ate ? textoDaParede(v.ate) : "", dias: [] } : vazio;
}
```

- [ ] **Passo 4: Rodar os puros**

Run: `corepack pnpm vitest run lib/escale/automacoes/fluxo/condicoes.test.ts`
Expected: PASS.

- [ ] **Passo 5: Testes da tela que falham**

Criar `tests/unit/escale-automacoes-horario.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/webhooks/useWebhookSources", () => ({
  useWebhookSources: () => ({ data: { data: [] } }),
  usePipelines: () => ({ data: { data: [{ id: "p1", name: "Vendas", is_default: true, settings: null }] } }),
  usePipelineStages: () => ({ data: undefined }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({ useChannelSessions: () => ({ data: [] }), channelLabel: () => "" }));

import { CorpoDasCondicoes } from "@/components/escale/automacoes/fluxo/CorposDoNo";
import { EditorDeHorario } from "@/components/escale/automacoes/fluxo/painel/condicoes/EditorDeHorario";
import { PainelDasCondicoes } from "@/components/escale/automacoes/fluxo/painel/PainelDasCondicoes";

const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const SP = "America/Sao_Paulo";

describe("EditorDeHorario", () => {
  it("Hora › Entre: máscara, dias e Confirmar só com o valor completo", async () => {
    const aoConfirmar = vi.fn();
    envolver(<EditorDeHorario campo="agora.hora" fuso={SP} aoCancelar={vi.fn()} aoConfirmar={aoConfirmar} aoVoltar={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Voltar" })).toBeTruthy();
    expect(screen.getByText("(UTC -3)")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Depois de" }).getAttribute("aria-checked")).toBe("true");
    await userEvent.click(screen.getByRole("radio", { name: "Entre" }));
    const confirmar = screen.getByRole("button", { name: "Confirmar" }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    await userEvent.type(screen.getByRole("textbox", { name: "Hora inicial" }), "0800");
    await userEvent.type(screen.getByRole("textbox", { name: "Hora final" }), "1800");
    expect((screen.getByRole("textbox", { name: "Hora inicial" }) as HTMLInputElement).value).toBe("08:00");
    await userEvent.click(screen.getByRole("combobox", { name: "Dias da semana" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Segunda" }));
    await userEvent.click(confirmar);
    expect(aoConfirmar).toHaveBeenCalledWith("entre", '{"de":"08:00","ate":"18:00","dias":[1]}');
  });

  it("Data › Depois de: dd/MM/yyyy HH:mm e sem dias da semana", async () => {
    const aoConfirmar = vi.fn();
    envolver(<EditorDeHorario campo="agora.data" fuso={SP} aoCancelar={vi.fn()} aoConfirmar={aoConfirmar} />);
    expect(screen.queryByRole("combobox", { name: "Dias da semana" })).toBeNull();
    await userEvent.type(screen.getByRole("textbox", { name: "Data" }), "031120261400");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(aoConfirmar).toHaveBeenCalledWith("depois_de", '{"de":"2026-11-03T14:00"}');
  });
});

describe("PainelDasCondicoes com Horário atual", () => {
  it("o seletor da Clint: categorias, Em breve, e Hora adiciona a linha com o resumo", async () => {
    const aoSalvar = vi.fn();
    envolver(
      <PainelDasCondicoes dados={{ kind: "condicoes", linhas: [] }} evento="contact.birthday" fuso={SP} aoCancelar={vi.fn()} aoSalvar={aoSalvar} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    expect(screen.getByText("Recomendados")).toBeTruthy();
    for (const c of ["Campos", "Contato", "Negócio"]) expect(screen.getByRole("button", { name: c })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Horário atual" }));
    expect(screen.getByText("Em breve")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Hora" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Hora" }), "0800");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getByText("é depois de")).toBeTruthy();
    expect(screen.getByText("08:00 · todos os dias")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith({
      kind: "condicoes",
      linhas: [{ field: "agora.hora", op: "depois_de", value: '{"de":"08:00","dias":[]}' }],
    });
  });

  it("a busca filtra e diz quando não acha", async () => {
    envolver(<PainelDasCondicoes dados={{ kind: "condicoes", linhas: [] }} evento="contact.birthday" fuso={SP} aoCancelar={vi.fn()} aoSalvar={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Buscar" }), "zzz");
    expect(screen.getByText(/Sem resultados para/)).toBeTruthy();
  });
});

describe("o nó de condições", () => {
  it("mostra 'Horário atual' com a frase e o intervalo", () => {
    envolver(
      <CorpoDasCondicoes
        evento="contact.birthday"
        dados={{ kind: "condicoes", linhas: [{ field: "agora.hora", op: "entre", value: '{"de":"08:00","ate":"18:00","dias":[1,2]}' }] }}
      />,
    );
    expect(screen.getByText("está entre")).toBeTruthy();
    expect(screen.getByText("08:00 até 18:00 · seg, ter")).toBeTruthy();
  });
});
```

E, em `tests/unit/escale-fluxo-paineis-acoes.test.tsx`, troque o teste `"a lixeira tira a linha; o + adiciona até 10 e então desabilita"` por:

```tsx
  it("a lixeira tira a linha; 'Adicionar condição' adiciona até 10 e então desabilita", async () => {
    envolver(
      <PainelDasCondicoes
        dados={dados([{ field: "contact.tags", op: "contains", value: "a" }])}
        evento="contact.birthday"
        aoCancelar={vi.fn()}
        aoSalvar={vi.fn()}
      />,
    );
    const mais = screen.getByRole("button", { name: "Adicionar condição" }) as HTMLButtonElement;
    for (let i = 0; i < 9; i += 1) {
      await userEvent.click(mais);
      await userEvent.click(screen.getByRole("button", { name: "Campo personalizado" }));
    }
    expect(screen.getAllByTestId(/^condicao-/)).toHaveLength(10);
    expect(mais.disabled).toBe(true);
    await userEvent.click(screen.getAllByRole("button", { name: "Remover condição" })[0]!);
    expect(screen.getAllByTestId(/^condicao-/)).toHaveLength(9);
    expect(mais.disabled).toBe(false);
  });
```

- [ ] **Passo 6: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-automacoes-horario.test.tsx tests/unit/escale-fluxo-paineis-acoes.test.tsx`
Expected: FAIL (`EditorDeHorario` não existe).

- [ ] **Passo 7: O editor de Hora/Data**

`components/escale/automacoes/fluxo/painel/condicoes/EditorDeHorario.tsx`:

```tsx
"use client";
import { useState } from "react";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { CAMPO_HORA, rotuloDoFuso, type CampoDeHorario, type OperadorDeHorario } from "@/lib/automation/condicoes-de-horario";
import {
  DIAS_NA_ORDEM,
  NOME_DO_DIA,
  estadoDoEditorDeHorario,
  mascaraDeDataEHora,
  mascaraDeHora,
  montarValorDoHorario,
} from "@/lib/escale/automacoes/fluxo/condicoes";
import { Calendar, ChevronLeft, Clock } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const OPCOES: readonly { op: OperadorDeHorario; rotulo: string }[] = [
  { op: "depois_de", rotulo: "Depois de" },
  { op: "antes_de", rotulo: "Antes de" },
  { op: "entre", rotulo: "Entre" },
];

/**
 * O EDITOR DE "HORÁRIO ATUAL" (prints da Clint de 03/11/2026, Hora e Data): "< Voltar", o título com o
 * ícone, as três opções à esquerda com a divisória, os campos cinza à direita, "(UTC -3)" e Cancelar /
 * Confirmar. Hora e data em texto com máscara, nunca o controle nativo do navegador. Confirmar só liga
 * com o valor completo.
 */
export function EditorDeHorario({
  campo,
  inicial,
  fuso,
  aoVoltar,
  aoCancelar,
  aoConfirmar,
}: {
  campo: CampoDeHorario;
  inicial?: { op: string; value: string };
  fuso: string;
  aoVoltar?: () => void;
  aoCancelar: () => void;
  aoConfirmar: (op: OperadorDeHorario, value: string) => void;
}) {
  const t = useT();
  const [estado, setEstado] = useState(() => estadoDoEditorDeHorario(campo, inicial));
  const ehHora = campo === CAMPO_HORA;
  const Icone = ehHora ? Clock : Calendar;
  const mascara = ehHora ? mascaraDeHora : mascaraDeDataEHora;
  const entre = estado.op === "entre";
  const valor = montarValorDoHorario(campo, estado.op, estado.de, estado.ate, estado.dias);
  const classeDoCampo = ehHora ? "w-[88px] px-0 text-center" : "w-[220px]";
  const placeholderDaData = t("dd/MM/yyyy HH:mm");

  return (
    <div className="flex w-[560px] flex-col p-5" data-testid="editor-de-horario">
      {aoVoltar ? (
        <button type="button" onClick={aoVoltar} className="flex w-fit items-center gap-1 text-[13px] text-casca-marca">
          <ChevronLeft size={14} aria-hidden />
          {t("Voltar")}
        </button>
      ) : null}
      <p className="mt-6 flex items-center gap-1.5 text-[14px] font-semibold text-casca-texto">
        <Icone size={14} aria-hidden />
        {ehHora ? t("Hora") : t("Data")}
      </p>
      <div className="mt-6 flex min-h-[150px]">
        <div
          role="radiogroup"
          aria-label={ehHora ? t("Hora") : t("Data")}
          className="flex w-[150px] shrink-0 flex-col gap-4 border-r border-casca-divisoria pt-2"
        >
          {OPCOES.map((o) => (
            <button
              key={o.op}
              type="button"
              role="radio"
              aria-checked={estado.op === o.op}
              onClick={() => setEstado({ ...estado, op: o.op })}
              className="flex items-center gap-2 text-left text-[14px] text-casca-texto"
            >
              <span
                aria-hidden
                className={cn(
                  "inline-block size-3.5 rounded-full border",
                  estado.op === o.op
                    ? "border-casca-marca bg-casca-marca shadow-[inset_0_0_0_3px_var(--escale-superficie)]"
                    : "border-casca-borda",
                )}
              />
              {t(o.rotulo)}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 pl-5">
          <div className="flex items-center gap-3">
            <CampoDeTexto
              inputMode="numeric"
              aria-label={entre ? (ehHora ? t("Hora inicial") : t("Data inicial")) : ehHora ? t("Hora") : t("Data")}
              value={estado.de}
              placeholder={ehHora ? "08:00" : placeholderDaData}
              onChange={(e) => setEstado({ ...estado, de: mascara(e.target.value) })}
              className={classeDoCampo}
            />
            {entre ? (
              <>
                <span className="text-[14px] text-casca-texto">{t("até")}</span>
                <CampoDeTexto
                  inputMode="numeric"
                  aria-label={ehHora ? t("Hora final") : t("Data final")}
                  value={estado.ate}
                  placeholder={ehHora ? "18:00" : placeholderDaData}
                  onChange={(e) => setEstado({ ...estado, ate: mascara(e.target.value) })}
                  className={classeDoCampo}
                />
              </>
            ) : null}
          </div>
          {ehHora ? (
            <div className="flex flex-col gap-2">
              <span className="text-[14px] text-casca-texto">{t("Dias da semana")}</span>
              <SeletorMultiploDaCasca
                aria-label={t("Dias da semana")}
                vazio={t("Selecione os dias")}
                valores={estado.dias}
                aoMudar={(dias) => setEstado({ ...estado, dias })}
                opcoes={DIAS_NA_ORDEM.map((d) => ({ valor: String(d), rotulo: t(NOME_DO_DIA[d]) }))}
              />
            </div>
          ) : null}
          <span className="text-[13px] text-casca-suave">{rotuloDoFuso(fuso)}</span>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={aoCancelar}
          className="h-10 rounded-md border border-casca-borda px-5 text-[14px] text-casca-texto hover:bg-casca-raia"
        >
          {t("Cancelar")}
        </button>
        <button
          type="button"
          disabled={valor === null}
          onClick={() => {
            if (valor !== null) aoConfirmar(estado.op, valor);
          }}
          className="h-10 rounded-md bg-casca-marca px-5 text-[14px] font-medium text-white disabled:opacity-60"
        >
          {t("Confirmar")}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Passo 8: O seletor de condição**

`components/escale/automacoes/fluxo/painel/condicoes/SeletorDeCondicao.tsx`:

```tsx
"use client";
import { useState, type ReactNode } from "react";

import type { CuratedField } from "@/app/app/webhooks/_components/RuleEditor";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { CAMPO_HORA, type CampoDeHorario, type OperadorDeHorario } from "@/lib/automation/condicoes-de-horario";
import {
  ORDEM_DAS_CATEGORIAS,
  ROTULO_DA_CATEGORIA,
  buscarItens,
  itensDaCategoria,
  rotuloDoItem,
  type CategoriaDaCondicao,
  type ItemDaCondicao,
} from "@/lib/escale/automacoes/fluxo/condicoes";
import { Calendar, Clock, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { EditorDeHorario } from "./EditorDeHorario";

export type EscolhaDaCondicao =
  | { tipo: "campo"; campo: CuratedField }
  | { tipo: "avancado" }
  | { tipo: "horario"; campo: CampoDeHorario; op: OperadorDeHorario; value: string };

/**
 * O SELETOR DE CONDIÇÃO DA CLINT (print de 03/11/2026): busca "Buscar" com a lupa à direita, a coluna
 * de tipos ("Recomendados" em cinza no topo, Campos, Contato, Negócio, Horário atual) e, à direita, as
 * opções do tipo. Hora e Data abrem o editor no mesmo balão.
 */
export function SeletorDeCondicao({
  campos,
  fuso,
  aoEscolher,
  children,
}: {
  campos: readonly CuratedField[];
  fuso: string;
  aoEscolher: (escolha: EscolhaDaCondicao) => void;
  /** O botão que abre o balão (vai em `PopoverTrigger asChild`). */
  children: ReactNode;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaDaCondicao>("campos");
  const [busca, setBusca] = useState("");
  const [horario, setHorario] = useState<CampoDeHorario | null>(null);
  const buscando = busca.trim() !== "";
  const itens = buscando ? buscarItens(busca, campos, t) : itensDaCategoria(categoria, campos);

  function mudarAberto(valor: boolean) {
    setAberto(valor);
    if (!valor) {
      setHorario(null);
      setBusca("");
    }
  }

  function escolher(item: ItemDaCondicao) {
    if (item.tipo === "em_breve") return;
    if (item.tipo === "horario") {
      setHorario(item.campo);
      return;
    }
    aoEscolher(item.tipo === "campo" ? { tipo: "campo", campo: item.campo } : { tipo: "avancado" });
    mudarAberto(false);
  }

  return (
    <Popover open={aberto} onOpenChange={mudarAberto}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PainelSuspenso side="right" align="start" sideOffset={12} className="p-0">
        {horario ? (
          <EditorDeHorario
            campo={horario}
            fuso={fuso}
            aoVoltar={() => setHorario(null)}
            aoCancelar={() => mudarAberto(false)}
            aoConfirmar={(op, value) => {
              aoEscolher({ tipo: "horario", campo: horario, op, value });
              mudarAberto(false);
            }}
          />
        ) : (
          <div className="flex w-[560px] flex-col p-4" data-testid="seletor-de-condicao">
            <label className="flex h-10 items-center gap-2 rounded-md bg-casca-raia px-3">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("Buscar")}
                aria-label={t("Buscar")}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-casca-texto outline-hidden placeholder:text-casca-meta"
              />
              <Search size={16} aria-hidden className="text-casca-texto-2" />
            </label>
            <div className="mt-4 flex min-h-[320px]">
              <nav aria-label={t("Tipos de condição")} className="flex w-[170px] shrink-0 flex-col gap-1 border-r border-casca-divisoria">
                <span className="flex h-10 items-center text-[14px] text-casca-meta">{t("Recomendados")}</span>
                {ORDEM_DAS_CATEGORIAS.map((c) => {
                  const ativa = !buscando && categoria === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={ativa}
                      onClick={() => {
                        setBusca("");
                        setCategoria(c);
                      }}
                      className={cn("flex h-10 items-center text-left text-[14px]", ativa ? "font-medium text-casca-marca" : "text-casca-texto")}
                    >
                      {t(ROTULO_DA_CATEGORIA[c])}
                    </button>
                  );
                })}
              </nav>
              <ul className="flex min-w-0 flex-1 flex-col gap-1 pl-10">
                {itens.length === 0 ? (
                  <li className="py-2 text-[13px] text-casca-suave">
                    {buscando ? `${t("Sem resultados para")} “${busca.trim()}”` : t("Nenhuma opção para este gatilho")}
                  </li>
                ) : null}
                {itens.map((item) => (
                  <li key={`${item.tipo}-${rotuloDoItem(item)}`}>
                    <ItemDaLista item={item} aoEscolher={escolher} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </PainelSuspenso>
    </Popover>
  );
}

function ItemDaLista({ item, aoEscolher }: { item: ItemDaCondicao; aoEscolher: (item: ItemDaCondicao) => void }) {
  const t = useT();
  const emBreve = item.tipo === "em_breve";
  const Icone = item.tipo === "horario" ? (item.campo === CAMPO_HORA ? Clock : Calendar) : emBreve ? Clock : null;
  return (
    <button
      type="button"
      aria-disabled={emBreve || undefined}
      onClick={() => aoEscolher(item)}
      className={cn(
        "flex h-10 w-full items-center gap-2 text-left text-[14px] text-casca-texto",
        emBreve ? "cursor-not-allowed opacity-60" : "hover:text-casca-marca",
      )}
    >
      {Icone ? <Icone size={16} aria-hidden className="shrink-0 text-casca-texto-2" /> : null}
      <span className="min-w-0 truncate">{t(rotuloDoItem(item))}</span>
      {emBreve ? <span className="ml-2 rounded bg-casca-raia px-1.5 text-[10px] text-casca-texto-2">{t("Em breve")}</span> : null}
    </button>
  );
}
```

- [ ] **Passo 9: A linha de horário no painel**

`components/escale/automacoes/fluxo/painel/condicoes/LinhaDeHorario.tsx`:

```tsx
"use client";
import { useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { CAMPO_HORA, type CampoDeHorario, type OperadorDeHorario } from "@/lib/automation/condicoes-de-horario";
import type { LinhaDeCondicao } from "@/lib/automation/desenho-da-regra";
import { resumoDoHorario, textoDoResumoDoHorario } from "@/lib/escale/automacoes/fluxo/condicoes";
import { Calendar, Clock, Trash2 } from "@/lib/ui/icons-da-casca";

import { EditorDeHorario } from "./EditorDeHorario";

/**
 * A condição "Horário atual" no painel: bloco cinza "🕒 Horário atual **está entre**" com o intervalo
 * embaixo (as frases do nó da Clint). Clicar reabre o editor com o que estava gravado.
 */
export function LinhaDeHorario({
  linha,
  indice,
  fuso,
  aoMudar,
  aoRemover,
}: {
  linha: LinhaDeCondicao;
  indice: number;
  fuso: string;
  aoMudar: (op: OperadorDeHorario, value: string) => void;
  aoRemover: () => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const resumo = resumoDoHorario(linha);
  const Icone = linha.field === CAMPO_HORA ? Clock : Calendar;
  return (
    <div className="flex items-start gap-2 rounded-lg bg-casca-raia p-3" data-testid={`condicao-${indice}`}>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button type="button" aria-label={t("Editar condição de horário")} className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-1.5 text-[13px] text-casca-texto">
              <Icone size={13} aria-hidden className="shrink-0 text-casca-texto-2" />
              {t("Horário atual")}
              <u className="font-semibold">{resumo ? t(resumo.frase) : t("Revise o horário da condição.")}</u>
            </span>
            {resumo ? (
              <span className="mt-1 block text-[12px] text-casca-texto-2">{textoDoResumoDoHorario(linha.field, resumo, t)}</span>
            ) : null}
          </button>
        </PopoverTrigger>
        <PainelSuspenso side="right" align="start" sideOffset={12} className="p-0">
          <EditorDeHorario
            campo={linha.field as CampoDeHorario}
            inicial={linha}
            fuso={fuso}
            aoCancelar={() => setAberto(false)}
            aoConfirmar={(op, value) => {
              aoMudar(op, value);
              setAberto(false);
            }}
          />
        </PainelSuspenso>
      </Popover>
      <button
        type="button"
        aria-label={t("Remover condição")}
        onClick={aoRemover}
        className="grid size-7 shrink-0 place-items-center rounded-md text-casca-suave hover:text-casca-alerta"
      >
        <Trash2 size={14} aria-hidden />
      </button>
    </div>
  );
}
```

- [ ] **Passo 10: O painel das condições**

Em `components/escale/automacoes/fluxo/painel/PainelDasCondicoes.tsx`:

1. Imports novos:

```ts
import { ehCampoDeHorario } from "@/lib/automation/condicoes-de-horario";
import { FUSO_PADRAO } from "@/lib/tempo/fusos";

import { LinhaDeHorario } from "./condicoes/LinhaDeHorario";
import { SeletorDeCondicao, type EscolhaDaCondicao } from "./condicoes/SeletorDeCondicao";
```

2. Props: acrescente `fuso = FUSO_PADRAO,` na desestruturação e `/** O fuso da organização (o "(UTC -3)" do horário). */ fuso?: string;` no tipo.

3. Depois de `const mudar = ...`:

```ts
  // FORK ESCALE · automações: o "+ Adicionar condição" abre o seletor da Clint.
  function adicionar(escolha: EscolhaDaCondicao) {
    const nova: LinhaDeCondicao =
      escolha.tipo === "campo"
        ? { field: escolha.campo.value, op: escolha.campo.op, value: "" }
        : escolha.tipo === "avancado"
          ? { field: "", op: "eq", value: "", avancado: true }
          : { field: escolha.campo, op: escolha.op, value: escolha.value };
    setRascunho([...linhas, nova]);
  }
```

4. No começo do callback de `linhas.map((linha, i) => {`, antes do cálculo de `avancado`:

```tsx
          if (ehCampoDeHorario(linha.field)) {
            return (
              <LinhaDeHorario
                key={i}
                indice={i}
                linha={linha}
                fuso={fuso}
                aoMudar={(op, value) => mudar(i, { op, value })}
                aoRemover={() => setRascunho(linhas.filter((_, j) => j !== i))}
              />
            );
          }
```

5. Troque o bloco `<div className="flex justify-end"> <button ... aria-label={t("Adicionar condição")} ...> <Plus .../> </button> </div>` por (botão tracejado de largura total, print 4):

```tsx
        <SeletorDeCondicao campos={campos} fuso={fuso} aoEscolher={adicionar}>
          <button
            type="button"
            disabled={!evento || linhas.length >= MAXIMO_DE_CONDICOES}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-casca-divisoria text-[13px] font-medium text-casca-marca-forte hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} aria-hidden />
            {t("Adicionar condição")}
          </button>
        </SeletorDeCondicao>
```

6. A frase do rodapé `t("Linhas sem campo ou sem valor são descartadas ao salvar. No máximo 10.")` fica.

- [ ] **Passo 11: O fuso chega ao painel**

Em `components/escale/automacoes/fluxo/TelaDoFluxo.tsx`, no `<PainelDasCondicoes ... />`, acrescente `fuso={fuso}`.

- [ ] **Passo 12: O nó de condições**

Em `components/escale/automacoes/fluxo/CorposDoNo.tsx`, imports `import { ehCampoDeHorario } from "@/lib/automation/condicoes-de-horario";` e `import { resumoDoHorario, textoDoResumoDoHorario } from "@/lib/escale/automacoes/fluxo/condicoes";`, e no começo do `completas.map((l, i) => {`:

```tsx
          if (ehCampoDeHorario(l.field)) {
            // FORK ESCALE · automações: "Horário atual" com a frase e o intervalo da Clint.
            const resumo = resumoDoHorario(l);
            return (
              <div key={i} className="rounded-lg bg-casca-raia px-3 py-2" data-testid="condicao-do-no">
                <p>
                  {t("Horário atual")} <u className="font-semibold">{resumo ? t(resumo.frase) : t("Revise o horário da condição.")}</u>
                </p>
                {resumo ? <p className="text-[12px] text-casca-texto-2">{textoDoResumoDoHorario(l.field, resumo, t)}</p> : null}
              </div>
            );
          }
```

- [ ] **Passo 13: Dicionário**

Acrescente em `lib/i18n/dicionario.ts` as que faltam (confira cada uma com `grep`; "Hora", "Data", "Depois de", "Antes de", "até", "Confirmar", "Campos", "Negócio", "Em breve", "Adicionar condição", "Remover condição" e "está entre" já existem):

```ts
  "Recomendados": { es: "Recomendados" },
  "Contato": { es: "Contacto" },
  "Horário atual": { es: "Horario actual" },
  "Horário de atendimento": { es: "Horario de atención" },
  "Campo personalizado": { es: "Campo personalizado" },
  "Buscar": { es: "Buscar" },
  "Tipos de condição": { es: "Tipos de condición" },
  "Sem resultados para": { es: "Sin resultados para" },
  "Nenhuma opção para este gatilho": { es: "Ninguna opción para este disparador" },
  "Voltar": { es: "Volver" },
  "Entre": { es: "Entre" },
  "Hora inicial": { es: "Hora inicial" },
  "Hora final": { es: "Hora final" },
  "Data inicial": { es: "Fecha inicial" },
  "Data final": { es: "Fecha final" },
  "dd/MM/yyyy HH:mm": { es: "dd/MM/aaaa HH:mm" },
  "Dias da semana": { es: "Días de la semana" },
  "Selecione os dias": { es: "Seleccione los días" },
  "Cancelar": { es: "Cancelar" },
  "é depois de": { es: "es después de" },
  "é antes de": { es: "es antes de" },
  "todos os dias": { es: "todos los días" },
  "dom": { es: "dom" },
  "seg": { es: "lun" },
  "ter": { es: "mar" },
  "qua": { es: "mié" },
  "qui": { es: "jue" },
  "sex": { es: "vie" },
  "sáb": { es: "sáb" },
  "Domingo": { es: "Domingo" },
  "Segunda": { es: "Lunes" },
  "Terça": { es: "Martes" },
  "Quarta": { es: "Miércoles" },
  "Quinta": { es: "Jueves" },
  "Sexta": { es: "Viernes" },
  "Sábado": { es: "Sábado" },
  "Editar condição de horário": { es: "Editar condición de horario" },
  "Revise o horário da condição.": { es: "Revise el horario de la condición." },
```

- [ ] **Passo 14: Rodar**

Run: `corepack pnpm vitest run lib/escale/automacoes/fluxo/condicoes.test.ts tests/unit/escale-automacoes-horario.test.tsx tests/unit/escale-fluxo-paineis-acoes.test.tsx tests/unit/escale-fluxo-paineis.test.tsx tests/unit/escale-fluxo-nos.test.tsx tests/unit/escale-fluxo-cabecalho.test.tsx tests/unit/escale-comentarios-formulario.test.tsx tests/unit/i18n-espanhol-cobre-a-tela.test.ts`
Expected: PASS. Eslint dos arquivos alterados; typecheck em segundo plano. Se o guarda de i18n reprovar uma chave de runtime nova, troque o argumento de `t()` por tabela constante (`t(TABELA[chave])`) ou campo de objeto; não amplie a lista permitida.

- [ ] **Passo 15: Commit e PR B**

```bash
git add lib/escale/automacoes/fluxo/condicoes.ts lib/escale/automacoes/fluxo/condicoes.test.ts components/escale/automacoes/fluxo/painel/condicoes components/escale/automacoes/fluxo/painel/PainelDasCondicoes.tsx components/escale/automacoes/fluxo/TelaDoFluxo.tsx components/escale/automacoes/fluxo/CorposDoNo.tsx lib/i18n/dicionario.ts tests/unit/escale-automacoes-horario.test.tsx tests/unit/escale-fluxo-paineis-acoes.test.tsx
git commit -m "feat: condição Horário atual na tela (seletor da Clint e editor de Hora e Data)"
git push -u escale-crm feat/automacoes-horario
gh pr create --repo rgisjr/escale-crm --base main --title "feat: automações — condição Horário atual (Hora e Data)" --body-file <arquivo com resumo, plano de teste e a linha final do Claude Code>
gh pr merge <n> --repo rgisjr/escale-crm --merge
```

---

### Tarefa 5: Bateria, revisão, conferência visual e publicação (uma vez)

**Arquivos:** nenhum código novo; só as correções que a bateria ou a revisão pedirem, e `LOG.md` na raiz da pasta `Deskcom CRM`.

- [ ] **Passo 1: Base atualizada** — worktree nova `../wt-auto-bateria` a partir de `escale-crm/main` (com os PRs A e B), `corepack pnpm install --frozen-lockfile`.

- [ ] **Passo 2: Suíte unitária inteira, em segundo plano** — `NODE_OPTIONS=--max-old-space-size=10240 corepack pnpm gov:verify > ../gov-auto.log 2>&1; echo "exit=$?" >> ../gov-auto.log`. Leia o exit code, o rodapé (`Test Files`/`Tests`) e `grep -aE "^ *FAIL " ../gov-auto.log | sed 's/ > .*//' | sort | uniq -c`. Falha que também aparece numa worktree limpa da `main` anterior aos PRs não é desta entrega (separe as duas). Falha nova: corrigir antes de publicar. Typecheck e cercas (`corepack pnpm cercas`, ~44 falhas antigas de ambiente Windows) também em segundo plano, comparando com a `main` antiga do mesmo jeito.

- [ ] **Passo 3: Sem `test:db`** — não há migration nesta entrega (decisão 1). Registre no LOG como "validado por leitura": a ligação do filtro e do relógio dentro do `engine.ts` (as funções puras têm teste; o motor com banco não foi rodado).

- [ ] **Passo 4: Um revisor** — um agente revisor (`typescript-reviewer` ou `code-reviewer`), **Opus 5.5, esforço alto**, sobre o diff inteiro dos PRs A e B (`git diff <base antes do PR A>..escale-crm/main`). Pedir só achados, com severidade. Corrigir Critical/Important antes de publicar.

- [ ] **Passo 5: Publicar** — tag anotada `vX.Y.Z-escale.N` (a próxima depois da última: `git tag --list "v*-escale.*" --sort=-v:refname | head -1`) no topo testado da `main`, `gh release create ... --latest` em `rgisjr/escale-crm`, esperar o workflow até `promover-stable: success`, e na VPS `76.13.228.29` (`/root/DeskcommCRM`): `df -h /` com folga, `bash hostgator-setup-kit/backup.sh`, depois `nohup bash hostgator-setup-kit/update.sh --to <tag> > /root/update-<tag>.log 2>&1 &`. Conferir: 3 containers healthy, `/login` 200, sem erro no log do update/app/worker. Falhou: voltar para a tag anterior e avisar.

- [ ] **Passo 6: Conferência visual (uma vez)** — antes, peça ao usuário o print do formulário "Tag adicionada ao contato" da Clint (decisão 8) e ajuste se divergir. Depois, em https://app.escaleia.com com a casca, abra uma automação e compare lado a lado com: 07-022 (cartão "Negócio criado" e o formulário), 07-024 + print da tag, e os prints 1, 2, 3 e 4 desta entrega (seletor, editor de Data, editor de Hora com Entre, botão "+ Adicionar condição"). Não salvar nada em automação de cliente; use uma automação nova e **desligada**, e exclua ao terminar. Liste por escrito cada diferença que sobrou.

- [ ] **Passo 7: Registro** — atualizar `LOG.md` (feito, versão no ar, o que foi validado por execução e por leitura, pendências: "Horário de atendimento" depende da frente Configurações › Horários de atendimento) e a memória do projeto (`frente-automacoes-estado.md`). Mensagem final curta ao usuário: a versão no ar, o que entrou e o que olhar no app.

---

## Autorrevisão (feita ao escrever)

- **Cobertura:** tag com escolha (T1 motor, T2 tela); "Negócio criado" com origem e etapa (T1 motor, T2 tela); Hora e Data (T3 motor, T4 tela); seletor da Clint com busca e categorias (T4); "Horário de atendimento" como Em breve (T4, decisão 6); MCP descreve as opções (T3 passo 8); publicação (T5).
- **Nomes conferidos entre tarefas:** `gatilhoCasaComAConfig`, `ehGatilhoDeTag`, `tagsDoGatilho` (T1 → T2); `CAMPO_HORA`, `CAMPO_DATA`, `OperadorDeHorario`, `ehCampoDeHorario`, `lerValorDaHora`, `lerValorDaData`, `rotuloDoFuso` (T3 → T4); `TelaDoGatilho.criado`, `TelaDoGatilho.tags` (T2); `EscolhaDaCondicao`, `montarValorDoHorario`, `estadoDoEditorDeHorario`, `resumoDoHorario`, `textoDoResumoDoHorario` (T4).
- **Riscos conhecidos:** (a) papéis ARIA de `SeletorDaCasca` desligado e de `SeletorMultiploDaCasca` (caixinhas) nos testes — ajustar a consulta, nunca o comportamento; (b) o guarda de i18n de chave de runtime; (c) o designer antigo com uma linha de horário (só mostra).
