# Fase 3D — Filtros, filtros salvos, seleção e ações em massa de Conversas (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** B1 a B8 de `docs/modulos/3-conversas.md` (seção 4, tabela B), mais o "Salvos" do botão de presets (A4, a parte que a 3A deixou para cá), o "Selecionar" do ⋮ (A6) e o funil da barra (3A N21). Seção 5 (a chave "Ações em massa" = `CHAT_BULK_ACTIONS`, que a 3C criou), seção 6 (painel de filtros sobre o mapa de status; filtros salvos de conversas, 20 por pessoa) e seção 7 (filtros salvos e a fila de trabalho das ações em massa).
> Depende da **3A, 3B e 3C mergeadas** (a casca `components/escale/conversas/`, `useFilaDeConversas`, `MenuDePresets`, `BarraDaFila`, `ListaDaFila`, `LinhaDaFila`; `crm_pausas_de_automacao` e `lib/escale/conversas/espera.ts` da 3B; `crm_setores`, `crm_setor_da_conversa`, `crm_setor_do_dispositivo`, `fn_crm_pode`, `useSetores`, `useMinhasPermissoes` e a rota "Alterar setor" da 3C). **Frente C**, worktree `wt-frente-c`, migration **9204**, um PR.

## Decisões do usuário (18/10)

| # | Pergunta | Decisão | Onde vale |
|---|---|---|---|
| Q1 | PRD de Conversas | Aprovado | tudo |
| Q2 | Frente | (a) Frente C, worktree `wt-frente-c` | N1 |
| Q3 | Prints que faltam | Escrever agora e marcar como provisório | abaixo |
| B3 (PRD de Contatos, 17/10) | O que "Selecionar todos" marca | A caixinha marca a lista carregada; marcar todos os resultados do filtro é uma escolha à parte, com o total escrito | N12 |

**Prints que faltam nesta fase** (nenhum bloqueia; o plano segue o código da Clint e marca como provisório):
1. ❌ "Salvos" com um filtro salvo, "Renomear" e "Excluir" (seção 11 do PRD). Provisório: a linha do salvo igual à dos presets (36px, `Bookmark` 16px, nome 12px, `Check` quando aplicado) e, ao passar o mouse nos **meus**, o ⋮ com "Renomear", "Compartilhar"/"Deixar de compartilhar" e "Excluir" (textos `component.FilterPresetsMenu.*`); "Renomear" abre uma janela pequena com o campo e "Salvar".
2. ❌ O toast "Essa ação em massa pode demorar…" (o texto está no bundle, `component.BulkActionsModal.bulkActionProcessingDelay`). Provisório: o `toast` do `sonner` como os outros da casca.
3. ❌ As janelas "Incluir tag" / "Remover tag" depois do submenu de c30. Provisório: o mesmo molde das janelas c26–c29, com o rótulo "Tag" e a lista do vocabulário de tags do contato.
4. ❌ A ilustração da tela "Ações em massa" (c25) é arte da Clint e não se copia. Provisório: o quadrado de 64px `casca-marca-suave` com `ListChecks` 32px `casca-marca`, como os vazios da 3A. **Pergunta ao usuário (não bloqueia):** quer uma ilustração própria da Escale IA no lugar?

**Goal:** Com a casca ligada, a fila de Conversas ganha o painel "Filtros" da Clint (Conversas, Grupos, Negócios, Contatos, Canais), aplicado na hora e na URL, com o botão de presets virando "Personalizado" quando o filtro sai de um preset e mostrando os **Salvos** (salvar, aplicar, renomear, compartilhar, excluir; 20 por pessoa); e o modo **Selecionar** com a caixinha por linha, "Selecionar todos" (a lista carregada) e "Selecionar todas as N do filtro" (à parte, com o total), a tela "Ações em massa" e as quatro ações da Clint (Alterar status, Alterar atendente, Alterar setor, Alterar tag do contato), rodando na hora até 50 conversas e em segundo plano acima disso.

**Architecture:**
- **Um filtro só, no banco.** O painel é um objeto (`FiltrosDoPainel`, `lib/escale/conversas/filtros-da-fila.ts`) que vive na URL (`?f=`; os presets da 3A continuam em `?v=` quando o painel é igual a um deles). O servidor o compila (`compilarFiltrosDaFila`, com o fuso da organização e o padrão da busca) e o banco o avalia numa função **invoker** (`fn_escale_conversa_passa`, migration 9204) — a RLS de `conversations` (do original e a do setor da 3C) continua decidindo o que cada pessoa vê. A mesma função serve à lista (`fn_escale_fila_da_casca`, com a ordem e o cursor), ao total ("Selecionar todas as N", `fn_escale_contar_fila_da_casca`) e às ações em massa (`fn_escale_criar_acao_em_massa_de_conversas`). Um filtro só = a lista, o total e a ação nunca discordam.
- **A fila passa a ler a rota do fork** `GET /api/v1/fila-da-casca` (a 3A lia a do original): `supabase.rpc("fn_escale_fila_da_casca").select(<as colunas da lista do original>)`, com o embed do contato e do canal pelo PostgREST e o `comNomeDoAtendente` do original. A chave de cache continua começando por `"conversations"`: o tempo real e a recarga de segurança da 3A seguem valendo sem mudança. O Inbox original não muda.
- **Filtros salvos** usam a tabela da 2B `crm_filtros_das_listas` com `lista = 'conversas'` (sem migration: a coluna já aceita qualquer nome de lista; as regras de 20 por pessoa, nome único e compartilhado são as mesmas). A rota e o hook da 2B ficam genéricos pela lista.
- **Ações em massa** em tabelas próprias (`crm_acoes_em_massa_conversas` e `_itens`, migration 9204, molde da 9103): a função invoker resolve as conversas com a RLS de quem pede e confere `fn_crm_pode(org, 'CHAT_BULK_ACTIONS')`; até **50** conversas a rota executa na hora (o mesmo executor, com o service role, depois da resolução pela sessão); acima disso emite `conversas.acao_em_massa_requested` e o consumidor do `event_log` processa em lotes de 100 com orçamento de 20 s, como a 2B. Cada conversa passa pela mesma regra da tela: Encerrar/Reabrir pela `fn_service_status` do original, "Em espera" pelo snooze sem fim da 3B, atendente pela RPC `fn_conversation_assign` do original, setor pela transferência da 3C (extraída para uma função comum), tag pelo `patchContactHandler` do original.

**Tech Stack:** o mesmo da 3A–3C (Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Vitest + Testing Library, Tailwind 4 com os tokens da casca, Radix Popover/DropdownMenu, Supabase RLS, zod, sonner).

## Referência visual (abrir a imagem antes de cada task de tela)

Caminhos sem crase (cerca `evidencia-citada`). Os `c` estão em 1:1 (1536px CSS); as fichas `02-00x` em 1,25 (px CSS = px ÷ 1,25).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| c32 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c32-filtros-conversas-aberto.jpg | o painel "Filtros" sobre o centro: cabeçalho, o acordeão Conversas aberto com os 12 toggles (o ícone do WhatsApp Oficial em 4), "Data de criação do atendimento", "Status da conversa", "Atendentes"; o funil da barra ativo com a dica "Filtros" | 7, 8 |
| c64 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c64-filtros-com-preset-resetar-badge.jpg | o preset "Em espera" vira critério: o funil com o selo "1", "Resetar" no cabeçalho, o acordeão Conversas com "1" e X; Negócios, Contatos e Canais fechados; Canais aberto com "Canais e Dispositivos" | 7, 8 |
| c65 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c65-filtros-conversas-status-preenchido.jpg | "Status da conversa: Em espera" preenchido; Agentes e Setores; os outros acordeões embaixo | 7 |
| c66 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c66-filtro-data-calendario-atalhos.jpg | o calendário da data do atendimento: atalhos à esquerda, dois meses, **sem** as abas de tipo | 7 |
| c67 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c67-filtro-status-da-conversa-opcoes.jpg | o seletor aberto: borda da marca, as caixinhas Em espera / Em aberto / Fechado, a marcada com fundo lilás | 7 |
| c68 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c68-filtro-atendentes-lista.jpg | a lista de atendentes com caixinhas, rolagem, abrindo para cima | 7 |
| c69 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c69-filtro-agentes-lista.jpg | a lista de agentes de IA | 7 |
| c70 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c70-filtro-setores-lista.jpg | a lista de setores | 7 |
| c33 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c33-filtros-contatos-aberto.jpg | Contatos aberto: "Tags" e o botão largo "+ Adicionar condição" | 7 |
| c34 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c34-filtros-contatos-tags-dropdown.jpg | o seletor das tags: "Buscar por...", "Qualquer tag", "Sem tag", os chips coloridos | 7 |
| c35 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c35-filtros-canais-select-aberto.jpg | os dispositivos agrupados ("WHATSAPP") com o selo "Desconectado" | 7 |
| c36 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c36-filtros-canais-aberto.jpg | Canais aberto: "Canais e Dispositivos" e "Selecione..." | 7 |
| c76 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c76-filtro-negocio-data-com-tipos.jpg | Negócios aberto: "Data" com o calendário de **três** ícones (criação, ganho, perda) | 7 |
| c77 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c77-filtro-negocio-status-opcoes.jpg | "Negócio com status" com Aberto / Ganho / Perdido (caixinhas) | 7 |
| c78 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c78-filtro-negocio-perdido-motivo-tempo-amarelo-vermelho.jpg | Perdido escolhido: aparece "Motivo de Perda"; Dono, grupos, origens; "Personalizado" no botão, "Salvar filtro" e "Resetar" no cabeçalho, Negócios com "1" | 7, 8 |
| c79 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c79-filtro-motivo-de-perda-lista.jpg | os motivos, começando por "Não informar" | 7 |
| c80 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c80-filtro-dono-do-negocio-sem-dono.jpg | "Dono do negócio" começando por "Sem dono" | 7 |
| c71 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c71-filtro-personalizado-salvar-filtro.jpg | "Personalizado" com o ícone de ajustes; "🔖 Salvar filtro" e "Resetar"; "Conversas suspensas" ligado; a conversa fixada | 8 |
| c72 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c72-salvar-filtro-nome.jpg | o balão "NOME DO FILTRO", o campo "Ex: Clientes em aberto", Cancelar e Salvar | 8 |
| c31 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c31-fila-dropdown-todos-presets.jpg | o menu de presets com "SALVOS" e "+ Criar filtro" | 8 |
| c25 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c25-acoes-em-massa.jpg | o modo Selecionar: "Selecionar todos" + X vermelho, a caixinha por linha; o centro "Ações em massa", os 4 cartões, "Sair de ação em massa" | 9 |
| c26 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c26-massa-alterar-status-modal.jpg | a janela "Alterar status": "Status", "Selecione...", "Executar ação em massa" | 9 |
| c27 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c27-massa-alterar-status-opcoes.jpg | as opções Em aberto / Fechado / Em espera | 9 |
| c28 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c28-massa-alterar-atendente-modal.jpg | "Alterar atendente": "Atendente" | 9 |
| c29 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c29-massa-alterar-setor-modal.jpg | "Alterar setor": o campo "Equipe" | 9 |
| c30 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c30-massa-alterar-tag-submenu.jpg | "1 conversa selecionada"; o submenu "Incluir" / "Remover" do cartão de tag | 9 |
| c82 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c82-selecionar-todos-56128.jpg | "56128 selecionados" (na Clint, a base inteira — aqui só com a escolha à parte, N12) e "56128 conversas selecionadas" | 9 |
| c83 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c83-selecionar-todos-menos-um.png | desmarcar uma linha: "56127 selecionados" | 9 |
| 001 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\02-conversas\imagens\02-001-filtros-conversas.png | a ficha do painel de Conversas (menu lateral; só o conteúdo vale) | 7 |
| 002 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\02-conversas\imagens\02-002-filtros-negocios.png | a ficha do painel de Negócios | 7 |
| 006 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\02-conversas\imagens\02-006-filtros-salvos.png | o menu de presets com "SALVOS" | 8 |
| 007 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\02-conversas\imagens\02-007-selecao-em-massa.png | a ficha da seleção em massa | 9 |

### Medidas tiradas dos prints (px de CSS, 1:1)

| Peça | Medida |
|---|---|
| Painel "Filtros" (c32, c64) | **360px** sobre a esquerda do centro (x 376–736), altura toda, fundo `bg-surface`, borda direita `casca-borda`, sombra `shadow-casca-painel`; cabeçalho 48px: "Filtros" 15px/500 `casca-texto` a 16px; à direita (com critério) "🔖 Salvar filtro" (`Bookmark` 14px + 12px/500 `casca-marca`, botão 28px) e "Resetar" (12px/500 `casca-texto`, botão 28px), e o X (`X` 16px `casca-suave`, botão 24px) |
| Acordeão (c64) | linha 56px, `px-4`, borda de baixo; ícone 16px `casca-suave` (`MessageSquare` Conversas, `Users` Grupos, `Briefcase` Negócios, `User` Contatos, `Smartphone` Canais) + título 13px/500 `casca-texto`; com critério, o selo (quadrado 18px canto 4px `casca-marca-suave`, número 11px/600 `casca-marca`) e o X 14px `casca-suave`; `ChevronDown`/`ChevronUp` 14px `casca-suave` à direita. Aberto: o conteúdo com `px-5 py-4` e fundo `casca-raia`, 16px entre os grupos |
| Toggles (c32) | lista com 4px entre linhas; linha 28px: rótulo 13px `casca-texto`; à direita o `InterruptorDaCasca`; nos 4 do WhatsApp Oficial, o logo do canal 14px antes do interruptor; "Janela de chamada aberta/fechada" desligados com "Em breve" |
| Grupo do filtro (c32) | rótulo 13px/500 `casca-texto` e o controle 6px abaixo |
| Seletor do filtro (c65, c67) | 32px, canto 6px, fundo `casca-busca`, texto 13px (`casca-meta` em "Selecione..."), `ChevronDown` 14px; aberto: fundo `bg-surface`, borda 1px `casca-marca`, `ChevronUp`; a lista no `PainelSuspenso` na largura do gatilho, até 360px de altura com rolagem, linhas 38px (`CaixaDaCasca` + rótulo 13px), grupo 10px/600 uppercase `casca-meta`, selo "Desconectado" (pílula 11px `casca-raia` `casca-suave`) |
| Campo de data (c32, c66) | o mesmo gatilho de 32px com "Selecione uma data" e `Calendar` 14px à direita; o calendário é o `CalendarioDePeriodo` da casca (atalhos + dois meses); Conversas **sem** abas (`semAbas`), Negócios com as **três** abas criação/ganho/perda (sem a quarta, `soDisponiveis`) |
| Funil da barra (c32, c64) | botão 24px de altura; sem critério: ícone `Funnel` 16px `casca-suave`; painel aberto ou com critério: fundo `casca-marca-suave`, ícone `casca-marca`; com critério, o selo redondo 16px `casca-marca` com o número 10px/600 branco ao lado do ícone (o botão cresce para `px-1.5 gap-1`) |
| Botão de presets "Personalizado" (c71) | o mesmo botão da 3A, com `SlidersHorizontal` 14px e "Personalizado"; com um salvo aplicado, `Bookmark` 14px e o nome do salvo (truncado em 140px) |
| Balão "Salvar filtro" (c72) | `PainelSuspenso` 260px, `p-4`, abaixo do botão; "NOME DO FILTRO" 10px/600 uppercase `casca-sobrelinha`; campo 32px com borda `casca-marca`, canto 6px, 13px, placeholder "Ex: Clientes em aberto"; à direita embaixo "Cancelar" (texto 12px `casca-texto`) e "Salvar" (botão cheio 28px `casca-marca`, 12px/600 branco, canto 6px), 8px entre eles |
| Cabeçalho da seleção (c25, c82) | linha 48px abaixo da barra da fila, `px-3`, borda de baixo; `CaixaDaCasca` + "Selecionar todos" (nenhuma marcada) ou "{n} selecionados" 13px/500 `casca-texto`; à direita o X 16px `casca-alerta` (sair) |
| Faixa do filtro inteiro (decisão B3; texto nosso) | 36px, fundo `casca-marca-suave`, 12px `casca-texto`, links 12px/500 `casca-marca`, centrada |
| Linha em seleção (c25) | a caixinha 16px a 12px da esquerda, centrada na foto; o resto da linha anda 28px para a direita; clicar na linha marca/desmarca |
| Centro "Ações em massa" (c25, c30) | centrado; o quadrado 64px (provisório, item 4); "Ações em massa" 16px/500 `casca-texto` a 24px; "{n} conversa(s) selecionada(s)" 12px `casca-suave` a 4px; os 4 cartões a 16px, 8px entre eles: 48px de altura, `px-4`, borda `casca-borda`, canto 8px, fundo `bg-surface`; o ícone num círculo 28px `casca-raia` (16px `casca-texto-2`: `RefreshCcw` status, `ArrowLeftRight` atendente, `UsersRound` setor, `Tag` tag) + 13px `casca-texto`; o cartão do submenu aberto com a borda `casca-marca`; "Sair de ação em massa" 12px `casca-suave` a 24px |
| Submenu de tag (c30) | `PainelSuspenso` 128px, `p-1`; "Incluir" (`Tags` 14px) e "Remover" (`Trash2` 14px), 34px, 12px |
| Janela da ação (c26–c29) | `JanelaDaCasca` 448px, `p-0`; cabeçalho 56px: título 15px/500 `casca-texto` + X 16px; corpo `px-6 py-5`: rótulo 13px `casca-texto` e o seletor 32px (`SeletorDaCasca aparencia="janela"`) 6px abaixo; rodapé 64px com borda de cima e o botão "Executar ação em massa" (32px, `casca-marca` cheio, 13px/600 branco, canto 6px) à direita |

### Textos da Clint usados nesta fase

Do bundle `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\pt-BR-DmQ11GIn.js.txt`:

- **Painel (`component.ChatFilters.*`, `label.t*`, `component.FilterBar.*`):** "Filtros"; "Conversas"; "Grupos"; "Negócios"; "Contatos"; "Canais"; "Atribuídas a mim"; "Não atribuídas"; "Sem resposta do atendente"; "Aguardando resposta do contato"; "Em transferência"; "Lidas"; "Não lidas"; "Dentro da janela de conversa"; "Fora da janela de conversa"; "Janela de chamada aberta"; "Janela de chamada fechada"; "Conversas suspensas"; "Data de criação do atendimento"; "Selecione uma data"; "Status da conversa"; "Em espera"; "Em aberto"; "Fechado"; "Atendentes"; "Agentes"; "Você pode filtrar por até 20 agentes."; "Setores"; "Selecione..."; "Somente conversas"; "Somente grupos"; "Salvar filtro"; "Resetar"; "Nome do filtro"; "Ex: Clientes em aberto"; "Cancelar"; "Salvar"; "Remover filtro".
- **Negócios (`component.DealFilters.*`):** "Data"; "Com/sem negócio"; "Com negócio"; "Sem negócio"; "Negócio com status"; "Aberto", "Ganho", "Perdido"; "Motivo de Perda"; "Não informar"; "Dono do negócio"; "Sem dono"; "Negócio nos grupos"; "Negócio nas origens"; "Negócio nas etapas"; "Selecione uma origem para escolher uma etapa"; "Nenhum motivo de perda encontrado"; "Nenhuma origem encontrada".
- **Contatos e Canais:** "Tags"; "Adicionar condição"; "Buscar por..."; "Qualquer tag"; "Sem tag"; "Canais e Dispositivos"; "Desconectado".
- **Salvos (`component.ChatList.*`, `component.FilterPresetsMenu.*`):** "Salvos"; "Criar filtro"; "Personalizado"; "Renomear"; "Excluir"; "Limite de 20 filtros salvos atingido. Exclua algum para salvar outro.".
- **Seleção e ações (`component.ChatList.*`, `component.BulkActions*.*`, `label.t*`):** "Selecionar"; "Selecionar todos"; "selecionados"; "{count, plural, one {conversa selecionada} other {conversas selecionadas}}"; "Ações em massa"; "Alterar status"; "Alterar atendente"; "Alterar setor"; "Alterar tag do contato"; "Incluir"; "Remover"; "Sair de ação em massa"; "Status"; "Atendente"; "Equipe"; "Sem atendente"; "Executar ação em massa"; "Essa ação em massa pode demorar alguns segundos para ser completada e refletir os resultados da pesquisa."; "Ocorreu um erro ao executar a ação em massa!"; "É preciso selecionar ao menos um Chat para realizar ações em massa!"; "A ação em massa foi realizada com sucesso!".
- **Textos nossos** (a Clint não tem): "Arquivada" (o valor do status que o original arquiva); "Compartilhar"; "Deixar de compartilhar"; "Renomear filtro"; "Filtro salvo."; "Filtro excluído."; "Já existe um filtro com esse nome."; "Dê ao filtro um nome de 1 a 60 caracteres."; "As {n} conversas carregadas estão selecionadas."; "Selecionar todas as {total} conversas do filtro"; "Todas as {total} conversas do filtro estão selecionadas."; "Limpar seleção"; "Sem permissão para ações em massa."; "Tag"; "No máximo 100.000 conversas por ação."; "Nenhuma opção."; "Em breve".

### Comportamento da Clint conferido no código

- **Painel** (`index-CPsdLJFo`, `tr`/`jf`/`Xf`/`qf`): acordeões Conversas, Grupos (só com a feature de grupos), Negócios, Contatos, Canais; cada um com a contagem e o X que limpa só ele; estado dos acordeões lembrado no navegador; aplica na hora (sem botão "Aplicar"). O preset é um filtro: escolher "Em espera" preenche "Status da conversa" e o funil mostra "1"; mexer em qualquer critério troca o botão para "Personalizado".
- **Negócios** (`Xf`): os critérios valem para o mesmo negócio; "Motivo de Perda" aparece com Perdido escolhido; a etapa só liga com origem escolhida.
- **Salvos** (`component.FilterBar.*`, `component.FilterPresetsMenu.*`): "Criar filtro" abre o painel (não é modal); "Salvar filtro" aparece com algum critério e abre o balão com o nome; limite de 20.
- **Seleção** (`index-YQu0gzVE`, `up`/`cp`): "Selecionar" do ⋮ liga o modo; o centro vira "Ações em massa"; a janela de cada ação tem um campo e "Executar ação em massa", sem "tem certeza"; "Sair de ação em massa" desliga. Na Clint, "Selecionar todos" marca a base inteira — aqui não (B3).

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Branch `feat/fase-3d-filtros-e-acoes-em-massa`** de `escale-crm/main` com a 3A, a 3B e a 3C mergeadas, na worktree `wt-frente-c`; **migration 9204**; um PR, mergeado ao terminar | regra de 18/10 |
| N2 | **O painel é a fonte da verdade** (`FiltrosDoPainel`): os presets da 3A viram valores do painel (`PAINEL_DO_PRESET`: Não lidas = marca "Não lidas"; Meus em aberto = "Atribuídas a mim" + status Em aberto; Em aberto / Em espera / Fechadas = o status). O botão mostra o preset quando o painel é igual a um, o nome do salvo quando é igual a um salvo, e "Personalizado" no resto. Na URL: igual a preset → `?v=` (o da 3A); senão → `?f=` com o JSON enxuto | A4, B1, B6 |
| N3 | **Status da conversa** sobre o mapa da seção 6 do PRD: Em aberto = `open/pending/claimed/ai_handling` sem espera vigente; Em espera = os mesmos com `snooze_until` vigente (o snooze sem fim da 3B); Fechado = `closed/resolved`; **Arquivada** (texto nosso) = `archived`. Vários valores somam por OU | seção 6; decisão 2 da seção 9 |
| N4 | **Os toggles** (as "marcas"): pares opostos somam por OU (Atribuídas a mim / Não atribuídas; Sem resposta do atendente / Aguardando resposta do contato; Lidas / Não lidas; Dentro / Fora da janela); grupos diferentes se juntam por E. Sem resposta = `awaiting_since` preenchido (a régua da Fila do original); Aguardando o contato = a última mensagem foi nossa; Dentro/Fora da janela só em dispositivo `meta_cloud` (24 h desde `last_inbound_at`); Em transferência = `crm_setor_da_conversa.em_transferencia` (3C); Conversas suspensas = pausa vigente em `crm_pausas_de_automacao` (3B). "Janela de chamada aberta/fechada" ficam desligadas com "Em breve" (o original não guarda a janela de chamada; 3B N20) | B2; 3B N9, N20; 3C N7 |
| N5 | **Data de criação do atendimento** = `coalesce(service_started_at, created_at)` da conversa, no fuso da organização, com o calendário **sem abas** (c66). **Atendentes** (com "Sem atendente" no topo) aparece para gerente e administrador (PRD: "admin ou quem vê o time"); **Agentes** = `assignee_kind = 'ai'` e `active_ai_agent_id` (até 20, "Você pode filtrar por até 20 agentes."); **Setores** = o setor efetivo da 3C (o explícito ou o do dispositivo) | B2; 3C N2 |
| N6 | **Negócios:** uma conversa casa se **algum** negócio visível do contato (origem não arquivada) cumpre **todos** os critérios juntos (a regra da 1D, invertida, como a seção Negócio da 2B). Data por criação (`created_at`), ganho ou perda (`closed_at` com o status); "Não informar" = o motivo `other` ("Não informar" grava "Outro motivo", 3A N12); "Sem dono" e os agentes de IA como donos (`agent:<id>`), como a 2B; grupos de origens por `crm_pipelines.group_id` (9001). "Sem negócio" = nenhum negócio cumpre | B3 |
| N7 | **Contatos › Tags** reaproveita a seção de tags da 2B (grupos E/OU, "Qualquer tag", "Sem tag") sobre as tags **do contato** (`fn_escale_tags_passam` da 9102); **Canais** = os dispositivos (`channel_session_id`), agrupados por WhatsApp / WhatsApp Oficial / Instagram (a regra `agruparDispositivos` da 3A) com "Desconectado"; **Grupos** = "Somente conversas" / "Somente grupos" (`is_group`), e o acordeão só aparece quando a organização tem alguma conversa de grupo (os dois itens entram também no menu de presets, logo depois de "Não lidas") | B4, B5, B1; A4 |
| N8 | **A busca e as exclusões do original** entram na mesma função: a busca casa a prévia, o nome e o telefone (≥ 4 dígitos) do contato (a regra do handler do original; contato anonimizado ou pessoal não é achado pelo nome); contato **pessoal** e canal **desativado** (`metadata.disabled`) nunca aparecem, como no Inbox original | o que a lista do original já esconde |
| N9 | **Uma função, três usos** (9204, todas `security invoker`, `revoke ... from public, anon`): `fn_escale_conversa_passa(conversations, jsonb)`; `fn_escale_fila_da_casca(org, filtros, ordem, depois_sort, depois_id, depois_nulo, limite) returns setof conversations` (a ordem "Última interação" `last_message_at desc nulls last, id desc` ou "Esperando mais tempo" `awaiting_since asc nulls last, id asc`, com o cursor por chave e no máximo 101 linhas); `fn_escale_contar_fila_da_casca(org, filtros)`. A rota pede `supabase.rpc(...).select(<as colunas da lista do original>)` (o PostgREST faz o embed do contato e do canal sobre o `setof conversations`) e repete a ordem no `.order()` | seção 6; risco "a lista e a ação discordam" |
| N10 | **As colunas da lista** vêm do original: `app/api/v1/conversations/_handler.ts` ganha `export const COLUNAS_DA_LISTA_DE_CONVERSAS = SELECT_COLS;` (uma linha, `FORK ESCALE · Fase 3D`) — a casca recebe exatamente a forma `ConversationWithContact` de sempre | princípio dos encaixes pequenos |
| N11 | **Filtros salvos** em `crm_filtros_das_listas` (2B) com `lista = 'conversas'`: sem migration (o CHECK aceita `^[a-z_]{1,30}$`; o gatilho de 20 por pessoa e o índice de nome são por lista). `lib/escale/listas/filtros-salvos.ts` passa a ter um schema de critérios por lista (`novoFiltroSchema` vira união por `lista`), `FiltroDaLista<L>` genérico e `enxugarCriterios`; a rota POST usa `enxugarCriterios`; o hook `useFiltrosDaLista` fica genérico. O PRD falava em generalizar a 9004 (`crm_filtros_salvos`, do quadro, presa a origem/visualização); a 2B já criou a tabela das listas depois do PRD, e ela serve sem mudança | B6; seção 7 |
| N12 | **Seleção** (B7 com a decisão B3): o `Selecao` da 2B (`lib/escale/contatos/selecao.ts`, genérico: `ids` até 1.000, ou `todos` com `quantidade` e `excluidos`). A caixinha do cabeçalho "Selecionar todos" marca **as linhas carregadas**; com todas marcadas, a faixa oferece "Selecionar todas as {total} conversas do filtro" (o total de `fn_escale_contar_fila_da_casca`); desmarcar uma linha no modo "todos" a põe em `excluidos` ("56127 selecionados", c83). A ação no modo "todos" leva o filtro, nunca a lista de ids | B7; decisão B3 |
| N13 | **"Selecionar" só com a permissão** "Ações em massa" (`useMinhasPermissoes().CHAT_BULK_ACTIONS`, 3C; padrão gerente, piso atendente): sem ela, o item do ⋮ fica desligado com "Sem permissão para ações em massa."; o banco confere de novo (`fn_crm_pode` na função e na policy) | seção 5; 3C N4 |
| N14 | **As quatro ações** e o que cada conversa recebe (o mesmo que a tela faz): **Status** Em aberto = reabre a fechada (`fn_service_status 'open'`) e tira da espera (campos da 3B) + evento `reaberto`/`espera_removida`; Fechado = `fn_service_status 'closed'` + `encerrado`; Em espera = reabre se fechada e põe o snooze sem fim + `espera`; arquivada = falha "A conversa está arquivada."; **Atendente** = `fn_conversation_assign` (o da pessoa: `transfer`; "Sem atendente": `release`), destino conferido como membro agente+ na rota; **Setor** ("Equipe") = a transferência da 3C (`transferirConversaParaSetor`, extraída da rota da 3C para `lib/escale/conversas/setores-banco.ts`; o mesmo setor = pulada); **Tag do contato** Incluir/Remover = `patchContactHandler` do original com as tags normalizadas (até 20), uma vez por contato no lote | B8; 3B N3, N4; 3C N7 |
| N15 | **Na hora ou em segundo plano:** até **50** conversas (`LIMITE_IMEDIATO`) a rota roda o executor na própria requisição (service role, depois da resolução pela sessão) e devolve "concluida" → toast "A ação em massa foi realizada com sucesso!"; acima disso a função emite `conversas.acao_em_massa_requested`, a tela mostra "Essa ação em massa pode demorar alguns segundos…" e acompanha (`GET /api/v1/acoes-em-massa-conversas/[id]` a cada 3 s) até o fim. Se o caminho imediato falhar no meio, a rota emite o evento e o consumidor termina (rede de segurança). Até 100.000 por ação | B8; seção 7; risco 5 |
| N16 | **Tabelas próprias** `crm_acoes_em_massa_conversas` e `_itens` (molde da 9103, sem a aprovação de exportação): cada um vê as suas; criar exige `fn_crm_pode(org, 'CHAT_BULK_ACTIONS')`; quem pediu só fecha o preparo (`preparando` → `na_fila`); o resto é do consumidor (service role). Não se mistura com as da 2B porque a chave, a lista de ações e o painel "Exportações" são outros | seção 7 |
| N17 | **Depois da ação**, a tela invalida `["conversations"]` (a fila, o total e a conversa aberta) e sai do modo de seleção (provisório: a Clint não mostra o depois) | B8 |
| N18 | **Ícones novos** em `lib/ui/icons-da-casca.ts`: `Bookmark`, `RefreshCcw`, `ArrowLeftRight`, `UsersRound`, `Tags` (só os que faltam; confira a linha antes) | cerca `tailwind-tokens` |
| N19 | **`CalendarioDePeriodo`** (fork, casca V1) ganha a prop `soDisponiveis?: boolean`: com ela, só as abas de `tiposDisponiveis` aparecem (c76 tem três ícones, não quatro). Sem a prop, nada muda para quem já usa | B3 |
| N20 | **A página** passa `opcoesDoFiltro` (as origens, etapas e motivos que a 2B já lê em `origensDaPagina`) a `ConversasDaCasca`; o `_casca.tsx` das configurações (3C) passa também. Os grupos de origens vêm de `GET /api/v1/pipeline-groups` (1A) por um hook pequeno | B3 |
| G1 | **Verificação enxuta**: por task só o que a task cria, typecheck e eslint dos arquivos alterados; `test:db`, rodada cheia, revisor e conferência visual no fim da Frente C (depois da 3E) | regra de 18/10 |

## Global Constraints

### Repositório, worktree e Git

- Worktree: `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-c`. **Base:** `escale-crm/main` com a 3A, a 3B e a 3C mergeadas (a Task 1 prova: `components/escale/conversas/configuracoes/HubDeConfiguracoes.tsx` existe; `9203` está na `main`).
- **Branch:** `feat/fase-3d-filtros-e-acoes-em-massa` (`git switch -c feat/fase-3d-filtros-e-acoes-em-massa escale-crm/main`).
- **Migration:** `supabase/migrations/20261105120000_9204_filtros_e_acoes_em_massa_da_fila.sql`. Antes: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; `9204` em outra branch → PARE e pergunte.
- **PR** para `rgisjr/escale-crm`, base `main`, mergeado ao terminar; tag/release/VPS só no fim da Frente C. **Proibido:** push em `origin` (Rafael), tag, release, VPS e gravar no banco de produção.
- Conflitos com as outras frentes: `lib/i18n/dicionario.ts`, `supabase/baseline.sql`, `lib/audit/actions.ts`, `tests/invariants/rls-completude-varredura.test.ts`, `lib/ui/icons-da-casca.ts`, `lib/event-log/register-handlers.ts`, `tests/unit/dispatcher-org-parada.test.ts`: manter os dois blocos, o que já está na `main` primeiro.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`; `export NODE_OPTIONS=--max-old-space-size=6144` para o typecheck.
- `test:db` **não roda nesta fase** (fim da Frente C). O arquivo de prova é escrito na Task 2 e fica pronto.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 3D`. Sem a casca, nenhum deles muda o comportamento.

| Arquivo | Mudança |
|---|---|
| `app/api/v1/conversations/_handler.ts` | logo depois da constante `SELECT_COLS`: `// FORK ESCALE · Fase 3D: a fila da casca lê as mesmas colunas (a forma ConversationWithContact).` + `export const COLUNAS_DA_LISTA_DE_CONVERSAS = SELECT_COLS;` |
| `lib/event-log/register-handlers.ts` | `import { acaoEmMassaDaFilaHandler } from "@/lib/escale/conversas/massa/handler";` junto do import da 2B, e `registerHandler(acaoEmMassaDaFilaHandler);` logo depois de `registerHandler(acaoEmMassaHandler);`, com o comentário `// FORK ESCALE · Fase 3D: ações em massa da fila de Conversas (lotes com orçamento).` |
| `tests/unit/dispatcher-org-parada.test.ts` | o import e o handler na lista, ao lado de `acaoEmMassaHandler` (confira a forma da lista no arquivo) |
| `supabase/baseline.sql` | o bloco da 9204, idêntico à migration, logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (depois do bloco da 9203) |
| `lib/i18n/dicionario.ts` | bloco `// ─── FORK ESCALE · Fase 3D: filtros, salvos e ações em massa de Conversas ───` logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` (depois do bloco da 3C) |
| `lib/audit/actions.ts` | depois do bloco da 3C: `"conversations.bulk_requested",` |
| `tests/invariants/rls-completude-varredura.test.ts` | duas entradas em `PROVA_PROPRIA` depois das da 9203 |
| `lib/ui/icons-da-casca.ts` | os ícones da N18 que faltam |

Do fork que mudam: `lib/escale/contatos/filtros.ts` (`tagsSchema` passa a ser exportado), `lib/escale/listas/filtros-salvos.ts` e `app/api/v1/filtros-das-listas/route.ts` (critérios por lista), `hooks/escale/useFiltrosDaLista.ts` (genérico), `components/escale/ui/CalendarioDePeriodo.tsx` (`soDisponiveis`), `lib/escale/conversas/setores-banco.ts` e `app/api/v1/conversas-da-casca/[id]/setor/route.ts` (a transferência extraída), `hooks/escale/useFilaDeConversas.ts` e o teste dele (a rota da casca), `components/escale/conversas/ConversasDaCasca.tsx`, `fila/BarraDaFila.tsx`, `fila/MenuDePresets.tsx`, `fila/MenuMaisDaFila.tsx`, `fila/ListaDaFila.tsx`, `fila/LinhaDaFila.tsx`, `app/app/inbox/page.tsx` (o bloco do fork: `opcoesDoFiltro`) e `app/app/inbox/configuracoes/_casca.tsx`.

### Cercas que precisam ficar verdes

As da 3A–3C mais: `rls-completude-varredura` (as duas tabelas), `hardening-definer-varredura`, `gov-hardening-anon-definer` e `definer-nova-nasce-exposta` (nenhuma função nova é definer; todas com `revoke all ... from public, anon`), `tabelas-do-motor-nao-se-leem-pelo-login` (as tabelas novas lidas pela sessão; o service role só no executor), `dispatcher-org-parada` (o consumidor novo, `naOrgParada: "roda"`), `manifest-x-migrations` (a linha `-- manifest:`), `i18n-espanhol-cobre-a-tela`, `controle-decorativo`, `tailwind-tokens`, `vocabulario-do-funil`, `evidencia-citada`, `escale-casca-v2-original-intacto`.

### Verificação (G1)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit tests/invariants lib app components --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os de `tests/unit` com `corepack pnpm vitest run <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db`, rodada cheia, revisor (Opus 5.5, high) e conferência visual:** no fim da Frente C (Task final da 3E).
3. **Comandos longos sempre em segundo plano.**

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (ou o modelo da sessão); o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório na Task 1.
- Todo texto de tela por `t()` com literal. Datas e números no formato brasileiro (o total "56.128", nunca "56128").

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/escale/conversas/filtros-da-fila.ts` | novo | `FiltrosDoPainel`: schema, enxugar, contar, limpar, presets ↔ painel, o rótulo do botão, a URL |
| `lib/escale/conversas/compilar-filtros-da-fila.ts` | novo | o filtro compilado que o banco lê (fuso, busca, donos, tags) |
| `lib/escale/conversas/acoes-em-massa-da-fila.ts` | novo | as ações, o pedido, o alvo da seleção, os textos de "selecionadas" |
| `supabase/migrations/20261105120000_9204_filtros_e_acoes_em_massa_da_fila.sql`, `supabase/baseline.sql` | novo / bloco | as funções do filtro, as duas tabelas, a função de criar a ação |
| `tests/invariants/escale-fila-e-massa-9204.test.ts` | novo | a prova contra Postgres real (roda no fim da frente) |
| `lib/escale/conversas/fila-banco.ts` | novo | ler a página (rpc + embed + cursor) e contar |
| `app/api/v1/fila-da-casca/route.ts`, `app/api/v1/fila-da-casca/total/route.ts` | novos | a lista e o total |
| `app/api/v1/conversations/_handler.ts` | alterado (1 linha) | `COLUNAS_DA_LISTA_DE_CONVERSAS` |
| `lib/escale/contatos/filtros.ts`, `lib/escale/listas/filtros-salvos.ts`, `app/api/v1/filtros-das-listas/route.ts`, `hooks/escale/useFiltrosDaLista.ts` | alterados | salvos por lista |
| `lib/escale/conversas/massa/executar.ts`, `lib/escale/conversas/massa/handler.ts` | novos | o executor e o consumidor do `event_log` |
| `app/api/v1/acoes-em-massa-conversas/route.ts`, `app/api/v1/acoes-em-massa-conversas/[id]/route.ts` | novos | pedir e acompanhar |
| `lib/escale/conversas/setores-banco.ts`, `app/api/v1/conversas-da-casca/[id]/setor/route.ts` | alterados | `transferirConversaParaSetor` |
| `lib/event-log/register-handlers.ts`, `tests/unit/dispatcher-org-parada.test.ts` | alterados | o consumidor novo |
| `hooks/escale/useFilaDeConversas.ts` (e o teste da 3A), `hooks/escale/useTotalDaFila.ts`, `hooks/escale/useAcoesEmMassaDaFila.ts`, `hooks/escale/useGruposDasOrigens.ts` | alterado / novos | os hooks |
| `components/escale/ui/CalendarioDePeriodo.tsx` | alterado | `soDisponiveis` |
| `components/escale/conversas/filtros/SeletorDoFiltro.tsx`, `CampoDePeriodoDaFila.tsx`, `GrupoDaFila.tsx`, `SecaoConversasDaFila.tsx`, `SecaoGruposDaFila.tsx`, `SecaoNegociosDaFila.tsx`, `SecaoContatosDaFila.tsx`, `SecaoCanaisDaFila.tsx`, `PainelDeFiltrosDaFila.tsx`, `BalaoSalvarFiltro.tsx`, `FunilDaFila.tsx` | novos | o painel |
| `components/escale/conversas/fila/MenuDePresets.tsx`, `BarraDaFila.tsx`, `MenuMaisDaFila.tsx`, `JanelaRenomearFiltro.tsx` | alterados / novo | presets, salvos, funil, "Selecionar" |
| `components/escale/conversas/massa/CabecalhoDaSelecao.tsx`, `FaixaDoFiltroInteiro.tsx`, `CentroDeAcoesEmMassa.tsx`, `JanelaDaAcaoEmMassa.tsx` | novos | a seleção e as ações |
| `components/escale/conversas/fila/ListaDaFila.tsx`, `LinhaDaFila.tsx`, `components/escale/conversas/ConversasDaCasca.tsx`, `app/app/inbox/page.tsx`, `app/app/inbox/configuracoes/_casca.tsx` | alterados | os encaixes da 3A–3C |
| `lib/i18n/dicionario.ts`, `lib/audit/actions.ts`, `tests/invariants/rls-completude-varredura.test.ts`, `lib/ui/icons-da-casca.ts` | alterados | espanhol, ação, varredura, ícones |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md`, `LOG.md` | alterados (fora do repositório) | a linha da 3D na seção 8; o log |

---

### Task 1: Branch, base e as regras puras (o painel, o filtro compilado, as ações)

**Files:**
- Create: `lib/escale/conversas/filtros-da-fila.ts`, `lib/escale/conversas/compilar-filtros-da-fila.ts`, `lib/escale/conversas/acoes-em-massa-da-fila.ts`, `tests/unit/escale-filtros-da-fila-regras.test.ts`
- Modify: `lib/escale/contatos/filtros.ts` (`tagsSchema` exportado)
- Copy: este plano para `docs/superpowers/plans/`

**Interfaces (Produces):**
- `filtros-da-fila.ts`: `STATUS_DA_FILA`, `StatusDaFila`, `ROTULO_DO_STATUS_DA_FILA`, `MARCAS`, `Marca`, `MARCAS_DE_CHAMADA`, `MarcaDeChamada`, `MARCAS_NA_TELA`, `ROTULO_DA_MARCA`, `MARCAS_DO_OFICIAL`, `SEM_ATENDENTE` ("nenhum"), `SEM_DONO` ("sem_dono"), `PREFIXO_DO_AGENTE` ("agent:"), `AGENTES_MAX` (20), `MOTIVO_NAO_INFORMADO` ("other"), `TIPOS_DE_DATA_DO_NEGOCIO`, `TipoDeDataDoNegocio`, `filtrosDaFilaSchema`, `FiltrosDoPainel`, `ConversasDoPainel`, `NegociosDoPainel`, `enxugarFiltrosDoPainel(f)`, `mesmosFiltrosDoPainel(a, b)`, `SECOES_DA_FILA`, `SecaoDaFila`, `contarNaSecaoDaFila(f, s)`, `totalDeCriterios(f)`, `temCriterios(f)`, `limparSecaoDaFila(f, s)`, `PAINEL_DO_PRESET`, `PRESETS_DE_GRUPO`, `PresetDeGrupo`, `PAINEL_DO_PRESET_DE_GRUPO`, `ROTULO_DO_PRESET_DE_GRUPO`, `presetDoPainel(f)`, `RotuloDoBotao`, `rotuloDoBotao(f, salvos)`, `PARAM_DO_PAINEL` ("f"), `painelDoTexto(texto)`, `painelDaUrl(params)`, `paramsDoPainel(f)`.
- `compilar-filtros-da-fila.ts`: `FiltroDaFilaCompilado`, `padraoDaBusca(bruto)`, `compilarFiltrosDaFila(painel, busca, fuso)`.
- `acoes-em-massa-da-fila.ts`: `ACOES_DA_FILA`, `AcaoDaFila`, `STATUS_DA_ACAO`, `StatusDaAcao`, `ROTULO_DO_STATUS_DA_ACAO`, `LIMITE_IMEDIATO` (50), `CONVERSAS_POR_ACAO_MAX` (100.000), `EVENTO_DA_MASSA_DA_FILA`, `alvoDaFilaSchema`, `AlvoDaFila`, `pedidoDaFilaSchema`, `PedidoDaFila`, `EstadoDaAcaoDaFila`, `ResumoDaAcaoDaFila`, `acaoRodando(s)`, `alvoDaSelecaoDaFila(s, consulta)`, `textoDasSelecionadas(n, t)`.

- [ ] **Step 1: A base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-c"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain            # Expected: vazio (a 3C mergeada e a worktree limpa)
git fetch escale-crm --quiet
git switch -c feat/fase-3d-filtros-e-acoes-em-massa escale-crm/main
for f in components/escale/conversas/configuracoes/HubDeConfiguracoes.tsx components/escale/conversas/centro/compositor/CompositorDaCasca.tsx lib/escale/conversas/espera.ts lib/escale/conversas/setores-banco.ts hooks/escale/useSetores.ts hooks/escale/usePermissoesDeAtendimento.ts tests/helpers/supabase-por-tabela.ts; do git cat-file -e HEAD:$f && echo "ok $f"; done
git ls-tree --name-only HEAD supabase/migrations/ | grep -E "_92[0-9]{2}_" | sort
bash scripts/checar-colisao-de-migration.sh escale-crm/main
corepack pnpm install --frozen-lockfile
```

Expected: sete `ok`; a lista das 92xx termina em `…9203_setores_permissoes_respostas.sql`. Se faltar qualquer um, a 3C não está na `main`: PARE. Se `9204` aparecer em outra branch, PARE e pergunte.

- [ ] **Step 2: Copiar o plano**

```bash
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-19-fase-3d-filtros-e-acoes-em-massa.md" docs/superpowers/plans/
```

- [ ] **Step 3: Exportar o schema das tags da 2B**

Em `lib/escale/contatos/filtros.ts`, troque

```ts
const tagsSchema = z
```

por

```ts
/** FORK ESCALE · Fase 3D: exportado para a seção Contatos do painel de Conversas reaproveitar a mesma forma. */
export const tagsSchema = z
```

- [ ] **Step 4: O teste das regras (vai falhar)**

Create `tests/unit/escale-filtros-da-fila-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  alvoDaSelecaoDaFila,
  pedidoDaFilaSchema,
  textoDasSelecionadas,
} from "@/lib/escale/conversas/acoes-em-massa-da-fila";
import { compilarFiltrosDaFila, padraoDaBusca } from "@/lib/escale/conversas/compilar-filtros-da-fila";
import {
  PAINEL_DO_PRESET,
  contarNaSecaoDaFila,
  enxugarFiltrosDoPainel,
  filtrosDaFilaSchema,
  limparSecaoDaFila,
  mesmosFiltrosDoPainel,
  painelDaUrl,
  painelDoTexto,
  paramsDoPainel,
  presetDoPainel,
  rotuloDoBotao,
  temCriterios,
  totalDeCriterios,
} from "@/lib/escale/conversas/filtros-da-fila";

const t = (s: string) => s;
const U1 = "b0000000-0000-4000-8000-000000000001";
const U2 = "b0000000-0000-4000-8000-000000000002";
const A1 = "c0000000-0000-4000-8000-000000000001";
const urlDe = (q: string) => new URLSearchParams(q);
const uuidN = (n: number) => `e0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("o painel e os presets (N2)", () => {
  it("cada preset da 3A é um valor do painel", () => {
    expect(PAINEL_DO_PRESET.todos).toEqual({});
    expect(PAINEL_DO_PRESET.nao_lidas).toEqual({ conversas: { marcas: ["nao_lidas"] } });
    expect(PAINEL_DO_PRESET.meus_em_aberto).toEqual({ conversas: { marcas: ["atribuidas_a_mim"], status: ["em_aberto"] } });
    expect(PAINEL_DO_PRESET.em_espera).toEqual({ conversas: { status: ["em_espera"] } });
    expect(PAINEL_DO_PRESET.fechadas).toEqual({ conversas: { status: ["fechado"] } });
  });

  it("o painel igual a um preset mostra o preset; igual a um salvo, o nome; senão, Personalizado", () => {
    expect(presetDoPainel({ conversas: { status: ["em_espera"] } })).toBe("em_espera");
    expect(presetDoPainel({})).toBe("todos");
    expect(presetDoPainel({ grupos: "grupos" })).toBe("somente_grupos");
    const salvos = [{ id: "s1", nome: "Perdidos", criterios: { negocios: { status: ["lost" as const] } } }];
    expect(rotuloDoBotao({ conversas: { status: ["em_espera"] } }, salvos)).toEqual({ tipo: "preset", preset: "em_espera" });
    expect(rotuloDoBotao({ grupos: "conversas" }, salvos)).toEqual({ tipo: "grupo", preset: "somente_conversas" });
    expect(rotuloDoBotao({ negocios: { status: ["lost"] } }, salvos)).toEqual({ tipo: "salvo", id: "s1", nome: "Perdidos" });
    expect(rotuloDoBotao({ conversas: { status: ["em_espera"], marcas: ["suspensas"] } }, salvos)).toEqual({ tipo: "personalizado" });
  });

  it("a contagem do selo segue a Clint (status = 1; cada toggle conta)", () => {
    expect(totalDeCriterios(PAINEL_DO_PRESET.em_espera)).toBe(1);
    expect(totalDeCriterios(PAINEL_DO_PRESET.meus_em_aberto)).toBe(2);
    const f = { conversas: { marcas: ["lidas" as const] }, negocios: { status: ["lost" as const], motivos: ["price"] }, canais: [A1] };
    expect(contarNaSecaoDaFila(f, "conversas")).toBe(1);
    expect(contarNaSecaoDaFila(f, "negocios")).toBe(2);
    expect(contarNaSecaoDaFila(f, "canais")).toBe(1);
    expect(limparSecaoDaFila(f, "negocios")).toEqual({ conversas: { marcas: ["lidas"] }, canais: [A1] });
    expect(temCriterios({ conversas: { marcas: [] }, negocios: {} })).toBe(false);
  });

  it("enxugar tira o vazio, ordena e compara sem olhar a ordem", () => {
    const sujo = {
      canais: [],
      conversas: { status: ["fechado" as const, "em_espera" as const], atendentes: [U2, U1, U1] },
      negocios: { data: { tipo: "ganho" as const } },
    };
    expect(enxugarFiltrosDoPainel(sujo)).toEqual({ conversas: { status: ["em_espera", "fechado"], atendentes: [U1, U2] } });
    expect(
      mesmosFiltrosDoPainel({ conversas: { status: ["fechado", "em_espera"] } }, { conversas: { status: ["em_espera", "fechado"] } }),
    ).toBe(true);
  });

  it("a URL: preset em ?v=, o resto em ?f=; lixo vira vazio", () => {
    expect(paramsDoPainel({ conversas: { status: ["em_espera"] } })).toEqual({ v: "em_espera", f: null });
    expect(paramsDoPainel({})).toEqual({ v: null, f: null });
    const f = { conversas: { marcas: ["suspensas" as const] } };
    expect(paramsDoPainel(f)).toEqual({ v: null, f: JSON.stringify(f) });
    expect(painelDaUrl(urlDe(`f=${encodeURIComponent(JSON.stringify(f))}`))).toEqual(f);
    expect(painelDaUrl(urlDe("v=fechadas"))).toEqual({ conversas: { status: ["fechado"] } });
    expect(painelDaUrl(urlDe("f=%7Bx"))).toEqual({});
    expect(painelDoTexto('{"conversas":{"agentes":["nao-e-uuid"]}}')).toBeNull();
    expect(painelDoTexto(null)).toEqual({});
  });

  it("o schema recusa mais de 20 agentes e marca que não existe", () => {
    const vinteEUm = Array.from({ length: 21 }, (_, i) => uuidN(i));
    expect(filtrosDaFilaSchema.safeParse({ conversas: { agentes: vinteEUm } }).success).toBe(false);
    expect(filtrosDaFilaSchema.safeParse({ conversas: { marcas: ["chamada_aberta"] } }).success).toBe(false);
    expect(filtrosDaFilaSchema.safeParse({ conversas: { atendentes: ["nenhum", U1] } }).success).toBe(true);
  });
});

describe("o filtro compilado (N3–N8)", () => {
  it("a busca escapa curinga, troca o * do original por % e só leva dígitos a partir de 4", () => {
    expect(padraoDaBusca("50%_off")).toEqual({ padrao: "%50\\%\\_off%", digitos: null });
    expect(padraoDaBusca("(62) 9999-0000")?.digitos).toBe("6299990000");
    expect(padraoDaBusca("a")).toBeNull();
  });

  it("separa atendente e 'Sem atendente', donos de pessoa/agente/sem dono, e baixa a caixa das tags", () => {
    const c = compilarFiltrosDaFila(
      {
        conversas: { atendentes: ["nenhum", U1], criadaEm: { de: "2026-10-01" } },
        negocios: { donos: ["sem_dono", U2, `agent:${A1}`], data: { tipo: "perda", ate: "2026-10-18" } },
        contatos: { tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: " VIP " }] }] } },
      },
      "maria",
      "America/Sao_Paulo",
    );
    expect(c).toMatchObject({
      fuso: "America/Sao_Paulo",
      atendentes: [U1],
      sem_atendente: true,
      criada_de: "2026-10-01",
      negocio: { tem: "com", donos_usuarios: [U2], donos_agentes: [A1], sem_dono: true, data_tipo: "perda", data_ate: "2026-10-18", fuso: "America/Sao_Paulo" },
      tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: "vip" }] }] },
      busca: { padrao: "%maria%", digitos: null },
    });
    expect(compilarFiltrosDaFila({}, undefined, "UTC")).toEqual({ fuso: "UTC" });
  });
});

describe("as ações em massa (N12–N15)", () => {
  it("o alvo: os ids marcados, ou o filtro com a quantidade e os desmarcados", () => {
    expect(alvoDaSelecaoDaFila({ tipo: "ids", ids: [U1] }, { painel: {} })).toEqual({ tipo: "ids", ids: [U1] });
    expect(
      alvoDaSelecaoDaFila({ tipo: "todos", quantidade: null, excluidos: [U2] }, { painel: PAINEL_DO_PRESET.em_espera, busca: " ana " }),
    ).toEqual({ tipo: "filtro", f: JSON.stringify({ conversas: { status: ["em_espera"] } }), q: "ana", quantidade: null, excluidos: [U2] });
  });

  it("o pedido valida a ação e os parâmetros", () => {
    const alvo = { tipo: "ids", ids: [U1] };
    expect(pedidoDaFilaSchema.safeParse({ acao: "status", alvo, parametros: { status: "em_espera" } }).success).toBe(true);
    expect(pedidoDaFilaSchema.safeParse({ acao: "atendente", alvo, parametros: { user_id: null } }).success).toBe(true);
    expect(pedidoDaFilaSchema.safeParse({ acao: "status", alvo, parametros: { status: "arquivada" } }).success).toBe(false);
    expect(pedidoDaFilaSchema.safeParse({ acao: "incluir_tag", alvo, parametros: { tag: "" } }).success).toBe(false);
  });

  it("'1 conversa selecionada' e '56.128 conversas selecionadas' (número no formato brasileiro)", () => {
    expect(textoDasSelecionadas(1, t)).toBe("1 conversa selecionada");
    expect(textoDasSelecionadas(56128, t)).toBe("56.128 conversas selecionadas");
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-filtros-da-fila-regras.test.ts`
Expected: FAIL (módulos não existem).

- [ ] **Step 6: `filtros-da-fila.ts`**

Create `lib/escale/conversas/filtros-da-fila.ts`:

```ts
import { z } from "zod";

import { contarCondicoes, diaValido, tagsSchema } from "@/lib/escale/contatos/filtros";

import { PARAM_PRESET, PRESETS, presetDaUrl, type Preset } from "./presets";

/**
 * O PAINEL DE FILTROS DA FILA (fork Escale, Fase 3D; B1–B6 do PRD de Conversas;
 * Clint `index-CPsdLJFo`, `tr`/`jf`/`Xf`/`qf`).
 *
 * Uma forma só para a URL (`?f=`), o filtro salvo (`crm_filtros_das_listas`,
 * lista "conversas") e a tela. Os presets da 3A são valores deste painel
 * (`PAINEL_DO_PRESET`): escolher "Em espera" preenche "Status da conversa", e o
 * funil conta 1, como na Clint. Quem avalia é o banco (`fn_escale_conversa_passa`,
 * migration 9204), com o filtro compilado em `compilar-filtros-da-fila.ts`.
 */
export const STATUS_DA_FILA = ["em_espera", "em_aberto", "fechado", "arquivada"] as const;
export type StatusDaFila = (typeof STATUS_DA_FILA)[number];
/** Rótulos da Clint (c67); "Arquivada" é nosso (o original arquiva, a Clint não). Quem mostra passa por `t()`. */
export const ROTULO_DO_STATUS_DA_FILA: Readonly<Record<StatusDaFila, string>> = {
  em_espera: "Em espera",
  em_aberto: "Em aberto",
  fechado: "Fechado",
  arquivada: "Arquivada",
};

export const MARCAS = [
  "atribuidas_a_mim",
  "nao_atribuidas",
  "sem_resposta",
  "aguardando_contato",
  "em_transferencia",
  "lidas",
  "nao_lidas",
  "dentro_da_janela",
  "fora_da_janela",
  "suspensas",
] as const;
export type Marca = (typeof MARCAS)[number];
/** O original não guarda a janela de chamada (3B N20): os dois toggles ficam desligados com "Em breve". */
export const MARCAS_DE_CHAMADA = ["chamada_aberta", "chamada_fechada"] as const;
export type MarcaDeChamada = (typeof MARCAS_DE_CHAMADA)[number];
/** A ordem dos toggles da Clint (c32), com os dois de chamada no lugar deles. */
export const MARCAS_NA_TELA: ReadonlyArray<Marca | MarcaDeChamada> = [
  "atribuidas_a_mim",
  "nao_atribuidas",
  "sem_resposta",
  "aguardando_contato",
  "em_transferencia",
  "lidas",
  "nao_lidas",
  "dentro_da_janela",
  "fora_da_janela",
  "chamada_aberta",
  "chamada_fechada",
  "suspensas",
];
export const ROTULO_DA_MARCA: Readonly<Record<Marca | MarcaDeChamada, string>> = {
  atribuidas_a_mim: "Atribuídas a mim",
  nao_atribuidas: "Não atribuídas",
  sem_resposta: "Sem resposta do atendente",
  aguardando_contato: "Aguardando resposta do contato",
  em_transferencia: "Em transferência",
  lidas: "Lidas",
  nao_lidas: "Não lidas",
  dentro_da_janela: "Dentro da janela de conversa",
  fora_da_janela: "Fora da janela de conversa",
  chamada_aberta: "Janela de chamada aberta",
  chamada_fechada: "Janela de chamada fechada",
  suspensas: "Conversas suspensas",
};
/** Só valem no WhatsApp Oficial (o logo verde ao lado do toggle, c32). */
export const MARCAS_DO_OFICIAL: ReadonlyArray<Marca | MarcaDeChamada> = [
  "dentro_da_janela",
  "fora_da_janela",
  "chamada_aberta",
  "chamada_fechada",
];

export const SEM_ATENDENTE = "nenhum";
export const SEM_DONO = "sem_dono";
export const PREFIXO_DO_AGENTE = "agent:";
export const AGENTES_MAX = 20;
/** "Não informar" grava "Outro motivo" (3A N12): no filtro, é o motivo `other`. */
export const MOTIVO_NAO_INFORMADO = "other";
export const TIPOS_DE_DATA_DO_NEGOCIO = ["criacao", "ganho", "perda"] as const;
export type TipoDeDataDoNegocio = (typeof TIPOS_DE_DATA_DO_NEGOCIO)[number];
const STATUS_DO_NEGOCIO = ["open", "won", "lost"] as const;

const dia = z.string().refine(diaValido);
const uuid = z.string().uuid();
const DONO = /^(sem_dono|agent:[0-9a-f-]{36}|[0-9a-f-]{36})$/i;
const periodoSchema = z.object({ de: dia.optional(), ate: dia.optional() }).strict();

const conversasSchema = z
  .object({
    marcas: z.array(z.enum(MARCAS)).max(MARCAS.length).optional(),
    criadaEm: periodoSchema.optional(),
    status: z.array(z.enum(STATUS_DA_FILA)).max(STATUS_DA_FILA.length).optional(),
    atendentes: z.array(z.union([uuid, z.literal(SEM_ATENDENTE)])).max(200).optional(),
    agentes: z.array(uuid).max(AGENTES_MAX).optional(),
    setores: z.array(uuid).max(100).optional(),
  })
  .strict();

const negociosSchema = z
  .object({
    data: z
      .object({ tipo: z.enum(TIPOS_DE_DATA_DO_NEGOCIO), de: dia.optional(), ate: dia.optional() })
      .strict()
      .optional(),
    tem: z.enum(["com", "sem"]).optional(),
    status: z.array(z.enum(STATUS_DO_NEGOCIO)).max(3).optional(),
    motivos: z.array(z.string().min(1).max(200)).max(60).optional(),
    donos: z.array(z.string().regex(DONO)).max(100).optional(),
    grupos: z.array(uuid).max(50).optional(),
    origens: z.array(uuid).max(50).optional(),
    etapas: z.array(uuid).max(200).optional(),
  })
  .strict();

export const filtrosDaFilaSchema = z
  .object({
    conversas: conversasSchema.optional(),
    grupos: z.enum(["conversas", "grupos"]).optional(),
    negocios: negociosSchema.optional(),
    contatos: z.object({ tags: tagsSchema.optional() }).strict().optional(),
    canais: z.array(uuid).max(100).optional(),
  })
  .strict();

export type FiltrosDoPainel = z.infer<typeof filtrosDaFilaSchema>;
export type ConversasDoPainel = z.infer<typeof conversasSchema>;
export type NegociosDoPainel = z.infer<typeof negociosSchema>;
type TagsDoPainel = NonNullable<NonNullable<FiltrosDoPainel["contatos"]>["tags"]>;

// ─── Enxugar e comparar ────────────────────────────────────────────────────────
function lista<T extends string>(valores: readonly T[] | undefined, ordem?: readonly T[]): T[] | undefined {
  const unicos = [...new Set(valores ?? [])];
  if (unicos.length === 0) return undefined;
  return ordem ? ordem.filter((v) => unicos.includes(v)) : unicos.sort((a, b) => a.localeCompare(b));
}

function semVazios<T extends Record<string, unknown>>(objeto: T): T | undefined {
  const cheio = Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined));
  return Object.keys(cheio).length > 0 ? (cheio as T) : undefined;
}

function periodo(p: { de?: string; ate?: string } | undefined) {
  return p && (p.de || p.ate) ? semVazios({ de: p.de || undefined, ate: p.ate || undefined }) : undefined;
}

function enxugarConversas(c: ConversasDoPainel | undefined): ConversasDoPainel | undefined {
  if (!c) return undefined;
  return semVazios<ConversasDoPainel>({
    marcas: lista(c.marcas, MARCAS),
    criadaEm: periodo(c.criadaEm),
    status: lista(c.status, STATUS_DA_FILA),
    atendentes: lista(c.atendentes),
    agentes: lista(c.agentes),
    setores: lista(c.setores),
  });
}

function enxugarNegocios(n: NegociosDoPainel | undefined): NegociosDoPainel | undefined {
  if (!n) return undefined;
  const datas = periodo(n.data);
  return semVazios<NegociosDoPainel>({
    data: n.data && datas ? { tipo: n.data.tipo, ...datas } : undefined,
    tem: n.tem,
    status: lista(n.status, STATUS_DO_NEGOCIO),
    motivos: lista(n.motivos),
    donos: lista(n.donos),
    grupos: lista(n.grupos),
    origens: lista(n.origens),
    etapas: lista(n.etapas),
  });
}

/** Os grupos ficam na ordem montada (como a Clint); grupo sem condição sai; a tag é aparada. */
function enxugarTags(tg: TagsDoPainel | undefined): TagsDoPainel | undefined {
  const grupos = (tg?.grupos ?? [])
    .map((g) => ({
      modo: g.modo,
      condicoes: g.condicoes.map((c) =>
        c.op === "possui" || c.op === "nao_possui" ? { op: c.op, tag: c.tag.trim() } : { op: c.op },
      ),
    }))
    .filter((g) => g.condicoes.length > 0);
  return grupos.length > 0 ? ({ combinar: tg?.combinar ?? "ou", grupos } as TagsDoPainel) : undefined;
}

/** O painel sem nada vazio, na ordem fixa: é o que vai para a URL e para o salvo, e é sobre ele que se conta e compara. */
export function enxugarFiltrosDoPainel(f: FiltrosDoPainel): FiltrosDoPainel {
  const tags = enxugarTags(f.contatos?.tags);
  return (
    semVazios<FiltrosDoPainel>({
      conversas: enxugarConversas(f.conversas),
      grupos: f.grupos,
      negocios: enxugarNegocios(f.negocios),
      contatos: tags ? { tags } : undefined,
      canais: lista(f.canais),
    }) ?? {}
  );
}

export const mesmosFiltrosDoPainel = (a: FiltrosDoPainel, b: FiltrosDoPainel): boolean =>
  JSON.stringify(enxugarFiltrosDoPainel(a)) === JSON.stringify(enxugarFiltrosDoPainel(b));

// ─── Seções, contagem e limpar ─────────────────────────────────────────────────
export const SECOES_DA_FILA = ["conversas", "grupos", "negocios", "contatos", "canais"] as const;
export type SecaoDaFila = (typeof SECOES_DA_FILA)[number];

const CHAVES_DE_CONVERSAS = ["criadaEm", "status", "atendentes", "agentes", "setores"] as const;

/** O selo de cada acordeão (c64: status preenchido = 1; cada toggle conta 1). */
export function contarNaSecaoDaFila(f: FiltrosDoPainel, secao: SecaoDaFila): number {
  const e = enxugarFiltrosDoPainel(f);
  if (secao === "conversas") {
    const c = e.conversas;
    if (!c) return 0;
    return (c.marcas?.length ?? 0) + CHAVES_DE_CONVERSAS.filter((k) => c[k] !== undefined).length;
  }
  if (secao === "grupos") return e.grupos ? 1 : 0;
  if (secao === "negocios") return Object.keys(e.negocios ?? {}).length;
  if (secao === "contatos") return contarCondicoes(e.contatos?.tags?.grupos);
  return e.canais ? 1 : 0;
}

/** O selo do funil: a soma das seções. */
export const totalDeCriterios = (f: FiltrosDoPainel): number =>
  SECOES_DA_FILA.reduce((n, s) => n + contarNaSecaoDaFila(f, s), 0);

export const temCriterios = (f: FiltrosDoPainel): boolean => totalDeCriterios(f) > 0;

/** O X do acordeão: limpa só aquela seção. */
export function limparSecaoDaFila(f: FiltrosDoPainel, secao: SecaoDaFila): FiltrosDoPainel {
  const { [secao]: _fora, ...resto } = enxugarFiltrosDoPainel(f);
  return enxugarFiltrosDoPainel(resto);
}

// ─── Presets, salvos e o rótulo do botão ───────────────────────────────────────
export const PAINEL_DO_PRESET: Readonly<Record<Preset, FiltrosDoPainel>> = {
  todos: {},
  nao_lidas: { conversas: { marcas: ["nao_lidas"] } },
  meus_em_aberto: { conversas: { marcas: ["atribuidas_a_mim"], status: ["em_aberto"] } },
  em_aberto: { conversas: { status: ["em_aberto"] } },
  em_espera: { conversas: { status: ["em_espera"] } },
  fechadas: { conversas: { status: ["fechado"] } },
};

/** "Somente conversas" / "Somente grupos" (A4): só aparecem quando a organização tem grupo. */
export const PRESETS_DE_GRUPO = ["somente_conversas", "somente_grupos"] as const;
export type PresetDeGrupo = (typeof PRESETS_DE_GRUPO)[number];
export const PAINEL_DO_PRESET_DE_GRUPO: Readonly<Record<PresetDeGrupo, FiltrosDoPainel>> = {
  somente_conversas: { grupos: "conversas" },
  somente_grupos: { grupos: "grupos" },
};
export const ROTULO_DO_PRESET_DE_GRUPO: Readonly<Record<PresetDeGrupo, string>> = {
  somente_conversas: "Somente conversas",
  somente_grupos: "Somente grupos",
};

export function presetDoPainel(f: FiltrosDoPainel): Preset | PresetDeGrupo | null {
  const preset = PRESETS.find((p) => mesmosFiltrosDoPainel(PAINEL_DO_PRESET[p], f));
  if (preset) return preset;
  return PRESETS_DE_GRUPO.find((p) => mesmosFiltrosDoPainel(PAINEL_DO_PRESET_DE_GRUPO[p], f)) ?? null;
}

export type RotuloDoBotao =
  | { tipo: "preset"; preset: Preset }
  | { tipo: "grupo"; preset: PresetDeGrupo }
  | { tipo: "salvo"; id: string; nome: string }
  | { tipo: "personalizado" };

/** O texto do botão (c31, c71): o preset, o salvo aplicado, ou "Personalizado". */
export function rotuloDoBotao(
  f: FiltrosDoPainel,
  salvos: ReadonlyArray<{ id: string; nome: string; criterios: FiltrosDoPainel }>,
): RotuloDoBotao {
  const preset = presetDoPainel(f);
  if (preset && (PRESETS as readonly string[]).includes(preset)) return { tipo: "preset", preset: preset as Preset };
  if (preset) return { tipo: "grupo", preset: preset as PresetDeGrupo };
  const salvo = salvos.find((s) => mesmosFiltrosDoPainel(s.criterios, f));
  return salvo ? { tipo: "salvo", id: salvo.id, nome: salvo.nome } : { tipo: "personalizado" };
}

// ─── URL ───────────────────────────────────────────────────────────────────────
export const PARAM_DO_PAINEL = "f";

/** Texto → painel; vazio vira `{}`; lixo vira `null` (a rota responde 422). */
export function painelDoTexto(texto: string | null | undefined): FiltrosDoPainel | null {
  if (!texto) return {};
  try {
    const lido = filtrosDaFilaSchema.safeParse(JSON.parse(texto));
    return lido.success ? enxugarFiltrosDoPainel(lido.data) : null;
  } catch {
    return null;
  }
}

/** O painel da URL: `?f=` manda; sem ele, o preset de `?v=` (3A); lixo vira vazio. */
export function painelDaUrl(params: { get(chave: string): string | null }): FiltrosDoPainel {
  const texto = params.get(PARAM_DO_PAINEL);
  if (texto) return painelDoTexto(texto) ?? {};
  return PAINEL_DO_PRESET[presetDaUrl(params.get(PARAM_PRESET))];
}

/** O que vai para a URL: preset em `?v=` (o da 3A), o resto em `?f=`, nada quando vazio. */
export function paramsDoPainel(f: FiltrosDoPainel): { v: string | null; f: string | null } {
  const e = enxugarFiltrosDoPainel(f);
  if (!temCriterios(e)) return { v: null, f: null };
  const preset = presetDoPainel(e);
  if (preset && (PRESETS as readonly string[]).includes(preset)) return { v: preset, f: null };
  return { v: null, f: JSON.stringify(e) };
}
```

Confira em `lib/escale/conversas/presets.ts` (3A) que `PRESETS`, `PARAM_PRESET` e `presetDaUrl` estão exportados com esses nomes (estão, Task 1 da 3A).

- [ ] **Step 7: `compilar-filtros-da-fila.ts`**

Create `lib/escale/conversas/compilar-filtros-da-fila.ts`:

```ts
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { buscaValeConsulta, normalizarTermoDeBusca } from "@/lib/inbox/termo-de-busca";

import {
  PREFIXO_DO_AGENTE,
  SEM_ATENDENTE,
  SEM_DONO,
  enxugarFiltrosDoPainel,
  type FiltrosDoPainel,
  type Marca,
  type StatusDaFila,
  type TipoDeDataDoNegocio,
} from "./filtros-da-fila";

/**
 * O FILTRO COMPILADO (fork Escale, Fase 3D): o que `fn_escale_conversa_passa`
 * (9204) lê. Só o servidor compila: o navegador nunca manda padrão de busca nem
 * fuso. A busca segue o handler do original (`normalizarTermoDeBusca`; o `*` que
 * ele põe vira `%` do `ilike`, e `%`/`_` digitados são escapados); as tags ficam
 * minúsculas (a régua da 2B); os donos se separam em pessoas, agentes e "sem dono".
 */
export type FiltroDaFilaCompilado = {
  fuso: string;
  marcas?: Marca[];
  criada_de?: string;
  criada_ate?: string;
  status?: StatusDaFila[];
  atendentes?: string[];
  sem_atendente?: boolean;
  agentes?: string[];
  setores?: string[];
  grupos?: "conversas" | "grupos";
  negocio?: {
    fuso: string;
    tem: "com" | "sem";
    status: string[];
    motivos: string[];
    donos_usuarios: string[];
    donos_agentes: string[];
    sem_dono: boolean;
    grupos: string[];
    origens: string[];
    etapas: string[];
    data_tipo?: TipoDeDataDoNegocio;
    data_de?: string;
    data_ate?: string;
  };
  tags?: {
    combinar: "e" | "ou";
    grupos: Array<{ modo: "e" | "ou"; condicoes: Array<{ op: string; tag: string | null }> }>;
  };
  canais?: string[];
  busca?: { padrao: string; digitos: string | null };
};

const DIGITOS_MIN = 4;
const tagNormalizada = (tag: string): string => (normalizarTags([tag])[0] ?? tag.trim()).toLowerCase();

/** O padrão do `ilike` e os dígitos do telefone (só a partir de 4, como o original). */
export function padraoDaBusca(bruto: string): { padrao: string; digitos: string | null } | null {
  if (!buscaValeConsulta(bruto)) return null;
  const termo = normalizarTermoDeBusca(bruto).trim();
  const escapado = termo.replace(/[\\%_]/g, (m) => `\\${m}`).replace(/\*/g, "%");
  const digitos = termo.replace(/\D/g, "");
  return { padrao: `%${escapado}%`, digitos: digitos.length >= DIGITOS_MIN ? digitos : null };
}

export function compilarFiltrosDaFila(
  painel: FiltrosDoPainel,
  busca: string | undefined,
  fuso: string,
): FiltroDaFilaCompilado {
  const f = enxugarFiltrosDoPainel(painel);
  const c = f.conversas;
  const n = f.negocios;
  const atendentes = c?.atendentes ?? [];
  const donos = n?.donos ?? [];
  const padrao = busca ? padraoDaBusca(busca) : null;
  return {
    fuso,
    ...(c?.marcas ? { marcas: c.marcas } : {}),
    ...(c?.criadaEm?.de ? { criada_de: c.criadaEm.de } : {}),
    ...(c?.criadaEm?.ate ? { criada_ate: c.criadaEm.ate } : {}),
    ...(c?.status ? { status: c.status } : {}),
    ...(atendentes.length
      ? {
          atendentes: atendentes.filter((a) => a !== SEM_ATENDENTE),
          sem_atendente: atendentes.includes(SEM_ATENDENTE),
        }
      : {}),
    ...(c?.agentes ? { agentes: c.agentes } : {}),
    ...(c?.setores ? { setores: c.setores } : {}),
    ...(f.grupos ? { grupos: f.grupos } : {}),
    ...(n
      ? {
          negocio: {
            fuso,
            tem: n.tem ?? "com",
            status: n.status ?? [],
            motivos: n.motivos ?? [],
            donos_usuarios: donos.filter((d) => d !== SEM_DONO && !d.startsWith(PREFIXO_DO_AGENTE)),
            donos_agentes: donos.filter((d) => d.startsWith(PREFIXO_DO_AGENTE)).map((d) => d.slice(PREFIXO_DO_AGENTE.length)),
            sem_dono: donos.includes(SEM_DONO),
            grupos: n.grupos ?? [],
            origens: n.origens ?? [],
            etapas: n.etapas ?? [],
            ...(n.data ? { data_tipo: n.data.tipo } : {}),
            ...(n.data?.de ? { data_de: n.data.de } : {}),
            ...(n.data?.ate ? { data_ate: n.data.ate } : {}),
          },
        }
      : {}),
    ...(f.contatos?.tags
      ? {
          tags: {
            combinar: f.contatos.tags.combinar,
            grupos: f.contatos.tags.grupos.map((g) => ({
              modo: g.modo,
              condicoes: g.condicoes.map((k) => ({
                op: k.op,
                tag: k.op === "possui" || k.op === "nao_possui" ? tagNormalizada(k.tag) : null,
              })),
            })),
          },
        }
      : {}),
    ...(f.canais ? { canais: f.canais } : {}),
    ...(padrao ? { busca: padrao } : {}),
  };
}
```

- [ ] **Step 8: `acoes-em-massa-da-fila.ts`**

Create `lib/escale/conversas/acoes-em-massa-da-fila.ts`:

```ts
import { z } from "zod";

import { IDS_MAX, type Selecao } from "@/lib/escale/contatos/selecao";

import { enxugarFiltrosDoPainel, temCriterios, type FiltrosDoPainel } from "./filtros-da-fila";

/**
 * AS AÇÕES EM MASSA DA FILA (fork Escale, Fase 3D; B8; Clint `up`/`cp` de
 * `index-YQu0gzVE`): Alterar status, atendente, setor e a tag do contato. Até
 * `LIMITE_IMEDIATO` conversas a rota executa na hora; acima, o consumidor do
 * `event_log` faz em lotes (migration 9204).
 */
export const ACOES_DA_FILA = ["status", "atendente", "setor", "incluir_tag", "remover_tag"] as const;
export type AcaoDaFila = (typeof ACOES_DA_FILA)[number];
/** A ordem da Clint (c27). */
export const STATUS_DA_ACAO = ["em_aberto", "fechado", "em_espera"] as const;
export type StatusDaAcao = (typeof STATUS_DA_ACAO)[number];
export const ROTULO_DO_STATUS_DA_ACAO: Readonly<Record<StatusDaAcao, string>> = {
  em_aberto: "Em aberto",
  fechado: "Fechado",
  em_espera: "Em espera",
};
export const LIMITE_IMEDIATO = 50;
export const CONVERSAS_POR_ACAO_MAX = 100_000;
export const EVENTO_DA_MASSA_DA_FILA = "conversas.acao_em_massa_requested";

const uuid = z.string().uuid();
const tag = z.string().trim().min(1).max(40);

export const alvoDaFilaSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("ids"), ids: z.array(uuid).min(1).max(IDS_MAX) }).strict(),
  z
    .object({
      tipo: z.literal("filtro"),
      f: z.string().max(16384).optional(),
      q: z.string().max(200).optional(),
      quantidade: z.number().int().min(1).max(CONVERSAS_POR_ACAO_MAX).nullable(),
      excluidos: z.array(uuid).max(IDS_MAX),
    })
    .strict(),
]);
export type AlvoDaFila = z.infer<typeof alvoDaFilaSchema>;

export const pedidoDaFilaSchema = z.discriminatedUnion("acao", [
  z
    .object({ acao: z.literal("status"), alvo: alvoDaFilaSchema, parametros: z.object({ status: z.enum(STATUS_DA_ACAO) }).strict() })
    .strict(),
  z
    .object({ acao: z.literal("atendente"), alvo: alvoDaFilaSchema, parametros: z.object({ user_id: uuid.nullable() }).strict() })
    .strict(),
  z.object({ acao: z.literal("setor"), alvo: alvoDaFilaSchema, parametros: z.object({ setor_id: uuid }).strict() }).strict(),
  z.object({ acao: z.literal("incluir_tag"), alvo: alvoDaFilaSchema, parametros: z.object({ tag }).strict() }).strict(),
  z.object({ acao: z.literal("remover_tag"), alvo: alvoDaFilaSchema, parametros: z.object({ tag }).strict() }).strict(),
]);
export type PedidoDaFila = z.infer<typeof pedidoDaFilaSchema>;

export type EstadoDaAcaoDaFila = "preparando" | "na_fila" | "processando" | "concluida" | "falhou";
export interface ResumoDaAcaoDaFila {
  id: string;
  acao: AcaoDaFila;
  status: EstadoDaAcaoDaFila;
  total: number;
  feitos: number;
  falhas: number;
}
export const acaoRodando = (s: EstadoDaAcaoDaFila): boolean =>
  s === "preparando" || s === "na_fila" || s === "processando";

/** A seleção vira o alvo: no modo "todos", vai o filtro (nunca a lista de ids). */
export function alvoDaSelecaoDaFila(s: Selecao, consulta: { painel: FiltrosDoPainel; busca?: string }): AlvoDaFila {
  if (s.tipo === "ids") return { tipo: "ids", ids: [...s.ids] };
  const enxuto = enxugarFiltrosDoPainel(consulta.painel);
  const q = consulta.busca?.trim();
  return {
    tipo: "filtro",
    ...(temCriterios(enxuto) ? { f: JSON.stringify(enxuto) } : {}),
    ...(q ? { q } : {}),
    quantidade: s.quantidade,
    excluidos: [...s.excluidos],
  };
}

/** "1 conversa selecionada" / "{n} conversas selecionadas" (`label.tPluralSelectedConversation`), número brasileiro. */
export function textoDasSelecionadas(n: number, t: (texto: string) => string): string {
  return n === 1
    ? t("1 conversa selecionada")
    : t("{n} conversas selecionadas").replace("{n}", n.toLocaleString("pt-BR"));
}
```

- [ ] **Step 9: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-filtros-da-fila-regras.test.ts tests/unit/escale-filtros-de-contatos.test.ts && corepack pnpm prettier --write lib/escale/conversas/filtros-da-fila.ts lib/escale/conversas/compilar-filtros-da-fila.ts lib/escale/conversas/acoes-em-massa-da-fila.ts tests/unit/escale-filtros-da-fila-regras.test.ts && corepack pnpm eslint lib/escale/conversas lib/escale/contatos/filtros.ts && corepack pnpm typecheck`
Expected: PASS. (Se `tests/unit/escale-filtros-de-contatos.test.ts` tiver outro nome, rode o teste que importa `@/lib/escale/contatos/filtros`: `grep -rl "lib/escale/contatos/filtros" tests/unit`.)

- [ ] **Step 10: Commit**

```bash
git add docs/superpowers/plans lib/escale/conversas/filtros-da-fila.ts lib/escale/conversas/compilar-filtros-da-fila.ts lib/escale/conversas/acoes-em-massa-da-fila.ts lib/escale/contatos/filtros.ts tests/unit/escale-filtros-da-fila-regras.test.ts
git commit -m "feat(escale): regras do painel de filtros, do filtro compilado e das ações em massa da fila (Fase 3D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Migration 9204 — o filtro no banco, a lista, o total e as ações em massa

**Files:**
- Create: `supabase/migrations/20261105120000_9204_filtros_e_acoes_em_massa_da_fila.sql`, `tests/invariants/escale-fila-e-massa-9204.test.ts`
- Modify: `supabase/baseline.sql`, `tests/invariants/rls-completude-varredura.test.ts`

**Interfaces (Produces):**
- `fn_escale_negocio_da_fila_passa(p_org uuid, p_contato uuid, p_negocio jsonb) → boolean`
- `fn_escale_conversa_passa(p_c public.conversations, p_f jsonb) → boolean`
- `fn_escale_fila_da_casca(p_org uuid, p_filtros jsonb, p_ordem text, p_depois_sort timestamptz, p_depois_id uuid, p_depois_nulo boolean, p_limite integer) → setof public.conversations`
- `fn_escale_contar_fila_da_casca(p_org uuid, p_filtros jsonb) → integer`
- tabelas `crm_acoes_em_massa_conversas (id, organization_id, user_id, acao, parametros, status, total, feitos, falhas, erros, created_at, updated_at)` e `crm_acoes_em_massa_conversas_itens (acao_id, organization_id, conversation_id, posicao, feito)`
- `fn_escale_criar_acao_em_massa_de_conversas(p_org uuid, p_acao text, p_parametros jsonb, p_ids uuid[], p_filtros jsonb, p_quantidade integer, p_excluidos uuid[], p_imediato_ate integer) → table (acao_id uuid, quantidade integer, status text)`; emite `conversas.acao_em_massa_requested` só quando `quantidade > p_imediato_ate`.

- [ ] **Step 1: A colisão**

```bash
bash scripts/checar-colisao-de-migration.sh escale-crm/main
```

Expected: sem `9204` em nenhuma branch.

- [ ] **Step 2: A migration**

Create `supabase/migrations/20261105120000_9204_filtros_e_acoes_em_massa_da_fila.sql`:

```sql
-- manifest: **Filtros e ações em massa da fila de Conversas (fork Escale, Fase 3D).** O painel de filtros da casca avaliado no banco com a RLS de quem olha (`fn_escale_conversa_passa`, invoker: status pelo mapa da seção 6 do PRD, os toggles, data do atendimento, atendentes, agentes, setor efetivo da 3C, grupos, canais, tags do contato, negócios do contato por `fn_escale_negocio_da_fila_passa`, a busca e as exclusões do Inbox original — contato pessoal e canal desativado); a página da fila (`fn_escale_fila_da_casca`, setof conversations, ordem e cursor) e o total (`fn_escale_contar_fila_da_casca`); as ações em massa (`crm_acoes_em_massa_conversas` e `_itens`: cada um vê as suas, só quem tem "Ações em massa" — `fn_crm_pode(org, 'CHAT_BULK_ACTIONS')` — cria, e quem pediu só fecha o preparo) e `fn_escale_criar_acao_em_massa_de_conversas` (invoker: resolve as conversas pelos ids ou pelo filtro, até 100.000, e emite `conversas.acao_em_massa_requested` acima do limite da execução imediata). Nenhuma função definer.
-- ---- FORK ESCALE · filtros e ações em massa da fila de Conversas (migration 9204) ----

-- ── 1. Negócios: algum negócio visível do contato cumpre TODOS os critérios ──
create or replace function public.fn_escale_negocio_da_fila_passa(p_org uuid, p_contato uuid, p_negocio jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select (coalesce(p_negocio ->> 'tem', 'com') = 'com') = exists (
    select 1
      from public.crm_leads l
      join public.crm_pipelines p on p.id = l.pipeline_id
     where l.organization_id = p_org
       and l.contact_id = p_contato
       and not p.is_archived
       and (jsonb_array_length(coalesce(p_negocio -> 'grupos', '[]'::jsonb)) = 0
            or p.group_id::text in (select jsonb_array_elements_text(p_negocio -> 'grupos')))
       and (jsonb_array_length(coalesce(p_negocio -> 'origens', '[]'::jsonb)) = 0
            or l.pipeline_id::text in (select jsonb_array_elements_text(p_negocio -> 'origens')))
       and (jsonb_array_length(coalesce(p_negocio -> 'etapas', '[]'::jsonb)) = 0
            or l.stage_id::text in (select jsonb_array_elements_text(p_negocio -> 'etapas')))
       and (jsonb_array_length(coalesce(p_negocio -> 'status', '[]'::jsonb)) = 0
            or l.status in (select jsonb_array_elements_text(p_negocio -> 'status')))
       and (
         (jsonb_array_length(coalesce(p_negocio -> 'donos_usuarios', '[]'::jsonb)) = 0
          and jsonb_array_length(coalesce(p_negocio -> 'donos_agentes', '[]'::jsonb)) = 0
          and not coalesce((p_negocio ->> 'sem_dono')::boolean, false))
         or l.owner_user_id::text in (select jsonb_array_elements_text(coalesce(p_negocio -> 'donos_usuarios', '[]'::jsonb)))
         or l.owner_agent_id::text in (select jsonb_array_elements_text(coalesce(p_negocio -> 'donos_agentes', '[]'::jsonb)))
         or (coalesce((p_negocio ->> 'sem_dono')::boolean, false)
             and l.owner_user_id is null and l.owner_agent_id is null)
       )
       and (jsonb_array_length(coalesce(p_negocio -> 'motivos', '[]'::jsonb)) = 0
            or (l.status = 'lost' and l.lost_reason in (select jsonb_array_elements_text(p_negocio -> 'motivos'))))
       and (case p_negocio ->> 'data_tipo'
              when 'criacao' then
                (p_negocio ->> 'data_de' is null
                 or (l.created_at at time zone (p_negocio ->> 'fuso'))::date >= (p_negocio ->> 'data_de')::date)
                and (p_negocio ->> 'data_ate' is null
                 or (l.created_at at time zone (p_negocio ->> 'fuso'))::date <= (p_negocio ->> 'data_ate')::date)
              when 'ganho' then
                l.status = 'won'
                and (p_negocio ->> 'data_de' is null
                 or (l.closed_at at time zone (p_negocio ->> 'fuso'))::date >= (p_negocio ->> 'data_de')::date)
                and (p_negocio ->> 'data_ate' is null
                 or (l.closed_at at time zone (p_negocio ->> 'fuso'))::date <= (p_negocio ->> 'data_ate')::date)
              when 'perda' then
                l.status = 'lost'
                and (p_negocio ->> 'data_de' is null
                 or (l.closed_at at time zone (p_negocio ->> 'fuso'))::date >= (p_negocio ->> 'data_de')::date)
                and (p_negocio ->> 'data_ate' is null
                 or (l.closed_at at time zone (p_negocio ->> 'fuso'))::date <= (p_negocio ->> 'data_ate')::date)
              else true
            end)
  )
$$;

-- ── 2. Uma conversa passa no filtro do painel? ───────────────────────────────
-- p_f é o FiltroDaFilaCompilado da rota (lib/escale/conversas/compilar-filtros-da-fila.ts).
-- Pares opostos de toggles somam por OU; grupos diferentes se juntam por E.
create or replace function public.fn_escale_conversa_passa(p_c public.conversations, p_f jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    -- 1. o que o Inbox original esconde: contato pessoal e canal desativado
    not exists (select 1 from public.contacts ct where ct.id = (p_c).contact_id and ct.is_personal)
    and not exists (select 1 from public.channel_sessions s
                     where s.id = (p_c).channel_session_id and s.metadata ->> 'disabled' = 'true')
    -- 2. a busca: a prévia, o nome e o telefone do contato (anonimizado e pessoal não se acham pelo nome)
    and (p_f -> 'busca' is null
         or (p_c).last_message_preview ilike (p_f #>> '{busca,padrao}')
         or exists (select 1 from public.contacts ct
                     where ct.id = (p_c).contact_id and not ct.is_anonymized and not ct.is_personal
                       and (ct.display_name ilike (p_f #>> '{busca,padrao}')
                            or ct.name ilike (p_f #>> '{busca,padrao}')
                            or ((p_f #>> '{busca,digitos}') is not null
                                and ct.phone_number like '%' || (p_f #>> '{busca,digitos}') || '%'))))
    -- 3. status da conversa (seção 6 do PRD): cada valor soma por OU
    and (jsonb_array_length(coalesce(p_f -> 'status', '[]'::jsonb)) = 0
         or ((p_f -> 'status') ? 'em_aberto'
             and (p_c).status in ('open', 'pending', 'claimed', 'ai_handling')
             and not coalesce((p_c).snooze_until > now(), false))
         or ((p_f -> 'status') ? 'em_espera'
             and (p_c).status in ('open', 'pending', 'claimed', 'ai_handling')
             and coalesce((p_c).snooze_until > now(), false))
         or ((p_f -> 'status') ? 'fechado' and (p_c).status in ('closed', 'resolved'))
         or ((p_f -> 'status') ? 'arquivada' and (p_c).status = 'archived'))
    -- 4. os toggles
    and (not (coalesce(p_f -> 'marcas', '[]'::jsonb) ?| array['atribuidas_a_mim', 'nao_atribuidas'])
         or ((p_f -> 'marcas') ? 'atribuidas_a_mim' and (p_c).assigned_to_user_id = auth.uid())
         or ((p_f -> 'marcas') ? 'nao_atribuidas' and (p_c).assigned_to_user_id is null))
    and (not (coalesce(p_f -> 'marcas', '[]'::jsonb) ?| array['sem_resposta', 'aguardando_contato'])
         or ((p_f -> 'marcas') ? 'sem_resposta' and (p_c).awaiting_since is not null)
         or ((p_f -> 'marcas') ? 'aguardando_contato'
             and (p_c).last_outbound_at is not null
             and ((p_c).last_inbound_at is null or (p_c).last_outbound_at > (p_c).last_inbound_at)))
    and (not (coalesce(p_f -> 'marcas', '[]'::jsonb) ?| array['lidas', 'nao_lidas'])
         or ((p_f -> 'marcas') ? 'lidas' and (p_c).unread_count_for_assignee = 0)
         or ((p_f -> 'marcas') ? 'nao_lidas' and (p_c).unread_count_for_assignee > 0))
    and (not (coalesce(p_f -> 'marcas', '[]'::jsonb) ?| array['dentro_da_janela', 'fora_da_janela'])
         or (exists (select 1 from public.channel_sessions s
                      where s.id = (p_c).channel_session_id and s.provider = 'meta_cloud')
             and (((p_f -> 'marcas') ? 'dentro_da_janela'
                   and (p_c).last_inbound_at > now() - interval '24 hours')
                  or ((p_f -> 'marcas') ? 'fora_da_janela'
                      and ((p_c).last_inbound_at is null or (p_c).last_inbound_at <= now() - interval '24 hours')))))
    and (not coalesce((p_f -> 'marcas') ? 'em_transferencia', false)
         or exists (select 1 from public.crm_setor_da_conversa s
                     where s.conversation_id = (p_c).id and s.em_transferencia))
    and (not coalesce((p_f -> 'marcas') ? 'suspensas', false)
         or exists (select 1 from public.crm_pausas_de_automacao pa
                     where pa.conversation_id = (p_c).id and (pa.ate is null or pa.ate > now())))
    -- 5. data de criação do atendimento (no fuso da organização)
    and (p_f ->> 'criada_de' is null
         or (coalesce((p_c).service_started_at, (p_c).created_at) at time zone (p_f ->> 'fuso'))::date
            >= (p_f ->> 'criada_de')::date)
    and (p_f ->> 'criada_ate' is null
         or (coalesce((p_c).service_started_at, (p_c).created_at) at time zone (p_f ->> 'fuso'))::date
            <= (p_f ->> 'criada_ate')::date)
    -- 6. atendentes, agentes de IA e setores (o setor efetivo da 3C)
    and ((jsonb_array_length(coalesce(p_f -> 'atendentes', '[]'::jsonb)) = 0
          and not coalesce((p_f ->> 'sem_atendente')::boolean, false))
         or (p_c).assigned_to_user_id::text in (select jsonb_array_elements_text(coalesce(p_f -> 'atendentes', '[]'::jsonb)))
         or (coalesce((p_f ->> 'sem_atendente')::boolean, false) and (p_c).assigned_to_user_id is null))
    and (jsonb_array_length(coalesce(p_f -> 'agentes', '[]'::jsonb)) = 0
         or ((p_c).assignee_kind = 'ai'
             and (p_c).active_ai_agent_id::text in (select jsonb_array_elements_text(p_f -> 'agentes'))))
    and (jsonb_array_length(coalesce(p_f -> 'setores', '[]'::jsonb)) = 0
         or coalesce(
              (select s.setor_id from public.crm_setor_da_conversa s where s.conversation_id = (p_c).id),
              (select d.setor_id from public.crm_setor_do_dispositivo d where d.channel_session_id = (p_c).channel_session_id)
            )::text in (select jsonb_array_elements_text(p_f -> 'setores')))
    -- 7. grupos de WhatsApp
    and (case p_f ->> 'grupos' when 'conversas' then not (p_c).is_group when 'grupos' then (p_c).is_group else true end)
    -- 8. canais e dispositivos
    and (jsonb_array_length(coalesce(p_f -> 'canais', '[]'::jsonb)) = 0
         or (p_c).channel_session_id::text in (select jsonb_array_elements_text(p_f -> 'canais')))
    -- 9. contatos › tags (as do contato, sem caixa: a 5b da 9102)
    and (p_f -> 'tags' is null
         or exists (select 1 from public.contacts ct
                     where ct.id = (p_c).contact_id and public.fn_escale_tags_passam(ct.tags, p_f -> 'tags')))
    -- 10. negócios do contato
    and (p_f -> 'negocio' is null
         or public.fn_escale_negocio_da_fila_passa((p_c).organization_id, (p_c).contact_id, p_f -> 'negocio'))
$$;

-- ── 3. A página da fila: ordem e cursor por chave ────────────────────────────
create or replace function public.fn_escale_fila_da_casca(
  p_org uuid,
  p_filtros jsonb,
  p_ordem text default 'interacao',
  p_depois_sort timestamptz default null,
  p_depois_id uuid default null,
  p_depois_nulo boolean default false,
  p_limite integer default 51
)
returns setof public.conversations
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select c.*
    from public.conversations c
   where c.organization_id = p_org
     and public.fn_escale_conversa_passa(c, coalesce(p_filtros, '{}'::jsonb))
     and (p_depois_id is null
          or (p_ordem = 'espera' and (
                (not p_depois_nulo and (c.awaiting_since > p_depois_sort
                                        or (c.awaiting_since = p_depois_sort and c.id > p_depois_id)
                                        or c.awaiting_since is null))
                or (p_depois_nulo and c.awaiting_since is null and c.id > p_depois_id)))
          or (p_ordem <> 'espera' and (
                (not p_depois_nulo and (c.last_message_at < p_depois_sort
                                        or (c.last_message_at = p_depois_sort and c.id < p_depois_id)
                                        or c.last_message_at is null))
                or (p_depois_nulo and c.last_message_at is null and c.id < p_depois_id))))
   order by
     case when p_ordem = 'espera' then c.awaiting_since end asc nulls last,
     case when p_ordem = 'espera' then c.id end asc,
     case when p_ordem <> 'espera' then c.last_message_at end desc nulls last,
     case when p_ordem <> 'espera' then c.id end desc
   limit least(greatest(coalesce(p_limite, 51), 1), 101)
$$;

create or replace function public.fn_escale_contar_fila_da_casca(p_org uuid, p_filtros jsonb)
returns integer
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select count(*)::integer
    from public.conversations c
   where c.organization_id = p_org
     and public.fn_escale_conversa_passa(c, coalesce(p_filtros, '{}'::jsonb))
$$;

-- ── 4. As ações em massa ─────────────────────────────────────────────────────
create table if not exists public.crm_acoes_em_massa_conversas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  acao text not null,
  parametros jsonb not null default '{}'::jsonb,
  status text not null default 'preparando',
  total integer not null default 0,
  feitos integer not null default 0,
  falhas integer not null default 0,
  erros jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_acoes_em_massa_conversas_acao_valida
    check (acao in ('status', 'atendente', 'setor', 'incluir_tag', 'remover_tag')),
  constraint crm_acoes_em_massa_conversas_status_valido
    check (status in ('preparando', 'na_fila', 'processando', 'concluida', 'falhou')),
  constraint crm_acoes_em_massa_conversas_parametros_objeto
    check (jsonb_typeof(parametros) = 'object' and octet_length(parametros::text) <= 8192),
  constraint crm_acoes_em_massa_conversas_erros_lista
    check (jsonb_typeof(erros) = 'array' and octet_length(erros::text) <= 32768),
  constraint crm_acoes_em_massa_conversas_contagens
    check (total between 0 and 100000 and feitos >= 0 and falhas >= 0),
  constraint crm_acoes_em_massa_conversas_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
create index if not exists idx_crm_acoes_em_massa_conversas_pessoa
  on public.crm_acoes_em_massa_conversas (user_id, organization_id, created_at desc);

-- Sem FK na conversa: a conversa pode ser apagada enquanto o lote anda.
create table if not exists public.crm_acoes_em_massa_conversas_itens (
  acao_id uuid not null references public.crm_acoes_em_massa_conversas(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null,
  posicao integer not null,
  feito boolean not null default false,
  primary key (acao_id, conversation_id)
);
create index if not exists idx_crm_acoes_em_massa_conversas_itens_fila
  on public.crm_acoes_em_massa_conversas_itens (acao_id, feito, posicao);

alter table public.crm_acoes_em_massa_conversas enable row level security;
alter table public.crm_acoes_em_massa_conversas_itens enable row level security;
drop policy if exists crm_acoes_em_massa_conversas_select on public.crm_acoes_em_massa_conversas;
drop policy if exists crm_acoes_em_massa_conversas_insert on public.crm_acoes_em_massa_conversas;
drop policy if exists crm_acoes_em_massa_conversas_preparo on public.crm_acoes_em_massa_conversas;
drop policy if exists crm_acoes_em_massa_conversas_itens_select on public.crm_acoes_em_massa_conversas_itens;
drop policy if exists crm_acoes_em_massa_conversas_itens_insert on public.crm_acoes_em_massa_conversas_itens;

-- Cada um vê as suas.
create policy crm_acoes_em_massa_conversas_select on public.crm_acoes_em_massa_conversas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid())
  );
-- Só quem tem "Ações em massa" pede; nasce preparando e zerada.
create policy crm_acoes_em_massa_conversas_insert on public.crm_acoes_em_massa_conversas
  for insert with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and public.fn_crm_pode(organization_id, 'CHAT_BULK_ACTIONS')
    and user_id = auth.uid()
    and status = 'preparando'
    and total = 0 and feitos = 0 and falhas = 0
  );
-- Quem pediu só fecha o preparo; o resto é do consumidor (service role).
create policy crm_acoes_em_massa_conversas_preparo on public.crm_acoes_em_massa_conversas
  for update
  using (
    (organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid() and status = 'preparando'
  )
  with check (
    (organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid()
    and status in ('preparando', 'na_fila') and feitos = 0 and falhas = 0
  );
create policy crm_acoes_em_massa_conversas_itens_select on public.crm_acoes_em_massa_conversas_itens
  for select using (
    exists (select 1 from public.crm_acoes_em_massa_conversas a
             where a.id = crm_acoes_em_massa_conversas_itens.acao_id and a.user_id = auth.uid())
  );
create policy crm_acoes_em_massa_conversas_itens_insert on public.crm_acoes_em_massa_conversas_itens
  for insert with check (
    exists (select 1 from public.crm_acoes_em_massa_conversas a
             where a.id = crm_acoes_em_massa_conversas_itens.acao_id
               and a.organization_id = crm_acoes_em_massa_conversas_itens.organization_id
               and a.user_id = auth.uid()
               and a.status = 'preparando')
  );

revoke all on public.crm_acoes_em_massa_conversas from anon;
revoke all on public.crm_acoes_em_massa_conversas_itens from anon;
grant select, insert, update on public.crm_acoes_em_massa_conversas to authenticated;
grant select, insert on public.crm_acoes_em_massa_conversas_itens to authenticated;
grant all on public.crm_acoes_em_massa_conversas to service_role;
grant all on public.crm_acoes_em_massa_conversas_itens to service_role;

drop trigger if exists trg_crm_acoes_em_massa_conversas_updated_at on public.crm_acoes_em_massa_conversas;
create trigger trg_crm_acoes_em_massa_conversas_updated_at
  before update on public.crm_acoes_em_massa_conversas
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_acoes_em_massa_conversas is
  'Ações em massa da fila de Conversas da casca (fork Escale, migration 9204; B8). Quem tem "Ações em massa" (fn_crm_pode CHAT_BULK_ACTIONS) cria e vê as suas; até o limite imediato a rota executa, acima o consumidor do event_log processa com o service role.';

-- ── 5. Pedir a ação: uma transação, com a RLS de quem pede ───────────────────
create or replace function public.fn_escale_criar_acao_em_massa_de_conversas(
  p_org uuid,
  p_acao text,
  p_parametros jsonb,
  p_ids uuid[],
  p_filtros jsonb,
  p_quantidade integer,
  p_excluidos uuid[],
  p_imediato_ate integer default 50
)
returns table (acao_id uuid, quantidade integer, status text)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_total integer;
begin
  if not public.fn_crm_pode(p_org, 'CHAT_BULK_ACTIONS') then
    raise exception 'acao_em_massa_sem_permissao: sem a permissão Ações em massa' using errcode = 'P0001';
  end if;

  insert into public.crm_acoes_em_massa_conversas (organization_id, user_id, acao, parametros)
  values (p_org, auth.uid(), p_acao, coalesce(p_parametros, '{}'::jsonb))
  returning id into v_id;

  if p_ids is not null then
    insert into public.crm_acoes_em_massa_conversas_itens (acao_id, organization_id, conversation_id, posicao)
    select v_id, p_org, c.id, row_number() over (order by c.last_message_at desc nulls last, c.id desc)
      from public.conversations c
     where c.organization_id = p_org
       and c.id = any(p_ids);
  else
    insert into public.crm_acoes_em_massa_conversas_itens (acao_id, organization_id, conversation_id, posicao)
    select v_id, p_org, s.id, s.posicao
      from (
        select c.id, row_number() over (order by c.last_message_at desc nulls last, c.id desc) as posicao
          from public.conversations c
         where c.organization_id = p_org
           and public.fn_escale_conversa_passa(c, coalesce(p_filtros, '{}'::jsonb))
      ) s
     where s.posicao <= least(coalesce(p_quantidade, 100001), 100001)
       and not (s.id = any(coalesce(p_excluidos, '{}'::uuid[])));
  end if;
  get diagnostics v_total = row_count;

  if v_total = 0 then
    raise exception 'acao_em_massa_vazia: nenhuma conversa selecionada' using errcode = 'P0001';
  end if;
  if v_total > 100000 then
    raise exception 'acao_em_massa_grande_demais: no máximo 100.000 conversas por ação' using errcode = 'P0001';
  end if;

  update public.crm_acoes_em_massa_conversas set total = v_total, status = 'na_fila' where id = v_id;

  if v_total > coalesce(p_imediato_ate, 50) then
    perform public.emit_event(
      'conversas.acao_em_massa_requested',
      'crm_acao_em_massa_conversas',
      v_id,
      jsonb_build_object('acao_id', v_id),
      '{}'::jsonb,
      p_org
    );
  end if;

  return query select v_id, v_total, 'na_fila'::text;
end;
$$;

revoke all on function public.fn_escale_negocio_da_fila_passa(uuid, uuid, jsonb) from public, anon;
revoke all on function public.fn_escale_conversa_passa(public.conversations, jsonb) from public, anon;
revoke all on function public.fn_escale_fila_da_casca(uuid, jsonb, text, timestamptz, uuid, boolean, integer) from public, anon;
revoke all on function public.fn_escale_contar_fila_da_casca(uuid, jsonb) from public, anon;
revoke all on function public.fn_escale_criar_acao_em_massa_de_conversas(uuid, text, jsonb, uuid[], jsonb, integer, uuid[], integer) from public, anon;
grant execute on function public.fn_escale_negocio_da_fila_passa(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_conversa_passa(public.conversations, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_fila_da_casca(uuid, jsonb, text, timestamptz, uuid, boolean, integer) to authenticated, service_role;
grant execute on function public.fn_escale_contar_fila_da_casca(uuid, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_criar_acao_em_massa_de_conversas(uuid, text, jsonb, uuid[], jsonb, integer, uuid[], integer) to authenticated, service_role;

comment on function public.fn_escale_fila_da_casca(uuid, jsonb, text, timestamptz, uuid, boolean, integer) is
  'Fork Escale (9204): uma página da fila de Conversas da casca, com o filtro compilado do painel, a ordem (interacao | espera) e o cursor por chave. Invoker: a RLS de conversations de quem olha decide.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

- [ ] **Step 3: O bloco no baseline**

Em `supabase/baseline.sql`, logo ANTES da linha `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (e depois do bloco da 9203), cole o conteúdo da migration **sem** a primeira linha (`-- manifest:`), **sem** o `do $f$ … fn_aplicar_travas_de_suporte …` e **sem** o `notify pgrst` (o baseline já os tem no fim, como nos blocos 90xx–92xx vizinhos; confira o bloco da 9203 e copie a forma).

- [ ] **Step 4: A varredura de RLS**

Em `tests/invariants/rls-completude-varredura.test.ts`, em `PROVA_PROPRIA`, logo depois das entradas da 9203, duas linhas no molde das vizinhas (confira a forma exata — chave = nome da tabela, valor = o arquivo de prova):

```ts
  crm_acoes_em_massa_conversas: "tests/invariants/escale-fila-e-massa-9204.test.ts",
  crm_acoes_em_massa_conversas_itens: "tests/invariants/escale-fila-e-massa-9204.test.ts",
```

- [ ] **Step 5: A prova contra Postgres real (roda no fim da frente)**

Create `tests/invariants/escale-fila-e-massa-9204.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, countAs, seedGov, sql } from "./gov-helpers";

/**
 * FILA E AÇÕES EM MASSA (fork Escale, migration 9204) — prova contra Postgres
 * real: o filtro do painel na função (status pelo mapa, toggles, canais, busca,
 * negócio do contato), a página com cursor, o total, a criação da ação com a
 * RLS de quem pede (ids, filtro, vazia, sem permissão) e o evento só acima do
 * limite imediato. Roda via `pnpm test:db`.
 */
const SESSAO = "e5ca1e00-9204-4000-8000-0000000000a1";
const SESSAO_OFF = "e5ca1e00-9204-4000-8000-0000000000a2";
const CT1 = "e5ca1e00-9204-4000-8000-0000000000c1";
const CT2 = "e5ca1e00-9204-4000-8000-0000000000c2";
const CT3 = "e5ca1e00-9204-4000-8000-0000000000c3";
const CV_ABERTA = "e5ca1e00-9204-4000-8000-0000000000d1";
const CV_ESPERA = "e5ca1e00-9204-4000-8000-0000000000d2";
const CV_FECHADA = "e5ca1e00-9204-4000-8000-0000000000d3";
const CV_OFF = "e5ca1e00-9204-4000-8000-0000000000d4";
const ORIGEM = "e5ca1e00-9204-4000-8000-0000000000e1";
const ETAPA = "e5ca1e00-9204-4000-8000-0000000000e2";
const LEAD = "e5ca1e00-9204-4000-8000-0000000000e3";

const fila = (filtro: string, extra = "") =>
  `select count(*) from public.fn_escale_fila_da_casca('${GOV_ORG}', '${filtro}'::jsonb${extra}) x where x.id::text like 'e5ca1e00-9204-%'`;
const ids = (filtro: string) =>
  sql(
    `set local role postgres; select string_agg(x.id::text, ',' order by x.last_message_at desc nulls last) from public.fn_escale_fila_da_casca('${GOV_ORG}', '${filtro}'::jsonb) x where x.id::text like 'e5ca1e00-9204-%';`,
  ).trim();
const criar = (filtroOuIds: string, imediato = 50) =>
  `select quantidade from public.fn_escale_criar_acao_em_massa_de_conversas('${GOV_ORG}', 'status', '{"status":"fechado"}'::jsonb, ${filtroOuIds}, null, null, ${imediato})`;
const ultima = () =>
  sql(`select id from public.crm_acoes_em_massa_conversas where organization_id = '${GOV_ORG}' order by created_at desc, id desc limit 1;`).trim();
const eventosDe = (id: string) =>
  Number(sql(`select count(*) from public.event_log where event_type = 'conversas.acao_em_massa_requested' and entity_id = '${id}';`).trim());

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_acoes_em_massa_conversas where organization_id = '${GOV_ORG}';
    delete from public.crm_leads where id = '${LEAD}';
    delete from public.conversations where id::text like 'e5ca1e00-9204-%';
    delete from public.contacts where id::text like 'e5ca1e00-9204-%';
    insert into public.channel_sessions (id, organization_id, waha_session_name, webhook_secret_encrypted, metadata)
      values ('${SESSAO}', '${GOV_ORG}', 'fila-9204', '\\x00'::bytea, '{}'::jsonb),
             ('${SESSAO_OFF}', '${GOV_ORG}', 'fila-9204-off', '\\x00'::bytea, '{"disabled": true}'::jsonb)
      on conflict (id) do update set metadata = excluded.metadata;
    insert into public.contacts (id, organization_id, display_name, phone_number, tags) values
      ('${CT1}', '${GOV_ORG}', 'Filanove Um', '+5562999991111', array['vip']),
      ('${CT2}', '${GOV_ORG}', 'Filanove Dois', '+5562999992222', '{}'),
      ('${CT3}', '${GOV_ORG}', 'Filanove Tres', '+5562999993333', '{}');
    insert into public.conversations (id, organization_id, contact_id, channel_session_id, status, last_message_at, unread_count_for_assignee, snooze_until) values
      ('${CV_ABERTA}', '${GOV_ORG}', '${CT1}', '${SESSAO}', 'open', now(), 2, null),
      ('${CV_ESPERA}', '${GOV_ORG}', '${CT2}', '${SESSAO}', 'open', now() - interval '1 hour', 0, '9999-12-31T00:00:00Z'),
      ('${CV_FECHADA}', '${GOV_ORG}', '${CT3}', '${SESSAO}', 'closed', now() - interval '2 hours', 0, null),
      ('${CV_OFF}', '${GOV_ORG}', '${CT3}', '${SESSAO_OFF}', 'open', now() - interval '3 hours', 0, null);
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${ORIGEM}', '${GOV_ORG}', 'Fila 9204', 'fila-9204') on conflict (id) do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, position)
      values ('${ETAPA}', '${GOV_ORG}', '${ORIGEM}', 'Entrada', 1) on conflict (id) do nothing;
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, contact_id, title)
      values ('${LEAD}', '${GOV_ORG}', '${ORIGEM}', '${ETAPA}', '${CT1}', 'Negócio do Um');
  `);
});

describe("fn_escale_fila_da_casca", () => {
  it("o canal desativado nunca aparece; sem filtro vêm as três", () => {
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC"}'))).toBe(3);
  });

  it("o mapa de status: em aberto sem espera, em espera, fechado", () => {
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","status":["em_aberto"]}'))).toBe(1);
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","status":["em_espera"]}'))).toBe(1);
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","status":["em_espera","fechado"]}'))).toBe(2);
  });

  it("toggles, busca, tags e negócio", () => {
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","marcas":["nao_lidas"]}'))).toBe(1);
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","marcas":["lidas","nao_lidas"]}'))).toBe(3);
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","busca":{"padrao":"%filanove dois%","digitos":null}}'))).toBe(1);
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","busca":{"padrao":"%zzz%","digitos":"99993333"}}'))).toBe(1);
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC","tags":{"combinar":"ou","grupos":[{"modo":"e","condicoes":[{"op":"possui","tag":"vip"}]}]}}'))).toBe(1);
    expect(countAs(GOV_MANAGER, fila(`{"fuso":"UTC","negocio":{"fuso":"UTC","tem":"com","status":["open"],"motivos":[],"donos_usuarios":[],"donos_agentes":[],"sem_dono":false,"grupos":[],"origens":["${ORIGEM}"],"etapas":[]}}`))).toBe(1);
    expect(countAs(GOV_MANAGER, fila(`{"fuso":"UTC","negocio":{"fuso":"UTC","tem":"sem","status":[],"motivos":[],"donos_usuarios":[],"donos_agentes":[],"sem_dono":false,"grupos":[],"origens":[],"etapas":[]}}`))).toBe(2);
  });

  it("a ordem e o cursor", () => {
    expect(ids('{"fuso":"UTC"}')).toBe([CV_ABERTA, CV_ESPERA, CV_FECHADA].join(","));
    const depois = sql(`select last_message_at from public.conversations where id = '${CV_ABERTA}';`).trim();
    expect(countAs(GOV_MANAGER, fila('{"fuso":"UTC"}', `, 'interacao', '${depois}'::timestamptz, '${CV_ABERTA}'::uuid, false, 51`))).toBe(2);
  });

  it("o total conta o mesmo que a lista", () => {
    const filtro = '{"fuso":"UTC","busca":{"padrao":"%filanove%","digitos":null}}';
    expect(countAs(GOV_MANAGER, `select public.fn_escale_contar_fila_da_casca('${GOV_ORG}', '${filtro}'::jsonb)`)).toBe(3);
    expect(countAs(GOV_MANAGER, fila(filtro))).toBe(3);
  });
});

describe("fn_escale_criar_acao_em_massa_de_conversas", () => {
  it("pelos ids: os itens, na fila, e sem evento abaixo do limite", () => {
    expect(countAs(GOV_MANAGER, criar(`array['${CV_ABERTA}', '${CV_ESPERA}']::uuid[], null`))).toBe(2);
    const id = ultima();
    expect(sql(`select status from public.crm_acoes_em_massa_conversas where id = '${id}';`).trim()).toBe("na_fila");
    expect(Number(sql(`select count(*) from public.crm_acoes_em_massa_conversas_itens where acao_id = '${id}';`).trim())).toBe(2);
    expect(eventosDe(id)).toBe(0);
  });

  it("acima do limite imediato, emite o evento", () => {
    expect(countAs(GOV_MANAGER, criar(`array['${CV_ABERTA}', '${CV_ESPERA}']::uuid[], null`, 1))).toBe(2);
    expect(eventosDe(ultima())).toBe(1);
  });

  it("pelo filtro, menos os desmarcados", () => {
    expect(
      countAs(GOV_MANAGER, `select quantidade from public.fn_escale_criar_acao_em_massa_de_conversas('${GOV_ORG}', 'status', '{"status":"fechado"}'::jsonb, null, '{"fuso":"UTC"}'::jsonb, null, array['${CV_FECHADA}']::uuid[], 50)`),
    ).toBeGreaterThanOrEqual(2);
  });

  it("vazia é recusada; atendente sem a permissão não cria", () => {
    expect(() => countAs(GOV_MANAGER, criar(`array['e5ca1e00-9204-4000-8000-0000000000ff']::uuid[], null`))).toThrow(/acao_em_massa_vazia/);
    expect(() => countAs(GOV_AGENT_A, criar(`array['${CV_ABERTA}']::uuid[], null`))).toThrow(/acao_em_massa_sem_permissao/);
  });

  it("cada um só vê as suas", () => {
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_acoes_em_massa_conversas where organization_id = '${GOV_ORG}'`)).toBe(0);
  });

  it("nenhuma função nova é definer", () => {
    expect(
      sql(
        `select count(*) from pg_proc where proname in ('fn_escale_negocio_da_fila_passa','fn_escale_conversa_passa','fn_escale_fila_da_casca','fn_escale_contar_fila_da_casca','fn_escale_criar_acao_em_massa_de_conversas') and prosecdef;`,
      ).trim(),
    ).toBe("0");
  });
});
```

Confira em `tests/invariants/gov-helpers.ts` como `countAs` devolve o número (o arquivo da 9103 usa `countAs(quem, "select quantidade …")` e lê o primeiro valor) e se `sql` aceita o `set local role` — se não, tire o `set local role postgres;` do `ids` (o `sql` já roda como superusuário). Confira também as colunas obrigatórias de `crm_pipelines`/`crm_stages` no baseline (o seed de `tests/invariants/escale-distribuicao-de-dono.test.ts` cria origem e etapa: copie a forma dele se faltar coluna).

- [ ] **Step 6: As cercas que leem a migration**

Run: `corepack pnpm vitest run tests/unit/manifest-x-migrations.test.ts tests/unit/hardening-definer-varredura.test.ts tests/unit/definer-nova-nasce-exposta.test.ts tests/unit/gov-hardening-anon-definer.test.ts tests/invariants/rls-completude-varredura.test.ts`
Expected: PASS (a varredura de RLS só confere o arquivo de prova; ela não sobe banco). Os nomes exatos das cercas: `ls tests/unit | grep -E "manifest|definer|hardening"` — rode todas as que aparecerem.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261105120000_9204_filtros_e_acoes_em_massa_da_fila.sql supabase/baseline.sql tests/invariants/escale-fila-e-massa-9204.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "feat(escale): migration 9204 — o filtro da fila no banco, a página, o total e as ações em massa (Fase 3D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: A fila pela rota do fork e o total

**Files:**
- Create: `lib/escale/conversas/fila-banco.ts`, `app/api/v1/fila-da-casca/route.ts`, `app/api/v1/fila-da-casca/total/route.ts`, `tests/unit/escale-fila-da-casca-rotas.test.ts`
- Modify: `app/api/v1/conversations/_handler.ts` (uma linha)

**Interfaces:**
- Consumes: `compilarFiltrosDaFila`, `painelDoTexto` (Task 1); `fusoDaOrganizacao` (`lib/escale/contatos/lista`); `comNomeDoAtendente` (`lib/users/com-nome-do-atendente`); `ordemDaUrl` (3A); `requireRole`, `ok/fail`.
- Produces: `COLUNAS_DA_LISTA_DE_CONVERSAS` (original); `fila-banco.ts`: `CursorDaFila`, `codificarCursor(c)`, `decodificarCursor(texto)`, `lerPaginaDaFila(supabase, orgId, compilado, ordem, cursor, limite) → { conversas, cursor, has_more }`, `contarFila(supabase, orgId, compilado) → number`, `LIMITE_DA_PAGINA_MAX` (100); `GET /api/v1/fila-da-casca?f&q&o&cursor&limit` → `{ data: ConversationWithContact[], meta: { cursor, has_more } }` (422 com `f` inválido); `GET /api/v1/fila-da-casca/total?f&q` → `{ data: { total } }`.

- [ ] **Step 1: A linha no original**

Em `app/api/v1/conversations/_handler.ts`, logo depois do fim da constante `const SELECT_COLS = \`…\`;`:

```ts
// FORK ESCALE · Fase 3D: a fila da casca lê as mesmas colunas (a forma ConversationWithContact).
export const COLUNAS_DA_LISTA_DE_CONVERSAS = SELECT_COLS;
```

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-fila-da-casca-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as TOTAL } from "@/app/api/v1/fila-da-casca/total/route";
import { GET as FILA } from "@/app/api/v1/fila-da-casca/route";
import { codificarCursor, decodificarCursor, lerPaginaDaFila } from "@/lib/escale/conversas/fila-banco";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/escale/contatos/lista", () => ({ fusoDaOrganizacao: vi.fn(async () => "America/Sao_Paulo") }));
vi.mock("@/lib/users/com-nome-do-atendente", () => ({ comNomeDoAtendente: vi.fn(async (c: unknown[]) => c) }));

/** O builder do rpc: registra a chamada, o select e as ordens; devolve as linhas. */
function bancoDaFila(linhas: Array<Record<string, unknown>>, total = 0) {
  const chamadas: Array<{ nome: string; args: Record<string, unknown> }> = [];
  const ordens: string[] = [];
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn((col: string) => {
      ordens.push(col);
      return builder;
    }),
    then: (ok: (r: unknown) => unknown) => Promise.resolve({ data: linhas, error: null }).then(ok),
  };
  const rpc = vi.fn((nome: string, args: Record<string, unknown>) => {
    chamadas.push({ nome, args });
    return nome === "fn_escale_contar_fila_da_casca" ? Promise.resolve({ data: total, error: null }) : builder;
  });
  return { db: { rpc }, chamadas, ordens };
}

beforeEach(() => authOk("agent"));

describe("cursor", () => {
  it("vai e volta, e lixo vira nulo", () => {
    const c = { sort: "2026-10-18T10:00:00Z", id: "x" };
    expect(decodificarCursor(codificarCursor(c))).toEqual(c);
    expect(decodificarCursor("lixo")).toBeNull();
  });
});

describe("lerPaginaDaFila", () => {
  it("pede uma a mais, devolve o cursor da última e repete a ordem no builder", async () => {
    const linhas = [
      { id: "a", last_message_at: "2026-10-18T12:00:00Z" },
      { id: "b", last_message_at: "2026-10-18T11:00:00Z" },
      { id: "c", last_message_at: "2026-10-18T10:00:00Z" },
    ];
    const { db, chamadas, ordens } = bancoDaFila(linhas);
    const r = await lerPaginaDaFila(db as never, ORG_ID, { fuso: "UTC" }, "interacao", null, 2);
    expect(chamadas[0]).toMatchObject({ nome: "fn_escale_fila_da_casca", args: { p_org: ORG_ID, p_ordem: "interacao", p_limite: 3, p_depois_id: null } });
    expect(ordens).toEqual(["last_message_at", "id"]);
    expect(r.conversas.map((c) => c.id)).toEqual(["a", "b"]);
    expect(r.has_more).toBe(true);
    expect(decodificarCursor(r.cursor!)).toEqual({ sort: "2026-10-18T11:00:00Z", id: "b" });
  });

  it("na ordem da espera, a régua é awaiting_since e o cursor nulo pagina só por id", async () => {
    const { db, chamadas, ordens } = bancoDaFila([]);
    await lerPaginaDaFila(db as never, ORG_ID, { fuso: "UTC" }, "espera", { sort: null, id: "z" }, 50);
    expect(ordens).toEqual(["awaiting_since", "id"]);
    expect(chamadas[0]!.args).toMatchObject({ p_depois_sort: null, p_depois_id: "z", p_depois_nulo: true });
  });
});

describe("as rotas", () => {
  it("GET compila o painel com o fuso e a busca", async () => {
    const { db, chamadas } = bancoDaFila([{ id: "a", last_message_at: null }]);
    vi.mocked(createClient).mockResolvedValue(db as never);
    const f = encodeURIComponent(JSON.stringify({ conversas: { status: ["em_espera"] } }));
    const r = await FILA(new NextRequest(`http://x/api/v1/fila-da-casca?f=${f}&q=maria&o=espera`));
    expect(r.status).toBe(200);
    expect(chamadas[0]!.args.p_filtros).toEqual({ fuso: "America/Sao_Paulo", status: ["em_espera"], busca: { padrao: "%maria%", digitos: null } });
    expect(chamadas[0]!.args.p_ordem).toBe("espera");
  });

  it("f inválido = 422", async () => {
    vi.mocked(createClient).mockResolvedValue(bancoDaFila([]).db as never);
    const r = await FILA(new NextRequest("http://x/api/v1/fila-da-casca?f=%7Bx"));
    expect(r.status).toBe(422);
  });

  it("o total", async () => {
    vi.mocked(createClient).mockResolvedValue(bancoDaFila([], 56128).db as never);
    const r = await TOTAL(new NextRequest("http://x/api/v1/fila-da-casca/total"));
    expect(((await r.json()) as { data: { total: number } }).data.total).toBe(56128);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-fila-da-casca-rotas.test.ts`
Expected: FAIL (módulos não existem).

- [ ] **Step 4: `fila-banco.ts`**

Create `lib/escale/conversas/fila-banco.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { COLUNAS_DA_LISTA_DE_CONVERSAS } from "@/app/api/v1/conversations/_handler";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

import type { FiltroDaFilaCompilado } from "./compilar-filtros-da-fila";
import type { Ordem } from "./ordem";

/**
 * A LEITURA DA FILA DA CASCA (fork Escale, Fase 3D; N9). `fn_escale_fila_da_casca`
 * (invoker, 9204) filtra, ordena e corta; o `.select()` sobre o rpc faz o embed
 * do contato e do canal com as MESMAS colunas da lista do original; a ordem se
 * repete no builder porque o embed não promete manter a da função.
 */
export const LIMITE_DA_PAGINA_MAX = 100;
export interface CursorDaFila {
  sort: string | null;
  id: string;
}

export const codificarCursor = (c: CursorDaFila): string => Buffer.from(JSON.stringify(c), "utf8").toString("base64url");

export function decodificarCursor(texto: string | null | undefined): CursorDaFila | null {
  if (!texto) return null;
  try {
    const lido = JSON.parse(Buffer.from(texto, "base64url").toString("utf8")) as Partial<CursorDaFila>;
    if (typeof lido.id !== "string") return null;
    return { sort: typeof lido.sort === "string" ? lido.sort : null, id: lido.id };
  } catch {
    return null;
  }
}

const COLUNA_DA_ORDEM: Record<Ordem, "last_message_at" | "awaiting_since"> = {
  interacao: "last_message_at",
  espera: "awaiting_since",
};

export async function lerPaginaDaFila(
  supabase: SupabaseClient,
  orgId: string,
  compilado: FiltroDaFilaCompilado,
  ordem: Ordem,
  cursor: CursorDaFila | null,
  limite: number,
): Promise<{ conversas: ConversationWithContact[]; cursor: string | null; has_more: boolean }> {
  const asc = ordem === "espera";
  const coluna = COLUNA_DA_ORDEM[ordem];
  const { data, error } = await supabase
    .rpc("fn_escale_fila_da_casca", {
      p_org: orgId,
      p_filtros: compilado,
      p_ordem: ordem,
      p_depois_sort: cursor?.sort ?? null,
      p_depois_id: cursor?.id ?? null,
      p_depois_nulo: cursor ? cursor.sort === null : false,
      p_limite: limite + 1,
    })
    .select(COLUNAS_DA_LISTA_DE_CONVERSAS)
    .order(coluna, { ascending: asc, nullsFirst: false })
    .order("id", { ascending: asc });
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as unknown as ConversationWithContact[];
  const has_more = linhas.length > limite;
  const pagina = has_more ? linhas.slice(0, limite) : linhas;
  const ultima = pagina[pagina.length - 1] as (ConversationWithContact & Record<string, unknown>) | undefined;
  return {
    conversas: pagina,
    cursor: has_more && ultima ? codificarCursor({ sort: (ultima[coluna] as string | null) ?? null, id: ultima.id }) : null,
    has_more,
  };
}

export async function contarFila(supabase: SupabaseClient, orgId: string, compilado: FiltroDaFilaCompilado): Promise<number> {
  const { data, error } = await supabase.rpc("fn_escale_contar_fila_da_casca", { p_org: orgId, p_filtros: compilado });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
```

- [ ] **Step 5: As rotas**

Create `app/api/v1/fila-da-casca/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { compilarFiltrosDaFila } from "@/lib/escale/conversas/compilar-filtros-da-fila";
import { LIMITE_DA_PAGINA_MAX, decodificarCursor, lerPaginaDaFila } from "@/lib/escale/conversas/fila-banco";
import { painelDoTexto } from "@/lib/escale/conversas/filtros-da-fila";
import { ordemDaUrl } from "@/lib/escale/conversas/ordem";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";
import { comNomeDoAtendente } from "@/lib/users/com-nome-do-atendente";

export const dynamic = "force-dynamic";
const LIMITE_PADRAO = 50;

/**
 * GET /api/v1/fila-da-casca — a fila de Conversas da casca (fork Escale, Fase 3D;
 * N9). O painel (`f`), a busca (`q`), a ordem (`o`) e o cursor; a RLS da sessão
 * decide o que cada pessoa vê. Mesma forma da lista do original.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const url = req.nextUrl.searchParams;
  const painel = painelDoTexto(url.get("f"));
  if (painel === null) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  const cursorBruto = url.get("cursor");
  const cursor = decodificarCursor(cursorBruto);
  if (cursorBruto && !cursor) return fail("invalid_cursor", t("Cursor inválido."), 400, { requestId });
  const limite = Math.min(Math.max(Number(url.get("limit")) || LIMITE_PADRAO, 1), LIMITE_DA_PAGINA_MAX);
  try {
    const supabase = await createClient();
    const compilado = compilarFiltrosDaFila(painel, url.get("q") ?? undefined, await fusoDaOrganizacao(supabase, authz.org.orgId));
    const pagina = await lerPaginaDaFila(supabase, authz.org.orgId, compilado, ordemDaUrl(url.get("o")), cursor, limite);
    return ok(await comNomeDoAtendente(pagina.conversas), { requestId, meta: { cursor: pagina.cursor, has_more: pagina.has_more } });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

Create `app/api/v1/fila-da-casca/total/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { compilarFiltrosDaFila } from "@/lib/escale/conversas/compilar-filtros-da-fila";
import { contarFila } from "@/lib/escale/conversas/fila-banco";
import { painelDoTexto } from "@/lib/escale/conversas/filtros-da-fila";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/v1/fila-da-casca/total — quantas conversas o painel alcança ("Selecionar todas as N", N12). */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const painel = painelDoTexto(req.nextUrl.searchParams.get("f"));
  if (painel === null) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  try {
    const supabase = await createClient();
    const compilado = compilarFiltrosDaFila(painel, req.nextUrl.searchParams.get("q") ?? undefined, await fusoDaOrganizacao(supabase, authz.org.orgId));
    return ok({ total: await contarFila(supabase, authz.org.orgId, compilado) }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

Confira a assinatura de `ok` em `lib/api/wrappers.ts` (`ok(data, { requestId, meta })`; a rota do original usa assim) e se `requireRole` devolve `authz.user.idioma` (as rotas da 3C usam).

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-fila-da-casca-rotas.test.ts && corepack pnpm prettier --write lib/escale/conversas/fila-banco.ts app/api/v1/fila-da-casca tests/unit/escale-fila-da-casca-rotas.test.ts && corepack pnpm eslint lib/escale/conversas/fila-banco.ts app/api/v1/fila-da-casca app/api/v1/conversations/_handler.ts && corepack pnpm typecheck`
Expected: PASS. Se o typecheck reclamar do `.select()` depois do `.rpc()` (o tipo gerado não conhece a função), declare o builder com um tipo mínimo explícito, sem `any`: `type BuilderDaFila = { select(c: string): { order(c: string, o: object): { order(c: string, o: object): PromiseLike<{ data: unknown; error: { message: string } | null }> } } };` e `const consulta = supabase.rpc("fn_escale_fila_da_casca", args) as unknown as BuilderDaFila;`.

- [ ] **Step 7: Commit**

```bash
git add lib/escale/conversas/fila-banco.ts app/api/v1/fila-da-casca app/api/v1/conversations/_handler.ts tests/unit/escale-fila-da-casca-rotas.test.ts
git commit -m "feat(escale): a fila da casca pela rota do fork, com o painel, a busca, a ordem e o total (Fase 3D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Filtros salvos da fila (a tabela das listas da 2B, lista "conversas")

**Files:**
- Modify: `lib/escale/listas/filtros-salvos.ts`, `app/api/v1/filtros-das-listas/route.ts`, `hooks/escale/useFiltrosDaLista.ts`
- Create: `tests/unit/escale-filtros-salvos-da-fila.test.ts`

**Interfaces:**
- Produces: `LISTAS_COM_FILTROS = ["contatos", "conversas"]`; `CriteriosDaLista<L>`; `FiltroDaLista<L extends ListaComFiltros = "contatos">`; `novoFiltroSchema` (união por `lista`); `enxugarCriterios(novo)`; `filtrosDasLinhas(linhas, userId, lista = "contatos")`; `lerFiltrosDaLista<L>(supabase, orgId, userId, lista: L) → FiltroDaLista<L>[]`; os hooks `useFiltrosDaLista<L>(lista)`, `useCriarFiltroDaLista<L>(lista)` (critérios `CriteriosDaLista<L>`), `useMudarFiltroDaLista`, `useExcluirFiltroDaLista` (iguais).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-filtros-salvos-da-fila.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { enxugarCriterios, filtrosDasLinhas, novoFiltroSchema } from "@/lib/escale/listas/filtros-salvos";

describe("filtros salvos por lista (N11)", () => {
  it("a lista 'conversas' valida pelo painel da fila e enxuga como ele", () => {
    const novo = novoFiltroSchema.parse({
      lista: "conversas",
      nome: "Em espera e suspensas",
      compartilhado: false,
      criterios: { conversas: { status: ["em_espera"], marcas: ["suspensas"], atendentes: [] } },
    });
    expect(enxugarCriterios(novo)).toEqual({ conversas: { marcas: ["suspensas"], status: ["em_espera"] } });
    expect(novoFiltroSchema.safeParse({ lista: "conversas", nome: "x", compartilhado: false, criterios: { telefone: "com" } }).success).toBe(false);
    expect(novoFiltroSchema.safeParse({ lista: "contatos", nome: "x", compartilhado: false, criterios: { telefone: "com" } }).success).toBe(true);
  });

  it("as linhas leem os critérios pela lista; o que não vale vira vazio", () => {
    const linhas = [
      { id: "1", user_id: "u", nome: "A", compartilhado: false, criterios: { canais: ["c0000000-0000-4000-8000-000000000001"] } },
      { id: "2", user_id: "outro", nome: "B", compartilhado: true, criterios: { telefone: "com" } },
    ];
    const lidos = filtrosDasLinhas(linhas, "u", "conversas");
    expect(lidos[0]).toMatchObject({ meu: true, criterios: { canais: ["c0000000-0000-4000-8000-000000000001"] } });
    expect(lidos[1]).toMatchObject({ meu: false, criterios: {} });
    expect(filtrosDasLinhas(linhas, "u")[1]!.criterios).toEqual({ telefone: "com" });
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-filtros-salvos-da-fila.test.ts`
Expected: FAIL.

- [ ] **Step 2: `filtros-salvos.ts` por lista**

Em `lib/escale/listas/filtros-salvos.ts`:

1. Imports, junto dos da 2B:

```ts
import {
  enxugarFiltrosDoPainel,
  filtrosDaFilaSchema,
  type FiltrosDoPainel,
} from "@/lib/escale/conversas/filtros-da-fila";
```

2. Troque `LISTAS_COM_FILTROS`, `FiltroDaLista` e `novoFiltroSchema` por:

```ts
export const LISTAS_COM_FILTROS = ["contatos", "conversas"] as const;
export type ListaComFiltros = (typeof LISTAS_COM_FILTROS)[number];
export const listaSchema = z.enum(LISTAS_COM_FILTROS);

/** FORK ESCALE · Fase 3D: cada lista tem a forma dos seus critérios (N11). */
type CriteriosPorLista = { contatos: FiltrosDeContatos; conversas: FiltrosDoPainel };
export type CriteriosDaLista<L extends ListaComFiltros> = CriteriosPorLista[L];

export type FiltroDaLista<L extends ListaComFiltros = "contatos"> = {
  id: string;
  nome: string;
  compartilhado: boolean;
  meu: boolean;
  criterios: CriteriosDaLista<L>;
};

const baseDoNovo = { nome: z.string().max(200), compartilhado: z.boolean() };
export const novoFiltroSchema = z.discriminatedUnion("lista", [
  z.object({ lista: z.literal("contatos"), ...baseDoNovo, criterios: filtrosDeContatosSchema }).strict(),
  z.object({ lista: z.literal("conversas"), ...baseDoNovo, criterios: filtrosDaFilaSchema }).strict(),
]);
export type NovoFiltroDaLista = z.infer<typeof novoFiltroSchema>;

export function enxugarCriterios(novo: NovoFiltroDaLista): CriteriosDaLista<ListaComFiltros> {
  return novo.lista === "conversas" ? enxugarFiltrosDoPainel(novo.criterios) : enxugarFiltros(novo.criterios);
}
```

(as linhas antigas `export const LISTAS_COM_FILTROS = ["contatos"] as const;`, `export type ListaComFiltros…`, `export const listaSchema…`, o tipo `FiltroDaLista` e o `novoFiltroSchema` antigo saem).

3. `filtrosDasLinhas` e `lerFiltrosDaLista` por lista:

```ts
/** Critério que não vale mais (o modelo mudou) vira filtro vazio, em vez de quebrar a lista. */
export function filtrosDasLinhas<L extends ListaComFiltros = "contatos">(
  linhas: readonly Linha[],
  userId: string,
  lista: L = "contatos" as L,
): FiltroDaLista<L>[] {
  return linhas.map((l) => {
    const criterios =
      lista === "conversas"
        ? (() => {
            const lido = filtrosDaFilaSchema.safeParse(l.criterios);
            return lido.success ? enxugarFiltrosDoPainel(lido.data) : {};
          })()
        : (() => {
            const lido = filtrosDeContatosSchema.safeParse(l.criterios);
            return lido.success ? enxugarFiltros(lido.data) : {};
          })();
    return { id: l.id, nome: l.nome, compartilhado: l.compartilhado, meu: l.user_id === userId, criterios: criterios as CriteriosDaLista<L> };
  });
}

/** Lança o erro do banco para a rota tratar. */
export async function lerFiltrosDaLista<L extends ListaComFiltros>(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  lista: L,
): Promise<FiltroDaLista<L>[]> {
  const { data, error } = await supabase
    .from("crm_filtros_das_listas")
    .select("id, user_id, nome, compartilhado, criterios")
    .eq("organization_id", orgId)
    .eq("lista", lista)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return filtrosDasLinhas((data ?? []) as Linha[], userId, lista);
}
```

- [ ] **Step 3: A rota POST**

Em `app/api/v1/filtros-das-listas/route.ts`: troque o import de `enxugarFiltros` (de `@/lib/escale/contatos/filtros`) por `enxugarCriterios` (de `@/lib/escale/listas/filtros-salvos`, junto dos outros) e, no insert, `criterios: enxugarFiltros(lido.data.criterios),` por `criterios: enxugarCriterios(lido.data),`. O GET, o PATCH e o DELETE não mudam (já leem `lista` pelo `listaSchema`).

- [ ] **Step 4: O hook genérico**

Em `hooks/escale/useFiltrosDaLista.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { CriteriosDaLista, FiltroDaLista, ListaComFiltros } from "@/lib/escale/listas/filtros-salvos";

/** Os filtros salvos de uma lista da casca (fork Escale, Fases 2B e 3D). Toda escrita devolve a lista. */
export const chaveDosFiltrosDaLista = (lista: ListaComFiltros) => ["filtros-das-listas", lista] as const;

export function useFiltrosDaLista<L extends ListaComFiltros>(lista: L) {
  return useQuery({
    queryKey: chaveDosFiltrosDaLista(lista),
    queryFn: async () => (await apiClient.get<{ data: FiltroDaLista<L>[] }>(`/api/v1/filtros-das-listas?lista=${lista}`)).data,
    staleTime: 60_000,
  });
}

export function useCriarFiltroDaLista<L extends ListaComFiltros>(lista: L) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (novo: { nome: string; compartilhado: boolean; criterios: CriteriosDaLista<L> }) =>
      (await apiClient.post<{ data: { id: string; filtros: FiltroDaLista<L>[] } }>("/api/v1/filtros-das-listas", { lista, ...novo })).data,
    onSuccess: (r) => qc.setQueryData(chaveDosFiltrosDaLista(lista), r.filtros),
  });
}

export function useMudarFiltroDaLista<L extends ListaComFiltros>(lista: L) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...mudar }: { id: string; nome?: string; compartilhado?: boolean }) =>
      (await apiClient.patch<{ data: FiltroDaLista<L>[] }>(`/api/v1/filtros-das-listas/${id}`, mudar)).data,
    onSuccess: (filtros) => qc.setQueryData(chaveDosFiltrosDaLista(lista), filtros),
  });
}

export function useExcluirFiltroDaLista<L extends ListaComFiltros>(lista: L) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.delete<{ data: FiltroDaLista<L>[] }>(`/api/v1/filtros-das-listas/${id}`)).data,
    onSuccess: (filtros) => qc.setQueryData(chaveDosFiltrosDaLista(lista), filtros),
  });
}
```

- [ ] **Step 5: Rodar e ver passar (com os testes da 2B)**

Run: `corepack pnpm vitest run tests/unit/escale-filtros-salvos-da-fila.test.ts $(grep -rlE "filtros-das-listas|listas/filtros-salvos|useFiltrosDaLista" tests/unit) && corepack pnpm prettier --write tests/unit/escale-filtros-salvos-da-fila.test.ts && corepack pnpm eslint lib/escale/listas app/api/v1/filtros-das-listas hooks/escale/useFiltrosDaLista.ts && corepack pnpm typecheck`
Expected: PASS (o seletor de filtros dos contatos continua com `FiltroDaLista` = contatos pelo padrão do genérico).

- [ ] **Step 6: Commit**

```bash
git add lib/escale/listas/filtros-salvos.ts app/api/v1/filtros-das-listas/route.ts hooks/escale/useFiltrosDaLista.ts tests/unit/escale-filtros-salvos-da-fila.test.ts
git commit -m "feat(escale): filtros salvos por lista, com a lista conversas (Fase 3D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Ações em massa no servidor (o executor, o consumidor e as rotas)

**Files:**
- Create: `lib/escale/conversas/massa/executar.ts`, `lib/escale/conversas/massa/handler.ts`, `app/api/v1/acoes-em-massa-conversas/route.ts`, `app/api/v1/acoes-em-massa-conversas/[id]/route.ts`, `tests/unit/escale-acoes-em-massa-da-fila.test.ts`
- Modify: `lib/escale/conversas/setores-banco.ts` e `app/api/v1/conversas-da-casca/[id]/setor/route.ts` (a transferência extraída), `lib/event-log/register-handlers.ts`, `tests/unit/dispatcher-org-parada.test.ts`, `lib/audit/actions.ts`

**Interfaces:**
- Consumes: `camposParaEntrarEmEspera`, `camposParaSairDaEspera` (3B, `lib/escale/conversas/espera`); `setorEfetivo` (3C); `patchContactHandler` (original); `normalizarTags`; `pedidoDaFilaSchema`, `LIMITE_IMEDIATO`, `EVENTO_DA_MASSA_DA_FILA` (Task 1); `compilarFiltrosDaFila`, `painelDoTexto`; `pode` (3C, `setores-banco`).
- Produces: `transferirConversaParaSetor(db, orgId, conversa: { id; channel_session_id; assigned_to_user_id }, destino, userId) → "transferida" | "mesmo_setor"`; `CONSUMIDOR_DA_MASSA_DA_FILA`; `DependenciasDaMassa`; `processarAcaoDaFila(row, deps) → HandlerResult`; `acaoEmMassaDaFilaHandler`; `POST /api/v1/acoes-em-massa-conversas` → 201 `{ data: { id, total, status } }` (`status` = "concluida" quando rodou na hora); `GET /api/v1/acoes-em-massa-conversas/[id]` → `{ data: ResumoDaAcaoDaFila }`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-acoes-em-massa-da-fila.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { processarAcaoDaFila, type DependenciasDaMassa } from "@/lib/escale/conversas/massa/executar";
import type { EventRow } from "@/lib/event-log/dispatcher";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

const ORG = "a0000000-0000-4000-8000-0000000000aa";
const PESSOA = "b0000000-0000-4000-8000-0000000000bb";
const ACAO = "c0000000-0000-4000-8000-0000000000cc";
const CV1 = "d0000000-0000-4000-8000-000000000001";
const linhaDaAcao = (acao: string, parametros: Record<string, unknown>) => ({
  id: ACAO, organization_id: ORG, user_id: PESSOA, acao, parametros, status: "na_fila", total: 1, feitos: 0, falhas: 0, erros: [],
});
const conversa = (extra: Record<string, unknown> = {}) => ({
  id: CV1, organization_id: ORG, status: "closed", service_revision: 3, assigned_to_user_id: null, snooze_until: null, metadata: {}, contact_id: "ct1", channel_session_id: "cs1", ...extra,
});
const row = { id: "e1", organization_id: ORG, payload: { acao_id: ACAO }, attempts: 1 } as unknown as EventRow;

function deps(tabelas: Parameters<typeof bancoPorTabela>[0]) {
  const b = bancoPorTabela(tabelas, { rpc: () => ({ data: [{}], error: null }) });
  const d: DependenciasDaMassa = {
    db: b.db as never,
    agora: () => 0,
    mudarContato: vi.fn(async () => undefined),
    transferirSetor: vi.fn(async () => "transferida" as const),
  };
  return { ...b, d };
}

beforeEach(() => vi.clearAllMocks());

describe("processarAcaoDaFila (N14)", () => {
  it("Em aberto: reabre a fechada pela fn_service_status, grava o evento e conclui", async () => {
    const { db, d, escritas } = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("status", { status: "em_aberto" })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa()],
    });
    const r = await processarAcaoDaFila(row, d);
    expect(r.status).toBe("ok");
    expect(db.rpc).toHaveBeenCalledWith("fn_service_status", { p_org: ORG, p_conversation: CV1, p_status: "open", p_expected: 3 });
    expect(escritas.find((e) => e.tabela === "crm_eventos_da_conversa")?.valores).toMatchObject({ tipo: "reaberto", user_id: PESSOA });
    expect(escritas.at(-1)).toMatchObject({ tabela: "crm_acoes_em_massa_conversas", valores: { status: "concluida", feitos: 1, falhas: 0 } });
  });

  it("Em espera: o snooze sem fim da 3B", async () => {
    const { d, escritas } = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("status", { status: "em_espera" })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa({ status: "open" })],
    });
    await processarAcaoDaFila(row, d);
    expect(escritas.find((e) => e.tabela === "conversations")?.valores).toMatchObject({ snooze_until: "9999-12-31T00:00:00.000Z" });
  });

  it("Atendente: transfer para a pessoa, release para 'Sem atendente'", async () => {
    const { db, d } = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("atendente", { user_id: null })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa({ status: "claimed", assigned_to_user_id: PESSOA })],
    });
    await processarAcaoDaFila(row, d);
    expect(db.rpc).toHaveBeenCalledWith("fn_conversation_assign", expect.objectContaining({ p_conversation_id: CV1, p_to_user_id: null, p_reason: "release" }));
  });

  it("Setor e tag usam as peças comuns; arquivada falha com o motivo", async () => {
    const setor = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("setor", { setor_id: "s1" })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa({ status: "open" })],
    });
    await processarAcaoDaFila(row, setor.d);
    expect(setor.d.transferirSetor).toHaveBeenCalledWith(expect.anything(), ORG, expect.objectContaining({ id: CV1 }), "s1", PESSOA);

    const tag = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("incluir_tag", { tag: "VIP" })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa({ status: "open" })],
      contacts: [{ id: "ct1", tags: ["lead"] }],
    });
    await processarAcaoDaFila(row, tag.d);
    expect(tag.d.mudarContato).toHaveBeenCalledWith(expect.objectContaining({ organization_id: ORG }), "ct1", { tags: ["lead", "vip"] });

    const arq = deps({
      crm_acoes_em_massa_conversas: [linhaDaAcao("status", { status: "fechado" })],
      crm_acoes_em_massa_conversas_itens: [{ conversation_id: CV1 }],
      conversations: [conversa({ status: "archived" })],
    });
    await processarAcaoDaFila(row, arq.d);
    expect(arq.escritas.at(-1)?.valores).toMatchObject({ status: "concluida", feitos: 0, falhas: 1, erros: [{ conversa: CV1, motivo: "A conversa está arquivada." }] });
  });

  it("ação que não está na fila é pulada", async () => {
    const { d } = deps({ crm_acoes_em_massa_conversas: [{ ...linhaDaAcao("status", { status: "fechado" }), status: "concluida" }] });
    expect((await processarAcaoDaFila(row, d)).status).toBe("ok");
  });
});
```

O banco de mentira da 3C devolve as linhas da tabela sem olhar os filtros e grava as escritas na ordem: os testes montam uma conversa por ação.

Run: `corepack pnpm vitest run tests/unit/escale-acoes-em-massa-da-fila.test.ts`
Expected: FAIL.

- [ ] **Step 2: A transferência para setor, extraída da 3C**

Em `lib/escale/conversas/setores-banco.ts`, acrescente:

```ts
/**
 * "Alterar setor" (3C N7), extraída da rota para servir também à ação em massa
 * (3D N14): o setor novo em transferência, com o setor e o atendente anteriores
 * guardados, e o atendente solto pela RPC do release do original.
 */
export async function transferirConversaParaSetor(
  db: SupabaseClient,
  orgId: string,
  conversa: { id: string; channel_session_id: string; assigned_to_user_id: string | null },
  destino: string,
  userId: string,
): Promise<"transferida" | "mesmo_setor"> {
  const atual = await setorEfetivo(db, orgId, conversa);
  if (atual.setorId === destino) return "mesmo_setor";
  const agora = new Date().toISOString();
  const { error } = await db.from("crm_setor_da_conversa").upsert(
    {
      conversation_id: conversa.id,
      organization_id: orgId,
      setor_id: destino,
      em_transferencia: true,
      setor_anterior_id: atual.setorId,
      atendente_anterior_id: conversa.assigned_to_user_id,
      transferido_por: userId,
      transferido_em: agora,
      updated_at: agora,
    },
    { onConflict: "conversation_id" },
  );
  if (error) throw new Error(error.message);
  if (conversa.assigned_to_user_id) {
    const solta = await db.rpc("fn_conversation_assign", {
      p_organization_id: orgId,
      p_conversation_id: conversa.id,
      p_to_user_id: null as unknown as string,
      p_reason: "release",
      p_expected_assignee: conversa.assigned_to_user_id,
      p_enforce_expected: true,
    });
    if (solta.error) throw new Error(solta.error.message);
  }
  return "transferida";
}
```

Em `app/api/v1/conversas-da-casca/[id]/setor/route.ts` (3C), no `POST`, troque o bloco que vai de `const atual = await setorEfetivo(…)` até o fim do `if (conversa.assigned_to_user_id) { … }` por:

```ts
    const resultado = await transferirConversaParaSetor(supabase, authz.org.orgId, conversa, destino, authz.user.id);
    if (resultado === "mesmo_setor") return fail("validation_failed", t("A conversa já está nesse setor."), 422, { requestId });
```

e, no `audit`, `metadata: { para: destino }` (o `de` saía de `atual`; quem quiser o anterior lê `crm_setor_da_conversa.setor_anterior_id`). Import: `transferirConversaParaSetor` junto de `setorEfetivo`. O teste `tests/unit/escale-conversa-setor-rotas.test.ts` (3C) continua verde: as escritas e a RPC são as mesmas (o `audit` muda só no `metadata`; se o teste conferir `metadata.de`, troque a expectativa para `{ para: S2 }`).

- [ ] **Step 3: O executor**

Create `lib/escale/conversas/massa/executar.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { HandlerCtx } from "@/lib/api/handlers/types";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import type { EventRow, HandlerResult } from "@/lib/event-log/dispatcher";

import type { AcaoDaFila } from "../acoes-em-massa-da-fila";
import { camposParaEntrarEmEspera, camposParaSairDaEspera } from "../espera";

/**
 * O EXECUTOR DAS AÇÕES EM MASSA DA FILA (fork Escale, Fase 3D; N14–N16). Roda com
 * o service role, mas só sobre as conversas que `fn_escale_criar_acao_em_massa_de_conversas`
 * resolveu com a RLS de quem pediu. Cada conversa recebe o mesmo que a tela faz.
 * Lotes de 100, 20 s por rodada (como a 2B); o lote é marcado feito ANTES de agir.
 */
export const CONSUMIDOR_DA_MASSA_DA_FILA = "escale-acao-em-massa-conversas.v1";
export const LOTE = 100;
export const ORCAMENTO_MS = 20_000;
const ERROS_GUARDADOS = 50;
const TENTATIVAS_ANTES_DE_DESISTIR = 4;
const TAGS_DO_CONTATO_MAX = 20;
const ABERTOS = ["open", "pending", "claimed", "ai_handling"];
const FECHADOS = ["closed", "resolved"];

export type DependenciasDaMassa = {
  db: SupabaseClient;
  agora: () => number;
  mudarContato: (ctx: HandlerCtx, id: string, input: { tags: string[] }) => Promise<unknown>;
  transferirSetor: (
    db: SupabaseClient,
    orgId: string,
    conversa: { id: string; channel_session_id: string; assigned_to_user_id: string | null },
    destino: string,
    userId: string,
  ) => Promise<"transferida" | "mesmo_setor">;
};

type Acao = {
  id: string;
  organization_id: string;
  user_id: string;
  acao: AcaoDaFila;
  parametros: Record<string, unknown>;
  status: string;
  total: number;
  feitos: number;
  falhas: number;
  erros: Array<{ conversa: string | null; motivo: string }>;
};
type Conversa = {
  id: string;
  organization_id: string;
  status: string;
  service_revision: number;
  assigned_to_user_id: string | null;
  snooze_until: string | null;
  metadata: Record<string, unknown> | null;
  contact_id: string | null;
  channel_session_id: string;
};

const resultado = (status: HandlerResult["status"], detail?: string, retry_at?: string): HandlerResult => ({
  consumer_key: CONSUMIDOR_DA_MASSA_DA_FILA,
  status,
  ...(detail ? { detail } : {}),
  ...(retry_at ? { retry_at } : {}),
});

const emEspera = (c: Conversa, agora: number) => !!c.snooze_until && Date.parse(c.snooze_until) > agora;

async function evento(db: SupabaseClient, c: Conversa, tipo: string, userId: string) {
  const { error } = await db.from("crm_eventos_da_conversa").insert({ organization_id: c.organization_id, conversation_id: c.id, tipo, user_id: userId });
  if (error) throw new Error(error.message);
}

async function mudarStatus(db: SupabaseClient, c: Conversa, status: "open" | "closed") {
  const { error } = await db.rpc("fn_service_status", { p_org: c.organization_id, p_conversation: c.id, p_status: status, p_expected: c.service_revision });
  if (error) throw new Error(error.message);
}

async function atualizar(db: SupabaseClient, c: Conversa, campos: Record<string, unknown>) {
  const { error } = await db.from("conversations").update(campos).eq("organization_id", c.organization_id).eq("id", c.id);
  if (error) throw new Error(error.message);
}

async function agirNoStatus(acao: Acao, c: Conversa, deps: DependenciasDaMassa) {
  const alvo = acao.parametros.status as "em_aberto" | "fechado" | "em_espera";
  const fechada = FECHADOS.includes(c.status);
  if (alvo === "fechado") {
    if (fechada) return;
    await mudarStatus(deps.db, c, "closed");
    await evento(deps.db, c, "encerrado", acao.user_id);
    return;
  }
  if (fechada) {
    await mudarStatus(deps.db, c, "open");
    await evento(deps.db, c, "reaberto", acao.user_id);
  }
  if (alvo === "em_aberto") {
    if (!emEspera(c, deps.agora())) return;
    await atualizar(deps.db, c, camposParaSairDaEspera(c.metadata));
    await evento(deps.db, c, "espera_removida", acao.user_id);
    return;
  }
  if (emEspera(c, deps.agora())) return;
  await atualizar(deps.db, c, camposParaEntrarEmEspera(acao.user_id, new Date(deps.agora()), c.metadata));
  await evento(deps.db, c, "espera", acao.user_id);
}

async function agirNoAtendente(acao: Acao, c: Conversa, deps: DependenciasDaMassa) {
  const destino = (acao.parametros.user_id as string | null) ?? null;
  if (c.assigned_to_user_id === destino) return;
  const { error } = await deps.db.rpc("fn_conversation_assign", {
    p_organization_id: c.organization_id,
    p_conversation_id: c.id,
    p_to_user_id: destino as unknown as string,
    p_reason: destino ? "transfer" : "release",
    p_expected_assignee: null as unknown as string,
    p_enforce_expected: false,
  });
  if (error) throw new Error(error.message);
}

async function agirNaTag(acao: Acao, c: Conversa, deps: DependenciasDaMassa, feitosNoLote: Set<string>) {
  if (!c.contact_id || feitosNoLote.has(c.contact_id)) return;
  feitosNoLote.add(c.contact_id);
  const tag = normalizarTags([String(acao.parametros.tag ?? "")])[0];
  if (!tag) throw new Error("Tag inválida.");
  const { data, error } = await deps.db.from("contacts").select("id, tags").eq("organization_id", c.organization_id).eq("id", c.contact_id).maybeSingle();
  if (error) throw new Error(error.message);
  const atuais = normalizarTags(((data as { tags?: string[] | null } | null)?.tags ?? []) as string[]);
  const ctx: HandlerCtx = { organization_id: acao.organization_id, actor: { type: "user", id: acao.user_id }, requestId: acao.id };
  if (acao.acao === "incluir_tag") {
    if (atuais.includes(tag)) return;
    if (atuais.length >= TAGS_DO_CONTATO_MAX) throw new Error("O contato já tem 20 tags.");
    await deps.mudarContato(ctx, c.contact_id, { tags: [...atuais, tag] });
    return;
  }
  if (!atuais.includes(tag)) return;
  await deps.mudarContato(ctx, c.contact_id, { tags: atuais.filter((x) => x !== tag) });
}

async function agir(acao: Acao, c: Conversa | undefined, deps: DependenciasDaMassa, contatosDoLote: Set<string>) {
  if (!c) throw new Error("Conversa não encontrada.");
  if (c.status === "archived") throw new Error("A conversa está arquivada.");
  if (acao.acao === "status") return agirNoStatus(acao, c, deps);
  if (acao.acao === "atendente") return agirNoAtendente(acao, c, deps);
  if (acao.acao === "setor") {
    await deps.transferirSetor(deps.db, c.organization_id, c, String(acao.parametros.setor_id), acao.user_id);
    return;
  }
  return agirNaTag(acao, c, deps, contatosDoLote);
}

async function emLotes(acao: Acao, deps: DependenciasDaMassa): Promise<HandlerResult> {
  const inicio = deps.agora();
  let feitos = acao.feitos;
  let falhas = acao.falhas;
  const erros = [...acao.erros];
  while (deps.agora() - inicio < ORCAMENTO_MS) {
    const { data, error } = await deps.db
      .from("crm_acoes_em_massa_conversas_itens")
      .select("conversation_id")
      .eq("acao_id", acao.id)
      .eq("feito", false)
      .order("posicao", { ascending: true })
      .limit(LOTE);
    if (error) throw new Error(error.message);
    const ids = ((data ?? []) as Array<{ conversation_id: string }>).map((i) => i.conversation_id);
    if (ids.length === 0) {
      await deps.db.from("crm_acoes_em_massa_conversas").update({ status: "concluida", feitos, falhas, erros }).eq("id", acao.id);
      return resultado("ok");
    }
    const marcado = await deps.db.from("crm_acoes_em_massa_conversas_itens").update({ feito: true }).eq("acao_id", acao.id).in("conversation_id", ids);
    if (marcado.error) throw new Error(marcado.error.message);
    const lidas = await deps.db
      .from("conversations")
      .select("id, organization_id, status, service_revision, assigned_to_user_id, snooze_until, metadata, contact_id, channel_session_id")
      .eq("organization_id", acao.organization_id)
      .in("id", ids);
    if (lidas.error) throw new Error(lidas.error.message);
    const porId = new Map(((lidas.data ?? []) as Conversa[]).map((c) => [c.id, c]));
    const contatosDoLote = new Set<string>();
    for (const id of ids) {
      try {
        await agir(acao, porId.get(id), deps, contatosDoLote);
        feitos += 1;
      } catch (e) {
        falhas += 1;
        if (erros.length < ERROS_GUARDADOS) erros.push({ conversa: id, motivo: e instanceof Error ? e.message : String(e) });
      }
    }
    await deps.db.from("crm_acoes_em_massa_conversas").update({ feitos, falhas, erros }).eq("id", acao.id);
  }
  return resultado("retry", "orcamento", new Date(deps.agora() + 1000).toISOString());
}

export async function processarAcaoDaFila(row: EventRow, deps: DependenciasDaMassa): Promise<HandlerResult> {
  const acaoId = typeof row.payload?.acao_id === "string" ? row.payload.acao_id : null;
  if (!acaoId) return resultado("skipped", "sem_acao_id");
  const { data, error } = await deps.db
    .from("crm_acoes_em_massa_conversas")
    .select("id, organization_id, user_id, acao, parametros, status, total, feitos, falhas, erros")
    .eq("id", acaoId)
    .eq("organization_id", row.organization_id)
    .maybeSingle();
  if (error) return resultado("error", error.message);
  if (!data) return resultado("skipped", "acao_inexistente");
  const acao = data as Acao;
  if (acao.status === "concluida" || acao.status === "falhou") return resultado("ok", "ja_terminada");
  if (acao.status !== "na_fila" && acao.status !== "processando") return resultado("skipped", "fora_da_fila");
  if (acao.status !== "processando") {
    await deps.db.from("crm_acoes_em_massa_conversas").update({ status: "processando" }).eq("id", acao.id);
  }
  try {
    return await emLotes(acao, deps);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);
    if (row.attempts >= TENTATIVAS_ANTES_DE_DESISTIR) {
      await deps.db
        .from("crm_acoes_em_massa_conversas")
        .update({ status: "falhou", erros: [...acao.erros, { conversa: null, motivo }].slice(-ERROS_GUARDADOS) })
        .eq("id", acao.id);
      return resultado("ok", "falhou");
    }
    return resultado("error", motivo);
  }
}
```

O banco de mentira da 3C não tem `.in()` registrando nada além do filtro e devolve as linhas da tabela — o teste do arquivado espera `falhas: 1` porque a conversa lida vem com `status: "archived"`.

- [ ] **Step 4: O consumidor e o registro**

Create `lib/escale/conversas/massa/handler.ts`:

```ts
import { patchContactHandler } from "@/app/api/v1/contacts/_handler";
import type { EventHandler } from "@/lib/event-log/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";

import { EVENTO_DA_MASSA_DA_FILA } from "../acoes-em-massa-da-fila";
import { transferirConversaParaSetor } from "../setores-banco";

import { CONSUMIDOR_DA_MASSA_DA_FILA, processarAcaoDaFila, type DependenciasDaMassa } from "./executar";

/** As dependências reais (service role) — também usadas pela rota no caminho imediato (N15). */
export function dependenciasReais(): DependenciasDaMassa {
  const db = createAdminClient();
  return {
    db,
    agora: () => Date.now(),
    mudarContato: (ctx, id, input) => patchContactHandler(db, ctx, id, input),
    transferirSetor: transferirConversaParaSetor,
  };
}

/** Consumidor do `event_log` das ações em massa da fila (fork Escale, Fase 3D). Escrita interna pedida pela própria organização. */
export const acaoEmMassaDaFilaHandler: EventHandler = {
  key: CONSUMIDOR_DA_MASSA_DA_FILA,
  naOrgParada: "roda",
  events: [EVENTO_DA_MASSA_DA_FILA],
  async handle(row) {
    return processarAcaoDaFila(row, dependenciasReais());
  },
};
```

Em `lib/event-log/register-handlers.ts`: o import `import { acaoEmMassaDaFilaHandler } from "@/lib/escale/conversas/massa/handler";` logo depois do da 2B, e, logo depois de `registerHandler(acaoEmMassaHandler);`:

```ts
  // FORK ESCALE · Fase 3D: ações em massa da fila de Conversas (lotes com orçamento).
  registerHandler(acaoEmMassaDaFilaHandler);
```

Em `tests/unit/dispatcher-org-parada.test.ts`: o import ao lado do de `acaoEmMassaHandler` e `acaoEmMassaDaFilaHandler,` na lista logo depois de `acaoEmMassaHandler,`.

Em `lib/audit/actions.ts`, depois do bloco da 3C: `"conversations.bulk_requested",`.

- [ ] **Step 5: As rotas**

Create `app/api/v1/acoes-em-massa-conversas/route.ts`:

```ts
/**
 * POST /api/v1/acoes-em-massa-conversas — pedir uma ação em massa sobre a fila
 * (fork Escale, Fase 3D; B8; N13–N15). A permissão "Ações em massa" é conferida
 * aqui e de novo no banco. Até LIMITE_IMEDIATO conversas, executa na hora.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { LIMITE_IMEDIATO, pedidoDaFilaSchema } from "@/lib/escale/conversas/acoes-em-massa-da-fila";
import { compilarFiltrosDaFila } from "@/lib/escale/conversas/compilar-filtros-da-fila";
import { painelDoTexto } from "@/lib/escale/conversas/filtros-da-fila";
import { processarAcaoDaFila } from "@/lib/escale/conversas/massa/executar";
import { dependenciasReais } from "@/lib/escale/conversas/massa/handler";
import { pode } from "@/lib/escale/conversas/setores-banco";
import { lerJson } from "@/lib/escale/origens/respostas";
import type { EventRow } from "@/lib/event-log/dispatcher";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "crm_acoes_em_massa_conversas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const recusa = (texto: string, status = 422) => fail(status === 403 ? "forbidden" : "unprocessable_entity", t(texto), status, { requestId });
  const orgId = authz.org.orgId;

  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = pedidoDaFilaSchema.safeParse(corpo.json);
  if (!lido.success) return recusa("Ocorreu um erro ao executar a ação em massa!");
  const { acao, alvo, parametros } = lido.data;

  try {
    const supabase = await createClient();
    if (!(await pode(supabase, orgId, "CHAT_BULK_ACTIONS"))) return recusa("Sem permissão para ações em massa.", 403);
    if (acao === "atendente" && parametros.user_id) {
      const { data: membro } = await createAdminClient()
        .from("user_organizations")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", parametros.user_id)
        .is("revoked_at", null)
        .maybeSingle();
      if (!membro || (membro as { role: string }).role === "viewer") return recusa("Destino não é um atendente desta organização.");
    }
    if (acao === "setor") {
      const { data: setor } = await supabase.from("crm_setores").select("id").eq("organization_id", orgId).eq("id", parametros.setor_id).maybeSingle();
      if (!setor) return recusa("Setor não encontrado.");
    }
    let filtros: Record<string, unknown> | null = null;
    if (alvo.tipo === "filtro") {
      const painel = painelDoTexto(alvo.f);
      if (painel === null) return recusa("Ocorreu um erro ao executar a ação em massa!");
      filtros = compilarFiltrosDaFila(painel, alvo.q, await fusoDaOrganizacao(supabase, orgId));
    }
    const { data, error } = await supabase.rpc("fn_escale_criar_acao_em_massa_de_conversas", {
      p_org: orgId,
      p_acao: acao,
      p_parametros: parametros,
      p_ids: alvo.tipo === "ids" ? alvo.ids : null,
      p_filtros: filtros,
      p_quantidade: alvo.tipo === "filtro" ? alvo.quantidade : null,
      p_excluidos: alvo.tipo === "filtro" ? alvo.excluidos : null,
      p_imediato_ate: LIMITE_IMEDIATO,
    });
    if (error) {
      const m = error.message ?? "";
      if (m.includes("acao_em_massa_vazia")) return recusa("É preciso selecionar ao menos um Chat para realizar ações em massa!");
      if (m.includes("acao_em_massa_grande_demais")) return recusa("No máximo 100.000 conversas por ação.");
      if (m.includes("acao_em_massa_sem_permissao")) return recusa("Sem permissão para ações em massa.", 403);
      return fail("internal_error", m, 500, { requestId });
    }
    const linha = ((data ?? []) as Array<{ acao_id: string; quantidade: number; status: string }>)[0];
    if (!linha) return recusa("É preciso selecionar ao menos um Chat para realizar ações em massa!");
    void audit({ action: "conversations.bulk_requested", actorUserId: authz.user.id, organizationId: orgId, resourceType: "crm_acoes_em_massa_conversas", resourceId: linha.acao_id, requestId, metadata: { acao, total: linha.quantidade, alvo: alvo.tipo } });

    if (linha.quantidade > LIMITE_IMEDIATO) return ok({ id: linha.acao_id, total: linha.quantidade, status: "na_fila" }, { status: 201, requestId });
    // N15: na hora, com o mesmo executor. Falhou no meio: o evento entrega ao consumidor.
    const sintetico = { id: requestId, organization_id: orgId, event_type: "conversas.acao_em_massa_requested", entity_kind: "crm_acao_em_massa_conversas", entity_id: linha.acao_id, payload: { acao_id: linha.acao_id }, metadata: {}, consumed_by: [], attempts: 0 } as unknown as EventRow;
    const fim = await processarAcaoDaFila(sintetico, dependenciasReais());
    if (fim.status !== "ok") {
      logger.warn("acoes-em-massa-conversas: o caminho imediato não terminou; entregando ao consumidor", { organization_id: orgId, acao_id: linha.acao_id, detail: fim.detail ?? fim.status });
      await createAdminClient().rpc("emit_event", { p_event_type: "conversas.acao_em_massa_requested", p_entity_kind: "crm_acao_em_massa_conversas", p_entity_id: linha.acao_id, p_payload: { acao_id: linha.acao_id }, p_metadata: {}, p_organization_id: orgId });
      return ok({ id: linha.acao_id, total: linha.quantidade, status: "processando" }, { status: 201, requestId });
    }
    return ok({ id: linha.acao_id, total: linha.quantidade, status: "concluida" }, { status: 201, requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

Create `app/api/v1/acoes-em-massa-conversas/[id]/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import type { ResumoDaAcaoDaFila } from "@/lib/escale/conversas/acoes-em-massa-da-fila";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/v1/acoes-em-massa-conversas/[id] — o andamento da MINHA ação (a RLS só mostra as minhas). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_acoes_em_massa_conversas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const id = lerUuid((await ctx.params).id);
  if (!id) return fail("not_found", t("Ação não encontrada."), 404, { requestId });
  const { data, error } = await (await createClient())
    .from("crm_acoes_em_massa_conversas")
    .select("id, acao, status, total, feitos, falhas")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!data) return fail("not_found", t("Ação não encontrada."), 404, { requestId });
  return ok(data as ResumoDaAcaoDaFila, { requestId });
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-acoes-em-massa-da-fila.test.ts tests/unit/escale-conversa-setor-rotas.test.ts tests/unit/dispatcher-org-parada.test.ts && corepack pnpm prettier --write lib/escale/conversas/massa app/api/v1/acoes-em-massa-conversas tests/unit/escale-acoes-em-massa-da-fila.test.ts && corepack pnpm eslint lib/escale/conversas app/api/v1/acoes-em-massa-conversas "app/api/v1/conversas-da-casca/[id]/setor" lib/event-log/register-handlers.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/escale/conversas/massa lib/escale/conversas/setores-banco.ts "app/api/v1/conversas-da-casca/[id]/setor/route.ts" app/api/v1/acoes-em-massa-conversas lib/event-log/register-handlers.ts tests/unit/dispatcher-org-parada.test.ts lib/audit/actions.ts tests/unit/escale-acoes-em-massa-da-fila.test.ts tests/unit/escale-conversa-setor-rotas.test.ts
git commit -m "feat(escale): ações em massa da fila no servidor — executor, consumidor e rotas (Fase 3D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Os hooks (a fila pela rota do fork, o total, a ação, os grupos de origens)

**Files:**
- Modify: `hooks/escale/useFilaDeConversas.ts`, `tests/unit/escale-fila-de-conversas-hook.test.tsx` (3A)
- Create: `hooks/escale/useTotalDaFila.ts`, `hooks/escale/useAcoesEmMassaDaFila.ts`, `hooks/escale/useGruposDasOrigens.ts`, `tests/unit/escale-hooks-da-3d.test.tsx`

**Interfaces:**
- Produces: `ConsultaDaFila = { painel: FiltrosDoPainel; ordem: Ordem; busca?: string }`; `useFilaDeConversas(consulta, orgId)` (a mesma volta da 3A: lista infinita + `realtimeStatus` + `seguranca`); `chaveDaFila(consulta) = ["conversations", { casca: true, ...consulta }]`; `urlDaFila(consulta, cursor?)`; `parametrosDaConsulta(consulta) → URLSearchParams`; `useTotalDaFila(consulta, ativo) → UseQueryResult<number>` (chave `["conversations", "total-da-casca", …]`); `useExecutarAcaoDaFila()` (mutation `PedidoDaFila` → `{ id, total, status }`); `useAcaoDaFila(id: string | null) → UseQueryResult<ResumoDaAcaoDaFila>` (de 3 em 3 s enquanto `acaoRodando`); `useGruposDasOrigens() → UseQueryResult<Array<{ id: string; nome: string }>>`.

- [ ] **Step 1: O teste da 3A acompanha a rota nova (vai falhar)**

Em `tests/unit/escale-fila-de-conversas-hook.test.tsx` (3A), troque o primeiro `it` de `describe("useFilaDeConversas")` e o `expect(api.get)` do segundo por:

```tsx
  it("monta a URL da fila da casca com o painel, a busca, a ordem, o cursor e limit 50", () => {
    expect(
      urlDaFila({ painel: { conversas: { status: ["em_espera"] } }, ordem: "espera", busca: "neto" }, "abc"),
    ).toBe(
      `/api/v1/fila-da-casca?f=${encodeURIComponent('{"conversas":{"status":["em_espera"]}}')}&q=neto&o=espera&cursor=abc&limit=50`,
    );
    expect(urlDaFila({ painel: {}, ordem: "interacao" })).toBe("/api/v1/fila-da-casca?limit=50");
    expect(chaveDaFila({ painel: {}, ordem: "interacao" })).toEqual(["conversations", { casca: true, painel: {}, ordem: "interacao" }]);
  });
```

e, no segundo `it`, `useFilaDeConversas({ painel: {}, ordem: "interacao" }, "org1")` e `expect(api.get).toHaveBeenCalledWith("/api/v1/fila-da-casca?limit=50");`. Tire o import de `STATUS_ABERTOS` se ficar sem uso.

Create `tests/unit/escale-hooks-da-3d.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiClient: api }));

import { useAcaoDaFila, useExecutarAcaoDaFila } from "@/hooks/escale/useAcoesEmMassaDaFila";
import { useGruposDasOrigens } from "@/hooks/escale/useGruposDasOrigens";
import { useTotalDaFila } from "@/hooks/escale/useTotalDaFila";

const envolver = (qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };

describe("hooks da 3D", () => {
  it("o total lê a rota com o mesmo painel da fila, só quando ativo", async () => {
    api.get.mockResolvedValueOnce({ data: { total: 56128 } });
    const { result, rerender } = renderHook(({ ativo }) => useTotalDaFila({ painel: { canais: [] }, ordem: "interacao" }, ativo), {
      wrapper: envolver(),
      initialProps: { ativo: false },
    });
    expect(api.get).not.toHaveBeenCalled();
    rerender({ ativo: true });
    await waitFor(() => expect(result.current.data).toBe(56128));
    expect(api.get).toHaveBeenCalledWith("/api/v1/fila-da-casca/total");
  });

  it("executar posta o pedido; acompanhar lê a ação", async () => {
    api.post.mockResolvedValueOnce({ data: { id: "a1", total: 2, status: "concluida" } });
    api.get.mockResolvedValueOnce({ data: { id: "a1", acao: "status", status: "concluida", total: 2, feitos: 2, falhas: 0 } });
    const { result } = renderHook(() => ({ exec: useExecutarAcaoDaFila(), acao: useAcaoDaFila("a1") }), { wrapper: envolver() });
    await act(async () => {
      await result.current.exec.mutateAsync({ acao: "status", alvo: { tipo: "ids", ids: ["x"] }, parametros: { status: "fechado" } });
    });
    expect(api.post).toHaveBeenCalledWith("/api/v1/acoes-em-massa-conversas", expect.objectContaining({ acao: "status" }));
    await waitFor(() => expect(result.current.acao.data?.feitos).toBe(2));
  });

  it("os grupos de origens: só os ativos, por nome", async () => {
    api.get.mockResolvedValueOnce({ data: { grupos: [{ id: "g2", name: "Vendas", is_archived: false }, { id: "g1", name: "Antigo", is_archived: true }], funis: [] } });
    const { result } = renderHook(() => useGruposDasOrigens(), { wrapper: envolver() });
    await waitFor(() => expect(result.current.data).toEqual([{ id: "g2", nome: "Vendas" }]));
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-fila-de-conversas-hook.test.tsx tests/unit/escale-hooks-da-3d.test.tsx`
Expected: FAIL.

- [ ] **Step 2: `useFilaDeConversas` pela rota da casca**

Em `hooks/escale/useFilaDeConversas.ts` (3A), troque `chaveDaFila`, `urlDaFila`, a assinatura e o import de `FiltrosDaFila`:

```ts
import { enxugarFiltrosDoPainel, temCriterios, type FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";
import type { Ordem } from "@/lib/escale/conversas/ordem";

/** FORK ESCALE · Fase 3D: o painel, a ordem e a busca (a rota da casca avalia no banco, N9). */
export interface ConsultaDaFila {
  painel: FiltrosDoPainel;
  ordem: Ordem;
  busca?: string;
}

export const chaveDaFila = (consulta: ConsultaDaFila) => ["conversations", { casca: true, ...consulta }] as const;

export function parametrosDaConsulta(consulta: ConsultaDaFila): URLSearchParams {
  const qs = new URLSearchParams();
  const painel = enxugarFiltrosDoPainel(consulta.painel);
  if (temCriterios(painel)) qs.set("f", JSON.stringify(painel));
  if (consulta.busca) qs.set("q", consulta.busca);
  if (consulta.ordem === "espera") qs.set("o", "espera");
  return qs;
}

export function urlDaFila(consulta: ConsultaDaFila, cursor?: string): string {
  const qs = parametrosDaConsulta(consulta);
  if (cursor) qs.set("cursor", cursor);
  qs.set("limit", String(LIMITE_DA_FILA));
  return `/api/v1/fila-da-casca?${qs.toString()}`;
}

export function useFilaDeConversas(consulta: ConsultaDaFila, orgId: string | null) {
  const qc = useQueryClient();
  const queryKey = useMemo(() => chaveDaFila(consulta), [consulta]);
```

e, dentro do `queryFn`, `urlDaFila(consulta, pageParam)` no lugar de `urlDaFila(filtros, pageParam)`. O resto (realtime, recarga de segurança) não muda. O comentário do topo ganha: `FORK ESCALE · Fase 3D: lê /api/v1/fila-da-casca (o painel de filtros no banco); a chave continua "conversations".`

- [ ] **Step 3: Os hooks novos**

Create `hooks/escale/useTotalDaFila.ts`:

```ts
"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";

import { parametrosDaConsulta, type ConsultaDaFila } from "./useFilaDeConversas";

/** Quantas conversas o painel alcança (N12: "Selecionar todas as N"; N7: tem grupo?). A chave começa por "conversations": o tempo real a atualiza. */
export function useTotalDaFila(consulta: ConsultaDaFila, ativo: boolean) {
  const qs = parametrosDaConsulta({ ...consulta, ordem: "interacao" }).toString();
  return useQuery({
    queryKey: ["conversations", "total-da-casca", qs],
    enabled: ativo,
    staleTime: 30_000,
    queryFn: async () =>
      (await apiClient.get<{ data: { total: number } }>(`/api/v1/fila-da-casca/total${qs ? `?${qs}` : ""}`)).data.total,
  });
}
```

Create `hooks/escale/useAcoesEmMassaDaFila.ts`:

```ts
"use client";
import { useMutation, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import {
  acaoRodando,
  type EstadoDaAcaoDaFila,
  type PedidoDaFila,
  type ResumoDaAcaoDaFila,
} from "@/lib/escale/conversas/acoes-em-massa-da-fila";

const ROTA = "/api/v1/acoes-em-massa-conversas";
const INTERVALO_MS = 3000;

export function useExecutarAcaoDaFila() {
  return useMutation({
    mutationFn: async (pedido: PedidoDaFila) =>
      (await apiClient.post<{ data: { id: string; total: number; status: EstadoDaAcaoDaFila } }>(ROTA, pedido)).data,
  });
}

/** O andamento da ação em segundo plano (N15): pergunta a cada 3 s enquanto roda. */
export function useAcaoDaFila(id: string | null) {
  return useQuery({
    queryKey: ["acao-em-massa-da-fila", id],
    enabled: !!id,
    queryFn: async () => (await apiClient.get<{ data: ResumoDaAcaoDaFila }>(`${ROTA}/${id}`)).data,
    refetchInterval: (q) => (q.state.data && !acaoRodando(q.state.data.status) ? false : INTERVALO_MS),
  });
}
```

Create `hooks/escale/useGruposDasOrigens.ts`:

```ts
"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { Origens } from "@/lib/escale/origens/regras";

/** Os grupos de origens ativos (1A), por nome — o "Negócio nos grupos" do painel (N20). */
export function useGruposDasOrigens() {
  return useQuery({
    queryKey: ["pipeline-groups", "ativos"],
    staleTime: 5 * 60_000,
    queryFn: async () => (await apiClient.get<{ data: Origens }>("/api/v1/pipeline-groups")).data,
    select: (o) =>
      o.grupos
        .filter((g) => !g.is_archived)
        .map((g) => ({ id: g.id, nome: g.name }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-fila-de-conversas-hook.test.tsx tests/unit/escale-hooks-da-3d.test.tsx && corepack pnpm prettier --write hooks/escale/useTotalDaFila.ts hooks/escale/useAcoesEmMassaDaFila.ts hooks/escale/useGruposDasOrigens.ts tests/unit/escale-hooks-da-3d.test.tsx && corepack pnpm eslint hooks/escale && corepack pnpm typecheck`
Expected: os testes PASS; o typecheck acusa `ConversasDasCasca.tsx` (ainda chama `useFilaDeConversas(filtros, orgId)`): é o encaixe da Task 8 — para o commit desta task ficar verde, troque já em `components/escale/conversas/ConversasDaCasca.tsx` a chamada por `useFilaDeConversas({ painel: PAINEL_DO_PRESET[preset], ordem, ...(buscaValeConsulta(busca) ? { busca } : {}) }, orgId)` (import de `PAINEL_DO_PRESET` de `@/lib/escale/conversas/filtros-da-fila`) e apague o `useMemo` de `filtros`. A Task 8 troca isso pelo painel.

- [ ] **Step 5: Commit**

```bash
git add hooks/escale tests/unit/escale-fila-de-conversas-hook.test.tsx tests/unit/escale-hooks-da-3d.test.tsx components/escale/conversas/ConversasDaCasca.tsx
git commit -m "feat(escale): a fila lê a rota da casca; hooks do total, da ação em massa e dos grupos de origens (Fase 3D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: O painel "Filtros" (os cinco acordeões e as peças)

**Files:**
- Modify: `components/escale/ui/CalendarioDePeriodo.tsx` (`soDisponiveis`), `lib/ui/icons-da-casca.ts`
- Create: `components/escale/conversas/filtros/SeletorDoFiltro.tsx`, `CampoDePeriodoDaFila.tsx`, `GrupoDaFila.tsx`, `SecaoConversasDaFila.tsx`, `SecaoGruposDaFila.tsx`, `SecaoNegociosDaFila.tsx`, `SecaoContatosDaFila.tsx`, `SecaoCanaisDaFila.tsx`, `PainelDeFiltrosDaFila.tsx`, `tests/unit/escale-painel-de-filtros-da-fila.test.tsx`

**Interfaces:**
- Consumes: as regras da Task 1; `useAssignableMembers`, `useAssignableAgents`, `useSetores` (3C), `useChannelSessions`, `useGruposDasOrigens` (Task 6); `agruparDispositivos`, `ROTULO_DO_GRUPO`, `bolinhaDoDispositivo` (3A, `nova-conversa.ts`); `SecaoTagsDoFiltro` (2B); `OpcoesDoFiltro` (2B); `CalendarioDePeriodo`, `CaixaDaCasca`, `InterruptorDaCasca`, `PainelSuspenso`, `ChannelLogo`.
- Produces: `SeletorDoFiltro<V>({ valores, opcoes, aoMudar, multiplo?, vazio?, "aria-label", desabilitado?, dica?, limite? })` com `OpcaoDoFiltro<V> = { valor; rotulo; grupo?; selo?; desabilitada? }`; `CampoDePeriodoDaFila({ rotulo, valor, aoMudar, tipos? })`; `GrupoDaFila({ rotulo, children })`; as cinco seções `({ painel, aoMudar, … })`; `PainelDeFiltrosDaFila({ painel, aoMudar, aoFechar, opcoes, temGrupos, cabecalho? })` (o `cabecalho` recebe o "Salvar filtro" da Task 8).

Abra c32, c64–c70, c33–c36 e c76–c80 antes.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-painel-de-filtros-da-fila.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "o1", role: "manager" }, user: { id: "u1" } }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [{ user_id: "b0000000-0000-4000-8000-000000000001", full_name: "Camilly" }] }) }));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: [{ agent_id: "c0000000-0000-4000-8000-000000000001", name: "Qualificação" }] }) }));
vi.mock("@/hooks/escale/useSetores", () => ({ useSetores: () => ({ data: [{ id: "d0000000-0000-4000-8000-000000000001", nome: "Atendimento", cor: "#597EFF", ids_dos_dispositivos: [] }] }) }));
vi.mock("@/hooks/escale/useGruposDasOrigens", () => ({ useGruposDasOrigens: () => ({ data: [] }) }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: [{ id: "e0000000-0000-4000-8000-000000000001", provider: "waha", status: "STOPPED", display_name: "Bathuly - 3062", phone_number: null }] }),
}));
vi.mock("@/components/inbox/ChannelLogo", () => ({ ChannelLogo: () => <span data-testid="logo" /> }));

import { PainelDeFiltrosDaFila } from "@/components/escale/conversas/filtros/PainelDeFiltrosDaFila";
import { OPCOES_VAZIAS } from "@/lib/escale/contatos/opcoes-do-filtro";
import type { FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => window.localStorage.clear());

describe("PainelDeFiltrosDaFila (c32, c64)", () => {
  it("os acordeões; Grupos só com grupos; o selo e o X da seção; Resetar só com critério", () => {
    const aoMudar = vi.fn();
    const painel: FiltrosDoPainel = { conversas: { status: ["em_espera"] } };
    const { rerender } = wrap(<PainelDeFiltrosDaFila painel={painel} aoMudar={aoMudar} aoFechar={vi.fn()} opcoes={OPCOES_VAZIAS} temGrupos={false} />);
    expect(screen.getByRole("button", { name: "Conversas" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Grupos" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Negócios" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contatos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Canais" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar Conversas" }));
    expect(aoMudar).toHaveBeenCalledWith({});
    fireEvent.click(screen.getByRole("button", { name: "Resetar" }));
    expect(aoMudar).toHaveBeenLastCalledWith({});
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <PainelDeFiltrosDaFila painel={{}} aoMudar={aoMudar} aoFechar={vi.fn()} opcoes={OPCOES_VAZIAS} temGrupos />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("button", { name: "Resetar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grupos" })).toBeInTheDocument();
  });

  it("Conversas: os 12 toggles na ordem da Clint; os de chamada desligados; ligar grava a marca", () => {
    const aoMudar = vi.fn();
    wrap(<PainelDeFiltrosDaFila painel={{}} aoMudar={aoMudar} aoFechar={vi.fn()} opcoes={OPCOES_VAZIAS} temGrupos={false} />);
    const chaves = screen.getAllByRole("switch");
    expect(chaves).toHaveLength(12);
    expect(screen.getByRole("switch", { name: "Janela de chamada aberta" })).toBeDisabled();
    fireEvent.click(screen.getByRole("switch", { name: "Conversas suspensas" }));
    expect(aoMudar).toHaveBeenCalledWith({ conversas: { marcas: ["suspensas"] } });
    expect(screen.getAllByTestId("logo")).toHaveLength(4);
  });

  it("Canais: os dispositivos agrupados com 'Desconectado'", () => {
    wrap(<PainelDeFiltrosDaFila painel={{}} aoMudar={vi.fn()} aoFechar={vi.fn()} opcoes={OPCOES_VAZIAS} temGrupos={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Canais" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Canais e Dispositivos" }));
    const lista = screen.getByRole("group", { name: "WHATSAPP" });
    expect(within(lista).getByText("Desconectado")).toBeInTheDocument();
  });

  it("lembra os acordeões abertos no navegador", () => {
    wrap(<PainelDeFiltrosDaFila painel={{}} aoMudar={vi.fn()} aoFechar={vi.fn()} opcoes={OPCOES_VAZIAS} temGrupos={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Negócios" }));
    expect(JSON.parse(window.localStorage.getItem("escale_acordeoes_da_fila") ?? "[]")).toContain("negocios");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-painel-de-filtros-da-fila.test.tsx`
Expected: FAIL.

- [ ] **Step 2: `soDisponiveis` no calendário e os ícones**

Em `components/escale/ui/CalendarioDePeriodo.tsx`: em `CalendarioDePeriodoProps`, depois de `semAbas?: boolean;`:

```ts
  /** FORK ESCALE · Fase 3D: só as abas de `tiposDisponiveis` (c76 tem três ícones, não quatro). */
  soDisponiveis?: boolean;
```

na assinatura `{ valor, aoMudar, tiposDisponiveis = [...TIPOS_DE_DATA], semAbas = false, soDisponiveis = false }`, e no `TIPOS_DE_DATA.map((tipo, i) => …)` das abas troque a lista por `(soDisponiveis ? TIPOS_DE_DATA.filter((x) => tiposDisponiveis.includes(x)) : TIPOS_DE_DATA)`, com o arredondamento do último calculado sobre essa mesma lista (guarde-a numa `const abas = …` antes do `return` e use `i === abas.length - 1`).

Em `lib/ui/icons-da-casca.ts`, uma linha com os que faltam de `Bookmark, RefreshCcw, ArrowLeftRight, UsersRound, Tags` (confira antes; `Bookmark` já existe):

```ts
export { RefreshCcw, ArrowLeftRight, UsersRound, Tags } from "lucide-react";
```

- [ ] **Step 3: As peças**

Create `components/escale/conversas/filtros/GrupoDaFila.tsx`:

```tsx
import type { ReactNode } from "react";

/** Um grupo do painel (c32): o rótulo 13px/500 e o controle 6px abaixo. */
export function GrupoDaFila({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-casca-texto">{rotulo}</span>
      {children}
    </div>
  );
}
```

Create `components/escale/conversas/filtros/SeletorDoFiltro.tsx`:

```tsx
"use client";
import { useState } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { ChevronDown, ChevronUp } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export interface OpcaoDoFiltro<V extends string> {
  valor: V;
  rotulo: string;
  grupo?: string;
  selo?: string;
  desabilitada?: boolean;
}

function agrupar<V extends string>(opcoes: readonly OpcaoDoFiltro<V>[]) {
  const blocos: Array<{ grupo?: string; itens: OpcaoDoFiltro<V>[] }> = [];
  for (const o of opcoes) {
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.grupo === o.grupo) ultimo.itens.push(o);
    else blocos.push({ grupo: o.grupo, itens: [o] });
  }
  return blocos;
}

/**
 * O SELETOR DOS FILTROS DA FILA (fork Escale, Fase 3D; o select da Clint em c65,
 * c67–c70, c35, c77, c79, c80): gatilho de 32px cinza com "Selecione...", que fica
 * branco com a borda da marca aberto; a lista com caixinhas (38px), os grupos em
 * caixa alta e o selo ("Desconectado"). `multiplo={false}` escolhe um e fecha.
 * `limite` desliga as não marcadas quando chega nele (Agentes: 20).
 */
export function SeletorDoFiltro<V extends string>({
  valores,
  opcoes,
  aoMudar,
  multiplo = true,
  vazio,
  "aria-label": rotulo,
  desabilitado = false,
  dica,
  limite,
}: {
  valores: readonly V[];
  opcoes: readonly OpcaoDoFiltro<V>[];
  aoMudar: (valores: V[]) => void;
  multiplo?: boolean;
  vazio?: string;
  "aria-label": string;
  desabilitado?: boolean;
  dica?: string;
  limite?: number;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const nomes = opcoes.filter((o) => valores.includes(o.valor)).map((o) => o.rotulo);
  const cheio = limite !== undefined && valores.length >= limite;

  function alternar(v: V, marcar: boolean) {
    if (!multiplo) {
      aoMudar(marcar ? [v] : []);
      setAberto(false);
      return;
    }
    aoMudar(marcar ? [...valores.filter((x) => x !== v), v] : valores.filter((x) => x !== v));
  }

  return (
    <Popover open={aberto && !desabilitado} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={rotulo}
          aria-expanded={aberto}
          disabled={desabilitado}
          title={desabilitado ? dica : undefined}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-casca-gatilho border px-2.5 text-left text-[13px] disabled:cursor-not-allowed disabled:opacity-60",
            aberto ? "border-casca-marca bg-surface" : "border-transparent bg-casca-busca",
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", nomes.length ? "text-casca-texto" : "text-casca-meta")}>
            {nomes.length ? nomes.join(", ") : (vazio ?? t("Selecione..."))}
          </span>
          {aberto ? (
            <ChevronUp size={14} aria-hidden className="shrink-0 text-casca-suave" />
          ) : (
            <ChevronDown size={14} aria-hidden className="shrink-0 text-casca-suave" />
          )}
        </button>
      </PopoverTrigger>
      <PainelSuspenso aria-label={rotulo} sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-1">
        <div className="max-h-[360px] overflow-y-auto">
          {opcoes.length === 0 ? <p className="px-3 py-2 text-[12px] text-casca-suave">{t("Nenhuma opção.")}</p> : null}
          {agrupar(opcoes).map((b, i) => (
            <div key={b.grupo ?? `bloco-${i}`} role="group" aria-label={b.grupo}>
              {b.grupo ? (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-casca-meta uppercase">{b.grupo}</p>
              ) : null}
              {b.itens.map((o) => {
                const marcada = valores.includes(o.valor);
                const bloqueada = !!o.desabilitada || (!marcada && cheio);
                return multiplo ? (
                  <div
                    key={o.valor}
                    title={bloqueada ? dica : undefined}
                    className={cn("flex h-[38px] items-center gap-2 rounded-[4px] px-3 hover:bg-casca-raia", marcada && "bg-casca-marca-suave")}
                  >
                    <CaixaDaCasca marcada={marcada} aoMudar={(m) => alternar(o.valor, m)} rotulo={o.rotulo} desabilitada={bloqueada} />
                    {o.selo ? <span className="rounded-[4px] bg-casca-raia px-1.5 text-[11px] text-casca-suave">{o.selo}</span> : null}
                  </div>
                ) : (
                  <button
                    key={o.valor}
                    type="button"
                    role="option"
                    aria-selected={marcada}
                    onClick={() => alternar(o.valor, !marcada)}
                    className={cn("flex h-[38px] w-full items-center rounded-[4px] px-3 text-left text-[13px] hover:bg-casca-raia", marcada ? "text-casca-marca" : "text-casca-texto")}
                  >
                    {o.rotulo}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
```

Create `components/escale/conversas/filtros/CampoDePeriodoDaFila.tsx`:

```tsx
"use client";
import { useState } from "react";

import { CalendarioDePeriodo, type TipoDeData } from "@/components/escale/ui/CalendarioDePeriodo";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { textoDoPeriodo } from "@/lib/escale/contatos/filtros";
import { Calendar, X } from "@/lib/ui/icons-da-casca";

type Valor<T extends TipoDeData> = { tipo: T; de?: string; ate?: string };

/**
 * O CAMPO DE DATA DO PAINEL (c32, c66, c76): o gatilho de 32px "Selecione uma data"
 * e o calendário da casca. Sem `tipos`, sem abas (Conversas); com `tipos`, só as
 * abas pedidas (Negócios: criação, ganho, perda). Trocar de aba sem datas não filtra.
 */
export function CampoDePeriodoDaFila<T extends TipoDeData>({
  rotulo,
  valor,
  aoMudar,
  tipos,
}: {
  rotulo: string;
  valor: Valor<T> | null;
  aoMudar: (v: Valor<T> | null) => void;
  tipos?: readonly T[];
}) {
  const t = useT();
  const [tipo, setTipo] = useState<T>(valor?.tipo ?? (tipos?.[0] ?? ("criacao" as T)));
  const atual = valor && valor.tipo === tipo ? valor : { tipo };
  return (
    <span className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" aria-label={rotulo} className="flex h-8 w-full items-center justify-between rounded-casca-gatilho bg-casca-busca px-2.5 text-left text-[13px]">
            <span className={valor ? "text-casca-texto" : "text-casca-meta"}>{valor ? textoDoPeriodo(valor) : t("Selecione uma data")}</span>
            <Calendar size={14} aria-hidden className="text-casca-suave" />
          </button>
        </PopoverTrigger>
        <PainelSuspenso className="w-auto p-0">
          <CalendarioDePeriodo
            valor={atual}
            semAbas={!tipos}
            tiposDisponiveis={tipos ? [...tipos] : undefined}
            soDisponiveis
            aoMudar={(p) => {
              setTipo(p.tipo as T);
              aoMudar(p.de || p.ate ? { tipo: p.tipo as T, ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) } : null);
            }}
          />
        </PainelSuspenso>
      </Popover>
      {valor ? (
        <button type="button" aria-label={`${t("Limpar")} ${rotulo}`} onClick={() => aoMudar(null)} className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto">
          <X size={14} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 4: As seções**

Create `components/escale/conversas/filtros/SecaoConversasDaFila.tsx`:

```tsx
"use client";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import {
  AGENTES_MAX,
  MARCAS_DE_CHAMADA,
  MARCAS_DO_OFICIAL,
  MARCAS_NA_TELA,
  ROTULO_DA_MARCA,
  ROTULO_DO_STATUS_DA_FILA,
  SEM_ATENDENTE,
  STATUS_DA_FILA,
  type ConversasDoPainel,
  type FiltrosDoPainel,
  type Marca,
} from "@/lib/escale/conversas/filtros-da-fila";

import { CampoDePeriodoDaFila } from "./CampoDePeriodoDaFila";
import { GrupoDaFila } from "./GrupoDaFila";
import { SeletorDoFiltro } from "./SeletorDoFiltro";

const LOGO_DO_OFICIAL = { provider: "meta_cloud", display_name: null, phone_number: null };

/** Conversas (c32, c65–c70; N4, N5). Atendentes só para gerente e administrador. */
export function SecaoConversasDaFila({ painel, aoMudar }: { painel: FiltrosDoPainel; aoMudar: (f: FiltrosDoPainel) => void }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const veOTime = activeOrg?.role === "admin" || activeOrg?.role === "manager";
  const { data: membros = [] } = useAssignableMembers(veOTime);
  const { data: agentes = [] } = useAssignableAgents(true);
  const { data: setores = [] } = useSetores();
  const c: ConversasDoPainel = painel.conversas ?? {};
  const marcas = c.marcas ?? [];
  const mudar = (parte: Partial<ConversasDoPainel>) => aoMudar({ ...painel, conversas: { ...c, ...parte } });

  return (
    <>
      <ul className="flex flex-col gap-1">
        {MARCAS_NA_TELA.map((m) => {
          const deChamada = (MARCAS_DE_CHAMADA as readonly string[]).includes(m);
          const ligada = !deChamada && marcas.includes(m as Marca);
          return (
            <li key={m} className="flex h-7 items-center justify-between gap-2 text-[13px] text-casca-texto">
              <span>{t(ROTULO_DA_MARCA[m])}</span>
              <span className="flex items-center gap-2">
                {MARCAS_DO_OFICIAL.includes(m) ? <ChannelLogo channel={LOGO_DO_OFICIAL as never} size={14} /> : null}
                <InterruptorDaCasca
                  ligado={ligada}
                  desabilitado={deChamada}
                  title={deChamada ? t("Em breve") : undefined}
                  aria-label={t(ROTULO_DA_MARCA[m])}
                  aoMudar={(v) => mudar({ marcas: v ? [...marcas, m as Marca] : marcas.filter((x) => x !== m) })}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <GrupoDaFila rotulo={t("Data de criação do atendimento")}>
        <CampoDePeriodoDaFila
          rotulo={t("Data de criação do atendimento")}
          valor={c.criadaEm ? { tipo: "criacao", ...c.criadaEm } : null}
          aoMudar={(v) => mudar({ criadaEm: v ? { de: v.de, ate: v.ate } : undefined })}
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Status da conversa")}>
        <SeletorDoFiltro
          aria-label={t("Status da conversa")}
          valores={c.status ?? []}
          opcoes={STATUS_DA_FILA.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_STATUS_DA_FILA[s]) }))}
          aoMudar={(status) => mudar({ status })}
        />
      </GrupoDaFila>
      {veOTime ? (
        <GrupoDaFila rotulo={t("Atendentes")}>
          <SeletorDoFiltro
            aria-label={t("Atendentes")}
            valores={c.atendentes ?? []}
            opcoes={[
              { valor: SEM_ATENDENTE, rotulo: t("Sem atendente") },
              ...membros.map((m) => ({ valor: m.user_id, rotulo: m.full_name?.trim() || t("Sem nome") })),
            ]}
            aoMudar={(atendentes) => mudar({ atendentes })}
          />
        </GrupoDaFila>
      ) : null}
      <GrupoDaFila rotulo={t("Agentes")}>
        <SeletorDoFiltro
          aria-label={t("Agentes")}
          valores={c.agentes ?? []}
          opcoes={agentes.map((a) => ({ valor: a.agent_id, rotulo: a.name }))}
          aoMudar={(ids) => mudar({ agentes: ids })}
          limite={AGENTES_MAX}
          dica={t("Você pode filtrar por até 20 agentes.")}
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Setores")}>
        <SeletorDoFiltro
          aria-label={t("Setores")}
          valores={c.setores ?? []}
          opcoes={setores.map((s) => ({ valor: s.id, rotulo: s.nome }))}
          aoMudar={(ids) => mudar({ setores: ids })}
        />
      </GrupoDaFila>
    </>
  );
}
```

`LOGO_DO_OFICIAL as never`: confira o tipo do `channel` em `components/inbox/ChannelLogo.tsx`; se ele aceitar `{ provider }`, tire o `as never` e tipe a constante com o tipo da prop (`Parameters<typeof ChannelLogo>[0]["channel"]`).

Create `components/escale/conversas/filtros/SecaoGruposDaFila.tsx`:

```tsx
"use client";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DO_PRESET_DE_GRUPO, type FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";

/** Grupos (B1; `component.ChatFilters.onlyConversations/onlyGroups`): um ou outro. */
export function SecaoGruposDaFila({ painel, aoMudar }: { painel: FiltrosDoPainel; aoMudar: (f: FiltrosDoPainel) => void }) {
  const t = useT();
  const linha = (valor: "conversas" | "grupos", rotulo: string) => (
    <li className="flex h-7 items-center justify-between text-[13px] text-casca-texto">
      <span>{t(rotulo)}</span>
      <InterruptorDaCasca ligado={painel.grupos === valor} aria-label={t(rotulo)} aoMudar={(v) => aoMudar({ ...painel, grupos: v ? valor : undefined })} />
    </li>
  );
  return (
    <ul className="flex flex-col gap-1">
      {linha("conversas", ROTULO_DO_PRESET_DE_GRUPO.somente_conversas)}
      {linha("grupos", ROTULO_DO_PRESET_DE_GRUPO.somente_grupos)}
    </ul>
  );
}
```

Create `components/escale/conversas/filtros/SecaoNegociosDaFila.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import { useGruposDasOrigens } from "@/hooks/escale/useGruposDasOrigens";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import { ROTULO_DO_STATUS } from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import {
  MOTIVO_NAO_INFORMADO,
  PREFIXO_DO_AGENTE,
  SEM_DONO,
  TIPOS_DE_DATA_DO_NEGOCIO,
  type FiltrosDoPainel,
  type NegociosDoPainel,
} from "@/lib/escale/conversas/filtros-da-fila";

import { CampoDePeriodoDaFila } from "./CampoDePeriodoDaFila";
import { GrupoDaFila } from "./GrupoDaFila";
import { SeletorDoFiltro } from "./SeletorDoFiltro";

const STATUS = ["open", "won", "lost"] as const;

/** Negócios (c76–c80; N6): os critérios valem para o MESMO negócio do contato. */
export function SecaoNegociosDaFila({
  painel,
  aoMudar,
  opcoes,
}: {
  painel: FiltrosDoPainel;
  aoMudar: (f: FiltrosDoPainel) => void;
  opcoes: OpcoesDoFiltro;
}) {
  const t = useT();
  const { data: membros = [] } = useAssignableMembers(true);
  const { data: agentes = [] } = useAssignableAgents(true);
  const { data: grupos = [] } = useGruposDasOrigens();
  const n: NegociosDoPainel = painel.negocios ?? {};
  const mudar = (parte: Partial<NegociosDoPainel>) => aoMudar({ ...painel, negocios: { ...n, ...parte } });
  const origens = n.origens ?? [];
  const varias = origens.length > 1;
  const etapas = opcoes.origens
    .filter((o) => origens.includes(o.id))
    .flatMap((o) => o.etapas.map((e) => ({ valor: e.id, rotulo: varias ? `${o.nome} › ${e.nome}` : e.nome })));
  const motivos = [
    { valor: MOTIVO_NAO_INFORMADO, rotulo: t("Não informar") },
    ...opcoes.motivos.filter((m) => m.valor !== MOTIVO_NAO_INFORMADO).map((m) => ({ valor: m.valor, rotulo: t(m.rotulo) })),
  ];
  const comPerdido = (n.status ?? []).includes("lost");

  return (
    <>
      <GrupoDaFila rotulo={t("Data")}>
        <CampoDePeriodoDaFila
          rotulo={t("Data")}
          tipos={TIPOS_DE_DATA_DO_NEGOCIO}
          valor={n.data ?? null}
          aoMudar={(v) => mudar({ data: v ?? undefined })}
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Com/sem negócio")}>
        <SeletorDoFiltro
          aria-label={t("Com/sem negócio")}
          multiplo={false}
          valores={n.tem ? [n.tem] : []}
          opcoes={[
            { valor: "com" as const, rotulo: t("Com negócio") },
            { valor: "sem" as const, rotulo: t("Sem negócio") },
          ]}
          aoMudar={(v) => mudar({ tem: v[0] })}
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Negócio com status")}>
        <SeletorDoFiltro
          aria-label={t("Negócio com status")}
          valores={n.status ?? []}
          opcoes={STATUS.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_STATUS[s]) }))}
          aoMudar={(status) => mudar({ status, ...(status.includes("lost") ? {} : { motivos: undefined }) })}
        />
      </GrupoDaFila>
      {comPerdido ? (
        <GrupoDaFila rotulo={t("Motivo de Perda")}>
          <SeletorDoFiltro aria-label={t("Motivo de Perda")} valores={n.motivos ?? []} opcoes={motivos} aoMudar={(m) => mudar({ motivos: m })} />
        </GrupoDaFila>
      ) : null}
      <GrupoDaFila rotulo={t("Dono do negócio")}>
        <SeletorDoFiltro
          aria-label={t("Dono do negócio")}
          valores={n.donos ?? []}
          opcoes={[
            { valor: SEM_DONO, rotulo: t("Sem dono") },
            ...membros.map((m) => ({ valor: m.user_id, rotulo: m.full_name?.trim() || t("Sem nome") })),
            ...agentes.map((a) => ({ valor: `${PREFIXO_DO_AGENTE}${a.agent_id}`, rotulo: a.name })),
          ]}
          aoMudar={(donos) => mudar({ donos })}
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Negócio nos grupos")}>
        <SeletorDoFiltro aria-label={t("Negócio nos grupos")} valores={n.grupos ?? []} opcoes={grupos.map((g) => ({ valor: g.id, rotulo: g.nome }))} aoMudar={(ids) => mudar({ grupos: ids })} />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Negócio nas origens")}>
        <SeletorDoFiltro
          aria-label={t("Negócio nas origens")}
          valores={origens}
          opcoes={opcoes.origens.map((o) => ({ valor: o.id, rotulo: o.nome }))}
          aoMudar={(ids) =>
            mudar({
              origens: ids,
              etapas: (n.etapas ?? []).filter((e) => opcoes.origens.some((o) => ids.includes(o.id) && o.etapas.some((x) => x.id === e))),
            })
          }
        />
      </GrupoDaFila>
      <GrupoDaFila rotulo={t("Negócio nas etapas")}>
        <SeletorDoFiltro
          aria-label={t("Negócio nas etapas")}
          valores={n.etapas ?? []}
          opcoes={etapas}
          aoMudar={(ids) => mudar({ etapas: ids })}
          desabilitado={origens.length === 0}
          dica={t("Selecione uma origem para escolher uma etapa")}
        />
      </GrupoDaFila>
    </>
  );
}
```

Create `components/escale/conversas/filtros/SecaoContatosDaFila.tsx`:

```tsx
"use client";
import { SecaoTagsDoFiltro } from "@/components/escale/contatos/filtros/SecaoTagsDoFiltro";
import type { FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";

/** Contatos › Tags (c33, c34; N7): a seção de tags da 2B, sobre as tags do contato. */
export function SecaoContatosDaFila({ painel, aoMudar }: { painel: FiltrosDoPainel; aoMudar: (f: FiltrosDoPainel) => void }) {
  return (
    <SecaoTagsDoFiltro
      filtros={painel.contatos?.tags ? { tags: painel.contatos.tags } : {}}
      aoMudar={(f) => aoMudar({ ...painel, contatos: f.tags ? { tags: f.tags } : undefined })}
    />
  );
}
```

Confira que `SecaoTagsDoFiltro` (2B) já desenha o rótulo "Tags" (o `GrupoDoFiltro` com "TAGS"); se o rótulo dela for o maiúsculo da lista de contatos e o da Clint aqui for "Tags" 13px (c33), passe a prop `rotulo` se ela existir, ou deixe como está e registre a diferença no PR.

Create `components/escale/conversas/filtros/SecaoCanaisDaFila.tsx`:

```tsx
"use client";
import { useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import type { FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";
import { ROTULO_DO_GRUPO, agruparDispositivos, bolinhaDoDispositivo } from "@/lib/escale/conversas/nova-conversa";

import { GrupoDaFila } from "./GrupoDaFila";
import { SeletorDoFiltro } from "./SeletorDoFiltro";

/** Canais (c35, c36; N7): os dispositivos agrupados, com "Desconectado". */
export function SecaoCanaisDaFila({ painel, aoMudar }: { painel: FiltrosDoPainel; aoMudar: (f: FiltrosDoPainel) => void }) {
  const t = useT();
  const { data: canais = [] } = useChannelSessions();
  const opcoes = agruparDispositivos(canais).flatMap((g) =>
    g.canais.map((c) => ({
      valor: c.id,
      rotulo: c.display_name?.trim() || c.phone_number || t("Sem nome"),
      grupo: t(ROTULO_DO_GRUPO[g.grupo]),
      ...(bolinhaDoDispositivo(c.status) === "vermelha" ? { selo: t("Desconectado") } : {}),
    })),
  );
  return (
    <GrupoDaFila rotulo={t("Canais e Dispositivos")}>
      <SeletorDoFiltro aria-label={t("Canais e Dispositivos")} valores={painel.canais ?? []} opcoes={opcoes} aoMudar={(ids) => aoMudar({ ...painel, canais: ids })} />
    </GrupoDaFila>
  );
}
```

`ROTULO_DO_GRUPO` (3A) já é "WHATSAPP"/"WHATSAPP OFICIAL"/"INSTAGRAM"; o teste espera o grupo "WHATSAPP".

- [ ] **Step 5: O painel**

Create `components/escale/conversas/filtros/PainelDeFiltrosDaFila.tsx`:

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import {
  SECOES_DA_FILA,
  contarNaSecaoDaFila,
  limparSecaoDaFila,
  temCriterios,
  type FiltrosDoPainel,
  type SecaoDaFila,
} from "@/lib/escale/conversas/filtros-da-fila";
import { Briefcase, ChevronDown, ChevronUp, MessageSquare, Smartphone, User, Users, X, type LucideIcon } from "@/lib/ui/icons-da-casca";

import { SecaoCanaisDaFila } from "./SecaoCanaisDaFila";
import { SecaoContatosDaFila } from "./SecaoContatosDaFila";
import { SecaoConversasDaFila } from "./SecaoConversasDaFila";
import { SecaoGruposDaFila } from "./SecaoGruposDaFila";
import { SecaoNegociosDaFila } from "./SecaoNegociosDaFila";

const TITULO: Record<SecaoDaFila, string> = { conversas: "Conversas", grupos: "Grupos", negocios: "Negócios", contatos: "Contatos", canais: "Canais" };
const ICONE: Record<SecaoDaFila, LucideIcon> = { conversas: MessageSquare, grupos: Users, negocios: Briefcase, contatos: User, canais: Smartphone };
const CHAVE_DOS_ACORDEOES = "escale_acordeoes_da_fila";

function lerAbertos(): SecaoDaFila[] {
  try {
    const lido = JSON.parse(window.localStorage.getItem(CHAVE_DOS_ACORDEOES) ?? "null") as unknown;
    return Array.isArray(lido) ? lido.filter((s): s is SecaoDaFila => (SECOES_DA_FILA as readonly string[]).includes(s)) : ["conversas"];
  } catch {
    return ["conversas"];
  }
}

/**
 * O PAINEL "FILTROS" DA FILA (fork Escale, Fase 3D; B1; c32, c64): 360px sobre a
 * esquerda do centro; acordeões que se abrem juntos e ficam lembrados no
 * navegador; cada um com o selo e o X; "Resetar" (e o "Salvar filtro" que vem em
 * `cabecalho`) só com critério. Aplica na hora.
 */
export function PainelDeFiltrosDaFila({
  painel,
  aoMudar,
  aoFechar,
  opcoes,
  temGrupos,
  cabecalho,
}: {
  painel: FiltrosDoPainel;
  aoMudar: (f: FiltrosDoPainel) => void;
  aoFechar: () => void;
  opcoes: OpcoesDoFiltro;
  temGrupos: boolean;
  cabecalho?: ReactNode;
}) {
  const t = useT();
  const [abertos, setAbertos] = useState<SecaoDaFila[]>(lerAbertos);
  const secoes = SECOES_DA_FILA.filter((s) => s !== "grupos" || temGrupos);

  function alternar(s: SecaoDaFila) {
    const proximos = abertos.includes(s) ? abertos.filter((x) => x !== s) : [...abertos, s];
    setAbertos(proximos);
    try {
      window.localStorage.setItem(CHAVE_DOS_ACORDEOES, JSON.stringify(proximos));
    } catch {
      // navegador sem armazenamento: o estado vale só nesta tela
    }
  }

  const conteudo = (s: SecaoDaFila) => {
    if (s === "conversas") return <SecaoConversasDaFila painel={painel} aoMudar={aoMudar} />;
    if (s === "grupos") return <SecaoGruposDaFila painel={painel} aoMudar={aoMudar} />;
    if (s === "negocios") return <SecaoNegociosDaFila painel={painel} aoMudar={aoMudar} opcoes={opcoes} />;
    if (s === "contatos") return <SecaoContatosDaFila painel={painel} aoMudar={aoMudar} />;
    return <SecaoCanaisDaFila painel={painel} aoMudar={aoMudar} />;
  };

  return (
    <aside
      aria-label={t("Filtros")}
      className="absolute inset-y-0 left-0 z-20 flex w-[360px] max-w-full flex-col border-r border-casca-borda bg-surface shadow-casca-painel"
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-casca-borda px-4">
        <span className="flex-1 text-[15px] font-medium text-casca-texto">{t("Filtros")}</span>
        {temCriterios(painel) ? (
          <>
            {cabecalho}
            <button type="button" onClick={() => aoMudar({})} className="h-7 rounded-casca-gatilho px-2 text-[12px] font-medium text-casca-texto hover:bg-casca-raia">
              {t("Resetar")}
            </button>
          </>
        ) : null}
        <button type="button" aria-label={t("Fechar")} onClick={aoFechar} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia">
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {secoes.map((s) => {
          const Icone = ICONE[s];
          const n = contarNaSecaoDaFila(painel, s);
          const aberta = abertos.includes(s);
          return (
            <section key={s} className="border-b border-casca-borda">
              <div className="flex h-14 items-center gap-2 px-4">
                <button type="button" aria-expanded={aberta} onClick={() => alternar(s)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] font-medium text-casca-texto">
                  <Icone size={16} aria-hidden className="text-casca-suave" />
                  {t(TITULO[s])}
                </button>
                {n > 0 ? (
                  <>
                    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-[4px] bg-casca-marca-suave px-1 text-[11px] font-semibold text-casca-marca">{n}</span>
                    <button
                      type="button"
                      aria-label={`${t("Limpar")} ${t(TITULO[s])}`}
                      onClick={() => aoMudar(limparSecaoDaFila(painel, s))}
                      className="grid size-5 place-items-center text-casca-suave hover:text-casca-texto"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </>
                ) : null}
                {aberta ? <ChevronUp size={14} aria-hidden className="text-casca-suave" /> : <ChevronDown size={14} aria-hidden className="text-casca-suave" />}
              </div>
              {aberta ? <div className="flex flex-col gap-4 bg-casca-raia px-5 py-4">{conteudo(s)}</div> : null}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
```

O nome acessível do botão do acordeão é o título ("Conversas"), como o teste pede; o X é "Limpar Conversas".

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-painel-de-filtros-da-fila.test.tsx $(grep -rl "CalendarioDePeriodo" tests/unit) && corepack pnpm prettier --write components/escale/conversas/filtros tests/unit/escale-painel-de-filtros-da-fila.test.tsx && corepack pnpm eslint components/escale/conversas/filtros components/escale/ui/CalendarioDePeriodo.tsx lib/ui/icons-da-casca.ts && corepack pnpm vitest run tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/escale/conversas/filtros components/escale/ui/CalendarioDePeriodo.tsx lib/ui/icons-da-casca.ts tests/unit/escale-painel-de-filtros-da-fila.test.tsx
git commit -m "feat(escale): o painel Filtros da fila — Conversas, Grupos, Negócios, Contatos e Canais (Fase 3D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: O botão de presets com os Salvos, o funil, "Salvar filtro" e a casca ligada no painel

**Files:**
- Create: `components/escale/conversas/filtros/BalaoSalvarFiltro.tsx`, `components/escale/conversas/filtros/FunilDaFila.tsx`, `components/escale/conversas/fila/JanelaRenomearFiltro.tsx`, `tests/unit/escale-presets-e-salvos-da-fila.test.tsx`
- Modify: `components/escale/conversas/fila/MenuDePresets.tsx`, `components/escale/conversas/fila/BarraDaFila.tsx`, `components/escale/conversas/fila/MenuMaisDaFila.tsx`, `components/escale/conversas/ConversasDaCasca.tsx`, `app/app/inbox/page.tsx`, `app/app/inbox/configuracoes/_casca.tsx`

**Interfaces:**
- Consumes: `useFiltrosDaLista("conversas")`, `useCriarFiltroDaLista`, `useMudarFiltroDaLista`, `useExcluirFiltroDaLista` (Task 4); `rotuloDoBotao`, `PAINEL_DO_PRESET`, `PAINEL_DO_PRESET_DE_GRUPO`, `totalDeCriterios`, `painelDaUrl`, `paramsDoPainel`, `temCriterios` (Task 1); `useTotalDaFila` (Task 6); `PainelDeFiltrosDaFila` (Task 7); `useMinhasPermissoes` (3C).
- Produces: `MenuDePresets({ painel, aoMudarPainel, aoCriarFiltro, temGrupos })`; `FunilDaFila({ total, ativo, aoAlternar })`; `BalaoSalvarFiltro({ painel })`; `JanelaRenomearFiltro({ filtro, aoFechar })`; `BarraDaFila` com `painel, aoMudarPainel, filtrosAbertos, aoAlternarFiltros, aoCriarFiltro, temGrupos, podeSelecionar, aoSelecionar` (saem `preset`/`aoMudarPreset`); `MenuMaisDaFila` com `podeSelecionar, aoSelecionar`; `ConversasDaCasca` com `opcoesDoFiltro?: OpcoesDoFiltro`.

Abra c31, c64, c71 e c72 antes.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-presets-e-salvos-da-fila.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const salvos = vi.hoisted(() => ({ lista: [] as Array<{ id: string; nome: string; compartilhado: boolean; meu: boolean; criterios: object }>, criar: vi.fn(), excluir: vi.fn(), mudar: vi.fn() }));
vi.mock("@/hooks/escale/useFiltrosDaLista", () => ({
  useFiltrosDaLista: () => ({ data: salvos.lista }),
  useCriarFiltroDaLista: () => ({ mutate: salvos.criar, isPending: false }),
  useExcluirFiltroDaLista: () => ({ mutate: salvos.excluir }),
  useMudarFiltroDaLista: () => ({ mutate: salvos.mudar, isPending: false }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "o1", role: "manager" } }) }));
vi.mock("@/hooks/inbox/useConversationCounts", () => ({ useConversationCounts: () => ({ data: { all: 120 } }) }));

import { BalaoSalvarFiltro } from "@/components/escale/conversas/filtros/BalaoSalvarFiltro";
import { FunilDaFila } from "@/components/escale/conversas/filtros/FunilDaFila";
import { MenuDePresets } from "@/components/escale/conversas/fila/MenuDePresets";

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => {
  salvos.lista = [];
  vi.clearAllMocks();
});

describe("o botão de presets (c31, c71)", () => {
  it("mostra o preset, 'Personalizado' fora dele e o nome do salvo aplicado", () => {
    const { rerender } = wrap(<MenuDePresets painel={{ conversas: { status: ["em_espera"] } }} aoMudarPainel={vi.fn()} aoCriarFiltro={vi.fn()} temGrupos={false} />);
    expect(screen.getByRole("button", { name: /Em espera/ })).toBeInTheDocument();
    rerender(<QueryClientProvider client={new QueryClient()}><MenuDePresets painel={{ conversas: { marcas: ["suspensas"] } }} aoMudarPainel={vi.fn()} aoCriarFiltro={vi.fn()} temGrupos={false} /></QueryClientProvider>);
    expect(screen.getByRole("button", { name: /Personalizado/ })).toBeInTheDocument();
    salvos.lista = [{ id: "s1", nome: "Suspensas", compartilhado: false, meu: true, criterios: { conversas: { marcas: ["suspensas"] } } }];
    rerender(<QueryClientProvider client={new QueryClient()}><MenuDePresets painel={{ conversas: { marcas: ["suspensas"] } }} aoMudarPainel={vi.fn()} aoCriarFiltro={vi.fn()} temGrupos={false} /></QueryClientProvider>);
    expect(screen.getByRole("button", { name: /Suspensas/ })).toBeInTheDocument();
  });

  it("escolher preset ou salvo muda o painel; 'Criar filtro' abre o painel", () => {
    const aoMudarPainel = vi.fn();
    const aoCriarFiltro = vi.fn();
    salvos.lista = [{ id: "s1", nome: "Perdidos", compartilhado: false, meu: true, criterios: { negocios: { status: ["lost"] } } }];
    wrap(<MenuDePresets painel={{}} aoMudarPainel={aoMudarPainel} aoCriarFiltro={aoCriarFiltro} temGrupos />);
    fireEvent.pointerDown(screen.getByRole("button", { name: /Todos/ }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("menuitem", { name: /Fechadas/ }));
    expect(aoMudarPainel).toHaveBeenCalledWith({ conversas: { status: ["fechado"] } });
    fireEvent.pointerDown(screen.getByRole("button", { name: /Todos/ }), { button: 0, ctrlKey: false });
    expect(screen.getByRole("menuitem", { name: /Somente grupos/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: /Perdidos/ }));
    expect(aoMudarPainel).toHaveBeenLastCalledWith({ negocios: { status: ["lost"] } });
    fireEvent.pointerDown(screen.getByRole("button", { name: /Todos/ }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole("menuitem", { name: /Criar filtro/ }));
    expect(aoCriarFiltro).toHaveBeenCalled();
  });
});

describe("o funil e o Salvar filtro (c64, c72)", () => {
  it("o funil mostra o selo com o total de critérios", () => {
    render(<FunilDaFila total={1} ativo={false} aoAlternar={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Filtros" })).toHaveTextContent("1");
  });

  it("o balão grava o nome com o painel enxuto", () => {
    wrap(<BalaoSalvarFiltro painel={{ conversas: { status: ["em_espera"], atendentes: [] } }} />);
    fireEvent.click(screen.getByRole("button", { name: /Salvar filtro/ }));
    fireEvent.change(screen.getByPlaceholderText("Ex: Clientes em aberto"), { target: { value: "Espera" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(salvos.criar).toHaveBeenCalledWith({ nome: "Espera", compartilhado: false, criterios: { conversas: { status: ["em_espera"] } } }, expect.anything());
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-presets-e-salvos-da-fila.test.tsx`
Expected: FAIL.

- [ ] **Step 2: O funil, o balão e a janela de renomear**

Create `components/escale/conversas/filtros/FunilDaFila.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import { Funnel } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** O funil da barra (c32, c64): ativo com o painel aberto ou com critério; o selo com o total. */
export function FunilDaFila({ total, ativo, aoAlternar }: { total: number; ativo: boolean; aoAlternar: () => void }) {
  const t = useT();
  const aceso = ativo || total > 0;
  return (
    <button
      type="button"
      aria-label={t("Filtros")}
      title={t("Filtros")}
      aria-pressed={ativo}
      onClick={aoAlternar}
      className={cn(
        "flex h-6 items-center gap-1 rounded-casca-gatilho px-1 hover:bg-casca-raia",
        aceso ? "bg-casca-marca-suave text-casca-marca" : "text-casca-suave",
        total > 0 && "px-1.5",
      )}
    >
      <Funnel size={16} aria-hidden />
      {total > 0 ? (
        <span className="grid size-4 place-items-center rounded-full bg-casca-marca text-[10px] font-semibold text-white tabular-nums">{total}</span>
      ) : null}
    </button>
  );
}
```

Create `components/escale/conversas/filtros/BalaoSalvarFiltro.tsx`:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useCriarFiltroDaLista } from "@/hooks/escale/useFiltrosDaLista";
import { useT } from "@/hooks/i18n/useT";
import { enxugarFiltrosDoPainel, type FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";
import { Bookmark } from "@/lib/ui/icons-da-casca";

/** "Salvar filtro" (c71, c72; B6): o balão "NOME DO FILTRO". O 409 e o 422 trazem a mensagem da rota (2B). */
export function BalaoSalvarFiltro({ painel }: { painel: FiltrosDoPainel }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const criar = useCriarFiltroDaLista("conversas");
  const salvar = () => {
    const limpo = nome.trim();
    if (!limpo || limpo.length > 60) {
      toast.error(t("Dê ao filtro um nome de 1 a 60 caracteres."));
      return;
    }
    criar.mutate(
      { nome: limpo, compartilhado: false, criterios: enxugarFiltrosDoPainel(painel) },
      {
        onSuccess: () => {
          toast.success(t("Filtro salvo."));
          setAberto(false);
          setNome("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : t("Ocorreu um erro ao executar a ação em massa!")),
      },
    );
  };
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-7 items-center gap-1 rounded-casca-gatilho px-2 text-[12px] font-medium text-casca-marca hover:bg-casca-marca-suave">
          <Bookmark size={14} aria-hidden />
          {t("Salvar filtro")}
        </button>
      </PopoverTrigger>
      <PainelSuspenso align="center" sideOffset={6} className="w-[260px] p-4">
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">{t("Nome do filtro")}</span>
          <input
            autoFocus
            value={nome}
            maxLength={60}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvar();
            }}
            placeholder={t("Ex: Clientes em aberto")}
            className="h-8 rounded-casca-gatilho border border-casca-marca px-2.5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
        </label>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setAberto(false)} className="h-7 px-2 text-[12px] text-casca-texto">
            {t("Cancelar")}
          </button>
          <button type="button" disabled={criar.isPending} onClick={salvar} className="h-7 rounded-casca-gatilho bg-casca-marca px-3 text-[12px] font-semibold text-white disabled:opacity-60">
            {t("Salvar")}
          </button>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
```

Confira que o `apiClient` joga um `Error` com a mensagem da rota (o `showApiError` do original lê `err.message`); se o erro vier noutro formato, use o mesmo leitor de mensagem que o `SeletorDeFiltros` da 2B usa.

Create `components/escale/conversas/fila/JanelaRenomearFiltro.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BotaoDaJanela, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { useMudarFiltroDaLista } from "@/hooks/escale/useFiltrosDaLista";
import { useT } from "@/hooks/i18n/useT";

/** "Renomear" de um filtro salvo (provisório, item 1 dos prints que faltam). */
export function JanelaRenomearFiltro({ filtro, aoFechar }: { filtro: { id: string; nome: string } | null; aoFechar: () => void }) {
  const t = useT();
  const [nome, setNome] = useState("");
  const mudar = useMudarFiltroDaLista("conversas");
  useEffect(() => setNome(filtro?.nome ?? ""), [filtro]);
  if (!filtro) return null;
  return (
    <JanelaDaCasca aberta onFechar={aoFechar} className="w-[400px] p-0">
      <div className="flex h-14 items-center border-b border-casca-borda px-5 text-[15px] font-medium text-casca-texto">{t("Renomear filtro")}</div>
      <div className="px-5 py-4">
        <input
          autoFocus
          value={nome}
          maxLength={60}
          aria-label={t("Nome do filtro")}
          onChange={(e) => setNome(e.target.value)}
          className="h-8 w-full rounded-casca-gatilho bg-casca-busca px-3 text-[13px] text-casca-texto outline-hidden"
        />
      </div>
      <div className="px-5 pb-4">
        <RodapeDaJanela>
          <BotaoDaJanela variante="cancelar" onClick={aoFechar}>{t("Cancelar")}</BotaoDaJanela>
          <BotaoDaJanela
            variante="salvar"
            disabled={mudar.isPending || !nome.trim()}
            onClick={() =>
              mudar.mutate(
                { id: filtro.id, nome: nome.trim() },
                { onSuccess: aoFechar, onError: (e) => toast.error(e instanceof Error ? e.message : t("Já existe um filtro com esse nome.")) },
              )
            }
          >
            {t("Salvar")}
          </BotaoDaJanela>
        </RodapeDaJanela>
      </div>
    </JanelaDaCasca>
  );
}
```

- [ ] **Step 3: O menu de presets com os Salvos**

Replace `components/escale/conversas/fila/MenuDePresets.tsx` (o da 3A; o visual do botão e dos itens fica igual):

```tsx
"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import { toast } from "sonner";

import { SeloDaCasca } from "@/components/escale/menu/SeloDaCasca";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useExcluirFiltroDaLista, useFiltrosDaLista, useMudarFiltroDaLista } from "@/hooks/escale/useFiltrosDaLista";
import { useT } from "@/hooks/i18n/useT";
import { useConversationCounts } from "@/hooks/inbox/useConversationCounts";
import {
  PAINEL_DO_PRESET,
  PAINEL_DO_PRESET_DE_GRUPO,
  PRESETS_DE_GRUPO,
  ROTULO_DO_PRESET_DE_GRUPO,
  rotuloDoBotao,
  type FiltrosDoPainel,
  type PresetDeGrupo,
} from "@/lib/escale/conversas/filtros-da-fila";
import { PRESETS_DE_STATUS, ROTULO_DO_PRESET, type Preset } from "@/lib/escale/conversas/presets";
import {
  Archive,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  EllipsisVertical,
  MessageSquare,
  Plus,
  SlidersHorizontal,
  User,
  Users,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { JanelaRenomearFiltro } from "./JanelaRenomearFiltro";

const ICONE: Record<Preset, LucideIcon> = {
  todos: SlidersHorizontal,
  nao_lidas: MessageSquare,
  meus_em_aberto: User,
  em_aberto: Users,
  em_espera: Clock,
  fechadas: Archive,
};
const ICONE_DE_GRUPO: Record<PresetDeGrupo, LucideIcon> = { somente_conversas: MessageSquare, somente_grupos: Users };
const CABECALHO = "px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase";

/**
 * O botão de presets e o menu (fork Escale, Fases 3A e 3D; c31, c71, 02-006): o
 * texto é o preset, o salvo aplicado ou "Personalizado"; "SALVOS" lista os meus e
 * os compartilhados, com o ⋮ nos meus (Renomear, Compartilhar, Excluir); "Criar
 * filtro" abre o painel (não é janela, como na Clint).
 */
export function MenuDePresets({
  painel,
  aoMudarPainel,
  aoCriarFiltro,
  temGrupos,
}: {
  painel: FiltrosDoPainel;
  aoMudarPainel: (f: FiltrosDoPainel) => void;
  aoCriarFiltro: () => void;
  temGrupos: boolean;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [renomeando, setRenomeando] = useState<{ id: string; nome: string } | null>(null);
  const { data: salvos = [] } = useFiltrosDaLista("conversas");
  const excluir = useExcluirFiltroDaLista("conversas");
  const mudar = useMudarFiltroDaLista("conversas");
  const naoLidas = useConversationCounts(activeOrg?.orgId ?? null, { unread: true }).data?.all ?? 0;
  const rotulo = rotuloDoBotao(painel, salvos);
  const IconeDoBotao =
    rotulo.tipo === "preset" ? ICONE[rotulo.preset] : rotulo.tipo === "grupo" ? ICONE_DE_GRUPO[rotulo.preset] : rotulo.tipo === "salvo" ? Bookmark : SlidersHorizontal;
  const textoDoBotao =
    rotulo.tipo === "preset"
      ? t(ROTULO_DO_PRESET[rotulo.preset])
      : rotulo.tipo === "grupo"
        ? t(ROTULO_DO_PRESET_DE_GRUPO[rotulo.preset])
        : rotulo.tipo === "salvo"
          ? rotulo.nome
          : t("Personalizado");

  const item = (p: Preset) => {
    const Ic = ICONE[p];
    const atual = rotulo.tipo === "preset" && rotulo.preset === p;
    return (
      <MenuPrimitive.Item key={p} className={cn(ITEM_DO_MENU, "h-9 text-[12px]", atual && "text-casca-marca")} onSelect={() => aoMudarPainel(PAINEL_DO_PRESET[p])}>
        <Ic size={16} aria-hidden />
        <span className="flex-1">{t(ROTULO_DO_PRESET[p])}</span>
        {p === "nao_lidas" && naoLidas > 0 ? <SeloDaCasca valor={naoLidas} limite={99} rotulo={t("Não lidas")} className="h-4 min-w-4 px-1.5 text-[10px]" /> : null}
        {atual ? <Check size={14} aria-hidden /> : null}
      </MenuPrimitive.Item>
    );
  };

  return (
    <>
      <DropdownMenu modal={false} open={aberto} onOpenChange={setAberto}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-8 max-w-[200px] items-center gap-1.5 rounded-casca-gatilho border px-2.5 text-[12px] font-medium text-casca-texto",
              aberto ? "border-casca-marca" : "border-casca-borda hover:bg-casca-raia",
            )}
          >
            <IconeDoBotao size={14} aria-hidden className="shrink-0 text-casca-suave" />
            <span className="max-w-[140px] truncate">{textoDoBotao}</span>
            {aberto ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
          </button>
        </DropdownMenuTrigger>
        <MenuPrimitive.Portal>
          <MenuPrimitive.Content align="start" sideOffset={6} aria-label={t("Filtrar por")} className={cn(CAIXA_DO_MENU, "max-h-[70vh] w-[224px] overflow-y-auto")}>
            {item("todos")}
            {item("nao_lidas")}
            {temGrupos
              ? PRESETS_DE_GRUPO.map((p) => {
                  const Ic = ICONE_DE_GRUPO[p];
                  const atual = rotulo.tipo === "grupo" && rotulo.preset === p;
                  return (
                    <MenuPrimitive.Item key={p} className={cn(ITEM_DO_MENU, "h-9 text-[12px]", atual && "text-casca-marca")} onSelect={() => aoMudarPainel(PAINEL_DO_PRESET_DE_GRUPO[p])}>
                      <Ic size={16} aria-hidden />
                      <span className="flex-1">{t(ROTULO_DO_PRESET_DE_GRUPO[p])}</span>
                      {atual ? <Check size={14} aria-hidden /> : null}
                    </MenuPrimitive.Item>
                  );
                })
              : null}
            <p className={CABECALHO}>{t("Status")}</p>
            {PRESETS_DE_STATUS.map(item)}
            <p className={CABECALHO}>{t("Salvos")}</p>
            {salvos.map((s) => {
              const atual = rotulo.tipo === "salvo" && rotulo.id === s.id;
              return (
                <div key={s.id} className="group flex items-center">
                  <MenuPrimitive.Item className={cn(ITEM_DO_MENU, "h-9 flex-1 text-[12px]", atual && "text-casca-marca")} onSelect={() => aoMudarPainel(s.criterios)}>
                    <Bookmark size={16} aria-hidden />
                    <span className="flex-1 truncate">{s.nome}</span>
                    {atual ? <Check size={14} aria-hidden /> : null}
                  </MenuPrimitive.Item>
                  {s.meu ? (
                    <MenuPrimitive.Sub>
                      <MenuPrimitive.SubTrigger aria-label={t("Mais opções")} className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 hover:bg-casca-raia">
                        <EllipsisVertical size={14} aria-hidden />
                      </MenuPrimitive.SubTrigger>
                      <MenuPrimitive.Portal>
                        <MenuPrimitive.SubContent sideOffset={4} className={cn(CAIXA_DO_MENU, "w-[180px]")}>
                          <MenuPrimitive.Item className={cn(ITEM_DO_MENU, "h-9 text-[12px]")} onSelect={() => setRenomeando({ id: s.id, nome: s.nome })}>
                            {t("Renomear")}
                          </MenuPrimitive.Item>
                          <MenuPrimitive.Item className={cn(ITEM_DO_MENU, "h-9 text-[12px]")} onSelect={() => mudar.mutate({ id: s.id, compartilhado: !s.compartilhado })}>
                            {s.compartilhado ? t("Deixar de compartilhar") : t("Compartilhar")}
                          </MenuPrimitive.Item>
                          <MenuPrimitive.Item
                            className={cn(ITEM_DO_MENU, "h-9 text-[12px] text-casca-alerta")}
                            onSelect={() => excluir.mutate(s.id, { onSuccess: () => toast.success(t("Filtro excluído.")) })}
                          >
                            {t("Excluir")}
                          </MenuPrimitive.Item>
                        </MenuPrimitive.SubContent>
                      </MenuPrimitive.Portal>
                    </MenuPrimitive.Sub>
                  ) : null}
                </div>
              );
            })}
            <MenuPrimitive.Item className={cn(ITEM_DO_MENU, "h-9 text-[12px] text-casca-marca")} onSelect={aoCriarFiltro}>
              <Plus size={16} aria-hidden />
              {t("Criar filtro")}
            </MenuPrimitive.Item>
          </MenuPrimitive.Content>
        </MenuPrimitive.Portal>
      </DropdownMenu>
      <JanelaRenomearFiltro filtro={renomeando} aoFechar={() => setRenomeando(null)} />
    </>
  );
}
```

Se `EllipsisVertical` não estiver em `icons-da-casca` (a 3A o usa no `MenuMaisDaFila`, está), use o mesmo import do ⋮.

- [ ] **Step 4: A barra e o ⋮**

Em `components/escale/conversas/fila/BarraDaFila.tsx` (3A):
1. Props: saem `preset: Preset` e `aoMudarPreset`; entram `painel: FiltrosDoPainel`, `aoMudarPainel: (f: FiltrosDoPainel) => void`, `filtrosAbertos: boolean`, `aoAlternarFiltros: () => void`, `aoCriarFiltro: () => void`, `temGrupos: boolean`, `podeSelecionar: boolean`, `aoSelecionar: () => void`.
2. `<MenuDePresets preset={preset} aoMudar={aoMudarPreset} />` vira `<MenuDePresets painel={painel} aoMudarPainel={aoMudarPainel} aoCriarFiltro={aoCriarFiltro} temGrupos={temGrupos} />`.
3. O botão desligado do funil vira `<FunilDaFila total={totalDeCriterios(painel)} ativo={filtrosAbertos} aoAlternar={aoAlternarFiltros} />` (imports de `FunilDaFila` e `totalDeCriterios`; o import de `Funnel` sai se ficar sem uso).
4. `<MenuMaisDaFila … />` ganha `podeSelecionar={podeSelecionar} aoSelecionar={aoSelecionar}`.

Em `components/escale/conversas/fila/MenuMaisDaFila.tsx` (3A): as props `podeSelecionar: boolean` e `aoSelecionar: () => void`; o item "Selecionar" passa a:

```tsx
          <MenuPrimitive.Item
            disabled={!podeSelecionar}
            title={podeSelecionar ? undefined : t("Sem permissão para ações em massa.")}
            className={cn(ITEM_DO_MENU, "h-9 text-[12px]")}
            onSelect={aoSelecionar}
          >
            <ListChecks size={16} aria-hidden />
            {t("Selecionar")}
          </MenuPrimitive.Item>
```

Os testes da 3A que montam `BarraDaFila`/`MenuDePresets`/`MenuMaisDaFila` (`tests/unit/escale-fila-da-casca.test.tsx`) passam a usar as props novas: troque `preset="todos" aoMudarPreset={…}` por `painel={{}} aoMudarPainel={…} filtrosAbertos={false} aoAlternarFiltros={vi.fn()} aoCriarFiltro={vi.fn()} temGrupos={false} podeSelecionar aoSelecionar={vi.fn()}`, a expectativa "Criar filtro desligado / Em breve" vira "Criar filtro chama aoCriarFiltro", e a de "Selecionar desligado" vira "Selecionar chama aoSelecionar"; acrescente o mock de `@/hooks/escale/useFiltrosDaLista` do teste do Step 1.

- [ ] **Step 5: A casca ligada no painel**

Em `components/escale/conversas/ConversasDaCasca.tsx` (estado depois da 3A–3C e da Task 6):

1. Imports novos:

```tsx
import { PainelDeFiltrosDaFila } from "./filtros/PainelDeFiltrosDaFila";
import { BalaoSalvarFiltro } from "./filtros/BalaoSalvarFiltro";
import { useTotalDaFila } from "@/hooks/escale/useTotalDaFila";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { OPCOES_VAZIAS, type OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { PARAM_DO_PAINEL, painelDaUrl, paramsDoPainel, temCriterios, type FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";
```

(saem `filtrosDoPreset`, `presetDaUrl`, `PRESET_PADRAO`, `type Preset`, `type FiltrosDaFila` e o `PAINEL_DO_PRESET` da Task 6 se ficarem sem uso; `PARAM_PRESET` fica).

2. A prop nova `opcoesDoFiltro = OPCOES_VAZIAS` (tipo `OpcoesDoFiltro`) na assinatura.

3. No lugar de `const preset = presetDaUrl(searchParams.get(PARAM_PRESET));`:

```tsx
  const painel = useMemo(() => painelDaUrl(searchParams), [searchParams]);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
```

4. No lugar de `mudarPreset`:

```tsx
  const mudarPainel = useCallback(
    (f: FiltrosDoPainel) => {
      const { v, f: texto } = paramsDoPainel(f);
      const params = new URLSearchParams(searchParams.toString());
      if (v) params.set(PARAM_PRESET, v);
      else params.delete(PARAM_PRESET);
      if (texto) params.set(PARAM_DO_PAINEL, texto);
      else params.delete(PARAM_DO_PAINEL);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
```

5. A consulta da fila (a chamada que a Task 6 deixou):

```tsx
  const consulta = useMemo(
    () => ({ painel, ordem, ...(buscaValeConsulta(busca) ? { busca } : {}) }),
    [painel, ordem, busca],
  );
  const fila = useFilaDeConversas(consulta, orgId);
  const temGrupos = (useTotalDaFila({ painel: { grupos: "grupos" }, ordem: "interacao" }, !!orgId).data ?? 0) > 0;
  const permissoes = useMinhasPermissoes();
  const podeSelecionar = permissoes.CHAT_BULK_ACTIONS === true;
```

6. `<BarraDaFila … />`:

```tsx
            <BarraDaFila
              busca={busca}
              aoBuscar={setBusca}
              painel={painel}
              aoMudarPainel={mudarPainel}
              filtrosAbertos={filtrosAbertos}
              aoAlternarFiltros={() => {
                setPersonalizando(false);
                setFiltrosAbertos((v) => !v);
              }}
              aoCriarFiltro={() => {
                setPersonalizando(false);
                setFiltrosAbertos(true);
              }}
              temGrupos={temGrupos}
              ordem={ordem}
              aoMudarOrdem={mudarOrdem}
              espiao={espiao}
              aoMudarEspiao={mudarEspiao}
              personalizando={personalizando}
              aoPersonalizar={() => {
                setFiltrosAbertos(false);
                setPersonalizando((v) => !v);
              }}
              visualizacaoForaDoPadrao={!ehVisualizacaoPadrao(preferencias.data.visualizacao)}
              podeSelecionar={podeSelecionar}
              aoSelecionar={() => setSelecao(SEM_SELECAO)}
            />
```

(`setSelecao` e `SEM_SELECAO` nascem na Task 9; até lá, use `aoSelecionar={() => undefined}` e `podeSelecionar={false}` para o typecheck ficar verde, e a Task 9 troca).

7. `temFiltro={preset !== PRESET_PADRAO || buscaValeConsulta(busca)}` vira `temFiltro={temCriterios(painel) || buscaValeConsulta(busca)}`.

8. No centro, ao lado do `PainelPersonalizarVisualizacao`:

```tsx
            {filtrosAbertos ? (
              <PainelDeFiltrosDaFila
                painel={painel}
                aoMudar={mudarPainel}
                aoFechar={() => setFiltrosAbertos(false)}
                opcoes={opcoesDoFiltro}
                temGrupos={temGrupos}
                cabecalho={<BalaoSalvarFiltro painel={painel} />}
              />
            ) : null}
```

Em `app/app/inbox/page.tsx`, no bloco do fork: `const { origens, opcoesDoFiltro } = await origensDaPagina();` e `opcoesDoFiltro={opcoesDoFiltro}` no `<ConversasDaCasca>`. Em `app/app/inbox/configuracoes/_casca.tsx` (3C): o mesmo (`const { origens, opcoesDoFiltro } = await origensDaPagina();` e a prop).

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-presets-e-salvos-da-fila.test.tsx tests/unit/escale-fila-da-casca.test.tsx tests/unit/escale-conversas-casca.test.tsx && corepack pnpm prettier --write components/escale/conversas/filtros components/escale/conversas/fila/JanelaRenomearFiltro.tsx tests/unit/escale-presets-e-salvos-da-fila.test.tsx && corepack pnpm eslint components/escale/conversas app/app/inbox && corepack pnpm vitest run tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts tests/unit/escale-casca-v2-original-intacto.test.ts && corepack pnpm typecheck`
Expected: PASS. (O teste da casca da 3A mocka a fila; se ele montar `BarraDaFila` de verdade, mocke `@/hooks/escale/useFiltrosDaLista`, `@/hooks/escale/useTotalDaFila` e `@/hooks/escale/usePermissoesDeAtendimento` como no Step 1.)

- [ ] **Step 7: Commit**

```bash
git add components/escale/conversas app/app/inbox/page.tsx app/app/inbox/configuracoes/_casca.tsx tests/unit/escale-presets-e-salvos-da-fila.test.tsx tests/unit/escale-fila-da-casca.test.tsx tests/unit/escale-conversas-casca.test.tsx
git commit -m "feat(escale): presets com Salvos, Personalizado, o funil com o selo e Salvar filtro na fila (Fase 3D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: Selecionar e as ações em massa na tela

**Files:**
- Create: `components/escale/conversas/massa/CabecalhoDaSelecao.tsx`, `FaixaDoFiltroInteiro.tsx`, `CentroDeAcoesEmMassa.tsx`, `JanelaDaAcaoEmMassa.tsx`, `tests/unit/escale-selecao-e-massa-da-fila.test.tsx`
- Modify: `components/escale/conversas/fila/LinhaDaFila.tsx`, `components/escale/conversas/fila/ListaDaFila.tsx`, `components/escale/conversas/ConversasDaCasca.tsx`

**Interfaces:**
- Consumes: `Selecao`, `SEM_SELECAO`, `SELECIONAR_TODOS`, `totalSelecionado`, `linhaMarcada`, `alternarLinha`, `estadoDaPagina`, `marcarPagina`, `todosMarcados` (2B, `lib/escale/contatos/selecao`); `alvoDaSelecaoDaFila`, `textoDasSelecionadas`, `STATUS_DA_ACAO`, `ROTULO_DO_STATUS_DA_ACAO`, `acaoRodando` (Task 1); `useExecutarAcaoDaFila`, `useAcaoDaFila`, `useTotalDaFila` (Task 6); `useAssignableMembers`, `useSetores`, `useContactTagVocabulary`.
- Produces: `CabecalhoDaSelecao({ estado, selecionadas, aoMarcarCarregadas, aoSair })`; `FaixaDoFiltroInteiro({ modo, carregadas, total, aoSelecionarTodas, aoLimpar })`; `CentroDeAcoesEmMassa({ selecionadas, aoEscolher, aoSair })` com `AcaoEscolhida = "status" | "atendente" | "setor" | "incluir_tag" | "remover_tag"`; `JanelaDaAcaoEmMassa({ acao, aoFechar, aoExecutar, executando })` (chama `aoExecutar(parametros)`); `LinhaDaFila` ganha `selecionando?`, `marcada?`, `aoMarcar?`; `ListaDaFila` ganha `selecao?: Selecao | null`, `aoMudarSelecao?`, `total?: number | null`.

Abra c25–c30, c82 e c83 antes.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-selecao-e-massa-da-fila.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [{ user_id: "b0000000-0000-4000-8000-000000000001", full_name: "Camilly" }] }) }));
vi.mock("@/hooks/escale/useSetores", () => ({ useSetores: () => ({ data: [{ id: "s1", nome: "Atendimento", cor: "#597EFF" }] }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({ useContactTagVocabulary: () => ({ data: ["vip"] }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "o1", role: "manager" } }) }));

import { CabecalhoDaSelecao } from "@/components/escale/conversas/massa/CabecalhoDaSelecao";
import { CentroDeAcoesEmMassa } from "@/components/escale/conversas/massa/CentroDeAcoesEmMassa";
import { FaixaDoFiltroInteiro } from "@/components/escale/conversas/massa/FaixaDoFiltroInteiro";
import { JanelaDaAcaoEmMassa } from "@/components/escale/conversas/massa/JanelaDaAcaoEmMassa";

describe("a seleção (c25, c82, c83; N12)", () => {
  it("'Selecionar todos' sem marcadas, '{n} selecionados' com; o X sai", () => {
    const aoSair = vi.fn();
    const { rerender } = render(<CabecalhoDaSelecao estado={false} selecionadas={0} aoMarcarCarregadas={vi.fn()} aoSair={aoSair} />);
    expect(screen.getByText("Selecionar todos")).toBeInTheDocument();
    rerender(<CabecalhoDaSelecao estado selecionadas={56127} aoMarcarCarregadas={vi.fn()} aoSair={aoSair} />);
    expect(screen.getByText("56.127 selecionados")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sair de ação em massa" }));
    expect(aoSair).toHaveBeenCalled();
  });

  it("a faixa oferece todas as do filtro, com o total escrito", () => {
    const aoSelecionarTodas = vi.fn();
    render(<FaixaDoFiltroInteiro modo="carregadas" carregadas={50} total={56128} aoSelecionarTodas={aoSelecionarTodas} aoLimpar={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Selecionar todas as 56.128 conversas do filtro" }));
    expect(aoSelecionarTodas).toHaveBeenCalled();
  });
});

describe("as ações (c25–c30)", () => {
  it("os 4 cartões, o submenu de tag e 'Sair de ação em massa'", () => {
    const aoEscolher = vi.fn();
    render(<CentroDeAcoesEmMassa selecionadas={1} aoEscolher={aoEscolher} aoSair={vi.fn()} />);
    expect(screen.getByText("1 conversa selecionada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Alterar status" }));
    expect(aoEscolher).toHaveBeenCalledWith("status");
    fireEvent.click(screen.getByRole("button", { name: "Alterar tag do contato" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(aoEscolher).toHaveBeenLastCalledWith("remover_tag");
  });

  it("sem nenhuma marcada, avisa com o texto da Clint", () => {
    const aoEscolher = vi.fn();
    render(<CentroDeAcoesEmMassa selecionadas={0} aoEscolher={aoEscolher} aoSair={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Alterar setor" }));
    expect(aoEscolher).not.toHaveBeenCalled();
  });

  it("a janela: o campo da ação e 'Executar ação em massa' só com valor", () => {
    const aoExecutar = vi.fn();
    render(<JanelaDaAcaoEmMassa acao="setor" aoFechar={vi.fn()} aoExecutar={aoExecutar} executando={false} />);
    expect(screen.getByText("Alterar setor")).toBeInTheDocument();
    expect(screen.getByText("Equipe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Executar ação em massa" })).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: "Equipe" }));
    fireEvent.click(screen.getByRole("option", { name: "Atendimento" }));
    fireEvent.click(screen.getByRole("button", { name: "Executar ação em massa" }));
    expect(aoExecutar).toHaveBeenCalledWith({ setor_id: "s1" });
  });
});
```

Confira os papéis que o `SeletorDaCasca` (`aparencia="janela"`) expõe (`combobox` no gatilho e `option` nas linhas); se forem outros, ajuste as duas consultas do último teste para os do componente.

Run: `corepack pnpm vitest run tests/unit/escale-selecao-e-massa-da-fila.test.tsx`
Expected: FAIL.

- [ ] **Step 2: As peças da seleção**

Create `components/escale/conversas/massa/CabecalhoDaSelecao.tsx`:

```tsx
"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { X } from "@/lib/ui/icons-da-casca";

/** A linha "Selecionar todos" / "{n} selecionados" com o X vermelho (c25, c82, c83). A caixinha marca as linhas carregadas (N12). */
export function CabecalhoDaSelecao({
  estado,
  selecionadas,
  aoMarcarCarregadas,
  aoSair,
}: {
  estado: boolean | "indeterminada";
  selecionadas: number;
  aoMarcarCarregadas: (marcar: boolean) => void;
  aoSair: () => void;
}) {
  const t = useT();
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-casca-borda px-3">
      <CaixaDaCasca marcada={estado} aoMudar={aoMarcarCarregadas} aria-label={t("Selecionar todos")} />
      <span className="flex-1 text-[13px] font-medium text-casca-texto">
        {selecionadas > 0 ? `${selecionadas.toLocaleString("pt-BR")} ${t("selecionados")}` : t("Selecionar todos")}
      </span>
      <button type="button" aria-label={t("Sair de ação em massa")} title={t("Sair de ação em massa")} onClick={aoSair} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-alerta hover:bg-casca-raia">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
```

Create `components/escale/conversas/massa/FaixaDoFiltroInteiro.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";

/** A escolha à parte de "todas as do filtro" (decisão B3; textos nossos no tom da Clint). */
export function FaixaDoFiltroInteiro({
  modo,
  carregadas,
  total,
  aoSelecionarTodas,
  aoLimpar,
}: {
  modo: "carregadas" | "todas" | null;
  carregadas: number;
  total: number | null;
  aoSelecionarTodas: () => void;
  aoLimpar: () => void;
}) {
  const t = useT();
  if (!modo || total === null || total <= carregadas) return null;
  const totalBr = total.toLocaleString("pt-BR");
  const link = "font-medium text-casca-marca hover:underline";
  return (
    <div role="status" className="flex min-h-9 shrink-0 flex-wrap items-center justify-center gap-x-2 bg-casca-marca-suave px-3 py-1 text-center text-[12px] text-casca-texto">
      {modo === "carregadas" ? (
        <>
          <span>{t("As {n} conversas carregadas estão selecionadas.").replace("{n}", carregadas.toLocaleString("pt-BR"))}</span>
          <button type="button" onClick={aoSelecionarTodas} className={link}>
            {t("Selecionar todas as {total} conversas do filtro").replace("{total}", totalBr)}
          </button>
        </>
      ) : (
        <>
          <span>{t("Todas as {total} conversas do filtro estão selecionadas.").replace("{total}", totalBr)}</span>
          <button type="button" onClick={aoLimpar} className={link}>
            {t("Limpar seleção")}
          </button>
        </>
      )}
    </div>
  );
}
```

Create `components/escale/conversas/massa/CentroDeAcoesEmMassa.tsx`:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { textoDasSelecionadas } from "@/lib/escale/conversas/acoes-em-massa-da-fila";
import { ArrowLeftRight, ListChecks, RefreshCcw, Tag, Tags, Trash2, UsersRound, type LucideIcon } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export type AcaoEscolhida = "status" | "atendente" | "setor" | "incluir_tag" | "remover_tag";

const CARTAO = "flex h-12 items-center gap-2 rounded-lg border border-casca-borda bg-surface px-4 text-[13px] text-casca-texto hover:border-casca-marca";

function Icone({ icone: Ic }: { icone: LucideIcon }) {
  return (
    <span className="grid size-7 place-items-center rounded-full bg-casca-raia text-casca-texto-2">
      <Ic size={16} aria-hidden />
    </span>
  );
}

/** A tela "Ações em massa" (c25, c30, c82). A ilustração da Clint fica de fora (item 4 dos prints que faltam). */
export function CentroDeAcoesEmMassa({
  selecionadas,
  aoEscolher,
  aoSair,
}: {
  selecionadas: number;
  aoEscolher: (a: AcaoEscolhida) => void;
  aoSair: () => void;
}) {
  const t = useT();
  const [tagAberta, setTagAberta] = useState(false);
  const escolher = (a: AcaoEscolhida) => {
    if (selecionadas === 0) {
      toast.error(t("É preciso selecionar ao menos um Chat para realizar ações em massa!"));
      return;
    }
    aoEscolher(a);
  };
  const cartao = (a: AcaoEscolhida, rotulo: string, icone: LucideIcon) => (
    <button type="button" onClick={() => escolher(a)} className={CARTAO}>
      <Icone icone={icone} />
      {t(rotulo)}
    </button>
  );
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-casca-marca-suave text-casca-marca">
        <ListChecks size={32} aria-hidden />
      </span>
      <h2 className="mt-6 text-[16px] font-medium text-casca-texto">{t("Ações em massa")}</h2>
      {selecionadas > 0 ? <p className="mt-1 text-[12px] text-casca-suave">{textoDasSelecionadas(selecionadas, t)}</p> : null}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {cartao("status", "Alterar status", RefreshCcw)}
        {cartao("atendente", "Alterar atendente", ArrowLeftRight)}
        {cartao("setor", "Alterar setor", UsersRound)}
        <Popover open={tagAberta} onOpenChange={setTagAberta}>
          <PopoverTrigger asChild>
            <button type="button" className={cn(CARTAO, tagAberta && "border-casca-marca")}>
              <Icone icone={Tag} />
              {t("Alterar tag do contato")}
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="start" sideOffset={4} className="w-32 p-1">
            <button type="button" onClick={() => { setTagAberta(false); escolher("incluir_tag"); }} className="flex h-[34px] w-full items-center gap-2 rounded-[4px] px-2 text-[12px] text-casca-texto hover:bg-casca-raia">
              <Tags size={14} aria-hidden />
              {t("Incluir")}
            </button>
            <button type="button" onClick={() => { setTagAberta(false); escolher("remover_tag"); }} className="flex h-[34px] w-full items-center gap-2 rounded-[4px] px-2 text-[12px] text-casca-texto hover:bg-casca-raia">
              <Trash2 size={14} aria-hidden />
              {t("Remover")}
            </button>
          </PainelSuspenso>
        </Popover>
      </div>
      <button type="button" onClick={aoSair} className="mt-6 text-[12px] text-casca-suave hover:text-casca-texto">
        {t("Sair de ação em massa")}
      </button>
    </div>
  );
}
```

Create `components/escale/conversas/massa/JanelaDaAcaoEmMassa.tsx`:

```tsx
"use client";
import { useState } from "react";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { ROTULO_DO_STATUS_DA_ACAO, STATUS_DA_ACAO } from "@/lib/escale/conversas/acoes-em-massa-da-fila";
import { X } from "@/lib/ui/icons-da-casca";

import type { AcaoEscolhida } from "./CentroDeAcoesEmMassa";

const SEM = "__sem_atendente__";
const TITULO: Record<AcaoEscolhida, string> = {
  status: "Alterar status",
  atendente: "Alterar atendente",
  setor: "Alterar setor",
  incluir_tag: "Incluir tag",
  remover_tag: "Remover tag",
};
const CAMPO: Record<AcaoEscolhida, string> = { status: "Status", atendente: "Atendente", setor: "Equipe", incluir_tag: "Tag", remover_tag: "Tag" };

/** A janela de cada ação (c26–c29): um campo e "Executar ação em massa", sem "tem certeza". */
export function JanelaDaAcaoEmMassa({
  acao,
  aoFechar,
  aoExecutar,
  executando,
}: {
  acao: AcaoEscolhida | null;
  aoFechar: () => void;
  aoExecutar: (parametros: Record<string, unknown>) => void;
  executando: boolean;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const [valor, setValor] = useState("");
  const { data: membros = [] } = useAssignableMembers(acao === "atendente");
  const { data: setores = [] } = useSetores();
  const vocabulario = useContactTagVocabulary(acao === "incluir_tag" || acao === "remover_tag" ? (activeOrg?.orgId ?? null) : null);
  if (!acao) return null;
  const opcoes =
    acao === "status"
      ? STATUS_DA_ACAO.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_STATUS_DA_ACAO[s]) }))
      : acao === "atendente"
        ? [{ valor: SEM, rotulo: t("Sem atendente") }, ...membros.map((m) => ({ valor: m.user_id, rotulo: m.full_name?.trim() || t("Sem nome") }))]
        : acao === "setor"
          ? setores.map((s) => ({ valor: s.id, rotulo: s.nome }))
          : (vocabulario.data ?? []).map((tag) => ({ valor: tag, rotulo: tag }));
  const parametros = (): Record<string, unknown> =>
    acao === "status" ? { status: valor } : acao === "atendente" ? { user_id: valor === SEM ? null : valor } : acao === "setor" ? { setor_id: valor } : { tag: valor };
  const fechar = () => {
    setValor("");
    aoFechar();
  };
  return (
    <JanelaDaCasca aberta onFechar={fechar} className="w-[448px] p-0">
      <div className="flex h-14 items-center justify-between border-b border-casca-borda px-5">
        <span className="text-[15px] font-medium text-casca-texto">{t(TITULO[acao])}</span>
        <button type="button" aria-label={t("Fechar")} onClick={fechar} className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto">
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="flex flex-col gap-1.5 px-6 py-5">
        <span className="text-[13px] text-casca-texto">{t(CAMPO[acao])}</span>
        <SeletorDaCasca aparencia="janela" valor={valor} opcoes={opcoes} aoMudar={setValor} vazio={t("Selecione...")} vazioSoNoGatilho aria-label={t(CAMPO[acao])} />
      </div>
      <div className="flex h-16 items-center justify-end border-t border-casca-borda px-6">
        <button
          type="button"
          disabled={!valor || executando}
          onClick={() => aoExecutar(parametros())}
          className="h-8 rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("Executar ação em massa")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
```

- [ ] **Step 3: A linha e a lista em seleção**

Em `components/escale/conversas/fila/LinhaDaFila.tsx` (3A–3C):
1. Props novas: `selecionando = false`, `marcada = false`, `aoMarcar?: (marcar: boolean) => void` (tipos `selecionando?: boolean; marcada?: boolean; aoMarcar?: (marcar: boolean) => void;`).
2. No `<button>` da linha: `onClick={() => (selecionando ? aoMarcar?.(!marcada) : aoSelecionar(conversa.id))}`, `aria-pressed={selecionando ? marcada : undefined}` e, na `className`, `selecionando && "pl-10"`.
3. Logo dentro do `<div className="relative">`, antes do `<button>`:

```tsx
      {selecionando ? (
        <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2">
          <CaixaDaCasca marcada={marcada} aoMudar={() => undefined} aria-label={rotuloDoContato(conversa.contacts ?? null, t)} />
        </span>
      ) : null}
```

(import `CaixaDaCasca` de `@/components/escale/ui/CaixaDaCasca`; o clique é da linha, a caixinha só mostra — `pointer-events-none`).

Em `components/escale/conversas/fila/ListaDaFila.tsx` (3A–3C):
1. Props novas: `selecao?: Selecao | null`, `aoMudarSelecao?: (s: Selecao) => void`, `total?: number | null`, `aoSairDaSelecao?: () => void` (imports de `@/lib/escale/contatos/selecao`).
2. Antes do `return` final da lista, com `selecao`:

```tsx
  const emSelecao = !!selecao && !!aoMudarSelecao;
  const estado = emSelecao ? estadoDaPagina(selecao, itens, 0) : false;
  const selecionadas = emSelecao ? totalSelecionado(selecao, total ?? itens.length) : 0;
  const modoDaFaixa = !emSelecao ? null : selecao.tipo === "todos" && todosMarcados(selecao) ? "todas" : estado === true && selecao.tipo === "ids" ? "carregadas" : null;
```

3. O retorno com as linhas passa a ser:

```tsx
  return (
    <div className="flex h-full flex-col">
      {emSelecao ? (
        <>
          <CabecalhoDaSelecao
            estado={estado}
            selecionadas={selecionadas}
            aoMarcarCarregadas={(m) => aoMudarSelecao(m ? marcarPagina(selecao, itens, 0, true) : SEM_SELECAO)}
            aoSair={() => aoSairDaSelecao?.()}
          />
          <FaixaDoFiltroInteiro
            modo={modoDaFaixa}
            carregadas={itens.length}
            total={total ?? null}
            aoSelecionarTodas={() => aoMudarSelecao(SELECIONAR_TODOS)}
            aoLimpar={() => aoMudarSelecao(SEM_SELECAO)}
          />
        </>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {fixada && !emSelecao ? (
          <LinhaDaFila conversa={fixada} selecionada fixada aoSelecionar={aoSelecionar} aoSoltar={aoSoltarFixada} visualizacao={visualizacao} agora={agora} />
        ) : null}
        {itens.map((c, i) => (
          <LinhaDaFila
            key={c.id}
            conversa={c}
            selecionada={!emSelecao && c.id === selectedId}
            aoSelecionar={aoSelecionar}
            visualizacao={visualizacao}
            agora={agora}
            selecionando={emSelecao}
            marcada={emSelecao ? linhaMarcada(selecao, c.id, i) : false}
            aoMarcar={(m) => emSelecao && aoMudarSelecao(alternarLinha(selecao, c.id, i, m))}
          />
        ))}
        {/* o "Carregar mais" da 3A, sem mudança */}
      </div>
    </div>
  );
```

mantendo nas linhas as props que a 3B e a 3C acrescentaram (`agendadas`, `setor`) e o bloco do "Carregar mais" que já está lá. Imports: `CabecalhoDaSelecao`, `FaixaDoFiltroInteiro` de `../massa/…`.

- [ ] **Step 4: A casca com a seleção e as ações**

Em `components/escale/conversas/ConversasDaCasca.tsx`:

1. Imports: `CentroDeAcoesEmMassa`, `type AcaoEscolhida` (`./massa/CentroDeAcoesEmMassa`), `JanelaDaAcaoEmMassa` (`./massa/JanelaDaAcaoEmMassa`), `useAcaoDaFila`, `useExecutarAcaoDaFila` (`@/hooks/escale/useAcoesEmMassaDaFila`), `SEM_SELECAO`, `totalSelecionado`, `type Selecao` (`@/lib/escale/contatos/selecao`), `acaoRodando`, `alvoDaSelecaoDaFila`, `type PedidoDaFila` (`@/lib/escale/conversas/acoes-em-massa-da-fila`), `useQueryClient` (`@tanstack/react-query`), `toast` (`sonner`).

2. Estado e efeitos (depois do `podeSelecionar` da Task 8):

```tsx
  const qc = useQueryClient();
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [acaoEscolhida, setAcaoEscolhida] = useState<AcaoEscolhida | null>(null);
  const [acaoAcompanhada, setAcaoAcompanhada] = useState<string | null>(null);
  const total = useTotalDaFila(consulta, selecao !== null).data ?? null;
  const executar = useExecutarAcaoDaFila();
  const acompanhada = useAcaoDaFila(acaoAcompanhada);

  // N15: o fim da ação em segundo plano avisa e atualiza a fila.
  useEffect(() => {
    const a = acompanhada.data;
    if (!a || acaoRodando(a.status)) return;
    setAcaoAcompanhada(null);
    void qc.invalidateQueries({ queryKey: ["conversations"] });
    if (a.status === "concluida") toast.success(t("A ação em massa foi realizada com sucesso!"));
    else toast.error(t("Ocorreu um erro ao executar a ação em massa!"));
  }, [acompanhada.data, qc, t]);

  const sairDaSelecao = useCallback(() => {
    setSelecao(null);
    setAcaoEscolhida(null);
  }, []);

  function rodarAcao(parametros: Record<string, unknown>) {
    if (!selecao || !acaoEscolhida) return;
    const pedido = {
      acao: acaoEscolhida,
      alvo: alvoDaSelecaoDaFila(selecao, { painel, busca: consulta.busca }),
      parametros,
    } as PedidoDaFila;
    executar.mutate(pedido, {
      onSuccess: (r) => {
        void qc.invalidateQueries({ queryKey: ["conversations"] });
        if (r.status === "concluida") toast.success(t("A ação em massa foi realizada com sucesso!"));
        else {
          toast.info(t("Essa ação em massa pode demorar alguns segundos para ser completada e refletir os resultados da pesquisa."));
          setAcaoAcompanhada(r.id);
        }
        sairDaSelecao();
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : t("Ocorreu um erro ao executar a ação em massa!")),
    });
  }
```

3. Na `BarraDaFila`: `podeSelecionar={podeSelecionar}` e `aoSelecionar={() => { setFiltrosAbertos(false); setPersonalizando(false); setSelecao(SEM_SELECAO); }}` (no lugar dos provisórios da Task 8).

4. Na `ListaDaFila`: `selecao={selecao}`, `aoMudarSelecao={setSelecao}`, `total={total}`, `aoSairDaSelecao={sairDaSelecao}`.

5. No centro, antes do ramo `modoDoCentro === "conversa"`:

```tsx
              {selecao ? (
                <CentroDeAcoesEmMassa
                  selecionadas={totalSelecionado(selecao, total ?? itens.length)}
                  aoEscolher={setAcaoEscolhida}
                  aoSair={sairDaSelecao}
                />
              ) : modoDoCentro === "conversa" && conversa ? (
```

(o resto da cadeia de ramos continua como está), e, depois do centro:

```tsx
            <JanelaDaAcaoEmMassa acao={acaoEscolhida} aoFechar={() => setAcaoEscolhida(null)} aoExecutar={rodarAcao} executando={executar.isPending} />
```

6. Com a seleção ligada, o `useMarkAsRead` continua com a conversa aberta (a seleção não abre conversa): nada muda nele.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-selecao-e-massa-da-fila.test.tsx tests/unit/escale-fila-da-casca.test.tsx tests/unit/escale-conversas-casca.test.tsx && corepack pnpm prettier --write components/escale/conversas/massa tests/unit/escale-selecao-e-massa-da-fila.test.tsx && corepack pnpm eslint components/escale/conversas && corepack pnpm vitest run tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/escale/conversas tests/unit/escale-selecao-e-massa-da-fila.test.tsx
git commit -m "feat(escale): Selecionar, todas as do filtro e as quatro ações em massa da Clint na fila (Fase 3D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: Espanhol, os gates da fase, o PRD, o LOG e o PR

**Files:**
- Modify: `lib/i18n/dicionario.ts`; fora do repositório: `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md`, `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`

- [ ] **Step 1: O espanhol**

Em `lib/i18n/dicionario.ts`, o bloco `// ─── FORK ESCALE · Fase 3D: filtros, salvos e ações em massa de Conversas ───` logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D`, só com as chaves que ainda **não** existem no arquivo (confira cada uma com `grep -n '"<texto>":' lib/i18n/dicionario.ts`; as repetidas da 2B e da 3A–3C ficam de fora):

```ts
  // ─── FORK ESCALE · Fase 3D: filtros, salvos e ações em massa de Conversas ───
  "Atribuídas a mim": { es: "Asignadas a mí" },
  "Não atribuídas": { es: "Sin asignar" },
  "Sem resposta do atendente": { es: "Sin respuesta del agente" },
  "Aguardando resposta do contato": { es: "Esperando respuesta del contacto" },
  "Em transferência": { es: "En transferencia" },
  "Lidas": { es: "Leídas" },
  "Dentro da janela de conversa": { es: "Dentro de la ventana de conversación" },
  "Fora da janela de conversa": { es: "Fuera de la ventana de conversación" },
  "Janela de chamada aberta": { es: "Ventana de llamada abierta" },
  "Janela de chamada fechada": { es: "Ventana de llamada cerrada" },
  "Conversas suspensas": { es: "Conversaciones suspendidas" },
  "Data de criação do atendimento": { es: "Fecha de creación de la atención" },
  "Selecione uma data": { es: "Selecciona una fecha" },
  "Status da conversa": { es: "Estado de la conversación" },
  "Fechado": { es: "Cerrado" },
  "Arquivada": { es: "Archivada" },
  "Agentes": { es: "Agentes" },
  "Você pode filtrar por até 20 agentes.": { es: "Puedes filtrar por hasta 20 agentes." },
  "Somente conversas": { es: "Solo conversaciones" },
  "Somente grupos": { es: "Solo grupos" },
  "Salvar filtro": { es: "Guardar filtro" },
  "Resetar": { es: "Restablecer" },
  "Nome do filtro": { es: "Nombre del filtro" },
  "Ex: Clientes em aberto": { es: "Ej.: Clientes abiertos" },
  "Negócios": { es: "Negocios" },
  "Negócio com status": { es: "Negocio con estado" },
  "Com/sem negócio": { es: "Con/sin negocio" },
  "Negócio nos grupos": { es: "Negocio en los grupos" },
  "Negócio nas origens": { es: "Negocio en los orígenes" },
  "Negócio nas etapas": { es: "Negocio en las etapas" },
  "Selecione uma origem para escolher uma etapa": { es: "Selecciona un origen para elegir una etapa" },
  "Canais e Dispositivos": { es: "Canales y dispositivos" },
  "Desconectado": { es: "Desconectado" },
  "Personalizado": { es: "Personalizado" },
  "Renomear": { es: "Renombrar" },
  "Renomear filtro": { es: "Renombrar filtro" },
  "Compartilhar": { es: "Compartir" },
  "Deixar de compartilhar": { es: "Dejar de compartir" },
  "Filtro salvo.": { es: "Filtro guardado." },
  "Filtro excluído.": { es: "Filtro eliminado." },
  "Filtro inválido.": { es: "Filtro no válido." },
  "Nenhuma opção.": { es: "Ninguna opción." },
  "selecionados": { es: "seleccionados" },
  "1 conversa selecionada": { es: "1 conversación seleccionada" },
  "{n} conversas selecionadas": { es: "{n} conversaciones seleccionadas" },
  "As {n} conversas carregadas estão selecionadas.": { es: "Las {n} conversaciones cargadas están seleccionadas." },
  "Selecionar todas as {total} conversas do filtro": { es: "Seleccionar las {total} conversaciones del filtro" },
  "Todas as {total} conversas do filtro estão selecionadas.": { es: "Las {total} conversaciones del filtro están seleccionadas." },
  "Ações em massa": { es: "Acciones masivas" },
  "Alterar status": { es: "Cambiar estado" },
  "Alterar atendente": { es: "Cambiar agente" },
  "Alterar tag do contato": { es: "Cambiar etiqueta del contacto" },
  "Incluir": { es: "Incluir" },
  "Incluir tag": { es: "Incluir etiqueta" },
  "Remover tag": { es: "Quitar etiqueta" },
  "Sair de ação em massa": { es: "Salir de la acción masiva" },
  "Equipe": { es: "Equipo" },
  "Tag": { es: "Etiqueta" },
  "Executar ação em massa": { es: "Ejecutar acción masiva" },
  "Essa ação em massa pode demorar alguns segundos para ser completada e refletir os resultados da pesquisa.": { es: "Esta acción masiva puede tardar unos segundos en completarse y reflejarse en los resultados de la búsqueda." },
  "Ocorreu um erro ao executar a ação em massa!": { es: "¡Ocurrió un error al ejecutar la acción masiva!" },
  "É preciso selecionar ao menos um Chat para realizar ações em massa!": { es: "¡Debes seleccionar al menos un chat para realizar acciones masivas!" },
  "A ação em massa foi realizada com sucesso!": { es: "¡La acción masiva se realizó con éxito!" },
  "Sem permissão para ações em massa.": { es: "Sin permiso para acciones masivas." },
  "No máximo 100.000 conversas por ação.": { es: "Máximo 100.000 conversaciones por acción." },
  "Destino não é um atendente desta organização.": { es: "El destino no es un agente de esta organización." },
  "Setor não encontrado.": { es: "Sector no encontrado." },
  "Ação não encontrada.": { es: "Acción no encontrada." },
  "A conversa está arquivada.": { es: "La conversación está archivada." },
```

- [ ] **Step 2: Os gates da fase (sem `test:db` e sem a rodada cheia)**

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts tests/unit/vocabulario-do-funil.test.ts tests/unit/evidencia-citada.test.ts tests/unit/escale-casca-v2-original-intacto.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/dispatcher-org-parada.test.ts tests/invariants/rls-completude-varredura.test.ts
corepack pnpm vitest run $(git diff --name-only escale-crm/main...HEAD | grep -E "\.test\.tsx?$" | grep "^tests/unit")
corepack pnpm typecheck && corepack pnpm eslint $(git diff --name-only escale-crm/main...HEAD | grep -E "\.(ts|tsx)$")
```

Expected: tudo PASS. Os nomes exatos das cercas: `ls tests/unit | grep -E "i18n|tokens|decorativo|vocabulario|evidencia|intacto|manifest|dispatcher"`.

- [ ] **Step 3: O PRD e o LOG (fora do repositório)**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md`, seção 8, a linha da 3D: a coluna "Estado" de `proposta` para `executada (PR #<n>, <data>); testes e publicação no fim da Frente C`; e, na seção 4, tabela B, a coluna "Fase" de B1–B8 para `3D ✅`, com as diferenças declaradas: B6 usa a tabela das listas da 2B (`crm_filtros_das_listas`, lista "conversas"), não a 9004; B7 segue a decisão B3 (todas as do filtro à parte); a ilustração de "Ações em massa" é provisória; "Janela de chamada" fica "Em breve".

Em `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`: uma entrada nova no topo da "Linha do tempo" (data de hoje, a 3D executada, o PR, a migration 9204, o que ficou provisório) e "Onde estamos"/"Próximos passos" reescritos (próximo: 3E; depois a bateria única e a publicação da Frente C).

- [ ] **Step 4: O PR**

```bash
git fetch escale-crm --quiet && git rebase escale-crm/main
git push -u escale-crm feat/fase-3d-filtros-e-acoes-em-massa
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-3d-filtros-e-acoes-em-massa \
  --title "feat(escale): Fase 3D — filtros, filtros salvos, seleção e ações em massa de Conversas" \
  --body "$(cat <<'EOF'
## O que entra
- Painel "Filtros" da Clint na fila (Conversas, Grupos, Negócios, Contatos, Canais), aplicado na hora e na URL; o filtro avaliado no banco (migration 9204, funções invoker).
- Botão de presets com "Personalizado" e os **Salvos** (salvar, aplicar, renomear, compartilhar, excluir; 20 por pessoa) na tabela das listas da 2B.
- "Selecionar" com a caixinha por linha, "Selecionar todos" (as carregadas) e "Selecionar todas as N do filtro" à parte (decisão B3).
- "Ações em massa": Alterar status, atendente, setor e tag do contato — na hora até 50, em segundo plano acima (consumidor do event_log).
- A fila da casca passa a ler `/api/v1/fila-da-casca`; o Inbox original não muda.

## Diferenças declaradas
- A ilustração de "Ações em massa" é provisória (arte da Clint não se copia).
- "Janela de chamada aberta/fechada": "Em breve" (o original não guarda a janela de chamada).
- "Salvos" com ⋮, a janela "Renomear" e as janelas de tag seguem o código da Clint (sem print).

## Verificação
- Testes da fase, typecheck, eslint e as cercas da casca.
- `test:db`, rodada cheia, revisor e conferência visual: no fim da Frente C (depois da 3E).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --repo rgisjr/escale-crm --merge --delete-branch=false
```

Expected: o PR mergeado na `main` do `rgisjr/escale-crm`. **Nada de tag, release nem VPS** (fim da Frente C).

## Fase 3D — filtros, filtros salvos, seleção e ações em massa de Conversas

Linha da seção 8 do PRD depois desta fase: `| 3D | **Filtros, filtros salvos, seleção e ações em massa:** B1–B8 | … | executada (PR #<n>); testes e publicação no fim da Frente C |`.

## Verificação

1. **Por task:** os testes que a task cria, os guardas dos arquivos tocados, typecheck e eslint (G1).
2. **Fim da Frente C (Task final da 3E):** `test:db` (inclui `tests/invariants/escale-fila-e-massa-9204.test.ts`), `test:db:update`, rodada cheia em segundo plano, um revisor (Opus 5.5, high) e a conferência visual lado a lado com c25–c36, c64–c72, c76–c83, com a lista escrita das diferenças.

## Fora desta fase (registrado)

- "Janela de chamada aberta/fechada": depende de dado da Meta que o original não guarda (3B N20).
- A ilustração da Clint em "Ações em massa" (pergunta ao usuário no topo).
- Ações em massa além das quatro da Clint (ex.: arquivar) e o painel "Minhas ações em massa" de conversas (a Clint não mostra).
- O seletor "Selecionar [N]" da lista de contatos (a Clint de Conversas não tem).

## Self-review (19/10)

1. **Cobertura do PRD:** B1 → Tasks 1, 7, 8 (acordeões, estado lembrado, Grupos só com grupo); B2 → Tasks 1, 2, 7 (12 toggles, data sem abas, status pelo mapa, atendentes, agentes até 20, setores; chamada "Em breve"); B3 → Tasks 1, 2, 7 (Data com três abas, com/sem, status, motivo com "Não informar", dono com "Sem dono", grupos, origens, etapas; "algum negócio do contato"); B4 → Task 7 (tags da 2B sobre as do contato); B5 → Task 7 (dispositivos agrupados, "Desconectado"); B6 → Tasks 4, 8 (Salvos, Criar filtro abre o painel, "Salvar filtro" e "Resetar" no cabeçalho, 20 por pessoa, compartilhar); B7 → Task 9 (seleção com a decisão B3); B8 → Tasks 2, 5, 9 (as quatro ações, janela sem "tem certeza", toasts, segundo plano acima de 50, permissão própria). A4 "Salvos" e "Somente conversas/grupos" → Task 8; A6 "Selecionar" → Tasks 8, 9.
2. **Placeholders:** nenhum "TBD"; os pontos "confira" apontam o arquivo e a forma a copiar (assinaturas de helpers existentes que a 3A–3C criam).
3. **Tipos entre tasks:** `FiltrosDoPainel`/`painelDaUrl`/`paramsDoPainel`/`rotuloDoBotao`/`totalDeCriterios` (Task 1) são o que a rota (3), os salvos (4), o hook (6), o painel (7), o botão (8) e a casca (8, 9) usam; `FiltroDaFilaCompilado` (Task 1) é o que a função (2), `fila-banco` (3) e a rota da ação (5) mandam ao banco; `ConsultaDaFila`/`parametrosDaConsulta` (Task 6) servem à fila e ao total; `PedidoDaFila`/`alvoDaSelecaoDaFila`/`ResumoDaAcaoDaFila` (Task 1) batem com a rota (5) e com os hooks (6); `AcaoEscolhida` (Task 9) é subconjunto de `AcaoDaFila`; `transferirConversaParaSetor` (Task 5) mantém a assinatura que a rota da 3C e o executor usam.
