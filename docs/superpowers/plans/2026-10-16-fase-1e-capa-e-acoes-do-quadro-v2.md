# Fase 1E (v2) — Capa do card e ações do quadro, iguais à Clint — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar, **igual à Clint** e sobre o quadro que a Casca V4 já desenhou, os itens B10 a B15 e A3 do PRD `docs/modulos/1-negocios.md`. Só a marca é nossa: a empresa Escale IA e o app Escale OS. Os itens:
- **"Personalizar cards"** (B10): a janela de 01-019, com busca, os grupos CONTATO, EMPRESA, NEGÓCIO e ÍCONES DE CANAL NO RODAPÉ, interruptores, contadores, o limite de 10 campos e de 3 ícones, a pré-visualização com o card de verdade e "Salvar preferência". A preferência é **da pessoa** e vale em todas as origens, como na Clint;
- **o card da casca (`CardDaCasca`) obedece à preferência** (B11): tags, prévia da mensagem, dono, ícones de canal, valor, atividades, idade e os campos escolhidos, em chips;
- **⋮ da coluna** (B12): "Selecionar todos..." e "Selecione [N]", com a caixinha de número e o ícone de ajuda;
- **"+ Adicionar negócio"** (B13): alinhado à esquerda, como na Clint superior, e já na etapa da coluna;
- **"Negócio +"** (B14): o menu "Novo negócio" / "Importar negócios" e a importação com o fluxo da Clint v2 (4 passos, sem "Decisões");
- **Exportar** (B15): o ícone da linha de contagem ligado, a confirmação "Não / Sim" e o CSV com o que a tela mostra;
- **RECENTES** (A3): a terceira seção do painel, com fixados e recentes, como na Clint superior.

**Este plano substitui** `docs/superpowers/plans/2026-10-15-fase-1e-capa-e-acoes-do-quadro.md` (o v1). Aquele foi escrito antes da regra de clonar a Clint (`CLAUDE.md`, 16/10) e antes das partes V1 a V4 da casca. A seção "O plano v1, task por task" diz o que continua, o que muda e o que sai.

**Architecture:** Tudo novo é do fork. Os encaixes nos arquivos do original são pequenos e levam a marca `FORK ESCALE · Fase 1E`.
- **A capa.** Tabela `crm_capas_do_card` (migration **9005**), com uma linha por pessoa. A rota `app/api/v1/capas-do-card` lê e grava. A forma é a das preferências da Clint (`kanban_card`): sete itens fixos, os campos escolhidos e os cinco ícones de canal. Fica em `lib/escale/capa/tipos.ts`.
- **O card.** `CardDaCasca` e `PecasDoCard` (V4) recebem `prefs` e `camposDoCard`. Sem `prefs`, valem as `PREFS_PADRAO`, que são o card da V4: os testes da V4 continuam valendo. Quem lê a preferência são as colunas do fork, `ColunaDoFunilNaCasca` e `ColunaDaVisualizacao`, que só existem com a casca. O `KanbanCard` do original não muda.
- **A coluna.** `ColunaDaCasca` troca o ⋮ de um item pelo ⋮ da Clint e o "+ Adicionar negócio" centralizado pelo da Clint superior. A seleção "Selecione N" é uma escrita só (`selecaoDaEtapa`), feita no `KanbanBoard`, que é dono da seleção.
- **A página do funil.** O "Negócio +" vira menu (`MenuNegocioMais`). A janela de importação (`JanelaDeImportarNegocios`) usa a rota de importação que já existe. O mapeamento de colunas acontece no navegador: o cabeçalho do CSV é reescrito com os nomes que a rota reconhece.
- **Exportar.** O ícone da `LinhaDeContagem` deixa de ser o desligado da V4 e passa a ser o `ExportarCards`. O CSV sai do navegador, a partir do recorte que a tela mostra (os filtros da 1D e a RLS de quem olha). Antes do download, `POST /api/v1/exportacoes-do-quadro` faz a trava de papel e grava a auditoria.
- **RECENTES** ficam no navegador (`localStorage`), por organização e pessoa, como na Clint (widget `LAST_LEADS`), e são lidos por `useSyncExternalStore`. A seção entra no `PainelOrigens`, no lugar que a V3 deixou marcado.

**Tech Stack:** Postgres 15+/Supabase (RLS), Next.js 16 App Router, React 19, TypeScript estrito, Zod 4, TanStack Query 5, `@hello-pangea/dnd`, Radix (Dialog, Popover, DropdownMenu, Tooltip), Vitest + Testing Library, Tailwind 4, `lucide-react` (via `@/lib/ui/icons-da-casca`).

## Referência visual (abrir o PNG antes de cada task visual)

| O quê | PNG da Clint | Variante |
|---|---|---|
| Quadro, card, coluna, "+ Adicionar negócio", ícones da linha de contagem e RECENTES fechado | `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-010-kanban-v1.png` | **superior (alvo)** |
| Card ampliado | `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\crops\card1.png` (no repositório: `docs/escale/clint/crops/card1.png`) | superior |
| Cabeçalho da coluna | `...\docs\clint\crops\colhead.png` | superior |
| Ícones atualizar, exportar, engrenagem e ajuda | `...\docs\clint\crops\icons-right.png` | superior |
| Painel esquerdo com RECENTES | `...\docs\clint\crops\leftpanel.png` | superior |
| Janela "Personalizar cards" | `...\01-negocios\imagens\01-019-personalizacao-cards.png` | lateral. É o ÚNICO print dela: a Clint superior não tem essa janela |
| Hover do card (caixinha no lugar da foto) | `...\01-negocios\imagens\01-020-kanban-negocios.png` | lateral |
| **Prints de 16/10 desta fase** (⋮ da etapa, "Negócio +", Exportar, Importar, RECENTES, card no hover, Personalizar cards, Ordenar) | `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\` (o `README.md` da pasta traz as medidas lidas do CSS) | superior (`11`–`40`) e lateral (`33a`, `33b`, `v2-*`) |

**Regra desta fase (usuário, 16/10): o layout é o da Clint v1 (menu no topo) e as funções são as da Clint v2 (menu lateral), que é mais avançada.** Onde as duas divergem, a posição na tela segue a v1 e o comportamento segue a v2. Cada task diz qual print vale.

- Medidas, cores e textos tirados do código da Clint estão em cada task. A pasta certa é `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\`:
  - `raw\js\index-Eivtu0ck.js.txt` (card, coluna e cabeçalho) e `raw\js\index-C5_SGzQX.js.txt` (painel e RECENTES) são a variante **superior**;
  - `raw-v2\js\index-CTaP4T6N.js.txt` (janela "Personalizar cards") e `raw-v2\js\index-BDW5RmRp.js.txt` (importação CSV) são a variante lateral.

  Os textos estão em `catalog-v2\i18n-pt.txt`.
- Escala dos prints: 1,25. Divida px do print por 1,25 para ter px de CSS (contrato, "Medidas comuns").
- **Correções às fichas antigas:**
  - o "+ Adicionar negócio" é **alinhado à esquerda** na variante superior (o design system §6.12 dizia centralizado, e isso vale para a lateral);
  - o "Negócio +" mede ≈94×30 px de CSS (o clint-telas dá 119×39, em px do print);
  - o ícone de exportar desligado é `#BDBDBD`.

## Decisões desta fase (o usuário confere ao aprovar)

| # | Decisão | Por quê |
|---|---|---|
| E1 | A capa é **só da pessoa** e vale em todas as origens. Sai o "padrão da origem" do v1 | É o que a Clint faz (`user_set_ui_pref`, tipo `kanban_card`). A decisão de 15/10 (padrão por origem, PRD §5) veio antes da regra de clonar. **Confirmado pelo usuário em 16/10** |
| E2 | A forma da preferência é a da Clint: `tags, empresa, ultimaMensagem, atividades, valor, idade, dono` (todos ligados por padrão), `campos: []` e canais `telefone, mensagem, email` ligados, `lembrete, agendamento` desligados. Limite de **10 campos** (itens ligados + campos) e de **3 ícones** | Código da Clint (`Ph`, `Fda=10`, `Bda=3`). O padrão é o card que a V4 já mostra |
| E3 | **Sem dado, sem efeito, mas a linha aparece igual à Clint:** "Nome da empresa" (EMPRESA), "Lembrete" e "Agendamento" ficam visíveis, **desligados** e com a dica "Em breve". Na Clint v2, "Nome da empresa" vem **ligado** por padrão (`v2-14`); aqui fica desligado até a empresa existir (Fase 2) | Não temos empresa no card nem contagem de lembretes e agendamentos no quadro. Esconder mudaria a janela; ligar sem efeito seria promessa falsa |
| E4 | Os campos que a janela oferece: em CONTATO, "Prévia da última mensagem", "Email" e "Telefone" (os campos do contato que temos); em NEGÓCIO, os 5 fixos e os campos personalizados da origem (`settings.fields`). Na Visualização, a união das origens | A Clint lista os campos da conta. Os campos personalizados do contato chegam com a Fase 2 |
| E5 | **Onde abre:** o ícone de ajustes (`SlidersHorizontal` 17) na linha de contagem, logo depois do atualizar, com a dica "Personalizar cards" num balão lavanda embaixo (`33a`, `v2-01`). A janela é a da v2 (`33b`, `v2-12` a `v2-15`). Um ponto da marca aparece no ícone quando a preferência difere do padrão | A Clint v1 não tem a janela (a engrenagem dela abre a configuração da origem, print `15`); a função é da v2, que põe o ícone na linha de contagem |
| E6 | **Os campos escolhidos** aparecem no card como chips abaixo do rodapé (fundo `casca-marca-suave`, texto da marca, 10px/500, máx. 160px). O hover mostra rótulo e valor, com "Copiar". Campo vazio não aparece | Código da Clint (`customFields` no card). Não há print do card com chips: PRINT 36 |
| E7 | **⋮ da coluna** igual à Clint (v1 e v2 iguais: `18a`–`18f`, `v2-04`): "Selecionar todos..." e a linha "Selecione [0⇅] (?)", com o campo **numérico com setinhas** que começa em 0. Mudar o número seleciona os N primeiros na hora. Aparece só para agent ou acima e **não aparece na Visualização** | Sai o "Desmarcar todos" da V4, que a Clint não tem. Para desmarcar, o "×" da barra de lote. O campo numérico é o da Clint (não é seleção nem data, que a regra proíbe nativos) |
| E8 | **"+ Adicionar negócio"** abre o "Novo negócio" já na etapa da coluna (`etapaInicial`), só para agent ou acima e só nas etapas abertas do funil | Código da Clint (`setShowModal({modal:"deal", stage})`). A rota de criar pede agent |
| E9 | **"Negócio +"** abre o menu "Novo negócio" (maleta) / "Importar negócios" (`+`), e o "+" do botão vira "×" com o menu aberto (`19a`, `19b`, `v2-05`). Menu sem borda, 152px, raio 4, itens de 36px, hover `#EFF6FF` com texto `#4F46E5`. Para viewer, o botão fica desligado, com a dica "Sem permissão" | Botão que a rota recusa seria promessa falsa |
| E10 | **Importar negócios** com o fluxo da **v2** (`v2-06` a `v2-11`), em **4 passos**: Arquivo, Mapeamento (com sugestão automática), Configurações e Prévia e confirmação. Muda: (a) **sai o passo "Decisões"** (o motor de duplicidade da v2 pede rota nova com fila de revisão: fase própria); (b) a origem de destino é a do quadro, mostrada no seletor desligado; (c) o status só "Aberto" (Ganho e Perdido desligados, "Em breve"); (d) o mapeamento oferece só os campos que a rota lê (nome do negócio, nome do contato, telefone, e-mail, valor, observação, fonte, tags); (e) limite 5 MB / 500 linhas; (f) o resumo aparece na própria janela; (g) o "Continuar" pede o nome do negócio ou do contato | A rota que temos (`POST /api/v1/leads/import`) recebe `pipeline_id`, `stage_id` e um CSV com cabeçalho conhecido; não grava status nem campos personalizados e não decide duplicidade. **Aprovado pelo usuário em 16/10** |
| E11 | **Exportar:** o ícone de download da linha de contagem (lugar da v1, `16a`), **só no funil e só para gerente ou acima**. Dica "Exportar N Negócio(s)" / "Nenhum negócio para exportar.". O clique abre a janela da v2 "Confirme sua ação" (`v2-03`): "Tem certeza que deseja exportar os negócios dessa origem?", "Cancelar" e "Confirmar" (marca). Durante a exportação, um giro no lugar do ícone | Layout da v1, função da v2. **Aprovado pelo usuário em 16/10.** O CSV é o recorte da tela, com guarda contra fórmula e auditoria |
| E12 | **RECENTES** iguais à Clint superior (`11a`, `11b`, `34a`, `34b`): fixados (até 5) e recentes, 5 + "ver mais" em cada; linha de 39px com foto de 20px **quadrada de raio 5**, nome 11,7px, alfinete 12 e seta 14 (`#3E3A6F`); o detalhe é uma caixa branca de raio 6 com a origem (10,4px), "**Sem empresa**" em negrito com o ícone de prédio e o telefone à direita; vazio "Você não possui negócios recém trabalhados.". Abre recolhida | A v2 não tem RECENTES de negócios (só "Origens recentes" no menu lateral); o layout é o da v1. O limite de fixados da Clint não aparece no código lido: fixamos 5, com o texto da Clint "Você atingiu o limite. Desafixe algo pra fixar mais.". PRINT 34 (fixado, ver mais, vazio, limite) continua pendente |
| E13 | **Os atalhos do card** ficam como a V4 os ligou: telefone com `tel:`, conversa para o Inbox e e-mail com `mailto:`. As dicas são as da Clint: **"Ligar"** (`34b`), "Enviar Whatsapp" (`v2-16`) e "Email". Vale no card e nos Recentes. **No produto todo, "Ligar" passa a ser só ligação e "Ativar" é ligar/desligar** (Task 6, Step 0b) | **Decidido pelo usuário em 16/10.** Hoje a chave "Ligar" do dicionário é o interruptor ("Activar" em espanhol, "Turn on" em inglês), usada em dois lugares do original. Eles passam para "Ativar", e "Ligar" vira "Llamar"/"Call" |
| E14 | O dossiê abre pelo link `?lead=` quando a pessoa clica num Recente com o quadro já aberto. Fechar o dossiê tira o `?lead=` da URL. Isso só vale com a casca | Na Clint, o Recente abre `/deal/:id`. O nosso dossiê mora no quadro. Sem a casca, fica o contrato do original ("fechar não reabre pela URL") |
| E15 | **A engrenagem** da linha de contagem abre a configuração da origem nas duas Clints (`15`). Ela fica **desligada com "Em breve"** até a Fase 1F. O que a V4 pôs no menu dela muda de lugar (Task 7B): "Ordenar" vira o botão "↑↓ Ordenar" da v2 (`v2-19`) na linha de contagem; "Filtros salvos" e "Limpar filtros" vão para o rodapé do painel "Mais filtros" | **Aprovado pelo usuário em 16/10.** A Clint v2 não mostra filtros salvos no quadro (`v2-17`, `v2-18`); onde a v1 os mostra é o PRINT 41. A ordenação com vários critérios da v2 ("+ Adicionar critério", `v2-19`) é melhoria da 1D, fora desta fase |

**Limitações conhecidas** (vão no PR):
- o dossiê só abre o negócio que o quadro mostra: um Recente ganho ou perdido não abre com o filtro "Em aberto". A ficha em tela própria é da 1G;
- o valor dos campos sai cru ("5000", "2026-10-15"), sem formatar pelo tipo;
- no CSV, o telefone sai com apóstrofo (`'+55…`), a guarda contra fórmula, e o Excel mostra o apóstrofo;
- a auditoria da exportação é melhor esforço, como toda auditoria do produto: a trava é o papel.

## O plano v1, task por task

| Task do v1 | O que era | Situação no v2 |
|---|---|---|
| 1. Migration 9005 | Tabela com a capa da pessoa **e** o padrão da origem | **Muda:** uma linha por pessoa, sem `pipeline_id` (E1). A escrita exige papel viewer ou acima (cerca de RBAC da 0150). É a **Task 1** do v2 |
| 2. Prova no Postgres | Pessoa, padrão da origem, FKs, unicidade | **Muda:** sem o padrão da origem. **Task 2** |
| 3. A forma da capa | Itens nossos (`ultima_mensagem`, `links`…) e camadas pessoa/origem/sistema | **Muda:** a forma da Clint (E2–E4). **Task 3** |
| 4. A rota da capa | GET/PUT/DELETE, minha e da origem | **Muda:** só GET e PUT da própria (a Clint não tem "restaurar padrão" na janela). Continuam: o 500 genérico com o log e a auditoria. **Task 4** |
| 5. O card mostra a capa | Prop `capa` no `KanbanCard` e no `ContatoNoCard` do original, `ExtrasDaCapa`, `AtalhosDoCard` | **Sai.** A casca não usa mais o `KanbanCard` (V4, D8). Os atalhos já existem no `CardDaCasca`. Vira: **Task 6**, o `CardDaCasca` obedece à preferência |
| 6. Personalizar cards | `JanelaDaCapa` com o visual do Deskcomm, escopo minha/origem, botão na barra | **Muda:** o visual de 01-019 e da v2 (`33b`), sem escopo, aberta pelo ícone de ajustes da linha de contagem (E5). A engrenagem fica para a 1F e o menu dela muda de lugar (**Task 7B**, E15). Ganha o interruptor da casca (**Task 5**). **Task 7** |
| 7. Funil e Visualização usam a capa | `QuadroDoFunil` em volta do `KanbanBoard` | **Sai:** a V4 já monta a coluna do fork com `aparencia="casca"`. Quem lê a preferência são as colunas do fork (**Task 8**) |
| 8. O ⋮ da etapa | `MenuDaEtapa` em Popover, no `StageColumn` | **Muda:** fica no `ColunaDaCasca`, no visual da Clint, e sai da Visualização (E7). Continua `selecaoDaEtapa`. **Task 9** |
| 9. + Adicionar negócio | `AdicionarNaEtapa` no `StageColumn` e `etapaInicial` | **Muda:** o botão já existe na V4. Muda o alinhamento e entra a etapa. Continua o `etapaInicial` do `NewLeadDialog`. **Task 10** |
| 10. Negócio + e importar | Menu do Deskcomm e janela de um passo | **Muda:** o menu da Clint (E9) e o fluxo de importação da v2 em 4 passos (E10). **Tasks 11 e 12** |
| 11. Exportar | ⋮ do quadro com Exportar | **Muda:** o ícone da linha de contagem com a confirmação em balão (E11). Continuam o CSV com guarda contra fórmula, o nome do arquivo com a data local e a rota da auditoria. **Task 13** |
| 12. Recentes | 5 negócios, sem fixar | **Muda:** fixados e recentes, ver mais, detalhe (E12) e o `?lead=` (E14). **Task 14** |
| 13. Espanhol | Lista de 83 pares | **Continua,** com a lista nova. **Task 15** |
| 14. Gates, PRD e PR | — | **Continua,** mais a conferência visual do contrato. **Task 16** |

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- **Base:** `escale-crm/main` **com a 1D e as Cascas V1 a V4 mergeadas** (a V4 é o PR #16, branch `feat/casca-clint-v4-quadro`). A Task 1 prova. Se faltar alguma, PARE e pergunte.
- **Branch:** `feat/fase-1e-capa-e-acoes-do-quadro`.
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:** push em `origin` (repositório do Rafael), merge, tag, release, VPS, gravar no banco de produção (nem com o MCP de escrita).

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- Polyfills do Radix nos testes de tela: o mesmo bloco dos testes da V4 (`scrollIntoView`, `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, `ResizeObserver`). Os testes abaixo já o trazem.

### Peças que esta fase consome (já na `main`)

| Peça | De onde | Uso aqui |
|---|---|---|
| `BotaoDaCasca` (`variante: "marca" \| "novo" \| "texto" \| "icone"`, `tamanho?`), `PainelSuspenso`, `CaixaDaCasca`, `SeletorDaCasca`, `GatilhoDeFiltro` | V1, `components/escale/ui/` | botões, balões, seletores |
| Tokens `*-casca-*`, `rounded-casca-gatilho/card/raia`, `shadow-casca-painel`, `--escale-painel-hover` | V1/V3 | todo o visual |
| `@/lib/ui/icons-da-casca` | V1–V4 | ícones. A Task 6 acrescenta `ArrowUpDown, Briefcase, Calendar, Copy, DollarSign, Pin, PinOff, Tag` (os outros já estão lá, inclusive `HelpCircle`) |
| `CardDaCasca`, `PecasDoCard` (`ChipsDoCard`, `FotoDoContato`, `CaixaDaMensagem`, `RodapeDoCard`), `ColunaDaCasca`, `ColunaDoFunilNaCasca`, `CabecalhoDaCasca` (`BotaoNegocioMais`) | V4, `components/escale/quadro/` | o card, a coluna e o cabeçalho |
| `BarraDoQuadro`, `LinhaDeContagem`, `MenuDaEngrenagem`, `CLASSE_DA_LINHA_DO_MENU` (`./controles`) | V4, `components/escale/filtros/` | a engrenagem e o exportar |
| `CabecalhoDaSecao`, `BOTAO_DE_ICONE`, `LINHA`, `LINHA_COM_HOVER` (`estilos-do-painel.ts`), `PainelOrigens` | V3, `components/escale/origens/` | RECENTES |
| `tituloDoCard`, `fotoDoContato`, `corDoAvatar`, `inicialDoNome`, `valorCurto` | V4, `lib/escale/quadro/aparencia.ts` | card, Recentes e CSV |
| `dadosDeFiltro(lead)` (`contato_nome`, `contato_tem_foto`, `atividades_concluidas`, `conversa`) | 1D/V4, `lib/escale/filtros/dados-do-quadro.ts` | card, Recentes e CSV |
| `camposDoFunil(settings)` | original, `lib/leads/campos-do-funil.ts` | campos do negócio |
| `parseCsv`, `CSV_MAX_BYTES` (5 MB), `CSV_MAX_DATA_ROWS` (500) | original, `lib/contacts/csv.ts` | importação |

### Onde o fork entra nos arquivos do original

| Arquivo | O que muda |
|---|---|
| `components/kanban/KanbanBoard.tsx` | no ramo `aparencia === "casca"`: os campos do card, o nome da origem e a seleção "Selecione N" para a coluna; a prop `aoFecharDossie` e o `?lead=` que muda (só com ela) |
| `components/kanban/NewLeadDialog.tsx` | a prop `etapaInicial` |
| `lib/leads/planilha.ts` | `export` na `campoDaColuna` (o mapeamento da importação sugere pelo mesmo critério da leitura) |
| `app/app/pipelines/[id]/_client.tsx` | no ramo da casca: o menu "Negócio +", a janela de importar, a etapa do "Novo negócio", o exportar na barra e o `aoFecharDossie` |
| `app/app/webhooks/_components/RulesTab.tsx`, `components/agenda/ClientePelaAgenda.tsx`, `components/connections/TemplatesParceiroClient.tsx`, `lib/i18n/traducoes/en.json` | "Ligar" vira ligação e o interruptor passa a "Ativar" (Task 6, Step 0b; E13) |
| `lib/i18n/dicionario.ts` | `Ligar` → "Llamar" (Task 6) e o bloco novo logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───` (fica depois do bloco da V4) |
| `lib/audit/actions.ts` | `card_cover.updated` e `pipeline.cards_exported`, logo depois de `"pipeline_filter.deleted",` |
| `tests/invariants/rls-completude-varredura.test.ts` | 1 entrada, logo depois da de `crm_filtros_salvos` |
| `supabase/baseline.sql` | bloco 9005 logo antes de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` |

Cada trecho novo nos arquivos do original leva o comentário `FORK ESCALE · Fase 1E`. `KanbanCard.tsx`, `StageColumn.tsx`, `ContatoNoCard.tsx` e a rota do quadro **não mudam**.

### Cercas que precisam ficar verdes

- `kanban-atalho-conversa` e `funil-mostra-dados-do-cliente`: leem o `KanbanCard.tsx`, que não muda.
- `rbac-config-ia-canais` (test:db): toda policy ALL nova olha papel (`fn_role_at_least`).
- `tailwind-tokens`: nada de `rounded`/`shadow`/`outline-none` puros; sem alfa em cor de texto da casca.
- `controle-decorativo`: todo botão desligado tem `title`.
- `selecao-longa-tem-busca`: nenhum `<select>` nem `SelectContent` no fork (use `SeletorDaCasca`).
- `hidratacao-useState-nao-le-o-navegador`: os Recentes leem o navegador só por `useSyncExternalStore`.
- `i18n-espanhol-cobre-a-tela`: todo texto por `t()` com literal (Task 15). A gate não lê `app/api`: a Task 15 confere as rotas à mão.
- `suporte-cobertura-de-efeitos`: PUT e POST novos chamam `requireSupportWrite()`.
- `escale-casca-v2-original-intacto`: as peças compartilhadas do shell não importam `@/…/escale/`.
- Os ganchos da V4: `data-quadro-do-funil`, `data-etapa-do-quadro`, `data-cabecalho-da-etapa`, `data-coluna-da-visualizacao`, `data-card-da-casca`, `data-testid="contagem-do-quadro"`, `data-testid="nome-etapa-quadro"`.

### Testes da V4 que esta fase muda de propósito

| Teste | O que pinava | Por quê muda |
|---|---|---|
| `escale-coluna-da-casca.test.tsx` | `menuitem "Selecionar todos"` / `"Desmarcar todos"`; botão "Adicionar negócio" | E7 e E8: o ⋮ da Clint e o "+ Adicionar negócio" com a etapa |
| `escale-barra-do-quadro.test.tsx` | `Exportar` desligado; `Personalizar cards` desligado; o menu da engrenagem (Ordenar, Filtros salvos, Limpar) | E11, E5 e E15 (Task 7B) |
| `escale-quadro-do-funil-com-filtros.test.tsx` | clicar `button /^Negócio/` abre o "Novo negócio" direto | E9: agora abre o menu |
| `escale-quadro-combinado.test.tsx` | `Ações da etapa Entrada` → "Selecionar todos" | E7: sem ⋮ na Visualização |
| `escale-card-da-casca.test.tsx` | `link "Abrir esta conversa no Inbox"` | E13: o nome passa a "Enviar Whatsapp" |

### Textos, commits e verificação

- Todo texto de tela por `t()` com literal, com espanhol (Task 15). Dado do operador (nome de campo, de tag, de pessoa) não passa por `t()`.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. O PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Em toda task de código**, depois do `vitest run` e antes do commit:
  ```bash
  export NODE_OPTIONS=--max-old-space-size=6144
  corepack pnpm typecheck
  corepack pnpm exec eslint <arquivos criados ou alterados nesta task>
  corepack pnpm exec prettier --write <arquivos NOVOS desta task>
  ```
  Expected: sem erros novos. O typecheck inclui os testes com `noUncheckedIndexedAccess`: destruturação de `split`, `match` ou `mock.calls` usada como valor precisa de default, `!` ou `?.`. Não rode o prettier em arquivos do original.
- **Falhas que não são regressão:** as do Windows que também falham em `escale-crm/main` (pdfjs, `spawnSync bash ENOENT`, `chmod 600`, caminho com espaço, `EPERM`). Regressão = passa na `main` e falha na branch.
- **Docker** para o `test:db`: se `docker info` falhar, PARE e peça ao usuário para abrir o Docker Desktop.
- **Conferência visual** (contrato, regra única): CAMINHO A (local com banco de teste) ou CAMINHO B (depois do deploy, pelo Claude in Chrome, só lendo a tela, em 1536×~880). As diferenças vão num PR `fix/fase-1e-conferencia`. Diferença sem justificativa aprovada = tarefa não pronta.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `supabase/migrations/20261020120000_9005_capas_do_card.sql`, `supabase/baseline.sql` | novo / bloco | tabela da preferência da pessoa |
| `tests/unit/escale-capas-do-card-migration.test.ts`, `tests/invariants/escale-capas-do-card-rls.test.ts`, `tests/invariants/rls-completude-varredura.test.ts` | novos / 1 entrada | forma e prova |
| `lib/escale/capa/tipos.ts` | novo | a forma da Clint, padrão, limites, campos, valor do campo |
| `lib/escale/capa/banco.ts`, `app/api/v1/capas-do-card/route.ts`, `lib/audit/actions.ts` | novos / 2 ações | ler e gravar a preferência; 500 genérico |
| `hooks/escale/usePrefsDoCard.ts` | novo | ler e salvar no navegador |
| `components/escale/ui/InterruptorDaCasca.tsx` | novo | o interruptor da janela (28×16) |
| `components/escale/quadro/PecasDoCard.tsx`, `CardDaCasca.tsx`, `ChipsDeCampos.tsx` | alterados / novo | o card obedece à preferência |
| `lib/escale/capa/exemplo.ts`, `components/escale/capa/JanelaPersonalizarCards.tsx`, `components/escale/filtros/MenuDaEngrenagem.tsx` | novos / alterado | a janela e o lugar de abrir |
| `components/kanban/KanbanBoard.tsx`, `components/escale/quadro/ColunaDoFunilNaCasca.tsx`, `components/escale/visualizacoes/{ColunaDaVisualizacao,QuadroCombinado}.tsx` | alterados | preferência, campos, seleção, Recentes |
| `lib/escale/quadro/selecao.ts`, `components/escale/quadro/MenuDaColuna.tsx`, `components/escale/quadro/ColunaDaCasca.tsx` | novos / alterado | ⋮ da coluna e "+ Adicionar negócio" |
| `components/kanban/NewLeadDialog.tsx` | alterado | `etapaInicial` |
| `components/escale/quadro/MenuNegocioMais.tsx`, `components/escale/quadro/CabecalhoDaCasca.tsx` | novo / alterado | "Negócio +" |
| `lib/escale/importar/mapear.ts`, `components/escale/quadro/JanelaDeImportarNegocios.tsx`, `components/escale/quadro/PassosDaImportacao.tsx`, `lib/leads/planilha.ts` | novos / 1 palavra | importação com o fluxo da v2 |
| `components/escale/capa/PersonalizarCards.tsx`, `components/escale/filtros/BotaoOrdenar.tsx`, `components/escale/filtros/GatilhosDoQuadro.tsx`, `components/escale/quadro/estilos-do-menu.ts`; `components/escale/filtros/MenuDaEngrenagem.tsx` sai | novos / alterado / apagado | ícone de Personalizar, botão Ordenar, filtros salvos no "Mais filtros", o menu da Clint |
| `lib/escale/exportar/csv-do-quadro.ts`, `lib/escale/exportar/baixar.ts`, `app/api/v1/exportacoes-do-quadro/route.ts`, `components/escale/filtros/ExportarCards.tsx`, `LinhaDeContagem.tsx`, `BarraDoQuadro.tsx` | novos / alterados | exportar |
| `lib/escale/recentes/regras.ts`, `hooks/escale/useNegociosRecentes.ts`, `components/escale/origens/SecaoRecentes.tsx`, `lib/escale/origens/preferencias.ts`, `components/escale/origens/PainelOrigens.tsx`, `ComOrigens.tsx` | novos / alterados | RECENTES |
| `app/app/pipelines/[id]/_client.tsx` | alterado | a página do funil na casca |
| `lib/i18n/dicionario.ts`, `lib/ui/icons-da-casca.ts` | alterados | espanhol (Task 15) e ícones (Task 6) |

---

### Task 1: Branch, migration 9005 e o bloco do baseline

**Files:**
- Create: `supabase/migrations/20261020120000_9005_capas_do_card.sql`, `tests/unit/escale-capas-do-card-migration.test.ts`
- Modify: `supabase/baseline.sql` (bloco antes da linha da 0323, depois do bloco 9004)
- Copy: este plano para `docs/superpowers/plans/2026-10-16-fase-1e-capa-e-acoes-do-quadro-v2.md` no repositório

**Interfaces:**
- Produces: tabela `public.crm_capas_do_card (id, organization_id, user_id, capa jsonb, created_at, updated_at)`, com:
  - CHECKs `crm_capas_do_card_capa_objeto` e `crm_capas_do_card_capa_tamanho`;
  - a FK `crm_capas_do_card_pessoa_fk` (cascade);
  - o índice único `uq_crm_capas_do_card_pessoa (organization_id, user_id)`;
  - as policies `crm_capas_do_card_select` e `crm_capas_do_card_pessoa_write`.

- [ ] **Step 1: Conferir a base, criar a branch e copiar o plano**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:supabase/migrations/20261019120000_9004_filtros_salvos.sql && echo "1D ok"
git cat-file -e escale-crm/main:components/escale/ui/BotaoDaCasca.tsx && echo "V1 ok"
git cat-file -e escale-crm/main:components/escale/quadro/CardDaCasca.tsx && echo "V4 ok"
```
Expected: `1D ok`, `V1 ok`, `V4 ok`. Se faltar qualquer um, PARE: esta fase constrói sobre o card e a coluna da V4.

```bash
git switch -c feat/fase-1e-capa-e-acoes-do-quadro escale-crm/main
ls supabase/migrations | sort | tail -2
cp "../docs/superpowers/plans/2026-10-16-fase-1e-capa-e-acoes-do-quadro-v2.md" docs/superpowers/plans/
```
Expected: a última migration é a `20261019120000_9004_filtros_salvos.sql`. Se houver uma do original com timestamp maior, use um timestamp maior que o dela no nome da 9005, em TODAS as tasks.

- [ ] **Step 2: O teste estático (vai falhar)**

Create `tests/unit/escale-capas-do-card-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * CAPA DO CARD (fork Escale, migration 9005): a preferência "Personalizar cards"
 * de cada pessoa, como na Clint. A migration e o bloco do baseline são o MESMO
 * SQL, no ponto fixo do fork (depois do 9004, antes da 0323).
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261020120000_9005_capas_do_card.sql";
const MIGRATION_9004 = "supabase/migrations/20261019120000_9004_filtros_salvos.sql";
const CABECALHO = "-- ---- FORK ESCALE · capa do card do quadro (migration 9005) ----";
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");
const compacto = (s: string) => s.replace(/\s+/g, " ");

describe("capa do card: migration 9005 e bloco do baseline", () => {
  it("a migration existe, se descreve na primeira linha e aparece igual no baseline, no ponto fixo", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    const sql = ler(MIGRATION);
    expect(sql.startsWith("-- manifest: ")).toBe(true);
    const baseline = ler("supabase/baseline.sql");
    const de9004 = baseline.indexOf(ler(MIGRATION_9004));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(sql);
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9004).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9004);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("uma capa por pessoa em cada organização, e a FK apaga junto com a pessoa", () => {
    const sql = compacto(ler(MIGRATION));
    expect(sql).toContain("user_id uuid not null");
    expect(sql).not.toContain("pipeline_id");
    expect(sql).toContain(
      "create unique index if not exists uq_crm_capas_do_card_pessoa on public.crm_capas_do_card (organization_id, user_id);",
    );
    expect(sql).toContain("references public.user_organizations (user_id, organization_id) on delete cascade");
  });

  it("RLS: a pessoa lê e escreve só a sua, e escrever exige papel (cerca de RBAC da 0150)", () => {
    const sql = compacto(ler(MIGRATION));
    expect(sql).toContain("alter table public.crm_capas_do_card enable row level security;");
    const escrita = sql.slice(sql.indexOf("create policy crm_capas_do_card_pessoa_write"), sql.indexOf("revoke all on public.crm_capas_do_card from anon;"));
    const [using = "", check = ""] = escrita.split("with check (");
    for (const parte of [using, check]) {
      expect(parte).toContain("user_id = auth.uid()");
      expect(parte).toContain("public.fn_role_at_least(organization_id, 'viewer')");
    }
    expect(sql).toContain("revoke all on public.crm_capas_do_card from anon;");
    expect(sql).toContain("do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-capas-do-card-migration.test.ts
```
Expected: FAIL, porque a migration não existe.

- [ ] **Step 4: A migration**

Create `supabase/migrations/20261020120000_9005_capas_do_card.sql`. A primeira linha é UMA linha só:

```sql
-- manifest: **Capa do card do quadro de negócios (fork Escale, Fase 1E).** Tabela nova `crm_capas_do_card`: a preferência "Personalizar cards" de cada PESSOA (`user_id`), que vale em todas as origens dela, como na Clint (preferência `kanban_card`); `capa` é jsonb validado pela rota. Uma linha por pessoa em cada organização. RLS: a pessoa vê e escreve só a própria, e escrever exige papel viewer ou acima (`fn_role_at_least`, cerca de RBAC da 0150). FK composta com `on delete cascade` para `user_organizations`.
-- 9005: capa do card do quadro (fork Escale).

create table if not exists public.crm_capas_do_card (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  capa jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_capas_do_card_capa_objeto check (jsonb_typeof(capa) = 'object'),
  constraint crm_capas_do_card_capa_tamanho check (octet_length(capa::text) <= 4096),
  constraint crm_capas_do_card_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

-- Uma preferência por pessoa em cada organização: a rota lê antes de gravar, e
-- o índice é a guarda contra duas abas salvando ao mesmo tempo.
create unique index if not exists uq_crm_capas_do_card_pessoa
  on public.crm_capas_do_card (organization_id, user_id);
-- A FK composta apaga em cascata: o índice que começa por user_id serve a ela.
create index if not exists idx_crm_capas_do_card_pessoa
  on public.crm_capas_do_card (user_id, organization_id);

alter table public.crm_capas_do_card enable row level security;

drop policy if exists crm_capas_do_card_select on public.crm_capas_do_card;
drop policy if exists crm_capas_do_card_pessoa_write on public.crm_capas_do_card;

-- Quem vê: só a própria pessoa (e o suporte da plataforma).
create policy crm_capas_do_card_select on public.crm_capas_do_card
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid())
  );

-- Quem escreve: a própria pessoa, com papel viewer ou acima. O papel vem
-- explícito por causa da cerca de RBAC da 0150 (policy ALL não pode olhar só
-- tenancy). O suporte somente leitura para nas travas support_write_*.
create policy crm_capas_do_card_pessoa_write on public.crm_capas_do_card
  using (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'viewer')
    and user_id = auth.uid()
  )
  with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'viewer')
    and user_id = auth.uid()
  );

revoke all on public.crm_capas_do_card from anon;
grant select, insert, update, delete on public.crm_capas_do_card to authenticated;
grant all on public.crm_capas_do_card to service_role;

drop trigger if exists trg_crm_capas_do_card_updated_at on public.crm_capas_do_card;
create trigger trg_crm_capas_do_card_updated_at
  before update on public.crm_capas_do_card
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_capas_do_card is
  'Capa do card do quadro de negócios (fork Escale, migration 9005): a preferência "Personalizar cards" de cada pessoa, que vale em todas as origens dela (como a preferência kanban_card da Clint). Só a pessoa lê e escreve a sua.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

- [ ] **Step 5: O mesmo SQL no baseline, no ponto fixo**

```bash
node -e '
const fs = require("fs");
const MIG = "supabase/migrations/20261020120000_9005_capas_do_card.sql";
const BASE = "supabase/baseline.sql";
const ANCORA = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const CAB = "-- ---- FORK ESCALE · capa do card do quadro (migration 9005) ----";
const base = fs.readFileSync(BASE, "utf8");
if (base.includes(CAB)) throw new Error("o bloco 9005 já está no baseline");
if (!base.includes("-- ---- FORK ESCALE · filtros salvos do quadro (migration 9004) ----")) throw new Error("bloco 9004 ausente");
const i = base.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 0323 não encontrada");
const eol = base.includes("\r\n") ? "\r\n" : "\n";
let mig = fs.readFileSync(MIG, "utf8").replace(/\r\n/g, "\n");
if (!mig.endsWith("\n")) mig += "\n";
fs.writeFileSync(BASE, base.slice(0, i) + (CAB + "\n" + mig + "\n").replace(/\n/g, eol) + base.slice(i));
console.log("bloco 9005 inserido");
'
```

- [ ] **Step 6: Rodar o teste e os gates do baseline**

```bash
corepack pnpm vitest run tests/unit/escale-capas-do-card-migration.test.ts tests/unit/escale-filtros-salvos-migration.test.ts tests/unit/escale-visualizacoes-migration.test.ts tests/unit/escale-grupos-de-funis-migration.test.ts tests/unit/escale-toda-origem-tem-grupo-migration.test.ts tests/unit/baseline-reaplicavel.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/check-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/apendice-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/sonda-do-baseline-ancora-na-ultima-definicao.test.ts tests/unit/baseline-no-piso-do-postgres.test.ts tests/unit/varredura-anon-e-o-ultimo-bloco.test.ts tests/unit/baseline-nao-constroi-o-que-derruba.test.ts tests/unit/baseline-nao-reconcede-o-que-revoga.test.ts tests/unit/baseline-constraint-reconstruida.test.ts
```
Expected: PASS nos 15. Confira na saída que os 15 aparecem: com vários caminhos, um nome que não casa com nenhum arquivo é pulado SEM aviso. Se um gate reclamar da 9005, corrija a MIGRATION, refaça o bloco (`git checkout -- supabase/baseline.sql` e o Step 5) e rode de novo.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261020120000_9005_capas_do_card.sql supabase/baseline.sql tests/unit/escale-capas-do-card-migration.test.ts docs/superpowers/plans/2026-10-16-fase-1e-capa-e-acoes-do-quadro-v2.md
git commit -m "feat(escale): migration 9005 — a preferência Personalizar cards de cada pessoa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Prova no Postgres

**Files:**
- Create: `tests/invariants/escale-capas-do-card-rls.test.ts`
- Modify: `tests/invariants/rls-completude-varredura.test.ts` (1 entrada logo depois da de `crm_filtros_salvos`)

- [ ] **Step 1: A prova**

Create `tests/invariants/escale-capas-do-card-rls.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_AGENT_B, GOV_MANAGER, GOV_ORG, GOV_VIEWER, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * CAPA DO CARD (fork Escale, migration 9005) — prova contra Postgres real: só a
 * pessoa lê e escreve a sua preferência, qualquer papel grava a própria, ninguém
 * escreve a de outra pessoa (nem o gerente), uma por pessoa, e os CHECKs e a FK.
 * Roda via `pnpm test:db`.
 */
const ORG_B = "e5ca1e00-9005-4000-8000-000000000001";
const USER_B = "e5ca1e00-9005-4000-8000-000000000002";
const C_DA_ANA = "e5ca1e00-9005-4000-8000-000000000021";
const CAPA = `'{"itens":{}}'::jsonb`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email) values ('${USER_B}', 'escale-capas-b@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-capas-b', 'Escale Capas Org B', 'Escale CB') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now()) on conflict do nothing;
    delete from public.crm_capas_do_card where organization_id in ('${GOV_ORG}', '${ORG_B}');
    insert into public.crm_capas_do_card (id, organization_id, user_id, capa)
      values ('${C_DA_ANA}', '${GOV_ORG}', '${GOV_AGENT_A}', ${CAPA});
  `);
});

const visto = (id: string) => `select count(*) from public.crm_capas_do_card where id = '${id}';`;

describe("crm_capas_do_card", () => {
  it("só a dona lê (controle positivo); outra pessoa, o gerente e o vizinho não", () => {
    expect(countAs(GOV_AGENT_A, visto(C_DA_ANA))).toBe(1);
    expect(countAs(GOV_AGENT_B, visto(C_DA_ANA))).toBe(0);
    expect(countAs(GOV_MANAGER, visto(C_DA_ANA))).toBe(0);
    expect(countAs(USER_B, visto(C_DA_ANA))).toBe(0);
  });

  it("qualquer papel grava e muda a própria (viewer, controle positivo)", () => {
    sql(`delete from public.crm_capas_do_card where organization_id = '${GOV_ORG}' and user_id = '${GOV_VIEWER}';`);
    expect(writeCountAs(GOV_VIEWER, `insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${GOV_VIEWER}', ${CAPA})`)).toBe(1);
    expect(writeCountAs(GOV_VIEWER, `update public.crm_capas_do_card set capa = '{}'::jsonb where organization_id = '${GOV_ORG}' and user_id = '${GOV_VIEWER}'`)).toBe(1);
    sql(`delete from public.crm_capas_do_card where organization_id = '${GOV_ORG}' and user_id = '${GOV_VIEWER}';`);
  });

  it("ninguém grava, muda ou apaga a de outra pessoa — nem o gerente, nem de outra organização", () => {
    expect(writeCountAs(GOV_AGENT_B, `insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${GOV_AGENT_A}', ${CAPA})`)).toBe(0);
    expect(writeCountAs(GOV_MANAGER, `update public.crm_capas_do_card set capa = '{}'::jsonb where id = '${C_DA_ANA}'`)).toBe(0);
    expect(writeCountAs(GOV_MANAGER, `delete from public.crm_capas_do_card where id = '${C_DA_ANA}'`)).toBe(0);
    expect(writeCountAs(USER_B, `insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${USER_B}', ${CAPA})`)).toBe(0);
    expect(sql(`select count(*) from public.crm_capas_do_card where id = '${C_DA_ANA}';`)).toBe("1");
  });

  it("uma por pessoa, a capa é objeto de até 4 KB, e a FK recusa quem não é membro e apaga em cascata", () => {
    expect(() => sql(`insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${GOV_AGENT_A}', ${CAPA});`)).toThrow(/uq_crm_capas_do_card_pessoa/);
    expect(() => sql(`insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${GOV_VIEWER}', '[]'::jsonb);`)).toThrow(/crm_capas_do_card_capa_objeto/);
    expect(() => sql(`insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${GOV_VIEWER}', jsonb_build_object('x', repeat('a', 5000)));`)).toThrow(/crm_capas_do_card_capa_tamanho/);
    expect(() => sql(`insert into public.crm_capas_do_card (organization_id, user_id, capa) values ('${GOV_ORG}', '${USER_B}', ${CAPA});`)).toThrow(/crm_capas_do_card_pessoa_fk/);
    expect(sql(`select confdeltype from pg_constraint where conname = 'crm_capas_do_card_pessoa_fk';`)).toBe("c");
  });
});
```

- [ ] **Step 2: Registrar na varredura**

Em `tests/invariants/rls-completude-varredura.test.ts`, logo DEPOIS do `},` que fecha a entrada de `crm_filtros_salvos` em `PROVA_PROPRIA`, acrescente:

```ts
  {
    tabela: "crm_capas_do_card",
    razao:
      "tests/invariants/escale-capas-do-card-rls.test.ts — fork Escale (migration 9005): a preferência do card só para a própria pessoa " +
      "(zero para o gerente e para o vizinho), qualquer papel grava a sua, ninguém escreve a de outra pessoa, uma por pessoa, CHECKs e FK.",
  },
```

- [ ] **Step 3: Rodar a prova (Docker)**

```bash
docker info --format '{{.ServerVersion}}'
corepack pnpm test:db tests/invariants/escale-capas-do-card-rls.test.ts tests/invariants/rls-completude-varredura.test.ts tests/invariants/travas-de-suporte-cobrem-toda-tabela-na-instalacao.test.ts tests/invariants/rbac-config-ia-canais.test.ts 2>&1 | tail -25
```
Expected: os 4 PASS e `==> test:db verde`. A `rbac-config-ia-canais` é a cerca de RBAC da 0150. Se o Docker não responder, PARE e peça ao usuário para abri-lo.

- [ ] **Step 4: Commit**

```bash
git add tests/invariants/escale-capas-do-card-rls.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "test(escale): prova no Postgres da preferência do card

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A forma da preferência (a da Clint)

**Files:**
- Create: `lib/escale/capa/tipos.ts`, `tests/unit/escale-capa-tipos.test.ts`

**Interfaces (Produces, de `@/lib/escale/capa/tipos`):**
- `ITENS_FIXOS`, `type ItemFixo = "tags" | "empresa" | "ultimaMensagem" | "atividades" | "valor" | "idade" | "dono"`;
- `CANAIS_DO_RODAPE`, `type CanalDoRodape = "telefone" | "mensagem" | "email" | "lembrete" | "agendamento"`;
- `CAMPOS_MAX = 10`, `CANAIS_MAX = 3`;
- `prefsDoCardSchema` e `type PrefsDoCard = { itens: Record<ItemFixo, boolean>; campos: { entidade: "contato" | "negocio"; chave: string }[]; canais: Record<CanalDoRodape, boolean> }`;
- `PREFS_PADRAO`;
- `lerPrefs(bruto): PrefsDoCard | null`;
- `ocupados(p)`, `canaisLigados(p)`;
- `alternarItem(p, item)`, `alternarCampo(p, campo)` e `alternarCanal(p, canal)`, que devolvem preferência NOVA e respeitam os limites;
- `prefsIguais(a, b)`, `diferemDoPadrao(p)`;
- `type CampoDaCapa = { entidade; chave; rotulo; deInterface: boolean; opcoes? }`, `CAMPOS_DO_CONTATO`, `camposDaCapa(settings[])`;
- `valorDoCampo(lead, campo)`, `textoDoValor(valor, campo, sim, nao)`.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-capa-tipos.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  CAMPOS_DO_CONTATO,
  PREFS_PADRAO,
  alternarCampo,
  alternarCanal,
  alternarItem,
  camposDaCapa,
  canaisLigados,
  diferemDoPadrao,
  lerPrefs,
  ocupados,
  prefsIguais,
  textoDoValor,
  valorDoCampo,
  type PrefsDoCard,
} from "@/lib/escale/capa/tipos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

const SETTINGS = { fields: [{ key: "renda", label: "Renda", type: "number" }, { key: "plano", label: "Plano", type: "select", options: [{ value: "a", label: "Anual" }] }] };
const RENDA = { entidade: "negocio" as const, chave: "renda" };

describe("a preferência do card (forma da Clint)", () => {
  it("o padrão é o da Clint: os sete itens ligados, sem campos, telefone/mensagem/e-mail", () => {
    expect(lerPrefs(PREFS_PADRAO)).toEqual(PREFS_PADRAO);
    expect(Object.values(PREFS_PADRAO.itens).every(Boolean)).toBe(true);
    expect(PREFS_PADRAO.canais).toEqual({ telefone: true, mensagem: true, email: true, lembrete: false, agendamento: false });
    expect(ocupados(PREFS_PADRAO)).toBe(7);
    expect(diferemDoPadrao(PREFS_PADRAO)).toBe(false);
  });

  it("o que não serve mais vira null, sem lançar", () => {
    expect(lerPrefs(null)).toBeNull();
    expect(lerPrefs({ ...PREFS_PADRAO, extra: 1 })).toBeNull();
    expect(lerPrefs({ ...PREFS_PADRAO, canais: { ...PREFS_PADRAO.canais, lembrete: true } })).toBeNull();
    expect(lerPrefs({ ...PREFS_PADRAO, campos: [RENDA, RENDA] })).toBeNull();
  });

  it("10 campos no máximo (itens ligados + campos) e 3 ícones; alternar devolve preferência nova", () => {
    let p: PrefsDoCard = PREFS_PADRAO;
    for (const chave of ["a", "b", "c"]) p = alternarCampo(p, { entidade: "negocio", chave });
    expect(ocupados(p)).toBe(10);
    expect(alternarCampo(p, { entidade: "negocio", chave: "d" })).toBe(p);
    expect(alternarItem(p, "tags").itens.tags).toBe(false);
    expect(alternarCanal(PREFS_PADRAO, "lembrete")).toBe(PREFS_PADRAO);
    expect(canaisLigados(alternarCanal(alternarCanal(PREFS_PADRAO, "email"), "lembrete"))).toBe(3);
    expect(PREFS_PADRAO.itens.tags).toBe(true);
  });

  it("iguais sem olhar a ordem dos campos", () => {
    const a = alternarCampo(alternarCampo(PREFS_PADRAO, RENDA), CAMPOS_DO_CONTATO[0]!);
    const b = alternarCampo(alternarCampo(PREFS_PADRAO, CAMPOS_DO_CONTATO[0]!), RENDA);
    expect(prefsIguais(a, b)).toBe(true);
    expect(diferemDoPadrao(a)).toBe(true);
  });

  it("os campos: Email e Telefone do contato e os da origem; o valor sai com o rótulo da opção", () => {
    const campos = camposDaCapa([SETTINGS]);
    expect(campos.map((c) => `${c.entidade}:${c.chave}`)).toEqual(["contato:email", "contato:telefone", "negocio:renda", "negocio:plano"]);
    const lead = negocio("l-1", { contact_email: "ana@x.com", custom_fields: { renda: 5000, plano: "a" } });
    const plano = campos.find((c) => c.chave === "plano")!;
    expect(valorDoCampo(lead, campos[0]!)).toBe("ana@x.com");
    expect(textoDoValor(valorDoCampo(lead, plano), plano, "Sim", "Não")).toBe("Anual");
    expect(textoDoValor(true, campos[2]!, "Sim", "Não")).toBe("Sim");
    expect(textoDoValor("  ", campos[2]!, "Sim", "Não")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-capa-tipos.test.ts
```
Expected: FAIL com "Failed to resolve import" de `@/lib/escale/capa/tipos`.

- [ ] **Step 3: Implementar**

Create `lib/escale/capa/tipos.ts`:

```ts
import { z } from "zod";

import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { Lead } from "@/lib/types/leads";

/**
 * A PREFERÊNCIA DO CARD (fork Escale, Fase 1E): a do "Personalizar cards" da
 * Clint (01-019; preferência `kanban_card`, padrão `Ph`, limites `Fda`/`Bda` do
 * bundle). É da pessoa e vale em todas as origens dela, como na Clint.
 */
export const ITENS_FIXOS = ["tags", "empresa", "ultimaMensagem", "atividades", "valor", "idade", "dono"] as const;
export type ItemFixo = (typeof ITENS_FIXOS)[number];

export const CANAIS_DO_RODAPE = ["telefone", "mensagem", "email", "lembrete", "agendamento"] as const;
export type CanalDoRodape = (typeof CANAIS_DO_RODAPE)[number];

/** Clint: "Limite de 10 campos atingido" (itens ligados + campos) e "Limite de 3 ícones no rodapé atingido". */
export const CAMPOS_MAX = 10;
export const CANAIS_MAX = 3;

export type EntidadeDoCampo = "contato" | "negocio";
export interface CampoEscolhido {
  entidade: EntidadeDoCampo;
  chave: string;
}

const itensSchema = z.object(Object.fromEntries(ITENS_FIXOS.map((i) => [i, z.boolean()])) as Record<ItemFixo, z.ZodBoolean>).strict();
const canaisSchema = z
  .object(Object.fromEntries(CANAIS_DO_RODAPE.map((c) => [c, z.boolean()])) as Record<CanalDoRodape, z.ZodBoolean>)
  .strict();
const campoSchema = z.object({ entidade: z.enum(["contato", "negocio"]), chave: z.string().min(1).max(100) }).strict();

export const prefsDoCardSchema = z
  .object({ itens: itensSchema, campos: z.array(campoSchema).max(CAMPOS_MAX), canais: canaisSchema })
  .strict()
  .refine((p) => new Set(p.campos.map(chaveDoCampo)).size === p.campos.length, { message: "campo repetido" })
  .refine((p) => ocupados(p) <= CAMPOS_MAX, { message: "limite de campos" })
  .refine((p) => canaisLigados(p) <= CANAIS_MAX, { message: "limite de ícones" });

export type PrefsDoCard = z.infer<typeof prefsDoCardSchema>;

/** O padrão da Clint (`Ph`): o card que a Casca V4 já mostra. */
export const PREFS_PADRAO: PrefsDoCard = {
  itens: { tags: true, empresa: true, ultimaMensagem: true, atividades: true, valor: true, idade: true, dono: true },
  campos: [],
  canais: { telefone: true, mensagem: true, email: true, lembrete: false, agendamento: false },
};

export function chaveDoCampo(c: CampoEscolhido): string {
  return `${c.entidade}:${c.chave}`;
}

/** Quantos dos 10 lugares a preferência ocupa (os canais ficam de fora). */
export function ocupados(p: Pick<PrefsDoCard, "itens" | "campos">): number {
  return Object.values(p.itens).filter(Boolean).length + p.campos.length;
}

export function canaisLigados(p: Pick<PrefsDoCard, "canais">): number {
  return Object.values(p.canais).filter(Boolean).length;
}

/** O jsonb do banco vira preferência, ou `null` se não servir mais. Nunca lança. */
export function lerPrefs(bruto: unknown): PrefsDoCard | null {
  const lido = prefsDoCardSchema.safeParse(bruto);
  return lido.success ? lido.data : null;
}

/** Liga ou desliga um item. Ligar com os 10 ocupados devolve a MESMA preferência. */
export function alternarItem(p: PrefsDoCard, item: ItemFixo): PrefsDoCard {
  if (!p.itens[item] && ocupados(p) >= CAMPOS_MAX) return p;
  return { ...p, itens: { ...p.itens, [item]: !p.itens[item] } };
}

export function alternarCampo(p: PrefsDoCard, campo: CampoEscolhido): PrefsDoCard {
  const chave = chaveDoCampo(campo);
  if (p.campos.some((c) => chaveDoCampo(c) === chave)) {
    return { ...p, campos: p.campos.filter((c) => chaveDoCampo(c) !== chave) };
  }
  if (ocupados(p) >= CAMPOS_MAX) return p;
  return { ...p, campos: [...p.campos, { entidade: campo.entidade, chave: campo.chave }] };
}

/** Liga ou desliga um ícone. Ligar com 3 ligados devolve a MESMA preferência. */
export function alternarCanal(p: PrefsDoCard, canal: CanalDoRodape): PrefsDoCard {
  if (!p.canais[canal] && canaisLigados(p) >= CANAIS_MAX) return p;
  return { ...p, canais: { ...p.canais, [canal]: !p.canais[canal] } };
}

export function prefsIguais(a: PrefsDoCard, b: PrefsDoCard): boolean {
  const itens = ITENS_FIXOS.every((i) => a.itens[i] === b.itens[i]);
  const canais = CANAIS_DO_RODAPE.every((c) => a.canais[c] === b.canais[c]);
  const camposA = a.campos.map(chaveDoCampo);
  const camposB = new Set(b.campos.map(chaveDoCampo));
  return itens && canais && camposA.length === camposB.size && camposA.every((c) => camposB.has(c));
}

/** O ponto da marca no ícone de ajustes (a Clint compara com o padrão, `Kmn`). */
export const diferemDoPadrao = (p: PrefsDoCard) => !prefsIguais(p, PREFS_PADRAO);

export interface CampoDaCapa extends CampoEscolhido {
  rotulo: string;
  /** `true` = rótulo é texto de interface (passa por `t()`); `false` = nome que a organização deu ao campo. */
  deInterface: boolean;
  opcoes?: ReadonlyArray<{ value: string; label: string }>;
}

/** Os campos do contato que temos (Fase 2 traz os personalizados do contato). */
export const CAMPOS_DO_CONTATO: readonly CampoDaCapa[] = [
  { entidade: "contato", chave: "email", rotulo: "Email", deInterface: true },
  { entidade: "contato", chave: "telefone", rotulo: "Telefone", deInterface: true },
];

/** Os do contato e os personalizados do negócio (`settings.fields`); numa visualização, a união das origens. */
export function camposDaCapa(settings: ReadonlyArray<Record<string, unknown> | null | undefined>): CampoDaCapa[] {
  const doNegocio = new Map<string, CampoDaCapa>();
  for (const s of settings) {
    for (const def of camposDoFunil(s ?? null)) {
      if (doNegocio.has(def.key)) continue;
      doNegocio.set(def.key, {
        entidade: "negocio",
        chave: def.key,
        rotulo: def.label,
        deInterface: false,
        ...(def.options?.length ? { opcoes: def.options } : {}),
      });
    }
  }
  return [...CAMPOS_DO_CONTATO, ...doNegocio.values()];
}

export function valorDoCampo(lead: Lead, campo: CampoEscolhido): unknown {
  if (campo.entidade === "negocio") return lead.custom_fields?.[campo.chave];
  if (campo.chave === "email") return lead.contact_email ?? null;
  if (campo.chave === "telefone") return lead.contact_phone ?? null;
  return null;
}

/** O valor como o chip escreve. `null` = vazio: o chip não aparece. Opção vira o rótulo dela. */
export function textoDoValor(valor: unknown, campo: Pick<CampoDaCapa, "opcoes">, sim: string, nao: string): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "boolean") return valor ? sim : nao;
  const rotulo = (v: unknown) => campo.opcoes?.find((o) => o.value === String(v))?.label ?? String(v);
  if (Array.isArray(valor)) {
    const partes = valor.map(rotulo).filter((p) => p.trim() !== "");
    return partes.length ? partes.join(", ") : null;
  }
  const texto = rotulo(valor).trim();
  return texto === "" ? null : texto;
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-capa-tipos.test.ts
```
Expected: PASS, 5 testes. Antes do commit: typecheck e eslint (Global Constraints).

- [ ] **Step 5: Commit**

```bash
git add lib/escale/capa/tipos.ts tests/unit/escale-capa-tipos.test.ts
git commit -m "feat(escale): a forma da preferência do card, igual à da Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: A rota da preferência

**Files:**
- Create: `lib/escale/capa/banco.ts`, `app/api/v1/capas-do-card/route.ts`, `tests/unit/escale-capas-do-card-rotas.test.ts`
- Modify: `lib/audit/actions.ts` (2 ações, logo depois de `"pipeline_filter.deleted",`)

**Interfaces:**
- `GET /api/v1/capas-do-card`, que responde `{ data: { prefs: PrefsDoCard | null } }`.
- `PUT /api/v1/capas-do-card` com `{ prefs }`, que responde `{ data: { prefs } }`. Os dois pedem viewer ou acima.
- Ações de auditoria `"card_cover.updated"` e `"pipeline.cards_exported"` (a segunda é da Task 13).
- Em `@/lib/escale/capa/banco`: `lerPrefsDaPessoa`, `gravarPrefsDaPessoa`, `type OndeFalhou` e `falhaInesperadaDoQuadro(erro, onde, t, requestId)`. Esta última é o 500 genérico, com a mensagem crua só no log, e a Task 13 também a usa.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-capas-do-card-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { PREFS_PADRAO } from "@/lib/escale/capa/tipos";
import { GET, PUT } from "@/app/api/v1/capas-do-card/route";
import { ORG_ID, USER_ID, authOk, makeDb } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

type Linha = Record<string, unknown>;
const OUTRA = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const SEM_TAGS = { ...PREFS_PADRAO, itens: { ...PREFS_PADRAO.itens, tags: false } };

function banco(linhas: Linha[] = [], opts: Parameters<typeof makeDb>[0] = {}) {
  const db = makeDb(opts);
  (db.tabelas as unknown as Record<string, Linha[]>).crm_capas_do_card = linhas;
  return db;
}
const linhasDe = (db: ReturnType<typeof banco>) => (db.tabelas as unknown as Record<string, Linha[]>).crm_capas_do_card ?? [];
const ler = () => GET(new NextRequest("http://localhost/api/v1/capas-do-card"));
const gravar = (body: unknown) =>
  PUT(new NextRequest("http://localhost/api/v1/capas-do-card", { method: "PUT", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json" } }));

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(logger.error).mockClear();
  authOk();
});

describe("/api/v1/capas-do-card", () => {
  it("GET devolve a minha (e só a minha); sem nada, null; gravada fora da forma, null", async () => {
    banco([
      { id: "c1", organization_id: ORG_ID, user_id: USER_ID, capa: SEM_TAGS },
      { id: "c2", organization_id: ORG_ID, user_id: OUTRA, capa: PREFS_PADRAO },
    ]);
    expect(((await (await ler()).json()) as { data: unknown }).data).toEqual({ prefs: SEM_TAGS });
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("viewer");
    banco();
    expect(((await (await ler()).json()) as { data: unknown }).data).toEqual({ prefs: null });
    banco([{ id: "c1", organization_id: ORG_ID, user_id: USER_ID, capa: { itens: 1 } }]);
    expect(((await (await ler()).json()) as { data: unknown }).data).toEqual({ prefs: null });
  });

  it("PUT grava a minha, uma linha por pessoa (a segunda gravação atualiza) e audita", async () => {
    const db = banco();
    expect((await gravar({ prefs: SEM_TAGS })).status).toBe(200);
    expect((await gravar({ prefs: PREFS_PADRAO })).status).toBe(200);
    const minhas = linhasDe(db).filter((l) => l.user_id === USER_ID);
    expect(minhas).toHaveLength(1);
    expect(minhas[0]).toMatchObject({ organization_id: ORG_ID, capa: PREFS_PADRAO });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "card_cover.updated" }));
  });

  it("fora da forma é 422; corpo que não é JSON é 400; suporte somente leitura para antes", async () => {
    const db = banco();
    expect((await gravar({ prefs: { ...PREFS_PADRAO, extra: 1 } })).status).toBe(422);
    expect((await gravar({ prefs: PREFS_PADRAO, user_id: OUTRA })).status).toBe(422);
    expect((await gravar("{nao é json")).status).toBe(400);
    vi.mocked(requireSupportWrite).mockResolvedValueOnce(new Response(null, { status: 423 }) as never);
    expect((await gravar({ prefs: PREFS_PADRAO })).status).toBe(423);
    expect(linhasDe(db)).toEqual([]);
  });

  it("erro do banco é 500 genérico: a mensagem crua vai só para o log", async () => {
    const CRU = 'relation "crm_capas_do_card" violates something internal';
    banco([], { readError: (tabela) => (tabela === "crm_capas_do_card" ? { code: "XX000", message: CRU } : null) });
    const res = await ler();
    const corpo = await res.text();
    expect(res.status).toBe(500);
    expect(corpo).toContain("Não consegui completar essa ação. Tente de novo.");
    expect(corpo).not.toContain("crm_capas_do_card");
    expect(logger.error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ codigo: "XX000", erro: CRU }));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-capas-do-card-rotas.test.ts
```
Expected: FAIL ("Failed to resolve import" da rota).

- [ ] **Step 3: As ações de auditoria**

Em `lib/audit/actions.ts`, logo depois da linha `  "pipeline_filter.deleted",`, acrescente:

```ts
  // FORK ESCALE · Fase 1E: a preferência do card (migration 9005) e a exportação dos cards.
  "card_cover.updated",
  "pipeline.cards_exported",
```

- [ ] **Step 4: O banco**

Create `lib/escale/capa/banco.ts`:

```ts
/**
 * A preferência do card no banco (fork Escale, Fase 1E; migration 9005) e o 500
 * genérico das rotas do quadro. `requireSupportWrite()`/`requireRole()` NÃO
 * moram aqui: o gate `suporte-cobertura-de-efeitos` exige a guarda no handler.
 */
import { fail } from "@/lib/api/wrappers";
import { logger } from "@/lib/logger";
import type { createClient } from "@/lib/supabase/server";

import { lerPrefs, type PrefsDoCard } from "./tipos";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ErroDoBanco = { code?: string; message?: string };

/** A preferência da pessoa, ou `null`. LANÇA o erro do banco (com `code`). */
export async function lerPrefsDaPessoa(supabase: Supabase, orgId: string, userId: string): Promise<PrefsDoCard | null> {
  const { data, error } = await supabase
    .from("crm_capas_do_card")
    .select("capa")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? lerPrefs((data as { capa: unknown }).capa) : null;
}

/** Atualiza a linha da pessoa ou cria a primeira. */
export async function gravarPrefsDaPessoa(
  supabase: Supabase,
  orgId: string,
  userId: string,
  prefs: PrefsDoCard,
): Promise<{ error: ErroDoBanco | null }> {
  const { data: existente, error: erroDaLeitura } = await supabase
    .from("crm_capas_do_card")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (erroDaLeitura) return { error: erroDaLeitura };
  if (existente) {
    const { error } = await supabase
      .from("crm_capas_do_card")
      .update({ capa: prefs })
      .eq("id", (existente as { id: string }).id)
      .eq("organization_id", orgId);
    return { error };
  }
  const { error } = await supabase.from("crm_capas_do_card").insert({ organization_id: orgId, user_id: userId, capa: prefs });
  return { error };
}

export interface OndeFalhou {
  rota: string;
  operacao: string;
}

/**
 * 500 para o que o banco devolveu e a gente não sabe nomear: o cliente recebe só
 * o texto genérico; a mensagem crua (tabela, constraint) fica no log, com o
 * requestId. É a regra da 1D (`falhaInesperada` dos filtros salvos).
 */
export function falhaInesperadaDoQuadro(
  erro: ErroDoBanco | null | undefined,
  onde: OndeFalhou,
  t: (texto: string) => string,
  requestId: string,
): Response {
  logger.error("[quadro] erro inesperado", {
    rota: onde.rota,
    operacao: onde.operacao,
    codigo: erro?.code ?? null,
    erro: erro?.message ?? String(erro),
    requestId,
  });
  return fail("internal_error", t("Não consegui completar essa ação. Tente de novo."), 500, { requestId });
}
```

- [ ] **Step 5: A rota**

Create `app/api/v1/capas-do-card/route.ts`:

```ts
/**
 * GET/PUT /api/v1/capas-do-card — a preferência "Personalizar cards" da pessoa
 * (fork Escale, Fase 1E; migration 9005), como a `kanban_card` da Clint. Vale em
 * todas as origens. `organization_id` e `user_id` saem da sessão.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro, gravarPrefsDaPessoa, lerPrefsDaPessoa } from "@/lib/escale/capa/banco";
import { prefsDoCardSchema } from "@/lib/escale/capa/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/capas-do-card";
const corpoSchema = z.object({ prefs: prefsDoCardSchema }).strict();
type ErroDoBanco = { code?: string; message?: string };

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_capas_do_card" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  try {
    return ok({ prefs: await lerPrefsDaPessoa(await createClient(), authz.org.orgId, authz.user.id) }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(err as ErroDoBanco, { rota: `GET ${ROTA}`, operacao: "ler a preferência" }, t, requestId);
  }
}

export async function PUT(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_capas_do_card" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const { prefs } = parsed.data;
  const { error } = await gravarPrefsDaPessoa(await createClient(), authz.org.orgId, authz.user.id, prefs);
  if (error) {
    if (error.code === "23505") return fail("state_conflict", t("A preferência mudou em outra aba. Abra de novo e salve."), 409, { requestId });
    return falhaInesperadaDoQuadro(error, { rota: `PUT ${ROTA}`, operacao: "gravar a preferência" }, t, requestId);
  }

  void audit({
    action: "card_cover.updated",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_capa_do_card",
    resourceId: authz.user.id,
    requestId,
    metadata: {},
  });
  return ok({ prefs }, { requestId });
}
```

- [ ] **Step 6: Rodar e ver passar, com os gates das rotas**

```bash
corepack pnpm vitest run tests/unit/escale-capas-do-card-rotas.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts tests/unit/audit-lista-do-painel-e-derivada.test.tsx
corepack pnpm lint:role-rank
```
Expected: PASS nos três. `lint:role-rank` sem erro. Antes do commit: typecheck e eslint.

- [ ] **Step 7: Commit**

```bash
git add lib/escale/capa/banco.ts app/api/v1/capas-do-card/route.ts lib/audit/actions.ts tests/unit/escale-capas-do-card-rotas.test.ts
git commit -m "feat(escale): rota da preferência do card, com auditoria e 500 genérico

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: O interruptor da casca

**Files:**
- Create: `components/escale/ui/InterruptorDaCasca.tsx`, `tests/unit/escale-ui-interruptor.test.tsx`

**Visual** (01-019 e o código `vf`): pílula de 28×16. Trilho ligado na cor da marca (`bg-casca-marca`), desligado `#CECED3`. Bolinha branca de 12px com sombra `0 1px 2px rgb(0 0 0/.35)`, que anda em 0,15s. Desligado: opacidade 0,55 e cursor `not-allowed`.

**Interfaces:** `InterruptorDaCasca({ ligado: boolean; aoMudar: (v: boolean) => void; "aria-label": string; desabilitado?: boolean; title?: string })` → `<button role="switch" aria-checked>`.

- [ ] **Step 1: O teste (vai falhar)**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";

describe("<InterruptorDaCasca>", () => {
  it("é um switch com o estado no aria-checked; clicar pede o contrário", () => {
    const aoMudar = vi.fn();
    render(<InterruptorDaCasca ligado={false} aoMudar={aoMudar} aria-label="Tags" />);
    const s = screen.getByRole("switch", { name: "Tags" });
    expect(s).toHaveAttribute("aria-checked", "false");
    fireEvent.click(s);
    expect(aoMudar).toHaveBeenCalledWith(true);
  });

  it("desabilitado não muda e mostra a dica", () => {
    const aoMudar = vi.fn();
    render(<InterruptorDaCasca ligado={false} aoMudar={aoMudar} aria-label="Renda" desabilitado title="Limite de 10 campos atingido" />);
    const s = screen.getByRole("switch", { name: "Renda" });
    expect(s).toBeDisabled();
    expect(s).toHaveAttribute("title", "Limite de 10 campos atingido");
    fireEvent.click(s);
    expect(aoMudar).not.toHaveBeenCalled();
  });
});
```

Salve em `tests/unit/escale-ui-interruptor.test.tsx` e rode `corepack pnpm vitest run tests/unit/escale-ui-interruptor.test.tsx`. Expected: FAIL (import).

- [ ] **Step 2: Implementar**

Create `components/escale/ui/InterruptorDaCasca.tsx`:

```tsx
"use client";
import { cn } from "@/lib/utils";

/**
 * O INTERRUPTOR DA CASCA (fork Escale, Fase 1E; a janela "Personalizar cards" da
 * Clint, 01-019): pílula de 28×16, trilho da marca quando ligado e #CECED3
 * desligado, bolinha branca de 12px. Sem o `Switch` do original (outro visual).
 */
export function InterruptorDaCasca({
  ligado,
  aoMudar,
  desabilitado = false,
  title,
  "aria-label": rotulo,
}: {
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  "aria-label": string;
  desabilitado?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      title={title}
      disabled={desabilitado}
      onClick={() => aoMudar(!ligado)}
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-casca-marca",
        "disabled:cursor-not-allowed disabled:opacity-[0.55]",
        ligado ? "bg-casca-marca" : "bg-[#CECED3]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0.5 size-3 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.35)] transition-transform duration-150",
          ligado && "translate-x-3",
        )}
      />
    </button>
  );
}
```

- [ ] **Step 3: Rodar e ver passar**, depois typecheck, eslint e prettier.

- [ ] **Step 4: Commit**

```bash
git add components/escale/ui/InterruptorDaCasca.tsx tests/unit/escale-ui-interruptor.test.tsx
git commit -m "feat(escale): o interruptor da casca (Personalizar cards)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: O card da casca obedece à preferência

**Files:**
- Create: `components/escale/quadro/ChipsDeCampos.tsx`, `tests/unit/escale-card-com-prefs.test.tsx`
- Modify: `components/escale/quadro/CardDaCasca.tsx`, `components/escale/quadro/PecasDoCard.tsx`, `lib/i18n/dicionario.ts`, `lib/i18n/traducoes/en.json`, `app/app/webhooks/_components/RulesTab.tsx`, `components/agenda/ClientePelaAgenda.tsx`, `components/connections/TemplatesParceiroClient.tsx` (os quatro do Step 0b), `tests/unit/escale-card-da-casca.test.tsx`, `lib/ui/icons-da-casca.ts`

**O que muda no card** (anatomia da V4 e ordem fixa da Clint):
- tags só com `itens.tags`;
- caixa da mensagem só com `itens.ultimaMensagem`;
- no rodapé: o dono só com `itens.dono`; os ícones na ordem telefone, mensagem, e-mail, só os ligados em `canais` (lembrete e agendamento não têm dado: E3); o valor só com `itens.valor`; à direita, atividades com `itens.atividades` e a idade com `itens.idade`. Rodapé sem nada não aparece (Clint);
- os campos escolhidos viram chips abaixo do rodapé (E6), só os que têm valor;
- `itens.empresa` não desenha nada (não há empresa no card; E3).

As dicas dos ícones passam às da Clint: telefone "Ligar", conversa "Enviar Whatsapp" e e-mail "Email" (E13).

**Interfaces:**
- `CardDaCascaProps` ganha `prefs?: PrefsDoCard` (ausente = `PREFS_PADRAO`) e `camposDoCard?: readonly CampoDaCapa[]`;
- `RodapeDoCard({ card, lead, prefs })`;
- `ChipsDeCampos({ lead, prefs, campos })`.

- [ ] **Step 0: Os ícones que a fase usa**

Em `lib/ui/icons-da-casca.ts`, logo depois da última linha `export { ChevronUp, … } from "lucide-react";`, acrescente:

```ts
// Fase 1E: Personalizar cards, chips dos campos, Negócio +, Ordenar e Recentes.
export { ArrowUpDown, Briefcase, Calendar, Copy, DollarSign, Pin, PinOff, Tag } from "lucide-react";
```

O (?) do ⋮ da coluna usa o `HelpCircle` que já está lá.

- [ ] **Step 0b: "Ligar" é ligação; "Ativar" é ligar/desligar (E13)**

Hoje a chave "Ligar" do dicionário é o interruptor ("Activar"), e ela é usada assim em dois lugares do original. O telefone não podia usar "Ligar" (o `TemplatesParceiroClient` escreve "Ligar" sem `t()` por isso). Decisão do usuário (16/10): **"Ligar" é só ligação, "Ativar" é ligar/desligar.** Cada troca nos arquivos do original leva o comentário `FORK ESCALE · Fase 1E`:

1. `app/app/webhooks/_components/RulesTab.tsx`: no `aria-label` do `Switch` da regra (`r.is_active ? t("Pausar") : t("Ligar")`), troque `t("Ligar")` por `t("Ativar")`.
2. `components/agenda/ClientePelaAgenda.tsx`: o botão de confirmar (`data-testid="cliente-pela-agenda-confirmar"`) troca `{t("Ligar")}` por `{t("Ativar")}`.
3. `components/connections/TemplatesParceiroClient.tsx`: troque `<option value="phone_number">Ligar</option>` por `<option value="phone_number">{t("Ligar")}</option>`, e o comentário de cima por `{/* FORK ESCALE · Fase 1E: "Ligar" agora é ligação no dicionário ("Llamar"). */}`.
4. `lib/i18n/dicionario.ts`: `Ligar: { es: "Activar" },` vira `Ligar: { es: "Llamar" },`. No comentário do bloco "Chamada de voz WhatsApp" (o que começa por `// "Chamar", não "Ligar"`), acrescente uma linha: `// FORK ESCALE · Fase 1E: desde a 1E, "Ligar" é ligação ("Llamar") e o interruptor usa "Ativar".`. `Ativar: { es: "Activar" }` já existe.
5. `lib/i18n/traducoes/en.json`: `"Ligar": "Turn on"` vira `"Ligar": "Call"`. O `zh-CN.json` já diz "拨打" (ligar para alguém) e não muda.

Frases maiores com "Ligar" no sentido de ativar ("Ligar clientes pela agenda?" e outras) são chaves próprias e ficam como estão.

Confira com:

```bash
grep -rn 't("Ligar")' app components lib --include=*.tsx
```

Só pode sobrar uso no sentido de ligação: o `TemplatesParceiroClient` e as peças desta fase. Depois rode:

```bash
corepack pnpm vitest run components/agenda/ClientePelaAgenda.test.tsx tests/unit/templates-do-parceiro.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/selecao-longa-tem-busca.test.ts
```

Expected: PASS. Os testes usam o `data-testid` e não o texto. Os outros ícones da fase (`Bell`, `Building2`, `Clock`, `Users`, `Phone`, `Mail`, `MessageCircle`, `MessageSquare`, `CheckCircle2`, `SlidersHorizontal`, `Search`, `Check`, `X`) também já estão.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-card-com-prefs.test.tsx`. Copie do topo de `tests/unit/escale-card-da-casca.test.tsx`:
- os `vi.mock` (dnd, `useT`, `KanbanCardActions`, `NextActionSlot`, `AbrirConversaDoLead`, `CoresDasEtiquetas`);
- `NOMES` e a função `montar(lead, extra)`;
- o negócio `COMPLETO`, com tags, conversa, telefone, e-mail, dono, valor e tarefas.

Depois, acrescente:

```tsx
import { CardDaCasca } from "@/components/escale/quadro/CardDaCasca";
import { PREFS_PADRAO, camposDaCapa, type PrefsDoCard } from "@/lib/escale/capa/tipos";

const CAMPOS = camposDaCapa([{ fields: [{ key: "renda", label: "Renda", type: "number" }] }]);
const com = (mudar: (p: PrefsDoCard) => PrefsDoCard) => mudar(structuredClone(PREFS_PADRAO));

describe("<CardDaCasca> com a preferência (Fase 1E)", () => {
  it("sem prefs, é o card da V4 (o padrão da Clint)", () => {
    montar(COMPLETO);
    expect(screen.getByRole("link", { name: "Ligar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enviar Whatsapp" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email" })).toBeInTheDocument();
  });

  it("desligar tags, prévia, valor e dono tira cada um; o rodapé segue com o que sobrou", () => {
    montar(COMPLETO, { prefs: com((p) => ({ ...p, itens: { ...p.itens, tags: false, ultimaMensagem: false, valor: false, dono: false } })) });
    expect(screen.queryByText("R$64,8k")).toBeNull();
    expect(screen.queryByRole("img", { name: /Responsável/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Obrigado por entrar/ })).toBeNull();
    expect(screen.getByText("2/5")).toBeInTheDocument();
  });

  it("só os canais ligados, na ordem da Clint", () => {
    montar(COMPLETO, { prefs: com((p) => ({ ...p, canais: { ...p.canais, telefone: false } })) });
    expect(screen.queryByRole("link", { name: "Ligar" })).toBeNull();
    expect(screen.getByRole("link", { name: "Email" })).toBeInTheDocument();
  });

  it("os campos escolhidos viram chips; campo vazio não aparece", () => {
    const lead = { ...COMPLETO, custom_fields: { renda: 5000 } };
    montar(lead, {
      prefs: com((p) => ({ ...p, campos: [{ entidade: "negocio", chave: "renda" }, { entidade: "contato", chave: "telefone" }] })),
      camposDoCard: CAMPOS,
    });
    const chips = screen.getByTestId("chips-de-campos");
    expect(within(chips).getByText("5000")).toBeInTheDocument();
    expect(within(chips).getByText("+5511999990000")).toBeInTheDocument();
  });

  it("tudo desligado: sem rodapé", () => {
    const nada: PrefsDoCard = {
      itens: { tags: false, empresa: false, ultimaMensagem: false, atividades: false, valor: false, idade: false, dono: false },
      campos: [],
      canais: { telefone: false, mensagem: false, email: false, lembrete: false, agendamento: false },
    };
    montar(COMPLETO, { prefs: nada });
    expect(screen.queryByTestId("rodape-do-card")).toBeNull();
  });
});
```

`montar(lead, extra)` já espalha `extra` nas props do `CardDaCasca`, então `prefs` e `camposDoCard` passam por ela.

Em `tests/unit/escale-card-da-casca.test.tsx`, troque o nome `"Abrir esta conversa no Inbox"` por `"Enviar Whatsapp"` e `"Enviar e-mail"` por `"Email"` (E13).

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-card-com-prefs.test.tsx tests/unit/escale-card-da-casca.test.tsx
```
Expected: FAIL. Os nomes novos e as props `prefs`/`camposDoCard` ainda não existem.

- [ ] **Step 3: Os chips dos campos**

Create `components/escale/quadro/ChipsDeCampos.tsx`:

```tsx
"use client";
import { useState, type MouseEvent } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { chaveDoCampo, textoDoValor, valorDoCampo, type CampoDaCapa, type PrefsDoCard } from "@/lib/escale/capa/tipos";
import type { Lead } from "@/lib/types/leads";
import { Copy } from "@/lib/ui/icons-da-casca";

const parar = (e: MouseEvent) => e.stopPropagation();

/**
 * OS CAMPOS ESCOLHIDOS NO "PERSONALIZAR CARDS", em chips abaixo do rodapé (fork
 * Escale, Fase 1E; código do card da Clint, `customFields`): fundo claro da
 * marca, texto da marca, 10px/500, até 160px. O hover mostra o rótulo e o valor,
 * com "Copiar". Campo vazio não aparece (só a prévia mostra exemplo).
 */
export function ChipsDeCampos({ lead, prefs, campos }: { lead: Lead; prefs: PrefsDoCard; campos: readonly CampoDaCapa[] }) {
  const t = useT();
  const porChave = new Map(campos.map((c) => [chaveDoCampo(c), c]));
  const chips = prefs.campos.flatMap((escolhido) => {
    const campo = porChave.get(chaveDoCampo(escolhido));
    if (!campo) return [];
    const texto = textoDoValor(valorDoCampo(lead, campo), campo, t("Sim"), t("Não"));
    return texto ? [{ campo, texto, rotulo: campo.deInterface ? t(campo.rotulo) : campo.rotulo }] : [];
  });
  if (chips.length === 0) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <div data-testid="chips-de-campos" className="flex flex-wrap gap-1 px-2.5 pb-2" onClick={parar} onPointerDown={parar}>
        {chips.map(({ campo, texto, rotulo }) => (
          <ChipDoCampo key={chaveDoCampo(campo)} rotulo={rotulo} texto={texto} />
        ))}
      </div>
    </TooltipProvider>
  );
}

function ChipDoCampo({ rotulo, texto }: { rotulo: string; texto: string }) {
  const t = useT();
  const [copiado, setCopiado] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="max-w-40 truncate rounded-[4px] bg-casca-marca-suave px-1.5 text-[10px] leading-4 font-medium text-casca-marca">
          {texto}
        </span>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2 bg-casca-texto-2 text-[11px] text-white">
        <span>
          <span className="font-semibold">{rotulo}</span> {texto}
        </span>
        <button
          type="button"
          aria-label={(copiado ? t("Copiado: {label}") : t("Copiar {label}")).replace("{label}", rotulo)}
          onClick={() => {
            void navigator.clipboard?.writeText(texto);
            setCopiado(true);
          }}
          className="grid size-5 place-items-center rounded-[4px] hover:bg-white/10"
        >
          <Copy size={12} aria-hidden />
        </button>
      </TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 4: O card e o rodapé obedecem**

Em `components/escale/quadro/PecasDoCard.tsx`:
- Importe `PREFS_PADRAO` e `type PrefsDoCard` de `@/lib/escale/capa/tipos`.
- Troque a assinatura `export function RodapeDoCard({ card, lead }: { card: CardInput; lead: Lead })` por `export function RodapeDoCard({ card, lead, prefs = PREFS_PADRAO }: { card: CardInput; lead: Lead; prefs?: PrefsDoCard })`.
- Logo depois de `const idade = idadeNaEtapa(card.hoursInStage);`, acrescente:

```tsx
  const { itens, canais } = prefs;
  const temEsquerda = itens.dono || canais.telefone || canais.mensagem || canais.email || itens.valor;
  const temDireita = itens.atividades || (itens.idade && Boolean(idade));
  // A Clint não desenha o rodapé quando nada está ligado.
  if (!temEsquerda && !temDireita) return null;
```

- No `<div className="flex min-h-9 items-center gap-2 border-t …">`, acrescente `data-testid="rodape-do-card"`.
- Envolva cada peça na sua condição, sem mudar a marcação de dentro:
  - `{itens.dono && <AvatarDoDono … />}`;
  - `{canais.telefone && (telefone ? <a …> : <span …>)}`;
  - `{canais.mensagem && (lead.conversa ? <Link …> : <span …>)}`;
  - `{canais.email && (email ? <a …> : <span …>)}`;
  - `{itens.valor && <span className="font-medium tabular-nums">…</span>}`;
  - à direita, `{itens.atividades && <span title={dicaDasAtividades} …>…</span>}` e `{itens.idade && idade ? … : null}`.
- Troque `aria-label={t("Abrir esta conversa no Inbox")}` (o do ícone do rodapé, não o `title` da caixa da mensagem) por `aria-label={t("Enviar Whatsapp")} title={t("Enviar Whatsapp")}`.
- Troque `aria-label={t("Enviar e-mail")}` por `aria-label={t("Email")}`.
- No link do telefone, troque `aria-label={t("Chamar")}` por `aria-label={t("Ligar")} title={t("Ligar")}` (E13; o Step 0b deixou "Ligar" = ligação).

Nos testes do card (`escale-card-com-prefs` e `escale-card-da-casca`), troque o nome `"Chamar"` por `"Ligar"`.

Em `components/escale/quadro/CardDaCasca.tsx`:
- Importe `PREFS_PADRAO`, `type CampoDaCapa`, `type PrefsDoCard` e `ChipsDeCampos` (`./ChipsDeCampos`).
- Nas props, depois de `origem?: string;`, acrescente:

```tsx
  /** Fase 1E: a preferência "Personalizar cards" da pessoa. Ausente = o padrão da Clint (o card da V4). */
  prefs?: PrefsDoCard;
  /** Fase 1E: os campos que a preferência pode escolher (rótulo e opções), para os chips. */
  camposDoCard?: readonly CampoDaCapa[];
```

- Desestruture `prefs = PREFS_PADRAO` e `camposDoCard = []`.
- Troque `<ChipsDoCard lead={lead} />` por `{prefs.itens.tags && <ChipsDoCard lead={lead} />}`.
- Troque `<CaixaDaMensagem lead={lead} nomes={nomes} />` por `{prefs.itens.ultimaMensagem && <CaixaDaMensagem lead={lead} nomes={nomes} />}`.
- Troque `<RodapeDoCard card={card} lead={lead} />` por:

```tsx
          <RodapeDoCard card={card} lead={lead} prefs={prefs} />
          <ChipsDeCampos lead={lead} prefs={prefs} campos={camposDoCard} />
```

- [ ] **Step 5: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-card-com-prefs.test.tsx tests/unit/escale-card-da-casca.test.tsx tests/unit/escale-coluna-da-casca.test.tsx tests/unit/escale-quadro-combinado.test.tsx
```
Expected: PASS. Antes do commit: typecheck, eslint e prettier nos arquivos do fork.

- [ ] **Step 6: Commit**

```bash
git add lib/ui/icons-da-casca.ts lib/i18n/dicionario.ts lib/i18n/traducoes/en.json app/app/webhooks/_components/RulesTab.tsx components/agenda/ClientePelaAgenda.tsx components/connections/TemplatesParceiroClient.tsx components/escale/quadro/ChipsDeCampos.tsx components/escale/quadro/CardDaCasca.tsx components/escale/quadro/PecasDoCard.tsx tests/unit/escale-card-com-prefs.test.tsx tests/unit/escale-card-da-casca.test.tsx
git commit -m "feat(escale): o card da casca obedece ao Personalizar cards (itens, ícones e campos)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: A janela "Personalizar cards"

**Files:**
- Create: `hooks/escale/usePrefsDoCard.ts`, `lib/escale/capa/exemplo.ts`, `components/escale/capa/JanelaPersonalizarCards.tsx`, `tests/unit/escale-janela-personalizar-cards.test.tsx`
- Create também: `components/escale/capa/PersonalizarCards.tsx`
- Modify: `components/escale/filtros/LinhaDeContagem.tsx`, `components/escale/filtros/BarraDoQuadro.tsx`, `tests/unit/escale-barra-do-quadro.test.tsx`

**Visual** (abrir `01-019-personalizacao-cards.png` e os prints da v2 `33a`, `33b`, `v2-12` a `v2-15` em `docs/clint/prints-1e/`; medidas do código `vf`, em px de CSS):

| Peça | Detalhe |
|---|---|
| Onde abre | o ícone de ajustes (`SlidersHorizontal` 17, `BotaoDaCasca variante="icone"`) na linha de contagem, logo depois do atualizar. Dica "Personalizar cards" num balão lavanda embaixo (fundo `casca-marca-suave`, texto `casca-marca`, 11px, raio 4; `33a`). Ponto da marca no canto do ícone quando a preferência difere do padrão |
| Dica de limite | balão lavanda **acima** da linha travada, com "Limite de 3 ícones no rodapé atingido" ou "Limite de 10 campos atingido" (`v2-13`); não é o `title` do navegador |
| Janela | 820px de largura; altura máxima `min(700px, 100dvh-4rem)`; raio 12; cortina escura (`bg-black/55`); sem borda |
| Cabeçalho | `px-5 py-3`, divisória embaixo `#E4E4E9`. Título "Personalizar cards", 14px/500, `#232229`. X de 16px `#86858F` à direita |
| Corpo | grade `400px 1fr` |
| Coluna esquerda | `px-5 py-3`, rola sozinha. Busca de 32px de altura, fundo `#EFEFF2`, lupa de 13px à esquerda, placeholder "Buscar por..." |
| Cabeçalho do grupo | botão de largura toda, `px-2 py-2`, gap 6. Chevron de 14px que gira -90° fechado. Título 10px/500, `tracking-[0.07em]`, maiúsculas, `#5A5964`. Selo 16×16 à direita (fundo `casca-marca-suave`, texto `casca-marca`, 10px/500), só com contagem > 0 |
| Linha | `px-3.5 py-1.5`, raio 6, gap 8, hover `#EFEFF2`. Ícone opcional de 16px (`casca-marca` ligado, `#5A5964` desligado), rótulo 12px, `InterruptorDaCasca` à direita. Desligada: dica "Limite de 10 campos atingido", "Limite de 3 ícones no rodapé atingido" ou "Em breve" |
| Grupos | CONTATO aberto; EMPRESA, NEGÓCIO e ÍCONES DE CANAL NO RODAPÉ fechados. Buscar abre todos. Sem resultado: "Nenhum campo encontrado." |
| Coluna direita | `px-6 py-4`. "Pré-visualização" 9px/500, `tracking-[0.12em]`, maiúsculas, `casca-marca`. Card no centro (máx. 320px, borda 1px `#E1E1E6`, raio 6) que é o `CardDaCasca` de verdade. Embaixo, centralizado em 11px `#5A5964`: "Este é um exemplo. Suas alterações aparecem no kanban depois de salvar." |
| Rodapé | `px-5 py-3`, divisória em cima, à direita. "Cancelar" (contorno, 32px) e "Salvar preferência" (cor da marca, ✓ de 13px, 32px), desligado até mudar algo |
| Salvar | toast "Preferências salvas" e fecha. Erro: a mensagem da rota (`textoDoErro`) |

Linhas de cada grupo, na ordem da Clint:
- **CONTATO:** "Prévia da última mensagem" (`MessageSquare`), depois "Email" e "Telefone".
- **EMPRESA:** "Nome da empresa" (`Building2`), desligada, "Em breve" (E3).
- **NEGÓCIO:** "Valor do negócio" (`DollarSign`), "Idade do negócio" (`Clock`), "Dono do negócio" (`Users`), "Atividades" (`CheckCircle2`), "Tags" (`Tag`), depois os campos da origem.
- **ÍCONES DE CANAL NO RODAPÉ:** "Telefone" (`Phone`), "Mensagem" (`MessageCircle`), "E-mail" (`Mail`), "Lembrete" (`Bell`) e "Agendamento" (`Calendar`). Os dois últimos ficam desligados, "Em breve".
- Os interruptores do grupo de canais têm nome acessível `Ícones de canal no rodapé: <rótulo>` (não repetem "Telefone" do CONTATO).

O exemplo da prévia é o da Clint com a marca trocada:
- contato "Maria Silva", tags "bd-aluno" e "vip", dona "Ana Souza";
- R$64,8k, 5/12 e 5h;
- a mensagem "Oii Maria! Aqui é a Ana, posso te ajudar?" com 2 sem ler.

**Interfaces:**
- `usePrefsDoCard()` (`useQuery`, chave `["prefs-do-card"]`) e `useSalvarPrefsDoCard()` (`useMutation`, grava o resultado na cache);
- `negocioDeExemplo(t, campos): { lead: Lead; card: CardInput; nomes: Map<string, string> }`;
- `JanelaPersonalizarCards({ prefs, campos, onFechar })`.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-janela-personalizar-cards.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Droppable: ({ children }: { children: (p: unknown) => ReactNode }) => children({ innerRef: () => {}, droppableProps: {}, placeholder: null }),
}));
vi.mock("@/components/escale/quadro/CardDaCasca", () => ({
  CardDaCasca: ({ lead, prefs }: { lead: { title: string }; prefs: { itens: Record<string, boolean>; campos: unknown[] } }) => (
    <p>{`prévia ${lead.title} | tags ${prefs.itens.tags} | campos ${prefs.campos.length}`}</p>
  ),
}));
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.releasePointerCapture = vi.fn();

import { JanelaPersonalizarCards } from "@/components/escale/capa/JanelaPersonalizarCards";
import { ApiError } from "@/lib/api/types";
import { CAMPOS_MAX, PREFS_PADRAO, camposDaCapa } from "@/lib/escale/capa/tipos";

const CAMPOS = camposDaCapa([{ fields: [{ key: "renda", label: "Renda", type: "number" }] }]);
const onFechar = vi.fn();

function janela(prefs = PREFS_PADRAO) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <JanelaPersonalizarCards prefs={prefs} campos={CAMPOS} onFechar={onFechar} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

beforeEach(() => {
  api.put.mockReset().mockResolvedValue({ data: { prefs: PREFS_PADRAO } });
  onFechar.mockReset();
  toast.error.mockReset();
});

describe("<JanelaPersonalizarCards> (01-019)", () => {
  it("abre com CONTATO aberto, a prévia e Salvar desligado até mudar", async () => {
    const user = janela();
    expect(screen.getByRole("dialog", { name: "Personalizar cards" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Prévia da última mensagem" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("switch", { name: "Tags" })).toBeNull();
    expect(screen.getByText(/prévia Maria Silva/)).toHaveTextContent("tags true");
    const salvar = screen.getByRole("button", { name: "Salvar preferência" });
    expect(salvar).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Negócio/ }));
    await user.click(screen.getByRole("switch", { name: "Tags" }));
    expect(salvar).toBeEnabled();
    expect(screen.getByText(/prévia Maria Silva/)).toHaveTextContent("tags false");
  });

  it("salvar grava a preferência, mostra 'Preferências salvas' e fecha", async () => {
    const user = janela();
    await user.click(screen.getByRole("button", { name: /Negócio/ }));
    await user.click(screen.getByRole("switch", { name: "Renda" }));
    await user.click(screen.getByRole("button", { name: "Salvar preferência" }));
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
    expect(api.put).toHaveBeenCalledWith("/api/v1/capas-do-card", {
      prefs: { ...PREFS_PADRAO, campos: [{ entidade: "negocio", chave: "renda" }] },
    });
    expect(toast.success).toHaveBeenCalledWith("Preferências salvas");
  });

  it("com 10 ocupados, o que está desligado trava com a dica da Clint", async () => {
    const cheia = { ...PREFS_PADRAO, campos: [1, 2, 3].map((n) => ({ entidade: "negocio" as const, chave: `x${n}` })) };
    const user = janela(cheia);
    await user.click(screen.getByRole("button", { name: /Negócio/ }));
    expect(CAMPOS_MAX).toBe(10);
    expect(screen.getByRole("switch", { name: "Renda" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Renda" })).toHaveAttribute("title", "Limite de 10 campos atingido");
  });

  it("canais: 3 no máximo; Lembrete e Agendamento 'Em breve'; Nome da empresa 'Em breve'", async () => {
    const user = janela();
    await user.click(screen.getByRole("button", { name: /Ícones de canal no rodapé/ }));
    expect(screen.getByRole("switch", { name: "Ícones de canal no rodapé: Lembrete" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Empresa/ }));
    expect(screen.getByRole("switch", { name: "Nome da empresa" })).toHaveAttribute("title", "Em breve");
  });

  it("a busca filtra e avisa quando não acha; a recusa da rota aparece com a mensagem dela", async () => {
    const user = janela();
    await user.type(screen.getByRole("searchbox", { name: "Buscar por..." }), "xyz");
    expect(screen.getByText("Nenhum campo encontrado.")).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox", { name: "Buscar por..." }));
    api.put.mockRejectedValue(new ApiError(409, "state_conflict", undefined, "r", "A preferência mudou em outra aba. Abra de novo e salve."));
    await user.click(screen.getByRole("button", { name: /Negócio/ }));
    await user.click(screen.getByRole("switch", { name: "Tags" }));
    await user.click(screen.getByRole("button", { name: "Salvar preferência" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("A preferência mudou em outra aba. Abra de novo e salve."));
  });
});
```

Em `tests/unit/escale-barra-do-quadro.test.tsx`:
- acrescente `vi.mock("@/hooks/escale/usePrefsDoCard", () => ({ usePrefsDoCard: () => ({ data: null }), useSalvarPrefsDoCard: () => ({ mutate: vi.fn(), isPending: false }) }));`;
- troque o caso que exige `button /Personalizar cards/` desligado (na engrenagem) por um que confere o botão "Personalizar cards" **ligado na linha de contagem**, logo depois de "Atualizar".

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-janela-personalizar-cards.test.tsx tests/unit/escale-barra-do-quadro.test.tsx
```

- [ ] **Step 3: O hook**

Create `hooks/escale/usePrefsDoCard.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { PrefsDoCard } from "@/lib/escale/capa/tipos";

/** A preferência "Personalizar cards" da pessoa (fork Escale, Fase 1E). `null` = o padrão da Clint. */
const ROTA = "/api/v1/capas-do-card";
export const CHAVE_DAS_PREFS = ["prefs-do-card"] as const;

export function usePrefsDoCard() {
  return useQuery({
    queryKey: CHAVE_DAS_PREFS,
    queryFn: async () => (await apiClient.get<{ data: { prefs: PrefsDoCard | null } }>(ROTA)).data.prefs,
    staleTime: 5 * 60_000,
  });
}

export function useSalvarPrefsDoCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: PrefsDoCard) => apiClient.put<{ data: { prefs: PrefsDoCard } }>(ROTA, { prefs }),
    // Vale em todas as origens: a cache é uma só, e os quadros abertos repintam.
    onSuccess: (resposta) => qc.setQueryData(CHAVE_DAS_PREFS, resposta.data.prefs),
  });
}
```

- [ ] **Step 4: O exemplo da prévia**

Create `lib/escale/capa/exemplo.ts`:

```ts
import type { NegocioComFiltros } from "@/lib/escale/filtros/dados-do-quadro";
import { buildCardInput, type CardInput } from "@/lib/kanban/card-state";

import type { CampoDaCapa } from "./tipos";

const HORA = 3_600_000;

/**
 * O negócio da PRÉ-VISUALIZAÇÃO (fork Escale, Fase 1E): o exemplo da Clint
 * (01-019) com a marca trocada. Todo campo escolhido tem valor de exemplo: na
 * prévia, a Clint mostra até os vazios.
 */
export function negocioDeExemplo(
  t: (texto: string) => string,
  campos: readonly CampoDaCapa[],
  agora: Date = new Date(),
): { lead: NegocioComFiltros; card: CardInput; nomes: Map<string, string> } {
  const ha5h = new Date(agora.getTime() - 5 * HORA).toISOString();
  const ha7min = new Date(agora.getTime() - 7 * 60_000).toISOString();
  const dona = "exemplo-ana";
  const lead: NegocioComFiltros = {
    id: "exemplo-da-capa", organization_id: "", pipeline_id: "", stage_id: "", contact_id: "exemplo-da-capa",
    title: t("Maria Silva"), description: null, status: "open", lost_reason: null, position_in_stage: 0,
    value_cents: 6_480_000, currency: "BRL", owner_user_id: dona, owner_kind: "user", owner_agent_id: null,
    assigned_at: null, last_activity_at: ha5h, stage_changed_at: ha5h, expected_close_date: null, closed_at: null,
    source: "manual", source_metadata: {}, external_id: null,
    custom_fields: Object.fromEntries(campos.filter((c) => c.entidade === "negocio").map((c) => [c.chave, t("Exemplo")])),
    tags: ["bd-aluno", "vip"],
    conversa: { id: "exemplo-da-capa", preview: t("Oii Maria! Aqui é a Ana, posso te ajudar?"), last_message_at: ha7min, unread: 2 },
    contact_phone: "+5511999990000", contact_email: "maria@exemplo.com",
    tarefas: { abertas: 7, atrasadas: 0 },
    created_at: ha5h, updated_at: ha5h, created_by_user_id: null,
    filtros_escale: {
      atividades_concluidas: 5, contato_nome: t("Maria Silva"), contato_tem_foto: false,
      conversa: { status: "open", canal: "whatsapp", atendente_id: dona, ultima_entrada: null, ultima_saida: ha7min },
    },
  };
  const nomes = new Map([[dona, t("Ana Souza")]]);
  return { lead, card: buildCardInput(lead, { stageName: t("Proposta"), ownerNames: nomes, now: agora }), nomes };
}
```

Se o typecheck reclamar de um campo de `DadosDeFiltroDoNegocio` ou de `Lead` que não está acima, acrescente o campo com o valor vazio do tipo. Os dois tipos estão em `lib/escale/filtros/dados-do-quadro.ts` e `lib/types/leads.ts`.

- [ ] **Step 5: A janela**

Create `components/escale/capa/JanelaPersonalizarCards.tsx` com:
- `Dialog` do Radix direto, como a `JanelaDaCasca` da V3: `DialogPrimitive.Root open onOpenChange={(a) => !a && onFechar()}`, `DialogPortal`, `DialogOverlay className="bg-black/55"` e `DialogPrimitive.Content`. O título vai num `DialogTitle` (é o nome acessível da janela);
- o estado `rascunho` (começa em `prefs`), `busca` e `abertos` (começa em `new Set(["contato"])`);
- os grupos montados com as funções puras da Task 3 (`alternarItem`, `alternarCampo`, `alternarCanal`, `ocupados`, `canaisLigados`) e as linhas da tabela acima;
- a prévia com `negocioDeExemplo` dentro de `DragDropContext` e `Droppable isDropDisabled`, num `<div inert>`;
- `useSalvarPrefsDoCard().mutate(rascunho, { onSuccess: () => { toast.success(t("Preferências salvas")); onFechar(); }, onError: (e) => toast.error(textoDoErro(e, t)) })` (`textoDoErro` de `@/components/escale/origens/texto-do-erro`);
- o "Salvar preferência" desligado com `!mudou` (`!prefsIguais(rascunho, prefs)`) ou com `isPending`.

O esqueleto, completo:

```tsx
"use client";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { CardDaCasca } from "@/components/escale/quadro/CardDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useSalvarPrefsDoCard } from "@/hooks/escale/usePrefsDoCard";
import { useT } from "@/hooks/i18n/useT";
import { negocioDeExemplo } from "@/lib/escale/capa/exemplo";
import {
  CAMPOS_MAX, CANAIS_MAX, alternarCampo, alternarCanal, alternarItem, canaisLigados, chaveDoCampo, ocupados, prefsIguais,
  type CampoDaCapa, type CanalDoRodape, type ItemFixo, type PrefsDoCard,
} from "@/lib/escale/capa/tipos";
import {
  Bell, Building2, Calendar, Check, CheckCircle2, ChevronDown, Clock, DollarSign, Mail, MessageCircle, MessageSquare,
  Phone, Search, Tag, Users, X, type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

interface Linha { chave: string; rotulo: string; nome: string; Icone?: LucideIcon; ligado: boolean; bloqueio?: string; aoMudar: () => void }
interface Grupo { id: string; titulo: string; linhas: Linha[] }

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * "PERSONALIZAR CARDS" (fork Escale, Fase 1E; 01-019 e o código `vf` da Clint).
 * À esquerda, a busca e os grupos com interruptores; à direita, o card de
 * verdade com um exemplo. Salvar só liga quando algo mudou. Vale em todas as
 * origens da pessoa.
 */
export function JanelaPersonalizarCards({ prefs, campos, onFechar }: { prefs: PrefsDoCard; campos: readonly CampoDaCapa[]; onFechar: () => void }) {
  const t = useT();
  const salvar = useSalvarPrefsDoCard();
  const [rascunho, setRascunho] = useState(prefs);
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => new Set(["contato"]));
  const cheio = ocupados(rascunho) >= CAMPOS_MAX;
  const canaisCheios = canaisLigados(rascunho) >= CANAIS_MAX;
  const LIMITE = t("Limite de 10 campos atingido");

  const item = (i: ItemFixo, rotulo: string, Icone: LucideIcon, emBreve = false): Linha => ({
    chave: i, rotulo, nome: rotulo, Icone, ligado: rascunho.itens[i],
    bloqueio: emBreve ? t("Em breve") : !rascunho.itens[i] && cheio ? LIMITE : undefined,
    aoMudar: () => setRascunho((p) => alternarItem(p, i)),
  });
  const campo = (c: CampoDaCapa): Linha => {
    const ligado = rascunho.campos.some((x) => chaveDoCampo(x) === chaveDoCampo(c));
    const rotulo = c.deInterface ? t(c.rotulo) : c.rotulo;
    return { chave: chaveDoCampo(c), rotulo, nome: rotulo, ligado, bloqueio: !ligado && cheio ? LIMITE : undefined, aoMudar: () => setRascunho((p) => alternarCampo(p, c)) };
  };
  const canal = (c: CanalDoRodape, rotulo: string, Icone: LucideIcon, emBreve = false): Linha => ({
    chave: `canal:${c}`, rotulo, nome: `${t("Ícones de canal no rodapé")}: ${rotulo}`, Icone, ligado: rascunho.canais[c],
    bloqueio: emBreve ? t("Em breve") : !rascunho.canais[c] && canaisCheios ? t("Limite de 3 ícones no rodapé atingido") : undefined,
    aoMudar: () => setRascunho((p) => alternarCanal(p, c)),
  });

  const grupos: Grupo[] = [
    { id: "contato", titulo: t("Contato"), linhas: [item("ultimaMensagem", t("Prévia da última mensagem"), MessageSquare), ...campos.filter((c) => c.entidade === "contato").map(campo)] },
    { id: "empresa", titulo: t("Empresa"), linhas: [item("empresa", t("Nome da empresa"), Building2, true)] },
    {
      id: "negocio", titulo: t("Negócio"),
      linhas: [
        item("valor", t("Valor do negócio"), DollarSign), item("idade", t("Idade do negócio"), Clock), item("dono", t("Dono do negócio"), Users),
        item("atividades", t("Atividades"), CheckCircle2), item("tags", t("Tags"), Tag), ...campos.filter((c) => c.entidade === "negocio").map(campo),
      ],
    },
    {
      id: "canais", titulo: t("Ícones de canal no rodapé"),
      linhas: [
        canal("telefone", t("Telefone"), Phone), canal("mensagem", t("Mensagem"), MessageCircle), canal("email", t("E-mail"), Mail),
        canal("lembrete", t("Lembrete"), Bell, true), canal("agendamento", t("Agendamento"), Calendar, true),
      ],
    },
  ];
  const termo = semAcento(busca.trim());
  const visiveis = grupos.map((g) => ({ ...g, linhas: termo ? g.linhas.filter((l) => semAcento(l.rotulo).includes(termo)) : g.linhas })).filter((g) => g.linhas.length > 0);
  const exemplo = useMemo(() => negocioDeExemplo(t, campos), [t, campos]);
  const mudou = !prefsIguais(rascunho, prefs);

  return (
    <DialogPrimitive.Root open onOpenChange={(aberta) => !aberta && onFechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/55" />
        <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-50 flex max-h-[min(700px,calc(100dvh-4rem))] w-[min(820px,calc(100vw-2rem))] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-[12px] bg-surface text-casca-texto shadow-casca-painel">
          <div className="flex items-center justify-between border-b border-[#E4E4E9] px-5 py-3">
            <DialogTitle className="text-sm font-medium text-[#232229]">{t("Personalizar cards")}</DialogTitle>
            <DialogPrimitive.Close aria-label={t("Fechar")} className="grid size-6 place-items-center rounded-casca-gatilho text-[#86858F] hover:text-casca-texto">
              <X size={16} aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[400px_1fr]">
            <div className="min-h-0 overflow-y-auto px-5 py-3">
              <label className="flex h-8 items-center gap-2 rounded-[6px] bg-[#EFEFF2] px-2.5">
                <Search size={13} aria-hidden className="text-[#5A5964]" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder={t("Buscar por...")}
                  aria-label={t("Buscar por...")}
                  className="min-w-0 flex-1 bg-transparent text-xs outline-hidden placeholder:text-[#86858F]"
                />
              </label>
              {visiveis.length === 0 ? <p className="px-2 py-3 text-xs text-[#5A5964]">{t("Nenhum campo encontrado.")}</p> : null}
              {visiveis.map((g) => {
                const aberto = termo !== "" || abertos.has(g.id);
                const ativos = g.linhas.filter((l) => l.ligado).length;
                return (
                  <section key={g.id} className="mt-2">
                    <button
                      type="button"
                      aria-expanded={aberto}
                      onClick={() => setAbertos((a) => { const p = new Set(a); if (p.has(g.id)) p.delete(g.id); else p.add(g.id); return p; })}
                      className="flex w-full items-center gap-1.5 px-2 py-2 text-[10px] font-medium tracking-[0.07em] text-[#5A5964] uppercase"
                    >
                      <ChevronDown size={14} aria-hidden className={cn("transition-transform", !aberto && "-rotate-90")} />
                      <span className="flex-1 text-left">{g.titulo}</span>
                      {ativos > 0 ? <span className="grid size-4 place-items-center rounded-full bg-casca-marca-suave text-[10px] font-medium text-casca-marca">{ativos}</span> : null}
                    </button>
                    {aberto ? g.linhas.map((l) => <LinhaDoGrupo key={l.chave} linha={l} />) : null}
                  </section>
                );
              })}
            </div>
            <div className="flex min-h-0 flex-col px-6 py-4">
              <p className="text-[9px] font-medium tracking-[0.12em] text-casca-marca uppercase">{t("Pré-visualização")}</p>
              <div inert className="pointer-events-none flex flex-1 items-center justify-center">
                <div className="w-full max-w-80 rounded-[6px] border border-[#E1E1E6]">
                  <DragDropContext onDragEnd={() => {}}>
                    <Droppable droppableId="previa-do-card" isDropDisabled>
                      {(p) => (
                        <div ref={p.innerRef} {...p.droppableProps}>
                          <CardDaCasca card={exemplo.card} lead={exemplo.lead} index={0} pipelineId="" nomes={exemplo.nomes} prefs={rascunho} camposDoCard={campos} />
                          {p.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </div>
              <p className="text-center text-[11px] text-[#5A5964]">{t("Este é um exemplo. Suas alterações aparecem no kanban depois de salvar.")}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-[#E4E4E9] px-5 py-3">
            <button type="button" onClick={onFechar} className="h-8 rounded-[6px] border border-[#E4E4E9] px-4 text-xs font-medium hover:bg-[#EFEFF2]">
              {t("Cancelar")}
            </button>
            <button
              type="button"
              disabled={!mudou || salvar.isPending}
              onClick={() => salvar.mutate(rascunho, {
                onSuccess: () => { toast.success(t("Preferências salvas")); onFechar(); },
                onError: (e) => { toast.error(textoDoErro(e, t)); },
              })}
              className="flex h-8 items-center gap-1.5 rounded-[6px] bg-casca-marca px-4 text-xs font-medium text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={13} aria-hidden />
              {t("Salvar preferência")}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

function LinhaDoGrupo({ linha }: { linha: Linha }): ReactNode {
  const { Icone } = linha;
  return (
    <div title={linha.bloqueio} className="flex items-center gap-2 rounded-[6px] px-3.5 py-1.5 text-xs hover:bg-[#EFEFF2]">
      {Icone ? <Icone size={16} aria-hidden className={linha.ligado ? "text-casca-marca" : "text-[#5A5964]"} /> : null}
      <span className="min-w-0 flex-1 truncate">{linha.rotulo}</span>
      <InterruptorDaCasca ligado={linha.ligado} aoMudar={linha.aoMudar} aria-label={linha.nome} desabilitado={Boolean(linha.bloqueio)} title={linha.bloqueio} />
    </div>
  );
}
```

O `inert` é tipado pelo `@types/react` 19.3 do repositório. Não troque por `aria-hidden`: o card de dentro é focável. Os hex de cinza (`#5A5964`, `#E4E4E9`, `#EFEFF2`, `#86858F`, `#232229`, `#E1E1E6`) são os medidos em 01-019. Se a cerca `tailwind-tokens` recusar algum, crie o token da casca do jeito que ela aceita (contrato, "Tokens").

A dica de limite é o balão lavanda da Clint (`v2-13`), não o `title` do navegador. Em `LinhaDoGrupo`, envolva o `InterruptorDaCasca` num `Tooltip` do original (`TooltipContent className="bg-casca-marca-suave text-[11px] text-casca-marca"`, `side="top"`) quando houver `bloqueio`. O `title` fica no interruptor, porque a cerca `controle-decorativo` exige dica em botão desligado.

- [ ] **Step 6: O ícone de ajustes na linha de contagem abre a janela**

Create `components/escale/capa/PersonalizarCards.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePrefsDoCard } from "@/hooks/escale/usePrefsDoCard";
import { useT } from "@/hooks/i18n/useT";
import { PREFS_PADRAO, camposDaCapa, diferemDoPadrao, type CampoDaCapa } from "@/lib/escale/capa/tipos";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import { SlidersHorizontal } from "@/lib/ui/icons-da-casca";

import { JanelaPersonalizarCards } from "./JanelaPersonalizarCards";

/**
 * O ÍCONE "PERSONALIZAR CARDS" DA LINHA DE CONTAGEM (fork Escale, Fase 1E; Clint
 * v2, prints `33a` e `v2-01`): ajustes de 17px logo depois do atualizar, dica em
 * balão lavanda embaixo e o ponto da marca quando a pessoa já personalizou.
 */
export function PersonalizarCards({ campos }: { campos: readonly CampoFiltravel[] }) {
  const t = useT();
  const [aberta, setAberta] = useState(false);
  const { data: prefs } = usePrefsDoCard();
  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <BotaoDaCasca type="button" variante="icone" aria-label={t("Personalizar cards")} onClick={() => setAberta(true)}>
              <span className="relative">
                <SlidersHorizontal size={17} aria-hidden />
                {prefs && diferemDoPadrao(prefs) ? (
                  <span aria-hidden data-testid="ponto-da-capa" className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-casca-marca ring-2 ring-surface" />
                ) : null}
              </span>
            </BotaoDaCasca>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="rounded-[4px] bg-casca-marca-suave text-[11px] text-casca-marca">
            {t("Personalizar cards")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {aberta && <AbrirJanela campos={campos} onFechar={() => setAberta(false)} />}
    </>
  );
}

/** A janela só monta com a preferência carregada: senão o rascunho nasceria do padrão e gravaria por cima. */
function AbrirJanela({ campos, onFechar }: { campos: readonly CampoFiltravel[]; onFechar: () => void }) {
  const { data: prefs, isSuccess } = usePrefsDoCard();
  const camposDoCard = useMemo<CampoDaCapa[]>(
    () =>
      camposDaCapa([]).concat(
        campos
          .filter((c) => c.alvo === "negocio")
          .map((c) => ({ entidade: "negocio" as const, chave: c.chave, rotulo: c.rotulo, deInterface: false, ...(c.opcoes ? { opcoes: c.opcoes } : {}) })),
      ),
    [campos],
  );
  if (!isSuccess) return null;
  return <JanelaPersonalizarCards prefs={prefs ?? PREFS_PADRAO} campos={camposDoCard} onFechar={onFechar} />;
}
```

`camposDaCapa([])` devolve só os do contato. Os do negócio saem dos `campos` filtráveis que a barra já tem, que na Visualização são a união das origens.

Em `components/escale/filtros/LinhaDeContagem.tsx`:
- acrescente às props `personalizar?: ReactNode;` (comentário: "Fase 1E: o ícone 'Personalizar cards' (Clint v2), logo depois do atualizar");
- logo depois do `</BotaoDaCasca>` do atualizar, acrescente `{personalizar}`.

Em `components/escale/filtros/BarraDoQuadro.tsx`:
- importe `PersonalizarCards` de `@/components/escale/capa/PersonalizarCards`;
- no `<LinhaDeContagem …>`, acrescente `personalizar={<PersonalizarCards campos={campos} />}`.

A linha "Personalizar cards" desligada da engrenagem sai na Task 7B, junto com o resto do menu dela.

- [ ] **Step 7: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-janela-personalizar-cards.test.tsx tests/unit/escale-barra-do-quadro.test.tsx tests/unit/escale-ui-interruptor.test.tsx
```
Depois: typecheck, eslint e prettier.

- [ ] **Step 8: Commit**

```bash
git add hooks/escale/usePrefsDoCard.ts lib/escale/capa/exemplo.ts components/escale/capa/JanelaPersonalizarCards.tsx components/escale/capa/PersonalizarCards.tsx components/escale/filtros/LinhaDeContagem.tsx components/escale/filtros/BarraDoQuadro.tsx tests/unit/escale-janela-personalizar-cards.test.tsx tests/unit/escale-barra-do-quadro.test.tsx
git commit -m "feat(escale): janela Personalizar cards igual à da Clint, aberta pelo ícone de ajustes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7B: A engrenagem fica para a 1F, e "Ordenar" vira botão (E15)

**Files:**
- Create: `components/escale/filtros/BotaoOrdenar.tsx`, `tests/unit/escale-linha-de-contagem-1e.test.tsx`
- Modify: `components/escale/filtros/BarraDoQuadro.tsx`, `components/escale/filtros/GatilhosDoQuadro.tsx` (`GatilhoMaisFiltros` ganha `rodape?`), `components/escale/filtros/LinhaDeContagem.tsx`, `tests/unit/escale-barra-do-quadro.test.tsx`
- Delete: `components/escale/filtros/MenuDaEngrenagem.tsx` (é do fork, V4)

**Visual:**
- **Engrenagem** (`15`): o mesmo ícone da V4, no mesmo lugar, **desligado**, com `aria-label` "Configurações da origem" e `title` "Em breve". A Fase 1F liga a janela de configuração da origem;
- **"↑↓ Ordenar"** (`v2-01`, `v2-19`): botão de 32px na linha de contagem, logo antes do atualizar. Tem borda 1px `casca-borda`, raio 6, `px-3`, 13px/500 `casca-texto` e o ícone `ArrowUpDown` de 14px na cor da marca. O painel abre embaixo, alinhado à direita (`PainelSuspenso align="end"`, `p-4`, 520px). Por dentro é a ordenação da 1D, que segue com **um** critério. Os vários critérios com "+ Adicionar critério" da v2 são melhoria da 1D, fora desta fase;
- **"Filtros salvos" e "Limpar filtros"**: vão para o rodapé do painel "Mais filtros", separados por uma divisória `casca-borda`, com a mesma linha de menu de hoje (`CLASSE_DA_LINHA_DO_MENU`). A v2 não mostra filtros salvos no quadro (`v2-17`, `v2-18`). Onde a v1 os mostra é o **PRINT 41**: quando chegar, a conferência visual (Task 16) move para lá.

A ordem final dos ícones da linha de contagem: Ordenar · Atualizar · Personalizar cards (Task 7) · Exportar (Task 13) · Engrenagem · Ajuda.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-linha-de-contagem-1e.test.tsx`. O topo é o de `tests/unit/escale-barra-do-quadro.test.tsx`: os mocks, o polyfill do Radix e o `render` da `BarraDoQuadro` com os filtros da 1D. Mais o mock do `usePrefsDoCard` da Task 7. Os casos:
1. A engrenagem (`button` "Configurações da origem") está desligada, com `title` "Em breve".
2. O botão "Ordenar" abre o painel com a ordenação da 1D. Escolher um critério e aplicar chama `onMudar` com `ordem` preenchida, o mesmo que a 1D fazia pelo menu.
3. Abrir "Mais filtros" mostra "Filtros salvos" e "Limpar filtros" no rodapé. "Limpar filtros" fica desligado sem critério e, com critério, chama `onMudar` com os critérios limpos e o filtro salvo `null`.
4. A ordem dos botões da linha: `getAllByRole("button")` dentro de `getByTestId("contagem-do-quadro").parentElement!.parentElement!` traz "Ordenar", "Atualizar" e "Personalizar cards" nessa ordem.

Em `tests/unit/escale-barra-do-quadro.test.tsx`, apague os casos que abrem o menu da engrenagem ("Configurações do quadro" → Ordenar / Filtros salvos / Limpar). Os casos novos acima cobrem o que eles cobriam.

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-linha-de-contagem-1e.test.tsx tests/unit/escale-barra-do-quadro.test.tsx
```

- [ ] **Step 3: O botão Ordenar**

Create `components/escale/filtros/BotaoOrdenar.tsx`. Ele é um `Popover` com o gatilho do visual acima (`aria-label` e texto "Ordenar") e o `PainelSuspenso`. Dentro do painel vai o corpo da ordenação da 1D:
- se `OrdenarCards` já é o corpo (props `ordem`, `campos`, `onAplicar`), use-o direto e feche o painel no `onAplicar`;
- se ele é uma linha de menu com sub-painel, extraia o corpo para `PainelDeOrdem` no mesmo arquivo `OrdenarCards.tsx` e use-o aqui. O teste da 1D (`escale-filtros-ordenar.test.ts`) é da regra e não muda.

- [ ] **Step 4: Os filtros salvos no "Mais filtros"**

Em `GatilhosDoQuadro.tsx`, `GatilhoMaisFiltros` ganha `rodape?: ReactNode`, desenhado depois do último `Bloco`, depois de `<div className="my-1 h-px bg-casca-borda" aria-hidden />`.

Em `BarraDoQuadro.tsx`, passe `rodape` com o `MenuDeFiltrosSalvos` e o botão "Limpar filtros", **movidos do `MenuDaEngrenagem` sem mudar nada**: as mesmas props e o mesmo `onTrocarTudo(limparCriterios(filtros), null)`.

- [ ] **Step 5: A linha de contagem e a engrenagem**

Em `LinhaDeContagem.tsx`:
- a prop `engrenagem: ReactNode` sai;
- entra `ordenar?: ReactNode`, desenhado antes do atualizar;
- a engrenagem passa a ser desenhada aqui:

```tsx
        {/* Fase 1E (E15): a engrenagem abre a configuração da origem na Clint (print 15). Liga na 1F. */}
        <BotaoDaCasca
          type="button"
          variante="icone"
          disabled
          aria-label={t("Configurações da origem")}
          title={t("Em breve")}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Settings size={16} aria-hidden />
        </BotaoDaCasca>
```

Em `BarraDoQuadro.tsx`, tire o `engrenagem={<MenuDaEngrenagem …/>}` e passe `ordenar={<BotaoOrdenar ordem={filtros.ordem} campos={campos} onAplicar={(ordem) => mudar({ ...filtros, ordem })} />}`. Apague `MenuDaEngrenagem.tsx`. `grep -rn MenuDaEngrenagem components tests` tem de voltar vazio.

- [ ] **Step 6: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-linha-de-contagem-1e.test.tsx tests/unit/escale-barra-do-quadro.test.tsx tests/unit/escale-gatilhos-do-quadro.test.tsx tests/unit/escale-filtros-salvos-menu.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx tests/unit/controle-decorativo.test.ts
```
Depois: typecheck, eslint e prettier nos arquivos do fork.

- [ ] **Step 7: Commit**

```bash
git add components/escale/filtros/BotaoOrdenar.tsx components/escale/filtros/BarraDoQuadro.tsx components/escale/filtros/GatilhosDoQuadro.tsx components/escale/filtros/LinhaDeContagem.tsx components/escale/filtros/OrdenarCards.tsx tests/unit/escale-linha-de-contagem-1e.test.tsx tests/unit/escale-barra-do-quadro.test.tsx
git rm components/escale/filtros/MenuDaEngrenagem.tsx
git commit -m "feat(escale): Ordenar vira botão e a engrenagem fica para a 1F, como na Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: As colunas da casca passam a preferência ao card

**Files:**
- Modify: `components/kanban/KanbanBoard.tsx` (ramo da casca), `components/escale/quadro/ColunaDoFunilNaCasca.tsx`, `components/escale/visualizacoes/ColunaDaVisualizacao.tsx`, `components/escale/visualizacoes/QuadroCombinado.tsx`, `tests/unit/escale-coluna-da-casca.test.tsx`, `tests/unit/escale-quadro-combinado.test.tsx`
- Create: `tests/unit/escale-colunas-com-prefs.test.tsx`

**Interfaces:**
- `ColunaDoFunilNaCascaProps` ganha `camposDoCard?: readonly CampoDaCapa[]` e `nomeDaOrigem?: string` (este é usado na Task 14);
- `ContextoDosCards` (Visualização) ganha `camposDoCard: readonly CampoDaCapa[]`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-colunas-com-prefs.test.tsx`:
- mocke `@/hooks/escale/usePrefsDoCard` devolvendo `{ data: { ...PREFS_PADRAO, itens: { ...PREFS_PADRAO.itens, valor: false } } }`;
- mocke `@/hooks/auth/AuthProvider` (`useActiveOrg: () => ({ orgId: "org-1", role: "agent" })`, `useUser: () => ({ id: "u-1" })`);
- mocke `@hello-pangea/dnd` (Droppable/Draggable, como em `escale-coluna-da-casca`);
- mocke o `CardDaCasca` para escrever `prefs.itens.valor` e o número de `camposDoCard`.

Depois renderize um `ColunaDoFunilNaCasca` com dois leads e `camposDoCard={camposDaCapa([])}`, e confira o texto `valor false · campos 2` nos dois cards. Faça o mesmo com um `ColunaDaVisualizacao` (contexto com `camposDoCard`).

Em `tests/unit/escale-coluna-da-casca.test.tsx` e `tests/unit/escale-quadro-combinado.test.tsx`, acrescente o mesmo `vi.mock("@/hooks/escale/usePrefsDoCard", () => ({ usePrefsDoCard: () => ({ data: null }) }));` e o mock de `@/hooks/auth/AuthProvider` acima. Sem eles, as colunas pediriam um `QueryClient`.

- [ ] **Step 2: Implementar**

Em `components/escale/quadro/ColunaDoFunilNaCasca.tsx`:
- importe `usePrefsDoCard` e `type CampoDaCapa`, `PREFS_PADRAO`;
- acrescente às props `camposDoCard?: readonly CampoDaCapa[];` e `nomeDaOrigem?: string;`;
- no corpo, `const prefs = usePrefsDoCard().data ?? PREFS_PADRAO;`;
- no `<CardDaCasca …/>` do `renderCard`, acrescente `prefs={prefs}` e `camposDoCard={camposDoCard}`.

Em `components/kanban/KanbanBoard.tsx`:
- troque a linha do import `import { ColunaDoFunilNaCasca } from "@/components/escale/quadro/ColunaDoFunilNaCasca";` por ela mesma, mais, na linha de baixo, `import { camposDaCapa } from "@/lib/escale/capa/tipos";`;
- logo depois do `useMemo` de `canonicalTags`, acrescente:

```tsx
  // FORK ESCALE · Fase 1E: os campos que o "Personalizar cards" pode pôr no card da casca.
  const camposDoCard = useMemo(
    () => camposDaCapa([(pipelineProp ?? queryResult.data?.pipeline)?.settings ?? null]),
    [pipelineProp, queryResult.data?.pipeline],
  );
```

- no `<ColunaDoFunilNaCasca …/>`, troque `aoAdicionar={aoAdicionarNegocio}` por:

```tsx
              aoAdicionar={aoAdicionarNegocio}
              camposDoCard={camposDoCard}
              nomeDaOrigem={data.pipeline.name}
```

Em `components/escale/visualizacoes/QuadroCombinado.tsx`, no `useMemo` do `contexto`, acrescente `camposDoCard: camposDaCapa(quadros.map((q) => q.pipeline.settings)),`. Em `ColunaDaVisualizacao.tsx`:
- acrescente `camposDoCard: readonly CampoDaCapa[];` ao `ContextoDosCards`;
- leia `const prefs = usePrefsDoCard().data ?? PREFS_PADRAO;`;
- passe `prefs={prefs}` e `camposDoCard={contexto.camposDoCard}` ao `CardDaCasca`.

- [ ] **Step 3: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-colunas-com-prefs.test.tsx tests/unit/escale-coluna-da-casca.test.tsx tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-na-casca.test.tsx tests/unit/escale-quadro-ordenado.test.tsx
```
Depois: typecheck e eslint. Não rode o prettier no `KanbanBoard.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/kanban/KanbanBoard.tsx components/escale/quadro/ColunaDoFunilNaCasca.tsx components/escale/visualizacoes/ColunaDaVisualizacao.tsx components/escale/visualizacoes/QuadroCombinado.tsx tests/unit/escale-colunas-com-prefs.test.tsx tests/unit/escale-coluna-da-casca.test.tsx tests/unit/escale-quadro-combinado.test.tsx
git commit -m "feat(escale): o funil e a Visualização da casca usam o Personalizar cards da pessoa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: O ⋮ da coluna igual ao da Clint

**Files:**
- Create: `lib/escale/quadro/selecao.ts`, `components/escale/quadro/MenuDaColuna.tsx`, `tests/unit/escale-selecao-da-etapa.test.ts`, `tests/unit/escale-menu-da-coluna.test.tsx`
- Modify: `components/escale/quadro/ColunaDaCasca.tsx`, `components/escale/quadro/ColunaDoFunilNaCasca.tsx`, `components/kanban/KanbanBoard.tsx`, `app/app/pipelines/[id]/_client.tsx`, `tests/unit/escale-coluna-da-casca.test.tsx`, `tests/unit/escale-quadro-combinado.test.tsx`

**Visual** (prints `18a` a `18f` e `v2-04` em `docs/clint/prints-1e/`; v1 e v2 iguais; medidas do CSS da Clint):
- o gatilho é o ⋮ de 18px da V4, no mesmo lugar;
- **o menu da Clint** (o mesmo do "Negócio +", Task 11): caixa branca de 200px, raio 4, padding 4, **sem borda**, sombra `0 8px 16px rgb(17 24 39/0.1), 0 0 1px rgb(17 24 39/0.3)`. Abre embaixo do ⋮, alinhado à direita (`align="end"`, `sideOffset={4}`);
- primeira linha: "Selecionar todos...", 36px de altura, 11px/500 `casca-texto`, padding 10px 12px, raio 2. **Hover**: fundo `#EFF6FF` e texto `#4F46E5` (`18d`);
- segunda linha, sem hover: "Selecione" (11px/500), o **campo numérico com setinhas** de 65×23 (fundo `#F8FAFF`, borda 0,8px `#E8E4F5`, raio 5, 11,9px/300, padding 3, começa em **0**) e o (?) de 17px na cor da marca (`HelpCircle`). A dica escura à direita diz "Escolha quantos negócios você quer selecionar" (`18c`);
- mudar o número (digitando ou pelas setinhas) seleciona na hora os N primeiros da coluna, na ordem da tela, e a barra de lote aparece (`18e`). Número maior que a coluna vira a coluna toda; 0 ou vazio desmarca a coluna.

O menu e a linha ficam numa constante compartilhada com o "Negócio +": `components/escale/quadro/estilos-do-menu.ts`, com `CAIXA_DO_MENU` e `ITEM_DO_MENU` (criado nesta task):

```ts
/** O menu suspenso da Clint (⋮ da etapa e "Negócio +", prints 18b e 19b): sem borda, sombra do Chakra `lg`. */
export const CAIXA_DO_MENU =
  "z-50 min-w-[152px] rounded-[4px] bg-surface p-1 text-casca-texto shadow-[0_8px_16px_rgb(17_24_39/0.1),0_0_1px_rgb(17_24_39/0.3)] outline-hidden";

/** O item do menu: 36px, 11px/500, hover #EFF6FF com texto #4F46E5 (o mesmo da Clint, que não é a cor da marca). */
export const ITEM_DO_MENU =
  "flex h-9 w-full items-center gap-2 rounded-[2px] px-3 text-left text-[11px] font-medium text-casca-texto outline-hidden hover:bg-[#EFF6FF] hover:text-[#4F46E5] focus-visible:bg-[#EFF6FF] focus-visible:text-[#4F46E5] data-[highlighted]:bg-[#EFF6FF] data-[highlighted]:text-[#4F46E5] disabled:cursor-default disabled:text-casca-meta";
```

Se a cerca `tailwind-tokens` recusar os hex, crie os tokens da casca (`casca-menu-hover` e `casca-menu-hover-texto`) do jeito que ela aceita.

**Interfaces:**
- `selecaoDaEtapa(idsDaEtapa: readonly string[], selecionados: ReadonlySet<string>, n: number): Set<string>`. Tira desta etapa o que estava marcado, marca os `n` primeiros e não mexe nas outras etapas;
- `MenuDaColuna({ nome, total, aoSelecionar })`;
- `ColunaDaCascaProps` perde nada e ganha `menuDaEtapa?: { aoSelecionar: (n: number) => void }`. Sem ele, não há ⋮ (Visualização, viewer);
- `ColunaDoFunilNaCascaProps` ganha `aoSelecionarNaEtapa?: (ids: string[], n: number) => void`;
- `KanbanBoardProps` ganha `podeSelecionarNaEtapa?: boolean` (o mesmo jeito do `podeRenomearEtapa`).

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-selecao-da-etapa.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { selecaoDaEtapa } from "@/lib/escale/quadro/selecao";

const ETAPA = ["a", "b", "c", "d"];

describe("selecaoDaEtapa (o 'Selecione N' da Clint)", () => {
  it("marca os N primeiros na ordem da tela e não mexe nas outras etapas", () => {
    expect([...selecaoDaEtapa(ETAPA, new Set(["x"]), 2)].sort()).toEqual(["a", "b", "x"]);
  });

  it("um N novo troca a seleção da etapa, não soma", () => {
    expect([...selecaoDaEtapa(ETAPA, new Set(["a", "b", "c"]), 1)]).toEqual(["a"]);
  });

  it("N maior que a etapa marca a etapa toda; 0 ou negativo desmarca a etapa", () => {
    expect(selecaoDaEtapa(ETAPA, new Set(), 99).size).toBe(4);
    expect([...selecaoDaEtapa(ETAPA, new Set(["a", "x"]), 0)]).toEqual(["x"]);
    expect([...selecaoDaEtapa(ETAPA, new Set(["a"]), -3)]).toEqual([]);
  });
});
```

Create `tests/unit/escale-menu-da-coluna.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { MenuDaColuna } from "@/components/escale/quadro/MenuDaColuna";

function menu() {
  const aoSelecionar = vi.fn();
  render(<MenuDaColuna nome="Entrada" total={7} aoSelecionar={aoSelecionar} />);
  return { aoSelecionar, user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

describe("<MenuDaColuna> (⋮ da etapa da Clint)", () => {
  it("'Selecionar todos...' marca a etapa toda e fecha", async () => {
    const { aoSelecionar, user } = menu();
    await user.click(screen.getByRole("button", { name: "Ações da etapa Entrada" }));
    await user.click(screen.getByRole("button", { name: "Selecionar todos..." }));
    expect(aoSelecionar).toHaveBeenCalledWith(7);
    expect(screen.queryByRole("button", { name: "Selecionar todos..." })).toBeNull();
  });

  it("o campo numérico começa em 0; mudar o número seleciona na hora; vazio desmarca", async () => {
    const { aoSelecionar, user } = menu();
    await user.click(screen.getByRole("button", { name: "Ações da etapa Entrada" }));
    const campo = screen.getByRole("spinbutton", { name: "Selecione" });
    expect(campo).toHaveValue(0);
    fireEvent.change(campo, { target: { value: "3" } });
    expect(campo).toHaveValue(3);
    expect(aoSelecionar).toHaveBeenLastCalledWith(3);
    fireEvent.change(campo, { target: { value: "" } });
    expect(aoSelecionar).toHaveBeenLastCalledWith(0);
    expect(screen.getByLabelText("Escolha quantos negócios você quer selecionar")).toBeInTheDocument();
  });
});
```

Em `tests/unit/escale-coluna-da-casca.test.tsx`:
- troque os casos que abrem o `menuitem "Selecionar todos"` / `"Desmarcar todos"` por um caso que renderiza a coluna **com** `menuDaEtapa={{ aoSelecionar }}`, clica em "Ações da etapa Entrada" e em "Selecionar todos..." e confere `aoSelecionar` chamado com o número de cards;
- acrescente um caso **sem** `menuDaEtapa`: `queryByRole("button", { name: /Ações da etapa/ })` é `null`.

Em `tests/unit/escale-quadro-combinado.test.tsx`, troque o caso "Ações da etapa Entrada → Selecionar todos" por: `expect(screen.queryByRole("button", { name: /Ações da etapa/ })).toBeNull()` (E7: sem ⋮ na Visualização). A seleção da Visualização continua pelo card (clique com Ctrl e Shift), como na V4.

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-selecao-da-etapa.test.ts tests/unit/escale-menu-da-coluna.test.tsx tests/unit/escale-coluna-da-casca.test.tsx tests/unit/escale-quadro-combinado.test.tsx
```

- [ ] **Step 3: A regra**

Create `lib/escale/quadro/selecao.ts`:

```ts
/**
 * O "SELECIONE N" DO ⋮ DA ETAPA (fork Escale, Fase 1E; Clint superior,
 * `input-stage-deal-qty`): os N primeiros da etapa, na ordem da tela, no lugar
 * do que estava marcado NESTA etapa. As outras etapas não mudam. Numa conta só,
 * para o pai receber um conjunto pronto (o `onSelectionChange` não acumula).
 */
export function selecaoDaEtapa(idsDaEtapa: readonly string[], selecionados: ReadonlySet<string>, n: number): Set<string> {
  const daEtapa = new Set(idsDaEtapa);
  const proximo = new Set([...selecionados].filter((id) => !daEtapa.has(id)));
  for (const id of idsDaEtapa.slice(0, Math.max(0, Math.floor(n)))) proximo.add(id);
  return proximo;
}
```

- [ ] **Step 4: O menu**

Create `components/escale/quadro/MenuDaColuna.tsx`:

```tsx
"use client";
import { useState } from "react";

import * as PopoverPrimitive from "@radix-ui/react-popover";

import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import { EllipsisVertical, HelpCircle } from "@/lib/ui/icons-da-casca";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "./estilos-do-menu";

/**
 * O ⋮ DA ETAPA (fork Escale, Fase 1E; Clint superior: `bt-select-all-stage-deals`
 * e `input-stage-deal-qty`). "Selecionar todos..." marca a etapa toda; "Selecione
 * [N]" marca os N primeiros a cada tecla. Sem "Desmarcar todos": a Clint não tem,
 * e o "Limpar" da barra de lote desfaz.
 */
export function MenuDaColuna({ nome, total, aoSelecionar }: { nome: string; total: number; aoSelecionar: (n: number) => void }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [quantos, setQuantos] = useState("0");
  const dica = t("Escolha quantos negócios você quer selecionar");

  return (
    <Popover open={aberto} onOpenChange={(a) => { setAberto(a); if (!a) setQuantos("0"); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t("Ações da etapa")} ${nome}`}
          className="grid h-7 w-5 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-surface"
        >
          <EllipsisVertical size={18} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content align="end" sideOffset={4} className={`${CAIXA_DO_MENU} w-[200px]`}>
        <button
          type="button"
          disabled={total === 0}
          title={total === 0 ? t("Nenhum negócio nesta etapa") : undefined}
          onClick={() => {
            aoSelecionar(total);
            setAberto(false);
          }}
          className={ITEM_DO_MENU}
        >
          {t("Selecionar todos...")}
        </button>
        <div className="flex h-9 items-center gap-1 px-3 text-[11px] font-medium text-casca-texto">
          <label htmlFor={`selecione-${nome}`}>{t("Selecione")}</label>
          {/* O campo numérico com setinhas da Clint (print 18b), que começa em 0. */}
          <input
            id={`selecione-${nome}`}
            type="number"
            min={0}
            max={total}
            value={quantos}
            onChange={(e) => {
              const valor = e.target.value.replace(/\D/g, "").slice(0, 4);
              setQuantos(valor);
              aoSelecionar(valor === "" ? 0 : Number(valor));
            }}
            className="ml-1 h-[23px] w-[65px] rounded-[5px] border-[0.8px] border-[#E8E4F5] bg-[#F8FAFF] p-[3px] text-center text-[11.9px] font-light text-casca-texto outline-hidden focus:border-casca-marca"
          />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} aria-label={dica} className="ml-2 text-casca-marca">
                  <HelpCircle size={17} aria-hidden />
                </span>
              </TooltipTrigger>
              <TooltipContent>{dica}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </Popover>
  );
}
```

A caixa é montada no primitivo do Radix pelo mesmo motivo do `PainelSuspenso`: ela não tem a borda do painel da casca (print `18b`).

- [ ] **Step 5: A coluna e o quadro**

Em `components/escale/quadro/ColunaDaCasca.tsx`:
- tire o import do `DropdownMenu…` e do `EllipsisVertical`; importe `MenuDaColuna` de `./MenuDaColuna`;
- acrescente às props, depois de `aoAdicionar?`:

```tsx
  /** Fase 1E: o ⋮ da Clint ("Selecionar todos..." e "Selecione N"). Ausente = sem ⋮ (Visualização, viewer). */
  menuDaEtapa?: { aoSelecionar: (n: number) => void };
```

- apague `todos` e `alternarTodos` (não há mais "Desmarcar todos");
- troque o bloco `<DropdownMenu modal={false}> … </DropdownMenu>` inteiro por:

```tsx
        {menuDaEtapa ? (
          <MenuDaColuna
            nome={nome}
            total={leads.length}
            aoSelecionar={(n) => {
              ancora.current = null;
              menuDaEtapa.aoSelecionar(n);
            }}
          />
        ) : null}
```

- no comentário do componente, troque "⋮ com o "Selecionar todos" do original (PRINT 18: o resto do ⋮ é da 1E)" por "⋮ da Clint quando há `menuDaEtapa` (Fase 1E)".

Em `components/escale/quadro/ColunaDoFunilNaCasca.tsx`:
- acrescente às props `aoSelecionarNaEtapa?: (ids: string[], n: number) => void;` e desestruture;
- no `<ColunaDaCasca …>`, acrescente:

```tsx
      menuDaEtapa={
        aoSelecionarNaEtapa ? { aoSelecionar: (n) => aoSelecionarNaEtapa(leads.map((l) => l.id), n) } : undefined
      }
```

Em `components/kanban/KanbanBoard.tsx`:
- em `KanbanBoardProps`, depois de `aoAdicionarNegocio?`, acrescente:

```tsx
  /**
   * FORK ESCALE · Fase 1E: o ⋮ da etapa na casca ("Selecionar todos..." e
   * "Selecione N"). Agent ou acima, o mesmo corte das ações em lote.
   */
  podeSelecionarNaEtapa?: boolean;
```

- desestruture `podeSelecionarNaEtapa = false`;
- importe `selecaoDaEtapa` de `@/lib/escale/quadro/selecao` (na linha de baixo do import do `ColunaDoFunilNaCasca`);
- logo depois do `handleSelectMany`, acrescente:

```tsx
  // FORK ESCALE · Fase 1E: "Selecione N" troca a seleção da etapa numa conta só.
  const selecionarNaEtapa = useCallback(
    (ids: string[], n: number) => {
      if (onSelectionChange) onSelectionChange(Array.from(selecaoDaEtapa(ids, selectedLeadIds, n)));
      else setInternalSelected((prev) => selecaoDaEtapa(ids, prev, n));
    },
    [onSelectionChange, selectedLeadIds],
  );
```

- no `<ColunaDoFunilNaCasca …/>`, acrescente `aoSelecionarNaEtapa={podeSelecionarNaEtapa ? selecionarNaEtapa : undefined}`.

Em `app/app/pipelines/[id]/_client.tsx`, no `<KanbanBoard …>`, logo depois de `aoAdicionarNegocio={…}`, acrescente:

```tsx
          // FORK ESCALE · Fase 1E: o ⋮ da etapa (lote pede agent, como a rota).
          podeSelecionarNaEtapa={cascaNova && ROLE_RANK[role] >= ROLE_RANK.agent}
```

- [ ] **Step 6: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-selecao-da-etapa.test.ts tests/unit/escale-menu-da-coluna.test.tsx tests/unit/escale-coluna-da-casca.test.tsx tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-na-casca.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
corepack pnpm lint:role-rank
```
Depois: typecheck, eslint e prettier (só nos arquivos novos).

- [ ] **Step 7: Commit**

```bash
git add lib/escale/quadro/selecao.ts components/escale/quadro/estilos-do-menu.ts components/escale/quadro/MenuDaColuna.tsx components/escale/quadro/ColunaDaCasca.tsx components/escale/quadro/ColunaDoFunilNaCasca.tsx components/kanban/KanbanBoard.tsx "app/app/pipelines/[id]/_client.tsx" tests/unit/escale-selecao-da-etapa.test.ts tests/unit/escale-menu-da-coluna.test.tsx tests/unit/escale-coluna-da-casca.test.tsx tests/unit/escale-quadro-combinado.test.tsx
git commit -m "feat(escale): o ⋮ da etapa igual ao da Clint (Selecionar todos... e Selecione N)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: "+ Adicionar negócio" na etapa da coluna

**Files:**
- Modify: `components/escale/quadro/ColunaDaCasca.tsx`, `components/kanban/NewLeadDialog.tsx`, `app/app/pipelines/[id]/_client.tsx`, `tests/unit/escale-coluna-da-casca.test.tsx`, `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`
- Create: `tests/unit/escale-novo-negocio-na-etapa.test.tsx`

**Visual** (01-010, pé da coluna; código `bt-add-deal-stage`): o texto é "+ Adicionar negócio", com o "+" literal, **alinhado à esquerda**, 13px, `text-casca-texto-2`. Fica logo depois do último card, com o hover branco da V4.

**Interfaces:**
- `NewLeadDialog` ganha `etapaInicial?: string | null`. `undefined` (a lateral, o Inbox) mantém o comportamento de hoje. `null` abre na etapa padrão, e um id abre naquela etapa. Vale a cada abertura;
- a página passa `aoAdicionarNegocio` só para agent ou acima (E8).

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-novo-negocio-na-etapa.test.tsx`, com os mesmos `vi.mock` do topo de `tests/unit/novo-lead-escolhe-contato.test.tsx` (`useCreateLead`, `useContactList`, `AuthProvider`, `sonner`) e o mesmo polyfill do Radix:

```tsx
import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";
import type { Stage } from "@/lib/kanban/types";

const ETAPAS = [
  { id: "e-1", name: "Entrada", is_won: false, is_lost: false, is_archived: false },
  { id: "e-2", name: "Proposta", is_won: false, is_lost: false, is_archived: false },
] as unknown as Stage[];

const dialogo = (open: boolean, etapaInicial?: string | null) => (
  <NewLeadDialog open={open} onOpenChange={() => {}} pipelineId="p-1" stages={ETAPAS} etapaInicial={etapaInicial} />
);

describe("<NewLeadDialog etapaInicial> (Fase 1E)", () => {
  it("abre na etapa da coluna", () => {
    render(dialogo(true, "e-2"));
    expect(screen.getByRole("combobox")).toHaveTextContent("Proposta");
  });

  it("fechar e abrir de novo pelo 'Novo negócio' (null) volta para a etapa padrão", () => {
    const { rerender } = render(dialogo(true, "e-2"));
    rerender(dialogo(false, null));
    rerender(dialogo(true, null));
    expect(screen.getByRole("combobox")).toHaveTextContent("Entrada");
  });

  it("sem a prop (lateral e Inbox), nada muda: abre na primeira etapa aberta", () => {
    render(dialogo(true));
    expect(screen.getByRole("combobox")).toHaveTextContent("Entrada");
  });
});
```

Em `tests/unit/escale-coluna-da-casca.test.tsx`, troque o nome do botão `"Adicionar negócio"` por `"+ Adicionar negócio"` (o nome acessível inclui o "+") e acrescente `expect(botao).toHaveClass("justify-start")`.

Em `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`:
- o mock do `KanbanBoard` passa a escrever também ``<p>{`selecionar: ${String(p.podeSelecionarNaEtapa)}`}</p>`` (acrescente `podeSelecionarNaEtapa?: boolean` ao tipo das props);
- o mock do `NewLeadDialog` passa a ser `({ open, etapaInicial }: { open: boolean; etapaInicial?: string | null }) => (open ? <p>{`novo negócio aberto na etapa ${etapaInicial ?? "padrão"}`}</p> : null)`;
- o mock do `KanbanBoard` ganha um botão que chama `p.aoAdicionarNegocio?.("e-2")` com o texto "adicionar na e-2";
- acrescente um caso que clica em "adicionar na e-2" e espera "novo negócio aberto na etapa e-2", e um caso com `role="viewer"` que espera `adicionar: undefined` e `selecionar: false`. O `abrir` passa a aceitar o papel: `const abrir = (cascaNova: boolean, funis = [...], role: Role = "agent")`.

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-novo-negocio-na-etapa.test.tsx tests/unit/escale-coluna-da-casca.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
```

- [ ] **Step 3: O botão da coluna**

Em `components/escale/quadro/ColunaDaCasca.tsx`, troque o botão do pé:

```tsx
                className="flex w-full shrink-0 items-center justify-center gap-1 rounded-casca-gatilho py-1 text-[13px] text-casca-texto-2 hover:bg-surface"
              >
                <Plus size={14} aria-hidden />
                {t("Adicionar negócio")}
```
por:
```tsx
                className="flex w-full shrink-0 items-center justify-start gap-1 rounded-casca-gatilho px-2 py-1 text-[13px] text-casca-texto-2 hover:bg-surface"
              >
                {/* A Clint superior escreve o "+" no texto, alinhado à esquerda (01-010). */}
                {`+ ${t("Adicionar negócio")}`}
```

e tire o `Plus` do import se ele não for mais usado.

- [ ] **Step 4: A etapa do "Novo negócio"**

Em `components/kanban/NewLeadDialog.tsx`:
- em `interface Props`, depois de `leads?: Lead[];`, acrescente:

```tsx
  /**
   * FORK ESCALE · Fase 1E: a etapa em que o negócio nasce, a cada abertura ("+
   * Adicionar negócio" da coluna da casca). `null` = a etapa padrão. Ausente =
   * o comportamento de sempre (a última etapa escolhida fica).
   */
  etapaInicial?: string | null;
```

- desestruture `etapaInicial` junto das outras props;
- logo depois do `useEffect` de "Reset stage_id default if stages change while dialog mounted.", acrescente:

```tsx
  // FORK ESCALE · Fase 1E: quem abre pela coluna escolhe a etapa; `setValue` do
  // formulário não é estado do React, então o efeito não renderiza em cascata.
  useEffect(() => {
    if (open && etapaInicial !== undefined) form.setValue("stage_id", etapaInicial ?? initialStage);
  }, [open, etapaInicial, initialStage, form]);
```

- [ ] **Step 5: A página**

Em `app/app/pipelines/[id]/_client.tsx`:
- depois de `const [newOpen, setNewOpen] = useState(false);`, acrescente:

```tsx
  // FORK ESCALE · Fase 1E: a etapa do "+ Adicionar negócio" da coluna (casca nova).
  const [etapaDoNovo, setEtapaDoNovo] = useState<string | null>(null);
  const podeCriar = ROLE_RANK[role] >= ROLE_RANK.agent;
```

- no `<NewLeadDialog …>`, troque `onOpenChange={setNewOpen}` por:

```tsx
          onOpenChange={(aberto) => {
            setNewOpen(aberto);
            if (!aberto) setEtapaDoNovo(null);
          }}
          etapaInicial={cascaNova ? etapaDoNovo : undefined}
```

- no `<KanbanBoard …>`, troque `aoAdicionarNegocio={cascaNova ? () => setNewOpen(true) : undefined}` por:

```tsx
          aoAdicionarNegocio={
            cascaNova && podeCriar
              ? (stageId) => {
                  setEtapaDoNovo(stageId);
                  setNewOpen(true);
                }
              : undefined
          }
```

e troque a condição do `podeSelecionarNaEtapa` da Task 9 por `cascaNova && podeCriar`.

- [ ] **Step 6: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-novo-negocio-na-etapa.test.tsx tests/unit/novo-lead-escolhe-contato.test.tsx tests/unit/negocio-aberto-duplicado-na-tela.test.tsx tests/unit/escale-coluna-da-casca.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx "app/app/pipelines/[id]/trocar-funil.test.tsx"
```
Depois: typecheck e eslint. Prettier só no teste novo.

- [ ] **Step 7: Commit**

```bash
git add components/escale/quadro/ColunaDaCasca.tsx components/kanban/NewLeadDialog.tsx "app/app/pipelines/[id]/_client.tsx" tests/unit/escale-novo-negocio-na-etapa.test.tsx tests/unit/escale-coluna-da-casca.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
git commit -m "feat(escale): + Adicionar negócio abre o Novo negócio na etapa da coluna

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: "Negócio +" vira o menu da Clint

**Files:**
- Create: `components/escale/quadro/MenuNegocioMais.tsx`, `tests/unit/escale-menu-negocio-mais.test.tsx`
- Modify: `components/escale/quadro/CabecalhoDaCasca.tsx`, `app/app/pipelines/[id]/_client.tsx`, `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`

**Visual** (prints `19a`, `19b` e `v2-05` em `docs/clint/prints-1e/`; v1 e v2 iguais):
- o botão é o `BotaoNegocioMais` da V4 (95×32 na Clint). Com o menu aberto, o "+" gira 45° e vira "×" (`transition-transform`);
- o menu abre embaixo, alinhado à direita, a 8px do botão. É o **menu da Clint** da Task 9 (`CAIXA_DO_MENU`): 152px, raio 4, padding 4, sem borda, com a sombra curta;
- dois itens de 36px (`ITEM_DO_MENU`, 11px/500, padding 10px 12px): `Briefcase` 14 + "Novo negócio" e `Plus` 14 + "Importar negócios". Hover: fundo `#EFF6FF`, texto e ícone `#4F46E5`;
- viewer: o botão fica desligado, com a dica "Sem permissão" (E9).

**Interfaces:**
- `BotaoNegocioMais` ganha `aberto?: boolean`;
- `MenuNegocioMais({ desabilitado, dica?, aoNovo, aoImportar })`.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-menu-negocio-mais.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { MenuNegocioMais } from "@/components/escale/quadro/MenuNegocioMais";

describe("<MenuNegocioMais> (Negócio + da Clint superior)", () => {
  it("abre o menu com Novo negócio e Importar negócios; o + gira", async () => {
    const aoNovo = vi.fn();
    const aoImportar = vi.fn();
    render(<MenuNegocioMais desabilitado={false} aoNovo={aoNovo} aoImportar={aoImportar} />);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const botao = screen.getByRole("button", { name: /^Negócio/ });
    await user.click(botao);
    expect(botao).toHaveAttribute("data-aberto", "true");
    await user.click(screen.getByRole("menuitem", { name: "Novo negócio" }));
    expect(aoNovo).toHaveBeenCalled();
    await user.click(botao);
    await user.click(screen.getByRole("menuitem", { name: "Importar negócios" }));
    expect(aoImportar).toHaveBeenCalled();
  });

  it("desligado mostra a dica e não abre", () => {
    render(<MenuNegocioMais desabilitado dica="Sem permissão" aoNovo={vi.fn()} aoImportar={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Negócio/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Negócio/ })).toHaveAttribute("title", "Sem permissão");
  });
});
```

Em `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`:
- acrescente `vi.mock("@/components/escale/quadro/JanelaDeImportarNegocios", () => ({ JanelaDeImportarNegocios: ({ aberta }: { aberta: boolean }) => (aberta ? <p>importar aberto</p> : null) }));`. A janela nasce na Task 12: até lá, o `vi.mock` de um módulo que não existe quebra o teste. Por isso este passo e o Step 4 que importa a janela só entram na Task 12. Nesta task, a página passa `aoImportar={() => {}}` com o comentário `// Task 12`;
- troque o caso "com a casca, 'Negócio +' abre o Novo negócio de sempre" por: clicar `button /^Negócio/`, depois `menuitem "Novo negócio"`, e esperar "novo negócio aberto na etapa padrão";
- acrescente: com `role="viewer"`, o `button /^Negócio/` está desligado.

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-menu-negocio-mais.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
```

- [ ] **Step 3: O botão e o menu**

Em `components/escale/quadro/CabecalhoDaCasca.tsx`:
- importe `cn` de `@/lib/utils`;
- troque o `BotaoNegocioMais` por:

```tsx
export const BotaoNegocioMais = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { aberto?: boolean }
>(function BotaoNegocioMais({ aberto = false, ...props }, ref) {
  const t = useT();
  return (
    <BotaoDaCasca ref={ref} type="button" variante="marca" data-aberto={aberto} {...props}>
      {t("Negócio")}
      {/* Fase 1E: com o menu aberto, o "+" gira 45° e vira "×" (Clint superior). */}
      <Plus size={16} aria-hidden className={cn("transition-transform duration-150", aberto && "rotate-45")} />
    </BotaoDaCasca>
  );
});
```

Create `components/escale/quadro/MenuNegocioMais.tsx`:

```tsx
"use client";
import { useState } from "react";

import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { Briefcase, Plus } from "@/lib/ui/icons-da-casca";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";

import { BotaoNegocioMais } from "./CabecalhoDaCasca";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "./estilos-do-menu";

/**
 * "NEGÓCIO +" DA CLINT (fork Escale, Fase 1E; prints 19a/19b e v2-05): o menu
 * com "Novo negócio" e "Importar negócios". Conteúdo e itens montados no
 * primitivo do Radix porque o `DropdownMenuContent` do original fixa borda,
 * raio e o destaque `accent`, que a Clint não usa aqui.
 */
export function MenuNegocioMais({
  desabilitado,
  dica,
  aoNovo,
  aoImportar,
}: {
  desabilitado: boolean;
  dica?: string;
  aoNovo: () => void;
  aoImportar: () => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <DropdownMenu modal={false} open={aberto} onOpenChange={setAberto}>
      <DropdownMenuTrigger asChild disabled={desabilitado}>
        <BotaoNegocioMais aberto={aberto} disabled={desabilitado} title={dica} />
      </DropdownMenuTrigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align="end"
          sideOffset={8}
          className={CAIXA_DO_MENU}
        >
          <MenuPrimitive.Item className={ITEM_DO_MENU} onSelect={aoNovo}>
            <Briefcase size={14} aria-hidden />
            {t("Novo negócio")}
          </MenuPrimitive.Item>
          <MenuPrimitive.Item className={ITEM_DO_MENU} onSelect={aoImportar}>
            <Plus size={14} aria-hidden />
            {t("Importar negócios")}
          </MenuPrimitive.Item>
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </DropdownMenu>
  );
}
```

O `title` no botão desligado atende a cerca `controle-decorativo`; como o `BotaoDaCasca` desligado tem `pointer-events-none`, acrescente `className="disabled:pointer-events-auto disabled:cursor-not-allowed"` para a dica aparecer (o mesmo cuidado do Exportar da V4).

- [ ] **Step 4: A página**

Em `app/app/pipelines/[id]/_client.tsx`:
- troque o import `import { BotaoNegocioMais, CabecalhoDaCasca } from "@/components/escale/quadro/CabecalhoDaCasca";` por `import { CabecalhoDaCasca } from "@/components/escale/quadro/CabecalhoDaCasca";` e, na linha de baixo, `import { MenuNegocioMais } from "@/components/escale/quadro/MenuNegocioMais";`;
- troque `acao={<BotaoNegocioMais onClick={() => setNewOpen(true)} disabled={!data} />}` por:

```tsx
          acao={
            // FORK ESCALE · Fase 1E: "Negócio +" com o menu da Clint (Novo / Importar).
            <MenuNegocioMais
              desabilitado={!data || !podeCriar}
              dica={podeCriar ? undefined : t("Sem permissão")}
              aoNovo={() => {
                setEtapaDoNovo(null);
                setNewOpen(true);
              }}
              aoImportar={() => {}} // Task 12
            />
          }
```

- [ ] **Step 5: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-menu-negocio-mais.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx tests/unit/controle-decorativo.test.ts
```
Depois: typecheck, eslint e prettier no arquivo novo.

- [ ] **Step 6: Commit**

```bash
git add components/escale/quadro/MenuNegocioMais.tsx components/escale/quadro/CabecalhoDaCasca.tsx "app/app/pipelines/[id]/_client.tsx" tests/unit/escale-menu-negocio-mais.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
git commit -m "feat(escale): Negócio + abre o menu da Clint (Novo negócio, Importar negócios)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Importar negócios, com o fluxo da Clint v2 (E10)

**Files:**
- Create: `lib/escale/importar/mapear.ts`, `components/escale/quadro/JanelaDeImportarNegocios.tsx`, `components/escale/quadro/PassosDaImportacao.tsx`, `tests/unit/escale-importar-mapear.test.ts`, `tests/unit/escale-janela-de-importar.test.tsx`
- Modify: `lib/leads/planilha.ts` (uma palavra: `export` na `campoDaColuna`), `app/app/pipelines/[id]/_client.tsx`, `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`

**Visual** (prints `v2-06` a `v2-11` em `docs/clint/prints-1e/`; a v1, `37` a `40`, é só referência de texto). A janela é a da v2, com **4 passos**: o passo "Decisões" sai (E10a).

| Peça | Detalhe |
|---|---|
| Janela | Radix Dialog direto, como a `JanelaPersonalizarCards`. 1040px de largura (`min(1040px, 100vw-2rem)`), 690px de altura (`min(690px, 100dvh-2rem)`), raio 12, fundo branco, cortina `bg-black/48`, sem X (fecha por "Cancelar", Esc ou clique fora) |
| Indicador de passos | faixa de 64px no topo, divisória embaixo `#F1F0F5`, `px-6`. Para cada passo: círculo de 32px (borda 1px `#D9D8E0`, número 13px `casca-texto`); o atual tem borda e anel da marca (`ring-2 ring-casca-marca-suave`) e número na marca; o concluído é cheio da marca com ✓ branco. O rótulo vem a 12px, em 13px `casca-texto`. Entre os passos, um traço de 1px que fica da cor da marca quando o passo anterior está concluído. Rótulos: "Arquivo", "Mapeamento", "Configurações" e "Prévia e confirmação" |
| Rodapé | faixa de 64px, divisória em cima, `px-6`. À esquerda "Cancelar" (passo 1) ou "Voltar" (passos 2 a 4): contorno 1px `#D9D8E0`, 32px, raio 6, 13px. À direita "Continuar ›" (marca, branco, 32px, raio 6, 13px/500, chevron 14); desligado = marca a 45% de opacidade. No passo 4, "⇧ Confirmar e importar" (ícone `Upload` 14) |
| Passo 1, Arquivo | conteúdo centrado em 640px. No alto, o seletor "Contatos / Negócios" (pílulas de 28px, fundo `#F4F4F7`, a ativa branca com sombra curta): **"Negócios" ativa** e "Contatos" desligada com a dica "Importe contatos em Contatos". Título "Escolha o arquivo .CSV para criar negócios" (22px/500). Texto 13px `#5A5964`: "Seu arquivo precisa ter os campos importantes para mapear com a plataforma. No próximo passo você liga cada coluna a um campo da Clint." — com "da Escale OS" no lugar de "da Clint" (marca). Link "⤓ Baixar arquivo de exemplo .CSV" (13px, marca; `GET /api/v1/leads/import`). A área de 76px (fundo `#F8F8FA`, raio 8, borda 1px tracejada `#E4E4E9`): quadrado de 44px da marca com o ícone de nuvem branco, "Arraste o arquivo aqui ou clique para selecionar" (13px/500) e "Formato .CSV" (12px `#5A5964`). Com arquivo: fundo `#EEFBF2`, borda tracejada verde `#2FB36B`, quadrado verde com ✓, o nome do arquivo e "Pronto para mapear" |
| Passo 2, Mapeamento | título "Mapeie os campos do seu arquivo" (22px/500, centrado) e subtítulo "Ligue cada coluna do seu arquivo a um campo da Escale OS." (13px). Link "+ Adicionar campo" (marca, 13px/500) à direita, **desligado** com "Em breve" (campo novo é da 1F). Tabela de 720px, borda 1px `#ECEBF1`, raio 8: cabeçalho de 32px "COLUNA DO ARQUIVO" e "MAPEAR PARA" (10px/500, maiúsculas, `#86858F`, fundo `#FAFAFC`); linhas de 56px com o ícone de coluna (14px `#86858F`) e o nome da coluna (13px; cinza quando "Não importar"), e à direita um `SeletorDaCasca` de 390px com o campo, um "×" que volta para "Não importar esse campo" e o chevron |
| Passo 3, Configurações | título "Configurações da importação" e subtítulo "Origem, etapa e status padrão dos negócios e a etiqueta aplicada aos contatos.". Coluna de 560px: "Tags do contato" (13px/500) + "Opcional. Aplicada a todos os contatos criados ou atualizados nesta importação." (12px `#5A5964`) + botão "+ Adicionar tag" (contorno, 32px), que abre as tags do quadro em `CaixaDaCasca` num `PainelSuspenso` e mostra as escolhidas como chips; "Origem de destino" com o `SeletorDaCasca` **desligado** já na origem do quadro (dica "A importação entra nesta origem", E10b); "Etapa inicial padrão *" com o `SeletorDaCasca` das etapas abertas, já na primeira; "Status" com três botões de 40px lado a lado: "⊖ Aberto" (ativo: borda da marca, fundo `casca-marca-suave`), "✓ Ganho" (verde) e "⊗ Perdido" (vermelho), os dois últimos **desligados** com "Em breve" (E10c) |
| Passo 4, Prévia e confirmação | título "Confira e confirme a importação" e subtítulo "Revise os detalhes antes de iniciar.". Caixa de 640px (borda 1px `#ECEBF1`, raio 8) com linhas de 36px rótulo × valor (13px; valor à direita): "Arquivo", "Tipo" ("Negócios"), "Campos mapeados" (N), "Etapa" e "Linhas" (N). Embaixo, o aviso (fundo `#F8F8FA`, raio 8, ícone de bandeira num quadrado laranja claro): "A importação conclui agora." / "Os negócios entram na etapa escolhida. As linhas recusadas aparecem com o motivo logo depois." |
| Depois de importar | no lugar do passo 4: "{n} negócios criados", "{n} contatos criados" e a lista "Linha {linha}: {motivo}" das recusadas (caixa que rola, `max-h-48`). O rodapé vira "Fechar" (E10f). O quadro relê sozinho |
| Erros | "Apenas arquivos CSV são aceitos."; "O arquivo CSV excede o limite máximo de 5 MB." (E10e); "A planilha passa de 500 linhas. Divida em arquivos menores."; a recusa da rota em toast com a mensagem dela |

O "Continuar" do passo 2 fica desligado até haver o nome do negócio ou do contato, com a dica (balão escuro acima) "Para continuar você precisa associar pelo menos o nome do negócio ou do contato." (E10g). Os textos novos da v2 que dizem "Clint" trocam para "Escale OS" (marca).

**Interfaces:**
- `CAMPOS_DA_IMPORTACAO`: a lista `{ chave, rotulo, grupo, cabecalho }` na ordem do seletor, em grupos como na v2 (E10d):
  - **CONTATO:** Nome do contato, Telefone e Email;
  - **NEGÓCIO:** Nome do negócio, Valor do negócio, Observação, Fonte e Tags.
  
  `cabecalho` é o nome que a rota reconhece (`nome do contato`, `telefone`, `email`, `nome`, `valor`, `observacao`, `origem`, `tags`);
- `sugerirMapa(cabecalho: string[]): Array<ChaveDaImportacao | null>`, pelo `campoDaColuna` do original, sem repetir campo (a sugestão automática da v2);
- `podeContinuar(mapa): boolean`;
- `csvMapeado(linhas: string[][], mapa, tagsExtras: string[]): string`. Reescreve o cabeçalho, tira as colunas "Não importar" e junta as tags do passo 3 às da coluna (separador `;`);
- `PassosDaImportacao({ atual, rotulos })`, o indicador;
- `JanelaDeImportarNegocios({ aberta, onFechar, pipelineId, nomeDaOrigem, etapas, tagsDoQuadro, aoImportar })`.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-importar-mapear.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { CAMPOS_DA_IMPORTACAO, csvMapeado, podeContinuar, sugerirMapa } from "@/lib/escale/importar/mapear";
import { parseCsv } from "@/lib/contacts/csv";

const LINHAS = [
  ["Cliente", "Celular", "Email", "Ticket", "Etiquetas"],
  ["Ana Souza", "11988887777", "ana@x.com", "1.200,00", "vip"],
  ["Bruno", "", "", "", ""],
];

describe("o mapeamento da importação (passo 2)", () => {
  it("sugere pelo nome da coluna, como a rota leria; o que não conhece fica 'Não importar'", () => {
    expect(sugerirMapa(LINHAS[0]!)).toEqual([null, "telefone", "email", "valor", "etiquetas"]);
    expect(sugerirMapa(["nome", "Nome"])).toEqual(["titulo", null]);
  });

  it("os campos vêm em dois grupos, contato primeiro", () => {
    expect([...new Set(CAMPOS_DA_IMPORTACAO.map((c) => c.grupo))]).toEqual(["contato", "negocio"]);
  });

  it("só continua com nome do negócio ou do contato", () => {
    expect(podeContinuar([null, "telefone", "email", null, null])).toBe(false);
    expect(podeContinuar(["contato", "telefone", null, null, null])).toBe(true);
  });

  it("reescreve o cabeçalho com os nomes da rota, tira as colunas ignoradas e junta as tags do passo 3", () => {
    const csv = csvMapeado(LINHAS, ["contato", "telefone", null, "valor", "etiquetas"], ["importado", "out/26"]);
    expect(parseCsv(csv)).toEqual([
      ["nome do contato", "telefone", "valor", "tags"],
      ["Ana Souza", "11988887777", "1.200,00", "vip;importado;out/26"],
      ["Bruno", "", "", "importado;out/26"],
    ]);
  });

  it("sem coluna de tags, as do passo 3 viram uma coluna nova; aspas e vírgulas sobrevivem", () => {
    const csv = csvMapeado([["nome"], ['Reforma "402", sala']], ["titulo"], ["vip"]);
    expect(parseCsv(csv)).toEqual([["nome", "tags"], ['Reforma "402", sala', "vip"]]);
  });
});
```

Create `tests/unit/escale-janela-de-importar.test.tsx`:
- mocke `@/hooks/i18n/useT`, `sonner` e `global.fetch` (`vi.fn()`), e aplique o polyfill do Radix;
- renderize `<JanelaDeImportarNegocios aberta onFechar={vi.fn()} pipelineId="p-1" nomeDaOrigem="Vendas" etapas={[{ id: "e-1", name: "Entrada" }, { id: "e-2", name: "Proposta" }]} tagsDoQuadro={["vip"]} aoImportar={aoImportar} />`.

Os casos:
1. **Passo 1.** O indicador tem os 4 rótulos, e o "Arquivo" é o atual. "Negócios" está ativa, e "Contatos" desligada. O link "Baixar arquivo de exemplo .CSV" tem `href="/api/v1/leads/import"`. O "Continuar" fica desligado sem arquivo.
2. **Erros do arquivo.** Um `.txt` mostra "Apenas arquivos CSV são aceitos.". Um `.csv` de 6 MB mostra "O arquivo CSV excede o limite máximo de 5 MB.".
3. **Arquivo escolhido.** A área mostra o nome do arquivo e "Pronto para mapear".
4. **Passo 2.** Com `Celular,Email\n11988887777,a@x.com`, o mapeamento já vem sugerido ("Telefone" e "Email"), e o "Continuar" fica desligado com a dica do nome. Trocar a primeira coluna para "Nome do contato" liga o "Continuar".
5. **Passo 3.** Mostra "Vendas" no seletor desligado e "Entrada" na etapa. "Ganho" e "Perdido" ficam desligados com "Em breve".
6. **Passo 4 e importação.** Com a etapa "Proposta", o resumo mostra "Proposta" e "1" linha.
   - "Confirmar e importar" chama o `fetch` com `POST /api/v1/leads/import`. O `FormData` tem `pipeline_id=p-1`, `stage_id=e-2` e um `file` cujo texto começa por `nome do contato,telefone`.
   - A resposta `{ data: { total_linhas: 1, criados: 1, contatos_criados: 1, erros: [], colunas_ignoradas: [] } }` mostra "1 negócio criado" e chama `aoImportar`.
7. **Recusa da rota.** A resposta 422 `{ error: { message: "A planilha está vazia." } }` aparece em toast de erro, e a janela fica no passo 4.

Para ler o arquivo no jsdom, use `await (form.get("file") as File).text()`.

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-importar-mapear.test.ts tests/unit/escale-janela-de-importar.test.tsx
```

- [ ] **Step 3: A regra**

Em `lib/leads/planilha.ts`, troque `function campoDaColuna(cabecalho: string): string | null {` por:

```ts
// FORK ESCALE · Fase 1E: exportada para o mapeamento da importação da casca
// sugerir o campo pelo MESMO critério da leitura (sem segunda lista de nomes).
export function campoDaColuna(cabecalho: string): string | null {
```

Create `lib/escale/importar/mapear.ts`:

```ts
import { campoDaColuna } from "@/lib/leads/planilha";

/**
 * O MAPEAMENTO DA IMPORTAÇÃO (fork Escale, Fase 1E; Clint v2: "Mapeie os campos
 * do seu arquivo"). A rota de importação que já existe lê o cabeçalho pelo nome:
 * mapear, aqui, é reescrever o cabeçalho com o nome que ela reconhece e tirar as
 * colunas que a pessoa não quer. Só os campos que a rota lê (E10d).
 */
export const CAMPOS_DA_IMPORTACAO = [
  { chave: "contato", rotulo: "Nome do contato", grupo: "contato", cabecalho: "nome do contato" },
  { chave: "telefone", rotulo: "Telefone", grupo: "contato", cabecalho: "telefone" },
  { chave: "email", rotulo: "Email", grupo: "contato", cabecalho: "email" },
  { chave: "titulo", rotulo: "Nome do negócio", grupo: "negocio", cabecalho: "nome" },
  { chave: "valor", rotulo: "Valor do negócio", grupo: "negocio", cabecalho: "valor" },
  { chave: "descricao", rotulo: "Observação", grupo: "negocio", cabecalho: "observacao" },
  { chave: "origem", rotulo: "Fonte", grupo: "negocio", cabecalho: "origem" },
  { chave: "etiquetas", rotulo: "Tags", grupo: "negocio", cabecalho: "tags" },
] as const;

export type ChaveDaImportacao = (typeof CAMPOS_DA_IMPORTACAO)[number]["chave"];
export type MapaDaImportacao = ReadonlyArray<ChaveDaImportacao | null>;

const CHAVES = new Set<string>(CAMPOS_DA_IMPORTACAO.map((c) => c.chave));
const CABECALHO = new Map<string, string>(CAMPOS_DA_IMPORTACAO.map((c) => [c.chave, c.cabecalho]));

export function sugerirMapa(cabecalho: readonly string[]): Array<ChaveDaImportacao | null> {
  const usados = new Set<string>();
  return cabecalho.map((titulo) => {
    const campo = campoDaColuna(titulo);
    if (!campo || !CHAVES.has(campo) || usados.has(campo)) return null;
    usados.add(campo);
    return campo as ChaveDaImportacao;
  });
}

/** A rota recusa planilha sem nome do negócio nem do contato: o "Continuar" já trava antes. */
export function podeContinuar(mapa: MapaDaImportacao): boolean {
  return mapa.includes("titulo") || mapa.includes("contato");
}

/** RFC 4180, sem guarda de fórmula: aqui é dado de entrada, e a rota lê o texto como veio. */
function celulaCrua(valor: string): string {
  return /[",\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

export function csvMapeado(linhas: readonly string[][], mapa: MapaDaImportacao, tagsExtras: readonly string[]): string {
  const usadas = mapa.flatMap((chave, indice) => (chave ? [{ indice, chave }] : []));
  const temTags = usadas.some((c) => c.chave === "etiquetas");
  const extras = tagsExtras.map((t) => t.trim()).filter(Boolean);
  const cabecalho = usadas.map((c) => CABECALHO.get(c.chave) ?? c.chave);
  if (!temTags && extras.length > 0) cabecalho.push("tags");
  const corpo = linhas.slice(1).map((bruta) => {
    const celulas = usadas.map(({ indice, chave }) => {
      const valor = (bruta[indice] ?? "").trim();
      return chave === "etiquetas" && extras.length > 0 ? [valor, ...extras].filter(Boolean).join(";") : valor;
    });
    if (!temTags && extras.length > 0) celulas.push(extras.join(";"));
    return celulas;
  });
  return `${[cabecalho, ...corpo].map((l) => l.map(celulaCrua).join(",")).join("\r\n")}\r\n`;
}
```

A leitura da planilha separa as tags por `,`, `;` ou `|` (`lerPlanilhaDeLeads`) e guarda até 20. O `;` é o do modelo (`quente;retorno`).

- [ ] **Step 4: O indicador de passos e a janela**

Create `components/escale/quadro/PassosDaImportacao.tsx` com o indicador da tabela de Visual: `<ol aria-label={t("Passos da importação")}>`. Cada passo é um `<li>`, e o atual leva `aria-current="step"`.

Create `components/escale/quadro/JanelaDeImportarNegocios.tsx`. A estrutura:
- estado: `passo: 1 | 2 | 3 | 4 | "pronto"`, `arquivo: { nome; linhas: string[][] } | null`, `mapa`, `etapa`, `tags`, `enviando`, `resumo` e `erroDoArquivo`;
- **ler o arquivo:**
  - recuse o que não termina em `.csv` (sem distinguir caixa) e o que passa de `CSV_MAX_BYTES`;
  - leia com `decodificarCsv(await arquivo.arrayBuffer())` (`lib/contacts/csv.ts`; devolve `{ texto }` ou `{ erro }`, e o erro aparece no lugar do texto do arquivo). É ele que lê o Latin-1 do Excel;
  - passe por `parseCsv`, tire as linhas em branco e, com mais de `CSV_MAX_DATA_ROWS` linhas de dados, mostre o erro de 500 linhas;
  - `setMapa(sugerirMapa(linhas[0]))`;
- a área do arquivo é um `<label>` com o `<input type="file" className="sr-only" accept=".csv,text/csv" aria-label={t("Arquivo .CSV")}>` dentro. Ela também aceita soltar o arquivo (`onDragOver` com `preventDefault` e `onDrop` lendo `e.dataTransfer.files[0]`);
- **passo 2:** o `SeletorDaCasca` de cada coluna usa:
  - as opções `CAMPOS_DA_IMPORTACAO.map((c) => ({ valor: c.chave, rotulo: t(c.rotulo), grupo: c.grupo === "contato" ? t("Contato") : t("Negócio"), desabilitada: mapa.includes(c.chave) && mapa[i] !== c.chave }))`;
  - `vazio={t("Não importar esse campo")}`;
  - o `aria-label` `` `${t("Campo da coluna")} ${titulo}` ``;
  
  O "×" ao lado volta a coluna para `null`;
- **passo 3:** a etapa começa na primeira das `etapas` que a página passa (já sem ganho, perda e arquivadas). As tags são as do quadro, em `CaixaDaCasca`;
- **enviar** (passo 4, "Confirmar e importar"):

```tsx
  async function confirmar() {
    if (!arquivo) return;
    setEnviando(true);
    try {
      const form = new FormData();
      form.append("file", new File([csvMapeado(arquivo.linhas, mapa, tags)], arquivo.nome, { type: "text/csv" }));
      form.append("pipeline_id", pipelineId);
      form.append("stage_id", etapa);
      const res = await fetch("/api/v1/leads/import", { method: "POST", body: form });
      const json = (await res.json()) as { data?: ResumoDaImportacao; error?: { message?: string } };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? t("Não consegui ler essa planilha."));
        return;
      }
      setResumo(json.data);
      setPasso("pronto");
      aoImportar();
    } catch {
      toast.error(t("Não consegui enviar o arquivo."));
    } finally {
      setEnviando(false);
    }
  }
```

- `ResumoDaImportacao` é a forma da rota: `{ total_linhas, criados, contatos_criados, erros: Array<{ linha, motivo }>, colunas_ignoradas }`. Declare o tipo no componente, igual ao `ImportarLeads.tsx` do original;
- os textos do resumo: `criados === 1 ? t("{n} negócio criado") : t("{n} negócios criados")`, e o mesmo para os contatos. O motivo de cada recusa já vem traduzido da rota;
- fechar zera tudo: o próximo uso começa no passo 1.

Todo texto da janela é da Clint v2 (`v2-06` a `v2-11`), menos os marcados como nossos em E10 e a troca de "Clint" por "Escale OS".

- [ ] **Step 5: A página**

Em `app/app/pipelines/[id]/_client.tsx`:
- importe `JanelaDeImportarNegocios`;
- depois do `etapaDoNovo`, acrescente `const [importando, setImportando] = useState(false);`;
- troque `aoImportar={() => {}} // Task 12` por `aoImportar={() => setImportando(true)}`;
- logo depois do bloco `{data && (<NewLeadDialog … />)}`, acrescente:

```tsx
      {/* FORK ESCALE · Fase 1E: "Importar negócios" do menu "Negócio +" (casca nova). */}
      {cascaNova && data ? (
        <JanelaDeImportarNegocios
          aberta={importando}
          onFechar={() => setImportando(false)}
          pipelineId={pipelineId}
          nomeDaOrigem={nomeAtual}
          etapas={data.stages.filter((s) => !s.is_won && !s.is_lost && !s.is_archived)}
          tagsDoQuadro={tagsDoQuadro}
          aoImportar={() => void refetch()}
        />
      ) : null}
```

Em `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`, acrescente o `vi.mock` da janela adiado na Task 11. Depois, acrescente um caso: clicar `button /^Negócio/`, depois `menuitem "Importar negócios"`, e esperar "importar aberto".

- [ ] **Step 6: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-importar-mapear.test.ts tests/unit/escale-janela-de-importar.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx app/api/v1/leads/import/route.test.ts tests/unit/selecao-longa-tem-busca.test.ts tests/unit/controle-decorativo.test.ts
```
Os dois últimos são as cercas. Depois: typecheck, eslint e prettier nos arquivos novos.

- [ ] **Step 7: Commit**

```bash
git add lib/escale/importar/mapear.ts components/escale/quadro/JanelaDeImportarNegocios.tsx components/escale/quadro/PassosDaImportacao.tsx lib/leads/planilha.ts "app/app/pipelines/[id]/_client.tsx" tests/unit/escale-importar-mapear.test.ts tests/unit/escale-janela-de-importar.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
git commit -m "feat(escale): importar negócios com o fluxo da Clint v2 (arquivo, mapeamento, configurações e prévia)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Exportar pelo ícone da linha de contagem

**Files:**
- Create: `lib/escale/exportar/csv-do-quadro.ts`, `lib/escale/exportar/baixar.ts`, `app/api/v1/exportacoes-do-quadro/route.ts`, `components/escale/filtros/ExportarCards.tsx`, `tests/unit/escale-csv-do-quadro.test.ts`, `tests/unit/escale-exportacoes-do-quadro-rota.test.ts`, `tests/unit/escale-exportar-cards.test.tsx`
- Modify: `components/escale/filtros/LinhaDeContagem.tsx`, `components/escale/filtros/BarraDoQuadro.tsx`, `app/app/pipelines/[id]/_client.tsx`, `tests/unit/escale-barra-do-quadro.test.tsx`, `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`

**Visual** (prints `16a` e `v2-02`/`v2-03` em `docs/clint/prints-1e/`; o lugar é o da v1, a confirmação é a da v2, E11):
- o ícone é o `Download` de 16px no mesmo `BotaoDaCasca variante="icone"` da V4, entre o personalizar e a engrenagem;
- a dica é "Exportar {n} Negócio" / "Exportar {n} Negócios", num balão escuro embaixo do ícone (`16a`). Sem cards: "Nenhum negócio para exportar.", com o ícone `#BDBDBD` e desligado;
- o clique abre a janela da v2 "Confirme sua ação" (`v2-03`): 576px, raio 8, título 16px/500 com X, divisórias `#E4E4E9`, o texto de 13px "Tem certeza que deseja exportar os negócios dessa origem?" e, no rodapé à direita, "Cancelar" (contorno) e "Confirmar" (marca), de 32px;
- durante a exportação, o ícone vira o `RefreshCw` girando, e o botão fica desligado;
- os toasts: "Os negócios foram exportados com sucesso." e "Falha ao exportar os negócios, tente novamente ou chame o suporte.";
- sem a prop, não há ícone: na Visualização (a Clint esconde na visão de grupo) e para quem está abaixo de gerente (E11).

**Interfaces:**
- `celula`, `csvDoQuadro({ leads, stages, campos, nomeDoDono, t })` e `nomeDoArquivo(origem, hoje)`, iguais ao v1;
- `baixarCsv(nome, conteudo)`;
- `POST /api/v1/exportacoes-do-quadro` com `{ origem: uuid, quantidade: int }`. Pede manager e responde 201 `{ data: { registrado: true } }`;
- `ExportacaoDoQuadro = { origem: { id; nome }; leads: readonly Lead[]; stages: readonly Stage[]; settings?: Record<string, unknown> }`;
- `ExportarCards(props: ExportacaoDoQuadro)`;
- `LinhaDeContagem` ganha `exportar?: ReactNode`; `BarraDoQuadro` ganha `exportacao?: ExportacaoDoQuadro`.

- [ ] **Step 1: Os testes (vão falhar)**

`tests/unit/escale-csv-do-quadro.test.ts` e `tests/unit/escale-exportacoes-do-quadro-rota.test.ts`: os mesmos do Step 1 da Task 11 do plano v1 (`2026-10-15-fase-1e-capa-e-acoes-do-quadro.md`), sem mudar nada. Eles continuam valendo: o CSV e a rota não mudaram de forma.

Create `tests/unit/escale-exportar-cards.test.tsx`. O topo é o do `escale-menu-do-quadro.test.tsx` do v1: os mocks de `apiClient.post`, `baixarCsv`, `sonner`, `useT` e `useAssignableMembers`, o polyfill e os `LEADS`/`ETAPAS`. Depois:

```tsx
import { ExportarCards } from "@/components/escale/filtros/ExportarCards";

function exportar(leads = LEADS) {
  render(<ExportarCards origem={{ id: "p-1", nome: "Vendas" }} leads={leads} stages={ETAPAS} settings={{}} />);
  return userEvent.setup({ pointerEventsCheck: 0 });
}

describe("<ExportarCards> (ícone da linha de contagem)", () => {
  it("a dica diz quantos; Confirmar registra antes e baixa o CSV do que a tela mostra", async () => {
    post.mockResolvedValue({ data: { registrado: true } });
    const user = exportar();
    const botao = screen.getByRole("button", { name: "Exportar" });
    expect(botao).toHaveAttribute("title", "Exportar 2 Negócios");
    await user.click(botao);
    expect(screen.getByText("Tem certeza que deseja exportar os negócios dessa origem?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(baixar).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenCalledWith("/api/v1/exportacoes-do-quadro", { origem: "p-1", quantidade: 2 });
    const [nome, csv] = baixar.mock.calls[0] as [string, string];
    expect(nome).toMatch(/^negocios-vendas-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv).toContain("Proposta ACME,Entrada,Em aberto,,,Bruno");
    expect(toast.success).toHaveBeenCalledWith("Os negócios foram exportados com sucesso.");
  });

  it("Cancelar fecha sem exportar", async () => {
    const user = exportar();
    await user.click(screen.getByRole("button", { name: "Exportar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByText("Tem certeza que deseja exportar os negócios dessa origem?")).toBeNull();
  });

  it("a rota recusa: toast de falha e nada baixado", async () => {
    post.mockRejectedValue(new Error("403"));
    const user = exportar();
    await user.click(screen.getByRole("button", { name: "Exportar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Falha ao exportar os negócios, tente novamente ou chame o suporte."),
    );
    expect(baixar).not.toHaveBeenCalled();
  });

  it("sem cards, desligado com a dica da Clint", () => {
    exportar([]);
    const botao = screen.getByRole("button", { name: "Exportar" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("title", "Nenhum negócio para exportar.");
  });
});
```

Em `tests/unit/escale-barra-do-quadro.test.tsx`, troque o caso que exige o `Exportar` desligado por dois casos:
- sem `exportacao`, `queryByRole("button", { name: "Exportar" })` é `null`;
- com `exportacao`, o botão aparece. Mocke `@/components/escale/filtros/ExportarCards` como `() => <button type="button">Exportar</button>`.

Em `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`, o mock da `BarraDoQuadro` passa a escrever ``exportar: ${p.exportacao ? p.exportacao.leads.length : "não"}``. Acrescente dois casos: com `role="manager"`, "exportar: 1"; com `role="agent"`, "exportar: não".

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-csv-do-quadro.test.ts tests/unit/escale-exportacoes-do-quadro-rota.test.ts tests/unit/escale-exportar-cards.test.tsx tests/unit/escale-barra-do-quadro.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
```

- [ ] **Step 3: O CSV e o download**

`lib/escale/exportar/csv-do-quadro.ts` e `lib/escale/exportar/baixar.ts`: o código do Step 3 da Task 11 do v1, sem mudar nada. Isso inclui:
- a guarda contra fórmula da OWASP;
- o rótulo da opção nos campos de seleção;
- a data local no nome do arquivo;
- o BOM escrito `"\uFEFF"`.

- [ ] **Step 4: A rota**

Create `app/api/v1/exportacoes-do-quadro/route.ts` com o código do Step 4 da Task 11 do v1, com duas mudanças:
- o import `import { falhaInesperadaDaCapa, origemExiste } from "@/lib/escale/capa/banco";` vira `import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";`;
- o bloco `let existe: boolean; try { … } catch { … }` vira a leitura direta da origem:

```ts
  const supabase = await createClient();
  const { data: origem, error } = await supabase
    .from("crm_pipelines")
    .select("id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", parsed.data.origem)
    .maybeSingle();
  if (error) {
    // A mensagem crua do banco vai para o log, nunca para o cliente (regra da 1D).
    return falhaInesperadaDoQuadro(error, { rota: "POST /api/v1/exportacoes-do-quadro", operacao: "conferir a origem" }, t, requestId);
  }
  if (!origem) return fail("not_found", t("Origem não encontrada."), 404, { requestId });
```

O resto fica igual: `requireSupportWrite()`, `requireRole("manager")`, `lerJson`, o `corpoSchema` estrito, o `await audit(...)` com `pipeline.cards_exported` e o 201.

- [ ] **Step 5: O ícone e a janela de confirmação**

Create `components/escale/filtros/ExportarCards.tsx`:

```tsx
"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { apiClient } from "@/lib/api/client";
import { baixarCsv } from "@/lib/escale/exportar/baixar";
import { csvDoQuadro, nomeDoArquivo } from "@/lib/escale/exportar/csv-do-quadro";
import type { Stage } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { Lead } from "@/lib/types/leads";
import { Download, RefreshCw, X } from "@/lib/ui/icons-da-casca";

export interface ExportacaoDoQuadro {
  origem: { id: string; nome: string };
  /** Os cards que a tela mostra agora (o recorte, com os filtros): é o que sai no arquivo. */
  leads: readonly Lead[];
  stages: readonly Stage[];
  settings?: Record<string, unknown>;
}

/**
 * O EXPORTAR (fork Escale, Fase 1E; E11): o ícone da linha de contagem no lugar
 * da Clint v1 (print 16a) e a janela "Confirme sua ação" da Clint v2 (v2-03). A
 * trava é a rota (gerente ou acima, com auditoria), chamada ANTES do download. Os
 * nomes dos donos vêm do mesmo cache do quadro, e só são pedidos com a janela aberta.
 */
export function ExportarCards({ origem, leads, stages, settings }: ExportacaoDoQuadro) {
  const t = useT();
  const [aberta, setAberta] = useState(false);
  const [exportando, setExportando] = useState(false);
  const { data: membros, isLoading: carregandoMembros } = useAssignableMembers(aberta);
  const vazio = leads.length === 0;
  const dica = vazio
    ? t("Nenhum negócio para exportar.")
    : (leads.length === 1 ? t("Exportar {n} Negócio") : t("Exportar {n} Negócios")).replace("{n}", String(leads.length));

  async function exportar() {
    setExportando(true);
    try {
      await apiClient.post("/api/v1/exportacoes-do-quadro", { origem: origem.id, quantidade: leads.length });
      const nomes = new Map((membros ?? []).map((m) => [m.user_id, m.full_name ?? ""]));
      const csv = csvDoQuadro({
        leads,
        stages,
        campos: camposDoFunil(settings ?? null),
        t,
        nomeDoDono: (l) =>
          l.owner_kind === "ai" ? (l.owner_agent?.name ?? "") : l.owner_user_id ? (nomes.get(l.owner_user_id) ?? "") : "",
      });
      baixarCsv(nomeDoArquivo(origem.nome, new Date()), csv);
      toast.success(t("Os negócios foram exportados com sucesso."));
      setAberta(false);
    } catch {
      toast.error(t("Falha ao exportar os negócios, tente novamente ou chame o suporte."));
    } finally {
      setExportando(false);
    }
  }

  return (
    <>
      <BotaoDaCasca
        type="button"
        variante="icone"
        disabled={vazio || exportando}
        aria-label={t("Exportar")}
        title={dica}
        onClick={() => setAberta(true)}
        // O BotaoDaCasca desligado tem `pointer-events-none`; sem o `auto`, a dica não apareceria.
        className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:text-[#BDBDBD]"
      >
        {exportando ? <RefreshCw size={16} aria-hidden className="animate-spin" /> : <Download size={16} aria-hidden />}
      </BotaoDaCasca>
      <DialogPrimitive.Root open={aberta} onOpenChange={(a) => !exportando && setAberta(a)}>
        <DialogPortal>
          <DialogOverlay className="bg-black/48" />
          <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-50 w-[min(576px,calc(100vw-2rem))] translate-x-[-50%] translate-y-[-50%] rounded-[8px] bg-surface text-casca-texto shadow-casca-painel">
            <div className="flex h-14 items-center justify-between border-b border-[#E4E4E9] px-5">
              <DialogTitle className="text-base font-medium">{t("Confirme sua ação")}</DialogTitle>
              <DialogPrimitive.Close aria-label={t("Fechar")} className="grid size-6 place-items-center text-[#86858F] hover:text-casca-texto">
                <X size={16} aria-hidden />
              </DialogPrimitive.Close>
            </div>
            <p className="px-6 py-6 text-[13px] text-[#5A5964]">{t("Tem certeza que deseja exportar os negócios dessa origem?")}</p>
            <div className="flex justify-end gap-3 border-t border-[#E4E4E9] px-3 py-3">
              <button
                type="button"
                onClick={() => setAberta(false)}
                disabled={exportando}
                className="h-8 rounded-[6px] border border-[#E4E4E9] px-4 text-[13px] font-medium hover:bg-[#EFEFF2]"
              >
                {t("Cancelar")}
              </button>
              <button
                type="button"
                onClick={() => void exportar()}
                disabled={exportando || carregandoMembros}
                title={carregandoMembros ? t("Carregando…") : undefined}
                className="h-8 rounded-[6px] bg-casca-marca px-4 text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("Confirmar")}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </DialogPrimitive.Root>
    </>
  );
}
```

As medidas da janela são as do print `v2-03`: 576px, raio 8, título de 16px/500, texto de 13px, rodapé com "Cancelar" (contorno) e "Confirmar" (marca, 32px).

- [ ] **Step 6: A linha, a barra e a página**

Em `components/escale/filtros/LinhaDeContagem.tsx`:
- acrescente às props `exportar?: ReactNode;` (com o comentário "Fase 1E: o `ExportarCards`; ausente = sem ícone (Visualização, abaixo de gerente)");
- troque o `<BotaoDaCasca … aria-label={t("Exportar")} title={t("Em breve")} …>…</BotaoDaCasca>` inteiro por `{exportar}`;
- tire o `Download` do import;
- no comentário do componente, troque "Exportar (1E) e ajuda ficam desligados (D6; PRINTS 16 e 17)" por "Exportar (Fase 1E) só para gerente ou acima no funil; a ajuda segue desligada (PRINT 17)".

Em `components/escale/filtros/BarraDoQuadro.tsx`:
- importe `ExportarCards, type ExportacaoDoQuadro` de `./ExportarCards`;
- acrescente às props `exportacao?: ExportacaoDoQuadro;`;
- no `<LinhaDeContagem …>`, acrescente `exportar={exportacao ? <ExportarCards {...exportacao} /> : undefined}`.

Em `app/app/pipelines/[id]/_client.tsx`, no `<BarraDoQuadro …>`, depois de `atualizando={isFetching}`, acrescente:

```tsx
          // FORK ESCALE · Fase 1E: Exportar, para gerente ou acima (a rota pede manager).
          exportacao={
            data && recorte && ROLE_RANK[role] >= ROLE_RANK.manager
              ? { origem: { id: pipelineId, nome: nomeAtual }, leads: recorte.leads, stages: data.stages, settings: data.pipeline.settings }
              : undefined
          }
```

- [ ] **Step 7: Rodar e ver passar, com os gates das rotas**

```bash
corepack pnpm vitest run tests/unit/escale-csv-do-quadro.test.ts tests/unit/escale-exportacoes-do-quadro-rota.test.ts tests/unit/escale-exportar-cards.test.tsx tests/unit/escale-barra-do-quadro.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx tests/unit/suporte-cobertura-de-efeitos.test.ts tests/unit/controle-decorativo.test.ts "app/app/pipelines/[id]/trocar-funil.test.tsx"
corepack pnpm lint:role-rank
```
Depois: typecheck, eslint e prettier nos arquivos novos.

- [ ] **Step 8: Commit**

```bash
git add lib/escale/exportar/csv-do-quadro.ts lib/escale/exportar/baixar.ts app/api/v1/exportacoes-do-quadro/route.ts components/escale/filtros/ExportarCards.tsx components/escale/filtros/LinhaDeContagem.tsx components/escale/filtros/BarraDoQuadro.tsx "app/app/pipelines/[id]/_client.tsx" tests/unit/escale-csv-do-quadro.test.ts tests/unit/escale-exportacoes-do-quadro-rota.test.ts tests/unit/escale-exportar-cards.test.tsx tests/unit/escale-barra-do-quadro.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
git commit -m "feat(escale): exportar os cards pelo ícone da linha de contagem, igual à Clint (gerente+, auditado)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: RECENTES no painel Origens

**Files:**
- Create: `lib/escale/recentes/regras.ts`, `hooks/escale/useNegociosRecentes.ts`, `components/escale/origens/SecaoRecentes.tsx`, `tests/unit/escale-recentes-regras.test.ts`, `tests/unit/escale-secao-recentes.test.tsx`
- Modify: `lib/escale/origens/preferencias.ts`, `components/escale/origens/PainelOrigens.tsx`, `components/escale/origens/ComOrigens.tsx`, `components/escale/quadro/ColunaDoFunilNaCasca.tsx`, `components/escale/visualizacoes/ColunaDaVisualizacao.tsx`, `components/kanban/KanbanBoard.tsx`, `app/app/pipelines/[id]/_client.tsx`, `tests/unit/escale-origens-preferencias.test.ts`, `tests/unit/escale-painel-origens.test.tsx`, `tests/unit/escale-colunas-com-prefs.test.tsx`, `tests/unit/escale-quadro-na-casca.test.tsx`

**Visual** (prints `11a`, `11b`, `34a` e `34b` em `docs/clint/prints-1e/`, com as medidas do CSS no `README.md`; o que não tem print sai do código `index-C5_SGzQX`, widget `LAST_LEADS`; PRINT 34 ainda falta para fixado, ver mais, vazio e limite):

| Peça | Detalhe |
|---|---|
| Cabeçalho | `CabecalhoDaSecao` (48px, divisória) com `Clock` 16 e "Recentes". À direita, o chevron (`BOTAO_DE_ICONE` + `text-casca-meta`; `ChevronUp` aberta, `ChevronDown` fechada). Abre **recolhida** |
| Blocos | primeiro os fixados, depois uma divisória (`border-t border-casca-borda`), depois os recentes. Sem fixados, não há divisória |
| Linha | 39px de altura (não os 34px das origens), `LINHA_COM_HOVER`, `pr-1`. Link de largura toda com `gap-[7px] pl-3`: foto do contato de 20×20 **com raio 5** (quadrada arredondada, `11b`) ou o quadrado de 20px com a inicial (`corDoAvatar`, `inicialDoNome`, 9px/600 branco, raio 5) e o nome do negócio (11,7px/400 `casca-texto`) |
| Hover da linha | `SO_NO_HOVER` com dois `BOTAO_DE_ICONE` na cor `#3E3A6F`: o alfinete (`Pin` 12, "Fixar"; no fixado, `PinOff`, "Desafixar") e a seta (`ChevronDown` 14, "Ver detalhes"; aberta, `ChevronUp`, "Esconder detalhes"). O fixado mostra o `Pin` em repouso, na cor da marca |
| Detalhe | abaixo da linha, uma caixa branca de raio 6 com `px-0.5 py-1` (`34a`). Primeira linha: a origem, 10,4px/400, recuada (`pl-[67px]`). Segunda linha, com `pl-3.5`: o ícone de prédio (`Building2` 14, cor da marca) e "Sem empresa" em **11px/700** (não temos empresa: Fase 2); à direita, o telefone (`Phone` 12, cor da marca) como link `tel:` com a dica "Ligar" (E13, `34b`). Sem telefone, o ícone fica cinza com a dica "Sem telefone" |
| Ver mais | cada bloco mostra 5. Com mais, o botão "Ver mais" (11px, `text-casca-marca`, `pl-4`, 28px de altura) mostra todos, e vira "Ver menos" |
| Vazio | aberta e sem nada: "Você não possui negócios recém trabalhados." (11px, `text-casca-suave`, 34px, `pr-3 pl-4`) |
| Limite | o sexto fixado não entra, e aparece o toast "Você atingiu o limite. Desafixe algo pra fixar mais." |

**O que entra nos Recentes:** o negócio cujo dossiê abriu por clique no card (funil e Visualização). Clicar num Recente sobe ele para o topo e abre o quadro da origem com `?lead=`. A lista guarda 20 recentes e 5 fixados; o fixado não se repete embaixo.

**Interfaces:**
- `FIXADOS_MAX = 5`, `RECENTES_GUARDADOS = 20`, `VISIVEIS = 5`;
- `interface NegocioRecente { id; titulo; origemId; origem; telefone: string | null; foto: string | null }`;
- `interface Recentes { fixados: NegocioRecente[]; recentes: NegocioRecente[] }`;
- `chaveDosRecentes(orgId, userId)`, `lerRecentes(bruto)`, `comRecente(estado, novo)`, `fixar(estado, id): Recentes | "limite"`, `desafixar(estado, id)`, `linkDoRecente(r)` e `recenteDoLead(lead, origem)`;
- `useNegociosRecentes(chave: string | null)` devolve `{ fixados, recentes, registrar(novo), alternarFixo(id): "limite" | null }`;
- `useChaveDosRecentes(): string | null`, a partir de `useActiveOrg` e `useUser`;
- `SecaoRecentes({ chave, aberta, onAlternar })`;
- `COOKIE_RECENTES`, `PreferenciasDoPainel.recentesAbertos` e a preferência `{ nome: "recentes"; valor: "aberta" | "fechada" }`;
- `PainelOrigens` com `chaveDeRecentes?: string`;
- `KanbanBoard` com `aoFecharDossie?: () => void` e o `?lead=` que muda (só com ela).

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-recentes-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  FIXADOS_MAX, RECENTES_GUARDADOS, chaveDosRecentes, comRecente, desafixar, fixar, lerRecentes, linkDoRecente,
  type NegocioRecente, type Recentes,
} from "@/lib/escale/recentes/regras";

const id = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
const ORIGEM = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const r = (n: number): NegocioRecente => ({ id: id(n), titulo: `Negócio ${n}`, origemId: ORIGEM, origem: "Vendas", telefone: null, foto: null });
const VAZIO: Recentes = { fixados: [], recentes: [] };

describe("os Recentes (Clint superior: LAST_LEADS e PIN_LEAD)", () => {
  it("o aberto vai para o topo, sem repetir, e a lista guarda 20", () => {
    const cheio = Array.from({ length: RECENTES_GUARDADOS }, (_, i) => r(i + 1)).reduce(comRecente, VAZIO);
    expect(cheio.recentes).toHaveLength(20);
    expect(cheio.recentes[0]?.titulo).toBe("Negócio 20");
    const de_novo = comRecente(cheio, r(3));
    expect(de_novo.recentes[0]?.titulo).toBe("Negócio 3");
    expect(de_novo.recentes.filter((x) => x.id === id(3))).toHaveLength(1);
  });

  it("fixar tira dos recentes e põe nos fixados; abrir um fixado atualiza o dado sem duplicar", () => {
    const com2 = [r(1), r(2)].reduce(comRecente, VAZIO);
    const fixo = fixar(com2, id(1));
    expect(fixo).not.toBe("limite");
    const estado = fixo as Recentes;
    expect(estado.fixados.map((x) => x.id)).toEqual([id(1)]);
    expect(estado.recentes.map((x) => x.id)).toEqual([id(2)]);
    const renomeado = comRecente(estado, { ...r(1), titulo: "Novo nome" });
    expect(renomeado.fixados[0]?.titulo).toBe("Novo nome");
    expect(renomeado.recentes.map((x) => x.id)).toEqual([id(2)]);
    expect(desafixar(renomeado, id(1)).recentes.map((x) => x.id)).toEqual([id(1), id(2)]);
  });

  it("o sexto fixado não entra", () => {
    let estado = Array.from({ length: 6 }, (_, i) => r(i + 1)).reduce(comRecente, VAZIO);
    for (let n = 1; n <= FIXADOS_MAX; n += 1) estado = fixar(estado, id(n)) as Recentes;
    expect(fixar(estado, id(6))).toBe("limite");
  });

  it("o que vem do navegador é conferido; a chave é por organização e pessoa; o link abre no quadro da origem", () => {
    expect(lerRecentes(null)).toEqual(VAZIO);
    expect(lerRecentes("{quebrado")).toEqual(VAZIO);
    const bruto = JSON.stringify({ fixados: [r(1), { ...r(2), id: "lixo" }], recentes: [r(3), { id: id(4) }] });
    const lido = lerRecentes(bruto);
    expect(lido.fixados.map((x) => x.id)).toEqual([id(1)]);
    expect(lido.recentes.map((x) => x.id)).toEqual([id(3)]);
    expect(chaveDosRecentes("org-1", "u-1")).toBe("escale:negocios-recentes:v2:org-1:u-1");
    expect(linkDoRecente(r(1))).toBe(`/app/pipelines/${ORIGEM}?lead=${id(1)}`);
  });
});
```

Create `tests/unit/escale-secao-recentes.test.tsx`, com os mocks do v1 (`useT`, `next/link`) e mais `vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))`. Os casos:
1. Aberta e vazia: o `heading` "Recentes" e "Você não possui negócios recém trabalhados.".
2. Com 7 recentes no `localStorage`: aparecem 5 links. "Ver mais" mostra 7 e vira "Ver menos". O link do primeiro tem `href` `/app/pipelines/<origem>?lead=<id>`.
3. "Fixar" no terceiro: ele vai para o bloco de cima, que fica separado por um `role="separator"`, e o botão dele vira "Desafixar".
4. "Ver detalhes": aparecem "Vendas", "Sem empresa" e o link "Ligar" com `href="tel:+5511999990000"` .
5. Com 5 fixados, "Fixar" num sexto chama `toast.error("Você atingiu o limite. Desafixe algo pra fixar mais.")`.
6. Recolhida: nada listado. O chevron "Abrir os recentes" chama `onAlternar`.
7. Clicar num recente que não é o primeiro sobe ele para o topo (confira a ordem no `localStorage`).

Em `tests/unit/escale-origens-preferencias.test.ts` e `tests/unit/escale-painel-origens.test.tsx`, entram as mesmas mudanças 12a a 12f do Step 1 da Task 12 do v1. No 12f, o texto vazio passa a ser "Você não possui negócios recém trabalhados.".

Em `tests/unit/escale-colunas-com-prefs.test.tsx` (Task 8), acrescente um caso: o mock do `CardDaCasca` ganha um botão que chama `onOpen(lead.id)`. Clicar nele grava no `localStorage`, na chave `escale:negocios-recentes:v2:org-1:u-1`, um recente com o título e a origem. Faça o mesmo para o funil (`nomeDaOrigem="Vendas"`) e para a Visualização (`contexto.nomeDaOrigem`).

Em `tests/unit/escale-quadro-na-casca.test.tsx` (o teste do `KanbanBoard` com `aparencia="casca"` da V4), acrescente os três casos do `?lead=` do v1, com `aparencia="casca"`:
- um `?lead=` novo com o quadro aberto abre o dossiê, quando há `aoFecharDossie`;
- sem `aoFecharDossie`, não reabre;
- fechar o dossiê chama `aoFecharDossie`.

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-recentes-regras.test.ts tests/unit/escale-secao-recentes.test.tsx tests/unit/escale-origens-preferencias.test.ts tests/unit/escale-painel-origens.test.tsx tests/unit/escale-colunas-com-prefs.test.tsx tests/unit/escale-quadro-na-casca.test.tsx
```

- [ ] **Step 3: As regras e o hook**

Create `lib/escale/recentes/regras.ts`:

```ts
import { fotoDoContato } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";

/**
 * OS RECENTES DO PAINEL ORIGENS (fork Escale, Fase 1E; Clint superior,
 * `LAST_LEADS` e `PIN_LEAD`): os negócios abertos por último e os fixados. Moram
 * no navegador, por organização e pessoa. Tudo o que volta do navegador passa por
 * `lerRecentes`: o `localStorage` é de quem usa a máquina.
 */
export const FIXADOS_MAX = 5;
export const RECENTES_GUARDADOS = 20;
/** Quantos cada bloco mostra antes do "Ver mais". */
export const VISIVEIS = 5;

export interface NegocioRecente {
  id: string;
  titulo: string;
  origemId: string;
  /** O nome da origem quando o negócio foi aberto (o detalhe da linha). */
  origem: string;
  telefone: string | null;
  foto: string | null;
}

export interface Recentes {
  fixados: NegocioRecente[];
  recentes: NegocioRecente[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEXTO_MAX = 200;
const VAZIO: Recentes = { fixados: [], recentes: [] };

export const chaveDosRecentes = (orgId: string, userId: string) => `escale:negocios-recentes:v2:${orgId}:${userId}`;

function textoOuNulo(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v.slice(0, TEXTO_MAX) : null;
}

function lerItem(item: unknown): NegocioRecente[] {
  if (!item || typeof item !== "object") return [];
  const { id, titulo, origemId, origem, telefone, foto } = item as Record<string, unknown>;
  const valido =
    typeof id === "string" && UUID.test(id) && typeof origemId === "string" && UUID.test(origemId) &&
    typeof titulo === "string" && typeof origem === "string";
  if (!valido) return [];
  // A foto só vale como https: o `localStorage` não escolhe o que a página carrega.
  const fotoLida = textoOuNulo(foto);
  return [{
    id, origemId, titulo: titulo.slice(0, TEXTO_MAX), origem: origem.slice(0, TEXTO_MAX),
    telefone: textoOuNulo(telefone), foto: fotoLida?.startsWith("https://") ? fotoLida : null,
  }];
}

export function lerRecentes(bruto: string | null): Recentes {
  if (!bruto) return VAZIO;
  let lido: unknown;
  try {
    lido = JSON.parse(bruto);
  } catch {
    return VAZIO;
  }
  if (!lido || typeof lido !== "object") return VAZIO;
  const { fixados, recentes } = lido as Record<string, unknown>;
  const fix = (Array.isArray(fixados) ? fixados.flatMap(lerItem) : []).slice(0, FIXADOS_MAX);
  const ids = new Set(fix.map((x) => x.id));
  const rec = (Array.isArray(recentes) ? recentes.flatMap(lerItem) : []).filter((x) => !ids.has(x.id)).slice(0, RECENTES_GUARDADOS);
  return { fixados: fix, recentes: rec };
}

/** O aberto vai para o topo dos recentes; se está fixado, só o dado dele é atualizado. Devolve estado NOVO. */
export function comRecente(estado: Recentes, novo: NegocioRecente): Recentes {
  if (estado.fixados.some((x) => x.id === novo.id)) {
    return { ...estado, fixados: estado.fixados.map((x) => (x.id === novo.id ? novo : x)) };
  }
  return { ...estado, recentes: [novo, ...estado.recentes.filter((x) => x.id !== novo.id)].slice(0, RECENTES_GUARDADOS) };
}

export function fixar(estado: Recentes, id: string): Recentes | "limite" {
  const item = estado.recentes.find((x) => x.id === id);
  if (!item) return estado;
  if (estado.fixados.length >= FIXADOS_MAX) return "limite";
  return { fixados: [...estado.fixados, item], recentes: estado.recentes.filter((x) => x.id !== id) };
}

export function desafixar(estado: Recentes, id: string): Recentes {
  const item = estado.fixados.find((x) => x.id === id);
  if (!item) return estado;
  return { fixados: estado.fixados.filter((x) => x.id !== id), recentes: [item, ...estado.recentes].slice(0, RECENTES_GUARDADOS) };
}

/** O deep link do quadro (`?lead=`): abre o negócio no quadro da origem dele. */
export const linkDoRecente = (r: NegocioRecente) => `/app/pipelines/${r.origemId}?lead=${r.id}`;

export function recenteDoLead(lead: Lead, origem: string): NegocioRecente {
  return {
    id: lead.id,
    titulo: lead.title,
    origemId: lead.pipeline_id,
    origem,
    telefone: lead.contact_phone ?? null,
    foto: fotoDoContato(lead),
  };
}
```

Create `hooks/escale/useNegociosRecentes.ts` com o mesmo desenho do hook do v1 (Step 3 da Task 12):
- `useSyncExternalStore`, o evento próprio `escale:negocios-recentes` e o `storage`;
- a cache `ultimos` por chave, para devolver o mesmo objeto quando o texto não muda;
- `try/catch` em toda leitura e escrita do `localStorage`.

O que muda:
- o instantâneo é `Recentes`, e não uma lista. O vazio é uma constante do módulo, a mesma referência no servidor e no cliente;
- `registrar(novo)` grava `comRecente(lerRecentes(bruto), novo)`;
- `alternarFixo(id)` usa `desafixar` se o id está nos fixados, senão `fixar`. Devolve `"limite"` sem gravar nada quando `fixar` recusa, e `null` quando gravou.

No mesmo arquivo, acrescente:

```ts
/** A chave desta pessoa nesta organização, ou `null` antes de a sessão chegar. */
export function useChaveDosRecentes(): string | null {
  const usuario = useUser();
  const org = useActiveOrg();
  return org && usuario ? chaveDosRecentes(org.orgId, usuario.id) : null;
}
```

(import de `useActiveOrg` e `useUser` de `@/hooks/auth/AuthProvider`).

- [ ] **Step 4: A seção**

Create `components/escale/origens/SecaoRecentes.tsx` seguindo a tabela de Visual, no mesmo molde da `SecaoVisualizacoes` (V3):
- `<section aria-label={t("Recentes")}>`;
- o `CabecalhoDaSecao icone={<Clock size={16} />} titulo={t("Recentes")}`, com o chevron `aria-label={aberta ? t("Recolher os recentes") : t("Abrir os recentes")}` e `aria-expanded`;
- o estado local `verTodos: { fixados: boolean; recentes: boolean }` e `detalhe: string | null` (um aberto por vez);
- cada linha é um `<li className={cn("group/recente", LINHA, LINHA_COM_HOVER, "pr-1")}>`. Dentro:
  - o `<Link href={linkDoRecente(r)} onClick={() => registrar(r)} className="flex h-full min-w-0 flex-1 items-center gap-[7px] pl-4">`, com a foto ou a inicial e o nome;
  - o `<span className={cn(SO_NO_HOVER, "group-hover/recente:opacity-100")}>`, com o alfinete e a seta. No fixado, o alfinete fica sempre visível, fora do `SO_NO_HOVER`, e na cor da marca;
- o alfinete chama `alternarFixo(r.id)`. Se voltar `"limite"`, mostra o `toast.error(t("Você atingiu o limite. Desafixe algo pra fixar mais."))`;
- o detalhe segue a linha "Detalhe" da tabela de Visual. É um `<div className="mx-1 rounded-[6px] bg-surface px-0.5 py-1">` com duas linhas:
  - `<p className="pl-[67px] text-[10.4px]">{r.origem}</p>`;
  - um `<div className="flex items-center gap-1.5 pl-3.5 pr-3 text-[11px] font-bold">`, com o prédio, `t("Sem empresa")` e, no fim (`ml-auto`), `<a href={`tel:${r.telefone}`} aria-label={t("Ligar")} title={t("Ligar")} className="text-casca-marca"><Phone size={12} aria-hidden /></a>`. Sem telefone, um `<span>` cinza com `title={t("Sem telefone")}`;
- a divisória é um `<hr role="separator" className="border-casca-borda" />`, só quando há fixados e recentes;
- a foto é `<img src={r.foto} alt="" className="size-5 shrink-0 rounded-[5px] object-cover" />`. A inicial usa `corDoAvatar(r.id)` e `inicialDoNome(r.titulo)` de `@/lib/escale/quadro/aparencia`, num quadrado de 20px com raio 5 com 9px/600 branco. O `next/image` não serve: a foto vem de domínio do canal. Se o eslint pedir, siga o que a V4 fez no `FotoDoContato` (`PecasDoCard.tsx`).

- [ ] **Step 5: A preferência, o painel e o ComOrigens**

`lib/escale/origens/preferencias.ts`, `components/escale/origens/PainelOrigens.tsx` e `components/escale/origens/ComOrigens.tsx` levam as trocas do Step 4 da Task 12 do v1, com duas diferenças:
- no `PainelOrigens`, a seção entra no lugar do comentário que a V3 deixou ("RECENTES (01-010, terceira seção) entra AQUI com a Fase 1E…"). Troque o comentário inteiro por:

```tsx
          {/* Fase 1E: RECENTES (01-010, terceira seção), recolhida por padrão como na Clint. */}
          {!selecao && chaveDeRecentes && (
            <SecaoRecentes chave={chaveDeRecentes} aberta={recentesAbertos} onAlternar={alternarRecentes} />
          )}
```

- o `SecaoRecentes` é importado de `./SecaoRecentes`, ao lado dos outros imports locais.

- [ ] **Step 6: O card aberto entra nos Recentes**

Em `components/escale/quadro/ColunaDoFunilNaCasca.tsx`:
- importe `useChaveDosRecentes, useNegociosRecentes` de `@/hooks/escale/useNegociosRecentes` e `recenteDoLead` de `@/lib/escale/recentes/regras`;
- no corpo, `const { registrar } = useNegociosRecentes(useChaveDosRecentes());`;
- troque `onOpen={onOpen}` (no `CardDaCasca`) por:

```tsx
          onOpen={(id) => {
            onOpen?.(id);
            // Fase 1E: o negócio aberto entra nos Recentes do painel.
            registrar(recenteDoLead(lead, nomeDaOrigem ?? ""));
          }}
```

Em `components/escale/visualizacoes/ColunaDaVisualizacao.tsx`, faça o mesmo, com `origem` (o `contexto.nomeDaOrigem[lead.pipeline_id]` que a coluna já calcula para o card) no lugar do `nomeDaOrigem`.

- [ ] **Step 7: O `?lead=` que muda e o fechar que limpa a URL**

Em `components/kanban/KanbanBoard.tsx`:
- em `KanbanBoardProps`, depois do `podeSelecionarNaEtapa?` da Task 9, acrescente:

```tsx
  /**
   * FORK ESCALE · Fase 1E: o dossiê fechou (a página da casca tira o `?lead=` da
   * URL, para o mesmo Recente reabrir). Com ela, um `?lead=` NOVO com o quadro
   * aberto abre o dossiê dele. Sem ela, o contrato do original: o estado local manda.
   */
  aoFecharDossie?: () => void;
```

- desestruture `aoFecharDossie`;
- troque `const [dossieId, setDossieId] = useState<string | null>(leadInicial ?? null);` por ela mesma, seguida de:

```tsx
  // FORK ESCALE · Fase 1E: um link novo para `?lead=` (um Recente do painel) com
  // o quadro já aberto abre o dossiê dele. Ajuste no render, o padrão do React
  // para estado que segue prop, e só na casca (quem passa `aoFecharDossie`).
  const [leadInicialVisto, setLeadInicialVisto] = useState<string | null>(leadInicial ?? null);
  if (aoFecharDossie && (leadInicial ?? null) !== leadInicialVisto) {
    setLeadInicialVisto(leadInicial ?? null);
    if (leadInicial) setDossieId(leadInicial);
  }
```

- troque `onOpenChange={(v: boolean) => !v && setDossieId(null)}` por:

```tsx
          onOpenChange={(v: boolean) => {
            if (v) return;
            setDossieId(null);
            // FORK ESCALE · Fase 1E: a página da casca tira o `?lead=` da URL.
            aoFecharDossie?.();
          }}
```

Em `app/app/pipelines/[id]/_client.tsx`, no `<KanbanBoard …>`, depois do `podeSelecionarNaEtapa`, acrescente:

```tsx
          aoFecharDossie={
            cascaNova
              ? () => {
                  // FORK ESCALE · Fase 1E: o `?lead=` sai da URL ao fechar, para o mesmo Recente reabrir.
                  if (!searchParams.has("lead")) return;
                  const busca = new URLSearchParams(searchParams);
                  busca.delete("lead");
                  const qs = busca.toString();
                  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                }
              : undefined
          }
```

O negócio aberto pelo link já entrou nos Recentes no clique da seção (Step 4), então o quadro não registra o `?lead=` (o v1 fazia isso com um efeito; aqui ele não é preciso).

- [ ] **Step 8: Rodar e ver passar, com a cerca da hidratação**

```bash
corepack pnpm vitest run tests/unit/escale-recentes-regras.test.ts tests/unit/escale-secao-recentes.test.tsx tests/unit/escale-origens-preferencias.test.ts tests/unit/escale-painel-origens.test.tsx tests/unit/escale-com-origens.test.tsx tests/unit/escale-colunas-com-prefs.test.tsx tests/unit/escale-quadro-na-casca.test.tsx tests/unit/escale-coluna-da-casca.test.tsx tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx tests/unit/hidratacao-useState-nao-le-o-navegador.test.ts tests/unit/escale-quadro-ordenado.test.tsx
```
Se a cerca da hidratação reclamar, algum `useState` está lendo o `localStorage` no inicializador. Os Recentes leem só pelo `useSyncExternalStore`. Depois: typecheck, eslint e prettier nos arquivos novos.

- [ ] **Step 9: Commit**

```bash
git add lib/escale/recentes/regras.ts hooks/escale/useNegociosRecentes.ts components/escale/origens/SecaoRecentes.tsx lib/escale/origens/preferencias.ts components/escale/origens/PainelOrigens.tsx components/escale/origens/ComOrigens.tsx components/escale/quadro/ColunaDoFunilNaCasca.tsx components/escale/visualizacoes/ColunaDaVisualizacao.tsx components/kanban/KanbanBoard.tsx "app/app/pipelines/[id]/_client.tsx" tests/unit/escale-recentes-regras.test.ts tests/unit/escale-secao-recentes.test.tsx tests/unit/escale-origens-preferencias.test.ts tests/unit/escale-painel-origens.test.tsx tests/unit/escale-colunas-com-prefs.test.tsx tests/unit/escale-quadro-na-casca.test.tsx
git commit -m "feat(escale): RECENTES no painel Origens igual à Clint (fixados, ver mais, detalhe) e ?lead= que abre o dossiê

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: O espanhol de todos os textos da fase

**Files:**
- Modify: `lib/i18n/dicionario.ts`. O bloco novo entra logo ANTES da linha `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`.

- [ ] **Step 1: Ver a gate falhar**

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts 2>&1 | tail -30
```
Expected: FAIL, listando textos das telas novas sem espanhol.

- [ ] **Step 2: Inserir o bloco por script (pula o que já existe)**

O script é o do Step 2 da Task 13 do v1, sem mudar a lógica:
- recusa chave repetida na lista;
- confere a âncora da 1D;
- pula a chave que já existe (como `"chave":` ou como identificador solto);
- insere antes da âncora.

Só a lista `ENTRADAS` muda:

```js
const ENTRADAS = [
  // rotas
  ["Origem não encontrada.", "Origen no encontrado."],
  ["A preferência mudou em outra aba. Abra de novo e salve.", "La preferencia cambió en otra pestaña. Ábrala de nuevo y guarde."],
  ["Corpo não é JSON válido.", "El cuerpo no es un JSON válido."],
  // o card
  ["Sim", "Sí"],
  ["Não", "No"],
  ["Chamar", "Llamar"],
  ["Enviar Whatsapp", "Enviar WhatsApp"],
  ["Email", "Correo"],
  ["Copiar {label}", "Copiar {label}"],
  ["Copiado: {label}", "Copiado: {label}"],
  // Personalizar cards
  ["Personalizar cards", "Personalizar tarjetas"],
  ["Buscar por...", "Buscar por..."],
  ["Nenhum campo encontrado.", "Ningún campo encontrado."],
  ["Contato", "Contacto"],
  ["Empresa", "Empresa"],
  ["Negócio", "Negocio"],
  ["Ícones de canal no rodapé", "Íconos de canal en el pie"],
  ["Prévia da última mensagem", "Vista previa del último mensaje"],
  ["Nome da empresa", "Nombre de la empresa"],
  ["Valor do negócio", "Valor del negocio"],
  ["Idade do negócio", "Antigüedad del negocio"],
  ["Dono do negócio", "Dueño del negocio"],
  ["Atividades", "Actividades"],
  ["Tags", "Etiquetas"],
  ["Telefone", "Teléfono"],
  ["Mensagem", "Mensaje"],
  ["E-mail", "Correo"],
  ["Lembrete", "Recordatorio"],
  ["Agendamento", "Agendamiento"],

  ["Limite de 10 campos atingido", "Límite de 10 campos alcanzado"],
  ["Limite de 3 ícones no rodapé atingido", "Límite de 3 íconos en el pie alcanzado"],
  ["Pré-visualização", "Vista previa"],
  ["Este é um exemplo. Suas alterações aparecem no kanban depois de salvar.", "Este es un ejemplo. Sus cambios aparecen en el kanban después de guardar."],
  ["Cancelar", "Cancelar"],
  ["Salvar preferência", "Guardar preferencia"],
  ["Preferências salvas", "Preferencias guardadas"],
  ["Fechar", "Cerrar"],
  ["Exemplo", "Ejemplo"],
  ["Maria Silva", "María Silva"],
  ["Ana Souza", "Ana Souza"],
  ["Proposta", "Propuesta"],
  ["Oii Maria! Aqui é a Ana, posso te ajudar?", "¡Hola María! Soy Ana, ¿te puedo ayudar?"],
  // o ⋮ da etapa
  ["Ações da etapa", "Acciones de la etapa"],
  ["Selecionar todos...", "Seleccionar todos..."],
  ["Selecione", "Seleccione"],
  ["Escolha quantos negócios você quer selecionar", "Elija cuántos negocios quiere seleccionar"],
  ["Nenhum negócio nesta etapa", "Ningún negocio en esta etapa"],
  // + Adicionar negócio e Negócio +
  ["Adicionar negócio", "Agregar negocio"],
  ["Novo negócio", "Nuevo negocio"],
  ["Importar negócios", "Importar negocios"],
  ["Sem permissão", "Sin permiso"],
  // importar
  ["Baixar arquivo de exemplo .CSV", "Descargar archivo de ejemplo .CSV"],
  ["Arquivo .CSV", "Archivo .CSV"],
  ["Passos da importação", "Pasos de la importación"],
  ["Arquivo", "Archivo"],
  ["Mapeamento", "Mapeo"],
  ["Configurações", "Configuración"],
  ["Prévia e confirmação", "Vista previa y confirmación"],
  ["Contatos", "Contactos"],
  ["Negócios", "Negocios"],
  ["Importe contatos em Contatos", "Importe contactos en Contactos"],
  ["Escolha o arquivo .CSV para criar negócios", "Elija el archivo .CSV para crear negocios"],
  ["Seu arquivo precisa ter os campos importantes para mapear com a plataforma. No próximo passo você liga cada coluna a um campo da Escale OS.", "Su archivo necesita tener los campos importantes para mapear con la plataforma. En el próximo paso usted vincula cada columna a un campo de Escale OS."],
  ["Arraste o arquivo aqui ou clique para selecionar", "Arrastre el archivo aquí o haga clic para seleccionar"],
  ["Formato .CSV", "Formato .CSV"],
  ["Pronto para mapear", "Listo para mapear"],
  ["Mapeie os campos do seu arquivo", "Mapee los campos de su archivo"],
  ["Ligue cada coluna do seu arquivo a um campo da Escale OS.", "Vincule cada columna de su archivo a un campo de Escale OS."],
  ["Adicionar campo", "Agregar campo"],
  ["Coluna do arquivo", "Columna del archivo"],
  ["Mapear para", "Mapear a"],
  ["Não importar esse campo", "No importar este campo"],
  ["Configurações da importação", "Configuración de la importación"],
  ["Origem, etapa e status padrão dos negócios e a etiqueta aplicada aos contatos.", "Origen, etapa y estado estándar de los negocios y la etiqueta aplicada a los contactos."],
  ["Tags do contato", "Etiquetas del contacto"],
  ["Opcional. Aplicada a todos os contatos criados ou atualizados nesta importação.", "Opcional. Se aplica a todos los contactos creados o actualizados en esta importación."],
  ["Adicionar tag", "Agregar etiqueta"],
  ["Origem de destino", "Origen de destino"],
  ["A importação entra nesta origem", "La importación entra en este origen"],
  ["Etapa inicial padrão", "Etapa inicial estándar"],
  ["Aberto", "Abierto"],
  ["Confira e confirme a importação", "Revise y confirme la importación"],
  ["Revise os detalhes antes de iniciar.", "Revise los detalles antes de iniciar."],
  ["Tipo", "Tipo"],
  ["Campos mapeados", "Campos mapeados"],
  ["Linhas", "Filas"],
  ["A importação conclui agora.", "La importación concluye ahora."],
  ["Os negócios entram na etapa escolhida. As linhas recusadas aparecem com o motivo logo depois.", "Los negocios entran en la etapa elegida. Las filas rechazadas aparecen con el motivo justo después."],
  ["Confirme sua ação", "Confirme su acción"],
  ["Confirmar", "Confirmar"],
  ["Ordenar", "Ordenar"],
  ["Configurações da origem", "Configuración del origen"],
  ["Apenas arquivos CSV são aceitos.", "Solo se aceptan archivos CSV."],
  ["O arquivo CSV excede o limite máximo de 5 MB.", "El archivo CSV supera el límite máximo de 5 MB."],
  ["A planilha passa de 500 linhas. Divida em arquivos menores.", "La planilla supera las 500 filas. Divídala en archivos más pequeños."],
  ["Campo da coluna", "Campo de la columna"],
  ["Nome do negócio", "Nombre del negocio"],
  ["Nome do contato", "Nombre del contacto"],
  ["Observação", "Observación"],
  ["Fonte", "Fuente"],
  ["Para continuar você precisa associar pelo menos o nome do negócio ou do contato.", "Para continuar necesita asociar al menos el nombre del negocio o del contacto."],
  ["Continuar", "Continuar"],
  ["Voltar", "Volver"],
  ["Origem", "Origen"],
  ["Confirmar e importar", "Confirmar e importar"],
  ["{n} negócio criado", "{n} negocio creado"],
  ["{n} negócios criados", "{n} negocios creados"],
  ["{n} contato criado", "{n} contacto creado"],
  ["{n} contatos criados", "{n} contactos creados"],
  ["Linha {linha}: {motivo}", "Fila {linha}: {motivo}"],
  ["Não consegui ler essa planilha.", "No pude leer esa planilla."],
  ["Não consegui enviar o arquivo.", "No pude enviar el archivo."],
  // exportar
  ["Exportar {n} Negócio", "Exportar {n} Negocio"],
  ["Exportar {n} Negócios", "Exportar {n} Negocios"],
  ["Nenhum negócio para exportar.", "Ningún negocio para exportar."],
  ["Tem certeza que deseja exportar os negócios dessa origem?", "¿Seguro que desea exportar los negocios de este origen?"],
  ["Os negócios foram exportados com sucesso.", "Los negocios fueron exportados con éxito."],
  ["Falha ao exportar os negócios, tente novamente ou chame o suporte.", "Falló la exportación de los negocios, inténtelo de nuevo o llame al soporte."],
  ["Ganho", "Ganado"],
  ["Perdido", "Perdido"],
  ["Título", "Título"],
  ["Moeda", "Moneda"],
  ["Criado em", "Creado el"],
  ["Atualizado em", "Actualizado el"],
  // RECENTES
  ["Recentes", "Recientes"],
  ["Recolher os recentes", "Contraer los recientes"],
  ["Abrir os recentes", "Abrir los recientes"],
  ["Você não possui negócios recém trabalhados.", "No tiene negocios trabajados recientemente."],
  ["Você atingiu o limite. Desafixe algo pra fixar mais.", "Alcanzó el límite. Desfije algo para fijar más."],
  ["Fixar", "Fijar"],
  ["Desafixar", "Desfijar"],
  ["Ver detalhes", "Ver detalles"],
  ["Esconder detalhes", "Ocultar detalles"],
  ["Sem empresa", "Sin empresa"],
  ["Sem telefone", "Sin teléfono"],
  ["Ver mais", "Ver más"],
  ["Ver menos", "Ver menos"],
];
```

Expected: o script imprime "N entradas novas; M já existiam", com N + M = o tamanho da lista. A lista não traz texto que o dicionário já tem com outro espanhol: o script não muda tradução existente.

Antes de rodar, confira duas coisas:
- "Em breve" ("Próximamente") e "Email" ("Correo") já estão no dicionário e ficam fora da lista. "Ligar" também: a Task 6 (Step 0b) trocou a tradução dela para "Llamar";
- "PASSO N DE 3" sai de `t("Passo {n} de 3")` com `uppercase` no CSS. Não escreva o texto em maiúsculas no `t()`.

- [ ] **Step 3: Rodar a gate e o typecheck**

Os mesmos do Step 3 da Task 13 do v1, com a conferência das rotas trocada por:

```bash
grep -ohE 't\("[^"]+"' app/api/v1/capas-do-card/route.ts app/api/v1/exportacoes-do-quadro/route.ts lib/escale/capa/banco.ts | sed 's/^t("//; s/"$//' | sort -u
```

Cada texto listado tem de estar na lista ou já existir no dicionário.

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol dos textos da Fase 1E

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Gates, conferência visual, PRD e PR

**Files:**
- Modify: `../docs/modulos/1-negocios.md` (fora do repositório)
- Nenhum arquivo novo no repositório.

- [ ] **Step 1: Os gates inteiros**

Os mesmos do Step 1 da Task 14 do v1, sem mudar nada:
- `typecheck`, `lint`, `lint:channels` e `lint:role-rank`;
- `git fetch escale-crm main` e `bash scripts/checar-colisao-de-migration.sh escale-crm/main` (nunca sem argumento: a base padrão é o repositório do Rafael);
- `cercas` e `test:unit`;
- a prova de não-regressão num worktree temporário de `escale-crm/main`.

- [ ] **Step 2: A prova no Postgres inteira**

A mesma do Step 2 da Task 14 do v1: `docker info`, `test:db` e `test:db:update`. Se o Docker não responder, PARE e peça ao usuário para abrir o Docker Desktop.

- [ ] **Step 3: A conferência visual (contrato, regra única)**

Pelo CAMINHO A (local, com banco de teste) ou pelo CAMINHO B (depois do deploy, pelo Claude in Chrome, só lendo a tela, em 1536×~880), compare cada peça com o PNG da tabela "Referência visual":

| Peça | PNG | O que conferir |
|---|---|---|
| Card padrão | `card1.png`, 01-010 | idêntico à V4 (a preferência padrão não muda nada) |
| Card no hover | `20`, `v2-16` | a caixinha de seleção no lugar da foto |
| Card com a preferência | sem print (PRINT 36) | tags, prévia, ícones e valor somem e voltam; os chips dos campos ficam abaixo do rodapé |
| Personalizar cards | `33a`, `33b`, `v2-12` a `v2-15`, 01-019 | o ícone de ajustes depois do atualizar com a dica lavanda; 820px, a grade 400px/1fr, os grupos com contagem, o interruptor 28×16, a dica de limite, a prévia, "Salvar preferência" |
| Linha de contagem | `v2-01`, `16a`, `15` | Ordenar · Atualizar · Personalizar · Exportar · Engrenagem (desligada) · Ajuda |
| Ordenar | `v2-19` | o botão "↑↓ Ordenar" e o painel (um critério) |
| ⋮ da coluna | `18a` a `18f`, `v2-04` | o menu sem borda de 200px, o campo numérico com setinhas em 0, o (?) com a dica, o hover `#EFF6FF`/`#4F46E5` |
| + Adicionar negócio | 01-010 | à esquerda, com o "+" no texto |
| Negócio + | `19a`, `19b`, `v2-05` | 95×32, o "+" vira "×", o menu sem borda de 152px |
| Importar | `v2-06` a `v2-11` | os 4 passos com o indicador, a área de arquivo, o mapeamento sugerido, as configurações, a prévia |
| Exportar | `16a`, `v2-03` | o ícone na linha da v1, a dica, a janela "Confirme sua ação" |
| RECENTES | `11a`, `11b`, `34a`, `34b` | o cabeçalho de 48px; a linha de 39px com a foto de raio 5; o detalhe na caixa branca |

O que não tem print fica conferido pela tabela de Visual da task e entra na lista "Prints que faltam" do PR. Diferença em peça **com** print, sem justificativa aprovada, faz a tarefa não estar pronta. Ela vai num PR `fix/fase-1e-conferencia`.

- [ ] **Step 4: Atualizar o PRD (fora do repositório)**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`, as trocas 3a a 3e do Step 3 da Task 14 do v1, com duas mudanças:
- na 3a, a resposta passa a citar "Selecionar todos..." (três pontos) e a data 16/10;
- uma troca nova, 3f: na decisão de 15/10 sobre a capa (§5, "padrão por origem"), acrescente "**Revista em 16/10 (plano 1E v2):** a capa é só da pessoa, como na Clint (`user_set_ui_pref`, `kanban_card`). O padrão da origem volta se o usuário pedir.". O usuário confirmou E1 em 16/10.

- [ ] **Step 5: Push e PR**

```bash
git push -u escale-crm feat/fase-1e-capa-e-acoes-do-quadro
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-1e-capa-e-acoes-do-quadro \
  --title "feat(escale): Fase 1E — capa do card e ações do quadro, iguais à Clint" \
  --body-file - <<'PR'
## O que muda

Com a **casca nova** (`escale_menu=topo`), o quadro de Negócios ganha os itens B10 a B15 e A3 do PRD, no visual da Clint e com as peças da casca (V1 a V4):

- **Personalizar cards (B10).**
  - Abre pelo ícone de ajustes da linha de contagem, como na Clint v2. A engrenagem fica desligada até a 1F, e o "Ordenar" virou botão.
  - A janela é a da v2: busca, os grupos Contato, Empresa, Negócio e Ícones de canal no rodapé, e a prévia com o card de verdade.
  - A preferência é da pessoa e vale em todas as origens, como na Clint. Os limites são de 10 campos e 3 ícones.
  - Os campos escolhidos viram chips no card.
- **Atalhos do card (B11):** os da V4, com as dicas da Clint ("Ligar", "Enviar Whatsapp", "Email").
- **⋮ da etapa (B12):** "Selecionar todos..." e "Selecione [N]", com o campo numérico da Clint. Só no funil, para agent ou acima.
- **"+ Adicionar negócio" (B13):** à esquerda, como na Clint, e já na etapa da coluna.
- **"Negócio +" (B14):** o menu Novo negócio / Importar negócios. A importação segue o fluxo da Clint v2: Arquivo, Mapeamento (com sugestão), Configurações (tags, etapa) e Prévia. O passo "Decisões" (duplicidade) fica para uma fase própria.
- **Ordenar** vira o botão da Clint v2 na linha de contagem, e os filtros salvos vão para o rodapé do "Mais filtros". A engrenagem fica desligada até a 1F (configuração da origem).
- **Exportar (B15).**
  - É o ícone da linha de contagem (lugar da Clint v1), com a janela "Confirme sua ação" da Clint v2.
  - Só para gerente ou acima, e só no funil.
  - O CSV é o recorte da tela, com guarda contra fórmula, e a exportação é auditada.
- **RECENTES (A3):** a seção do painel, com fixados (até 5), recentes, "Ver mais" e o detalhe. Clicar abre o dossiê pelo `?lead=`.

Com a lateral, nada muda.

## Banco

Migration **9005**: `crm_capas_do_card`, uma linha por pessoa.
- RLS: lê a própria (ou platform admin) e escreve a própria com papel `viewer` ou acima (`fn_role_at_least`, a cerca de RBAC da 0150).
- FK composta com cascade e índice único por organização e pessoa.
- Auditoria: `card_cover.updated` e `pipeline.cards_exported`. O 500 inesperado responde a mensagem genérica, e o erro do banco vai só para o log.

## Encaixes no código do original

Todos marcados `FORK ESCALE · Fase 1E`:
- `KanbanBoard`: os campos do card e o nome da origem para a coluna da casca, `podeSelecionarNaEtapa`, `aoFecharDossie` e o `?lead=` que muda (só com ela);
- `NewLeadDialog`: `etapaInicial`;
- `lib/leads/planilha.ts`: `export` na `campoDaColuna`;
- a página do funil.

`KanbanCard`, `StageColumn` e `ContatoNoCard` não mudam, e as cercas do card continuam verdes.

## Decisões e diferenças da Clint (aprovadas no plano)

E1 a E14 do plano `docs/superpowers/plans/2026-10-16-fase-1e-capa-e-acoes-do-quadro-v2.md`. As que mudam o que a pessoa vê:
- "Nome da empresa", "Lembrete" e "Agendamento" aparecem desligados, com "Em breve";
- a importação usa a origem do quadro, o status "Em aberto", o nosso limite (5 MB, 500 linhas) e mostra o resumo na hora;
- "Ligar" passa a ser só ligação no produto todo ("Llamar", "Call"), e o interruptor das regras de webhook e do "Cliente pela agenda" passa a dizer "Ativar".

## Prints que faltam

Os prints de 16/10 estão em `docs/clint/prints-1e/` (fora do repositório). Faltam 34 (parte), 36 e 41: ver a lista no plano. As peças sem print seguem o código da Clint.

## Limitações conhecidas

- O dossiê só abre o negócio que o quadro mostra. Um Recente ganho ou perdido não abre com o filtro "Em aberto". A ficha em tela própria é da 1G.
- O valor dos campos sai cru ("5000", "2026-10-15").
- No CSV, o telefone sai com apóstrofo (`'+55…`), a guarda contra fórmula.
- A auditoria da exportação é melhor esforço: a trava é o papel.

## Verificação

- [ ] `typecheck`, `lint`, `lint:channels`, `lint:role-rank`, colisão de migration, `cercas` e `test:unit` (só as falhas conhecidas do Windows).
- [ ] `test:db` e `test:db:update` verdes.
- [ ] Conferência visual (Task 16, Step 3).
- [ ] Na tela, com a casca nova (usuário):
  - [ ] Personalizar cards: desligar o valor aparece na prévia e, depois de salvar, no quadro; o ponto no ícone de ajustes aparece;
  - [ ] ⋮ da etapa → Selecione 2 marca os 2 primeiros, e a barra de lote aparece;
  - [ ] "+ Adicionar negócio" na Proposta cria na Proposta;
  - [ ] Negócio + → Importar negócios com o modelo, mapeando as colunas, cria os negócios na etapa escolhida;
  - [ ] Exportar → Sim baixa o CSV com os cards filtrados;
  - [ ] abrir um negócio, ver nos Recentes, fixar, e clicar nele com o quadro aberto abre o dossiê.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PR
```

Expected: a URL do PR. Mostre a URL ao usuário e PARE: merge, tag, release e VPS só com o "pode fazer" dele.

---

## Prints que faltam

**Tirados em 16/10** (Clint v1 e v2, mais os dois do usuário) e salvos em `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\`, com as medidas lidas do CSS no `README.md` da pasta: 11, 15, 16, 18, 19, 20, 33, 34 (parte), 37 a 40 e `v2-01` a `v2-19`.

Ainda faltam, porque pedem gravar algo na Clint ou um dado que esta conta não tem:

| # | O quê | Para qual task | Por que falta |
|---|---|---|---|
| 20b | Card sendo arrastado | 6 | soltar o card muda a etapa dele |
| 34 | RECENTES com um negócio fixado, o "Ver mais", o vazio e o aviso de limite de fixados | 14 | fixar grava na Clint; a conta só tem um recente |
| 35 | "Salvar preferência" ligado, o aviso "Preferências salvas" e o ponto no ícone de ajustes | 7 | salvar grava na Clint |
| 36 | Card com campos personalizados escolhidos (os chips) e o hover de um chip | 6 | nenhum campo escolhido na conta |
| 40b | O que aparece depois de "Confirmar e importar" (v2) | 12 | importar grava na Clint |
| 41 | Onde a Clint v1 mostra "Meus filtros" (filtros salvos) | 7B | a v2 não mostra no quadro, e a v1 não foi achada |
| 16b | O aviso de exportação concluída | 13 | exportar grava na Clint |

Sem esses prints, as tasks seguem o código e os textos da Clint (as tabelas de Visual de cada task). Quando chegarem, a conferência visual (Task 16, Step 3) compara com eles. O que divergir vai no PR `fix/fase-1e-conferencia`.
