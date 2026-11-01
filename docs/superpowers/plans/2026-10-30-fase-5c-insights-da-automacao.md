# Fase 5C — Aba Insights da automação · Implementation Plan

> **Para quem executa:** use superpowers:executing-plans, inline, em Sonnet 5.5 (memória `executar-planos-com-executing-plans`). Os passos usam checkbox (`- [ ]`). É o mesmo padrão dos planos da 5A e da 5B: este plano traz as decisões, os arquivos, as interfaces, o SQL, as regras, as medidas, os textos e os testes; o resto do código é escrito na execução, seguindo os moldes citados.

> **Itens do PRD:** E1 a E5 de `docs/modulos/5-automacoes.md`, a linha "Insights" das seções 5 e 6 e a linha 5C da seção 8. A aba Insights entra nesta frente: o plano da 5B (D5) já a desenhou desligada, à espera desta fase.
> **Frente Automações** (5A → 5B → **5C**: executa tudo, testa tudo uma vez, publica tudo uma vez). **Começa depois do merge da 5B.** Worktree nova `wt-5c` a partir de `escale-crm/main`. Migration **9702**. Um PR (`feat/fase-5c-insights-da-automacao`). **Esta é a última fase da frente:** depois dela vêm a bateria única, o revisor e a publicação (Task 10).

**Goal:** com a casca ligada, na automação aberta no fluxo, a aba **Insights** (07-011, 07-012) mostra a automação **como está gravada**, só para leitura. À esquerda fica o painel com os números do período (Execuções, Sucesso, Com erro, Esperando e Última execução). Em cada passo aparece um "Overview de resultados" com as contagens daquele passo. Clicar num número abre a **Listagem de execuções** (07-029, 07-030): busca pelo contato, filtro "Eventos", total, cartões com contato, negócio, data, status e "Reenviar", 10 por página e "Exportar CSV". Os números saem de `automation_rule_runs`, e o motor não muda.

**Architecture:**
- **Dados:** a migration **9702** cria duas funções de leitura, as duas `security invoker` (a RLS de quem olha decide). A primeira, `fn_escale_resumo_da_automacao`, conta as execuções da regra no período por status e, em cada passo, por resultado (o `actions_result` vem alinhado com a lista de ações). A segunda, `fn_escale_execucoes_da_automacao`, lista as execuções com o contato e o negócio do evento de origem (o mesmo caminho do `buildContext` do motor) e aceita filtro, busca e paginação. Nenhuma tabela é criada e `automation_rule_runs` não muda.
- **Rotas do fork** em `/api/v1/automacoes-da-casca/[id]/insights`, `…/execucoes` e `…/execucoes/csv`, todas com a sessão de quem pede, `requireRole("manager")` e a regra conferida na organização antes da RPC.
- **Tela:** a `TelaDoFluxo` da 5B ganha o estado da aba. Em "Insights" ela desenha `InsightsDoFluxo` (painel + canvas só de leitura) no lugar do canvas, do painel do nó e da paleta. O rascunho do editor fica guardado no `useFluxo`, que não é desmontado. O nó é o mesmo `NoDoFluxo` da 5B: ele lê um contexto (`InsightsDoNo`) e, no modo Insights, mostra o "Overview de resultados" e esconde a barra de hover.
- **Chaves do React Query com o prefixo do original** `["automation-rule-runs", …]`: o "Reenviar" do original (`useResendAutomationRun`) invalida `["automation-rule-runs"]` e, pelo prefixo, o painel e a listagem recarregam sem código a mais.

**Tech Stack:** Next.js 16 App Router, TypeScript estrito, zod 4, React Query, `@xyflow/react` 12, Radix (Dialog, Popover), `lucide-react` 1.x pela `lib/ui/icons-da-casca.ts`, Supabase (RLS, RPC), Vitest + Testing Library; `test:db` (Postgres efêmero via Docker, `gov-helpers`).

## Global Constraints

- **REGRA PÉTREA:** a execução só começa com o "pode fazer" do usuário. Depois disso a entrega até produção é do Claude (CLAUDE.md), e acontece **uma vez, com a frente inteira**, na Task 10.
- **Durante a execução (Tasks 0 a 9):** só o teste que a task cria, `corepack pnpm typecheck` e `corepack pnpm eslint <arquivos>`. **Exceção:** a Task 1 (migration) roda `corepack pnpm test:db tests/invariants/escale-automacoes-9702.test.ts` **uma vez**, porque o baseline só prova o INSTALL assim (memória `baseline-ordem-dos-blocos-do-fork`). A rodada cheia, o `test:db` completo e o `test:db:update` ficam para a bateria (Task 10).
- **Motor intacto:** nenhuma mudança em `lib/automation/**`, `lib/event-log/**`, `app/api/v1/cron/**`, `lib/relogio/**`, `lib/schemas/webhooks.ts` e `app/api/v1/automation-rules/**`. A Task 9 confere com `git diff --stat escale-crm/main -- lib/automation lib/event-log app/api/v1/cron lib/relogio lib/schemas/webhooks.ts app/api/v1/automation-rules` (tem de sair vazio).
- **Migration 9702:** `supabase/migrations/20261201130000_9702_insights_de_automacao.sql` (o carimbo seguinte ao da 9701, `20261201120000`; se a 5A tiver usado outro, pegar o seguinte ao dela). O cabeçalho `-- manifest:` é obrigatório, sem linha no `MANIFEST.md`, e `corepack pnpm checar:colisao-de-migration` roda antes do PR. O bloco vai colado no `supabase/baseline.sql` **logo depois do bloco da 9701** (`grep -n "migration 9701" supabase/baseline.sql`) e antes da varredura de anon, porque cria função.
- **Arquivos do Rafael** só nos encaixes da seção 6, com poucas linhas e o comentário `// FORK ESCALE · Fase 5C: …`. Em arquivo compartilhado (`lib/audit/actions.ts`, `lib/i18n/dicionario.ts`, `app/escale-tema.css`, `supabase/baseline.sql`) o bloco do fork entra no ponto fixo indicado, nunca no fim.
- **Igual à Clint:** cada componente cita a ficha que o define (07-011, 07-012, 07-029, 07-030). Nada de `<select>`, checkbox nativo ou controle do navegador. A conferência lado a lado acontece **na bateria da frente** (regra 4 do CLAUDE.md). Fichas e capturas ficam em `Escale IA OS/clint-documentacao/modulos/07-automacoes/`. **Não escrever caminho de imagem** neste plano nem no PR (cerca `evidencia-citada`): citar só o número da ficha.
- **Nada da Clint aparece sem funcionar** (PRD, seção 12): sem seletor de vários gatilhos, sem "Histórico de versões", sem a faixa "Você está visualizando a última versão publicada", sem percentual por grupo de condição e sem números de "Entregues", "Clicaram" ou "Sem WhatsApp", que o motor não registra.
- **Marca:** onde a Clint usa o roxo (números dos cartões, chip do gatilho, "Exportar CSV", página atual), usar `casca-marca`. O azul do "Eventos" aberto e do contador é o `bg-casca-escuro` do `GatilhoDeFiltro` (o filtro da casca já tem esse estado).
- **Formatos BR:** números com `toLocaleString("pt-BR")` ("9.602"); datas com `dataEHoraBr` de `lib/escale/campanhas/apresentacao.ts` ("10/09/2026 12:39") no fuso da organização; telefone com `formatarTelefone` de `lib/escale/contatos/regras.ts`.
- **Textos de interface** em `lib/i18n/dicionario.ts` (pt e es), lidos por `useT()`/`traduzir()`. Onde a Clint tem texto, usar o dela (`material-do-codigo.md`, seção 3.10).
- **Escrita:** nenhuma rota desta fase grava. O CSV é leitura auditada; o "Reenviar" usa a rota do original, que já confere suporte e papel.
- **Original intacto:** sem a casca, nada muda. A aba Atividade de Webhooks continua igual, e a única mudança nela é a palavra `export` numa função (encaixe 1).
- **Imutabilidade, arquivos pequenos (≤ 400 linhas), sem `console.log`** (o `console.error` com `requestId` nas rotas segue o molde). Usar `corepack pnpm`. Commits convencionais, um por task.

---

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| I1 | **A aba Insights liga sempre que a automação já existe**, ativa ou pausada. Só na automação nova (`/nova`) ela fica desligada, como a 5B já faz | Na Clint ela desliga sem versão publicada. Aqui não há versões, e uma regra pausada também tem execuções antigas para mostrar |
| I2 | **O canvas mostra a regra gravada** (a linha do banco), só para leitura: sem arrastar, sem ligar, sem selecionar e sem paleta. Se houver alterações não salvas no editor, aparece no topo uma pílula como a da Clint, com texto nosso: **"Você está vendo a versão salva. As alterações não salvas não aparecem aqui."** Sem alterações, não há pílula (PRD E1) | Os números são da regra que rodou. O rascunho continua no `useFluxo` e volta intacto na aba Editor |
| I3 | **Cabeçalho no modo Insights (07-011, E4 da Clint):** à direita, "Editar automação" (lápis, texto em cor da marca, com contorno), que volta para a aba Editor, seguido do ⋮. O interruptor e o "Salvar" somem, como o Salvar e o Publicar somem na Clint. O lado esquerdo e as abas ficam como na 5B | Clint |
| I4 | **Definições dos números do painel**, todas tiradas de `automation_rule_runs` da regra no período: **Execuções** = todas as linhas; **Sucesso** = `success`; **Com erro** = `failed` + `partial`; **Esperando** = `adiado`; **Última execução** = a linha mais recente da regra, **fora do filtro de período**. Execuções = Sucesso + Com erro + Esperando | É o que o banco sabe. Assim, clicar em "Execuções" abre uma listagem com exatamente esse total. Cada espera pela janela é uma linha, como na aba Atividade |
| I5 | **Números por passo** saem de `actions_result[i]`, onde `i` é a posição da ação na regra (`acao-{i+1}` no desenho), **e só contam se o tipo for o mesmo** (`actions_result[i].type === actions[i].type`). Fica de fora a linha de **espera pela janela** (`adiado` com um único resultado e `detail.reason = "fora_da_janela_de_envio"`, que o motor grava em `registrarAdiamento`), porque nela nenhum passo foi tentado | Sem versões não há id estável por passo. Exigir o mesmo tipo evita contar uma ação no lugar de outra quando a regra foi editada. A espera é da regra inteira e aparece no painel ("Esperando") |
| I6 | **Cartões de cada passo** (o "Overview de resultados" da Clint, com os rótulos dela, seção 3.10): WhatsApp, E-mail e Mensagem pela IA → **Enviados** (`success`), **Esperando** (`postponed`), **Erro no envio** (`failed` + `skipped`). Enviar Webhook → **Acionaram** (todos), **Webhook falhou** (`failed` + `skipped`). Todas as outras ações (inclusive "A IA decide" e tipo desconhecido) → **Acionaram**, **Com erro**. **Condições** → um cartão **"Passaram"** = Execuções, com a dica "Execuções que passaram nas condições. Quem não passou não fica registrado." **Gatilho:** sem cartões, como no nó do gatilho de 07-012 | O motor só grava a execução quando as condições passam (`no_match` não vira linha). Por isso não há percentual nem "Acionaram" honesto nas condições. `skipped` conta como erro, a mesma regra do agregador do motor |
| I7 | **Período**, um `SeletorDaCasca` no painel: **Últimos 7 dias**, **Últimos 30 dias** (padrão), **Últimos 90 dias** e **Todo o período**. O período é contado para trás a partir de agora (`now() - N dias`), sem fuso. A escolha vale para o painel, para os nós e para a listagem | O PRD (E2 e seção 6) pede período. A Clint não tem e mostra o total geral. 30 dias protege o banco (plano Free, memória `supabase-do-crm-maquina-sem-memoria`) |
| I8 | **Painel (07-012) adaptado a um gatilho:** cabeçalho "Automação"; título **"Resultados da automação"**; descrição **"Quantas vezes ela rodou, quantas deram certo e em qual passo algo falhou. Clique num número para ver as execuções."**; o chip do gatilho em cor da marca dentro da caixa cinza, **sem seta** (não é seletor: há um gatilho só); "Período"; "GERAL"; e os cartões em grade de 2 colunas. O painel abre sozinho ao entrar na aba e recolhe pelo botão redondo de 33 px na borda (07-011) | O título e a descrição da Clint falam em "escolher o gatilho", e aqui não há escolha. O seletor sem função não entra (Global Constraints) |
| I9 | **Listagem de execuções (07-029, 07-030):** é o modal largo da Clint, com o título **"Listagem de execuções"** (a Clint diz "contatos"; aqui cada linha é uma execução). Tem busca pelo nome do contato (espera de 750 ms, sem acento e sem diferença de caixa), o filtro **"Eventos"** com caixinhas, o total **"N execuções"**, os cartões, `PaginacaoDaCasca` com **10 por página** (Clint I4; sem trocar a quantidade) e "Exportar CSV". O filtro "Eventos" tem opções que dependem de onde a listagem foi aberta: pelo painel, os 4 status (**Sucesso**, **Parcial**, **Falhou**, **Aguardando envio**, os rótulos da aba Atividade); por um passo, os cartões daquele passo (I6). Abre com a opção do cartão clicado marcada ("Execuções" e "Acionaram" marcam todas) | Clint, com o que o motor tem |
| I10 | **Cartão da execução** (07-029): foto ou inicial do contato (`FotoDaLinha`) e nome; divisória; telefone e e-mail com os ícones em cor da marca; **data e hora**; **selo do status** (as cores da aba Atividade) no lugar das tags; à direita, **"Ver negócio"** (link para a ficha, `rotaDoNegocio`) e **"Reenviar"**. Quando a execução não deu certo, uma 2ª linha mostra o primeiro passo que não deu certo e o motivo em português (`explicacaoDe` do original). Sem contato: **"Contato não identificado"** | O PRD (E4) pede contato, negócio, data, status e "Reenviar". As tags não estão no PRD e pediriam outra leitura. O motivo responde "em qual passo falhou" (hipótese do PRD) |
| I11 | **"Reenviar"** aparece só quando a execução tem uma ação `call_webhook` com `failed` **e** `event_id` não nulo, a mesma regra da aba Atividade. Ele usa `useResendAutomationRun` e o toast de hoje ("Reenviado.") | A rota do original só reenvia webhook |
| I12 | **Contato e negócio de cada execução** vêm do evento de origem (`event_log` por `event_id`), pelo mesmo caminho do `buildContext`: o negócio pela entidade `crm_lead`/`lead` (`entity_id`) ou pelo `payload.lead_id`; o contato pelo negócio, pela entidade `contact`, pelo compromisso (`calendar_appointment` → `contact_id`), pelo `payload.contact_id` ou pela conversa (`payload.conversation_id`). Se a RLS esconder o negócio ou o contato de quem olha, a tela mostra "—" ou "Contato não identificado" | Os 22 gatilhos chegam ao contato por um desses caminhos (confere a pergunta do PRD E4). `event_log` não é expurgado (manifest da 0587), então execuções antigas também têm contato |
| I13 | **Exportar CSV (E5):** usa os mesmos filtros da listagem, na hora, até **5.000 linhas**. Acima disso a exportação é recusada (422) com o texto da Clint adaptado: **"A lista tem mais de 5.000 execuções. Refine os filtros para exportar um conjunto menor."** Colunas: Data, Contato, Telefone, E-mail, Negócio, Status, Passo com problema, Motivo. Nome do arquivo `execucoes-{nome-da-automacao}-AAAA-MM-DD.csv`. A exportação é auditada (`automation.runs_exported`). Toasts da Clint: "Exportando...", "Exportação realizada com sucesso! Seu arquivo CSV foi gerado e está sendo baixado." e "Não foi possível exportar o arquivo CSV. Tente novamente." | A Clint recusa acima do teto. 5.000 linhas cabem na memória do banco Free; a campanha usa 20.000, mas são linhas sem `jsonb` |
| I14 | **Carregando e erro (07-011):** enquanto os números chegam, os cartões do painel e os do "Overview" de cada nó viram esqueletos. Se a leitura falhar, o painel mostra o `ErroDaLista` "Não foi possível carregar os insights." com "Tentar de novo", e os nós mostram "—". Com zero execuções no período, os números são 0 e o painel mostra "Nenhuma execução neste período." | Clint (07-011). O erro não tem print, então o texto é nosso |
| I15 | **Os números são lidos uma vez** ao entrar na aba e ao trocar o período (`staleTime` de 30 s), sem consulta repetida no relógio | Banco Free (memória `supabase-do-crm-maquina-sem-memoria`) |

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20261201130000_9702_insights_de_automacao.sql` | As funções da seção 2 |
| `lib/escale/automacoes/insights/tipos.ts` | `PeriodoDosInsights`, `ResumoDaAutomacao`, `PassoDoResumo`, `LinhaDaExecucao`, `FiltroDasExecucoes`, `CartaoDeNumero`, `ResultadoDoPasso` |
| `lib/escale/automacoes/insights/regras.ts` | `PERIODOS_DOS_INSIGHTS`, `PERIODO_PADRAO`, `desdeDoPeriodo`, `cartoesDoPainel`, `cartoesDoPasso`, `cartaoDasCondicoes`, `opcoesDosEventos`, `primeiroPassoComProblema`, `podeReenviar` |
| `lib/escale/automacoes/insights/schema.ts` | zod dos parâmetros: `periodoSchema`, `filtroDasExecucoesSchema` |
| `lib/escale/automacoes/insights/banco.ts` | `lerResumo`, `lerExecucoes` (RPC) e `regraDaOrganizacao` |
| `lib/escale/automacoes/insights/csv.ts` | `TETO_DO_CSV_DAS_EXECUCOES`, `csvDasExecucoes`, `nomeDoCsvDasExecucoes` |
| `app/api/v1/automacoes-da-casca/[id]/insights/route.ts` | GET resumo |
| `app/api/v1/automacoes-da-casca/[id]/execucoes/route.ts` | GET listagem paginada |
| `app/api/v1/automacoes-da-casca/[id]/execucoes/csv/route.ts` | GET CSV |
| `hooks/escale/useInsightsDaAutomacao.ts` | `CHAVE_DOS_INSIGHTS`, `useResumoDaAutomacao`, `useExecucoesDaAutomacao`, `baixarCsvDasExecucoes` |
| `components/escale/automacoes/fluxo/insights/contexto.tsx` | `InsightsDoNoProvider`, `useInsightsDoNo` |
| `components/escale/automacoes/fluxo/insights/InsightsDoFluxo.tsx` | Painel, canvas, pílula, botão de recolher e janela; guarda o período e o filtro aberto |
| `components/escale/automacoes/fluxo/insights/PainelDosInsights.tsx` | 400 px, cartões do painel (07-012) |
| `components/escale/automacoes/fluxo/insights/CanvasDosInsights.tsx` | `ReactFlow` só de leitura com a regra gravada |
| `components/escale/automacoes/fluxo/insights/VisaoGeralDoNo.tsx` | "Overview de resultados" no topo do nó (07-011, 07-012) |
| `components/escale/automacoes/fluxo/insights/JanelaDeExecucoes.tsx` | Modal da listagem (07-029) |
| `components/escale/automacoes/fluxo/insights/FiltroDeEventos.tsx` | "Eventos" com caixinhas (07-030) |
| `components/escale/automacoes/fluxo/insights/CartaoDaExecucao.tsx` | O cartão de uma execução (07-029, I10, I11) |
| Mudanças em arquivos da 5B | `TelaDoFluxo.tsx` (estado da aba e troca da área), `CabecalhoDoFluxo.tsx` (modo Insights, I3), `NoDoFluxo.tsx` (lê o contexto), `CanvasDoFluxo.tsx` ou o conversor de nós (seção 5.3) |
| Encaixes (seção 6) | `app/app/webhooks/_components/ActivityTab.tsx`, `lib/audit/actions.ts`, `lib/i18n/dicionario.ts`, `app/escale-tema.css`, `lib/ui/icons-da-casca.ts`, `supabase/baseline.sql` |
| `tests/invariants/escale-automacoes-9702.test.ts` | Invariantes da migration |
| `tests/unit/escale-insights-regras.test.ts`, `-rotas.test.ts`, `-csv.test.ts`, `-hooks.test.tsx`, `-painel.test.tsx`, `-nos.test.tsx`, `-janela.test.tsx`, `-tela.test.tsx` | Unidade |

---

## 1. Regras puras

### 1.1 Tipos (`lib/escale/automacoes/insights/tipos.ts`)

```ts
import type {
  AutomationRuleRunActionResult,
  AutomationRunStatus,
} from "@/hooks/webhooks/useAutomationRules";

export type PeriodoDosInsights = "7d" | "30d" | "90d" | "tudo";

/** Um passo do resumo: as contagens de `actions_result[indice]` com aquele `tipo` (I5). */
export interface PassoDoResumo { indice: number; tipo: string; sucesso: number; erro: number; esperando: number }

export interface ResumoDaAutomacao {
  total: number;
  sucesso: number;
  parcial: number;
  falhou: number;
  adiado: number;
  /** ISO da execução mais recente da regra, fora do período (I4); null sem nenhuma. */
  ultima: string | null;
  passos: PassoDoResumo[];
}

/** O resultado de um passo como a tela agrupa (I6). */
export type ResultadoDoPasso = "sucesso" | "erro" | "esperando";

export interface ContatoDaExecucao { id: string; nome: string; telefone: string | null; email: string | null; temFoto: boolean }
export interface NegocioDaExecucao { id: string; titulo: string }

export interface LinhaDaExecucao {
  id: string;
  status: AutomationRunStatus;
  criadaEm: string;
  eventoId: string | null;
  resultados: AutomationRuleRunActionResult[];
  contato: ContatoDaExecucao | null;
  negocio: NegocioDaExecucao | null;
}

/**
 * O filtro da listagem. Sem `passo`, filtra pelo status da execução; com `passo`,
 * pelo resultado daquele passo (e o tipo dele, I5).
 */
export type FiltroDasExecucoes =
  | { origem: "painel"; situacoes: AutomationRunStatus[] }
  | { origem: "passo"; indice: number; tipo: string; resultados: ResultadoDoPasso[] }
  | { origem: "condicoes" };

/** Um número clicável (painel ou nó). `filtro` null = não abre a listagem (Última execução). */
export interface CartaoDeNumero {
  chave: string;
  rotulo: string;
  valor: number | string;
  filtro: FiltroDasExecucoes | null;
  dica?: string;
}
```

### 1.2 Regras (`lib/escale/automacoes/insights/regras.ts`)

```ts
export const PERIODOS_DOS_INSIGHTS: readonly { valor: PeriodoDosInsights; rotulo: string }[] = [
  { valor: "7d", rotulo: "Últimos 7 dias" },
  { valor: "30d", rotulo: "Últimos 30 dias" },
  { valor: "90d", rotulo: "Últimos 90 dias" },
  { valor: "tudo", rotulo: "Todo o período" },
];
export const PERIODO_PADRAO: PeriodoDosInsights = "30d";

/** ISO do começo do período (agora - N dias); null em "tudo". */
export function desdeDoPeriodo(periodo: PeriodoDosInsights, agora: Date): string | null;

export const TODAS_AS_SITUACOES: readonly AutomationRunStatus[] = ["success", "partial", "failed", "adiado"];

/**
 * I4: Execuções, Sucesso, Com erro, Esperando, Última execução (nessa ordem).
 * `fuso` formata a última com `dataEHoraBr`; sem execução → "—".
 */
export function cartoesDoPainel(resumo: ResumoDaAutomacao, fuso: string): CartaoDeNumero[];

/**
 * I5 + I6: os cartões do passo `indice` com o tipo `tipo`. Soma só as linhas de
 * `resumo.passos` com o mesmo índice E o mesmo tipo; sem linha → zeros.
 */
export function cartoesDoPasso(resumo: ResumoDaAutomacao, indice: number, tipo: string): CartaoDeNumero[];

/** I6: um cartão "Passaram" = resumo.total, com a dica e `filtro: { origem: "condicoes" }`. */
export function cartaoDasCondicoes(resumo: ResumoDaAutomacao): CartaoDeNumero;

/** I9: as opções do "Eventos" para o filtro aberto. */
export function opcoesDosEventos(filtro: FiltroDasExecucoes): { valor: string; rotulo: string }[];

/** I10: o primeiro resultado que não é `success`, com a posição; null se todos deram certo. */
export function primeiroPassoComProblema(
  resultados: readonly AutomationRuleRunActionResult[],
): { indice: number; resultado: AutomationRuleRunActionResult } | null;

/** I11: tem `call_webhook` com `failed` e `eventoId`. */
export function podeReenviar(linha: Pick<LinhaDaExecucao, "eventoId" | "resultados">): boolean;
```

Tabela dos cartões do passo (I6). Os rótulos são chaves do dicionário:

| Tipo da ação | Cartões (ordem) | Filtro de cada um (`resultados`) |
|---|---|---|
| `send_whatsapp_message`, `send_email`, `send_ai_message` | Enviados (`sucesso`), Esperando (`esperando`), Erro no envio (`erro`) | `["sucesso"]`, `["esperando"]`, `["erro"]` |
| `call_webhook` | Acionaram (`sucesso + erro + esperando`), Webhook falhou (`erro`) | `["sucesso","erro","esperando"]`, `["erro"]` |
| qualquer outro (inclui `ai_decide` e desconhecido) | Acionaram, Com erro | igual à linha de cima |

`opcoesDosEventos`:
- `origem: "painel"` → `success` "Sucesso", `partial` "Parcial", `failed` "Falhou", `adiado` "Aguardando envio".
- `origem: "passo"` → os resultados que os cartões do tipo daquele passo cobrem: em envio, `sucesso` "Enviados", `esperando` "Esperando", `erro` "Erro no envio"; em `call_webhook`, `sucesso` "Concluídos", `esperando` "Esperando", `erro` "Webhook falhou"; nos outros tipos, `sucesso` "Concluídos", `esperando` "Esperando", `erro` "Com erro".
- `origem: "condicoes"` → `[]`. Nesse caso o botão "Eventos" fica desligado com a dica "Todas as execuções passaram nas condições.".

### 1.3 Schema (`lib/escale/automacoes/insights/schema.ts`)

```ts
export const periodoSchema = z.enum(["7d", "30d", "90d", "tudo"]).default("30d");

/** Query string da listagem e do CSV. Listas vêm separadas por vírgula. */
export const filtroDasExecucoesSchema = z.object({
  periodo: periodoSchema,
  situacoes: z.string().optional(),   // "success,failed" → validado contra TODAS_AS_SITUACOES
  passo: z.coerce.number().int().min(0).max(9).optional(),
  tipo: z.string().regex(/^[a-z_]{1,40}$/).optional(),
  resultados: z.string().optional(),  // "sucesso,erro" → validado contra ResultadoDoPasso
  busca: z.string().max(80).optional(),
  pagina: z.coerce.number().int().min(1).max(10_000).default(1),
}).strict()
  .refine((f) => (f.passo === undefined) === (f.tipo === undefined), { message: "passo_e_tipo_juntos" });
```

A rota transforma a query no `PedidoDeExecucoes` da seção 1.4. Item de lista desconhecido → 422.

### 1.4 Banco (`lib/escale/automacoes/insights/banco.ts`)

```ts
export const POR_PAGINA_DAS_EXECUCOES = 10;

export interface PedidoDeExecucoes {
  desde: string | null;
  situacoes: AutomationRunStatus[] | null;  // null = todas
  passo: { indice: number; tipo: string; resultados: ResultadoDoPasso[] | null } | null;
  busca: string | null;
  limite: number;
  deslocamento: number;
}

/** `{ id, name }` da regra na organização da sessão; null se não houver (rota → 404). */
export function regraDaOrganizacao(supabase: SupabaseClient, orgId: string, id: string): Promise<{ id: string; name: string } | null>;
export function lerResumo(supabase: SupabaseClient, id: string, desde: string | null): Promise<ResumoDaAutomacao>;
export function lerExecucoes(supabase: SupabaseClient, id: string, pedido: PedidoDeExecucoes): Promise<{ total: number; linhas: LinhaDaExecucao[] }>;
```

`lerResumo` chama `supabase.rpc("fn_escale_resumo_da_automacao", { p_regra, p_desde })` e converte as contagens para `number` (o `jsonb` pode trazer `bigint` como número ou como texto). `lerExecucoes` chama `fn_escale_execucoes_da_automacao` com os parâmetros da seção 2 e mapeia de `snake_case` para `LinhaDaExecucao`. Se a RPC devolver erro, as duas lançam `Error` com a mensagem (a rota responde 500). Molde: `lib/escale/indicadores/paineis/banco.ts` (`rpc("fn_escale_duplicar_painel")`).

### 1.5 CSV (`lib/escale/automacoes/insights/csv.ts`)

```ts
export const TETO_DO_CSV_DAS_EXECUCOES = 5_000;
export const CABECALHO_DO_CSV_DAS_EXECUCOES = [
  "Data", "Contato", "Telefone", "E-mail", "Negócio", "Status", "Passo com problema", "Motivo",
] as const;
/** As colunas acima; `celula` de `lib/escale/exportar/csv-do-quadro` guarda a injeção de fórmula. */
export function csvDasExecucoes(
  linhas: readonly LinhaDaExecucao[],
  acoes: readonly { type: string }[],
  t: (s: string) => string,
  fuso: string,
  motivo: (r: AutomationRuleRunActionResult) => string | null,
): string;
/** "execucoes-boas-vindas-2026-10-30.csv", no molde de `nomeDoCsvDaCampanha`. */
export function nomeDoCsvDasExecucoes(nome: string, agora: Date, fuso: string): string;
```

"Passo com problema" é `"{n}. {rótulo da ação}"`, com `n` = índice + 1 e o rótulo de `ACTION_LABELS` de `app/app/webhooks/_components/labels.ts`. "Status" usa os rótulos de I9. "Motivo" vem da função `motivo` (a rota passa `explicacaoDe` do encaixe 1 com o `t` do idioma). Sem contato, as colunas de contato ficam vazias.

---

## 2. Banco (migration 9702)

```sql
-- manifest: **Insights de automação (fork Escale, Fase 5C).** Funções de leitura, todas `security invoker` (a RLS de `automation_rule_runs`, `event_log`, `crm_leads`, `contacts`, `calendar_appointments` e `conversations` decide o que quem olha vê): `fn_escale_resumo_da_automacao` conta as execuções de uma regra no período por status e, por passo, por resultado (`actions_result` alinhado com `actions`), sem contar a espera pela janela; `fn_escale_execucoes_da_automacao` lista as execuções com o contato e o negócio do evento de origem (o mesmo caminho do `buildContext` do motor), com filtro por status ou por resultado de um passo, busca pelo nome do contato e paginação (até 5.001 linhas, para o CSV saber que passou do teto). Ajudantes imutáveis `fn_escale_execucao_e_espera`, `fn_escale_uuid_ou_nulo` e `fn_escale_sem_acento`. Sem tabela nova e sem índice novo: o `idx_automation_rule_runs_rule (rule_id, created_at desc)` da 0038 serve. O motor e `automation_rule_runs` não mudam.
-- ---- FORK ESCALE · insights de automação (migration 9702) ----

-- A espera pela janela (lib/automation/engine.ts, registrarAdiamento): nenhum passo foi tentado.
create or replace function public.fn_escale_execucao_e_espera(p_status text, p_resultados jsonb)
returns boolean language sql immutable set search_path = public, pg_temp as $$
  select coalesce(
    p_status = 'adiado'
    and jsonb_typeof(p_resultados) = 'array'
    and jsonb_array_length(p_resultados) = 1
    and p_resultados -> 0 -> 'detail' ->> 'reason' = 'fora_da_janela_de_envio',
    false);
$$;

create or replace function public.fn_escale_uuid_ou_nulo(p text)
returns uuid language sql immutable set search_path = public, pg_temp as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end;
$$;

create or replace function public.fn_escale_sem_acento(p text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select translate(lower(coalesce(p, '')),
    'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn');
$$;

create or replace function public.fn_escale_resumo_da_automacao(p_regra uuid, p_desde timestamptz)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  with execucoes as (
    select r.status, r.actions_result
    from public.automation_rule_runs r
    where r.rule_id = p_regra and (p_desde is null or r.created_at >= p_desde)
  ),
  contagem as (
    select count(*) as total,
           count(*) filter (where status = 'success') as sucesso,
           count(*) filter (where status = 'partial') as parcial,
           count(*) filter (where status = 'failed') as falhou,
           count(*) filter (where status = 'adiado') as adiado
    from execucoes
  ),
  passos as (
    select (a.ordem - 1)::int as indice,
           coalesce(a.item ->> 'type', '') as tipo,
           count(*) filter (where a.item ->> 'status' = 'success') as sucesso,
           count(*) filter (where a.item ->> 'status' in ('failed', 'skipped')) as erro,
           count(*) filter (where a.item ->> 'status' = 'postponed') as esperando
    from execucoes e
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(e.actions_result) = 'array' then e.actions_result else '[]'::jsonb end
    ) with ordinality as a(item, ordem)
    where not public.fn_escale_execucao_e_espera(e.status, e.actions_result)
    group by 1, 2
  )
  select jsonb_build_object(
    'total', c.total, 'sucesso', c.sucesso, 'parcial', c.parcial, 'falhou', c.falhou, 'adiado', c.adiado,
    'ultima', (select max(r.created_at) from public.automation_rule_runs r where r.rule_id = p_regra),
    'passos', coalesce((select jsonb_agg(jsonb_build_object(
                 'indice', p.indice, 'tipo', p.tipo, 'sucesso', p.sucesso, 'erro', p.erro, 'esperando', p.esperando)
               order by p.indice, p.tipo) from passos p), '[]'::jsonb))
  from contagem c;
$$;

create or replace function public.fn_escale_execucoes_da_automacao(
  p_regra uuid,
  p_desde timestamptz,
  p_situacoes text[],
  p_passo int,
  p_tipo text,
  p_resultados text[],
  p_busca text,
  p_limite int,
  p_deslocamento int
)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  with execucoes as (
    select r.id, r.status, r.actions_result, r.created_at, r.event_id,
           e.entity_kind, e.entity_id, e.payload
    from public.automation_rule_runs r
    left join public.event_log e on e.id = r.event_id
    where r.rule_id = p_regra
      and (p_desde is null or r.created_at >= p_desde)
      and (p_passo is not null or p_situacoes is null or r.status = any (p_situacoes))
      and (p_passo is null or (
        not public.fn_escale_execucao_e_espera(r.status, r.actions_result)
        and r.actions_result -> p_passo ->> 'type' = p_tipo
        and (case r.actions_result -> p_passo ->> 'status'
               when 'success' then 'sucesso'
               when 'failed' then 'erro'
               when 'skipped' then 'erro'
               when 'postponed' then 'esperando'
             end) = any (coalesce(p_resultados, array['sucesso', 'erro', 'esperando']))))
  ),
  alvos as (
    select x.*,
      case when x.entity_kind in ('crm_lead', 'lead')
           then coalesce(x.entity_id, public.fn_escale_uuid_ou_nulo(x.payload ->> 'lead_id'))
           else public.fn_escale_uuid_ou_nulo(x.payload ->> 'lead_id') end as lead_id,
      case when x.entity_kind = 'contact' then x.entity_id
           else public.fn_escale_uuid_ou_nulo(x.payload ->> 'contact_id') end as contato_direto,
      case when x.entity_kind = 'calendar_appointment' then x.entity_id end as compromisso_id,
      public.fn_escale_uuid_ou_nulo(x.payload ->> 'conversation_id') as conversa_id
    from execucoes x
  ),
  resolvidas as (
    select a.id, a.status, a.actions_result, a.created_at, a.event_id,
           l.id as negocio_id, l.title as negocio_titulo,
           c.id as contato_id, c.name as contato_nome, c.phone_number as contato_telefone,
           c.email as contato_email, (c.avatar_storage_path is not null) as contato_tem_foto
    from alvos a
    left join public.crm_leads l on l.id = a.lead_id
    left join public.calendar_appointments ap on ap.id = a.compromisso_id
    left join public.conversations cv on cv.id = a.conversa_id
    left join public.contacts c on c.id = coalesce(l.contact_id, a.contato_direto, ap.contact_id, cv.contact_id)
    where p_busca is null or btrim(p_busca) = ''
       or strpos(public.fn_escale_sem_acento(c.name), public.fn_escale_sem_acento(btrim(p_busca))) > 0
  )
  select jsonb_build_object(
    'total', (select count(*) from resolvidas),
    'linhas', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at desc, p.id desc)
      from (select * from resolvidas order by created_at desc, id desc
            limit least(greatest(coalesce(p_limite, 10), 1), 5001)
            offset greatest(coalesce(p_deslocamento, 0), 0)) p), '[]'::jsonb));
$$;

revoke all on function public.fn_escale_execucao_e_espera(text, jsonb) from public, anon;
revoke all on function public.fn_escale_uuid_ou_nulo(text) from public, anon;
revoke all on function public.fn_escale_sem_acento(text) from public, anon;
revoke all on function public.fn_escale_resumo_da_automacao(uuid, timestamptz) from public, anon;
revoke all on function public.fn_escale_execucoes_da_automacao(uuid, timestamptz, text[], int, text, text[], text, int, int) from public, anon;
grant execute on function public.fn_escale_execucao_e_espera(text, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_uuid_ou_nulo(text) to authenticated, service_role;
grant execute on function public.fn_escale_sem_acento(text) to authenticated, service_role;
grant execute on function public.fn_escale_resumo_da_automacao(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.fn_escale_execucoes_da_automacao(uuid, timestamptz, text[], int, text, text[], text, int, int) to authenticated, service_role;

comment on function public.fn_escale_resumo_da_automacao(uuid, timestamptz) is
  'Fork Escale (9702): contagens da aba Insights (lib/escale/automacoes/insights). Invoker: a RLS decide.';
comment on function public.fn_escale_execucoes_da_automacao(uuid, timestamptz, text[], int, text, text[], text, int, int) is
  'Fork Escale (9702): listagem de execuções da aba Insights com contato e negócio do evento. Invoker: a RLS decide.';

notify pgrst, 'reload schema';
```

Antes de colar, conferir no baseline os nomes que o SQL usa: `crm_leads.title`, `contacts.name`, `contacts.phone_number`, `contacts.avatar_storage_path`, `calendar_appointments.contact_id` e `conversations.contact_id` (foram conferidos em 30/10; conferir de novo na `main` da execução). Se `fn_escale_sem_acento` ou `fn_escale_uuid_ou_nulo` já existirem com corpo diferente, **renomear as daqui** com o sufixo `_9702` e não mexer nas outras.

---

## 3. Rotas

Molde: `app/api/v1/campanhas-da-casca/[id]/csv/route.ts` e as rotas da 5A (`randomUUID` como `requestId`, `requireRole("manager", { requestId, resource: "automation_rules" })`, `ok`/`fail`, `traduzir`, `console.error` com o `requestId` no `catch`). Se o id da rota não for uuid, a resposta é 404 sem tocar no banco. Toda rota lê primeiro a regra com `regraDaOrganizacao` (404 "Regra não encontrada.") e depois chama a RPC. Query inválida → 422 "Falha na validação dos dados!".

| Rota | Faz | Respostas | Auditoria |
|---|---|---|---|
| `GET /api/v1/automacoes-da-casca/[id]/insights?periodo=30d` | `lerResumo(supabase, id, desdeDoPeriodo(periodo, new Date()))` | 200 `ResumoDaAutomacao` | — |
| `GET /[id]/execucoes?periodo&situacoes&passo&tipo&resultados&busca&pagina` | `filtroDasExecucoesSchema` → `lerExecucoes` com `limite = 10`, `deslocamento = (pagina - 1) * 10` | 200 `{ total, linhas }` | — |
| `GET /[id]/execucoes/csv?…` (os mesmos parâmetros, sem `pagina`) | `lerExecucoes` com `limite = TETO + 1`, `deslocamento = 0`; com mais de `TETO` linhas → 422 `lista_grande_demais` e a mensagem de I13; senão `csvDasExecucoes(...)` e a resposta `text/csv; charset=utf-8` com `content-disposition` e `cache-control: no-store` | 200 CSV, 422, 404 | `automation.runs_exported` (`metadata: { linhas, periodo }`) |

A rota do CSV lê o fuso com `fusoDaOrganizacao` (de `lib/escale/contatos/lista`) e as ações com `select("id, name, actions")` (a `regraDaOrganizacao` do CSV usa essa variante; ela é a única que precisa de `actions`).

---

## 4. Hooks (`hooks/escale/useInsightsDaAutomacao.ts`)

```ts
/** Prefixo do original: o Reenviar (useResendAutomationRun) invalida ["automation-rule-runs"] e isto recarrega. */
export const CHAVE_DOS_INSIGHTS = ["automation-rule-runs", "insights"] as const;

export function useResumoDaAutomacao(id: string | null, periodo: PeriodoDosInsights): UseQueryResult<ResumoDaAutomacao>;
// queryKey [...CHAVE_DOS_INSIGHTS, "resumo", id, periodo]; enabled: id !== null; staleTime 30_000; refetchOnWindowFocus false (I15).

export function useExecucoesDaAutomacao(
  id: string,
  periodo: PeriodoDosInsights,
  filtro: FiltroDasExecucoes,
  selecionados: readonly string[],
  busca: string,
  pagina: number,
): UseQueryResult<{ total: number; linhas: LinhaDaExecucao[] }>;
// queryKey [...CHAVE_DOS_INSIGHTS, "execucoes", id, periodo, filtro, selecionados, busca, pagina];
// placeholderData: keepPreviousData; staleTime 30_000.

/** "Exportar CSV": fetchComTempoMaximo (leitura) → 422 lança Error com a mensagem da resposta; 200 → baixarCsv. */
export async function baixarCsvDasExecucoes(id: string, query: string, nome: string, fuso: string): Promise<void>;
```

`selecionados` são as opções marcadas no "Eventos". A função `queryDasExecucoes(periodo, filtro, selecionados, busca, pagina?)`, no mesmo arquivo e exportada para teste, monta a query: painel → `situacoes=…`; passo → `passo`, `tipo`, `resultados=…`; condições → nada além de período e busca. Leituras pelo `apiClient` (molde dos hooks da 5A).

---

## 5. Telas

Medidas tiradas de 07-011 e 07-012 (janela de 1536×735) e da seção 6 do `material-do-codigo.md`. Cores e fontes pelos tokens `casca-*`. A raiz de `InsightsDoFluxo` tem `data-escale-fluxo` **e** `data-escale-fluxo-insights` (o CSS da seção 6, encaixe 4, se pendura no segundo).

### 5.1 Troca de aba (`TelaDoFluxo`, `CabecalhoDoFluxo`; I1–I3)

- `TelaDoFluxo` guarda `const [aba, setAba] = useState<"editor" | "insights">("editor")` e passa ao cabeçalho `aba`, `aoMudarAba` e `insightsDisponivel={regra !== null}`.
- Ao trocar para "insights": fecha o painel do nó (passando pelo guarda de rascunho da 5B, D13, com "Configuração … não salva" se houver rascunho no painel) e desenha `<InsightsDoFluxo regra={regra} fuso={fuso} sujo={estado.sujo} />` no lugar de `CanvasDoFluxo` + `PainelDoNo` + `PaletaDoFluxo`. As janelas da 5B continuam montadas. O `useFluxo` não é desmontado, então o rascunho e o `sujo` ficam guardados.
- `CabecalhoDoFluxo` com `aba === "insights"`: à direita, `BotaoDaCasca variante="texto" tamanho="sm"` com `className="gap-1.5 border border-casca-divisoria text-casca-marca-forte"`, `Pencil` 14 e "Editar automação" → `aoMudarAba("editor")`; depois o `MenuDoFluxo` de sempre. O interruptor e o "Salvar" ficam fora. O selo, o "Salvo há" e as abas não mudam.
- `regra` é a linha que o `FluxoDaCasca` leu (`useAutomationRule`). Depois de um "Salvar" na aba Editor, a 5B já atualiza essa leitura (`invalidateQueries(["automation-rules"])`), e o Insights mostra a versão nova.

### 5.2 `InsightsDoFluxo` (07-011, 07-012)

Props: `{ regra: AutomationRuleRow; fuso: string; sujo: boolean }`. Estado local: `periodo` (`PERIODO_PADRAO`), `painelAberto` (começa `true`, I8) e `listagem: FiltroDasExecucoes | null`. Lê `useResumoDaAutomacao(regra.id, periodo)`. Layout: `relative flex h-full min-h-0 flex-1`.
- `PainelDosInsights` à esquerda quando `painelAberto`.
- `CanvasDosInsights` ocupando o resto, dentro de `<InsightsDoNoProvider valor={{ resumo, carregando, erro, aoAbrir: setListagem }}>`.
- **Botão de recolher (07-011, 07-012):** `button` redondo 33×33 `absolute top-1/2 z-20 -translate-y-1/2 rounded-full bg-casca-divisoria text-casca-texto-2 grid place-items-center`, com `left-[400px] -translate-x-1/2` aberto e `left-4` fechado; `ChevronLeft` / `ChevronRight` 16; `aria-label` "Recolher painel" / "Abrir painel".
- **Pílula (I2)** só com `sujo`: `absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-lg border border-casca-divisoria bg-surface px-3 py-1.5 text-[12px] font-semibold text-casca-texto shadow-sm`.
- `JanelaDeExecucoes` quando `listagem !== null`.

### 5.3 Canvas só de leitura (`CanvasDosInsights`)

`ReactFlow` com `nodes` e `edges` montados pelo **mesmo conversor de desenho para nós que o `useFluxo` da 5B usa**, a partir de `organizarNaHorizontal(desenhoDaRegra(regraGravadaDe(regra)))`. A Task 0 confere onde ele está. Se estiver dentro do hook, a Task 4 o extrai para `lib/escale/automacoes/fluxo/nos.ts` (função pura `nosDoDesenho(desenho, extras)`), sem mudar comportamento, e o `useFluxo` passa a importá-lo. Os mesmos `nodeTypes` e `defaultEdgeOptions` do `CanvasDoFluxo` (exportar as constantes de lá, se ainda não forem exportadas). Também: `nodesDraggable={false}`, `nodesConnectable={false}`, `elementsSelectable={false}`, `edgesFocusable={false}`, `panOnDrag`, `zoomOnScroll`, `minZoom={0.25}`, `maxZoom={1.15}`, `fitView`, `fitViewOptions={{ padding: 0.2, maxZoom: 1 }}`, `deleteKeyCode={null}`, sem `onEdgeClick`/`onNodeClick`/`onConnect`, e `Controls position="bottom-left" showInteractive`. Fundo `bg-casca-fluxo` e sem paleta.

### 5.4 Nó no modo Insights (`NoDoFluxo` + `VisaoGeralDoNo`; 07-011, 07-012; I5, I6, I14)

- `contexto.tsx`: `InsightsDoNoProvider` e `useInsightsDoNo(): { resumo: ResumoDaAutomacao | null; carregando: boolean; erro: boolean; aoAbrir: (f: FiltroDasExecucoes) => void } | null` (null fora dos Insights).
- `NoDoFluxo`: com `useInsightsDoNo() !== null`, renderiza `<VisaoGeralDoNo id={id} dados={data} />` como primeiro filho do cartão, não renderiza a `BarraDoNo` e ignora as bordas de seleção e de problema (fica a borda `casca-divisoria`). Sem o contexto, o nó é o da 5B, sem mudança.
- `VisaoGeralDoNo`: nada no gatilho. Nas condições, `[cartaoDasCondicoes(resumo)]`. Numa ação `acao-{n}`, `cartoesDoPasso(resumo, n - 1, dados.acao.type)`. Seção `px-5 pt-4 pb-3 border-b border-casca-divisoria`: "Overview de resultados" 13 px 500 `casca-texto`, `mb-2`. Linha `flex flex-wrap gap-2` de cartões `nodrag nopan min-w-[88px] rounded-lg bg-casca-raia px-2.5 py-2 text-left hover:bg-casca-marca-suave`, com o rótulo 12 px `casca-texto-2` e o número 14 px 600 `casca-marca` (`toLocaleString("pt-BR")`); `title` = `dica` quando houver; clique → `aoAbrir(cartao.filtro)`. Carregando: 3 esqueletos `h-[52px] w-[88px] rounded-lg bg-casca-raia animate-pulse` (07-011); nas condições, 1. Erro: os cartões com "—" e desligados.

### 5.5 Painel (`PainelDosInsights`, 07-012; I4, I7, I8, I14)

`section` `w-[400px] shrink-0 flex flex-col border-r border-casca-divisoria bg-surface text-[12px]`. Props: `{ regra; fuso; periodo; aoMudarPeriodo; consulta: UseQueryResult<ResumoDaAutomacao>; aoAbrir }`.
- Cabeçalho 49 px `px-6 flex items-center gap-2 border-b border-casca-divisoria`: `Workflow` 18 `casca-texto-2` e "Automação" 14 px 500.
- Corpo `flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4`:
  - "Resultados da automação" 13 px 600 `casca-texto`; a descrição de I8, 12 px `casca-suave`, `leading-7` (a Clint usa espaçamento de linha largo).
  - Caixa `rounded-md bg-casca-raia px-3 py-2.5`: o chip `inline-flex rounded bg-casca-marca px-1.5 py-0.5 text-[11px] font-medium text-white` com o título do gatilho (`opcaoDoEvento(regra.trigger_event)?.titulo` traduzido; sem opção, o `TRIGGER_LABELS` do original).
  - "Período": rótulo 12 px 500 e `SeletorDaCasca` (`PERIODOS_DOS_INSIGHTS` traduzidos, `aria-label` "Período").
  - "GERAL" 10 px 500 maiúsculas `tracking-wide casca-suave`.
  - Grade `grid grid-cols-2 gap-4` de cartões `rounded-xl bg-casca-raia px-3 py-2.5 text-left` (cerca de 170×60 px): na linha de cima, o ícone 13 e o rótulo 12 px `casca-texto-2`; embaixo, o valor 15 px 700 `casca-marca`. Ícones: Execuções `Play`, Sucesso `CircleCheck`, Com erro `CircleX`, Esperando `Clock`, Última execução `CalendarClock` (valor 13 px, `col-span-2`, sem clique). Os outros são `button` → `aoAbrir(cartao.filtro)`.
  - Com `total === 0`: "Nenhuma execução neste período." 12 px `casca-suave` embaixo da grade.
  - Carregando: os 5 cartões com esqueleto no lugar do valor. Erro: `ErroDaLista` "Não foi possível carregar os insights." com "Tentar de novo" → `consulta.refetch()`.

### 5.6 Listagem (`JanelaDeExecucoes`, `FiltroDeEventos`, `CartaoDaExecucao`; 07-029, 07-030; I9–I13)

Props: `{ regra; fuso; periodo; filtroInicial: FiltroDasExecucoes; aoFechar }`. Estado: `selecionados` (começa com as opções que o cartão clicado marca: no painel, `filtroInicial.situacoes`; no passo, `filtroInicial.resultados`), `busca` e `pagina` (volta para 1 quando a busca ou os selecionados mudam).
- `JanelaDaCasca` com `className="w-[min(80rem,calc(100vw-2rem))] h-[min(92dvh,56rem)] max-h-[92dvh] grid-rows-[auto_auto_1fr_auto] gap-0 p-0"`.
- Cabeçalho `px-6 py-4 border-b border-casca-divisoria flex items-center justify-between`: `DialogTitle` "Listagem de execuções" 15 px 600; o X vem da janela.
- Barra `px-6 pt-5 flex items-center gap-4`: `CampoDeBuscaDaLista` (`rotulo` "Buscar", `atrasoMs={750}`, `className="h-9 flex-1 rounded-md bg-casca-busca px-3 text-[13px]"`, com a lupa à direita); `FiltroDeEventos`; `BotaoDaCasca variante="marca"` "Exportar CSV" / "Exportando..." (desligado enquanto exporta ou com total 0).
- Abaixo, à direita: **"N execuções"** (`toLocaleString("pt-BR")`; "1 execução" no singular) 13 px 500.
- Lista `mx-6 my-3 overflow-y-auto rounded-lg bg-casca-fluxo p-4 flex flex-col gap-3`: os `CartaoDaExecucao`. Carregando: 5 cartões-esqueleto de 64 px. Vazio: "Nenhuma execução encontrada." centralizado. Erro: `ErroDaLista` "Não foi possível carregar as execuções." com "Tentar de novo".
- Rodapé `px-6 pb-4`: `PaginacaoDaCasca` com `porPagina={10}` e `opcoesPorPagina={[10]}` (o "por página" fica fixo).
- **`FiltroDeEventos`**: `Popover` com `PopoverTrigger asChild` + `GatilhoDeFiltro rotulo="Eventos" contagem={selecionados.length}` (aberto, ele fica escuro como em 07-030). Dentro, `PainelSuspenso` com uma `CaixaDaCasca` por opção de `opcoesDosEventos(filtro)`. Desmarcar a última opção não é permitido (a caixa fica marcada e desligada), porque a lista vazia não teria sentido. Em `origem: "condicoes"`, o gatilho fica desligado com a dica de 1.2.
- **`CartaoDaExecucao`** (`rounded-lg border border-casca-divisoria bg-surface px-6 py-3 shadow-sm`, 64 px na primeira linha): `grid grid-cols-[minmax(0,2fr)_1px_minmax(0,2fr)_auto_auto_auto] items-center gap-6`:
  1. `FotoDaLinha` (`id`, `nome`, `temFoto`) + nome 13 px 500 `truncate`. Sem contato: um círculo cinza e "Contato não identificado" `casca-suave`.
  2. Divisória `h-10 w-px bg-casca-divisoria`.
  3. Coluna: `MessageCircle` 13 `casca-marca` + `formatarTelefone(telefone)`; `Mail` 13 `casca-marca` + e-mail `truncate` (cada linha só aparece se tiver valor).
  4. Data `dataEHoraBr(criadaEm, fuso)` 12 px `casca-texto-2`.
  5. Selo do status 11 px `rounded px-1.5 py-0.5`: Sucesso `bg-success-bg text-success-fg`; Falhou `bg-error-bg text-error-fg`; Parcial `bg-warning-bg text-warning-fg`; Aguardando envio `bg-info-bg text-info-fg` (as cores do selo da aba Atividade).
  6. Ações `flex items-center gap-3 text-[13px]`: "Ver negócio" (`Link` para `rotaDoNegocio(negocio.id)`, `text-casca-texto hover:underline`; sem negócio, nada); "Reenviar" (`BotaoDaCasca variante="texto" tamanho="sm"` com `Send` 13; só com `podeReenviar`; desligado durante a mutação; `onSuccess` → `toast.success(t("Reenviado."))`).
  - 2ª linha, só com `primeiroPassoComProblema`: `mt-2 text-[12px] casca-texto-2`, com "Passo {n} · {rótulo da ação}:" e `explicacaoDe(resultado, t) ?? resultado.error ?? t("Essa ação não funcionou.")`.
- **Exportar:** `toast.info(t("Exportando..."))` → `baixarCsvDasExecucoes(...)` → `toast.success("Exportação realizada com sucesso! Seu arquivo CSV foi gerado e está sendo baixado.")`. Erro de teto → `toast.error` com a mensagem da rota; outro erro → `toast.error("Não foi possível exportar o arquivo CSV. Tente novamente.")`.

---

## 6. Encaixes nos arquivos do original

Cada encaixe leva `// FORK ESCALE · Fase 5C: …` (ou `{/* … */}` em JSX).

1. **`app/app/webhooks/_components/ActivityTab.tsx`**: `function explicacaoDe` passa a `export function explicacaoDe`, com `// FORK ESCALE · Fase 5C: o cartão da execução dos Insights usa a mesma frase.` Nada mais muda no arquivo (o `motivo-de-parada-tem-frase.test.ts` continua lendo o mesmo mapa).
2. **`lib/audit/actions.ts`**: depois do bloco da 5A (`grep -n "Fase 5A" lib/audit/actions.ts`), `// FORK ESCALE · Fase 5C: exportação das execuções de uma automação (Insights).` + `"automation.runs_exported"`.
3. **`lib/i18n/dicionario.ts`**: os textos da seção 7, no bloco da 5B (logo depois dele), conferindo antes se a chave já existe (`grep -n '"Sucesso"\|"Falhou"\|"Parcial"\|"Aguardando envio"\|"Reenviado."\|"Período"' lib/i18n/dicionario.ts`), sem duplicar.
4. **`app/escale-tema.css`**, logo **depois** do bloco `FORK ESCALE · Fase 5B (fluxo de automação …)`:
   ```css
   /* ─── FORK ESCALE · Fase 5C (Insights da automação, 07-011/07-012) ───
      No canvas só de leitura a aresta não apaga: sem a lixeira e sem engrossar. */
   [data-escale-fluxo-insights] .react-flow__edge {
     cursor: default;
   }
   [data-escale-fluxo-insights] .react-flow__edge:hover .react-flow__edge-path {
     stroke-width: 2px;
   }
   [data-escale-fluxo-insights] .react-flow__handle {
     cursor: default;
   }
   ```
5. **`lib/ui/icons-da-casca.ts`**: os ícones que faltarem entre `Play`, `CircleCheck`, `CircleX`, `Clock`, `CalendarClock`, `Workflow`, `ChevronLeft`, `ChevronRight`, `MessageCircle`, `Mail`, `Send` e `Pencil` (conferir com `grep` antes; a 5A e a 5B já puseram vários).
6. **`supabase/baseline.sql`**: o bloco da seção 2 depois do bloco da 9701 (Global Constraints).

---

## 7. Textos (pt → es)

Da Clint (`material-do-codigo.md` 3.10): Overview de resultados → Resumen de resultados; Execuções → Ejecuciones; Acionaram → Activaron; Enviados → Enviados; Esperando → Esperando; Erro no envio → Error en el envío; Webhook falhou → Webhook falló; Com erro → Con error; Eventos → Eventos; Exportar CSV → Exportar CSV; Exportando... → Exportando...; Exportação realizada com sucesso! Seu arquivo CSV foi gerado e está sendo baixado. → ¡Exportación realizada con éxito! Su archivo CSV fue generado y se está descargando.; Não foi possível exportar o arquivo CSV. Tente novamente. → No fue posible exportar el archivo CSV. Inténtelo de nuevo.; Geral → General; Automação → Automatización; Buscar → Buscar; Editar automação → Editar automatización.

Nossos (adaptações): Resultados da automação → Resultados de la automatización; Quantas vezes ela rodou, quantas deram certo e em qual passo algo falhou. Clique num número para ver as execuções. → Cuántas veces se ejecutó, cuántas salieron bien y en qué paso algo falló. Haga clic en un número para ver las ejecuciones.; Período → Período; Últimos 7 dias → Últimos 7 días; Últimos 30 dias → Últimos 30 días; Últimos 90 dias → Últimos 90 días; Todo o período → Todo el período; Sucesso → Éxito; Última execução → Última ejecución; Nenhuma execução neste período. → Ninguna ejecución en este período.; Não foi possível carregar os insights. → No fue posible cargar los insights.; Tentar de novo → Intentar de nuevo; Passaram → Pasaron; Execuções que passaram nas condições. Quem não passou não fica registrado. → Ejecuciones que pasaron las condiciones. Quien no pasó no queda registrado.; Todas as execuções passaram nas condições. → Todas las ejecuciones pasaron las condiciones.; Concluídos → Concluidos; Você está vendo a versão salva. As alterações não salvas não aparecem aqui. → Está viendo la versión guardada. Los cambios no guardados no aparecen aquí.; Recolher painel → Contraer panel; Abrir painel → Abrir panel; Listagem de execuções → Listado de ejecuciones; {n} execuções → {n} ejecuciones; 1 execução → 1 ejecución; Nenhuma execução encontrada. → Ninguna ejecución encontrada.; Não foi possível carregar as execuções. → No fue posible cargar las ejecuciones.; Contato não identificado → Contacto no identificado; Ver negócio → Ver negocio; Passo → Paso; A lista tem mais de 5.000 execuções. Refine os filtros para exportar um conjunto menor. → La lista tiene más de 5.000 ejecuciones. Refine los filtros para exportar un conjunto menor.; Regra não encontrada. → Regla no encontrada.; as colunas do CSV (Data → Fecha; Contato → Contacto; Telefone → Teléfono; E-mail → Correo electrónico; Negócio → Negocio; Status → Estado; Passo com problema → Paso con problema; Motivo → Motivo).

Já existentes no original (conferir, não duplicar): Sucesso, Falhou, Parcial, Aguardando envio, Reenviar, Reenviado., Essa ação não funcionou.

---

## 8. Tasks

Cada task segue a mesma ordem: escrever o teste (RED); rodar `corepack pnpm vitest run <arquivo>` e ver falhar; implementar; ver passar; rodar `corepack pnpm typecheck` e `corepack pnpm eslint <arquivos>`; commit.

### Task 0: Worktree e conferência da 5A e da 5B
- [ ] `git -C repo fetch escale-crm`; conferir que a 5B está na main: `git -C repo log escale-crm/main --oneline | grep -i "fluxo de automação"` (tem de aparecer). Se não estiver, **parar** e avisar.
- [ ] `git -C repo worktree add ../wt-5c -b feat/fase-5c-insights-da-automacao escale-crm/main`; `corepack pnpm install --frozen-lockfile` em `wt-5c`; copiar este plano para `wt-5c/docs/superpowers/plans/`.
- [ ] Conferir o que a 5C consome da 5B e ajustar o plano se algo divergir: as props reais de `AbasDoFluxo` (`insightsDisponivel`) e de `CabecalhoDoFluxo`; onde o `useFluxo` converte o desenho em nós (seção 5.3); se `nodeTypes` e `defaultEdgeOptions` do `CanvasDoFluxo` são exportados; o nome do bloco CSS da 5B no `app/escale-tema.css`; `opcaoDoEvento` (`lib/escale/automacoes/fluxo/gatilhos.ts`); o carimbo da 9701.
- [ ] Conferir na main as colunas da seção 2 (`grep -n` no baseline) e se `fn_escale_sem_acento`/`fn_escale_uuid_ou_nulo` já existem.

### Task 1: Migration 9702, baseline e invariantes
**Files:** create a migration (seção 2); colar o bloco no `supabase/baseline.sql` (Global Constraints); create `tests/invariants/escale-automacoes-9702.test.ts` (molde `tests/invariants/escale-paineis-9602.test.ts`: `seedGov()`, `como(userId, sql)`, `lastLine`; ids `e5ca1e00-9702-4000-8000-…`).
- [ ] Semente (como superusuário): na `GOV_ORG`, um contato com nome "Joao Acentuação Teste", outro contato, um negócio (`crm_leads`) do primeiro contato, uma regra com 2 ações (`send_whatsapp_message`, `call_webhook`); quatro linhas de `event_log` (uma `crm_lead` com `entity_id` = negócio, uma `contact` com `entity_id` = 2º contato, uma `message` com `payload.contact_id`, uma `calendar_appointment` com um compromisso do 1º contato) e execuções: `success` com os dois resultados `success` (há 2 dias, evento `crm_lead`); `failed` com `[failed, skipped]` (há 2 dias, evento `contact`); `adiado` de espera (`[{type:"send_whatsapp_message",status:"postponed",detail:{reason:"fora_da_janela_de_envio"}}]`, ontem, evento `message`); `adiado` comum (`[postponed, success]`, ontem, evento do compromisso); `partial` com `[success, failed]` (há 40 dias, evento `crm_lead`); e `success` com `event_id` nulo (há 45 dias). Uma regra na outra organização com uma execução.
- [ ] Invariantes das funções: `anon` não executa nenhuma das 5; `authenticated` executa. `fn_escale_uuid_ou_nulo('x')` → nulo e com um uuid → o uuid; `fn_escale_sem_acento('ÁÇÃO')` → `'acao'`; `fn_escale_execucao_e_espera` verdadeira só para a linha de espera.
- [ ] **Resumo** como gerente, desde 30 dias: `total` 4, `sucesso` 1, `falhou` 1, `parcial` 0, `adiado` 2, `ultima` = a mais recente (de ontem); passo 0 `send_whatsapp_message`: `sucesso` 1, `erro` 1, `esperando` 1 (a espera **não** conta); passo 1 `call_webhook`: `sucesso` 2, `erro` 1. Sem período (`null`): `total` 6, `sucesso` 2 e `parcial` 1; o `ultima` é o mesmo. Numa segunda regra da `GOV_ORG`, só para este caso, uma execução com `send_whatsapp_message` e outra com `send_email` no índice 0 saem em duas linhas de passo (`order by indice, tipo`), sem somar uma na outra.
- [ ] **Listagem**: desde 30 dias e sem filtro, `total` 4 em ordem decrescente de data; a linha do `crm_lead` traz `negocio_id`, `negocio_titulo` e o 1º contato; a do `contact` traz o 2º contato e `negocio_id` nulo; a do `message` traz o contato do `payload`; a do compromisso traz o 1º contato. Sem período, `total` 6, e a de `event_id` nulo traz contato e negócio nulos. `p_situacoes = '{failed}'` → 1. `p_passo = 1, p_tipo = 'call_webhook', p_resultados = '{erro}'` → 1; `p_passo = 0, p_tipo = 'call_webhook'` → 0 (tipo diferente); `p_passo = 0, p_tipo = 'send_whatsapp_message'` sem `p_resultados` → 3 (a espera fica de fora). `p_busca = 'ACENTUACAO'` acha as 2 execuções do 1º contato (sem acento e sem caixa); `p_busca = '%'` → 0 (não é curinga). `p_limite = 2, p_deslocamento = 2` → 2 linhas e `total` 4; `p_limite = 999999` não passa de 5.001.
- [ ] **RLS:** como gerente da `GOV_ORG`, a regra da outra organização dá `total` 0 nas duas funções; como agente (`GOV_AGENT_A`), as funções rodam (a RLS de `automation_rule_runs` é por organização), mas os negócios que ele não pode ver saem com `negocio_id` nulo. Escrever o que a RLS da main devolve de fato: o papel é conferido na rota.
- [ ] Rodar `corepack pnpm test:db tests/invariants/escale-automacoes-9702.test.ts` (com o Docker aberto) até ficar verde; `corepack pnpm checar:colisao-de-migration`.
- [ ] Commit: `feat(escale): migration 9702 (insights de automação)`.

### Task 2: Regras, schema, banco e CSV
**Files:** create `lib/escale/automacoes/insights/{tipos,regras,schema,banco,csv}.ts`; tests `tests/unit/escale-insights-regras.test.ts` e `tests/unit/escale-insights-csv.test.ts`.
**Produces:** tudo da seção 1 (nomes e tipos exatos).
- [ ] Testes das regras: `desdeDoPeriodo("7d", agora)` = agora menos 7 × 24 h em ISO; `"tudo"` → null. `cartoesDoPainel`: a ordem Execuções, Sucesso, Com erro, Esperando, Última execução; "Com erro" = `falhou + parcial`; os filtros `["success","partial","failed","adiado"]`, `["success"]`, `["failed","partial"]`, `["adiado"]` e `null`; sem `ultima` → "—"; com `ultima` → `dd/mm/aaaa HH:mm` no fuso. `cartoesDoPasso` para WhatsApp → Enviados, Esperando, Erro no envio; para `call_webhook` → Acionaram (soma) e Webhook falhou; para `add_tag` e para `xyz` → Acionaram e Com erro; o tipo diferente no mesmo índice não soma; sem linha → zeros. `cartaoDasCondicoes` → "Passaram" = `total`, com a dica. `opcoesDosEventos` nas três origens (seção 1.2). `primeiroPassoComProblema([success, skipped, failed])` → índice 1; tudo `success` → null. `podeReenviar`: webhook `failed` com evento → true; sem evento → false; webhook `success` → false; `send_email` `failed` → false.
- [ ] Testes do schema: `periodo` ausente → "30d"; `passo` sem `tipo` → erro; `passo = 10` → erro; chave desconhecida → erro (`.strict()`); `busca` com 81 caracteres → erro.
- [ ] Testes do CSV: o cabeçalho na ordem; a data em `dd/mm/aaaa HH:mm`; o telefone formatado; "Passo com problema" = `"2. Enviar Webhook"` (o rótulo do original) e o motivo da função recebida; sem contato, as colunas vazias; um nome começando com `=` é neutralizado pela `celula`; `nomeDoCsvDasExecucoes("Boas-vindas à Clínica", …)` → `execucoes-boas-vindas-a-clinica-AAAA-MM-DD.csv`.
- [ ] `banco.ts` sem teste próprio: ele é exercitado pelos testes das rotas (Task 3) com o `supabase` falso e pela Task 1 contra o banco.
- [ ] Implementar; rodar; commit: `feat(escale): regras e CSV dos insights de automação`.

### Task 3: Rotas
**Files:** create as três rotas da seção 3, o código no `lib/audit/actions.ts` (encaixe 2) e os textos de rota no dicionário; test `tests/unit/escale-insights-rotas.test.ts` (molde `tests/unit/escale-detalhe-da-campanha-rotas.test.ts` e `-csv.test.ts`: `requireRole`, `createClient` e `audit` mockados, `authOk` de `tests/helpers/stages-db-double`).
- [ ] Testes: id que não é uuid → 404 sem `createClient`; regra de outra org (a leitura devolve `null`) → 404 "Regra não encontrada." e nenhuma RPC; agente → a resposta do `requireRole`. **insights**: `periodo=7d` → RPC `fn_escale_resumo_da_automacao` com `p_regra` e `p_desde` a 7 dias (relógio falso); `periodo=xx` → 422; erro da RPC → 500. **execucoes**: `pagina=3` → `p_limite` 10 e `p_deslocamento` 20; `situacoes=success,failed` → `p_situacoes ["success","failed"]` e `p_passo` nulo; `situacoes=ok` → 422; `passo=1&tipo=call_webhook&resultados=erro` → `p_passo 1`, `p_tipo`, `p_resultados ["erro"]` e `p_situacoes` nulo; a resposta tem `total` e as linhas em `camelCase`. **csv**: 5.001 linhas → 422 `lista_grande_demais` com a mensagem de I13 e sem `audit`; 2 linhas → 200, `content-type` CSV, `content-disposition` com o nome da 1.5, `cache-control: no-store`, e `audit` com `automation.runs_exported` e `metadata.linhas = 2`; a chamada usou `p_limite` 5.001 e `p_deslocamento` 0.
- [ ] Implementar; rodar; commit: `feat(escale): rotas dos insights de automação`.

### Task 4: Hooks e canvas só de leitura
**Files:** create `hooks/escale/useInsightsDaAutomacao.ts`, `components/escale/automacoes/fluxo/insights/{contexto.tsx,CanvasDosInsights.tsx}`; se a Task 0 achou o conversor dentro do `useFluxo`, create `lib/escale/automacoes/fluxo/nos.ts` e passar o `useFluxo` a importá-lo; tests `tests/unit/escale-insights-hooks.test.tsx`.
- [ ] Testes dos hooks (`QueryClientProvider` e `apiClient` mockados): `useResumoDaAutomacao(null, …)` não pede nada; com id, pede `/api/v1/automacoes-da-casca/r1/insights?periodo=30d`; a chave começa com `["automation-rule-runs", "insights"]`; `invalidateQueries({ queryKey: ["automation-rule-runs"] })` faz pedir de novo (a prova de que o "Reenviar" recarrega). `queryDasExecucoes` nas três origens, com busca e página. `baixarCsvDasExecucoes`: 422 → lança `Error` com a mensagem do corpo; 200 → chama `baixarCsv` com o nome e o texto (`fetchComTempoMaximo` e `baixarCsv` mockados).
- [ ] Se houve a extração para `nos.ts`: rodar os testes da 5B do fluxo (`corepack pnpm vitest run tests/unit/escale-fluxo-*`), que têm de seguir verdes.
- [ ] Implementar (seções 4 e 5.3); rodar; commit: `feat(escale): hooks e canvas só de leitura dos insights`.

### Task 5: Nó com o "Overview de resultados"
**Files:** create `components/escale/automacoes/fluxo/insights/VisaoGeralDoNo.tsx`; modify `components/escale/automacoes/fluxo/NoDoFluxo.tsx`; test `tests/unit/escale-insights-nos.test.tsx` (o nó renderizado solto dentro do `ReactFlowProvider` e do `InsightsDoNoProvider`, como nos testes da 5B).
- [ ] Testes: sem o contexto, o nó é o da 5B (a barra aparece com o hover/seleção e não há "Overview de resultados"). Com o contexto: no gatilho, nenhum cartão; nas condições, "Overview de resultados" e "Passaram" com o total em `pt-BR` ("9.602") e a dica no `title`; no WhatsApp `acao-1`, Enviados/Esperando/Erro no envio com os números do passo 0; no `call_webhook` `acao-2`, Acionaram (soma) e Webhook falhou; clicar "Erro no envio" chama `aoAbrir({ origem: "passo", indice: 0, tipo: "send_whatsapp_message", resultados: ["erro"] })`; carregando → 3 esqueletos (1 nas condições); erro → "—" e os botões desligados; a `BarraDoNo` não aparece; um nó com `problemas` não ganha `border-casca-alerta`.
- [ ] Implementar (seção 5.4); rodar também `tests/unit/escale-fluxo-nos.test.tsx` (da 5B, tem de seguir verde); commit: `feat(escale): overview de resultados nos passos do fluxo`.

### Task 6: Painel dos insights
**Files:** create `components/escale/automacoes/fluxo/insights/PainelDosInsights.tsx`; test `tests/unit/escale-insights-painel.test.tsx`.
- [ ] Testes: "Automação", "Resultados da automação", a descrição e o chip "Tag adicionada ao contato" (regra `contact.tag_added`), **sem** botão de seta no chip; "Período" com "Últimos 30 dias", e escolher "Últimos 7 dias" chama `aoMudarPeriodo("7d")`; "GERAL"; os 5 cartões com "9.602", "Com erro" = falhou + parcial e "Última execução" com data BR; clicar "Sucesso" chama `aoAbrir({ origem: "painel", situacoes: ["success"] })`; "Última execução" não é botão; total 0 → "Nenhuma execução neste período."; carregando → esqueletos; erro → "Não foi possível carregar os insights." e "Tentar de novo" chama `refetch`.
- [ ] Implementar (seção 5.5); rodar; commit: `feat(escale): painel dos insights da automação`.

### Task 7: Listagem de execuções e CSV na tela
**Files:** create `JanelaDeExecucoes.tsx`, `FiltroDeEventos.tsx`, `CartaoDaExecucao.tsx`; modify `app/app/webhooks/_components/ActivityTab.tsx` (encaixe 1); test `tests/unit/escale-insights-janela.test.tsx` (`useExecucoesDaAutomacao`, `useResendAutomationRun`, `baixarCsvDasExecucoes` e `toast` mockados).
- [ ] Testes: o título "Listagem de execuções"; "Buscar"; "Eventos" com o contador = opções marcadas; "Exportar CSV"; "12 execuções" e "1 execução"; o cartão com nome, telefone `(53) 98455-5965`, e-mail, data `dd/mm/aaaa HH:mm`, o selo "Falhou" e "Ver negócio" com `href` `/app/negocios/{id}`; sem contato → "Contato não identificado"; sem negócio → sem "Ver negócio"; "Reenviar" só com webhook `failed` e evento, e clicar chama `mutate(run.id)` e o toast "Reenviado."; a 2ª linha "Passo 2 · Enviar Webhook:" com a frase de `explicacaoDe`. Aberta pelo painel com `["success"]`, o "Eventos" mostra 4 opções com só "Sucesso" marcada; desmarcar a última não é possível; marcar "Falhou" pede de novo com as duas e volta à página 1. Aberta por um passo de WhatsApp → as 3 opções de envio; pelas condições → "Eventos" desligado com a dica. Paginação: total 25 → 3 páginas, e clicar "2" pede a página 2. Exportar: "Exportando...", depois o toast de sucesso; erro de teto → o toast com a mensagem da rota; erro qualquer → "Não foi possível exportar o arquivo CSV. Tente novamente."; total 0 → botão desligado. Vazio → "Nenhuma execução encontrada."; erro → "Não foi possível carregar as execuções.".
- [ ] Rodar também `tests/unit/motivo-de-parada-tem-frase.test.ts` e `tests/unit/atividade-motivo-de-parada-na-tela.test.tsx` (do original, têm de seguir verdes).
- [ ] Implementar (seção 5.6); rodar; commit: `feat(escale): listagem de execuções da automação com exportar CSV`.

### Task 8: A aba no fluxo (tela, cabeçalho, textos e CSS)
**Files:** create `components/escale/automacoes/fluxo/insights/InsightsDoFluxo.tsx`; modify `TelaDoFluxo.tsx`, `CabecalhoDoFluxo.tsx`, `lib/i18n/dicionario.ts` (encaixe 3), `app/escale-tema.css` (encaixe 4), `lib/ui/icons-da-casca.ts` (encaixe 5); test `tests/unit/escale-insights-tela.test.tsx` (molde do `escale-fluxo-cabecalho.test.tsx` da 5B: os componentes de canvas e de painel mockados nos pontos de contato).
- [ ] Testes do cabeçalho: com regra, a aba "Insights" ligada; na nova, desligada; em Insights, aparece "Editar automação" e somem "Salvar" e o interruptor, e "Editar automação" volta para o Editor; o ⋮ continua.
- [ ] Testes da tela: entrar em Insights troca o canvas, a paleta e o painel do nó pelo `InsightsDoFluxo` e abre o painel dos insights; com um rascunho no painel do nó, entrar em Insights pede "Configuração do passo não salva"; com `sujo`, a pílula "Você está vendo a versão salva…" aparece, e sem `sujo` não aparece; voltar ao Editor mantém o `sujo` e o nome do rascunho (o `useFluxo` não foi desmontado); "Recolher painel" esconde o painel, e o botão vira "Abrir painel"; clicar um cartão do painel abre a "Listagem de execuções" com o filtro do cartão; fechar a janela volta ao canvas; trocar o período pede o resumo do período novo.
- [ ] Teste do CSS: o `app/escale-tema.css` tem o bloco `Fase 5C` com `[data-escale-fluxo-insights] .react-flow__edge` (ler o arquivo e procurar o texto).
- [ ] Textos da seção 7 no dicionário (pt e es); rodar `corepack pnpm vitest run tests/unit/i18n*`, se existir teste de completude do dicionário.
- [ ] Implementar (seções 5.1 e 5.2); rodar; rodar também `tests/unit/escale-fluxo-*` (da 5B, verdes); commit: `feat(escale): aba Insights no fluxo de automação da casca`.

### Task 9: Fechamento da fase
- [ ] `corepack pnpm typecheck`; `corepack pnpm eslint lib/escale/automacoes app/api/v1/automacoes-da-casca components/escale/automacoes hooks/escale/useInsightsDaAutomacao.ts app/app/webhooks/_components/ActivityTab.tsx lib/ui/icons-da-casca.ts tests/unit/escale-insights-*`; `corepack pnpm vitest run tests/unit/escale-insights-* tests/unit/escale-fluxo-* tests/unit/escale-automacoes-*`.
- [ ] Cercas da casca: `corepack pnpm vitest run -c vitest.cercas.ts`. Corrigir o que apontar sem mexer na cerca. O que já falhava na main fica anotado (LOG de 29/10).
- [ ] Motor intacto: o `git diff --stat` das Global Constraints sai vazio. Original: `git diff --stat escale-crm/main -- app/app/webhooks` mostra só `ActivityTab.tsx` (1 linha).
- [ ] Olhar a tela no navegador local (`corepack pnpm dev`, casca ligada, uma automação com execuções no banco local): entrar em Insights, trocar o período, abrir a listagem pelo painel e por um passo, buscar, paginar, exportar e voltar ao Editor com um rascunho. Anotar o que não bate com 07-011, 07-012, 07-029 e 07-030 para a conferência da bateria.
- [ ] Auto-revisão do diff pela checklist de `code-review.md`.
- [ ] PR para `escale-crm/main` com o corpo: os itens do PRD (E1–E5); as decisões I1–I15; o que é provisório (texto do painel, pílula do rascunho, cartões por tipo de passo, "Passaram", período, cartão da execução sem tags, 2ª linha do motivo, teto de 5.000, erro do painel); as diferenças aceitas (um gatilho sem seletor, sem percentual nas condições, sem "Entregues/Clicaram", listagem por execução e não por contato, sem histórico de versões); como testar; e a nota "não publica sozinho: fecha a frente Automações, que vai inteira na Task 10". Merge direto. Atualizar `LOG.md` (feito, onde estamos, próximo: bateria da frente).
- [ ] Commit do LOG: `docs: LOG da fase 5C`.

### Task 10: Bateria, revisão e publicação da Frente Automações (5A + 5B + 5C)
Vale o CLAUDE.md ("Velocidade" e "A entrega até produção é do Claude").
- [ ] Worktree `wt-bateria-5` a partir de `escale-crm/main` (com as três fases). Em segundo plano: os testes unitários completos, `corepack pnpm test:db` e `corepack pnpm test:db:update` (migrations 9701 e 9702). Falha nova → corrigir num PR `fix/frente-automacoes-bateria` antes de seguir. Falhas que já existiam na main ficam anotadas.
- [ ] Um revisor **Opus 5.5** (`code-reviewer`, effort high) sobre o diff da frente inteira (`git diff <base-da-5A>..escale-crm/main`), com o foco em RLS das 9701/9702, no "mesmo corpo" da 5B e nas funções `invoker` da 9702. Critical/Important → corrigir e reconferir. Fable só se a RLS pedir.
- [ ] **Conferência visual uma vez para o módulo** (regra 4 do CLAUDE.md): abrir no navegador, com a casca ligada, a lista, o fluxo e os Insights; comparar lado a lado com 07-001 a 07-010, 07-013 a 07-016, 07-022, 07-025 a 07-027, 07-029 a 07-032, 07-011 e 07-012; escrever a lista das diferenças que sobraram. Diferença sem justificativa já aprovada → corrigir antes de publicar, ou parar e perguntar ao usuário.
- [ ] Publicar: tag `v1.81.0-escale.N` (a seguinte à última), release, esperar o `promover-stable`, `backup.sh`, `update.sh --to <tag>` na VPS (memória `vps-producao-do-crm`; conferir antes o `df`, memória `vps-disco-cheio-imagens-antigas`). Conferir: 3 containers healthy, `/login` 200, sem erro nos logs, e no banco (só leitura) as 3 tabelas e as funções da 9701, as 5 funções da 9702 e `anon` sem execução nelas. Se a conferência falhar, voltar para a versão anterior e avisar.
- [ ] Atualizar o `LOG.md` e mandar ao usuário uma mensagem curta: a versão no ar, o que entrou e o que olhar no app (Automações no topo, criar pelos dois caminhos, o fluxo e os Insights).

---

## 9. Critério de pronto (linha 5C da seção 8 do PRD)

- Com a casca, a automação já criada tem a aba Insights. Ela mostra o canvas só de leitura com o "Overview de resultados" em cada passo, o painel com os números do período e a listagem de execuções com busca, "Eventos", paginação, "Ver negócio", "Reenviar" e "Exportar CSV".
- **Os números batem com `automation_rule_runs`:** os invariantes da Task 1 provam as contagens e a listagem contra o Postgres. "Execuções" do painel é o mesmo total da listagem aberta por ele.
- O diff do motor sai vazio, e o original só ganha o `export` do encaixe 1.
- Os testes de unidade das Tasks 2 a 8 estão verdes, assim como os da 5B e da 5A que a fase toca. As cercas não têm falha nova.
- **Igual às imagens 07-011, 07-012, 07-029 e 07-030 nos itens adotados**, conferido lado a lado na bateria (Task 10), com a lista das diferenças escrita. As diferenças já previstas e justificadas são as do PR (Task 9) e a cor da marca Escale IA no lugar do roxo.

## 10. Riscos desta fase

| Risco | Mitigação |
|---|---|
| Número de passo errado depois de editar a regra (sem versões) | Exige o mesmo tipo no mesmo índice (I5). O que sobra (duas ações do mesmo tipo trocadas de lugar) fica registrado como limitação no PR |
| Consulta pesada no banco Free (regra com dezenas de milhares de execuções) | Período padrão de 30 dias, índice `(rule_id, created_at desc)`, leitura uma vez por abertura (I15), teto de 5.001 linhas na listagem e no CSV. Na bateria, medir `fn_escale_resumo_da_automacao` com "Todo o período" na maior regra do banco de produção (`explain analyze`, só leitura). Acima de 2 s → tirar "Todo o período" e avisar |
| Contato errado na listagem para algum gatilho | O caminho é o mesmo do `buildContext`, e a Task 1 cobre as quatro formas de evento (lead, contato, mensagem, compromisso) e o evento nulo |
| A RLS de `crm_leads` (acesso por origem, 1J) esconder o negócio | Mostra "—" sem "Ver negócio"; o contato continua aparecendo se for visível. É o comportamento certo: quem não vê o negócio não o abre |
| O `NoDoFluxo` mudar o fluxo da 5B sem querer | O modo Insights só liga com o contexto. O teste da Task 5 prova o nó sem contexto, e os testes da 5B rodam nas Tasks 4, 5 e 8 |
| A extração do conversor de nós mudar o desenho do editor | É uma função pura, movida sem mudar nada. Os testes da 5B (inclusive o do mesmo corpo) rodam na Task 4 |
| A 5B não mergeada ou com nomes diferentes | A Task 0 confere e para |
| Prints que faltam (números carregados nos nós, PRD seção 11) | Os cartões dos passos ficam provisórios no PR; pedir o print na conferência |

## 11. Perguntas ao usuário (não bloqueiam a execução)

1. **I6 (Condições):** o nosso sistema só registra a automação quando as condições passam. Então a caixa de Condições mostra só "Passaram: N" (o mesmo número das execuções), sem o percentual da Clint. Pode?
2. **I9 e I10 (listagem):** na Clint cada linha é um contato, com as tags dele. Aqui cada linha é uma execução, com o status e o motivo do passo que falhou no lugar das tags, porque isso responde "em qual passo falhou". Pode?
3. **I7 (período):** a Clint mostra o total de sempre. Aqui o padrão é "Últimos 30 dias", e "Todo o período" fica como opção, para não pesar o banco. Pode?
4. **I13 (CSV):** o teto é de 5.000 execuções por arquivo; acima disso, a tela pede para refinar o filtro, como na Clint. Serve?
5. Um print que ajudaria (só olhar, sem salvar nada na Clint): a aba Insights com os números já carregados num passo de WhatsApp e num de Ações.
