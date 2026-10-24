# Fase 8A — Lista de campanhas como na Clint (aba WhatsApp) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** A1 a A14 de `docs/modulos/8-campanhas.md` (seção 4, tabela A), a seção 5 (permissões: gerente vê Campanhas; admin vê a aba Prospecção), a seção 6 (filtros da lista e os status com os rótulos e as cores da Clint) e a seção 7 (as ações novas do motor: voltar a rascunho, alterar horário, excluir rascunho).
> **Frente B**, worktree `wt-frente-b`, migration **9301**, um PR. Depende só do que já está na `main` (2F e 3D mergeadas: a 8A reaproveita o `SeletorDoFiltro` da 3D).

## Decisões do usuário (19/10)

| # | Pergunta | Decisão | Onde vale |
|---|---|---|---|
| R1 | PRD 8 | Aprovado | tudo |
| R5 | Frente | Frente B, faixa 9300–9399 | N1 |
| R7 | Prospecção | Aba dentro de Campanhas (molde novo só na 8D) | N2 |
| Regra de 17/10 | Formatos | Datas dd/mm/aaaa hh:mm, números 1.234, mesmo onde a Clint não segue | N6, N8 |

**Prints que faltam nesta fase** (seção 11 do PRD; nenhum bloqueia, o plano segue o código da Clint e marca como provisório):
1. ❌ Linha **em andamento** (Pausar) e **pausada** (Retomar). Provisório: um botão de ícone de 28px antes do ⋮ — contornado com `CirclePause` para pausar, cheio na cor da marca com `Play` para retomar (material 2.1: "o ícone vira botão 'Pausar campanha'"; "Pausada: botão sólido 'Retomar campanha'"). Listras animadas na barra em andamento (material 6).
2. ❌ Menu ⋮ de **rascunho** e de **agendada**. Provisório: os itens da tabela do material 2.1, no mesmo molde do 09-007 (abre em cima à direita, ícone 14px, destrutivos em vermelho).
3. ❌ Janela **"Alterar horário do disparo"**. Provisório: a `JanelaDeConfirmacao` da casca com os textos da Clint e o `SeletorDeDataEHora` da casca (a Clint usa o `datetime-local` nativo, que a regra 2 do CLAUDE.md proíbe).
4. ❌ **Vazio por filtro** e vazio da aba WhatsApp. Provisório: os textos do código da Clint no molde do 09-014 (quadrado 56px, título 15px, texto em coluna estreita, botão contornado).
5. ❌ **Dicas** dos segmentos vermelho, verde-escuro e da ponta, e a do selo de status. Provisório: a pílula do 09-008 com a cor de fundo clara do próprio segmento; a do selo em fundo escuro.

**Perguntas ao usuário (não bloqueiam):**
- **A14 — Configuração:** a engrenagem abre a tela de configuração que já existe (padrões, textos salvos, lista de exclusão), com o visual do original. Refazê-la com o visual da casca é uma tela inteira (não há print da Clint, ela não tem essa tela). Proposta: fica assim na 8A e a casca entra na 8B, junto com o passo 3 do assistente, que reaproveita os mesmos campos de ritmo. Aceita?

**Goal:** Com a casca ligada, `/app/campaigns` vira a lista de campanhas da Clint: cabeçalho "WhatsApp" com "Enviar WhatsApp" e a engrenagem, abas WhatsApp e Prospecção (esta só para admin), barra de filtros (busca, data do agendamento, data de criação, status, número), "RESUMO DAS CAMPANHAS" com os 5 cartões, a tabela com a barra de resultado segmentada, o selo de status, Pausar/Retomar na linha e o menu ⋮ por status (alterar horário, cancelar para rascunho, cancelar, editar rascunho, excluir rascunho, duplicar), paginação de 10, os estados carregando/vazio/vazio por filtro/erro, e a lista se atualiza sozinha.

**Architecture:**
- **O banco filtra, pagina e conta** (migration 9301, funções `security invoker` que só respondem a gerente ou acima): `fn_escale_campanha_passa` (o filtro), `fn_escale_contagem_de_campanhas` (as contagens por carimbo cumulativo de um conjunto de campanhas), `fn_escale_lista_de_campanhas` (a página, o total e as contagens) e `fn_escale_resumo_das_campanhas` (as contagens somadas, sem rascunhos e canceladas). A mesma função de filtro serve à lista e ao resumo: os dois nunca discordam.
- **As rotas do fork** `GET /api/v1/campanhas-da-casca` e `/resumo` (gerente, sessão do usuário, fuso da organização), `POST /api/v1/campanhas-da-casca/[id]/reagendar|rascunho` e `DELETE /api/v1/campanhas-da-casca/[id]` (gerente, client admin, como as rotas do original). Pausar, retomar, cancelar e duplicar seguem pelas rotas do original (`/api/v1/campaigns/[id]/[acao]`).
- **O motor ganha uma transição** (`scheduled → draft`, uma linha na máquina de estados do original) e três ações em `lib/escale/campanhas/acoes.ts`, que usam a máquina e o `carregarCampanha` do original.
- **Tempo real:** `campaigns` entra na publicação `supabase_realtime` (9301); a tela assina `campaigns` da organização e invalida a lista. Enquanto alguma campanha da página está `preparing` ou `running`, a lista também reconsulta a cada 10 s (as contagens vêm dos destinatários, que não estão na publicação).
- **Destinos que a 8B e a 8C trocam** moram num arquivo só (`lib/escale/campanhas/rotas.ts`): até lá, "Enviar WhatsApp" abre o formulário do original, o rascunho abre a edição do original e as outras linhas abrem o detalhe do original.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Vitest + Testing Library + user-event, Tailwind 4 com os tokens da casca, Radix DropdownMenu/Popover/Dialog, Supabase (RLS, Realtime), zod, sonner.

## Referência visual (abrir a imagem antes de cada task de tela)

Caminhos sem crase (cerca `evidencia-citada`). Todos em 1:1 (1536×735, px de CSS). O menu lateral dos prints **não** vale (a casca é a do menu superior); só o conteúdo do módulo.

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 001 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-001-carregando.png | o carregamento da rota (a barra de progresso do topo; a casca já tem a dela) | 9 |
| 002 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-002-lista-whatsapp.png | cabeçalho, abas, barra de filtros, botão do resumo fechado, tabela, barra de resultado, selo "Completo", ⋮, rodapé "10 por página" e paginação | 6, 7, 8, 9 |
| 003 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-003-resumo-das-campanhas-aberto.png | o botão do resumo ativo e os 5 cartões | 7 |
| 004 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-004-filtro-status.png | o filtro Status aberto: borda da marca, caixinhas, ordem alfabética | 7 |
| 005 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-005-filtro-conta.png | o filtro de escolha única (vira "Número") | 7 |
| 006 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-006-filtro-data-calendario.png | o calendário duplo com atalhos (o `CalendarioDePeriodo` da casca, sem abas) | 7 |
| 007 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-007-menu-da-campanha-completa.png | o ⋮ aberto em cima à direita, "Duplicar campanha" com o ícone de copiar, a linha realçada | 8 |
| 008 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-008-dica-barra-de-resultado.png | a dica "16 lidos - 53%" | 6 |
| 014 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-014-sms-vazio.png | o molde do vazio "Crie sua primeira campanha" (aba SMS; a nossa é WhatsApp) | 8 |

Fichas com as regras: `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\telas\09-00x-*.md` e `...\09-campanhas\material-do-codigo.md` (seções 2.1, 2.2, 3, 4.3, 5 e 6).

### Medidas tiradas dos prints (px de CSS)

| Peça | Medida |
|---|---|
| Cabeçalho (002) | 48px, borda de baixo `casca-divisoria`, `px-6`; título 18px/500 `casca-texto`; à direita a engrenagem (botão 32px, `Settings` 16px `casca-suave`) e "Enviar WhatsApp" (32px, `px-3.5`, canto 6px, fundo `casca-marca`, 12px/500 branco, `WhatsappLogo` 14px, 8px entre ícone e texto). O selo "Otimizado" **não** entra (PRD A1) |
| Abas (002) | faixa de 36px com borda de baixo `casca-divisoria`, `px-6`; aba 15px/500, `px-3`; a ativa em `casca-texto` com o sublinhado de 3px `casca-marca` da largura da aba; com uma aba só, a faixa some |
| Barra de filtros (002) | 16px abaixo das abas; campos de 32px, canto 6px, fundo `casca-busca`, sem borda, 8px entre eles; busca flexível 220px (mín. 180, máx. 280) com `Search` 16px à direita; datas 215px com `Calendar` 14px à direita; Status 160px; Número 170px; aberto: fundo branco e borda 1px `casca-marca` (o `SeletorDoFiltro` da 3D) |
| Botão do resumo (002, 003) | 12px abaixo; 30px, `px-2.5`, canto 6px, borda 1px, 11px/600 caixa alta, espaçamento 0.08em, `BarChart3` 14px e a seta 12px; fechado `casca-busca`/`casca-borda`/`casca-suave`; aberto `casca-marca-suave`/`casca-marca-media`/`casca-marca` e a seta para cima |
| Cartões do resumo (003) | 12px abaixo do botão; 5 colunas iguais, 12px entre elas; 85px de altura, `p-4`, borda 1px `casca-borda`, canto 8px, sombra leve; rótulo 13px/500 `casca-texto` e o ícone 14px `casca-marca` em cima; embaixo o número 15px/600 (no 1º) ou o percentual 15px/600 à esquerda e o total 11px `casca-suave` à direita; entrada deslizando de cima em 0,26 s (sem animação com "reduzir movimento") |
| Tabela (002) | cabeçalho de 42px, linhas `casca-divisoria` em cima e embaixo, 10px/600 caixa alta, espaçamento 0.1em, `casca-texto`; colunas Campanha 26%, Data agendamento 14%, Número 20%, Resultado 22%, Status 12%, ações 6%; primeira coluna com `pl-6` |
| Linha (002) | 54px, borda de baixo `casca-divisoria`; passar o mouse ou menu aberto: fundo `casca-busca`; quadrado de 34px canto 8px fundo `casca-marca-suave` com `Send` 16px `casca-marca`; nome 13px/500 `casca-texto` (máx. 200px, reticências, dica com o nome); embaixo 11px `casca-meta`; demais células 11px `casca-texto` |
| Barra de resultado (002, 008) | 8px de altura, de 140 a 230px, canto redondo; segmentos na ordem erro (vermelho), entregues (verde-azulado), lidos (verde-claro), enviados (verde mais escuro); o resto em cinza claro; dica: pílula 11px/500, canto 4px, fundo claro do segmento, 6px acima, centrada no segmento |
| Selo de status (002) | 22px, `px-1.5`, canto 4px, 12px; cor de fundo e de texto do estado (N5); pulsa em "Processando" e "Em progresso" |
| ⋮ (002, 007) | botão 28px, `EllipsisVertical` 18px `casca-texto-2`; o menu do `components/escale/menu/estilos.ts`, `side="top" align="end"`; itens com ícone 14px; destrutivos em `casca-alerta` |
| Rodapé (002) | só com mais de 10 campanhas; borda de cima `casca-divisoria`, `px-6`; a `PaginacaoDaCasca` (2A): "10 por página" à esquerda, "Anterior 1 2 … Próximo" à direita, a atual cheia na cor da marca |
| Vazio (014) | centrado, 40px abaixo das abas; quadrado 56px canto 10px `casca-marca-suave` com `WhatsappLogo` 24px `casca-marca`; título 15px/600 a 16px; texto 13px `casca-suave` em coluna de 190px a 8px; botão contornado 32px a 16px |

### Cores medidas (amostra de pixel nos prints 002 e 008; Badge "subtle" do Chakra v3 da Clint)

| Uso | Claro | Fonte |
|---|---|---|
| Segmento erro | `#f2453e` | medido, 002 |
| Segmento entregues | `#20cc9c` | medido, 002 |
| Segmento lidos | `#16e2a7` | medido, 002 e 008 |
| Segmento enviados | `#2fba6a` | medido, 002 (a ponta mais escura) |
| Trilho da barra | `#ededf2` | provisório (todas as linhas do print estão completas) |
| Selo verde ("Completo") | fundo `#dcfce7`, texto `#15803d` | fundo medido, texto green.700 do Chakra |
| Selos dos outros tons | cinza `#f4f4f5`/`#52525b`; ciano `#cffafe`/`#0e7490`; amarelo `#fef9c3`/`#a16207`; azul `#dbeafe`/`#1d4ed8`; laranja `#ffedd5`/`#c2410c`; granito `#e7e5e4`/`#57534e`; vermelho `#fee2e2`/`#b91c1c` | `.100`/`.700` da paleta do Chakra v3 (material 4.3: secondary, polar, warning, blue, safety-orange, green, granite, red) |

### Textos da Clint usados nesta fase

Do `material-do-codigo.md` (seção 3) e das fichas:
- **Lista:** "WhatsApp", "Enviar WhatsApp", "Buscar campanha", "Filtrar por data do agendamento", "Filtrar por data de criação", "Status", "Resumo das campanhas", "Adicionados para envio", "Enviados", "Entregues", "Lidas", "Erros", "Campanha", "Data agendamento", "Resultado", "Solicitado"/"Solicitados", "Criado em", "{n} inválidos ou com erro", "16 lidos - 53%" (molde dos segmentos).
- **Status (selo):** "Rascunho", "Processando", "Agendado", "Em progresso", "Pausada", "Completo", "Cancelado", "Erro de processamento". **Status (filtro):** "Agendado", "Cancelado", "Concluído", "Envio em Andamento", "Erro de Processamento", "Pausada", "Rascunho". **Dicas:** as 7 da seção "Textos de status".
- **Menu e linha:** "Mais opções", "Alterar horário do disparo", "Cancelar campanha", "Editar rascunho", "Excluir rascunho", "Duplicar campanha", "Pausar campanha", "Retomar campanha".
- **Avisos:** "Campanha pausada com sucesso!", "Campanha retomada com sucesso!", "Agendamento cancelado. A campanha foi movida para Rascunho.", "Horário do disparo atualizado com sucesso!", "Rascunho excluído com sucesso!", "A campanha está sendo duplicada, aguarde a finalização."; erros "Falha ao cancelar", "Falha ao pausar a campanha. Tente novamente.", "Falha ao retomar a campanha. Tente novamente.", "Não foi possível duplicar a campanha. Tente novamente.", "Não foi possível excluir o rascunho. Tente novamente.", "Não foi possível alterar o horário. Tente novamente.".
- **Confirmações:** "A campanha será movida para Rascunho e você poderá editá-la e reagendar. Deseja continuar?", "A campanha será cancelada e os contatos que ainda não receberam a mensagem não serão notificados. Esta ação não pode ser desfeita.", "Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.".
- **Reagendar:** "Alterar horário do disparo", "Escolha a nova data e horário para o disparo desta campanha.", "Data e horário", "Salvar novo horário", "Selecione uma data e um horário válidos.", "O novo horário precisa ser no futuro.".
- **Vazios:** "Crie sua primeira campanha", "Envie {canal} em massa para sua audiência de forma rápida e organizada." (com WhatsApp), "Nenhuma campanha encontrada", "Tente ajustar a busca ou os filtros aplicados.", "Limpar filtros".
- **Textos nossos** (a Clint não tem): "Prospecção" (aba), "Número" (filtro e coluna), "Pronta para enviar" (selo e filtro), as dicas de "Processando" e "Pronta para enviar", "Agendada para {data}", "Nenhum envio ainda", "Percentual sobre os adicionados para envio.", "Campanha cancelada com sucesso!" (a Clint completa com "Contatos foram removidos da discagem.", que é da campanha de voz), "Não foi possível carregar as campanhas." (a Clint não tem tela de erro), "Carregando campanhas", "Canais de campanha", "Configuração de campanhas" e os textos de recusa do servidor.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Branch `feat/fase-8a-lista-de-campanhas`** de `escale-crm/main` na worktree `wt-frente-b`; **migration 9301** (`20261110120000`, depois da 9205 da 3E, `20261109120000`); um PR, mergeado ao terminar; tag/release/VPS só no fim da Frente B | regra de 18/10; PRD R5 |
| N2 | **A página:** com a casca, `/app/campaigns` mostra `CampanhasDaCasca`; a aba vem de `?aba=` (`whatsapp`, o padrão, e `prospeccao`, só para admin; a mais vale como `whatsapp`); quem não é gerente vai para `/app/inbox` (como a Prospecção do original faz com quem não é admin). A aba Prospecção mostra o `ProspectingClient` do original até a 8D; `/app/prospecting` com a casca redireciona para `/app/campaigns?aba=prospeccao`; o item "Prospecção" do "Mais" fica (e cai no redirecionamento) | PRD A2, seção 5; 8D refaz a aba |
| N3 | **Permissão por papel** (gerente), sem chave por pessoa: a tabela de exceções da 3C (`crm_permissoes_de_atendimento`) é só de Conversas, com CHECK nas chaves dela. A chave por pessoa (`CAMPAIGN_WHATSAPP_BULK`) entra com a trilha de grupos de permissão (PRD 2, pergunta 3). Na casca, o item "Campanhas" do topo (e do "Mais") some para quem está abaixo de gerente: `PAPEL_MINIMO_NO_TOPO` em `lib/escale/menu-do-topo.ts` | PRD seção 5; a rota e a RLS já exigem gerente |
| N4 | **Filtros** (`FiltrosDeCampanhas`): busca no nome (espera 500 ms; `ilike`, sem diferenciar maiúsculas), **data do agendamento** = `coalesce(scheduled_at, started_at)` (o que a coluna mostra), data de criação, status (várias escolhas, 8 opções: os nossos estados sem "Processando", como a Clint tira PREPARING), **Número** (escolha única, o número principal da campanha; o rodízio fica de fora). Datas no fuso da organização. Ficam no estado da tela (a Clint não guarda); mudar filtro volta à página 1 | PRD A3, seção 6 |
| N5 | **Status na tela** (seção 6 do PRD): o selo usa os rótulos e tons da Clint — Rascunho (cinza), Processando (ciano, pulsa), Pronta para enviar (cinza), Agendado (amarelo), Em progresso (azul, pulsa), Pausada (laranja), Completo (verde), Cancelado (granito), Erro de processamento (vermelho); o **filtro** usa as palavras do filtro da Clint ("Concluído", "Envio em Andamento", "Erro de Processamento"), em ordem alfabética, como o 004; a dica do selo é o texto de status da Clint (os nossos para Processando e Pronta) | PRD A7, seção 6; 004 |
| N6 | **Contagens por carimbo cumulativo** (a régua do `lib/campanhas/metricas.ts`), disjuntas para a barra: erros = `status = 'failed'`; dos que não falharam, enviados = algum de `sent_at/delivered_at/read_at/replied_at`, entregues = algum de `delivered_at/read_at/replied_at`, lidos = `read_at` ou `replied_at`; **adicionados** = elegíveis do snapshot. **A base de todo percentual da lista é "adicionados"** (a régua que o PRD A4 pede fixar; a da Clint não fecha). Segmentos: erro, entregues − lidos, lidos, enviados − entregues; largura e percentual sobre adicionados (inteiro). Dica: "{n} inválidos ou com erro" (sem percentual, como o código da Clint), "{n} entregues - {p}%", "{n} lidos - {p}%", "{n} enviados - {p}%". Agendada: o relógio com "Agendada para dd/mm/aaaa hh:mm"; sem lista ainda: "—"; em andamento: listras animadas | PRD A4, A6; 008 |
| N7 | **Resumo:** a soma das campanhas do filtro **sem rascunhos e canceladas** (a Clint); 5 cartões com os números no formato brasileiro (a Clint mostra "14989"; a regra 5 do CLAUDE.md manda "14.989"); a régua escrita na dica de cada percentual ("Percentual sobre os adicionados para envio."); fechado ao abrir a página; só consulta o servidor aberto | PRD A4; 003 |
| N8 | **Coluna "Data agendamento":** `agendadaPara ?? iniciadaEm` em dd/mm/aaaa hh:mm no fuso da organização (a Clint mostra "10 Set 26, 12:39"); sem nenhuma, "—". **Subtítulo:** com snapshot, "{n} Solicitado(s) há {tempo}" com n = linhas do snapshot (`snapshot_total`) e o tempo desde a criação no molde do dayjs da Clint ("há um mês", "há 2 meses"); sem snapshot, "Criado em dd/mm/aaaa" | PRD A5; 002 |
| N9 | **Menu ⋮ por status** (material 2.1, com os nossos estados): rascunho → Editar rascunho, Excluir rascunho, Duplicar; pronta → Cancelar campanha (volta a rascunho), Duplicar; agendada → Alterar horário do disparo, Cancelar campanha (volta a rascunho; **definitivo se já enviou alguém**, a agendada que veio de pausada), Duplicar; em andamento e pausada → Cancelar campanha (definitivo), Duplicar; concluída, cancelada, erro e processando → Duplicar. Cancelar e excluir pedem a confirmação da Clint; duplicar avisa e abre a cópia; **Pausar/Retomar** na própria linha (N do topo, item 1) | PRD A8, A9 |
| N10 | **O motor:** `scheduled → draft` entra na máquina (`lib/campanhas/maquina-de-estados.ts`, uma linha com `FORK ESCALE · Fase 8A`); `reagendarAcao` (só `scheduled`, data no futuro, compare-and-set no status), `voltarAoRascunhoAcao` (pela máquina: `ready`, `scheduled`, `failed`; recusa se já enviou; limpa `scheduled_at`; o snapshot fica e a próxima preparação o refaz, como já acontece com `ready → draft`) e `excluirRascunhoAcao` (só `draft` que nunca enviou; apaga a linha — destinatários e rodízio vão junto pelo `on delete cascade` — e audita). Auditoria: `campaign.rescheduled`, `campaign.back_to_draft`, `campaign.draft_deleted` | PRD seção 7 |
| N11 | **Destinos até a 8B e a 8C** (`lib/escale/campanhas/rotas.ts`): "Enviar WhatsApp" → `/app/campaigns/new`; rascunho e cópia duplicada → `/app/campaigns/[id]/edit`; as outras linhas → `/app/campaigns/[id]`; engrenagem → `/app/campaigns/settings` (as telas do original) | PRD A10, A14 |
| N12 | **Tempo real:** a 9301 põe `campaigns` na publicação (idempotente, com a guarda de `pg_publication_tables`); `useCampanhasAoVivo` assina `campaigns` com `organization_id=eq.<org>` e invalida a lista e o resumo; reconsulta de 10 s enquanto alguma linha da página está `preparing` ou `running`. `campaign_recipients` **não** entra na publicação (cada ack viraria um pulso) | PRD A13 |
| N13 | **As funções da 9301** são `security invoker`, `stable`, `set search_path = public, pg_temp`, `revoke all … from public, anon` e `grant execute … to authenticated, service_role`; a lista e o resumo exigem `fn_role_at_least(p_org, 'manager')` (viewer e agente recebem vazio mesmo chamando direto pelo PostgREST). Nenhuma tabela nova, nenhuma `definer` | cercas `hardening-definer-varredura`, `definer-nova-nasce-exposta`, `gov-hardening-anon-definer` |
| N14 | **Paginação:** 10 por página com as opções da lista de contatos (10, 25, 50, 100; `POR_PAGINA` da 2A); o rodapé só aparece com mais de 10 (a Clint); página vazia depois de excluir volta uma | PRD A11 |
| N15 | **Estados:** carregando = 10 linhas-esqueleto na tabela (material 2.1); **sem nenhuma campanha** e sem filtro = o vazio no lugar dos filtros, do resumo e da tabela (a Clint esconde a barra no WhatsApp); vazio por filtro = a linha "Nenhuma campanha encontrada" com "Limpar filtros"; erro = "Não foi possível carregar as campanhas." + "Tentar novamente" (a Clint só loga; aqui o operador precisa saber). O 09-001 (título "Campanhas" e a barra azul) é o carregamento da rota: a casca já tem a barra de progresso dela | PRD A12 |
| N16 | **Cores:** os tons da Clint que não são a marca entram como variáveis da casca em `app/escale-tema.css` (bloco `FORK ESCALE · Fase 8A`, claro e escuro), lidas por valor arbitrário (`bg-(--escale-…)`), o padrão da 1F; as classes moram num arquivo só (`lib/escale/campanhas/cores.ts`). As listras e a entrada dos cartões são `@keyframes` no mesmo bloco | CLAUDE.md regra 3; 1F |
| N17 | **A dica de passar o mouse** é um componente próprio (`DicaAoPassar`), sem o Tooltip do Radix: ele exige `TooltipProvider` acima e já derrubou o Atendimento (escale.13/14). A barra de resultado desenha a pílula dela mesma, fora do trilho (o trilho corta o que passa da borda) | memória "provedor escondido pelo teste" |
| N18 | **Ícone novo:** `MailCheck` (cartão "Entregues") em `lib/ui/icons-da-casca.ts`; o `WhatsappLogo` vem de `@/lib/ui/icons`, como no card da casca (V4) | cerca `tailwind-tokens`; 003 |
| G1 | **Verificação enxuta**: por task só o que a task cria, typecheck e eslint dos arquivos alterados; `test:db`, `test:db:update`, rodada cheia, revisor (Opus 5.5) e conferência visual na bateria única do fim da Frente B | regra de 18/10 |

## Global Constraints

### Repositório, worktree e Git

- Worktree: `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-b` (hoje na `feat/fase-2f-importacao-telas`, já mergeada). **Base:** `escale-crm/main` com a 2F e a 3D (a Task 1 prova: `components/escale/conversas/filtros/SeletorDoFiltro.tsx` existe; `9107` e `9204` estão na `main`).
- **Branch:** `feat/fase-8a-lista-de-campanhas` (`git switch -c feat/fase-8a-lista-de-campanhas escale-crm/main`).
- **Migration:** `supabase/migrations/20261110120000_9301_lista_de_campanhas.sql`. Antes: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; `9301` (ou o timestamp `20261110120000`) em outra branch → PARE e pergunte.
- **PR** para `rgisjr/escale-crm`, base `main`, mergeado ao terminar. **Proibido:** push em `origin` (Rafael), tag, release, VPS e gravar no banco de produção.
- Conflitos com a Frente C (3E em andamento): `lib/i18n/dicionario.ts`, `supabase/baseline.sql`, `lib/audit/actions.ts`, `lib/ui/icons-da-casca.ts`, `app/escale-tema.css` — manter os dois blocos, o que já está na `main` primeiro.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`; `export NODE_OPTIONS=--max-old-space-size=6144` para o typecheck.
- `test:db` **não roda nesta fase** (bateria da Frente B). O arquivo de prova é escrito na Task 2 e fica pronto.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 8A`. Sem a casca, nenhum deles muda o que a tela faz (a transição nova da máquina só é pedida pelas rotas do fork).

| Arquivo | Mudança |
|---|---|
| `app/app/campaigns/page.tsx` | com o cookie `topo`: confere o papel, lê `?aba=` e devolve `CampanhasDaCasca` |
| `app/app/prospecting/page.tsx` | com o cookie `topo` (e já admin): `redirect("/app/campaigns?aba=prospeccao")` |
| `lib/campanhas/maquina-de-estados.ts` | `scheduled: ["running", "paused", "cancelled", "draft"]` com o comentário do fork |
| `lib/campanhas/maquina-de-estados.test.ts` | um `it` novo no fim, para `scheduled → draft` |
| `supabase/baseline.sql` | o bloco da 9301 (a migration sem a 1ª linha), logo ANTES de `-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----` |
| `lib/i18n/dicionario.ts` | bloco `// ─── FORK ESCALE · Fase 8A: lista de campanhas ───` logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` |
| `lib/audit/actions.ts` | depois do bloco da 2F: `// FORK ESCALE · Fase 8A: a lista de campanhas da casca (migration 9301).` + `"campaign.rescheduled"`, `"campaign.back_to_draft"`, `"campaign.draft_deleted"` |
| `lib/ui/icons-da-casca.ts` | `MailCheck` |
| `app/escale-tema.css` | o bloco `FORK ESCALE · Fase 8A` no fim do arquivo |

Do fork que mudam: `lib/escale/menu-do-topo.ts` (+ `tests/unit/escale-menu-do-topo.test.ts`) e `components/escale/menu/MenuDoTopo.tsx` (passa o papel).

### Cercas que precisam ficar verdes

`manifest-x-migrations` (a linha `-- manifest:`), `manifest-cita-caminho-que-existe` (o manifesto não cita caminho), `hardening-definer-varredura`, `definer-nova-nasce-exposta`, `gov-hardening-anon-definer` (nenhuma função nova é definer), `campanha-escreve-como-servidor` (as rotas do original não mudam; as do fork escrevem com o client admin), `i18n-espanhol-cobre-a-tela`, `controle-decorativo`, `tailwind-tokens`, `escale-casca-tokens`, `escale-tema`, `escale-casca-v2-original-intacto`, `evidencia-citada`, `vocabulario-do-funil`.

### Verificação (G1)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os achados com `corepack pnpm vitest run <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db`, `test:db:update`, rodada cheia, revisor (Opus 5.5, high) e conferência visual:** na bateria única do fim da Frente B.
3. **Comandos longos sempre em segundo plano.**

### Commits e PR

- Commits no formato `feat(escale): … (Fase 8A)` e terminados com `Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>`; o PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório na Task 1.
- Todo texto de tela por `t()` com literal (ou tabela de rótulos do próprio módulo). Datas e números no formato brasileiro.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/escale/campanhas/tipos.ts` | novo | as formas da lista, da página e do resumo |
| `lib/escale/campanhas/filtros.ts` | novo | os filtros: schema, enxugar, texto da URL, compilar para o banco |
| `lib/escale/campanhas/apresentacao.ts` | novo | status na tela, barra, cartões, tempo relativo, datas e números |
| `lib/escale/campanhas/acoes-da-linha.ts` | novo | o que o ⋮ e o botão da linha oferecem em cada status |
| `lib/escale/campanhas/rotas.ts` | novo | destinos (até a 8B/8C) e as abas |
| `lib/escale/campanhas/cores.ts` | novo | as classes dos tons e dos segmentos |
| `tests/unit/escale-campanhas-regras.test.ts` | novo | as regras puras |
| `supabase/migrations/20261110120000_9301_lista_de_campanhas.sql`, `supabase/baseline.sql` | novo / bloco | a publicação e as 4 funções |
| `tests/unit/escale-lista-de-campanhas-migration.test.ts` | novo | o texto da migration e o bloco no baseline |
| `tests/invariants/escale-lista-de-campanhas-9301.test.ts` | novo | a prova contra Postgres real (roda na bateria) |
| `lib/escale/campanhas/banco.ts` | novo | ler a página e o resumo pelas funções |
| `app/api/v1/campanhas-da-casca/route.ts`, `.../resumo/route.ts` | novos | a lista e o resumo |
| `tests/unit/escale-campanhas-da-casca-rotas.test.ts` | novo | as duas rotas de leitura |
| `lib/campanhas/maquina-de-estados.ts` (+ teste) | alterado (1 linha + 1 `it`) | `scheduled → draft` |
| `lib/escale/campanhas/acoes.ts` | novo | reagendar, voltar a rascunho, excluir rascunho |
| `app/api/v1/campanhas-da-casca/[id]/route.ts`, `.../[id]/[acao]/route.ts` | novos | DELETE e as duas ações |
| `lib/audit/actions.ts` | alterado | as 3 ações de auditoria |
| `tests/unit/escale-campanhas-acoes.test.ts` | novo | as ações e as rotas de escrita |
| `hooks/escale/useCampanhasDaCasca.ts` | novo | lista, resumo, tempo real e as ações |
| `tests/unit/escale-campanhas-hooks.test.tsx` | novo | os hooks |
| `app/escale-tema.css`, `lib/ui/icons-da-casca.ts` | alterados | as cores, as animações e o `MailCheck` |
| `components/escale/campanhas/DicaAoPassar.tsx`, `SeloDoStatus.tsx`, `BarraDeResultado.tsx` | novos | as peças da linha |
| `tests/unit/escale-campanhas-pecas.test.tsx` | novo | as peças |
| `components/escale/campanhas/CabecalhoDasCampanhas.tsx`, `AbasDasCampanhas.tsx`, `CampoDeDataDasCampanhas.tsx`, `BarraDeFiltrosDasCampanhas.tsx`, `FaixaDoResumo.tsx` | novos | o topo da página |
| `tests/unit/escale-campanhas-topo.test.tsx` | novo | cabeçalho, abas, filtros e resumo |
| `components/escale/campanhas/TabelaDeCampanhas.tsx`, `LinhaDaCampanha.tsx`, `MenuDaCampanha.tsx`, `JanelaAlterarHorario.tsx`, `VaziosDasCampanhas.tsx` | novos | a tabela |
| `tests/unit/escale-campanhas-tabela.test.tsx` | novo | a tabela, o menu e a janela |
| `components/escale/campanhas/ListaDeCampanhasDaCasca.tsx`, `CampanhasDaCasca.tsx` | novos | a aba WhatsApp e a página |
| `app/app/campaigns/page.tsx`, `app/app/prospecting/page.tsx` | alterados | os encaixes |
| `lib/escale/menu-do-topo.ts`, `components/escale/menu/MenuDoTopo.tsx`, `tests/unit/escale-menu-do-topo.test.ts` | alterados | Campanhas some abaixo de gerente |
| `tests/unit/escale-campanhas-pagina.test.tsx` | novo | a página, a aba e os encaixes |
| `lib/i18n/dicionario.ts` | alterado | o espanhol |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md`, `LOG.md` | alterados (fora do repositório) | a linha da 8A; o log |

---

### Task 1: Branch, base e as regras puras

**Files:**
- Create: `lib/escale/campanhas/tipos.ts`, `lib/escale/campanhas/filtros.ts`, `lib/escale/campanhas/apresentacao.ts`, `lib/escale/campanhas/acoes-da-linha.ts`, `lib/escale/campanhas/rotas.ts`, `lib/escale/campanhas/cores.ts`, `tests/unit/escale-campanhas-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/`

**Interfaces (Produces):**
- `tipos.ts`: `ContagemDaLinha { adicionados; enviados; entregues; lidos; erros }`, `LinhaDeCampanha` (+ `id`, `nome`, `status: StatusDaCampanha`, `numeroId`, `solicitados`, `agendadaPara: string | null`, `iniciadaEm: string | null`, `criadaEm: string`), `PaginaDeCampanhas { linhas; total; pagina; porPagina }`, `ResumoDasCampanhas = ContagemDaLinha`.
- `filtros.ts`: `STATUS_DO_FILTRO` (8, em ordem alfabética do rótulo), `StatusDoFiltro`, `ROTULO_DO_FILTRO_DE_STATUS`, `ESPERA_DA_BUSCA_MS` (500), `filtrosDeCampanhasSchema`, `FiltrosDeCampanhas`, `PeriodoDoFiltro`, `FILTROS_VAZIOS`, `enxugarFiltros(f)`, `temFiltro(f)`, `PARAM_DOS_FILTROS` ("f"), `textoDosFiltros(f)`, `filtrosDoTexto(texto) → FiltrosDeCampanhas | null`, `FiltroCompilado`, `padraoDoNome(busca)`, `compilarFiltros(f, fuso)`.
- `apresentacao.ts`: `Traduzir`, `TomDoStatus`, `ROTULO_DO_STATUS`, `DICA_DO_STATUS`, `TOM_DO_STATUS`, `STATUS_QUE_PULSAM`, `numeroBr(n)`, `porcento(parte, base)`, `ChaveDoSegmento`, `SegmentoDaBarra`, `segmentosDaBarra(c)`, `textoDoSegmento(s, t)`, `ChaveDoCartao`, `ORDEM_DOS_CARTOES`, `ROTULO_DO_CARTAO`, `valoresDoCartao(chave, r)`, `tempoDesde(iso, agora, t)`, `dataEHoraBr(iso, fuso?)`, `dataBr(iso, fuso?)`, `dataDoDisparo(l)`, `subtituloDaCampanha(l, agora, t, fuso?)`.
- `acoes-da-linha.ts`: `AcaoDaLinha`, `AcaoConfirmavel`, `acoesDaLinha(status, enviados)`, `ROTULO_DA_ACAO`, `ACOES_DESTRUTIVAS`, `CONFIRMACAO_DA_ACAO`, `botaoDaLinha(status) → "pausar" | "retomar" | null`.
- `rotas.ts`: `ROTA_DAS_CAMPANHAS`, `ROTA_DA_NOVA`, `ROTA_DA_CONFIGURACAO`, `rotaDoRascunho(id)`, `rotaDoDetalhe(id)`, `AbaDasCampanhas`, `ROTULO_DA_ABA`, `abaDaUrl(valor, papel)`, `abasVisiveis(papel)`, `rotaDaAba(aba)`.
- `cores.ts`: `CLASSE_DO_TOM`, `CLASSE_DO_SEGMENTO`, `TOM_DA_DICA_DO_SEGMENTO`, `CLASSE_DO_TRILHO`.

- [ ] **Step 1: A base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain            # Expected: vazio
git fetch escale-crm --quiet
git switch -c feat/fase-8a-lista-de-campanhas escale-crm/main
for f in components/escale/conversas/filtros/SeletorDoFiltro.tsx components/escale/ui/CalendarioDePeriodo.tsx components/escale/ui/SeletorDeDataEHora.tsx components/escale/ui/JanelaDeConfirmacao.tsx components/escale/ui/PaginacaoDaCasca.tsx hooks/realtime/useRealtimeChannel.ts lib/campanhas/acoes.ts; do git cat-file -e HEAD:$f && echo "ok $f"; done
git ls-tree --name-only HEAD supabase/migrations/ | grep -E "_9(107|204|3[0-9]{2})_" | sort
bash scripts/checar-colisao-de-migration.sh escale-crm/main
corepack pnpm install --frozen-lockfile
```

Expected: sete `ok`; a lista mostra a `9107` e a `9204` e **nenhuma** `93xx`. Faltou algum arquivo: a 2F ou a 3D não está na `main` — PARE. Apareceu `93xx` em outra branch: PARE e pergunte.

- [ ] **Step 2: Copiar o plano**

```bash
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-19-fase-8a-lista-de-campanhas.md" docs/superpowers/plans/
```

- [ ] **Step 3: Escrever o teste das regras (falha)**

`tests/unit/escale-campanhas-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  ACOES_DESTRUTIVAS,
  CONFIRMACAO_DA_ACAO,
  acoesDaLinha,
  botaoDaLinha,
} from "@/lib/escale/campanhas/acoes-da-linha";
import {
  DICA_DO_STATUS,
  ROTULO_DO_STATUS,
  STATUS_QUE_PULSAM,
  TOM_DO_STATUS,
  dataBr,
  dataDoDisparo,
  dataEHoraBr,
  numeroBr,
  porcento,
  segmentosDaBarra,
  subtituloDaCampanha,
  tempoDesde,
  textoDoSegmento,
  valoresDoCartao,
} from "@/lib/escale/campanhas/apresentacao";
import {
  ROTULO_DO_FILTRO_DE_STATUS,
  STATUS_DO_FILTRO,
  compilarFiltros,
  enxugarFiltros,
  filtrosDoTexto,
  temFiltro,
  textoDosFiltros,
} from "@/lib/escale/campanhas/filtros";
import { abaDaUrl, abasVisiveis, rotaDaAba, rotaDoDetalhe, rotaDoRascunho } from "@/lib/escale/campanhas/rotas";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";
import { STATUS_DA_CAMPANHA } from "@/lib/campanhas/tipos";

const t = (s: string) => s;
const SP = "America/Sao_Paulo";
const AGORA = new Date("2026-10-17T12:00:00Z");
const NUMERO = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

const linha = (extra: Partial<LinhaDeCampanha> = {}): LinhaDeCampanha => ({
  id: "c1",
  nome: "10.09",
  status: "completed",
  numeroId: NUMERO,
  solicitados: 30,
  agendadaPara: null,
  iniciadaEm: "2026-09-10T15:39:00Z",
  criadaEm: "2026-09-10T12:00:00Z",
  adicionados: 30,
  enviados: 26,
  entregues: 24,
  lidos: 16,
  erros: 3,
  ...extra,
});

describe("filtros da lista (N4)", () => {
  it("enxugar tira o vazio; temFiltro só conta o que filtra", () => {
    expect(enxugarFiltros({ busca: "  ", status: [], disparo: {}, criacao: { de: "2026-10-01" } })).toEqual({
      criacao: { de: "2026-10-01" },
    });
    expect(temFiltro({})).toBe(false);
    expect(temFiltro({ busca: " " })).toBe(false);
    expect(temFiltro({ numero: NUMERO })).toBe(true);
  });

  it("o texto da URL vai e volta; JSON ruim ou fora do schema é null; nada é {}", () => {
    const f = { busca: "Reat", status: ["scheduled" as const], numero: NUMERO };
    expect(filtrosDoTexto(textoDosFiltros(f))).toEqual(f);
    expect(filtrosDoTexto(undefined)).toEqual({});
    expect(filtrosDoTexto("{")).toBeNull();
    expect(filtrosDoTexto(JSON.stringify({ status: ["preparing"] }))).toBeNull();
    expect(filtrosDoTexto(JSON.stringify({ outro: 1 }))).toBeNull();
  });

  it("compilar: fuso, padrão do ilike escapado, status, número e as datas", () => {
    expect(
      compilarFiltros(
        { busca: "50%_off", status: ["running"], numero: NUMERO, disparo: { de: "2026-10-01", ate: "2026-10-31" }, criacao: { ate: "2026-09-30" } },
        SP,
      ),
    ).toEqual({
      fuso: SP,
      padrao: "%50\\%\\_off%",
      status: ["running"],
      numero: NUMERO,
      disparo_de: "2026-10-01",
      disparo_ate: "2026-10-31",
      criada_ate: "2026-09-30",
    });
    expect(compilarFiltros({}, SP)).toEqual({ fuso: SP });
  });

  it("o filtro de status: 8 opções sem 'Processando', em ordem alfabética, com as palavras do filtro da Clint", () => {
    expect(STATUS_DO_FILTRO).not.toContain("preparing");
    const rotulos = STATUS_DO_FILTRO.map((s) => ROTULO_DO_FILTRO_DE_STATUS[s]);
    expect(rotulos).toEqual([
      "Agendado",
      "Cancelado",
      "Concluído",
      "Envio em Andamento",
      "Erro de Processamento",
      "Pausada",
      "Pronta para enviar",
      "Rascunho",
    ]);
  });
});

describe("status na tela (N5)", () => {
  it("todo estado tem rótulo, dica e tom; pulsam só Processando e Em progresso", () => {
    for (const s of STATUS_DA_CAMPANHA) {
      expect(ROTULO_DO_STATUS[s], s).toBeTruthy();
      expect(DICA_DO_STATUS[s], s).toBeTruthy();
      expect(TOM_DO_STATUS[s], s).toBeTruthy();
    }
    expect([...STATUS_QUE_PULSAM].sort()).toEqual(["preparing", "running"]);
    expect(ROTULO_DO_STATUS.completed).toBe("Completo");
    expect(TOM_DO_STATUS.completed).toBe("verde");
    expect(TOM_DO_STATUS.paused).toBe("laranja");
  });
});

describe("barra, cartões e números (N6, N7)", () => {
  it("os segmentos disjuntos, na ordem da Clint, sobre os adicionados", () => {
    const s = segmentosDaBarra(linha());
    expect(s.map((x) => [x.chave, x.quantidade, x.porcento])).toEqual([
      ["erro", 3, 10],
      ["entregues", 8, 27],
      ["lidos", 16, 53],
      ["enviados", 2, 7],
    ]);
    expect(s.reduce((a, x) => a + x.largura, 0)).toBeCloseTo(96.67, 1);
    expect(textoDoSegmento(s[2]!, t)).toBe("16 lidos - 53%");
    expect(textoDoSegmento(s[0]!, t)).toBe("3 inválidos ou com erro");
    expect(segmentosDaBarra(linha({ adicionados: 0 }))).toEqual([]);
  });

  it("os cartões: o 1º só o total, os outros o percentual sobre os adicionados", () => {
    const r = { adicionados: 14989, enviados: 9922, entregues: 9110, lidos: 2408, erros: 4087 };
    expect(valoresDoCartao("adicionados", r)).toEqual({ total: 14989, porcento: null });
    expect(valoresDoCartao("enviados", r)).toEqual({ total: 9922, porcento: 66 });
    expect(valoresDoCartao("lidas", r)).toEqual({ total: 2408, porcento: 16 });
    expect(valoresDoCartao("erros", { ...r, adicionados: 0 })).toEqual({ total: 4087, porcento: null });
    expect(porcento(1, 3)).toBe(33);
    expect(numeroBr(14989)).toBe("14.989");
  });
});

describe("tempo e datas (N8)", () => {
  it("o tempo relativo no molde do dayjs da Clint", () => {
    expect(tempoDesde("2026-10-17T11:59:40Z", AGORA, t)).toBe("há poucos segundos");
    expect(tempoDesde("2026-10-17T10:00:00Z", AGORA, t)).toBe("há 2 horas");
    expect(tempoDesde("2026-09-10T12:00:00Z", AGORA, t)).toBe("há um mês");
    expect(tempoDesde("2026-09-01T12:00:00Z", AGORA, t)).toBe("há 2 meses");
    expect(tempoDesde("2026-07-13T12:00:00Z", AGORA, t)).toBe("há 3 meses");
    expect(tempoDesde("2025-04-17T12:00:00Z", AGORA, t)).toBe("há 2 anos");
  });

  it("datas no formato brasileiro, no fuso pedido", () => {
    expect(dataEHoraBr("2026-09-10T15:39:00Z", SP)).toBe("10/09/2026 12:39");
    expect(dataBr("2026-10-01T02:00:00Z", SP)).toBe("30/09/2026");
    expect(dataDoDisparo(linha({ agendadaPara: "2026-10-20T13:00:00Z" }))).toBe("2026-10-20T13:00:00Z");
    expect(dataDoDisparo(linha())).toBe("2026-09-10T15:39:00Z");
    expect(dataDoDisparo(linha({ iniciadaEm: null }))).toBeNull();
  });

  it("o subtítulo: N Solicitado(s) há X; sem snapshot, Criado em", () => {
    expect(subtituloDaCampanha(linha(), AGORA, t, SP)).toBe("30 Solicitados há um mês");
    expect(subtituloDaCampanha(linha({ solicitados: 1 }), AGORA, t, SP)).toBe("1 Solicitado há um mês");
    expect(subtituloDaCampanha(linha({ solicitados: 1500 }), AGORA, t, SP)).toBe("1.500 Solicitados há um mês");
    expect(subtituloDaCampanha(linha({ solicitados: 0, criadaEm: "2026-10-01T12:00:00Z" }), AGORA, t, SP)).toBe(
      "Criado em 01/10/2026",
    );
  });
});

describe("o ⋮ e o botão da linha (N9)", () => {
  it("as ações por status", () => {
    expect(acoesDaLinha("draft", 0)).toEqual(["editar", "excluir", "duplicar"]);
    expect(acoesDaLinha("ready", 0)).toEqual(["cancelar_para_rascunho", "duplicar"]);
    expect(acoesDaLinha("scheduled", 0)).toEqual(["alterar_horario", "cancelar_para_rascunho", "duplicar"]);
    expect(acoesDaLinha("scheduled", 4)).toEqual(["alterar_horario", "cancelar", "duplicar"]);
    expect(acoesDaLinha("running", 10)).toEqual(["cancelar", "duplicar"]);
    expect(acoesDaLinha("paused", 10)).toEqual(["cancelar", "duplicar"]);
    for (const s of ["completed", "cancelled", "failed", "preparing"] as const) {
      expect(acoesDaLinha(s, 0), s).toEqual(["duplicar"]);
    }
  });

  it("destrutivas e confirmações; o botão de pausa", () => {
    expect([...ACOES_DESTRUTIVAS].sort()).toEqual(["cancelar", "cancelar_para_rascunho", "excluir"]);
    expect(CONFIRMACAO_DA_ACAO.cancelar_para_rascunho).toContain("movida para Rascunho");
    expect(botaoDaLinha("running")).toBe("pausar");
    expect(botaoDaLinha("paused")).toBe("retomar");
    expect(botaoDaLinha("scheduled")).toBeNull();
  });
});

describe("rotas e abas (N2, N11)", () => {
  it("destinos até a 8B/8C e as abas por papel", () => {
    expect(rotaDoRascunho("c1")).toBe("/app/campaigns/c1/edit");
    expect(rotaDoDetalhe("c1")).toBe("/app/campaigns/c1");
    expect(abasVisiveis("manager")).toEqual(["whatsapp"]);
    expect(abasVisiveis("admin")).toEqual(["whatsapp", "prospeccao"]);
    expect(abaDaUrl("prospeccao", "admin")).toBe("prospeccao");
    expect(abaDaUrl("prospeccao", "manager")).toBe("whatsapp");
    expect(abaDaUrl("xyz", "admin")).toBe("whatsapp");
    expect(rotaDaAba("whatsapp")).toBe("/app/campaigns");
    expect(rotaDaAba("prospeccao")).toBe("/app/campaigns?aba=prospeccao");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-regras.test.ts`
Expected: FAIL ("Cannot find module '@/lib/escale/campanhas/acoes-da-linha'").

- [ ] **Step 4: `lib/escale/campanhas/tipos.ts`**

```ts
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

/**
 * AS FORMAS DA LISTA DE CAMPANHAS DA CASCA (fork Escale, Fase 8A). O servidor
 * (`banco.ts`) monta, a rota devolve e a tela lê — um tipo só dos dois lados.
 */

/** As contagens de uma campanha (ou a soma do resumo), por carimbo cumulativo (9301, N6). */
export interface ContagemDaLinha {
  /** Elegíveis do snapshot: a base de todo percentual da lista. */
  adicionados: number;
  /** Saíram (sem os que falharam). */
  enviados: number;
  entregues: number;
  /** Leram ou responderam. */
  lidos: number;
  /** Falharam no envio. */
  erros: number;
}

export interface LinhaDeCampanha extends ContagemDaLinha {
  id: string;
  nome: string;
  status: StatusDaCampanha;
  /** O número principal (`channel_session_id`). */
  numeroId: string;
  /** Linhas do snapshot, elegíveis ou não ("N Solicitados"). */
  solicitados: number;
  agendadaPara: string | null;
  iniciadaEm: string | null;
  criadaEm: string;
}

export interface PaginaDeCampanhas {
  linhas: LinhaDeCampanha[];
  total: number;
  pagina: number;
  porPagina: number;
}

export type ResumoDasCampanhas = ContagemDaLinha;
```

- [ ] **Step 5: `lib/escale/campanhas/filtros.ts`**

```ts
import { z } from "zod";

import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

/**
 * OS FILTROS DA LISTA DE CAMPANHAS (fork Escale, Fase 8A; N4; 002, 004–006).
 * A tela guarda `FiltrosDeCampanhas`; a rota recebe o JSON enxuto em `?f=` e
 * compila para o banco (`fn_escale_campanha_passa`, 9301). Só o servidor põe o
 * fuso e o padrão do `ilike`.
 */

/** Os status do filtro, na ordem alfabética do rótulo (004). Sem "Processando": a Clint tira PREPARING. */
export const STATUS_DO_FILTRO = [
  "scheduled",
  "cancelled",
  "completed",
  "running",
  "failed",
  "paused",
  "ready",
  "draft",
] as const satisfies readonly StatusDaCampanha[];
export type StatusDoFiltro = (typeof STATUS_DO_FILTRO)[number];

/** As palavras do filtro da Clint (004), que não são as do selo. */
export const ROTULO_DO_FILTRO_DE_STATUS: Record<StatusDoFiltro, string> = {
  scheduled: "Agendado",
  cancelled: "Cancelado",
  completed: "Concluído",
  running: "Envio em Andamento",
  failed: "Erro de Processamento",
  paused: "Pausada",
  ready: "Pronta para enviar",
  draft: "Rascunho",
};

/** A busca espera a pessoa parar de digitar (a Clint: 500 ms). */
export const ESPERA_DA_BUSCA_MS = 500;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const periodoSchema = z
  .object({ de: z.string().regex(ISO).optional(), ate: z.string().regex(ISO).optional() })
  .strict();
export type PeriodoDoFiltro = z.infer<typeof periodoSchema>;

export const filtrosDeCampanhasSchema = z
  .object({
    busca: z.string().max(120).optional(),
    disparo: periodoSchema.optional(),
    criacao: periodoSchema.optional(),
    status: z.array(z.enum(STATUS_DO_FILTRO)).max(STATUS_DO_FILTRO.length).optional(),
    numero: z.string().uuid().optional(),
  })
  .strict();
export type FiltrosDeCampanhas = z.infer<typeof filtrosDeCampanhasSchema>;

export const FILTROS_VAZIOS: FiltrosDeCampanhas = {};

function periodoUtil(p: PeriodoDoFiltro | undefined): PeriodoDoFiltro | undefined {
  if (!p || (!p.de && !p.ate)) return undefined;
  return { ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) };
}

/** Sem chave vazia: o mesmo filtro tem sempre o mesmo texto (cache e URL). */
export function enxugarFiltros(f: FiltrosDeCampanhas): FiltrosDeCampanhas {
  const busca = f.busca?.trim();
  const disparo = periodoUtil(f.disparo);
  const criacao = periodoUtil(f.criacao);
  return {
    ...(busca ? { busca } : {}),
    ...(disparo ? { disparo } : {}),
    ...(criacao ? { criacao } : {}),
    ...(f.status?.length ? { status: [...new Set(f.status)] } : {}),
    ...(f.numero ? { numero: f.numero } : {}),
  };
}

export const temFiltro = (f: FiltrosDeCampanhas): boolean => Object.keys(enxugarFiltros(f)).length > 0;

export const PARAM_DOS_FILTROS = "f";

export const textoDosFiltros = (f: FiltrosDeCampanhas): string => JSON.stringify(enxugarFiltros(f));

/** O `?f=` da rota → filtros; `null` quando veio e não vale (a rota responde 422). */
export function filtrosDoTexto(texto: string | null | undefined): FiltrosDeCampanhas | null {
  if (!texto) return {};
  try {
    const lido = filtrosDeCampanhasSchema.safeParse(JSON.parse(texto));
    return lido.success ? enxugarFiltros(lido.data) : null;
  } catch {
    return null;
  }
}

/** O que `fn_escale_campanha_passa` (9301) lê. */
export type FiltroCompilado = {
  fuso: string;
  padrao?: string;
  status?: StatusDoFiltro[];
  numero?: string;
  disparo_de?: string;
  disparo_ate?: string;
  criada_de?: string;
  criada_ate?: string;
};

/** "%termo%" com `%`, `_` e `\` escapados (o `ilike` usa `\` como escape). */
export const padraoDoNome = (busca: string): string => `%${busca.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

export function compilarFiltros(f: FiltrosDeCampanhas, fuso: string): FiltroCompilado {
  const e = enxugarFiltros(f);
  return {
    fuso,
    ...(e.busca ? { padrao: padraoDoNome(e.busca) } : {}),
    ...(e.status ? { status: e.status } : {}),
    ...(e.numero ? { numero: e.numero } : {}),
    ...(e.disparo?.de ? { disparo_de: e.disparo.de } : {}),
    ...(e.disparo?.ate ? { disparo_ate: e.disparo.ate } : {}),
    ...(e.criacao?.de ? { criada_de: e.criacao.de } : {}),
    ...(e.criacao?.ate ? { criada_ate: e.criacao.ate } : {}),
  };
}
```

- [ ] **Step 6: `lib/escale/campanhas/apresentacao.ts`**

```ts
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

import type { ContagemDaLinha, LinhaDeCampanha } from "./tipos";

/**
 * O QUE A LISTA DE CAMPANHAS MOSTRA (fork Escale, Fase 8A; N5–N8). Funções
 * puras: o servidor conta, aqui se decide rótulo, cor, barra, cartão e texto.
 * Os textos passam por `t` (quem chama traduz).
 */
export type Traduzir = (texto: string) => string;

// ─── Status (selo) ─────────────────────────────────────────────────────────

export type TomDoStatus = "cinza" | "ciano" | "amarelo" | "azul" | "laranja" | "verde" | "granito" | "vermelho";

/** Os rótulos do selo (seção 6 do PRD; os da Clint, mais "Pronta para enviar"). */
export const ROTULO_DO_STATUS: Record<StatusDaCampanha, string> = {
  draft: "Rascunho",
  preparing: "Processando",
  ready: "Pronta para enviar",
  scheduled: "Agendado",
  running: "Em progresso",
  paused: "Pausada",
  completed: "Completo",
  cancelled: "Cancelado",
  failed: "Erro de processamento",
};

/** A dica do selo (material, "Textos de status"; Processando e Pronta são nossos). */
export const DICA_DO_STATUS: Record<StatusDaCampanha, string> = {
  draft: "Sua campanha foi salva como rascunho e ainda não foi enviada.",
  preparing: "Estamos montando a lista de contatos da sua campanha.",
  ready: "A lista de contatos está pronta e a campanha aguarda o envio.",
  scheduled: "Sua campanha foi agendada e será enviada na data e hora programadas.",
  running: "Sua mensagem está sendo enviada para os contatos da sua campanha.",
  paused: "Sua campanha foi pausada. Nenhum contato novo recebe mensagem até você retomar o envio.",
  completed: "O envio da campanha foi concluído.",
  cancelled: "Sua campanha foi cancelada e o envio não foi realizado.",
  failed: "Ocorreu um erro na sua campanha e ela não foi enviada para seus contatos.",
};

export const TOM_DO_STATUS: Record<StatusDaCampanha, TomDoStatus> = {
  draft: "cinza",
  preparing: "ciano",
  ready: "cinza",
  scheduled: "amarelo",
  running: "azul",
  paused: "laranja",
  completed: "verde",
  cancelled: "granito",
  failed: "vermelho",
};

/** Os que pulsam enquanto o servidor trabalha (material 2.1). */
export const STATUS_QUE_PULSAM: ReadonlySet<StatusDaCampanha> = new Set(["preparing", "running"]);

// ─── Números ───────────────────────────────────────────────────────────────

export const numeroBr = (n: number): string => n.toLocaleString("pt-BR");

/** Percentual inteiro; sem base, `null` (a tela mostra "—"). */
export function porcento(parte: number, base: number): number | null {
  if (base <= 0) return null;
  return Math.round((parte / base) * 100);
}

// ─── Barra de resultado (N6; 002, 008) ─────────────────────────────────────

export type ChaveDoSegmento = "erro" | "entregues" | "lidos" | "enviados";

export interface SegmentoDaBarra {
  chave: ChaveDoSegmento;
  quantidade: number;
  /** % da largura da barra (sobre os adicionados). */
  largura: number;
  porcento: number;
}

/** Segmentos disjuntos, na ordem da Clint; só os que têm alguém. */
export function segmentosDaBarra(c: ContagemDaLinha): SegmentoDaBarra[] {
  const base = c.adicionados;
  if (base <= 0) return [];
  const partes: Array<[ChaveDoSegmento, number]> = [
    ["erro", c.erros],
    ["entregues", Math.max(0, c.entregues - c.lidos)],
    ["lidos", c.lidos],
    ["enviados", Math.max(0, c.enviados - c.entregues)],
  ];
  return partes
    .filter(([, quantidade]) => quantidade > 0)
    .map(([chave, quantidade]) => ({
      chave,
      quantidade,
      largura: Math.min(100, (quantidade / base) * 100),
      porcento: Math.round((quantidade / base) * 100),
    }));
}

/** "16 lidos - 53%" (008); o erro sem percentual, como o código da Clint. */
export function textoDoSegmento(s: SegmentoDaBarra, t: Traduzir): string {
  const n = numeroBr(s.quantidade);
  const p = String(s.porcento);
  switch (s.chave) {
    case "erro":
      return t("{n} inválidos ou com erro").replace("{n}", n);
    case "entregues":
      return t("{n} entregues - {p}%").replace("{n}", n).replace("{p}", p);
    case "lidos":
      return t("{n} lidos - {p}%").replace("{n}", n).replace("{p}", p);
    case "enviados":
      return t("{n} enviados - {p}%").replace("{n}", n).replace("{p}", p);
  }
}

// ─── Resumo (N7; 003) ──────────────────────────────────────────────────────

export type ChaveDoCartao = "adicionados" | "enviados" | "entregues" | "lidas" | "erros";

export const ORDEM_DOS_CARTOES: readonly ChaveDoCartao[] = ["adicionados", "enviados", "entregues", "lidas", "erros"];

export const ROTULO_DO_CARTAO: Record<ChaveDoCartao, string> = {
  adicionados: "Adicionados para envio",
  enviados: "Enviados",
  entregues: "Entregues",
  lidas: "Lidas",
  erros: "Erros",
};

export function valoresDoCartao(chave: ChaveDoCartao, r: ContagemDaLinha): { total: number; porcento: number | null } {
  const total = {
    adicionados: r.adicionados,
    enviados: r.enviados,
    entregues: r.entregues,
    lidas: r.lidos,
    erros: r.erros,
  }[chave];
  return { total, porcento: chave === "adicionados" ? null : porcento(total, r.adicionados) };
}

// ─── Tempo e datas (N8) ────────────────────────────────────────────────────

const MES_MEDIO = 30.4375;
const ANO_MEDIO = 365.25;

/**
 * "há um mês" no molde do `relativeTime` do dayjs que a Clint usa (002): os
 * limites dele (44 s, 89 s, 44 min, 89 min, 21 h, 35 h, 25 d, 45 d, 10 meses,
 * 17 meses), com arredondamento.
 */
export function tempoDesde(iso: string, agora: Date, t: Traduzir): string {
  const seg = Math.max(0, (agora.getTime() - Date.parse(iso)) / 1000);
  const comN = (texto: string, n: number) => t(texto).replace("{n}", String(n));
  if (Math.round(seg) <= 44) return t("há poucos segundos");
  if (Math.round(seg) <= 89) return t("há um minuto");
  const min = Math.round(seg / 60);
  if (min <= 44) return comN("há {n} minutos", min);
  if (min <= 89) return t("há uma hora");
  const horas = Math.round(seg / 3600);
  if (horas <= 21) return comN("há {n} horas", horas);
  if (horas <= 35) return t("há um dia");
  const dias = Math.round(seg / 86_400);
  if (dias <= 25) return comN("há {n} dias", dias);
  if (dias <= 45) return t("há um mês");
  const meses = Math.round(seg / (86_400 * MES_MEDIO));
  if (meses <= 10) return comN("há {n} meses", meses);
  if (meses <= 17) return t("há um ano");
  return comN("há {n} anos", Math.round(seg / (86_400 * ANO_MEDIO)));
}

function partes(iso: string, fuso: string | undefined, comHora: boolean): Record<string, string> {
  const formatadas = new Intl.DateTimeFormat("en-GB", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(comHora ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
  }).formatToParts(new Date(iso));
  return Object.fromEntries(formatadas.map((p) => [p.type, p.value]));
}

/** "10/09/2026 12:39" — sempre o formato brasileiro (regra 5), em qualquer idioma da tela. */
export function dataEHoraBr(iso: string, fuso?: string): string {
  const p = partes(iso, fuso, true);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

export function dataBr(iso: string, fuso?: string): string {
  const p = partes(iso, fuso, false);
  return `${p.day}/${p.month}/${p.year}`;
}

/** A "Data agendamento" (N8): a agendada; senão, quando começou. */
export const dataDoDisparo = (l: Pick<LinhaDeCampanha, "agendadaPara" | "iniciadaEm">): string | null =>
  l.agendadaPara ?? l.iniciadaEm;

/** "30 Solicitados há um mês" (002); sem snapshot, "Criado em 01/10/2026". */
export function subtituloDaCampanha(
  l: Pick<LinhaDeCampanha, "solicitados" | "criadaEm">,
  agora: Date,
  t: Traduzir,
  fuso?: string,
): string {
  if (l.solicitados > 0) {
    const palavra = l.solicitados === 1 ? t("Solicitado") : t("Solicitados");
    return `${numeroBr(l.solicitados)} ${palavra} ${tempoDesde(l.criadaEm, agora, t)}`;
  }
  return `${t("Criado em")} ${dataBr(l.criadaEm, fuso)}`;
}
```

- [ ] **Step 7: `lib/escale/campanhas/acoes-da-linha.ts`**

```ts
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

/**
 * O ⋮ E O BOTÃO DA LINHA (fork Escale, Fase 8A; N9; material 2.1 e 007): o que
 * cada status oferece. "Cancelar campanha" antes do envio volta a rascunho (a
 * Clint); depois de alguém ter recebido, é definitivo.
 */
export type AcaoDaLinha =
  | "editar"
  | "excluir"
  | "alterar_horario"
  | "cancelar_para_rascunho"
  | "cancelar"
  | "duplicar";

export type AcaoConfirmavel = "excluir" | "cancelar_para_rascunho" | "cancelar";

export function acoesDaLinha(status: StatusDaCampanha, enviados: number): AcaoDaLinha[] {
  switch (status) {
    case "draft":
      return ["editar", "excluir", "duplicar"];
    case "ready":
      return ["cancelar_para_rascunho", "duplicar"];
    case "scheduled":
      return ["alterar_horario", enviados > 0 ? "cancelar" : "cancelar_para_rascunho", "duplicar"];
    case "running":
    case "paused":
      return ["cancelar", "duplicar"];
    default:
      return ["duplicar"];
  }
}

export const ROTULO_DA_ACAO: Record<AcaoDaLinha, string> = {
  editar: "Editar rascunho",
  excluir: "Excluir rascunho",
  alterar_horario: "Alterar horário do disparo",
  cancelar_para_rascunho: "Cancelar campanha",
  cancelar: "Cancelar campanha",
  duplicar: "Duplicar campanha",
};

export const ACOES_DESTRUTIVAS: ReadonlySet<AcaoDaLinha> = new Set(["excluir", "cancelar_para_rascunho", "cancelar"]);

export const CONFIRMACAO_DA_ACAO: Record<AcaoConfirmavel, string> = {
  excluir: "Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.",
  cancelar_para_rascunho:
    "A campanha será movida para Rascunho e você poderá editá-la e reagendar. Deseja continuar?",
  cancelar:
    "A campanha será cancelada e os contatos que ainda não receberam a mensagem não serão notificados. Esta ação não pode ser desfeita.",
};

/** Pausar/Retomar na linha (só WhatsApp, em andamento ou pausada; material 2.1). */
export function botaoDaLinha(status: StatusDaCampanha): "pausar" | "retomar" | null {
  if (status === "running") return "pausar";
  if (status === "paused") return "retomar";
  return null;
}
```

- [ ] **Step 8: `lib/escale/campanhas/rotas.ts`**

```ts
import { roleAtLeast, type Role } from "@/lib/auth/types";

/**
 * PARA ONDE A LISTA LEVA (fork Escale, Fase 8A; N2, N11). A 8B troca "nova" e
 * "rascunho" pelo assistente; a 8C troca o detalhe pela janela da Clint. Mudar
 * aqui muda a lista inteira.
 */
export const ROTA_DAS_CAMPANHAS = "/app/campaigns";
export const ROTA_DA_NOVA = "/app/campaigns/new";
export const ROTA_DA_CONFIGURACAO = "/app/campaigns/settings";
export const rotaDoRascunho = (id: string): string => `/app/campaigns/${id}/edit`;
export const rotaDoDetalhe = (id: string): string => `/app/campaigns/${id}`;

export type AbaDasCampanhas = "whatsapp" | "prospeccao";

export const ROTULO_DA_ABA: Record<AbaDasCampanhas, string> = {
  whatsapp: "WhatsApp",
  prospeccao: "Prospecção",
};

/** Prospecção só para admin (PRD seção 5); com uma aba só, a faixa some (a Clint). */
export const abasVisiveis = (papel: Role | null): AbaDasCampanhas[] =>
  roleAtLeast(papel, "admin") ? ["whatsapp", "prospeccao"] : ["whatsapp"];

export function abaDaUrl(valor: string | null | undefined, papel: Role | null): AbaDasCampanhas {
  return valor === "prospeccao" && roleAtLeast(papel, "admin") ? "prospeccao" : "whatsapp";
}

export const rotaDaAba = (aba: AbaDasCampanhas): string =>
  aba === "whatsapp" ? ROTA_DAS_CAMPANHAS : `${ROTA_DAS_CAMPANHAS}?aba=${aba}`;
```

- [ ] **Step 9: `lib/escale/campanhas/cores.ts`**

```ts
import type { ChaveDoSegmento, TomDoStatus } from "./apresentacao";

/**
 * AS CORES DA LISTA DE CAMPANHAS (fork Escale, Fase 8A; N16). Os valores moram
 * em `app/escale-tema.css` (bloco da 8A, claro e escuro); aqui só as classes,
 * por valor arbitrário, como as da 1F.
 */
export const CLASSE_DO_TOM: Record<TomDoStatus, string> = {
  cinza: "bg-(--escale-tom-cinza-fundo) text-(--escale-tom-cinza-texto)",
  ciano: "bg-(--escale-tom-ciano-fundo) text-(--escale-tom-ciano-texto)",
  amarelo: "bg-(--escale-tom-amarelo-fundo) text-(--escale-tom-amarelo-texto)",
  azul: "bg-(--escale-tom-azul-fundo) text-(--escale-tom-azul-texto)",
  laranja: "bg-(--escale-tom-laranja-fundo) text-(--escale-tom-laranja-texto)",
  verde: "bg-(--escale-tom-verde-fundo) text-(--escale-tom-verde-texto)",
  granito: "bg-(--escale-tom-granito-fundo) text-(--escale-tom-granito-texto)",
  vermelho: "bg-(--escale-tom-vermelho-fundo) text-(--escale-tom-vermelho-texto)",
};

export const CLASSE_DO_SEGMENTO: Record<ChaveDoSegmento, string> = {
  erro: "bg-(--escale-campanha-erro)",
  entregues: "bg-(--escale-campanha-entregues)",
  lidos: "bg-(--escale-campanha-lidos)",
  enviados: "bg-(--escale-campanha-enviados)",
};

/** A pílula da dica usa o fundo claro do próprio segmento (008). */
export const TOM_DA_DICA_DO_SEGMENTO: Record<ChaveDoSegmento, TomDoStatus> = {
  erro: "vermelho",
  entregues: "verde",
  lidos: "verde",
  enviados: "verde",
};

export const CLASSE_DO_TRILHO = "bg-(--escale-campanha-trilho)";
```

- [ ] **Step 10: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-regras.test.ts && corepack pnpm prettier --write lib/escale/campanhas tests/unit/escale-campanhas-regras.test.ts && corepack pnpm eslint lib/escale/campanhas && corepack pnpm typecheck`
Expected: PASS. Se `tempoDesde("2025-04-17…")` der "há 1 anos", confira o corte `meses <= 17` (18 meses arredonda para 2 anos).

- [ ] **Step 11: Commit**

```bash
git add docs/superpowers/plans/2026-10-19-fase-8a-lista-de-campanhas.md lib/escale/campanhas tests/unit/escale-campanhas-regras.test.ts
git commit -m "feat(escale): regras da lista de campanhas — filtros, status, barra, cartões e menu por status (Fase 8A)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 2: Migration 9301 (tempo real e as funções da lista)

**Files:**
- Create: `supabase/migrations/20261110120000_9301_lista_de_campanhas.sql`, `tests/unit/escale-lista-de-campanhas-migration.test.ts`, `tests/invariants/escale-lista-de-campanhas-9301.test.ts`
- Modify: `supabase/baseline.sql` (o bloco logo ANTES de `-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----`)

**Interfaces (Produces):**
- `fn_escale_campanha_passa(c public.campaigns, p_filtros jsonb) returns boolean` — lê o `FiltroCompilado` da Task 1.
- `fn_escale_contagem_de_campanhas(p_org uuid, p_ids uuid[]) returns table (campaign_id uuid, adicionados integer, enviados integer, entregues integer, lidos integer, erros integer)`.
- `fn_escale_lista_de_campanhas(p_org uuid, p_filtros jsonb, p_limite integer, p_deslocamento integer) returns table (campaign_id uuid, total bigint, nome text, status text, numero uuid, solicitados integer, agendada_para timestamptz, iniciada_em timestamptz, criada_em timestamptz, adicionados integer, enviados integer, entregues integer, lidos integer, erros integer)`.
- `fn_escale_resumo_das_campanhas(p_org uuid, p_filtros jsonb) returns table (adicionados bigint, enviados bigint, entregues bigint, lidos bigint, erros bigint)`.

- [ ] **Step 1: O teste do texto da migration (falha)**

`tests/unit/escale-lista-de-campanhas-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261110120000_9301_lista_de_campanhas.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

const INVOKER = [
  "fn_escale_campanha_passa(public.campaigns, jsonb)",
  "fn_escale_contagem_de_campanhas(uuid, uuid[])",
  "fn_escale_lista_de_campanhas(uuid, jsonb, integer, integer)",
  "fn_escale_resumo_das_campanhas(uuid, jsonb)",
];

describe("migration 9301 (lista de campanhas da casca)", () => {
  it("existe, começa pela linha do manifesto e a 2ª linha é o cabeçalho do bloco", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    expect(MIGRATION.split("\n")[1]).toBe("-- ---- FORK ESCALE · lista de campanhas da casca (migration 9301) ----");
  });

  it("campaigns entra na publicação do tempo real, com a guarda", () => {
    expect(MIGRATION).toContain("tablename = 'campaigns'");
    expect(MIGRATION).toContain("alter publication supabase_realtime add table public.campaigns");
    expect(MIGRATION).not.toContain("add table public.campaign_recipients");
  });

  it("as quatro são invoker, fechadas ao anon e abertas ao authenticated; nenhuma definer", () => {
    expect(MIGRATION).not.toMatch(/security definer/);
    for (const f of INVOKER) {
      const nome = f.split("(")[0];
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`));
      expect(MIGRATION).toContain(`revoke all on function public.${f} from public, anon;`);
      expect(MIGRATION).toContain(`grant execute on function public.${f} to authenticated, service_role;`);
    }
  });

  it("a lista e o resumo só respondem a gerente; o resumo tira rascunho e cancelada", () => {
    expect(MIGRATION.match(/fn_role_at_least\(p_org, 'manager'\)/g)?.length).toBe(2);
    expect(MIGRATION).toContain("c.status not in ('draft', 'cancelled')");
    expect(MIGRATION).toContain("order by c.created_at desc, c.id desc");
  });

  it("o baseline traz o bloco (sem a linha do manifesto) depois das tabelas de campanha e ANTES da varredura de anon", () => {
    const corpo = MIGRATION.split("\n").slice(1).join("\n").trimEnd();
    expect(BASELINE).toContain(corpo);
    const iBloco = BASELINE.indexOf("-- ---- FORK ESCALE · lista de campanhas da casca (migration 9301) ----");
    const iTabela = BASELINE.indexOf("create table if not exists public.campaign_recipients (");
    const iVarredura = BASELINE.indexOf(
      "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----",
    );
    expect(iTabela).toBeGreaterThan(-1);
    expect(iBloco).toBeGreaterThan(iTabela);
    expect(iVarredura).toBeGreaterThan(iBloco);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-lista-de-campanhas-migration.test.ts`
Expected: FAIL (o arquivo não existe).

- [ ] **Step 2: A migration**

`supabase/migrations/20261110120000_9301_lista_de_campanhas.sql` (a 1ª linha é uma linha só, sem quebra):

```sql
-- manifest: **Lista de campanhas da casca (fork Escale, Fase 8A).** `campaigns` entra na publicação `supabase_realtime` (a lista da casca se atualiza sozinha; nenhum dado novo). Quatro funções invoker, fechadas ao `anon`: `fn_escale_campanha_passa` (o filtro: nome, status, número principal, data do disparo e data de criação no fuso da organização), `fn_escale_contagem_de_campanhas` (adicionados, enviados, entregues, lidos e erros por carimbo cumulativo, disjuntos), `fn_escale_lista_de_campanhas` (a página, o total e as contagens) e `fn_escale_resumo_das_campanhas` (as contagens somadas, sem rascunhos e canceladas). A lista e o resumo só respondem a gerente ou acima da organização.
-- ---- FORK ESCALE · lista de campanhas da casca (migration 9301) ----
-- 9301: lista de campanhas da casca (fork Escale, Frente B).

-- ── 1. A lista se atualiza sozinha ───────────────────────────────────────────
-- Só `campaigns`: muda pouco (estado, agenda, edição). `campaign_recipients`
-- fica de fora — cada ack viraria um pulso; a tela reconsulta enquanto alguma
-- campanha anda.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'campaigns'
  ) then
    execute 'alter publication supabase_realtime add table public.campaigns';
  end if;
end $$;

-- ── 2. O filtro ──────────────────────────────────────────────────────────────
-- "Data do agendamento" = a agendada, senão quando começou (a coluna da tela).
create or replace function public.fn_escale_campanha_passa(c public.campaigns, p_filtros jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce((
        (p_filtros ->> 'padrao' is null or c.name ilike (p_filtros ->> 'padrao'))
    and (p_filtros -> 'status' is null
         or c.status in (select jsonb_array_elements_text(p_filtros -> 'status')))
    and (p_filtros ->> 'numero' is null or c.channel_session_id = (p_filtros ->> 'numero')::uuid)
    and (p_filtros ->> 'disparo_de' is null
         or (coalesce(c.scheduled_at, c.started_at) at time zone (p_filtros ->> 'fuso'))::date
            >= (p_filtros ->> 'disparo_de')::date)
    and (p_filtros ->> 'disparo_ate' is null
         or (coalesce(c.scheduled_at, c.started_at) at time zone (p_filtros ->> 'fuso'))::date
            <= (p_filtros ->> 'disparo_ate')::date)
    and (p_filtros ->> 'criada_de' is null
         or (c.created_at at time zone (p_filtros ->> 'fuso'))::date >= (p_filtros ->> 'criada_de')::date)
    and (p_filtros ->> 'criada_ate' is null
         or (c.created_at at time zone (p_filtros ->> 'fuso'))::date <= (p_filtros ->> 'criada_ate')::date)
  ), false)
$$;

-- ── 3. As contagens por carimbo cumulativo, disjuntas ────────────────────────
-- A régua de lib/campanhas/metricas.ts: quem respondeu também foi entregue e
-- lido. Quem falhou conta só em erros.
create or replace function public.fn_escale_contagem_de_campanhas(p_org uuid, p_ids uuid[])
returns table (campaign_id uuid, adicionados integer, enviados integer, entregues integer, lidos integer, erros integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select r.campaign_id,
         count(*) filter (where r.eligibility_status = 'eligible')::integer,
         count(*) filter (where r.status <> 'failed'
                            and (r.sent_at is not null or r.delivered_at is not null
                                 or r.read_at is not null or r.replied_at is not null))::integer,
         count(*) filter (where r.status <> 'failed'
                            and (r.delivered_at is not null or r.read_at is not null
                                 or r.replied_at is not null))::integer,
         count(*) filter (where r.status <> 'failed'
                            and (r.read_at is not null or r.replied_at is not null))::integer,
         count(*) filter (where r.status = 'failed')::integer
    from public.campaign_recipients r
   where r.organization_id = p_org
     and r.campaign_id = any (p_ids)
   group by r.campaign_id
$$;

-- ── 4. A página ──────────────────────────────────────────────────────────────
create or replace function public.fn_escale_lista_de_campanhas(
  p_org uuid,
  p_filtros jsonb,
  p_limite integer,
  p_deslocamento integer
)
returns table (
  campaign_id uuid, total bigint, nome text, status text, numero uuid, solicitados integer,
  agendada_para timestamptz, iniciada_em timestamptz, criada_em timestamptz,
  adicionados integer, enviados integer, entregues integer, lidos integer, erros integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with pagina as (
    select c.id, c.name, c.status, c.channel_session_id, c.snapshot_total,
           c.scheduled_at, c.started_at, c.created_at, count(*) over () as total
      from public.campaigns c
     where c.organization_id = p_org
       and public.fn_role_at_least(p_org, 'manager')
       and public.fn_escale_campanha_passa(c, coalesce(p_filtros, '{}'::jsonb))
     order by c.created_at desc, c.id desc
     limit least(greatest(coalesce(p_limite, 10), 1), 100)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  ),
  contagens as (
    select * from public.fn_escale_contagem_de_campanhas(p_org, array(select pg.id from pagina pg))
  )
  select pg.id, pg.total, pg.name, pg.status, pg.channel_session_id, pg.snapshot_total,
         pg.scheduled_at, pg.started_at, pg.created_at,
         coalesce(k.adicionados, 0), coalesce(k.enviados, 0), coalesce(k.entregues, 0),
         coalesce(k.lidos, 0), coalesce(k.erros, 0)
    from pagina pg
    left join contagens k on k.campaign_id = pg.id
   order by pg.created_at desc, pg.id desc
$$;

-- ── 5. O resumo ──────────────────────────────────────────────────────────────
-- Sem rascunhos e canceladas, como a Clint (`_nin: ["CANCELED", "DRAFT"]`).
create or replace function public.fn_escale_resumo_das_campanhas(p_org uuid, p_filtros jsonb)
returns table (adicionados bigint, enviados bigint, entregues bigint, lidos bigint, erros bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with escolhidas as (
    select array(
      select c.id
        from public.campaigns c
       where c.organization_id = p_org
         and public.fn_role_at_least(p_org, 'manager')
         and c.status not in ('draft', 'cancelled')
         and public.fn_escale_campanha_passa(c, coalesce(p_filtros, '{}'::jsonb))
    ) as ids
  )
  select coalesce(sum(k.adicionados), 0)::bigint,
         coalesce(sum(k.enviados), 0)::bigint,
         coalesce(sum(k.entregues), 0)::bigint,
         coalesce(sum(k.lidos), 0)::bigint,
         coalesce(sum(k.erros), 0)::bigint
    from escolhidas e
    left join lateral public.fn_escale_contagem_de_campanhas(p_org, e.ids) k on true
$$;

-- ── 6. Quem executa ──────────────────────────────────────────────────────────
revoke all on function public.fn_escale_campanha_passa(public.campaigns, jsonb) from public, anon;
revoke all on function public.fn_escale_contagem_de_campanhas(uuid, uuid[]) from public, anon;
revoke all on function public.fn_escale_lista_de_campanhas(uuid, jsonb, integer, integer) from public, anon;
revoke all on function public.fn_escale_resumo_das_campanhas(uuid, jsonb) from public, anon;
grant execute on function public.fn_escale_campanha_passa(public.campaigns, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_contagem_de_campanhas(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.fn_escale_lista_de_campanhas(uuid, jsonb, integer, integer) to authenticated, service_role;
grant execute on function public.fn_escale_resumo_das_campanhas(uuid, jsonb) to authenticated, service_role;

comment on function public.fn_escale_lista_de_campanhas(uuid, jsonb, integer, integer) is
  'Fork Escale (9301): uma página da lista de campanhas da casca, com o filtro compilado, o total e as contagens por carimbo. Invoker; só gerente ou acima.';
comment on function public.fn_escale_resumo_das_campanhas(uuid, jsonb) is
  'Fork Escale (9301): as contagens somadas das campanhas do filtro, sem rascunhos e canceladas. Invoker; só gerente ou acima.';

notify pgrst, 'reload schema';
```

- [ ] **Step 3: O bloco no baseline**

Abra `supabase/baseline.sql`, ache a linha `-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----` e cole **logo antes dela** o conteúdo da migration **sem a 1ª linha** (`-- manifest:`), seguido de uma linha em branco. O bloco fica depois do da 9107 (e do da 9205, se a 3E já estiver na `main`).

```bash
tail -n +2 supabase/migrations/20261110120000_9301_lista_de_campanhas.sql > "$TEMP/bloco-9301.sql"
node -e '
const fs = require("fs");
const alvo = "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----";
const base = fs.readFileSync("supabase/baseline.sql", "utf8");
const bloco = fs.readFileSync(process.argv[1], "utf8").trimEnd() + "\n\n";
const i = base.indexOf(alvo);
if (i < 0 || base.includes("(migration 9301) ----")) { console.error("âncora ausente ou bloco já colado"); process.exit(1); }
fs.writeFileSync("supabase/baseline.sql", base.slice(0, i) + bloco + base.slice(i));
' "$TEMP/bloco-9301.sql"
```

- [ ] **Step 4: A prova contra Postgres real (roda na bateria da Frente B)**

`tests/invariants/escale-lista-de-campanhas-9301.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_CONTACT_1,
  GOV_CONTACT_2,
  GOV_CONTACT_3,
  GOV_MANAGER,
  GOV_ORG,
  GOV_SESSION,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * LISTA DE CAMPANHAS DA CASCA (fork Escale, migration 9301) — prova contra
 * Postgres real: campaigns na publicação, a lista com as contagens disjuntas, a
 * ordem e o total, os filtros (nome, status, data do disparo e de criação), o
 * resumo sem rascunho, e viewer/agente sem nada. Roda via `pnpm test:db`.
 */
const C1 = "e5ca1e00-9301-4000-8000-0000000000a1";
const C2 = "e5ca1e00-9301-4000-8000-0000000000a2";
const FUSO = `"fuso":"America/Sao_Paulo"`;
const comoGerente = (q: string) =>
  lastLine(sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${GOV_MANAGER}"}', false); ${q}`));
const lista = (filtros: string) =>
  `select count(*) from public.fn_escale_lista_de_campanhas('${GOV_ORG}', '{${FUSO},${filtros}}'::jsonb, 10, 0)`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.campaigns where id::text like 'e5ca1e00-9301-%';
    insert into public.campaigns (id, organization_id, name, status, channel_session_id, base_legal,
                                  snapshot_total, snapshot_eligible, started_at, created_at)
    values ('${C1}', '${GOV_ORG}', 'Reativação 8A', 'completed', '${GOV_SESSION}', 'consent', 3, 3,
            '2026-10-10 15:00:00+00', '2026-10-09 15:00:00+00'),
           ('${C2}', '${GOV_ORG}', 'Rascunho 8A', 'draft', '${GOV_SESSION}', 'consent', 0, 0,
            null, '2026-10-01 15:00:00+00');
    insert into public.campaign_recipients (organization_id, campaign_id, contact_id, status, eligibility_status,
                                            sent_at, delivered_at, read_at)
    values ('${GOV_ORG}', '${C1}', '${GOV_CONTACT_1}', 'read', 'eligible', now(), now(), now()),
           ('${GOV_ORG}', '${C1}', '${GOV_CONTACT_2}', 'delivered', 'eligible', now(), now(), null),
           ('${GOV_ORG}', '${C1}', '${GOV_CONTACT_3}', 'failed', 'eligible', null, null, null);
  `);
});

describe("tempo real e travas", () => {
  it("campaigns está na publicação; campaign_recipients não", () => {
    expect(lastLine(sql(`select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'campaigns'`))).toBe("1");
    expect(lastLine(sql(`select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'campaign_recipients'`))).toBe("0");
  });

  it("anon não executa a lista", () => {
    expect(lastLine(sql(`select has_function_privilege('anon', 'public.fn_escale_lista_de_campanhas(uuid, jsonb, integer, integer)', 'execute')`))).toBe("f");
  });

  it("viewer e agente recebem vazio", () => {
    expect(countAs(GOV_VIEWER, lista(`"padrao":"%8A"`))).toBe(0);
    expect(countAs(GOV_AGENT_A, lista(`"padrao":"%8A"`))).toBe(0);
  });
});

describe("a lista do gerente", () => {
  it("as contagens disjuntas: 3 adicionados, 2 enviados, 2 entregues, 1 lido, 1 erro", () => {
    expect(
      comoGerente(
        `select nome || '|' || solicitados || '|' || adicionados || '|' || enviados || '|' || entregues || '|' || lidos || '|' || erros from public.fn_escale_lista_de_campanhas('${GOV_ORG}', '{${FUSO},"padrao":"Reativação 8A"}'::jsonb, 10, 0)`,
      ),
    ).toBe("Reativação 8A|3|3|2|2|1|1");
  });

  it("mais recente primeiro, com o total em toda linha", () => {
    expect(
      comoGerente(
        `select string_agg(nome || ':' || total, ',' order by criada_em desc) from public.fn_escale_lista_de_campanhas('${GOV_ORG}', '{${FUSO},"padrao":"%8A"}'::jsonb, 10, 0)`,
      ),
    ).toBe("Reativação 8A:2,Rascunho 8A:2");
  });

  it("filtros: status, data do disparo e data de criação", () => {
    expect(countAs(GOV_MANAGER, lista(`"padrao":"%8A","status":["draft"]`))).toBe(1);
    expect(countAs(GOV_MANAGER, lista(`"padrao":"%8A","disparo_de":"2026-10-10"`))).toBe(1);
    expect(countAs(GOV_MANAGER, lista(`"padrao":"%8A","disparo_ate":"2026-10-09"`))).toBe(0);
    expect(countAs(GOV_MANAGER, lista(`"padrao":"%8A","criada_ate":"2026-10-05"`))).toBe(1);
  });
});

describe("o resumo", () => {
  it("soma sem o rascunho", () => {
    expect(
      comoGerente(
        `select adicionados || '|' || enviados || '|' || entregues || '|' || lidos || '|' || erros from public.fn_escale_resumo_das_campanhas('${GOV_ORG}', '{${FUSO},"padrao":"%8A"}'::jsonb)`,
      ),
    ).toBe("3|2|2|1|1");
  });
});
```

- [ ] **Step 5: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-lista-de-campanhas-migration.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/manifest-cita-caminho-que-existe.test.ts $(ls tests/unit/*.test.ts | grep -E "definer|hardening|varredura-anon") && bash scripts/checar-colisao-de-migration.sh escale-crm/main`
Expected: os testes PASS; a colisão sem achado. O `tests/invariants/escale-lista-de-campanhas-9301.test.ts` **não** roda agora (bateria).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261110120000_9301_lista_de_campanhas.sql supabase/baseline.sql tests/unit/escale-lista-de-campanhas-migration.test.ts tests/invariants/escale-lista-de-campanhas-9301.test.ts
git commit -m "feat(escale): migration 9301 — campanhas no tempo real e as funções da lista e do resumo (Fase 8A)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 3: As rotas de leitura (lista e resumo)

**Files:**
- Create: `lib/escale/campanhas/banco.ts`, `app/api/v1/campanhas-da-casca/route.ts`, `app/api/v1/campanhas-da-casca/resumo/route.ts`, `tests/unit/escale-campanhas-da-casca-rotas.test.ts`

**Interfaces:**
- Consumes: `FiltroCompilado`, `compilarFiltros`, `filtrosDoTexto` (Task 1); as funções da 9301 (Task 2); `fusoDaOrganizacao` (`lib/escale/contatos/lista.ts`); `POR_PAGINA`, `POR_PAGINA_PADRAO` (`lib/escale/contatos/regras.ts`).
- Produces: `GET /api/v1/campanhas-da-casca?p=&n=&f=` → `{ data: PaginaDeCampanhas }`; `GET /api/v1/campanhas-da-casca/resumo?f=` → `{ data: ResumoDasCampanhas }`; `lerPaginaDeCampanhas(supabase, orgId, filtro, pagina, porPagina)`, `lerResumoDasCampanhas(supabase, orgId, filtro)`, `linhaDaFuncao(l)`.

- [ ] **Step 1: O teste das rotas (falha)**

`tests/unit/escale-campanhas-da-casca-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/campanhas-da-casca/route";
import { GET as GET_RESUMO } from "@/app/api/v1/campanhas-da-casca/resumo/route";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

type Resposta = { data: unknown; error: { message: string } | null };

function banco(rpc: Record<string, Resposta>) {
  const db = {
    rpc: vi.fn((nome: string) => Promise.resolve(rpc[nome] ?? { data: [], error: null })),
    from: vi.fn(() => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
      c.maybeSingle = vi.fn().mockResolvedValue({ data: { timezone: "America/Sao_Paulo" }, error: null });
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

const pedido = (url: string) => new NextRequest(new URL(url, "http://x"));
const f = (filtros: unknown) => encodeURIComponent(JSON.stringify(filtros));
const NUMERO = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
});

describe("GET /api/v1/campanhas-da-casca", () => {
  it("exige gerente; compila o filtro com o fuso; pagina; devolve as linhas e o total", async () => {
    authOk("manager");
    const db = banco({
      fn_escale_lista_de_campanhas: {
        data: [
          {
            campaign_id: "c1", total: "12", nome: "Reativação", status: "completed", numero: NUMERO, solicitados: 30,
            agendada_para: null, iniciada_em: "2026-09-10T15:39:00Z", criada_em: "2026-09-10T12:00:00Z",
            adicionados: 30, enviados: 26, entregues: 24, lidos: 16, erros: 3,
          },
        ],
        error: null,
      },
    });
    const r = await GET(pedido(`/api/v1/campanhas-da-casca?p=2&n=10&f=${f({ busca: "Reat", status: ["completed"] })}`));
    expect(r.status).toBe(200);
    expect(vi.mocked(requireRole)).toHaveBeenCalledWith("manager", expect.anything());
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_lista_de_campanhas", {
      p_org: ORG_ID,
      p_filtros: { fuso: "America/Sao_Paulo", padrao: "%Reat%", status: ["completed"] },
      p_limite: 10,
      p_deslocamento: 10,
    });
    const { data } = await r.json();
    expect(data).toMatchObject({ total: 12, pagina: 2, porPagina: 10 });
    expect(data.linhas[0]).toEqual({
      id: "c1", nome: "Reativação", status: "completed", numeroId: NUMERO, solicitados: 30,
      agendadaPara: null, iniciadaEm: "2026-09-10T15:39:00Z", criadaEm: "2026-09-10T12:00:00Z",
      adicionados: 30, enviados: 26, entregues: 24, lidos: 16, erros: 3,
    });
  });

  it("página vazia tem total 0", async () => {
    authOk("manager");
    banco({});
    const { data } = await (await GET(pedido("/api/v1/campanhas-da-casca"))).json();
    expect(data).toEqual({ linhas: [], total: 0, pagina: 1, porPagina: 10 });
  });

  it("filtro ruim e 'por página' fora da lista são 422", async () => {
    authOk("manager");
    banco({});
    const r1 = await GET(pedido(`/api/v1/campanhas-da-casca?f=${f({ status: ["preparing"] })}`));
    expect(r1.status).toBe(422);
    expect((await r1.json()).error.message).toBe("Filtro inválido.");
    expect((await GET(pedido("/api/v1/campanhas-da-casca?n=7"))).status).toBe(422);
  });

  it("erro do banco é 500 com a mensagem", async () => {
    authOk("manager");
    banco({ fn_escale_lista_de_campanhas: { data: null, error: { message: "boom" } } });
    expect((await GET(pedido("/api/v1/campanhas-da-casca"))).status).toBe(500);
  });
});

describe("GET /api/v1/campanhas-da-casca/resumo", () => {
  it("as somas como número", async () => {
    authOk("manager");
    const db = banco({
      fn_escale_resumo_das_campanhas: {
        data: [{ adicionados: "14989", enviados: "9922", entregues: "9110", lidos: "2408", erros: "4087" }],
        error: null,
      },
    });
    const r = await GET_RESUMO(pedido(`/api/v1/campanhas-da-casca/resumo?f=${f({ numero: NUMERO })}`));
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_resumo_das_campanhas", {
      p_org: ORG_ID,
      p_filtros: { fuso: "America/Sao_Paulo", numero: NUMERO },
    });
    expect((await r.json()).data).toEqual({ adicionados: 14989, enviados: 9922, entregues: 9110, lidos: 2408, erros: 4087 });
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-da-casca-rotas.test.ts`
Expected: FAIL (as rotas não existem).

- [ ] **Step 2: `lib/escale/campanhas/banco.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

import type { FiltroCompilado } from "./filtros";
import type { LinhaDeCampanha, PaginaDeCampanhas, ResumoDasCampanhas } from "./tipos";

/**
 * A LEITURA DA LISTA DE CAMPANHAS (fork Escale, Fase 8A) — servidor. As funções
 * da 9301 (invoker) filtram, paginam e contam com a sessão de quem olha; aqui
 * só se dá nome às colunas. `bigint` chega como texto pelo PostgREST.
 */
type Numero = number | string | null | undefined;

type LinhaDaFuncao = {
  campaign_id: string;
  total: Numero;
  nome: string;
  status: string;
  numero: string;
  solicitados: Numero;
  agendada_para: string | null;
  iniciada_em: string | null;
  criada_em: string;
  adicionados: Numero;
  enviados: Numero;
  entregues: Numero;
  lidos: Numero;
  erros: Numero;
};

type ResumoDaFuncao = Record<keyof ResumoDasCampanhas, Numero>;

const numero = (v: Numero): number => Number(v ?? 0);

export function linhaDaFuncao(l: LinhaDaFuncao): LinhaDeCampanha {
  return {
    id: l.campaign_id,
    nome: l.nome,
    status: l.status as StatusDaCampanha,
    numeroId: l.numero,
    solicitados: numero(l.solicitados),
    agendadaPara: l.agendada_para,
    iniciadaEm: l.iniciada_em,
    criadaEm: l.criada_em,
    adicionados: numero(l.adicionados),
    enviados: numero(l.enviados),
    entregues: numero(l.entregues),
    lidos: numero(l.lidos),
    erros: numero(l.erros),
  };
}

export async function lerPaginaDeCampanhas(
  supabase: SupabaseClient,
  orgId: string,
  filtro: FiltroCompilado,
  pagina: number,
  porPagina: number,
): Promise<PaginaDeCampanhas> {
  const { data, error } = await supabase.rpc("fn_escale_lista_de_campanhas", {
    p_org: orgId,
    p_filtros: filtro,
    p_limite: porPagina,
    p_deslocamento: (pagina - 1) * porPagina,
  });
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as LinhaDaFuncao[];
  return { linhas: linhas.map(linhaDaFuncao), total: numero(linhas[0]?.total), pagina, porPagina };
}

export async function lerResumoDasCampanhas(
  supabase: SupabaseClient,
  orgId: string,
  filtro: FiltroCompilado,
): Promise<ResumoDasCampanhas> {
  const { data, error } = await supabase.rpc("fn_escale_resumo_das_campanhas", { p_org: orgId, p_filtros: filtro });
  if (error) throw new Error(error.message);
  const r = (Array.isArray(data) ? data[0] : data) as ResumoDaFuncao | undefined;
  return {
    adicionados: numero(r?.adicionados),
    enviados: numero(r?.enviados),
    entregues: numero(r?.entregues),
    lidos: numero(r?.lidos),
    erros: numero(r?.erros),
  };
}
```

- [ ] **Step 3: `app/api/v1/campanhas-da-casca/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerPaginaDeCampanhas } from "@/lib/escale/campanhas/banco";
import { compilarFiltros, filtrosDoTexto } from "@/lib/escale/campanhas/filtros";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { POR_PAGINA, POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const consultaSchema = z.object({
  p: z.coerce.number().int().min(1).max(100_000).default(1),
  n: z.coerce
    .number()
    .int()
    .refine((n) => (POR_PAGINA as readonly number[]).includes(n))
    .default(POR_PAGINA_PADRAO),
  f: z.string().max(4096).optional(),
});

/**
 * GET /api/v1/campanhas-da-casca — a lista de campanhas da casca (fork Escale,
 * Fase 8A). Gerente, como as rotas do original; a sessão de quem olha (a 9301
 * é invoker) e o fuso da organização para as datas do filtro.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lida = consultaSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!lida.success) return fail("validation_failed", t("Query inválida."), 422, { requestId });
  const filtros = filtrosDoTexto(lida.data.f);
  if (filtros === null) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  try {
    const supabase = await createClient();
    const fuso = await fusoDaOrganizacao(supabase, authz.org.orgId);
    const pagina = await lerPaginaDeCampanhas(
      supabase,
      authz.org.orgId,
      compilarFiltros(filtros, fuso),
      lida.data.p,
      lida.data.n,
    );
    return ok(pagina, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 4: `app/api/v1/campanhas-da-casca/resumo/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerResumoDasCampanhas } from "@/lib/escale/campanhas/banco";
import { PARAM_DOS_FILTROS, compilarFiltros, filtrosDoTexto } from "@/lib/escale/campanhas/filtros";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/v1/campanhas-da-casca/resumo — os 5 cartões do "Resumo das campanhas" (Fase 8A, N7). */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const filtros = filtrosDoTexto(req.nextUrl.searchParams.get(PARAM_DOS_FILTROS));
  if (filtros === null) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  try {
    const supabase = await createClient();
    const fuso = await fusoDaOrganizacao(supabase, authz.org.orgId);
    return ok(await lerResumoDasCampanhas(supabase, authz.org.orgId, compilarFiltros(filtros, fuso)), { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 5: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-da-casca-rotas.test.ts && corepack pnpm prettier --write lib/escale/campanhas/banco.ts app/api/v1/campanhas-da-casca tests/unit/escale-campanhas-da-casca-rotas.test.ts && corepack pnpm eslint lib/escale/campanhas app/api/v1/campanhas-da-casca && corepack pnpm typecheck`
Expected: PASS. Se o typecheck reclamar do nome da função no `rpc` (tipo gerado que não a conhece), siga o mesmo caminho da `fn_escale_lista_de_contatos` em `lib/escale/contatos/lista.ts` (o client ali não é tipado por função).

- [ ] **Step 6: Commit**

```bash
git add lib/escale/campanhas/banco.ts app/api/v1/campanhas-da-casca tests/unit/escale-campanhas-da-casca-rotas.test.ts
git commit -m "feat(escale): rotas da lista e do resumo de campanhas da casca (Fase 8A)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 4: O motor — voltar a rascunho, alterar horário e excluir rascunho

**Files:**
- Modify: `lib/campanhas/maquina-de-estados.ts`, `lib/campanhas/maquina-de-estados.test.ts`, `lib/audit/actions.ts`
- Create: `lib/escale/campanhas/acoes.ts`, `app/api/v1/campanhas-da-casca/[id]/route.ts`, `app/api/v1/campanhas-da-casca/[id]/[acao]/route.ts`, `tests/unit/escale-campanhas-acoes.test.ts`

**Interfaces:**
- Consumes: `carregarCampanha`, `CampanhaCarregada`, `Desfecho`, `Recusa` (`lib/campanhas/acoes.ts`, já exportados); `podeTransitar` (`lib/campanhas/maquina-de-estados.ts`).
- Produces: `reagendarAcao(admin, c, quando, agora) → Desfecho<{ scheduled_at: string }>`, `voltarAoRascunhoAcao(admin, c) → Desfecho`, `excluirRascunhoAcao(admin, c) → Desfecho`; `POST /api/v1/campanhas-da-casca/[id]/reagendar` (`{ scheduled_at }` ISO) → `{ data: { scheduled_at } }`; `POST /api/v1/campanhas-da-casca/[id]/rascunho` → `{ data: { status: "draft" } }`; `DELETE /api/v1/campanhas-da-casca/[id]` → `{ data: { id } }`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-campanhas-acoes.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/app/api/v1/messages/_handler", () => ({ sendMessageHandler: vi.fn() }));
vi.mock("@/lib/atendimento/origem", () => ({ beginServiceAtOrigin: vi.fn() }));

import { DELETE } from "@/app/api/v1/campanhas-da-casca/[id]/route";
import { POST } from "@/app/api/v1/campanhas-da-casca/[id]/[acao]/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import type { CampanhaCarregada } from "@/lib/campanhas/acoes";
import { podeTransitar } from "@/lib/campanhas/maquina-de-estados";
import { excluirRascunhoAcao, reagendarAcao, voltarAoRascunhoAcao } from "@/lib/escale/campanhas/acoes";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

const ID = "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const AGORA = new Date("2026-10-19T12:00:00Z");

const campanha = (status: string, extra: Partial<CampanhaCarregada> = {}): CampanhaCarregada =>
  ({
    id: ID, organization_id: ORG_ID, name: "Reativação", status, channel_session_id: "s1", message_body: "Oi",
    base_legal: "consent", lia_ref: null, audience_filter: {}, audience_version: 1, content_version: 1,
    scheduled_at: null, intervalo_segundos: null, janela_inicio_hora: null, janela_fim_hora: null,
    teto_diario: null, teto_horario: null, description: null, ...extra,
  }) as CampanhaCarregada;

/** O admin falso: `select(..., { head: true })` devolve a contagem; o resto, `escrita`. */
function admin(op: { campanha?: CampanhaCarregada | null; enviados?: number; escrita?: Array<{ id: string }> }) {
  const chamadas: Array<{ tabela: string; metodo: string; args: unknown[] }> = [];
  const from = vi.fn((tabela: string) => {
    let contar = false;
    const c: Record<string, unknown> = {};
    for (const m of ["select", "eq", "not", "update", "delete"]) {
      c[m] = (...args: unknown[]) => {
        chamadas.push({ tabela, metodo: m, args });
        if (m === "select" && (args[1] as { head?: boolean } | undefined)?.head) contar = true;
        return c;
      };
    }
    c.maybeSingle = () => Promise.resolve({ data: op.campanha ?? null, error: null });
    c.then = (ok: (x: unknown) => unknown, erro?: (e: unknown) => unknown) =>
      Promise.resolve(
        contar ? { count: op.enviados ?? 0, error: null } : { data: op.escrita ?? [{ id: ID }], error: null },
      ).then(ok, erro);
    return c;
  });
  const db = { from, chamadas };
  vi.mocked(createAdminClient).mockReturnValue(db as never);
  return db;
}

const pedido = (url: string, corpo?: unknown, metodo = "POST") =>
  new NextRequest(new URL(url, "http://x"), {
    method: metodo,
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo), headers: { "content-type": "application/json" } }),
  } as never);
const params = (acao?: string) => ({ params: Promise.resolve(acao ? { id: ID, acao } : { id: ID }) }) as never;

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(audit).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
});

describe("máquina de estados (N10)", () => {
  it("agendada pode voltar a rascunho", () => {
    expect(podeTransitar("scheduled", "draft")).toEqual({ pode: true });
  });
});

describe("reagendarAcao", () => {
  it("só agendada; só no futuro; grava com compare-and-set no status", async () => {
    const db = admin({});
    expect(await reagendarAcao(db as never, campanha("ready"), new Date("2026-10-20T12:00:00Z"), AGORA)).toMatchObject({ ok: false, status: 409 });
    expect(await reagendarAcao(db as never, campanha("scheduled"), new Date("2026-10-18T12:00:00Z"), AGORA)).toMatchObject({ ok: false, codigo: "campanha_agenda_invalida" });
    const r = await reagendarAcao(db as never, campanha("scheduled"), new Date("2026-10-20T12:00:00Z"), AGORA);
    expect(r).toEqual({ ok: true, scheduled_at: "2026-10-20T12:00:00.000Z" });
    expect(db.chamadas).toContainEqual({ tabela: "campaigns", metodo: "update", args: [{ scheduled_at: "2026-10-20T12:00:00.000Z" }] });
    expect(db.chamadas).toContainEqual({ tabela: "campaigns", metodo: "eq", args: ["status", "scheduled"] });
  });

  it("estado que mudou no meio é conflito", async () => {
    const db = admin({ escrita: [] });
    expect(await reagendarAcao(db as never, campanha("scheduled"), new Date("2026-10-20T12:00:00Z"), AGORA)).toMatchObject({ ok: false, status: 409 });
  });
});

describe("voltarAoRascunhoAcao", () => {
  it("agendada e pronta voltam; limpa a agenda", async () => {
    const db = admin({});
    expect(await voltarAoRascunhoAcao(db as never, campanha("scheduled"))).toEqual({ ok: true });
    expect(db.chamadas).toContainEqual({ tabela: "campaigns", metodo: "update", args: [{ status: "draft", scheduled_at: null }] });
    expect(await voltarAoRascunhoAcao(admin({}) as never, campanha("ready"))).toEqual({ ok: true });
  });

  it("quem já enviou não volta; concluída não volta", async () => {
    expect(await voltarAoRascunhoAcao(admin({ enviados: 3 }) as never, campanha("scheduled"))).toMatchObject({ ok: false, codigo: "campanha_nao_editavel" });
    expect(await voltarAoRascunhoAcao(admin({}) as never, campanha("completed"))).toMatchObject({ ok: false, codigo: "campanha_estado_invalido" });
  });
});

describe("excluirRascunhoAcao", () => {
  it("só rascunho que nunca enviou; apaga com o status preso", async () => {
    const db = admin({});
    expect(await excluirRascunhoAcao(db as never, campanha("draft"))).toEqual({ ok: true });
    expect(db.chamadas.some((c) => c.metodo === "delete")).toBe(true);
    expect(await excluirRascunhoAcao(admin({}) as never, campanha("scheduled"))).toMatchObject({ ok: false, status: 409 });
    expect(await excluirRascunhoAcao(admin({ enviados: 1 }) as never, campanha("draft"))).toMatchObject({ ok: false, codigo: "campanha_nao_editavel" });
  });
});

describe("as rotas do fork", () => {
  it("reagendar: corpo ruim é 422; ok audita campaign.rescheduled", async () => {
    authOk("manager");
    admin({ campanha: campanha("scheduled") });
    expect((await POST(pedido(`/api/v1/campanhas-da-casca/${ID}/reagendar`, {}), params("reagendar"))).status).toBe(422);
    const r = await POST(pedido(`/api/v1/campanhas-da-casca/${ID}/reagendar`, { scheduled_at: "2099-01-01T12:00:00.000Z" }), params("reagendar"));
    expect(r.status).toBe(200);
    expect((await r.json()).data).toEqual({ scheduled_at: "2099-01-01T12:00:00.000Z" });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.rescheduled", resourceId: ID }));
  });

  it("rascunho: audita campaign.back_to_draft; ação desconhecida é 404; campanha que não existe é 404", async () => {
    authOk("manager");
    admin({ campanha: campanha("ready") });
    const r = await POST(pedido(`/api/v1/campanhas-da-casca/${ID}/rascunho`), params("rascunho"));
    expect(r.status).toBe(200);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.back_to_draft", metadata: { de: "ready" } }));
    expect((await POST(pedido(`/api/v1/campanhas-da-casca/${ID}/xyz`), params("xyz"))).status).toBe(404);
    admin({ campanha: null });
    expect((await POST(pedido(`/api/v1/campanhas-da-casca/${ID}/rascunho`), params("rascunho"))).status).toBe(404);
  });

  it("DELETE: exige gerente; apaga o rascunho e audita campaign.draft_deleted", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    admin({ campanha: campanha("draft") });
    expect((await DELETE(pedido(`/api/v1/campanhas-da-casca/${ID}`, undefined, "DELETE"), params())).status).toBe(403);
    expect(vi.mocked(requireRole)).toHaveBeenCalledWith("manager", expect.anything());
    authOk("manager");
    const r = await DELETE(pedido(`/api/v1/campanhas-da-casca/${ID}`, undefined, "DELETE"), params());
    expect(r.status).toBe(200);
    expect((await r.json()).data).toEqual({ id: ID });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.draft_deleted" }));
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-acoes.test.ts`
Expected: FAIL (os módulos do fork não existem; `podeTransitar("scheduled", "draft")` recusa).

- [ ] **Step 2: A transição nova**

Em `lib/campanhas/maquina-de-estados.ts`, troque

```ts
  scheduled: ["running", "paused", "cancelled"],
```

por

```ts
  // FORK ESCALE · Fase 8A: a agendada volta a rascunho ("Cancelar campanha" da
  // Clint antes do envio). Quem já enviou é recusado pela ação, que vê os envios.
  scheduled: ["running", "paused", "cancelled", "draft"],
```

E no fim de `lib/campanhas/maquina-de-estados.test.ts`, antes do último `});`:

```ts
  // FORK ESCALE · Fase 8A: "Cancelar campanha" da agendada volta a rascunho.
  it("agendada pode voltar a rascunho (fork Escale)", () => {
    expect(podeTransitar("scheduled", "draft")).toEqual({ pode: true });
  });
```

- [ ] **Step 3: `lib/escale/campanhas/acoes.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { CampanhaCarregada, Desfecho, Recusa } from "@/lib/campanhas/acoes";
import { podeTransitar } from "@/lib/campanhas/maquina-de-estados";

/**
 * AS AÇÕES NOVAS DA LISTA (fork Escale, Fase 8A; N10): alterar horário, voltar a
 * rascunho e excluir rascunho. Mesmo molde das ações do original
 * (`lib/campanhas/acoes.ts`): a máquina decide, a escrita prende o status que
 * foi conferido (compare-and-set) e a recusa volta como `Desfecho`.
 */
function conflito(): Recusa {
  return {
    ok: false,
    codigo: "campanha_estado_invalido",
    mensagem: "O estado da campanha mudou enquanto esta ação era processada. Recarregue a tela.",
    status: 409,
  };
}

/** A mesma pergunta do original (`jaEnviou`, privada lá): saiu alguma mensagem? */
async function jaEnviou(admin: SupabaseClient, campanhaId: string): Promise<boolean> {
  const { count, error } = await admin
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campanhaId)
    .not("sent_at", "is", null);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function reagendarAcao(
  admin: SupabaseClient,
  c: CampanhaCarregada,
  quando: Date,
  agora: Date,
): Promise<Desfecho<{ scheduled_at: string }>> {
  if (c.status !== "scheduled") {
    return {
      ok: false,
      codigo: "campanha_estado_invalido",
      mensagem: "Só uma campanha agendada pode mudar de horário.",
      status: 409,
    };
  }
  if (Number.isNaN(quando.getTime()) || quando.getTime() <= agora.getTime()) {
    return { ok: false, codigo: "campanha_agenda_invalida", mensagem: "O novo horário precisa ser no futuro.", status: 422 };
  }
  const iso = quando.toISOString();
  const { data, error } = await admin
    .from("campaigns")
    .update({ scheduled_at: iso })
    .eq("organization_id", c.organization_id)
    .eq("id", c.id)
    .eq("status", "scheduled")
    .select("id");
  if (error) throw new Error(error.message);
  if ((data ?? []).length === 0) return conflito();
  return { ok: true, scheduled_at: iso };
}

/**
 * Pronta, agendada (ou falha) → rascunho. O snapshot fica: a próxima preparação
 * o apaga e refaz, como já acontece com `ready → draft` no original.
 */
export async function voltarAoRascunhoAcao(admin: SupabaseClient, c: CampanhaCarregada): Promise<Desfecho> {
  const r = podeTransitar(c.status, "draft");
  if (!r.pode) return { ok: false, codigo: "campanha_estado_invalido", mensagem: r.motivo, status: 409 };
  if (await jaEnviou(admin, c.id)) {
    return {
      ok: false,
      codigo: "campanha_nao_editavel",
      mensagem: "Esta campanha já enviou mensagens. Para parar o envio, cancele a campanha.",
      status: 409,
    };
  }
  const { data, error } = await admin
    .from("campaigns")
    .update({ status: "draft", scheduled_at: null })
    .eq("organization_id", c.organization_id)
    .eq("id", c.id)
    .eq("status", c.status)
    .select("id");
  if (error) throw new Error(error.message);
  if ((data ?? []).length === 0) return conflito();
  return { ok: true };
}

/** Só rascunho que nunca enviou: destinatários e rodízio vão junto (`on delete cascade`). */
export async function excluirRascunhoAcao(admin: SupabaseClient, c: CampanhaCarregada): Promise<Desfecho> {
  if (c.status !== "draft") {
    return { ok: false, codigo: "campanha_nao_editavel", mensagem: "Só um rascunho pode ser excluído.", status: 409 };
  }
  if (await jaEnviou(admin, c.id)) {
    return {
      ok: false,
      codigo: "campanha_nao_editavel",
      mensagem: "Este rascunho já enviou mensagens e fica no histórico.",
      status: 409,
    };
  }
  const { data, error } = await admin
    .from("campaigns")
    .delete()
    .eq("organization_id", c.organization_id)
    .eq("id", c.id)
    .eq("status", "draft")
    .select("id");
  if (error) throw new Error(error.message);
  if ((data ?? []).length === 0) return conflito();
  return { ok: true };
}
```

- [ ] **Step 4: `app/api/v1/campanhas-da-casca/[id]/[acao]/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { carregarCampanha } from "@/lib/campanhas/acoes";
import { reagendarAcao, voltarAoRascunhoAcao } from "@/lib/escale/campanhas/acoes";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ACOES = ["reagendar", "rascunho"] as const;
const reagendarSchema = z.object({ scheduled_at: z.string().datetime() });

/**
 * POST /api/v1/campanhas-da-casca/:id/reagendar | rascunho (fork Escale, Fase 8A;
 * N10). Gerente e client admin, como as ações do original: `authenticated` só
 * tem SELECT em `campaigns` (0375). A organização vem do papel, nunca do corpo.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; acao: string }> }): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, acao } = await ctx.params;
  if (!(ACOES as readonly string[]).includes(acao)) {
    return fail("not_found", t("Ação de campanha desconhecida."), 404, { requestId });
  }
  try {
    const admin = createAdminClient();
    const carregada = await carregarCampanha(admin, authz.org.orgId, id);
    if (!carregada.ok) return fail(carregada.codigo, t(carregada.mensagem), carregada.status, { requestId });
    const campanha = carregada.campanha;
    const base = { actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "campaign", resourceId: id, requestId } as const;

    if (acao === "reagendar") {
      const lido = reagendarSchema.safeParse(await req.json().catch(() => null));
      if (!lido.success) return fail("validation_failed", t("Informe a nova data e hora do disparo."), 422, { requestId });
      const r = await reagendarAcao(admin, campanha, new Date(lido.data.scheduled_at), new Date());
      if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
      void audit({ ...base, action: "campaign.rescheduled", metadata: { scheduled_at: r.scheduled_at } });
      return ok({ scheduled_at: r.scheduled_at }, { requestId });
    }

    const r = await voltarAoRascunhoAcao(admin, campanha);
    if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
    void audit({ ...base, action: "campaign.back_to_draft", metadata: { de: campanha.status } });
    return ok({ status: "draft" }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 5: `app/api/v1/campanhas-da-casca/[id]/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { carregarCampanha } from "@/lib/campanhas/acoes";
import { excluirRascunhoAcao } from "@/lib/escale/campanhas/acoes";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** DELETE /api/v1/campanhas-da-casca/:id — "Excluir rascunho" da Clint (fork Escale, Fase 8A; N10). */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  try {
    const admin = createAdminClient();
    const carregada = await carregarCampanha(admin, authz.org.orgId, id);
    if (!carregada.ok) return fail(carregada.codigo, t(carregada.mensagem), carregada.status, { requestId });
    const r = await excluirRascunhoAcao(admin, carregada.campanha);
    if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
    void audit({
      action: "campaign.draft_deleted",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "campaign",
      resourceId: id,
      requestId,
      metadata: {},
    });
    return ok({ id }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 6: A auditoria**

Em `lib/audit/actions.ts`, logo depois de `  "contacts.import_rows_resolved",` (o fim do bloco da 2F):

```ts
  // FORK ESCALE · Fase 8A: a lista de campanhas da casca (migration 9301).
  "campaign.rescheduled",
  "campaign.back_to_draft",
  "campaign.draft_deleted",
```

- [ ] **Step 7: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-acoes.test.ts lib/campanhas/maquina-de-estados.test.ts tests/unit/campanha-escreve-como-servidor.test.ts $(grep -rlF "lib/audit/actions" tests/unit | head -5) && corepack pnpm prettier --write lib/escale/campanhas/acoes.ts "app/api/v1/campanhas-da-casca/[id]" tests/unit/escale-campanhas-acoes.test.ts && corepack pnpm eslint lib/escale/campanhas "app/api/v1/campanhas-da-casca" lib/campanhas/maquina-de-estados.ts lib/audit/actions.ts && corepack pnpm typecheck`
Expected: PASS. Se o `audit` reclamar do tipo de `resourceType`, troque o `as const` do `base` por um objeto literal em cada chamada (o tipo da `AuditInput` do repositório).

- [ ] **Step 8: Commit**

```bash
git add lib/campanhas/maquina-de-estados.ts lib/campanhas/maquina-de-estados.test.ts lib/escale/campanhas/acoes.ts "app/api/v1/campanhas-da-casca/[id]" lib/audit/actions.ts tests/unit/escale-campanhas-acoes.test.ts
git commit -m "feat(escale): voltar a rascunho, alterar horário e excluir rascunho de campanha (Fase 8A)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 5: Os hooks (lista, resumo, tempo real e ações)

**Files:**
- Create: `hooks/escale/useCampanhasDaCasca.ts`, `tests/unit/escale-campanhas-hooks.test.tsx`

**Interfaces:**
- Consumes: as rotas das Tasks 3 e 4; `/api/v1/campaigns/[id]/pausar|retomar|cancelar|duplicar` do original; `useRealtimeChannel`.
- Produces: `CHAVE_DAS_CAMPANHAS` ("campanhas-da-casca"), `RECONSULTA_MS` (10.000), `reconsultaDaLista(p)`, `useListaDeCampanhas(filtros, pagina, porPagina)`, `useResumoDasCampanhas(filtros, aberto)`, `useCampanhasAoVivo(organizacaoId)`, `PedidoDeAcao`, `caminhoDaAcao(p)`, `useAcoesDaCampanha()` (mutation que devolve o `data` da resposta — o `{ id }` da cópia em "duplicar").

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-campanhas-hooks.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const realtime = vi.fn();
vi.mock("@/hooks/realtime/useRealtimeChannel", () => ({
  useRealtimeChannel: (o: unknown) => {
    realtime(o);
    return { status: "subscribed", ultimaEntrega: { current: null } };
  },
}));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import {
  CHAVE_DAS_CAMPANHAS,
  caminhoDaAcao,
  reconsultaDaLista,
  useAcoesDaCampanha,
  useCampanhasAoVivo,
  useListaDeCampanhas,
} from "@/hooks/escale/useCampanhasDaCasca";
import { apiClient } from "@/lib/api/client";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";

const envolver = (qc: QueryClient) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
const novoQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("caminhos e reconsulta", () => {
  it("as ações do original e as do fork", () => {
    expect(caminhoDaAcao({ id: "c1", acao: "pausar" })).toEqual({ metodo: "post", url: "/api/v1/campaigns/c1/pausar" });
    expect(caminhoDaAcao({ id: "c1", acao: "duplicar" })).toEqual({ metodo: "post", url: "/api/v1/campaigns/c1/duplicar" });
    expect(caminhoDaAcao({ id: "c1", acao: "rascunho" })).toEqual({ metodo: "post", url: "/api/v1/campanhas-da-casca/c1/rascunho" });
    expect(caminhoDaAcao({ id: "c1", acao: "reagendar", quando: "2026-10-20T12:00:00.000Z" })).toEqual({
      metodo: "post",
      url: "/api/v1/campanhas-da-casca/c1/reagendar",
      corpo: { scheduled_at: "2026-10-20T12:00:00.000Z" },
    });
    expect(caminhoDaAcao({ id: "c1", acao: "excluir" })).toEqual({ metodo: "delete", url: "/api/v1/campanhas-da-casca/c1" });
  });

  it("reconsulta só com campanha andando na página", () => {
    const pagina = (status: LinhaDeCampanha["status"]) => ({
      linhas: [{ status } as LinhaDeCampanha],
      total: 1,
      pagina: 1,
      porPagina: 10,
    });
    expect(reconsultaDaLista(pagina("running"))).toBe(10_000);
    expect(reconsultaDaLista(pagina("preparing"))).toBe(10_000);
    expect(reconsultaDaLista(pagina("completed"))).toBe(false);
    expect(reconsultaDaLista(undefined)).toBe(false);
  });
});

describe("useListaDeCampanhas", () => {
  it("pede a página com o filtro enxuto", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { linhas: [], total: 0, pagina: 2, porPagina: 25 } } as never);
    const { result } = renderHook(() => useListaDeCampanhas({ busca: " Reat ", status: [] }, 2, 25), {
      wrapper: envolver(novoQc()),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith(
      `/api/v1/campanhas-da-casca?p=2&n=25&f=${encodeURIComponent(JSON.stringify({ busca: "Reat" }))}`,
    );
  });
});

describe("useCampanhasAoVivo", () => {
  it("assina campaigns da organização e invalida a lista no evento", () => {
    const qc = novoQc();
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    renderHook(() => useCampanhasAoVivo("org-1"), { wrapper: envolver(qc) });
    const opcoes = realtime.mock.calls.at(-1)![0] as {
      postgresChanges: { table: string; filter: string };
      onChange: () => void;
    };
    expect(opcoes.postgresChanges).toMatchObject({ table: "campaigns", filter: "organization_id=eq.org-1" });
    act(() => opcoes.onChange());
    expect(invalidar).toHaveBeenCalledWith({ queryKey: [CHAVE_DAS_CAMPANHAS] });
  });
});

describe("useAcoesDaCampanha", () => {
  it("excluir vai pelo DELETE do fork; duplicar devolve o id da cópia", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { id: "c1" } } as never);
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "c9" } } as never);
    const { result } = renderHook(() => useAcoesDaCampanha(), { wrapper: envolver(novoQc()) });
    await act(async () => {
      await result.current.mutateAsync({ id: "c1", acao: "excluir" });
    });
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/campanhas-da-casca/c1");
    let copia: unknown;
    await act(async () => {
      copia = await result.current.mutateAsync({ id: "c1", acao: "duplicar" });
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/campaigns/c1/duplicar", {});
    expect(copia).toEqual({ id: "c9" });
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-hooks.test.tsx`
Expected: FAIL (o hook não existe).

- [ ] **Step 2: `hooks/escale/useCampanhasDaCasca.ts`**

```ts
"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { apiClient } from "@/lib/api/client";
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";
import { PARAM_DOS_FILTROS, textoDosFiltros, type FiltrosDeCampanhas } from "@/lib/escale/campanhas/filtros";
import type { PaginaDeCampanhas, ResumoDasCampanhas } from "@/lib/escale/campanhas/tipos";

/**
 * OS DADOS DA LISTA DE CAMPANHAS DA CASCA (fork Escale, Fase 8A). A lista e o
 * resumo nas rotas do fork; o tempo real sobre `campaigns` (9301, N12); as
 * ações: pausar, retomar, cancelar e duplicar pelas rotas do original,
 * reagendar, voltar a rascunho e excluir pelas do fork.
 */
export const CHAVE_DAS_CAMPANHAS = "campanhas-da-casca";
export const RECONSULTA_MS = 10_000;
const ANDANDO: ReadonlySet<StatusDaCampanha> = new Set(["preparing", "running"]);

export function reconsultaDaLista(p: PaginaDeCampanhas | undefined): number | false {
  return p?.linhas.some((l) => ANDANDO.has(l.status)) ? RECONSULTA_MS : false;
}

function consulta(filtros: FiltrosDeCampanhas, extra: Record<string, string>): string {
  const qs = new URLSearchParams(extra);
  const f = textoDosFiltros(filtros);
  if (f !== "{}") qs.set(PARAM_DOS_FILTROS, f);
  return qs.toString();
}

export function useListaDeCampanhas(filtros: FiltrosDeCampanhas, pagina: number, porPagina: number) {
  return useQuery({
    queryKey: [CHAVE_DAS_CAMPANHAS, "lista", textoDosFiltros(filtros), pagina, porPagina],
    queryFn: async () =>
      (
        await apiClient.get<{ data: PaginaDeCampanhas }>(
          `/api/v1/campanhas-da-casca?${consulta(filtros, { p: String(pagina), n: String(porPagina) })}`,
        )
      ).data,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => reconsultaDaLista(q.state.data),
  });
}

export function useResumoDasCampanhas(filtros: FiltrosDeCampanhas, aberto: boolean) {
  const qs = consulta(filtros, {});
  return useQuery({
    queryKey: [CHAVE_DAS_CAMPANHAS, "resumo", textoDosFiltros(filtros)],
    enabled: aberto,
    queryFn: async () =>
      (await apiClient.get<{ data: ResumoDasCampanhas }>(`/api/v1/campanhas-da-casca/resumo${qs ? `?${qs}` : ""}`)).data,
  });
}

export function useCampanhasAoVivo(organizacaoId: string): void {
  const qc = useQueryClient();
  useRealtimeChannel({
    name: `campanhas-da-casca:${organizacaoId}`,
    postgresChanges: { event: "*", table: "campaigns", filter: `organization_id=eq.${organizacaoId}` },
    onChange: () => {
      void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] });
    },
    enabled: organizacaoId !== "",
  });
}

export type PedidoDeAcao =
  | { id: string; acao: "pausar" | "retomar" | "cancelar" | "duplicar" | "rascunho" | "excluir" }
  | { id: string; acao: "reagendar"; quando: string };

export function caminhoDaAcao(p: PedidoDeAcao): { metodo: "post" | "delete"; url: string; corpo?: Record<string, unknown> } {
  switch (p.acao) {
    case "reagendar":
      return { metodo: "post", url: `/api/v1/campanhas-da-casca/${p.id}/reagendar`, corpo: { scheduled_at: p.quando } };
    case "rascunho":
      return { metodo: "post", url: `/api/v1/campanhas-da-casca/${p.id}/rascunho` };
    case "excluir":
      return { metodo: "delete", url: `/api/v1/campanhas-da-casca/${p.id}` };
    default:
      return { metodo: "post", url: `/api/v1/campaigns/${p.id}/${p.acao}` };
  }
}

export function useAcoesDaCampanha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PedidoDeAcao): Promise<Record<string, unknown>> => {
      const c = caminhoDaAcao(p);
      const r =
        c.metodo === "delete"
          ? await apiClient.delete<{ data?: Record<string, unknown> }>(c.url)
          : await apiClient.post<{ data?: Record<string, unknown> }>(c.url, c.corpo ?? {});
      return r?.data ?? {};
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] });
      // A lista do original (sem a casca) também fica fresca.
      void qc.invalidateQueries({ queryKey: ["campanhas"] });
    },
  });
}
```

- [ ] **Step 3: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-hooks.test.tsx && corepack pnpm prettier --write hooks/escale/useCampanhasDaCasca.ts tests/unit/escale-campanhas-hooks.test.tsx && corepack pnpm eslint hooks/escale/useCampanhasDaCasca.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add hooks/escale/useCampanhasDaCasca.ts tests/unit/escale-campanhas-hooks.test.tsx
git commit -m "feat(escale): hooks da lista de campanhas — página, resumo, tempo real e ações (Fase 8A)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 6: As peças da linha (cores, dica, selo e barra de resultado)

Abra antes: 002 e 008.

**Files:**
- Modify: `app/escale-tema.css` (bloco no fim), `lib/ui/icons-da-casca.ts` (`MailCheck`)
- Create: `components/escale/campanhas/DicaAoPassar.tsx`, `components/escale/campanhas/SeloDoStatus.tsx`, `components/escale/campanhas/BarraDeResultado.tsx`, `tests/unit/escale-campanhas-pecas.test.tsx`

**Interfaces:**
- Consumes: `ROTULO_DO_STATUS`, `DICA_DO_STATUS`, `TOM_DO_STATUS`, `STATUS_QUE_PULSAM`, `segmentosDaBarra`, `textoDoSegmento`, `dataEHoraBr` (Task 1); `CLASSE_DO_TOM`, `CLASSE_DO_SEGMENTO`, `TOM_DA_DICA_DO_SEGMENTO`, `CLASSE_DO_TRILHO` (Task 1).
- Produces: `DicaAoPassar({ texto, children, className?, bloco? })`, `SeloDoStatus({ status })`, `BarraDeResultado({ linha, fuso? })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-campanhas-pecas.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BarraDeResultado } from "@/components/escale/campanhas/BarraDeResultado";
import { SeloDoStatus } from "@/components/escale/campanhas/SeloDoStatus";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const linha = (extra: Partial<LinhaDeCampanha> = {}): LinhaDeCampanha => ({
  id: "c1", nome: "10.09", status: "completed", numeroId: "s1", solicitados: 30, agendadaPara: null,
  iniciadaEm: "2026-09-10T15:39:00Z", criadaEm: "2026-09-10T12:00:00Z",
  adicionados: 30, enviados: 26, entregues: 24, lidos: 16, erros: 3, ...extra,
});

describe("SeloDoStatus (002)", () => {
  it("Completo no tom verde; a dica da Clint ao passar o mouse", () => {
    render(<SeloDoStatus status="completed" />);
    const selo = screen.getByText("Completo");
    expect(selo.className).toContain("--escale-tom-verde-fundo");
    fireEvent.mouseEnter(selo.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("O envio da campanha foi concluído.");
  });

  it("Em progresso pulsa; Pausada não", () => {
    const { rerender } = render(<SeloDoStatus status="running" />);
    expect(screen.getByText("Em progresso").className).toContain("animate-pulse");
    rerender(<SeloDoStatus status="paused" />);
    expect(screen.getByText("Pausada").className).not.toContain("animate-pulse");
  });
});

describe("BarraDeResultado (002, 008)", () => {
  it("os quatro segmentos na ordem da Clint; a dica '16 lidos - 53%'; o nome acessível com todos", () => {
    const { container } = render(<BarraDeResultado linha={linha()} />);
    const segmentos = [...container.querySelectorAll("[data-segmento]")].map((e) => e.getAttribute("data-segmento"));
    expect(segmentos).toEqual(["erro", "entregues", "lidos", "enviados"]);
    fireEvent.mouseEnter(container.querySelector('[data-segmento="lidos"]')!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("16 lidos - 53%");
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "3 inválidos ou com erro, 8 entregues - 27%, 16 lidos - 53%, 2 enviados - 7%",
    );
  });

  it("em andamento, as listras; pronta sem envio, o trilho vazio", () => {
    const { container, rerender } = render(<BarraDeResultado linha={linha({ status: "running" })} />);
    expect(container.querySelector('[data-segmento="lidos"]')!.className).toContain("escale-listras");
    rerender(<BarraDeResultado linha={linha({ status: "ready", enviados: 0, entregues: 0, lidos: 0, erros: 0 })} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Nenhum envio ainda");
  });

  it("agendada mostra o relógio com a data; sem lista, o traço", () => {
    const { rerender } = render(
      <BarraDeResultado linha={linha({ status: "scheduled", agendadaPara: "2026-10-20T13:00:00Z" })} fuso="America/Sao_Paulo" />,
    );
    expect(screen.getByLabelText("Agendada para 20/10/2026 10:00")).toBeInTheDocument();
    rerender(<BarraDeResultado linha={linha({ status: "draft", adicionados: 0 })} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-pecas.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 2: As cores e as animações**

No **fim** de `app/escale-tema.css`:

```css
/* ─── FORK ESCALE · Fase 8A (lista de campanhas) ───
   A barra de resultado (amostra de pixel nos prints 09-002 e 09-008) e os selos
   de status (Badge "subtle" do Chakra v3 da Clint: .100 de fundo, .700 de texto;
   o tom de cada estado na seção 6 do PRD 8). Lidas por valor arbitrário
   (`bg-(--escale-…)`), como as da 1F. */
body:has([data-escale-casca]) {
  --escale-campanha-trilho: #ededf2; /* provisório: no print todas estão completas */
  --escale-campanha-erro: #f2453e; /* medido, 09-002 */
  --escale-campanha-entregues: #20cc9c; /* medido, 09-002 */
  --escale-campanha-lidos: #16e2a7; /* medido, 09-002 e 09-008 */
  --escale-campanha-enviados: #2fba6a; /* medido, 09-002 (a ponta mais escura) */
  --escale-tom-cinza-fundo: #f4f4f5;
  --escale-tom-cinza-texto: #52525b;
  --escale-tom-ciano-fundo: #cffafe;
  --escale-tom-ciano-texto: #0e7490;
  --escale-tom-amarelo-fundo: #fef9c3;
  --escale-tom-amarelo-texto: #a16207;
  --escale-tom-azul-fundo: #dbeafe;
  --escale-tom-azul-texto: #1d4ed8;
  --escale-tom-laranja-fundo: #ffedd5;
  --escale-tom-laranja-texto: #c2410c;
  --escale-tom-verde-fundo: #dcfce7; /* medido no selo "Completo", 09-002 */
  --escale-tom-verde-texto: #15803d;
  --escale-tom-granito-fundo: #e7e5e4;
  --escale-tom-granito-texto: #57534e;
  --escale-tom-vermelho-fundo: #fee2e2;
  --escale-tom-vermelho-texto: #b91c1c;
}

[data-theme="dark"] body:has([data-escale-casca]) {
  --escale-campanha-trilho: #2a2d3d;
  --escale-campanha-erro: #f87171;
  --escale-campanha-entregues: #2dd4bf;
  --escale-campanha-lidos: #34d399;
  --escale-campanha-enviados: #4ade80;
  --escale-tom-cinza-fundo: #2a2d3d;
  --escale-tom-cinza-texto: #d4d4d8;
  --escale-tom-ciano-fundo: #164e63;
  --escale-tom-ciano-texto: #a5f3fc;
  --escale-tom-amarelo-fundo: #422006;
  --escale-tom-amarelo-texto: #fde68a;
  --escale-tom-azul-fundo: #1e3a8a;
  --escale-tom-azul-texto: #bfdbfe;
  --escale-tom-laranja-fundo: #431407;
  --escale-tom-laranja-texto: #fed7aa;
  --escale-tom-verde-fundo: #14351f;
  --escale-tom-verde-texto: #86efac;
  --escale-tom-granito-fundo: #292524;
  --escale-tom-granito-texto: #d6d3d1;
  --escale-tom-vermelho-fundo: #3d1515;
  --escale-tom-vermelho-texto: #fca5a5;
}

/* As listras da campanha em andamento (material 6) e a entrada dos cartões do
   resumo (0,26 s, material 6). Sem movimento para quem pediu menos movimento. */
.escale-listras {
  background-image: linear-gradient(
    45deg,
    rgb(255 255 255 / 0.28) 25%,
    transparent 25%,
    transparent 50%,
    rgb(255 255 255 / 0.28) 50%,
    rgb(255 255 255 / 0.28) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  animation: escale-listras 1s linear infinite;
}

@keyframes escale-listras {
  from {
    background-position: 1rem 0;
  }
  to {
    background-position: 0 0;
  }
}

@keyframes escale-desce {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .escale-listras {
    animation: none;
  }
}
```

- [ ] **Step 3: O ícone**

Em `lib/ui/icons-da-casca.ts`, dentro do `export { … } from "lucide-react";` (em ordem alfabética, perto de `Mail`/`MailOpen`), acrescente `MailCheck,` com o comentário `// FORK ESCALE · Fase 8A: o cartão "Entregues" do resumo (003).` na linha de cima. Confira antes que ele ainda não existe: `grep -n "MailCheck" lib/ui/icons-da-casca.ts` (vazio).

- [ ] **Step 4: `components/escale/campanhas/DicaAoPassar.tsx`**

```tsx
"use client";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A DICA DE PASSAR O MOUSE DA LISTA DE CAMPANHAS (fork Escale, Fase 8A; 008;
 * N17): a pílula pequena acima do alvo, sem seta. Sem o Tooltip do Radix de
 * propósito — ele exige `TooltipProvider` acima, e tela nova sem o provedor já
 * derrubou o Atendimento. Aparece também com o foco.
 */
export function DicaAoPassar({
  texto,
  children,
  className,
  bloco = false,
}: {
  texto: string;
  children: ReactNode;
  className?: string;
  /** Ocupa a largura toda (os cartões do resumo). */
  bloco?: boolean;
}) {
  const [aberta, setAberta] = useState(false);
  const id = useId();
  return (
    <span
      className={cn("relative", bloco ? "flex w-full" : "inline-flex")}
      onMouseEnter={() => setAberta(true)}
      onMouseLeave={() => setAberta(false)}
      onFocus={() => setAberta(true)}
      onBlur={() => setAberta(false)}
      aria-describedby={aberta ? id : undefined}
    >
      {children}
      {aberta ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-max max-w-[260px] -translate-x-1/2 rounded-[4px] bg-casca-escuro px-2 py-1 text-[11px] leading-4 font-normal text-white shadow-casca-painel",
            className,
          )}
        >
          {texto}
        </span>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 5: `components/escale/campanhas/SeloDoStatus.tsx`**

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";
import { DICA_DO_STATUS, ROTULO_DO_STATUS, STATUS_QUE_PULSAM, TOM_DO_STATUS } from "@/lib/escale/campanhas/apresentacao";
import { CLASSE_DO_TOM } from "@/lib/escale/campanhas/cores";
import { cn } from "@/lib/utils";

import { DicaAoPassar } from "./DicaAoPassar";

/** O SELO DE STATUS (002; N5): o rótulo e o tom da Clint; pulsa enquanto o servidor trabalha. */
export function SeloDoStatus({ status }: { status: StatusDaCampanha }) {
  const t = useT();
  return (
    <DicaAoPassar texto={t(DICA_DO_STATUS[status])}>
      <span
        data-status={status}
        className={cn(
          "inline-flex h-[22px] items-center whitespace-nowrap rounded-[4px] px-1.5 text-[12px] leading-none",
          CLASSE_DO_TOM[TOM_DO_STATUS[status]],
          STATUS_QUE_PULSAM.has(status) && "motion-safe:animate-pulse",
        )}
      >
        {t(ROTULO_DO_STATUS[status])}
      </span>
    </DicaAoPassar>
  );
}
```

- [ ] **Step 6: `components/escale/campanhas/BarraDeResultado.tsx`**

```tsx
"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { dataEHoraBr, segmentosDaBarra, textoDoSegmento, type ChaveDoSegmento } from "@/lib/escale/campanhas/apresentacao";
import { CLASSE_DO_SEGMENTO, CLASSE_DO_TOM, CLASSE_DO_TRILHO, TOM_DA_DICA_DO_SEGMENTO } from "@/lib/escale/campanhas/cores";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";
import { Clock } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { DicaAoPassar } from "./DicaAoPassar";

/**
 * A BARRA DE RESULTADO (002, 008; N6): segmentos erro, entregues, lidos e
 * enviados sobre os adicionados; a dica é desenhada fora do trilho (o trilho
 * corta o que passa da borda). Agendada: o relógio; sem lista: o traço.
 */
export function BarraDeResultado({ linha, fuso }: { linha: LinhaDeCampanha; fuso?: string }) {
  const t = useT();
  const [sobre, setSobre] = useState<ChaveDoSegmento | null>(null);

  if (linha.status === "scheduled" && linha.agendadaPara) {
    const texto = t("Agendada para {data}").replace("{data}", dataEHoraBr(linha.agendadaPara, fuso));
    return (
      <DicaAoPassar texto={texto}>
        <span role="img" aria-label={texto} className="inline-flex text-casca-suave">
          <Clock size={16} aria-hidden />
        </span>
      </DicaAoPassar>
    );
  }
  if (linha.adicionados <= 0) return <span className="text-[11px] text-casca-meta">—</span>;

  let inicio = 0;
  const segmentos = segmentosDaBarra(linha).map((s) => {
    const comInicio = { ...s, inicio };
    inicio += s.largura;
    return comInicio;
  });
  const ativo = segmentos.find((s) => s.chave === sobre);
  const resumo = segmentos.length
    ? segmentos.map((s) => textoDoSegmento(s, t)).join(", ")
    : t("Nenhum envio ainda");
  const listras = linha.status === "running";

  return (
    <div className="relative w-full max-w-[230px] min-w-[140px]">
      <div role="img" aria-label={resumo} className={cn("flex h-2 w-full overflow-hidden rounded-full", CLASSE_DO_TRILHO)}>
        {segmentos.map((s) => (
          <span
            key={s.chave}
            aria-hidden
            data-segmento={s.chave}
            onMouseEnter={() => setSobre(s.chave)}
            onMouseLeave={() => setSobre(null)}
            style={{ width: `${s.largura}%` }}
            className={cn("h-full", CLASSE_DO_SEGMENTO[s.chave], listras && "escale-listras")}
          />
        ))}
      </div>
      {ativo ? (
        <span
          role="tooltip"
          style={{ left: `${ativo.inicio + ativo.largura / 2}%` }}
          className={cn(
            "pointer-events-none absolute bottom-full z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium",
            CLASSE_DO_TOM[TOM_DA_DICA_DO_SEGMENTO[ativo.chave]],
          )}
        >
          {textoDoSegmento(ativo, t)}
        </span>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 7: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-pecas.test.tsx tests/unit/escale-tema.test.ts tests/unit/escale-casca-tokens.test.ts tests/unit/tailwind-tokens.test.ts && corepack pnpm prettier --write components/escale/campanhas tests/unit/escale-campanhas-pecas.test.tsx && corepack pnpm eslint components/escale/campanhas lib/ui/icons-da-casca.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/escale-tema.css lib/ui/icons-da-casca.ts components/escale/campanhas tests/unit/escale-campanhas-pecas.test.tsx
git commit -m "feat(escale): selo de status, barra de resultado e dica da lista de campanhas (Fase 8A)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 7: O topo da página (cabeçalho, abas, filtros e resumo)

Abra antes: 002, 003, 004, 005 e 006.

**Files:**
- Create: `components/escale/campanhas/CabecalhoDasCampanhas.tsx`, `components/escale/campanhas/AbasDasCampanhas.tsx`, `components/escale/campanhas/CampoDeDataDasCampanhas.tsx`, `components/escale/campanhas/BarraDeFiltrosDasCampanhas.tsx`, `components/escale/campanhas/FaixaDoResumo.tsx`, `tests/unit/escale-campanhas-topo.test.tsx`

**Interfaces:**
- Consumes: `SeletorDoFiltro`, `OpcaoDoFiltro` (`components/escale/conversas/filtros/SeletorDoFiltro.tsx`, 3D); `CalendarioDePeriodo` e `PainelSuspenso` (casca V1); `textoDoPeriodo` (`lib/escale/contatos/filtros.ts`); as regras da Task 1; `DicaAoPassar` (Task 6).
- Produces: `CabecalhoDasCampanhas({ aba })`, `AbasDasCampanhas({ abas, valor, aoMudar })`, `CampoDeDataDasCampanhas({ rotulo, valor, aoMudar })`, `BarraDeFiltrosDasCampanhas({ filtros, numeros, aoMudar })`, `FaixaDoResumo({ aberta, aoAlternar, resumo, carregando })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-campanhas-topo.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbasDasCampanhas } from "@/components/escale/campanhas/AbasDasCampanhas";
import { BarraDeFiltrosDasCampanhas } from "@/components/escale/campanhas/BarraDeFiltrosDasCampanhas";
import { CabecalhoDasCampanhas } from "@/components/escale/campanhas/CabecalhoDasCampanhas";
import { FaixaDoResumo } from "@/components/escale/campanhas/FaixaDoResumo";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const NUMEROS = [
  { valor: "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b", rotulo: "Comercial" },
  { valor: "1d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b", rotulo: "Suporte" },
];

afterEach(() => vi.useRealTimers());

describe("CabecalhoDasCampanhas (002)", () => {
  it("WhatsApp, a engrenagem e 'Enviar WhatsApp' (até a 8B, o formulário do original)", () => {
    render(<CabecalhoDasCampanhas aba="whatsapp" />);
    expect(screen.getByRole("heading", { name: "WhatsApp" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enviar WhatsApp" })).toHaveAttribute("href", "/app/campaigns/new");
    expect(screen.getByRole("link", { name: "Configuração de campanhas" })).toHaveAttribute("href", "/app/campaigns/settings");
  });

  it("na aba Prospecção, só o título", () => {
    render(<CabecalhoDasCampanhas aba="prospeccao" />);
    expect(screen.getByRole("heading", { name: "Prospecção" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Enviar WhatsApp" })).not.toBeInTheDocument();
  });
});

describe("AbasDasCampanhas", () => {
  it("a ativa marcada; clicar troca", () => {
    const aoMudar = vi.fn();
    render(<AbasDasCampanhas abas={["whatsapp", "prospeccao"]} valor="whatsapp" aoMudar={aoMudar} />);
    expect(screen.getByRole("tab", { name: "WhatsApp" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Prospecção" }));
    expect(aoMudar).toHaveBeenCalledWith("prospeccao");
  });
});

describe("BarraDeFiltrosDasCampanhas (002, 004, 005)", () => {
  it("os cinco campos na ordem da Clint", () => {
    render(<BarraDeFiltrosDasCampanhas filtros={{}} numeros={NUMEROS} aoMudar={vi.fn()} />);
    expect(screen.getByPlaceholderText("Buscar campanha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtrar por data do agendamento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filtrar por data de criação" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Número" })).toBeInTheDocument();
  });

  it("a busca espera 500 ms", () => {
    vi.useFakeTimers();
    const aoMudar = vi.fn();
    render(<BarraDeFiltrosDasCampanhas filtros={{}} numeros={NUMEROS} aoMudar={aoMudar} />);
    fireEvent.change(screen.getByPlaceholderText("Buscar campanha"), { target: { value: "Reat" } });
    act(() => vi.advanceTimersByTime(499));
    expect(aoMudar).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(aoMudar).toHaveBeenCalledWith({ busca: "Reat" });
  });

  it("Status com caixinhas na ordem alfabética; Número de escolha única", async () => {
    const user = userEvent.setup();
    const aoMudar = vi.fn();
    render(<BarraDeFiltrosDasCampanhas filtros={{}} numeros={NUMEROS} aoMudar={aoMudar} />);
    await user.click(screen.getByRole("combobox", { name: "Status" }));
    const caixas = screen.getAllByRole("checkbox").map((c) => c.textContent);
    expect(caixas).toEqual([
      "Agendado", "Cancelado", "Concluído", "Envio em Andamento", "Erro de Processamento", "Pausada", "Pronta para enviar", "Rascunho",
    ]);
    await user.click(screen.getByRole("checkbox", { name: "Agendado" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ status: ["scheduled"] });
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("combobox", { name: "Número" }));
    await user.click(screen.getByRole("option", { name: "Suporte" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ numero: NUMEROS[1]!.valor });
  });
});

describe("FaixaDoResumo (003)", () => {
  const resumo = { adicionados: 14989, enviados: 9922, entregues: 9110, lidos: 2408, erros: 4087 };

  it("fechada só o botão; aberta, os 5 cartões com os números brasileiros", () => {
    const aoAlternar = vi.fn();
    const { rerender } = render(<FaixaDoResumo aberta={false} aoAlternar={aoAlternar} resumo={undefined} carregando={false} />);
    const botao = screen.getByRole("button", { name: "Resumo das campanhas" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(botao);
    expect(aoAlternar).toHaveBeenCalled();
    rerender(<FaixaDoResumo aberta aoAlternar={aoAlternar} resumo={resumo} carregando={false} />);
    for (const r of ["Adicionados para envio", "Enviados", "Entregues", "Lidas", "Erros"]) {
      expect(screen.getByText(r)).toBeInTheDocument();
    }
    expect(screen.getByText("14.989")).toBeInTheDocument();
    expect(screen.getByText("66%")).toBeInTheDocument();
    expect(screen.getByText("9.922")).toBeInTheDocument();
  });

  it("carregando: 5 esqueletos", () => {
    const { container } = render(<FaixaDoResumo aberta aoAlternar={vi.fn()} resumo={undefined} carregando />);
    expect(container.querySelectorAll("[data-esqueleto]")).toHaveLength(5);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-topo.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 2: `components/escale/campanhas/CabecalhoDasCampanhas.tsx`**

```tsx
"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { ROTA_DA_CONFIGURACAO, ROTA_DA_NOVA, ROTULO_DA_ABA, type AbaDasCampanhas } from "@/lib/escale/campanhas/rotas";
import { WhatsappLogo } from "@/lib/ui/icons";
import { Settings } from "@/lib/ui/icons-da-casca";

/**
 * O CABEÇALHO DE CAMPANHAS (002; PRD A1, A14): o nome do canal, a engrenagem
 * (a configuração do original, N11) e "Enviar WhatsApp". Sem o selo
 * "Otimizado" (Marketing Messages API, ignorado no PRD).
 */
export function CabecalhoDasCampanhas({ aba }: { aba: AbaDasCampanhas }) {
  const t = useT();
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-casca-divisoria px-6">
      <h1 className="text-[18px] font-medium text-casca-texto">{t(ROTULO_DA_ABA[aba])}</h1>
      {aba === "whatsapp" ? (
        <div className="flex items-center gap-2">
          <Link
            href={ROTA_DA_CONFIGURACAO}
            aria-label={t("Configuração de campanhas")}
            title={t("Configuração de campanhas")}
            className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave transition-colors hover:bg-casca-raia hover:text-casca-texto"
          >
            <Settings size={16} aria-hidden />
          </Link>
          <Link
            href={ROTA_DA_NOVA}
            className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-casca-gatilho bg-casca-marca px-3.5 text-[12px] font-medium text-accent-foreground transition-colors hover:bg-casca-marca-forte"
          >
            <WhatsappLogo size={14} aria-hidden />
            {t("Enviar WhatsApp")}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
```

- [ ] **Step 3: `components/escale/campanhas/AbasDasCampanhas.tsx`**

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DA_ABA, type AbaDasCampanhas } from "@/lib/escale/campanhas/rotas";
import { cn } from "@/lib/utils";

/** AS ABAS DE CANAL (002; PRD A2): 15px/500, o sublinhado de 3px da marca na ativa. */
export function AbasDasCampanhas({
  abas,
  valor,
  aoMudar,
}: {
  abas: readonly AbaDasCampanhas[];
  valor: AbaDasCampanhas;
  aoMudar: (aba: AbaDasCampanhas) => void;
}) {
  const t = useT();
  return (
    <div role="tablist" aria-label={t("Canais de campanha")} className="flex h-9 shrink-0 items-end border-b border-casca-divisoria px-6">
      {abas.map((aba) => {
        const ativa = aba === valor;
        return (
          <button
            key={aba}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => aoMudar(aba)}
            className={cn(
              "relative h-full px-3 text-[15px] font-medium transition-colors",
              ativa
                ? "text-casca-texto after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-casca-marca"
                : "text-casca-texto-2 hover:text-casca-texto",
            )}
          >
            {t(ROTULO_DA_ABA[aba])}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: `components/escale/campanhas/CampoDeDataDasCampanhas.tsx`**

```tsx
"use client";
import { useState } from "react";

import { CalendarioDePeriodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { PeriodoDoFiltro } from "@/lib/escale/campanhas/filtros";
import { textoDoPeriodo } from "@/lib/escale/contatos/filtros";
import { Calendar, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O CAMPO DE DATA DA BARRA (002, 006): 215px, o texto da Clint cortado com
 * reticências, o calendário da casca com os atalhos e dois meses, sem abas
 * (nunca o controle nativo). O X ao lado limpa (provisório: a Clint não mostra).
 */
export function CampoDeDataDasCampanhas({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string;
  valor: PeriodoDoFiltro | undefined;
  aoMudar: (p: PeriodoDoFiltro | undefined) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <span className="inline-flex items-center gap-1">
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={rotulo}
            className={cn(
              "flex h-8 w-[215px] items-center justify-between gap-2 rounded-casca-gatilho border px-2.5 text-left text-[13px]",
              aberto ? "border-casca-marca bg-surface" : "border-transparent bg-casca-busca",
            )}
          >
            <span className={cn("min-w-0 flex-1 truncate", valor ? "text-casca-texto" : "text-casca-meta")}>
              {valor ? textoDoPeriodo(valor) : rotulo}
            </span>
            <Calendar size={14} aria-hidden className="shrink-0 text-casca-texto-2" />
          </button>
        </PopoverTrigger>
        <PainelSuspenso className="w-auto p-0">
          <CalendarioDePeriodo
            valor={{ tipo: "agendado", ...(valor ?? {}) }}
            semAbas
            aoMudar={(p) =>
              aoMudar(p.de || p.ate ? { ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) } : undefined)
            }
          />
        </PainelSuspenso>
      </Popover>
      {valor ? (
        <button
          type="button"
          aria-label={`${t("Limpar")} ${rotulo}`}
          onClick={() => aoMudar(undefined)}
          className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
        >
          <X size={14} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 5: `components/escale/campanhas/BarraDeFiltrosDasCampanhas.tsx`**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

import { SeletorDoFiltro, type OpcaoDoFiltro } from "@/components/escale/conversas/filtros/SeletorDoFiltro";
import { useT } from "@/hooks/i18n/useT";
import {
  ESPERA_DA_BUSCA_MS,
  ROTULO_DO_FILTRO_DE_STATUS,
  STATUS_DO_FILTRO,
  type FiltrosDeCampanhas,
  type StatusDoFiltro,
} from "@/lib/escale/campanhas/filtros";
import { Search } from "@/lib/ui/icons-da-casca";

import { CampoDeDataDasCampanhas } from "./CampoDeDataDasCampanhas";

/**
 * A BARRA DE FILTROS (002, 004–006; N4): busca (500 ms), data do agendamento,
 * data de criação, Status (várias) e Número (uma) — "Conta" e "Dispositivos"
 * da Clint viram "Número". Quem limpa os filtros remonta a barra (`key`), e a
 * busca volta vazia.
 */
export function BarraDeFiltrosDasCampanhas({
  filtros,
  numeros,
  aoMudar,
}: {
  filtros: FiltrosDeCampanhas;
  numeros: OpcaoDoFiltro<string>[];
  aoMudar: (f: FiltrosDeCampanhas) => void;
}) {
  const t = useT();
  const [texto, setTexto] = useState(filtros.busca ?? "");
  const atual = useRef({ filtros, aoMudar });
  useEffect(() => {
    atual.current = { filtros, aoMudar };
  });
  useEffect(() => {
    if (texto.trim() === (atual.current.filtros.busca ?? "")) return;
    const espera = setTimeout(() => {
      const { filtros: f, aoMudar: mudar } = atual.current;
      mudar({ ...f, busca: texto.trim() || undefined });
    }, ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(espera);
  }, [texto]);

  const opcoesDeStatus = STATUS_DO_FILTRO.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_FILTRO_DE_STATUS[s]) }));
  const tirarVazios = (f: FiltrosDeCampanhas): FiltrosDeCampanhas =>
    Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as FiltrosDeCampanhas;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative block max-w-[280px] min-w-[180px] flex-[1_1_220px]">
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("Buscar campanha")}
          aria-label={t("Buscar campanha")}
          className="h-8 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:ring-1 focus-visible:ring-casca-marca focus-visible:outline-hidden"
        />
        <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-texto-2" />
      </label>
      <CampoDeDataDasCampanhas
        rotulo={t("Filtrar por data do agendamento")}
        valor={filtros.disparo}
        aoMudar={(p) => aoMudar(tirarVazios({ ...filtros, disparo: p }))}
      />
      <CampoDeDataDasCampanhas
        rotulo={t("Filtrar por data de criação")}
        valor={filtros.criacao}
        aoMudar={(p) => aoMudar(tirarVazios({ ...filtros, criacao: p }))}
      />
      <div className="w-[160px]">
        <SeletorDoFiltro<StatusDoFiltro>
          aria-label={t("Status")}
          vazio={t("Status")}
          valores={filtros.status ?? []}
          opcoes={opcoesDeStatus}
          aoMudar={(v) => aoMudar(tirarVazios({ ...filtros, status: v.length ? v : undefined }))}
        />
      </div>
      <div className="w-[170px]">
        <SeletorDoFiltro<string>
          multiplo={false}
          aria-label={t("Número")}
          vazio={t("Número")}
          valores={filtros.numero ? [filtros.numero] : []}
          opcoes={numeros}
          aoMudar={(v) => aoMudar(tirarVazios({ ...filtros, numero: v[0] }))}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: `components/escale/campanhas/FaixaDoResumo.tsx`**

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import {
  ORDEM_DOS_CARTOES,
  ROTULO_DO_CARTAO,
  numeroBr,
  valoresDoCartao,
  type ChaveDoCartao,
} from "@/lib/escale/campanhas/apresentacao";
import type { ResumoDasCampanhas } from "@/lib/escale/campanhas/tipos";
import { BarChart3, ChevronDown, ChevronUp, CircleX, Download, MailCheck, MailOpen, Send } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { DicaAoPassar } from "./DicaAoPassar";

const ICONE_DO_CARTAO: Record<ChaveDoCartao, typeof Send> = {
  adicionados: Download,
  enviados: Send,
  entregues: MailCheck,
  lidas: MailOpen,
  erros: CircleX,
};

/** "RESUMO DAS CAMPANHAS" (002, 003; N7): o botão que abre os 5 cartões. */
export function FaixaDoResumo({
  aberta,
  aoAlternar,
  resumo,
  carregando,
}: {
  aberta: boolean;
  aoAlternar: () => void;
  resumo: ResumoDasCampanhas | undefined;
  carregando: boolean;
}) {
  const t = useT();
  return (
    <div>
      <button
        type="button"
        aria-expanded={aberta}
        onClick={aoAlternar}
        className={cn(
          "inline-flex h-[30px] items-center gap-2 rounded-[6px] border px-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors",
          aberta
            ? "border-casca-marca-media bg-casca-marca-suave text-casca-marca"
            : "border-casca-borda bg-casca-busca text-casca-suave hover:border-casca-marca hover:text-casca-marca",
        )}
      >
        <BarChart3 size={14} aria-hidden />
        {t("Resumo das campanhas")}
        {aberta ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />}
      </button>
      {aberta ? (
        <div className="mt-3 grid grid-cols-5 gap-3 motion-safe:animate-[escale-desce_0.26s_ease-out]">
          {ORDEM_DOS_CARTOES.map((chave) => (
            <Cartao key={chave} chave={chave} resumo={resumo} carregando={carregando} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Cartao({
  chave,
  resumo,
  carregando,
}: {
  chave: ChaveDoCartao;
  resumo: ResumoDasCampanhas | undefined;
  carregando: boolean;
}) {
  const t = useT();
  if (carregando || !resumo) {
    return <div data-esqueleto className="h-[85px] animate-pulse rounded-[8px] border border-casca-borda bg-casca-raia" />;
  }
  const Icone = ICONE_DO_CARTAO[chave];
  const v = valoresDoCartao(chave, resumo);
  const corpo = (
    <div className="flex h-[85px] w-full flex-col justify-between rounded-[8px] border border-casca-borda bg-surface p-4 shadow-[0_1px_2px_rgb(17_24_39/0.06)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-casca-texto">{t(ROTULO_DO_CARTAO[chave])}</span>
        <Icone size={14} aria-hidden className="shrink-0 text-casca-marca" />
      </div>
      {chave === "adicionados" ? (
        <span className="text-[15px] font-semibold text-casca-texto">{numeroBr(v.total)}</span>
      ) : (
        <div className="flex items-end justify-between">
          <span className="text-[15px] font-semibold text-casca-texto">{v.porcento === null ? "—" : `${v.porcento}%`}</span>
          <span className="text-[11px] text-casca-suave">{numeroBr(v.total)}</span>
        </div>
      )}
    </div>
  );
  if (chave === "adicionados") return corpo;
  return (
    <DicaAoPassar bloco texto={t("Percentual sobre os adicionados para envio.")}>
      {corpo}
    </DicaAoPassar>
  );
}
```

- [ ] **Step 7: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-topo.test.tsx tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts && corepack pnpm prettier --write components/escale/campanhas tests/unit/escale-campanhas-topo.test.tsx && corepack pnpm eslint components/escale/campanhas && corepack pnpm typecheck`
Expected: PASS. Se `SeletorDoFiltro<StatusDoFiltro>` não aceitar o genérico explícito em JSX, tire o `<StatusDoFiltro>`/`<string>` e tipe `opcoesDeStatus` como `OpcaoDoFiltro<StatusDoFiltro>[]`.

- [ ] **Step 8: Commit**

```bash
git add components/escale/campanhas tests/unit/escale-campanhas-topo.test.tsx
git commit -m "feat(escale): cabeçalho, abas, barra de filtros e resumo das campanhas (Fase 8A)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 8: A tabela (linha, menu ⋮, pausa, alterar horário e os estados)

Abra antes: 002, 007 e 014.

**Files:**
- Create: `components/escale/campanhas/TabelaDeCampanhas.tsx`, `components/escale/campanhas/LinhaDaCampanha.tsx`, `components/escale/campanhas/MenuDaCampanha.tsx`, `components/escale/campanhas/JanelaAlterarHorario.tsx`, `components/escale/campanhas/VaziosDasCampanhas.tsx`, `tests/unit/escale-campanhas-tabela.test.tsx`

**Interfaces:**
- Consumes: `useAcoesDaCampanha`, `PedidoDeAcao` (Task 5); `SeloDoStatus`, `BarraDeResultado` (Task 6); `acoesDaLinha`, `ROTULO_DA_ACAO`, `ACOES_DESTRUTIVAS`, `CONFIRMACAO_DA_ACAO`, `botaoDaLinha`, `rotaDoRascunho`, `rotaDoDetalhe`, `ROTA_DA_NOVA`, `dataDoDisparo`, `dataEHoraBr`, `subtituloDaCampanha` (Task 1); `JanelaDeConfirmacao`, `SeletorDeDataEHora` (casca); `CONTEUDO_DO_MENU`, `ITEM_DO_MENU`, `SOMBRA_DO_MENU` (`components/escale/menu/estilos.ts`).
- Produces: `TabelaDeCampanhas({ linhas, carregando, erro, filtrando, fuso?, agora?, nomeDoNumero, aoLimparFiltros, aoTentarDeNovo })`, `VazioSemCampanhas()`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-campanhas-tabela.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaAlterarHorario } from "@/components/escale/campanhas/JanelaAlterarHorario";
import { TabelaDeCampanhas } from "@/components/escale/campanhas/TabelaDeCampanhas";
import { VazioSemCampanhas } from "@/components/escale/campanhas/VaziosDasCampanhas";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", async (orig) => ({
  ...(await orig<object>()),
  useTagDeIdioma: () => "pt-BR",
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const mutate = vi.fn();
vi.mock("@/hooks/escale/useCampanhasDaCasca", () => ({ useAcoesDaCampanha: () => ({ mutate, isPending: false }) }));

const SP = "America/Sao_Paulo";
const AGORA = new Date("2026-10-17T12:00:00Z");
const linha = (extra: Partial<LinhaDeCampanha> = {}): LinhaDeCampanha => ({
  id: "c1", nome: "10.09", status: "completed", numeroId: "s1", solicitados: 30, agendadaPara: null,
  iniciadaEm: "2026-09-10T15:39:00Z", criadaEm: "2026-09-10T12:00:00Z",
  adicionados: 30, enviados: 26, entregues: 24, lidos: 16, erros: 3, ...extra,
});
const props = {
  carregando: false,
  erro: false,
  filtrando: false,
  fuso: SP,
  agora: AGORA,
  nomeDoNumero: () => "Comercial",
  aoLimparFiltros: vi.fn(),
  aoTentarDeNovo: vi.fn(),
};
const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => {
  push.mockReset();
  mutate.mockReset();
});

describe("TabelaDeCampanhas (002)", () => {
  it("as colunas e a linha: ícone, nome, '30 Solicitados há um mês', data BR, número, barra, selo", () => {
    envolver(<TabelaDeCampanhas {...props} linhas={[linha()]} />);
    for (const c of ["Campanha", "Data agendamento", "Número", "Resultado", "Status", "Ações"]) {
      expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    }
    const tr = screen.getByText("10.09").closest("tr")!;
    expect(within(tr).getByText("30 Solicitados há um mês")).toBeInTheDocument();
    expect(within(tr).getByText("10/09/2026 12:39")).toBeInTheDocument();
    expect(within(tr).getByText("Comercial")).toBeInTheDocument();
    expect(within(tr).getByText("Completo")).toBeInTheDocument();
    expect(within(tr).getByRole("img")).toHaveAccessibleName(/16 lidos - 53%/);
  });

  it("clicar abre: rascunho no rascunho, as outras no detalhe", () => {
    const { unmount } = envolver(<TabelaDeCampanhas {...props} linhas={[linha({ status: "draft" })]} />);
    fireEvent.click(screen.getByRole("button", { name: "10.09" }));
    expect(push).toHaveBeenLastCalledWith("/app/campaigns/c1/edit");
    unmount();
    envolver(<TabelaDeCampanhas {...props} linhas={[linha()]} />);
    fireEvent.click(screen.getByText("Comercial"));
    expect(push).toHaveBeenLastCalledWith("/app/campaigns/c1");
  });

  it("o ⋮ do rascunho: Editar, Excluir (vermelho, com a confirmação da Clint) e Duplicar", async () => {
    const user = userEvent.setup();
    envolver(<TabelaDeCampanhas {...props} linhas={[linha({ status: "draft", solicitados: 0, adicionados: 0 })]} />);
    await user.click(screen.getByRole("button", { name: "Mais opções" }));
    const itens = screen.getAllByRole("menuitem").map((i) => i.textContent);
    expect(itens).toEqual(["Editar rascunho", "Excluir rascunho", "Duplicar campanha"]);
    await user.click(screen.getByRole("menuitem", { name: "Excluir rascunho" }));
    expect(await screen.findByText("Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excluir rascunho" }));
    expect(mutate).toHaveBeenCalledWith({ id: "c1", acao: "excluir" }, expect.anything());
  });

  it("agendada: Alterar horário abre a janela; Cancelar volta a rascunho", async () => {
    const user = userEvent.setup();
    envolver(<TabelaDeCampanhas {...props} linhas={[linha({ status: "scheduled", agendadaPara: "2099-01-01T12:00:00Z", enviados: 0 })]} />);
    await user.click(screen.getByRole("button", { name: "Mais opções" }));
    await user.click(screen.getByRole("menuitem", { name: "Cancelar campanha" }));
    expect(await screen.findByText("A campanha será movida para Rascunho e você poderá editá-la e reagendar. Deseja continuar?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar campanha" }));
    expect(mutate).toHaveBeenCalledWith({ id: "c1", acao: "rascunho" }, expect.anything());
  });

  it("em andamento: Pausar na linha; pausada: Retomar", () => {
    const { unmount } = envolver(<TabelaDeCampanhas {...props} linhas={[linha({ status: "running" })]} />);
    fireEvent.click(screen.getByRole("button", { name: "Pausar campanha" }));
    expect(mutate).toHaveBeenCalledWith({ id: "c1", acao: "pausar" }, expect.anything());
    expect(push).not.toHaveBeenCalled();
    unmount();
    envolver(<TabelaDeCampanhas {...props} linhas={[linha({ status: "paused" })]} />);
    fireEvent.click(screen.getByRole("button", { name: "Retomar campanha" }));
    expect(mutate).toHaveBeenLastCalledWith({ id: "c1", acao: "retomar" }, expect.anything());
  });

  it("carregando: 10 linhas-esqueleto; erro com 'Tentar novamente'; vazio por filtro com 'Limpar filtros'", () => {
    const { container, rerender } = envolver(<TabelaDeCampanhas {...props} carregando linhas={[]} />);
    expect(container.querySelectorAll("tr[data-esqueleto]")).toHaveLength(10);
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <TabelaDeCampanhas {...props} erro linhas={[]} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Não foi possível carregar as campanhas.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(props.aoTentarDeNovo).toHaveBeenCalled();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <TabelaDeCampanhas {...props} filtrando linhas={[]} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Nenhuma campanha encontrada")).toBeInTheDocument();
    expect(screen.getByText("Tente ajustar a busca ou os filtros aplicados.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(props.aoLimparFiltros).toHaveBeenCalled();
  });
});

describe("JanelaAlterarHorario", () => {
  it("salva o horário agendado; no passado, o erro da Clint e nada vai ao servidor", async () => {
    const user = userEvent.setup();
    const { unmount } = envolver(
      <JanelaAlterarHorario linha={linha({ status: "scheduled", agendadaPara: "2099-01-01T12:00:00Z" })} aoFechar={vi.fn()} />,
    );
    expect(screen.getByText("Alterar horário do disparo")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar novo horário" }));
    expect(mutate).toHaveBeenCalledWith({ id: "c1", acao: "reagendar", quando: "2099-01-01T12:00:00.000Z" }, expect.anything());
    unmount();
    mutate.mockReset();
    envolver(<JanelaAlterarHorario linha={linha({ status: "scheduled", agendadaPara: "2020-01-01T12:00:00Z" })} aoFechar={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Salvar novo horário" }));
    expect(screen.getByRole("alert")).toHaveTextContent("O novo horário precisa ser no futuro.");
    expect(mutate).not.toHaveBeenCalled();
  });
});

describe("VazioSemCampanhas (014)", () => {
  it("o título, o texto e o botão contornado da Clint", () => {
    render(<VazioSemCampanhas />);
    expect(screen.getByRole("heading", { name: "Crie sua primeira campanha" })).toBeInTheDocument();
    expect(screen.getByText("Envie WhatsApp em massa para sua audiência de forma rápida e organizada.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enviar WhatsApp" })).toHaveAttribute("href", "/app/campaigns/new");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-tabela.test.tsx`
Expected: FAIL (os componentes não existem). Se o `useLocaleDeData` não exportar `useTagDeIdioma` com esse nome, tire o `vi.mock` dele (o `SeletorDeDataEHora` usa o real).

- [ ] **Step 2: `components/escale/campanhas/VaziosDasCampanhas.tsx`**

```tsx
"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { ROTA_DA_NOVA } from "@/lib/escale/campanhas/rotas";
import { WhatsappLogo } from "@/lib/ui/icons";

/**
 * OS ESTADOS DA LISTA (N15; molde do 014; textos do código da Clint): sem
 * nenhuma campanha (no lugar dos filtros e da tabela), vazio por filtro, as 10
 * linhas-esqueleto e o erro.
 */
export function VazioSemCampanhas() {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
      <span aria-hidden className="grid size-14 place-items-center rounded-[10px] bg-casca-marca-suave text-casca-marca">
        <WhatsappLogo size={24} />
      </span>
      <h2 className="mt-4 text-[15px] font-semibold text-casca-texto">{t("Crie sua primeira campanha")}</h2>
      <p className="mt-2 max-w-[190px] text-[13px] leading-5 text-casca-suave">
        {t("Envie WhatsApp em massa para sua audiência de forma rápida e organizada.")}
      </p>
      <Link
        href={ROTA_DA_NOVA}
        className="mt-4 inline-flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda bg-surface px-3.5 text-[13px] font-medium text-casca-texto transition-colors hover:bg-casca-raia"
      >
        <WhatsappLogo size={14} aria-hidden />
        {t("Enviar WhatsApp")}
      </Link>
    </div>
  );
}

export function VazioDoFiltro({ aoLimpar }: { aoLimpar: () => void }) {
  const t = useT();
  return (
    <tr>
      <td colSpan={6} className="py-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-[15px] font-semibold text-casca-texto">{t("Nenhuma campanha encontrada")}</p>
          <p className="text-[13px] text-casca-suave">{t("Tente ajustar a busca ou os filtros aplicados.")}</p>
          <button
            type="button"
            onClick={aoLimpar}
            className="mt-2 h-8 rounded-casca-gatilho border border-casca-borda px-3.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
          >
            {t("Limpar filtros")}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function EsqueletoDaLista() {
  const t = useT();
  return (
    <>
      <tr className="sr-only">
        <td colSpan={6}>{t("Carregando campanhas")}</td>
      </tr>
      {Array.from({ length: 10 }, (_, i) => (
        <tr key={i} data-esqueleto aria-hidden className="h-[54px] border-b border-casca-divisoria">
          <td className="pr-3 pl-6">
            <div className="flex items-center gap-3">
              <span className="size-[34px] animate-pulse rounded-[8px] bg-casca-raia" />
              <span className="h-3 w-32 animate-pulse rounded bg-casca-raia" />
            </div>
          </td>
          <td className="px-3"><span className="block h-3 w-24 animate-pulse rounded bg-casca-raia" /></td>
          <td className="px-3"><span className="block h-3 w-28 animate-pulse rounded bg-casca-raia" /></td>
          <td className="px-3"><span className="block h-2 w-[200px] animate-pulse rounded-full bg-casca-raia" /></td>
          <td className="px-3"><span className="block h-[22px] w-20 animate-pulse rounded-[4px] bg-casca-raia" /></td>
          <td />
        </tr>
      ))}
    </>
  );
}

export function ErroDaLista({ aoTentarDeNovo }: { aoTentarDeNovo: () => void }) {
  const t = useT();
  return (
    <tr>
      <td colSpan={6} className="py-10">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-[13px] text-casca-alerta">{t("Não foi possível carregar as campanhas.")}</p>
          <button
            type="button"
            onClick={aoTentarDeNovo}
            className="h-8 rounded-casca-gatilho border border-casca-borda px-3.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
          >
            {t("Tentar novamente")}
          </button>
        </div>
      </td>
    </tr>
  );
}
```

- [ ] **Step 3: `components/escale/campanhas/JanelaAlterarHorario.tsx`**

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { useAcoesDaCampanha } from "@/hooks/escale/useCampanhasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";

const UMA_HORA_MS = 3_600_000;

/**
 * "ALTERAR HORÁRIO DO DISPARO" (material 2.2; provisório, sem print): os textos
 * da Clint e o seletor de data e hora da casca no lugar do `datetime-local`
 * nativo (regra 2 do CLAUDE.md).
 */
export function JanelaAlterarHorario({ linha, aoFechar }: { linha: LinhaDeCampanha; aoFechar: () => void }) {
  const t = useT();
  const acao = useAcoesDaCampanha();
  const [quando, setQuando] = useState(() =>
    linha.agendadaPara ? new Date(linha.agendadaPara) : new Date(Date.now() + UMA_HORA_MS),
  );
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
    if (Number.isNaN(quando.getTime())) return setErro(t("Selecione uma data e um horário válidos."));
    if (quando.getTime() <= Date.now()) return setErro(t("O novo horário precisa ser no futuro."));
    acao.mutate(
      { id: linha.id, acao: "reagendar", quando: quando.toISOString() },
      {
        onSuccess: () => {
          toast.success(t("Horário do disparo atualizado com sucesso!"));
          aoFechar();
        },
        onError: (err) =>
          err instanceof ApiError ? showApiError(err) : toast.error(t("Não foi possível alterar o horário. Tente novamente.")),
      },
    );
  }

  return (
    <JanelaDeConfirmacao
      aberta
      aoFechar={aoFechar}
      titulo={t("Alterar horário do disparo")}
      rotuloDoConfirmar={t("Salvar novo horário")}
      aoConfirmar={salvar}
      ocupado={acao.isPending}
    >
      <p>{t("Escolha a nova data e horário para o disparo desta campanha.")}</p>
      <p className="text-[13px] font-medium text-casca-texto">{t("Data e horário")}</p>
      <SeletorDeDataEHora
        valor={quando}
        aoMudar={(d) => {
          setQuando(d);
          setErro(null);
        }}
      />
      {erro ? (
        <p role="alert" className="text-[12px] text-casca-alerta">
          {erro}
        </p>
      ) : null}
    </JanelaDeConfirmacao>
  );
}
```

- [ ] **Step 4: `components/escale/campanhas/MenuDaCampanha.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAcoesDaCampanha, type PedidoDeAcao } from "@/hooks/escale/useCampanhasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import {
  ACOES_DESTRUTIVAS,
  CONFIRMACAO_DA_ACAO,
  ROTULO_DA_ACAO,
  acoesDaLinha,
  type AcaoConfirmavel,
  type AcaoDaLinha,
} from "@/lib/escale/campanhas/acoes-da-linha";
import { rotaDoRascunho } from "@/lib/escale/campanhas/rotas";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";
import { CircleX, Clock, Copy, EllipsisVertical, Pencil, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { JanelaAlterarHorario } from "./JanelaAlterarHorario";

const ICONE: Record<AcaoDaLinha, typeof Copy> = {
  editar: Pencil,
  excluir: Trash2,
  alterar_horario: Clock,
  cancelar_para_rascunho: CircleX,
  cancelar: CircleX,
  duplicar: Copy,
};

/**
 * O ⋮ DA CAMPANHA (007; material 2.1; N9): abre em cima à direita; os itens do
 * status; cancelar e excluir pedem a confirmação da Clint. `modal={false}`: a
 * janela que o item abre não pode herdar o bloqueio de clique do menu.
 */
export function MenuDaCampanha({ linha }: { linha: LinhaDeCampanha }) {
  const t = useT();
  const router = useRouter();
  const acao = useAcoesDaCampanha();
  const [confirmando, setConfirmando] = useState<AcaoConfirmavel | null>(null);
  const [reagendando, setReagendando] = useState(false);
  const falhou = (texto: string) => (err: unknown) =>
    err instanceof ApiError ? showApiError(err) : toast.error(texto);

  function duplicar() {
    toast(t("A campanha está sendo duplicada, aguarde a finalização."));
    acao.mutate(
      { id: linha.id, acao: "duplicar" },
      {
        onSuccess: (r) => {
          if (typeof r.id === "string") router.push(rotaDoRascunho(r.id));
        },
        onError: falhou(t("Não foi possível duplicar a campanha. Tente novamente.")),
      },
    );
  }

  function escolher(a: AcaoDaLinha) {
    if (a === "editar") router.push(rotaDoRascunho(linha.id));
    else if (a === "alterar_horario") setReagendando(true);
    else if (a === "duplicar") duplicar();
    else setConfirmando(a);
  }

  function confirmar() {
    if (!confirmando) return;
    const pedido: PedidoDeAcao = {
      id: linha.id,
      acao: confirmando === "excluir" ? "excluir" : confirmando === "cancelar" ? "cancelar" : "rascunho",
    };
    const sucesso =
      confirmando === "excluir"
        ? t("Rascunho excluído com sucesso!")
        : confirmando === "cancelar"
          ? t("Campanha cancelada com sucesso!")
          : t("Agendamento cancelado. A campanha foi movida para Rascunho.");
    const falha =
      confirmando === "excluir" ? t("Não foi possível excluir o rascunho. Tente novamente.") : t("Falha ao cancelar");
    acao.mutate(pedido, {
      onSuccess: () => {
        toast.success(sucesso);
        setConfirmando(null);
      },
      onError: falhou(falha),
    });
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={t("Mais opções")}
          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-texto-2 hover:bg-casca-raia hover:text-casca-texto"
        >
          <EllipsisVertical size={18} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className={CONTEUDO_DO_MENU} style={SOMBRA_DO_MENU}>
          {acoesDaLinha(linha.status, linha.enviados).map((a) => {
            const Icone = ICONE[a];
            return (
              <DropdownMenuItem
                key={a}
                className={cn(ITEM_DO_MENU, ACOES_DESTRUTIVAS.has(a) && "text-casca-alerta focus:text-casca-alerta")}
                onSelect={() => escolher(a)}
              >
                <Icone size={14} aria-hidden />
                {t(ROTULO_DA_ACAO[a])}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <JanelaDeConfirmacao
        aberta={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        perigo
        rotuloDoConfirmar={confirmando ? t(ROTULO_DA_ACAO[confirmando]) : undefined}
        aoConfirmar={confirmar}
        ocupado={acao.isPending}
      >
        <p>{confirmando ? t(CONFIRMACAO_DA_ACAO[confirmando]) : null}</p>
      </JanelaDeConfirmacao>
      {reagendando ? <JanelaAlterarHorario linha={linha} aoFechar={() => setReagendando(false)} /> : null}
    </>
  );
}
```

- [ ] **Step 5: `components/escale/campanhas/LinhaDaCampanha.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { useAcoesDaCampanha } from "@/hooks/escale/useCampanhasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import { botaoDaLinha } from "@/lib/escale/campanhas/acoes-da-linha";
import { dataDoDisparo, dataEHoraBr, subtituloDaCampanha } from "@/lib/escale/campanhas/apresentacao";
import { rotaDoDetalhe, rotaDoRascunho } from "@/lib/escale/campanhas/rotas";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";
import { CirclePause, Play, Send } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BarraDeResultado } from "./BarraDeResultado";
import { MenuDaCampanha } from "./MenuDaCampanha";
import { SeloDoStatus } from "./SeloDoStatus";

/**
 * A LINHA DA CAMPANHA (002; PRD A5, A8, A10): clicar abre (rascunho na edição,
 * as outras no detalhe; N11); a última célula não propaga o clique.
 */
export function LinhaDaCampanha({
  linha,
  agora,
  fuso,
  nomeDoNumero,
}: {
  linha: LinhaDeCampanha;
  agora: Date;
  fuso?: string;
  nomeDoNumero: string;
}) {
  const t = useT();
  const router = useRouter();
  const abrir = () => router.push(linha.status === "draft" ? rotaDoRascunho(linha.id) : rotaDoDetalhe(linha.id));
  const data = dataDoDisparo(linha);
  return (
    <tr
      onClick={abrir}
      className="h-[54px] cursor-pointer border-b border-casca-divisoria transition-colors hover:bg-casca-busca has-[[data-state=open]]:bg-casca-busca"
    >
      <td className="pr-3 pl-6">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-[34px] shrink-0 place-items-center rounded-[8px] bg-casca-marca-suave text-casca-marca">
            <Send size={16} />
          </span>
          <div className="min-w-0">
            <button
              type="button"
              title={linha.nome}
              onClick={(e) => {
                e.stopPropagation();
                abrir();
              }}
              className="block max-w-[200px] truncate text-left text-[13px] font-medium text-casca-texto hover:underline focus-visible:ring-2 focus-visible:ring-casca-marca focus-visible:outline-hidden"
            >
              {linha.nome}
            </button>
            <p className="truncate text-[11px] text-casca-meta">{subtituloDaCampanha(linha, agora, t, fuso)}</p>
          </div>
        </div>
      </td>
      <td className="px-3 text-[11px] text-casca-texto">{data ? dataEHoraBr(data, fuso) : "—"}</td>
      <td className="truncate px-3 text-[11px] text-casca-texto">{nomeDoNumero}</td>
      <td className="px-3">
        <BarraDeResultado linha={linha} fuso={fuso} />
      </td>
      <td className="px-3">
        <SeloDoStatus status={linha.status} />
      </td>
      <td className="pr-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <BotaoDePausa linha={linha} />
          <MenuDaCampanha linha={linha} />
        </div>
      </td>
    </tr>
  );
}

/** Pausar/Retomar na linha (material 2.1; provisório, sem print). */
function BotaoDePausa({ linha }: { linha: LinhaDeCampanha }) {
  const t = useT();
  const acao = useAcoesDaCampanha();
  const qual = botaoDaLinha(linha.status);
  if (!qual) return null;
  const pausar = qual === "pausar";
  const rotulo = pausar ? t("Pausar campanha") : t("Retomar campanha");
  const executar = () =>
    acao.mutate(
      { id: linha.id, acao: qual },
      {
        onSuccess: () => toast.success(pausar ? t("Campanha pausada com sucesso!") : t("Campanha retomada com sucesso!")),
        onError: (err) =>
          err instanceof ApiError
            ? showApiError(err)
            : toast.error(
                pausar ? t("Falha ao pausar a campanha. Tente novamente.") : t("Falha ao retomar a campanha. Tente novamente."),
              ),
      },
    );
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      onClick={executar}
      disabled={acao.isPending}
      className={cn(
        "grid size-7 place-items-center rounded-casca-gatilho transition-colors disabled:opacity-50",
        pausar
          ? "border border-casca-borda text-casca-texto-2 hover:bg-casca-raia"
          : "bg-casca-marca text-accent-foreground hover:bg-casca-marca-forte",
      )}
    >
      {pausar ? <CirclePause size={16} aria-hidden /> : <Play size={14} aria-hidden />}
    </button>
  );
}
```

- [ ] **Step 6: `components/escale/campanhas/TabelaDeCampanhas.tsx`**

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { LinhaDeCampanha } from "@/lib/escale/campanhas/tipos";
import { cn } from "@/lib/utils";

import { LinhaDaCampanha } from "./LinhaDaCampanha";
import { ErroDaLista, EsqueletoDaLista, VazioDoFiltro } from "./VaziosDasCampanhas";

const TH = "px-3 text-left text-[10px] font-semibold tracking-[0.1em] text-casca-texto uppercase";

/** A TABELA (002; PRD A5, A12): as colunas da Clint com "Número" no lugar de Conta e Dispositivo. */
export function TabelaDeCampanhas({
  linhas,
  carregando,
  erro,
  filtrando,
  fuso,
  agora,
  nomeDoNumero,
  aoLimparFiltros,
  aoTentarDeNovo,
}: {
  linhas: LinhaDeCampanha[];
  carregando: boolean;
  erro: boolean;
  filtrando: boolean;
  fuso?: string;
  /** Para o "há um mês" (o teste fixa; a tela usa a hora em que montou). */
  agora?: Date;
  nomeDoNumero: (id: string) => string;
  aoLimparFiltros: () => void;
  aoTentarDeNovo: () => void;
}) {
  const t = useT();
  const [instante] = useState(() => agora ?? new Date());
  let corpo: ReactNode;
  if (carregando) corpo = <EsqueletoDaLista />;
  else if (erro) corpo = <ErroDaLista aoTentarDeNovo={aoTentarDeNovo} />;
  else if (linhas.length === 0) corpo = filtrando ? <VazioDoFiltro aoLimpar={aoLimparFiltros} /> : null;
  else
    corpo = linhas.map((l) => (
      <LinhaDaCampanha key={l.id} linha={l} agora={instante} fuso={fuso} nomeDoNumero={nomeDoNumero(l.numeroId)} />
    ));

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[14%]" />
          <col className="w-[20%]" />
          <col className="w-[22%]" />
          <col className="w-[12%]" />
          <col className="w-[6%]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="h-[42px] border-y border-casca-divisoria">
            <th scope="col" className={cn(TH, "pl-6")}>{t("Campanha")}</th>
            <th scope="col" className={TH}>{t("Data agendamento")}</th>
            <th scope="col" className={TH}>{t("Número")}</th>
            <th scope="col" className={TH}>{t("Resultado")}</th>
            <th scope="col" className={TH}>{t("Status")}</th>
            <th scope="col" className="pr-4">
              <span className="sr-only">{t("Ações")}</span>
            </th>
          </tr>
        </thead>
        <tbody aria-busy={carregando || undefined}>{corpo}</tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-tabela.test.tsx tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/campanhas tests/unit/escale-campanhas-tabela.test.tsx && corepack pnpm eslint components/escale/campanhas && corepack pnpm typecheck`
Expected: PASS. Se o `getByRole("button", { name: "Cancelar campanha" })` achar dois (o item do menu ainda aberto), troque por `within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar campanha" })`.

- [ ] **Step 8: Commit**

```bash
git add components/escale/campanhas tests/unit/escale-campanhas-tabela.test.tsx
git commit -m "feat(escale): tabela de campanhas com a linha, o menu por status, pausa e alterar horário (Fase 8A)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 9: A página, as abas e os encaixes

Abra antes: 001, 002 e 014.

**Files:**
- Create: `components/escale/campanhas/ListaDeCampanhasDaCasca.tsx`, `components/escale/campanhas/CampanhasDaCasca.tsx`, `tests/unit/escale-campanhas-pagina.test.tsx`
- Modify: `app/app/campaigns/page.tsx`, `app/app/prospecting/page.tsx`, `lib/escale/menu-do-topo.ts`, `components/escale/menu/MenuDoTopo.tsx`, `tests/unit/escale-menu-do-topo.test.ts`

**Interfaces:**
- Consumes: tudo das Tasks 1–8; `useChannelSessions`, `channelLabel` (`hooks/channels/useChannelSessions.ts`); `PaginacaoDaCasca`; `ProspectingClient` (`app/app/prospecting/_client.tsx`); `requireAuth`, `resolveActiveOrg` (`lib/auth/server.ts`); `COOKIE_DO_MENU`, `lerPreferenciaDeMenu`.
- Produces: `CampanhasDaCasca({ papel, organizacaoId, aba, fuso? })`, `ListaDeCampanhasDaCasca({ organizacaoId, fuso? })`; `montarMenuDoTopo(visiveis, papel?)`, `PAPEL_MINIMO_NO_TOPO`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-campanhas-pagina.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PaginaDeCampanhas } from "@/lib/escale/campanhas/tipos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const cookie = { valor: undefined as string | undefined };
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookie.valor ? { value: cookie.valor } : undefined) }),
}));
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
const push = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (u: string) => redirect(u), useRouter: () => ({ push }) }));
const org = { papel: "manager" as string };
vi.mock("@/lib/auth/server", () => ({
  requireAuth: async () => ({ id: "u1" }),
  resolveActiveOrg: async () => ({ orgId: "org-1", role: org.papel, name: "Org", timezone: "America/Sao_Paulo" }),
}));
vi.mock("@/app/app/campaigns/_client", () => ({ ListaDeCampanhas: () => <div>LISTA DO ORIGINAL</div> }));
vi.mock("@/app/app/prospecting/_client", () => ({ ProspectingClient: () => <div>PROSPECÇÃO DO ORIGINAL</div> }));
vi.mock("@/hooks/channels/useChannelSessions", async (orig) => ({
  ...(await orig<object>()),
  useChannelSessions: () => ({ data: [{ id: "s1", display_name: "Comercial", phone_number: null, waha_session_name: null }] }),
}));
const lista = { data: undefined as PaginaDeCampanhas | undefined, isLoading: false, isError: false };
vi.mock("@/hooks/escale/useCampanhasDaCasca", () => ({
  useCampanhasAoVivo: vi.fn(),
  useListaDeCampanhas: () => ({ ...lista, refetch: vi.fn() }),
  useResumoDasCampanhas: () => ({ data: undefined, isLoading: false }),
  useAcoesDaCampanha: () => ({ mutate: vi.fn(), isPending: false }),
}));

import CampanhasPage from "@/app/app/campaigns/page";
import ProspectingPage from "@/app/app/prospecting/page";
import { CampanhasDaCasca } from "@/components/escale/campanhas/CampanhasDaCasca";

const linhaPadrao = {
  id: "c1", nome: "10.09", status: "completed" as const, numeroId: "s1", solicitados: 30, agendadaPara: null,
  iniciadaEm: "2026-09-10T15:39:00Z", criadaEm: "2026-09-10T12:00:00Z",
  adicionados: 30, enviados: 26, entregues: 24, lidos: 16, erros: 3,
};

beforeEach(() => {
  cookie.valor = undefined;
  org.papel = "manager";
  redirect.mockClear();
  lista.data = undefined;
});

describe("/app/campaigns", () => {
  it("sem a casca, a lista do original", async () => {
    render(await CampanhasPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("LISTA DO ORIGINAL")).toBeInTheDocument();
  });

  it("com a casca, a lista da Clint; quem não é gerente vai para o Atendimento", async () => {
    cookie.valor = "topo";
    lista.data = { linhas: [linhaPadrao], total: 1, pagina: 1, porPagina: 10 };
    render(await CampanhasPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "WhatsApp" })).toBeInTheDocument();
    expect(screen.getByText("10.09")).toBeInTheDocument();
    org.papel = "agent";
    await expect(CampanhasPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT /app/inbox");
  });

  it("?aba=prospeccao só vale para admin", async () => {
    cookie.valor = "topo";
    org.papel = "admin";
    render(await CampanhasPage({ searchParams: Promise.resolve({ aba: "prospeccao" }) }));
    expect(screen.getByText("PROSPECÇÃO DO ORIGINAL")).toBeInTheDocument();
  });
});

describe("/app/prospecting com a casca", () => {
  it("o admin vai para a aba Prospecção de Campanhas", async () => {
    cookie.valor = "topo";
    org.papel = "admin";
    await expect(ProspectingPage()).rejects.toThrow("REDIRECT /app/campaigns?aba=prospeccao");
  });
});

describe("CampanhasDaCasca", () => {
  it("gerente: sem a faixa de abas; admin: WhatsApp e Prospecção", () => {
    lista.data = { linhas: [linhaPadrao], total: 1, pagina: 1, porPagina: 10 };
    const { unmount } = render(<CampanhasDaCasca papel="manager" organizacaoId="org-1" aba="whatsapp" />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    unmount();
    render(<CampanhasDaCasca papel="admin" organizacaoId="org-1" aba="whatsapp" />);
    expect(screen.getAllByRole("tab").map((a) => a.textContent)).toEqual(["WhatsApp", "Prospecção"]);
  });

  it("sem nenhuma campanha: o vazio da Clint no lugar dos filtros, do resumo e da tabela", () => {
    lista.data = { linhas: [], total: 0, pagina: 1, porPagina: 10 };
    render(<CampanhasDaCasca papel="manager" organizacaoId="org-1" aba="whatsapp" />);
    expect(screen.getByRole("heading", { name: "Crie sua primeira campanha" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Buscar campanha")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resumo das campanhas" })).not.toBeInTheDocument();
  });

  it("até 10 campanhas sem rodapé; mais de 10 com a paginação", () => {
    lista.data = { linhas: [linhaPadrao], total: 10, pagina: 1, porPagina: 10 };
    const { unmount } = render(<CampanhasDaCasca papel="manager" organizacaoId="org-1" aba="whatsapp" />);
    expect(screen.queryByRole("navigation", { name: "Paginação" })).not.toBeInTheDocument();
    unmount();
    lista.data = { linhas: [linhaPadrao], total: 25, pagina: 1, porPagina: 10 };
    render(<CampanhasDaCasca papel="manager" organizacaoId="org-1" aba="whatsapp" />);
    expect(screen.getByRole("navigation", { name: "Paginação" })).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
  });
});
```

E, em `tests/unit/escale-menu-do-topo.test.ts`, um `it` novo no fim do `describe`:

```ts
  // FORK ESCALE · Fase 8A: Campanhas só para gerente ou acima (N3).
  it("com o papel, Campanhas some do topo e do Mais abaixo de gerente", () => {
    const comoAgente = montarMenuDoTopo(AGENT, "agent");
    const noMais = comoAgente.mais.flatMap((g) => g.secoes.flatMap((s) => s.itens.map((d) => d.href)));
    expect(comoAgente.topo.some((i) => i.href === "/app/campaigns")).toBe(false);
    expect(noMais).not.toContain("/app/campaigns");
    expect(montarMenuDoTopo(ADMIN, "manager").topo.some((i) => i.href === "/app/campaigns")).toBe(true);
    expect(itemAtivo("/app/prospecting", ITENS_DO_TOPO.find((i) => i.href === "/app/campaigns")!)).toBe(true);
  });
```

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-pagina.test.tsx tests/unit/escale-menu-do-topo.test.ts`
Expected: FAIL (a página não tem a casca; o menu não recebe o papel).

- [ ] **Step 2: `components/escale/campanhas/ListaDeCampanhasDaCasca.tsx`**

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";

import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useCampanhasAoVivo, useListaDeCampanhas, useResumoDasCampanhas } from "@/hooks/escale/useCampanhasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { FILTROS_VAZIOS, temFiltro, type FiltrosDeCampanhas } from "@/lib/escale/campanhas/filtros";
import { POR_PAGINA, POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";

import { BarraDeFiltrosDasCampanhas } from "./BarraDeFiltrosDasCampanhas";
import { FaixaDoResumo } from "./FaixaDoResumo";
import { TabelaDeCampanhas } from "./TabelaDeCampanhas";
import { VazioSemCampanhas } from "./VaziosDasCampanhas";

/**
 * A ABA WHATSAPP (002; PRD A3–A13): filtros, resumo, tabela e paginação; a
 * lista ao vivo. Sem nenhuma campanha (e sem filtro), só o vazio (N15).
 */
export function ListaDeCampanhasDaCasca({ organizacaoId, fuso }: { organizacaoId: string; fuso?: string }) {
  const t = useT();
  const [filtros, setFiltros] = useState<FiltrosDeCampanhas>(FILTROS_VAZIOS);
  const [versaoDosFiltros, setVersaoDosFiltros] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_PADRAO);
  const [resumoAberto, setResumoAberto] = useState(false);
  useCampanhasAoVivo(organizacaoId);
  const lista = useListaDeCampanhas(filtros, pagina, porPagina);
  const resumo = useResumoDasCampanhas(filtros, resumoAberto);
  const sessoes = useChannelSessions().data;
  const numeros = useMemo(
    () => (sessoes ?? []).map((s) => ({ valor: s.id, rotulo: channelLabel(s, t) })),
    [sessoes, t],
  );
  const nomeDoNumero = useMemo(() => {
    const nomes = new Map(numeros.map((n) => [n.valor, n.rotulo]));
    return (id: string) => nomes.get(id) ?? "—";
  }, [numeros]);

  const total = lista.data?.total ?? 0;
  const filtrando = temFiltro(filtros);

  // A página ficou vazia (excluiu a última da página): volta uma.
  useEffect(() => {
    if (lista.data && lista.data.linhas.length === 0 && pagina > 1) setPagina((p) => p - 1);
  }, [lista.data, pagina]);

  const mudarFiltros = (f: FiltrosDeCampanhas) => {
    setFiltros(f);
    setPagina(1);
  };
  const limparFiltros = () => {
    mudarFiltros(FILTROS_VAZIOS);
    setVersaoDosFiltros((v) => v + 1);
  };

  if (!lista.isLoading && !lista.isError && !filtrando && total === 0) return <VazioSemCampanhas />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 px-6 pt-4 pb-3">
        <BarraDeFiltrosDasCampanhas key={versaoDosFiltros} filtros={filtros} numeros={numeros} aoMudar={mudarFiltros} />
        <FaixaDoResumo
          aberta={resumoAberto}
          aoAlternar={() => setResumoAberto((a) => !a)}
          resumo={resumo.data}
          carregando={resumo.isLoading}
        />
      </div>
      <TabelaDeCampanhas
        linhas={lista.data?.linhas ?? []}
        carregando={lista.isLoading}
        erro={lista.isError}
        filtrando={filtrando}
        fuso={fuso}
        nomeDoNumero={nomeDoNumero}
        aoLimparFiltros={limparFiltros}
        aoTentarDeNovo={() => void lista.refetch()}
      />
      {total > POR_PAGINA_PADRAO ? (
        <footer className="shrink-0 border-t border-casca-divisoria px-6">
          <PaginacaoDaCasca
            pagina={pagina}
            total={total}
            porPagina={porPagina}
            opcoesPorPagina={POR_PAGINA}
            aoMudarPagina={setPagina}
            aoMudarPorPagina={(n) => {
              setPorPagina(n);
              setPagina(1);
            }}
          />
        </footer>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: `components/escale/campanhas/CampanhasDaCasca.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";

import { ProspectingClient } from "@/app/app/prospecting/_client";
import type { Role } from "@/lib/auth/types";
import { abasVisiveis, rotaDaAba, type AbaDasCampanhas } from "@/lib/escale/campanhas/rotas";

import { AbasDasCampanhas } from "./AbasDasCampanhas";
import { CabecalhoDasCampanhas } from "./CabecalhoDasCampanhas";
import { ListaDeCampanhasDaCasca } from "./ListaDeCampanhasDaCasca";

/**
 * CAMPANHAS NA CASCA (fork Escale, Fase 8A; 002; N2): o cabeçalho, as abas
 * (Prospecção só para admin; com uma aba só, a faixa some) e o conteúdo da aba.
 * A Prospecção mostra a tela do original até a 8D.
 */
export function CampanhasDaCasca({
  papel,
  organizacaoId,
  aba,
  fuso,
}: {
  papel: Role;
  organizacaoId: string;
  aba: AbaDasCampanhas;
  fuso?: string;
}) {
  const router = useRouter();
  const abas = abasVisiveis(papel);
  return (
    <div className="flex min-h-full flex-col bg-surface">
      <CabecalhoDasCampanhas aba={aba} />
      {abas.length > 1 ? <AbasDasCampanhas abas={abas} valor={aba} aoMudar={(a) => router.push(rotaDaAba(a))} /> : null}
      {aba === "prospeccao" ? (
        <ProspectingClient />
      ) : (
        <ListaDeCampanhasDaCasca organizacaoId={organizacaoId} fuso={fuso} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: O encaixe em `app/app/campaigns/page.tsx`**

Troque o arquivo inteiro por:

```tsx
import type { Metadata } from "next";
// ── FORK ESCALE · Fase 8A: com a casca, a lista de campanhas da Clint ──
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CampanhasDaCasca } from "@/components/escale/campanhas/CampanhasDaCasca";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { roleAtLeast } from "@/lib/auth/types";
import { abaDaUrl } from "@/lib/escale/campanhas/rotas";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

import { ListaDeCampanhas } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campanhas" };

export default async function CampanhasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string | string[] }>;
}) {
  // ── FORK ESCALE · Fase 8A ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    const org = await resolveActiveOrg(await requireAuth());
    if (!org || !roleAtLeast(org.role, "manager")) redirect("/app/inbox");
    const { aba } = await searchParams;
    return (
      <CampanhasDaCasca
        papel={org.role}
        organizacaoId={org.orgId}
        aba={abaDaUrl(typeof aba === "string" ? aba : null, org.role)}
        fuso={org.timezone ?? undefined}
      />
    );
  }
  // ── fim FORK ESCALE ──
  // Auth e organização já vêm garantidas pelo layout de /app; a lista carrega
  // pela API, que confere o papel `manager` por conta própria.
  return <ListaDeCampanhas />;
}
```

- [ ] **Step 5: O encaixe em `app/app/prospecting/page.tsx`**

Troque o arquivo inteiro por:

```tsx
import type { Metadata } from "next";
// ── FORK ESCALE · Fase 8A: com a casca, a Prospecção mora na aba de Campanhas ──
import { cookies } from "next/headers";
// ── fim FORK ESCALE ──
import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
// ── FORK ESCALE · Fase 8A ──
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──
import { ProspectingClient } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prospecção" };
export default async function ProspectingPage() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  if (org?.role !== "admin") redirect("/app/inbox");
  // ── FORK ESCALE · Fase 8A ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    redirect("/app/campaigns?aba=prospeccao");
  }
  // ── fim FORK ESCALE ──
  return <ProspectingClient />;
}
```

- [ ] **Step 6: O menu do topo**

Em `lib/escale/menu-do-topo.ts`:

1. No item de Campanhas de `ITENS_DO_TOPO`, troque `ativoEm: ["/app/campaigns"]` por `ativoEm: ["/app/campaigns", "/app/prospecting"]` (a Prospecção é uma aba de Campanhas).
2. Logo antes de `export function montarMenuDoTopo`, acrescente:

```ts
/**
 * FORK ESCALE · Fase 8A (N3): telas que a casca esconde abaixo de um papel,
 * além da régua do registro. Campanhas exige gerente nas rotas e na RLS, mas o
 * registro não declara `minRole` (o original mostra o item a todos).
 */
export const PAPEL_MINIMO_NO_TOPO: Readonly<Record<string, Role>> = { "/app/campaigns": "manager" };
```

3. Troque a assinatura e o começo de `montarMenuDoTopo` por:

```ts
export function montarMenuDoTopo(todas: readonly NavDestination[], papel?: Role | null): MenuDoTopo {
  // Sem papel (os testes antigos), a lista vale como veio.
  const visiveis =
    papel === undefined
      ? todas
      : todas.filter((d) => {
          const minimo = PAPEL_MINIMO_NO_TOPO[d.href];
          return !minimo || roleAtLeast(papel, minimo);
        });
  const hrefs = new Set(visiveis.map((d) => d.href));
```

(o resto da função continua igual, lendo `visiveis`).

Em `components/escale/menu/MenuDoTopo.tsx`, troque

```ts
  const menu = useMemo(() => montarMenuDoTopo(visiveis), [visiveis]);
```

por

```ts
  // FORK ESCALE · Fase 8A: o papel esconde Campanhas abaixo de gerente (N3).
  const menu = useMemo(() => montarMenuDoTopo(visiveis, activeOrg?.role ?? null), [visiveis, activeOrg?.role]);
```

- [ ] **Step 7: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-campanhas-pagina.test.tsx tests/unit/escale-menu-do-topo.test.ts tests/unit/escale-menu-do-topo-tela.test.tsx tests/unit/escale-casca-v2-original-intacto.test.tsx && corepack pnpm prettier --write components/escale/campanhas tests/unit/escale-campanhas-pagina.test.tsx && corepack pnpm eslint components/escale/campanhas app/app/campaigns/page.tsx app/app/prospecting/page.tsx lib/escale/menu-do-topo.ts components/escale/menu/MenuDoTopo.tsx && corepack pnpm typecheck`
Expected: PASS. O aviso `react-hooks/set-state-in-effect` no efeito da página vazia é `warn` (eslint.config.mjs) e não reprova.

- [ ] **Step 8: Commit**

```bash
git add components/escale/campanhas tests/unit/escale-campanhas-pagina.test.tsx app/app/campaigns/page.tsx app/app/prospecting/page.tsx lib/escale/menu-do-topo.ts components/escale/menu/MenuDoTopo.tsx tests/unit/escale-menu-do-topo.test.ts
git commit -m "feat(escale): página de Campanhas da casca com as abas WhatsApp e Prospecção (Fase 8A)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 10: Espanhol, cercas, PRD, LOG e o PR

**Files:**
- Modify: `lib/i18n/dicionario.ts`; fora do repositório, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md` e `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`

- [ ] **Step 1: Quais chaves já existem**

O dicionário recusa chave repetida (o TypeScript reprova propriedade duplicada), e a chave pode estar sem aspas (`Status: {…}`). Antes de colar, rode:

```bash
cat > "$TEMP/chaves-8a.cjs" <<'EOF'
const fs = require("fs");
const src = fs.readFileSync("lib/i18n/dicionario.ts", "utf8");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const k of fs.readFileSync(process.argv[2], "utf8").split(/\r?\n/).filter(Boolean)) {
  const aspas = new RegExp(`^\\s+"${esc(k)}"\\s*:`, "m");
  const ident = /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(k) ? new RegExp(`^\\s+${esc(k)}\\s*:`, "mu") : null;
  if (aspas.test(src) || (ident && ident.test(src))) console.log(`JA: ${k}`);
}
EOF
```

Depois cole as chaves do bloco abaixo (uma por linha, só a chave) em `$TEMP/chaves-8a.txt` e rode `node "$TEMP/chaves-8a.cjs" "$TEMP/chaves-8a.txt"`. **Tire do bloco toda chave que sair como `JA:`** (em 19/10, nenhuma das abaixo existia; as que já existiam — "Rascunho", "Processando", "Pausada", "Cancelado", "Concluído", "Enviados", "Entregues", "Lidas", "Erros", "Criado em", "WhatsApp", "Prospecção", "Configuração de campanhas", "Filtrar por data de criação", "Status", "Número", "Limpar", "Campanha", "Resultado", "Ações", "Mais opções", "Cancelar campanha", "Limpar filtros", "Tentar novamente", "Filtro inválido.", "Query inválida.", "Fechar", "Confirme sua ação" — já ficaram de fora).

- [ ] **Step 2: O bloco do espanhol**

Em `lib/i18n/dicionario.ts`, logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` (depois do bloco da 3D, e do da 3E se ela já estiver na `main`):

```ts
  // ─── FORK ESCALE · Fase 8A: lista de campanhas ───
  "Pronta para enviar": { es: "Lista para enviar" },
  "Agendado": { es: "Programado" },
  "Em progresso": { es: "En progreso" },
  "Completo": { es: "Completo" },
  "Erro de processamento": { es: "Error de procesamiento" },
  "Sua campanha foi salva como rascunho e ainda não foi enviada.": { es: "Tu campaña se guardó como borrador y aún no se envió." },
  "Estamos montando a lista de contatos da sua campanha.": { es: "Estamos armando la lista de contactos de tu campaña." },
  "A lista de contatos está pronta e a campanha aguarda o envio.": { es: "La lista de contactos está lista y la campaña espera el envío." },
  "Sua campanha foi agendada e será enviada na data e hora programadas.": { es: "Tu campaña fue programada y se enviará en la fecha y hora programadas." },
  "Sua mensagem está sendo enviada para os contatos da sua campanha.": { es: "Tu mensaje se está enviando a los contactos de tu campaña." },
  "Sua campanha foi pausada. Nenhum contato novo recebe mensagem até você retomar o envio.": { es: "Tu campaña fue pausada. Ningún contacto nuevo recibe mensajes hasta que reanudes el envío." },
  "O envio da campanha foi concluído.": { es: "El envío de la campaña se completó." },
  "Sua campanha foi cancelada e o envio não foi realizado.": { es: "Tu campaña fue cancelada y el envío no se realizó." },
  "Ocorreu um erro na sua campanha e ela não foi enviada para seus contatos.": { es: "Ocurrió un error en tu campaña y no se envió a tus contactos." },
  "Envio em Andamento": { es: "Envío en curso" },
  "Erro de Processamento": { es: "Error de procesamiento" },
  "{n} inválidos ou com erro": { es: "{n} inválidos o con error" },
  "{n} entregues - {p}%": { es: "{n} entregados - {p}%" },
  "{n} lidos - {p}%": { es: "{n} leídos - {p}%" },
  "{n} enviados - {p}%": { es: "{n} enviados - {p}%" },
  "Agendada para {data}": { es: "Programada para {data}" },
  "Nenhum envio ainda": { es: "Ningún envío todavía" },
  "Adicionados para envio": { es: "Agregados para envío" },
  "Percentual sobre os adicionados para envio.": { es: "Porcentaje sobre los agregados para envío." },
  "Resumo das campanhas": { es: "Resumen de las campañas" },
  "há poucos segundos": { es: "hace unos segundos" },
  "há um minuto": { es: "hace un minuto" },
  "há {n} minutos": { es: "hace {n} minutos" },
  "há uma hora": { es: "hace una hora" },
  "há {n} horas": { es: "hace {n} horas" },
  "há um dia": { es: "hace un día" },
  "há {n} dias": { es: "hace {n} días" },
  "há um mês": { es: "hace un mes" },
  "há {n} meses": { es: "hace {n} meses" },
  "há um ano": { es: "hace un año" },
  "há {n} anos": { es: "hace {n} años" },
  "Solicitado": { es: "Solicitado" },
  "Solicitados": { es: "Solicitados" },
  "Enviar WhatsApp": { es: "Enviar WhatsApp" },
  "Canais de campanha": { es: "Canales de campaña" },
  "Buscar campanha": { es: "Buscar campaña" },
  "Filtrar por data do agendamento": { es: "Filtrar por fecha de programación" },
  "Data agendamento": { es: "Fecha de programación" },
  "Editar rascunho": { es: "Editar borrador" },
  "Excluir rascunho": { es: "Eliminar borrador" },
  "Alterar horário do disparo": { es: "Cambiar horario del envío" },
  "Duplicar campanha": { es: "Duplicar campaña" },
  "Pausar campanha": { es: "Pausar campaña" },
  "Retomar campanha": { es: "Reanudar campaña" },
  "Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.": { es: "¿Seguro que deseas eliminar este borrador? Esta acción no se puede deshacer." },
  "A campanha será movida para Rascunho e você poderá editá-la e reagendar. Deseja continuar?": { es: "La campaña pasará a Borrador y podrás editarla y reprogramarla. ¿Deseas continuar?" },
  "A campanha será cancelada e os contatos que ainda não receberam a mensagem não serão notificados. Esta ação não pode ser desfeita.": { es: "La campaña se cancelará y los contactos que aún no recibieron el mensaje no serán notificados. Esta acción no se puede deshacer." },
  "Campanha pausada com sucesso!": { es: "¡Campaña pausada con éxito!" },
  "Campanha retomada com sucesso!": { es: "¡Campaña reanudada con éxito!" },
  "Campanha cancelada com sucesso!": { es: "¡Campaña cancelada con éxito!" },
  "Agendamento cancelado. A campanha foi movida para Rascunho.": { es: "Programación cancelada. La campaña pasó a Borrador." },
  "Horário do disparo atualizado com sucesso!": { es: "¡Horario del envío actualizado con éxito!" },
  "Rascunho excluído com sucesso!": { es: "¡Borrador eliminado con éxito!" },
  "A campanha está sendo duplicada, aguarde a finalização.": { es: "La campaña se está duplicando, espera a que termine." },
  "Falha ao pausar a campanha. Tente novamente.": { es: "Error al pausar la campaña. Inténtalo de nuevo." },
  "Falha ao retomar a campanha. Tente novamente.": { es: "Error al reanudar la campaña. Inténtalo de nuevo." },
  "Falha ao cancelar": { es: "Error al cancelar" },
  "Não foi possível duplicar a campanha. Tente novamente.": { es: "No se pudo duplicar la campaña. Inténtalo de nuevo." },
  "Não foi possível excluir o rascunho. Tente novamente.": { es: "No se pudo eliminar el borrador. Inténtalo de nuevo." },
  "Não foi possível alterar o horário. Tente novamente.": { es: "No se pudo cambiar el horario. Inténtalo de nuevo." },
  "Escolha a nova data e horário para o disparo desta campanha.": { es: "Elige la nueva fecha y hora para el envío de esta campaña." },
  "Data e horário": { es: "Fecha y hora" },
  "Salvar novo horário": { es: "Guardar nuevo horario" },
  "Selecione uma data e um horário válidos.": { es: "Selecciona una fecha y una hora válidas." },
  "O novo horário precisa ser no futuro.": { es: "El nuevo horario debe ser en el futuro." },
  "Crie sua primeira campanha": { es: "Crea tu primera campaña" },
  "Envie WhatsApp em massa para sua audiência de forma rápida e organizada.": { es: "Envía WhatsApp masivos a tu audiencia de forma rápida y organizada." },
  "Nenhuma campanha encontrada": { es: "No se encontró ninguna campaña" },
  "Tente ajustar a busca ou os filtros aplicados.": { es: "Intenta ajustar la búsqueda o los filtros aplicados." },
  "Não foi possível carregar as campanhas.": { es: "No se pudieron cargar las campañas." },
  "Carregando campanhas": { es: "Cargando campañas" },
  "Só uma campanha agendada pode mudar de horário.": { es: "Solo una campaña programada puede cambiar de horario." },
  "Esta campanha já enviou mensagens. Para parar o envio, cancele a campanha.": { es: "Esta campaña ya envió mensajes. Para detener el envío, cancela la campaña." },
  "Só um rascunho pode ser excluído.": { es: "Solo un borrador se puede eliminar." },
  "Este rascunho já enviou mensagens e fica no histórico.": { es: "Este borrador ya envió mensajes y queda en el historial." },
  "Informe a nova data e hora do disparo.": { es: "Indica la nueva fecha y hora del envío." },
  "Ação de campanha desconhecida.": { es: "Acción de campaña desconocida." },
  "O estado da campanha mudou enquanto esta ação era processada. Recarregue a tela.": { es: "El estado de la campaña cambió mientras se procesaba esta acción. Recarga la pantalla." },
  "Campanha não encontrada.": { es: "Campaña no encontrada." },
```

- [ ] **Step 3: Os gates da fase (sem `test:db` e sem a rodada cheia)**

O `dicionario.ts` **não** passa pelo prettier (arquivo do original, 17 mil linhas: o diff viraria o arquivo inteiro); as chaves vão entre aspas, como os blocos da 3D.

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts tests/unit/vocabulario-do-funil.test.ts tests/unit/evidencia-citada.test.ts tests/unit/escale-casca-v2-original-intacto.test.tsx tests/unit/manifest-x-migrations.test.ts tests/unit/escale-tema.test.ts tests/unit/escale-casca-tokens.test.ts tests/unit/campanha-escreve-como-servidor.test.ts
corepack pnpm vitest run $(git diff --name-only escale-crm/main...HEAD | grep -E "\.test\.tsx?$" | grep -v "^tests/invariants") lib/campanhas/maquina-de-estados.test.ts
corepack pnpm typecheck && corepack pnpm eslint $(git diff --name-only escale-crm/main...HEAD | grep -E "\.(ts|tsx)$")
```

Expected: tudo PASS. Os nomes exatos das cercas: `ls tests/unit | grep -E "i18n|tokens|decorativo|vocabulario|evidencia|intacto|manifest|tema|campanha-escreve"`. Se o `i18n-espanhol-cobre-a-tela` acusar prosa fora de `t()`, a mensagem diz o arquivo e o texto: envolva em `t()` e acrescente a chave no bloco.

```bash
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol da lista de campanhas (Fase 8A)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

- [ ] **Step 4: O PRD e o LOG (fora do repositório)**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md`:
- seção 8, linha da 8A: a coluna "Estado" de `proposta` para `executada (PR #<n>, <data>); testes e publicação no fim da Frente B`;
- seção 4, tabela A: a coluna "Fase" de A1–A14 para `8A ✅`, com as diferenças declaradas: A3 sem "Dispositivos" e com "Número" de escolha única (principal); A6/A8/A9/A12 provisórios onde falta print (lista no topo deste plano); A14 abre a configuração do original (pergunta ao usuário); A13 com reconsulta de 10 s enquanto anda.

Em `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`: uma entrada nova no topo da "Linha do tempo" (data de hoje, a 8A executada, o PR, a migration 9301, o que ficou provisório, a pergunta da A14) e "Onde estamos"/"Próximos passos" reescritos (próximo: plano da 8B; a bateria da Frente B e a publicação continuam no fim da frente, com as pendências da 2F).

- [ ] **Step 5: O PR**

```bash
git fetch escale-crm --quiet && git rebase escale-crm/main
git push -u escale-crm feat/fase-8a-lista-de-campanhas
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-8a-lista-de-campanhas \
  --title "feat(escale): Fase 8A — lista de campanhas como na Clint (aba WhatsApp)" \
  --body "$(cat <<'EOF'
## O que entra
- Com a casca, `/app/campaigns` vira a lista da Clint: cabeçalho "WhatsApp" com "Enviar WhatsApp" e a engrenagem, abas WhatsApp e Prospecção (só admin; a Prospecção do original até a 8D).
- Barra de filtros (busca, data do agendamento, data de criação, Status, Número), "Resumo das campanhas" com os 5 cartões, tabela com a barra de resultado segmentada, o selo de status, Pausar/Retomar na linha e o ⋮ por status.
- Motor: `scheduled → draft` na máquina; alterar horário, voltar a rascunho e excluir rascunho (rotas do fork, auditadas).
- Migration 9301: `campaigns` no tempo real e as funções invoker da lista e do resumo (só gerente).
- Campanhas some do menu da casca abaixo de gerente; `/app/prospecting` com a casca abre a aba de Campanhas.

## Diferenças declaradas
- "Conta" e "Dispositivos" da Clint viram "Número" (escolha única, o número principal).
- Datas e números no formato brasileiro; a base dos percentuais é "adicionados para envio" (escrita na dica).
- Provisórios por falta de print: linha em andamento/pausada, ⋮ de rascunho e agendada, "Alterar horário do disparo" (seletor da casca, nunca o nativo), vazio por filtro, dicas dos segmentos.
- A engrenagem abre a configuração do original (pergunta ao usuário).

## Verificação
- Testes da fase, typecheck, eslint e as cercas da casca.
- `test:db` (inclui `tests/invariants/escale-lista-de-campanhas-9301.test.ts`), `test:db:update`, rodada cheia, revisor e conferência visual: na bateria do fim da Frente B.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --repo rgisjr/escale-crm --merge --delete-branch=false
```

Expected: o PR mergeado na `main` do `rgisjr/escale-crm`. **Nada de tag, release nem VPS** (fim da Frente B).

## Fase 8A — lista de campanhas como na Clint

Linha da seção 8 do PRD depois desta fase: `| 8A | **Lista como na Clint:** A1–A14 | … | executada (PR #<n>); testes e publicação no fim da Frente B |`.

## Verificação

1. **Por task:** os testes que a task cria, os guardas dos arquivos tocados, typecheck e eslint (G1).
2. **Bateria única da Frente B (depois da última fase da frente):** `test:db` (inclui `tests/invariants/escale-lista-de-campanhas-9301.test.ts` e as pendências da 2F), `test:db:update`, rodada cheia em segundo plano, um revisor (Opus 5.5, high) e a conferência visual lado a lado com 002–008 e 014, com a lista escrita das diferenças. Antes de publicar: abrir `/app/campaigns` com a casca e ler o console (telas novas sem provedor já derrubaram produção), e conferir no banco, só leitura, `select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'campaigns'`.

## Fora desta fase (registrado)

- O assistente de criação, o rascunho e a cópia no assistente, o nome " Cópia" e duplicar com funil/etapa/agente/números (8B).
- O detalhe em janela (Sumário e Detalhes), o diálogo de pausar e "Baixar .CSV" (8C).
- A aba Prospecção no molde da Clint (8D).
- A chave de permissão por pessoa (`CAMPAIGN_WHATSAPP_BULK`), com a trilha de grupos de permissão.
- O selo "Otimizado", SMS, SMS Flash e Voz (ignorados no PRD).
- A configuração com o visual da casca (pergunta ao usuário no topo).

## Self-review (19/10)

1. **Cobertura do PRD:** A1 → Task 7 (cabeçalho, botão com o ícone; sem "Otimizado"); A2 → Tasks 1, 7, 9 (abas WhatsApp/Prospecção, só admin, faixa some com uma aba); A3 → Tasks 1, 2, 7 (busca 500 ms, datas com o calendário da casca, Status múltiplo, Número único; sem Dispositivos); A4 → Tasks 1, 2, 3, 7 (5 cartões, sem rascunho e cancelada, régua na dica, números BR); A5 → Tasks 1, 8 (colunas e linha); A6 → Tasks 1, 6 (barra, dica, relógio, listras); A7 → Tasks 1, 6 (selo, cores, pulso); A8 → Task 8 (Pausar/Retomar na linha); A9 → Tasks 1, 4, 8 (menu por status e o motor); A10 → Tasks 1, 8 (rascunho abre o rascunho); A11 → Task 9 (10 por página, rodapé acima de 10); A12 → Tasks 8, 9 (carregando, vazio, vazio por filtro, erro); A13 → Tasks 2, 5 (tempo real e reconsulta); A14 → Task 7 (engrenagem). Seção 5 → Tasks 2, 3, 4, 9 (gerente nas rotas, nas funções e no menu; Prospecção para admin). Seção 6 → Tasks 1, 2. Seção 7 (as três ações) → Task 4.
2. **Placeholders:** nenhum "TBD"; os pontos "se o typecheck reclamar" dizem o que trocar e onde.
3. **Tipos entre tasks:** `FiltrosDeCampanhas`/`textoDosFiltros`/`filtrosDoTexto`/`compilarFiltros` (Task 1) são o que as rotas (3), o hook (5) e a barra (7) usam; `FiltroCompilado` (1) é o que a 9301 (2) lê e o `banco.ts` (3) manda; `LinhaDeCampanha`/`PaginaDeCampanhas`/`ResumoDasCampanhas` (1) saem do `banco.ts` (3) e entram no hook (5) e nas telas (6–9); `PedidoDeAcao` (5) bate com o menu (8) e a janela (8); `AcaoDaLinha`/`AcaoConfirmavel` (1) são as do menu (8); `AbaDasCampanhas`/`abaDaUrl` (1) são as da página (9).
