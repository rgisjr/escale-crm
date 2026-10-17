# Fase 1G — Ficha do negócio: estrutura e cabeçalho (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** C1 a C9 de `docs/modulos/1-negocios.md` (seção 4, tabela C). C10 a C22 ficam fora (1H, 1I, Fase 2 e Fase 3). **Dois PRs** (N12): o PR A entrega a página, o topo, o cabeçalho, as sete abas e o próximo negócio (Tasks 1 a 7); o PR B entrega a linha de ações, o ⋮, o status, o dono, o contador e o botão flutuante (Tasks 8 a 10).

## Perguntas em aberto (respostas do usuário antes do "pode fazer")

| # | Pergunta | O que o plano faz se a resposta for "sim, como está" |
|---|---|---|
| Q1 | **Dois PRs** (A: Tasks 1 a 7; B: Tasks 8 a 10). Aceita? | N12 |
| Q2 | **Layout da página.** A regra de 16 e 17/10 diz "menu e posição da v1, funções e telas internas da v2". A página do negócio é tela interna: o plano copia o desenho da v2 (prints de 17/10: topo com caminho e próximo negócio, cabeçalho, linha de ações, abas) dentro do menu superior da casca, e mantém o painel Origens à esquerda, como na v1 (ficha 01-011, que mostra ORIGENS, VISUALIZAÇÕES e RECENTES ao lado do negócio). Está bem assim? | N1, N2 |
| Q3 | **"Aberto" num negócio ganho ou perdido.** Na Clint o status é independente e o negócio fica na etapa. No nosso motor (regra 4 do roteiro), reabrir é mover para uma etapa aberta. O plano manda o ganho para a **última** etapa aberta e o perdido para a **primeira**; na origem com "reabertura = novo negócio", aparece a janela "Retomar como novo negócio" do original. A alternativa é voltar para a etapa de onde o negócio saiu: o banco guarda isso só para o perdido (`lost_from_stage_id`), e trazer o dado para a tela mexe na rota do quadro (arquivo do Rafael). Fica a regra simples? | N6 |
| Q4 | **Trocar o motivo de um negócio já perdido.** A Clint deixa (texto "O motivo de perda foi alterado com sucesso!"). O plano mostra o motivo, desligado, com a dica "Para trocar o motivo, reabra o negócio." (texto nosso). Fazer já exige conferir se `POST /api/v1/leads/[id]/lose` aceita negócio já perdido. Fica para depois? | N7 |
| Q5 | **Dono com agentes de IA.** A Clint lista só usuários em "Alterar usuário". O nosso motor tem agente de IA como dono e "Sem responsável". O plano põe os três na mesma lista, com os grupos "Pessoas" e "Agentes de IA". Está bem? | N8 |
| Q6 | **Aba Empresa.** O negócio ainda não tem empresa vinculada (C12 é da 1H). O plano mostra a moldura do print 03 com os oito campos da Clint vazios e "Em breve". Ou prefere a aba vazia até a 1H? | N4 |
| Q7 | **"Ocultar vazios", "Pesquisar campos", "Gerenciar campos", busca e filtro do Histórico.** O PRD põe isso na 1H (C10, C14, C18). Na 1G aparecem no lugar certo, desligados com "Em breve". Confirma? | N4 |
| Q8 | **"Visualizar contato" e "N Negócios".** Na Clint os dois abrem uma gaveta do contato por cima do negócio (código: `Me(!0),ue(!0)`). Não há print da gaveta. O plano leva à página do contato do original (`/app/contacts/[id]`). Está bem até haver print? | N9 |
| Q9 | **"Mudar origem".** Na Clint muda a origem do mesmo negócio. No original, "Levar para outro funil" fecha este como perdido e cria um novo na outra origem (rota `clone`). O plano usa a janela do original (regra 4: o motor fica). Confirma? | N10 |
| Q10 | **Cores de Ganho e Perdido.** O código da Clint pinta com `green.fg` e `red.fg` do Chakra v3. O plano começa com os valores padrão do Chakra v3 (`#116932` e `#991919`) e pede a conferência no print 08 com conta-gotas (o print parece mais vivo). Pode medir na Clint (DevTools) e mandar os dois hex? | N7 |
| Q11 | **Dicas dos ícones de ação.** O código confirma "Enviar Email", "Lembretes" e "Nova nota". Os de ligar, conversa e agendar vêm de constantes de outro arquivo que não está no material. O plano usa "Ligar" e "Enviar Whatsapp" (os mesmos da capa do card, 1E) e "Agendar" (texto da Clint em `ScheduleTab`). Está bem? | N5 |
| Q12 | **"+ Adicionar tags".** As tags são do contato (D4 da 1F). Editar tag é editar o contato (C10, 1H). Na 1G o botão aparece desligado com "Em breve". Confirma? | N5 |
| Q13 | **Visualização.** O card de uma Visualização também abre a ficha. A seta do próximo negócio anda na origem do negócio (a Clint, numa visualização, ordena pela data de entrada na etapa). Está bem? | N3, N11 |
| Q14 | **A aba ao passar para o próximo negócio** fica a mesma (quem está no Histórico continua no Histórico). Não há print. Está bem? | N11 |

**Prints que faltam** (nenhum bloqueia; onde falta, o plano diz o desvio):
1. ❌ Um negócio **ganho** (cabeçalho com "Ganho" e o botão "Atribuição de ganho") e um **perdido** na v2 atual (status "Perdido" com o seletor do motivo ao lado). Só há o perdido do print 01-017, antigo.
2. ❌ A página do negócio na **Clint v1 (menu superior) atual**, se o cabeçalho for diferente do da v2 (a ficha 01-011 mostra outro desenho: ícones ao lado do nome, "SEM EMPRESA" em cima do nome, alarme à direita).
3. ❌ O tooltip das setas do próximo negócio (a Clint mostra um cartão com foto e nome) e o "?" de "PRÓXIMO NEGÓCIO" aberto.
4. ❌ As dicas dos seis ícones de ação (Q11) e o "Adicionar tags" clicado.
5. ❌ A confirmação de "Excluir", e "Novo negócio" e "Mudar origem" abertos pelo ⋮.
6. ❌ O que abre ao clicar em "N Negócios" e em "Visualizar contato" (Q8).
7. ❌ O lápis do nome clicado (edição do nome, 1H).
8. ❌ Uma nota criada (1H), um arquivo enviado (1H), o modo espião ligado com uma conversa aberta (1H e Fase 3).
9. ❌ O Histórico com eventos de semanas anteriores (o rótulo da seção depois de "ESTA SEMANA").
10. ❌ A aba Atividades com a coluna "Dias" usada (dias com atividade, o "365" da v1) — é da 1I.
11. ❌ A ficha carregando, com erro e com negócio inexistente.
12. ❌ A aba Empresa com empresa vinculada.

**Goal:** O negócio abre em **tela própria**, igual à Clint (`/deal/:id`), com endereço `/app/negocios/[id]`, só com a casca nova ligada:
- topo com o caminho **grupo › origem › negócio** e o **próximo negócio** (seletor de etapa e setas) (C1, C8);
- cabeçalho com foto e nome, e à direita o contador "N Negócios", o **status** Aberto/Ganho/Perdido com o motivo de perda, o **dono** e o **⋮** (C4 a C7);
- linha de **ações rápidas** e "+ Adicionar tags" (C3);
- as **sete abas** (Atividades, Contato, Empresa, Negócio, Conversas, Arquivos, Histórico), cada uma com a cara da Clint e o que já existe hoje, só leitura (C2);
- o **botão flutuante** de conversas por cima da ficha (C9).
Sem a casca, nada muda: o card abre o dossiê lateral de sempre.

**Architecture:**
- **Rota:** `app/app/negocios/[id]/page.tsx` (servidor) confere sessão, organização e casca, lê o negócio, a origem, o grupo e quantos negócios o contato tem, e entrega à `FichaDoNegocio` (cliente). `app/app/negocios/layout.tsx` reaproveita o `ComOrigens` (painel Origens ao lado, Q2). Sem casca, a rota manda para `/app/leads/[id]`, que manda para o quadro com `?lead=` (o de sempre).
- **Dados:** a ficha usa `useBoard(origemId)`, o mesmo cache do quadro (`["board", id]`). Assim o tempo real, os hooks de ganhar, perder, editar, mover e excluir, e o `useMotivosDePerdaDoFunil` funcionam sem rota nova. O próximo negócio usa o mesmo recorte e a mesma ordem do quadro (`recortarQuadro` e `comparadorDaOrdem` da 1D), lidos dos filtros da URL, que viajam do quadro para a ficha.
- **Entradas:** com a casca, o clique no card (quadro e Visualização), o Recente do painel, o `/app/leads/[id]` e o `?lead=` antigo abrem a ficha.
- **Sem banco:** nenhuma migration, nenhuma rota de API nova.

**Tech Stack:** Next.js 16 App Router (página de servidor + cliente), React 19, TypeScript estrito, TanStack Query 5, Radix (DropdownMenu, Popover, AlertDialog), Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`.

## Referência visual (abrir o PNG antes de cada task de tela)

Os prints de 17/10 têm 1523×784 e estão em 1:1 de CSS px (medida do print = medida da tela). Ficam em C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1g\ e são chamados aqui por número.

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 01 | 2026-10-17-01-ficha-aba-atividades.jpg | topo (caminho, ▾ ‹ › compacto), cabeçalho, linha de ações, abas, trilho de etapas, "Próximas atividades", detalhe | 2, 4, 6, 8 |
| 02 | 2026-10-17-02-aba-contato.jpg | moldura "Campos de contato" | 3 |
| 03 | 2026-10-17-03-aba-empresa.jpg | moldura "Campos de empresa", os oito campos | 3 |
| 04 | 2026-10-17-04-aba-negocio-grupos-de-campos.jpg | moldura "Campos de negócio" (grupos à esquerda) | 3 |
| 05 | 2026-10-17-05-aba-conversas.jpg | faixa do modo espião, "N sessões", vazio "Selecione uma conversa" | 3 |
| 06 | 2026-10-17-06-aba-arquivos.jpg | barra, tabela e vazio de Arquivos | 3 |
| 07 | 2026-10-17-07-aba-historico.jpg | busca, "Todos", seção "ESTA SEMANA", cartões | 2 |
| 08 | 2026-10-17-08-cabecalho-status-aberto-ganho-perdido.jpg | seletor de status aberto | 9 |
| 09 | 2026-10-17-09-cabecalho-menu-tres-pontos.jpg | o ⋮ com os cinco itens | 8 |
| 10 | 2026-10-17-10-cabecalho-alterar-dono.jpg | "Alterar usuário" | 9 |
| 11 | 2026-10-17-11-topo-proximo-negocio-por-etapa.jpg | "PRÓXIMO NEGÓCIO ?", seletor de etapa aberto, setas | 6 |
| 12 | 2026-10-17-12-historico-filtro-por-tipo.jpg | o filtro de tipo do Histórico aberto (é da 1H; aqui só o gatilho "Todos") | 2 |
| v1 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-011-detalhe-negocio-v1.png | a ficha na v1: o painel Origens fica à esquerda (Q2) | 4 |
| 017 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-017-etapas-atividades-card.png | o contador "3 Negócios", o status "Perdido" e o seletor do motivo ao lado (v2 antiga) | 8, 9 |
| 025 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-025-botao-flutuante-conversas.png | o botão flutuante | 10 |

Os caminhos de imagem ficam **sem crase** neste plano: o guarda `tests/unit/evidencia-citada.test.ts` reprova o plano copiado para o repositório quando ele cita, entre crases ou em link, imagem que o git não versiona.

### Medidas tiradas dos prints de 17/10 (1:1)

| Peça | Medida |
|---|---|
| Topo (caminho + próximo negócio) | altura 46px, borda de baixo; texto do caminho 13px, começa 24px depois da borda do conteúdo; o último item em negrito |
| Próximo negócio fechado | caixa de 105×32px com borda: ▾, ‹, › (print 01) |
| Próximo negócio aberto | rótulo "PRÓXIMO NEGÓCIO" 10px maiúsculo + "?" à esquerda; caixa de 248×32px com o nome da etapa; lista de 158px, até 370px de altura com rolagem (print 11) |
| Cabeçalho | altura 56px; foto redonda 32px; nome 15px, 12px depois da foto; lápis 12px |
| Status fechado | 64×32px, borda, ⊖ cinza + ▾ (print 01); aberto: borda na cor da marca, "⊖ Aberto ⌃" (print 08) |
| Dono | círculo de 32px com a inicial; painel "Alterar usuário" de 270px, rótulo 11px, seletor de 32px (print 10) |
| Linha de ações | altura 48px; ícones de 16px na cor da marca, a cada 32px; "+ Adicionar tags" 12–13px |
| Abas | altura 41px; texto 13px; 14px de cada lado do texto; a ativa na cor da marca com sublinhado de 3px |
| Trilho de etapas | altura ~98px; círculos de 24px a cada ~154px; nome 12px embaixo; a etapa atual cheia na cor da marca, com a foto do contato embaixo |
| Moldura de campos | faixa de título de 46px com fundo lilás claro; botões "Ocultar vazios" e "Gerenciar campos" brancos; coluna de grupos de 238px; busca de 166px; rótulos em 275px; caixa de valor de 32px |

### Textos da Clint usados nesta fase

Do catálogo `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\catalog-v2\i18n-pt.txt` (a pasta sem "- Copia" só tem `rea`; o material está na cópia):
- linhas 7486–7513: "Mudar origem", "Alterar usuário", "O próximo negócio leva em consideração a ordem e os filtros atuais da listagem de negócios.", "Visualizar contato", "Tem certeza que deseja excluir este negócio?", "Selecione o motivo da perda", "Selecione um status", "Selecione um usuário", "Enviar Email", "Lembretes", "As permissões de usuários não permitem você trocar de status.", "As permissões de usuários não permitem você trocar de dono", "Editar nome", "Voltar";
- 7541: "Esse negócio não existe ou foi removido";
- 10596–10598: "Não existem próximos negócios nesta etapa.", "Não existem negócios anteriores nesta etapa.";
- 173: "Próximas atividades"; 6551: "Este contato não possui conversas no atendimento"; 6895: "Clique aqui para adicionar"; 6902–6903: "Nenhum arquivo encontrado", "Envie arquivos para mantê-los junto deste contato."; 8283: "Gerenciar campos"; 12791–12792: "Ativar modo espião", "Abra as conversas sem marcá-las como lidas."; 12382: "Agendar".
- Os outros textos de tela ("Campos de negócio", "Ocultar vazios", "Pesquisar campos...", "Informações Gerais", "Buscar no histórico", "Todos", "ESTA SEMANA", "N sessões", "Selecione uma conversa", "Escolha uma conversa ao lado para ver as mensagens.", "Novo arquivo", "Data", "Tipo de arquivo", "ARQUIVO", "DATA DE UPLOAD", "USUÁRIO", "Nova atividade", "+ Adicionar tags", "PRÓXIMO NEGÓCIO", "Aberto", "Ganho", "Perdido", "Novo negócio", "Nova nota", "Excluir") estão nos prints.

### Comportamento da Clint conferido no código

Arquivos em `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\` (minificados, uma linha só; os trechos se acham pelo `data-cy`):
- **Próximo negócio** (`getStageGroupInfo-BptXw8sG.js.txt`): a ordem é a do quadro (`boardSort`), com a posição na etapa (`pos_id`) como desempate; sem ordenação escolhida, `pos_id` crescente; o anterior é a mesma consulta invertida; os filtros do quadro entram (`filter`); numa visualização, a ordem é `updated_stage_at`. Seta sem negócio: desligada, com opacidade 0,4 e a dica "Não existem próximos/anteriores negócios nesta etapa."; seta com negócio: dica com foto e nome do próximo (`tooltip-next-deal`).
- **Cabeçalho** (`index-BKc3FRy4.js.txt`):
  - `bt-briefcase-deal-header`: o contador só aparece com **mais de um** negócio (`Ue>1`), botão "surface" roxo pequeno, e abre o contato;
  - `tbl-chance-deal-status`: o seletor de status recolhe o rótulo (`collapseDelay:"3s"`, `forceExpanded`); quando o status é `LOST`, aparece ao lado o seletor do motivo (`ctnr-lost-reason-select`, largura 240px, já aberto, "Selecione o motivo da perda");
  - "Alterar usuário" (`select-deal-user`): popover com o rótulo `2xs` e um seletor de usuários;
  - `bt-dropdown-deal-header`: Visualizar contato, "Ver atribuição de ganho" (só ganho, é da 1K), Novo negócio, Mudar origem, Nova nota, separador, Excluir (só com a permissão `DEAL_DELETE`);
  - ações: `bt-call-header-deal`, `bt-chat-deal-header`, `bt-email-deal-header` ("Enviar Email"), `bt-schedule-deal-header`, `bt-notes-deal-header`, `bt-reminders-deal-header` ("Lembretes", com contador), `bt-tags-deal-header`.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Endereço `/app/negocios/[id]`**, uma página do servidor que só existe com a casca. Sem a casca, redireciona para `/app/leads/[id]` (que leva ao quadro com `?lead=`). A pasta `app/app/negocios` não tem `page.tsx` própria: a régua `navegacao-completude` não ganha rota | Clint `/deal/:id`. O original continua igual para quem não liga a casca |
| N2 | **O painel Origens fica ao lado da ficha** (`app/app/negocios/layout.tsx` = `ComOrigens`), como na v1 (01-011). O desenho da página é o da v2 (prints de 17/10) | Regra de 16–17/10: menu e posição da v1, telas internas da v2 (Q2) |
| N3 | **Todas as portas levam à ficha, com a casca:** clique no card do quadro e da Visualização, Recente do painel, `/app/leads/[id]` e o `?lead=` antigo do quadro. Os filtros do quadro (parâmetros da 1D) viajam na URL da ficha | C1, e o próximo negócio precisa da ordem e dos filtros do quadro (texto da Clint) |
| N4 | **As sete abas mostram o que existe hoje, só leitura, com a cara da Clint:** Atividades = trilho de etapas + tarefas do negócio + detalhe; Contato = nome, telefone, e-mail e links; Empresa = moldura com os oito campos vazios (Q6); Negócio = Valor + campos do CRM (1F-a) num grupo só, "Informações Gerais"; Conversas = a conversa mais recente; Arquivos = vazio; Histórico = a linha do tempo do original em cartões, por semana. Os grupos de campos, "Ocultar vazios", "Pesquisar campos", "Gerenciar campos", a busca e o filtro do Histórico, o modo espião, enviar arquivo, concluir e criar atividade: no lugar certo, desligados com "Em breve" | C2 é estrutura; o conteúdo é 1H (C10, C14–C18) e 1I (C19–C21) |
| N5 | **Ações rápidas:** ligar (`tel:`), conversa (abre no Inbox) e e-mail (`mailto:`) funcionam, desligados sem telefone, conversa ou e-mail, como na capa da 1E; agendar, nota e lembretes "Em breve"; "+ Adicionar tags" "Em breve" (Q11, Q12) | Agendar e lembrete são atividades (1I); nota é 1H (C15); tags são do contato (1H) |
| N6 | **Status no cabeçalho, sobre o motor do original:** Ganho = `POST /win`; Perdido = seletor do motivo ao lado (os motivos ativos da origem, 1F), e só ao escolher o motivo grava `POST /lose`; Aberto num negócio fechado = mover para a última etapa aberta (ganho) ou para a primeira (perdido), com a janela "Retomar como novo negócio" quando a origem pede (Q3). O rótulo some com o negócio aberto e parado; aparece ao passar o mouse, com o menu aberto e quando o status não é Aberto | Regra 4 do roteiro (ganho e perda são etapas) e o código da Clint |
| N7 | **Cores de Ganho e Perdido** em duas variáveis da casca (`--escale-status-ganho`, `--escale-status-perdido`), lidas por valor arbitrário, como as da 1F. O motivo de um negócio já perdido aparece desligado (Q4) | Sem token verde na casca; a 1F já usa o mesmo padrão (`--escale-prazo-*`) (Q10) |
| N8 | **Dono:** "Alterar usuário" com "Sem responsável", as pessoas e os agentes de IA; grava pelo `PATCH /api/v1/leads/[id]` (o mesmo do ⋮ do card). Sem a permissão `pipeline.move_card`, o círculo fica desligado com o texto da Clint | C5; agente de IA como dono é do original (Q5) |
| N9 | **⋮ do cabeçalho:** Visualizar contato (página do contato, Q8), Novo negócio (o "Novo negócio" do original, já com o contato), Mudar origem (a janela "Levar para outro funil" do original, Q9), Nova nota ("Em breve", 1H), Excluir (a mesma ação em lote do ⋮ do card, com a confirmação e o texto da Clint, e volta ao quadro). Novo negócio, Mudar origem e Excluir só para quem tem `pipeline.move_card`, como no card. "Ver atribuição de ganho" fica fora (1K) | C6 |
| N10 | **Contador "N Negócios"** contado no servidor, com a sessão de quem olha (a RLS decide o que entra), só com 2 ou mais; leva à página do contato | Clint `Ue>1`; contar no servidor evita rota nova |
| N11 | **Próximo negócio:** as etapas não arquivadas da origem; a etapa escolhida começa na do negócio e vai na URL (`pe`); a ordem é a do quadro (`comparadorDaOrdem` da 1D, senão a posição na etapa) e só entram os negócios do recorte (filtros da URL). Negócio fora da etapa escolhida: a seta › leva ao primeiro dela e a ‹ fica desligada. A aba aberta continua ao passar de negócio (Q14) | Código da Clint (seção acima) e "O próximo negócio leva em consideração a ordem e os filtros atuais" |
| N12 | **Dois PRs.** A = Tasks 1 a 7 (página e estrutura); B = Tasks 8 a 10 (cabeçalho e ações). O PR B nasce da `main` depois do merge do A | O escopo passa de 10 tasks num PR só (Q1) |
| N13 | **Botão flutuante (C9):** a ficha é página, sem cortina; o botão da casca fica por cima (z-40) e clicar numa conversa sai para o Inbox, e o "voltar" do navegador volta ao negócio (a ficha tem endereço). Abrir a conversa dentro do painel é a C22 (Fase 3) | PRD §12 ("A 1G resolve") |
| N14 | **O dossiê lateral fica intacto** sem a casca, inclusive o `?lead=` do quadro. Com a casca, o `?lead=` do quadro vira redirecionamento para a ficha, antes de ler o banco | C1 sem quebrar o original |
| G1 | **Verificação enxuta** (aprovada em 17/10). Ver "Verificação" | Política em vigor |

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- **Base do PR A:** `escale-crm/main` com a 1E, a 1F-a, o PR A da 1F (`fa2a71479`) **e o PR B da 1F (`feat/fase-1f-efeitos-no-quadro`) mergeados**. A Task 1 prova. Se faltar o PR B da 1F, PARE e pergunte (ele mexe em `KanbanBoard.tsx`, `_client.tsx` e no card, que esta fase também toca).
- **Sem migration.** A última da `main` é a 9007. Se alguma task descobrir que precisa de banco, PARE: o número seguinte seria a 9008, e uma colisão (outra branch já com 9008) também é motivo de parar e perguntar.
- **Branches:** PR A `feat/fase-1g-ficha-do-negocio`; PR B `feat/fase-1g-cabecalho-e-acoes`, criada da `escale-crm/main` **depois** do merge do PR A (Task 8 prova).
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:** push em `origin` (Rafael), merge, tag, release, VPS e gravar no banco de produção.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- Esta fase não usa `test:db` (não toca o banco).

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 1G`. Sem a casca, nenhum deles muda o comportamento.

| Arquivo | Mudança |
|---|---|
| `app/app/leads/[id]/page.tsx` | com a casca, redireciona para `/app/negocios/[id]` (Task 5) |
| `app/app/pipelines/[id]/page.tsx` | recebe `searchParams`; com a casca e `?lead=`, redireciona para a ficha com os filtros (Task 5) |
| `app/app/pipelines/[id]/_client.tsx` | passa `aoAbrirNegocio` ao `KanbanBoard` só com a casca (Task 5) |
| `components/kanban/KanbanBoard.tsx` | prop nova `aoAbrirNegocio`; só a coluna da casca (`ColunaDoFunilNaCasca`) a usa; a `StageColumn` continua com o dossiê (Task 5) |
| `lib/i18n/dicionario.ts` | bloco novo logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`, depois dos blocos da 1F (Tasks 7 e 10) |

Os do fork: `lib/escale/recentes/regras.ts` (o link do Recente), `components/escale/visualizacoes/QuadroCombinado.tsx` e `QuadroDaVisualizacao.tsx` (o card da Visualização), `lib/ui/icons-da-casca.ts` (ícones), `app/escale-tema.css` (as duas cores do status).

### Testes que esta fase muda de propósito

| Teste | O que pinava | Por quê muda |
|---|---|---|
| `tests/unit/escale-recentes-regras.test.ts` (linha ~74) | `linkDoRecente` = `/app/pipelines/<origem>?lead=<id>` | N3: o Recente abre a ficha, `/app/negocios/<id>` |
| `tests/unit/escale-secao-recentes.test.tsx` (se tiver `lead=`) | o `href` do Recente | idem |
| `tests/unit/escale-quadro-da-visualizacao.test.tsx` e `tests/unit/escale-pagina-da-visualizacao.test.tsx` | o mock de `next/navigation` só com `useSearchParams` | o `QuadroDaVisualizacao` passa a usar `useRouter` (Task 5) |

### Cercas que precisam ficar verdes

- `controle-decorativo`: todo botão desligado tem `title` (as peças "Em breve" têm).
- `tailwind-tokens`: cores só por token da casca ou por `var(--escale-*)`; nenhum hex novo em `className`.
- `vocabulario-do-funil`: nenhum "pipeline"/"kanban" em texto de JSX (entre `>` e `<`). Cuidado com variáveis em linha de JSX.
- `evidencia-citada`: este plano, copiado para o repositório, não cita imagem entre crases nem em link.
- `escale-casca-v2-original-intacto`: as peças do shell do original não importam `@/components/escale/`. As páginas do original importam só `@/lib/escale/` (como `pipelines/[id]/page.tsx` já faz).
- `altura-fixa-le-a-reserva-do-rodape`: a altura da ficha lê `--rodape-ocupado` (copiada do quadro).
- `navegacao-completude`: `app/app/negocios/` não tem `page.tsx` na raiz; `[id]` é tela de detalhe.
- `i18n-espanhol-cobre-a-tela`: os textos novos têm espanhol (Tasks 7 e 10).
- `lib/clipboard.test.ts`: nada de `navigator.clipboard` cru (a fase não copia nada).

### Verificação (G1 — aprovada em 17/10)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit tests/invariants lib app components --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os de `tests/unit` com `corepack pnpm vitest run <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db`:** não entra (a fase não toca o banco). Na rodada cheia ele roda como sempre.
3. **Revisor (subagente) só** na Task 4 (a moldura da ficha, UI grande), na Task 5 (rotas e redirecionamentos) e na Task 9 (status e dono, que gravam). As outras são checadas pelo controlador, lendo o diff.
4. **Uma rodada cheia por PR**, no fim (Tasks 7 e 10), em segundo plano enquanto o texto do PR é escrito. Sem worktree da `main`: as falhas são comparadas com `.superpowers/sdd/falhas-conhecidas.txt` (a lista da 1F-a, Task 5, Step 1; se o arquivo não existir, crie-o com o mesmo conteúdo).
5. **Conferência visual** do contrato só no fim de cada PR (CAMINHO A ou B), não por task: cada aba e cada estado contra o print citado, com a lista escrita das diferenças que sobram.

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório no PR A (Task 1).
- Todo texto de tela por `t()` com literal. Datas e moeda no formato brasileiro.

## Arquivos

| Arquivo | Novo/alterado | PR | Responsabilidade |
|---|---|---|---|
| `lib/escale/negocio/regras.ts` | novo | A | abas, URL, caminho, vizinhos, reabrir, contador, datas, seções do histórico |
| `components/escale/negocio/FotoDaFicha.tsx` | novo | A | a foto do contato em 32px (cabeçalho), 20px (trilho) e 40px (conversa) |
| `components/escale/negocio/abas/AbaAtividades.tsx`, `AbaHistorico.tsx` | novos | A | duas abas |
| `components/escale/negocio/abas/CamposDaFicha.tsx`, `AbasDeCampos.tsx`, `AbaConversas.tsx`, `AbaArquivos.tsx` | novos | A | cinco abas |
| `hooks/escale/useFichaDoNegocio.ts` | novo | A | o negócio, a origem, as etapas, o recorte e a ordem, do cache do quadro |
| `components/escale/negocio/FichaDoNegocio.tsx`, `TopoDaFicha.tsx`, `CabecalhoDaFicha.tsx`, `AbasDaFicha.tsx`, `ConteudoDaAba.tsx` | novos | A | a moldura |
| `components/escale/negocio/ProximoNegocio.tsx` | novo | A | C8 |
| `app/app/negocios/layout.tsx`, `app/app/negocios/[id]/page.tsx` | novos | A | a rota |
| `app/app/leads/[id]/page.tsx`, `app/app/pipelines/[id]/page.tsx`, `app/app/pipelines/[id]/_client.tsx`, `components/kanban/KanbanBoard.tsx` | alterados (encaixes) | A | as portas |
| `components/escale/visualizacoes/QuadroCombinado.tsx`, `QuadroDaVisualizacao.tsx`, `lib/escale/recentes/regras.ts` | alterados | A | as portas do fork |
| `lib/ui/icons-da-casca.ts` | alterado | A | `StickyNote`, `ArrowRightLeft`, `Target`, `Glasses`, `MessagesSquare` |
| `components/escale/negocio/AcoesDaFicha.tsx`, `MenuDaFicha.tsx`, `ContadorDeNegocios.tsx` | novos | B | C3, C6, C7 |
| `components/escale/negocio/StatusDaFicha.tsx`, `DonoDaFicha.tsx`, `app/escale-tema.css` | novos / alterado | B | C4, C5 |
| `lib/i18n/dicionario.ts` | alterado | A e B | espanhol |
| Testes: `tests/unit/escale-ficha-regras.test.ts`, `escale-ficha-abas-atividades-historico.test.tsx`, `escale-ficha-abas-campos-conversas-arquivos.test.tsx`, `escale-ficha-do-negocio.test.tsx`, `escale-ficha-rotas.test.ts`, `escale-ficha-abre-pelo-card.test.ts`, `escale-ficha-proximo-negocio.test.tsx`, `escale-ficha-acoes-e-menu.test.tsx`, `escale-ficha-status-e-dono.test.tsx` (novos); `escale-recentes-regras.test.ts`, `escale-conversas-flutuante.test.tsx` (alterados) | | A e B | |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md` | alterado (fora do repositório) | A e B | a linha da 1G na seção 8 |

---

# PR A — A página, o topo, as abas e o próximo negócio

### Task 1: Base, branch e as regras puras da ficha

**Files:**
- Create: `lib/escale/negocio/regras.ts`, `tests/unit/escale-ficha-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/`

**Interfaces (Produces):** `ABAS_DO_NEGOCIO`, `AbaDoNegocio`, `ROTULO_DA_ABA`, `PARAM_ABA`, `PARAM_ETAPA_DO_PROXIMO`, `abaDaUrl`, `ParametrosDaPagina`, `buscaDosParametros`, `buscaDoQuadro`, `rotaDoNegocio`, `rotaDoQuadro`, `Migalha`, `migalhasDoNegocio`, `Vizinhos`, `vizinhosNaEtapa`, `etapasDoProximo`, `StatusDoNegocio`, `etapaParaReabrir`, `deveMostrarContador`, `cabecalhoDoDia`, `horaDaTarefa`, `diasDasTarefas`, `haQuantoTempo`, `secoesDoHistorico`.

- [ ] **Step 1: A base e a branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:components/escale/configuracoes/JanelaDaOrigem.tsx && echo "1F A ok"
git cat-file -e escale-crm/main:lib/escale/configuracoes/ao-sair.ts && echo "1F B ok"
git cat-file -e escale-crm/main:app/app/negocios 2>/dev/null && echo "ATENÇÃO: app/app/negocios já existe" || echo "sem negocios ok"
git ls-tree --name-only escale-crm/main supabase/migrations/ | sort | tail -2
git switch -c feat/fase-1g-ficha-do-negocio escale-crm/main
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-17-fase-1g-ficha-do-negocio.md" docs/superpowers/plans/
```
Expected: `1F A ok`, `1F B ok`, `sem negocios ok`; a última migration é a 9007 (ou maior, se outra fase entrou; esta não cria nenhuma). Sem `1F B ok`, PARE.

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-ficha-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  abaDaUrl,
  buscaDoQuadro,
  buscaDosParametros,
  cabecalhoDoDia,
  deveMostrarContador,
  diasDasTarefas,
  etapaParaReabrir,
  etapasDoProximo,
  haQuantoTempo,
  migalhasDoNegocio,
  rotaDoNegocio,
  rotaDoQuadro,
  secoesDoHistorico,
  vizinhosNaEtapa,
} from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G: as regras puras da ficha do negócio (C1, C4, C7, C8). */
const etapa = (id: string, position: number, extra: Partial<Stage> = {}): Stage => ({
  id,
  organization_id: "o",
  pipeline_id: "p",
  name: id,
  slug: id,
  position,
  color: null,
  is_won: false,
  is_lost: false,
  is_archived: false,
  expected_duration_hours: null,
  ...extra,
});
const negocio = (id: string, stage_id: string, position_in_stage: number): Lead =>
  ({ id, stage_id, position_in_stage, title: id }) as Lead;

describe("a URL da ficha", () => {
  it("aba desconhecida ou ausente cai em Atividades", () => {
    expect(abaDaUrl(null)).toBe("atividades");
    expect(abaDaUrl("xyz")).toBe("atividades");
    expect(abaDaUrl("historico")).toBe("historico");
  });

  it("os filtros do quadro viajam com a ficha; lead, aba e pe não", () => {
    expect(buscaDoQuadro("st=open&f=abc&lead=1&aba=contato&pe=e2")).toBe("st=open&f=abc");
    expect(rotaDoNegocio("n1", "st=open&lead=9")).toBe("/app/negocios/n1?st=open");
    expect(rotaDoNegocio("n1", "", { aba: "historico", etapa: "e2" })).toBe("/app/negocios/n1?aba=historico&pe=e2");
    expect(rotaDoNegocio("n1", "aba=contato", { aba: "atividades" })).toBe("/app/negocios/n1");
    expect(rotaDoQuadro("o1", "st=open&aba=contato")).toBe("/app/pipelines/o1?st=open");
    expect(rotaDoQuadro("o1")).toBe("/app/pipelines/o1");
  });

  it("os parâmetros da página do servidor viram busca, com os repetidos", () => {
    expect(buscaDosParametros({ st: ["open", "won"], lead: "x", vazio: undefined })).toBe("st=open&st=won&lead=x");
  });
});

describe("caminho grupo › origem › negócio (C1)", () => {
  it("o grupo não é link, a origem volta ao quadro com os filtros, o negócio é o último", () => {
    expect(
      migalhasDoNegocio({
        grupo: "INSS Vendas",
        origem: { id: "o1", nome: "Leads INSS Whatsapp" },
        negocio: "Ana | Nunes Regularize",
        qs: "st=open",
      }),
    ).toEqual([
      { rotulo: "INSS Vendas", href: null },
      { rotulo: "Leads INSS Whatsapp", href: "/app/pipelines/o1?st=open" },
      { rotulo: "Ana | Nunes Regularize", href: null },
    ]);
  });

  it("origem sem grupo: só origem › negócio", () => {
    expect(migalhasDoNegocio({ grupo: null, origem: { id: "o1", nome: "O" }, negocio: "N" })).toHaveLength(2);
  });
});

describe("próximo negócio (C8)", () => {
  const leads = [negocio("c", "e1", 3), negocio("a", "e1", 1), negocio("b", "e1", 2), negocio("x", "e2", 1)];

  it("sem ordenação escolhida, vale a posição na etapa (pos_id da Clint)", () => {
    expect(vizinhosNaEtapa(leads, "e1", "b")).toMatchObject({ anterior: { id: "a" }, proximo: { id: "c" } });
    expect(vizinhosNaEtapa(leads, "e1", "a").anterior).toBeNull();
    expect(vizinhosNaEtapa(leads, "e1", "c").proximo).toBeNull();
  });

  it("com ordenação escolhida no quadro, ela manda", () => {
    const inversa = (p: Lead, q: Lead) => q.position_in_stage - p.position_in_stage;
    expect(vizinhosNaEtapa(leads, "e1", "b", inversa)).toMatchObject({ anterior: { id: "c" }, proximo: { id: "a" } });
  });

  it("negócio fora da etapa escolhida (ou do recorte): o próximo é o primeiro dela, sem anterior", () => {
    expect(vizinhosNaEtapa(leads, "e1", "x")).toMatchObject({ anterior: null, proximo: { id: "a" } });
    expect(vizinhosNaEtapa(leads, "e9", "x")).toEqual({ anterior: null, proximo: null });
  });

  it("o seletor lista as etapas não arquivadas, na ordem da origem", () => {
    expect(etapasDoProximo([etapa("b", 2), etapa("z", 3, { is_archived: true }), etapa("a", 1)]).map((s) => s.id)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("reabrir (C4, Aberto num negócio fechado)", () => {
  const etapas = [
    etapa("e2", 2),
    etapa("ganho", 9, { is_won: true }),
    etapa("e1", 1),
    etapa("perda", 10, { is_lost: true }),
    etapa("velha", 0, { is_archived: true }),
  ];

  it("ganho volta para a última etapa aberta; perdido, para a primeira (Q3)", () => {
    expect(etapaParaReabrir(etapas, "won")).toBe("e2");
    expect(etapaParaReabrir(etapas, "lost")).toBe("e1");
  });

  it("sem etapa aberta, não há para onde reabrir", () => {
    expect(etapaParaReabrir([etapa("ganho", 1, { is_won: true })], "won")).toBeNull();
  });
});

describe("contador e datas", () => {
  it("o contador só aparece com mais de um negócio (Clint: `Ue>1`)", () => {
    expect(deveMostrarContador(0)).toBe(false);
    expect(deveMostrarContador(1)).toBe(false);
    expect(deveMostrarContador(2)).toBe(true);
  });

  it("o dia como na Clint: 'Qui, 15 Out'", () => {
    expect(cabecalhoDoDia(new Date(2026, 9, 15, 16, 21).toISOString())).toBe("Qui, 15 Out");
  });

  it("'há 3 dias'", () => {
    expect(haQuantoTempo("2026-10-14T12:00:00Z", new Date("2026-10-17T12:00:00Z"))).toBe("há 3 dias");
  });

  it("tarefas por dia, do mais novo para o mais velho; sem prazo por último (print 01)", () => {
    const dias = diasDasTarefas([
      { id: "1", due_date: new Date(2026, 9, 14, 9).toISOString() },
      { id: "2", due_date: null },
      { id: "3", due_date: new Date(2026, 9, 15, 9).toISOString() },
      { id: "4", due_date: new Date(2026, 9, 15, 16).toISOString() },
    ]);
    expect(dias.map((d) => d.tarefas.map((x) => x.id))).toEqual([["4", "3"], ["1"], ["2"]]);
    expect(dias[0]!.rotulo).toBe("Qui, 15 Out");
    expect(dias[2]!.rotulo).toBeNull();
  });

  it("histórico em seções: esta semana, semana passada e depois a data do domingo", () => {
    const agora = new Date(2026, 9, 17, 12); // sábado
    const secoes = secoesDoHistorico(
      [
        { id: "a", performed_at: new Date(2026, 9, 14, 10).toISOString() },
        { id: "b", performed_at: new Date(2026, 9, 8, 10).toISOString() },
        { id: "c", performed_at: new Date(2026, 8, 20, 10).toISOString() },
      ],
      agora,
    );
    expect(secoes.map((s) => [s.rotulo, s.itens.map((i) => i.id)])).toEqual([
      ["Esta semana", ["a"]],
      ["Semana passada", ["b"]],
      ["20/09/2026", ["c"]],
    ]);
    expect(secoes[0]!.data).toBe("14 Out");
  });
});
```

```bash
corepack pnpm vitest run tests/unit/escale-ficha-regras.test.ts
```
Expected: FAIL com `Failed to resolve import "@/lib/escale/negocio/regras"`.

- [ ] **Step 3: As regras**

Create `lib/escale/negocio/regras.ts`:

```ts
/**
 * A FICHA DO NEGÓCIO (fork Escale, Fase 1G): regras puras da tela própria do
 * negócio, igual à Clint (`/deal/:id`). Sem React e sem rede.
 *
 * Próximo negócio (C8): a Clint ordena pela ordem do quadro e desempata pela
 * posição na etapa; sem ordem escolhida, a posição; o anterior é a mesma
 * consulta invertida; os filtros do quadro valem ("O próximo negócio leva em
 * consideração a ordem e os filtros atuais da listagem de negócios.").
 * Código: `raw-v2/js/getStageGroupInfo-BptXw8sG.js.txt`.
 */
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

export const ABAS_DO_NEGOCIO = [
  "atividades",
  "contato",
  "empresa",
  "negocio",
  "conversas",
  "arquivos",
  "historico",
] as const;
export type AbaDoNegocio = (typeof ABAS_DO_NEGOCIO)[number];

/** Os rótulos da Clint (prints 01 a 07 de 17/10). */
export const ROTULO_DA_ABA: Readonly<Record<AbaDoNegocio, string>> = {
  atividades: "Atividades",
  contato: "Contato",
  empresa: "Empresa",
  negocio: "Negócio",
  conversas: "Conversas",
  arquivos: "Arquivos",
  historico: "Histórico",
};

export const PARAM_ABA = "aba";
/** A etapa escolhida no seletor do próximo negócio (ausente = a etapa do negócio). */
export const PARAM_ETAPA_DO_PROXIMO = "pe";
const PARAMS_DA_FICHA = new Set(["lead", PARAM_ABA, PARAM_ETAPA_DO_PROXIMO]);

export function abaDaUrl(valor: string | null | undefined): AbaDoNegocio {
  return ABAS_DO_NEGOCIO.find((a) => a === valor) ?? "atividades";
}

export type ParametrosDaPagina = Record<string, string | string[] | undefined>;

/** Os `searchParams` de uma página do servidor como texto de busca, na ordem em que chegaram. */
export function buscaDosParametros(sp: ParametrosDaPagina): string {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(sp)) {
    if (valor === undefined) continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) busca.append(chave, v);
  }
  return busca.toString();
}

/** Os parâmetros do quadro (filtros, filtro salvo e ordem da 1D), sem os que são da ficha. */
export function buscaDoQuadro(qs: string): string {
  const saida = new URLSearchParams();
  new URLSearchParams(qs).forEach((valor, chave) => {
    if (!PARAMS_DA_FICHA.has(chave)) saida.append(chave, valor);
  });
  return saida.toString();
}

export function rotaDoNegocio(
  id: string,
  qs = "",
  extra: { aba?: AbaDoNegocio | null; etapa?: string | null } = {},
): string {
  const busca = new URLSearchParams(buscaDoQuadro(qs));
  if (extra.aba && extra.aba !== "atividades") busca.set(PARAM_ABA, extra.aba);
  if (extra.etapa) busca.set(PARAM_ETAPA_DO_PROXIMO, extra.etapa);
  const resto = busca.toString();
  return resto ? `/app/negocios/${id}?${resto}` : `/app/negocios/${id}`;
}

export function rotaDoQuadro(origemId: string, qs = ""): string {
  const resto = buscaDoQuadro(qs);
  return resto ? `/app/pipelines/${origemId}?${resto}` : `/app/pipelines/${origemId}`;
}

export interface Migalha {
  rotulo: string;
  href: string | null;
}

/** C1: grupo › origem › negócio. Só a origem é link (volta ao quadro com os mesmos filtros). */
export function migalhasDoNegocio(e: {
  grupo: string | null;
  origem: { id: string; nome: string };
  negocio: string;
  qs?: string;
}): Migalha[] {
  return [
    ...(e.grupo ? [{ rotulo: e.grupo, href: null }] : []),
    { rotulo: e.origem.nome, href: rotaDoQuadro(e.origem.id, e.qs ?? "") },
    { rotulo: e.negocio, href: null },
  ];
}

export interface Vizinhos {
  anterior: Lead | null;
  proximo: Lead | null;
}

const PELA_POSICAO = (a: Lead, b: Lead) => a.position_in_stage - b.position_in_stage;

export function vizinhosNaEtapa(
  leads: readonly Lead[],
  etapaId: string,
  atualId: string,
  ordem?: (a: Lead, b: Lead) => number,
): Vizinhos {
  const lista = leads.filter((l) => l.stage_id === etapaId).sort(ordem ?? PELA_POSICAO);
  const i = lista.findIndex((l) => l.id === atualId);
  if (i === -1) return { anterior: null, proximo: lista[0] ?? null };
  return { anterior: lista[i - 1] ?? null, proximo: lista[i + 1] ?? null };
}

export function etapasDoProximo(stages: readonly Stage[]): Stage[] {
  return stages.filter((s) => !s.is_archived).sort((a, b) => a.position - b.position);
}

export type StatusDoNegocio = Lead["status"];

/** N6 (Q3): para onde vai o negócio fechado que volta a "Aberto". */
export function etapaParaReabrir(stages: readonly Stage[], status: StatusDoNegocio): string | null {
  const abertas = stages
    .filter((s) => !s.is_won && !s.is_lost && !s.is_archived)
    .sort((a, b) => a.position - b.position);
  if (abertas.length === 0) return null;
  return status === "won" ? abertas[abertas.length - 1]!.id : abertas[0]!.id;
}

/** C7: a Clint só mostra "N Negócios" com mais de um (`Ue>1`). */
export function deveMostrarContador(total: number): boolean {
  return total > 1;
}

const maiuscula = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const semPonto = (s: string) => s.replace(".", "");

/** "Qui, 15 Out" (cabeçalho do dia em "Próximas atividades", print 01). */
export function cabecalhoDoDia(iso: string, idioma = "pt-BR"): string {
  const d = new Date(iso);
  const semana = maiuscula(semPonto(d.toLocaleDateString(idioma, { weekday: "short" })));
  return `${semana}, ${diaEMes(d, idioma)}`;
}

/** "15 Out". */
function diaEMes(d: Date, idioma: string): string {
  return `${d.getDate()} ${maiuscula(semPonto(d.toLocaleDateString(idioma, { month: "short" })))}`;
}

/** "16:21". */
export function horaDaTarefa(iso: string, idioma = "pt-BR"): string {
  return new Date(iso).toLocaleTimeString(idioma, { hour: "2-digit", minute: "2-digit" });
}

const chaveDoDia = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const instante = (iso: string | null) => (iso ? Date.parse(iso) : Number.NEGATIVE_INFINITY);

export interface DiaDeTarefas<T> {
  chave: string;
  /** `null` = sem prazo. */
  rotulo: string | null;
  tarefas: T[];
}

export function diasDasTarefas<T extends { due_date: string | null }>(
  tarefas: readonly T[],
  idioma = "pt-BR",
): DiaDeTarefas<T>[] {
  const ordenadas = [...tarefas].sort((a, b) => instante(b.due_date) - instante(a.due_date));
  const dias = new Map<string, DiaDeTarefas<T>>();
  for (const x of ordenadas) {
    const chave = x.due_date ? chaveDoDia(new Date(x.due_date)) : "sem-prazo";
    const dia = dias.get(chave) ?? { chave, rotulo: x.due_date ? cabecalhoDoDia(x.due_date, idioma) : null, tarefas: [] };
    dias.set(chave, { ...dia, tarefas: [...dia.tarefas, x] });
  }
  return [...dias.values()];
}

/** "há 3 dias" (cartões do Histórico, print 07). */
export function haQuantoTempo(iso: string, agora: Date = new Date(), idioma = "pt-BR"): string {
  const seg = Math.round((Date.parse(iso) - agora.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(idioma, { numeric: "always" });
  const abs = Math.abs(seg);
  if (abs < 60) return rtf.format(seg, "second");
  if (abs < 3600) return rtf.format(Math.round(seg / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seg / 3600), "hour");
  if (abs < 86_400 * 30) return rtf.format(Math.round(seg / 86_400), "day");
  if (abs < 86_400 * 365) return rtf.format(Math.round(seg / (86_400 * 30)), "month");
  return rtf.format(Math.round(seg / (86_400 * 365)), "year");
}

/** O domingo da semana (a semana brasileira, como o "Essa semana" da Clint). */
function domingoDe(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
}

const ddmmaaaa = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

export interface SecaoDoHistorico<T> {
  chave: string;
  /** "Esta semana", "Semana passada" ou a data do domingo (dd/mm/aaaa) — print que falta 9. */
  rotulo: string;
  /** O dia do evento mais novo da seção ("14 Out", ao lado de "ESTA SEMANA" no print 07). */
  data: string;
  itens: T[];
}

export function secoesDoHistorico<T extends { performed_at: string }>(
  itens: readonly T[],
  agora: Date = new Date(),
  idioma = "pt-BR",
): SecaoDoHistorico<T>[] {
  const esta = domingoDe(agora).getTime();
  const passada = domingoDe(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 7)).getTime();
  const ordenados = [...itens].sort((a, b) => Date.parse(b.performed_at) - Date.parse(a.performed_at));
  const secoes = new Map<string, SecaoDoHistorico<T>>();
  for (const item of ordenados) {
    const quando = new Date(item.performed_at);
    const domingo = domingoDe(quando);
    const chave = ddmmaaaa(domingo);
    const rotulo =
      domingo.getTime() === esta ? "Esta semana" : domingo.getTime() === passada ? "Semana passada" : chave;
    const secao = secoes.get(chave) ?? { chave, rotulo, data: diaEMes(quando, idioma), itens: [] };
    secoes.set(chave, { ...secao, itens: [...secao.itens, item] });
  }
  return [...secoes.values()];
}
```

- [ ] **Step 4: Verificar (G1)**

```bash
corepack pnpm vitest run tests/unit/escale-ficha-regras.test.ts
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint lib/escale/negocio tests/unit/escale-ficha-regras.test.ts
corepack pnpm exec prettier --check lib/escale/negocio/regras.ts tests/unit/escale-ficha-regras.test.ts
```
Expected: PASS (13 casos), typecheck e eslint sem erro. Se o "Qui, 15 Out" sair "Qui., 15 Out." ou "qui, 15 out", o Node está sem o ICU completo: confira `node -p "Intl.DateTimeFormat().resolvedOptions().locale"` e PARE se não for `pt-BR`-capaz. Controlador confere.

- [ ] **Step 5: Commit**

```bash
git add lib/escale/negocio/regras.ts tests/unit/escale-ficha-regras.test.ts docs/superpowers/plans/2026-10-17-fase-1g-ficha-do-negocio.md
git commit -m "feat(escale): regras da ficha do negócio (abas, caminho, próximo negócio, reabrir)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: As abas Atividades e Histórico (só leitura, com a cara da Clint)

**Files:**
- Create: `components/escale/negocio/FotoDaFicha.tsx`, `components/escale/negocio/abas/AbaAtividades.tsx`, `components/escale/negocio/abas/AbaHistorico.tsx`, `tests/unit/escale-ficha-abas-atividades-historico.test.tsx`

**Interfaces:**
- Consumes: `useTasks({ lead_id })` (`hooks/tasks/useTasks.ts`: `{ tarefas, carregando, falhou }`), `useLeadTimeline(leadId, contactId)` (`hooks/leads/useLeadTimeline.ts`: `{ itens, isLoading, isError }`), `activityLabel` e `actorName` (`lib/leads/activity-vocabulary.ts`), `fotoDoContato` (`lib/escale/quadro/aparencia.ts`).
- Produces: `FotoDaFicha({ lead, tamanho? })`, `AbaAtividades({ lead, stages })`, `AbaHistorico({ lead })`.

**Detalhes visuais (prints 01, 07 e 12):**
- Trilho: só as etapas abertas da origem (as de ganho e perda são do motor, a Clint não as tem), numeradas; a atual cheia na cor da marca, com a foto do contato embaixo; a seta › rola o trilho. O trilho não move o negócio (é da 1I).
- "Próximas atividades" (15px, semibold) com a engrenagem desligada; dia "Qui, 15 Out" (11,5px semibold) + chip "2 atividades" (9px); linha com ícone, título 13px (riscado se concluída), hora 11px e a caixa de concluir (desligada, "Em breve"); a linha escolhida com a barra de 3px da marca à esquerda e o fundo `casca-raia`; à direita, o título e a descrição da atividade; no pé, "+ Nova atividade" e o lápis, desligados. **Desvio:** a coluna "Dias" (à esquerda da lista, na Clint) fica para a 1I (print que falta 10); o "?" do detalhe também.
- Histórico: busca "Buscar no histórico" (148px) e o gatilho "Todos" (218px), desligados ("Em breve", C18 é 1H); seção "ESTA SEMANA" 11px maiúsculo + "14 Out" + linha; cartão com fundo `casca-raia`, ícone em quadro de 32px, título 13px semibold, texto 13px, "🕓 há 3 dias por Nome" 11px. **Desvio:** a Clint põe "ORIGEM: GRUPO > ORIGEM" ao lado do título e ícones por tipo; a linha do tempo do original não guarda a origem por evento, e o ícone fica um só (lista) até a 1H.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-abas-atividades-historico.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR" }));
const tarefas = vi.hoisted(() => ({ lista: [] as unknown[] }));
vi.mock("@/hooks/tasks/useTasks", () => ({
  useTasks: () => ({ tarefas: tarefas.lista, carregando: false, falhou: false }),
}));
const linha = vi.hoisted(() => ({ itens: [] as unknown[] }));
vi.mock("@/hooks/leads/useLeadTimeline", () => ({
  useLeadTimeline: () => ({ itens: linha.itens, isLoading: false, isError: false }),
}));

import { AbaAtividades } from "@/components/escale/negocio/abas/AbaAtividades";
import { AbaHistorico } from "@/components/escale/negocio/abas/AbaHistorico";
import { activityLabel } from "@/lib/leads/activity-vocabulary";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G (C2): Atividades e Histórico mostram o que existe, com a cara da Clint (prints 01 e 07). */
const etapa = (id: string, position: number, name: string, extra: Partial<Stage> = {}): Stage => ({
  id,
  organization_id: "o",
  pipeline_id: "p",
  name,
  slug: id,
  position,
  color: null,
  is_won: false,
  is_lost: false,
  is_archived: false,
  expected_duration_hours: null,
  ...extra,
});
const LEAD = { id: "n1", stage_id: "e1", contact_id: "c1", title: "Ana" } as Lead;
const ETAPAS = [
  etapa("e2", 2, "2. Em atendimento"),
  etapa("g", 9, "Ganho", { is_won: true }),
  etapa("e1", 1, "1. Entrada Lead"),
  etapa("p", 10, "Perdido", { is_lost: true }),
];

beforeEach(() => {
  tarefas.lista = [
    {
      id: "t1",
      title: "Pré-qualificação",
      description: "Apenas oportunidades novas devem ficar nesta etapa.",
      due_date: new Date(2026, 9, 15, 16, 21).toISOString(),
      status: "done",
    },
    { id: "t2", title: "Ligação 1", description: "Roteiro da ligação", due_date: new Date(2026, 9, 14, 16, 21).toISOString(), status: "pending" },
  ];
  linha.itens = [];
});
afterEach(() => vi.useRealTimers());

describe("aba Atividades (C2, print 01)", () => {
  it("o trilho mostra só as etapas abertas, numeradas, e marca a atual", () => {
    render(<AbaAtividades lead={LEAD} stages={ETAPAS} />);
    const trilho = screen.getByRole("list", { name: "Etapas da origem" });
    const passos = within(trilho).getAllByRole("listitem");
    expect(passos.map((p) => p.textContent)).toEqual(["11. Entrada Lead", "22. Em atendimento"]);
    expect(passos[0]).toHaveAttribute("aria-current", "step");
    expect(passos[1]).not.toHaveAttribute("aria-current");
  });

  it("as tarefas do negócio por dia, com o chip de quantidade, e o detalhe da escolhida", async () => {
    render(<AbaAtividades lead={LEAD} stages={ETAPAS} />);
    expect(screen.getByRole("heading", { name: "Próximas atividades" })).toBeInTheDocument();
    expect(screen.getByText("Qui, 15 Out")).toBeInTheDocument();
    expect(screen.getByText("Qua, 14 Out")).toBeInTheDocument();
    expect(screen.getAllByText("1 atividade")).toHaveLength(2);
    expect(screen.getAllByText("16:21")).toHaveLength(2);
    expect(screen.getByText("Apenas oportunidades novas devem ficar nesta etapa.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Ligação 1/ }));
    expect(screen.getByText("Roteiro da ligação")).toBeInTheDocument();
  });

  it("concluir e criar ficam para a 1I: desligados, com 'Em breve'", () => {
    render(<AbaAtividades lead={LEAD} stages={ETAPAS} />);
    const caixas = screen.getAllByRole("checkbox", { name: "Concluída" });
    expect(caixas[0]).toHaveAttribute("aria-checked", "true");
    expect(caixas[0]).toHaveAttribute("aria-disabled", "true");
    expect(caixas[0]).toHaveAttribute("title", "Em breve");
    expect(screen.getByRole("button", { name: "Nova atividade" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nova atividade" })).toHaveAttribute("title", "Em breve");
  });

  it("negócio sem tarefa: o aviso, e o trilho continua", () => {
    tarefas.lista = [];
    render(<AbaAtividades lead={LEAD} stages={ETAPAS} />);
    expect(screen.getByText("Nenhuma atividade neste negócio.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Etapas da origem" })).toBeInTheDocument();
  });
});

describe("aba Histórico (C2, print 07)", () => {
  it("a linha do tempo do original em cartões, por semana, com 'há N dias por Nome'", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 17, 12));
    linha.itens = [
      {
        id: "h1",
        type: "stage_changed",
        reason: "Mudou para 2. Em atendimento",
        performed_at: new Date(2026, 9, 14, 10).toISOString(),
        actor_kind: "user",
        actor_user_name: "Camilly Victória",
      },
    ];
    render(<AbaHistorico lead={LEAD} />);
    expect(screen.getByText("Esta semana")).toBeInTheDocument();
    expect(screen.getByText("14 Out")).toBeInTheDocument();
    expect(screen.getByText(activityLabel("stage_changed"))).toBeInTheDocument();
    expect(screen.getByText("Mudou para 2. Em atendimento")).toBeInTheDocument();
    expect(screen.getByText("há 3 dias por Camilly Victória")).toBeInTheDocument();
  });

  it("busca e filtro de tipo são da 1H: desligados, com 'Em breve'", () => {
    render(<AbaHistorico lead={LEAD} />);
    expect(screen.getByPlaceholderText("Buscar no histórico")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Todos" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("title", "Em breve");
    expect(screen.getByText("Nenhum evento ainda.")).toBeInTheDocument();
  });
});
```

```bash
corepack pnpm vitest run tests/unit/escale-ficha-abas-atividades-historico.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/components/escale/negocio/abas/AbaAtividades"`.

- [ ] **Step 2: Os ícones novos da fase**

Em `lib/ui/icons-da-casca.ts`, no fim do arquivo, acrescente:

```ts
// Fase 1G (ficha do negócio): nota, mudar origem, campos de negócio, modo espião e o vazio de Conversas.
export { StickyNote, ArrowRightLeft, Target, Glasses, MessagesSquare } from "lucide-react";
```

- [ ] **Step 3: A foto**

Create `components/escale/negocio/FotoDaFicha.tsx`:

```tsx
"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fotoDoContato } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";
import { User } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A FOTO DO CONTATO NA FICHA (fork Escale, Fase 1G): redonda, como na Clint.
 * 32px no cabeçalho, 20px embaixo da etapa atual do trilho e 40px na lista de
 * conversas (prints 01 e 05). Sem foto, a silhueta cinza do card da casca.
 */
const TAMANHO = { cabecalho: "size-8", trilho: "size-5", conversa: "size-10" } as const;

export function FotoDaFicha({ lead, tamanho = "cabecalho" }: { lead: Lead; tamanho?: keyof typeof TAMANHO }) {
  const url = fotoDoContato(lead);
  const silhueta = (
    <span
      aria-hidden
      className={cn("grid place-items-center rounded-full bg-casca-cinza-selo text-white", TAMANHO[tamanho])}
    >
      <User size={tamanho === "trilho" ? 12 : 16} />
    </span>
  );
  if (!url) return silhueta;
  return (
    <Avatar className={cn("shrink-0 rounded-full", TAMANHO[tamanho])}>
      <AvatarImage src={url} alt="" className="object-cover" />
      <AvatarFallback className="rounded-full bg-transparent">{silhueta}</AvatarFallback>
    </Avatar>
  );
}
```

- [ ] **Step 4: A aba Atividades**

Create `components/escale/negocio/abas/AbaAtividades.tsx`:

```tsx
"use client";
import { useMemo, useRef, useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { useTasks } from "@/hooks/tasks/useTasks";
import { diasDasTarefas, horaDaTarefa } from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Tarefa } from "@/lib/tarefas/tipos";
import type { Lead } from "@/lib/types/leads";
import { Check, ChevronRight, ClipboardList, Pencil, Plus, Settings } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FotoDaFicha } from "../FotoDaFicha";

/**
 * A ABA ATIVIDADES DA FICHA (fork Escale, Fase 1G, C2; print 01).
 *
 * Mostra o que existe hoje: o trilho das etapas abertas da origem e as tarefas
 * do negócio (`crm_tasks`), só leitura. Concluir, criar, a coluna "Dias" e as
 * atividades do playbook são da 1I (C19–C21): no lugar certo, com "Em breve".
 */
const EM_BREVE = "disabled:pointer-events-auto disabled:cursor-not-allowed";

export function AbaAtividades({ lead, stages }: { lead: Lead; stages: Stage[] }) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const { tarefas, carregando, falhou } = useTasks({ lead_id: lead.id });
  const dias = useMemo(() => diasDasTarefas(tarefas, idioma), [tarefas, idioma]);
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null);
  const escolhida = tarefas.find((x) => x.id === escolhidaId) ?? dias[0]?.tarefas[0] ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TrilhoDeEtapas lead={lead} stages={stages} />
      <div className="flex min-h-0 flex-1">
        <section aria-label={t("Próximas atividades")} className="flex w-[450px] shrink-0 flex-col border-r border-casca-borda">
          <header className="flex h-10 shrink-0 items-center justify-between border-b border-casca-borda px-4">
            <h2 className="text-[15px] font-semibold text-casca-texto">{t("Próximas atividades")}</h2>
            <BotaoDaCasca variante="icone" disabled title={t("Em breve")} aria-label={t("Configurar atividades")} className={EM_BREVE}>
              <Settings aria-hidden />
            </BotaoDaCasca>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {carregando ? (
              <p className="px-4 py-6 text-xs text-casca-suave">{t("Carregando…")}</p>
            ) : falhou ? (
              <p className="px-4 py-6 text-xs text-casca-suave">{t("Não consegui carregar as atividades.")}</p>
            ) : dias.length === 0 ? (
              <p className="px-4 py-6 text-xs text-casca-suave">{t("Nenhuma atividade neste negócio.")}</p>
            ) : (
              dias.map((dia) => (
                <div key={dia.chave}>
                  <div className="flex items-center gap-2.5 px-4 pb-1 pt-2">
                    <span className="text-[11.5px] font-semibold text-casca-texto">{dia.rotulo ?? t("Sem prazo")}</span>
                    <span className="rounded-[5px] bg-casca-contador px-[7px] py-0.5 text-[9px] font-semibold text-casca-suave">
                      {dia.tarefas.length === 1 ? t("1 atividade") : `${dia.tarefas.length} ${t("atividades")}`}
                    </span>
                  </div>
                  <ul>
                    {dia.tarefas.map((x) => (
                      <LinhaDaAtividade
                        key={x.id}
                        tarefa={x}
                        ativa={x.id === escolhida?.id}
                        aoEscolher={() => setEscolhidaId(x.id)}
                        idioma={idioma}
                      />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
          <footer className="flex h-12 shrink-0 items-center border-t border-casca-borda px-4">
            <BotaoDaCasca variante="texto" tamanho="sm" disabled title={t("Em breve")} className={EM_BREVE}>
              <Plus aria-hidden />
              {t("Nova atividade")}
            </BotaoDaCasca>
          </footer>
        </section>
        <section aria-label={t("Detalhes da atividade")} className="flex min-w-0 flex-1 flex-col">
          {escolhida ? (
            <>
              <header className="flex h-10 shrink-0 items-center border-b border-casca-borda px-4">
                <h3 className="flex items-center gap-2 text-[13px] text-casca-texto">
                  <ClipboardList size={16} aria-hidden className="text-casca-marca" />
                  {escolhida.title}
                </h3>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-line px-6 py-4 text-[13px] text-casca-texto-2">
                {escolhida.description ?? ""}
              </div>
              <footer className="flex h-12 shrink-0 items-center border-t border-casca-borda px-4">
                <BotaoDaCasca variante="icone" disabled title={t("Em breve")} aria-label={t("Editar atividade")} className={EM_BREVE}>
                  <Pencil aria-hidden />
                </BotaoDaCasca>
              </footer>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function TrilhoDeEtapas({ lead, stages }: { lead: Lead; stages: Stage[] }) {
  const t = useT();
  const trilho = useRef<HTMLOListElement>(null);
  const etapas = stages
    .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
    .sort((a, b) => a.position - b.position);
  return (
    <div className="relative flex h-[98px] shrink-0 border-b border-casca-borda">
      <ol
        ref={trilho}
        aria-label={t("Etapas da origem")}
        className="flex min-w-0 flex-1 overflow-x-auto px-6 pt-3 [scrollbar-width:none]"
      >
        {etapas.map((s, i) => {
          const atual = s.id === lead.stage_id;
          return (
            <li
              key={s.id}
              aria-current={atual ? "step" : undefined}
              className="relative flex w-[154px] shrink-0 flex-col items-center gap-2"
            >
              {i > 0 && <span aria-hidden className="absolute right-1/2 top-3 h-px w-full bg-casca-marca-media" />}
              <span
                className={cn(
                  "relative z-[1] grid size-6 place-items-center rounded-full border text-[11px] font-semibold",
                  atual ? "border-casca-marca bg-casca-marca text-white" : "border-casca-marca-media bg-surface text-casca-marca",
                )}
              >
                {i + 1}
              </span>
              <span className={cn("max-w-full truncate px-1 text-xs", atual ? "font-semibold text-casca-marca" : "text-casca-texto-2")}>
                {s.name}
              </span>
              {atual && <FotoDaFicha lead={lead} tamanho="trilho" />}
            </li>
          );
        })}
      </ol>
      <BotaoDaCasca
        variante="icone"
        aria-label={t("Mais etapas")}
        title={t("Mais etapas")}
        onClick={() => trilho.current?.scrollBy({ left: 400, behavior: "smooth" })}
        className="absolute right-4 top-3 border border-casca-borda bg-surface shadow-casca-painel"
      >
        <ChevronRight aria-hidden />
      </BotaoDaCasca>
    </div>
  );
}

function LinhaDaAtividade({
  tarefa,
  ativa,
  aoEscolher,
  idioma,
}: {
  tarefa: Tarefa;
  ativa: boolean;
  aoEscolher: () => void;
  idioma: string;
}) {
  const t = useT();
  const feita = tarefa.status === "done";
  return (
    <li className={cn("flex items-center gap-3 border-l-[3px] pr-4", ativa ? "border-casca-marca bg-casca-raia" : "border-transparent hover:bg-casca-raia")}>
      <button type="button" onClick={aoEscolher} aria-pressed={ativa} className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left">
        <ClipboardList size={16} aria-hidden className="shrink-0 text-casca-marca" />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[13px] text-casca-texto", feita && "text-casca-meta line-through")}>
            {tarefa.title}
          </span>
          {tarefa.due_date ? (
            <span className="block text-[11px] text-casca-suave">{horaDaTarefa(tarefa.due_date, idioma)}</span>
          ) : null}
        </span>
      </button>
      <span
        role="checkbox"
        aria-checked={feita}
        aria-disabled="true"
        aria-label={t("Concluída")}
        title={t("Em breve")}
        className={cn(
          "grid size-[18px] shrink-0 cursor-not-allowed place-items-center rounded-[4px] border",
          feita ? "border-casca-marca bg-casca-marca text-white" : "border-casca-borda bg-surface",
        )}
      >
        {feita ? <Check size={12} aria-hidden /> : null}
      </span>
    </li>
  );
}
```

> Se o tipo `SituacaoDaTarefa` (`lib/tarefas/tipos.ts`) não tiver `"done"`, use o valor de "concluída" que ele tem e ajuste o fixture do teste.

- [ ] **Step 5: A aba Histórico**

Create `components/escale/negocio/abas/AbaHistorico.tsx`:

```tsx
"use client";
import { useMemo } from "react";

import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useLeadTimeline } from "@/hooks/leads/useLeadTimeline";
import { useT } from "@/hooks/i18n/useT";
import { haQuantoTempo, secoesDoHistorico } from "@/lib/escale/negocio/regras";
import { activityLabel, actorName } from "@/lib/leads/activity-vocabulary";
import type { TimelineItemView } from "@/lib/types/contacts";
import type { Lead } from "@/lib/types/leads";
import { ChevronDown, Clock, ListChecks, Search } from "@/lib/ui/icons-da-casca";

/**
 * A ABA HISTÓRICO DA FICHA (fork Escale, Fase 1G, C2; prints 07 e 12).
 *
 * A linha do tempo do original (cerca de 60 tipos, autor e tempo real), em
 * cartões da Clint, por semana. Busca e filtro de tipo são da 1H (C18).
 */
export function AbaHistorico({ lead }: { lead: Lead }) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const linha = useLeadTimeline(lead.id, lead.contact_id);
  const secoes = useMemo(() => secoesDoHistorico(linha.itens, new Date(), idioma), [linha.itens, idioma]);

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3">
        <span className="relative">
          <input
            disabled
            title={t("Em breve")}
            placeholder={t("Buscar no histórico")}
            className="h-8 w-[148px] rounded-md bg-casca-busca pl-2.5 pr-7 text-[13px] text-casca-texto placeholder:text-casca-meta disabled:cursor-not-allowed"
          />
          <Search size={14} aria-hidden className="absolute right-2.5 top-1/2 -translate-y-1/2 text-casca-suave" />
        </span>
        <button
          type="button"
          disabled
          title={t("Em breve")}
          className="flex h-8 w-[218px] items-center justify-between rounded-md border border-casca-borda px-2.5 text-[13px] text-casca-texto disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          {t("Todos")}
          <ChevronDown size={14} aria-hidden />
        </button>
      </div>
      {linha.isLoading ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Carregando…")}</p>
      ) : linha.isError ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Não consegui carregar o histórico.")}</p>
      ) : secoes.length === 0 ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Nenhum evento ainda.")}</p>
      ) : (
        secoes.map((s) => (
          <section key={s.chave} className="mt-6">
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase text-casca-texto">
              <span>{t(s.rotulo)}</span>
              <span className="font-normal normal-case text-casca-meta">{s.data}</span>
              <span aria-hidden className="h-px flex-1 bg-casca-borda" />
            </h3>
            <ol className="mt-3 flex flex-col gap-2">
              {s.itens.map((item) => (
                <CartaoDoHistorico key={item.id} item={item} idioma={idioma} />
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}

function CartaoDoHistorico({ item, idioma }: { item: TimelineItemView; idioma: string }) {
  const t = useT();
  const quem = actorName(
    item.actor_kind ?? null,
    { agente: item.actor_agent_name ?? null, usuario: item.actor_user_name ?? null },
    t,
  );
  return (
    <li className="flex gap-3 rounded-lg bg-casca-raia p-3">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-md text-casca-suave">
        <ListChecks size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-casca-texto">{t(activityLabel(item.type))}</p>
        {item.reason ? <p className="mt-0.5 text-[13px] text-casca-texto-2">{t(item.reason)}</p> : null}
        <p className="mt-1 flex items-center gap-1 text-[11px] text-casca-suave">
          <Clock size={12} aria-hidden />
          {haQuantoTempo(item.performed_at, new Date(), idioma)} {t("por")} {quem}
        </p>
      </div>
    </li>
  );
}
```

> `item.actor_kind`: é o campo que o `LeadTimeline` do original já lê (`components/kanban/LeadTimeline.tsx`, `Linha`). Se o typecheck reclamar, copie a leitura de lá.

- [ ] **Step 6: Verificar (G1) e commit**

```bash
corepack pnpm vitest run tests/unit/escale-ficha-abas-atividades-historico.test.tsx
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/negocio lib/ui/icons-da-casca.ts tests/unit/escale-ficha-abas-atividades-historico.test.tsx
```
Mais os guardas que leem `icons-da-casca` (comando da G1): espere `controle-decorativo`, `tailwind-tokens`, `vocabulario-do-funil`. Expected: PASS. Controlador confere e compara com os prints 01 e 07.

```bash
git add components/escale/negocio lib/ui/icons-da-casca.ts tests/unit/escale-ficha-abas-atividades-historico.test.tsx
git commit -m "feat(escale): abas Atividades e Histórico da ficha do negócio, como na Clint

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: As abas Contato, Empresa, Negócio, Conversas e Arquivos

**Files:**
- Create: `components/escale/negocio/abas/CamposDaFicha.tsx`, `components/escale/negocio/abas/AbasDeCampos.tsx`, `components/escale/negocio/abas/AbaConversas.tsx`, `components/escale/negocio/abas/AbaArquivos.tsx`, `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`

**Interfaces:**
- Consumes: `camposDoFunil` (`lib/leads/campos-do-funil.ts`, que desde a 1F-a devolve os campos do CRM), `formatValorDoNegocio`/`MOEDA_PADRAO` (`lib/money.ts`), `dadosDeFiltro` (`lib/escale/filtros/dados-do-quadro.ts`), `dataDaMensagem` (`lib/escale/quadro/aparencia.ts`), `CustomFieldDef` (`components/contacts/CustomFieldsEditor.tsx`).
- Produces: `CamposDaFicha({ icone, titulo, campos })`, `CampoDaFicha`, `AbaContato({ lead })`, `AbaEmpresa()`, `AbaNegocio({ lead, pipeline })`, `AbaConversas({ lead })`, `AbaArquivos()`.

**Detalhes visuais (prints 02 a 06):** ver a tabela "Medidas". Valor vazio: "Clique aqui para adicionar" em cinza dentro da caixa de 32px (o texto é o da Clint; editar é 1H, então a caixa tem a dica "Em breve"). Campo de lista (seleção): ▾ à direita da caixa. Conversas: a Clint mostra o chip "Em aberto" do atendimento; a conversa do negócio no original não traz esse status, então o chip não entra (desvio). Arquivos: sem o medidor "0.00 GB / 5.00 GB" (PRD §9) e sem as setas de ordenar da tabela (1H).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { AbaArquivos } from "@/components/escale/negocio/abas/AbaArquivos";
import { AbaConversas } from "@/components/escale/negocio/abas/AbaConversas";
import { AbaContato, AbaEmpresa, AbaNegocio } from "@/components/escale/negocio/abas/AbasDeCampos";
import type { Pipeline } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G (C2): as abas de campos, Conversas e Arquivos com a cara da Clint (prints 02 a 06). */
const LEAD = {
  id: "n1",
  contact_id: "c1",
  title: "Ana",
  value_cents: 150000,
  currency: "BRL",
  custom_fields: { origem_organico: "google" },
  contact_phone: "+55 43 99803 1566",
  conversa: { id: "cv1", preview: "Olá, me chamo Camilly", last_message_at: null, unread: 0 },
} as unknown as Lead;
const PIPELINE = {
  id: "o1",
  settings: {
    fields: [
      { key: "origem_organico", label: "origem_organico", type: "select", options: [{ value: "google", label: "Google" }] },
      { key: "notas", label: "Notas", type: "text" },
    ],
  },
} as unknown as Pipeline;

const linhaDe = (rotulo: string) => screen.getByText(rotulo, { selector: "dt" }).parentElement as HTMLElement;

describe("aba Negócio (print 04)", () => {
  it("Valor e os campos do CRM num grupo só, 'Informações Gerais', só leitura", () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    expect(screen.getByRole("heading", { name: "Campos de negócio" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Grupos de campos" })).getByText("Informações Gerais")).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(within(linhaDe("Valor")).getByText(/R\$\s1\.500/)).toBeInTheDocument();
    expect(within(linhaDe("origem_organico")).getByText("Google")).toBeInTheDocument();
    expect(within(linhaDe("Notas")).getByText("Clique aqui para adicionar")).toBeInTheDocument();
  });

  it("Ocultar vazios, Gerenciar campos e a busca são da 1H: desligados, com 'Em breve'", () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    for (const nome of ["Ocultar vazios", "Gerenciar campos"]) {
      expect(screen.getByRole("button", { name: nome })).toBeDisabled();
      expect(screen.getByRole("button", { name: nome })).toHaveAttribute("title", "Em breve");
    }
    expect(screen.getByPlaceholderText("Pesquisar campos...")).toBeDisabled();
  });
});

describe("abas Contato e Empresa (prints 02 e 03)", () => {
  it("Contato: nome, telefone e e-mail do contato do negócio", () => {
    render(<AbaContato lead={LEAD} />);
    expect(screen.getByRole("heading", { name: "Campos de contato" })).toBeInTheDocument();
    expect(within(linhaDe("Telefone")).getByText("+55 43 99803 1566")).toBeInTheDocument();
    expect(within(linhaDe("Email")).getByText("Clique aqui para adicionar")).toBeInTheDocument();
  });

  it("Empresa: os oito campos da Clint, vazios até a 1H vincular a empresa (Q6)", () => {
    render(<AbaEmpresa />);
    expect(screen.getByRole("heading", { name: "Campos de empresa" })).toBeInTheDocument();
    expect(screen.getAllByRole("term").map((d) => d.textContent)).toEqual([
      "Nome da empresa",
      "Site",
      "Cidade",
      "Estado",
      "Categoria",
      "Segmento",
      "Número de funcionários",
      "CNPJ",
    ]);
  });
});

describe("aba Conversas (print 05)", () => {
  it("a conversa do negócio na lista, que abre no Inbox, e o vazio da direita", () => {
    render(<AbaConversas lead={LEAD} />);
    expect(screen.getByText("Abra as conversas sem marcá-las como lidas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ativar modo espião" })).toHaveAttribute("title", "Em breve");
    expect(screen.getByText("1 sessões")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Olá, me chamo Camilly/ })).toHaveAttribute("href", "/app/inbox?id=cv1");
    expect(screen.getByText("Selecione uma conversa")).toBeInTheDocument();
    expect(screen.getByText("Escolha uma conversa ao lado para ver as mensagens.")).toBeInTheDocument();
  });

  it("contato sem conversa: o texto da Clint", () => {
    render(<AbaConversas lead={{ ...LEAD, conversa: null } as Lead} />);
    expect(screen.getByText("Este contato não possui conversas no atendimento")).toBeInTheDocument();
  });
});

describe("aba Arquivos (print 06)", () => {
  it("a barra, a tabela e o vazio da Clint; enviar é da 1H", () => {
    render(<AbaArquivos />);
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Arquivo", "Data de upload", "Usuário"]);
    expect(screen.getByText("Nenhum arquivo encontrado")).toBeInTheDocument();
    expect(screen.getByText("Envie arquivos para mantê-los junto deste contato.")).toBeInTheDocument();
    for (const b of screen.getAllByRole("button", { name: "Novo arquivo" })) {
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", "Em breve");
    }
    expect(screen.getByRole("button", { name: "Data" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tipo de arquivo" })).toBeDisabled();
  });
});
```

Rode e veja falhar (`Failed to resolve import`).

- [ ] **Step 2: A moldura de campos**

Create `components/escale/negocio/abas/CamposDaFicha.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ChevronDown, Search, Settings } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A MOLDURA "CAMPOS DE …" DA CLINT (fork Escale, Fase 1G, C2; prints 02 a 04).
 *
 * Um grupo só ("Informações Gerais"). Os grupos de campos, "Ocultar vazios",
 * "Pesquisar campos" e "Gerenciar campos" são da 1H (C10, C14) e da Fase 2
 * (C11, C13): aparecem no lugar, desligados com "Em breve". Só leitura.
 */
export interface CampoDaFicha {
  chave: string;
  rotulo: string;
  valor: string | null;
  /** Campo de lista: a Clint desenha o ▾ dentro da caixa. */
  lista?: boolean;
}

const EM_BREVE = "disabled:pointer-events-auto disabled:cursor-not-allowed";

export function CamposDaFicha({ icone, titulo, campos }: { icone: ReactNode; titulo: string; campos: CampoDaFicha[] }) {
  const t = useT();
  return (
    <div className="px-4 py-6">
      <div className="flex h-[46px] items-center justify-between rounded-lg bg-casca-raia px-5">
        <h2 className="flex items-center gap-2 text-[15px] text-casca-texto">
          <span aria-hidden className="text-casca-marca">
            {icone}
          </span>
          {titulo}
        </h2>
        <div className="flex items-center gap-2">
          <BotaoDaCasca variante="texto" tamanho="sm" disabled title={t("Em breve")} className={cn("bg-surface", EM_BREVE)}>
            {t("Ocultar vazios")}
          </BotaoDaCasca>
          <BotaoDaCasca variante="texto" tamanho="sm" disabled title={t("Em breve")} className={cn("bg-surface", EM_BREVE)}>
            <Settings aria-hidden />
            {t("Gerenciar campos")}
          </BotaoDaCasca>
        </div>
      </div>
      <div className="mt-4 flex rounded-lg border border-casca-borda">
        <nav aria-label={t("Grupos de campos")} className="w-[238px] shrink-0 border-r border-casca-borda p-2">
          <span
            aria-current="true"
            className="flex h-9 items-center rounded-md border-l-2 border-casca-marca bg-casca-raia px-3 text-[13px] font-semibold text-casca-texto"
          >
            {t("Informações Gerais")}
          </span>
        </nav>
        <div className="min-w-0 flex-1">
          <div className="border-b border-casca-borda p-4">
            <span className="relative inline-block">
              <input
                disabled
                title={t("Em breve")}
                placeholder={t("Pesquisar campos...")}
                className="h-8 w-[166px] rounded-md bg-casca-busca pl-2.5 pr-7 text-[13px] placeholder:text-casca-meta disabled:cursor-not-allowed"
              />
              <Search size={14} aria-hidden className="absolute right-2.5 top-1/2 -translate-y-1/2 text-casca-suave" />
            </span>
          </div>
          <dl className="px-9 py-4">
            {campos.map((c) => (
              <div key={c.chave} className="grid grid-cols-[275px_1fr] items-center border-b border-casca-borda py-2 last:border-b-0">
                <dt className="text-[13px] font-medium text-casca-texto">{c.rotulo}</dt>
                <dd
                  title={c.valor ? undefined : t("Em breve")}
                  className={cn(
                    "flex h-8 items-center justify-between rounded-md bg-casca-busca px-3 text-[13px]",
                    c.valor ? "text-casca-texto" : "text-casca-meta",
                  )}
                >
                  <span className="truncate">{c.valor ?? t("Clique aqui para adicionar")}</span>
                  {c.lista ? <ChevronDown size={14} aria-hidden className="shrink-0 text-casca-suave" /> : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Contato, Empresa e Negócio**

Create `components/escale/negocio/abas/AbasDeCampos.tsx`:

```tsx
"use client";
import type { CustomFieldDef } from "@/components/contacts/CustomFieldsEditor";
import { useT } from "@/hooks/i18n/useT";
import { dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import type { Pipeline } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { formatValorDoNegocio, MOEDA_PADRAO } from "@/lib/money";
import type { Lead } from "@/lib/types/leads";
import { Building2, Target, User } from "@/lib/ui/icons-da-casca";

import { CamposDaFicha, type CampoDaFicha } from "./CamposDaFicha";

/** FORK ESCALE · Fase 1G (C2): as abas de campos com o que existe hoje (prints 02 a 04). */

export function AbaContato({ lead }: { lead: Lead }) {
  const t = useT();
  const campos: CampoDaFicha[] = [
    { chave: "nome", rotulo: t("Nome"), valor: dadosDeFiltro(lead)?.contato_nome?.trim() || null },
    { chave: "telefone", rotulo: t("Telefone"), valor: lead.contact_phone?.trim() || null },
    { chave: "email", rotulo: t("Email"), valor: lead.contact_email?.trim() || null },
    ...(lead.contact_links ?? []).map((l, i) => ({ chave: `link-${i}`, rotulo: l.tipo, valor: l.href })),
  ];
  return <CamposDaFicha icone={<User size={16} />} titulo={t("Campos de contato")} campos={campos} />;
}

/** Os oito campos da empresa na Clint (print 03). A empresa do negócio é da 1H (C12, Q6). */
const CAMPOS_DA_EMPRESA = [
  "Nome da empresa",
  "Site",
  "Cidade",
  "Estado",
  "Categoria",
  "Segmento",
  "Número de funcionários",
  "CNPJ",
] as const;

export function AbaEmpresa() {
  const t = useT();
  const campos = CAMPOS_DA_EMPRESA.map((rotulo) => ({ chave: rotulo, rotulo: t(rotulo), valor: null }));
  return <CamposDaFicha icone={<Building2 size={16} />} titulo={t("Campos de empresa")} campos={campos} />;
}

export function AbaNegocio({ lead, pipeline }: { lead: Lead; pipeline: Pipeline }) {
  const t = useT();
  const valor =
    lead.value_cents == null
      ? null
      : formatValorDoNegocio(lead.value_cents, lead.currency ?? MOEDA_PADRAO, { semCentavos: true });
  const campos: CampoDaFicha[] = [
    { chave: "valor", rotulo: t("Valor"), valor },
    ...camposDoFunil(pipeline.settings ?? null).map((def) => ({
      chave: def.key,
      rotulo: def.label,
      valor: paraLeitura(def, lead.custom_fields?.[def.key], t),
      lista: def.type === "select" || def.type === "multiselect",
    })),
  ];
  return <CamposDaFicha icone={<Target size={16} />} titulo={t("Campos de negócio")} campos={campos} />;
}

/** O valor gravado como texto de leitura, no formato brasileiro (datas dd/mm/aaaa). */
function paraLeitura(def: CustomFieldDef, bruto: unknown, t: (s: string) => string): string | null {
  if (bruto === null || bruto === undefined || bruto === "") return null;
  if (def.type === "boolean") return bruto ? t("Sim") : t("Não");
  const rotuloDa = (v: unknown) => def.options?.find((o) => o.value === v)?.label ?? String(v);
  if (def.type === "select") return rotuloDa(bruto);
  if (def.type === "multiselect" && Array.isArray(bruto)) return bruto.map(rotuloDa).join(", ") || null;
  if (def.type === "date" && typeof bruto === "string") {
    const [a, m, d] = bruto.slice(0, 10).split("-");
    return a && m && d ? `${d}/${m}/${a}` : bruto;
  }
  return String(bruto);
}
```

> `dadosDeFiltro(lead)?.contato_nome`: confira o nome do campo em `DadosDeFiltroDoNegocio` (`lib/escale/filtros/dados-do-quadro.ts`); é o mesmo que `tituloDoCard` lê.

- [ ] **Step 4: Conversas e Arquivos**

Create `components/escale/negocio/abas/AbaConversas.tsx`:

```tsx
"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { dataDaMensagem } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";
import { CheckCheck, Glasses, MessagesSquare } from "@/lib/ui/icons-da-casca";

import { FotoDaFicha } from "../FotoDaFicha";

/**
 * A ABA CONVERSAS DA FICHA (fork Escale, Fase 1G, C2; print 05).
 *
 * Hoje o negócio traz só a conversa mais recente do contato; ela abre no Inbox
 * (o comportamento de sempre). Todas as conversas, os filtros e o modo espião
 * são da 1H (C16); abrir a conversa aqui dentro é da Fase 3 (C22).
 */
export function AbaConversas({ lead }: { lead: Lead }) {
  const t = useT();
  const conversa = lead.conversa ?? null;
  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-6">
      <div className="flex h-10 shrink-0 items-center justify-between rounded-t-lg bg-casca-raia px-4 text-[13px] text-casca-texto-2">
        <span className="flex items-center gap-2">
          <Glasses size={16} aria-hidden />
          {t("Abra as conversas sem marcá-las como lidas.")}
        </span>
        <button
          type="button"
          disabled
          title={t("Em breve")}
          className="text-[13px] text-casca-marca underline disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          {t("Ativar modo espião")}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 rounded-b-lg border border-t-0 border-casca-borda">
        <div className="w-[337px] shrink-0 overflow-y-auto border-r border-casca-borda">
          {conversa ? (
            <>
              <p className="px-3 py-3 text-xs font-medium text-casca-texto">{`1 ${t("sessões")}`}</p>
              <Link
                href={`/app/inbox?id=${conversa.id}`}
                className="flex items-center gap-3 border-b border-casca-borda px-3 py-3 hover:bg-casca-raia"
              >
                <FotoDaFicha lead={lead} tamanho="conversa" />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-end text-[11px] text-casca-meta">{dataDaMensagem(conversa.last_message_at)}</span>
                  <span className="flex items-center gap-1 text-xs text-casca-texto-2">
                    <CheckCheck size={14} aria-hidden className="shrink-0" />
                    <span className="truncate">{conversa.preview ?? t("Sem mensagem")}</span>
                  </span>
                </span>
                {conversa.unread > 0 ? (
                  <span className="rounded-sm bg-casca-novo px-1.5 text-[11px] font-semibold text-white">{conversa.unread}</span>
                ) : null}
              </Link>
            </>
          ) : (
            <p className="px-3 py-6 text-xs text-casca-suave">{t("Este contato não possui conversas no atendimento")}</p>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 text-center">
          <span className="grid size-20 place-items-center rounded-2xl bg-casca-marca-suave text-casca-marca">
            <MessagesSquare size={32} aria-hidden />
          </span>
          <p className="mt-2 text-[17px] font-semibold text-casca-texto">{t("Selecione uma conversa")}</p>
          <p className="max-w-[210px] text-[15px] text-casca-suave">{t("Escolha uma conversa ao lado para ver as mensagens.")}</p>
        </div>
      </div>
    </div>
  );
}
```

Create `components/escale/negocio/abas/AbaArquivos.tsx`:

```tsx
"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ChevronDown, CloudUpload, FileText, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * A ABA ARQUIVOS DA FICHA (fork Escale, Fase 1G, C2; print 06). O negócio ainda
 * não guarda arquivo: a aba é a moldura e o vazio da Clint. Enviar, buscar e
 * filtrar são da 1H (C17); o medidor de 5 GB fica fora (PRD §9).
 */
const EM_BREVE = "disabled:pointer-events-auto disabled:cursor-not-allowed";

export function AbaArquivos() {
  const t = useT();
  const gatilho = cn("flex h-8 items-center gap-1 px-2 text-[13px] text-casca-texto", EM_BREVE);
  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative">
            <input
              disabled
              title={t("Em breve")}
              placeholder={t("Pesquisar...")}
              className="h-8 w-[148px] rounded-md bg-casca-busca pl-2.5 pr-7 text-[13px] placeholder:text-casca-meta disabled:cursor-not-allowed"
            />
            <Search size={14} aria-hidden className="absolute right-2.5 top-1/2 -translate-y-1/2 text-casca-suave" />
          </span>
          <button type="button" disabled title={t("Em breve")} className={gatilho}>
            {t("Data")}
            <ChevronDown size={14} aria-hidden />
          </button>
          <button type="button" disabled title={t("Em breve")} className={gatilho}>
            {t("Tipo de arquivo")}
            <ChevronDown size={14} aria-hidden />
          </button>
        </div>
        <BotaoDaCasca variante="texto" tamanho="sm" disabled title={t("Em breve")} className={cn("border border-casca-borda", EM_BREVE)}>
          <CloudUpload aria-hidden />
          {t("Novo arquivo")}
        </BotaoDaCasca>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-lg border border-casca-borda">
        <table className="w-full table-fixed">
          <thead>
            <tr className="h-11 border-b border-casca-borda text-[10px] font-semibold uppercase tracking-wide text-casca-texto">
              <th scope="col" className="px-3 text-left">
                {t("Arquivo")}
              </th>
              <th scope="col" className="w-[200px] px-3 text-right">
                {t("Data de upload")}
              </th>
              <th scope="col" className="w-[120px] px-3 text-right">
                {t("Usuário")}
              </th>
            </tr>
          </thead>
        </table>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
          <span className="grid size-14 place-items-center rounded-xl bg-casca-marca-suave text-casca-marca">
            <FileText size={22} aria-hidden />
          </span>
          <p className="mt-2 text-[15px] font-semibold text-casca-texto">{t("Nenhum arquivo encontrado")}</p>
          <p className="max-w-[180px] text-[13px] text-casca-suave">{t("Envie arquivos para mantê-los junto deste contato.")}</p>
          <BotaoDaCasca variante="texto" tamanho="sm" disabled title={t("Em breve")} className={cn("mt-2 border border-casca-borda", EM_BREVE)}>
            <CloudUpload aria-hidden />
            {t("Novo arquivo")}
          </BotaoDaCasca>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar (G1) e commit**

```bash
corepack pnpm vitest run tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/negocio/abas tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx
```
Mais `controle-decorativo`, `tailwind-tokens` e `vocabulario-do-funil`. Expected: PASS. Controlador confere e compara com os prints 02 a 06.

```bash
git add components/escale/negocio/abas tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx
git commit -m "feat(escale): abas Contato, Empresa, Negócio, Conversas e Arquivos da ficha, como na Clint

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: A moldura da ficha (topo com o caminho, cabeçalho, abas, estados)

**Files:**
- Create: `hooks/escale/useFichaDoNegocio.ts`, `components/escale/negocio/FichaDoNegocio.tsx`, `components/escale/negocio/TopoDaFicha.tsx`, `components/escale/negocio/CabecalhoDaFicha.tsx`, `components/escale/negocio/AbasDaFicha.tsx`, `components/escale/negocio/ConteudoDaAba.tsx`, `tests/unit/escale-ficha-do-negocio.test.tsx`

**Interfaces:**
- Consumes: `useBoard(origemId)` (`hooks/kanban/useBoard.ts`), `filtrosDaUrl`, `recortarQuadro`, `camposFiltraveis`, `comparadorDaOrdem` (1D), `useNegociosRecentes`/`useChaveDosRecentes`/`recenteDoLead` (1E), `tituloDoCard`.
- Produces:
  - `useFichaDoNegocio(negocioId, origemId, busca): Ficha`, com `Ficha = { estado: "carregando" } | { estado: "erro" } | { estado: "sumiu" } | FichaCarregada` e `FichaCarregada = { estado: "pronto"; lead; pipeline; stages; leadsDoRecorte; ordem; atualizar }`;
  - `FichaDoNegocio({ negocioId, origem, grupo, negociosDoContato })` (a página da Task 5 a monta);
  - `TopoDaFicha({ migalhas, direita? })`, `CabecalhoDaFicha({ lead, direita? })`, `AbasDaFicha({ valor, aoMudar })`, `ConteudoDaAba({ aba, ficha })`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-do-negocio.test.tsx`:

```tsx
import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), busca: "foo=1" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.busca),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const quadro = vi.hoisted(() => ({ estado: { data: undefined as unknown, isLoading: false, error: null as unknown } }));
vi.mock("@/hooks/kanban/useBoard", () => ({
  useBoard: () => ({ ...quadro.estado, refetch: vi.fn() }),
  chaveDoQuadro: (id: string) => ["board", id],
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }) }));
const recentes = vi.hoisted(() => ({ registrar: vi.fn() }));
vi.mock("@/hooks/escale/useNegociosRecentes", () => ({
  useChaveDosRecentes: () => "chave",
  useNegociosRecentes: () => ({ registrar: recentes.registrar }),
}));
vi.mock("@/components/escale/negocio/ConteudoDaAba", () => ({
  ConteudoDaAba: ({ aba }: { aba: string }) => <p>conteúdo {aba}</p>,
}));

import { FichaDoNegocio } from "@/components/escale/negocio/FichaDoNegocio";
import { useFichaDoNegocio } from "@/hooks/escale/useFichaDoNegocio";

/** FORK ESCALE · Fase 1G (C1, C2): a moldura da ficha do negócio (print 01). */
const LEAD = {
  id: "n1",
  pipeline_id: "o1",
  stage_id: "e1",
  contact_id: "c1",
  title: "Ana | Nunes Regularize",
  status: "open",
  position_in_stage: 1,
  value_cents: null,
  currency: null,
  owner_user_id: null,
  owner_agent_id: null,
  owner_kind: null,
  custom_fields: {},
  tags: [],
  contact_tags: [],
  last_activity_at: null,
  stage_changed_at: null,
  created_at: "2026-10-14T10:00:00Z",
  updated_at: "2026-10-14T10:00:00Z",
};
const QUADRO = {
  pipeline: { id: "o1", name: "Leads INSS Whatsapp", settings: {} },
  stages: [{ id: "e1", name: "1. Entrada Lead", position: 1, is_won: false, is_lost: false, is_archived: false }],
  leads: [LEAD],
};
const PROPS = {
  negocioId: "n1",
  origem: { id: "o1", nome: "Leads INSS Whatsapp" },
  grupo: "INSS Vendas",
  negociosDoContato: 1,
};

beforeEach(() => {
  nav.push.mockReset();
  nav.replace.mockReset();
  nav.busca = "foo=1";
  recentes.registrar.mockReset();
  quadro.estado = { data: QUADRO, isLoading: false, error: null };
});

describe("useFichaDoNegocio", () => {
  it("carregando, erro, sumiu e pronto, a partir do cache do quadro", () => {
    const busca = new URLSearchParams();
    quadro.estado = { data: undefined, isLoading: true, error: null };
    expect(renderHook(() => useFichaDoNegocio("n1", "o1", busca)).result.current.estado).toBe("carregando");
    quadro.estado = { data: undefined, isLoading: false, error: new Error("x") };
    expect(renderHook(() => useFichaDoNegocio("n1", "o1", busca)).result.current.estado).toBe("erro");
    quadro.estado = { data: QUADRO, isLoading: false, error: null };
    expect(renderHook(() => useFichaDoNegocio("outro", "o1", busca)).result.current.estado).toBe("sumiu");
    const pronto = renderHook(() => useFichaDoNegocio("n1", "o1", busca)).result.current;
    expect(pronto.estado === "pronto" && pronto.lead.id).toBe("n1");
  });
});

describe("<FichaDoNegocio>", () => {
  it("o caminho grupo › origem › negócio; a origem volta ao quadro com os filtros", () => {
    render(<FichaDoNegocio {...PROPS} />);
    const caminho = screen.getByRole("navigation", { name: "Caminho do negócio" });
    expect(caminho).toHaveTextContent("INSS Vendas");
    expect(screen.getByRole("link", { name: "Leads INSS Whatsapp" })).toHaveAttribute("href", "/app/pipelines/o1?foo=1");
    expect(screen.getByText("Ana | Nunes Regularize", { selector: "[aria-current='page']" })).toBeInTheDocument();
  });

  it("o cabeçalho: nome e lápis desligado (editar é 1H)", () => {
    render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getByRole("heading", { level: 1, name: "Ana | Nunes Regularize" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar nome" })).toHaveAttribute("title", "Em breve");
  });

  it("as sete abas da Clint, Atividades por padrão, e trocar de aba vai na URL", async () => {
    render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getAllByRole("tab").map((a) => a.textContent)).toEqual([
      "Atividades",
      "Contato",
      "Empresa",
      "Negócio",
      "Conversas",
      "Arquivos",
      "Histórico",
    ]);
    expect(screen.getByRole("tab", { name: "Atividades" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("conteúdo atividades")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Histórico" }));
    expect(nav.replace).toHaveBeenCalledWith("/app/negocios/n1?foo=1&aba=historico", { scroll: false });
  });

  it("a aba da URL abre direto", () => {
    nav.busca = "aba=negocio";
    render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getByRole("tab", { name: "Negócio" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("conteúdo negocio")).toBeInTheDocument();
  });

  it("abrir a ficha põe o negócio nos Recentes, uma vez", () => {
    const { rerender } = render(<FichaDoNegocio {...PROPS} />);
    rerender(<FichaDoNegocio {...PROPS} />);
    expect(recentes.registrar).toHaveBeenCalledTimes(1);
    expect(recentes.registrar.mock.calls[0]![0]).toMatchObject({ id: "n1", origemId: "o1", origem: "Leads INSS Whatsapp" });
  });

  it("negócio que sumiu: o texto da Clint e Voltar ao quadro", async () => {
    quadro.estado = { data: { ...QUADRO, leads: [] }, isLoading: false, error: null };
    render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getByText("Esse negócio não existe ou foi removido")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(nav.push).toHaveBeenCalledWith("/app/pipelines/o1?foo=1");
  });

  it("carregando e erro", () => {
    quadro.estado = { data: undefined, isLoading: true, error: null };
    const { unmount } = render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
    unmount();
    quadro.estado = { data: undefined, isLoading: false, error: new Error("x") };
    render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getByText("Não consegui carregar este negócio.")).toBeInTheDocument();
  });
});
```

Rode e veja falhar.

> Se `recortarQuadro` reclamar de algum campo que o fixture `LEAD` não tem (ele aplica o filtro padrão "Em aberto" da 1D), acrescente o campo no fixture com o valor neutro, sem mudar o código.

- [ ] **Step 2: O hook**

Create `hooks/escale/useFichaDoNegocio.ts`:

```ts
"use client";
import { useMemo } from "react";

import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useBoard } from "@/hooks/kanban/useBoard";
import { recortarQuadro } from "@/lib/escale/filtros/aplicar";
import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { comparadorDaOrdem } from "@/lib/escale/filtros/ordenar";
import { filtrosDaUrl } from "@/lib/escale/filtros/url";
import type { Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/**
 * O NEGÓCIO DA FICHA (fork Escale, Fase 1G).
 *
 * Lê do MESMO cache do quadro (`["board", origemId]`): o tempo real, ganhar,
 * perder, editar, mover e excluir (que gravam nesse cache) e os motivos de
 * perda da origem funcionam aqui sem rota nova. O recorte e a ordem são os do
 * quadro, a partir dos filtros que vieram na URL (C8: "leva em consideração a
 * ordem e os filtros atuais da listagem de negócios").
 */
type Busca = Parameters<typeof filtrosDaUrl>[0];

export interface FichaCarregada {
  estado: "pronto";
  lead: Lead;
  pipeline: Pipeline;
  stages: Stage[];
  /** Os negócios do quadro depois dos filtros da URL (o próximo negócio anda neles). */
  leadsDoRecorte: Lead[];
  ordem: ((a: Lead, b: Lead) => number) | undefined;
  atualizar: () => void;
}

export type Ficha = { estado: "carregando" } | { estado: "erro" } | { estado: "sumiu" } | FichaCarregada;

export function useFichaDoNegocio(negocioId: string, origemId: string, busca: Busca): Ficha {
  const { data, isLoading, error, refetch } = useBoard(origemId);
  const org = useActiveOrg();
  const filtros = useMemo(() => filtrosDaUrl(busca).filtros, [busca]);
  const campos = useMemo(() => camposFiltraveis([data?.pipeline.settings]), [data?.pipeline.settings]);
  return useMemo((): Ficha => {
    if (error) return { estado: "erro" };
    if (isLoading || !data) return { estado: "carregando" };
    const lead = data.leads.find((l) => l.id === negocioId);
    if (!lead) return { estado: "sumiu" };
    // Mesma moeda do recorte do quadro: se o PR B da 1F trocou a expressão em
    // `app/app/pipelines/[id]/_client.tsx` (moeda da origem), use a mesma aqui.
    const recorte = recortarQuadro(data, filtros, { moeda: org?.currency ?? null, campos });
    return {
      estado: "pronto",
      lead,
      pipeline: data.pipeline,
      stages: data.stages,
      leadsDoRecorte: recorte.leads,
      ordem: comparadorDaOrdem(filtros.ordem, campos),
      atualizar: () => void refetch(),
    };
  }, [error, isLoading, data, negocioId, filtros, org?.currency, campos, refetch]);
}
```

- [ ] **Step 3: Topo, cabeçalho e abas**

Create `components/escale/negocio/TopoDaFicha.tsx`:

```tsx
"use client";
import Link from "next/link";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { Migalha } from "@/lib/escale/negocio/regras";
import { ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** O TOPO DA FICHA (fork Escale, Fase 1G, C1; print 01): o caminho à esquerda e o próximo negócio à direita (C8). */
export function TopoDaFicha({ migalhas, direita }: { migalhas: Migalha[]; direita?: ReactNode }) {
  const t = useT();
  return (
    <div className="flex h-[46px] shrink-0 items-center justify-between gap-4 border-b border-casca-borda px-6">
      <nav aria-label={t("Caminho do negócio")} className="min-w-0">
        <ol className="flex min-w-0 items-center gap-1.5 text-[13px] text-casca-texto-2">
          {migalhas.map((m, i) => {
            const ultima = i === migalhas.length - 1;
            return (
              <li key={`${i}-${m.rotulo}`} className="flex min-w-0 items-center gap-1.5">
                {i > 0 ? <ChevronRight size={12} aria-hidden className="shrink-0 text-casca-suave" /> : null}
                {m.href ? (
                  <Link href={m.href} className="truncate hover:underline">
                    {m.rotulo}
                  </Link>
                ) : (
                  <span aria-current={ultima ? "page" : undefined} className={cn("truncate", ultima && "font-semibold text-casca-texto")}>
                    {m.rotulo}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {direita}
    </div>
  );
}
```

Create `components/escale/negocio/CabecalhoDaFicha.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";
import { Pencil } from "@/lib/ui/icons-da-casca";

import { FotoDaFicha } from "./FotoDaFicha";

/**
 * O CABEÇALHO DA FICHA (fork Escale, Fase 1G; print 01): foto, nome do contato
 * (o mesmo nome do card) e o lápis ("Editar nome", 1H). À direita, o PR B põe
 * o contador, o status, o dono e o ⋮ (C4 a C7).
 */
export function CabecalhoDaFicha({ lead, direita }: { lead: Lead; direita?: ReactNode }) {
  const t = useT();
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-casca-borda px-6">
      <div className="flex min-w-0 items-center gap-3">
        <FotoDaFicha lead={lead} />
        <h1 className="truncate text-[15px] font-normal text-casca-texto">{tituloDoCard(lead)}</h1>
        <BotaoDaCasca
          variante="icone"
          tamanho="sm"
          disabled
          title={t("Em breve")}
          aria-label={t("Editar nome")}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Pencil aria-hidden />
        </BotaoDaCasca>
      </div>
      {direita ? <div className="flex shrink-0 items-center gap-3">{direita}</div> : null}
    </div>
  );
}
```

Create `components/escale/negocio/AbasDaFicha.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import { ABAS_DO_NEGOCIO, ROTULO_DA_ABA, type AbaDoNegocio } from "@/lib/escale/negocio/regras";
import { cn } from "@/lib/utils";

/**
 * AS SETE ABAS DA FICHA (fork Escale, Fase 1G, C2; prints 01 a 07): 41px de
 * altura, 13px, 14px de cada lado; a ativa na cor da marca com sublinhado de
 * 3px. Não usa a `AbasDaCasca` (a da janela da origem tem 8px de lado e a ativa
 * em `casca-texto`).
 */
export function AbasDaFicha({ valor, aoMudar }: { valor: AbaDoNegocio; aoMudar: (aba: AbaDoNegocio) => void }) {
  const t = useT();
  return (
    <div role="tablist" aria-label={t("Abas do negócio")} className="flex h-[41px] shrink-0 border-b border-casca-borda px-4">
      {ABAS_DO_NEGOCIO.map((aba) => {
        const ativa = aba === valor;
        return (
          <button
            key={aba}
            type="button"
            role="tab"
            id={`aba-${aba}`}
            aria-selected={ativa}
            aria-controls="painel-da-aba"
            onClick={() => aoMudar(aba)}
            className={cn(
              "relative h-full px-3.5 text-[13px] transition-colors",
              ativa
                ? "text-casca-marca after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-full after:bg-casca-marca"
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

Create `components/escale/negocio/ConteudoDaAba.tsx`:

```tsx
"use client";
import type { FichaCarregada } from "@/hooks/escale/useFichaDoNegocio";
import type { AbaDoNegocio } from "@/lib/escale/negocio/regras";

import { AbaArquivos } from "./abas/AbaArquivos";
import { AbaAtividades } from "./abas/AbaAtividades";
import { AbaConversas } from "./abas/AbaConversas";
import { AbaHistorico } from "./abas/AbaHistorico";
import { AbaContato, AbaEmpresa, AbaNegocio } from "./abas/AbasDeCampos";

/** FORK ESCALE · Fase 1G (C2): o conteúdo de cada aba da ficha. */
export function ConteudoDaAba({ aba, ficha }: { aba: AbaDoNegocio; ficha: FichaCarregada }) {
  switch (aba) {
    case "atividades":
      return <AbaAtividades lead={ficha.lead} stages={ficha.stages} />;
    case "contato":
      return <AbaContato lead={ficha.lead} />;
    case "empresa":
      return <AbaEmpresa />;
    case "negocio":
      return <AbaNegocio lead={ficha.lead} pipeline={ficha.pipeline} />;
    case "conversas":
      return <AbaConversas lead={ficha.lead} />;
    case "arquivos":
      return <AbaArquivos />;
    case "historico":
      return <AbaHistorico lead={ficha.lead} />;
  }
}
```

- [ ] **Step 4: A ficha**

Create `components/escale/negocio/FichaDoNegocio.tsx`:

```tsx
"use client";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useFichaDoNegocio } from "@/hooks/escale/useFichaDoNegocio";
import { useChaveDosRecentes, useNegociosRecentes } from "@/hooks/escale/useNegociosRecentes";
import { useT } from "@/hooks/i18n/useT";
import {
  PARAM_ABA,
  PARAM_ETAPA_DO_PROXIMO,
  abaDaUrl,
  migalhasDoNegocio,
  rotaDoNegocio,
  rotaDoQuadro,
} from "@/lib/escale/negocio/regras";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import { recenteDoLead } from "@/lib/escale/recentes/regras";

import { AbasDaFicha } from "./AbasDaFicha";
import { CabecalhoDaFicha } from "./CabecalhoDaFicha";
import { ConteudoDaAba } from "./ConteudoDaAba";
import { TopoDaFicha } from "./TopoDaFicha";

/**
 * A FICHA DO NEGÓCIO (fork Escale, Fase 1G; C1, C2): a tela própria do negócio,
 * igual à Clint (`/deal/:id`, prints de 17/10). Só existe com a casca nova.
 *
 * A altura é a do quadro da casca (`app/app/pipelines/[id]/_client.tsx`): a
 * ficha cabe na tela, lê a reserva do rodapé, e cada aba rola sozinha.
 */
const ALTURA =
  "flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col overflow-hidden bg-surface md:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]";

export interface FichaDoNegocioProps {
  negocioId: string;
  origem: { id: string; nome: string };
  grupo: string | null;
  /** C7 (PR B): quantos negócios o contato tem, contados no servidor. */
  negociosDoContato: number;
}

export function FichaDoNegocio({ negocioId, origem, grupo }: FichaDoNegocioProps) {
  const t = useT();
  const router = useRouter();
  const busca = useSearchParams();
  const qs = busca.toString();
  const aba = abaDaUrl(busca.get(PARAM_ABA));
  const ficha = useFichaDoNegocio(negocioId, origem.id, busca);
  const { registrar } = useNegociosRecentes(useChaveDosRecentes());
  const registrado = useRef<string | null>(null);
  const lead = ficha.estado === "pronto" ? ficha.lead : null;

  // Fase 1E (Recentes): o negócio aberto entra nos Recentes, também quando chega pelo endereço.
  useEffect(() => {
    if (!lead || registrado.current === lead.id) return;
    registrado.current = lead.id;
    registrar(recenteDoLead(lead, origem.nome));
  }, [lead, origem.nome, registrar]);

  if (ficha.estado === "carregando" || ficha.estado === "erro") {
    return (
      <div className={ALTURA}>
        <p className="m-auto text-sm text-casca-suave">
          {ficha.estado === "carregando" ? t("Carregando…") : t("Não consegui carregar este negócio.")}
        </p>
      </div>
    );
  }
  if (ficha.estado === "sumiu") {
    return (
      <div className={ALTURA}>
        <div className="m-auto flex flex-col items-center gap-3 text-center">
          <p className="text-[15px] font-semibold text-casca-texto">{t("Esse negócio não existe ou foi removido")}</p>
          <BotaoDaCasca variante="texto" tamanho="sm" onClick={() => router.push(rotaDoQuadro(origem.id, qs))}>
            {t("Voltar")}
          </BotaoDaCasca>
        </div>
      </div>
    );
  }

  const migalhas = migalhasDoNegocio({ grupo, origem, negocio: tituloDoCard(ficha.lead), qs });
  return (
    <div className={ALTURA} data-ficha-do-negocio={ficha.lead.id}>
      <TopoDaFicha migalhas={migalhas} />
      <CabecalhoDaFicha lead={ficha.lead} />
      <AbasDaFicha
        valor={aba}
        aoMudar={(nova) =>
          router.replace(rotaDoNegocio(ficha.lead.id, qs, { aba: nova, etapa: busca.get(PARAM_ETAPA_DO_PROXIMO) }), {
            scroll: false,
          })
        }
      />
      <div role="tabpanel" id="painel-da-aba" aria-labelledby={`aba-${aba}`} className="min-h-0 flex-1 overflow-y-auto">
        <ConteudoDaAba aba={aba} ficha={ficha} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar (G1), revisão e commit**

```bash
corepack pnpm vitest run tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/escale-ficha-abas-atividades-historico.test.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/negocio hooks/escale/useFichaDoNegocio.ts tests/unit/escale-ficha-do-negocio.test.tsx
```
Mais os guardas (comando da G1): espere `altura-fixa-le-a-reserva-do-rodape`, `controle-decorativo`, `tailwind-tokens`, `vocabulario-do-funil`. Expected: PASS.

**Revisor (subagente):** UI grande. Pontos: a altura copia a fórmula do quadro; o `useEffect` dos Recentes não grava em loop; nenhum controle nativo de data ou seleção. Depois:

```bash
git add components/escale/negocio hooks/escale/useFichaDoNegocio.ts tests/unit/escale-ficha-do-negocio.test.tsx
git commit -m "feat(escale): a moldura da ficha do negócio (caminho, cabeçalho e as sete abas da Clint)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: A rota, os redirecionamentos e as portas (card, Recente, link estável)

**Files:**
- Create: `app/app/negocios/layout.tsx`, `app/app/negocios/[id]/page.tsx`, `tests/unit/escale-ficha-rotas.test.ts`, `tests/unit/escale-ficha-abre-pelo-card.test.ts`
- Modify: `app/app/leads/[id]/page.tsx`, `app/app/pipelines/[id]/page.tsx`, `app/app/pipelines/[id]/_client.tsx`, `components/kanban/KanbanBoard.tsx`, `components/escale/visualizacoes/QuadroCombinado.tsx`, `components/escale/visualizacoes/QuadroDaVisualizacao.tsx`, `lib/escale/recentes/regras.ts`, `tests/unit/escale-recentes-regras.test.ts`, e os mocks de `next/navigation` de `tests/unit/escale-quadro-da-visualizacao.test.tsx` e `tests/unit/escale-pagina-da-visualizacao.test.tsx` (se não tiverem `useRouter`)

**Interfaces:**
- Produces: `NegocioPage({ params })` (padrão do Next); `KanbanBoard` ganha `aoAbrirNegocio?: (leadId: string) => void`; `QuadroCombinado` ganha `aoAbrirNegocio?: (leadId: string) => void`.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-ficha-rotas.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

/** FORK ESCALE · Fase 1G (C1, N1, N3, N14): a rota da ficha e os redirecionamentos, com e sem a casca. */
const estado = vi.hoisted(() => ({
  menu: "topo" as string | undefined,
  linhas: {} as Record<string, Record<string, unknown> | null>,
  contagem: 0,
  contou: false,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) => (nome === "escale_menu" && estado.menu ? { value: estado.menu } : undefined),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u-1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: "agent" })),
}));
function consulta(tabela: string) {
  const q: Record<string, unknown> = {};
  q.select = (_colunas: string, opcoes?: { head?: boolean }) => {
    if (!opcoes?.head) return q;
    estado.contou = true;
    return { eq: () => ({ eq: async () => ({ count: estado.contagem, error: null }) }) };
  };
  q.eq = () => q;
  q.order = async () => ({ data: [], error: null });
  q.maybeSingle = async () => ({ data: estado.linhas[tabela] ?? null, error: null });
  return q;
}
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ from: (t: string) => consulta(t) })) }));
vi.mock("@/components/escale/negocio/FichaDoNegocio", () => ({ FichaDoNegocio: () => null }));
vi.mock("@/app/app/pipelines/[id]/_client", () => ({ PipelinePageClient: () => null }));

import LeadPage from "@/app/app/leads/[id]/page";
import NegocioPage from "@/app/app/negocios/[id]/page";
import PipelinePage from "@/app/app/pipelines/[id]/page";

const LEAD = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const ORIGEM = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const GRUPO = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  estado.menu = "topo";
  estado.contagem = 3;
  estado.contou = false;
  estado.linhas = {
    crm_leads: { id: LEAD, pipeline_id: ORIGEM, contact_id: "contato-1" },
    crm_pipelines: { id: ORIGEM, name: "Leads INSS Whatsapp", group_id: GRUPO, vocabulary: null },
    crm_pipeline_groups: { name: "INSS Vendas" },
  };
});

describe("/app/negocios/[id]", () => {
  it("com a casca: a ficha com a origem, o grupo e quantos negócios o contato tem", async () => {
    const el = (await NegocioPage(params(LEAD))) as { props: Record<string, unknown> };
    expect(el.props).toEqual({
      negocioId: LEAD,
      origem: { id: ORIGEM, nome: "Leads INSS Whatsapp" },
      grupo: "INSS Vendas",
      negociosDoContato: 3,
    });
  });

  it("sem a casca: o link estável do original (que leva ao quadro com ?lead=)", async () => {
    estado.menu = undefined;
    await expect(NegocioPage(params(LEAD))).rejects.toThrow(`REDIRECT /app/leads/${LEAD}`);
  });

  it("id inválido, negócio de outra organização ou sem origem: 404", async () => {
    await expect(NegocioPage(params("nao-e-uuid"))).rejects.toThrow("NOT_FOUND");
    estado.linhas.crm_leads = null;
    await expect(NegocioPage(params(LEAD))).rejects.toThrow("NOT_FOUND");
  });

  it("negócio sem contato: contador zero, sem contar no banco", async () => {
    estado.linhas.crm_leads = { id: LEAD, pipeline_id: ORIGEM, contact_id: null };
    const el = (await NegocioPage(params(LEAD))) as { props: Record<string, unknown> };
    expect(el.props.negociosDoContato).toBe(0);
    expect(estado.contou).toBe(false);
  });

  it("origem sem grupo: grupo nulo", async () => {
    estado.linhas.crm_pipelines = { id: ORIGEM, name: "O", group_id: null };
    const el = (await NegocioPage(params(LEAD))) as { props: Record<string, unknown> };
    expect(el.props.grupo).toBeNull();
  });
});

describe("as portas antigas", () => {
  it("/app/leads/[id]: com a casca, a ficha; sem, o quadro com ?lead= (como sempre)", async () => {
    await expect(LeadPage(params(LEAD))).rejects.toThrow(`REDIRECT /app/negocios/${LEAD}`);
    estado.menu = undefined;
    await expect(LeadPage(params(LEAD))).rejects.toThrow(`REDIRECT /app/pipelines/${ORIGEM}?lead=${LEAD}`);
  });

  it("quadro com ?lead=: com a casca, a ficha, levando os filtros", async () => {
    await expect(
      PipelinePage({ ...params(ORIGEM), searchParams: Promise.resolve({ lead: LEAD, st: "open" }) }),
    ).rejects.toThrow(`REDIRECT /app/negocios/${LEAD}?st=open`);
  });

  it("quadro com ?lead=: sem a casca, o quadro abre e o dossiê segue igual", async () => {
    estado.menu = undefined;
    const el = (await PipelinePage({ ...params(ORIGEM), searchParams: Promise.resolve({ lead: LEAD }) })) as {
      props: { cascaNova: boolean };
    };
    expect(el.props.cascaNova).toBe(false);
  });

  it("quadro sem ?lead=, com a casca: abre normal", async () => {
    const el = (await PipelinePage({ ...params(ORIGEM), searchParams: Promise.resolve({}) })) as {
      props: { cascaNova: boolean };
    };
    expect(el.props.cascaNova).toBe(true);
  });
});
```

Create `tests/unit/escale-ficha-abre-pelo-card.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** FORK ESCALE · Fase 1G (N3): com a casca, o card abre a ficha; sem, o dossiê de sempre. */
const ler = (caminho: string) => readFileSync(join(__dirname, "..", "..", caminho), "utf8");

describe("o card abre a ficha (só na casca)", () => {
  it("KanbanBoard: a coluna da casca chama aoAbrirNegocio; a StageColumn continua com o dossiê", () => {
    const f = ler("components/kanban/KanbanBoard.tsx");
    expect(f).toContain("aoAbrirNegocio?: (leadId: string) => void;");
    expect(f).toContain("onOpen={aoAbrirNegocio ?? setDossieId}");
    expect(f.match(/onOpen=\{setDossieId\}/g)).toHaveLength(1);
  });

  it("_client: só a casca passa aoAbrirNegocio, com a busca da URL", () => {
    expect(ler("app/app/pipelines/[id]/_client.tsx")).toContain(
      "aoAbrirNegocio={cascaNova ? (id) => router.push(rotaDoNegocio(id, searchParams.toString())) : undefined}",
    );
  });

  it("Visualização: o card abre a ficha", () => {
    expect(ler("components/escale/visualizacoes/QuadroCombinado.tsx")).toContain("onOpen={aoAbrirNegocio ?? setDossieId}");
    expect(ler("components/escale/visualizacoes/QuadroDaVisualizacao.tsx")).toContain(
      "aoAbrirNegocio={(id) => router.push(rotaDoNegocio(id, searchParams.toString()))}",
    );
  });
});
```

Em `tests/unit/escale-recentes-regras.test.ts`, troque

```ts
    expect(linkDoRecente(r(1))).toBe(`/app/pipelines/${ORIGEM}?lead=${id(1)}`);
```
por
```ts
    // Fase 1G (N3): o Recente abre a ficha do negócio.
    expect(linkDoRecente(r(1))).toBe(`/app/negocios/${id(1)}`);
```
e, se `tests/unit/escale-secao-recentes.test.tsx` tiver `?lead=` num `href` esperado, troque pelo mesmo `/app/negocios/<id>`.

```bash
corepack pnpm vitest run tests/unit/escale-ficha-rotas.test.ts tests/unit/escale-ficha-abre-pelo-card.test.ts tests/unit/escale-recentes-regras.test.ts
```
Expected: FAIL (rota inexistente, encaixes ausentes, link antigo).

- [ ] **Step 2: A rota e o layout**

Create `app/app/negocios/layout.tsx`:

```tsx
import type { ReactNode } from "react";

import { ComOrigens } from "@/components/escale/origens/ComOrigens";

// FORK ESCALE · Fase 1G (N2): a ficha do negócio fica ao lado do painel Origens, como na Clint superior (01-011).
// Sem a casca nova, o ComOrigens devolve só o conteúdo (e a página redireciona).
export default function NegociosLayout({ children }: { children: ReactNode }) {
  return <ComOrigens>{children}</ComOrigens>;
}
```

Create `app/app/negocios/[id]/page.tsx`:

```tsx
/**
 * A FICHA DO NEGÓCIO (fork Escale, Fase 1G; C1): a tela própria do negócio,
 * como o `/deal/:id` da Clint. Só com a casca nova (cookie `escale_menu=topo`);
 * sem ela, volta ao link estável do original (`/app/leads/[id]`, que leva ao
 * quadro com `?lead=`): o dossiê lateral continua o de sempre.
 *
 * O negócio, a origem e o grupo são lidos com a sessão de quem olha e com o
 * filtro da organização ativa (a RLS é piso, não escopo: ver
 * `app/app/leads/[id]/page.tsx`). O contador "N Negócios" (C7) também: a RLS
 * decide quais negócios do contato entram.
 */
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { FichaDoNegocio } from "@/components/escale/negocio/FichaDoNegocio";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NegocioPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) notFound();

  const { id: bruto } = await params;
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) !== "topo") redirect(`/app/leads/${bruto}`);
  const id = lerUuid(bruto);
  if (!id) notFound();

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, pipeline_id, contact_id")
    .eq("organization_id", activeOrg.orgId)
    .eq("id", id)
    .maybeSingle();
  if (!lead?.pipeline_id) notFound();

  const { data: origem } = await supabase
    .from("crm_pipelines")
    .select("id, name, group_id")
    .eq("organization_id", activeOrg.orgId)
    .eq("id", lead.pipeline_id)
    .maybeSingle();
  if (!origem) notFound();

  const { data: grupo } = origem.group_id
    ? await supabase
        .from("crm_pipeline_groups")
        .select("name")
        .eq("organization_id", activeOrg.orgId)
        .eq("id", origem.group_id)
        .maybeSingle()
    : { data: null };

  let negociosDoContato = 0;
  if (lead.contact_id) {
    const { count } = await supabase
      .from("crm_leads")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", activeOrg.orgId)
      .eq("contact_id", lead.contact_id);
    negociosDoContato = count ?? 0;
  }

  return (
    <FichaDoNegocio
      negocioId={id}
      origem={{ id: origem.id, nome: origem.name }}
      grupo={grupo?.name ?? null}
      negociosDoContato={negociosDoContato}
    />
  );
}
```

> Se `crm_pipeline_groups` não tiver `organization_id` (confira em `lib/escale/origens/ler-origens.ts`), tire o `.eq("organization_id", …)` da consulta do grupo; o `group_id` já veio da origem filtrada.

- [ ] **Step 3: As portas antigas**

3a. Em `app/app/leads/[id]/page.tsx`:
- junto dos imports, acrescente:
  ```tsx
  // FORK ESCALE · Fase 1G (N3): com a casca nova, o link estável abre a ficha própria do negócio.
  import { cookies } from "next/headers";
  import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
  ```
- troque a última linha
  ```tsx
    redirect(`/app/pipelines/${lead.pipeline_id}?lead=${lead.id}`);
  ```
  por
  ```tsx
    // FORK ESCALE · Fase 1G (N3): com a casca nova, a ficha própria; sem ela, o quadro com o dossiê.
    if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
      redirect(`/app/negocios/${lead.id}`);
    }
    redirect(`/app/pipelines/${lead.pipeline_id}?lead=${lead.id}`);
  ```

3b. Em `app/app/pipelines/[id]/page.tsx`:
- junto do import `// FORK ESCALE · Fase 1D …`, acrescente:
  ```tsx
  // FORK ESCALE · Fase 1G (N3): com a casca, `?lead=` abre a ficha do negócio.
  import { lerUuid } from "@/lib/escale/origens/preferencias";
  import { buscaDosParametros, rotaDoNegocio, type ParametrosDaPagina } from "@/lib/escale/negocio/regras";
  ```
- troque a assinatura
  ```tsx
  export default async function PipelinePage({
    params,
  }: {
    params: Promise<{ id: string }>;
  }) {
  ```
  por
  ```tsx
  export default async function PipelinePage({
    params,
    searchParams,
  }: {
    params: Promise<{ id: string }>;
    // FORK ESCALE · Fase 1G: o `?lead=` (e os filtros) para a ficha do negócio.
    searchParams?: Promise<ParametrosDaPagina>;
  }) {
  ```
- logo DEPOIS de `  const { id } = await params;`, acrescente:
  ```tsx
    // FORK ESCALE · Fase 1G (N14): com a casca nova, `?lead=` vira a ficha própria, levando os filtros.
    // Antes de ler o banco: a ficha resolve a origem do negócio sozinha. Sem a casca, nada muda.
    const busca = buscaDosParametros((await searchParams) ?? {});
    const leadDaUrl = lerUuid(new URLSearchParams(busca).get("lead"));
    if (leadDaUrl && lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
      redirect(rotaDoNegocio(leadDaUrl, busca));
    }
  ```
  (O `cookies`, o `COOKIE_DO_MENU`, o `lerPreferenciaDeMenu` e o `redirect` já são importados no arquivo.)

- [ ] **Step 4: O card abre a ficha**

4a. Em `components/kanban/KanbanBoard.tsx`:
- no tipo das props, logo DEPOIS da linha de `aoFecharDossie?: () => void;` (linha ~83), acrescente:
  ```tsx
    /**
     * FORK ESCALE · Fase 1G (N3): na casca, o card abre a ficha do negócio (tela
     * própria) em vez do dossiê. Ausente = o dossiê de sempre.
     */
    aoAbrirNegocio?: (leadId: string) => void;
  ```
- na desestruturação (linha ~137), logo DEPOIS de `  aoFecharDossie,`, acrescente `  aoAbrirNegocio,`;
- no ramo `aparencia === "casca" ? ( <ColunaDoFunilNaCasca …`, troque **só nele** `              onOpen={setDossieId}` por:
  ```tsx
                // FORK ESCALE · Fase 1G (N3): na casca, o card abre a ficha do negócio.
                onOpen={aoAbrirNegocio ?? setDossieId}
  ```
  O `onOpen={setDossieId}` da `StageColumn` (o ramo de baixo) não muda.

4b. Em `app/app/pipelines/[id]/_client.tsx`:
- junto dos imports do fork, acrescente `// FORK ESCALE · Fase 1G: o card da casca abre a ficha do negócio.` e `import { rotaDoNegocio } from "@/lib/escale/negocio/regras";`;
- no `<KanbanBoard …>`, logo DEPOIS do bloco `aoFecharDossie={ … }`, acrescente:
  ```tsx
            // FORK ESCALE · Fase 1G (N3): na casca, o card abre a ficha (com os filtros do quadro na URL).
            aoAbrirNegocio={cascaNova ? (id) => router.push(rotaDoNegocio(id, searchParams.toString())) : undefined}
  ```

4c. Em `components/escale/visualizacoes/QuadroCombinado.tsx`:
- nas props do componente, acrescente `aoAbrirNegocio?: (leadId: string) => void;` (com o comentário `/** Fase 1G (N3): o card abre a ficha do negócio. Ausente = o dossiê. */`) e o desestruture;
- troque `              onOpen={setDossieId}` (linha ~238) por `              onOpen={aoAbrirNegocio ?? setDossieId}`.

4d. Em `components/escale/visualizacoes/QuadroDaVisualizacao.tsx`:
- troque `import { useSearchParams } from "next/navigation";` por `import { useRouter, useSearchParams } from "next/navigation";` e acrescente `import { rotaDoNegocio } from "@/lib/escale/negocio/regras";`;
- logo DEPOIS de `  const searchParams = useSearchParams();`, acrescente `  const router = useRouter();`;
- no `<QuadroCombinado …>`, logo DEPOIS de `leadInicial={searchParams.get("lead")}`, acrescente:
  ```tsx
            // Fase 1G (N3, Q13): o card da Visualização também abre a ficha do negócio.
            aoAbrirNegocio={(id) => router.push(rotaDoNegocio(id, searchParams.toString()))}
  ```
- nos testes `tests/unit/escale-quadro-da-visualizacao.test.tsx` e `tests/unit/escale-pagina-da-visualizacao.test.tsx`, se o mock de `next/navigation` não tiver `useRouter`, acrescente `useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),`.

4e. Em `lib/escale/recentes/regras.ts`, troque
```ts
/** O deep link do quadro (`?lead=`): abre o negócio no quadro da origem dele. */
export const linkDoRecente = (r: NegocioRecente) => `/app/pipelines/${r.origemId}?lead=${r.id}`;
```
por
```ts
/** Fase 1G (N3): o Recente abre a ficha do negócio (os Recentes só existem com a casca). */
export const linkDoRecente = (r: NegocioRecente) => `/app/negocios/${r.id}`;
```

- [ ] **Step 5: Verificar (G1), revisão e commit**

```bash
corepack pnpm vitest run tests/unit/escale-ficha-rotas.test.ts tests/unit/escale-ficha-abre-pelo-card.test.ts tests/unit/escale-recentes-regras.test.ts tests/unit/escale-secao-recentes.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx tests/unit/escale-pagina-da-visualizacao.test.tsx tests/unit/escale-quadro-combinado.test.tsx tests/unit/escale-quadro-na-casca.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx "app/app/pipelines/[id]/trocar-funil.test.tsx" tests/unit/navegacao-completude.test.ts
corepack pnpm typecheck
corepack pnpm exec eslint app/app/negocios "app/app/leads/[id]/page.tsx" "app/app/pipelines/[id]/page.tsx" "app/app/pipelines/[id]/_client.tsx" components/kanban/KanbanBoard.tsx components/escale/visualizacoes lib/escale/recentes tests/unit/escale-ficha-rotas.test.ts tests/unit/escale-ficha-abre-pelo-card.test.ts
```
Mais os guardas que leem os arquivos tocados (comando da G1); espere, entre outros, os testes do original que leem `KanbanBoard` (`grep -rlE "KanbanBoard" tests components --include='*.test.*'`), `escale-casca-v2-original-intacto`, `vocabulario-do-funil`. Expected: PASS.

**Revisor (subagente):** rotas e redirecionamentos. Pontos: a ficha filtra pela organização ativa em todas as leituras; não há laço de redirecionamento (com a casca, `/app/negocios` não manda para `/app/leads`; sem ela, `/app/leads` não manda para `/app/negocios`); o `?lead=` sem a casca chega ao `KanbanBoard` como antes; nenhuma rota nova de API. Depois:

```bash
git add app/app/negocios "app/app/leads/[id]/page.tsx" "app/app/pipelines/[id]/page.tsx" "app/app/pipelines/[id]/_client.tsx" components/kanban/KanbanBoard.tsx components/escale/visualizacoes lib/escale/recentes/regras.ts tests/unit/escale-ficha-rotas.test.ts tests/unit/escale-ficha-abre-pelo-card.test.ts tests/unit/escale-recentes-regras.test.ts tests/unit/escale-secao-recentes.test.tsx tests/unit/escale-quadro-da-visualizacao.test.tsx tests/unit/escale-pagina-da-visualizacao.test.tsx
git commit -m "feat(escale): o negócio abre em tela própria na casca (rota, card, Recentes e links antigos)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Próximo negócio (C8)

**Files:**
- Create: `components/escale/negocio/ProximoNegocio.tsx`, `tests/unit/escale-ficha-proximo-negocio.test.tsx`
- Modify: `components/escale/negocio/FichaDoNegocio.tsx`

**Interfaces:**
- Produces: `ProximoNegocio({ lead, etapas, leads, ordem, aba })`.

**Detalhes visuais (prints 01, 11 e 12):** fechado, a caixa de 105×32px com ▾ ‹ ›; aberto, o rótulo "PRÓXIMO NEGÓCIO" (10px, maiúsculo, `casca-suave`) e o "?" à esquerda, e a caixa cresce para 248px com o nome da etapa; a lista de 158px, até 370px de altura com rolagem, o item escolhido em `casca-marca` sobre `casca-raia` com ✓. Setas desligadas com opacidade 0,4. **Desvio:** a Clint mostra no tooltip da seta um cartão com foto e nome do próximo; aqui a dica é o nome (print que falta 3); o "?" é o `AjudaDaCasca` (a Clint desenha um círculo cheio; conferir no print 11).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-proximo-negocio.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), busca: "st=open" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.busca),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/components/escale/ui/AjudaDaCasca", () => ({
  AjudaDaCasca: ({ texto }: { texto: string }) => <span data-testid="ajuda">{texto}</span>,
}));

import { ProximoNegocio } from "@/components/escale/negocio/ProximoNegocio";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G (C8; prints 01 e 11): o próximo negócio da etapa, na ordem e nos filtros do quadro. */
const etapa = (id: string, position: number, name: string): Stage =>
  ({ id, position, name, is_won: false, is_lost: false, is_archived: false }) as Stage;
const negocio = (id: string, stage_id: string, position_in_stage: number, title = id): Lead =>
  ({ id, stage_id, position_in_stage, title }) as Lead;
const ETAPAS = [etapa("e1", 1, "1. Entrada Lead"), etapa("e2", 2, "2. Em atendimento")];
const LEADS = [negocio("a", "e1", 1), negocio("b", "e1", 2, "Bruno"), negocio("c", "e1", 3, "Carla"), negocio("x", "e2", 1, "Xavier")];

beforeEach(() => {
  nav.push.mockReset();
  nav.replace.mockReset();
  nav.busca = "st=open";
});

describe("<ProximoNegocio>", () => {
  it("as setas levam ao anterior e ao próximo da etapa, com os filtros do quadro", async () => {
    render(<ProximoNegocio lead={LEADS[1]!} etapas={ETAPAS} leads={LEADS} ordem={undefined} aba="atividades" />);
    expect(screen.getByRole("button", { name: "Próximo negócio" })).toHaveAttribute("title", "Carla");
    await userEvent.click(screen.getByRole("button", { name: "Próximo negócio" }));
    expect(nav.push).toHaveBeenCalledWith("/app/negocios/c?st=open");
    await userEvent.click(screen.getByRole("button", { name: "Negócio anterior" }));
    expect(nav.push).toHaveBeenLastCalledWith("/app/negocios/a?st=open");
  });

  it("sem vizinho, a seta fica desligada com o texto da Clint", () => {
    render(<ProximoNegocio lead={LEADS[0]!} etapas={ETAPAS} leads={LEADS} ordem={undefined} aba="atividades" />);
    const anterior = screen.getByRole("button", { name: "Negócio anterior" });
    expect(anterior).toBeDisabled();
    expect(anterior).toHaveAttribute("title", "Não existem negócios anteriores nesta etapa.");
  });

  it("fechado mostra só ▾ ‹ ›; aberto, 'Próximo negócio', a ajuda e a etapa; escolher outra etapa vai na URL", async () => {
    render(<ProximoNegocio lead={LEADS[1]!} etapas={ETAPAS} leads={LEADS} ordem={undefined} aba="historico" />);
    expect(screen.queryByTestId("ajuda")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Etapa do próximo negócio" }));
    expect(screen.getByTestId("ajuda")).toHaveTextContent(
      "O próximo negócio leva em consideração a ordem e os filtros atuais da listagem de negócios.",
    );
    expect(screen.getByRole("option", { name: "1. Entrada Lead" })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("option", { name: "2. Em atendimento" }));
    expect(nav.replace).toHaveBeenCalledWith("/app/negocios/b?st=open&aba=historico&pe=e2", { scroll: false });
  });

  it("com outra etapa escolhida (pe), a seta › leva ao primeiro dela e a ‹ fica desligada", async () => {
    nav.busca = "st=open&pe=e2";
    render(<ProximoNegocio lead={LEADS[1]!} etapas={ETAPAS} leads={LEADS} ordem={undefined} aba="atividades" />);
    expect(screen.getByRole("button", { name: "Negócio anterior" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Próximo negócio" }));
    expect(nav.push).toHaveBeenCalledWith("/app/negocios/x?st=open&pe=e2");
  });
});
```

Rode e veja falhar.

- [ ] **Step 2: O componente**

Create `components/escale/negocio/ProximoNegocio.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  PARAM_ETAPA_DO_PROXIMO,
  etapasDoProximo,
  rotaDoNegocio,
  vizinhosNaEtapa,
  type AbaDoNegocio,
} from "@/lib/escale/negocio/regras";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * PRÓXIMO NEGÓCIO (fork Escale, Fase 1G, C8; prints 01 e 11).
 *
 * A etapa começa na do negócio; trocar vai na URL (`pe`). A ordem e o recorte
 * são os do quadro (N11). Código da Clint: `getStageGroupInfo-BptXw8sG.js.txt`.
 */
const SETA =
  "grid size-6 place-items-center rounded text-casca-suave hover:bg-casca-raia hover:text-casca-texto disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-40";

export function ProximoNegocio({
  lead,
  etapas,
  leads,
  ordem,
  aba,
}: {
  lead: Lead;
  etapas: Stage[];
  leads: Lead[];
  ordem: ((a: Lead, b: Lead) => number) | undefined;
  aba: AbaDoNegocio;
}) {
  const t = useT();
  const router = useRouter();
  const busca = useSearchParams();
  const qs = busca.toString();
  const [aberto, setAberto] = useState(false);
  const opcoes = etapasDoProximo(etapas);
  const pedida = busca.get(PARAM_ETAPA_DO_PROXIMO);
  const etapaId = pedida && opcoes.some((s) => s.id === pedida) ? pedida : lead.stage_id;
  const etapa = opcoes.find((s) => s.id === etapaId);
  const { anterior, proximo } = vizinhosNaEtapa(leads, etapaId, lead.id, ordem);

  const ir = (destino: Lead) => router.push(rotaDoNegocio(destino.id, qs, { aba, etapa: pedida }));
  const escolher = (id: string) => {
    setAberto(false);
    router.replace(rotaDoNegocio(lead.id, qs, { aba, etapa: id === lead.stage_id ? null : id }), { scroll: false });
  };

  return (
    <div className="flex shrink-0 items-center gap-3">
      {aberto ? (
        <span className="flex items-center gap-1.5 text-[10px] uppercase text-casca-suave">
          {t("Próximo negócio")}
          <AjudaDaCasca texto={t("O próximo negócio leva em consideração a ordem e os filtros atuais da listagem de negócios.")} />
        </span>
      ) : null}
      <div className={cn("flex h-8 items-center gap-1 rounded-md border border-casca-borda pl-2 pr-1", aberto ? "w-[248px]" : "w-[105px]")}>
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("Etapa do próximo negócio")}
              className="flex min-w-0 flex-1 items-center justify-between gap-1 text-[13px] text-casca-texto"
            >
              {aberto ? <span className="truncate">{etapa?.name ?? ""}</span> : null}
              <ChevronDown size={14} aria-hidden className="shrink-0" />
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="end" sideOffset={6} className="max-h-[370px] w-[158px] overflow-y-auto p-1">
            <ul role="listbox" aria-label={t("Etapa do próximo negócio")}>
              {opcoes.map((s) => {
                const escolhida = s.id === etapaId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={escolhida}
                      onClick={() => escolher(s.id)}
                      className={cn(
                        "flex w-full items-start justify-between gap-2 rounded px-3 py-2 text-left text-xs",
                        escolhida ? "bg-casca-raia text-casca-marca" : "text-casca-texto hover:bg-casca-raia",
                      )}
                    >
                      <span>{s.name}</span>
                      {escolhida ? <Check size={14} aria-hidden className="shrink-0" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </PainelSuspenso>
        </Popover>
        <button
          type="button"
          aria-label={t("Negócio anterior")}
          disabled={!anterior}
          title={anterior ? tituloDoCard(anterior) : t("Não existem negócios anteriores nesta etapa.")}
          onClick={() => anterior && ir(anterior)}
          className={SETA}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={t("Próximo negócio")}
          disabled={!proximo}
          title={proximo ? tituloDoCard(proximo) : t("Não existem próximos negócios nesta etapa.")}
          onClick={() => proximo && ir(proximo)}
          className={SETA}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
```

> Se o `@/components/ui/popover` não exportar `Popover` e `PopoverTrigger` com esses nomes, use os que o `PainelSuspenso` documenta ("Vai dentro de um `<Popover>` do original").

- [ ] **Step 3: Na ficha**

Em `components/escale/negocio/FichaDoNegocio.tsx`:
- acrescente `import { ProximoNegocio } from "./ProximoNegocio";`;
- troque `      <TopoDaFicha migalhas={migalhas} />` por:
  ```tsx
        <TopoDaFicha
          migalhas={migalhas}
          // C8: o próximo negócio da etapa, na ordem e nos filtros do quadro.
          direita={
            <ProximoNegocio
              lead={ficha.lead}
              etapas={ficha.stages}
              leads={ficha.leadsDoRecorte}
              ordem={ficha.ordem}
              aba={aba}
            />
          }
        />
  ```
- no `tests/unit/escale-ficha-do-negocio.test.tsx`, acrescente o mock `vi.mock("@/components/escale/negocio/ProximoNegocio", () => ({ ProximoNegocio: () => <span data-testid="proximo" /> }));` e, no caso do caminho, `expect(screen.getByTestId("proximo")).toBeInTheDocument();`.

- [ ] **Step 4: Verificar (G1) e commit**

```bash
corepack pnpm vitest run tests/unit/escale-ficha-proximo-negocio.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/negocio tests/unit/escale-ficha-proximo-negocio.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
```
Mais `controle-decorativo` e `tailwind-tokens`. Expected: PASS. Controlador confere e compara com os prints 01 e 11.

```bash
git add components/escale/negocio tests/unit/escale-ficha-proximo-negocio.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
git commit -m "feat(escale): próximo negócio da etapa na ficha, na ordem e nos filtros do quadro

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Espanhol do PR A, a rodada cheia, a conferência, o PRD e o PR A

- [ ] **Step 1: O espanhol.** Bloco novo `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───` em `lib/i18n/dicionario.ts`, logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`. Use o script da 1F (v2, Task 16), que pula chave já existente (com ou sem aspas). Onde a Clint tem espanhol (`raw-v2\js\es-ES--Nhr_a4A.js.txt`, procure pela chave do catálogo), vale o dela; onde o texto é nosso, "tú".

| pt | es |
|---|---|
| Atividades | Actividades |
| Contato | Contacto |
| Empresa | Empresa |
| Negócio | Negocio |
| Conversas | Conversaciones |
| Arquivos | Archivos |
| Histórico | Historial |
| Caminho do negócio | Ruta del negocio |
| Abas do negócio | Pestañas del negocio |
| Editar nome | Editar nombre |
| Não consegui carregar este negócio. | No pude cargar este negocio. |
| Esse negócio não existe ou foi removido | Este negocio no existe o fue eliminado |
| Voltar | Volver |
| Etapas da origem | Etapas del origen |
| Mais etapas | Más etapas |
| Próximas atividades | Próximas actividades |
| Configurar atividades | Configurar actividades |
| Não consegui carregar as atividades. | No pude cargar las actividades. |
| Nenhuma atividade neste negócio. | Ninguna actividad en este negocio. |
| 1 atividade | 1 actividad |
| atividades | actividades |
| Sem prazo | Sin plazo |
| Nova atividade | Nueva actividad |
| Detalhes da atividade | Detalles de la actividad |
| Editar atividade | Editar actividad |
| Concluída | Completada |
| Buscar no histórico | Buscar en el historial |
| Todos | Todos |
| Esta semana | Esta semana |
| Semana passada | Semana pasada |
| por | por |
| Não consegui carregar o histórico. | No pude cargar el historial. |
| Nenhum evento ainda. | Ningún evento todavía. |
| Ocultar vazios | Ocultar vacíos |
| Gerenciar campos | Gestionar campos |
| Grupos de campos | Grupos de campos |
| Informações Gerais | Información general |
| Pesquisar campos... | Buscar campos... |
| Clique aqui para adicionar | Haz clic aquí para agregar |
| Campos de contato | Campos de contacto |
| Campos de empresa | Campos de empresa |
| Campos de negócio | Campos de negocio |
| Nome | Nombre |
| Telefone | Teléfono |
| Email | Email |
| Valor | Valor |
| Nome da empresa | Nombre de la empresa |
| Site | Sitio web |
| Cidade | Ciudad |
| Estado | Estado |
| Categoria | Categoría |
| Segmento | Segmento |
| Número de funcionários | Número de empleados |
| CNPJ | CNPJ |
| Sim | Sí |
| Não | No |
| Abra as conversas sem marcá-las como lidas. | Abre las conversaciones sin marcarlas como leídas. |
| Ativar modo espião | Activar modo espía |
| sessões | sesiones |
| Este contato não possui conversas no atendimento | Este contacto no tiene conversaciones en la atención |
| Selecione uma conversa | Selecciona una conversación |
| Escolha uma conversa ao lado para ver as mensagens. | Elige una conversación al lado para ver los mensajes. |
| Pesquisar... | Buscar... |
| Data | Fecha |
| Tipo de arquivo | Tipo de archivo |
| Novo arquivo | Nuevo archivo |
| Arquivo | Archivo |
| Data de upload | Fecha de carga |
| Usuário | Usuario |
| Nenhum arquivo encontrado | Ningún archivo encontrado |
| Envie arquivos para mantê-los junto deste contato. | Envía archivos para mantenerlos junto a este contacto. |
| Próximo negócio | Próximo negocio |
| Negócio anterior | Negocio anterior |
| Etapa do próximo negócio | Etapa del próximo negocio |
| O próximo negócio leva em consideração a ordem e os filtros atuais da listagem de negócios. | El próximo negocio tiene en cuenta el orden y los filtros actuales del listado de negocios. |
| Não existem próximos negócios nesta etapa. | No hay próximos negocios en esta etapa. |
| Não existem negócios anteriores nesta etapa. | No hay negocios anteriores en esta etapa. |

Rode `corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/escale-espanhol-registro-tu.test.ts` e o typecheck. Expected: PASS. Commit `feat(escale): espanhol da ficha do negócio (PR A)`.

- [ ] **Step 2: A rodada cheia, em segundo plano (G1).** Os mesmos comandos da 1F-a (Task 5, Step 2), com os logs `1g-pra-*`. Enquanto rodam, faça os Steps 3 e 4. Depois, a comparação com `.superpowers/sdd/falhas-conhecidas.txt` (mesmo script da 1F-a). Expected: `novas: 0`, gates rápidos com `rapidos=0`, `test:db` verde (as duas lentas conhecidas podem falhar na rodada cheia e passam sozinhas).

- [ ] **Step 3: Conferência visual** (contrato, CAMINHO A ou B). Com a casca ligada, abra um negócio pelo card, pelo Recente e pelo endereço `/app/leads/<id>`; compare cada aba com os prints 01 a 07 e o topo com o 11, e escreva a lista das diferenças que sobram (as já previstas: coluna "Dias", "?" do detalhe, chip "Em aberto" de Conversas, origem e ícones por tipo no Histórico, tooltip com foto na seta). Sem a casca: o card abre o dossiê lateral; `/app/negocios/<id>` volta ao quadro com o dossiê aberto. Com CAMINHO B, o PR registra "conferência visual pendente: depois do deploy".

- [ ] **Step 4: PRD.** Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`, seção 8, na linha `| 1G |`, troque a última coluna por `PR A aberto (página, abas e próximo negócio); PR B a seguir (cabeçalho e ações)`.

- [ ] **Step 5: Push e PR A.**

```bash
git push -u escale-crm feat/fase-1g-ficha-do-negocio
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-1g-ficha-do-negocio --title "feat(escale): Fase 1G (A) — o negócio em tela própria, igual à Clint" --body-file .superpowers/sdd/1g-pra-pr.md
```

Corpo: o Goal (parte da página); as decisões N1 a N4, N11, N12, N14 e G1; o que fica para o PR B; os desvios previstos (Step 3); as perguntas Q1 a Q14; os prints que faltam; a conferência visual; a verificação (por task e a rodada cheia). Termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Mostre a URL ao usuário e PARE. O PR B só começa depois do merge do PR A, com o "pode fazer" do usuário.

---

# PR B — O cabeçalho e as ações

### Task 8: Branch do PR B, ações rápidas (C3), o ⋮ (C6) e o contador (C7)

**Files:**
- Create: `components/escale/negocio/AcoesDaFicha.tsx`, `components/escale/negocio/MenuDaFicha.tsx`, `components/escale/negocio/ContadorDeNegocios.tsx`, `tests/unit/escale-ficha-acoes-e-menu.test.tsx`
- Modify: `components/escale/negocio/FichaDoNegocio.tsx`, `tests/unit/escale-ficha-do-negocio.test.tsx`

**Interfaces:**
- Consumes: `usePermission("pipeline.move_card")`, `useBulkAction(pipelineId)` (`{ mutate, isPending }`, a mesma exclusão do ⋮ do card), `NewLeadDialog` (com `contactId`), `MoveToOtherPipelineDialog`, `CAIXA_DO_MENU`/`ITEM_DO_MENU` (`components/escale/quadro/estilos-do-menu.ts`).
- Produces: `AcoesDaFicha({ lead })`, `MenuDaFicha({ lead, pipelineId, stages, leads })`, `ContadorDeNegocios({ total, contatoId })`.

**Detalhes visuais (prints 01, 09 e 017):** linha de 48px; ícones de 16px na cor da marca a cada 32px (ligar, conversa, e-mail, agendar, nota, lembretes); "+ Adicionar tags" 12–13px depois de um respiro. ⋮ (print 09): caixa sem borda com a sombra do menu da casca; itens com ícone de 14px: Visualizar contato, Novo negócio, Mudar origem, Nova nota, separador, Excluir em vermelho. Contador (01-017): "3 Negócios" em botão pequeno com fundo `casca-marca-suave` e texto `casca-marca`, à esquerda do status. A confirmação de Excluir não tem print: usa o `AlertDialog` do original com o texto da Clint (print que falta 5).

- [ ] **Step 1: A base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
git status --porcelain    # Expected: vazio.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:app/app/negocios/[id]/page.tsx && echo "PR A ok"
git cat-file -e escale-crm/main:components/escale/negocio/ProximoNegocio.tsx && echo "próximo ok"
git switch -c feat/fase-1g-cabecalho-e-acoes escale-crm/main
```
Expected: `PR A ok` e `próximo ok`. Senão, PARE.

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-ficha-acoes-e-menu.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ push: vi.fn(), busca: "st=open" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.busca),
}));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const permissao = vi.hoisted(() => ({ pode: true }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => permissao.pode }));
const lote = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/hooks/kanban/useBulkAction", () => ({ useBulkAction: () => ({ mutate: lote.mutate, isPending: false }) }));
vi.mock("@/components/kanban/NewLeadDialog", () => ({
  NewLeadDialog: ({ open, contactId }: { open: boolean; contactId?: string | null }) =>
    open ? <p>novo negócio para {contactId}</p> : null,
}));
vi.mock("@/components/kanban/MoveToOtherPipelineDialog", () => ({
  MoveToOtherPipelineDialog: ({ open }: { open: boolean }) => (open ? <p>levar para outra origem</p> : null),
}));

import { AcoesDaFicha } from "@/components/escale/negocio/AcoesDaFicha";
import { ContadorDeNegocios } from "@/components/escale/negocio/ContadorDeNegocios";
import { MenuDaFicha } from "@/components/escale/negocio/MenuDaFicha";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G (C3, C6, C7; prints 01, 09 e 017). */
const LEAD = {
  id: "n1",
  contact_id: "c1",
  title: "Ana",
  contact_phone: "+5543998031566",
  contact_email: "",
  conversa: { id: "cv1", preview: null, last_message_at: null, unread: 0 },
} as unknown as Lead;

beforeEach(() => {
  nav.push.mockReset();
  lote.mutate.mockReset();
  permissao.pode = true;
});

describe("ações rápidas (C3)", () => {
  it("ligar, conversa e e-mail funcionam quando há dado; sem e-mail, o ícone apagado", () => {
    render(<AcoesDaFicha lead={LEAD} />);
    expect(screen.getByRole("link", { name: "Ligar" })).toHaveAttribute("href", "tel:+5543998031566");
    expect(screen.getByRole("link", { name: "Enviar Whatsapp" })).toHaveAttribute("href", "/app/inbox?id=cv1");
    expect(screen.getByRole("img", { name: "Sem e-mail" })).toBeInTheDocument();
  });

  it("agendar, nota, lembretes e tags: no lugar, desligados com 'Em breve'", () => {
    render(<AcoesDaFicha lead={LEAD} />);
    for (const nome of ["Agendar", "Nova nota", "Lembretes", "Adicionar tags"]) {
      const b = screen.getByRole("button", { name: nome });
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", "Em breve");
    }
  });
});

describe("o ⋮ do cabeçalho (C6, print 09)", () => {
  const abrir = async () => {
    render(<MenuDaFicha lead={LEAD} pipelineId="o1" stages={[]} leads={[]} />);
    await userEvent.click(screen.getByRole("button", { name: "Ações do negócio" }));
  };

  it("os cinco itens da Clint, na ordem", async () => {
    await abrir();
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Visualizar contato",
      "Novo negócio",
      "Mudar origem",
      "Nova nota",
      "Excluir",
    ]);
    expect(screen.getByRole("menuitem", { name: "Visualizar contato" })).toHaveAttribute("href", "/app/contacts/c1");
    expect(screen.getByRole("menuitem", { name: "Nova nota" })).toHaveAttribute("aria-disabled", "true");
  });

  it("Novo negócio abre o do original já com o contato; Mudar origem, a janela de levar", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("menuitem", { name: "Novo negócio" }));
    expect(screen.getByText("novo negócio para c1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ações do negócio" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Mudar origem" }));
    expect(screen.getByText("levar para outra origem")).toBeInTheDocument();
  });

  it("Excluir pede confirmação com o texto da Clint e volta ao quadro com os filtros", async () => {
    lote.mutate.mockImplementation((_corpo: unknown, opcoes: { onSuccess: () => void }) => opcoes.onSuccess());
    await abrir();
    await userEvent.click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(screen.getByText("Tem certeza que deseja excluir este negócio?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(lote.mutate).toHaveBeenCalledWith({ action: "delete", lead_ids: ["n1"], params: {} }, expect.anything());
    expect(nav.push).toHaveBeenCalledWith("/app/pipelines/o1?st=open");
  });

  it("sem permissão de escrita: só Visualizar contato e Nova nota", async () => {
    permissao.pode = false;
    await abrir();
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Visualizar contato", "Nova nota"]);
  });
});

describe("contador 'N Negócios' (C7)", () => {
  it("só com mais de um, e leva ao contato", () => {
    const { rerender } = render(<ContadorDeNegocios total={1} contatoId="c1" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    rerender(<ContadorDeNegocios total={3} contatoId="c1" />);
    expect(screen.getByRole("link", { name: "3 Negócios" })).toHaveAttribute("href", "/app/contacts/c1");
  });
});
```

Rode e veja falhar.

- [ ] **Step 3: As ações**

Create `components/escale/negocio/AcoesDaFicha.tsx`:

```tsx
"use client";
import Link from "next/link";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { Lead } from "@/lib/types/leads";
import { Bell, Calendar, Mail, MessageCircle, Phone, Plus, StickyNote } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * AS AÇÕES RÁPIDAS DA FICHA (fork Escale, Fase 1G, C3; print 01).
 *
 * Ligar, conversa e e-mail funcionam como na capa do card (1E); sem o dado, o
 * ícone fica apagado. Agendar e lembretes são atividades (1I); nota é 1H (C15);
 * tags são do contato (1H, C10). Dicas: Q11.
 */
const ICONE = "grid size-7 place-items-center rounded-casca-gatilho text-casca-marca hover:bg-casca-raia [&_svg]:size-4";
const APAGADO = "grid size-7 place-items-center rounded-casca-gatilho text-casca-marca opacity-40 [&_svg]:size-4";
const EM_BREVE = "text-casca-marca disabled:pointer-events-auto disabled:cursor-not-allowed";

export function AcoesDaFicha({ lead }: { lead: Lead }) {
  const t = useT();
  const telefone = lead.contact_phone?.trim() || null;
  const email = lead.contact_email?.trim() || null;
  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-casca-borda px-6">
      {telefone ? (
        <a href={`tel:${telefone}`} aria-label={t("Ligar")} title={t("Ligar")} className={ICONE}>
          <Phone aria-hidden />
        </a>
      ) : (
        <span role="img" aria-label={t("Sem telefone")} title={t("Sem telefone")} className={APAGADO}>
          <Phone aria-hidden />
        </span>
      )}
      {lead.conversa ? (
        <Link href={`/app/inbox?id=${lead.conversa.id}`} aria-label={t("Enviar Whatsapp")} title={t("Enviar Whatsapp")} className={ICONE}>
          <MessageCircle aria-hidden />
        </Link>
      ) : (
        <span role="img" aria-label={t("Sem conversa")} title={t("Sem conversa")} className={APAGADO}>
          <MessageCircle aria-hidden />
        </span>
      )}
      {email ? (
        <a href={`mailto:${email}`} aria-label={t("Enviar Email")} title={t("Enviar Email")} className={ICONE}>
          <Mail aria-hidden />
        </a>
      ) : (
        <span role="img" aria-label={t("Sem e-mail")} title={t("Sem e-mail")} className={APAGADO}>
          <Mail aria-hidden />
        </span>
      )}
      <BotaoDaCasca variante="icone" disabled title={t("Em breve")} aria-label={t("Agendar")} className={EM_BREVE}>
        <Calendar aria-hidden />
      </BotaoDaCasca>
      <BotaoDaCasca variante="icone" disabled title={t("Em breve")} aria-label={t("Nova nota")} className={EM_BREVE}>
        <StickyNote aria-hidden />
      </BotaoDaCasca>
      <BotaoDaCasca variante="icone" disabled title={t("Em breve")} aria-label={t("Lembretes")} className={EM_BREVE}>
        <Bell aria-hidden />
      </BotaoDaCasca>
      <BotaoDaCasca
        variante="texto"
        tamanho="sm"
        disabled
        title={t("Em breve")}
        className={cn("ml-6 text-casca-texto-2", "disabled:pointer-events-auto disabled:cursor-not-allowed")}
      >
        <Plus aria-hidden />
        {t("Adicionar tags")}
      </BotaoDaCasca>
    </div>
  );
}
```

- [ ] **Step 4: O ⋮ e o contador**

Create `components/escale/negocio/MenuDaFicha.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { MoveToOtherPipelineDialog } from "@/components/kanban/MoveToOtherPipelineDialog";
import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useBulkAction } from "@/hooks/kanban/useBulkAction";
import { rotaDoQuadro } from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { ArrowRightLeft, Briefcase, EllipsisVertical, StickyNote, Trash2, User } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O ⋮ DO CABEÇALHO DA FICHA (fork Escale, Fase 1G, C6; print 09).
 *
 * Novo negócio, Mudar origem e Excluir pedem a mesma permissão do ⋮ do card
 * (`pipeline.move_card`, agent ou acima); sem ela, nem aparecem (a Clint
 * esconde Excluir sem `DEAL_DELETE`). Mudar origem é o "Levar para outro funil"
 * do original (Q9). Excluir é a mesma ação em lote do card e volta ao quadro.
 */
const ITEM_VERMELHO = cn(
  ITEM_DO_MENU,
  "text-casca-alerta hover:text-casca-alerta focus-visible:text-casca-alerta data-[highlighted]:text-casca-alerta",
);

export function MenuDaFicha({
  lead,
  pipelineId,
  stages,
  leads,
}: {
  lead: Lead;
  pipelineId: string;
  stages: Stage[];
  leads: Lead[];
}) {
  const t = useT();
  const router = useRouter();
  const busca = useSearchParams();
  const podeEscrever = usePermission("pipeline.move_card");
  const lote = useBulkAction(pipelineId);
  const [novo, setNovo] = useState(false);
  const [mudar, setMudar] = useState(false);
  const [excluir, setExcluir] = useState(false);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <BotaoDaCasca variante="icone" aria-label={t("Ações do negócio")}>
            <EllipsisVertical aria-hidden />
          </BotaoDaCasca>
        </DropdownMenuTrigger>
        <MenuPrimitive.Portal>
          <MenuPrimitive.Content align="end" sideOffset={8} className={CAIXA_DO_MENU}>
            {lead.contact_id ? (
              <MenuPrimitive.Item asChild className={ITEM_DO_MENU}>
                <Link href={`/app/contacts/${lead.contact_id}`}>
                  <User size={14} aria-hidden />
                  {t("Visualizar contato")}
                </Link>
              </MenuPrimitive.Item>
            ) : (
              <MenuPrimitive.Item disabled title={t("Sem contato")} className={ITEM_DO_MENU}>
                <User size={14} aria-hidden />
                {t("Visualizar contato")}
              </MenuPrimitive.Item>
            )}
            {podeEscrever ? (
              <MenuPrimitive.Item className={ITEM_DO_MENU} onSelect={() => setNovo(true)}>
                <Briefcase size={14} aria-hidden />
                {t("Novo negócio")}
              </MenuPrimitive.Item>
            ) : null}
            {podeEscrever ? (
              <MenuPrimitive.Item className={ITEM_DO_MENU} onSelect={() => setMudar(true)}>
                <ArrowRightLeft size={14} aria-hidden />
                {t("Mudar origem")}
              </MenuPrimitive.Item>
            ) : null}
            <MenuPrimitive.Item disabled title={t("Em breve")} className={ITEM_DO_MENU}>
              <StickyNote size={14} aria-hidden />
              {t("Nova nota")}
            </MenuPrimitive.Item>
            {podeEscrever ? (
              <>
                <MenuPrimitive.Separator className="my-1 h-px bg-casca-borda" />
                <MenuPrimitive.Item className={ITEM_VERMELHO} onSelect={() => setExcluir(true)}>
                  <Trash2 size={14} aria-hidden />
                  {t("Excluir")}
                </MenuPrimitive.Item>
              </>
            ) : null}
          </MenuPrimitive.Content>
        </MenuPrimitive.Portal>
      </DropdownMenu>

      <NewLeadDialog open={novo} onOpenChange={setNovo} pipelineId={pipelineId} stages={stages} contactId={lead.contact_id} leads={leads} />
      <MoveToOtherPipelineDialog open={mudar} onOpenChange={setMudar} leadId={lead.id} pipelineId={pipelineId} />
      <AlertDialog open={excluir} onOpenChange={setExcluir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Excluir")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Tem certeza que deseja excluir este negócio?")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={lote.isPending}
              onClick={(e) => {
                // Quem fecha é o sucesso (o mesmo cuidado do ⋮ do card).
                e.preventDefault();
                lote.mutate(
                  { action: "delete", lead_ids: [lead.id], params: {} },
                  {
                    onSuccess: () => {
                      setExcluir(false);
                      router.push(rotaDoQuadro(pipelineId, busca.toString()));
                    },
                  },
                );
              }}
            >
              {t("Excluir")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

> O `AlertDialogTitle` "Excluir" tem o mesmo nome do botão de confirmar; o teste procura o **botão** "Excluir" depois do menu fechar. Se o Testing Library achar dois botões com o nome (o item do menu continua montado), troque no teste por `screen.getAllByRole("button", { name: "Excluir" }).at(-1)!`.

Create `components/escale/negocio/ContadorDeNegocios.tsx`:

```tsx
"use client";
import Link from "next/link";

import { useT } from "@/hooks/i18n/useT";
import { deveMostrarContador } from "@/lib/escale/negocio/regras";

/**
 * "N NEGÓCIOS" DO CONTATO (fork Escale, Fase 1G, C7; 01-017). Só com mais de um
 * (Clint `Ue>1`); leva à página do contato (a Clint abre uma gaveta, Q8).
 */
export function ContadorDeNegocios({ total, contatoId }: { total: number; contatoId: string | null }) {
  const t = useT();
  if (!contatoId || !deveMostrarContador(total)) return null;
  return (
    <Link
      href={`/app/contacts/${contatoId}`}
      className="inline-flex h-8 items-center rounded-md bg-casca-marca-suave px-3 text-[13px] font-medium text-casca-marca hover:bg-casca-marca-media"
    >
      {total} {t("Negócios")}
    </Link>
  );
}
```

- [ ] **Step 5: Na ficha**

Em `components/escale/negocio/FichaDoNegocio.tsx`:
- acrescente os imports `import { AcoesDaFicha } from "./AcoesDaFicha";`, `import { ContadorDeNegocios } from "./ContadorDeNegocios";`, `import { MenuDaFicha } from "./MenuDaFicha";`;
- troque `export function FichaDoNegocio({ negocioId, origem, grupo }: FichaDoNegocioProps) {` por `export function FichaDoNegocio({ negocioId, origem, grupo, negociosDoContato }: FichaDoNegocioProps) {`;
- troque `      <CabecalhoDaFicha lead={ficha.lead} />` por:
  ```tsx
        <CabecalhoDaFicha
          lead={ficha.lead}
          // C7 e C6 (a Task 9 põe o status e o dono entre os dois).
          direita={
            <>
              <ContadorDeNegocios total={negociosDoContato} contatoId={ficha.lead.contact_id} />
              <MenuDaFicha lead={ficha.lead} pipelineId={origem.id} stages={ficha.stages} leads={ficha.leadsDoRecorte} />
            </>
          }
        />
        {/* C3: as ações rápidas e as tags. */}
        <AcoesDaFicha lead={ficha.lead} />
  ```
- em `tests/unit/escale-ficha-do-negocio.test.tsx`, acrescente os mocks `vi.mock("@/components/escale/negocio/MenuDaFicha", () => ({ MenuDaFicha: () => <span data-testid="menu" /> }));` e `vi.mock("@/components/escale/negocio/AcoesDaFicha", () => ({ AcoesDaFicha: () => <span data-testid="acoes" /> }));`, e no caso do cabeçalho `expect(screen.getByTestId("menu")).toBeInTheDocument(); expect(screen.getByTestId("acoes")).toBeInTheDocument();`.

- [ ] **Step 6: Verificar (G1) e commit**

```bash
corepack pnpm vitest run tests/unit/escale-ficha-acoes-e-menu.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/negocio tests/unit/escale-ficha-acoes-e-menu.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
```
Mais `controle-decorativo`, `tailwind-tokens`, `vocabulario-do-funil`. Expected: PASS. Controlador confere e compara com os prints 01, 09 e 017.

```bash
git add components/escale/negocio tests/unit/escale-ficha-acoes-e-menu.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
git commit -m "feat(escale): ações rápidas, menu ⋮ e contador de negócios no cabeçalho da ficha

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Status Aberto/Ganho/Perdido com o motivo (C4) e o dono (C5)

**Files:**
- Create: `components/escale/negocio/StatusDaFicha.tsx`, `components/escale/negocio/DonoDaFicha.tsx`, `tests/unit/escale-ficha-status-e-dono.test.tsx`
- Modify: `app/escale-tema.css`, `components/escale/negocio/FichaDoNegocio.tsx`, `tests/unit/escale-ficha-do-negocio.test.tsx`

**Interfaces:**
- Consumes: `useWinLead`, `useLoseLead`, `useEditLead` (`hooks/kanban/useUpdateLead.ts`), `useMoveCard(pipelineId, { onRetomada })`, `RetomarComoNovoNegocioDialog` (`components/kanban/`), `useMotivosDePerdaDoFunil(pipelineId)` (1F: só os ativos), `useAssignableMembers`, `useAssignableAgents`, `resolveLeadOwner`, `corDoAvatar`, `inicialDoNome`, `etapaParaReabrir`.
- Produces: `StatusDaFicha({ lead, stages, pipelineId })`, `DonoDaFicha({ lead, pipelineId })`.

**Detalhes visuais (prints 01, 08, 10 e 017):** ver "Medidas". Status: fechado 64×32 (⊖ cinza + ▾); aberto, borda da marca e "⊖ Aberto ⌃" na cor da marca; menu com Aberto (marca), Ganho (verde), Perdido (vermelho), o atual com ✓ e fundo `casca-raia`. Perdido: ao lado, o seletor do motivo (240px, "Selecione o motivo da perda"). **Desvios:** a Clint abre o seletor do motivo já aberto (`defaultOpen`); o `SeletorDaCasca` não tem essa opção e abre no clique; o rótulo recolhe na hora (a Clint espera 3s). Dono: círculo de 32px com a inicial (cor por pessoa, como no card); agente com borda da marca; sem dono, silhueta cinza.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-status-e-dono.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const permissao = vi.hoisted(() => ({ pode: true }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => permissao.pode }));
const grava = vi.hoisted(() => ({ ganhar: vi.fn(), perder: vi.fn(), editar: vi.fn(), mover: vi.fn() }));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({
  useWinLead: () => ({ mutate: grava.ganhar, isPending: false }),
  useLoseLead: () => ({ mutate: grava.perder, isPending: false }),
  useEditLead: () => ({ mutate: grava.editar, isPending: false }),
}));
vi.mock("@/hooks/kanban/useMoveCard", () => ({ useMoveCard: () => ({ mutate: grava.mover, isPending: false }) }));
vi.mock("@/hooks/kanban/useMotivosDePerdaDoFunil", () => ({ useMotivosDePerdaDoFunil: () => ["Preço", "Sem retorno"] }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u1", full_name: "Camilly Victória" }, { user_id: "u2", full_name: "Henrique" }] }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({
  useAssignableAgents: () => ({ data: [{ agent_id: "a1", name: "Kaio IA", version_number: 3 }] }),
}));
vi.mock("@/components/kanban/RetomarComoNovoNegocioDialog", () => ({ RetomarComoNovoNegocioDialog: () => null }));

import { DonoDaFicha } from "@/components/escale/negocio/DonoDaFicha";
import { StatusDaFicha } from "@/components/escale/negocio/StatusDaFicha";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1G (C4, C5; prints 08 e 10): status e dono no cabeçalho, sobre o motor do original. */
const ETAPAS = [
  { id: "e1", position: 1, is_won: false, is_lost: false, is_archived: false },
  { id: "e2", position: 2, is_won: false, is_lost: false, is_archived: false },
  { id: "g", position: 9, is_won: true, is_lost: false, is_archived: false },
  { id: "p", position: 10, is_won: false, is_lost: true, is_archived: false },
] as Stage[];
const ABERTO = {
  id: "n1",
  status: "open",
  lost_reason: null,
  updated_at: "2026-10-14T10:00:00Z",
  owner_user_id: "u1",
  owner_agent_id: null,
  owner_kind: "user",
} as unknown as Lead;

beforeEach(() => {
  for (const f of Object.values(grava)) f.mockReset();
  permissao.pode = true;
});

describe("status (C4)", () => {
  it("o menu da Clint: Aberto (atual), Ganho e Perdido; Ganho grava o ganho", async () => {
    render(<StatusDaFicha lead={ABERTO} stages={ETAPAS} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Status do negócio" }));
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Aberto", "Ganho", "Perdido"]);
    await userEvent.click(screen.getByRole("menuitem", { name: "Ganho" }));
    expect(grava.ganhar).toHaveBeenCalledWith({ leadId: "n1" });
  });

  it("Perdido pede o motivo ao lado e só grava ao escolher", async () => {
    render(<StatusDaFicha lead={ABERTO} stages={ETAPAS} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Status do negócio" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Perdido" }));
    expect(grava.perder).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("combobox", { name: "Selecione o motivo da perda" }));
    await userEvent.click(screen.getByRole("option", { name: "Preço" }));
    expect(grava.perder).toHaveBeenCalledWith({ leadId: "n1", lostReason: "Preço" }, expect.anything());
  });

  it("perdido: mostra 'Perdido' e o motivo (desligado, Q4); Aberto reabre na primeira etapa aberta", async () => {
    const perdido = { ...ABERTO, status: "lost", lost_reason: "Preço" } as Lead;
    render(<StatusDaFicha lead={perdido} stages={ETAPAS} pipelineId="o1" />);
    expect(screen.getByRole("button", { name: "Status do negócio" })).toHaveTextContent("Perdido");
    expect(screen.getByRole("combobox", { name: "Selecione o motivo da perda" })).toHaveTextContent("Preço");
    await userEvent.click(screen.getByRole("button", { name: "Status do negócio" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Aberto" }));
    expect(grava.mover).toHaveBeenCalledWith({
      leadId: "n1",
      stageId: "e1",
      positionInStage: 0,
      expectedUpdatedAt: "2026-10-14T10:00:00Z",
    });
  });

  it("ganho reabre na última etapa aberta (Q3)", async () => {
    render(<StatusDaFicha lead={{ ...ABERTO, status: "won" } as Lead} stages={ETAPAS} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Status do negócio" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Aberto" }));
    expect(grava.mover).toHaveBeenCalledWith(expect.objectContaining({ stageId: "e2" }));
  });

  it("sem permissão: desligado, com o texto da Clint", () => {
    permissao.pode = false;
    render(<StatusDaFicha lead={ABERTO} stages={ETAPAS} pipelineId="o1" />);
    const gatilho = screen.getByRole("button", { name: "Status do negócio" });
    expect(gatilho).toBeDisabled();
    expect(gatilho).toHaveAttribute("title", "As permissões de usuários não permitem você trocar de status.");
  });
});

describe("dono (C5, print 10)", () => {
  const abrir = async (lead: Lead = ABERTO) => {
    render(<DonoDaFicha lead={lead} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Alterar usuário" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Selecione um usuário" }));
  };

  it("'Alterar usuário' com pessoas e agentes; trocar de pessoa grava o dono", async () => {
    await abrir();
    expect(screen.getByText("Alterar usuário", { selector: "h5" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: "Henrique" }));
    expect(grava.editar).toHaveBeenCalledWith({ leadId: "n1", patch: { owner_user_id: "u2" } });
  });

  it("agente de IA e 'Sem responsável' (Q5)", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("option", { name: "Kaio IA" }));
    expect(grava.editar).toHaveBeenCalledWith({ leadId: "n1", patch: { owner_agent_id: "a1" } });
  });

  it("sem permissão: o círculo desligado com o texto da Clint", () => {
    permissao.pode = false;
    render(<DonoDaFicha lead={ABERTO} pipelineId="o1" />);
    const gatilho = screen.getByRole("button", { name: "Alterar usuário" });
    expect(gatilho).toBeDisabled();
    expect(gatilho).toHaveAttribute("title", "As permissões de usuários não permitem você trocar de dono");
  });
});
```

Rode e veja falhar.

> O `SeletorDaCasca` expõe o gatilho como `combobox` com o `aria-label` (o teste da 1F, `escale-secao-campos.test.tsx`, usa o mesmo papel). Se o nome acessível sair diferente, ajuste o teste ao DOM, não o componente.

- [ ] **Step 2: As cores do status**

Em `app/escale-tema.css`, no último bloco `body:has([data-escale-casca]) {` (o da 1F, com `--escale-prazo-*`), logo DEPOIS de `  --escale-alternancia-ativa: #597eff; /* medido, P12 */`, acrescente:

```css
  /* Fase 1G (N7, Q10): Ganho e Perdido do cabeçalho do negócio. Valores do
     Chakra v3 por trás de green.fg/red.fg (código da Clint); conferir no print
     08 de 17/10 com conta-gotas. */
  --escale-status-ganho: #116932;
  --escale-status-perdido: #991919;
```

E no bloco escuro correspondente (`[data-theme="dark"] body:has([data-escale-casca])` logo abaixo, se existir para as `--escale-prazo-*`; se não existir, não crie): `--escale-status-ganho: #86efac;` e `--escale-status-perdido: #fca5a5;` (derivados, sem print escuro da Clint).

- [ ] **Step 3: O status**

Create `components/escale/negocio/StatusDaFicha.tsx`:

```tsx
"use client";
import { useState } from "react";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { RetomarComoNovoNegocioDialog } from "@/components/kanban/RetomarComoNovoNegocioDialog";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useMotivosDePerdaDoFunil } from "@/hooks/kanban/useMotivosDePerdaDoFunil";
import { useMoveCard, type RetomadaPendente } from "@/hooks/kanban/useMoveCard";
import { useLoseLead, useWinLead } from "@/hooks/kanban/useUpdateLead";
import { etapaParaReabrir, type StatusDoNegocio } from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { Check, ChevronDown, ChevronUp, CircleCheck, CircleMinus, CircleX, type LucideIcon } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O STATUS NO CABEÇALHO DA FICHA (fork Escale, Fase 1G, C4; prints 01 e 08).
 *
 * Sobre o motor do original (N6, regra 4 do roteiro): Ganho = `POST /win`;
 * Perdido = escolher o motivo ao lado e só então `POST /lose`; Aberto num
 * negócio fechado = mover para uma etapa aberta (Q3), com a janela "Retomar
 * como novo negócio" quando a origem pede. Erros caem no aviso de sempre
 * (`showApiError`), inclusive o de campo obrigatório ao ganhar ou perder.
 */
const STATUS: ReadonlyArray<{ valor: StatusDoNegocio; rotulo: string; Icone: LucideIcon; cor: string; item: string }> = [
  {
    valor: "open",
    rotulo: "Aberto",
    Icone: CircleMinus,
    cor: "text-casca-marca",
    item: "text-casca-marca hover:text-casca-marca data-[highlighted]:text-casca-marca",
  },
  {
    valor: "won",
    rotulo: "Ganho",
    Icone: CircleCheck,
    cor: "text-(--escale-status-ganho)",
    item: "text-(--escale-status-ganho) hover:text-(--escale-status-ganho) data-[highlighted]:text-(--escale-status-ganho)",
  },
  {
    valor: "lost",
    rotulo: "Perdido",
    Icone: CircleX,
    cor: "text-(--escale-status-perdido)",
    item: "text-(--escale-status-perdido) hover:text-(--escale-status-perdido) data-[highlighted]:text-(--escale-status-perdido)",
  },
];

export function StatusDaFicha({ lead, stages, pipelineId }: { lead: Lead; stages: Stage[]; pipelineId: string }) {
  const t = useT();
  const pode = usePermission("pipeline.move_card");
  const ganhar = useWinLead(pipelineId);
  const perder = useLoseLead(pipelineId);
  const [retomada, setRetomada] = useState<RetomadaPendente | null>(null);
  const mover = useMoveCard(pipelineId, { onRetomada: setRetomada });
  const motivos = useMotivosDePerdaDoFunil(pipelineId);
  const [aberto, setAberto] = useState(false);
  const [pairando, setPairando] = useState(false);
  const [pedindoMotivo, setPedindoMotivo] = useState(false);
  const atual = STATUS.find((s) => s.valor === lead.status) ?? STATUS[0]!;
  const expandido = aberto || pairando || lead.status !== "open";
  const ocupado = ganhar.isPending || perder.isPending || mover.isPending;

  const escolher = (novo: StatusDoNegocio) => {
    setAberto(false);
    if (novo === "lost") {
      if (lead.status !== "lost") setPedindoMotivo(true);
      return;
    }
    setPedindoMotivo(false);
    if (novo === lead.status) return;
    if (novo === "won") {
      ganhar.mutate({ leadId: lead.id });
      return;
    }
    const etapa = etapaParaReabrir(stages, lead.status);
    if (etapa) mover.mutate({ leadId: lead.id, stageId: etapa, positionInStage: 0, expectedUpdatedAt: lead.updated_at });
  };

  const perdido = lead.status === "lost";
  const opcoesDoMotivo = [...new Set([...(lead.lost_reason ? [lead.lost_reason] : []), ...motivos])].map((m) => ({
    valor: m,
    rotulo: m,
  }));

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu modal={false} open={aberto} onOpenChange={setAberto}>
        <DropdownMenuTrigger asChild disabled={!pode || ocupado}>
          <button
            type="button"
            aria-label={t("Status do negócio")}
            title={pode ? undefined : t("As permissões de usuários não permitem você trocar de status.")}
            onMouseEnter={() => setPairando(true)}
            onMouseLeave={() => setPairando(false)}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md border px-2.5 text-[11px] disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60",
              aberto ? "border-casca-marca" : "border-casca-borda",
              expandido ? atual.cor : "text-casca-suave",
            )}
          >
            <atual.Icone size={14} aria-hidden />
            {expandido ? <span className="min-w-[44px] text-left">{t(atual.rotulo)}</span> : null}
            {aberto ? (
              <ChevronUp size={14} aria-hidden className="text-casca-texto" />
            ) : (
              <ChevronDown size={14} aria-hidden className="text-casca-texto" />
            )}
          </button>
        </DropdownMenuTrigger>
        <MenuPrimitive.Portal>
          <MenuPrimitive.Content align="end" sideOffset={8} className={cn(CAIXA_DO_MENU, "min-w-[118px]")}>
            {STATUS.map((s) => (
              <MenuPrimitive.Item
                key={s.valor}
                className={cn(ITEM_DO_MENU, s.item, s.valor === lead.status && "bg-casca-raia")}
                onSelect={() => escolher(s.valor)}
              >
                <s.Icone size={14} aria-hidden />
                {t(s.rotulo)}
                {s.valor === lead.status ? <Check size={14} aria-hidden className="ml-auto" /> : null}
              </MenuPrimitive.Item>
            ))}
          </MenuPrimitive.Content>
        </MenuPrimitive.Portal>
      </DropdownMenu>
      {pedindoMotivo || perdido ? (
        <SeletorDaCasca
          aparencia="janela"
          className="w-60"
          valor={perdido ? (lead.lost_reason ?? "") : ""}
          opcoes={opcoesDoMotivo}
          vazio={t("Selecione o motivo da perda")}
          vazioSoNoGatilho
          aria-label={t("Selecione o motivo da perda")}
          desabilitado={perdido || perder.isPending}
          dica={perdido ? t("Para trocar o motivo, reabra o negócio.") : undefined}
          aoMudar={(motivo) => {
            if (motivo) perder.mutate({ leadId: lead.id, lostReason: motivo }, { onSuccess: () => setPedindoMotivo(false) });
          }}
        />
      ) : null}
      {retomada ? (
        <RetomarComoNovoNegocioDialog
          open
          onOpenChange={(v: boolean) => !v && setRetomada(null)}
          leadId={retomada.leadId}
          stageId={retomada.stageId}
          pipelineId={pipelineId}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: O dono**

Create `components/escale/negocio/DonoDaFicha.tsx`:

```tsx
"use client";
import { useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";
import { resolveLeadOwner } from "@/lib/kanban/owner";
import type { Lead } from "@/lib/types/leads";
import { User } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O DONO NO CABEÇALHO DA FICHA (fork Escale, Fase 1G, C5; print 10).
 *
 * "Alterar usuário" com "Sem responsável", as pessoas e os agentes de IA (Q5).
 * Grava pelo mesmo `PATCH /api/v1/leads/[id]` do ⋮ do card. Sem a permissão
 * `pipeline.move_card`, o círculo fica desligado com o texto da Clint.
 */
export function DonoDaFicha({ lead, pipelineId }: { lead: Lead; pipelineId: string }) {
  const t = useT();
  const pode = usePermission("pipeline.move_card");
  const { data: membros } = useAssignableMembers(true);
  const { data: agentes } = useAssignableAgents(pode);
  const editar = useEditLead(pipelineId);
  const [aberto, setAberto] = useState(false);
  const nomes = new Map((membros ?? []).map((m) => [m.user_id, m.full_name]));
  const dono = resolveLeadOwner(lead, nomes);
  const valor = lead.owner_agent_id ? `a:${lead.owner_agent_id}` : lead.owner_user_id ? `u:${lead.owner_user_id}` : "nenhum";
  const opcoes = [
    { valor: "nenhum", rotulo: t("Sem responsável") },
    ...(membros ?? []).map((m) => ({ valor: `u:${m.user_id}`, rotulo: m.full_name ?? t("Sem nome"), grupo: t("Pessoas") })),
    ...(agentes ?? []).map((a) => ({ valor: `a:${a.agent_id}`, rotulo: a.name, grupo: t("Agentes de IA") })),
  ];

  const mudar = (v: string) => {
    setAberto(false);
    if (!v || v === valor) return;
    const patch =
      v === "nenhum"
        ? lead.owner_agent_id
          ? { owner_agent_id: null }
          : { owner_user_id: null }
        : v.startsWith("a:")
          ? { owner_agent_id: v.slice(2) }
          : { owner_user_id: v.slice(2) };
    editar.mutate({ leadId: lead.id, patch });
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("Alterar usuário")}
          disabled={!pode}
          title={pode ? (dono.name ?? t("Sem responsável")) : t("As permissões de usuários não permitem você trocar de dono")}
          className="rounded-full disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <CirculoDoDono id={lead.owner_user_id ?? lead.owner_agent_id} nome={dono.name} tipo={dono.kind} />
        </button>
      </PopoverTrigger>
      <PainelSuspenso align="end" sideOffset={8} className="w-[270px] p-3">
        <h5 className="mb-1 text-[11px] font-medium text-casca-texto">{t("Alterar usuário")}</h5>
        <SeletorDaCasca
          aparencia="janela"
          valor={valor}
          opcoes={opcoes}
          aoMudar={mudar}
          vazio={t("Selecione um usuário")}
          aria-label={t("Selecione um usuário")}
        />
      </PainelSuspenso>
    </Popover>
  );
}

function CirculoDoDono({ id, nome, tipo }: { id: string | null; nome: string | null; tipo: "user" | "ai" | null }) {
  if (!tipo) {
    return (
      <span aria-hidden className="grid size-8 place-items-center rounded-full bg-casca-cinza-selo text-white">
        <User size={16} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 place-items-center rounded-full text-[13px] font-semibold",
        tipo === "ai" ? "border border-casca-marca bg-surface text-casca-marca" : "text-white",
      )}
      style={tipo === "ai" ? undefined : { backgroundColor: corDoAvatar(id ?? nome ?? "?") }}
    >
      {inicialDoNome(nome)}
    </span>
  );
}
```

> `resolveLeadOwner(lead, nomes)` devolve `{ kind, name, … }` (`lib/kanban/owner.ts`). Se o tipo de `kind` for outro, ajuste a prop `tipo`. O `style` com `backgroundColor` é o mesmo do `AvatarDoDono` do card (`PecasDoCard.tsx`).

- [ ] **Step 5: Na ficha**

Em `components/escale/negocio/FichaDoNegocio.tsx`:
- acrescente `import { DonoDaFicha } from "./DonoDaFicha";` e `import { StatusDaFicha } from "./StatusDaFicha";`;
- no `direita` do `CabecalhoDaFicha`, troque o comentário `// C7 e C6 (a Task 9 põe o status e o dono entre os dois).` por `// C7, C4, C5 e C6, na ordem da Clint (01-017 e print 01).` e, entre o `<ContadorDeNegocios … />` e o `<MenuDaFicha … />`, acrescente:
  ```tsx
                <StatusDaFicha lead={ficha.lead} stages={ficha.stages} pipelineId={origem.id} />
                <DonoDaFicha lead={ficha.lead} pipelineId={origem.id} />
  ```
- em `tests/unit/escale-ficha-do-negocio.test.tsx`, acrescente os mocks `vi.mock("@/components/escale/negocio/StatusDaFicha", () => ({ StatusDaFicha: () => <span data-testid="status" /> }));` e `vi.mock("@/components/escale/negocio/DonoDaFicha", () => ({ DonoDaFicha: () => <span data-testid="dono" /> }));`, e no caso do cabeçalho `expect(screen.getByTestId("status")).toBeInTheDocument(); expect(screen.getByTestId("dono")).toBeInTheDocument();`.

- [ ] **Step 6: Verificar (G1), revisão e commit**

```bash
corepack pnpm vitest run tests/unit/escale-ficha-status-e-dono.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/escale-casca-tokens.test.ts tests/unit/escale-tema-do-painel.test.ts
corepack pnpm typecheck
corepack pnpm exec eslint components/escale/negocio tests/unit/escale-ficha-status-e-dono.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
```
Mais os guardas que leem `escale-tema.css` (comando da G1), `controle-decorativo` e `tailwind-tokens`. Expected: PASS.

**Revisor (subagente):** grava status e dono. Pontos: Perdido nunca grava sem motivo; Aberto num negócio fechado usa `expected_updated_at` e trata a retomada; nenhum caminho grava com o usuário sem permissão; os hooks usam o cache do quadro (`["board", origem]`). Depois:

```bash
git add components/escale/negocio app/escale-tema.css tests/unit/escale-ficha-status-e-dono.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
git commit -m "feat(escale): status Aberto/Ganho/Perdido com motivo e troca de dono no cabeçalho da ficha

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: O botão flutuante por cima da ficha (C9), o espanhol do PR B, a rodada cheia e o PR B

- [ ] **Step 1: C9 provado**

Em `tests/unit/escale-conversas-flutuante.test.tsx`, dentro do `describe("<ConversasFlutuante> (FAB da Clint)", …)`, acrescente:

```tsx
  it("Fase 1G (C9): aparece por cima da ficha do negócio, que é página e não tem cortina", () => {
    caminho = "/app/negocios/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
    renderizar();
    expect(screen.getByRole("button", { name: "Conversas recentes" })).toBeInTheDocument();
  });
```

E em `tests/unit/escale-ficha-do-negocio.test.tsx`, acrescente no fim:

```tsx
describe("C9: nada da ficha cobre o botão flutuante", () => {
  it("a ficha não tem peça fixa nem cortina", () => {
    const fonte = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "..", "..", "components/escale/negocio/FichaDoNegocio.tsx"),
      "utf8",
    ) as string;
    expect(fonte).not.toMatch(/\bfixed\b/);
    expect(fonte).not.toMatch(/Sheet|Dialog/);
  });
});
```

(Se o eslint do projeto proibir `require`, use `import { readFileSync } from "node:fs"; import { join } from "node:path";` no topo do arquivo.)

```bash
corepack pnpm vitest run tests/unit/escale-conversas-flutuante.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
```
Expected: PASS (o `ConversasFlutuante` só se esconde em `/app/inbox`). Commit `test(escale): o botão flutuante de conversas aparece por cima da ficha do negócio (C9)`.

- [ ] **Step 2: O espanhol do PR B.** Mesmo bloco da Task 7 (acrescente no fim dele, com o subtítulo `// PR B: o cabeçalho e as ações`), mesmo script:

| pt | es |
|---|---|
| Ligar | Llamar |
| Sem telefone | Sin teléfono |
| Enviar Whatsapp | Enviar WhatsApp |
| Sem conversa | Sin conversación |
| Enviar Email | Enviar email |
| Sem e-mail | Sin email |
| Agendar | Agendar |
| Nova nota | Nueva nota |
| Lembretes | Recordatorios |
| Adicionar tags | Agregar etiquetas |
| Ações do negócio | Acciones del negocio |
| Visualizar contato | Ver contacto |
| Sem contato | Sin contacto |
| Novo negócio | Nuevo negocio |
| Mudar origem | Cambiar origen |
| Excluir | Eliminar |
| Tem certeza que deseja excluir este negócio? | ¿Seguro que quieres eliminar este negocio? |
| Cancelar | Cancelar |
| Negócios | Negocios |
| Status do negócio | Estado del negocio |
| Aberto | Abierto |
| Ganho | Ganado |
| Perdido | Perdido |
| Selecione o motivo da perda | Selecciona el motivo de la pérdida |
| As permissões de usuários não permitem você trocar de status. | Los permisos de usuario no te permiten cambiar el estado. |
| Para trocar o motivo, reabra o negócio. | Para cambiar el motivo, reabre el negocio. |
| Alterar usuário | Cambiar usuario |
| Selecione um usuário | Selecciona un usuario |
| Sem responsável | Sin responsable |
| Pessoas | Personas |
| Agentes de IA | Agentes de IA |
| As permissões de usuários não permitem você trocar de dono | Los permisos de usuario no te permiten cambiar de dueño |

Onde a Clint tem o espanhol (os textos com chave `component.Deal.*`), vale o dela. Rode `tests/unit/i18n-espanhol-cobre-a-tela.test.ts` e `tests/unit/escale-espanhol-registro-tu.test.ts`. Commit `feat(escale): espanhol do cabeçalho da ficha do negócio (PR B)`.

- [ ] **Step 3: Sem a casca nada muda.** Os testes do original que tocam os encaixes da Task 5 e os hooks que a ficha reaproveita: `grep -rlE "KanbanBoard|KanbanCardActions|useUpdateLead|useMoveCard|LeadDossier" tests components hooks app --include='*.test.*'`. Expected: PASS.

- [ ] **Step 4: A rodada cheia (G1), a conferência visual, o PRD e o PR B.** Como a Task 7 (Steps 2, 3 e 5), com os logs `1g-prb-*`, a branch `feat/fase-1g-cabecalho-e-acoes` e o título `feat(escale): Fase 1G (B) — cabeçalho, status, dono e ações da ficha, iguais à Clint`. Na conferência: o status nas três cores (print 08; anote os hex que sobrarem para a Q10), o motivo ao lado do Perdido (01-017), "Alterar usuário" (print 10), o ⋮ (print 09), o contador com 3 negócios, as ações com e sem telefone e e-mail, e o botão flutuante clicável por cima da ficha (abrir uma conversa e voltar com o "voltar" do navegador). No PRD, a linha `| 1G |` passa a `PR B aberto (aguarda o "pode fazer" do merge)`. O corpo traz as decisões N5 a N10 e N13, os desvios (seletor do motivo não abre sozinho, rótulo do status recolhe na hora, confirmação de Excluir do original), as perguntas que ainda estiverem abertas e os prints que faltam.

Mostre a URL ao usuário e PARE.

---

## Fora desta fase (registrado)

- **1H (abas):** editar contato e nome (C10), vincular empresa (C12), grupos de campos, "Ocultar vazios", "Pesquisar campos" e "Gerenciar campos" na ficha (C14), notas e "Nova nota" (C15), todas as conversas com filtros e o modo espião (C16), arquivos (C17), busca, filtro de tipo, antes/depois e "ver automação" no Histórico (C18), editar as tags do contato.
- **1I (atividades):** concluir, criar e executar atividades, a coluna "Dias", o trilho clicável, agendar e lembretes pela linha de ações (C19–C21).
- **Fase 2:** grupos de campos do contato e da empresa (C11, C13) e a tela "Gerenciamento de campos" da Clint.
- **Fase 3:** abrir a conversa dentro do painel flutuante (C22).
- **1K:** "Ver atribuição de ganho" no ⋮ e o botão "Atribuição de ganho" do negócio ganho.
- **Gaveta do contato** da Clint (Visualizar contato e o contador abrem por cima): quando houver print (Q8).
- **Trocar o motivo de um negócio já perdido** (Q4) e **voltar para a etapa de onde saiu** ao reabrir (Q3): se o usuário pedir.
- **Campo obrigatório ao ganhar ou perder pelo cabeçalho:** hoje o servidor recusa e aparece o aviso de sempre; o modal "Campos obrigatórios pendentes" ("Salvar e alterar status", 1F PR B) pode ser ligado aqui num ajuste.
- **Destaque da origem no painel Origens** quando a ficha está aberta (o painel só reconhece `/app/pipelines/<id>`).
