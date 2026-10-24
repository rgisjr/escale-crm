# Fase 8D — Prospecção na aba de Campanhas · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** E1 a E4 de `docs/modulos/8-campanhas.md` (seção 4, tabela E), a seção 5 (Prospecção e chave da Apify só para admin), a seção 7 ("Prospecção (8D): sem tabela nova prevista; a tela muda, o motor fica") e a decisão 8 (o motor e as travas da Prospecção ficam).
> **Frente B**, worktree `wt-frente-b`, **sem migration**, um PR. **Começa depois do merge da 8C**: usa as peças de molde que a 8B e a 8C criam (contrato combinado com as sessões que escrevem esses planos, 19/10; ver "Contrato do molde").

## Decisões do usuário (19/10)

| # | Pergunta | Decisão | Onde vale |
|---|---|---|---|
| R1 | PRD 8 | Aprovado | tudo |
| R5 | Frente | Frente B, faixa 9300–9399 (a 8D não usa nenhuma) | D1 |
| R7 / decisão 15 | Molde da Prospecção | O da seção 4-E: lista como a A5, assistente em 4 passos como a B1, detalhe como a C1 | D3–D10 |
| Decisão 8 | Motor | Fica: só admin, só número que aceita texto livre, uma campanha rodando por organização, uma empresa por vez, até 50 por dia | D2 |
| Regra de 17/10 | Formatos | Datas dd/mm/aaaa hh:mm, números 1.234, US$ 0,45 | D6, D9 |
| 19/10 (plano) | A Prospecção replica a campanha de WhatsApp? | **Não.** "A prospecção não tem que ser uma réplica da campanha de WhatsApp; adapte conforme achar melhor." O molde (lista, assistente, detalhe e as peças da casca) fica; textos, passos e campos seguem o que faz sentido para a Prospecção | D3–D10, A1–A4 |

**A Clint não tem Prospecção.** Não existe print para copiar: a aba usa as peças das telas de WhatsApp (lista 09-002, assistente 09-018/09-038/09-044, detalhe 09-009/09-012) para não destoar do resto, adaptadas ao que a Prospecção é (decisão de 19/10 acima).

**Adaptações decididas pelo agente** (o usuário delegou em 19/10):
- **A1 — Nome do passo 3:** **"Configure a abordagem"**, não "Configurações opcionais": ali funil, etapas, oferta, critério e ritmo são obrigatórios no motor.
- **A2 — "Configurar por conversa":** entra no passo 3 com a tela do original (`ProspectingAgentBuilder`); refazer com o visual da casca fica para depois.
- **A3 — "Data de início":** a **primeira abordagem** (`min(attempted_at)` das empresas), "—" antes dela; o motor não guarda quando a campanha começou.
- **A4 — Rascunho reaberto:** volta ao passo 1 com o nome e a busca; número, agente e abordagem são escolhidos de novo (o motor só grava a busca e a seleção antes de iniciar; guardar o resto exigiria migration, sem ganho que pague isso agora).

**Goal:** Com a casca ligada, a aba **Prospecção** de `/app/campaigns?aba=prospeccao` deixa de mostrar a tela do original e vira o molde da Clint: lista de prospecções com busca, status, barra de resultado (Encontradas → Abordadas → Responderam → Qualificadas), Pausar/Retomar na linha e ⋮ (Continuar rascunho, Duplicar); "Nova prospecção" abre um assistente em 4 passos (Configure, Encontre empresas, Configure a abordagem, Confirme e inicie); clicar numa prospecção abre a janela de detalhe com Sumário (cartões, funil, busca e custo, abordagem e ritmo editável) e Detalhes (tabela por empresa com progresso, link para a conversa, marcar/desmarcar e excluir desmarcadas); a chave da Apify mora na engrenagem do cabeçalho.

**Architecture:**
- **O motor não muda.** Toda escrita continua indo para `POST /api/v1/prospecting` (configure, search, start, pause, resume, adjust_pace, select, select_in_queue, discard_unselected), com as travas e a auditoria de hoje. Nenhum arquivo do original é alterado; o assistente reaproveita o `ProspectingAgentBuilder` do original importando-o.
- **Três rotas de leitura do fork** (admin, sessão): `GET /api/v1/prospeccao-da-casca` (a página da lista: filtro, contagens por campanha e total, numa consulta), `GET /api/v1/prospeccao-da-casca/[id]` (o detalhe com as empresas e o progresso de cada uma) e `GET /api/v1/prospeccao-da-casca/opcoes` (chave configurada, agentes, números que aceitam texto livre e etapas). As tabelas da prospecção são só do servidor (sem RLS para `authenticated`), então as rotas leem pelo `getRequestPool()`, como o GET do original, sempre com `organization_id` da sessão.
- **A régua de progresso** de uma empresa é a do GET do original (qualificado pela etapa do negócio, respondeu pela conversa, senão o status do motor), escrita uma vez em `lib/escale/prospeccao/banco.ts`.
- **As telas** moram em `components/escale/prospeccao/` e usam as peças da 8A (`DicaAoPassar`, cores e tons, `PaginacaoDaCasca`, `SeletorDoFiltro`), da 8B (molde do assistente, seletor de número, cartão de escolha, campo com contador, resumo do envio) e da 8C (janela de detalhe, cartão do sumário, funil, seção do sumário).
- **Sem tempo real** (as tabelas não estão na publicação): reconsulta de 10 s enquanto alguma prospecção busca ou aborda, e de 5 s no detalhe enquanto a busca roda (o original reconsulta a cada 10 s).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Vitest + Testing Library + user-event, Tailwind 4 com os tokens da casca, Radix DropdownMenu/Dialog, pg (pool do servidor), zod, sonner.

## Contrato do molde (combinado em 19/10 com as sessões da 8B e da 8C)

A 8D **consome**, não cria. A Task 1 confere que existem na `main`; se faltar alguma ou a prop for outra, PARE e ajuste os usos desta fase à peça real antes de seguir (os nomes abaixo foram confirmados pelas duas sessões, que avisam se mudarem).

Todas em `components/escale/campanhas/molde/` (8C fechada em 19/10: plano `2026-10-19-fase-8c-detalhe-da-campanha.md`, Task 7 com o código do molde; a migration dela é a 9310 e a 8B usa 9302–9309 — a 8D não usa nenhuma):

| Peça | Fase | Props |
|---|---|---|
| `TrilhaDoAssistente` | 8B | `{ itens: ReadonlyArray<{ rotulo: string; href?: string }> }` (o último sem `href`, em negrito, separador "›") |
| `BarraDePassos` | 8B | `{ passos: readonly string[]; atual: number }` (0-based) |
| `RodapeDoAssistente` | 8B | `{ aoVoltar?: () => void; rotuloVoltar?: string; extras?: ReactNode; principal: { rotulo: string; aoClicar: () => void; carregando?: boolean; desabilitado?: boolean; icone?: ReactNode } }` |
| `MoldeDoAssistente` | 8B | `{ trilha: ReactNode; passos: readonly string[]; atual: number; rodape: ReactNode; children: ReactNode; lateral?: ReactNode }` |
| `SeletorDeNumero` | 8B | `{ numeros: ReadonlyArray<{ id: string; nome: string; telefone: string \| null; conectado: boolean; grupo: string; avatarUrl?: string \| null; setor?: string \| null }>; valor: string \| null; aoMudar: (id: string) => void; placeholder?: string }` |
| `CartaoDeEscolha` | 8B | `{ selecionado: boolean; aoEscolher: () => void; titulo: string; descricao: string; icone?: ReactNode }` (`role="radio"`; o chamador põe `role="radiogroup"`) |
| `CampoComContador` | 8B | `{ rotulo: string; valor: string; aoMudar: (v: string) => void; maximo: number; placeholder?: string; erro?: string \| null; id?: string }` |
| `ResumoDoEnvio` | 8B | `{ linhas: ReadonlyArray<{ icone: ReactNode; rotulo: string; valor: ReactNode }>; rodape?: ReactNode }` |
| `JanelaDoDetalhe` | 8C | `{ aberta: boolean; aoFechar: () => void; rotulo: string; titulo: string; acoes?: ReactNode; abas: { valor: string; rotulo: string }[]; abaAtiva: string; aoTrocarAba: (valor: string) => void; children: ReactNode }` |
| `CartaoDoSumario` | 8C | `{ rotulo: string; dica?: string; subtitulo?: string; valor?: string; complemento?: string; tamanho?: "md" \| "lg"; aoClicar?: () => void; carregando?: boolean; children?: ReactNode }` — `complemento` é **só o número** ("26"); o componente põe o "·" |
| `FunilDeConversao` | 8C | `{ etapas: { chave: string; rotulo: string; quantidade: number; porcento: number \| null }[]; titulo?: string; legenda?: string }` |
| `SecaoDoSumario` | 8C | `{ titulo: string; ajuda?: string; selo?: ReactNode; legenda?: string; direita?: ReactNode; tituloGrande?: boolean; children: ReactNode }` |

Da 8A (já na `main`): `DicaAoPassar`, `CabecalhoDasCampanhas`, `CampanhasDaCasca`, `lib/escale/campanhas/apresentacao.ts` (`TomDoStatus`, `Traduzir`, `numeroBr`, `porcento`, `dataEHoraBr`, `ChaveDoSegmento`), `lib/escale/campanhas/cores.ts` (`CLASSE_DO_TOM`, `CLASSE_DO_SEGMENTO`, `TOM_DA_DICA_DO_SEGMENTO`, `CLASSE_DO_TRILHO`), `lib/escale/campanhas/rotas.ts` (`rotaDaAba`), `lib/escale/campanhas/filtros.ts` (`ESPERA_DA_BUSCA_MS`).

## Referência visual (abrir a imagem antes de cada task de tela)

Caminhos sem crase (cerca `evidencia-citada`). Todos em 1:1 (1536×735, px de CSS). O menu lateral dos prints **não** vale (a casca é a do menu superior).

| # | Arquivo | O que define na 8D | Task |
|---|---|---|---|
| 002 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-002-lista-whatsapp.png | tabela, linha, barra de resultado, selo, ⋮, paginação, barra de filtros | 4, 7 |
| 007 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-007-menu-da-campanha-completa.png | o ⋮ aberto | 4 |
| 014 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-014-sms-vazio.png | os vazios | 4 |
| 009 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-009-detalhe-sumario.png | a janela, os cartões, o funil | 5 |
| 012 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-012-detalhe-detalhes.png | a aba Detalhes: busca, filtros, contagem, tabela, rodapé "1 a 20 de N" | 6 |
| 018 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-018-nova-campanha-passo-1.png | trilha, barra de passos, título e subtítulo do passo, campos, cartões de escolha, rodapé | 8 |
| 019 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-019-passo-1-dispositivos.png | o seletor de número | 8 |
| 031 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-031-passo-2-selecionar-contatos.jpg | a lista com caixas, "Selecionar todos" e a linha (molde das empresas encontradas) | 8 |
| 038 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-038-passo-3-configuracoes-opcionais.jpg | o passo 3: título, blocos com rótulo à esquerda e campo à direita | 9 |
| 044 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-044-passo-4-confirme-seu-envio.jpg | o passo 4: resumo com ícones, faixa de custo, aviso com borda da marca, "Salvar como rascunho" e o botão principal com ícone | 9 |

### Medidas tiradas dos prints (px de CSS)

| Peça | Medida |
|---|---|
| Linha da tabela (002) | 54px; quadrado 34px canto 8px `casca-marca-suave` com o ícone 16px `casca-marca` (aqui `Building2`); nome 13px/500 `casca-texto`, máx. 200px com reticências; embaixo 11px `casca-meta`; células 11px `casca-texto` |
| Colunas (002, adaptado) | Prospecção 28%, Data de início 14%, Número 18%, Resultado 22%, Status 12%, ações 6%; cabeçalho 42px, 10px/600 caixa alta, espaçamento 0.1em |
| Botão da linha (002, provisório da 8A) | 28px; Pausar contornado com `CirclePause` 16px; Retomar cheio na cor da marca com `Play` 14px |
| Barra de filtros (002) | 16px abaixo das abas, `px-6`; busca 220px (mín. 180, máx. 280) 32px `casca-busca` com `Search` 16px à direita; Status 160px |
| Passo do assistente (018) | coluna de conteúdo de 640px centrada (sem a prévia do celular: a Prospecção não tem mensagem fixa, quem escreve é o agente); título 18px/600 `casca-texto`; subtítulo 12px `casca-suave` a 4px; rótulo 13px/500 a 20px do campo anterior; campo 32px `casca-busca` canto 4px |
| Resumo do passo 4 (044) | o `ResumoDoEnvio` da 8B; aviso abaixo a 16px: fundo `casca-marca-suave`, borda esquerda 2px `casca-marca`, `p-4`, 12px |
| Janela de detalhe (009, 012) | a `JanelaDoDetalhe` da 8C; Sumário em duas colunas (`minmax(0,1fr)` e 340px) com 16px entre elas; cartões em 4 colunas com 12px; Detalhes com busca 240px, filtro 160px, contagem 12px `casca-suave` à direita, linhas de 46px |

### Textos usados nesta fase

- **Da Clint (molde):** "Voltar", "Próximo", "Salvar como rascunho", "Mais opções", "Sumário", "Detalhes", "Tente ajustar a busca ou os filtros aplicados.", "Limpar filtros", "Tentar novamente".
- **Do original (já traduzidos no dicionário):** "Prospecção", "Chave da Apify", "Salvar chave", "Chave de busca salva.", "A chave fica cifrada no servidor. Cada busca tem seu próprio limite de gasto.", "Público ou segmento", "Ex.: clínicas de estética", "Cidade ou região", "Ex.: São Paulo, SP", "Até quantas empresas", "Teto da busca (US$)", "Enriquecer com e-mails comerciais e redes encontradas no site", "Buscar empresas", "Solicitação registrada. Acompanhe o estado da busca nesta tela.", "Configurar por conversa", "Agente de IA", "Escolha um agente publicado", "Configurações avançadas do agente", "Ver conexões e proteções de envio", "Funil", "Escolha o funil", "Etapa inicial", "Etapa de qualificados", "Escolha a etapa", "O que a IA deve oferecer e como iniciar", "Descreva sua oferta e o objetivo da primeira conversa.", "Este texto se soma ao prompt do agente…", "Quando considerar o cliente qualificado", "Ex.: confirmou a necessidade…", "Máximo em 24 horas", "Intervalo mínimo (minutos)", "Quando a empresa entra no funil", "Só quando for abordada (recomendado)", "O funil mostra só quem já recebeu a primeira mensagem.", "Todas ao iniciar", "Contato, negócio e conversa de toda a fila são criados na hora de iniciar.", "Referência da avaliação de legítimo interesse", "Informe a referência real da avaliação…", os dois "Ao iniciar, …", "Campanha iniciada. A primeira abordagem será preparada após um minuto.", "Novas abordagens pausadas.", "Editar ritmo", "Salvar ritmo", "Cancelar", "Ritmo atualizado. A campanha continua pausada.", "Encontrados", "Responderam", "Encontrado", "Na fila", "Preparando abordagem", "Abordado", "Não abordado", "Revisar falha", "Respondeu", "Qualificado", "Marcar todas", "Desmarcar todas", "Mostrar desmarcadas", "Esconder desmarcadas", "Excluir desmarcadas", "Empresas desmarcadas excluídas.", "Seleção da fila atualizada.", "Somente as empresas marcadas entram na fila ao iniciar as abordagens.", "Com a campanha pausada, marque ou desmarque…", "Marcar empresa para abordagem", "Empresa", "Informações", "Progresso", "Conversa", "Sem telefone", "Site da empresa", "avaliações", "A IA usa o agente escolhido para abrir a conversa…", "Agente publicado e selecionado.", "Não foi possível concluir a operação.", "Abordar", "Endereço", "Base legal", "Campanhas".
- **Nossos (novos, no bloco de espanhol da Task 10):** os rótulos e dicas das situações, os textos dos segmentos e do funil, os vazios, os textos do assistente e do detalhe listados no bloco.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| D1 | **Branch `feat/fase-8d-prospeccao-na-aba`** de `escale-crm/main` (com a 8A, a 8B e a 8C mergeadas) na worktree `wt-frente-b`; **sem migration** (nenhum número da faixa 9300–9399); um PR, mergeado ao terminar; tag/release/VPS só no fim da Frente B | regra de 18/10; PRD seção 7 |
| D2 | **O motor e as rotas do original não mudam.** As telas novas escrevem só por `POST /api/v1/prospecting`; o original (`/app/prospecting` sem a casca, `ProspectingClient`) continua igual para quem não liga a casca | PRD decisão 8; regra 4 do roteiro |
| D3 | **Situação na tela** (a coluna Status), derivada de `status` + `search_status`: busca `starting`/`running` → **Buscando empresas** (ciano, pulsa); rascunho com busca `failed`/`unknown` → **Erro na busca** (vermelho); `draft` → **Rascunho** (cinza); `running` → **Em progresso** (azul, pulsa); `paused` → **Pausada** (laranja); `completed` → **Completo** (verde). Rótulos e tons das campanhas de WhatsApp (8A, N5) onde o estado tem par; "Buscando empresas" e "Erro na busca" são nossos | PRD E1 |
| D4 | **Contagens por empresa**, com a régua do GET do original: progresso `qualified` (negócio na etapa de qualificados), `replied` (a conversa recebeu resposta), senão o status do motor. **Encontradas** = todas; **Abordadas** = `sent`/`replied`/`qualified`; **Responderam** = `replied`/`qualified`; **Qualificadas** = `qualified`; **Na fila** = `queued`/`sending`; **Com falha** = `failed`; **Não abordadas** = `skipped` | PRD E1, E3 |
| D5 | **Barra de resultado** (molde 002): base = encontradas; segmentos falhas (vermelho), abordadas − responderam (cor "entregues"), responderam − qualificadas (cor "lidos"), qualificadas (cor "enviados", a mais escura); a dica diz o acumulado: "{n} abordadas - {p}%". Sem encontradas: "—". Em progresso: as listras da 8A | PRD E1 |
| D6 | **Colunas:** Prospecção (nome; embaixo "{n} empresas encontradas" ou "Buscando empresas"), **Data de início** (primeira abordagem, A3), Número (o da configuração; "—" antes de iniciar), Resultado, Status, ⋮. Ordem: mais recentes primeiro. 10 por página com as opções da 2A; rodapé só acima de 10 | PRD E1; 002 |
| D7 | **Filtros da lista:** busca no nome (espera de 500 ms, `ilike` com `%`, `_` e `\` escapados) e Status (várias escolhas, as 6 situações em ordem alfabética do rótulo). Sem filtros de data e de número: a Prospecção tem uma campanha rodando por vez e poucas no total (YAGNI) | PRD E1 |
| D8 | **Linha e ⋮:** Pausar na linha em "Em progresso", Retomar em "Pausada" (os do original: `pause`, `resume`; a recusa do servidor, como "Pause a outra campanha antes de retomar.", vira aviso). ⋮: Rascunho → "Continuar rascunho" e "Duplicar prospecção"; os outros → "Duplicar prospecção". Clicar na linha: Rascunho reabre o assistente; os outros abrem a janela de detalhe. **Duplicar** abre o assistente preenchido (nome + " Cópia", busca, número, agente e abordagem) e só cria a campanha quando a pessoa buscar de novo: o motor não copia busca (cada busca cobra da Apify) | PRD E1 |
| D9 | **Assistente** em `/app/campaigns/prospeccao/nova` (`?id=` continua um rascunho, `?copiar=` duplica), no molde da 8B. Passos: **1. Configure a sua prospecção** (nome 3–80 com contador, número não oficial e conectado, agente: "Configurar por conversa" ou "Usar agente existente" com a escolha do agente); **2. Encontre empresas** (público, região, até quantas, teto em US$, enriquecer; "Buscar empresas" cria a campanha no motor; enquanto busca, o aviso; depois, a lista com caixas como o 031, "Selecionar todas" e a contagem de marcadas); **3. Configure a abordagem** (A1, A2: por conversa → o construtor do original, que precisa da campanha criada; existente → funil, etapas, o que oferecer, critério; nos dois: ritmo e quando entra no funil); **4. Confirme e inicie** (resumo, custo da busca em US$, base legal obrigatória, o aviso do original, "Salvar como rascunho" e "Iniciar prospecção"). "Próximo" valida o passo e lista os erros no topo; o motor valida de novo ao iniciar | PRD E2 |
| D10 | **Janela de detalhe** (molde 009/012, peças da 8C): rótulo "INFORMAÇÕES DA PROSPECÇÃO", o nome, Pausar/Retomar nas ações; **Sumário**: cartões Encontradas, Abordadas, Responderam, Qualificadas (percentual sobre encontradas), funil "% sobre encontradas", seção "Fila" (na fila, não abordadas, com falha), seção "Busca" (público, região, limite, teto, **custo em US$ no formato brasileiro**, repetidas desconsideradas, o erro da busca) e, na coluna direita, "Abordagem" (número, agente com o link de configurações avançadas, funil e etapas, entrada no funil, base legal e o **ritmo**, editável com a campanha pausada, `adjust_pace`); **Detalhes**: busca por nome ou telefone, filtro de Progresso, "{n} empresas", tabela Empresa/Telefone/Informações/Progresso/Conversa ("Abrir conversa" → `/app/inbox?id=`), 20 por página, e — em rascunho ou pausada — as caixas, "Marcar todas", "Desmarcar todas", "Mostrar/Esconder desmarcadas" e "Excluir desmarcadas" com confirmação (as regras do original). Sem "Baixar .CSV" (o motor não exporta prospecção; fora da fase) | PRD E3 |
| D11 | **Chave da Apify** (E4): engrenagem no cabeçalho da aba e o botão do vazio "Configure a chave de busca" abrem a `JanelaDeConfirmacao` da casca com o campo da chave (`configure` do original). Sem a chave, a aba mostra só esse vazio | PRD E4 |
| D12 | **Encaixe:** `CabecalhoDasCampanhas` ganha a prop `acoes?: ReactNode`, mostrada nas abas que não são WhatsApp; `CampanhasDaCasca` troca o `ProspectingClient` por `ListaDeProspeccoes` e passa as ações da Prospecção (engrenagem e "Nova prospecção"). A página do assistente confere admin e a casca (sem a casca, vai para `/app/prospecting`) | PRD seção 5; 8A N2 |
| D13 | **Permissão:** as três rotas novas exigem `admin` (`requireRole("admin", …)`), como o GET do original; a aba já só aparece para admin (8A) | PRD seção 5 |
| D14 | **Verificação enxuta**: por task só o que a task cria, typecheck e eslint dos arquivos alterados; rodada cheia, revisor (Opus 5.5) e conferência visual na bateria única do fim da Frente B. Esta fase não tem `test:db` próprio (sem migration) | regra de 18/10 |

## Global Constraints

### Repositório, worktree e Git

- Worktree: `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-b`. **Base:** `escale-crm/main` com a 8A, a 8B e a 8C mergeadas (a Task 1 prova).
- **Branch:** `feat/fase-8d-prospeccao-na-aba` (`git switch -c feat/fase-8d-prospeccao-na-aba escale-crm/main`).
- **Sem migration.** Se alguma task parecer precisar de uma, PARE e pergunte.
- **PR** para `rgisjr/escale-crm`, base `main`, mergeado ao terminar. **Proibido:** push em `origin` (Rafael), tag, release, VPS e gravar no banco de produção.
- Conflitos prováveis com outras frentes: `lib/i18n/dicionario.ts` (manter os dois blocos, o que já está na `main` primeiro).

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`; `export NODE_OPTIONS=--max-old-space-size=6144` para o typecheck.

### Onde o fork entra

Nenhum arquivo do original muda. Do fork que mudam: `components/escale/campanhas/CabecalhoDasCampanhas.tsx` e `components/escale/campanhas/CampanhasDaCasca.tsx` (8A), e o teste `tests/unit/escale-campanhas-topo.test.tsx` (8A). **Leia cada um antes de editar**: a 8B e a 8C podem tê-los tocado; troque só os trechos indicados.

### Cercas que precisam ficar verdes

`i18n-espanhol-cobre-a-tela`, `controle-decorativo` (nenhum `disabled={!callback}`, nenhum botão sem `onClick`), `tailwind-tokens` (só tokens da casca, nenhuma cor crua), `escale-casca-tokens`, `escale-casca-v2-original-intacto`, `evidencia-citada`, `vocabulario-do-funil` (nada de "pipeline" ou "kanban" em texto de tela).

### Verificação (D14)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os achados com `corepack pnpm vitest run <arquivos>`. O prettier só nos arquivos NOVOS.
2. **Rodada cheia, revisor (Opus 5.5, high) e conferência visual:** na bateria única do fim da Frente B.
3. **Comandos longos sempre em segundo plano.**

### Commits e PR

- Commits no formato `feat(escale): … (Fase 8D)` terminados com `Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>`; o PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório na Task 1.
- Todo texto de tela por `t()` com literal (ou tabela de rótulos do módulo, traduzida na hora de mostrar). Datas, números e dinheiro no formato brasileiro.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/escale/prospeccao/tipos.ts` | novo | as formas da lista, do detalhe e das opções |
| `lib/escale/prospeccao/apresentacao.ts` | novo | situação, progresso, barra, funil, percentuais, custo, textos |
| `lib/escale/prospeccao/filtros.ts` | novo | filtros da lista: vazio, texto da URL, padrão do `ilike`, situações |
| `lib/escale/prospeccao/selecao.ts` | novo | quem pode ser marcado, quem pode ser excluído, o filtro da aba Detalhes |
| `lib/escale/prospeccao/assistente.ts` | novo | o rascunho do assistente, validação por passo, o que vai ao motor, continuar e duplicar |
| `lib/escale/prospeccao/rotas.ts` | novo | os destinos do assistente e da conversa |
| `tests/helpers/prospeccao-fixtures.ts` | novo | as linhas, o detalhe e as opções de exemplo |
| `tests/unit/escale-prospeccao-regras.test.ts` | novo | as regras puras |
| `lib/escale/prospeccao/banco.ts` | novo | as consultas e o mapeamento |
| `app/api/v1/prospeccao-da-casca/route.ts`, `[id]/route.ts`, `opcoes/route.ts` | novos | as três leituras |
| `tests/unit/escale-prospeccao-rotas.test.ts` | novo | as rotas |
| `hooks/escale/useProspeccaoDaCasca.ts` | novo | lista, detalhe, opções e a ação |
| `tests/unit/escale-prospeccao-hooks.test.tsx` | novo | os hooks |
| `components/escale/prospeccao/campos.tsx` | novo | campo, campo longo, erros do passo |
| `components/escale/prospeccao/SeloDaProspeccao.tsx`, `BarraDaProspeccao.tsx`, `MenuDaProspeccao.tsx`, `TabelaDeProspeccoes.tsx`, `BarraDeFiltrosDaProspeccao.tsx`, `BotaoDaChave.tsx`, `VaziosDaProspeccao.tsx` | novos | as peças da lista |
| `tests/unit/escale-prospeccao-pecas.test.tsx` | novo | as peças |
| `components/escale/prospeccao/detalhe/DetalheDaProspeccao.tsx`, `SumarioDaProspeccao.tsx`, `RitmoDaProspeccao.tsx` | novos | a janela e o Sumário |
| `tests/unit/escale-prospeccao-sumario.test.tsx` | novo | a janela e o Sumário |
| `components/escale/prospeccao/detalhe/EmpresasDaProspeccao.tsx` | novo | a aba Detalhes |
| `tests/unit/escale-prospeccao-empresas.test.tsx` | novo | a aba Detalhes |
| `components/escale/prospeccao/ListaDeProspeccoes.tsx`, `AcoesDaProspeccao.tsx` | novos | a aba e as ações do cabeçalho |
| `components/escale/campanhas/CabecalhoDasCampanhas.tsx`, `CampanhasDaCasca.tsx`, `tests/unit/escale-campanhas-topo.test.tsx` | alterados | o encaixe |
| `tests/unit/escale-prospeccao-aba.test.tsx` | novo | a aba |
| `components/escale/prospeccao/assistente/AssistenteDeProspeccao.tsx`, `PassoConfigure.tsx`, `PassoEncontre.tsx`, `EmpresasEncontradas.tsx`, `PassoAbordagem.tsx`, `PassoConfirme.tsx` | novos | o assistente |
| `app/app/campaigns/prospeccao/nova/page.tsx` | novo | a página do assistente |
| `tests/unit/escale-prospeccao-assistente.test.tsx`, `tests/unit/escale-prospeccao-assistente-final.test.tsx` | novos | o assistente |
| `lib/i18n/dicionario.ts` | alterado | o espanhol |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md`, `LOG.md` | alterados (fora do repositório) | a linha da 8D; o log |

---

### Task 1: Branch, base e as regras puras

**Files:**
- Create: `lib/escale/prospeccao/tipos.ts`, `lib/escale/prospeccao/apresentacao.ts`, `lib/escale/prospeccao/filtros.ts`, `lib/escale/prospeccao/selecao.ts`, `lib/escale/prospeccao/assistente.ts`, `lib/escale/prospeccao/rotas.ts`, `tests/helpers/prospeccao-fixtures.ts`, `tests/unit/escale-prospeccao-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/`

**Interfaces:**
- Consumes: `TomDoStatus`, `Traduzir`, `numeroBr`, `porcento`, `ChaveDoSegmento` (`lib/escale/campanhas/apresentacao.ts`, 8A); `CampaignConfig`, `SearchInput`, `Prospect`, `RAZAO_NAO_SELECIONADA` (`lib/prospecting/schema.ts`, original).
- Produces:
  - `tipos.ts`: `SITUACOES_DA_PROSPECCAO`, `SituacaoDaProspeccao`, `PROGRESSOS_DA_EMPRESA`, `ProgressoDaEmpresa`, `ContagemDaProspeccao`, `LinhaDeProspeccao`, `PaginaDeProspeccoes`, `EmpresaDaProspeccao`, `StatusDoMotor`, `DetalheDaProspeccao`, `OpcoesDaProspeccao`, `FiltrosDaProspeccao`.
  - `apresentacao.ts`: `ROTULO_DA_SITUACAO`, `DICA_DA_SITUACAO`, `TOM_DA_SITUACAO`, `SITUACOES_QUE_PULSAM`, `ROTULO_DO_PROGRESSO`, `TOM_DO_PROGRESSO`, `ChaveDaProspeccao`, `SegmentoDaProspeccao`, `COR_DO_SEGMENTO_DA_PROSPECCAO`, `segmentosDaProspeccao(c)`, `textoDoSegmentoDaProspeccao(s, t)`, `etapasDoFunil(c, t)`, `textoDoPorcento(parte, base)`, `custoEmDolar(v)`, `subtituloDaProspeccao(l, t)`, `textoDasEmpresas(n, t)`, `textoDoRitmo(diario, intervalo, t)`.
  - `filtros.ts`: `FILTROS_DA_PROSPECCAO_VAZIOS`, `temFiltroDaProspeccao(f)`, `consultaDaLista(f, pagina, porPagina)`, `padraoDaBusca(busca)`, `situacoesDoTexto(texto)`.
  - `selecao.ts`: `podeSelecionar(d)`, `acaoDaSelecao(d)`, `marcavel(e, d)`, `descartaveis(empresas)`, `contarMarcadas(empresas)`, `FiltroDasEmpresas`, `filtrarEmpresas(empresas, f)`.
  - `assistente.ts`: `PASSOS_DA_PROSPECCAO`, `PassoDaProspeccao`, `ModoDoAgente`, `RascunhoDaProspeccao`, `RASCUNHO_VAZIO`, `NOME_MIN`, `NOME_MAX`, `inteiroDoTexto(v)`, `decimalDoTexto(v)`, `ContextoDoPasso`, `errosDoPasso(passo, r, ctx)`, `errosDaBusca(r)`, `buscaDoRascunho(r)`, `impressaoDaBusca(r)`, `configDoRascunho(r)`, `rascunhoDaCampanha(d)`, `rascunhoDaCopia(d, sufixo)`, `passoDaCampanha(d)`, `InicioDoAssistente`, `inicioDoAssistente(d, modo, sufixo)`, `SetupDoAgente`, `aplicarAgenteCriado(agenteId, setup)`, `canaisDoConstrutor(o)`, `etapasDoConstrutor(o)`, `numerosDoSeletor(o, grupo)`, `funisDasEtapas(o)`.
  - `rotas.ts`: `ROTA_DA_NOVA_PROSPECCAO`, `rotaDoRascunhoDaProspeccao(id)`, `rotaDaCopiaDaProspeccao(id)`, `rotaDaConversa(id)`, `rotaDoAgente(id)`.
  - `tests/helpers/prospeccao-fixtures.ts`: `ORG`, `ID`, `NUMERO`, `AGENTE`, `FUNIL`, `ETAPA_ENTRADA`, `ETAPA_QUALIFICADOS`, `BUSCA`, `CONFIG`, `contagem(o)`, `linha(o)`, `empresa(o)`, `detalhe(o)`, `OPCOES`.

- [ ] **Step 1: A base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain            # Expected: vazio
git fetch escale-crm --quiet
git switch -c feat/fase-8d-prospeccao-na-aba escale-crm/main
for f in TrilhaDoAssistente BarraDePassos RodapeDoAssistente MoldeDoAssistente SeletorDeNumero CartaoDeEscolha CampoComContador ResumoDoEnvio JanelaDoDetalhe CartaoDoSumario FunilDeConversao SecaoDoSumario; do git cat-file -e HEAD:components/escale/campanhas/molde/$f.tsx && echo "ok $f" || echo "FALTA $f"; done
for f in components/escale/campanhas/DicaAoPassar.tsx components/escale/campanhas/CabecalhoDasCampanhas.tsx components/escale/campanhas/CampanhasDaCasca.tsx lib/escale/campanhas/apresentacao.ts lib/escale/campanhas/cores.ts lib/escale/campanhas/rotas.ts lib/escale/campanhas/filtros.ts components/escale/conversas/filtros/SeletorDoFiltro.tsx components/escale/ui/PaginacaoDaCasca.tsx components/escale/ui/JanelaDeConfirmacao.tsx components/escale/ui/CaixaDaCasca.tsx components/escale/ui/SeletorDaCasca.tsx app/app/prospecting/_create-agent.tsx; do git cat-file -e HEAD:$f && echo "ok $f" || echo "FALTA $f"; done
grep -n "export function\|: {" components/escale/campanhas/molde/*.tsx | grep -E "function (Trilha|BarraDe|Rodape|Molde|SeletorDeNumero|CartaoDe|CampoCom|ResumoDo|JanelaDo|CartaoDo|FunilDe|SecaoDo)"
corepack pnpm install --frozen-lockfile
```

Expected: todas as linhas "ok". **Se aparecer "FALTA"** (a 8B ou a 8C ainda não mergeada, ou a peça com outro nome), PARE: esta fase começa depois do merge da 8C. Compare as props impressas pelo último `grep` com a tabela "Contrato do molde"; se alguma for diferente, ajuste os usos desta fase à peça real (sem mexer nela) e anote a diferença no PR.

- [ ] **Step 2: Copiar o plano**

```bash
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-19-fase-8d-prospeccao-na-aba.md" docs/superpowers/plans/
```

- [ ] **Step 3: `lib/escale/prospeccao/tipos.ts`**

```ts
import type { CampaignConfig, Prospect, SearchInput } from "@/lib/prospecting/schema";

/**
 * AS FORMAS DA PROSPECÇÃO NA CASCA (fork Escale, Fase 8D). O servidor
 * (`banco.ts`) monta, as rotas devolvem e as telas leem — um tipo só dos dois
 * lados. O motor é o do original (`lib/prospecting/`), que não muda.
 */

/** A situação mostrada na coluna Status (D3), derivada de `status` + `search_status`. */
export const SITUACOES_DA_PROSPECCAO = [
  "buscando",
  "erro_na_busca",
  "rascunho",
  "em_progresso",
  "pausada",
  "completa",
] as const;
export type SituacaoDaProspeccao = (typeof SITUACOES_DA_PROSPECCAO)[number];

/** O progresso de uma empresa: o status do motor, ou `replied`/`qualified` pela régua do original (D4). */
export const PROGRESSOS_DA_EMPRESA = [
  "new",
  "queued",
  "sending",
  "sent",
  "skipped",
  "failed",
  "replied",
  "qualified",
] as const;
export type ProgressoDaEmpresa = (typeof PROGRESSOS_DA_EMPRESA)[number];

export interface ContagemDaProspeccao {
  encontradas: number;
  naFila: number;
  /** Receberam a primeira mensagem (inclui quem respondeu e quem se qualificou). */
  abordadas: number;
  /** Responderam (inclui as qualificadas). */
  responderam: number;
  qualificadas: number;
  falhas: number;
  naoAbordadas: number;
}

export interface LinhaDeProspeccao extends ContagemDaProspeccao {
  id: string;
  nome: string;
  situacao: SituacaoDaProspeccao;
  /** O número da configuração; `null` antes de iniciar. */
  numeroId: string | null;
  criadaEm: string;
  /** A primeira abordagem (a "Data de início", A3). */
  primeiraAbordagem: string | null;
}

export interface PaginaDeProspeccoes {
  linhas: LinhaDeProspeccao[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface EmpresaDaProspeccao {
  id: string;
  dados: Prospect;
  /** O status do motor (`new`, `queued`, `sending`, `sent`, `skipped`, `failed`). */
  status: string;
  selecionada: boolean;
  erro: string | null;
  negocioId: string | null;
  conversaId: string | null;
  abordadaEm: string | null;
  statusDaMensagem: string | null;
  progresso: ProgressoDaEmpresa;
}

export type StatusDoMotor = "draft" | "running" | "paused" | "completed";

export interface DetalheDaProspeccao {
  linha: LinhaDeProspeccao;
  status: StatusDoMotor;
  statusDaBusca: string;
  busca: SearchInput;
  config: CampaignConfig | null;
  custoUsd: number | null;
  /** Resultados repetidos ou indisponíveis que a busca desconsiderou. */
  repetidas: number;
  erro: string | null;
  empresas: EmpresaDaProspeccao[];
}

export interface OpcoesDaProspeccao {
  configurada: boolean;
  agentes: { id: string; nome: string }[];
  /** Só os números que aceitam iniciar conversa com texto livre (não oficiais). */
  numeros: { id: string; nome: string; telefone: string | null; status: string }[];
  etapas: { id: string; nome: string; funilId: string; funilNome: string }[];
}

export interface FiltrosDaProspeccao {
  busca?: string;
  situacoes?: SituacaoDaProspeccao[];
}
```

- [ ] **Step 4: `lib/escale/prospeccao/apresentacao.ts`**

```ts
import {
  numeroBr,
  porcento,
  type ChaveDoSegmento,
  type TomDoStatus,
  type Traduzir,
} from "@/lib/escale/campanhas/apresentacao";

import type { ContagemDaProspeccao, LinhaDeProspeccao, ProgressoDaEmpresa, SituacaoDaProspeccao } from "./tipos";

/**
 * O QUE A PROSPECÇÃO MOSTRA (fork Escale, Fase 8D; D3–D6). Funções puras: o
 * servidor conta, aqui se decide rótulo, cor, barra, funil e texto. Os textos
 * passam por `t` (quem chama traduz).
 */

// ─── Situação (selo) ───────────────────────────────────────────────────────

export const ROTULO_DA_SITUACAO: Record<SituacaoDaProspeccao, string> = {
  buscando: "Buscando empresas",
  erro_na_busca: "Erro na busca",
  rascunho: "Rascunho",
  em_progresso: "Em progresso",
  pausada: "Pausada",
  completa: "Completo",
};

export const DICA_DA_SITUACAO: Record<SituacaoDaProspeccao, string> = {
  buscando: "Estamos buscando as empresas no Google Maps.",
  erro_na_busca: "A busca não terminou. Abra a prospecção para ver o motivo.",
  rascunho: "A busca terminou e a prospecção aguarda a configuração da abordagem.",
  em_progresso: "O agente está abordando as empresas aos poucos, no ritmo escolhido.",
  pausada: "Nenhuma empresa nova é abordada até você retomar.",
  completa: "Todas as empresas da fila foram abordadas.",
};

export const TOM_DA_SITUACAO: Record<SituacaoDaProspeccao, TomDoStatus> = {
  buscando: "ciano",
  erro_na_busca: "vermelho",
  rascunho: "cinza",
  em_progresso: "azul",
  pausada: "laranja",
  completa: "verde",
};

export const SITUACOES_QUE_PULSAM: ReadonlySet<SituacaoDaProspeccao> = new Set(["buscando", "em_progresso"]);

// ─── Progresso da empresa ──────────────────────────────────────────────────

/** Os rótulos do original (`app/app/prospecting/_client.tsx`, já traduzidos). */
export const ROTULO_DO_PROGRESSO: Record<ProgressoDaEmpresa, string> = {
  new: "Encontrado",
  queued: "Na fila",
  sending: "Preparando abordagem",
  sent: "Abordado",
  skipped: "Não abordado",
  failed: "Revisar falha",
  replied: "Respondeu",
  qualified: "Qualificado",
};

export const TOM_DO_PROGRESSO: Record<ProgressoDaEmpresa, TomDoStatus> = {
  new: "cinza",
  queued: "amarelo",
  sending: "ciano",
  sent: "azul",
  skipped: "granito",
  failed: "vermelho",
  replied: "verde",
  qualified: "verde",
};

// ─── Barra de resultado (D5) ───────────────────────────────────────────────

export type ChaveDaProspeccao = "falhas" | "abordadas" | "responderam" | "qualificadas";

export interface SegmentoDaProspeccao {
  chave: ChaveDaProspeccao;
  /** O acumulado que a dica mostra ("10 abordadas"). */
  quantidade: number;
  /** Largura em % das encontradas (segmentos disjuntos). */
  largura: number;
  /** Percentual inteiro do acumulado sobre as encontradas. */
  porcento: number;
}

/** As cores dos segmentos de WhatsApp (8A) que cada segmento da Prospecção usa. */
export const COR_DO_SEGMENTO_DA_PROSPECCAO: Record<ChaveDaProspeccao, ChaveDoSegmento> = {
  falhas: "erro",
  abordadas: "entregues",
  responderam: "lidos",
  qualificadas: "enviados",
};

export function segmentosDaProspeccao(c: ContagemDaProspeccao): SegmentoDaProspeccao[] {
  const base = c.encontradas;
  if (base <= 0) return [];
  const brutos: [ChaveDaProspeccao, number, number][] = [
    ["falhas", c.falhas, c.falhas],
    ["abordadas", Math.max(0, c.abordadas - c.responderam), c.abordadas],
    ["responderam", Math.max(0, c.responderam - c.qualificadas), c.responderam],
    ["qualificadas", c.qualificadas, c.qualificadas],
  ];
  return brutos
    .filter(([, faixa]) => faixa > 0)
    .map(([chave, faixa, quantidade]) => ({
      chave,
      quantidade,
      largura: (faixa / base) * 100,
      porcento: porcento(quantidade, base) ?? 0,
    }));
}

const TEXTO_DO_SEGMENTO: Record<ChaveDaProspeccao, string> = {
  falhas: "{n} com falha - {p}%",
  abordadas: "{n} abordadas - {p}%",
  responderam: "{n} responderam - {p}%",
  qualificadas: "{n} qualificadas - {p}%",
};

export function textoDoSegmentoDaProspeccao(s: SegmentoDaProspeccao, t: Traduzir): string {
  return t(TEXTO_DO_SEGMENTO[s.chave]).replace("{n}", numeroBr(s.quantidade)).replace("{p}", String(s.porcento));
}

// ─── Funil e cartões (D10) ─────────────────────────────────────────────────

export function etapasDoFunil(
  c: ContagemDaProspeccao,
  t: Traduzir,
): { chave: string; rotulo: string; quantidade: number; porcento: number | null }[] {
  const etapa = (chave: string, rotulo: string, quantidade: number) => ({
    chave,
    rotulo: t(rotulo),
    quantidade,
    porcento: porcento(quantidade, c.encontradas),
  });
  return [
    etapa("encontradas", "Encontradas", c.encontradas),
    etapa("abordadas", "Abordadas", c.abordadas),
    etapa("responderam", "Responderam", c.responderam),
    etapa("qualificadas", "Qualificadas", c.qualificadas),
  ];
}

/** "50%"; sem base, "—". */
export function textoDoPorcento(parte: number, base: number): string {
  const p = porcento(parte, base);
  return p === null ? "—" : `${p}%`;
}

/** "US$ 0,45"; sem custo, "—" (formato brasileiro, regra 5 do CLAUDE.md). */
export function custoEmDolar(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function textoDasEmpresas(n: number, t: Traduzir): string {
  return n === 1 ? t("1 empresa") : t("{n} empresas").replace("{n}", numeroBr(n));
}

/** O subtítulo da linha (D6). */
export function subtituloDaProspeccao(l: LinhaDeProspeccao, t: Traduzir): string {
  if (l.situacao === "buscando") return t("Buscando empresas");
  return l.encontradas === 1
    ? t("1 empresa encontrada")
    : t("{n} empresas encontradas").replace("{n}", numeroBr(l.encontradas));
}

export function textoDoRitmo(diario: number, intervalo: number, t: Traduzir): string {
  return t("{n} abordagens em 24 horas, com pelo menos {m} minutos entre elas.")
    .replace("{n}", numeroBr(diario))
    .replace("{m}", numeroBr(intervalo));
}
```

- [ ] **Step 5: `lib/escale/prospeccao/filtros.ts`**

```ts
import { SITUACOES_DA_PROSPECCAO, type FiltrosDaProspeccao, type SituacaoDaProspeccao } from "./tipos";

/**
 * OS FILTROS DA LISTA DE PROSPECÇÕES (fork Escale, Fase 8D; D7): busca no nome
 * e situação. Ficam no estado da tela; vão ao servidor como `q` e `s`.
 */
export const FILTROS_DA_PROSPECCAO_VAZIOS: FiltrosDaProspeccao = {};

export const temFiltroDaProspeccao = (f: FiltrosDaProspeccao): boolean =>
  !!f.busca?.trim() || !!f.situacoes?.length;

export function consultaDaLista(f: FiltrosDaProspeccao, pagina: number, porPagina: number): string {
  const p = new URLSearchParams({ p: String(pagina), n: String(porPagina) });
  const busca = f.busca?.trim();
  if (busca) p.set("q", busca);
  if (f.situacoes?.length) p.set("s", f.situacoes.join(","));
  return p.toString();
}

/** O padrão do `ilike`: `%`, `_` e `\` valem como texto (o escape padrão do Postgres é `\`). */
export function padraoDaBusca(busca: string): string {
  return `%${busca.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const VALIDAS: ReadonlySet<string> = new Set(SITUACOES_DA_PROSPECCAO);

/** `s=pausada,rascunho` → a lista; vazio → `[]`; algum valor desconhecido → `null` (422). */
export function situacoesDoTexto(texto: string | undefined): SituacaoDaProspeccao[] | null {
  if (!texto) return [];
  const partes = texto.split(",").map((s) => s.trim()).filter(Boolean);
  if (partes.some((s) => !VALIDAS.has(s))) return null;
  return [...new Set(partes)] as SituacaoDaProspeccao[];
}
```

- [ ] **Step 6: `lib/escale/prospeccao/selecao.ts`**

```ts
import { RAZAO_NAO_SELECIONADA } from "@/lib/prospecting/schema";

import type { DetalheDaProspeccao, EmpresaDaProspeccao, ProgressoDaEmpresa } from "./tipos";

/**
 * QUEM PODE SER MARCADO E EXCLUÍDO (fork Escale, Fase 8D; D10). Espelha as
 * regras do servidor do original (`select`, `selecionarNaFila`,
 * `DESCARTAR_DESMARCADAS_SQL` em `lib/prospecting/store.ts`): a tela só
 * oferece o que o servidor aceita.
 */
type Situacao = Pick<DetalheDaProspeccao, "status" | "statusDaBusca" | "config">;

/** Em rascunho (busca concluída) ou pausada: o envio não está no meio de uma abordagem. */
export function podeSelecionar(d: Situacao): boolean {
  return d.statusDaBusca === "succeeded" && (d.status === "draft" || d.status === "paused");
}

export const acaoDaSelecao = (d: Situacao): "select" | "select_in_queue" =>
  d.status === "draft" ? "select" : "select_in_queue";

export function marcavel(e: EmpresaDaProspeccao, d: Situacao): boolean {
  if (!podeSelecionar(d)) return false;
  if (d.status === "draft") return e.status === "new";
  if (e.status === "queued") return true;
  return (
    e.status === "skipped" &&
    !e.selecionada &&
    e.erro === RAZAO_NAO_SELECIONADA &&
    (d.config?.funnel_entry === "on_send" || !!e.conversaId)
  );
}

/** O que "Excluir desmarcadas" apaga: sem negócio nem conversa, e só o que o operador tirou. */
export function descartaveis(empresas: readonly EmpresaDaProspeccao[]): EmpresaDaProspeccao[] {
  return empresas.filter(
    (e) =>
      !e.selecionada &&
      !e.conversaId &&
      !e.negocioId &&
      (e.status === "new" || (e.status === "skipped" && e.erro === RAZAO_NAO_SELECIONADA)),
  );
}

/** As marcadas do rascunho (as que entram na fila ao iniciar). */
export const contarMarcadas = (empresas: readonly EmpresaDaProspeccao[]): number =>
  empresas.filter((e) => e.status === "new" && e.selecionada).length;

export interface FiltroDasEmpresas {
  busca: string;
  progressos: readonly ProgressoDaEmpresa[];
  /** Com a seleção ligada, as desmarcadas ficam escondidas até a pessoa pedir (o original). */
  mostrarDesmarcadas: boolean;
  podeSelecionar: boolean;
}

const soDigitos = (s: string) => s.replace(/\D/g, "");

export function filtrarEmpresas(
  empresas: readonly EmpresaDaProspeccao[],
  f: FiltroDasEmpresas,
): EmpresaDaProspeccao[] {
  const busca = f.busca.trim().toLocaleLowerCase("pt-BR");
  const digitos = soDigitos(busca);
  return empresas.filter((e) => {
    if (f.podeSelecionar && !f.mostrarDesmarcadas && !e.selecionada) return false;
    if (f.progressos.length && !f.progressos.includes(e.progresso)) return false;
    if (!busca) return true;
    if (e.dados.name.toLocaleLowerCase("pt-BR").includes(busca)) return true;
    return digitos.length > 0 && soDigitos(e.dados.phone ?? "").includes(digitos);
  });
}
```

- [ ] **Step 7: `lib/escale/prospeccao/assistente.ts`**

```ts
import type { CampaignConfig, SearchInput } from "@/lib/prospecting/schema";

import type { DetalheDaProspeccao, OpcoesDaProspeccao } from "./tipos";

/**
 * O ASSISTENTE DE PROSPECÇÃO (fork Escale, Fase 8D; D9). O rascunho vive na
 * tela; o motor só recebe a busca (passo 2) e a configuração (ao iniciar), com
 * os limites do `lib/prospecting/schema.ts`. Os campos numéricos ficam como
 * texto enquanto a pessoa digita ("1,5"), e viram número ao sair.
 */
export const PASSOS_DA_PROSPECCAO = [
  "Configure a sua prospecção",
  "Encontre empresas",
  "Configure a abordagem",
  "Confirme e inicie",
] as const;
export type PassoDaProspeccao = 0 | 1 | 2 | 3;
export type ModoDoAgente = "conversa" | "existente";

export interface RascunhoDaProspeccao {
  nome: string;
  numeroId: string | null;
  modo: ModoDoAgente;
  agenteId: string | null;
  nicho: string;
  local: string;
  limite: string;
  orcamento: string;
  enriquecer: boolean;
  funilId: string;
  etapaId: string;
  etapaQualificadaId: string;
  instrucao: string;
  qualificacao: string;
  limiteDiario: string;
  intervaloMinutos: string;
  entrada: "on_send" | "on_start";
  baseLegal: string;
}

/** Os padrões do original (`emptyConfig`, `searchSchema`): 20 empresas, US$ 1, 10 por dia, 15 min, só no envio. */
export const RASCUNHO_VAZIO: RascunhoDaProspeccao = {
  nome: "",
  numeroId: null,
  modo: "conversa",
  agenteId: null,
  nicho: "",
  local: "",
  limite: "20",
  orcamento: "1",
  enriquecer: true,
  funilId: "",
  etapaId: "",
  etapaQualificadaId: "",
  instrucao: "",
  qualificacao: "",
  limiteDiario: "10",
  intervaloMinutos: "15",
  entrada: "on_send",
  baseLegal: "",
};

/** O nome da Clint (3 a 80, B2), dentro do que o motor aceita (2 a 120). */
export const NOME_MIN = 3;
export const NOME_MAX = 80;

export function inteiroDoTexto(v: string): number | null {
  const s = v.trim();
  return /^\d+$/.test(s) ? Number(s) : null;
}

export function decimalDoTexto(v: string): number | null {
  const s = v.trim();
  return /^\d+([.,]\d+)?$/.test(s) ? Number(s.replace(",", ".")) : null;
}

const entre = (n: number, min: number, max: number) => n >= min && n <= max;
const textoDoDecimal = (n: number) => String(n).replace(".", ",");

export interface ContextoDoPasso {
  buscaConcluida: boolean;
  marcadas: number;
}

/** Os erros que impedem "Próximo" (ou "Iniciar", no passo 4). Textos para `t()`. */
export function errosDoPasso(passo: PassoDaProspeccao, r: RascunhoDaProspeccao, ctx: ContextoDoPasso): string[] {
  const erros: string[] = [];
  if (passo === 0) {
    if (!entre(r.nome.trim().length, NOME_MIN, NOME_MAX)) erros.push("O nome precisa ter de 3 a 80 caracteres.");
    if (!r.numeroId) erros.push("Escolha o número que vai abordar as empresas.");
    if (r.modo === "existente" && !r.agenteId) erros.push("Escolha um agente publicado.");
  } else if (passo === 1) {
    if (!ctx.buscaConcluida) erros.push("Busque as empresas e espere a busca terminar.");
    else if (ctx.marcadas === 0) erros.push("Marque pelo menos uma empresa para abordar.");
  } else if (passo === 2) {
    if (!r.agenteId)
      erros.push(
        r.modo === "conversa"
          ? "Termine a conversa e publique o agente antes de seguir."
          : "Escolha um agente publicado.",
      );
    if (!r.funilId || !r.etapaId || !r.etapaQualificadaId || r.etapaId === r.etapaQualificadaId)
      erros.push("Escolha duas etapas abertas e diferentes do mesmo funil: entrada e qualificados.");
    if (!entre(r.instrucao.trim().length, 10, 2000))
      erros.push("Descreva o que a IA deve oferecer (de 10 a 2.000 caracteres).");
    if (!entre(r.qualificacao.trim().length, 10, 2000))
      erros.push("Descreva quando o cliente está qualificado (de 10 a 2.000 caracteres).");
    const diario = inteiroDoTexto(r.limiteDiario);
    if (diario === null || !entre(diario, 1, 50)) erros.push("O máximo em 24 horas vai de 1 a 50.");
    const intervalo = inteiroDoTexto(r.intervaloMinutos);
    if (intervalo === null || !entre(intervalo, 5, 1440)) erros.push("O intervalo mínimo vai de 5 a 1.440 minutos.");
  } else if (!entre(r.baseLegal.trim().length, 3, 500)) {
    erros.push("Informe a referência da avaliação de legítimo interesse (de 3 a 500 caracteres).");
  }
  return erros;
}

/** Os erros do formulário de busca (passo 2, antes de "Buscar empresas"). */
export function errosDaBusca(r: RascunhoDaProspeccao): string[] {
  const erros: string[] = [];
  if (!entre(r.nicho.trim().length, 2, 120)) erros.push("Informe o público ou segmento (de 2 a 120 caracteres).");
  if (!entre(r.local.trim().length, 2, 160)) erros.push("Informe a cidade ou região (de 2 a 160 caracteres).");
  const limite = inteiroDoTexto(r.limite);
  if (limite === null || !entre(limite, 1, 100)) erros.push("Até quantas empresas: de 1 a 100.");
  const orcamento = decimalDoTexto(r.orcamento);
  if (orcamento === null || !entre(orcamento, 0.5, 10)) erros.push("O teto da busca vai de US$ 0,50 a US$ 10,00.");
  return erros;
}

/** A busca que vai ao motor. Só chame com `errosDaBusca(r)` vazio. */
export function buscaDoRascunho(r: RascunhoDaProspeccao): SearchInput {
  return {
    name: r.nome.trim(),
    niche: r.nicho.trim(),
    location: r.local.trim(),
    limit: inteiroDoTexto(r.limite) ?? 20,
    budget_usd: decimalDoTexto(r.orcamento) ?? 1,
    enrich: r.enriquecer,
  };
}

/** A mesma busca repetida reaproveita o `request_id` (o motor é idempotente por ele). */
export const impressaoDaBusca = (r: RascunhoDaProspeccao): string => JSON.stringify(buscaDoRascunho(r));

/** A configuração que vai ao motor no "Iniciar". */
export function configDoRascunho(r: RascunhoDaProspeccao): CampaignConfig {
  return {
    agent_id: r.agenteId ?? "",
    channel_session_id: r.numeroId ?? "",
    pipeline_id: r.funilId,
    stage_id: r.etapaId,
    qualified_stage_id: r.etapaQualificadaId,
    instruction: r.instrucao.trim(),
    qualification: r.qualificacao.trim(),
    daily_limit: inteiroDoTexto(r.limiteDiario) ?? 10,
    interval_minutes: inteiroDoTexto(r.intervaloMinutos) ?? 15,
    legal_basis_ref: r.baseLegal.trim(),
    funnel_entry: r.entrada,
  };
}

function camposDaBusca(b: SearchInput): Partial<RascunhoDaProspeccao> {
  return {
    nome: b.name,
    nicho: b.niche,
    local: b.location,
    limite: String(b.limit),
    orcamento: textoDoDecimal(b.budget_usd),
    enriquecer: b.enrich,
  };
}

function camposDaConfig(c: CampaignConfig): Partial<RascunhoDaProspeccao> {
  return {
    modo: "existente",
    numeroId: c.channel_session_id,
    agenteId: c.agent_id,
    funilId: c.pipeline_id,
    etapaId: c.stage_id,
    etapaQualificadaId: c.qualified_stage_id,
    instrucao: c.instruction,
    qualificacao: c.qualification,
    limiteDiario: String(c.daily_limit),
    intervaloMinutos: String(c.interval_minutes),
    entrada: c.funnel_entry,
    baseLegal: c.legal_basis_ref,
  };
}

/** Continuar um rascunho: a busca gravada; a configuração, se a preparação já começou (A4). */
export function rascunhoDaCampanha(d: DetalheDaProspeccao): RascunhoDaProspeccao {
  return { ...RASCUNHO_VAZIO, ...camposDaBusca(d.busca), ...(d.config ? camposDaConfig(d.config) : {}) };
}

/** Duplicar (D8): tudo preenchido, o nome com o sufixo; a campanha nova nasce na próxima busca. */
export function rascunhoDaCopia(d: DetalheDaProspeccao, sufixo: string): RascunhoDaProspeccao {
  return { ...rascunhoDaCampanha(d), nome: `${d.busca.name}${sufixo}`.slice(0, NOME_MAX) };
}

/** Rascunho com a preparação começada vai direto à confirmação; o resto começa do passo 1. */
export const passoDaCampanha = (d: DetalheDaProspeccao): PassoDaProspeccao => (d.config ? 3 : 0);

export interface InicioDoAssistente {
  rascunho: RascunhoDaProspeccao;
  passo: PassoDaProspeccao;
  campanhaId: string | null;
}

export function inicioDoAssistente(
  d: DetalheDaProspeccao | null,
  modo: "nova" | "continuar" | "copiar",
  sufixo: string,
): InicioDoAssistente {
  if (!d || modo === "nova") return { rascunho: RASCUNHO_VAZIO, passo: 0, campanhaId: null };
  if (modo === "copiar") return { rascunho: rascunhoDaCopia(d, sufixo), passo: 0, campanhaId: null };
  return { rascunho: rascunhoDaCampanha(d), passo: passoDaCampanha(d), campanhaId: d.linha.id };
}

/** O que o construtor por conversa devolve (o `setup` do `onCreated` do original). */
export type SetupDoAgente = Pick<
  CampaignConfig,
  "channel_session_id" | "pipeline_id" | "stage_id" | "qualified_stage_id" | "instruction" | "qualification"
>;

/** `agente` é o `result.agent` do `onCreated` do original (`CreatedProspectingAgent`). */
export function aplicarAgenteCriado(
  agente: { id: string; name: string },
  setup: SetupDoAgente,
): Partial<RascunhoDaProspeccao> {
  return {
    agenteId: agente.id,
    numeroId: setup.channel_session_id,
    funilId: setup.pipeline_id,
    etapaId: setup.stage_id,
    etapaQualificadaId: setup.qualified_stage_id,
    instrucao: setup.instruction,
    qualificacao: setup.qualification,
  };
}

/** As opções no formato que o `ProspectingAgentBuilder` do original recebe. */
export const canaisDoConstrutor = (o: OpcoesDaProspeccao) =>
  o.numeros.map((n) => ({ id: n.id, display_name: n.nome, phone_number: n.telefone, status: n.status }));

export const etapasDoConstrutor = (o: OpcoesDaProspeccao) =>
  o.etapas.map((e) => ({ id: e.id, name: e.nome, pipeline_id: e.funilId, pipeline_name: e.funilNome }));

/** Os números do `SeletorDeNumero` (8B): só os conectados, no grupo "Não oficial". */
export const numerosDoSeletor = (o: OpcoesDaProspeccao, grupo: string) =>
  o.numeros
    .filter((n) => n.status === "WORKING")
    .map((n) => ({ id: n.id, nome: n.nome, telefone: n.telefone, conectado: true, grupo }));

export function funisDasEtapas(o: OpcoesDaProspeccao): { valor: string; rotulo: string }[] {
  return [...new Map(o.etapas.map((e) => [e.funilId, e.funilNome])).entries()].map(([valor, rotulo]) => ({
    valor,
    rotulo,
  }));
}
```

- [ ] **Step 8: `lib/escale/prospeccao/rotas.ts`**

```ts
/**
 * PARA ONDE A PROSPECÇÃO LEVA (fork Escale, Fase 8D; D8, D9). A aba em si é
 * `rotaDaAba("prospeccao")` da 8A.
 */
export const ROTA_DA_NOVA_PROSPECCAO = "/app/campaigns/prospeccao/nova";
export const rotaDoRascunhoDaProspeccao = (id: string): string => `${ROTA_DA_NOVA_PROSPECCAO}?id=${id}`;
export const rotaDaCopiaDaProspeccao = (id: string): string => `${ROTA_DA_NOVA_PROSPECCAO}?copiar=${id}`;
/** A conversa abre como em Contatos e no flutuante (`/app/inbox?id=`). */
export const rotaDaConversa = (id: string): string => `/app/inbox?id=${id}`;
export const rotaDoAgente = (id: string): string => `/app/ai/agents/${id}`;
```

- [ ] **Step 9: `tests/helpers/prospeccao-fixtures.ts`**

```ts
import type {
  ContagemDaProspeccao,
  DetalheDaProspeccao,
  EmpresaDaProspeccao,
  LinhaDeProspeccao,
  OpcoesDaProspeccao,
} from "@/lib/escale/prospeccao/tipos";
import type { CampaignConfig, SearchInput } from "@/lib/prospecting/schema";

/** Os dados de exemplo da Prospecção na casca (Fase 8D). */
export const ORG = "22222222-2222-4222-8222-222222222222";
export const ID = "11111111-1111-4111-8111-111111111111";
export const NUMERO = "33333333-3333-4333-8333-333333333333";
export const AGENTE = "44444444-4444-4444-8444-444444444444";
export const FUNIL = "55555555-5555-4555-8555-555555555555";
export const ETAPA_ENTRADA = "66666666-6666-4666-8666-666666666666";
export const ETAPA_QUALIFICADOS = "77777777-7777-4777-8777-777777777777";

export const BUSCA: SearchInput = {
  name: "Clínicas Campinas",
  niche: "clínicas de estética",
  location: "Campinas, SP",
  limit: 20,
  budget_usd: 1.5,
  enrich: true,
};

export const CONFIG: CampaignConfig = {
  agent_id: AGENTE,
  channel_session_id: NUMERO,
  pipeline_id: FUNIL,
  stage_id: ETAPA_ENTRADA,
  qualified_stage_id: ETAPA_QUALIFICADOS,
  instruction: "Apresente a clínica com educação.",
  qualification: "Tem interesse em agendar avaliação.",
  daily_limit: 10,
  interval_minutes: 15,
  legal_basis_ref: "LIA 2026/01",
  funnel_entry: "on_send",
};

export function contagem(o: Partial<ContagemDaProspeccao> = {}): ContagemDaProspeccao {
  return { encontradas: 0, naFila: 0, abordadas: 0, responderam: 0, qualificadas: 0, falhas: 0, naoAbordadas: 0, ...o };
}

export function linha(o: Partial<LinhaDeProspeccao> = {}): LinhaDeProspeccao {
  return {
    id: ID,
    nome: "Clínicas Campinas",
    situacao: "em_progresso",
    numeroId: NUMERO,
    criadaEm: "2026-10-10T12:00:00.000Z",
    primeiraAbordagem: "2026-10-10T15:39:00.000Z",
    ...contagem({ encontradas: 20, naFila: 6, abordadas: 10, responderam: 4, qualificadas: 1, falhas: 2, naoAbordadas: 2 }),
    ...o,
  };
}

export function empresa(o: Partial<EmpresaDaProspeccao> = {}): EmpresaDaProspeccao {
  return {
    id: "e1",
    dados: {
      key: "place-1",
      name: "Clínica Bela",
      phone: "+5519999990000",
      website: "https://bela.com.br",
      category: "Clínica de estética",
      address: "Rua A, 1, Campinas",
      maps_url: null,
      rating: 4.5,
      reviews: 120,
      emails: [],
      socials: [],
    },
    status: "sent",
    selecionada: true,
    erro: null,
    negocioId: "l1",
    conversaId: "v1",
    abordadaEm: "2026-10-10T15:39:00.000Z",
    statusDaMensagem: "delivered",
    progresso: "replied",
    ...o,
  };
}

export function detalhe(o: Partial<DetalheDaProspeccao> = {}): DetalheDaProspeccao {
  return {
    linha: linha(),
    status: "running",
    statusDaBusca: "succeeded",
    busca: BUSCA,
    config: CONFIG,
    custoUsd: 0.4512,
    repetidas: 3,
    erro: null,
    empresas: [empresa()],
    ...o,
  };
}

export const OPCOES: OpcoesDaProspeccao = {
  configurada: true,
  agentes: [{ id: AGENTE, nome: "Sofia" }],
  numeros: [{ id: NUMERO, nome: "Comercial", telefone: "+5519988887777", status: "WORKING" }],
  etapas: [
    { id: ETAPA_ENTRADA, nome: "Abordado", funilId: FUNIL, funilNome: "Prospecção ativa" },
    { id: ETAPA_QUALIFICADOS, nome: "Qualificado", funilId: FUNIL, funilNome: "Prospecção ativa" },
  ],
};
```

- [ ] **Step 10: O teste (falha antes do Step 3, passa agora)**

`tests/unit/escale-prospeccao-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  custoEmDolar,
  etapasDoFunil,
  ROTULO_DA_SITUACAO,
  segmentosDaProspeccao,
  SITUACOES_QUE_PULSAM,
  subtituloDaProspeccao,
  textoDoPorcento,
  textoDoRitmo,
  textoDoSegmentoDaProspeccao,
  TOM_DA_SITUACAO,
} from "@/lib/escale/prospeccao/apresentacao";
import {
  aplicarAgenteCriado,
  buscaDoRascunho,
  configDoRascunho,
  decimalDoTexto,
  errosDaBusca,
  errosDoPasso,
  inicioDoAssistente,
  inteiroDoTexto,
  numerosDoSeletor,
  RASCUNHO_VAZIO,
  rascunhoDaCampanha,
  rascunhoDaCopia,
  type RascunhoDaProspeccao,
} from "@/lib/escale/prospeccao/assistente";
import { consultaDaLista, padraoDaBusca, situacoesDoTexto, temFiltroDaProspeccao } from "@/lib/escale/prospeccao/filtros";
import { contarMarcadas, descartaveis, filtrarEmpresas, marcavel, podeSelecionar } from "@/lib/escale/prospeccao/selecao";
import { RAZAO_NAO_SELECIONADA } from "@/lib/prospecting/schema";
import {
  AGENTE,
  BUSCA,
  CONFIG,
  contagem,
  detalhe,
  empresa,
  ETAPA_ENTRADA,
  ETAPA_QUALIFICADOS,
  FUNIL,
  ID,
  linha,
  NUMERO,
  OPCOES,
} from "@/tests/helpers/prospeccao-fixtures";

const t = (s: string) => s;

describe("situação (D3)", () => {
  it("rótulos e tons da Clint onde há par; pulsa enquanto busca ou aborda", () => {
    expect(ROTULO_DA_SITUACAO.completa).toBe("Completo");
    expect(TOM_DA_SITUACAO.erro_na_busca).toBe("vermelho");
    expect([...SITUACOES_QUE_PULSAM].sort()).toEqual(["buscando", "em_progresso"]);
  });

  it("subtítulo: buscando, uma, várias", () => {
    expect(subtituloDaProspeccao(linha({ situacao: "buscando" }), t)).toBe("Buscando empresas");
    expect(subtituloDaProspeccao(linha({ encontradas: 1 }), t)).toBe("1 empresa encontrada");
    expect(subtituloDaProspeccao(linha({ encontradas: 1234 }), t)).toBe("1.234 empresas encontradas");
  });
});

describe("barra de resultado (D5)", () => {
  it("sem encontradas, nenhum segmento", () => {
    expect(segmentosDaProspeccao(contagem())).toEqual([]);
  });

  it("larguras disjuntas sobre as encontradas; a dica diz o acumulado", () => {
    const s = segmentosDaProspeccao(contagem({ encontradas: 20, abordadas: 10, responderam: 4, qualificadas: 1, falhas: 2 }));
    expect(s.map((x) => [x.chave, x.largura, x.quantidade, x.porcento])).toEqual([
      ["falhas", 10, 2, 10],
      ["abordadas", 30, 10, 50],
      ["responderam", 15, 4, 20],
      ["qualificadas", 5, 1, 5],
    ]);
    expect(textoDoSegmentoDaProspeccao(s[1]!, t)).toBe("10 abordadas - 50%");
  });

  it("segmento vazio sai da barra", () => {
    const s = segmentosDaProspeccao(contagem({ encontradas: 10, abordadas: 4, responderam: 4 }));
    expect(s.map((x) => x.chave)).toEqual(["responderam"]);
  });
});

describe("funil, percentuais, custo e ritmo (D10)", () => {
  it("funil sobre as encontradas; sem base, null", () => {
    expect(etapasDoFunil(contagem({ encontradas: 20, abordadas: 10, responderam: 4, qualificadas: 1 }), t).map((e) => e.porcento)).toEqual([100, 50, 20, 5]);
    expect(etapasDoFunil(contagem(), t)[0]!.porcento).toBeNull();
  });

  it("textoDoPorcento e custoEmDolar no formato brasileiro", () => {
    expect(textoDoPorcento(1, 3)).toBe("33%");
    expect(textoDoPorcento(1, 0)).toBe("—");
    expect(custoEmDolar(0.4512)).toBe("US$ 0,45");
    expect(custoEmDolar(1234.5)).toBe("US$ 1.234,50");
    expect(custoEmDolar(null)).toBe("—");
  });

  it("textoDoRitmo", () => {
    expect(textoDoRitmo(10, 15, t)).toBe("10 abordagens em 24 horas, com pelo menos 15 minutos entre elas.");
  });
});

describe("filtros da lista (D7)", () => {
  it("consulta, vazio e padrão escapado", () => {
    expect(temFiltroDaProspeccao({})).toBe(false);
    expect(temFiltroDaProspeccao({ busca: "  " })).toBe(false);
    expect(consultaDaLista({ busca: " clin ", situacoes: ["pausada", "rascunho"] }, 2, 10)).toBe("p=2&n=10&q=clin&s=pausada%2Crascunho");
    expect(padraoDaBusca("50%_a\\b")).toBe("%50\\%\\_a\\\\b%");
  });

  it("situações do texto: vazio, válidas, desconhecida", () => {
    expect(situacoesDoTexto(undefined)).toEqual([]);
    expect(situacoesDoTexto("pausada,rascunho,pausada")).toEqual(["pausada", "rascunho"]);
    expect(situacoesDoTexto("pausada,xyz")).toBeNull();
  });
});

describe("seleção (D10; regras do servidor do original)", () => {
  it("só em rascunho com busca concluída ou pausada", () => {
    expect(podeSelecionar(detalhe({ status: "draft" }))).toBe(true);
    expect(podeSelecionar(detalhe({ status: "paused" }))).toBe(true);
    expect(podeSelecionar(detalhe({ status: "running" }))).toBe(false);
    expect(podeSelecionar(detalhe({ status: "draft", statusDaBusca: "running" }))).toBe(false);
  });

  it("marcável: nova no rascunho; na fila ou desmarcada pelo operador na pausada", () => {
    const rascunho = detalhe({ status: "draft" });
    expect(marcavel(empresa({ status: "new" }), rascunho)).toBe(true);
    const pausada = detalhe({ status: "paused" });
    expect(marcavel(empresa({ status: "queued" }), pausada)).toBe(true);
    expect(marcavel(empresa({ status: "sent" }), pausada)).toBe(false);
    const tirada = empresa({ status: "skipped", selecionada: false, erro: RAZAO_NAO_SELECIONADA, conversaId: null });
    expect(marcavel(tirada, pausada)).toBe(true);
    expect(marcavel(tirada, detalhe({ status: "paused", config: { ...CONFIG, funnel_entry: "on_start" } }))).toBe(false);
    expect(marcavel(empresa({ status: "skipped", selecionada: false, erro: "Sem telefone brasileiro válido." }), pausada)).toBe(false);
  });

  it("descartáveis: desmarcadas sem negócio nem conversa", () => {
    const lista = [
      empresa({ id: "a", status: "new", selecionada: false, negocioId: null, conversaId: null }),
      empresa({ id: "b", status: "skipped", selecionada: false, erro: RAZAO_NAO_SELECIONADA, negocioId: null, conversaId: null }),
      empresa({ id: "c", status: "skipped", selecionada: false, erro: RAZAO_NAO_SELECIONADA, negocioId: "l9", conversaId: "v9" }),
      empresa({ id: "d", status: "new", selecionada: true, negocioId: null, conversaId: null }),
    ];
    expect(descartaveis(lista).map((e) => e.id)).toEqual(["a", "b"]);
    expect(contarMarcadas(lista)).toBe(1);
  });

  it("filtrarEmpresas: desmarcadas escondidas, progresso, nome e telefone", () => {
    const lista = [
      empresa({ id: "a", progresso: "replied" }),
      empresa({ id: "b", selecionada: false, progresso: "new" }),
      empresa({ id: "c", progresso: "qualified", dados: { ...empresa().dados, name: "Studio Pele", phone: "+5519911112222" } }),
    ];
    const base = { busca: "", progressos: [], mostrarDesmarcadas: false, podeSelecionar: true };
    expect(filtrarEmpresas(lista, base).map((e) => e.id)).toEqual(["a", "c"]);
    expect(filtrarEmpresas(lista, { ...base, mostrarDesmarcadas: true }).map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(filtrarEmpresas(lista, { ...base, progressos: ["qualified"] }).map((e) => e.id)).toEqual(["c"]);
    expect(filtrarEmpresas(lista, { ...base, busca: "pele" }).map((e) => e.id)).toEqual(["c"]);
    expect(filtrarEmpresas(lista, { ...base, busca: "1111" }).map((e) => e.id)).toEqual(["c"]);
  });
});

describe("assistente (D9)", () => {
  const pronto: RascunhoDaProspeccao = {
    ...RASCUNHO_VAZIO,
    nome: "Clínicas Campinas",
    numeroId: NUMERO,
    modo: "existente",
    agenteId: AGENTE,
    nicho: "clínicas de estética",
    local: "Campinas, SP",
    orcamento: "1,5",
    funilId: FUNIL,
    etapaId: ETAPA_ENTRADA,
    etapaQualificadaId: ETAPA_QUALIFICADOS,
    instrucao: "Apresente a clínica com educação.",
    qualificacao: "Tem interesse em agendar avaliação.",
    baseLegal: "LIA 2026/01",
  };
  const ctx = { buscaConcluida: true, marcadas: 3 };

  it("números do texto", () => {
    expect(inteiroDoTexto(" 12 ")).toBe(12);
    expect(inteiroDoTexto("1,5")).toBeNull();
    expect(decimalDoTexto("1,5")).toBe(1.5);
    expect(decimalDoTexto("abc")).toBeNull();
  });

  it("passo 1: nome 3–80, número, agente quando existente", () => {
    expect(errosDoPasso(0, pronto, ctx)).toEqual([]);
    expect(errosDoPasso(0, { ...RASCUNHO_VAZIO, nome: "ab" }, ctx)).toEqual([
      "O nome precisa ter de 3 a 80 caracteres.",
      "Escolha o número que vai abordar as empresas.",
    ]);
    expect(errosDoPasso(0, { ...pronto, agenteId: null }, ctx)).toEqual(["Escolha um agente publicado."]);
    expect(errosDoPasso(0, { ...pronto, modo: "conversa", agenteId: null }, ctx)).toEqual([]);
  });

  it("passo 2: busca concluída e alguma marcada", () => {
    expect(errosDoPasso(1, pronto, { buscaConcluida: false, marcadas: 0 })).toEqual(["Busque as empresas e espere a busca terminar."]);
    expect(errosDoPasso(1, pronto, { buscaConcluida: true, marcadas: 0 })).toEqual(["Marque pelo menos uma empresa para abordar."]);
    expect(errosDoPasso(1, pronto, ctx)).toEqual([]);
  });

  it("passo 3: agente, etapas diferentes, textos e ritmo", () => {
    expect(errosDoPasso(2, pronto, ctx)).toEqual([]);
    const erros = errosDoPasso(2, { ...pronto, modo: "conversa", agenteId: null, etapaQualificadaId: ETAPA_ENTRADA, instrucao: "curta", limiteDiario: "51", intervaloMinutos: "4" }, ctx);
    expect(erros).toEqual([
      "Termine a conversa e publique o agente antes de seguir.",
      "Escolha duas etapas abertas e diferentes do mesmo funil: entrada e qualificados.",
      "Descreva o que a IA deve oferecer (de 10 a 2.000 caracteres).",
      "O máximo em 24 horas vai de 1 a 50.",
      "O intervalo mínimo vai de 5 a 1.440 minutos.",
    ]);
  });

  it("passo 4: base legal", () => {
    expect(errosDoPasso(3, { ...pronto, baseLegal: "x" }, ctx)).toEqual([
      "Informe a referência da avaliação de legítimo interesse (de 3 a 500 caracteres).",
    ]);
  });

  it("busca: erros e o que vai ao motor", () => {
    expect(errosDaBusca({ ...pronto, nicho: "", limite: "101", orcamento: "0,4" })).toEqual([
      "Informe o público ou segmento (de 2 a 120 caracteres).",
      "Até quantas empresas: de 1 a 100.",
      "O teto da busca vai de US$ 0,50 a US$ 10,00.",
    ]);
    expect(buscaDoRascunho(pronto)).toEqual(BUSCA);
  });

  it("configuração do rascunho = a do motor", () => {
    expect(configDoRascunho(pronto)).toEqual(CONFIG);
  });

  it("continuar, duplicar e o início do assistente", () => {
    const semConfig = detalhe({ status: "draft", config: null });
    expect(rascunhoDaCampanha(semConfig)).toMatchObject({ nome: BUSCA.name, nicho: BUSCA.niche, orcamento: "1,5", modo: "conversa", numeroId: null });
    expect(rascunhoDaCampanha(detalhe({ status: "draft" }))).toMatchObject({ modo: "existente", agenteId: AGENTE, limiteDiario: "10" });
    expect(rascunhoDaCopia(detalhe(), " Cópia").nome).toBe("Clínicas Campinas Cópia");
    expect(inicioDoAssistente(null, "nova", " Cópia")).toEqual({ rascunho: RASCUNHO_VAZIO, passo: 0, campanhaId: null });
    expect(inicioDoAssistente(semConfig, "continuar", " Cópia")).toMatchObject({ passo: 0, campanhaId: ID });
    expect(inicioDoAssistente(detalhe({ status: "draft" }), "continuar", " Cópia")).toMatchObject({ passo: 3, campanhaId: ID });
    expect(inicioDoAssistente(detalhe(), "copiar", " Cópia")).toMatchObject({ passo: 0, campanhaId: null });
  });

  it("agente criado pela conversa preenche número, funil e textos", () => {
    expect(
      aplicarAgenteCriado({ id: AGENTE, name: "Sofia" }, {
        channel_session_id: NUMERO,
        pipeline_id: FUNIL,
        stage_id: ETAPA_ENTRADA,
        qualified_stage_id: ETAPA_QUALIFICADOS,
        instruction: CONFIG.instruction,
        qualification: CONFIG.qualification,
      }),
    ).toEqual({ agenteId: AGENTE, numeroId: NUMERO, funilId: FUNIL, etapaId: ETAPA_ENTRADA, etapaQualificadaId: ETAPA_QUALIFICADOS, instrucao: CONFIG.instruction, qualificacao: CONFIG.qualification });
  });

  it("números do seletor: só os conectados", () => {
    const o = { ...OPCOES, numeros: [...OPCOES.numeros, { id: "x", nome: "Velho", telefone: null, status: "STOPPED" }] };
    expect(numerosDoSeletor(o, "Não oficial")).toEqual([{ id: NUMERO, nome: "Comercial", telefone: "+5519988887777", conectado: true, grupo: "Não oficial" }]);
  });
});
```

- [ ] **Step 11: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-regras.test.ts && corepack pnpm prettier --write lib/escale/prospeccao tests/helpers/prospeccao-fixtures.ts tests/unit/escale-prospeccao-regras.test.ts && corepack pnpm eslint lib/escale/prospeccao tests/helpers/prospeccao-fixtures.ts && corepack pnpm typecheck`
Expected: PASS. Se `custoEmDolar(1234.5)` sair com espaço fino ou outro separador, confira o Node (ICU completo); o esperado é "US$ 1.234,50".

- [ ] **Step 12: Commit**

```bash
git add docs/superpowers/plans/2026-10-19-fase-8d-prospeccao-na-aba.md lib/escale/prospeccao tests/helpers/prospeccao-fixtures.ts tests/unit/escale-prospeccao-regras.test.ts
git commit -m "feat(escale): regras da prospecção na casca — situação, barra, funil, seleção e assistente (Fase 8D)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 2: As leituras do servidor (lista, detalhe e opções)

**Files:**
- Create: `lib/escale/prospeccao/banco.ts`, `app/api/v1/prospeccao-da-casca/route.ts`, `app/api/v1/prospeccao-da-casca/[id]/route.ts`, `app/api/v1/prospeccao-da-casca/opcoes/route.ts`, `tests/unit/escale-prospeccao-rotas.test.ts`

**Interfaces:**
- Consumes: os tipos e `padraoDaBusca`, `situacoesDoTexto` (Task 1); `getRequestPool` (`lib/agent-engine/db/request-pool`); `requireRole` (`lib/auth/require-role`); `ok`, `fail` (`lib/api/wrappers`); `traduzir` (`lib/i18n/dicionario`); `capabilitiesOf` (`lib/channels/capabilities`); `POR_PAGINA`, `POR_PAGINA_PADRAO` (`lib/escale/contatos/regras.ts`).
- Produces: `GET /api/v1/prospeccao-da-casca?p=&n=&q=&s=` → `{ data: PaginaDeProspeccoes }`; `GET /api/v1/prospeccao-da-casca/[id]` → `{ data: DetalheDaProspeccao }` (404 sem a campanha); `GET /api/v1/prospeccao-da-casca/opcoes` → `{ data: OpcoesDaProspeccao }`; `PROGRESSO_SQL`, `LINHAS_SQL`, `linhaDoBanco(r)`, `empresaDoBanco(r)`, `lerPaginaDeProspeccoes(db, org, filtro, pagina, porPagina)`, `lerDetalheDaProspeccao(db, org, id)`, `lerOpcoesDaProspeccao(db, org)`.

- [ ] **Step 1: O teste das rotas (falha)**

`tests/unit/escale-prospeccao-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as GET_DETALHE } from "@/app/api/v1/prospeccao-da-casca/[id]/route";
import { GET as GET_OPCOES } from "@/app/api/v1/prospeccao-da-casca/opcoes/route";
import { GET } from "@/app/api/v1/prospeccao-da-casca/route";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { requireRole } from "@/lib/auth/require-role";
import { BUSCA, CONFIG, ID, NUMERO } from "@/tests/helpers/prospeccao-fixtures";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/agent-engine/db/request-pool", () => ({ getRequestPool: vi.fn() }));

const pedido = (url: string) => new NextRequest(new URL(url, "http://x"));

const LINHA_DO_BANCO = {
  id: ID,
  name: "Clínicas Campinas",
  situacao: "em_progresso",
  numero_id: NUMERO,
  created_at: new Date("2026-10-10T12:00:00.000Z"),
  primeira_abordagem: new Date("2026-10-10T15:39:00.000Z"),
  total: "12",
  encontradas: 20,
  na_fila: 6,
  abordadas: 10,
  responderam: 4,
  qualificadas: 1,
  falhas: 2,
  nao_abordadas: 2,
};

function pool(respostas: Record<string, unknown>[][]) {
  const query = vi.fn();
  for (const rows of respostas) query.mockResolvedValueOnce({ rows });
  vi.mocked(getRequestPool).mockReturnValue({ query } as never);
  return query;
}

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(getRequestPool).mockReset();
});

describe("GET /api/v1/prospeccao-da-casca", () => {
  it("exige admin; manda organização, padrão, situações, limite e deslocamento; mapeia a linha", async () => {
    authOk("admin");
    const query = pool([[LINHA_DO_BANCO]]);
    const r = await GET(pedido("/api/v1/prospeccao-da-casca?p=2&n=10&q=clin&s=pausada,rascunho"));
    expect(r.status).toBe(200);
    expect(vi.mocked(requireRole)).toHaveBeenCalledWith("admin", expect.anything());
    expect(query.mock.calls[0]![1]).toEqual([ORG_ID, "%clin%", ["pausada", "rascunho"], null, 10, 10]);
    const { data } = await r.json();
    expect(data).toMatchObject({ total: 12, pagina: 2, porPagina: 10 });
    expect(data.linhas[0]).toEqual({
      id: ID,
      nome: "Clínicas Campinas",
      situacao: "em_progresso",
      numeroId: NUMERO,
      criadaEm: "2026-10-10T12:00:00.000Z",
      primeiraAbordagem: "2026-10-10T15:39:00.000Z",
      encontradas: 20,
      naFila: 6,
      abordadas: 10,
      responderam: 4,
      qualificadas: 1,
      falhas: 2,
      naoAbordadas: 2,
    });
  });

  it("sem busca nem situação: padrão nulo e lista vazia de situações", async () => {
    authOk("admin");
    const query = pool([[]]);
    const r = await GET(pedido("/api/v1/prospeccao-da-casca"));
    expect(query.mock.calls[0]![1]).toEqual([ORG_ID, null, [], null, 10, 0]);
    expect((await r.json()).data).toEqual({ linhas: [], total: 0, pagina: 1, porPagina: 10 });
  });

  it("situação desconhecida é 422 sem tocar no banco", async () => {
    authOk("admin");
    const r = await GET(pedido("/api/v1/prospeccao-da-casca?s=xyz"));
    expect(r.status).toBe(422);
    expect(getRequestPool).not.toHaveBeenCalled();
  });

  it("quem não é admin recebe a resposta do requireRole", async () => {
    vi.mocked(requireRole).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    const r = await GET(pedido("/api/v1/prospeccao-da-casca"));
    expect(r.status).toBe(403);
    expect(getRequestPool).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/prospeccao-da-casca/[id]", () => {
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  it("devolve a linha, a campanha e as empresas com o progresso", async () => {
    authOk("admin");
    const query = pool([
      [LINHA_DO_BANCO],
      [{ status: "running", search_status: "succeeded", search: BUSCA, config: CONFIG, cost_usd: "0.4512", skipped_count: 3, error: null }],
      [
        {
          id: "e1",
          data: { key: "p1", name: "Clínica Bela", phone: "+5519999990000", website: null, category: null, address: null, maps_url: null, rating: null, reviews: null, emails: [], socials: [] },
          status: "sent",
          selected: true,
          error: null,
          lead_id: "l1",
          conversation_id: "v1",
          attempted_at: new Date("2026-10-10T15:39:00.000Z"),
          message_status: "delivered",
          progresso: "replied",
        },
      ],
    ]);
    const r = await GET_DETALHE(pedido(`/api/v1/prospeccao-da-casca/${ID}`), params(ID));
    expect(r.status).toBe(200);
    expect(query.mock.calls[0]![1]).toEqual([ORG_ID, null, [], ID, 1, 0]);
    expect(query.mock.calls[1]![1]).toEqual([ORG_ID, ID]);
    expect(query.mock.calls[2]![1]).toEqual([ORG_ID, ID]);
    const { data } = await r.json();
    expect(data).toMatchObject({ status: "running", statusDaBusca: "succeeded", busca: BUSCA, config: CONFIG, custoUsd: 0.4512, repetidas: 3, erro: null });
    expect(data.empresas[0]).toMatchObject({ id: "e1", selecionada: true, negocioId: "l1", conversaId: "v1", abordadaEm: "2026-10-10T15:39:00.000Z", statusDaMensagem: "delivered", progresso: "replied" });
  });

  it("id que não é uuid: 422; campanha de outra organização ou inexistente: 404", async () => {
    authOk("admin");
    expect((await GET_DETALHE(pedido("/api/v1/prospeccao-da-casca/x"), params("x"))).status).toBe(422);
    pool([[], [], []]);
    expect((await GET_DETALHE(pedido(`/api/v1/prospeccao-da-casca/${ID}`), params(ID))).status).toBe(404);
  });
});

describe("GET /api/v1/prospeccao-da-casca/opcoes", () => {
  it("chave, agentes, só números de texto livre e etapas", async () => {
    authOk("admin");
    pool([
      [{ organization_id: ORG_ID }],
      [{ id: "a1", name: "Sofia" }],
      [
        { id: NUMERO, display_name: "Comercial", phone_number: "+5519988887777", provider: "waha", status: "WORKING" },
        { id: "oficial", display_name: "Oficial", phone_number: "+551130000000", provider: "meta_cloud", status: "WORKING" },
      ],
      [{ id: "s1", name: "Abordado", pipeline_id: "f1", pipeline_name: "Prospecção ativa" }],
    ]);
    const r = await GET_OPCOES(pedido("/api/v1/prospeccao-da-casca/opcoes"));
    expect((await r.json()).data).toEqual({
      configurada: true,
      agentes: [{ id: "a1", nome: "Sofia" }],
      numeros: [{ id: NUMERO, nome: "Comercial", telefone: "+5519988887777", status: "WORKING" }],
      etapas: [{ id: "s1", nome: "Abordado", funilId: "f1", funilNome: "Prospecção ativa" }],
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-rotas.test.ts`
Expected: FAIL (módulos `@/app/api/v1/prospeccao-da-casca/...` não existem).

- [ ] **Step 3: `lib/escale/prospeccao/banco.ts`**

```ts
import type pg from "pg";

import { capabilitiesOf } from "@/lib/channels/capabilities";
import type { ChannelProvider } from "@/lib/channels/types";
import type { CampaignConfig, Prospect, SearchInput } from "@/lib/prospecting/schema";

import type {
  DetalheDaProspeccao,
  EmpresaDaProspeccao,
  LinhaDeProspeccao,
  OpcoesDaProspeccao,
  PaginaDeProspeccoes,
  ProgressoDaEmpresa,
  SituacaoDaProspeccao,
  StatusDoMotor,
} from "./tipos";

/**
 * AS LEITURAS DA PROSPECÇÃO NA CASCA (fork Escale, Fase 8D). As tabelas da
 * prospecção são só do servidor (sem RLS para `authenticated`), então se lê
 * pelo pool, como o GET do original — sempre com `organization_id` da sessão
 * no `where`. Nada aqui escreve.
 */
type Consulta = Pick<pg.Pool, "query">;
type Linha = Record<string, unknown>;

/** O progresso de uma empresa: a mesma régua do GET do original (`app/api/v1/prospecting/route.ts`). */
export const PROGRESSO_SQL =
  "case when l.stage_id::text = c.config->>'qualified_stage_id' then 'qualified' when v.last_inbound_at is not null then 'replied' else p.status end";

const JUNCOES_DA_EMPRESA =
  "join prospecting_campaigns c on c.organization_id = p.organization_id and c.id = p.campaign_id left join crm_leads l on l.organization_id = p.organization_id and l.id = p.lead_id left join conversations v on v.organization_id = p.organization_id and v.id = p.conversation_id";

/**
 * A página da lista (D3, D4, D6). $1 organização, $2 padrão do nome (ou null),
 * $3 situações (vazia = todas), $4 uma campanha só (ou null), $5 limite,
 * $6 deslocamento. O total vem da janela, antes do `limit`.
 */
export const LINHAS_SQL = `
with base as (
  select c.id, c.name, c.config, c.created_at,
    case
      when c.search_status in ('starting', 'running') then 'buscando'
      when c.status = 'draft' and c.search_status in ('failed', 'unknown') then 'erro_na_busca'
      when c.status = 'draft' then 'rascunho'
      when c.status = 'running' then 'em_progresso'
      when c.status = 'paused' then 'pausada'
      else 'completa'
    end as situacao
  from prospecting_campaigns c
  where c.organization_id = $1
    and ($2::text is null or c.name ilike $2)
    and ($4::uuid is null or c.id = $4)
), pagina as (
  select b.*, count(*) over () as total
  from base b
  where cardinality($3::text[]) = 0 or b.situacao = any($3::text[])
  order by b.created_at desc, b.id
  limit $5 offset $6
)
select pag.id, pag.name, pag.situacao, pag.config->>'channel_session_id' as numero_id, pag.created_at, pag.total,
  k.encontradas, k.na_fila, k.abordadas, k.responderam, k.qualificadas, k.falhas, k.nao_abordadas, k.primeira_abordagem
from pagina pag
cross join lateral (
  select
    count(*)::int as encontradas,
    count(*) filter (where x.progresso in ('queued', 'sending'))::int as na_fila,
    count(*) filter (where x.progresso in ('sent', 'replied', 'qualified'))::int as abordadas,
    count(*) filter (where x.progresso in ('replied', 'qualified'))::int as responderam,
    count(*) filter (where x.progresso = 'qualified')::int as qualificadas,
    count(*) filter (where x.progresso = 'failed')::int as falhas,
    count(*) filter (where x.progresso = 'skipped')::int as nao_abordadas,
    min(x.attempted_at) as primeira_abordagem
  from (
    select p.attempted_at, ${PROGRESSO_SQL} as progresso
    from prospecting_candidates p
    ${JUNCOES_DA_EMPRESA}
    where p.organization_id = $1 and p.campaign_id = pag.id
  ) x
) k
order by pag.created_at desc, pag.id`;

export const CAMPANHA_SQL =
  "select status, search_status, search, config, cost_usd, skipped_count, error from prospecting_campaigns where organization_id = $1 and id = $2";

export const EMPRESAS_SQL = `select p.id, p.data, p.status, p.selected, p.error, p.lead_id, p.conversation_id, p.attempted_at, m.status as message_status, ${PROGRESSO_SQL} as progresso from prospecting_candidates p ${JUNCOES_DA_EMPRESA} left join messages m on m.organization_id = p.organization_id and m.id = p.message_id where p.organization_id = $1 and p.campaign_id = $2 order by p.created_at, p.id limit 5000`;

const iso = (v: unknown): string | null =>
  v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null;
const inteiro = (v: unknown): number => Number(v ?? 0) || 0;
const textoOuNulo = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function linhaDoBanco(r: Linha): LinhaDeProspeccao {
  return {
    id: String(r.id),
    nome: String(r.name),
    situacao: r.situacao as SituacaoDaProspeccao,
    numeroId: textoOuNulo(r.numero_id),
    criadaEm: iso(r.created_at) ?? "",
    primeiraAbordagem: iso(r.primeira_abordagem),
    encontradas: inteiro(r.encontradas),
    naFila: inteiro(r.na_fila),
    abordadas: inteiro(r.abordadas),
    responderam: inteiro(r.responderam),
    qualificadas: inteiro(r.qualificadas),
    falhas: inteiro(r.falhas),
    naoAbordadas: inteiro(r.nao_abordadas),
  };
}

export function empresaDoBanco(r: Linha): EmpresaDaProspeccao {
  return {
    id: String(r.id),
    dados: r.data as Prospect,
    status: String(r.status),
    selecionada: r.selected !== false,
    erro: textoOuNulo(r.error),
    negocioId: textoOuNulo(r.lead_id),
    conversaId: textoOuNulo(r.conversation_id),
    abordadaEm: iso(r.attempted_at),
    statusDaMensagem: textoOuNulo(r.message_status),
    progresso: r.progresso as ProgressoDaEmpresa,
  };
}

export async function lerPaginaDeProspeccoes(
  db: Consulta,
  org: string,
  filtro: { padrao: string | null; situacoes: SituacaoDaProspeccao[] },
  pagina: number,
  porPagina: number,
): Promise<PaginaDeProspeccoes> {
  const { rows } = await db.query<Linha>(LINHAS_SQL, [
    org,
    filtro.padrao,
    filtro.situacoes,
    null,
    porPagina,
    (pagina - 1) * porPagina,
  ]);
  return { linhas: rows.map(linhaDoBanco), total: inteiro(rows[0]?.total), pagina, porPagina };
}

export async function lerDetalheDaProspeccao(
  db: Consulta,
  org: string,
  id: string,
): Promise<DetalheDaProspeccao | null> {
  const [linhas, campanhas, empresas] = await Promise.all([
    db.query<Linha>(LINHAS_SQL, [org, null, [], id, 1, 0]),
    db.query<Linha>(CAMPANHA_SQL, [org, id]),
    db.query<Linha>(EMPRESAS_SQL, [org, id]),
  ]);
  const l = linhas.rows[0];
  const c = campanhas.rows[0];
  if (!l || !c) return null;
  return {
    linha: linhaDoBanco(l),
    status: c.status as StatusDoMotor,
    statusDaBusca: String(c.search_status),
    busca: c.search as SearchInput,
    config: (c.config ?? null) as CampaignConfig | null,
    custoUsd: c.cost_usd === null || c.cost_usd === undefined ? null : Number(c.cost_usd),
    repetidas: inteiro(c.skipped_count),
    erro: textoOuNulo(c.error),
    empresas: empresas.rows.map(empresaDoBanco),
  };
}

function aceitaTextoLivre(provider: unknown): boolean {
  try {
    return capabilitiesOf(provider as ChannelProvider).freeformOutsideWindow;
  } catch {
    return false;
  }
}

/** As mesmas consultas do GET do original: agentes automáticos publicados, conexões, etapas abertas. */
export async function lerOpcoesDaProspeccao(db: Consulta, org: string): Promise<OpcoesDaProspeccao> {
  const [chave, agentes, numeros, etapas] = await Promise.all([
    db.query<Linha>("select organization_id from prospecting_settings where organization_id = $1", [org]),
    db.query<Linha>(
      "select id, name from ai_agents where organization_id = $1 and published_version_id is not null and archived_at is null and paused_at is null and operation_mode = 'automatic' order by name",
      [org],
    ),
    db.query<Linha>(
      "select id, display_name, phone_number, provider, status from channel_sessions where organization_id = $1 and archived_at is null order by created_at",
      [org],
    ),
    db.query<Linha>(
      "select s.id, s.name, s.pipeline_id, p.name as pipeline_name from crm_stages s join crm_pipelines p on p.id = s.pipeline_id and p.organization_id = s.organization_id where s.organization_id = $1 and not s.is_archived and not s.is_won and not s.is_lost order by p.name, s.position",
      [org],
    ),
  ]);
  return {
    configurada: chave.rows.length > 0,
    agentes: agentes.rows.map((a) => ({ id: String(a.id), nome: String(a.name) })),
    numeros: numeros.rows
      .filter((n) => aceitaTextoLivre(n.provider))
      .map((n) => ({
        id: String(n.id),
        nome: textoOuNulo(n.display_name) ?? textoOuNulo(n.phone_number) ?? String(n.id),
        telefone: textoOuNulo(n.phone_number),
        status: String(n.status),
      })),
    etapas: etapas.rows.map((e) => ({
      id: String(e.id),
      nome: String(e.name),
      funilId: String(e.pipeline_id),
      funilNome: String(e.pipeline_name),
    })),
  };
}
```

- [ ] **Step 4: `app/api/v1/prospeccao-da-casca/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { POR_PAGINA, POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";
import { lerPaginaDeProspeccoes } from "@/lib/escale/prospeccao/banco";
import { padraoDaBusca, situacoesDoTexto } from "@/lib/escale/prospeccao/filtros";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

const consultaSchema = z.object({
  p: z.coerce.number().int().min(1).max(100_000).default(1),
  n: z.coerce
    .number()
    .int()
    .refine((n) => (POR_PAGINA as readonly number[]).includes(n))
    .default(POR_PAGINA_PADRAO),
  q: z.string().trim().max(120).optional(),
  s: z.string().max(200).optional(),
});

/**
 * GET /api/v1/prospeccao-da-casca — a lista de prospecções da casca (fork
 * Escale, Fase 8D). Admin, como o GET do original; lê pelo pool do servidor,
 * com a organização da sessão.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lida = consultaSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!lida.success) return fail("validation_failed", t("Query inválida."), 422, { requestId, headers });
  const situacoes = situacoesDoTexto(lida.data.s);
  if (situacoes === null) return fail("validation_failed", t("Filtro inválido."), 422, { requestId, headers });
  try {
    const pagina = await lerPaginaDeProspeccoes(
      getRequestPool(),
      authz.org.orgId,
      { padrao: lida.data.q ? padraoDaBusca(lida.data.q) : null, situacoes },
      lida.data.p,
      lida.data.n,
    );
    return ok(pagina, { requestId, headers });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId, headers });
  }
}
```

- [ ] **Step 5: `app/api/v1/prospeccao-da-casca/[id]/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerDetalheDaProspeccao } from "@/lib/escale/prospeccao/banco";
import { traduzir } from "@/lib/i18n/dicionario";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/prospeccao-da-casca/[id] — o detalhe de uma prospecção (fork Escale, Fase 8D). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return fail("validation_failed", t("Query inválida."), 422, { requestId, headers });
  try {
    const detalhe = await lerDetalheDaProspeccao(getRequestPool(), authz.org.orgId, id);
    if (!detalhe) return fail("not_found", t("Prospecção não encontrada."), 404, { requestId, headers });
    return ok(detalhe, { requestId, headers });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId, headers });
  }
}
```

- [ ] **Step 6: `app/api/v1/prospeccao-da-casca/opcoes/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerOpcoesDaProspeccao } from "@/lib/escale/prospeccao/banco";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/prospeccao-da-casca/opcoes — chave, agentes, números e etapas (fork Escale, Fase 8D). */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "prospecting" });
  if (!authz.ok) return authz.response;
  try {
    return ok(await lerOpcoesDaProspeccao(getRequestPool(), authz.org.orgId), { requestId, headers });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId, headers });
  }
}
```

O teste chama `GET_OPCOES(pedido(...))` com um argumento; a função sem parâmetro aceita (o argumento é ignorado). Se o typecheck reclamar no teste, troque a chamada por `GET_OPCOES()`.

- [ ] **Step 7: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-rotas.test.ts && corepack pnpm prettier --write lib/escale/prospeccao/banco.ts app/api/v1/prospeccao-da-casca tests/unit/escale-prospeccao-rotas.test.ts && corepack pnpm eslint lib/escale/prospeccao app/api/v1/prospeccao-da-casca && corepack pnpm typecheck`
Expected: PASS. Se `fail` não aceitar `"not_found"` como código, use o código que as outras rotas do fork usam para 404 (`grep -rn "404" app/api/v1/campanhas-da-casca`).

- [ ] **Step 8: Commit**

```bash
git add lib/escale/prospeccao/banco.ts app/api/v1/prospeccao-da-casca tests/unit/escale-prospeccao-rotas.test.ts
git commit -m "feat(escale): leituras da prospecção na casca — lista, detalhe e opções (Fase 8D)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 3: Os hooks (lista, detalhe, opções e a ação)

**Files:**
- Create: `hooks/escale/useProspeccaoDaCasca.ts`, `tests/unit/escale-prospeccao-hooks.test.tsx`

**Interfaces:**
- Consumes: as rotas da Task 2; `POST /api/v1/prospecting` (original); `consultaDaLista`, `SITUACOES_QUE_PULSAM` (Task 1); `apiClient` (`lib/api/client`).
- Produces: `CHAVE_DA_PROSPECCAO` ("prospeccao-da-casca"), `RECONSULTA_DA_PROSPECCAO_MS` (10.000), `RECONSULTA_DA_BUSCA_MS` (5.000), `reconsultaDaLista(p)`, `reconsultaDoDetalhe(d)`, `useListaDeProspeccoes(filtros, pagina, porPagina)`, `useDetalheDaProspeccao(id | null)`, `useOpcoesDaProspeccao()`, `PedidoDaProspeccao`, `useAcaoDaProspeccao()` (mutation que devolve o `data` da resposta — a campanha criada em `search`).

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-prospeccao-hooks.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  reconsultaDaLista,
  reconsultaDoDetalhe,
  useAcaoDaProspeccao,
  useDetalheDaProspeccao,
  useListaDeProspeccoes,
} from "@/hooks/escale/useProspeccaoDaCasca";
import { apiClient } from "@/lib/api/client";
import { detalhe, ID, linha } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

function envoltorio() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidar = vi.spyOn(qc, "invalidateQueries");
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { Wrapper, invalidar };
}

beforeEach(() => vi.mocked(apiClient.get).mockReset());

describe("reconsulta", () => {
  it("lista: 10 s enquanto alguma busca ou aborda", () => {
    expect(reconsultaDaLista({ linhas: [linha({ situacao: "completa" })], total: 1, pagina: 1, porPagina: 10 })).toBe(false);
    expect(reconsultaDaLista({ linhas: [linha({ situacao: "buscando" })], total: 1, pagina: 1, porPagina: 10 })).toBe(10_000);
    expect(reconsultaDaLista(undefined)).toBe(false);
  });

  it("detalhe: 5 s buscando, 10 s abordando, parado no resto", () => {
    expect(reconsultaDoDetalhe(detalhe({ linha: linha({ situacao: "buscando" }) }))).toBe(5_000);
    expect(reconsultaDoDetalhe(detalhe())).toBe(10_000);
    expect(reconsultaDoDetalhe(detalhe({ linha: linha({ situacao: "pausada" }) }))).toBe(false);
  });
});

describe("hooks", () => {
  it("a lista pede a URL com os filtros", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { linhas: [], total: 0, pagina: 1, porPagina: 10 } });
    const { Wrapper } = envoltorio();
    const { result } = renderHook(() => useListaDeProspeccoes({ busca: "clin" }, 1, 10), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/prospeccao-da-casca?p=1&n=10&q=clin");
  });

  it("o detalhe sem id não consulta", () => {
    const { Wrapper } = envoltorio();
    renderHook(() => useDetalheDaProspeccao(null), { wrapper: Wrapper });
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("a ação vai ao POST do original, devolve o data e invalida a prospecção", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { paused: true } });
    const { Wrapper, invalidar } = envoltorio();
    const { result } = renderHook(() => useAcaoDaProspeccao(), { wrapper: Wrapper });
    let resposta: unknown;
    await act(async () => {
      resposta = await result.current.mutateAsync({ action: "pause", id: ID });
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/prospecting", { action: "pause", id: ID });
    expect(resposta).toEqual({ paused: true });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["prospeccao-da-casca"] });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-hooks.test.tsx`
Expected: FAIL (o módulo do hook não existe).

- [ ] **Step 3: `hooks/escale/useProspeccaoDaCasca.ts`**

```ts
"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { SITUACOES_QUE_PULSAM } from "@/lib/escale/prospeccao/apresentacao";
import { consultaDaLista } from "@/lib/escale/prospeccao/filtros";
import type {
  DetalheDaProspeccao,
  FiltrosDaProspeccao,
  OpcoesDaProspeccao,
  PaginaDeProspeccoes,
} from "@/lib/escale/prospeccao/tipos";
import type { CampaignConfig, SearchInput } from "@/lib/prospecting/schema";

/**
 * OS DADOS DA PROSPECÇÃO NA CASCA (fork Escale, Fase 8D). Lê pelas rotas do
 * fork; escreve só pelo `POST /api/v1/prospecting` do original. Sem tempo real
 * (as tabelas não estão na publicação): reconsulta enquanto algo anda.
 */
export const CHAVE_DA_PROSPECCAO = "prospeccao-da-casca";
export const RECONSULTA_DA_PROSPECCAO_MS = 10_000;
export const RECONSULTA_DA_BUSCA_MS = 5_000;

export function reconsultaDaLista(p: PaginaDeProspeccoes | undefined): number | false {
  return p?.linhas.some((l) => SITUACOES_QUE_PULSAM.has(l.situacao)) ? RECONSULTA_DA_PROSPECCAO_MS : false;
}

export function reconsultaDoDetalhe(d: DetalheDaProspeccao | undefined): number | false {
  if (d?.linha.situacao === "buscando") return RECONSULTA_DA_BUSCA_MS;
  return d?.linha.situacao === "em_progresso" ? RECONSULTA_DA_PROSPECCAO_MS : false;
}

export function useListaDeProspeccoes(filtros: FiltrosDaProspeccao, pagina: number, porPagina: number) {
  return useQuery({
    queryKey: [CHAVE_DA_PROSPECCAO, "lista", filtros, pagina, porPagina],
    queryFn: async () =>
      (
        await apiClient.get<{ data: PaginaDeProspeccoes }>(
          `/api/v1/prospeccao-da-casca?${consultaDaLista(filtros, pagina, porPagina)}`,
        )
      ).data,
    placeholderData: keepPreviousData,
    refetchInterval: (q) => reconsultaDaLista(q.state.data),
  });
}

export function useDetalheDaProspeccao(id: string | null) {
  return useQuery({
    queryKey: [CHAVE_DA_PROSPECCAO, "detalhe", id],
    enabled: id !== null,
    queryFn: async () =>
      (await apiClient.get<{ data: DetalheDaProspeccao }>(`/api/v1/prospeccao-da-casca/${id}`)).data,
    refetchInterval: (q) => reconsultaDoDetalhe(q.state.data),
  });
}

export function useOpcoesDaProspeccao() {
  return useQuery({
    queryKey: [CHAVE_DA_PROSPECCAO, "opcoes"],
    queryFn: async () =>
      (await apiClient.get<{ data: OpcoesDaProspeccao }>("/api/v1/prospeccao-da-casca/opcoes")).data,
    staleTime: 60_000,
  });
}

/** Os pedidos que a casca manda ao motor do original (`prospectingInputSchema`). */
export type PedidoDaProspeccao =
  | { action: "configure"; api_key: string }
  | { action: "search"; request_id: string; search: SearchInput }
  | { action: "start"; id: string; config: CampaignConfig }
  | { action: "pause"; id: string }
  | { action: "resume"; id: string }
  | { action: "adjust_pace"; id: string; daily_limit: number; interval_minutes: number }
  | { action: "select" | "select_in_queue"; id: string; candidate_ids: string[]; selected: boolean }
  | { action: "discard_unselected"; id: string };

export function useAcaoDaProspeccao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: PedidoDaProspeccao) =>
      (await apiClient.post<{ data: unknown }>("/api/v1/prospecting", pedido)).data,
    onSettled: () => qc.invalidateQueries({ queryKey: [CHAVE_DA_PROSPECCAO] }),
  });
}
```

- [ ] **Step 4: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-hooks.test.tsx && corepack pnpm prettier --write hooks/escale/useProspeccaoDaCasca.ts tests/unit/escale-prospeccao-hooks.test.tsx && corepack pnpm eslint hooks/escale/useProspeccaoDaCasca.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/escale/useProspeccaoDaCasca.ts tests/unit/escale-prospeccao-hooks.test.tsx
git commit -m "feat(escale): hooks da prospecção na casca (Fase 8D)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 4: As peças da lista (selo, barra, menu, tabela, filtros, chave e vazios)

Abra antes: 002, 007 e 014.

**Files:**
- Create: `components/escale/prospeccao/campos.tsx`, `components/escale/prospeccao/SeloDaProspeccao.tsx`, `components/escale/prospeccao/BarraDaProspeccao.tsx`, `components/escale/prospeccao/MenuDaProspeccao.tsx`, `components/escale/prospeccao/TabelaDeProspeccoes.tsx`, `components/escale/prospeccao/BarraDeFiltrosDaProspeccao.tsx`, `components/escale/prospeccao/BotaoDaChave.tsx`, `components/escale/prospeccao/VaziosDaProspeccao.tsx`, `tests/unit/escale-prospeccao-pecas.test.tsx`

**Interfaces:**
- Consumes: Task 1 (apresentação, tipos, rotas); `useAcaoDaProspeccao` (Task 3); `DicaAoPassar` (8A); `CLASSE_DO_TOM`, `CLASSE_DO_SEGMENTO`, `TOM_DA_DICA_DO_SEGMENTO`, `CLASSE_DO_TRILHO` (8A); `dataEHoraBr` (8A); `ESPERA_DA_BUSCA_MS` (8A); `SeletorDoFiltro` (3D); `JanelaDeConfirmacao` (casca); `CLASSE_DO_CAMPO` (`components/escale/filtros/controles.tsx`); `CONTEUDO_DO_MENU`, `ITEM_DO_MENU`, `SOMBRA_DO_MENU` (`components/escale/menu/estilos.ts`); `DropdownMenu*` (`components/ui/dropdown-menu`).
- Produces: `CampoDeTexto`, `CampoDeTextoLongo`, `ErrosDoPasso`, `RotuloDoCampo`, `Ajuda` (`campos.tsx`); `SeloDaSituacao({ situacao })`, `SeloDoProgresso({ progresso })`; `BarraDaProspeccao({ linha })`; `MenuDaProspeccao({ linha, aoContinuar, aoDuplicar })`; `TabelaDeProspeccoes({ linhas, carregando, erro, filtrando, fuso?, ocupadoId, nomeDoNumero, aoAbrir, aoPausar, aoRetomar, aoDuplicar, aoLimparFiltros, aoTentarDeNovo })`; `BarraDeFiltrosDaProspeccao({ filtros, aoMudar })`; `BotaoDaChave({ forma })`; `VazioSemChave()`, `VazioSemProspeccoes()`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-prospeccao-pecas.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BarraDaProspeccao } from "@/components/escale/prospeccao/BarraDaProspeccao";
import { BarraDeFiltrosDaProspeccao } from "@/components/escale/prospeccao/BarraDeFiltrosDaProspeccao";
import { BotaoDaChave } from "@/components/escale/prospeccao/BotaoDaChave";
import { SeloDaSituacao } from "@/components/escale/prospeccao/SeloDaProspeccao";
import { TabelaDeProspeccoes } from "@/components/escale/prospeccao/TabelaDeProspeccoes";
import { VazioSemProspeccoes } from "@/components/escale/prospeccao/VaziosDaProspeccao";
import { useAcaoDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { contagem, linha } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({ useAcaoDaProspeccao: vi.fn() }));

const mutateAsync = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockReset().mockResolvedValue({ configured: true });
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync, isPending: false } as never);
});
afterEach(() => vi.useRealTimers());

const props = {
  carregando: false,
  erro: false,
  filtrando: false,
  fuso: "America/Sao_Paulo",
  ocupadoId: null,
  nomeDoNumero: () => "Comercial",
  aoAbrir: vi.fn(),
  aoPausar: vi.fn(),
  aoRetomar: vi.fn(),
  aoDuplicar: vi.fn(),
  aoLimparFiltros: vi.fn(),
  aoTentarDeNovo: vi.fn(),
};

describe("selo e barra (D3, D5)", () => {
  it("o selo mostra o rótulo e pulsa em progresso", () => {
    render(<SeloDaSituacao situacao="em_progresso" />);
    const selo = screen.getByText("Em progresso");
    expect(selo.className).toContain("animate-pulse");
  });

  it("a barra descreve os segmentos; sem encontradas, o traço", () => {
    const { rerender } = render(<BarraDaProspeccao linha={linha()} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "2 com falha - 10%, 10 abordadas - 50%, 4 responderam - 20%, 1 qualificadas - 5%",
    );
    rerender(<BarraDaProspeccao linha={linha({ ...contagem() })} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("TabelaDeProspeccoes (002, D6, D8)", () => {
  it("linha: nome, subtítulo, data de início, número; clicar abre", async () => {
    render(<TabelaDeProspeccoes {...props} linhas={[linha()]} />);
    expect(screen.getByText("Clínicas Campinas")).toBeInTheDocument();
    expect(screen.getByText("20 empresas encontradas")).toBeInTheDocument();
    expect(screen.getByText("10/10/2026 12:39")).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Clínicas Campinas"));
    expect(props.aoAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: linha().id }));
  });

  it("Pausar em progresso, Retomar na pausada, sem abrir a linha", async () => {
    const { rerender } = render(<TabelaDeProspeccoes {...props} linhas={[linha()]} />);
    await userEvent.click(screen.getByRole("button", { name: "Pausar prospecção" }));
    expect(props.aoPausar).toHaveBeenCalled();
    expect(props.aoAbrir).not.toHaveBeenCalled();
    rerender(<TabelaDeProspeccoes {...props} linhas={[linha({ situacao: "pausada" })]} />);
    await userEvent.click(screen.getByRole("button", { name: "Retomar prospecção" }));
    expect(props.aoRetomar).toHaveBeenCalled();
  });

  it("⋮ do rascunho: Continuar rascunho e Duplicar", async () => {
    render(<TabelaDeProspeccoes {...props} linhas={[linha({ situacao: "rascunho" })]} />);
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    expect(await screen.findByRole("menuitem", { name: "Continuar rascunho" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: "Duplicar prospecção" }));
    expect(props.aoDuplicar).toHaveBeenCalled();
  });

  it("carregando, vazio por filtro e erro", async () => {
    const { rerender } = render(<TabelaDeProspeccoes {...props} linhas={[]} carregando />);
    expect(screen.getByRole("status", { name: "Carregando prospecções" })).toBeInTheDocument();
    rerender(<TabelaDeProspeccoes {...props} linhas={[]} filtrando />);
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(props.aoLimparFiltros).toHaveBeenCalled();
    rerender(<TabelaDeProspeccoes {...props} linhas={[]} erro />);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(props.aoTentarDeNovo).toHaveBeenCalled();
  });
});

describe("filtros (D7)", () => {
  it("a busca espera 500 ms", () => {
    vi.useFakeTimers();
    const aoMudar = vi.fn();
    render(<BarraDeFiltrosDaProspeccao filtros={{}} aoMudar={aoMudar} />);
    fireEvent.change(screen.getByPlaceholderText("Buscar prospecção"), { target: { value: "clin" } });
    expect(aoMudar).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(500));
    expect(aoMudar).toHaveBeenCalledWith({ busca: "clin" });
  });
});

describe("chave e vazio (D11)", () => {
  it("salva a chave pelo configure do original", async () => {
    render(<BotaoDaChave forma="icone" />);
    await userEvent.click(screen.getByRole("button", { name: "Configuração da prospecção" }));
    await userEvent.type(screen.getByLabelText("Chave da Apify"), "apify_api_1234567890");
    await userEvent.click(screen.getByRole("button", { name: "Salvar chave" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "configure", api_key: "apify_api_1234567890" });
  });

  it("o vazio leva à nova prospecção", () => {
    render(<VazioSemProspeccoes />);
    expect(screen.getByRole("link", { name: "Nova prospecção" })).toHaveAttribute("href", "/app/campaigns/prospeccao/nova");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-pecas.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 3: `components/escale/prospeccao/campos.tsx`**

```tsx
"use client";
import type { ReactNode } from "react";

import { CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";

/**
 * OS CAMPOS DO ASSISTENTE E DO DETALHE DA PROSPECÇÃO (fork Escale, Fase 8D;
 * 018): rótulo 13px/500, campo de 32px da Clint, ajuda 11px. Nenhum controle
 * nativo de seleção ou data (regra 2 do CLAUDE.md).
 */
export function RotuloDoCampo({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-medium text-casca-texto">
      {children}
    </label>
  );
}

export function Ajuda({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-casca-suave">{children}</p>;
}

export function CampoDeTexto({
  id,
  rotulo,
  valor,
  aoMudar,
  placeholder,
  numerico = false,
  tipo = "text",
  ajuda,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
  numerico?: boolean;
  tipo?: "text" | "password";
  ajuda?: string;
}) {
  return (
    <div className="space-y-1.5">
      <RotuloDoCampo htmlFor={id}>{rotulo}</RotuloDoCampo>
      <input
        id={id}
        type={tipo}
        autoComplete="off"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        inputMode={numerico ? "decimal" : undefined}
        className={CLASSE_DO_CAMPO}
      />
      {ajuda ? <Ajuda>{ajuda}</Ajuda> : null}
    </div>
  );
}

export function CampoDeTextoLongo({
  id,
  rotulo,
  valor,
  aoMudar,
  placeholder,
  ajuda,
  maximo,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
  ajuda?: string;
  maximo: number;
}) {
  return (
    <div className="space-y-1.5">
      <RotuloDoCampo htmlFor={id}>{rotulo}</RotuloDoCampo>
      <textarea
        id={id}
        value={valor}
        maxLength={maximo}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        className="min-h-24 w-full resize-y rounded-[4px] border border-transparent bg-casca-busca p-2.5 text-xs text-casca-texto outline-hidden placeholder:text-casca-meta focus:border-casca-marca focus:bg-surface"
      />
      {ajuda ? <Ajuda>{ajuda}</Ajuda> : null}
    </div>
  );
}

/** Os erros do passo, no topo do conteúdo, depois que a pessoa tentou seguir. */
export function ErrosDoPasso({ erros }: { erros: readonly string[] }) {
  if (!erros.length) return null;
  return (
    <ul role="alert" className="mb-4 space-y-1 rounded-md border border-casca-alerta bg-surface px-3 py-2 text-[12px] text-casca-alerta">
      {erros.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: `components/escale/prospeccao/SeloDaProspeccao.tsx`**

```tsx
"use client";
import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { useT } from "@/hooks/i18n/useT";
import type { TomDoStatus } from "@/lib/escale/campanhas/apresentacao";
import { CLASSE_DO_TOM } from "@/lib/escale/campanhas/cores";
import {
  DICA_DA_SITUACAO,
  ROTULO_DA_SITUACAO,
  ROTULO_DO_PROGRESSO,
  SITUACOES_QUE_PULSAM,
  TOM_DA_SITUACAO,
  TOM_DO_PROGRESSO,
} from "@/lib/escale/prospeccao/apresentacao";
import type { ProgressoDaEmpresa, SituacaoDaProspeccao } from "@/lib/escale/prospeccao/tipos";
import { cn } from "@/lib/utils";

/** O selo do molde 002 (22px, canto 4px, 12px), com os tons da 8A. */
function Selo({ rotulo, tom, pulsa = false }: { rotulo: string; tom: TomDoStatus; pulsa?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center whitespace-nowrap rounded-[4px] px-1.5 text-[12px] leading-none",
        CLASSE_DO_TOM[tom],
        pulsa && "motion-safe:animate-pulse",
      )}
    >
      {rotulo}
    </span>
  );
}

/** A situação da prospecção (D3), com a dica. */
export function SeloDaSituacao({ situacao }: { situacao: SituacaoDaProspeccao }) {
  const t = useT();
  return (
    <DicaAoPassar texto={t(DICA_DA_SITUACAO[situacao])}>
      <Selo
        rotulo={t(ROTULO_DA_SITUACAO[situacao])}
        tom={TOM_DA_SITUACAO[situacao]}
        pulsa={SITUACOES_QUE_PULSAM.has(situacao)}
      />
    </DicaAoPassar>
  );
}

/** O progresso de uma empresa (aba Detalhes). */
export function SeloDoProgresso({ progresso }: { progresso: ProgressoDaEmpresa }) {
  const t = useT();
  return <Selo rotulo={t(ROTULO_DO_PROGRESSO[progresso])} tom={TOM_DO_PROGRESSO[progresso]} />;
}
```

- [ ] **Step 5: `components/escale/prospeccao/BarraDaProspeccao.tsx`**

```tsx
"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { CLASSE_DO_SEGMENTO, CLASSE_DO_TOM, CLASSE_DO_TRILHO, TOM_DA_DICA_DO_SEGMENTO } from "@/lib/escale/campanhas/cores";
import {
  COR_DO_SEGMENTO_DA_PROSPECCAO,
  segmentosDaProspeccao,
  textoDoSegmentoDaProspeccao,
  type ChaveDaProspeccao,
} from "@/lib/escale/prospeccao/apresentacao";
import type { LinhaDeProspeccao } from "@/lib/escale/prospeccao/tipos";
import { cn } from "@/lib/utils";

/**
 * A BARRA DE RESULTADO DA PROSPECÇÃO (molde 002/008; D5): falhas, abordadas,
 * responderam e qualificadas sobre as encontradas, com as cores e a dica da
 * barra de WhatsApp (8A). Em progresso, as listras.
 */
export function BarraDaProspeccao({ linha }: { linha: LinhaDeProspeccao }) {
  const t = useT();
  const [sobre, setSobre] = useState<ChaveDaProspeccao | null>(null);
  if (linha.encontradas <= 0) return <span className="text-[11px] text-casca-meta">—</span>;

  let inicio = 0;
  const segmentos = segmentosDaProspeccao(linha).map((s) => {
    const comInicio = { ...s, inicio };
    inicio += s.largura;
    return comInicio;
  });
  const ativo = segmentos.find((s) => s.chave === sobre);
  const resumo = segmentos.length
    ? segmentos.map((s) => textoDoSegmentoDaProspeccao(s, t)).join(", ")
    : t("Nenhuma abordagem ainda");
  const listras = linha.situacao === "em_progresso";

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
            className={cn("h-full", CLASSE_DO_SEGMENTO[COR_DO_SEGMENTO_DA_PROSPECCAO[s.chave]], listras && "escale-listras")}
          />
        ))}
      </div>
      {ativo ? (
        <span
          role="tooltip"
          style={{ left: `${ativo.inicio + ativo.largura / 2}%` }}
          className={cn(
            "pointer-events-none absolute bottom-full z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium",
            CLASSE_DO_TOM[TOM_DA_DICA_DO_SEGMENTO[COR_DO_SEGMENTO_DA_PROSPECCAO[ativo.chave]]],
          )}
        >
          {textoDoSegmentoDaProspeccao(ativo, t)}
        </span>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: `components/escale/prospeccao/MenuDaProspeccao.tsx`**

```tsx
"use client";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { LinhaDeProspeccao } from "@/lib/escale/prospeccao/tipos";
import { Copy, EllipsisVertical, Pencil } from "@/lib/ui/icons-da-casca";

/** O ⋮ da prospecção (molde 007; D8): rascunho continua; toda linha duplica. */
export function MenuDaProspeccao({
  linha,
  aoContinuar,
  aoDuplicar,
}: {
  linha: LinhaDeProspeccao;
  aoContinuar: () => void;
  aoDuplicar: () => void;
}) {
  const t = useT();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t("Mais opções")}
        onClick={(e) => e.stopPropagation()}
        className="grid size-7 place-items-center rounded-casca-gatilho text-casca-texto-2 transition-colors hover:bg-casca-raia"
      >
        <EllipsisVertical size={18} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className={CONTEUDO_DO_MENU} style={SOMBRA_DO_MENU} onClick={(e) => e.stopPropagation()}>
        {linha.situacao === "rascunho" ? (
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={aoContinuar}>
            <Pencil size={14} aria-hidden />
            {t("Continuar rascunho")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem className={ITEM_DO_MENU} onSelect={aoDuplicar}>
          <Copy size={14} aria-hidden />
          {t("Duplicar prospecção")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 7: `components/escale/prospeccao/TabelaDeProspeccoes.tsx`**

```tsx
"use client";
import type { KeyboardEvent } from "react";

import { useT } from "@/hooks/i18n/useT";
import { dataEHoraBr } from "@/lib/escale/campanhas/apresentacao";
import { subtituloDaProspeccao } from "@/lib/escale/prospeccao/apresentacao";
import type { LinhaDeProspeccao } from "@/lib/escale/prospeccao/tipos";
import { Building2, CirclePause, Play } from "@/lib/ui/icons-da-casca";

import { BarraDaProspeccao } from "./BarraDaProspeccao";
import { MenuDaProspeccao } from "./MenuDaProspeccao";
import { SeloDaSituacao } from "./SeloDaProspeccao";

const COLUNAS = ["w-[28%] pl-6", "w-[14%]", "w-[18%]", "w-[22%]", "w-[12%]", "w-[6%]"];
const TITULOS = ["Prospecção", "Data de início", "Número", "Resultado", "Status"];

/**
 * A TABELA DE PROSPECÇÕES (molde 002; D6, D8): a linha com o quadrado, o nome
 * e o subtítulo, a data de início, o número, a barra, o selo, Pausar/Retomar e
 * o ⋮. Carregando, vazio por filtro e erro moram aqui; o vazio sem nenhuma
 * prospecção é da aba (`ListaDeProspeccoes`).
 */
export function TabelaDeProspeccoes({
  linhas,
  carregando,
  erro,
  filtrando,
  fuso,
  ocupadoId,
  nomeDoNumero,
  aoAbrir,
  aoPausar,
  aoRetomar,
  aoDuplicar,
  aoLimparFiltros,
  aoTentarDeNovo,
}: {
  linhas: LinhaDeProspeccao[];
  carregando: boolean;
  erro: boolean;
  filtrando: boolean;
  fuso?: string;
  ocupadoId: string | null;
  nomeDoNumero: (id: string | null) => string;
  aoAbrir: (l: LinhaDeProspeccao) => void;
  aoPausar: (l: LinhaDeProspeccao) => void;
  aoRetomar: (l: LinhaDeProspeccao) => void;
  aoDuplicar: (l: LinhaDeProspeccao) => void;
  aoLimparFiltros: () => void;
  aoTentarDeNovo: () => void;
}) {
  const t = useT();
  const tecla = (l: LinhaDeProspeccao) => (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === "Enter") aoAbrir(l);
  };

  return (
    <table className="w-full table-fixed border-collapse">
      <thead>
        <tr className="h-[42px] border-y border-casca-divisoria text-left text-[10px] font-semibold tracking-[0.1em] text-casca-texto uppercase">
          {TITULOS.map((titulo, i) => (
            <th key={titulo} className={COLUNAS[i]}>
              {t(titulo)}
            </th>
          ))}
          <th className={COLUNAS[5]}>
            <span className="sr-only">{t("Ações")}</span>
          </th>
        </tr>
      </thead>
      <tbody aria-busy={carregando}>
        {carregando ? (
          <tr role="status" aria-label={t("Carregando prospecções")}>
            <td colSpan={6}>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="mx-6 my-[19px] h-4 animate-pulse rounded bg-casca-busca" />
              ))}
            </td>
          </tr>
        ) : erro ? (
          <tr>
            <td colSpan={6} className="px-6 py-10 text-center text-[13px] text-casca-suave">
              <p>{t("Não foi possível carregar as prospecções.")}</p>
              <button type="button" onClick={aoTentarDeNovo} className="mt-3 text-[12px] font-medium text-casca-marca hover:underline">
                {t("Tentar novamente")}
              </button>
            </td>
          </tr>
        ) : linhas.length === 0 && filtrando ? (
          <tr>
            <td colSpan={6} className="px-6 py-10 text-center">
              <p className="text-[15px] font-semibold text-casca-texto">{t("Nenhuma prospecção encontrada")}</p>
              <p className="mt-2 text-[13px] text-casca-suave">{t("Tente ajustar a busca ou os filtros aplicados.")}</p>
              <button
                type="button"
                onClick={aoLimparFiltros}
                className="mt-4 inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
              >
                {t("Limpar filtros")}
              </button>
            </td>
          </tr>
        ) : (
          linhas.map((l) => (
            <tr
              key={l.id}
              tabIndex={0}
              onClick={() => aoAbrir(l)}
              onKeyDown={tecla(l)}
              className="h-[54px] cursor-pointer border-b border-casca-divisoria text-[11px] text-casca-texto transition-colors hover:bg-casca-busca focus-visible:bg-casca-busca focus-visible:outline-hidden"
            >
              <td className="pl-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-casca-marca-suave text-casca-marca">
                    <Building2 size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p title={l.nome} className="max-w-[200px] truncate text-[13px] font-medium text-casca-texto">
                      {l.nome}
                    </p>
                    <p className="text-[11px] text-casca-meta">{subtituloDaProspeccao(l, t)}</p>
                  </div>
                </div>
              </td>
              <td>{l.primeiraAbordagem ? dataEHoraBr(l.primeiraAbordagem, fuso) : "—"}</td>
              <td className="truncate">{l.numeroId ? nomeDoNumero(l.numeroId) : "—"}</td>
              <td>
                <BarraDaProspeccao linha={l} />
              </td>
              <td>
                <SeloDaSituacao situacao={l.situacao} />
              </td>
              <td>
                <div className="flex items-center justify-end gap-1 pr-3">
                  {l.situacao === "em_progresso" ? (
                    <button
                      type="button"
                      aria-label={t("Pausar prospecção")}
                      title={t("Pausar prospecção")}
                      disabled={ocupadoId === l.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        aoPausar(l);
                      }}
                      className="grid size-7 place-items-center rounded-casca-gatilho border border-casca-borda text-casca-texto-2 hover:bg-casca-raia disabled:opacity-50"
                    >
                      <CirclePause size={16} aria-hidden />
                    </button>
                  ) : l.situacao === "pausada" ? (
                    <button
                      type="button"
                      aria-label={t("Retomar prospecção")}
                      title={t("Retomar prospecção")}
                      disabled={ocupadoId === l.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        aoRetomar(l);
                      }}
                      className="grid size-7 place-items-center rounded-casca-gatilho bg-casca-marca text-accent-foreground hover:bg-casca-marca-forte disabled:opacity-50"
                    >
                      <Play size={14} aria-hidden />
                    </button>
                  ) : null}
                  <MenuDaProspeccao linha={l} aoContinuar={() => aoAbrir(l)} aoDuplicar={() => aoDuplicar(l)} />
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
```

`aoContinuar` reaproveita `aoAbrir`: num rascunho, abrir é continuar (D8). O `dataEHoraBr` da 8A formata no fuso dado; o teste espera 12:39 em São Paulo para 15:39Z.

- [ ] **Step 8: `components/escale/prospeccao/BarraDeFiltrosDaProspeccao.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

import { SeletorDoFiltro, type OpcaoDoFiltro } from "@/components/escale/conversas/filtros/SeletorDoFiltro";
import { useT } from "@/hooks/i18n/useT";
import { ESPERA_DA_BUSCA_MS } from "@/lib/escale/campanhas/filtros";
import { ROTULO_DA_SITUACAO } from "@/lib/escale/prospeccao/apresentacao";
import { SITUACOES_DA_PROSPECCAO, type FiltrosDaProspeccao, type SituacaoDaProspeccao } from "@/lib/escale/prospeccao/tipos";
import { Search } from "@/lib/ui/icons-da-casca";

/** A BARRA DE FILTROS DA PROSPECÇÃO (molde 002; D7): busca (500 ms) e Status. */
export function BarraDeFiltrosDaProspeccao({
  filtros,
  aoMudar,
}: {
  filtros: FiltrosDaProspeccao;
  aoMudar: (f: FiltrosDaProspeccao) => void;
}) {
  const t = useT();
  const [texto, setTexto] = useState(filtros.busca ?? "");

  useEffect(() => {
    if (texto === (filtros.busca ?? "")) return;
    const espera = setTimeout(() => aoMudar({ ...filtros, busca: texto.trim() ? texto : undefined }), ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(espera);
  }, [texto, filtros, aoMudar]);

  const opcoes: OpcaoDoFiltro<SituacaoDaProspeccao>[] = SITUACOES_DA_PROSPECCAO.map((s) => ({
    valor: s,
    rotulo: t(ROTULO_DA_SITUACAO[s]),
  })).sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative w-[220px] min-w-[180px] max-w-[280px]">
        <span className="sr-only">{t("Buscar prospecção")}</span>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("Buscar prospecção")}
          className="h-8 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-3 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:bg-surface focus:ring-1 focus:ring-casca-marca"
        />
        <Search size={16} aria-hidden className="pointer-events-none absolute top-2 right-2.5 text-casca-suave" />
      </label>
      <div className="w-[160px]">
        <SeletorDoFiltro
          aria-label={t("Status")}
          vazio={t("Status")}
          valores={filtros.situacoes ?? []}
          opcoes={opcoes}
          aoMudar={(v) => aoMudar({ ...filtros, situacoes: v.length ? v : undefined })}
        />
      </div>
    </div>
  );
}
```

O pai passa `aoMudar` estável (`useCallback`) para o efeito não rearmar a cada render (Task 7).

- [ ] **Step 9: `components/escale/prospeccao/BotaoDaChave.tsx`**

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { useAcaoDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { Settings } from "@/lib/ui/icons-da-casca";

import { Ajuda, CampoDeTexto } from "./campos";

/**
 * A CHAVE DA APIFY (D11; PRD E4): a engrenagem do cabeçalho ou o botão do
 * vazio abrem a janela; salvar usa o `configure` do original (que valida a
 * chave no provedor e cifra no servidor).
 */
export function BotaoDaChave({ forma }: { forma: "icone" | "contorno" }) {
  const t = useT();
  const [aberta, setAberta] = useState(false);
  const [chave, setChave] = useState("");
  const acao = useAcaoDaProspeccao();
  const tamanho = chave.trim().length;
  const valida = tamanho >= 10 && tamanho <= 500;

  async function salvar() {
    try {
      await acao.mutateAsync({ action: "configure", api_key: chave.trim() });
      toast.success(t("Chave de busca salva."));
      setChave("");
      setAberta(false);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("Não foi possível concluir a operação."));
    }
  }

  return (
    <>
      {forma === "icone" ? (
        <button
          type="button"
          aria-label={t("Configuração da prospecção")}
          title={t("Configuração da prospecção")}
          onClick={() => setAberta(true)}
          className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave transition-colors hover:bg-casca-raia hover:text-casca-texto"
        >
          <Settings size={16} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setAberta(true)}
          className="mt-4 inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
        >
          {t("Configurar chave")}
        </button>
      )}
      <JanelaDeConfirmacao
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo={t("Configuração da prospecção")}
        rotuloDoConfirmar={t("Salvar chave")}
        aoConfirmar={() => void salvar()}
        desabilitado={!valida}
        ocupado={acao.isPending}
        dica={valida ? undefined : t("A chave tem de 10 a 500 caracteres.")}
      >
        <div className="space-y-2">
          <CampoDeTexto id="prospeccao-chave" tipo="password" rotulo={t("Chave da Apify")} valor={chave} aoMudar={setChave} />
          <Ajuda>{t("A chave fica cifrada no servidor. Cada busca tem seu próprio limite de gasto.")}</Ajuda>
        </div>
      </JanelaDeConfirmacao>
    </>
  );
}
```

- [ ] **Step 10: `components/escale/prospeccao/VaziosDaProspeccao.tsx`**

```tsx
"use client";
import Link from "next/link";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { ROTA_DA_NOVA_PROSPECCAO } from "@/lib/escale/prospeccao/rotas";
import { Building2, Settings } from "@/lib/ui/icons-da-casca";

import { BotaoDaChave } from "./BotaoDaChave";

/** O molde do vazio (014): quadrado 56px, título 15px/600, texto 13px em coluna estreita. */
function Vazio({ icone, titulo, texto, children }: { icone: ReactNode; titulo: string; texto: string; children: ReactNode }) {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <span className="grid size-14 place-items-center rounded-[10px] bg-casca-marca-suave text-casca-marca">{icone}</span>
      <p className="mt-4 text-[15px] font-semibold text-casca-texto">{titulo}</p>
      <p className="mt-2 max-w-[260px] text-[13px] text-casca-suave">{texto}</p>
      {children}
    </div>
  );
}

export function VazioSemChave() {
  const t = useT();
  return (
    <Vazio
      icone={<Settings size={24} aria-hidden />}
      titulo={t("Configure a chave de busca")}
      texto={t("A prospecção busca empresas no Google Maps pela Apify. Salve a chave da sua conta para começar.")}
    >
      <BotaoDaChave forma="contorno" />
    </Vazio>
  );
}

export function VazioSemProspeccoes() {
  const t = useT();
  return (
    <Vazio
      icone={<Building2 size={24} aria-hidden />}
      titulo={t("Crie sua primeira prospecção")}
      texto={t("Encontre empresas fora do CRM e deixe um agente de IA fazer a primeira abordagem.")}
    >
      <Link
        href={ROTA_DA_NOVA_PROSPECCAO}
        className="mt-4 inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
      >
        {t("Nova prospecção")}
      </Link>
    </Vazio>
  );
}
```

- [ ] **Step 11: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-pecas.test.tsx && corepack pnpm prettier --write components/escale/prospeccao tests/unit/escale-prospeccao-pecas.test.tsx && corepack pnpm eslint components/escale/prospeccao && corepack pnpm typecheck`
Expected: PASS. Se `Pencil` não estiver em `lib/ui/icons-da-casca.ts`, use `SquarePen` (os dois existem na `main` de 19/10). O título da janela é "Configuração da prospecção" e o rótulo do campo é "Chave da Apify" de propósito: o Radix liga o título ao diálogo por `aria-labelledby`, e o mesmo texto nos dois faria o `getByLabelText` achar dois elementos.

- [ ] **Step 12: Commit**

```bash
git add components/escale/prospeccao tests/unit/escale-prospeccao-pecas.test.tsx
git commit -m "feat(escale): peças da lista de prospecções — selo, barra, menu, tabela, filtros, chave e vazios (Fase 8D)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 5: A janela de detalhe e o Sumário

Abra antes: 009.

**Files:**
- Create: `components/escale/prospeccao/detalhe/DetalheDaProspeccao.tsx`, `components/escale/prospeccao/detalhe/SumarioDaProspeccao.tsx`, `components/escale/prospeccao/detalhe/RitmoDaProspeccao.tsx`, `tests/unit/escale-prospeccao-sumario.test.tsx`

**Interfaces:**
- Consumes: `JanelaDoDetalhe`, `CartaoDoSumario`, `FunilDeConversao`, `SecaoDoSumario` (8C); Tasks 1, 3, 4 (`CampoDeTexto`); `numeroBr` (8A); `BotaoDaCasca` (casca).
- Produces: `DetalheDaProspeccao({ id, aoFechar, fuso? })` (renderiza `EmpresasDaProspeccao` na aba Detalhes — criado na Task 6; até lá a aba mostra um parágrafo, trocado no Step 3 da Task 6), `SumarioDaProspeccao({ detalhe, opcoes })`, `RitmoDaProspeccao({ detalhe })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-prospeccao-sumario.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DetalheDaProspeccao } from "@/components/escale/prospeccao/detalhe/DetalheDaProspeccao";
import { RitmoDaProspeccao } from "@/components/escale/prospeccao/detalhe/RitmoDaProspeccao";
import { SumarioDaProspeccao } from "@/components/escale/prospeccao/detalhe/SumarioDaProspeccao";
import { useAcaoDaProspeccao, useDetalheDaProspeccao, useOpcoesDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { detalhe, ID, linha, OPCOES } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({
  useAcaoDaProspeccao: vi.fn(),
  useDetalheDaProspeccao: vi.fn(),
  useOpcoesDaProspeccao: vi.fn(),
}));

const mutateAsync = vi.fn();
beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue({});
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync, isPending: false } as never);
  vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: OPCOES } as never);
  vi.mocked(useDetalheDaProspeccao).mockReturnValue({ data: detalhe(), isError: false, refetch: vi.fn() } as never);
});

describe("DetalheDaProspeccao (009; D10)", () => {
  it("rótulo, nome, abas e Pausar em progresso", async () => {
    render(<DetalheDaProspeccao id={ID} aoFechar={vi.fn()} />);
    expect(screen.getByText("INFORMAÇÕES DA PROSPECÇÃO")).toBeInTheDocument();
    expect(screen.getByText("Clínicas Campinas")).toBeInTheDocument();
    expect(screen.getByText("Sumário")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Pausar prospecção" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "pause", id: ID });
  });

  it("pausada mostra Retomar", async () => {
    vi.mocked(useDetalheDaProspeccao).mockReturnValue({ data: detalhe({ status: "paused", linha: linha({ situacao: "pausada" }) }), isError: false } as never);
    render(<DetalheDaProspeccao id={ID} aoFechar={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Retomar prospecção" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "resume", id: ID });
  });
});

describe("SumarioDaProspeccao", () => {
  it("cartões, funil, busca com custo em US$ e a abordagem com nomes", () => {
    render(<SumarioDaProspeccao detalhe={detalhe()} opcoes={OPCOES} />);
    expect(screen.getByText("Encontradas")).toBeInTheDocument();
    expect(screen.getByText("% sobre encontradas")).toBeInTheDocument();
    expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
    expect(screen.getByText("US$ 0,45")).toBeInTheDocument();
    expect(screen.getByText("3 resultados repetidos ou indisponíveis foram desconsiderados.")).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    expect(screen.getByText("Sofia")).toBeInTheDocument();
    expect(screen.getByText("Prospecção ativa · Abordado → Qualificado")).toBeInTheDocument();
    expect(screen.getByText("LIA 2026/01")).toBeInTheDocument();
  });

  it("sem configuração, avisa", () => {
    render(<SumarioDaProspeccao detalhe={detalhe({ status: "draft", config: null })} opcoes={OPCOES} />);
    expect(screen.getByText("A abordagem ainda não foi configurada.")).toBeInTheDocument();
  });
});

describe("RitmoDaProspeccao", () => {
  it("rodando: só o texto, sem editar", () => {
    render(<RitmoDaProspeccao detalhe={detalhe()} />);
    expect(screen.getByText("10 abordagens em 24 horas, com pelo menos 15 minutos entre elas.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar ritmo" })).not.toBeInTheDocument();
  });

  it("pausada: edita e salva pelo adjust_pace", async () => {
    render(<RitmoDaProspeccao detalhe={detalhe({ status: "paused" })} />);
    await userEvent.click(screen.getByRole("button", { name: "Editar ritmo" }));
    const diario = screen.getByLabelText("Máximo em 24 horas");
    await userEvent.clear(diario);
    await userEvent.type(diario, "20");
    await userEvent.click(screen.getByRole("button", { name: "Salvar ritmo" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "adjust_pace", id: ID, daily_limit: 20, interval_minutes: 15 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-sumario.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 3: `components/escale/prospeccao/detalhe/RitmoDaProspeccao.tsx`**

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { useAcaoDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { textoDoRitmo } from "@/lib/escale/prospeccao/apresentacao";
import { inteiroDoTexto } from "@/lib/escale/prospeccao/assistente";
import type { DetalheDaProspeccao } from "@/lib/escale/prospeccao/tipos";

import { CampoDeTexto } from "../campos";

/**
 * O RITMO DA PROSPECÇÃO (D10): o texto sempre; com a campanha pausada,
 * "Editar ritmo" troca o limite por dia e o intervalo (`adjust_pace` do
 * original, que só aceita campanha pausada).
 */
export function RitmoDaProspeccao({ detalhe }: { detalhe: DetalheDaProspeccao }) {
  const t = useT();
  const acao = useAcaoDaProspeccao();
  const [edicao, setEdicao] = useState<{ diario: string; intervalo: string } | null>(null);
  const config = detalhe.config;
  if (!config) return null;

  const diario = edicao ? inteiroDoTexto(edicao.diario) : null;
  const intervalo = edicao ? inteiroDoTexto(edicao.intervalo) : null;
  const valido = diario !== null && diario >= 1 && diario <= 50 && intervalo !== null && intervalo >= 5 && intervalo <= 1440;

  async function salvar() {
    if (!valido || diario === null || intervalo === null) return;
    try {
      await acao.mutateAsync({ action: "adjust_pace", id: detalhe.linha.id, daily_limit: diario, interval_minutes: intervalo });
      toast.success(t("Ritmo atualizado. A campanha continua pausada."));
      setEdicao(null);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("Não foi possível concluir a operação."));
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-casca-texto">{textoDoRitmo(config.daily_limit, config.interval_minutes, t)}</p>
      {detalhe.status === "paused" && !edicao ? (
        <button
          type="button"
          onClick={() => setEdicao({ diario: String(config.daily_limit), intervalo: String(config.interval_minutes) })}
          className="text-[12px] font-medium text-casca-marca hover:underline"
        >
          {t("Editar ritmo")}
        </button>
      ) : null}
      {edicao ? (
        <div className="space-y-3 rounded-md border border-casca-borda p-3">
          <div className="grid grid-cols-2 gap-3">
            <CampoDeTexto id="ritmo-diario" numerico rotulo={t("Máximo em 24 horas")} valor={edicao.diario} aoMudar={(v) => setEdicao({ ...edicao, diario: v })} />
            <CampoDeTexto id="ritmo-intervalo" numerico rotulo={t("Intervalo mínimo (minutos)")} valor={edicao.intervalo} aoMudar={(v) => setEdicao({ ...edicao, intervalo: v })} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEdicao(null)} className="h-8 rounded-casca-gatilho px-3 text-[12px] text-casca-texto-2 hover:bg-casca-raia">
              {t("Cancelar")}
            </button>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={!valido || acao.isPending}
              className="h-8 rounded-casca-gatilho bg-casca-marca px-3 text-[12px] font-medium text-accent-foreground hover:bg-casca-marca-forte disabled:opacity-50"
            >
              {t("Salvar ritmo")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: `components/escale/prospeccao/detalhe/SumarioDaProspeccao.tsx`**

```tsx
"use client";
import Link from "next/link";
import type { ReactNode } from "react";

import { CartaoDoSumario } from "@/components/escale/campanhas/molde/CartaoDoSumario";
import { FunilDeConversao } from "@/components/escale/campanhas/molde/FunilDeConversao";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { custoEmDolar, etapasDoFunil, textoDoPorcento } from "@/lib/escale/prospeccao/apresentacao";
import { rotaDoAgente } from "@/lib/escale/prospeccao/rotas";
import type { DetalheDaProspeccao, OpcoesDaProspeccao } from "@/lib/escale/prospeccao/tipos";

import { RitmoDaProspeccao } from "./RitmoDaProspeccao";

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] text-casca-suave">{rotulo}</dt>
      <dd className="text-[12px] text-casca-texto">{children}</dd>
    </div>
  );
}

/**
 * O SUMÁRIO DA PROSPECÇÃO (molde 009; D10): cartões e funil sobre as
 * encontradas, a fila, a busca com o custo em US$ e, à direita, a abordagem
 * (o que a Clint mostra na prévia do celular; aqui quem escreve é o agente).
 */
export function SumarioDaProspeccao({ detalhe, opcoes }: { detalhe: DetalheDaProspeccao; opcoes: OpcoesDaProspeccao | undefined }) {
  const t = useT();
  const c = detalhe.linha;
  const config = detalhe.config;
  const numero = opcoes?.numeros.find((n) => n.id === config?.channel_session_id)?.nome ?? "—";
  const agente = opcoes?.agentes.find((a) => a.id === config?.agent_id)?.nome ?? "—";
  const etapa = (id: string | undefined) => opcoes?.etapas.find((e) => e.id === id);
  const entrada = etapa(config?.stage_id);
  const qualificados = etapa(config?.qualified_stage_id);
  const funil = entrada ? `${entrada.funilNome} · ${entrada.nome} → ${qualificados?.nome ?? "—"}` : "—";
  const cartao = (rotulo: string, dica: string, parte: number) => (
    <CartaoDoSumario rotulo={t(rotulo)} dica={t(dica)} valor={textoDoPorcento(parte, c.encontradas)} complemento={numeroBr(parte)} />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <CartaoDoSumario rotulo={t("Encontradas")} dica={t("Empresas que a busca trouxe, sem as repetidas ou fechadas.")} valor={numeroBr(c.encontradas)} />
          {cartao("Abordadas", "Empresas que receberam a primeira mensagem do agente.", c.abordadas)}
          {cartao("Responderam", "Empresas que responderam à abordagem.", c.responderam)}
          {cartao("Qualificadas", "Empresas que o agente moveu para a etapa de qualificados.", c.qualificadas)}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <FunilDeConversao etapas={etapasDoFunil(c, t)} legenda={t("% sobre encontradas")} />
          <SecaoDoSumario titulo={t("Fila")}>
            <dl className="grid gap-3">
              <Item rotulo={t("Na fila")}>{numeroBr(c.naFila)}</Item>
              <Item rotulo={t("Não abordadas")}>{numeroBr(c.naoAbordadas)}</Item>
              <Item rotulo={t("Com falha")}>{numeroBr(c.falhas)}</Item>
            </dl>
          </SecaoDoSumario>
        </div>
        <SecaoDoSumario titulo={t("Busca")}>
          <dl className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <Item rotulo={t("Público ou segmento")}>{detalhe.busca.niche}</Item>
            <Item rotulo={t("Cidade ou região")}>{detalhe.busca.location}</Item>
            <Item rotulo={t("Até quantas empresas")}>{numeroBr(detalhe.busca.limit)}</Item>
            <Item rotulo={t("Teto da busca (US$)")}>{custoEmDolar(detalhe.busca.budget_usd)}</Item>
            <Item rotulo={t("Custo da busca")}>{custoEmDolar(detalhe.custoUsd)}</Item>
          </dl>
          {detalhe.repetidas > 0 ? (
            <p className="mt-3 text-[11px] text-casca-suave">
              {t("{n} resultados repetidos ou indisponíveis foram desconsiderados.").replace("{n}", numeroBr(detalhe.repetidas))}
            </p>
          ) : null}
          {detalhe.erro ? <p className="mt-3 text-[12px] text-casca-alerta">{detalhe.erro}</p> : null}
        </SecaoDoSumario>
      </div>
      <SecaoDoSumario titulo={t("Abordagem")}>
        {config ? (
          <dl className="grid gap-3">
            <Item rotulo={t("Número")}>{numero}</Item>
            <Item rotulo={t("Agente de IA")}>
              <span className="block">{agente}</span>
              <Link href={rotaDoAgente(config.agent_id)} className="text-[11px] text-casca-marca hover:underline">
                {t("Configurações avançadas do agente")}
              </Link>
            </Item>
            <Item rotulo={t("Funil")}>{funil}</Item>
            <Item rotulo={t("Quando a empresa entra no funil")}>
              {config.funnel_entry === "on_send" ? t("Só quando for abordada (recomendado)") : t("Todas ao iniciar")}
            </Item>
            <Item rotulo={t("Base legal")}>{config.legal_basis_ref}</Item>
            <Item rotulo={t("Ritmo")}>
              <RitmoDaProspeccao detalhe={detalhe} />
            </Item>
          </dl>
        ) : (
          <p className="text-[12px] text-casca-suave">{t("A abordagem ainda não foi configurada.")}</p>
        )}
      </SecaoDoSumario>
    </div>
  );
}
```

- [ ] **Step 5: `components/escale/prospeccao/detalhe/DetalheDaProspeccao.tsx`**

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDoDetalhe } from "@/components/escale/campanhas/molde/JanelaDoDetalhe";
import { useAcaoDaProspeccao, useDetalheDaProspeccao, useOpcoesDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { DetalheDaProspeccao as Detalhe } from "@/lib/escale/prospeccao/tipos";
import { CirclePause, Play } from "@/lib/ui/icons-da-casca";

import { SumarioDaProspeccao } from "./SumarioDaProspeccao";

type Aba = "sumario" | "detalhes";

function BotaoDePausa({ detalhe }: { detalhe: Detalhe }) {
  const t = useT();
  const acao = useAcaoDaProspeccao();
  const situacao = detalhe.linha.situacao;
  if (situacao !== "em_progresso" && situacao !== "pausada") return null;
  const pausar = situacao === "em_progresso";

  async function executar() {
    try {
      await acao.mutateAsync({ action: pausar ? "pause" : "resume", id: detalhe.linha.id });
      toast.success(pausar ? t("Novas abordagens pausadas.") : t("Prospecção retomada."));
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("Não foi possível concluir a operação."));
    }
  }

  return (
    <button
      type="button"
      onClick={() => void executar()}
      disabled={acao.isPending}
      className={
        pausar
          ? "inline-flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia disabled:opacity-50"
          : "inline-flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-marca px-3.5 text-[12px] font-medium text-accent-foreground hover:bg-casca-marca-forte disabled:opacity-50"
      }
    >
      {pausar ? <CirclePause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
      {pausar ? t("Pausar prospecção") : t("Retomar prospecção")}
    </button>
  );
}

/**
 * A JANELA DE DETALHE DA PROSPECÇÃO (molde 009/012, peças da 8C; D10):
 * "INFORMAÇÕES DA PROSPECÇÃO", o nome, Pausar/Retomar e as abas Sumário e
 * Detalhes. Reconsulta sozinha enquanto busca ou aborda (Task 3).
 */
export function DetalheDaProspeccao({ id, aoFechar }: { id: string; aoFechar: () => void; fuso?: string }) {
  const t = useT();
  const [aba, setAba] = useState<Aba>("sumario");
  const detalhe = useDetalheDaProspeccao(id);
  const opcoes = useOpcoesDaProspeccao();
  const d = detalhe.data;

  return (
    <JanelaDoDetalhe
      aberta
      aoFechar={aoFechar}
      rotulo={t("INFORMAÇÕES DA PROSPECÇÃO")}
      titulo={d?.linha.nome ?? ""}
      acoes={d ? <BotaoDePausa detalhe={d} /> : undefined}
      abas={[
        { valor: "sumario", rotulo: t("Sumário") },
        { valor: "detalhes", rotulo: t("Detalhes") },
      ]}
      abaAtiva={aba}
      aoTrocarAba={(v) => setAba(v === "detalhes" ? "detalhes" : "sumario")}
    >
      {detalhe.isError ? (
        <div className="py-10 text-center text-[13px] text-casca-suave">
          <p>{t("Não foi possível carregar a prospecção.")}</p>
          <button type="button" onClick={() => void detalhe.refetch()} className="mt-3 text-[12px] font-medium text-casca-marca hover:underline">
            {t("Tentar novamente")}
          </button>
        </div>
      ) : !d ? (
        <p role="status" className="py-10 text-center text-[13px] text-casca-suave">
          {t("Carregando prospecção")}
        </p>
      ) : aba === "sumario" ? (
        <SumarioDaProspeccao detalhe={d} opcoes={opcoes.data} />
      ) : (
        <p className="py-10 text-center text-[13px] text-casca-suave">{t("Detalhes")}</p>
      )}
    </JanelaDoDetalhe>
  );
}
```

O ramo `aba === "detalhes"` vira `<EmpresasDaProspeccao detalhe={d} />` na Task 6, Step 4.

- [ ] **Step 6: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-sumario.test.tsx && corepack pnpm prettier --write components/escale/prospeccao/detalhe tests/unit/escale-prospeccao-sumario.test.tsx && corepack pnpm eslint components/escale/prospeccao/detalhe && corepack pnpm typecheck`
Expected: PASS. O `CartaoDoSumario` da 8C põe o "·" antes do `complemento` (passe só o número); se o `FunilDeConversao` mostrar a legenda só com outra prop, ajuste ao nome real (Task 1, Step 1).

- [ ] **Step 7: Commit**

```bash
git add components/escale/prospeccao/detalhe tests/unit/escale-prospeccao-sumario.test.tsx
git commit -m "feat(escale): janela de detalhe da prospecção com o Sumário e o ritmo editável (Fase 8D)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 6: A aba Detalhes (empresas, progresso, seleção e excluir desmarcadas)

Abra antes: 012.

**Files:**
- Create: `components/escale/prospeccao/detalhe/EmpresasDaProspeccao.tsx`, `tests/unit/escale-prospeccao-empresas.test.tsx`
- Modify: `components/escale/prospeccao/detalhe/DetalheDaProspeccao.tsx` (o ramo da aba Detalhes)

**Interfaces:**
- Consumes: `podeSelecionar`, `acaoDaSelecao`, `marcavel`, `descartaveis`, `filtrarEmpresas` (Task 1); `ROTULO_DO_PROGRESSO` (Task 1); `rotaDaConversa` (Task 1); `useAcaoDaProspeccao` (Task 3); `SeloDoProgresso` (Task 4); `CaixaDaCasca`, `PaginacaoDaCasca`, `JanelaDeConfirmacao` (casca); `SeletorDoFiltro` (3D); `safePublicLink` (`lib/prospecting/schema.ts`).
- Produces: `EmpresasDaProspeccao({ detalhe })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-prospeccao-empresas.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmpresasDaProspeccao } from "@/components/escale/prospeccao/detalhe/EmpresasDaProspeccao";
import { useAcaoDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { RAZAO_NAO_SELECIONADA } from "@/lib/prospecting/schema";
import { detalhe, empresa, ID } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({ useAcaoDaProspeccao: vi.fn() }));

const mutateAsync = vi.fn();
beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue({});
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync, isPending: false } as never);
});

const DUAS = [
  empresa({ id: "a" }),
  empresa({ id: "b", progresso: "qualified", conversaId: null, dados: { ...empresa().dados, name: "Studio Pele", phone: null } }),
];

describe("EmpresasDaProspeccao (012; D10)", () => {
  it("tabela: empresa, telefone, progresso, conversa; contagem", () => {
    render(<EmpresasDaProspeccao detalhe={detalhe({ empresas: DUAS })} />);
    expect(screen.getByText("2 empresas")).toBeInTheDocument();
    expect(screen.getByText("Clínica Bela")).toBeInTheDocument();
    expect(screen.getByText("Sem telefone")).toBeInTheDocument();
    expect(screen.getByText("Respondeu")).toBeInTheDocument();
    expect(screen.getByText("Qualificado")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Abrir conversa" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Abrir conversa" })).toHaveAttribute("href", "/app/inbox?id=v1");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("busca por nome", () => {
    render(<EmpresasDaProspeccao detalhe={detalhe({ empresas: DUAS })} />);
    fireEvent.change(screen.getByPlaceholderText("Buscar empresa"), { target: { value: "pele" } });
    expect(screen.queryByText("Clínica Bela")).not.toBeInTheDocument();
    expect(screen.getByText("Studio Pele")).toBeInTheDocument();
  });

  it("rascunho: caixas e Desmarcar todas pelo select", async () => {
    const rascunho = detalhe({ status: "draft", empresas: [empresa({ id: "a", status: "new", progresso: "new" }), empresa({ id: "b", status: "new", progresso: "new" })] });
    render(<EmpresasDaProspeccao detalhe={rascunho} />);
    expect(screen.getByText("Somente as empresas marcadas entram na fila ao iniciar as abordagens.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Desmarcar todas" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "select", id: ID, candidate_ids: ["a", "b"], selected: false });
  });

  it("pausada: desmarcar uma na fila vai pelo select_in_queue", async () => {
    const pausada = detalhe({ status: "paused", empresas: [empresa({ id: "a", status: "queued", progresso: "queued", conversaId: null, negocioId: null })] });
    render(<EmpresasDaProspeccao detalhe={pausada} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Marcar empresa para abordagem: Clínica Bela" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "select_in_queue", id: ID, candidate_ids: ["a"], selected: false });
  });

  it("excluir desmarcadas pede confirmação e usa o discard_unselected", async () => {
    const pausada = detalhe({
      status: "paused",
      empresas: [empresa({ id: "a", status: "skipped", selecionada: false, erro: RAZAO_NAO_SELECIONADA, conversaId: null, negocioId: null, progresso: "skipped" })],
    });
    render(<EmpresasDaProspeccao detalhe={pausada} />);
    await userEvent.click(screen.getByRole("button", { name: "Excluir desmarcadas (1)" }));
    expect(screen.getByText("As empresas desmarcadas saem desta lista e podem aparecer de novo numa busca futura. Esta ação não pode ser desfeita.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Excluir desmarcadas" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "discard_unselected", id: ID });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-empresas.test.tsx`
Expected: FAIL (o componente não existe).

- [ ] **Step 3: `components/escale/prospeccao/detalhe/EmpresasDaProspeccao.tsx`**

```tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { SeletorDoFiltro, type OpcaoDoFiltro } from "@/components/escale/conversas/filtros/SeletorDoFiltro";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { useAcaoDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DO_PROGRESSO, textoDasEmpresas } from "@/lib/escale/prospeccao/apresentacao";
import { rotaDaConversa } from "@/lib/escale/prospeccao/rotas";
import { acaoDaSelecao, descartaveis, filtrarEmpresas, marcavel, podeSelecionar } from "@/lib/escale/prospeccao/selecao";
import { PROGRESSOS_DA_EMPRESA, type DetalheDaProspeccao, type ProgressoDaEmpresa } from "@/lib/escale/prospeccao/tipos";
import { safePublicLink } from "@/lib/prospecting/schema";
import { Search } from "@/lib/ui/icons-da-casca";

import { SeloDoProgresso } from "../SeloDaProspeccao";

const POR_PAGINA_DAS_EMPRESAS = [20, 50, 100] as const;
const BOTAO =
  "inline-flex h-7 items-center rounded-casca-gatilho border border-casca-borda px-2.5 text-[11px] font-medium text-casca-texto hover:bg-casca-raia disabled:opacity-50";

/**
 * A ABA DETALHES DA PROSPECÇÃO (molde 012; D10): busca, filtro de Progresso,
 * contagem, a tabela por empresa com o link para a conversa e, em rascunho ou
 * pausada, a seleção e "Excluir desmarcadas" — com as regras do servidor do
 * original (`lib/escale/prospeccao/selecao.ts`).
 */
export function EmpresasDaProspeccao({ detalhe }: { detalhe: DetalheDaProspeccao }) {
  const t = useT();
  const acao = useAcaoDaProspeccao();
  const [busca, setBusca] = useState("");
  const [progressos, setProgressos] = useState<ProgressoDaEmpresa[]>([]);
  const [mostrarDesmarcadas, setMostrarDesmarcadas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_DAS_EMPRESAS[0]);
  const [confirmando, setConfirmando] = useState(false);

  const pode = podeSelecionar(detalhe);
  const visiveis = filtrarEmpresas(detalhe.empresas, { busca, progressos, mostrarDesmarcadas, podeSelecionar: pode });
  const elegiveis = pode ? detalhe.empresas.filter((e) => marcavel(e, detalhe)) : [];
  const todasMarcadas = elegiveis.length > 0 && elegiveis.every((e) => e.selecionada);
  const nenhumaMarcada = elegiveis.every((e) => !e.selecionada);
  const desmarcadas = detalhe.empresas.filter((e) => !e.selecionada);
  const apagaveis = descartaveis(detalhe.empresas);
  const fatia = visiveis.slice((pagina - 1) * porPagina, pagina * porPagina);
  const opcoesDeProgresso: OpcaoDoFiltro<ProgressoDaEmpresa>[] = PROGRESSOS_DA_EMPRESA.map((p) => ({
    valor: p,
    rotulo: t(ROTULO_DO_PROGRESSO[p]),
  }));

  async function executar(pedido: Parameters<typeof acao.mutateAsync>[0], sucesso: string) {
    try {
      await acao.mutateAsync(pedido);
      toast.success(t(sucesso));
      return true;
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("Não foi possível concluir a operação."));
      return false;
    }
  }

  const marcar = (ids: string[], selected: boolean) =>
    void executar(
      { action: acaoDaSelecao(detalhe), id: detalhe.linha.id, candidate_ids: ids, selected },
      "Seleção da fila atualizada.",
    );

  async function excluir() {
    if (await executar({ action: "discard_unselected", id: detalhe.linha.id }, "Empresas desmarcadas excluídas."))
      setConfirmando(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-[240px]">
          <span className="sr-only">{t("Buscar empresa")}</span>
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
            placeholder={t("Buscar empresa")}
            className="h-8 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-3 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:bg-surface focus:ring-1 focus:ring-casca-marca"
          />
          <Search size={16} aria-hidden className="pointer-events-none absolute top-2 right-2.5 text-casca-suave" />
        </label>
        <div className="w-[160px]">
          <SeletorDoFiltro
            aria-label={t("Progresso")}
            vazio={t("Progresso")}
            valores={progressos}
            opcoes={opcoesDeProgresso}
            aoMudar={(v) => {
              setProgressos(v);
              setPagina(1);
            }}
          />
        </div>
        <span className="ml-auto text-[12px] text-casca-suave">{textoDasEmpresas(visiveis.length, t)}</span>
      </div>

      {pode ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-casca-busca px-3 py-2">
          <span className="text-[11px] text-casca-suave">
            {detalhe.status === "draft"
              ? t("Somente as empresas marcadas entram na fila ao iniciar as abordagens.")
              : t("Com a campanha pausada, marque ou desmarque as empresas que ainda estão na fila. Quem já foi abordado não muda.")}
          </span>
          <span className="ml-auto flex flex-wrap gap-2">
            <button type="button" className={BOTAO} disabled={acao.isPending || todasMarcadas} onClick={() => marcar(elegiveis.map((e) => e.id), true)}>
              {t("Marcar todas")}
            </button>
            <button type="button" className={BOTAO} disabled={acao.isPending || nenhumaMarcada} onClick={() => marcar(elegiveis.map((e) => e.id), false)}>
              {t("Desmarcar todas")}
            </button>
            {desmarcadas.length ? (
              <button type="button" className={BOTAO} onClick={() => setMostrarDesmarcadas((m) => !m)}>
                {mostrarDesmarcadas ? t("Esconder desmarcadas") : `${t("Mostrar desmarcadas")} (${desmarcadas.length})`}
              </button>
            ) : null}
            {apagaveis.length ? (
              <button type="button" className={BOTAO} onClick={() => setConfirmando(true)}>
                {`${t("Excluir desmarcadas")} (${apagaveis.length})`}
              </button>
            ) : null}
          </span>
        </div>
      ) : null}

      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="h-10 border-b border-casca-divisoria text-left text-[10px] font-semibold tracking-[0.1em] text-casca-texto uppercase">
            {pode ? <th className="w-10 pl-2" /> : null}
            <th className="w-[26%]">{t("Empresa")}</th>
            <th className="w-[16%]">{t("Telefone")}</th>
            <th>{t("Informações")}</th>
            <th className="w-[16%]">{t("Progresso")}</th>
            <th className="w-[12%]">{t("Conversa")}</th>
          </tr>
        </thead>
        <tbody>
          {fatia.length === 0 ? (
            <tr>
              <td colSpan={pode ? 6 : 5} className="py-8 text-center text-[12px] text-casca-suave">
                {t("Nenhuma empresa neste filtro.")}
              </td>
            </tr>
          ) : (
            fatia.map((e) => {
              const site = safePublicLink(e.dados.website);
              return (
                <tr key={e.id} className="border-b border-casca-divisoria align-top text-[12px] text-casca-texto">
                  {pode ? (
                    <td className="py-3 pl-2">
                      {marcavel(e, detalhe) ? (
                        <CaixaDaCasca
                          marcada={e.selecionada}
                          aoMudar={(v) => marcar([e.id], v)}
                          aria-label={`${t("Marcar empresa para abordagem")}: ${e.dados.name}`}
                          desabilitada={acao.isPending}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td className="py-3">
                    <p className="font-medium">{e.dados.name}</p>
                    {e.dados.category ? <p className="text-[11px] text-casca-meta">{e.dados.category}</p> : null}
                  </td>
                  <td className="py-3">{e.dados.phone ?? t("Sem telefone")}</td>
                  <td className="py-3 text-[11px] text-casca-suave">
                    {e.dados.address ? <p>{e.dados.address}</p> : null}
                    {site ? (
                      <a href={site} target="_blank" rel="noreferrer" className="text-casca-marca hover:underline">
                        {t("Site da empresa")}
                      </a>
                    ) : null}
                    <p>
                      {e.dados.rating === null ? "—" : e.dados.rating.toLocaleString("pt-BR")} ★ · {(e.dados.reviews ?? 0).toLocaleString("pt-BR")} {t("avaliações")}
                    </p>
                  </td>
                  <td className="py-3">
                    <SeloDoProgresso progresso={e.progresso} />
                    {e.erro ? <p className="mt-1 text-[11px] text-casca-suave">{e.erro}</p> : null}
                  </td>
                  <td className="py-3">
                    {e.conversaId ? (
                      <Link href={rotaDaConversa(e.conversaId)} className="text-casca-marca hover:underline">
                        {t("Abrir conversa")}
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {visiveis.length > POR_PAGINA_DAS_EMPRESAS[0] ? (
        <PaginacaoDaCasca
          pagina={pagina}
          total={visiveis.length}
          porPagina={porPagina}
          opcoesPorPagina={POR_PAGINA_DAS_EMPRESAS}
          aoMudarPagina={setPagina}
          aoMudarPorPagina={(n) => {
            setPorPagina(n);
            setPagina(1);
          }}
        />
      ) : null}

      <JanelaDeConfirmacao
        aberta={confirmando}
        aoFechar={() => setConfirmando(false)}
        titulo={t("Excluir desmarcadas")}
        rotuloDoConfirmar={t("Excluir desmarcadas")}
        aoConfirmar={() => void excluir()}
        perigo
        ocupado={acao.isPending}
      >
        <p className="text-[13px] text-casca-texto">
          {t("As empresas desmarcadas saem desta lista e podem aparecer de novo numa busca futura. Esta ação não pode ser desfeita.")}
        </p>
      </JanelaDeConfirmacao>
    </div>
  );
}
```

No teste de excluir, depois de abrir a janela existem dois botões com "Excluir desmarcadas": o da barra (com "(1)") e o de confirmar (sem número). O `getByRole("button", { name: "Excluir desmarcadas" })` casa o nome exato, que é o da janela.

- [ ] **Step 4: Ligar a aba em `DetalheDaProspeccao.tsx`**

Acrescente o import `import { EmpresasDaProspeccao } from "./EmpresasDaProspeccao";` e troque

```tsx
        <p className="py-10 text-center text-[13px] text-casca-suave">{t("Detalhes")}</p>
```

por

```tsx
        <EmpresasDaProspeccao detalhe={d} />
```

- [ ] **Step 5: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-empresas.test.tsx tests/unit/escale-prospeccao-sumario.test.tsx && corepack pnpm prettier --write components/escale/prospeccao/detalhe tests/unit/escale-prospeccao-empresas.test.tsx && corepack pnpm eslint components/escale/prospeccao/detalhe && corepack pnpm typecheck`
Expected: PASS. Se `PaginacaoDaCasca` exigir `opcoesPorPagina` mutável, passe `[...POR_PAGINA_DAS_EMPRESAS]`.

- [ ] **Step 6: Commit**

```bash
git add components/escale/prospeccao/detalhe tests/unit/escale-prospeccao-empresas.test.tsx
git commit -m "feat(escale): aba Detalhes da prospecção — empresas, progresso, seleção e excluir desmarcadas (Fase 8D)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 7: A aba Prospecção e o encaixe

Abra antes: 002 e 014.

**Files:**
- Create: `components/escale/prospeccao/ListaDeProspeccoes.tsx`, `components/escale/prospeccao/AcoesDaProspeccao.tsx`, `tests/unit/escale-prospeccao-aba.test.tsx`
- Modify: `components/escale/campanhas/CabecalhoDasCampanhas.tsx`, `components/escale/campanhas/CampanhasDaCasca.tsx`, `tests/unit/escale-campanhas-topo.test.tsx`

**Interfaces:**
- Consumes: Tasks 1, 3, 4, 5; `PaginacaoDaCasca`; `POR_PAGINA`, `POR_PAGINA_PADRAO` (`lib/escale/contatos/regras.ts`).
- Produces: `ListaDeProspeccoes({ fuso? })`, `AcoesDaProspeccao()`; `CabecalhoDasCampanhas({ aba, acoes? })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-prospeccao-aba.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcoesDaProspeccao } from "@/components/escale/prospeccao/AcoesDaProspeccao";
import { ListaDeProspeccoes } from "@/components/escale/prospeccao/ListaDeProspeccoes";
import {
  useAcaoDaProspeccao,
  useDetalheDaProspeccao,
  useListaDeProspeccoes,
  useOpcoesDaProspeccao,
} from "@/hooks/escale/useProspeccaoDaCasca";
import { detalhe, ID, linha, OPCOES } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({
  useAcaoDaProspeccao: vi.fn(),
  useDetalheDaProspeccao: vi.fn(),
  useListaDeProspeccoes: vi.fn(),
  useOpcoesDaProspeccao: vi.fn(),
}));

const mutateAsync = vi.fn();
const pagina = (linhas = [linha()], total = linhas.length) => ({
  data: { linhas, total, pagina: 1, porPagina: 10 },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
});

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset().mockResolvedValue({});
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync, isPending: false, variables: undefined } as never);
  vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: OPCOES } as never);
  vi.mocked(useListaDeProspeccoes).mockReturnValue(pagina() as never);
  vi.mocked(useDetalheDaProspeccao).mockReturnValue({ data: detalhe(), isError: false } as never);
});

describe("ListaDeProspeccoes (D6–D8, D11)", () => {
  it("sem chave: só o vazio da chave", () => {
    vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: { ...OPCOES, configurada: false } } as never);
    render(<ListaDeProspeccoes />);
    expect(screen.getByText("Configure a chave de busca")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("sem nenhuma prospecção: o vazio com Nova prospecção", () => {
    vi.mocked(useListaDeProspeccoes).mockReturnValue(pagina([]) as never);
    render(<ListaDeProspeccoes />);
    expect(screen.getByText("Crie sua primeira prospecção")).toBeInTheDocument();
  });

  it("linha em progresso abre a janela de detalhe; o nome do número vem das opções", async () => {
    render(<ListaDeProspeccoes />);
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Clínicas Campinas"));
    expect(await screen.findByText("INFORMAÇÕES DA PROSPECÇÃO")).toBeInTheDocument();
  });

  it("rascunho reabre o assistente; duplicar abre a cópia", async () => {
    vi.mocked(useListaDeProspeccoes).mockReturnValue(pagina([linha({ situacao: "rascunho" })]) as never);
    render(<ListaDeProspeccoes />);
    await userEvent.click(screen.getByText("Clínicas Campinas"));
    expect(push).toHaveBeenCalledWith(`/app/campaigns/prospeccao/nova?id=${ID}`);
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Duplicar prospecção" }));
    expect(push).toHaveBeenCalledWith(`/app/campaigns/prospeccao/nova?copiar=${ID}`);
  });

  it("Pausar na linha usa o pause do original", async () => {
    render(<ListaDeProspeccoes />);
    await userEvent.click(screen.getByRole("button", { name: "Pausar prospecção" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "pause", id: ID });
  });

  it("rodapé só acima de 10", () => {
    vi.mocked(useListaDeProspeccoes).mockReturnValue(pagina([linha()], 11) as never);
    render(<ListaDeProspeccoes />);
    expect(screen.getByText("10 por página")).toBeInTheDocument();
  });
});

describe("AcoesDaProspeccao (D11, D12)", () => {
  it("engrenagem e Nova prospecção", () => {
    render(<AcoesDaProspeccao />);
    expect(screen.getByRole("button", { name: "Configuração da prospecção" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nova prospecção" })).toHaveAttribute("href", "/app/campaigns/prospeccao/nova");
  });
});
```

O texto "10 por página" é o do seletor da `PaginacaoDaCasca` (2A). Se a paginação escrever de outro jeito, troque pelo texto real (`grep -n "por página" components/escale/ui/PaginacaoDaCasca.tsx`).

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-aba.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 3: `components/escale/prospeccao/AcoesDaProspeccao.tsx`**

```tsx
"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { ROTA_DA_NOVA_PROSPECCAO } from "@/lib/escale/prospeccao/rotas";
import { Plus } from "@/lib/ui/icons-da-casca";

import { BotaoDaChave } from "./BotaoDaChave";

/** As ações do cabeçalho na aba Prospecção (D11, D12): a engrenagem da chave e "Nova prospecção" (molde do "Enviar WhatsApp"). */
export function AcoesDaProspeccao() {
  const t = useT();
  return (
    <div className="flex items-center gap-2">
      <BotaoDaChave forma="icone" />
      <Link
        href={ROTA_DA_NOVA_PROSPECCAO}
        className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-casca-gatilho bg-casca-marca px-3.5 text-[12px] font-medium text-accent-foreground transition-colors hover:bg-casca-marca-forte"
      >
        <Plus size={14} aria-hidden />
        {t("Nova prospecção")}
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: `components/escale/prospeccao/ListaDeProspeccoes.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { useAcaoDaProspeccao, useListaDeProspeccoes, useOpcoesDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { POR_PAGINA, POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";
import { temFiltroDaProspeccao } from "@/lib/escale/prospeccao/filtros";
import { rotaDaCopiaDaProspeccao, rotaDoRascunhoDaProspeccao } from "@/lib/escale/prospeccao/rotas";
import type { FiltrosDaProspeccao, LinhaDeProspeccao } from "@/lib/escale/prospeccao/tipos";

import { BarraDeFiltrosDaProspeccao } from "./BarraDeFiltrosDaProspeccao";
import { DetalheDaProspeccao } from "./detalhe/DetalheDaProspeccao";
import { TabelaDeProspeccoes } from "./TabelaDeProspeccoes";
import { VazioSemChave, VazioSemProspeccoes } from "./VaziosDaProspeccao";

/**
 * A ABA PROSPECÇÃO (fork Escale, Fase 8D; D6–D8, D11): sem chave, o vazio da
 * chave; sem nenhuma prospecção, o vazio; senão filtros, tabela, paginação e a
 * janela de detalhe. Rascunho reabre o assistente; duplicar abre a cópia.
 */
export function ListaDeProspeccoes({ fuso }: { fuso?: string }) {
  const t = useT();
  const router = useRouter();
  const [filtros, setFiltros] = useState<FiltrosDaProspeccao>({});
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_PADRAO);
  const [aberta, setAberta] = useState<string | null>(null);
  const opcoes = useOpcoesDaProspeccao();
  const lista = useListaDeProspeccoes(filtros, pagina, porPagina);
  const acao = useAcaoDaProspeccao();
  const filtrando = temFiltroDaProspeccao(filtros);
  const total = lista.data?.total ?? 0;

  const mudarFiltros = useCallback((f: FiltrosDaProspeccao) => {
    setFiltros(f);
    setPagina(1);
  }, []);

  if (opcoes.data && !opcoes.data.configurada) return <VazioSemChave />;
  if (!filtrando && !lista.isLoading && !lista.isError && lista.data && total === 0) return <VazioSemProspeccoes />;

  const nomeDoNumero = (id: string | null) => opcoes.data?.numeros.find((n) => n.id === id)?.nome ?? "—";

  async function pausarOuRetomar(l: LinhaDeProspeccao, action: "pause" | "resume") {
    try {
      await acao.mutateAsync({ action, id: l.id });
      toast.success(action === "pause" ? t("Novas abordagens pausadas.") : t("Prospecção retomada."));
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("Não foi possível concluir a operação."));
    }
  }

  const variaveis = acao.variables as { id?: string } | undefined;

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-6 pt-4 pb-3">
        <BarraDeFiltrosDaProspeccao filtros={filtros} aoMudar={mudarFiltros} />
      </div>
      <TabelaDeProspeccoes
        linhas={lista.data?.linhas ?? []}
        carregando={lista.isLoading}
        erro={lista.isError}
        filtrando={filtrando}
        fuso={fuso}
        ocupadoId={acao.isPending ? (variaveis?.id ?? null) : null}
        nomeDoNumero={nomeDoNumero}
        aoAbrir={(l) => (l.situacao === "rascunho" ? router.push(rotaDoRascunhoDaProspeccao(l.id)) : setAberta(l.id))}
        aoPausar={(l) => void pausarOuRetomar(l, "pause")}
        aoRetomar={(l) => void pausarOuRetomar(l, "resume")}
        aoDuplicar={(l) => router.push(rotaDaCopiaDaProspeccao(l.id))}
        aoLimparFiltros={() => mudarFiltros({})}
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
      {aberta ? <DetalheDaProspeccao id={aberta} aoFechar={() => setAberta(null)} fuso={fuso} /> : null}
    </div>
  );
}
```

Os `return` antecipados vêm depois de todos os hooks (regra dos hooks).

- [ ] **Step 5: `CabecalhoDasCampanhas` com as ações da aba**

Leia `components/escale/campanhas/CabecalhoDasCampanhas.tsx`. Faça três trocas:

1. No import do React (ou acrescente, se não houver): `import type { ReactNode } from "react";`
2. A assinatura `export function CabecalhoDasCampanhas({ aba }: { aba: AbaDasCampanhas }) {` vira:

```tsx
export function CabecalhoDasCampanhas({ aba, acoes }: { aba: AbaDasCampanhas; acoes?: ReactNode }) {
```

3. O `) : null}` que fecha o ramo `aba === "whatsapp" ? (…)` vira `) : (acoes ?? null)}`.

E no comentário do componente, acrescente a linha: ` * Nas outras abas, mostra as \`acoes\` que a aba manda (Fase 8D: a engrenagem da chave e "Nova prospecção").`

- [ ] **Step 6: `CampanhasDaCasca` com a aba nova**

Leia `components/escale/campanhas/CampanhasDaCasca.tsx` (a 8B ou a 8C podem tê-lo tocado; troque só estes trechos):

1. Troque `import { ProspectingClient } from "@/app/app/prospecting/_client";` por:

```tsx
import { AcoesDaProspeccao } from "@/components/escale/prospeccao/AcoesDaProspeccao";
import { ListaDeProspeccoes } from "@/components/escale/prospeccao/ListaDeProspeccoes";
```

2. Troque `<CabecalhoDasCampanhas aba={aba} />` por:

```tsx
      <CabecalhoDasCampanhas aba={aba} acoes={aba === "prospeccao" ? <AcoesDaProspeccao /> : undefined} />
```

3. Troque `<ProspectingClient />` por `<ListaDeProspeccoes fuso={fuso} />`.

4. No comentário do componente, troque "A Prospecção mostra a tela do original até a 8D." por "A Prospecção é a aba da 8D (lista, assistente e detalhe no molde da Clint)."

- [ ] **Step 7: O teste do cabeçalho (8A)**

Em `tests/unit/escale-campanhas-topo.test.tsx`, troque o `it("na aba Prospecção, só o título", …)` inteiro por:

```tsx
  it("na aba Prospecção, o título e as ações que a aba manda (8D)", () => {
    render(<CabecalhoDasCampanhas aba="prospeccao" acoes={<a href="/x">Nova prospecção</a>} />);
    expect(screen.getByRole("heading", { name: "Prospecção" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Enviar WhatsApp" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nova prospecção" })).toBeInTheDocument();
  });
```

Se outro teste da 8A (`tests/unit/escale-campanhas-pagina.test.tsx`) espera a tela do original na aba Prospecção (procure `ProspectingClient` ou "Configurar busca"), troque a expectativa por `expect(screen.getByText("Nova prospecção")).toBeInTheDocument()` e mocke `@/hooks/escale/useProspeccaoDaCasca` como no Step 1.

- [ ] **Step 8: Rodar e conferir**

```bash
corepack pnpm vitest run tests/unit/escale-prospeccao-aba.test.tsx tests/unit/escale-campanhas-topo.test.tsx tests/unit/escale-campanhas-pagina.test.tsx
corepack pnpm prettier --write components/escale/prospeccao/ListaDeProspeccoes.tsx components/escale/prospeccao/AcoesDaProspeccao.tsx tests/unit/escale-prospeccao-aba.test.tsx
corepack pnpm eslint components/escale/prospeccao components/escale/campanhas/CabecalhoDasCampanhas.tsx components/escale/campanhas/CampanhasDaCasca.tsx
corepack pnpm typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/escale/prospeccao components/escale/campanhas/CabecalhoDasCampanhas.tsx components/escale/campanhas/CampanhasDaCasca.tsx tests/unit/escale-prospeccao-aba.test.tsx tests/unit/escale-campanhas-topo.test.tsx tests/unit/escale-campanhas-pagina.test.tsx
git commit -m "feat(escale): aba Prospecção de Campanhas no molde da Clint — lista, detalhe e chave na engrenagem (Fase 8D)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

(Se `escale-campanhas-pagina.test.tsx` não mudou, o `git add` dele é inócuo.)

---

### Task 8: O assistente — página, passos 1 e 2

Abra antes: 018, 019 e 031.

**Files:**
- Create: `app/app/campaigns/prospeccao/nova/page.tsx`, `components/escale/prospeccao/assistente/AssistenteDeProspeccao.tsx`, `components/escale/prospeccao/assistente/PassoConfigure.tsx`, `components/escale/prospeccao/assistente/PassoEncontre.tsx`, `components/escale/prospeccao/assistente/EmpresasEncontradas.tsx`, `tests/unit/escale-prospeccao-assistente.test.tsx`

**Interfaces:**
- Consumes: Tasks 1, 3, 4 (`campos.tsx`); `MoldeDoAssistente`, `TrilhaDoAssistente`, `RodapeDoAssistente`, `SeletorDeNumero`, `CartaoDeEscolha`, `CampoComContador` (8B); `rotaDaAba` (8A); `CaixaDaCasca`, `SeletorDaCasca`, `BotaoDaCasca` (casca); `randomId` (`lib/random-id`); `COOKIE_DO_MENU`, `lerPreferenciaDeMenu` (`lib/escale/preferencia-de-menu`); `requireAuth`, `resolveActiveOrg` (`lib/auth/server`).
- Produces: `AssistenteDeProspeccao({ campanhaId, copiarDe })`; `PassoConfigure({ r, atualizar, opcoes, nomeTravado })`; `PassoEncontre({ r, atualizar, detalhe, ocupado, aoBuscar, aoNovaBusca, aoMarcar })`; `EmpresasEncontradas({ empresas, ocupado, aoMarcar })`. O passo 3 e o 4 entram na Task 9 (até lá o assistente mostra um parágrafo nesses passos, trocado no Step 6 da Task 9).

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-prospeccao-assistente.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssistenteDeProspeccao } from "@/components/escale/prospeccao/assistente/AssistenteDeProspeccao";
import { useAcaoDaProspeccao, useDetalheDaProspeccao, useOpcoesDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { detalhe, empresa, ID, linha, OPCOES } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/random-id", () => ({ randomId: () => "99999999-9999-4999-8999-999999999999" }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({
  useAcaoDaProspeccao: vi.fn(),
  useDetalheDaProspeccao: vi.fn(),
  useOpcoesDaProspeccao: vi.fn(),
}));
// O seletor da 8B tem internos próprios; aqui basta escolher o número.
vi.mock("@/components/escale/campanhas/molde/SeletorDeNumero", () => ({
  SeletorDeNumero: ({ numeros, aoMudar }: { numeros: { id: string; nome: string }[]; aoMudar: (id: string) => void }) => (
    <div>
      {numeros.map((n) => (
        <button key={n.id} type="button" onClick={() => aoMudar(n.id)}>
          {`número ${n.nome}`}
        </button>
      ))}
    </div>
  ),
}));

const mutateAsync = vi.fn();
let detalhes: Record<string, unknown> = {};

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  detalhes = {};
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync, isPending: false } as never);
  vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: OPCOES, isError: false } as never);
  vi.mocked(useDetalheDaProspeccao).mockImplementation(((id: string | null) => ({
    data: id ? detalhes[id] : undefined,
    isError: false,
  })) as never);
});

async function preencherPasso1() {
  await userEvent.type(screen.getByPlaceholderText("Ex: Clínicas de estética em Campinas"), "Clínicas Campinas");
  await userEvent.click(screen.getByRole("button", { name: "número Comercial" }));
}

describe("AssistenteDeProspeccao — passos 1 e 2 (018, 031; D9)", () => {
  it("trilha, passos e o passo 1", () => {
    render(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    expect(screen.getByText("Nova prospecção")).toBeInTheDocument();
    expect(screen.getByText("Configure a sua prospecção")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Configurar por conversa/ })).toBeInTheDocument();
  });

  it("Próximo sem nada lista os erros e não avança", async () => {
    render(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByRole("alert")).toHaveTextContent("O nome precisa ter de 3 a 80 caracteres.");
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha o número que vai abordar as empresas.");
  });

  it("agente existente pede a escolha do agente", async () => {
    render(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    await preencherPasso1();
    await userEvent.click(screen.getByRole("radio", { name: /Usar agente existente/ }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha um agente publicado.");
  });

  it("passo 2: busca manda o search com o request_id e mostra o andamento", async () => {
    mutateAsync.mockResolvedValue({ id: ID });
    const { rerender } = render(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    await preencherPasso1();
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await userEvent.type(screen.getByLabelText("Público ou segmento"), "clínicas de estética");
    await userEvent.type(screen.getByLabelText("Cidade ou região"), "Campinas, SP");
    await userEvent.click(screen.getByRole("button", { name: "Buscar empresas" }));
    expect(mutateAsync).toHaveBeenCalledWith({
      action: "search",
      request_id: "99999999-9999-4999-8999-999999999999",
      search: { name: "Clínicas Campinas", niche: "clínicas de estética", location: "Campinas, SP", limit: 20, budget_usd: 1, enrich: true },
    });
    detalhes[ID] = detalhe({ status: "draft", statusDaBusca: "running", config: null, empresas: [], linha: linha({ situacao: "buscando" }) });
    rerender(<AssistenteDeProspeccao campanhaId={null} copiarDe={null} />);
    expect(await screen.findByText("Buscando empresas no Google Maps. Isso pode levar alguns minutos; você pode sair e voltar pela lista.")).toBeInTheDocument();
  });

  it("rascunho continuado: começa no passo 1 com o nome travado; no passo 2 a lista e o select", async () => {
    detalhes[ID] = detalhe({
      status: "draft",
      config: null,
      linha: linha({ situacao: "rascunho" }),
      empresas: [
        empresa({ id: "a", status: "new", progresso: "new" }),
        empresa({ id: "b", status: "new", progresso: "new", selecionada: false, dados: { ...empresa().dados, name: "Studio Pele" } }),
      ],
    });
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);
    expect(screen.getByText("Continuar prospecção")).toBeInTheDocument();
    expect(screen.getByText("O nome foi gravado com a busca.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "número Comercial" }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByText("2 empresas encontradas · 1 marcadas")).toBeInTheDocument();
    mutateAsync.mockResolvedValue({});
    await userEvent.click(screen.getByRole("checkbox", { name: "Marcar empresa para abordagem: Clínica Bela" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "select", id: ID, candidate_ids: ["a"], selected: false });
  });

  it("prospecção já iniciada não abre no assistente", () => {
    detalhes[ID] = detalhe();
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);
    expect(screen.getByText("Esta prospecção já começou. Acompanhe pela lista.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-assistente.test.tsx`
Expected: FAIL (o assistente não existe).

- [ ] **Step 3: `components/escale/prospeccao/assistente/EmpresasEncontradas.tsx`**

```tsx
"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { EmpresaDaProspeccao } from "@/lib/escale/prospeccao/tipos";

/**
 * AS EMPRESAS ENCONTRADAS (passo 2; molde 031): "Selecionar todas", a linha
 * com a caixa, o nome e a categoria, o telefone, o endereço e a nota. Marcar
 * vai ao `select` do original (só vale para as novas do rascunho).
 */
export function EmpresasEncontradas({
  empresas,
  ocupado,
  aoMarcar,
}: {
  empresas: EmpresaDaProspeccao[];
  ocupado: boolean;
  aoMarcar: (ids: string[], selecionada: boolean) => void;
}) {
  const t = useT();
  const novas = empresas.filter((e) => e.status === "new");
  const marcadas = novas.filter((e) => e.selecionada).length;
  const todas = novas.length > 0 && marcadas === novas.length ? true : marcadas === 0 ? false : "indeterminada";

  return (
    <div className="rounded-lg border border-casca-borda">
      <div className="flex items-center justify-between border-b border-casca-divisoria px-4 py-3">
        <CaixaDaCasca
          marcada={todas}
          aoMudar={(v) => aoMarcar(novas.map((e) => e.id), v)}
          rotulo={t("Selecionar todas")}
          desabilitada={ocupado || novas.length === 0}
        />
        <span className="text-[11px] text-casca-suave">{t("Empresas sem telefone ou que já são contatos do CRM ficam de fora ao iniciar.")}</span>
      </div>
      <ul className="max-h-[360px] divide-y divide-casca-divisoria overflow-y-auto">
        {novas.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-[12px] text-casca-texto hover:bg-casca-busca">
            <CaixaDaCasca
              marcada={e.selecionada}
              aoMudar={(v) => aoMarcar([e.id], v)}
              aria-label={`${t("Marcar empresa para abordagem")}: ${e.dados.name}`}
              desabilitada={ocupado}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{e.dados.name}</p>
              <p className="truncate text-[11px] text-casca-meta">{[e.dados.category, e.dados.address].filter(Boolean).join(" · ")}</p>
            </div>
            <span className="w-[140px] shrink-0 text-right">{e.dados.phone ?? t("Sem telefone")}</span>
            <span className="w-[120px] shrink-0 text-right text-[11px] text-casca-suave">
              {e.dados.rating === null ? "—" : e.dados.rating.toLocaleString("pt-BR")} ★ · {(e.dados.reviews ?? 0).toLocaleString("pt-BR")} {t("avaliações")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: `components/escale/prospeccao/assistente/PassoConfigure.tsx`**

```tsx
"use client";
import Link from "next/link";

import { CampoComContador } from "@/components/escale/campanhas/molde/CampoComContador";
import { CartaoDeEscolha } from "@/components/escale/campanhas/molde/CartaoDeEscolha";
import { SeletorDeNumero } from "@/components/escale/campanhas/molde/SeletorDeNumero";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { NOME_MAX, numerosDoSeletor, type RascunhoDaProspeccao } from "@/lib/escale/prospeccao/assistente";
import type { OpcoesDaProspeccao } from "@/lib/escale/prospeccao/tipos";
import { Bot, MessageCircle } from "@/lib/ui/icons-da-casca";

import { Ajuda } from "../campos";

/**
 * PASSO 1 — CONFIGURE A SUA PROSPECÇÃO (molde 018/019; D9): o nome com o
 * contador, o número (só não oficiais e conectados) e o agente: por conversa
 * (o construtor do original, no passo 3) ou um existente.
 */
export function PassoConfigure({
  r,
  atualizar,
  opcoes,
  nomeTravado,
}: {
  r: RascunhoDaProspeccao;
  atualizar: (p: Partial<RascunhoDaProspeccao>) => void;
  opcoes: OpcoesDaProspeccao;
  nomeTravado: boolean;
}) {
  const t = useT();
  const numeros = numerosDoSeletor(opcoes, t("Não oficial"));

  return (
    <section className="mx-auto max-w-[640px] space-y-5">
      <header className="space-y-1">
        <h2 className="text-[18px] font-semibold text-casca-texto">{t("Prospecção com IA")}</h2>
        <p className="text-[12px] text-casca-suave">{t("Dê um nome à prospecção, escolha o número e quem vai conversar com as empresas.")}</p>
      </header>

      {nomeTravado ? (
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-casca-texto">{t("Nome da prospecção")}</p>
          <p className="text-[13px] text-casca-texto">{r.nome}</p>
          <Ajuda>{t("O nome foi gravado com a busca.")}</Ajuda>
        </div>
      ) : (
        <CampoComContador
          id="prospeccao-nome"
          rotulo={t("Nome da prospecção")}
          valor={r.nome}
          aoMudar={(nome) => atualizar({ nome })}
          maximo={NOME_MAX}
          placeholder={t("Ex: Clínicas de estética em Campinas")}
        />
      )}

      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-casca-texto">{t("Número de WhatsApp")}</p>
        {numeros.length ? (
          <SeletorDeNumero numeros={numeros} valor={r.numeroId} aoMudar={(numeroId) => atualizar({ numeroId })} placeholder={t("Selecionar número")} />
        ) : (
          <p className="text-[12px] text-casca-alerta">
            {t("Nenhuma conexão ativa permite iniciar conversas de texto.")}{" "}
            <Link href="/app/connections" className="text-casca-marca hover:underline">
              {t("Ver conexões e proteções de envio")}
            </Link>
          </p>
        )}
        <Ajuda>{t("Só números não oficiais: a prospecção abre a conversa com texto livre, e o número oficial exige modelo aprovado.")}</Ajuda>
      </div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-medium text-casca-texto">{t("Agente de IA")}</p>
        <div role="radiogroup" aria-label={t("Agente de IA")} className="grid grid-cols-2 gap-3">
          <CartaoDeEscolha
            selecionado={r.modo === "conversa"}
            aoEscolher={() => {
              if (r.modo !== "conversa") atualizar({ modo: "conversa", agenteId: null });
            }}
            titulo={t("Configurar por conversa")}
            descricao={t("A IA monta o agente conversando com você no passo 3, depois da busca.")}
            icone={<MessageCircle size={16} aria-hidden />}
          />
          <CartaoDeEscolha
            selecionado={r.modo === "existente"}
            aoEscolher={() => atualizar({ modo: "existente" })}
            titulo={t("Usar agente existente")}
            descricao={t("Escolha um agente publicado e configure a abordagem à mão.")}
            icone={<Bot size={16} aria-hidden />}
          />
        </div>
        {r.modo === "existente" ? (
          <SeletorDaCasca
            aparencia="janela"
            aria-label={t("Agente de IA")}
            vazio={t("Escolha um agente publicado")}
            valor={r.agenteId ?? ""}
            opcoes={opcoes.agentes.map((a) => ({ valor: a.id, rotulo: a.nome }))}
            aoMudar={(v) => atualizar({ agenteId: v || null })}
          />
        ) : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: `components/escale/prospeccao/assistente/PassoEncontre.tsx`**

```tsx
"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import type { RascunhoDaProspeccao } from "@/lib/escale/prospeccao/assistente";
import { contarMarcadas } from "@/lib/escale/prospeccao/selecao";
import type { DetalheDaProspeccao } from "@/lib/escale/prospeccao/tipos";
import { Search } from "@/lib/ui/icons-da-casca";

import { Ajuda, CampoDeTexto } from "../campos";
import { EmpresasEncontradas } from "./EmpresasEncontradas";

/**
 * PASSO 2 — ENCONTRE EMPRESAS (D9): antes da busca, o formulário do original;
 * buscando, o aviso; com erro, "Buscar de novo"; concluída, a lista com caixas.
 */
export function PassoEncontre({
  r,
  atualizar,
  detalhe,
  ocupado,
  aoBuscar,
  aoNovaBusca,
  aoMarcar,
}: {
  r: RascunhoDaProspeccao;
  atualizar: (p: Partial<RascunhoDaProspeccao>) => void;
  detalhe: DetalheDaProspeccao | null;
  ocupado: boolean;
  aoBuscar: () => void;
  aoNovaBusca: () => void;
  aoMarcar: (ids: string[], selecionada: boolean) => void;
}) {
  const t = useT();
  const cabecalho = (
    <header className="space-y-1">
      <h2 className="text-[18px] font-semibold text-casca-texto">{t("Encontre empresas")}</h2>
      <p className="text-[12px] text-casca-suave">{t("A busca traz empresas do Google Maps. Você escolhe quais o agente vai abordar.")}</p>
    </header>
  );

  if (!detalhe) {
    return (
      <section className="mx-auto max-w-[640px] space-y-5">
        {cabecalho}
        <CampoDeTexto id="busca-nicho" rotulo={t("Público ou segmento")} valor={r.nicho} aoMudar={(nicho) => atualizar({ nicho })} placeholder={t("Ex.: clínicas de estética")} />
        <CampoDeTexto id="busca-local" rotulo={t("Cidade ou região")} valor={r.local} aoMudar={(local) => atualizar({ local })} placeholder={t("Ex.: São Paulo, SP")} />
        <div className="grid grid-cols-2 gap-4">
          <CampoDeTexto id="busca-limite" numerico rotulo={t("Até quantas empresas")} valor={r.limite} aoMudar={(limite) => atualizar({ limite })} />
          <CampoDeTexto id="busca-orcamento" numerico rotulo={t("Teto da busca (US$)")} valor={r.orcamento} aoMudar={(orcamento) => atualizar({ orcamento })} />
        </div>
        <CaixaDaCasca
          marcada={r.enriquecer}
          aoMudar={(enriquecer) => atualizar({ enriquecer })}
          rotulo={t("Enriquecer com e-mails comerciais e redes encontradas no site")}
        />
        <div className="space-y-2">
          <button
            type="button"
            onClick={aoBuscar}
            disabled={ocupado}
            className="inline-flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-marca px-3.5 text-[12px] font-medium text-accent-foreground hover:bg-casca-marca-forte disabled:opacity-50"
          >
            <Search size={14} aria-hidden />
            {t("Buscar empresas")}
          </button>
          <Ajuda>{t("Cada busca cria uma prospecção nova e cobra da sua conta da Apify até o teto informado.")}</Ajuda>
        </div>
      </section>
    );
  }

  if (detalhe.linha.situacao === "buscando") {
    return (
      <section className="mx-auto max-w-[640px] space-y-5">
        {cabecalho}
        <p role="status" className="flex items-center gap-2 rounded-md bg-casca-busca px-4 py-3 text-[12px] text-casca-texto">
          <span aria-hidden className="size-2 rounded-full bg-casca-marca motion-safe:animate-pulse" />
          {t("Buscando empresas no Google Maps. Isso pode levar alguns minutos; você pode sair e voltar pela lista.")}
        </p>
      </section>
    );
  }

  if (detalhe.linha.situacao === "erro_na_busca") {
    return (
      <section className="mx-auto max-w-[640px] space-y-5">
        {cabecalho}
        <p className="text-[12px] text-casca-alerta">{detalhe.erro ?? t("A busca não terminou.")}</p>
        <button
          type="button"
          onClick={aoNovaBusca}
          className="inline-flex h-8 items-center rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
        >
          {t("Buscar de novo")}
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[760px] space-y-4">
      {cabecalho}
      <p className="text-[12px] text-casca-texto">
        {t("{n} empresas encontradas · {m} marcadas")
          .replace("{n}", numeroBr(detalhe.empresas.filter((e) => e.status === "new").length))
          .replace("{m}", numeroBr(contarMarcadas(detalhe.empresas)))}
      </p>
      {detalhe.repetidas > 0 ? (
        <Ajuda>{t("{n} resultados repetidos ou indisponíveis foram desconsiderados.").replace("{n}", numeroBr(detalhe.repetidas))}</Ajuda>
      ) : null}
      <EmpresasEncontradas empresas={detalhe.empresas} ocupado={ocupado} aoMarcar={aoMarcar} />
    </section>
  );
}
```

- [ ] **Step 6: `components/escale/prospeccao/assistente/AssistenteDeProspeccao.tsx`**

```tsx
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { MoldeDoAssistente } from "@/components/escale/campanhas/molde/MoldeDoAssistente";
import { RodapeDoAssistente } from "@/components/escale/campanhas/molde/RodapeDoAssistente";
import { TrilhaDoAssistente } from "@/components/escale/campanhas/molde/TrilhaDoAssistente";
import { useAcaoDaProspeccao, useDetalheDaProspeccao, useOpcoesDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { rotaDaAba } from "@/lib/escale/campanhas/rotas";
import {
  buscaDoRascunho,
  errosDaBusca,
  errosDoPasso,
  impressaoDaBusca,
  inicioDoAssistente,
  PASSOS_DA_PROSPECCAO,
  type InicioDoAssistente,
  type PassoDaProspeccao,
  type RascunhoDaProspeccao,
} from "@/lib/escale/prospeccao/assistente";
import { contarMarcadas } from "@/lib/escale/prospeccao/selecao";
import type { OpcoesDaProspeccao } from "@/lib/escale/prospeccao/tipos";
import { randomId } from "@/lib/random-id";

import { ErrosDoPasso } from "../campos";
import { PassoConfigure } from "./PassoConfigure";
import { PassoEncontre } from "./PassoEncontre";

const mensagemDoErro = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

/**
 * O ASSISTENTE DE PROSPECÇÃO (fork Escale, Fase 8D; molde da 8B; D9). Este
 * componente só carrega: espera as opções (e a prospecção, para continuar ou
 * duplicar) e monta o assistente com o estado inicial — sem `setState` em
 * efeito.
 */
export function AssistenteDeProspeccao({ campanhaId, copiarDe }: { campanhaId: string | null; copiarDe: string | null }) {
  const t = useT();
  const fonteId = campanhaId ?? copiarDe;
  const fonte = useDetalheDaProspeccao(fonteId);
  const opcoes = useOpcoesDaProspeccao();

  if (opcoes.isError || fonte.isError)
    return <p className="p-6 text-[13px] text-casca-alerta">{t("Não foi possível carregar a prospecção.")}</p>;
  if (!opcoes.data || (fonteId && !fonte.data))
    return (
      <p role="status" className="p-6 text-[13px] text-casca-suave">
        {t("Carregando prospecção")}
      </p>
    );
  if (campanhaId && fonte.data && fonte.data.status !== "draft")
    return (
      <div className="p-6 text-[13px] text-casca-texto">
        <p>{t("Esta prospecção já começou. Acompanhe pela lista.")}</p>
        <Link href={rotaDaAba("prospeccao")} className="mt-2 inline-block text-casca-marca hover:underline">
          {t("Voltar para a lista")}
        </Link>
      </div>
    );

  const inicial = inicioDoAssistente(fonte.data ?? null, campanhaId ? "continuar" : copiarDe ? "copiar" : "nova", t(" Cópia"));
  return <AssistenteCarregado key={fonteId ?? "nova"} inicial={inicial} opcoes={opcoes.data} />;
}

function AssistenteCarregado({ inicial, opcoes }: { inicial: InicioDoAssistente; opcoes: OpcoesDaProspeccao }) {
  const t = useT();
  const router = useRouter();
  const [passo, setPasso] = useState<PassoDaProspeccao>(inicial.passo);
  const [r, setR] = useState<RascunhoDaProspeccao>(inicial.rascunho);
  const [campanhaId, setCampanhaId] = useState<string | null>(inicial.campanhaId);
  const [mostrar, setMostrar] = useState<string[]>([]);
  const tentativa = useRef<{ impressao: string; id: string } | null>(null);
  const detalhe = useDetalheDaProspeccao(campanhaId);
  const acao = useAcaoDaProspeccao();
  const d = detalhe.data ?? null;
  const ctx = { buscaConcluida: d?.statusDaBusca === "succeeded", marcadas: d ? contarMarcadas(d.empresas) : 0 };

  const atualizar = (p: Partial<RascunhoDaProspeccao>) => setR((atual) => ({ ...atual, ...p }));
  const irPara = (p: PassoDaProspeccao) => {
    setMostrar([]);
    setPasso(p);
  };

  function avancar() {
    const erros = errosDoPasso(passo, r, ctx);
    if (erros.length) return setMostrar(erros.map(t));
    if (passo < 3) irPara((passo + 1) as PassoDaProspeccao);
  }

  function voltar() {
    if (passo === 0) router.push(rotaDaAba("prospeccao"));
    else irPara((passo - 1) as PassoDaProspeccao);
  }

  async function buscar() {
    const erros = errosDaBusca(r);
    if (erros.length) return setMostrar(erros.map(t));
    const impressao = impressaoDaBusca(r);
    if (tentativa.current?.impressao !== impressao) tentativa.current = { impressao, id: randomId() };
    try {
      const criada = (await acao.mutateAsync({ action: "search", request_id: tentativa.current.id, search: buscaDoRascunho(r) })) as { id: string };
      setMostrar([]);
      setCampanhaId(criada.id);
      toast.success(t("Solicitação registrada. Acompanhe o estado da busca nesta tela."));
    } catch (e) {
      toast.error(mensagemDoErro(e, t("Não foi possível concluir a operação.")));
    }
  }

  function novaBusca() {
    tentativa.current = null;
    setCampanhaId(null);
  }

  async function marcar(ids: string[], selected: boolean) {
    if (!campanhaId) return;
    try {
      await acao.mutateAsync({ action: "select", id: campanhaId, candidate_ids: ids, selected });
    } catch (e) {
      toast.error(mensagemDoErro(e, t("Não foi possível concluir a operação.")));
    }
  }

  function salvarRascunho() {
    toast.success(t("Rascunho salvo. A busca e as empresas marcadas ficam guardadas; o resto da configuração não."));
    router.push(rotaDaAba("prospeccao"));
  }

  const trilha = (
    <TrilhaDoAssistente
      itens={[
        { rotulo: t("Campanhas"), href: rotaDaAba("whatsapp") },
        { rotulo: t("Prospecção"), href: rotaDaAba("prospeccao") },
        { rotulo: inicial.campanhaId ? t("Continuar prospecção") : t("Nova prospecção") },
      ]}
    />
  );
  const extras = campanhaId ? (
    <button type="button" onClick={salvarRascunho} className="h-8 rounded-casca-gatilho border border-casca-borda px-3.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia">
      {t("Salvar como rascunho")}
    </button>
  ) : undefined;
  const rodape = <RodapeDoAssistente aoVoltar={voltar} rotuloVoltar={t("Voltar")} extras={extras} principal={{ rotulo: t("Próximo"), aoClicar: avancar }} />;

  return (
    <MoldeDoAssistente trilha={trilha} passos={PASSOS_DA_PROSPECCAO.map((p) => t(p))} atual={passo} rodape={rodape}>
      <ErrosDoPasso erros={mostrar} />
      {passo === 0 ? (
        <PassoConfigure r={r} atualizar={atualizar} opcoes={opcoes} nomeTravado={campanhaId !== null} />
      ) : passo === 1 ? (
        <PassoEncontre r={r} atualizar={atualizar} detalhe={d} ocupado={acao.isPending} aoBuscar={() => void buscar()} aoNovaBusca={novaBusca} aoMarcar={(ids, v) => void marcar(ids, v)} />
      ) : (
        <p className="text-[13px] text-casca-suave">{t(PASSOS_DA_PROSPECCAO[passo])}</p>
      )}
    </MoldeDoAssistente>
  );
}
```

Os passos 3 e 4 (o parágrafo do último ramo) e o rodapé do passo 4 entram na Task 9.

- [ ] **Step 7: `app/app/campaigns/prospeccao/nova/page.tsx`**

```tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AssistenteDeProspeccao } from "@/components/escale/prospeccao/assistente/AssistenteDeProspeccao";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nova prospecção" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidOuNulo = (v: string | string[] | undefined) => (typeof v === "string" && UUID.test(v) ? v : null);

/**
 * O ASSISTENTE DE PROSPECÇÃO (fork Escale, Fase 8D; D9, D12). Só admin (como
 * a Prospecção do original) e só com a casca; sem ela, a tela do original.
 * `?id=` continua um rascunho; `?copiar=` duplica.
 */
export default async function NovaProspeccaoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[]; copiar?: string | string[] }>;
}) {
  const org = await resolveActiveOrg(await requireAuth());
  if (org?.role !== "admin") redirect("/app/inbox");
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) !== "topo") redirect("/app/prospecting");
  const { id, copiar } = await searchParams;
  return <AssistenteDeProspeccao campanhaId={uuidOuNulo(id)} copiarDe={uuidOuNulo(copiar)} />;
}
```

- [ ] **Step 8: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-assistente.test.tsx && corepack pnpm prettier --write components/escale/prospeccao/assistente app/app/campaigns/prospeccao tests/unit/escale-prospeccao-assistente.test.tsx && corepack pnpm eslint components/escale/prospeccao/assistente app/app/campaigns/prospeccao && corepack pnpm typecheck`
Expected: PASS. Se o `CartaoDeEscolha` da 8B não expuser o título no nome acessível do `role="radio"`, troque `getByRole("radio", { name: /…/ })` por `getByText("Configurar por conversa")` e clique nele. Se o `CampoComContador` não passar o `placeholder` ao campo, ache o campo por `getByLabelText("Nome da prospecção")`.

- [ ] **Step 9: Commit**

```bash
git add components/escale/prospeccao/assistente app/app/campaigns/prospeccao tests/unit/escale-prospeccao-assistente.test.tsx
git commit -m "feat(escale): assistente de prospecção — página, passo 1 e busca de empresas (Fase 8D)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 9: O assistente — passos 3 e 4, iniciar, rascunho e cópia

Abra antes: 038 e 044.

**Files:**
- Create: `components/escale/prospeccao/assistente/PassoAbordagem.tsx`, `components/escale/prospeccao/assistente/PassoConfirme.tsx`, `tests/unit/escale-prospeccao-assistente-final.test.tsx`
- Modify: `components/escale/prospeccao/assistente/AssistenteDeProspeccao.tsx`

**Interfaces:**
- Consumes: Tasks 1, 3, 4, 8; `ProspectingAgentBuilder` (`app/app/prospecting/_create-agent.tsx`, original); `CartaoDeEscolha`, `ResumoDoEnvio` (8B); `SeletorDaCasca` (casca).
- Produces: `PassoAbordagem({ r, atualizar, opcoes, campanha })`, `PassoConfirme({ r, atualizar, opcoes, detalhe })`; o assistente completo.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-prospeccao-assistente-final.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssistenteDeProspeccao } from "@/components/escale/prospeccao/assistente/AssistenteDeProspeccao";
import { useAcaoDaProspeccao, useDetalheDaProspeccao, useOpcoesDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { AGENTE, CONFIG, detalhe, empresa, ETAPA_ENTRADA, ETAPA_QUALIFICADOS, FUNIL, ID, linha, NUMERO, OPCOES } from "@/tests/helpers/prospeccao-fixtures";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/escale/useProspeccaoDaCasca", () => ({
  useAcaoDaProspeccao: vi.fn(),
  useDetalheDaProspeccao: vi.fn(),
  useOpcoesDaProspeccao: vi.fn(),
}));
// O construtor do original conversa com a IA; aqui ele só "publica" o agente.
vi.mock("@/app/app/prospecting/_create-agent", () => ({
  ProspectingAgentBuilder: ({ onCreated, campaign }: { onCreated: (id: string, r: unknown, s: unknown) => Promise<void>; campaign: { id: string } }) => (
    <button
      type="button"
      onClick={() =>
        void onCreated(campaign.id, { agent: { id: AGENTE, name: "Sofia" }, version_id: "v", model_label: "modelo" }, {
          name: "Sofia",
          tone: "cordial",
          channel_session_id: NUMERO,
          pipeline_id: FUNIL,
          stage_id: ETAPA_ENTRADA,
          qualified_stage_id: ETAPA_QUALIFICADOS,
          instruction: CONFIG.instruction,
          qualification: CONFIG.qualification,
        })
      }
    >
      publicar agente de teste
    </button>
  ),
}));

const mutateAsync = vi.fn();
const RASCUNHO = detalhe({
  status: "draft",
  config: null,
  linha: linha({ situacao: "rascunho" }),
  empresas: [empresa({ id: "a", status: "new", progresso: "new" })],
});

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset().mockResolvedValue({ started: true });
  vi.mocked(useAcaoDaProspeccao).mockReturnValue({ mutateAsync, isPending: false } as never);
  vi.mocked(useOpcoesDaProspeccao).mockReturnValue({ data: OPCOES, isError: false } as never);
});

describe("AssistenteDeProspeccao — passos 3 e 4 (038, 044; D9)", () => {
  it("rascunho com a preparação começada abre na confirmação e inicia com a mesma configuração", async () => {
    vi.mocked(useDetalheDaProspeccao).mockReturnValue({ data: detalhe({ status: "draft", linha: linha({ situacao: "rascunho" }) }), isError: false } as never);
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);
    expect(screen.getByText("Confirme sua prospecção")).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    expect(screen.getByText("Sofia")).toBeInTheDocument();
    expect(screen.getByText("US$ 0,45")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Iniciar prospecção" }));
    expect(mutateAsync).toHaveBeenCalledWith({ action: "start", id: ID, config: CONFIG });
    expect(push).toHaveBeenCalledWith("/app/campaigns?aba=prospeccao");
  });

  it("rascunho sem configuração começa no passo 1 e pede o número de novo (A4)", async () => {
    vi.mocked(useDetalheDaProspeccao).mockReturnValue({ data: RASCUNHO, isError: false } as never);
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Escolha o número que vai abordar as empresas.");
  });

  it("passo 3 com agente existente: Próximo exige etapas e textos; base legal no passo 4", async () => {
    vi.mocked(useDetalheDaProspeccao).mockReturnValue({
      data: detalhe({ status: "draft", linha: linha({ situacao: "rascunho" }), config: { ...CONFIG, legal_basis_ref: "" as string } }),
      isError: false,
    } as never);
    render(<AssistenteDeProspeccao campanhaId={ID} copiarDe={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Iniciar prospecção" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Informe a referência da avaliação de legítimo interesse (de 3 a 500 caracteres).");
    expect(mutateAsync).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Referência da avaliação de legítimo interesse"), "LIA 2026/01");
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("heading", { name: "Configure a abordagem" })).toBeInTheDocument();
    expect(screen.getByLabelText("O que a IA deve oferecer e como iniciar")).toHaveValue(CONFIG.instruction);
  });

  it("duplicar: tudo preenchido, nome com Cópia, começa no passo 1 sem campanha", () => {
    vi.mocked(useDetalheDaProspeccao).mockImplementation(((id: string | null) => ({ data: id ? detalhe() : undefined, isError: false })) as never);
    render(<AssistenteDeProspeccao campanhaId={null} copiarDe={ID} />);
    expect(screen.getByDisplayValue("Clínicas Campinas Cópia")).toBeInTheDocument();
    expect(screen.queryByText("Salvar como rascunho")).not.toBeInTheDocument();
  });
});

describe("construtor por conversa no passo 3", () => {
  it("publicar o agente preenche o rascunho e libera o passo", async () => {
    vi.mocked(useDetalheDaProspeccao).mockReturnValue({ data: RASCUNHO, isError: false } as never);
    const { PassoAbordagem } = await import("@/components/escale/prospeccao/assistente/PassoAbordagem");
    const { RASCUNHO_VAZIO } = await import("@/lib/escale/prospeccao/assistente");
    const atualizar = vi.fn();
    render(<PassoAbordagem r={{ ...RASCUNHO_VAZIO, numeroId: NUMERO }} atualizar={atualizar} opcoes={OPCOES} campanha={RASCUNHO} />);
    await userEvent.click(screen.getByRole("button", { name: "publicar agente de teste" }));
    expect(atualizar).toHaveBeenCalledWith({
      agenteId: AGENTE,
      numeroId: NUMERO,
      funilId: FUNIL,
      etapaId: ETAPA_ENTRADA,
      etapaQualificadaId: ETAPA_QUALIFICADOS,
      instrucao: CONFIG.instruction,
      qualificacao: CONFIG.qualification,
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-prospeccao-assistente-final.test.tsx`
Expected: FAIL (`PassoAbordagem` e `PassoConfirme` não existem; o assistente não tem o passo 4).

- [ ] **Step 3: `components/escale/prospeccao/assistente/PassoAbordagem.tsx`**

```tsx
"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { ProspectingAgentBuilder } from "@/app/app/prospecting/_create-agent";
import { CartaoDeEscolha } from "@/components/escale/campanhas/molde/CartaoDeEscolha";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  aplicarAgenteCriado,
  canaisDoConstrutor,
  configDoRascunho,
  etapasDoConstrutor,
  funisDasEtapas,
  type RascunhoDaProspeccao,
} from "@/lib/escale/prospeccao/assistente";
import { rotaDoAgente } from "@/lib/escale/prospeccao/rotas";
import type { DetalheDaProspeccao, OpcoesDaProspeccao } from "@/lib/escale/prospeccao/tipos";

import { CampoDeTexto, CampoDeTextoLongo } from "../campos";

/** O bloco do 038: rótulo à esquerda (240px), campo à direita, divisória embaixo. */
function Bloco({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-casca-divisoria py-5 md:grid-cols-[240px_minmax(0,1fr)]">
      <p className="text-[13px] font-medium text-casca-texto">{rotulo}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/**
 * PASSO 3 — CONFIGURE A ABORDAGEM (molde 038; D9, A1). Por conversa:
 * o construtor do original (precisa da campanha criada pela busca); depois de
 * publicar, o cartão do agente. Existente: funil, etapas, oferta e critério à
 * mão. Nos dois: ritmo e quando a empresa entra no funil.
 */
export function PassoAbordagem({
  r,
  atualizar,
  opcoes,
  campanha,
}: {
  r: RascunhoDaProspeccao;
  atualizar: (p: Partial<RascunhoDaProspeccao>) => void;
  opcoes: OpcoesDaProspeccao;
  campanha: DetalheDaProspeccao;
}) {
  const t = useT();
  const etapasDoFunil = opcoes.etapas.filter((e) => e.funilId === r.funilId).map((e) => ({ valor: e.id, rotulo: e.nome }));
  const agente = opcoes.agentes.find((a) => a.id === r.agenteId)?.nome ?? t("Agente publicado e selecionado.");

  return (
    <section className="mx-auto max-w-[1080px]">
      <header className="space-y-1 pb-2">
        <h2 className="text-[18px] font-semibold text-casca-texto">{t("Configure a abordagem")}</h2>
        <p className="text-[12px] text-casca-suave">
          {t("A IA usa o agente escolhido para abrir a conversa e atender as respostas. As proteções do canal continuam valendo.")}
        </p>
      </header>

      {r.modo === "conversa" && !r.agenteId ? (
        <div className="py-5">
          <ProspectingAgentBuilder
            campaign={{ id: campanha.linha.id, name: campanha.linha.nome }}
            config={configDoRascunho(r)}
            channels={canaisDoConstrutor(opcoes)}
            stages={etapasDoConstrutor(opcoes)}
            onCreated={async (_id, criado, setup) => {
              atualizar(aplicarAgenteCriado(criado.agent, setup));
              toast.success(t("Agente publicado e selecionado."));
            }}
          />
        </div>
      ) : null}

      {r.modo === "conversa" && r.agenteId ? (
        <Bloco rotulo={t("Agente de IA")}>
          <p className="text-[13px] font-medium text-casca-texto">{agente}</p>
          <p className="whitespace-pre-wrap text-[12px] text-casca-suave">{r.instrucao}</p>
          <Link href={rotaDoAgente(r.agenteId)} className="text-[12px] text-casca-marca hover:underline">
            {t("Configurações avançadas do agente")}
          </Link>
        </Bloco>
      ) : null}

      {r.modo === "existente" ? (
        <>
          <Bloco rotulo={t("Funil")}>
            <SeletorDaCasca
              aparencia="janela"
              aria-label={t("Funil")}
              vazio={t("Escolha o funil")}
              valor={r.funilId}
              opcoes={funisDasEtapas(opcoes)}
              aoMudar={(v) => atualizar({ funilId: v, etapaId: "", etapaQualificadaId: "" })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[12px] text-casca-suave">{t("Etapa inicial")}</p>
                <SeletorDaCasca aparencia="janela" aria-label={t("Etapa inicial")} vazio={t("Escolha a etapa")} valor={r.etapaId} opcoes={etapasDoFunil} aoMudar={(v) => atualizar({ etapaId: v })} />
              </div>
              <div className="space-y-1.5">
                <p className="text-[12px] text-casca-suave">{t("Etapa de qualificados")}</p>
                <SeletorDaCasca aparencia="janela" aria-label={t("Etapa de qualificados")} vazio={t("Escolha a etapa")} valor={r.etapaQualificadaId} opcoes={etapasDoFunil} aoMudar={(v) => atualizar({ etapaQualificadaId: v })} />
              </div>
            </div>
          </Bloco>
          <Bloco rotulo={t("Oferta e qualificação")}>
            <CampoDeTextoLongo
              id="abordagem-instrucao"
              rotulo={t("O que a IA deve oferecer e como iniciar")}
              valor={r.instrucao}
              aoMudar={(instrucao) => atualizar({ instrucao })}
              maximo={2000}
              placeholder={t("Descreva sua oferta e o objetivo da primeira conversa.")}
              ajuda={t("Este texto se soma ao prompt do agente nas conversas desta campanha. Se você mudar o prompt do agente, confira se os dois ainda dizem a mesma coisa.")}
            />
            <CampoDeTextoLongo
              id="abordagem-qualificacao"
              rotulo={t("Quando considerar o cliente qualificado")}
              valor={r.qualificacao}
              aoMudar={(qualificacao) => atualizar({ qualificacao })}
              maximo={2000}
              placeholder={t("Ex.: confirmou a necessidade, participa da decisão e deseja conversar sobre a solução.")}
            />
          </Bloco>
        </>
      ) : null}

      <Bloco rotulo={t("Ritmo")}>
        <div className="grid grid-cols-2 gap-3">
          <CampoDeTexto id="abordagem-diario" numerico rotulo={t("Máximo em 24 horas")} valor={r.limiteDiario} aoMudar={(limiteDiario) => atualizar({ limiteDiario })} />
          <CampoDeTexto id="abordagem-intervalo" numerico rotulo={t("Intervalo mínimo (minutos)")} valor={r.intervaloMinutos} aoMudar={(intervaloMinutos) => atualizar({ intervaloMinutos })} />
        </div>
      </Bloco>

      <Bloco rotulo={t("Quando a empresa entra no funil")}>
        <div role="radiogroup" aria-label={t("Quando a empresa entra no funil")} className="grid gap-3 md:grid-cols-2">
          <CartaoDeEscolha
            selecionado={r.entrada === "on_send"}
            aoEscolher={() => atualizar({ entrada: "on_send" })}
            titulo={t("Só quando for abordada (recomendado)")}
            descricao={t("O funil mostra só quem já recebeu a primeira mensagem.")}
          />
          <CartaoDeEscolha
            selecionado={r.entrada === "on_start"}
            aoEscolher={() => atualizar({ entrada: "on_start" })}
            titulo={t("Todas ao iniciar")}
            descricao={t("Contato, negócio e conversa de toda a fila são criados na hora de iniciar.")}
          />
        </div>
      </Bloco>
    </section>
  );
}
```

- [ ] **Step 4: `components/escale/prospeccao/assistente/PassoConfirme.tsx`**

```tsx
"use client";
import { ResumoDoEnvio } from "@/components/escale/campanhas/molde/ResumoDoEnvio";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { custoEmDolar, textoDoRitmo } from "@/lib/escale/prospeccao/apresentacao";
import { inteiroDoTexto, type RascunhoDaProspeccao } from "@/lib/escale/prospeccao/assistente";
import { contarMarcadas } from "@/lib/escale/prospeccao/selecao";
import type { DetalheDaProspeccao, OpcoesDaProspeccao } from "@/lib/escale/prospeccao/tipos";
import { Bot, Clock, Phone, Tag, Users } from "@/lib/ui/icons-da-casca";

import { CampoDeTextoLongo } from "../campos";

/**
 * PASSO 4 — CONFIRME E INICIE (molde 044; D9): o resumo com ícones, o custo
 * da busca na faixa de baixo (a Clint mostra o custo estimado; aqui é o custo
 * real da busca em US$), a base legal obrigatória e o aviso do original.
 */
export function PassoConfirme({
  r,
  atualizar,
  opcoes,
  detalhe,
}: {
  r: RascunhoDaProspeccao;
  atualizar: (p: Partial<RascunhoDaProspeccao>) => void;
  opcoes: OpcoesDaProspeccao;
  detalhe: DetalheDaProspeccao;
}) {
  const t = useT();
  const marcadas = contarMarcadas(detalhe.empresas);
  const numero = opcoes.numeros.find((n) => n.id === r.numeroId)?.nome ?? "—";
  const agente = opcoes.agentes.find((a) => a.id === r.agenteId)?.nome ?? "—";

  return (
    <section className="mx-auto max-w-[640px] space-y-4">
      <h2 className="text-[18px] font-semibold text-casca-texto">{t("Confirme sua prospecção")}</h2>
      <ResumoDoEnvio
        linhas={[
          { icone: <Tag size={14} aria-hidden />, rotulo: t("Nome da prospecção"), valor: r.nome },
          { icone: <Phone size={14} aria-hidden />, rotulo: t("Número de WhatsApp"), valor: numero },
          { icone: <Bot size={14} aria-hidden />, rotulo: t("Agente de IA"), valor: agente },
          {
            icone: <Users size={14} aria-hidden />,
            rotulo: t("Abordar"),
            valor: marcadas === 1 ? t("1 empresa marcada") : t("{n} empresas marcadas").replace("{n}", numeroBr(marcadas)),
          },
          {
            icone: <Clock size={14} aria-hidden />,
            rotulo: t("Ritmo"),
            valor: textoDoRitmo(inteiroDoTexto(r.limiteDiario) ?? 0, inteiroDoTexto(r.intervaloMinutos) ?? 0, t),
          },
        ]}
        rodape={
          <div className="flex items-center justify-between px-4 py-3 text-[12px] text-casca-marca">
            <span>{t("Custo da busca")}</span>
            <strong className="text-[15px]">{custoEmDolar(detalhe.custoUsd)}</strong>
          </div>
        }
      />
      <CampoDeTextoLongo
        id="confirme-base-legal"
        rotulo={t("Referência da avaliação de legítimo interesse")}
        valor={r.baseLegal}
        aoMudar={(baseLegal) => atualizar({ baseLegal })}
        maximo={500}
        ajuda={t("Informe a referência real da avaliação que fundamenta esta prospecção. Isso não registra consentimento dos contatos.")}
      />
      <aside className="rounded-r-md border-l-2 border-casca-marca bg-casca-marca-suave p-4 text-[12px] text-casca-texto">
        {r.entrada === "on_send"
          ? t("Ao iniciar, as empresas com telefone entram na fila. Cada uma entra no funil só quando for abordada. Contatos já existentes são preservados. A fila faz uma primeira abordagem; respostas seguem no Inbox. Uma mensagem já em transmissão pode concluir após a pausa.")
          : t("Ao iniciar, os contatos novos com telefone entram no funil. Contatos já existentes são preservados. A fila faz uma primeira abordagem; respostas seguem no Inbox. Uma mensagem já em transmissão pode concluir após a pausa.")}
      </aside>
    </section>
  );
}
```

- [ ] **Step 5: Ligar os passos 3 e 4 no assistente**

Em `components/escale/prospeccao/assistente/AssistenteDeProspeccao.tsx`:

1. Acrescente os imports:

```tsx
import { PassoAbordagem } from "./PassoAbordagem";
import { PassoConfirme } from "./PassoConfirme";
import { configDoRascunho } from "@/lib/escale/prospeccao/assistente";
import { Send } from "@/lib/ui/icons-da-casca";
```

(junte `configDoRascunho` ao import já existente de `@/lib/escale/prospeccao/assistente`).

2. Logo depois de `function salvarRascunho() {…}`, acrescente:

```tsx
  async function iniciar() {
    const erros = errosDoPasso(3, r, ctx);
    if (erros.length) return setMostrar(erros.map(t));
    if (!campanhaId) return;
    try {
      await acao.mutateAsync({ action: "start", id: campanhaId, config: configDoRascunho(r) });
      toast.success(t("Campanha iniciada. A primeira abordagem será preparada após um minuto."));
      router.push(rotaDaAba("prospeccao"));
    } catch (e) {
      toast.error(mensagemDoErro(e, t("Não foi possível concluir a operação.")));
    }
  }
```

3. Troque a linha do `const rodape = …` por:

```tsx
  const principal =
    passo === 3
      ? { rotulo: t("Iniciar prospecção"), aoClicar: () => void iniciar(), carregando: acao.isPending, icone: <Send size={14} aria-hidden /> }
      : { rotulo: t("Próximo"), aoClicar: avancar };
  const rodape = <RodapeDoAssistente aoVoltar={voltar} rotuloVoltar={t("Voltar")} extras={extras} principal={principal} />;
```

4. Troque o último ramo do conteúdo

```tsx
      ) : (
        <p className="text-[13px] text-casca-suave">{t(PASSOS_DA_PROSPECCAO[passo])}</p>
      )}
```

por

```tsx
      ) : !d ? (
        <p role="status" className="text-[13px] text-casca-suave">
          {t("Carregando prospecção")}
        </p>
      ) : passo === 2 ? (
        <PassoAbordagem r={r} atualizar={atualizar} opcoes={opcoes} campanha={d} />
      ) : (
        <PassoConfirme r={r} atualizar={atualizar} opcoes={opcoes} detalhe={d} />
      )}
```

Os passos 3 e 4 só são alcançáveis com a campanha criada (o passo 2 exige a busca concluída), então `d` existe; o ramo `!d` cobre a primeira consulta depois de reabrir.

- [ ] **Step 6: Rodar e conferir**

```bash
corepack pnpm vitest run tests/unit/escale-prospeccao-assistente-final.test.tsx tests/unit/escale-prospeccao-assistente.test.tsx
corepack pnpm prettier --write components/escale/prospeccao/assistente tests/unit/escale-prospeccao-assistente-final.test.tsx
corepack pnpm eslint components/escale/prospeccao/assistente
corepack pnpm typecheck
```

Expected: PASS. Se o tipo do `onCreated` do `ProspectingAgentBuilder` reclamar do `setup` em `aplicarAgenteCriado`, é porque `SetupDoAgente` (Task 1) é um `Pick` do `CampaignConfig` e o `setup` do original tem os mesmos campos com os mesmos tipos: confira com `grep -n "AgentSetup" app/app/prospecting/_create-agent.tsx` e, se o nome dos campos for outro, ajuste o `Pick`.

- [ ] **Step 7: Commit**

```bash
git add components/escale/prospeccao/assistente tests/unit/escale-prospeccao-assistente-final.test.tsx
git commit -m "feat(escale): assistente de prospecção — abordagem, confirmação, iniciar, rascunho e cópia (Fase 8D)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 10: Espanhol, cercas, PRD, LOG e o PR

**Files:**
- Modify: `lib/i18n/dicionario.ts`; fora do repositório, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md` e `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`

- [ ] **Step 1: Quais chaves já existem**

O dicionário recusa chave repetida (o TypeScript reprova propriedade duplicada), e a chave pode estar sem aspas. Antes de colar:

```bash
cat > "$TEMP/chaves-8d.cjs" <<'EOF'
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

Cole as chaves do bloco do Step 2 (uma por linha, só a chave, sem aspas) em `$TEMP/chaves-8d.txt` e rode `node "$TEMP/chaves-8d.cjs" "$TEMP/chaves-8d.txt"`. **Tire do bloco toda chave que sair como `JA:`** (a 8A, a 8B e a 8C podem ter criado algumas, como "Sumário", "Detalhes", "Voltar", "Salvar como rascunho", " Cópia", "Em progresso", "Completo").

- [ ] **Step 2: O bloco do espanhol**

Em `lib/i18n/dicionario.ts`, logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` (depois dos blocos da 8A, 8B e 8C):

```ts
  // ─── FORK ESCALE · Fase 8D: prospecção na aba de Campanhas ───
  "Buscando empresas": { es: "Buscando empresas" },
  "Erro na busca": { es: "Error en la búsqueda" },
  "Em progresso": { es: "En progreso" },
  "Completo": { es: "Completo" },
  "Estamos buscando as empresas no Google Maps.": { es: "Estamos buscando las empresas en Google Maps." },
  "A busca não terminou. Abra a prospecção para ver o motivo.": { es: "La búsqueda no terminó. Abre la prospección para ver el motivo." },
  "A busca terminou e a prospecção aguarda a configuração da abordagem.": { es: "La búsqueda terminó y la prospección espera la configuración del abordaje." },
  "O agente está abordando as empresas aos poucos, no ritmo escolhido.": { es: "El agente está abordando las empresas de a poco, al ritmo elegido." },
  "Nenhuma empresa nova é abordada até você retomar.": { es: "Ninguna empresa nueva es abordada hasta que reanudes." },
  "Todas as empresas da fila foram abordadas.": { es: "Todas las empresas de la fila fueron abordadas." },
  "{n} com falha - {p}%": { es: "{n} con fallo - {p}%" },
  "{n} abordadas - {p}%": { es: "{n} abordadas - {p}%" },
  "{n} responderam - {p}%": { es: "{n} respondieron - {p}%" },
  "{n} qualificadas - {p}%": { es: "{n} calificadas - {p}%" },
  "Nenhuma abordagem ainda": { es: "Ningún abordaje todavía" },
  "Encontradas": { es: "Encontradas" },
  "Abordadas": { es: "Abordadas" },
  "Qualificadas": { es: "Calificadas" },
  "% sobre encontradas": { es: "% sobre encontradas" },
  "1 empresa": { es: "1 empresa" },
  "{n} empresas": { es: "{n} empresas" },
  "1 empresa encontrada": { es: "1 empresa encontrada" },
  "{n} empresas encontradas": { es: "{n} empresas encontradas" },
  "{n} abordagens em 24 horas, com pelo menos {m} minutos entre elas.": { es: "{n} abordajes en 24 horas, con al menos {m} minutos entre ellos." },
  "Data de início": { es: "Fecha de inicio" },
  "Pausar prospecção": { es: "Pausar prospección" },
  "Retomar prospecção": { es: "Reanudar prospección" },
  "Continuar rascunho": { es: "Continuar borrador" },
  "Duplicar prospecção": { es: "Duplicar prospección" },
  "Nenhuma prospecção encontrada": { es: "No se encontró ninguna prospección" },
  "Não foi possível carregar as prospecções.": { es: "No se pudieron cargar las prospecciones." },
  "Carregando prospecções": { es: "Cargando prospecciones" },
  "Buscar prospecção": { es: "Buscar prospección" },
  "Prospecção retomada.": { es: "Prospección reanudada." },
  "Nova prospecção": { es: "Nueva prospección" },
  "Configuração da prospecção": { es: "Configuración de la prospección" },
  "Chave da Apify": { es: "Clave de Apify" },
  "A chave tem de 10 a 500 caracteres.": { es: "La clave tiene de 10 a 500 caracteres." },
  "Configurar chave": { es: "Configurar clave" },
  "Configure a chave de busca": { es: "Configura la clave de búsqueda" },
  "A prospecção busca empresas no Google Maps pela Apify. Salve a chave da sua conta para começar.": { es: "La prospección busca empresas en Google Maps a través de Apify. Guarda la clave de tu cuenta para empezar." },
  "Crie sua primeira prospecção": { es: "Crea tu primera prospección" },
  "Encontre empresas fora do CRM e deixe um agente de IA fazer a primeira abordagem.": { es: "Encuentra empresas fuera del CRM y deja que un agente de IA haga el primer abordaje." },
  "INFORMAÇÕES DA PROSPECÇÃO": { es: "INFORMACIÓN DE LA PROSPECCIÓN" },
  "Sumário": { es: "Resumen" },
  "Detalhes": { es: "Detalles" },
  "Carregando prospecção": { es: "Cargando prospección" },
  "Não foi possível carregar a prospecção.": { es: "No se pudo cargar la prospección." },
  "Prospecção não encontrada.": { es: "Prospección no encontrada." },
  "Empresas que a busca trouxe, sem as repetidas ou fechadas.": { es: "Empresas que trajo la búsqueda, sin las repetidas o cerradas." },
  "Empresas que receberam a primeira mensagem do agente.": { es: "Empresas que recibieron el primer mensaje del agente." },
  "Empresas que responderam à abordagem.": { es: "Empresas que respondieron al abordaje." },
  "Empresas que o agente moveu para a etapa de qualificados.": { es: "Empresas que el agente movió a la etapa de calificados." },
  "Fila": { es: "Fila" },
  "Não abordadas": { es: "No abordadas" },
  "Com falha": { es: "Con fallo" },
  "Busca": { es: "Búsqueda" },
  "Custo da busca": { es: "Costo de la búsqueda" },
  "{n} resultados repetidos ou indisponíveis foram desconsiderados.": { es: "{n} resultados repetidos o no disponibles fueron descartados." },
  "Abordagem": { es: "Abordaje" },
  "A abordagem ainda não foi configurada.": { es: "El abordaje aún no fue configurado." },
  "Ritmo": { es: "Ritmo" },
  "Buscar empresa": { es: "Buscar empresa" },
  "Telefone": { es: "Teléfono" },
  "Abrir conversa": { es: "Abrir conversación" },
  "Nenhuma empresa neste filtro.": { es: "Ninguna empresa en este filtro." },
  "As empresas desmarcadas saem desta lista e podem aparecer de novo numa busca futura. Esta ação não pode ser desfeita.": { es: "Las empresas desmarcadas salen de esta lista y pueden aparecer de nuevo en una búsqueda futura. Esta acción no se puede deshacer." },
  "Configure a sua prospecção": { es: "Configura tu prospección" },
  "Encontre empresas": { es: "Encuentra empresas" },
  "Configure a abordagem": { es: "Configura el abordaje" },
  "Confirme e inicie": { es: "Confirma e inicia" },
  "Continuar prospecção": { es: "Continuar prospección" },
  "Voltar": { es: "Volver" },
  "Salvar como rascunho": { es: "Guardar como borrador" },
  "Iniciar prospecção": { es: "Iniciar prospección" },
  "Prospecção com IA": { es: "Prospección con IA" },
  "Dê um nome à prospecção, escolha o número e quem vai conversar com as empresas.": { es: "Ponle un nombre a la prospección, elige el número y quién conversará con las empresas." },
  "Nome da prospecção": { es: "Nombre de la prospección" },
  "Ex: Clínicas de estética em Campinas": { es: "Ej.: Clínicas de estética en Campinas" },
  "O nome foi gravado com a busca.": { es: "El nombre se guardó con la búsqueda." },
  "Número de WhatsApp": { es: "Número de WhatsApp" },
  "Selecionar número": { es: "Seleccionar número" },
  "Não oficial": { es: "No oficial" },
  "Nenhuma conexão ativa permite iniciar conversas de texto.": { es: "Ninguna conexión activa permite iniciar conversaciones de texto." },
  "Só números não oficiais: a prospecção abre a conversa com texto livre, e o número oficial exige modelo aprovado.": { es: "Solo números no oficiales: la prospección abre la conversación con texto libre, y el número oficial exige plantilla aprobada." },
  "A IA monta o agente conversando com você no passo 3, depois da busca.": { es: "La IA arma el agente conversando contigo en el paso 3, después de la búsqueda." },
  "Usar agente existente": { es: "Usar agente existente" },
  "Escolha um agente publicado e configure a abordagem à mão.": { es: "Elige un agente publicado y configura el abordaje a mano." },
  "O nome precisa ter de 3 a 80 caracteres.": { es: "El nombre debe tener de 3 a 80 caracteres." },
  "Escolha o número que vai abordar as empresas.": { es: "Elige el número que abordará a las empresas." },
  "Busque as empresas e espere a busca terminar.": { es: "Busca las empresas y espera a que la búsqueda termine." },
  "Marque pelo menos uma empresa para abordar.": { es: "Marca al menos una empresa para abordar." },
  "Termine a conversa e publique o agente antes de seguir.": { es: "Termina la conversación y publica el agente antes de seguir." },
  "Escolha duas etapas abertas e diferentes do mesmo funil: entrada e qualificados.": { es: "Elige dos etapas abiertas y diferentes del mismo embudo: entrada y calificados." },
  "Descreva o que a IA deve oferecer (de 10 a 2.000 caracteres).": { es: "Describe lo que la IA debe ofrecer (de 10 a 2.000 caracteres)." },
  "Descreva quando o cliente está qualificado (de 10 a 2.000 caracteres).": { es: "Describe cuándo el cliente está calificado (de 10 a 2.000 caracteres)." },
  "O máximo em 24 horas vai de 1 a 50.": { es: "El máximo en 24 horas va de 1 a 50." },
  "O intervalo mínimo vai de 5 a 1.440 minutos.": { es: "El intervalo mínimo va de 5 a 1.440 minutos." },
  "Informe a referência da avaliação de legítimo interesse (de 3 a 500 caracteres).": { es: "Informa la referencia de la evaluación de interés legítimo (de 3 a 500 caracteres)." },
  "Informe o público ou segmento (de 2 a 120 caracteres).": { es: "Informa el público o segmento (de 2 a 120 caracteres)." },
  "Informe a cidade ou região (de 2 a 160 caracteres).": { es: "Informa la ciudad o región (de 2 a 160 caracteres)." },
  "Até quantas empresas: de 1 a 100.": { es: "Hasta cuántas empresas: de 1 a 100." },
  "O teto da busca vai de US$ 0,50 a US$ 10,00.": { es: "El tope de la búsqueda va de US$ 0,50 a US$ 10,00." },
  "A busca traz empresas do Google Maps. Você escolhe quais o agente vai abordar.": { es: "La búsqueda trae empresas de Google Maps. Tú eliges cuáles abordará el agente." },
  "Cada busca cria uma prospecção nova e cobra da sua conta da Apify até o teto informado.": { es: "Cada búsqueda crea una prospección nueva y cobra a tu cuenta de Apify hasta el tope informado." },
  "Buscando empresas no Google Maps. Isso pode levar alguns minutos; você pode sair e voltar pela lista.": { es: "Buscando empresas en Google Maps. Puede tardar algunos minutos; puedes salir y volver por la lista." },
  "A busca não terminou.": { es: "La búsqueda no terminó." },
  "Buscar de novo": { es: "Buscar de nuevo" },
  "{n} empresas encontradas · {m} marcadas": { es: "{n} empresas encontradas · {m} marcadas" },
  "Selecionar todas": { es: "Seleccionar todas" },
  "Empresas sem telefone ou que já são contatos do CRM ficam de fora ao iniciar.": { es: "Las empresas sin teléfono o que ya son contactos del CRM quedan fuera al iniciar." },
  "Oferta e qualificação": { es: "Oferta y calificación" },
  "Confirme sua prospecção": { es: "Confirma tu prospección" },
  "1 empresa marcada": { es: "1 empresa marcada" },
  "{n} empresas marcadas": { es: "{n} empresas marcadas" },
  "Rascunho salvo. A busca e as empresas marcadas ficam guardadas; o resto da configuração não.": { es: "Borrador guardado. La búsqueda y las empresas marcadas quedan guardadas; el resto de la configuración no." },
  "Esta prospecção já começou. Acompanhe pela lista.": { es: "Esta prospección ya comenzó. Síguela desde la lista." },
  "Voltar para a lista": { es: "Volver a la lista" },
  " Cópia": { es: " Copia" },
```

- [ ] **Step 3: Cercas e a fase inteira**

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts tests/unit/vocabulario-do-funil.test.ts tests/unit/evidencia-citada.test.ts tests/unit/escale-casca-v2-original-intacto.test.tsx tests/unit/escale-casca-tokens.test.ts
corepack pnpm vitest run $(git diff --name-only escale-crm/main...HEAD | grep -E "\.test\.tsx?$" | grep -v "^tests/invariants") tests/unit/prospecting.test.ts app/api/v1/prospecting/route.test.ts
corepack pnpm typecheck && corepack pnpm eslint $(git diff --name-only escale-crm/main...HEAD | grep -E "\.(ts|tsx)$")
```

Expected: tudo PASS. Os nomes exatos das cercas: `ls tests/unit | grep -E "i18n|tokens|decorativo|vocabulario|evidencia|intacto"`. Se o `i18n-espanhol-cobre-a-tela` acusar prosa fora de `t()`, a mensagem diz o arquivo e o texto: envolva em `t()` e acrescente a chave no bloco. `tests/unit/prospecting.test.ts` e o teste da rota do original provam que o motor não mudou.

```bash
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol da prospecção na aba de Campanhas (Fase 8D)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

- [ ] **Step 4: O PRD e o LOG (fora do repositório)**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md`:
- seção 8, linha da 8D: a coluna "Estado" de `proposta (molde aprovado em 19/10)` para `executada (PR #<n>, <data>); testes e publicação no fim da Frente B`;
- seção 4, tabela E: a coluna "Fase" de E1–E4 para `8D ✅`, com as diferenças declaradas: E1 com "Data de início" = primeira abordagem e filtros só de busca e status (D6, D7); E2 com o passo 3 "Configure a abordagem" e o construtor por conversa do original (A1, A2); E3 sem "Baixar .CSV"; rascunho reaberto sem número/agente/abordagem (A4). Acrescente na seção 10 a resposta de 19/10: "A Prospecção não precisa replicar a campanha de WhatsApp; o agente adapta."

Em `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`: uma entrada nova no topo da "Linha do tempo" (data de hoje, a 8D executada, o PR, sem migration, as adaptações A1–A4) e "Onde estamos"/"Próximos passos" reescritos (a Frente B de Campanhas está toda executada: próximo é a bateria única da Frente B — rodada cheia, `test:db` com as pendências da 2F e a 9301, `test:db:update`, um revisor Opus 5.5 e a conferência visual — e depois a publicação).

- [ ] **Step 5: O PR**

```bash
git fetch escale-crm --quiet && git rebase escale-crm/main
git push -u escale-crm feat/fase-8d-prospeccao-na-aba
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-8d-prospeccao-na-aba \
  --title "feat(escale): Fase 8D — Prospecção na aba de Campanhas, no molde da Clint" \
  --body "$(cat <<'EOF'
## O que entra
- Com a casca, a aba Prospecção de `/app/campaigns` deixa a tela do original e vira o molde das campanhas de WhatsApp: lista com busca, Status, barra de resultado (Encontradas → Abordadas → Responderam → Qualificadas), Pausar/Retomar na linha e ⋮ (Continuar rascunho, Duplicar).
- "Nova prospecção" abre o assistente em 4 passos (Configure, Encontre empresas, Configure a abordagem, Confirme e inicie) em `/app/campaigns/prospeccao/nova`; rascunho reabre e duplicar preenche.
- Janela de detalhe com Sumário (cartões, funil, fila, busca e custo em US$, abordagem com ritmo editável na pausa) e Detalhes (empresas com progresso, link para a conversa, marcar/desmarcar e excluir desmarcadas).
- Chave da Apify na engrenagem do cabeçalho.
- Três leituras do fork (admin): `GET /api/v1/prospeccao-da-casca`, `/[id]` e `/opcoes`.

## O que não muda
- O motor e as rotas da prospecção do original (toda escrita segue por `POST /api/v1/prospecting`, com as travas: só admin, só número de texto livre, uma campanha rodando, até 50 por dia).
- Sem migration. Sem a casca, `/app/prospecting` segue igual.

## Diferenças declaradas
- A Clint não tem Prospecção: as telas repetem o molde de WhatsApp (002, 018, 038, 044, 009, 012).
- "Data de início" = primeira abordagem; filtros só de busca e status.
- A Prospecção não replica a campanha de WhatsApp (decisão do usuário): passo 3 chamado "Configure a abordagem" (nada ali é opcional) e "Configurar por conversa" com o visual do original.
- Rascunho reaberto guarda a busca e a seleção; número, agente e abordagem são escolhidos de novo (o motor não guarda antes de iniciar).
- Sem "Baixar .CSV" no detalhe.

## Verificação
- Testes da fase, os do motor do original, typecheck, eslint e as cercas da casca.
- Rodada cheia, revisor e conferência visual: na bateria do fim da Frente B.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --repo rgisjr/escale-crm --merge --delete-branch=false
```

Expected: o PR mergeado na `main` do `rgisjr/escale-crm`. **Nada de tag, release nem VPS** (fim da Frente B).

## Fase 8D — Prospecção na aba de Campanhas

Linha da seção 8 do PRD depois desta fase: `| 8D | **Prospecção na aba:** E1–E4 | … | executada (PR #<n>); testes e publicação no fim da Frente B |`.

## Verificação

1. **Por task:** os testes que a task cria, os guardas dos arquivos tocados, typecheck e eslint (D14).
2. **Bateria única da Frente B (depois desta fase, a última de Campanhas):** rodada cheia em segundo plano, `test:db` e `test:db:update` (das fases com migration: 9301 da 8A, as da 8B e da 8C, as pendências da 2F), um revisor (Opus 5.5, high) sobre a frente e a conferência visual lado a lado com 002, 007, 009, 012, 014, 018, 019, 031, 038 e 044, com a lista escrita das diferenças. Antes de publicar: abrir `/app/campaigns?aba=prospeccao` e o assistente com a casca e ler o console (telas novas sem provedor já derrubaram produção — a janela da 8C e o `DicaAoPassar` não usam `TooltipProvider`, mas confira), e conferir no banco, só leitura, que nenhuma tabela da prospecção mudou (`select column_name from information_schema.columns where table_name in ('prospecting_campaigns','prospecting_candidates')` igual ao de antes).

## Fora desta fase (registrado)

- "Baixar .CSV" da prospecção (o motor não exporta).
- Guardar número, agente e abordagem do rascunho antes de iniciar (exigiria migration; A4).
- Refazer o "Configurar por conversa" com o visual da casca (A2).
- Filtros de data e de número na lista de prospecções (D7).
- A chave de permissão por pessoa (trilha de grupos de permissão).

## Self-review (19/10)

1. **Cobertura do PRD:** E1 → Tasks 1, 2, 4, 7 (tabela no molde A5 com nome e "N empresas encontradas", data de início, número, barra Encontradas → Abordadas → Responderam → Qualificadas, status, ⋮ com Duplicar, Pausar/Retomar na linha); E2 → Tasks 1, 8, 9 (botão "Nova prospecção", assistente em 4 passos no padrão B1: Configure com nome, número e agente por conversa/existente; Encontre empresas com nicho, local, limite, orçamento e a lista com caixas; abordagem com funil, etapas, oferta, critério, limite diário, intervalo, entrada no funil; Confirme com resumo, base legal e "Iniciar prospecção"); E3 → Tasks 2, 5, 6 (detalhe no padrão C1: Sumário com Encontradas, Abordadas, Responderam, Qualificadas, funil e custo da busca em US$; Detalhes com tabela por empresa, progresso e link para a conversa); E4 → Tasks 4, 7 (chave na engrenagem). Seção 5 → Task 2 (admin nas três rotas), Task 8 (página só admin), 8A (aba só admin). Seção 7 → sem migration, motor intacto (D2). Decisão 8 → D2 e as travas validadas pelo servidor do original.
2. **Placeholders:** nenhum "TBD". Os pontos "se o typecheck/teste reclamar" dizem o que trocar e onde; os dois parágrafos provisórios (aba Detalhes na Task 5, passos 3 e 4 na Task 8) são trocados em steps nomeados (Task 6 Step 4, Task 9 Step 6).
3. **Tipos entre tasks:** `LinhaDeProspeccao`/`PaginaDeProspeccoes`/`DetalheDaProspeccao`/`OpcoesDaProspeccao` (Task 1) saem de `banco.ts` (Task 2), passam pelos hooks (Task 3) e entram nas telas (4–9); `PedidoDaProspeccao` (Task 3) bate com o `prospectingInputSchema` do original e com os usos em 4–9; `RascunhoDaProspeccao`/`errosDoPasso`/`configDoRascunho`/`inicioDoAssistente`/`aplicarAgenteCriado` (Task 1) são os do assistente (8, 9); `marcavel`/`descartaveis`/`filtrarEmpresas`/`contarMarcadas` (Task 1) são os da aba Detalhes (6) e do passo 2 (8); as props das peças do molde são as do contrato (topo), conferidas na Task 1.
