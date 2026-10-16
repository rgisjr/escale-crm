# Casca V4 — Quadro de Negócios igual à Clint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar a página do quadro de Negócios (funil e Visualização) da casca nova **igual à Clint, variante menu superior** (01-010-kanban-v1.png e os prints do usuário de 15/10). Só a marca é nossa:
- **cabeçalho:** sobrelinha "NEGÓCIOS DA ORIGEM", título grande e o botão "Negócio +" na cor da marca. Sem o seletor de funil no título (trocar de origem é pelo painel da esquerda, V3) e sem a alternância Quadro/Calendário;
- **barra de filtros:** a busca e os 6 gatilhos da Clint (Data, Campos, Tags, Dono do negócio, Status e Mais filtros), com selo de contagem em cada gatilho. O Data usa o calendário com abas e atalhos da V1 e passa a filtrar também por data de ganho e de perda;
- **linha de contagem e ações:** "N oportunidades de Negócio" (número real, com plural) e, à direita, atualizar, exportar (desligado até a 1E), engrenagem e ajuda (desligada). Ordenar, Filtros salvos e Limpar filtros ficam na engrenagem;
- **colunas:** raia lavanda de 260px, sem borda, com rolagem própria, total "R$…", círculo de contagem e ⋮;
- **card:** a anatomia padrão da Clint (tags, nome com foto à direita, caixa da última mensagem, rodapé com dono, atalhos, valor, atividades e tempo na etapa).

Sem a casca (`escale_menu` ≠ `topo`), a página, o `FilterBar`, o `StageColumn` e o `KanbanCard` do original ficam exatamente como estão.

**Architecture:** Tudo novo é do fork. Os arquivos do original recebem só encaixes pequenos, marcados com `FORK ESCALE · Casca V4`:
- **`KanbanBoard.tsx`** ganha duas props opcionais: `aparencia?: "casca"` e `aoAdicionarNegocio?: (stageId) => void`. Com `"casca"`, ele monta `ColunaDoFunilNaCasca` (fork) no lugar do `StageColumn` e troca a classe do contêiner de rolagem. O resto (arrasto, ordenação, dossiê, seleção, diálogos) é o mesmo código;
- **`_client.tsx`** do funil, com a casca, mostra `CabecalhoDaCasca` no lugar do `<header>` original e passa `aparencia="casca"` ao quadro. O bloco original do cabeçalho fica byte a byte igual dentro do outro ramo, para o merge semanal com o Rafael não ter conflito.

As peças novas moram em `components/escale/quadro/`:
- `ColunaDaCasca`: a raia genérica, usada pelo funil e pela Visualização;
- `ColunaDoFunilNaCasca`: o adaptador do funil, com as props do `StageColumn`;
- `CardDaCasca` e `PecasDoCard`: o card, com os comportamentos do `KanbanCard` (clique abre o dossiê, ctrl/shift selecionam, ⋮ de ações, pulso, linha do agente);
- `CabecalhoDaCasca`.

A barra (`components/escale/filtros/`, que já só existe na casca) é refeita sobre os componentes da V1: `GatilhoDeFiltro`, `PainelSuspenso`, `CaixaDaCasca`, `SeletorDaCasca`, `CalendarioDePeriodo` e `BotaoDaCasca`. Nenhum `<select>`, `<input type="date">`, caixinha ou rádio nativo sobra em `components/escale/filtros/`.

Dados:
- **Data:** o filtro ganha `ganhoEm` e `perdidoEm` (schema, URL `f`, `aplicar`), lidos pelo `closed_at` e pelo status;
- **Foto do contato:** a etapa do fork na rota do quadro (`comDadosDosFiltros`) passa a ler `contacts.avatar_storage_path` e anexa `contato_tem_foto`. A tela pede a foto pela rota que já existe, `GET /api/v1/contacts/{id}/avatar` (URL assinada curta, cache privado, nunca para anonimizado). Não há migration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, Zod 4, TanStack Query 5, `@hello-pangea/dnd`, Radix (Popover, DropdownMenu, Avatar), Vitest + Testing Library, Tailwind 4, `lucide-react` (via `@/lib/ui/icons-da-casca`, V1) e Phosphor (via `@/lib/ui/icons`, só os logos de canal).

**Referência visual (abrir o PNG antes de cada task visual):**
- Alvo: C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-010-kanban-v1.png.
- Prints do usuário (valem mais que as fichas): C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-do-usuario\2026-10-15-filtro-data-aberto.png (o Data aberto) e ...\2026-10-15-barra-de-filtros.png (a barra, hover em "Dono do negócio"). ...\2026-10-15-escale-atual.png é o NOSSO app hoje (para comparar).
- Recortes: `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\crops\` (card1.png, colhead.png, filterbar.png, icons-right.png, datatabs.png, essasemana.png, msg-status.png, msg-voice-unread.png, bottom-tags.png).
- Só comportamento (variante lateral, NÃO é o alvo visual): 01-018-filtros-negocios.png, 01-019-personalizacao-cards.png, 01-020-kanban-negocios.png.
- Documentos (cópias estáveis): `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\clint-design-system.md` (§2, §3, §4, §6.2–6.12), `...\docs\clint\clint-telas.md` (§3, §4, §5, §7, §8, §9; medidas em px do print, divida por 1,25), `...\docs\clint\inventario-escale.md` (§3, §5, §6) e `...\docs\clint\contrato-casca-igual-a-clint.md`.
- No repositório, a V1 copiou essa pasta para `docs/escale/clint/`. Os comentários de código citam esse caminho.

## Decisões desta parte

Cada uma vale até o print que falta chegar (lista "Prints que faltam desta parte", no fim). O usuário confere ao aprovar o plano.

| # | Decisão | Por quê |
|---|---|---|
| D1 | O título do card é o **nome do contato** (`filtros_escale.contato_nome`). Sem nome (sem contato, anonimizado), vale o título do negócio | Na Clint o card mostra "Reinaldo Fernandes", o nome da pessoa. No nosso banco o título do negócio costuma ser o telefone (print 2026-10-15-escale-atual.png) |
| D2 | **Foto:** `contato_tem_foto` vem no payload pela etapa do fork. A imagem vem da rota existente `/api/v1/contacts/{id}/avatar`. Sem foto, a silhueta cinza da Clint | A rota já assina URL curta, recusa anonimizado (LGPD) e tem cache privado de 240s. Assinar no payload do quadro duplicaria essa regra e expiraria com a tela aberta |
| D3 | **Data:** um período por vez, do tipo da aba: criação (`criadoEm`), ganho (`ganhoEm`) e perda (`perdidoEm`). Ganho e perda leem `closed_at` e o status. Escolher ganho ou perda **acrescenta** "Ganhos" ou "Perdidos" ao Status. A 4ª aba (relógio) fica **desligada** | No bundle da Clint as abas são `created_at, won_at, lost_at, scheduled_at` (design system §5). "Agendado" não tem equivalente nosso nem print. Sem acrescentar o status, um período de ganho com "Em aberto" daria quadro vazio sem explicação |
| D4 | **Contagem nos gatilhos** no lugar dos chips. `PainelDeFiltros` e `ResumoDosFiltros` saem | O print da barra mostra o selo só em "Status 1" (2.png). A ficha pede o resumo visível com o painel fechado, e o selo por gatilho cumpre isso (clint-telas §4.5). PRINT 30 confirma |
| D5 | **Ordenar, Filtros salvos, Limpar filtros** e "Personalizar cards" (desligado, 1E) ficam **dentro da engrenagem** da linha de ações | A variante superior não mostra Ordenar nem filtros salvos (clint-telas §4.3, §4.4). As duas funções existem desde a 1D e não podem sumir. PRINTS 15, 31 e 32 |
| D6 | **Exportar** e **Ajuda** aparecem como na Clint, **desligados**, com a dica "Em breve" | Exportar é da 1E. A ajuda não tem destino nosso. PRINTS 16 e 17 |
| D7 | **Cada coluna rola sozinha**; o quadro só rola para o lado | É o que a Clint mostra (barra cinza dentro da coluna). Risco: o `@hello-pangea/dnd` não rola o contêiner de fora durante o arrasto (rolagem aninhada). A Task 15 mede. Se arrastar para uma coluna fora da tela não funcionar, o relatório diz, e o usuário decide entre manter assim ou voltar à rolagem única |
| D8 | Card e coluna da casca são **componentes do fork**. `KanbanCard` e `StageColumn` não mudam | Encaixe mínimo no original. As cercas `kanban-atalho-conversa` e `funil-mostra-dados-do-cliente` leem o `KanbanCard.tsx`, que fica intacto |
| D9 | A **linha do agente** (próxima ação, retomada, esfriando, score) aparece no card da casca **só quando tem conteúdo**. A borda de estado de 2px **não** aparece na casca | A Clint não tem nada disso. O motor do agente é nosso e pede decisão humana, então a linha fica. A borda não tem equivalente e é cor fora da Clint |
| D10 | **Selecionar:** a caixinha aparece no lugar da foto no hover (como na lateral, 01-020). "Selecionar todos" vai para o ⋮ da coluna. Ctrl/cmd e shift continuam | A coluna da Clint superior não tem caixinha. O ⋮ da coluna tem "Selecionar todos…" no bundle (design system §6.10). PRINT 18 |
| D11 | **Tempo na etapa:** em horas até 47h ("31h"), depois em dias ("3d") | Os prints mostram "31h", "30h" e "3d" (2.png). O `stageAgeLabel` do original passa para dias em 24h |
| D12 | **Valores:** o card escreve "R$0", "R$950", "R$64,8k", "R$1,2M". O total da coluna escreve "R$0" ou "R$12.500", nunca "undefined", com as moedas lado a lado. O "ponderado" do original vira a dica (`title`) do total | Prints da Clint ("R$0", "R$64,8k"). Bug "undefined0" da Clint não se copia (contrato) |
| D13 | **Tags:** chips na paleta da Clint (design system §3.4), mapeada dos 8 tons das nossas etiquetas. Tag sem cor sai azul (o padrão da Clint). Até 3 chips e "+N" | Paleta do bundle `w9e`. O "+N" é do bundle (`mode:"tooltip"`) |
| D14 | **Contagem:** "N oportunidade(s) de **Negócio**", com o número real e plural | Decisão de 16/10 (contrato) |
| D15 | **Visualização:** sobrelinha "NEGÓCIOS DA VISUALIZAÇÃO". O "{n} origens" sai do cabeçalho (o painel V3 já mostra). O card mostra o nome da origem numa linha pequena abaixo do nome | Não há print da Visualização na variante superior. O nome da origem é o que a 1C já mostrava no rodapé |
| D16 | **"+ Adicionar negócio"** aparece no pé das colunas abertas do funil, no visual da Clint, e abre o "Novo negócio" de sempre (a etapa se escolhe no formulário). **"Negócio +"** também abre o "Novo negócio" | Clint mostra o link (01-010). Etapa já escolhida, corte de papel e "Importar" são da 1E |

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- **Base:** `escale-crm/main` **com a 1D, a V1, a V2 e a V3 mergeadas.** A Task 1 prova. Se faltar alguma, PARE e pergunte ao usuário.
- **Branch:** `feat/casca-clint-v4-quadro`.
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:**
  - dar push em `origin` (o repositório do Rafael);
  - mergear;
  - publicar release;
  - mexer na VPS ou no banco de produção (nem com o MCP de escrita `supabase-crm-rw`).

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- Polyfills do Radix nos testes de tela (o jsdom não tem): o mesmo bloco dos testes da 1D (`scrollIntoView`, `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, `ResizeObserver`). Cada teste novo abaixo já o traz.

### Componentes da V1 que esta parte consome (nomes do contrato)

| Import | Uso aqui |
|---|---|
| `@/components/escale/ui/BotaoDaCasca` (`variante: "marca" \| "novo" \| "texto" \| "icone"`, `tamanho?`) | "Negócio +", ícones da linha de ações, Limpar, Aplicar |
| `@/components/escale/ui/GatilhoDeFiltro` (`rotulo`, `contagem?`, `aberto?`) | os 6 gatilhos |
| `@/components/escale/ui/PainelSuspenso` (props do `PopoverContent`) | o painel de cada gatilho, da engrenagem e do Ordenar |
| `@/components/escale/ui/CaixaDaCasca` (`marcada`, `aoMudar`, `rotulo?`, `aria-label?`, `desabilitada?`) | toda caixinha |
| `@/components/escale/ui/SeletorDaCasca` (`valor`, `opcoes {valor, rotulo, grupo?, desabilitada?}`, `aoMudar`, `aria-label`, `vazio?`, `buscaAPartirDe?`) | toda seleção |
| `@/components/escale/ui/CalendarioDePeriodo` (`valor: Periodo`, `aoMudar`, `tiposDisponiveis?`) | o Data |
| `@/lib/ui/icons-da-casca` (lucide) | ícones. A Task 1 acrescenta os que faltarem |
| Tokens `*-casca-*`, `rounded-casca-gatilho/card/raia`, `shadow-casca-painel` | todo o visual |

Se a seção "Mudanças" do plano V1 renomeou algum desses nomes, a Task 1 manda trocar o nome em TODAS as tasks deste plano antes de começar.

### Onde o fork entra nos arquivos do original

| Arquivo | O que muda | Marca |
|---|---|---|
| `components/kanban/KanbanBoard.tsx` | 1 import, 2 props, a classe do contêiner e a escolha da coluna dentro do `map` | `FORK ESCALE · Casca V4` |
| `app/app/pipelines/[id]/_client.tsx` | 1 import, a classe de altura da casca (topo de 44px) na linha do contêiner, o ramo da casca antes do `<header>` (que fica intacto) e 2 props no `KanbanBoard` | `FORK ESCALE · Casca V4` |
| `lib/i18n/dicionario.ts` | bloco novo logo ANTES da linha `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───` | cabeçalho do bloco |

`StageColumn.tsx`, `KanbanCard.tsx`, `FilterBar.tsx`, `ConversaSlot.tsx`, `ContatoNoCard.tsx` e a rota `app/api/v1/pipelines/[id]/board/route.ts` **não mudam**.

### Cercas que esta parte precisa manter verdes

- `tests/unit/kanban-atalho-conversa.test.tsx` e `tests/unit/funil-mostra-dados-do-cliente.test.tsx` leem o `KanbanCard.tsx` (`contactId={lead.contact_id}`, `phone={lead.contact_phone}`, `<ContatoNoCard lead={lead}`) e a cadeia da rota. Nada disso muda.
- `tests/unit/tailwind-tokens.test.ts`: nada de `rounded`, `shadow` ou `outline-none` puros (use `rounded-md`, `rounded-[4px]`, `shadow-casca-painel`, `outline-hidden`); `flex-shrink/grow` proibidos (use `shrink-0`).
- `tests/unit/controle-decorativo.test.ts`: todo `<Button>` (de `components/ui`) tem `onClick`, `asChild`, `type="submit"` ou `disabled`+`title`. Os botões novos são `BotaoDaCasca` ou `<button>` com `onClick`; os desligados levam `disabled` e `title`.
- `tests/unit/selecao-longa-tem-busca.test.ts`: `_client.tsx` continua com 1 lista dinâmica em `<SelectContent>` (o seletor de funil do ramo original). Nenhum arquivo do fork usa `<select>` nem `SelectContent`.
- `tests/unit/altura-fixa-le-a-reserva-do-rodape.test.ts`: a classe `h-[calc(100dvh-3.5rem-…)]` de `_client.tsx` e `QuadroDaVisualizacao.tsx` fica como está (vale sem a casca e no celular, onde o topo é o `h-14` de 56px). Esta parte é a dona do ajuste ao topo de 44px da V2 (contrato, "Medidas comuns"; a V3 ajusta só o `PainelOrigens`): as duas ganham a classe extra `md:[body:has([data-escale-casca])_&]:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]` (Tasks 12 e 13), que também lê `--rodape-ocupado`, como a cerca pede.
- `tests/unit/i18n-espanhol-cobre-a-tela.test.ts`: todo texto de tela passa por `t()` com literal (ou consulta a tabela fechada dentro do `t()`, como a 1D já faz) e tem espanhol (Task 14). Dado do operador (nome de tag, de pessoa, de etapa) não passa por `t()`.
- Ganchos dos testes e do e2e: `data-quadro-do-funil`, `data-etapa-do-quadro`, `data-cabecalho-da-etapa`, `data-quadro-da-visualizacao`, `data-coluna-da-visualizacao`, `data-testid="status-do-quadro"`, `data-testid="filtros-salvos"`, `data-testid="nome-etapa-quadro"`. A coluna da casca repete os mesmos.

### Textos e i18n

- Todo texto de tela passa por `t()` com literal e tem espanhol no dicionário.
- Chave repetida no dicionário quebra o typecheck. A Task 14 insere por script e PULA as chaves que já existem.
- Nas Tasks 2 a 13, o teste de i18n pode ficar vermelho por falta do espanhol. É esperado até a Task 14. Cada task roda só os próprios testes.

### Commits, PR e testes

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- O corpo do PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Typecheck e lint em toda task de código (2 a 14)**, depois do `vitest run` da task e antes do commit:
  ```bash
  export NODE_OPTIONS=--max-old-space-size=6144
  corepack pnpm typecheck
  corepack pnpm exec eslint <arquivos criados ou alterados nesta task>
  corepack pnpm exec prettier --write <arquivos NOVOS desta task e os do fork alterados>
  ```
  Expected: sem erros novos. O `typecheck` inclui os testes com `noUncheckedIndexedAccess` (lição da 1D, commit `84c7f63da`): `match`, `split` e `mock.calls` usados como valor precisam de `!`, `?.` ou default. **Não** rode o prettier em `KanbanBoard.tsx` nem em `_client.tsx`: são do original, e o encaixe foi escrito para não reformatar as linhas dele.
- **Falhas que não são regressão:** testes que falham NESTA máquina Windows e também em `escale-crm/main` (pdfjs com caminho `C:\…`, `spawnSync bash ENOENT`, `chmod 600`, caminho com espaço, `EPERM` em pasta temporária). Ver a memória `sincronizar-com-o-rafael`. Regressão é teste que passa em `escale-crm/main` e falha na branch.
- **Docker para o `test:db`:** `pnpm test:db` precisa do Docker Desktop rodando. Se `docker info` falhar, PARE e peça ao usuário para abrir o Docker. Se travar em "wsl-keepalive", a cura é `wsl --shutdown` e abrir o Docker de novo, com OK do usuário.

## Medidas da Clint usadas (px de CSS, já divididas por 1,25)

| Peça | Medida | Fonte |
|---|---|---|
| Sobrelinha | 10px, 600, maiúsculas, lh 15px, mb 4px, `text-casca-sobrelinha` | DS §2 |
| Título | 26px, 600, lh 36px, `text-casca-texto` | DS §2 |
| "Negócio +" | ~95×31, `BotaoDaCasca variante="marca"`, topo ~7px abaixo da sobrelinha | DS §6.2, §4.4 |
| Título → barra | 32px (gap 16 da página + `mt-4`) | 01-010 y 155→195 |
| Busca | 109×32, `bg-casca-busca`, sem borda, raio 6, lupa 16px `text-casca-suave` à direita, sem placeholder | DS §6.4 |
| Gatilhos | h 36, px 10, ~14px entre eles; o resto é da V1 | DS §6.3 |
| Barra → linha de contagem | ~29px (`gap-6` + alinhamento) | 01-010 y 234→270 |
| Contagem | 14px 400 + "Negócio" 600, `text-casca-texto` | DS §2 |
| Ícones da linha | 16–17px, `text-casca-suave`, centros a ~34px (botões 28px + `gap-1.5`); exportar desligado `#BDBDBD`; ajuda sobre quadrado 28px `bg-casca-marca-suave` | DS §3.3, §5; crop icons-right.png |
| Coluna | 260px, gap 12, `bg-casca-raia`, `rounded-casca-raia`, sem borda | DS §4.4 |
| Cabeçalho da coluna | título 14px/500 a 12px da esquerda e 16px do topo; "R$0" 12px; círculo 28px `bg-casca-contador` com número 10px/600; ⋮ 18px `text-casca-suave` | DS §6.10 |
| Cabeçalho → 1º card | ~24px (`pt-6` no corpo) | DS §6.10, §6.12 |
| Card | 236px (260 − 8 − espaço da barra de rolagem), branco, `rounded-casca-card`, sem borda nem sombra; 16px entre cards | DS §6.11 |
| Cabeçalho do card | p 8, pb 4, minH 51; nome 13px/500 lh 15 `mt-2 mb-1`; foto 28×28 (quadrada raio 4 com foto, círculo `bg-casca-cinza-selo` sem foto) | DS §6.11 |
| Chips de tag | altura 15px, texto 10px, `rounded-full`, px 8, gap 6 | DS §3.4, §6.9 |
| Caixa da mensagem | margem 8, h 34, `bg-casca-caixa-msg`, borda 1px `border-casca-borda-msg`, raio 6; canal 14px; ✓✓ 14px; texto 11px `text-casca-suave`; mini-avatar 18px; data 11px | DS §6.11 |
| Rodapé do card | borda superior 1px, px 10, py 6, minH 36; dono 20px; ícones 12px `text-casca-meta` com 8px entre eles; valor 11px/500; ✓ 12px + "0/3"; relógio 12px + "5d" | DS §6.11 |
| "+ Adicionar negócio" | 13px/400 `text-casca-texto-2`, centralizado, `py-1`, ícone + | DS §6.12 |

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/ui/icons-da-casca.ts` | alterado (1 linha de export) | ícones lucide que a V1 ainda não tinha |
| `lib/escale/filtros/tipos.ts` | alterado | `ganhoEm`, `perdidoEm`, enxugar, seção e rótulos |
| `lib/escale/filtros/url.ts` | alterado (2 chaves) | `ganhoEm` e `perdidoEm` no `f` |
| `lib/escale/filtros/aplicar.ts` | alterado | período por dia local; ganho e perda pelo `closed_at` |
| `lib/escale/filtros/periodo.ts` | novo | período do Data ↔ filtros; datas dd/mm/aaaa |
| `tests/unit/escale-filtro-de-data.test.ts` | novo | período, aplicar, URL, datas |
| `lib/escale/filtros/dados-do-quadro.ts`, `ler-dados-do-quadro.ts` | alterados | `contato_tem_foto` |
| `tests/helpers/negocio-do-quadro.ts` | alterado | padrão `contato_tem_foto: false` |
| `tests/unit/escale-dados-dos-filtros.test.ts`, `escale-dados-dos-filtros-na-rota.test.ts` | alterados | a foto |
| `lib/escale/filtros/gatilhos.ts` | novo | contagem e limpeza por gatilho da Clint |
| `lib/escale/quadro/aparencia.ts` | novo | contagem, valores, total, idade, data da mensagem, cores de avatar e de tag, título, atividades, foto |
| `tests/unit/escale-regras-da-casca.test.ts` | novo | as regras acima |
| `components/escale/filtros/controles.tsx` | reescrito | campo da casca, número, texto, data dd/mm/aaaa, rótulo, linha de menu |
| `components/escale/filtros/SecaoConversas.tsx`, `SecaoTags.tsx`, `SecaoOutros.tsx`, `JanelaDoFiltroSalvo.tsx` | alterados | controles da V1 |
| `tests/unit/escale-secoes-de-filtro.test.tsx` | novo | Conversas, Tags, Outros |
| `tests/unit/escale-painel-de-filtros.test.tsx` | removido | substituído pelos testes novos |
| `components/escale/filtros/SecaoCampos.tsx`, `SecaoNegocio.tsx`, `OrdenarCards.tsx`, `MenuDeFiltrosSalvos.tsx` | alterados | controles da V1; Negócio sem dono e sem data; gatilhos em forma de linha de menu |
| `components/escale/filtros/SecaoDono.tsx` | novo | a lista do "Dono do negócio" |
| `tests/unit/escale-secoes-campos-dono-negocio.test.tsx` | novo | Campos, Dono, Negócio |
| `components/escale/filtros/GatilhoComPainel.tsx` | novo | gatilho + painel + Limpar |
| `components/escale/filtros/FiltroDeData.tsx` | novo | o Data |
| `components/escale/filtros/StatusDoQuadro.tsx` | reescrito | o Status como gatilho |
| `components/escale/filtros/GatilhosDoQuadro.tsx` | novo | Campos, Tags, Dono do negócio, Mais filtros |
| `components/escale/filtros/PainelDeFiltros.tsx`, `ResumoDosFiltros.tsx` | removidos | D4 |
| `tests/unit/escale-gatilhos-do-quadro.test.tsx` | novo | os 6 gatilhos |
| `components/escale/filtros/MenuDaEngrenagem.tsx` | novo | Ordenar, Filtros salvos, Limpar, Personalizar |
| `components/escale/filtros/LinhaDeContagem.tsx` | novo | contagem e ações |
| `components/escale/filtros/BarraDoQuadro.tsx` | reescrito | busca + 6 gatilhos + linha de contagem |
| `tests/unit/escale-barra-do-quadro.test.tsx` | reescrito | a barra |
| `components/escale/quadro/PecasDoCard.tsx`, `CardDaCasca.tsx` | novos | o card |
| `tests/unit/escale-card-da-casca.test.tsx` | novo | o card |
| `components/escale/quadro/ColunaDaCasca.tsx`, `ColunaDoFunilNaCasca.tsx` | novos | a coluna |
| `tests/unit/escale-coluna-da-casca.test.tsx` | novo | a coluna |
| `components/kanban/KanbanBoard.tsx` | alterado (encaixe) | `aparencia`, `aoAdicionarNegocio` |
| `tests/unit/escale-quadro-na-casca.test.tsx` | novo | o encaixe, com e sem casca |
| `components/escale/quadro/CabecalhoDaCasca.tsx` | novo | sobrelinha, título, "Negócio +" |
| `app/app/pipelines/[id]/_client.tsx` | alterado (encaixe) | cabeçalho e quadro da casca; altura com o topo de 44px |
| `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx` | alterado | casca e "sem a casca fica igual" |
| `components/escale/visualizacoes/QuadroDaVisualizacao.tsx`, `ColunaDaVisualizacao.tsx`, `QuadroCombinado.tsx` | alterados | o mesmo visual na Visualização |
| `tests/unit/escale-quadro-da-visualizacao.test.tsx`, `escale-quadro-combinado.test.tsx` | alterados | idem |
| `lib/i18n/dicionario.ts` | alterado (bloco) | espanhol |

---

### Task 1: Base, branch, contrato da V1 e ícones

**Files:**
- Modify: `lib/ui/icons-da-casca.ts` (uma linha de export no fim)
- Copy: este plano para `docs/superpowers/plans/2026-10-16-casca-clint-v4-quadro.md` no repositório

**Interfaces:**
- Consumes: V1 (componentes e tokens do contrato), V2 e V3 mergeadas.
- Produces: a branch e os ícones `Search, RefreshCw, Download, Settings, MessageSquare, Phone, MessageCircle, Mail, CheckCircle2, Clock, EllipsisVertical, Plus, CheckCheck, User, UserX, Check, X, ArrowDownUp, Bookmark, ChevronRight, SlidersHorizontal` exportados por `@/lib/ui/icons-da-casca`. O ⋮ é `EllipsisVertical`, o nome canônico que a V1 e a V3 usam (`MoreVertical` também existe no lucide 1.52, mas só como apelido).

- [ ] **Step 1: Conferir a base e criar a branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
for p in feat/casca-clint-v1-fundacao feat/casca-clint-v2-topo feat/casca-clint-v3-painel; do
  printf '%s: ' "$p"; gh pr list -R rgisjr/escale-crm --state merged --head "$p" --json number --jq 'length'
done
# Expected: "1" nas três linhas. Se alguma der 0, PARE e pergunte ao usuário.
git cat-file -e escale-crm/main:supabase/migrations/20261019120000_9004_filtros_salvos.sql && echo "1D ok"
for f in BotaoDaCasca GatilhoDeFiltro PainelSuspenso CaixaDaCasca SeletorDaCasca CalendarioDePeriodo; do
  git cat-file -e "escale-crm/main:components/escale/ui/$f.tsx" && echo "ok $f"
done
git cat-file -e escale-crm/main:lib/ui/icons-da-casca.ts && echo "ok icones"
git show escale-crm/main:components/escale/menu/MenuDoTopo.tsx | grep -q "h-11" && echo "ok topo 44px"
# Expected: "1D ok", seis "ok …", "ok icones" e "ok topo 44px" (a altura das Tasks 12 e 13 depende do topo de 44px da V2). Faltou algum: PARE e pergunte.
git switch -c feat/casca-clint-v4-quadro escale-crm/main
corepack pnpm install --frozen-lockfile
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-16-casca-clint-v4-quadro.md" docs/superpowers/plans/
```

- [ ] **Step 2: Conferir o contrato da V1 (só leitura)**

```bash
grep -n "## Mudanças" -A40 "../docs/superpowers/plans/2026-10-16-casca-clint-v1-fundacao.md"
grep -n "^export" components/escale/ui/*.tsx
grep -n 'type="checkbox"\|<select\|type="date"\|type="radio"' components/escale/ui/*.tsx
grep -n "tiposDisponiveis\|disabled" components/escale/ui/CalendarioDePeriodo.tsx
grep -n 'role="checkbox"\|aria-checked\|aria-labelledby\|aria-label' components/escale/ui/CaixaDaCasca.tsx
grep -n 'role="combobox"\|role="option"\|aria-label' components/escale/ui/SeletorDaCasca.tsx
grep -n "cn(\|className" components/escale/ui/BotaoDaCasca.tsx components/escale/ui/GatilhoDeFiltro.tsx
grep -n "\.\.\.\(props\|rest\|resto\)" components/escale/ui/GatilhoDeFiltro.tsx components/escale/ui/BotaoDaCasca.tsx
```

Confira, uma por uma, e anote no relatório da task:
1. Se a seção "Mudanças" da V1 renomeou algum nome da tabela "Componentes da V1 que esta parte consome", troque o nome em TODAS as tasks deste plano (no arquivo do plano dentro do repositório) antes de seguir.
2. As assinaturas exportadas batem com o contrato.
3. Nenhum `type="checkbox"`, `<select>`, `type="date"` ou `type="radio"` nativo em `components/escale/ui/`.
4. `CaixaDaCasca` dá ao `role="checkbox"` o `rotulo` como nome acessível (na V1, pelo texto do próprio botão; `aria-label` ou `aria-labelledby` também servem).
5. `SeletorDaCasca` tem `role="combobox"` com o `aria-label` recebido, e as opções `role="option"` têm o `rotulo` como nome.
6. `CalendarioDePeriodo` mostra sempre as 4 abas e DESLIGA as que não estão em `tiposDisponiveis`.
7. `BotaoDaCasca` e `GatilhoDeFiltro` repassam as props extras (`onClick`, `data-testid`, `aria-*`, `title`, `disabled`) ao `<button>` e juntam o `className` de quem usa com `cn(...)`.

Se o item 1 pedir troca de nomes, faça e siga. Se qualquer item de 2 a 7 falhar, PARE e pergunte ao usuário: os testes deste plano dependem desse comportamento.

- [ ] **Step 3: Acrescentar os ícones que faltam (por script, sem duplicar)**

Da raiz do repositório:

```bash
node - <<'NODE'
const fs = require("fs");
const ARQ = "lib/ui/icons-da-casca.ts";
const NOMES = [
  "Search", "RefreshCw", "Download", "Settings", "MessageSquare", "Phone", "MessageCircle", "Mail",
  "CheckCircle2", "Clock", "EllipsisVertical", "Plus", "CheckCheck", "User", "UserX", "Check", "X",
  "ArrowDownUp", "Bookmark", "ChevronRight", "SlidersHorizontal",
];
let texto = fs.readFileSync(ARQ, "utf8");
// Lê só os nomes EXPORTADOS (inclusive `A as B`); um nome citado num comentário não conta.
const exportados = new Set();
for (const m of texto.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g)) {
  for (const parte of m[1].split(",")) {
    const p = parte.trim();
    if (p) exportados.add(p.split(/\s+as\s+/).pop().trim());
  }
}
const faltam = NOMES.filter((n) => !exportados.has(n));
if (faltam.length > 0) {
  const eol = texto.includes("\r\n") ? "\r\n" : "\n";
  if (!texto.endsWith(eol)) texto += eol;
  texto += `// Casca V4 (quadro de Negócios): ícones que a V1 ainda não reexportava.${eol}export { ${faltam.join(", ")} } from "lucide-react";${eol}`;
  fs.writeFileSync(ARQ, texto);
}
console.log(faltam.length ? `acrescentados: ${faltam.join(", ")}` : "nada a acrescentar");
NODE
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
```
Expected: a lista do que entrou (ou "nada a acrescentar") e o typecheck sem erros. Todos esses nomes existem no `lucide-react` 1.52 do repositório.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-10-16-casca-clint-v4-quadro.md lib/ui/icons-da-casca.ts
git commit -m "chore(escale): plano da Casca V4 e ícones do quadro

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: O filtro Data por criação, ganho e perda (regra pura)

**Files:**
- Create: `lib/escale/filtros/periodo.ts`, `tests/unit/escale-filtro-de-data.test.ts`
- Modify: `lib/escale/filtros/tipos.ts`, `lib/escale/filtros/url.ts`, `lib/escale/filtros/aplicar.ts`

**Interfaces:**
- Consumes: `FiltrosDoQuadro`, `enxugar`, `normalizarStatus` (1D).
- Produces:
  - `FiltrosDoQuadro.ganhoEm?` e `FiltrosDoQuadro.perdidoEm?` (`{ de?: string; ate?: string }`, AAAA-MM-DD), que vão no `f` da URL e no filtro salvo;
  - `aplicarFiltrosDoQuadro` filtra `ganhoEm` (status `won` e `closed_at` no período) e `perdidoEm` (status `lost` e `closed_at` no período), pelo dia local;
  - `periodo.ts`: `type TipoDoPeriodo`, `interface PeriodoDoFiltro`, `TIPOS_DE_DATA_DISPONIVEIS`, `periodoDosFiltros(f): PeriodoDoFiltro | null`, `comPeriodo(f, p): FiltrosDoQuadro`, `isoDaDataBr(texto): string | null`, `dataBrDoIso(iso): string`.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-filtro-de-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { aplicarFiltrosDoQuadro, type ContextoDoRecorte } from "@/lib/escale/filtros/aplicar";
import { comPeriodo, dataBrDoIso, isoDaDataBr, periodoDosFiltros } from "@/lib/escale/filtros/periodo";
import { criteriosAtivos, enxugar, type FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { filtrosDaUrl, filtrosParaUrl } from "@/lib/escale/filtros/url";
import type { Lead } from "@/lib/types/leads";
import { AGORA, negocio } from "@/tests/helpers/negocio-do-quadro";

const CTX: ContextoDoRecorte = { moeda: "BRL", campos: [], agora: AGORA };
const aplicar = (leads: Lead[], f: Partial<FiltrosDoQuadro>) =>
  aplicarFiltrosDoQuadro(leads, { status: ["open", "won", "lost"], ...f }, CTX).map((l) => l.id);

describe("o período do filtro Data", () => {
  it("lê o período que está nos filtros; sem período, nada", () => {
    expect(periodoDosFiltros({ status: ["open"] })).toBeNull();
    expect(periodoDosFiltros({ status: ["open"], criadoEm: { de: "2026-10-01" } })).toEqual({ tipo: "criacao", de: "2026-10-01" });
    expect(periodoDosFiltros({ status: ["won"], ganhoEm: { de: "2026-10-01", ate: "2026-10-31" } })).toEqual({
      tipo: "ganho",
      de: "2026-10-01",
      ate: "2026-10-31",
    });
    expect(periodoDosFiltros({ status: ["lost"], perdidoEm: { ate: "2026-10-31" } })).toEqual({ tipo: "perda", ate: "2026-10-31" });
  });

  it("um período por vez: escolher outro tipo apaga o anterior", () => {
    const f = comPeriodo({ status: ["open"], criadoEm: { de: "2026-10-01" } }, { tipo: "perda", de: "2026-10-05", ate: "2026-10-06" });
    expect(f.criadoEm).toBeUndefined();
    expect(f.perdidoEm).toEqual({ de: "2026-10-05", ate: "2026-10-06" });
  });

  it("ganho e perda trazem o status que pedem; criação não mexe no status", () => {
    expect(comPeriodo({ status: ["open"] }, { tipo: "ganho", de: "2026-10-01" }).status).toEqual(["open", "won"]);
    expect(comPeriodo({ status: ["open"] }, { tipo: "perda", de: "2026-10-01" }).status).toEqual(["open", "lost"]);
    expect(comPeriodo({ status: ["open"] }, { tipo: "criacao", de: "2026-10-01" }).status).toEqual(["open"]);
  });

  it("sem datas, ou com o tipo que ainda não existe, o Data sai", () => {
    expect(comPeriodo({ status: ["open"], criadoEm: { de: "2026-10-01" } }, { tipo: "criacao" })).toEqual({ status: ["open"] });
    expect(comPeriodo({ status: ["open"], criadoEm: { de: "2026-10-01" } }, { tipo: "agendado", de: "2026-10-01" })).toEqual({
      status: ["open"],
    });
  });
});

describe("aplicar ganho e perda", () => {
  const leads = [
    negocio("ganho-dia10", { status: "won", closed_at: "2026-10-10T15:00:00Z" }),
    negocio("ganho-dia12", { status: "won", closed_at: "2026-10-12T15:00:00Z" }),
    negocio("perdido-dia10", { status: "lost", closed_at: "2026-10-10T15:00:00Z" }),
    negocio("aberto", { status: "open", closed_at: null }),
  ];

  it("data de ganho: só ganhos, pelo dia local do fechamento", () => {
    expect(aplicar(leads, { ganhoEm: { de: "2026-10-11" } })).toEqual(["ganho-dia12"]);
    expect(aplicar(leads, { ganhoEm: { ate: "2026-10-11" } })).toEqual(["ganho-dia10"]);
  });

  it("data de perda: só perdidos", () => {
    expect(aplicar(leads, { perdidoEm: { de: "2026-10-01", ate: "2026-10-31" } })).toEqual(["perdido-dia10"]);
  });

  it("a data de criação continua igual", () => {
    const criados = [negocio("dia10", { created_at: "2026-10-10T15:00:00Z" }), negocio("dia12", { created_at: "2026-10-12T15:00:00Z" })];
    expect(aplicar(criados, { criadoEm: { de: "2026-10-11" } })).toEqual(["dia12"]);
  });
});

describe("ganho e perda na URL e nos critérios", () => {
  it("vão no f e voltam iguais", () => {
    const f: FiltrosDoQuadro = { status: ["open", "won"], ganhoEm: { de: "2026-10-01", ate: "2026-10-31" } };
    expect(filtrosDaUrl(new URLSearchParams(filtrosParaUrl(f))).filtros).toEqual(enxugar(f));
  });

  it("aparecem com o nome entre os critérios ativos", () => {
    expect(criteriosAtivos({ status: ["lost"], perdidoEm: { de: "2026-10-01" } }).map((c) => c.rotulo)).toEqual(["Data de perda"]);
  });
});

describe("datas digitadas em dd/mm/aaaa", () => {
  it("viram AAAA-MM-DD; data que não existe é recusada", () => {
    expect(isoDaDataBr("15/10/2026")).toBe("2026-10-15");
    expect(isoDaDataBr(" 01/02/2026 ")).toBe("2026-02-01");
    expect(isoDaDataBr("31/02/2026")).toBeNull();
    expect(isoDaDataBr("2026-10-15")).toBeNull();
    expect(dataBrDoIso("2026-10-15")).toBe("15/10/2026");
    expect(dataBrDoIso(undefined)).toBe("");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-filtro-de-data.test.ts
```
Expected: FAIL (`Cannot find module '@/lib/escale/filtros/periodo'`).

- [ ] **Step 3: O schema, o enxugar e os rótulos (`lib/escale/filtros/tipos.ts`)**

3a. No `filtrosDoQuadroSchema`, logo DEPOIS da linha `    criadoEm: z.object({ de: dia.optional(), ate: dia.optional() }).strict().optional(),`, acrescente:

```ts
    /** FORK ESCALE · Casca V4: o "Data" da Clint por ganho e por perda (o dia do fechamento, `closed_at`). */
    ganhoEm: z.object({ de: dia.optional(), ate: dia.optional() }).strict().optional(),
    perdidoEm: z.object({ de: dia.optional(), ate: dia.optional() }).strict().optional(),
```

3b. Logo DEPOIS da função `intervalo` (a que termina em `return semIndefinidos(i);\n}`), acrescente:

```ts
/** Um período de dias sem nada vazio; sem `de` nem `ate`, não é filtro. */
function periodoEnxuto(p: { de?: string; ate?: string } | undefined): { de?: string; ate?: string } | undefined {
  return p && (p.de || p.ate) ? semIndefinidos({ de: p.de || undefined, ate: p.ate || undefined }) : undefined;
}
```

3c. Em `enxugar`, troque:

```ts
  const criadoEm =
    f.criadoEm && (f.criadoEm.de || f.criadoEm.ate)
      ? semIndefinidos({ de: f.criadoEm.de || undefined, ate: f.criadoEm.ate || undefined })
      : undefined;
```
por:
```ts
  const criadoEm = periodoEnxuto(f.criadoEm);
```
e, no objeto devolvido, logo DEPOIS da linha `    criadoEm,`, acrescente:
```ts
    ganhoEm: periodoEnxuto(f.ganhoEm),
    perdidoEm: periodoEnxuto(f.perdidoEm),
```

3d. Em `CHAVES_DA_SECAO`, troque a linha do `negocio` por:
```ts
  negocio: ["dono", "criadoEm", "ganhoEm", "perdidoEm", "valor", "atrasados", "motivoDePerda", "categoriaDePerda"],
```

3e. Em `ChaveDeCriterio`, logo DEPOIS de `  | "criadoEm"`, acrescente `  | "ganhoEm"` e `  | "perdidoEm"`. Em `ROTULOS_DOS_CRITERIOS`, logo DEPOIS de `  criadoEm: "Data de criação",`, acrescente:
```ts
  ganhoEm: "Data de ganho",
  perdidoEm: "Data de perda",
```

- [ ] **Step 4: A URL (`lib/escale/filtros/url.ts`)**

No `avancadosSchema`, logo DEPOIS de `  criadoEm: true,`, acrescente:
```ts
  ganhoEm: true,
  perdidoEm: true,
```

- [ ] **Step 5: Aplicar (`lib/escale/filtros/aplicar.ts`)**

5a. Logo DEPOIS da função `diaLocal`, acrescente:

```ts
/** O dia local de `iso` está no período? Sem período, passa; com período e sem data, não passa. */
function noPeriodo(iso: string | null, p: { de?: string; ate?: string } | undefined): boolean {
  if (!p) return true;
  if (!iso) return false;
  const dia = diaLocal(iso);
  return !(p.de && dia < p.de) && !(p.ate && dia > p.ate);
}
```

5b. Em `aplicarFiltrosDoQuadro`, apague a linha `  const criadoEm = f.criadoEm;` e troque o bloco:

```ts
    if (criadoEm) {
      const dia = diaLocal(l.created_at);
      if ((criadoEm.de && dia < criadoEm.de) || (criadoEm.ate && dia > criadoEm.ate)) return false;
    }
```
por:
```ts
    if (!noPeriodo(l.created_at, f.criadoEm)) return false;
    // FORK ESCALE · Casca V4: ganho e perda pelo dia do fechamento, só dos negócios nesse status.
    if (f.ganhoEm && !(l.status === "won" && noPeriodo(l.closed_at, f.ganhoEm))) return false;
    if (f.perdidoEm && !(l.status === "lost" && noPeriodo(l.closed_at, f.perdidoEm))) return false;
```

- [ ] **Step 6: O período (`lib/escale/filtros/periodo.ts`)**

Create `lib/escale/filtros/periodo.ts`:

```ts
import { enxugar, normalizarStatus, type FiltrosDoQuadro, type StatusDoNegocio } from "./tipos";

/**
 * O FILTRO "DATA" DA CLINT (fork Escale, Casca V4; print do usuário de 15/10,
 * `docs/escale/clint/prints-do-usuario/2026-10-15-filtro-data-aberto.png`).
 *
 * Um período por vez, do tipo da aba do calendário: criação (`criadoEm`), ganho
 * (`ganhoEm`) e perda (`perdidoEm`). O quarto tipo da Clint (a aba do relógio,
 * `scheduled_at` no bundle) não tem equivalente nosso: a aba fica desligada.
 *
 * A forma é a mesma de `Periodo` (`components/escale/ui/CalendarioDePeriodo`),
 * escrita aqui para a regra continuar pura e testável sem tela.
 */
export type TipoDoPeriodo = "criacao" | "ganho" | "perda" | "agendado";

export interface PeriodoDoFiltro {
  tipo: TipoDoPeriodo;
  /** AAAA-MM-DD */
  de?: string;
  /** AAAA-MM-DD */
  ate?: string;
}

export const TIPOS_DE_DATA_DISPONIVEIS = ["criacao", "ganho", "perda"] as const satisfies readonly TipoDoPeriodo[];
type TipoDisponivel = (typeof TIPOS_DE_DATA_DISPONIVEIS)[number];

const disponivel = (tipo: TipoDoPeriodo): tipo is TipoDisponivel =>
  (TIPOS_DE_DATA_DISPONIVEIS as readonly string[]).includes(tipo);

/** Ganho e perda só existem com o status deles no quadro (decisão D3). */
const STATUS_DO_TIPO: Partial<Record<TipoDisponivel, StatusDoNegocio>> = { ganho: "won", perda: "lost" };

function diasDe(f: FiltrosDoQuadro, tipo: TipoDisponivel): { de?: string; ate?: string } | undefined {
  if (tipo === "criacao") return f.criadoEm;
  if (tipo === "ganho") return f.ganhoEm;
  return f.perdidoEm;
}

/** O período aplicado agora, ou `null` quando o Data não filtra nada. */
export function periodoDosFiltros(f: FiltrosDoQuadro): PeriodoDoFiltro | null {
  for (const tipo of TIPOS_DE_DATA_DISPONIVEIS) {
    const p = diasDe(f, tipo);
    if (p && (p.de || p.ate)) return { tipo, ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) };
  }
  return null;
}

/**
 * Os filtros com o período `p` no lugar de qualquer outro. Sem datas (ou com o
 * tipo desligado), o Data sai. Ganho e perda acrescentam o status deles.
 */
export function comPeriodo(f: FiltrosDoQuadro, p: PeriodoDoFiltro): FiltrosDoQuadro {
  const semData: Partial<FiltrosDoQuadro> = { ...f };
  delete semData.criadoEm;
  delete semData.ganhoEm;
  delete semData.perdidoEm;
  if (!disponivel(p.tipo) || (!p.de && !p.ate)) return enxugar({ ...semData, status: f.status });
  const dias = { ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) };
  const pedido = STATUS_DO_TIPO[p.tipo];
  const proximo: FiltrosDoQuadro = { ...semData, status: pedido ? normalizarStatus([...f.status, pedido]) : f.status };
  if (p.tipo === "criacao") proximo.criadoEm = dias;
  else if (p.tipo === "ganho") proximo.ganhoEm = dias;
  else proximo.perdidoEm = dias;
  return enxugar(proximo);
}

/** "15/10/2026" → "2026-10-15". Texto que não é uma data de verdade → `null`. */
export function isoDaDataBr(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const dd = m[1]!;
  const mm = m[2]!;
  const aaaa = m[3]!;
  const d = new Date(Number(aaaa), Number(mm) - 1, Number(dd));
  if (d.getFullYear() !== Number(aaaa) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) return null;
  return `${aaaa}-${mm}-${dd}`;
}

/** "2026-10-15" → "15/10/2026"; vazio ou fora do formato → "". */
export function dataBrDoIso(iso: string | undefined): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  return m ? `${m[3]!}/${m[2]!}/${m[1]!}` : "";
}
```

- [ ] **Step 7: Rodar a task e os testes da 1D que tocam os mesmos arquivos**

```bash
corepack pnpm vitest run tests/unit/escale-filtro-de-data.test.ts tests/unit/escale-filtros-tipos-e-url.test.ts tests/unit/escale-filtros-aplicar.test.ts tests/unit/escale-filtros-salvos-menu.test.tsx
```
Expected: PASS em todos (o `COMPLETO` da 1D não tem ganho nem perda, então as contagens dela não mudam).

- [ ] **Step 8: Typecheck, lint, prettier e commit**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint lib/escale/filtros/periodo.ts lib/escale/filtros/tipos.ts lib/escale/filtros/url.ts lib/escale/filtros/aplicar.ts tests/unit/escale-filtro-de-data.test.ts
corepack pnpm exec prettier --write lib/escale/filtros/periodo.ts tests/unit/escale-filtro-de-data.test.ts
git add lib/escale/filtros/periodo.ts lib/escale/filtros/tipos.ts lib/escale/filtros/url.ts lib/escale/filtros/aplicar.ts tests/unit/escale-filtro-de-data.test.ts
git commit -m "feat(escale): filtro Data por criação, ganho e perda

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A foto do contato no quadro

**Files:**
- Modify: `lib/escale/filtros/dados-do-quadro.ts`, `lib/escale/filtros/ler-dados-do-quadro.ts`, `tests/helpers/negocio-do-quadro.ts`, `tests/unit/escale-dados-dos-filtros.test.ts`, `tests/unit/escale-dados-dos-filtros-na-rota.test.ts`

**Interfaces:**
- Consumes: a etapa `comDadosDosFiltros` (1D) e a rota existente `GET /api/v1/contacts/{id}/avatar`.
- Produces: `DadosDeFiltroDoNegocio.contato_tem_foto: boolean`. É `true` só com contato, com `avatar_storage_path` e sem anonimização. A rota do quadro NÃO muda de arquivo: a leitura da etapa do fork é que pede uma coluna a mais.

- [ ] **Step 1: Os testes (vão falhar)**

Em `tests/unit/escale-dados-dos-filtros.test.ts`, dentro do `describe("anexarDadosDosFiltros", …)`, acrescente no fim:

```ts
  it("foto: só contato com arquivo e não anonimizado tem foto (a tela pede pela rota do avatar)", () => {
    const leads = anexarDadosDosFiltros(
      [
        negocio("com", { contact_id: "c1" }),
        negocio("sem-arquivo", { contact_id: "c2" }),
        negocio("anonimizado", { contact_id: "c3" }),
        negocio("sem-contato"),
      ],
      {
        concluidas: [],
        conversas: [],
        contatos: [
          { id: "c1", name: "Ana", display_name: null, is_anonymized: false, avatar_storage_path: "org-1/avatars/c1.jpg" },
          { id: "c2", name: "Bia", display_name: null, is_anonymized: false, avatar_storage_path: null },
          { id: "c3", name: "Cris", display_name: null, is_anonymized: true, avatar_storage_path: "org-1/avatars/c3.jpg" },
        ],
      },
    );
    expect(leads.map((l) => dadosDeFiltro(l)?.contato_tem_foto)).toEqual([true, false, false, false]);
  });
```

Em `tests/unit/escale-dados-dos-filtros-na-rota.test.ts`, no primeiro caso, troque o `toEqual` de `dadosDeFiltro(r.leads[0]!)` por:

```ts
    expect(dadosDeFiltro(r.leads[0]!)).toEqual({
      atividades_concluidas: 2,
      contato_nome: "Ana",
      contato_tem_foto: false,
      conversa: { status: "open", canal: "whatsapp", atendente_id: null, ultima_entrada: null, ultima_saida: null },
    });
```

e acrescente um caso novo no mesmo `describe("comDadosDosFiltros", …)`:

```ts
  it("lê o caminho da foto junto com o nome, para dizer se há foto", async () => {
    const { client } = clienteFalso(
      { contacts: [{ id: "c1", name: "Ana", display_name: null, is_anonymized: false, avatar_storage_path: "org-1/avatars/c1.jpg" }] },
      { data: [], error: null },
    );
    const r = await comDadosDosFiltros(client, "org-1", [negocio("a", { contact_id: "c1" })]);
    expect(dadosDeFiltro(r.leads[0]!)?.contato_tem_foto).toBe(true);
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-dados-dos-filtros.test.ts tests/unit/escale-dados-dos-filtros-na-rota.test.ts
```
Expected: FAIL (`contato_tem_foto` é `undefined`).

- [ ] **Step 3: O dado (`lib/escale/filtros/dados-do-quadro.ts`)**

3a. Em `DadosDeFiltroDoNegocio`, logo DEPOIS de `  contato_nome: string | null;`, acrescente:

```ts
  /**
   * FORK ESCALE · Casca V4: o contato tem foto. A tela pede a imagem pela rota
   * `GET /api/v1/contacts/{id}/avatar` (URL assinada curta, cache privado, nunca
   * para anonimizado): assinar aqui expiraria com o quadro aberto.
   */
  contato_tem_foto: boolean;
```

3b. Em `LinhasDosFiltros.contatos`, troque o tipo da linha por:

```ts
  contatos: ReadonlyArray<{
    id: string;
    name: string | null;
    display_name: string | null;
    is_anonymized: boolean | null;
    avatar_storage_path?: string | null;
  }>;
```

3c. Em `anexarDadosDosFiltros`, logo DEPOIS da linha que monta `nomes`, acrescente:

```ts
  const comFoto = new Set(linhas.contatos.filter((c) => !c.is_anonymized && c.avatar_storage_path).map((c) => c.id));
```

e, no objeto `filtros_escale`, logo DEPOIS da linha `contato_nome: …`, acrescente:

```ts
        contato_tem_foto: lead.contact_id ? comFoto.has(lead.contact_id) : false,
```

- [ ] **Step 4: A leitura (`lib/escale/filtros/ler-dados-do-quadro.ts`)**

Troque `.select("id, name, display_name, is_anonymized")` por `.select("id, name, display_name, is_anonymized, avatar_storage_path")`. No comentário do topo, depois de "- o nome do contato;", acrescente a linha "- se o contato tem foto (Casca V4);".

- [ ] **Step 5: O ajudante dos testes (`tests/helpers/negocio-do-quadro.ts`)**

Na última linha da função `negocio`, troque `{ atividades_concluidas: 0, contato_nome: null, conversa: null, ...filtros }` por `{ atividades_concluidas: 0, contato_nome: null, contato_tem_foto: false, conversa: null, ...filtros }`.

- [ ] **Step 6: Rodar**

```bash
corepack pnpm vitest run tests/unit/escale-dados-dos-filtros.test.ts tests/unit/escale-dados-dos-filtros-na-rota.test.ts tests/unit/escale-filtros-aplicar.test.ts tests/unit/escale-filtros-ordenar.test.ts tests/unit/kanban-atalho-conversa.test.tsx tests/unit/funil-mostra-dados-do-cliente.test.tsx
```
Expected: PASS em todos.

- [ ] **Step 7: Typecheck, lint e commit**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint lib/escale/filtros/dados-do-quadro.ts lib/escale/filtros/ler-dados-do-quadro.ts tests/helpers/negocio-do-quadro.ts tests/unit/escale-dados-dos-filtros.test.ts tests/unit/escale-dados-dos-filtros-na-rota.test.ts
git add lib/escale/filtros/dados-do-quadro.ts lib/escale/filtros/ler-dados-do-quadro.ts tests/helpers/negocio-do-quadro.ts tests/unit/escale-dados-dos-filtros.test.ts tests/unit/escale-dados-dos-filtros-na-rota.test.ts
git commit -m "feat(escale): o quadro sabe se o contato tem foto

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: As regras puras da casca (gatilhos, valores, tempo, cores)

**Files:**
- Create: `lib/escale/filtros/gatilhos.ts`, `lib/escale/quadro/aparencia.ts`, `tests/unit/escale-regras-da-casca.test.ts`

**Interfaces:**
- Consumes: `enxugar`, `FiltrosDoQuadro` (1D), `dadosDeFiltro` e `ConversaDoFiltro` (Task 3), `simboloDaMoeda` e `MOEDA_PADRAO` (`@/lib/money`).
- Produces:
  - `gatilhos.ts`: `GATILHOS_DO_QUADRO`, `type GatilhoDoQuadro`, `contarPorGatilho(f): Record<GatilhoDoQuadro, number>`, `limparGatilho(f, g): FiltrosDoQuadro`;
  - `aparencia.ts`: `partesDaContagem(modelo, n)`, `valorCurto(cents, moeda)`, `totalDaColuna(leads)`, `idadeNaEtapa(horas)`, `dataDaMensagem(iso, agora?)`, `corDoAvatar(id)`, `inicialDoNome(nome)`, `coresDaTag(cor)`, `tituloDoCard(lead)`, `atividadesDoCard(lead)`, `ultimaFoiDaEquipe(c)`, `fotoDoContato(lead)`.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-regras-da-casca.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { contarPorGatilho, limparGatilho } from "@/lib/escale/filtros/gatilhos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import {
  atividadesDoCard,
  coresDaTag,
  corDoAvatar,
  dataDaMensagem,
  fotoDoContato,
  idadeNaEtapa,
  inicialDoNome,
  partesDaContagem,
  tituloDoCard,
  totalDaColuna,
  ultimaFoiDaEquipe,
  valorCurto,
} from "@/lib/escale/quadro/aparencia";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

const CHEIO: FiltrosDoQuadro = {
  status: ["open", "won"],
  dono: "u-1",
  tags: ["vip", "quente"],
  modoDasTags: "ou",
  criadoEm: { de: "2026-10-01" },
  campos: [{ alvo: "negocio", chave: "cidade", op: "contem", valor: "Natal" }],
  conversa: { naoLidas: true, canais: ["whatsapp"] },
  valor: { min: 100 },
  atrasados: true,
  tempoNaEtapa: { min: 2, unidade: "dias" },
  ordem: [{ campo: "negocio.valor", direcao: "desc" }],
};

describe("os gatilhos da barra da Clint", () => {
  it("cada gatilho conta o que é dele; o Status conta os status escolhidos", () => {
    expect(contarPorGatilho(CHEIO)).toEqual({ data: 1, campos: 1, tags: 2, dono: 1, status: 2, mais: 5 });
    expect(contarPorGatilho({ status: ["open"] })).toEqual({ data: 0, campos: 0, tags: 0, dono: 0, status: 1, mais: 0 });
    expect(contarPorGatilho({ status: ["lost"], perdidoEm: { ate: "2026-10-31" } }).data).toBe(1);
  });

  it("limpar um gatilho tira só o dele e mantém status, busca e ordenação", () => {
    const semMais = limparGatilho({ ...CHEIO, busca: "ana" }, "mais");
    expect(semMais.conversa).toBeUndefined();
    expect(semMais.valor).toBeUndefined();
    expect(semMais.atrasados).toBeUndefined();
    expect(semMais.tempoNaEtapa).toBeUndefined();
    expect(semMais.tags).toEqual(["vip", "quente"]);
    expect(semMais.busca).toBe("ana");
    expect(semMais.ordem).toEqual(CHEIO.ordem);
    expect(limparGatilho(CHEIO, "tags").modoDasTags).toBeUndefined();
    expect(limparGatilho(CHEIO, "data").criadoEm).toBeUndefined();
    expect(limparGatilho(CHEIO, "dono").dono).toBeUndefined();
    expect(limparGatilho(CHEIO, "campos").campos).toBeUndefined();
  });
});

describe("a contagem do quadro", () => {
  it("separa o texto em volta do 'Negócio' em negrito", () => {
    expect(partesDaContagem("{n} oportunidades de {negocio}", 21)).toEqual({ antes: "21 oportunidades de ", depois: "" });
    expect(partesDaContagem("{n} oportunidad de {negocio}", 1)).toEqual({ antes: "1 oportunidad de ", depois: "" });
  });
});

describe("valores como a Clint escreve", () => {
  it("o card: sem espaço, sem centavos, k e M com uma casa", () => {
    expect(valorCurto(null, null)).toBe("R$0");
    expect(valorCurto(95_000, "BRL")).toBe("R$950");
    expect(valorCurto(6_480_000, "BRL")).toBe("R$64,8k");
    expect(valorCurto(100_000, "BRL")).toBe("R$1k");
    expect(valorCurto(120_000_000, "BRL")).toBe("R$1,2M");
  });

  it("o total da coluna: R$0 sem valor (nunca 'undefined'), milhar com ponto, moedas lado a lado", () => {
    expect(totalDaColuna([])).toBe("R$0");
    expect(totalDaColuna([{ value_cents: null, currency: null }])).toBe("R$0");
    expect(totalDaColuna([{ value_cents: 1_000_000, currency: "BRL" }, { value_cents: 250_000, currency: null }])).toBe("R$12.500");
    expect(totalDaColuna([{ value_cents: 100_000, currency: "USD" }, { value_cents: 100_000, currency: "BRL" }])).toMatch(/^R\$1\.000 \+ .*1\.000$/);
  });
});

describe("tempo e datas do card", () => {
  it("tempo na etapa: horas até 47h, depois dias", () => {
    expect(idadeNaEtapa(null)).toBe("");
    expect(idadeNaEtapa(0.4)).toBe("0h");
    expect(idadeNaEtapa(31.9)).toBe("31h");
    expect(idadeNaEtapa(47)).toBe("47h");
    expect(idadeNaEtapa(48)).toBe("2d");
    expect(idadeNaEtapa(24 * 19 + 5)).toBe("19d");
  });

  it("data da última mensagem: hora quando é hoje, dd/mm nos outros dias", () => {
    const agora = new Date(2026, 9, 15, 18, 0);
    expect(dataDaMensagem(new Date(2026, 9, 15, 10, 31).toISOString(), agora)).toBe("10:31");
    expect(dataDaMensagem(new Date(2026, 8, 23, 9, 0).toISOString(), agora)).toBe("23/09");
    expect(dataDaMensagem(null, agora)).toBe("");
  });
});

describe("avatares e tags", () => {
  it("a cor do avatar é sempre a mesma para a mesma pessoa, e a inicial é maiúscula", () => {
    expect(corDoAvatar("u-1")).toBe(corDoAvatar("u-1"));
    expect(corDoAvatar("u-1")).toMatch(/^#[0-9A-F]{6}$/);
    expect(inicialDoNome("  ivone ")).toBe("I");
    expect(inicialDoNome(null)).toBe("?");
  });

  it("os 8 tons das nossas etiquetas viram a paleta da Clint; sem cor é o azul padrão", () => {
    expect(coresDaTag("#cf3716")).toEqual({ fundo: "#FFAAA3", texto: "#F44336" });
    expect(coresDaTag("#3E63DD")).toEqual({ fundo: "#B3BEFF", texto: "#3F51B5" });
    expect(coresDaTag(null)).toEqual({ fundo: "#91CEFF", texto: "#2196F3" });
  });
});

describe("o que o card mostra", () => {
  it("o título é o nome do contato; sem nome, o título do negócio", () => {
    expect(tituloDoCard(negocio("a", { title: "+5511999990000" }, { contato_nome: "Reinaldo Fernandes" }))).toBe("Reinaldo Fernandes");
    expect(tituloDoCard(negocio("b", { title: "Projeto X" }, { contato_nome: null }))).toBe("Projeto X");
    expect(tituloDoCard(negocio("c", { title: "Sem dados" }))).toBe("Sem dados");
  });

  it("atividades: concluídas sobre o total (concluídas + abertas)", () => {
    expect(atividadesDoCard(negocio("a", { tarefas: { abertas: 3, atrasadas: 1 } }, { atividades_concluidas: 2 }))).toEqual({
      concluidas: 2,
      total: 5,
      atrasadas: 1,
    });
    expect(atividadesDoCard(negocio("b"))).toEqual({ concluidas: 0, total: 0, atrasadas: 0 });
  });

  it("✓✓ só quando a última mensagem é da equipe", () => {
    const base = { status: "open", canal: "whatsapp", atendente_id: null };
    expect(ultimaFoiDaEquipe({ ...base, ultima_entrada: "2026-10-15T10:00:00Z", ultima_saida: "2026-10-15T11:00:00Z" })).toBe(true);
    expect(ultimaFoiDaEquipe({ ...base, ultima_entrada: "2026-10-15T12:00:00Z", ultima_saida: "2026-10-15T11:00:00Z" })).toBe(false);
    expect(ultimaFoiDaEquipe({ ...base, ultima_entrada: null, ultima_saida: null })).toBe(false);
    expect(ultimaFoiDaEquipe(null)).toBe(false);
  });

  it("a foto vem da rota do avatar, só quando o contato tem foto", () => {
    expect(fotoDoContato(negocio("a", { contact_id: "c1" }, { contato_tem_foto: true }))).toBe("/api/v1/contacts/c1/avatar");
    expect(fotoDoContato(negocio("b", { contact_id: "c1" }, { contato_tem_foto: false }))).toBeNull();
    expect(fotoDoContato(negocio("c"))).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-regras-da-casca.test.ts
```
Expected: FAIL (`Cannot find module '@/lib/escale/filtros/gatilhos'`).

- [ ] **Step 3: Os gatilhos (`lib/escale/filtros/gatilhos.ts`)**

```ts
import { enxugar, type FiltrosDoQuadro } from "./tipos";

/**
 * OS SEIS GATILHOS DA BARRA DA CLINT (fork Escale, Casca V4; print da barra de
 * 15/10): Data, Campos, Tags, Dono do negócio, Status e Mais filtros. Cada um
 * mostra no selo quantos critérios tem (D4). "Mais filtros" junta o que a Clint
 * superior não mostra solto: conversa, valor, atrasados, perda, atividades e tempo.
 */
export const GATILHOS_DO_QUADRO = ["data", "campos", "tags", "dono", "status", "mais"] as const;
export type GatilhoDoQuadro = (typeof GATILHOS_DO_QUADRO)[number];

const DO_MAIS = [
  "valor",
  "atrasados",
  "motivoDePerda",
  "categoriaDePerda",
  "atividadesConcluidas",
  "tempoNaEtapa",
  "tempoDesdeEntrada",
] as const satisfies ReadonlyArray<keyof FiltrosDoQuadro>;

const CHAVES: Record<Exclude<GatilhoDoQuadro, "status">, ReadonlyArray<keyof FiltrosDoQuadro>> = {
  data: ["criadoEm", "ganhoEm", "perdidoEm"],
  campos: ["campos"],
  tags: ["tags", "modoDasTags"],
  dono: ["dono"],
  mais: ["conversa", ...DO_MAIS],
};

export function contarPorGatilho(f: FiltrosDoQuadro): Record<GatilhoDoQuadro, number> {
  const e = enxugar(f);
  return {
    data: e.criadoEm || e.ganhoEm || e.perdidoEm ? 1 : 0,
    campos: e.campos?.length ?? 0,
    tags: e.tags?.length ?? 0,
    dono: e.dono ? 1 : 0,
    status: e.status.length,
    mais: (e.conversa ? Object.keys(e.conversa).length : 0) + DO_MAIS.filter((k) => e[k] !== undefined).length,
  };
}

/** Tira os critérios de um gatilho. Status, busca e ordenação têm controle próprio e ficam. */
export function limparGatilho(f: FiltrosDoQuadro, g: Exclude<GatilhoDoQuadro, "status">): FiltrosDoQuadro {
  const copia: Partial<FiltrosDoQuadro> = { ...f };
  for (const chave of CHAVES[g]) delete copia[chave];
  return enxugar({ ...copia, status: f.status });
}
```

- [ ] **Step 4: A aparência (`lib/escale/quadro/aparencia.ts`)**

```ts
import { dadosDeFiltro, type ConversaDoFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import { MOEDA_PADRAO, simboloDaMoeda } from "@/lib/money";
import type { Lead } from "@/lib/types/leads";

/**
 * AS REGRAS DO QUE O QUADRO DA CASCA ESCREVE (fork Escale, Casca V4; 01-010,
 * prints de 15/10 e design system §6.10–6.11 em `docs/escale/clint/`). Puras, para
 * o card e a coluna não decidirem formato na tela.
 */

/**
 * O texto da contagem já traduzido (`"{n} oportunidades de {negocio}"`) em duas
 * partes, em volta do "Negócio" em negrito da Clint. Número real e plural (D14).
 */
export function partesDaContagem(modelo: string, n: number): { antes: string; depois: string } {
  const [antes = "", depois = ""] = modelo.replace("{n}", String(n)).split("{negocio}");
  return { antes, depois };
}

function simbolo(moeda: string): string {
  try {
    return simboloDaMoeda(moeda);
  } catch {
    return moeda;
  }
}

const umaCasa = (x: number) => (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, "").replace(".", ",");
const inteiro = (v: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v);

/** O valor do card como a Clint escreve: "R$0", "R$950", "R$64,8k", "R$1,2M" (D12). */
export function valorCurto(cents: number | null | undefined, moeda: string | null | undefined): string {
  const s = simbolo(moeda ?? MOEDA_PADRAO);
  const v = (cents ?? 0) / 100;
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${s}${umaCasa(v / 1_000_000)}M`;
  if (a >= 1_000) return `${s}${umaCasa(v / 1_000)}k`;
  return `${s}${Math.round(v)}`;
}

/**
 * O total da coluna: "R$0" quando ninguém tem valor (a Clint mostra "undefined0":
 * bug que não se copia), "R$12.500" com uma moeda, moedas diferentes lado a lado
 * e nunca somadas (#1531). A moeda padrão vem primeiro.
 */
export function totalDaColuna(leads: ReadonlyArray<Pick<Lead, "value_cents" | "currency">>): string {
  const porMoeda = new Map<string, number>();
  for (const l of leads) {
    if (l.value_cents == null) continue;
    const moeda = l.currency ?? MOEDA_PADRAO;
    porMoeda.set(moeda, (porMoeda.get(moeda) ?? 0) + l.value_cents);
  }
  if (porMoeda.size === 0) return `${simbolo(MOEDA_PADRAO)}0`;
  return [...porMoeda.entries()]
    .sort(([a], [b]) => (a === MOEDA_PADRAO ? -1 : b === MOEDA_PADRAO ? 1 : a.localeCompare(b)))
    .map(([moeda, cents]) => `${simbolo(moeda)}${inteiro(cents / 100)}`)
    .join(" + ");
}

/** Tempo na etapa como nos prints ("31h", "3d"): horas até 47h, depois dias (D11). */
export function idadeNaEtapa(horas: number | null): string {
  if (horas == null) return "";
  const h = Math.max(0, Math.floor(horas));
  return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

const dois = (n: number) => String(n).padStart(2, "0");

/** A data da última mensagem: "10:31" quando é de hoje, "23/09" nos outros dias. */
export function dataDaMensagem(iso: string | null | undefined, agora: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hoje = d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth() && d.getDate() === agora.getDate();
  return hoje ? `${dois(d.getHours())}:${dois(d.getMinutes())}` : `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`;
}

/** Tons Material 700 (os avatares de inicial da Clint: `#7B1FA2`, `#0097A7`), só os que seguram letra branca. */
const MATERIAL_700 = [
  "#D32F2F",
  "#C2185B",
  "#7B1FA2",
  "#512DA8",
  "#303F9F",
  "#1976D2",
  "#0288D1",
  "#0097A7",
  "#00796B",
  "#388E3C",
  "#689F38",
  "#F57C00",
  "#E64A19",
  "#5D4037",
  "#616161",
  "#455A64",
] as const;

/** A cor do avatar de inicial: sempre a mesma para a mesma pessoa. */
export function corDoAvatar(id: string): string {
  let soma = 0;
  for (const ch of id) soma = (soma * 31 + ch.charCodeAt(0)) >>> 0;
  return MATERIAL_700[soma % MATERIAL_700.length]!;
}

export function inicialDoNome(nome: string | null | undefined): string {
  const limpo = (nome ?? "").trim();
  return limpo ? limpo[0]!.toUpperCase() : "?";
}

/** A paleta de chips da Clint (design system §3.4) a partir dos 8 tons das nossas etiquetas (D13). */
const TAG_DA_CLINT: Readonly<Record<string, { fundo: string; texto: string }>> = {
  "#ffe629": { fundo: "#FFF2D1", texto: "#FAA200" },
  "#ffb224": { fundo: "#FFD89E", texto: "#FF9800" },
  "#cf3716": { fundo: "#FFAAA3", texto: "#F44336" },
  "#00655a": { fundo: "#A9FCF5", texto: "#009688" },
  "#0091ff": { fundo: "#91CEFF", texto: "#2196F3" },
  "#3e63dd": { fundo: "#B3BEFF", texto: "#3F51B5" },
  "#ab4aba": { fundo: "#F3A8FF", texto: "#9C27B0" },
  "#6f6f6f": { fundo: "#D1F0FF", texto: "#607D8B" },
};
/** O padrão da Clint para cor desconhecida. */
const TAG_PADRAO = { fundo: "#91CEFF", texto: "#2196F3" } as const;

export function coresDaTag(cor: string | null | undefined): { fundo: string; texto: string } {
  return (cor ? TAG_DA_CLINT[cor.trim().toLowerCase()] : undefined) ?? { ...TAG_PADRAO };
}

/** O nome do card: o do contato; sem ele, o título do negócio (D1). */
export function tituloDoCard(lead: Lead): string {
  return dadosDeFiltro(lead)?.contato_nome?.trim() || lead.title;
}

/** "concluídas/total" do rodapé: total = concluídas + em aberto. */
export function atividadesDoCard(lead: Lead): { concluidas: number; total: number; atrasadas: number } {
  const concluidas = dadosDeFiltro(lead)?.atividades_concluidas ?? 0;
  return { concluidas, total: concluidas + (lead.tarefas?.abertas ?? 0), atrasadas: lead.tarefas?.atrasadas ?? 0 };
}

/** A última mensagem da conversa é da equipe (o ✓✓ da caixa da mensagem)? */
export function ultimaFoiDaEquipe(c: ConversaDoFiltro | null | undefined): boolean {
  if (!c?.ultima_saida) return false;
  const saida = Date.parse(c.ultima_saida);
  const entrada = c.ultima_entrada ? Date.parse(c.ultima_entrada) : Number.NaN;
  return !Number.isNaN(saida) && (Number.isNaN(entrada) || saida >= entrada);
}

/** A foto do contato pela rota que já existe (D2), ou `null`. */
export function fotoDoContato(lead: Lead): string | null {
  return lead.contact_id && dadosDeFiltro(lead)?.contato_tem_foto ? `/api/v1/contacts/${lead.contact_id}/avatar` : null;
}
```

- [ ] **Step 5: Rodar**

```bash
corepack pnpm vitest run tests/unit/escale-regras-da-casca.test.ts
```
Expected: PASS. Se o caso de duas moedas falhar só pelo símbolo do dólar (`US$` ou `$`), o regex já aceita qualquer prefixo antes de `1.000`; se falhar por outra coisa, corrija o código, não o teste.

- [ ] **Step 6: Typecheck, lint, prettier e commit**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint lib/escale/filtros/gatilhos.ts lib/escale/quadro/aparencia.ts tests/unit/escale-regras-da-casca.test.ts
corepack pnpm exec prettier --write lib/escale/filtros/gatilhos.ts lib/escale/quadro/aparencia.ts tests/unit/escale-regras-da-casca.test.ts
git add lib/escale/filtros/gatilhos.ts lib/escale/quadro/aparencia.ts tests/unit/escale-regras-da-casca.test.ts
git commit -m "feat(escale): regras do quadro da casca (gatilhos, valores, tempo, cores)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Os controles da casca nas seções Conversas, Tags e Outros

**Files:**
- Modify (reescrever): `components/escale/filtros/controles.tsx`
- Modify: `components/escale/filtros/SecaoConversas.tsx`, `components/escale/filtros/SecaoTags.tsx`, `components/escale/filtros/SecaoOutros.tsx`, `components/escale/filtros/JanelaDoFiltroSalvo.tsx`
- Create: `tests/unit/escale-secoes-de-filtro.test.tsx`
- Delete: `tests/unit/escale-painel-de-filtros.test.tsx` (os casos dele voltam nos testes das Tasks 5, 6 e 7)

**Interfaces:**
- Consumes: `CaixaDaCasca`, `SeletorDaCasca` (V1); `isoDaDataBr`, `dataBrDoIso` (Task 2).
- Produces:
  - `controles.tsx` exporta `CLASSE_DO_CAMPO`, `CLASSE_DA_LINHA_DO_MENU`, `RotuloDoGrupo`, `CampoNumerico`, `CampoDeTexto`, `CampoDeData` (dd/mm/aaaa) e `alternarNaLista`. `Caixinha` e `classeDoSeletor` deixam de existir;
  - as três seções e a janela do filtro salvo usam só controles da V1.

- [ ] **Step 1: Escrever o teste (vai falhar) e tirar o teste antigo do painel**

```bash
git rm -q tests/unit/escale-painel-de-filtros.test.tsx
```

Create `tests/unit/escale-secoes-de-filtro.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u-ana", full_name: "Ana" }] }),
}));

import { SecaoConversas } from "@/components/escale/filtros/SecaoConversas";
import { SecaoOutros } from "@/components/escale/filtros/SecaoOutros";
import { SecaoTags } from "@/components/escale/filtros/SecaoTags";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

// Polyfills que o Radix exige e o jsdom não tem (mesmo padrão dos testes da 1D).
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const LEADS = [negocio("l1", { tags: ["vip"], contact_tags: ["quente"] })];
const novoUsuario = () => userEvent.setup({ pointerEventsCheck: 0 });

function montar(secao: "conversas" | "tags" | "outros", filtros: FiltrosDoQuadro) {
  const onMudar = vi.fn();
  if (secao === "conversas") render(<SecaoConversas filtros={filtros} onMudar={onMudar} />);
  else if (secao === "tags") render(<SecaoTags filtros={filtros} onMudar={onMudar} leads={LEADS} />);
  else render(<SecaoOutros filtros={filtros} onMudar={onMudar} />);
  return { onMudar, u: novoUsuario() };
}

describe("seções de filtro com os controles da casca (Casca V4)", () => {
  it("Conversas: não lidas pela caixinha e 'Sem conversa' pelo seletor da casca", async () => {
    const { onMudar, u } = montar("conversas", { status: ["open"] });
    await u.click(screen.getByRole("checkbox", { name: "Não lidas" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], conversa: { naoLidas: true } });
    await u.click(screen.getByRole("combobox", { name: "Conversa" }));
    await u.click(screen.getByRole("option", { name: "Sem conversa" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], conversa: { existe: "sem" } });
  });

  it("Conversas com 'sem conversa': os outros critérios somem", () => {
    montar("conversas", { status: ["open"], conversa: { existe: "sem" } });
    expect(screen.queryByRole("checkbox", { name: "Não lidas" })).not.toBeInTheDocument();
  });

  it("Conversas: atendente da equipe pela caixinha", async () => {
    const { onMudar, u } = montar("conversas", { status: ["open"] });
    await u.click(screen.getByRole("checkbox", { name: "Ana" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], conversa: { atendentes: ["u-ana"] } });
  });

  it("Tags: as três caixas do card viram opções, e marcar uma grava a tag", async () => {
    const { onMudar, u } = montar("tags", { status: ["open"] });
    expect(screen.getByRole("checkbox", { name: "quente" })).toBeInTheDocument();
    await u.click(screen.getByRole("checkbox", { name: "vip" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tags: ["vip"] });
  });

  it("Tags com duas escolhidas: o E/OU é um segmentado com papel de rádio", async () => {
    const { onMudar, u } = montar("tags", { status: ["open"], tags: ["vip", "quente"] });
    expect(screen.getByRole("radio", { name: "Todas (E)" })).toHaveAttribute("aria-checked", "true");
    await u.click(screen.getByRole("radio", { name: "Qualquer uma (OU)" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tags: ["vip", "quente"], modoDasTags: "ou" });
  });

  it("Outros: atividades concluídas e a unidade do tempo pelo seletor da casca", async () => {
    const { onMudar, u } = montar("outros", { status: ["open"] });
    await u.type(screen.getByRole("textbox", { name: "Atividades concluídas: Mín." }), "2");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], atividadesConcluidas: { min: 2 } });
    await u.click(screen.getByRole("combobox", { name: "Tempo na etapa: Unidade" }));
    await u.click(screen.getByRole("option", { name: "horas na etapa" }));
    await u.type(screen.getByRole("textbox", { name: "Tempo na etapa: Máx." }), "10");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tempoNaEtapa: { max: 10, unidade: "horas" } });
  });

  it("nenhuma seção usa seleção, data, caixinha ou rádio nativos", () => {
    const filtros: FiltrosDoQuadro = { status: ["open"], tags: ["vip", "quente"], conversa: { naoLidas: true } };
    const onMudar = vi.fn();
    render(
      <>
        <SecaoConversas filtros={filtros} onMudar={onMudar} />
        <SecaoTags filtros={filtros} onMudar={onMudar} leads={LEADS} />
        <SecaoOutros filtros={filtros} onMudar={onMudar} />
      </>,
    );
    expect(document.querySelector('select, input[type="date"], input[type="checkbox"], input[type="radio"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-secoes-de-filtro.test.tsx
```
Expected: FAIL (o seletor ainda é `<select>`, a caixinha é nativa e o E/OU é `type="radio"`).

- [ ] **Step 3: Reescrever `components/escale/filtros/controles.tsx`**

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { numeroDoValor } from "@/lib/escale/filtros/campos";
import { dataBrDoIso, isoDaDataBr } from "@/lib/escale/filtros/periodo";

/**
 * Peças pequenas dos filtros do quadro (fork Escale, Fase 1D; visual da Clint na
 * Casca V4). Nenhuma é controle nativo de seleção, data ou caixinha: caixinha é
 * `CaixaDaCasca`, seleção é `SeletorDaCasca` e data é `CampoDeData` (dd/mm/aaaa).
 *
 * Número, texto e data só valem quando a pessoa TERMINA de digitar (sai do campo
 * ou dá Enter): cada tecla seria uma troca de URL, e "1," no meio do caminho seria
 * lido como 1. Quem usa dá `key` com o valor de fora, para "Limpar" refletir aqui.
 */

/** O campo da Clint (design system §6.7): fundo claro, sem borda aparente, 32px, raio 4px; foco na cor da marca. */
export const CLASSE_DO_CAMPO =
  "h-8 w-full rounded-[4px] border border-transparent bg-casca-busca px-2.5 text-xs text-casca-texto outline-hidden placeholder:text-casca-meta focus:border-casca-marca focus:bg-surface";

/** Item de menu da Clint (design system §6.5): 11px, 34px de altura, destaque no tom claro da marca. */
export const CLASSE_DA_LINHA_DO_MENU =
  "flex h-[34px] w-full items-center gap-2 rounded-[2px] px-3 text-left text-[11px] text-casca-texto hover:bg-casca-marca-suave hover:text-casca-marca disabled:cursor-default disabled:text-casca-meta disabled:hover:bg-transparent";

/** O rótulo de grupo da Clint ("DONO DO NEGÓCIO"): 11px, 600, maiúsculas, espaçado. */
export function RotuloDoGrupo({ children, ajuda }: { children: ReactNode; ajuda?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold tracking-[0.6px] text-casca-suave uppercase">{children}</p>
      {ajuda ? <p className="text-[11px] text-casca-meta">{ajuda}</p> : null}
    </div>
  );
}

export function CampoNumerico({
  rotulo,
  dica,
  valor,
  onMudar,
}: {
  rotulo: string;
  dica?: string;
  valor: number | undefined;
  onMudar: (valor: number | undefined) => void;
}) {
  const [texto, setTexto] = useState(valor === undefined ? "" : String(valor));
  function confirmar() {
    if (texto.trim() === "") {
      if (valor !== undefined) onMudar(undefined);
      return;
    }
    const n = numeroDoValor(texto);
    if (n !== null && n >= 0) {
      if (n !== valor) onMudar(n);
      return;
    }
    setTexto(valor === undefined ? "" : String(valor));
  }
  return (
    <input
      aria-label={rotulo}
      placeholder={dica ?? rotulo}
      inputMode="decimal"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
      }}
      className={CLASSE_DO_CAMPO}
    />
  );
}

export function CampoDeTexto({
  rotulo,
  valor,
  onMudar,
}: {
  rotulo: string;
  valor: string | undefined;
  onMudar: (valor: string | undefined) => void;
}) {
  const [texto, setTexto] = useState(valor ?? "");
  function confirmar() {
    const limpo = texto.trim() || undefined;
    if (limpo !== valor) onMudar(limpo);
  }
  return (
    <input
      aria-label={rotulo}
      placeholder={rotulo}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
      }}
      className={CLASSE_DO_CAMPO}
    />
  );
}

/**
 * Uma data digitada em dd/mm/aaaa (o formato da Clint), guardada como AAAA-MM-DD.
 * Data que não existe ("31/02/2026") volta ao valor de antes, sem trocar a URL.
 */
export function CampoDeData({
  rotulo,
  valor,
  onMudar,
}: {
  rotulo: string;
  valor: string | undefined;
  onMudar: (iso: string | undefined) => void;
}) {
  const t = useT();
  const [texto, setTexto] = useState(dataBrDoIso(valor));
  function confirmar() {
    if (texto.trim() === "") {
      if (valor !== undefined) onMudar(undefined);
      return;
    }
    const iso = isoDaDataBr(texto);
    if (iso) {
      if (iso !== valor) onMudar(iso);
      return;
    }
    setTexto(dataBrDoIso(valor));
  }
  return (
    <input
      aria-label={rotulo}
      placeholder={t("dd/mm/aaaa")}
      inputMode="numeric"
      maxLength={10}
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
      }}
      className={CLASSE_DO_CAMPO}
    />
  );
}

/** Marca ou desmarca `valor`; a lista vazia vira `undefined` (filtro desligado). */
export function alternarNaLista<T>(lista: readonly T[] | undefined, valor: T): T[] | undefined {
  const atual = lista ?? [];
  const proxima = atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
  return proxima.length > 0 ? proxima : undefined;
}
```

- [ ] **Step 4: `components/escale/filtros/SecaoConversas.tsx`**

Troque o arquivo inteiro por:

```tsx
"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import {
  SEM_ATENDENTE,
  type CanalDaConversa,
  type FiltroDeConversa,
  type FiltrosDoQuadro,
} from "@/lib/escale/filtros/tipos";

import { RotuloDoGrupo, alternarNaLista } from "./controles";

/** Nomes de marca: iguais em todo idioma. */
const CANAIS: ReadonlyArray<{ valor: CanalDaConversa; nome: string }> = [
  { valor: "whatsapp", nome: "WhatsApp" },
  { valor: "instagram", nome: "Instagram" },
  { valor: "facebook", nome: "Facebook" },
];

type Existe = "" | "com" | "sem";

/**
 * Conversas (Clint: "Conversas", dentro de "Mais filtros" na Casca V4): com ou
 * sem conversa, não lidas, não respondidas, status, canal e atendente. Olha a
 * conversa MAIS RECENTE do contato — a mesma que o card mostra.
 */
export function SecaoConversas({
  filtros,
  onMudar,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
}) {
  const t = useT();
  const { data: membros } = useAssignableMembers(true);
  const c = filtros.conversa ?? {};
  const mudar = (parcial: Partial<FiltroDeConversa>) => onMudar({ ...filtros, conversa: { ...c, ...parcial } });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <RotuloDoGrupo>{t("Conversa")}</RotuloDoGrupo>
        <SeletorDaCasca<Existe>
          aria-label={t("Conversa")}
          valor={c.existe ?? ""}
          opcoes={[
            { valor: "", rotulo: t("Com ou sem conversa") },
            { valor: "com", rotulo: t("Com conversa") },
            { valor: "sem", rotulo: t("Sem conversa") },
          ]}
          aoMudar={(v) => mudar({ existe: v === "com" || v === "sem" ? v : undefined })}
        />
      </div>

      {c.existe === "sem" ? null : (
        <>
          <div className="space-y-2">
            <CaixaDaCasca marcada={!!c.naoLidas} aoMudar={(m) => mudar({ naoLidas: m || undefined })} rotulo={t("Não lidas")} />
            <CaixaDaCasca
              marcada={!!c.semResposta}
              aoMudar={(m) => mudar({ semResposta: m || undefined })}
              rotulo={t("Não respondidas pelo atendente")}
            />
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Status da conversa")}</RotuloDoGrupo>
            <CaixaDaCasca
              marcada={!!c.situacao?.includes("aberta")}
              aoMudar={() => mudar({ situacao: alternarNaLista(c.situacao, "aberta") })}
              rotulo={t("Aberta")}
            />
            <CaixaDaCasca
              marcada={!!c.situacao?.includes("encerrada")}
              aoMudar={() => mudar({ situacao: alternarNaLista(c.situacao, "encerrada") })}
              rotulo={t("Encerrada")}
            />
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Canais")}</RotuloDoGrupo>
            {CANAIS.map((canal) => (
              <CaixaDaCasca
                key={canal.valor}
                marcada={!!c.canais?.includes(canal.valor)}
                aoMudar={() => mudar({ canais: alternarNaLista(c.canais, canal.valor) })}
                rotulo={canal.nome}
              />
            ))}
          </div>
          <div className="space-y-2">
            <RotuloDoGrupo>{t("Atendentes")}</RotuloDoGrupo>
            <CaixaDaCasca
              marcada={!!c.atendentes?.includes(SEM_ATENDENTE)}
              aoMudar={() => mudar({ atendentes: alternarNaLista(c.atendentes, SEM_ATENDENTE) })}
              rotulo={t("Não atribuídos")}
            />
            {(membros ?? []).map((m) => (
              <CaixaDaCasca
                key={m.user_id}
                marcada={!!c.atendentes?.includes(m.user_id)}
                aoMudar={() => mudar({ atendentes: alternarNaLista(c.atendentes, m.user_id) })}
                rotulo={m.full_name ?? t("Sem nome")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `components/escale/filtros/SecaoTags.tsx`**

Troque o arquivo inteiro por:

```tsx
"use client";
import { useMemo, type ReactNode } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PontoDaEtiqueta } from "@/components/tags/PontoDaEtiqueta";
import { useT } from "@/hooks/i18n/useT";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { marcadoresDoCard } from "@/lib/kanban/marcadores-do-card";
import type { Lead } from "@/lib/types/leads";
import { cn } from "@/lib/utils";

import { alternarNaLista } from "./controles";

/**
 * Tags: as TRÊS caixas do card (negócio, contato e conversa), a mesma régua de
 * quem filtra (`applyFilters`). Com duas ou mais escolhidas, E ou OU. O conteúdo
 * do gatilho "Tags" na variante superior não tem print (PRINT 26): esta é a
 * lógica da 1D com o visual da Clint.
 */
export function SecaoTags({
  filtros,
  onMudar,
  leads,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  leads: readonly Lead[];
}) {
  const t = useT();
  const opcoes = useMemo(
    () => [...new Set(leads.flatMap((l) => marcadoresDoCard(l)))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [leads],
  );
  const escolhidas = filtros.tags ?? [];

  if (opcoes.length === 0) {
    return <p className="text-xs text-casca-suave">{t("Nenhuma tag nos negócios deste quadro.")}</p>;
  }

  return (
    <div className="space-y-3">
      {escolhidas.length > 1 ? (
        <div role="radiogroup" aria-label={t("Como juntar as tags")} className="flex gap-1">
          <BotaoDoModo marcado={filtros.modoDasTags !== "ou"} onClick={() => onMudar({ ...filtros, modoDasTags: undefined })}>
            {t("Todas (E)")}
          </BotaoDoModo>
          <BotaoDoModo marcado={filtros.modoDasTags === "ou"} onClick={() => onMudar({ ...filtros, modoDasTags: "ou" })}>
            {t("Qualquer uma (OU)")}
          </BotaoDoModo>
        </div>
      ) : null}
      <div className="max-h-56 space-y-2 overflow-y-auto">
        {opcoes.map((tag) => (
          <div key={tag} className="flex items-center gap-2">
            <CaixaDaCasca
              marcada={escolhidas.includes(tag)}
              aoMudar={() => onMudar({ ...filtros, tags: alternarNaLista(filtros.tags, tag) })}
              rotulo={tag}
            />
            <PontoDaEtiqueta tag={tag} className="ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Um lado do E/OU, no segmentado das abas do Data da Clint: escuro quando marcado. */
function BotaoDoModo({ marcado, onClick, children }: { marcado: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcado}
      onClick={onClick}
      className={cn(
        "h-7 rounded-casca-gatilho px-2.5 text-[11px] font-medium",
        marcado ? "bg-casca-escuro text-white" : "bg-casca-raia text-casca-texto-2",
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 6: `components/escale/filtros/SecaoOutros.tsx`**

6a. Troque a linha `import { CampoNumerico, RotuloDoGrupo, classeDoSeletor } from "./controles";` por `import { CampoNumerico, RotuloDoGrupo } from "./controles";` e acrescente, no bloco dos imports `@/` (logo antes de `import { useT } …`):

```tsx
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
```

6b. Em `BlocoDeTempo`, troque o `<select …>…</select>` inteiro por:

```tsx
      <SeletorDaCasca<UnidadeDeTempo>
        aria-label={`${titulo}: ${t("Unidade")}`}
        valor={unidade}
        opcoes={[
          { valor: "dias", rotulo: rotulos.dias },
          { valor: "horas", rotulo: rotulos.horas },
        ]}
        aoMudar={(v) => onUnidade(v === "horas" ? "horas" : "dias")}
      />
```

- [ ] **Step 7: `components/escale/filtros/JanelaDoFiltroSalvo.tsx`**

Apague `import { Caixinha } from "./controles";` e acrescente, no bloco dos imports `@/`, `import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";`. Troque:

```tsx
        <Caixinha marcada={compartilhado} onMudar={setCompartilhado}>
          {alvo.tipo === "origem" ? t("Compartilhar com quem vê esta origem") : t("Compartilhar com quem vê esta visualização")}
        </Caixinha>
```
por:
```tsx
        <CaixaDaCasca
          marcada={compartilhado}
          aoMudar={setCompartilhado}
          rotulo={alvo.tipo === "origem" ? t("Compartilhar com quem vê esta origem") : t("Compartilhar com quem vê esta visualização")}
        />
```

- [ ] **Step 8: Rodar**

```bash
corepack pnpm vitest run tests/unit/escale-secoes-de-filtro.test.tsx tests/unit/escale-filtros-salvos-menu.test.tsx
```
Expected: PASS nos dois (o teste dos filtros salvos marca "Compartilhar com quem vê esta origem" por `role="checkbox"`, que a `CaixaDaCasca` tem).

`SecaoNegocio`, `SecaoCampos` e `OrdenarCards` ainda importam `Caixinha`/`classeDoSeletor` e só voltam a compilar na Task 6. Por isso o typecheck desta task fica para a Task 6.

- [ ] **Step 9: Lint, prettier e commit**

```bash
corepack pnpm exec eslint components/escale/filtros/controles.tsx components/escale/filtros/SecaoConversas.tsx components/escale/filtros/SecaoTags.tsx components/escale/filtros/SecaoOutros.tsx components/escale/filtros/JanelaDoFiltroSalvo.tsx tests/unit/escale-secoes-de-filtro.test.tsx
corepack pnpm exec prettier --write components/escale/filtros/controles.tsx components/escale/filtros/SecaoConversas.tsx components/escale/filtros/SecaoTags.tsx components/escale/filtros/SecaoOutros.tsx components/escale/filtros/JanelaDoFiltroSalvo.tsx tests/unit/escale-secoes-de-filtro.test.tsx
git add -A components/escale/filtros tests/unit/escale-secoes-de-filtro.test.tsx tests/unit/escale-painel-de-filtros.test.tsx
git commit -m "feat(escale): controles da casca em Conversas, Tags e Outros

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Campos, Dono, Negócio, Ordenar e Filtros salvos com os controles da casca

**Files:**
- Modify: `components/escale/filtros/SecaoCampos.tsx`, `components/escale/filtros/SecaoNegocio.tsx`, `components/escale/filtros/OrdenarCards.tsx`, `components/escale/filtros/MenuDeFiltrosSalvos.tsx`
- Create: `components/escale/filtros/SecaoDono.tsx`, `tests/unit/escale-secoes-campos-dono-negocio.test.tsx`

**Interfaces:**
- Consumes: Task 5 (`CLASSE_DO_CAMPO`, `CLASSE_DA_LINHA_DO_MENU`, `CampoDeData`…), `SeletorDaCasca`, `CaixaDaCasca`, `BotaoDaCasca`, `PainelSuspenso` (V1).
- Produces:
  - `SecaoDono({ filtros, onMudar, onEscolher? })`: lista com `role="listbox"`; busca a partir de 8 opções;
  - `SecaoNegocio` fica só com valor, atrasados e perda (Dono e Data viram gatilhos próprios);
  - `OrdenarCards` e `MenuDeFiltrosSalvos` com o gatilho em forma de linha de menu, para morar na engrenagem (Task 8). As props não mudam.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-secoes-campos-dono-negocio.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
const equipe = vi.hoisted(() => ({
  membros: [{ user_id: "u-ana", full_name: "Ana" }] as { user_id: string; full_name: string }[],
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: equipe.membros }) }));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: [] }) }));

import { SecaoCampos } from "@/components/escale/filtros/SecaoCampos";
import { SecaoDono } from "@/components/escale/filtros/SecaoDono";
import { SecaoNegocio } from "@/components/escale/filtros/SecaoNegocio";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const novoUsuario = () => userEvent.setup({ pointerEventsCheck: 0 });
const LEADS = [negocio("l1"), negocio("l2", { status: "lost", lost_reason: "price" })];
const CAMPOS = camposFiltraveis([
  {
    fields: [
      { key: "renda", label: "Renda", type: "number" },
      { key: "nascimento", label: "Nascimento", type: "date" },
      {
        key: "porte",
        label: "Porte",
        type: "select",
        options: [
          { value: "pequeno", label: "Pequeno" },
          { value: "grande", label: "Grande" },
        ],
      },
    ],
  },
]);

function campos(filtros: FiltrosDoQuadro, lista = CAMPOS) {
  const onMudar = vi.fn();
  render(<SecaoCampos filtros={filtros} onMudar={onMudar} campos={lista} />);
  return { onMudar, u: novoUsuario() };
}

describe("Campos (Casca V4)", () => {
  it("adicionar uma condição começa pelo primeiro campo do negócio", async () => {
    const { onMudar, u } = campos({ status: ["open"] });
    await u.click(screen.getByRole("button", { name: "Adicionar condição" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], campos: [{ alvo: "negocio", chave: "renda", op: "entre" }] });
  });

  it("a condição mostra campo, operador e valor pelos seletores da casca, e sai pelo X", async () => {
    const { onMudar, u } = campos({ status: ["open"], campos: [{ alvo: "contato", chave: "nome", op: "contem", valor: "ana" }] });
    expect(screen.getByRole("combobox", { name: "Campo" })).toHaveTextContent("Nome do contato");
    expect(screen.getByRole("combobox", { name: "Operador" })).toHaveTextContent("contém");
    expect(screen.getByRole("textbox", { name: "Valor" })).toHaveValue("ana");
    await u.click(screen.getByRole("button", { name: "Remover condição" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], campos: undefined });
  });

  it("escolher de novo o operador ou o campo atual não apaga nada", async () => {
    const { onMudar, u } = campos({ status: ["open"], campos: [{ alvo: "contato", chave: "nome", op: "contem", valor: "ana" }] });
    await u.click(screen.getByRole("combobox", { name: "Operador" }));
    await u.click(screen.getByRole("option", { name: "contém" }));
    await u.click(screen.getByRole("combobox", { name: "Campo" }));
    await u.click(screen.getByRole("option", { name: "Nome do contato" }));
    expect(onMudar).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Valor" })).toHaveValue("ana");
  });

  it("campo de opção escolhe o valor pelo seletor; trocar o campo recomeça a condição", async () => {
    const { onMudar, u } = campos({ status: ["open"], campos: [{ alvo: "negocio", chave: "porte", op: "igual" }] });
    await u.click(screen.getByRole("combobox", { name: "Valor" }));
    await u.click(screen.getByRole("option", { name: "Grande" }));
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      campos: [{ alvo: "negocio", chave: "porte", op: "igual", valor: "grande" }],
    });
    await u.click(screen.getByRole("combobox", { name: "Campo" }));
    await u.click(screen.getByRole("option", { name: "Renda" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], campos: [{ alvo: "negocio", chave: "renda", op: "entre" }] });
  });

  it("campo de data 'entre' recebe dd/mm/aaaa e guarda AAAA-MM-DD; data impossível não muda nada", async () => {
    const { onMudar, u } = campos({ status: ["open"], campos: [{ alvo: "negocio", chave: "nascimento", op: "entre" }] });
    await u.type(screen.getByRole("textbox", { name: "De" }), "01/10/2026");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({
      status: ["open"],
      campos: [{ alvo: "negocio", chave: "nascimento", op: "entre", valor: "2026-10-01" }],
    });
    onMudar.mockClear();
    await u.type(screen.getByRole("textbox", { name: "Até" }), "31/02/2026");
    await u.tab();
    expect(onMudar).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Até" })).toHaveValue("");
  });

  it("campo do negócio com o nome de um do contato ganha o grupo no rótulo do contato", async () => {
    const lista = camposFiltraveis([{ fields: [{ key: "nome_contato", label: "Nome do contato", type: "text" }] }]);
    const { u } = campos({ status: ["open"], campos: [{ alvo: "negocio", chave: "nome_contato", op: "contem" }] }, lista);
    await u.click(screen.getByRole("combobox", { name: "Campo" }));
    expect(screen.getByRole("option", { name: "Contato · Nome do contato" })).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: "Nome do contato" })).toHaveLength(1);
  });
});

describe("Dono do negócio (Casca V4)", () => {
  it("lista Todos, Eu, Sem responsável e a equipe; escolher grava e avisa quem fecha o painel", async () => {
    const onMudar = vi.fn();
    const onEscolher = vi.fn();
    render(<SecaoDono filtros={{ status: ["open"] }} onMudar={onMudar} onEscolher={onEscolher} />);
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Todos", "Eu", "Sem responsável", "Ana"]);
    expect(screen.getByRole("option", { name: "Todos" })).toHaveAttribute("aria-selected", "true");
    await novoUsuario().click(screen.getByRole("option", { name: "Ana" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], dono: "u-ana" });
    expect(onEscolher).toHaveBeenCalled();
  });

  it("o dono escolhido aparece marcado; Todos desfaz o filtro", async () => {
    const onMudar = vi.fn();
    render(<SecaoDono filtros={{ status: ["open"], dono: "u-ana" }} onMudar={onMudar} />);
    expect(screen.getByRole("option", { name: "Ana" })).toHaveAttribute("aria-selected", "true");
    await novoUsuario().click(screen.getByRole("option", { name: "Todos" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], dono: undefined });
  });

  it("com 8 ou mais opções aparece a busca, que ignora acento", async () => {
    const original = equipe.membros;
    equipe.membros = Array.from({ length: 7 }, (_, i) => ({ user_id: `u-${i}`, full_name: i === 3 ? "Zélia Souza" : `Pessoa ${i}` }));
    try {
      const onMudar = vi.fn();
      render(<SecaoDono filtros={{ status: ["open"] }} onMudar={onMudar} />);
      const u = novoUsuario();
      await u.type(screen.getByRole("searchbox", { name: "Buscar…" }), "zelia");
      expect(screen.queryByRole("option", { name: "Pessoa 0" })).not.toBeInTheDocument();
      await u.click(screen.getByRole("option", { name: "Zélia Souza" }));
      expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], dono: "u-3" });
    } finally {
      equipe.membros = original;
    }
  });
});

describe("Negócio, dentro de Mais filtros (Casca V4)", () => {
  it("valor digitado em reais vira centavos; atrasados pela caixinha; sem dono nem data aqui", async () => {
    const onMudar = vi.fn();
    render(<SecaoNegocio filtros={{ status: ["open"] }} onMudar={onMudar} leads={LEADS} settings={{}} />);
    const u = novoUsuario();
    await u.type(screen.getByRole("textbox", { name: "Mínimo" }), "1.500");
    await u.tab();
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], valor: { min: 150000 } });
    await u.click(screen.getByRole("checkbox", { name: "Apenas atrasados" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], atrasados: true });
    expect(screen.queryByRole("combobox", { name: "Dono do negócio" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Criado a partir de")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Motivo de perda" })).not.toBeInTheDocument();
  });

  it("com perdidos no status, o motivo de perda vem dos cards perdidos", async () => {
    const onMudar = vi.fn();
    render(<SecaoNegocio filtros={{ status: ["open", "lost"] }} onMudar={onMudar} leads={LEADS} settings={{}} />);
    const u = novoUsuario();
    await u.click(screen.getByRole("combobox", { name: "Motivo de perda" }));
    await u.click(screen.getByRole("option", { name: "Preço" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open", "lost"], motivoDePerda: "price" });
  });
});

describe("sem controle nativo", () => {
  it("Campos, Dono e Negócio não usam seleção, data, caixinha nem rádio nativos", () => {
    const onMudar = vi.fn();
    render(
      <>
        <SecaoCampos
          filtros={{ status: ["lost"], campos: [{ alvo: "negocio", chave: "nascimento", op: "entre" }] }}
          onMudar={onMudar}
          campos={CAMPOS}
        />
        <SecaoDono filtros={{ status: ["open"] }} onMudar={onMudar} />
        <SecaoNegocio filtros={{ status: ["lost"] }} onMudar={onMudar} leads={LEADS} settings={{}} />
      </>,
    );
    expect(document.querySelector('select, input[type="date"], input[type="checkbox"], input[type="radio"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-secoes-campos-dono-negocio.test.tsx
```
Expected: FAIL (`Cannot find module '@/components/escale/filtros/SecaoDono'`).

- [ ] **Step 3: `components/escale/filtros/SecaoDono.tsx`**

```tsx
"use client";
import { useState } from "react";

import { useUser } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { agentOwnerFilter } from "@/lib/kanban/filters";
import { Check } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CLASSE_DO_CAMPO } from "./controles";

const BUSCA_A_PARTIR_DE = 8;
const normalizar = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

/**
 * "DONO DO NEGÓCIO" (fork Escale, Casca V4; gatilho da barra da Clint, print da
 * barra de 15/10). O conteúdo aberto não tem print (PRINT 27): é a lista do
 * react-select aberto da Clint (`menuIsOpen` no bundle), com a régua da 1D —
 * Todos, Eu, Sem responsável, a equipe e os agentes. Escolher fecha o painel.
 */
export function SecaoDono({
  filtros,
  onMudar,
  onEscolher,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  onEscolher?: () => void;
}) {
  const t = useT();
  const user = useUser();
  const { data: membros } = useAssignableMembers(true);
  const { data: agentes } = useAssignableAgents(true);
  const [busca, setBusca] = useState("");
  const atual = filtros.dono && filtros.dono !== "any" ? filtros.dono : "";

  const opcoes = [
    { valor: "", rotulo: t("Todos") },
    { valor: user.id, rotulo: t("Eu") },
    { valor: "unassigned", rotulo: t("Sem responsável") },
    ...(membros ?? [])
      .filter((m) => m.user_id !== user.id)
      .map((m) => ({ valor: m.user_id, rotulo: m.full_name ?? t("Sem nome") })),
    ...(agentes ?? []).map((a) => ({ valor: agentOwnerFilter(a.agent_id), rotulo: a.name })),
  ];
  const comBusca = opcoes.length >= BUSCA_A_PARTIR_DE;
  const termo = normalizar(busca);
  const visiveis = comBusca && termo ? opcoes.filter((o) => normalizar(o.rotulo).includes(termo)) : opcoes;

  function escolher(valor: string) {
    onMudar({ ...filtros, dono: valor || undefined });
    onEscolher?.();
  }

  return (
    <div className="space-y-2">
      {comBusca ? (
        <input
          type="search"
          aria-label={t("Buscar…")}
          placeholder={t("Buscar…")}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={CLASSE_DO_CAMPO}
        />
      ) : null}
      <ul role="listbox" aria-label={t("Dono do negócio")} className="max-h-64 overflow-y-auto">
        {visiveis.map((o) => {
          const escolhida = o.valor === atual;
          return (
            <li
              key={o.valor || "todos"}
              role="option"
              aria-selected={escolhida}
              tabIndex={0}
              onClick={() => escolher(o.valor)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  escolher(o.valor);
                }
              }}
              className={cn(
                "flex min-h-[34px] cursor-pointer items-center gap-2 rounded-[2px] px-3 text-[11px] text-casca-texto outline-hidden",
                "hover:bg-casca-marca-suave hover:text-casca-marca focus-visible:bg-casca-marca-suave",
                escolhida && "font-semibold",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{o.rotulo}</span>
              {escolhida ? <Check size={14} aria-hidden className="shrink-0 text-casca-marca" /> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: `components/escale/filtros/SecaoNegocio.tsx`**

Troque o arquivo inteiro por:

```tsx
"use client";
import { useMemo } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { categoriaDoMotivo } from "@/lib/leads/motivos-de-perda-do-funil";
import { MOEDA_PADRAO, simboloDaMoeda } from "@/lib/money";
import { ROTULO_DO_MOTIVO_CANONICO } from "@/lib/schemas/leads";
import type { Lead } from "@/lib/types/leads";

import { CampoNumerico, RotuloDoGrupo } from "./controles";

const emReais = (centavos: number | undefined) => (centavos === undefined ? undefined : centavos / 100);
const emCentavos = (reais: number | undefined) => (reais === undefined ? undefined : Math.round(reais * 100));

/**
 * Negócio, dentro de "Mais filtros" (Casca V4): valor, atrasados e, com perdidos
 * no status, motivo e categoria de perda. Dono e Data viraram gatilhos próprios,
 * como na barra da Clint.
 */
export function SecaoNegocio({
  filtros,
  onMudar,
  leads,
  settings,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  leads: readonly Lead[];
  settings?: Record<string, unknown>;
}) {
  const t = useT();
  const org = useActiveOrg();
  const moeda = simboloDaMoeda(org?.currency ?? MOEDA_PADRAO);

  // As opções vêm do que ESTÁ no quadro (a regra do `FilterBar` do original).
  const motivos = useMemo(
    () =>
      [...new Set(leads.filter((l) => l.status === "lost" && l.lost_reason).map((l) => l.lost_reason as string))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [leads],
  );
  const categorias = useMemo(
    () =>
      [...new Set(motivos.map((m) => categoriaDoMotivo(m, settings)).filter((c): c is string => !!c))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [motivos, settings],
  );
  // Só o motivo canônico é traduzido; o do funil é texto que o operador escreveu.
  const rotuloDoMotivo = (motivo: string) =>
    Object.prototype.hasOwnProperty.call(ROTULO_DO_MOTIVO_CANONICO, motivo)
      ? t(ROTULO_DO_MOTIVO_CANONICO[motivo as keyof typeof ROTULO_DO_MOTIVO_CANONICO])
      : motivo;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <RotuloDoGrupo ajuda={t("Só entram negócios na moeda da organização.")}>{`${t("Valor")} (${moeda})`}</RotuloDoGrupo>
        <div className="grid grid-cols-2 gap-2">
          <CampoNumerico
            key={`vmin:${filtros.valor?.min ?? ""}`}
            rotulo={t("Mínimo")}
            valor={emReais(filtros.valor?.min)}
            onMudar={(v) => onMudar({ ...filtros, valor: { ...filtros.valor, min: emCentavos(v) } })}
          />
          <CampoNumerico
            key={`vmax:${filtros.valor?.max ?? ""}`}
            rotulo={t("Máximo")}
            valor={emReais(filtros.valor?.max)}
            onMudar={(v) => onMudar({ ...filtros, valor: { ...filtros.valor, max: emCentavos(v) } })}
          />
        </div>
      </div>

      <CaixaDaCasca
        marcada={!!filtros.atrasados}
        aoMudar={(m) => onMudar({ ...filtros, atrasados: m || undefined })}
        rotulo={t("Apenas atrasados")}
      />

      {filtros.status.includes("lost") && motivos.length > 0 ? (
        <div className="space-y-2">
          <RotuloDoGrupo>{t("Motivo de perda")}</RotuloDoGrupo>
          <SeletorDaCasca
            aria-label={t("Motivo de perda")}
            valor={filtros.motivoDePerda ?? ""}
            opcoes={[{ valor: "", rotulo: t("Todos") }, ...motivos.map((m) => ({ valor: m, rotulo: rotuloDoMotivo(m) }))]}
            aoMudar={(v) => onMudar({ ...filtros, motivoDePerda: v || undefined })}
          />
          {categorias.length > 0 ? (
            <SeletorDaCasca
              aria-label={t("Categoria de perda")}
              valor={filtros.categoriaDePerda ?? ""}
              opcoes={[{ valor: "", rotulo: t("Todas") }, ...categorias.map((c) => ({ valor: c, rotulo: c }))]}
              aoMudar={(v) => onMudar({ ...filtros, categoriaDePerda: v || undefined })}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: `components/escale/filtros/SecaoCampos.tsx`**

Troque o arquivo inteiro por:

```tsx
"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { chaveDoCampo, condicaoNova, operadoresDoTipo, type CampoFiltravel } from "@/lib/escale/filtros/campos";
import {
  CONDICOES_DE_CAMPO_MAX,
  type CondicaoDeCampo,
  type FiltrosDoQuadro,
  type OperadorDeCampo,
} from "@/lib/escale/filtros/tipos";
import { Plus, X } from "@/lib/ui/icons-da-casca";

import { CampoDeData, CampoDeTexto, CampoNumerico } from "./controles";

const ROTULO_DO_OPERADOR: Record<OperadorDeCampo, string> = {
  contem: "contém",
  igual: "é igual a",
  entre: "está entre",
  preenchido: "está preenchido",
  vazio: "está vazio",
};

/**
 * Campos (gatilho "Campos" da Clint; o conteúdo aberto não tem print, PRINT 25):
 * condições sobre os campos personalizados do negócio e os campos fixos do
 * contato, somadas (E). A lógica é a da 1D; o visual, o da casca.
 */
export function SecaoCampos({
  filtros,
  onMudar,
  campos,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  campos: readonly CampoFiltravel[];
}) {
  const t = useT();
  const condicoes = filtros.campos ?? [];
  const porChave = new Map(campos.map((c) => [chaveDoCampo(c), c]));
  const doNegocio = campos.filter((c) => c.alvo === "negocio");
  const doContato = campos.filter((c) => c.alvo === "contato");
  const primeiro = doNegocio[0] ?? doContato[0];
  const atingiuOLimite = condicoes.length >= CONDICOES_DE_CAMPO_MAX;
  // Um campo personalizado do negócio pode ter o mesmo nome de um do contato: nesse
  // caso (e só nele) o rótulo do contato carrega o grupo, para as opções não parecerem iguais.
  const rotulosDoNegocio = new Set(doNegocio.map((c) => c.rotulo));
  const opcoesDeCampo = [
    ...doNegocio.map((c) => ({ valor: chaveDoCampo(c), rotulo: c.rotulo, grupo: t("Negócio") })),
    ...doContato.map((c) => {
      const rotulo = t(c.rotulo);
      return {
        valor: chaveDoCampo(c),
        rotulo: rotulosDoNegocio.has(rotulo) ? `${t("Contato")} · ${rotulo}` : rotulo,
        grupo: t("Contato"),
      };
    }),
  ];

  function trocar(indice: number, nova: CondicaoDeCampo | null) {
    const proximas =
      nova === null ? condicoes.filter((_, j) => j !== indice) : condicoes.map((c, j) => (j === indice ? nova : c));
    onMudar({ ...filtros, campos: proximas.length > 0 ? proximas : undefined });
  }

  return (
    <div className="space-y-3">
      {condicoes.map((condicao, indice) => {
        const campo = porChave.get(chaveDoCampo(condicao));
        const tipo = campo?.tipo ?? "texto";
        return (
          <fieldset key={indice} className="space-y-2 rounded-casca-gatilho border border-casca-borda p-2">
            <legend className="sr-only">{`${t("Condição")} ${indice + 1}`}</legend>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SeletorDaCasca
                  aria-label={t("Campo")}
                  valor={chaveDoCampo(condicao)}
                  opcoes={campo ? opcoesDeCampo : [{ valor: chaveDoCampo(condicao), rotulo: condicao.chave }, ...opcoesDeCampo]}
                  aoMudar={(chave) => {
                    // Escolher de novo o campo atual não é troca: manteria o operador e o valor.
                    if (!chave || chave === chaveDoCampo(condicao)) return;
                    const novo = porChave.get(chave);
                    if (novo) trocar(indice, condicaoNova(novo));
                  }}
                />
              </div>
              <button
                type="button"
                aria-label={t("Remover condição")}
                onClick={() => trocar(indice, null)}
                className="grid size-7 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
            <SeletorDaCasca<OperadorDeCampo>
              aria-label={t("Operador")}
              valor={condicao.op}
              opcoes={operadoresDoTipo(tipo).map((op) => ({ valor: op, rotulo: t(ROTULO_DO_OPERADOR[op]) }))}
              aoMudar={(op) => {
                // Escolher de novo o operador atual não é troca: apagaria o valor digitado.
                if (!op || op === condicao.op) return;
                trocar(indice, {
                  alvo: condicao.alvo,
                  chave: condicao.chave,
                  op,
                  ...(tipo === "booleano" ? { valor: "true" } : {}),
                });
              }}
            />
            <ValorDaCondicao condicao={condicao} campo={campo} onMudar={(nova) => trocar(indice, nova)} />
          </fieldset>
        );
      })}
      <BotaoDaCasca
        type="button"
        variante="texto"
        tamanho="sm"
        disabled={!primeiro || atingiuOLimite}
        onClick={() => primeiro && onMudar({ ...filtros, campos: [...condicoes, condicaoNova(primeiro)] })}
      >
        <Plus size={14} aria-hidden />
        {t("Adicionar condição")}
      </BotaoDaCasca>
    </div>
  );
}

function ValorDaCondicao({
  condicao: c,
  campo,
  onMudar,
}: {
  condicao: CondicaoDeCampo;
  campo: CampoFiltravel | undefined;
  onMudar: (nova: CondicaoDeCampo) => void;
}) {
  const t = useT();
  if (c.op === "preenchido" || c.op === "vazio") return null;
  const tipo = campo?.tipo ?? "texto";

  if (tipo === "booleano") {
    return (
      <SeletorDaCasca<"true" | "false">
        aria-label={t("Valor")}
        valor={c.valor === "false" ? "false" : "true"}
        opcoes={[
          { valor: "true", rotulo: t("Sim") },
          { valor: "false", rotulo: t("Não") },
        ]}
        aoMudar={(v) => onMudar({ ...c, valor: v || "true" })}
      />
    );
  }
  if ((tipo === "opcao" || tipo === "opcoes") && campo?.opcoes?.length) {
    return (
      <SeletorDaCasca
        aria-label={t("Valor")}
        valor={c.valor ?? ""}
        opcoes={[{ valor: "", rotulo: t("Escolha") }, ...campo.opcoes.map((o) => ({ valor: o.value, rotulo: o.label }))]}
        aoMudar={(v) => onMudar({ ...c, valor: v || undefined })}
      />
    );
  }
  if (c.op === "entre" && tipo === "data") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <CampoDeData key={`de:${c.valor ?? ""}`} rotulo={t("De")} valor={c.valor} onMudar={(v) => onMudar({ ...c, valor: v })} />
        <CampoDeData key={`ate:${c.ate ?? ""}`} rotulo={t("Até")} valor={c.ate} onMudar={(v) => onMudar({ ...c, ate: v })} />
      </div>
    );
  }
  if (c.op === "entre") {
    return (
      <div className="grid grid-cols-2 gap-2">
        <CampoNumerico
          key={`min:${c.valor ?? ""}`}
          rotulo={t("Mínimo")}
          valor={c.valor ? Number(c.valor) : undefined}
          onMudar={(v) => onMudar({ ...c, valor: v === undefined ? undefined : String(v) })}
        />
        <CampoNumerico
          key={`max:${c.ate ?? ""}`}
          rotulo={t("Máximo")}
          valor={c.ate ? Number(c.ate) : undefined}
          onMudar={(v) => onMudar({ ...c, ate: v === undefined ? undefined : String(v) })}
        />
      </div>
    );
  }
  return <CampoDeTexto key={`txt:${c.valor ?? ""}`} rotulo={t("Valor")} valor={c.valor} onMudar={(v) => onMudar({ ...c, valor: v })} />;
}
```

As opções de um campo de opção (`CampoFiltravel.opcoes`) são `ReadonlyArray<{ value: string; label: string }>` desde a 1D: o `map` acima só troca os nomes para os do `SeletorDaCasca`.

- [ ] **Step 6: `components/escale/filtros/OrdenarCards.tsx`**

Troque o arquivo inteiro por:

```tsx
"use client";
import { useMemo, useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import { GRUPOS_DE_ORDEM, opcoesDeOrdem, rotulosDaDirecao } from "@/lib/escale/filtros/ordenar";
import { CRITERIOS_DE_ORDEM_MAX, type CriterioDeOrdem } from "@/lib/escale/filtros/tipos";
import { ArrowDownUp, Plus, X } from "@/lib/ui/icons-da-casca";

import { CLASSE_DA_LINHA_DO_MENU } from "./controles";

/**
 * "ORDENAR POR" (fork Escale, Fase 1D; textos da Clint, `DealSortControl`). Na
 * Casca V4 o gatilho é uma linha do menu da engrenagem (D5; PRINT 31): a Clint
 * superior não mostra o Ordenar. Até 3 critérios, a ordem das linhas é a
 * prioridade, e nada muda até "Aplicar". Aplicar sem critério volta à ordem manual.
 */
export function OrdenarCards({
  ordem,
  campos,
  onAplicar,
}: {
  ordem: readonly CriterioDeOrdem[] | undefined;
  campos: readonly CampoFiltravel[];
  onAplicar: (ordem: CriterioDeOrdem[] | undefined) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<CriterioDeOrdem[]>([]);
  const opcoes = useMemo(() => opcoesDeOrdem(campos), [campos]);
  const porCampo = new Map(opcoes.map((o) => [o.campo, o]));
  const livre = opcoes.find((o) => !rascunho.some((r) => r.campo === o.campo));
  const cheio = rascunho.length >= CRITERIOS_DE_ORDEM_MAX;
  const rotuloDoGrupo = new Map(GRUPOS_DE_ORDEM.map((g) => [g.grupo, t(g.rotulo)]));
  const opcoesDaCaixa = opcoes.map((o) => ({
    valor: o.campo,
    rotulo: o.grupo === "campos" ? o.rotulo : t(o.rotulo),
    grupo: rotuloDoGrupo.get(o.grupo) ?? "",
  }));

  function abrir(sim: boolean) {
    if (sim) setRascunho([...(ordem ?? [])]);
    setAberto(sim);
  }

  function trocar(indice: number, novo: CriterioDeOrdem | null) {
    setRascunho((antes) => (novo === null ? antes.filter((_, j) => j !== indice) : antes.map((r, j) => (j === indice ? novo : r))));
  }

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <button type="button" className={CLASSE_DA_LINHA_DO_MENU}>
          <ArrowDownUp size={14} aria-hidden />
          <span>{t("Ordenar")}</span>
          {ordem?.length ? (
            <span className="ml-auto grid size-[18px] place-items-center rounded-full bg-casca-cinza-selo text-[10px] text-casca-texto">
              {ordem.length}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PainelSuspenso side="left" align="start" aria-label={t("Ordenar por")} className="w-[min(30rem,calc(100vw-2rem))] space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold text-casca-texto">{t("Ordenar por")}</p>
          <p className="text-[11px] text-casca-suave">{t("Defina um ou mais critérios. A ordem das linhas define a prioridade.")}</p>
        </div>
        {rascunho.length === 0 ? (
          <div className="rounded-casca-gatilho border border-dashed border-casca-borda p-3 text-center">
            <p className="text-xs font-medium text-casca-texto">{t("Nenhum critério de ordenação")}</p>
            <p className="text-[11px] text-casca-suave">{t("Adicione um critério para ordenar ou aplique para voltar à ordem manual.")}</p>
          </div>
        ) : (
          rascunho.map((criterio, indice) => {
            const opcao = porCampo.get(criterio.campo);
            const direcoes = rotulosDaDirecao(opcao?.tipo ?? "texto");
            return (
              <div key={indice} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <SeletorDaCasca
                    aria-label={`${t("Campo")} ${indice + 1}`}
                    valor={criterio.campo}
                    opcoes={opcoesDaCaixa.map((o) => ({
                      ...o,
                      desabilitada: o.valor !== criterio.campo && rascunho.some((r) => r.campo === o.valor),
                    }))}
                    aoMudar={(campo) => {
                      if (campo) trocar(indice, { campo, direcao: criterio.direcao });
                    }}
                  />
                </div>
                <div className="w-40 shrink-0">
                  <SeletorDaCasca<"asc" | "desc">
                    aria-label={`${t("Direção")} ${indice + 1}`}
                    valor={criterio.direcao}
                    opcoes={[
                      { valor: "asc", rotulo: t(direcoes.asc) },
                      { valor: "desc", rotulo: t(direcoes.desc) },
                    ]}
                    aoMudar={(direcao) => {
                      if (direcao) trocar(indice, { campo: criterio.campo, direcao });
                    }}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`${t("Remover critério")} ${indice + 1}`}
                  onClick={() => trocar(indice, null)}
                  className="grid size-7 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            );
          })
        )}
        <div className="flex items-center justify-between gap-2">
          <BotaoDaCasca
            type="button"
            variante="texto"
            tamanho="sm"
            disabled={!livre || cheio}
            onClick={() => {
              if (livre) setRascunho((antes) => [...antes, { campo: livre.campo, direcao: "asc" }]);
            }}
          >
            <Plus size={14} aria-hidden />
            {t("Adicionar critério")}
          </BotaoDaCasca>
          <div className="flex gap-2">
            <BotaoDaCasca type="button" variante="texto" tamanho="sm" onClick={() => setAberto(false)}>
              {t("Cancelar")}
            </BotaoDaCasca>
            <BotaoDaCasca
              type="button"
              variante="marca"
              tamanho="sm"
              onClick={() => {
                onAplicar(rascunho.length > 0 ? rascunho : undefined);
                setAberto(false);
              }}
            >
              {t("Aplicar")}
            </BotaoDaCasca>
          </div>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
```

- [ ] **Step 7: `components/escale/filtros/MenuDeFiltrosSalvos.tsx` (só o gatilho)**

7a. Nos imports, apague `import { Button } from "@/components/ui/button";` e troque `import { BookmarkSimple, CaretDown, Users } from "@/lib/ui/icons";` por:

```tsx
import { Users } from "@/lib/ui/icons";
import { Bookmark, ChevronRight } from "@/lib/ui/icons-da-casca";
```
e acrescente, junto do import de `./JanelaDoFiltroSalvo`:
```tsx
import { CLASSE_DA_LINHA_DO_MENU } from "./controles";
```

7b. Troque o bloco do gatilho:

```tsx
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="max-w-[16rem] gap-1.5" data-testid="filtros-salvos">
            <BookmarkSimple size={16} aria-hidden />
            <span className="truncate">{ativo ? ativo.nome : t("Filtros salvos")}</span>
            {alterado ? <span className="text-xs text-muted-foreground">{`(${t("alterado")})`}</span> : null}
            <CaretDown size={14} aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
```
por:
```tsx
        <DropdownMenuTrigger asChild>
          {/* Casca V4: uma linha do menu da engrenagem (D5; PRINT 32). */}
          <button type="button" className={CLASSE_DA_LINHA_DO_MENU} data-testid="filtros-salvos">
            <Bookmark size={14} aria-hidden />
            <span className="min-w-0 truncate">{ativo ? ativo.nome : t("Filtros salvos")}</span>
            {alterado ? <span className="text-casca-meta">{`(${t("alterado")})`}</span> : null}
            <ChevronRight size={12} aria-hidden className="ml-auto shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="left" align="start" className="w-64">
```

7c. No comentário em cima da função `MenuDeFiltrosSalvos`, acrescente a frase final: "Na Casca V4 o gatilho é uma linha do menu da engrenagem."

- [ ] **Step 8: Rodar**

```bash
corepack pnpm vitest run tests/unit/escale-secoes-campos-dono-negocio.test.tsx tests/unit/escale-secoes-de-filtro.test.tsx tests/unit/escale-filtros-salvos-menu.test.tsx
```
Expected: PASS nos três.

- [ ] **Step 9: Typecheck, lint, prettier e commit**

O `PainelDeFiltros` (que sai na Task 7) ainda compila: usa as seções com as mesmas props.

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/filtros tests/unit/escale-secoes-campos-dono-negocio.test.tsx
corepack pnpm exec prettier --write components/escale/filtros/SecaoDono.tsx components/escale/filtros/SecaoNegocio.tsx components/escale/filtros/SecaoCampos.tsx components/escale/filtros/OrdenarCards.tsx components/escale/filtros/MenuDeFiltrosSalvos.tsx tests/unit/escale-secoes-campos-dono-negocio.test.tsx
git add components/escale/filtros tests/unit/escale-secoes-campos-dono-negocio.test.tsx
git commit -m "feat(escale): Campos, Dono, Negócio, Ordenar e Filtros salvos com os controles da casca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Os seis gatilhos da Clint (Data, Campos, Tags, Dono, Status, Mais filtros)

**Files:**
- Create: `components/escale/filtros/GatilhoComPainel.tsx`, `components/escale/filtros/FiltroDeData.tsx`, `components/escale/filtros/GatilhosDoQuadro.tsx`, `tests/unit/escale-gatilhos-do-quadro.test.tsx`
- Modify (reescrever): `components/escale/filtros/StatusDoQuadro.tsx`

**Interfaces:**
- Consumes: `GatilhoDeFiltro`, `PainelSuspenso`, `BotaoDaCasca`, `CaixaDaCasca`, `CalendarioDePeriodo` (V1); `contarPorGatilho`, `limparGatilho` (Task 4); `periodoDosFiltros`, `comPeriodo`, `TIPOS_DE_DATA_DISPONIVEIS` (Task 2); as seções (Tasks 5 e 6).
- Produces:
  - `GatilhoComPainel({ rotulo, contagem, onLimpar?, className?, testId?, children })`: o gatilho da V1 com o painel suspenso e, quando há critério, "Limpar" no pé. `children` pode ser função `(fechar) => ReactNode`;
  - `FiltroDeData({ filtros, onMudar })` (`data-testid="filtro-data"`);
  - `StatusDoQuadro({ status, onMudar })` com a mesma assinatura da 1D (`data-testid="status-do-quadro"`), agora gatilho "Status" com selo;
  - `GatilhoDeCampos`, `GatilhoDeTags`, `GatilhoDoDono`, `GatilhoMaisFiltros`.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-gatilhos-do-quadro.test.tsx`:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u-ana", full_name: "Ana" }] }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: [] }) }));
// O calendário é da V1 e tem teste próprio: aqui só importa o que a barra entrega a ele e faz com a resposta.
type PeriodoFalso = { tipo: "criacao" | "ganho" | "perda" | "agendado"; de?: string; ate?: string };
vi.mock("@/components/escale/ui/CalendarioDePeriodo", () => ({
  CalendarioDePeriodo: ({
    valor,
    aoMudar,
    tiposDisponiveis,
  }: {
    valor: PeriodoFalso;
    aoMudar: (p: PeriodoFalso) => void;
    tiposDisponiveis?: string[];
  }) => (
    <div>
      <p>{`valor: ${valor.tipo} ${valor.de ?? "-"} ${valor.ate ?? "-"}`}</p>
      <p>{`tipos: ${(tiposDisponiveis ?? []).join(",")}`}</p>
      <button type="button" onClick={() => aoMudar({ tipo: "criacao", de: "2026-10-01", ate: "2026-10-15" })}>
        escolher outubro
      </button>
      <button type="button" onClick={() => aoMudar({ tipo: "ganho" })}>
        aba ganho
      </button>
    </div>
  ),
}));

import { FiltroDeData } from "@/components/escale/filtros/FiltroDeData";
import {
  GatilhoDeCampos,
  GatilhoDeTags,
  GatilhoDoDono,
  GatilhoMaisFiltros,
} from "@/components/escale/filtros/GatilhosDoQuadro";
import { StatusDoQuadro } from "@/components/escale/filtros/StatusDoQuadro";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const novoUsuario = () => userEvent.setup({ pointerEventsCheck: 0 });
const LEADS = [negocio("l1", { tags: ["vip"], contact_tags: ["quente"] })];
const CAMPOS = camposFiltraveis([{ fields: [{ key: "renda", label: "Renda", type: "number" }] }]);

describe("Data (Casca V4)", () => {
  it("abre o calendário com criação, ganho e perda; escolher um período filtra pela criação", async () => {
    const onMudar = vi.fn();
    render(<FiltroDeData filtros={{ status: ["open"] }} onMudar={onMudar} />);
    const u = novoUsuario();
    await u.click(screen.getByTestId("filtro-data"));
    expect(screen.getByText("tipos: criacao,ganho,perda")).toBeInTheDocument();
    expect(screen.getByText("valor: criacao - -")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "escolher outubro" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], criadoEm: { de: "2026-10-01", ate: "2026-10-15" } });
  });

  it("com período: o selo conta 1, trocar de aba leva o período e pede ganhos, e Limpar tira o Data", async () => {
    const onMudar = vi.fn();
    render(<FiltroDeData filtros={{ status: ["open"], criadoEm: { de: "2026-10-01", ate: "2026-10-15" } }} onMudar={onMudar} />);
    const gatilho = screen.getByTestId("filtro-data");
    expect(gatilho).toHaveTextContent("1");
    const u = novoUsuario();
    await u.click(gatilho);
    expect(screen.getByText("valor: criacao 2026-10-01 2026-10-15")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "aba ganho" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open", "won"], ganhoEm: { de: "2026-10-01", ate: "2026-10-15" } });
    await u.click(screen.getByRole("button", { name: "Limpar" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"] });
  });
});

describe("Status (Casca V4)", () => {
  it("'Status' com o selo da contagem; junta Ganhos; o último não sai; Mostrar todos", async () => {
    const onMudar = vi.fn();
    render(<StatusDoQuadro status={["open"]} onMudar={onMudar} />);
    const gatilho = screen.getByTestId("status-do-quadro");
    expect(gatilho).toHaveTextContent(/Status\s*1/);
    const u = novoUsuario();
    await u.click(gatilho);
    await u.click(screen.getByRole("checkbox", { name: "Ganhos" }));
    expect(onMudar).toHaveBeenLastCalledWith(["open", "won"]);
    await u.click(screen.getByRole("checkbox", { name: "Em aberto" }));
    expect(onMudar).toHaveBeenCalledTimes(1);
    await u.click(screen.getByRole("button", { name: "Mostrar todos" }));
    expect(onMudar).toHaveBeenLastCalledWith(["open", "won", "lost"]);
  });
});

describe("Dono, Tags, Campos e Mais filtros (Casca V4)", () => {
  it("Dono do negócio: escolher alguém filtra e fecha o painel; o selo conta 1", async () => {
    const onMudar = vi.fn();
    const { rerender } = render(<GatilhoDoDono filtros={{ status: ["open"] }} onMudar={onMudar} />);
    const u = novoUsuario();
    await u.click(screen.getByRole("button", { name: /^Dono do negócio/ }));
    await u.click(screen.getByRole("option", { name: "Ana" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], dono: "u-ana" });
    await waitFor(() => expect(screen.queryByRole("listbox", { name: "Dono do negócio" })).not.toBeInTheDocument());
    rerender(<GatilhoDoDono filtros={{ status: ["open"], dono: "u-ana" }} onMudar={onMudar} />);
    expect(screen.getByRole("button", { name: /^Dono do negócio/ })).toHaveTextContent("1");
  });

  it("Tags: o selo conta as tags; marcar outra soma; Limpar tira só as tags", async () => {
    const onMudar = vi.fn();
    render(<GatilhoDeTags filtros={{ status: ["open"], tags: ["vip"] }} onMudar={onMudar} leads={LEADS} />);
    const gatilho = screen.getByRole("button", { name: /^Tags/ });
    expect(gatilho).toHaveTextContent("1");
    const u = novoUsuario();
    await u.click(gatilho);
    await u.click(screen.getByRole("checkbox", { name: "quente" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tags: ["vip", "quente"] });
    await u.click(screen.getByRole("button", { name: "Limpar" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"] });
  });

  it("Campos: o painel monta as condições", async () => {
    const onMudar = vi.fn();
    render(<GatilhoDeCampos filtros={{ status: ["open"] }} onMudar={onMudar} campos={CAMPOS} />);
    const u = novoUsuario();
    await u.click(screen.getByRole("button", { name: /^Campos/ }));
    await u.click(screen.getByRole("button", { name: "Adicionar condição" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], campos: [{ alvo: "negocio", chave: "renda", op: "entre" }] });
  });

  it("Mais filtros: Conversas, Negócio e Outros num painel só; o selo soma; Limpar tira só os dele", async () => {
    const onMudar = vi.fn();
    render(
      <GatilhoMaisFiltros
        filtros={{ status: ["open"], tags: ["vip"], conversa: { naoLidas: true }, atrasados: true }}
        onMudar={onMudar}
        leads={LEADS}
        settings={{}}
      />,
    );
    const gatilho = screen.getByRole("button", { name: /^Mais filtros/ });
    expect(gatilho).toHaveTextContent("2");
    const u = novoUsuario();
    await u.click(gatilho);
    const painel = screen.getByRole("dialog", { name: "Mais filtros" });
    expect(within(painel).getByRole("heading", { name: "Conversas" })).toBeInTheDocument();
    expect(within(painel).getByRole("heading", { name: "Negócio" })).toBeInTheDocument();
    expect(within(painel).getByRole("heading", { name: "Outros" })).toBeInTheDocument();
    await u.click(within(painel).getByRole("button", { name: "Limpar" }));
    expect(onMudar).toHaveBeenLastCalledWith({ status: ["open"], tags: ["vip"] });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-gatilhos-do-quadro.test.tsx
```
Expected: FAIL (`Cannot find module '@/components/escale/filtros/FiltroDeData'`).

- [ ] **Step 3: `components/escale/filtros/GatilhoComPainel.tsx`**

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { GatilhoDeFiltro } from "@/components/escale/ui/GatilhoDeFiltro";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";

/**
 * UM GATILHO DA BARRA DA CLINT (fork Escale, Casca V4; prints de 15/10 da barra e
 * do Data aberto): o texto com chevron, o selo de contagem quando há critério
 * ("Status 1") e, aberto, o fundo escuro e o painel 12px abaixo, alinhado à
 * esquerda. "Limpar" no pé do painel é nosso: a Clint não mostra como limpar
 * (PRINT 24 e 30).
 */
export function GatilhoComPainel({
  rotulo,
  contagem,
  onLimpar,
  className,
  testId,
  children,
}: {
  rotulo: string;
  contagem: number;
  onLimpar?: () => void;
  className?: string;
  testId?: string;
  children: ReactNode | ((fechar: () => void) => ReactNode);
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const fechar = () => setAberto(false);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <GatilhoDeFiltro rotulo={rotulo} contagem={contagem > 0 ? contagem : undefined} aberto={aberto} data-testid={testId} />
      </PopoverTrigger>
      <PainelSuspenso
        align="start"
        sideOffset={12}
        aria-label={rotulo}
        className={cn("max-h-[70vh] overflow-y-auto p-4", className)}
      >
        {typeof children === "function" ? children(fechar) : children}
        {onLimpar && contagem > 0 ? (
          <div className="mt-4 flex justify-end border-t border-casca-borda pt-3">
            <BotaoDaCasca type="button" variante="texto" tamanho="sm" onClick={onLimpar}>
              {t("Limpar")}
            </BotaoDaCasca>
          </div>
        ) : null}
      </PainelSuspenso>
    </Popover>
  );
}
```

- [ ] **Step 4: `components/escale/filtros/FiltroDeData.tsx`**

```tsx
"use client";
import { useState } from "react";

import { CalendarioDePeriodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { useT } from "@/hooks/i18n/useT";
import {
  TIPOS_DE_DATA_DISPONIVEIS,
  comPeriodo,
  periodoDosFiltros,
  type PeriodoDoFiltro,
} from "@/lib/escale/filtros/periodo";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";

import { GatilhoComPainel } from "./GatilhoComPainel";

/**
 * "DATA" (fork Escale, Casca V4; print do usuário de 15/10,
 * `docs/escale/clint/prints-do-usuario/2026-10-15-filtro-data-aberto.png`): o
 * calendário da V1 com as abas de tipo, os atalhos e dois meses. As abas valem
 * criação, ganho e perda; a do relógio fica desligada (D3).
 *
 * A aba escolhida sem datas fica só na tela: filtro sem período não é filtro.
 * Trocar de aba com um período aplicado leva o período para o tipo novo.
 */
export function FiltroDeData({ filtros, onMudar }: { filtros: FiltrosDoQuadro; onMudar: (filtros: FiltrosDoQuadro) => void }) {
  const t = useT();
  const aplicado = periodoDosFiltros(filtros);
  const [tipo, setTipo] = useState<PeriodoDoFiltro["tipo"]>(aplicado?.tipo ?? "criacao");
  const valor: PeriodoDoFiltro = aplicado && aplicado.tipo === tipo ? aplicado : { tipo };

  return (
    <GatilhoComPainel
      rotulo={t("Data")}
      contagem={aplicado ? 1 : 0}
      onLimpar={() => onMudar(comPeriodo(filtros, { tipo }))}
      className="w-auto p-0"
      testId="filtro-data"
    >
      <CalendarioDePeriodo
        valor={valor}
        tiposDisponiveis={[...TIPOS_DE_DATA_DISPONIVEIS]}
        aoMudar={(p) => {
          const soTrocouATela = p.tipo !== tipo && !p.de && !p.ate && aplicado !== null;
          setTipo(p.tipo);
          onMudar(comPeriodo(filtros, soTrocouATela && aplicado ? { ...aplicado, tipo: p.tipo } : p));
        }}
      />
    </GatilhoComPainel>
  );
}
```

- [ ] **Step 5: `components/escale/filtros/StatusDoQuadro.tsx`**

Troque o arquivo inteiro por:

```tsx
"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { STATUS_DO_NEGOCIO, normalizarStatus, type StatusDoNegocio } from "@/lib/escale/filtros/tipos";

import { RotuloDoGrupo } from "./controles";
import { GatilhoComPainel } from "./GatilhoComPainel";

const ROTULOS: Record<StatusDoNegocio, string> = {
  open: "Em aberto",
  won: "Ganhos",
  lost: "Perdidos",
};

/**
 * O STATUS DO QUADRO (fork Escale, Fase 1D; gatilho "Status 1" da barra da Clint
 * na Casca V4). "Em aberto" é o padrão, e dá para juntar ganhos e perdidos. O
 * selo conta os status escolhidos. Pelo menos um fica marcado: um quadro sem
 * status seria vazio sem explicação. O conteúdo aberto não tem print (PRINT 28).
 */
export function StatusDoQuadro({
  status,
  onMudar,
}: {
  status: readonly StatusDoNegocio[];
  onMudar: (status: StatusDoNegocio[]) => void;
}) {
  const t = useT();

  function alternar(s: StatusDoNegocio) {
    const proximos = status.includes(s) ? status.filter((x) => x !== s) : [...status, s];
    if (proximos.length === 0) return;
    onMudar(normalizarStatus(proximos));
  }

  return (
    <GatilhoComPainel rotulo={t("Status")} contagem={status.length} testId="status-do-quadro" className="w-56">
      <div className="space-y-2">
        <RotuloDoGrupo>{t("Status do negócio")}</RotuloDoGrupo>
        {STATUS_DO_NEGOCIO.map((s) => (
          <CaixaDaCasca
            key={s}
            marcada={status.includes(s)}
            aoMudar={() => alternar(s)}
            rotulo={t(ROTULOS[s])}
            desabilitada={status.length === 1 && status.includes(s)}
          />
        ))}
        <BotaoDaCasca type="button" variante="texto" tamanho="sm" onClick={() => onMudar([...STATUS_DO_NEGOCIO])}>
          {t("Mostrar todos")}
        </BotaoDaCasca>
      </div>
    </GatilhoComPainel>
  );
}
```

- [ ] **Step 6: `components/escale/filtros/GatilhosDoQuadro.tsx`**

```tsx
"use client";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import { contarPorGatilho, limparGatilho } from "@/lib/escale/filtros/gatilhos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import type { Lead } from "@/lib/types/leads";

import { GatilhoComPainel } from "./GatilhoComPainel";
import { SecaoCampos } from "./SecaoCampos";
import { SecaoConversas } from "./SecaoConversas";
import { SecaoDono } from "./SecaoDono";
import { SecaoNegocio } from "./SecaoNegocio";
import { SecaoOutros } from "./SecaoOutros";
import { SecaoTags } from "./SecaoTags";

/**
 * CAMPOS, TAGS, DONO DO NEGÓCIO E MAIS FILTROS (fork Escale, Casca V4): quatro dos
 * seis gatilhos da barra da Clint (print da barra de 15/10). O conteúdo aberto de
 * cada um não tem print na variante superior (PRINTS 25 a 29): é a lógica da 1D
 * com o visual da casca. "Mais filtros" junta Conversas, Negócio (valor,
 * atrasados, perda) e Outros (atividades e tempo).
 */
type Base = { filtros: FiltrosDoQuadro; onMudar: (filtros: FiltrosDoQuadro) => void };

const LARGO = "w-[min(26rem,calc(100vw-2rem))]";

export function GatilhoDeCampos({ filtros, onMudar, campos }: Base & { campos: readonly CampoFiltravel[] }) {
  const t = useT();
  return (
    <GatilhoComPainel
      rotulo={t("Campos")}
      contagem={contarPorGatilho(filtros).campos}
      onLimpar={() => onMudar(limparGatilho(filtros, "campos"))}
      className={LARGO}
    >
      <SecaoCampos filtros={filtros} onMudar={onMudar} campos={campos} />
    </GatilhoComPainel>
  );
}

export function GatilhoDeTags({ filtros, onMudar, leads }: Base & { leads: readonly Lead[] }) {
  const t = useT();
  return (
    <GatilhoComPainel
      rotulo={t("Tags")}
      contagem={contarPorGatilho(filtros).tags}
      onLimpar={() => onMudar(limparGatilho(filtros, "tags"))}
      className="w-72"
    >
      <SecaoTags filtros={filtros} onMudar={onMudar} leads={leads} />
    </GatilhoComPainel>
  );
}

export function GatilhoDoDono({ filtros, onMudar }: Base) {
  const t = useT();
  return (
    <GatilhoComPainel
      rotulo={t("Dono do negócio")}
      contagem={contarPorGatilho(filtros).dono}
      onLimpar={() => onMudar(limparGatilho(filtros, "dono"))}
      className="w-72"
    >
      {(fechar) => <SecaoDono filtros={filtros} onMudar={onMudar} onEscolher={fechar} />}
    </GatilhoComPainel>
  );
}

export function GatilhoMaisFiltros({
  filtros,
  onMudar,
  leads,
  settings,
}: Base & { leads: readonly Lead[]; settings?: Record<string, unknown> }) {
  const t = useT();
  return (
    <GatilhoComPainel
      rotulo={t("Mais filtros")}
      contagem={contarPorGatilho(filtros).mais}
      onLimpar={() => onMudar(limparGatilho(filtros, "mais"))}
      className={LARGO}
    >
      <div className="space-y-6">
        <Bloco titulo={t("Conversas")}>
          <SecaoConversas filtros={filtros} onMudar={onMudar} />
        </Bloco>
        <Bloco titulo={t("Negócio")}>
          <SecaoNegocio filtros={filtros} onMudar={onMudar} leads={leads} settings={settings} />
        </Bloco>
        <Bloco titulo={t("Outros")}>
          <SecaoOutros filtros={filtros} onMudar={onMudar} />
        </Bloco>
      </div>
    </GatilhoComPainel>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-casca-texto">{titulo}</h3>
      {children}
    </section>
  );
}
```

- [ ] **Step 7: Rodar**

```bash
corepack pnpm vitest run tests/unit/escale-gatilhos-do-quadro.test.tsx tests/unit/escale-secoes-de-filtro.test.tsx tests/unit/escale-secoes-campos-dono-negocio.test.tsx
```
Expected: PASS nos três.

- [ ] **Step 8: Typecheck, lint, prettier e commit**

`BarraDoQuadro` e `PainelDeFiltros` ainda são os da 1D (a Task 8 troca): o `StatusDoQuadro` novo tem a mesma assinatura, então tudo compila.

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/filtros tests/unit/escale-gatilhos-do-quadro.test.tsx
corepack pnpm exec prettier --write components/escale/filtros/GatilhoComPainel.tsx components/escale/filtros/FiltroDeData.tsx components/escale/filtros/StatusDoQuadro.tsx components/escale/filtros/GatilhosDoQuadro.tsx tests/unit/escale-gatilhos-do-quadro.test.tsx
git add components/escale/filtros tests/unit/escale-gatilhos-do-quadro.test.tsx
git commit -m "feat(escale): os seis gatilhos da barra da Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: A barra inteira, a linha de contagem e a engrenagem

**Files:**
- Create: `components/escale/filtros/LinhaDeContagem.tsx`, `components/escale/filtros/MenuDaEngrenagem.tsx`
- Modify (reescrever): `components/escale/filtros/BarraDoQuadro.tsx`, `tests/unit/escale-barra-do-quadro.test.tsx`
- Delete: `components/escale/filtros/PainelDeFiltros.tsx`, `components/escale/filtros/ResumoDosFiltros.tsx`

**Interfaces:**
- Consumes: Task 7 (gatilhos), Task 6 (`OrdenarCards`, `MenuDeFiltrosSalvos`), Task 4 (`partesDaContagem`), `BotaoDaCasca`, `PainelSuspenso` (V1).
- Produces:
  - `BarraDoQuadro` com as MESMAS props da 1D (`BarraDoQuadroProps`). A página do funil e a da Visualização não mudam a chamada;
  - `LinhaDeContagem({ contagem, ordemAtiva, onAtualizar, atualizando?, engrenagem })` (`data-testid="contagem-do-quadro"` no texto);
  - `MenuDaEngrenagem({ alvo, filtros, filtroSalvoId, campos, onMudar, onTrocarTudo })`.

- [ ] **Step 1: Reescrever o teste (vai falhar)**

Troque `tests/unit/escale-barra-do-quadro.test.tsx` inteiro por:

```tsx
import { existsSync } from "node:fs";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: [] }) }));
vi.mock("@/components/escale/filtros/MenuDeFiltrosSalvos", () => ({ MenuDeFiltrosSalvos: () => <p>filtros salvos</p> }));

import { BarraDoQuadro, type BarraDoQuadroProps } from "@/components/escale/filtros/BarraDoQuadro";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const CAMPOS = camposFiltraveis([{ fields: [{ key: "renda", label: "Renda", type: "number" }] }]);
const ORDEM = [{ campo: "negocio.valor", direcao: "desc" as const }];

function barra(filtros: FiltrosDoQuadro = { status: ["open"] }, extra: Partial<BarraDoQuadroProps> = {}) {
  const props: BarraDoQuadroProps = {
    alvo: { tipo: "origem", id: "p-1" },
    filtros,
    filtroSalvoId: "s-1",
    onMudar: vi.fn(),
    leads: [negocio("l1", { tags: ["vip"] })],
    campos: CAMPOS,
    contagem: 21,
    onAtualizar: vi.fn(),
    ...extra,
  };
  const { rerender } = render(<BarraDoQuadro {...props} />);
  return { ...props, props, rerender, u: userEvent.setup({ pointerEventsCheck: 0 }) };
}

describe("<BarraDoQuadro> da casca (Casca V4)", () => {
  it("a busca e os seis gatilhos, na ordem da Clint", () => {
    barra();
    expect(screen.getByRole("searchbox", { name: "Pesquisar nessa origem…" })).toBeInTheDocument();
    const grupo = screen.getByRole("group", { name: "Filtros" });
    expect(within(grupo).getAllByRole("button").map((b) => b.textContent?.replace(/\d+/g, "").trim())).toEqual([
      "Data",
      "Campos",
      "Tags",
      "Dono do negócio",
      "Status",
      "Mais filtros",
    ]);
  });

  it("na visualização, a busca diz 'nessa visualização'", () => {
    barra({ status: ["open"] }, { alvo: { tipo: "visualizacao", id: "v-1" } });
    expect(screen.getByRole("searchbox", { name: "Pesquisar nessa visualização…" })).toBeInTheDocument();
  });

  it("a contagem usa o número real e o plural", () => {
    const { props, rerender } = barra();
    expect(screen.getByTestId("contagem-do-quadro")).toHaveTextContent("21 oportunidades de Negócio");
    rerender(<BarraDoQuadro {...props} contagem={1} />);
    expect(screen.getByTestId("contagem-do-quadro")).toHaveTextContent("1 oportunidade de Negócio");
    rerender(<BarraDoQuadro {...props} contagem={0} />);
    expect(screen.getByTestId("contagem-do-quadro")).toHaveTextContent("0 oportunidades de Negócio");
  });

  it("a busca espera a pessoa parar de digitar e mantém o filtro salvo aplicado", async () => {
    const { onMudar, u } = barra();
    await u.type(screen.getByRole("searchbox", { name: "Pesquisar nessa origem…" }), "ana");
    await waitFor(() => expect(onMudar).toHaveBeenCalledWith({ status: ["open"], busca: "ana" }, "s-1"));
    expect(onMudar).toHaveBeenCalledTimes(1);
  });

  it("o selo de cada gatilho mostra o que está ligado", () => {
    barra({ status: ["open", "won"], tags: ["vip"], dono: "u-1" });
    expect(screen.getByTestId("status-do-quadro")).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: /^Tags/ })).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: /^Dono do negócio/ })).toHaveTextContent("1");
  });

  it("o status muda pelo gatilho, mantendo o filtro salvo aplicado", async () => {
    const { onMudar, u } = barra();
    await u.click(screen.getByTestId("status-do-quadro"));
    await u.click(screen.getByRole("checkbox", { name: "Ganhos" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open", "won"] }, "s-1");
  });

  it("Ordenar mora na engrenagem: monta os critérios e aplica", async () => {
    const { onMudar, u } = barra();
    await u.click(screen.getByRole("button", { name: "Configurações do quadro" }));
    await u.click(screen.getByRole("button", { name: /^Ordenar/ }));
    expect(screen.getByText("Nenhum critério de ordenação")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Adicionar critério" }));
    await u.click(screen.getByRole("combobox", { name: "Campo 1" }));
    expect(screen.getByRole("option", { name: "Renda" })).toBeInTheDocument();
    await u.click(screen.getByRole("option", { name: "Valor do negócio" }));
    await u.click(screen.getByRole("combobox", { name: "Direção 1" }));
    await u.click(screen.getByRole("option", { name: "Decrescente" }));
    await u.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open"], ordem: ORDEM }, "s-1");
  });

  it("com ordenação ativa, avisa que arrastar dentro da coluna está desligado", () => {
    barra({ status: ["open"], ordem: ORDEM });
    expect(screen.getByText(/Ordenação ativa/)).toBeInTheDocument();
  });

  it("Atualizar relê o quadro", async () => {
    const { onAtualizar, u } = barra();
    await u.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(onAtualizar).toHaveBeenCalled();
  });

  it("Exportar e Ajuda aparecem como na Clint, desligados", () => {
    barra();
    expect(screen.getByRole("button", { name: "Exportar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Ajuda" })).toBeDisabled();
  });

  it("na engrenagem: os filtros salvos, Limpar filtros (solta o filtro salvo) e Personalizar desligado", async () => {
    const { onMudar, u } = barra({ status: ["open", "won"], tags: ["vip"], ordem: ORDEM });
    await u.click(screen.getByRole("button", { name: "Configurações do quadro" }));
    expect(screen.getByText("filtros salvos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Personalizar cards/ })).toBeDisabled();
    await u.click(screen.getByRole("button", { name: /Limpar filtros/ }));
    expect(onMudar).toHaveBeenCalledWith({ status: ["open", "won"], ordem: ORDEM }, null);
  });

  it("o painel único de filtros e os chips saíram: a Clint usa um gatilho por filtro (D4)", () => {
    expect(existsSync("components/escale/filtros/PainelDeFiltros.tsx")).toBe(false);
    expect(existsSync("components/escale/filtros/ResumoDosFiltros.tsx")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-barra-do-quadro.test.tsx
```
Expected: FAIL (não há `group` "Filtros", nem `contagem-do-quadro`, nem a engrenagem).

- [ ] **Step 3: `components/escale/filtros/LinhaDeContagem.tsx`**

```tsx
"use client";
import type { ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { partesDaContagem } from "@/lib/escale/quadro/aparencia";
import { Download, MessageSquare, RefreshCw } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A LINHA DE CONTAGEM E AÇÕES (fork Escale, Casca V4; 01-010 e o recorte
 * `docs/escale/clint/crops/icons-right.png`): "N oportunidades de **Negócio**"
 * (número real e plural, D14) à esquerda; atualizar, exportar, engrenagem e
 * ajuda à direita. Exportar (1E) e ajuda ficam desligados (D6; PRINTS 16 e 17).
 */
export function LinhaDeContagem({
  contagem,
  ordemAtiva,
  onAtualizar,
  atualizando = false,
  engrenagem,
}: {
  contagem: number;
  ordemAtiva: boolean;
  onAtualizar: () => void;
  atualizando?: boolean;
  engrenagem: ReactNode;
}) {
  const t = useT();
  const { antes, depois } = partesDaContagem(
    contagem === 1 ? t("{n} oportunidade de {negocio}") : t("{n} oportunidades de {negocio}"),
    contagem,
  );
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-casca-texto" aria-live="polite" data-testid="contagem-do-quadro">
          {antes}
          <span className="font-semibold">{t("Negócio")}</span>
          {depois}
        </p>
        {ordemAtiva ? (
          <p className="text-[11px] text-casca-suave">
            {t("Ordenação ativa · arrastar para reordenar dentro da coluna está desabilitado. Mover de etapa continua funcionando.")}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <BotaoDaCasca
          type="button"
          variante="icone"
          onClick={onAtualizar}
          disabled={atualizando}
          aria-label={t("Atualizar")}
          title={t("Atualizar")}
        >
          <RefreshCw size={17} aria-hidden className={cn(atualizando && "animate-spin")} />
        </BotaoDaCasca>
        <BotaoDaCasca
          type="button"
          variante="icone"
          disabled
          aria-label={t("Exportar")}
          title={t("Em breve")}
          // O BotaoDaCasca desligado tem `pointer-events-none`; sem o `auto`, a dica "Em breve" não apareceria.
          className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:text-[#BDBDBD]"
        >
          <Download size={16} aria-hidden />
        </BotaoDaCasca>
        {engrenagem}
        <BotaoDaCasca
          type="button"
          variante="icone"
          disabled
          aria-label={t("Ajuda")}
          title={t("Em breve")}
          className="bg-casca-marca-suave disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <IconeDeAjuda />
        </BotaoDaCasca>
      </div>
    </div>
  );
}

/** O "?" dentro de um balão quadrado da Clint (lucide não tem esse ícone pronto). */
function IconeDeAjuda() {
  return (
    <span aria-hidden className="relative grid place-items-center">
      <MessageSquare size={16} />
      <span className="absolute -mt-0.5 text-[9px] font-semibold leading-none">?</span>
    </span>
  );
}
```

- [ ] **Step 4: `components/escale/filtros/MenuDaEngrenagem.tsx`**

```tsx
"use client";
import { useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import type { AlvoDoFiltro } from "@/lib/escale/filtros/filtros-salvos";
import { limparCriterios, temCriterios, type FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { Settings, SlidersHorizontal, X } from "@/lib/ui/icons-da-casca";

import { CLASSE_DA_LINHA_DO_MENU } from "./controles";
import { MenuDeFiltrosSalvos } from "./MenuDeFiltrosSalvos";
import { OrdenarCards } from "./OrdenarCards";

/**
 * A ENGRENAGEM DA LINHA DE AÇÕES (fork Escale, Casca V4; D5). A Clint superior
 * não mostra o que ela abre (PRINT 15). Aqui moram o que a 1D já entregou e a
 * variante superior não mostra: Ordenar e Filtros salvos (PRINTS 31 e 32), mais
 * "Limpar filtros" e "Personalizar cards", desligado até a 1E (PRINT 33).
 */
export function MenuDaEngrenagem({
  alvo,
  filtros,
  filtroSalvoId,
  campos,
  onMudar,
  onTrocarTudo,
}: {
  alvo: AlvoDoFiltro;
  filtros: FiltrosDoQuadro;
  filtroSalvoId: string | null;
  campos: readonly CampoFiltravel[];
  onMudar: (filtros: FiltrosDoQuadro) => void;
  /** Troca filtros e filtro salvo de uma vez (aplicar um salvo, limpar tudo). */
  onTrocarTudo: (filtros: FiltrosDoQuadro, filtroSalvoId: string | null) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <BotaoDaCasca type="button" variante="icone" aria-label={t("Configurações do quadro")} title={t("Configurações do quadro")}>
          <Settings size={16} aria-hidden />
        </BotaoDaCasca>
      </PopoverTrigger>
      <PainelSuspenso align="end" sideOffset={8} aria-label={t("Configurações do quadro")} className="w-56 p-1">
        <OrdenarCards ordem={filtros.ordem} campos={campos} onAplicar={(ordem) => onMudar({ ...filtros, ordem })} />
        <MenuDeFiltrosSalvos alvo={alvo} filtros={filtros} filtroSalvoId={filtroSalvoId} onAplicar={onTrocarTudo} />
        <button
          type="button"
          disabled={!temCriterios(filtros)}
          onClick={() => onTrocarTudo(limparCriterios(filtros), null)}
          className={CLASSE_DA_LINHA_DO_MENU}
        >
          <X size={14} aria-hidden />
          {t("Limpar filtros")}
        </button>
        <div className="my-1 h-px bg-casca-borda" aria-hidden />
        <button type="button" disabled title={t("Em breve")} className={CLASSE_DA_LINHA_DO_MENU}>
          <SlidersHorizontal size={14} aria-hidden />
          {t("Personalizar cards")}
        </button>
      </PainelSuspenso>
    </Popover>
  );
}
```

- [ ] **Step 5: Reescrever `components/escale/filtros/BarraDoQuadro.tsx`**

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import type { AlvoDoFiltro } from "@/lib/escale/filtros/filtros-salvos";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import type { Lead } from "@/lib/types/leads";
import { Search } from "@/lib/ui/icons-da-casca";

import { FiltroDeData } from "./FiltroDeData";
import { GatilhoDeCampos, GatilhoDeTags, GatilhoDoDono, GatilhoMaisFiltros } from "./GatilhosDoQuadro";
import { LinhaDeContagem } from "./LinhaDeContagem";
import { MenuDaEngrenagem } from "./MenuDaEngrenagem";
import { StatusDoQuadro } from "./StatusDoQuadro";

export interface BarraDoQuadroProps {
  alvo: AlvoDoFiltro;
  filtros: FiltrosDoQuadro;
  /** O filtro salvo aplicado (fica aplicado enquanto a pessoa ajusta: vira "alterado"). */
  filtroSalvoId: string | null;
  onMudar: (filtros: FiltrosDoQuadro, filtroSalvoId: string | null) => void;
  /** Todos os cards, SEM filtro: é deles que saem as opções de tags e de motivos. */
  leads: readonly Lead[];
  campos: readonly CampoFiltravel[];
  settings?: Record<string, unknown>;
  /** Quantos negócios o quadro mostra agora. */
  contagem: number;
  onAtualizar: () => void;
  atualizando?: boolean;
}

const ESPERA_DA_BUSCA_MS = 250;

/**
 * A BARRA DO QUADRO DA CASCA (fork Escale, Fase 1D; visual da Clint na Casca V4:
 * 01-010 e o print da barra de 15/10). Linha 1: a busca e os seis gatilhos, na
 * ordem da Clint. Linha 2: a contagem e as ações. Os critérios ativos aparecem
 * no selo de cada gatilho (D4).
 */
export function BarraDoQuadro({
  alvo,
  filtros,
  filtroSalvoId,
  onMudar,
  leads,
  campos,
  settings,
  contagem,
  onAtualizar,
  atualizando = false,
}: BarraDoQuadroProps) {
  const t = useT();
  // Muda só quando os filtros vêm de fora da digitação (filtro salvo, limpar):
  // é o que reinicia a caixa de busca com o texto novo.
  const [geracao, setGeracao] = useState(0);
  const mudar = useCallback((proximos: FiltrosDoQuadro) => onMudar(proximos, filtroSalvoId), [onMudar, filtroSalvoId]);
  const buscar = useCallback((busca: string) => mudar({ ...filtros, busca: busca || undefined }), [mudar, filtros]);

  function trocarTudo(proximos: FiltrosDoQuadro, salvoId: string | null) {
    setGeracao((g) => g + 1);
    onMudar(proximos, salvoId);
  }

  return (
    <div className="mt-4 flex flex-col gap-6" data-barra-do-quadro>
      <div role="group" aria-label={t("Filtros")} className="flex flex-wrap items-center gap-3.5">
        <CampoDeBusca
          key={geracao}
          atual={filtros.busca ?? ""}
          onBuscar={buscar}
          rotulo={alvo.tipo === "origem" ? t("Pesquisar nessa origem…") : t("Pesquisar nessa visualização…")}
        />
        <FiltroDeData filtros={filtros} onMudar={mudar} />
        <GatilhoDeCampos filtros={filtros} onMudar={mudar} campos={campos} />
        <GatilhoDeTags filtros={filtros} onMudar={mudar} leads={leads} />
        <GatilhoDoDono filtros={filtros} onMudar={mudar} />
        <StatusDoQuadro status={filtros.status} onMudar={(status) => mudar({ ...filtros, status })} />
        <GatilhoMaisFiltros filtros={filtros} onMudar={mudar} leads={leads} settings={settings} />
      </div>
      <LinhaDeContagem
        contagem={contagem}
        ordemAtiva={Boolean(filtros.ordem?.length)}
        onAtualizar={onAtualizar}
        atualizando={atualizando}
        engrenagem={
          <MenuDaEngrenagem
            alvo={alvo}
            filtros={filtros}
            filtroSalvoId={filtroSalvoId}
            campos={campos}
            onMudar={mudar}
            onTrocarTudo={trocarTudo}
          />
        }
      />
    </div>
  );
}

/**
 * A busca da Clint (design system §6.4): 109×32, fundo claro, sem borda e sem
 * placeholder, lupa à direita. Espera a pessoa parar de digitar (250ms, o mesmo
 * do `FilterBar` do original) e compara com o valor de FORA (`atual`).
 */
function CampoDeBusca({ atual, rotulo, onBuscar }: { atual: string; rotulo: string; onBuscar: (busca: string) => void }) {
  const [valor, setValor] = useState(atual);
  useEffect(() => {
    if (valor === atual) return;
    const id = setTimeout(() => onBuscar(valor), ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(id);
  }, [valor, atual, onBuscar]);
  return (
    <div className="relative h-8 w-[109px] shrink-0">
      <input
        type="search"
        aria-label={rotulo}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="h-8 w-full rounded-casca-gatilho border-0 bg-casca-busca pr-7 pl-2.5 text-xs text-casca-texto outline-hidden focus:ring-1 focus:ring-casca-marca [&::-webkit-search-cancel-button]:hidden"
      />
      <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-casca-suave" />
    </div>
  );
}
```

- [ ] **Step 6: Apagar o painel único e os chips**

```bash
git rm -q components/escale/filtros/PainelDeFiltros.tsx components/escale/filtros/ResumoDosFiltros.tsx
grep -rn "PainelDeFiltros\|ResumoDosFiltros" app components hooks lib tests || echo "nenhuma referência"
```
Expected: "nenhuma referência". `contarPorSecao`, `limparSecao`, `criteriosAtivos` e `removerCriterio` de `lib/escale/filtros/tipos.ts` continuam (têm testes da 1D e servem ao resumo do filtro salvo).

- [ ] **Step 7: Rodar**

```bash
corepack pnpm vitest run tests/unit/escale-barra-do-quadro.test.tsx tests/unit/escale-gatilhos-do-quadro.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx
```
Expected: PASS nos quatro (as páginas mocam a barra).

- [ ] **Step 8: Typecheck, lint, prettier e commit**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/filtros tests/unit/escale-barra-do-quadro.test.tsx
corepack pnpm exec prettier --write components/escale/filtros/LinhaDeContagem.tsx components/escale/filtros/MenuDaEngrenagem.tsx components/escale/filtros/BarraDoQuadro.tsx tests/unit/escale-barra-do-quadro.test.tsx
git add -A components/escale/filtros tests/unit/escale-barra-do-quadro.test.tsx
git commit -m "feat(escale): barra do quadro igual à Clint (busca, 6 gatilhos, contagem e ações)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: O card da Clint

**Files:**
- Create: `components/escale/quadro/PecasDoCard.tsx`, `components/escale/quadro/CardDaCasca.tsx`, `tests/unit/escale-card-da-casca.test.tsx`

**Interfaces:**
- Consumes: Task 4 (`aparencia.ts`), `CaixaDaCasca` (V1), do original (sem mudar): `KanbanCardActions`, `NextActionSlot`, `ReactivationSlot`, `ScoreSlot`, `AbrirConversaDoLead`/`temAlvoParaAbrir`, `resolveCardState`, `CardInput`, `GestoDeSelecao`, `marcadoresDoCard`, `useCorDaEtiqueta`, `Avatar`.
- Produces: `CardDaCasca(props: CardDaCascaProps)`, com as props do `KanbanCard` mais `nomes?` (user_id → nome, para o atendente) e `origem?` (o nome da origem, na Visualização). Marca `data-card-da-casca={id}`.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-card-da-casca.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hello-pangea/dnd", () => ({
  Draggable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }, { isDragging: false }),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/components/kanban/KanbanCardActions", () => ({
  KanbanCardActions: () => <button type="button">ações do card</button>,
}));
vi.mock("@/components/kanban/NextActionSlot", () => ({
  NextActionSlot: ({ label }: { label: string }) => <p>{`próxima ação: ${label}`}</p>,
}));
vi.mock("@/components/kanban/AbrirConversaDoLead", () => ({
  temAlvoParaAbrir: (contactId?: string | null, phone?: string | null) => Boolean(contactId) || Boolean(phone?.trim()),
  AbrirConversaDoLead: () => <button type="button">Abrir conversa</button>,
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({
  useCorDaEtiqueta: (tag: string | null | undefined) => (tag === "obra_notificada" ? "#cf3716" : null),
}));

import { CardDaCasca } from "@/components/escale/quadro/CardDaCasca";
import { buildCardInput } from "@/lib/kanban/card-state";
import type { Lead } from "@/lib/types/leads";
import { AGORA, horasAtras, negocio } from "@/tests/helpers/negocio-do-quadro";

const NOMES = new Map<string, string | null>([
  ["u-ana", "Ana"],
  ["u-ivo", "Ivo"],
]);

function montar(lead: Lead, extra: Partial<ComponentProps<typeof CardDaCasca>> = {}) {
  const onOpen = vi.fn();
  const onSelect = vi.fn();
  render(
    <CardDaCasca
      card={buildCardInput(lead, { stageName: "Entrada", ownerNames: NOMES, now: AGORA })}
      lead={lead}
      index={0}
      pipelineId="p-1"
      onOpen={onOpen}
      onSelect={onSelect}
      nomes={NOMES}
      {...extra}
    />,
  );
  return { onOpen, onSelect, u: userEvent.setup({ pointerEventsCheck: 0 }) };
}

const COMPLETO = negocio(
  "l1",
  {
    title: "+5511999990000",
    contact_id: "c1",
    contact_phone: "+5511999990000",
    contact_email: "reinaldo@x.com",
    tags: ["obra_notificada", "em_andamento"],
    value_cents: 6_480_000,
    currency: "BRL",
    owner_kind: "user",
    owner_user_id: "u-ivo",
    stage_changed_at: horasAtras(31),
    tarefas: { abertas: 3, atrasadas: 0 },
    conversa: { id: "conv-1", preview: "Obrigado por entrar em contato", last_message_at: "2026-09-23T15:00:00Z", unread: 2 },
  },
  {
    contato_nome: "Reinaldo Fernandes",
    atividades_concluidas: 2,
    conversa: {
      status: "open",
      canal: "whatsapp",
      atendente_id: "u-ana",
      ultima_entrada: "2026-09-23T14:00:00Z",
      ultima_saida: "2026-09-23T15:00:00Z",
    },
  },
);

describe("<CardDaCasca> (Casca V4, 01-010)", () => {
  it("o nome é o do contato, o clique no card abre o dossiê, e o ⋮ de ações continua", async () => {
    const { onOpen, u } = montar(COMPLETO);
    expect(screen.getByRole("group", { name: "Lead: Reinaldo Fernandes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ações do card" })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Reinaldo Fernandes" }));
    expect(onOpen).toHaveBeenCalledWith("l1");
  });

  it("as tags são chips na paleta da Clint; sem cor, o azul padrão", () => {
    montar(COMPLETO);
    expect(screen.getByText("obra_notificada")).toHaveStyle({ backgroundColor: "#FFAAA3", color: "#F44336" });
    expect(screen.getByText("em_andamento")).toHaveStyle({ backgroundColor: "#91CEFF", color: "#2196F3" });
  });

  it("a caixa da mensagem: leva à conversa, ✓✓ da equipe, inicial do atendente, não lidas e a data", () => {
    montar(COMPLETO);
    const caixa = screen.getByRole("link", { name: /Obrigado por entrar/ });
    expect(caixa).toHaveAttribute("href", "/app/inbox?id=conv-1");
    expect(within(caixa).getByLabelText("Mensagem enviada")).toBeInTheDocument();
    expect(within(caixa).getByText("A")).toBeInTheDocument();
    expect(within(caixa).getByLabelText("2 sem ler")).toHaveTextContent("2");
    expect(within(caixa).getByText("23/09")).toBeInTheDocument();
  });

  it("o rodapé: dono, chamar, conversa, e-mail, valor curto, atividades e tempo na etapa", () => {
    montar(COMPLETO);
    expect(screen.getByRole("img", { name: "Responsável: Ivo" })).toHaveTextContent("I");
    expect(screen.getByRole("link", { name: "Chamar" })).toHaveAttribute("href", "tel:+5511999990000");
    expect(screen.getByRole("link", { name: "Abrir esta conversa no Inbox" })).toHaveAttribute("href", "/app/inbox?id=conv-1");
    expect(screen.getByRole("link", { name: "Enviar e-mail" })).toHaveAttribute("href", "mailto:reinaldo@x.com");
    expect(screen.getByText("R$64,8k")).toBeInTheDocument();
    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(screen.getByText("31h")).toBeInTheDocument();
  });

  it("sem contato, conversa, valor nem dono: nada quebra e nada diz 'undefined'", () => {
    montar(negocio("l2", { title: "Projeto X" }));
    expect(screen.getByRole("group", { name: "Lead: Projeto X" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Chamar" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sem telefone" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sem responsável" })).toBeInTheDocument();
    expect(screen.getByText("R$0")).toBeInTheDocument();
    expect(screen.getByText("0/0")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("undefined");
  });

  it("contato sem conversa e com telefone: a caixa oferece abrir a conversa", () => {
    montar(negocio("l3", { contact_id: "c3", contact_phone: "+5511988887777", conversa: null }));
    expect(screen.getByRole("button", { name: "Abrir conversa" })).toBeInTheDocument();
  });

  it("ctrl+clique seleciona sem abrir; a caixinha seleciona sem abrir", async () => {
    const { onOpen, onSelect, u } = montar(COMPLETO);
    await u.keyboard("{Control>}");
    await u.click(screen.getByRole("group", { name: "Lead: Reinaldo Fernandes" }));
    await u.keyboard("{/Control}");
    expect(onSelect).toHaveBeenCalledWith("l1", "alterna");
    await u.click(screen.getByRole("checkbox", { name: "Selecionar: Reinaldo Fernandes" }));
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("a linha do agente só aparece quando tem o que dizer", () => {
    montar(negocio("l4", { next_action: { label: "Ligar amanhã", seq: 1, proposed_at: "2026-10-15T10:00:00Z" } }));
    expect(screen.getByText("próxima ação: Ligar amanhã")).toBeInTheDocument();
  });

  it("na Visualização, o card diz de qual origem é", () => {
    montar(COMPLETO, { origem: "Leads PA" });
    expect(screen.getByText("Leads PA")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-card-da-casca.test.tsx
```
Expected: FAIL (`Cannot find module '@/components/escale/quadro/CardDaCasca'`).

- [ ] **Step 3: `components/escale/quadro/PecasDoCard.tsx`**

```tsx
"use client";
import Link from "next/link";
import type { MouseEvent } from "react";

import { AbrirConversaDoLead, temAlvoParaAbrir } from "@/components/kanban/AbrirConversaDoLead";
import { useCorDaEtiqueta } from "@/components/tags/CoresDasEtiquetas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useT } from "@/hooks/i18n/useT";
import { dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import {
  atividadesDoCard,
  coresDaTag,
  corDoAvatar,
  dataDaMensagem,
  fotoDoContato,
  idadeNaEtapa,
  inicialDoNome,
  ultimaFoiDaEquipe,
  valorCurto,
} from "@/lib/escale/quadro/aparencia";
import type { CardInput } from "@/lib/kanban/card-state";
import { marcadoresDoCard } from "@/lib/kanban/marcadores-do-card";
import type { Lead } from "@/lib/types/leads";
import { InstagramLogo, MessengerLogo, WhatsappLogo } from "@/lib/ui/icons";
import { CheckCheck, CheckCircle2, Clock, Mail, MessageCircle, Phone, User, UserX } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * AS PEÇAS DO CARD DA CLINT (fork Escale, Casca V4; 01-010 e
 * `docs/escale/clint/crops/card1.png`; medidas no design system §6.11). Todo
 * atalho para a propagação: o card inteiro abre o dossiê ao clique.
 */
const parar = (e: MouseEvent) => e.stopPropagation();
const TAGS_VISIVEIS = 3;

export function ChipsDoCard({ lead }: { lead: Lead }) {
  const tags = marcadoresDoCard(lead);
  if (tags.length === 0) return null;
  const visiveis = tags.slice(0, TAGS_VISIVEIS);
  const resto = tags.length - visiveis.length;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5" title={tags.join(", ")}>
      {visiveis.map((tag) => (
        <ChipDaTag key={tag} tag={tag} />
      ))}
      {resto > 0 ? <span className="text-[10px] text-casca-meta">{`+${resto}`}</span> : null}
    </div>
  );
}

function ChipDaTag({ tag }: { tag: string }) {
  const { fundo, texto } = coresDaTag(useCorDaEtiqueta(tag));
  return (
    <span
      className="inline-flex h-[15px] max-w-36 items-center truncate rounded-full px-2 text-[10px] leading-none"
      style={{ backgroundColor: fundo, color: texto }}
    >
      {tag}
    </span>
  );
}

/** A foto do canto: quadrada (raio 4) com foto; sem foto, a silhueta cinza da Clint. */
export function FotoDoContato({ lead }: { lead: Lead }) {
  const url = fotoDoContato(lead);
  const silhueta = (
    <span aria-hidden className="grid size-7 place-items-center rounded-full bg-casca-cinza-selo text-white">
      <User size={16} />
    </span>
  );
  if (!url) return silhueta;
  return (
    <Avatar className="size-7 rounded-[4px]">
      <AvatarImage src={url} alt="" className="object-cover" />
      <AvatarFallback className="rounded-full bg-transparent">{silhueta}</AvatarFallback>
    </Avatar>
  );
}

const NOME_DO_CANAL: Readonly<Record<string, string>> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
};

function LogoDoCanal({ canal }: { canal: string | null }) {
  const t = useT();
  const Icone = canal === "instagram" ? InstagramLogo : canal === "facebook" ? MessengerLogo : canal === "whatsapp" ? WhatsappLogo : null;
  const cor = canal === "instagram" ? "text-[#E4405F]" : canal === "facebook" ? "text-[#0866FF]" : "text-[#25D366]";
  return (
    <span role="img" aria-label={(canal && NOME_DO_CANAL[canal]) || t("Canal")} className={cn("relative inline-flex shrink-0", cor)}>
      {Icone ? <Icone size={14} weight="fill" aria-hidden /> : <MessageCircle size={14} aria-hidden />}
      <span aria-hidden className="absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full bg-casca-novo ring-1 ring-surface" />
    </span>
  );
}

/** A caixa da última mensagem (lavanda, borda azul-clara). Sem contato, não aparece. */
export function CaixaDaMensagem({ lead, nomes }: { lead: Lead; nomes?: Map<string, string | null> }) {
  const t = useT();
  const conversa = lead.conversa;
  if (conversa === undefined) return null;
  const caixa =
    "mx-2 mb-2 flex h-[34px] items-center gap-1.5 rounded-[6px] border border-casca-borda-msg bg-casca-caixa-msg px-1.5 text-[11px]";
  if (conversa === null) {
    return temAlvoParaAbrir(lead.contact_id, lead.contact_phone) ? (
      <div className={caixa} onClick={parar} onPointerDown={parar}>
        <AbrirConversaDoLead contactId={lead.contact_id} phone={lead.contact_phone} />
      </div>
    ) : null;
  }
  const extra = dadosDeFiltro(lead)?.conversa ?? null;
  const atendente = extra?.atendente_id ?? null;
  const nomeDoAtendente = atendente ? (nomes?.get(atendente) ?? null) : null;
  const preview = conversa.preview?.trim();
  return (
    <Link
      href={`/app/inbox?id=${conversa.id}`}
      onClick={parar}
      onPointerDown={parar}
      title={t("Abrir esta conversa no Inbox")}
      className={cn(caixa, "text-casca-suave hover:border-casca-marca")}
    >
      <LogoDoCanal canal={extra?.canal ?? null} />
      {ultimaFoiDaEquipe(extra) ? <CheckCheck size={14} aria-label={t("Mensagem enviada")} className="shrink-0" /> : null}
      <span className="min-w-0 flex-1 truncate">{preview || <span className="italic">{t("conversa sem mensagens")}</span>}</span>
      {atendente ? (
        <span
          className="grid size-[18px] shrink-0 place-items-center rounded-full text-[9px] font-semibold text-white"
          style={{ backgroundColor: corDoAvatar(atendente) }}
          title={nomeDoAtendente ?? undefined}
        >
          {inicialDoNome(nomeDoAtendente)}
        </span>
      ) : (
        <UserX size={14} aria-label={t("Sem atendente")} className="shrink-0 text-casca-meta" />
      )}
      {conversa.unread > 0 ? (
        <span
          aria-label={`${conversa.unread} ${t("sem ler")}`}
          className="grid h-[18px] min-w-4 shrink-0 place-items-center rounded-[4px] bg-casca-novo px-1 text-[10px] font-semibold text-white tabular-nums"
        >
          {conversa.unread}
        </span>
      ) : null}
      <span className="shrink-0 text-casca-meta tabular-nums">{dataDaMensagem(conversa.last_message_at)}</span>
    </Link>
  );
}

function AvatarDoDono({ card, lead }: { card: CardInput; lead: Lead }) {
  const t = useT();
  const { kind, name } = card.owner;
  if (!kind) {
    return (
      <span
        role="img"
        aria-label={t("Sem responsável")}
        title={t("Sem responsável")}
        className="grid size-5 shrink-0 place-items-center rounded-full bg-casca-cinza-selo text-white"
      >
        <User size={12} aria-hidden />
      </span>
    );
  }
  const rotulo = name ?? t(kind === "ai" ? "Agente" : "Responsável");
  const id = lead.owner_user_id ?? lead.owner_agent_id ?? rotulo;
  return (
    <span
      role="img"
      aria-label={`${t("Responsável")}: ${rotulo}`}
      title={rotulo}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
        kind === "ai" ? "border border-casca-marca bg-surface text-casca-marca" : "text-white",
      )}
      style={kind === "ai" ? undefined : { backgroundColor: corDoAvatar(id) }}
    >
      {inicialDoNome(name)}
    </span>
  );
}

/** O rodapé: dono, telefone, conversa, e-mail, valor e, à direita, atividades e tempo na etapa. */
export function RodapeDoCard({ card, lead }: { card: CardInput; lead: Lead }) {
  const t = useT();
  const { concluidas, total, atrasadas } = atividadesDoCard(lead);
  const idade = idadeNaEtapa(card.hoursInStage);
  const telefone = lead.contact_phone?.trim() || null;
  const email = lead.contact_email?.trim() || null;
  const icone = "grid size-4 shrink-0 place-items-center text-casca-meta hover:text-casca-marca";
  const desligado = "grid size-4 shrink-0 place-items-center text-casca-meta opacity-40";
  const dicaDasAtividades =
    t("{c} de {n} atividades concluídas").replace("{c}", String(concluidas)).replace("{n}", String(total)) +
    (atrasadas > 0 ? ` · ${atrasadas} ${atrasadas === 1 ? t("atrasada") : t("atrasadas")}` : "");
  return (
    <div className="flex min-h-9 items-center gap-2 border-t border-casca-borda px-2.5 py-1.5 text-[11px] text-casca-meta">
      <AvatarDoDono card={card} lead={lead} />
      {telefone ? (
        <a href={`tel:${telefone}`} onClick={parar} onPointerDown={parar} aria-label={t("Chamar")} title={telefone} className={icone}>
          <Phone size={12} aria-hidden />
        </a>
      ) : (
        <span role="img" aria-label={t("Sem telefone")} className={desligado}>
          <Phone size={12} aria-hidden />
        </span>
      )}
      {lead.conversa ? (
        <Link
          href={`/app/inbox?id=${lead.conversa.id}`}
          onClick={parar}
          onPointerDown={parar}
          aria-label={t("Abrir esta conversa no Inbox")}
          className={icone}
        >
          <MessageCircle size={12} aria-hidden />
        </Link>
      ) : (
        <span role="img" aria-label={t("Sem conversa")} className={desligado}>
          <MessageCircle size={12} aria-hidden />
        </span>
      )}
      {email ? (
        <a href={`mailto:${email}`} onClick={parar} onPointerDown={parar} aria-label={t("Enviar e-mail")} title={email} className={icone}>
          <Mail size={12} aria-hidden />
        </a>
      ) : (
        <span role="img" aria-label={t("Sem e-mail")} className={desligado}>
          <Mail size={12} aria-hidden />
        </span>
      )}
      <span className="font-medium tabular-nums">{valorCurto(card.valueCents, card.currency)}</span>
      <span className="ml-auto flex items-center gap-2 tabular-nums">
        <span title={dicaDasAtividades} className={cn("flex items-center gap-1", atrasadas > 0 && "font-semibold text-casca-alerta")}>
          <CheckCircle2 size={12} aria-hidden />
          {`${concluidas}/${total}`}
        </span>
        {idade ? (
          <span title={t("Tempo na etapa")} className="flex items-center gap-1">
            <Clock size={12} aria-hidden />
            {idade}
          </span>
        ) : null}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: `components/escale/quadro/CardDaCasca.tsx`**

```tsx
"use client";
import { Draggable } from "@hello-pangea/dnd";
import type { MouseEvent } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import type { GestoDeSelecao } from "@/components/kanban/KanbanCard";
import { KanbanCardActions } from "@/components/kanban/KanbanCardActions";
import { NextActionSlot } from "@/components/kanban/NextActionSlot";
import { ReactivationSlot } from "@/components/kanban/ReactivationSlot";
import { ScoreSlot } from "@/components/kanban/ScoreSlot";
import { useT } from "@/hooks/i18n/useT";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import { resolveCardState, type CardInput } from "@/lib/kanban/card-state";
import type { Lead } from "@/lib/types/leads";
import { cn } from "@/lib/utils";

import { CaixaDaMensagem, ChipsDoCard, FotoDoContato, RodapeDoCard } from "./PecasDoCard";

export interface CardDaCascaProps {
  card: CardInput;
  lead: Lead;
  index: number;
  /** A origem do card (na Visualização, a de cada card): ações e movimento usam esta. */
  pipelineId: string;
  isSelected?: boolean;
  isSelecting?: boolean;
  pulseCount?: number;
  onSelect?: (leadId: string, gesto: GestoDeSelecao) => void;
  onOpen?: (leadId: string) => void;
  /** user_id → nome: o atendente da caixa da mensagem. */
  nomes?: Map<string, string | null>;
  /** Na Visualização, o nome da origem do card, numa linha pequena abaixo do nome (D15). */
  origem?: string;
}

const parar = (e: MouseEvent) => e.stopPropagation();

/**
 * O CARD DA CLINT (fork Escale, Casca V4; `01-010-kanban-v1.png` e
 * `docs/escale/clint/crops/card1.png`). De cima para baixo: tags, nome com a
 * foto à direita, a caixa da última mensagem e o rodapé (dono, atalhos, valor,
 * atividades e tempo na etapa).
 *
 * Os comportamentos são os do `KanbanCard` do original, que segue intacto na
 * lateral: clique abre o dossiê, ctrl/cmd seleciona, shift estende, o ⋮ de
 * ações, o pulso do tempo real e a linha do agente (só quando tem o que dizer,
 * D9). A caixinha de seleção aparece no lugar da foto no hover (D10).
 */
export function CardDaCasca({
  card,
  lead,
  index,
  pipelineId,
  isSelected = false,
  isSelecting = false,
  pulseCount = 0,
  onSelect,
  onOpen,
  nomes,
  origem,
}: CardDaCascaProps) {
  const t = useT();
  const titulo = tituloDoCard(lead);
  const state = resolveCardState(card, t);

  const decidirClique = (e: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }): void => {
    if (e.shiftKey) {
      onSelect?.(card.id, "intervalo");
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      onSelect?.(card.id, "alterna");
      return;
    }
    onOpen?.(card.id);
  };

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          role="group"
          aria-label={`${t("Lead")}: ${titulo}`}
          onClick={decidirClique}
          data-card-da-casca={card.id}
          className={cn(
            "group relative w-full shrink-0 overflow-hidden rounded-casca-card bg-surface transition-shadow",
            "hover:shadow-[0_2px_8px_color-mix(in_oklab,var(--color-casca-marca)_15%,transparent)]",
            snapshot.isDragging && "rotate-1 shadow-casca-painel",
            isSelected && "ring-2 ring-casca-novo",
          )}
        >
          {pulseCount > 0 && (
            <span key={pulseCount} aria-hidden data-pulse={pulseCount} className="card-pulse pointer-events-none absolute inset-0" />
          )}

          <div className="min-h-[51px] p-2 pb-1">
            <ChipsDoCard lead={lead} />
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="mt-2 mb-1 truncate text-[13px] leading-[15px] font-medium text-casca-texto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      decidirClique(e);
                    }}
                    className="max-w-full truncate text-left hover:underline"
                  >
                    {titulo}
                  </button>
                </h3>
                {origem ? <p className="truncate text-[10px] text-casca-meta">{origem}</p> : null}
              </div>
              <div className="relative size-7 shrink-0">
                <FotoDoContato lead={lead} />
                <span
                  onClick={parar}
                  onPointerDown={parar}
                  className={cn(
                    "absolute inset-0 grid place-items-center rounded-full bg-surface transition-opacity",
                    isSelected || isSelecting ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
                  )}
                >
                  <CaixaDaCasca
                    marcada={isSelected}
                    aoMudar={() => onSelect?.(card.id, "alterna")}
                    aria-label={`${t("Selecionar")}: ${titulo}`}
                  />
                </span>
              </div>
            </div>
            <div
              onClick={parar}
              onPointerDown={parar}
              className="absolute top-1 right-10 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
            >
              <KanbanCardActions lead={lead} pipelineId={pipelineId} />
            </div>
          </div>

          <CaixaDaMensagem lead={lead} nomes={nomes} />

          {state.slot.type !== "idle" ? (
            <div className="flex min-h-6 items-center gap-2 px-2 pb-2 text-xs">
              {state.slot.type === "awaiting" && (
                <NextActionSlot
                  label={state.slot.label}
                  leadId={card.id}
                  approvedSeq={lead.next_action?.seq ?? -1}
                  pipelineId={pipelineId}
                />
              )}
              {state.slot.type === "reactivation" && (
                <ReactivationSlot
                  leadId={card.id}
                  proposalId={state.slot.proposalId}
                  expiresAt={state.slot.expiresAt}
                  pipelineId={pipelineId}
                />
              )}
              {state.slot.type === "cooling" && <span className="truncate text-warning-fg">{state.slot.label}</span>}
              {state.slot.type === "meter" && (
                <ScoreSlot
                  probability={state.slot.probability}
                  band={state.slot.band}
                  reason={state.slot.reason}
                  factors={state.slot.factors}
                />
              )}
            </div>
          ) : null}

          <RodapeDoCard card={card} lead={lead} />
        </div>
      )}
    </Draggable>
  );
}
```

- [ ] **Step 5: Rodar (e as cercas do card do original)**

```bash
corepack pnpm vitest run tests/unit/escale-card-da-casca.test.tsx tests/unit/kanban-atalho-conversa.test.tsx tests/unit/funil-mostra-dados-do-cliente.test.tsx
```
Expected: PASS nos três. Se o caso da linha do agente falhar porque o estado com `next_action` também precisa de `score` nulo, confira `resolveCardState` em `lib/kanban/card-state.ts`: `nextAction` vem antes de tudo e devolve `awaiting`. Corrija o código do card, não o teste.

- [ ] **Step 6: Typecheck, lint, prettier e commit**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/quadro tests/unit/escale-card-da-casca.test.tsx
corepack pnpm exec prettier --write components/escale/quadro/PecasDoCard.tsx components/escale/quadro/CardDaCasca.tsx tests/unit/escale-card-da-casca.test.tsx
git add components/escale/quadro tests/unit/escale-card-da-casca.test.tsx
git commit -m "feat(escale): card do quadro igual ao da Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: A coluna da Clint

**Files:**
- Create: `components/escale/quadro/ColunaDaCasca.tsx`, `components/escale/quadro/ColunaDoFunilNaCasca.tsx`, `tests/unit/escale-coluna-da-casca.test.tsx`

**Interfaces:**
- Consumes: Task 9 (`CardDaCasca`), Task 4 (`totalDaColuna`), do original (sem mudar): `buildCardInput`, `intervaloDaColuna`, `GestoDeSelecao`, `DropdownMenu*`.
- Produces:
  - `ColunaDaCasca(props: ColunaDaCascaProps)`: a raia genérica (funil e Visualização). Repete os ganchos `data-etapa-do-quadro` ou `data-coluna-da-visualizacao` (prop `marcador`) e `data-cabecalho-da-etapa`;
  - `ColunaDoFunilNaCasca(props: ColunaDoFunilNaCascaProps)`: as MESMAS props do `StageColumn` mais `aoAdicionar?: (stageId) => void`. É o que o `KanbanBoard` monta na casca (Task 11).

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-coluna-da-casca.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@hello-pangea/dnd", () => ({
  Droppable: ({ children }: { children: (p: unknown, s: unknown) => ReactNode }) =>
    children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, { isDraggingOver: false }),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/components/escale/quadro/CardDaCasca", () => ({
  CardDaCasca: ({
    lead,
    onSelect,
  }: {
    lead: { id: string };
    onSelect?: (id: string, gesto: "alterna" | "intervalo") => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSelect?.(lead.id, "alterna")}>{`marcar ${lead.id}`}</button>
      <button type="button" onClick={() => onSelect?.(lead.id, "intervalo")}>{`até ${lead.id}`}</button>
    </div>
  ),
}));

import { ColunaDoFunilNaCasca } from "@/components/escale/quadro/ColunaDoFunilNaCasca";
import type { Stage } from "@/lib/kanban/types";
import { negocio } from "@/tests/helpers/negocio-do-quadro";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const etapa = (over: Partial<Stage> = {}) =>
  ({
    id: "e1",
    pipeline_id: "p-1",
    name: "1. Entrada Lead",
    position: 1,
    is_won: false,
    is_lost: false,
    is_archived: false,
    color: null,
    ...over,
  }) as Stage;
const LEADS = [negocio("a", { value_cents: 1_000_000 }), negocio("b", { value_cents: 250_000 }), negocio("c")];

function coluna(extra: Partial<ComponentProps<typeof ColunaDoFunilNaCasca>> = {}) {
  const onSelectMany = vi.fn();
  render(
    <ColunaDoFunilNaCasca
      stage={etapa()}
      leads={LEADS}
      pipelineId="p-1"
      selectedLeadIds={new Set()}
      onSelectMany={onSelectMany}
      {...extra}
    />,
  );
  return { onSelectMany, u: userEvent.setup({ pointerEventsCheck: 0 }) };
}

describe("<ColunaDoFunilNaCasca> (Casca V4)", () => {
  it("o cabeçalho da Clint: nome, total em R$ e contagem; com os ganchos do original", () => {
    coluna();
    const raia = document.querySelector('[data-etapa-do-quadro="e1"]') as HTMLElement;
    expect(raia).not.toBeNull();
    const cabecalho = raia.querySelector("[data-cabecalho-da-etapa]") as HTMLElement;
    expect(within(cabecalho).getByRole("heading", { level: 2 })).toHaveTextContent("1. Entrada Lead");
    expect(within(cabecalho).getByText("R$12.500")).toBeInTheDocument();
    expect(within(cabecalho).getByText("3")).toBeInTheDocument();
  });

  it("coluna sem valor nenhum mostra R$0, nunca 'undefined'", () => {
    coluna({ leads: [negocio("x")] });
    expect(screen.getByText("R$0")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("undefined");
  });

  it("'+ Adicionar negócio' nas etapas abertas avisa a etapa; na de ganho não aparece", async () => {
    const aoAdicionar = vi.fn();
    const { u } = coluna({ aoAdicionar });
    await u.click(screen.getByRole("button", { name: "Adicionar negócio" }));
    expect(aoAdicionar).toHaveBeenCalledWith("e1");
  });

  it("na etapa de ganho, sem '+ Adicionar negócio'", () => {
    coluna({ stage: etapa({ is_won: true }), aoAdicionar: vi.fn() });
    expect(screen.queryByRole("button", { name: "Adicionar negócio" })).not.toBeInTheDocument();
  });

  it("o ⋮ da etapa seleciona todos (o lote do original)", async () => {
    const { onSelectMany, u } = coluna();
    await u.click(screen.getByRole("button", { name: "Ações da etapa 1. Entrada Lead" }));
    await u.click(await screen.findByRole("menuitem", { name: "Selecionar todos" }));
    expect(onSelectMany).toHaveBeenCalledWith(["a", "b", "c"], true);
  });

  it("com todos marcados, a contagem mostra a seleção e o ⋮ desmarca", async () => {
    const { onSelectMany, u } = coluna({ selectedLeadIds: new Set(["a", "b", "c"]) });
    expect(screen.getByText("3/3")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Ações da etapa 1. Entrada Lead" }));
    await u.click(await screen.findByRole("menuitem", { name: "Desmarcar todos" }));
    expect(onSelectMany).toHaveBeenCalledWith(["a", "b", "c"], false);
  });

  it("shift estende a seleção desde a âncora, na ordem da coluna", async () => {
    const { onSelectMany, u } = coluna();
    await u.click(screen.getByRole("button", { name: "marcar a" }));
    expect(onSelectMany).toHaveBeenLastCalledWith(["a"], true);
    await u.click(screen.getByRole("button", { name: "até c" }));
    expect(onSelectMany).toHaveBeenLastCalledWith(["a", "b", "c"], true);
  });

  it("quem pode renomear edita o nome no lugar; Escape desfaz", async () => {
    const onRenomear = vi.fn();
    const { u } = coluna({ podeRenomear: true, onRenomear });
    const campo = screen.getByTestId("nome-etapa-quadro");
    await u.clear(campo);
    await u.type(campo, "Triagem{Enter}");
    expect(onRenomear).toHaveBeenCalledWith("Triagem");
    onRenomear.mockClear();
    await u.clear(campo);
    await u.type(campo, "Outro{Escape}");
    expect(onRenomear).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-coluna-da-casca.test.tsx
```
Expected: FAIL (`Cannot find module '@/components/escale/quadro/ColunaDoFunilNaCasca'`).

- [ ] **Step 3: `components/escale/quadro/ColunaDaCasca.tsx`**

```tsx
"use client";
import { Droppable } from "@hello-pangea/dnd";
import { useRef, type ReactNode } from "react";

import type { GestoDeSelecao } from "@/components/kanban/KanbanCard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { intervaloDaColuna } from "@/lib/kanban/selecao";
import type { Lead } from "@/lib/types/leads";
import { EllipsisVertical, Plus } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export interface ColunaDaCascaProps {
  /** O `droppableId`: a etapa no funil, a chave da coluna combinada na Visualização. */
  idDaColuna: string;
  /** O nome da etapa (dado do operador: não passa por `t()`). */
  nome: string;
  /** O que vai no título: o nome, ou o campo de renomear. */
  titulo: ReactNode;
  total: string;
  dicaDoTotal?: string;
  /** Os cards já na ordem da tela. */
  leads: Lead[];
  selecionados: Set<string>;
  onSelectMany?: (ids: string[], marcar: boolean) => void;
  renderCard: (lead: Lead, indice: number, aoSelecionar: (leadId: string, gesto: GestoDeSelecao) => void) => ReactNode;
  /** "+ Adicionar negócio" (só onde faz sentido). */
  aoAdicionar?: () => void;
  /** Os mesmos ganchos do original, para os testes e o e2e acharem a coluna. */
  marcador: { "data-etapa-do-quadro": string } | { "data-coluna-da-visualizacao": string };
}

/**
 * A COLUNA DA CLINT (fork Escale, Casca V4; 01-010 e
 * `docs/escale/clint/crops/colhead.png`; design system §6.10 e §6.12). Raia
 * lavanda de 260px, sem borda; cabeçalho com nome, total e o círculo da
 * contagem; ⋮ com o "Selecionar todos" do original (PRINT 18: o resto do ⋮ é
 * da 1E); cards de 236px com 16px entre eles; rolagem própria (D7).
 */
export function ColunaDaCasca({
  idDaColuna,
  nome,
  titulo,
  total,
  dicaDoTotal,
  leads,
  selecionados,
  onSelectMany,
  renderCard,
  aoAdicionar,
  marcador,
}: ColunaDaCascaProps) {
  const t = useT();
  const ids = leads.map((l) => l.id);
  const aqui = ids.filter((id) => selecionados.has(id)).length;
  const todos = ids.length > 0 && aqui === ids.length;
  // A âncora do shift+clique, como no `StageColumn`: `useRef` para não remontar o Droppable.
  const ancora = useRef<string | null>(null);

  const aoSelecionar = (leadId: string, gesto: GestoDeSelecao) => {
    if (gesto === "intervalo") {
      const faixa = intervaloDaColuna(ids, ancora.current, leadId);
      ancora.current = leadId;
      onSelectMany?.(faixa, true);
      return;
    }
    ancora.current = leadId;
    onSelectMany?.([leadId], !selecionados.has(leadId));
  };
  const alternarTodos = () => {
    ancora.current = null;
    onSelectMany?.(ids, !todos);
  };

  return (
    <section
      aria-label={nome}
      {...marcador}
      className="flex h-full w-[260px] shrink-0 flex-col rounded-casca-raia bg-casca-raia"
    >
      <header data-cabecalho-da-etapa className="flex items-center gap-2 pt-4 pr-2 pl-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm leading-5 font-medium text-casca-texto">{titulo}</h2>
          <p className="mt-1 text-xs leading-4 text-casca-texto tabular-nums" title={dicaDoTotal}>
            {total}
          </p>
        </div>
        <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-full bg-casca-contador px-1 text-[10px] font-semibold text-casca-texto tabular-nums">
          {aqui > 0 ? `${aqui}/${leads.length}` : leads.length}
        </span>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${t("Ações da etapa")} ${nome}`}
              className="grid h-7 w-5 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-surface"
            >
              <EllipsisVertical size={18} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={ids.length === 0} onSelect={alternarTodos}>
              {todos ? t("Desmarcar todos") : t("Selecionar todos")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Droppable droppableId={idDaColuna} type="LEAD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-6 pr-1 pb-3 pl-2 [scrollbar-gutter:stable] [scrollbar-width:thin]",
              snapshot.isDraggingOver && "rounded-b-casca-raia bg-casca-marca-media",
            )}
          >
            {leads.map((lead, indice) => renderCard(lead, indice, aoSelecionar))}
            {provided.placeholder}
            {aoAdicionar ? (
              <button
                type="button"
                onClick={aoAdicionar}
                className="flex w-full shrink-0 items-center justify-center gap-1 rounded-casca-gatilho py-1 text-[13px] text-casca-texto-2 hover:bg-surface"
              >
                <Plus size={14} aria-hidden />
                {t("Adicionar negócio")}
              </button>
            ) : null}
          </div>
        )}
      </Droppable>
    </section>
  );
}
```

- [ ] **Step 4: `components/escale/quadro/ColunaDoFunilNaCasca.tsx`**

```tsx
"use client";
import { useRef, useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { totalDaColuna } from "@/lib/escale/quadro/aparencia";
import { buildCardInput } from "@/lib/kanban/card-state";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

import { CardDaCasca } from "./CardDaCasca";
import { ColunaDaCasca } from "./ColunaDaCasca";

/** As props do `StageColumn` do original, mais o "+ Adicionar negócio". */
export interface ColunaDoFunilNaCascaProps {
  stage: Stage;
  leads: Lead[];
  pipelineId: string;
  ownerNames?: Map<string, string | null>;
  coolingIds?: Set<string>;
  reactivations?: Map<string, { proposalId: string; expiresAt: string }>;
  canonicalTags?: string[];
  selectedLeadIds?: Set<string>;
  pulses?: Map<string, number>;
  onSelectMany?: (leadIds: string[], marcar: boolean) => void;
  onOpen?: (leadId: string) => void;
  podeRenomear?: boolean;
  onRenomear?: (nome: string) => void;
  aoAdicionar?: (stageId: string) => void;
}

const NENHUM = new Set<string>();

/**
 * A ETAPA DO FUNIL NA CASCA (fork Escale, Casca V4): o `KanbanBoard` monta esta
 * coluna no lugar do `StageColumn` quando `aparencia="casca"`. Mesmas props,
 * mesmos comportamentos (seleção, renomear no lugar, pulso, dossiê); visual da
 * Clint. O "ponderado" do original vira a dica do total (D12). "+ Adicionar
 * negócio" só nas etapas abertas (negócio não nasce ganho nem perdido).
 */
export function ColunaDoFunilNaCasca({
  stage,
  leads,
  pipelineId,
  ownerNames,
  coolingIds,
  reactivations,
  canonicalTags,
  selectedLeadIds,
  pulses,
  onSelectMany,
  onOpen,
  podeRenomear = false,
  onRenomear,
  aoAdicionar,
}: ColunaDoFunilNaCascaProps) {
  const t = useT();
  const selecionados = selectedLeadIds ?? NENHUM;
  const chance = stage.is_won ? 100 : stage.is_lost ? 0 : (stage.win_probability ?? null);
  const temValor = leads.some((l) => l.value_cents != null);
  const dicaDoTotal =
    chance === null || !temValor
      ? undefined
      : `${t("ponderado")} ${totalDaColuna(
          leads.map((l) => ({
            value_cents: l.value_cents == null ? null : Math.round((l.value_cents * chance) / 100),
            currency: l.currency,
          })),
        )}`;
  const aberta = !stage.is_won && !stage.is_lost;

  return (
    <ColunaDaCasca
      idDaColuna={stage.id}
      nome={stage.name}
      marcador={{ "data-etapa-do-quadro": stage.id }}
      titulo={
        podeRenomear && onRenomear ? (
          <NomeDaEtapaNaCasca key={stage.name} nome={stage.name} onConfirmar={onRenomear} />
        ) : (
          stage.name
        )
      }
      total={totalDaColuna(leads)}
      dicaDoTotal={dicaDoTotal}
      leads={leads}
      selecionados={selecionados}
      onSelectMany={onSelectMany}
      aoAdicionar={aberta && aoAdicionar ? () => aoAdicionar(stage.id) : undefined}
      renderCard={(lead, indice, aoSelecionar) => (
        <CardDaCasca
          key={lead.id}
          card={buildCardInput(lead, { stageName: stage.name, ownerNames, coolingIds, reactivations, canonicalTags })}
          lead={lead}
          index={indice}
          pipelineId={pipelineId}
          isSelected={selecionados.has(lead.id)}
          isSelecting={selecionados.size > 0}
          pulseCount={pulses?.get(lead.id) ?? 0}
          onSelect={aoSelecionar}
          onOpen={onOpen}
          nomes={ownerNames}
        />
      )}
    />
  );
}

/**
 * O nome da etapa editado no lugar, com o MESMO contrato do `NomeDaEtapaNoQuadro`
 * do original (`StageColumn.tsx`, que não é exportado e fica intacto): salva ao
 * confirmar (Enter ou sair do campo), Escape desfaz, e o `key` pelo nome gravado
 * descarta o rascunho velho.
 */
function NomeDaEtapaNaCasca({ nome, onConfirmar }: { nome: string; onConfirmar: (nome: string) => void }) {
  const t = useT();
  const [rascunho, setRascunho] = useState(nome);
  const cancelado = useRef(false);

  function confirmar() {
    const limpo = rascunho.trim();
    if (cancelado.current || !limpo || limpo === nome) {
      cancelado.current = false;
      setRascunho(nome);
      return;
    }
    onConfirmar(limpo);
  }

  return (
    <input
      value={rascunho}
      maxLength={80}
      aria-label={`${t("Nome da etapa")} «${nome}»`}
      data-testid="nome-etapa-quadro"
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelado.current = true;
          e.currentTarget.blur();
        }
      }}
      className="w-full min-w-0 truncate rounded-[4px] bg-transparent text-sm font-medium text-casca-texto outline-hidden hover:bg-surface focus:bg-surface"
    />
  );
}
```

- [ ] **Step 5: Rodar**

```bash
corepack pnpm vitest run tests/unit/escale-coluna-da-casca.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Typecheck, lint, prettier e commit**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/quadro tests/unit/escale-coluna-da-casca.test.tsx
corepack pnpm exec prettier --write components/escale/quadro/ColunaDaCasca.tsx components/escale/quadro/ColunaDoFunilNaCasca.tsx tests/unit/escale-coluna-da-casca.test.tsx
git add components/escale/quadro tests/unit/escale-coluna-da-casca.test.tsx
git commit -m "feat(escale): coluna do quadro igual à da Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: O encaixe no `KanbanBoard` (sem a casca, nada muda)

**Files:**
- Modify: `components/kanban/KanbanBoard.tsx` (encaixe `FORK ESCALE · Casca V4`)
- Create: `tests/unit/escale-quadro-na-casca.test.tsx`

**Interfaces:**
- Consumes: Task 10 (`ColunaDoFunilNaCasca`).
- Produces: `KanbanBoard` aceita `aparencia?: "casca"` e `aoAdicionarNegocio?: (stageId: string) => void`. Sem `aparencia`, o render é o de antes, linha por linha.

- [ ] **Step 1: Escrever o teste (vai falhar)**

Create `tests/unit/escale-quadro-na-casca.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/kanban/StageColumn", () => ({
  StageColumn: ({ stage }: { stage: { id: string } }) => <p>{`original ${stage.id}`}</p>,
}));
vi.mock("@/components/escale/quadro/ColunaDoFunilNaCasca", () => ({
  ColunaDoFunilNaCasca: ({ stage, aoAdicionar }: { stage: { id: string }; aoAdicionar?: (id: string) => void }) => (
    <p>{`casca ${stage.id} ${aoAdicionar ? "com" : "sem"} adicionar`}</p>
  ),
}));
vi.mock("@/components/kanban/LeadDossier", () => ({ LeadDossier: () => null }));
vi.mock("@/components/kanban/CamposObrigatoriosDialog", () => ({ CamposObrigatoriosDialog: () => null }));
vi.mock("@/components/kanban/RetomarComoNovoNegocioDialog", () => ({ RetomarComoNovoNegocioDialog: () => null }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (texto: string) => texto }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/leads/useAtRiskLeads", () => ({ useAtRiskLeads: () => ({ data: null }) }));
vi.mock("@/hooks/leads/useReactivations", () => ({ useReactivations: () => ({ data: [] }) }));
vi.mock("@/hooks/kanban/useRenameStage", () => ({ useRenameStage: () => ({ mutate: vi.fn() }) }));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => ({ data: undefined, isLoading: false, isError: false, error: null, pulses: new Map() }),
  chaveDoQuadro: (id: string | null) => ["board", id],
}));
vi.mock("@/hooks/kanban/useMoveCard", () => ({ useMoveCard: () => ({ mutate: vi.fn(), isPending: false }) }));

import { KanbanBoard } from "@/components/kanban/KanbanBoard";

const ETAPAS = [{ id: "e1", pipeline_id: "p-1", name: "Entrada", position: 1, is_won: false, is_lost: false }] as Stage[];
const LEADS: Lead[] = [];

function renderizar(extra: { aparencia?: "casca"; aoAdicionarNegocio?: (id: string) => void } = {}) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <KanbanBoard pipelineId="p-1" stages={ETAPAS} leads={LEADS} pipeline={{ settings: {} } as Pipeline} {...extra} />
    </QueryClientProvider>,
  );
  return document.querySelector("[data-quadro-do-funil]") as HTMLElement;
}

describe("<KanbanBoard> com e sem a casca (Casca V4)", () => {
  it("sem a casca, o quadro é o do original: StageColumn e o contêiner de sempre", () => {
    const quadro = renderizar();
    expect(screen.getByText("original e1")).toBeInTheDocument();
    expect(screen.queryByText(/^casca/)).not.toBeInTheDocument();
    expect(quadro.className).toBe("flex min-h-0 flex-1 items-start gap-3 overflow-auto px-4 pb-4");
  });

  it("na casca: a coluna da Clint, colunas com rolagem própria e o '+ Adicionar negócio' ligado", () => {
    const quadro = renderizar({ aparencia: "casca", aoAdicionarNegocio: vi.fn() });
    expect(screen.getByText("casca e1 com adicionar")).toBeInTheDocument();
    expect(screen.queryByText("original e1")).not.toBeInTheDocument();
    expect(quadro).toHaveClass("overflow-x-auto", "overflow-y-hidden");
    expect(quadro).not.toHaveClass("px-4");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-na-casca.test.tsx
```
Expected: FAIL no segundo caso (o quadro ignora `aparencia`).

- [ ] **Step 3: O encaixe em `components/kanban/KanbanBoard.tsx`**

3a. Logo DEPOIS da linha `import { posicaoNoFimDaEtapa } from "@/lib/escale/filtros/ordenar";`, acrescente:

```ts
// FORK ESCALE · Casca V4: com a casca nova, a coluna e o card da Clint (fork).
import { ColunaDoFunilNaCasca } from "@/components/escale/quadro/ColunaDoFunilNaCasca";
```

3b. Na interface `KanbanBoardProps`, logo DEPOIS da linha `  ordemDosCards?: (a: Lead, b: Lead) => number;`, acrescente:

```ts
  /**
   * FORK ESCALE · Casca V4: "casca" troca a coluna e o card pelos da Clint
   * (`components/escale/quadro/`), com rolagem própria em cada coluna. Ausente =
   * o quadro do original, sem mudança nenhuma.
   */
  aparencia?: "casca";
  /** FORK ESCALE · Casca V4: o "+ Adicionar negócio" das colunas (só na casca). */
  aoAdicionarNegocio?: (stageId: string) => void;
```

3c. Na desestruturação das props da função `KanbanBoard`, logo DEPOIS de `  ordemDosCards,`, acrescente:

```ts
  aparencia,
  aoAdicionarNegocio,
```

3d. Troque a linha `        className="flex min-h-0 flex-1 items-start gap-3 overflow-auto px-4 pb-4"` (a do `data-quadro-do-funil`) por:

```tsx
        className={
          // FORK ESCALE · Casca V4: na casca, cada coluna rola sozinha e o quadro só anda para o lado.
          aparencia === "casca"
            ? "flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden pb-3"
            : "flex min-h-0 flex-1 items-start gap-3 overflow-auto px-4 pb-4"
        }
```

3e. Troque a abertura do `map`:

```tsx
        {data.stages.map((stage) => (
          <StageColumn
```
por:
```tsx
        {data.stages.map((stage) =>
          // FORK ESCALE · Casca V4: as mesmas props, na coluna da Clint.
          aparencia === "casca" ? (
            <ColunaDoFunilNaCasca
              key={stage.id}
              stage={stage}
              leads={grouped.get(stage.id) ?? []}
              pipelineId={pipelineId}
              ownerNames={ownerNames}
              coolingIds={coolingIds}
              reactivations={reactivations}
              pulses={pulsesProp ?? queryResult.pulses}
              canonicalTags={canonicalTags}
              selectedLeadIds={selectedLeadIds}
              onSelectMany={handleSelectMany}
              onOpen={setDossieId}
              podeRenomear={podeRenomearEtapa}
              onRenomear={(nome) => renameStage.mutate({ stageId: stage.id, name: nome })}
              aoAdicionar={aoAdicionarNegocio}
            />
          ) : (
          <StageColumn
```

3f. Troque o fechamento do `map` (logo depois da última prop do `StageColumn`):

```tsx
            onRenomear={(nome) => renameStage.mutate({ stageId: stage.id, name: nome })}
          />
        ))}
      </div>
```
por:
```tsx
            onRenomear={(nome) => renameStage.mutate({ stageId: stage.id, name: nome })}
          />
          ),
        )}
      </div>
```

As linhas do `<StageColumn …/>` ficam como estavam (sem reindentar), para o merge semanal com o Rafael não ter conflito. NÃO rode o prettier neste arquivo.

- [ ] **Step 4: Rodar (o teste novo e os do quadro do original)**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-na-casca.test.tsx tests/unit/escale-quadro-ordenado.test.tsx tests/unit/renomear-etapa-no-quadro.test.tsx tests/unit/total-da-coluna-respeita-a-moeda.test.tsx tests/unit/kanban-atalho-conversa.test.tsx tests/unit/funil-mostra-dados-do-cliente.test.tsx
```
Expected: PASS em todos (as cercas do card e da coluna do original continuam verdes porque `KanbanCard.tsx` e `StageColumn.tsx` não mudaram).

- [ ] **Step 5: Typecheck, lint e commit**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint components/kanban/KanbanBoard.tsx tests/unit/escale-quadro-na-casca.test.tsx
corepack pnpm exec prettier --write tests/unit/escale-quadro-na-casca.test.tsx
git diff --stat components/kanban/KanbanBoard.tsx   # Expected: só inserções e a linha da classe
git add components/kanban/KanbanBoard.tsx tests/unit/escale-quadro-na-casca.test.tsx
git commit -m "feat(escale): o quadro monta a coluna da Clint na casca nova

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: O cabeçalho da Clint na página do funil

**Files:**
- Create: `components/escale/quadro/CabecalhoDaCasca.tsx`
- Modify: `app/app/pipelines/[id]/_client.tsx` (encaixe `FORK ESCALE · Casca V4`), `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`

**Interfaces:**
- Consumes: `BotaoDaCasca` (V1); Task 11 (`aparencia`, `aoAdicionarNegocio`).
- Produces:
  - `CabecalhoDaCasca({ sobrelinha, titulo, acao? })` e `BotaoNegocioMais` (`forwardRef`, para servir de gatilho de menu na Visualização);
  - com a casca, a página mostra o cabeçalho da Clint (sem o seletor de funil no título e sem Quadro/Calendário) e passa `aparencia="casca"` ao quadro. Sem a casca, nada muda.

- [ ] **Step 1: Mudar o teste da página (vai falhar)**

Em `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`:

1a. Troque o mock do `KanbanBoard` por:

```tsx
vi.mock("@/components/kanban/KanbanBoard", () => ({
  KanbanBoard: (p: {
    stages: Array<{ name: string }>;
    leads: Array<{ id: string }>;
    ordemDosCards?: unknown;
    aparencia?: string;
    aoAdicionarNegocio?: unknown;
  }) => (
    <div>
      <p>{`etapas: ${p.stages.map((s) => s.name).join(", ")}`}</p>
      <p>{`cards: ${p.leads.map((l) => l.id).join(", ")}`}</p>
      <p>{`ordem: ${typeof p.ordemDosCards}`}</p>
      <p>{`aparencia: ${p.aparencia ?? "original"}`}</p>
      <p>{`adicionar: ${typeof p.aoAdicionarNegocio}`}</p>
    </div>
  ),
}));
```

1b. Troque o mock do `NewLeadDialog` por:

```tsx
vi.mock("@/components/kanban/NewLeadDialog", () => ({
  NewLeadDialog: ({ open }: { open: boolean }) => (open ? <p>novo negócio aberto</p> : null),
}));
```

1c. Logo depois do bloco `globalThis`/imports (antes de `const abrir`), acrescente os polyfills do Radix (o seletor de funil do ramo original abre um `Select`):

```tsx
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
```

1d. Troque o `abrir` por:

```tsx
const DOIS_FUNIS = [
  { id: "p-1", name: "Vendas" },
  { id: "p-2", name: "Pós-venda" },
];
const abrir = (cascaNova: boolean, funis = [{ id: "p-1", name: "Vendas" }]) =>
  render(<PipelinePageClient pipelineId="p-1" initialName="Vendas" role="agent" funis={funis} cascaNova={cascaNova} />);
```

1e. Troque o caso `"sem a casca nova, o quadro do original fica como está"` por:

```tsx
  it("sem a casca nova, o quadro do original fica como está", () => {
    abrir(false, DOIS_FUNIS);
    expect(screen.getByText("barra do original")).toBeInTheDocument();
    expect(screen.getByText("etapas: Entrada, Proposta, Ganho, Perdido")).toBeInTheDocument();
    expect(screen.getByText("cards: l-aberto, l-ganho, l-perdido")).toBeInTheDocument();
    expect(screen.getByText("aparencia: original")).toBeInTheDocument();
    expect(screen.getByText("adicionar: undefined")).toBeInTheDocument();
    expect(screen.getByTestId("trocar-funil")).toBeInTheDocument();
    expect(screen.getByTestId("visao-quadro")).toBeInTheDocument();
    expect(screen.getByTestId("visao-calendario")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo Lead/ })).toBeInTheDocument();
    expect(screen.queryByText("Negócios da origem")).not.toBeInTheDocument();
  });

  it("com a casca: o cabeçalho da Clint, sem seletor no título e sem Quadro/Calendário; o quadro na aparência da casca", () => {
    abrir(true, DOIS_FUNIS);
    expect(screen.getByText("Negócios da origem")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Vendas" })).toBeInTheDocument();
    expect(screen.queryByTestId("trocar-funil")).not.toBeInTheDocument();
    expect(screen.queryByTestId("visao-quadro")).not.toBeInTheDocument();
    expect(screen.queryByTestId("visao-calendario")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Novo Lead/ })).not.toBeInTheDocument();
    expect(screen.getByText("aparencia: casca")).toBeInTheDocument();
    expect(screen.getByText("adicionar: function")).toBeInTheDocument();
  });

  it("com a casca, 'Negócio +' abre o Novo negócio de sempre", async () => {
    abrir(true);
    await userEvent.setup().click(screen.getByRole("button", { name: /^Negócio/ }));
    expect(screen.getByText("novo negócio aberto")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
```
Expected: FAIL nos dois casos novos (não há "Negócios da origem"; `aparencia` não chega).

- [ ] **Step 3: `components/escale/quadro/CabecalhoDaCasca.tsx`**

```tsx
"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { Plus } from "@/lib/ui/icons-da-casca";

/**
 * O CABEÇALHO DA PÁGINA DO QUADRO (fork Escale, Casca V4; 01-010): a sobrelinha
 * "NEGÓCIOS DA ORIGEM" (10px, 600, maiúsculas, cinza), o nome grande (26px, 600)
 * e, à direita e alinhado à sobrelinha, a ação ("Negócio +"). Sem seletor no
 * título: na Clint superior, trocar de origem é pelo painel da esquerda.
 */
export function CabecalhoDaCasca({ sobrelinha, titulo, acao }: { sobrelinha: string; titulo: string; acao?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="mb-1 text-[10px] leading-[15px] font-semibold text-casca-sobrelinha uppercase">{sobrelinha}</p>
        <h1 className="truncate text-[26px] leading-9 font-semibold text-casca-texto">{titulo}</h1>
      </div>
      {acao ? <div className="mt-[7px] shrink-0">{acao}</div> : null}
    </header>
  );
}

/**
 * "Negócio +" (design system §6.2): o botão da marca. `forwardRef` para servir de
 * gatilho de menu (`DropdownMenuTrigger asChild`) na Visualização.
 */
export const BotaoNegocioMais = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function BotaoNegocioMais(props, ref) {
    const t = useT();
    return (
      <BotaoDaCasca ref={ref} type="button" variante="marca" {...props}>
        {t("Negócio")}
        <Plus size={16} aria-hidden />
      </BotaoDaCasca>
    );
  },
);
```

- [ ] **Step 4: O encaixe em `app/app/pipelines/[id]/_client.tsx`**

4a. Logo DEPOIS da linha `import { comparadorDaOrdem } from "@/lib/escale/filtros/ordenar";`, acrescente:

```ts
// FORK ESCALE · Casca V4: o cabeçalho da Clint na casca nova (o quadro troca coluna e card pela prop `aparencia`).
import { BotaoNegocioMais, CabecalhoDaCasca } from "@/components/escale/quadro/CabecalhoDaCasca";
```

4b. Troque a linha:

```tsx
      {/* `flex-col` no mobile: nome de funil comprido (é texto livre, sem
```
por:
```tsx
      {cascaNova ? (
        // FORK ESCALE · Casca V4: o cabeçalho da Clint (01-010): "NEGÓCIOS DA
        // ORIGEM", o nome grande e "Negócio +". Trocar de origem é pelo painel da
        // esquerda (V3), e a alternância Quadro/Calendário fica escondida (o
        // calendário segue no menu lateral). O cabeçalho original abaixo não muda.
        <CabecalhoDaCasca
          sobrelinha={t("Negócios da origem")}
          titulo={nomeAtual}
          acao={<BotaoNegocioMais onClick={() => setNewOpen(true)} disabled={!data} />}
        />
      ) : (
        <>
      {/* `flex-col` no mobile: nome de funil comprido (é texto livre, sem
```

4c. Troque:

```tsx
        </div>
      </header>
      {data && (
```
por:
```tsx
        </div>
      </header>
        </>
      )}
      {data && (
```

4d. No `<KanbanBoard … />`, troque:

```tsx
          ordemDosCards={ordemDosCards}
        />
      )}
      <BulkActionBar
```
por:
```tsx
          ordemDosCards={ordemDosCards}
          // FORK ESCALE · Casca V4: na casca nova, a coluna e o card da Clint; o
          // "+ Adicionar negócio" da coluna abre o mesmo "Novo negócio" do botão.
          aparencia={cascaNova ? "casca" : undefined}
          aoAdicionarNegocio={cascaNova ? () => setNewOpen(true) : undefined}
        />
      )}
      <BulkActionBar
```

4e. A altura com o topo de 44px da V2 (esta parte é a dona do ajuste; contrato, "Medidas comuns"). Troque a linha:

```tsx
      className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col gap-4"
```
por:
```tsx
      // FORK ESCALE · Casca V4: na casca nova, do md para cima, o topo tem 44px (V2), não os 56px do h-14 (a última classe).
      className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col gap-4 md:[body:has([data-escale-casca])_&]:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]"
```
Sem a casca (e no celular, onde a casca usa a `TopBar` de 56px) a classe de antes continua valendo. A expressão nova lê `--rodape-ocupado`, como a cerca `altura-fixa-le-a-reserva-do-rodape` exige.

O `<header>` original fica byte a byte igual (só ganha o fragmento em volta). NÃO rode o prettier neste arquivo.

- [ ] **Step 5: Rodar (a página com e sem casca, e os testes do original)**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-do-funil-com-filtros.test.tsx tests/unit/calendario-do-funil-por-campo-de-data.test.tsx tests/unit/selecao-longa-tem-busca.test.ts tests/unit/altura-fixa-le-a-reserva-do-rodape.test.ts tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts
```
Expected: PASS em todos (a contagem de listas dinâmicas em `_client.tsx` continua 1; a classe de altura antiga continua lá, e a nova da casca também lê `--rodape-ocupado`).

- [ ] **Step 6: Typecheck, lint e commit**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint "app/app/pipelines/[id]/_client.tsx" components/escale/quadro/CabecalhoDaCasca.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
corepack pnpm exec prettier --write components/escale/quadro/CabecalhoDaCasca.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
git add "app/app/pipelines/[id]/_client.tsx" components/escale/quadro/CabecalhoDaCasca.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
git commit -m "feat(escale): cabeçalho da Clint e quadro da casca na página do funil

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: A Visualização com o mesmo quadro

**Files:**
- Modify (reescrever): `components/escale/visualizacoes/QuadroDaVisualizacao.tsx`, `components/escale/visualizacoes/ColunaDaVisualizacao.tsx`
- Modify: `components/escale/visualizacoes/QuadroCombinado.tsx` (a classe do contêiner), `tests/unit/escale-quadro-da-visualizacao.test.tsx`, `tests/unit/escale-quadro-combinado.test.tsx`

**Interfaces:**
- Consumes: Tasks 8, 9, 10 e 12.
- Produces: a página da Visualização com o cabeçalho da Clint ("NEGÓCIOS DA VISUALIZAÇÃO", D15), a barra nova, colunas `ColunaDaCasca` e cards `CardDaCasca` com o nome da origem. `ContextoDosCards` e as props de `ColunaDaVisualizacao` não mudam.

- [ ] **Step 1: Mudar os testes (vão falhar)**

Em `tests/unit/escale-quadro-combinado.test.tsx`:

1a. Troque o mock `vi.mock("@/components/kanban/KanbanCard", …)` por:

```tsx
vi.mock("@/components/escale/quadro/CardDaCasca", () => ({
  CardDaCasca: ({
    card,
    lead,
    pipelineId,
    onOpen,
  }: {
    card: { title: string; stageName: string };
    lead: { id: string };
    pipelineId: string;
    onOpen?: (id: string) => void;
  }) => (
    <button type="button" data-pipeline={pipelineId} onClick={() => onOpen?.(lead.id)}>
      {`${card.title} — ${card.stageName}`}
    </button>
  ),
}));
```

1b. Logo antes de `const lead = (id: string, …`, acrescente os polyfills do Radix (o ⋮ da coluna é um `DropdownMenu`):

```tsx
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
```

1c. Troque o caso `"selecionar a coluna inteira marca os cards das duas origens"` por:

```tsx
  it("selecionar a coluna inteira (pelo ⋮ da coluna) marca os cards das duas origens", async () => {
    const user = renderizar();
    await user.click(screen.getByRole("button", { name: "Ações da etapa Entrada" }));
    await user.click(await screen.findByRole("menuitem", { name: "Selecionar todos" }));
    expect(onSelecao).toHaveBeenCalledWith(["l-a", "l-b"]);
  });
```

Em `tests/unit/escale-quadro-da-visualizacao.test.tsx`:

1d. No caso `"mostra o nome, quantas origens junta e as origens que não abriram para quem olha"`, troque as duas linhas:

```tsx
    expect(screen.getByText("Visualização")).toBeInTheDocument();
    expect(screen.getByText("3 origens")).toBeInTheDocument();
```
por:
```tsx
    expect(screen.getByText("Negócios da visualização")).toBeInTheDocument();
```
e troque o título do caso por `"mostra o nome com a sobrelinha da Clint e as origens que não abriram para quem olha"`.

1e. No caso `"Novo Lead pergunta em qual origem…"`, troque o título por `"'Negócio +' pergunta em qual origem e abre o formulário com as etapas dela"` e a linha `await user.click(screen.getByRole("button", { name: /Novo Lead/ }));` por `await user.click(screen.getByRole("button", { name: /^Negócio/ }));`.

1f. Logo depois dos `vi.mock`, acrescente os mesmos polyfills do 1b (o "Negócio +" abre um `DropdownMenu`), se o arquivo ainda não os tiver.

- [ ] **Step 2: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx
```
Expected: FAIL (a coluna ainda usa o `KanbanCard` e a caixinha; o cabeçalho ainda é o antigo).

- [ ] **Step 3: Reescrever `components/escale/visualizacoes/ColunaDaVisualizacao.tsx`**

```tsx
"use client";
import { CardDaCasca } from "@/components/escale/quadro/CardDaCasca";
import { ColunaDaCasca } from "@/components/escale/quadro/ColunaDaCasca";
import { totalDaColuna } from "@/lib/escale/quadro/aparencia";
import type { ColunaCombinada } from "@/lib/escale/visualizacoes/regras";
import { buildCardInput } from "@/lib/kanban/card-state";
import type { Lead } from "@/lib/types/leads";

/** O que todo card do quadro combinado precisa, resolvido uma vez no quadro. */
export interface ContextoDosCards {
  /** Origem → nome: a linha da origem no card (D15). */
  nomeDaOrigem: Record<string, string>;
  /** Origem → `settings.canonical_tags` (a tag que fica no card é a da origem DELE). */
  tagsCanonicas: Record<string, string[]>;
  ownerNames: Map<string, string | null>;
  coolingIds: Set<string>;
  reactivations: Map<string, { proposalId: string; expiresAt: string }>;
  pulses: Map<string, number>;
}

/**
 * UMA COLUNA DO QUADRO COMBINADO (fork Escale, Fase 1C; visual da Clint na Casca
 * V4): as etapas de mesmo nome de várias origens, na `ColunaDaCasca`. Cada card
 * leva o `pipelineId` da PRÓPRIA origem (ganhar, perder, editar e mover
 * funcionam igual ao funil) e mostra o nome dela. O cabeçalho é só leitura e não
 * tem "+ Adicionar negócio": a etapa é de várias origens.
 */
export function ColunaDaVisualizacao({
  coluna,
  leads,
  contexto,
  selecionados,
  onSelectMany,
  onOpen,
}: {
  coluna: ColunaCombinada;
  leads: Lead[];
  contexto: ContextoDosCards;
  selecionados: Set<string>;
  onSelectMany: (ids: string[], marcar: boolean) => void;
  onOpen: (leadId: string) => void;
}) {
  return (
    <ColunaDaCasca
      idDaColuna={coluna.chave}
      nome={coluna.nome}
      marcador={{ "data-coluna-da-visualizacao": coluna.nome }}
      titulo={coluna.nome}
      total={totalDaColuna(leads)}
      leads={leads}
      selecionados={selecionados}
      onSelectMany={onSelectMany}
      renderCard={(lead, indice, aoSelecionar) => {
        const origem = contexto.nomeDaOrigem[lead.pipeline_id] ?? "";
        return (
          <CardDaCasca
            key={lead.id}
            card={buildCardInput(lead, {
              stageName: `${coluna.nome} · ${origem}`,
              ownerNames: contexto.ownerNames,
              coolingIds: contexto.coolingIds,
              reactivations: contexto.reactivations,
              canonicalTags: contexto.tagsCanonicas[lead.pipeline_id] ?? [],
            })}
            lead={lead}
            index={indice}
            pipelineId={lead.pipeline_id}
            isSelected={selecionados.has(lead.id)}
            isSelecting={selecionados.size > 0}
            pulseCount={contexto.pulses.get(lead.id) ?? 0}
            onSelect={aoSelecionar}
            onOpen={onOpen}
            nomes={contexto.ownerNames}
            origem={origem}
          />
        );
      }}
    />
  );
}
```

- [ ] **Step 4: A classe do contêiner em `components/escale/visualizacoes/QuadroCombinado.tsx`**

Troque:

```tsx
        <div className="flex min-h-0 flex-1 items-start gap-3 overflow-auto px-4 pb-4" data-quadro-da-visualizacao>
```
por:
```tsx
        {/* Casca V4: como o quadro do funil na casca, cada coluna rola sozinha e o quadro só anda para o lado. */}
        <div
          className="flex min-h-0 flex-1 items-stretch gap-3 overflow-x-auto overflow-y-hidden pb-3"
          data-quadro-da-visualizacao
        >
```

- [ ] **Step 5: Reescrever `components/escale/visualizacoes/QuadroDaVisualizacao.tsx`**

```tsx
"use client";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { BarraDoQuadro } from "@/components/escale/filtros/BarraDoQuadro";
import { BotaoNegocioMais, CabecalhoDaCasca } from "@/components/escale/quadro/CabecalhoDaCasca";
import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useFiltrosDoQuadro } from "@/hooks/escale/useFiltrosDoQuadro";
import { useQuadrosDaVisualizacao } from "@/hooks/escale/useQuadrosDaVisualizacao";
import { useT } from "@/hooks/i18n/useT";
import { recortarQuadro } from "@/lib/escale/filtros/aplicar";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { comparadorDaOrdem } from "@/lib/escale/filtros/ordenar";
import { settingsDaVisualizacao } from "@/lib/escale/visualizacoes/regras";

import { LoteDaVisualizacao } from "./LoteDaVisualizacao";
import { QuadroCombinado } from "./QuadroCombinado";

/**
 * A PÁGINA DE UMA VISUALIZAÇÃO (fork Escale, Fases 1C e 1D; visual da Clint na
 * Casca V4): o mesmo esqueleto da página do funil — cabeçalho com "Negócio +",
 * a barra, o quadro e o lote — com as origens da visualização no lugar de um
 * funil só. A sobrelinha é "NEGÓCIOS DA VISUALIZAÇÃO" (D15; sem print).
 *
 * Os filtros rodam POR ORIGEM: a categoria de um motivo de perda e as colunas de
 * ganho e de perda são da origem do card. Os filtros salvos são da VISUALIZAÇÃO.
 */
export function QuadroDaVisualizacao({
  id,
  nome,
  origens,
}: {
  id: string;
  nome: string;
  origens: Array<{ id: string; name: string }>;
}) {
  const t = useT();
  const searchParams = useSearchParams();
  const { filtros, filtroSalvoId, mudar } = useFiltrosDoQuadro();
  const orgAtiva = useActiveOrg();

  // Estável entre renders: o `combine` do hook depende deste array.
  const ids = useMemo(() => origens.map((o) => o.id), [origens]);
  const { quadros, carregando, indisponiveis, atualizar, atualizando } = useQuadrosDaVisualizacao(ids);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [novoEm, setNovoEm] = useState<string | null>(null);

  const campos = useMemo(() => camposFiltraveis(quadros.map((q) => q.pipeline.settings)), [quadros]);
  const recortes = useMemo(
    () => quadros.map((q) => ({ quadro: q, ...recortarQuadro(q, filtros, { moeda: orgAtiva?.currency ?? null, campos }) })),
    [quadros, filtros, orgAtiva?.currency, campos],
  );
  // As colunas do quadro combinado saem só das etapas visíveis de cada origem.
  const quadrosVisiveis = useMemo(() => recortes.map((r) => ({ ...r.quadro, stages: r.stages })), [recortes]);
  const filtrados = useMemo(() => recortes.flatMap((r) => r.leads), [recortes]);
  const ordemDosCards = useMemo(() => comparadorDaOrdem(filtros.ordem, campos), [filtros.ordem, campos]);
  const todosOsLeads = useMemo(() => quadros.flatMap((q) => q.leads), [quadros]);
  const settings = useMemo(() => settingsDaVisualizacao(quadros), [quadros]);
  const quadroDoNovo = quadros.find((q) => q.pipeline.id === novoEm);

  if (origens.length === 0) {
    return (
      <p className="rounded-md border p-4 text-sm text-muted-foreground">
        {t("Nenhuma origem desta visualização está ativa. Edite as origens pelo ⋮ da visualização.")}
      </p>
    );
  }

  return (
    // A mesma altura da página do funil (ver o comentário longo lá): o quadro
    // cabe na tela e quem rola é ele. A última classe desconta o topo de 44px da
    // casca (V2) do md para cima; sem a casca e no celular vale a de 3.5rem.
    <div className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col gap-4 md:[body:has([data-escale-casca])_&]:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]">
      <CabecalhoDaCasca
        sobrelinha={t("Negócios da visualização")}
        titulo={nome}
        acao={
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <BotaoNegocioMais disabled={quadros.length === 0} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("Em qual origem?")}</DropdownMenuLabel>
              {quadros.map((q) => (
                <DropdownMenuItem key={q.pipeline.id} onSelect={() => setNovoEm(q.pipeline.id)}>
                  {q.pipeline.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {quadroDoNovo && (
        <NewLeadDialog
          open
          onOpenChange={(aberto: boolean) => !aberto && setNovoEm(null)}
          pipelineId={quadroDoNovo.pipeline.id}
          stages={quadroDoNovo.stages}
          leads={quadroDoNovo.leads}
        />
      )}

      {indisponiveis.length > 0 && (
        <p role="status" className="rounded-casca-gatilho bg-casca-raia px-3 py-2 text-xs text-casca-suave">
          {(indisponiveis.length === 1
            ? t("{n} origem desta visualização não abriu para você.")
            : t("{n} origens desta visualização não abriram para você.")
          ).replace("{n}", String(indisponiveis.length))}
        </p>
      )}

      <BarraDoQuadro
        alvo={{ tipo: "visualizacao", id }}
        filtros={filtros}
        filtroSalvoId={filtroSalvoId}
        onMudar={mudar}
        leads={todosOsLeads}
        campos={campos}
        settings={settings}
        contagem={filtrados.length}
        onAtualizar={atualizar}
        atualizando={atualizando}
      />

      {carregando && quadros.length === 0 ? (
        <div className="flex flex-1 animate-pulse items-center justify-center text-casca-suave">{t("Carregando…")}</div>
      ) : (
        <QuadroCombinado
          quadros={quadrosVisiveis}
          leads={filtrados}
          selecionados={selecionados}
          onSelecao={setSelecionados}
          leadInicial={searchParams.get("lead")}
          ordemDosCards={ordemDosCards}
        />
      )}

      <LoteDaVisualizacao selecionados={selecionados} quadros={quadros} onLimpar={() => setSelecionados([])} />
    </div>
  );
}
```

- [ ] **Step 6: Rodar**

```bash
corepack pnpm vitest run tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx tests/unit/escale-pagina-da-visualizacao.test.tsx tests/unit/escale-visualizacoes-regras.test.ts tests/unit/altura-fixa-le-a-reserva-do-rodape.test.ts tests/unit/tailwind-tokens.test.ts
```
Expected: PASS em todos.

- [ ] **Step 7: Typecheck, lint, prettier e commit**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/visualizacoes tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx
corepack pnpm exec prettier --write components/escale/visualizacoes/QuadroDaVisualizacao.tsx components/escale/visualizacoes/ColunaDaVisualizacao.tsx components/escale/visualizacoes/QuadroCombinado.tsx tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx
git add components/escale/visualizacoes tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx
git commit -m "feat(escale): a Visualização com o quadro da Clint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: O espanhol de todos os textos da parte

**Files:**
- Modify: `lib/i18n/dicionario.ts` (bloco novo logo ANTES da linha `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`)

**Interfaces:**
- Consumes: todos os `t("…")` das Tasks 5 a 13.
- Produces: o espanhol de cada texto novo. As chaves que já existem ficam com a tradução de antes.

- [ ] **Step 1: Inserir o bloco por script (pula o que já existe)**

Da raiz do repositório:

```bash
node - <<'NODE'
const fs = require("fs");
const ARQ = "lib/i18n/dicionario.ts";
const ANCORA = "  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───";
const CAB = "  // ─── FORK ESCALE · casca igual à Clint (V4: quadro, barra de filtros, colunas e cards) ───";
const ENTRADAS = [
  ["Negócios da origem", "Negocios del origen"],
  ["Negócios da visualização", "Negocios de la vista"],
  ["{n} oportunidade de {negocio}", "{n} oportunidad de {negocio}"],
  ["{n} oportunidades de {negocio}", "{n} oportunidades de {negocio}"],
  ["Negócio", "Negocio"],
  ["Data", "Fecha"],
  ["Campos", "Campos"],
  ["Tags", "Etiquetas"],
  ["Dono do negócio", "Responsable del negocio"],
  ["Status", "Estado"],
  ["Mais filtros", "Más filtros"],
  ["Filtros", "Filtros"],
  ["Status do negócio", "Estado del negocio"],
  ["Mostrar todos", "Mostrar todos"],
  ["Limpar", "Limpiar"],
  ["Limpar filtros", "Limpiar filtros"],
  ["Conversas", "Conversaciones"],
  ["Outros", "Otros"],
  ["Buscar…", "Buscar…"],
  ["dd/mm/aaaa", "dd/mm/aaaa"],
  ["Data de ganho", "Fecha de ganado"],
  ["Data de perda", "Fecha de pérdida"],
  ["Configurações do quadro", "Configuración del tablero"],
  ["Personalizar cards", "Personalizar tarjetas"],
  ["Em breve", "Próximamente"],
  ["Atualizar", "Actualizar"],
  ["Exportar", "Exportar"],
  ["Ajuda", "Ayuda"],
  ["Mensagem enviada", "Mensaje enviado"],
  ["Sem atendente", "Sin agente"],
  ["Sem telefone", "Sin teléfono"],
  ["Sem e-mail", "Sin correo"],
  ["Enviar e-mail", "Enviar correo"],
  ["Sem conversa", "Sin conversación"],
  ["{c} de {n} atividades concluídas", "{c} de {n} actividades completadas"],
  ["Ações da etapa", "Acciones de la etapa"],
  ["Selecionar todos", "Seleccionar todos"],
  ["Desmarcar todos", "Desmarcar todos"],
  ["Adicionar negócio", "Agregar negocio"],
  ["Em qual origem?", "¿En qué origen?"],
  ["Nome da etapa", "Nombre de la etapa"],
  ["Canal", "Canal"],
];
let texto = fs.readFileSync(ARQ, "utf8");
if (texto.includes(CAB)) throw new Error("o bloco da V4 já está no dicionário");
const i = texto.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 1D não encontrada");
const eol = texto.includes("\r\n") ? "\r\n" : "\n";
// A chave pode existir COM aspas ("Limpar":) ou SEM aspas (Status:, Conversas:, Atualizar:, Canal: já existem assim).
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const existe = (pt) =>
  texto.includes(JSON.stringify(pt) + ":") || new RegExp("^\\s*" + escapar(pt) + ":", "m").test(texto);
const vistas = new Set();
const novas = [];
const puladas = [];
for (const [pt, es] of ENTRADAS) {
  if (vistas.has(pt)) continue;
  vistas.add(pt);
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
Expected: uma linha `N entradas novas; já existiam M: …`, com N + M = 42.

- [ ] **Step 2: A gate do espanhol e o typecheck**

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/i18n
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
```
Expected: PASS. Se a gate apontar um texto da V4 sem espanhol, acrescente a entrada no bloco da V4 (o mesmo formato) e rode de novo. Se apontar `t()` com algo que não é literal num arquivo desta parte, troque pelo padrão da 1D (literal, ou tabela fechada dentro do `t()`). Chave repetida aparece no typecheck como `An object literal cannot have multiple properties with the same name`: apague a linha nova repetida.

- [ ] **Step 3: Commit**

```bash
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol do quadro da casca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Conferência visual lado a lado com a Clint

**Files:**
- Nenhum arquivo do repositório muda, a não ser para corrigir uma diferença achada aqui. Cada correção é um commit `fix(escale): …` desta task.

**Interfaces:**
- Consumes: tudo das Tasks 1 a 14.
- Produces: o relatório "diferenças que sobraram", que vai para o corpo do PR (Task 16).

- [ ] **Step 1: Onde conferir (regra única dos planos V1 a V4, contrato "Conferência visual")**

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

- **`CAMINHO A`** (existe `.env.local` e ele aponta para um Supabase local, não para o de produção):
  ```bash
  export PATH="/c/Program Files/nodejs:$PATH"
  corepack pnpm dev
  ```
  (em segundo plano). Faça login, ligue a casca em `http://localhost:3000/app/escale/menu?usar=topo&voltar=/app/escale/negocios` e abra um funil com cards que tenham conversa, tags, valor e dono. Siga os Steps 2 a 5.
- **`CAMINHO B`** (o normal hoje: em 16/10 não havia `.env.local`):
  - **não** crie `.env.local`, **não** suba o Supabase local nem o Docker sem o "pode fazer" do usuário e **nunca** aponte o dev server para o banco de produção (`jsrzgxyioczdgwiklkrc`) nem para o antigo (`hwpnnstguqrfhfnsvthv`);
  - vá para a Task 16. No corpo do PR, `<cole aqui a lista do relatório da Task 15>` vira as diferenças já conhecidas do Step 4 mais a linha "Conferência visual pendente: feita depois do deploy, em https://app.escaleia.com, pela regra do contrato; as diferenças medidas vão num PR de correção (`fix/casca-clint-v4-conferencia`)";
  - **depois do deploy** (quando o usuário avisar que mergeou, publicou a versão e atualizou a VPS; nada disso é deste plano), faça os Steps 2 a 4 no app de produção: carregue a skill `chrome-browser` e as ferramentas do Claude in Chrome (`mcp__claude-in-chrome__*`) num único ToolSearch, trabalhe numa aba nova e abra `https://app.escaleia.com/app/escale/menu?usar=topo&voltar=/app/escale/negocios` com a sessão do próprio usuário (se pedir login, PARE e peça para ele entrar; nunca digite senha). Não suba dev server;
  - **só leitura:** navegar, abrir e fechar os gatilhos, a engrenagem, o ⋮ e os menus (Esc), mudar filtros só na tela (eles vivem na URL; não clique em salvar filtro), passar o mouse, ler a página, medir com `javascript_tool` e tirar captura. **Proibido** arrastar card (a etapa muda no banco), criar negócio, selecionar em lote e agir, renomear etapa, salvar filtro ou mudar configuração: é o banco de produção. O item "Arrasto" do Step 3 e os estados "card sendo arrastado" e "coluna como alvo do arrasto" ficam para o usuário fazer ele mesmo (ou para um banco de teste) e entram no relatório como "não medido em produção";
  - a lista das diferenças (cada uma com o porquê) vai num **PR de correção**: branch `fix/casca-clint-v4-conferencia` a partir de `escale-crm/main`, cada conserto com o teste da peça, commits com o rodapé `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, PR para `rgisjr/escale-crm` com o corpo terminando em `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Sem push em `origin`, sem merge, sem release, sem VPS.
  - Esta conferência inclui também os componentes da V1 que aparecem aqui (gatilhos, calendário, caixinha e seletor), contra docs/escale/clint/crops/datatabs.png, essasemana.png e filterbar.png: a V1 deixou essa comparação para a tela real.

- [ ] **Step 2: Capturar no mesmo tamanho dos prints**

Os prints da Clint são de uma tela 1920 a 125% = **1536×804 px de CSS**. Ajuste a janela do navegador para isso (no Chrome pelo MCP `claude-in-chrome`: `resize_window` 1536×~880 com a barra do navegador) e capture:
1. a página inteira do funil com a barra fechada;
2. a barra com o hover em "Dono do negócio";
3. o "Data" aberto;
4. um card de perto (zoom do navegador em 300%, como o card1.png);
5. o cabeçalho de uma coluna de perto;
6. os ícones da linha de ações de perto;
7. a Visualização inteira.

- [ ] **Step 3: Comparar lado a lado e corrigir**

Abra cada captura ao lado da referência (Read no PNG):

| Captura | Referência |
|---|---|
| 1 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-010-kanban-v1.png |
| 2 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-do-usuario\2026-10-15-barra-de-filtros.png |
| 3 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-do-usuario\2026-10-15-filtro-data-aberto.png |
| 4 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\crops\card1.png |
| 5 | ...\docs\clint\crops\colhead.png |
| 6 | ...\docs\clint\crops\icons-right.png |
| 7 | 01-010 (mesmo esqueleto) |

Confira item por item, com a tabela "Medidas da Clint usadas" deste plano:
- **Cabeçalho:** sobrelinha (tamanho, peso, cinza), título (26px, peso 600), "Negócio +" na cor da marca, alinhado à sobrelinha; nenhum seletor no título; sem Quadro/Calendário.
- **Barra:** busca 109×32 sem borda e com a lupa à direita; seis gatilhos na ordem; ~14px entre eles; hover com fundo `bg-casca-raia`; aberto escuro com texto branco; selo cinza redondo no Status ("Status 1").
- **Data aberto:** 4 abas (a do relógio desligada, com a dica "Em breve"), atalhos à esquerda, dois meses, células lavanda com número na cor da marca, painel 12px abaixo do gatilho.
- **Altura:** com a casca, o quadro termina no pé da tela, sem os 12px de folga do topo antigo de 56px (Task 12, 4e, e Task 13), e a página não ganha rolagem vertical.
- **Linha de contagem:** "N oportunidades de **Negócio**"; quatro ícones à direita com ~34px entre centros; exportar mais claro (desligado); ajuda sobre o quadrado lilás.
- **Colunas:** 260px, 12px entre elas, lavanda, cantos de ~16px, sem borda; nome 14px/500, "R$…" 12px, círculo de 28px; ⋮ cinza; barra de rolagem dentro da coluna.
- **Card:** 236px, branco, cantos ~10px, sem sombra; chips nas cores da Clint; nome 13px/500; foto 28px; caixa da mensagem lavanda com borda azul-clara; divisória; rodapé com avatar de 20px, três ícones, "R$…", "x/y" com check e "Nd/Nh" com relógio.
- **Estados:** hover do card; card sendo arrastado; coluna como alvo do arrasto (tom claro da marca); "+ Adicionar negócio".
- **Arrasto:** com o quadro rolado para a direita, arraste um card para uma coluna fora da tela (D7). Anote se o quadro rola sozinho. Arraste para uma coluna visível e confirme que a etapa muda.
- **Modo escuro:** troque o tema pelo menu do avatar e confira que nada fica ilegível (o cinza `#BDBDBD` do exportar desligado e as cores das tags são fixas da Clint).

Para cada diferença: corrija (commit `fix(escale): …`, com o teste da peça rodando de novo) ou escreva o motivo no relatório. Diferença sem motivo = task não pronta.

- [ ] **Step 4: O relatório das diferenças**

Escreva no relatório da task (e guarde para o PR) a lista "Diferenças que sobraram", uma linha por diferença, com o motivo. Já se sabe que sobram, com motivo:
- a cor da marca é a da organização, não o roxo da Clint (regra do produto);
- o número do círculo da coluna é `#2F2C5D` e não `#000` (legível no modo escuro);
- a divisória do rodapé do card usa `border-casca-borda` (`#E8E4F5`) e não `#E5E7EB` (a V1 não tem o token);
- o selo de não lidas é `#597EFF` e não `#4C73FF` (mesmo motivo);
- a caixa da mensagem não mostra o nome de quem mandou ("Luciana:"), o ícone de mídia (voz/documento), o ✓✓ azul de "lida" nem as mensagens de sistema ("O status foi alterado"): o payload do quadro não tem esses dados;
- a linha do agente (D9) não existe na Clint;
- Ordenar, Filtros salvos e Limpar ficam na engrenagem (D5), e "Limpar" fica no pé de cada painel (sem print);
- o resultado do teste de arrasto para coluna fora da tela (D7).

- [ ] **Step 5: Parar o dev server**

CAMINHO A: encerre o `pnpm dev` que ficou em segundo plano. CAMINHO B: não há dev server; feche a aba que você abriu e abra o PR de correção com a lista do Step 4.

---

### Task 16: Gates e PR

**Files:**
- Nenhum arquivo novo. Só verificação e o PR.

**Interfaces:**
- Consumes: tudo das Tasks 1 a 15.
- Produces: o PR para `rgisjr/escale-crm`. Não mergear, não publicar release e não mexer na VPS.

- [ ] **Step 1: Os gates inteiros**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:unit 2>&1 | tail -40
```
Expected:
- typecheck sem erros novos;
- lint sem erros (warnings antigos podem continuar);
- `test:unit` com falhas SÓ entre as conhecidas desta máquina.

Para provar que uma falha não é regressão, rode o mesmo arquivo em `escale-crm/main` num worktree temporário:

```bash
git worktree add ../wt-main-v4 escale-crm/main && cd ../wt-main-v4 && corepack pnpm install --frozen-lockfile && corepack pnpm vitest run <arquivo> ; cd - && git worktree remove ../wt-main-v4 --force
```
Regressão é o que passa lá e falha aqui: corrija antes de seguir.

- [ ] **Step 2: A prova no Postgres (a leitura do quadro mudou)**

A etapa do fork na rota do quadro passou a ler `contacts.avatar_storage_path` (Task 3). Não há migration, mas a leitura roda sob RLS:

```bash
docker info --format '{{.ServerVersion}}'
corepack pnpm test:db 2>&1 | tail -30
```
Expected: `==> test:db verde`. Se o Docker não responder, PARE e peça ao usuário para abrir o Docker Desktop.

- [ ] **Step 3: O original ficou intacto**

```bash
git diff escale-crm/main --stat -- components/kanban/StageColumn.tsx components/kanban/KanbanCard.tsx components/kanban/FilterBar.tsx components/kanban/ConversaSlot.tsx components/kanban/ContatoNoCard.tsx "app/api/v1/pipelines/[id]/board/route.ts"
git diff escale-crm/main -- components/kanban/KanbanBoard.tsx "app/app/pipelines/[id]/_client.tsx" | grep '^-' | grep -v '^---'
```
Expected: o primeiro comando não lista nada. O segundo lista só a linha antiga da classe do contêiner do `KanbanBoard` (`className="flex min-h-0 flex-1 items-start gap-3 overflow-auto px-4 pb-4"`), a abertura do `map` (`{data.stages.map((stage) => (`), o fechamento `))}`, a linha da altura do `_client.tsx` (`className="flex h-[calc(100dvh-3.5rem-…)] min-h-[28rem] flex-col gap-4"`, que ganhou a classe da casca no fim), a linha do comentário do cabeçalho que ganhou o ramo da casca antes dela e as linhas de fechamento que ganharam o fragmento. Qualquer outra linha removida do original: desfaça.

- [ ] **Step 4: Push e PR**

```bash
git push -u escale-crm feat/casca-clint-v4-quadro
gh pr create -R rgisjr/escale-crm --base main --head feat/casca-clint-v4-quadro \
  --title "feat(escale): Casca V4 — quadro de Negócios igual à Clint" \
  --body-file - <<'PR'
## O que muda

Com a **casca nova** (`escale_menu=topo`), a página do quadro de Negócios (funil e Visualização) fica igual à Clint, variante menu superior (`01-010-kanban-v1.png` e os prints de 15/10). Só a marca é nossa.

- **Cabeçalho:** "NEGÓCIOS DA ORIGEM", o nome grande e "Negócio +". Sem seletor de funil no título (trocar é pelo painel da esquerda) e sem Quadro/Calendário.
- **Barra:** busca e os 6 gatilhos da Clint (Data, Campos, Tags, Dono do negócio, Status, Mais filtros), cada um com o selo da contagem. Nenhum controle nativo de data, seleção ou caixinha.
- **Data:** o calendário com abas e atalhos; filtra por criação, **ganho** e **perda** (estes dois são novos e acrescentam o status deles). A aba do relógio fica desligada até o print.
- **Linha de contagem:** "N oportunidades de Negócio" com o número real; atualizar, exportar (desligado até a 1E), engrenagem (Ordenar, Filtros salvos, Limpar filtros, Personalizar desligado) e ajuda (desligada).
- **Colunas:** raia lavanda de 260px com rolagem própria, total "R$…" (nunca "undefined"), círculo da contagem, ⋮ com "Selecionar todos" e "+ Adicionar negócio".
- **Card:** tags na paleta da Clint, nome do contato com a foto, caixa da última mensagem, rodapé com dono, chamar/conversa/e-mail, valor, atividades e tempo na etapa.

Sem a casca, a página, o `FilterBar`, o `StageColumn` e o `KanbanCard` do original ficam exatamente como estão (testes provam).

## Banco

Sem migration. A etapa do fork na rota do quadro (`comDadosDosFiltros`) lê também `contacts.avatar_storage_path` e anexa `contato_tem_foto`; a foto vem da rota que já existe (`/api/v1/contacts/{id}/avatar`).

## Decisões que pedem o seu olho

<copie aqui a tabela "Decisões desta parte" do plano, D1 a D16>

## Diferenças que sobraram (conferência visual, Task 15)

<cole aqui a lista do relatório da Task 15>

## Prints que faltam

Itens 15 a 33 do plano-índice (`docs/superpowers/plans/2026-10-16-casca-igual-a-clint.md`). Até chegarem, o plano manteve o comportamento atual com o visual mínimo da Clint.

## Verificação

- [ ] `typecheck`, `lint` e `test:unit` (só as falhas conhecidas do Windows).
- [ ] `test:db` verde.
- [ ] Na tela, com a casca nova, depois do deploy (usuário):
  - [ ] funil e Visualização lado a lado com `01-010-kanban-v1.png`;
  - [ ] Data aberto lado a lado com o print de 15/10;
  - [ ] filtrar por data de ganho traz os ganhos do período;
  - [ ] arrastar card entre colunas, selecionar, abrir o dossiê e usar o ⋮ do card;
  - [ ] sem a casca (menu lateral), o quadro é o de antes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PR
```

Antes de rodar, troque os dois `<…>` do corpo pelo conteúdo real (a tabela de decisões e o relatório da Task 15; no CAMINHO B da Task 15, as diferenças já conhecidas mais a linha "conferência visual pendente, depois do deploy, com o PR de correção `fix/casca-clint-v4-conferencia`"). Expected: a URL do PR. Mostre a URL ao usuário e PARE: merge, tag, release e VPS só com o "pode fazer" dele.

---

## Fronteira com a 1E

A V4 entrega o **visual padrão** da Clint para o card e a coluna, e os lugares visuais das ações. O comportamento novo dessas ações continua na 1E, que precisa ser **reescrita** sob a regra nova antes de executar.

| Item | A V4 entrega | Fica para a 1E |
|---|---|---|
| Card | a anatomia padrão da Clint (`CardDaCasca`) | a capa configurável ("Personalizar cards", prévia, padrão da origem, migration 9005). A capa entra no `CardDaCasca` (fork), não no `KanbanCard` do original |
| "Personalizar cards" | a linha desligada na engrenagem ("Em breve") | a janela e o lugar definitivo (PRINT 33) |
| ⋮ da coluna | o ⋮ no lugar e no visual da Clint, com o "Selecionar todos" que já existia | "Selecione [N]" e o corte de papel (agent ou acima) |
| "+ Adicionar negócio" | o link no pé das colunas abertas; abre o "Novo negócio" de sempre (a etapa se escolhe no formulário) | já abrir na etapa da coluna (`etapaInicial`) e o corte de papel |
| "Negócio +" | o botão da marca; abre o "Novo negócio" | o menu "Novo negócio" / "Importar negócios" (PRINT 19) |
| Exportar | o ícone da Clint, desligado | exportar o recorte em CSV, a trava de papel e a auditoria (PRINT 16) |
| Recentes | — | a seção no painel (V3 desenha o lugar) |

Consequências para reescrever a 1E:
- o `QuadroDoFunil` previsto na 1E deixa de ser necessário: o `KanbanBoard` já tem `aparencia="casca"` e a coluna do fork (`ColunaDoFunilNaCasca`), onde entram o ⋮ e o pé da coluna;
- a prop `capa` deixa de ir no `KanbanCard` do original: vai no `CardDaCasca`, e as peças de `PecasDoCard` passam a obedecer a capa;
- "Exportar" sai do "⋮ do quadro" da 1E e vai para o ícone da linha de ações que a V4 deixou desligado.

## Prints que faltam desta parte

Itens 15 a 33 do plano-índice (`clint-telas.md` §7). Todos na variante menu superior, na resolução dos prints de 15/10. O que a V4 fez enquanto isso:

| # | Print | O que a V4 fez enquanto não chega |
|---|---|---|
| 15 | Engrenagem da linha de ações aberta | Ordenar, Filtros salvos, Limpar filtros e Personalizar (desligado) dentro dela (D5) |
| 16 | Exportar habilitado e clicado | ícone desligado, "Em breve" (D6) |
| 17 | Ajuda da linha de ações aberta | ícone desligado, "Em breve" (D6) |
| 18 | ⋮ do cabeçalho da coluna aberto | só "Selecionar todos"/"Desmarcar todos" (D10) |
| 19 | "Negócio +" clicado | abre o "Novo negócio" de sempre (D16) |
| 20 | Card com hover e card sendo arrastado | hover com sombra suave na cor da marca; arrastado inclinado com a sombra do painel; coluna-alvo no tom claro da marca (estados da UI nova da Clint) |
| 21 | Card com alerta de tempo na etapa | não há alerta; o "esfriando" do nosso radar aparece na linha do agente (D9) |
| 22 | Carregando, erro, busca sem resultado, filtro sem resultado | os estados do original ("Carregando…", a mensagem de erro); coluna vazia só com o cabeçalho e o "+ Adicionar negócio" |
| 23 | Contagem com valor ≠ 0 | número real com plural (D14) |
| 24 | Data: nomes das abas, intervalo selecionado, gatilho com período, limpar | abas da V1; o gatilho mostra o selo "1"; "Limpar" no pé do painel |
| 25 | Campos aberto | a lógica da 1D (condições) com o visual da casca |
| 26 | Tags aberto | caixinhas com E/OU (lógica da 1D) |
| 27 | Dono do negócio aberto | lista com busca a partir de 8 (Todos, Eu, Sem responsável, equipe, agentes) |
| 28 | Status aberto | caixinhas Em aberto/Ganhos/Perdidos + "Mostrar todos" |
| 29 | Mais filtros aberto | Conversas, Negócio (valor, atrasados, perda) e Outros num painel só |
| 30 | Barra com vários filtros ativos e o "limpar" | selo em cada gatilho; "Limpar" no pé de cada painel e "Limpar filtros" na engrenagem (D4) |
| 31 | Onde fica Ordenar, e Ordenar aberto | na engrenagem, com o painel da 1D no visual da casca |
| 32 | Filtros salvos em Negócios | na engrenagem, com o menu da 1D |
| 33 | Personalizar cards na variante superior | linha desligada na engrenagem (1E) |

Também sem print, e decididos aqui: a Visualização na variante superior (D15) e o tempo na etapa em horas até 47h (D11, inferido dos prints "31h" e "3d").

## Auto-revisão

**Cobertura do pedido:**
- Branch `feat/casca-clint-v4-quadro`: Task 1.
- Cabeçalho (sobrelinha, título 26/600, "Negócio +", título sem seletor, sem Quadro/Calendário): Task 12 (funil) e Task 13 (Visualização).
- Barra (busca 109×32, 6 gatilhos, Data com o calendário e o mapeamento criação/ganho/perda com schema, URL e aplicar testados, "agendado" desligado, Campos, Tags, Dono, Status com selo, Mais filtros; nenhum controle nativo; Ordenar e Filtros salvos na engrenagem; selos no lugar dos chips): Tasks 2, 5, 6, 7 e 8.
- Linha de contagem e ações (número real com plural, atualizar, exportar desligado, engrenagem, ajuda desligada): Task 8.
- Colunas (raia, 260px, gap 12, cabeçalho, R$, círculo, ⋮, rolagem própria, vazio, alvo do arrasto): Task 10.
- Card (tags na paleta da Clint, título pelo nome do contato, foto pelo payload + rota existente, caixa da mensagem, rodapé): Tasks 3, 4 e 9.
- Comportamentos preservados (arrasto, seleção, dossiê, ⋮ de ações, pulso, renomear): Tasks 9, 10 e 11.
- Visualização: Task 13. i18n: Task 14. Conferência visual: Task 15. Gates e PR: Task 16.
- "Sem a casca, igual a antes": Task 11 (quadro) e Task 12 (página); Task 16, Step 3 (diff do original).

**Placeholders:** os únicos `<…>` são os dois trechos do corpo do PR que dependem do relatório da Task 15, e o passo manda trocá-los antes de rodar.

**Consistência de nomes entre tasks:**
- `periodoDosFiltros`, `comPeriodo`, `TIPOS_DE_DATA_DISPONIVEIS`, `isoDaDataBr`, `dataBrDoIso` (Task 2) → Tasks 5 e 7;
- `contato_tem_foto` (Task 3) → `fotoDoContato` (Task 4) → `FotoDoContato` (Task 9);
- `contarPorGatilho`, `limparGatilho` (Task 4) → Task 7;
- `CLASSE_DO_CAMPO`, `CLASSE_DA_LINHA_DO_MENU`, `CampoDeData` (Task 5) → Tasks 6 e 8;
- `GatilhoComPainel` (Task 7) → `FiltroDeData`, `StatusDoQuadro`, `GatilhosDoQuadro`;
- `CardDaCasca` (Task 9) → `ColunaDoFunilNaCasca` (Task 10) e `ColunaDaVisualizacao` (Task 13);
- `ColunaDaCasca` (Task 10) → Task 13;
- `aparencia`, `aoAdicionarNegocio` (Task 11) → Task 12;
- `CabecalhoDaCasca`, `BotaoNegocioMais` (Task 12) → Task 13.

**Riscos conhecidos:**
- Os testes de tela dependem do comportamento da V1 (nome acessível da caixinha e das opções, abas desligadas no calendário, `className` e props repassados). A Task 1 confere antes de começar e manda parar se divergir.
- Rolagem por coluna × arrasto (D7): medido na Task 15 só com banco de teste (CAMINHO A); em produção (CAMINHO B) o arrasto não é feito pelo agente, e quem confere é o usuário. A decisão final fica com ele.
- Conferência visual: local só com `.env.local` apontando para um banco de teste; senão, depois do deploy, no app de produção, só leitura, com o Claude in Chrome, e os consertos num PR de correção (regra do contrato). Nunca um dev server local ligado ao banco de produção.
- Painéis aninhados (Ordenar e Filtros salvos dentro da engrenagem): o Radix trata camadas aninhadas pela árvore do React (o foco e o clique no painel de dentro não fecham o de fora). O teste da barra (Task 8) abre a engrenagem, o Ordenar e os seletores dentro dele.
