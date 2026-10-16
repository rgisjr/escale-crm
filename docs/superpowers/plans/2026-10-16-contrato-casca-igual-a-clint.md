# Contrato comum — "Casca igual à Clint" (V1 a V4)

Este arquivo fixa as decisões e os NOMES que os quatro planos usam. V1 cria; V2, V3 e V4 consomem. Nenhum plano muda estes nomes. Esta é a versão final, já com as mudanças que a V1 registrou (seção "Mudanças feitas pela V1") e com a revisão cruzada dos quatro planos (16/10/2026).

## Decisões do usuário (16/10/2026)
- **Regra:** tudo o que se vê e se usa fica IDÊNTICO à Clint, variante **menu superior** (README da pasta `clint-documentacao`). Só a marca é nossa: empresa Escale IA, app Escale OS. Onde a Clint usa o roxo da marca (`#6C19DE`, e o roxo antigo `#7C00FF`), usamos a **cor da marca da organização** (`var(--color-accent)`, que o tema da casca define e a marca da org sobrescreve) no mesmo lugar e com o mesmo peso. Os tons lilás claros da Clint viram tons claros da nossa marca, com `color-mix`.
- **Menu do topo igual à Clint:** Negócios, Contatos, Atividades, Atendimento (é o nosso Conversas, renomeado na casca, com o contador da fila), Automações, Campanhas, Indicadores e ⠿ Mais. Empresas, Agenda e Agentes IA vão para o Mais.
- **Lado direito do topo igual à Clint:** ✦ (IA), "?" (ajuda, com selo), botão "Novo +" e avatar quadrado ▾. Busca ⌘K, sino de alertas, idioma e tema vão para dentro do menu do avatar e continuam funcionando.
- **Alternância Quadro/Calendário:** escondida na casca nova. O calendário continua no menu lateral do original.
- **Bugs da Clint não se copiam:** a linha de contagem mostra o número real, com plural ("1 oportunidade de Negócio", "2 oportunidades de Negócio"), e um valor de coluna nunca mostra "undefined".
- **Sem print, não se inventa.** O que a pasta não mostra fica na lista "Prints que faltam" do plano-índice. Até chegar o print, o plano mantém o comportamento atual com o mínimo de visual.

## Referências que todo plano lê
Cópias estáveis em `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\`. A V1 (e só a V1) copia essa pasta inteira para o repositório, em `docs/escale/clint/`; V2, V3 e V4 leem de lá ou da pasta de origem e não copiam nada dela.
- `clint-design-system.md`: cores medidas, fonte, raios, sombras, tamanhos e componentes. Escala dos prints = 1,25; os valores do documento já vêm em px de CSS.
- `clint-telas.md`: spec tela a tela. Atenção: ela mede em px do PRINT. Divida por 1,25 para ter px de CSS (ex.: topo 55 → 44, coluna 325 → 260).
- `inventario-escale.md`: o nosso código e as cercas.
- `crops/`: recortes ampliados (datatabs.png, essasemana.png, filterbar.png, top-left.png, top-right.png, fab.png, leftpanel.png, m032.png, card1.png, colhead.png, icons-right.png, msg-status.png, msg-voice-unread.png, bottom-tags.png, card-tag-voice.png).
- `prints-do-usuario/`: 2026-10-15-filtro-data-aberto.png (o Data aberto), 2026-10-15-barra-de-filtros.png (a barra, hover em "Dono do negócio") e 2026-10-15-escale-atual.png (o NOSSO app de hoje; não é referência).
- Capturas da Clint: `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\` (abrir o PNG) e ...\modulos\12-configuracoes-e-mais\imagens\12-001-menu-mais.png.

## Tokens da casca (criados na V1)
Todos valem só com a casca ligada. Cada um mora em três lugares:
- declarado no `:root` de `app/globals.css`, num bloco do fork no fim do `:root`, com um fallback que é SEMPRE `var(<token do próprio original>)` (`var(--color-text)`, `var(--color-border)`…). Sem a casca, o utilitário pinta uma cor que o original já tinha. Nunca `var(--color-accent-NNN)` e nenhum nome terminado em `-soft`/`-fg` (régua da marca e cerca `branding-pares-pintados`, 18/26 pares);
- ponte em `@theme inline`, num bloco do fork no fim dele;
- valor real em `app/escale-tema.css`, dentro de `body:has([data-escale-casca])` e de `[data-theme="dark"] body:has([data-escale-casca])`.
- **Não** entram em `[data-theme="light"]` nem em `[data-theme="dark"]` do `globals.css` (a cerca `branding-tema-claro-escopavel` exige que os dois cubram as mesmas chaves). O escuro da casca mora só no `escale-tema.css`, com valores DERIVADOS da paleta escura da casca (a Clint escura não tem print).

Nomes das utilidades (Tailwind; o `@theme` gera `text-`, `bg-`, `border-`, `ring-`… para todo `--color-*`):

| Token CSS | Utilidade | Valor claro (casca) | Papel |
|---|---|---|---|
| `--color-casca-texto` | `text-casca-texto` | `#2F2C5D` | texto principal |
| `--color-casca-texto-2` | `text-casca-texto-2` (e `bg-casca-texto-2`) | `#3E3A6F` | texto secundário forte; fundo da aba ativa do calendário e da dica escura |
| `--color-casca-suave` | `text-casca-suave` | `#686D86` | texto suave |
| `--color-casca-meta` | `text-casca-meta` | `#8C89B0` | metadados e ícones do card |
| `--color-casca-sobrelinha` | `text-casca-sobrelinha` | `#828282` | "NEGÓCIOS DA ORIGEM" |
| `--color-casca-borda` | `border-casca-borda` | `#E8E4F5` | bordas e divisórias |
| `--color-casca-raia` | `bg-casca-raia` | `#EFF3FF` | fundo da coluna e hover do gatilho |
| `--color-casca-caixa-msg` | `bg-casca-caixa-msg` | `#EFF6FF` | caixa de mensagem do card |
| `--color-casca-borda-msg` | `border-casca-borda-msg` | `#E3EBFF` | borda da caixa de mensagem |
| `--color-casca-busca` | `bg-casca-busca` | `#F6F8FF` | campo de busca |
| `--color-casca-contador` | `bg-casca-contador` | `#E8E4F5` | círculo de contagem da coluna |
| `--color-casca-cinza-selo` | `bg-casca-cinza-selo` | `#E0E0E0` | selo cinza ("Status 1") |
| `--color-casca-dia` | `bg-casca-dia` | `color-mix(in oklab, var(--color-accent) 4%, white)` (o `#F7F7FE` da Clint) | célula do calendário |
| `--color-casca-marca` | `bg-casca-marca`, `text-casca-marca`, `border-casca-marca` | `var(--color-accent)` | onde a Clint usa `#6C19DE` |
| `--color-casca-marca-forte` | `bg-casca-marca-forte` | `color-mix(in oklab, var(--color-accent) 85%, black)` | hover do primário (`#5B16BC` na Clint) |
| `--color-casca-marca-suave` | `bg-casca-marca-suave` | `color-mix(in oklab, var(--color-accent) 8%, white)` | `#F4F1FF` e `#F8F6FD` da Clint (item ativo do topo, superfícies) |
| `--color-casca-marca-media` | `bg-casca-marca-media` | `color-mix(in oklab, var(--color-accent) 18%, white)` | `#E8E1FF` da Clint |
| `--color-casca-novo` | `bg-casca-novo` | `#597EFF` | botão azul "Novo +" e atalho ativo do calendário (não é a marca: copiar) |
| `--color-casca-alerta` | `bg-casca-alerta`, `text-casca-alerta` | `#FF4B4C` | selos vermelhos |
| `--color-casca-escuro` | `bg-casca-escuro` | `#2F2C5D` | gatilho de filtro aberto (fundo escuro, texto branco) |
| `--color-casca-chevron` | `text-casca-chevron` | `#7489A8` | chevron dos gatilhos e dos seletores (V1) |
| `--color-casca-divisoria` | `border-casca-divisoria` | `#EBEBEB` | divisórias dos atalhos e sob as abas do calendário (V1) |
| `--color-casca-seta` | `text-casca-seta` | `#CCCCCC` | setas de mês do calendário (V1) |
| `--color-casca-caixa` | `bg-casca-caixa` | `#DFE2FD` | fundo do checkbox vazio (V1) |
| `--color-casca-caixa-borda` | `border-casca-caixa-borda` | `#D5DCFF` | borda do checkbox vazio (V1) |

- Os tons `casca-marca*` e `casca-dia` são declarados no `body` da casca (claro e escuro), para resolverem com a marca da organização (`body:has([data-marca-org])`, injetada depois).
- Raios: `--radius-casca-gatilho` 6px → `rounded-casca-gatilho`; `--radius-casca-card` 10px → `rounded-casca-card`; `--radius-casca-raia` 16px → `rounded-casca-raia`. O valor fica direto no `:root`.
- Sombra: `--shadow-casca-painel` = `0 8px 16px rgb(17 24 39 / 0.1), 0 0 1px rgb(17 24 39 / 0.3)` → `shadow-casca-painel` (no `:root` e redefinida nos dois blocos da casca, mais forte no escuro).
- **Não use alfa em cor de texto da casca** (`text-casca-*/<alfa>`): a cerca `tailwind-tokens` exige 4,5:1.
- Fonte: a casca usa **Poppins** (400, 500 e 600; a Clint não passa de 600), `"Escale Poppins"` em `--font-atkinson` do `body` da casca. A V1 troca a "Escale Figtree" e ajusta `tests/unit/escale-tema.test.ts` (4 URLs de `@font-face`).
- **Variáveis só da casca, fora da tabela (V3):** `--escale-painel-hover` (`#F3F3F3`), `--escale-salvar` (`#35EFB3`) e `--escale-salvar-texto` (`#2F2C5D`), lidas por valor arbitrário (`bg-(--escale-salvar)`), num bloco que a V3 acrescenta no FIM de `app/escale-tema.css`. A V4 pode usá-las nos modais dela.

## Componentes da casca (criados na V1, em `components/escale/ui/`)
Cada um em seu arquivo, com teste em `tests/unit/escale-ui-<nome>.test.tsx`. Nenhum usa `<select>`, `<input type="date">`, checkbox ou rádio nativos, nem o `<Button>` do original. Todo texto próprio passa por `t()`; rótulos que vêm de quem chama (`rotulo`, `grupo`, `vazio`) chegam traduzidos e não passam por `t()`.
- `BotaoDaCasca.tsx` → `export const BotaoDaCasca = forwardRef<HTMLButtonElement, BotaoDaCascaProps>`, com `BotaoDaCascaProps = { variante: "marca" | "novo" | "texto" | "icone"; tamanho?: "md" | "sm" } & ButtonHTMLAttributes<HTMLButtonElement>`. `type` padrão `"button"`; `className` se junta por `cn(...)`; as demais props vão ao `<button>`. Marca `data-variante`.
  - `marca`: o "Negócio +" (cor da marca, branco, `rounded-casca-gatilho`, `h-[31px]`).
  - `novo`: o "Novo +" azul do topo (`bg-casca-novo`, `h-[22px]`, `text-[11px]`).
  - `texto`: botão sem fundo (`text-casca-texto-2`, hover `bg-casca-raia`).
  - `icone`: quadrado só com ícone (`size-7`; `sm` = `size-6`). Quem usa passa `aria-label`.
- `GatilhoDeFiltro.tsx` → `export const GatilhoDeFiltro = forwardRef<HTMLButtonElement, { rotulo: string; contagem?: number; aberto?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>>`. Texto + chevron; hover `bg-casca-raia`; aberto (prop `aberto` ou o `aria-expanded` do Radix) `bg-casca-escuro text-white` e `data-aberto`; `contagem > 0` vira o selo cinza circular (o nome acessível fica "Status 1"). Repassa `className` e as demais props. Para usar dentro de `<PopoverTrigger asChild>`.
- `PainelSuspenso.tsx` → `export function PainelSuspenso(props: React.ComponentProps<typeof PopoverContent>)`, montado direto no primitivo `@radix-ui/react-popover` (o `tailwind-merge` não resolve `rounded-casca-*`/`shadow-casca-*` contra o `rounded-md shadow-md` do `PopoverContent`). Fundo `bg-surface`, `rounded-casca-gatilho`, `shadow-casca-painel`, `border-casca-borda`. Padrões: `align="start"`, `sideOffset={11}`, sem padding. Vai dentro de um `<Popover>` do original, no lugar do `PopoverContent`; tem `role="dialog"` (nomeie com `aria-label`).
- `CaixaDaCasca.tsx` → `export function CaixaDaCasca(props: { marcada: boolean | "indeterminada"; aoMudar: (v: boolean) => void; rotulo?: string; "aria-label"?: string; desabilitada?: boolean })`. `<button role="checkbox">` com `aria-checked` (`mixed` na parcial); Espaço alterna, Enter não; da parcial, um clique dá `aoMudar(true)`. Com `rotulo`, o nome acessível é o texto do próprio botão (o `aria-label`, se vier, tem precedência). Sem `className`.
- `SeletorDaCasca.tsx` → `export function SeletorDaCasca<V extends string>(props: { valor: V | ""; opcoes: { valor: V; rotulo: string; grupo?: string; desabilitada?: boolean }[]; aoMudar: (v: V | "") => void; "aria-label": string; vazio?: string; buscaAPartirDe?: number })`. Gatilho `role="combobox"` com o `aria-label`; lista `listbox`/`option` (e `group` por `grupo` consecutivo) num `PainelSuspenso`; busca (`searchbox` "Buscar…") a partir de `buscaAPartirDe`, padrão 8; `vazio` vira a primeira opção (valor `""`, só com a busca vazia) e o texto do gatilho sem valor (sem `vazio`: "Selecione…"). Teclado: ↓ abre, ↑/↓ andam pulando as desabilitadas, Enter escolhe, Esc fecha. Substitui todo `<select>` nativo e o `SearchableSelect` dentro da casca. Sem `className`.
- `CalendarioDePeriodo.tsx` → `export type TipoDeData = "criacao" | "ganho" | "perda" | "agendado"; export type Periodo = { tipo: TipoDeData; de?: string; ate?: string }`, com `de` e `ate` em `AAAA-MM-DD`, e `export function CalendarioDePeriodo(props: { valor: Periodo; aoMudar: (p: Periodo) => void; tiposDisponiveis?: TipoDeData[] })`.
  - Layout igual ao print do Data aberto: painel de ≈742px; coluna de 184px com as **4 abas de ícone de 34×23px** (lucide `CalendarPlus`, `CalendarCheck`, `CalendarX`, `CalendarClock`; tablist "Tipo de data"; cada aba com `aria-label` "Data de criação", "Data de ganho", "Data de perda", "Data agendada"); lista de atalhos (Hoje, Ontem, Essa semana, Semana passada, Esse mês, Mês passado, Esse ano); dois meses lado a lado com setas ("Mês anterior", "Próximo mês"), semana começando no domingo, mês em minúsculas e dias "DOM SEG TER QUA QUI SEX SÁB".
  - **As 4 abas aparecem sempre.** As que não estão em `tiposDisponiveis` (padrão: as 4) ficam desligadas: `disabled`, dica `title` "Em breve", puladas pelas setas. A V4 passa `["criacao", "ganho", "perda"]`: a aba do relógio fica desligada.
  - Componente controlado: o 1º clique num dia dá `{ tipo, de }`, o 2º dá `{ tipo, de, ate }` em ordem, o 3º recomeça; atalho dá `{ tipo, de, ate }`; trocar de aba mantém `de` e `ate`. Datas sempre em dd/mm/aaaa na tela.
  - Atalhos calculados em `lib/escale/ui/periodos.ts` (puro, testado), que exporta `type AtalhoDePeriodo = "hoje" | "ontem" | "essa-semana" | "semana-passada" | "esse-mes" | "mes-passado" | "esse-ano"`, `ATALHOS_DE_PERIODO`, `periodoDoAtalho(atalho: AtalhoDePeriodo, hoje: Date): { de: string; ate: string }`, `diasDoMes(ano: number, mes0: number): { iso: string; doMes: boolean }[]`, `isoDaData`, `dataDoIso`, `formatarDataBr`, `ordenarIntervalo`, `dentroDoIntervalo`, `mesVizinho` e `atalhoDoPeriodo`.
- Tipos exportados a mais: `BotaoDaCascaProps`, `VarianteDoBotaoDaCasca`, `TamanhoDoBotaoDaCasca`, `GatilhoDeFiltroProps`, `PainelSuspensoProps`, `CaixaDaCascaProps`, `OpcaoDoSeletor<V>`, `SeletorDaCascaProps<V>` e `CalendarioDePeriodoProps`.

## Ícones
A Clint usa Feather e Lucide (react-icons). Usamos `lucide-react` 1.52, que já é dependência, reexportado por `lib/ui/icons-da-casca.ts` (arquivo novo da V1; não mexe no `lib/ui/icons.ts` de Phosphor).
- A V1 exporta: `CalendarPlus, CalendarCheck, CalendarX, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Search, RefreshCw, Download, Settings, HelpCircle, Phone, MessageCircle, Mail, CheckCircle2, Clock, MoreVertical, Plus, Sparkles, LayoutGrid`, mais `Check`, `Minus`, `EllipsisVertical` e o tipo `LucideIcon`.
- No lucide 1.52, `MoreVertical`, `HelpCircle` e `CheckCircle2` **existem**, como apelidos oficiais de `EllipsisVertical`, `CircleQuestionMark` e `CircleCheck` (conferido em `node_modules/lucide-react/dist`). O ⋮ da casca se importa pelo nome canônico, **`EllipsisVertical`** (V3 e V4).
- Cada plano acrescenta os nomes que faltam numa linha `export { … } from "lucide-react";` no fim do arquivo, por script que lê os nomes já exportados (inclusive `A as B`) e pula os repetidos. V2: `Bell, FileText, LogOut, Megaphone, MessageCircleMore, ShieldCheck, Sparkle, UserPlus, X` (e o que mais faltar). V3: os do painel (`ChevronUp`, `ListChecks`, `Pencil`, `Eye`, `EyeOff`, `Archive`, `Trash2`, `LayoutPanelLeft`, `SquareDashedKanban`, `Funnel`, `Users`, `Building2`, `Store`, `Bookmark`, `Save`, `FolderPlus`…). V4: `MessageSquare, CheckCheck, User, UserX, ArrowDownUp, SlidersHorizontal`… Todos esses nomes existem no lucide 1.52 instalado.

## Medidas comuns (px de CSS)
- **Topo da casca: 44px** (`h-11`, V2). Antes era 56px (`h-14`). No celular a casca continua com a `TopBar` de 56px.
- Quem desconta o topo da altura da tela, com a casca, do `md` para cima:
  - **V3:** o `PainelOrigens` (`h-[calc(100dvh-2.75rem)]`, sem `var(--space-N)`);
  - **V4:** a página do funil (`app/app/pipelines/[id]/_client.tsx`) e a `QuadroDaVisualizacao`, com a classe extra `md:[body:has([data-escale-casca])_&]:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]`. A classe original de `3.5rem` fica como está (vale sem a casca e no celular).
- Painel esquerdo: 250px (V3). Coluna do quadro: 260px, 12px entre colunas. Card: 236px. Raios: gatilho 6, card 10, raia 16; menus ⋮ e modal com 8. Pesos de fonte: 400, 500 e 600 (nada acima de 600).
- Janela de referência dos prints: 1536px de largura de CSS (1920 ÷ 1,25), área útil ≈ 1536×804.

## Quem mexe em quê (arquivos compartilhados)
- `docs/clint/` → `docs/escale/clint/`: só a V1 copia (Task 1). V2 a V4 copiam só o próprio plano para `docs/superpowers/plans/`.
- `lib/i18n/dicionario.ts`: cada plano insere um bloco do fork por script que PULA as chaves que já existem, **com ou sem aspas** (o dicionário tem chaves sem aspas, como `Nome:`, `Status:`, `Mais:`). Âncoras: V1 logo antes de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D`; V2 logo antes de `  // ─── FORK ESCALE · origens (grupos de funis, Fase 1A) ───`; V3 e V4 logo antes da linha da 1D (o bloco da V3 fica depois do da V1, e o da V4 depois do da V3).
- `app/escale-tema.css`: a V1 mexe nos dois primeiros blocos (claro e escuro da casca) e no `@font-face`; a V3 acrescenta um bloco no FIM. Nunca escreva `}` nem `--algo:` dentro de comentário nos dois primeiros blocos.
- `lib/ui/icons-da-casca.ts`: criado pela V1; V2, V3 e V4 só acrescentam linhas no fim, por script.
- `components/escale/origens/*` (inclusive `ComOrigens`, `PainelOrigens` e o `IconeDoGrupo`, que deixa de usar `estiloDoChip` e fecha a pendência da cerca `chip-contraste-da-etiqueta`): só a V3.
- `app/app/pipelines/[id]/_client.tsx`, `components/kanban/KanbanBoard.tsx` (encaixes) e `components/escale/visualizacoes/{QuadroDaVisualizacao,ColunaDaVisualizacao,QuadroCombinado}.tsx`: só a V4. `components/escale/visualizacoes/{SecaoVisualizacoes,RodapeDaSelecao,JanelasDaVisualizacao}.tsx`: só a V3.

## Ordem, branch e PR
- **V1:** fundação (tokens, fonte, componentes, ícones). Branch `feat/casca-clint-v1-fundacao`.
- **V2:** casca global (menu do topo, lado direito, menu do avatar, Mais, FAB). Branch `feat/casca-clint-v2-topo`.
- **V3:** painel esquerdo de Negócios (ORIGENS, VISUALIZAÇÕES, menus e janelas; RECENTES fica para a 1E). Branch `feat/casca-clint-v3-painel`.
- **V4:** página do quadro e da Visualização (cabeçalho, barra com 6 gatilhos e calendário, linha de contagem e ações, colunas e cards). Branch `feat/casca-clint-v4-quadro`.
- **PR de correção da conferência visual:** branch `fix/casca-clint-vN-conferencia` (N = 1 a 4), a partir de `escale-crm/main`.
- Cada parte sai de `escale-crm/main` depois de a anterior estar mergeada, e tem o seu PR para `rgisjr/escale-crm` (base `main`). V2, V3 e V4 supõem a V1 na `main`.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. O corpo do PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- **Proibido em todos os planos:** push em `origin` (o repositório do Rafael), merge, tag, release, mexer na VPS e gravar no banco de produção. Tudo isso só com o "pode fazer" do usuário, e fora dos planos.
- Sem a casca (`escale_menu` ≠ `topo`), nada muda: todo plano tem um teste que prova isso para a sua tela.

## Conferência visual (regra única dos quatro planos)
Critério de pronto de cada tarefa visual: comparar a tela lado a lado com o PNG citado na tarefa. A lista das diferenças que sobraram, cada uma com o porquê, vai no relatório. Diferença sem justificativa = tarefa não pronta. **Onde** conferir:

1. **Local, só com banco que não é o de produção.** Da raiz do repositório:
   ```bash
   if test -s .env.local \
     && grep -Eq '^NEXT_PUBLIC_SUPABASE_URL=.?https?://(127\.0\.0\.1|localhost)[:/]' .env.local \
     && ! grep -Eq 'jsrzgxyioczdgwiklkrc|hwpnnstguqrfhfnsvthv|escaleia\.com' .env.local; then
     echo "CAMINHO A: local, com banco de teste"
   else
     echo "CAMINHO B: conferir depois do deploy"
   fi
   ```
   Com `CAMINHO A`, sobe o `corepack pnpm dev` e confere no navegador local.
2. **Senão (`CAMINHO B`, o normal hoje: em 16/10 não havia `.env.local`):** não criar `.env.local`, não subir Supabase local nem Docker sem o "pode fazer" do usuário e **nunca ligar um dev server local ao banco de produção** (`jsrzgxyioczdgwiklkrc`) nem ao antigo (`hwpnnstguqrfhfnsvthv`). O plano segue para o PR, que registra "conferência visual pendente: depois do deploy". **Depois que o usuário fizer o deploy da versão** (merge, release e VPS são dele):
   - carregar a skill `chrome-browser` e as ferramentas do Claude in Chrome (`mcp__claude-in-chrome__*`) num único ToolSearch; trabalhar numa aba nova;
   - abrir https://app.escaleia.com com a sessão do próprio usuário (se pedir login, PARAR e pedir para ele entrar; nunca digitar senha) e ligar a casca com `https://app.escaleia.com/app/escale/menu?usar=topo&voltar=<tela>` (só grava o cookie de preferência);
   - **só leitura:** navegar, abrir e fechar menus, painéis e janelas (Esc ou "Cancelar"), passar o mouse, ler a página, medir com `javascript_tool` e tirar captura. Proibido arrastar card, criar, editar, salvar, arquivar, excluir, salvar filtro ou mudar configuração;
   - janela com `resize_window` em 1536×~880 (área útil ≈ 1536×804);
   - comparar cada captura com os PNGs de `docs/escale/clint/` e com as imagens da documentação da Clint, abertos com Read;
   - a lista das diferenças vai num **PR de correção** (`fix/casca-clint-vN-conferencia`), com teste em cada conserto e os mesmos rodapés; diferença sem conserto vai no corpo desse PR com o motivo. Sem merge, release ou VPS.

## Mudanças feitas pela V1 (já valem; V2, V3 e V4 seguem)
Detalhe no plano `2026-10-16-casca-clint-v1-fundacao.md`, seção "Mudanças no contrato". Resumo, já incorporado acima:
1. Cinco tokens a mais: `casca-chevron`, `casca-divisoria`, `casca-seta`, `casca-caixa` e `casca-caixa-borda`.
2. Tokens fora de `[data-theme="light"]`/`[data-theme="dark"]` do `globals.css`; o escuro da casca só no `escale-tema.css`.
3. Fallbacks do `:root` só por referência indireta a tokens do original; nada de `-soft`/`-fg`.
4. Raios e sombra com valor real no `:root`; tons da marca declarados no `body` da casca.
5. `BotaoDaCasca` e `GatilhoDeFiltro` são `export const … = forwardRef(…)`, com os tipos extras.
6. `PainelSuspenso` no primitivo do Radix, `align="start"`, `sideOffset={11}`, sem padding.
7. `periodos.ts` exporta a mais `ATALHOS_DE_PERIODO`, `isoDaData`, `dataDoIso`, `formatarDataBr`, `ordenarIntervalo`, `dentroDoIntervalo`, `mesVizinho` e `atalhoDoPeriodo`.
8. Ícones: os apelidos do contrato existem; entram também `Check`, `Minus` e `EllipsisVertical`.
9. Abas do calendário de 34×23px (não 42×23).
10. `SeletorDaCasca`: a opção `vazio` só aparece com a busca vazia.
11. `CalendarioDePeriodo`: as abas fora de `tiposDisponiveis` ficam desligadas (não somem).
12. `className`: só `BotaoDaCasca`, `GatilhoDeFiltro` e `PainelSuspenso` recebem.
