# Fase 3A — Fila e painel direito de Conversas (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** A1 a A13, A15 e D1 a D11 de `docs/modulos/3-conversas.md` (seção 4, tabelas A e D), com as decisões da seção 9 (presets sobre o mapa de status, "Em espera" = snooze sem lembrete, Automático e Fila fora da casca, painel direito reaproveitando a 1G/1H). **Frente C** (resposta do usuário à pergunta 2 do PRD, 18/10: terceira frente, worktree própria, começando já), migrations na faixa **9200–9299** (esta fase usa **9201**).
> **Um PR** (regra "executa tudo, testa tudo, publica tudo", 18/10): `feat/fase-3a-fila-e-painel`, mergeado direto na `main` ao terminar. Os testes pesados e a publicação ficam para o fim da Frente C (depois da 3E).
> **Este é o primeiro dos cinco planos da Fase 3.** Os outros quatro (3B conversa aberta, 3C setores e configurações, 3D filtros e ações em massa, 3E criação de negócio por dispositivo e conversas embutidas) montam em cima do que esta fase cria: a casca de Conversas (`components/escale/conversas/`), o hook da fila, as preferências por pessoa e o painel direito.

## Decisões do usuário (18/10)

| # | Pergunta | Decisão | Onde vale |
|---|---|---|---|
| Q1 | O PRD de Conversas (rascunho de 17/10, atualizado em 18/10) | **Aprovado** ("o prd ta aprovado") | tudo |
| Q2 | Em que frente a Fase 3 entra (pergunta 2 do PRD) | **(a) Terceira frente, worktree própria, começando já** (recomendação do PRD, aceita com o "faça") | N1 |
| Q3 | Os prints que faltam (seção 11 do PRD) | **Escrever os planos agora e marcar como provisório** o que não tem print; o usuário manda depois | "Prints que faltam" abaixo |

**Prints que faltam nesta fase** (nenhum bloqueia; onde falta, o plano segue o código da Clint e marca como provisório):
1. ❌ Estado "sem canal" do centro ("Conecte um canal para começar a conversar", `component.ChatEmpty.connectHeading`). Provisório: o mesmo molde do centro vazio (ícone, título, texto, um botão).
2. ❌ "Carregando mensagens…" com o spinner na fila (`component.ChatList.loadingMessages`; visto, mas o print não salvou). Provisório: texto centrado com o `Loader2` girando.
3. ❌ A conversa fixada **sem** o modo espião (c54 e c55 têm a faixa verde ligada; o visual da linha fixada não depende dela).

**Goal:** Com a casca ligada, `/app/inbox` vira a tela de Conversas da Clint: a fila com busca, presets (Todos, Não lidas, Meus em aberto, Em aberto, Em espera, Fechadas), ordenação (Última interação, Esperando mais tempo), o menu ⋮ (modo espião e Personalizar visualização, com a preferência por pessoa), a linha da Clint, a conversa fixada fora do filtro, os estados vazios e a tela "Nova conversa"; e o painel direito com "Próximo negócio", o cabeçalho do contato, o cartão do negócio e as 8 seções (Atividades, Contato, Negócio, Empresa, Notas, Anexos, Histórico, Conversas), com "Seções visíveis" e "Personalizar campos". Sem a casca, o Inbox original segue intacto.

**Architecture:**
- **A página** (`app/app/inbox/page.tsx`, original) ganha o mesmo encaixe de `/app/contacts`: com o cookie `escale_menu=topo`, renderiza `<ConversasDaCasca>`; senão, o `InboxLayout` de sempre.
- **A fila** lê a mesma rota do original (`GET /api/v1/conversations`) por um hook do fork (`useFilaDeConversas`), com a mesma chave de cache `["conversations", …]` — o tempo real e a recarga de segurança do original continuam valendo. Dois filtros novos entram no **schema do original** por encaixe de duas linhas (`snoozed` e `ordem`), lidos na rota e aplicados no handler: "Em espera" é o `snooze_until` vigente e "Esperando mais tempo" é a régua `ORDEM_DA_ESPERA` da fila do original.
- **As preferências por pessoa** (Personalizar visualização e os limites de alerta, os campos do cartão do negócio, as seções visíveis) ficam na tabela nova `crm_preferencias_de_conversas` (migration 9201; molde da 9101: uma linha por pessoa, organização e chave), lidas e gravadas por `GET/PUT /api/v1/preferencias-de-conversas`.
- **O painel direito** lê os negócios abertos do contato por uma rota nova de leitura (`GET /api/v1/negocios-do-contato`, pela sessão, RLS de `crm_leads`) e, para o negócio escolhido, usa o **mesmo cache do quadro** da ficha (`useBoard(pipeline_id)`): assim `Lead`, `Pipeline` e `Stage[]` chegam no formato que os componentes da 1G/1H/1I já esperam, e ganhar, perder, mover, editar e as atividades gravam no mesmo lugar. Cada seção reaproveita os hooks e as libs da ficha com um componente **estreito** (o painel tem 384px; a aba inteira da ficha não cabe), e reaproveita como estão `TagsDaFicha`, `DonoDaFicha`, `EditorDeCampo`, `CartaoDoHistorico`, `JanelaDeNota` e `JanelaDeNovoDocumento`.
- **O modo espião** é uma marca da sessão do navegador (`sessionStorage`), sem banco: ligado, a conversa aberta não chama `mark-read`.
- **Nada do centro muda ainda:** o cabeçalho, a thread e o compositor da conversa aberta continuam sendo os do original (`ConversationHeader`, `ChatThread`, `Composer`) dentro da casca; a 3B os troca pelos da Clint.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`, Supabase (RLS), zod, `sonner`, Radix (Popover, Dialog, DropdownMenu).

## Referência visual (abrir a imagem antes de cada task de tela)

Os caminhos ficam **sem crase** (guarda `evidencia-citada`). Os prints `c01` a `c108` têm 1536px de largura e estão em **1:1** (tela de 1536px CSS, Windows a 125%); as fichas `02-00x` estão em 1,25 (px CSS = px ÷ 1,25).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| c01 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c01-fila-sem-conversa-selecionada.jpg | a tela sem conversa: barra "Conversas" + ⚙ + "Nova conversa +", a fila (busca, "Todos", funil, ordem, ⋮, as linhas), o centro vazio e o painel direito vazio | 5, 6, 8 |
| c02 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c02-conversa-aberta-cabecalho-compositor-painel.jpg | a conversa aberta: a linha selecionada (fundo, chevron), o painel direito com "Próximo negócio", o cabeçalho do contato (tags, ações), NEGÓCIOS com o cartão, "Pausar automação" (3B), SEÇÕES | 6, 8, 9 |
| c14 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c14-secao-contato.jpg | a seção Contato aberta: "‹ Contato 👤", Nome, Email, Telefone (BR ▾), Instagram, Tags | 9 |
| c15 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c15-painel-secoes-lista-completa.jpg | as 8 seções fechadas, com o contador "3" em Atividades | 9 |
| c16 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c16-secao-atividades.jpg | a seção Atividades: por dia, linha com ícone, título, "19:31 · em um dia", caixinha, ⋮ e o link do rodapé | 10 |
| c17 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c17-secao-negocio.jpg | a seção Negócio: Origem, Etapa, Dono do negócio, Valor do negócio, Status e "Ir para negócio ↗"; o ícone de ajustes (Personalizar campos) | 10 |
| c18 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c18-secao-empresa.jpg | a seção Empresa: "Nome da empresa · Clique aqui para adicionar" | 9 |
| c19 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c19-secao-notas.jpg | a seção Notas: "+ Adicionar nota" e o vazio "Nenhuma nota ainda." | 9 |
| c20 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c20-secao-conversas.jpg | a seção Conversas: a sessão com o selo "Em aberto", a prévia, a hora e a barra roxa da atual | 10 |
| c21 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c21-nova-conversa-tela-central.jpg | "Nova conversa": o avatar vazio no topo do centro, "Crie ou selecione um contato ?", o texto e a busca | 7 |
| c22 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c22-fila-menu-tres-pontos.jpg | o menu ⋮: Selecionar, Ativar modo espião, Personalizar visualização | 6 |
| c23 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c23-modo-espiao-ativo.jpg | a faixa verde do modo espião | 5 |
| c24 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c24-fila-menu-desativar-espiao.jpg | o ⋮ com "Desativar modo espião" | 6 |
| c31 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c31-fila-dropdown-todos-presets.jpg | o menu de presets: Todos ✓, Não lidas 99+, STATUS (Meus em aberto, Em aberto, Em espera, Fechadas), SALVOS (+ Criar filtro) | 6 |
| c43 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c43-fila-ordenar-por.jpg | o menu de ordem: Última interação ✓, Esperando mais tempo | 6 |
| c44 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c44-personalizar-visualizacao-padrao-com-empresa.jpg | "Personalizar visualização" no padrão (2 de 5): a prévia, os 7 toggles, o rodapé | 6 |
| c45 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c45-personalizar-visualizacao-5-de-5-linha-com-setor-e-tempo.jpg | 5 de 5 (os desligados ficam cinza), a prévia com setor, "3h" amarelo e "⏱ 2", a segunda linha nas linhas da fila | 6 |
| c46 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c46-personalizar-visualizacao-limites-de-alerta.jpg | os limites: "Amarelo a partir de [1] [Horas ▾]", "Vermelho a partir de [4] [Horas ▾]" | 6 |
| c47 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c47-fila-com-setor-e-tempo-sem-resposta.jpg | a fila com a segunda linha (selo "AT", "3 min" … "21 min") | 6 |
| c48 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c48-conversa-instagram-contato-sem-negocio.jpg | contato sem negócio: só "Adicionar negócio" e as seções sem Atividades e Negócio | 8, 9 |
| c49 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c49-secoes-visiveis-popover.jpg | o balão "SEÇÕES VISÍVEIS" com os 8 toggles e "Mostrar todas" | 9 |
| c54 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c54-fila-conversa-fixada-fora-do-filtro.jpg | a conversa fixada: fundo verde-claro, X vermelho, alfinete; a seção Histórico com o seletor "Todos" e o cartão | 6, 10 |
| c55 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c55-conversa-fixada-tooltip.jpg | a dica do alfinete | 6 |
| c75 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c75-fila-vazia-nenhuma-conversa-nos-filtros.jpg | a fila vazia com filtro: funil, "Nenhuma conversa nos filtros", "Ajuste os filtros para ver conversas.", "Iniciar uma conversa"; o botão "Personalizado" (3D) | 6 |
| c81 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c81-menu-tres-pontos-ponto-roxo.jpg | o ponto roxo em "Personalizar visualização" quando difere do padrão | 6 |
| c84 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c84-nova-conversa-busca-criar-contato.jpg | a busca de contatos: "Criar "Neto"" roxo no topo, as linhas com foto, telefone e e-mail | 7 |
| c85 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c85-nova-conversa-contato-escolhido-dispositivo.jpg | contato escolhido: o nome no topo, "Selecione um dispositivo ou conta ?" | 7 |
| c86 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c86-nova-conversa-lista-de-dispositivos.jpg | os dispositivos agrupados (WHATSAPP, WHATSAPP OFICIAL), nome, número, bolinha verde/vermelha | 7 |
| 003 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\02-conversas\imagens\02-003-tela-principal.png | a tela principal (menu lateral; só o conteúdo vale): a linha com ✓✓, 🎤, 📄, ⇄; o cartão com "Perdido" vermelho e o motivo "Não informar" | 6, 8 |
| 004 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\02-conversas\imagens\02-004-secao-atividades.png | Atividades com "2 atrasadas" no cabeçalho da seção e o ícone de abrir o negócio | 10 |
| 005 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\02-conversas\imagens\02-005-configuracao-secao-negocio.png | a janela "PERSONALIZAR CAMPOS · Negócio": busca, "CAMPOS DISPONÍVEIS", "INFORMAÇÕES BÁSICAS", "EXIBIDOS · ARRASTE · 5 campos", "Restaurar padrão", Cancelar, "Salvar campos" | 10 |
| 009 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\02-conversas\imagens\02-009-secoes-card.png | as 8 seções com "2 atrasadas" em Atividades | 9 |

### Medidas tiradas dos prints (px de CSS, 1:1 nos `c`)

| Peça | Medida |
|---|---|
| Barra do módulo (c01) | 48px de altura, borda de baixo `casca-borda`; "Conversas" 16px/500 `casca-texto` a 24px da esquerda; à direita, ⚙ (`Settings` 16px `casca-suave`, botão 32×32) e "Nova conversa +" (`BotaoDaCasca variante="marca"`, 32px, texto 13px/500, `Plus` 14px, 16px de margem direita) |
| As três colunas (c01) | fila **320px** (borda direita `casca-borda`), centro flexível, painel direito **384px** (borda esquerda). Sem arrastar (a Clint não arrasta). Abaixo de `xl` (1280px) o painel direito some e abre numa gaveta (`Sheet`) pelo botão "Ficha" do cabeçalho, como o original faz hoje |
| Busca da fila (c01) | caixa 32px de altura, 12px de margem (x 68–363), fundo `casca-busca`, canto 6px, placeholder "Pesquisar" 12px `casca-meta`, lupa `Search` 16px à direita |
| Barra da fila (c01) | 32px de altura a 20px da busca; à esquerda o botão do preset (`GatilhoDeFiltro`-like: 32px, borda `casca-borda`, canto 6px, ícone `SlidersHorizontal` 14px + "Todos" 12px/500 + `ChevronDown` 14px; aberto = borda `casca-marca`); à direita três ícones 16px `casca-suave` em botões 24×24 com 8px entre eles: `Funnel` (3D; aqui desligado), `ArrowDownUp` (ordem; ativo com fundo `casca-marca-suave` e cor `casca-marca`, c43) e `EllipsisVertical` (⋮) |
| Linha da fila (c01, c47) | 72px de altura (96px com a segunda linha), `px-3`, borda de baixo `casca-borda`; foto **44px** redonda com o selo do canal (16px, canto inferior direito: WhatsApp verde, Instagram rosa); nome 13px/500 `casca-texto` truncado; hora 11px `casca-meta` à direita; prévia 12px `casca-suave` truncada com `CheckCheck` 14px quando a última foi nossa; à direita da prévia: a inicial do atendente num círculo 20px (cor `corDoAvatar`, texto branco 10px/600) ou o ícone "sem atendente" (`UserX` 12px num círculo 20px `casca-raia` `casca-meta`), e a bolha de não lidas (18px, fundo `casca-novo`, texto branco 10px/600); `ChevronDown` 14px `casca-suave` ao passar o mouse (c23). Selecionada: fundo `casca-raia` e barra esquerda 3px `casca-marca` (c02). Segunda linha (c47): selo do setor (3C) 16px, tempo sem resposta 11px (`casca-suave`; amarelo `#FAA200`; vermelho `casca-alerta` em 600), "⏱ n" 11px (3B) |
| Conversa fixada (c54) | fundo `#D1FAE5` (verde-claro da Clint, token novo `casca-fixada`), X vermelho (`X` 14px `casca-alerta`) no canto superior direito, `Pin` 14px `casca-marca` no canto inferior direito com a dica |
| Menu de presets (c31) | `PainelSuspenso` 224px, `p-1`; item 36px: ícone 16px + rótulo 12px (`ITEM_DO_MENU`); o atual em `casca-marca` com `Check` 14px à direita; "Não lidas" com o selo vermelho "99+" (`SeloDaCasca` limite 99); cabeçalhos "STATUS" e "SALVOS" 10px/600 `casca-sobrelinha` uppercase `px-3 pt-2`; "+ Criar filtro" em `casca-marca` (3D; aqui desligado com "Em breve") |
| Menu de ordem (c43) | `PainelSuspenso` 160px; dois itens 36px, o atual com `Check` |
| Menu ⋮ (c22, c81) | `PainelSuspenso` 190px; três itens 36px com ícone 16px (`ListChecks`, `Glasses`, `SlidersHorizontal`); "Personalizar visualização" com um ponto 6px `casca-marca` à direita quando a preferência difere do padrão |
| Faixa do modo espião (c23) | 40px de altura, fundo `#A7F3D0` (token novo `casca-espiao`), `Glasses` 16px, "Modo espião ativo" 12px/600 `#047857` (token novo `casca-espiao-texto`) + "abrir uma conversa não vai marcá-la como lida." 12px, "Desativar" 12px sublinhado à direita; ocupa o topo do centro (c23) |
| Personalizar visualização (c44) | painel de **355px** sobre a esquerda do centro, altura toda, fundo `bg-surface`, borda direita, sombra `casca-painel`; cabeçalho 48px "Personalizar visualização" 14px/500 + X; a prévia num cartão (borda, canto 8px, `p-3`, 16px de margem) com uma linha de exemplo ("Maria Silva", "Oi! Ainda tenho interess…", "21:05", 2 não lidas); lista de toggles com 32px por linha, rótulo 12px, `InterruptorDaCasca` à direita; desligado e fora do limite: rótulo `casca-meta`; "Tempo sem resposta" ligado ganha `SlidersHorizontal` 14px à esquerda do toggle, que abre as duas linhas "Amarelo a partir de [1] [Horas ▾]" (campo 48px + `SeletorDaCasca` 100px); rodapé 48px: "{n} de 5 campos ativos" 12px `casca-suave` e "Restaurar padrão" 12px `casca-texto` |
| Centro vazio (c01) | ícone num quadrado 48px `casca-marca-suave` canto 12px (`MessagesSquare` 24px `casca-marca`), título 14px/600 a 16px, texto 12px `casca-suave` em 3 linhas a 8px, botão "✎ Iniciar uma conversa" (`BotaoDaCasca variante="texto"` com borda, `Pencil` 14px) a 16px |
| Painel direito vazio (c01) | o mesmo molde com `MessageCircle`, "Nenhuma conversa selecionada" 14px/600 e "Selecione uma conversa para carregar as informações do contato" 12px em 3 linhas |
| Fila vazia com filtro (c75) | o mesmo molde dentro da fila, com `Funnel`, "Nenhuma conversa nos filtros", "Ajuste os filtros para ver conversas." e o botão |
| Nova conversa (c21, c84–c86) | o topo do centro vira uma barra 56px com a foto do contato (40px; cinza vazio antes de escolher) e o nome 13px/500; o corpo: ícone 48px (`ContactRound` 24px), "Crie ou selecione um contato" 14px/600 + `AjudaDaCasca`, "Pesquise pelo nome, e-mail, telefone ou Instagram do contato" 12px em 2 linhas, a busca (`SeletorDaCasca aparencia="janela"`, 446px, 32px); a lista: "Criar "{termo}"" (botão `casca-marca` cheio, 32px, canto 6px, largura toda) e as linhas 48px (foto 32px, nome 12px/500, `Phone` 12px + telefone, `Mail` 12px + e-mail 11px `casca-suave`); escolhido o contato, "Selecione um dispositivo ou conta" 13px/600 + ajuda e o segundo seletor; o menu dos dispositivos agrupa por "WHATSAPP", "WHATSAPP OFICIAL", "INSTAGRAM" (10px/600 `casca-meta`), linha 42px com nome 12px e número 11px `casca-suave`, bolinha 8px à direita (verde `#22C55E` conectado, vermelha `casca-alerta` desconectado) |
| Painel direito (c02) | `px-4`; "PRÓXIMO NEGÓCIO" 11px/600 uppercase `casca-sobrelinha` com `Funnel` 14px e o "?" (`AjudaDaCasca`) a 24px do topo; ‹ › 24×24 à direita; cabeçalho do contato: foto 40px, nome 13px/500, chips das tags 11px (`ChipDeEtiqueta`) com X, "+", "+3"; ações rápidas 24×24 `casca-marca` 16px (`Phone`, `Calendar`, `Mail`, `Bell`, `CalendarClock`, `StickyNote`) e, à direita, `User` ("Abrir contato"); "NEGÓCIOS" eyebrow com o contador (círculo 16px `casca-marca`, texto branco 10px) e "+"; o cartão: borda `casca-borda`, canto 8px, `p-4`; "{grupo} › {origem}" 12px `casca-suave` com `ExternalLink` 14px à direita; a barra de etapas (segmentos 4px de altura, 2px entre eles, canto 2px; feitos em `casca-marca`, o resto `casca-borda`); "1. Entrada Lead ▾ 1/14" 12px/500 + 11px `casca-suave`; "VALOR" e "DONO" 10px/600 `casca-sobrelinha` em duas colunas, "R$ 0,00" 13px/600, o dono com o círculo 20px + nome 12px; três botões 28px (Ganho, Perdido, Aberto) de borda `casca-borda` canto 6px 12px, o ativo com a borda e o texto na cor (`casca-marca` para Aberto com `CheckCircle2` 14px; `--escale-status-ganho` para Ganho; `casca-alerta` para Perdido com `CircleX`); perdido: o `SeletorDaCasca` do motivo embaixo, 32px, largura toda (003) |
| "Adicionar negócio" (c48) | botão 32px de borda `casca-borda` canto 6px, largura toda, texto 12px `casca-marca` + `UserPlus` 14px |
| SEÇÕES (c02, c15) | eyebrow "SEÇÕES" com `SlidersHorizontal` 14px à direita; cada seção um cartão 44px, borda, canto 8px, `px-4`, ícone 16px `casca-suave` + rótulo 13px `casca-texto` + `ChevronRight` 14px `casca-chevron`; Atividades: o contador (pílula `casca-marca-suave` / `casca-marca` 11px/600) e "2 atrasadas" (pílula `#FEE2E2` / `casca-alerta`, token `casca-atraso`); 8px entre cartões |
| Seção aberta (c14) | cabeçalho 40px: `ChevronLeft` 16px ("Voltar"), título 14px/500 + o ícone da seção 14px `casca-marca`; à direita, o que a seção tem (ajustes, abrir no negócio); rótulos 12px/500 `casca-texto` a 16px, caixas 36px `casca-busca` canto 6px 12px entre elas |
| Seção Atividades (c16) | "Dom, 18 Out" 12px/600 + pílula "2 atividades" (`casca-raia`, 11px); linha num cartão 48px (borda, canto 8px, `px-3`): ícone do tipo 16px `casca-marca`, título 12px/500, "19:31 · em um dia" 11px `casca-suave`, `CaixaDaCasca` à direita, ⋮ ao passar o mouse; rodapé "Criar, editar ou reagendar no negócio ↗" 11px `casca-marca` centrado |
| Seção Notas (c19) | "+ Adicionar nota" 32px de borda, largura toda, 12px `casca-marca`; vazio: ícone 48px + "Nenhuma nota ainda." 13px/500 |
| Seção Conversas (c20) | linha 56px: foto 36px com o selo do canal, selo "Em aberto" (fundo `--escale-status-ganho-suave`, texto `--escale-status-ganho`, 11px), prévia 12px, hora 11px; a atual com a barra esquerda 3px `casca-marca` e fundo `casca-raia` |
| Seção Histórico (c54) | `SeletorDaCasca` "Todos" 32px no topo; cartões com o ícone num quadrado 24px `casca-marca` (ícone branco 14px), título 12px/500, texto 11px, "🕓 dd/mm/aaaa hh:mm:ss" 11px, "Ocultar ⌄" / "Ver mais ⌄" 11px |
| Personalizar campos (005) | `JanelaDaCasca` de 950px (`w-[min(950px,calc(100vw-2rem))]`), `p-0`; cabeçalho: "PERSONALIZAR CAMPOS" 11px/600 `casca-marca` uppercase + "Negócio" 18px/500; busca 40px "Buscar por nome do campo…"; duas colunas (esquerda flexível, direita 360px) de 480px de altura com rolagem: "CAMPOS DISPONÍVEIS" e "INFORMAÇÕES BÁSICAS" 11px/600 uppercase `casca-sobrelinha`; `CaixaDaCasca` + rótulo 13px por linha de 40px; à direita "EXIBIDOS · ARRASTE" + "5 campos"; cada escolhido numa caixa 44px com `GripVertical` 14px, rótulo 13px e X; rodapé 64px: "Restaurar padrão" 13px `casca-marca` à esquerda, "Cancelar" e "Salvar campos" (`BotaoDaJanela`) à direita |

### Textos da Clint usados nesta fase

Do bundle `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\pt-BR-DmQ11GIn.js.txt`:

- **Fila:** "Pesquisar"; "Todos"; "Não lidas"; "Status"; "Meus em aberto" (`label.tOpenAssignedToMe`); "Em aberto"; "Em espera"; "Fechadas"; "Salvos"; "Criar filtro"; "Ordenar por"; "Última interação"; "Esperando mais tempo" (`label.tLongestWaiting`); "Selecionar"; "Ativar modo espião"; "Desativar modo espião"; "Personalizar visualização"; "Modo espião ativo"; "abrir uma conversa não vai marcá-la como lida."; "Desativar"; "Sem atendente" (`component.ChatItem.unassigned`); "Aguardando resposta há {elapsed}"; "Sem resposta há menos de 1 minuto"; "agora", "{count} min", "{count}h", "{count}d"; "Ontem"; "Carregando mensagens..."; "Nenhuma conversa nos filtros"; "Ajuste os filtros para ver conversas."; "Iniciar uma conversa"; "Esta é a conversa atual e ela não corresponde a visualização dos filtros."; "Remover" (`component.PinnedChat.removePin`).
- **Personalizar visualização:** "Atendente", "Empresa", "Setor", "Tempo sem resposta", "Mensagens agendadas", "Tags", "Permissão de chamada"; "{active} de {max} campos ativos"; "Restaurar padrão"; "Amarelo a partir de"; "Vermelho a partir de"; "Minutos", "Horas", "Dias".
- **Centro:** "Envie e receba mensagens dos seus clientes"; "Use o chat conectado ao CRM e explore novas experiências de atendimento."; "Conecte um canal para começar a conversar"; "Você precisa adicionar um dispositivo ou uma conta para iniciar uma nova conversa."; "Crie ou selecione um contato"; "Pesquise pelo nome, e-mail, telefone ou Instagram do contato"; "Selecione um dispositivo ou conta"; "Selecionar dispositivo ou conta"; "Criar "{termo}""; "Nenhum contato encontrado.".
- **Painel direito:** "Próximo negócio"; "Navegue pela ordem dos seus negócios. Esta seleção não afeta os filtros gerais de atendimento." (`tooltip.nextDealCrmAreaHelp`); "Nenhuma conversa selecionada"; "Selecione uma conversa para carregar as informações do contato"; "Não foi possível carregar as informações do contato." (`module.crmArea.loadError`); "Adicionar tags"; "Abrir contato"; "Negócios"; "Adicionar negócio"; "Selecionar negócio"; "Valor"; "Dono"; "Ganho", "Perdido", "Aberto"; "Não informar"; "Ir para negócio"; "Seções"; "Seções visíveis"; "Mostrar todas"; "Atividades", "Contato", "Negócio", "Empresa", "Notas", "Anexos", "Histórico", "Conversas"; "{n} atrasada(s)"; "Nenhuma atividade para este negócio"; "Criar atividade"; "Criar, editar ou reagendar no negócio"; "Nome", "Email", "Telefone", "Instagram", "Tags"; "Clique aqui para adicionar"; "Nome da empresa"; "Adicionar nota"; "Nenhuma nota ainda."; "Novo arquivo"; "Nenhum arquivo encontrado"; "Envie arquivos para mantê-los junto deste contato."; "Personalizar campos"; "Buscar por nome do campo…"; "Campos disponíveis"; "Informações básicas"; "Exibidos · arraste"; "{count} campos"; "Salvar campos"; "Nenhum campo encontrado."; "Origem", "Etapa", "Dono", "Valor do negócio", "Status"; "Em aberto" (selo da sessão).
- **Textos nossos** (a Clint não tem): "Em breve" (funil, Criar filtro, Selecionar, Setor, Empresa); "Conectar um canal" (o botão do estado sem canal, provisório); "Sem mensagens"; "Carregando…"; "Não consegui carregar os negócios."; "Este contato não tem conversa neste dispositivo ainda."

### Comportamento da Clint conferido no código

- **Presets** (`index-CPsdLJFo`): o botão "Todos" lista Todos, Não lidas (com a contagem), os quatro de status e os salvos; escolher um preset preenche o filtro (a 3D mostra isso no painel); mexer em qualquer critério fora do preset vira "Personalizado" (3D). "Em espera" é o status `WAITING` da Clint; aqui é o snooze vigente (decisão 2 da seção 9 do PRD).
- **Ordem** (`HC`): `last_interaction` (padrão) e `longest_waiting`.
- **Personalizar visualização** (`component.PersonalizeChatCard.*`): no máximo 5 campos ligados (`activeFieldsCount` "{active} de {max}"); padrão Atendente + Permissão de chamada; os limites do tempo sem resposta em número + unidade (minutos, horas, dias), amarelo 1h e vermelho 4h por padrão.
- **Conversa fixada** (`component.PinnedChat.*`): a conversa aberta que não casa com o filtro fica no topo, com "Remover" (o X) e a explicação na dica do alfinete.
- **Painel** (`crmArea.*`): as seções abrem no lugar da lista ("‹ {Seção}"); "Seções visíveis" só liga e desliga (sem reordenar); "Personalizar campos" tem busca, "Campos disponíveis" com o grupo "Informações básicas", "Exibidos · arraste", "Restaurar padrão" e "Salvar campos"; sem negócio o painel mostra só "Adicionar negócio" e as seções sem Atividades e Negócio.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Frente C, worktree `wt-frente-c`**, branch `feat/fase-3a-fila-e-painel` a partir de `escale-crm/main`; **um PR**, mergeado ao terminar; migration **9201**. Testes pesados (`test:db`, rodada cheia) e a publicação ficam para o fim da Frente C | Q2; regra "executa tudo, testa tudo, publica tudo" (18/10) |
| N2 | **Pré-requisitos na `escale-crm/main`:** 1G, 1H (PR A e B), 1I (PR A e B), 2A e 2B. A Task 1 prova (`useAtividadesDoNegocio`, `useArquivosDoContato`, `CartaoDoHistorico`, `JanelaNovoContato`, 9008 e 9103). Sem eles, PARE | o painel reaproveita a ficha; "Nova conversa" reaproveita a janela de contato da 2A |
| N3 | **A página** `app/app/inbox/page.tsx` ganha o encaixe do cookie (como `/app/contacts`): com a casca, `<ConversasDaCasca initialSelectedId rascunho>`; sem ela, o `InboxLayout`. O `?rascunho=` (issue #1611 do original) continua lido na página e passado ao `Composer` do original dentro da casca | princípio dos encaixes pequenos; nada muda sem a casca |
| N4 | **Presets sobre o mapa de status** da seção 6 do PRD: Todos = `{}`; Não lidas = `unread`; Meus em aberto = `assigned_to=me` + abertos + `snoozed=false`; Em aberto = abertos + `snoozed=false`; Em espera = abertos + `snoozed=true`; Fechadas = `closed,resolved`. Abertos = `open,pending,claimed,ai_handling`. "Arquivada" entra como valor do filtro de status na 3D (o preset "Todos" já a inclui, como a aba "Todas" do original) | seção 6 do PRD |
| N5 | **Dois filtros novos no schema do original** (`lib/schemas/messaging.ts`): `snoozed` ("true"/"false") e `ordem` ("espera"). A rota os lê (a cerca `rota-le-todo-filtro-do-schema` exige a forma exata `chave: url.searchParams.get("chave") ?? undefined`) e o handler os aplica: `snoozed=true` → `snooze_until > now()`; `snoozed=false` → `snooze_until is null or <= now()`; `ordem=espera` → a mesma régua da Fila (`ORDEM_DA_ESPERA`: `awaiting_since asc nulls last`), que é o "last_response_at asc" do PRD. A contagem (`counts`) não muda: o selo "99+" de Não lidas usa `GET /counts?unread=true` (`all`) | A4, A5; cerca `rota-le-todo-filtro-do-schema` |
| N6 | **Hook próprio da fila** (`hooks/escale/useFilaDeConversas.ts`) com a chave `["conversations", { casca: true, ...filtros }]`: o `agendarRecargaDasConversas` do original invalida `["conversations"]` e alcança a casca; o canal realtime é o mesmo `inbox-${orgId}`; a recarga de segurança (`useRefetchDeSeguranca`) entra igual. O hook do original (`useConversationsRealtime`) **não muda** | A5; nada do original muda de comportamento |
| N7 | **Modo espião = `sessionStorage`** (`escale_modo_espiao`), por aba do navegador, sem banco (PRD seção 7). Ligado: `useMarkAsRead` recebe `null` e a conversa aberta não zera o contador; a faixa verde fica no topo do centro. A 3E reaproveita a mesma chave na ficha | A9; PRD seção 7 |
| N8 | **Preferências por pessoa** na tabela `crm_preferencias_de_conversas` (9201): `organization_id`, `user_id`, `chave` (`visualizacao`, `campos_do_negocio`, `secoes`), `valor jsonb`; única por pessoa e chave; RLS igual à 9101 (só a pessoa lê e escreve a sua; `viewer` ou acima). Rota `GET /api/v1/preferencias-de-conversas` (as três chaves, com o padrão onde não há linha) e `PUT` (uma chave por vez, validada pelo schema da chave). Guardado fora da forma vale o padrão (como a 9005) | A8, D5, D7; PRD seção 7; molde 9101/9005 |
| N9 | **Os negócios do contato** vêm de `GET /api/v1/negocios-do-contato?contact_id=` (fork, sessão, RLS de `crm_leads`, origens não arquivadas, abertos primeiro, até 20) e o **negócio escolhido usa `useBoard(pipeline_id)`** (o cache do quadro, como a ficha). Risco: o quadro inteiro por conversa; mitigação: o react-query guarda por origem (conversas da mesma origem não repetem a leitura) e a 1D mediu 13 negócios no maior funil. Se o quadro falhar, o cartão mostra "Não consegui carregar os negócios." e as seções sem negócio continuam | D1, D3, D6, D7; decisão 4 da seção 9 |
| N10 | **"Próximo negócio" ‹ ›** anda nos negócios da etapa escolhida, na ordem do quadro (`vizinhosNaEtapa` da 1G), e abre a **conversa** do vizinho (`lead.conversa.id`); vizinho sem conversa é pulado; a etapa escolhida vale pela sessão (estado), não vai à URL | D1; `tooltip.nextDealCrmAreaHelp` |
| N11 | **Cada seção é um componente estreito** (`components/escale/conversas/painel/secoes/`), reaproveitando os hooks e as libs da ficha: Atividades (`useAtividadesDoNegocio`, `gruposDaLista`, `cabecalhoDoDia`, `horaDaTarefa`, `haQuantoTempo`), Contato (`useContact`, `useGravarContato`, `EditorDeCampo`, `patchDoContato`, `TagsDaFicha`), Negócio (`useEditLead`, `useMoveCard`, `DonoDaFicha`, `EditorDeCampo`, `camposDoCrm`), Empresa (moldura só leitura; o vínculo chega com a 2D), Notas (`useNotasDoNegocio`, `JanelaDeNota`), Anexos (`useArquivosDoContato`, `useEnviarArquivos`, `JanelaDeNovoDocumento`), Histórico (`useHistoricoDoNegocio`, `CartaoDoHistorico`, `secoesDoHistorico`), Conversas (`useConversasDoContato`, clique seleciona na própria tela). As abas inteiras (`AbaAtividades` etc.) **não** entram no painel: têm trilho, colunas e busca que não cabem em 384px | D5–D10; risco 3 do PRD |
| N12 | **Cartão do negócio:** Ganho / Perdido / Aberto com as mesmas mutations da `StatusDaFicha` (`useWinLead`, `useLoseLead`, `useMoveCard` + `etapaParaReabrir`), o motivo pelo `SeletorDaCasca` (com "Não informar" quando a origem tem motivos — a lista vem de `useMotivosDePerdaDoFunil`), a etapa por `useMoveCard` (seletor no "1. Entrada Lead ▾"), o dono pelo `DonoDaFicha` (o círculo) + o nome ao lado, o valor pelo `useEditLead`. Permissão `pipeline.move_card`, como na ficha | D3; a ficha já resolveu as regras |
| N13 | **"Personalizar campos"** (02-005) grava `campos_do_negocio` como a lista ordenada de chaves: os 5 básicos (`origem`, `etapa`, `dono`, `valor`, `status`) e `crm:{chave}` para os campos do CRM da origem do negócio escolhido (`camposDoCrm`, 1F-a). Padrão: os 5 básicos. Arrastar reordena (ponteiro, sem biblioteca: `GripVertical` + setas ↑↓ por teclado) | D7; 02-005 |
| N14 | **Seções visíveis:** `secoes` = um booleano por seção; "Mostrar todas" liga as 8. Contato sem negócio: Atividades e Negócio não aparecem, mesmo ligadas (c48). Visibilidade não reordena | D5; 02-009, c49 |
| N15 | **A linha da fila** mostra só o que a lista traz: ✓✓ quando a última mensagem foi nossa (`last_outbound_at >= last_inbound_at`); os ícones de voz e documento e os eventos "⇄ O atendente foi alterado" **não** entram (a lista não traz o tipo da última mensagem nem o evento) — diferença declarada, a 3B decide se enriquece a prévia. "Tempo sem resposta" = desde `last_inbound_at` quando o cliente espera (última mensagem é dele e a conversa está aberta); cor pelos limites da pessoa | A7; o que `SELECT_COLS` do handler devolve |
| N16 | **Toggles que dependem de outras fases:** "Setor" (3C) e "Empresa" (2D) ficam desligados com "Em breve"; "Mensagens agendadas" (⏱ n) e "Permissão de chamada" podem ser ligados, mas só mostram algo quando a 3B trouxer os dados (declarado no plano da 3B) | A8; dependências do PRD |
| N17 | **"Nova conversa"** busca contatos na rota do original (`GET /api/v1/contacts?search=`, por `useContactList`), lista com foto, telefone e e-mail e, no topo, "Criar "{termo}"" que abre a `JanelaNovoContato` da 2A com o nome preenchido (`nomeInicial`, prop nova no arquivo do fork); escolhido o contato, os dispositivos vêm de `useChannelSessions` + `candidatosParaConversaNova` (grupos: WHATSAPP = `waha`, `zernio`, `datafy`; WHATSAPP OFICIAL = `meta_cloud`; INSTAGRAM = `zernio_social`); escolher um chama `POST /api/v1/conversations/open-with-contact` (`contact_id`, `channel_session_id`) e seleciona a conversa devolvida | A12; rotas do original |
| N18 | **Estados do centro:** sem conversa = vazio (c01); sem canal (`useChannelSessions` vazio depois de carregar) = "Conecte um canal para começar a conversar" com o botão "Conectar um canal" → `/app/connections` (provisório, sem print); "Nova conversa" = a tela da Q17; "Personalizar visualização" = o painel sobre o centro; conversa escolhida = o cabeçalho, a thread e o compositor do original (até a 3B) | A11, A12 |
| N19 | **Conversa fixada:** a conversa aberta que não está na lista carregada (vem da busca única `useConversation`) aparece no topo com o fundo verde-claro, o X (solta a seleção) e o alfinete com a dica. Enquanto a lista carrega, nada é fixado | A15 |
| N20 | **Larguras fixas** (fila 320px, painel 384px), sem o arrasto do original; abaixo de `xl` o painel direito vira gaveta (o `Sheet` do original) aberta pelo botão "Ficha" no topo do centro; abaixo de `md`, uma coluna por vez (a regra `colunasDoCelular` do original, reaproveitada) | A1; a Clint não arrasta |
| N21 | **Fora desta fase, de propósito:** o funil (3D), "+ Criar filtro" (3D), "Selecionar" (3D), o ⚙ do hub (3C), o setor na linha (3C), "⏱ n" e a permissão de chamada (3B), "Pausar automação" (3B), o cabeçalho/thread/compositor da Clint (3B), e-mail nas ações rápidas e "Agendar" ("Em breve"), os três modos da seção Conversas (3E). Tudo isso aparece desligado com `title="Em breve"` (cerca `controle-decorativo`) | PRD seção 8 |
| N22 | **Tokens novos** em `app/escale-tema.css` (medidos em c23 e c54): `--color-casca-espiao` `#A7F3D0`, `--color-casca-espiao-texto` `#047857`, `--color-casca-fixada` `#D1FAE5`, `--color-casca-atraso` `#FEE2E2`, `--color-casca-atencao` `#FAA200`; declarados também no `@theme` de `app/globals.css` como os outros `casca-*` (cerca `tailwind-tokens`) | regra do produto: nada de hex em `className` |
| G1 | **Verificação enxuta** (regra de 18/10): por task só o que a task cria, typecheck e eslint dos arquivos alterados; `test:db` e a rodada cheia uma vez, no fim da Frente C; **um revisor por frente** (Opus 5.5, high), na hora de testar | política em vigor |

## Global Constraints

### Repositório, worktree e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo` (branch `feat/fase-1i-aba-atividades`, da Frente A: **não mexer**).
- **Worktree da Frente C:** `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-c`, criada na Task 1 a partir de `escale-crm/main`. Todo comando desta fase (e das 3B–3E) roda dentro dela.
- **Branch:** `feat/fase-3a-fila-e-painel`. **Migration:** `supabase/migrations/20261102120000_9201_preferencias_de_conversas.sql`. Antes de criá-la: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; se `9201` já existir em outra branch, PARE e pergunte.
- **PR:** para `rgisjr/escale-crm`, base `main`, mergeado direto ao terminar (regra de 18/10). Tag, release e VPS só no fim da Frente C.
- **Proibido:** push em `origin` (Rafael), tag, release, VPS e gravar no banco de produção.
- **Convivência com as Frentes A e B:** antes do PR, `git fetch escale-crm && git rebase escale-crm/main`; nos conflitos de `lib/i18n/dicionario.ts`, `supabase/baseline.sql`, `lib/audit/actions.ts`, `tests/invariants/rls-completude-varredura.test.ts` e `lib/ui/icons-da-casca.ts`, **mantenha os dois blocos**, o que já está na `main` primeiro.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- A worktree nova precisa de `corepack pnpm install --frozen-lockfile` uma vez e dos `.env*` copiados de `repo/` (não são versionados).
- `test:db` **não roda nesta fase** (fim da Frente C). O arquivo de prova é escrito na Task 2 e fica pronto.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 3A`. Sem a casca, nenhum deles muda o comportamento.

| Arquivo | Mudança |
|---|---|
| `app/app/inbox/page.tsx` | lê o cookie `escale_menu`; com `topo`, `<ConversasDaCasca initialSelectedId={id ?? null} rascunho={avisoDeRascunho} />` no lugar do `InboxLayout` |
| `lib/schemas/messaging.ts` | em `listConversationsQuerySchema`, duas chaves: `snoozed: z.enum(["true", "false"]).optional()` e `ordem: z.enum(["espera"]).optional()`, logo depois de `contact_id` |
| `app/api/v1/conversations/route.ts` | duas linhas no `safeParse`: `snoozed: url.searchParams.get("snoozed") ?? undefined,` e `ordem: url.searchParams.get("ordem") ?? undefined,`, logo depois de `contact_id` |
| `app/api/v1/conversations/_handler.ts` | `const porEspera = isQueue \|\| q.ordem === "espera";` (e `porEspera` no lugar de `isQueue` nas três linhas de `sortCol`, `ordem` e `asc`); o filtro de `snoozed` logo depois de `if (q.unread)` |
| `supabase/baseline.sql` | o bloco da 9201, idêntico à migration, logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (depois dos blocos 90xx/91xx que já estão lá) |
| `lib/i18n/dicionario.ts` | um bloco `// ─── FORK ESCALE · Fase 3A: fila e painel de Conversas ───` logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: …` |
| `lib/audit/actions.ts` | `"conversation_prefs.updated",` logo depois de `"list_columns.updated",` |
| `tests/invariants/rls-completude-varredura.test.ts` | a entrada de `crm_preferencias_de_conversas` em `PROVA_PROPRIA`, logo depois da de `crm_acoes_em_massa_itens` |
| `lib/ui/icons-da-casca.ts` | uma linha nova: `export { ContactRound, ExternalLink, Pencil, UserRoundPlus, CircleX, SquarePen } from "lucide-react";` (só os que ainda não estão exportados; confira antes) |
| `app/escale-tema.css`, `app/globals.css` | os 5 tokens da N22 |

Do fork que mudam: `components/escale/contatos/JanelaNovoContato.tsx` (prop `nomeInicial`), `components/escale/negocio/DonoDaFicha.tsx` (**não muda**; é reaproveitado como está).

### Cercas que precisam ficar verdes

- `rota-le-todo-filtro-do-schema`: as duas chaves novas lidas na rota na forma exata.
- `badge-espelha-o-filtro`: a contagem não ganha filtro novo (não muda).
- `controle-decorativo`: todo botão desligado tem `title`.
- `tailwind-tokens`: cores só por token da casca ou `var(--escale-*)`; nenhum hex em `className`; nada de `rounded` puro, `shadow` puro, `outline-none`.
- `vocabulario-do-funil`: nenhum "pipeline"/"kanban" em texto de JSX.
- `evidencia-citada`: este plano, copiado para o repositório, não cita imagem entre crases nem em link.
- `escale-casca-v2-original-intacto`: as peças do original não importam `@/components/escale/` (a página `inbox/page.tsx` importa a casca como `contacts/page.tsx` já faz; confira a lista de exceções da cerca e, se a página estiver fora dela, acrescente-a como a 2A fez).
- `i18n-espanhol-cobre-a-tela`: todo texto novo passa por `t()` e tem espanhol (Task 11).
- `rls-completude-varredura`, `rbac-config-ia-canais`, `travas-de-suporte-cobrem-toda-tabela-na-instalacao`, `definer-membership-varredura`, `definer-nova-nasce-exposta`, `hardening-definer-varredura`: a tabela nova com RLS e policies; nenhuma função `security definer` nova.
- `manifest-x-migrations`: a migration tem a linha `-- manifest:`; o `MANIFEST.md` não muda.
- `tabelas-do-motor-nao-se-leem-pelo-login`: a tabela nova é lida pela sessão (RLS).

### Verificação (G1)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit tests/invariants lib app components --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os de `tests/unit` com `corepack pnpm vitest run <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db`:** não nesta fase (fim da Frente C). A Task 2 deixa o arquivo pronto.
3. **Revisor:** nenhum nesta fase; um por frente, na hora de testar (Opus 5.5, high).
4. **Rodada cheia:** no fim da Frente C.
5. **Conferência visual:** no fim da Frente C, em app.escaleia.com com a casca ligada, cada parte contra o print citado, com a lista escrita das diferenças.
6. **Comandos longos sempre em segundo plano.**

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (ou o modelo da sessão); o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` e o PRD para `docs/escale/modulos/3-conversas.md` do repositório na Task 1.
- Todo texto de tela por `t()` com literal. Datas e números no formato brasileiro.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/escale/conversas/presets.ts` | novo | presets, status abertos/fechados, `FiltrosDaFila`, `filtrosDoPreset`, URL |
| `lib/escale/conversas/ordem.ts` | novo | as duas ordens e a URL |
| `lib/escale/conversas/linha.ts` | novo | a linha: hora, ✓✓, tempo sem resposta, prévia |
| `lib/escale/conversas/visualizacao.ts` | novo | "Personalizar visualização": campos, limite de 5, limites de alerta, cor da espera |
| `lib/escale/conversas/secoes.ts` | novo | as 8 seções, visibilidade, quais aparecem sem negócio |
| `lib/escale/conversas/campos-do-cartao.ts` | novo | "Personalizar campos": chaves, padrão, disponíveis |
| `lib/escale/conversas/preferencias.ts` | novo | as três chaves, schemas, padrão, ler e gravar no banco |
| `lib/escale/conversas/modo-espiao.ts` | novo | a marca da sessão |
| `lib/escale/conversas/nova-conversa.ts` | novo | grupos de dispositivos e a bolinha |
| `supabase/migrations/20261102120000_9201_preferencias_de_conversas.sql`, `supabase/baseline.sql` | novo / bloco | `crm_preferencias_de_conversas` |
| `tests/invariants/escale-preferencias-de-conversas.test.ts` | novo | a prova de RLS (roda no fim da frente) |
| `app/api/v1/preferencias-de-conversas/route.ts` | novo | GET e PUT |
| `app/api/v1/negocios-do-contato/route.ts` | novo | os negócios do contato (leitura) |
| `lib/schemas/messaging.ts`, `app/api/v1/conversations/route.ts`, `app/api/v1/conversations/_handler.ts` | alterados | `snoozed` e `ordem` |
| `hooks/escale/useFilaDeConversas.ts` | novo | a fila (lista infinita + realtime + recarga de segurança) |
| `hooks/escale/usePreferenciasDeConversas.ts` | novo | ler e gravar as preferências |
| `hooks/escale/useModoEspiao.ts` | novo | o estado da sessão |
| `hooks/escale/useNegociosDoContato.ts` | novo | os negócios do contato |
| `app/app/inbox/page.tsx` | alterado | o encaixe do cookie |
| `components/escale/conversas/ConversasDaCasca.tsx` | novo | a tela: estado, URL, as três colunas, a gaveta |
| `components/escale/conversas/TopoDasConversas.tsx` | novo | "Conversas", ⚙, "Nova conversa +" |
| `components/escale/conversas/centro/CentroVazio.tsx` | novo | vazio / sem canal (o molde dos vazios: `VazioDaCasca`) |
| `components/escale/conversas/centro/FaixaDoModoEspiao.tsx` | novo | a faixa verde |
| `components/escale/conversas/centro/ConversaAberta.tsx` | novo | o cabeçalho, a thread e o compositor do original dentro da casca |
| `components/escale/conversas/centro/NovaConversa.tsx` | novo | "Crie ou selecione um contato" e o dispositivo |
| `components/escale/conversas/fila/BarraDaFila.tsx` | novo | busca, presets, funil, ordem, ⋮ |
| `components/escale/conversas/fila/MenuDePresets.tsx`, `MenuDeOrdem.tsx`, `MenuMaisDaFila.tsx` | novos | os três menus |
| `components/escale/conversas/fila/ListaDaFila.tsx` | novo | as linhas, a fixada, carregando, vazios, "Carregar mais" |
| `components/escale/conversas/fila/LinhaDaFila.tsx` | novo | a linha da Clint |
| `components/escale/conversas/fila/PainelPersonalizarVisualizacao.tsx` | novo | o painel com a prévia, os toggles e os limites |
| `components/escale/conversas/painel/PainelDoContato.tsx` | novo | o painel direito: vazio, erro, carregando, pronto |
| `components/escale/conversas/painel/ProximoNegocioDaConversa.tsx` | novo | "PRÓXIMO NEGÓCIO" com a etapa e ‹ › |
| `components/escale/conversas/painel/CabecalhoDoContato.tsx` | novo | foto, nome, tags, ações rápidas |
| `components/escale/conversas/painel/CartaoDoNegocio.tsx` | novo | NEGÓCIOS: o cartão, "Selecionar negócio", "Adicionar negócio" |
| `components/escale/conversas/painel/SecoesDoPainel.tsx` | novo | a lista das seções e o balão "Seções visíveis" |
| `components/escale/conversas/painel/SecaoAberta.tsx` | novo | a moldura "‹ {Seção}" |
| `components/escale/conversas/painel/secoes/SecaoAtividades.tsx`, `SecaoContato.tsx`, `SecaoNegocio.tsx`, `SecaoEmpresa.tsx`, `SecaoNotas.tsx`, `SecaoAnexos.tsx`, `SecaoHistorico.tsx`, `SecaoConversas.tsx` | novos | as 8 seções |
| `components/escale/conversas/painel/JanelaPersonalizarCampos.tsx` | novo | a janela 02-005 |
| `components/escale/contatos/JanelaNovoContato.tsx` | alterado | `nomeInicial` |
| `lib/ui/icons-da-casca.ts`, `app/escale-tema.css`, `app/globals.css` | alterados | ícones e tokens |
| `lib/audit/actions.ts`, `lib/i18n/dicionario.ts`, `tests/invariants/rls-completude-varredura.test.ts` | alterados | ação, espanhol, varredura |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md`, `LOG.md` | alterados (fora do repositório) | a linha da 3A na seção 8; o log |

---

### Task 1: Worktree, base e as regras puras da fila

**Files:**
- Create: `lib/escale/conversas/presets.ts`, `lib/escale/conversas/ordem.ts`, `lib/escale/conversas/linha.ts`, `lib/escale/conversas/visualizacao.ts`, `lib/escale/conversas/secoes.ts`, `lib/escale/conversas/campos-do-cartao.ts`, `lib/escale/conversas/modo-espiao.ts`, `lib/escale/conversas/nova-conversa.ts`, `tests/unit/escale-conversas-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/`; o PRD para `docs/escale/modulos/3-conversas.md`

**Interfaces (Produces):**
- `presets.ts`: `PRESETS`, `Preset`, `PRESET_PADRAO`, `PARAM_PRESET` ("v"), `ROTULO_DO_PRESET`, `PRESETS_DE_STATUS`, `STATUS_ABERTOS`, `STATUS_FECHADOS`, `FiltrosDaFila`, `filtrosDoPreset(p)`, `presetDaUrl(v)`, `emEspera(c, agora)`, `estaAberta(status)`.
- `ordem.ts`: `ORDENS`, `Ordem`, `ORDEM_PADRAO`, `PARAM_ORDEM` ("o"), `ROTULO_DA_ORDEM`, `ordemDaUrl(v)`.
- `linha.ts`: `horaDaLinha(iso, agora, t)`, `ultimaFoiNossa(c)`, `aguardandoHa(c, agora)`, `previaDaLinha(c, t)`, `inicialDoAtendente(nome)`.
- `visualizacao.ts`: `CAMPOS_DA_LINHA`, `CampoDaLinha`, `ROTULO_DO_CAMPO_DA_LINHA`, `CAMPOS_ATIVOS_MAX` (5), `UNIDADES_DE_TEMPO`, `UnidadeDeTempo`, `ROTULO_DA_UNIDADE`, `Limite`, `Visualizacao`, `VISUALIZACAO_PADRAO`, `visualizacaoSchema`, `lerVisualizacao(bruto)`, `camposAtivos(v)`, `podeLigar(v, campo)`, `ehVisualizacaoPadrao(v)`, `limiteEmMs(l)`, `CorDaEspera`, `corDaEspera(ms, v)`, `textoDaEspera(ms, t)`.
- `secoes.ts`: `SECOES`, `Secao`, `ROTULO_DA_SECAO`, `SecoesVisiveis`, `SECOES_PADRAO`, `secoesSchema`, `lerSecoes(bruto)`, `secoesParaMostrar(visiveis, temNegocio)`, `ehSecoesPadrao(v)`.
- `campos-do-cartao.ts`: `CAMPOS_BASICOS`, `CampoBasico`, `ROTULO_DO_CAMPO_BASICO`, `PREFIXO_CRM` ("crm:"), `CAMPOS_DO_CARTAO_PADRAO`, `CAMPOS_DO_CARTAO_MAX` (30), `camposDoCartaoSchema`, `lerCamposDoCartao(bruto)`, `CampoDisponivel`, `camposDisponiveis(defs, t)`, `ehCamposPadrao(lista)`.
- `preferencias.ts` fica para a Task 2 (precisa do banco).
- `modo-espiao.ts`: `CHAVE_DO_MODO_ESPIAO`, `lerModoEspiao(storage)`, `gravarModoEspiao(storage, ligado)`.
- `nova-conversa.ts`: `GrupoDeDispositivo`, `grupoDoDispositivo(provider)`, `ROTULO_DO_GRUPO`, `agruparDispositivos(canais)`, `bolinhaDoDispositivo(status)`.

- [ ] **Step 1: A worktree e a base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git fetch escale-crm --quiet
git worktree add "../wt-frente-c" -b feat/fase-3a-fila-e-painel escale-crm/main
cd "../wt-frente-c"
git status --porcelain            # Expected: vazio
for f in hooks/escale/useAtividadesDoNegocio.ts hooks/escale/useArquivosDoContato.ts components/escale/negocio/abas/CartaoDoHistorico.tsx components/escale/contatos/JanelaNovoContato.tsx components/escale/negocio/DonoDaFicha.tsx hooks/escale/useConversasDoContato.ts; do git cat-file -e HEAD:$f && echo "ok $f"; done
git ls-tree --name-only HEAD supabase/migrations/ | grep -E "_9[0-9]{3}_" | sort | tail -4
bash scripts/checar-colisao-de-migration.sh escale-crm/main
corepack pnpm install --frozen-lockfile
cp ../repo/.env* . 2>/dev/null; mkdir -p .superpowers/sdd && cp ../repo/.superpowers/sdd/falhas-conhecidas.txt .superpowers/sdd/
```

Expected: seis `ok`; a maior da faixa 92xx não existe ainda (a lista termina em 9103 ou nas 90xx da Frente A). Se aparecer `9201` em qualquer branch, PARE e pergunte.

- [ ] **Step 2: Copiar o plano e o PRD**

```bash
mkdir -p docs/escale/modulos docs/superpowers/plans
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-18-fase-3a-fila-e-painel.md" docs/superpowers/plans/
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/modulos/3-conversas.md" docs/escale/modulos/
```

- [ ] **Step 3: O teste das regras (vai falhar)**

Create `tests/unit/escale-conversas-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  CAMPOS_DO_CARTAO_PADRAO,
  camposDisponiveis,
  ehCamposPadrao,
  lerCamposDoCartao,
} from "@/lib/escale/conversas/campos-do-cartao";
import {
  aguardandoHa,
  horaDaLinha,
  inicialDoAtendente,
  previaDaLinha,
  ultimaFoiNossa,
} from "@/lib/escale/conversas/linha";
import { gravarModoEspiao, lerModoEspiao } from "@/lib/escale/conversas/modo-espiao";
import { agruparDispositivos, bolinhaDoDispositivo } from "@/lib/escale/conversas/nova-conversa";
import { ORDEM_PADRAO, ordemDaUrl } from "@/lib/escale/conversas/ordem";
import {
  STATUS_ABERTOS,
  emEspera,
  estaAberta,
  filtrosDoPreset,
  presetDaUrl,
} from "@/lib/escale/conversas/presets";
import { lerSecoes, secoesParaMostrar } from "@/lib/escale/conversas/secoes";
import {
  VISUALIZACAO_PADRAO,
  camposAtivos,
  corDaEspera,
  ehVisualizacaoPadrao,
  lerVisualizacao,
  limiteEmMs,
  podeLigar,
  textoDaEspera,
} from "@/lib/escale/conversas/visualizacao";

const t = (s: string) => s;
const AGORA = new Date("2026-10-18T15:00:00-03:00");
const H = 60 * 60 * 1000;

describe("presets (A4, seção 6 do PRD)", () => {
  it("cada preset vira o filtro do mapa de status", () => {
    expect(filtrosDoPreset("todos")).toEqual({});
    expect(filtrosDoPreset("nao_lidas")).toEqual({ unread: true });
    expect(filtrosDoPreset("meus_em_aberto")).toEqual({
      assigned_to: "me",
      status: STATUS_ABERTOS,
      snoozed: false,
    });
    expect(filtrosDoPreset("em_aberto")).toEqual({ status: STATUS_ABERTOS, snoozed: false });
    expect(filtrosDoPreset("em_espera")).toEqual({ status: STATUS_ABERTOS, snoozed: true });
    expect(filtrosDoPreset("fechadas")).toEqual({ status: ["closed", "resolved"] });
  });

  it("a URL só aceita preset que existe; o resto vira Todos", () => {
    expect(presetDaUrl("em_espera")).toBe("em_espera");
    expect(presetDaUrl("inventado")).toBe("todos");
    expect(presetDaUrl(null)).toBe("todos");
    expect(ordemDaUrl("espera")).toBe("espera");
    expect(ordemDaUrl("x")).toBe(ORDEM_PADRAO);
  });

  it("em espera = snooze vigente; aberta pelo mapa", () => {
    expect(emEspera({ snooze_until: "2026-10-18T19:00:00Z" }, AGORA)).toBe(true);
    expect(emEspera({ snooze_until: "2026-10-18T17:00:00Z" }, AGORA)).toBe(false);
    expect(emEspera({ snooze_until: null }, AGORA)).toBe(false);
    expect(estaAberta("claimed")).toBe(true);
    expect(estaAberta("closed")).toBe(false);
  });
});

describe("a linha da fila (A7)", () => {
  it("hora hoje, 'Ontem' e a data dd/mm/aaaa", () => {
    expect(horaDaLinha("2026-10-18T14:52:00-03:00", AGORA, t)).toBe("14:52");
    expect(horaDaLinha("2026-10-17T23:10:00-03:00", AGORA, t)).toBe("Ontem");
    expect(horaDaLinha("2026-10-01T10:00:00-03:00", AGORA, t)).toBe("01/10/2026");
    expect(horaDaLinha(null, AGORA, t)).toBe("");
  });

  it("✓✓ quando a última foi nossa; tempo sem resposta só quando o cliente espera", () => {
    expect(
      ultimaFoiNossa({ last_inbound_at: "2026-10-18T10:00:00Z", last_outbound_at: "2026-10-18T11:00:00Z" }),
    ).toBe(true);
    expect(
      ultimaFoiNossa({ last_inbound_at: "2026-10-18T12:00:00Z", last_outbound_at: "2026-10-18T11:00:00Z" }),
    ).toBe(false);
    const espera = aguardandoHa(
      { status: "open", last_inbound_at: "2026-10-18T16:00:00Z", last_outbound_at: "2026-10-18T15:00:00Z" },
      AGORA,
    );
    expect(espera).toBe(2 * H);
    expect(
      aguardandoHa(
        { status: "open", last_inbound_at: "2026-10-18T15:00:00Z", last_outbound_at: "2026-10-18T16:00:00Z" },
        AGORA,
      ),
    ).toBeNull();
    expect(
      aguardandoHa(
        { status: "closed", last_inbound_at: "2026-10-18T16:00:00Z", last_outbound_at: null },
        AGORA,
      ),
    ).toBeNull();
  });

  it("prévia e inicial", () => {
    expect(previaDaLinha({ last_message_preview: "  Boa tarde  " }, t)).toBe("Boa tarde");
    expect(previaDaLinha({ last_message_preview: null }, t)).toBe("Sem mensagens");
    expect(inicialDoAtendente("camilly victória")).toBe("C");
    expect(inicialDoAtendente(null)).toBe("");
  });
});

describe("Personalizar visualização (A8)", () => {
  it("padrão: Atendente e Permissão de chamada, 1h amarelo, 4h vermelho", () => {
    expect(camposAtivos(VISUALIZACAO_PADRAO)).toBe(2);
    expect(VISUALIZACAO_PADRAO.campos.atendente).toBe(true);
    expect(VISUALIZACAO_PADRAO.campos.permissaoDeChamada).toBe(true);
    expect(limiteEmMs(VISUALIZACAO_PADRAO.limites.amarelo)).toBe(1 * H);
    expect(limiteEmMs(VISUALIZACAO_PADRAO.limites.vermelho)).toBe(4 * H);
    expect(ehVisualizacaoPadrao(VISUALIZACAO_PADRAO)).toBe(true);
  });

  it("no máximo 5 ligados: o sexto não liga, um ligado pode desligar", () => {
    const cinco = lerVisualizacao({
      ...VISUALIZACAO_PADRAO,
      campos: { ...VISUALIZACAO_PADRAO.campos, setor: true, tempoSemResposta: true, mensagensAgendadas: true },
    });
    expect(camposAtivos(cinco)).toBe(5);
    expect(podeLigar(cinco, "tags")).toBe(false);
    expect(podeLigar(cinco, "setor")).toBe(true);
    expect(podeLigar(VISUALIZACAO_PADRAO, "tags")).toBe(true);
    expect(ehVisualizacaoPadrao(cinco)).toBe(false);
  });

  it("fora da forma vale o padrão; os limites em minutos/horas/dias", () => {
    expect(lerVisualizacao({ campos: 1 })).toEqual(VISUALIZACAO_PADRAO);
    expect(lerVisualizacao(null)).toEqual(VISUALIZACAO_PADRAO);
    expect(limiteEmMs({ valor: 30, unidade: "minutos" })).toBe(30 * 60 * 1000);
    expect(limiteEmMs({ valor: 2, unidade: "dias" })).toBe(48 * H);
  });

  it("a cor da espera segue os limites; o texto é curto como o da Clint", () => {
    expect(corDaEspera(10 * 60 * 1000, VISUALIZACAO_PADRAO)).toBe("cinza");
    expect(corDaEspera(1 * H, VISUALIZACAO_PADRAO)).toBe("amarelo");
    expect(corDaEspera(5 * H, VISUALIZACAO_PADRAO)).toBe("vermelho");
    expect(textoDaEspera(30 * 1000, t)).toBe("agora");
    expect(textoDaEspera(3 * 60 * 1000, t)).toBe("3 min");
    expect(textoDaEspera(3 * H, t)).toBe("3h");
    expect(textoDaEspera(8 * 24 * H, t)).toBe("8d");
  });
});

describe("seções e campos do cartão (D5, D7)", () => {
  it("sem negócio, Atividades e Negócio somem mesmo ligadas", () => {
    expect(secoesParaMostrar(lerSecoes(null), true)).toEqual([
      "atividades", "contato", "negocio", "empresa", "notas", "anexos", "historico", "conversas",
    ]);
    expect(secoesParaMostrar(lerSecoes({ notas: false }), false)).toEqual([
      "contato", "empresa", "anexos", "historico", "conversas",
    ]);
  });

  it("os campos do cartão: padrão, leitura tolerante e os disponíveis da origem", () => {
    expect(CAMPOS_DO_CARTAO_PADRAO).toEqual(["origem", "etapa", "dono", "valor", "status"]);
    expect(lerCamposDoCartao(["status", "crm:sdr", 1])).toEqual(["status", "crm:sdr"]);
    expect(lerCamposDoCartao("x")).toEqual(CAMPOS_DO_CARTAO_PADRAO);
    expect(ehCamposPadrao(["origem", "etapa", "dono", "valor", "status"])).toBe(true);
    expect(ehCamposPadrao(["status"])).toBe(false);
    const disponiveis = camposDisponiveis([{ key: "sdr", label: "sdr", type: "text" }], t);
    expect(disponiveis.map((c) => c.chave)).toEqual(["origem", "etapa", "dono", "valor", "status", "crm:sdr"]);
    expect(disponiveis[5]).toMatchObject({ rotulo: "sdr", grupo: "crm" });
  });
});

describe("modo espião e dispositivos", () => {
  it("a marca vive na sessão e sobrevive a leitura ruim", () => {
    const guardado = new Map<string, string>();
    const storage = {
      getItem: (k: string) => guardado.get(k) ?? null,
      setItem: (k: string, v: string) => void guardado.set(k, v),
      removeItem: (k: string) => void guardado.delete(k),
    };
    expect(lerModoEspiao(storage)).toBe(false);
    gravarModoEspiao(storage, true);
    expect(lerModoEspiao(storage)).toBe(true);
    gravarModoEspiao(storage, false);
    expect(lerModoEspiao(storage)).toBe(false);
    expect(lerModoEspiao(null)).toBe(false);
  });

  it("os dispositivos agrupam por tipo, na ordem da Clint, e a bolinha segue o estado", () => {
    const grupos = agruparDispositivos([
      { id: "1", provider: "meta_cloud", status: "WORKING", display_name: "Suporte", phone_number: "+5562999990000" },
      { id: "2", provider: "waha", status: "STOPPED", display_name: "Sara", phone_number: "+5511953042230" },
      { id: "3", provider: "zernio_social", status: "WORKING", display_name: "@loja", phone_number: null },
    ]);
    expect(grupos.map((g) => g.grupo)).toEqual(["whatsapp", "whatsapp_oficial", "instagram"]);
    expect(grupos[0]!.canais.map((c) => c.id)).toEqual(["2"]);
    expect(bolinhaDoDispositivo("WORKING")).toBe("verde");
    expect(bolinhaDoDispositivo("STOPPED")).toBe("vermelha");
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-conversas-regras.test.ts`
Expected: FAIL (módulos não existem).

- [ ] **Step 5: `presets.ts` e `ordem.ts`**

Create `lib/escale/conversas/presets.ts`:

```ts
import type { StatusDeConversa } from "@/hooks/inbox/useConversationsRealtime";

import type { Ordem } from "./ordem";

/**
 * OS PRESETS DA FILA (fork Escale, Fase 3A; A4 e seção 6 do PRD de Conversas).
 *
 * São os da Clint ("Todos", "Não lidas", e os quatro de STATUS) sobre o mapa
 * de status do original: "Em aberto" é open/pending/claimed/ai_handling sem
 * espera vigente; "Em espera" é o snooze do original ainda valendo (decisão 2
 * da seção 9); "Fechadas" é closed/resolved. Automático e Fila (abas do
 * original) ficam fora da casca (A14): a conversa roteada aparece em "Em
 * aberto" sem atendente.
 */
export const PRESETS = ["todos", "nao_lidas", "meus_em_aberto", "em_aberto", "em_espera", "fechadas"] as const;
export type Preset = (typeof PRESETS)[number];
export const PRESET_PADRAO: Preset = "todos";
/** `?v=` na URL (como `?filter=` do original): o preset é onde a pessoa está. */
export const PARAM_PRESET = "v";

export const ROTULO_DO_PRESET: Readonly<Record<Preset, string>> = {
  todos: "Todos",
  nao_lidas: "Não lidas",
  meus_em_aberto: "Meus em aberto",
  em_aberto: "Em aberto",
  em_espera: "Em espera",
  fechadas: "Fechadas",
};

/** O grupo "STATUS" do menu (c31); os dois primeiros ficam fora de grupo. */
export const PRESETS_DE_STATUS: readonly Preset[] = ["meus_em_aberto", "em_aberto", "em_espera", "fechadas"];

export const STATUS_ABERTOS: readonly StatusDeConversa[] = ["open", "pending", "claimed", "ai_handling"];
export const STATUS_FECHADOS: readonly StatusDeConversa[] = ["closed", "resolved"];

/**
 * O que a fila pede à rota do original. `snoozed` e `ordem` são os dois
 * parâmetros que a 3A acrescenta ao schema (`listConversationsQuerySchema`).
 * A 3D soma aqui os critérios do painel de filtros.
 */
export interface FiltrosDaFila {
  status?: readonly StatusDeConversa[];
  assigned_to?: "me";
  unread?: boolean;
  snoozed?: boolean;
  search?: string;
  ordem?: Ordem;
}

export function filtrosDoPreset(preset: Preset): FiltrosDaFila {
  switch (preset) {
    case "nao_lidas":
      return { unread: true };
    case "meus_em_aberto":
      return { assigned_to: "me", status: STATUS_ABERTOS, snoozed: false };
    case "em_aberto":
      return { status: STATUS_ABERTOS, snoozed: false };
    case "em_espera":
      return { status: STATUS_ABERTOS, snoozed: true };
    case "fechadas":
      return { status: STATUS_FECHADOS };
    case "todos":
    default:
      return {};
  }
}

export function presetDaUrl(valor: string | null | undefined): Preset {
  return (PRESETS as readonly string[]).includes(valor ?? "") ? (valor as Preset) : PRESET_PADRAO;
}

export function emEspera(c: { snooze_until: string | null }, agora: Date = new Date()): boolean {
  if (!c.snooze_until) return false;
  const ate = new Date(c.snooze_until).getTime();
  return Number.isFinite(ate) ? ate > agora.getTime() : c.snooze_until === "infinity";
}

export const estaAberta = (status: string): boolean =>
  (STATUS_ABERTOS as readonly string[]).includes(status);
```

Create `lib/escale/conversas/ordem.ts`:

```ts
/**
 * A ORDEM DA FILA (fork Escale, Fase 3A; A5). "Última interação" é a ordem
 * padrão do original (`last_message_at desc`); "Esperando mais tempo" é a
 * régua da Fila do original (`ORDEM_DA_ESPERA`: `awaiting_since asc`), pedida
 * à rota como `?ordem=espera`.
 */
export const ORDENS = ["interacao", "espera"] as const;
export type Ordem = (typeof ORDENS)[number];
export const ORDEM_PADRAO: Ordem = "interacao";
export const PARAM_ORDEM = "o";

export const ROTULO_DA_ORDEM: Readonly<Record<Ordem, string>> = {
  interacao: "Última interação",
  espera: "Esperando mais tempo",
};

export function ordemDaUrl(valor: string | null | undefined): Ordem {
  return (ORDENS as readonly string[]).includes(valor ?? "") ? (valor as Ordem) : ORDEM_PADRAO;
}
```

- [ ] **Step 6: `linha.ts` e `visualizacao.ts`**

Create `lib/escale/conversas/linha.ts`:

```ts
import { estaAberta } from "./presets";

type T = (texto: string) => string;
const dois = (n: number) => String(n).padStart(2, "0");

const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * A HORA DO CANTO DA LINHA (fork Escale, Fase 3A; A7): hoje "HH:mm", ontem
 * "Ontem", antes disso a data no formato brasileiro (regra 5 do CLAUDE.md:
 * dd/mm/aaaa, nunca o "12/12/2025" curto que o print 003 mostra).
 */
export function horaDaLinha(iso: string | null | undefined, agora: Date, t: T): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (mesmoDia(d, agora)) return `${dois(d.getHours())}:${dois(d.getMinutes())}`;
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  if (mesmoDia(d, ontem)) return t("Ontem");
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** ✓✓ na prévia: a última mensagem foi nossa (a lista não traz a direção, só os dois relógios). */
export function ultimaFoiNossa(c: {
  last_inbound_at: string | null;
  last_outbound_at: string | null;
}): boolean {
  if (!c.last_outbound_at) return false;
  if (!c.last_inbound_at) return true;
  return new Date(c.last_outbound_at).getTime() >= new Date(c.last_inbound_at).getTime();
}

/**
 * HÁ QUANTO TEMPO O CLIENTE ESPERA (ms): a última mensagem é dele e a conversa
 * está aberta. Fechada, ou quando a última foi nossa, não há espera.
 */
export function aguardandoHa(
  c: { status: string; last_inbound_at: string | null; last_outbound_at: string | null },
  agora: Date,
): number | null {
  if (!estaAberta(c.status) || !c.last_inbound_at || ultimaFoiNossa(c)) return null;
  const desde = new Date(c.last_inbound_at).getTime();
  return Number.isFinite(desde) ? Math.max(0, agora.getTime() - desde) : null;
}

export function previaDaLinha(c: { last_message_preview: string | null }, t: T): string {
  const texto = c.last_message_preview?.trim();
  return texto ? texto : t("Sem mensagens");
}

export function inicialDoAtendente(nome: string | null | undefined): string {
  const limpo = (nome ?? "").trim();
  return limpo ? limpo[0]!.toUpperCase() : "";
}
```

Create `lib/escale/conversas/visualizacao.ts`:

```ts
import { z } from "zod";

type T = (texto: string) => string;

/**
 * "PERSONALIZAR VISUALIZAÇÃO" (fork Escale, Fase 3A; A8, 02-008, c44–c46).
 *
 * Os sete campos da linha da Clint, no máximo cinco ligados, com os limites
 * de alerta do tempo sem resposta. Preferência por pessoa (tabela
 * crm_preferencias_de_conversas, chave `visualizacao`).
 */
export const CAMPOS_DA_LINHA = [
  "atendente",
  "empresa",
  "setor",
  "tempoSemResposta",
  "mensagensAgendadas",
  "tags",
  "permissaoDeChamada",
] as const;
export type CampoDaLinha = (typeof CAMPOS_DA_LINHA)[number];

export const ROTULO_DO_CAMPO_DA_LINHA: Readonly<Record<CampoDaLinha, string>> = {
  atendente: "Atendente",
  empresa: "Empresa",
  setor: "Setor",
  tempoSemResposta: "Tempo sem resposta",
  mensagensAgendadas: "Mensagens agendadas",
  tags: "Tags",
  permissaoDeChamada: "Permissão de chamada",
};

export const CAMPOS_ATIVOS_MAX = 5;

export const UNIDADES_DE_TEMPO = ["minutos", "horas", "dias"] as const;
export type UnidadeDeTempo = (typeof UNIDADES_DE_TEMPO)[number];
export const ROTULO_DA_UNIDADE: Readonly<Record<UnidadeDeTempo, string>> = {
  minutos: "Minutos",
  horas: "Horas",
  dias: "Dias",
};

const MS: Record<UnidadeDeTempo, number> = {
  minutos: 60_000,
  horas: 3_600_000,
  dias: 86_400_000,
};

const limiteSchema = z
  .object({ valor: z.number().int().min(1).max(999), unidade: z.enum(UNIDADES_DE_TEMPO) })
  .strict();
export type Limite = z.infer<typeof limiteSchema>;

export const visualizacaoSchema = z
  .object({
    campos: z
      .object(
        Object.fromEntries(CAMPOS_DA_LINHA.map((c) => [c, z.boolean()])) as Record<
          CampoDaLinha,
          z.ZodBoolean
        >,
      )
      .strict()
      .refine((c) => Object.values(c).filter(Boolean).length <= CAMPOS_ATIVOS_MAX, {
        message: `no máximo ${CAMPOS_ATIVOS_MAX} campos ativos`,
      }),
    limites: z.object({ amarelo: limiteSchema, vermelho: limiteSchema }).strict(),
  })
  .strict();
export type Visualizacao = z.infer<typeof visualizacaoSchema>;

export const VISUALIZACAO_PADRAO: Visualizacao = {
  campos: {
    atendente: true,
    empresa: false,
    setor: false,
    tempoSemResposta: false,
    mensagensAgendadas: false,
    tags: false,
    permissaoDeChamada: true,
  },
  limites: { amarelo: { valor: 1, unidade: "horas" }, vermelho: { valor: 4, unidade: "horas" } },
};

/** Guardado fora da forma vale o padrão (a mesma tolerância da 9005). */
export function lerVisualizacao(bruto: unknown): Visualizacao {
  const lido = visualizacaoSchema.safeParse(bruto);
  return lido.success ? lido.data : VISUALIZACAO_PADRAO;
}

export const camposAtivos = (v: Visualizacao): number =>
  CAMPOS_DA_LINHA.filter((c) => v.campos[c]).length;

/** No limite, só quem já está ligado pode mexer (c45: os desligados ficam cinza). */
export const podeLigar = (v: Visualizacao, campo: CampoDaLinha): boolean =>
  v.campos[campo] || camposAtivos(v) < CAMPOS_ATIVOS_MAX;

export const ehVisualizacaoPadrao = (v: Visualizacao): boolean =>
  JSON.stringify(v) === JSON.stringify(VISUALIZACAO_PADRAO);

export const limiteEmMs = (l: Limite): number => l.valor * MS[l.unidade];

export type CorDaEspera = "cinza" | "amarelo" | "vermelho";

export function corDaEspera(ms: number, v: Visualizacao): CorDaEspera {
  if (ms >= limiteEmMs(v.limites.vermelho)) return "vermelho";
  if (ms >= limiteEmMs(v.limites.amarelo)) return "amarelo";
  return "cinza";
}

/** "agora", "3 min", "3h", "8d" — os `component.ChatItem.waiting*` da Clint. */
export function textoDaEspera(ms: number, t: T): string {
  const min = Math.floor(ms / 60_000);
  if (min < 1) return t("agora");
  if (min < 60) return `${min} ${t("min")}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
```

- [ ] **Step 7: `secoes.ts`, `campos-do-cartao.ts`, `modo-espiao.ts`, `nova-conversa.ts`**

Create `lib/escale/conversas/secoes.ts`:

```ts
import { z } from "zod";

/**
 * AS 8 SEÇÕES DO PAINEL DIREITO (fork Escale, Fase 3A; D5, 02-009, c15, c49).
 * A ordem é a da Clint e não muda; "Seções visíveis" só liga e desliga.
 */
export const SECOES = [
  "atividades",
  "contato",
  "negocio",
  "empresa",
  "notas",
  "anexos",
  "historico",
  "conversas",
] as const;
export type Secao = (typeof SECOES)[number];

export const ROTULO_DA_SECAO: Readonly<Record<Secao, string>> = {
  atividades: "Atividades",
  contato: "Contato",
  negocio: "Negócio",
  empresa: "Empresa",
  notas: "Notas",
  anexos: "Anexos",
  historico: "Histórico",
  conversas: "Conversas",
};

export const secoesSchema = z
  .object(
    Object.fromEntries(SECOES.map((s) => [s, z.boolean()])) as Record<Secao, z.ZodBoolean>,
  )
  .strict();
export type SecoesVisiveis = z.infer<typeof secoesSchema>;

export const SECOES_PADRAO: SecoesVisiveis = Object.fromEntries(
  SECOES.map((s) => [s, true]),
) as SecoesVisiveis;

/** Aceita o objeto parcial (só as chaves gravadas); o que falta vale o padrão. */
export function lerSecoes(bruto: unknown): SecoesVisiveis {
  if (!bruto || typeof bruto !== "object") return SECOES_PADRAO;
  const lido = secoesSchema.partial().safeParse(bruto);
  return lido.success ? { ...SECOES_PADRAO, ...lido.data } : SECOES_PADRAO;
}

/** Sem negócio, Atividades e Negócio não existem (c48), mesmo ligadas. */
const SO_COM_NEGOCIO: ReadonlySet<Secao> = new Set(["atividades", "negocio"]);

export function secoesParaMostrar(visiveis: SecoesVisiveis, temNegocio: boolean): Secao[] {
  return SECOES.filter((s) => visiveis[s] && (temNegocio || !SO_COM_NEGOCIO.has(s)));
}

export const ehSecoesPadrao = (v: SecoesVisiveis): boolean => SECOES.every((s) => v[s]);
```

Create `lib/escale/conversas/campos-do-cartao.ts`:

```ts
import { z } from "zod";

import type { CustomFieldDef } from "@/lib/types/leads";

type T = (texto: string) => string;

/**
 * "PERSONALIZAR CAMPOS" DA SEÇÃO NEGÓCIO (fork Escale, Fase 3A; D7, 02-005).
 *
 * A lista ordenada do que a seção mostra: os cinco básicos ("Informações
 * básicas") e os campos do CRM da origem (`crm:{chave}`, catálogo da 1F-a).
 * Preferência por pessoa (chave `campos_do_negocio`).
 */
export const CAMPOS_BASICOS = ["origem", "etapa", "dono", "valor", "status"] as const;
export type CampoBasico = (typeof CAMPOS_BASICOS)[number];

export const ROTULO_DO_CAMPO_BASICO: Readonly<Record<CampoBasico, string>> = {
  origem: "Origem",
  etapa: "Etapa",
  dono: "Dono",
  valor: "Valor do negócio",
  status: "Status",
};

export const PREFIXO_CRM = "crm:";
export const CAMPOS_DO_CARTAO_PADRAO: readonly string[] = [...CAMPOS_BASICOS];
export const CAMPOS_DO_CARTAO_MAX = 30;

export const camposDoCartaoSchema = z
  .array(z.string().min(1).max(120))
  .max(CAMPOS_DO_CARTAO_MAX);

/** Lista tolerante: itens que não são texto saem; fora da forma, o padrão. */
export function lerCamposDoCartao(bruto: unknown): string[] {
  if (!Array.isArray(bruto)) return [...CAMPOS_DO_CARTAO_PADRAO];
  const lido = camposDoCartaoSchema.safeParse(bruto.filter((x) => typeof x === "string"));
  return lido.success ? [...new Set(lido.data)] : [...CAMPOS_DO_CARTAO_PADRAO];
}

export const ehCamposPadrao = (lista: readonly string[]): boolean =>
  lista.length === CAMPOS_BASICOS.length && lista.every((c, i) => c === CAMPOS_BASICOS[i]);

export interface CampoDisponivel {
  chave: string;
  rotulo: string;
  grupo: "basico" | "crm";
}

export function camposDisponiveis(
  defs: ReadonlyArray<Pick<CustomFieldDef, "key" | "label">>,
  t: T,
): CampoDisponivel[] {
  return [
    ...CAMPOS_BASICOS.map((c) => ({ chave: c, rotulo: t(ROTULO_DO_CAMPO_BASICO[c]), grupo: "basico" as const })),
    ...defs.map((d) => ({ chave: `${PREFIXO_CRM}${d.key}`, rotulo: d.label, grupo: "crm" as const })),
  ];
}
```

Se `CustomFieldDef` não estiver em `@/lib/types/leads`, use o tipo de onde `camposDoFunil` (`lib/leads/campos-do-funil.ts`) o importa.

Create `lib/escale/conversas/modo-espiao.ts`:

```ts
/**
 * MODO ESPIÃO (fork Escale, Fase 3A; A9): uma marca da sessão do navegador,
 * sem banco (seção 7 do PRD). Ligado, abrir uma conversa não a marca como
 * lida. A 3E reaproveita a mesma chave na aba Conversas da ficha.
 */
export const CHAVE_DO_MODO_ESPIAO = "escale_modo_espiao";

interface StorageLeve {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function lerModoEspiao(storage: StorageLeve | null | undefined): boolean {
  try {
    return storage?.getItem(CHAVE_DO_MODO_ESPIAO) === "1";
  } catch {
    return false;
  }
}

export function gravarModoEspiao(storage: StorageLeve | null | undefined, ligado: boolean): void {
  try {
    if (ligado) storage?.setItem(CHAVE_DO_MODO_ESPIAO, "1");
    else storage?.removeItem(CHAVE_DO_MODO_ESPIAO);
  } catch {
    // Sem acesso ao sessionStorage (modo privado, SecurityError): a marca não persiste.
  }
}
```

Create `lib/escale/conversas/nova-conversa.ts`:

```ts
import { lerEstadoDoCanal } from "@/lib/channels/estado";

/**
 * "NOVA CONVERSA" (fork Escale, Fase 3A; A12, c86): os dispositivos agrupados
 * como a Clint (WHATSAPP, WHATSAPP OFICIAL, INSTAGRAM) e a bolinha de estado.
 */
export const GRUPOS_DE_DISPOSITIVO = ["whatsapp", "whatsapp_oficial", "instagram"] as const;
export type GrupoDeDispositivo = (typeof GRUPOS_DE_DISPOSITIVO)[number];

export const ROTULO_DO_GRUPO: Readonly<Record<GrupoDeDispositivo, string>> = {
  whatsapp: "WhatsApp",
  whatsapp_oficial: "WhatsApp Oficial",
  instagram: "Instagram",
};

export function grupoDoDispositivo(provider: string | null | undefined): GrupoDeDispositivo {
  if (provider === "meta_cloud") return "whatsapp_oficial";
  if (provider === "zernio_social") return "instagram";
  return "whatsapp";
}

export interface DispositivoLeve {
  id: string;
  provider?: string | null;
  status: string;
  display_name: string | null;
  phone_number: string | null;
}

export function agruparDispositivos<D extends DispositivoLeve>(
  canais: readonly D[],
): Array<{ grupo: GrupoDeDispositivo; canais: D[] }> {
  return GRUPOS_DE_DISPOSITIVO.map((grupo) => ({
    grupo,
    canais: canais.filter((c) => grupoDoDispositivo(c.provider) === grupo),
  })).filter((g) => g.canais.length > 0);
}

export const bolinhaDoDispositivo = (status: string): "verde" | "vermelha" =>
  lerEstadoDoCanal(status).utilizavel ? "verde" : "vermelha";
```

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-conversas-regras.test.ts && corepack pnpm prettier --write lib/escale/conversas tests/unit/escale-conversas-regras.test.ts && corepack pnpm eslint lib/escale/conversas tests/unit/escale-conversas-regras.test.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/escale/conversas tests/unit/escale-conversas-regras.test.ts docs/superpowers/plans/2026-10-18-fase-3a-fila-e-painel.md docs/escale/modulos/3-conversas.md
git commit -m "feat(escale): regras puras da fila de Conversas — presets, ordem, linha, visualização, seções e campos (Fase 3A)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: Migration 9201 — as preferências por pessoa

**Files:**
- Create: `supabase/migrations/20261102120000_9201_preferencias_de_conversas.sql`, `lib/escale/conversas/preferencias.ts`, `tests/invariants/escale-preferencias-de-conversas.test.ts`, `tests/unit/escale-conversas-preferencias.test.ts`
- Modify: `supabase/baseline.sql` (bloco antes do 0323), `tests/invariants/rls-completude-varredura.test.ts` (entrada em `PROVA_PROPRIA`), `lib/audit/actions.ts` (`"conversation_prefs.updated",`)

**Interfaces (Produces):**
- `preferencias.ts`: `CHAVES_DE_PREFERENCIA` (`["visualizacao","campos_do_negocio","secoes"]`), `ChaveDePreferencia`, `Preferencias` (`{ visualizacao: Visualizacao; campos_do_negocio: string[]; secoes: SecoesVisiveis }`), `PREFERENCIAS_PADRAO`, `lerPreferencias(linhas)`, `gravacaoSchema` (`{chave, valor}` discriminada), `Gravacao`, `lerPreferenciasDaPessoa(supabase, orgId, userId)`, `gravarPreferenciaDaPessoa(supabase, orgId, userId, gravacao)`.

- [ ] **Step 1: A migration**

```bash
bash scripts/checar-colisao-de-migration.sh escale-crm/main
```

Create `supabase/migrations/20261102120000_9201_preferencias_de_conversas.sql`:

```sql
-- manifest: fork Escale · Fase 3A · preferências por pessoa da tela de Conversas da casca
-- ---- FORK ESCALE · preferências de Conversas (migration 9201) ----
--
-- "Personalizar visualização" (com os limites de alerta), os campos do cartão
-- do negócio e as seções visíveis do painel direito, por pessoa e organização
-- (A8, D5 e D7 do PRD de Conversas; seção 7). Molde: crm_colunas_das_listas
-- (9101) — uma linha por pessoa e chave; só a pessoa lê e escreve a sua.

create table if not exists public.crm_preferencias_de_conversas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  chave text not null,
  valor jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_preferencias_de_conversas_chave_valida
    check (chave in ('visualizacao', 'campos_do_negocio', 'secoes')),
  constraint crm_preferencias_de_conversas_valor_tamanho check (octet_length(valor::text) <= 8192),
  constraint crm_preferencias_de_conversas_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create unique index if not exists uq_crm_preferencias_de_conversas_pessoa
  on public.crm_preferencias_de_conversas (organization_id, user_id, chave);
create index if not exists idx_crm_preferencias_de_conversas_pessoa
  on public.crm_preferencias_de_conversas (user_id, organization_id);

alter table public.crm_preferencias_de_conversas enable row level security;

drop policy if exists crm_preferencias_de_conversas_select on public.crm_preferencias_de_conversas;
drop policy if exists crm_preferencias_de_conversas_pessoa_write on public.crm_preferencias_de_conversas;

create policy crm_preferencias_de_conversas_select on public.crm_preferencias_de_conversas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid())
  );

create policy crm_preferencias_de_conversas_pessoa_write on public.crm_preferencias_de_conversas
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

revoke all on public.crm_preferencias_de_conversas from anon;
grant select, insert, update, delete on public.crm_preferencias_de_conversas to authenticated;
grant all on public.crm_preferencias_de_conversas to service_role;

drop trigger if exists trg_crm_preferencias_de_conversas_updated_at on public.crm_preferencias_de_conversas;
create trigger trg_crm_preferencias_de_conversas_updated_at
  before update on public.crm_preferencias_de_conversas
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_preferencias_de_conversas is
  'Preferências da tela de Conversas da casca por pessoa (fork Escale, migration 9201): visualizacao (os campos da linha e os limites de alerta), campos_do_negocio (os campos do cartão) e secoes (as seções visíveis). Só a pessoa lê e escreve a sua.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;
notify pgrst, 'reload schema';
```

- [ ] **Step 2: O bloco no baseline, a varredura e a ação de auditoria**

Em `supabase/baseline.sql`, logo ANTES da linha `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----`, cole o conteúdo da migration **sem** a primeira linha `-- manifest:` (o baseline não leva manifest), do comentário `-- ---- FORK ESCALE · preferências de Conversas (migration 9201) ----` até o `notify`.

Em `tests/invariants/rls-completude-varredura.test.ts`, logo depois da entrada de `crm_acoes_em_massa_itens` em `PROVA_PROPRIA`:

```ts
  {
    tabela: "crm_preferencias_de_conversas",
    razao:
      "tests/invariants/escale-preferencias-de-conversas.test.ts — fork Escale (migration 9201): cada pessoa lê e escreve " +
      "só as suas (zero para a outra pessoa e para o vizinho), uma linha por chave, chave fora da lista recusada, " +
      "viewer escreve, FK da pessoa.",
  },
```

Em `lib/audit/actions.ts`, logo depois de `"list_columns.updated",`:

```ts
  // FORK ESCALE · Fase 3A: as preferências da tela de Conversas da casca (migration 9201).
  "conversation_prefs.updated",
```

- [ ] **Step 3: A prova de RLS (fica pronta; roda no fim da Frente C)**

Create `tests/invariants/escale-preferencias-de-conversas.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_ORG,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  tableExists,
  writeCountAs,
} from "./gov-helpers";

/**
 * PREFERÊNCIAS DE CONVERSAS (fork Escale, migration 9201) — prova contra
 * Postgres real: cada pessoa só vê e escreve as suas, uma linha por chave, a
 * chave é fechada, viewer escreve (é preferência de tela), e a FK da pessoa
 * barra quem não é membro. Roda via `pnpm test:db` (fim da Frente C).
 */
const T = "public.crm_preferencias_de_conversas";
const OUTRA_ORG = "e5ca1e00-9201-4000-8000-0000000000b1";
const VIZINHO = "e5ca1e00-9201-4000-8000-0000000000b2";
const minhas = (quem: string) => `select count(*) from ${T} where user_id = '${quem}'`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from ${T} where organization_id in ('${GOV_ORG}', '${OUTRA_ORG}');
    insert into auth.users (id, email) values ('${VIZINHO}', 'prefs-vizinho@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', 'prefs-vizinha', 'Prefs Vizinha', 'Vizinha') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${VIZINHO}', '${OUTRA_ORG}', 'admin', now()) on conflict do nothing;
  `);
});

describe("crm_preferencias_de_conversas", () => {
  it("existe, com RLS", () => {
    expect(tableExists("crm_preferencias_de_conversas")).toBe(true);
    expect(sql(`select relrowsecurity from pg_class where oid = '${T}'::regclass;`).trim()).toBe("t");
  });

  it("a pessoa grava a sua e só vê a sua; a outra pessoa e o vizinho veem zero", () => {
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'secoes', '{"notas": false}')`,
      ),
    ).toBe(1);
    expect(countAs(GOV_AGENT_A, `select count(*) from ${T}`)).toBe(1);
    expect(countAs(GOV_AGENT_B, `select count(*) from ${T}`)).toBe(0);
    expect(countAs(VIZINHO, `select count(*) from ${T}`)).toBe(0);
  });

  it("ninguém grava em nome de outra pessoa", () => {
    expect(() =>
      writeCountAs(
        GOV_AGENT_B,
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'visualizacao', '{}')`,
      ),
    ).toThrow();
    expect(
      writeCountAs(GOV_AGENT_B, `update ${T} set valor = '{}' where user_id = '${GOV_AGENT_A}'`),
    ).toBe(0);
  });

  it("uma linha por chave; chave fora da lista é recusada; viewer escreve", () => {
    expect(() =>
      writeCountAs(
        GOV_AGENT_A,
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'secoes', '{}')`,
      ),
    ).toThrow(/uq_crm_preferencias_de_conversas_pessoa/);
    expect(() =>
      writeCountAs(
        GOV_AGENT_A,
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'inventada', '{}')`,
      ),
    ).toThrow(/chave_valida/);
    expect(
      writeCountAs(
        GOV_VIEWER,
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${GOV_VIEWER}', 'visualizacao', '{}')`,
      ),
    ).toBe(1);
    expect(countAs(GOV_VIEWER, minhas(GOV_VIEWER))).toBe(1);
  });

  it("a FK da pessoa barra quem não é membro da organização", () => {
    expect(() =>
      sql(
        `insert into ${T} (organization_id, user_id, chave, valor) values ('${GOV_ORG}', '${VIZINHO}', 'secoes', '{}');`,
      ),
    ).toThrow(/crm_preferencias_de_conversas_pessoa_fk/);
  });
});
```

- [ ] **Step 4: O teste da lib (vai falhar)**

Create `tests/unit/escale-conversas-preferencias.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  PREFERENCIAS_PADRAO,
  gravacaoSchema,
  lerPreferencias,
} from "@/lib/escale/conversas/preferencias";
import { VISUALIZACAO_PADRAO } from "@/lib/escale/conversas/visualizacao";

describe("preferências de Conversas (9201)", () => {
  it("sem linhas vale o padrão; linha fora da forma vale o padrão daquela chave", () => {
    expect(lerPreferencias([])).toEqual(PREFERENCIAS_PADRAO);
    const lidas = lerPreferencias([
      { chave: "secoes", valor: { notas: false } },
      { chave: "campos_do_negocio", valor: ["status", "crm:sdr"] },
      { chave: "visualizacao", valor: { campos: "x" } },
    ]);
    expect(lidas.secoes.notas).toBe(false);
    expect(lidas.secoes.contato).toBe(true);
    expect(lidas.campos_do_negocio).toEqual(["status", "crm:sdr"]);
    expect(lidas.visualizacao).toEqual(VISUALIZACAO_PADRAO);
  });

  it("a gravação é validada pela chave", () => {
    expect(gravacaoSchema.safeParse({ chave: "secoes", valor: { notas: false } }).success).toBe(true);
    expect(gravacaoSchema.safeParse({ chave: "secoes", valor: { inventada: false } }).success).toBe(false);
    expect(
      gravacaoSchema.safeParse({
        chave: "visualizacao",
        valor: {
          ...VISUALIZACAO_PADRAO,
          campos: { ...VISUALIZACAO_PADRAO.campos, setor: true, tags: true, empresa: true, tempoSemResposta: true },
        },
      }).success,
    ).toBe(false);
    expect(gravacaoSchema.safeParse({ chave: "campos_do_negocio", valor: ["status"] }).success).toBe(true);
    expect(gravacaoSchema.safeParse({ chave: "outra", valor: {} }).success).toBe(false);
  });
});
```

- [ ] **Step 5: A lib**

Create `lib/escale/conversas/preferencias.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  CAMPOS_DO_CARTAO_PADRAO,
  camposDoCartaoSchema,
  lerCamposDoCartao,
} from "./campos-do-cartao";
import { SECOES_PADRAO, lerSecoes, secoesSchema, type SecoesVisiveis } from "./secoes";
import {
  VISUALIZACAO_PADRAO,
  lerVisualizacao,
  visualizacaoSchema,
  type Visualizacao,
} from "./visualizacao";

/**
 * AS PREFERÊNCIAS DA TELA DE CONVERSAS (fork Escale, Fase 3A; migration 9201).
 * Três chaves, uma linha por pessoa e chave; o que não está gravado (ou está
 * fora da forma) vale o padrão daquela chave.
 */
export const CHAVES_DE_PREFERENCIA = ["visualizacao", "campos_do_negocio", "secoes"] as const;
export type ChaveDePreferencia = (typeof CHAVES_DE_PREFERENCIA)[number];

export interface Preferencias {
  visualizacao: Visualizacao;
  campos_do_negocio: string[];
  secoes: SecoesVisiveis;
}

export const PREFERENCIAS_PADRAO: Preferencias = {
  visualizacao: VISUALIZACAO_PADRAO,
  campos_do_negocio: [...CAMPOS_DO_CARTAO_PADRAO],
  secoes: SECOES_PADRAO,
};

export function lerPreferencias(
  linhas: ReadonlyArray<{ chave: string; valor: unknown }>,
): Preferencias {
  const por = new Map(linhas.map((l) => [l.chave, l.valor]));
  return {
    visualizacao: por.has("visualizacao")
      ? lerVisualizacao(por.get("visualizacao"))
      : VISUALIZACAO_PADRAO,
    campos_do_negocio: por.has("campos_do_negocio")
      ? lerCamposDoCartao(por.get("campos_do_negocio"))
      : [...CAMPOS_DO_CARTAO_PADRAO],
    secoes: por.has("secoes") ? lerSecoes(por.get("secoes")) : SECOES_PADRAO,
  };
}

export const gravacaoSchema = z.discriminatedUnion("chave", [
  z.object({ chave: z.literal("visualizacao"), valor: visualizacaoSchema }).strict(),
  z.object({ chave: z.literal("campos_do_negocio"), valor: camposDoCartaoSchema }).strict(),
  z.object({ chave: z.literal("secoes"), valor: secoesSchema.partial().strict() }).strict(),
]);
export type Gravacao = z.infer<typeof gravacaoSchema>;

type ErroDoBanco = { code?: string; message?: string };

export async function lerPreferenciasDaPessoa(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
): Promise<Preferencias> {
  const { data, error } = await supabase
    .from("crm_preferencias_de_conversas")
    .select("chave, valor")
    .eq("organization_id", orgId)
    .eq("user_id", userId);
  if (error) throw error;
  return lerPreferencias((data ?? []) as Array<{ chave: string; valor: unknown }>);
}

/** Uma linha por chave: atualiza se existe, senão insere (o mesmo passo da 9005). */
export async function gravarPreferenciaDaPessoa(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  gravacao: Gravacao,
): Promise<{ error: ErroDoBanco | null }> {
  const { data: existente, error: erroDaLeitura } = await supabase
    .from("crm_preferencias_de_conversas")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("chave", gravacao.chave)
    .maybeSingle();
  if (erroDaLeitura) return { error: erroDaLeitura };
  if (existente) {
    const { error } = await supabase
      .from("crm_preferencias_de_conversas")
      .update({ valor: gravacao.valor })
      .eq("id", (existente as { id: string }).id)
      .eq("organization_id", orgId);
    return { error };
  }
  const { error } = await supabase
    .from("crm_preferencias_de_conversas")
    .insert({ organization_id: orgId, user_id: userId, chave: gravacao.chave, valor: gravacao.valor });
  return { error };
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-conversas-preferencias.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/baseline-x-migrations.test.ts 2>/dev/null; corepack pnpm vitest run tests/unit/escale-conversas-preferencias.test.ts && corepack pnpm prettier --write lib/escale/conversas/preferencias.ts tests/unit/escale-conversas-preferencias.test.ts tests/invariants/escale-preferencias-de-conversas.test.ts && corepack pnpm eslint lib/escale/conversas/preferencias.ts tests/invariants/escale-preferencias-de-conversas.test.ts && corepack pnpm typecheck`
Expected: PASS. Se existir uma cerca que confere o baseline contra as migrations (procure com `ls tests/unit | grep -i baseline`), rode-a também.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261102120000_9201_preferencias_de_conversas.sql supabase/baseline.sql lib/escale/conversas/preferencias.ts lib/audit/actions.ts tests/invariants/escale-preferencias-de-conversas.test.ts tests/invariants/rls-completude-varredura.test.ts tests/unit/escale-conversas-preferencias.test.ts
git commit -m "feat(escale): migration 9201 — preferências por pessoa da tela de Conversas (Fase 3A)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: Rotas — as preferências, os negócios do contato e os dois filtros novos da lista

**Files:**
- Create: `app/api/v1/preferencias-de-conversas/route.ts`, `app/api/v1/negocios-do-contato/route.ts`, `tests/unit/escale-conversas-rotas.test.ts`
- Modify: `lib/schemas/messaging.ts` (`listConversationsQuerySchema`), `app/api/v1/conversations/route.ts` (o `safeParse`), `app/api/v1/conversations/_handler.ts` (ordem e `snoozed`)

**Interfaces:**
- Consumes: `requireRole`, `requireSupportWrite`, `createClient`, `audit`, `falhaInesperadaDoQuadro` (`lib/escale/capa/banco`), `lerJson` (`lib/escale/origens/respostas`), `lerUuid` (`lib/escale/origens/preferencias`), `lerPreferenciasDaPessoa`, `gravarPreferenciaDaPessoa`, `gravacaoSchema`.
- Produces: `GET /api/v1/preferencias-de-conversas` → `{ data: { preferencias: Preferencias } }`; `PUT` com `{ chave, valor }` → `{ data: { preferencias } }` (422 fora da forma; audita `conversation_prefs.updated` com `{ chave }`); `GET /api/v1/negocios-do-contato?contact_id=<uuid>` → `{ data: NegocioDoContato[] }` com `NegocioDoContato = { id, pipeline_id, stage_id, status, updated_at, origem: { id, nome, grupo: string | null } }`, abertos primeiro, até 20, só origens não arquivadas; `?snoozed=true|false` e `?ordem=espera` na lista do original.

- [ ] **Step 1: O teste das rotas (vai falhar)**

Create `tests/unit/escale-conversas-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as GET_NEGOCIOS } from "@/app/api/v1/negocios-do-contato/route";
import { GET, PUT } from "@/app/api/v1/preferencias-de-conversas/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { PREFERENCIAS_PADRAO } from "@/lib/escale/conversas/preferencias";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { listConversationsQuerySchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk, makeDb } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Linha = Record<string, unknown>;
const OUTRA = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const C1 = "c1c1c1c1-0000-4000-8000-000000000001";

function banco(linhas: Linha[] = []) {
  const db = makeDb();
  (db.tabelas as unknown as Record<string, Linha[]>).crm_preferencias_de_conversas = linhas;
  return db;
}
const linhasDe = (db: ReturnType<typeof banco>) =>
  (db.tabelas as unknown as Record<string, Linha[]>).crm_preferencias_de_conversas ?? [];
const ler = () => GET();
const gravar = (body: unknown) =>
  PUT(
    new NextRequest("http://localhost/api/v1/preferencias-de-conversas", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
  );
const corpo = async (r: Response) => ((await r.json()) as { data: unknown }).data;

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk();
});

describe("/api/v1/preferencias-de-conversas", () => {
  it("GET devolve as minhas com o padrão onde não há linha, e nunca as da outra pessoa", async () => {
    banco([
      { id: "p1", organization_id: ORG_ID, user_id: USER_ID, chave: "secoes", valor: { notas: false } },
      { id: "p2", organization_id: ORG_ID, user_id: OUTRA, chave: "secoes", valor: { contato: false } },
    ]);
    const data = (await corpo(await ler())) as { preferencias: typeof PREFERENCIAS_PADRAO };
    expect(data.preferencias.secoes.notas).toBe(false);
    expect(data.preferencias.secoes.contato).toBe(true);
    expect(data.preferencias.visualizacao).toEqual(PREFERENCIAS_PADRAO.visualizacao);
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("viewer");
  });

  it("PUT grava uma chave por vez, uma linha por pessoa e chave, audita, e recusa fora da forma", async () => {
    const db = banco();
    expect((await gravar({ chave: "secoes", valor: { notas: false } })).status).toBe(200);
    expect((await gravar({ chave: "secoes", valor: { notas: true, anexos: false } })).status).toBe(200);
    const minhas = linhasDe(db).filter((l) => l.user_id === USER_ID);
    expect(minhas).toHaveLength(1);
    expect(minhas[0]).toMatchObject({ chave: "secoes", valor: { notas: true, anexos: false } });
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({
      action: "conversation_prefs.updated",
      metadata: { chave: "secoes" },
    });
    expect((await gravar({ chave: "secoes", valor: { inventada: 1 } })).status).toBe(422);
    expect((await gravar("{quebrado")).status).toBe(400);
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    expect((await gravar({ chave: "secoes", valor: {} })).status).toBe(403);
  });
});

describe("/api/v1/negocios-do-contato", () => {
  it("devolve os negócios do contato com a origem e o grupo, abertos primeiro; sem contact_id é 422", async () => {
    const db = makeDb();
    (db.tabelas as unknown as Record<string, Linha[]>).crm_leads = [
      { id: "l1", organization_id: ORG_ID, contact_id: C1, pipeline_id: "p1", stage_id: "s1", status: "won", updated_at: "2026-10-18T10:00:00Z" },
      { id: "l2", organization_id: ORG_ID, contact_id: C1, pipeline_id: "p1", stage_id: "s2", status: "open", updated_at: "2026-10-17T10:00:00Z" },
      { id: "l3", organization_id: ORG_ID, contact_id: "outro", pipeline_id: "p1", stage_id: "s1", status: "open", updated_at: "2026-10-18T10:00:00Z" },
    ];
    (db.tabelas as unknown as Record<string, Linha[]>).crm_pipelines = [
      { id: "p1", organization_id: ORG_ID, name: "Obra Futura", is_archived: false, group_id: "g1" },
    ];
    (db.tabelas as unknown as Record<string, Linha[]>).crm_pipeline_groups = [
      { id: "g1", organization_id: ORG_ID, name: "INSS Vendas" },
    ];
    const r = await GET_NEGOCIOS(new NextRequest(`http://localhost/api/v1/negocios-do-contato?contact_id=${C1}`));
    expect(r.status).toBe(200);
    const data = (await corpo(r)) as Array<{ id: string; origem: { nome: string; grupo: string | null } }>;
    expect(data.map((n) => n.id)).toEqual(["l2", "l1"]);
    expect(data[0]!.origem).toEqual({ id: "p1", nome: "Obra Futura", grupo: "INSS Vendas" });
    expect((await GET_NEGOCIOS(new NextRequest("http://localhost/api/v1/negocios-do-contato"))).status).toBe(422);
  });
});

describe("os dois filtros novos da lista do original (A4, A5)", () => {
  it("o schema aceita snoozed e ordem e recusa o resto", () => {
    expect(listConversationsQuerySchema.safeParse({ snoozed: "true", ordem: "espera" }).success).toBe(true);
    expect(listConversationsQuerySchema.safeParse({ snoozed: "talvez" }).success).toBe(false);
    expect(listConversationsQuerySchema.safeParse({ ordem: "nome" }).success).toBe(false);
  });
});
```

Se o `makeDb` de `tests/helpers/stages-db-double.ts` não simular o `.in()`/`.order()` que a rota de negócios usa, troque o segundo `describe` por um banco de mentira à mão, como o `banco()` de `tests/unit/escale-acoes-em-massa-rotas.test.ts` (uma cadeia com `select/eq/in/order/limit` devolvendo a lista filtrada por `contact_id`).

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-conversas-rotas.test.ts`
Expected: FAIL.

- [ ] **Step 3: A rota das preferências**

Create `app/api/v1/preferencias-de-conversas/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import {
  gravacaoSchema,
  gravarPreferenciaDaPessoa,
  lerPreferenciasDaPessoa,
} from "@/lib/escale/conversas/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/preferencias-de-conversas";

/**
 * AS PREFERÊNCIAS DA TELA DE CONVERSAS DA CASCA (fork Escale, Fase 3A;
 * migration 9201). Pela sessão: a RLS entrega só as linhas da pessoa.
 */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  try {
    const preferencias = await lerPreferenciasDaPessoa(
      await createClient(),
      authz.org.orgId,
      authz.user.id,
    );
    return ok({ preferencias }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `GET ${ROTA}`, operacao: "ler as preferências de Conversas" },
      t,
      requestId,
    );
  }
}

export async function PUT(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("viewer", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = gravacaoSchema.safeParse(corpo.json);
  if (!lido.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
      details: lido.error.flatten(),
    });
  }

  const supabase = await createClient();
  const { error } = await gravarPreferenciaDaPessoa(
    supabase,
    authz.org.orgId,
    authz.user.id,
    lido.data,
  );
  if (error) {
    return falhaInesperadaDoQuadro(
      error,
      { rota: `PUT ${ROTA}`, operacao: "gravar a preferência de Conversas" },
      t,
      requestId,
    );
  }
  void audit({
    action: "conversation_prefs.updated",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_preferencias_de_conversas",
    resourceId: authz.user.id,
    requestId,
    metadata: { chave: lido.data.chave },
  });
  const preferencias = await lerPreferenciasDaPessoa(supabase, authz.org.orgId, authz.user.id);
  return ok({ preferencias }, { requestId });
}
```

- [ ] **Step 4: A rota dos negócios do contato**

Create `app/api/v1/negocios-do-contato/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/negocios-do-contato";
const NEGOCIOS_MAX = 20;

export interface NegocioDoContato {
  id: string;
  pipeline_id: string;
  stage_id: string;
  status: "open" | "won" | "lost";
  updated_at: string;
  origem: { id: string; nome: string; grupo: string | null };
}

type LeadLido = {
  id: string;
  pipeline_id: string;
  stage_id: string;
  status: "open" | "won" | "lost";
  updated_at: string;
};
type OrigemLida = { id: string; name: string; is_archived: boolean; group_id: string | null };
type GrupoLido = { id: string; name: string };

/**
 * OS NEGÓCIOS DO CONTATO DA CONVERSA (fork Escale, Fase 3A; D1, D3). Pela
 * sessão: a RLS de `crm_leads` (visibility_mode e o acesso por origem da 1J)
 * decide o que entra. Abertos primeiro, depois os fechados mais recentes.
 * O negócio escolhido é lido inteiro pelo quadro (`useBoard`), como na ficha.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_leads" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const contactId = lerUuid(req.nextUrl.searchParams.get("contact_id"));
  if (!contactId) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
    });
  }
  try {
    const supabase = await createClient();
    const orgId = authz.org.orgId;
    const { data: leads, error } = await supabase
      .from("crm_leads")
      .select("id, pipeline_id, stage_id, status, updated_at")
      .eq("organization_id", orgId)
      .eq("contact_id", contactId)
      .order("updated_at", { ascending: false })
      .limit(NEGOCIOS_MAX * 2);
    if (error) throw error;
    const lidos = (leads ?? []) as LeadLido[];
    const idsDasOrigens = [...new Set(lidos.map((l) => l.pipeline_id))];
    const { data: origens, error: erroOrigens } = idsDasOrigens.length
      ? await supabase
          .from("crm_pipelines")
          .select("id, name, is_archived, group_id")
          .eq("organization_id", orgId)
          .in("id", idsDasOrigens)
      : { data: [], error: null };
    if (erroOrigens) throw erroOrigens;
    const vivas = new Map(
      ((origens ?? []) as OrigemLida[]).filter((o) => !o.is_archived).map((o) => [o.id, o]),
    );
    const idsDosGrupos = [...new Set([...vivas.values()].map((o) => o.group_id).filter(Boolean))];
    const { data: grupos, error: erroGrupos } = idsDosGrupos.length
      ? await supabase
          .from("crm_pipeline_groups")
          .select("id, name")
          .eq("organization_id", orgId)
          .in("id", idsDosGrupos as string[])
      : { data: [], error: null };
    if (erroGrupos) throw erroGrupos;
    const nomeDoGrupo = new Map(((grupos ?? []) as GrupoLido[]).map((g) => [g.id, g.name]));

    const peso = (s: LeadLido["status"]) => (s === "open" ? 0 : 1);
    const resposta: NegocioDoContato[] = lidos
      .filter((l) => vivas.has(l.pipeline_id))
      .sort((a, b) => peso(a.status) - peso(b.status) || b.updated_at.localeCompare(a.updated_at))
      .slice(0, NEGOCIOS_MAX)
      .map((l) => {
        const origem = vivas.get(l.pipeline_id)!;
        return {
          ...l,
          origem: {
            id: origem.id,
            nome: origem.name,
            grupo: origem.group_id ? (nomeDoGrupo.get(origem.group_id) ?? null) : null,
          },
        };
      });
    return ok(resposta, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `GET ${ROTA}`, operacao: "ler os negócios do contato" },
      t,
      requestId,
    );
  }
}
```

- [ ] **Step 5: Os encaixes do original (snoozed e ordem)**

Em `lib/schemas/messaging.ts`, dentro de `listConversationsQuerySchema`, logo depois da chave `contact_id` (mantenha a vírgula):

```ts
  /**
   * FORK ESCALE · Fase 3A: os presets da fila da casca. `snoozed` separa
   * "Em espera" (o snooze vigente) de "Em aberto"; `ordem=espera` pede a
   * régua da Fila (`ORDEM_DA_ESPERA`) fora da aba Fila. Ausentes, nada muda.
   */
  snoozed: z.enum(["true", "false"]).optional(),
  ordem: z.enum(["espera"]).optional(),
```

Em `app/api/v1/conversations/route.ts`, no objeto do `safeParse`, logo depois da linha de `contact_id`:

```ts
    // FORK ESCALE · Fase 3A: lidos aqui pela mesma razão das chaves acima
    // (a cerca `rota-le-todo-filtro-do-schema` cobra a forma exata).
    snoozed: url.searchParams.get("snoozed") ?? undefined,
    ordem: url.searchParams.get("ordem") ?? undefined,
```

Em `app/api/v1/conversations/_handler.ts`, dentro de `listConversationsHandler`:

1. Troque as três linhas que decidem a ordem por:

```ts
  const isQueue = ehAFila(q);
  // FORK ESCALE · Fase 3A: "Esperando mais tempo" fora da Fila é a mesma régua.
  const porEspera = isQueue || q.ordem === "espera";
  const sortCol = porEspera ? ORDEM_DA_ESPERA.coluna : "last_message_at";
  const ordem = porEspera ? ORDEM_DA_ESPERA.opcoes : ({ ascending: false, nullsFirst: false } as const);
  const asc = porEspera;
```

2. Logo depois de `if (q.unread) query = query.gt("unread_count_for_assignee", 0);`:

```ts
  // FORK ESCALE · Fase 3A: "Em espera" é o snooze do original vigente (seção 6
  // do PRD de Conversas); "Em aberto" é o resto. Compõe sobre `query`, que já
  // tem o filtro de organização — a única barreira com o admin client.
  if (q.snoozed === "true") query = query.gt("snooze_until", new Date().toISOString());
  if (q.snoozed === "false") {
    query = query.or(`snooze_until.is.null,snooze_until.lte.${new Date().toISOString()}`);
  }
```

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-conversas-rotas.test.ts tests/unit/rota-le-todo-filtro-do-schema.test.ts tests/unit/badge-espelha-o-filtro.test.ts $(grep -rlF "conversations/_handler" tests/unit --include='*.test.ts' | tr '\n' ' ') && corepack pnpm prettier --write app/api/v1/preferencias-de-conversas/route.ts app/api/v1/negocios-do-contato/route.ts tests/unit/escale-conversas-rotas.test.ts && corepack pnpm eslint app/api/v1/preferencias-de-conversas app/api/v1/negocios-do-contato app/api/v1/conversations/route.ts app/api/v1/conversations/_handler.ts lib/schemas/messaging.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/v1/preferencias-de-conversas app/api/v1/negocios-do-contato lib/schemas/messaging.ts app/api/v1/conversations/route.ts app/api/v1/conversations/_handler.ts tests/unit/escale-conversas-rotas.test.ts
git commit -m "feat(escale): rotas das preferências e dos negócios do contato; snoozed e ordem na lista de conversas (Fase 3A)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 4: Hooks — a fila, as preferências, o modo espião e os negócios do contato

**Files:**
- Create: `hooks/escale/useFilaDeConversas.ts`, `hooks/escale/usePreferenciasDeConversas.ts`, `hooks/escale/useModoEspiao.ts`, `hooks/escale/useNegociosDoContato.ts`, `tests/unit/escale-fila-de-conversas-hook.test.tsx`

**Interfaces:**
- Consumes: `apiClient`, `useRealtimeChannel`, `useRefetchDeSeguranca`, `agendarRecargaDasConversas`, `showApiError`, `ConversationWithContact`, `FiltrosDaFila`, `Preferencias`, `Gravacao`, `NegocioDoContato`, `lerModoEspiao`/`gravarModoEspiao`.
- Produces:
  - `useFilaDeConversas(filtros: FiltrosDaFila, orgId: string | null)` → o `UseInfiniteQueryResult<InfiniteData<PaginaDaFila>>` mais `realtimeStatus` e `seguranca`; `chaveDaFila(filtros)` = `["conversations", { casca: true, ...filtros }]`; `urlDaFila(filtros, cursor?)` (pura, testável); `PaginaDaFila`; `LIMITE_DA_FILA` (50).
  - `usePreferenciasDeConversas()` → `{ data: Preferencias (padrão enquanto carrega), isLoading, … }`; `useGravarPreferencia()` → `useMutation<…, Gravacao>` com gravação otimista no cache `CHAVE_DAS_PREFERENCIAS`; `aplicarGravacao(atual, g)` (pura).
  - `useModoEspiao()` → `[ligado: boolean, mudar: (v: boolean) => void]` (sessionStorage + `useSyncExternalStore`, sincronizado entre componentes por `CustomEvent("escale:modo-espiao")`).
  - `useNegociosDoContato(contactId: string | null)` → `{ data?: NegocioDoContato[], isLoading, isError }`, chave `["negocios-do-contato", contactId]`; `invalidarNegociosDoContato(qc, contactId)`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-fila-de-conversas-hook.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { STATUS_ABERTOS } from "@/lib/escale/conversas/presets";

vi.mock("@/hooks/realtime/useRealtimeChannel", () => ({
  useRealtimeChannel: () => ({ status: "SUBSCRIBED", ultimaEntrega: { current: null } }),
}));
vi.mock("@/hooks/realtime/useRefetchDeSeguranca", () => ({
  useRefetchDeSeguranca: () => ({ divergencias: 0 }),
}));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

import { chaveDaFila, urlDaFila, useFilaDeConversas } from "@/hooks/escale/useFilaDeConversas";
import { useModoEspiao } from "@/hooks/escale/useModoEspiao";
import {
  useGravarPreferencia,
  usePreferenciasDeConversas,
} from "@/hooks/escale/usePreferenciasDeConversas";

const envolver = (qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };

describe("useFilaDeConversas", () => {
  it("monta a URL do original com status, assigned_to, unread, snoozed, ordem, busca, cursor e limit 50", () => {
    expect(
      urlDaFila({ status: STATUS_ABERTOS, assigned_to: "me", unread: true, snoozed: false, ordem: "espera", search: "neto" }, "abc"),
    ).toBe(
      "/api/v1/conversations?status=open%2Cpending%2Cclaimed%2Cai_handling&assigned_to=me&unread=true&snoozed=false&ordem=espera&search=neto&cursor=abc&limit=50",
    );
    expect(urlDaFila({})).toBe("/api/v1/conversations?limit=50");
    expect(chaveDaFila({ unread: true })).toEqual(["conversations", { casca: true, unread: true }]);
  });

  it("lê a lista e pagina pelo cursor", async () => {
    api.get.mockResolvedValueOnce({ data: [{ id: "c1" }], meta: { cursor: "x", has_more: true } });
    const { result } = renderHook(() => useFilaDeConversas({}, "org1"), { wrapper: envolver() });
    await waitFor(() => expect(result.current.data?.pages[0]?.data).toEqual([{ id: "c1" }]));
    expect(result.current.hasNextPage).toBe(true);
    expect(api.get).toHaveBeenCalledWith("/api/v1/conversations?limit=50");
  });
});

describe("usePreferenciasDeConversas", () => {
  it("vale o padrão enquanto carrega e grava otimista por chave", async () => {
    api.get.mockResolvedValueOnce({
      data: { preferencias: { visualizacao: { campos: { atendente: true, empresa: false, setor: false, tempoSemResposta: false, mensagensAgendadas: false, tags: false, permissaoDeChamada: true }, limites: { amarelo: { valor: 1, unidade: "horas" }, vermelho: { valor: 4, unidade: "horas" } } }, campos_do_negocio: ["status"], secoes: { atividades: true, contato: true, negocio: true, empresa: true, notas: false, anexos: true, historico: true, conversas: true } } },
    });
    api.put.mockResolvedValueOnce({ data: { preferencias: {} } });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(
      () => ({ prefs: usePreferenciasDeConversas(), gravar: useGravarPreferencia() }),
      { wrapper: envolver(qc) },
    );
    expect(result.current.prefs.data.secoes.notas).toBe(true);
    await waitFor(() => expect(result.current.prefs.data.secoes.notas).toBe(false));
    expect(result.current.prefs.data.campos_do_negocio).toEqual(["status"]);
    act(() => {
      result.current.gravar.mutate({ chave: "secoes", valor: { notas: true } });
    });
    await waitFor(() => expect(result.current.prefs.data.secoes.notas).toBe(true));
    expect(api.put).toHaveBeenCalledWith("/api/v1/preferencias-de-conversas", { chave: "secoes", valor: { notas: true } });
  });
});

describe("useModoEspiao", () => {
  it("lê a sessão, muda e avisa os outros", () => {
    window.sessionStorage.removeItem("escale_modo_espiao");
    const a = renderHook(() => useModoEspiao());
    const b = renderHook(() => useModoEspiao());
    expect(a.result.current[0]).toBe(false);
    act(() => a.result.current[1](true));
    expect(a.result.current[0]).toBe(true);
    expect(b.result.current[0]).toBe(true);
    expect(window.sessionStorage.getItem("escale_modo_espiao")).toBe("1");
    act(() => b.result.current[1](false));
    expect(a.result.current[0]).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-fila-de-conversas-hook.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Os hooks**

Create `hooks/escale/useFilaDeConversas.ts`:

```ts
"use client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { agendarRecargaDasConversas } from "@/hooks/inbox/recargaDasConversas";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { useRefetchDeSeguranca } from "@/hooks/realtime/useRefetchDeSeguranca";
import { apiClient } from "@/lib/api/client";
import type { FiltrosDaFila } from "@/lib/escale/conversas/presets";

export interface PaginaDaFila {
  data: ConversationWithContact[];
  meta?: { cursor?: string | null; has_more?: boolean };
}

export const LIMITE_DA_FILA = 50;

/**
 * A FILA DA CASCA (fork Escale, Fase 3A; A4, A5). Lê a rota do original com
 * os presets da Clint por cima. A chave começa por "conversations" de
 * propósito: `agendarRecargaDasConversas` (tempo real do original) invalida
 * `["conversations"]` e alcança esta lista sem nenhuma linha nova lá.
 */
export const chaveDaFila = (filtros: FiltrosDaFila) =>
  ["conversations", { casca: true, ...filtros }] as const;

export function urlDaFila(filtros: FiltrosDaFila, cursor?: string): string {
  const qs = new URLSearchParams();
  if (filtros.status?.length) qs.set("status", filtros.status.join(","));
  if (filtros.assigned_to) qs.set("assigned_to", filtros.assigned_to);
  if (filtros.unread) qs.set("unread", "true");
  if (filtros.snoozed !== undefined) qs.set("snoozed", filtros.snoozed ? "true" : "false");
  if (filtros.ordem === "espera") qs.set("ordem", "espera");
  if (filtros.search) qs.set("search", filtros.search);
  if (cursor) qs.set("cursor", cursor);
  qs.set("limit", String(LIMITE_DA_FILA));
  return `/api/v1/conversations?${qs.toString()}`;
}

export function useFilaDeConversas(filtros: FiltrosDaFila, orgId: string | null) {
  const qc = useQueryClient();
  const queryKey = useMemo(() => chaveDaFila(filtros), [filtros]);

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      try {
        return await apiClient.get<PaginaDaFila>(urlDaFila(filtros, pageParam));
      } catch (err) {
        showApiError(err);
        throw err;
      }
    },
    getNextPageParam: (ultima) =>
      ultima.meta?.has_more && ultima.meta.cursor ? ultima.meta.cursor : undefined,
    refetchOnWindowFocus: true,
  });

  const onChange = useCallback(() => agendarRecargaDasConversas(qc), [qc]);
  const { status: realtimeStatus, ultimaEntrega } = useRealtimeChannel({
    name: orgId ? `inbox-${orgId}` : "inbox-disabled",
    postgresChanges: orgId
      ? { event: "*", schema: "public", table: "conversations", filter: `organization_id=eq.${orgId}` }
      : undefined,
    onChange,
    enabled: !!orgId,
  });
  const seguranca = useRefetchDeSeguranca<{ pages: PaginaDaFila[] }>({
    queryKey,
    assinatura: (d) => {
      let maior = "";
      for (const c of d?.pages.flatMap((p) => p.data) ?? []) {
        const t = c.last_message_at ?? "";
        if (t > maior) maior = t;
      }
      return `${maior}:${d?.pages.reduce((n, p) => n + p.data.length, 0) ?? 0}`;
    },
    ultimaEntrega,
    enabled: !!orgId,
  });

  return { ...query, realtimeStatus, seguranca };
}
```

Confira a assinatura de `useRefetchDeSeguranca` em `hooks/realtime/useRefetchDeSeguranca.ts` (`queryKey`, `assinatura`, `ultimaEntrega`, `intervaloMs`, `enabled`) e a forma do `assinatura` que o `useConversationsRealtime` usa; copie-a se diferir.

Create `hooks/escale/usePreferenciasDeConversas.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { lerCamposDoCartao } from "@/lib/escale/conversas/campos-do-cartao";
import {
  PREFERENCIAS_PADRAO,
  type Gravacao,
  type Preferencias,
} from "@/lib/escale/conversas/preferencias";
import { lerSecoes } from "@/lib/escale/conversas/secoes";
import { lerVisualizacao } from "@/lib/escale/conversas/visualizacao";

const ROTA = "/api/v1/preferencias-de-conversas";
export const CHAVE_DAS_PREFERENCIAS = ["preferencias-de-conversas"] as const;

export function usePreferenciasDeConversas() {
  const q = useQuery({
    queryKey: CHAVE_DAS_PREFERENCIAS,
    queryFn: async () =>
      (await apiClient.get<{ data: { preferencias: Preferencias } }>(ROTA)).data.preferencias,
    staleTime: 5 * 60_000,
  });
  return { ...q, data: q.data ?? PREFERENCIAS_PADRAO };
}

/** Aplica a chave gravada no cache sem esperar a volta (a tela responde na hora). */
export function aplicarGravacao(atual: Preferencias, g: Gravacao): Preferencias {
  if (g.chave === "visualizacao") return { ...atual, visualizacao: lerVisualizacao(g.valor) };
  if (g.chave === "campos_do_negocio") return { ...atual, campos_do_negocio: lerCamposDoCartao(g.valor) };
  return { ...atual, secoes: lerSecoes({ ...atual.secoes, ...g.valor }) };
}

export function useGravarPreferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (g: Gravacao) =>
      apiClient.put<{ data: { preferencias: Preferencias } }>(ROTA, g),
    onMutate: async (g) => {
      await qc.cancelQueries({ queryKey: CHAVE_DAS_PREFERENCIAS });
      const antes = qc.getQueryData<Preferencias>(CHAVE_DAS_PREFERENCIAS) ?? PREFERENCIAS_PADRAO;
      qc.setQueryData(CHAVE_DAS_PREFERENCIAS, aplicarGravacao(antes, g));
      return { antes };
    },
    onError: (_e, _g, ctx) => {
      if (ctx) qc.setQueryData(CHAVE_DAS_PREFERENCIAS, ctx.antes);
    },
    onSuccess: (resposta) => {
      if (resposta?.data?.preferencias?.secoes) qc.setQueryData(CHAVE_DAS_PREFERENCIAS, resposta.data.preferencias);
    },
  });
}
```

Create `hooks/escale/useModoEspiao.ts`:

```ts
"use client";
import { useCallback, useSyncExternalStore } from "react";

import { gravarModoEspiao, lerModoEspiao } from "@/lib/escale/conversas/modo-espiao";

const EVENTO = "escale:modo-espiao";

function assinar(aoMudar: () => void): () => void {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

function sessao(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** MODO ESPIÃO (A9): a marca da sessão, compartilhada por quem estiver montado. */
export function useModoEspiao(): [boolean, (ligado: boolean) => void] {
  const ligado = useSyncExternalStore(
    assinar,
    () => lerModoEspiao(sessao()),
    () => false,
  );
  const mudar = useCallback((v: boolean) => {
    gravarModoEspiao(sessao(), v);
    window.dispatchEvent(new CustomEvent(EVENTO));
  }, []);
  return [ligado, mudar];
}
```

Create `hooks/escale/useNegociosDoContato.ts`:

```ts
"use client";
import { useQuery, type QueryClient } from "@tanstack/react-query";

import type { NegocioDoContato } from "@/app/api/v1/negocios-do-contato/route";
import { apiClient } from "@/lib/api/client";

export type { NegocioDoContato };

export const chaveDosNegociosDoContato = (contactId: string) =>
  ["negocios-do-contato", contactId] as const;

export function useNegociosDoContato(contactId: string | null) {
  return useQuery({
    queryKey: chaveDosNegociosDoContato(contactId ?? ""),
    enabled: !!contactId,
    staleTime: 30_000,
    queryFn: async () =>
      (
        await apiClient.get<{ data: NegocioDoContato[] }>(
          `/api/v1/negocios-do-contato?contact_id=${contactId}`,
        )
      ).data,
  });
}

export function invalidarNegociosDoContato(qc: QueryClient, contactId: string): void {
  void qc.invalidateQueries({ queryKey: chaveDosNegociosDoContato(contactId) });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-fila-de-conversas-hook.test.tsx && corepack pnpm prettier --write hooks/escale/useFilaDeConversas.ts hooks/escale/usePreferenciasDeConversas.ts hooks/escale/useModoEspiao.ts hooks/escale/useNegociosDoContato.ts tests/unit/escale-fila-de-conversas-hook.test.tsx && corepack pnpm eslint hooks/escale/useFilaDeConversas.ts hooks/escale/usePreferenciasDeConversas.ts hooks/escale/useModoEspiao.ts hooks/escale/useNegociosDoContato.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/escale/useFilaDeConversas.ts hooks/escale/usePreferenciasDeConversas.ts hooks/escale/useModoEspiao.ts hooks/escale/useNegociosDoContato.ts tests/unit/escale-fila-de-conversas-hook.test.tsx
git commit -m "feat(escale): hooks da fila, das preferências, do modo espião e dos negócios do contato (Fase 3A)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 5: A página, a casca de Conversas e os estados do centro

**Files:**
- Create: `components/escale/conversas/ConversasDaCasca.tsx`, `components/escale/conversas/TopoDasConversas.tsx`, `components/escale/conversas/centro/VazioDaCasca.tsx`, `components/escale/conversas/centro/CentroVazio.tsx`, `components/escale/conversas/centro/FaixaDoModoEspiao.tsx`, `components/escale/conversas/centro/ConversaAberta.tsx`, `tests/unit/escale-conversas-casca.test.tsx`
- Modify: `app/app/inbox/page.tsx`, `lib/ui/icons-da-casca.ts`, `app/escale-tema.css`, `app/globals.css`

**Interfaces:**
- Consumes: `useFilaDeConversas`, `useConversation`/`isNotFound`, `useMarkAsRead`, `useModoEspiao`, `useChannelSessions`, `useAuth`, `colunasDoCelular` (`components/inbox/InboxLayout`), `buscaValeConsulta`, `filtrosDoPreset`, `presetDaUrl`, `ordemDaUrl`, `PARAM_PRESET`, `PARAM_ORDEM`, `ConversationHeader`, `ChatThread`, `Composer`, `RetentionNotice`, `NumeroForaDoAr`, `JanelaFechadaAviso`, `estadoDaJanela`, `motivoDaJanelaFechada`, `motivoDoContato`, `OpenConversationProvider`, `Sheet`.
- Produces:
  - `ConversasDaCasca({ initialSelectedId, rascunho })` — a tela.
  - `TopoDasConversas({ aoNovaConversa, novaAberta })`.
  - `VazioDaCasca({ icone, titulo, texto, acao?, className? })` — o molde dos vazios (reaproveitado pela fila, pelo painel e pelas seções).
  - `CentroVazio({ semCanal, aoIniciar })`.
  - `FaixaDoModoEspiao({ aoDesativar })`.
  - `ConversaAberta({ conversa, rascunho, aoAbrirConversa, aoAbrirFicha? })` — o original dentro da casca (a 3B troca por dentro, sem mexer na casca).
  - `ModoDoCentro = "conversa" | "vazio" | "nova"`; `PainelLateral` (a Task 6 encaixa o painel "Personalizar visualização" e a Task 7 a "Nova conversa").

**Detalhes visuais (c01, c23):** a barra do módulo (48px) e as três colunas (320 | 1fr | 384) nas medidas da tabela; o centro vazio com o quadrado 48px `casca-marca-suave`, `MessagesSquare`, "Envie e receba mensagens dos seus clientes" 14px/600, o texto 12px `casca-suave` em três linhas (quebras fixas como a Clint: "Use o chat conectado / ao CRM e explore novas / experiências de atendimento."), o botão de borda com `Pencil`; a faixa verde do espião de 40px.

- [ ] **Step 1: Ícones e tokens**

Em `lib/ui/icons-da-casca.ts`, uma linha nova no fim (confira antes o que já está exportado; só o que falta):

```ts
export { ContactRound, ExternalLink, Pencil, UserRoundPlus, SquarePen, Ellipsis } from "lucide-react";
```

Em `app/escale-tema.css`, dentro de `body:has([data-escale-casca])`, ao lado dos outros `--color-casca-*`:

```css
  /* Fase 3A (c23, c54, c16): a faixa do modo espião, a conversa fixada, a pílula de atraso e o amarelo do tempo sem resposta */
  --color-casca-espiao: #a7f3d0;
  --color-casca-espiao-texto: #047857;
  --color-casca-fixada: #d1fae5;
  --color-casca-atraso: #fee2e2;
  --color-casca-atencao: #faa200;
```

Em `app/globals.css`, nos dois blocos onde os `casca-*` estão declarados (o `:root` com os fallbacks, perto da linha 246, e o `@theme`, perto da 642), as cinco linhas correspondentes, no mesmo molde das vizinhas:

```css
  --color-casca-espiao: var(--color-success-bg);
  --color-casca-espiao-texto: var(--color-success);
  --color-casca-fixada: var(--color-success-bg);
  --color-casca-atraso: var(--color-error-bg);
  --color-casca-atencao: var(--color-warning);
```

(e no `@theme`: `--color-casca-espiao: var(--color-casca-espiao);` etc.). Se os tokens `--color-success-bg`/`--color-error-bg`/`--color-warning` tiverem outro nome no `globals.css`, use o nome que existir para o mesmo papel.

- [ ] **Step 2: O teste da casca (vai falhar)**

Create `tests/unit/escale-conversas-casca.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  usePathname: () => "/app/inbox",
  useSearchParams: () => nav.params,
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "org1", role: "agent" }, user: { id: "u1", support: null } }),
  useUser: () => ({ id: "u1" }),
  useActiveOrg: () => ({ orgId: "org1", role: "agent" }),
  usePermission: () => true,
}));
const fila = vi.hoisted(() => ({
  data: { pages: [{ data: [] as unknown[] }] },
  isLoading: false,
  isError: false,
  hasNextPage: false,
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
  realtimeStatus: "SUBSCRIBED",
}));
vi.mock("@/hooks/escale/useFilaDeConversas", () => ({ useFilaDeConversas: () => fila }));
vi.mock("@/hooks/inbox/useConversation", () => ({
  useConversation: () => ({ data: undefined, isPending: false, error: null }),
  isNotFound: () => false,
}));
const marcar = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/inbox/useMarkAsRead", () => ({ useMarkAsRead: marcar }));
const canais = vi.hoisted(() => ({ data: [{ id: "ch1" }] as unknown[], isLoading: false }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({ useChannelSessions: () => canais }));
vi.mock("@/hooks/inbox/useConversationCounts", () => ({
  useConversationCounts: () => ({ data: { all: 120, fila: 0, unassigned: 0, mine: 0 } }),
}));
vi.mock("@/hooks/escale/usePreferenciasDeConversas", async () => {
  const { PREFERENCIAS_PADRAO } = await import("@/lib/escale/conversas/preferencias");
  return {
    usePreferenciasDeConversas: () => ({ data: PREFERENCIAS_PADRAO, isLoading: false }),
    useGravarPreferencia: () => ({ mutate: vi.fn(), isPending: false }),
  };
});
vi.mock("@/components/escale/conversas/centro/ConversaAberta", () => ({
  ConversaAberta: () => <div data-testid="conversa-aberta" />,
}));
vi.mock("@/components/escale/conversas/painel/PainelDoContato", () => ({
  PainelDoContato: ({ conversa }: { conversa: unknown }) => (
    <div data-testid="painel">{conversa ? "com conversa" : "Nenhuma conversa selecionada"}</div>
  ),
}));

import { ConversasDaCasca } from "@/components/escale/conversas/ConversasDaCasca";

const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => {
  window.sessionStorage.removeItem("escale_modo_espiao");
  nav.params = new URLSearchParams();
  marcar.mockClear();
});

describe("ConversasDaCasca (c01, c23)", () => {
  it("a barra do módulo, a fila vazia, o centro vazio e o painel vazio", () => {
    envolver(<ConversasDaCasca />);
    expect(screen.getByRole("heading", { name: "Conversas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova conversa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Configurações" })).toHaveAttribute("title", "Em breve");
    expect(screen.getByText("Envie e receba mensagens dos seus clientes")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Iniciar uma conversa" }).length).toBeGreaterThan(0);
    expect(screen.getByTestId("painel")).toHaveTextContent("Nenhuma conversa selecionada");
  });

  it("sem canal, o centro pede para conectar", () => {
    canais.data = [];
    envolver(<ConversasDaCasca />);
    expect(screen.getByText("Conecte um canal para começar a conversar")).toBeInTheDocument();
    canais.data = [{ id: "ch1" }];
  });

  it("'Nova conversa +' troca o centro pela tela de criar ou selecionar um contato", () => {
    envolver(<ConversasDaCasca />);
    fireEvent.click(screen.getByRole("button", { name: "Nova conversa" }));
    expect(screen.getByText("Crie ou selecione um contato")).toBeInTheDocument();
  });

  it("o modo espião mostra a faixa e não marca como lida", () => {
    window.sessionStorage.setItem("escale_modo_espiao", "1");
    fila.data = { pages: [{ data: [{ id: "c1", status: "open", unread_count_for_assignee: 2, last_message_at: null, last_inbound_at: null, last_outbound_at: null, snooze_until: null, contacts: { id: "ct1", display_name: "Neto", name: null, phone_number: null, tags: [] }, channel_sessions: null }] }] };
    nav.params = new URLSearchParams("id=c1");
    envolver(<ConversasDaCasca initialSelectedId="c1" />);
    expect(screen.getByText("Modo espião ativo")).toBeInTheDocument();
    expect(marcar).toHaveBeenLastCalledWith(null, 2);
    fireEvent.click(screen.getByRole("button", { name: "Desativar" }));
    expect(marcar).toHaveBeenLastCalledWith("c1", 2);
    fila.data = { pages: [{ data: [] }] };
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-conversas-casca.test.tsx`
Expected: FAIL.

- [ ] **Step 4: O molde dos vazios, o centro vazio e a faixa**

Create `components/escale/conversas/centro/VazioDaCasca.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";

import type { LucideIcon } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O MOLDE DOS VAZIOS DA CLINT (fork Escale, Fase 3A; c01, c75): o ícone num
 * quadrado roxo-claro, o título em 600, o texto em cinza e, se houver, uma
 * ação. O centro, a fila, o painel e as seções usam o mesmo.
 */
export function VazioDaCasca({
  icone: Icone,
  titulo,
  texto,
  acao,
  className,
}: {
  icone: LucideIcon;
  titulo: string;
  texto?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-[12px] bg-casca-marca-suave text-casca-marca">
        <Icone size={24} aria-hidden />
      </span>
      <p className="mt-2 text-[14px] font-semibold text-casca-texto">{titulo}</p>
      {texto ? <p className="text-[12px] leading-[18px] text-casca-suave">{texto}</p> : null}
      {acao ? <div className="mt-2">{acao}</div> : null}
    </div>
  );
}
```

Create `components/escale/conversas/centro/CentroVazio.tsx`:

```tsx
"use client";
import Link from "next/link";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { MessagesSquare, Pencil } from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "./VazioDaCasca";

const BOTAO = "border border-casca-borda text-casca-texto";

/** O centro sem conversa (c01) e sem canal (provisório, sem print; `component.ChatEmpty.*`). */
export function CentroVazio({ semCanal, aoIniciar }: { semCanal: boolean; aoIniciar: () => void }) {
  const t = useT();
  if (semCanal) {
    return (
      <VazioDaCasca
        className="h-full"
        icone={MessagesSquare}
        titulo={t("Conecte um canal para começar a conversar")}
        texto={t("Você precisa adicionar um dispositivo ou uma conta para iniciar uma nova conversa.")}
        acao={
          <BotaoDaCasca variante="texto" tamanho="md" className={BOTAO} asChild>
            <Link href="/app/connections">{t("Conectar um canal")}</Link>
          </BotaoDaCasca>
        }
      />
    );
  }
  return (
    <VazioDaCasca
      className="h-full"
      icone={MessagesSquare}
      titulo={t("Envie e receba mensagens dos seus clientes")}
      texto={
        <>
          {t("Use o chat conectado")}
          <br />
          {t("ao CRM e explore novas")}
          <br />
          {t("experiências de atendimento.")}
        </>
      }
      acao={
        <BotaoDaCasca variante="texto" tamanho="md" className={BOTAO} onClick={aoIniciar}>
          <Pencil size={14} aria-hidden />
          {t("Iniciar uma conversa")}
        </BotaoDaCasca>
      }
    />
  );
}
```

Se `BotaoDaCasca` não aceitar `asChild`, troque o botão do estado sem canal por um `<Link>` com as mesmas classes do botão (`inline-flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia`).

Create `components/escale/conversas/centro/FaixaDoModoEspiao.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import { Glasses } from "@/lib/ui/icons-da-casca";

/** A faixa verde do modo espião (c23; `component.SpyModeBar.*`). */
export function FaixaDoModoEspiao({ aoDesativar }: { aoDesativar: () => void }) {
  const t = useT();
  return (
    <div
      role="status"
      className="flex h-10 shrink-0 items-center gap-2 bg-casca-espiao px-4 text-[12px] text-casca-espiao-texto"
    >
      <Glasses size={16} aria-hidden />
      <span className="font-semibold">{t("Modo espião ativo")}</span>
      <span>{t("abrir uma conversa não vai marcá-la como lida.")}</span>
      <button type="button" onClick={aoDesativar} className="ml-auto underline underline-offset-2">
        {t("Desativar")}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: A conversa aberta (o original dentro da casca)**

Create `components/escale/conversas/centro/ConversaAberta.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

import { ChatThread } from "@/components/inbox/ChatThread";
import { Composer, type ComposerHandle } from "@/components/inbox/Composer";
import { ConversationHeader } from "@/components/inbox/ConversationHeader";
import { JanelaFechadaAviso } from "@/components/inbox/JanelaFechadaAviso";
import { NumeroForaDoAr } from "@/components/inbox/NumeroForaDoAr";
import { RetentionNotice } from "@/components/inbox/RetentionNotice";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { estadoDaJanela } from "@/lib/channels/janela";
import { motivoDaJanelaFechada, motivoDoContato } from "@/lib/inbox/motivo-do-envio-bloqueado";
import type { AvisoDeRascunho } from "@/lib/inbox/rascunho-sugerido";
import type { Message } from "@/lib/types/messaging";
import { Search, X } from "@/lib/ui/icons-da-casca";

/**
 * A CONVERSA ABERTA NA CASCA (fork Escale, Fase 3A). Por enquanto é o
 * cabeçalho, a thread e o compositor do ORIGINAL, com as mesmas props que o
 * `InboxLayout` lhes dá (janela de 24h, bloqueios, rascunho sugerido). A 3B
 * troca os três pelos da Clint sem mexer na casca de fora.
 */
export function ConversaAberta({
  conversa,
  rascunho,
  aoAbrirConversa,
  aoAbrirFicha,
}: {
  conversa: ConversationWithContact;
  rascunho: AvisoDeRascunho | null;
  aoAbrirConversa: (id: string | null) => void;
  /** Só abaixo de `xl`: o botão "Ficha" abre o painel direito numa gaveta. */
  aoAbrirFicha?: () => void;
}) {
  const t = useT();
  const { user } = useAuth();
  const supportReadonly = user.support?.access_mode === "support_readonly";
  const composerRef = useRef<ComposerHandle | null>(null);
  const botaoBuscaRef = useRef<HTMLButtonElement | null>(null);
  const [busca, setBusca] = useState<{ conversaId: string; termo: string } | null>(null);
  const [respondendo, setRespondendo] = useState<Message | null>(null);
  const buscaAberta = busca !== null && busca.conversaId === conversa.id;

  // A janela vence sozinha com a aba aberta (mesma régua do original).
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const janela = estadoDaJanela(
    conversa.channel_sessions?.provider ?? null,
    conversa.last_inbound_at ?? null,
    agora,
  );
  const motivoDaJanela = motivoDaJanelaFechada(janela, conversa.channel_sessions?.provider, t);
  const bloqueio = motivoDoContato(conversa.contacts, t);
  const rascunhoVivo = rascunho && rascunho.conversationId === conversa.id ? rascunho : null;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="conversa-aberta">
      {aoAbrirFicha ? (
        <div className="flex h-9 shrink-0 items-center justify-end border-b border-casca-borda px-2 xl:hidden">
          <BotaoDaCasca variante="texto" tamanho="sm" onClick={aoAbrirFicha}>
            {t("Ficha")}
          </BotaoDaCasca>
        </div>
      ) : null}
      <ConversationHeader
        key={conversa.id}
        conversation={conversa}
        onAbrirConversa={aoAbrirConversa}
        onBuscar={() =>
          buscaAberta ? setBusca(null) : setBusca({ conversaId: conversa.id, termo: "" })
        }
        buscaAberta={buscaAberta}
        botaoBuscaRef={botaoBuscaRef}
      />
      {buscaAberta ? (
        <div className="flex items-center gap-2 border-b border-casca-borda px-4 py-1.5">
          <Search size={16} aria-hidden className="shrink-0 text-casca-suave" />
          <input
            type="search"
            autoFocus
            className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            aria-label={t("Buscar nas mensagens carregadas")}
            placeholder={t("Buscar nas mensagens carregadas")}
            value={busca.termo}
            onChange={(e) => setBusca({ conversaId: busca.conversaId, termo: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") setBusca(null);
            }}
          />
          <BotaoDaCasca variante="icone" tamanho="sm" aria-label={t("Fechar busca")} onClick={() => setBusca(null)}>
            <X size={16} aria-hidden />
          </BotaoDaCasca>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ChatThread
          conversationId={conversa.id}
          searchTerm={buscaAberta ? busca.termo : ""}
          provider={conversa.channel_sessions?.provider ?? null}
          onResponder={setRespondendo}
          dono={{ userId: conversa.assigned_to_user_id ?? null, nome: conversa.assigned_to_user_name ?? null }}
          contatoId={conversa.contacts?.id ?? null}
        />
      </div>
      <RetentionNotice conversationId={conversa.id} />
      {conversa.contacts?.id ? (
        <NumeroForaDoAr
          key={`numero:${conversa.id}`}
          conversationId={conversa.id}
          channelSessionId={conversa.channel_session_id}
          contactId={conversa.contacts.id}
          contactPhone={conversa.contacts.phone_number ?? null}
          onAbrirConversa={aoAbrirConversa}
        />
      ) : null}
      {motivoDaJanela ? (
        <JanelaFechadaAviso
          conversationId={conversa.id}
          provider={conversa.channel_sessions?.provider ?? null}
          motivo={motivoDaJanela}
        />
      ) : null}
      <Composer
        key={rascunhoVivo ? `rascunho:${rascunhoVivo.conversationId}` : `composer:${conversa.id}`}
        ref={composerRef}
        conversationId={conversa.id}
        blockedReason={supportReadonly ? t("Acompanhamento somente leitura") : bloqueio}
        janelaFechada={motivoDaJanela}
        disabled={conversa.status === "closed"}
        contactName={conversa.contacts?.name ?? null}
        contactDisplayName={conversa.contacts?.display_name}
        respondendo={respondendo}
        onCancelarResposta={() => setRespondendo(null)}
        currentContactId={conversa.contact_id}
        rascunho={rascunhoVivo}
        initialDraft={rascunhoVivo?.leitura.estado === "sugerido" ? rascunhoVivo.leitura.texto : ""}
      />
    </div>
  );
}
```

- [ ] **Step 6: O topo e a casca**

Create `components/escale/conversas/TopoDasConversas.tsx`:

```tsx
"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { Plus, Settings } from "@/lib/ui/icons-da-casca";

/** A barra do módulo (c01): "Conversas", o ⚙ do hub (3C) e "Nova conversa +". */
export function TopoDasConversas({
  aoNovaConversa,
  novaAberta,
}: {
  aoNovaConversa: () => void;
  novaAberta: boolean;
}) {
  const t = useT();
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-casca-borda pr-4 pl-6">
      <h1 className="text-[16px] font-medium text-casca-texto">{t("Conversas")}</h1>
      <div className="flex items-center gap-2">
        <BotaoDaCasca
          variante="icone"
          tamanho="md"
          disabled
          title={t("Em breve")}
          aria-label={t("Configurações")}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Settings size={16} aria-hidden />
        </BotaoDaCasca>
        <BotaoDaCasca
          variante="marca"
          tamanho="md"
          onClick={aoNovaConversa}
          aria-label={t("Nova conversa")}
          aria-pressed={novaAberta}
        >
          {t("Nova conversa")}
          <Plus size={14} aria-hidden />
        </BotaoDaCasca>
      </div>
    </div>
  );
}
```

Create `components/escale/conversas/ConversasDaCasca.tsx`:

```tsx
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { colunasDoCelular } from "@/components/inbox/InboxLayout";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useFilaDeConversas } from "@/hooks/escale/useFilaDeConversas";
import { useModoEspiao } from "@/hooks/escale/useModoEspiao";
import { usePreferenciasDeConversas } from "@/hooks/escale/usePreferenciasDeConversas";
import { useT } from "@/hooks/i18n/useT";
import { isNotFound, useConversation } from "@/hooks/inbox/useConversation";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useMarkAsRead } from "@/hooks/inbox/useMarkAsRead";
import { OpenConversationProvider } from "@/hooks/notifications/OpenConversationContext";
import { ORDEM_PADRAO, PARAM_ORDEM, ordemDaUrl, type Ordem } from "@/lib/escale/conversas/ordem";
import {
  PARAM_PRESET,
  PRESET_PADRAO,
  filtrosDoPreset,
  presetDaUrl,
  type FiltrosDaFila,
  type Preset,
} from "@/lib/escale/conversas/presets";
import type { AvisoDeRascunho } from "@/lib/inbox/rascunho-sugerido";
import { buscaValeConsulta } from "@/lib/inbox/termo-de-busca";
import { cn } from "@/lib/utils";

import { CentroVazio } from "./centro/CentroVazio";
import { ConversaAberta } from "./centro/ConversaAberta";
import { FaixaDoModoEspiao } from "./centro/FaixaDoModoEspiao";
import { NovaConversa } from "./centro/NovaConversa";
import { BarraDaFila } from "./fila/BarraDaFila";
import { ListaDaFila } from "./fila/ListaDaFila";
import { PainelPersonalizarVisualizacao } from "./fila/PainelPersonalizarVisualizacao";
import { PainelDoContato } from "./painel/PainelDoContato";
import { TopoDasConversas } from "./TopoDasConversas";

export type ModoDoCentro = "conversa" | "vazio" | "nova";

/**
 * A TELA DE CONVERSAS DA CASCA (fork Escale, Fase 3A; A1–A13, A15, D1–D11).
 *
 * Três colunas fixas (320 | 1fr | 384, c01), a fila com os presets da Clint
 * sobre a rota do original, o centro (vazio, sem canal, nova conversa ou a
 * conversa aberta) e o painel direito. O preset (`?v=`) e a ordem (`?o=`)
 * vivem na URL; a conversa aberta em `?id=`, como no original; a busca e o
 * "Personalizar visualização" são estado da tela; o modo espião é da sessão.
 */
export function ConversasDaCasca({
  initialSelectedId = null,
  rascunho = null,
}: {
  initialSelectedId?: string | null;
  rascunho?: AvisoDeRascunho | null;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.orgId ?? null;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const preset = presetDaUrl(searchParams.get(PARAM_PRESET));
  const ordem = ordemDaUrl(searchParams.get(PARAM_ORDEM));
  const idNaUrl = searchParams.get("id");
  const [busca, setBusca] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? idNaUrl);
  const [modo, setModo] = useState<Exclude<ModoDoCentro, "conversa">>("vazio");
  const [personalizando, setPersonalizando] = useState(false);
  const [fichaAberta, setFichaAberta] = useState(false);
  const [espiao, mudarEspiao] = useModoEspiao();
  const ultimoIdNaUrl = useRef(idNaUrl);

  // O histórico do navegador também troca a conversa, sem recarregar a página.
  useEffect(() => {
    if (ultimoIdNaUrl.current === idNaUrl) return;
    ultimoIdNaUrl.current = idNaUrl;
    setSelectedId(idNaUrl);
  }, [idNaUrl]);

  const mudarNaUrl = useCallback(
    (chave: string, valor: string | null, padrao: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (valor && valor !== padrao) params.set(chave, valor);
      else params.delete(chave);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const mudarPreset = useCallback((p: Preset) => mudarNaUrl(PARAM_PRESET, p, PRESET_PADRAO), [mudarNaUrl]);
  const mudarOrdem = useCallback((o: Ordem) => mudarNaUrl(PARAM_ORDEM, o, ORDEM_PADRAO), [mudarNaUrl]);

  const filtros: FiltrosDaFila = useMemo(
    () => ({
      ...filtrosDoPreset(preset),
      ...(ordem === "espera" ? { ordem } : {}),
      ...(buscaValeConsulta(busca) ? { search: busca } : {}),
    }),
    [preset, ordem, busca],
  );

  const fila = useFilaDeConversas(filtros, orgId);
  const itens = useMemo(
    () => (fila.data?.pages.flatMap((p) => p.data) ?? []) as ConversationWithContact[],
    [fila.data],
  );
  const naLista = useMemo(() => itens.find((c) => c.id === selectedId) ?? null, [itens, selectedId]);
  const precisaBuscar = !!selectedId && !naLista;
  const unica = useConversation(selectedId, precisaBuscar);
  const conversa: ConversationWithContact | null = naLista ?? unica.data ?? null;
  const naoEncontrada = precisaBuscar && !unica.isPending && !unica.data && isNotFound(unica.error);
  // A15: a conversa aberta que não casa com o filtro fica fixada no topo.
  const fixada = !fila.isLoading && !naLista && unica.data ? unica.data : null;

  const canais = useChannelSessions();
  const semCanal = !canais.isLoading && (canais.data ?? []).length === 0;
  const preferencias = usePreferenciasDeConversas();

  // A9: no modo espião, abrir a conversa não zera o contador.
  useMarkAsRead(espiao ? null : (conversa?.id ?? null), conversa?.unread_count_for_assignee ?? 0);

  const selecionar = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      if (id) setModo("vazio");
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("id", id);
      else params.delete("id");
      params.delete("rascunho");
      const query = params.toString();
      window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams],
  );
  const abrirNova = useCallback(() => {
    setPersonalizando(false);
    setModo("nova");
    selecionar(null);
  }, [selecionar]);

  const modoDoCentro: ModoDoCentro = conversa ? "conversa" : modo;
  const colunas = colunasDoCelular(Boolean(selectedId));

  return (
    <OpenConversationProvider conversationId={selectedId}>
      <div
        className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] w-full flex-col"
        data-realtime-status={fila.realtimeStatus}
      >
        <TopoDasConversas aoNovaConversa={abrirNova} novaAberta={modoDoCentro === "nova"} />
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_384px]">
          <div className={cn("h-full min-h-0 flex-col border-r border-casca-borda md:flex", colunas.lista)}>
            <BarraDaFila
              busca={busca}
              aoBuscar={setBusca}
              preset={preset}
              aoMudarPreset={mudarPreset}
              ordem={ordem}
              aoMudarOrdem={mudarOrdem}
              espiao={espiao}
              aoMudarEspiao={mudarEspiao}
              personalizando={personalizando}
              aoPersonalizar={() => setPersonalizando((v) => !v)}
              visualizacaoForaDoPadrao={preferencias.data.visualizacao !== undefined && !ehPadrao(preferencias.data.visualizacao)}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <ListaDaFila
                fila={fila}
                itens={itens}
                fixada={fixada}
                selectedId={selectedId}
                aoSelecionar={selecionar}
                aoSoltarFixada={() => selecionar(null)}
                temFiltro={preset !== PRESET_PADRAO || buscaValeConsulta(busca)}
                aoIniciar={abrirNova}
                visualizacao={preferencias.data.visualizacao}
              />
            </div>
          </div>

          <div className={cn("relative h-full min-h-0 min-w-0 flex-col md:flex", colunas.conversa)}>
            {espiao ? <FaixaDoModoEspiao aoDesativar={() => mudarEspiao(false)} /> : null}
            {personalizando ? (
              <PainelPersonalizarVisualizacao
                visualizacao={preferencias.data.visualizacao}
                aoFechar={() => setPersonalizando(false)}
              />
            ) : null}
            <div className="min-h-0 flex-1">
              {modoDoCentro === "conversa" && conversa ? (
                <ConversaAberta
                  conversa={conversa}
                  rascunho={rascunho}
                  aoAbrirConversa={selecionar}
                  aoAbrirFicha={() => setFichaAberta(true)}
                />
              ) : modoDoCentro === "nova" ? (
                <NovaConversa aoAbrirConversa={selecionar} aoCancelar={() => setModo("vazio")} />
              ) : naoEncontrada ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-casca-suave">
                  {t("Conversa não encontrada ou fora do seu acesso.")}
                </div>
              ) : (
                <CentroVazio semCanal={semCanal} aoIniciar={abrirNova} />
              )}
            </div>
          </div>

          <div className="hidden h-full min-h-0 border-l border-casca-borda xl:block">
            <PainelDoContato conversa={conversa} aoAbrirConversa={selecionar} />
          </div>
          <Sheet open={fichaAberta} onOpenChange={setFichaAberta}>
            <SheetContent side="right" className="w-[min(24rem,90vw)] overflow-y-auto p-0">
              <SheetTitle className="sr-only">{t("Ficha do contato")}</SheetTitle>
              <PainelDoContato conversa={conversa} aoAbrirConversa={selecionar} />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </OpenConversationProvider>
  );
}

function ehPadrao(v: unknown): boolean {
  // Importado aqui para não puxar o zod para o primeiro render; a regra é a de visualizacao.ts.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("@/lib/escale/conversas/visualizacao") as typeof import("@/lib/escale/conversas/visualizacao")).ehVisualizacaoPadrao(v as never);
}
```

Troque a função `ehPadrao` do fim por um import normal no topo (`import { ehVisualizacaoPadrao } from "@/lib/escale/conversas/visualizacao";`) e use `!ehVisualizacaoPadrao(preferencias.data.visualizacao)` na prop — o `require` acima só existe para deixar claro de onde a regra vem; não o mantenha.

`NovaConversa`, `BarraDaFila`, `ListaDaFila`, `PainelPersonalizarVisualizacao` e `PainelDoContato` nascem nas Tasks 6, 7 e 8. Para este teste passar agora, crie os quatro arquivos com um esqueleto mínimo que será substituído:

- `components/escale/conversas/centro/NovaConversa.tsx`: `export function NovaConversa(_: { aoAbrirConversa: (id: string | null) => void; aoCancelar: () => void }) { const t = useT(); return <p className="p-6 text-[14px] font-semibold text-casca-texto">{t("Crie ou selecione um contato")}</p>; }`
- `components/escale/conversas/fila/BarraDaFila.tsx`, `ListaDaFila.tsx`, `PainelPersonalizarVisualizacao.tsx` e `components/escale/conversas/painel/PainelDoContato.tsx`: componentes que recebem as props acima e devolvem `null` (tipos exatamente como as chamadas acima; a Task 6 e a 8 os preenchem).

- [ ] **Step 7: O encaixe da página**

Em `app/app/inbox/page.tsx`:

```tsx
// no topo, junto dos imports:
import { cookies } from "next/headers";
import { ConversasDaCasca } from "@/components/escale/conversas/ConversasDaCasca";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
```

e troque a última linha (`return <InboxLayout initialSelectedId={id ?? null} rascunho={avisoDeRascunho} />;`) por:

```tsx
  // FORK ESCALE · Fase 3A: com a casca ligada, a tela de Conversas da Clint;
  // sem ela, o Inbox original, intacto (o mesmo encaixe de /app/contacts).
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    return <ConversasDaCasca initialSelectedId={id ?? null} rascunho={avisoDeRascunho} />;
  }
  return <InboxLayout initialSelectedId={id ?? null} rascunho={avisoDeRascunho} />;
```

Se a cerca `escale-casca-v2-original-intacto` reprovar a página por importar `@/components/escale/`, acrescente `app/app/inbox/page.tsx` à lista de exceções da cerca ao lado de `app/app/contacts/page.tsx` (é um encaixe de página, como a 2A).

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-conversas-casca.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts $(ls tests/unit | grep -E 'escale-casca-v2-original-intacto|escale-tema' | sed 's|^|tests/unit/|' | tr '\n' ' ') && corepack pnpm prettier --write components/escale/conversas tests/unit/escale-conversas-casca.test.tsx && corepack pnpm eslint components/escale/conversas app/app/inbox/page.tsx lib/ui/icons-da-casca.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add app/app/inbox/page.tsx components/escale/conversas lib/ui/icons-da-casca.ts app/escale-tema.css app/globals.css tests/unit/escale-conversas-casca.test.tsx
git commit -m "feat(escale): a tela de Conversas da casca — página, três colunas, centro vazio, modo espião (Fase 3A)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 6: A fila — busca, presets, ordem, ⋮, a linha da Clint, a fixada e "Personalizar visualização"

**Files:**
- Create: `components/escale/conversas/fila/MenuDePresets.tsx`, `components/escale/conversas/fila/MenuDeOrdem.tsx`, `components/escale/conversas/fila/MenuMaisDaFila.tsx`, `components/escale/conversas/fila/LinhaDaFila.tsx`, `components/escale/conversas/fila/FotoDaConversa.tsx`, `tests/unit/escale-fila-da-casca.test.tsx`
- Modify (substituir os esqueletos): `components/escale/conversas/fila/BarraDaFila.tsx`, `ListaDaFila.tsx`, `PainelPersonalizarVisualizacao.tsx`

**Interfaces:**
- Consumes: `useConversationCounts`, `useGravarPreferencia`, `ChannelLogo`, `ChipDeEtiqueta`, `rotuloDoContato`, `corDoAvatar`, `inicialDoNome`, `PainelSuspenso`, `Popover`, `InterruptorDaCasca`, `SeletorDaCasca`, `SeloDaCasca`, `CAIXA_DO_MENU`/`ITEM_DO_MENU`, `VazioDaCasca`, as libs da Task 1.
- Produces:
  - `BarraDaFila({ busca, aoBuscar, preset, aoMudarPreset, ordem, aoMudarOrdem, espiao, aoMudarEspiao, personalizando, aoPersonalizar, visualizacaoForaDoPadrao })`.
  - `ListaDaFila({ fila, itens, fixada, selectedId, aoSelecionar, aoSoltarFixada, temFiltro, aoIniciar, visualizacao })`.
  - `LinhaDaFila({ conversa, selecionada, fixada?, aoSelecionar, aoSoltar?, visualizacao, agora })`.
  - `FotoDaConversa({ conversa, tamanho? })` (foto redonda com o selo do canal).
  - `PainelPersonalizarVisualizacao({ visualizacao, aoFechar })`.

**Detalhes visuais:** as medidas de "Busca da fila", "Barra da fila", "Linha da fila", "Conversa fixada", "Menu de presets", "Menu de ordem", "Menu ⋮", "Personalizar visualização" e "Fila vazia com filtro" da tabela de medidas.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-fila-da-casca.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { VISUALIZACAO_PADRAO } from "@/lib/escale/conversas/visualizacao";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "org1", role: "agent" }, user: { id: "u1" } }),
}));
vi.mock("@/hooks/inbox/useConversationCounts", () => ({
  useConversationCounts: () => ({ data: { all: 120, fila: 0, unassigned: 0, mine: 0 } }),
}));
const gravar = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/escale/usePreferenciasDeConversas", () => ({
  useGravarPreferencia: () => ({ mutate: gravar, isPending: false }),
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({ useCorDaEtiqueta: () => null }));

import { BarraDaFila } from "@/components/escale/conversas/fila/BarraDaFila";
import { LinhaDaFila } from "@/components/escale/conversas/fila/LinhaDaFila";
import { ListaDaFila } from "@/components/escale/conversas/fila/ListaDaFila";
import { PainelPersonalizarVisualizacao } from "@/components/escale/conversas/fila/PainelPersonalizarVisualizacao";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const AGORA = new Date("2026-10-18T15:00:00-03:00");
const conversa = (extra: Partial<ConversationWithContact> = {}): ConversationWithContact =>
  ({
    id: "c1",
    status: "open",
    assigned_to_user_id: null,
    assigned_to_user_name: null,
    last_inbound_at: "2026-10-18T17:50:00Z",
    last_outbound_at: "2026-10-18T17:00:00Z",
    last_message_at: "2026-10-18T17:50:00Z",
    last_message_preview: "Qual a previsão de terminar?",
    unread_count_for_assignee: 3,
    snooze_until: null,
    is_group: false,
    contacts: { id: "ct1", display_name: "Adivane Antoniazzi", name: null, phone_number: "+5562999990000", tags: ["vip", "obra"], is_blocked: false, is_anonymized: false, is_personal: false },
    channel_sessions: { provider: "waha", phone_number: null, display_name: null },
    ...extra,
  }) as unknown as ConversationWithContact;

const barra = (extra: Partial<Parameters<typeof BarraDaFila>[0]> = {}) => (
  <BarraDaFila
    busca=""
    aoBuscar={vi.fn()}
    preset="todos"
    aoMudarPreset={vi.fn()}
    ordem="interacao"
    aoMudarOrdem={vi.fn()}
    espiao={false}
    aoMudarEspiao={vi.fn()}
    personalizando={false}
    aoPersonalizar={vi.fn()}
    visualizacaoForaDoPadrao={false}
    {...extra}
  />
);

describe("BarraDaFila (c01, c31, c43, c22)", () => {
  it("busca, o botão do preset, o funil (Em breve), a ordem e o ⋮", () => {
    const aoMudarPreset = vi.fn();
    envolver(barra({ aoMudarPreset }));
    expect(screen.getByPlaceholderText("Pesquisar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtros" })).toHaveAttribute("title", "Em breve");
    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    const menu = screen.getByRole("menu", { name: "Filtrar por" });
    expect(within(menu).getByText("Status")).toBeInTheDocument();
    expect(within(menu).getByText("Salvos")).toBeInTheDocument();
    expect(within(menu).getByText("99+")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Criar filtro/ })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(within(menu).getByRole("menuitem", { name: /Em espera/ }));
    expect(aoMudarPreset).toHaveBeenCalledWith("em_espera");
  });

  it("a ordem e o ⋮ com modo espião e Personalizar visualização (ponto roxo fora do padrão)", () => {
    const aoMudarOrdem = vi.fn();
    const aoMudarEspiao = vi.fn();
    envolver(barra({ aoMudarOrdem, aoMudarEspiao, visualizacaoForaDoPadrao: true }));
    fireEvent.click(screen.getByRole("button", { name: "Ordenar por" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Esperando mais tempo" }));
    expect(aoMudarOrdem).toHaveBeenCalledWith("espera");
    fireEvent.click(screen.getByRole("button", { name: "Mais" }));
    expect(screen.getByRole("menuitem", { name: "Selecionar" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Ativar modo espião" }));
    expect(aoMudarEspiao).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Mais" }));
    expect(screen.getByTestId("ponto-fora-do-padrao")).toBeInTheDocument();
  });
});

describe("LinhaDaFila (c01, c47, c54)", () => {
  it("nome, prévia, hora, 'sem atendente', não lidas; ✓✓ quando a última foi nossa", () => {
    const { rerender } = envolver(
      <LinhaDaFila conversa={conversa()} selecionada={false} aoSelecionar={vi.fn()} visualizacao={VISUALIZACAO_PADRAO} agora={AGORA} />,
    );
    expect(screen.getByText("Adivane Antoniazzi")).toBeInTheDocument();
    expect(screen.getByText("Qual a previsão de terminar?")).toBeInTheDocument();
    expect(screen.getByText("14:50")).toBeInTheDocument();
    expect(screen.getByTitle("Sem atendente")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByTestId("enviada")).not.toBeInTheDocument();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <LinhaDaFila conversa={conversa({ last_outbound_at: "2026-10-18T17:55:00Z", assigned_to_user_name: "Camilly" })} selecionada={false} aoSelecionar={vi.fn()} visualizacao={VISUALIZACAO_PADRAO} agora={AGORA} />
      </QueryClientProvider>,
    );
    expect(screen.getByTestId("enviada")).toBeInTheDocument();
    expect(screen.getByTitle("Atendente: Camilly")).toHaveTextContent("C");
  });

  it("a segunda linha: tempo sem resposta com a cor, e as tags", () => {
    const v = { ...VISUALIZACAO_PADRAO, campos: { ...VISUALIZACAO_PADRAO.campos, tempoSemResposta: true, tags: true } };
    envolver(
      <LinhaDaFila conversa={conversa({ last_inbound_at: "2026-10-18T12:00:00Z" })} selecionada={false} aoSelecionar={vi.fn()} visualizacao={v} agora={AGORA} />,
    );
    const espera = screen.getByTitle("Aguardando resposta há 6h");
    expect(espera).toHaveTextContent("6h");
    expect(espera).toHaveAttribute("data-cor", "vermelho");
    expect(screen.getByText("vip")).toBeInTheDocument();
  });

  it("fixada: o X solta e o alfinete explica", () => {
    const aoSoltar = vi.fn();
    envolver(
      <LinhaDaFila conversa={conversa()} selecionada fixada aoSelecionar={vi.fn()} aoSoltar={aoSoltar} visualizacao={VISUALIZACAO_PADRAO} agora={AGORA} />,
    );
    expect(screen.getByTitle("Esta é a conversa atual e ela não corresponde a visualização dos filtros.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(aoSoltar).toHaveBeenCalled();
  });
});

describe("ListaDaFila (c75)", () => {
  const fila = { isLoading: false, isError: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn(), refetch: vi.fn() };
  it("carregando, vazia com filtro, e a fixada no topo", () => {
    const { rerender } = envolver(
      <ListaDaFila fila={{ ...fila, isLoading: true } as never} itens={[]} fixada={null} selectedId={null} aoSelecionar={vi.fn()} aoSoltarFixada={vi.fn()} temFiltro={false} aoIniciar={vi.fn()} visualizacao={VISUALIZACAO_PADRAO} />,
    );
    expect(screen.getByText("Carregando mensagens...")).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ListaDaFila fila={fila as never} itens={[]} fixada={null} selectedId={null} aoSelecionar={vi.fn()} aoSoltarFixada={vi.fn()} temFiltro aoIniciar={vi.fn()} visualizacao={VISUALIZACAO_PADRAO} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Nenhuma conversa nos filtros")).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ListaDaFila fila={fila as never} itens={[conversa({ id: "c2" })]} fixada={conversa({ id: "c1" })} selectedId="c1" aoSelecionar={vi.fn()} aoSoltarFixada={vi.fn()} temFiltro aoIniciar={vi.fn()} visualizacao={VISUALIZACAO_PADRAO} />
      </QueryClientProvider>,
    );
    const linhas = screen.getAllByRole("button", { name: /Adivane/ });
    expect(linhas[0]).toHaveAttribute("data-fixada", "");
  });
});

describe("PainelPersonalizarVisualizacao (c44–c46)", () => {
  it("prévia, 7 toggles, o limite de 5, os limites de alerta e Restaurar padrão", () => {
    const cinco = { ...VISUALIZACAO_PADRAO, campos: { ...VISUALIZACAO_PADRAO.campos, setor: true, tempoSemResposta: true, mensagensAgendadas: true } };
    envolver(<PainelPersonalizarVisualizacao visualizacao={cinco} aoFechar={vi.fn()} />);
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("5 de 5 campos ativos")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Tags" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Empresa" })).toHaveAttribute("title", "Em breve");
    fireEvent.click(screen.getByRole("switch", { name: "Atendente" }));
    expect(gravar).toHaveBeenLastCalledWith({ chave: "visualizacao", valor: { ...cinco, campos: { ...cinco.campos, atendente: false } } });
    fireEvent.click(screen.getByRole("button", { name: "Limites de alerta" }));
    expect(screen.getByLabelText("Amarelo a partir de")).toHaveValue(1);
    fireEvent.change(screen.getByLabelText("Vermelho a partir de"), { target: { value: "8" } });
    expect(gravar).toHaveBeenLastCalledWith({ chave: "visualizacao", valor: { ...cinco, limites: { ...cinco.limites, vermelho: { valor: 8, unidade: "horas" } } } });
    fireEvent.click(screen.getByRole("button", { name: "Restaurar padrão" }));
    expect(gravar).toHaveBeenLastCalledWith({ chave: "visualizacao", valor: VISUALIZACAO_PADRAO });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-fila-da-casca.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Os três menus**

Create `components/escale/conversas/fila/MenuDePresets.tsx`:

```tsx
"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useState } from "react";

import { SeloDaCasca } from "@/components/escale/menu/SeloDaCasca";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useConversationCounts } from "@/hooks/inbox/useConversationCounts";
import {
  PRESETS_DE_STATUS,
  ROTULO_DO_PRESET,
  type Preset,
} from "@/lib/escale/conversas/presets";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Plus,
  SlidersHorizontal,
  User,
  Users,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const ICONE: Record<Preset, LucideIcon> = {
  todos: SlidersHorizontal,
  nao_lidas: MessageSquare,
  meus_em_aberto: User,
  em_aberto: Users,
  em_espera: Clock,
  fechadas: Archive,
};

const CABECALHO = "px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase";

/** O botão "Todos ▾" e o menu de presets (02-006, c31). "Salvos" chega na 3D. */
export function MenuDePresets({ preset, aoMudar }: { preset: Preset; aoMudar: (p: Preset) => void }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const [aberto, setAberto] = useState(false);
  const naoLidas = useConversationCounts(activeOrg?.orgId ?? null, { unread: true }).data?.all ?? 0;
  const Icone = ICONE[preset];

  const item = (p: Preset) => {
    const Ic = ICONE[p];
    const atual = p === preset;
    return (
      <MenuPrimitive.Item
        key={p}
        className={cn(ITEM_DO_MENU, "h-9 text-[12px]", atual && "text-casca-marca")}
        onSelect={() => aoMudar(p)}
      >
        <Ic size={16} aria-hidden />
        <span className="flex-1">{t(ROTULO_DO_PRESET[p])}</span>
        {p === "nao_lidas" && naoLidas > 0 ? (
          <SeloDaCasca valor={naoLidas} limite={99} rotulo={t("Não lidas")} className="h-4 min-w-4 px-1.5 text-[10px]" />
        ) : null}
        {atual ? <Check size={14} aria-hidden /> : null}
      </MenuPrimitive.Item>
    );
  };

  return (
    <DropdownMenu modal={false} open={aberto} onOpenChange={setAberto}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-casca-gatilho border px-2.5 text-[12px] font-medium text-casca-texto",
            aberto ? "border-casca-marca" : "border-casca-borda hover:bg-casca-raia",
          )}
        >
          <Icone size={14} aria-hidden className="text-casca-suave" />
          {t(ROTULO_DO_PRESET[preset])}
          {aberto ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
        </button>
      </DropdownMenuTrigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align="start"
          sideOffset={6}
          aria-label={t("Filtrar por")}
          className={cn(CAIXA_DO_MENU, "w-[224px]")}
        >
          {item("todos")}
          {item("nao_lidas")}
          <p className={CABECALHO}>{t("Status")}</p>
          {PRESETS_DE_STATUS.map(item)}
          <p className={CABECALHO}>{t("Salvos")}</p>
          <MenuPrimitive.Item
            disabled
            title={t("Em breve")}
            className={cn(ITEM_DO_MENU, "h-9 text-[12px] text-casca-marca disabled:text-casca-marca disabled:opacity-60")}
          >
            <Plus size={16} aria-hidden />
            {t("Criar filtro")}
          </MenuPrimitive.Item>
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </DropdownMenu>
  );
}
```

Create `components/escale/conversas/fila/MenuDeOrdem.tsx`:

```tsx
"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useState } from "react";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { ORDENS, ROTULO_DA_ORDEM, type Ordem } from "@/lib/escale/conversas/ordem";
import { ArrowDownUp, Check } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export const BOTAO_DA_BARRA =
  "grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50";

/** "Ordenar por" (c43): Última interação ✓ / Esperando mais tempo. */
export function MenuDeOrdem({ ordem, aoMudar }: { ordem: Ordem; aoMudar: (o: Ordem) => void }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <DropdownMenu modal={false} open={aberto} onOpenChange={setAberto}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("Ordenar por")}
          title={t("Ordenar por")}
          className={cn(BOTAO_DA_BARRA, (aberto || ordem !== "interacao") && "bg-casca-marca-suave text-casca-marca")}
        >
          <ArrowDownUp size={16} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content align="end" sideOffset={6} className={cn(CAIXA_DO_MENU, "w-[160px]")}>
          {ORDENS.map((o) => (
            <MenuPrimitive.Item
              key={o}
              className={cn(ITEM_DO_MENU, "h-9 text-[12px]", o === ordem && "text-casca-marca")}
              onSelect={() => aoMudar(o)}
            >
              <span className="flex-1">{t(ROTULO_DA_ORDEM[o])}</span>
              {o === ordem ? <Check size={14} aria-hidden /> : null}
            </MenuPrimitive.Item>
          ))}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </DropdownMenu>
  );
}
```

Create `components/escale/conversas/fila/MenuMaisDaFila.tsx`:

```tsx
"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { EllipsisVertical, Glasses, ListChecks, SlidersHorizontal } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BOTAO_DA_BARRA } from "./MenuDeOrdem";

/** O ⋮ "Mais" (c22, c24, c81): Selecionar (3D), modo espião, Personalizar visualização. */
export function MenuMaisDaFila({
  espiao,
  aoMudarEspiao,
  aoPersonalizar,
  foraDoPadrao,
}: {
  espiao: boolean;
  aoMudarEspiao: (v: boolean) => void;
  aoPersonalizar: () => void;
  foraDoPadrao: boolean;
}) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={t("Mais")} title={t("Mais")} className={BOTAO_DA_BARRA}>
          <EllipsisVertical size={16} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content align="end" sideOffset={6} className={cn(CAIXA_DO_MENU, "w-[190px]")}>
          <MenuPrimitive.Item disabled title={t("Em breve")} className={cn(ITEM_DO_MENU, "h-9 text-[12px]")}>
            <ListChecks size={16} aria-hidden />
            {t("Selecionar")}
          </MenuPrimitive.Item>
          <MenuPrimitive.Item className={cn(ITEM_DO_MENU, "h-9 text-[12px]")} onSelect={() => aoMudarEspiao(!espiao)}>
            <Glasses size={16} aria-hidden />
            {espiao ? t("Desativar modo espião") : t("Ativar modo espião")}
          </MenuPrimitive.Item>
          <MenuPrimitive.Item className={cn(ITEM_DO_MENU, "h-9 text-[12px]")} onSelect={aoPersonalizar}>
            <SlidersHorizontal size={16} aria-hidden />
            <span className="flex-1">{t("Personalizar visualização")}</span>
            {foraDoPadrao ? (
              <span data-testid="ponto-fora-do-padrao" aria-hidden className="size-1.5 rounded-full bg-casca-marca" />
            ) : null}
          </MenuPrimitive.Item>
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: A barra**

Replace `components/escale/conversas/fila/BarraDaFila.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import type { Ordem } from "@/lib/escale/conversas/ordem";
import type { Preset } from "@/lib/escale/conversas/presets";
import { Funnel, Search } from "@/lib/ui/icons-da-casca";

import { MenuDeOrdem, BOTAO_DA_BARRA } from "./MenuDeOrdem";
import { MenuDePresets } from "./MenuDePresets";
import { MenuMaisDaFila } from "./MenuMaisDaFila";

/** A busca e a barra da fila (c01): preset à esquerda; funil (3D), ordem e ⋮ à direita. */
export function BarraDaFila({
  busca,
  aoBuscar,
  preset,
  aoMudarPreset,
  ordem,
  aoMudarOrdem,
  espiao,
  aoMudarEspiao,
  personalizando,
  aoPersonalizar,
  visualizacaoForaDoPadrao,
}: {
  busca: string;
  aoBuscar: (v: string) => void;
  preset: Preset;
  aoMudarPreset: (p: Preset) => void;
  ordem: Ordem;
  aoMudarOrdem: (o: Ordem) => void;
  espiao: boolean;
  aoMudarEspiao: (v: boolean) => void;
  personalizando: boolean;
  aoPersonalizar: () => void;
  visualizacaoForaDoPadrao: boolean;
}) {
  const t = useT();
  return (
    <div className="shrink-0 px-3 pt-3 pb-4">
      <label className="relative block">
        <input
          type="search"
          value={busca}
          onChange={(e) => aoBuscar(e.target.value)}
          placeholder={t("Pesquisar")}
          aria-label={t("Pesquisar")}
          className="h-8 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-3 text-[12px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
        />
        <Search size={16} aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
      </label>
      <div className="mt-5 flex h-8 items-center justify-between">
        <MenuDePresets preset={preset} aoMudar={aoMudarPreset} />
        <div className="flex items-center gap-2">
          <button type="button" disabled title={t("Em breve")} aria-label={t("Filtros")} className={BOTAO_DA_BARRA}>
            <Funnel size={16} aria-hidden />
          </button>
          <MenuDeOrdem ordem={ordem} aoMudar={aoMudarOrdem} />
          <MenuMaisDaFila
            espiao={espiao}
            aoMudarEspiao={aoMudarEspiao}
            aoPersonalizar={aoPersonalizar}
            foraDoPadrao={visualizacaoForaDoPadrao}
          />
        </div>
      </div>
      {personalizando ? <span className="sr-only">{t("Personalizar visualização")}</span> : null}
    </div>
  );
}
```

- [ ] **Step 5: A foto e a linha**

Create `components/escale/conversas/fila/FotoDaConversa.tsx`:

```tsx
"use client";
import { useState } from "react";

import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";
import { cn } from "@/lib/utils";

const TAMANHO = { linha: "size-11 text-[15px]", secao: "size-9 text-[13px]", topo: "size-10 text-[14px]" } as const;

/** A foto redonda do contato com o selo do canal no canto (c01). */
export function FotoDaConversa({
  conversa,
  tamanho = "linha",
  className,
}: {
  conversa: ConversationWithContact;
  tamanho?: keyof typeof TAMANHO;
  className?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  const c = conversa.contacts;
  const nome = c?.display_name ?? c?.name ?? "";
  const temFoto = Boolean(c?.avatar_storage_path) && !falhou && Boolean(c?.id);
  return (
    <span className={cn("relative shrink-0", className)}>
      {temFoto ? (
        <img
          src={`/api/v1/contacts/${c!.id}/avatar`}
          alt=""
          className={cn("rounded-full object-cover", TAMANHO[tamanho])}
          onError={() => setFalhou(true)}
        />
      ) : (
        <span
          aria-hidden
          className={cn("grid place-items-center rounded-full font-medium text-white", TAMANHO[tamanho])}
          style={{ backgroundColor: corDoAvatar(c?.id ?? conversa.id) }}
        >
          {inicialDoNome(nome)}
        </span>
      )}
      <span className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-surface">
        <ChannelLogo channel={conversa.channel_sessions} size={12} />
      </span>
    </span>
  );
}
```

Create `components/escale/conversas/fila/LinhaDaFila.tsx`:

```tsx
"use client";
import { ChipDeEtiqueta } from "@/components/tags/ChipDeEtiqueta";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import {
  aguardandoHa,
  horaDaLinha,
  inicialDoAtendente,
  previaDaLinha,
  ultimaFoiNossa,
} from "@/lib/escale/conversas/linha";
import { corDaEspera, textoDaEspera, type Visualizacao } from "@/lib/escale/conversas/visualizacao";
import { corDoAvatar } from "@/lib/escale/quadro/aparencia";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import { CheckCheck, ChevronDown, Pin, UserX, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FotoDaConversa } from "./FotoDaConversa";

const COR_DA_ESPERA = {
  cinza: "text-casca-suave",
  amarelo: "text-casca-atencao",
  vermelho: "font-semibold text-casca-alerta",
} as const;

/**
 * A LINHA DA FILA DA CLINT (fork Escale, Fase 3A; A7, A15; c01, c47, c54).
 * A primeira linha é sempre a mesma; a segunda aparece com o que a pessoa
 * ligou em "Personalizar visualização". O setor (3C) e "⏱ n" (3B) entram
 * depois no mesmo lugar.
 */
export function LinhaDaFila({
  conversa,
  selecionada,
  fixada = false,
  aoSelecionar,
  aoSoltar,
  visualizacao,
  agora,
}: {
  conversa: ConversationWithContact;
  selecionada: boolean;
  fixada?: boolean;
  aoSelecionar: (id: string) => void;
  aoSoltar?: () => void;
  visualizacao: Visualizacao;
  agora: Date;
}) {
  const t = useT();
  const nome = rotuloDoContato(conversa.contacts ?? null, t);
  const naoLidas = conversa.unread_count_for_assignee ?? 0;
  const atendente = conversa.assigned_to_user_name ?? null;
  const espera = visualizacao.campos.tempoSemResposta ? aguardandoHa(conversa, agora) : null;
  const tags = visualizacao.campos.tags ? (conversa.contacts?.tags ?? []).slice(0, 3) : [];
  const segundaLinha = espera !== null || tags.length > 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => aoSelecionar(conversa.id)}
        aria-current={selecionada ? "true" : undefined}
        data-fixada={fixada ? "" : undefined}
        className={cn(
          "group flex w-full items-start gap-3 border-b border-casca-borda px-3 text-left",
          segundaLinha ? "min-h-24 py-3" : "h-[72px] py-3.5",
          fixada ? "bg-casca-fixada" : selecionada ? "bg-casca-raia" : "hover:bg-casca-raia",
          selecionada && !fixada && "shadow-[inset_3px_0_0_var(--color-casca-marca)]",
        )}
      >
        <FotoDaConversa conversa={conversa} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-medium text-casca-texto">{nome}</span>
            {!fixada ? (
              <span className="shrink-0 text-[11px] text-casca-meta">{horaDaLinha(conversa.last_message_at, agora, t)}</span>
            ) : null}
          </span>
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1 text-[12px] text-casca-suave">
              {ultimaFoiNossa(conversa) ? <CheckCheck size={14} aria-hidden data-testid="enviada" className="shrink-0" /> : null}
              <span className="truncate">{previaDaLinha(conversa, t)}</span>
            </span>
            {!fixada ? (
              <span className="flex shrink-0 items-center gap-1.5">
                {visualizacao.campos.atendente ? (
                  atendente ? (
                    <span
                      title={`${t("Atendente:")} ${atendente}`}
                      className="grid size-5 place-items-center rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: corDoAvatar(conversa.assigned_to_user_id ?? atendente) }}
                    >
                      {inicialDoAtendente(atendente)}
                    </span>
                  ) : (
                    <span title={t("Sem atendente")} className="grid size-5 place-items-center rounded-full bg-casca-raia text-casca-meta">
                      <UserX size={12} aria-hidden />
                    </span>
                  )
                ) : null}
                {naoLidas > 0 ? (
                  <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-casca-novo px-1 text-[10px] font-semibold text-white tabular-nums">
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </span>
                ) : null}
                <ChevronDown size={14} aria-hidden className="text-casca-suave opacity-0 group-hover:opacity-100" />
              </span>
            ) : null}
          </span>
          {segundaLinha ? (
            <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {espera !== null ? (
                <span
                  data-cor={corDaEspera(espera, visualizacao)}
                  title={`${t("Aguardando resposta há")} ${textoDaEspera(espera, t)}`}
                  className={cn("text-[11px]", COR_DA_ESPERA[corDaEspera(espera, visualizacao)])}
                >
                  {textoDaEspera(espera, t)}
                </span>
              ) : null}
              {tags.map((tag) => (
                <ChipDeEtiqueta key={tag} tag={tag} className="h-4 px-1.5 text-[10px]" />
              ))}
            </span>
          ) : null}
        </span>
      </button>
      {fixada ? (
        <>
          <button
            type="button"
            aria-label={t("Remover")}
            title={t("Remover")}
            onClick={aoSoltar}
            className="absolute top-2 right-2 grid size-5 place-items-center rounded-casca-gatilho text-casca-alerta hover:bg-surface"
          >
            <X size={14} aria-hidden />
          </button>
          <span
            role="img"
            aria-label={t("Esta é a conversa atual e ela não corresponde a visualização dos filtros.")}
            title={t("Esta é a conversa atual e ela não corresponde a visualização dos filtros.")}
            className="absolute right-2 bottom-2 text-casca-marca"
          >
            <Pin size={14} aria-hidden />
          </span>
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: A lista**

Replace `components/escale/conversas/fila/ListaDaFila.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import type { Visualizacao } from "@/lib/escale/conversas/visualizacao";
import { Funnel, Loader2, MessagesSquare, Pencil } from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "../centro/VazioDaCasca";
import { LinhaDaFila } from "./LinhaDaFila";

interface FilaLeve {
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
}

/** As linhas (com a fixada no topo), "Carregando mensagens...", os vazios e "Carregar mais". */
export function ListaDaFila({
  fila,
  itens,
  fixada,
  selectedId,
  aoSelecionar,
  aoSoltarFixada,
  temFiltro,
  aoIniciar,
  visualizacao,
}: {
  fila: FilaLeve;
  itens: ConversationWithContact[];
  fixada: ConversationWithContact | null;
  selectedId: string | null;
  aoSelecionar: (id: string) => void;
  aoSoltarFixada: () => void;
  temFiltro: boolean;
  aoIniciar: () => void;
  visualizacao: Visualizacao;
}) {
  const t = useT();
  // O relógio das linhas: o tempo sem resposta anda sozinho com a aba aberta.
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (fila.isLoading && itens.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-[12px] text-casca-suave">
        <Loader2 size={20} aria-hidden className="animate-spin text-casca-marca" />
        {t("Carregando mensagens...")}
      </div>
    );
  }
  if (fila.isError && itens.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[12px] text-casca-suave">
        {t("Erro ao carregar conversas.")}
        <BotaoDaCasca variante="texto" tamanho="sm" className="border border-casca-borda" onClick={() => fila.refetch()}>
          {t("Tentar novamente")}
        </BotaoDaCasca>
      </div>
    );
  }
  const botaoIniciar = (
    <BotaoDaCasca variante="texto" tamanho="md" className="border border-casca-borda text-casca-texto" onClick={aoIniciar}>
      <Pencil size={14} aria-hidden />
      {t("Iniciar uma conversa")}
    </BotaoDaCasca>
  );
  if (itens.length === 0 && !fixada) {
    return temFiltro ? (
      <VazioDaCasca className="pt-6" icone={Funnel} titulo={t("Nenhuma conversa nos filtros")} texto={<>{t("Ajuste os filtros")}<br />{t("para ver conversas.")}</>} acao={botaoIniciar} />
    ) : (
      <VazioDaCasca className="pt-6" icone={MessagesSquare} titulo={t("Nenhuma conversa encontrada.")} acao={botaoIniciar} />
    );
  }
  return (
    <div className="h-full overflow-y-auto">
      {fixada ? (
        <LinhaDaFila conversa={fixada} selecionada fixada aoSelecionar={aoSelecionar} aoSoltar={aoSoltarFixada} visualizacao={visualizacao} agora={agora} />
      ) : null}
      {itens.map((c) => (
        <LinhaDaFila key={c.id} conversa={c} selecionada={c.id === selectedId} aoSelecionar={aoSelecionar} visualizacao={visualizacao} agora={agora} />
      ))}
      {fila.hasNextPage ? (
        <div className="flex justify-center p-3">
          <BotaoDaCasca variante="texto" tamanho="sm" onClick={() => fila.fetchNextPage()} disabled={fila.isFetchingNextPage} title={fila.isFetchingNextPage ? t("Carregando…") : undefined}>
            {fila.isFetchingNextPage ? t("Carregando…") : t("Carregar mais")}
          </BotaoDaCasca>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 7: "Personalizar visualização"**

Replace `components/escale/conversas/fila/PainelPersonalizarVisualizacao.tsx`:

```tsx
"use client";
import { useState } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useGravarPreferencia } from "@/hooks/escale/usePreferenciasDeConversas";
import { useT } from "@/hooks/i18n/useT";
import {
  CAMPOS_ATIVOS_MAX,
  CAMPOS_DA_LINHA,
  ROTULO_DA_UNIDADE,
  ROTULO_DO_CAMPO_DA_LINHA,
  UNIDADES_DE_TEMPO,
  VISUALIZACAO_PADRAO,
  camposAtivos,
  podeLigar,
  type CampoDaLinha,
  type Limite,
  type Visualizacao,
} from "@/lib/escale/conversas/visualizacao";
import { CheckCheck, SlidersHorizontal, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** Toggles que dependem de outras fases ficam desligados com "Em breve" (N16). */
const EM_BREVE: ReadonlySet<CampoDaLinha> = new Set(["setor", "empresa"]);

/**
 * "PERSONALIZAR VISUALIZAÇÃO" (02-008, c44–c46): o painel de 355px sobre a
 * esquerda do centro, com a prévia, os sete toggles (no máximo cinco), os
 * limites de alerta e "Restaurar padrão". Grava na hora, por toggle.
 */
export function PainelPersonalizarVisualizacao({
  visualizacao,
  aoFechar,
}: {
  visualizacao: Visualizacao;
  aoFechar: () => void;
}) {
  const t = useT();
  const gravar = useGravarPreferencia();
  const [limitesAbertos, setLimitesAbertos] = useState(false);
  const ativos = camposAtivos(visualizacao);
  const salvar = (valor: Visualizacao) => gravar.mutate({ chave: "visualizacao", valor });
  const mudarCampo = (campo: CampoDaLinha, ligado: boolean) =>
    salvar({ ...visualizacao, campos: { ...visualizacao.campos, [campo]: ligado } });
  const mudarLimite = (qual: "amarelo" | "vermelho", limite: Limite) =>
    salvar({ ...visualizacao, limites: { ...visualizacao.limites, [qual]: limite } });

  const linhaDoLimite = (qual: "amarelo" | "vermelho", rotulo: string) => {
    const l = visualizacao.limites[qual];
    return (
      <div className="flex h-9 items-center gap-2 pl-4">
        <label htmlFor={`limite-${qual}`} className="w-[120px] text-[12px] text-casca-suave">{rotulo}</label>
        <input
          id={`limite-${qual}`}
          type="number"
          min={1}
          max={999}
          value={l.valor}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n >= 1 && n <= 999) mudarLimite(qual, { ...l, valor: n });
          }}
          className="h-8 w-12 rounded-casca-gatilho bg-casca-busca px-2 text-center text-[12px] text-casca-texto focus-visible:outline-2 focus-visible:outline-casca-marca"
        />
        <div className="w-[100px]">
          <SeletorDaCasca
            aparencia="janela"
            className="h-8"
            valor={l.unidade}
            opcoes={UNIDADES_DE_TEMPO.map((u) => ({ valor: u, rotulo: t(ROTULO_DA_UNIDADE[u]) }))}
            aoMudar={(u) => u && mudarLimite(qual, { ...l, unidade: u })}
            aria-label={`${rotulo} (${t("unidade")})`}
            buscaAPartirDe={99}
          />
        </div>
      </div>
    );
  };

  return (
    <aside
      aria-label={t("Personalizar visualização")}
      className="absolute inset-y-0 left-0 z-20 flex w-[355px] flex-col border-r border-casca-borda bg-surface shadow-casca-painel"
    >
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <h2 className="text-[14px] font-medium text-casca-texto">{t("Personalizar visualização")}</h2>
        <button type="button" aria-label={t("Fechar")} onClick={aoFechar} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia">
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="mx-4 rounded-[8px] border border-casca-borda p-3">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-casca-marca-media text-[15px] font-medium text-casca-marca">M</span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center justify-between"><span className="truncate text-[13px] font-medium text-casca-texto">Maria Silva</span><span className="text-[11px] text-casca-meta">21:05</span></span>
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[12px] text-casca-suave">Oi! Ainda tenho interesse…</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {visualizacao.campos.atendente ? <span aria-hidden className="grid size-5 place-items-center rounded-full bg-casca-marca text-[10px] font-semibold text-white">R</span> : null}
                <span aria-hidden className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-casca-novo px-1 text-[10px] font-semibold text-white">2</span>
              </span>
            </span>
            {visualizacao.campos.tempoSemResposta || visualizacao.campos.tags ? (
              <span className="flex items-center gap-1.5 pt-0.5 text-[11px]">
                {visualizacao.campos.tempoSemResposta ? <span className="text-casca-atencao">3h</span> : null}
                {visualizacao.campos.tags ? <span className="rounded-sm bg-casca-marca-suave px-1.5 text-[10px] text-casca-marca">vip</span> : null}
                <CheckCheck size={12} aria-hidden className="text-casca-meta" />
              </span>
            ) : null}
          </span>
        </div>
      </div>
      <ul className="mt-4 flex-1 overflow-y-auto px-4">
        {CAMPOS_DA_LINHA.map((campo) => {
          const ligado = visualizacao.campos[campo];
          const emBreve = EM_BREVE.has(campo);
          const bloqueado = emBreve || !podeLigar(visualizacao, campo);
          return (
            <li key={campo}>
              <div className={cn("flex h-8 items-center justify-between", bloqueado && !ligado && "text-casca-meta")}>
                <span className="text-[12px]">{t(ROTULO_DO_CAMPO_DA_LINHA[campo])}</span>
                <span className="flex items-center gap-2">
                  {campo === "tempoSemResposta" && ligado ? (
                    <button type="button" aria-label={t("Limites de alerta")} title={t("Limites de alerta")} onClick={() => setLimitesAbertos((v) => !v)} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia">
                      <SlidersHorizontal size={14} aria-hidden />
                    </button>
                  ) : null}
                  <InterruptorDaCasca
                    ligado={ligado}
                    aoMudar={(v) => mudarCampo(campo, v)}
                    aria-label={t(ROTULO_DO_CAMPO_DA_LINHA[campo])}
                    desabilitado={bloqueado}
                    title={emBreve ? t("Em breve") : !podeLigar(visualizacao, campo) ? t("No máximo 5 campos ativos") : undefined}
                  />
                </span>
              </div>
              {campo === "tempoSemResposta" && ligado && limitesAbertos ? (
                <div className="pb-2">
                  {linhaDoLimite("amarelo", t("Amarelo a partir de"))}
                  {linhaDoLimite("vermelho", t("Vermelho a partir de"))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex h-12 shrink-0 items-center justify-between border-t border-casca-borda px-4 text-[12px]">
        <span className="text-casca-suave">{`${ativos} ${t("de")} ${CAMPOS_ATIVOS_MAX} ${t("campos ativos")}`}</span>
        <button type="button" onClick={() => salvar(VISUALIZACAO_PADRAO)} className="text-casca-texto hover:underline">
          {t("Restaurar padrão")}
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-fila-da-casca.test.tsx tests/unit/escale-conversas-casca.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/conversas/fila tests/unit/escale-fila-da-casca.test.tsx && corepack pnpm eslint components/escale/conversas/fila && corepack pnpm typecheck`
Expected: PASS. Se `ChipDeEtiqueta` precisar do provedor de cores, envolva a linha no teste com o mesmo mock que `escale-tabela-de-contatos.test.tsx` usa (já está no topo do arquivo).

- [ ] **Step 9: Commit**

```bash
git add components/escale/conversas/fila tests/unit/escale-fila-da-casca.test.tsx
git commit -m "feat(escale): a fila da Clint — busca, presets, ordem, ⋮, a linha, a fixada e Personalizar visualização (Fase 3A)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 7: "Nova conversa" — crie ou selecione um contato, escolha o dispositivo

**Files:**
- Create: `tests/unit/escale-nova-conversa.test.tsx`
- Modify: `components/escale/conversas/centro/NovaConversa.tsx` (substituir o esqueleto), `components/escale/conversas/ConversasDaCasca.tsx` (prop `origens`), `app/app/inbox/page.tsx` (passa `origens`), `components/escale/contatos/JanelaNovoContato.tsx` (`nomeInicial`, `aoCriar`)

**Interfaces:**
- Consumes: `useContactList` (`hooks/contacts/useContactList`), `useChannelSessions`, `candidatosParaConversaNova`/`elegiveisParaConversaNova` (`lib/channels/conversa-nova`), `agruparDispositivos`, `bolinhaDoDispositivo`, `ROTULO_DO_GRUPO`, `FotoDaLinha` (2A), `phoneForDisplay`, `rotuloDoContato`, `AjudaDaCasca`, `SeletorDaCasca`, `JanelaNovoContato`, `origensDaPagina` (`lib/escale/contatos/origens-da-pagina`), `apiClient.post("/api/v1/conversations/open-with-contact")`.
- Produces: `NovaConversa({ origens, aoAbrirConversa, aoCancelar })`; `JanelaNovoContato` ganha `nomeInicial?: string` e `aoCriar?: (contato: { id: string; nome: string }) => void`; `ConversasDaCasca` ganha `origens?: OrigemParaCriar[]`.

**Detalhes visuais (c21, c84, c85, c86):** a tabela de medidas, linha "Nova conversa". O menu da busca de contatos é o `SeletorDaCasca aparencia="janela"` com busca a partir de 1 letra e uma primeira opção especial (o botão roxo "Criar "{termo}""); os resultados mostram foto 32px, nome 12px/500 e, embaixo, `Phone` 12px + telefone e `Mail` 12px + e-mail em 11px `casca-suave`. O seletor de dispositivos agrupa por `ROTULO_DO_GRUPO` (maiúsculas 10px/600) com a bolinha à direita (verde `--escale-status-ganho` / vermelha `casca-alerta`).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-nova-conversa.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));
const contatos = vi.hoisted(() => ({
  data: { pages: [{ data: [{ id: "ct1", name: "Neto Santos", display_name: null, phone_number: "+5511997903216", email: "nettodagi@gmail.com", tags: [] }] }] },
  isLoading: false,
}));
vi.mock("@/hooks/contacts/useContactList", () => ({ useContactList: () => contatos }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({
    data: [
      { id: "ch1", provider: "waha", status: "WORKING", display_name: "Sara - 2230", phone_number: "+5511953042230", waha_session_name: "sara" },
      { id: "ch2", provider: "meta_cloud", status: "WORKING", display_name: "Suporte SAO", phone_number: "+5511900000000", waha_session_name: "sao" },
      { id: "ch3", provider: "waha", status: "STOPPED", display_name: "Camilly - 7066", phone_number: "+5562981027066", waha_session_name: "cam" },
    ],
    isLoading: false,
  }),
}));
vi.mock("@/components/escale/contatos/JanelaNovoContato", () => ({
  JanelaNovoContato: ({ aberta, nomeInicial }: { aberta: boolean; nomeInicial?: string }) =>
    aberta ? <div data-testid="janela-novo-contato">{nomeInicial}</div> : null,
}));

import { NovaConversa } from "@/components/escale/conversas/centro/NovaConversa";

const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("NovaConversa (c21, c84–c86)", () => {
  it("busca o contato, mostra telefone e e-mail, 'Criar' abre a janela com o nome", () => {
    envolver(<NovaConversa origens={[]} aoAbrirConversa={vi.fn()} aoCancelar={vi.fn()} />);
    expect(screen.getByText("Crie ou selecione um contato")).toBeInTheDocument();
    const busca = screen.getByRole("combobox", { name: "Pesquisar" });
    fireEvent.click(busca);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Neto" } });
    expect(screen.getByText("(11) 99790-3216")).toBeInTheDocument();
    expect(screen.getByText("nettodagi@gmail.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: 'Criar "Neto"' }));
    expect(screen.getByTestId("janela-novo-contato")).toHaveTextContent("Neto");
  });

  it("escolhido o contato, os dispositivos agrupados; escolher um abre a conversa", async () => {
    api.post.mockResolvedValueOnce({ data: { conversation_id: "cv9", contact_id: "ct1" } });
    const aoAbrirConversa = vi.fn();
    envolver(<NovaConversa origens={[]} aoAbrirConversa={aoAbrirConversa} aoCancelar={vi.fn()} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Pesquisar" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Neto" } });
    fireEvent.click(screen.getByRole("option", { name: /Neto Santos/ }));
    expect(screen.getByRole("heading", { name: "Neto Santos" })).toBeInTheDocument();
    expect(screen.getByText("Selecione um dispositivo ou conta")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "Selecionar dispositivo ou conta" }));
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp Oficial")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Camilly - 7066/ })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("option", { name: /Sara - 2230/ }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/v1/conversations/open-with-contact", { contact_id: "ct1", channel_session_id: "ch1" }));
    await waitFor(() => expect(aoAbrirConversa).toHaveBeenCalledWith("cv9"));
  });
});
```

Se o `SeletorDaCasca` não expor `role="searchbox"` na busca interna, troque pelo que ele renderiza (confira `components/escale/ui/SeletorDaCasca.tsx`; o campo de busca aparece com `buscaAPartirDe` baixo). Se o `SeletorDaCasca` não suportar uma opção com conteúdo em duas linhas, use a lista própria descrita no Step 3 (o `Popover` + `ul role="listbox"`), que é o que o código abaixo faz.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-nova-conversa.test.tsx`
Expected: FAIL.

- [ ] **Step 3: A tela**

Replace `components/escale/conversas/centro/NovaConversa.tsx`:

```tsx
"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { JanelaNovoContato } from "@/components/escale/contatos/JanelaNovoContato";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useChannelSessions, type ChannelSession } from "@/hooks/channels/useChannelSessions";
import { useContactList } from "@/hooks/contacts/useContactList";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { candidatosParaConversaNova, elegiveisParaConversaNova } from "@/lib/channels/conversa-nova";
import { phoneForDisplay } from "@/lib/channels/phone-variants";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import { ROTULO_DO_GRUPO, agruparDispositivos, bolinhaDoDispositivo } from "@/lib/escale/conversas/nova-conversa";
import type { Contact } from "@/lib/types/contacts";
import { ChevronDown, ContactRound, Mail, Phone, User } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { VazioDaCasca } from "./VazioDaCasca";

const GATILHO =
  "flex h-8 w-[446px] max-w-full items-center justify-between rounded-casca-gatilho border px-3 text-[12px] text-casca-texto";

/**
 * "NOVA CONVERSA" (fork Escale, Fase 3A; A12; c21, c84–c86). Troca o centro
 * pela tela "Crie ou selecione um contato"; escolhido o contato, pede o
 * dispositivo; escolhido o dispositivo, abre a conversa pela rota do original
 * (`open-with-contact`) e a seleciona.
 */
export function NovaConversa({
  origens,
  aoAbrirConversa,
  aoCancelar: _aoCancelar,
}: {
  origens: OrigemParaCriar[];
  aoAbrirConversa: (id: string | null) => void;
  aoCancelar: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const [termo, setTermo] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [contato, setContato] = useState<Contact | null>(null);
  const [criando, setCriando] = useState<string | null>(null);
  const [dispositivosAbertos, setDispositivosAbertos] = useState(false);
  const [abrindo, setAbrindo] = useState(false);

  const lista = useContactList({ search: termo.trim().length >= 1 ? termo.trim() : undefined, limit: 20 });
  const contatos = useMemo(() => lista.data?.pages.flatMap((p) => p.data) ?? [], [lista.data]);
  const canais = useChannelSessions();
  const candidatos = useMemo(() => candidatosParaConversaNova(canais.data ?? []), [canais.data]);
  const elegiveis = useMemo(() => new Set(elegiveisParaConversaNova(candidatos).map((c) => c.id)), [candidatos]);
  const grupos = useMemo(() => agruparDispositivos(candidatos), [candidatos]);

  async function abrir(canal: ChannelSession) {
    if (!contato) return;
    setDispositivosAbertos(false);
    setAbrindo(true);
    try {
      const r = await apiClient.post<{ data: { conversation_id: string } }>(
        "/api/v1/conversations/open-with-contact",
        { contact_id: contato.id, channel_session_id: canal.id },
      );
      await qc.invalidateQueries({ queryKey: ["conversations"] });
      aoAbrirConversa(r.data.conversation_id);
    } catch {
      toast.error(t("Não foi possível abrir a conversa."));
    } finally {
      setAbrindo(false);
    }
  }

  const nomeDoContato = contato ? rotuloDoContato(contato, t) : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-casca-borda px-4">
        {contato ? (
          <FotoDaLinha id={contato.id} nome={nomeDoContato ?? ""} temFoto={false} />
        ) : (
          <span aria-hidden className="grid size-10 place-items-center rounded-full bg-casca-raia text-casca-meta">
            <User size={18} />
          </span>
        )}
        {nomeDoContato ? <h2 className="text-[13px] font-medium text-casca-texto">{nomeDoContato}</h2> : null}
      </div>
      <div className="flex flex-1 flex-col items-center pt-24">
        <VazioDaCasca
          icone={ContactRound}
          titulo={t("Crie ou selecione um contato")}
          texto={
            <>
              {t("Pesquise pelo nome, e-mail,")}
              <br />
              {t("telefone ou Instagram do contato")}
            </>
          }
        />
        <span className="-mt-9 ml-[200px]"><AjudaDaCasca texto={t("Pesquise pelo nome, e-mail, telefone ou Instagram do contato")} /></span>
        <Popover open={buscaAberta} onOpenChange={setBuscaAberta}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={buscaAberta}
              aria-label={t("Pesquisar")}
              className={cn(GATILHO, "mt-6", buscaAberta ? "border-casca-marca" : "border-casca-borda")}
            >
              <span className={cn(!nomeDoContato && "text-casca-meta")}>{nomeDoContato ?? t("Pesquisar")}</span>
              <ChevronDown size={14} aria-hidden className="text-casca-chevron" />
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="start" className="w-[446px] p-0">
            <div className="p-2">
              <input
                type="search"
                role="searchbox"
                autoFocus
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder={t("Pesquisar")}
                aria-label={t("Pesquisar")}
                className="h-8 w-full rounded-casca-gatilho bg-casca-busca px-3 text-[12px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
              />
            </div>
            <ul role="listbox" aria-label={t("Contatos")} className="max-h-[360px] overflow-y-auto px-2 pb-2">
              {termo.trim() ? (
                <li role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => {
                      setBuscaAberta(false);
                      setCriando(termo.trim());
                    }}
                    className="mb-1 h-8 w-full rounded-casca-gatilho bg-casca-marca text-[12px] font-medium text-white hover:bg-casca-marca-forte"
                  >
                    {`${t("Criar")} "${termo.trim()}"`}
                  </button>
                </li>
              ) : null}
              {lista.isLoading ? (
                <li className="px-3 py-2 text-[12px] text-casca-suave">{t("Carregando…")}</li>
              ) : contatos.length === 0 ? (
                <li className="px-3 py-2 text-[12px] text-casca-suave">{t("Nenhum contato encontrado.")}</li>
              ) : (
                contatos.map((c) => {
                  const nome = rotuloDoContato(c, t);
                  return (
                    <li key={c.id} role="option" aria-selected={contato?.id === c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setContato(c);
                          setBuscaAberta(false);
                        }}
                        className="flex h-12 w-full items-center gap-3 rounded-casca-gatilho px-2 text-left hover:bg-casca-raia"
                      >
                        <FotoDaLinha id={c.id} nome={nome} temFoto={false} />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[12px] font-medium text-casca-texto">{nome}</span>
                          <span className="flex items-center gap-3 text-[11px] text-casca-suave">
                            {c.phone_number ? (
                              <span className="flex items-center gap-1"><Phone size={12} aria-hidden />{phoneForDisplay(c.phone_number)}</span>
                            ) : null}
                            {c.email ? (
                              <span className="flex items-center gap-1"><Mail size={12} aria-hidden />{c.email}</span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </PainelSuspenso>
        </Popover>

        {contato ? (
          <div className="mt-6 flex w-[446px] max-w-full flex-col gap-2">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-casca-texto">
              {t("Selecione um dispositivo ou conta")}
              <AjudaDaCasca texto={t("A conversa sai por este dispositivo ou conta.")} />
            </p>
            <Popover open={dispositivosAbertos} onOpenChange={setDispositivosAbertos}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={dispositivosAbertos}
                  aria-label={t("Selecionar dispositivo ou conta")}
                  disabled={abrindo}
                  title={abrindo ? t("Abrindo…") : undefined}
                  className={cn(GATILHO, dispositivosAbertos ? "border-casca-marca" : "border-casca-borda")}
                >
                  <span className="text-casca-meta">{abrindo ? t("Abrindo…") : t("Selecionar dispositivo ou conta")}</span>
                  <ChevronDown size={14} aria-hidden className="text-casca-chevron" />
                </button>
              </PopoverTrigger>
              <PainelSuspenso align="start" className="w-[446px] p-2">
                <ul role="listbox" aria-label={t("Dispositivos")} className="max-h-[360px] overflow-y-auto">
                  {grupos.length === 0 ? (
                    <li className="px-3 py-2 text-[12px] text-casca-suave">{t("Você precisa adicionar um dispositivo ou uma conta para iniciar uma nova conversa.")}</li>
                  ) : null}
                  {grupos.map((g) => (
                    <li key={g.grupo}>
                      <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-casca-meta uppercase">{t(ROTULO_DO_GRUPO[g.grupo])}</p>
                      <ul>
                        {g.canais.map((c) => {
                          const elegivel = elegiveis.has(c.id);
                          return (
                            <li key={c.id} role="option" aria-selected={false} aria-disabled={!elegivel}>
                              <button
                                type="button"
                                disabled={!elegivel}
                                title={elegivel ? undefined : t("Desconectado")}
                                onClick={() => void abrir(c)}
                                className="flex h-[42px] w-full items-center justify-between rounded-casca-gatilho px-3 text-left hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <span className="flex min-w-0 flex-col">
                                  <span className="truncate text-[12px] text-casca-texto">{c.display_name ?? c.waha_session_name ?? t("Número sem nome")}</span>
                                  <span className="text-[11px] text-casca-suave">{phoneForDisplay(c.phone_number)}</span>
                                </span>
                                <span
                                  aria-hidden
                                  className={cn("size-2 shrink-0 rounded-full", bolinhaDoDispositivo(c.status) === "verde" ? "bg-(--escale-status-ganho)" : "bg-casca-alerta")}
                                />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              </PainelSuspenso>
            </Popover>
          </div>
        ) : null}
      </div>
      <JanelaNovoContato
        aberta={criando !== null}
        aoFechar={() => setCriando(null)}
        origens={origens}
        nomeInicial={criando ?? undefined}
        aoCriar={(novo) => {
          setContato({ id: novo.id, name: novo.nome, display_name: null, phone_number: null, email: null, tags: [] } as unknown as Contact);
          setCriando(null);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: `nomeInicial` e `aoCriar` na janela da 2A; `origens` na casca e na página**

Em `components/escale/contatos/JanelaNovoContato.tsx`:
- nas props: `nomeInicial?: string; aoCriar?: (contato: { id: string; nome: string }) => void;`;
- `const [nome, setNome] = useState(nomeInicial ?? "");` e, logo abaixo, o padrão "estado que depende de prop" (como `JanelaDeNota` faz): `const [vistoInicial, setVistoInicial] = useState(nomeInicial); if (vistoInicial !== nomeInicial) { setVistoInicial(nomeInicial); setNome(nomeInicial ?? ""); }`;
- depois do `POST /api/v1/contacts` bem-sucedido (procure onde a janela lê a resposta `{ data: { id } }` e chama o `toast.success`), acrescente `aoCriar?.({ id: criado.data.id, nome: nomeLimpo });` (use a variável que a janela já tem para a resposta).

Em `components/escale/conversas/ConversasDaCasca.tsx`: prop `origens?: OrigemParaCriar[]` (padrão `[]`; `import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";`), passada para `<NovaConversa origens={origens} …>` e para `<PainelDoContato origens={origens} …>` (a Task 8 a consome).

Em `app/app/inbox/page.tsx`, no ramo da casca:

```tsx
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    const { origens } = await origensDaPagina();
    return <ConversasDaCasca initialSelectedId={id ?? null} rascunho={avisoDeRascunho} origens={origens} />;
  }
```

com `import { origensDaPagina } from "@/lib/escale/contatos/origens-da-pagina";` no topo.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-nova-conversa.test.tsx tests/unit/escale-conversas-casca.test.tsx $(grep -rlF "JanelaNovoContato" tests/unit --include='*.test.tsx' | tr '\n' ' ') && corepack pnpm prettier --write components/escale/conversas/centro/NovaConversa.tsx tests/unit/escale-nova-conversa.test.tsx && corepack pnpm eslint components/escale/conversas components/escale/contatos/JanelaNovoContato.tsx app/app/inbox/page.tsx && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/escale/conversas components/escale/contatos/JanelaNovoContato.tsx app/app/inbox/page.tsx tests/unit/escale-nova-conversa.test.tsx
git commit -m "feat(escale): Nova conversa — crie ou selecione um contato e escolha o dispositivo (Fase 3A)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 8: O painel direito — vazio, "Próximo negócio", o cabeçalho do contato e o cartão do negócio

**Files:**
- Create: `components/escale/conversas/painel/ProximoNegocioDaConversa.tsx`, `components/escale/conversas/painel/CabecalhoDoContato.tsx`, `components/escale/conversas/painel/CartaoDoNegocio.tsx`, `components/escale/conversas/painel/SecoesDoPainel.tsx` (o esqueleto; a Task 9 preenche), `hooks/escale/useNegocioDaConversa.ts`, `tests/unit/escale-painel-do-contato.test.tsx`
- Modify (substituir o esqueleto): `components/escale/conversas/painel/PainelDoContato.tsx`

**Interfaces:**
- Consumes: `useNegociosDoContato`, `useBoard`/`chaveDoQuadro`, `vizinhosNaEtapa`, `etapasDoProximo`, `etapaParaReabrir`, `useWinLead`, `useLoseLead`, `useMoveCard`, `useEditLead`, `useMotivosDePerdaDoFunil`, `opcoesDeMotivoDePerda`, `rotuloDoMotivoDePerda`, `DonoDaFicha`, `TagsDaFicha`, `JanelaNovoNegocio`, `JanelaDeNota`, `resolveLeadOwner`, `textoDeReais`, `usePermission`, `AjudaDaCasca`, `SeletorDaCasca`, `PainelSuspenso`, `VazioDaCasca`, `FotoDaConversa`.
- Produces:
  - `useNegocioDaConversa(contactId)` → `{ negocios, escolhido, escolher(id), quadro: { lead, pipeline, stages, leads } | null, carregando, erro }`.
  - `PainelDoContato({ conversa, aoAbrirConversa, origens })`.
  - `ProximoNegocioDaConversa({ lead, stages, leads, aoAbrirConversa })`.
  - `CabecalhoDoContato({ conversa, lead, pipelineId })`.
  - `CartaoDoNegocio({ lead, pipeline, stages, negocios, aoEscolher, contato, origens })`.
  - `SecoesDoPainel({ conversa, quadro, secoes, aoMudarSecoes, aoAbrirConversa })` (esqueleto com a lista; a Task 9 completa).

**Detalhes visuais (c02, c48, 003):** a tabela de medidas, linhas "Painel direito", "Adicionar negócio" e "Painel direito vazio".

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-painel-do-contato.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ activeOrg: { orgId: "org1", role: "manager" }, user: { id: "u1" } }),
  useActiveOrg: () => ({ orgId: "org1", role: "manager", currency: "BRL" }),
  useUser: () => ({ id: "u1", full_name: "Régis" }),
  usePermission: () => true,
}));
const negocios = vi.hoisted(() => ({
  data: [
    { id: "l1", pipeline_id: "p1", stage_id: "s1", status: "open", updated_at: "2026-10-18T10:00:00Z", origem: { id: "p1", nome: "Obra Futura", grupo: "INSS Vendas" } },
  ] as unknown[],
  isLoading: false,
  isError: false,
}));
vi.mock("@/hooks/escale/useNegociosDoContato", () => ({ useNegociosDoContato: () => negocios, invalidarNegociosDoContato: vi.fn() }));
const quadro = vi.hoisted(() => ({
  data: {
    pipeline: { id: "p1", name: "Obra Futura", settings: {} },
    stages: [
      { id: "s1", name: "1. Entrada Lead", position: 1, is_won: false, is_lost: false, is_archived: false },
      { id: "s2", name: "2. Contato", position: 2, is_won: false, is_lost: false, is_archived: false },
    ],
    leads: [
      { id: "l1", pipeline_id: "p1", stage_id: "s1", status: "open", title: "Neto Santos", value_cents: 0, currency: "BRL", owner_user_id: "u1", owner_agent_id: null, owner_kind: "user", contact_id: "ct1", position_in_stage: 1, lost_reason: null, custom_fields: {}, conversa: { id: "cv1" } },
      { id: "l2", pipeline_id: "p1", stage_id: "s1", status: "open", title: "Outro", value_cents: 0, currency: "BRL", owner_user_id: null, owner_agent_id: null, owner_kind: "user", contact_id: "ct2", position_in_stage: 2, lost_reason: null, custom_fields: {}, conversa: { id: "cv2" } },
    ],
  },
  isLoading: false,
  error: null,
}));
vi.mock("@/hooks/kanban/useBoard", () => ({ useBoard: () => quadro, chaveDoQuadro: (id: string) => ["board", id] }));
const ganhar = vi.hoisted(() => vi.fn());
const perder = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/kanban/useUpdateLead", () => ({
  useWinLead: () => ({ mutate: ganhar, isPending: false }),
  useLoseLead: () => ({ mutate: perder, isPending: false }),
  useEditLead: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));
const mover = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/kanban/useMoveCard", () => ({ useMoveCard: () => ({ mutate: mover, isPending: false }) }));
vi.mock("@/hooks/kanban/useMotivosDePerdaDoFunil", () => ({ useMotivosDePerdaDoFunil: () => ({ data: [] }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [{ user_id: "u1", full_name: "Camilly Victória", role: "agent" }] }) }));
vi.mock("@/components/escale/negocio/DonoDaFicha", () => ({ DonoDaFicha: () => <span data-testid="dono" /> }));
vi.mock("@/components/escale/negocio/TagsDaFicha", () => ({ TagsDaFicha: () => <span data-testid="tags" /> }));
vi.mock("@/components/escale/conversas/painel/SecoesDoPainel", () => ({ SecoesDoPainel: () => <div data-testid="secoes" /> }));
vi.mock("@/components/escale/contatos/JanelaNovoNegocio", () => ({
  JanelaNovoNegocio: ({ contato }: { contato: unknown }) => (contato ? <div data-testid="janela-novo-negocio" /> : null),
}));

import { PainelDoContato } from "@/components/escale/conversas/painel/PainelDoContato";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const conversa = {
  id: "cv1",
  contact_id: "ct1",
  status: "open",
  contacts: { id: "ct1", display_name: "Neto Santos", name: null, phone_number: "+5511997903216", tags: ["Janeiro/27"] },
  channel_sessions: { provider: "meta_cloud" },
} as unknown as ConversationWithContact;

describe("PainelDoContato (c01, c02, c48)", () => {
  it("sem conversa: 'Nenhuma conversa selecionada'", () => {
    envolver(<PainelDoContato conversa={null} aoAbrirConversa={vi.fn()} origens={[]} />);
    expect(screen.getByText("Nenhuma conversa selecionada")).toBeInTheDocument();
  });

  it("com conversa e negócio: Próximo negócio, o cabeçalho, o cartão com grupo › origem, etapa 1/2, valor, dono e os três botões", () => {
    const aoAbrirConversa = vi.fn();
    envolver(<PainelDoContato conversa={conversa} aoAbrirConversa={aoAbrirConversa} origens={[]} />);
    expect(screen.getByText("Próximo negócio")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Neto Santos" })).toBeInTheDocument();
    expect(screen.getByText("INSS Vendas")).toBeInTheDocument();
    expect(screen.getByText("Obra Futura")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1\. Entrada Lead/ })).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
    expect(screen.getByText("Camilly Victória")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aberto" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Ganho" }));
    expect(ganhar).toHaveBeenCalledWith({ leadId: "l1" });
    fireEvent.click(screen.getByRole("button", { name: "Próximo negócio" }));
    expect(aoAbrirConversa).toHaveBeenCalledWith("cv2");
    expect(screen.getByRole("button", { name: "Negócio anterior" })).toBeDisabled();
  });

  it("Perdido pede o motivo e grava com 'Não informar'", () => {
    envolver(<PainelDoContato conversa={conversa} aoAbrirConversa={vi.fn()} origens={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Perdido" }));
    const motivo = screen.getByRole("combobox", { name: "Motivo da perda" });
    fireEvent.click(motivo);
    fireEvent.click(screen.getByRole("option", { name: "Não informar" }));
    expect(perder).toHaveBeenCalledWith({ leadId: "l1", lostReason: "nao_informado" }, expect.anything());
  });

  it("sem negócio: 'Adicionar negócio' abre a janela da 2A; as seções continuam", () => {
    negocios.data = [];
    envolver(<PainelDoContato conversa={conversa} aoAbrirConversa={vi.fn()} origens={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar negócio" }));
    expect(screen.getByTestId("janela-novo-negocio")).toBeInTheDocument();
    expect(screen.getByTestId("secoes")).toBeInTheDocument();
    negocios.data = [{ id: "l1", pipeline_id: "p1", stage_id: "s1", status: "open", updated_at: "2026-10-18T10:00:00Z", origem: { id: "p1", nome: "Obra Futura", grupo: "INSS Vendas" } }];
  });

  it("falha ao ler os negócios: a frase da Clint", () => {
    negocios.isError = true;
    envolver(<PainelDoContato conversa={conversa} aoAbrirConversa={vi.fn()} origens={[]} />);
    expect(screen.getByText("Não foi possível carregar as informações do contato.")).toBeInTheDocument();
    negocios.isError = false;
  });
});
```

O valor `"nao_informado"` do motivo "Não informar" é o que `opcoesDeMotivoDePerda`/`rotuloDoMotivoDePerda` (`lib/leads/motivos-de-perda-do-funil.ts`, `lib/schemas/leads.ts`) usam para o padrão; confira o literal lá e ajuste o teste.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-painel-do-contato.test.tsx`
Expected: FAIL.

- [ ] **Step 3: O hook do negócio da conversa**

Create `hooks/escale/useNegocioDaConversa.ts`:

```ts
"use client";
import { useEffect, useMemo, useState } from "react";

import { useBoard } from "@/hooks/kanban/useBoard";
import type { Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

import { useNegociosDoContato, type NegocioDoContato } from "./useNegociosDoContato";

export interface QuadroDoNegocio {
  lead: Lead;
  pipeline: Pipeline;
  stages: Stage[];
  leads: Lead[];
}

/**
 * O NEGÓCIO DA CONVERSA (fork Escale, Fase 3A; N9). Os negócios do contato
 * vêm da rota do fork; o escolhido (o primeiro aberto, ou o que a pessoa
 * escolheu em "Selecionar negócio") é lido inteiro pelo cache do quadro, o
 * mesmo da ficha — assim ganhar, perder, mover e editar gravam num lugar só.
 */
export function useNegocioDaConversa(contactId: string | null) {
  const negocios = useNegociosDoContato(contactId);
  const lista = useMemo(() => negocios.data ?? [], [negocios.data]);
  const [escolhidoId, setEscolhidoId] = useState<string | null>(null);
  useEffect(() => setEscolhidoId(null), [contactId]);
  const escolhido: NegocioDoContato | null =
    lista.find((n) => n.id === escolhidoId) ?? lista[0] ?? null;
  const board = useBoard(escolhido?.pipeline_id ?? null);
  const quadro: QuadroDoNegocio | null = useMemo(() => {
    if (!escolhido || !board.data) return null;
    const lead = board.data.leads.find((l) => l.id === escolhido.id);
    if (!lead) return null;
    return { lead, pipeline: board.data.pipeline, stages: board.data.stages, leads: board.data.leads };
  }, [escolhido, board.data]);
  return {
    negocios: lista,
    escolhido,
    escolher: setEscolhidoId,
    quadro,
    carregando: negocios.isLoading || (!!escolhido && board.isLoading),
    erro: negocios.isError || (!!escolhido && !!board.error && !board.data),
  };
}
```

- [ ] **Step 4: "Próximo negócio", o cabeçalho e o cartão**

Create `components/escale/conversas/painel/ProximoNegocioDaConversa.tsx`:

```tsx
"use client";
import { useState } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { etapasDoProximo, vizinhosNaEtapa } from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { Check, ChevronLeft, ChevronRight, Funnel } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const SETA =
  "grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40";

/** O vizinho que tem conversa; os sem conversa são pulados (N10). */
function vizinhoComConversa(
  leads: readonly Lead[],
  etapaId: string,
  atualId: string,
  lado: "anterior" | "proximo",
): Lead | null {
  let cursor = atualId;
  for (let i = 0; i < leads.length; i++) {
    const v = vizinhosNaEtapa(leads, etapaId, cursor)[lado];
    if (!v) return null;
    if (v.conversa?.id) return v;
    cursor = v.id;
  }
  return null;
}

/** "PRÓXIMO NEGÓCIO" (c02): a etapa pelo funil, o "?" e as setas ‹ › que abrem a conversa do vizinho. */
export function ProximoNegocioDaConversa({
  lead,
  stages,
  leads,
  aoAbrirConversa,
}: {
  lead: Lead | null;
  stages: Stage[];
  leads: Lead[];
  aoAbrirConversa: (id: string | null) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [etapaPedida, setEtapaPedida] = useState<string | null>(null);
  const opcoes = etapasDoProximo(stages);
  const etapaId = etapaPedida && opcoes.some((s) => s.id === etapaPedida) ? etapaPedida : (lead?.stage_id ?? null);
  const anterior = lead && etapaId ? vizinhoComConversa(leads, etapaId, lead.id, "anterior") : null;
  const proximo = lead && etapaId ? vizinhoComConversa(leads, etapaId, lead.id, "proximo") : null;

  return (
    <div className="flex h-12 shrink-0 items-center justify-between">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
        {t("Próximo negócio")}
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <button type="button" aria-label={t("Etapa do próximo negócio")} disabled={!lead} title={!lead ? t("Sem negócio") : undefined} className={cn(SETA, "size-5")}>
              <Funnel size={14} aria-hidden />
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="start" sideOffset={6} className="max-h-[370px] w-[158px] overflow-y-auto p-1">
            <ul role="listbox" aria-label={t("Etapa do próximo negócio")}>
              {opcoes.map((s) => (
                <li key={s.id} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={s.id === etapaId}
                    onClick={() => {
                      setEtapaPedida(s.id);
                      setAberto(false);
                    }}
                    className={cn("flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs normal-case tracking-normal", s.id === etapaId ? "bg-casca-raia text-casca-marca" : "text-casca-texto hover:bg-casca-raia")}
                  >
                    <span>{s.name}</span>
                    {s.id === etapaId ? <Check size={14} aria-hidden /> : null}
                  </button>
                </li>
              ))}
            </ul>
          </PainelSuspenso>
        </Popover>
        <AjudaDaCasca texto={t("Navegue pela ordem dos seus negócios. Esta seleção não afeta os filtros gerais de atendimento.")} />
      </span>
      <span className="flex items-center gap-1">
        <button type="button" aria-label={t("Negócio anterior")} disabled={!anterior} title={!anterior ? t("Não há negócio anterior") : undefined} onClick={() => anterior && aoAbrirConversa(anterior.conversa!.id)} className={SETA}>
          <ChevronLeft size={16} aria-hidden />
        </button>
        <button type="button" aria-label={t("Próximo negócio")} disabled={!proximo} title={!proximo ? t("Não há próximo negócio") : undefined} onClick={() => proximo && aoAbrirConversa(proximo.conversa!.id)} className={SETA}>
          <ChevronRight size={16} aria-hidden />
        </button>
      </span>
    </div>
  );
}
```

Create `components/escale/conversas/painel/CabecalhoDoContato.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useState } from "react";

import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";
import { TagsDaFicha } from "@/components/escale/negocio/TagsDaFicha";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import type { Lead } from "@/lib/types/leads";
import { Bell, Calendar, CalendarClock, Mail, Phone, StickyNote, User } from "@/lib/ui/icons-da-casca";

import { FotoDaConversa } from "../fila/FotoDaConversa";

const ICONE = "text-casca-marca disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40";

/** O cabeçalho do contato (c02): foto, nome, tags e as ações rápidas; "Abrir contato" à direita. */
export function CabecalhoDoContato({
  conversa,
  lead,
  pipelineId,
}: {
  conversa: ConversationWithContact;
  lead: Lead | null;
  pipelineId: string | null;
}) {
  const t = useT();
  const [nota, setNota] = useState(false);
  const contato = conversa.contacts ?? null;
  const nome = rotuloDoContato(contato, t);
  const telefone = contato?.phone_number ?? null;
  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex items-start gap-3">
        <FotoDaConversa conversa={conversa} tamanho="topo" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="truncate text-[13px] font-medium text-casca-texto">{nome}</h2>
          {lead && pipelineId ? (
            <TagsDaFicha key={`tags-${lead.id}`} lead={lead} pipelineId={pipelineId} />
          ) : (
            <span className="text-[12px] text-casca-meta">{(contato?.tags ?? []).join(" · ")}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {telefone ? (
          <a href={`tel:${telefone}`} aria-label={t("Ligar")} title={t("Ligar")} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-marca hover:bg-casca-raia">
            <Phone size={16} aria-hidden />
          </a>
        ) : (
          <BotaoDaCasca variante="icone" tamanho="sm" disabled title={t("Sem telefone")} aria-label={t("Ligar")} className={ICONE}><Phone size={16} aria-hidden /></BotaoDaCasca>
        )}
        <BotaoDaCasca variante="icone" tamanho="sm" disabled title={t("Em breve")} aria-label={t("Agendar")} className={ICONE}><Calendar size={16} aria-hidden /></BotaoDaCasca>
        <BotaoDaCasca variante="icone" tamanho="sm" disabled title={t("Em breve")} aria-label={t("Enviar Email")} className={ICONE}><Mail size={16} aria-hidden /></BotaoDaCasca>
        <BotaoDaCasca variante="icone" tamanho="sm" disabled title={t("Em breve")} aria-label={t("Lembretes")} className={ICONE}><Bell size={16} aria-hidden /></BotaoDaCasca>
        <BotaoDaCasca variante="icone" tamanho="sm" disabled title={t("Em breve")} aria-label={t("Nova atividade")} className={ICONE}><CalendarClock size={16} aria-hidden /></BotaoDaCasca>
        <BotaoDaCasca variante="icone" tamanho="sm" disabled={!lead} title={lead ? t("Nova nota") : t("Sem negócio")} aria-label={t("Nova nota")} onClick={() => setNota(true)} className={ICONE}><StickyNote size={16} aria-hidden /></BotaoDaCasca>
        <span className="flex-1" />
        {contato?.id ? (
          <Link href={`/app/contacts/${contato.id}`} aria-label={t("Abrir contato")} title={t("Abrir contato")} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-marca hover:bg-casca-raia">
            <User size={16} aria-hidden />
          </Link>
        ) : null}
      </div>
      {lead ? <JanelaDeNota leadId={lead.id} aberta={nota} onFechar={() => setNota(false)} /> : null}
    </div>
  );
}
```

Create `components/escale/conversas/painel/CartaoDoNegocio.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaNovoNegocio } from "@/components/escale/contatos/JanelaNovoNegocio";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { DonoDaFicha } from "@/components/escale/negocio/DonoDaFicha";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import type { NegocioDoContato } from "@/hooks/escale/useNegociosDoContato";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useMotivosDePerdaDoFunil } from "@/hooks/kanban/useMotivosDePerdaDoFunil";
import { useMoveCard, type RetomadaPendente } from "@/hooks/kanban/useMoveCard";
import { useLoseLead, useWinLead } from "@/hooks/kanban/useUpdateLead";
import { RetomarComoNovoNegocioDialog } from "@/components/kanban/RetomarComoNovoNegocioDialog";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { textoDeReais } from "@/lib/escale/negocio/campos";
import { etapaParaReabrir, rotaDoNegocio } from "@/lib/escale/negocio/regras";
import { opcoesDeMotivoDePerda } from "@/lib/leads/motivos-de-perda-do-funil";
import { resolveLeadOwner } from "@/lib/kanban/owner";
import { rotuloDoMotivoDePerda } from "@/lib/schemas/leads";
import type { Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { Check, CheckCircle2, ChevronDown, ChevronRight, CircleX, ExternalLink, Plus, UserRoundPlus } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const EYEBROW = "text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase";
const BOTAO_DE_STATUS =
  "flex h-7 flex-1 items-center justify-center gap-1 rounded-casca-gatilho border text-[12px] disabled:pointer-events-auto disabled:cursor-not-allowed";

/**
 * "NEGÓCIOS" E O CARTÃO (fork Escale, Fase 3A; D3; c02, c48, 003). As mesmas
 * mutations da ficha (`StatusDaFicha`): ganhar, perder com motivo, reabrir
 * para a etapa certa, mover de etapa. Sem negócio, só "Adicionar negócio".
 */
export function CartaoDoNegocio({
  lead,
  pipeline,
  stages,
  negocios,
  aoEscolher,
  contato,
  origens,
}: {
  lead: Lead | null;
  pipeline: Pipeline | null;
  stages: Stage[];
  negocios: NegocioDoContato[];
  aoEscolher: (id: string) => void;
  contato: LinhaDeContato | null;
  origens: OrigemParaCriar[];
}) {
  const t = useT();
  const [novo, setNovo] = useState(false);
  const [escolhendo, setEscolhendo] = useState(false);
  const abertos = negocios.filter((n) => n.status === "open").length;

  return (
    <section className="pb-4">
      <div className="flex h-8 items-center justify-between">
        <span className={cn(EYEBROW, "flex items-center gap-2")}>
          {t("Negócios")}
          {negocios.length > 0 ? (
            <span className="grid size-4 place-items-center rounded-full bg-casca-marca text-[10px] font-semibold text-white normal-case">{abertos}</span>
          ) : null}
        </span>
        <span className="flex items-center gap-1">
          {negocios.length > 1 ? (
            <Popover open={escolhendo} onOpenChange={setEscolhendo}>
              <PopoverTrigger asChild>
                <button type="button" className="flex h-6 items-center gap-1 rounded-casca-gatilho px-2 text-[11px] text-casca-marca hover:bg-casca-raia">
                  {t("Selecionar negócio")}
                  <ChevronDown size={12} aria-hidden />
                </button>
              </PopoverTrigger>
              <PainelSuspenso align="end" className="w-[260px] p-1">
                <ul role="listbox" aria-label={t("Selecionar negócio")}>
                  {negocios.map((n) => (
                    <li key={n.id} role="option" aria-selected={n.id === lead?.id}>
                      <button type="button" onClick={() => { aoEscolher(n.id); setEscolhendo(false); }} className={cn("flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[12px]", n.id === lead?.id ? "bg-casca-raia text-casca-marca" : "text-casca-texto hover:bg-casca-raia")}>
                        <span className="truncate">{n.origem.grupo ? `${n.origem.grupo} › ` : ""}{n.origem.nome}</span>
                        {n.id === lead?.id ? <Check size={14} aria-hidden /> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </PainelSuspenso>
            </Popover>
          ) : null}
          <button type="button" aria-label={t("Adicionar negócio")} title={contato ? t("Adicionar negócio") : t("Sem contato")} disabled={!contato} onClick={() => setNovo(true)} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40">
            <Plus size={16} aria-hidden />
          </button>
        </span>
      </div>

      {lead && pipeline ? (
        <Cartao lead={lead} pipeline={pipeline} stages={stages} negocio={negocios.find((n) => n.id === lead.id) ?? null} />
      ) : (
        <button type="button" disabled={!contato} title={contato ? undefined : t("Sem contato")} onClick={() => setNovo(true)} className="flex h-8 w-full items-center justify-center gap-2 rounded-casca-gatilho border border-casca-borda text-[12px] text-casca-marca hover:bg-casca-raia disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60">
          {t("Adicionar negócio")}
          <UserRoundPlus size={14} aria-hidden />
        </button>
      )}
      <JanelaNovoNegocio contato={novo ? contato : null} aoFechar={() => setNovo(false)} origens={origens} />
    </section>
  );
}

function Cartao({ lead, pipeline, stages, negocio }: { lead: Lead; pipeline: Pipeline; stages: Stage[]; negocio: NegocioDoContato | null }) {
  const t = useT();
  const pode = usePermission("pipeline.move_card");
  const ganhar = useWinLead(pipeline.id);
  const perder = useLoseLead(pipeline.id);
  const [retomada, setRetomada] = useState<RetomadaPendente | null>(null);
  const mover = useMoveCard(pipeline.id, { onRetomada: setRetomada });
  const motivos = useMotivosDePerdaDoFunil(pipeline.id);
  const { data: membros } = useAssignableMembers(true);
  const [pedindoMotivo, setPedindoMotivo] = useState(false);
  const [etapaAberta, setEtapaAberta] = useState(false);
  const ocupado = ganhar.isPending || perder.isPending || mover.isPending;

  const abertas = stages.filter((s) => !s.is_archived && !s.is_won && !s.is_lost).sort((a, b) => a.position - b.position);
  const indice = abertas.findIndex((s) => s.id === lead.stage_id);
  const etapa = abertas[indice] ?? stages.find((s) => s.id === lead.stage_id) ?? null;
  const dono = resolveLeadOwner(lead, new Map((membros ?? []).map((m) => [m.user_id, m.full_name])));
  const perdido = lead.status === "lost";
  const opcoesBase = opcoesDeMotivoDePerda(motivos.data ?? []).map((o) => ({ valor: o.valor, rotulo: o.doFunil ? o.valor : t(rotuloDoMotivoDePerda(o.valor)) }));
  const opcoesDoMotivo = lead.lost_reason && !opcoesBase.some((o) => o.valor === lead.lost_reason)
    ? [{ valor: lead.lost_reason, rotulo: t(rotuloDoMotivoDePerda(lead.lost_reason)) }, ...opcoesBase]
    : opcoesBase;

  const reabrir = () => {
    const destino = etapaParaReabrir(stages, lead.status);
    if (!destino) return toast.error(t("Não há etapa aberta para reabrir este negócio."));
    mover.mutate({ leadId: lead.id, stageId: destino, positionInStage: 0, expectedUpdatedAt: lead.updated_at });
  };
  const dica = !pode ? t("As permissões de usuários não permitem você trocar de status.") : ocupado ? t("Salvando…") : undefined;

  return (
    <div className="rounded-[8px] border border-casca-borda p-4">
      <div className="flex items-center justify-between gap-2 text-[12px] text-casca-suave">
        <span className="flex min-w-0 items-center gap-1">
          {negocio?.origem.grupo ? (<><span className="truncate">{negocio.origem.grupo}</span><ChevronRight size={12} aria-hidden className="shrink-0" /></>) : null}
          <span className="truncate font-medium text-casca-texto">{negocio?.origem.nome ?? pipeline.name}</span>
        </span>
        <Link href={rotaDoNegocio(lead.id, "", {})} aria-label={t("Ir para negócio")} title={t("Ir para negócio")} className="grid size-6 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia">
          <ExternalLink size={14} aria-hidden />
        </Link>
      </div>
      <div className="mt-3 flex gap-0.5" aria-hidden>
        {abertas.map((s, i) => (
          <span key={s.id} className={cn("h-1 flex-1 rounded-[2px]", i <= indice ? "bg-casca-marca" : "bg-casca-borda")} />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Popover open={etapaAberta} onOpenChange={setEtapaAberta}>
          <PopoverTrigger asChild>
            <button type="button" disabled={!pode || ocupado || perdido || lead.status === "won"} title={dica ?? (perdido || lead.status === "won" ? t("Reabra o negócio para mudar a etapa.") : undefined)} className="flex items-center gap-1 text-[12px] font-medium text-casca-texto disabled:cursor-not-allowed">
              {etapa?.name ?? t("Sem etapa")}
              <ChevronDown size={14} aria-hidden className="text-casca-chevron" />
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="start" className="max-h-[370px] w-[220px] overflow-y-auto p-1">
            <ul role="listbox" aria-label={t("Etapa")}>
              {abertas.map((s) => (
                <li key={s.id} role="option" aria-selected={s.id === lead.stage_id}>
                  <button type="button" onClick={() => { setEtapaAberta(false); if (s.id !== lead.stage_id) mover.mutate({ leadId: lead.id, stageId: s.id, positionInStage: 0, expectedUpdatedAt: lead.updated_at }); }} className={cn("flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[12px]", s.id === lead.stage_id ? "bg-casca-raia text-casca-marca" : "text-casca-texto hover:bg-casca-raia")}>
                    {s.name}
                    {s.id === lead.stage_id ? <Check size={14} aria-hidden /> : null}
                  </button>
                </li>
              ))}
            </ul>
          </PainelSuspenso>
        </Popover>
        <span className="text-[11px] text-casca-suave">{`${indice + 1}/${abertas.length}`}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className={EYEBROW}>{t("Valor")}</p>
          <p className="mt-1 text-[13px] font-semibold text-casca-texto">{`R$ ${textoDeReais((lead.value_cents ?? 0) / 100)}`}</p>
        </div>
        <div>
          <p className={EYEBROW}>{t("Dono")}</p>
          <div className="mt-1 flex items-center gap-2">
            <DonoDaFicha key={`dono-${lead.id}`} lead={lead} pipelineId={pipeline.id} />
            <span className="truncate text-[12px] text-casca-texto">{dono.name ?? t("Sem responsável")}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" aria-pressed={lead.status === "won"} disabled={!pode || ocupado} title={dica} onClick={() => lead.status !== "won" && ganhar.mutate({ leadId: lead.id })} className={cn(BOTAO_DE_STATUS, lead.status === "won" ? "border-(--escale-status-ganho) text-(--escale-status-ganho)" : "border-casca-borda text-casca-texto hover:bg-casca-raia")}>
          {lead.status === "won" ? <CheckCircle2 size={14} aria-hidden /> : null}
          {t("Ganho")}
        </button>
        <button type="button" aria-pressed={perdido} disabled={!pode || ocupado} title={dica} onClick={() => !perdido && setPedindoMotivo(true)} className={cn(BOTAO_DE_STATUS, perdido || pedindoMotivo ? "border-casca-alerta text-casca-alerta" : "border-casca-borda text-casca-texto hover:bg-casca-raia")}>
          {perdido || pedindoMotivo ? <CircleX size={14} aria-hidden /> : null}
          {t("Perdido")}
        </button>
        <button type="button" aria-pressed={lead.status === "open"} disabled={!pode || ocupado} title={dica} onClick={() => { setPedindoMotivo(false); if (lead.status !== "open") reabrir(); }} className={cn(BOTAO_DE_STATUS, lead.status === "open" && !pedindoMotivo ? "border-casca-marca text-casca-marca" : "border-casca-borda text-casca-texto hover:bg-casca-raia")}>
          {lead.status === "open" && !pedindoMotivo ? <CheckCircle2 size={14} aria-hidden /> : null}
          {t("Aberto")}
        </button>
      </div>
      {pedindoMotivo || perdido ? (
        <div className="mt-2">
          <SeletorDaCasca
            aparencia="janela"
            className="h-8"
            valor={perdido ? (lead.lost_reason ?? "") : ""}
            opcoes={opcoesDoMotivo}
            vazio={t("Não informar")}
            aria-label={t("Motivo da perda")}
            desabilitado={perdido || perder.isPending}
            dica={perdido ? t("Para trocar o motivo, reabra o negócio.") : perder.isPending ? t("Salvando…") : undefined}
            aoMudar={(motivo) => { if (motivo) perder.mutate({ leadId: lead.id, lostReason: motivo }, { onSuccess: () => setPedindoMotivo(false) }); }}
          />
        </div>
      ) : null}
      {retomada ? (
        <RetomarComoNovoNegocioDialog open onOpenChange={(v: boolean) => !v && setRetomada(null)} leadId={retomada.leadId} stageId={retomada.stageId} pipelineId={pipeline.id} />
      ) : null}
    </div>
  );
}
```

Sobre "Não informar": a Clint mostra "Não informar" como a primeira opção do motivo (003). Se `opcoesDeMotivoDePerda` já incluir o valor padrão (`nao_informado` ou o literal que `lib/schemas/leads.ts` define como o motivo neutro), ele aparece na lista com o rótulo de `rotuloDoMotivoDePerda`; o `vazio="Não informar"` cobre o gatilho antes de escolher. Confira os literais em `lib/leads/motivos-de-perda-do-funil.ts` e ajuste o teste.

- [ ] **Step 5: O painel**

Create `components/escale/conversas/painel/SecoesDoPainel.tsx` (esqueleto desta task; a Task 9 preenche):

```tsx
"use client";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import type { SecoesVisiveis } from "@/lib/escale/conversas/secoes";

export function SecoesDoPainel(_props: {
  conversa: ConversationWithContact;
  quadro: QuadroDoNegocio | null;
  secoes: SecoesVisiveis;
  aoMudarSecoes: (s: Partial<SecoesVisiveis>) => void;
  aoAbrirConversa: (id: string | null) => void;
}) {
  return null;
}
```

Replace `components/escale/conversas/painel/PainelDoContato.tsx`:

```tsx
"use client";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { useNegocioDaConversa } from "@/hooks/escale/useNegocioDaConversa";
import { useGravarPreferencia, usePreferenciasDeConversas } from "@/hooks/escale/usePreferenciasDeConversas";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { Loader2, MessageCircle } from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "../centro/VazioDaCasca";
import { CabecalhoDoContato } from "./CabecalhoDoContato";
import { CartaoDoNegocio } from "./CartaoDoNegocio";
import { ProximoNegocioDaConversa } from "./ProximoNegocioDaConversa";
import { SecoesDoPainel } from "./SecoesDoPainel";

/** O contato da conversa no formato que a janela de novo negócio da 2A pede. */
function linhaDoContato(c: ConversationWithContact): LinhaDeContato | null {
  const contato = c.contacts;
  if (!contato?.id) return null;
  return {
    id: contato.id,
    nome: contato.name ?? contato.display_name ?? "",
    display_name: contato.display_name ?? null,
    telefone: contato.phone_number ?? null,
    email: null,
    instagram: null,
    tags: contato.tags ?? [],
    tem_foto: Boolean(contato.avatar_storage_path),
    conversa_id: c.id,
    negocios: 0,
    negocio_unico: null,
    status: "ativo",
    ultima_atividade: null,
    criado_em: c.created_at,
    origem: "manual",
    nascimento: null,
    links: {},
  } as LinhaDeContato;
}

/**
 * O PAINEL DIREITO (fork Escale, Fase 3A; D1–D11; c01, c02, c48). Vazio sem
 * conversa; com conversa, "Próximo negócio", o cabeçalho do contato, NEGÓCIOS
 * e as seções. O negócio vem do cache do quadro (N9).
 */
export function PainelDoContato({
  conversa,
  aoAbrirConversa,
  origens,
}: {
  conversa: ConversationWithContact | null;
  aoAbrirConversa: (id: string | null) => void;
  origens: OrigemParaCriar[];
}) {
  const t = useT();
  const contactId = conversa?.contacts?.id ?? conversa?.contact_id ?? null;
  const negocio = useNegocioDaConversa(conversa ? contactId : null);
  const preferencias = usePreferenciasDeConversas();
  const gravar = useGravarPreferencia();

  if (!conversa) {
    return (
      <div className="flex h-full flex-col px-4">
        <ProximoNegocioDaConversa lead={null} stages={[]} leads={[]} aoAbrirConversa={aoAbrirConversa} />
        <VazioDaCasca
          className="flex-1"
          icone={MessageCircle}
          titulo={t("Nenhuma conversa selecionada")}
          texto={<>{t("Selecione uma conversa")}<br />{t("para carregar as")}<br />{t("informações do contato")}</>}
        />
      </div>
    );
  }
  if (negocio.erro) {
    return (
      <div className="flex h-full flex-col px-4">
        <ProximoNegocioDaConversa lead={null} stages={[]} leads={[]} aoAbrirConversa={aoAbrirConversa} />
        <p className="pt-6 text-center text-[12px] text-casca-suave">{t("Não foi possível carregar as informações do contato.")}</p>
      </div>
    );
  }
  const quadro = negocio.quadro;
  return (
    <div className="flex h-full flex-col overflow-y-auto px-4" data-testid="painel-do-contato">
      <ProximoNegocioDaConversa lead={quadro?.lead ?? null} stages={quadro?.stages ?? []} leads={quadro?.leads ?? []} aoAbrirConversa={aoAbrirConversa} />
      <CabecalhoDoContato conversa={conversa} lead={quadro?.lead ?? null} pipelineId={quadro?.pipeline.id ?? null} />
      {negocio.carregando && !quadro ? (
        <p className="flex items-center gap-2 pb-4 text-[12px] text-casca-suave"><Loader2 size={14} aria-hidden className="animate-spin" />{t("Carregando…")}</p>
      ) : (
        <CartaoDoNegocio
          lead={quadro?.lead ?? null}
          pipeline={quadro?.pipeline ?? null}
          stages={quadro?.stages ?? []}
          negocios={negocio.negocios}
          aoEscolher={negocio.escolher}
          contato={linhaDoContato(conversa)}
          origens={origens}
        />
      )}
      <SecoesDoPainel
        conversa={conversa}
        quadro={quadro}
        secoes={preferencias.data.secoes}
        aoMudarSecoes={(s) => gravar.mutate({ chave: "secoes", valor: s })}
        aoAbrirConversa={aoAbrirConversa}
      />
    </div>
  );
}
```

Confira os campos obrigatórios de `LinhaDeContato` em `lib/escale/contatos/lista.ts` e complete `linhaDoContato` com os que faltarem (o `as LinhaDeContato` cobre o tipo, mas a janela lê `nome`, `display_name`, `telefone` e `id`).

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-painel-do-contato.test.tsx tests/unit/escale-conversas-casca.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/conversas/painel hooks/escale/useNegocioDaConversa.ts tests/unit/escale-painel-do-contato.test.tsx && corepack pnpm eslint components/escale/conversas/painel hooks/escale/useNegocioDaConversa.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/escale/conversas/painel hooks/escale/useNegocioDaConversa.ts tests/unit/escale-painel-do-contato.test.tsx
git commit -m "feat(escale): painel direito — Próximo negócio, cabeçalho do contato e o cartão do negócio (Fase 3A)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 9: As seções — a lista, "Seções visíveis", a moldura aberta, e Contato, Empresa e Notas

**Files:**
- Create: `components/escale/conversas/painel/SecaoAberta.tsx`, `components/escale/conversas/painel/secoes/SecaoContato.tsx`, `components/escale/conversas/painel/secoes/SecaoEmpresa.tsx`, `components/escale/conversas/painel/secoes/SecaoNotas.tsx`, `components/escale/conversas/painel/secoes/CampoDaSecao.tsx`, `tests/unit/escale-painel-secoes.test.tsx`
- Modify (substituir o esqueleto): `components/escale/conversas/painel/SecoesDoPainel.tsx`

**Interfaces:**
- Consumes: `SECOES`, `ROTULO_DA_SECAO`, `secoesParaMostrar`, `ehSecoesPadrao`, `InterruptorDaCasca`, `PainelSuspenso`, `useContact`, `useGravarContato`, `EditorDeCampo`, `patchDoContato`, `CHAVE_NOME`/`CHAVE_EMAIL`/`CHAVE_TELEFONE`, `TIPOS_DE_LINK`/`chaveDoLink`/`lerLinks` (`lib/leads/links-de-contato`), `TagsDaFicha`, `useNotasDoNegocio`, `JanelaDeNota`, `useAtividadesDoNegocio` (só a contagem de atrasadas no cartão de Atividades), `VazioDaCasca`.
- Produces:
  - `SecoesDoPainel({ conversa, quadro, secoes, aoMudarSecoes, aoAbrirConversa })` — a lista de cartões (c15), o balão "SEÇÕES VISÍVEIS" (c49) e a troca para a seção aberta.
  - `SecaoAberta({ titulo, icone, aoVoltar, direita?, children })` — a moldura "‹ {Seção}".
  - `CampoDaSecao({ rotulo, children })` — rótulo 12px/500 + caixa.
  - `SecaoContato({ conversa, quadro })`, `SecaoEmpresa()`, `SecaoNotas({ quadro })`.
  - Os ícones das seções: `ICONE_DA_SECAO: Record<Secao, LucideIcon>` (`ClipboardList`, `User`, `Briefcase`, `Building2`, `StickyNote`, `Paperclip`, `Clock`, `MessageCircle`), exportado de `SecoesDoPainel.tsx`.

**Detalhes visuais (c02, c14, c15, c18, c19, c49):** as linhas "SEÇÕES", "Seção aberta", "Seção Notas" da tabela de medidas. O balão "SEÇÕES VISÍVEIS" tem 258px, título 10px/600 uppercase, 8 linhas de 36px com `InterruptorDaCasca`, e "Mostrar todas" 12px `casca-marca` no rodapé.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-painel-secoes.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { SECOES_PADRAO } from "@/lib/escale/conversas/secoes";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org1", role: "manager" }),
  useUser: () => ({ id: "u1" }),
  usePermission: () => true,
}));
vi.mock("@/hooks/escale/useAtividadesDoNegocio", () => ({
  useAtividadesDoNegocio: () => ({
    dados: { atividades: [
      { id: "a1", title: "Pré-qualificação", due_date: "2026-10-01T10:00:00Z", status: "pending", tipo: "tarefa" },
      { id: "a2", title: "Ligação 1", due_date: "2099-01-01T10:00:00Z", status: "pending", tipo: "ligacao" },
    ], modelos: [] },
    carregando: false, falhou: false, alternar: vi.fn(), excluir: vi.fn(), editar: vi.fn(), recarregar: vi.fn(),
  }),
}));
const gravarContato = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/hooks/escale/useGravarContato", () => ({ useGravarContato: () => ({ gravar: gravarContato }), ContatoNaoCarregado: class extends Error {} }));
vi.mock("@/hooks/contacts/useContact", () => ({
  useContact: () => ({ data: { data: { id: "ct1", name: "Neto Santos", email: "nettodagi@gmail.com", phone_number: "+5511997903216", tags: ["Janeiro/27"], custom_fields: {} } }, isError: false }),
}));
vi.mock("@/components/escale/negocio/TagsDaFicha", () => ({ TagsDaFicha: () => <span data-testid="tags" /> }));
const notas = vi.hoisted(() => ({ data: [] as unknown[], isLoading: false }));
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({ useNotasDoNegocio: () => notas, useCriarNota: () => ({ mutateAsync: vi.fn(), isPending: false }), useEditarNota: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("@/components/escale/negocio/JanelaDeNota", () => ({ JanelaDeNota: ({ aberta }: { aberta: boolean }) => (aberta ? <div data-testid="janela-de-nota" /> : null) }));
vi.mock("@/components/escale/conversas/painel/secoes/SecaoAtividades", () => ({ SecaoAtividades: () => <div data-testid="secao-atividades" /> }));
vi.mock("@/components/escale/conversas/painel/secoes/SecaoNegocio", () => ({ SecaoNegocio: () => <div data-testid="secao-negocio" /> }));
vi.mock("@/components/escale/conversas/painel/secoes/SecaoAnexos", () => ({ SecaoAnexos: () => <div data-testid="secao-anexos" /> }));
vi.mock("@/components/escale/conversas/painel/secoes/SecaoHistorico", () => ({ SecaoHistorico: () => <div data-testid="secao-historico" /> }));
vi.mock("@/components/escale/conversas/painel/secoes/SecaoConversas", () => ({ SecaoConversas: () => <div data-testid="secao-conversas" /> }));

import { SecoesDoPainel } from "@/components/escale/conversas/painel/SecoesDoPainel";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const conversa = { id: "cv1", contact_id: "ct1", contacts: { id: "ct1", display_name: "Neto Santos", name: null, phone_number: "+5511997903216", tags: [] } } as unknown as ConversationWithContact;
const quadro = {
  lead: { id: "l1", pipeline_id: "p1", stage_id: "s1", status: "open", contact_id: "ct1", custom_fields: {}, value_cents: 0, currency: "BRL" },
  pipeline: { id: "p1", name: "Obra Futura", settings: {} },
  stages: [{ id: "s1", name: "1. Entrada Lead", position: 1, is_won: false, is_lost: false, is_archived: false }],
  leads: [],
} as unknown as QuadroDoNegocio;

describe("SecoesDoPainel (c15, c49, c48)", () => {
  it("as 8 seções com o contador e '1 atrasada' em Atividades; sem negócio, sem Atividades e Negócio", () => {
    const { rerender } = envolver(<SecoesDoPainel conversa={conversa} quadro={quadro} secoes={SECOES_PADRAO} aoMudarSecoes={vi.fn()} aoAbrirConversa={vi.fn()} />);
    const lista = screen.getByRole("list", { name: "Seções" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(8);
    const atividades = within(lista).getByRole("button", { name: /Atividades/ });
    expect(atividades).toHaveTextContent("2");
    expect(atividades).toHaveTextContent("1 atrasada");
    rerender(<QueryClientProvider client={new QueryClient()}><SecoesDoPainel conversa={conversa} quadro={null} secoes={SECOES_PADRAO} aoMudarSecoes={vi.fn()} aoAbrirConversa={vi.fn()} /></QueryClientProvider>);
    expect(within(screen.getByRole("list", { name: "Seções" })).getAllByRole("listitem")).toHaveLength(6);
  });

  it("'Seções visíveis' liga e desliga; 'Mostrar todas' liga as 8", () => {
    const aoMudarSecoes = vi.fn();
    envolver(<SecoesDoPainel conversa={conversa} quadro={quadro} secoes={{ ...SECOES_PADRAO, notas: false }} aoMudarSecoes={aoMudarSecoes} aoAbrirConversa={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /^Notas/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Personalizar seções" }));
    fireEvent.click(screen.getByRole("switch", { name: "Notas" }));
    expect(aoMudarSecoes).toHaveBeenCalledWith({ notas: true });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar todas" }));
    expect(aoMudarSecoes).toHaveBeenLastCalledWith(SECOES_PADRAO);
  });

  it("abrir Contato mostra os campos e salva; 'Voltar' retorna", async () => {
    envolver(<SecoesDoPainel conversa={conversa} quadro={quadro} secoes={SECOES_PADRAO} aoMudarSecoes={vi.fn()} aoAbrirConversa={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Contato/ }));
    expect(screen.getByRole("heading", { name: "Contato" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Neto Santos")).toBeInTheDocument();
    expect(screen.getByDisplayValue("nettodagi@gmail.com")).toBeInTheDocument();
    expect(screen.getByTestId("tags")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("list", { name: "Seções" })).toBeInTheDocument();
  });

  it("Empresa é a moldura 'Clique aqui para adicionar'; Notas tem '+ Adicionar nota' e o vazio", () => {
    envolver(<SecoesDoPainel conversa={conversa} quadro={quadro} secoes={SECOES_PADRAO} aoMudarSecoes={vi.fn()} aoAbrirConversa={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Empresa/ }));
    expect(screen.getByText("Nome da empresa")).toBeInTheDocument();
    expect(screen.getByText("Clique aqui para adicionar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("button", { name: /^Notas/ }));
    expect(screen.getByText("Nenhuma nota ainda.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar nota" }));
    expect(screen.getByTestId("janela-de-nota")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-painel-secoes.test.tsx`
Expected: FAIL.

- [ ] **Step 3: A moldura, o campo e a lista com o balão**

Create `components/escale/conversas/painel/SecaoAberta.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { ChevronLeft, type LucideIcon } from "@/lib/ui/icons-da-casca";

/** A moldura de uma seção aberta (c14): "‹ {Seção} [ícone]" e o que a seção tem à direita. */
export function SecaoAberta({
  titulo,
  icone: Icone,
  aoVoltar,
  direita,
  children,
}: {
  titulo: string;
  icone: LucideIcon;
  aoVoltar: () => void;
  direita?: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2">
        <button type="button" aria-label={t("Voltar")} title={t("Voltar")} onClick={aoVoltar} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto">
          <ChevronLeft size={16} aria-hidden />
        </button>
        <h3 className="flex items-center gap-2 text-[14px] font-medium text-casca-texto">
          {titulo}
          <Icone size={14} aria-hidden className="text-casca-marca" />
        </h3>
        <span className="ml-auto flex items-center gap-1">{direita}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 pt-3 pb-6">{children}</div>
    </section>
  );
}
```

Create `components/escale/conversas/painel/secoes/CampoDaSecao.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";

/** Rótulo 12px/500 e a caixa de 36px (c14, c17). */
export function CampoDaSecao({ rotulo, children }: { rotulo: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-casca-texto">{rotulo}</span>
      <div className="[&_input]:h-9 [&_[role=combobox]]:h-9">{children}</div>
    </div>
  );
}
```

Replace `components/escale/conversas/painel/SecoesDoPainel.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useAtividadesDoNegocio } from "@/hooks/escale/useAtividadesDoNegocio";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { ROTULO_DA_SECAO, SECOES, SECOES_PADRAO, secoesParaMostrar, type Secao, type SecoesVisiveis } from "@/lib/escale/conversas/secoes";
import type { Lead } from "@/lib/types/leads";
import { Briefcase, Building2, ChevronRight, ClipboardList, Clock, MessageCircle, Paperclip, SlidersHorizontal, StickyNote, User, type LucideIcon } from "@/lib/ui/icons-da-casca";

import { SecaoAnexos } from "./secoes/SecaoAnexos";
import { SecaoAtividades } from "./secoes/SecaoAtividades";
import { SecaoContato } from "./secoes/SecaoContato";
import { SecaoConversas } from "./secoes/SecaoConversas";
import { SecaoEmpresa } from "./secoes/SecaoEmpresa";
import { SecaoHistorico } from "./secoes/SecaoHistorico";
import { SecaoNegocio } from "./secoes/SecaoNegocio";
import { SecaoNotas } from "./secoes/SecaoNotas";

export const ICONE_DA_SECAO: Readonly<Record<Secao, LucideIcon>> = {
  atividades: ClipboardList,
  contato: User,
  negocio: Briefcase,
  empresa: Building2,
  notas: StickyNote,
  anexos: Paperclip,
  historico: Clock,
  conversas: MessageCircle,
};

/** Contagem e atrasadas de Atividades no cartão (c15, 02-009); só com negócio. */
function ContagemDeAtividades({ lead }: { lead: Lead }) {
  const t = useT();
  const { dados } = useAtividadesDoNegocio(lead);
  const pendentes = (dados?.atividades ?? []).filter((a) => a.status !== "done");
  const atrasadas = pendentes.filter((a) => a.due_date && Date.parse(a.due_date) < Date.now()).length;
  if (pendentes.length === 0) return null;
  return (
    <span className="flex items-center gap-2">
      <span className="rounded-full bg-casca-marca-suave px-1.5 text-[11px] font-semibold text-casca-marca">{pendentes.length}</span>
      {atrasadas > 0 ? (
        <span className="rounded-full bg-casca-atraso px-2 text-[11px] font-medium text-casca-alerta">
          {`${atrasadas} ${atrasadas === 1 ? t("atrasada") : t("atrasadas")}`}
        </span>
      ) : null}
    </span>
  );
}

/**
 * SEÇÕES (fork Escale, Fase 3A; D5–D10; 02-009, c15, c49). A lista de cartões,
 * o balão "Seções visíveis" (só liga e desliga) e a seção aberta no lugar da
 * lista. Sem negócio, Atividades e Negócio somem (c48).
 */
export function SecoesDoPainel({
  conversa,
  quadro,
  secoes,
  aoMudarSecoes,
  aoAbrirConversa,
}: {
  conversa: ConversationWithContact;
  quadro: QuadroDoNegocio | null;
  secoes: SecoesVisiveis;
  aoMudarSecoes: (s: Partial<SecoesVisiveis>) => void;
  aoAbrirConversa: (id: string | null) => void;
}) {
  const t = useT();
  const [aberta, setAberta] = useState<Secao | null>(null);
  const [balao, setBalao] = useState(false);
  useEffect(() => setAberta(null), [conversa.id]);
  const visiveis = secoesParaMostrar(secoes, quadro !== null);
  const voltar = () => setAberta(null);

  if (aberta && visiveis.includes(aberta)) {
    const comum = { conversa, quadro, aoVoltar: voltar };
    switch (aberta) {
      case "atividades": return quadro ? <SecaoAtividades quadro={quadro} aoVoltar={voltar} /> : null;
      case "contato": return <SecaoContato {...comum} />;
      case "negocio": return quadro ? <SecaoNegocio quadro={quadro} aoVoltar={voltar} /> : null;
      case "empresa": return <SecaoEmpresa aoVoltar={voltar} />;
      case "notas": return <SecaoNotas quadro={quadro} aoVoltar={voltar} />;
      case "anexos": return <SecaoAnexos conversa={conversa} quadro={quadro} aoVoltar={voltar} />;
      case "historico": return <SecaoHistorico quadro={quadro} aoVoltar={voltar} />;
      case "conversas": return <SecaoConversas conversa={conversa} aoAbrirConversa={aoAbrirConversa} aoVoltar={voltar} />;
    }
  }

  return (
    <section className="pb-6">
      <div className="flex h-8 items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">{t("Seções")}</span>
        <Popover open={balao} onOpenChange={setBalao}>
          <PopoverTrigger asChild>
            <button type="button" aria-label={t("Personalizar seções")} title={t("Personalizar seções")} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia">
              <SlidersHorizontal size={14} aria-hidden />
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="end" sideOffset={6} className="w-[258px] p-3">
            <p className="pb-2 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">{t("Seções visíveis")}</p>
            <ul>
              {SECOES.map((s) => (
                <li key={s} className="flex h-9 items-center justify-between text-[12px] text-casca-texto">
                  {t(ROTULO_DA_SECAO[s])}
                  <InterruptorDaCasca ligado={secoes[s]} aoMudar={(v) => aoMudarSecoes({ [s]: v })} aria-label={t(ROTULO_DA_SECAO[s])} />
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => aoMudarSecoes(SECOES_PADRAO)} className="mt-2 w-full text-center text-[12px] text-casca-marca hover:underline">
              {t("Mostrar todas")}
            </button>
          </PainelSuspenso>
        </Popover>
      </div>
      <ul aria-label={t("Seções")} className="flex flex-col gap-2">
        {visiveis.map((s) => {
          const Icone = ICONE_DA_SECAO[s];
          return (
            <li key={s}>
              <button type="button" onClick={() => setAberta(s)} className="flex h-11 w-full items-center gap-2 rounded-[8px] border border-casca-borda bg-surface px-4 text-left hover:bg-casca-raia">
                <Icone size={16} aria-hidden className="text-casca-suave" />
                <span className="flex-1 text-[13px] text-casca-texto">{t(ROTULO_DA_SECAO[s])}</span>
                {s === "atividades" && quadro ? <ContagemDeAtividades lead={quadro.lead} /> : null}
                <ChevronRight size={14} aria-hidden className="text-casca-chevron" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Contato, Empresa e Notas**

Create `components/escale/conversas/painel/secoes/SecaoContato.tsx`:

```tsx
"use client";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { EditorDeCampo } from "@/components/escale/negocio/abas/EditorDeCampo";
import { TagsDaFicha } from "@/components/escale/negocio/TagsDaFicha";
import { useContact } from "@/hooks/contacts/useContact";
import { useGravarContato } from "@/hooks/escale/useGravarContato";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { phoneForDisplay } from "@/lib/channels/phone-variants";
import { CHAVE_EMAIL, CHAVE_NOME, CHAVE_TELEFONE, patchDoContato, type CampoEditavel } from "@/lib/escale/negocio/campos";
import { TIPOS_DE_LINK, chaveDoLink, lerLinks } from "@/lib/leads/links-de-contato";
import { Instagram } from "lucide-react";

import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";
import { CampoDaSecao } from "./CampoDaSecao";

/** A seção Contato (c14): Nome, Email, Telefone, Instagram e Tags, editáveis como na ficha (1H). */
export function SecaoContato({
  conversa,
  quadro,
  aoVoltar,
}: {
  conversa: ConversationWithContact;
  quadro: QuadroDoNegocio | null;
  aoVoltar: () => void;
}) {
  const t = useT();
  const contactId = conversa.contacts?.id ?? conversa.contact_id;
  const { data, isError } = useContact(contactId);
  const { gravar } = useGravarContato(contactId, quadro?.pipeline.id ?? "");
  const contato = data?.data ?? null;
  const links = useMemo(() => lerLinks(contato?.custom_fields ?? {}), [contato?.custom_fields]);
  const instagram = TIPOS_DE_LINK.find((l) => l.id === "instagram");

  const campos: CampoEditavel[] = [
    { chave: CHAVE_NOME, origem: "coluna", rotulo: t("Nome"), tipo: "text", valor: contato?.name ?? conversa.contacts?.display_name ?? null },
    { chave: CHAVE_EMAIL, origem: "coluna", rotulo: t("Email"), tipo: "email", valor: contato?.email ?? null },
    { chave: CHAVE_TELEFONE, origem: "coluna", rotulo: t("Telefone"), tipo: "phone", valor: phoneForDisplay(contato?.phone_number ?? conversa.contacts?.phone_number ?? null) || null },
    ...(instagram ? [{ chave: chaveDoLink(instagram.id), origem: "link" as const, rotulo: t("Instagram"), tipo: "url" as const, valor: links[instagram.id] ?? null }] : []),
  ];

  const aoSalvar = useCallback(
    async (campo: CampoEditavel, valor: unknown) => {
      if (!contato) throw new Error(t("Não consegui carregar o contato."));
      if (campo.origem === "coluna" && (campo.chave === CHAVE_EMAIL || campo.chave === CHAVE_TELEFONE) && valor == null) {
        throw new Error(t("Para apagar, use a ficha do contato."));
      }
      try {
        const enviou = await gravar((atual) => patchDoContato(atual, campo, valor));
        if (enviou) toast.success(t("As alterações foram salvas com sucesso."));
      } catch {
        throw new Error(t("Ocorreu um erro ao salvar o campo"));
      }
    },
    [contato, gravar, t],
  );

  return (
    <SecaoAberta titulo={t("Contato")} icone={ICONE_DA_SECAO.contato} aoVoltar={aoVoltar}>
      {isError ? <p className="text-[12px] text-casca-suave">{t("Não consegui carregar o contato.")}</p> : null}
      {campos.map((c) => (
        <CampoDaSecao key={c.chave} rotulo={c.chave === chaveDoLink("instagram") ? <span className="flex items-center gap-1"><Instagram size={14} aria-hidden className="text-casca-marca" />{c.rotulo}</span> : c.rotulo}>
          {contato ? (
            <EditorDeCampo campo={c} aoSalvar={(valor) => aoSalvar(c, valor)} />
          ) : (
            <input readOnly value={String(c.valor ?? "")} aria-label={c.rotulo} placeholder={t("Clique aqui para adicionar")} className="h-9 w-full rounded-casca-gatilho bg-casca-busca px-3 text-[13px] text-casca-texto placeholder:text-casca-meta" />
          )}
        </CampoDaSecao>
      ))}
      <CampoDaSecao rotulo={t("Tags")}>
        {quadro ? (
          <TagsDaFicha key={`tags-${quadro.lead.id}`} lead={quadro.lead} pipelineId={quadro.pipeline.id} />
        ) : (
          <p className="text-[12px] text-casca-meta">{(contato?.tags ?? []).join(" · ") || t("Sem tag")}</p>
        )}
      </CampoDaSecao>
    </SecaoAberta>
  );
}
```

Se `lucide-react` direto reprovar na cerca de ícones (ADR-05 do original vale só para `@/lib/ui/icons`; a casca importa de `@/lib/ui/icons-da-casca`), acrescente `Instagram` à linha nova de `lib/ui/icons-da-casca.ts` e importe de lá. Se o `TIPOS_DE_LINK` não tiver `id === "instagram"`, use a chave que ele tiver para o Instagram (`lib/leads/links-de-contato.ts`).

Create `components/escale/conversas/painel/secoes/SecaoEmpresa.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";

import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";
import { CampoDaSecao } from "./CampoDaSecao";

/** A seção Empresa (c18): só a moldura; o vínculo chega com a 2D (D9). */
export function SecaoEmpresa({ aoVoltar }: { aoVoltar: () => void }) {
  const t = useT();
  return (
    <SecaoAberta titulo={t("Empresa")} icone={ICONE_DA_SECAO.empresa} aoVoltar={aoVoltar}>
      <CampoDaSecao rotulo={t("Nome da empresa")}>
        <button type="button" disabled title={t("Em breve")} className="flex h-9 w-full items-center rounded-casca-gatilho bg-casca-busca px-3 text-left text-[13px] text-casca-meta disabled:pointer-events-auto disabled:cursor-not-allowed">
          {t("Clique aqui para adicionar")}
        </button>
      </CampoDaSecao>
    </SecaoAberta>
  );
}
```

Create `components/escale/conversas/painel/secoes/SecaoNotas.tsx`:

```tsx
"use client";
import { useState } from "react";

import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";
import { useNotasDoNegocio } from "@/hooks/escale/useNotasDoNegocio";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useT } from "@/hooks/i18n/useT";
import { dataHoraBr } from "@/lib/escale/negocio/arquivos";
import { Plus, StickyNote } from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "../../centro/VazioDaCasca";
import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";

/** A seção Notas (c19): "+ Adicionar nota" e as notas do negócio (1H); sem negócio, só o aviso. */
export function SecaoNotas({ quadro, aoVoltar }: { quadro: QuadroDoNegocio | null; aoVoltar: () => void }) {
  const t = useT();
  const [nova, setNova] = useState(false);
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
  const leadId = quadro?.lead.id ?? "";
  const notas = useNotasDoNegocio(leadId);
  const lista = quadro ? (notas.data ?? []) : [];
  return (
    <SecaoAberta titulo={t("Notas")} icone={ICONE_DA_SECAO.notas} aoVoltar={aoVoltar}>
      <button type="button" disabled={!quadro} title={quadro ? undefined : t("Sem negócio")} onClick={() => setNova(true)} className="flex h-8 w-full items-center justify-center gap-1 rounded-casca-gatilho border border-casca-borda text-[12px] text-casca-marca hover:bg-casca-raia disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60">
        <Plus size={14} aria-hidden />
        {t("Adicionar nota")}
      </button>
      {lista.length === 0 ? (
        <VazioDaCasca className="pt-6" icone={StickyNote} titulo={t("Nenhuma nota ainda.")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => setEditando({ id: n.id, texto: n.texto })} className="w-full rounded-[8px] border border-casca-borda p-3 text-left hover:bg-casca-raia">
                <p className="line-clamp-4 whitespace-pre-wrap text-[12px] text-casca-texto">{n.texto}</p>
                <p className="mt-1 text-[11px] text-casca-suave">{`${dataHoraBr(n.created_at)}${n.user_nome ? ` ${t("por")} ${n.user_nome}` : ""}`}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {quadro ? (
        <>
          <JanelaDeNota leadId={quadro.lead.id} aberta={nova} onFechar={() => setNova(false)} />
          <JanelaDeNota leadId={quadro.lead.id} aberta={editando !== null} onFechar={() => setEditando(null)} nota={editando ?? undefined} />
        </>
      ) : null}
    </SecaoAberta>
  );
}
```

Crie também os esqueletos das cinco seções da Task 10 (cada um devolve a `SecaoAberta` só com o título), para o `SecoesDoPainel` compilar: `SecaoAtividades({ quadro, aoVoltar })`, `SecaoNegocio({ quadro, aoVoltar })`, `SecaoAnexos({ conversa, quadro, aoVoltar })`, `SecaoHistorico({ quadro, aoVoltar })`, `SecaoConversas({ conversa, aoAbrirConversa, aoVoltar })`.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-painel-secoes.test.tsx tests/unit/escale-painel-do-contato.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/conversas/painel tests/unit/escale-painel-secoes.test.tsx && corepack pnpm eslint components/escale/conversas/painel && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/escale/conversas/painel tests/unit/escale-painel-secoes.test.tsx
git commit -m "feat(escale): as seções do painel — lista, Seções visíveis, Contato, Empresa e Notas (Fase 3A)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 10: As seções Atividades, Negócio (com "Personalizar campos"), Anexos, Histórico e Conversas

**Files:**
- Create: `components/escale/conversas/painel/JanelaPersonalizarCampos.tsx`, `tests/unit/escale-painel-secoes-2.test.tsx`
- Modify (substituir os esqueletos): `components/escale/conversas/painel/secoes/SecaoAtividades.tsx`, `SecaoNegocio.tsx`, `SecaoAnexos.tsx`, `SecaoHistorico.tsx`, `SecaoConversas.tsx`

**Interfaces:**
- Consumes: `useAtividadesDoNegocio`, `gruposDaLista`, `horaDaTarefa`, `haQuantoTempo`, `rotaDoNegocio`, `CaixaDaCasca`, `useEditLead`, `useMoveCard`, `DonoDaFicha`, `EditorDeCampo`, `camposDoFunil`, `camposVisiveis`, `camposDisponiveis`, `lerCamposDoCartao`, `PREFIXO_CRM`, `usePreferenciasDeConversas`/`useGravarPreferencia`, `useArquivosDoContato`, `useEnviarArquivos`, `JanelaDeNovoDocumento`, `familiaDaExtensao`, `formatarTamanho`, `dataHoraBr`, `useHistoricoDoNegocio`, `useNotasDoNegocio`, `GRUPOS_DO_HISTORICO`, `secoesDoHistorico`, `CartaoDoHistorico`, `useConversasDoContato`, `ROTULO_DO_STATUS`/`classeDoStatus` (`lib/escale/negocio/conversas`), `FotoDaConversa`, `JanelaDaCasca`/`BotaoDaJanela`/`RodapeDaJanela`, `CaixaDaCasca`, `GripVertical`.
- Produces: as cinco seções e `JanelaPersonalizarCampos({ aberta, aoFechar, pipeline, campos, aoSalvar })`.

**Detalhes visuais (c16, c17, c50, c54, c20, 005):** as linhas "Seção Atividades", "Seção Conversas", "Seção Histórico" e "Personalizar campos" da tabela de medidas; Anexos (c50): busca "Pesquisar…" 32px, "Novo arquivo" de borda, "0.00 GB / 5.00 GB usados" 11px `casca-suave` (aqui: a soma dos tamanhos dos arquivos do contato em GB com duas casas e vírgula, e "5,00 GB" como teto, provisório: a Clint mostra a cota da conta), vazio "Nenhum arquivo encontrado · Envie arquivos para mantê-los junto deste contato." + "Novo arquivo".

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-painel-secoes-2.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR", useLocaleDeData: () => undefined }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org1", role: "manager", currency: "BRL" }),
  useUser: () => ({ id: "u1" }),
  usePermission: () => true,
}));
const alternar = vi.hoisted(() => vi.fn(async () => "concluida"));
vi.mock("@/hooks/escale/useAtividadesDoNegocio", () => ({
  useAtividadesDoNegocio: () => ({
    dados: { atividades: [
      { id: "a1", title: "Pré-qualificação", due_date: "2026-10-18T19:31:00Z", status: "pending", tipo: "tarefa" },
      { id: "a2", title: "Ligação 1", due_date: "2026-10-17T19:31:00Z", status: "pending", tipo: "ligacao" },
    ], modelos: [] },
    carregando: false, falhou: false, alternar, excluir: vi.fn(), editar: vi.fn(), recarregar: vi.fn(),
  }),
}));
const gravarPref = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/escale/usePreferenciasDeConversas", async () => {
  const { PREFERENCIAS_PADRAO } = await import("@/lib/escale/conversas/preferencias");
  return {
    usePreferenciasDeConversas: () => ({ data: PREFERENCIAS_PADRAO, isLoading: false }),
    useGravarPreferencia: () => ({ mutate: gravarPref, isPending: false }),
  };
});
const editar = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({ useEditLead: () => ({ mutate: vi.fn(), mutateAsync: editar, isPending: false }) }));
vi.mock("@/hooks/kanban/useMoveCard", () => ({ useMoveCard: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/components/escale/negocio/DonoDaFicha", () => ({ DonoDaFicha: () => <span data-testid="dono" /> }));
vi.mock("@/hooks/escale/useArquivosDoContato", () => ({
  useArquivosDoContato: () => ({ data: [], isLoading: false, isError: false }),
  useEnviarArquivos: () => ({ mutateAsync: vi.fn(async () => ({ enviados: 1, falhas: [] })) }),
  useExcluirArquivo: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/escale/useHistoricoDoNegocio", () => ({
  useHistoricoDoNegocio: () => ({ itens: [{ id: "h1", type: "contact_created", performed_at: "2026-10-11T14:50:03Z", payload: {}, source_module: "x", actor_kind: "user" }], isLoading: false, isError: false, temMais: false, carregarMais: vi.fn(), carregandoMais: false }),
}));
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({ useNotasDoNegocio: () => ({ data: [] }) }));
vi.mock("@/components/escale/negocio/abas/CartaoDoHistorico", () => ({ CartaoDoHistorico: ({ item }: { item: { id: string } }) => <li data-testid={`cartao-${item.id}`} /> }));
vi.mock("@/hooks/escale/useConversasDoContato", () => ({
  useConversasDoContato: () => ({ data: [
    { id: "cv1", status: "open", last_message_at: "2026-10-18T22:31:00Z", last_message_preview: "O atendente foi alterado", unread_count_for_assignee: 0, contacts: { id: "ct1", display_name: "Neto" }, channel_sessions: { provider: "meta_cloud" } },
    { id: "cv0", status: "closed", last_message_at: "2026-09-01T10:00:00Z", last_message_preview: "Obrigado", unread_count_for_assignee: 0, contacts: { id: "ct1", display_name: "Neto" }, channel_sessions: { provider: "waha" } },
  ], isLoading: false, isError: false }),
}));

import { SecaoAtividades } from "@/components/escale/conversas/painel/secoes/SecaoAtividades";
import { SecaoAnexos } from "@/components/escale/conversas/painel/secoes/SecaoAnexos";
import { SecaoConversas } from "@/components/escale/conversas/painel/secoes/SecaoConversas";
import { SecaoHistorico } from "@/components/escale/conversas/painel/secoes/SecaoHistorico";
import { SecaoNegocio } from "@/components/escale/conversas/painel/secoes/SecaoNegocio";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const quadro = {
  lead: { id: "l1", pipeline_id: "p1", stage_id: "s1", status: "open", contact_id: "ct1", custom_fields: { sdr: "Ana" }, value_cents: 150000, currency: "BRL", owner_user_id: "u1", updated_at: "2026-10-18T10:00:00Z" },
  pipeline: { id: "p1", name: "Obra Futura", settings: { custom_fields: [{ key: "sdr", label: "sdr", type: "text" }] } },
  stages: [{ id: "s1", name: "1. Entrada Lead", position: 1, is_won: false, is_lost: false, is_archived: false }, { id: "s2", name: "2. Contato", position: 2, is_won: false, is_lost: false, is_archived: false }],
  leads: [],
} as unknown as QuadroDoNegocio;
const conversa = { id: "cv1", contact_id: "ct1", contacts: { id: "ct1", display_name: "Neto" } } as unknown as ConversationWithContact;

describe("as seções (c16, c17, c50, c54, c20)", () => {
  it("Atividades: por dia, a caixinha conclui, o link do negócio", async () => {
    envolver(<SecaoAtividades quadro={quadro} aoVoltar={vi.fn()} />);
    expect(screen.getByText(/2 atividades|1 atividade/)).toBeInTheDocument();
    expect(screen.getByText("Pré-qualificação")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    expect(alternar).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /Criar, editar ou reagendar no negócio/ })).toHaveAttribute("href", expect.stringContaining("/app/negocios/l1"));
  });

  it("Negócio: Origem, Etapa, Dono, Valor, Status e Ir para negócio; Personalizar campos grava a lista", () => {
    envolver(<SecaoNegocio quadro={quadro} aoVoltar={vi.fn()} />);
    for (const r of ["Origem", "Etapa", "Dono", "Valor do negócio", "Status"]) expect(screen.getByText(r)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ir para negócio/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Personalizar campos" }));
    const janela = screen.getByRole("dialog");
    expect(within(janela).getByText("Campos disponíveis")).toBeInTheDocument();
    expect(within(janela).getByText("Informações básicas")).toBeInTheDocument();
    fireEvent.click(within(janela).getByRole("checkbox", { name: "sdr" }));
    expect(within(janela).getByText("6 campos")).toBeInTheDocument();
    fireEvent.click(within(janela).getByRole("button", { name: "Salvar campos" }));
    expect(gravarPref).toHaveBeenCalledWith({ chave: "campos_do_negocio", valor: ["origem", "etapa", "dono", "valor", "status", "crm:sdr"] });
  });

  it("Anexos vazio: a frase e Novo arquivo", () => {
    envolver(<SecaoAnexos conversa={conversa} quadro={quadro} aoVoltar={vi.fn()} />);
    expect(screen.getByText("Nenhum arquivo encontrado")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Novo arquivo/ }).length).toBeGreaterThan(0);
  });

  it("Histórico: o seletor 'Todos' e os cartões", () => {
    envolver(<SecaoHistorico quadro={quadro} aoVoltar={vi.fn()} />);
    expect(screen.getByRole("combobox", { name: "Selecione um grupo" })).toBeInTheDocument();
    expect(screen.getByTestId("cartao-h1")).toBeInTheDocument();
  });

  it("Conversas: as sessões com o selo, a atual marcada, clique seleciona", () => {
    const aoAbrirConversa = vi.fn();
    envolver(<SecaoConversas conversa={conversa} aoAbrirConversa={aoAbrirConversa} aoVoltar={vi.fn()} />);
    expect(screen.getByText("Em aberto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /O atendente foi alterado/ })).toHaveAttribute("aria-current", "true");
    fireEvent.click(screen.getByRole("button", { name: /Obrigado/ }));
    expect(aoAbrirConversa).toHaveBeenCalledWith("cv0");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-painel-secoes-2.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Atividades**

Replace `components/escale/conversas/painel/secoes/SecaoAtividades.tsx`:

```tsx
"use client";
import Link from "next/link";
import { toast } from "sonner";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useAtividadesDoNegocio } from "@/hooks/escale/useAtividadesDoNegocio";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { gruposDaLista, type AtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import { haQuantoTempo, horaDaTarefa, rotaDoNegocio } from "@/lib/escale/negocio/regras";
import { Calendar, ClipboardList, ExternalLink, Mail, MessageCircle, Phone, type LucideIcon } from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "../../centro/VazioDaCasca";
import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";

const ICONE_DO_TIPO: Record<string, LucideIcon> = {
  ligacao: Phone,
  email: Mail,
  agendamento: Calendar,
  reuniao: Calendar,
  whatsapp: MessageCircle,
  instagram: MessageCircle,
  tarefa: ClipboardList,
};

/** A seção Atividades (c16, 02-004): por dia, a caixinha conclui no card (D6), o link leva à ficha. */
export function SecaoAtividades({ quadro, aoVoltar }: { quadro: QuadroDoNegocio; aoVoltar: () => void }) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const ativ = useAtividadesDoNegocio(quadro.lead);
  const agora = new Date();
  const pendentes = (ativ.dados?.atividades ?? []).filter((a) => a.status !== "done");
  const grupos = gruposDaLista(pendentes, agora, idioma, t);
  const atrasadas = pendentes.filter((a) => a.due_date && Date.parse(a.due_date) < agora.getTime()).length;
  const href = rotaDoNegocio(quadro.lead.id, "", { aba: "atividades" });

  const concluir = async (a: AtividadeDoNegocio) => {
    try {
      const r = await ativ.alternar(a);
      toast.success(r === "concluida" ? t("Tarefa concluída com sucesso") : t("Marcação de tarefa removida com sucesso"));
    } catch {
      toast.error(t("Erro ao atualizar atividade. Tente novamente."));
    }
  };

  return (
    <SecaoAberta
      titulo={t("Atividades")}
      icone={ICONE_DA_SECAO.atividades}
      aoVoltar={aoVoltar}
      direita={
        <>
          {atrasadas > 0 ? <span className="rounded-full bg-casca-atraso px-2 text-[11px] font-medium text-casca-alerta">{`${atrasadas} ${atrasadas === 1 ? t("atrasada") : t("atrasadas")}`}</span> : null}
          <Link href={href} aria-label={t("Abrir negócio")} title={t("Abrir negócio")} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"><ExternalLink size={14} aria-hidden /></Link>
        </>
      }
    >
      {ativ.carregando ? (
        <p className="text-[12px] text-casca-suave">{t("Carregando…")}</p>
      ) : ativ.falhou ? (
        <p className="text-[12px] text-casca-suave">{t("Não foi possível carregar as atividades")}</p>
      ) : grupos.length === 0 ? (
        <VazioDaCasca className="pt-4" icone={ClipboardList} titulo={t("Nenhuma atividade para este negócio")} acao={<Link href={href} className="text-[12px] text-casca-marca hover:underline">{t("Criar atividade")}</Link>} />
      ) : (
        grupos.map((g) => (
          <div key={g.chave} className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-casca-texto">
              {g.rotulo ?? t("Sem prazo")}
              <span className="rounded-full bg-casca-raia px-2 text-[11px] font-normal text-casca-suave">{`${g.itens.length} ${g.itens.length === 1 ? t("atividade") : t("atividades")}`}</span>
            </p>
            {g.itens.map((a) => {
              const Icone = ICONE_DO_TIPO[a.tipo] ?? ClipboardList;
              return (
                <div key={a.id} className="flex h-12 items-center gap-3 rounded-[8px] border border-casca-borda px-3">
                  <Icone size={16} aria-hidden className="shrink-0 text-casca-marca" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[12px] font-medium text-casca-texto">{a.title}</span>
                    {a.due_date ? <span className="text-[11px] text-casca-suave">{`${horaDaTarefa(a.due_date, idioma)} · ${haQuantoTempo(a.due_date, agora, idioma)}`}</span> : null}
                  </span>
                  <CaixaDaCasca marcada={false} aoMudar={() => void concluir(a)} rotulo={`${t("Concluir")}: ${a.title}`} />
                </div>
              );
            })}
          </div>
        ))
      )}
      <Link href={href} className="flex items-center justify-center gap-1 pt-2 text-[11px] text-casca-marca hover:underline">
        {t("Criar, editar ou reagendar no negócio")}
        <ExternalLink size={12} aria-hidden />
      </Link>
    </SecaoAberta>
  );
}
```

Se `CaixaDaCasca` não aceitar `rotulo` como texto só para leitores de tela, use `aria-label` no elemento que ela expõe (confira `components/escale/ui/CaixaDaCasca.tsx`).

- [ ] **Step 4: Negócio e "Personalizar campos"**

Create `components/escale/conversas/painel/JanelaPersonalizarCampos.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";

import { BotaoDaJanela, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { CAMPOS_DO_CARTAO_PADRAO, camposDisponiveis, type CampoDisponivel } from "@/lib/escale/conversas/campos-do-cartao";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { Pipeline } from "@/lib/kanban/types";
import { ChevronDown, ChevronUp, GripVertical, Search, X } from "@/lib/ui/icons-da-casca";

const EYEBROW = "text-[11px] font-semibold tracking-wide text-casca-sobrelinha uppercase";

/**
 * "PERSONALIZAR CAMPOS · Negócio" (02-005): busca, os disponíveis com
 * caixinhas (Informações básicas + os campos do CRM da origem), os exibidos
 * em ordem (arraste pelo ponteiro ou ↑↓), "Restaurar padrão", Cancelar e
 * "Salvar campos". Nada vale sem "Salvar campos".
 */
export function JanelaPersonalizarCampos({
  aberta,
  aoFechar,
  pipeline,
  campos,
  aoSalvar,
}: {
  aberta: boolean;
  aoFechar: () => void;
  pipeline: Pipeline;
  campos: readonly string[];
  aoSalvar: (lista: string[]) => void;
}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<string[]>([...campos]);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [visto, setVisto] = useState(aberta);
  if (visto !== aberta) {
    setVisto(aberta);
    if (aberta) setLista([...campos]);
  }
  const disponiveis = useMemo(() => camposDisponiveis(camposDoFunil(pipeline.settings ?? null), t), [pipeline.settings, t]);
  const rotuloDe = (chave: string) => disponiveis.find((c) => c.chave === chave)?.rotulo ?? chave;
  const termo = busca.trim().toLowerCase();
  const filtrados = termo ? disponiveis.filter((c) => c.rotulo.toLowerCase().includes(termo)) : disponiveis;
  const basicos = filtrados.filter((c) => c.grupo === "basico");
  const doCrm = filtrados.filter((c) => c.grupo === "crm");

  const alternar = (c: CampoDisponivel, marcar: boolean) =>
    setLista((atual) => (marcar ? (atual.includes(c.chave) ? atual : [...atual, c.chave]) : atual.filter((x) => x !== c.chave)));
  const mover = (chave: string, para: number) =>
    setLista((atual) => {
      const de = atual.indexOf(chave);
      if (de === -1 || para < 0 || para >= atual.length) return atual;
      const sem = atual.filter((x) => x !== chave);
      return [...sem.slice(0, para), chave, ...sem.slice(para)];
    });

  const grupo = (titulo: string, itens: CampoDisponivel[]) =>
    itens.length === 0 ? null : (
      <div className="flex flex-col gap-1">
        <p className={`${EYEBROW} pt-2 pb-1`}>{titulo}</p>
        {itens.map((c) => (
          <div key={c.chave} className="flex h-10 items-center gap-3">
            <CaixaDaCasca marcada={lista.includes(c.chave)} aoMudar={(v) => alternar(c, v)} rotulo={c.rotulo} />
          </div>
        ))}
      </div>
    );

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(950px,calc(100vw-2rem))] gap-0 p-0">
      <div className="px-6 pt-6 pb-4">
        <p className="text-[11px] font-semibold tracking-wide text-casca-marca uppercase">{t("Personalizar campos")}</p>
        <h2 className="text-[18px] font-medium text-casca-texto">{t("Negócio")}</h2>
        <label className="relative mt-4 block">
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar por nome do campo…")} aria-label={t("Buscar por nome do campo…")} className="h-10 w-full rounded-casca-gatilho bg-casca-busca pr-9 pl-3 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca" />
          <Search size={16} aria-hidden className="absolute top-1/2 right-3 -translate-y-1/2 text-casca-suave" />
        </label>
      </div>
      <div className="grid h-[480px] grid-cols-[minmax(0,1fr)_360px] border-t border-casca-borda">
        <div className="overflow-y-auto px-6 py-4">
          <p className={EYEBROW}>{t("Campos disponíveis")}</p>
          {grupo(t("Informações básicas"), basicos)}
          {grupo(t("Campos do CRM"), doCrm)}
          {filtrados.length === 0 ? <p className="pt-4 text-[13px] text-casca-suave">{t("Nenhum campo encontrado.")}</p> : null}
        </div>
        <div className="overflow-y-auto border-l border-casca-borda px-4 py-4">
          <div className="flex items-center justify-between">
            <p className={EYEBROW}>{t("Exibidos · arraste")}</p>
            <span className="text-[12px] text-casca-suave">{`${lista.length} ${t("campos")}`}</span>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {lista.map((chave, i) => (
              <li
                key={chave}
                draggable
                onDragStart={() => setArrastando(chave)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (arrastando) mover(arrastando, i); setArrastando(null); }}
                className="flex h-11 items-center gap-2 rounded-casca-gatilho border border-casca-borda bg-surface px-3 text-[13px] text-casca-texto"
              >
                <GripVertical size={14} aria-hidden className="text-casca-meta" />
                <span className="flex-1 truncate">{rotuloDe(chave)}</span>
                <button type="button" aria-label={`${t("Subir")} ${rotuloDe(chave)}`} disabled={i === 0} title={i === 0 ? t("Já é o primeiro") : undefined} onClick={() => mover(chave, i - 1)} className="grid size-5 place-items-center text-casca-suave disabled:opacity-30"><ChevronUp size={12} aria-hidden /></button>
                <button type="button" aria-label={`${t("Descer")} ${rotuloDe(chave)}`} disabled={i === lista.length - 1} title={i === lista.length - 1 ? t("Já é o último") : undefined} onClick={() => mover(chave, i + 1)} className="grid size-5 place-items-center text-casca-suave disabled:opacity-30"><ChevronDown size={12} aria-hidden /></button>
                <button type="button" aria-label={`${t("Remover campo")} ${rotuloDe(chave)}`} onClick={() => setLista((a) => a.filter((x) => x !== chave))} className="grid size-5 place-items-center text-casca-suave hover:text-casca-texto"><X size={14} aria-hidden /></button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <RodapeDaJanela>
        <button type="button" onClick={() => setLista([...CAMPOS_DO_CARTAO_PADRAO])} className="mr-auto text-[13px] text-casca-marca hover:underline">{t("Restaurar padrão")}</button>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>{t("Cancelar")}</BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={() => { aoSalvar(lista); aoFechar(); }}>{t("Salvar campos")}</BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

Confira as props de `BotaoDaJanela` em `components/escale/origens/JanelaDaCasca.tsx` (a variante chama-se `variante`? `tipo`?) e ajuste.

Replace `components/escale/conversas/painel/secoes/SecaoNegocio.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { EditorDeCampo } from "@/components/escale/negocio/abas/EditorDeCampo";
import { DonoDaFicha } from "@/components/escale/negocio/DonoDaFicha";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { usePermission } from "@/hooks/auth/AuthProvider";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useGravarPreferencia, usePreferenciasDeConversas } from "@/hooks/escale/usePreferenciasDeConversas";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useMoveCard } from "@/hooks/kanban/useMoveCard";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import { PREFIXO_CRM, ROTULO_DO_CAMPO_BASICO, type CampoBasico } from "@/lib/escale/conversas/campos-do-cartao";
import type { CampoEditavel } from "@/lib/escale/negocio/campos";
import { etapaParaReabrir, rotaDoNegocio } from "@/lib/escale/negocio/regras";
import { resolveLeadOwner } from "@/lib/kanban/owner";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { camposVisiveis } from "@/lib/schemas/mostrar-quando";
import { ExternalLink, SlidersHorizontal } from "@/lib/ui/icons-da-casca";

import { JanelaPersonalizarCampos } from "../JanelaPersonalizarCampos";
import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";
import { CampoDaSecao } from "./CampoDaSecao";

const STATUS = ["open", "won", "lost"] as const;
const ROTULO_DO_STATUS: Record<(typeof STATUS)[number], string> = { open: "Aberto", won: "Ganho", lost: "Perdido" };

/** A seção Negócio (c17): os campos na ordem da pessoa (D7), editáveis; ⚙ abre "Personalizar campos". */
export function SecaoNegocio({ quadro, aoVoltar }: { quadro: QuadroDoNegocio; aoVoltar: () => void }) {
  const t = useT();
  const { lead, pipeline, stages } = quadro;
  const pode = usePermission("pipeline.move_card");
  const editar = useEditLead(pipeline.id);
  const mover = useMoveCard(pipeline.id);
  const { data: membros } = useAssignableMembers(true);
  const prefs = usePreferenciasDeConversas();
  const gravar = useGravarPreferencia();
  const [personalizando, setPersonalizando] = useState(false);
  const campos = prefs.data.campos_do_negocio;
  const defs = useMemo(() => camposDoFunil(pipeline.settings ?? null), [pipeline.settings]);
  const visiveis = useMemo(() => camposVisiveis(defs, lead.custom_fields ?? {}), [defs, lead.custom_fields]);
  const dono = resolveLeadOwner(lead, new Map((membros ?? []).map((m) => [m.user_id, m.full_name])));
  const abertas = stages.filter((s) => !s.is_archived && !s.is_won && !s.is_lost).sort((a, b) => a.position - b.position);

  const salvarCampo = useCallback(
    async (campo: CampoEditavel, valor: unknown) => {
      const patch = campo.chave === "valor"
        ? { value_cents: valor == null ? null : Math.round(Number(valor) * 100) }
        : { custom_fields: { [campo.chave]: valor } };
      try {
        await editar.mutateAsync({ leadId: lead.id, patch });
        toast.success(t("As alterações foram salvas com sucesso."));
      } catch {
        throw new Error(t("Ocorreu um erro ao salvar o campo"));
      }
    },
    [editar, lead.id, t],
  );

  const basico = (chave: CampoBasico) => {
    switch (chave) {
      case "origem":
        return <input readOnly value={pipeline.name} aria-label={t("Origem")} className="h-9 w-full rounded-casca-gatilho bg-casca-busca px-3 text-[13px] text-casca-texto" />;
      case "etapa":
        return (
          <SeletorDaCasca aparencia="janela" valor={lead.stage_id} opcoes={abertas.map((s) => ({ valor: s.id, rotulo: s.name }))} aria-label={t("Etapa")} desabilitado={!pode || lead.status !== "open" || mover.isPending} dica={lead.status !== "open" ? t("Reabra o negócio para mudar a etapa.") : undefined} buscaAPartirDe={99} aoMudar={(id) => { if (id && id !== lead.stage_id) mover.mutate({ leadId: lead.id, stageId: id, positionInStage: 0, expectedUpdatedAt: lead.updated_at }); }} />
        );
      case "dono":
        return (
          <div className="flex h-9 items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3 text-[13px] text-casca-texto">
            <DonoDaFicha key={`dono-${lead.id}`} lead={lead} pipelineId={pipeline.id} />
            <span className="truncate">{dono.name ?? t("Sem responsável")}</span>
          </div>
        );
      case "valor":
        return <EditorDeCampo campo={{ chave: "valor", origem: "coluna", rotulo: t("Valor do negócio"), tipo: "currency", valor: lead.value_cents == null ? null : lead.value_cents / 100 }} moeda={lead.currency ?? "BRL"} aoSalvar={(v) => salvarCampo({ chave: "valor", origem: "coluna", rotulo: "", tipo: "currency", valor: null }, v)} />;
      case "status":
        return (
          <SeletorDaCasca aparencia="janela" valor={lead.status} opcoes={STATUS.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_STATUS[s]) }))} aria-label={t("Status")} desabilitado buscaAPartirDe={99} dica={t("Use os botões do cartão para mudar o status.")} aoMudar={() => undefined} />
        );
    }
  };

  return (
    <SecaoAberta
      titulo={t("Negócio")}
      icone={ICONE_DA_SECAO.negocio}
      aoVoltar={aoVoltar}
      direita={
        <button type="button" aria-label={t("Personalizar campos")} title={t("Personalizar campos")} onClick={() => setPersonalizando(true)} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia">
          <SlidersHorizontal size={14} aria-hidden />
        </button>
      }
    >
      {campos.map((chave) => {
        if ((["origem", "etapa", "dono", "valor", "status"] as string[]).includes(chave)) {
          return <CampoDaSecao key={chave} rotulo={t(ROTULO_DO_CAMPO_BASICO[chave as CampoBasico])}>{basico(chave as CampoBasico)}</CampoDaSecao>;
        }
        const def = visiveis.find((d) => `${PREFIXO_CRM}${d.key}` === chave);
        if (!def) return null;
        const campo: CampoEditavel = { chave: def.key, origem: "crm", rotulo: def.label, tipo: def.type, valor: (lead.custom_fields ?? {})[def.key], opcoes: def.options };
        return (
          <CampoDaSecao key={chave} rotulo={def.label}>
            <EditorDeCampo campo={campo} moeda={lead.currency ?? "BRL"} aoSalvar={(v) => salvarCampo(campo, v)} />
          </CampoDaSecao>
        );
      })}
      {campos.length === 0 ? <p className="text-[12px] text-casca-suave">{t("Todos os campos estão ocultos. Use o botão de personalizar para exibi-los novamente.")}</p> : null}
      <Link href={rotaDoNegocio(lead.id, "", {})} className="flex items-center gap-1 pt-1 text-[12px] text-casca-marca hover:underline">
        {t("Ir para negócio")}
        <ExternalLink size={12} aria-hidden />
      </Link>
      <JanelaPersonalizarCampos aberta={personalizando} aoFechar={() => setPersonalizando(false)} pipeline={pipeline} campos={campos} aoSalvar={(lista) => gravar.mutate({ chave: "campos_do_negocio", valor: lista })} />
    </SecaoAberta>
  );
}
```

`etapaParaReabrir` fica importado para quem for ligar o status pelo seletor; se o eslint acusar import sem uso, remova-o (o status muda pelos botões do cartão, N12). Confira a assinatura de `rotaDoNegocio` em `lib/escale/negocio/regras.ts` (`(id, qs, { aba?, etapa? })`) e ajuste as chamadas.

- [ ] **Step 5: Anexos, Histórico e Conversas**

Replace `components/escale/conversas/painel/secoes/SecaoAnexos.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { JanelaDeNovoDocumento } from "@/components/escale/negocio/abas/JanelaDeNovoDocumento";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useArquivosDoContato, useEnviarArquivos } from "@/hooks/escale/useArquivosDoContato";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { dataHoraBr, familiaDaExtensao, formatarTamanho } from "@/lib/escale/negocio/arquivos";
import { CloudUpload, File, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, Paperclip, Search, type LucideIcon } from "@/lib/ui/icons-da-casca";

import { VazioDaCasca } from "../../centro/VazioDaCasca";
import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";

const ICONE: Record<string, LucideIcon> = { imagem: FileImage, planilha: FileSpreadsheet, audio: FileAudio, video: FileVideo, pacote: FileArchive, documento: FileText };
const COTA_GB = 5;
const gb = (bytes: number) => (bytes / 1024 ** 3).toFixed(2).replace(".", ",");

/** A seção Anexos (c50): busca, "Novo arquivo", o uso, a lista (1H) e o vazio da Clint. */
export function SecaoAnexos({ conversa, quadro, aoVoltar }: { conversa: ConversationWithContact; quadro: QuadroDoNegocio | null; aoVoltar: () => void }) {
  const t = useT();
  const contactId = conversa.contacts?.id ?? conversa.contact_id;
  const { data, isLoading, isError } = useArquivosDoContato(contactId);
  const enviar = useEnviarArquivos(contactId, quadro?.lead.id ?? null);
  const podeEnviar = usePermission("contact.update");
  const [busca, setBusca] = useState("");
  const [janela, setJanela] = useState(false);
  const lista = useMemo(() => (data ?? []).filter((a) => !busca.trim() || a.nome.toLowerCase().includes(busca.trim().toLowerCase())), [data, busca]);
  const usado = (data ?? []).reduce((n, a) => n + a.tamanho, 0);

  async function salvar(arquivos: File[]): Promise<File[]> {
    const r = await enviar.mutateAsync(arquivos);
    if (r.enviados > 0) toast.success(t("Arquivo(s) enviado(s) com sucesso"));
    for (const f of r.falhas) toast.error(`${f.nome}: ${f.mensagem ?? t("Erro ao enviar arquivo(s)")}`);
    return r.falhas.map((f) => f.arquivo);
  }
  const botaoNovo = (
    <button type="button" disabled={!podeEnviar} title={podeEnviar ? undefined : t("Sem permissão")} onClick={() => setJanela(true)} className="flex h-8 items-center justify-center gap-1 rounded-casca-gatilho border border-casca-borda px-3 text-[12px] text-casca-marca hover:bg-casca-raia disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60">
      <CloudUpload size={14} aria-hidden />
      {t("Novo arquivo")}
    </button>
  );

  return (
    <SecaoAberta titulo={t("Anexos")} icone={ICONE_DA_SECAO.anexos} aoVoltar={aoVoltar}>
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Pesquisar…")} aria-label={t("Pesquisar…")} className="h-8 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-3 text-[12px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca" />
          <Search size={14} aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
        </label>
        {botaoNovo}
      </div>
      <p className="text-[11px] text-casca-suave">{`${gb(usado)} GB / ${COTA_GB.toFixed(2).replace(".", ",")} GB ${t("usados")}`}</p>
      {isLoading ? (
        <p className="text-[12px] text-casca-suave">{t("Carregando…")}</p>
      ) : isError ? (
        <p className="text-[12px] text-casca-suave">{t("Não foi possível carregar os arquivos.")}</p>
      ) : lista.length === 0 ? (
        <VazioDaCasca className="pt-4" icone={Paperclip} titulo={t("Nenhum arquivo encontrado")} texto={t("Envie arquivos para mantê-los junto deste contato.")} acao={botaoNovo} />
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((a) => {
            const Icone = ICONE[familiaDaExtensao(a.extensao)] ?? File;
            return (
              <li key={a.id}>
                <a href={`/api/v1/contacts/${contactId}/arquivos/${a.id}`} className="flex h-12 items-center gap-3 rounded-[8px] border border-casca-borda px-3 hover:bg-casca-raia">
                  <Icone size={16} aria-hidden className="shrink-0 text-casca-marca" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[12px] font-medium text-casca-texto">{a.nome}</span>
                    <span className="text-[11px] text-casca-suave">{`${formatarTamanho(a.tamanho)} · ${dataHoraBr(a.created_at)}`}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <JanelaDeNovoDocumento aberta={janela} onFechar={() => setJanela(false)} aoSalvar={salvar} />
    </SecaoAberta>
  );
}
```

Confira a URL de download do arquivo na 1H (`app/api/v1/contacts/[id]/arquivos/[arquivoId]/route.ts`): se o GET devolver uma URL assinada em JSON em vez do arquivo, use o mesmo clique que a `AbaArquivos` usa (procure `baixar` em `components/escale/negocio/abas/AbaArquivos.tsx` e reaproveite).

Replace `components/escale/conversas/painel/secoes/SecaoHistorico.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";

import { CartaoDoHistorico } from "@/components/escale/negocio/abas/CartaoDoHistorico";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";
import { useHistoricoDoNegocio } from "@/hooks/escale/useHistoricoDoNegocio";
import type { QuadroDoNegocio } from "@/hooks/escale/useNegocioDaConversa";
import { useNotasDoNegocio } from "@/hooks/escale/useNotasDoNegocio";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { ROLE_RANK } from "@/lib/auth/types";
import { GRUPOS_DO_HISTORICO, type ChaveDoGrupo } from "@/lib/escale/negocio/historico";
import { secoesDoHistorico } from "@/lib/escale/negocio/regras";

import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";

/** A seção Histórico (c54, c57): o seletor "Todos" e os cartões da 1H; sem negócio, só o aviso. */
export function SecaoHistorico({ quadro, aoVoltar }: { quadro: QuadroDoNegocio | null; aoVoltar: () => void }) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const user = useUser();
  const org = useActiveOrg();
  const gerente = !!org && ROLE_RANK[org.role] >= ROLE_RANK.manager;
  const [grupo, setGrupo] = useState<ChaveDoGrupo>("todos");
  const leadId = quadro?.lead.id ?? "";
  const historico = useHistoricoDoNegocio(leadId, grupo);
  const notas = useNotasDoNegocio(leadId).data;
  const nomesDasEtapas = useMemo(() => Object.fromEntries((quadro?.stages ?? []).map((s) => [s.id, s.name])), [quadro?.stages]);
  const notaPorId = useMemo(() => new Map((notas ?? []).map((n) => [n.id, n])), [notas]);
  const secoes = useMemo(() => secoesDoHistorico(quadro ? historico.itens : [], new Date(), idioma), [quadro, historico.itens, idioma]);

  return (
    <SecaoAberta titulo={t("Histórico")} icone={ICONE_DA_SECAO.historico} aoVoltar={aoVoltar}>
      <SeletorDaCasca valor={grupo} opcoes={GRUPOS_DO_HISTORICO.map((g) => ({ valor: g.chave, rotulo: t(g.rotulo) }))} aria-label={t("Selecione um grupo")} buscaAPartirDe={99} className="h-8" aoMudar={(v) => setGrupo((v || "todos") as ChaveDoGrupo)} />
      {!quadro ? (
        <p className="text-[12px] text-casca-suave">{t("O histórico fica no negócio. Adicione um negócio para vê-lo aqui.")}</p>
      ) : historico.isLoading ? (
        <p className="text-[12px] text-casca-suave">{t("Carregando…")}</p>
      ) : historico.isError ? (
        <p className="text-[12px] text-casca-suave">{t("Não consegui carregar o histórico.")}</p>
      ) : secoes.length === 0 ? (
        <p className="text-[12px] text-casca-suave">{t("Os resultados não foram encontrados.")}</p>
      ) : (
        secoes.map((s) => (
          <section key={s.chave}>
            <h4 className="flex items-center gap-2 text-[11px] font-semibold text-casca-texto uppercase"><span>{t(s.rotulo)}</span><span className="font-normal text-casca-meta normal-case">{s.data}</span><span aria-hidden className="h-px flex-1 bg-casca-borda" /></h4>
            <ol className="mt-2 flex flex-col gap-2">
              {s.itens.map((item) => {
                const nota = item.type === "note" ? notaPorId.get(String(item.payload?.nota_id ?? "")) : undefined;
                return <CartaoDoHistorico key={item.id} item={item} nota={nota} notaRemovida={item.type === "note" && notas !== undefined && !nota} nomesDasEtapas={nomesDasEtapas} leadId={quadro.lead.id} podeEditarNota={!!nota && (gerente || nota.user_id === user.id)} />;
              })}
            </ol>
          </section>
        ))
      )}
      {quadro && historico.temMais ? (
        <div className="flex justify-center"><BotaoDaCasca variante="texto" tamanho="sm" onClick={historico.carregarMais} disabled={historico.carregandoMais}>{t("Carregar mais")}</BotaoDaCasca></div>
      ) : null}
    </SecaoAberta>
  );
}
```

Replace `components/escale/conversas/painel/secoes/SecaoConversas.tsx`:

```tsx
"use client";
import { useConversasDoContato } from "@/hooks/escale/useConversasDoContato";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { ROTULO_DO_STATUS, classeDoStatus } from "@/lib/escale/negocio/conversas";
import { dataDaMensagem } from "@/lib/escale/quadro/aparencia";
import { cn } from "@/lib/utils";

import { FotoDaConversa } from "../../fila/FotoDaConversa";
import { ICONE_DA_SECAO } from "../SecoesDoPainel";
import { SecaoAberta } from "../SecaoAberta";

/** A seção Conversas (c20): as sessões do contato (1H); clicar abre na própria tela. Os três modos chegam na 3E (F5). */
export function SecaoConversas({ conversa, aoAbrirConversa, aoVoltar }: { conversa: ConversationWithContact; aoAbrirConversa: (id: string | null) => void; aoVoltar: () => void }) {
  const t = useT();
  const contactId = conversa.contacts?.id ?? conversa.contact_id;
  const { data, isLoading, isError } = useConversasDoContato(contactId);
  const sessoes = data ?? [];
  return (
    <SecaoAberta titulo={t("Conversas")} icone={ICONE_DA_SECAO.conversas} aoVoltar={aoVoltar}>
      {isLoading ? (
        <p className="text-[12px] text-casca-suave">{t("Carregando…")}</p>
      ) : isError ? (
        <p className="text-[12px] text-casca-suave">{t("Não foi possível carregar as conversas.")}</p>
      ) : (
        <ul className="-mx-4">
          {sessoes.map((c) => {
            const atual = c.id === conversa.id;
            return (
              <li key={c.id}>
                <button type="button" aria-current={atual ? "true" : undefined} onClick={() => aoAbrirConversa(c.id)} className={cn("flex h-14 w-full items-center gap-3 px-4 text-left hover:bg-casca-raia", atual && "bg-casca-raia shadow-[inset_3px_0_0_var(--color-casca-marca)]")}>
                  <FotoDaConversa conversa={c} tamanho="secao" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center justify-between">
                      <span className={cn("rounded-sm px-1.5 py-px text-[11px] font-medium", classeDoStatus(c.status))}>{t(ROTULO_DO_STATUS[c.status as keyof typeof ROTULO_DO_STATUS] ?? c.status)}</span>
                      <span className="text-[11px] text-casca-meta">{dataDaMensagem(c.last_message_at)}</span>
                    </span>
                    <span className="truncate text-[12px] text-casca-texto-2">{c.last_message_preview ?? t("Sem mensagem")}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SecaoAberta>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-painel-secoes-2.test.tsx tests/unit/escale-painel-secoes.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/conversas/painel tests/unit/escale-painel-secoes-2.test.tsx && corepack pnpm eslint components/escale/conversas/painel && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/escale/conversas/painel tests/unit/escale-painel-secoes-2.test.tsx
git commit -m "feat(escale): seções Atividades, Negócio (Personalizar campos), Anexos, Histórico e Conversas (Fase 3A)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 11: Espanhol, os gates da fase, o PRD, o LOG e o PR

**Files:**
- Modify: `lib/i18n/dicionario.ts`, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md` (seção 8: 3A → "em execução"), `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`

- [ ] **Step 1: O espanhol**

Em `lib/i18n/dicionario.ts`, logo ANTES da linha `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`, um bloco novo com **todo** literal passado a `t()` nesta fase. Comece por este e complete com o que a cerca `i18n-espanhol-cobre-a-tela` acusar:

```ts
  // ─── FORK ESCALE · Fase 3A: fila e painel de Conversas ───
  "Conversas": { es: "Conversaciones" },
  "Nova conversa": { es: "Nueva conversación" },
  "Pesquisar": { es: "Buscar" },
  "Todos": { es: "Todos" },
  "Não lidas": { es: "No leídas" },
  "Meus em aberto": { es: "Mis abiertas" },
  "Em aberto": { es: "Abiertas" },
  "Em espera": { es: "En espera" },
  "Fechadas": { es: "Cerradas" },
  "Salvos": { es: "Guardados" },
  "Criar filtro": { es: "Crear filtro" },
  "Filtrar por": { es: "Filtrar por" },
  "Filtros": { es: "Filtros" },
  "Ordenar por": { es: "Ordenar por" },
  "Última interação": { es: "Última interacción" },
  "Esperando mais tempo": { es: "Esperando hace más tiempo" },
  "Mais": { es: "Más" },
  "Selecionar": { es: "Seleccionar" },
  "Ativar modo espião": { es: "Activar modo espía" },
  "Desativar modo espião": { es: "Desactivar modo espía" },
  "Personalizar visualização": { es: "Personalizar visualización" },
  "Modo espião ativo": { es: "Modo espía activo" },
  "abrir uma conversa não vai marcá-la como lida.": { es: "abrir una conversación no la marcará como leída." },
  "Desativar": { es: "Desactivar" },
  "Sem atendente": { es: "Sin agente" },
  "Atendente:": { es: "Agente:" },
  "Aguardando resposta há": { es: "Esperando respuesta hace" },
  "agora": { es: "ahora" },
  "min": { es: "min" },
  "Ontem": { es: "Ayer" },
  "Sem mensagens": { es: "Sin mensajes" },
  "Carregando mensagens...": { es: "Cargando mensajes..." },
  "Nenhuma conversa nos filtros": { es: "Ninguna conversación en los filtros" },
  "Ajuste os filtros": { es: "Ajusta los filtros" },
  "para ver conversas.": { es: "para ver conversaciones." },
  "Nenhuma conversa encontrada.": { es: "Ninguna conversación encontrada." },
  "Iniciar uma conversa": { es: "Iniciar una conversación" },
  "Erro ao carregar conversas.": { es: "Error al cargar las conversaciones." },
  "Esta é a conversa atual e ela não corresponde a visualização dos filtros.": { es: "Esta es la conversación actual y no corresponde a la vista de los filtros." },
  "Remover": { es: "Quitar" },
  "Atendente": { es: "Agente" },
  "Empresa": { es: "Empresa" },
  "Setor": { es: "Sector" },
  "Tempo sem resposta": { es: "Tiempo sin respuesta" },
  "Mensagens agendadas": { es: "Mensajes programados" },
  "Tags": { es: "Etiquetas" },
  "Permissão de chamada": { es: "Permiso de llamada" },
  "de": { es: "de" },
  "campos ativos": { es: "campos activos" },
  "No máximo 5 campos ativos": { es: "Como máximo 5 campos activos" },
  "Limites de alerta": { es: "Límites de alerta" },
  "Amarelo a partir de": { es: "Amarillo a partir de" },
  "Vermelho a partir de": { es: "Rojo a partir de" },
  "unidade": { es: "unidad" },
  "Minutos": { es: "Minutos" },
  "Horas": { es: "Horas" },
  "Dias": { es: "Días" },
  "Restaurar padrão": { es: "Restaurar predeterminado" },
  "Envie e receba mensagens dos seus clientes": { es: "Envía y recibe mensajes de tus clientes" },
  "Use o chat conectado": { es: "Usa el chat conectado" },
  "ao CRM e explore novas": { es: "al CRM y explora nuevas" },
  "experiências de atendimento.": { es: "experiencias de atención." },
  "Conecte um canal para começar a conversar": { es: "Conecta un canal para empezar a conversar" },
  "Você precisa adicionar um dispositivo ou uma conta para iniciar uma nova conversa.": { es: "Necesitas agregar un dispositivo o una cuenta para iniciar una nueva conversación." },
  "Conectar um canal": { es: "Conectar un canal" },
  "Crie ou selecione um contato": { es: "Crea o selecciona un contacto" },
  "Pesquise pelo nome, e-mail,": { es: "Busca por nombre, correo," },
  "telefone ou Instagram do contato": { es: "teléfono o Instagram del contacto" },
  "Pesquise pelo nome, e-mail, telefone ou Instagram do contato": { es: "Busca por nombre, correo, teléfono o Instagram del contacto" },
  "Criar": { es: "Crear" },
  "Contatos": { es: "Contactos" },
  "Nenhum contato encontrado.": { es: "Ningún contacto encontrado." },
  "Selecione um dispositivo ou conta": { es: "Selecciona un dispositivo o cuenta" },
  "Selecionar dispositivo ou conta": { es: "Seleccionar dispositivo o cuenta" },
  "A conversa sai por este dispositivo ou conta.": { es: "La conversación sale por este dispositivo o cuenta." },
  "Dispositivos": { es: "Dispositivos" },
  "WhatsApp Oficial": { es: "WhatsApp Oficial" },
  "Desconectado": { es: "Desconectado" },
  "Abrindo…": { es: "Abriendo…" },
  "Não foi possível abrir a conversa.": { es: "No se pudo abrir la conversación." },
  "Ficha": { es: "Ficha" },
  "Ficha do contato": { es: "Ficha del contacto" },
  "Conversa não encontrada ou fora do seu acesso.": { es: "Conversación no encontrada o fuera de tu acceso." },
  "Acompanhamento somente leitura": { es: "Seguimiento solo lectura" },
  "Próximo negócio": { es: "Próximo negocio" },
  "Negócio anterior": { es: "Negocio anterior" },
  "Não há negócio anterior": { es: "No hay negocio anterior" },
  "Não há próximo negócio": { es: "No hay próximo negocio" },
  "Navegue pela ordem dos seus negócios. Esta seleção não afeta os filtros gerais de atendimento.": { es: "Navega por el orden de tus negocios. Esta selección no afecta los filtros generales de atención." },
  "Sem negócio": { es: "Sin negocio" },
  "Nenhuma conversa selecionada": { es: "Ninguna conversación seleccionada" },
  "Selecione uma conversa": { es: "Selecciona una conversación" },
  "para carregar as": { es: "para cargar la" },
  "informações do contato": { es: "información del contacto" },
  "Não foi possível carregar as informações do contato.": { es: "No se pudo cargar la información del contacto." },
  "Abrir contato": { es: "Abrir contacto" },
  "Negócios": { es: "Negocios" },
  "Adicionar negócio": { es: "Agregar negocio" },
  "Selecionar negócio": { es: "Seleccionar negocio" },
  "Sem contato": { es: "Sin contacto" },
  "Ir para negócio": { es: "Ir al negocio" },
  "Sem etapa": { es: "Sin etapa" },
  "Reabra o negócio para mudar a etapa.": { es: "Reabre el negocio para cambiar la etapa." },
  "Use os botões do cartão para mudar o status.": { es: "Usa los botones de la tarjeta para cambiar el estado." },
  "Não informar": { es: "No informar" },
  "Motivo da perda": { es: "Motivo de la pérdida" },
  "Seções": { es: "Secciones" },
  "Seções visíveis": { es: "Secciones visibles" },
  "Personalizar seções": { es: "Personalizar secciones" },
  "Mostrar todas": { es: "Mostrar todas" },
  "atrasada": { es: "atrasada" },
  "atrasadas": { es: "atrasadas" },
  "atividade": { es: "actividad" },
  "atividades": { es: "actividades" },
  "Sem prazo": { es: "Sin plazo" },
  "Concluir": { es: "Concluir" },
  "Abrir negócio": { es: "Abrir negocio" },
  "Nenhuma atividade para este negócio": { es: "Ninguna actividad para este negocio" },
  "Criar atividade": { es: "Crear actividad" },
  "Criar, editar ou reagendar no negócio": { es: "Crear, editar o reprogramar en el negocio" },
  "Não foi possível carregar as atividades": { es: "No se pudieron cargar las actividades" },
  "Clique aqui para adicionar": { es: "Haz clic aquí para agregar" },
  "Para apagar, use a ficha do contato.": { es: "Para borrar, usa la ficha del contacto." },
  "Sem tag": { es: "Sin etiqueta" },
  "Nome da empresa": { es: "Nombre de la empresa" },
  "Adicionar nota": { es: "Agregar nota" },
  "Nenhuma nota ainda.": { es: "Ninguna nota todavía." },
  "por": { es: "por" },
  "Personalizar campos": { es: "Personalizar campos" },
  "Buscar por nome do campo…": { es: "Buscar por nombre del campo…" },
  "Campos disponíveis": { es: "Campos disponibles" },
  "Informações básicas": { es: "Información básica" },
  "Campos do CRM": { es: "Campos del CRM" },
  "Exibidos · arraste": { es: "Mostrados · arrastra" },
  "campos": { es: "campos" },
  "Subir": { es: "Subir" },
  "Descer": { es: "Bajar" },
  "Já é o primeiro": { es: "Ya es el primero" },
  "Já é o último": { es: "Ya es el último" },
  "Remover campo": { es: "Quitar campo" },
  "Salvar campos": { es: "Guardar campos" },
  "Nenhum campo encontrado.": { es: "Ningún campo encontrado." },
  "Todos os campos estão ocultos. Use o botão de personalizar para exibi-los novamente.": { es: "Todos los campos están ocultos. Usa el botón de personalizar para mostrarlos de nuevo." },
  "Origem": { es: "Origen" },
  "Etapa": { es: "Etapa" },
  "Dono": { es: "Responsable" },
  "Valor do negócio": { es: "Valor del negocio" },
  "Pesquisar…": { es: "Buscar…" },
  "usados": { es: "usados" },
  "Nenhum arquivo encontrado": { es: "Ningún archivo encontrado" },
  "Envie arquivos para mantê-los junto deste contato.": { es: "Envía archivos para mantenerlos junto a este contacto." },
  "Não foi possível carregar os arquivos.": { es: "No se pudieron cargar los archivos." },
  "O histórico fica no negócio. Adicione um negócio para vê-lo aqui.": { es: "El historial está en el negocio. Agrega un negocio para verlo aquí." },
  "Sem mensagem": { es: "Sin mensaje" },
```

Rode a cerca e complete o que faltar (literais que já existem em outro bloco não se repetem; a cerca acusa duplicata, se houver — nesse caso remova a linha daqui).

- [ ] **Step 2: Os gates da fase**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts tests/unit/vocabulario-do-funil.test.ts tests/unit/evidencia-citada.test.ts tests/unit/rota-le-todo-filtro-do-schema.test.ts tests/unit/badge-espelha-o-filtro.test.ts tests/unit/cron-routes-scheduled.test.ts tests/unit/manifest-x-migrations.test.ts $(ls tests/unit | grep -E '^escale-(conversas|fila|nova-conversa|painel)' | sed 's|^|tests/unit/|' | tr '\n' ' ')
corepack pnpm cercas
corepack pnpm typecheck && corepack pnpm eslint components/escale/conversas lib/escale/conversas hooks/escale app/api/v1/preferencias-de-conversas app/api/v1/negocios-do-contato
```

Expected: tudo verde. **Nada de `test:db` nem de rodada cheia aqui** (fim da Frente C).

- [ ] **Step 3: O PRD e o LOG (fora do repositório)**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md`, seção 8, a linha da 3A: `proposta` → `em execução (PR aberto em dd/mm)`; na linha 4 do cabeçalho, `Vira "aprovado" quando o usuário disser.` → `**Aprovado pelo usuário em 18/10/2026.**`

Em `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`: a entrada da 3A na linha do tempo (o que entrou, a migration 9201, as diferenças conhecidas da N15/N16/N21), e "Onde estamos" com a Frente C (worktree `wt-frente-c`).

- [ ] **Step 4: O PR e o merge**

```bash
git fetch escale-crm && git rebase escale-crm/main   # conflitos: manter os dois blocos
git push -u escale-crm feat/fase-3a-fila-e-painel
gh pr create --repo rgisjr/escale-crm --base main --title "feat(escale): Fase 3A — fila e painel direito de Conversas (igual à Clint)" --body-file <(cat <<'EOF'
## Fase 3A — fila e painel direito de Conversas

Itens A1–A13, A15 e D1–D11 do PRD de Conversas (`docs/escale/modulos/3-conversas.md`). Com a casca ligada, `/app/inbox` vira a tela da Clint: fila (busca, presets, ordem, ⋮ com modo espião e Personalizar visualização, a linha da Clint, a conversa fixada), os estados do centro, "Nova conversa", e o painel direito (Próximo negócio, cabeçalho do contato, cartão do negócio, as 8 seções com Seções visíveis e Personalizar campos). Sem a casca, nada muda.

- Migration **9201** (`crm_preferencias_de_conversas`).
- Encaixes no original: `app/app/inbox/page.tsx` (cookie), `lib/schemas/messaging.ts` + `conversations/route.ts` + `_handler.ts` (`snoozed`, `ordem`), `baseline.sql`, `dicionario.ts`, `actions.ts`, varredura de RLS, ícones, tokens.
- O cabeçalho, a thread e o compositor continuam os do original (a 3B os troca).

## Verificação
- [x] testes da fase, cercas, typecheck e eslint verdes
- [ ] `test:db` e rodada cheia: no fim da Frente C (regra de 18/10)
- [ ] conferência visual: no fim da Frente C

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
gh pr merge --repo rgisjr/escale-crm --merge --delete-branch=false <número>
```

A tag e a release ficam para o fim da Frente C. Em seguida, a 3B nasce da `escale-crm/main` na mesma worktree (`git switch -c feat/fase-3b-conversa-aberta escale-crm/main`).

## Fora desta fase (registrado)

- O funil de filtros, "Criar filtro", "Selecionar" e as ações em massa: **3D**.
- O ⚙ do hub, o setor na linha e no cabeçalho, "Usuários e Permissões", "Respostas rápidas": **3C**.
- O cabeçalho, a barra de status (Em espera/Encerrar), a thread e o compositor da Clint, "Marcar como não lida", mensagens agendadas (⏱ n), "Pausar automação", a permissão de chamada na linha: **3B**.
- Os três modos da seção Conversas, a conversa dentro do painel flutuante e da ficha, a criação de negócio por dispositivo: **3E**.
- A seção Empresa com vínculo: **2D**. E-mail e Agendar nas ações rápidas: "Em breve" até os módulos deles.
- Diferenças declaradas da linha (N15): sem ícones de voz/documento e sem os eventos "⇄" na prévia; da seção Anexos: a cota "5,00 GB" é fixa (a Clint mostra a cota da conta).

## Self-review (18/10)

1. **Cobertura do PRD:** A1 (Task 5, N17/N20), A2 (Task 5), A3 (Task 6), A4 presets (Tasks 1, 3, 6), A5 (Tasks 1, 3, 6), A6 (Task 6), A7 (Tasks 1, 6; N15), A8 (Tasks 1, 2, 3, 4, 6), A9 (Tasks 1, 4, 5), A10 (Task 6: o selo 99+ no preset; o do menu do topo já existe, `ContadorDaFilaDaCasca`), A11 (Tasks 5, 6), A12 (Task 7), A13 (Task 8), A15 (Tasks 5, 6), D1 (Task 8), D2 (Task 8), D3 (Task 8), D5 (Task 9), D6 (Task 10), D7 (Tasks 1, 10), D8 (Task 9), D9 (Task 9), D10 (Tasks 9, 10), D11 (Task 8). D4 é da 3B. ✔
2. **Placeholders:** nenhum "TBD"; onde o plano depende de um detalhe do código que não foi lido linha a linha (props de `BotaoDaJanela`, `CaixaDaCasca`, `rotaDoNegocio`, a URL de download do arquivo, `TIPOS_DE_LINK`), o passo diz o que conferir e onde. ✔
3. **Tipos entre tasks:** `FiltrosDaFila` (Task 1) é o que `useFilaDeConversas` (Task 4) e `ConversasDaCasca` (Task 5) usam; `Preferencias`/`Gravacao` (Task 2) são o que a rota (Task 3), o hook (Task 4), o painel (Tasks 6, 8, 9, 10) usam; `QuadroDoNegocio` (Task 8) é o que as seções (Tasks 9, 10) recebem; `NegocioDoContato` (Task 3) é o que o hook (Task 4) e o cartão (Task 8) usam; `VazioDaCasca` (Task 5) é o molde de todos os vazios. ✔
