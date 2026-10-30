# Fase 5A — Lista de automações da casca · Implementation Plan

> **Para quem executa:** use superpowers:executing-plans, inline, em Sonnet 5.5 (memória `executar-planos-com-executing-plans`). Steps use checkbox (`- [ ]`) syntax for tracking. Mesmo padrão dos planos da 7A/7B: decisões, arquivos, interfaces, regras, SQL, textos e testes escritos aqui; o código restante é escrito na execução seguindo os moldes citados.

> **Itens do PRD:** A1–A3, B1–B6, B8, B10–B15, B17, B18 e D1 de `docs/modulos/5-automacoes.md`; seções 5 (permissões), 6 (filtros), 7 (dados) e a linha 5A da seção 8. Respostas do usuário às perguntas 1, 3 e 4 da seção 10 (30/10/2026) na tabela de decisões abaixo.
> **Frente Automações** (5A → 5B → 5C; executa tudo, testa tudo uma vez, publica tudo uma vez). Worktree nova `wt-5a` a partir de `escale-crm/main`. Migration **9701**. Um PR (`feat/fase-5a-lista-de-automacoes`). A branch `fix/automacao-salvar-versao-velha` (pré-requisito da 5B) **já está na main** (conferido em 30/10).

**Goal:** com a casca ligada, o "Automações" do menu do topo abre `/app/automacoes`: a lista da Clint (07-001 a 07-010, 07-031, 07-032) com trilho de pastas, favoritos, busca, filtros Status e Agente, tabela ordenável e paginada, seleção em lote e o menu ⋮; "Nova automação +" pergunta o nome, a pasta e **como montar** (No fluxo / No editor) e abre a forma escolhida; clicar no nome abre a automação **na forma em que ela foi criada**. O motor não muda.

**Architecture:**
- **Dados:** três tabelas novas do fork na **9701** (pastas, a "ficha da casca" de cada regra com pasta e forma, e favoritos por pessoa) e uma função `fn_escale_duplicar_automacao`. `automation_rules` **não muda**. Rotas do fork em `/api/v1/automacoes-da-casca…` com a **sessão de quem pede** (`createClient()`): a RLS decide. Ligar/pausar, renomear e excluir uma automação usam as rotas que já existem (`/api/v1/automation-rules/[id]`), sem mudança.
- **Lista inteira de uma vez:** a rota devolve todas as regras da organização (teto 1.000), as pastas e os agentes; busca, filtros, ordem, contagens do trilho e paginação são feitas no navegador (regras puras em `lib/escale/automacoes/`). A Clint pagina no servidor; o comportamento visível é o mesmo e a base de regras de uma empresa é pequena (a da Clint dos prints tem 31).
- **Criar não grava nada antes do primeiro Salvar:** o motor exige gatilho e pelo menos uma ação (`createAutomationRuleSchema`). O modal leva nome e pasta para a forma escolhida; quando o fluxo ou o editor criam a regra, a pasta e a forma são gravadas logo em seguida pela rota do fork.
- **Casca ligada ou não:** `/app/automacoes` só existe com a casca (`lerPreferenciaDeMenu(...) === "topo"`); sem a casca, redireciona para `/app/webhooks?aba=automacoes`, que segue como hoje. Com a casca, a aba "Automações" de Webhooks some e `?aba=automacoes` vai para a lista nova.
- **Chave do React Query com o prefixo do original:** a lista da casca usa `["automation-rules", "da-casca"]`. As mutações do original invalidam `["automation-rules"]`, que pelo casamento por prefixo também recarrega a lista da casca. Assim o editor e o fluxo, que gravam pelas mutações do original, atualizam a lista nova sem nenhuma linha a mais.

**Tech Stack:** Next.js 16 App Router, TypeScript estrito, zod 4, React Query, Radix (Dialog, DropdownMenu, Popover), `lucide-react` 1.x pela `lib/ui/icons-da-casca.ts`, Supabase (RLS), Vitest + Testing Library; `test:db` (Postgres efêmero via Docker, `gov-helpers`).

## Global Constraints

- **REGRA PÉTREA:** a execução só começa com o "pode fazer" do usuário. Depois, a entrega é do Claude, mas **nada desta frente vai para produção antes da 5C** (CLAUDE.md: executa tudo, testa tudo, publica tudo).
- **Durante a execução:** só o teste que a task cria, `corepack pnpm typecheck` e `corepack pnpm eslint <arquivos>`. `test:db` e rodada cheia ficam para a bateria da frente. **Exceção:** a Task 2 (migration) roda `corepack pnpm test:db tests/invariants/escale-automacoes-9701.test.ts` **uma vez**, porque o baseline só prova o INSTALL assim (memória `baseline-ordem-dos-blocos-do-fork`).
- **Motor intacto:** zero mudanças em `lib/automation/**`, `lib/event-log/**`, `app/api/v1/cron/**`, `lib/relogio/**`, `lib/schemas/webhooks.ts` e nas rotas `app/api/v1/automation-rules/**`. A Task 9 confere com `git diff --stat escale-crm/main -- lib/automation lib/event-log app/api/v1/cron lib/relogio lib/schemas/webhooks.ts app/api/v1/automation-rules` (tem de sair vazio).
- **Migration 9701:** `supabase/migrations/20261201120000_9701_pastas_e_favoritos_de_automacao.sql` (carimbo seguinte ao da 9602, `20261130130000`). Cabeçalho `-- manifest:` obrigatório; sem linha no `MANIFEST.md`; `corepack pnpm checar:colisao-de-migration` antes do PR. Bloco colado no `supabase/baseline.sql` **logo depois do bloco da 9602** (`grep -n "migration 9602" supabase/baseline.sql`) e antes da varredura de anon, porque cria função.
- **Arquivos do Rafael** só nos pontos de encaixe da seção 5, com poucas linhas e o comentário `// FORK ESCALE · Fase 5A: …`. Em arquivo compartilhado (`lib/audit/actions.ts`, `lib/i18n/dicionario.ts`, `app/escale-tema.css`, `supabase/baseline.sql`) o bloco do fork entra no ponto fixo indicado, nunca no fim.
- **Igual à Clint:** cada componente cita a ficha que o define (07-0NN). Nada de `<select>`, checkbox nativo ou controle do navegador. Antes de dizer pronto, a tela é comparada lado a lado com 07-001 a 07-008, 07-010, 07-031 e 07-032 **na conferência visual da bateria da frente** (regra 4 do CLAUDE.md). As fichas e capturas ficam em `Escale IA OS/clint-documentacao/modulos/07-automacoes/` (`telas/` e `imagens/`). **Não escrever caminho de imagem** neste plano nem no PR (a cerca `evidencia-citada` recusa imagem que o repositório não entrega): citar só o número da ficha.
- **Marca:** onde a Clint usa o roxo (botão "Nova automação", item ativo do trilho, "Nova pasta", "Salvar" do editor de pasta, interruptor ligado, página atual, barra de lote, 1ª cor da pasta, cartão escolhido no modal) entra `casca-marca`.
- **Formatos BR:** "Última alteração" em `dd/mm/aaaa HH:mm:ss` (24 h) no fuso da organização, com `dataHoraBr` de `lib/escale/negocio/arquivos.ts`; números com `toLocaleString("pt-BR")`.
- **Textos de interface** em `lib/i18n/dicionario.ts` (pt e es), lidos por `useT()`/`traduzir()`. Onde a Clint tem texto, copia o da Clint (`material-do-codigo.md`, seção 3.1 e 3.2).
- **Escrita:** toda rota que grava chama `requireSupportWrite()` antes de tudo; `organization_id` vem de `authz.org.orgId`, nunca do corpo. Papel: `requireRole("manager")` em todas as rotas do fork (a lista é de gerente para cima, como hoje).
- **Original intacto:** sem a casca, Webhooks e a aba Automações ficam exatamente como hoje.
- **Imutabilidade, arquivos pequenos (≤ 400 linhas), sem `console.log`** (o `console.error` com `requestId` nas rotas segue o molde). `corepack pnpm`. Commits convencionais, um por task.

---

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| Q1 | **Coluna e filtro "Agente" (B6) vêm só da ação "Mensagem pela IA"** (`send_ai_message`, `config.agent_id`), no nível de cima da lista de ações, na ordem em que aparecem, sem repetir. Um agente: avatar + nome. Mais de um: o primeiro e "+N". Nenhum (ou agente arquivado/apagado): "—". O filtro lista "Sem agente" e os agentes não arquivados da organização, com busca "Buscar agente" (07-003) | O usuário não soube responder a pergunta 1 e a decisão ficou comigo. É a única ação em que a automação **usa** um agente de IA para falar; "Atribuir atendente" escolhe uma pessoa da equipe |
| Q2 | **Clicar no nome abre na forma em que a automação foi criada** (resposta do usuário à pergunta 3). A forma é gravada em `crm_automacoes_da_casca.forma` (`fluxo` ou `editor`). Automação sem registro (criada antes da 5A, pela aba antiga, pela API ou pelo agente) abre **no fluxo**. O menu ⋮ oferece as duas formas sempre | Resposta do usuário; o padrão "fluxo" é o B12 do PRD |
| Q3 | **Com a casca, a aba "Automações" some de Webhooks** (resposta do usuário à pergunta 4): ficam "Receber dados", "Leads recebidos" e "Atividade"; `/app/webhooks?aba=automacoes` redireciona para `/app/automacoes`. Sem a casca, nada muda | Resposta do usuário |
| Q4 | **Criar só grava no primeiro Salvar.** "No fluxo" abre `/app/webhooks/automacoes/nova?nome=…&pasta=…`; "No editor" abre o editor em formulário por cima da lista, com o nome preenchido. Ao criar, a forma chama `PUT /api/v1/automacoes-da-casca/{id}/organizacao` com a pasta e a forma. Se essa gravação falhar, a automação existe sem pasta e aparece o toast "A automação foi criada, mas não foi possível colocá-la na pasta." | O motor recusa regra sem gatilho e sem ação; criar uma regra vazia mudaria o motor. Na Clint o "Salvar" do modal cria um fluxo vazio, que aqui não existe |
| Q5 | **Editor em formulário (D1) com o visual da casca por tokens e um bloco de CSS escopado**, sem reescrever o editor: o `RuleEditor` ganha a marca `data-escale-editor-de-automacao` e o `app/escale-tema.css` dá aos campos, rótulos e caixas de seleção dele o desenho dos campos da casca (seção 4.10). **A busca nas caixas de seleção não entra na 5A** | O editor do original tem 24 caixas de seleção em ~1.800 linhas (`RuleEditor.tsx` + `ActionConfigForm.tsx`). Trocá-las uma a uma é reescrever o editor e arrisca mudar o corpo salvo, que o PRD proíbe. Fica registrado como diferença; ver a pergunta 1 da seção 8 |
| Q6 | **Status com os dois estados do motor:** Ativa e Pausada (B5). Ordenar por status crescente põe as ativas primeiro | O motor não tem suspensa nem rascunho (B7 e B9 ignorados) |
| Q7 | **As 8 cores e os 8 ícones de pasta são os da Clint**, na ordem dela (bundle `index-CuXlBWS9`, `Ye` e `qe`): cores `marca` (o `purple` da Clint), `blue`, `teal`, `green`, `amber`, `red`, `pink`, `gray`; ícones `folder`, `tag`, `star`, `bell`, `send`, `cart`, `calendar`, `flag`. Padrão da pasta nova: `gray` e `folder` (os padrões da Clint). Nome de 1 a 60 caracteres. Sem ordem manual: as pastas saem na ordem de criação, como na Clint | Fonte: o código da Clint. O "ordem" da seção 7 do PRD não tem tela que o use (YAGNI) |
| Q8 | **Excluir pasta solta as automações** ("Sem pasta"), pelo `on delete set null (pasta_id)` da FK | Texto da Clint: "As automações dentro dela ficarão sem pasta." |
| Q9 | **Duplicar** chama `fn_escale_duplicar_automacao` (uma transação): copia nome + " (cópia)" (até 120 caracteres), gatilho, `trigger_config`, condições e ações; a cópia nasce **pausada**, na mesma pasta e com a mesma forma. Toasts da Clint: "A automação está sendo duplicada, aguarde a finalização." e "Automação duplicada com sucesso!" com a ação "Ir para a automação" | A cópia ligada dispararia junto com a original. Duas escritas soltas deixariam cópia sem pasta se a segunda falhasse |
| Q10 | **Menu ⋮ da linha (B13):** Abrir no fluxo, Editar no editor, Renomear, Duplicar automação; divisória; Sem pasta e as pastas (✓ na atual); divisória; Excluir (vermelho). "Renomear" abre o modal **"Renomear automação"** (a Clint chama de "Editar automação"; aqui "Editar" já é o editor em formulário) | PRD B13; o título evita dois "Editar" com sentidos diferentes |
| Q11 | **Nome até 80 caracteres no modal de criar e de renomear**, com o toast da Clint "O nome deve ter no máximo 80 caracteres". Nomes antigos de até 120 (o limite do original) continuam valendo e aparecem inteiros | A Clint limita a 80; o motor aceita 120 |
| Q12 | **Favorito por pessoa** (B11). Estrela em contorno `casca-suave`; favorita com fundo e traço `#FACC15` (provisório: a captura não mostra uma favorita). Dicas "Adicionar aos favoritos" / "Remover dos favoritos" | PRD seção 7; texto da Clint |
| Q13 | **A lista lembra, por pessoa e no navegador** (`localStorage`, chave `escale:automacoes:lista`), a pasta ativa, a ordem e o "por página", como a Clint (L26). Busca e filtros recomeçam vazios | Comportamento da Clint, só o que custa pouco |
| Q14 | **Menu:** entrada nova no catálogo `/app/automacoes` ("Automações", grupo `crm`, `minRole: "manager"`, sem `sidebar`), e o item do topo passa a apontar para ela. O interruptor "A IA decide" (`/app/settings/automacoes`) continua em Mais › Configurações › Sua empresa | PRD A1. Sem a entrada no registro, o topo não sabe quem pode ver a tela |
| Q15 | **Ligar/pausar** usa o `InterruptorDaCasca` com atualização otimista e os toasts que o original já tem ("Automação ligada." / "Automação pausada.") | A Clint não revela o texto; o motor e a rota são os de hoje |
| Q16 | **Excluir e mover em lote** por rotas do fork que recebem até 100 ids de uma vez e devolvem quantas deram certo e quantas falharam. Toasts com o plural da Clint ("2 automações movidas", "1 automação não pôde ser excluída") | A Clint faz lotes de 5 chamadas; uma rota só é mais simples e dá o mesmo resultado na tela |

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/escale/automacoes/rotas.ts` | `ROTA_DA_LISTA_DE_AUTOMACOES`, `rotaDoFluxo`, `rotaDoFluxoNovo`, `rotaDoEditor`, `rotaDeAbrir` |
| `lib/escale/automacoes/pastas.ts` | Cores e ícones da pasta, padrões, `ehCorDaPasta`, `ehIconeDaPasta`, `corDaPasta` |
| `lib/escale/automacoes/tipos.ts` | `AutomacaoDaLista`, `PastaDeAutomacao`, `AgenteDaLista`, `ListaDeAutomacoes`, `Visao`, `Ordem`, `FiltrosDaLista` |
| `lib/escale/automacoes/regras.ts` | `agentesDaRegra`, `filtrarAutomacoes`, `ordenarAutomacoes`, `paginar`, `contagensDoTrilho`, `mostrarSemPasta`, `nomeDaCopia`, `textoDeItens`, `NOME_MAXIMO`, `semAcento` |
| `lib/escale/automacoes/schema.ts` | zod: `pastaSchema`, `edicaoDaPastaSchema`, `organizacaoSchema`, `favoritaSchema`, `loteSchema`, `moverEmLoteSchema` |
| `lib/escale/automacoes/banco.ts` | `lerListaDeAutomacoes`, `criarPasta`, `editarPasta`, `excluirPasta`, `organizarAutomacao`, `marcarFavorita`, `duplicarAutomacao`, `moverEmLote`, `excluirEmLote` |
| `app/api/v1/automacoes-da-casca/route.ts` | GET (lista, pastas, agentes) |
| `app/api/v1/automacoes-da-casca/pastas/route.ts` | POST (pasta nova) |
| `app/api/v1/automacoes-da-casca/pastas/[id]/route.ts` | PATCH (renomear, cor, ícone), DELETE |
| `app/api/v1/automacoes-da-casca/[id]/organizacao/route.ts` | PUT (pasta e forma) |
| `app/api/v1/automacoes-da-casca/[id]/favorita/route.ts` | PUT |
| `app/api/v1/automacoes-da-casca/[id]/duplicar/route.ts` | POST |
| `app/api/v1/automacoes-da-casca/mover/route.ts` | POST (lote) |
| `app/api/v1/automacoes-da-casca/excluir/route.ts` | POST (lote) |
| `hooks/escale/useAutomacoesDaCasca.ts` | `CHAVE_DAS_AUTOMACOES`, `useListaDeAutomacoes`, `useAcoesDasPastas`, `useAcoesDasAutomacoes`, `useOrganizarAoCriar` |
| `components/escale/automacoes/lista/AutomacoesDaCasca.tsx` | A página: cabeçalho, trilho, área da lista, estado da tela, modais e o editor |
| `components/escale/automacoes/lista/estado-da-lista.ts` | `useEstadoDaLista` (visão, busca, filtros, ordem, página, seleção, `localStorage`) |
| `components/escale/automacoes/lista/CabecalhoDasAutomacoes.tsx` | "Automações" e "Nova automação +" (07-001) |
| `components/escale/automacoes/lista/TrilhoDePastas.tsx` | 224 px: Todas, Favoritos, PASTAS, pastas, Sem pasta, Nova pasta (07-001, 07-031) |
| `components/escale/automacoes/lista/EditorDePasta.tsx` | Cartão em linha: nome, Cor, Ícone, Cancelar, Salvar (07-007) |
| `components/escale/automacoes/lista/MenuDaPasta.tsx` | Renomear, Excluir (07-008) |
| `components/escale/automacoes/lista/IconeDaPasta.tsx` | Ícone da pasta pintado na cor dela |
| `components/escale/automacoes/lista/BarraDeFerramentas.tsx` | Trilha "Todas › pasta", busca, Status, Agente, "N itens" (07-001, 07-032) |
| `components/escale/automacoes/lista/FiltroDeStatus.tsx` | Painel com Ativa e Pausada (07-002) |
| `components/escale/automacoes/lista/FiltroDeAgente.tsx` | Painel com busca, "Sem agente" e os agentes (07-003) |
| `components/escale/automacoes/lista/TabelaDeAutomacoes.tsx` | Cabeçalho ordenável e corpo (07-001) |
| `components/escale/automacoes/lista/LinhaDaAutomacao.tsx` | Caixa, nome, agente, interruptor, data, estrela, ⋮ (07-001) |
| `components/escale/automacoes/lista/AgenteDaLinha.tsx` | Avatar de iniciais + nome, "+N", "—" |
| `components/escale/automacoes/lista/MenuDaAutomacao.tsx` | O menu ⋮ (07-004, Q10) |
| `components/escale/automacoes/lista/VaziosDasAutomacoes.tsx` | 10 linhas-esqueleto, vazio, vazio do filtro, erro (07-031, 07-032, L17–L20) |
| `components/escale/automacoes/lista/BarraDeLoteDasAutomacoes.tsx` | "×", "N SELECIONADOS", "Mover para pasta", lixeira (07-010) |
| `components/escale/automacoes/lista/JanelaCriarAutomacao.tsx` | "Criar nova automação": nome, pasta, "Como você quer montar?" (07-006, B15) |
| `components/escale/automacoes/lista/JanelaRenomearAutomacao.tsx` | "Renomear automação" (Q10) |
| `lib/ui/icons-da-casca.ts` | + `Folder`, `FolderInput`, `FolderOff` (desenho próprio), `Settings2` se faltar |
| `app/app/automacoes/page.tsx` | Casca → `AutomacoesDaCasca`; sem casca → redirect para a aba de Webhooks |
| Encaixes (seção 5) | `lib/escale/menu-do-topo.ts`, `lib/navigation/catalogo.ts`, `app/app/webhooks/page.tsx`, `app/app/webhooks/_components/WebhooksClient.tsx`, `app/app/webhooks/_components/RuleEditor.tsx`, `app/app/webhooks/automacoes/[id]/page.tsx`, `…/_components/DesignerDeAutomacao.tsx`, `…/_components/CanvasDaAutomacao.tsx`, `lib/audit/actions.ts`, `lib/i18n/dicionario.ts`, `app/escale-tema.css` |
| `supabase/migrations/20261201120000_9701_pastas_e_favoritos_de_automacao.sql` + bloco no `supabase/baseline.sql` | Tabelas, gatilho, RLS e a função de duplicar |
| `tests/unit/escale-automacoes-regras.test.ts`, `-rotas.test.ts`, `-hooks.test.tsx`, `-trilho.test.tsx`, `-lista.test.tsx`, `-janelas.test.tsx`, `-pagina.test.tsx`, `-encaixes.test.tsx` | Unidade |
| `tests/unit/escale-menu-do-topo.test.ts` | + Automações aponta para a lista |
| `tests/invariants/escale-automacoes-9701.test.ts` | Banco: RLS, FKs, gatilho, duplicar |

---

## 1. Regras puras

### 1.1 Rotas (`lib/escale/automacoes/rotas.ts`)

```ts
export const ROTA_DA_LISTA_DE_AUTOMACOES = "/app/automacoes";
const ROTA_DO_FLUXO = "/app/webhooks/automacoes";

export type FormaDeMontar = "fluxo" | "editor";

export function rotaDoFluxo(id: string): string {
  return `${ROTA_DO_FLUXO}/${encodeURIComponent(id)}`;
}

/** O fluxo novo já com o nome e a pasta do modal (Q4). Pasta vazia = "Sem pasta". */
export function rotaDoFluxoNovo({ nome, pastaId }: { nome: string; pastaId: string | null }): string {
  const q = new URLSearchParams({ nome });
  if (pastaId) q.set("pasta", pastaId);
  return `${ROTA_DO_FLUXO}/nova?${q.toString()}`;
}

/** A lista com o editor em formulário aberto por cima (o "Ir para a automação" e o ⋮). */
export function rotaDoEditor(id: string): string {
  return `${ROTA_DA_LISTA_DE_AUTOMACOES}?editor=${encodeURIComponent(id)}`;
}

/** Clicar no nome (Q2): a forma gravada; sem registro, o fluxo. */
export function rotaDeAbrir(a: { id: string; forma: FormaDeMontar | null }): string {
  return a.forma === "editor" ? rotaDoEditor(a.id) : rotaDoFluxo(a.id);
}
```

### 1.2 Pastas (`lib/escale/automacoes/pastas.ts`)

```ts
/** As 8 cores do editor de pasta da Clint, na ordem dela (Q7). `marca` é o purple. */
export const CORES_DA_PASTA = ["marca", "blue", "teal", "green", "amber", "red", "pink", "gray"] as const;
export type CorDaPasta = (typeof CORES_DA_PASTA)[number];
export const COR_PADRAO_DA_PASTA: CorDaPasta = "gray";

/** Os 8 ícones, na ordem da Clint. */
export const ICONES_DA_PASTA = ["folder", "tag", "star", "bell", "send", "cart", "calendar", "flag"] as const;
export type IconeDaPasta = (typeof ICONES_DA_PASTA)[number];
export const ICONE_PADRAO_DA_PASTA: IconeDaPasta = "folder";

/**
 * Cor gravada → CSS. Os tons são os `.solid` do Chakra v3 que a Clint usa (amber é
 * o 500 do Tailwind, que o Chakra não tem). `gray` é o `bg.muted` da Clint, a raia
 * da casca. Conferir com 07-007 na bateria; valor fora da lista cai no cinza.
 */
const CSS_DA_COR: Record<CorDaPasta, string> = {
  marca: "var(--color-casca-marca)",
  blue: "#2563EB",
  teal: "#0D9488",
  green: "#16A34A",
  amber: "#F59E0B",
  red: "#DC2626",
  pink: "#DB2777",
  gray: "var(--color-casca-raia)",
};

export function ehCorDaPasta(v: unknown): v is CorDaPasta {
  return typeof v === "string" && (CORES_DA_PASTA as readonly string[]).includes(v);
}
export function ehIconeDaPasta(v: unknown): v is IconeDaPasta {
  return typeof v === "string" && (ICONES_DA_PASTA as readonly string[]).includes(v);
}
export function corDaPasta(cor: string): string {
  return ehCorDaPasta(cor) ? CSS_DA_COR[cor] : CSS_DA_COR.gray;
}
/** O ícone no trilho é pintado na cor; o cinza (fundo claro) vira o cinza do texto. */
export function corDoIconeDaPasta(cor: string): string {
  return cor === "gray" || !ehCorDaPasta(cor) ? "var(--color-casca-suave)" : CSS_DA_COR[cor];
}

/** Nomes em português para `aria-label` (passam por `t()`). */
export const NOME_DA_COR: Record<CorDaPasta, string> = {
  marca: "Cor da marca", blue: "Azul", teal: "Verde-azulado", green: "Verde",
  amber: "Âmbar", red: "Vermelho", pink: "Rosa", gray: "Cinza",
};
export const NOME_DO_ICONE: Record<IconeDaPasta, string> = {
  folder: "Pasta", tag: "Etiqueta", star: "Estrela", bell: "Sino",
  send: "Avião de papel", cart: "Carrinho", calendar: "Calendário", flag: "Bandeira",
};
```

### 1.3 Tipos (`lib/escale/automacoes/tipos.ts`)

```ts
import type { CorDaPasta, IconeDaPasta } from "./pastas";
import type { FormaDeMontar } from "./rotas";

export interface AutomacaoDaLista {
  id: string;
  nome: string;
  ativa: boolean;
  /** `automation_rules.updated_at` (a "Última alteração"). */
  atualizadaEm: string;
  pastaId: string | null;
  /** `null` = sem registro na casca (abre no fluxo, Q2). */
  forma: FormaDeMontar | null;
  favorita: boolean;
  /** Ids dos agentes das ações "Mensagem pela IA", já filtrados pelos agentes conhecidos (Q1). */
  agentes: string[];
}

export interface PastaDeAutomacao {
  id: string;
  nome: string;
  cor: CorDaPasta;
  icone: IconeDaPasta;
}

export interface AgenteDaLista {
  id: string;
  nome: string;
}

export interface ListaDeAutomacoes {
  automacoes: AutomacaoDaLista[];
  pastas: PastaDeAutomacao[];
  agentes: AgenteDaLista[];
}

export type Visao =
  | { tipo: "todas" }
  | { tipo: "favoritos" }
  | { tipo: "pasta"; id: string }
  | { tipo: "sem_pasta" };

export type StatusDoFiltro = "ativa" | "pausada";
/** "sem_agente" ou o id de um agente. */
export type AgenteDoFiltro = string;

export interface FiltrosDaLista {
  visao: Visao;
  busca: string;
  status: readonly StatusDoFiltro[];
  agentes: readonly AgenteDoFiltro[];
}

export type ColunaDeOrdem = "nome" | "status" | "atualizada";
export interface Ordem {
  coluna: ColunaDeOrdem;
  direcao: "asc" | "desc";
}
export const ORDEM_PADRAO: Ordem = { coluna: "atualizada", direcao: "desc" };
```

### 1.4 Regras (`lib/escale/automacoes/regras.ts`)

Assinaturas exatas (o corpo é escrito na Task 1, guiado pelos testes da Task 1):

```ts
export const NOME_MAXIMO = 80;          // modal de criar e de renomear (Q11)
export const NOME_MAXIMO_DA_REGRA = 120; // o limite do original (createAutomationRuleSchema)
export const SEM_AGENTE = "sem_agente";

/** Minúsculas e sem acento: "Pós-venda" → "pos-venda". */
export function semAcento(s: string): string;

/**
 * Q1: os agent_id das ações `send_ai_message` do nível de cima, na ordem, sem repetir,
 * só os que estão em `conhecidos`. Aceita `unknown` (o jsonb vem do banco).
 */
export function agentesDaRegra(actions: unknown, conhecidos: ReadonlySet<string>): string[];

/** Visão + busca (sem acento, contém) + status (vazio = todos) + agentes (vazio = todos). */
export function filtrarAutomacoes(lista: readonly AutomacaoDaLista[], f: FiltrosDaLista): AutomacaoDaLista[];

/** Nova lista; nome por `localeCompare("pt-BR", { sensitivity: "base" })`; status asc = ativas primeiro; empate pela data desc. */
export function ordenarAutomacoes(lista: readonly AutomacaoDaLista[], ordem: Ordem): AutomacaoDaLista[];

/** Página de 1 em diante; página além do fim cai na última que existe. */
export function paginar<T>(lista: readonly T[], pagina: number, porPagina: number): { itens: T[]; pagina: number };

export interface ContagensDoTrilho {
  todas: number;
  favoritos: number;
  porPasta: Readonly<Record<string, number>>;
  semPasta: number;
}
/** Conta sobre a lista inteira (sem busca nem filtros), como o trilho da Clint. Pasta inexistente conta como "sem pasta". */
export function contagensDoTrilho(lista: readonly AutomacaoDaLista[], pastas: readonly PastaDeAutomacao[]): ContagensDoTrilho;

/** L2: "Sem pasta" só aparece quando existe pasta E existe automação sem pasta. */
export function mostrarSemPasta(c: ContagensDoTrilho, quantasPastas: number): boolean;

/** "Vendas" → "Vendas (cópia)", cortando o nome para caber em 120. */
export function nomeDaCopia(nome: string): string;

/** 0 → "0 itens", 1 → "1 item", 2 → "2 itens" (o `{n}` com `toLocaleString("pt-BR")`). Devolve a chave e o número. */
export function textoDeItens(n: number): { chave: "{n} item" | "{n} itens"; n: string };
```

### 1.5 Schema (`lib/escale/automacoes/schema.ts`)

```ts
import { z } from "zod";
import { CORES_DA_PASTA, ICONES_DA_PASTA } from "./pastas";

const nomeDaPasta = z.string().trim().min(1).max(60);

export const pastaSchema = z
  .object({ nome: nomeDaPasta, cor: z.enum(CORES_DA_PASTA).optional(), icone: z.enum(ICONES_DA_PASTA).optional() })
  .strict();

export const edicaoDaPastaSchema = z
  .object({ nome: nomeDaPasta.optional(), cor: z.enum(CORES_DA_PASTA).optional(), icone: z.enum(ICONES_DA_PASTA).optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0);

/** PUT …/{id}/organizacao: `pasta_id` null = "Sem pasta"; ausente = não mexe. */
export const organizacaoSchema = z
  .object({ pasta_id: z.string().uuid().nullable().optional(), forma: z.enum(["fluxo", "editor"]).optional() })
  .strict()
  .refine((v) => v.pasta_id !== undefined || v.forma !== undefined);

export const favoritaSchema = z.object({ favorita: z.boolean() }).strict();

export const loteSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).strict();
export const moverEmLoteSchema = loteSchema.extend({ pasta_id: z.string().uuid().nullable() }).strict();
```

### 1.6 Banco (`lib/escale/automacoes/banco.ts`)

Todas recebem o cliente da sessão (`SupabaseClient`) e o `orgId`; nenhuma usa o admin.

- `lerListaDeAutomacoes(supabase, orgId, userId): Promise<ListaDeAutomacoes>` — 5 leituras em `Promise.all`:
  - `automation_rules`: `id, name, is_active, updated_at, actions`, `eq("organization_id", orgId)`, `order("updated_at", { ascending: false })`, `limit(1000)`;
  - `crm_automacoes_da_casca`: `rule_id, pasta_id, forma`, mesma org;
  - `crm_automacoes_favoritas`: `rule_id`, mesma org e `eq("user_id", userId)`;
  - `crm_pastas_de_automacao`: `id, nome, cor, icone`, mesma org, `order("created_at")`, `limit(200)`;
  - `ai_agents`: `id, name`, mesma org, `is("archived_at", null)`, `order("name")`, `limit(200)`.
  Monta `AutomacaoDaLista` com `agentesDaRegra(r.actions, new Set(agentes.map(a => a.id)))`. **`actions` nunca sai da função** (carrega `secret_enc` dos webhooks). Erro em qualquer leitura → lança.
- `criarPasta(supabase, orgId, p)` → `{ id }` (insert com `nome`, `cor ?? COR_PADRAO_DA_PASTA`, `icone ?? ICONE_PADRAO_DA_PASTA`).
- `editarPasta(supabase, orgId, id, edicao)` → `"ok" | "nao_encontrada"` (update + `updated_at`, `select("id")`; zero linhas = não encontrada).
- `excluirPasta(supabase, orgId, id)` → `"ok" | "nao_encontrada"`.
- `organizarAutomacao(supabase, orgId, ruleId, o)` → `"ok" | "nao_encontrada" | "pasta_invalida"`: confere que a regra é da org (`automation_rules` `select id`); com `pasta_id` não nulo, confere a pasta na org; `upsert` em `crm_automacoes_da_casca` (`onConflict: "rule_id"`) só com os campos enviados, mais `organization_id` e `updated_at`.
- `marcarFavorita(supabase, orgId, userId, ruleId, favorita)` → `"ok" | "nao_encontrada"`: confere a regra; `upsert` (`onConflict: "user_id,rule_id"`, `ignoreDuplicates: true`) ou `delete`.
- `duplicarAutomacao(supabase, ruleId, nome)` → `{ id }` por `rpc("fn_escale_duplicar_automacao", { p_regra, p_nome })`; erro `automacao_nao_encontrada` → lança `NaoEncontrada` (classe exportada).
- `moverEmLote(supabase, orgId, ids, pastaId)` → `{ movidas: string[]; falhas: string[] }`: lê os ids que são da org; com pasta, confere a pasta (inexistente → lança `PastaInvalida`); `upsert` dos encontrados; os não encontrados vão para `falhas`.
- `excluirEmLote(supabase, orgId, ids)` → `{ excluidas: string[]; falhas: string[] }`: `delete().in("id", ids).eq("organization_id", orgId).select("id")`; o que não voltou é falha.

---

## 2. Banco (migration 9701)

```sql
-- manifest: **Pastas e favoritos de automação (fork Escale, Fase 5A).** Tabelas novas `crm_pastas_de_automacao` (nome, cor e ícone da Clint, por organização), `crm_automacoes_da_casca` (uma linha por regra: a pasta e a forma em que foi criada, fluxo ou editor) e `crm_automacoes_favoritas` (por pessoa). FK para `automation_rules` com cascade; FK composta para a pasta com `on delete set null (pasta_id)` (excluir a pasta solta as automações); favoritos presos a `user_organizations`. Gatilho recusa linha de organização diferente da regra. RLS: a organização lê; gerente ou acima escreve pastas e organização; cada pessoa só os próprios favoritos. Função `fn_escale_duplicar_automacao` (security invoker) copia a regra pausada com a pasta e a forma. `automation_rules` não muda.
-- ---- FORK ESCALE · pastas e favoritos de automação (migration 9701) ----

create table if not exists public.crm_pastas_de_automacao (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  cor text not null default 'gray'
    check (cor in ('marca','blue','teal','green','amber','red','pink','gray')),
  icone text not null default 'folder'
    check (icone in ('folder','tag','star','bell','send','cart','calendar','flag')),
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_pastas_de_automacao_org_id_key unique (organization_id, id)
);
create index if not exists idx_crm_pastas_de_automacao_org
  on public.crm_pastas_de_automacao (organization_id, created_at);

create table if not exists public.crm_automacoes_da_casca (
  rule_id uuid primary key references public.automation_rules(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pasta_id uuid,
  forma text check (forma is null or forma in ('fluxo','editor')),
  updated_at timestamptz not null default now(),
  constraint crm_automacoes_da_casca_pasta_fk foreign key (organization_id, pasta_id)
    references public.crm_pastas_de_automacao (organization_id, id) on delete set null (pasta_id)
);
create index if not exists idx_crm_automacoes_da_casca_org_pasta
  on public.crm_automacoes_da_casca (organization_id, pasta_id);

create table if not exists public.crm_automacoes_favoritas (
  user_id uuid not null,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  organization_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, rule_id),
  constraint crm_automacoes_favoritas_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
create index if not exists idx_crm_automacoes_favoritas_org_pessoa
  on public.crm_automacoes_favoritas (organization_id, user_id);
create index if not exists idx_crm_automacoes_favoritas_regra
  on public.crm_automacoes_favoritas (rule_id);

-- A linha é da organização da regra (a FK simples não garante; automation_rules
-- não tem unique (organization_id, id) e esta frente não mexe nela).
create or replace function public.fn_escale_automacao_da_mesma_org() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (
    select 1 from public.automation_rules r
    where r.id = new.rule_id and r.organization_id = new.organization_id
  ) then
    raise exception 'automacao_de_outra_organizacao' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.fn_escale_automacao_da_mesma_org() from public, anon;

drop trigger if exists trg_escale_automacao_da_casca_mesma_org on public.crm_automacoes_da_casca;
create trigger trg_escale_automacao_da_casca_mesma_org before insert or update on public.crm_automacoes_da_casca
  for each row execute function public.fn_escale_automacao_da_mesma_org();
drop trigger if exists trg_escale_automacao_favorita_mesma_org on public.crm_automacoes_favoritas;
create trigger trg_escale_automacao_favorita_mesma_org before insert or update on public.crm_automacoes_favoritas
  for each row execute function public.fn_escale_automacao_da_mesma_org();

alter table public.crm_pastas_de_automacao enable row level security;
alter table public.crm_automacoes_da_casca enable row level security;
alter table public.crm_automacoes_favoritas enable row level security;
revoke all on table public.crm_pastas_de_automacao, public.crm_automacoes_da_casca, public.crm_automacoes_favoritas from anon;

-- Pastas e organização: igual a automation_rules (a organização lê; gerente ou acima escreve).
drop policy if exists crm_pastas_de_automacao_select on public.crm_pastas_de_automacao;
create policy crm_pastas_de_automacao_select on public.crm_pastas_de_automacao for select
  using ((organization_id in (select public.fn_user_org_ids())) or public.fn_is_platform_admin());
drop policy if exists crm_pastas_de_automacao_write on public.crm_pastas_de_automacao;
create policy crm_pastas_de_automacao_write on public.crm_pastas_de_automacao
  using (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')))
  with check (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')));

drop policy if exists crm_automacoes_da_casca_select on public.crm_automacoes_da_casca;
create policy crm_automacoes_da_casca_select on public.crm_automacoes_da_casca for select
  using ((organization_id in (select public.fn_user_org_ids())) or public.fn_is_platform_admin());
drop policy if exists crm_automacoes_da_casca_write on public.crm_automacoes_da_casca;
create policy crm_automacoes_da_casca_write on public.crm_automacoes_da_casca
  using (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')))
  with check (public.fn_is_platform_admin_full()
         or ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'manager')));

-- Favoritos: só os da própria pessoa, de gerente para cima (quem vê a lista).
drop policy if exists crm_automacoes_favoritas_pessoa on public.crm_automacoes_favoritas;
create policy crm_automacoes_favoritas_pessoa on public.crm_automacoes_favoritas
  using ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid()
         and public.fn_role_at_least(organization_id, 'manager'))
  with check ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid()
         and public.fn_role_at_least(organization_id, 'manager'));

grant select, insert, update, delete on public.crm_pastas_de_automacao, public.crm_automacoes_da_casca,
  public.crm_automacoes_favoritas to authenticated;
grant all on public.crm_pastas_de_automacao, public.crm_automacoes_da_casca, public.crm_automacoes_favoritas to service_role;

-- Duplicar (Q9): invoker, a RLS de automation_rules e da 9701 decide quem pode.
create or replace function public.fn_escale_duplicar_automacao(p_regra uuid, p_nome text)
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v public.automation_rules;
  v_pasta uuid;
  v_forma text;
  v_nova uuid;
begin
  select * into v from public.automation_rules where id = p_regra;
  if not found then
    raise exception 'automacao_nao_encontrada' using errcode = 'no_data_found';
  end if;
  insert into public.automation_rules (organization_id, name, trigger_event, trigger_config, conditions, actions,
                                       is_active, created_by_user_id, last_change_actor_kind, last_change_at)
  values (v.organization_id, left(btrim(p_nome), 120), v.trigger_event, v.trigger_config, v.conditions, v.actions,
          false, auth.uid(), 'user', now())
  returning id into v_nova;
  select c.pasta_id, c.forma into v_pasta, v_forma from public.crm_automacoes_da_casca c where c.rule_id = p_regra;
  insert into public.crm_automacoes_da_casca (rule_id, organization_id, pasta_id, forma)
  values (v_nova, v.organization_id, v_pasta, v_forma);
  return v_nova;
end $$;
revoke all on function public.fn_escale_duplicar_automacao(uuid, text) from public, anon;
grant execute on function public.fn_escale_duplicar_automacao(uuid, text) to authenticated, service_role;

comment on table public.crm_pastas_de_automacao is 'Fork Escale (9701): pastas da lista de automações da casca.';
comment on table public.crm_automacoes_da_casca is 'Fork Escale (9701): pasta e forma (fluxo/editor) de cada automation_rule na casca. Sem linha = sem pasta, abre no fluxo.';
comment on table public.crm_automacoes_favoritas is 'Fork Escale (9701): automações favoritas de cada pessoa.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

---

## 3. Rotas

Molde: `app/api/v1/indicadores-da-casca/paineis/route.ts` (`randomUUID` como `requestId`, `requireRole`, `ok`/`fail`, `traduzir`, `console.error` com o `requestId` no `catch`). Todas: `requireRole("manager", { requestId, resource: "automation_rules" })`. Escrita: `requireSupportWrite()` antes de tudo. Corpo inválido → 422 `"Falha na validação dos dados!"`. Id da rota que não é uuid → 404 sem tocar no banco.

| Rota | Faz | Respostas | Auditoria |
|---|---|---|---|
| `GET /api/v1/automacoes-da-casca` | `lerListaDeAutomacoes(supabase, orgId, user.id)` | 200 `{ automacoes, pastas, agentes }` | — |
| `POST /pastas` | `pastaSchema` → `criarPasta` | 201 `{ id }` | `automation.folder_created` (`metadata: { nome }`) |
| `PATCH /pastas/[id]` | `edicaoDaPastaSchema` → `editarPasta` | 200 `{ id }`, 404 "Pasta não encontrada." | `automation.folder_updated` |
| `DELETE /pastas/[id]` | `excluirPasta` | 200 `{ id }`, 404 | `automation.folder_deleted` |
| `PUT /[id]/organizacao` | `organizacaoSchema` → `organizarAutomacao` | 200 `{ id }`, 404 "Regra não encontrada.", 422 "A pasta escolhida não existe mais." | `automation.rule_moved` só quando vier `pasta_id` (`metadata: { pasta_id }`) |
| `PUT /[id]/favorita` | `favoritaSchema` → `marcarFavorita` | 200 `{ id, favorita }`, 404 | — (escolha pessoal) |
| `POST /[id]/duplicar` | lê o nome da regra na org (404 se não houver) → `duplicarAutomacao(supabase, id, nomeDaCopia(nome))` | 201 `{ id }` | `automation.rule_cloned` (`metadata: { de: id }`) |
| `POST /mover` | `moverEmLoteSchema` → `moverEmLote` | 200 `{ movidas, falhas }`, 422 "A pasta escolhida não existe mais." | `automation.rule_moved` por id movido |
| `POST /excluir` | `loteSchema` → `excluirEmLote` | 200 `{ excluidas, falhas }` | `automation.rule_deleted` por id excluído (o mesmo código da rota do original) |

Ligar/pausar (`PATCH { is_active }`), renomear (`PATCH { name }`) e excluir uma (`DELETE`) usam `/api/v1/automation-rules/[id]`, que já confere papel, suporte e autoria.

---

## 4. Telas

Medidas tiradas de 07-001 (janela 1536×735) e do `material-do-codigo.md` seção 6. Cores e fontes pelos tokens `casca-*` (o `escale-tema.css` já os acende com a casca).

### 4.1 Página (`AutomacoesDaCasca`, 07-001)

Props: `{ fuso: string; editorAberto: string | null }`. Raiz `flex h-full min-h-0 flex-col bg-surface` com `data-escale-automacoes`. Em cima o `CabecalhoDasAutomacoes`; abaixo `flex min-h-0 flex-1`: `TrilhoDePastas` à esquerda e a área da lista (`flex min-w-0 flex-1 flex-col`): `BarraDeFerramentas`, `TabelaDeAutomacoes` (rolagem própria) e o rodapé com `PaginacaoDaCasca` (`opcoesPorPagina = POR_PAGINA` de `lib/escale/contatos/regras`, legenda "por página"; com 0 itens fica só o "10 por página", como 07-031). A `BarraDeLoteDasAutomacoes` aparece com 1 ou mais selecionadas. Por cima: `JanelaCriarAutomacao`, `JanelaRenomearAutomacao`, as confirmações (`JanelaDeConfirmacao`) e o `RuleEditor` do original (`daCasca`). Estado da tela em `useEstadoDaLista()` (seção 4.12).

Abrir no editor: `?editor=<id>` na URL (ou o ⋮ / clique no nome de uma automação `forma = "editor"`) busca a regra **na hora** com `qc.fetchQuery(opcoesDaRegra(id))` (como `RulesTab.openEdit`, para não editar uma cópia velha) e abre o `RuleEditor` com `rule`. Fechar o editor tira o `?editor` da URL (`router.replace(ROTA_DA_LISTA_DE_AUTOMACOES)`). Erro ao buscar → `showApiError`.

### 4.2 Cabeçalho (`CabecalhoDasAutomacoes`, 07-001)

`header` de 48 px, `border-b border-casca-divisoria`, `px-6`, `flex items-center justify-between`. "Automações" (18 px, 500, `casca-texto`). À direita `BotaoDaCasca variante="marca" tamanho="sm"` com "Nova automação" e `Plus` 14 px **depois** do texto. Molde: `components/escale/campanhas/CabecalhoDasCampanhas.tsx`.

### 4.3 Trilho (`TrilhoDePastas`, 07-001, 07-007, 07-008, 07-031)

Props: `{ pastas: PastaDeAutomacao[]; contagens: ContagensDoTrilho; visao: Visao; carregando: boolean; aoMudarVisao: (v: Visao) => void }`. `nav` de **224 px**, `shrink-0`, `border-r border-casca-divisoria`, `px-2 pt-3`, rolagem própria. Item (`button`, `aria-current` no ativo): 30 px de altura, `rounded-md px-2`, `gap-2`, ícone 14 px, texto 13 px `casca-texto-2`, contador à direita 10 px `casca-suave`; ativo com fundo `casca-marca-suave` e texto e ícone `casca-marca`; hover `casca-raia`; transição de 150 ms.
- "Todas" (`List`) com `contagens.todas`; "Favoritos" (`Star`) com `contagens.favoritos`.
- Rótulo "PASTAS" (10 px, 600, maiúsculas, `casca-suave`, `mt-3 mb-1 px-2`).
- Carregando: um bloco-esqueleto de 26 px no lugar das pastas (L3). Sem pastas: "Nenhuma pasta criada" (12 px, `casca-suave`, `px-2`).
- Cada pasta: `IconeDaPasta` + nome (`truncate`) + contador. No hover (e com o foco do teclado) o contador some e aparece o ⋮ (`MoreVertical` 14 px, `aria-label` "Opções da pasta") que abre o `MenuDaPasta`.
- "Sem pasta" (`FolderOff`) com `contagens.semPasta`, só se `mostrarSemPasta(...)`. Se a visão é "sem pasta" e ela deixa de aparecer, a visão volta para "Todas" (efeito da Clint `eo`).
- "Nova pasta" (`FolderPlus` 13 px + texto 12 px, `casca-marca`) abre o `EditorDePasta` no lugar do link.
- Renomear (do menu) troca a linha da pasta pelo `EditorDePasta` com os valores dela.

### 4.4 Editor de pasta (`EditorDePasta`, 07-007)

Props: `{ inicial?: { nome: string; cor: CorDaPasta; icone: IconeDaPasta }; aoSalvar: (p: { nome: string; cor: CorDaPasta; icone: IconeDaPasta }) => void; aoCancelar: () => void; salvando: boolean }`. Cartão `rounded-md border border-casca-divisoria bg-surface p-2 flex flex-col gap-2`.
- Campo com foco automático, 28 px, borda `casca-marca` no foco, 12 px, placeholder "Nome da pasta", `maxLength={60}`. Enter salva (nome sem espaços vazio não salva), Esc cancela.
- "Cor" (11 px, `casca-suave`, `mb-1`) e as 8 bolinhas: `button` 20 × 20, redondo, `style.backgroundColor = corDaPasta(c)`, borda de 2 px `casca-texto` na escolhida e transparente nas outras, `aria-label = t(NOME_DA_COR[c])`, `aria-pressed`. Quebram em duas linhas na largura do trilho (7 + 1, como 07-007).
- "Ícone" e os 8 ícones: `button` 24 × 24, `rounded-md`, ícone 13 px; escolhido com fundo `casca-marca-suave`, borda `casca-marca` e ícone `casca-marca`; os outros com borda `casca-divisoria` e ícone `casca-suave`. `aria-label = t(NOME_DO_ICONE[i])`, `aria-pressed`.
- Rodapé à direita: "Cancelar" (texto 12 px `casca-suave`, sem fundo) e "Salvar" (texto 12 px `casca-marca`, sem fundo, `disabled` enquanto `salvando` ou nome vazio).
- Padrões da pasta nova: `gray` e `folder`.

Mapa ícone → componente no próprio `IconeDaPasta.tsx`: `folder: Folder, tag: Tag, star: Star, bell: Bell, send: Send, cart: ShoppingCart, calendar: Calendar, flag: Flag` (todos de `lib/ui/icons-da-casca`).

### 4.5 Menu da pasta (`MenuDaPasta`, 07-008)

`DropdownMenu` com o conteúdo do molde `components/escale/campanhas/MenuDaCampanha.tsx`: "Renomear" (`Pencil` 13 px) e "Excluir" (`Trash2`, texto e ícone vermelhos `casca-alerta`). Excluir abre `JanelaDeConfirmacao` (`perigo`) com o texto da Clint "Excluir esta pasta? As automações dentro dela ficarão sem pasta.", "Cancelar" e "Excluir"; sucesso → toast "Pasta excluída" e, se a pasta excluída era a visão ativa, volta para "Todas".

### 4.6 Barra de ferramentas (`BarraDeFerramentas`, 07-001, 07-002, 07-003, 07-032)

Faixa de 56 px, `px-6`, `border-b border-casca-divisoria`, `flex items-center gap-4`. Com uma pasta aberta, acima da faixa, a trilha "Todas › {pasta}" (12 px; "Todas" é botão que volta para Todas; **provisório**, sem print, L7).
- Busca: `CampoDeBuscaDaLista` com `atrasoMs={750}`, `rotulo` "Buscar", largura 240 px, lupa à direita (07-001; com foco a borda `casca-marca`, 07-032). Busca mudou → página 1.
- `FiltroDeStatus`: `Popover` com `GatilhoDeFiltro rotulo="Status" contagem={n}`; painel (`PainelSuspenso`) com duas linhas `CaixaDaCasca` + "Ativa" / "Pausada". Sem fechar ao marcar.
- `FiltroDeAgente`: `GatilhoDeFiltro` com o ícone `Bot` 13 px antes do rótulo "Agente"; painel de 280 px com a busca "Buscar agente" no topo (filtra por `semAcento`), "Sem agente" (círculo vazio de 22 px) e cada agente (avatar de iniciais de 22 px + nome), com `CaixaDaCasca`.
- À direita (`ml-auto`), "N itens" (12 px, `casca-suave`) sobre a lista filtrada (`textoDeItens`).
- Filtro mudou → página 1 e seleção limpa.

### 4.7 Tabela e linha (`TabelaDeAutomacoes`, `LinhaDaAutomacao`, 07-001)

`table` `w-full table-fixed`, cabeçalho fixo (`sticky top-0 bg-surface`), 52 px, `border-b`. `TH` como em `TabelaDeCampanhas.tsx` (10 px, 600, `tracking-[0.1em]`, maiúsculas). Colunas e larguras: caixa 56 px; NOME (sem largura, ocupa o resto); AGENTE 240 px; status 72 px (cabeçalho sem texto, só as setas); ÚLTIMA ALTERAÇÃO 200 px; estrela 44 px; ⋮ 44 px. NOME, status e ÚLTIMA ALTERAÇÃO são botões de ordenar (`aria-sort`): ícone `ChevronsUpDown` 11 px quando a coluna não é a da ordem, `ChevronDown`/`ChevronUp` quando é. Clicar na coluna atual inverte; em outra, começa em `asc` (data começa em `desc`). Ordem mudou → página 1.
- Caixa do cabeçalho: `CaixaDaCasca` com `"indeterminada"` quando parte da página está marcada; `rotulo` "Selecionar todas as automações da página"; marca/desmarca só a página.
- Linha de **64 px**, `border-b border-casca-divisoria`, hover `casca-raia/40`.
  - `CaixaDaCasca` `rotulo` "Selecionar automação".
  - Nome: `Link` para `rotaDeAbrir(a)` (13 px, 500, `casca-texto`, `truncate`, hover sublinhado). Forma "editor" chama a abertura do editor (seção 4.1) em vez de navegar.
  - `AgenteDaLinha`: avatar de 24 px com as iniciais (molde de cor: fundo `casca-marca-suave`, texto `casca-marca`, 10 px, 600) + nome 12 px `casca-texto-2`; com mais agentes, "+N" (11 px, `casca-suave`) depois do nome; sem agente, "—" `casca-suave`.
  - `InterruptorDaCasca` (`ligado = ativa`, `aria-label` "Pausar {nome}" / "Ativar {nome}").
  - Data: `dataHoraBr(atualizadaEm, fuso)` 12 px `casca-texto-2`, `tabular-nums`.
  - Estrela (Q12) e o ⋮ (`EllipsisVertical` 16 px, `aria-label` "Mais opções").
- Carregando: 10 linhas-esqueleto (L17). Erro: `ErroDaLista` com "Não foi possível carregar as automações" e "Tente recarregar a página." (L18). Vazio (sem nenhuma automação **ou** busca/favoritos/pasta sem resultado, como 07-031 e 07-032): ícone `Zap` 20 px num quadrado de 56 px `rounded-xl bg-casca-marca-suave text-casca-marca`, "Nenhuma automação criada" (14 px, 600), "Crie automações para executar ações automaticamente no seu funil." (12 px, `casca-suave`, centralizado, `max-w-[200px]`) e o botão de contorno "+ Nova automação". Vazio **só por filtro de Status ou Agente**: "Nenhuma automação corresponde a este filtro" / "Ajuste o filtro de status ou limpe-o para ver suas automações." / botão "Limpar filtro" (L20; **provisório**, sem print).

### 4.8 Menu ⋮ da automação (`MenuDaAutomacao`, 07-004, Q10)

Itens 12 px com ícone 14 px: "Abrir no fluxo" (`Workflow`) → `router.push(rotaDoFluxo(id))`; "Editar no editor" (`SquarePen`) → abre o editor (4.1); "Renomear" (`Pencil`) → `JanelaRenomearAutomacao`; "Duplicar automação" (`Copy`) → `duplicar` com os toasts da Q9 (o "Ir para a automação" vai para `rotaDeAbrir` da cópia); divisória; "Sem pasta" (`FolderOff`) e cada pasta (`IconeDaPasta` + nome), com `Check` 14 px `casca-marca` à direita da atual, lista com rolagem a partir de 216 px; escolher → `organizar(id, { pasta_id })` e toast "Automação movida"; divisória; "Excluir" (`Trash2`, vermelho) → `JanelaDeConfirmacao` "Excluir automação" / "Você deseja excluir esta automação?" / "Cancelar" e "Confirmar" (não `perigo`: na Clint o Confirmar é roxo, L23) → `excluir(id)`.

### 4.9 Barra de lote (`BarraDeLoteDasAutomacoes`, 07-010)

Molde visual: `components/escale/contatos/massa/BarraDeLote.tsx` (mesma faixa fixa, `BOTAO_DA_BARRA_DE_LOTE`). Conteúdo: "×" (`aria-label` "Remover selecionados", limpa a seleção), o número, "SELECIONADOS", divisória, "Mover para pasta" (`FolderInput` 16 px + texto) que abre um `DropdownMenu` com "Sem pasta" e as pastas (**provisório**, sem print), e a lixeira (`Trash2` 18 px, dica "Excluir selecionados") que abre "Excluir automações" / "Tem certeza que deseja excluir {n} automações? Esta ação não pode ser desfeita." (1 → "… excluir 1 automação? …"). Resultados: toasts com o plural da Clint (seção 6, textos), seleção limpa depois.

### 4.10 Janela "Criar nova automação" (`JanelaCriarAutomacao`, 07-006, B15)

Props: `{ aberta: boolean; aoFechar: () => void; pastas: PastaDeAutomacao[]; pastaInicial: string | null; aoCriar: (e: { nome: string; pastaId: string | null; forma: FormaDeMontar }) => void }`. Casca do modal: `JanelaDaCasca` (`components/escale/origens/JanelaDaCasca.tsx`), 576 px de largura, `rounded-xl`.
- Cabeçalho 56 px, `border-b`, `px-5`: "Criar nova automação" (14 px, 500) e "×" (`aria-label` "Fechar").
- Corpo `px-6 py-6 flex flex-col gap-5`: "Nome da automação" (12 px, 500) e o campo 32 px, fundo `casca-raia`, sem borda, `rounded-[4px]`, 12 px, placeholder "Digite o nome da automação", foco automático. "Pasta" (só quando há pastas, como a Clint) com `SeletorDaCasca` (`aparencia="filtro"`, opções "Sem pasta" + as pastas, valor inicial = `pastaInicial`, a pasta aberta no trilho). Depois, **"Como você quer montar?"** (12 px, 500) e dois cartões lado a lado (`grid grid-cols-2 gap-3`), `button` com `aria-pressed`, `rounded-lg border p-3 text-left`: **"No fluxo"** (`Workflow` 18 px) / "Monte com caixas ligadas, do gatilho às ações." e **"No editor"** (`ListChecks` 18 px) / "Monte num formulário, passo a passo."; o escolhido com borda `casca-marca` e fundo `casca-marca-suave`. Padrão: "No fluxo". (Os cartões não estão na Clint: B15 adapta. **Provisório** até a conferência.)
- Rodapé 72 px, `border-t`, à direita: "Cancelar" (contorno) e "Salvar" (`BotaoDaCasca variante="marca"`). Salvar com nome vazio → não faz nada (o botão fica desabilitado); com mais de 80 → toast "O nome deve ter no máximo 80 caracteres" e não fecha.

`aoCriar` na página: forma "fluxo" → `router.push(rotaDoFluxoNovo({ nome, pastaId }))`; forma "editor" → abre o `RuleEditor` com `rule = null`, `nomeInicial = nome` e `aoCriar = (regra) => organizarAoCriar(regra.id, { pasta_id: pastaId, forma: "editor" })`.

### 4.11 Janela "Renomear automação" (`JanelaRenomearAutomacao`, Q10)

Mesma casca e campo do 4.10, título "Renomear automação", sem Pasta e sem os cartões, valor inicial = nome atual. Salvar → `renomear(id, nome)`; sucesso fecha. Regra de 80 da Q11.

### 4.12 Estado da tela (`estado-da-lista.ts`)

`useEstadoDaLista(pastasExistentes: readonly string[])` devolve `{ visao, setVisao, busca, setBusca, status, setStatus, agentes, setAgentes, ordem, alternarOrdem, pagina, setPagina, porPagina, setPorPagina, selecionadas, alternarSelecao, selecionarPagina, limparSelecao }`, todos imutáveis (`Set` novo a cada mudança). Lê e grava `{ visao, ordem, porPagina }` em `localStorage["escale:automacoes:lista"]` com `try/catch`; visão de pasta que não existe mais vira "Todas".

### 4.13 Editor em formulário com o visual da casca (D1, Q5)

Bloco novo em `app/escale-tema.css`, logo **depois** do bloco `FORK ESCALE · Fase 8A (lista de campanhas)` (`grep -n "Fase 8A (lista de campanhas)" app/escale-tema.css`):

```css
/* ─── FORK ESCALE · Fase 5A (editor de automação em formulário) ───
   O RuleEditor do original aberto pela lista da casca (data-escale-editor-de-automacao):
   campos, caixas de seleção e rótulos com o desenho dos campos da casca. A lista
   aberta da caixa de seleção mora num portal, por isso o seletor pelo body. */
body:has([data-escale-casca]) [data-escale-editor-de-automacao] :is(input, textarea, [role="combobox"]) {
  background-color: var(--color-casca-raia);
  border-color: transparent;
  border-radius: 4px;
  font-size: 13px;
}
body:has([data-escale-casca]) [data-escale-editor-de-automacao] :is(input, textarea, [role="combobox"]):focus-visible {
  border-color: var(--color-casca-marca);
  box-shadow: none;
}
body:has([data-escale-casca]) [data-escale-editor-de-automacao] label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-casca-texto);
}
body:has([data-escale-editor-de-automacao]) [role="listbox"] [role="option"] {
  font-size: 12px;
  min-height: 34px;
}
body:has([data-escale-editor-de-automacao]) [role="listbox"] [role="option"][data-highlighted] {
  background-color: var(--color-casca-marca-suave);
}
```

---

## 5. Encaixes nos arquivos do original

Cada encaixe leva `// FORK ESCALE · Fase 5A: …` (ou `{/* … */}` em JSX).

1. **`lib/escale/menu-do-topo.ts`** — o item "Automações" passa a ser `{ href: "/app/automacoes", rotulo: "Automações", ativoEm: ["/app/automacoes", "/app/webhooks/automacoes"] }`, com o comentário `// FORK ESCALE · Fase 5A: o topo abre a lista de automações da casca (PRD 5, A1).`
2. **`lib/navigation/catalogo.ts`** — depois da entrada `/app/campaigns`: `{ href: "/app/automacoes", label: "Automações", description: "Quando algo acontece, o sistema faz por você: move o negócio, põe tag, manda a mensagem.", icon: "FlowArrow", group: "crm", section: "O dia a dia da venda", minRole: "manager" }` com `// FORK ESCALE · Fase 5A: a lista de automações da casca (sem a casca, a página manda para Webhooks).`
3. **`app/app/webhooks/page.tsx`** — depois do `if (!canManage) redirect(...)`: `const daCasca = lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo";` `if (daCasca && pedida === "automacoes") redirect("/app/automacoes");` e `<WebhooksClient abaInicial={abaInicial} semAutomacoes={daCasca} />`.
4. **`app/app/webhooks/_components/WebhooksClient.tsx`** — prop `semAutomacoes?: boolean`; com ela, o `TabsTrigger` e o `TabsContent` de `rules` não renderizam, e o esqueleto usa a largura medida de **três** abas (medir no navegador a 1440 px com `document.querySelector('[role=tablist]').getBoundingClientRect().width` e gravar o número no `className`, com o comentário de onde veio, como o 432 de hoje).
5. **`app/app/webhooks/_components/RuleEditor.tsx`** — `Props` ganha `nomeInicial?: string`, `aoCriar?: (regra: AutomationRuleRow) => void | Promise<void>` e `daCasca?: boolean`. No efeito de abrir: `setName(rule?.name ?? nomeInicial ?? "")` (e `nomeInicial` entra na lista de dependências). No criar: `const criada = await create.mutateAsync(parsed.data); await aoCriar?.(criada.data);`. No `SheetContent`: `data-escale-editor-de-automacao={daCasca ? "" : undefined}`.
6. **`app/app/webhooks/automacoes/[id]/page.tsx`** — recebe `searchParams: Promise<{ nome?: string | string[]; pasta?: string | string[] }>`; com `id === "nova"`: `nomeInicial` = `nome` (string, cortado em 80) e `pastaInicial` = `pasta` se passar no `UUID`; passa os dois para `DesignerDeAutomacao`.
7. **`…/_components/DesignerDeAutomacao.tsx`** — props `nomeInicial?: string` e `pastaInicial?: string | null`; `const organizarAoCriar = useOrganizarAoCriar();` e, para a regra nova, `<CanvasDaAutomacao … nomeInicial={nomeInicial} aoCriar={nomeInicial !== undefined ? (id) => organizarAoCriar(id, { pasta_id: pastaInicial ?? null, forma: "fluxo" }) : undefined} />`.
8. **`…/_components/CanvasDaAutomacao.tsx`** — `Props` ganha `nomeInicial?: string` e `aoCriar?: (id: string) => Promise<void>`; `useState(regra?.name ?? nomeInicial ?? "")` só no `nome` (o retrato salvo continua `""`, então a automação nova segue marcada "com alterações não salvas"); depois do `criar.mutateAsync`, antes do `router.replace`: `await aoCriar?.(criada.data.id);`.
9. **`lib/audit/actions.ts`** — depois do bloco `// FORK ESCALE · Fase 2D: empresas da casca (migration 9105).` (fim da lista dele): `// FORK ESCALE · Fase 5A: pastas e organização da lista de automações (migration 9701).` + `"automation.folder_created"`, `"automation.folder_updated"`, `"automation.folder_deleted"`, `"automation.rule_moved"`, `"automation.rule_cloned"`.
10. **`lib/i18n/dicionario.ts`** — os textos da seção 6 (conferir antes se a chave já existe: `grep -n '"Excluir"' lib/i18n/dicionario.ts`; não duplicar).
11. **`app/escale-tema.css`** — o bloco da seção 4.13.

`useOrganizarAoCriar()` (em `hooks/escale/useAutomacoesDaCasca.ts`) devolve `(id, organizacao) => Promise<void>`: chama `PUT …/{id}/organizacao`, invalida `CHAVE_DAS_AUTOMACOES` e, em erro, mostra o toast "A automação foi criada, mas não foi possível colocá-la na pasta." **sem lançar** (o fluxo e o editor seguem como se nada tivesse acontecido). Quando `pasta_id` é `null` e a forma é `fluxo`, grava assim mesmo (a forma é o que importa para o clique no nome).

---

## 6. Textos (pt → es)

Da Clint (`material-do-codigo.md` 3.1 e 3.2): Automações → Automatizaciones; Nova automação → Nueva automatización; Todas → Todas; Favoritos → Favoritos; Pastas → Carpetas; Sem pasta → Sin carpeta; Nova pasta → Nueva carpeta; Nenhuma pasta criada → Ninguna carpeta creada; Opções da pasta → Opciones de la carpeta; Renomear → Renombrar; Nome da pasta → Nombre de la carpeta; Cor → Color; Ícone → Ícono; Excluir esta pasta? As automações dentro dela ficarão sem pasta. → ¿Eliminar esta carpeta? Las automatizaciones que contiene quedarán sin carpeta.; Pasta excluída → Carpeta eliminada; Buscar → Buscar; Status → Estado; Agente → Agente; Buscar agente → Buscar agente; Sem agente → Sin agente; {n} item → {n} elemento; {n} itens → {n} elementos; Nome → Nombre; Última alteração → Última modificación; Selecionar automação → Seleccionar automatización; Selecionar todas as automações da página → Seleccionar todas las automatizaciones de la página; Adicionar aos favoritos → Añadir a favoritos; Remover dos favoritos → Quitar de favoritos; Mais opções → Más opciones; Duplicar automação → Duplicar automatización; A automação está sendo duplicada, aguarde a finalização. → La automatización se está duplicando, espere a que termine.; Automação duplicada com sucesso! → ¡Automatización duplicada con éxito!; Ir para a automação → Ir a la automatización; Automação movida → Automatización movida; Mover para pasta → Mover a carpeta; Excluir selecionados → Eliminar seleccionados; {n} automação movida → {n} automatización movida; {n} automações movidas → {n} automatizaciones movidas; {n} automação não pôde ser movida → {n} automatización no se pudo mover; {n} automações não puderam ser movidas → {n} automatizaciones no se pudieron mover; {n} automação excluída → {n} automatización eliminada; {n} automações excluídas → {n} automatizaciones eliminadas; {n} automação não pôde ser excluída → {n} automatización no se pudo eliminar; {n} automações não puderam ser excluídas → {n} automatizaciones no se pudieron eliminar; Nenhuma automação criada → Ninguna automatización creada; Crie automações para executar ações automaticamente no seu funil. → Cree automatizaciones para ejecutar acciones automáticamente en su embudo.; Nenhuma automação corresponde a este filtro → Ninguna automatización coincide con este filtro; Ajuste o filtro de status ou limpe-o para ver suas automações. → Ajuste el filtro de estado o límpielo para ver sus automatizaciones.; Limpar filtro → Limpiar filtro; Não foi possível carregar as automações → No fue posible cargar las automatizaciones; Tente recarregar a página. → Intente recargar la página.; Criar nova automação → Crear nueva automatización; Nome da automação → Nombre de la automatización; Digite o nome da automação → Escriba el nombre de la automatización; Pasta → Carpeta; O nome deve ter no máximo 80 caracteres → El nombre debe tener como máximo 80 caracteres; Excluir automação → Eliminar automatización; Você deseja excluir esta automação? → ¿Desea eliminar esta automatización?; Confirmar → Confirmar; Excluir automações → Eliminar automatizaciones; Tem certeza que deseja excluir {n} automações? Esta ação não pode ser desfeita. → ¿Seguro que desea eliminar {n} automatizaciones? Esta acción no se puede deshacer.; Tem certeza que deseja excluir 1 automação? Esta ação não pode ser desfeita. → ¿Seguro que desea eliminar 1 automatización? Esta acción no se puede deshacer.; Remover selecionados → Quitar seleccionados; selecionados → seleccionados; Fechar → Cerrar.

Nossos (adaptações): Como você quer montar? → ¿Cómo quiere armarla?; No fluxo → En el flujo; Monte com caixas ligadas, do gatilho às ações. → Ármela con cajas conectadas, del disparador a las acciones.; No editor → En el editor; Monte num formulário, passo a passo. → Ármela en un formulario, paso a paso.; Abrir no fluxo → Abrir en el flujo; Editar no editor → Editar en el editor; Renomear automação → Renombrar automatización; Ativa → Activa; Pausada → Pausada; A automação foi criada, mas não foi possível colocá-la na pasta. → La automatización se creó, pero no fue posible ponerla en la carpeta.; A pasta escolhida não existe mais. → La carpeta elegida ya no existe.; Pasta não encontrada. → Carpeta no encontrada.; Todas › {pasta} usa as chaves existentes; os 8 nomes de cor e os 8 de ícone da seção 1.2; a descrição do catálogo (seção 5, item 2).

---

## 7. Tasks

Cada task: teste primeiro (RED), rodar `corepack pnpm vitest run <arquivo>` e ver falhar, implementar, ver passar, `corepack pnpm typecheck`, `corepack pnpm eslint <arquivos>`, commit.

### Task 0: Worktree
- [ ] `git -C repo fetch escale-crm` e conferir que o fix do 409 está na main: `git -C repo branch -r --contains 8d6c48260 | grep "escale-crm/main"` (tem de aparecer).
- [ ] `git -C repo worktree add ../wt-5a -b feat/fase-5a-lista-de-automacoes escale-crm/main`; `corepack pnpm install --frozen-lockfile` em `wt-5a`.
- [ ] Copiar este plano para `wt-5a/docs/superpowers/plans/` (os planos também vão para o repositório).
- [ ] Conferir os nomes reais: `ai_agents.archived_at` e `ai_agents.name` (`grep -n "archived_at" supabase/baseline.sql | grep -i agent`), `send_ai_message.config.agent_id` (`lib/schemas/webhooks.ts`), `POR_PAGINA` (`lib/escale/contatos/regras.ts`), `dataHoraBr` (`lib/escale/negocio/arquivos.ts`). Se divergirem, ajustar o plano antes de seguir.

### Task 1: Regras puras (rotas, pastas, tipos, regras, schema)
**Files:** create `lib/escale/automacoes/{rotas,pastas,tipos,regras,schema}.ts`; test `tests/unit/escale-automacoes-regras.test.ts`.
**Produces:** tudo da seção 1 (nomes e tipos exatos).
- [ ] Testes de rotas e pastas: `rotaDoFluxoNovo({ nome: "Pós venda", pastaId: null })` → `"/app/webhooks/automacoes/nova?nome=P%C3%B3s+venda"`; com pasta, `&pasta=<id>`; `rotaDeAbrir({ id: "a", forma: null })` e `forma: "fluxo"` → `"/app/webhooks/automacoes/a"`; `forma: "editor"` → `"/app/automacoes?editor=a"`. `CORES_DA_PASTA` tem 8, começa em `marca` e termina em `gray`; `ICONES_DA_PASTA` tem 8, começa em `folder` e termina em `flag`; `corDaPasta("marca")` → `"var(--color-casca-marca)"`, `("red")` → `"#DC2626"`, `("roxo")` → `"var(--color-casca-raia)"`; `corDoIconeDaPasta("gray")` → `"var(--color-casca-suave)"`; os dois `Record` de nomes têm 8 chaves.
- [ ] Testes das regras: `agentesDaRegra` com `[{type:"send_ai_message",config:{agent_id:"g1"}},{type:"add_tag",config:{}},{type:"send_ai_message",config:{agent_id:"g2"}},{type:"send_ai_message",config:{agent_id:"g1"}}]` e conhecidos `{g1,g2}` → `["g1","g2"]`; com conhecidos `{g2}` → `["g2"]`; com `null`, `"x"`, `[{type:"send_ai_message"}]` → `[]`. `filtrarAutomacoes`: visão favoritos só favoritas; pasta `p1` só `pastaId === "p1"`; "sem pasta" só `pastaId === null` (a rota já devolve `null` quando a pasta foi excluída, pelo `set null` da FK); busca "pos-venda" e "PÓS" acham "Pós-venda - Negócio Ganho", e "pos venda" não acha (a busca é "contém", sem acento e sem caixa); status `["pausada"]` só `ativa === false`; agentes `["sem_agente"]` só `agentes.length === 0`; `["g1"]` só quem tem g1; `["sem_agente","g1"]` a união. `ordenarAutomacoes`: nome asc põe "Ágil" antes de "beta" e "Zeta" por último; status asc põe as ativas antes; atualizada desc põe a mais recente primeiro; a entrada (`Object.freeze`) não muda. `paginar` de 23 itens, página 3 de 10 → 3 itens e página 3; página 9 → página 3. `contagensDoTrilho` com 5 automações (2 favoritas, 2 em `p1`, 1 em pasta que não existe, 2 sem pasta) e pastas `[p1]` → `{ todas: 5, favoritos: 2, porPasta: { p1: 2 }, semPasta: 3 }`. `mostrarSemPasta` falso sem pastas e falso com `semPasta: 0`. `nomeDaCopia("Vendas")` → `"Vendas (cópia)"`; com 120 letras o resultado tem 120 e termina em " (cópia)". `textoDeItens(1)` → `{ chave: "{n} item", n: "1" }`; `(1234)` → `{ chave: "{n} itens", n: "1.234" }`.
- [ ] Testes do schema: `pastaSchema` recusa nome vazio, nome de 61, cor `"purple"`, chave extra; aceita `{ nome: "Pós venda" }`. `organizacaoSchema` recusa `{}` e `{ forma: "lista" }`; aceita `{ pasta_id: null }` e `{ forma: "editor" }`. `loteSchema` recusa 0 e 101 ids e id que não é uuid.
- [ ] Implementar; rodar; commit: `feat(escale): regras da lista de automações da casca`.

### Task 2: Migration 9701, baseline e invariantes
**Files:** create a migration (seção 2), colar o bloco no `supabase/baseline.sql` (Global Constraints), create `tests/invariants/escale-automacoes-9701.test.ts` (molde `tests/invariants/escale-paineis-9602.test.ts`: `seedGov()`, `como(userId, sql)`, `countAs`; ids `e5ca1e00-9701-4000-8000-…`).
- [ ] Semente: duas regras na `GOV_ORG` (uma com `trigger_config` e duas ações), uma regra numa outra organização, uma pasta na `GOV_ORG` e uma na outra.
- [ ] Invariantes: as três tabelas têm RLS e as policies `support_write_*`; `anon` não lê nenhuma e não executa as duas funções; **pastas**: gerente cria, renomeia e exclui; agente não cria (`count` 0 depois do insert recusado); a outra organização não vê a pasta da `GOV_ORG`; cor `'purple'` e ícone `'x'` recusados pelo `check`; **organização**: gerente grava `pasta_id` e `forma`; `forma = 'lista'` recusada; linha com `organization_id` da outra org para regra da `GOV_ORG` → `automacao_de_outra_organizacao`; pasta da outra org → violação da FK composta; excluir a pasta deixa `pasta_id` nulo e mantém a linha e a `forma`; excluir a regra apaga a linha; **favoritos**: o gerente vê só os seus (o admin não vê o do gerente); agente não grava; excluir a regra apaga o favorito; **duplicar** como gerente: nova regra com o nome pedido, `is_active = false`, mesmo `trigger_event`, `trigger_config`, `conditions` e `actions`, `last_change_actor_kind = 'user'`, e linha na 9701 com a mesma pasta e forma; regra sem linha na 9701 → cópia com linha de pasta e forma nulas; como agente → erro da RLS; regra da outra org → `automacao_nao_encontrada`; nome de 200 letras → nome com 120.
- [ ] Rodar `corepack pnpm test:db tests/invariants/escale-automacoes-9701.test.ts` (Docker aberto) até verde; `corepack pnpm checar:colisao-de-migration`.
- [ ] Commit: `feat(escale): migration 9701 (pastas, organização e favoritos de automação)`.

### Task 3: Banco e rotas
**Files:** create `lib/escale/automacoes/banco.ts`, as 8 rotas da seção 3, os códigos no `lib/audit/actions.ts` (seção 5, item 9), textos de rota no dicionário; test `tests/unit/escale-automacoes-rotas.test.ts` (molde `tests/unit/escale-paineis-rotas.test.ts` para mockar `requireRole`, `requireSupportWrite`, `createClient`, `audit`).
- [ ] Testes: GET como gerente → 200 com `automacoes` (sem o campo `actions` em nenhuma), `pastas`, `agentes`, e o `agentes` de cada automação calculado pela Q1; agente → 403; a leitura de `automation_rules` usou `limit(1000)` e `organization_id` da sessão. POST pasta: corpo inválido → 422; sucesso → 201 com `id`, insert com `organization_id` da sessão mesmo que o corpo traga outro (a `.strict()` recusa a chave: 422), cor e ícone padrão; suporte somente leitura → a resposta de `requireSupportWrite` sem tocar no banco. PATCH/DELETE pasta: id não uuid → 404 sem banco; não encontrada → 404; sucesso → `audit` com o código certo. PUT organização: regra de outra org → 404; pasta inexistente → 422 "A pasta escolhida não existe mais."; só `forma` → não audita; com `pasta_id` → `automation.rule_moved`. PUT favorita: `true` faz upsert, `false` faz delete, regra de outra org → 404. Duplicar: chama a RPC com `nomeDaCopia` do nome lido; não lida → 404; sucesso → 201 e `automation.rule_cloned`. Mover: 101 ids → 422; devolve `movidas` e `falhas`. Excluir: devolve `excluidas` e `falhas` e audita uma vez por excluída.
- [ ] Implementar; rodar; commit: `feat(escale): rotas da lista de automações da casca`.

### Task 4: Hooks
**Files:** create `hooks/escale/useAutomacoesDaCasca.ts`; test `tests/unit/escale-automacoes-hooks.test.tsx` (molde `tests/unit/escale-campanhas-hooks.test.tsx`).
**Produces:** `CHAVE_DAS_AUTOMACOES = ["automation-rules", "da-casca"] as const`; `useListaDeAutomacoes(): UseQueryResult<ListaDeAutomacoes>` (`staleTime: 15_000`); `useAcoesDasPastas(): { criar; editar; excluir }`; `useAcoesDasAutomacoes(): { alternar: ({ id, ativa }) ; renomear: ({ id, nome }); excluir: (id); duplicar: (id) → { id }; favoritar: ({ id, favorita }); organizar: ({ id, pasta_id?, forma? }); moverEmLote: ({ ids, pasta_id }) → { movidas, falhas }; excluirEmLote: (ids) → { excluidas, falhas } }` (todas `UseMutationResult`, `onError: showApiError`, invalidando `CHAVE_DAS_AUTOMACOES` no fim); `useOrganizarAoCriar(): (id, o) => Promise<void>` (seção 5).
- [ ] Testes com `apiClient` mockado: a lista lê `GET /api/v1/automacoes-da-casca`; `alternar` chama `PATCH /api/v1/automation-rules/{id}` com `{ is_active }` e muda a linha **antes** da resposta (otimista) e desfaz se falhar; `favoritar` idem com `PUT …/{id}/favorita`; `renomear` manda `{ name }`; `excluir` chama `DELETE /api/v1/automation-rules/{id}`; cada uma das outras chama a URL e o método da seção 3; invalidar `["automation-rules"]` (o que o original faz) recarrega a lista da casca (prova do prefixo); `useOrganizarAoCriar` com a rota falhando mostra o toast da seção 5 e não lança.
- [ ] Implementar; rodar; commit: `feat(escale): hooks da lista de automações da casca`.

### Task 5: Trilho de pastas
**Files:** create `TrilhoDePastas.tsx`, `EditorDePasta.tsx`, `MenuDaPasta.tsx`, `IconeDaPasta.tsx` em `components/escale/automacoes/lista/`; ícones novos em `lib/ui/icons-da-casca.ts` (`Folder`, `FolderInput` e `Settings2` do lucide, se faltarem; `FolderOff` desenhado com `createLucideIcon("FolderOff", [["path", { d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z", key: "pasta" }], ["path", { d: "m2 2 20 20", key: "risco" }]])`, a pasta riscada da Clint, conferir na bateria); textos; test `tests/unit/escale-automacoes-trilho.test.tsx` (hooks mockados; `wrapper` com `QueryClientProvider` e `TooltipProvider`, memória `provedor-escondido-pelo-teste`: o provedor tem de existir também na página real).
- [ ] Testes: Todas e Favoritos com os contadores; "PASTAS"; carregando → o esqueleto e nenhuma pasta; sem pastas → "Nenhuma pasta criada" e sem "Sem pasta"; com pasta e automação sem pasta → "Sem pasta" com o contador; clicar numa pasta chama `aoMudarVisao({ tipo: "pasta", id })` e o item fica com `aria-current`; "Nova pasta" abre o editor com foco no campo, 8 cores e 8 ícones, o cinza e a pasta marcados (`aria-pressed`); Enter com nome vazio não salva; Enter com "Pós venda" chama `criar` com `{ nome: "Pós venda", cor: "gray", icone: "folder" }`; escolher a cor vermelha e o ícone bandeira e clicar "Salvar" manda os dois; Esc fecha e volta o link; o ⋮ da pasta abre Renomear e Excluir; Renomear abre o editor com os valores da pasta e salvar chama `editar` só com o que mudou; Excluir abre a confirmação com o texto da Clint e confirmar chama `excluir`; excluída a pasta ativa → `aoMudarVisao({ tipo: "todas" })` e o toast "Pasta excluída".
- [ ] Implementar (seções 4.3–4.5); rodar; commit: `feat(escale): trilho de pastas das automações`.

### Task 6: Barra, filtros, tabela, menu, vazios, paginação e lote
**Files:** create `BarraDeFerramentas.tsx`, `FiltroDeStatus.tsx`, `FiltroDeAgente.tsx`, `TabelaDeAutomacoes.tsx`, `LinhaDaAutomacao.tsx`, `AgenteDaLinha.tsx`, `MenuDaAutomacao.tsx`, `VaziosDasAutomacoes.tsx`, `BarraDeLoteDasAutomacoes.tsx`, `estado-da-lista.ts` e `AutomacoesDaCasca.tsx` (sem as janelas da Task 7, que entram com botões já ligados a estados abertos); textos; test `tests/unit/escale-automacoes-lista.test.tsx` (molde `tests/unit/escale-campanhas-tabela.test.tsx`; timers falsos para os 750 ms).
- [ ] Testes: carregando → 10 linhas-esqueleto; erro → os dois textos da Clint e "Tentar de novo" recarrega; vazio → "Nenhuma automação criada", o texto e "+ Nova automação"; Favoritos sem favorita → o mesmo vazio (07-031); 12 automações → 10 linhas na página 1 e "12 itens"; a ordem padrão é a última alteração mais recente primeiro; clicar em NOME ordena de A a Z e de novo de Z a A, com `aria-sort`; a data sai `dd/mm/aaaa HH:mm:ss` no fuso passado (`2026-10-16T13:24:17Z` em `America/Sao_Paulo` → "16/10/2026 10:24:17"); a busca "zzqx" depois de 750 ms → vazio e "0 itens"; antes de 750 ms a lista não muda; Status "Pausada" deixa só as pausadas e o vazio por filtro mostra "Limpar filtro", que limpa; Agente: a busca do painel filtra os agentes, "Sem agente" deixa só as sem agente; a coluna mostra o nome do agente e "+1" quando há dois, "—" sem agente; o interruptor chama `alternar`; a estrela chama `favoritar` e troca a dica; o nome de uma automação `forma: null` é link para `/app/webhooks/automacoes/{id}`, e o de uma `forma: "editor"` abre o editor (o `RuleEditor` mockado recebe a regra lida por `fetchQuery`); o ⋮ tem, nesta ordem, Abrir no fluxo, Editar no editor, Renomear, Duplicar automação, Sem pasta, as pastas com ✓ na atual, Excluir; mover pelo ⋮ chama `organizar` com `{ pasta_id }` e o toast "Automação movida"; Duplicar mostra os dois toasts da Q9; Excluir confirma com "Excluir automação" / "Você deseja excluir esta automação?" e chama `excluir`; marcar duas linhas mostra a barra com "2" e "SELECIONADOS"; a caixa do cabeçalho fica indeterminada e depois marca a página; "Mover para pasta" › pasta chama `moverEmLote` e mostra "2 automações movidas"; a lixeira confirma "Tem certeza que deseja excluir 2 automações? …" e, com `{ excluidas: [a], falhas: [b] }`, mostra "1 automação excluída" e "1 automação não pôde ser excluída"; "×" limpa; trocar de pasta limpa a seleção e volta à página 1; a visão, a ordem e o por página voltam do `localStorage` (e um `localStorage` que lança não quebra a tela); a visão "sem pasta" sem pasta para mostrar volta a "Todas".
- [ ] Implementar (seções 4.1, 4.2, 4.6–4.9, 4.12); rodar; commit: `feat(escale): lista de automações da casca (tabela, filtros, menu e lote)`.

### Task 7: Janelas de criar e renomear e a abertura na forma
**Files:** create `JanelaCriarAutomacao.tsx`, `JanelaRenomearAutomacao.tsx`; ligar em `AutomacoesDaCasca.tsx` e `MenuDaAutomacao.tsx`; textos; test `tests/unit/escale-automacoes-janelas.test.tsx`.
- [ ] Testes do criar: "Nova automação +" abre "Criar nova automação" com o campo focado; sem pastas não há "Pasta"; com pastas, "Pasta" abre em "Sem pasta" na visão Todas e na pasta aberta quando o trilho está numa pasta; "No fluxo" vem escolhido (`aria-pressed`); "Salvar" desabilitado com o nome vazio; 81 letras → toast "O nome deve ter no máximo 80 caracteres" e a janela fica; "No fluxo" + "Vendas" + pasta p1 → `router.push("/app/webhooks/automacoes/nova?nome=Vendas&pasta=p1")`; "No editor" → o `RuleEditor` mockado abre com `rule = null`, `nomeInicial = "Vendas"` e `daCasca`, e chamar o `aoCriar` dele com `{ id: "r9" }` chama `PUT …/r9/organizacao` com `{ pasta_id: "p1", forma: "editor" }`; "Cancelar" e "×" fecham sem navegar.
- [ ] Testes do renomear: abre com o nome atual, "Salvar" desabilitado até mudar, salvar chama `renomear` com o nome novo sem espaços nas pontas, a regra de 80 vale.
- [ ] Teste do `?editor=`: `editorAberto = "r1"` busca a regra e abre o editor; fechar chama `router.replace("/app/automacoes")`; regra que não existe → `showApiError` e nenhum editor.
- [ ] Implementar (seções 4.10, 4.11 e a abertura da 4.1); rodar; commit: `feat(escale): criar e renomear automação na casca, abrindo na forma escolhida`.

### Task 8: Página, menu, catálogo, Webhooks, editor e fluxo (encaixes)
**Files:** create `app/app/automacoes/page.tsx`; modify os arquivos da seção 5 (itens 1–8 e 11); tests `tests/unit/escale-automacoes-pagina.test.tsx` (molde `tests/unit/escale-campanhas-pagina.test.tsx`), `tests/unit/escale-automacoes-encaixes.test.tsx` e `tests/unit/escale-menu-do-topo.test.ts`.
- [ ] `app/app/automacoes/page.tsx`: `dynamic = "force-dynamic"`, `metadata = { title: "Automações" }`; sem a casca → `redirect("/app/webhooks?aba=automacoes")`; com a casca: `resolveActiveOrg(await requireAuth())`; sem org ou `!roleAtLeast(org.role, "manager")` → `redirect("/app/inbox")`; senão `<AutomacoesDaCasca fuso={org.timezone ?? "America/Sao_Paulo"} editorAberto={editor válido pelo UUID ou null} />`.
- [ ] Testes da página: casca + gerente → `AutomacoesDaCasca` com o fuso; casca + agente → `/app/inbox`; sem casca → `/app/webhooks?aba=automacoes`; `?editor=abc` (não uuid) → `editorAberto = null`.
- [ ] Testes dos encaixes: `WebhooksClient` com `semAutomacoes` não tem a aba "Automações" e tem as outras três; sem a prop, as quatro (o original); `webhooks/page.tsx` com a casca e `?aba=automacoes` → `redirect("/app/automacoes")`, sem a casca abre a aba; `RuleEditor` com `nomeInicial` abre com o nome preenchido, com `daCasca` tem `data-escale-editor-de-automacao`, e o `aoCriar` recebe a regra criada (mutação mockada); sem as props, o comportamento de hoje (rodar também `tests/unit/automacao-abre-da-versao-do-banco.test.tsx`, que tem de seguir verde); `CanvasDaAutomacao` nova com `nomeInicial="Vendas"` mostra "Vendas" no nome, e salvar chama `aoCriar(id)` antes do `router.replace`; a página do designer passa `nome` (cortado em 80) e só uma `pasta` uuid.
- [ ] Teste do menu: o item "Automações" do topo tem `href` `/app/automacoes` e fica ativo em `/app/webhooks/automacoes/x`; para `"agent"` some (o `minRole` do catálogo); `/app/settings/automacoes` continua no "Mais", em Sua empresa.
- [ ] Rodar também `corepack pnpm vitest run tests/unit/navegacao-completude.test.ts tests/unit/navegacao-registry.test.ts tests/unit/escale-menu-do-topo-tela.test.tsx tests/unit/e2e-navega-para-rota-que-existe.test.ts` e os testes que já existem da aba e do designer (`grep -rln "RulesTab\|WebhooksClient\|CanvasDaAutomacao\|DesignerDeAutomacao" tests/unit`), que têm de seguir verdes.
- [ ] Implementar; rodar; commit: `feat(escale): Automações do topo abre a lista da casca; editor e fluxo gravam pasta e forma`.

### Task 9: Fechamento da fase
- [ ] `corepack pnpm typecheck`; `corepack pnpm eslint lib/escale/automacoes app/api/v1/automacoes-da-casca app/app/automacoes components/escale/automacoes hooks/escale/useAutomacoesDaCasca.ts lib/ui/icons-da-casca.ts lib/escale/menu-do-topo.ts lib/navigation/catalogo.ts app/app/webhooks tests/unit/escale-automacoes-*`; `corepack pnpm vitest run tests/unit/escale-automacoes-* tests/unit/escale-menu-do-topo*`.
- [ ] Cercas da casca: `corepack pnpm vitest run -c vitest.cercas.ts` (a fase cria componentes de casca: `controle-decorativo`, `tailwind-tokens`, `evidencia-citada`…). Corrigir o que apontar sem mexer na cerca. Falhas que já existiam na main (as do LOG de 29/10) ficam anotadas, não corrigidas aqui.
- [ ] Motor intacto: o `git diff --stat` das Global Constraints sai vazio.
- [ ] Auto-revisão do diff pela checklist de `code-review.md` (o revisor Opus 5.5 é um por frente, na bateria).
- [ ] PR para `escale-crm/main` com o corpo: itens do PRD (A1–A3, B1–B6, B8, B10–B15, B17, B18, D1), decisões Q1–Q16, o que é provisório por falta de print (trilha "Todas › pasta", vazio por filtro, menu "Mover para pasta" da barra, janela de renomear, cartões "Como você quer montar?", estrela favorita, tons das cores de pasta, ícone "Sem pasta"), a diferença aceita da Q5 (sem busca nas caixas de seleção do editor), como testar (casca ligada, `/app/automacoes`, criar pelos dois caminhos, pastas, favoritos, filtros, lote; Webhooks sem a aba) e a nota "não publica: frente Automações em andamento". Merge direto. Atualizar `LOG.md` (feito / onde estamos / próximo: 5B).
- [ ] Commit do LOG: `docs: LOG da fase 5A`.

---

## 8. Critério de pronto (linha 5A da seção 8 do PRD)

- Com a casca, "Automações" do topo abre `/app/automacoes`; gerente vê a lista com pastas, favoritos, busca, Status, Agente, ordem, paginação e lote; cria pelo fluxo e pelo editor (a automação nasce na pasta escolhida) e o clique no nome abre na forma em que foi criada; agente não vê o item nem a página.
- Webhooks, com a casca, não tem a aba Automações; sem a casca, Webhooks e a aba são os de hoje.
- `test:db` da 9701 verde (Task 2); testes de unidade das Tasks 1 e 3–8 verdes; `navegacao-completude` verde; o diff do motor vazio.
- **Igual às imagens 07-001 a 07-008, 07-010, 07-031 e 07-032:** conferência lado a lado na bateria da frente, com a lista escrita das diferenças. Diferenças já previstas e justificadas: sem aviso de suspensas e sem selos Suspensa/Rascunho (B7, B9), Status com Ativa e Pausada, sem "Configurações" no ⋮ (B16), ⋮ com Abrir no fluxo / Editar no editor / Renomear, modal de criar com "Como você quer montar?", cor da marca Escale IA no lugar do roxo, editor em formulário sem busca nas caixas de seleção (Q5).

## 9. Riscos desta fase

| Risco | Mitigação |
|---|---|
| O encaixe no fluxo ou no editor muda o corpo salvo | Os encaixes só leem `nomeInicial` e chamam `aoCriar` depois da criação; o corpo continua saindo de `validarDesenho` e de `createAutomationRuleSchema`. A Task 8 roda os testes que já existem do designer e do editor |
| A gravação da pasta falha depois de a regra ser criada | `useOrganizarAoCriar` não lança e avisa com o toast; a automação aparece em "Sem pasta" e abre no fluxo, e dá para mover pelo ⋮ |
| A 5B mexe nos mesmos três arquivos do designer | Os encaixes são de poucas linhas e ficam marcados com `FORK ESCALE · Fase 5A`; a 5B parte da main com a 5A já mergeada |
| `actions` vazar `secret_enc` para o navegador | `lerListaDeAutomacoes` nunca devolve `actions`; o teste da Task 3 confere que nenhuma automação da resposta tem o campo |
| A lista inteira de uma vez fica pesada | Teto de 1.000 regras e leitura só das colunas usadas; empresas reais ficam em dezenas. Se uma passar de 1.000, a próxima fase pagina no servidor |
| Gatilho `security definer` da mesma organização abre brecha | Ele só lê `automation_rules` para comparar ids e organização e não escreve nada; a Task 2 prova a recusa com a outra organização |
| Estados sem print divergem da Clint | Marcados provisórios no PR; pedir os prints da seção 11 do PRD na conferência |

## 10. Perguntas ao usuário (não bloqueiam a execução)

1. **Q5:** o editor em formulário ganha o visual da casca (fonte, cores, campos), mas as caixas de seleção dele continuam sem busca nesta fase, porque trocá-las é reescrever o editor inteiro. Pode, ou você prefere uma fase própria só para isso depois da 5C?
2. **Q1:** você não soube dizer de onde vem o "Agente" da lista, então decidi: aparece o agente de IA que **escreve a mensagem** na automação (a ação "Mensagem pela IA"). Automação que só atribui o negócio a alguém fica com "—". Se quiser outra regra, é só dizer.
3. **Q4:** "Salvar" no modal de criar ainda não grava a automação: ele abre o fluxo ou o editor com o nome, e ela passa a existir no primeiro "Salvar" de lá (o sistema não aceita automação sem gatilho e sem ação). Pode?
4. Prints que ajudariam (sem gravar nada na Clint): a trilha "Todas › pasta" com uma pasta aberta, o menu "Mover para pasta" da barra de seleção, uma automação favoritada (a estrela amarela) e o vazio do filtro de Status.
