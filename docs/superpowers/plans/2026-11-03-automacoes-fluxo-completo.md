# Automações: fluxo completo na tela da Clint (Atraso, ramos, mensagem em sequência, esperar resposta) — Plano de implementação

> **Para quem executa:** use `superpowers:executing-plans`, inline, na própria sessão (regra do projeto: nunca trocar para subagent-driven-development). Os passos usam caixinhas (`- [ ]`). Plano escrito com a skill writing-plans em 03/11/2026, a partir do fluxo "Lead novo GERAL" exportado do Datacrazy.

**Objetivo:** montar na tela **Automações** (a da Clint, fase 5B) um fluxo como o "Lead novo GERAL" do Datacrazy, sem passar pelo editor de follow-up: gatilho → ações → condição de horário com ramos → atraso com janela → áudio, pausa curta, texto com botões (um ramo por botão) → avisar o atendente, e "esperar o lead responder" com ramo para quem não respondeu.

**Arquitetura:** a tela continua gravando uma **regra** (`automation_rules`) quando o desenho é a linha reta de hoje (gatilho → condições → ações): nada muda para as automações que já existem. Quando o desenho tem Atraso, ramos de condição, saídas de botão ou tempo de resposta, a tela grava em **modo fluxo**: a regra fica só com o gatilho (e o filtro inicial) e uma ação `start_message_flow`, e o resto vira um **fluxo de follow-up** escondido (`followup_flow_pointers.surface = 'crm_automation'`), que é o motor que já espera, retoma e ramifica. O motor de fluxos ganha o que falta para isso: pausa curta entre mensagens, janela no atraso, espera de resposta a partir de 1 minuto com até 12 ramos, um nó que roda as **ações do motor de regras** e um nó que avalia as **condições do motor de regras** (com "Horário atual") em grupos com saída própria.

**Tecnologias:** Next.js 16 (App Router), TypeScript 6 estrito, Zod 4, Supabase, Vitest 4, React Flow (`@xyflow/react`), pnpm (via `corepack pnpm`).

## Decisões do usuário (03/11/2026)

1. **A tela edita o fluxo.** Um editor só, com cara de Clint. A Clint já tem Atraso, ramos, botões e "Se o contato não responder em" (E22, `WAIT_USER_RESPONSE`); o que faltar na Clint segue o desenho dela.
2. **"Esperar até a janela 08:00–09:00" já existe** na régua do canal (horário comercial, migration 9703, retoma na abertura). Este plano acrescenta só a **janela do próprio Atraso** ("Continuar entre", 07-028), que é barata porque reusa `proximaAberturaComercial`.
3. **Pausa entre mensagens entra** (o "delay" de segundos entre áudio e texto). Anotações soltas no canvas **não** entram.
4. **Fora (descartado pelo usuário):** condição "lead existe" (o `create_or_move_lead` já não duplica: procura o negócio aberto do contato no funil) e condição por dia da semana separada (a condição "Horário atual" já tem dias).

## Restrições globais

Valem para todas as tarefas (vêm do `CLAUDE.md` da pasta `Deskcom CRM`, do `CLAUDE.md`/`AGENTS.md` do repo e das memórias do projeto).

- **Regra pétrea:** este plano só roda depois de um "pode fazer" do usuário. Aprovado, o ciclo vai até produção sem pedir de novo.
- **Velocidade:** executa a frente inteira, depois testa uma vez, depois publica uma vez. Durante a execução: só o teste que a tarefa cria, `typecheck` e `eslint` dos arquivos alterados. A suíte unitária inteira **nunca** roda no computador do usuário. Um PR por fase, mergeado direto na `main` do `escale-crm`.
- **Git:** remoto `escale-crm` (`rgisjr/escale-crm`), base `main`. **Nunca** push em `origin` (Rafael). Worktree por fase: `git worktree add ../wt-5d-<fase> -b feat/5d-<fase> escale-crm/main` (o `main` local está velho; partir sempre de `escale-crm/main`).
- **Ambiente (Git Bash):** `export PATH="/c/Program Files/nodejs:$PATH"`; `corepack pnpm`; `typecheck` com `NODE_OPTIONS=--max-old-space-size=10240`, em segundo plano. O erro antigo em `tests/unit/escale-fila-da-casca.test.tsx(67)` não é da frente.
- **Sem migration.** Nada aqui cria tabela ou coluna: os tipos de nó vivem no `jsonb` do grafo, validados pelo Zod. Se alguma tarefa descobrir que precisa de migration, **pare e pergunte**.
- **Clint idêntica:** cada tela cita a imagem que a define. Abra o PNG (`Read`) antes de desenhar: `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\07-automacoes\imagens\07-0NN-*.png`. Textos exatos em `...\07-automacoes\material-do-codigo.md` (seções 3.4, 3.7, 3.8, 3.9). Marca é Escale OS: o roxo da Clint vira a cor da marca (`casca-marca`). Formatos BR (24 h, dd/mm/aaaa). Nunca `<input type="time">` nem `<select>` nativos.
- **Motor:** todo envio continua passando por `espacarEnvio`, limite diário, janela e horário comercial do canal e guardas de contato. Nenhum caminho novo envia por fora de `enviarPassos`.
- **Estilo:** sem `console.log` (use `logger`), arquivo até 800 linhas, função até 50, imutável, Zod em toda entrada. Teste não-DOM com `// @vitest-environment node`.
- **i18n:** toda frase nova em `t()` ganha linha em `lib/i18n/dicionario.ts` **só com `es`** (linha `en` reprova o typecheck); sem ela `tests/unit/i18n-espanhol-cobre-a-tela.test.ts` reprova.
- **Comentário do fork:** código novo em arquivo herdado leva `// FORK ESCALE · 5D:` na linha de cima.

## Limites conhecidos (aceitos nesta frente; avisar o usuário na entrega)

1. **Um fluxo vivo por contato.** O índice `idx_followup_enrollments_one_live` (organização + contato, status vivo) vale para toda inscrição. Um contato dentro de uma automação em modo fluxo (ou de um follow-up) não entra em outra até a primeira terminar. A execução da regra mostra o motivo na aba Atividade (é o que o `start_message_flow` já devolve). Mudar o índice é outra frente.
2. **Insights (5C) de automação em modo fluxo** mostram as execuções da regra (quem entrou), não os números por nó do fluxo. Números por nó ficam para depois.
3. **Atraso mínimo de 30 s** (o relógio do fluxo roda a cada ~25 s). A Clint aceita segundos; aqui "segundos" aceita 30 ou mais, com a mensagem "O atraso mínimo é de 30 segundos." A pausa curta (1 a 10 s) é o passo de dentro da mensagem.
4. **Depois de um Atraso** só entram passos que o fluxo sabe rodar: WhatsApp (sequência), Ações (tags, negócio, dono, tarefa, plano de tarefas, webhook), Condições e Atraso. E-mail, Instagram, Mensagem pela IA e Iniciar follow-up continuam só no modo regra; no modo fluxo a validação recusa com "Este passo não pode vir depois de um Atraso, de uma Condição com ramos ou de uma resposta do contato."

## O fluxo do Datacrazy e onde cada bloco cai

| Datacrazy (`Lead novo GERAL`) | Escale OS depois deste plano |
|---|---|
| 5 gatilhos `message-received-trigger`, `initializeSession: once` | 1 gatilho "Contato envia uma mensagem" (o modelo "uma automação, N canais"); "uma vez" = um fluxo vivo por contato |
| `user-stop-chatting-delay` 30 s | Atraso 30 segundos |
| `field-operation` (leadName, leadPhone) | não precisa: o contato já tem nome e telefone |
| `lead-exists-condition` | não precisa: `create_or_move_lead` não duplica |
| Ações: criar negócio na etapa, tag, atendente | caixa Ações (já existe) |
| `current-time-interval-condition` (seg–sex / sáb–dom) | Condições com grupos "Horário atual" e saída "Não corresponde a nenhuma condição" (T5, T10) |
| `time-interval-delay` 08:00–09:00 | Atraso com "Continuar entre" (T2, T9) ou o horário comercial do canal |
| chat: áudio → `delay-message` 4 s → texto com 9 botões → 4 s → áudio | WhatsApp com sequência: Áudio, Pausa 4 s, Texto com botões (vira lista acima de 3), Pausa 4 s, Áudio (T1, T11) |
| botão → `send-notification-action` | saída do botão → Ações › Tarefa interna para o dono (já existe) |
| `errorNextBlockId` → texto numerado | automático: fora da API oficial a lista sai como texto numerado (já existe) |

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/automation/envio-de-passos.ts` (+ teste existente) | passo `pausa` e as regras da sequência |
| `lib/followup/janela-do-atraso.ts` (+ `.test.ts`) | `instanteNaJanela()` pura: empurra um instante para dentro de "Continuar entre" |
| `lib/followup/condicoes-da-automacao.ts` (+ `.test.ts`) | grupos de condição do motor de regras, avaliados em ordem; devolve o grupo que casou |
| `lib/followup/acoes-da-automacao.ts` (+ `.test.ts`) | roda a lista de ações do motor de regras para o contato da inscrição |
| `lib/followup/graph-schema.ts` | nós `acoes_da_automacao` e `condicoes_da_automacao`, `wait.janela`, `match_reply` 1 min / 12 ramos / alternativas |
| `lib/followup/node-handlers.ts`, `lib/followup/engine.ts`, `lib/followup/validate-publish.ts` | rodar os nós novos |
| `lib/escale/automacoes/fluxo/caixas.ts` (+ `.test.ts`) | tipos do desenho em modo fluxo (caixas e saídas) |
| `lib/escale/automacoes/fluxo/compilar.ts` (+ `.test.ts`) | desenho → { regra, grafo } e grafo → desenho |
| `lib/escale/automacoes/fluxo/gravar-modo-fluxo.ts` (+ `.test.ts`) | salvar e publicar a regra e o fluxo juntos (servidor) |
| `app/api/v1/automacoes-da-casca/[id]/fluxo/route.ts` | GET (carregar) e PUT (salvar e publicar) do modo fluxo |
| `components/escale/automacoes/fluxo/painel/PainelDoAtraso.tsx` | painel 07-028 |
| `components/escale/automacoes/fluxo/painel/PainelDasCondicoes.tsx` | grupos com saída (07-025) |
| `components/escale/automacoes/fluxo/painel/PainelDaMensagem.tsx` + `painel/mensagem/*` | sequência, botões, tempo de resposta (07-027) |
| `components/escale/automacoes/fluxo/NoDoFluxo.tsx`, `CorposDoNo.tsx`, `CanvasDoFluxo.tsx`, `useFluxo.ts` | várias saídas por nó, carregar e salvar o modo fluxo |

---

## Fase 1 — Motor (PR "5D-motor")

### Tarefa 1: Pausa entre mensagens

**Files:**
- Modify: `lib/automation/envio-de-passos.ts`
- Test: `lib/automation/envio-de-passos.test.ts` (já existe; o teste "não existe pausa configurável" muda de sentido por decisão do usuário de 03/11)

**Interfaces:**
- Produces: `passoPausaSchema` (`{ tipo: "pausa", segundos: 1..10 }`); `passosSchema` aceita até **8** passos, recusa pausa no começo, no fim e duas seguidas, e soma de pausas acima de 20 s; `enviarPassos(passos, { ..., esperar? })` com `esperar: (ms: number) => Promise<void>` (padrão `setTimeout`).
- Mensagens de recusa (as da Clint, 3.9): `"O primeiro item da lista não pode ser um atraso."`, `"Não é possível adicionar mais delay entre as mensagens."`.

- [ ] **Passo 1: Trocar o teste antigo e escrever os novos (vermelho)**

No `describe("passosSchema")`, troque o `it("aceita de 1 a 5 passos")` e o `it("não existe pausa configurável ...")` por:

```ts
  it("aceita de 1 a 8 passos", () => {
    expect(passosSchema.safeParse([texto]).success).toBe(true);
    expect(passosSchema.safeParse(Array(8).fill(texto)).success).toBe(true);
    expect(passosSchema.safeParse(Array(9).fill(texto)).success).toBe(false);
    expect(passosSchema.safeParse([]).success).toBe(false);
  });
  it("pausa curta entre mensagens: 1 a 10 s, nunca no começo, no fim ou duas seguidas, até 20 s no total", () => {
    const pausa = (segundos: number) => ({ tipo: "pausa", segundos }) as const;
    expect(passosSchema.safeParse([texto, pausa(4), texto]).success).toBe(true);
    expect(passosSchema.safeParse([pausa(4), texto]).success).toBe(false);
    expect(passosSchema.safeParse([texto, pausa(4)]).success).toBe(false);
    expect(passosSchema.safeParse([texto, pausa(2), pausa(2), texto]).success).toBe(false);
    expect(passosSchema.safeParse([texto, pausa(0), texto]).success).toBe(false);
    expect(passosSchema.safeParse([texto, pausa(11), texto]).success).toBe(false);
    expect(
      passosSchema.safeParse([texto, pausa(10), texto, pausa(10), texto, pausa(1), texto]).success,
    ).toBe(false);
  });
  it("a pausa não aceita outro campo (pausa_ms segue recusada)", () => {
    expect(passosSchema.safeParse([{ ...texto, pausa_ms: 4000 }]).success).toBe(false);
  });
```

E no `describe` de `enviarPassos`, acrescente:

```ts
  it("espera a pausa entre as mensagens, sem enviar nada no lugar dela", async () => {
    const e = enviador();
    const esperas: number[] = [];
    const r = await enviarPassos(
      [
        { tipo: "texto", texto: "a" },
        { tipo: "pausa", segundos: 4 },
        { tipo: "texto", texto: "b" },
      ],
      { enviador: e, ativosDoCanal: {}, renderizar: (s) => s, chaveBase: "k", esperar: async (ms) => { esperas.push(ms); } },
    );
    expect(r).toEqual({ ok: true, enviados: 2 });
    expect(esperas).toEqual([4000]);
    expect(e.chamadas).toEqual(["texto:a:k:0", "texto:b:k:2"]);
  });
```

(A chave do segundo texto é `k:2`: o índice continua o da lista inteira, para a chave de idempotência não mudar quando alguém tira uma pausa.)

- [ ] **Passo 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run lib/automation/envio-de-passos.test.ts`
Expected: FAIL (a pausa não existe; 8 passos recusados).

- [ ] **Passo 3: Implementar**

Em `lib/automation/envio-de-passos.ts`:

1. Troque o parágrafo do cabeçalho "Sem pausa configurável: ..." por:

```ts
 * Pausa curta (1 a 10 s, até 20 s no total) entre mensagens: é o "delay" da Clint dentro do nó de
 * mensagem (decisão do usuário, 03/11/2026). Intervalo maior é um nó `wait` do fluxo. A pausa não
 * envia nada e não muda as chaves de idempotência dos outros passos (o índice é o da lista inteira).
```

2. Depois de `passoInterativoSchema`, acrescente:

```ts
export const PAUSA_MAXIMA_TOTAL_S = 20;
export const RECUSA_PAUSA_NO_COMECO = "O primeiro item da lista não pode ser um atraso.";
export const RECUSA_PAUSA_SEGUIDA = "Não é possível adicionar mais delay entre as mensagens.";

export const passoPausaSchema = z.strictObject({
  tipo: z.literal("pausa"),
  segundos: z.number().int().min(1).max(10),
});
```

3. Troque `passosSchema` por:

```ts
export const passosSchema = z
  .array(z.discriminatedUnion("tipo", [passoTextoSchema, passoMidiaSchema, passoInterativoSchema, passoPausaSchema]))
  .min(1)
  .max(8)
  .superRefine((passos, ctx) => {
    passos.forEach((p, i) => {
      if (p.tipo !== "pausa") return;
      if (i === 0 || i === passos.length - 1) {
        ctx.addIssue({ code: "custom", path: [i], message: RECUSA_PAUSA_NO_COMECO });
      } else if (passos[i - 1]?.tipo === "pausa") {
        ctx.addIssue({ code: "custom", path: [i], message: RECUSA_PAUSA_SEGUIDA });
      }
    });
    const total = passos.reduce((s, p) => (p.tipo === "pausa" ? s + p.segundos : s), 0);
    if (total > PAUSA_MAXIMA_TOTAL_S) {
      ctx.addIssue({ code: "custom", path: [], message: `As pausas somam no máximo ${PAUSA_MAXIMA_TOTAL_S} segundos.` });
    }
  });
```

4. Em `PassoPronto` acrescente `| { tipo: "pausa"; ms: number; indice: number }`, e dê `indice` aos outros três (`{ tipo: "texto"; corpo: string; indice: number }` etc.). Em `preparar`, empurre `indice: i` em cada `prontos.push(...)` e trate a pausa no começo do laço:

```ts
    if (p.tipo === "pausa") {
      prontos.push({ tipo: "pausa", ms: p.segundos * 1000, indice: i });
      continue;
    }
```

5. Em `enviarPassos`, o `deps` ganha `esperar?: (ms: number) => Promise<void>`, e o laço vira:

```ts
  const esperar = deps.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let enviados = 0;
  for (const p of prontos) {
    if (p.tipo === "pausa") {
      await esperar(p.ms);
      continue;
    }
    const chave = `${deps.chaveBase}:${p.indice}`;
    try {
      if (p.tipo === "texto") await deps.enviador.texto(p.corpo, chave);
      else if (p.tipo === "interativo") await deps.enviador.interativo(p.interativo, chave);
      else await deps.enviador.midia({ assetId: p.assetId, ...(p.legenda ? { legenda: p.legenda } : {}) }, chave);
      enviados += 1;
    } catch (err) {
      const motivo = err instanceof Error ? err.message : String(err);
      return { ok: false, enviados, erro: `passo_falhou:${p.indice}:${motivo}` };
    }
  }
  return { ok: true, enviados };
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `corepack pnpm vitest run lib/automation/envio-de-passos.test.ts`
Expected: PASS (inclusive os testes antigos de chave `k:0`, `k:1`, porque sem pausa o índice é o mesmo).

- [ ] **Passo 5: Conferir quem consome os passos**

Run: `git grep -n "PassoDeEnvio\|passos.data\|tipo === \"midia\"\|case \"midia\"" -- lib app components ':!*.test.*'`
Todo `switch`/`if` sobre `p.tipo` que precisa ser exaustivo (o typecheck aponta) trata `"pausa"` como "não envia nada": em resumo de nó e em contagem de mensagens, a pausa não conta. Rode o typecheck em segundo plano e corrija só o que ele apontar.

- [ ] **Passo 6: Commit**

```bash
git add lib/automation/envio-de-passos.ts lib/automation/envio-de-passos.test.ts
git commit -m "feat(automacoes): pausa curta entre mensagens na sequência"
```

### Tarefa 2: Janela no Atraso ("Continuar entre")

**Files:**
- Create: `lib/followup/janela-do-atraso.ts`
- Test: `lib/followup/janela-do-atraso.test.ts`
- Modify: `lib/followup/graph-schema.ts` (`waitConfigSchema`, ramo `fixed`)
- Modify: `lib/followup/node-handlers.ts` (`processNode`, `case "wait"`; nova entrada `fuso?: string`)
- Modify: `lib/followup/engine.ts` (passar o fuso quando o nó é `wait` com janela)

**Interfaces:**
- Produces: `janelaDoAtrasoSchema` = `{ de: "HH:MM", ate: "HH:MM", dias: number[] (0=dom..6=sáb, 1..7 itens) }`; `waitConfigSchema` (`mode: "fixed"`) ganha `janela?: JanelaDoAtraso`; `instanteNaJanela(instante: Date, fuso: string, janela: JanelaDoAtraso): Date`.
- Consumes: `proximaAberturaComercial(agora, fuso, faixas)` e `FaixaComercial` de `lib/canais/horario-comercial.ts`.

- [ ] **Passo 1: Teste da função pura (vermelho)**

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";

import { faixasDaJanela, instanteNaJanela } from "@/lib/followup/janela-do-atraso";

const SP = "America/Sao_Paulo";
const todos = [0, 1, 2, 3, 4, 5, 6];

describe("instanteNaJanela", () => {
  it("dentro da janela, o instante fica como está", () => {
    const t = new Date("2026-11-04T13:00:00Z"); // 10:00 em SP, quarta
    expect(instanteNaJanela(t, SP, { de: "08:00", ate: "19:00", dias: todos })).toEqual(t);
  });
  it("antes da janela, vai para a abertura do mesmo dia", () => {
    const t = new Date("2026-11-04T09:00:00Z"); // 06:00 em SP
    expect(instanteNaJanela(t, SP, { de: "08:00", ate: "09:00", dias: todos }).toISOString()).toBe("2026-11-04T11:00:00.000Z");
  });
  it("depois da janela, vai para a abertura do próximo dia permitido", () => {
    const t = new Date("2026-11-07T01:30:00Z"); // sexta 22:30 em SP
    const seg = instanteNaJanela(t, SP, { de: "08:00", ate: "19:00", dias: [1, 2, 3, 4, 5] });
    expect(seg.toISOString()).toBe("2026-11-09T11:00:00.000Z"); // segunda 08:00
  });
  it("janela que atravessa a meia-noite vira duas faixas", () => {
    expect(faixasDaJanela({ de: "22:00", ate: "06:00", dias: [1] })).toEqual([
      { diaDaSemana: 1, inicioMin: 1320, fimMin: 1440 },
      { diaDaSemana: 2, inicioMin: 0, fimMin: 360 },
    ]);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run lib/followup/janela-do-atraso.test.ts` → FAIL (módulo não existe).

- [ ] **Passo 3: Implementar `lib/followup/janela-do-atraso.ts`**

```ts
/**
 * FORK ESCALE · 5D: a janela do Atraso ("Continuar entre 08:00 e 19:00", dias permitidos — Clint 07-028).
 * O atraso conta o tempo e, se acabar fora da janela, segue na próxima abertura. A régua é a MESMA do
 * horário comercial do canal (`proximaAberturaComercial`), no fuso da organização.
 */
import { z } from "zod";

import { proximaAberturaComercial, type FaixaComercial } from "@/lib/canais/horario-comercial";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const janelaDoAtrasoSchema = z.strictObject({
  de: z.string().regex(HORA),
  ate: z.string().regex(HORA),
  dias: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});
export type JanelaDoAtraso = z.infer<typeof janelaDoAtrasoSchema>;

function minutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** "de" igual a "ate" = o dia inteiro. "ate" menor que "de" atravessa a meia-noite (vira duas faixas). */
export function faixasDaJanela(janela: JanelaDoAtraso): FaixaComercial[] {
  const de = minutos(janela.de);
  const ate = minutos(janela.ate);
  return [...new Set(janela.dias)].flatMap((dia): FaixaComercial[] => {
    if (de === ate) return [{ diaDaSemana: dia, inicioMin: 0, fimMin: 1440 }];
    if (de < ate) return [{ diaDaSemana: dia, inicioMin: de, fimMin: ate }];
    return [
      { diaDaSemana: dia, inicioMin: de, fimMin: 1440 },
      { diaDaSemana: (dia + 1) % 7, inicioMin: 0, fimMin: ate },
    ];
  });
}

export function instanteNaJanela(instante: Date, fuso: string, janela: JanelaDoAtraso): Date {
  return proximaAberturaComercial(instante, fuso, faixasDaJanela(janela)) ?? instante;
}
```

- [ ] **Passo 4: Rodar e ver passar** — mesmo comando → PASS.

- [ ] **Passo 5: Schema do nó `wait`**

Em `lib/followup/graph-schema.ts`, importe `janelaDoAtrasoSchema` de `@/lib/followup/janela-do-atraso` e, no ramo `mode: z.literal('fixed')` do `waitConfigSchema`, depois de `immune_to_reply`, acrescente:

```ts
      /** FORK ESCALE · 5D: "Continuar entre" do Atraso da Clint (07-028). Só no fixo. */
      janela: janelaDoAtrasoSchema.optional(),
```

- [ ] **Passo 6: Teste do `processNode` (vermelho)**

No teste existente de `node-handlers` (ache com `git ls-files lib/followup | grep node-handlers`), acrescente um caso que monta um grafo `trigger → wait(fixed 60_000, janela 08:00–09:00 todos os dias, immune_to_reply: true) → end`, chama `processNode` com `clock = () => new Date("2026-11-04T15:00:00Z")` (12:00 em SP), `waitElapsed: false`, `fuso: "America/Sao_Paulo"`, e espera `{ kind: "wait", next_eval_at: new Date("2026-11-05T11:00:00Z"), wake_status: "dormente" }`. Copie a montagem de `enrollment` e `lead` do caso de `wait` fixo que já existe no arquivo.

- [ ] **Passo 7: Implementar no `processNode`**

Na entrada de `processNode` acrescente `fuso?: string;` com o comentário `/** FORK ESCALE · 5D: fuso da organização — só o \`wait\` com janela usa. */`. No `case "wait"`, troque o `return { kind: "wait", next_eval_at: new Date(clock().getTime() + durationMs), ... }` por:

```ts
        const fim = new Date(clock().getTime() + durationMs);
        // FORK ESCALE · 5D: o Atraso acaba fora do "Continuar entre"? Segue na próxima abertura.
        const janela = node.config.mode === "fixed" ? node.config.janela : undefined;
        const proximo = janela ? instanteNaJanela(fim, input.fuso ?? "America/Sao_Paulo", janela) : fim;
        return {
          kind: "wait",
          next_eval_at: proximo,
          ...(imune ? { wake_status: "dormente" as const } : {}),
        };
```

(Se o `processNode` desestrutura a entrada, acrescente `fuso` à desestruturação em vez de `input.fuso`.)

- [ ] **Passo 8: O engine passa o fuso**

Em `lib/followup/engine.ts`, onde `processNode({...})` é chamado em `processEnrollment`, passe `fuso` só quando `node.type === "wait" && node.config.mode === "fixed" && node.config.janela`. Leia o fuso como o motor de regras lê (`relogioDasCondicoes` em `lib/automation/engine.ts`): `organizations.timezone` passado por `fusoUtilizavel`. Faça a leitura num método opcional do `AdminClient`, `lerFusoDaOrganizacao?(orgId: string): Promise<string>`, implementado em `createSupabaseAdminClient` com o mesmo `select("timezone")` e o mesmo `logger.warn` em erro.

- [ ] **Passo 9: Rodar os testes da área**

Run: `corepack pnpm vitest run lib/followup/janela-do-atraso.test.ts lib/followup/node-handlers.test.ts`
Expected: PASS.

- [ ] **Passo 10: Commit**

```bash
git add lib/followup/janela-do-atraso.ts lib/followup/janela-do-atraso.test.ts lib/followup/graph-schema.ts lib/followup/node-handlers.ts lib/followup/node-handlers.test.ts lib/followup/engine.ts
git commit -m "feat(fluxos): janela de continuação no atraso"
```

### Tarefa 3: Esperar resposta a partir de 1 minuto, até 12 ramos, com alternativas

**Files:**
- Modify: `lib/followup/graph-schema.ts` (`matchReplyBranchSchema`, `matchReplyConfigSchema`)
- Modify: `lib/followup/node-handlers.ts` (onde o `match_reply` compara o texto com `pattern`)
- Modify: `lib/followup/validate-publish.ts` (as duas checagens `grace_timeout_ms < 900_000` das linhas ~813 e ~856: só a do `match_reply` muda)
- Test: `lib/followup/node-handlers.test.ts`, `lib/followup/validate-publish.test.ts`

**Interfaces:**
- Produces: `matchReplyBranchSchema.alternativas?: string[]` (até 3, 1..200 caracteres); `branches` até **12**; `grace_timeout_ms` mínimo **60_000** no `match_reply` (o `ai_classify` continua com 15 min). Constante `ESPERA_MINIMA_DA_RESPOSTA_MS = 60_000` exportada de `graph-schema.ts`.

- [ ] **Passo 1: Testes (vermelho)**

1. Em `node-handlers.test.ts`: um `match_reply` com ramo `{ id: "b1", label: "TV BOX", op: "eq", pattern: "TV BOX", alternativas: ["5"] }` e `wokeEarly: true`, `lastInboundBody: "5"` sai pelo ramo `b1` (`advance` para o alvo da aresta `{ type: "branch", branch_id: "b1" }`). Copie a montagem do caso de `match_reply` que já existe.
2. Em `validate-publish.test.ts`: um grafo com `match_reply` de `grace_timeout_ms: 60_000` publica; com `59_000` recusa (use o código de erro que o teste atual de 15 min usa).
3. Um `flowGraphSchema.safeParse` com 12 ramos passa e com 13 falha.

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run lib/followup/node-handlers.test.ts lib/followup/validate-publish.test.ts` → FAIL.

- [ ] **Passo 3: Implementar**

`graph-schema.ts`:

```ts
/** FORK ESCALE · 5D: "Se o contato não responder em" começa em 1 minuto, como na Clint (3.9). */
export const ESPERA_MINIMA_DA_RESPOSTA_MS = 60_000;

export const matchReplyBranchSchema = z.strictObject({
  id: declaredBranchIdSchema,
  label: z.string().min(1).max(40),
  op: z.enum(['eq', 'contains']),
  pattern: z.string().min(1).max(200),
  /** FORK ESCALE · 5D: outros textos que valem pelo mesmo ramo (o número da opção, fora da API oficial). */
  alternativas: z.array(z.string().min(1).max(200)).max(3).optional(),
});
```

e em `matchReplyConfigSchema`: `branches: z.array(matchReplyBranchSchema).min(1).max(12)` e `grace_timeout_ms: z.number().int().min(ESPERA_MINIMA_DA_RESPOSTA_MS)`.

`node-handlers.ts`: ache a comparação do `pattern` com o corpo (`git grep -n "pattern" lib/followup/node-handlers.ts`) e faça o ramo casar se **qualquer** de `[branch.pattern, ...(branch.alternativas ?? [])]` casar pela mesma regra (`eq` sem caixa e sem espaço nas pontas, `contains` sem caixa), mantendo a função de comparação que já existe. `pattern === "*"` com `op: "contains"` casa com qualquer texto não vazio (é o "respondeu qualquer coisa" do tempo de resposta sem botões, Tarefa 7). Acrescente esse caso ao teste do Passo 1.

`validate-publish.ts`: na checagem do `match_reply`, troque `900_000` por `ESPERA_MINIMA_DA_RESPOSTA_MS` e a mensagem para "O tempo mínimo de resposta é de 1 minuto." A do `ai_classify` fica como está.

- [ ] **Passo 4: Rodar e ver passar** — mesmo comando → PASS.

- [ ] **Passo 5: Commit**

```bash
git add lib/followup/graph-schema.ts lib/followup/node-handlers.ts lib/followup/node-handlers.test.ts lib/followup/validate-publish.ts lib/followup/validate-publish.test.ts
git commit -m "feat(fluxos): esperar resposta desde 1 minuto, 12 ramos e alternativas"
```

### Tarefa 4: Nó `acoes_da_automacao` (as ações do motor de regras dentro do fluxo)

**Files:**
- Create: `lib/followup/acoes-da-automacao.ts`
- Test: `lib/followup/acoes-da-automacao.test.ts`
- Modify: `lib/followup/graph-schema.ts` (`NODE_TYPES`, `flowNodeSchema`)
- Modify: `lib/followup/node-handlers.ts` (passagem, como `edit_lead_tag`)
- Modify: `lib/followup/engine.ts` (`AdminClient.executarAcoesDaAutomacao?`, `applyResult`, `createSupabaseAdminClient`)
- Modify: `lib/followup/validate-publish.ts` (`NOS_DA_SUPERFICIE.crm_automation`)

**Interfaces:**
- Produces: `TIPOS_DE_ACAO_NO_FLUXO = ["add_tag","remove_tag","create_or_move_lead","assign_owner","create_task","apply_task_plan","call_webhook"] as const`; `acoesDaAutomacaoConfigSchema = { acoes: { type: TipoDeAcaoNoFluxo; config: Record<string, unknown> }[] (1..10) }`; `executarAcoesDaAutomacao(deps, item): Promise<ResultadoDasAcoes>`.
- Consumes: `getAction(type)` de `@/lib/automation/actions` (o mesmo registro que `edit_lead_tag` usa no engine).

- [ ] **Passo 1: Teste (vermelho)**

```ts
// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { executarAcoesDaAutomacao } from "@/lib/followup/acoes-da-automacao";

describe("executarAcoesDaAutomacao", () => {
  const base = { organization_id: "org", contact_id: "c1", enrollment_id: "e1" };

  it("roda as ações na ordem, com o negócio e o contato no contexto", async () => {
    const vistos: string[] = [];
    const getAction = vi.fn((type: string) => ({
      type,
      execute: vi.fn(async (ctx: { context: Record<string, unknown> }) => {
        vistos.push(`${type}:${(ctx.context.lead as { id: string }).id}`);
        return { type, status: "success" as const };
      }),
    }));
    const r = await executarAcoesDaAutomacao(
      { admin: {} as never, getAction, carregarContexto: async () => ({ lead: { id: "L1" }, contact: { id: "c1" } }) },
      { ...base, acoes: [{ type: "add_tag", config: { tags: ["vip"] } }, { type: "create_task", config: {} }] },
    );
    expect(vistos).toEqual(["add_tag:L1", "create_task:L1"]);
    expect(r).toEqual({ ok: true, falhas: [] });
  });

  it("uma ação que falha não para as outras e volta nomeada", async () => {
    const getAction = vi.fn((type: string) => ({
      type,
      execute: vi.fn(async () => (type === "add_tag" ? { type, status: "failed" as const, error: "x" } : { type, status: "success" as const })),
    }));
    const r = await executarAcoesDaAutomacao(
      { admin: {} as never, getAction, carregarContexto: async () => ({ contact: { id: "c1" } }) },
      { ...base, acoes: [{ type: "add_tag", config: {} }, { type: "remove_tag", config: {} }] },
    );
    expect(r).toEqual({ ok: false, falhas: ["add_tag:x"] });
  });

  it("ação sem registro vira falha, não exceção", async () => {
    const r = await executarAcoesDaAutomacao(
      { admin: {} as never, getAction: () => undefined, carregarContexto: async () => ({}) },
      { ...base, acoes: [{ type: "add_tag", config: {} }] },
    );
    expect(r).toEqual({ ok: false, falhas: ["add_tag:acao_nao_registrada"] });
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run lib/followup/acoes-da-automacao.test.ts` → FAIL.

- [ ] **Passo 3: Implementar `lib/followup/acoes-da-automacao.ts`**

```ts
/**
 * FORK ESCALE · 5D: a caixa "Ações" da tela de Automações quando ela vem DEPOIS de um Atraso, de um
 * ramo ou de uma resposta — roda as MESMAS ações do motor de regras (`getAction`), como o nó
 * `edit_lead_tag` já faz com `add_tag`. Nada de lógica copiada: o contexto é a linha inteira do negócio
 * mais recente do contato (a `add_tag` apaga tags com recorte) e o contato; `event` vai vazio de
 * propósito (ver o comentário de `editarTagDoLead` em `engine.ts`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { ActionExecutor } from "@/lib/automation/types";
import type { EventRow } from "@/lib/event-log/dispatcher";

export const TIPOS_DE_ACAO_NO_FLUXO = [
  "add_tag",
  "remove_tag",
  "create_or_move_lead",
  "assign_owner",
  "create_task",
  "apply_task_plan",
  "call_webhook",
] as const;
export type TipoDeAcaoNoFluxo = (typeof TIPOS_DE_ACAO_NO_FLUXO)[number];

export const acoesDaAutomacaoConfigSchema = z.strictObject({
  acoes: z
    .array(z.strictObject({ type: z.enum(TIPOS_DE_ACAO_NO_FLUXO), config: z.record(z.string(), z.unknown()) }))
    .min(1)
    .max(10),
});
export type AcoesDaAutomacaoConfig = z.infer<typeof acoesDaAutomacaoConfigSchema>;

export interface DepsDasAcoes {
  admin: SupabaseClient;
  getAction: (type: string) => Pick<ActionExecutor, "type" | "execute"> | undefined;
  carregarContexto: (orgId: string, contactId: string) => Promise<Record<string, unknown>>;
}

export type ResultadoDasAcoes = { ok: boolean; falhas: string[] };

export async function executarAcoesDaAutomacao(
  deps: DepsDasAcoes,
  item: { organization_id: string; contact_id: string; enrollment_id: string; acoes: AcoesDaAutomacaoConfig["acoes"] },
): Promise<ResultadoDasAcoes> {
  const context = await deps.carregarContexto(item.organization_id, item.contact_id);
  const falhas: string[] = [];
  for (const [indice, acao] of item.acoes.entries()) {
    const executor = deps.getAction(acao.type);
    if (!executor) {
      falhas.push(`${acao.type}:acao_nao_registrada`);
      continue;
    }
    const r = await executor.execute(
      {
        admin: deps.admin,
        organizationId: item.organization_id,
        ruleId: `followup:${item.enrollment_id}`,
        ruleName: "Automação",
        event: {} as EventRow,
        context,
        requestId: `followup:${item.enrollment_id}:${indice}`,
        actionIndex: indice,
        ruleActions: item.acoes,
      },
      acao.config,
    );
    if (r.status === "failed") falhas.push(`${acao.type}:${r.error ?? "falhou"}`);
  }
  return { ok: falhas.length === 0, falhas };
}
```

- [ ] **Passo 4: Rodar e ver passar** — mesmo comando → PASS.

- [ ] **Passo 5: Registrar o nó no grafo**

`graph-schema.ts`:
1. Em `NODE_TYPES`, antes de `'end'`: `// FORK ESCALE · 5D: ações e condições do motor de regras dentro do fluxo da tela de Automações.` e `'acoes_da_automacao', 'condicoes_da_automacao',` (o segundo é da Tarefa 5; registre os dois agora para o typecheck fechar uma vez só, e na Tarefa 5 só preencha o schema).
2. Em `flowNodeSchema`, um membro novo copiando o formato do `edit_lead_tag`, com `type: z.literal('acoes_da_automacao')` e `config: acoesDaAutomacaoConfigSchema` (import de `@/lib/followup/acoes-da-automacao`).

`node-handlers.ts`, no `switch` do `processNode`:

```ts
    case "acoes_da_automacao": {
      // FORK ESCALE · 5D: passagem no relógio, como `edit_lead_tag`: quem roda as ações é o engine ao
      // aplicar o `advance`, guardado pelo idempotency_key do passo (replay não roda duas vezes).
      const edge = selectEdge(edges, node.id, { type: "always" });
      if (!edge) return { kind: "fail", error: `acoes_da_automacao node "${node.id}" has no outbound edge` };
      return { kind: "advance", next_node_id: edge.target, next_eval_at: clock() };
    }
```

`engine.ts`:
1. No `AdminClient`, ao lado de `editarTagDoLead?`, declare `executarAcoesDaAutomacao?(item: { organization_id: string; contact_id: string; enrollment_id: string; config: Extract<FlowNode, { type: "acoes_da_automacao" }>["config"] }): Promise<{ ok: boolean; falhas: string[] }>;`.
2. Em `applyResult`, depois do bloco do `edit_lead_tag`, um bloco igual com `node.type === "acoes_da_automacao"`: chama `db.executarAcoesDaAutomacao?.(...)`; resultado `ok: false` ou exceção gravam `logger.warn("followup_acoes_da_automacao_failed", {...})` e o evento `acoes_da_automacao_failed` com `payload: { falhas }`, copiando a forma do `move_lead_failed` (não reverte o avanço).
3. Em `createSupabaseAdminClient`, implemente `executarAcoesDaAutomacao` chamando `executarAcoesDaAutomacao({ admin, getAction, carregarContexto }, { ...item, acoes: item.config.acoes })`, onde `carregarContexto` lê o negócio mais recente do contato com `select("*")` e o contato com `select("*")`, exatamente como `editarTagDoLead` (copie as duas consultas; põe `lead` e `contact` no objeto quando existirem).

`validate-publish.ts`: acrescente `'acoes_da_automacao', 'condicoes_da_automacao'` **só** em `NOS_DA_SUPERFICIE.crm_automation`.

- [ ] **Passo 6: Fechar os `switch` exaustivos**

Run: `git grep -n "\"edit_lead_tag\"\|'edit_lead_tag'" -- lib app components ':!*.test.*'`
Em cada lugar que trata tipo de nó (visual do editor de follow-up `app/app/ai/followups/[id]/_components/nodes/nodeVisuals.ts`, rótulos, eventos legíveis, validação), acrescente os dois tipos novos com o mesmo tratamento do `edit_lead_tag` (rótulo "Ações" e "Condições"; não enviam mensagem). O editor de follow-up **não** oferece os dois na paleta: eles só nascem pela tela de Automações. Typecheck em segundo plano até zerar o que é da frente.

- [ ] **Passo 7: Commit**

```bash
git add lib/followup app/app/ai/followups
git commit -m "feat(fluxos): no de acoes do motor de regras dentro do fluxo"
```

### Tarefa 5: Nó `condicoes_da_automacao` (grupos com saída)

**Files:**
- Create: `lib/followup/condicoes-da-automacao.ts`
- Test: `lib/followup/condicoes-da-automacao.test.ts`
- Modify: `lib/followup/graph-schema.ts` (`flowNodeSchema`, `nodeBranches`)
- Modify: `lib/followup/node-handlers.ts` (entrada `grupoQueCasou?: string | null`)
- Modify: `lib/followup/engine.ts` (avaliar antes do `processNode`)

**Interfaces:**
- Produces: `condicoesDaAutomacaoConfigSchema = { grupos: { id: string; modo: "todas" | "qualquer"; linhas: RuleCondition[] (1..10) }[] (1..10) }`; `grupoQueCasou(grupos, context, relogio): string | null` (o primeiro grupo que casa, na ordem; `null` = "Não corresponde a nenhuma condição", saída `FALLBACK_BRANCH_ID`).
- Consumes: `evaluateConditions`, `RuleCondition`, `RelogioDasCondicoes` de `lib/automation/conditions.ts`.

- [ ] **Passo 1: Teste (vermelho)**

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";

import { grupoQueCasou } from "@/lib/followup/condicoes-da-automacao";

const relogio = { agora: new Date("2026-11-04T15:00:00Z"), fuso: "America/Sao_Paulo" }; // quarta 12:00
const util = { id: "g1", modo: "todas" as const, linhas: [{ field: "agora.hora", op: "entre" as const, value: '{"de":"09:30","ate":"23:00","dias":[1,2,3,4,5]}' }] };
const fds = { id: "g2", modo: "todas" as const, linhas: [{ field: "agora.hora", op: "entre" as const, value: '{"de":"09:30","ate":"22:00","dias":[0,6]}' }] };

describe("grupoQueCasou", () => {
  it("devolve o primeiro grupo que casa, na ordem", () => {
    expect(grupoQueCasou([util, fds], {}, relogio)).toBe("g1");
  });
  it("nenhum grupo casa: null (saída 'Não corresponde a nenhuma condição')", () => {
    const noite = { agora: new Date("2026-11-05T04:00:00Z"), fuso: "America/Sao_Paulo" };
    expect(grupoQueCasou([util, fds], {}, noite)).toBeNull();
  });
  it("'qualquer' casa com uma linha só", () => {
    const g = { id: "g3", modo: "qualquer" as const, linhas: [
      { field: "lead.tags", op: "contains" as const, value: "vip" },
      { field: "lead.tags", op: "contains" as const, value: "quente" },
    ] };
    expect(grupoQueCasou([g], { lead: { tags: ["quente"] } }, relogio)).toBe("g3");
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run lib/followup/condicoes-da-automacao.test.ts` → FAIL.

- [ ] **Passo 3: Implementar `lib/followup/condicoes-da-automacao.ts`**

```ts
/**
 * FORK ESCALE · 5D: o passo Condições da Clint (07-025, E19) dentro do fluxo — grupos "Corresponde a
 * todas / qualquer condição", cada um com a sua saída, e "Não corresponde a nenhuma condição". As
 * linhas são as MESMAS da regra (`evaluateConditions`, com "Horário atual"), para a tela ter uma
 * verdade só.
 */
import { z } from "zod";

import { evaluateConditions, type RelogioDasCondicoes, type RuleCondition } from "@/lib/automation/conditions";
import { declaredBranchIdSchema } from "@/lib/followup/graph-schema";

const linhaSchema = z.strictObject({
  field: z.string().min(1).max(120),
  op: z.enum(["eq", "neq", "contains", "depois_de", "antes_de", "entre"]),
  value: z.string().max(500),
});

export const condicoesDaAutomacaoConfigSchema = z
  .strictObject({
    grupos: z
      .array(
        z.strictObject({
          id: declaredBranchIdSchema,
          modo: z.enum(["todas", "qualquer"]),
          linhas: z.array(linhaSchema).min(1).max(10),
        }),
      )
      .min(1)
      .max(10),
  })
  .refine((c) => new Set(c.grupos.map((g) => g.id)).size === c.grupos.length, {
    message: "grupos[].id must be unique within the node",
    path: ["grupos"],
  });
export type CondicoesDaAutomacaoConfig = z.infer<typeof condicoesDaAutomacaoConfigSchema>;

export function grupoQueCasou(
  grupos: CondicoesDaAutomacaoConfig["grupos"],
  context: Record<string, unknown>,
  relogio: RelogioDasCondicoes,
): string | null {
  for (const g of grupos) {
    const linhas = g.linhas as RuleCondition[];
    const casou =
      g.modo === "todas"
        ? evaluateConditions(linhas, context, relogio)
        : linhas.some((l) => evaluateConditions([l], context, relogio));
    if (casou) return g.id;
  }
  return null;
}
```

Se `declaredBranchIdSchema` importado de `graph-schema.ts` criar import circular (o `graph-schema` importa este arquivo na Passo 5), mova `declaredBranchIdSchema` e as constantes de ramo para `lib/followup/ramos.ts` e reexporte de `graph-schema.ts` (nenhum consumidor muda).

- [ ] **Passo 4: Rodar e ver passar** — mesmo comando → PASS.

- [ ] **Passo 5: Nó no grafo, ramos e `processNode`**

`graph-schema.ts`: membro de `flowNodeSchema` com `type: z.literal('condicoes_da_automacao')` e `config: condicoesDaAutomacaoConfigSchema`. Em `nodeBranches(node)`, para esse tipo devolva um ramo `match` por grupo (`id: g.id`, rótulo `"Grupo N"`, N = posição + 1) e o ramo `fallback` `FALLBACK_BRANCH_ID` com rótulo "Não corresponde a nenhuma condição" (siga a forma que o `condition` com `per_check` já devolve).

`node-handlers.ts`: entrada nova `grupoQueCasou?: string | null;` (`/** FORK ESCALE · 5D: o engine avalia os grupos (precisa do negócio e do relógio) e passa o resultado. */`) e:

```ts
    case "condicoes_da_automacao": {
      const ramo = input.grupoQueCasou ?? FALLBACK_BRANCH_ID;
      const edge = selectEdge(edges, node.id, { type: "branch", branch_id: ramo });
      // Saída sem ligação é o fim do caminho, como na Clint ("Saída não conectada").
      if (!edge) return { kind: "complete", outcome: null, cancel_reason: `condicoes_sem_saida:${ramo}` };
      return { kind: "advance", next_node_id: edge.target, next_eval_at: clock() };
    }
```

(Confira o `EdgeMatch` de `selectEdge`: se ele não aceitar `{ type: "branch", branch_id }`, use a forma que o `match_reply` usa para seguir um ramo declarado.)

`engine.ts`: antes de chamar `processNode`, se `node.type === "condicoes_da_automacao"`, chame o método opcional novo `db.avaliarCondicoesDaAutomacao?.({ organization_id, contact_id, grupos: node.config.grupos })` e passe o retorno em `grupoQueCasou` (ausente → `null`). Implemente em `createSupabaseAdminClient`: monta o contexto com a mesma `carregarContexto` da Tarefa 4 (extraia para uma função local reaproveitada pelas duas) e o relógio com o fuso da Tarefa 2, e devolve `grupoQueCasou(...)`.

- [ ] **Passo 6: Teste do `processNode`** — no `node-handlers.test.ts`, `grupoQueCasou: "g2"` segue a aresta `branch g2`; `null` segue a `branch else`; sem aresta para o ramo, `complete`. Rode `corepack pnpm vitest run lib/followup/node-handlers.test.ts lib/followup/condicoes-da-automacao.test.ts` → PASS.

- [ ] **Passo 7: Commit**

```bash
git add lib/followup
git commit -m "feat(fluxos): condicoes do motor de regras em grupos com saida"
```

- [ ] **Passo 8: PR da fase** — `typecheck` e `eslint` dos arquivos alterados verdes; `gh pr create --repo rgisjr/escale-crm --base main` com título "feat(5D): motor do fluxo completo nas automações" e corpo listando as Tarefas 1–5; mergear direto (`gh pr merge --merge`).

---

## Fase 2 — Desenho, compilador e gravação (PR "5D-desenho")

### Tarefa 6: Tipos do desenho em modo fluxo

**Files:**
- Create: `lib/escale/automacoes/fluxo/caixas.ts`
- Test: `lib/escale/automacoes/fluxo/caixas.test.ts`
- Modify: `lib/automation/desenho-da-regra.ts` (só tipos: `TipoDeCaixa` e `LigacaoDoDesenho`)

**Interfaces:**
- Produces (em `caixas.ts`):

```ts
export type UnidadeDoAtraso = "segundos" | "minutos" | "horas" | "dias";
export type DadosDoAtraso = { kind: "atraso"; quantidade: number; unidade: UnidadeDoAtraso; janela: JanelaDoAtraso | null };
export type GrupoDeCondicoes = { id: string; modo: "todas" | "qualquer"; linhas: LinhaDeCondicao[] };
export type DadosDasCondicoesEmGrupos = { kind: "condicoes"; linhas: LinhaDeCondicao[]; grupos?: GrupoDeCondicoes[] };
export type TempoDeResposta = { quantidade: number; unidade: "minutos" | "horas" | "dias" } | null;
/** Saídas de um nó: "proximo" (Próximo passo), "botao:<id>", "nao_respondeu", "grupo:<id>", "nenhuma". */
export type SaidaDoNo = "proximo" | "nao_respondeu" | "nenhuma" | `botao:${string}` | `grupo:${string}`;
export const SAIDA_PADRAO: SaidaDoNo = "proximo";
export function msDoAtraso(d: Pick<DadosDoAtraso, "quantidade" | "unidade">): number;
export function saidasDaCaixa(caixa: CaixaDoDesenho): SaidaDoNo[];
export const ATRASO_MINIMO_MS = 30_000;
```

- Em `desenho-da-regra.ts`: `DadosDaCaixa` passa a incluir `DadosDoAtraso`; `DadosDasCondicoes` ganha `grupos?: GrupoDeCondicoes[]` (ausente = o formato de hoje, um grupo "todas"); `LigacaoDoDesenho` ganha `saida?: SaidaDoNo` (ausente = `"proximo"`). Nenhuma regra gravada muda: `desenhoDaRegra` continua produzindo o formato de hoje.
- A ação `send_whatsapp_message` no desenho ganha, dentro de `config`, `tempo_de_resposta?: TempoDeResposta` (só a tela e o compilador leem; o motor de regras ignora porque a validação do modo regra recusa quando ele está preenchido — ver Tarefa 7).

- [ ] **Passo 1: Teste (vermelho)**

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";

import { msDoAtraso, saidasDaCaixa } from "@/lib/escale/automacoes/fluxo/caixas";

describe("msDoAtraso", () => {
  it("converte quantidade e unidade", () => {
    expect(msDoAtraso({ quantidade: 30, unidade: "segundos" })).toBe(30_000);
    expect(msDoAtraso({ quantidade: 3, unidade: "minutos" })).toBe(180_000);
    expect(msDoAtraso({ quantidade: 2, unidade: "horas" })).toBe(7_200_000);
    expect(msDoAtraso({ quantidade: 1, unidade: "dias" })).toBe(86_400_000);
  });
});

describe("saidasDaCaixa", () => {
  const pos = { x: 0, y: 0 };
  it("WhatsApp com botões e tempo de resposta: Próximo passo, um por botão e Não respondeu", () => {
    const caixa = {
      id: "w1", type: "acao" as const, position: pos,
      data: { kind: "acao" as const, acao: { type: "send_whatsapp_message", config: {
        passos: [{ tipo: "interativo", interativo: { tipo: "botoes", corpo: "?", botoes: [{ id: "a", titulo: "A" }, { id: "b", titulo: "B" }] } }],
        tempo_de_resposta: { quantidade: 15, unidade: "minutos" },
      } } },
    };
    expect(saidasDaCaixa(caixa)).toEqual(["proximo", "botao:a", "botao:b", "nao_respondeu"]);
  });
  it("Condições em grupos: um por grupo e 'nenhuma'", () => {
    const caixa = { id: "c1", type: "condicoes" as const, position: pos, data: { kind: "condicoes" as const, linhas: [], grupos: [
      { id: "g1", modo: "todas" as const, linhas: [] }, { id: "g2", modo: "todas" as const, linhas: [] },
    ] } };
    expect(saidasDaCaixa(caixa)).toEqual(["grupo:g1", "grupo:g2", "nenhuma"]);
  });
  it("Atraso e Ações: só Próximo passo", () => {
    const atraso = { id: "a1", type: "atraso" as const, position: pos, data: { kind: "atraso" as const, quantidade: 1, unidade: "minutos" as const, janela: null } };
    expect(saidasDaCaixa(atraso)).toEqual(["proximo"]);
  });
});
```

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run lib/escale/automacoes/fluxo/caixas.test.ts` → FAIL.

- [ ] **Passo 3: Implementar** os tipos acima, `msDoAtraso` (`{segundos:1e3, minutos:6e4, horas:3.6e6, dias:8.64e7}[unidade] * quantidade`) e `saidasDaCaixa`:
  - `atraso`, `gatilho`, ação comum: `["proximo"]`;
  - `condicoes` com `grupos`: `grupos.map(g => "grupo:"+g.id)` + `"nenhuma"`; sem `grupos`: `["proximo"]`;
  - `send_whatsapp_message`: `"proximo"`, depois `botao:<id>` para cada botão ou linha do **último** passo interativo (lido com `passosSchema.safeParse` do `config.passos`; inválido = sem botões), depois `"nao_respondeu"` se `config.tempo_de_resposta` não for nulo.

- [ ] **Passo 4: Rodar e ver passar** — mesmo comando → PASS. Typecheck: toda função de `desenho-da-regra.ts` que faz `switch` em `data.kind` trata `"atraso"` (no modo regra o `percorrer` marca a caixa com o problema novo `PROBLEMAS.passoDeFluxo`, texto "Este passo só funciona em fluxo; salve para gravar como fluxo." — o salvar da Tarefa 12 decide o modo antes de chamar `percorrer`, então essa mensagem só aparece se alguém chamar o caminho antigo à força).

- [ ] **Passo 5: Commit** — `git commit -m "feat(automacoes): tipos do desenho em modo fluxo"` com os três arquivos.

### Tarefa 7: Compilador (desenho ↔ regra + grafo)

**Files:**
- Create: `lib/escale/automacoes/fluxo/compilar.ts`
- Test: `lib/escale/automacoes/fluxo/compilar.test.ts`

**Interfaces:**
- Consumes: `Desenho`, `CaixaDoDesenho`, `corpoDoDesenho`, `percorrer`, `triggerConfigDaTela` (de `desenho-da-regra.ts`); `saidasDaCaixa`, `msDoAtraso`, `ATRASO_MINIMO_MS` (Tarefa 6); `FlowGraph`, `flowGraphSchema`, `FALLBACK_BRANCH_ID`, `NO_REPLY_BRANCH_ID` (graph-schema); `TIPOS_DE_ACAO_NO_FLUXO` (Tarefa 4); `ESPERA_MINIMA_DA_RESPOSTA_MS` (Tarefa 3).
- Produces:

```ts
export type ModoDoDesenho = "regra" | "fluxo";
export function modoDoDesenho(d: Desenho): ModoDoDesenho;
export type Compilado =
  | { ok: true; modo: "regra"; corpo: CorpoDaRegra }
  | { ok: true; modo: "fluxo"; regra: Omit<CorpoDaRegra, "actions">; grafo: FlowGraph }
  | { ok: false; problemas: ProblemaDoDesenho[] };
export function compilar(entrada: { nome: string; desenho: Desenho; regraGravada: RegraGravada | null }): Compilado;
export function desenhoDoFluxo(regra: RegraGravada, grafo: FlowGraph): Desenho;
export const ESPERA_SEM_LIMITE_MS = 7 * 86_400_000;
```

Regras do compilador (cada uma vira teste):

1. **Modo.** `"fluxo"` se houver caixa `atraso`, ou `condicoes` com mais de um grupo ou com saída ligada fora de `"proximo"`, ou `condicoes` que não seja a primeira depois do gatilho, ou ligação com `saida` diferente de `"proximo"`, ou WhatsApp com `tempo_de_resposta`. Senão `"regra"` (e o corpo é exatamente `corpoDoDesenho` de hoje).
2. **Filtro inicial.** No modo fluxo, se a caixa ligada ao gatilho é `condicoes` com **um** grupo "todas" e só a saída do grupo ligada, as linhas viram `regra.conditions` (filtram antes de inscrever) e o fluxo começa no alvo dessa saída.
3. **Nós.** `gatilho` → nó `trigger` (`config: {}`); `atraso` → `wait` `{ mode: "fixed", duration_ms: msDoAtraso, immune_to_reply: true, janela? }`; `condicoes` → `condicoes_da_automacao` (`grupos`, ou um grupo `g1` "todas" com `linhas` quando não tem `grupos`); ação `send_whatsapp_message` → `action` `{ mode: "steps", passos }` (canal sempre o da conversa no fluxo; se `channel_session_id` for um número fixo, problema "No fluxo, a mensagem sai pelo número da conversa." — o desvio fica documentado); ações de `TIPOS_DE_ACAO_NO_FLUXO` **seguidas** viram **um** `acoes_da_automacao`; outra ação no modo fluxo → problema `PASSO_SO_NO_MODO_REGRA` ("Este passo não pode vir depois de um Atraso, de uma Condição com ramos ou de uma resposta do contato.").
4. **Esperar resposta.** WhatsApp com alguma saída `botao:*` ligada ou com `tempo_de_resposta` → depois do `action`, um `match_reply` com: um ramo por botão ligado (`id` = id do botão, `label` = título, `op: "eq"`, `pattern` = título, `alternativas` = [posição 1-based como texto]); `grace_timeout_ms` = tempo de resposta em ms (mínimo 60 s; sem tempo, `ESPERA_SEM_LIMITE_MS`). Aresta `always` do `action` para o `match_reply`; arestas `branch <id>` por botão; aresta `branch else` para o alvo de `"proximo"` (respondeu outra coisa); aresta `branch no_reply` para o alvo de `"nao_respondeu"`. Saída sem alvo → um nó `end` (`outcome: "custom"`, `note: "Saída não conectada"`) compartilhado.
5. **Sem resposta esperada.** WhatsApp sem botão ligado e sem tempo → aresta `always` para o alvo de `"proximo"` (ou `end`).
6. **Ids e posições.** O id do nó do grafo é o id da caixa (o `match_reply` gerado é `<id>__resposta`, o `end` é `fim`); `position` é a da caixa (o `match_reply` fica 0,1 px à direita, invisível na tela porque `desenhoDoFluxo` o funde de volta).
7. **Validação.** O grafo sai por `flowGraphSchema.safeParse`; erro do Zod vira `ProblemaDoDesenho` apontando a caixa pelo id do nó (`path[1]` → `nodes[i].id`). Limites: até 60 nós e 120 arestas (do schema); passou disso, problema "A automação passou do tamanho máximo (60 passos)."
8. **Volta (`desenhoDoFluxo`).** Inverte 1–6: `trigger` + `regra.trigger_event/trigger_config` → caixa gatilho (com `telaDoGatilho`); `regra.conditions` não vazias → caixa `condicoes` de um grupo ligada ao primeiro nó; `wait` → `atraso` (quantidade/unidade: a maior unidade que divide exato); `condicoes_da_automacao` → `condicoes` com `grupos`; `action` → `send_whatsapp_message` com `passos` e `channel_session_id: "conversation"`; o `match_reply` `<id>__resposta` é absorvido pela caixa `<id>` (ramos voltam a ser saídas `botao:<id>`, `else` → `proximo`, `no_reply` → `nao_respondeu` + `tempo_de_resposta`, que só é preenchido se `grace_timeout_ms !== ESPERA_SEM_LIMITE_MS`); `acoes_da_automacao` com N ações → N caixas de ação em fila (ligações `proximo`); `end` some (saída sem ligação).

- [ ] **Passo 1: Testes (vermelho)** — um `it` por regra acima. O teste central é a **ida e volta** do "Lead novo GERAL" reduzido:

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest";

import { compilar, desenhoDoFluxo, modoDoDesenho } from "@/lib/escale/automacoes/fluxo/compilar";
import type { Desenho } from "@/lib/automation/desenho-da-regra";

const p = { x: 0, y: 0 };
const leadNovo: Desenho = {
  caixas: [
    { id: "gatilho", type: "gatilho", position: p, data: { kind: "gatilho", evento: "message.received", tela: {} as never } },
    { id: "espera", type: "atraso", position: p, data: { kind: "atraso", quantidade: 30, unidade: "segundos", janela: null } },
    { id: "acoes", type: "acao", position: p, data: { kind: "acao", acao: { type: "create_or_move_lead", config: { pipeline_id: "P", stage_id: "S" } } } },
    { id: "horario", type: "condicoes", position: p, data: { kind: "condicoes", linhas: [], grupos: [
      { id: "util", modo: "todas", linhas: [{ field: "agora.hora", op: "entre", value: '{"de":"09:30","ate":"23:00","dias":[1,2,3,4,5]}' }] },
    ] } },
    { id: "fora", type: "atraso", position: p, data: { kind: "atraso", quantidade: 1, unidade: "minutos", janela: { de: "08:00", ate: "09:00", dias: [0,1,2,3,4,5,6] } } },
    { id: "msg", type: "acao", position: p, data: { kind: "acao", acao: { type: "send_whatsapp_message", config: {
      channel_session_id: "conversation",
      passos: [
        { tipo: "midia", asset: "var:bv1" },
        { tipo: "pausa", segundos: 4 },
        { tipo: "interativo", interativo: { tipo: "lista", corpo: "Aonde você quer fazer o teste?", botaoDaLista: "Ver opções",
          linhas: [{ id: "tv", titulo: "TV BOX" }, { id: "cel", titulo: "CELULAR ANDROID" }] } },
      ],
    } } } },
    { id: "avisa", type: "acao", position: p, data: { kind: "acao", acao: { type: "create_task", config: { titulo: "Lead clicou", vence_em_dias: 0, atribuir_a: "dono_do_lead" } } } },
  ],
  ligacoes: [
    { id: "l1", source: "gatilho", target: "espera" },
    { id: "l2", source: "espera", target: "acoes" },
    { id: "l3", source: "acoes", target: "horario" },
    { id: "l4", source: "horario", target: "msg", saida: "grupo:util" },
    { id: "l5", source: "horario", target: "fora", saida: "nenhuma" },
    { id: "l6", source: "fora", target: "msg" },
    { id: "l7", source: "msg", target: "avisa", saida: "botao:tv" },
    { id: "l8", source: "msg", target: "avisa", saida: "botao:cel" },
  ],
};

describe("compilar o Lead novo GERAL", () => {
  it("é modo fluxo", () => expect(modoDoDesenho(leadNovo)).toBe("fluxo"));

  it("gera o grafo esperado", () => {
    const r = compilar({ nome: "Lead novo", desenho: leadNovo, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error(JSON.stringify(r));
    const tipos = Object.fromEntries(r.grafo.nodes.map((n) => [n.id, n.type]));
    expect(tipos).toMatchObject({
      gatilho: "trigger", espera: "wait", acoes: "acoes_da_automacao", horario: "condicoes_da_automacao",
      fora: "wait", msg: "action", msg__resposta: "match_reply", avisa: "acoes_da_automacao",
    });
    const resposta = r.grafo.nodes.find((n) => n.id === "msg__resposta");
    expect(resposta?.type === "match_reply" && resposta.config.branches.map((b) => [b.id, b.pattern, b.alternativas])).toEqual([
      ["tv", "TV BOX", ["1"]], ["cel", "CELULAR ANDROID", ["2"]],
    ]);
    expect(r.regra.trigger_event).toBe("message.received");
  });

  it("ida e volta devolve as mesmas caixas e saídas", () => {
    const r = compilar({ nome: "Lead novo", desenho: leadNovo, regraGravada: null });
    if (!r.ok || r.modo !== "fluxo") throw new Error("compilou errado");
    const volta = desenhoDoFluxo({ ...r.regra, actions: [] }, r.grafo);
    expect(volta.caixas.map((c) => c.id).sort()).toEqual(leadNovo.caixas.map((c) => c.id).sort());
    expect(volta.ligacoes.map((l) => `${l.source}>${l.target}:${l.saida ?? "proximo"}`).sort()).toEqual(
      leadNovo.ligacoes.map((l) => `${l.source}>${l.target}:${l.saida ?? "proximo"}`).sort(),
    );
  });

  it("e-mail depois de um atraso é recusado com a mensagem do passo", () => {
    const comEmail: Desenho = {
      caixas: [...leadNovo.caixas, { id: "mail", type: "acao", position: p, data: { kind: "acao", acao: { type: "send_email", config: {} } } }],
      ligacoes: [...leadNovo.ligacoes, { id: "l9", source: "avisa", target: "mail" }],
    };
    const r = compilar({ nome: "x", desenho: comEmail, regraGravada: null });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.problemas).toContainEqual({ caixa: "mail", mensagem: "Este passo não pode vir depois de um Atraso, de uma Condição com ramos ou de uma resposta do contato." });
  });

  it("atraso abaixo de 30 s é recusado", () => {
    const curto: Desenho = { ...leadNovo, caixas: leadNovo.caixas.map((c) => c.id === "espera" ? { ...c, data: { kind: "atraso", quantidade: 10, unidade: "segundos", janela: null } } : c) };
    const r = compilar({ nome: "x", desenho: curto, regraGravada: null });
    expect(!r.ok && r.problemas).toContainEqual({ caixa: "espera", mensagem: "O atraso mínimo é de 30 segundos." });
  });
});
```

Acrescente também: (a) desenho linear de hoje → `modo: "regra"` e `corpo` igual a `corpoDoDesenho` (prova de que nada muda para quem não usa os passos novos); (b) filtro inicial (regra 2); (c) WhatsApp com `tempo_de_resposta` e **sem** botões → `match_reply` com o ramo único `{ id: "respondeu", label: "Respondeu", op: "contains", pattern: "*" }` (o `*` é "qualquer texto", Tarefa 3), aresta `branch respondeu` para o alvo de `"proximo"`, aresta `branch no_reply` para o alvo de `"nao_respondeu"`, e nenhuma aresta `else`.

- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run lib/escale/automacoes/fluxo/compilar.test.ts` → FAIL.

- [ ] **Passo 3: Implementar `compilar.ts`** seguindo as regras 1–8, em funções pequenas (`modoDoDesenho`, `filtroInicial`, `noDaCaixa`, `respostaDaMensagem`, `arestasDaCaixa`, `problemasDoZod`, `desenhoDoFluxo`, `caixasDasAcoes`), cada uma abaixo de 50 linhas. O arquivo passa de 400 linhas? Separe `desenhoDoFluxo` em `lib/escale/automacoes/fluxo/descompilar.ts`.

- [ ] **Passo 4: Rodar e ver passar** — mesmo comando → PASS.

- [ ] **Passo 5: Commit** — `git commit -m "feat(automacoes): compilador do desenho para regra e fluxo"`.

### Tarefa 8: Gravar e publicar em modo fluxo (servidor)

**Files:**
- Create: `lib/escale/automacoes/fluxo/gravar-modo-fluxo.ts`
- Test: `lib/escale/automacoes/fluxo/gravar-modo-fluxo.test.ts`
- Create: `app/api/v1/automacoes-da-casca/[id]/fluxo/route.ts`
- Modify: a listagem de follow-ups (ache com `git grep -n "followup_flow_pointers" -- app/api/v1/ai/followup-flows/route.ts lib/followup`) para **esconder** `surface = 'crm_automation'`.

**Interfaces:**
- Consumes: `criarFluxo`, `salvarFluxo`, `publicarFluxo` (`lib/followup/escrita-de-fluxo.ts`); a escrita de regra que a rota `PATCH /api/v1/automation-rules/[id]` usa (`lib/automation/regras-escrita.ts`, extraída na paridade: `atualizarRegra`); `compilar` (Tarefa 7).
- Produces: `gravarAutomacaoEmModoFluxo(db, admin, entrada: { organizationId; ruleId; nome; regra; grafo; versaoDaRegra; autor; requestId }): Promise<ResultadoDeEscrita<{ ruleId: string; pointerId: string }>>` e `lerAutomacaoEmModoFluxo(db, { organizationId, ruleId }): Promise<{ regra: RegraGravada; grafo: FlowGraph; pointerId: string } | null>`; `PONTEIRO_DA_AUTOMACAO = (ruleId: string) => \`Automação ${ruleId}\`` (nome único por organização; não aparece em lugar nenhum porque o ponteiro fica escondido).

O que `gravarAutomacaoEmModoFluxo` faz, nesta ordem:
1. Acha o ponteiro da regra: a ação `start_message_flow` da regra gravada cujo ponteiro tem `surface = 'crm_automation'`; não tem → `criarFluxo(db, { surface: "crm_automation", nome: PONTEIRO_DA_AUTOMACAO(ruleId), ... })`.
2. `salvarFluxo(db, { pointerId, alteracoes: { draft_graph: grafo } })`.
3. `publicarFluxo(admin, { pointerId, aprovadoPor: <nome de quem salvou> })` — publicar a automação na tela é o ato humano; falha de publicação (validação) volta com as mensagens do `validateFlowForPublish` e **não** mexe na regra.
4. Atualiza a regra pela escrita de sempre: `{ ...regra, actions: [{ type: "start_message_flow", config: { flow_pointer_id: pointerId } }] }`, com a versão para o controle de conflito que o editor já manda.
5. Falha no passo 4 depois do 3: o fluxo publicado fica sem regra nova, o que é inofensivo (só a regra inscreve); devolve o erro.

**Automação nova em modo fluxo:** a rota aceita `id = "novo"`; aí ela cria a regra (inativa, como toda automação nova da casca) pela escrita de sempre, cria o ponteiro, salva, publica e grava a ação `start_message_flow`, e devolve o id novo. Teste (d) no Passo 1.

Voltar uma automação do modo fluxo para o modo regra (o usuário apagou o Atraso): o `useFluxo` grava a regra pelo caminho de hoje, a ação `start_message_flow` some e o ponteiro fica órfão e escondido. Não apague o ponteiro: inscrições vivas dele terminam pelo fluxo publicado.

- [ ] **Passo 1: Testes (vermelho)** — com dublês de `criarFluxo/salvarFluxo/publicarFluxo/atualizarRegra` (injete por parâmetro `deps` para não mockar módulo): (a) primeira gravação cria ponteiro, salva, publica e grava a regra com `start_message_flow`; (b) segunda gravação reusa o ponteiro (não chama `criarFluxo`); (c) publicação recusada devolve os problemas e não chama `atualizarRegra`.
- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run lib/escale/automacoes/fluxo/gravar-modo-fluxo.test.ts` → FAIL.
- [ ] **Passo 3: Implementar** o arquivo (com `deps` opcional cujo padrão são as funções reais) e a rota: `GET` → `lerAutomacaoEmModoFluxo` (404 quando a regra não está em modo fluxo); `PUT` com corpo Zod `{ nome, desenho, versao }` → `compilar` no servidor (nunca confie no grafo do cliente) → `gravarAutomacaoEmModoFluxo`. Autorização igual à das outras rotas de `automacoes-da-casca` (copie o `requireRole`/organização da rota `[id]/organizacao/route.ts`); a organização vem da sessão, nunca do corpo; `audit` com código novo `automacao.fluxo_publicado` acrescentado **no fim** de `lib/audit/actions.ts`.
- [ ] **Passo 4: Esconder os ponteiros** — na listagem de follow-ups, `.neq("surface", "crm_automation")` (e no MCP de leitura de fluxos, se listar ponteiros: `git grep -n "followup_flow_pointers" -- lib/mcp`).
- [ ] **Passo 5: Rodar e ver passar**, `typecheck` e `eslint` dos arquivos.
- [ ] **Passo 6: Commit** — `git commit -m "feat(automacoes): gravar e publicar automação em modo fluxo"`.
- [ ] **Passo 7: PR da fase** — título "feat(5D): desenho e gravação do fluxo completo"; mergear.

---

## Fase 3 — Tela (PR "5D-tela")

Antes de cada tarefa desta fase, abra os PNGs citados com `Read` e compare com a tela ao terminar. Diferença que sobrar vai por escrito no PR.

### Tarefa 9: Atraso na paleta, no canvas e no painel (07-014, 07-015, 07-028)

**Files:**
- Modify: `lib/escale/automacoes/fluxo/paleta.ts` (item `atraso`, `TipoDoNo` `"atraso"`)
- Modify: `components/escale/automacoes/fluxo/visual-do-fluxo.ts` (visual `atraso`)
- Create: `components/escale/automacoes/fluxo/painel/PainelDoAtraso.tsx`
- Modify: `components/escale/automacoes/fluxo/CorposDoNo.tsx` (corpo do nó Atraso), `painel/PainelDoNo.tsx` (abrir o painel), `useFluxo.ts` (`adicionar("atraso")`)
- Modify: `lib/i18n/dicionario.ts`
- Test: `tests/unit/escale-automacoes-atraso.test.tsx`

**Interfaces:**
- Consumes: `DadosDoAtraso`, `UnidadeDoAtraso`, `ATRASO_MINIMO_MS`, `msDoAtraso` (Tarefa 6); `JanelaDoAtraso` (Tarefa 2).

Detalhes visuais (07-028): painel à esquerda; cabeçalho com fundo rosa muito claro, ícone de relógio vermelho, título "Atraso" com lápis; linha "Condição" (rótulo à esquerda, mesma linha) + seletor "Tempo"; linha com campo numérico e seletor de unidade ("Segundos", "Minutos", "Horas", "Dias"); caixa de seleção azul "Definir tempo limite de continuação" com linha fina abaixo; marcada, mostra "Continuar entre" + dois campos de hora da casca + "e", e o seletor de dias de largura total com "N selecionados"; rodapé "Cancelar" / "Salvar". No nó do canvas (07-026, canto superior esquerdo): título "Atraso" em vermelho com ícone, corpo "Aguardar 3 minutos" e, com janela, "Continuar entre 08:00 e 19:00 · seg a sex". Paleta (3.4): seção "LÓGICA", item "Atraso" / "Aguardar um período", entre "Ações" e "Condições". A opção "Até um campo de data" do seletor "Condição" **não** entra (não está no plano): o seletor mostra só "Tempo".

- [ ] **Passo 1: Teste de componente (vermelho)** — renderiza `PainelDoAtraso` com `{ quantidade: 3, unidade: "minutos", janela: null }`, marca "Definir tempo limite de continuação", troca as horas para 08:00 e 19:00, escolhe seg–sex e clica "Salvar"; espera `onSalvar` com `{ kind: "atraso", quantidade: 3, unidade: "minutos", janela: { de: "08:00", ate: "19:00", dias: [1,2,3,4,5] } }`. Outro caso: 10 segundos mostra "O atraso mínimo é de 30 segundos." e "Salvar" fica desabilitado. Copie o wrapper de providers do teste mais próximo (`git ls-files tests/unit | grep escale-automacoes`) — lembre da memória "provedor escondido pelo teste": o provider de tooltip tem que existir na tela real também.
- [ ] **Passo 2: Rodar e ver falhar** — `corepack pnpm vitest run tests/unit/escale-automacoes-atraso.test.tsx` → FAIL.
- [ ] **Passo 3: Implementar** — painel com os componentes da casca já usados por `EditorDeHorario.tsx`/`LinhaDeHorario.tsx` (5D-horário, 03/11: campo de hora e seletor de dias da casca — reuse os dois em vez de criar outros); paleta e visual (`atraso: { icone: Clock, rotulo: null, texto: "text-casca-fluxo-atraso", borda: "border-casca-fluxo-atraso", fundo: "bg-casca-fluxo-atraso-suave" }`; crie os tokens `casca-fluxo-atraso` e `-suave` ao lado de `casca-fluxo-acoes` no arquivo de tokens da casca, com o vermelho e o rosa claro do PNG 07-028); corpo do nó; `adicionar("atraso")` cria `{ kind: "atraso", quantidade: 1, unidade: "minutos", janela: null }`. Strings novas no dicionário com `es`.
- [ ] **Passo 4: Rodar e ver passar**; `typecheck`/`eslint` dos arquivos.
- [ ] **Passo 5: Commit** — `git commit -m "feat(automacoes): passo Atraso na tela"`.

### Tarefa 10: Condições com grupos e saídas (07-025, 07-026)

**Files:**
- Modify: `components/escale/automacoes/fluxo/painel/PainelDasCondicoes.tsx`
- Modify: `components/escale/automacoes/fluxo/CorposDoNo.tsx` (um bloco por grupo, cada um com a sua alça de saída; faixa vermelha "Não corresponde a nenhuma condição" com alça)
- Modify: `lib/i18n/dicionario.ts`
- Test: `tests/unit/escale-automacoes-condicoes-grupos.test.tsx`

Detalhes visuais (07-025): cada grupo é um cartão com "Corresponde a **todas as condições** ▾" (alterna "todas as condições" / "qualquer condição"), as linhas do grupo em cartões cinza, botão "+" no canto do grupo; abaixo de todos, botão de largura total "+ Novo grupo de condições". No nó (07-026): "Condições" em roxo-marca, cada grupo com "Corresponde a todas as condições" e as linhas resumidas, alça à direita de cada grupo; no fim a faixa rosa "Não corresponde a nenhuma condição" com alça vermelha. "Selecionar negócio" do PNG **não** entra (o negócio é sempre o do contexto).

- [ ] **Passo 1: Teste (vermelho)** — com um grupo, "+ Novo grupo de condições" cria o segundo; trocar para "qualquer condição" muda o `modo`; salvar devolve `grupos` com dois itens e ids estáveis (`g1`, `g2`, gerados por `proximoId`). Caixa antiga sem `grupos` abre como um grupo "todas" com as `linhas` dela.
- [ ] **Passo 2: Rodar e ver falhar**.
- [ ] **Passo 3: Implementar** — o editor de linha continua o `SeletorDeCondicao` de hoje (inclui "Horário atual"); o painel só agrupa. Gravar sempre `grupos` (e `linhas` = linhas do primeiro grupo, para o modo regra continuar lendo `linhas`).
- [ ] **Passo 4: Rodar e ver passar**; typecheck/eslint.
- [ ] **Passo 5: Commit** — `git commit -m "feat(automacoes): condições em grupos com saída"`.

### Tarefa 11: Mensagem do WhatsApp em sequência, com botões e tempo de resposta (07-027)

**Files:**
- Modify: `components/escale/automacoes/fluxo/painel/PainelDaMensagem.tsx` (hoje só tem um texto)
- Create: `components/escale/automacoes/fluxo/painel/mensagem/ListaDeItens.tsx` (os itens da sequência, reordenáveis com setas)
- Create: `components/escale/automacoes/fluxo/painel/mensagem/ItemDeTexto.tsx`, `ItemDeMidia.tsx`, `ItemDePausa.tsx`, `BotoesDaMensagem.tsx`, `TempoDeResposta.tsx`
- Modify: `components/escale/automacoes/fluxo/CorposDoNo.tsx` (corpo do nó com os itens resumidos, cada botão com a sua alça, "Próximo passo" e "Não respondeu")
- Modify: `lib/i18n/dicionario.ts`
- Test: `tests/unit/escale-automacoes-mensagem-sequencia.test.tsx`

**Interfaces:**
- Consumes: `passosSchema`, `PassoDeEnvio`, `RECUSA_PAUSA_NO_COMECO`, `RECUSA_PAUSA_SEGUIDA` (Tarefa 1); `interativoSchema` (`lib/channels/interativo.ts`); a escolha de ativo de mídia que a paridade fez para a regra (ache com `git grep -n "var:" -- components app | grep -i ativo`); `TempoDeResposta` (Tarefa 6).

Detalhes visuais (07-027 e E22): cabeçalho verde-claro com o logo do WhatsApp e "Enviar mensagem" + lápis; "Selecione o dispositivo WhatsApp" (seletor de hoje, com "Canal da conversa"); "Configure sua mensagem" com o "?" de ajuda; a sequência em cartões: texto (caixa de texto com "Adicionar variáveis"), mídia (escolher ativo ou "Áudio do número" `var:<chave>`), pausa ("Aguardar N segundos", campo numérico 1–10). Abaixo do texto, os botões empilhados em cartões brancos ("Sim") e o link tracejado "+ Adicionar botão" (até 10; acima de 3 a tela avisa em cinza "Com mais de 3 opções, a mensagem vai como lista." e grava `tipo: "lista"` com `botaoDaLista: "Ver opções"`); título do botão até 20 caracteres com a mensagem da Clint "O texto do botão deve ter no máximo 20 caracteres". Menu "+ Adicionar" ao fim da lista com "Texto", "Áudio ou arquivo", "Pausa". Seção "Tempo de resposta": caixa "Se o contato não responder em" + número + "Minutos/Horas/Dias" (mínimo 1 minuto: "O tempo mínimo de resposta é de 1 minuto."). Rodapé "Cancelar" / "Salvar". Os blocos "Fora da janela / Dentro da janela" e modelos da Meta do PNG **não** entram nesta frente (o envio de modelo fora da janela segue a regra do canal).

- [ ] **Passo 1: Teste (vermelho)** — montar a sequência do Datacrazy na tela (áudio `var:bv1`, pausa 4, texto com 9 botões, pausa 4, áudio `var:bv2`) e salvar: `onSalvar` recebe `passos` válidos por `passosSchema` com o interativo em `lista`; tentar pausa como primeiro item mostra "O primeiro item da lista não pode ser um atraso." e não adiciona; duas pausas seguidas mostra "Não é possível adicionar mais delay entre as mensagens."; marcar "Se o contato não responder em" 15 minutos grava `tempo_de_resposta: { quantidade: 15, unidade: "minutos" }`.
- [ ] **Passo 2: Rodar e ver falhar**.
- [ ] **Passo 3: Implementar** os componentes (cada um < 200 linhas) e o corpo do nó. Ids de botão: `proximoId(ids, "b")` — estáveis, porque a ligação guarda `botao:<id>`; apagar um botão apaga as ligações dele (no `useFluxo`, Tarefa 12).
- [ ] **Passo 4: Rodar e ver passar**; typecheck/eslint.
- [ ] **Passo 5: Commit** — `git commit -m "feat(automacoes): mensagem em sequência com botões e tempo de resposta"`.

### Tarefa 12: Canvas com várias saídas; carregar e salvar o modo fluxo

**Files:**
- Modify: `components/escale/automacoes/fluxo/NoDoFluxo.tsx` (uma `Handle` `type="source"` por saída de `saidasDaCaixa`, `id` = a saída)
- Modify: `components/escale/automacoes/fluxo/CanvasDoFluxo.tsx` (`onConnect` grava `saida` = `sourceHandle`; uma ligação por saída: ligar de novo a mesma saída troca o alvo)
- Modify: `lib/escale/automacoes/fluxo/nos.ts` (`paraLigacoes` passa `sourceHandle: l.saida ?? "proximo"`)
- Modify: `components/escale/automacoes/fluxo/useFluxo.ts` (carregar e salvar pelos dois modos)
- Modify: `lib/automation/desenho-da-regra.ts` (`percorrer`: uma entrada por caixa continua valendo **só no modo regra**; no modo fluxo várias entradas são permitidas — o "Próximo passo" de dois ramos pode chegar na mesma mensagem)
- Test: `tests/unit/escale-automacoes-modo-fluxo.test.tsx`

**Interfaces:**
- Consumes: `compilar`, `modoDoDesenho`, `desenhoDoFluxo` (Tarefa 7); rota `GET/PUT /api/v1/automacoes-da-casca/[id]/fluxo` (Tarefa 8).

Comportamento:
1. **Abrir.** Se a regra tem uma ação `start_message_flow` só, o `useFluxo` chama `GET .../fluxo`; 200 → desenho = `desenhoDoFluxo(regra, grafo)` com as posições gravadas (sem auto-layout); 404 → caminho de hoje (`desenhoDaRegra` + `organizarNaHorizontal`).
2. **Salvar/Publicar.** `modoDoDesenho(desenho)`: `"regra"` → caminho de hoje (`validarDesenho` + `criar/atualizar`); `"fluxo"` → `compilar` no cliente só para mostrar problemas nas caixas (mesma `toastDaRecusa` e borda vermelha de hoje) e `PUT .../fluxo`. Automação nova em modo fluxo: `PUT .../novo/fluxo` (Tarefa 8) e o `useFluxo` troca a URL como já faz ao criar (`router.replace(rotaDoFluxo(id))`).
3. **Apagar botão ou grupo** remove as ligações daquela saída.
4. **Limite** de 60 caixas no modo fluxo: a paleta desabilita os itens ao chegar e mostra o tooltip "A automação passou do tamanho máximo (60 passos)."

- [ ] **Passo 1: Teste (vermelho)** — com `fetch` dublado: abrir uma regra cujo `GET .../fluxo` devolve o grafo do Lead novo mostra 7 nós e as ligações por botão; ligar a saída "Não corresponde a nenhuma condição" a um Atraso e salvar chama `PUT .../fluxo` com o desenho; apagar o Atraso e os ramos e salvar volta para o `PATCH` de regra de hoje.
- [ ] **Passo 2: Rodar e ver falhar**.
- [ ] **Passo 3: Implementar**.
- [ ] **Passo 4: Rodar e ver passar** + os testes antigos da casca de automações (`corepack pnpm vitest run tests/unit/escale-automacoes`), que provam que o modo regra não mudou.
- [ ] **Passo 5: Commit** — `git commit -m "feat(automacoes): canvas com várias saídas e modo fluxo"`.
- [ ] **Passo 6: PR da fase** — título "feat(5D): tela do fluxo completo nas automações"; mergear.

---

## Fase 4 — Teste da frente, revisão e publicação

### Tarefa 13: Bateria da frente, revisor, conferência visual e publicação

- [ ] **Passo 1: Testes da área, uma vez, em segundo plano** (nunca a suíte inteira):

```bash
corepack pnpm vitest run lib/automation/envio-de-passos.test.ts lib/followup lib/escale/automacoes tests/unit/escale-automacoes
```

Mais `typecheck` (`NODE_OPTIONS=--max-old-space-size=10240`) e `eslint` dos arquivos alterados na frente (`git diff --name-only <base>..escale-crm/main`). Sem migration nesta frente: **não** roda `test:db`. Falha nova: corrigir antes de publicar.

- [ ] **Passo 2: Revisor** — UM `code-reviewer`, modelo **gpt-6.1-sol**, effort high, sobre o diff da frente inteira (substituição aprovada pelo usuário em 04/11/2026 para o Opus 5.5 indisponível neste ambiente). Pontos que o revisor tem que olhar: idempotência dos nós novos no replay do tick (`isReplay`), o `match_reply` com `pattern "*"`, o compilador nunca confiando no grafo do cliente, a organização vindo da sessão na rota, e a pausa dentro do tempo da rodada do worker (soma ≤ 20 s). Critical/Important: corrigir.

- [ ] **Passo 3: Prova pela tela** — `next build` + `next start` num banco fresco do `baseline.sql` (receita do `CLAUDE.md` do repo). Montar o "Lead novo GERAL" inteiro pela tela (sem o editor de follow-up), publicar, mandar uma mensagem de um número de teste e ver: espera de 30 s, negócio criado sem duplicar, ramo de horário, áudio, pausa, lista, toque numa opção gera a tarefa ao dono; e "Se o contato não responder em 1 minuto" sai pelo "Não respondeu".

- [ ] **Passo 4: Conferência visual** — lado a lado com 07-014, 07-015, 07-025, 07-026, 07-027 e 07-028; lista escrita das diferenças que sobraram (as conhecidas: sem "Até um campo de data", sem "Fora/Dentro da janela", sem "Selecionar negócio"), no PR e no `LOG.md`.

- [ ] **Passo 5: Publicar** — conforme o `CLAUDE.md` da pasta `Deskcom CRM` e `docs/runbooks/deploy.md`: próxima tag `vX.Y.Z-escale.N` (`git tag --list "v*-escale.*" --sort=-v:refname | head -1`), release, `promover-stable`, `backup.sh` e `update.sh --to <tag>` na VPS **76.13.228.29**, 3 containers healthy, `/login` 200, logs sem erro. Falhou a conferência: volta para a tag anterior e avisa.

- [ ] **Passo 6: Avisar o usuário** — uma mensagem curta: versão no ar, o que entrou, o que olhar no app, e os quatro limites conhecidos do topo deste plano (um fluxo vivo por contato, Insights por nó, atraso mínimo de 30 s, passos que só existem no modo regra).

---

## Autorrevisão

- **Cobertura do pedido:** Atraso (T2, T9), janela do atraso (T2, T9), ramos de condição (T5, T10), mensagem em sequência com áudio e pausa (T1, T11), botões com saída própria e texto numerado de reserva (T3, T7, T11), esperar resposta com "não respondeu" (T3, T7, T11), ações depois de espera (T4), tudo numa tela só (T6–T8, T12). Descartados pelo usuário: "lead existe", condição de dia separada, anotações.
- **Sem migration:** confirmado pelo desenho (tipos de nó no `jsonb`, ponteiro com `surface` que já existe, ligação regra → fluxo pela ação `start_message_flow` que já existe).
- **Consistência de nomes:** `acoes_da_automacao`, `condicoes_da_automacao`, `grupoQueCasou`, `executarAcoesDaAutomacao`, `instanteNaJanela`, `saidasDaCaixa`, `SaidaDoNo`, `ESPERA_MINIMA_DA_RESPOSTA_MS`, `ESPERA_SEM_LIMITE_MS`, `PONTEIRO_DA_AUTOMACAO` — usados com o mesmo nome nas tarefas que os consomem.
- **Pontos que a execução confere no código antes de escrever (com a regra já decidida aqui):** import circular de `declaredBranchIdSchema` (T5, Passo 3) e a forma de `selectEdge` para ramo declarado (T5, Passo 5).
