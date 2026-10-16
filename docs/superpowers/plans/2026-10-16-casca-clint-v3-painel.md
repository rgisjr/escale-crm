# Casca igual à Clint — V3: Painel esquerdo de Negócios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o painel esquerdo de Negócios da casca nova **idêntico ao da Clint, variante com menu superior**:
- a coluna de 250px, branca, colada no topo, na esquerda e no fundo da tela, com a borda direita `#E8E4F5` e a bolinha "<" centrada na borda (hoje é um cartão flutuante);
- os cabeçalhos ORIGENS e VISUALIZAÇÕES de 48px, com ícone, título 11px/600 em caixa alta, lupa e chevron;
- as linhas de grupo, de origem e de visualização de 34px, com o quadradinho colorido de 20px, a seta, o "+" e o "⋮" que aparecem no hover, e a origem aberta com o fundo `#EFF3FF` e a barra de 3px da marca;
- os menus ⋮ do grupo e da origem iguais a 01-032 e 01-033 (ícones, ordem, divisória, "Excluir" em vermelho, raio 8, sombra do painel);
- a dica escura "Nova origem" no "+" do grupo (01-034);
- as janelas do painel no visual do modal da Clint (01-013): campos `#EFF3FF` sem borda, "Cancelar" branco com borda e "Salvar" verde-menta, com a caixinha e o seletor da casca no lugar dos controles nativos e do `SearchableSelect`.

**Architecture:** O painel inteiro (`components/escale/origens/*` e `components/escale/visualizacoes/{SecaoVisualizacoes,RodapeDaSelecao,JanelasDaVisualizacao}.tsx`) é código do fork e só monta com a casca nova (`ComOrigens` devolve `children` puro quando `escale_menu ≠ topo`). Por isso as classes mudam direto nesses arquivos, sem ramo "com casca/sem casca". Nada do original muda: o menu e o modal da Clint saem de **embrulhos do fork** (`MenuDoPainel.tsx`, `JanelaDaCasca.tsx`, `DicaEscura.tsx`) sobre as primitivas `components/ui/*`, com classes por cima (`cn` = `tailwind-merge`). As medidas repetidas moram num arquivo só (`estilos-do-painel.ts`). As três cores da Clint que não são marca (cinza do hover, verde-menta do "Salvar" e o texto dele) entram como variáveis CSS só da casca em `app/escale-tema.css`, lidas por valor arbitrário (`bg-(--escale-salvar)`), como a `--color-escale-marca`. As cores dos ícones de grupo continuam gravadas como tons da paleta das etiquetas (dado do usuário); a tela traduz cada tom para a cor da Clint mais próxima (`lib/escale/origens/cores-da-casca.ts`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, Radix (DropdownMenu, Dialog, Tooltip), Tailwind 4, `lucide-react` 1.52 via `@/lib/ui/icons-da-casca`, componentes da casca da V1 (`CaixaDaCasca`, `SeletorDaCasca`, `BotaoDaCasca`), Vitest + Testing Library.

**Referências (ler antes de começar):**
- Contrato comum V1–V4: `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\contrato-casca-igual-a-clint.md` (no repositório, depois da V1: `docs/escale/clint/contrato-casca-igual-a-clint.md`).
- Design system extraído: `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\clint-design-system.md` — §3.5 (cores dos ícones de origem), §4 (raios, sombras), §5 (ícones dos menus), §6.5 (menus), §6.14 (sidebar), §6.15 (tooltips), §6.17 (modal).
- Spec tela a tela: `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\clint-telas.md` — §2 (painel esquerdo, 2.1 a 2.8), §7 itens 8–14, §8 e §9. **Ela mede em px do print: divida por 1,25.**
- Inventário e cercas: `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\inventario-escale.md` — §2 e §5.
- Recortes ampliados: `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\crops\` (leftpanel.png, m032.png).
- Capturas da Clint (abrir o PNG): `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\`
  - variante superior (alvo): 01-010-kanban-v1.png, 01-011-detalhe-negocio-v1.png, 01-013-configuracao-origem-v1.png, 01-032-menu-grupo-origens.png, 01-033-menu-origem.png, 01-034-nova-origem.png;
  - variante lateral (só comportamento e componentes que a superior não mostra): 01-014-grupos-origens-visualizacoes.png, 01-026-configuracao-visualizacoes.png.
  - Fichas: `...\01-negocios\telas\01-010-kanban-v1.md`, `01-032-menu-grupo-origens.md`, `01-033-menu-origem.md`, `01-034-nova-origem.md`.
- O Escale de hoje, para comparar: C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-do-usuario\2026-10-15-escale-atual.png.

### Medidas que este plano usa (já em px de CSS)

Medidas tiradas para este plano por leitura de pixel. Em 01-010 vale "print ÷ 1,25". Os JPEGs 01-032/033/034 têm o painel com 250px de largura, então já estão em px de CSS.

| O quê | Medida | De onde |
|---|---|---|
| Largura do painel | 250px, borda direita 1px `#E8E4F5` | 01-010, borda em x=312 do print |
| Bolinha "<" | círculo de 20px, borda `#E8E4F5`, sombra curta para baixo, chevron `#2F2C5D`; centro na borda direita; topo 16px abaixo do topo do painel | 01-010, x 299–323 e y 82–106 do print |
| Espaço acima de ORIGENS | 78px | 01-010, do topo do painel (y 62) ao cabeçalho (y 160) |
| Cabeçalho de seção | 48px com a divisória embaixo; ícone de 16px a 16px da borda; título a 44px, 11px/600 em caixa alta, `#2F2C5D`; lupa e chevron a 12px da borda direita | 01-010, divisórias em y 220/662/722 do print |
| Linha de grupo, de origem e de visualização | 34px; quadradinho 20×20, raio 4, a 16px da borda; texto 12px a 43px da borda | 01-010 (ícone x 21–45 do print), 01-032 (texto das origens em x=43) |
| Hover da linha e linha do grupo aberto | `#F3F3F3`, de borda a borda | 01-032/033/034 |
| Origem aberta | fundo `#EFF3FF` e barra de 3px da marca na borda esquerda (x 0–2) | 01-032, linha "Leads INSS Whatsapp" |
| Seta do grupo | na margem esquerda (x 3–12) | 01-032/034 |
| "+" e "⋮" do grupo | centros a 211px e 235px da borda | 01-032 |
| Menu ⋮ do grupo | x 252–469, y 56–287: itens de 36px, 4px de respiro, divisória antes de "Arquivar", sem borda, sombra | 01-032 |
| Dica "Nova origem" | balão `#3E3971` (≈ `#3E3A6F`), 24px de altura, texto branco, seta para baixo, acima do "+" | 01-034 |
| Modal (01-013) | cortina ≈ 55% de preto (`#6D6F74` sobre branco); raio ≈ 8; título ≈ 22px/400 `#2F2C5D`; rótulo ≈ 13px/500; campo `#EFF3FF` de 43px, texto a 20px da borda; "Cancelar" branco com borda; "Salvar" `#35EFB3` com texto `#2F2C5D` (no print os dois a ~60%, porque o botão está desligado) | 01-013 |
| Ícone de ORIGENS | dois quadrados à esquerda e um retângulo alto à direita = `LayoutPanelLeft` espelhado | 01-010 ampliado |
| Ícone de VISUALIZAÇÕES | quadrado tracejado com três barras = `SquareDashedKanban` | 01-010 ampliado |

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- **Base:** `escale-crm/main` **com a V1 e a V2 já mergeadas** (planos `2026-10-16-casca-clint-v1-fundacao.md` e `2026-10-16-casca-clint-v2-topo.md`). A Task 1 confere isso. Se faltar qualquer peça, PARE e pergunte ao usuário.
- **Branch:** `feat/casca-clint-v3-painel`.
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Remotes:** `escale-crm` é o repositório do usuário; `origin` é o do Rafael.
- **Proibido:**
  - dar push em `origin`;
  - mergear o PR;
  - publicar tag ou release;
  - mexer na VPS;
  - gravar no banco (esta parte não tem migration nem escrita de dado).

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm` (o `pnpm` não está no PATH).
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- **Falhas que não são regressão:** testes que falham NESTA máquina Windows e também em `escale-crm/main` (pdfjs com caminho `C:\…`, `spawnSync bash ENOENT`, `chmod 600`, caminho com espaço, `EPERM` em pasta temporária). Regressão é teste que passa em `escale-crm/main` e falha na branch. Ver a memória `sincronizar-com-o-rafael`.

### Regras de produto (CLAUDE.md e contrato)

- **Tudo idêntico à Clint, variante com menu superior.** Só a marca é nossa: onde a Clint usa o roxo (`#6C19DE`/`#7C00FF`), entra a cor da marca da organização (`casca-marca`, que é `var(--color-accent)`), no mesmo lugar e com o mesmo peso.
- **Cor que não é o roxo da marca se copia.** O "Salvar" verde-menta do modal da variante superior (01-013, `#35EFB3`, `clint.green 400`) não é marca: entra igual. O cinza `#F3F3F3` do hover também.
- **Nunca controle nativo** no lugar de componente da Clint: as caixinhas nativas viram `CaixaDaCasca` e o `SearchableSelect` vira `SeletorDaCasca`. Os dois `<input type="radio">` de "Quem vê" ficam nativos: o contrato não tem rádio, e não há print da Clint dessa janela (fica na lista do relatório).
- **Sem print, não se inventa.** O que a pasta não mostra mantém o comportamento de hoje, só com o visual da casca. Cada ponto assim está em "Prints que faltam desta parte".
- **Bugs da Clint não se copiam.**
- **Sem a casca nada muda.** O painel só monta com `escale_menu=topo`. A Task 5 prova isso com teste, e a Task 9 prova com `git diff` que nenhum arquivo do original foi tocado.

### Onde o fork entra

- Esta parte **não** toca arquivo do original. Só arquivos do fork:
  - `components/escale/origens/*`;
  - `components/escale/visualizacoes/{SecaoVisualizacoes,RodapeDaSelecao,JanelasDaVisualizacao}.tsx`;
  - `lib/escale/origens/cores-da-casca.ts` (novo);
  - `app/escale-tema.css` (bloco novo no fim);
  - `lib/ui/icons-da-casca.ts` (nomes novos no fim, como o contrato manda);
  - `lib/i18n/dicionario.ts` (bloco do fork).
- `lib/i18n/dicionario.ts` é arquivo do original com blocos do fork: o bloco da V3 entra logo ANTES da linha `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` (ponto fixo, independe do que a V1 e a V2 puseram).

### Textos e i18n

- Todo texto de tela passa por `t()` com literal e tem espanhol no dicionário (cerca `tests/unit/i18n-espanhol-cobre-a-tela.test.ts`).
- Chave repetida no dicionário quebra o typecheck: o script da Task 2 PULA as chaves que já existem.
- Os `aria-label` que os testes do fork usam **não mudam** (`Origens`, `Funis por grupo`, `Buscar grupo ou funil`, `Adicionar`, `Recolher o painel de origens`, `Abrir o painel de origens`, `Recolher a lista de origens`, `Abrir a lista de origens`, `Abrir <grupo>`, `Fechar <grupo>`, `Nova origem em <grupo>`, `Mais ações de <nome>`, `Selecionar <grupo>`, `Nome da nova origem`, `Criar visualização`, `Recolher as visualizações`, `Abrir as visualizações`, e os das janelas).

### Cercas que esta parte toca (manter verdes)

- `tests/unit/escale-painel-origens.test.tsx` (~30 casos), `tests/unit/escale-janelas-de-origens.test.tsx`, `tests/unit/escale-janelas-da-visualizacao.test.tsx`, `tests/unit/escale-com-origens.test.tsx`: continuam verdes **sem mudar nenhuma linha que já existe**. Os casos novos da V3 entram em blocos `describe("casca V3 — …")` no fim.
- `tests/unit/tailwind-tokens.test.ts`: nada de `rounded` puro, `shadow` puro, `outline-none` ou `flex-shrink-*`.
- `tests/unit/altura-fixa-le-a-reserva-do-rodape.test.ts`: a altura do painel é `calc(100dvh-2.75rem)`, sem `var(--space-N)`.
- `tests/unit/controle-decorativo.test.ts`: esta parte não usa `<Button>` do original nos arquivos que reescreve.
- `tests/unit/selecao-longa-tem-busca.test.ts`: nenhum `<select>`/`SelectContent` novo.
- `tests/unit/chip-contraste-da-etiqueta.test.ts`: o caso "`estiloDoChip` é importado só pelo chip" hoje acusa `components/escale/origens/IconeDoGrupo.tsx` (pendência registrada na memória `sincronizar-com-o-rafael`). A Task 3 tira o `estiloDoChip` dali, e o caso fica verde.
- `tests/unit/escale-tema.test.ts`: o bloco novo vai no FIM de `app/escale-tema.css`; os blocos que o teste lê são os primeiros do arquivo e não mudam.

### Conferência na tela (critério de pronto das Tasks 4 a 7, e a Task 8 inteira)

O contrato manda: tarefa visual só está pronta depois de aberta no navegador e comparada lado a lado com o PNG. Procedimento:

1. **Onde conferir (regra única dos planos V1 a V4, contrato "Conferência visual").** Da raiz do repositório:
   ```bash
   cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
   if test -s .env.local \
     && grep -Eq '^NEXT_PUBLIC_SUPABASE_URL=.?https?://(127\.0\.0\.1|localhost)[:/]' .env.local \
     && ! grep -Eq 'jsrzgxyioczdgwiklkrc|hwpnnstguqrfhfnsvthv|escaleia\.com' .env.local; then
     echo "CAMINHO A: local, com banco de teste"
   else
     echo "CAMINHO B: conferir depois do deploy"
   fi
   ```
   - **`CAMINHO A`** (existe `.env.local` e ele aponta para um Supabase local, não para o de produção): siga os passos 2 a 6 abaixo, no `http://localhost:3000`.
   - **`CAMINHO B`** (o normal hoje: em 16/10 não havia `.env.local`):
     - **não** crie `.env.local`, **não** suba o Supabase local nem o Docker sem o "pode fazer" do usuário e **nunca** aponte o dev server para o banco de produção (`jsrzgxyioczdgwiklkrc`) nem para o antigo (`hwpnnstguqrfhfnsvthv`);
     - os passos "Siga Conferência na tela" das Tasks 4 a 7 viram "conferência pendente" no relatório de cada uma (a task fica pronta pelos testes), e a Task 8, depois do deploy, faz também as conferências das Tasks 4 a 7. Vá para a Task 9; no corpo do PR, `<lista da Task 8, Step 4>` vira as dez diferenças conhecidas da Task 8 mais a linha "Conferência visual pendente: feita depois do deploy, em https://app.escaleia.com, pela regra do contrato; as diferenças medidas vão num PR de correção (`fix/casca-clint-v3-conferencia`)";
     - **depois do deploy** (quando o usuário avisar que mergeou, publicou a versão e atualizou a VPS; nada disso é deste plano), faça a Task 8 no app de produção: carregue a skill `chrome-browser` e as ferramentas do Claude in Chrome (`mcp__claude-in-chrome__*`) num único ToolSearch, trabalhe numa aba nova e use `https://app.escaleia.com` no lugar de `http://localhost:3000`, com a sessão do próprio usuário (se pedir login, PARE e peça para ele entrar; nunca digite senha). Não suba dev server;
     - **só leitura:** navegar, abrir e fechar menus, dicas e janelas (Esc ou "Cancelar"), passar o mouse, ler a página, medir com `javascript_tool` e tirar captura. Proibido criar, renomear, mover, arquivar, excluir, customizar ou salvar grupo, origem ou visualização: é o banco de produção;
     - a lista das diferenças (cada uma com o porquê) vai num **PR de correção**: branch `fix/casca-clint-v3-conferencia` a partir de `escale-crm/main`, cada conserto com o teste da peça, commits com o rodapé `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, PR para `rgisjr/escale-crm` com o corpo terminando em `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Sem push em `origin`, sem merge, sem release, sem VPS.
2. CAMINHO A: suba o dev server em segundo plano: `corepack pnpm dev` (porta 3000). CAMINHO B: não há dev server.
3. No navegador, entre (CAMINHO A: usuário de teste; CAMINHO B: a sessão do usuário) e abra `<base>/app/escale/menu?usar=topo&voltar=/app/escale/negocios`, com `<base>` = `http://localhost:3000` ou `https://app.escaleia.com`. Isso grava o cookie da casca nova e abre o último funil.
4. Deixe a janela com **1526×804 px de área útil** (no Claude in Chrome, `resize_window`). É o 01-010 (1907×1005) dividido por 1,25.
5. Rode no console o medidor abaixo e compare com a coluna "Esperado":
   ```js
   (() => {
     const caixa = (el) => {
       if (!el) return null;
       const r = el.getBoundingClientRect();
       return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
     };
     const painel = document.querySelector('aside[aria-label="Origens"]');
     const bolinha = painel?.querySelector('button[aria-label="Recolher o painel de origens"]');
     const cabecalho = painel?.querySelector("h2")?.parentElement;
     const grupo = painel?.querySelector("nav li > div");
     const icone = painel?.querySelector("[data-icone-do-grupo]");
     const origemAtual = painel?.querySelector('a[aria-current="page"]');
     const conteudo = painel?.parentElement?.lastElementChild;
     console.table({
       painel: caixa(painel),
       bolinha: caixa(bolinha),
       cabecalhoOrigens: caixa(cabecalho),
       linhaDoGrupo: caixa(grupo),
       iconeDoGrupo: caixa(icone),
       origemAtual: caixa(origemAtual?.closest("li")),
       conteudo: caixa(conteudo),
     });
   })();
   ```

   | Peça | Esperado (com o topo de 44px da V2) |
   |---|---|
   | painel | x 0, y 44, w 250, h = altura da janela − 44 |
   | bolinha | x 240, y 60, w 20, h 20 |
   | cabecalhoOrigens | x 0, y 122, w 249, h 48 |
   | linhaDoGrupo | x 0, w 249, h 34 |
   | iconeDoGrupo | x 16, w 20, h 20 |
   | origemAtual | x 0, w 249, h 34 |
   | conteudo | x 250, com o texto do sobretítulo a 270 |

6. Abra o PNG da tarefa e a tela lado a lado. Anote no relatório da tarefa **cada diferença que sobrou e o porquê**. Diferença sem justificativa = tarefa não pronta.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/escale/origens/cores-da-casca.ts` | novo | as 22 cores do IconPicker da Clint; tom da paleta → cor da Clint; cor do ícone da visualização |
| `tests/unit/escale-cores-da-casca.test.ts` | novo | a tradução cobre a paleta inteira, sem colapsar tons |
| `app/escale-tema.css` | alterado (bloco no fim) | `--escale-painel-hover`, `--escale-salvar`, `--escale-salvar-texto`, claro e escuro |
| `tests/unit/escale-tema-do-painel.test.ts` | novo | as três variáveis nos dois blocos |
| `lib/ui/icons-da-casca.ts` | alterado (nomes no fim) | os ícones lucide do painel |
| `lib/i18n/dicionario.ts` | alterado (bloco do fork) | espanhol dos textos novos |
| `components/escale/origens/estilos-do-painel.ts` | novo | as classes de medida do painel e da coluna |
| `components/escale/origens/CabecalhoDaSecao.tsx` | reescrito | cabeçalho de 48px da Clint |
| `components/escale/origens/IconeDoGrupo.tsx` | reescrito | quadrado de 20px, cor da Clint, iniciais ou traço branco |
| `components/escale/origens/MenuDoPainel.tsx` | novo | ⋮, caixa do menu, item com ícone, divisória |
| `components/escale/origens/DicaEscura.tsx` | novo | o balão escuro "Nova origem" |
| `tests/unit/escale-pecas-do-painel.test.tsx` | novo | as peças acima |
| `components/escale/origens/LinhasDoPainel.tsx` | reescrito | linhas de grupo e de origem, menus, criação inline |
| `tests/unit/escale-painel-casca-clint.test.tsx` | novo | o painel montado: linhas, coluna, visualizações, rodapé |
| `components/escale/origens/PainelOrigens.tsx` | reescrito | a coluna inteira, a bolinha, o cabeçalho ORIGENS, a busca |
| `components/escale/origens/ComOrigens.tsx` | reescrito | o envoltório que cola o painel nas bordas |
| `components/escale/origens/ArquivadosDoPainel.tsx` | reescrito | Arquivados no estilo do painel |
| `tests/unit/escale-com-origens.test.tsx` | alterado (2 casos no fim) | envoltório e "sem a casca, nada muda" |
| `components/escale/visualizacoes/SecaoVisualizacoes.tsx` | reescrito | seção e linhas de visualização |
| `components/escale/visualizacoes/RodapeDaSelecao.tsx` | reescrito | o rodapé "N origens selecionadas · Rascunho" de 01-026 |
| `components/escale/origens/JanelaDaCasca.tsx` | novo | o modal da Clint: caixa, título, campo, botões |
| `components/escale/origens/JanelasDeOrigens.tsx` | reescrito | usa `JanelaDaCasca` |
| `components/escale/origens/JanelasDoGrupo.tsx` | reescrito | formulários do grupo no visual da Clint |
| `components/escale/origens/JanelasDaOrigem.tsx` | reescrito | formulários da origem no visual da Clint |
| `components/escale/visualizacoes/JanelasDaVisualizacao.tsx` | reescrito | formulários da visualização no visual da Clint |
| `tests/unit/escale-janelas-de-origens.test.tsx` | alterado (bloco no fim) | o visual das janelas |
| `tests/unit/escale-janelas-da-visualizacao.test.tsx` | alterado (bloco no fim) | caixinhas da casca e o verde-menta |

## Mudanças no contrato

- **Nenhum nome do contrato muda.** A V3 só consome tokens e componentes da V1.
- **Acrescenta três variáveis CSS só da casca**, fora da tabela de tokens: `--escale-painel-hover` (`#F3F3F3`), `--escale-salvar` (`#35EFB3`) e `--escale-salvar-texto` (`#2F2C5D`). São lidas por valor arbitrário (`bg-(--escale-salvar)`), como a `--color-escale-marca`, e não passam por `globals.css`. A V4 pode usá-las nos modais dela (Personalizar cards, filtro salvo).
- **Acrescenta ícones** em `lib/ui/icons-da-casca.ts`, como o contrato pede: `ChevronUp`, `EllipsisVertical`, `Settings`, `ListChecks`, `Pencil`, `Eye`, `EyeOff`, `Archive`, `Trash2`, `LayoutPanelLeft`, `SquareDashedKanban`, `Funnel`, `Users`, `Building2`, `Store`, `Megaphone`, `Phone`, `Bookmark`, `Save`, `X`, `FolderPlus`, além dos que a V1 já tiver. O ⋮ se importa pelo nome canônico, `EllipsisVertical`, que a V1 já exporta (no `lucide-react` 1.52 `MoreVertical` também existe, mas só como apelido; conferido no `dist` instalado). O script da Task 2 pula o que já existe.
- **Componentes novos do fork que a V4 e a 1E podem reusar:** `JanelaDaCasca` (+ `CabecaDaJanela`, `Campo`, `CampoDeTexto`, `BotaoDaJanela`, `RodapeDaJanela`), `ConteudoDoMenu`/`ItemDoMenu`/`SeparadorDoMenu`/`Tres` e `DicaEscura`, todos em `components/escale/origens/`.

## RECENTES fica para a Fase 1E (decisão desta parte)

- Hoje **não existe dado de Recentes**: a Fase 1E está planejada (`docs/superpowers/plans/2026-10-15-fase-1e-capa-e-acoes-do-quadro.md`, Task 12: `lib/escale/recentes/regras.ts`, `hooks/escale/useNegociosRecentes.ts`, `components/escale/origens/SecaoRecentes.tsx`), mas não foi construída.
- Pela regra "sem print/sem dado, não se inventa", a V3 **não desenha** a seção RECENTES. Um cabeçalho que não abre nada seria um controle decorativo.
- A V3 deixa o lugar pronto: `CabecalhoDaSecao` já tem o visual da Clint, e o `PainelOrigens` tem um comentário no ponto exato (logo depois de VISUALIZAÇÕES). A 1E, quando for reescrita sob a regra nova, monta `SecaoRecentes` com `CabecalhoDaSecao`, o ícone `Clock` (de `@/lib/ui/icons-da-casca`), o chevron com `BOTAO_DE_ICONE` + `text-casca-meta` e as linhas com `LINHA`/`LINHA_COM_HOVER`.
- Até lá, a falta de RECENTES é uma diferença conhecida contra 01-010 e entra no relatório da Task 8.

---

### Task 1: Branch, base e as cores dos ícones da Clint

**Files:**
- Create: `lib/escale/origens/cores-da-casca.ts`, `tests/unit/escale-cores-da-casca.test.ts`
- Copy: este plano para `docs/superpowers/plans/2026-10-16-casca-clint-v3-painel.md` no repositório

**Interfaces:**
- Consumes: `PALETA_DE_ETIQUETAS` (`lib/tags/cor-da-etiqueta.ts`, os 8 tons gravados como cor de grupo).
- Produces:
  - `CORES_DOS_ICONES_DA_CLINT: readonly string[]` (22 cores);
  - `corDoIconeNaCasca(tom: string): string`;
  - `COR_DO_ICONE_DA_VISUALIZACAO = "#4A4A4A"`.

  As Tasks 3, 6 e 7 usam isso.

- [ ] **Step 1: Conferir a base, criar a branch e copiar o plano**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
for f in components/escale/ui/BotaoDaCasca.tsx components/escale/ui/CaixaDaCasca.tsx components/escale/ui/SeletorDaCasca.tsx components/escale/ui/PainelSuspenso.tsx lib/ui/icons-da-casca.ts docs/escale/clint/contrato-casca-igual-a-clint.md; do
  git cat-file -e "escale-crm/main:$f" 2>/dev/null && echo "ok $f" || echo "FALTA $f"
done
git show escale-crm/main:app/escale-tema.css | grep -c -- "--color-casca-borda\|--color-casca-raia\|--color-casca-marca"
git show escale-crm/main:app/globals.css | grep -c -- "--shadow-casca-painel\|--radius-casca-gatilho"
git show escale-crm/main:components/escale/menu/MenuDoTopo.tsx | grep -n "h-11\|h-\[44px\]"
```
Expected:
- seis linhas `ok …` (a V1 está na `main`);
- as duas contagens ≥ 1;
- uma linha do `<header>` com `h-11` ou `h-[44px]` (a V2 deixou o topo com os 44px da Clint).

Se faltar algo, PARE e pergunte ao usuário. Se o topo da V2 tiver outra altura, PARE também: a altura do painel (`calc(100dvh-2.75rem)` nas Tasks 5 e 8) depende dela.

```bash
git switch -c feat/casca-clint-v3-painel escale-crm/main
cp "../docs/superpowers/plans/2026-10-16-casca-clint-v3-painel.md" docs/superpowers/plans/
grep -n "export function CaixaDaCasca\|export function SeletorDaCasca\|export function BotaoDaCasca\|export const BotaoDaCasca" components/escale/ui/*.tsx
```
Expected: as três assinaturas do contrato:
- `CaixaDaCasca({ marcada, aoMudar, rotulo?, "aria-label"?, desabilitada? })`;
- `SeletorDaCasca<V>({ valor, opcoes, aoMudar, "aria-label", vazio?, buscaAPartirDe? })`;
- `BotaoDaCasca` com `variante` e `tamanho`.

Se alguma diferir do contrato, PARE e pergunte. O código das Tasks 4 a 7 usa exatamente essas props.

- [ ] **Step 2: Escrever o teste que falha**

Create `tests/unit/escale-cores-da-casca.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  COR_DO_ICONE_DA_VISUALIZACAO,
  CORES_DOS_ICONES_DA_CLINT,
  corDoIconeNaCasca,
} from "@/lib/escale/origens/cores-da-casca";
import { PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";

describe("as cores dos ícones de grupo na casca (V3)", () => {
  it("as 22 cores do IconPicker da Clint, na ordem do bundle", () => {
    expect(CORES_DOS_ICONES_DA_CLINT).toHaveLength(22);
    expect(CORES_DOS_ICONES_DA_CLINT[0]).toBe("#3D3A6C");
    expect(CORES_DOS_ICONES_DA_CLINT[21]).toBe("#E9F4FF");
  });

  it("todo tom da paleta vira uma cor da Clint, e tons diferentes não viram a mesma cor", () => {
    // `#5A5A5A` não está no IconPicker: é a cor do grupo "SAO" medida em 01-010.
    const daClint = [...CORES_DOS_ICONES_DA_CLINT, "#5A5A5A"];
    const traduzidas = PALETA_DE_ETIQUETAS.map(corDoIconeNaCasca);
    for (const [i, cor] of traduzidas.entries()) {
      expect(cor, `o tom ${PALETA_DE_ETIQUETAS[i]} ficou sem tradução`).not.toBe(PALETA_DE_ETIQUETAS[i]);
      expect(daClint).toContain(cor);
    }
    expect(new Set(traduzidas).size).toBe(PALETA_DE_ETIQUETAS.length);
  });

  it("aceita o tom em maiúsculas e devolve o próprio valor quando não conhece o tom", () => {
    expect(corDoIconeNaCasca("#FFE629")).toBe("#FFE073");
    expect(corDoIconeNaCasca("#123456")).toBe("#123456");
  });

  it("o quadradinho das visualizações é o cinza-escuro de 01-014", () => {
    expect(COR_DO_ICONE_DA_VISUALIZACAO).toBe("#4A4A4A");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-cores-da-casca.test.ts
```
Expected: FAIL, `Failed to resolve import "@/lib/escale/origens/cores-da-casca"`.

- [ ] **Step 4: Implementar**

Create `lib/escale/origens/cores-da-casca.ts`:

```ts
/**
 * AS CORES DOS ÍCONES DE GRUPO NA CASCA NOVA (fork Escale · casca V3).
 *
 * A cor que o gerente escolhe em Customizar é DADO: continua gravada como um
 * dos 8 tons da paleta das etiquetas (`PALETA_DE_ETIQUETAS`, validada por
 * `corValida` na rota e no banco). Na casca nova, o quadradinho do grupo é
 * desenhado com a cor da Clint mais próxima daquele tom. As 22 cores são as do
 * IconPicker da Clint (bundle `A=[...]`, `docs/escale/clint/clint-design-system.md`
 * §3.5). Trocar a tradução muda só a tela: nenhum grupo precisa ser regravado.
 */
export const CORES_DOS_ICONES_DA_CLINT: readonly string[] = [
  "#3D3A6C",
  "#9C3EFF",
  "#B4ADFF",
  "#D96CFF",
  "#263AF1",
  "#83B4FF",
  "#48DEA8",
  "#5BFFC4",
  "#B5846F",
  "#FF4062",
  "#FFA7A7",
  "#FFA959",
  "#FFDFC1",
  "#FFE073",
  "#B9F26B",
  "#9D9D9D",
  "#CECECF",
  "#E6E6E6",
  "#3B7E85",
  "#60C6D0",
  "#DCE4FF",
  "#E9F4FF",
];

/**
 * Tom da paleta → cor da Clint, pelo matiz mais próximo.
 * - Amarelo vira o amarelo "RI" (`#FFE073`), âmbar vira laranja e vermelho vira o vermelho "Credenciados" de 01-010.
 * - Verde-água vira o petróleo, azul vira o azul claro e índigo vira o azul "II" de 01-010.
 * - Roxo vira o violeta "Contabilidade" de 01-010, e cinza vira o `#5A5A5A` do grupo "SAO" (medido em 01-010; não está no IconPicker).
 */
const DA_PALETA_PARA_A_CLINT: Readonly<Record<string, string>> = {
  "#ffe629": "#FFE073",
  "#ffb224": "#FFA959",
  "#cf3716": "#FF4062",
  "#00655a": "#3B7E85",
  "#0091ff": "#83B4FF",
  "#3e63dd": "#263AF1",
  "#ab4aba": "#D96CFF",
  "#6f6f6f": "#5A5A5A",
};

/** A cor da Clint para um tom gravado; tom desconhecido passa como está. */
export function corDoIconeNaCasca(tom: string): string {
  return DA_PALETA_PARA_A_CLINT[tom.toLowerCase()] ?? tom;
}

/** O quadradinho das visualizações ("VA" em 01-014). */
export const COR_DO_ICONE_DA_VISUALIZACAO = "#4A4A4A";
```

- [ ] **Step 5: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-cores-da-casca.test.ts
```
Expected: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
git add lib/escale/origens/cores-da-casca.ts tests/unit/escale-cores-da-casca.test.ts docs/superpowers/plans/2026-10-16-casca-clint-v3-painel.md
git commit -m "feat(escale): cores da Clint para os ícones de grupo (casca V3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: As cores do painel, os ícones e os textos

**Files:**
- Create: `tests/unit/escale-tema-do-painel.test.ts`
- Modify: `app/escale-tema.css` (bloco no fim), `lib/ui/icons-da-casca.ts` (nomes no fim), `lib/i18n/dicionario.ts` (bloco antes da 1D)

**Interfaces:**
- Consumes: nada.
- Produces:
  - variáveis `--escale-painel-hover`, `--escale-salvar` e `--escale-salvar-texto`, só com a casca, claro e escuro;
  - os ícones lucide listados em "Mudanças no contrato", exportados por `@/lib/ui/icons-da-casca`;
  - o espanhol dos textos novos.

  As Tasks 3 a 7 dependem disso.

- [ ] **Step 1: Escrever o teste que falha**

Create `tests/unit/escale-tema-do-painel.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(__dirname, "..", "..", "app", "escale-tema.css"), "utf8");
const MARCA = "/* ─── FORK ESCALE · casca V3 (painel esquerdo de Negócios) ───";

/** As variáveis do primeiro bloco `seletor {` que aparece DEPOIS da marca da V3. */
function blocoDaV3(seletor: string): Record<string, string> {
  const inicio = CSS.indexOf(MARCA);
  if (inicio < 0) throw new Error("bloco da V3 não encontrado em app/escale-tema.css");
  const abre = CSS.indexOf(seletor + " {", inicio);
  if (abre < 0) throw new Error(`${seletor} não encontrado depois da marca da V3`);
  const corpo = CSS.slice(abre, CSS.indexOf("}", abre));
  return Object.fromEntries([...corpo.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

describe("as cores do painel na casca (V3)", () => {
  it("o claro tem o cinza do hover, o Salvar verde-menta e o texto navy da Clint", () => {
    expect(blocoDaV3("body:has([data-escale-casca])")).toEqual({
      "--escale-painel-hover": "#f3f3f3",
      "--escale-salvar": "#35efb3",
      "--escale-salvar-texto": "#2f2c5d",
    });
  });

  it("o escuro redefine as mesmas três", () => {
    expect(Object.keys(blocoDaV3('[data-theme="dark"] body:has([data-escale-casca])')).sort()).toEqual([
      "--escale-painel-hover",
      "--escale-salvar",
      "--escale-salvar-texto",
    ]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-tema-do-painel.test.ts
```
Expected: FAIL nos 2 casos, com `bloco da V3 não encontrado em app/escale-tema.css`.

- [ ] **Step 3: O bloco do tema**

Acrescente no FIM de `app/escale-tema.css` (depois de tudo o que a V1 e a V2 puseram):

```bash
cat >> app/escale-tema.css <<'CSS'

/* ─── FORK ESCALE · casca V3 (painel esquerdo de Negócios) ───
   Cores da Clint que NÃO são a marca e que só o painel e as janelas dele usam:
   o cinza do hover da linha (01-032/033/034) e o "Salvar" verde-menta do modal
   da variante superior (01-013, clint.green 400 com o texto navy). São lidas
   por valor arbitrário, como a --color-escale-marca: não viram utilitário e
   não passam pelo @theme. Os blocos de cima (claro e escuro) são os que
   tests/unit/escale-tema.test.ts lê, e não mudam. */
body:has([data-escale-casca]) {
  --escale-painel-hover: #f3f3f3;
  --escale-salvar: #35efb3;
  --escale-salvar-texto: #2f2c5d;
}

[data-theme="dark"] body:has([data-escale-casca]) {
  --escale-painel-hover: #2a2d3d;
  --escale-salvar: #35efb3;
  --escale-salvar-texto: #2f2c5d;
}
CSS
```

- [ ] **Step 4: Os ícones**

Da raiz do repositório. O script lê o que `lib/ui/icons-da-casca.ts` já exporta (inclusive `A as B`) e acrescenta só o que falta, numa linha própria no fim:

```bash
node - <<'NODE'
const fs = require("fs");
const ARQ = "lib/ui/icons-da-casca.ts";
const PRECISA = [
  "ChevronDown", "ChevronLeft", "ChevronRight", "ChevronUp", "Search", "Plus", "EllipsisVertical",
  "Settings", "ListChecks", "Pencil", "Eye", "EyeOff", "Archive", "Trash2", "LayoutPanelLeft",
  "SquareDashedKanban", "Funnel", "Users", "Building2", "Store", "Megaphone", "Phone",
  "Bookmark", "Save", "X", "FolderPlus",
];
const texto = fs.readFileSync(ARQ, "utf8");
const exportados = new Set();
for (const m of texto.matchAll(/export\s*\{([^}]*)\}/g)) {
  for (const parte of m[1].split(",")) {
    const p = parte.trim();
    if (p) exportados.add(p.split(/\s+as\s+/).pop().trim());
  }
}
for (const m of texto.matchAll(/export\s+(?:const|function)\s+(\w+)/g)) exportados.add(m[1]);
const faltam = PRECISA.filter((n) => !exportados.has(n));
if (faltam.length === 0) {
  console.log("nada a acrescentar");
  process.exit(0);
}
const eol = texto.includes("\r\n") ? "\r\n" : "\n";
const bloco = [
  "// FORK ESCALE · casca V3 — painel esquerdo de Negócios (menus, cabeçalhos, ícones de grupo, janelas)",
  `export { ${faltam.join(", ")} } from "lucide-react";`,
].join(eol);
fs.writeFileSync(ARQ, texto.replace(/\s*$/, "") + eol + eol + bloco + eol);
console.log("acrescentados:", faltam.join(", "));
NODE
```
Expected: `acrescentados: …` com os nomes que a V1 não tinha (ou `nada a acrescentar`).

- [ ] **Step 5: Os textos em espanhol**

Da raiz do repositório:

```bash
node - <<'NODE'
const fs = require("fs");
const ARQ = "lib/i18n/dicionario.ts";
const ANCORA = "  // ─── FORK ESCALE · filtros do quadro (Fase 1D";
const CAB = "  // ─── FORK ESCALE · casca V3 (painel esquerdo de Negócios igual à Clint) ───";
const ENTRADAS = [
  ["Nova origem", "Nuevo origen"],
  ["Buscar origens, grupos, visualizações…", "Buscar orígenes, grupos, vistas…"],
  ["Nome", "Nombre"],
  ["Grupo", "Grupo"],
  ["Fechar", "Cerrar"],
  ["Cor", "Color"],
  ["Ícone", "Ícono"],
  ["Prévia", "Vista previa"],
  ["Quem vê", "Quién ve"],
  ["Cor automática", "Color automático"],
];
let texto = fs.readFileSync(ARQ, "utf8");
if (texto.includes(CAB)) throw new Error("o bloco da V3 já está no dicionário");
const i = texto.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 1D não encontrada");
const eol = texto.includes("\r\n") ? "\r\n" : "\n";
// A chave pode existir COM aspas ("Nova origem":) ou SEM aspas (Nome:, Grupo:, Fechar:, Cor: já existem assim).
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const existe = (pt) =>
  texto.includes(JSON.stringify(pt) + ":") || new RegExp("^\\s*" + escapar(pt) + ":", "m").test(texto);
const novas = [];
const puladas = [];
for (const [pt, es] of ENTRADAS) {
  if (existe(pt)) {
    puladas.push(pt);
    continue;
  }
  novas.push(`  ${JSON.stringify(pt)}: { es: ${JSON.stringify(es)} },`);
}
texto = texto.slice(0, i) + [CAB, ...novas].join(eol) + eol + texto.slice(i);
fs.writeFileSync(ARQ, texto);
console.log(`${novas.length} entradas novas; já existiam ${puladas.length}: ${puladas.join(" | ")}`);
NODE
```
Expected: uma linha `N entradas novas; já existiam M: …`, com N + M = 10. Pela leitura de 16/10, já existem 8: `Nome`, `Grupo`, `Fechar` e `Cor` (sem aspas), `Ícone`, `Prévia`, `Quem vê` e `Cor automática` (com aspas); as novas são `Nova origem` e `Buscar origens, grupos, visualizações…`. As que já existiam ficam com a tradução de antes.

- [ ] **Step 6: Rodar os testes e o typecheck**

```bash
corepack pnpm vitest run tests/unit/escale-tema-do-painel.test.ts tests/unit/escale-tema.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
```
Expected:
- os três arquivos PASS;
- typecheck sem erros novos.

Chave repetida aparece como `An object literal cannot have multiple properties with the same name`. Se isso acontecer, apague a linha nova repetida do bloco da V3.

- [ ] **Step 7: Commit**

```bash
git add app/escale-tema.css lib/ui/icons-da-casca.ts lib/i18n/dicionario.ts tests/unit/escale-tema-do-painel.test.ts
git commit -m "feat(escale): cores do painel, ícones e textos da casca V3

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: As peças do painel (medidas, cabeçalho, ícone do grupo, menu ⋮ e dica escura)

**Files:**
- Create: `components/escale/origens/estilos-do-painel.ts`, `components/escale/origens/MenuDoPainel.tsx`, `components/escale/origens/DicaEscura.tsx`, `tests/unit/escale-pecas-do-painel.test.tsx`
- Modify (reescrever): `components/escale/origens/CabecalhoDaSecao.tsx`, `components/escale/origens/IconeDoGrupo.tsx`

**Interfaces:**
- Consumes:
  - `corDoIconeNaCasca` (Task 1);
  - os ícones da Task 2;
  - tokens da V1: `text-casca-texto`, `text-casca-suave`, `text-casca-meta`, `border-casca-borda`, `bg-casca-raia`, `bg-casca-marca`, `bg-casca-marca-suave`, `text-casca-alerta`, `bg-casca-texto-2` (o mesmo token `--color-casca-texto-2`, usado como fundo), `rounded-casca-gatilho`, `shadow-casca-painel`;
  - as variáveis da Task 2.
- Produces:
  - classes `BOTAO_DE_ICONE`, `SO_NO_HOVER`, `LINHA`, `LINHA_COM_HOVER`, `LINHA_ATUAL`, `RECUO_DO_TEXTO`, `BOLINHA_DO_PAINEL`, `ENVOLTORIO_DO_PAINEL`, `CONTEUDO_AO_LADO_DO_PAINEL`;
  - `CabecalhoDaSecao({ icone, titulo, children?, className? })`, com o hover nomeado `group/cabecalho`;
  - `IconeDoGrupo({ grupo })`, que marca o elemento com `data-icone-do-grupo`;
  - `Tres({ rotulo })`, `ConteudoDoMenu`, `ItemDoMenu({ icone, perigo? })` e `SeparadorDoMenu`;
  - `DicaEscura({ texto, children })`.

  As Tasks 4 a 7 usam tudo isso.

- [ ] **Step 1: Escrever o teste que falha**

Create `tests/unit/escale-pecas-do-painel.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CabecalhoDaSecao } from "@/components/escale/origens/CabecalhoDaSecao";
import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { IconeDoGrupo } from "@/components/escale/origens/IconeDoGrupo";
import { ConteudoDoMenu, ItemDoMenu, SeparadorDoMenu, Tres } from "@/components/escale/origens/MenuDoPainel";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Settings, Trash2 } from "@/lib/ui/icons-da-casca";

describe("casca V3 — peças do painel", () => {
  it("o cabeçalho da seção tem 48px, a divisória #E8E4F5 e o título 11px/600 em caixa alta (01-010)", () => {
    render(
      <CabecalhoDaSecao icone={<svg />} titulo="Origens">
        <button type="button">lupa</button>
      </CabecalhoDaSecao>,
    );
    const titulo = screen.getByRole("heading", { name: "Origens" });
    expect(titulo).toHaveClass("text-[11px]", "font-semibold", "uppercase", "text-casca-texto");
    expect(titulo.parentElement).toHaveClass("group/cabecalho", "h-12", "border-b", "border-casca-borda", "pl-4");
    expect(screen.getByRole("button", { name: "lupa" })).toBeInTheDocument();
  });

  it("o ícone do grupo é o quadrado de 20px da Clint, com a cor da Clint e as iniciais brancas", () => {
    const { container } = render(
      <IconeDoGrupo grupo={{ id: "g-1", name: "Recuperação INSS", color: "#ffe629", icon: "iniciais" }} />,
    );
    const icone = container.querySelector("[data-icone-do-grupo]")!;
    expect(icone).toHaveClass("size-5", "rounded-[4px]", "text-white", "text-[8px]", "font-semibold");
    expect(icone).toHaveStyle({ backgroundColor: "#FFE073" });
    expect(icone).toHaveTextContent("RI");
  });

  it("o ícone com desenho troca as iniciais por um traço branco", () => {
    const { container } = render(
      <IconeDoGrupo grupo={{ id: "g-1", name: "Operacional", color: "#3e63dd", icon: "pessoas" }} />,
    );
    const icone = container.querySelector("[data-icone-do-grupo]")!;
    expect(icone.querySelector("svg")).not.toBeNull();
    expect(icone).toHaveStyle({ backgroundColor: "#263AF1" });
    expect(icone.textContent).toBe("");
  });

  it("o menu ⋮ é a caixa da Clint: raio 8, sombra do painel, itens de 36px com ícone e Excluir em vermelho (01-032)", async () => {
    render(
      <DropdownMenu modal={false}>
        <Tres rotulo="Mais ações de Vendas" />
        <ConteudoDoMenu>
          <ItemDoMenu icone={Settings}>Configurações</ItemDoMenu>
          <SeparadorDoMenu />
          <ItemDoMenu icone={Trash2} perigo>
            Excluir
          </ItemDoMenu>
        </ConteudoDoMenu>
      </DropdownMenu>,
    );
    const tres = screen.getByRole("button", { name: "Mais ações de Vendas" });
    expect(tres).toHaveClass("data-[state=open]:text-casca-marca");
    await userEvent.setup({ pointerEventsCheck: 0 }).click(tres);
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("rounded-[8px]", "shadow-casca-painel", "bg-surface", "border-0");
    const [config, excluir] = within(menu).getAllByRole("menuitem");
    expect(config).toHaveClass("h-9", "text-xs", "px-3");
    expect(config!.querySelector("svg")).not.toBeNull();
    expect(excluir).toHaveClass("text-casca-alerta");
    expect(within(menu).getByRole("separator")).toHaveClass("bg-casca-borda");
  });

  it("a dica escura mostra o texto acima do botão (01-034)", async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <DicaEscura texto="Nova origem">
          <button type="button" aria-label="Nova origem em Vendas">
            +
          </button>
        </DicaEscura>
      </TooltipProvider>,
    );
    await userEvent.setup({ pointerEventsCheck: 0 }).hover(screen.getByRole("button", { name: "Nova origem em Vendas" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Nova origem");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-pecas-do-painel.test.tsx
```
Expected: FAIL, `Failed to resolve import "@/components/escale/origens/DicaEscura"`. O arquivo inteiro falha antes dos casos.

- [ ] **Step 3: As medidas**

Create `components/escale/origens/estilos-do-painel.ts`:

```ts
/**
 * AS MEDIDAS DO PAINEL ESQUERDO NA CASCA NOVA (fork Escale · casca V3).
 *
 * Tiradas de 01-010 (px do print ÷ 1,25) e de 01-032, 01-033 e 01-034 (JPEGs de
 * 500px que já estão em px de CSS) — ver a tabela "Medidas" do plano
 * `docs/superpowers/plans/2026-10-16-casca-clint-v3-painel.md`. Um lugar só
 * para as classes que as linhas de grupo, de origem e de visualização repetem:
 * mudar aqui muda as três.
 */

/** Botão só de ícone (lupa, ^, +, ⋮): 24px, ícone cinza #686D86, foco visível na cor da marca. */
export const BOTAO_DE_ICONE =
  "grid size-6 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave transition-colors hover:text-casca-texto focus-visible:outline-2 focus-visible:outline-casca-marca";

/**
 * Ações que somem em repouso (01-010) e aparecem no hover da linha, no foco
 * pelo teclado e enquanto o menu delas está aberto (01-032/033). Quem usa
 * acrescenta o `group-hover/<nome>:opacity-100` do próprio grupo.
 */
export const SO_NO_HOVER =
  "flex items-center opacity-0 transition-opacity focus-within:opacity-100 has-[[data-state=open]]:opacity-100";

/** A linha de 34px (grupo, origem, visualização), de borda a borda do painel, texto 12px #2F2C5D. */
export const LINHA = "relative flex h-[34px] items-center text-xs text-casca-texto";

/** O cinza #F3F3F3 da linha no hover e com o menu dela aberto (01-032/033/034). */
export const LINHA_COM_HOVER =
  "hover:bg-(--escale-painel-hover) has-[[data-state=open]]:bg-(--escale-painel-hover)";

/** A linha atual: fundo #EFF3FF e a barra de 3px da marca colada na borda esquerda do painel (01-032). */
export const LINHA_ATUAL =
  "bg-casca-raia before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-casca-marca";

/** O texto das origens e das visualizações começa a 43px da borda, alinhado ao nome do grupo (01-032). */
export const RECUO_DO_TEXTO = "pl-[43px]";

/** O botão redondo de recolher/abrir o painel: 20px, branco, borda #E8E4F5, sombra curta para baixo (01-010). */
export const BOLINHA_DO_PAINEL =
  "absolute top-4 z-10 grid size-5 place-items-center rounded-full border border-casca-borda bg-surface text-casca-texto shadow-[0_2px_4px_rgb(17_24_39/0.10)] transition-colors hover:bg-casca-raia focus-visible:outline-2 focus-visible:outline-casca-marca";

/**
 * A COLUNA COLADA NAS BORDAS (01-010): o painel não é cartão flutuante, ele vai
 * do topo ao fundo da tela, encostado na esquerda.
 *
 * O `<main>` da casca tem padding: `sm:p-6` e, no fundo, a reserva do rodapé.
 * Sem peça fixa a reserva é `pb-area-segura`; com peça, é `estiloDaReserva`
 * (`lib/ui/rodape-ocupado.tsx`). As margens negativas devolvem esse padding nas
 * três bordas.
 *
 * A do fundo é a MESMA conta do `<main>`: o `max()` de `estiloDaReserva`, que
 * sem peça vale o mesmo que `pb-area-segura`. Senão a página rolaria a
 * diferença. Só do md para cima: abaixo disso o painel não aparece.
 */
export const ENVOLTORIO_DO_PAINEL =
  "flex items-start md:-mt-6 md:-ml-6 md:-mb-[max(var(--space-6),env(safe-area-inset-bottom,0px),var(--rodape-ocupado,0px))]";

/** O conteúdo começa 20px depois da borda do painel e 24px abaixo do topo (01-010), e devolve a reserva do fundo. */
export const CONTEUDO_AO_LADO_DO_PAINEL =
  "min-w-0 flex-1 md:pt-6 md:pl-5 md:pb-[max(var(--space-6),env(safe-area-inset-bottom,0px),var(--rodape-ocupado,0px))]";
```

- [ ] **Step 4: O cabeçalho da seção**

Replace o conteúdo inteiro de `components/escale/origens/CabecalhoDaSecao.tsx` por:

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * O cabeçalho de cada seção do painel — ORIGENS, VISUALIZAÇÕES e, quando a
 * Fase 1E entrar, RECENTES — como na Clint (01-010):
 * - 48px de altura e a divisória #E8E4F5 embaixo;
 * - ícone de 16px a 16px da borda e título 11px/600 em caixa alta a 44px;
 * - as ações à direita, a 12px da borda.
 *
 * O hover nomeado `group/cabecalho` revela ações escondidas, como o `+`.
 */
export function CabecalhoDaSecao({
  icone,
  titulo,
  children,
  className,
}: {
  icone: ReactNode;
  titulo: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group/cabecalho flex h-12 shrink-0 items-center gap-3 border-b border-casca-borda pr-3 pl-4",
        className,
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center text-casca-texto" aria-hidden>
        {icone}
      </span>
      <h2 className="min-w-0 flex-1 truncate text-[11px] font-semibold text-casca-texto uppercase">{titulo}</h2>
      {children && <div className="flex shrink-0 items-center">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 5: O ícone do grupo**

Replace o conteúdo inteiro de `components/escale/origens/IconeDoGrupo.tsx` por:

```tsx
import { corDoIconeNaCasca } from "@/lib/escale/origens/cores-da-casca";
import { corEfetiva, iniciais, type GrupoDeFunis, type IconeDeGrupo } from "@/lib/escale/origens/regras";
import { Building2, Funnel, Megaphone, Phone, Store, Users } from "@/lib/ui/icons-da-casca";

const DESENHO: Record<Exclude<IconeDeGrupo, "iniciais">, typeof Funnel> = {
  funil: Funnel,
  pessoas: Users,
  predio: Building2,
  loja: Store,
  megafone: Megaphone,
  telefone: Phone,
};

/**
 * O quadradinho do grupo no painel, como na Clint (01-010, 01-032):
 * - 20×20, raio 4;
 * - as iniciais brancas 8px/600 ou um traço branco de 12px (a Clint usa Feather);
 * - o fundo é a cor da Clint que corresponde ao tom gravado (`corDoIconeNaCasca`).
 *
 * O tom vem de Customizar ou da cor automática. A Clint pinta as iniciais de
 * branco em qualquer fundo, inclusive no amarelo; o quadrado é decorativo
 * (`aria-hidden`), e o nome do grupo está escrito ao lado.
 */
export function IconeDoGrupo({ grupo }: { grupo: Pick<GrupoDeFunis, "id" | "name" | "color" | "icon"> }) {
  const Desenho = grupo.icon === "iniciais" ? null : DESENHO[grupo.icon];
  return (
    <span
      aria-hidden
      data-icone-do-grupo=""
      className="flex size-5 shrink-0 items-center justify-center rounded-[4px] text-[8px] leading-none font-semibold text-white"
      style={{ backgroundColor: corDoIconeNaCasca(corEfetiva(grupo)) }}
    >
      {Desenho ? <Desenho size={12} strokeWidth={2} /> : iniciais(grupo.name)}
    </span>
  );
}
```

- [ ] **Step 6: O menu ⋮**

Create `components/escale/origens/MenuDoPainel.tsx`:

```tsx
"use client";
import type { ComponentProps } from "react";

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EllipsisVertical } from "@/lib/ui/icons-da-casca";
import type { Settings } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BOTAO_DE_ICONE } from "./estilos-do-painel";

/** Qualquer ícone lucide (todos têm o mesmo tipo). */
type IconeDoMenu = typeof Settings;

/** O ⋮ das linhas do painel: cinza em repouso, na cor da marca com o menu aberto (01-032/033). */
export function Tres({ rotulo }: { rotulo: string }) {
  return (
    <DropdownMenuTrigger asChild>
      <button type="button" aria-label={rotulo} className={cn(BOTAO_DE_ICONE, "data-[state=open]:text-casca-marca")}>
        <EllipsisVertical size={16} aria-hidden />
      </button>
    </DropdownMenuTrigger>
  );
}

/**
 * A caixa do menu (01-032/033): branca, raio 8, sem borda, a sombra do painel e
 * 4px de respiro. Abre à direita do ⋮, com o topo alinhado ao dele. Embrulha o
 * `DropdownMenuContent` do original só com classes: o menu do original não muda.
 */
export function ConteudoDoMenu({ className, ...props }: ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      side="right"
      align="start"
      sideOffset={6}
      {...props}
      className={cn(
        "min-w-0 rounded-[8px] border-0 bg-surface p-1 text-casca-texto shadow-casca-painel",
        className,
      )}
    />
  );
}

/** Um item de 36px: ícone de 14px e texto 12px. `perigo` pinta texto e ícone de vermelho (o "Excluir"). */
export function ItemDoMenu({
  icone: Icone,
  perigo = false,
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuItem> & { icone: IconeDoMenu; perigo?: boolean }) {
  return (
    <DropdownMenuItem
      {...props}
      className={cn(
        "h-9 gap-2 rounded-[4px] px-3 py-0 text-xs text-casca-texto focus:bg-casca-marca-suave focus:text-casca-texto [&>svg]:size-3.5",
        perigo && "text-casca-alerta focus:text-casca-alerta",
        className,
      )}
    >
      <Icone size={14} aria-hidden />
      {children}
    </DropdownMenuItem>
  );
}

/** A divisória antes de "Arquivar" (01-032/033), na cor das bordas da casca. */
export function SeparadorDoMenu() {
  return <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-casca-borda" />;
}
```

- [ ] **Step 7: A dica escura**

Create `components/escale/origens/DicaEscura.tsx`:

```tsx
"use client";
import { TooltipArrow } from "@radix-ui/react-tooltip";
import type { ReactElement } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A DICA ESCURA DA CLINT (01-034, "Nova origem"):
 * - balão #3E3A6F acima do botão, com a seta para baixo;
 * - texto branco 11px/500, raio 4;
 * - a sombra curta do tooltip legado (`#afafaf29 0 3px 6px`).
 *
 * Embrulha o `TooltipContent` do original só com classes. `overflow-visible`
 * deixa a seta sair da caixa. Precisa de um `TooltipProvider` acima: o painel
 * põe um em volta de tudo.
 */
export function DicaEscura({ texto, children }: { texto: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="overflow-visible rounded-[4px] bg-casca-texto-2 px-2 py-1 text-[11px] font-medium text-white shadow-[0_3px_6px_#afafaf29]"
      >
        {texto}
        <TooltipArrow width={10} height={5} className="fill-casca-texto-2" />
      </TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 8: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-pecas-do-painel.test.tsx tests/unit/chip-contraste-da-etiqueta.test.ts tests/unit/escale-painel-origens.test.tsx tests/unit/escale-janelas-de-origens.test.tsx
```
Expected:
- `escale-pecas-do-painel` PASS (5 testes);
- `chip-contraste-da-etiqueta` PASS, inclusive "`estiloDoChip` é importado só pelo chip". Hoje só `IconeDoGrupo.tsx` e `components/tags/ChipDeEtiqueta.tsx` importam `estiloDoChip`. Se outro caso desse arquivo falhar, rode-o em `escale-crm/main`: falha lá também é ruído antigo, e não desta tarefa;
- os dois testes do fork PASS. Eles ainda usam as linhas antigas, mas `IconeDoGrupo` e `CabecalhoDaSecao` mudaram por dentro sem mudar nome nem papel.

- [ ] **Step 9: Commit**

```bash
git add components/escale/origens/estilos-do-painel.ts components/escale/origens/CabecalhoDaSecao.tsx components/escale/origens/IconeDoGrupo.tsx components/escale/origens/MenuDoPainel.tsx components/escale/origens/DicaEscura.tsx tests/unit/escale-pecas-do-painel.test.tsx
git commit -m "feat(escale): peças do painel no visual da Clint (cabeçalho, ícone, menu e dica)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: As linhas de grupo e de origem iguais à Clint

**Files:**
- Create: `tests/unit/escale-painel-casca-clint.test.tsx`
- Modify (reescrever): `components/escale/origens/LinhasDoPainel.tsx`
- Modify (2 encaixes): `components/escale/origens/PainelOrigens.tsx`, `components/escale/visualizacoes/SecaoVisualizacoes.tsx`. Só os imports e o `TooltipProvider`, para a branch compilar; as Tasks 5 e 6 reescrevem os dois.

**Interfaces:**
- Consumes: as peças da Task 3; `CaixaDaCasca` da V1; `estadoDoGrupo` (`lib/escale/visualizacoes/regras.ts`, devolve `"marcada" | "parcial" | "vazia"`).
- Produces:
  - `LinhaDoGrupo` e `LinhaDaOrigem` com as mesmas props de hoje;
  - os tipos `AcaoDoGrupo`, `AcaoDaOrigem` e `SelecaoNoPainel`, sem mudança.

  `LinhasDoPainel.tsx` **deixa de exportar** `BOTAO_DE_ICONE`, `SO_NO_FOCO` e `Tres`. Eles passam a morar em `estilos-do-painel.ts` (`SO_NO_FOCO` virou `SO_NO_HOVER`) e em `MenuDoPainel.tsx`.

- [ ] **Step 1: Escrever o teste que falha**

Create `tests/unit/escale-painel-casca-clint.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let caminho = "/app/pipelines/f-leads";
vi.mock("next/navigation", () => ({
  usePathname: () => caminho,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/app/actions/escale/origens", () => ({ guardarPreferenciaDeOrigens: vi.fn(async () => undefined) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import type { Origens } from "@/lib/escale/origens/regras";
import type { Visualizacao } from "@/lib/escale/visualizacoes/regras";
import { PainelOrigens } from "@/components/escale/origens/PainelOrigens";

const ORIGENS: Origens = {
  grupos: [
    { id: "g-obras", name: "INSS de obras", color: "#0091ff", icon: "iniciais", is_archived: false },
    { id: "g-cred", name: "Credenciados", color: null, icon: "pessoas", is_archived: false },
  ],
  funis: [
    { id: "f-leads", name: "Leads INSS WhatsApp", group_id: "g-obras", is_archived: false, is_default: false },
    { id: "f-nayara", name: "Funil Nayara", group_id: "g-cred", is_archived: false, is_default: false },
  ],
};
const VISUALIZACOES: Visualizacao[] = [
  { id: "v-time", name: "Time comercial", acesso: "todos", origens: ["f-nayara", "f-leads"], pessoas: [] },
];
const ABERTO: PreferenciasDoPainel = { painelAberto: true, listaAberta: true, visualizacoesAbertas: true, ocultos: [] };

function renderizar(preferencias: PreferenciasDoPainel = ABERTO, podeGerenciar = true) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <PainelOrigens
        origens={ORIGENS}
        visualizacoes={VISUALIZACOES}
        podeGerenciar={podeGerenciar}
        preferencias={preferencias}
      />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

beforeEach(() => {
  caminho = "/app/pipelines/f-leads";
});

describe("casca V3 — linhas de grupo e de origem (01-010, 01-032, 01-033, 01-034)", () => {
  it("a linha do grupo tem 34px; o nome fica em peso normal e só o grupo da origem aberta fica em 600", () => {
    renderizar();
    const credenciados = screen.getByText("Credenciados");
    expect(credenciados.parentElement).toHaveClass("h-[34px]", "pl-4");
    expect(credenciados).not.toHaveClass("font-semibold");
    expect(screen.getByText("INSS de obras")).toHaveClass("font-semibold");
  });

  it("o grupo fechado esconde a seta, o + e o ⋮; o grupo aberto fica cinza e mostra os três", () => {
    renderizar();
    expect(screen.getByRole("button", { name: "Abrir Credenciados" })).toHaveClass("opacity-0");
    expect(screen.getByRole("button", { name: "Nova origem em Credenciados" }).closest("span")).toHaveClass(
      "opacity-0",
    );
    const fechar = screen.getByRole("button", { name: "Fechar INSS de obras" });
    expect(fechar).toHaveClass("opacity-100");
    expect(fechar.parentElement).toHaveClass("bg-(--escale-painel-hover)");
    expect(screen.getByRole("button", { name: "Nova origem em INSS de obras" }).closest("span")).toHaveClass(
      "opacity-100",
    );
  });

  it("a origem aberta tem o fundo #EFF3FF e a barra de 3px da marca; o texto começa a 43px", () => {
    renderizar();
    const link = screen.getByRole("link", { name: "Leads INSS WhatsApp" });
    expect(link).toHaveClass("pl-[43px]");
    expect(link.closest("li")).toHaveClass("h-[34px]", "bg-casca-raia", "before:w-[3px]", "before:bg-casca-marca");
  });

  it("o ícone do grupo usa a cor da Clint que corresponde ao tom gravado", () => {
    renderizar();
    const linha = screen.getByText("INSS de obras").parentElement!;
    expect(linha.querySelector("[data-icone-do-grupo]")).toHaveStyle({ backgroundColor: "#83B4FF" });
  });

  it("o ⋮ do grupo abre o menu da Clint: ícone em cada item, divisória e Excluir em vermelho", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de INSS de obras" }));
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("rounded-[8px]", "shadow-casca-painel");
    const itens = within(menu).getAllByRole("menuitem");
    expect(itens.map((i) => i.textContent)).toEqual([
      "Configurações",
      "Selecionar origens",
      "Customizar",
      "Ocultar da minha barra lateral",
      "Arquivar",
      "Excluir",
    ]);
    for (const item of itens) expect(item.querySelector("svg")).not.toBeNull();
    expect(itens[5]).toHaveClass("text-casca-alerta");
    expect(within(menu).getByRole("separator")).toBeInTheDocument();
  });

  it("o ⋮ da origem abre Configurações, Selecionar origem, Arquivar e Excluir, com ícones (01-033)", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de Leads INSS WhatsApp" }));
    const menu = await screen.findByRole("menu");
    const itens = within(menu).getAllByRole("menuitem");
    expect(itens.map((i) => i.textContent)).toEqual(["Configurações", "Selecionar origem", "Arquivar", "Excluir"]);
    for (const item of itens) expect(item.querySelector("svg")).not.toBeNull();
  });

  it("o + do grupo mostra a dica escura «Nova origem» (01-034)", async () => {
    const user = renderizar();
    await user.hover(screen.getByRole("button", { name: "Nova origem em Credenciados" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Nova origem");
  });

  it("no modo seleção as caixinhas são as da casca, sem checkbox nativo", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Mais ações de Credenciados" }));
    await user.click(await screen.findByRole("menuitem", { name: "Selecionar origens" }));
    expect(screen.getByRole("checkbox", { name: "Funil Nayara" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Selecionar Credenciados" })).toBeChecked();
    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
  });

  it("a criação inline usa o campo de busca da casca (#F6F8FF, sem borda)", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Nova origem em Credenciados" }));
    expect(screen.getByRole("textbox", { name: "Nome da nova origem" })).toHaveClass(
      "bg-casca-busca",
      "rounded-casca-gatilho",
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-painel-casca-clint.test.tsx
```
Expected: FAIL em 8 dos 9 casos:
- por classe: `h-[34px]`, `opacity-0`, `bg-casca-raia`, `rounded-[8px]`, `bg-casca-busca`;
- por ícone ausente nos itens dos menus;
- pela dica ausente;
- pelo `input[type="checkbox"]` nativo.

"o ícone do grupo usa a cor da Clint" já passa: o `IconeDoGrupo` mudou na Task 3.

- [ ] **Step 3: Reescrever as linhas**

Replace o conteúdo inteiro de `components/escale/origens/LinhasDoPainel.tsx` por:

```tsx
"use client";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useCriarOrigem } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import type { FunilDaOrigem, GrupoNaArvore, Origens } from "@/lib/escale/origens/regras";
import { estadoDoGrupo } from "@/lib/escale/visualizacoes/regras";
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  ListChecks,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { DicaEscura } from "./DicaEscura";
import {
  BOTAO_DE_ICONE,
  LINHA,
  LINHA_ATUAL,
  LINHA_COM_HOVER,
  RECUO_DO_TEXTO,
  SO_NO_HOVER,
} from "./estilos-do-painel";
import { IconeDoGrupo } from "./IconeDoGrupo";
import { ConteudoDoMenu, ItemDoMenu, SeparadorDoMenu, Tres } from "./MenuDoPainel";
import { textoDoErro } from "./texto-do-erro";

export type AcaoDoGrupo = "configurar" | "selecionar" | "customizar" | "ocultar" | "arquivar" | "excluir";
export type AcaoDaOrigem = "configurar" | "selecionar" | "arquivar" | "excluir";

/** O modo seleção do painel (Fase 1C): o que está marcado e como marcar/desmarcar várias de uma vez. */
export interface SelecaoNoPainel {
  marcadas: ReadonlySet<string>;
  onAlternar: (ids: string[], marcar: boolean) => void;
}

/** O ⋮ do grupo: os itens, a ordem, os ícones e a divisória de 01-032; "Excluir" em vermelho. */
function MenuDoGrupo({ nome, oculto, onAcao }: { nome: string; oculto: boolean; onAcao: (a: AcaoDoGrupo) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <ConteudoDoMenu>
        <ItemDoMenu icone={Settings} onSelect={() => onAcao("configurar")}>
          {t("Configurações")}
        </ItemDoMenu>
        <ItemDoMenu icone={ListChecks} onSelect={() => onAcao("selecionar")}>
          {t("Selecionar origens")}
        </ItemDoMenu>
        <ItemDoMenu icone={Pencil} onSelect={() => onAcao("customizar")}>
          {t("Customizar")}
        </ItemDoMenu>
        <ItemDoMenu icone={oculto ? Eye : EyeOff} onSelect={() => onAcao("ocultar")}>
          {oculto ? t("Mostrar na minha barra lateral") : t("Ocultar da minha barra lateral")}
        </ItemDoMenu>
        <SeparadorDoMenu />
        <ItemDoMenu icone={Archive} onSelect={() => onAcao("arquivar")}>
          {t("Arquivar")}
        </ItemDoMenu>
        <ItemDoMenu icone={Trash2} perigo onSelect={() => onAcao("excluir")}>
          {t("Excluir")}
        </ItemDoMenu>
      </ConteudoDoMenu>
    </DropdownMenu>
  );
}

/** O ⋮ da origem: os itens de 01-033. */
function MenuDaOrigem({ nome, onAcao }: { nome: string; onAcao: (a: AcaoDaOrigem) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <ConteudoDoMenu>
        <ItemDoMenu icone={Settings} onSelect={() => onAcao("configurar")}>
          {t("Configurações")}
        </ItemDoMenu>
        <ItemDoMenu icone={ListChecks} onSelect={() => onAcao("selecionar")}>
          {t("Selecionar origem")}
        </ItemDoMenu>
        <SeparadorDoMenu />
        <ItemDoMenu icone={Archive} onSelect={() => onAcao("arquivar")}>
          {t("Arquivar")}
        </ItemDoMenu>
        <ItemDoMenu icone={Trash2} perigo onSelect={() => onAcao("excluir")}>
          {t("Excluir")}
        </ItemDoMenu>
      </ConteudoDoMenu>
    </DropdownMenu>
  );
}

/**
 * A linha da origem (01-032/033), de 34px e de borda a borda, só com texto.
 * - O texto fica a 43px quando a origem está dentro de um grupo.
 * - A origem aberta ganha o fundo #EFF3FF e a barra de 3px da marca.
 * - O hover pinta de #F3F3F3 e mostra o ⋮.
 * - No modo seleção, a caixinha da casca vem antes do nome; clicar no nome também marca.
 */
export function LinhaDaOrigem({
  funil,
  ativo,
  podeGerenciar,
  recuo,
  selecao,
  onAcao,
}: {
  funil: FunilDaOrigem;
  ativo: string | null;
  podeGerenciar: boolean;
  recuo: boolean;
  /** Presente no modo seleção: a linha vira caixinha (clicar marca, não abre o quadro). */
  selecao?: SelecaoNoPainel;
  onAcao: (a: AcaoDaOrigem) => void;
}) {
  if (selecao) {
    const marcada = selecao.marcadas.has(funil.id);
    return (
      <li className={cn(LINHA, LINHA_COM_HOVER, "gap-2 pr-3", recuo ? RECUO_DO_TEXTO : "pl-4")}>
        <CaixaDaCasca
          marcada={marcada}
          aoMudar={(marcar) => selecao.onAlternar([funil.id], marcar)}
          aria-label={funil.name}
        />
        <span
          className="min-w-0 flex-1 cursor-pointer truncate"
          onClick={() => selecao.onAlternar([funil.id], !marcada)}
        >
          {funil.name}
        </span>
      </li>
    );
  }
  const atual = funil.id === ativo;
  return (
    <li className={cn("group/origem", LINHA, atual ? LINHA_ATUAL : LINHA_COM_HOVER, "pr-1")}>
      <Link
        href={`/app/pipelines/${funil.id}`}
        aria-current={atual ? "page" : undefined}
        className={cn("flex h-full min-w-0 flex-1 items-center pr-2", recuo ? RECUO_DO_TEXTO : "pl-4")}
      >
        <span className="truncate">{funil.name}</span>
      </Link>
      {podeGerenciar && (
        <span className={cn(SO_NO_HOVER, "group-hover/origem:opacity-100")}>
          <MenuDaOrigem nome={funil.name} onAcao={onAcao} />
        </span>
      )}
    </li>
  );
}

/**
 * Criar a origem ali mesmo, pelo "+" do grupo. A Clint não mostra o formulário
 * (01-034; item 13 de "Prints que faltam"): fica o campo de hoje, no visual do
 * campo de busca da casca.
 */
function NovaOrigemNoGrupo({
  grupoId,
  onCriada,
  onCancelar,
}: {
  grupoId: string;
  onCriada: (origens: Origens, id: string) => void;
  onCancelar: () => void;
}) {
  const t = useT();
  const criar = useCriarOrigem();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function teclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancelar();
      return;
    }
    if (e.key !== "Enter" || !nome.trim() || criar.isPending) return;
    e.preventDefault();
    criar.mutate(
      { name: nome, groupId: grupoId },
      {
        onSuccess: (r) => onCriada(r.origens, r.id),
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <li className={cn("py-1 pr-3", RECUO_DO_TEXTO)}>
      <input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={teclar}
        aria-label={t("Nome da nova origem")}
        placeholder={t("Nome da nova origem")}
        disabled={criar.isPending}
        maxLength={80}
        className="h-7 w-full rounded-casca-gatilho bg-casca-busca px-2 text-xs text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-1 focus:ring-casca-marca disabled:opacity-60"
      />
      {erro ? (
        <p role="alert" className="mt-1 text-[11px] text-casca-alerta">
          {erro}
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-casca-suave">{t("Enter cria · Esc cancela")}</p>
      )}
    </li>
  );
}

/**
 * A linha do grupo (01-010, 01-032, 01-034), de 34px, com o quadradinho de 20px
 * a 16px da borda e o nome a 43px.
 * - Em repouso, só ícone e nome, em peso normal. O grupo da origem aberta fica em 600.
 * - No hover, a linha fica #F3F3F3 e aparecem a seta (na margem esquerda), o "+"
 *   (com a dica "Nova origem") e o ⋮.
 * - Aberto, o grupo fica assim mesmo sem o mouse em cima, como em 01-032/033.
 */
export function LinhaDoGrupo({
  grupo,
  aberto,
  oculto,
  ativo,
  podeGerenciar,
  criandoAqui,
  selecao,
  onAlternar,
  onNovaOrigem,
  onAcao,
  onAcaoDaOrigem,
  onCriada,
  onCancelarCriacao,
}: {
  grupo: GrupoNaArvore;
  aberto: boolean;
  oculto: boolean;
  ativo: string | null;
  podeGerenciar: boolean;
  criandoAqui: boolean;
  /** Presente no modo seleção: caixinha no grupo (marca todas) e nas origens; sem + e sem ⋮. */
  selecao?: SelecaoNoPainel;
  onAlternar: () => void;
  onNovaOrigem: () => void;
  onAcao: (a: AcaoDoGrupo) => void;
  onAcaoDaOrigem: (funilId: string, a: AcaoDaOrigem) => void;
  onCriada: (origens: Origens, id: string) => void;
  onCancelarCriacao: () => void;
}) {
  const t = useT();
  const estado = selecao ? estadoDoGrupo(grupo, selecao.marcadas) : "vazia";
  const temAOrigemAberta = grupo.funis.some((f) => f.id === ativo);
  return (
    <li>
      <div
        className={cn(
          "group/grupo",
          LINHA,
          LINHA_COM_HOVER,
          "gap-[7px] pr-1 pl-4",
          aberto && "bg-(--escale-painel-hover)",
        )}
      >
        <button
          type="button"
          aria-expanded={aberto}
          aria-label={`${aberto ? t("Fechar") : t("Abrir")} ${grupo.name}`}
          onClick={onAlternar}
          className={cn(
            "absolute inset-y-0 left-0 grid w-4 place-items-center text-casca-meta opacity-0 transition-opacity group-hover/grupo:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-casca-marca",
            aberto && "opacity-100",
          )}
        >
          {aberto ? <ChevronDown size={11} aria-hidden /> : <ChevronRight size={11} aria-hidden />}
        </button>
        {selecao && (
          <CaixaDaCasca
            marcada={estado === "marcada" ? true : estado === "parcial" ? "indeterminada" : false}
            aoMudar={() =>
              selecao.onAlternar(
                grupo.funis.map((f) => f.id),
                estado !== "marcada",
              )
            }
            aria-label={`${t("Selecionar")} ${grupo.name}`}
            desabilitada={grupo.funis.length === 0}
          />
        )}
        <IconeDoGrupo grupo={grupo} />
        <button
          type="button"
          tabIndex={-1}
          onClick={onAlternar}
          className={cn("h-full min-w-0 flex-1 truncate text-left", temAOrigemAberta && "font-semibold")}
        >
          {grupo.name}
          {oculto && <span className="ml-1 text-[11px] font-normal text-casca-suave">({t("oculto")})</span>}
        </button>
        {podeGerenciar && !selecao && (
          <span className={cn(SO_NO_HOVER, "group-hover/grupo:opacity-100", aberto && "opacity-100")}>
            <DicaEscura texto={t("Nova origem")}>
              <button
                type="button"
                aria-label={`${t("Nova origem em")} ${grupo.name}`}
                onClick={onNovaOrigem}
                className={BOTAO_DE_ICONE}
              >
                <Plus size={14} aria-hidden />
              </button>
            </DicaEscura>
            <MenuDoGrupo nome={grupo.name} oculto={oculto} onAcao={onAcao} />
          </span>
        )}
      </div>
      {aberto && (
        <ul>
          {criandoAqui && !selecao && (
            <NovaOrigemNoGrupo grupoId={grupo.id} onCriada={onCriada} onCancelar={onCancelarCriacao} />
          )}
          {grupo.funis.length === 0 && !criandoAqui ? (
            <li className={cn("flex h-[34px] items-center pr-3 text-[11px] text-casca-suave", RECUO_DO_TEXTO)}>
              {t("Nenhum funil neste grupo.")}
            </li>
          ) : (
            grupo.funis.map((f) => (
              <LinhaDaOrigem
                key={f.id}
                funil={f}
                ativo={ativo}
                podeGerenciar={podeGerenciar}
                recuo
                selecao={selecao}
                onAcao={(a) => onAcaoDaOrigem(f.id, a)}
              />
            ))
          )}
        </ul>
      )}
    </li>
  );
}
```

- [ ] **Step 4: Os dois encaixes para a branch compilar**

Em `components/escale/origens/PainelOrigens.tsx`:

4a. Troque

```tsx
import {
  BOTAO_DE_ICONE,
  LinhaDaOrigem,
```

por

```tsx
import { BOTAO_DE_ICONE } from "./estilos-do-painel";
import {
  LinhaDaOrigem,
```

4b. Logo depois da linha `import { Input } from "@/components/ui/input";`, acrescente:

```tsx
import { TooltipProvider } from "@/components/ui/tooltip";
```

4c. Troque

```tsx
  return (
    <aside
      aria-label={t("Origens")}
```

por

```tsx
  return (
    <TooltipProvider delayDuration={300}>
    <aside
      aria-label={t("Origens")}
```

4d. Troque o fim do componente

```tsx
      )}
    </aside>
  );
}
```

por

```tsx
      )}
    </aside>
    </TooltipProvider>
  );
}
```

(A indentação fica torta até a Task 5 reescrever o arquivo; o lint não reclama de indentação.)

Em `components/escale/visualizacoes/SecaoVisualizacoes.tsx`, troque

```tsx
import { BOTAO_DE_ICONE, SO_NO_FOCO, Tres } from "@/components/escale/origens/LinhasDoPainel";
```

por

```tsx
import { BOTAO_DE_ICONE, SO_NO_HOVER as SO_NO_FOCO } from "@/components/escale/origens/estilos-do-painel";
import { Tres } from "@/components/escale/origens/MenuDoPainel";
```

- [ ] **Step 5: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-painel-casca-clint.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/escale-com-origens.test.tsx
corepack pnpm typecheck
```
Expected:
- `escale-painel-casca-clint` PASS (9 testes);
- `escale-painel-origens` e `escale-com-origens` PASS sem mudar nenhuma linha deles;
- typecheck sem erros novos.

Se `CaixaDaCasca` acusar tipo em `aoMudar={(marcar) => …}`, confira a assinatura do contrato (`aoMudar: (v: boolean) => void`) e PARE se a V1 tiver outra.

- [ ] **Step 6: Conferir na tela**

Siga "Conferência na tela" (Global Constraints) e compare com 01-032-menu-grupo-origens.png, 01-033-menu-origem.png e 01-034-nova-origem.png. Confira:
- passe o mouse num grupo fechado;
- abra o ⋮ de um grupo e o ⋮ de uma origem;
- passe o mouse no "+" do grupo;
- entre no modo seleção.

Anote no relatório da tarefa as diferenças que sobraram. O cabeçalho e a coluna ainda são os antigos (Task 5).

- [ ] **Step 7: Commit**

```bash
git add components/escale/origens/LinhasDoPainel.tsx components/escale/origens/PainelOrigens.tsx components/escale/visualizacoes/SecaoVisualizacoes.tsx tests/unit/escale-painel-casca-clint.test.tsx
git commit -m "feat(escale): linhas de grupo e de origem iguais à Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: O painel em coluna inteira, como na Clint

**Files:**
- Modify (reescrever): `components/escale/origens/PainelOrigens.tsx`, `components/escale/origens/ComOrigens.tsx`, `components/escale/origens/ArquivadosDoPainel.tsx`
- Modify (casos no fim): `tests/unit/escale-painel-casca-clint.test.tsx`, `tests/unit/escale-com-origens.test.tsx`

**Interfaces:**
- Consumes:
  - `ENVOLTORIO_DO_PAINEL`, `CONTEUDO_AO_LADO_DO_PAINEL`, `BOLINHA_DO_PAINEL` e `BOTAO_DE_ICONE` (Task 3);
  - `ConteudoDoMenu` e `ItemDoMenu` (Task 3);
  - as linhas (Task 4).
- Produces:
  - `PainelOrigens` com as mesmas props;
  - a `<aside>` de 250px colada nas bordas;
  - `data-rolagem-do-painel` no corpo rolável, que o medidor da Task 8 usa;
  - `ComOrigens`, que na casca embrulha com `ENVOLTORIO_DO_PAINEL` e, fora dela, devolve `children` puro.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente no FIM de `tests/unit/escale-painel-casca-clint.test.tsx`:

```tsx
describe("casca V3 — a coluna do painel (01-010)", () => {
  it("é a coluna de 250px, branca, com a borda direita #E8E4F5 e a altura da tela abaixo do topo — não um cartão", () => {
    renderizar();
    const painel = screen.getByRole("complementary", { name: "Origens" });
    expect(painel).toHaveClass(
      "w-[250px]",
      "border-r",
      "border-casca-borda",
      "bg-surface",
      "h-[calc(100dvh-2.75rem)]",
      "sticky",
      "top-0",
    );
    expect(painel).not.toHaveClass("rounded-lg");
    expect(painel.querySelector("[data-rolagem-do-painel]")).toHaveClass("pt-[78px]");
  });

  it("o < é a bolinha de 20px centrada na borda direita, 16px abaixo do topo", () => {
    renderizar();
    expect(screen.getByRole("button", { name: "Recolher o painel de origens" })).toHaveClass(
      "size-5",
      "rounded-full",
      "-right-[10px]",
      "top-4",
      "border-casca-borda",
    );
  });

  it("recolhido, o > é a mesma bolinha, no topo da borda esquerda", () => {
    renderizar({ ...ABERTO, painelAberto: false });
    expect(screen.getByRole("button", { name: "Abrir o painel de origens" })).toHaveClass(
      "size-5",
      "rounded-full",
      "top-4",
    );
  });

  it("ORIGENS: lupa e ^ à vista; o + (nosso, sem print) só aparece no hover do cabeçalho", () => {
    renderizar();
    const cabecalho = screen.getByRole("heading", { name: "Origens" }).parentElement!;
    expect(cabecalho).toHaveClass("h-12", "border-b", "group/cabecalho");
    expect(screen.getByRole("button", { name: "Adicionar" }).closest("span")).toHaveClass(
      "opacity-0",
      "group-hover/cabecalho:opacity-100",
    );
    expect(screen.getByRole("button", { name: "Buscar grupo ou funil" })).not.toHaveClass("opacity-0");
    expect(screen.getByRole("button", { name: "Recolher a lista de origens" })).toHaveClass("text-casca-meta");
  });

  it("o + de ORIGENS abre o menu da casca com Adicionar origem e Adicionar grupo de origens", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("rounded-[8px]");
    expect(within(menu).getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Adicionar origem",
      "Adicionar grupo de origens",
    ]);
  });

  it("a lupa abre o campo #F6F8FF sem borda, com o texto de busca da Clint", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Buscar grupo ou funil" }));
    const campo = screen.getByRole("textbox", { name: "Buscar grupo ou funil" });
    expect(campo).toHaveClass("bg-casca-busca", "rounded-casca-gatilho");
    expect(campo).toHaveAttribute("placeholder", "Buscar origens, grupos, visualizações…");
  });
});
```

Acrescente no FIM de `tests/unit/escale-com-origens.test.tsx`, DENTRO do `describe("<ComOrigens>", …)`, logo antes do `});` que o fecha:

```tsx
  it("casca V3: o painel fica colado no topo, na esquerda e no fundo, e o conteúdo começa 20px depois dele", async () => {
    const { container } = mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    const envoltorio = container.firstElementChild!;
    expect(envoltorio).toHaveClass("md:-mt-6", "md:-ml-6");
    expect(envoltorio.className).toContain("var(--rodape-ocupado,0px)");
    expect(screen.getByText("o quadro").parentElement).toHaveClass("md:pl-5", "md:pt-6");
  });

  it("casca V3: sem a casca nova, o quadro do original chega sem embrulho nenhum", async () => {
    cookies = { escale_menu: "lateral" };
    const { container } = mostrar(await ComOrigens({ children: <p>o quadro</p> }));
    expect(container.innerHTML).toBe("<p>o quadro</p>");
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-painel-casca-clint.test.tsx tests/unit/escale-com-origens.test.tsx
```
Expected:
- FAIL nos casos da coluna, da bolinha, do cabeçalho, do menu do "+", da lupa e do envoltório (classes antigas: `w-64`, `rounded-lg`, `-right-3`, `gap-4`);
- o caso "sem a casca nova … sem embrulho nenhum" já PASSA. Ele prova o que já é verdade e fica de guarda.

- [ ] **Step 3: Reescrever o painel**

Replace o conteúdo inteiro de `components/escale/origens/PainelOrigens.tsx` por:

```tsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { guardarPreferenciaDeOrigens } from "@/app/actions/escale/origens";
import {
  JanelasDaVisualizacao,
  type JanelaDaVisualizacao,
} from "@/components/escale/visualizacoes/JanelasDaVisualizacao";
import { RodapeDaSelecao } from "@/components/escale/visualizacoes/RodapeDaSelecao";
import { SecaoVisualizacoes, type AcaoDaVisualizacao } from "@/components/escale/visualizacoes/SecaoVisualizacoes";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAtualizarVisualizacao } from "@/hooks/escale/useVisualizacoes";
import { useT } from "@/hooks/i18n/useT";
import type { PreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { filtrarArvore, funilDoCaminho, montarOrigens, type Origens } from "@/lib/escale/origens/regras";
import {
  alternarNaSelecao,
  filtrarVisualizacoes,
  ordenarNaArvore,
  origensVivasDaVisualizacao,
  visualizacaoDoCaminho,
  type Visualizacao,
} from "@/lib/escale/visualizacoes/regras";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FolderPlus,
  LayoutPanelLeft,
  Plus,
  Search,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ArquivadosDoPainel } from "./ArquivadosDoPainel";
import { CabecalhoDaSecao } from "./CabecalhoDaSecao";
import { BOLINHA_DO_PAINEL, BOTAO_DE_ICONE, SO_NO_HOVER } from "./estilos-do-painel";
import { JanelasDeOrigens, type Janela } from "./JanelasDeOrigens";
import {
  LinhaDaOrigem,
  LinhaDoGrupo,
  type AcaoDaOrigem,
  type AcaoDoGrupo,
  type SelecaoNoPainel,
} from "./LinhasDoPainel";
import { ConteudoDoMenu, ItemDoMenu } from "./MenuDoPainel";
import { textoDoErro } from "./texto-do-erro";

const JANELA_DO_GRUPO: Record<
  Exclude<AcaoDoGrupo, "ocultar" | "selecionar">,
  "config-grupo" | "customizar" | "arquivar-grupo" | "excluir-grupo"
> = {
  configurar: "config-grupo",
  customizar: "customizar",
  arquivar: "arquivar-grupo",
  excluir: "excluir-grupo",
};
const JANELA_DA_ORIGEM: Record<Exclude<AcaoDaOrigem, "selecionar">, "config-origem" | "arquivar-origem" | "excluir-origem"> = {
  configurar: "config-origem",
  arquivar: "arquivar-origem",
  excluir: "excluir-origem",
};

/**
 * O modo seleção (Fase 1C): caixinhas nas origens e o rodapé "Rascunho".
 * `editando` é a visualização cujas origens estão sendo trocadas; `null` é uma
 * visualização nova.
 */
interface Selecao {
  editando: string | null;
  marcadas: ReadonlySet<string>;
}

/**
 * O PAINEL ORIGENS (fork Escale, Fases 1A, 1B e 1C; visual da Clint na casca V3).
 *
 * É a coluna da esquerda de Negócios na casca nova, igual à Clint (01-010): 250px,
 * branca, do topo ao fundo da tela, com a borda direita #E8E4F5. Peças:
 * - a bolinha "<" fica centrada na borda e recolhe o painel;
 * - 78px abaixo do topo vêm as seções: ORIGENS (lupa, ^ e o "+" de adicionar,
 *   que só aparece no hover) e VISUALIZAÇÕES;
 * - a seta abre o grupo, o "+" do grupo cria uma origem dentro dele, e os ⋮
 *   levam às janelas (`JanelasDeOrigens`);
 * - o "+" das visualizações e o "Selecionar" dos ⋮ entram no modo seleção.
 *
 * RECENTES entra com a Fase 1E (ver o comentário no lugar dela).
 *
 * Só md+: no celular o quadro segue como sempre.
 *
 * Origens e visualizações vêm do servidor (`ComOrigens`) e são trocadas pelo que
 * cada mutação devolve. Quando o servidor manda novidade, o ajuste acontece
 * durante o render (padrão de `app/app/kanban/_client.tsx`). As preferências
 * (painel, lista, visualizações, ocultos) também vêm do servidor, de cookie, e
 * cada mudança é gravada pela Server Action; nenhum `useState` lê o navegador.
 */
export function PainelOrigens({
  origens: doServidor,
  visualizacoes: visualizacoesDoServidor,
  podeGerenciar,
  preferencias,
}: {
  origens: Origens;
  visualizacoes: Visualizacao[];
  podeGerenciar: boolean;
  preferencias: PreferenciasDoPainel;
}) {
  const t = useT();
  const router = useRouter();
  const caminho = usePathname() ?? "";
  const ativo = funilDoCaminho(caminho);
  const visualizacaoAtiva = visualizacaoDoCaminho(caminho);

  const [origens, setOrigens] = useState<Origens>(doServidor);
  const [ultimoDoServidor, setUltimoDoServidor] = useState<Origens>(doServidor);
  if (doServidor !== ultimoDoServidor) {
    setUltimoDoServidor(doServidor);
    setOrigens(doServidor);
  }
  const [visualizacoes, setVisualizacoes] = useState<Visualizacao[]>(visualizacoesDoServidor);
  const [ultimasDoServidor, setUltimasDoServidor] = useState<Visualizacao[]>(visualizacoesDoServidor);
  if (visualizacoesDoServidor !== ultimasDoServidor) {
    setUltimasDoServidor(visualizacoesDoServidor);
    setVisualizacoes(visualizacoesDoServidor);
  }

  const [painelAberto, setPainelAberto] = useState(preferencias.painelAberto);
  const [listaAberta, setListaAberta] = useState(preferencias.listaAberta);
  const [visualizacoesAbertas, setVisualizacoesAbertas] = useState(preferencias.visualizacoesAbertas);
  const [ocultos, setOcultos] = useState<string[]>(preferencias.ocultos);
  const [verOcultos, setVerOcultos] = useState(false);
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => {
    const grupoDoAtivo = doServidor.funis.find((f) => f.id === ativo)?.group_id;
    return new Set(grupoDoAtivo ? [grupoDoAtivo] : []);
  });
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const [novoEm, setNovoEm] = useState<string | null>(null);
  const [janela, setJanela] = useState<Janela | null>(null);
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [erroDaSelecao, setErroDaSelecao] = useState<string | null>(null);
  const [janelaDaVisualizacao, setJanelaDaVisualizacao] = useState<JanelaDaVisualizacao | null>(null);
  const atualizarVisualizacao = useAtualizarVisualizacao();

  // O "Negócios" do menu do topo abre o último funil aberto (`/app/escale/negocios`).
  useEffect(() => {
    if (ativo) void guardarPreferenciaDeOrigens({ nome: "ultimo_funil", valor: ativo });
  }, [ativo]);

  const arvore = useMemo(() => montarOrigens(origens), [origens]);
  const buscando = busca.trim().length > 0;
  const filtrada = buscando ? filtrarArvore(arvore, busca) : arvore;
  const visiveis = verOcultos ? filtrada.grupos : filtrada.grupos.filter((g) => !ocultos.includes(g.id));
  const quantosOcultos = arvore.grupos.filter((g) => ocultos.includes(g.id)).length;
  const nadaAchado = buscando && visiveis.length === 0 && filtrada.semGrupo.length === 0;
  const visualizacoesVisiveis = filtrarVisualizacoes(visualizacoes, busca);

  const noModoSelecao: SelecaoNoPainel | undefined = selecao
    ? {
        marcadas: selecao.marcadas,
        onAlternar: (ids, marcar) =>
          setSelecao((atual) => atual && { ...atual, marcadas: alternarNaSelecao(atual.marcadas, ids, marcar) }),
      }
    : undefined;

  function alternarPainel() {
    const proximo = !painelAberto;
    setPainelAberto(proximo);
    void guardarPreferenciaDeOrigens({ nome: "painel", valor: proximo ? "aberto" : "fechado" });
  }

  function alternarLista() {
    const proximo = !listaAberta;
    setListaAberta(proximo);
    void guardarPreferenciaDeOrigens({ nome: "lista", valor: proximo ? "aberta" : "fechada" });
  }

  function alternarVisualizacoes() {
    const proximo = !visualizacoesAbertas;
    setVisualizacoesAbertas(proximo);
    void guardarPreferenciaDeOrigens({ nome: "visualizacoes", valor: proximo ? "aberta" : "fechada" });
  }

  function alternarGrupo(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  /** Entra no modo seleção já com `ids` marcadas, abrindo os grupos delas. */
  function selecionar(ids: string[], editando: string | null) {
    setErroDaSelecao(null);
    setSelecao({ editando, marcadas: new Set(ids) });
    // Sem a lista aberta o modo seleção seria invisível; não grava a preferência.
    setListaAberta(true);
    const grupos = origens.funis.filter((f) => ids.includes(f.id)).flatMap((f) => (f.group_id ? [f.group_id] : []));
    setAbertos((atual) => new Set([...atual, ...grupos]));
  }

  function acaoDoGrupo(id: string, acao: AcaoDoGrupo) {
    if (acao === "ocultar") {
      const proximo = ocultos.includes(id) ? ocultos.filter((o) => o !== id) : [...ocultos, id];
      setOcultos(proximo);
      void guardarPreferenciaDeOrigens({ nome: "ocultos", valor: proximo });
      return;
    }
    if (acao === "selecionar") {
      selecionar(arvore.grupos.find((g) => g.id === id)?.funis.map((f) => f.id) ?? [], null);
      setAbertos((atual) => new Set([...atual, id]));
      return;
    }
    setJanela({ tipo: JANELA_DO_GRUPO[acao], id });
  }

  function acaoDaOrigem(id: string, acao: AcaoDaOrigem) {
    if (acao === "selecionar") {
      selecionar([id], null);
      return;
    }
    setJanela({ tipo: JANELA_DA_ORIGEM[acao], id });
  }

  function acaoDaVisualizacao(id: string, acao: AcaoDaVisualizacao) {
    if (acao === "editar-origens") {
      const alvo = visualizacoes.find((v) => v.id === id);
      if (alvo) selecionar(origensVivasDaVisualizacao(alvo, origens).map((f) => f.id), id);
      return;
    }
    setJanelaDaVisualizacao({ tipo: acao, id });
  }

  function abrirOrigem(id: string) {
    router.push(`/app/pipelines/${id}`);
  }

  function abrirVisualizacao(id: string) {
    router.push(`/app/pipelines/visualizacoes/${id}`);
  }

  function salvarSelecao() {
    if (!selecao) return;
    // A ordem das colunas é a ordem do painel, não a ordem dos cliques.
    const ids = ordenarNaArvore(selecao.marcadas, arvore);
    if (selecao.editando === null) {
      setJanelaDaVisualizacao({ tipo: "nova", origens: ids });
      return;
    }
    const id = selecao.editando;
    atualizarVisualizacao.mutate(
      { id, mudanca: { origens: ids } },
      {
        onSuccess: (lista) => {
          setVisualizacoes(lista);
          setSelecao(null);
          abrirVisualizacao(id);
        },
        onError: (err) => setErroDaSelecao(textoDoErro(err, t)),
      },
    );
  }

  // Recolhido: a Clint não mostra este estado (item 8 de "Prints que faltam").
  // Fica a mesma bolinha, no topo da borda esquerda, para reabrir.
  if (!painelAberto) {
    return (
      <div className="relative hidden w-0 shrink-0 md:block">
        <button
          type="button"
          aria-label={t("Abrir o painel de origens")}
          onClick={alternarPainel}
          className={cn(BOLINHA_DO_PAINEL, "left-2")}
        >
          <ChevronRight size={12} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        aria-label={t("Origens")}
        className="sticky top-0 hidden h-[calc(100dvh-2.75rem)] w-[250px] shrink-0 flex-col border-r border-casca-borda bg-surface md:flex"
      >
        <button
          type="button"
          aria-label={t("Recolher o painel de origens")}
          onClick={alternarPainel}
          className={cn(BOLINHA_DO_PAINEL, "-right-[10px]")}
        >
          <ChevronLeft size={12} aria-hidden />
        </button>

        <div data-rolagem-do-painel="" className="min-h-0 flex-1 overflow-y-auto pt-[78px]">
          <CabecalhoDaSecao icone={<LayoutPanelLeft size={16} className="-scale-x-100" />} titulo={t("Origens")}>
            {podeGerenciar && !selecao && (
              <span className={cn(SO_NO_HOVER, "group-hover/cabecalho:opacity-100")}>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={t("Adicionar")} className={BOTAO_DE_ICONE}>
                      <Plus size={16} aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <ConteudoDoMenu side="bottom" align="end">
                    <ItemDoMenu icone={Plus} onSelect={() => setJanela({ tipo: "adicionar-origem", grupoId: null })}>
                      {t("Adicionar origem")}
                    </ItemDoMenu>
                    <ItemDoMenu icone={FolderPlus} onSelect={() => setJanela({ tipo: "adicionar-grupo" })}>
                      {t("Adicionar grupo de origens")}
                    </ItemDoMenu>
                  </ConteudoDoMenu>
                </DropdownMenu>
              </span>
            )}
            <button
              type="button"
              aria-label={t("Buscar grupo ou funil")}
              aria-pressed={buscaAberta}
              onClick={() => {
                setBuscaAberta((v) => !v);
                setBusca("");
              }}
              className={cn(BOTAO_DE_ICONE, buscaAberta && "text-casca-marca")}
            >
              <Search size={16} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={listaAberta ? t("Recolher a lista de origens") : t("Abrir a lista de origens")}
              aria-expanded={listaAberta}
              onClick={alternarLista}
              className={cn(BOTAO_DE_ICONE, "text-casca-meta")}
            >
              {listaAberta ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
            </button>
          </CabecalhoDaSecao>

          {buscaAberta && (
            <div className="border-b border-casca-borda px-4 py-2">
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t("Buscar origens, grupos, visualizações…")}
                aria-label={t("Buscar grupo ou funil")}
                className="h-8 w-full rounded-casca-gatilho bg-casca-busca px-3 text-xs text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-1 focus:ring-casca-marca"
              />
            </div>
          )}

          {listaAberta && (
            <div>
              <nav aria-label={t("Funis por grupo")}>
                <ul>
                  {visiveis.map((g) => (
                    <LinhaDoGrupo
                      key={g.id}
                      grupo={g}
                      aberto={buscando || abertos.has(g.id) || novoEm === g.id}
                      oculto={ocultos.includes(g.id)}
                      ativo={ativo}
                      podeGerenciar={podeGerenciar}
                      criandoAqui={novoEm === g.id}
                      selecao={noModoSelecao}
                      onAlternar={() => alternarGrupo(g.id)}
                      onNovaOrigem={() => setNovoEm(g.id)}
                      onAcao={(a) => acaoDoGrupo(g.id, a)}
                      onAcaoDaOrigem={acaoDaOrigem}
                      onCriada={(novas, id) => {
                        setOrigens(novas);
                        setNovoEm(null);
                        abrirOrigem(id);
                      }}
                      onCancelarCriacao={() => setNovoEm(null)}
                    />
                  ))}
                </ul>
                {filtrada.semGrupo.length > 0 && (
                  <div>
                    <p className="flex h-8 items-center px-4 text-[11px] font-semibold text-casca-suave uppercase">
                      {t("Sem grupo")}
                    </p>
                    <ul>
                      {filtrada.semGrupo.map((f) => (
                        <LinhaDaOrigem
                          key={f.id}
                          funil={f}
                          ativo={ativo}
                          podeGerenciar={podeGerenciar}
                          recuo={false}
                          selecao={noModoSelecao}
                          onAcao={(a) => acaoDaOrigem(f.id, a)}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </nav>

              {nadaAchado && (
                <p className="flex h-[34px] items-center px-4 text-xs text-casca-suave">{t("Nada encontrado.")}</p>
              )}

              {quantosOcultos > 0 && (
                <div className="flex h-8 items-center justify-between px-4 text-[11px] text-casca-suave uppercase">
                  <span>
                    {(quantosOcultos === 1 ? t("{n} grupo oculto") : t("{n} grupos ocultos")).replace(
                      "{n}",
                      String(quantosOcultos),
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVerOcultos((v) => !v)}
                    className="font-semibold hover:text-casca-texto"
                  >
                    {verOcultos ? t("Esconder") : t("Mostrar")}
                  </button>
                </div>
              )}

              {podeGerenciar && !selecao && <ArquivadosDoPainel arvore={arvore} onOrigens={setOrigens} />}
            </div>
          )}

          {!selecao && (
            <SecaoVisualizacoes
              visualizacoes={visualizacoesVisiveis}
              origens={origens}
              ativa={visualizacaoAtiva}
              aberta={visualizacoesAbertas}
              podeGerenciar={podeGerenciar}
              onAlternar={alternarVisualizacoes}
              onCriar={() => selecionar([], null)}
              onAcao={acaoDaVisualizacao}
            />
          )}

          {/*
            RECENTES (01-010, terceira seção) entra AQUI com a Fase 1E, quando ela for
            reescrita sob a regra nova: `SecaoRecentes` com `CabecalhoDaSecao`, o ícone
            `Clock`, o chevron com `BOTAO_DE_ICONE` + `text-casca-meta` e as linhas com
            `LINHA`/`LINHA_COM_HOVER`. Hoje não há dado de recentes, e cabeçalho que não
            abre nada seria controle decorativo.
          */}
        </div>

        {selecao && (
          <RodapeDaSelecao
            quantas={selecao.marcadas.size}
            editando={selecao.editando !== null}
            salvando={atualizarVisualizacao.isPending}
            erro={erroDaSelecao}
            onCancelar={() => setSelecao(null)}
            onSalvar={salvarSelecao}
          />
        )}

        {podeGerenciar && (
          <JanelasDeOrigens
            janela={janela}
            origens={origens}
            onFechar={() => setJanela(null)}
            onOrigens={setOrigens}
            onAbrirOrigem={abrirOrigem}
          />
        )}
        {podeGerenciar && (
          <JanelasDaVisualizacao
            janela={janelaDaVisualizacao}
            visualizacoes={visualizacoes}
            onFechar={() => setJanelaDaVisualizacao(null)}
            onVisualizacoes={setVisualizacoes}
            onCriada={(id) => {
              setSelecao(null);
              abrirVisualizacao(id);
            }}
            onExcluida={(id) => {
              if (visualizacaoAtiva === id) router.push("/app/escale/negocios");
            }}
          />
        )}
      </aside>
    </TooltipProvider>
  );
}
```

- [ ] **Step 4: O envoltório**

Replace o conteúdo inteiro de `components/escale/origens/ComOrigens.tsx` por:

```tsx
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import type { Origens } from "@/lib/escale/origens/regras";
import { lerPreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { lerVisualizacoes } from "@/lib/escale/visualizacoes/ler-visualizacoes";
import type { Visualizacao } from "@/lib/escale/visualizacoes/regras";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
import { createClient } from "@/lib/supabase/server";

import { CONTEUDO_AO_LADO_DO_PAINEL, ENVOLTORIO_DO_PAINEL } from "./estilos-do-painel";
import { PainelOrigens } from "./PainelOrigens";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Banco sem a 9003 (ou fora do ar): o painel abre com a seção Visualizações vazia. */
async function visualizacoesOuNada(supabase: Supabase, orgId: string): Promise<Visualizacao[]> {
  try {
    return await lerVisualizacoes(supabase, orgId);
  } catch (err) {
    console.error("[escale/visualizacoes] não consegui ler as visualizações; o painel abre sem elas", err);
    return [];
  }
}

/**
 * O PAINEL ORIGENS AO LADO DE NEGÓCIOS (fork Escale, Fase 1A; coluna da Clint na casca V3).
 *
 * Só com a casca nova ligada (cookie `escale_menu=topo`, Fase 0). Na lateral do
 * original a tela é exatamente a de sempre: `children` sem embrulho nenhum, e o
 * banco nem é consultado.
 *
 * O marcador de gerente é o mesmo critério das rotas (`requireRole("manager")`,
 * sem atalho de platform admin). Mostrar um botão que o servidor recusaria seria
 * prometer o que não se cumpre (ver `app/app/kanban/page.tsx`).
 *
 * Na casca, o envoltório cola o painel no topo, na esquerda e no fundo da tela
 * (01-010), e o conteúdo começa 20px depois dele (`estilos-do-painel.ts`).
 *
 * Se a leitura falhar (banco ainda sem a migration 9001, ou fora do ar), o
 * quadro abre sem o painel: Negócios nunca fica fora do ar por causa dele.
 */
export async function ComOrigens({ children }: { children: ReactNode }) {
  const store = await cookies();
  if (lerPreferenciaDeMenu(store.get(COOKIE_DO_MENU)?.value) !== "topo") return <>{children}</>;

  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) return <>{children}</>;

  const supabase = await createClient();
  let origens: Origens;
  try {
    origens = await lerOrigens(supabase, activeOrg.orgId);
  } catch (err) {
    console.error("[escale/origens] não consegui ler os grupos de funis; o quadro abre sem o painel", err);
    return <>{children}</>;
  }

  return (
    <div className={ENVOLTORIO_DO_PAINEL}>
      <PainelOrigens
        origens={origens}
        visualizacoes={await visualizacoesOuNada(supabase, activeOrg.orgId)}
        podeGerenciar={ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager}
        // Painel/lista recolhidos e grupos ocultos vêm de cookie: o primeiro render já sai certo.
        preferencias={lerPreferenciasDoPainel((nome) => store.get(nome)?.value)}
      />
      <div className={CONTEUDO_AO_LADO_DO_PAINEL}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Arquivados no estilo do painel**

A Clint não mostra grupos ou origens arquivados no painel (item 14 de "Prints que faltam"). Fica o comportamento de hoje, no estilo dos sobretítulos e das linhas do painel.

Replace o conteúdo inteiro de `components/escale/origens/ArquivadosDoPainel.tsx` por:

```tsx
"use client";
import { useState } from "react";

import { useAtualizarGrupo, useDesarquivarOrigem } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import type { ArvoreDeOrigens, Origens } from "@/lib/escale/origens/regras";
import { ChevronDown, ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { LINHA, LINHA_COM_HOVER, RECUO_DO_TEXTO } from "./estilos-do-painel";
import { IconeDoGrupo } from "./IconeDoGrupo";
import { textoDoErro } from "./texto-do-erro";

const BOTAO_DESARQUIVAR = "shrink-0 text-[11px] font-semibold text-casca-marca hover:underline disabled:opacity-60";

/**
 * ARQUIVADOS no pé da lista (fork Escale, Fase 1B), só para gerente+.
 * - Os grupos arquivados vêm com as origens que voltam junto.
 * - As origens arquivadas vêm uma a uma.
 * - Cada um tem Desarquivar.
 *
 * Sem print da Clint (item 14): sobretítulo 11px/600 em caixa alta, como "Sem
 * grupo", e linhas de 34px do painel.
 */
export function ArquivadosDoPainel({
  arvore,
  onOrigens,
}: {
  arvore: ArvoreDeOrigens;
  onOrigens: (origens: Origens) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const grupo = useAtualizarGrupo();
  const origem = useDesarquivarOrigem();
  const total = arvore.gruposArquivados.length + arvore.funisArquivados.length;
  if (total === 0) return null;

  const aoTerminar = {
    onSuccess: (r: Origens) => {
      setErro(null);
      onOrigens(r);
    },
    onError: (err: unknown) => setErro(textoDoErro(err, t)),
  };
  const ocupado = grupo.isPending || origem.isPending;

  return (
    <div className="border-t border-casca-borda">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="flex h-8 w-full items-center justify-between px-4 text-[11px] font-semibold text-casca-suave uppercase hover:text-casca-texto"
      >
        <span>
          {t("Arquivados")} ({total})
        </span>
        {aberto ? <ChevronDown size={12} aria-hidden /> : <ChevronRight size={12} aria-hidden />}
      </button>
      {aberto && (
        <ul>
          {arvore.gruposArquivados.map((g) => {
            const n = g.funis.length;
            const quantas = n === 1 ? t("{n} origem") : t("{n} origens");
            return (
              <li key={g.id} className={cn(LINHA, LINHA_COM_HOVER, "gap-[7px] pr-3 pl-4 text-casca-suave")}>
                <IconeDoGrupo grupo={g} />
                <span className="min-w-0 flex-1 truncate">
                  {g.name} · {quantas.replace("{n}", String(n))}
                </span>
                <button
                  type="button"
                  aria-label={`${t("Desarquivar")} ${g.name}`}
                  disabled={ocupado}
                  onClick={() => grupo.mutate({ id: g.id, mudanca: { is_archived: false } }, aoTerminar)}
                  className={BOTAO_DESARQUIVAR}
                >
                  {t("Desarquivar")}
                </button>
              </li>
            );
          })}
          {arvore.funisArquivados.map((f) => (
            <li key={f.id} className={cn(LINHA, LINHA_COM_HOVER, "gap-2 pr-3 text-casca-suave", RECUO_DO_TEXTO)}>
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`${t("Desarquivar")} ${f.name}`}
                disabled={ocupado}
                onClick={() => origem.mutate(f.id, aoTerminar)}
                className={BOTAO_DESARQUIVAR}
              >
                {t("Desarquivar")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {erro && (
        <p role="alert" className="px-4 pb-2 text-[11px] text-casca-alerta">
          {erro}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-painel-casca-clint.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/escale-com-origens.test.tsx tests/unit/altura-fixa-le-a-reserva-do-rodape.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/barra-lateral-nao-flutua.test.ts tests/unit/rodape-ocupado-contrato.test.ts
corepack pnpm typecheck
```
Expected:
- `escale-painel-casca-clint` PASS (15 testes);
- `escale-painel-origens` PASS;
- `escale-com-origens` PASS (10 testes: os 8 de antes e os 2 novos);
- as quatro cercas PASS;
- typecheck sem erros novos.

- [ ] **Step 7: Conferir na tela**

Siga "Conferência na tela" e compare com 01-010-kanban-v1.png e com o recorte C:\Documentos\projetos claude\Deskcom CRM\docs\clint\crops\leftpanel.png. Rode o medidor: painel, bolinha, cabeçalho, linhas e conteúdo têm de bater com a tabela (±1px). Confira também:
- a página não ganhou rolagem vertical nova;
- com o painel recolhido, a bolinha de reabrir aparece e o conteúdo encosta a 20px da borda.

Anote as diferenças que sobraram no relatório da tarefa.

- [ ] **Step 8: Commit**

```bash
git add components/escale/origens/PainelOrigens.tsx components/escale/origens/ComOrigens.tsx components/escale/origens/ArquivadosDoPainel.tsx tests/unit/escale-painel-casca-clint.test.tsx tests/unit/escale-com-origens.test.tsx
git commit -m "feat(escale): painel esquerdo em coluna inteira, como na Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: A seção VISUALIZAÇÕES e o rodapé da seleção

**Files:**
- Modify (reescrever): `components/escale/visualizacoes/SecaoVisualizacoes.tsx`, `components/escale/visualizacoes/RodapeDaSelecao.tsx`
- Modify (casos no fim): `tests/unit/escale-painel-casca-clint.test.tsx`

**Interfaces:**
- Consumes:
  - `CabecalhoDaSecao`, `BOTAO_DE_ICONE`, `SO_NO_HOVER`, `LINHA`, `LINHA_ATUAL`, `LINHA_COM_HOVER` e o menu (Task 3);
  - `COR_DO_ICONE_DA_VISUALIZACAO` (Task 1);
  - `BotaoDaCasca` da V1.
- Produces:
  - `SecaoVisualizacoes` e `RodapeDaSelecao` com as mesmas props;
  - `data-icone-da-visualizacao` no quadradinho.

**Referência:** a variante superior não tem print com VISUALIZAÇÕES aberta (item 10 de "Prints que faltam"). A linha segue a da origem (01-032), com o quadradinho e o "N origens" de 01-014. O rodapé segue 01-026, que é da variante lateral: marcador + "N origens selecionadas · Rascunho" na cor da marca, "Cancelar" de texto e o botão da marca com o disquete.

- [ ] **Step 1: Conferir a variante `marca` do botão da V1**

```bash
grep -n "Plus\|variante" components/escale/ui/BotaoDaCasca.tsx | head -20
```
Expected: a variante `marca` desenha só o que vem em `children`. Se ela acrescentar o "+" sozinha (o "Negócio +"), PARE e pergunte ao usuário. O "Salvar como visualização" da Clint (01-026) não tem "+".

- [ ] **Step 2: Escrever os testes que falham**

Acrescente no FIM de `tests/unit/escale-painel-casca-clint.test.tsx`:

```tsx
describe("casca V3 — VISUALIZAÇÕES e o rodapé da seleção", () => {
  it("o cabeçalho tem o ícone de quadro tracejado e o ^ cinza; o + só aparece no hover", () => {
    renderizar();
    const secao = screen.getByRole("region", { name: "Visualizações" });
    const cabecalho = within(secao).getByRole("heading", { name: "Visualizações" }).parentElement!;
    expect(cabecalho).toHaveClass("h-12", "border-b");
    expect(cabecalho.querySelector("svg")).not.toBeNull();
    expect(within(secao).getByRole("button", { name: "Recolher as visualizações" })).toHaveClass("text-casca-meta");
    expect(within(secao).getByRole("button", { name: "Criar visualização" }).closest("span")).toHaveClass("opacity-0");
  });

  it("a linha da visualização tem 34px, o quadrado #4A4A4A com as iniciais e a contagem à direita", () => {
    renderizar();
    const link = screen.getByRole("link", { name: /Time comercial/ });
    expect(link.closest("li")).toHaveClass("h-[34px]");
    const icone = link.querySelector("[data-icone-da-visualizacao]");
    expect(icone).toHaveStyle({ backgroundColor: "#4A4A4A" });
    expect(icone).toHaveTextContent("TC");
    expect(within(link).getByText("2 origens")).toHaveClass("text-[11px]", "text-casca-suave");
  });

  it("a visualização aberta ganha o fundo #EFF3FF e a barra da marca", () => {
    caminho = "/app/pipelines/visualizacoes/v-time";
    renderizar();
    expect(screen.getByRole("link", { name: /Time comercial/ }).closest("li")).toHaveClass(
      "bg-casca-raia",
      "before:bg-casca-marca",
    );
  });

  it("o rodapé da seleção fala na cor da marca, com o marcador, e o Salvar leva o disquete (01-026)", async () => {
    const user = renderizar();
    await user.click(
      within(screen.getByRole("region", { name: "Visualizações" })).getByRole("button", { name: "Criar visualização" }),
    );
    const texto = screen.getByText("0 origens selecionadas · Rascunho");
    expect(texto).toHaveClass("text-casca-marca", "font-semibold");
    expect(texto.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Salvar como visualização" }).querySelector("svg")).not.toBeNull();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-painel-casca-clint.test.tsx
```
Expected: FAIL nos 4 casos novos (classes e ícones antigos); os 15 de antes PASS.

- [ ] **Step 4: Reescrever a seção**

Replace o conteúdo inteiro de `components/escale/visualizacoes/SecaoVisualizacoes.tsx` por:

```tsx
"use client";
import Link from "next/link";

import { CabecalhoDaSecao } from "@/components/escale/origens/CabecalhoDaSecao";
import {
  BOTAO_DE_ICONE,
  LINHA,
  LINHA_ATUAL,
  LINHA_COM_HOVER,
  SO_NO_HOVER,
} from "@/components/escale/origens/estilos-do-painel";
import { ConteudoDoMenu, ItemDoMenu, SeparadorDoMenu, Tres } from "@/components/escale/origens/MenuDoPainel";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { COR_DO_ICONE_DA_VISUALIZACAO } from "@/lib/escale/origens/cores-da-casca";
import { iniciais, type Origens } from "@/lib/escale/origens/regras";
import { origensVivasDaVisualizacao, type Visualizacao } from "@/lib/escale/visualizacoes/regras";
import {
  ChevronDown,
  ChevronUp,
  ListChecks,
  Plus,
  Settings,
  SquareDashedKanban,
  Trash2,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export type AcaoDaVisualizacao = "editar-origens" | "configurar" | "excluir";

/** O ⋮ da visualização, no mesmo menu da casca dos grupos e das origens (01-032/033). */
function MenuDaVisualizacao({ nome, onAcao }: { nome: string; onAcao: (a: AcaoDaVisualizacao) => void }) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <Tres rotulo={`${t("Mais ações de")} ${nome}`} />
      <ConteudoDoMenu>
        <ItemDoMenu icone={ListChecks} onSelect={() => onAcao("editar-origens")}>
          {t("Editar origens")}
        </ItemDoMenu>
        <ItemDoMenu icone={Settings} onSelect={() => onAcao("configurar")}>
          {t("Configurações")}
        </ItemDoMenu>
        <SeparadorDoMenu />
        <ItemDoMenu icone={Trash2} perigo onSelect={() => onAcao("excluir")}>
          {t("Excluir")}
        </ItemDoMenu>
      </ConteudoDoMenu>
    </DropdownMenu>
  );
}

/**
 * A SEÇÃO VISUALIZAÇÕES do painel (fork Escale, Fase 1C; visual da Clint na casca V3).
 *
 * O cabeçalho é o de 01-010: quadro tracejado, título e ^. O "+" de criar só
 * aparece no hover do cabeçalho, porque a variante superior não mostra onde
 * fica (item 10 de "Prints que faltam").
 *
 * Cada linha é a de 34px do painel, com o quadradinho #4A4A4A de iniciais, o
 * nome e "N origens" à direita (01-014). A aberta tem o fundo #EFF3FF e a barra
 * da marca.
 *
 * O "+" e o "Editar origens" do ⋮ entram no modo seleção. Quem não é gerente vê
 * só as visualizações que o acesso deixa (RLS), sem "+" e sem ⋮. É seção irmã de
 * ORIGENS: recolher a lista de origens não esconde as visualizações.
 */
export function SecaoVisualizacoes({
  visualizacoes,
  origens,
  ativa,
  aberta,
  podeGerenciar,
  onAlternar,
  onCriar,
  onAcao,
}: {
  visualizacoes: Visualizacao[];
  origens: Origens;
  ativa: string | null;
  aberta: boolean;
  podeGerenciar: boolean;
  onAlternar: () => void;
  onCriar: () => void;
  onAcao: (id: string, acao: AcaoDaVisualizacao) => void;
}) {
  const t = useT();
  return (
    <section aria-label={t("Visualizações")}>
      <CabecalhoDaSecao icone={<SquareDashedKanban size={16} />} titulo={t("Visualizações")}>
        {podeGerenciar && (
          <span className={cn(SO_NO_HOVER, "group-hover/cabecalho:opacity-100")}>
            <button type="button" aria-label={t("Criar visualização")} onClick={onCriar} className={BOTAO_DE_ICONE}>
              <Plus size={16} aria-hidden />
            </button>
          </span>
        )}
        <button
          type="button"
          aria-label={aberta ? t("Recolher as visualizações") : t("Abrir as visualizações")}
          aria-expanded={aberta}
          onClick={onAlternar}
          className={cn(BOTAO_DE_ICONE, "text-casca-meta")}
        >
          {aberta ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
        </button>
      </CabecalhoDaSecao>
      {aberta && visualizacoes.length === 0 && (
        <p className="flex h-[34px] items-center pr-3 pl-4 text-[11px] text-casca-suave">
          {t("Nenhuma visualização ainda.")}
        </p>
      )}
      {aberta && visualizacoes.length > 0 && (
        <ul>
          {visualizacoes.map((v) => {
            const quantas = origensVivasDaVisualizacao(v, origens).length;
            const atual = v.id === ativa;
            return (
              <li key={v.id} className={cn("group/vis", LINHA, atual ? LINHA_ATUAL : LINHA_COM_HOVER, "pr-1")}>
                <Link
                  href={`/app/pipelines/visualizacoes/${v.id}`}
                  aria-current={atual ? "page" : undefined}
                  className="flex h-full min-w-0 flex-1 items-center gap-[7px] pr-2 pl-4"
                >
                  <span
                    aria-hidden
                    data-icone-da-visualizacao=""
                    className="flex size-5 shrink-0 items-center justify-center rounded-[4px] text-[8px] leading-none font-semibold text-white"
                    style={{ backgroundColor: COR_DO_ICONE_DA_VISUALIZACAO }}
                  >
                    {iniciais(v.name)}
                  </span>
                  <span className="min-w-0 truncate">{v.name}</span>
                  <span className="ml-auto shrink-0 pl-2 text-[11px] text-casca-suave">
                    {(quantas === 1 ? t("{n} origem") : t("{n} origens")).replace("{n}", String(quantas))}
                  </span>
                </Link>
                {podeGerenciar && (
                  <span className={cn(SO_NO_HOVER, "group-hover/vis:opacity-100")}>
                    <MenuDaVisualizacao nome={v.name} onAcao={(a) => onAcao(v.id, a)} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Reescrever o rodapé da seleção**

Replace o conteúdo inteiro de `components/escale/visualizacoes/RodapeDaSelecao.tsx` por:

```tsx
"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { VISUALIZACAO_MAX_ORIGENS } from "@/lib/escale/visualizacoes/regras";
import { Bookmark, Save } from "@/lib/ui/icons-da-casca";

/**
 * O RODAPÉ DO MODO SELEÇÃO (fork Escale, Fase 1C; visual da Clint na casca V3).
 *
 * É o de 01-026, a única evidência; ela é da variante lateral:
 * - à esquerda, o marcador e "N origens selecionadas · Rascunho", 600 na cor da marca;
 * - à direita, "Cancelar" de texto e o botão da marca com o disquete.
 *
 * No painel de 250px os dois botões ficam numa linha abaixo do texto. Salvar
 * fica desligado fora da faixa de 1 a 20 origens, a mesma da rota e da função
 * do banco.
 */
export function RodapeDaSelecao({
  quantas,
  editando,
  salvando,
  erro,
  onCancelar,
  onSalvar,
}: {
  quantas: number;
  editando: boolean;
  salvando: boolean;
  erro: string | null;
  onCancelar: () => void;
  onSalvar: () => void;
}) {
  const t = useT();
  const foraDaFaixa = quantas === 0 || quantas > VISUALIZACAO_MAX_ORIGENS;
  return (
    <div className="shrink-0 border-t border-casca-borda bg-surface px-4 py-3">
      <p className="flex items-center gap-2 text-xs font-semibold text-casca-marca" aria-live="polite">
        <Bookmark size={14} aria-hidden className="shrink-0" />
        {(quantas === 1 ? t("{n} origem selecionada · Rascunho") : t("{n} origens selecionadas · Rascunho")).replace(
          "{n}",
          String(quantas),
        )}
      </p>
      {quantas > VISUALIZACAO_MAX_ORIGENS && (
        <p className="mt-1 text-[11px] text-casca-alerta">{t("Uma visualização junta de 1 a 20 origens.")}</p>
      )}
      {erro && (
        <p role="alert" className="mt-1 text-[11px] text-casca-alerta">
          {erro}
        </p>
      )}
      <div className="mt-3 flex items-center justify-end gap-2">
        <BotaoDaCasca type="button" variante="texto" tamanho="sm" disabled={salvando} onClick={onCancelar}>
          {t("Cancelar")}
        </BotaoDaCasca>
        <BotaoDaCasca type="button" variante="marca" tamanho="sm" disabled={foraDaFaixa || salvando} onClick={onSalvar}>
          <Save size={14} aria-hidden />
          {editando ? t("Salvar origens") : t("Salvar como visualização")}
        </BotaoDaCasca>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-painel-casca-clint.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/escale-com-origens.test.tsx
corepack pnpm typecheck
```
Expected:
- `escale-painel-casca-clint` PASS (19 testes);
- `escale-painel-origens` PASS, inclusive "quem não é gerente vê as visualizações, sem + e sem ⋮ (só o ^ da seção)" e os dois casos de `<RodapeDaSelecao>`;
- `escale-com-origens` PASS;
- typecheck sem erros novos.

- [ ] **Step 7: Conferir na tela**

Siga "Conferência na tela":
- abra VISUALIZAÇÕES com pelo menos uma visualização;
- entre numa visualização (a linha fica `#EFF3FF` com a barra);
- entre no modo seleção pelo "+" da seção.

Compare com 01-014-grupos-origens-visualizacoes.png e 01-026-configuracao-visualizacoes.png (variante lateral: só linha, quadradinho, contagem, caixinhas e rodapé). Anote as diferenças no relatório da tarefa.

- [ ] **Step 8: Commit**

```bash
git add components/escale/visualizacoes/SecaoVisualizacoes.tsx components/escale/visualizacoes/RodapeDaSelecao.tsx tests/unit/escale-painel-casca-clint.test.tsx
git commit -m "feat(escale): seção Visualizações e rodapé da seleção no visual da Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: As janelas do painel no visual do modal da Clint

**Files:**
- Create: `components/escale/origens/JanelaDaCasca.tsx`
- Modify (reescrever): `components/escale/origens/JanelasDeOrigens.tsx`, `components/escale/origens/JanelasDoGrupo.tsx`, `components/escale/origens/JanelasDaOrigem.tsx`, `components/escale/visualizacoes/JanelasDaVisualizacao.tsx`
- Modify (bloco no fim): `tests/unit/escale-janelas-de-origens.test.tsx`, `tests/unit/escale-janelas-da-visualizacao.test.tsx`

**Interfaces:**
- Consumes:
  - `CaixaDaCasca` e `SeletorDaCasca` da V1;
  - `corDoIconeNaCasca` (Task 1);
  - as variáveis `--escale-salvar`/`--escale-salvar-texto` (Task 2);
  - `IconeDoGrupo` (Task 3).
- Produces:
  - `JanelaDaCasca({ aberta, onFechar, children })`;
  - `CabecaDaJanela({ titulo, descricao? })`;
  - `Campo({ rotulo, obrigatorio?, children })`;
  - `CampoDeTexto` (as props de `<input>`);
  - `BotaoDaJanela({ variante: "cancelar" | "salvar" | "perigo", enviar? })`;
  - `RodapeDaJanela`.

  Os formulários mantêm nomes, props, `aria-label`s e rótulos de botão. `Alerta` continua exportado por `JanelasDoGrupo.tsx`, porque `components/escale/filtros/JanelaDoFiltroSalvo.tsx` (1D) o importa.

**Referência:** 01-013-configuracao-origem-v1.png, a única janela da variante superior.
- A janela: título ≈ 22px/400 `#2F2C5D`, rótulos 13px/500 com "*" vermelho no obrigatório, campos `#EFF3FF` de 43px sem borda e com o texto a 20px.
- O rodapé: "Cancelar" branco com borda e "Salvar" verde-menta `#35EFB3` com o texto `#2F2C5D`. No print os dois aparecem a ~60% porque o botão está desligado, e a V3 copia esse desligado (`disabled:opacity-60`).
- As confirmações de Arquivar e Excluir e os formulários de Configurações, Customizar e Nova origem não têm print (itens 12 e 13). Por isso ficam os textos e campos de hoje, nesse visual.
  - Arquivar e Criar usam o verde-menta, como o "Salvar".
  - Excluir usa o vermelho da casca (`bg-casca-alerta`), porque a Clint pinta "Excluir" de vermelho nos menus.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente no FIM de `tests/unit/escale-janelas-de-origens.test.tsx`:

```tsx
describe("casca V3 — janelas no visual do modal da Clint (01-013)", () => {
  it("a janela é a caixa branca de raio 8, com título 22px, campo #EFF3FF de 43px e o Salvar verde-menta", () => {
    abrir({ tipo: "config-grupo", id: "g-obras" });
    expect(screen.getByRole("dialog", { name: "Configurações do grupo" })).toHaveClass("rounded-[8px]", "bg-surface");
    expect(screen.getByRole("heading", { name: "Configurações do grupo" })).toHaveClass("text-[22px]", "font-normal");
    expect(screen.getByRole("textbox", { name: "Nome do grupo" })).toHaveClass("bg-casca-raia", "h-[43px]");
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveClass("bg-(--escale-salvar)", "text-(--escale-salvar-texto)");
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveClass("border-casca-borda", "bg-surface");
  });

  it("Excluir é o botão vermelho da casca", () => {
    abrir({ tipo: "excluir-grupo", id: "g-vazio" });
    expect(screen.getByRole("button", { name: "Excluir grupo" })).toHaveClass("bg-casca-alerta");
  });

  it("Configurações da origem usa o seletor e a caixinha da casca, nada nativo", () => {
    abrir({ tipo: "config-origem", id: "f-nayara" });
    expect(screen.getByRole("combobox", { name: "Grupo" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Tornar esta a origem padrão/ })).not.toBeChecked();
    expect(document.querySelector('input[type="checkbox"], select')).toBeNull();
  });

  it("Customizar mostra a paleta nas cores da Clint; o tom gravado continua o da paleta", () => {
    abrir({ tipo: "customizar", id: "g-obras" });
    expect(screen.getByRole("button", { name: "Azul" })).toHaveStyle({ backgroundColor: "#83B4FF" });
  });
});
```

Acrescente no FIM de `tests/unit/escale-janelas-da-visualizacao.test.tsx`:

```tsx
describe("casca V3 — a janela da visualização no visual da Clint", () => {
  it("as pessoas escolhidas são caixinhas da casca, e o Criar é o verde-menta", async () => {
    const { user } = abrir({ tipo: "nova", origens: ["f-a"] });
    expect(screen.getByRole("dialog", { name: "Nova visualização" })).toHaveClass("rounded-[8px]");
    await user.click(screen.getByRole("radio", { name: "Só as pessoas escolhidas" }));
    expect(await screen.findByRole("checkbox", { name: "Ana" })).not.toBeChecked();
    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
    expect(screen.getByRole("button", { name: "Criar visualização" })).toHaveClass("bg-(--escale-salvar)");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-janelas-de-origens.test.tsx tests/unit/escale-janelas-da-visualizacao.test.tsx
```
Expected: FAIL nos 5 casos novos (classes antigas, `input[type="checkbox"]` nativo, swatch na cor antiga). Os casos de antes PASS.

- [ ] **Step 3: A janela da casca**

Create `components/escale/origens/JanelaDaCasca.tsx`:

```tsx
"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A JANELA DA CASCA (fork Escale · casca V3): o modal das janelas do painel com
 * o visual da Clint, variante superior (01-013):
 * - cortina escura a ~55%;
 * - caixa branca de raio 8, sem borda, com a sombra do painel e 24px de respiro;
 * - o X de fechar no canto.
 *
 * Usa o Dialog do Radix direto porque o `DialogContent` do original fixa a
 * cortina (`bg-black/80`), a borda e o raio, e o original não muda. A cortina e
 * os textos reaproveitam `DialogOverlay`, `DialogTitle` e `DialogDescription`
 * com classes por cima, o que mantém o nome acessível da janela pelo título.
 */
export function JanelaDaCasca({
  aberta,
  onFechar,
  children,
}: {
  aberta: boolean;
  onFechar: () => void;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <DialogPrimitive.Root
      open={aberta}
      onOpenChange={(aberto) => {
        if (!aberto) onFechar();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/55" />
        <DialogPrimitive.Content className="ds-modal fixed top-[50%] left-[50%] z-50 grid max-h-[85dvh] w-[min(28rem,calc(100vw-2rem))] translate-x-[-50%] translate-y-[-50%] gap-5 overflow-y-auto rounded-[8px] bg-surface p-6 text-casca-texto shadow-casca-painel">
          {children}
          <DialogPrimitive.Close
            aria-label={t("Fechar")}
            className="absolute top-4 right-4 grid size-6 place-items-center rounded-casca-gatilho text-casca-suave transition-colors hover:text-casca-texto focus-visible:outline-2 focus-visible:outline-casca-marca"
          >
            <X size={16} aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

/** Título 22px/400 #2F2C5D (01-013) e, se houver, a explicação 13px cinza logo abaixo. */
export function CabecaDaJanela({ titulo, descricao }: { titulo: ReactNode; descricao?: ReactNode }) {
  return (
    <DialogHeader className="space-y-1 pr-8 text-left sm:text-left">
      <DialogTitle className="text-[22px] leading-[30px] font-normal tracking-normal text-casca-texto">
        {titulo}
      </DialogTitle>
      {descricao && (
        <DialogDescription className="text-[13px] leading-5 text-casca-suave">{descricao}</DialogDescription>
      )}
    </DialogHeader>
  );
}

/** Rótulo 13px/500 acima do campo, com o "*" vermelho do obrigatório (01-013, "Nome *"). */
export function Campo({
  rotulo,
  obrigatorio = false,
  children,
}: {
  rotulo: string;
  obrigatorio?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-[13px] font-medium text-casca-texto">
        {rotulo}
        {obrigatorio && (
          <span aria-hidden className="ml-0.5 text-casca-alerta">
            *
          </span>
        )}
      </span>
      {children}
    </div>
  );
}

/** O campo de texto da Clint (01-013): #EFF3FF, sem borda, 43px, raio 4, texto 13px a 20px da borda. */
export function CampoDeTexto({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      {...props}
      className={cn(
        "h-[43px] w-full rounded-[4px] border-0 bg-casca-raia px-5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca disabled:opacity-60",
        className,
      )}
    />
  );
}

type VarianteDoBotao = "cancelar" | "salvar" | "perigo";

const VARIANTE: Record<VarianteDoBotao, string> = {
  /** "Cancelar" de 01-013: branco, borda clara, texto navy. */
  cancelar: "border border-casca-borda bg-surface text-casca-texto hover:bg-casca-raia",
  /** "Salvar" de 01-013: verde-menta da Clint (não é a marca, então se copia). */
  salvar: "bg-(--escale-salvar) text-(--escale-salvar-texto) hover:brightness-95",
  /** Sem print da confirmação de excluir: o vermelho da casca, o mesmo do "Excluir" nos menus. */
  perigo: "bg-casca-alerta text-white hover:brightness-95",
};

/** Os botões do rodapé da janela: 32px, raio 4, 13px/500. Desligado fica a 60%, como o "Salvar" de 01-013. */
export function BotaoDaJanela({
  variante,
  enviar = false,
  className,
  ...props
}: { variante: VarianteDoBotao; enviar?: boolean } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return (
    <button
      {...props}
      type={enviar ? "submit" : "button"}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-2 rounded-[4px] px-4 text-[13px] font-medium transition disabled:pointer-events-none disabled:opacity-60",
        VARIANTE[variante],
        className,
      )}
    />
  );
}

/** O rodapé: os botões à direita, lado a lado, "Cancelar" antes (01-013). */
export function RodapeDaJanela({ children }: { children: ReactNode }) {
  return <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">{children}</DialogFooter>;
}
```

- [ ] **Step 4: O despachante das janelas**

Replace o conteúdo inteiro de `components/escale/origens/JanelasDeOrigens.tsx` por:

```tsx
"use client";
import type { Origens } from "@/lib/escale/origens/regras";

import { JanelaDaCasca } from "./JanelaDaCasca";
import {
  FormAdicionarOrigem,
  FormArquivarOrigem,
  FormConfigOrigem,
  FormExcluirOrigem,
} from "./JanelasDaOrigem";
import {
  FormAdicionarGrupo,
  FormArquivarGrupo,
  FormConfigGrupo,
  FormCustomizarGrupo,
  FormExcluirGrupo,
} from "./JanelasDoGrupo";

export type Janela =
  | { tipo: "adicionar-origem"; grupoId: string | null }
  | { tipo: "adicionar-grupo" }
  | {
      tipo:
        | "config-grupo"
        | "customizar"
        | "arquivar-grupo"
        | "excluir-grupo"
        | "config-origem"
        | "arquivar-origem"
        | "excluir-origem";
      id: string;
    };

export interface PropsDaJanela {
  origens: Origens;
  onFechar: () => void;
  onOrigens: (origens: Origens) => void;
}

/**
 * As janelas do painel Origens (fork Escale, Fase 1B; visual da Clint na casca V3).
 *
 * É uma janela só (`JanelaDaCasca`), com o conteúdo da ação pedida pelo `+` ou
 * por um ⋮. Só gerente+ chega aqui: o painel esconde os botões, e as rotas
 * cobram `requireRole("manager")`.
 */
export function JanelasDeOrigens({
  janela,
  onAbrirOrigem,
  ...comuns
}: PropsDaJanela & { janela: Janela | null; onAbrirOrigem: (id: string) => void }) {
  return (
    <JanelaDaCasca aberta={janela !== null} onFechar={comuns.onFechar}>
      {janela?.tipo === "adicionar-origem" && (
        <FormAdicionarOrigem {...comuns} grupoId={janela.grupoId} onAbrirOrigem={onAbrirOrigem} />
      )}
      {janela?.tipo === "adicionar-grupo" && <FormAdicionarGrupo {...comuns} />}
      {janela?.tipo === "config-grupo" && <FormConfigGrupo {...comuns} id={janela.id} />}
      {janela?.tipo === "customizar" && <FormCustomizarGrupo {...comuns} id={janela.id} />}
      {janela?.tipo === "arquivar-grupo" && <FormArquivarGrupo {...comuns} id={janela.id} />}
      {janela?.tipo === "excluir-grupo" && <FormExcluirGrupo {...comuns} id={janela.id} />}
      {janela?.tipo === "config-origem" && <FormConfigOrigem {...comuns} id={janela.id} />}
      {janela?.tipo === "arquivar-origem" && <FormArquivarOrigem {...comuns} id={janela.id} />}
      {janela?.tipo === "excluir-origem" && <FormExcluirOrigem {...comuns} id={janela.id} />}
    </JanelaDaCasca>
  );
}
```

- [ ] **Step 5: As janelas do grupo**

Replace o conteúdo inteiro de `components/escale/origens/JanelasDoGrupo.tsx` por:

```tsx
"use client";
import { useState, type FormEvent } from "react";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAtualizarGrupo, useCriarGrupo, useExcluirGrupo } from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";
import { corDoIconeNaCasca } from "@/lib/escale/origens/cores-da-casca";
import {
  ICONES_DE_GRUPO,
  NOME_DE_GRUPO_MAX,
  ROTULO_DO_ICONE,
  type IconeDeGrupo,
} from "@/lib/escale/origens/regras";
import { NOME_DO_TOM, PALETA_DE_ETIQUETAS } from "@/lib/tags/cor-da-etiqueta";
import { cn } from "@/lib/utils";

import { IconeDoGrupo } from "./IconeDoGrupo";
import { BotaoDaJanela, CabecaDaJanela, Campo, CampoDeTexto, RodapeDaJanela } from "./JanelaDaCasca";
import type { PropsDaJanela } from "./JanelasDeOrigens";
import { textoDoErro } from "./texto-do-erro";

/** O aviso de erro das janelas. Também é usado pela janela do filtro salvo (1D); não mudou. */
export function Alerta({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm">
      {texto}
    </p>
  );
}

function GrupoSumiu({ onFechar }: { onFechar: () => void }) {
  const t = useT();
  return (
    <>
      <CabecaDaJanela titulo={t("Grupo não encontrado.")} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="salvar" onClick={onFechar}>
          {t("Fechar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </>
  );
}

export function FormAdicionarGrupo({ onFechar, onOrigens }: PropsDaJanela) {
  const t = useT();
  const criar = useCriarGrupo();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    criar.mutate(nome, {
      onSuccess: (origens) => {
        onOrigens(origens);
        onFechar();
      },
      onError: (err) => setErro(textoDoErro(err, t)),
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Adicionar grupo de origens")}
        descricao={t("O grupo nasce vazio. Use o + dele para criar origens dentro.")}
      />
      <Alerta texto={erro} />
      <Campo rotulo={t("Nome")} obrigatorio>
        <CampoDeTexto
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label={t("Nome do novo grupo")}
          placeholder={t("Nome do novo grupo")}
          maxLength={NOME_DE_GRUPO_MAX}
        />
      </Campo>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" enviar disabled={criar.isPending || !nome.trim()}>
          {t("Criar grupo")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </form>
  );
}

export function FormConfigGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const grupo = origens.grupos.find((g) => g.id === id);
  const [nome, setNome] = useState(grupo?.name ?? "");
  const [erro, setErro] = useState<string | null>(null);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    atualizar.mutate(
      { id, mudanca: { name: nome } },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <CabecaDaJanela titulo={t("Configurações do grupo")} />
      <Alerta texto={erro} />
      <Campo rotulo={t("Nome")} obrigatorio>
        <CampoDeTexto
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label={t("Nome do grupo")}
          maxLength={NOME_DE_GRUPO_MAX}
        />
      </Campo>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" enviar disabled={atualizar.isPending || !nome.trim()}>
          {t("Salvar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </form>
  );
}

/**
 * Customizar (sem print da Clint, item 12): a cor e o ícone do grupo.
 * Os quadradinhos mostram a cor da Clint de cada tom (`corDoIconeNaCasca`), mas
 * o que se grava continua sendo o tom da paleta — a rota só aceita a paleta.
 */
export function FormCustomizarGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const grupo = origens.grupos.find((g) => g.id === id);
  const [cor, setCor] = useState<string | null>(grupo?.color ?? null);
  const [icone, setIcone] = useState<IconeDeGrupo>(grupo?.icon ?? "iniciais");
  const [erro, setErro] = useState<string | null>(null);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;

  function salvar() {
    atualizar.mutate(
      { id, mudanca: { color: cor, icon: icone } },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <div className="grid gap-5">
      <CabecaDaJanela
        titulo={
          <>
            {t("Customizar")} «{grupo.name}»
          </>
        }
      />
      <Alerta texto={erro} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13px] font-medium text-casca-texto">{t("Cor")}</legend>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={cor === null}
            onClick={() => setCor(null)}
            className={cn(
              "h-7 rounded-[4px] px-2 text-xs text-casca-texto",
              cor === null ? "bg-casca-marca-suave ring-2 ring-casca-marca" : "bg-casca-raia",
            )}
          >
            {t("Cor automática")}
          </button>
          {PALETA_DE_ETIQUETAS.map((tom) => (
            <button
              key={tom}
              type="button"
              aria-label={t(NOME_DO_TOM[tom] ?? tom)}
              aria-pressed={cor === tom}
              onClick={() => setCor(tom)}
              className={cn("size-7 rounded-[4px]", cor === tom && "ring-2 ring-casca-marca ring-offset-2")}
              style={{ backgroundColor: corDoIconeNaCasca(tom) }}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13px] font-medium text-casca-texto">{t("Ícone")}</legend>
        <div className="flex flex-wrap gap-2">
          {ICONES_DE_GRUPO.map((i) => (
            <button
              key={i}
              type="button"
              aria-label={t(ROTULO_DO_ICONE[i] ?? i)}
              aria-pressed={icone === i}
              onClick={() => setIcone(i)}
              className={cn(
                "grid h-9 w-11 place-items-center rounded-[4px] border",
                icone === i ? "border-casca-marca bg-casca-marca-suave" : "border-casca-borda",
              )}
            >
              <IconeDoGrupo grupo={{ ...grupo, color: cor, icon: i }} />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-casca-suave">{t("Prévia")}</span>
        <IconeDoGrupo grupo={{ ...grupo, color: cor, icon: icone }} />
        <span className="text-casca-texto">{grupo.name}</span>
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={salvar} disabled={atualizar.isPending}>
          {t("Salvar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </div>
  );
}

export function FormArquivarGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarGrupo();
  const [erro, setErro] = useState<string | null>(null);
  const grupo = origens.grupos.find((g) => g.id === id);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;
  const n = origens.funis.filter((f) => f.group_id === id && !f.is_archived).length;

  function arquivar() {
    atualizar.mutate(
      { id, mudanca: { is_archived: true } },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <div className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Arquivar «{nome}»?").replace("{nome}", grupo.name)}
        descricao={t(
          "O grupo e as {n} origens dele saem do painel e vão para Arquivados. Nada é apagado, as origens continuam recebendo negócios e Desarquivar traz tudo de volta.",
        ).replace("{n}", String(n))}
      />
      <Alerta texto={erro} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={arquivar} disabled={atualizar.isPending}>
          {t("Arquivar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </div>
  );
}

export function FormExcluirGrupo({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const excluir = useExcluirGrupo();
  const outros = origens.grupos.filter((g) => g.id !== id && !g.is_archived);
  const [destino, setDestino] = useState<string | null>(outros[0]?.id ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const grupo = origens.grupos.find((g) => g.id === id);
  if (!grupo) return <GrupoSumiu onFechar={onFechar} />;
  const n = origens.funis.filter((f) => f.group_id === id).length;

  function enviar() {
    excluir.mutate(
      { id, destino: n > 0 ? destino : null },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  if (n > 0 && outros.length === 0) {
    return (
      <div className="grid gap-5">
        <CabecaDaJanela
          titulo={t("«{nome}» é o único grupo").replace("{nome}", grupo.name)}
          descricao={t(
            "Toda origem precisa de um grupo. Crie outro grupo antes, pelo + ao lado da lupa, para as origens irem para lá.",
          )}
        />
        <RodapeDaJanela>
          <BotaoDaJanela variante="salvar" onClick={onFechar}>
            {t("Entendi")}
          </BotaoDaJanela>
        </RodapeDaJanela>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Excluir «{nome}»?").replace("{nome}", grupo.name)}
        descricao={
          n === 0
            ? t("O grupo está vazio. Nenhuma origem e nenhum negócio é apagado.")
            : t(
                "Toda origem precisa de um grupo. Escolha para onde vão as {n} origens deste grupo. Nenhum negócio é apagado.",
              ).replace("{n}", String(n))
        }
      />
      <Alerta texto={erro} />
      {n > 0 && (
        <Campo rotulo={t("Mover as origens para")}>
          <SeletorDaCasca
            valor={destino ?? ""}
            opcoes={outros.map((g) => ({ valor: g.id, rotulo: g.name }))}
            aoMudar={(v) => setDestino(v || null)}
            aria-label={t("Mover as origens para")}
          />
        </Campo>
      )}
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="perigo" onClick={enviar} disabled={excluir.isPending || (n > 0 && !destino)}>
          {n === 0 ? t("Excluir grupo") : t("Mover e excluir grupo")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </div>
  );
}
```

- [ ] **Step 6: As janelas da origem**

Replace o conteúdo inteiro de `components/escale/origens/JanelasDaOrigem.tsx` por:

```tsx
"use client";
import { useState, type FormEvent } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import {
  useArquivarOrigem,
  useAtualizarOrigem,
  useCriarOrigem,
  useExcluirOrigem,
  type MudancaDeOrigem,
} from "@/hooks/escale/useOrigens";
import { useT } from "@/hooks/i18n/useT";

import { BotaoDaJanela, CabecaDaJanela, Campo, CampoDeTexto, RodapeDaJanela } from "./JanelaDaCasca";
import type { PropsDaJanela } from "./JanelasDeOrigens";
import { Alerta } from "./JanelasDoGrupo";
import { textoDoErro } from "./texto-do-erro";

function OrigemSumiu({ onFechar }: { onFechar: () => void }) {
  const t = useT();
  return (
    <>
      <CabecaDaJanela titulo={t("Funil não encontrado.")} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="salvar" onClick={onFechar}>
          {t("Fechar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </>
  );
}

export function FormAdicionarOrigem({
  origens,
  onFechar,
  onOrigens,
  grupoId,
  onAbrirOrigem,
}: PropsDaJanela & { grupoId: string | null; onAbrirOrigem: (id: string) => void }) {
  const t = useT();
  const criar = useCriarOrigem();
  const ativos = origens.grupos.filter((g) => !g.is_archived);
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState<string | null>(
    ativos.some((g) => g.id === grupoId) ? grupoId : (ativos[0]?.id ?? null),
  );
  const [erro, setErro] = useState<string | null>(null);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !grupo) return;
    criar.mutate(
      { name: nome, groupId: grupo },
      {
        onSuccess: (r) => {
          onOrigens(r.origens);
          onAbrirOrigem(r.id);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Adicionar origem")}
        descricao={
          ativos.length === 0
            ? t("Crie um grupo antes, pelo + ao lado da lupa.")
            : t("Toda origem fica num grupo. Ela nasce com as etapas padrão e já abre no quadro.")
        }
      />
      <Alerta texto={erro} />
      <Campo rotulo={t("Nome")} obrigatorio>
        <CampoDeTexto
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label={t("Nome da origem")}
          placeholder={t("Nome da origem")}
          maxLength={80}
        />
      </Campo>
      <Campo rotulo={t("Grupo")}>
        <SeletorDaCasca
          valor={grupo ?? ""}
          opcoes={ativos.map((g) => ({ valor: g.id, rotulo: g.name }))}
          aoMudar={(v) => setGrupo(v || null)}
          aria-label={t("Grupo")}
        />
      </Campo>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" enviar disabled={criar.isPending || !nome.trim() || !grupo}>
          {t("Criar origem")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </form>
  );
}

export function FormConfigOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const atualizar = useAtualizarOrigem();
  const funil = origens.funis.find((f) => f.id === id);
  const ativos = origens.grupos.filter((g) => !g.is_archived || g.id === funil?.group_id);
  const [nome, setNome] = useState(funil?.name ?? "");
  const [grupo, setGrupo] = useState<string | null>(funil?.group_id ?? null);
  const [tornarPadrao, setTornarPadrao] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const mudanca: MudancaDeOrigem = {};
    if (nome.trim() && nome.trim() !== funil!.name) mudanca.name = nome;
    if (grupo && grupo !== funil!.group_id) mudanca.groupId = grupo;
    if (tornarPadrao) mudanca.tornarPadrao = true;
    if (Object.keys(mudanca).length === 0) return onFechar();
    atualizar.mutate(
      { id, mudanca },
      {
        onSuccess: (r) => {
          onOrigens(r);
          onFechar();
        },
        onError: (err) => setErro(textoDoErro(err, t)),
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Configurações da origem")}
        descricao={t("As etapas continuam sendo editadas no próprio quadro.")}
      />
      <Alerta texto={erro} />
      <Campo rotulo={t("Nome")} obrigatorio>
        <CampoDeTexto
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label={t("Nome da origem")}
          maxLength={80}
        />
      </Campo>
      <Campo rotulo={t("Grupo")}>
        <SeletorDaCasca
          valor={grupo ?? ""}
          opcoes={ativos.map((g) => ({ valor: g.id, rotulo: g.name }))}
          aoMudar={(v) => setGrupo(v || null)}
          aria-label={t("Grupo")}
        />
      </Campo>
      {funil.is_default ? (
        <p className="text-[13px] text-casca-suave">{t("Esta é a origem padrão da organização.")}</p>
      ) : (
        <div className="grid gap-1">
          <CaixaDaCasca
            marcada={tornarPadrao}
            aoMudar={setTornarPadrao}
            rotulo={t("Tornar esta a origem padrão")}
            aria-label={t("Tornar esta a origem padrão")}
          />
          <p className="pl-7 text-xs text-casca-suave">{t("Abre para quem ainda não abriu nenhuma origem.")}</p>
        </div>
      )}
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" enviar disabled={atualizar.isPending}>
          {t("Salvar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </form>
  );
}

export function FormArquivarOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const arquivar = useArquivarOrigem();
  const [erro, setErro] = useState<string | null>(null);
  const funil = origens.funis.find((f) => f.id === id);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  function confirmar() {
    arquivar.mutate(id, {
      onSuccess: (r) => {
        onOrigens(r);
        onFechar();
      },
      onError: (err) => setErro(textoDoErro(err, t)),
    });
  }

  return (
    <div className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Arquivar «{nome}»?").replace("{nome}", funil.name)}
        descricao={t("A origem sai do painel e vai para Arquivados com os negócios dela. Desarquivar traz de volta.")}
      />
      <Alerta texto={erro} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={confirmar} disabled={arquivar.isPending}>
          {t("Arquivar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </div>
  );
}

export function FormExcluirOrigem({ origens, onFechar, onOrigens, id }: PropsDaJanela & { id: string }) {
  const t = useT();
  const excluir = useExcluirOrigem();
  const arquivar = useArquivarOrigem();
  const [erro, setErro] = useState<string | null>(null);
  const funil = origens.funis.find((f) => f.id === id);
  if (!funil) return <OrigemSumiu onFechar={onFechar} />;

  const aoTerminar = {
    onSuccess: (r: Parameters<PropsDaJanela["onOrigens"]>[0]) => {
      onOrigens(r);
      onFechar();
    },
    onError: (err: unknown) => setErro(textoDoErro(err, t)),
  };

  return (
    <div className="grid gap-5">
      <CabecaDaJanela
        titulo={t("Excluir «{nome}» de vez?").replace("{nome}", funil.name)}
        descricao={t(
          "A origem e as etapas dela são apagadas, e isso não se desfaz. Origem com negócios não é excluída: aí o caminho é arquivar.",
        )}
      />
      <Alerta texto={erro} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        {erro && !funil.is_archived && (
          <BotaoDaJanela
            variante="salvar"
            onClick={() => arquivar.mutate(id, aoTerminar)}
            disabled={arquivar.isPending}
          >
            {t("Arquivar")}
          </BotaoDaJanela>
        )}
        <BotaoDaJanela variante="perigo" onClick={() => excluir.mutate(id, aoTerminar)} disabled={excluir.isPending}>
          {t("Excluir de vez")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </div>
  );
}
```

- [ ] **Step 7: As janelas da visualização**

Replace o conteúdo inteiro de `components/escale/visualizacoes/JanelasDaVisualizacao.tsx` por:

```tsx
"use client";
import { useState, type FormEvent } from "react";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  Campo,
  CampoDeTexto,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { Alerta } from "@/components/escale/origens/JanelasDoGrupo";
import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import {
  useAtualizarVisualizacao,
  useCriarVisualizacao,
  useExcluirVisualizacao,
} from "@/hooks/escale/useVisualizacoes";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import {
  NOME_DE_VISUALIZACAO_MAX,
  type AcessoDaVisualizacao,
  type Visualizacao,
} from "@/lib/escale/visualizacoes/regras";
import { randomId } from "@/lib/random-id";

export type JanelaDaVisualizacao =
  | { tipo: "nova"; origens: string[] }
  | { tipo: "configurar"; id: string }
  | { tipo: "excluir"; id: string };

interface PropsComuns {
  visualizacoes: Visualizacao[];
  onFechar: () => void;
  onVisualizacoes: (lista: Visualizacao[]) => void;
}

/**
 * As janelas das visualizações (fork Escale, Fase 1C; visual da Clint na casca V3).
 *
 * É uma janela só (`JanelaDaCasca`), como em `JanelasDeOrigens`. Só gerente+
 * chega aqui: o painel esconde o + e o ⋮, e as rotas cobram `requireRole("manager")`.
 */
export function JanelasDaVisualizacao({
  janela,
  onCriada,
  onExcluida,
  ...comuns
}: PropsComuns & {
  janela: JanelaDaVisualizacao | null;
  onCriada: (id: string) => void;
  onExcluida: (id: string) => void;
}) {
  const alvo = janela && janela.tipo !== "nova" ? comuns.visualizacoes.find((v) => v.id === janela.id) : undefined;
  return (
    <JanelaDaCasca aberta={janela !== null} onFechar={comuns.onFechar}>
      {janela?.tipo === "nova" && <FormDaVisualizacao {...comuns} origens={janela.origens} onCriada={onCriada} />}
      {janela?.tipo === "configurar" &&
        (alvo ? <FormDaVisualizacao {...comuns} atual={alvo} /> : <VisualizacaoSumiu onFechar={comuns.onFechar} />)}
      {janela?.tipo === "excluir" &&
        (alvo ? (
          <FormExcluirVisualizacao {...comuns} atual={alvo} onExcluida={onExcluida} />
        ) : (
          <VisualizacaoSumiu onFechar={comuns.onFechar} />
        ))}
    </JanelaDaCasca>
  );
}

function VisualizacaoSumiu({ onFechar }: { onFechar: () => void }) {
  const t = useT();
  return (
    <>
      <CabecaDaJanela titulo={t("Visualização não encontrada.")} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="salvar" onClick={onFechar}>
          {t("Fechar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </>
  );
}

/**
 * Nome e QUEM VÊ (princípio do produto: quase tudo tem acesso configurável).
 * - Sem `atual` é a janela "Nova visualização", com as origens do rascunho.
 * - Com `atual` é "Configurações da visualização". As origens se trocam pelo
 *   "Editar origens" do ⋮, no próprio painel.
 *
 * Os dois `radio` de "Quem vê" ficam nativos: o contrato não tem rádio da casca,
 * e a Clint não mostra esta janela.
 */
function FormDaVisualizacao({
  atual,
  origens = [],
  onCriada,
  onFechar,
  onVisualizacoes,
}: PropsComuns & { atual?: Visualizacao; origens?: string[]; onCriada?: (id: string) => void }) {
  const t = useT();
  const criar = useCriarVisualizacao();
  const atualizar = useAtualizarVisualizacao();
  // O id nasce aqui para a tela saber para onde ir assim que a rota responder.
  const [id] = useState(() => atual?.id ?? randomId());
  const [nome, setNome] = useState(atual?.name ?? "");
  const [acesso, setAcesso] = useState<AcessoDaVisualizacao>(atual?.acesso ?? "todos");
  const [pessoas, setPessoas] = useState<ReadonlySet<string>>(() => new Set(atual?.pessoas ?? []));
  const [erro, setErro] = useState<string | null>(null);
  const { data: equipe, isLoading } = useTeamMembers({ enabled: acesso === "escolhidos" });
  // Quem ainda não aceitou o convite ou já saiu não entra na lista: a FK do
  // banco recusaria quem não é membro.
  const membros = (equipe?.data ?? []).filter((m) => m.accepted_at && !m.revoked_at);
  const pendente = criar.isPending || atualizar.isPending;
  const podeSalvar = nome.trim().length > 0 && (acesso === "todos" || pessoas.size > 0) && !pendente;

  function alternarPessoa(userId: string) {
    setPessoas((antes) => {
      const depois = new Set(antes);
      if (depois.has(userId)) depois.delete(userId);
      else depois.add(userId);
      return depois;
    });
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!podeSalvar) return;
    const escolhidas = acesso === "escolhidos" ? [...pessoas] : [];
    const aoErrar = (err: unknown) => setErro(textoDoErro(err, t));
    if (atual) {
      atualizar.mutate(
        { id, mudanca: { name: nome, acesso, pessoas: escolhidas } },
        {
          onSuccess: (lista) => {
            onVisualizacoes(lista);
            onFechar();
          },
          onError: aoErrar,
        },
      );
      return;
    }
    criar.mutate(
      { id, name: nome, acesso, origens, pessoas: escolhidas },
      {
        onSuccess: (lista) => {
          onVisualizacoes(lista);
          onFechar();
          onCriada?.(id);
        },
        onError: aoErrar,
      },
    );
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <CabecaDaJanela
        titulo={atual ? t("Configurações da visualização") : t("Nova visualização")}
        descricao={t("Etapas com o mesmo nome viram uma coluna só e somam os cards.")}
      />
      <Alerta texto={erro} />
      <Campo rotulo={t("Nome")} obrigatorio>
        <CampoDeTexto
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          aria-label={t("Nome da visualização")}
          placeholder={t("Nome da visualização")}
          maxLength={NOME_DE_VISUALIZACAO_MAX}
        />
      </Campo>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13px] font-medium text-casca-texto">{t("Quem vê")}</legend>
        <label className="flex items-center gap-2 text-[13px] text-casca-texto">
          <input
            type="radio"
            name="acesso-da-visualizacao"
            checked={acesso === "todos"}
            onChange={() => setAcesso("todos")}
            className="size-4 accent-casca-marca"
          />
          {t("Toda a organização")}
        </label>
        <label className="flex items-center gap-2 text-[13px] text-casca-texto">
          <input
            type="radio"
            name="acesso-da-visualizacao"
            checked={acesso === "escolhidos"}
            onChange={() => setAcesso("escolhidos")}
            className="size-4 accent-casca-marca"
          />
          {t("Só as pessoas escolhidas")}
        </label>
        <p className="text-xs text-casca-suave">
          {t("Gerentes e administradores sempre veem. Dentro da visualização, cada pessoa vê só os negócios que já vê em cada origem.")}
        </p>
        {acesso === "escolhidos" &&
          (isLoading ? (
            <p className="text-xs text-casca-suave">{t("Carregando…")}</p>
          ) : (
            <ul className="grid max-h-48 gap-2 overflow-y-auto rounded-[4px] bg-casca-raia p-3">
              {membros.map((m) => {
                const nomeDaPessoa = m.full_name ?? m.email ?? t("Sem nome");
                return (
                  <li key={m.user_id}>
                    <CaixaDaCasca
                      marcada={pessoas.has(m.user_id)}
                      aoMudar={() => alternarPessoa(m.user_id)}
                      rotulo={nomeDaPessoa}
                      aria-label={nomeDaPessoa}
                    />
                  </li>
                );
              })}
            </ul>
          ))}
      </fieldset>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" enviar disabled={!podeSalvar}>
          {atual ? t("Salvar") : t("Criar visualização")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </form>
  );
}

function FormExcluirVisualizacao({
  atual,
  onFechar,
  onVisualizacoes,
  onExcluida,
}: PropsComuns & { atual: Visualizacao; onExcluida: (id: string) => void }) {
  const t = useT();
  const excluir = useExcluirVisualizacao();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <>
      <CabecaDaJanela
        titulo={t("Excluir «{nome}»?").replace("{nome}", atual.name)}
        descricao={t("A visualização sai do painel. Nenhuma origem e nenhum negócio é apagado.")}
      />
      <Alerta texto={erro} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={onFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela
          variante="perigo"
          disabled={excluir.isPending}
          onClick={() =>
            excluir.mutate(atual.id, {
              onSuccess: (lista) => {
                onVisualizacoes(lista);
                onFechar();
                onExcluida(atual.id);
              },
              onError: (err) => setErro(textoDoErro(err, t)),
            })
          }
        >
          {t("Excluir visualização")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </>
  );
}
```

- [ ] **Step 8: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-janelas-de-origens.test.tsx tests/unit/escale-janelas-da-visualizacao.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/escale-painel-casca-clint.test.tsx tests/unit/escale-filtros-salvos-menu.test.tsx tests/unit/controle-decorativo.test.ts tests/unit/selecao-longa-tem-busca.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts
corepack pnpm typecheck
grep -rn "SearchableSelect\|type=\"checkbox\"\|components/ui/button\|components/ui/input\"" components/escale/origens components/escale/visualizacoes/SecaoVisualizacoes.tsx components/escale/visualizacoes/RodapeDaSelecao.tsx components/escale/visualizacoes/JanelasDaVisualizacao.tsx
```
Expected:
- os dois testes de janela PASS (todos os casos de antes e os 5 novos);
- `escale-painel-origens` e `escale-painel-casca-clint` PASS: as janelas abrem a partir do painel;
- `escale-filtros-salvos-menu` PASS: o `Alerta` que ele usa não mudou;
- as quatro cercas PASS;
- typecheck sem erros novos;
- o `grep` não acha nada. Nenhum seletor antigo, checkbox nativo, `Button` ou `Input` do original sobrou no painel.

- [ ] **Step 9: Conferir na tela**

Siga "Conferência na tela" e abra cada janela pelo painel:
- Adicionar origem e Adicionar grupo (pelo "+" de ORIGENS);
- Configurações, Customizar, Arquivar e Excluir (pelo ⋮ do grupo e da origem);
- Nova visualização (pelo rodapé da seleção) e Configurações da visualização.

Compare a caixa, o título, os campos e os botões com 01-013-configuracao-origem-v1.png. Anote as diferenças no relatório da tarefa. O layout de duas colunas e as abas do 01-013 são da configuração da origem (Fase 1F), não destas janelas.

- [ ] **Step 10: Commit**

```bash
git add components/escale/origens/JanelaDaCasca.tsx components/escale/origens/JanelasDeOrigens.tsx components/escale/origens/JanelasDoGrupo.tsx components/escale/origens/JanelasDaOrigem.tsx components/escale/visualizacoes/JanelasDaVisualizacao.tsx tests/unit/escale-janelas-de-origens.test.tsx tests/unit/escale-janelas-da-visualizacao.test.tsx
git commit -m "feat(escale): janelas do painel no visual do modal da Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Conferência na tela contra 01-010, 01-032, 01-033 e 01-034

**Files:**
- Nenhum arquivo novo. Se a conferência achar diferença que tem conserto (classe, medida), o conserto entra no arquivo da Task que a criou, com teste, num commit `fix(escale): …`.

**Interfaces:**
- Consumes: tudo das Tasks 1 a 7.
- Produces: a lista "Diferenças que sobraram" do corpo do PR (Task 9).

- [ ] **Step 1: Subir a tela**

Siga os passos 1 a 4 de "Conferência na tela" (Global Constraints). No CAMINHO B, esta task só roda **depois do deploy**, no app de produção, com o Claude in Chrome e só leitura; o PR desta parte já saiu com a conferência pendente, e os consertos vão no PR de correção `fix/casca-clint-v3-conferencia`.

O cenário da comparação, parecido com o da Clint:
- 3 grupos ou mais, com cores e ícones diferentes (Customizar);
- um grupo com 6 origens ou mais;
- uma visualização.

No CAMINHO A (banco de teste), crie esse cenário pela própria tela. No CAMINHO B (produção), **não crie nada**: use os grupos, origens e visualizações que já existem. Se faltar algum item do cenário, anote no relatório e pergunte ao usuário se ele quer criá-lo ele mesmo.

- [ ] **Step 2: 01-010 (painel em repouso)**

Abra C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-010-kanban-v1.png e a tela lado a lado, com a janela em 1526×804.

1. Rode o medidor de "Conferência na tela" e preencha a tabela abaixo. Tolerância: ±1px.

   | Peça | Esperado | Medido |
   |---|---|---|
   | painel | x 0, y 44, w 250, h = janela − 44 | |
   | bolinha | x 239–240, y 60, 20×20 | |
   | cabeçalho ORIGENS | y 122, h 48 | |
   | linha do grupo | h 34 | |
   | ícone do grupo | x 16, 20×20 | |
   | linha da origem aberta | h 34, fundo `#EFF3FF`, barra de 3px | |
   | conteúdo | começa em x 250; o sobretítulo a 270 | |

2. Confira a olho, com o print ao lado:
   - a borda direita e as divisórias têm a mesma cor;
   - os títulos ORIGENS/VISUALIZAÇÕES têm o mesmo peso e tamanho;
   - o grupo em repouso não mostra seta, "+" nem ⋮;
   - só o grupo da origem aberta fica em 600;
   - as iniciais ficam brancas sobre as cores da Clint;
   - os ícones de ORIGENS e VISUALIZAÇÕES têm o mesmo desenho.

- [ ] **Step 3: 01-032, 01-033 e 01-034 (menus e dica)**

Abra os três PNGs. Na tela:
- abra o ⋮ de um grupo aberto (01-032) e o ⋮ de uma origem (01-033);
- passe o mouse no "+" de um grupo (01-034).

Esses três JPEGs já estão em px de CSS. Confira:
- a posição (à direita do ⋮, topo alinhado);
- a largura que o texto pede (o do grupo dá ~217px), os itens de 36px e os ícones;
- a divisória antes de "Arquivar" e o "Excluir" vermelho;
- a sombra sem borda e o raio 8;
- a dica escura acima do "+", com a seta.

- [ ] **Step 4: Escrever a lista das diferenças**

Escreva a lista "Diferenças que sobraram" com as diferenças medidas nos Steps 2 e 3. Cada uma leva o porquê, e diferença sem porquê volta para a Task que a criou.

A lista começa com as **diferenças conhecidas e justificadas** desta parte:

1. **RECENTES não aparece.** Fica para a Fase 1E: hoje não há dado de recentes (ver "RECENTES fica para a Fase 1E").
2. **O "+" de ORIGENS (Adicionar origem / Adicionar grupo) é nosso.** Ele só aparece no hover do cabeçalho. A Clint superior não mostra onde se cria um grupo (itens 12 e 13 de "Prints que faltam").
3. **O grupo da origem aberta já abre aberto.** Em 01-010 o grupo "INSS Vendas" (o da origem aberta) aparece fechado e em 600; em 01-032 aparece aberto, com a origem marcada. O estado inicial da Clint não está provado. Ficou o comportamento de hoje (abrir), que mostra a origem marcada.
4. **A seta do grupo fechado é "›".** Em 01-034 o grupo fechado mostra "⌄". Ficou "›" fechado e "⌄" aberto, como diz `clint-telas.md` §2.2 e como é na variante lateral (01-014).
5. **O cabeçalho ORIGENS mostra a lupa e o "^" sempre.** Em 01-034 eles não aparecem; em 01-010 e 01-032, sim. Seguimos os dois.
6. **Linhas nossas sem par na Clint:** "Sem grupo", "N grupos ocultos · Mostrar", "Arquivados (N)", "Nenhum funil neste grupo." e "Nenhuma visualização ainda.". Têm o visual de sobretítulo/linha do painel.
7. **A busca da lupa, o painel recolhido, a criação inline de origem, o modo seleção e as janelas** não têm print da variante superior (itens 8, 9, 12 e 13). Ficaram o comportamento e os textos de hoje, no visual da casca.
8. **Nas janelas:**
   - Arquivar e Criar usam o verde-menta do "Salvar" (01-013), e Excluir usa o vermelho da casca. Não há print das confirmações.
   - "Quem vê" continua com dois rádios nativos: o contrato não tem rádio.
9. **Na linha da visualização,** a contagem "N origens" fica parada e o ⋮ aparece no hover ao lado dela. Na variante lateral (01-014), a contagem desliza quando o ⋮ aparece. Não há print da variante superior.
10. **A fonte e a cor da marca são as da V1** (Poppins e `var(--color-accent)`). Diferença de traço vem de lá.

- [ ] **Step 5: Commit (só se houve conserto)**

Se os Steps 2 e 3 levaram a algum conserto:

```bash
corepack pnpm vitest run tests/unit/escale-painel-casca-clint.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/escale-janelas-de-origens.test.tsx tests/unit/escale-janelas-da-visualizacao.test.tsx tests/unit/escale-com-origens.test.tsx
git add <os arquivos consertados e os testes deles>
git commit -m "fix(escale): ajustes da conferência na tela do painel (casca V3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: os cinco arquivos PASS antes do commit. Sem conserto, não há commit nesta tarefa.

---

### Task 9: Gates, prova de que o original não mudou, e PR

**Files:**
- Nenhum arquivo novo. Só verificação e o PR.

**Interfaces:**
- Consumes: tudo das Tasks 1 a 8.
- Produces: o PR para `rgisjr/escale-crm`. Não mergear, não publicar release, não mexer na VPS.

- [ ] **Step 1: Os gates inteiros**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm cercas 2>&1 | tail -20
corepack pnpm test:unit 2>&1 | tail -40
```
Expected:
- typecheck sem erros novos;
- lint sem erros (warnings antigos podem continuar);
- `cercas` verde;
- `test:unit` com falhas SÓ entre as conhecidas desta máquina.

Para provar que uma falha não é regressão, rode o mesmo arquivo em `escale-crm/main` num worktree temporário sem espaço no caminho:

```bash
git worktree add --detach C:/tmp/cmp-v3 escale-crm/main
cd C:/tmp/cmp-v3 && corepack pnpm install --frozen-lockfile && corepack pnpm vitest run <arquivo>
cd "/c/Documentos/projetos claude/Deskcom CRM/repo" && git worktree remove C:/tmp/cmp-v3 --force
```

Regressão é o que passa lá e falha aqui: corrija antes de seguir. Esta parte não toca o banco, então `test:db` não é preciso.

- [ ] **Step 2: Provar que o original não mudou**

```bash
git diff --stat escale-crm/main -- components/kanban components/ui components/shell app/app/pipelines app/app/kanban app/app/_components app/app/layout.tsx app/layout.tsx app/globals.css lib/ui/icons.ts
git diff --name-only escale-crm/main
```
Expected:
- o primeiro comando não imprime NADA: nenhum arquivo do original (quadro, primitivas, casca, rotas, `globals.css`, ícones Phosphor) mudou;
- o segundo lista só arquivos da tabela "Arquivos" deste plano, mais `docs/superpowers/plans/2026-10-16-casca-clint-v3-painel.md`.

Se aparecer qualquer outro arquivo, PARE e explique ao usuário antes do PR.

- [ ] **Step 3: Push e PR**

```bash
git push -u escale-crm feat/casca-clint-v3-painel
gh pr create -R rgisjr/escale-crm --base main --head feat/casca-clint-v3-painel \
  --title "feat(escale): casca igual à Clint — V3, painel esquerdo de Negócios" \
  --body-file - <<'PR'
## O que muda

Com a **casca nova** (`escale_menu=topo`), o painel esquerdo de Negócios fica igual ao da Clint, variante com menu superior (01-010, 01-032, 01-033, 01-034). Só a marca é nossa.

- **Coluna inteira, não cartão:**
  - 250px, branca, do topo ao fundo da tela, com a borda direita `#E8E4F5`;
  - a bolinha "<" de 20px centrada na borda;
  - 78px de espaço acima de ORIGENS.
- **Cabeçalhos** ORIGENS e VISUALIZAÇÕES de 48px: ícone, título 11px/600 em caixa alta, lupa e "^".
- **Linhas de 34px:**
  - o quadradinho de 20px nas cores da Clint (o tom gravado continua o da paleta);
  - seta, "+" (com a dica escura "Nova origem") e ⋮ que aparecem no hover;
  - o grupo aberto fica cinza `#F3F3F3`;
  - a origem e a visualização abertas ficam com o fundo `#EFF3FF` e a barra de 3px da marca.
- **Menus ⋮** do grupo e da origem como 01-032/033: ícones, divisória antes de "Arquivar", "Excluir" em vermelho, raio 8 e sombra do painel.
- **Janelas no visual do modal da Clint (01-013):**
  - campos `#EFF3FF` sem borda;
  - "Cancelar" branco com borda e "Salvar" verde-menta;
  - a caixinha e o seletor da casca no lugar do checkbox nativo e do `SearchableSelect`.
- **Rodapé do modo seleção** como 01-026: marcador, "N origens selecionadas · Rascunho" na cor da marca e o botão com disquete.
- **`IconeDoGrupo` não usa mais `estiloDoChip`.** Isso fecha a pendência da cerca `chip-contraste-da-etiqueta`.

**Sem a casca, nada muda.** Teste novo em `escale-com-origens` mostra que, com a lateral, o quadro chega sem embrulho nenhum. O `git diff` contra a `main` não toca nenhum arquivo do original.

## Fora desta parte

- **RECENTES:** fica para a Fase 1E (reescrita), porque hoje não há dado de recentes. O lugar e o cabeçalho estão prontos.

## Diferenças que sobraram

<lista da Task 8, Step 4>

## Prints que faltam desta parte

Itens 8 a 14 da lista do plano-índice:
- painel recolhido;
- lupa clicada;
- VISUALIZAÇÕES aberta;
- RECENTES aberta;
- janelas do menu do grupo e confirmações;
- formulário "Nova origem";
- arquivados.

## Verificação

- [ ] `typecheck`, `lint`, `cercas` e `test:unit` (só as falhas conhecidas do Windows).
- [ ] Conferência na tela contra 01-010, 01-032, 01-033 e 01-034 (Task 8), com as medidas: local, se houver banco de teste; senão, depois do deploy, com o PR de correção `fix/casca-clint-v3-conferencia`.
- [ ] Na tela, depois do deploy (usuário):
  - [ ] o painel é a coluna inteira e a página não ganhou rolagem;
  - [ ] o hover mostra seta, "+" e ⋮;
  - [ ] os menus e a dica estão iguais aos prints;
  - [ ] as janelas abrem com o verde-menta;
  - [ ] com o menu lateral, Negócios fica igual ao de antes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PR
```

Antes de rodar, troque `<lista da Task 8, Step 4>` no corpo pela lista que a Task 8 produziu (as dez conhecidas e as medidas) ou, no CAMINHO B, pelas dez conhecidas mais a linha "Conferência visual pendente: feita depois do deploy, em https://app.escaleia.com, pela regra do contrato; as diferenças medidas vão num PR de correção (`fix/casca-clint-v3-conferencia`)". Expected: a URL do PR. Mostre a URL ao usuário e PARE: merge, tag, release e VPS só com o "pode fazer" dele.

---

## Prints que faltam desta parte

São os itens 8 a 14 de `clint-telas.md` §7, todos na **variante com menu superior**, na mesma resolução dos prints de 15/10. Enquanto não chegam, a V3 faz o que está na terceira coluna.

| # | Print | O que a V3 fez enquanto isso |
|---|---|---|
| 8 | Painel **recolhido** (depois do "<") e o botão de reabrir | Mantém o recolher de hoje. O botão de reabrir é a mesma bolinha de 20px, no topo da borda esquerda. |
| 9 | **Lupa de ORIGENS** clicada, com resultado | Mantém o campo de hoje abaixo do cabeçalho, no visual da busca da casca (`#F6F8FF`, sem borda). O texto "Buscar origens, grupos, visualizações…" é o da Clint lateral (01-014). Filtra grupos, origens e visualizações. |
| 10 | **VISUALIZAÇÕES aberta**, com uma visualização, e o caminho para **criar** | A linha segue a da origem, com o quadradinho e a contagem de 01-014. O "+" de criar só aparece no hover do cabeçalho. |
| 11 | **RECENTES aberta** | Não desenhada: fica para a Fase 1E, sem dado hoje. |
| 12 | Janelas do menu do grupo (**Configurações**, **Selecionar origens**, **Customizar**) e **confirmações de Arquivar e Excluir** (grupo e origem) | Os formulários de hoje no visual de 01-013. Selecionar origens é o modo seleção no próprio painel (01-026, lateral). Excluir é vermelho. |
| 13 | **Formulário "Nova origem"** (o "+" do grupo) | O campo inline de hoje, dentro do grupo. A dica "Nova origem" é a de 01-034. |
| 14 | **Grupo ou origem arquivado** e onde reativar | "Arquivados (N)" no pé da lista, com Desarquivar, no visual do painel. |

Dois pontos extras para pedir junto:
- **15.** Onde a Clint superior cria um **grupo de origens**. Hoje é o nosso "+" no cabeçalho ORIGENS.
- **16.** O **estado inicial** do grupo da origem aberta ao entrar em Negócios: aberto (como 01-032) ou fechado (como 01-010)?

## Auto-revisão

- **Cobertura do pedido:**
  - geometria da coluna, bolinha e espaço do topo → Tasks 3 e 5;
  - cabeçalhos ORIGENS e VISUALIZAÇÕES → Tasks 3, 5 e 6;
  - linhas de 34px, ícones 20px nas cores da Clint, hover, origem aberta → Tasks 1, 3 e 4;
  - menus ⋮ de 01-032/033 por embrulho do fork, sem mudar `components/ui/dropdown-menu.tsx` → Tasks 3 e 4;
  - VISUALIZAÇÕES e rodapé → Task 6;
  - janelas com `CaixaDaCasca`, `SeletorDaCasca` e o verde-menta → Task 7;
  - `t()` + espanhol → Task 2;
  - conferência na tela → critério das Tasks 4 a 7 e a Task 8;
  - gates e PR → Task 9;
  - RECENTES → decisão registrada (1E).
- **Nomes consistentes entre tarefas:**
  - `BOTAO_DE_ICONE`, `SO_NO_HOVER`, `LINHA`, `LINHA_COM_HOVER`, `LINHA_ATUAL`, `RECUO_DO_TEXTO`, `BOLINHA_DO_PAINEL`, `ENVOLTORIO_DO_PAINEL` e `CONTEUDO_AO_LADO_DO_PAINEL` nascem na Task 3 e são os mesmos nas Tasks 4 a 6;
  - `ConteudoDoMenu`/`ItemDoMenu`/`SeparadorDoMenu`/`Tres` e `DicaEscura` (Task 3) são os usados nas Tasks 4 a 6;
  - `JanelaDaCasca`/`CabecaDaJanela`/`Campo`/`CampoDeTexto`/`BotaoDaJanela`/`RodapeDaJanela` (Task 7);
  - `corDoIconeNaCasca` e `COR_DO_ICONE_DA_VISUALIZACAO` (Task 1);
  - as variáveis `--escale-painel-hover`, `--escale-salvar` e `--escale-salvar-texto` (Task 2).
- **A branch compila em todo commit.** A Task 4 tira três exports de `LinhasDoPainel.tsx`, e por isso faz no mesmo commit os dois encaixes de import (PainelOrigens e SecaoVisualizacoes).
- **Testes do fork intocados:** nenhuma linha existente dos quatro testes de guarda muda. Os casos novos estão em blocos `casca V3 — …`. Todos os `aria-label` que eles usam continuam iguais (lista em Global Constraints).
- **Cercas revisadas:**
  - `tailwind-tokens`: sem `rounded`/`shadow` puros; a sombra arbitrária é `shadow-[…]`;
  - `altura-fixa`: `calc(100dvh-2.75rem)` sem `var(--space-N)`;
  - `controle-decorativo`: nenhum `<Button` do original nos arquivos reescritos;
  - `selecao-longa-tem-busca`: sem `<select>`;
  - `chip-contraste`: passa a ficar verde;
  - `escale-tema`: o bloco novo vai no fim;
  - `i18n`: todo texto por `t()`.
- **Riscos que o executor precisa olhar:**
  1. As props reais de `CaixaDaCasca`, `SeletorDaCasca` e `BotaoDaCasca` vêm da V1. O Step 1 da Task 1 e o Step 1 da Task 6 conferem e mandam PARAR se diferirem.
  2. A altura `calc(100dvh-2.75rem)` supõe o topo de 44px da V2 (conferido na Task 1).
  3. O `md:-mb-[max(…)]` repete a conta de `estiloDaReserva`. Se o original mudar essa conta, a cerca não pega. Por isso o comentário em `estilos-do-painel.ts` aponta o arquivo de lá, e a Task 8 confere que a página não ganhou rolagem.
  4. `JanelaDaCasca` importa `@radix-ui/react-dialog` direto (é dependência do projeto). É o único jeito de trocar a cortina sem mexer no `DialogContent` do original.
  5. A conferência na tela local só vale com `.env.local` apontando para um banco de teste (CAMINHO A). Sem isso, ela acontece depois do deploy, no app de produção, só leitura, com o Claude in Chrome, e os consertos vão num PR de correção (CAMINHO B, regra do contrato). Nunca um dev server local ligado ao banco de produção.
- **Sem placeholder:** todo arquivo novo ou reescrito está inteiro no plano. Os dois únicos trechos que dependem de execução estão marcados para troca explícita: a lista de diferenças medidas (Task 8 → corpo do PR) e o caminho do arquivo que falhar no worktree de comparação.
