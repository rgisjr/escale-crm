# Fase 3C — Setores, permissões e configurações de Conversas (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** C3 e E1 a E6 de `docs/modulos/3-conversas.md` (seção 4, tabelas C e E), a seção 5 (as 19 permissões de Conversas da Clint com o papel mínimo), a seção 7 (Setores, Perfis de atendimento, Respostas rápidas) e as decisões 1 (setor é entidade do fork), 9 (Modelos, Flows e Análise de templates "Em breve") e 12 (transferência para atendente continua imediata; "Em transferência" só para setor) da seção 9.
> Depende da **3A e da 3B mergeadas** (a casca `components/escale/conversas/`, `LinhaDaFila`, `PainelPersonalizarVisualizacao`, `CabecalhoDaConversa`, `SeletorDeAtendente`, `PainelRespostasRapidas`, a página de mensagens agendadas). A 3D usa os setores e a chave "Ações em massa" desta fase; a 3E põe a aba "Criação de negócio" na janela do dispositivo que esta fase cria.

## Decisões do usuário (18/10)

| # | Pergunta | Decisão | Onde vale |
|---|---|---|---|
| Q1 | PRD de Conversas | Aprovado | tudo |
| Q2 | Frente | (a) Frente C, worktree `wt-frente-c` | N1 |
| Q3 | Prints que faltam | Escrever agora e marcar como provisório | abaixo |

**Prints que faltam nesta fase** (nenhum bloqueia; o plano segue o código da Clint e marca como provisório):
1. ❌ O cartão "Notificações" do hub com o toggle **ligado**. Provisório: o mesmo `InterruptorDaCasca` do resto da casca.
2. ❌ "Em transferência" (a faixa na conversa e o selo na linha). Provisório: faixa de 40px acima do compositor, fundo `casca-pausa`, texto `casca-pausa-texto` "Em transferência para {setor}" e o botão "Cancelar transferência" (texto da Clint `component.ChatHeader.*`); na linha, o chip do setor de destino com a borda tracejada.
3. ❌ "Alterar setor" aberto no cabeçalho. Provisório: o mesmo `PainelSuspenso` de 250px do seletor de atendente, com os setores (monograma + nome) e "Buscar por setor...".
4. ❌ A tela vazia de Setores ("Você ainda não tem nenhum setor cadastrado!") e de Respostas rápidas. Provisório: `VazioDaCasca` da 3A com os textos da Clint.

**Pergunta ao usuário (não bloqueia):** na Clint cada pessoa liga ou desliga cada uma das 19 permissões. O PRD pedia "chave × papel mínimo por organização". O plano faz **por pessoa** (como a Clint), com o padrão vindo do papel; as chaves que o motor do original decide (ver todas as conversas, enviar, mudar status, dispositivos) aparecem travadas no valor do papel, com a dica "Definido pelo papel do usuário". Se preferir por organização, só muda a tabela e a aba (Task 2 e Task 11).

**Goal:** Com a casca ligada, Conversas ganha o hub ⚙ "Conversas › Configurações" da Clint (9 cartões) dentro da própria tela (a fila continua à esquerda): Setores (lista, criar, editar, remover, membros e cor), Configuração de canais (os cartões por canal, a lista de dispositivos com setor e atendentes, a janela "Informações do dispositivo"), Usuários e Permissões (a lista e a janela do usuário com Geral, Permissões com as 19 chaves e Contas e dispositivos), Respostas rápidas (a tabela e "Criar Resposta rápida" com atalho, canais, compartilhar e setores), Mensagens agendadas (a tela da 3B, agora dentro da casca) e Notificações; e o setor aparece na conversa: o chip na linha da fila, o selo e "Alterar setor" no cabeçalho, "Em transferência" com "Cancelar transferência", e quem é do setor vê as conversas do setor.

**Architecture:**
- **Setor é tabela do fork** (decisão 1): `crm_setores` (nome, cor), `crm_setores_membros`, `crm_setor_do_dispositivo` (um setor por dispositivo, como o "Setor de atendimento" da Clint) e `crm_setor_da_conversa` (o setor explícito da conversa e o estado "Em transferência"). O **setor efetivo** de uma conversa é o explícito ou, sem ele, o do dispositivo. Nada muda nas tabelas do original.
- **Leitura pelo setor é um critério a mais, nunca a menos** (risco 1 do PRD): uma policy nova e permissiva `crm_conversations_select_setor` em `conversations` (as policies permissivas somam por OU) deixa o **atendente** ver as conversas do setor efetivo dos seus setores, quando ele tem "Visualização de atendimento do setor". As mensagens herdam (a `messages_select` do original lê `conversations`). `fn_can_view_conversation` e o `visibility_mode` continuam intactos; gerente e admin já veem tudo.
- **As 19 permissões da Clint** ficam em `lib/escale/conversas/permissoes.ts` (chave, nome, descrição, papel padrão, modo). Cada pessoa pode ter exceções em `crm_permissoes_de_atendimento` (chave → ligado). `fn_crm_pode(org, chave)` responde pela sessão: a exceção da pessoa ou o papel padrão. Só as chaves que o fork aplica no servidor são editáveis; as que o motor do original decide aparecem travadas no valor do papel.
- **Configurações dentro da casca:** `ConversasDaCasca` (3A) ganha a prop `configuracao`; com ela, o centro e o painel direito viram a tela de configuração e a fila continua à esquerda (c37). As páginas `app/app/inbox/configuracoes/**` montam a casca com a tela certa; sem a casca, voltam para `/app/inbox`.
- **Dispositivos e atendentes** sobre o original: a lista lê `/api/v1/channel-sessions` e os responsáveis por canal (`/api/v1/settings/routing/channels`, 0228); "Atendentes conectados nesse dispositivo" grava pelo mesmo PATCH do original (gerente + MFA); nome, arquivar, excluir e reconectar são as rotas do original (admin); "Novo dispositivo" abre a tela de conexões do original.
- **Respostas rápidas** são os `message_templates` do original mais `crm_respostas_rapidas_extras` (canais, "todos os setores") e `crm_respostas_rapidas_setores`. Compartilhar = `owner_user_id` nulo, como no original.
- **Migration 9203**, um PR `feat/fase-3c-setores-e-configuracoes`.

**Tech Stack:** o mesmo da 3A/3B (Next.js 16, React 19, TanStack Query 5, Vitest + Testing Library, Tailwind 4 com os tokens da casca, Radix, Supabase RLS, zod, sonner).

## Referência visual (abrir a imagem antes de cada task de tela)

Caminhos sem crase (guarda `evidencia-citada`). Todos em 1:1.

| # | Arquivo | O que define | Task |
|---|---|---|---|
| c37 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c37-configuracoes-do-modulo.jpg | o hub: migalhas "Conversas › Configurações", X, os 9 cartões em 3 colunas (ícone 48px em quadrado `casca-marca-suave`, título 14px/600 com os ícones dos canais em "Dispositivo" e o toggle em "Notificações", descrição 13px) | 8 |
| c38 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c38-config-setores-lista.jpg | Setores: busca "Buscar por setor...", "Novo setor", colunas SETOR (monograma 28px + nome), CONTA/DISPOSITIVO, ATENDENTES, ⋮ | 9 |
| c87 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c87-setor-menu-editar-remover.jpg | o ⋮ do setor: "Editar setor" (lápis), "Remover setor" (lixeira, vermelho); e o chip "AT" do setor na segunda linha da fila | 9, 13 |
| c42 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c42-config-crie-um-setor-modal.jpg | "Crie um setor": Nome do setor, "Adicione usuários a este setor" (?), "Usuário selecionado" com busca, vazio "Você ainda não adicionou usuários", a prévia 64px da cor e as 24 cores, Cancelar, "Criar setor" | 9 |
| c88 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c88-editar-setor-modal.jpg | "Editar setor": "Usuários selecionados" com foto 36px, nome 13px, e-mail 12px e a lixeira vermelha; "Salvar alterações" | 9 |
| c89 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c89-setor-tooltip-usuarios.png | a dica do (?): "Para adicionar usuários, pesquise pelo nome ou email." | 9 |
| c98 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c98-configuracao-de-canais.jpg | "Configuração de canais": três cartões 320×88 (logo 40px, nome 14px/600, selo "API oficial", "✓ Instalado" verde, chevron) | 10 |
| c99 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c99-whatsapp-lista-de-dispositivos.jpg | o canal: migalhas de 3 níveis, abas Dispositivos / Usuários e Permissões / Setores, busca, "Mostrar arquivados", "Novo dispositivo", colunas NOME DISPOSITIVO, STATUS (pílulas Conectado/Desconectado), SETORES, USUÁRIOS NESSE DISPOSITIVO (fotos sobrepostas + "+n"), o ícone de desconectar/QR e o ⋮ | 10 |
| c100 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c100-dispositivo-menu-editar-desconectar-arquivar.jpg | o ⋮ do dispositivo: Editar, Desconectar, Arquivar, Excluir (vermelho) | 10 |
| c101 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c101-dispositivo-aba-dispositivos.jpg | "Informações do dispositivo": abas Dispositivos / Criação de negócio; foto 40px, "Nome do dispositivo" (?), "Número conectado"; "Setor de atendimento" com o texto de ajuda; "Atendentes conectados nesse dispositivo" com busca, "Ativar todos" e um toggle por pessoa | 10 |
| c102 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c102-dispositivo-tooltip-usuario-administrador.png | o toggle do admin ligado e apagado, dica "Usuário administrador" | 10 |
| c103 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c103-dispositivo-atendentes-rolado.jpg | a lista de atendentes rolada (nome 13px/500, e-mail 13px `casca-suave`, linhas 48px com borda) | 10 |
| 16/10-04 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-16-04-dispositivo-aba-dispositivos.png | a mesma janela no WhatsApp Oficial: "Indicador de digitação" (fica "Em breve"), Marketing Messages API e Chamadas por WhatsApp (fora, decisão 9) | 10 |
| 16/10-05 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-16-05-canais-whatsapp-oficial-lista.png | a lista do WhatsApp Oficial (abas extras Modelos, Flows, Análise "Em breve"; colunas SAÚDE, STATUS DO NOME, MM API ficam fora) | 10 |
| c40 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c40-config-usuarios-e-permissoes.jpg | Usuários e Permissões: busca "Buscar por nome, e-mail ou telefone", "Adicionar usuário", colunas USUÁRIO (foto 36px, nome 13px/600 com o selo azul, e-mail 13px), DISPOSITIVO (ícones dos canais), PERMISSÕES DE ATENDIMENTO (pílula cinza com o grupo) | 11 |
| c90 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c90-usuario-aba-geral.jpg | a janela do usuário (1440px de largura útil, 575px de altura): foto 32px, nome 16px, selo, lixeira; abas Geral / Permissões / Contas e dispositivos; Geral: Nome, Sobrenome, E-mail, Telefone (BR + número), Identificador de usuário, Link de usuário, WhatsApp; "Salvar alterações" | 11 |
| c91 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c91-usuario-aba-geral-setores.jpg | Geral rolada: "Setores" (seleção múltipla com X e chevron) | 11 |
| c92 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c92-usuario-permissoes-conversas-1.jpg | Permissões: "Grupo de permissão:" + o seletor + "Salvar grupo personalizado"; menu à esquerda (Páginas, Conversas, CRM, Origens, Contatos, Conta, Transcrição de chamada, Indicadores, Empresas…); "Conversas · Configure as permissões desta seção." + "Desativar todos"; a grade de 3 colunas com nome 13px/500, descrição 13px e o toggle | 11 |
| c93 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c93-usuario-permissoes-conversas-2.jpg | as chaves de baixo (até "Consultar respostas rápidas de outros setores") | 11 |
| c94 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c94-usuario-grupo-de-permissao.jpg | o seletor de grupo aberto, "Personalizado" com ✓ | 11 |
| c95 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c95-usuario-contas-e-dispositivos.jpg | Contas e dispositivos: o texto de duas linhas, menu WhatsApp / WhatsApp Oficial / Instagram, "Ativar Todos", busca "Buscar por...", os toggles em 3 colunas, "Fechar" | 11 |
| c41 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c41-config-respostas-rapidas.jpg | Respostas rápidas: busca, "Setor ▾", "?", "Adicionar"; colunas ATALHO (`casca-marca`, "/atalho"), CONTEÚDO (2 linhas), SETORES (pílula "Todos"), CANAIS (ícones), ⋮; "10 por página" e a paginação | 12 |
| c96 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c96-criar-resposta-rapida-modal.jpg | "Criar Resposta rápida": o aviso laranja, a caixa "Escreva uma mensagem..." com a barra (emoji, GIF, anexo, câmera, áudio, [ ], ⓥ) e "+ Adicionar", "Atalho", "Utilizar em:" com os dois ícones marcados, "Compartilhar com outros usuários", "Setores" com "Todos os setores (1) ▾" e o texto de ajuda; Cancelar, Salvar | 12 |
| c97 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c97-resposta-rapida-menu-editar-excluir.jpg | o ⋮ da resposta: Editar, Excluir (vermelho) | 12 |
| c02 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c02-conversa-aberta-cabecalho-compositor-painel.jpg | o selo do setor no cabeçalho ("AT", 20px) | 13 |

### Medidas tiradas dos prints (px de CSS, 1:1)

| Peça | Medida |
|---|---|
| Área de configuração (c37) | ocupa o centro e o painel direito (a fila de 320px continua); cabeçalho 56px com as migalhas 13px (`casca-suave`, a última 13px/600 `casca-texto`, "›" entre elas) e o X 20px à direita; conteúdo com `px-6 py-6` |
| Cartão do hub (c37) | 336×124, borda `casca-borda`, canto 8px, `p-5`, gap 16px entre o quadrado do ícone (48px, `bg-casca-marca-suave`, ícone 22px `casca-marca`) e o texto; título 14px/600 `casca-texto`; descrição 13px `casca-suave` em até 3 linhas; grade de 3 colunas com 20px de espaço; hover: sombra `shadow-casca-painel` |
| Setores (c38) | linha de filtros 56px: busca 280×32 (`casca-busca`), "Novo setor" (`variante="marca"`) à direita; cabeçalho da tabela 40px (11px/600 uppercase `casca-sobrelinha`); linhas 45px com borda de baixo; monograma 28×28 canto 6px, texto 10px/600 branco; o nome 13px; as contagens 13px centradas; ⋮ 24px |
| Janela do setor (c42, c88) | `JanelaDaCasca` 576px, cabeçalho 56px "Crie um setor"/"Editar setor" 15px/600 + X; campos com rótulo 13px/500; "Nome do setor" 32px `casca-busca`; "Adicione usuários a este setor" + (?) 16px `casca-marca` (dica c89); o seletor "Adicione um usuário no setor ▾" 32px; "Usuário(s) selecionado(s)" + busca 190×32 "Buscar por nome ou e-mail"; vazio: quadrado 56px `casca-marca-suave` com `Users` 24px e "Você ainda não adicionou usuários" 15px/600; a lista com foto 36px, nome 13px, e-mail 13px `casca-suave` e lixeira 18px `casca-alerta`; a cor: prévia 64×56 canto 6px e a paleta de 24 bolinhas 16px em 2 linhas; rodapé 64px com Cancelar e "Criar setor"/"Salvar alterações" |
| Configuração de canais (c98) | cartões 322×88, borda, canto 8px, `px-5`; logo 40px; nome 15px/600; selo "API oficial" (pílula `casca-marca-suave`, 11px/500 `casca-marca`); "✓ Instalado" 13px verde (`--escale-status-ganho`); `ChevronRight` 16px `casca-chevron` |
| Lista de dispositivos (c99) | abas 48px (13px; a ativa com a barra de 2px `casca-marca`); filtros 56px; colunas NOME DISPOSITIVO (foto 36px, nome 13px/600, telefone 13px), STATUS (pílula 24px: Conectado `--escale-status-ganho-suave`/verde, Desconectado `casca-atraso`/`casca-alerta`), SETORES (13px/500), USUÁRIOS (fotos 28px sobrepostas em -8px, até 4, "+n" num círculo `casca-raia`); o ícone 18px (`SmartphoneNfc`/`QrCode`) e ⋮; linhas 53px |
| Informações do dispositivo (c101) | `JanelaDaCasca` 672px; abas 40px; foto 40px; "Nome do dispositivo" + (?) 13px/600 e o campo 32px; "Número conectado" com `Smartphone` 14px; separadores; "Setor de atendimento" 13px/600, o seletor 32px com X e chevron, o texto 13px `casca-suave`; "Atendentes conectados nesse dispositivo" 13px/600 + busca 280×32; "Ativar todos" + interruptor; a lista rolável de 288px com linhas 48px |
| Usuários e Permissões (c40) | busca 280×32, "Adicionar usuário" (`variante="marca"`); colunas USUÁRIO / DISPOSITIVO (ícones 16px com 12px de espaço) / PERMISSÕES DE ATENDIMENTO (pílula 22px `casca-raia`, 12px); linhas 53px |
| Janela do usuário (c90–c95) | `JanelaDaCasca` `w-[min(1440px,94vw)]` e 575px de altura; cabeçalho 64px; abas 36px (13px; ativa `casca-marca` com a barra); Geral: grade de 2 colunas, rótulos 13px/600, campos 32px `casca-busca`; Permissões: menu à esquerda 200px (itens 41px, o ativo com a barra de 3px à esquerda e fundo `casca-raia`), o título "Conversas" 15px/500 + "Configure as permissões desta seção." 13px, "Desativar todos" (borda, 32px); a grade de 3 colunas de cartões 86px com o toggle à direita; Contas e dispositivos: menu 220px, os toggles em 3 colunas de linhas 45px; rodapé 64px |
| Respostas rápidas (c41) | busca 280×32, "Setor ▾" (`SeletorDaCasca aparencia="filtro"`), "?" (`AjudaDaCasca`), "Adicionar"; colunas ATALHO 224px (13px `casca-marca`), CONTEÚDO (13px, 2 linhas com reticências), SETORES 120px (pílula 20px `casca-raia` 11px), CANAIS 120px (ícones 14px), ⋮; linhas de 50–57px; rodapé 56px com "10 por página ▾" e a paginação (`PaginacaoDaCasca`) |
| Criar Resposta rápida (c96) | `JanelaDaCasca` 672px; o aviso (borda e texto `casca-pausa-texto`, fundo `casca-pausa`, `AlertTriangle` 18px) 13px/600; a caixa com sombra, 96px de texto e a barra 40px com 7 ícones 16px e "+ Adicionar" (`casca-marca` 60%, "Em breve"); "Atalho" 15px + campo 36px "Digite o atalho"; "Utilizar em:" 15px + dois quadrados 28px com o ✓ azul 14px no canto; a caixinha "Compartilhar com outros usuários" 14px; "Setores" 13px/500 + `SeletorMultiploDaCasca` "Todos os setores" com o contador azul; a ajuda 13px; rodapé 68px com Cancelar e Salvar |
| Chip do setor na fila (c87) | 14×14, canto 3px, texto 7px/700 branco (o monograma), cor do setor; na segunda linha da `LinhaDaFila`, antes do tempo sem resposta |
| Selo do setor no cabeçalho (c02) | 20×20, canto 4px, texto 9px/700 branco; à esquerda do seletor de atendente; clicável ("Alterar setor") |

### Textos da Clint usados nesta fase

- **Hub (`component.ConfigurationsOptions.*`):** "Configurações"; "Dispositivo" · "Configure seus dispositivos, atendentes, canais e mais."; "Setores" · "Gerencie os setores de atendimentos do seu time."; "Mensagens agendadas" · "Agende uma nova mensagem ou veja quais estão programadas para envio."; "Respostas rápidas" · "Ajuste as respostas mais usadas pelo seu time."; "Usuários e Permissões" · "Habilite permissões que cada usuário pode fazer no módulo de conversas."; "Notificações" · "Fique por dentro de todas as notificações de atendimento que você tem acesso."; "Modelos de mensagem" · "Gerencie seus modelos de mensagem de WhatsApp."; "WhatsApp Flows" · "Crie formulários com várias telas e dados do contato já preenchidos."; "Análise de templates" · "Acompanhe entregas, falhas e a saúde dos seus modelos de mensagem."
- **Setores (`component.Team.*`, `component.TeamModal.*`, `component.TeamListItem.*`):** "Buscar por setor..."; "Novo setor"; "SETOR"; "Conta/Dispositivo"; "ATENDENTES"; "Editar setor"; "Remover setor"; "Erro ao remover setor"; "Você ainda não tem nenhum setor cadastrado!"; "Nenhum setor encontrado..."; "Tente outro termo ou crie um setor para organizar o atendimento."; "Crie um setor"; "Nome do setor"; "Digite um nome para o setor"; "Adicione usuários a este setor"; "Para adicionar usuários, pesquise pelo nome ou email."; "Adicione um usuário no setor"; "Usuário selecionado"; "Usuários selecionados"; "Buscar por nome ou e-mail"; "Você ainda não adicionou usuários"; "Cores"; "Criar setor"; "Salvar alterações".
- **Canais (`component.Channels.*`, `component.Info.*`):** "Configuração de canais"; "API oficial"; "Instalado"; "Dispositivos"; "Usuários e Permissões"; "Setores"; "Buscar dispositivo..."; "Mostrar arquivados"; "Novo dispositivo"; "Nome dispositivo"; "Status"; "Conectado"; "Desconectado"; "Usuários nesse dispositivo"; "Editar"; "Desconectar"; "Arquivar"; "Excluir"; "Informações do dispositivo"; "Criação de negócio"; "Nome do dispositivo"; "Número conectado"; "Setor de atendimento"; "Membros do time que estão no setor selecionado terão acesso a esse dispositivo."; "Atendentes conectados nesse dispositivo"; "Buscar por nome ou e-mail"; "Ativar todos"; "Usuário administrador"; "Indicador de digitação"; "Atendente digitando"; "Agente de IA respondendo".
- **Usuários (`component.Users.*`, `component.PermissionsTab.*`, `component.PermissionsChannelTabContent.*`):** "Buscar por nome, e-mail ou telefone"; "Adicionar usuário"; "Usuário"; "Dispositivo"; "Permissões de atendimento"; "Geral"; "Permissões"; "Contas e dispositivos"; "Nome"; "Sobrenome"; "E-mail"; "Telefone"; "Identificador de usuário"; "Link de usuário"; "WhatsApp"; "Setores"; "Grupo de permissão:"; "Personalizado"; "Salvar grupo personalizado"; "Configure as permissões desta seção."; "Desativar todos"; "Ativar Todos"; "Contas e dispositivos que usuário tem acesso."; "Estes estão associados aos setores aos quais o usuário pertence. Ele pode selecioná-los em atividades e tem autorização para acessá-los no atendimento."; "Buscar por..."; "Fechar"; "As permissões foram atualizadas com sucesso!"; "É necessário ter ao menos um usuário administrador!"; "Nenhum usuário encontrado"; "Tente ajustar o termo da busca."
- **As 19 chaves:** os nomes `label.tChat*` e as descrições dos prints c92/c93 (lista completa na Task 1).
- **Respostas rápidas (`component.QuickResponses.*`, `component.QuickResponseModal.*`):** "Buscar"; "Setor"; "Todos os setores"; "Pessoais"; "Adicionar"; "Atalho"; "Conteúdo"; "Setores"; "Canais"; "Todos"; "Editar"; "Excluir"; "Você ainda não cadastrou respostas rápidas."; "Crie atalhos de mensagens para responder mais rápido no atendimento."; "Criar Resposta rápida"; "Editar Resposta rápida"; "Você pode criar respostas rápidas para utilizar no chat de atendimento"; "Escreva uma mensagem..."; "Digite o atalho"; "Utilizar em:"; "Compartilhar com outros usuários"; "A resposta ficará disponível para os usuários ao atender conversas destes setores."; "Salvar"; "Cancelar"; "10 por página"; "Anterior"; "Próximo".
- **Conversa:** "Alterar setor"; "Em transferência"; "Cancelar transferência"; "Buscar por setor..."; "Sem setor".
- **Textos nossos:** "Definido pelo papel do usuário"; "Segue a visualização do atendimento do setor"; "Definido pelo modo de visibilidade da organização"; "Em breve"; "Administrador", "Gerente", "Atendente", "Leitor" (os grupos = os papéis do original); "O setor foi removido."; "Confirme a verificação em duas etapas."; "Só o atendente atual ou quem pode alterar atendentes libera a conversa."

### Comportamento da Clint conferido no código

- **Setor** (`component.Team*`, `component.TeamModal.*`): lista com contagem de contas/dispositivos e de atendentes; criar e editar no mesmo modal; remover pelo ⋮; um dispositivo tem **um** "Setor de atendimento" e "Membros do time que estão no setor selecionado terão acesso a esse dispositivo"; o setor aparece na linha, no cabeçalho, no filtro e na ação em massa.
- **Permissões** (`component.PermissionsTab.*`): um grupo por usuário ("Personalizado" quando alguém mexe num toggle), "Salvar grupo personalizado", "Desativar todos" por seção; admin sempre com tudo ("Usuário administrador").
- **Contas e dispositivos** (`component.PermissionsChannelTabContent.*`): por canal, um toggle por dispositivo e "Ativar Todos".
- **Respostas rápidas** (`component.QuickResponses.*`, `component.QuickResponseModal.*`): filtro Setor com "Todos os setores", "Pessoais" e cada setor; criar com atalho, canais, compartilhar e setores; várias mensagens por resposta ("+ Adicionar").

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Branch `feat/fase-3c-setores-e-configuracoes`** de `escale-crm/main` com a 3A e a 3B mergeadas, na worktree `wt-frente-c`; **migration 9203**; um PR, mergeado ao terminar | regra de 18/10 |
| N2 | **Setor efetivo** da conversa = `crm_setor_da_conversa.setor_id` ou, sem linha, `crm_setor_do_dispositivo.setor_id` do `channel_session_id` dela; sem nenhum dos dois, "Sem setor". `fn_crm_setor_efetivo(conversation_id, channel_session_id)` (definer, sem org no argumento, **não** executável pela sessão; só as outras funções a chamam) | decisão 1; nenhuma coluna nova em `conversations` |
| N3 | **Leitura pelo setor** = policy permissiva nova `crm_conversations_select_setor` com `fn_crm_ve_pelo_setor(organization_id, id, channel_session_id)`: verdade só para quem tem papel **agent** na organização (os outros já leem tudo pelo original), tem "Visualização de atendimento do setor" (`fn_crm_pode`) e é membro do setor efetivo. A `messages_select` herda; `fn_can_view_conversation` não muda | risco 1 do PRD ("a mais, nunca a menos") |
| N4 | **As 19 chaves** (`PERMISSOES_DE_CONVERSAS`, Task 1) com o papel padrão da seção 5 do PRD e um **modo**: `editavel` (o fork aplica no servidor), `papel` (o motor do original decide; travado no valor do papel, dica "Definido pelo papel do usuário"), `segue` (acompanha outra chave), `em_breve`. Editáveis: Visualizar todos os dispositivos, Visualização de atendimento do setor, Alterar atendentes do setor, Alterar atendentes, Ações em massa (a 3D aplica), Editar ou excluir respostas rápidas, Compartilhar respostas rápidas, Editar ou excluir setores, Consultar respostas rápidas de outros setores. Cada editável tem um **piso** (o papel mais baixo a quem pode ser dada) | o original não restringe o que já libera por papel; mexer em `fn_can_view_conversation` colide com o Rafael |
| N5 | **Exceções por pessoa** em `crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado)`; `fn_crm_pode(org, chave)` = a exceção ou `fn_role_at_least(org, papel padrão)` (o padrão em `fn_crm_papel_padrao(chave)`, espelho do TS; um teste compara os dois). Admin grava; a pessoa lê as suas; admin lê todas | pergunta ao usuário acima; a Clint é por pessoa |
| N6 | **"Grupo de permissão"** = o papel do original (Administrador, Gerente, Atendente, Leitor) e "Personalizado" quando há exceção. Trocar o grupo chama o `PATCH /api/v1/team/[user_id]` do original (admin) e apaga as exceções. "Salvar grupo personalizado" e as seções que não são Conversas (Páginas, CRM, Origens…) ficam "Em breve" (a trilha de grupos do PRD 2) | E4; seção 9 do PRD |
| N7 | **"Em transferência"** (C3, decisão 12): "Alterar setor" grava o setor novo em `crm_setor_da_conversa` com `em_transferencia = true`, guarda o setor e o atendente anteriores e solta o atendente (`fn_conversation_assign` com `p_to_user_id = null`, a mesma RPC do `release` do original, pela sessão). Os membros do setor novo passam a ver (N3) e a primeira pessoa que assume conclui (gatilho `trg_crm_conclui_transferencia` em `conversations` depois de mudar `assigned_to_user_id` para alguém). "Cancelar transferência" volta o setor anterior e, se havia atendente, reatribui a ele (`transfer` pela RPC). Sem setor de destino escolhido (só atendente), a transferência continua a imediata do original | C3; decisão 12 |
| N8 | **"Sem atendente" para outra pessoa** (pendência da 3B, N10): rota do fork `POST /api/v1/conversas-da-casca/[id]/liberar` → a mesma RPC do `release` do original com `p_expected_assignee` = o atendente atual, liberada quando a pessoa tem "Alterar atendentes" ou ("Alterar atendentes do setor" e é membro do setor efetivo). O `SeletorDeAtendente` usa a rota do original quando é o próprio atendimento e esta nos outros casos | 3B N10 |
| N9 | **Configurações dentro da casca:** `ConversasDaCasca` ganha `configuracao?: ReactNode`; com ela a grade vira `320px | 1fr` e a área da direita mostra a tela; escolher uma conversa na fila leva a `/app/inbox?id=`. As páginas ficam em `app/app/inbox/configuracoes/` (hub, `setores`, `canais`, `canais/[canal]`, `usuarios`, `respostas-rapidas` e a `mensagens-agendadas` da 3B, que passa a usar a casca). Sem a casca, `redirect("/app/inbox")` | c37–c41 |
| N10 | **Dispositivos:** "Configuração de canais" mostra só os canais que a organização tem (WhatsApp, WhatsApp Oficial, Instagram, pelo `grupoDoDispositivo` da 3A); a lista por canal lê `/api/v1/channel-sessions` (com "Mostrar arquivados" pelo `archived_at`); "Usuários nesse dispositivo" e "Atendentes conectados" são os responsáveis por canal do original (0228; `legacy_unconfigured` = todos os atendentes); gravar = o `PATCH /api/v1/settings/routing/channels` do original (gerente + MFA; o erro "mfa_required" vira "Confirme a verificação em duas etapas."). Nome = `PATCH /channel-sessions/[id]/name` (admin); **Excluir** = `DELETE /channel-sessions/[id]` (admin; no original, excluir é arquivar e desconectar); **Arquivar**, **Desconectar** e **Mostrar arquivados** ficam "Em breve" (o original não tem arquivar separado de excluir nem lista os arquivados); o ícone de QR do dispositivo desconectado e "Novo dispositivo" levam a `/app/connections` (onde o original lê o QR). As abas "Usuários e Permissões" e "Setores" do canal mostram as mesmas telas filtradas pelo canal. Visível para quem tem "Visualizar todos os dispositivos" (todos) ou é responsável (os seus) | E2; o original é o motor |
| N11 | **"Criação de negócio"** na janela do dispositivo: a aba existe e mostra "Em breve" até a 3E | E2; F da 3E |
| N12 | **Geral do usuário:** Nome e Sobrenome vêm do `full_name` do original (dividido no primeiro espaço) e só a própria pessoa muda (no perfil); E-mail só leitura; Telefone, Identificador, Link e WhatsApp ficam "Em breve" (o original não guarda); **Setores** grava (`PUT /api/v1/usuarios-da-casca/[user_id]/setores`). A lixeira do cabeçalho leva ao `revoke` do original (`/app/team`) | E4; nada novo sem pedido |
| N13 | **Contas e dispositivos do usuário** = os responsáveis por canal do original, um toggle por dispositivo (liga = entra na lista do canal); admin aparece ligado e apagado com "Usuário administrador" | E4; c95 |
| N14 | **Respostas rápidas:** `message_templates` + `crm_respostas_rapidas_extras (template_id, canais, todos_os_setores)` + `crm_respostas_rapidas_setores`. Uma mensagem por resposta (o "+ Adicionar" de várias fica "Em breve"); na barra da caixa, emoji e variáveis (`{{nome}}`) funcionam, GIF/anexo/câmera/áudio ficam "Em breve". Compartilhar sem ser gerente: a rota grava pelo service role **depois** de `fn_crm_pode('CHAT_SHARE_QUICK_RESPONSE')`; editar/excluir as dos outros: idem com "Editar ou excluir respostas rápidas". O painel do compositor (3B) passa a ler `GET /api/v1/respostas-rapidas/da-conversa?conversation_id=` (só as do canal e do setor efetivo da conversa, mais "todos os setores"; com "Consultar respostas rápidas de outros setores" o filtro de setor do painel liga) | E6; C6 |
| N15 | **O hub:** Dispositivo → `/app/inbox/configuracoes/canais`; Setores; Mensagens agendadas (3B); Respostas rápidas; Usuários e Permissões (só admin; os outros veem o cartão apagado com "Só administradores"); Notificações = o toggle liga/desliga as notificações de "Nova mensagem" do original (`gravarCanal("message", "in_app"/"push", …)` de `lib/notifications/prefs`), e o cartão leva a `/app/settings/notifications`; Modelos de mensagem, WhatsApp Flows e Análise de templates "Em breve" (decisão 9). O ⚙ do `TopoDasConversas` (3A) passa a ser um link para o hub | E5 |
| N16 | **Setor na fila e na conversa:** `GET /api/v1/setores/das-conversas?ids=` (até 60) devolve `{ [conversation_id]: { setor: {id,nome,cor} | null, em_transferencia } }`, chamado uma vez por página (`useSetoresDasConversas`), como a contagem das agendadas; o toggle "Setor" de "Personalizar visualização" (3A, hoje "Em breve") liga | A8, E3 |
| N17 | **Quem mexe em quê:** Setores = "Editar ou excluir setores" (padrão admin, piso gerente); setor do dispositivo = admin (como as rotas de dispositivo do original); Usuários e Permissões = admin; Respostas rápidas = cada um as suas, as compartilhadas pelas duas chaves; "Alterar setor" na conversa = agente+ que vê a conversa | seção 5 do PRD |
| N18 | **Ícones novos** em `lib/ui/icons-da-casca.ts`: a lista da Task 8 (Step 3) mais `PlusCircle` e `ArrowRightLeft` (só os que faltam); cores da paleta do setor em `lib/escale/conversas/setores.ts` (são **dado**, como as cores das etiquetas do original, aplicadas por `style`; a cerca `tailwind-tokens` não vê `style`) | cerca `tailwind-tokens` |
| G1 | **Verificação enxuta**: por task só o que a task cria; `test:db`, rodada cheia, revisor e conferência no fim da Frente C | regra de 18/10 |

## Global Constraints

### Repositório, worktree e Git

- Worktree: `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-c`. **Base:** `escale-crm/main` com a 3A e a 3B mergeadas (a Task 1 prova: `components/escale/conversas/centro/compositor/CompositorDaCasca.tsx` existe; `9202` está na `main`).
- **Branch:** `feat/fase-3c-setores-e-configuracoes` (`git switch -c feat/fase-3c-setores-e-configuracoes escale-crm/main`).
- **Migration:** `supabase/migrations/20261104120000_9203_setores_permissoes_respostas.sql`. Antes: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; `9203` em outra branch → PARE.
- **PR** para `rgisjr/escale-crm`, base `main`, mergeado ao terminar; tag/release/VPS só no fim da Frente C. **Proibido:** push em `origin`, tag, release, VPS, banco de produção.
- Conflitos com as outras frentes: `dicionario.ts`, `baseline.sql`, `actions.ts`, `rls-completude-varredura.test.ts`, `icons-da-casca.ts`: manter os dois blocos.

### Ambiente

- Git Bash, `corepack pnpm`, `NODE_OPTIONS=--max-old-space-size=6144`. `test:db` não roda nesta fase.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 3C`.

| Arquivo | Mudança |
|---|---|
| `supabase/baseline.sql` | o bloco da 9203, logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (depois do bloco da 9202) |
| `lib/i18n/dicionario.ts` | bloco `// ─── FORK ESCALE · Fase 3C: setores, permissões e configurações ───` logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` (depois do bloco da 3B) |
| `lib/audit/actions.ts` | depois do bloco da 3B: `"crm_setor.created", "crm_setor.updated", "crm_setor.deleted", "crm_setor.device_set", "conversation.sector_transfer", "conversation.sector_transfer_canceled", "conversation.released_by_other", "crm_permissoes.updated", "crm_permissoes.reset", "quick_reply.created", "quick_reply.updated", "quick_reply.deleted",` |
| `tests/invariants/rls-completude-varredura.test.ts` | sete entradas em `PROVA_PROPRIA` depois das da 9202 |
| `lib/ui/icons-da-casca.ts` | os ícones da N18 que faltam |

Do fork que mudam: `components/escale/conversas/ConversasDaCasca.tsx` (a prop `configuracao`), `components/escale/conversas/TopoDasConversas.tsx` (o ⚙ vira link), `components/escale/conversas/fila/LinhaDaFila.tsx` e `ListaDaFila.tsx` (o chip do setor), `components/escale/conversas/fila/PainelPersonalizarVisualizacao.tsx` ("Setor" liga), `components/escale/conversas/centro/CabecalhoDaConversa.tsx` (o selo e "Alterar setor"), `components/escale/conversas/centro/SeletorDeAtendente.tsx` (liberar de outra pessoa), `components/escale/conversas/centro/ConversaAberta.tsx` (a faixa "Em transferência"), `components/escale/conversas/centro/compositor/PainelRespostasRapidas.tsx` (a rota da conversa, o filtro de setor, o ⚙), `app/app/inbox/configuracoes/mensagens-agendadas/page.tsx` e `components/escale/conversas/agendadas/TelaMensagensAgendadas.tsx` (dentro da casca).

### Cercas que precisam ficar verdes

As da 3A e da 3B mais: `rls-completude-varredura` (as sete tabelas), `definer-membership-varredura` (as funções com org no argumento conferem pertencimento por `fn_user_role_in_org`/`fn_role_at_least`), `hardening-definer-varredura` e `gov-hardening-anon-definer` (`revoke ... from public, anon`; as internas também de `authenticated`), `definer-nova-nasce-exposta`, `tabelas-do-motor-nao-se-leem-pelo-login`, `i18n-espanhol-cobre-a-tela`, `controle-decorativo`, `tailwind-tokens`, `evidencia-citada`, `manifest-x-migrations`, `escale-casca-v2-original-intacto`.

### Verificação (G1)

Por task: os testes da task + typecheck + eslint dos arquivos alterados; `test:db`, rodada cheia, revisor (Opus 5.5, high) e conferência visual no fim da Frente C.

### Commits e PR

Como na 3A. Copiar este plano para `docs/superpowers/plans/` na Task 1.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/escale/conversas/setores.ts` | novo | paleta de 24 cores, monograma, schema do setor, ordenação |
| `lib/escale/conversas/permissoes.ts` | novo | as 19 chaves (nome, descrição, papel padrão, modo, piso), as seções do menu, os grupos, o valor de cada toggle |
| `lib/escale/conversas/hub.ts` | novo | os 9 cartões do hub (título, descrição, ícone, destino, estado) |
| `lib/escale/conversas/respostas.ts` | novo | canais, schema, a escolha das respostas da conversa |
| `lib/escale/conversas/canais.ts` | novo | os canais da Configuração de canais, o status do dispositivo, quem está no dispositivo |
| `lib/escale/conversas/setores-banco.ts` | novo | leituras e escritas de setores (rotas) |
| `supabase/migrations/20261104120000_9203_setores_permissoes_respostas.sql`, `supabase/baseline.sql` | novo / bloco | as sete tabelas, as funções, a policy, o gatilho |
| `tests/invariants/escale-setores-9203.test.ts` | novo | a prova de RLS e da leitura pelo setor |
| `app/api/v1/setores/route.ts`, `[id]/route.ts`, `das-conversas/route.ts`, `do-dispositivo/route.ts` | novos | setores |
| `app/api/v1/conversas-da-casca/[id]/setor/route.ts`, `[id]/liberar/route.ts` | novos | alterar setor / cancelar transferência, liberar de outra pessoa |
| `app/api/v1/permissoes-de-atendimento/route.ts`, `minhas/route.ts` | novos | as permissões de uma pessoa (admin) e as minhas |
| `app/api/v1/usuarios-da-casca/route.ts`, `[user_id]/setores/route.ts` | novos | setores e grupo de cada pessoa; gravar os setores de uma pessoa |
| `app/api/v1/respostas-rapidas/route.ts`, `[id]/route.ts`, `da-conversa/route.ts` | novos | respostas rápidas |
| `hooks/escale/useSetores.ts`, `usePermissoesDeAtendimento.ts`, `useUsuariosDaCasca.ts`, `useRespostasRapidas.ts`, `useDispositivosDaCasca.ts` | novos | os hooks |
| `components/escale/conversas/configuracoes/*` | novos | o hub, a cabeça das telas, Setores, Canais, Usuários, Respostas rápidas |
| `app/app/inbox/configuracoes/page.tsx`, `setores/page.tsx`, `canais/page.tsx`, `canais/[canal]/page.tsx`, `usuarios/page.tsx`, `respostas-rapidas/page.tsx`, `_casca.tsx` | novos | as páginas |
| os arquivos da casca listados acima | alterados | os encaixes da 3A e da 3B |

---

### Task 1: Branch, base e as regras puras (setores, permissões, hub, respostas, canais)

**Files:**
- Create: `lib/escale/conversas/setores.ts`, `lib/escale/conversas/permissoes.ts`, `lib/escale/conversas/hub.ts`, `lib/escale/conversas/respostas.ts`, `lib/escale/conversas/canais.ts`, `tests/unit/escale-setores-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/2026-10-18-fase-3c-setores-e-configuracoes.md`

**Interfaces (Produces):**
- `setores.ts`: `CORES_DO_SETOR: readonly string[]` (24), `COR_PADRAO_DO_SETOR`, `monograma(nome)`, `setorSchema` (`{ nome, cor, membros: uuid[] }`), `type NovoSetor`, `interface SetorLido { id; nome; cor; membros: string[]; dispositivos: number; ids_dos_dispositivos: string[] }`, `ordenarSetores(lista)`, `filtrarSetores(lista, busca)`.
- `permissoes.ts`: `type Papel`, `type ChaveDePermissao`, `PERMISSOES_DE_CONVERSAS` (19, na ordem da Clint), `CHAVES_EDITAVEIS`, `papelAlcanca(papel, minimo)`, `estadoDoToggle(perm, ctx)` → `{ ligado, travado, dica }`, `excecaoAoMudar(perm, papel, ligado)` → `boolean | null`, `desativarTodos(papel)` → `Record<ChaveDePermissao, boolean>`, `grupoDoUsuario(papel, excecoes)`, `GRUPOS_DE_PERMISSAO`, `SECOES_DE_PERMISSAO`, `type Excecoes = Partial<Record<ChaveDePermissao, boolean>>`.
- `hub.ts`: `CARTOES_DO_HUB` (9), `type CartaoDoHub`.
- `respostas.ts`: `CANAIS_DA_RESPOSTA`, `type CanalDaResposta`, `respostaSchema`, `type NovaResposta`, `interface RespostaLida`, `canalDaConversa(canal)`, `respostaServe(resposta, ctx)`, `comBarra(atalho)`, `FILTRO_PESSOAIS`, `FILTRO_TODOS`.
- `canais.ts`: `SLUG_DO_CANAL`, `canalDoSlug(slug)`, `CARTOES_DE_CANAL`, `statusDoDispositivo(status)`, `type CanalDoRoteamento`, `quemEstaNoDispositivo(canal, elegiveis)`, `ligarNoDispositivo(canal, elegiveis, userId, ligado)`, `ativarTodosNoDispositivo(elegiveis)`, `dispositivosDoUsuario(userId, papel, canais)`.

- [ ] **Step 1: A worktree já existe (3A); criar a branch e conferir a base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-c"
export PATH="/c/Program Files/nodejs:$PATH"
git fetch escale-crm
git switch -c feat/fase-3c-setores-e-configuracoes escale-crm/main
test -f components/escale/conversas/centro/compositor/CompositorDaCasca.tsx && ls supabase/migrations | grep -c "_9202_"
```

Expected: `1`. Se der `0` ou erro, a 3B não está na `main`: PARE.

```bash
mkdir -p docs/superpowers/plans
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-18-fase-3c-setores-e-configuracoes.md" docs/superpowers/plans/
```

- [ ] **Step 2: O teste das regras (vai falhar)**

Create `tests/unit/escale-setores-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  ativarTodosNoDispositivo,
  canalDoSlug,
  dispositivosDoUsuario,
  ligarNoDispositivo,
  quemEstaNoDispositivo,
  statusDoDispositivo,
} from "@/lib/escale/conversas/canais";
import { CARTOES_DO_HUB } from "@/lib/escale/conversas/hub";
import {
  CHAVES_EDITAVEIS,
  PERMISSOES_DE_CONVERSAS,
  desativarTodos,
  estadoDoToggle,
  excecaoAoMudar,
  grupoDoUsuario,
  papelAlcanca,
} from "@/lib/escale/conversas/permissoes";
import { canalDaConversa, comBarra, respostaSchema, respostaServe } from "@/lib/escale/conversas/respostas";
import { CORES_DO_SETOR, filtrarSetores, monograma, ordenarSetores, setorSchema } from "@/lib/escale/conversas/setores";

const t = (s: string) => s;
const perm = (chave: string) => PERMISSOES_DE_CONVERSAS.find((p) => p.chave === chave)!;
const U = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

describe("setores", () => {
  it("monograma de uma e de duas palavras, paleta de 24, schema e busca", () => {
    expect(monograma("Atendimento")).toBe("AT");
    expect(monograma("Suporte SAO")).toBe("SS");
    expect(monograma("  admin ")).toBe("AD");
    expect(monograma("x")).toBe("X");
    expect(CORES_DO_SETOR).toHaveLength(24);
    expect(new Set(CORES_DO_SETOR).size).toBe(24);
    expect(setorSchema.safeParse({ nome: " Vendas ", cor: "#1C3FD8", membros: [U(1)] }).success).toBe(true);
    expect(setorSchema.safeParse({ nome: "", cor: "#1C3FD8", membros: [] }).success).toBe(false);
    expect(setorSchema.safeParse({ nome: "Vendas", cor: "azul", membros: [] }).success).toBe(false);
    const lista = [
      { id: "b", nome: "Suporte", cor: "#000000", membros: [], dispositivos: 0, ids_dos_dispositivos: [] },
      { id: "a", nome: "atendimento", cor: "#000000", membros: [], dispositivos: 1, ids_dos_dispositivos: [] },
    ];
    expect(ordenarSetores(lista).map((s) => s.id)).toEqual(["a", "b"]);
    expect(filtrarSetores(lista, "SUP").map((s) => s.id)).toEqual(["b"]);
  });
});

describe("permissões (as 19 da Clint)", () => {
  it("tem as 19 chaves na ordem dos prints e as editáveis da N4", () => {
    expect(PERMISSOES_DE_CONVERSAS).toHaveLength(19);
    expect(PERMISSOES_DE_CONVERSAS[0].rotulo).toBe("Visualizar todos os dispositivos");
    expect(PERMISSOES_DE_CONVERSAS[18].rotulo).toBe("Consultar respostas rápidas de outros setores");
    expect([...CHAVES_EDITAVEIS].sort()).toEqual(
      [
        "CHAT_BULK_ACTIONS",
        "CHAT_CHANGE_ATTENDANT_ALL",
        "CHAT_CHANGE_ATTENDANT_TEAM",
        "CHAT_EDIT_QUICK_RESPONSE",
        "CHAT_EDIT_TEAMS",
        "CHAT_SHARE_QUICK_RESPONSE",
        "CHAT_VIEW_CHANNEL_ACCOUNT",
        "CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS",
        "CHAT_VIEW_TEAM",
      ].sort(),
    );
  });
  it("papel alcança, padrão, exceção, travas e dicas", () => {
    expect(papelAlcanca("manager", "agent")).toBe(true);
    expect(papelAlcanca("agent", "manager")).toBe(false);
    const base = { papel: "agent" as const, visibilidade: "own_and_unassigned" as const, excecoes: {} };
    expect(estadoDoToggle(perm("CHAT_VIEW_TEAM"), base)).toEqual({ ligado: true, travado: false, dica: null });
    expect(estadoDoToggle(perm("CHAT_VIEW_TEAM"), { ...base, excecoes: { CHAT_VIEW_TEAM: false } }).ligado).toBe(false);
    expect(estadoDoToggle(perm("CHAT_BULK_ACTIONS"), base)).toEqual({ ligado: false, travado: false, dica: null });
    expect(estadoDoToggle(perm("CHAT_EDIT_TEAMS"), base)).toEqual({ ligado: false, travado: true, dica: "Disponível a partir de Gerente" });
    expect(estadoDoToggle(perm("CHAT_VIEW_ALL"), base)).toEqual({ ligado: false, travado: true, dica: "Definido pelo papel do usuário" });
    expect(estadoDoToggle(perm("CHAT_VIEW_ALL"), { ...base, visibilidade: "all" }).ligado).toBe(true);
    expect(estadoDoToggle(perm("CHAT_VIEW_UNASSIGNED"), { ...base, visibilidade: "own" })).toEqual({ ligado: false, travado: true, dica: "Definido pelo modo de visibilidade da organização" });
    expect(estadoDoToggle(perm("CHAT_SEND_MESSAGE_TEAM"), { ...base, excecoes: { CHAT_VIEW_TEAM: false } })).toEqual({ ligado: false, travado: true, dica: "Segue a visualização do atendimento do setor" });
    expect(estadoDoToggle(perm("CHAT_CONFIG_MESSAGE_TEMPLATES"), base).dica).toBe("Em breve");
    const admin = estadoDoToggle(perm("CHAT_BULK_ACTIONS"), { ...base, papel: "admin" });
    expect(admin).toEqual({ ligado: true, travado: true, dica: "Usuário administrador" });
  });
  it("exceção some quando volta ao padrão; desativar todos; grupo", () => {
    expect(excecaoAoMudar(perm("CHAT_VIEW_TEAM"), "agent", false)).toBe(false);
    expect(excecaoAoMudar(perm("CHAT_VIEW_TEAM"), "agent", true)).toBeNull();
    expect(desativarTodos("agent")).toEqual({
      CHAT_VIEW_CHANNEL_ACCOUNT: false,
      CHAT_VIEW_TEAM: false,
      CHAT_CHANGE_ATTENDANT_TEAM: false,
      CHAT_CHANGE_ATTENDANT_ALL: false,
      CHAT_BULK_ACTIONS: false,
      CHAT_EDIT_QUICK_RESPONSE: false,
      CHAT_SHARE_QUICK_RESPONSE: false,
      CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS: false,
    });
    expect(grupoDoUsuario("manager", {})).toBe("manager");
    expect(grupoDoUsuario("manager", { CHAT_BULK_ACTIONS: false })).toBe("personalizado");
  });
});

describe("hub", () => {
  it("tem os 9 cartões na ordem da Clint, 3 em breve", () => {
    expect(CARTOES_DO_HUB.map((c) => c.titulo)).toEqual([
      "Dispositivo",
      "Setores",
      "Mensagens agendadas",
      "Respostas rápidas",
      "Usuários e Permissões",
      "Notificações",
      "Modelos de mensagem",
      "WhatsApp Flows",
      "Análise de templates",
    ]);
    expect(CARTOES_DO_HUB.filter((c) => c.emBreve)).toHaveLength(3);
  });
});

describe("respostas rápidas", () => {
  it("schema, canal da conversa e a escolha por canal e setor", () => {
    const ok = { atalho: "boas vindas", corpo: "Olá {{nome}}", canais: ["whatsapp"], compartilhar: true, todos_os_setores: true, setores: [] };
    expect(respostaSchema.safeParse(ok).success).toBe(true);
    expect(respostaSchema.safeParse({ ...ok, canais: [] }).success).toBe(false);
    expect(respostaSchema.safeParse({ ...ok, todos_os_setores: false, setores: [] }).success).toBe(false);
    expect(comBarra("oi")).toBe("/oi");
    expect(canalDaConversa({ provider: "zernio_social", social_platform: "instagram" })).toBe("instagram");
    expect(canalDaConversa({ provider: "waha", social_platform: null })).toBe("whatsapp");
    const r = { id: "r1", atalho: "oi", corpo: "Oi", canais: ["whatsapp" as const], compartilhada: true, todos_os_setores: false, setores: ["s1"], dono: null, criada_por: null, atualizada_em: "" };
    expect(respostaServe(r, { canal: "whatsapp", setorDaConversa: "s1", setorEscolhido: null })).toBe(true);
    expect(respostaServe(r, { canal: "instagram", setorDaConversa: "s1", setorEscolhido: null })).toBe(false);
    expect(respostaServe(r, { canal: "whatsapp", setorDaConversa: "s2", setorEscolhido: null })).toBe(false);
    expect(respostaServe(r, { canal: "whatsapp", setorDaConversa: "s2", setorEscolhido: "s1" })).toBe(true);
    expect(respostaServe({ ...r, todos_os_setores: true }, { canal: "whatsapp", setorDaConversa: null, setorEscolhido: null })).toBe(true);
  });
});

describe("canais e quem está no dispositivo", () => {
  const elegiveis = [U(1), U(2), U(3)];
  it("slug, status, legado = todos, ligar/desligar e ativar todos", () => {
    expect(canalDoSlug("whatsapp-oficial")).toBe("whatsapp_oficial");
    expect(canalDoSlug("x")).toBeNull();
    expect(statusDoDispositivo("WORKING")).toBe("conectado");
    expect(statusDoDispositivo("STOPPED")).toBe("desconectado");
    const legado = { id: "c1", user_ids: [], mode: "legacy_unconfigured" as const };
    const restrito = { id: "c2", user_ids: [U(1)], mode: "restricted" as const };
    expect(quemEstaNoDispositivo(legado, elegiveis)).toEqual(elegiveis);
    expect(quemEstaNoDispositivo(restrito, elegiveis)).toEqual([U(1)]);
    expect(ligarNoDispositivo(legado, elegiveis, U(2), false)).toEqual([U(1), U(3)]);
    expect(ligarNoDispositivo(restrito, elegiveis, U(3), true)).toEqual([U(1), U(3)]);
    expect(ativarTodosNoDispositivo(elegiveis)).toEqual(elegiveis);
    expect(dispositivosDoUsuario(U(3), "agent", [legado, restrito], elegiveis)).toEqual(["c1"]);
    expect(dispositivosDoUsuario(U(3), "admin", [legado, restrito], elegiveis)).toEqual(["c1", "c2"]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-setores-regras.test.ts`
Expected: FAIL (`Cannot find module '@/lib/escale/conversas/canais'`).

- [ ] **Step 4: `setores.ts` e `hub.ts`**

Create `lib/escale/conversas/setores.ts`:

```ts
import { z } from "zod";

/**
 * OS SETORES (fork Escale, Fase 3C; E1, decisão 1 da seção 9). A paleta é a
 * da janela "Crie um setor" (c42): 24 cores em duas linhas. As cores são DADO
 * do setor (como as cores das etiquetas do original), aplicadas por `style`.
 */
export const CORES_DO_SETOR = [
  "#2F2C5D", "#8B3DFF", "#B4A5F5", "#D96BE8", "#1C3FD8", "#7EA6F6", "#3CC38A", "#6DE8C4",
  "#A8765A", "#F0384B", "#F59AA0", "#F5A04A", "#FAD9B5", "#F7DB5A", "#B7E36A", "#8F8F8F",
  "#C9C9C9", "#E5E5E5", "#2D6E6E", "#57C5CF", "#D6E2FF", "#EEF2FF", "#0EA5C6", "#597EFF",
] as const;
export const COR_PADRAO_DO_SETOR = "#597EFF";

/** "Atendimento" → "AT"; "Suporte SAO" → "SS"; o selo da linha (c87) e da lista (c38). */
export function monograma(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return "";
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return `${palavras[0][0]}${palavras[1][0]}`.toUpperCase();
}

export const setorSchema = z.object({
  nome: z.string().trim().min(1).max(60),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  membros: z.array(z.string().uuid()).max(500),
});
export type NovoSetor = z.infer<typeof setorSchema>;

export interface SetorLido {
  id: string;
  nome: string;
  cor: string;
  membros: string[];
  dispositivos: number;
  ids_dos_dispositivos: string[];
}

export const ordenarSetores = <S extends { nome: string }>(lista: readonly S[]): S[] =>
  [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));

export function filtrarSetores<S extends { nome: string }>(lista: readonly S[], busca: string): S[] {
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  return termo ? lista.filter((s) => s.nome.toLocaleLowerCase("pt-BR").includes(termo)) : [...lista];
}
```

Create `lib/escale/conversas/hub.ts`:

```ts
/**
 * O HUB ⚙ "CONVERSAS › CONFIGURAÇÕES" (fork Escale, Fase 3C; E5; c37). A ordem,
 * os títulos e as descrições são os da Clint (`component.ConfigurationsOptions.*`).
 * Modelos, Flows e Análise de templates dependem da Meta (decisão 9): "Em breve".
 */
export type IconeDoHub = "dispositivo" | "setores" | "agendadas" | "respostas" | "usuarios" | "notificacoes" | "modelos" | "flows" | "analise";

export interface CartaoDoHub {
  chave: IconeDoHub;
  titulo: string;
  descricao: string;
  destino: string | null;
  emBreve: boolean;
  soAdmin: boolean;
}

export const CARTOES_DO_HUB: readonly CartaoDoHub[] = [
  { chave: "dispositivo", titulo: "Dispositivo", descricao: "Configure seus dispositivos, atendentes, canais e mais.", destino: "/app/inbox/configuracoes/canais", emBreve: false, soAdmin: false },
  { chave: "setores", titulo: "Setores", descricao: "Gerencie os setores de atendimentos do seu time.", destino: "/app/inbox/configuracoes/setores", emBreve: false, soAdmin: false },
  { chave: "agendadas", titulo: "Mensagens agendadas", descricao: "Agende uma nova mensagem ou veja quais estão programadas para envio.", destino: "/app/inbox/configuracoes/mensagens-agendadas", emBreve: false, soAdmin: false },
  { chave: "respostas", titulo: "Respostas rápidas", descricao: "Ajuste as respostas mais usadas pelo seu time.", destino: "/app/inbox/configuracoes/respostas-rapidas", emBreve: false, soAdmin: false },
  { chave: "usuarios", titulo: "Usuários e Permissões", descricao: "Habilite permissões que cada usuário pode fazer no módulo de conversas.", destino: "/app/inbox/configuracoes/usuarios", emBreve: false, soAdmin: true },
  { chave: "notificacoes", titulo: "Notificações", descricao: "Fique por dentro de todas as notificações de atendimento que você tem acesso.", destino: "/app/settings/notifications", emBreve: false, soAdmin: false },
  { chave: "modelos", titulo: "Modelos de mensagem", descricao: "Gerencie seus modelos de mensagem de WhatsApp.", destino: null, emBreve: true, soAdmin: false },
  { chave: "flows", titulo: "WhatsApp Flows", descricao: "Crie formulários com várias telas e dados do contato já preenchidos.", destino: null, emBreve: true, soAdmin: false },
  { chave: "analise", titulo: "Análise de templates", descricao: "Acompanhe entregas, falhas e a saúde dos seus modelos de mensagem.", destino: null, emBreve: true, soAdmin: false },
];
```

- [ ] **Step 5: `permissoes.ts`**

Create `lib/escale/conversas/permissoes.ts`:

```ts
/**
 * AS 19 PERMISSÕES DE CONVERSAS DA CLINT (fork Escale, Fase 3C; E4; seção 5 do
 * PRD; prints c92 e c93). Nome = `label.tChat*` da Clint; descrição = a dos
 * prints. O papel padrão é o da seção 5. O MODO diz quem decide:
 *
 *   - `editavel`: o fork aplica no servidor (`fn_crm_pode`); cada pessoa pode ter
 *     exceção em `crm_permissoes_de_atendimento`, a partir do `piso`;
 *   - `papel`: o motor do original decide pelo papel (e pelo `visibility_mode`);
 *     o toggle mostra o valor real e fica travado;
 *   - `segue`: acompanha outra chave (enviar segue ver, no original);
 *   - `em_breve`: depende de recurso que ainda não existe.
 *
 * ⚠️ O papel padrão de cada chave editável tem espelho em SQL
 * (`fn_crm_papel_padrao`, migration 9203). O teste da Task 2 compara os dois.
 */
export type Papel = "viewer" | "agent" | "manager" | "admin";
export type ModoDaPermissao = "editavel" | "papel" | "segue" | "em_breve";
export type VisibilidadeDaOrganizacao = "all" | "own_and_unassigned" | "own";

const RANK: Readonly<Record<Papel, number>> = { viewer: 1, agent: 2, manager: 3, admin: 4 };
const ROTULO_DO_PAPEL: Readonly<Record<Papel, string>> = { viewer: "Leitor", agent: "Atendente", manager: "Gerente", admin: "Administrador" };

export const papelAlcanca = (papel: Papel, minimo: Papel): boolean => RANK[papel] >= RANK[minimo];

export const PERMISSOES_DE_CONVERSAS = [
  { chave: "CHAT_VIEW_CHANNEL_ACCOUNT", rotulo: "Visualizar todos os dispositivos", descricao: "Permite visualizar todos os dispositivos nas Configurações de canais na tela de atendimento.", papelPadrao: "admin", modo: "editavel", piso: "agent" },
  { chave: "CHAT_ADD_CHANNEL_ACCOUNT", rotulo: "Adicionar um novo dispositivo", descricao: "Permite adicionar um novo dispositivo a conta", papelPadrao: "admin", modo: "papel" },
  { chave: "CHAT_DELETE_CHANNEL_ACCOUNT", rotulo: "Remover contas/dispositivos", descricao: "Permite remover uma conta ou dispositivo nas Configurações de canais", papelPadrao: "admin", modo: "papel" },
  { chave: "CHAT_CHANGE_STATUS_TEAM", rotulo: "Alterar status do atendimento do setor", descricao: "Permite alterar o status de atendimento de conversas de outros atendentes do setor", papelPadrao: "agent", modo: "papel" },
  { chave: "CHAT_CHANGE_STATUS_ALL", rotulo: "Alterar status do atendimento", descricao: "Permite alterar o status de atendimento de conversas de todos os setores", papelPadrao: "agent", modo: "papel" },
  { chave: "CHAT_DEAL_ACTIVITIES", rotulo: "Envio de mensagens nas atividades", descricao: "Permite enviar mensagens nas atividades através de um dispositivo cadastrado.", papelPadrao: "agent", modo: "papel" },
  { chave: "CHAT_VIEW_TEAM", rotulo: "Visualização de atendimento do setor", descricao: "Permite visualizar todos os atendimentos do setor.", papelPadrao: "agent", modo: "editavel", piso: "agent" },
  { chave: "CHAT_VIEW_UNASSIGNED", rotulo: "Visualizar conversas sem atendente", descricao: "Permite visualizar conversas sem atendente (não atribuídos) de acordo com as permissões de dispositivo.", papelPadrao: "agent", modo: "papel" },
  { chave: "CHAT_VIEW_ALL", rotulo: "Visualização de atendimento", descricao: "Permite a visualização de todos os atendimentos em dispositivos com permissão.", papelPadrao: "manager", modo: "papel" },
  { chave: "CHAT_SEND_MESSAGE_TEAM", rotulo: "Enviar mensagem no atendimento do setor", descricao: "Permissão para enviar mensagem para qualquer atendimento no setor.", papelPadrao: "agent", modo: "segue", segue: "CHAT_VIEW_TEAM" },
  { chave: "CHAT_CHANGE_ATTENDANT_TEAM", rotulo: "Alterar atendentes do setor", descricao: "Permite alterar o atendente de qualquer atendimento do setor.", papelPadrao: "manager", modo: "editavel", piso: "agent" },
  { chave: "CHAT_CHANGE_ATTENDANT_ALL", rotulo: "Alterar atendentes", descricao: "Permite alterar o atendente de qualquer atendimento.", papelPadrao: "manager", modo: "editavel", piso: "agent" },
  { chave: "CHAT_SEND_MESSAGE_ALL", rotulo: "Enviar mensagem no atendimento", descricao: "Permissão para enviar mensagem para qualquer atendimento.", papelPadrao: "manager", modo: "segue", segue: "CHAT_VIEW_ALL" },
  { chave: "CHAT_BULK_ACTIONS", rotulo: "Ações em massa", descricao: "Permite realizar ações em massa no chat. Exemplo: Alterar status, atendente, setor...", papelPadrao: "manager", modo: "editavel", piso: "agent" },
  { chave: "CHAT_EDIT_QUICK_RESPONSE", rotulo: "Editar ou excluir respostas rápidas", descricao: "Permite editar ou excluir respostas rápidas de outros usuários.", papelPadrao: "manager", modo: "editavel", piso: "agent" },
  { chave: "CHAT_SHARE_QUICK_RESPONSE", rotulo: "Compartilhar respostas rápidas", descricao: "Permite compartilhar respostas rápidas com outros usuários.", papelPadrao: "agent", modo: "editavel", piso: "agent" },
  { chave: "CHAT_EDIT_TEAMS", rotulo: "Editar ou excluir setores", descricao: "Permite editar ou excluir setores de outros usuários.", papelPadrao: "admin", modo: "editavel", piso: "manager" },
  { chave: "CHAT_CONFIG_MESSAGE_TEMPLATES", rotulo: "Configurar modelos de mensagem", descricao: "Permite acessar e configurar os modelos de mensagem de WhatsApp Oficial.", papelPadrao: "admin", modo: "em_breve" },
  { chave: "CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS", rotulo: "Consultar respostas rápidas de outros setores", descricao: "Permite, no chat, filtrar respostas rápidas por setores diferentes dos seus.", papelPadrao: "agent", modo: "editavel", piso: "agent" },
] as const satisfies ReadonlyArray<{
  chave: string;
  rotulo: string;
  descricao: string;
  papelPadrao: Papel;
  modo: ModoDaPermissao;
  piso?: Papel;
  segue?: string;
}>;

export type PermissaoDeConversas = (typeof PERMISSOES_DE_CONVERSAS)[number];
export type ChaveDePermissao = PermissaoDeConversas["chave"];
export type Excecoes = Partial<Record<ChaveDePermissao, boolean>>;

export const CHAVES_EDITAVEIS: ReadonlySet<ChaveDePermissao> = new Set(
  PERMISSOES_DE_CONVERSAS.filter((p) => p.modo === "editavel").map((p) => p.chave),
);

export const permissaoPorChave = (chave: ChaveDePermissao): PermissaoDeConversas =>
  PERMISSOES_DE_CONVERSAS.find((p) => p.chave === chave)!;

export interface ContextoDaPessoa {
  papel: Papel;
  visibilidade: VisibilidadeDaOrganizacao;
  excecoes: Excecoes;
}
export interface EstadoDoToggle {
  ligado: boolean;
  travado: boolean;
  dica: string | null;
}

/** O que o motor do ORIGINAL faz por papel (as chaves `papel`). Espelha `fn_can_view_conversation`. */
function valorDoOriginal(chave: ChaveDePermissao, ctx: ContextoDaPessoa): boolean {
  if (chave === "CHAT_VIEW_ALL") return ctx.papel !== "agent" || ctx.visibilidade === "all";
  if (chave === "CHAT_VIEW_UNASSIGNED") return ctx.papel !== "agent" || ctx.visibilidade !== "own";
  return papelAlcanca(ctx.papel, permissaoPorChave(chave).papelPadrao);
}

function valorEditavel(p: PermissaoDeConversas, ctx: ContextoDaPessoa): boolean {
  const excecao = ctx.excecoes[p.chave];
  return excecao ?? papelAlcanca(ctx.papel, p.papelPadrao);
}

export function estadoDoToggle(p: PermissaoDeConversas, ctx: ContextoDaPessoa): EstadoDoToggle {
  if (ctx.papel === "admin") return { ligado: true, travado: true, dica: "Usuário administrador" };
  switch (p.modo) {
    case "editavel": {
      const piso = "piso" in p ? p.piso : p.papelPadrao;
      if (!papelAlcanca(ctx.papel, piso)) {
        return { ligado: false, travado: true, dica: `Disponível a partir de ${ROTULO_DO_PAPEL[piso]}` };
      }
      return { ligado: valorEditavel(p, ctx), travado: false, dica: null };
    }
    case "segue": {
      const seguida = permissaoPorChave(p.segue);
      const ligado = seguida.modo === "editavel" ? valorEditavel(seguida, ctx) : valorDoOriginal(seguida.chave, ctx);
      const dica = p.segue === "CHAT_VIEW_TEAM" ? "Segue a visualização do atendimento do setor" : "Segue a visualização de atendimento";
      return { ligado, travado: true, dica };
    }
    case "em_breve":
      return { ligado: papelAlcanca(ctx.papel, p.papelPadrao), travado: true, dica: "Em breve" };
    case "papel":
    default:
      return {
        ligado: valorDoOriginal(p.chave, ctx),
        travado: true,
        dica: p.chave === "CHAT_VIEW_UNASSIGNED" ? "Definido pelo modo de visibilidade da organização" : "Definido pelo papel do usuário",
      };
  }
}

/** A exceção a gravar quando o toggle muda: `null` quando o valor volta a ser o do papel (a linha sai). */
export function excecaoAoMudar(p: PermissaoDeConversas, papel: Papel, ligado: boolean): boolean | null {
  return ligado === papelAlcanca(papel, p.papelPadrao) ? null : ligado;
}

/** "Desativar todos" (c92): todas as editáveis que a pessoa pode ter, desligadas. */
export function desativarTodos(papel: Papel): Excecoes {
  const saida: Excecoes = {};
  for (const p of PERMISSOES_DE_CONVERSAS) {
    if (p.modo !== "editavel") continue;
    if (!papelAlcanca(papel, p.piso)) continue;
    saida[p.chave] = false;
  }
  return saida;
}

export type GrupoDePermissao = Papel | "personalizado";
export const grupoDoUsuario = (papel: Papel, excecoes: Excecoes): GrupoDePermissao =>
  Object.keys(excecoes).length > 0 ? "personalizado" : papel;

/** O "Grupo de permissão" (c94): os papéis do original e "Personalizado" (N6). */
export const GRUPOS_DE_PERMISSAO: ReadonlyArray<{ valor: GrupoDePermissao; rotulo: string }> = [
  { valor: "admin", rotulo: "Administrador" },
  { valor: "manager", rotulo: "Gerente" },
  { valor: "agent", rotulo: "Atendente" },
  { valor: "viewer", rotulo: "Leitor" },
  { valor: "personalizado", rotulo: "Personalizado" },
];
export const rotuloDoGrupo = (g: GrupoDePermissao): string => GRUPOS_DE_PERMISSAO.find((x) => x.valor === g)!.rotulo;

/** O menu à esquerda da aba Permissões (c92): só Conversas é desta fase. */
export const SECOES_DE_PERMISSAO = [
  { chave: "paginas", rotulo: "Páginas", ativa: false },
  { chave: "conversas", rotulo: "Conversas", ativa: true },
  { chave: "crm", rotulo: "CRM", ativa: false },
  { chave: "origens", rotulo: "Origens", ativa: false },
  { chave: "contatos", rotulo: "Contatos", ativa: false },
  { chave: "conta", rotulo: "Conta", ativa: false },
  { chave: "transcricao", rotulo: "Transcrição de chamada", ativa: false },
  { chave: "indicadores", rotulo: "Indicadores", ativa: false },
  { chave: "empresas", rotulo: "Empresas", ativa: false },
] as const;
```

O teste da exceção espera `"Disponível a partir de Gerente"` com `t` identidade; na tela a dica passa por `t()` em duas partes (`t("Disponível a partir de")` + rótulo do papel traduzido) — ver Task 11.

- [ ] **Step 6: `respostas.ts` e `canais.ts`**

Create `lib/escale/conversas/respostas.ts`:

```ts
import { z } from "zod";

/**
 * AS RESPOSTAS RÁPIDAS DA CASCA (fork Escale, Fase 3C; E6, C6; c41, c96).
 * Sobre os `message_templates` do original: atalho = `shortcut` (e `title`),
 * conteúdo = `body`, compartilhada = `owner_user_id` nulo. Canais e setores
 * vêm das tabelas do fork (9203).
 */
export const CANAIS_DA_RESPOSTA = ["whatsapp", "instagram"] as const;
export type CanalDaResposta = (typeof CANAIS_DA_RESPOSTA)[number];
export const FILTRO_TODOS = "todos";
export const FILTRO_PESSOAIS = "pessoais";

export const respostaSchema = z
  .object({
    atalho: z.string().trim().min(1).max(60),
    corpo: z.string().trim().min(1).max(4096),
    canais: z.array(z.enum(CANAIS_DA_RESPOSTA)).min(1),
    compartilhar: z.boolean(),
    todos_os_setores: z.boolean(),
    setores: z.array(z.string().uuid()).max(100),
  })
  .refine((r) => r.todos_os_setores || r.setores.length > 0, { path: ["setores"] });
export type NovaResposta = z.infer<typeof respostaSchema>;

export interface RespostaLida {
  id: string;
  atalho: string;
  corpo: string;
  canais: CanalDaResposta[];
  compartilhada: boolean;
  todos_os_setores: boolean;
  setores: string[];
  dono: string | null;
  criada_por: string | null;
  atualizada_em: string;
}

export const comBarra = (atalho: string): string => `/${atalho.replace(/^\/+/, "")}`;

export function canalDaConversa(canal: { provider?: string | null; social_platform?: string | null } | null): CanalDaResposta {
  return canal?.social_platform === "instagram" || canal?.provider === "zernio_social" ? "instagram" : "whatsapp";
}

/**
 * A resposta aparece no compositor? (N14) Pelo canal sempre; pelo setor: a do
 * setor escolhido no filtro (quem pode consultar outros setores) ou, sem
 * escolha, a do setor da conversa; "todos os setores" sempre.
 */
export function respostaServe(
  r: Pick<RespostaLida, "canais" | "todos_os_setores" | "setores">,
  ctx: { canal: CanalDaResposta; setorDaConversa: string | null; setorEscolhido: string | null },
): boolean {
  if (!r.canais.includes(ctx.canal)) return false;
  if (r.todos_os_setores) return true;
  const setor = ctx.setorEscolhido ?? ctx.setorDaConversa;
  return setor !== null && r.setores.includes(setor);
}
```

Create `lib/escale/conversas/canais.ts`:

```ts
import { lerEstadoDoCanal } from "@/lib/channels/estado";

import { grupoDoDispositivo, type GrupoDeDispositivo } from "./nova-conversa";
import type { Papel } from "./permissoes";

/**
 * "CONFIGURAÇÃO DE CANAIS" DA CASCA (fork Escale, Fase 3C; E2; c98, c99). Os
 * cartões por canal, o status da pílula e quem está em cada dispositivo — os
 * responsáveis por canal do original (0228): `legacy_unconfigured` quer dizer
 * "todos os atendentes".
 */
export const SLUG_DO_CANAL: Readonly<Record<GrupoDeDispositivo, string>> = {
  whatsapp: "whatsapp",
  whatsapp_oficial: "whatsapp-oficial",
  instagram: "instagram",
};

export function canalDoSlug(slug: string): GrupoDeDispositivo | null {
  const achado = (Object.entries(SLUG_DO_CANAL) as Array<[GrupoDeDispositivo, string]>).find(([, s]) => s === slug);
  return achado ? achado[0] : null;
}

export const CARTOES_DE_CANAL: ReadonlyArray<{ canal: GrupoDeDispositivo; nome: string; oficial: boolean }> = [
  { canal: "whatsapp_oficial", nome: "WhatsApp", oficial: true },
  { canal: "whatsapp", nome: "WhatsApp", oficial: false },
  { canal: "instagram", nome: "Instagram", oficial: false },
];

export { grupoDoDispositivo };

export const statusDoDispositivo = (status: string): "conectado" | "desconectado" =>
  lerEstadoDoCanal(status).utilizavel ? "conectado" : "desconectado";

export interface CanalDoRoteamento {
  id: string;
  user_ids: string[];
  mode: "legacy_unconfigured" | "restricted" | "restricted_empty";
}

export const quemEstaNoDispositivo = (canal: CanalDoRoteamento, elegiveis: readonly string[]): string[] =>
  canal.mode === "legacy_unconfigured" ? [...elegiveis] : canal.user_ids.filter((u) => elegiveis.includes(u));

/** A lista nova do canal depois de ligar/desligar uma pessoa (o PATCH do original troca a lista inteira). */
export function ligarNoDispositivo(canal: CanalDoRoteamento, elegiveis: readonly string[], userId: string, ligado: boolean): string[] {
  const atuais = quemEstaNoDispositivo(canal, elegiveis);
  const sem = atuais.filter((u) => u !== userId);
  return ligado ? elegiveis.filter((u) => u === userId || sem.includes(u)) : sem;
}

export const ativarTodosNoDispositivo = (elegiveis: readonly string[]): string[] => [...elegiveis];

/** Os dispositivos de uma pessoa (a coluna DISPOSITIVO de c40 e a aba Contas e dispositivos). Admin: todos. */
export function dispositivosDoUsuario(
  userId: string,
  papel: Papel,
  canais: readonly CanalDoRoteamento[],
  elegiveis: readonly string[],
): string[] {
  if (papel === "admin") return canais.map((c) => c.id);
  return canais.filter((c) => quemEstaNoDispositivo(c, elegiveis).includes(userId)).map((c) => c.id);
}
```

`lerEstadoDoCanal` vem de `lib/channels/estado` (o mesmo import da 3A em `nova-conversa.ts`).

- [ ] **Step 7: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-setores-regras.test.ts && corepack pnpm prettier --write lib/escale/conversas tests/unit/escale-setores-regras.test.ts && corepack pnpm eslint lib/escale/conversas tests/unit/escale-setores-regras.test.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/escale/conversas tests/unit/escale-setores-regras.test.ts docs/superpowers/plans/2026-10-18-fase-3c-setores-e-configuracoes.md
git commit -m "feat(escale): regras puras de setores, permissões, hub, respostas e canais (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Migration 9203 — setores, setor da conversa, permissões por pessoa, respostas rápidas e a leitura pelo setor

**Files:**
- Create: `supabase/migrations/20261104120000_9203_setores_permissoes_respostas.sql`, `tests/invariants/escale-setores-9203.test.ts`, `tests/unit/escale-permissoes-espelho.test.ts`
- Modify: `supabase/baseline.sql` (bloco antes do 0323), `tests/invariants/rls-completude-varredura.test.ts` (sete entradas), `lib/audit/actions.ts` (as doze ações)

**Interfaces (Produces):**
- Tabelas: `crm_setores (id, organization_id, nome, cor, criado_por, created_at, updated_at)`, `crm_setores_membros (organization_id, setor_id, user_id, created_at)`, `crm_setor_do_dispositivo (channel_session_id, organization_id, setor_id, updated_at)`, `crm_setor_da_conversa (conversation_id, organization_id, setor_id, em_transferencia, setor_anterior_id, atendente_anterior_id, transferido_por, transferido_em, updated_at)`, `crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado, atualizado_por, updated_at)`, `crm_respostas_rapidas_extras (template_id, organization_id, canais, todos_os_setores)`, `crm_respostas_rapidas_setores (template_id, setor_id, organization_id)`.
- Funções: `fn_crm_papel_padrao(text) → text` (pura), `fn_crm_pode(p_org uuid, p_chave text) → boolean` (sessão), `fn_crm_setor_efetivo(uuid, uuid) → uuid` (interna), `fn_crm_ve_pelo_setor(p_org uuid, p_conversation uuid, p_channel_session uuid) → boolean` (a policy), `fn_crm_conclui_transferencia()` (gatilho).
- Policy nova: `crm_conversations_select_setor` em `public.conversations`.

- [ ] **Step 1: A migration**

```bash
bash scripts/checar-colisao-de-migration.sh escale-crm/main
```

Create `supabase/migrations/20261104120000_9203_setores_permissoes_respostas.sql`:

```sql
-- manifest: fork Escale · Fase 3C · setores, setor da conversa, permissões de atendimento por pessoa, respostas rápidas e a leitura pelo setor
-- ---- FORK ESCALE · setores, permissões e respostas rápidas de Conversas (migration 9203) ----
--
-- PRD de Conversas, seções 5 e 7, decisão 1 da seção 9. Setor é entidade do
-- fork (nome, cor, membros, dispositivo, conversa). A leitura pelo setor é uma
-- policy PERMISSIVA a mais em conversations (soma por OU com a do original):
-- só amplia, nunca restringe. fn_can_view_conversation e visibility_mode não
-- mudam. As 19 permissões da Clint têm o papel padrão em fn_crm_papel_padrao
-- (espelho de lib/escale/conversas/permissoes.ts) e exceções por pessoa.

-- 1. O papel padrão das chaves editáveis (espelho do TS) ---------------------
create or replace function public.fn_crm_papel_padrao(p_chave text)
returns text language sql immutable set search_path = public as $$
  select case p_chave
    when 'CHAT_VIEW_CHANNEL_ACCOUNT' then 'admin'
    when 'CHAT_VIEW_TEAM' then 'agent'
    when 'CHAT_CHANGE_ATTENDANT_TEAM' then 'manager'
    when 'CHAT_CHANGE_ATTENDANT_ALL' then 'manager'
    when 'CHAT_BULK_ACTIONS' then 'manager'
    when 'CHAT_EDIT_QUICK_RESPONSE' then 'manager'
    when 'CHAT_SHARE_QUICK_RESPONSE' then 'agent'
    when 'CHAT_EDIT_TEAMS' then 'admin'
    when 'CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS' then 'agent'
    else 'admin'
  end;
$$;
revoke all on function public.fn_crm_papel_padrao(text) from public, anon;
grant execute on function public.fn_crm_papel_padrao(text) to authenticated, service_role;

-- 2. Permissões por pessoa ---------------------------------------------------
create table if not exists public.crm_permissoes_de_atendimento (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  chave text not null,
  ligado boolean not null,
  atualizado_por uuid,
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id, chave),
  constraint crm_permissoes_de_atendimento_chave_valida check (chave in (
    'CHAT_VIEW_CHANNEL_ACCOUNT', 'CHAT_VIEW_TEAM', 'CHAT_CHANGE_ATTENDANT_TEAM', 'CHAT_CHANGE_ATTENDANT_ALL',
    'CHAT_BULK_ACTIONS', 'CHAT_EDIT_QUICK_RESPONSE', 'CHAT_SHARE_QUICK_RESPONSE', 'CHAT_EDIT_TEAMS',
    'CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS')),
  constraint crm_permissoes_de_atendimento_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
alter table public.crm_permissoes_de_atendimento enable row level security;
drop policy if exists crm_permissoes_de_atendimento_select on public.crm_permissoes_de_atendimento;
drop policy if exists crm_permissoes_de_atendimento_write on public.crm_permissoes_de_atendimento;
create policy crm_permissoes_de_atendimento_select on public.crm_permissoes_de_atendimento
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'admin')))
  );
create policy crm_permissoes_de_atendimento_write on public.crm_permissoes_de_atendimento
  for all using (
    (organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin')
  ) with check (
    (organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin')
  );
revoke all on public.crm_permissoes_de_atendimento from anon;
grant select, insert, update, delete on public.crm_permissoes_de_atendimento to authenticated;
grant all on public.crm_permissoes_de_atendimento to service_role;
comment on table public.crm_permissoes_de_atendimento is
  'Exceções por pessoa às permissões de Conversas da Clint (fork Escale, migration 9203; E4). Sem linha = o papel padrão (fn_crm_papel_padrao). Só as chaves que o fork aplica no servidor. Admin grava; a pessoa lê as suas.';

-- 3. fn_crm_pode: a pessoa da sessão tem a chave nesta organização? ----------
create or replace function public.fn_crm_pode(p_org uuid, p_chave text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then false
    when public.fn_user_role_in_org(p_org) is null then false
    when public.fn_user_role_in_org(p_org) = 'admin' then true
    -- o piso de "Editar ou excluir setores" é gerente (lib/escale/conversas/permissoes.ts)
    when p_chave = 'CHAT_EDIT_TEAMS' and not public.fn_role_at_least(p_org, 'manager') then false
    else coalesce(
      (select p.ligado from public.crm_permissoes_de_atendimento p
        where p.organization_id = p_org and p.user_id = auth.uid() and p.chave = p_chave),
      public.fn_role_at_least(p_org, public.fn_crm_papel_padrao(p_chave)))
  end;
$$;
revoke all on function public.fn_crm_pode(uuid, text) from public, anon;
grant execute on function public.fn_crm_pode(uuid, text) to authenticated, service_role;

-- 4. Setores, membros e o setor do dispositivo -------------------------------
create table if not exists public.crm_setores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null,
  cor text not null default '#597EFF',
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_setores_nome_valido check (char_length(btrim(nome)) between 1 and 60),
  constraint crm_setores_cor_valida check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  constraint crm_setores_org_id_unico unique (organization_id, id)
);
create unique index if not exists crm_setores_nome_unico on public.crm_setores (organization_id, lower(btrim(nome)));

create table if not exists public.crm_setores_membros (
  organization_id uuid not null,
  setor_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (setor_id, user_id),
  constraint crm_setores_membros_setor_fk foreign key (organization_id, setor_id)
    references public.crm_setores (organization_id, id) on delete cascade,
  constraint crm_setores_membros_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
create index if not exists idx_crm_setores_membros_pessoa on public.crm_setores_membros (organization_id, user_id);

create table if not exists public.crm_setor_do_dispositivo (
  channel_session_id uuid primary key,
  organization_id uuid not null,
  setor_id uuid not null,
  updated_at timestamptz not null default now(),
  constraint crm_setor_do_dispositivo_canal_fk foreign key (organization_id, channel_session_id)
    references public.channel_sessions (organization_id, id) on delete cascade,
  constraint crm_setor_do_dispositivo_setor_fk foreign key (organization_id, setor_id)
    references public.crm_setores (organization_id, id) on delete cascade
);
create index if not exists idx_crm_setor_do_dispositivo_setor on public.crm_setor_do_dispositivo (setor_id);

alter table public.crm_setores enable row level security;
alter table public.crm_setores_membros enable row level security;
alter table public.crm_setor_do_dispositivo enable row level security;
drop policy if exists crm_setores_select on public.crm_setores;
drop policy if exists crm_setores_write on public.crm_setores;
drop policy if exists crm_setores_membros_select on public.crm_setores_membros;
drop policy if exists crm_setores_membros_write on public.crm_setores_membros;
drop policy if exists crm_setor_do_dispositivo_select on public.crm_setor_do_dispositivo;
drop policy if exists crm_setor_do_dispositivo_write on public.crm_setor_do_dispositivo;
create policy crm_setores_select on public.crm_setores
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_setores_write on public.crm_setores
  for all using ((organization_id in (select public.fn_user_org_ids())) and public.fn_crm_pode(organization_id, 'CHAT_EDIT_TEAMS'))
  with check ((organization_id in (select public.fn_user_org_ids())) and public.fn_crm_pode(organization_id, 'CHAT_EDIT_TEAMS'));
create policy crm_setores_membros_select on public.crm_setores_membros
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_setores_membros_write on public.crm_setores_membros
  for all using ((organization_id in (select public.fn_user_org_ids())) and public.fn_crm_pode(organization_id, 'CHAT_EDIT_TEAMS'))
  with check ((organization_id in (select public.fn_user_org_ids())) and public.fn_crm_pode(organization_id, 'CHAT_EDIT_TEAMS'));
create policy crm_setor_do_dispositivo_select on public.crm_setor_do_dispositivo
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_setor_do_dispositivo_write on public.crm_setor_do_dispositivo
  for all using ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin'))
  with check ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin'));
revoke all on public.crm_setores, public.crm_setores_membros, public.crm_setor_do_dispositivo from anon;
grant select, insert, update, delete on public.crm_setores, public.crm_setores_membros, public.crm_setor_do_dispositivo to authenticated;
grant all on public.crm_setores, public.crm_setores_membros, public.crm_setor_do_dispositivo to service_role;
drop trigger if exists trg_crm_setores_updated_at on public.crm_setores;
create trigger trg_crm_setores_updated_at before update on public.crm_setores
  for each row execute function public.fn_set_updated_at();
comment on table public.crm_setores is
  'Setores de atendimento (fork Escale, migration 9203; E1). Nome e cor; membros em crm_setores_membros; um setor por dispositivo em crm_setor_do_dispositivo. Escrita com "Editar ou excluir setores" (fn_crm_pode).';

-- 5. O setor da conversa e "Em transferência" --------------------------------
create table if not exists public.crm_setor_da_conversa (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setor_id uuid references public.crm_setores(id) on delete set null,
  em_transferencia boolean not null default false,
  setor_anterior_id uuid references public.crm_setores(id) on delete set null,
  atendente_anterior_id uuid,
  transferido_por uuid,
  transferido_em timestamptz,
  updated_at timestamptz not null default now(),
  constraint crm_setor_da_conversa_transferencia_tem_setor check (not em_transferencia or setor_id is not null)
);
create index if not exists idx_crm_setor_da_conversa_setor on public.crm_setor_da_conversa (organization_id, setor_id);
alter table public.crm_setor_da_conversa enable row level security;
drop policy if exists crm_setor_da_conversa_select on public.crm_setor_da_conversa;
drop policy if exists crm_setor_da_conversa_write on public.crm_setor_da_conversa;
-- Quem vê a conversa (as policies de conversations, inclusive a do setor) vê o setor dela.
create policy crm_setor_da_conversa_select on public.crm_setor_da_conversa
  for select using (
    public.fn_is_platform_admin()
    or exists (select 1 from public.conversations c
                where c.id = conversation_id and c.organization_id = crm_setor_da_conversa.organization_id)
  );
create policy crm_setor_da_conversa_write on public.crm_setor_da_conversa
  for all using (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and exists (select 1 from public.conversations c
                 where c.id = conversation_id and c.organization_id = crm_setor_da_conversa.organization_id)
  ) with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
  );
revoke all on public.crm_setor_da_conversa from anon;
grant select, insert, update, delete on public.crm_setor_da_conversa to authenticated;
grant all on public.crm_setor_da_conversa to service_role;
comment on table public.crm_setor_da_conversa is
  'O setor explícito da conversa e o estado "Em transferência" (fork Escale, migration 9203; C3, E3). Sem linha, vale o setor do dispositivo (fn_crm_setor_efetivo). A transferência termina quando alguém assume (trg_crm_conclui_transferencia).';

-- 6. Setor efetivo e a leitura pelo setor -------------------------------------
create or replace function public.fn_crm_setor_efetivo(p_conversation uuid, p_channel_session uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select s.setor_id from public.crm_setor_da_conversa s where s.conversation_id = p_conversation),
    (select d.setor_id from public.crm_setor_do_dispositivo d where d.channel_session_id = p_channel_session));
$$;
-- Interna: só as funções abaixo (e o service role) a chamam; a sessão não.
revoke all on function public.fn_crm_setor_efetivo(uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_crm_setor_efetivo(uuid, uuid) to service_role;

create or replace function public.fn_crm_ve_pelo_setor(p_org uuid, p_conversation uuid, p_channel_session uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then false
    -- viewer, gerente e admin já leem tudo pela policy do original; só o atendente ganha algo aqui
    when public.fn_user_role_in_org(p_org) is distinct from 'agent' then false
    when not public.fn_crm_pode(p_org, 'CHAT_VIEW_TEAM') then false
    else exists (
      select 1 from public.crm_setores_membros m
       where m.organization_id = p_org
         and m.user_id = auth.uid()
         and m.setor_id = public.fn_crm_setor_efetivo(p_conversation, p_channel_session))
  end;
$$;
revoke all on function public.fn_crm_ve_pelo_setor(uuid, uuid, uuid) from public, anon;
grant execute on function public.fn_crm_ve_pelo_setor(uuid, uuid, uuid) to authenticated, service_role;

drop policy if exists crm_conversations_select_setor on public.conversations;
create policy crm_conversations_select_setor on public.conversations
  for select using (public.fn_crm_ve_pelo_setor(organization_id, id, channel_session_id));
comment on policy crm_conversations_select_setor on public.conversations is
  'FORK ESCALE · Fase 3C (migration 9203): o atendente com "Visualização de atendimento do setor" lê as conversas do setor efetivo dos seus setores. Permissiva: soma por OU com conversations_select do original; só amplia.';

-- 7. A transferência para setor termina quando alguém assume ------------------
create or replace function public.fn_crm_conclui_transferencia()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to_user_id is not null and new.assigned_to_user_id is distinct from old.assigned_to_user_id then
    update public.crm_setor_da_conversa
       set em_transferencia = false, setor_anterior_id = null, atendente_anterior_id = null, updated_at = now()
     where conversation_id = new.id and em_transferencia;
  end if;
  return null;
end;
$$;
revoke all on function public.fn_crm_conclui_transferencia() from public, anon, authenticated;
drop trigger if exists trg_crm_conclui_transferencia on public.conversations;
create trigger trg_crm_conclui_transferencia
  after update of assigned_to_user_id on public.conversations
  for each row execute function public.fn_crm_conclui_transferencia();

-- 8. Respostas rápidas: canais e setores --------------------------------------
create table if not exists public.crm_respostas_rapidas_extras (
  template_id uuid primary key references public.message_templates(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  canais text[] not null default array['whatsapp', 'instagram'],
  todos_os_setores boolean not null default true,
  constraint crm_respostas_rapidas_extras_canais_validos
    check (cardinality(canais) >= 1 and canais <@ array['whatsapp', 'instagram'])
);
create table if not exists public.crm_respostas_rapidas_setores (
  template_id uuid not null references public.message_templates(id) on delete cascade,
  setor_id uuid not null references public.crm_setores(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  primary key (template_id, setor_id)
);
create index if not exists idx_crm_respostas_rapidas_setores_setor on public.crm_respostas_rapidas_setores (setor_id);
alter table public.crm_respostas_rapidas_extras enable row level security;
alter table public.crm_respostas_rapidas_setores enable row level security;
drop policy if exists crm_respostas_rapidas_extras_select on public.crm_respostas_rapidas_extras;
drop policy if exists crm_respostas_rapidas_extras_write on public.crm_respostas_rapidas_extras;
drop policy if exists crm_respostas_rapidas_setores_select on public.crm_respostas_rapidas_setores;
drop policy if exists crm_respostas_rapidas_setores_write on public.crm_respostas_rapidas_setores;
-- Lê quem lê o template (a RLS do original: compartilhadas + as próprias).
create policy crm_respostas_rapidas_extras_select on public.crm_respostas_rapidas_extras
  for select using (public.fn_is_platform_admin() or exists (select 1 from public.message_templates t where t.id = template_id));
create policy crm_respostas_rapidas_setores_select on public.crm_respostas_rapidas_setores
  for select using (public.fn_is_platform_admin() or exists (select 1 from public.message_templates t where t.id = template_id));
-- Escreve quem escreve o template pela regra do original (a própria, agente; a compartilhada, gerente).
-- As exceções ("Compartilhar", "Editar ou excluir respostas rápidas") passam pela rota com service role.
create policy crm_respostas_rapidas_extras_write on public.crm_respostas_rapidas_extras
  for all using (exists (select 1 from public.message_templates t
                          where t.id = template_id and t.organization_id = crm_respostas_rapidas_extras.organization_id
                            and ((t.owner_user_id = auth.uid() and public.fn_role_at_least(t.organization_id, 'agent'))
                                 or (t.owner_user_id is null and public.fn_role_at_least(t.organization_id, 'manager')))))
  with check (exists (select 1 from public.message_templates t
                       where t.id = template_id and t.organization_id = crm_respostas_rapidas_extras.organization_id
                         and ((t.owner_user_id = auth.uid() and public.fn_role_at_least(t.organization_id, 'agent'))
                              or (t.owner_user_id is null and public.fn_role_at_least(t.organization_id, 'manager')))));
create policy crm_respostas_rapidas_setores_write on public.crm_respostas_rapidas_setores
  for all using (exists (select 1 from public.message_templates t
                          where t.id = template_id and t.organization_id = crm_respostas_rapidas_setores.organization_id
                            and ((t.owner_user_id = auth.uid() and public.fn_role_at_least(t.organization_id, 'agent'))
                                 or (t.owner_user_id is null and public.fn_role_at_least(t.organization_id, 'manager')))))
  with check (exists (select 1 from public.message_templates t
                       where t.id = template_id and t.organization_id = crm_respostas_rapidas_setores.organization_id
                         and ((t.owner_user_id = auth.uid() and public.fn_role_at_least(t.organization_id, 'agent'))
                              or (t.owner_user_id is null and public.fn_role_at_least(t.organization_id, 'manager')))));
revoke all on public.crm_respostas_rapidas_extras, public.crm_respostas_rapidas_setores from anon;
grant select, insert, update, delete on public.crm_respostas_rapidas_extras, public.crm_respostas_rapidas_setores to authenticated;
grant all on public.crm_respostas_rapidas_extras, public.crm_respostas_rapidas_setores to service_role;
comment on table public.crm_respostas_rapidas_extras is
  'Canais e "todos os setores" de cada resposta rápida (fork Escale, migration 9203; E6). A resposta em si é o message_templates do original; sem linha aqui = os dois canais, todos os setores.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;
notify pgrst, 'reload schema';
```

- [ ] **Step 2: O baseline, a varredura e as ações**

Baseline: o bloco da migration sem a linha `-- manifest:`, logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (depois do bloco da 9202).

`tests/invariants/rls-completude-varredura.test.ts`, depois das entradas da 9202:

```ts
  {
    tabela: "crm_setores",
    razao:
      "tests/invariants/escale-setores-9203.test.ts — fork Escale (migration 9203): a organização lê; escreve quem tem " +
      "'Editar ou excluir setores' (fn_crm_pode: admin por padrão, gerente com exceção); vizinho zero; nome único por organização.",
  },
  {
    tabela: "crm_setores_membros",
    razao:
      "tests/invariants/escale-setores-9203.test.ts — fork Escale (migration 9203): mesma régua de crm_setores; membro é " +
      "pessoa da organização (FK em user_organizations).",
  },
  {
    tabela: "crm_setor_do_dispositivo",
    razao:
      "tests/invariants/escale-setores-9203.test.ts — fork Escale (migration 9203): a organização lê; só admin grava " +
      "(como as rotas de dispositivo do original); FK composta com channel_sessions e crm_setores.",
  },
  {
    tabela: "crm_setor_da_conversa",
    razao:
      "tests/invariants/escale-setores-9203.test.ts — fork Escale (migration 9203): lê quem vê a conversa (inclusive pela " +
      "policy do setor); agente+ que vê a conversa grava; a transferência termina no gatilho quando alguém assume.",
  },
  {
    tabela: "crm_permissoes_de_atendimento",
    razao:
      "tests/invariants/escale-setores-9203.test.ts — fork Escale (migration 9203): a pessoa lê as suas, admin lê e grava " +
      "todas; CHECK das chaves editáveis; vizinho zero.",
  },
  {
    tabela: "crm_respostas_rapidas_extras",
    razao:
      "tests/invariants/escale-setores-9203.test.ts — fork Escale (migration 9203): lê quem lê o message_templates; grava " +
      "pela regra do original (a própria, agente; a compartilhada, gerente).",
  },
  {
    tabela: "crm_respostas_rapidas_setores",
    razao:
      "tests/invariants/escale-setores-9203.test.ts — fork Escale (migration 9203): a mesma régua de crm_respostas_rapidas_extras.",
  },
```


`lib/audit/actions.ts`, depois do bloco da 3B:

```ts
  // FORK ESCALE · Fase 3C: setores, permissões e respostas rápidas (migration 9203).
  "crm_setor.created",
  "crm_setor.updated",
  "crm_setor.deleted",
  "crm_setor.device_set",
  "conversation.sector_transfer",
  "conversation.sector_transfer_canceled",
  "conversation.released_by_other",
  "crm_permissoes.updated",
  "crm_permissoes.reset",
  "quick_reply.created",
  "quick_reply.updated",
  "quick_reply.deleted",
```

- [ ] **Step 3: O espelho TS × SQL (roda já, sem banco)**

Create `tests/unit/escale-permissoes-espelho.test.ts`:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PERMISSOES_DE_CONVERSAS } from "@/lib/escale/conversas/permissoes";

/**
 * O papel padrão das chaves editáveis mora em dois lugares: o TS (a tela) e
 * fn_crm_papel_padrao (o banco, migration 9203). Este teste lê a migration e
 * exige os dois iguais — senão a tela mostraria ligado o que o banco nega.
 */
describe("espelho do papel padrão (TS × fn_crm_papel_padrao)", () => {
  it("cada chave editável tem o mesmo papel padrão nos dois", () => {
    const dir = join(process.cwd(), "supabase", "migrations");
    const arquivo = readdirSync(dir).find((f) => f.includes("_9203_"));
    expect(arquivo).toBeDefined();
    const sql = readFileSync(join(dir, arquivo!), "utf8");
    const corpo = sql.slice(sql.indexOf("fn_crm_papel_padrao(p_chave text)"), sql.indexOf("else 'admin'"));
    const doBanco = new Map([...corpo.matchAll(/when '([A-Z_]+)' then '([a-z]+)'/g)].map((m) => [m[1], m[2]]));
    const editaveis = PERMISSOES_DE_CONVERSAS.filter((p) => p.modo === "editavel");
    expect(doBanco.size).toBe(editaveis.length);
    for (const p of editaveis) expect([p.chave, doBanco.get(p.chave)]).toEqual([p.chave, p.papelPadrao]);
  });
});
```

- [ ] **Step 4: A prova de RLS (roda no fim da Frente C)**

Create `tests/invariants/escale-setores-9203.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_CONV_AGENT_B,
  GOV_CONV_UNASSIGNED,
  GOV_MANAGER,
  GOV_ORG,
  GOV_SESSION,
  countAs,
  seedGov,
  sql,
  tableExists,
  writeCountAs,
} from "./gov-helpers";

/**
 * MIGRATION 9203 (fork Escale, Fase 3C) — prova contra Postgres real:
 * setores (quem grava), a leitura pelo setor (só amplia, e só para o
 * atendente com a chave), o fim da transferência no gatilho, as permissões por
 * pessoa e as respostas rápidas. Roda via `pnpm test:db` no fim da Frente C.
 */
const SETOR = "e5ca1e00-9203-4000-8000-000000000001";
const VIZINHO = "e5ca1e00-9203-4000-8000-0000000000b2";
const OUTRA_ORG = "e5ca1e00-9203-4000-8000-0000000000b1";
const TPL_A = "e5ca1e00-9203-4000-8000-0000000000c1";
const TPL_B = "e5ca1e00-9203-4000-8000-0000000000c2";
const verConvB = (quem: string) => countAs(quem, `select count(*) from public.conversations where id = '${GOV_CONV_AGENT_B}'`);

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_setor_da_conversa where organization_id = '${GOV_ORG}';
    delete from public.crm_setor_do_dispositivo where organization_id = '${GOV_ORG}';
    delete from public.crm_setores where organization_id = '${GOV_ORG}';
    delete from public.crm_permissoes_de_atendimento where organization_id = '${GOV_ORG}';
    delete from public.message_templates where id in ('${TPL_A}', '${TPL_B}');
    update public.organizations set settings = coalesce(settings, '{}'::jsonb) || '{"visibility_mode":"own_and_unassigned"}' where id = '${GOV_ORG}';
    insert into auth.users (id, email) values ('${VIZINHO}', '9203-vizinho@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name) values ('${OUTRA_ORG}', '9203-vizinha', '9203 Vizinha', 'Vizinha') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values ('${VIZINHO}', '${OUTRA_ORG}', 'admin', now()) on conflict do nothing;
    insert into public.message_templates (id, organization_id, owner_user_id, title, body) values
      ('${TPL_A}', '${GOV_ORG}', '${GOV_AGENT_A}', 'oi', 'Oi'),
      ('${TPL_B}', '${GOV_ORG}', '${GOV_AGENT_B}', 'tchau', 'Tchau');
  `);
});

describe("crm_setores e membros", () => {
  it("existem; admin cria; agente e gerente não (padrão); gerente com exceção sim; vizinho zero", () => {
    for (const t of ["crm_setores", "crm_setores_membros", "crm_setor_do_dispositivo", "crm_setor_da_conversa", "crm_permissoes_de_atendimento", "crm_respostas_rapidas_extras", "crm_respostas_rapidas_setores"]) {
      expect(tableExists(t)).toBe(true);
    }
    const criar = `insert into public.crm_setores (id, organization_id, nome, cor) values ('${SETOR}', '${GOV_ORG}', 'Atendimento', '#0EA5C6')`;
    expect(() => writeCountAs(GOV_AGENT_A, criar)).toThrow();
    expect(() => writeCountAs(GOV_MANAGER, criar)).toThrow();
    sql(`insert into public.crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado) values ('${GOV_ORG}', '${GOV_MANAGER}', 'CHAT_EDIT_TEAMS', true);`);
    expect(writeCountAs(GOV_MANAGER, criar)).toBe(1);
    sql(`delete from public.crm_permissoes_de_atendimento where user_id = '${GOV_MANAGER}';`);
    expect(() => sql(`insert into public.crm_setores (organization_id, nome) values ('${GOV_ORG}', ' atendimento ');`)).toThrow(/crm_setores_nome_unico/);
    expect(writeCountAs(GOV_ADMIN, `insert into public.crm_setores_membros (organization_id, setor_id, user_id) values ('${GOV_ORG}', '${SETOR}', '${GOV_AGENT_A}')`)).toBe(1);
    expect(countAs(GOV_AGENT_B, "select count(*) from public.crm_setores")).toBe(1);
    expect(countAs(VIZINHO, "select count(*) from public.crm_setores")).toBe(0);
  });
});

describe("leitura pelo setor (policy permissiva)", () => {
  it("o agente A só vê a conversa do B depois que o dispositivo entra no setor dele; a exceção desliga; o B continua vendo a sua", () => {
    expect(verConvB(GOV_AGENT_A)).toBe(0);
    expect(() => writeCountAs(GOV_AGENT_A, `insert into public.crm_setor_do_dispositivo (channel_session_id, organization_id, setor_id) values ('${GOV_SESSION}', '${GOV_ORG}', '${SETOR}')`)).toThrow();
    expect(writeCountAs(GOV_ADMIN, `insert into public.crm_setor_do_dispositivo (channel_session_id, organization_id, setor_id) values ('${GOV_SESSION}', '${GOV_ORG}', '${SETOR}')`)).toBe(1);
    expect(verConvB(GOV_AGENT_A)).toBe(1);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.messages where conversation_id = '${GOV_CONV_AGENT_B}'`)).toBeGreaterThanOrEqual(0);
    sql(`insert into public.crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'CHAT_VIEW_TEAM', false);`);
    expect(verConvB(GOV_AGENT_A)).toBe(0);
    sql(`delete from public.crm_permissoes_de_atendimento where user_id = '${GOV_AGENT_A}';`);
    expect(verConvB(GOV_AGENT_B)).toBe(1);
    expect(verConvB(GOV_MANAGER)).toBe(1);
    expect(countAs(VIZINHO, `select count(*) from public.conversations where id = '${GOV_CONV_AGENT_B}'`)).toBe(0);
  });
});

describe("Em transferência e o gatilho", () => {
  it("assumir a conversa conclui a transferência", () => {
    sql(`insert into public.crm_setor_da_conversa (conversation_id, organization_id, setor_id, em_transferencia, atendente_anterior_id)
         values ('${GOV_CONV_UNASSIGNED}', '${GOV_ORG}', '${SETOR}', true, '${GOV_AGENT_B}')
         on conflict (conversation_id) do update set em_transferencia = true, setor_id = excluded.setor_id;`);
    sql(`update public.conversations set assigned_to_user_id = '${GOV_AGENT_A}', assigned_at = now() where id = '${GOV_CONV_UNASSIGNED}';`);
    expect(sql(`select em_transferencia from public.crm_setor_da_conversa where conversation_id = '${GOV_CONV_UNASSIGNED}';`).trim()).toBe("f");
    sql(`update public.conversations set assigned_to_user_id = null, assigned_at = null where id = '${GOV_CONV_UNASSIGNED}';`);
    expect(() => sql(`update public.crm_setor_da_conversa set setor_id = null, em_transferencia = true where conversation_id = '${GOV_CONV_UNASSIGNED}';`)).toThrow(/transferencia_tem_setor/);
  });
});

describe("permissões por pessoa e fn_crm_pode", () => {
  it("a pessoa lê as suas; admin grava; agente não; o padrão vem do papel", () => {
    expect(() => writeCountAs(GOV_AGENT_A, `insert into public.crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'CHAT_BULK_ACTIONS', true)`)).toThrow();
    expect(writeCountAs(GOV_ADMIN, `insert into public.crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado) values ('${GOV_ORG}', '${GOV_AGENT_A}', 'CHAT_BULK_ACTIONS', true)`)).toBe(1);
    expect(countAs(GOV_AGENT_A, "select count(*) from public.crm_permissoes_de_atendimento")).toBe(1);
    expect(countAs(GOV_AGENT_B, "select count(*) from public.crm_permissoes_de_atendimento")).toBe(0);
    expect(countAs(GOV_AGENT_A, `select count(*) from (select 1 where public.fn_crm_pode('${GOV_ORG}', 'CHAT_BULK_ACTIONS')) x`)).toBe(1);
    expect(countAs(GOV_AGENT_B, `select count(*) from (select 1 where public.fn_crm_pode('${GOV_ORG}', 'CHAT_BULK_ACTIONS')) x`)).toBe(0);
    expect(countAs(GOV_MANAGER, `select count(*) from (select 1 where public.fn_crm_pode('${GOV_ORG}', 'CHAT_BULK_ACTIONS')) x`)).toBe(1);
    expect(countAs(VIZINHO, `select count(*) from (select 1 where public.fn_crm_pode('${GOV_ORG}', 'CHAT_VIEW_TEAM')) x`)).toBe(0);
    expect(() => sql(`insert into public.crm_permissoes_de_atendimento (organization_id, user_id, chave, ligado) values ('${GOV_ORG}', '${GOV_AGENT_B}', 'CHAT_VIEW_ALL', true);`)).toThrow(/chave_valida/);
  });
});

describe("respostas rápidas: extras e setores", () => {
  it("o dono grava os extras da sua; outro agente não; a vizinha não lê", () => {
    expect(writeCountAs(GOV_AGENT_A, `insert into public.crm_respostas_rapidas_extras (template_id, organization_id, canais, todos_os_setores) values ('${TPL_A}', '${GOV_ORG}', array['whatsapp'], false)`)).toBe(1);
    expect(writeCountAs(GOV_AGENT_A, `insert into public.crm_respostas_rapidas_setores (template_id, setor_id, organization_id) values ('${TPL_A}', '${SETOR}', '${GOV_ORG}')`)).toBe(1);
    expect(() => writeCountAs(GOV_AGENT_A, `insert into public.crm_respostas_rapidas_extras (template_id, organization_id) values ('${TPL_B}', '${GOV_ORG}')`)).toThrow();
    expect(() => sql(`update public.crm_respostas_rapidas_extras set canais = array['email'] where template_id = '${TPL_A}';`)).toThrow(/canais_validos/);
    expect(countAs(GOV_AGENT_B, "select count(*) from public.crm_respostas_rapidas_extras")).toBe(0);
    expect(countAs(VIZINHO, "select count(*) from public.crm_respostas_rapidas_setores")).toBe(0);
  });
});
```

Confira em `tests/invariants/gov-helpers.ts` que `GOV_CONV_AGENT_B` está atribuída a `GOV_AGENT_B` no `GOV_SESSION` e que o `seedGov` não liga `visibility_mode = all` (o `update` do `beforeAll` garante `own_and_unassigned`).

- [ ] **Step 5: Rodar as cercas estáticas e commitar**

Run: `corepack pnpm vitest run tests/unit/escale-permissoes-espelho.test.ts tests/unit/manifest-x-migrations.test.ts $(ls tests/unit | grep -i baseline | sed 's|^|tests/unit/|' | tr '\n' ' ') && corepack pnpm prettier --write tests/invariants/escale-setores-9203.test.ts tests/unit/escale-permissoes-espelho.test.ts && corepack pnpm eslint tests/invariants/escale-setores-9203.test.ts tests/unit/escale-permissoes-espelho.test.ts lib/audit/actions.ts`
Expected: PASS.

```bash
git add supabase/migrations/20261104120000_9203_setores_permissoes_respostas.sql supabase/baseline.sql lib/audit/actions.ts tests/invariants/escale-setores-9203.test.ts tests/invariants/rls-completude-varredura.test.ts tests/unit/escale-permissoes-espelho.test.ts
git commit -m "feat(escale): migration 9203 — setores, leitura pelo setor, permissões por pessoa e respostas rápidas (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: As rotas de setores (lista, criar, editar, remover, setor do dispositivo, setor das conversas)

**Files:**
- Create: `tests/helpers/supabase-por-tabela.ts`, `lib/escale/conversas/setores-banco.ts`, `app/api/v1/setores/route.ts`, `app/api/v1/setores/[id]/route.ts`, `app/api/v1/setores/do-dispositivo/route.ts`, `app/api/v1/setores/das-conversas/route.ts`, `tests/unit/escale-setores-rotas.test.ts`

**Interfaces:**
- Consumes: `setorSchema`, `SetorLido` (Task 1); `lerJson` (`lib/escale/origens/respostas`), `lerUuid` (`lib/escale/origens/preferencias`); `ok/fail/noContent` (`lib/api/wrappers`; `ok(data, { requestId, status: 201 })` para criar).
- Produces:
  - `tests/helpers/supabase-por-tabela.ts`: `bancoPorTabela(tabelas, opcoes?)` → `{ db, escritas }` (o mesmo Supabase de mentira da 3B, com `opcoes.erros[tabela] = { code, message }` para a próxima escrita e `opcoes.rpc`).
  - `setores-banco.ts`: `listarSetores(supabase, orgId) → SetorLido[]`; `trocarMembros(supabase, orgId, setorId, membros)`; `setoresDasConversas(supabase, orgId, ids) → Record<string, SetorDaConversa>`; `interface SetorDaConversa { setor: { id; nome; cor } | null; em_transferencia: boolean; setor_anterior: { id; nome; cor } | null }`.
  - `GET /api/v1/setores` → `{ data: SetorLido[] }`; `POST` (`setorSchema`) → 201 `{ data: { id } }`, 409 nome repetido, 403 sem permissão; `PATCH /api/v1/setores/[id]` (`setorSchema`) → `{ data: { id } }`; `DELETE` → 204; `PUT /api/v1/setores/do-dispositivo` (`{ channel_session_id, setor_id: uuid | null }`, admin) → 204; `GET /api/v1/setores/das-conversas?ids=a,b` (até 60) → `{ data: Record<string, SetorDaConversa> }`.

- [ ] **Step 1: O banco de mentira compartilhado**

Create `tests/helpers/supabase-por-tabela.ts`:

```ts
import { vi } from "vitest";

type Linha = Record<string, unknown>;
export interface Escrita {
  tabela: string;
  op: "insert" | "update" | "upsert" | "delete";
  valores?: unknown;
  filtros: Array<[string, unknown]>;
}

/**
 * Um Supabase de mentira por tabela (fork Escale, testes da Fase 3): leitura
 * devolve as linhas de `tabelas[nome]`; escrita fica em `escritas` com os
 * filtros usados. `opcoes.erros[tabela]` faz a PRÓXIMA escrita nessa tabela
 * falhar com o código dado (ex.: `23505`, `42501`). `opcoes.rpc` responde as RPCs.
 */
export function bancoPorTabela(
  tabelas: Record<string, Linha[]>,
  opcoes: { erros?: Record<string, { code: string; message: string }>; rpc?: (nome: string, args: unknown) => unknown } = {},
) {
  const escritas: Escrita[] = [];
  const erros = { ...(opcoes.erros ?? {}) };
  const from = vi.fn((tabela: string) => {
    const dados = tabelas[tabela] ?? [];
    const filtros: Array<[string, unknown]> = [];
    let pendente: Omit<Escrita, "tabela" | "filtros"> | null = null;
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "order", "limit", "range", "not", "gt", "gte", "lte", "lt", "or", "ilike", "is"]) cadeia[m] = vi.fn(() => cadeia);
    for (const m of ["eq", "in", "neq"]) cadeia[m] = vi.fn((col: string, val: unknown) => { filtros.push([`${m}:${col}`, val]); return cadeia; });
    cadeia.insert = vi.fn((valores: unknown) => { pendente = { op: "insert", valores }; return cadeia; });
    cadeia.update = vi.fn((valores: unknown) => { pendente = { op: "update", valores }; return cadeia; });
    cadeia.upsert = vi.fn((valores: unknown) => { pendente = { op: "upsert", valores }; return cadeia; });
    cadeia.delete = vi.fn(() => { pendente = { op: "delete" }; return cadeia; });
    const fechar = (): { code: string; message: string } | null => {
      if (!pendente) return null;
      escritas.push({ tabela, ...pendente, filtros: [...filtros] });
      pendente = null;
      const erro = erros[tabela] ?? null;
      delete erros[tabela];
      return erro;
    };
    const resposta = (unica: boolean) => {
      const erro = fechar();
      if (erro) return { data: null, error: erro, count: null };
      return { data: unica ? (dados[0] ?? null) : dados, error: null, count: dados.length };
    };
    cadeia.maybeSingle = vi.fn(async () => resposta(true));
    cadeia.single = vi.fn(async () => resposta(true));
    cadeia.then = (ok: (r: unknown) => unknown) => Promise.resolve(resposta(false)).then(ok);
    return cadeia;
  });
  const rpc = vi.fn(async (nome: string, args: unknown) => (opcoes.rpc ? opcoes.rpc(nome, args) : { data: [{ id: "x" }], error: null }));
  return { db: { from, rpc }, escritas };
}
```

- [ ] **Step 2: O teste das rotas (vai falhar)**

Create `tests/unit/escale-setores-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as REMOVER, PATCH as EDITAR } from "@/app/api/v1/setores/[id]/route";
import { GET as DAS_CONVERSAS } from "@/app/api/v1/setores/das-conversas/route";
import { PUT as DO_DISPOSITIVO } from "@/app/api/v1/setores/do-dispositivo/route";
import { GET as LISTAR, POST as CRIAR } from "@/app/api/v1/setores/route";
import { audit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const S1 = "a0000000-0000-4000-8000-000000000001";
const M1 = "b0000000-0000-4000-8000-000000000001";
const CS = "c0000000-0000-4000-8000-000000000003";
const CV = "d0000000-0000-4000-8000-000000000001";
const usar = (tabelas: Parameters<typeof bancoPorTabela>[0], opcoes?: Parameters<typeof bancoPorTabela>[1]) => {
  const b = bancoPorTabela(tabelas, opcoes);
  vi.mocked(createClient).mockResolvedValue(b.db as never);
  return b;
};
const req = (metodo: string, url: string, corpo?: unknown) =>
  new NextRequest(url, { method: metodo, ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}) } as never);
const corpo = async (r: Response) => (await r.json()) as { data: unknown; error?: { message: string } };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.mocked(audit).mockClear();
  authOk("admin");
});

describe("GET e POST /api/v1/setores", () => {
  it("lista com membros e contagem de dispositivos", async () => {
    usar({
      crm_setores: [{ id: S1, nome: "Atendimento", cor: "#0EA5C6" }],
      crm_setores_membros: [{ setor_id: S1, user_id: M1 }],
      crm_setor_do_dispositivo: [{ setor_id: S1, channel_session_id: CS }],
    });
    const { data } = await corpo(await LISTAR(req("GET", "http://x/api/v1/setores")));
    expect(data).toEqual([{ id: S1, nome: "Atendimento", cor: "#0EA5C6", membros: [M1], dispositivos: 1, ids_dos_dispositivos: [CS] }]);
  });
  it("cria o setor e os membros; nome repetido → 409; sem permissão → 403", async () => {
    const { escritas } = usar({ crm_setores: [{ id: S1 }] });
    const r = await CRIAR(req("POST", "http://x/api/v1/setores", { nome: " Vendas ", cor: "#1C3FD8", membros: [M1] }));
    expect(r.status).toBe(201);
    expect(escritas[0]).toMatchObject({ tabela: "crm_setores", op: "insert", valores: { organization_id: ORG_ID, nome: "Vendas", cor: "#1C3FD8", criado_por: USER_ID } });
    expect(escritas.find((e) => e.tabela === "crm_setores_membros" && e.op === "insert")!.valores).toEqual([{ organization_id: ORG_ID, setor_id: S1, user_id: M1 }]);
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({ action: "crm_setor.created" });
    usar({}, { erros: { crm_setores: { code: "23505", message: "duplicate" } } });
    const r2 = await CRIAR(req("POST", "http://x/api/v1/setores", { nome: "Vendas", cor: "#1C3FD8", membros: [] }));
    expect(r2.status).toBe(409);
    expect((await corpo(r2)).error?.message).toBe("Já existe um setor com esse nome.");
    usar({}, { erros: { crm_setores: { code: "42501", message: "rls" } } });
    expect((await CRIAR(req("POST", "http://x/api/v1/setores", { nome: "X", cor: "#1C3FD8", membros: [] }))).status).toBe(403);
    expect((await CRIAR(req("POST", "http://x/api/v1/setores", { nome: "", cor: "#1C3FD8", membros: [] }))).status).toBe(422);
  });
});

describe("PATCH e DELETE /api/v1/setores/[id]", () => {
  it("edita nome/cor e troca os membros; remove", async () => {
    const { escritas } = usar({ crm_setores: [{ id: S1 }] });
    expect((await EDITAR(req("PATCH", "http://x", { nome: "Suporte", cor: "#F0384B", membros: [M1] }), ctx(S1))).status).toBe(200);
    expect(escritas[0]).toMatchObject({ tabela: "crm_setores", op: "update", valores: { nome: "Suporte", cor: "#F0384B" } });
    expect(escritas.some((e) => e.tabela === "crm_setores_membros" && e.op === "delete")).toBe(true);
    const b2 = usar({ crm_setores: [{ id: S1 }] });
    expect((await REMOVER(req("DELETE", "http://x"), ctx(S1))).status).toBe(204);
    expect(b2.escritas[0]).toMatchObject({ tabela: "crm_setores", op: "delete" });
    usar({ crm_setores: [] });
    expect((await REMOVER(req("DELETE", "http://x"), ctx(S1))).status).toBe(404);
  });
});

describe("PUT /api/v1/setores/do-dispositivo", () => {
  it("upsert com setor; delete sem setor; agente → 403", async () => {
    const { escritas } = usar({});
    expect((await DO_DISPOSITIVO(req("PUT", "http://x", { channel_session_id: CS, setor_id: S1 }))).status).toBe(204);
    expect(escritas[0]).toMatchObject({ tabela: "crm_setor_do_dispositivo", op: "upsert", valores: { channel_session_id: CS, organization_id: ORG_ID, setor_id: S1 } });
    const b2 = usar({});
    expect((await DO_DISPOSITIVO(req("PUT", "http://x", { channel_session_id: CS, setor_id: null }))).status).toBe(204);
    expect(b2.escritas[0]).toMatchObject({ op: "delete" });
    authOk("agent");
    const { requireRole } = await import("@/lib/auth/require-role");
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await DO_DISPOSITIVO(req("PUT", "http://x", { channel_session_id: CS, setor_id: S1 }))).status).toBe(403);
  });
});

describe("GET /api/v1/setores/das-conversas", () => {
  it("o explícito vence o do dispositivo; em transferência traz o anterior", async () => {
    usar({
      conversations: [{ id: CV, channel_session_id: CS }, { id: "e0000000-0000-4000-8000-000000000002", channel_session_id: CS }],
      crm_setor_da_conversa: [{ conversation_id: CV, setor_id: "s2", em_transferencia: true, setor_anterior_id: S1 }],
      crm_setor_do_dispositivo: [{ channel_session_id: CS, setor_id: S1 }],
      crm_setores: [{ id: S1, nome: "Atendimento", cor: "#0EA5C6" }, { id: "s2", nome: "Suporte", cor: "#F0384B" }],
    });
    const r = await DAS_CONVERSAS(req("GET", `http://x/api/v1/setores/das-conversas?ids=${CV},e0000000-0000-4000-8000-000000000002`));
    expect((await corpo(r)).data).toEqual({
      [CV]: { setor: { id: "s2", nome: "Suporte", cor: "#F0384B" }, em_transferencia: true, setor_anterior: { id: S1, nome: "Atendimento", cor: "#0EA5C6" } },
      "e0000000-0000-4000-8000-000000000002": { setor: { id: S1, nome: "Atendimento", cor: "#0EA5C6" }, em_transferencia: false, setor_anterior: null },
    });
    expect((await DAS_CONVERSAS(req("GET", "http://x/api/v1/setores/das-conversas?ids="))).status).toBe(422);
  });
});
```

`authOk(papel)` (de `tests/helpers/stages-db-double.ts`) já faz o `requireRole` mockado devolver `ok` com `ORG_ID`/`USER_ID` e o papel dado; confira a assinatura e ajuste se ele não receber o papel.

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-setores-rotas.test.ts`
Expected: FAIL.

- [ ] **Step 4: O banco dos setores**

Create `lib/escale/conversas/setores-banco.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { SetorLido } from "./setores";

/**
 * LEITURAS E ESCRITAS DOS SETORES (fork Escale, Fase 3C). Tudo pela SESSÃO:
 * a RLS da 9203 decide quem escreve (fn_crm_pode 'CHAT_EDIT_TEAMS') e o que a
 * pessoa vê (o setor das conversas que ela lê).
 */
export async function listarSetores(supabase: SupabaseClient, orgId: string): Promise<SetorLido[]> {
  const [setores, membros, dispositivos] = await Promise.all([
    supabase.from("crm_setores").select("id, nome, cor").eq("organization_id", orgId).order("nome"),
    supabase.from("crm_setores_membros").select("setor_id, user_id").eq("organization_id", orgId),
    supabase.from("crm_setor_do_dispositivo").select("setor_id, channel_session_id").eq("organization_id", orgId),
  ]);
  if (setores.error) throw setores.error;
  if (membros.error) throw membros.error;
  if (dispositivos.error) throw dispositivos.error;
  const m = (membros.data ?? []) as Array<{ setor_id: string; user_id: string }>;
  const d = (dispositivos.data ?? []) as Array<{ setor_id: string; channel_session_id: string }>;
  return ((setores.data ?? []) as Array<{ id: string; nome: string; cor: string }>).map((s) => ({
    id: s.id,
    nome: s.nome,
    cor: s.cor,
    membros: m.filter((x) => x.setor_id === s.id).map((x) => x.user_id),
    dispositivos: d.filter((x) => x.setor_id === s.id).length,
    ids_dos_dispositivos: d.filter((x) => x.setor_id === s.id).map((x) => x.channel_session_id),
  }));
}

/** Troca a lista inteira de membros (o modal da Clint grava o conjunto). */
export async function trocarMembros(supabase: SupabaseClient, orgId: string, setorId: string, membros: readonly string[]): Promise<void> {
  const apagar = await supabase.from("crm_setores_membros").delete().eq("organization_id", orgId).eq("setor_id", setorId);
  if (apagar.error) throw apagar.error;
  if (membros.length === 0) return;
  const inserir = await supabase
    .from("crm_setores_membros")
    .insert([...new Set(membros)].map((user_id) => ({ organization_id: orgId, setor_id: setorId, user_id })));
  if (inserir.error) throw inserir.error;
}

export interface SetorCurto {
  id: string;
  nome: string;
  cor: string;
}
export interface SetorDaConversa {
  setor: SetorCurto | null;
  em_transferencia: boolean;
  setor_anterior: SetorCurto | null;
}

/** O setor efetivo (N2) de cada conversa visível: o explícito ou o do dispositivo. */
export async function setoresDasConversas(
  supabase: SupabaseClient,
  orgId: string,
  ids: readonly string[],
): Promise<Record<string, SetorDaConversa>> {
  const conversas = await supabase.from("conversations").select("id, channel_session_id").eq("organization_id", orgId).in("id", [...ids]);
  if (conversas.error) throw conversas.error;
  const visiveis = (conversas.data ?? []) as Array<{ id: string; channel_session_id: string }>;
  if (visiveis.length === 0) return {};
  const sessoes = [...new Set(visiveis.map((c) => c.channel_session_id))];
  const [explicitos, doDispositivo, setores] = await Promise.all([
    supabase.from("crm_setor_da_conversa").select("conversation_id, setor_id, em_transferencia, setor_anterior_id").eq("organization_id", orgId).in("conversation_id", visiveis.map((c) => c.id)),
    supabase.from("crm_setor_do_dispositivo").select("channel_session_id, setor_id").eq("organization_id", orgId).in("channel_session_id", sessoes),
    supabase.from("crm_setores").select("id, nome, cor").eq("organization_id", orgId),
  ]);
  if (explicitos.error) throw explicitos.error;
  if (doDispositivo.error) throw doDispositivo.error;
  if (setores.error) throw setores.error;
  const porId = new Map(((setores.data ?? []) as SetorCurto[]).map((s) => [s.id, s]));
  const exp = new Map(
    ((explicitos.data ?? []) as Array<{ conversation_id: string; setor_id: string | null; em_transferencia: boolean; setor_anterior_id: string | null }>).map((e) => [e.conversation_id, e]),
  );
  const disp = new Map(((doDispositivo.data ?? []) as Array<{ channel_session_id: string; setor_id: string }>).map((d) => [d.channel_session_id, d.setor_id]));
  const saida: Record<string, SetorDaConversa> = {};
  for (const c of visiveis) {
    const e = exp.get(c.id);
    const setorId = e?.setor_id ?? disp.get(c.channel_session_id) ?? null;
    saida[c.id] = {
      setor: setorId ? (porId.get(setorId) ?? null) : null,
      em_transferencia: e?.em_transferencia ?? false,
      setor_anterior: e?.setor_anterior_id ? (porId.get(e.setor_anterior_id) ?? null) : null,
    };
  }
  return saida;
}
```

- [ ] **Step 5: As rotas**

Create `app/api/v1/setores/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { listarSetores, trocarMembros } from "@/lib/escale/conversas/setores-banco";
import { setorSchema } from "@/lib/escale/conversas/setores";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Os setores da organização (c38): agente+ lê (o setor aparece na fila e no cabeçalho). */
export async function GET(_req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_setores" });
  if (!authz.ok) return authz.response;
  try {
    return ok(await listarSetores(await createClient(), authz.org.orgId), { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message ?? "erro", 500, { requestId });
  }
}

/** "Criar setor" (c42). A RLS exige "Editar ou excluir setores" (42501 → 403). */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "crm_setores" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  const parsed = setorSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_setores")
    .insert({ organization_id: authz.org.orgId, nome: parsed.data.nome, cor: parsed.data.cor, criado_por: authz.user.id })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return fail("conflict", t("Já existe um setor com esse nome."), 409, { requestId });
    if (error.code === "42501") return fail("forbidden", t("Você não pode editar setores."), 403, { requestId });
    return fail("internal_error", error.message, 500, { requestId });
  }
  const id = (data as { id: string }).id;
  try {
    await trocarMembros(supabase, authz.org.orgId, id, parsed.data.membros);
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
  void audit({ action: "crm_setor.created", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "crm_setor", resourceId: id, requestId, metadata: { nome: parsed.data.nome, membros: parsed.data.membros.length } });
  return ok({ id }, { requestId, status: 201 });
}
```

Create `app/api/v1/setores/[id]/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { trocarMembros } from "@/lib/escale/conversas/setores-banco";
import { setorSchema } from "@/lib/escale/conversas/setores";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function preparar(ctx: Ctx) {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return { erro: supportDenied } as const;
  const authz = await requireRole("agent", { requestId, resource: "crm_setores" });
  if (!authz.ok) return { erro: authz.response } as const;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const id = lerUuid((await ctx.params).id);
  if (!id) return { erro: fail("not_found", t("Setor não encontrado."), 404, { requestId }) } as const;
  return { requestId, authz, t, id, supabase: await createClient() } as const;
}

/** "Salvar alterações" de "Editar setor" (c88). */
export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  const p = await preparar(ctx);
  if ("erro" in p) return p.erro;
  const { requestId, authz, t, id, supabase } = p;
  const lido = await lerJson(req);
  const parsed = setorSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const { data, error } = await supabase
    .from("crm_setores")
    .update({ nome: parsed.data.nome, cor: parsed.data.cor })
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return fail("conflict", t("Já existe um setor com esse nome."), 409, { requestId });
    if (error.code === "42501") return fail("forbidden", t("Você não pode editar setores."), 403, { requestId });
    return fail("internal_error", error.message, 500, { requestId });
  }
  if (!data) return fail("not_found", t("Setor não encontrado."), 404, { requestId });
  try {
    await trocarMembros(supabase, authz.org.orgId, id, parsed.data.membros);
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
  void audit({ action: "crm_setor.updated", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "crm_setor", resourceId: id, requestId, metadata: { nome: parsed.data.nome, membros: parsed.data.membros.length } });
  return ok({ id }, { requestId });
}

/** "Remover setor" (c87). Os vínculos saem em cascata; as conversas voltam ao setor do dispositivo. */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const p = await preparar(ctx);
  if ("erro" in p) return p.erro;
  const { requestId, authz, t, id, supabase } = p;
  const { data, error } = await supabase.from("crm_setores").delete().eq("organization_id", authz.org.orgId).eq("id", id).select("id").maybeSingle();
  if (error) {
    if (error.code === "42501") return fail("forbidden", t("Você não pode editar setores."), 403, { requestId });
    return fail("internal_error", t("Erro ao remover setor"), 500, { requestId });
  }
  if (!data) return fail("not_found", t("Setor não encontrado."), 404, { requestId });
  void audit({ action: "crm_setor.deleted", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "crm_setor", resourceId: id, requestId });
  return noContent(requestId);
}
```

Create `app/api/v1/setores/do-dispositivo/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const corpoSchema = z.object({ channel_session_id: z.string().uuid(), setor_id: z.string().uuid().nullable() });

/** "Setor de atendimento" da janela do dispositivo (c101). Admin, como as rotas de dispositivo do original. */
export async function PUT(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "channel_sessions" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  const parsed = corpoSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const { channel_session_id, setor_id } = parsed.data;
  const supabase = await createClient();
  const { error } = setor_id
    ? await supabase
        .from("crm_setor_do_dispositivo")
        .upsert({ channel_session_id, organization_id: authz.org.orgId, setor_id, updated_at: new Date().toISOString() }, { onConflict: "channel_session_id" })
    : await supabase.from("crm_setor_do_dispositivo").delete().eq("organization_id", authz.org.orgId).eq("channel_session_id", channel_session_id);
  if (error) {
    if (error.code === "23503") return fail("not_found", t("Dispositivo ou setor não encontrado."), 404, { requestId });
    return fail("internal_error", error.message, 500, { requestId });
  }
  void audit({ action: "crm_setor.device_set", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "channel_session", resourceId: channel_session_id, requestId, metadata: { setor_id } });
  return noContent(requestId);
}
```

Create `app/api/v1/setores/das-conversas/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { setoresDasConversas } from "@/lib/escale/conversas/setores-banco";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const IDS_MAX = 60;

/** O setor de cada conversa de uma página da fila (N16): o chip da linha, o selo do cabeçalho. */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0 || ids.length > IDS_MAX || ids.some((id) => !lerUuid(id))) {
    return fail("validation_failed", "ids inválido", 422, { requestId });
  }
  try {
    return ok(await setoresDasConversas(await createClient(), authz.org.orgId, ids), { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

O teste de `das-conversas` usa `"s2"` como id de setor (não de conversa); os ids de conversa são uuid.

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-setores-rotas.test.ts && corepack pnpm prettier --write app/api/v1/setores lib/escale/conversas/setores-banco.ts tests/helpers/supabase-por-tabela.ts tests/unit/escale-setores-rotas.test.ts && corepack pnpm eslint app/api/v1/setores lib/escale/conversas/setores-banco.ts tests/helpers/supabase-por-tabela.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/v1/setores lib/escale/conversas/setores-banco.ts tests/helpers/supabase-por-tabela.ts tests/unit/escale-setores-rotas.test.ts
git commit -m "feat(escale): rotas de setores, setor do dispositivo e setor das conversas (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: A conversa ligada ao setor — "Alterar setor", "Cancelar transferência" e liberar o atendimento de outra pessoa

**Files:**
- Create: `app/api/v1/conversas-da-casca/[id]/setor/route.ts`, `app/api/v1/conversas-da-casca/[id]/liberar/route.ts`, `app/api/v1/permissoes-de-atendimento/minhas/route.ts`, `tests/unit/escale-conversa-setor-rotas.test.ts`

**Interfaces:**
- Consumes: `comAConversa(params, escreve, corpo)` e `ConversaVisivel` (3B, `app/api/v1/conversas-da-casca/[id]/_comum.ts`); a RPC `fn_conversation_assign` do original (`p_organization_id, p_conversation_id, p_to_user_id, p_reason, p_expected_assignee, p_enforce_expected`); `fn_crm_pode` (Task 2).
- Produces:
  - `POST /api/v1/conversas-da-casca/[id]/setor` (`{ setor_id }`) → `{ data: { setor_id, em_transferencia: true } }`: grava o setor novo em transferência (guarda setor e atendente anteriores) e solta o atendente; o mesmo setor → 422.
  - `DELETE /api/v1/conversas-da-casca/[id]/setor` → 204: volta o setor anterior e reatribui ao atendente anterior (`p_reason: "transfer"`); sem transferência em curso → 409.
  - `POST /api/v1/conversas-da-casca/[id]/liberar` → `{ data: Conversation }`: libera o atendimento de outra pessoa com "Alterar atendentes" ou ("Alterar atendentes do setor" e membro do setor efetivo); sem permissão → 403.
  - `GET /api/v1/permissoes-de-atendimento/minhas` → `{ data: Record<ChaveDePermissao, boolean> }` (as 9 editáveis, por `fn_crm_pode`; a tela usa para mostrar ou não os controles).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-conversa-setor-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as LIBERAR } from "@/app/api/v1/conversas-da-casca/[id]/liberar/route";
import { DELETE as CANCELAR, POST as ALTERAR } from "@/app/api/v1/conversas-da-casca/[id]/setor/route";
import { GET as MINHAS } from "@/app/api/v1/permissoes-de-atendimento/minhas/route";
import { audit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const CV = "c0000000-0000-4000-8000-000000000001";
const S1 = "a0000000-0000-4000-8000-000000000001";
const S2 = "a0000000-0000-4000-8000-000000000002";
const OUTRO = "b0000000-0000-4000-8000-000000000009";
const conversa = (extra: Record<string, unknown> = {}) => ({
  id: CV, organization_id: ORG_ID, status: "open", service_revision: 1, assigned_to_user_id: OUTRO, snooze_until: null,
  metadata: {}, bot_silenced_until: null, contact_id: "ct", last_inbound_at: null, channel_session_id: "cs", ...extra,
});
const req = (metodo: string, corpo?: unknown) => new NextRequest("http://x", { method: metodo, ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}) } as never);
const ctx = { params: Promise.resolve({ id: CV }) };

function usar(tabelas: Parameters<typeof bancoPorTabela>[0], pode: Record<string, boolean> = {}, rpcExtra: Record<string, unknown> = {}) {
  const b = bancoPorTabela(tabelas, {
    rpc: (nome, args) => {
      if (nome === "fn_crm_pode") return { data: pode[(args as { p_chave: string }).p_chave] ?? false, error: null };
      if (nome in rpcExtra) return rpcExtra[nome];
      return { data: [conversa({ assigned_to_user_id: null })], error: null };
    },
  });
  vi.mocked(createClient).mockResolvedValue(b.db as never);
  return b;
}

beforeEach(() => {
  vi.mocked(audit).mockClear();
  authOk("agent");
});

describe("Alterar setor (Em transferência)", () => {
  it("grava o setor novo em transferência com os anteriores e solta o atendente", async () => {
    const { escritas, db } = usar({ conversations: [conversa()], crm_setor_da_conversa: [], crm_setor_do_dispositivo: [{ channel_session_id: "cs", setor_id: S1 }], crm_setores: [{ id: S2 }] });
    const r = await ALTERAR(req("POST", { setor_id: S2 }), ctx);
    expect(r.status).toBe(200);
    expect(escritas.find((e) => e.tabela === "crm_setor_da_conversa")!.valores).toMatchObject({
      conversation_id: CV, organization_id: ORG_ID, setor_id: S2, em_transferencia: true, setor_anterior_id: S1, atendente_anterior_id: OUTRO, transferido_por: USER_ID,
    });
    expect(db.rpc).toHaveBeenCalledWith("fn_conversation_assign", expect.objectContaining({ p_conversation_id: CV, p_to_user_id: null, p_reason: "release", p_expected_assignee: OUTRO, p_enforce_expected: true }));
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({ action: "conversation.sector_transfer" });
    usar({ conversations: [conversa()], crm_setor_da_conversa: [{ conversation_id: CV, setor_id: S2 }], crm_setor_do_dispositivo: [], crm_setores: [{ id: S2 }] });
    expect((await ALTERAR(req("POST", { setor_id: S2 }), ctx)).status).toBe(422);
  });
  it("cancelar volta o setor anterior e reatribui ao atendente anterior; sem transferência → 409", async () => {
    const { escritas, db } = usar({ conversations: [conversa({ assigned_to_user_id: null })], crm_setor_da_conversa: [{ conversation_id: CV, setor_id: S2, em_transferencia: true, setor_anterior_id: S1, atendente_anterior_id: OUTRO }] });
    expect((await CANCELAR(req("DELETE"), ctx)).status).toBe(204);
    expect(escritas.find((e) => e.tabela === "crm_setor_da_conversa")!.valores).toMatchObject({ setor_id: S1, em_transferencia: false, setor_anterior_id: null, atendente_anterior_id: null });
    expect(db.rpc).toHaveBeenCalledWith("fn_conversation_assign", expect.objectContaining({ p_to_user_id: OUTRO, p_reason: "transfer", p_expected_assignee: null, p_enforce_expected: true }));
    usar({ conversations: [conversa()], crm_setor_da_conversa: [{ conversation_id: CV, setor_id: S2, em_transferencia: false }] });
    expect((await CANCELAR(req("DELETE"), ctx)).status).toBe(409);
  });
});

describe("liberar o atendimento de outra pessoa", () => {
  it("com 'Alterar atendentes' libera; com 'do setor' só sendo membro do setor efetivo; sem nada → 403", async () => {
    const { db } = usar({ conversations: [conversa()] }, { CHAT_CHANGE_ATTENDANT_ALL: true });
    expect((await LIBERAR(req("POST"), ctx)).status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_conversation_assign", expect.objectContaining({ p_to_user_id: null, p_expected_assignee: OUTRO, p_reason: "release" }));
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({ action: "conversation.released_by_other" });
    usar({ conversations: [conversa()], crm_setor_da_conversa: [], crm_setor_do_dispositivo: [{ channel_session_id: "cs", setor_id: S1 }], crm_setores_membros: [{ setor_id: S1, user_id: USER_ID }] }, { CHAT_CHANGE_ATTENDANT_TEAM: true });
    expect((await LIBERAR(req("POST"), ctx)).status).toBe(200);
    usar({ conversations: [conversa()], crm_setor_da_conversa: [], crm_setor_do_dispositivo: [{ channel_session_id: "cs", setor_id: S1 }], crm_setores_membros: [] }, { CHAT_CHANGE_ATTENDANT_TEAM: true });
    expect((await LIBERAR(req("POST"), ctx)).status).toBe(403);
    usar({ conversations: [conversa({ assigned_to_user_id: null })] }, { CHAT_CHANGE_ATTENDANT_ALL: true });
    expect((await LIBERAR(req("POST"), ctx)).status).toBe(409);
  });
});

describe("as minhas permissões", () => {
  it("devolve as 9 editáveis pela fn_crm_pode", async () => {
    usar({}, { CHAT_VIEW_TEAM: true, CHAT_BULK_ACTIONS: false });
    const { data } = (await (await MINHAS(new NextRequest("http://x"))).json()) as { data: Record<string, boolean> };
    expect(Object.keys(data)).toHaveLength(9);
    expect(data.CHAT_VIEW_TEAM).toBe(true);
    expect(data.CHAT_BULK_ACTIONS).toBe(false);
  });
});
```

`comAConversa` (3B) lê a conversa com `COLUNAS_DA_CONVERSA`; acrescente `channel_session_id` a essa constante em `app/api/v1/conversas-da-casca/[id]/_comum.ts` e ao tipo `ConversaVisivel` (a única mudança no arquivo da 3B).

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-conversa-setor-rotas.test.ts`
Expected: FAIL.

- [ ] **Step 3: O setor efetivo lido pela rota e as três rotas**

Em `lib/escale/conversas/setores-banco.ts`, acrescente:

```ts
/** O setor efetivo de UMA conversa, lido pela sessão (N2). */
export async function setorEfetivo(
  supabase: SupabaseClient,
  orgId: string,
  conversa: { id: string; channel_session_id: string },
): Promise<{ explicito: { setor_id: string | null; em_transferencia: boolean; setor_anterior_id: string | null; atendente_anterior_id: string | null } | null; setorId: string | null }> {
  const [exp, disp] = await Promise.all([
    supabase.from("crm_setor_da_conversa").select("setor_id, em_transferencia, setor_anterior_id, atendente_anterior_id").eq("organization_id", orgId).eq("conversation_id", conversa.id).maybeSingle(),
    supabase.from("crm_setor_do_dispositivo").select("setor_id").eq("organization_id", orgId).eq("channel_session_id", conversa.channel_session_id).maybeSingle(),
  ]);
  if (exp.error) throw exp.error;
  if (disp.error) throw disp.error;
  const explicito = (exp.data as { setor_id: string | null; em_transferencia: boolean; setor_anterior_id: string | null; atendente_anterior_id: string | null } | null) ?? null;
  return { explicito, setorId: explicito?.setor_id ?? (disp.data as { setor_id: string } | null)?.setor_id ?? null };
}

/** `fn_crm_pode` pela sessão. */
export async function pode(supabase: SupabaseClient, orgId: string, chave: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("fn_crm_pode", { p_org: orgId, p_chave: chave });
  if (error) throw error;
  return data === true;
}
```

O banco de mentira devolve a primeira linha da tabela no `maybeSingle` sem olhar os filtros; os testes montam cada tabela com a linha certa.

Create `app/api/v1/conversas-da-casca/[id]/setor/route.ts`:

```ts
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { setorEfetivo } from "@/lib/escale/conversas/setores-banco";
import { lerJson } from "@/lib/escale/origens/respostas";

import { comAConversa } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const corpoSchema = z.object({ setor_id: z.string().uuid() });

/**
 * "Alterar setor" (C3, N7): o setor novo entra em transferência, com o setor e
 * o atendente anteriores guardados para o "Cancelar transferência"; o
 * atendente sai (a mesma RPC do release do original). Quem é do setor novo
 * passa a ver (policy da 9203) e o primeiro que assumir conclui (gatilho).
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId, t }) => {
    const lido = await lerJson(req);
    const parsed = corpoSchema.safeParse(lido.ok ? lido.json : null);
    if (!parsed.success) return fail("validation_failed", t("Setor inválido."), 422, { requestId });
    const destino = parsed.data.setor_id;
    const { data: existe } = await supabase.from("crm_setores").select("id").eq("organization_id", authz.org.orgId).eq("id", destino).maybeSingle();
    if (!existe) return fail("not_found", t("Setor não encontrado."), 404, { requestId });
    const atual = await setorEfetivo(supabase, authz.org.orgId, conversa);
    if (atual.setorId === destino) return fail("validation_failed", t("A conversa já está nesse setor."), 422, { requestId });

    const { error } = await supabase.from("crm_setor_da_conversa").upsert(
      {
        conversation_id: conversa.id,
        organization_id: authz.org.orgId,
        setor_id: destino,
        em_transferencia: true,
        setor_anterior_id: atual.setorId,
        atendente_anterior_id: conversa.assigned_to_user_id,
        transferido_por: authz.user.id,
        transferido_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id" },
    );
    if (error) return fail("internal_error", error.message, 500, { requestId });
    if (conversa.assigned_to_user_id) {
      const solta = await supabase.rpc("fn_conversation_assign", {
        p_organization_id: authz.org.orgId,
        p_conversation_id: conversa.id,
        p_to_user_id: null as unknown as string,
        p_reason: "release",
        p_expected_assignee: conversa.assigned_to_user_id,
        p_enforce_expected: true,
      });
      if (solta.error) return fail("internal_error", solta.error.message, 500, { requestId });
    }
    void audit({ action: "conversation.sector_transfer", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "conversation", resourceId: conversa.id, requestId, metadata: { de: atual.setorId, para: destino } });
    return ok({ setor_id: destino, em_transferencia: true }, { requestId });
  });
}

/** "Cancelar transferência": volta o setor anterior e o atendente anterior. */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId, t }) => {
    const atual = await setorEfetivo(supabase, authz.org.orgId, conversa);
    const exp = atual.explicito;
    if (!exp?.em_transferencia) return fail("state_conflict", t("A conversa não está em transferência."), 409, { requestId });
    const { error } = await supabase
      .from("crm_setor_da_conversa")
      .update({ setor_id: exp.setor_anterior_id, em_transferencia: false, setor_anterior_id: null, atendente_anterior_id: null, updated_at: new Date().toISOString() })
      .eq("organization_id", authz.org.orgId)
      .eq("conversation_id", conversa.id);
    if (error) return fail("internal_error", error.message, 500, { requestId });
    if (exp.atendente_anterior_id && !conversa.assigned_to_user_id) {
      const volta = await supabase.rpc("fn_conversation_assign", {
        p_organization_id: authz.org.orgId,
        p_conversation_id: conversa.id,
        p_to_user_id: exp.atendente_anterior_id,
        p_reason: "transfer",
        p_expected_assignee: null as unknown as string,
        p_enforce_expected: true,
      });
      if (volta.error) return fail("internal_error", volta.error.message, 500, { requestId });
    }
    void audit({ action: "conversation.sector_transfer_canceled", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "conversation", resourceId: conversa.id, requestId });
    return noContent(requestId);
  });
}
```

Sem setor anterior (a conversa não tinha setor), `setor_id` volta a `null` e a linha passa a não mudar nada (vale o do dispositivo); o CHECK da 9203 permite porque `em_transferencia` é `false`.

Create `app/api/v1/conversas-da-casca/[id]/liberar/route.ts`:

```ts
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { pode, setorEfetivo } from "@/lib/escale/conversas/setores-banco";
import type { Conversation } from "@/lib/types/messaging";

import { comAConversa } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/**
 * "Sem atendente" no atendimento de OUTRA pessoa (N8; pendência da 3B N10).
 * O próprio atendimento continua pela rota do original. A mesma RPC do
 * release, com o atendente atual como o esperado (409 se mudou no meio).
 */
export async function POST(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId, t }) => {
    const atual = conversa.assigned_to_user_id;
    if (!atual) return fail("state_conflict", t("A conversa já está sem atendente."), 409, { requestId });
    let autorizado = await pode(supabase, authz.org.orgId, "CHAT_CHANGE_ATTENDANT_ALL");
    if (!autorizado && (await pode(supabase, authz.org.orgId, "CHAT_CHANGE_ATTENDANT_TEAM"))) {
      const { setorId } = await setorEfetivo(supabase, authz.org.orgId, conversa);
      if (setorId) {
        const { data } = await supabase.from("crm_setores_membros").select("user_id").eq("organization_id", authz.org.orgId).eq("setor_id", setorId).eq("user_id", authz.user.id).maybeSingle();
        autorizado = !!data;
      }
    }
    if (!autorizado) return fail("forbidden", t("Só o atendente atual ou quem pode alterar atendentes libera a conversa."), 403, { requestId });
    const { data, error } = await supabase.rpc("fn_conversation_assign", {
      p_organization_id: authz.org.orgId,
      p_conversation_id: conversa.id,
      p_to_user_id: null as unknown as string,
      p_reason: "release",
      p_expected_assignee: atual,
      p_enforce_expected: true,
    });
    if (error) return fail("internal_error", error.message, 500, { requestId });
    const linha = (data as unknown[] | null)?.[0];
    if (!linha) return fail("state_conflict", t("O atendente já foi alterado por outro usuário!"), 409, { requestId });
    void audit({ action: "conversation.released_by_other", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "conversation", resourceId: conversa.id, requestId, metadata: { de: atual } });
    return ok(linha as Conversation, { requestId });
  });
}
```

Create `app/api/v1/permissoes-de-atendimento/minhas/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { CHAVES_EDITAVEIS } from "@/lib/escale/conversas/permissoes";
import { pode } from "@/lib/escale/conversas/setores-banco";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** As chaves editáveis da pessoa da sessão (fn_crm_pode), para a tela mostrar ou não cada controle. */
export async function GET(_req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const supabase = await createClient();
  try {
    const pares = await Promise.all([...CHAVES_EDITAVEIS].map(async (chave) => [chave, await pode(supabase, authz.org.orgId, chave)] as const));
    return ok(Object.fromEntries(pares), { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-conversa-setor-rotas.test.ts tests/unit/escale-conversa-aberta-rotas.test.ts && corepack pnpm prettier --write app/api/v1/conversas-da-casca app/api/v1/permissoes-de-atendimento lib/escale/conversas/setores-banco.ts tests/unit/escale-conversa-setor-rotas.test.ts && corepack pnpm eslint app/api/v1/conversas-da-casca app/api/v1/permissoes-de-atendimento lib/escale/conversas/setores-banco.ts && corepack pnpm typecheck`
Expected: PASS (o teste das rotas da 3B continua verde com a coluna nova).

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/conversas-da-casca app/api/v1/permissoes-de-atendimento lib/escale/conversas/setores-banco.ts tests/unit/escale-conversa-setor-rotas.test.ts
git commit -m "feat(escale): alterar setor com Em transferência, cancelar, liberar de outra pessoa e as minhas permissões (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: As rotas de permissões por pessoa e dos usuários da casca

**Files:**
- Create: `app/api/v1/permissoes-de-atendimento/route.ts`, `app/api/v1/usuarios-da-casca/route.ts`, `app/api/v1/usuarios-da-casca/[user_id]/setores/route.ts`, `tests/unit/escale-permissoes-rotas.test.ts`

**Interfaces:**
- Consumes: `CHAVES_EDITAVEIS`, `PERMISSOES_DE_CONVERSAS`, `papelAlcanca`, `type Excecoes`, `type Papel` (Task 1).
- Produces:
  - `GET /api/v1/permissoes-de-atendimento?user_id=` (admin) → `{ data: { excecoes: Excecoes } }`.
  - `PUT /api/v1/permissoes-de-atendimento` (admin; `{ user_id, valores: Record<chave, boolean | null> }`) → `{ data: { excecoes } }`; chave fora das editáveis ou abaixo do piso do papel da pessoa → 422; admin como alvo → 422 ("Usuário administrador").
  - `DELETE /api/v1/permissoes-de-atendimento?user_id=` (admin) → 204 (apaga as exceções; usado quando o grupo muda).
  - `GET /api/v1/usuarios-da-casca` (admin) → `{ data: Record<user_id, { setores: string[]; excecoes: number }> }`.
  - `PUT /api/v1/usuarios-da-casca/[user_id]/setores` (`{ setor_ids: uuid[] }`) → 204 (a RLS de `crm_setores_membros` exige "Editar ou excluir setores").

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-permissoes-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as RESETAR, GET as LER, PUT as GRAVAR } from "@/app/api/v1/permissoes-de-atendimento/route";
import { PUT as SETORES_DA_PESSOA } from "@/app/api/v1/usuarios-da-casca/[user_id]/setores/route";
import { GET as USUARIOS } from "@/app/api/v1/usuarios-da-casca/route";
import { audit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const ALVO = "b0000000-0000-4000-8000-000000000001";
const S1 = "a0000000-0000-4000-8000-000000000001";
const usar = (tabelas: Parameters<typeof bancoPorTabela>[0]) => {
  const b = bancoPorTabela(tabelas);
  vi.mocked(createClient).mockResolvedValue(b.db as never);
  return b;
};
const req = (metodo: string, url: string, corpo?: unknown) => new NextRequest(url, { method: metodo, ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}) } as never);
const json = async (r: Response) => (await r.json()) as { data: unknown };

beforeEach(() => {
  vi.mocked(audit).mockClear();
  authOk("admin");
});

describe("permissões de uma pessoa", () => {
  it("lê as exceções", async () => {
    usar({ crm_permissoes_de_atendimento: [{ chave: "CHAT_BULK_ACTIONS", ligado: true }] });
    const { data } = await json(await LER(req("GET", `http://x?user_id=${ALVO}`)));
    expect(data).toEqual({ excecoes: { CHAT_BULK_ACTIONS: true } });
  });
  it("grava (upsert) e apaga (null); recusa chave travada, piso e admin", async () => {
    const { escritas } = usar({ user_organizations: [{ role: "agent" }], crm_permissoes_de_atendimento: [{ chave: "CHAT_BULK_ACTIONS", ligado: true }] });
    const r = await GRAVAR(req("PUT", "http://x", { user_id: ALVO, valores: { CHAT_BULK_ACTIONS: true, CHAT_VIEW_TEAM: null } }));
    expect(r.status).toBe(200);
    expect(escritas.find((e) => e.op === "upsert")!.valores).toEqual([{ organization_id: ORG_ID, user_id: ALVO, chave: "CHAT_BULK_ACTIONS", ligado: true, atualizado_por: USER_ID, updated_at: expect.any(String) }]);
    expect(escritas.find((e) => e.op === "delete")!.filtros).toEqual(expect.arrayContaining([["in:chave", ["CHAT_VIEW_TEAM"]]]));
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({ action: "crm_permissoes.updated" });
    usar({ user_organizations: [{ role: "agent" }] });
    expect((await GRAVAR(req("PUT", "http://x", { user_id: ALVO, valores: { CHAT_VIEW_ALL: true } }))).status).toBe(422);
    usar({ user_organizations: [{ role: "agent" }] });
    expect((await GRAVAR(req("PUT", "http://x", { user_id: ALVO, valores: { CHAT_EDIT_TEAMS: true } }))).status).toBe(422);
    usar({ user_organizations: [{ role: "admin" }] });
    expect((await GRAVAR(req("PUT", "http://x", { user_id: ALVO, valores: { CHAT_BULK_ACTIONS: false } }))).status).toBe(422);
    usar({ user_organizations: [] });
    expect((await GRAVAR(req("PUT", "http://x", { user_id: ALVO, valores: { CHAT_BULK_ACTIONS: false } }))).status).toBe(404);
  });
  it("resetar apaga todas e audita", async () => {
    const { escritas } = usar({});
    expect((await RESETAR(req("DELETE", `http://x?user_id=${ALVO}`))).status).toBe(204);
    expect(escritas[0]).toMatchObject({ tabela: "crm_permissoes_de_atendimento", op: "delete" });
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({ action: "crm_permissoes.reset" });
  });
});

describe("usuários da casca", () => {
  it("devolve setores e o número de exceções de cada pessoa", async () => {
    usar({
      crm_setores_membros: [{ user_id: ALVO, setor_id: S1 }],
      crm_permissoes_de_atendimento: [{ user_id: ALVO, chave: "CHAT_BULK_ACTIONS" }, { user_id: ALVO, chave: "CHAT_VIEW_TEAM" }],
    });
    const { data } = await json(await USUARIOS(req("GET", "http://x")));
    expect(data).toEqual({ [ALVO]: { setores: [S1], excecoes: 2 } });
  });
  it("troca os setores de uma pessoa", async () => {
    const { escritas } = usar({});
    const r = await SETORES_DA_PESSOA(req("PUT", "http://x", { setor_ids: [S1] }), { params: Promise.resolve({ user_id: ALVO }) });
    expect(r.status).toBe(204);
    expect(escritas[0]).toMatchObject({ tabela: "crm_setores_membros", op: "delete" });
    expect(escritas[1]).toMatchObject({ tabela: "crm_setores_membros", op: "insert", valores: [{ organization_id: ORG_ID, setor_id: S1, user_id: ALVO }] });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-permissoes-rotas.test.ts`
Expected: FAIL.

- [ ] **Step 3: As rotas**

Create `app/api/v1/permissoes-de-atendimento/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { CHAVES_EDITAVEIS, PERMISSOES_DE_CONVERSAS, papelAlcanca, type ChaveDePermissao, type Excecoes, type Papel } from "@/lib/escale/conversas/permissoes";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const corpoSchema = z.object({ user_id: z.string().uuid(), valores: z.record(z.string(), z.boolean().nullable()) });

async function lerExcecoes(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string, userId: string): Promise<Excecoes> {
  const { data, error } = await supabase.from("crm_permissoes_de_atendimento").select("chave, ligado").eq("organization_id", orgId).eq("user_id", userId);
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as Array<{ chave: ChaveDePermissao; ligado: boolean }>).map((l) => [l.chave, l.ligado]));
}

/** A aba Permissões (c92): as exceções da pessoa. Só admin (Usuários e Permissões). */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const userId = lerUuid(new URL(req.url).searchParams.get("user_id"));
  if (!userId) return fail("validation_failed", "user_id inválido", 422, { requestId });
  try {
    return ok({ excecoes: await lerExcecoes(await createClient(), authz.org.orgId, userId) }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}

/** Um toggle ou "Desativar todos": `true/false` grava a exceção; `null` volta ao papel. */
export async function PUT(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  const parsed = corpoSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const { user_id, valores } = parsed.data;
  const supabase = await createClient();
  const { data: membro } = await supabase.from("user_organizations").select("role").eq("organization_id", authz.org.orgId).eq("user_id", user_id).is("revoked_at", null).maybeSingle();
  if (!membro) return fail("not_found", t("Usuário não encontrado."), 404, { requestId });
  const papel = (membro as { role: Papel }).role;
  if (papel === "admin") return fail("validation_failed", t("Usuário administrador"), 422, { requestId });
  const chaves = Object.keys(valores) as ChaveDePermissao[];
  for (const chave of chaves) {
    const p = PERMISSOES_DE_CONVERSAS.find((x) => x.chave === chave);
    if (!p || !CHAVES_EDITAVEIS.has(chave) || p.modo !== "editavel") {
      return fail("validation_failed", t("Essa permissão é definida pelo papel do usuário."), 422, { requestId });
    }
    if (valores[chave] === true && !papelAlcanca(papel, p.piso)) {
      return fail("validation_failed", t("Essa permissão não vale para o papel do usuário."), 422, { requestId });
    }
  }
  const agora = new Date().toISOString();
  const gravar = chaves.filter((c) => valores[c] !== null).map((chave) => ({ organization_id: authz.org.orgId, user_id, chave, ligado: valores[chave] as boolean, atualizado_por: authz.user.id, updated_at: agora }));
  const apagar = chaves.filter((c) => valores[c] === null);
  if (gravar.length > 0) {
    const { error } = await supabase.from("crm_permissoes_de_atendimento").upsert(gravar, { onConflict: "organization_id,user_id,chave" });
    if (error) return fail("internal_error", error.message, 500, { requestId });
  }
  if (apagar.length > 0) {
    const { error } = await supabase.from("crm_permissoes_de_atendimento").delete().eq("organization_id", authz.org.orgId).eq("user_id", user_id).in("chave", apagar);
    if (error) return fail("internal_error", error.message, 500, { requestId });
  }
  void audit({ action: "crm_permissoes.updated", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "user", resourceId: user_id, requestId, metadata: { valores } });
  return ok({ excecoes: await lerExcecoes(supabase, authz.org.orgId, user_id) }, { requestId });
}

/** O grupo mudou (N6): as exceções saem e vale o papel novo. */
export async function DELETE(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const userId = lerUuid(new URL(req.url).searchParams.get("user_id"));
  if (!userId) return fail("validation_failed", "user_id inválido", 422, { requestId });
  const { error } = await (await createClient()).from("crm_permissoes_de_atendimento").delete().eq("organization_id", authz.org.orgId).eq("user_id", userId);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  void audit({ action: "crm_permissoes.reset", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "user", resourceId: userId, requestId });
  return noContent(requestId);
}
```

O teste de leitura usa a primeira tabela que o `maybeSingle` encontra; no `PUT` a ordem é `user_organizations` (o papel) e depois as escritas; no fim, `lerExcecoes` lê `crm_permissoes_de_atendimento` (no teste, a linha montada).

Create `app/api/v1/usuarios-da-casca/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * O que a lista "Usuários e Permissões" (c40) precisa além do `/api/v1/team`
 * do original: os setores de cada pessoa (a aba Geral) e se ela tem exceção
 * ("Personalizado" na coluna PERMISSÕES DE ATENDIMENTO).
 */
export async function GET(_req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const supabase = await createClient();
  const [membros, excecoes] = await Promise.all([
    supabase.from("crm_setores_membros").select("user_id, setor_id").eq("organization_id", authz.org.orgId),
    supabase.from("crm_permissoes_de_atendimento").select("user_id, chave").eq("organization_id", authz.org.orgId),
  ]);
  if (membros.error) return fail("internal_error", membros.error.message, 500, { requestId });
  if (excecoes.error) return fail("internal_error", excecoes.error.message, 500, { requestId });
  const saida: Record<string, { setores: string[]; excecoes: number }> = {};
  const de = (id: string) => (saida[id] ??= { setores: [], excecoes: 0 });
  for (const m of (membros.data ?? []) as Array<{ user_id: string; setor_id: string }>) de(m.user_id).setores.push(m.setor_id);
  for (const e of (excecoes.data ?? []) as Array<{ user_id: string }>) de(e.user_id).excecoes += 1;
  return ok(saida, { requestId });
}
```

Create `app/api/v1/usuarios-da-casca/[user_id]/setores/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ user_id: string }> };
const corpoSchema = z.object({ setor_ids: z.array(z.string().uuid()).max(100) });

/** "Setores" da aba Geral do usuário (c91): troca os setores da pessoa. A RLS exige "Editar ou excluir setores". */
export async function PUT(req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "team" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const userId = lerUuid((await ctx.params).user_id);
  if (!userId) return fail("not_found", t("Usuário não encontrado."), 404, { requestId });
  const lido = await lerJson(req);
  const parsed = corpoSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const supabase = await createClient();
  const apagar = await supabase.from("crm_setores_membros").delete().eq("organization_id", authz.org.orgId).eq("user_id", userId);
  if (apagar.error) return fail("internal_error", apagar.error.message, 500, { requestId });
  if (parsed.data.setor_ids.length > 0) {
    const inserir = await supabase
      .from("crm_setores_membros")
      .insert([...new Set(parsed.data.setor_ids)].map((setor_id) => ({ organization_id: authz.org.orgId, setor_id, user_id: userId })));
    if (inserir.error) {
      if (inserir.error.code === "23503") return fail("not_found", t("Setor não encontrado."), 404, { requestId });
      return fail("internal_error", inserir.error.message, 500, { requestId });
    }
  }
  return noContent(requestId);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-permissoes-rotas.test.ts && corepack pnpm prettier --write app/api/v1/permissoes-de-atendimento app/api/v1/usuarios-da-casca tests/unit/escale-permissoes-rotas.test.ts && corepack pnpm eslint app/api/v1/permissoes-de-atendimento app/api/v1/usuarios-da-casca && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/permissoes-de-atendimento app/api/v1/usuarios-da-casca tests/unit/escale-permissoes-rotas.test.ts
git commit -m "feat(escale): rotas de permissões por pessoa e dos setores de cada usuário (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: As rotas de respostas rápidas (lista, criar, editar, excluir, as da conversa)

**Files:**
- Create: `lib/escale/conversas/respostas-banco.ts`, `app/api/v1/respostas-rapidas/route.ts`, `app/api/v1/respostas-rapidas/[id]/route.ts`, `app/api/v1/respostas-rapidas/da-conversa/route.ts`, `tests/unit/escale-respostas-rapidas-rotas.test.ts`

**Interfaces:**
- Consumes: `respostaSchema`, `RespostaLida`, `respostaServe`, `canalDaConversa`, `FILTRO_PESSOAIS`, `FILTRO_TODOS` (Task 1); `pode`, `setorEfetivo` (Task 4); `createAdminClient` (`lib/supabase/admin`).
- Produces:
  - `respostas-banco.ts`: `lerRespostas(db, orgId, filtro?: { ids?: string[] }) → RespostaLida[]` (templates + extras + setores; sem extras = os dois canais, todos os setores); `gravarExtras(db, orgId, templateId, r: NovaResposta)`.
  - `GET /api/v1/respostas-rapidas?busca&setor&pagina&por_pagina` (agente+) → `{ data: RespostaLida[], meta: { total, pagina, por_pagina } }` (`setor` = `todos` | `pessoais` | uuid).
  - `POST` (`respostaSchema`) → 201 `{ data: { id } }`; compartilhar sem ser gerente: grava pelo service role depois de `fn_crm_pode('CHAT_SHARE_QUICK_RESPONSE')`, senão 403.
  - `PATCH /api/v1/respostas-rapidas/[id]` / `DELETE` → a própria (sessão); a compartilhada (gerente, sessão); a de outra pessoa ou a compartilhada sem ser gerente com "Editar ou excluir respostas rápidas" (service role); senão 403.
  - `GET /api/v1/respostas-rapidas/da-conversa?conversation_id=&setor=` → `{ data: { respostas: RespostaLida[], setorDaConversa: string | null, podeOutrosSetores: boolean } }` (só as do canal e do setor, N14).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-respostas-rapidas-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as EXCLUIR, PATCH as EDITAR } from "@/app/api/v1/respostas-rapidas/[id]/route";
import { GET as DA_CONVERSA } from "@/app/api/v1/respostas-rapidas/da-conversa/route";
import { GET as LISTAR, POST as CRIAR } from "@/app/api/v1/respostas-rapidas/route";
import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

const T1 = "f0000000-0000-4000-8000-000000000001";
const S1 = "a0000000-0000-4000-8000-000000000001";
const CV = "c0000000-0000-4000-8000-000000000001";
const OUTRO = "b0000000-0000-4000-8000-000000000009";
const tpl = (extra: Record<string, unknown> = {}) => ({ id: T1, organization_id: ORG_ID, owner_user_id: USER_ID, title: "oi", body: "Olá", shortcut: "oi", created_by_user_id: USER_ID, updated_at: "2026-10-18T10:00:00Z", ...extra });
function usar(tabelas: Parameters<typeof bancoPorTabela>[0], pode: Record<string, boolean> = {}) {
  const sessao = bancoPorTabela(tabelas, { rpc: (nome, args) => (nome === "fn_crm_pode" ? { data: pode[(args as { p_chave: string }).p_chave] ?? false, error: null } : { data: null, error: null }) });
  const admin = bancoPorTabela(tabelas);
  vi.mocked(createClient).mockResolvedValue(sessao.db as never);
  vi.mocked(createAdminClient).mockReturnValue(admin.db as never);
  return { sessao, admin };
}
const req = (metodo: string, url: string, corpo?: unknown) => new NextRequest(url, { method: metodo, ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}) } as never);
const nova = { atalho: "oi", corpo: "Olá {{nome}}", canais: ["whatsapp"], compartilhar: false, todos_os_setores: false, setores: [S1] };

beforeEach(() => {
  vi.mocked(audit).mockClear();
  authOk("agent");
});

describe("listar", () => {
  it("junta extras e setores; sem extras = os dois canais e todos os setores; filtra por setor", async () => {
    usar({
      message_templates: [tpl(), tpl({ id: "t2", owner_user_id: null, shortcut: "tchau", title: "tchau", body: "Tchau" })],
      crm_respostas_rapidas_extras: [{ template_id: T1, canais: ["whatsapp"], todos_os_setores: false }],
      crm_respostas_rapidas_setores: [{ template_id: T1, setor_id: S1 }],
    });
    const r = await LISTAR(req("GET", "http://x/api/v1/respostas-rapidas?pagina=1&por_pagina=10"));
    const { data, meta } = (await r.json()) as { data: Array<Record<string, unknown>>; meta: unknown };
    expect(data[0]).toMatchObject({ id: T1, atalho: "oi", corpo: "Olá", canais: ["whatsapp"], compartilhada: false, todos_os_setores: false, setores: [S1] });
    expect(data[1]).toMatchObject({ id: "t2", canais: ["whatsapp", "instagram"], compartilhada: true, todos_os_setores: true, setores: [] });
    expect(meta).toEqual({ total: 2, pagina: 1, por_pagina: 10 });
    const p = await LISTAR(req("GET", "http://x/api/v1/respostas-rapidas?setor=pessoais"));
    expect(((await p.json()) as { data: unknown[] }).data).toHaveLength(1);
  });
});

describe("criar", () => {
  it("a própria pela sessão com extras e setores; compartilhar sem permissão → 403; com permissão → service role", async () => {
    const { sessao } = usar({ message_templates: [tpl()] });
    expect((await CRIAR(req("POST", "http://x", nova))).status).toBe(201);
    expect(sessao.escritas[0]).toMatchObject({ tabela: "message_templates", op: "insert", valores: { organization_id: ORG_ID, owner_user_id: USER_ID, title: "oi", shortcut: "oi", body: "Olá {{nome}}" } });
    expect(sessao.escritas.find((e) => e.tabela === "crm_respostas_rapidas_extras")!.valores).toMatchObject({ template_id: T1, canais: ["whatsapp"], todos_os_setores: false });
    expect(sessao.escritas.find((e) => e.tabela === "crm_respostas_rapidas_setores" && e.op === "insert")!.valores).toEqual([{ template_id: T1, setor_id: S1, organization_id: ORG_ID }]);
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({ action: "quick_reply.created" });
    usar({ message_templates: [tpl()] }, { CHAT_SHARE_QUICK_RESPONSE: false });
    expect((await CRIAR(req("POST", "http://x", { ...nova, compartilhar: true }))).status).toBe(403);
    const { admin } = usar({ message_templates: [tpl({ owner_user_id: null })] }, { CHAT_SHARE_QUICK_RESPONSE: true });
    expect((await CRIAR(req("POST", "http://x", { ...nova, compartilhar: true }))).status).toBe(201);
    expect(admin.escritas[0]).toMatchObject({ tabela: "message_templates", valores: { owner_user_id: null } });
  });
});

describe("editar e excluir", () => {
  it("a própria pela sessão; a de outra pessoa só com 'Editar ou excluir respostas rápidas'", async () => {
    const { sessao } = usar({ message_templates: [tpl()] });
    expect((await EDITAR(req("PATCH", "http://x", nova), { params: Promise.resolve({ id: T1 }) })).status).toBe(200);
    expect(sessao.escritas[0]).toMatchObject({ tabela: "message_templates", op: "update" });
    usar({ message_templates: [tpl({ owner_user_id: OUTRO })] }, { CHAT_EDIT_QUICK_RESPONSE: false });
    expect((await EXCLUIR(req("DELETE", "http://x"), { params: Promise.resolve({ id: T1 }) })).status).toBe(403);
    const { admin } = usar({ message_templates: [tpl({ owner_user_id: OUTRO })] }, { CHAT_EDIT_QUICK_RESPONSE: true });
    expect((await EXCLUIR(req("DELETE", "http://x"), { params: Promise.resolve({ id: T1 }) })).status).toBe(204);
    expect(admin.escritas[0]).toMatchObject({ tabela: "message_templates", op: "delete" });
  });
});

describe("as da conversa", () => {
  it("só as do canal e do setor efetivo, mais as de todos os setores", async () => {
    usar(
      {
        conversations: [{ id: CV, organization_id: ORG_ID, channel_session_id: "cs", channel_sessions: { provider: "waha", social_platform: null } }],
        crm_setor_da_conversa: [],
        crm_setor_do_dispositivo: [{ channel_session_id: "cs", setor_id: "outro-setor" }],
        message_templates: [tpl(), tpl({ id: "t2", owner_user_id: null })],
        crm_respostas_rapidas_extras: [{ template_id: T1, canais: ["whatsapp"], todos_os_setores: false }],
        crm_respostas_rapidas_setores: [{ template_id: T1, setor_id: S1 }],
      },
      { CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS: true },
    );
    const r = await DA_CONVERSA(req("GET", `http://x?conversation_id=${CV}`));
    const { data } = (await r.json()) as { data: { respostas: Array<{ id: string }>; setorDaConversa: string; podeOutrosSetores: boolean } };
    expect(data.respostas.map((x) => x.id)).toEqual(["t2"]);
    expect(data.setorDaConversa).toBe("outro-setor");
    expect(data.podeOutrosSetores).toBe(true);
    const r2 = await DA_CONVERSA(req("GET", `http://x?conversation_id=${CV}&setor=${S1}`));
    expect(((await r2.json()) as { data: { respostas: Array<{ id: string }> } }).data.respostas.map((x) => x.id)).toEqual([T1, "t2"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-respostas-rapidas-rotas.test.ts`
Expected: FAIL.

- [ ] **Step 3: O banco das respostas**

Create `lib/escale/conversas/respostas-banco.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { CANAIS_DA_RESPOSTA, type CanalDaResposta, type NovaResposta, type RespostaLida } from "./respostas";

const COLUNAS = "id, organization_id, owner_user_id, title, body, shortcut, created_by_user_id, updated_at";

/**
 * AS RESPOSTAS RÁPIDAS (fork Escale, Fase 3C; E6). O template do original mais
 * os extras do fork. Pela sessão, a RLS do original decide o que aparece
 * (compartilhadas + as próprias); pelo service role, só depois da permissão.
 */
export async function lerRespostas(db: SupabaseClient, orgId: string, filtro: { ids?: string[] } = {}): Promise<RespostaLida[]> {
  let q = db.from("message_templates").select(COLUNAS).eq("organization_id", orgId).order("shortcut", { ascending: true });
  if (filtro.ids) q = q.in("id", filtro.ids);
  const { data, error } = await q;
  if (error) throw error;
  const templates = (data ?? []) as Array<{ id: string; owner_user_id: string | null; title: string; body: string; shortcut: string | null; created_by_user_id: string | null; updated_at: string }>;
  if (templates.length === 0) return [];
  const ids = templates.map((x) => x.id);
  const [extras, setores] = await Promise.all([
    db.from("crm_respostas_rapidas_extras").select("template_id, canais, todos_os_setores").eq("organization_id", orgId).in("template_id", ids),
    db.from("crm_respostas_rapidas_setores").select("template_id, setor_id").eq("organization_id", orgId).in("template_id", ids),
  ]);
  if (extras.error) throw extras.error;
  if (setores.error) throw setores.error;
  const ex = new Map(((extras.data ?? []) as Array<{ template_id: string; canais: CanalDaResposta[]; todos_os_setores: boolean }>).map((e) => [e.template_id, e]));
  const se = (setores.data ?? []) as Array<{ template_id: string; setor_id: string }>;
  return templates.map((x) => {
    const e = ex.get(x.id);
    return {
      id: x.id,
      atalho: x.shortcut ?? x.title,
      corpo: x.body,
      canais: e?.canais ?? [...CANAIS_DA_RESPOSTA],
      compartilhada: x.owner_user_id === null,
      todos_os_setores: e?.todos_os_setores ?? true,
      setores: se.filter((s) => s.template_id === x.id).map((s) => s.setor_id),
      dono: x.owner_user_id,
      criada_por: x.created_by_user_id,
      atualizada_em: x.updated_at,
    };
  });
}

/** Grava os extras e troca os setores de uma resposta. */
export async function gravarExtras(db: SupabaseClient, orgId: string, templateId: string, r: NovaResposta): Promise<void> {
  const extras = await db
    .from("crm_respostas_rapidas_extras")
    .upsert({ template_id: templateId, organization_id: orgId, canais: r.canais, todos_os_setores: r.todos_os_setores }, { onConflict: "template_id" });
  if (extras.error) throw extras.error;
  const apagar = await db.from("crm_respostas_rapidas_setores").delete().eq("organization_id", orgId).eq("template_id", templateId);
  if (apagar.error) throw apagar.error;
  if (r.todos_os_setores || r.setores.length === 0) return;
  const inserir = await db
    .from("crm_respostas_rapidas_setores")
    .insert([...new Set(r.setores)].map((setor_id) => ({ template_id: templateId, setor_id, organization_id: orgId })));
  if (inserir.error) throw inserir.error;
}
```

O teste de "criar" espera o `upsert` dos extras na sessão; o `bancoPorTabela` registra `upsert` com `op: "upsert"` — o teste procura por `tabela`, então vale.

- [ ] **Step 4: As rotas**

Create `app/api/v1/respostas-rapidas/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast } from "@/lib/auth/types";
import { gravarExtras, lerRespostas } from "@/lib/escale/conversas/respostas-banco";
import { FILTRO_PESSOAIS, FILTRO_TODOS, respostaSchema } from "@/lib/escale/conversas/respostas";
import { pode } from "@/lib/escale/conversas/setores-banco";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const listaSchema = z.object({
  busca: z.string().trim().max(100).optional(),
  setor: z.string().max(40).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  por_pagina: z.coerce.number().int().min(1).max(50).default(10),
});

/** A tabela de Respostas rápidas (c41): busca no atalho e no conteúdo, filtro Setor, paginação. */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "message_templates" });
  if (!authz.ok) return authz.response;
  const url = new URL(req.url);
  const parsed = listaSchema.safeParse({
    busca: url.searchParams.get("busca") ?? undefined,
    setor: url.searchParams.get("setor") ?? undefined,
    pagina: url.searchParams.get("pagina") ?? undefined,
    por_pagina: url.searchParams.get("por_pagina") ?? undefined,
  });
  if (!parsed.success) return fail("validation_failed", "Filtro inválido.", 422, { requestId });
  const f = parsed.data;
  try {
    const todas = await lerRespostas(await createClient(), authz.org.orgId);
    const termo = f.busca?.toLocaleLowerCase("pt-BR") ?? "";
    const filtradas = todas.filter((r) => {
      if (termo && !r.atalho.toLocaleLowerCase("pt-BR").includes(termo) && !r.corpo.toLocaleLowerCase("pt-BR").includes(termo)) return false;
      if (!f.setor || f.setor === FILTRO_TODOS) return true;
      if (f.setor === FILTRO_PESSOAIS) return r.dono === authz.user.id;
      return r.todos_os_setores || r.setores.includes(f.setor);
    });
    const inicio = (f.pagina - 1) * f.por_pagina;
    return ok(filtradas.slice(inicio, inicio + f.por_pagina), { requestId, meta: { total: filtradas.length, pagina: f.pagina, por_pagina: f.por_pagina } });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}

/** "Salvar" de "Criar Resposta rápida" (c96). */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "message_templates" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  const parsed = respostaSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const r = parsed.data;
  const sessao = await createClient();
  // Compartilhar é do gerente no original; com a exceção da Clint, o fork grava pelo service role.
  let db = sessao;
  if (r.compartilhar && !roleAtLeast(authz.org.role, "manager")) {
    if (!(await pode(sessao, authz.org.orgId, "CHAT_SHARE_QUICK_RESPONSE"))) {
      return fail("forbidden", t("Você não pode compartilhar respostas rápidas."), 403, { requestId });
    }
    db = createAdminClient();
  }
  const { data, error } = await db
    .from("message_templates")
    .insert({ organization_id: authz.org.orgId, owner_user_id: r.compartilhar ? null : authz.user.id, title: r.atalho, shortcut: r.atalho, body: r.corpo, created_by_user_id: authz.user.id })
    .select("id")
    .single();
  if (error) return fail(error.code === "42501" ? "forbidden" : "internal_error", error.message, error.code === "42501" ? 403 : 500, { requestId });
  const id = (data as { id: string }).id;
  try {
    await gravarExtras(db, authz.org.orgId, id, r);
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
  void audit({ action: "quick_reply.created", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "message_template", resourceId: id, requestId, metadata: { compartilhada: r.compartilhar, canais: r.canais } });
  return ok({ id }, { requestId, status: 201 });
}
```

Create `app/api/v1/respostas-rapidas/[id]/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole, type RoleCheck } from "@/lib/auth/require-role";
import { roleAtLeast } from "@/lib/auth/types";
import { gravarExtras } from "@/lib/escale/conversas/respostas-banco";
import { respostaSchema } from "@/lib/escale/conversas/respostas";
import { pode } from "@/lib/escale/conversas/setores-banco";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
type Ok = Extract<RoleCheck, { ok: true }>;

/**
 * Quem mexe numa resposta (N14): a própria, pela sessão; a compartilhada, o
 * gerente pela sessão; a de outra pessoa (ou a compartilhada sem ser gerente),
 * quem tem "Editar ou excluir respostas rápidas", pelo service role.
 */
async function escolherCliente(authz: Ok, sessao: SupabaseClient, id: string): Promise<SupabaseClient | "nao_achou" | "proibido"> {
  const { data } = await createAdminClient().from("message_templates").select("id, owner_user_id").eq("organization_id", authz.org.orgId).eq("id", id).maybeSingle();
  if (!data) return "nao_achou";
  const dono = (data as { owner_user_id: string | null }).owner_user_id;
  if (dono === authz.user.id) return sessao;
  if (dono === null && roleAtLeast(authz.org.role, "manager")) return sessao;
  return (await pode(sessao, authz.org.orgId, "CHAT_EDIT_QUICK_RESPONSE")) ? createAdminClient() : "proibido";
}

async function preparar(ctx: Ctx) {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return { erro: supportDenied } as const;
  const authz = await requireRole("agent", { requestId, resource: "message_templates" });
  if (!authz.ok) return { erro: authz.response } as const;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const id = lerUuid((await ctx.params).id);
  if (!id) return { erro: fail("not_found", t("Resposta não encontrada."), 404, { requestId }) } as const;
  const db = await escolherCliente(authz, await createClient(), id);
  if (db === "nao_achou") return { erro: fail("not_found", t("Resposta não encontrada."), 404, { requestId }) } as const;
  if (db === "proibido") return { erro: fail("forbidden", t("Você não pode editar respostas rápidas de outros usuários."), 403, { requestId }) } as const;
  return { requestId, authz, t, id, db } as const;
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  const p = await preparar(ctx);
  if ("erro" in p) return p.erro;
  const { requestId, authz, t, id, db } = p;
  const lido = await lerJson(req);
  const parsed = respostaSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const r = parsed.data;
  if (r.compartilhar && !roleAtLeast(authz.org.role, "manager") && !(await pode(await createClient(), authz.org.orgId, "CHAT_SHARE_QUICK_RESPONSE"))) {
    return fail("forbidden", t("Você não pode compartilhar respostas rápidas."), 403, { requestId });
  }
  const { error } = await db
    .from("message_templates")
    .update({ title: r.atalho, shortcut: r.atalho, body: r.corpo, owner_user_id: r.compartilhar ? null : authz.user.id, updated_at: new Date().toISOString() })
    .eq("organization_id", authz.org.orgId)
    .eq("id", id);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  try {
    await gravarExtras(db, authz.org.orgId, id, r);
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
  void audit({ action: "quick_reply.updated", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "message_template", resourceId: id, requestId });
  return ok({ id }, { requestId });
}

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const p = await preparar(ctx);
  if ("erro" in p) return p.erro;
  const { requestId, authz, id, db } = p;
  const { error } = await db.from("message_templates").delete().eq("organization_id", authz.org.orgId).eq("id", id);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  void audit({ action: "quick_reply.deleted", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "message_template", resourceId: id, requestId });
  return noContent(requestId);
}
```

Editar uma compartilhada mantém `owner_user_id` nulo só se `compartilhar` vier `true`; desmarcar "Compartilhar" numa resposta de outra pessoa a torna de quem editou — é o comportamento da Clint (quem salva vira o dono da pessoal).

Create `app/api/v1/respostas-rapidas/da-conversa/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerRespostas } from "@/lib/escale/conversas/respostas-banco";
import { canalDaConversa, respostaServe } from "@/lib/escale/conversas/respostas";
import { pode, setorEfetivo } from "@/lib/escale/conversas/setores-banco";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** O painel de respostas do compositor (c09, N14): as do canal e do setor da conversa. */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "message_templates" });
  if (!authz.ok) return authz.response;
  const url = new URL(req.url);
  const conversationId = lerUuid(url.searchParams.get("conversation_id"));
  if (!conversationId) return fail("validation_failed", "conversation_id inválido", 422, { requestId });
  const supabase = await createClient();
  try {
    const { data: conversa } = await supabase
      .from("conversations")
      .select("id, channel_session_id, channel_sessions:channel_session_id ( provider, social_platform )")
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversationId)
      .maybeSingle();
    if (!conversa) return fail("not_found", "Conversa não encontrada.", 404, { requestId });
    const c = conversa as { id: string; channel_session_id: string; channel_sessions: { provider: string | null; social_platform: string | null } | null };
    const [{ setorId }, podeOutrosSetores, todas] = await Promise.all([
      setorEfetivo(supabase, authz.org.orgId, c),
      pode(supabase, authz.org.orgId, "CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS"),
      lerRespostas(supabase, authz.org.orgId),
    ]);
    const pedido = lerUuid(url.searchParams.get("setor"));
    const setorEscolhido = podeOutrosSetores ? pedido : null;
    const canal = canalDaConversa(c.channel_sessions);
    const respostas = todas.filter((r) => respostaServe(r, { canal, setorDaConversa: setorId, setorEscolhido }));
    return ok({ respostas, setorDaConversa: setorId, podeOutrosSetores }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

`ok(..., { meta })`: confira em `lib/api/wrappers.ts` se `ok` aceita `meta` (a 3B usa a mesma forma na lista de agendadas); se não, devolva `{ data, meta }` como o original faz em `app/api/v1/conversations/route.ts`.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-respostas-rapidas-rotas.test.ts && corepack pnpm prettier --write app/api/v1/respostas-rapidas lib/escale/conversas/respostas-banco.ts tests/unit/escale-respostas-rapidas-rotas.test.ts && corepack pnpm eslint app/api/v1/respostas-rapidas lib/escale/conversas/respostas-banco.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/v1/respostas-rapidas lib/escale/conversas/respostas-banco.ts tests/unit/escale-respostas-rapidas-rotas.test.ts
git commit -m "feat(escale): rotas de respostas rápidas com canais, setores e compartilhamento (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: Os hooks da fase

**Files:**
- Create: `hooks/escale/useSetores.ts`, `hooks/escale/usePermissoesDeAtendimento.ts`, `hooks/escale/useUsuariosDaCasca.ts`, `hooks/escale/useRespostasRapidas.ts`, `hooks/escale/useDispositivosDaCasca.ts`, `tests/unit/escale-setores-hooks.test.tsx`

**Interfaces (Produces):**
- `useSetores.ts`: `useSetores()` → `UseQueryResult<SetorLido[]>` (chave `["setores"]`); `useSalvarSetor()` (mutation `{ id?: string } & NovoSetor` → POST ou PATCH); `useRemoverSetor()` (mutation `id`); `useSetorDoDispositivo()` (mutation `{ channel_session_id, setor_id }`); `useSetoresDasConversas(ids)` → `Record<string, SetorDaConversa>` (vazio enquanto carrega; chave `["setores-das-conversas", ids ordenados]`); `useAlterarSetor(conversationId)` → `{ alterar: UseMutationResult<…, string>, cancelar: UseMutationResult }`; `useLiberarDeOutro()` (mutation `conversationId`). Todas as mutations invalidam `["setores"]`, `["setores-das-conversas"]` e, as da conversa, `["conversations"]`, `["conversation", id]`, `["eventos-da-conversa", id]`.
- `usePermissoesDeAtendimento.ts`: `useMinhasPermissoes()` → `Partial<Record<ChaveDePermissao, boolean>>`; `usePermissoesDoUsuario(userId)` → `UseQueryResult<{ excecoes: Excecoes }>`; `useGravarPermissoes()` (mutation `{ user_id, valores }`); `useResetarPermissoes()` (mutation `userId`).
- `useUsuariosDaCasca.ts`: `useUsuariosDaCasca(enabled)` → `Record<string, { setores: string[]; excecoes: number }>`; `useGravarSetoresDoUsuario()` (mutation `{ userId, setorIds }`).
- `useRespostasRapidas.ts`: `useRespostasRapidas(filtros: { busca?; setor?; pagina; por_pagina })` → `UseQueryResult<{ data: RespostaLida[]; meta }>`; `useSalvarResposta()` (mutation `{ id?: string } & NovaResposta`); `useExcluirResposta()`; `useRespostasDaConversa(conversationId, setor)` → `UseQueryResult<{ respostas; setorDaConversa; podeOutrosSetores }>`.
- `useDispositivosDaCasca.ts`: `useRoteamentoDosCanais(enabled)` → `UseQueryResult<ChannelRoutingSettings>` (chave `["channel-routing-settings"]`, a mesma do `ConnectionsClient` do original); `useGravarRoteamento()` (mutation `{ channel_session_id, user_ids }`; o erro `mfa_required` vira o toast "Confirme a verificação em duas etapas."); `useRenomearDispositivo()` e `useExcluirDispositivo()` (as rotas do original; invalidam `["channel-sessions"]`).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-setores-hooks.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useGravarRoteamento } from "@/hooks/escale/useDispositivosDaCasca";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useRespostasRapidas } from "@/hooks/escale/useRespostasRapidas";
import { useAlterarSetor, useSalvarSetor, useSetoresDasConversas } from "@/hooks/escale/useSetores";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }, showApiError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
const CV = "c0000000-0000-4000-8000-000000000001";

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const m of ["get", "post", "patch", "put", "delete"] as const) vi.mocked(apiClient[m]).mockReset();
});

describe("setores", () => {
  it("salvar sem id cria, com id edita; invalida a lista", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "s1" } });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: "s1" } });
    const inv = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useSalvarSetor(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ nome: "A", cor: "#000000", membros: [] }); });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/setores", { nome: "A", cor: "#000000", membros: [] });
    await act(async () => { await result.current.mutateAsync({ id: "s1", nome: "B", cor: "#000000", membros: [] }); });
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/setores/s1", { nome: "B", cor: "#000000", membros: [] });
    expect(inv).toHaveBeenCalledWith({ queryKey: ["setores"] });
  });
  it("setores das conversas com ids ordenados; vazio sem ids", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { b: { setor: null, em_transferencia: false, setor_anterior: null } } });
    const { result } = renderHook(() => useSetoresDasConversas(["b", "a"]), { wrapper });
    await waitFor(() => expect(Object.keys(result.current)).toEqual(["b"]));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/setores/das-conversas?ids=a%2Cb");
    expect(renderHook(() => useSetoresDasConversas([]), { wrapper }).result.current).toEqual({});
  });
  it("alterar e cancelar o setor da conversa", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    vi.mocked(apiClient.delete).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAlterarSetor(CV), { wrapper });
    await act(async () => { await result.current.alterar.mutateAsync("s2"); });
    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/conversas-da-casca/${CV}/setor`, { setor_id: "s2" });
    await act(async () => { await result.current.cancelar.mutateAsync(); });
    expect(apiClient.delete).toHaveBeenCalledWith(`/api/v1/conversas-da-casca/${CV}/setor`);
  });
});

describe("permissões, respostas e roteamento", () => {
  it("as minhas permissões; a URL das respostas; o MFA do roteamento vira toast", async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
      url.includes("permissoes-de-atendimento") ? { data: { CHAT_VIEW_TEAM: true } } : { data: [], meta: { total: 0, pagina: 2, por_pagina: 10 } },
    );
    const p = renderHook(() => useMinhasPermissoes(), { wrapper });
    await waitFor(() => expect(p.result.current.CHAT_VIEW_TEAM).toBe(true));
    const r = renderHook(() => useRespostasRapidas({ busca: "oi", setor: "pessoais", pagina: 2, por_pagina: 10 }), { wrapper });
    await waitFor(() => expect(r.result.current.data?.meta.pagina).toBe(2));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/respostas-rapidas?busca=oi&setor=pessoais&pagina=2&por_pagina=10");
    vi.mocked(apiClient.patch).mockRejectedValue(Object.assign(new Error("x"), { status: 403, code: "mfa_required" }));
    const g = renderHook(() => useGravarRoteamento(), { wrapper });
    await act(async () => { await g.result.current.mutateAsync({ channel_session_id: "c", user_ids: [] }).catch(() => undefined); });
    expect(toast.error).toHaveBeenCalledWith("Confirme a verificação em duas etapas.");
  });
});
```

O `useT` é usado dentro de `useGravarRoteamento` para o toast; se o hook chamar `useT`, mocke `@/hooks/i18n/useT` com `() => (s: string) => s` no teste. Confira como `apiClient` expõe o código do erro (`ApiClientError` com `code`/`status` em `lib/api/client.ts`) e ajuste o `Object.assign` do teste ao formato real.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-setores-hooks.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Os hooks**

Create `hooks/escale/useSetores.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, showApiError } from "@/lib/api/client";
import type { SetorDaConversa } from "@/lib/escale/conversas/setores-banco";
import type { NovoSetor, SetorLido } from "@/lib/escale/conversas/setores";

export const CHAVE_DOS_SETORES = ["setores"] as const;
export const CHAVE_DOS_SETORES_DAS_CONVERSAS = ["setores-das-conversas"] as const;

/** Os setores da organização (fork Escale, Fase 3C; E1). */
export function useSetores(enabled = true) {
  return useQuery({
    queryKey: CHAVE_DOS_SETORES,
    enabled,
    queryFn: async () => apiClient.get<{ data: SetorLido[] }>("/api/v1/setores"),
    select: (r) => r.data,
    staleTime: 30_000,
  });
}

function useInvalidarSetores() {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: CHAVE_DOS_SETORES }), qc.invalidateQueries({ queryKey: CHAVE_DOS_SETORES_DAS_CONVERSAS })]);
  };
}

export function useSalvarSetor() {
  const invalidar = useInvalidarSetores();
  return useMutation({
    mutationFn: async ({ id, ...setor }: { id?: string } & NovoSetor) =>
      id ? apiClient.patch<{ data: { id: string } }>(`/api/v1/setores/${id}`, setor) : apiClient.post<{ data: { id: string } }>("/api/v1/setores", setor),
    onSuccess: invalidar,
    onError: showApiError,
  });
}

export function useRemoverSetor() {
  const invalidar = useInvalidarSetores();
  return useMutation({ mutationFn: async (id: string) => apiClient.delete(`/api/v1/setores/${id}`), onSuccess: invalidar, onError: showApiError });
}

export function useSetorDoDispositivo() {
  const qc = useQueryClient();
  const invalidar = useInvalidarSetores();
  return useMutation({
    mutationFn: async (args: { channel_session_id: string; setor_id: string | null }) => apiClient.put("/api/v1/setores/do-dispositivo", args),
    onSuccess: async () => { await Promise.all([invalidar(), qc.invalidateQueries({ queryKey: ["channel-sessions"] })]); },
    onError: showApiError,
  });
}

/** O chip da linha e o selo do cabeçalho (N16): uma chamada por página de ids. */
export function useSetoresDasConversas(conversationIds: readonly string[]): Record<string, SetorDaConversa> {
  const ids = [...new Set(conversationIds)].sort();
  const q = useQuery({
    queryKey: [...CHAVE_DOS_SETORES_DAS_CONVERSAS, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => apiClient.get<{ data: Record<string, SetorDaConversa> }>(`/api/v1/setores/das-conversas?ids=${encodeURIComponent(ids.join(","))}`),
    select: (r) => r.data,
    staleTime: 30_000,
  });
  return q.data ?? {};
}

function useInvalidarConversa(conversationId: string) {
  const qc = useQueryClient();
  const invalidar = useInvalidarSetores();
  return async () => {
    await Promise.all([
      invalidar(),
      qc.invalidateQueries({ queryKey: ["conversations"] }),
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] }),
      qc.invalidateQueries({ queryKey: ["eventos-da-conversa", conversationId] }),
    ]);
  };
}

/** "Alterar setor" e "Cancelar transferência" (C3, N7). */
export function useAlterarSetor(conversationId: string) {
  const invalidar = useInvalidarConversa(conversationId);
  const base = `/api/v1/conversas-da-casca/${conversationId}/setor`;
  const alterar = useMutation({ mutationFn: async (setorId: string) => apiClient.post(base, { setor_id: setorId }), onSuccess: invalidar, onError: showApiError });
  const cancelar = useMutation({ mutationFn: async () => apiClient.delete(base), onSuccess: invalidar, onError: showApiError });
  return { alterar, cancelar };
}

/** "Sem atendente" no atendimento de outra pessoa (N8). */
export function useLiberarDeOutro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => apiClient.post(`/api/v1/conversas-da-casca/${conversationId}/liberar`, {}),
    onSuccess: async (_d, conversationId) => {
      await Promise.all([qc.invalidateQueries({ queryKey: ["conversations"] }), qc.invalidateQueries({ queryKey: ["conversation", conversationId] })]);
    },
  });
}
```

`useLiberarDeOutro` não usa `showApiError`: o `SeletorDeAtendente` trata o 409 com o texto da Clint (como faz com o original na 3B).

Create `hooks/escale/usePermissoesDeAtendimento.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, showApiError } from "@/lib/api/client";
import type { ChaveDePermissao, Excecoes } from "@/lib/escale/conversas/permissoes";

/** As chaves editáveis da pessoa da sessão (fn_crm_pode). Vazio enquanto carrega = tudo desligado na tela. */
export function useMinhasPermissoes(): Partial<Record<ChaveDePermissao, boolean>> {
  const q = useQuery({
    queryKey: ["permissoes-de-atendimento", "minhas"],
    queryFn: async () => apiClient.get<{ data: Partial<Record<ChaveDePermissao, boolean>> }>("/api/v1/permissoes-de-atendimento/minhas"),
    select: (r) => r.data,
    staleTime: 60_000,
  });
  return q.data ?? {};
}

export function usePermissoesDoUsuario(userId: string | null) {
  return useQuery({
    queryKey: ["permissoes-de-atendimento", userId],
    enabled: !!userId,
    queryFn: async () => apiClient.get<{ data: { excecoes: Excecoes } }>(`/api/v1/permissoes-de-atendimento?user_id=${userId}`),
    select: (r) => r.data,
  });
}

export function useGravarPermissoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { user_id: string; valores: Partial<Record<ChaveDePermissao, boolean | null>> }) =>
      apiClient.put<{ data: { excecoes: Excecoes } }>("/api/v1/permissoes-de-atendimento", args),
    onSuccess: async (_d, args) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["permissoes-de-atendimento", args.user_id] }),
        qc.invalidateQueries({ queryKey: ["usuarios-da-casca"] }),
      ]);
    },
    onError: showApiError,
  });
}

export function useResetarPermissoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => apiClient.delete(`/api/v1/permissoes-de-atendimento?user_id=${userId}`),
    onSuccess: async (_d, userId) => {
      await Promise.all([qc.invalidateQueries({ queryKey: ["permissoes-de-atendimento", userId] }), qc.invalidateQueries({ queryKey: ["usuarios-da-casca"] })]);
    },
    onError: showApiError,
  });
}
```

Create `hooks/escale/useUsuariosDaCasca.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, showApiError } from "@/lib/api/client";

export type ExtrasDoUsuario = { setores: string[]; excecoes: number };

/** Setores e exceções de cada pessoa (a lista de c40 e a aba Geral). Só admin. */
export function useUsuariosDaCasca(enabled = true): Record<string, ExtrasDoUsuario> {
  const q = useQuery({
    queryKey: ["usuarios-da-casca"],
    enabled,
    queryFn: async () => apiClient.get<{ data: Record<string, ExtrasDoUsuario> }>("/api/v1/usuarios-da-casca"),
    select: (r) => r.data,
    staleTime: 30_000,
  });
  return q.data ?? {};
}

export function useGravarSetoresDoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { userId: string; setorIds: string[] }) => apiClient.put(`/api/v1/usuarios-da-casca/${args.userId}/setores`, { setor_ids: args.setorIds }),
    onSuccess: async () => {
      await Promise.all([qc.invalidateQueries({ queryKey: ["usuarios-da-casca"] }), qc.invalidateQueries({ queryKey: ["setores"] })]);
    },
    onError: showApiError,
  });
}
```

Create `hooks/escale/useRespostasRapidas.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, showApiError } from "@/lib/api/client";
import type { NovaResposta, RespostaLida } from "@/lib/escale/conversas/respostas";

export interface FiltrosDeRespostas {
  busca?: string;
  setor?: string;
  pagina: number;
  por_pagina: number;
}
export interface PaginaDeRespostas {
  data: RespostaLida[];
  meta: { total: number; pagina: number; por_pagina: number };
}

export function urlDasRespostas(f: FiltrosDeRespostas): string {
  const p = new URLSearchParams();
  if (f.busca?.trim()) p.set("busca", f.busca.trim());
  if (f.setor) p.set("setor", f.setor);
  p.set("pagina", String(f.pagina));
  p.set("por_pagina", String(f.por_pagina));
  return `/api/v1/respostas-rapidas?${p.toString()}`;
}

export function useRespostasRapidas(filtros: FiltrosDeRespostas) {
  const url = urlDasRespostas(filtros);
  return useQuery({ queryKey: ["respostas-rapidas", url], queryFn: async () => apiClient.get<PaginaDeRespostas>(url), staleTime: 15_000 });
}

function useInvalidarRespostas() {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["respostas-rapidas"] }),
      qc.invalidateQueries({ queryKey: ["respostas-da-conversa"] }),
      qc.invalidateQueries({ queryKey: ["message-templates"] }),
    ]);
  };
}

export function useSalvarResposta() {
  const invalidar = useInvalidarRespostas();
  return useMutation({
    mutationFn: async ({ id, ...r }: { id?: string } & NovaResposta) =>
      id ? apiClient.patch<{ data: { id: string } }>(`/api/v1/respostas-rapidas/${id}`, r) : apiClient.post<{ data: { id: string } }>("/api/v1/respostas-rapidas", r),
    onSuccess: invalidar,
    onError: showApiError,
  });
}

export function useExcluirResposta() {
  const invalidar = useInvalidarRespostas();
  return useMutation({ mutationFn: async (id: string) => apiClient.delete(`/api/v1/respostas-rapidas/${id}`), onSuccess: invalidar, onError: showApiError });
}

/** O painel do compositor (N14): só as do canal e do setor da conversa. */
export function useRespostasDaConversa(conversationId: string | null, setor: string | null, enabled = true) {
  return useQuery({
    queryKey: ["respostas-da-conversa", conversationId, setor],
    enabled: enabled && !!conversationId,
    queryFn: async () =>
      apiClient.get<{ data: { respostas: RespostaLida[]; setorDaConversa: string | null; podeOutrosSetores: boolean } }>(
        `/api/v1/respostas-rapidas/da-conversa?conversation_id=${conversationId}${setor ? `&setor=${setor}` : ""}`,
      ),
    select: (r) => r.data,
    staleTime: 30_000,
  });
}
```

Create `hooks/escale/useDispositivosDaCasca.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useT } from "@/hooks/i18n/useT";
import { apiClient, showApiError } from "@/lib/api/client";
import type { ChannelRoutingSettings } from "@/lib/routing/channel-policies";

/**
 * OS DISPOSITIVOS NA CASCA (fork Escale, Fase 3C; E2; N10) sobre as rotas do
 * original: os responsáveis por canal (0228; gerente + MFA) e as ações do
 * dispositivo (admin).
 */
export function useRoteamentoDosCanais(enabled = true) {
  return useQuery({
    queryKey: ["channel-routing-settings"],
    enabled,
    queryFn: async () => apiClient.get<{ data: ChannelRoutingSettings }>("/api/v1/settings/routing/channels"),
    select: (r) => r.data,
    retry: false,
    staleTime: 30_000,
  });
}

const ehMfa = (err: unknown) => (err as { code?: string }).code === "mfa_required";

export function useGravarRoteamento() {
  const t = useT();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { channel_session_id: string; user_ids: string[] }) =>
      apiClient.patch("/api/v1/settings/routing/channels", { ...args, reset: false }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["channel-routing-settings"] }); },
    onError: (err) => (ehMfa(err) ? toast.error(t("Confirme a verificação em duas etapas.")) : showApiError(err)),
  });
}

function useAcaoNoDispositivo<A>(fn: (args: A) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["channel-sessions"] }); }, onError: showApiError });
}

export const useRenomearDispositivo = () =>
  useAcaoNoDispositivo((a: { id: string; nome: string }) => apiClient.patch(`/api/v1/channel-sessions/${a.id}/name`, { display_name: a.nome }));
export const useExcluirDispositivo = () => useAcaoNoDispositivo((id: string) => apiClient.delete(`/api/v1/channel-sessions/${id}`));
```

O corpo do nome (`{ display_name }`) é o que `app/api/v1/channel-sessions/[id]/name/route.ts` valida.

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-setores-hooks.test.tsx && corepack pnpm prettier --write hooks/escale tests/unit/escale-setores-hooks.test.tsx && corepack pnpm eslint hooks/escale && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/escale tests/unit/escale-setores-hooks.test.tsx
git commit -m "feat(escale): hooks de setores, permissões, usuários, respostas rápidas e dispositivos (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: As configurações dentro da casca — a prop `configuracao`, o ⚙, a cabeça das telas e o hub

**Files:**
- Create: `components/escale/conversas/configuracoes/CabecaDaConfiguracao.tsx`, `components/escale/conversas/configuracoes/HubDeConfiguracoes.tsx`, `app/app/inbox/configuracoes/_casca.tsx`, `app/app/inbox/configuracoes/page.tsx`, `tests/unit/escale-hub-de-configuracoes.test.tsx`
- Modify: `components/escale/conversas/ConversasDaCasca.tsx` (prop `configuracao`), `components/escale/conversas/TopoDasConversas.tsx` (o ⚙ vira link), `app/app/inbox/configuracoes/mensagens-agendadas/page.tsx` e `components/escale/conversas/agendadas/TelaMensagensAgendadas.tsx` (dentro da casca), `lib/ui/icons-da-casca.ts`

**Interfaces:**
- Produces: `ConversasDaCasca({ initialSelectedId?, rascunho?, origens?, configuracao? })`; `CabecaDaConfiguracao({ migalhas: Array<{ rotulo: string; href?: string }>, fecharPara?: string })`; `HubDeConfiguracoes()`; `paginaDaConfiguracao(tela: ReactNode)` em `_casca.tsx` (server: gate do cookie + `origensDaPagina()` + `<ConversasDaCasca configuracao={tela} origens>`).

Abra c37 antes de escrever.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-hub-de-configuracoes.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CabecaDaConfiguracao } from "@/components/escale/conversas/configuracoes/CabecaDaConfiguracao";
import { HubDeConfiguracoes } from "@/components/escale/conversas/configuracoes/HubDeConfiguracoes";
import { gravarCanal } from "@/lib/notifications/prefs";

let papel = "admin";
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: papel } }) }));
vi.mock("@/lib/notifications/prefs", async (orig) => ({
  ...(await orig<typeof import("@/lib/notifications/prefs")>()),
  gravarCanal: vi.fn(),
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...p }: { href: string; children: React.ReactNode }) => <a href={href} {...p}>{children}</a> }));

beforeEach(() => {
  papel = "admin";
  vi.mocked(gravarCanal).mockClear();
});

describe("CabecaDaConfiguracao (c37)", () => {
  it("as migalhas com a última em negrito e o X", () => {
    render(<CabecaDaConfiguracao migalhas={[{ rotulo: "Conversas", href: "/app/inbox" }, { rotulo: "Configurações" }]} />);
    expect(screen.getByRole("link", { name: "Conversas" })).toHaveAttribute("href", "/app/inbox");
    expect(screen.getByText("Configurações")).toHaveClass("font-semibold");
    expect(screen.getByRole("link", { name: "Fechar" })).toHaveAttribute("href", "/app/inbox");
  });
});

describe("HubDeConfiguracoes (c37)", () => {
  it("os 9 cartões; 3 em breve; os links; o toggle de notificações grava in_app e push", () => {
    render(<HubDeConfiguracoes />);
    expect(screen.getByRole("link", { name: /Setores/ })).toHaveAttribute("href", "/app/inbox/configuracoes/setores");
    expect(screen.getByRole("link", { name: /Dispositivo/ })).toHaveAttribute("href", "/app/inbox/configuracoes/canais");
    expect(screen.getByText("Modelos de mensagem").closest("[aria-disabled]")).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("switch", { name: "Notificações" }));
    expect(gravarCanal).toHaveBeenCalledWith("message", "in_app", expect.any(Boolean));
    expect(gravarCanal).toHaveBeenCalledWith("message", "push", expect.any(Boolean));
  });
  it("Usuários e Permissões fica apagado para quem não é admin", () => {
    papel = "agent";
    render(<HubDeConfiguracoes />);
    expect(screen.getByText("Usuários e Permissões").closest("[aria-disabled]")).toHaveAttribute("aria-disabled", "true");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-hub-de-configuracoes.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Os ícones**

Em `lib/ui/icons-da-casca.ts`, no bloco da 3C (só os que faltam; confira com `grep`):

```ts
// FORK ESCALE · Fase 3C: setores, permissões e configurações.
export {
  AlertTriangle, Archive, BadgeCheck, BarChart3, Bell, Braces, Building2, CalendarClock, ChevronRight, Gift,
  MessageSquareHeart, Pencil, QrCode, ShieldCheck, Smartphone, SmartphoneNfc, Trash2, Unplug, Users, Workflow,
} from "lucide-react";
```

- [ ] **Step 4: A cabeça das telas e o hub**

Create `components/escale/conversas/configuracoes/CabecaDaConfiguracao.tsx`:

```tsx
"use client";
import Link from "next/link";
import { Fragment } from "react";

import { useT } from "@/hooks/i18n/useT";
import { X } from "@/lib/ui/icons-da-casca";

/** O cabeçalho de toda tela de configuração (c37–c41, c99): migalhas 13px e o X que volta à conversa. */
export function CabecaDaConfiguracao({
  migalhas,
  fecharPara = "/app/inbox",
}: {
  migalhas: ReadonlyArray<{ rotulo: string; href?: string }>;
  fecharPara?: string;
}) {
  const t = useT();
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-casca-borda px-6">
      <nav aria-label={t("Você está em")} className="flex min-w-0 items-center gap-2 text-[13px]">
        {migalhas.map((m, i) => {
          const ultima = i === migalhas.length - 1;
          return (
            <Fragment key={`${m.rotulo}-${i}`}>
              {i > 0 ? <span aria-hidden className="text-casca-suave">›</span> : null}
              {ultima || !m.href ? (
                <span className={ultima ? "truncate font-semibold text-casca-texto" : "text-casca-suave"}>{m.rotulo}</span>
              ) : (
                <Link href={m.href} className="truncate text-casca-suave hover:text-casca-texto">{m.rotulo}</Link>
              )}
            </Fragment>
          );
        })}
      </nav>
      <span className="flex-1" />
      <Link href={fecharPara} aria-label={t("Fechar")} className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia">
        <X size={18} aria-hidden />
      </Link>
    </header>
  );
}
```

Create `components/escale/conversas/configuracoes/HubDeConfiguracoes.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { CARTOES_DO_HUB, type CartaoDoHub, type IconeDoHub } from "@/lib/escale/conversas/hub";
import { assinarPrefs, getPrefsSnapshot, getPrefsSnapshotDoServidor, gravarCanal } from "@/lib/notifications/prefs";
import { BarChart3, Bell, Building2, CalendarClock, FileText, Instagram, MessageCircle, MessageSquareHeart, Smartphone, Users, Workflow } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CabecaDaConfiguracao } from "./CabecaDaConfiguracao";

const ICONE: Record<IconeDoHub, ReactNode> = {
  dispositivo: <Smartphone size={22} aria-hidden />,
  setores: <Building2 size={22} aria-hidden />,
  agendadas: <CalendarClock size={22} aria-hidden />,
  respostas: <MessageSquareHeart size={22} aria-hidden />,
  usuarios: <Users size={22} aria-hidden />,
  notificacoes: <Bell size={22} aria-hidden />,
  modelos: <FileText size={22} aria-hidden />,
  flows: <Workflow size={22} aria-hidden />,
  analise: <BarChart3 size={22} aria-hidden />,
};
const CARTAO = "flex min-h-[124px] gap-4 rounded-lg border border-casca-borda bg-white p-5 text-left transition-shadow";

function Conteudo({ c, direita }: { c: CartaoDoHub; direita?: ReactNode }) {
  const t = useT();
  return (
    <>
      <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-casca-marca-suave text-casca-marca">{ICONE[c.chave]}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-casca-texto">
          {t(c.titulo)}
          {c.chave === "dispositivo" ? (
            <span className="flex items-center gap-1" aria-hidden>
              <MessageCircle size={14} className="text-[color:var(--escale-status-ganho)]" />
              <Instagram size={14} className="text-casca-alerta" />
            </span>
          ) : null}
          {direita}
        </span>
        <span className="mt-1 line-clamp-3 block text-[13px] text-casca-suave">{t(c.descricao)}</span>
      </span>
    </>
  );
}

/**
 * O HUB ⚙ "CONVERSAS › CONFIGURAÇÕES" (c37; E5; N15): os 9 cartões em 3
 * colunas. Notificações tem o toggle (as de "Nova mensagem" do original) e o
 * cartão leva às preferências; Modelos, Flows e Análise ficam "Em breve".
 */
export function HubDeConfiguracoes() {
  const t = useT();
  const { activeOrg } = useAuth();
  const ehAdmin = activeOrg?.role === "admin";
  const prefs = useSyncExternalStore(assinarPrefs, getPrefsSnapshot, getPrefsSnapshotDoServidor);
  const notificacoesLigadas = prefs.message.in_app || prefs.message.push;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="hub-de-configuracoes">
      <CabecaDaConfiguracao migalhas={[{ rotulo: t("Conversas"), href: "/app/inbox" }, { rotulo: t("Configurações") }]} />
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="grid max-w-[1048px] grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {CARTOES_DO_HUB.map((c) => {
            const apagado = c.emBreve || (c.soAdmin && !ehAdmin);
            if (c.chave === "notificacoes") {
              return (
                <div key={c.chave} className={CARTAO}>
                  <Link href={c.destino!} className="flex min-w-0 flex-1 gap-4 hover:opacity-90">
                    <Conteudo c={c} />
                  </Link>
                  <InterruptorDaCasca
                    ligado={notificacoesLigadas}
                    aoMudar={(v) => {
                      gravarCanal("message", "in_app", v);
                      gravarCanal("message", "push", v);
                    }}
                    aria-label={t("Notificações")}
                  />
                </div>
              );
            }
            if (apagado || !c.destino) {
              return (
                <div key={c.chave} aria-disabled="true" title={c.emBreve ? t("Em breve") : t("Só administradores")} className={cn(CARTAO, "cursor-not-allowed opacity-50")}>
                  <Conteudo c={c} />
                </div>
              );
            }
            return (
              <Link key={c.chave} href={c.destino} className={cn(CARTAO, "hover:shadow-casca-painel")}>
                <Conteudo c={c} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

O `InterruptorDaCasca` renderiza `role="switch"` com o `aria-label` (confira em `components/escale/ui/InterruptorDaCasca.tsx`). Na Clint o toggle fica ao lado do título; aqui ele fica à direita do cartão (o título é parte do link): diferença de posição de 1 elemento, anotada para a conferência visual — se a conferência pedir, ponha o interruptor dentro do título com `e.preventDefault()` no clique.

- [ ] **Step 5: A casca com a configuração e o ⚙**

Em `components/escale/conversas/ConversasDaCasca.tsx` (3A):

1. A assinatura ganha `configuracao?: ReactNode` (import `type ReactNode` de `react`).
2. Com `configuracao`, escolher uma conversa sai da tela de configuração: no `selecionar`, logo no começo:

```tsx
      if (configuracao && id) {
        router.push(`/app/inbox?id=${id}`);
        return;
      }
```

(e `configuracao` entra nas dependências do `useCallback`).

3. A grade e as colunas da direita:

```tsx
        <div
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1",
            configuracao ? "md:grid-cols-[320px_minmax(0,1fr)]" : "md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_384px]",
          )}
        >
```

e, no lugar das duas colunas da direita (o centro e o painel) e da `Sheet`, quando `configuracao` existe:

```tsx
          {configuracao ? (
            <div className="hidden h-full min-h-0 min-w-0 md:block" data-testid="area-de-configuracao">
              {configuracao}
            </div>
          ) : (
            <>
              {/* … o centro, o painel e a Sheet de antes, sem mudança … */}
            </>
          )}
```

No celular (abaixo de `md`), com `configuracao`, a fila some e a configuração ocupa a tela: na coluna da fila, troque `colunas.lista` por `configuracao ? "hidden" : colunas.lista`, e a área de configuração perde o `hidden` (`className="h-full min-h-0 min-w-0"`).

Em `components/escale/conversas/TopoDasConversas.tsx` (3A), o ⚙ vira link:

```tsx
        <Link
          href="/app/inbox/configuracoes"
          aria-label={t("Configurações")}
          title={t("Configurações")}
          className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
        >
          <Settings size={16} aria-hidden />
        </Link>
```

(import `Link` de `next/link`; sai o `BotaoDaCasca` desligado).

- [ ] **Step 6: As páginas**

Create `app/app/inbox/configuracoes/_casca.tsx`:

```tsx
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ConversasDaCasca } from "@/components/escale/conversas/ConversasDaCasca";
import { origensDaPagina } from "@/lib/escale/contatos/origens-da-pagina";
import { lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";

/**
 * FORK ESCALE · Fase 3C (N9): toda tela de "Conversas › Configurações" é a
 * casca com a fila à esquerda e a tela no lugar do centro e do painel. Sem a
 * casca ligada, volta para o inbox do original.
 */
export async function paginaDaConfiguracao(tela: ReactNode) {
  if ((await lerPreferenciaDeMenu()) !== "topo") redirect("/app/inbox");
  const { origens } = await origensDaPagina();
  return <ConversasDaCasca configuracao={tela} origens={origens} />;
}
```

Confira os caminhos reais de `origensDaPagina` (2B/3A) e de `lerPreferenciaDeMenu` (como `app/app/inbox/page.tsx` da 3A chama os dois) e copie.

Create `app/app/inbox/configuracoes/page.tsx`:

```tsx
import { HubDeConfiguracoes } from "@/components/escale/conversas/configuracoes/HubDeConfiguracoes";

import { paginaDaConfiguracao } from "./_casca";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesDeConversasPage() {
  return paginaDaConfiguracao(<HubDeConfiguracoes />);
}
```

Em `app/app/inbox/configuracoes/mensagens-agendadas/page.tsx` (3B), o corpo passa a ser `return paginaDaConfiguracao(<TelaMensagensAgendadas />);` (import de `../_casca`). Em `components/escale/conversas/agendadas/TelaMensagensAgendadas.tsx` (3B), o `<header>` das migalhas e do X vira `<CabecaDaConfiguracao migalhas={[{ rotulo: t("Configurações"), href: "/app/inbox/configuracoes" }, { rotulo: t("Mensagens agendadas") }]} />` e o contêiner externo perde a altura própria (passa a `flex h-full min-h-0 flex-col bg-white`). O teste da 3B (`tests/unit/escale-mensagens-agendadas-tela.test.tsx`) procura "Configurações" e "Mensagens agendadas" — continua verde.

- [ ] **Step 7: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-hub-de-configuracoes.test.tsx tests/unit/escale-conversas-casca.test.tsx tests/unit/escale-mensagens-agendadas-tela.test.tsx && corepack pnpm prettier --write components/escale/conversas app/app/inbox/configuracoes lib/ui/icons-da-casca.ts && corepack pnpm eslint components/escale/conversas app/app/inbox/configuracoes && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/escale/conversas app/app/inbox/configuracoes lib/ui/icons-da-casca.ts tests/unit/escale-hub-de-configuracoes.test.tsx
git commit -m "feat(escale): configurações dentro da casca — o ⚙, as migalhas e o hub de 9 cartões (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: A tela de Setores e a janela "Crie um setor / Editar setor" (E1)

**Files:**
- Create: `components/escale/conversas/configuracoes/MenuDaLinhaDeConfiguracao.tsx`, `components/escale/conversas/configuracoes/MonogramaDoSetor.tsx`, `components/escale/conversas/configuracoes/FotoDaPessoa.tsx`, `components/escale/conversas/configuracoes/setores/TelaSetores.tsx`, `components/escale/conversas/configuracoes/setores/JanelaDoSetor.tsx`, `app/app/inbox/configuracoes/setores/page.tsx`, `tests/unit/escale-tela-setores.test.tsx`

**Interfaces:**
- Consumes: `useSetores`, `useSalvarSetor`, `useRemoverSetor` (Task 7); `useMinhasPermissoes` (Task 7); `useTeamMembers` (`hooks/team/useTeamMembers`: `TeamMember { user_id, role, email, full_name, revoked_at }`); `CORES_DO_SETOR`, `COR_PADRAO_DO_SETOR`, `monograma`, `filtrarSetores`, `ordenarSetores` (Task 1); `corDoAvatar(id)`, `inicialDoNome(nome)` (`lib/escale/quadro/aparencia`); `JanelaDaCasca`, `CabecaDaJanela`, `BotaoDaJanela`, `RodapeDaJanela`, `Campo`, `CampoDeTexto` (`components/escale/origens/JanelaDaCasca`); `SeletorDaCasca`, `AjudaDaCasca`, `BotaoDaCasca`, `VazioDaCasca` (3A); `CONTEUDO_DO_MENU`, `ITEM_DO_MENU`, `SOMBRA_DO_MENU` (`components/escale/menu/estilos`).
- Produces:
  - `MenuDaLinhaDeConfiguracao({ itens, rotulo? })` com `itens: Array<{ rotulo; icone; aoEscolher; perigo?; confirmar?: string }>` — o ⋮ das tabelas (c87, c97, c100) com a confirmação em popover para o item que tem `confirmar`.
  - `MonogramaDoSetor({ setor: { nome; cor }, tamanho: "lista" | "linha" | "cabecalho", tracejado? })` — 28px (lista), 14px (linha da fila), 20px (cabeçalho).
  - `FotoDaPessoa({ id, nome, tamanho? })` — a inicial colorida (36px por padrão).
  - `TelaSetores()`, `JanelaDoSetor({ aberta, aoFechar, setor: SetorLido | null })`.

Abra c38, c42, c87, c88 e c89 antes de escrever.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-tela-setores.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaDoSetor } from "@/components/escale/conversas/configuracoes/setores/JanelaDoSetor";
import { TelaSetores } from "@/components/escale/conversas/configuracoes/setores/TelaSetores";

const salvar = vi.fn();
const remover = vi.fn();
let setores = [
  { id: "s1", nome: "Atendimento", cor: "#0EA5C6", membros: ["u1", "u2"], dispositivos: 13, ids_dos_dispositivos: [] },
  { id: "s2", nome: "Suporte SAO", cor: "#F7DB5A", membros: ["u1"], dispositivos: 1, ids_dos_dispositivos: [] },
];
let permissoes: Record<string, boolean> = { CHAT_EDIT_TEAMS: true };
vi.mock("@/hooks/escale/useSetores", () => ({
  useSetores: () => ({ data: setores, isLoading: false }),
  useSalvarSetor: () => ({ mutateAsync: salvar, isPending: false }),
  useRemoverSetor: () => ({ mutate: remover, isPending: false }),
}));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({ useMinhasPermissoes: () => permissoes }));
vi.mock("@/hooks/team/useTeamMembers", () => ({
  useTeamMembers: () => ({
    data: { data: [
      { user_id: "u1", role: "agent", full_name: "Bathuly Bueno", email: "bathuly@x.com", revoked_at: null },
      { user_id: "u2", role: "agent", full_name: "Camilly Victória", email: "camilly@x.com", revoked_at: null },
      { user_id: "u3", role: "manager", full_name: "Clayton Bielau", email: "clayton@x.com", revoked_at: null },
    ] },
  }),
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...p }: { href: string; children: ReactNode }) => <a href={href} {...p}>{children}</a> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  salvar.mockReset().mockResolvedValue({ data: { id: "s9" } });
  remover.mockClear();
  permissoes = { CHAT_EDIT_TEAMS: true };
  setores = [
    { id: "s1", nome: "Atendimento", cor: "#0EA5C6", membros: ["u1", "u2"], dispositivos: 13, ids_dos_dispositivos: [] },
    { id: "s2", nome: "Suporte SAO", cor: "#F7DB5A", membros: ["u1"], dispositivos: 1, ids_dos_dispositivos: [] },
  ];
});

describe("TelaSetores (c38, c87)", () => {
  it("migalhas, colunas, monograma, contagens; a busca filtra; o ⋮ edita e remove com confirmação", async () => {
    wrap(<TelaSetores />);
    expect(screen.getByText("Configurações")).toBeInTheDocument();
    for (const c of ["Setor", "Conta/Dispositivo", "Atendentes"]) expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    const linha = screen.getByRole("row", { name: /Atendimento/ });
    expect(within(linha).getByText("AT")).toBeInTheDocument();
    expect(within(linha).getByText("13")).toBeInTheDocument();
    expect(within(linha).getByText("2")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar por setor..."), { target: { value: "sup" } });
    expect(screen.queryByRole("row", { name: /Atendimento/ })).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Buscar por setor..."), { target: { value: "" } });
    fireEvent.pointerDown(within(screen.getByRole("row", { name: /Atendimento/ })).getByRole("button", { name: "Mais ações" }), { button: 0 });
    fireEvent.click(await screen.findByText("Remover setor"));
    fireEvent.click(await screen.findByRole("button", { name: "Remover" }));
    expect(remover).toHaveBeenCalledWith("s1", expect.anything());
  });
  it("sem permissão some o 'Novo setor' e o ⋮; vazio mostra o texto da Clint", () => {
    permissoes = {};
    setores = [];
    wrap(<TelaSetores />);
    expect(screen.queryByRole("button", { name: "Novo setor" })).toBeNull();
    expect(screen.getByText("Você ainda não tem nenhum setor cadastrado!")).toBeInTheDocument();
  });
});

describe("JanelaDoSetor (c42, c88)", () => {
  it("cria: nome, adiciona pessoa pelo seletor, escolhe cor e salva", async () => {
    const fechar = vi.fn();
    wrap(<JanelaDoSetor aberta aoFechar={fechar} setor={null} />);
    expect(screen.getByText("Crie um setor")).toBeInTheDocument();
    expect(screen.getByText("Você ainda não adicionou usuários")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Digite um nome para o setor"), { target: { value: "Vendas" } });
    fireEvent.click(screen.getByRole("combobox", { name: "Adicione um usuário no setor" }));
    fireEvent.click(await screen.findByRole("option", { name: /Clayton Bielau/ }));
    expect(screen.getByText("clayton@x.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "#F0384B" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar setor" }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith({ nome: "Vendas", cor: "#F0384B", membros: ["u3"] }));
    expect(fechar).toHaveBeenCalled();
  });
  it("edita: carrega membros, a lixeira tira, a busca filtra, 'Salvar alterações'", async () => {
    wrap(<JanelaDoSetor aberta aoFechar={vi.fn()} setor={setores[0]} />);
    expect(screen.getByText("Editar setor")).toBeInTheDocument();
    expect(screen.getByText("Usuários selecionados")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar por nome ou e-mail"), { target: { value: "cam" } });
    expect(screen.queryByText("Bathuly Bueno")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Remover Camilly Victória" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith({ id: "s1", nome: "Atendimento", cor: "#0EA5C6", membros: ["u1"] }));
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-tela-setores.test.tsx`
Expected: FAIL.

- [ ] **Step 3: As peças pequenas**

Create `components/escale/conversas/configuracoes/MonogramaDoSetor.tsx`:

```tsx
import { monograma } from "@/lib/escale/conversas/setores";
import { cn } from "@/lib/utils";

const TAMANHO = {
  lista: "size-7 rounded-casca-gatilho text-[10px]",
  linha: "size-3.5 rounded-[3px] text-[7px]",
  cabecalho: "size-5 rounded-[4px] text-[9px]",
} as const;

/** O monograma colorido do setor: 28px na lista (c38), 14px na linha da fila (c87), 20px no cabeçalho (c02). */
export function MonogramaDoSetor({
  setor,
  tamanho = "lista",
  tracejado = false,
  className,
}: {
  setor: { nome: string; cor: string };
  tamanho?: keyof typeof TAMANHO;
  tracejado?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center font-bold leading-none text-white", TAMANHO[tamanho], tracejado && "outline-1 outline-offset-1 outline-dashed outline-casca-suave", className)}
      style={{ backgroundColor: setor.cor }}
    >
      {monograma(setor.nome)}
    </span>
  );
}
```

Create `components/escale/conversas/configuracoes/FotoDaPessoa.tsx`:

```tsx
import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";

/** A inicial colorida de uma pessoa da equipe (c88, c99, c40). O original não guarda foto de usuário. */
export function FotoDaPessoa({ id, nome, tamanho = 36 }: { id: string; nome: string; tamanho?: number }) {
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-white"
      style={{ width: tamanho, height: tamanho, backgroundColor: corDoAvatar(id), fontSize: Math.round(tamanho * 0.42) }}
    >
      {inicialDoNome(nome)}
    </span>
  );
}
```

Create `components/escale/conversas/configuracoes/MenuDaLinhaDeConfiguracao.tsx`:

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { EllipsisVertical } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export interface ItemDoMenuDaLinha {
  rotulo: string;
  icone: ReactNode;
  aoEscolher: () => void;
  perigo?: boolean;
  /** Com texto, o item abre a confirmação antes de agir (como "Excluir" de Contatos). */
  confirmar?: string;
  desabilitado?: boolean;
}

/** O ⋮ das tabelas de configuração (c87, c97, c100): itens de 36px, o perigoso em vermelho depois de um separador. */
export function MenuDaLinhaDeConfiguracao({ itens, rotulo }: { itens: ReadonlyArray<ItemDoMenuDaLinha>; rotulo?: string }) {
  const t = useT();
  const [confirmando, setConfirmando] = useState<ItemDoMenuDaLinha | null>(null);
  return (
    <Popover open={confirmando !== null} onOpenChange={(o) => !o && setConfirmando(null)}>
      <DropdownMenu>
        <PopoverAnchor asChild>
          <DropdownMenuTrigger aria-label={rotulo ?? t("Mais ações")} className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto">
            <EllipsisVertical size={18} aria-hidden />
          </DropdownMenuTrigger>
        </PopoverAnchor>
        <DropdownMenuContent side="bottom" align="end" className={CONTEUDO_DO_MENU} style={SOMBRA_DO_MENU}>
          {itens.map((item, i) => (
            <span key={item.rotulo}>
              {item.perigo && i > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                disabled={item.desabilitado}
                className={cn(ITEM_DO_MENU, item.perigo && "text-casca-alerta")}
                onSelect={() => (item.confirmar ? setConfirmando(item) : item.aoEscolher())}
              >
                {item.icone}
                {item.rotulo}
              </DropdownMenuItem>
            </span>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <PopoverContent side="left" className="w-72 rounded-[8px] p-4 text-[13px] text-casca-texto shadow-casca-painel">
        <p>{confirmando?.confirmar}</p>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmando(null)} className="h-8 rounded-[4px] border border-casca-borda px-3 font-medium hover:bg-casca-raia">
            {t("Cancelar")}
          </button>
          <button
            type="button"
            onClick={() => {
              confirmando?.aoEscolher();
              setConfirmando(null);
            }}
            className="h-8 rounded-[4px] bg-casca-alerta px-3 font-medium text-white hover:opacity-90"
          >
            {confirmando?.rotulo.split(" ")[0] ?? t("Confirmar")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

O botão da confirmação usa a primeira palavra do item ("Remover setor" → "Remover", "Excluir" → "Excluir"); os textos já passaram por `t()` em quem montou o item.

- [ ] **Step 4: A tela e a janela**

Create `components/escale/conversas/configuracoes/setores/JanelaDoSetor.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaJanela, CabecaDaJanela, Campo, CampoDeTexto, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useSalvarSetor } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { COR_PADRAO_DO_SETOR, CORES_DO_SETOR, type SetorLido } from "@/lib/escale/conversas/setores";
import { Search, Trash2, Users } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FotoDaPessoa } from "../FotoDaPessoa";

/**
 * "CRIE UM SETOR" / "EDITAR SETOR" (c42, c88, c89; E1): o nome, o seletor
 * para adicionar pessoas, a lista dos selecionados com busca e lixeira, a
 * prévia e a paleta de 24 cores. "Criar setor" / "Salvar alterações".
 */
export function JanelaDoSetor({ aberta, aoFechar, setor }: { aberta: boolean; aoFechar: () => void; setor: SetorLido | null }) {
  const t = useT();
  const salvar = useSalvarSetor();
  const { data: equipe } = useTeamMembers({ enabled: aberta });
  const pessoas = useMemo(
    () => (equipe?.data ?? []).filter((m) => !m.revoked_at && m.role !== "viewer").map((m) => ({ id: m.user_id, nome: m.full_name?.trim() || m.email || "", email: m.email ?? "" })),
    [equipe],
  );
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState<string>(COR_PADRAO_DO_SETOR);
  const [membros, setMembros] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  useEffect(() => {
    if (!aberta) return;
    setNome(setor?.nome ?? "");
    setCor(setor?.cor ?? COR_PADRAO_DO_SETOR);
    setMembros(setor?.membros ?? []);
    setBusca("");
  }, [aberta, setor]);

  const selecionados = pessoas.filter((p) => membros.includes(p.id));
  const termo = busca.trim().toLowerCase();
  const visiveis = termo ? selecionados.filter((p) => p.nome.toLowerCase().includes(termo) || p.email.toLowerCase().includes(termo)) : selecionados;
  const disponiveis = pessoas.filter((p) => !membros.includes(p.id)).map((p) => ({ valor: p.id, rotulo: `${p.nome} · ${p.email}` }));
  const podeSalvar = nome.trim().length > 0 && !salvar.isPending;

  const confirmar = async () => {
    if (!podeSalvar) return;
    await salvar.mutateAsync({ ...(setor ? { id: setor.id } : {}), nome: nome.trim(), cor, membros });
    toast.success(setor ? t("Setor atualizado.") : t("Setor criado."));
    aoFechar();
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[576px]">
      <CabecaDaJanela titulo={setor ? t("Editar setor") : t("Crie um setor")} />
      <div className="flex max-h-[440px] flex-col gap-5 overflow-y-auto pr-1">
        <Campo rotulo={t("Nome do setor")}>
          <CampoDeTexto value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t("Digite um nome para o setor")} maxLength={60} />
        </Campo>
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-casca-texto">
            {t("Adicione usuários a este setor")}
            <AjudaDaCasca texto={t("Para adicionar usuários, pesquise pelo nome ou email.")} />
          </span>
          <SeletorDaCasca
            aparencia="janela"
            valor=""
            vazio={t("Adicione um usuário no setor")}
            opcoes={disponiveis}
            buscaAPartirDe={0}
            aoMudar={(id) => id && setMembros((m) => [...m, id])}
            aria-label={t("Adicione um usuário no setor")}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-casca-texto">{selecionados.length > 1 ? t("Usuários selecionados") : t("Usuário selecionado")}</span>
            <span className="flex h-8 w-[190px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-2">
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar por nome ou e-mail")} className="min-w-0 flex-1 bg-transparent text-[12px] outline-hidden placeholder:text-casca-meta" />
              <Search size={14} aria-hidden className="text-casca-suave" />
            </span>
          </div>
          {selecionados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <span className="grid size-14 place-items-center rounded-lg bg-casca-marca-suave text-casca-marca"><Users size={24} aria-hidden /></span>
              <span className="text-[15px] font-semibold text-casca-texto">{t("Você ainda não adicionou usuários")}</span>
            </div>
          ) : (
            <ul className="flex max-h-[220px] flex-col overflow-y-auto">
              {visiveis.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-1.5">
                  <FotoDaPessoa id={p.id} nome={p.nome} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-casca-texto">{p.nome}</span>
                    <span className="block truncate text-[13px] text-casca-suave">{p.email}</span>
                  </span>
                  <button type="button" aria-label={`${t("Remover")} ${p.nome}`} onClick={() => setMembros((m) => m.filter((x) => x !== p.id))} className="grid size-7 place-items-center rounded text-casca-alerta hover:bg-casca-atraso">
                    <Trash2 size={18} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-6 border-t border-casca-borda pt-5">
          <span aria-hidden className="h-14 w-16 shrink-0 rounded-casca-gatilho" style={{ backgroundColor: cor }} />
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-casca-texto">{t("Cores")}</span>
            <div role="radiogroup" aria-label={t("Cores")} className="grid grid-cols-12 gap-x-4 gap-y-2.5">
              {CORES_DO_SETOR.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={cor === c}
                  aria-label={c}
                  onClick={() => setCor(c)}
                  className={cn("size-4 rounded-full", cor === c && "ring-2 ring-casca-marca ring-offset-2")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>{t("Cancelar")}</BotaoDaJanela>
        <BotaoDaJanela variante="salvar" disabled={!podeSalvar} onClick={() => void confirmar()}>
          {setor ? t("Salvar alterações") : t("Criar setor")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

Confira as props de `Campo` (rótulo: `rotulo` ou `label`) e o `role`/`aria-label` do gatilho do `SeletorDaCasca` (o teste usa `getByRole("combobox", { name })`; se o gatilho for `button`, troque o teste para `getByRole("button", { name })`).

Create `components/escale/conversas/configuracoes/setores/TelaSetores.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useRemoverSetor, useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { filtrarSetores, ordenarSetores, type SetorLido } from "@/lib/escale/conversas/setores";
import { Building2, Pencil, Search, Trash2 } from "@/lib/ui/icons-da-casca";

import { CabecaDaConfiguracao } from "../CabecaDaConfiguracao";
import { MenuDaLinhaDeConfiguracao } from "../MenuDaLinhaDeConfiguracao";
import { MonogramaDoSetor } from "../MonogramaDoSetor";
import { JanelaDoSetor } from "./JanelaDoSetor";

const CABECA = "h-10 px-4 text-[11px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha";

/** "CONFIGURAÇÕES › SETORES" (c38, c87; E1). */
export function TelaSetores() {
  const t = useT();
  const { data = [], isLoading } = useSetores();
  const remover = useRemoverSetor();
  const minhas = useMinhasPermissoes();
  const podeEditar = minhas.CHAT_EDIT_TEAMS === true;
  const [busca, setBusca] = useState("");
  const [janela, setJanela] = useState<{ setor: SetorLido | null } | null>(null);
  const lista = useMemo(() => ordenarSetores(filtrarSetores(data, busca)), [data, busca]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-setores">
      <CabecaDaConfiguracao migalhas={[{ rotulo: t("Configurações"), href: "/app/inbox/configuracoes" }, { rotulo: t("Setores") }]} />
      <div className="flex h-14 shrink-0 items-center gap-3 px-6">
        <span className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar por setor...")} className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta" />
          <Search size={16} aria-hidden className="text-casca-suave" />
        </span>
        <span className="flex-1" />
        {podeEditar ? (
          <BotaoDaCasca variante="marca" onClick={() => setJanela({ setor: null })}>{t("Novo setor")}</BotaoDaCasca>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!isLoading && data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-lg bg-casca-marca-suave text-casca-marca"><Building2 size={24} aria-hidden /></span>
            <span className="text-[15px] font-semibold text-casca-texto">{t("Você ainda não tem nenhum setor cadastrado!")}</span>
            <span className="text-[13px] text-casca-suave">{t("Aqui você pode adicionar e editar os setores.")}</span>
          </div>
        ) : !isLoading && lista.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-[15px] font-semibold text-casca-texto">{t("Nenhum setor encontrado...")}</span>
            <span className="text-[13px] text-casca-suave">{t("Tente outro termo ou crie um setor para organizar o atendimento.")}</span>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-casca-borda">
                <th className={`${CABECA} text-left`}>{t("Setor")}</th>
                <th className={`${CABECA} w-[260px] text-center`}>{t("Conta/Dispositivo")}</th>
                <th className={`${CABECA} w-[260px] text-center`}>{t("Atendentes")}</th>
                <th className={`${CABECA} w-12`} aria-label={t("Ações")} />
              </tr>
            </thead>
            <tbody>
              {lista.map((s) => (
                <tr key={s.id} aria-label={s.nome} className="h-[45px] border-b border-casca-borda hover:bg-casca-raia/50">
                  <td className="px-4">
                    <span className="flex items-center gap-3 text-[13px] text-casca-texto">
                      <MonogramaDoSetor setor={s} />
                      {s.nome}
                    </span>
                  </td>
                  <td className="px-4 text-center text-[13px] tabular-nums text-casca-texto">{s.dispositivos}</td>
                  <td className="px-4 text-center text-[13px] tabular-nums text-casca-texto">{s.membros.length}</td>
                  <td className="px-4 text-right">
                    {podeEditar ? (
                      <MenuDaLinhaDeConfiguracao
                        itens={[
                          { rotulo: t("Editar setor"), icone: <Pencil size={14} aria-hidden />, aoEscolher: () => setJanela({ setor: s }) },
                          {
                            rotulo: t("Remover setor"),
                            icone: <Trash2 size={14} aria-hidden />,
                            perigo: true,
                            confirmar: `${t("Remover o setor")} ${s.nome}?`,
                            aoEscolher: () => remover.mutate(s.id, { onSuccess: () => toast.success(t("O setor foi removido.")) }),
                          },
                        ]}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <JanelaDoSetor aberta={janela !== null} aoFechar={() => setJanela(null)} setor={janela?.setor ?? null} />
    </div>
  );
}
```

Os cabeçalhos aparecem em CAIXA ALTA pelo `uppercase` do CSS; o texto é "Setor", "Conta/Dispositivo", "Atendentes" (o teste procura assim).

Create `app/app/inbox/configuracoes/setores/page.tsx`:

```tsx
import { TelaSetores } from "@/components/escale/conversas/configuracoes/setores/TelaSetores";

import { paginaDaConfiguracao } from "../_casca";

export const dynamic = "force-dynamic";

export default async function SetoresPage() {
  return paginaDaConfiguracao(<TelaSetores />);
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-tela-setores.test.tsx && corepack pnpm prettier --write components/escale/conversas/configuracoes app/app/inbox/configuracoes && corepack pnpm eslint components/escale/conversas/configuracoes app/app/inbox/configuracoes && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/escale/conversas/configuracoes app/app/inbox/configuracoes/setores tests/unit/escale-tela-setores.test.tsx
git commit -m "feat(escale): tela de Setores e a janela Crie um setor / Editar setor (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: Configuração de canais — os cartões, a lista de dispositivos e "Informações do dispositivo" (E2)

**Files:**
- Create: `components/escale/conversas/configuracoes/canais/TelaConfiguracaoDeCanais.tsx`, `components/escale/conversas/configuracoes/canais/TelaDoCanal.tsx`, `components/escale/conversas/configuracoes/canais/TabelaDeDispositivos.tsx`, `components/escale/conversas/configuracoes/canais/JanelaDoDispositivo.tsx`, `app/app/inbox/configuracoes/canais/page.tsx`, `app/app/inbox/configuracoes/canais/[canal]/page.tsx`, `tests/unit/escale-tela-canais.test.tsx`
- Modify: `components/escale/conversas/configuracoes/setores/TelaSetores.tsx` (prop `embutida`, sem a cabeça, para a aba Setores do canal)

**Interfaces:**
- Consumes: `useChannelSessions()` (`ChannelSession { id, provider?, display_name, phone_number, status }`); `useRoteamentoDosCanais`, `useGravarRoteamento`, `useRenomearDispositivo`, `useExcluirDispositivo` (Task 7); `useSetores`, `useSetorDoDispositivo` (Task 7); `useMinhasPermissoes` (Task 7); `useTeamMembers`; `grupoDoDispositivo`, `ROTULO_DO_GRUPO` (3A `nova-conversa.ts`); `CARTOES_DE_CANAL`, `SLUG_DO_CANAL`, `canalDoSlug`, `statusDoDispositivo`, `quemEstaNoDispositivo`, `ligarNoDispositivo`, `ativarTodosNoDispositivo` (Task 1); `formatarTelefone` (`lib/escale/contatos/regras`); `AbasDaCasca`, `InterruptorDaCasca`, `SeletorDaCasca`, `AjudaDaCasca`, `BotaoDaCasca` (3A); `FotoDaPessoa`, `MenuDaLinhaDeConfiguracao`, `CabecaDaConfiguracao` (Tasks 8, 9).
- Produces: `TelaConfiguracaoDeCanais()`; `TelaDoCanal({ canal: GrupoDeDispositivo })`; `TabelaDeDispositivos({ canal })`; `JanelaDoDispositivo({ aberta, aoFechar, dispositivo: ChannelSession | null })`; `TelaSetores({ embutida?: boolean })`.

**Decisão desta task (soma à N10):** o original não lista dispositivos arquivados nem tem "desconectar" separado de excluir (o `DELETE /api/v1/channel-sessions/[id]` arquiva e desconecta). Por isso: **Excluir** = o `DELETE` do original, com confirmação; **Arquivar**, **Desconectar** (menu e ícone) e **Mostrar arquivados** ficam "Em breve"; o ícone de QR do dispositivo desconectado leva à tela de conexões do original (onde o QR é lido).

Abra c98, c99, c100, c101, c102, c103, 16/10-04 e 16/10-05 antes de escrever.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-tela-canais.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaDoDispositivo } from "@/components/escale/conversas/configuracoes/canais/JanelaDoDispositivo";
import { TelaConfiguracaoDeCanais } from "@/components/escale/conversas/configuracoes/canais/TelaConfiguracaoDeCanais";
import { TelaDoCanal } from "@/components/escale/conversas/configuracoes/canais/TelaDoCanal";

const gravarRoteamento = vi.fn();
const setorDoDispositivo = vi.fn();
const renomear = vi.fn();
const excluir = vi.fn();
const sessoes = [
  { id: "d1", provider: "waha", display_name: "Sara - 2230", phone_number: "+551153042230", status: "WORKING" },
  { id: "d2", provider: "waha", display_name: "Bathuly - 3062", phone_number: "+551153043062", status: "STOPPED" },
  { id: "d3", provider: "meta_cloud", display_name: "Suporte SAO", phone_number: "+556292000286", status: "WORKING" },
];
vi.mock("@/hooks/channels/useChannelSessions", () => ({ useChannelSessions: () => ({ data: sessoes, isLoading: false }) }));
vi.mock("@/hooks/escale/useDispositivosDaCasca", () => ({
  useRoteamentoDosCanais: () => ({
    data: {
      channels: [
        { id: "d1", user_ids: ["u2"], mode: "restricted" },
        { id: "d2", user_ids: [], mode: "legacy_unconfigured" },
      ],
      members: [],
    },
  }),
  useGravarRoteamento: () => ({ mutate: gravarRoteamento, isPending: false }),
  useRenomearDispositivo: () => ({ mutateAsync: renomear, isPending: false }),
  useExcluirDispositivo: () => ({ mutate: excluir, isPending: false }),
}));
vi.mock("@/hooks/escale/useSetores", () => ({
  useSetores: () => ({ data: [{ id: "s1", nome: "Atendimento", cor: "#0EA5C6", membros: [], dispositivos: 1, ids_dos_dispositivos: ["d1"] }] }),
  useSetorDoDispositivo: () => ({ mutateAsync: setorDoDispositivo, isPending: false }),
  useRemoverSetor: () => ({ mutate: vi.fn() }),
  useSalvarSetor: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({ useMinhasPermissoes: () => ({ CHAT_VIEW_CHANNEL_ACCOUNT: true, CHAT_EDIT_TEAMS: true }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: "admin" } }) }));
vi.mock("@/hooks/team/useTeamMembers", () => ({
  useTeamMembers: () => ({
    data: { data: [
      { user_id: "u1", role: "admin", full_name: "Régis", email: "regis@x.com", revoked_at: null },
      { user_id: "u2", role: "agent", full_name: "Camilly", email: "camilly@x.com", revoked_at: null },
      { user_id: "u3", role: "agent", full_name: "Clayton", email: "clayton@x.com", revoked_at: null },
    ] },
  }),
}));
vi.mock("next/link", () => ({ default: ({ href, children, ...p }: { href: string; children: ReactNode }) => <a href={href} {...p}>{children}</a> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  for (const f of [gravarRoteamento, setorDoDispositivo, renomear, excluir]) f.mockReset();
  setorDoDispositivo.mockResolvedValue(undefined);
  renomear.mockResolvedValue(undefined);
});

describe("TelaConfiguracaoDeCanais (c98)", () => {
  it("só os canais que a organização tem, com 'API oficial' e 'Instalado'", () => {
    wrap(<TelaConfiguracaoDeCanais />);
    const links = screen.getAllByRole("link", { name: /WhatsApp/ });
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/app/inbox/configuracoes/canais/whatsapp-oficial", "/app/inbox/configuracoes/canais/whatsapp"]);
    expect(screen.getByText("API oficial")).toBeInTheDocument();
    expect(screen.getAllByText("Instalado")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: /Instagram/ })).toBeNull();
  });
});

describe("TelaDoCanal (c99, c100)", () => {
  it("abas, os dispositivos do canal com status, setor e usuários; o QR do desconectado; o ⋮", () => {
    wrap(<TelaDoCanal canal="whatsapp" />);
    for (const a of ["Dispositivos", "Usuários e Permissões", "Setores"]) expect(screen.getByRole("tab", { name: a })).toBeInTheDocument();
    const sara = screen.getByRole("row", { name: /Sara - 2230/ });
    expect(within(sara).getByText("Conectado")).toBeInTheDocument();
    expect(within(sara).getByText("Atendimento")).toBeInTheDocument();
    const bathuly = screen.getByRole("row", { name: /Bathuly - 3062/ });
    expect(within(bathuly).getByText("Desconectado")).toBeInTheDocument();
    expect(within(bathuly).getByRole("link", { name: "Conectar" })).toHaveAttribute("href", "/app/connections");
    expect(within(bathuly).getAllByTitle(/Régis|Camilly|Clayton/)).toHaveLength(3);
    expect(screen.queryByRole("row", { name: /Suporte SAO/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Novo dispositivo" })).toHaveAttribute("href", "/app/connections");
  });
});

describe("JanelaDoDispositivo (c101, c102)", () => {
  it("nome, número, setor, atendentes; admin travado; ligar um atendente grava o roteamento; salvar grava nome e setor", async () => {
    const fechar = vi.fn();
    wrap(<JanelaDoDispositivo aberta aoFechar={fechar} dispositivo={sessoes[0]} />);
    expect(screen.getByText("Informações do dispositivo")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Criação de negócio" })).toBeInTheDocument();
    expect(screen.getByText("+55 (11) 5304-2230")).toBeInTheDocument();
    expect(screen.getByText("Membros do time que estão no setor selecionado terão acesso a esse dispositivo.")).toBeInTheDocument();
    const admin = screen.getByRole("switch", { name: "Régis" });
    expect(admin).toBeDisabled();
    expect(admin).toHaveAttribute("title", "Usuário administrador");
    expect(screen.getByRole("switch", { name: "Camilly" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("switch", { name: "Clayton" }));
    expect(gravarRoteamento).toHaveBeenCalledWith({ channel_session_id: "d1", user_ids: ["u2", "u3"] });
    fireEvent.change(screen.getByDisplayValue("Sara - 2230"), { target: { value: "Sara" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await vi.waitFor(() => expect(renomear).toHaveBeenCalledWith({ id: "d1", nome: "Sara" }));
    expect(setorDoDispositivo).not.toHaveBeenCalled();
  });
});
```

O formato do telefone (`+55 (11) 5304-2230`) é o de `formatarTelefone` da 2A; confira a saída real e ajuste a string do teste.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-tela-canais.test.tsx`
Expected: FAIL.

- [ ] **Step 3: O setor de cada dispositivo**

`SetorLido.ids_dos_dispositivos` (Tasks 1 e 3) diz o setor de cada dispositivo; nada a mudar aqui.

- [ ] **Step 4: Os cartões e a tela do canal**

Create `components/escale/conversas/configuracoes/canais/TelaConfiguracaoDeCanais.tsx`:

```tsx
"use client";
import Link from "next/link";

import { useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { CARTOES_DE_CANAL, SLUG_DO_CANAL } from "@/lib/escale/conversas/canais";
import { grupoDoDispositivo } from "@/lib/escale/conversas/nova-conversa";
import { BadgeCheck, CheckCircle2, ChevronRight, Instagram, MessageCircle } from "@/lib/ui/icons-da-casca";

import { CabecaDaConfiguracao } from "../CabecaDaConfiguracao";

/** "CONFIGURAÇÕES › CONFIGURAÇÃO DE CANAIS" (c98; E2): um cartão por canal que a organização tem. */
export function TelaConfiguracaoDeCanais() {
  const t = useT();
  const { data = [], isLoading } = useChannelSessions();
  const presentes = new Set(data.map((s) => grupoDoDispositivo(s.provider)));
  const cartoes = CARTOES_DE_CANAL.filter((c) => presentes.has(c.canal));
  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-canais">
      <CabecaDaConfiguracao migalhas={[{ rotulo: t("Configurações"), href: "/app/inbox/configuracoes" }, { rotulo: t("Configuração de canais") }]} />
      <div className="px-6 py-6">
        {!isLoading && cartoes.length === 0 ? (
          <p className="text-[13px] text-casca-suave">
            {t("Você precisa adicionar um dispositivo ou uma conta para iniciar uma nova conversa.")}{" "}
            <Link href="/app/connections" className="font-medium text-casca-marca">{t("Conectar um canal")}</Link>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-4">
          {cartoes.map((c) => (
            <Link key={c.canal} href={`/app/inbox/configuracoes/canais/${SLUG_DO_CANAL[c.canal]}`} className="flex h-[88px] w-[322px] items-center gap-4 rounded-lg border border-casca-borda bg-white px-5 hover:shadow-casca-painel">
              <span className="relative grid size-10 place-items-center rounded-lg bg-casca-raia">
                {c.canal === "instagram" ? <Instagram size={24} aria-hidden className="text-casca-alerta" /> : <MessageCircle size={24} aria-hidden className="text-[color:var(--escale-status-ganho)]" />}
                {c.oficial ? <BadgeCheck size={12} aria-hidden className="absolute right-0 bottom-0 text-casca-novo" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-casca-texto">
                  {c.nome}
                  {c.oficial ? <span className="rounded-md bg-casca-marca-suave px-2 py-0.5 text-[11px] font-medium text-casca-marca">{t("API oficial")}</span> : null}
                </span>
                <span className="mt-1 flex items-center gap-1 text-[13px] text-[color:var(--escale-status-ganho)]">
                  <CheckCircle2 size={14} aria-hidden />
                  {t("Instalado")}
                </span>
              </span>
              <ChevronRight size={16} aria-hidden className="text-casca-chevron" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

O nome acessível do link junta "WhatsApp", "API oficial" e "Instalado"; o teste procura `/WhatsApp/`.

Create `components/escale/conversas/configuracoes/canais/TelaDoCanal.tsx`:

```tsx
"use client";
import { useState } from "react";

import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DO_GRUPO, type GrupoDeDispositivo } from "@/lib/escale/conversas/nova-conversa";

import { CabecaDaConfiguracao } from "../CabecaDaConfiguracao";
import { TelaSetores } from "../setores/TelaSetores";
import { TelaUsuarios } from "../usuarios/TelaUsuarios";
import { TabelaDeDispositivos } from "./TabelaDeDispositivos";

type Aba = "dispositivos" | "usuarios" | "setores";

/** O canal (c99, 16/10-05): migalhas de 3 níveis e as abas Dispositivos / Usuários e Permissões / Setores. */
export function TelaDoCanal({ canal }: { canal: GrupoDeDispositivo }) {
  const t = useT();
  const [aba, setAba] = useState<Aba>("dispositivos");
  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-do-canal">
      <CabecaDaConfiguracao
        migalhas={[
          { rotulo: t("Configurações"), href: "/app/inbox/configuracoes" },
          { rotulo: t("Configuração de canais"), href: "/app/inbox/configuracoes/canais" },
          { rotulo: t(ROTULO_DO_GRUPO[canal]) },
        ]}
      />
      <div className="flex items-end gap-6 px-6">
        <AbasDaCasca
          aria-label={t("Seções do canal")}
          valor={aba}
          aoMudar={setAba}
          abas={[
            { valor: "dispositivos", rotulo: t("Dispositivos") },
            { valor: "usuarios", rotulo: t("Usuários e Permissões") },
            { valor: "setores", rotulo: t("Setores") },
          ]}
        />
        {canal === "whatsapp_oficial"
          ? ["Modelos de mensagem", "WhatsApp Flows", "Análise de templates"].map((r) => (
              <span key={r} title={t("Em breve")} aria-disabled="true" className="pb-3 text-[13px] text-casca-meta">{t(r)}</span>
            ))
          : null}
      </div>
      <div className="min-h-0 flex-1">
        {aba === "dispositivos" ? <TabelaDeDispositivos canal={canal} /> : aba === "usuarios" ? <TelaUsuarios embutida /> : <TelaSetores embutida />}
      </div>
    </div>
  );
}
```

`TelaUsuarios` nasce na Task 11. Para a Task 10 compilar sozinha, crie já `components/escale/conversas/configuracoes/usuarios/TelaUsuarios.tsx` com `export function TelaUsuarios(_: { embutida?: boolean }) { return null; }` e troque o corpo na Task 11.

Em `TelaSetores` (Task 9): a assinatura passa a `TelaSetores({ embutida = false }: { embutida?: boolean })` e a `CabecaDaConfiguracao` só aparece quando `!embutida`.

- [ ] **Step 5: A tabela de dispositivos**

Create `components/escale/conversas/configuracoes/canais/TabelaDeDispositivos.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { useChannelSessions, type ChannelSession } from "@/hooks/channels/useChannelSessions";
import { useExcluirDispositivo, useRoteamentoDosCanais } from "@/hooks/escale/useDispositivosDaCasca";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { quemEstaNoDispositivo, statusDoDispositivo } from "@/lib/escale/conversas/canais";
import { grupoDoDispositivo, type GrupoDeDispositivo } from "@/lib/escale/conversas/nova-conversa";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { Archive, Pencil, QrCode, Search, Trash2, Unplug } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FotoDaPessoa } from "../FotoDaPessoa";
import { MenuDaLinhaDeConfiguracao } from "../MenuDaLinhaDeConfiguracao";
import { JanelaDoDispositivo } from "./JanelaDoDispositivo";

const CABECA = "h-10 px-4 text-[11px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha";
const FOTOS_MAX = 4;

/** A lista de dispositivos do canal (c99, c100; E2; N10). */
export function TabelaDeDispositivos({ canal }: { canal: GrupoDeDispositivo }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const ehAdmin = activeOrg?.role === "admin";
  const podeGerenciar = ehAdmin || activeOrg?.role === "manager";
  const minhas = useMinhasPermissoes();
  const { data: sessoes = [] } = useChannelSessions();
  const { data: setores = [] } = useSetores();
  const roteamento = useRoteamentoDosCanais(podeGerenciar);
  const { data: equipe } = useTeamMembers({ enabled: podeGerenciar });
  const excluir = useExcluirDispositivo();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<ChannelSession | null>(null);

  const pessoas = useMemo(() => (equipe?.data ?? []).filter((m) => !m.revoked_at && m.role !== "viewer"), [equipe]);
  const elegiveis = pessoas.map((p) => p.user_id);
  const nomeDe = (id: string) => pessoas.find((p) => p.user_id === id)?.full_name?.trim() || "";
  const setorDe = (id: string) => setores.find((s) => s.ids_dos_dispositivos.includes(id))?.nome ?? "—";
  const termo = busca.trim().toLowerCase();
  const podeVerTodos = ehAdmin || minhas.CHAT_VIEW_CHANNEL_ACCOUNT === true;
  const linhas = sessoes
    .filter((s) => grupoDoDispositivo(s.provider) === canal)
    .filter((s) => !termo || (s.display_name ?? "").toLowerCase().includes(termo) || (s.phone_number ?? "").includes(termo));

  if (!podeVerTodos && !podeGerenciar) {
    return <p className="px-6 py-10 text-center text-[13px] text-casca-suave">{t("Você não tem acesso às configurações de dispositivos.")}</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-4 px-6">
        <span className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar dispositivo...")} className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta" />
          <Search size={16} aria-hidden className="text-casca-suave" />
        </span>
        <span title={t("Em breve")} aria-disabled="true" className="text-[13px] font-medium text-casca-marca opacity-50">{t("Mostrar arquivados")}</span>
        <span className="flex-1" />
        {ehAdmin ? (
          <Link href="/app/connections" className="inline-flex h-8 items-center rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-medium text-white hover:opacity-90">{t("Novo dispositivo")}</Link>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-casca-borda">
              <th className={`${CABECA} text-left`}>{t("Nome dispositivo")}</th>
              <th className={`${CABECA} w-[160px] text-center`}>{t("Status")}</th>
              <th className={`${CABECA} w-[180px] text-center`}>{t("Setores")}</th>
              <th className={`${CABECA} w-[240px] text-center`}>{t("Usuários nesse dispositivo")}</th>
              <th className={`${CABECA} w-24`} aria-label={t("Ações")} />
            </tr>
          </thead>
          <tbody>
            {linhas.map((s) => {
              const conectado = statusDoDispositivo(s.status) === "conectado";
              const canalDoRoteamento = roteamento.data?.channels.find((c) => c.id === s.id);
              const quem = canalDoRoteamento ? quemEstaNoDispositivo(canalDoRoteamento, elegiveis) : [];
              const nome = s.display_name?.trim() || s.phone_number || "";
              return (
                <tr key={s.id} aria-label={nome} className="h-[53px] border-b border-casca-borda hover:bg-casca-raia/50">
                  <td className="px-4">
                    <span className="flex items-center gap-3">
                      <FotoDaPessoa id={s.id} nome={nome} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-casca-texto">{nome}</span>
                        <span className="block text-[13px] text-casca-suave">{formatarTelefone(s.phone_number)}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 text-center">
                    <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-[13px]", conectado ? "bg-[color:var(--escale-status-ganho-suave)] text-[color:var(--escale-status-ganho)]" : "bg-casca-atraso text-casca-alerta")}>
                      {conectado ? t("Conectado") : t("Desconectado")}
                    </span>
                  </td>
                  <td className="px-4 text-center text-[13px] font-medium text-casca-texto">{setorDe(s.id)}</td>
                  <td className="px-4">
                    <span className="flex items-center justify-center">
                      {quem.slice(0, FOTOS_MAX).map((id) => (
                        <span key={id} className="-ml-2 first:ml-0" title={nomeDe(id)}>
                          <FotoDaPessoa id={id} nome={nomeDe(id)} tamanho={28} />
                        </span>
                      ))}
                      {quem.length > FOTOS_MAX ? <span className="-ml-2 grid size-7 place-items-center rounded-full bg-casca-raia text-[11px] text-casca-suave ring-2 ring-white">+{quem.length - FOTOS_MAX}</span> : null}
                    </span>
                  </td>
                  <td className="px-4">
                    <span className="flex items-center justify-end gap-3">
                      {conectado ? (
                        <span title={t("Em breve")} aria-label={t("Desconectar")} className="text-casca-meta"><Unplug size={18} aria-hidden /></span>
                      ) : (
                        <Link href="/app/connections" aria-label={t("Conectar")} title={t("Conectar")} className="text-casca-suave hover:text-casca-texto"><QrCode size={18} aria-hidden /></Link>
                      )}
                      <MenuDaLinhaDeConfiguracao
                        itens={[
                          { rotulo: t("Editar"), icone: <Pencil size={14} aria-hidden />, aoEscolher: () => setEditando(s) },
                          { rotulo: t("Desconectar"), icone: <Unplug size={14} aria-hidden />, aoEscolher: () => undefined, desabilitado: true },
                          { rotulo: t("Arquivar"), icone: <Archive size={14} aria-hidden />, aoEscolher: () => undefined, desabilitado: true },
                          ...(ehAdmin
                            ? [{ rotulo: t("Excluir"), icone: <Trash2 size={14} aria-hidden />, perigo: true, confirmar: t("Excluir o dispositivo? O número para de receber mensagens."), aoEscolher: () => excluir.mutate(s.id) }]
                            : []),
                        ]}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <JanelaDoDispositivo aberta={editando !== null} aoFechar={() => setEditando(null)} dispositivo={editando} />
    </div>
  );
}
```

Com `legacy_unconfigured`, todos os elegíveis estão no dispositivo; o "+n" só aparece a partir da 5ª pessoa (c99 mostra "+9").

- [ ] **Step 6: A janela do dispositivo**

Create `components/escale/conversas/configuracoes/canais/JanelaDoDispositivo.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaJanela, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import type { ChannelSession } from "@/hooks/channels/useChannelSessions";
import { useGravarRoteamento, useRenomearDispositivo, useRoteamentoDosCanais } from "@/hooks/escale/useDispositivosDaCasca";
import { useSetorDoDispositivo, useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { ativarTodosNoDispositivo, ligarNoDispositivo, quemEstaNoDispositivo } from "@/lib/escale/conversas/canais";
import { grupoDoDispositivo } from "@/lib/escale/conversas/nova-conversa";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { Search, Smartphone, X } from "@/lib/ui/icons-da-casca";

import { FotoDaPessoa } from "../FotoDaPessoa";

/**
 * "INFORMAÇÕES DO DISPOSITIVO" (c101–c103, 16/10-04; E2; N10, N11). Nome e
 * setor salvam no rodapé; cada atendente salva na hora (o PATCH dos
 * responsáveis do original troca a lista do canal). Admin aparece ligado e
 * apagado ("Usuário administrador"). "Criação de negócio" é da 3E.
 */
export function JanelaDoDispositivo({ aberta, aoFechar, dispositivo }: { aberta: boolean; aoFechar: () => void; dispositivo: ChannelSession | null }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const ehAdmin = activeOrg?.role === "admin";
  const [aba, setAba] = useState<"dispositivos" | "criacao">("dispositivos");
  const [nome, setNome] = useState("");
  const [setorId, setSetorId] = useState("");
  const [busca, setBusca] = useState("");
  const { data: setores = [] } = useSetores();
  const { data: equipe } = useTeamMembers({ enabled: aberta });
  const roteamento = useRoteamentoDosCanais(aberta);
  const gravarRoteamento = useGravarRoteamento();
  const renomear = useRenomearDispositivo();
  const setorDoDispositivo = useSetorDoDispositivo();
  const setorAtual = dispositivo ? (setores.find((s) => s.ids_dos_dispositivos.includes(dispositivo.id))?.id ?? "") : "";

  useEffect(() => {
    if (!aberta || !dispositivo) return;
    setAba("dispositivos");
    setNome(dispositivo.display_name ?? "");
    setSetorId(setorAtual);
    setBusca("");
  }, [aberta, dispositivo, setorAtual]);

  const pessoas = useMemo(
    () => (equipe?.data ?? []).filter((m) => !m.revoked_at && m.role !== "viewer").map((m) => ({ id: m.user_id, nome: m.full_name?.trim() || m.email || "", email: m.email ?? "", admin: m.role === "admin" })),
    [equipe],
  );
  const elegiveis = pessoas.map((p) => p.id);
  const canal = dispositivo ? roteamento.data?.channels.find((c) => c.id === dispositivo.id) : undefined;
  const ligados = canal ? quemEstaNoDispositivo(canal, elegiveis) : [];
  const termo = busca.trim().toLowerCase();
  const visiveis = termo ? pessoas.filter((p) => p.nome.toLowerCase().includes(termo) || p.email.toLowerCase().includes(termo)) : pessoas;
  const naoAdmins = pessoas.filter((p) => !p.admin).map((p) => p.id);
  const todosLigados = naoAdmins.length > 0 && naoAdmins.every((id) => ligados.includes(id));
  const ehOficial = grupoDoDispositivo(dispositivo?.provider) === "whatsapp_oficial";

  if (!dispositivo) return null;
  const mudarPessoa = (id: string, ligado: boolean) => {
    if (!canal) return;
    gravarRoteamento.mutate({ channel_session_id: dispositivo.id, user_ids: ligarNoDispositivo(canal, elegiveis, id, ligado) });
  };
  const salvar = async () => {
    if (ehAdmin && nome.trim() && nome.trim() !== (dispositivo.display_name ?? "")) await renomear.mutateAsync({ id: dispositivo.id, nome: nome.trim() });
    if (ehAdmin && setorId !== setorAtual) await setorDoDispositivo.mutateAsync({ channel_session_id: dispositivo.id, setor_id: setorId || null });
    toast.success(t("As alterações foram salvas."));
    aoFechar();
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[672px] p-0">
      <div className="flex h-14 items-center border-b border-casca-borda px-5 text-[15px] font-medium text-casca-texto">{t("Informações do dispositivo")}</div>
      <div className="px-4">
        <AbasDaCasca aria-label={t("Seções do dispositivo")} valor={aba} aoMudar={setAba} abas={[{ valor: "dispositivos", rotulo: t("Dispositivos") }, { valor: "criacao", rotulo: t("Criação de negócio") }]} />
      </div>
      {aba === "criacao" ? (
        <p className="px-6 py-10 text-center text-[13px] text-casca-suave">{t("Em breve")}</p>
      ) : (
        <div className="flex max-h-[520px] flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="flex items-start gap-4 border-b border-casca-borda pb-5">
            <FotoDaPessoa id={dispositivo.id} nome={nome} tamanho={40} />
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
                {t("Nome do dispositivo")}
                <AjudaDaCasca texto={t("Esse nome é usado apenas para identificação interna. Não ficará visível para seus contatos.")} />
              </span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} disabled={!ehAdmin} className="h-8 rounded-casca-gatilho bg-casca-busca px-3 text-[13px] text-casca-texto outline-hidden disabled:opacity-60" />
            </label>
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto"><Smartphone size={14} aria-hidden />{t("Número conectado")}</span>
              <span className="text-[13px] text-casca-suave">{formatarTelefone(dispositivo.phone_number)}</span>
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-b border-casca-borda pb-5">
            <span className="text-[13px] font-semibold text-casca-texto">{t("Setor de atendimento")}</span>
            <span className="flex items-center gap-2">
              <SeletorDaCasca aparencia="janela" valor={setorId} vazio={t("Selecionar setor")} opcoes={setores.map((s) => ({ valor: s.id, rotulo: s.nome }))} aoMudar={setSetorId} desabilitado={!ehAdmin} aria-label={t("Setor de atendimento")} className="flex-1" />
              {setorId && ehAdmin ? (
                <button type="button" aria-label={t("Remover setor")} onClick={() => setSetorId("")} className="grid size-7 place-items-center rounded text-casca-suave hover:bg-casca-raia"><X size={14} aria-hidden /></button>
              ) : null}
            </span>
            <span className="text-[13px] text-casca-suave">{t("Membros do time que estão no setor selecionado terão acesso a esse dispositivo.")}</span>
          </div>
          {ehOficial ? (
            <div className="flex flex-col gap-3 border-b border-casca-borda pb-5" title={t("Em breve")}>
              <span className="text-[13px] font-semibold text-casca-texto">{t("Indicador de digitação")}</span>
              <span className="flex items-center justify-between text-[13px] text-casca-texto">{t("Atendente digitando")}<InterruptorDaCasca ligado={false} aoMudar={() => undefined} desabilitado aria-label={t("Atendente digitando")} title={t("Em breve")} /></span>
              <span className="flex items-center justify-between text-[13px] text-casca-texto">{t("Agente de IA respondendo")}<InterruptorDaCasca ligado={false} aoMudar={() => undefined} desabilitado aria-label={t("Agente de IA respondendo")} title={t("Em breve")} /></span>
            </div>
          ) : null}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-casca-texto">{t("Atendentes conectados nesse dispositivo")}</span>
              <span className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar por nome ou e-mail")} className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta" />
                <Search size={16} aria-hidden className="text-casca-suave" />
              </span>
            </div>
            {!roteamento.data ? (
              <p className="text-[13px] text-casca-suave">{roteamento.isError ? t("Confirme a verificação em duas etapas.") : t("Carregando…")}</p>
            ) : (
              <>
                <span className="flex items-center justify-between text-[13px] text-casca-texto">
                  {t("Ativar todos")}
                  <InterruptorDaCasca
                    ligado={todosLigados}
                    aoMudar={(v) => gravarRoteamento.mutate({ channel_session_id: dispositivo.id, user_ids: v ? ativarTodosNoDispositivo(elegiveis) : pessoas.filter((p) => p.admin).map((p) => p.id) })}
                    aria-label={t("Ativar todos")}
                  />
                </span>
                <ul className="flex max-h-[288px] flex-col overflow-y-auto">
                  {visiveis.map((p) => (
                    <li key={p.id} className="flex h-12 items-center justify-between border-b border-casca-borda px-1">
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-casca-texto">{p.nome}</span>
                        <span className="block truncate text-[13px] text-casca-suave">{p.email}</span>
                      </span>
                      <InterruptorDaCasca
                        ligado={p.admin || ligados.includes(p.id)}
                        desabilitado={p.admin || gravarRoteamento.isPending}
                        title={p.admin ? t("Usuário administrador") : undefined}
                        aoMudar={(v) => mudarPessoa(p.id, v)}
                        aria-label={p.nome}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
      <div className="px-6 pb-4">
        <RodapeDaJanela>
          <BotaoDaJanela variante="cancelar" onClick={aoFechar}>{t("Cancelar")}</BotaoDaJanela>
          <BotaoDaJanela variante="salvar" disabled={!ehAdmin || renomear.isPending || setorDoDispositivo.isPending} onClick={() => void salvar()}>{t("Salvar alterações")}</BotaoDaJanela>
        </RodapeDaJanela>
      </div>
    </JanelaDaCasca>
  );
}
```

Ligar o Clayton com o Sara em `restricted` (`["u2"]`) grava `["u2", "u3"]` (`ligarNoDispositivo` segue a ordem dos elegíveis; o admin `u1` não entra na lista restrita). "Ativar todos" desligado mantém só os admins.

- [ ] **Step 7: As páginas**

Create `app/app/inbox/configuracoes/canais/page.tsx`:

```tsx
import { TelaConfiguracaoDeCanais } from "@/components/escale/conversas/configuracoes/canais/TelaConfiguracaoDeCanais";

import { paginaDaConfiguracao } from "../_casca";

export const dynamic = "force-dynamic";

export default async function CanaisPage() {
  return paginaDaConfiguracao(<TelaConfiguracaoDeCanais />);
}
```

Create `app/app/inbox/configuracoes/canais/[canal]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { TelaDoCanal } from "@/components/escale/conversas/configuracoes/canais/TelaDoCanal";
import { canalDoSlug } from "@/lib/escale/conversas/canais";

import { paginaDaConfiguracao } from "../../_casca";

export const dynamic = "force-dynamic";

export default async function CanalPage({ params }: { params: Promise<{ canal: string }> }) {
  const canal = canalDoSlug((await params).canal);
  if (!canal) notFound();
  return paginaDaConfiguracao(<TelaDoCanal canal={canal} />);
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-tela-canais.test.tsx tests/unit/escale-tela-setores.test.tsx tests/unit/escale-setores-rotas.test.ts tests/unit/escale-setores-regras.test.ts && corepack pnpm prettier --write components/escale/conversas/configuracoes app/app/inbox/configuracoes lib/escale/conversas && corepack pnpm eslint components/escale/conversas/configuracoes app/app/inbox/configuracoes && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/escale/conversas/configuracoes app/app/inbox/configuracoes/canais lib/escale/conversas tests/unit/escale-tela-canais.test.tsx tests/unit/escale-tela-setores.test.tsx tests/unit/escale-setores-rotas.test.ts
git commit -m "feat(escale): Configuração de canais, lista de dispositivos e Informações do dispositivo (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11: Usuários e Permissões — a lista e a janela do usuário com Geral, Permissões e Contas e dispositivos (E4)

**Files:**
- Create: `components/escale/conversas/configuracoes/usuarios/TelaUsuarios.tsx` (troca o esqueleto da Task 10), `components/escale/conversas/configuracoes/usuarios/JanelaDoUsuario.tsx`, `components/escale/conversas/configuracoes/usuarios/AbaGeral.tsx`, `components/escale/conversas/configuracoes/usuarios/AbaPermissoes.tsx`, `components/escale/conversas/configuracoes/usuarios/AbaContasEDispositivos.tsx`, `app/app/inbox/configuracoes/usuarios/page.tsx`, `tests/unit/escale-tela-usuarios.test.tsx`

**Interfaces:**
- Consumes: `useTeamMembers` (`TeamMember`), `useChangeRole` (`hooks/team/useChangeRole`: mutation `{ userId, role }`); `useUsuariosDaCasca`, `useGravarSetoresDoUsuario`, `usePermissoesDoUsuario`, `useGravarPermissoes`, `useResetarPermissoes`, `useRoteamentoDosCanais`, `useGravarRoteamento`, `useSetores` (Task 7); `useChannelSessions`; `PERMISSOES_DE_CONVERSAS`, `estadoDoToggle`, `excecaoAoMudar`, `desativarTodos`, `grupoDoUsuario`, `rotuloDoGrupo`, `GRUPOS_DE_PERMISSAO`, `SECOES_DE_PERMISSAO`, `type Papel`, `type Excecoes`, `type GrupoDePermissao` (Task 1); `dispositivosDoUsuario`, `quemEstaNoDispositivo`, `ligarNoDispositivo` (Task 1); `grupoDoDispositivo`, `ROTULO_DO_GRUPO`, `GRUPOS_DE_DISPOSITIVO` (3A); `activeOrg.visibility_mode` (`useAuth`).
- Produces: `TelaUsuarios({ embutida? })`; `JanelaDoUsuario({ aberta, aoFechar, membro: TeamMember | null })`; `AbaGeral({ membro, aoSalvo })`; `AbaPermissoes({ membro })`; `AbaContasEDispositivos({ membro })`.

**Como cada aba salva** (como a Clint): Geral e Permissões juntam as mudanças e gravam no "Salvar alterações" (o botão fica apagado sem mudança, c92); Contas e dispositivos grava cada toggle na hora e o rodapé tem "Fechar" (c95). Trocar o grupo para um papel chama o `PATCH` do papel do original e apaga as exceções (N6); "Salvar grupo personalizado" fica "Em breve".

Abra c40 e c90–c95 antes de escrever.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-tela-usuarios.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaDoUsuario } from "@/components/escale/conversas/configuracoes/usuarios/JanelaDoUsuario";
import { TelaUsuarios } from "@/components/escale/conversas/configuracoes/usuarios/TelaUsuarios";

const gravarPermissoes = vi.fn();
const resetar = vi.fn();
const mudarPapel = vi.fn();
const gravarSetores = vi.fn();
const gravarRoteamento = vi.fn();
const membros = [
  { user_id: "u1", role: "admin", full_name: "Régis Marques", email: "regis@x.com", revoked_at: null, accepted_at: "2026-01-01", invited_at: null, created_at: "", last_sign_in_at: null },
  { user_id: "u2", role: "agent", full_name: "Henrique Fraga Negrão Pereira", email: "henrique@x.com", revoked_at: null, accepted_at: null, invited_at: null, created_at: "", last_sign_in_at: null },
];
let excecoes: Record<string, boolean> = {};
vi.mock("@/hooks/team/useTeamMembers", () => ({ useTeamMembers: () => ({ data: { data: membros } }) }));
vi.mock("@/hooks/team/useChangeRole", () => ({ useChangeRole: () => ({ mutateAsync: mudarPapel, isPending: false }) }));
vi.mock("@/hooks/escale/useUsuariosDaCasca", () => ({
  useUsuariosDaCasca: () => ({ u2: { setores: ["s1"], excecoes: Object.keys(excecoes).length } }),
  useGravarSetoresDoUsuario: () => ({ mutateAsync: gravarSetores, isPending: false }),
}));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({
  usePermissoesDoUsuario: () => ({ data: { excecoes } }),
  useGravarPermissoes: () => ({ mutateAsync: gravarPermissoes, isPending: false }),
  useResetarPermissoes: () => ({ mutateAsync: resetar, isPending: false }),
}));
vi.mock("@/hooks/escale/useSetores", () => ({ useSetores: () => ({ data: [{ id: "s1", nome: "Atendimento", cor: "#0EA5C6", membros: ["u2"], dispositivos: 1, ids_dos_dispositivos: ["d1"] }] }) }));
vi.mock("@/hooks/escale/useDispositivosDaCasca", () => ({
  useRoteamentoDosCanais: () => ({ data: { channels: [{ id: "d1", user_ids: ["u2"], mode: "restricted" }, { id: "d2", user_ids: [], mode: "restricted_empty" }], members: [] } }),
  useGravarRoteamento: () => ({ mutate: gravarRoteamento, isPending: false }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: [
    { id: "d1", provider: "waha", display_name: "Thiago - Credenciados", phone_number: null, status: "WORKING" },
    { id: "d2", provider: "waha", display_name: "BOT Regis", phone_number: null, status: "WORKING" },
  ] }),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: "admin", visibility_mode: "own_and_unassigned" } }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...p }: { href: string; children: ReactNode }) => <a href={href} {...p}>{children}</a> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  for (const f of [gravarPermissoes, resetar, mudarPapel, gravarSetores, gravarRoteamento]) f.mockReset().mockResolvedValue(undefined);
  excecoes = {};
});

describe("TelaUsuarios (c40)", () => {
  it("colunas, grupo e busca; 'Adicionar usuário' vai ao convite do original", () => {
    excecoes = { CHAT_BULK_ACTIONS: true };
    wrap(<TelaUsuarios />);
    for (const c of ["Usuário", "Dispositivo", "Permissões de atendimento"]) expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Régis Marques/ })).getByText("Administrador")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Henrique/ })).getByText("Personalizado")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar por nome, e-mail ou telefone"), { target: { value: "henri" } });
    expect(screen.queryByRole("row", { name: /Régis Marques/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Adicionar usuário" })).toHaveAttribute("href", "/app/team/invite");
  });
});

describe("JanelaDoUsuario (c90–c95)", () => {
  it("Geral: nome e sobrenome do full_name, telefone em breve, setores salvam", async () => {
    wrap(<JanelaDoUsuario aberta aoFechar={vi.fn()} membro={membros[1] as never} />);
    expect(screen.getByDisplayValue("Henrique")).toBeDisabled();
    expect(screen.getByDisplayValue("Fraga Negrão Pereira")).toBeDisabled();
    expect(screen.getByLabelText("Telefone")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();
  });
  it("Permissões: as 19, travas, mudar um toggle e 'Desativar todos' gravam no salvar", async () => {
    wrap(<JanelaDoUsuario aberta aoFechar={vi.fn()} membro={membros[1] as never} />);
    fireEvent.click(screen.getByRole("tab", { name: "Permissões" }));
    expect(screen.getAllByRole("switch")).toHaveLength(19);
    expect(screen.getByRole("switch", { name: "Visualização de atendimento" })).toBeDisabled();
    fireEvent.click(screen.getByRole("switch", { name: "Ações em massa" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(gravarPermissoes).toHaveBeenCalledWith({ user_id: "u2", valores: { CHAT_BULK_ACTIONS: true } }));
    fireEvent.click(screen.getByRole("button", { name: "Desativar todos" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() =>
      expect(gravarPermissoes).toHaveBeenLastCalledWith({
        user_id: "u2",
        valores: expect.objectContaining({ CHAT_VIEW_TEAM: false, CHAT_SHARE_QUICK_RESPONSE: false, CHAT_VIEW_QUICK_RESPONSE_OTHER_TEAMS: false, CHAT_BULK_ACTIONS: null }),
      }),
    );
  });
  it("Permissões: trocar o grupo para Gerente muda o papel e apaga as exceções", async () => {
    excecoes = { CHAT_BULK_ACTIONS: true };
    wrap(<JanelaDoUsuario aberta aoFechar={vi.fn()} membro={membros[1] as never} />);
    fireEvent.click(screen.getByRole("tab", { name: "Permissões" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Grupo de permissão:" }));
    fireEvent.click(await screen.findByRole("option", { name: "Gerente" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(mudarPapel).toHaveBeenCalledWith({ userId: "u2", role: "manager" }));
    expect(resetar).toHaveBeenCalledWith("u2");
  });
  it("Contas e dispositivos: um toggle por dispositivo do canal, grava na hora; 'Fechar'", () => {
    const fechar = vi.fn();
    wrap(<JanelaDoUsuario aberta aoFechar={fechar} membro={membros[1] as never} />);
    fireEvent.click(screen.getByRole("tab", { name: "Contas e dispositivos" }));
    expect(screen.getByText("Contas e dispositivos que usuário tem acesso.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Thiago - Credenciados" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("switch", { name: "BOT Regis" }));
    expect(gravarRoteamento).toHaveBeenCalledWith({ channel_session_id: "d2", user_ids: ["u2"] });
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(fechar).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-tela-usuarios.test.tsx`
Expected: FAIL.

- [ ] **Step 3: A lista**

Replace `components/escale/conversas/configuracoes/usuarios/TelaUsuarios.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useRoteamentoDosCanais } from "@/hooks/escale/useDispositivosDaCasca";
import { useUsuariosDaCasca } from "@/hooks/escale/useUsuariosDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers, type TeamMember } from "@/hooks/team/useTeamMembers";
import { dispositivosDoUsuario } from "@/lib/escale/conversas/canais";
import { GRUPOS_DE_DISPOSITIVO, grupoDoDispositivo, type GrupoDeDispositivo } from "@/lib/escale/conversas/nova-conversa";
import { grupoDoUsuario, rotuloDoGrupo, type Papel } from "@/lib/escale/conversas/permissoes";
import { BadgeCheck, Instagram, MessageCircle, Search } from "@/lib/ui/icons-da-casca";

import { CabecaDaConfiguracao } from "../CabecaDaConfiguracao";
import { FotoDaPessoa } from "../FotoDaPessoa";
import { JanelaDoUsuario } from "./JanelaDoUsuario";

const CABECA = "h-10 px-4 text-[11px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha";

function IconeDoCanal({ canal }: { canal: GrupoDeDispositivo }) {
  if (canal === "instagram") return <Instagram size={16} aria-hidden className="text-casca-alerta" />;
  return (
    <span className="relative inline-block">
      <MessageCircle size={16} aria-hidden className="text-[color:var(--escale-status-ganho)]" />
      {canal === "whatsapp_oficial" ? <BadgeCheck size={8} aria-hidden className="absolute -right-0.5 -bottom-0.5 text-casca-novo" /> : null}
    </span>
  );
}

/** "CONFIGURAÇÕES › USUÁRIOS E PERMISSÕES" (c40; E4). Só admin (N17). */
export function TelaUsuarios({ embutida = false }: { embutida?: boolean }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const ehAdmin = activeOrg?.role === "admin";
  const { data: equipe } = useTeamMembers({ enabled: ehAdmin });
  const extras = useUsuariosDaCasca(ehAdmin);
  const roteamento = useRoteamentoDosCanais(ehAdmin);
  const { data: sessoes = [] } = useChannelSessions();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<TeamMember | null>(null);

  const pessoas = useMemo(() => (equipe?.data ?? []).filter((m) => !m.revoked_at), [equipe]);
  const elegiveis = pessoas.filter((p) => p.role !== "viewer").map((p) => p.user_id);
  const termo = busca.trim().toLowerCase();
  const lista = pessoas.filter((p) => !termo || (p.full_name ?? "").toLowerCase().includes(termo) || (p.email ?? "").toLowerCase().includes(termo));
  const canaisDe = (p: TeamMember): GrupoDeDispositivo[] => {
    const ids = dispositivosDoUsuario(p.user_id, p.role as Papel, roteamento.data?.channels ?? [], elegiveis);
    const grupos = new Set(sessoes.filter((s) => ids.includes(s.id)).map((s) => grupoDoDispositivo(s.provider)));
    return GRUPOS_DE_DISPOSITIVO.filter((g) => grupos.has(g));
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-usuarios">
      {!embutida ? <CabecaDaConfiguracao migalhas={[{ rotulo: t("Configurações"), href: "/app/inbox/configuracoes" }, { rotulo: t("Usuários e Permissões") }]} /> : null}
      {!ehAdmin ? (
        <p className="px-6 py-10 text-center text-[13px] text-casca-suave">{t("Só administradores")}</p>
      ) : (
        <>
          <div className="flex h-14 shrink-0 items-center gap-3 px-6">
            <span className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar por nome, e-mail ou telefone")} className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta" />
              <Search size={16} aria-hidden className="text-casca-suave" />
            </span>
            <span className="flex-1" />
            <Link href="/app/team/invite" className="inline-flex h-8 items-center rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-medium text-white hover:opacity-90">{t("Adicionar usuário")}</Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {lista.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[15px] font-semibold text-casca-texto">{t("Nenhum usuário encontrado")}</p>
                <p className="text-[13px] text-casca-suave">{t("Tente ajustar o termo da busca.")}</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-casca-borda">
                    <th className={`${CABECA} text-left`}>{t("Usuário")}</th>
                    <th className={`${CABECA} w-[200px] text-center`}>{t("Dispositivo")}</th>
                    <th className={`${CABECA} w-[260px] text-center`}>{t("Permissões de atendimento")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => {
                    const nome = p.full_name?.trim() || p.email || "";
                    const grupo = grupoDoUsuario(p.role as Papel, (extras[p.user_id]?.excecoes ?? 0) > 0 ? { CHAT_BULK_ACTIONS: true } : {});
                    return (
                      <tr key={p.user_id} aria-label={nome} onClick={() => setAberto(p)} className="h-[53px] cursor-pointer border-b border-casca-borda hover:bg-casca-raia/50">
                        <td className="px-4">
                          <span className="flex items-center gap-3">
                            <FotoDaPessoa id={p.user_id} nome={nome} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
                                {nome}
                                {p.accepted_at ? <BadgeCheck size={14} aria-label={t("Verificado")} className="text-casca-novo" /> : null}
                              </span>
                              <span className="block truncate text-[13px] text-casca-suave">{p.email}</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-4">
                          <span className="flex items-center justify-center gap-3">{canaisDe(p).map((c) => <IconeDoCanal key={c} canal={c} />)}</span>
                        </td>
                        <td className="px-4 text-center">
                          <span className="inline-flex h-[22px] items-center rounded-md bg-casca-raia px-2 text-[12px] text-casca-texto">{t(rotuloDoGrupo(grupo))}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
      <JanelaDoUsuario aberta={aberto !== null} aoFechar={() => setAberto(null)} membro={aberto} />
    </div>
  );
}
```

`grupoDoUsuario` só precisa saber se há exceção; a lista passa um objeto de uma chave quando o contador é positivo (a janela usa as exceções reais).

- [ ] **Step 4: A janela e as três abas**

Create `components/escale/conversas/configuracoes/usuarios/JanelaDoUsuario.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { TeamMember } from "@/hooks/team/useTeamMembers";
import { BadgeCheck, Trash2 } from "@/lib/ui/icons-da-casca";

import { FotoDaPessoa } from "../FotoDaPessoa";
import { AbaContasEDispositivos } from "./AbaContasEDispositivos";
import { AbaGeral } from "./AbaGeral";
import { AbaPermissoes } from "./AbaPermissoes";

type Aba = "geral" | "permissoes" | "contas";

/** A janela do usuário (c90–c95; E4): Geral, Permissões, Contas e dispositivos. */
export function JanelaDoUsuario({ aberta, aoFechar, membro }: { aberta: boolean; aoFechar: () => void; membro: TeamMember | null }) {
  const t = useT();
  const [aba, setAba] = useState<Aba>("geral");
  useEffect(() => {
    if (aberta) setAba("geral");
  }, [aberta, membro?.user_id]);
  if (!membro) return null;
  const nome = membro.full_name?.trim() || membro.email || "";
  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="flex h-[575px] w-[min(1440px,94vw)] max-w-none flex-col p-0">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-casca-borda px-5">
        <FotoDaPessoa id={membro.user_id} nome={nome} tamanho={32} />
        <span className="text-[16px] text-casca-texto">{nome}</span>
        {membro.accepted_at ? <BadgeCheck size={16} aria-label={t("Verificado")} className="text-casca-suave" /> : null}
        <Link href="/app/team" aria-label={t("Remover usuário")} title={t("Remover usuário")} className="grid size-7 place-items-center rounded text-casca-suave hover:bg-casca-raia">
          <Trash2 size={16} aria-hidden />
        </Link>
      </div>
      <div className="px-5">
        <AbasDaCasca
          aria-label={t("Seções do usuário")}
          valor={aba}
          aoMudar={setAba}
          abas={[
            { valor: "geral", rotulo: t("Geral") },
            { valor: "permissoes", rotulo: t("Permissões") },
            { valor: "contas", rotulo: t("Contas e dispositivos") },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1">
        {aba === "geral" ? <AbaGeral membro={membro} /> : aba === "permissoes" ? <AbaPermissoes membro={membro} /> : <AbaContasEDispositivos membro={membro} aoFechar={aoFechar} />}
      </div>
    </JanelaDaCasca>
  );
}
```

Create `components/escale/conversas/configuracoes/usuarios/AbaGeral.tsx`:

```tsx
"use client";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useGravarSetoresDoUsuario, useUsuariosDaCasca } from "@/hooks/escale/useUsuariosDaCasca";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import type { TeamMember } from "@/hooks/team/useTeamMembers";

const CAMPO = "h-8 w-full rounded-casca-gatilho bg-casca-busca px-3 text-[13px] text-casca-texto outline-hidden disabled:text-casca-meta";

function Rotulo({ texto, children, id }: { texto: string; children: ReactNode; id: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-2 text-[13px] font-semibold text-casca-texto">
      {texto}
      {children}
    </label>
  );
}

/** Aba Geral (c90, c91; N12): nome do `full_name`, e-mail só leitura, os campos que o original não guarda em breve, Setores salva. */
export function AbaGeral({ membro }: { membro: TeamMember }) {
  const t = useT();
  const extras = useUsuariosDaCasca();
  const { data: setores = [] } = useSetores();
  const gravar = useGravarSetoresDoUsuario();
  const atuais = extras[membro.user_id]?.setores ?? [];
  const [escolhidos, setEscolhidos] = useState<string[]>(atuais);
  useEffect(() => setEscolhidos(atuais), [membro.user_id, atuais.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const completo = membro.full_name?.trim() ?? "";
  const espaco = completo.indexOf(" ");
  const nome = espaco > 0 ? completo.slice(0, espaco) : completo;
  const sobrenome = espaco > 0 ? completo.slice(espaco + 1) : "";
  const mudou = [...escolhidos].sort().join(",") !== [...atuais].sort().join(",");
  const soNoPerfil = t("Só a própria pessoa muda o nome, no perfil.");

  return (
    <div className="flex h-full flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-x-4 gap-y-5 overflow-y-auto px-6 py-6">
        <Rotulo texto={t("Nome")} id="u-nome"><input id="u-nome" className={CAMPO} value={nome} disabled title={soNoPerfil} readOnly /></Rotulo>
        <Rotulo texto={t("Sobrenome")} id="u-sobrenome"><input id="u-sobrenome" className={CAMPO} value={sobrenome} disabled title={soNoPerfil} readOnly /></Rotulo>
        <Rotulo texto={t("E-mail")} id="u-email"><input id="u-email" className={CAMPO} value={membro.email ?? ""} disabled readOnly /></Rotulo>
        <Rotulo texto={t("Telefone")} id="u-telefone"><input id="u-telefone" className={CAMPO} placeholder="BR" disabled title={t("Em breve")} /></Rotulo>
        <div className="col-span-2 border-t border-casca-borda" />
        <Rotulo texto={t("Identificador de usuário")} id="u-identificador"><input id="u-identificador" className={CAMPO} disabled title={t("Em breve")} /></Rotulo>
        <Rotulo texto={t("Link de usuário")} id="u-link"><input id="u-link" className={CAMPO} disabled title={t("Em breve")} /></Rotulo>
        <Rotulo texto={t("WhatsApp")} id="u-whatsapp"><input id="u-whatsapp" className={CAMPO} disabled title={t("Em breve")} /></Rotulo>
        <div />
        <div className="col-span-2 border-t border-casca-borda" />
        <div className="flex flex-col gap-2 text-[13px] font-semibold text-casca-texto">
          {t("Setores")}
          <SeletorMultiploDaCasca valores={escolhidos} opcoes={setores.map((s) => ({ valor: s.id, rotulo: s.nome }))} aoMudar={setEscolhidos} vazio={t("Selecionar setores")} aria-label={t("Setores")} />
        </div>
      </div>
      <div className="flex h-16 shrink-0 items-center justify-end border-t border-casca-borda px-6">
        <button
          type="button"
          disabled={!mudou || gravar.isPending}
          onClick={async () => {
            await gravar.mutateAsync({ userId: membro.user_id, setorIds: escolhidos });
            toast.success(t("As permissões foram atualizadas com sucesso!"));
          }}
          className="h-9 rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-medium text-white disabled:opacity-40"
        >
          {t("Salvar alterações")}
        </button>
      </div>
    </div>
  );
}
```

Create `components/escale/conversas/configuracoes/usuarios/AbaPermissoes.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useGravarPermissoes, usePermissoesDoUsuario, useResetarPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useT } from "@/hooks/i18n/useT";
import { useChangeRole } from "@/hooks/team/useChangeRole";
import type { TeamMember } from "@/hooks/team/useTeamMembers";
import type { Role } from "@/lib/auth/types";
import {
  GRUPOS_DE_PERMISSAO,
  PERMISSOES_DE_CONVERSAS,
  SECOES_DE_PERMISSAO,
  desativarTodos,
  estadoDoToggle,
  excecaoAoMudar,
  grupoDoUsuario,
  type ChaveDePermissao,
  type Excecoes,
  type GrupoDePermissao,
  type Papel,
  type VisibilidadeDaOrganizacao,
} from "@/lib/escale/conversas/permissoes";
import { cn } from "@/lib/utils";

type Pendentes = Partial<Record<ChaveDePermissao, boolean | null>>;

/**
 * Aba Permissões (c92–c94; E4; N4–N6): o grupo (o papel do original ou
 * "Personalizado"), o menu de seções (só Conversas é desta fase), "Desativar
 * todos" e a grade das 19. As mudanças juntam e gravam no "Salvar alterações".
 */
export function AbaPermissoes({ membro }: { membro: TeamMember }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const visibilidade = (activeOrg?.visibility_mode ?? "own_and_unassigned") as VisibilidadeDaOrganizacao;
  const papel = membro.role as Papel;
  const { data } = usePermissoesDoUsuario(membro.user_id);
  const gravar = useGravarPermissoes();
  const resetar = useResetarPermissoes();
  const mudarPapel = useChangeRole();
  const salvas: Excecoes = data?.excecoes ?? {};
  const [pendentes, setPendentes] = useState<Pendentes>({});
  const [grupo, setGrupo] = useState<GrupoDePermissao>(grupoDoUsuario(papel, salvas));
  useEffect(() => {
    setPendentes({});
    setGrupo(grupoDoUsuario(papel, data?.excecoes ?? {}));
  }, [membro.user_id, papel, data]);

  const efetivas: Excecoes = useMemo(() => {
    const e: Excecoes = { ...salvas };
    for (const [chave, v] of Object.entries(pendentes) as Array<[ChaveDePermissao, boolean | null]>) {
      if (v === null) delete e[chave];
      else e[chave] = v;
    }
    return e;
  }, [salvas, pendentes]);
  const grupoEhPapel = grupo !== "personalizado" && grupo !== papel;
  const mudou = grupoEhPapel || Object.keys(pendentes).length > 0;

  const mudar = (chave: ChaveDePermissao, ligado: boolean) => {
    const p = PERMISSOES_DE_CONVERSAS.find((x) => x.chave === chave)!;
    setPendentes((atual) => ({ ...atual, [chave]: excecaoAoMudar(p, papel, ligado) }));
    setGrupo("personalizado");
  };
  const desligarTodas = () => {
    const novas: Pendentes = {};
    for (const [chave] of Object.entries(desativarTodos(papel)) as Array<[ChaveDePermissao, boolean]>) {
      const p = PERMISSOES_DE_CONVERSAS.find((x) => x.chave === chave)!;
      novas[chave] = excecaoAoMudar(p, papel, false);
    }
    setPendentes(novas);
    setGrupo("personalizado");
  };
  const salvar = async () => {
    if (grupoEhPapel) {
      await mudarPapel.mutateAsync({ userId: membro.user_id, role: grupo as Role });
      await resetar.mutateAsync(membro.user_id);
    } else if (Object.keys(pendentes).length > 0) {
      await gravar.mutateAsync({ user_id: membro.user_id, valores: pendentes });
    }
    setPendentes({});
    toast.success(t("As permissões foram atualizadas com sucesso!"));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-end gap-3 border-b border-casca-borda px-6">
        <span className="text-[13px] text-casca-texto">{t("Grupo de permissão:")}</span>
        <SeletorDaCasca
          aparencia="janela"
          valor={grupo}
          opcoes={GRUPOS_DE_PERMISSAO.map((g) => ({ valor: g.valor, rotulo: t(g.rotulo) }))}
          aoMudar={(g) => {
            setGrupo(g);
            setPendentes({});
          }}
          aria-label={t("Grupo de permissão:")}
          className="w-[190px]"
        />
        <span title={t("Em breve")} aria-disabled="true" className="text-[13px] font-medium text-casca-marca opacity-50">{t("Salvar grupo personalizado")}</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <nav aria-label={t("Seções de permissão")} className="w-[200px] shrink-0 overflow-y-auto border-r border-casca-borda py-4 pl-6">
          {SECOES_DE_PERMISSAO.map((s) => (
            <span
              key={s.chave}
              aria-current={s.ativa ? "page" : undefined}
              aria-disabled={!s.ativa}
              title={s.ativa ? undefined : t("Em breve")}
              className={cn("flex h-[41px] items-center rounded-r-md px-3 text-[13px]", s.ativa ? "border-l-[3px] border-casca-marca bg-casca-raia font-medium text-casca-texto" : "text-casca-suave opacity-60")}
            >
              {t(s.rotulo)}
            </span>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col px-6 py-4">
          <div className="flex items-start justify-between border-b border-casca-borda pb-3">
            <span>
              <span className="block text-[15px] font-medium text-casca-texto">{t("Conversas")}</span>
              <span className="block text-[13px] text-casca-suave">{t("Configure as permissões desta seção.")}</span>
            </span>
            <button type="button" onClick={desligarTodas} disabled={papel === "admin"} className="h-8 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia disabled:opacity-40">
              {t("Desativar todos")}
            </button>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-x-4 overflow-y-auto lg:grid-cols-3">
            {PERMISSOES_DE_CONVERSAS.map((p) => {
              const e = estadoDoToggle(p, { papel: grupoEhPapel ? (grupo as Papel) : papel, visibilidade, excecoes: grupoEhPapel ? {} : efetivas });
              return (
                <div key={p.chave} className="flex min-h-[86px] items-center gap-4 border-b border-casca-borda px-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-casca-texto">{t(p.rotulo)}</span>
                    <span className="block text-[13px] text-casca-suave">{t(p.descricao)}</span>
                  </span>
                  <InterruptorDaCasca ligado={e.ligado} desabilitado={e.travado} title={e.dica ? t(e.dica) : undefined} aoMudar={(v) => mudar(p.chave, v)} aria-label={t(p.rotulo)} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex h-16 shrink-0 items-center justify-end border-t border-casca-borda px-6">
        <button type="button" disabled={!mudou || gravar.isPending || mudarPapel.isPending} onClick={() => void salvar()} className="h-9 rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-medium text-white disabled:opacity-40">
          {t("Salvar alterações")}
        </button>
      </div>
    </div>
  );
}
```

A dica "Disponível a partir de Gerente" vem pronta de `estadoDoToggle`; o `t()` traduz a frase inteira (o dicionário da Task 14 tem as quatro variantes: "Disponível a partir de Atendente/Gerente/Administrador/Leitor"). O grupo de um admin pode mudar; o `PATCH` do papel do original recusa tirar o último admin ("É necessário ter ao menos um usuário administrador!").

Create `components/escale/conversas/configuracoes/usuarios/AbaContasEDispositivos.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useGravarRoteamento, useRoteamentoDosCanais } from "@/hooks/escale/useDispositivosDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers, type TeamMember } from "@/hooks/team/useTeamMembers";
import { ligarNoDispositivo, quemEstaNoDispositivo } from "@/lib/escale/conversas/canais";
import { GRUPOS_DE_DISPOSITIVO, ROTULO_DO_GRUPO, grupoDoDispositivo, type GrupoDeDispositivo } from "@/lib/escale/conversas/nova-conversa";
import { Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** Aba Contas e dispositivos (c95; N13): por canal, um toggle por dispositivo; grava na hora. */
export function AbaContasEDispositivos({ membro, aoFechar }: { membro: TeamMember; aoFechar: () => void }) {
  const t = useT();
  const { data: sessoes = [] } = useChannelSessions();
  const roteamento = useRoteamentoDosCanais();
  const gravar = useGravarRoteamento();
  const { data: equipe } = useTeamMembers();
  const elegiveis = useMemo(() => (equipe?.data ?? []).filter((m) => !m.revoked_at && m.role !== "viewer").map((m) => m.user_id), [equipe]);
  const canais = GRUPOS_DE_DISPOSITIVO.filter((g) => sessoes.some((s) => grupoDoDispositivo(s.provider) === g));
  const [canal, setCanal] = useState<GrupoDeDispositivo | null>(null);
  const atual = canal ?? canais[0] ?? null;
  const [busca, setBusca] = useState("");
  const ehAdmin = membro.role === "admin";
  const termo = busca.trim().toLowerCase();
  const doCanal = sessoes.filter((s) => grupoDoDispositivo(s.provider) === atual).filter((s) => !termo || (s.display_name ?? "").toLowerCase().includes(termo));
  const ligado = (id: string) => {
    if (ehAdmin) return true;
    const c = roteamento.data?.channels.find((x) => x.id === id);
    return c ? quemEstaNoDispositivo(c, elegiveis).includes(membro.user_id) : false;
  };
  const mudar = (id: string, v: boolean) => {
    const c = roteamento.data?.channels.find((x) => x.id === id);
    if (!c) return;
    gravar.mutate({ channel_session_id: id, user_ids: ligarNoDispositivo(c, elegiveis, membro.user_id, v) });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-5 pb-3 text-[13px] text-casca-texto">
        <p>{t("Contas e dispositivos que usuário tem acesso.")}</p>
        <p>{t("Estes estão associados aos setores aos quais o usuário pertence. Ele pode selecioná-los em atividades e tem autorização para acessá-los no atendimento.")}</p>
      </div>
      <div className="flex min-h-0 flex-1">
        <nav aria-label={t("Canais")} className="w-[220px] shrink-0 border-r border-casca-borda pl-6">
          {canais.map((g) => (
            <button key={g} type="button" onClick={() => setCanal(g)} aria-current={g === atual ? "page" : undefined} className={cn("flex h-[41px] w-full items-center rounded-r-md px-3 text-left text-[13px]", g === atual ? "border-l-[3px] border-casca-marca bg-casca-raia font-medium text-casca-marca" : "text-casca-texto hover:bg-casca-raia")}>
              {t(ROTULO_DO_GRUPO[g])}
            </button>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col px-6">
          <div className="flex items-center justify-between border-b border-casca-borda pb-3">
            <span className="text-[15px] font-medium text-casca-texto">{atual ? t(ROTULO_DO_GRUPO[atual]) : ""}</span>
            <button
              type="button"
              disabled={ehAdmin || !roteamento.data}
              onClick={() => {
                for (const s of doCanal) {
                  const c = roteamento.data?.channels.find((x) => x.id === s.id);
                  if (c && !quemEstaNoDispositivo(c, elegiveis).includes(membro.user_id)) {
                    gravar.mutate({ channel_session_id: s.id, user_ids: ligarNoDispositivo(c, elegiveis, membro.user_id, true) });
                  }
                }
              }}
              className="h-8 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia disabled:opacity-40"
            >
              {t("Ativar Todos")}
            </button>
          </div>
          <span className="mt-3 flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar por...")} className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta" />
            <Search size={16} aria-hidden className="text-casca-suave" />
          </span>
          <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 content-start overflow-y-auto lg:grid-cols-3">
            {doCanal.map((s) => {
              const nome = s.display_name?.trim() || s.phone_number || "";
              return (
                <span key={s.id} className="flex h-[45px] items-center gap-3 border-b border-casca-borda px-3 text-[13px] text-casca-texto">
                  <InterruptorDaCasca ligado={ligado(s.id)} desabilitado={ehAdmin || !roteamento.data || gravar.isPending} title={ehAdmin ? t("Usuário administrador") : undefined} aoMudar={(v) => mudar(s.id, v)} aria-label={nome} />
                  {nome}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex h-16 shrink-0 items-center justify-end border-t border-casca-borda px-6">
        <button type="button" onClick={aoFechar} className="h-9 rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-medium text-white">{t("Fechar")}</button>
      </div>
    </div>
  );
}
```

O "Ativar Todos" desta aba liga a pessoa em todos os dispositivos do canal (não todas as pessoas num dispositivo). O teste espera `user_ids: ["u2"]` ao ligar o "BOT Regis" (`restricted_empty`): `ligarNoDispositivo` parte de `[]` e põe `u2`.

Create `app/app/inbox/configuracoes/usuarios/page.tsx`:

```tsx
import { TelaUsuarios } from "@/components/escale/conversas/configuracoes/usuarios/TelaUsuarios";

import { paginaDaConfiguracao } from "../_casca";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  return paginaDaConfiguracao(<TelaUsuarios />);
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-tela-usuarios.test.tsx tests/unit/escale-tela-canais.test.tsx && corepack pnpm prettier --write components/escale/conversas/configuracoes app/app/inbox/configuracoes && corepack pnpm eslint components/escale/conversas/configuracoes app/app/inbox/configuracoes && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/escale/conversas/configuracoes app/app/inbox/configuracoes/usuarios tests/unit/escale-tela-usuarios.test.tsx
git commit -m "feat(escale): Usuários e Permissões — lista e janela com Geral, as 19 permissões e Contas e dispositivos (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: Respostas rápidas — a tela, "Criar Resposta rápida" e o painel do compositor (E6, C6)

**Files:**
- Create: `components/escale/conversas/configuracoes/respostas/TelaRespostasRapidas.tsx`, `components/escale/conversas/configuracoes/respostas/JanelaRespostaRapida.tsx`, `app/app/inbox/configuracoes/respostas-rapidas/page.tsx`, `tests/unit/escale-tela-respostas-rapidas.test.tsx`
- Modify: `components/escale/conversas/centro/compositor/PainelRespostasRapidas.tsx` (3B: a rota da conversa, o filtro de setor, o ⚙ e "+ Nova resposta"), `components/escale/conversas/centro/compositor/CompositorDaCasca.tsx` (3B: passa `conversationId` ao painel), `tests/unit/escale-compositor-da-casca.test.tsx` (3B: o bloco das respostas rápidas lê a rota nova)

**Interfaces:**
- Consumes: `useRespostasRapidas`, `useSalvarResposta`, `useExcluirResposta`, `useRespostasDaConversa` (Task 7); `useSetores`, `useMinhasPermissoes` (Task 7); `respostaSchema`, `comBarra`, `FILTRO_TODOS`, `FILTRO_PESSOAIS`, `CANAIS_DA_RESPOSTA`, `type RespostaLida`, `type NovaResposta` (Task 1); `interpolateTemplate` (`lib/inbox/template-vars`); `EmojiButton` (`components/inbox/composer/EmojiButton`); `PaginacaoDaCasca`, `SeletorDaCasca`, `SeletorMultiploDaCasca` (`exclusiva`), `AjudaDaCasca` (3A).
- Produces: `TelaRespostasRapidas()`; `JanelaRespostaRapida({ aberta, aoFechar, resposta: RespostaLida | null })`; `PainelRespostasRapidas({ aberto, aoFechar, termoInicial, contato, aoEscolher, conversationId })`.

Abra c09, c41, c96 e c97 antes de escrever.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-tela-respostas-rapidas.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaRespostaRapida } from "@/components/escale/conversas/configuracoes/respostas/JanelaRespostaRapida";
import { TelaRespostasRapidas } from "@/components/escale/conversas/configuracoes/respostas/TelaRespostasRapidas";

const salvar = vi.fn();
const excluir = vi.fn();
let papel = "agent";
let permissoes: Record<string, boolean> = { CHAT_SHARE_QUICK_RESPONSE: true };
const respostas = [
  { id: "r1", atalho: "Enquanto isso", corpo: "Enquanto isso, vou te passar o Instagram", canais: ["whatsapp", "instagram"], compartilhada: true, todos_os_setores: true, setores: [], dono: null, criada_por: "u9", atualizada_em: "" },
  { id: "r2", atalho: "pix", corpo: "Chave pix: 123", canais: ["whatsapp"], compartilhada: false, todos_os_setores: false, setores: ["s1"], dono: "u1", criada_por: "u1", atualizada_em: "" },
];
const filtrosUsados: unknown[] = [];
vi.mock("@/hooks/escale/useRespostasRapidas", () => ({
  useRespostasRapidas: (f: unknown) => {
    filtrosUsados.push(f);
    return { data: { data: respostas, meta: { total: 2, pagina: 1, por_pagina: 10 } }, isLoading: false };
  },
  useSalvarResposta: () => ({ mutateAsync: salvar, isPending: false }),
  useExcluirResposta: () => ({ mutate: excluir, isPending: false }),
}));
vi.mock("@/hooks/escale/useSetores", () => ({ useSetores: () => ({ data: [{ id: "s1", nome: "Atendimento", cor: "#0EA5C6", membros: [], dispositivos: 0, ids_dos_dispositivos: [] }] }) }));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({ useMinhasPermissoes: () => permissoes }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: papel } }) }));
vi.mock("@/components/inbox/composer/EmojiButton", () => ({ EmojiButton: ({ onPick }: { onPick: (e: string) => void }) => <button type="button" aria-label="Emoji" onClick={() => onPick("😀")} /> }));
vi.mock("next/link", () => ({ default: ({ href, children, ...p }: { href: string; children: ReactNode }) => <a href={href} {...p}>{children}</a> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  salvar.mockReset().mockResolvedValue({ data: { id: "r9" } });
  excluir.mockClear();
  papel = "agent";
  permissoes = { CHAT_SHARE_QUICK_RESPONSE: true };
  filtrosUsados.length = 0;
});

describe("TelaRespostasRapidas (c41, c97)", () => {
  it("colunas, '/atalho', setores 'Todos', o ⋮ só onde pode mexer; filtro Setor", () => {
    wrap(<TelaRespostasRapidas />);
    for (const c of ["Atalho", "Conteúdo", "Setores", "Canais"]) expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    const r1 = screen.getByRole("row", { name: /Enquanto isso/ });
    expect(within(r1).getByText("/Enquanto isso")).toBeInTheDocument();
    expect(within(r1).getByText("Todos")).toBeInTheDocument();
    expect(within(r1).queryByRole("button", { name: "Mais ações" })).toBeNull();
    const r2 = screen.getByRole("row", { name: /pix/ });
    expect(within(r2).getByText("Atendimento")).toBeInTheDocument();
    expect(within(r2).getByRole("button", { name: "Mais ações" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "Setor" }));
    fireEvent.click(screen.getByRole("option", { name: "Pessoais" }));
    expect(filtrosUsados.at(-1)).toMatchObject({ setor: "pessoais", pagina: 1 });
  });
});

describe("JanelaRespostaRapida (c96)", () => {
  it("cria com atalho, conteúdo, canais, compartilhar e setores", async () => {
    const fechar = vi.fn();
    wrap(<JanelaRespostaRapida aberta aoFechar={fechar} resposta={null} />);
    expect(screen.getByText("Você pode criar respostas rápidas para utilizar no chat de atendimento")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Escreva uma mensagem..."), { target: { value: "Olá" } });
    fireEvent.click(screen.getByRole("button", { name: "Emoji" }));
    fireEvent.change(screen.getByPlaceholderText("Digite o atalho"), { target: { value: "ola" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Instagram" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Compartilhar com outros usuários" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(salvar).toHaveBeenCalledWith({ atalho: "ola", corpo: "Olá😀", canais: ["whatsapp"], compartilhar: true, todos_os_setores: true, setores: [] }),
    );
    expect(fechar).toHaveBeenCalled();
  });
  it("sem permissão de compartilhar, a caixinha fica desligada; editar carrega a resposta", () => {
    permissoes = {};
    wrap(<JanelaRespostaRapida aberta aoFechar={vi.fn()} resposta={respostas[1] as never} />);
    expect(screen.getByText("Editar Resposta rápida")).toBeInTheDocument();
    expect(screen.getByDisplayValue("pix")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Compartilhar com outros usuários" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-tela-respostas-rapidas.test.tsx`
Expected: FAIL.

- [ ] **Step 3: A janela "Criar Resposta rápida"**

Create `components/escale/conversas/configuracoes/respostas/JanelaRespostaRapida.tsx`:

```tsx
"use client";
import * as Popover from "@radix-ui/react-popover";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EmojiButton } from "@/components/inbox/composer/EmojiButton";
import { BotaoDaJanela, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useSalvarResposta } from "@/hooks/escale/useRespostasRapidas";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { roleAtLeast } from "@/lib/auth/types";
import { respostaSchema, type CanalDaResposta, type RespostaLida } from "@/lib/escale/conversas/respostas";
import { AlertTriangle, Braces, Camera, Check, Gift, Instagram, MessageCircle, Mic, Paperclip, PlusCircle, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const TODOS = "todos";
const VARIAVEIS = ["{{nome}}", "{{primeiro_nome}}"] as const;
const ICONE_EM_BREVE = "grid size-7 place-items-center rounded text-casca-meta";

/**
 * "CRIAR / EDITAR RESPOSTA RÁPIDA" (c96; E6; N14). Uma mensagem por resposta;
 * emoji e variáveis funcionam; GIF, anexo, câmera, áudio e "+ Adicionar"
 * ficam "Em breve". "Compartilhar" exige gerente ou a exceção da Clint.
 */
export function JanelaRespostaRapida({ aberta, aoFechar, resposta }: { aberta: boolean; aoFechar: () => void; resposta: RespostaLida | null }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const minhas = useMinhasPermissoes();
  const podeCompartilhar = roleAtLeast(activeOrg?.role, "manager") || minhas.CHAT_SHARE_QUICK_RESPONSE === true;
  const { data: setores = [] } = useSetores();
  const salvar = useSalvarResposta();
  const campoRef = useRef<HTMLTextAreaElement | null>(null);
  const [corpo, setCorpo] = useState("");
  const [atalho, setAtalho] = useState("");
  const [canais, setCanais] = useState<CanalDaResposta[]>(["whatsapp", "instagram"]);
  const [compartilhar, setCompartilhar] = useState(false);
  const [escolhidos, setEscolhidos] = useState<string[]>([TODOS]);
  useEffect(() => {
    if (!aberta) return;
    setCorpo(resposta?.corpo ?? "");
    setAtalho(resposta?.atalho ?? "");
    setCanais(resposta?.canais ?? ["whatsapp", "instagram"]);
    setCompartilhar(resposta?.compartilhada ?? false);
    setEscolhidos(resposta && !resposta.todos_os_setores ? resposta.setores : [TODOS]);
  }, [aberta, resposta]);

  const inserir = (trecho: string) => {
    const el = campoRef.current;
    const ini = el?.selectionStart ?? corpo.length;
    const fim = el?.selectionEnd ?? corpo.length;
    setCorpo(corpo.slice(0, ini) + trecho + corpo.slice(fim));
  };
  const alternarCanal = (c: CanalDaResposta) => setCanais((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]));
  const todos = escolhidos.length === 0 || escolhidos.includes(TODOS);
  const nova = { atalho: atalho.trim().replace(/^\/+/, ""), corpo: corpo.trim(), canais, compartilhar, todos_os_setores: todos, setores: todos ? [] : escolhidos };
  const valida = respostaSchema.safeParse(nova).success;

  const confirmar = async () => {
    if (!valida) return;
    await salvar.mutateAsync({ ...(resposta ? { id: resposta.id } : {}), ...nova });
    toast.success(resposta ? t("Resposta rápida atualizada.") : t("Resposta rápida criada."));
    aoFechar();
  };

  const Canal = ({ canal, rotulo, icone }: { canal: CanalDaResposta; rotulo: string; icone: React.ReactNode }) => (
    <button type="button" role="checkbox" aria-checked={canais.includes(canal)} aria-label={rotulo} onClick={() => alternarCanal(canal)} className={cn("relative grid size-7 place-items-center rounded-md bg-casca-raia", canais.includes(canal) && "bg-casca-marca-suave")}>
      {icone}
      {canais.includes(canal) ? <span className="absolute -top-1.5 -right-1.5 grid size-3.5 place-items-center rounded-full bg-casca-novo text-white"><Check size={9} aria-hidden /></span> : null}
    </button>
  );

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[672px] p-0">
      <div className="flex h-14 items-center justify-between border-b border-casca-borda px-5">
        <span className="text-[15px] text-casca-texto">{resposta ? t("Editar Resposta rápida") : t("Criar Resposta rápida")}</span>
        <button type="button" aria-label={t("Fechar")} onClick={aoFechar} className="grid size-7 place-items-center rounded text-casca-suave hover:bg-casca-raia"><X size={16} aria-hidden /></button>
      </div>
      <div className="flex max-h-[560px] flex-col gap-5 overflow-y-auto px-6 py-5">
        <p className="flex items-center gap-2 rounded-md border border-casca-pausa-texto/40 bg-casca-pausa px-3 py-2 text-[13px] font-semibold text-casca-pausa-texto">
          <AlertTriangle size={18} aria-hidden />
          {t("Você pode criar respostas rápidas para utilizar no chat de atendimento")}
        </p>
        <div className="rounded-md shadow-casca-painel">
          <textarea ref={campoRef} value={corpo} onChange={(e) => setCorpo(e.target.value)} placeholder={t("Escreva uma mensagem...")} aria-label={t("Mensagem")} className="h-24 w-full resize-none rounded-t-md bg-white px-3 py-2.5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta" />
          <div className="flex h-10 items-center gap-1 border-t border-casca-borda px-2">
            <EmojiButton onPick={inserir} />
            <span title={t("Em breve")} className={ICONE_EM_BREVE}><Gift size={16} aria-hidden /></span>
            <span title={t("Em breve")} className={ICONE_EM_BREVE}><Paperclip size={16} aria-hidden /></span>
            <span title={t("Em breve")} className={ICONE_EM_BREVE}><Camera size={16} aria-hidden /></span>
            <span title={t("Em breve")} className={ICONE_EM_BREVE}><Mic size={16} aria-hidden /></span>
            <Popover.Root>
              <Popover.Trigger asChild>
                <button type="button" aria-label={t("Variáveis")} title={t("Variáveis")} className="grid size-7 place-items-center rounded text-casca-suave hover:bg-casca-raia"><Braces size={16} aria-hidden /></button>
              </Popover.Trigger>
              <PainelSuspenso className="w-[200px] py-1">
                {VARIAVEIS.map((v) => (
                  <button key={v} type="button" onClick={() => inserir(v)} className="flex h-8 w-full items-center px-3 text-left font-mono text-[12px] text-casca-texto hover:bg-casca-raia">{v}</button>
                ))}
              </PainelSuspenso>
            </Popover.Root>
            <span className="flex-1" />
            <span title={t("Em breve")} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-casca-marca/60 px-3 text-[13px] font-medium text-white"><PlusCircle size={16} aria-hidden />{t("Adicionar")}</span>
          </div>
        </div>
        <label className="flex flex-col gap-2 text-[15px] text-casca-texto">
          {t("Atalho")}
          <input value={atalho} onChange={(e) => setAtalho(e.target.value)} placeholder={t("Digite o atalho")} maxLength={60} className="h-9 rounded-casca-gatilho bg-casca-busca px-3 text-[13px] outline-hidden placeholder:text-casca-meta" />
        </label>
        <div className="flex items-center gap-3 text-[15px] text-casca-texto">
          {t("Utilizar em:")}
          <Canal canal="whatsapp" rotulo="WhatsApp" icone={<MessageCircle size={16} aria-hidden className="text-casca-texto" />} />
          <Canal canal="instagram" rotulo="Instagram" icone={<Instagram size={16} aria-hidden className="text-casca-texto" />} />
        </div>
        <label className={cn("flex items-center gap-2 text-[14px] text-casca-texto", !podeCompartilhar && "opacity-50")} title={podeCompartilhar ? undefined : t("Você não pode compartilhar respostas rápidas.")}>
          <input type="checkbox" checked={compartilhar} disabled={!podeCompartilhar} onChange={(e) => setCompartilhar(e.target.checked)} aria-label={t("Compartilhar com outros usuários")} className="size-5 accent-[color:var(--color-casca-novo)]" />
          {t("Compartilhar com outros usuários")}
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-casca-texto">{t("Setores")}</span>
          <div className="w-[190px]">
            <SeletorMultiploDaCasca
              valores={escolhidos}
              opcoes={[{ valor: TODOS, rotulo: t("Todos os setores") }, ...setores.map((s) => ({ valor: s.id, rotulo: s.nome }))]}
              exclusiva={TODOS}
              aoMudar={(v) => setEscolhidos(v.length === 0 ? [TODOS] : v)}
              vazio={t("Todos os setores")}
              aria-label={t("Setores")}
            />
          </div>
          <span className="text-[13px] text-casca-suave">{t("A resposta ficará disponível para os usuários ao atender conversas destes setores.")}</span>
        </div>
      </div>
      <div className="px-6 pb-4">
        <RodapeDaJanela>
          <BotaoDaJanela variante="cancelar" onClick={aoFechar}>{t("Cancelar")}</BotaoDaJanela>
          <BotaoDaJanela variante="salvar" disabled={!valida || salvar.isPending} onClick={() => void confirmar()}>{t("Salvar")}</BotaoDaJanela>
        </RodapeDaJanela>
      </div>
    </JanelaDaCasca>
  );
}
```

`PlusCircle` e `Braces` entram no bloco de ícones da 3C (Task 8) se faltarem. O ⓥ da barra da Clint (o último ícone) não tem equivalente no original e não é desenhado (diferença anotada).

- [ ] **Step 4: A tela**

Create `components/escale/conversas/configuracoes/respostas/TelaRespostasRapidas.tsx`:

```tsx
"use client";
import { useState } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useMinhasPermissoes } from "@/hooks/escale/usePermissoesDeAtendimento";
import { useExcluirResposta, useRespostasRapidas } from "@/hooks/escale/useRespostasRapidas";
import { useSetores } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import { roleAtLeast } from "@/lib/auth/types";
import { FILTRO_PESSOAIS, FILTRO_TODOS, comBarra, type RespostaLida } from "@/lib/escale/conversas/respostas";
import { Instagram, MessageCircle, Pencil, Search, Trash2 } from "@/lib/ui/icons-da-casca";

import { CabecaDaConfiguracao } from "../CabecaDaConfiguracao";
import { MenuDaLinhaDeConfiguracao } from "../MenuDaLinhaDeConfiguracao";
import { JanelaRespostaRapida } from "./JanelaRespostaRapida";

const CABECA = "h-10 px-4 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-casca-sobrelinha";
const POR_PAGINA = [10, 25, 50] as const;

/** "CONFIGURAÇÕES › RESPOSTAS RÁPIDAS" (c41, c97; E6). */
export function TelaRespostasRapidas() {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const minhas = useMinhasPermissoes();
  const ehGerente = roleAtLeast(activeOrg?.role, "manager");
  const { data: setores = [] } = useSetores();
  const [busca, setBusca] = useState("");
  const [setor, setSetor] = useState<string>(FILTRO_TODOS);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA[0]);
  const [janela, setJanela] = useState<{ resposta: RespostaLida | null } | null>(null);
  const { data, isLoading } = useRespostasRapidas({ busca, setor, pagina, por_pagina: porPagina });
  const excluir = useExcluirResposta();
  const itens = data?.data ?? [];
  const nomeDoSetor = (id: string) => setores.find((s) => s.id === id)?.nome ?? "";
  const podeMexer = (r: RespostaLida) => r.dono === user.id || (r.compartilhada && ehGerente) || minhas.CHAT_EDIT_QUICK_RESPONSE === true;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-respostas-rapidas">
      <CabecaDaConfiguracao migalhas={[{ rotulo: t("Configurações"), href: "/app/inbox/configuracoes" }, { rotulo: t("Respostas rápidas") }]} />
      <div className="flex h-14 shrink-0 items-center gap-3 px-6">
        <span className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
          <input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder={t("Buscar")} className="min-w-0 flex-1 bg-transparent text-[13px] outline-hidden placeholder:text-casca-meta" />
          <Search size={16} aria-hidden className="text-casca-suave" />
        </span>
        <SeletorDaCasca
          valor={setor}
          opcoes={[{ valor: FILTRO_TODOS, rotulo: t("Todos os setores") }, { valor: FILTRO_PESSOAIS, rotulo: t("Pessoais") }, ...setores.map((s) => ({ valor: s.id, rotulo: s.nome }))]}
          aoMudar={(v) => { setSetor(v); setPagina(1); }}
          vazio={t("Setor")}
          aria-label={t("Setor")}
        />
        <span className="flex-1" />
        <AjudaDaCasca texto={t("Crie atalhos de mensagens para responder mais rápido no atendimento.")} />
        <BotaoDaCasca variante="marca" onClick={() => setJanela({ resposta: null })}>{t("Adicionar")}</BotaoDaCasca>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!isLoading && itens.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-[15px] font-semibold text-casca-texto">{t("Você ainda não cadastrou respostas rápidas.")}</p>
            <p className="text-[13px] text-casca-suave">{t("Crie atalhos de mensagens para responder mais rápido no atendimento.")}</p>
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="border-b border-casca-borda">
                <th className={`${CABECA} w-[224px]`}>{t("Atalho")}</th>
                <th className={CABECA}>{t("Conteúdo")}</th>
                <th className={`${CABECA} w-[160px]`}>{t("Setores")}</th>
                <th className={`${CABECA} w-[120px] text-center`}>{t("Canais")}</th>
                <th className={`${CABECA} w-12`} aria-label={t("Ações")} />
              </tr>
            </thead>
            <tbody>
              {itens.map((r) => (
                <tr key={r.id} aria-label={r.atalho} className="border-b border-casca-borda hover:bg-casca-raia/50">
                  <td className="px-4 py-3 text-[13px] text-casca-marca"><span className="block truncate">{comBarra(r.atalho)}</span></td>
                  <td className="px-4 py-3 text-[13px] text-casca-texto"><span className="line-clamp-2">{r.corpo}</span></td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-1">
                      {r.todos_os_setores ? (
                        <span className="rounded bg-casca-raia px-1.5 py-0.5 text-[11px] text-casca-texto">{t("Todos")}</span>
                      ) : (
                        r.setores.map((s) => <span key={s} className="rounded bg-casca-raia px-1.5 py-0.5 text-[11px] text-casca-texto">{nomeDoSetor(s)}</span>)
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center justify-center gap-2">
                      {r.canais.includes("whatsapp") ? <MessageCircle size={14} aria-label="WhatsApp" className="text-[color:var(--escale-status-ganho)]" /> : null}
                      {r.canais.includes("instagram") ? <Instagram size={14} aria-label="Instagram" className="text-casca-alerta" /> : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {podeMexer(r) ? (
                      <MenuDaLinhaDeConfiguracao
                        itens={[
                          { rotulo: t("Editar"), icone: <Pencil size={14} aria-hidden />, aoEscolher: () => setJanela({ resposta: r }) },
                          { rotulo: t("Excluir"), icone: <Trash2 size={14} aria-hidden />, perigo: true, confirmar: `${t("Excluir a resposta")} ${comBarra(r.atalho)}?`, aoEscolher: () => excluir.mutate(r.id) },
                        ]}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="shrink-0 border-t border-casca-borda px-6">
        <PaginacaoDaCasca pagina={pagina} total={data?.meta.total ?? 0} porPagina={porPagina} opcoesPorPagina={POR_PAGINA} aoMudarPagina={setPagina} aoMudarPorPagina={(n) => { setPorPagina(n); setPagina(1); }} />
      </div>
      <JanelaRespostaRapida aberta={janela !== null} aoFechar={() => setJanela(null)} resposta={janela?.resposta ?? null} />
    </div>
  );
}
```

O teste espera que a r1 (compartilhada, de outra pessoa) não tenha ⋮ para um atendente sem a exceção; a r2 é da própria pessoa.

Create `app/app/inbox/configuracoes/respostas-rapidas/page.tsx`:

```tsx
import { TelaRespostasRapidas } from "@/components/escale/conversas/configuracoes/respostas/TelaRespostasRapidas";

import { paginaDaConfiguracao } from "../_casca";

export const dynamic = "force-dynamic";

export default async function RespostasRapidasPage() {
  return paginaDaConfiguracao(<TelaRespostasRapidas />);
}
```

- [ ] **Step 5: O painel do compositor (3B) lê a rota da conversa**

Em `components/escale/conversas/centro/compositor/PainelRespostasRapidas.tsx` (3B):

1. A assinatura ganha `conversationId: string`.
2. Sai `useMessageTemplates`, `TemplateFormDialog` e o tipo `MessageTemplate`; entram:

```tsx
import { JanelaRespostaRapida } from "@/components/escale/conversas/configuracoes/respostas/JanelaRespostaRapida";
import { useRespostasDaConversa } from "@/hooks/escale/useRespostasRapidas";
import { useSetores } from "@/hooks/escale/useSetores";
import { comBarra, type RespostaLida } from "@/lib/escale/conversas/respostas";
```

3. O estado e os dados:

```tsx
  const [setorEscolhido, setSetorEscolhido] = useState<string>("");
  const { data } = useRespostasDaConversa(conversationId, setorEscolhido || null, aberto);
  const { data: setores = [] } = useSetores(aberto);
  const respostas: RespostaLida[] = data?.respostas ?? [];
```

e os grupos passam a filtrar `respostas` (Gerais = `r.compartilhada`; Minhas = `r.dono === user.id`), buscando em `r.atalho` e `r.corpo`, ordenando por `r.atalho`.

4. A linha mostra `comBarra(r.atalho)` na pílula e `r.corpo` embaixo (a Clint mostra o atalho e o conteúdo; o título do original deixa de aparecer); escolher chama `aoEscolher(interpolateTemplate(r.corpo, contato))`.

5. O filtro de setor:

```tsx
        <SeletorDaCasca
          valor={setorEscolhido}
          vazio={t("Setor da conversa")}
          opcoes={setores.map((s) => ({ valor: s.id, rotulo: s.nome }))}
          aoMudar={setSetorEscolhido}
          desabilitado={!data?.podeOutrosSetores}
          dica={data?.podeOutrosSetores ? undefined : t("Consultar respostas rápidas de outros setores")}
          aria-label={t("Setor")}
        />
```

6. O ⚙ leva a `/app/inbox/configuracoes/respostas-rapidas`; "+ Nova resposta" abre `<JanelaRespostaRapida aberta={nova} aoFechar={() => setNova(false)} resposta={null} />`.

Em `CompositorDaCasca.tsx` (3B), o `<PainelRespostasRapidas …>` ganha `conversationId={conversationId}`.

Em `tests/unit/escale-compositor-da-casca.test.tsx` (3B), troque o mock de `useMessageTemplates` por:

```tsx
vi.mock("@/hooks/escale/useRespostasRapidas", () => ({
  useRespostasDaConversa: () => ({
    data: {
      respostas: [
        { id: "t1", atalho: "oi", corpo: "Olá {{nome}}, tudo bem?", canais: ["whatsapp"], compartilhada: true, todos_os_setores: true, setores: [], dono: null, criada_por: null, atualizada_em: "" },
        { id: "t2", atalho: "mi", corpo: "Só minha", canais: ["whatsapp"], compartilhada: false, todos_os_setores: true, setores: [], dono: "u1", criada_por: "u1", atualizada_em: "" },
      ],
      setorDaConversa: null,
      podeOutrosSetores: false,
    },
  }),
  useSalvarResposta: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/escale/useSetores", () => ({ useSetores: () => ({ data: [] }) }));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({ useMinhasPermissoes: () => ({}) }));
```

e, nos dois testes que usam o painel: o compositor com "/oi" procura `await screen.findByText("/oi")`; o bloco "PainelRespostasRapidas" passa `conversationId="c1"`, busca por `"oi"` (some a "mi") e clica em `screen.getByText("/oi")`, esperando `"Olá Ana Souza, tudo bem?"`; "Nova resposta" passa a esperar o título `"Criar Resposta rápida"` (a janela da 3C) no lugar do `data-testid="nova-resposta"` (o mock do `TemplateFormDialog` sai).

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-tela-respostas-rapidas.test.tsx tests/unit/escale-compositor-da-casca.test.tsx && corepack pnpm prettier --write components/escale/conversas app/app/inbox/configuracoes tests/unit/escale-compositor-da-casca.test.tsx && corepack pnpm eslint components/escale/conversas app/app/inbox/configuracoes && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/escale/conversas app/app/inbox/configuracoes/respostas-rapidas lib/ui/icons-da-casca.ts tests/unit/escale-tela-respostas-rapidas.test.tsx tests/unit/escale-compositor-da-casca.test.tsx
git commit -m "feat(escale): Respostas rápidas — tela, criar/editar e o painel do compositor por canal e setor (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 13: O setor na conversa — o chip na fila, o toggle "Setor", o selo e "Alterar setor" no cabeçalho, "Em transferência" e liberar de outra pessoa (C3, E3)

**Files:**
- Create: `components/escale/conversas/centro/SeletorDeSetor.tsx`, `components/escale/conversas/centro/FaixaEmTransferencia.tsx`, `tests/unit/escale-setor-na-conversa.test.tsx`
- Modify: `components/escale/conversas/fila/LinhaDaFila.tsx` e `ListaDaFila.tsx` (3A/3B: o chip), `components/escale/conversas/fila/PainelPersonalizarVisualizacao.tsx` (3A: "Setor" liga), `components/escale/conversas/centro/CabecalhoDaConversa.tsx` (3B: o seletor de setor), `components/escale/conversas/centro/ConversaAberta.tsx` (3B: a faixa), `components/escale/conversas/centro/SeletorDeAtendente.tsx` (3B: liberar de outra pessoa), `tests/unit/escale-cabecalho-da-conversa.test.tsx` (3B: o texto novo do "Sem atendente" e os mocks)

**Interfaces:**
- Consumes: `useSetores`, `useSetoresDasConversas`, `useAlterarSetor`, `useLiberarDeOutro` (Task 7); `useMinhasPermissoes` (Task 7); `MonogramaDoSetor` (Task 9); `filtrarSetores` (Task 1); `SetorDaConversa` (Task 3).
- Produces: `SeletorDeSetor({ conversa })` (o selo 20px clicável + o painel 250px); `FaixaEmTransferencia({ conversa })`; `LinhaDaFila` ganha `setor?: SetorDaConversa`.

Abra c02 e c87 antes de escrever.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-setor-na-conversa.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FaixaEmTransferencia } from "@/components/escale/conversas/centro/FaixaEmTransferencia";
import { SeletorDeAtendente } from "@/components/escale/conversas/centro/SeletorDeAtendente";
import { SeletorDeSetor } from "@/components/escale/conversas/centro/SeletorDeSetor";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const alterar = vi.fn();
const cancelar = vi.fn();
const liberarOutro = vi.fn();
const release = vi.fn();
let setorDaConversa: Record<string, unknown> = {};
let permissoes: Record<string, boolean> = {};
vi.mock("@/hooks/escale/useSetores", () => ({
  useSetores: () => ({ data: [
    { id: "s1", nome: "Atendimento", cor: "#0EA5C6", membros: [], dispositivos: 1, ids_dos_dispositivos: [] },
    { id: "s2", nome: "Suporte SAO", cor: "#F7DB5A", membros: [], dispositivos: 0, ids_dos_dispositivos: [] },
  ] }),
  useSetoresDasConversas: () => setorDaConversa,
  useAlterarSetor: () => ({ alterar: { mutate: alterar, isPending: false }, cancelar: { mutate: cancelar, isPending: false } }),
  useLiberarDeOutro: () => ({ mutate: liberarOutro, isPending: false }),
}));
vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({ useMinhasPermissoes: () => permissoes }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: "agent" } }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [{ user_id: "u2", role: "agent", full_name: "Bia Lima" }] }) }));
vi.mock("@/hooks/inbox/useTransferConversation", () => ({ useTransferConversation: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/hooks/inbox/useClaimConversation", () => ({ useClaimConversation: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/hooks/inbox/useReleaseConversation", () => ({ useReleaseConversation: () => ({ mutate: release, isPending: false }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CV = "c0000000-0000-4000-8000-000000000001";
const conversa = (extra: Partial<ConversationWithContact> = {}) => ({ id: CV, assigned_to_user_id: "u2", assigned_to_user_name: "Bia Lima", ...extra }) as ConversationWithContact;
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  for (const f of [alterar, cancelar, liberarOutro, release]) f.mockClear();
  setorDaConversa = { [CV]: { setor: { id: "s1", nome: "Atendimento", cor: "#0EA5C6" }, em_transferencia: false, setor_anterior: null } };
  permissoes = {};
});

describe("SeletorDeSetor (c02)", () => {
  it("mostra o selo do setor atual; escolher outro chama alterar; a busca filtra", () => {
    wrap(<SeletorDeSetor conversa={conversa()} />);
    const gatilho = screen.getByRole("button", { name: "Alterar setor: Atendimento" });
    expect(gatilho).toHaveTextContent("AT");
    fireEvent.click(gatilho);
    fireEvent.change(screen.getByPlaceholderText("Buscar por setor..."), { target: { value: "sup" } });
    expect(screen.queryByRole("option", { name: /Atendimento/ })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: /Suporte SAO/ }));
    expect(alterar).toHaveBeenCalledWith("s2");
  });
  it("sem setor mostra 'Sem setor'", () => {
    setorDaConversa = { [CV]: { setor: null, em_transferencia: false, setor_anterior: null } };
    wrap(<SeletorDeSetor conversa={conversa()} />);
    expect(screen.getByRole("button", { name: "Alterar setor: Sem setor" })).toBeInTheDocument();
  });
});

describe("FaixaEmTransferencia", () => {
  it("aparece só em transferência e cancela", () => {
    const { rerender, container } = wrap(<FaixaEmTransferencia conversa={conversa()} />);
    expect(container).toBeEmptyDOMElement();
    setorDaConversa = { [CV]: { setor: { id: "s2", nome: "Suporte SAO", cor: "#F7DB5A" }, em_transferencia: true, setor_anterior: { id: "s1", nome: "Atendimento", cor: "#0EA5C6" } } };
    rerender(<QueryClientProvider client={qc}><FaixaEmTransferencia conversa={conversa()} /></QueryClientProvider>);
    expect(screen.getByText("Em transferência para Suporte SAO")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar transferência" }));
    expect(cancelar).toHaveBeenCalled();
  });
});

describe("SeletorDeAtendente: liberar de outra pessoa (N8)", () => {
  it("sem permissão fica desligado com o texto novo; com 'Alterar atendentes' libera pela rota do fork", () => {
    const { unmount } = wrap(<SeletorDeAtendente conversa={conversa()} />);
    fireEvent.click(screen.getByRole("button", { name: /Bia Lima/ }));
    expect(screen.getByRole("option", { name: /Sem atendente/ })).toHaveAttribute("title", "Só o atendente atual ou quem pode alterar atendentes libera a conversa.");
    unmount();
    permissoes = { CHAT_CHANGE_ATTENDANT_ALL: true };
    wrap(<SeletorDeAtendente conversa={conversa()} />);
    fireEvent.click(screen.getByRole("button", { name: /Bia Lima/ }));
    fireEvent.click(screen.getByRole("option", { name: /Sem atendente/ }));
    expect(liberarOutro).toHaveBeenCalledWith(CV, expect.anything());
    expect(release).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-setor-na-conversa.test.tsx`
Expected: FAIL.

- [ ] **Step 3: O seletor de setor e a faixa**

Create `components/escale/conversas/centro/SeletorDeSetor.tsx`:

```tsx
"use client";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { MonogramaDoSetor } from "@/components/escale/conversas/configuracoes/MonogramaDoSetor";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useAlterarSetor, useSetores, useSetoresDasConversas } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { filtrarSetores, ordenarSetores } from "@/lib/escale/conversas/setores";
import { Building2, Check, Search } from "@/lib/ui/icons-da-casca";

const LINHA = "flex h-9 w-full cursor-pointer items-center gap-2 px-3 text-left text-[12px] text-casca-texto hover:bg-casca-raia";

/** O selo do setor no cabeçalho (c02; E3) e "Alterar setor" (C3, N7): o setor novo entra em transferência. */
export function SeletorDeSetor({ conversa }: { conversa: ConversationWithContact }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const { data: setores = [] } = useSetores();
  const doSetor = useSetoresDasConversas([conversa.id])[conversa.id];
  const { alterar } = useAlterarSetor(conversa.id);
  const atual = doSetor?.setor ?? null;
  const lista = ordenarSetores(filtrarSetores(setores, busca));
  return (
    <Popover.Root open={aberto} onOpenChange={(o) => { setAberto(o); if (!o) setBusca(""); }}>
      <Popover.Trigger asChild>
        <button type="button" aria-label={`${t("Alterar setor")}: ${atual?.nome ?? t("Sem setor")}`} title={t("Alterar setor")} disabled={alterar.isPending} className="grid size-7 place-items-center rounded-casca-gatilho hover:bg-casca-raia">
          {atual ? <MonogramaDoSetor setor={atual} tamanho="cabecalho" tracejado={doSetor?.em_transferencia} /> : <Building2 size={16} aria-hidden className="text-casca-suave" />}
        </button>
      </Popover.Trigger>
      <PainelSuspenso align="end" className="w-[250px] p-0">
        <div className="flex h-8 items-center gap-2 border-b border-casca-borda px-3">
          <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar por setor...")} aria-label={t("Buscar setor")} className="min-w-0 flex-1 bg-transparent text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta" />
          <Search size={14} aria-hidden className="text-casca-suave" />
        </div>
        <ul role="listbox" aria-label={t("Setores")} className="max-h-[288px] overflow-y-auto py-1">
          {lista.map((s) => (
            <li
              key={s.id}
              role="option"
              aria-selected={s.id === atual?.id}
              className={LINHA}
              onClick={() => {
                setAberto(false);
                if (s.id !== atual?.id) alterar.mutate(s.id);
              }}
            >
              <MonogramaDoSetor setor={s} tamanho="cabecalho" />
              <span className="flex-1 truncate">{s.nome}</span>
              {s.id === atual?.id ? <Check size={14} aria-hidden className="text-casca-marca" /> : null}
            </li>
          ))}
          {lista.length === 0 ? <li className="px-3 py-2 text-[12px] text-casca-suave">{t("Nenhum setor encontrado...")}</li> : null}
        </ul>
      </PainelSuspenso>
    </Popover.Root>
  );
}
```

Create `components/escale/conversas/centro/FaixaEmTransferencia.tsx`:

```tsx
"use client";
import { useAlterarSetor, useSetoresDasConversas } from "@/hooks/escale/useSetores";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { ArrowRightLeft } from "@/lib/ui/icons-da-casca";

/** "Em transferência para {setor}" + "Cancelar transferência" (C3, N7; provisório: sem print). */
export function FaixaEmTransferencia({ conversa }: { conversa: ConversationWithContact }) {
  const t = useT();
  const doSetor = useSetoresDasConversas([conversa.id])[conversa.id];
  const { cancelar } = useAlterarSetor(conversa.id);
  if (!doSetor?.em_transferencia || !doSetor.setor) return null;
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-t border-casca-borda bg-casca-pausa px-4 text-[12px] text-casca-pausa-texto" data-testid="faixa-em-transferencia">
      <ArrowRightLeft size={14} aria-hidden />
      <span className="flex-1">{`${t("Em transferência para")} ${doSetor.setor.nome}`}</span>
      <button type="button" disabled={cancelar.isPending} onClick={() => cancelar.mutate()} className="font-medium underline-offset-2 hover:underline disabled:opacity-50">
        {t("Cancelar transferência")}
      </button>
    </div>
  );
}
```

`ArrowRightLeft` entra no bloco de ícones da 3C se faltar.

- [ ] **Step 4: Os encaixes na casca (3A/3B)**

`components/escale/conversas/fila/PainelPersonalizarVisualizacao.tsx` (3A): `const EM_BREVE: ReadonlySet<CampoDaLinha> = new Set(["empresa"]);` ("setor" sai; o toggle passa a ligar).

`components/escale/conversas/fila/ListaDaFila.tsx` (3A/3B): 

```tsx
  const setores = useSetoresDasConversas(visualizacao.campos.setor ? [...itens.map((c) => c.id), ...(fixada ? [fixada.id] : [])] : []);
```

(import de `@/hooks/escale/useSetores`) e cada `<LinhaDaFila …>` ganha `setor={setores[c.id]}` (a fixada, `setor={setores[fixada.id]}`).

`components/escale/conversas/fila/LinhaDaFila.tsx` (3A/3B): a prop nova `setor?: SetorDaConversa` (import do tipo de `@/lib/escale/conversas/setores-banco`); `const mostraSetor = visualizacao.campos.setor && !!setor?.setor;`; `segundaLinha` passa a incluir `mostraSetor`; e, como **primeiro** item da segunda linha (antes do tempo sem resposta, c87):

```tsx
              {mostraSetor ? (
                <span title={setor!.em_transferencia ? `${t("Em transferência para")} ${setor!.setor!.nome}` : `${t("Setor:")} ${setor!.setor!.nome}`}>
                  <MonogramaDoSetor setor={setor!.setor!} tamanho="linha" tracejado={setor!.em_transferencia} />
                </span>
              ) : null}
```

(import de `@/components/escale/conversas/configuracoes/MonogramaDoSetor`).

`components/escale/conversas/centro/CabecalhoDaConversa.tsx` (3B): `<SeletorDeSetor conversa={conversa} />` logo ANTES de `<SeletorDeAtendente conversa={conversa} />` (c02: o selo à esquerda do atendente).

`components/escale/conversas/centro/ConversaAberta.tsx` (3B): `<FaixaEmTransferencia conversa={conversa} />` logo ANTES de `<CompositorDaCasca …/>`.

`components/escale/conversas/centro/SeletorDeAtendente.tsx` (3B):

```tsx
  const minhas = useMinhasPermissoes();
  const liberarDeOutro = useLiberarDeOutro();
  const podeLiberarOutros = minhas.CHAT_CHANGE_ATTENDANT_ALL === true || minhas.CHAT_CHANGE_ATTENDANT_TEAM === true;
  const podeLiberar = atualId === null || souOAtendente || podeLiberarOutros;
```

no `escolher(null)`:

```tsx
    if (id === null) {
      if (souOAtendente) liberar.mutate({ conversation_id: conversa.id }, { onError: aoConflito });
      else liberarDeOutro.mutate(conversa.id, {
        onError: (err) => {
          const status = (err as { status?: number }).status;
          if (status === 403) toast.error(t("Só o atendente atual ou quem pode alterar atendentes libera a conversa."));
          else aoConflito(err);
        },
      });
    }
```

o `title` do "Sem atendente" desligado passa a `t("Só o atendente atual ou quem pode alterar atendentes libera a conversa.")`, e `ocupado` inclui `liberarDeOutro.isPending`.

Em `tests/unit/escale-cabecalho-da-conversa.test.tsx` (3B): acrescente os mocks `vi.mock("@/hooks/escale/usePermissoesDeAtendimento", () => ({ useMinhasPermissoes: () => ({}) }))` e `vi.mock("@/hooks/escale/useSetores", () => ({ useSetores: () => ({ data: [] }), useSetoresDasConversas: () => ({}), useAlterarSetor: () => ({ alterar: { mutate: vi.fn(), isPending: false }, cancelar: { mutate: vi.fn(), isPending: false } }), useLiberarDeOutro: () => ({ mutate: vi.fn(), isPending: false }) }))`, e troque o texto esperado no `title` do "Sem atendente" por `"Só o atendente atual ou quem pode alterar atendentes libera a conversa."`. O teste da fila da 3A/3B (`tests/unit/escale-fila-da-casca.test.tsx`) ganha o mock de `useSetoresDasConversas` (`() => ({})`).

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-setor-na-conversa.test.tsx tests/unit/escale-cabecalho-da-conversa.test.tsx $(ls tests/unit | grep -E "escale-(fila|conversas|personalizar)" | sed 's|^|tests/unit/|' | tr '\n' ' ') && corepack pnpm prettier --write components/escale/conversas tests/unit && corepack pnpm eslint components/escale/conversas && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/escale/conversas lib/ui/icons-da-casca.ts tests/unit/escale-setor-na-conversa.test.tsx tests/unit/escale-cabecalho-da-conversa.test.tsx tests/unit
git commit -m "feat(escale): setor na fila e no cabeçalho, Alterar setor com Em transferência e liberar de outra pessoa (Fase 3C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 14: Espanhol, os gates da fase, o PRD, o LOG e o PR

**Files:**
- Modify: `lib/i18n/dicionario.ts`, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md` (seção 8: 3C → "em execução"), `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`

- [ ] **Step 1: O espanhol**

Em `lib/i18n/dicionario.ts`, logo ANTES da linha `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───` (e DEPOIS do bloco da 3B), um bloco com **todo** literal novo desta fase. Rode `corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts` antes: a cerca lista o que falta; a lista abaixo cobre o que as tasks escreveram (acrescente o que a cerca apontar; não repita os que já existem, como "Cancelar", "Salvar", "Em breve", "Editar", "Excluir", "Fechar", "Setor", "Setores", "Dispositivos", "Mensagens agendadas", "Respostas rápidas", "Conversas"):

```ts
  // ─── FORK ESCALE · Fase 3C: setores, permissões e configurações ───
  "Configurações": { es: "Configuración" },
  "Dispositivo": { es: "Dispositivo" },
  "Configure seus dispositivos, atendentes, canais e mais.": { es: "Configura tus dispositivos, agentes, canales y más." },
  "Gerencie os setores de atendimentos do seu time.": { es: "Gestiona los sectores de atención de tu equipo." },
  "Agende uma nova mensagem ou veja quais estão programadas para envio.": { es: "Programa un nuevo mensaje o ve cuáles están programados para envío." },
  "Ajuste as respostas mais usadas pelo seu time.": { es: "Ajusta las respuestas más usadas por tu equipo." },
  "Usuários e Permissões": { es: "Usuarios y Permisos" },
  "Habilite permissões que cada usuário pode fazer no módulo de conversas.": { es: "Habilita los permisos de cada usuario en el módulo de conversaciones." },
  "Notificações": { es: "Notificaciones" },
  "Fique por dentro de todas as notificações de atendimento que você tem acesso.": { es: "Mantente al tanto de todas las notificaciones de atención a las que tienes acceso." },
  "Gerencie seus modelos de mensagem de WhatsApp.": { es: "Gestiona tus plantillas de mensaje de WhatsApp." },
  "WhatsApp Flows": { es: "WhatsApp Flows" },
  "Crie formulários com várias telas e dados do contato já preenchidos.": { es: "Crea formularios con varias pantallas y datos del contacto ya completados." },
  "Análise de templates": { es: "Análisis de plantillas" },
  "Acompanhe entregas, falhas e a saúde dos seus modelos de mensagem.": { es: "Sigue entregas, fallas y la salud de tus plantillas de mensaje." },
  "Só administradores": { es: "Solo administradores" },
  "Buscar por setor...": { es: "Buscar por sector..." },
  "Novo setor": { es: "Nuevo sector" },
  "Conta/Dispositivo": { es: "Cuenta/Dispositivo" },
  "Atendentes": { es: "Agentes" },
  "Ações": { es: "Acciones" },
  "Editar setor": { es: "Editar sector" },
  "Remover setor": { es: "Quitar sector" },
  "Remover o setor": { es: "¿Quitar el sector" },
  "Erro ao remover setor": { es: "Error al quitar el sector" },
  "O setor foi removido.": { es: "El sector fue quitado." },
  "Você ainda não tem nenhum setor cadastrado!": { es: "¡Todavía no tienes ningún sector registrado!" },
  "Aqui você pode adicionar e editar os setores.": { es: "Aquí puedes agregar y editar los sectores." },
  "Nenhum setor encontrado...": { es: "Ningún sector encontrado..." },
  "Tente outro termo ou crie um setor para organizar o atendimento.": { es: "Prueba otro término o crea un sector para organizar la atención." },
  "Crie um setor": { es: "Crea un sector" },
  "Nome do setor": { es: "Nombre del sector" },
  "Digite um nome para o setor": { es: "Escribe un nombre para el sector" },
  "Adicione usuários a este setor": { es: "Agrega usuarios a este sector" },
  "Para adicionar usuários, pesquise pelo nome ou email.": { es: "Para agregar usuarios, busca por nombre o correo." },
  "Adicione um usuário no setor": { es: "Agrega un usuario al sector" },
  "Usuário selecionado": { es: "Usuario seleccionado" },
  "Usuários selecionados": { es: "Usuarios seleccionados" },
  "Buscar por nome ou e-mail": { es: "Buscar por nombre o correo" },
  "Você ainda não adicionou usuários": { es: "Todavía no agregaste usuarios" },
  "Cores": { es: "Colores" },
  "Criar setor": { es: "Crear sector" },
  "Salvar alterações": { es: "Guardar cambios" },
  "Setor criado.": { es: "Sector creado." },
  "Setor atualizado.": { es: "Sector actualizado." },
  "Já existe um setor com esse nome.": { es: "Ya existe un sector con ese nombre." },
  "Você não pode editar setores.": { es: "No puedes editar sectores." },
  "Setor não encontrado.": { es: "Sector no encontrado." },
  "Setor inválido.": { es: "Sector inválido." },
  "Dispositivo ou setor não encontrado.": { es: "Dispositivo o sector no encontrado." },
  "Configuração de canais": { es: "Configuración de canales" },
  "API oficial": { es: "API oficial" },
  "Instalado": { es: "Instalado" },
  "Seções do canal": { es: "Secciones del canal" },
  "Buscar dispositivo...": { es: "Buscar dispositivo..." },
  "Mostrar arquivados": { es: "Mostrar archivados" },
  "Novo dispositivo": { es: "Nuevo dispositivo" },
  "Nome dispositivo": { es: "Nombre del dispositivo" },
  "Status": { es: "Estado" },
  "Conectado": { es: "Conectado" },
  "Usuários nesse dispositivo": { es: "Usuarios en este dispositivo" },
  "Desconectar": { es: "Desconectar" },
  "Conectar": { es: "Conectar" },
  "Arquivar": { es: "Archivar" },
  "Excluir o dispositivo? O número para de receber mensagens.": { es: "¿Eliminar el dispositivo? El número deja de recibir mensajes." },
  "Você não tem acesso às configurações de dispositivos.": { es: "No tienes acceso a la configuración de dispositivos." },
  "Informações do dispositivo": { es: "Información del dispositivo" },
  "Seções do dispositivo": { es: "Secciones del dispositivo" },
  "Criação de negócio": { es: "Creación de negocio" },
  "Nome do dispositivo": { es: "Nombre del dispositivo" },
  "Esse nome é usado apenas para identificação interna. Não ficará visível para seus contatos.": { es: "Este nombre se usa solo para identificación interna. No será visible para tus contactos." },
  "Número conectado": { es: "Número conectado" },
  "Setor de atendimento": { es: "Sector de atención" },
  "Selecionar setor": { es: "Seleccionar sector" },
  "Membros do time que estão no setor selecionado terão acesso a esse dispositivo.": { es: "Los miembros del equipo que están en el sector seleccionado tendrán acceso a este dispositivo." },
  "Indicador de digitação": { es: "Indicador de escritura" },
  "Atendente digitando": { es: "Agente escribiendo" },
  "Agente de IA respondendo": { es: "Agente de IA respondiendo" },
  "Atendentes conectados nesse dispositivo": { es: "Agentes conectados en este dispositivo" },
  "Ativar todos": { es: "Activar todos" },
  "Usuário administrador": { es: "Usuario administrador" },
  "As alterações foram salvas.": { es: "Los cambios fueron guardados." },
  "Confirme a verificação em duas etapas.": { es: "Confirma la verificación en dos pasos." },
  "Buscar por nome, e-mail ou telefone": { es: "Buscar por nombre, correo o teléfono" },
  "Adicionar usuário": { es: "Agregar usuario" },
  "Usuário": { es: "Usuario" },
  "Permissões de atendimento": { es: "Permisos de atención" },
  "Verificado": { es: "Verificado" },
  "Nenhum usuário encontrado": { es: "Ningún usuario encontrado" },
  "Tente ajustar o termo da busca.": { es: "Intenta ajustar el término de búsqueda." },
  "Remover usuário": { es: "Quitar usuario" },
  "Seções do usuário": { es: "Secciones del usuario" },
  "Geral": { es: "General" },
  "Permissões": { es: "Permisos" },
  "Contas e dispositivos": { es: "Cuentas y dispositivos" },
  "Nome": { es: "Nombre" },
  "Sobrenome": { es: "Apellido" },
  "E-mail": { es: "Correo" },
  "Telefone": { es: "Teléfono" },
  "Identificador de usuário": { es: "Identificador de usuario" },
  "Link de usuário": { es: "Enlace de usuario" },
  "Selecionar setores": { es: "Seleccionar sectores" },
  "Só a própria pessoa muda o nome, no perfil.": { es: "Solo la propia persona cambia el nombre, en el perfil." },
  "As permissões foram atualizadas com sucesso!": { es: "¡Los permisos fueron actualizados con éxito!" },
  "Grupo de permissão:": { es: "Grupo de permisos:" },
  "Salvar grupo personalizado": { es: "Guardar grupo personalizado" },
  "Seções de permissão": { es: "Secciones de permisos" },
  "Configure as permissões desta seção.": { es: "Configura los permisos de esta sección." },
  "Desativar todos": { es: "Desactivar todos" },
  "Administrador": { es: "Administrador" },
  "Gerente": { es: "Gerente" },
  "Leitor": { es: "Lector" },
  "Personalizado": { es: "Personalizado" },
  "Páginas": { es: "Páginas" },
  "CRM": { es: "CRM" },
  "Origens": { es: "Orígenes" },
  "Conta": { es: "Cuenta" },
  "Transcrição de chamada": { es: "Transcripción de llamada" },
  "Indicadores": { es: "Indicadores" },
  "Empresas": { es: "Empresas" },
  "Usuário não encontrado.": { es: "Usuario no encontrado." },
  "Essa permissão é definida pelo papel do usuário.": { es: "Este permiso lo define el rol del usuario." },
  "Essa permissão não vale para o papel do usuário.": { es: "Este permiso no aplica al rol del usuario." },
  "Definido pelo papel do usuário": { es: "Definido por el rol del usuario" },
  "Definido pelo modo de visibilidade da organização": { es: "Definido por el modo de visibilidad de la organización" },
  "Segue a visualização do atendimento do setor": { es: "Sigue la visualización de la atención del sector" },
  "Segue a visualização de atendimento": { es: "Sigue la visualización de la atención" },
  "Disponível a partir de Atendente": { es: "Disponible a partir de Agente" },
  "Disponível a partir de Gerente": { es: "Disponible a partir de Gerente" },
  "Disponível a partir de Administrador": { es: "Disponible a partir de Administrador" },
  "Disponível a partir de Leitor": { es: "Disponible a partir de Lector" },
  "Visualizar todos os dispositivos": { es: "Ver todos los dispositivos" },
  "Permite visualizar todos os dispositivos nas Configurações de canais na tela de atendimento.": { es: "Permite ver todos los dispositivos en la Configuración de canales en la pantalla de atención." },
  "Adicionar um novo dispositivo": { es: "Agregar un nuevo dispositivo" },
  "Permite adicionar um novo dispositivo a conta": { es: "Permite agregar un nuevo dispositivo a la cuenta" },
  "Remover contas/dispositivos": { es: "Quitar cuentas/dispositivos" },
  "Permite remover uma conta ou dispositivo nas Configurações de canais": { es: "Permite quitar una cuenta o dispositivo en la Configuración de canales" },
  "Alterar status do atendimento do setor": { es: "Cambiar el estado de la atención del sector" },
  "Permite alterar o status de atendimento de conversas de outros atendentes do setor": { es: "Permite cambiar el estado de atención de conversaciones de otros agentes del sector" },
  "Alterar status do atendimento": { es: "Cambiar el estado de la atención" },
  "Permite alterar o status de atendimento de conversas de todos os setores": { es: "Permite cambiar el estado de atención de conversaciones de todos los sectores" },
  "Envio de mensagens nas atividades": { es: "Envío de mensajes en las actividades" },
  "Permite enviar mensagens nas atividades através de um dispositivo cadastrado.": { es: "Permite enviar mensajes en las actividades a través de un dispositivo registrado." },
  "Visualização de atendimento do setor": { es: "Visualización de la atención del sector" },
  "Permite visualizar todos os atendimentos do setor.": { es: "Permite ver todas las atenciones del sector." },
  "Visualizar conversas sem atendente": { es: "Ver conversaciones sin agente" },
  "Permite visualizar conversas sem atendente (não atribuídos) de acordo com as permissões de dispositivo.": { es: "Permite ver conversaciones sin agente (no asignadas) según los permisos de dispositivo." },
  "Visualização de atendimento": { es: "Visualización de la atención" },
  "Permite a visualização de todos os atendimentos em dispositivos com permissão.": { es: "Permite ver todas las atenciones en dispositivos con permiso." },
  "Enviar mensagem no atendimento do setor": { es: "Enviar mensaje en la atención del sector" },
  "Permissão para enviar mensagem para qualquer atendimento no setor.": { es: "Permiso para enviar mensajes en cualquier atención del sector." },
  "Alterar atendentes do setor": { es: "Cambiar agentes del sector" },
  "Permite alterar o atendente de qualquer atendimento do setor.": { es: "Permite cambiar el agente de cualquier atención del sector." },
  "Alterar atendentes": { es: "Cambiar agentes" },
  "Permite alterar o atendente de qualquer atendimento.": { es: "Permite cambiar el agente de cualquier atención." },
  "Enviar mensagem no atendimento": { es: "Enviar mensaje en la atención" },
  "Permissão para enviar mensagem para qualquer atendimento.": { es: "Permiso para enviar mensajes en cualquier atención." },
  "Ações em massa": { es: "Acciones masivas" },
  "Permite realizar ações em massa no chat. Exemplo: Alterar status, atendente, setor...": { es: "Permite realizar acciones masivas en el chat. Ejemplo: cambiar estado, agente, sector..." },
  "Editar ou excluir respostas rápidas": { es: "Editar o eliminar respuestas rápidas" },
  "Permite editar ou excluir respostas rápidas de outros usuários.": { es: "Permite editar o eliminar respuestas rápidas de otros usuarios." },
  "Compartilhar respostas rápidas": { es: "Compartir respuestas rápidas" },
  "Permite compartilhar respostas rápidas com outros usuários.": { es: "Permite compartir respuestas rápidas con otros usuarios." },
  "Editar ou excluir setores": { es: "Editar o eliminar sectores" },
  "Permite editar ou excluir setores de outros usuários.": { es: "Permite editar o eliminar sectores de otros usuarios." },
  "Configurar modelos de mensagem": { es: "Configurar plantillas de mensaje" },
  "Permite acessar e configurar os modelos de mensagem de WhatsApp Oficial.": { es: "Permite acceder y configurar las plantillas de mensaje de WhatsApp Oficial." },
  "Consultar respostas rápidas de outros setores": { es: "Consultar respuestas rápidas de otros sectores" },
  "Permite, no chat, filtrar respostas rápidas por setores diferentes dos seus.": { es: "Permite, en el chat, filtrar respuestas rápidas por sectores distintos de los tuyos." },
  "Contas e dispositivos que usuário tem acesso.": { es: "Cuentas y dispositivos a los que el usuario tiene acceso." },
  "Estes estão associados aos setores aos quais o usuário pertence. Ele pode selecioná-los em atividades e tem autorização para acessá-los no atendimento.": { es: "Están asociados a los sectores a los que pertenece el usuario. Puede seleccionarlos en actividades y tiene autorización para acceder a ellos en la atención." },
  "Canais": { es: "Canales" },
  "Ativar Todos": { es: "Activar todos" },
  "Buscar por...": { es: "Buscar por..." },
  "Pessoais": { es: "Personales" },
  "Adicionar": { es: "Agregar" },
  "Atalho": { es: "Atajo" },
  "Conteúdo": { es: "Contenido" },
  "Excluir a resposta": { es: "¿Eliminar la respuesta" },
  "Você ainda não cadastrou respostas rápidas.": { es: "Todavía no registraste respuestas rápidas." },
  "Crie atalhos de mensagens para responder mais rápido no atendimento.": { es: "Crea atajos de mensajes para responder más rápido en la atención." },
  "Criar Resposta rápida": { es: "Crear respuesta rápida" },
  "Editar Resposta rápida": { es: "Editar respuesta rápida" },
  "Você pode criar respostas rápidas para utilizar no chat de atendimento": { es: "Puedes crear respuestas rápidas para usar en el chat de atención" },
  "Escreva uma mensagem...": { es: "Escribe un mensaje..." },
  "Variáveis": { es: "Variables" },
  "Digite o atalho": { es: "Escribe el atajo" },
  "Utilizar em:": { es: "Usar en:" },
  "Compartilhar com outros usuários": { es: "Compartir con otros usuarios" },
  "A resposta ficará disponível para os usuários ao atender conversas destes setores.": { es: "La respuesta estará disponible para los usuarios al atender conversaciones de estos sectores." },
  "Resposta rápida criada.": { es: "Respuesta rápida creada." },
  "Resposta rápida atualizada.": { es: "Respuesta rápida actualizada." },
  "Resposta não encontrada.": { es: "Respuesta no encontrada." },
  "Você não pode compartilhar respostas rápidas.": { es: "No puedes compartir respuestas rápidas." },
  "Você não pode editar respostas rápidas de outros usuários.": { es: "No puedes editar respuestas rápidas de otros usuarios." },
  "Setor da conversa": { es: "Sector de la conversación" },
  "Alterar setor": { es: "Cambiar sector" },
  "Sem setor": { es: "Sin sector" },
  "Buscar setor": { es: "Buscar sector" },
  "Setor:": { es: "Sector:" },
  "Em transferência para": { es: "En transferencia a" },
  "Cancelar transferência": { es: "Cancelar transferencia" },
  "A conversa já está nesse setor.": { es: "La conversación ya está en ese sector." },
  "A conversa não está em transferência.": { es: "La conversación no está en transferencia." },
  "A conversa já está sem atendente.": { es: "La conversación ya está sin agente." },
  "Só o atendente atual ou quem pode alterar atendentes libera a conversa.": { es: "Solo el agente actual o quien puede cambiar agentes libera la conversación." },
```

(As frases de confirmação "Remover o setor {nome}?" e "Excluir a resposta {atalho}?" são montadas com o "?" depois do nome; em espanhol o "¿" já vem na primeira parte.)

- [ ] **Step 2: Os gates da fase**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts tests/unit/vocabulario-do-funil.test.ts tests/unit/evidencia-citada.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/escale-permissoes-espelho.test.ts $(ls tests/unit | grep -E "^escale-" | sed 's|^|tests/unit/|' | tr '\n' ' ')
corepack pnpm cercas
corepack pnpm typecheck && corepack pnpm eslint components/escale/conversas lib/escale/conversas hooks/escale app/api/v1/setores app/api/v1/conversas-da-casca app/api/v1/permissoes-de-atendimento app/api/v1/usuarios-da-casca app/api/v1/respostas-rapidas app/app/inbox/configuracoes
```

Expected: tudo verde. A cerca `controle-decorativo` olha os controles "Em breve": cada um tem `title`/`aria-disabled` e nenhum `onClick` que finja fazer algo (as `span` dos itens em breve não são botões). **Nada de `test:db` nem de rodada cheia aqui** (fim da Frente C; a `tests/invariants/escale-setores-9203.test.ts` roda lá, com as varreduras de definer).

- [ ] **Step 3: O PRD e o LOG (fora do repositório)**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md`, seção 8, a linha da 3C: `proposta` → `em execução (PR aberto em dd/mm)`; na seção 7, a linha "Perfis de atendimento" ganha "(por pessoa, como a Clint; o padrão vem do papel — plano da 3C, N5)".

Em `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`: a entrada da 3C na linha do tempo (o que entrou, a migration 9203, a policy a mais em `conversations`, as diferenças declaradas da seção "Fora desta fase" abaixo) e "Onde estamos" com a Frente C (3A, 3B e 3C mergeadas; 3D a seguir).

- [ ] **Step 4: O PR e o merge**

```bash
git fetch escale-crm && git rebase escale-crm/main   # conflitos: manter os dois blocos
git push -u escale-crm feat/fase-3c-setores-e-configuracoes
gh pr create --repo rgisjr/escale-crm --base main --title "feat(escale): Fase 3C — setores, permissões e configurações de Conversas (igual à Clint)" --body-file <(cat <<'EOF'
## Fase 3C — setores, permissões e configurações de Conversas

Itens C3 e E1–E6 do PRD de Conversas (`docs/escale/modulos/3-conversas.md`) e as 19 permissões de Conversas da Clint (seção 5). Com a casca ligada: o hub ⚙ "Conversas › Configurações" (9 cartões) dentro da tela, com a fila à esquerda; Setores (lista, criar, editar, remover, membros e cor); Configuração de canais (cartões, lista de dispositivos, "Informações do dispositivo" com setor e atendentes); Usuários e Permissões (lista e a janela com Geral, as 19 permissões e Contas e dispositivos); Respostas rápidas (tabela e "Criar Resposta rápida" com atalho, canais, compartilhar e setores); o setor na fila e no cabeçalho, "Alterar setor" com "Em transferência" e "Cancelar transferência"; e "Sem atendente" no atendimento de outra pessoa para quem pode alterar atendentes.

- Migration **9203** (`crm_setores`, `crm_setores_membros`, `crm_setor_do_dispositivo`, `crm_setor_da_conversa`, `crm_permissoes_de_atendimento`, `crm_respostas_rapidas_extras`, `crm_respostas_rapidas_setores`; `fn_crm_pode`, `fn_crm_ve_pelo_setor`; a policy **permissiva** `crm_conversations_select_setor` em `conversations` — só amplia a leitura do atendente pelo setor; o gatilho que conclui a transferência).
- Encaixes no original: `baseline.sql`, `dicionario.ts`, `actions.ts`, varredura de RLS, ícones. As rotas de dispositivo, de papel e de responsáveis por canal são as do original.

## Verificação
- [x] testes da fase, cercas, typecheck e eslint verdes
- [ ] `test:db` (inclui `escale-setores-9203` e as varreduras de definer) e rodada cheia: no fim da Frente C (regra de 18/10)
- [ ] conferência visual: no fim da Frente C

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
gh pr merge --repo rgisjr/escale-crm --merge --delete-branch=false <número>
```

A tag e a release ficam para o fim da Frente C. Em seguida, a 3D nasce da `escale-crm/main` na mesma worktree.

## Fora desta fase (registrado)

- O filtro "Setores", "Em transferência" e "Conversas suspensas" no painel de filtros, e a ação em massa "Alterar setor" (a chave "Ações em massa" já existe): **3D**.
- A aba "Criação de negócio" da janela do dispositivo: **3E**.
- Os grupos de permissão nomeados por organização ("Salvar grupo personalizado") e as seções que não são Conversas (Páginas, CRM, Origens…): a trilha de grupos configuráveis (PRD 2, pergunta 3).
- Modelos de mensagem, WhatsApp Flows, Análise de templates, Indicador de digitação, Marketing Messages API, Chamadas por WhatsApp, as colunas SAÚDE/STATUS DO NOME/MM API: dependem da Meta (decisão 9).
- **Diferenças declaradas:** as permissões que o motor do original decide (ver todas, ver sem atendente, enviar, mudar status, dispositivos) ficam travadas no valor do papel; "Arquivar", "Desconectar" e "Mostrar arquivados" ficam "Em breve" (o original só tem excluir = arquivar e desconectar, e não lista os arquivados); Telefone, Identificador, Link e WhatsApp do usuário ficam "Em breve" (o original não guarda) e o nome só a própria pessoa muda; uma mensagem por resposta rápida (o "+ Adicionar" de várias, GIF, anexo, câmera e áudio na caixa ficam "Em breve"); "Atendentes conectados" e "Contas e dispositivos" são os responsáveis por canal do original (e exigem a verificação em duas etapas, como no original); o toggle de Notificações fica à direita do cartão (na Clint, ao lado do título).
- **Provisórios (sem print):** o cartão de Notificações ligado; a faixa e o chip de "Em transferência"; o painel "Alterar setor"; os vazios de Setores e de Respostas rápidas.

## Self-review (18/10)

1. **Cobertura do PRD:** C3 (Tasks 2, 4, 7, 13: "Alterar setor", "Em transferência", "Cancelar transferência", o gatilho); E1 (Tasks 1, 2, 3, 7, 9); E2 (Tasks 1, 3, 7, 10: cartões, lista, janela do dispositivo, setor do dispositivo, atendentes pelo roteamento do original); E3 (Tasks 3, 13: chip na fila, selo no cabeçalho, toggle "Setor"; filtro e massa ficam na 3D); E4 (Tasks 1, 2, 5, 7, 11: lista, Geral com Setores, as 19 permissões, grupo = papel, Contas e dispositivos); E5 (Tasks 1, 8: os 9 cartões, Notificações, os 3 "Em breve", o ⚙); E6 (Tasks 1, 2, 6, 7, 12: tabela, filtro Setor, criar/editar/excluir, canais, compartilhar, setores, o painel do compositor). Seção 5: as 19 chaves (Task 1) e `fn_crm_pode` (Task 2). Pendência da 3B N10 resolvida (Tasks 4, 13).
2. **Placeholders:** nenhum "TBD". Onde o plano depende de um detalhe do código que não foi lido linha a linha (a assinatura de `authOk`; o `role` do gatilho do `SeletorDaCasca`; as props de `Campo`; o formato de erro do `apiClient`; a saída de `formatarTelefone`; a forma de `paginaDaConfiguracao` chamar `origensDaPagina`/`lerPreferenciaDeMenu`; se `ok()` aceita `meta`), o passo diz onde conferir e o que ajustar, e o teste segue o nome real.
3. **Tipos entre tasks:** `SetorLido` (Task 1, com `ids_dos_dispositivos` da Task 10) é o que `listarSetores` (Task 3), `useSetores` (Task 7) e as telas (9, 10, 11, 12, 13) usam; `SetorDaConversa` (Task 3) é o que `useSetoresDasConversas` (Task 7), `LinhaDaFila`, `SeletorDeSetor` e `FaixaEmTransferencia` (Task 13) leem; `PERMISSOES_DE_CONVERSAS`/`estadoDoToggle`/`excecaoAoMudar`/`desativarTodos`/`grupoDoUsuario` (Task 1) são o que a rota (Task 5) valida e a aba (Task 11) mostra, com o papel padrão espelhado em SQL e conferido pelo teste da Task 2; `RespostaLida`/`respostaSchema`/`respostaServe` (Task 1) são o que as rotas (Task 6), os hooks (Task 7) e as telas/o painel (Task 12) usam; `CanalDoRoteamento`/`quemEstaNoDispositivo`/`ligarNoDispositivo` (Task 1) batem com `ChannelRoutingSettings.channels` do original (`id`, `user_ids`, `mode`); `bancoPorTabela` (Task 3) serve aos testes das Tasks 3–6.
4. **Cercas:** `rls-completude-varredura` (sete entradas, Task 2); `definer-membership-varredura` (`fn_crm_pode` e `fn_crm_ve_pelo_setor` recebem org e conferem por `fn_user_role_in_org`/`fn_role_at_least`; `fn_crm_setor_efetivo` não recebe org e não é executável pela sessão; o gatilho também não); `hardening-definer-varredura`/`gov-hardening-anon-definer` (`revoke … from public, anon` em todas); `manifest-x-migrations`; `i18n-espanhol-cobre-a-tela` (Task 14); `controle-decorativo` (os "Em breve" são `span`/`aria-disabled`, sem ação falsa); `tailwind-tokens` (as cores dos setores são dado, por `style`); `evidencia-citada` (caminhos sem crase); `escale-casca-v2-original-intacto` (o original só ganha os blocos da tabela de encaixes; a policy e o gatilho em `conversations` nascem na migration do fork, sem tocar `fn_can_view_conversation`).
