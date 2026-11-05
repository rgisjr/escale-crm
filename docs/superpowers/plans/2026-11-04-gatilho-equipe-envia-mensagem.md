# Gatilho "Equipe envia uma mensagem" (paridade Datacrazy) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (decisão do usuário, 18/10: inline, nunca subagent-driven) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar ao editor de automações (modo fluxo da casca) o gatilho "Equipe envia uma mensagem", com número monitorado, filtro de palavras (vazio = qualquer mensagem), mensagens em grupo e mensagens agendadas, como o gatilho "Mensagem enviada" do Datacrazy.

**Architecture:** o motor já tem o evento `message.sent` com uma palavra-chave só (`{palavra_chave, modo, channel_session_id}`). Um módulo puro novo, `lib/automation/mensagem-enviada.ts`, passa a ser a fonte única da configuração desse gatilho: lê o formato novo (`{channel_session_id, filtro, em_grupos, agendadas}`), converte o antigo, valida e decide se a mensagem casa. O filtro reusa o formato e o casamento do filtro de palavras dos gatilhos de direct (Fase 10D). O motor e o schema da API passam a chamar esse módulo. A tela segue o molde dos gatilhos de direct: a configuração inteira mora em `tela.configPropria`.

**Tech Stack:** Next.js 16 + React 19 + TypeScript, Zod, Vitest + Testing Library, `corepack pnpm`.

## Global Constraints

- REGRA PÉTREA: este plano só se executa depois do "pode fazer" do usuário. As decisões D1–D8 abaixo estão pendentes de confirmação.
- **Sem migration.** `trigger_config` é `jsonb`; nada no banco muda. Por isso **não** roda `test:db`.
- **Compatibilidade:** regra gravada no formato antigo (`palavra_chave`) continua disparando igual, inclusive a do ONPLAY e as criadas pela API, pelo MCP e pelo editor em formulário (`RuleEditor.tsx`). Nenhum chamador antigo muda.
- **Anti-laço:** só dispara mensagem com `sent_via` em `user` ou `external_device` (`lib/automation/palavra-chave.ts`). Não muda.
- **Textos:** todo texto de tela passa por `t()` e ganha entrada `es` em `lib/i18n/dicionario.ts`. Datas e números no formato BR (não se aplica aqui).
- **Testes (decisão do usuário, 03/11):** nunca a suíte inteira. Só os arquivos de teste listados em cada tarefa, mais `eslint` dos arquivos alterados e um `typecheck` (em segundo plano, `NODE_OPTIONS=--max-old-space-size=8192`). Erro de typecheck já conhecido e alheio: `tests/unit/escale-fila-da-casca.test.tsx(67)`.
- **Cópia do Datacrazy:** a Clint não tem esse gatilho. O visual segue o molde da casca (o painel dos gatilhos de direct). Textos são nossos.
- Commits em português, conventional commits, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisões (D1–D8) — escolhi o padrão; o usuário confirma antes da execução

Referência: captura do Datacrazy "Mensagem enviada" enviada pelo usuário em 04/11.

| # | Campo do Datacrazy | Decisão neste plano |
|---|---|---|
| D1 | Palavras em branco iniciam com qualquer mensagem enviada | **Entra**, como botão "Qualquer mensagem" (o mesmo do direct), com aviso de que a automação roda a cada mensagem da equipe. |
| D2 | Tipo da comparação (um só) + palavras em chips | **Troca pelo filtro da casca** (Fase 10D): cada linha tem o operador (É, Contém, Contém palavra inteira, Começa com, Termina com, Não contém) e "Qualquer palavra / Todas as palavras". Cobre tudo o que o Datacrazy faz e é o componente que a casca já usa. Limite de 200 caracteres por linha (frase de atendente é longa; no direct são 60). |
| D3 | Instância que monitora | **Entra**, com a opção "Qualquer número" além dos números conectados. O Datacrazy obriga escolher; aqui o padrão é qualquer número. |
| D4 | Monitorar mensagens enviadas em grupos (desligado) | **Entra, desligado por padrão, também para as regras antigas.** Muda um comportamento: hoje a regra dispara em mensagem enviada em grupo. Com isso, deixa de disparar até a pessoa ligar a opção. |
| D5 | Considerar mensagens agendadas (ligado) | **Entra, ligado por padrão** (é o comportamento de hoje). Para distinguir, o envio agendado passa a gravar `metadata.agendamento_id` na mensagem. |
| D6 | Iniciar quando a mensagem é uma anotação interna | **Fica de fora.** Aqui a nota interna é outra tabela (`conversation_notes`), não é mensagem e não emite evento para o motor. Exigiria um evento novo e mexer no casamento de regras. Pode virar outro plano. |
| D7 | Condições para iniciar uma nova sessão ("Iniciar sempre") | **Fica de fora.** O motor já inicia sempre. Sem a lista de opções do Datacrazy não há o que copiar; se quiser, mande a captura do menu aberto. |
| D8 | Receber fonte de dados do provedor / vários gatilhos na mesma automação (Message-1, Message-2) | **Fica de fora.** Aqui é um gatilho por automação. |

## Mapa de arquivos

| Arquivo | O quê |
|---|---|
| `lib/automation/mensagem-enviada.ts` (novo) | Schemas (novo e antigo), leitura, problemas, casamento, resumo, configuração inicial, constante do evento. |
| `lib/automation/mensagem-enviada.test.ts` (novo) | Testes puros do módulo. |
| `lib/schemas/webhooks.ts` | `configDaPalavraChaveSchema` vira reexportação; `exigirPalavraChave` usa `problemasDaMensagemEnviada`. |
| `lib/automation/engine.ts` | Lê `metadata` e `is_group` da conversa; troca o casamento local pelo do módulo. |
| `lib/automation/mensagem-enviada-no-motor.test.ts` | Casos novos: grupo, agendada, qualquer mensagem, várias palavras. |
| `lib/escale/conversas/envio-agendado.ts` | Envia `metadata: { agendamento_id }`. |
| `tests/unit/escale-mensagens-agendadas-rotas.test.ts` | Ajusta as duas asserções exatas do input do envio. |
| `lib/escale/automacoes/fluxo/gatilhos.ts` | Item novo no catálogo de Mensagens + formulário. |
| `lib/escale/comentarios/tela.ts` | `telaInicialDoGatilho` e `comConfigPropria` conhecem `message.sent`. |
| `components/escale/automacoes/fluxo/comentario/FiltroDePalavras.tsx` | Prop opcional `maximo`. |
| `components/escale/automacoes/fluxo/painel/FormularioDaMensagemEnviada.tsx` (novo) | O painel do gatilho. |
| `components/escale/automacoes/fluxo/painel/PainelDoGatilho.tsx` | Ramo para o formulário novo. |
| `components/escale/automacoes/fluxo/CorposDoNo.tsx` | Chip do nó com o resumo. |
| `lib/i18n/dicionario.ts` | Frases novas em espanhol. |
| `tests/unit/escale-fluxo-regras.test.ts`, `tests/unit/escale-comentarios-tela.test.ts` | Catálogo completo e configPropria. |
| `tests/unit/escale-formulario-mensagem-enviada.test.tsx` (novo) | Teste do painel. |
| `.changes/automacoes-gatilho-equipe-envia-mensagem.md` (novo) | Nota de versão. |

---

### Task 0: Preparar o ambiente

**Files:** nenhum arquivo de código.

- [ ] **Step 1: Descartar o protótipo de 04/11 em `wt-5d-tela`** (só com o OK do usuário; são 7 arquivos alterados por mim e não commitados, numa branch já mergeada):

```bash
cd "C:/Documentos/projetos claude/Deskcom CRM/wt-5d-tela"
git status --short   # esperado: exatamente os 7 abaixo
git checkout -- components/escale/automacoes/fluxo/CorposDoNo.tsx components/escale/automacoes/fluxo/painel/FormularioDoGatilho.tsx lib/automation/desenho-da-regra.test.ts lib/automation/desenho-da-regra.ts lib/escale/automacoes/fluxo/gatilhos.ts lib/i18n/dicionario.ts tests/unit/escale-fluxo-regras.test.ts
git status --short   # esperado: vazio
```

- [ ] **Step 2: Worktree nova a partir da `main` do fork**

```bash
cd "C:/Documentos/projetos claude/Deskcom CRM/repo"
git fetch escale-crm
git worktree add ../wt-gatilho-enviada -b feat/gatilho-equipe-envia-mensagem escale-crm/main
cd ../wt-gatilho-enviada
corepack pnpm install --frozen-lockfile
```

Expected: install termina sem erro. Todos os caminhos daqui para baixo são relativos a `wt-gatilho-enviada`.

---

### Task 1: O módulo puro do gatilho

**Files:**
- Create: `lib/automation/mensagem-enviada.ts`
- Create: `lib/automation/mensagem-enviada.test.ts`
- Modify: `lib/schemas/webhooks.ts:616-635` (o schema antigo e `exigirPalavraChave`)

**Interfaces:**
- Produces:
  - `GATILHO_DE_MENSAGEM_ENVIADA = "message.sent"`
  - `MAXIMO_DA_PALAVRA_ENVIADA = 200`
  - `configDaPalavraChaveSchema` (formato antigo, mesmo de hoje)
  - `configDaMensagemEnviadaSchema`, `type ConfigDaMensagemEnviada`
  - `configInicialDaMensagemEnviada(): ConfigDaMensagemEnviada`
  - `lerConfigDaMensagemEnviada(config: unknown): ConfigDaMensagemEnviada | null`
  - `problemasDaMensagemEnviada(config: unknown): string[]`
  - `interface MensagemParaOGatilho { body; sent_via; channel_session_id; metadata }`
  - `CHAVE_DO_AGENDAMENTO = "agendamento_id"`, `veioDeAgendamento(metadata): boolean`
  - `mensagemEnviadaCasa(config: unknown, msg: MensagemParaOGatilho | undefined, ehGrupo: boolean, statusDoEvento: unknown): boolean`
  - `resumoDaMensagemEnviada(config: unknown, t: (s: string) => string): string`

- [ ] **Step 1: Escrever o teste que falha** — `lib/automation/mensagem-enviada.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  configDaMensagemEnviadaSchema,
  configInicialDaMensagemEnviada,
  lerConfigDaMensagemEnviada,
  mensagemEnviadaCasa,
  problemasDaMensagemEnviada,
  resumoDaMensagemEnviada,
  veioDeAgendamento,
  type MensagemParaOGatilho,
} from "@/lib/automation/mensagem-enviada";

const CANAL_A = "44444444-4444-4444-8444-444444444444";
const CANAL_B = "55555555-5555-4555-8555-555555555555";
const FRASE = "Põe estes dados, acessa o aplicativo e pode testar!";
const msg = (parte: Partial<MensagemParaOGatilho> = {}): MensagemParaOGatilho => ({
  body: FRASE,
  sent_via: "user",
  channel_session_id: CANAL_A,
  metadata: {},
  ...parte,
});
const palavras = (...valores: string[]) => ({
  channel_session_id: "",
  filtro: { modo: "palavras" as const, condicoes: valores.map((valor) => ({ operador: "contem" as const, valor })), combinar: "qualquer" as const },
  em_grupos: false,
  agendadas: true,
});

describe("lerConfigDaMensagemEnviada", () => {
  it("o formato antigo vira uma condição, sem grupo e com agendadas", () => {
    expect(lerConfigDaMensagemEnviada({ palavra_chave: "Põe estes dados", modo: "igual", channel_session_id: CANAL_A })).toEqual({
      channel_session_id: CANAL_A,
      filtro: { modo: "palavras", condicoes: [{ operador: "igual", valor: "Põe estes dados" }], combinar: "qualquer" },
      em_grupos: false,
      agendadas: true,
    });
    expect(lerConfigDaMensagemEnviada({ palavra_chave: "oi" })?.filtro).toEqual({
      modo: "palavras",
      condicoes: [{ operador: "contem", valor: "oi" }],
      combinar: "qualquer",
    });
  });
  it("o formato novo volta com os padrões", () => {
    expect(lerConfigDaMensagemEnviada({ filtro: { modo: "qualquer" } })).toEqual({
      channel_session_id: "",
      filtro: { modo: "qualquer" },
      em_grupos: false,
      agendadas: true,
    });
  });
  it("nada reconhecível → null", () => {
    expect(lerConfigDaMensagemEnviada({})).toBeNull();
    expect(lerConfigDaMensagemEnviada(null)).toBeNull();
    expect(lerConfigDaMensagemEnviada({ filtro: { modo: "x" } })).toBeNull();
  });
  it("a configuração inicial passa no schema", () => {
    expect(configDaMensagemEnviadaSchema.safeParse(configInicialDaMensagemEnviada()).success).toBe(true);
  });
});

describe("problemasDaMensagemEnviada", () => {
  it("config vazia pede a palavra-chave (a frase de hoje)", () => {
    expect(problemasDaMensagemEnviada({})).toEqual(["Informe a palavra-chave (palavra_chave) da mensagem enviada."]);
  });
  it("filtro de palavras sem palavra positiva é recusado", () => {
    expect(problemasDaMensagemEnviada(configInicialDaMensagemEnviada())).toEqual([
      'Preencha a palavra do filtro ou use "Qualquer mensagem".',
    ]);
    expect(
      problemasDaMensagemEnviada({ ...palavras(), filtro: { modo: "palavras", condicoes: [{ operador: "nao_contem", valor: "x" }], combinar: "qualquer" } }),
    ).toHaveLength(1);
  });
  it("qualquer mensagem, formato antigo e palavras preenchidas passam", () => {
    expect(problemasDaMensagemEnviada({ filtro: { modo: "qualquer" } })).toEqual([]);
    expect(problemasDaMensagemEnviada({ palavra_chave: "oi" })).toEqual([]);
    expect(problemasDaMensagemEnviada(palavras("oi"))).toEqual([]);
  });
});

describe("mensagemEnviadaCasa", () => {
  it("formato antigo: mesma resposta de hoje", () => {
    const antigo = { palavra_chave: "põe estes dados", modo: "contem" };
    expect(mensagemEnviadaCasa(antigo, msg(), false, "sent")).toBe(true);
    expect(mensagemEnviadaCasa({ palavra_chave: "Põe estes dados", modo: "igual" }, msg(), false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa(antigo, msg({ sent_via: "automation" }), false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa(antigo, msg({ sent_via: "ai" }), false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa(antigo, msg({ sent_via: "external_device" }), false, "sent")).toBe(true);
    expect(mensagemEnviadaCasa(antigo, msg(), false, "failed")).toBe(false);
    expect(mensagemEnviadaCasa({}, msg(), false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa(antigo, undefined, false, "sent")).toBe(false);
  });
  it("número: vazio é qualquer; preso a outro número não casa", () => {
    expect(mensagemEnviadaCasa(palavras("dados"), msg({ channel_session_id: CANAL_B }), false, "sent")).toBe(true);
    expect(mensagemEnviadaCasa({ ...palavras("dados"), channel_session_id: CANAL_B }, msg(), false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa({ ...palavras("dados"), channel_session_id: CANAL_A }, msg(), false, "sent")).toBe(true);
  });
  it("várias palavras: qualquer uma basta; todas exige todas", () => {
    expect(mensagemEnviadaCasa(palavras("boleto", "aplicativo"), msg(), false, "sent")).toBe(true);
    const todas = { ...palavras("boleto", "aplicativo"), filtro: { ...palavras("boleto", "aplicativo").filtro, combinar: "todas" as const } };
    expect(mensagemEnviadaCasa(todas, msg(), false, "sent")).toBe(false);
  });
  it("qualquer mensagem casa até sem texto (áudio)", () => {
    const qualquer = { ...palavras(), filtro: { modo: "qualquer" as const } };
    expect(mensagemEnviadaCasa(qualquer, msg({ body: null }), false, "sent")).toBe(true);
    expect(mensagemEnviadaCasa(qualquer, msg({ sent_via: "automation" }), false, "sent")).toBe(false);
  });
  it("grupo só com em_grupos; vale também para o formato antigo", () => {
    expect(mensagemEnviadaCasa(palavras("dados"), msg(), true, "sent")).toBe(false);
    expect(mensagemEnviadaCasa({ ...palavras("dados"), em_grupos: true }, msg(), true, "sent")).toBe(true);
    expect(mensagemEnviadaCasa({ palavra_chave: "dados" }, msg(), true, "sent")).toBe(false);
  });
  it("agendada só quando agendadas está ligado", () => {
    const agendada = msg({ metadata: { agendamento_id: "a1" } });
    expect(mensagemEnviadaCasa(palavras("dados"), agendada, false, "sent")).toBe(true);
    expect(mensagemEnviadaCasa({ ...palavras("dados"), agendadas: false }, agendada, false, "sent")).toBe(false);
    expect(mensagemEnviadaCasa({ ...palavras("dados"), agendadas: false }, msg(), false, "sent")).toBe(true);
  });
});

describe("veioDeAgendamento", () => {
  it("só com o id do agendamento em texto", () => {
    expect(veioDeAgendamento({ agendamento_id: "a1" })).toBe(true);
    expect(veioDeAgendamento({ agendamento_id: 1 })).toBe(false);
    expect(veioDeAgendamento(null)).toBe(false);
  });
});

describe("resumoDaMensagemEnviada", () => {
  const t = (s: string) => s;
  it("resume o filtro para o chip do nó", () => {
    expect(resumoDaMensagemEnviada({ palavra_chave: "Põe estes dados" }, t)).toBe("Contém “Põe estes dados”");
    expect(resumoDaMensagemEnviada({ filtro: { modo: "qualquer" } }, t)).toBe("Qualquer mensagem");
    expect(resumoDaMensagemEnviada(palavras("a", "b"), t)).toBe("Contém “a” · Contém “b”");
    expect(resumoDaMensagemEnviada(configInicialDaMensagemEnviada(), t)).toBe("Escolha a palavra-chave");
    expect(resumoDaMensagemEnviada(undefined, t)).toBe("Escolha a palavra-chave");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run lib/automation/mensagem-enviada.test.ts`
Expected: FAIL, "Failed to resolve import @/lib/automation/mensagem-enviada".

- [ ] **Step 3: Implementar** — `lib/automation/mensagem-enviada.ts`:

```ts
import { z } from "zod";

import { foiEnviadaPorPessoa } from "@/lib/automation/palavra-chave";
import { MAXIMO_DE_PALAVRAS, OPERADORES_DO_FILTRO, ROTULO_DO_OPERADOR } from "@/lib/escale/comentarios/constantes";
import { casaComFiltro, lerFiltro } from "@/lib/escale/comentarios/filtro";

/**
 * FORK ESCALE · automações: o gatilho "Equipe envia uma mensagem" (`message.sent`), à moda do
 * "Mensagem enviada" do Datacrazy. Fonte única da configuração: o motor, o schema da API e a tela
 * leem por aqui. Não importa `lib/schemas/webhooks.ts` (é ele quem importa este arquivo).
 */
export const GATILHO_DE_MENSAGEM_ENVIADA = "message.sent";
/** Frase de atendente é longa; no filtro do direct são 60. */
export const MAXIMO_DA_PALAVRA_ENVIADA = 200;
/** A chave que o envio agendado grava em `messages.metadata` (`lib/escale/conversas/envio-agendado.ts`). */
export const CHAVE_DO_AGENDAMENTO = "agendamento_id";

/** O formato antigo (paridade Datacrazy, fase 3): uma palavra só. A API, o MCP e o editor em formulário gravam assim. */
export const configDaPalavraChaveSchema = z.object({
  palavra_chave: z.string().trim().min(1).max(200),
  modo: z.enum(["contem", "igual"]).default("contem"),
  channel_session_id: z.string().uuid().optional(),
});

const condicaoSchema = z.object({
  operador: z.enum(OPERADORES_DO_FILTRO),
  /** Vazio é aceito (a linha recém-adicionada na tela); `problemasDaMensagemEnviada` recusa salvar sem palavra. */
  valor: z.string().max(MAXIMO_DA_PALAVRA_ENVIADA),
});
/** Mesma forma do filtro dos gatilhos de direct (`lib/escale/comentarios/schema.ts`), com palavra maior. */
const filtroSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("qualquer") }),
  z.object({
    modo: z.literal("palavras"),
    palavras: z.array(z.string().trim().min(1).max(MAXIMO_DA_PALAVRA_ENVIADA)).max(MAXIMO_DE_PALAVRAS).optional(),
    condicoes: z.array(condicaoSchema).max(MAXIMO_DE_PALAVRAS).optional(),
    combinar: z.enum(["qualquer", "todas"]),
  }),
]);

export const configDaMensagemEnviadaSchema = z.object({
  /** "" = qualquer número. */
  channel_session_id: z.union([z.literal(""), z.string().uuid()]).default(""),
  filtro: filtroSchema,
  /** Mensagem enviada em conversa de grupo. Desligado, como no Datacrazy. */
  em_grupos: z.boolean().default(false),
  /** Mensagem que saiu de um agendamento. Ligado (é o comportamento de antes). */
  agendadas: z.boolean().default(true),
});
export type ConfigDaMensagemEnviada = z.infer<typeof configDaMensagemEnviadaSchema>;

export function configInicialDaMensagemEnviada(): ConfigDaMensagemEnviada {
  return {
    channel_session_id: "",
    filtro: { modo: "palavras", condicoes: [{ operador: "contem", valor: "" }], combinar: "qualquer" },
    em_grupos: false,
    agendadas: true,
  };
}

/** O formato novo; o antigo vira uma condição. Nada reconhecível → null (a regra nunca dispara). */
export function lerConfigDaMensagemEnviada(config: unknown): ConfigDaMensagemEnviada | null {
  const nova = configDaMensagemEnviadaSchema.safeParse(config);
  if (nova.success) return nova.data;
  const antiga = configDaPalavraChaveSchema.safeParse(config);
  if (!antiga.success) return null;
  return {
    channel_session_id: antiga.data.channel_session_id ?? "",
    filtro: {
      modo: "palavras",
      condicoes: [{ operador: antiga.data.modo === "igual" ? "igual" : "contem", valor: antiga.data.palavra_chave }],
      combinar: "qualquer",
    },
    em_grupos: false,
    agendadas: true,
  };
}

/** O que impede salvar. Sem palavra a regra dispararia sempre; para isso existe "Qualquer mensagem". */
export function problemasDaMensagemEnviada(config: unknown): string[] {
  const lida = lerConfigDaMensagemEnviada(config);
  if (!lida) return ["Informe a palavra-chave (palavra_chave) da mensagem enviada."];
  const filtro = lerFiltro(lida.filtro);
  if (filtro.modo === "palavras" && !filtro.condicoes.some((c) => c.operador !== "nao_contem")) {
    return ['Preencha a palavra do filtro ou use "Qualquer mensagem".'];
  }
  return [];
}

export interface MensagemParaOGatilho {
  body: string | null;
  sent_via: string | null;
  channel_session_id: string | null;
  metadata: Record<string, unknown> | null;
}

export function veioDeAgendamento(metadata: Record<string, unknown> | null | undefined): boolean {
  return typeof metadata?.[CHAVE_DO_AGENDAMENTO] === "string";
}

/**
 * Só mensagem que uma PESSOA enviou (anti-laço), que não falhou, do número escolhido, fora de grupo
 * (a menos que a regra peça), agendada só se a regra aceitar, e que passa no filtro.
 */
export function mensagemEnviadaCasa(
  config: unknown,
  msg: MensagemParaOGatilho | undefined,
  ehGrupo: boolean,
  statusDoEvento: unknown,
): boolean {
  const cfg = lerConfigDaMensagemEnviada(config);
  if (!cfg || !msg || statusDoEvento === "failed") return false;
  if (!foiEnviadaPorPessoa(msg.sent_via)) return false;
  if (cfg.channel_session_id && cfg.channel_session_id !== msg.channel_session_id) return false;
  if (ehGrupo && !cfg.em_grupos) return false;
  if (!cfg.agendadas && veioDeAgendamento(msg.metadata)) return false;
  return casaComFiltro(msg.body ?? "", cfg.filtro);
}

/** O chip do nó: "Contém “x” · É “y”", "Qualquer mensagem" ou o pedido da palavra. */
export function resumoDaMensagemEnviada(config: unknown, t: (s: string) => string): string {
  const lida = lerConfigDaMensagemEnviada(config);
  if (!lida) return t("Escolha a palavra-chave");
  const filtro = lerFiltro(lida.filtro);
  if (filtro.modo === "qualquer") return t("Qualquer mensagem");
  if (filtro.condicoes.length === 0) return t("Escolha a palavra-chave");
  return filtro.condicoes.map((c) => `${t(ROTULO_DO_OPERADOR[c.operador])} “${c.valor}”`).join(" · ");
}
```

- [ ] **Step 4: Ligar o schema da API ao módulo** — em `lib/schemas/webhooks.ts`, trocar o bloco das linhas 616–635 (o `configDaPalavraChaveSchema` e o `exigirPalavraChave`) por:

```ts
/** A configuração do gatilho de mensagem enviada mora em `lib/automation/mensagem-enviada.ts`; o editor em formulário lê daqui. */
export { configDaPalavraChaveSchema } from "@/lib/automation/mensagem-enviada";

/** Sem palavra a regra dispararia em TODA mensagem da equipe: recusa (para isso existe "Qualquer mensagem"). */
function exigirPalavraChave(
  regra: { trigger_event: string; trigger_config?: Record<string, unknown> },
  ctx: z.RefinementCtx,
): void {
  if (regra.trigger_event !== GATILHO_DE_MENSAGEM_ENVIADA) return;
  for (const message of problemasDaMensagemEnviada(regra.trigger_config)) {
    ctx.addIssue({ code: "custom", path: ["trigger_config"], message });
  }
}
```

e, no topo do arquivo, junto dos outros imports:

```ts
import { GATILHO_DE_MENSAGEM_ENVIADA, problemasDaMensagemEnviada } from "@/lib/automation/mensagem-enviada";
```

Conferir com `grep -n "configDaPalavraChaveSchema" lib/schemas/webhooks.ts` que não sobrou outro uso local do nome (se sobrar, importar também no import acima).

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run lib/automation/mensagem-enviada.test.ts tests/unit/paridade-datacrazy-contrato.test.ts`
Expected: PASS nos dois (o contrato prova que o formato antigo e o `{}` recusado continuam iguais).

- [ ] **Step 6: Commit**

```bash
git add lib/automation/mensagem-enviada.ts lib/automation/mensagem-enviada.test.ts lib/schemas/webhooks.ts
git commit -m "feat(automacoes): configuração do gatilho de mensagem enviada com filtro, grupo e agendadas"
```

---

### Task 2: O motor usa o módulo (grupo e agendada)

**Files:**
- Modify: `lib/automation/engine.ts:160-174` (contexto de `message.sent`), `:300-318` (função local), `:419` (chamada), `:38` (import)
- Test: `lib/automation/mensagem-enviada-no-motor.test.ts`

**Interfaces:**
- Consumes: `mensagemEnviadaCasa`, `MensagemParaOGatilho` (Task 1)
- Produces: `context.message` passa a trazer `metadata`; `context.message_is_group: boolean`

- [ ] **Step 1: Escrever os testes que falham** — no fim do `describe` de `lib/automation/mensagem-enviada-no-motor.test.ts`, antes do `});` final, acrescentar:

```ts
  it("7. mensagem em conversa de grupo não roda, a menos que a regra peça", async () => {
    const comGrupo = (config: Record<string, unknown>) =>
      bancoFalso({
        messages: [
          { id: MSG, organization_id: ORG, body: FRASE, sent_via: "user", direction: "outbound", channel_session_id: CANAL_A, conversation_id: "c1", contact_id: CONTATO, metadata: {} },
        ],
        conversations: [{ id: "c1", organization_id: ORG, is_group: true }],
        contacts: [{ id: CONTATO, organization_id: ORG, name: "Grupo", is_personal: false }],
        automation_rules: [regra(REGRA, config)],
      });
    expect(await rodou(comGrupo({ palavra_chave: "Põe estes dados", modo: "contem" }))).toBe(false);
    expect(
      await rodou(
        comGrupo({
          channel_session_id: "",
          filtro: { modo: "palavras", condicoes: [{ operador: "contem", valor: "Põe estes dados" }], combinar: "qualquer" },
          em_grupos: true,
          agendadas: true,
        }),
      ),
    ).toBe(true);
  });
  it("8. mensagem agendada não roda quando a regra desliga agendadas", async () => {
    const config = {
      channel_session_id: "",
      filtro: { modo: "palavras", condicoes: [{ operador: "contem", valor: "Põe estes dados" }], combinar: "qualquer" },
      em_grupos: false,
      agendadas: false,
    };
    expect(await rodou(mundo({ metadata: { agendamento_id: "a1" } }, config))).toBe(false);
    expect(await rodou(mundo({ metadata: {} }, config))).toBe(true);
  });
  it("9. qualquer mensagem roda com texto qualquer, mas nunca para a automação", async () => {
    const config = { channel_session_id: "", filtro: { modo: "qualquer" }, em_grupos: false, agendadas: true };
    expect(await rodou(mundo({ body: "Bom dia" }, config))).toBe(true);
    expect(await rodou(mundo({ body: "Bom dia", sent_via: "automation" }, config))).toBe(false);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run lib/automation/mensagem-enviada-no-motor.test.ts`
Expected: FAIL nos casos 7 (grupo roda hoje), 8 e 9 (o motor ainda lê só `palavra_chave`).

- [ ] **Step 3: Implementar** — em `lib/automation/engine.ts`:

(a) trocar o import da linha 38:

```ts
import { mensagemEnviadaCasa, type MensagemParaOGatilho } from "@/lib/automation/mensagem-enviada";
```

(b) no bloco de `message.sent` do contexto (linhas 163–174), trocar por:

```ts
    if (row.event_type === "message.sent") {
      const { data: mensagem } = await admin
        .from("messages")
        .select("id, body, sent_via, sent_by_user_id, direction, channel_session_id, conversation_id, contact_id, metadata")
        .eq("id", row.entity_id)
        .eq("organization_id", org)
        .maybeSingle();
      if (mensagem) {
        context.message = mensagem;
        contactId = contactId ?? (mensagem.contact_id as string | undefined);
        // FORK ESCALE · automações: a regra decide se mensagem em grupo conta (padrão: não, como no Datacrazy).
        if (mensagem.conversation_id) {
          const { data: conversa } = await admin
            .from("conversations")
            .select("is_group")
            .eq("id", mensagem.conversation_id)
            .eq("organization_id", org)
            .maybeSingle();
          context.message_is_group = (conversa as { is_group?: boolean | null } | null)?.is_group === true;
        }
      }
    }
```

(c) apagar a função local `mensagemEnviadaCasa` (o bloco de comentário e a função, linhas 300–318).

(d) trocar a linha 419 por:

```ts
    if (
      row.event_type === "message.sent" &&
      !mensagemEnviadaCasa(
        rule.trigger_config,
        context.message as MensagemParaOGatilho | undefined,
        context.message_is_group === true,
        row.payload?.status,
      )
    ) {
      return false;
    }
```

(e) conferir que `configDaPalavraChaveSchema`, `casaComPalavraChave` e `foiEnviadaPorPessoa` não têm mais uso em `engine.ts` (`grep -n "PalavraChave\|foiEnviadaPorPessoa" lib/automation/engine.ts` vazio) e remover do import o que sobrar.

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run lib/automation/mensagem-enviada-no-motor.test.ts lib/automation/palavra-chave.test.ts`
Expected: PASS (os casos 1–6 antigos e os novos 7–9).

- [ ] **Step 5: Commit**

```bash
git add lib/automation/engine.ts lib/automation/mensagem-enviada-no-motor.test.ts
git commit -m "feat(automacoes): motor do gatilho de mensagem enviada respeita grupo, agendada e qualquer mensagem"
```

---

### Task 3: O envio agendado se identifica na mensagem

**Files:**
- Modify: `lib/escale/conversas/envio-agendado.ts:42-51`
- Test: `tests/unit/escale-mensagens-agendadas-rotas.test.ts:285` e `:310-316`

**Interfaces:**
- Consumes: `CHAVE_DO_AGENDAMENTO` (Task 1)
- Produces: toda mensagem enviada por agendamento tem `messages.metadata.agendamento_id = <id da linha de crm_mensagens_agendadas>`

- [ ] **Step 1: Ajustar o teste para o comportamento novo (falha primeiro)** — em `tests/unit/escale-mensagens-agendadas-rotas.test.ts`:

linha 285, trocar `{ conversation_id: CV, type: "text", body: "Oi" },` por:

```ts
      { conversation_id: CV, type: "text", body: "Oi", metadata: { agendamento_id: "a1" } },
```

linhas 310–316, trocar o objeto esperado por:

```ts
    expect(vi.mocked(sendMessageHandler).mock.calls.at(-1)?.[2]).toEqual({
      conversation_id: CV,
      type: "template",
      template_name: "oi",
      template_language: "pt_BR",
      template_values: { "body:1": "Ana" },
      metadata: { agendamento_id: "a1" },
    });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-mensagens-agendadas-rotas.test.ts`
Expected: FAIL no caso "envia texto dentro da janela…" (falta `metadata`).

- [ ] **Step 3: Implementar** — em `lib/escale/conversas/envio-agendado.ts`, acrescentar o import

```ts
import { CHAVE_DO_AGENDAMENTO } from "@/lib/automation/mensagem-enviada";
```

e trocar a montagem do `input` (linhas 42–51) por:

```ts
  // FORK ESCALE · automações: a mensagem leva o agendamento que a enviou; o gatilho
  // "Equipe envia uma mensagem" usa para respeitar "Considerar mensagens agendadas".
  const metadata = { [CHAVE_DO_AGENDAMENTO]: linha.id };
  const input =
    linha.tipo === "template" && linha.template
      ? {
          conversation_id: linha.conversation_id,
          type: "template" as const,
          template_name: linha.template.name,
          template_language: linha.template.language,
          template_values: linha.template.values,
          metadata,
        }
      : { conversation_id: linha.conversation_id, type: "text" as const, body: linha.corpo ?? "", metadata };
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-mensagens-agendadas-rotas.test.ts tests/unit/q6-cron-mensagens-agendadas-presas.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/escale/conversas/envio-agendado.ts tests/unit/escale-mensagens-agendadas-rotas.test.ts
git commit -m "feat(conversas): mensagem agendada grava o id do agendamento na mensagem"
```

---

### Task 4: A tela do gatilho

**Files:**
- Modify: `lib/escale/automacoes/fluxo/gatilhos.ts:76-78` (catálogo) e `:116-127` (`COM_FORMULARIO`)
- Modify: `lib/escale/comentarios/tela.ts:79-107`
- Modify: `components/escale/automacoes/fluxo/comentario/FiltroDePalavras.tsx:22-28` e `:56`
- Create: `components/escale/automacoes/fluxo/painel/FormularioDaMensagemEnviada.tsx`
- Modify: `components/escale/automacoes/fluxo/painel/PainelDoGatilho.tsx:117-131`
- Modify: `components/escale/automacoes/fluxo/CorposDoNo.tsx` (`useDetalheDoGatilho`, depois da linha do `ehGatilhoDeTag`)
- Modify: `lib/i18n/dicionario.ts` (perto de `"Mensagem não entregue"`)
- Test: `tests/unit/escale-fluxo-regras.test.ts:81-111`, `tests/unit/escale-comentarios-tela.test.ts`, Create `tests/unit/escale-formulario-mensagem-enviada.test.tsx`

**Interfaces:**
- Consumes: `GATILHO_DE_MENSAGEM_ENVIADA`, `ConfigDaMensagemEnviada`, `configInicialDaMensagemEnviada`, `lerConfigDaMensagemEnviada`, `resumoDaMensagemEnviada`, `MAXIMO_DA_PALAVRA_ENVIADA` (Task 1)
- Produces: `FormularioDaMensagemEnviada({ config, aoMudar })`; `FiltroDePalavras` aceita `maximo?: number`

- [ ] **Step 1: Escrever os testes que falham**

(a) `tests/unit/escale-fluxo-regras.test.ts`, no teste "cada TRIGGER_EVENT aparece uma vez", trocar as linhas 83–86 por:

```ts
    expect([...eventos].sort()).toEqual([...TRIGGER_EVENTS].sort());
```

e, na lista `comFormulario` (linhas 99–110), acrescentar `"message.sent",` depois de `"lead.tag_added",`.

(b) `tests/unit/escale-comentarios-tela.test.ts`, acrescentar no fim do arquivo:

```ts
describe("FORK ESCALE · gatilho Equipe envia uma mensagem", () => {
  it("nasce com a configuração inicial", () => {
    expect(telaInicialDoGatilho("message.sent").configPropria).toEqual(configInicialDaMensagemEnviada());
  });
  it("regra antiga abre convertida e salva sem mexer no formato novo, que o motor lê igual", () => {
    const regra: RegraGravada = {
      trigger_event: "message.sent",
      trigger_config: { palavra_chave: "Põe estes dados", modo: "contem" },
      conditions: [],
      actions: [],
    };
    const novo = comConfigPropria(desenhoDaRegra(regra), regra);
    const gatilho = novo.caixas.find((c) => c.id === "gatilho");
    const config = gatilho?.data.kind === "gatilho" ? triggerConfigDaTela("message.sent", gatilho.data.tela, regra) : null;
    expect(config).toEqual({
      channel_session_id: "",
      filtro: { modo: "palavras", condicoes: [{ operador: "contem", valor: "Põe estes dados" }], combinar: "qualquer" },
      em_grupos: false,
      agendadas: true,
    });
  });
});
```

e, no import do topo, acrescentar:

```ts
import { configInicialDaMensagemEnviada } from "@/lib/automation/mensagem-enviada";
```

(c) Criar `tests/unit/escale-formulario-mensagem-enviada.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  sessoes: [] as Array<{ id: string; display_name: string; phone_number: null; waha_session_name: null; status: string }>,
}));

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: h.sessoes }),
  channelLabel: (s: { display_name: string }) => s.display_name,
}));

import { FormularioDaMensagemEnviada } from "@/components/escale/automacoes/fluxo/painel/FormularioDaMensagemEnviada";
import { TooltipProvider } from "@/components/ui/tooltip";
import { configInicialDaMensagemEnviada, type ConfigDaMensagemEnviada } from "@/lib/automation/mensagem-enviada";

/** O painel do gatilho "Equipe envia uma mensagem" (paridade Datacrazy). */
function Host({ aoMudar }: { aoMudar: (c: ConfigDaMensagemEnviada) => void }) {
  const [config, setConfig] = useState(configInicialDaMensagemEnviada());
  return (
    <FormularioDaMensagemEnviada
      config={config}
      aoMudar={(c) => {
        aoMudar(c);
        setConfig(c);
      }}
    />
  );
}
const montar = () => {
  const aoMudar = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <Host aoMudar={aoMudar} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return aoMudar;
};
const ultima = (m: ReturnType<typeof vi.fn>) => m.mock.calls.at(-1)![0] as ConfigDaMensagemEnviada;

beforeEach(() => {
  h.sessoes = [{ id: "44444444-4444-4444-8444-444444444444", display_name: "joao vendas1", phone_number: null, waha_session_name: null, status: "WORKING" }];
});

describe("FormularioDaMensagemEnviada", () => {
  it("a palavra digitada vai para a condição; aceita frase de mais de 60 caracteres", async () => {
    const user = userEvent.setup();
    const aoMudar = montar();
    const frase = "Logo nosso número do suporte vai te chamar para fazer a instalação, combinado?";
    await user.type(screen.getByLabelText("Palavra do filtro"), frase);
    const filtro = ultima(aoMudar).filtro;
    expect(filtro.modo === "palavras" && filtro.condicoes?.[0]).toEqual({ operador: "contem", valor: frase });
  });
  it("Qualquer mensagem tira o filtro e mostra o aviso", async () => {
    const user = userEvent.setup();
    const aoMudar = montar();
    await user.click(screen.getByRole("button", { name: "Qualquer mensagem" }));
    expect(ultima(aoMudar).filtro).toEqual({ modo: "qualquer" });
    expect(screen.getByRole("note")).toHaveTextContent("a cada mensagem que a equipe enviar");
    expect(screen.queryByLabelText("Palavra do filtro")).toBeNull();
  });
  it("grupos começa desligado e agendadas ligado; marcar muda a configuração", async () => {
    const user = userEvent.setup();
    const aoMudar = montar();
    const grupos = screen.getByRole("checkbox", { name: "Disparar também em mensagens enviadas em grupos" });
    const agendadas = screen.getByRole("checkbox", { name: "Considerar mensagens agendadas" });
    expect(grupos).toHaveAttribute("aria-checked", "false");
    expect(agendadas).toHaveAttribute("aria-checked", "true");
    await user.click(grupos);
    expect(ultima(aoMudar).em_grupos).toBe(true);
    await user.click(agendadas);
    expect(ultima(aoMudar).agendadas).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-fluxo-regras.test.ts tests/unit/escale-comentarios-tela.test.ts tests/unit/escale-formulario-mensagem-enviada.test.tsx`
Expected: FAIL (catálogo sem `message.sent`; `configPropria` indefinida; componente inexistente).

- [ ] **Step 3: Catálogo** — em `lib/escale/automacoes/fluxo/gatilhos.ts`, na fonte `mensagens`, entre "Contato envia uma mensagem" e "Mensagem não entregue":

```ts
      { evento: "message.sent", titulo: "Equipe envia uma mensagem", descricao: "Alguém da equipe envia uma mensagem para o contato", icone: "mensagem" },
```

e em `COM_FORMULARIO`, depois de `"lead.stage_stale",`:

```ts
  "message.sent",
```

- [ ] **Step 4: `configPropria` do gatilho** — em `lib/escale/comentarios/tela.ts`, acrescentar o import

```ts
import {
  GATILHO_DE_MENSAGEM_ENVIADA,
  configInicialDaMensagemEnviada,
  lerConfigDaMensagemEnviada,
} from "@/lib/automation/mensagem-enviada";
```

em `telaInicialDoGatilho`, antes do `return base;`:

```ts
  // FORK ESCALE · automações: "Equipe envia uma mensagem" monta a configuração inteira, como o direct.
  if (evento === GATILHO_DE_MENSAGEM_ENVIADA) return { ...base, configPropria: configInicialDaMensagemEnviada() };
```

e em `comConfigPropria`, antes do `} else {` final:

```ts
  } else if (regra.trigger_event === GATILHO_DE_MENSAGEM_ENVIADA) {
    // A regra antiga (`palavra_chave`) abre convertida; salvar grava o formato novo, que o motor lê igual.
    config = lerConfigDaMensagemEnviada(regra.trigger_config) ?? configInicialDaMensagemEnviada();
```

- [ ] **Step 5: `FiltroDePalavras` com limite configurável** — em `components/escale/automacoes/fluxo/comentario/FiltroDePalavras.tsx`, trocar a assinatura:

```tsx
export function FiltroDePalavras({
  filtro,
  aoMudar,
  maximo = MAXIMO_DA_PALAVRA,
}: {
  filtro: FiltroDoCaminho;
  aoMudar: (filtro: FiltroDoCaminho) => void;
  /** Caracteres por palavra. O direct usa 60; a mensagem enviada pela equipe, 200. */
  maximo?: number;
}) {
```

e na linha do `<input`, trocar `maxLength={MAXIMO_DA_PALAVRA}` por `maxLength={maximo}`.

- [ ] **Step 6: O painel** — criar `components/escale/automacoes/fluxo/painel/FormularioDaMensagemEnviada.tsx`:

```tsx
"use client";

import { Campo } from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { MAXIMO_DA_PALAVRA_ENVIADA, type ConfigDaMensagemEnviada } from "@/lib/automation/mensagem-enviada";
import { cn } from "@/lib/utils";

import { FiltroDePalavras } from "../comentario/FiltroDePalavras";

/** O seletor não guarda "" como opção: "qualquer" na tela, "" na configuração. */
const QUALQUER_NUMERO = "qualquer";

/**
 * O PAINEL DO GATILHO "EQUIPE ENVIA UMA MENSAGEM" (fork Escale; paridade com o "Mensagem enviada" do
 * Datacrazy, captura de 04/11/2026). A Clint não tem este gatilho: o molde é o painel dos gatilhos de
 * direct (Fase 10D) — número, filtro de mensagem e as duas opções do Datacrazy.
 */
export function FormularioDaMensagemEnviada({
  config,
  aoMudar,
}: {
  config: ConfigDaMensagemEnviada;
  aoMudar: (config: ConfigDaMensagemEnviada) => void;
}) {
  const t = useT();
  const { data: sessoes } = useChannelSessions();
  const lista = sessoes ?? [];
  const { filtro } = config;

  return (
    <div className="flex flex-col gap-5">
      <Campo rotulo={t("Número que monitora as mensagens enviadas")}>
        <SeletorDaCasca
          aria-label={t("Número que monitora as mensagens enviadas")}
          aparencia="janela"
          valor={config.channel_session_id || QUALQUER_NUMERO}
          aoMudar={(v) => aoMudar({ ...config, channel_session_id: !v || v === QUALQUER_NUMERO ? "" : v })}
          opcoes={[
            { valor: QUALQUER_NUMERO, rotulo: t("Qualquer número") },
            ...lista.map((s) => ({ valor: s.id, rotulo: channelLabel(s, t) })),
          ]}
        />
      </Campo>
      <hr className="border-casca-divisoria" />
      <div className="flex flex-col gap-2">
        <p className="text-[12px] font-semibold text-casca-texto">{t("Filtro de mensagem")}</p>
        <div className="flex gap-2" role="group" aria-label={t("Filtro de mensagem")}>
          {(["qualquer", "palavras"] as const).map((modo) => (
            <button
              key={modo}
              type="button"
              aria-pressed={filtro.modo === modo}
              onClick={() =>
                filtro.modo !== modo &&
                aoMudar({
                  ...config,
                  filtro:
                    modo === "qualquer"
                      ? { modo: "qualquer" }
                      : { modo: "palavras", condicoes: [{ operador: "contem", valor: "" }], combinar: "qualquer" },
                })
              }
              className={cn(
                "h-8 flex-1 rounded-md border text-[12px]",
                filtro.modo === modo
                  ? "border-casca-marca bg-casca-marca-suave text-casca-texto"
                  : "border-casca-divisoria text-casca-texto-2 hover:bg-casca-raia",
              )}
            >
              {modo === "qualquer" ? t("Qualquer mensagem") : t("Com palavras")}
            </button>
          ))}
        </div>
        <FiltroDePalavras filtro={filtro} maximo={MAXIMO_DA_PALAVRA_ENVIADA} aoMudar={(f) => aoMudar({ ...config, filtro: f })} />
        {filtro.modo === "qualquer" ? (
          <p role="note" className="rounded-md border border-casca-aviso/40 p-2.5 text-[12px] text-casca-aviso">
            {t("Com \"Qualquer mensagem\", a automação roda a cada mensagem que a equipe enviar.")}
          </p>
        ) : null}
      </div>
      <hr className="border-casca-divisoria" />
      <CaixaDaCasca
        aria-label={t("Disparar também em mensagens enviadas em grupos")}
        marcada={config.em_grupos}
        aoMudar={(v) => aoMudar({ ...config, em_grupos: v })}
        rotulo={t("Disparar também em mensagens enviadas em grupos")}
      />
      <CaixaDaCasca
        aria-label={t("Considerar mensagens agendadas")}
        marcada={config.agendadas}
        aoMudar={(v) => aoMudar({ ...config, agendadas: v })}
        rotulo={t("Considerar mensagens agendadas")}
      />
      <p className="text-[12px] text-casca-suave">
        {t(
          "Dispara com mensagem enviada por uma pessoa da equipe, pelo sistema ou pelo celular. Mensagem enviada pela IA ou por outra automação não dispara.",
        )}
      </p>
    </div>
  );
}
```

Antes de seguir, conferir dois tipos com `corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json` restrito mentalmente a este arquivo (ou pelo diagnóstico do editor): `CaixaDaCasca.aoMudar` recebe `boolean` (se o tipo for `boolean | "indeterminada"`, usar `(v) => aoMudar({ ...config, em_grupos: v === true })`); e o `aoMudar` do `FiltroDePalavras` devolve `FiltroDoCaminho`, que tem a mesma forma do `filtro` do schema novo.

- [ ] **Step 7: Ligar o painel e o chip**

`components/escale/automacoes/fluxo/painel/PainelDoGatilho.tsx` — imports:

```tsx
import {
  GATILHO_DE_MENSAGEM_ENVIADA,
  configInicialDaMensagemEnviada,
  lerConfigDaMensagemEnviada,
} from "@/lib/automation/mensagem-enviada";
import { FormularioDaMensagemEnviada } from "./FormularioDaMensagemEnviada";
```

e, no ternário da vista "formulario", antes do ramo final `) : (<FormularioDoGatilho …`:

```tsx
          ) : evento === GATILHO_DE_MENSAGEM_ENVIADA ? (
            <FormularioDaMensagemEnviada
              config={lerConfigDaMensagemEnviada(tela.configPropria) ?? configInicialDaMensagemEnviada()}
              aoMudar={(configPropria) => setTela({ ...tela, configPropria })}
            />
```

`components/escale/automacoes/fluxo/CorposDoNo.tsx` — import:

```tsx
import { GATILHO_DE_MENSAGEM_ENVIADA, resumoDaMensagemEnviada } from "@/lib/automation/mensagem-enviada";
```

e em `useDetalheDoGatilho`, logo depois da linha do `ehGatilhoDeTag`:

```tsx
  if (evento === GATILHO_DE_MENSAGEM_ENVIADA) return resumoDaMensagemEnviada(tela.configPropria, t);
```

- [ ] **Step 8: Espanhol** — em `lib/i18n/dicionario.ts`, logo depois de `"Mensagem não entregue": { es: "Mensaje no entregado" },` (antes, conferir com `grep -n '"Qualquer número"\|"Com palavras"\|"Filtro de mensagem"\|"Qualquer mensagem"\|"Escolha a palavra-chave"' lib/i18n/dicionario.ts` e **não** repetir as que já existem):

```ts
  "Equipe envia uma mensagem": { es: "El equipo envía un mensaje" },
  "Alguém da equipe envia uma mensagem para o contato": { es: "Alguien del equipo envía un mensaje al contacto" },
  "Número que monitora as mensagens enviadas": { es: "Número que monitorea los mensajes enviados" },
  "Qualquer número": { es: "Cualquier número" },
  "Escolha a palavra-chave": { es: "Elija la palabra clave" },
  "Com \"Qualquer mensagem\", a automação roda a cada mensagem que a equipe enviar.": { es: "Con \"Cualquier mensaje\", la automatización se ejecuta con cada mensaje que envíe el equipo." },
  "Disparar também em mensagens enviadas em grupos": { es: "Activar también con mensajes enviados en grupos" },
  "Considerar mensagens agendadas": { es: "Considerar mensajes programados" },
  "Dispara com mensagem enviada por uma pessoa da equipe, pelo sistema ou pelo celular. Mensagem enviada pela IA ou por outra automação não dispara.": { es: "Se activa con mensajes enviados por una persona del equipo, desde el sistema o desde el celular. Los mensajes enviados por la IA o por otra automatización no lo activan." },
```

- [ ] **Step 9: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-fluxo-regras.test.ts tests/unit/escale-comentarios-tela.test.ts tests/unit/escale-formulario-mensagem-enviada.test.tsx tests/unit/escale-comentarios-formulario-direct.test.tsx tests/unit/escale-fluxo-paineis.test.tsx tests/unit/escale-fluxo-nos.test.tsx`
Expected: PASS (o direct prova que o `maximo` padrão não mudou nada).

- [ ] **Step 10: Commit**

```bash
git add lib/escale/automacoes/fluxo/gatilhos.ts lib/escale/comentarios/tela.ts components/escale/automacoes/fluxo/comentario/FiltroDePalavras.tsx components/escale/automacoes/fluxo/painel/FormularioDaMensagemEnviada.tsx components/escale/automacoes/fluxo/painel/PainelDoGatilho.tsx components/escale/automacoes/fluxo/CorposDoNo.tsx lib/i18n/dicionario.ts tests/unit/escale-fluxo-regras.test.ts tests/unit/escale-comentarios-tela.test.ts tests/unit/escale-formulario-mensagem-enviada.test.tsx
git commit -m "feat(automacoes): gatilho Equipe envia uma mensagem no editor de fluxo"
```

---

### Task 5: Verificação, revisão e entrega

**Files:**
- Create: `.changes/automacoes-gatilho-equipe-envia-mensagem.md`

- [ ] **Step 1: Nota de versão**

```markdown
---
impacto: capacidade_nova
secao: novidades
titulo: Automações ganham o gatilho "Equipe envia uma mensagem"
---

No editor de Automações, em Mensagens, o gatilho "Equipe envia uma mensagem" inicia a
automação quando alguém da equipe envia uma mensagem com as palavras escolhidas, ou
qualquer mensagem. Dá para escolher o número, ligar mensagens enviadas em grupos e
desligar as mensagens agendadas. Mensagem enviada pela IA ou por outra automação não
dispara. Regras antigas deste gatilho deixam de disparar em grupos; para manter, ligue
a opção de grupos na regra.
```

- [ ] **Step 2: Testes da área, eslint e typecheck**

```bash
corepack pnpm vitest run lib/automation/mensagem-enviada.test.ts lib/automation/mensagem-enviada-no-motor.test.ts lib/automation/palavra-chave.test.ts lib/automation/desenho-da-regra.test.ts tests/unit/paridade-datacrazy-contrato.test.ts tests/unit/escale-mensagens-agendadas-rotas.test.ts tests/unit/q6-cron-mensagens-agendadas-presas.test.ts tests/unit/escale-fluxo-regras.test.ts tests/unit/escale-comentarios-tela.test.ts tests/unit/escale-formulario-mensagem-enviada.test.tsx tests/unit/escale-comentarios-formulario-direct.test.tsx tests/unit/escale-comentarios-filtro-puro.test.ts tests/unit/escale-fluxo-paineis.test.tsx tests/unit/escale-fluxo-nos.test.tsx tests/unit/escale-fluxo-pagina.test.tsx
corepack pnpm eslint lib/automation/mensagem-enviada.ts lib/automation/engine.ts lib/schemas/webhooks.ts lib/escale/conversas/envio-agendado.ts lib/escale/automacoes/fluxo/gatilhos.ts lib/escale/comentarios/tela.ts components/escale/automacoes/fluxo/comentario/FiltroDePalavras.tsx components/escale/automacoes/fluxo/painel/FormularioDaMensagemEnviada.tsx components/escale/automacoes/fluxo/painel/PainelDoGatilho.tsx components/escale/automacoes/fluxo/CorposDoNo.tsx
NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm typecheck   # em segundo plano
corepack pnpm release:conferir
```

Expected: testes PASS; eslint sem saída; typecheck só com o erro conhecido de `escale-fila-da-casca.test.tsx(67)`; `release:conferir` aceita o fragmento. Falha nova: corrigir antes de seguir.

- [ ] **Step 3: Revisão** — um revisor (`code-reviewer`, modelo Opus 5.5, esforço high) sobre `git diff escale-crm/main...HEAD`, com foco em: compatibilidade do formato antigo, anti-laço, a consulta nova de `conversations` no motor (filtra `organization_id`), e se algum consumidor de `messages.metadata` estranha `agendamento_id`. Sem Critical/Important aberto.

- [ ] **Step 4: Conferência na tela** — `next build` + `next start` na worktree, abrir Automações › uma automação › gatilho › Mensagens › "Equipe envia uma mensagem", preencher e salvar; reabrir e conferir que voltou igual; abrir uma regra antiga (`palavra_chave`) e conferir o chip "Contém “…”". Print em `evidence/gatilho-mensagem-enviada/`.

- [ ] **Step 5: PR e merge** — branch `feat/gatilho-equipe-envia-mensagem` para `escale-crm/main` (nunca `origin`), corpo com o que entrou, as decisões D1–D8 e o plano de teste; terminar com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Mergear.

- [ ] **Step 6: Publicação** — conforme a regra de frente: se não houver frente aberta esperando publicação, tag `vX.Y.Z-escale.N`, `backup.sh`, `update.sh --to <tag>` na VPS `76.13.228.29`, conferência (3 containers healthy, `/login` 200, logs limpos). Se houver, a tag fica parada até o fim da frente. Perguntar ao usuário antes desta etapa qual dos dois casos vale.
