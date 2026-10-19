# Fase 3B — A conversa aberta de Conversas (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** C1, C2, C4 a C12 e D4 de `docs/modulos/3-conversas.md` (seção 4, tabelas C e D), com as decisões 2 (Em espera = snooze sem lembrete), 6 (o assistente da Escale no lugar da Aura), 11 ("Visualizado por" e "fixar" Em breve) e 12 (transferência para atendente continua imediata) da seção 9. **Frente C**, segundo plano da Fase 3 (depois da 3A), migration **9202**, **um PR** (`feat/fase-3b-conversa-aberta`).
> Depende da **3A mergeada** (a casca `components/escale/conversas/`, `ConversaAberta.tsx`, `FotoDaConversa`, `VazioDaCasca`, o hook da fila, as preferências). A 3C (setor no cabeçalho, "Em transferência", o hub ⚙) e a 3E (a thread e o compositor dentro da ficha) montam em cima do que esta fase cria.

## Decisões do usuário (18/10)

| # | Pergunta | Decisão | Onde vale |
|---|---|---|---|
| Q1 | PRD de Conversas | Aprovado | tudo |
| Q2 | Frente | (a) Frente C, worktree `wt-frente-c` | N1 |
| Q3 | Prints que faltam | Escrever agora e marcar como provisório | abaixo |

**Prints que faltam nesta fase** (nenhum bloqueia; o plano segue o código da Clint e marca como provisório):
1. ❌ "Em transferência" — é da 3C (setor); não entra aqui.
2. ❌ "Marcar como não lida" feito (a linha volta com a bolha). Provisório: a bolha azul com "1".
3. ❌ Thread com mensagem **editada**, **encaminhada**, **apagada** e "Visualizado por". Provisório: "Editada" e "Encaminhada" em 10px `casca-meta` antes da hora (textos `component.MessageContent.*`); apagada = "Esta mensagem foi apagada" em itálico (o texto do original); "Visualizado por" e "Mensagem fixada" ficam "Em breve" (decisão 11).
4. ❌ O gravador de áudio aberto ("Gravar áudio", Parar, Retomar, Descartar). Provisório: o `AudioRecorder` do original dentro da barra do compositor, com os textos da Clint (`component.AudioRecorder.*`) onde ele tem rótulo.
5. ❌ O menu de anexo (abre a janela do sistema). Provisório: o `AttachMenu` do original.
6. ❌ "Atendido por IA · {agente}" e "Agente pausado · {agente}" no cabeçalho. Provisório: a linha em 11px `casca-marca` abaixo do nome (texto `component.ChatHeader.aiAttendant`).

**Pergunta ao usuário (não bloqueia):** o nome do assistente da Escale no compositor (decisão 6 da seção 9). O plano usa **"Assistente IA"** (o botão do menu do topo chama-se "Agente de IA"); trocar é uma constante só (`NOME_DO_ASSISTENTE`, Task 1).

**Goal:** Com a casca ligada, a conversa aberta é a da Clint: o cabeçalho (foto, nome, "{canal} - {dispositivo}", o seletor de atendente com busca e "Sem atendente", o ⋮ "Mais" com Iniciar uma conversa, Copiar link, Marcar como não lida e Abrir no Instagram, "Atendido por IA · {agente}"), a barra de status (o selo da janela, "Colocar em espera"/"Remover espera", "Encerrar atendimento"/"Reabrir atendimento", com os eventos na thread), a thread (bolhas, cartão de anúncio, "Ler mais", eventos de sistema, nota interna amarela, áudio com transcrição, Editada/Encaminhada, Apagar para mim/para todos, Reenviar), o compositor (Assistente IA, emoji, anexo, câmera, áudio, respostas rápidas, assinatura, nota interna, modelos, Flow, agendar, Enviar; o aviso "Fora da janela de 24h da Meta" com o botão "Modelo"), as respostas rápidas, os modelos de mensagem com prévia, a nota interna, as mensagens agendadas (modal, linha da fila "⏱ n", modal do contato e a tela de Configurações) e o cartão "Pausar automação".

**Architecture:**
- **A casca da 3A não muda de fora:** `ConversaAberta.tsx` passa a montar quatro peças do fork (`CabecalhoDaConversa`, `BarraDeStatus`, `ThreadDaCasca`, `CompositorDaCasca`) no lugar de `ConversationHeader`, `ChatThread` e `Composer`. As peças do original que continuam entrando como estão: `MediaRenderer`, `NoteMedia`, `PassagemCard`, `AttachMenu`, `EmojiButton`, `AudioRecorder`, `AttachmentPreviewDialog`, `ContactPickerDialog`, `MentionMenu`, `RetentionNotice`, `NumeroForaDoAr`, `DialButton`, `VideoCallButton`, e todos os hooks do Inbox (`useMessagesRealtime`, `useConversationNotes`, `usePassagensDaConversa`, `useSendMessage`, `useCreateNote`, `useUploadMedia`, `useAlterarMensagem`, `useClaimConversation`, `useTransferConversation`, `useReleaseConversation`, `useCloseConversation`/`useReopenConversation`, `useDraftReply`, `useMessageTemplates`, `useAssignableMembers`).
- **Em espera** (C2, decisão 2): rotas do fork `POST/DELETE /api/v1/conversas-da-casca/[id]/espera` gravam o `snooze_until` do original num instante longínquo (`9999-12-31`, o `snooze-watcher` nunca chega lá), `snoozed_at`, `snoozed_by_user_id` e a marca `metadata.escale_em_espera = true` ("sem lembrete"); a mensagem nova do cliente tira da espera por um encaixe em `lib/channels/pos-entrada.ts` (`tirarDaEsperaDaCasca`). **Encerrar / Reabrir** passam por rotas do fork que chamam os handlers do original (`fn_service_status` e `patchConversationHandler`) e gravam o **evento** da thread.
- **Os eventos da thread** ("{pessoa} colocou o atendimento em espera - hh:mm", "encerrou o atendimento", "O atendimento foi alterado de X para Y") vêm de `GET /api/v1/conversas-da-casca/[id]/eventos`: os de atribuição da tabela do original `conversation_assignment_events` (política `cae_select`) e os de espera/encerramento da tabela nova `crm_eventos_da_conversa` (9202).
- **Marcar como não lida** (C1): `POST /api/v1/conversas-da-casca/[id]/nao-lida` põe `unread_count_for_assignee = 1` pela sessão (a policy `conversations_agent_update` do original permite) sem tocar em `fn_mark_conversation_message`.
- **Mensagens agendadas** (C9): tabela `crm_mensagens_agendadas` (9202), rotas de listar/criar/remover, o cron `api/v1/cron/mensagens-agendadas` (minuto a minuto; só envia com o dispositivo `WORKING` e, fora da janela, só template; falha vira `falhou` com o motivo) e as telas: o modal "Agendar mensagem", o "⏱ n" na linha da fila (3A), o modal do contato e a tela `/app/inbox/configuracoes/mensagens-agendadas` (o hub da 3C aponta para ela).
- **Pausar automação** (D4): tabela `crm_pausas_de_automacao` (9202), rota `POST/DELETE /api/v1/conversas-da-casca/[id]/pausa`: grava `bot_silenced_until = ate ?? 'infinity'` pela sessão (a mesma coluna do `pause-ai` do original; os guards do motor já a leem) e pausa/retoma os follow-ups da conversa por `pausaEnrollment`/`retomaEnrollment` (`lib/followup/intervencao`); o cron `api/v1/cron/pausas-de-automacao` retoma as pausas vencidas.
- **Modelos de mensagem** (C7): a janela da Clint reaproveita a fonte, a rota e o render da `JanelaFechadaAviso` do original (`fonteDeTemplates`, `rotaDeTemplates`, `renderTemplatePreview`, os `slots`); **Respostas rápidas** (C6) são os `message_templates` do original (`useMessageTemplates`, `TemplateFormDialog`), sem setor até a 3C; **Assistente IA** (C10) só "Sugerir resposta" (`useDraftReply`), o resto "Em breve".

**Tech Stack:** o mesmo da 3A (Next.js 16, React 19, TanStack Query 5, Vitest + Testing Library, Tailwind 4 com os tokens da casca, Radix, Supabase RLS, zod, sonner) mais `sendMessageHandler` (`app/api/v1/messages/_handler.ts`) no cron.

## Referência visual (abrir a imagem antes de cada task de tela)

Caminhos sem crase (guarda `evidencia-citada`). Todos em 1:1.

| # | Arquivo | O que define | Task |
|---|---|---|---|
| c02 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c02-conversa-aberta-cabecalho-compositor-painel.jpg | o cabeçalho, a barra com "🕓 23:36", a thread (cartão de anúncio, "Ler mais", o evento), o compositor com os 11 ícones e "Enviar" | 5, 6, 7 |
| c03 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c03-cabecalho-menu-mais.jpg | o ⋮ "Mais": Iniciar uma conversa, Copiar link da conversa (+ Marcar como não lida, Abrir no Instagram, do bundle) | 5 |
| c04 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c04-cabecalho-seletor-de-atendente.jpg | o seletor de atendente: "Buscar por…", "Sem atendente", a lista com fotos e o ✓ | 5 |
| c05 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c05-cabecalho-icones-espera-encerrar-a.png | a barra de status: o selo "🕓 23:36" e os dois ícones à direita (o da espera realçado) | 5 |
| c06 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c06-painel-pausar-automacao-aberto.jpg | "Pausar automação" aberto: "Nenhuma automação ativa · Nesta conversa" e "Pausar ▾" | 9 |
| c07 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c07-painel-pausar-automacao-dropdown.jpg | "Pausar todas por": 30 minutos, 1 hora, 4 horas, 1 dia (com a hora de fim), Até retomar, Escolher data e hora | 9 |
| c08 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c08-modal-agendar-mensagem.jpg | "Agendar mensagem": as duas colunas, Data, Hora, Cancelar, Confirmar | 8 |
| c09 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c09-compositor-respostas-rapidas.jpg | "Respostas rápidas": busca, filtro (setor), "Ordenar por: A-Z", "GERAIS", os atalhos, "+ Nova resposta", ⚙ | 7 |
| c10 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c10-compositor-modelos-de-mensagem.jpg | "Modelos de mensagem": busca, "Todas as categorias", "Todas as pastas", "Com Flow", ⚙, ↻, "+ Novo modelo", "TODOS OS MODELOS" com idioma e categoria, "Selecione um modelo…", Cancelar, Enviar | 7 |
| c11 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c11-compositor-aura.jpg | o balão do assistente: título, texto, os 4 chips, a pergunta livre | 7 |
| c12 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c12-compositor-nota-interna.jpg | "Adicionar nota interna": a frase, a caixa amarela, Cancelar, "Salvar nota" | 7 |
| c13 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c13-compositor-enviar-flow.jpg | "Enviar Flow" (fica "Em breve"; só o ícone, só com Meta Cloud) | 7 |
| c39 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c39-config-mensagens-agendadas.jpg | a tela "Configurações › Mensagens agendadas": busca, Criação, Envio, Dispositivo ou conta; as 5 colunas; ⋮; "10 por página" e a paginação | 8 |
| c56 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c56-conversa-fechada-fora-da-janela-compositor-modelo.jpg | conversa fechada fora da janela: "Aguardando abrir janela", as bolhas azuis com o nome em 600, os eventos "iniciou/colocou em espera/encerrou o atendimento - hh:mm", o separador de data, o aviso "Enviar outro modelo de mensagem" com os 3 ícones e "Modelo" | 5, 6, 7 |
| c58 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c58-cabecalho-tooltip-reabrir-atendimento.jpg | a dica "Reabrir atendimento" | 5 |
| c59 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c59-conversa-em-espera-audio-agendada.jpg | em espera: a linha com "⏱ 1", o áudio com onda, "1.0×" e duração, a ação rápida de agendar com o contador "1" no painel | 6, 8 |
| c60 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c60-cabecalho-tooltip-remover-espera.jpg | a dica "Remover espera" | 5 |
| c61 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c61-contato-mensagens-agendadas-modal.jpg | o modal "Mensagens agendadas" do contato | 8 |
| c62 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c62-mensagem-agendada-menu-remover.jpg | o ⋮ "Remover agendamento" (vermelho) | 8 |
| c63 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c63-modelos-de-mensagem-previa.jpg | o modelo escolhido: "USADOS RECENTEMENTE", a prévia à direita com "Aprovado" e "Editar modelo", "Enviar" ligado | 7 |
| c73 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c73-negocio-perdido-motivo-pausa-ate-retomar.jpg | "Janela encerrada" no selo; "Fora da janela de 24h da Meta · Você só pode enviar mensagens utilizando modelos aprovados." com "Modelo"; "Pausar automação" com o selo "Até retomar" | 5, 7, 9 |
| c74 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c74-pausar-automacao-ativa-retomar.jpg | a pausa aberta: "Pausa de todas", "🕓 Até retomar ▾", "Por {pessoa}", "▶ Retomar" | 9 |

### Medidas tiradas dos prints (px de CSS, 1:1)

| Peça | Medida |
|---|---|
| Cabeçalho (c02) | 56px de altura, borda de baixo `casca-borda`, `px-4`; foto 40px (`FotoDaConversa tamanho="topo"`, sem o selo do canal); nome 13px/600 `casca-texto`; embaixo, o logo do canal 14px + "{canal} - {dispositivo}" 12px `casca-suave`; à direita: o selo do setor (3C, 24×24 `casca-novo`/branco, 10px/600), o seletor de atendente (pílula 32px, borda `casca-borda`, canto 16px, `pl-1 pr-2`: a inicial num círculo 24px `corDoAvatar` + nome 13px + `ChevronDown` 14px), o ⋮ (24×24) |
| Seletor de atendente (c04) | `PainelSuspenso` 250px: a busca 32px ("Buscar por…", `Search` à direita) e a lista (36px por linha: foto/inicial 24px + nome 12px; "Sem atendente" com o ícone `UserX` cinza; o atual com ✓ `casca-marca` e fundo `casca-raia`); máximo 320px de altura com rolagem |
| Menu ⋮ (c03) | `PainelSuspenso` 190px: itens 36px, ícone 16px + 12px: `MessageSquare` "Iniciar uma conversa", `Copy` "Copiar link da conversa", `MailOpen` "Marcar como não lida", `Instagram` "Abrir no Instagram" (só Instagram) |
| Barra de status (c05, c56, c73) | 40px, `px-4`; à esquerda o selo (pílula 28px, `casca-marca-suave`, texto `casca-marca` 12px/500, `Clock` 14px): aberta "23:36" (hh:mm restantes no WhatsApp; "6d 23h 56m" no Instagram), fechada "Janela encerrada" ou "Aguardando abrir janela" (`casca-raia`/`casca-suave`, ícone `Hourglass`); à direita dois botões 28×28 com ícone 16px: espera (`Clock` com um pequeno `Pause`? na Clint é um relógio com "z"; aqui `AlarmClock`; realçado `casca-marca-suave`/`casca-marca` quando em espera) e encerrar (`CheckCircle2`; encerrada vira `RotateCcw` "Reabrir atendimento") |
| Thread (c56) | fundo `casca-raia` claro (a Clint usa `#F8F9FD`; token `casca-painel`), `px-6 py-4`; o separador de dia centrado: linha `casca-borda` dos dois lados e o texto 11px `casca-suave` ("HOJE", "ONTEM" uppercase; data dd/mm/aaaa); bolha enviada: fundo `casca-caixa-msg` (#EFF6FF), borda `casca-borda-msg`, canto 10px, `px-3 py-2`, máximo 560px, à direita; o nome do remetente 12px/600 na primeira linha; o texto 13px `casca-texto`; hora 10px `casca-meta` + ✓✓ 12px à direita embaixo; bolha recebida: fundo `bg-surface`, mesma borda, à esquerda; evento de sistema: pílula centrada 28px, borda `casca-borda`, fundo `bg-surface`, 12px `casca-texto` com os nomes em 600 e " - hh:mm"; nota interna: fundo `#FEF9C3` (token `casca-nota`), borda `#FDE68A` (`casca-nota-borda`), ícone `StickyNote`, "Nota interna · {pessoa}" 11px, texto 13px; cartão de anúncio (c02): a imagem 100px, o selo "Anúncio" (`casca-marca-suave`), título 13px/500, corpo 12px, "Ver anúncio ↗" 12px `casca-marca`; "Ler mais" 12px `casca-marca` quando o texto passa de 8 linhas; áudio: o `AudioPlayer` do original (c59 mostra o da Clint com onda, "1.0×" e duração: diferença declarada) e a transcrição (`media_derived_text`) em 12px `casca-suave` embaixo |
| Compositor (c02) | borda de cima `casca-borda`, `px-4 pt-3 pb-2`; a caixa: 40px mínimo, fundo `casca-busca`, canto 8px, placeholder "Mensagem" 13px, cresce até 160px; a barra: 11 ícones 16px `casca-suave` em botões 28×28 com 4px entre eles: Assistente IA (`Sparkles` em `casca-marca`), `Smile`, `Paperclip`, `Camera`, `Mic`, `Zap` (respostas rápidas), `PenLine` (assinatura), `Lightbulb` (nota interna), `FileText` (modelos), `Workflow` (Flow); à direita: `CalendarClock` 16px (agendar) e "Enviar" (`BotaoDaCasca variante="marca"` 32px, `Send` 14px; desligado sem texto) |
| Fora da janela (c56, c73) | a barra inteira vira o aviso: `Clock` 16px `casca-suave`, título 13px/500 e texto 12px `casca-suave` em duas linhas; à direita três botões 28×28 (Assistente IA, `Lightbulb`, `CalendarClock`) e "Modelo" (`BotaoDaCasca variante="marca"` com `Send` 14px) |
| Respostas rápidas (c09) | painel 600×384 acima do compositor (`PainelSuspenso` âncora no ícone): título 13px/500, ⚙ 24×24, "+ Nova resposta" (borda, 32px); a busca 32px; a linha de filtros: setor (`SeletorDaCasca`, 3C: "Em breve") e "Ordenar por: A-Z ▾"; duas colunas: a lista (180px; "GERAIS"/"MINHAS" 10px/600 `casca-meta` uppercase; itens 32px "/atalho" 12px, o escolhido `casca-raia`) e a prévia (o texto 13px); clicar numa resposta põe o texto no campo |
| Modelos de mensagem (c10, c63) | `JanelaDaCasca` de 770px, `p-0`: cabeçalho 56px "Modelos de mensagem" 13px/500 + `AjudaDaCasca`, ⚙ (Em breve), ↻ (recarrega), "+ Novo modelo" (`variante="marca"`; abre `/app/settings/canal-oficial` do original numa aba nova); a linha de filtros 40px: busca 200px, "Todas as categorias ▾", "Todas as pastas ▾" (Em breve), "Com Flow" (Em breve); duas colunas (380px | 1fr) de 360px de altura: "USADOS RECENTEMENTE" (os 5 últimos nomes gravados no `localStorage` `escale_modelos_recentes`) e "TODOS OS MODELOS" com o nome 12px/600, o idioma 9px/600 uppercase `casca-meta` e a categoria numa pílula `casca-marca-suave` 10px; o escolhido com ✓; à direita, vazio "Selecione um modelo de mensagem à sua esquerda para enviar." 12px centrado; escolhido: o nome 12px/600 + "Aprovado" (pílula `--escale-status-ganho-suave`) + "Editar modelo" (`SquarePen`, 12px `casca-marca`, abre o original numa aba nova), a prévia numa bolha `casca-caixa-msg` e os campos dos slots abaixo (os mesmos da `JanelaFechadaAviso`); rodapé 56px: Cancelar e "Enviar" (`Send`) |
| Assistente IA (c11) | `PainelSuspenso` 380px acima do primeiro ícone: cabeçalho com `Sparkles` num círculo 32px `casca-marca`, "Assistente IA" 13px/600 e "{contato}" 11px `casca-suave`; "Assistente IA agora lê esta conversa" 13px/600; o texto 12px `casca-suave`; 4 chips 28px (`casca-marca-suave`/`casca-marca` 12px): "Sugerir resposta" (liga), "Resumir conversa", "Agendar mensagem com texto da IA", "Preencher campos do CRM" (Em breve); a pergunta livre: caixa 36px "Pergunte sobre esta conversa…" + botão `Send` (Em breve) |
| Nota interna (c12) | `JanelaDaCasca` 448px: "Adicionar nota interna" 16px/500; "O contato não vê esta nota, somente você e sua equipe" 13px; a caixa 128px fundo `casca-nota` placeholder "Adicione aqui uma anotação do seu atendimento"; Cancelar e "Salvar nota" (`BotaoDaJanela`) |
| Agendar mensagem (c08) | `JanelaDaCasca` 900px: "Agendar mensagem" 16px/500; duas colunas com uma linha vertical: "DENTRO DA JANELA · ATÉ 24H APÓS RESPOSTA" (11px/600 uppercase `casca-sobrelinha`), "Mensagem livre" 13px/500, o texto 12px `casca-suave`, a caixa 120px com a barra de ícones (emoji, anexo, câmera, áudio, relógio, [], ⊟ — aqui só emoji e `{{nome}}`; o resto "Em breve") e o botão "⊕ Adicionar" (acrescenta outra mensagem; até 5); "FORA DA JANELA · 24H SEM RESPOSTA", "Template Meta (obrigatório)", o texto, "+ Selecionar modelo" (`variante="marca"`, abre a janela de modelos em modo "escolher"); embaixo: "Data" (`CampoDeTexto` dd/mm/aaaa com `Calendar`) e "Hora" (hh:mm com `Clock`) — os dois pelo `SeletorDeDataEHora` da casca; rodapé: Cancelar e "Confirmar" (desligado sem mensagem e sem data) |
| Mensagens agendadas (c39, c61, c62) | a tela: cabeçalho 56px com "Configurações › Mensagens agendadas" (migalhas 13px, a última em 600) e o X à direita; filtros 40px: busca 260px "Buscar por nome, e-mail ou telefone", "Criação ▾", "Envio ▾" (`CalendarioDePeriodo semAbas`), "Dispositivo ou conta ▾" (`SeletorDaCasca`); tabela: cabeçalho 10px/600 uppercase `casca-sobrelinha` 44px (NOME, TELEFONE, DATA E HORA DA CRIAÇÃO ↓, DATA E HORA DE ENVIO ↕, DISPOSITIVO/CONTA), linhas 52px (foto 32px + nome 13px; telefone 12px; datas dd/mm/aaaa hh:mm:ss 12px; bolinha verde/vermelha 6px + logo do canal + nome do dispositivo 12px; ⋮ 24×24); ⋮ → "Remover agendamento" (`Trash2`, `casca-alerta`); rodapé: "10 por página ▾" e `PaginacaoDaCasca`. O modal do contato (c61): o mesmo, numa `JanelaDaCasca` de 1430px (`w-[min(1430px,calc(100vw-2rem))]`), sem a paginação |
| Pausar automação (c06, c07, c73, c74) | cartão 44px (borda, canto 8px) entre o negócio e SEÇÕES: `PauseCircle`-like (`CirclePause`) 16px + "Pausar automação" 13px + `ChevronDown` à direita; com pausa, o selo "Até retomar" / "até hh:mm" (pílula `#FFF4E5`/`#D97706`: tokens `casca-pausa`/`casca-pausa-texto`) antes do chevron; aberto sem pausa: "Nenhuma automação ativa" 12px/500 + "Nesta conversa" 11px `casca-suave` e "Pausar ▾" (`variante="marca"` 32px) que abre o menu 280px "Pausar todas por" (11px `casca-meta`), itens 36px: "30 minutos · 20:26", "1 hora · 20:56", "4 horas · 23:56", "1 dia · amanhã 19:56", "Até retomar", "📅 Escolher data e hora ›" (abre o `SeletorDeDataEHora`); aberto com pausa: "Pausa de todas" 12px/500 `casca-pausa-texto`, a pílula "🕓 Até retomar ▾" (reabre o menu para trocar o prazo), "Por {pessoa}" 11px `casca-suave`, e "▶ Retomar" (borda, 32px) |

### Textos da Clint usados nesta fase

- **Cabeçalho:** "Sem atendente"; "Buscar por…"; "Mais"; "Iniciar uma conversa"; "Copiar link da conversa"; "O link foi copiado para a área de transferência!"; "Marcar como não lida"; "Erro ao marcar conversa como não lida. Tente novamente."; "Abrir no Instagram"; "Atendido por IA · {agent}"; "Agente pausado · {agent}"; "O atendente já foi alterado por outro usuário!"; "Erro ao atualizar atendente"; "Atendente: {attendant}".
- **Barra:** "Colocar em espera"; "Remover espera"; "Encerrar atendimento"; "Reabrir atendimento"; "Janela encerrada"; "Aguardando abrir janela"; "colocou o atendimento em espera"; "encerrou o atendimento"; "iniciou o atendimento"; "O atendimento foi alterado de {de} para {para}".
- **Thread:** "Anúncio"; "Ver anúncio"; "Ler mais"; "Editada"; "Encaminhada"; "Apagar para mim"; "Apagar para todos"; "Reenviar"; "Responder"; "Editar"; "Esta mensagem foi apagada"; "Visualizado por" e "Mensagem fixada" (Em breve).
- **Compositor:** "Mensagem"; "Enviar"; "Gravar áudio"; "Sua assinatura também é contabilizada no tamanho da mensagem."; "Fora da janela de 24h da Meta"; "Você só pode enviar mensagens utilizando modelos aprovados."; "Enviar outro modelo de mensagem"; "Aguarde a resposta do contato ou envie outro template aprovado."; "Modelo"; "Atribuir a mim"; "Você só pode responder em conversas atribuídas a você."; "O dispositivo está arquivado"; "Agendar mensagem".
- **Respostas rápidas:** "Respostas rápidas"; "Buscar"; "Ordenar por: A-Z"; "Gerais"; "Nova resposta".
- **Modelos:** "Modelos de mensagem"; "Pesquisar por…"; "Todas as categorias"; "Todas as pastas"; "Com Flow"; "Novo modelo"; "Usados recentemente"; "Todos os modelos"; "Selecione um modelo de mensagem à sua esquerda para enviar."; "Aprovado"; "Editar modelo"; "Cancelar"; "Enviar"; categorias "Marketing", "Utilidade", "Autenticação".
- **Assistente:** "Sugerir resposta"; "Resumir conversa"; "Agendar mensagem com texto da IA" (adaptado); "Preencher campos do CRM"; "Pergunte sobre esta conversa…"; "{assistente} agora lê esta conversa"; "Peça uma sugestão de resposta, um resumo ou preencha campos do CRM sem sair do atendimento."; "Rascunho inserido no campo de resposta, revise antes de enviar".
- **Nota:** "Adicionar nota interna"; "O contato não vê esta nota, somente você e sua equipe"; "Adicione aqui uma anotação do seu atendimento"; "Salvar nota".
- **Agendar:** "Agendar mensagem"; "Dentro da janela · até 24h após resposta"; "Mensagem livre"; "Texto, mídia ou áudio — qualquer formato. Enviada se o lead respondeu nas últimas 24h."; "Escreva uma mensagem, você pode adicionar mais de uma."; "Adicionar"; "Fora da janela · 24h sem resposta"; "Template Meta (obrigatório)"; "Se for a primeira interação com o contato ou se a última mensagem tiver sido enviada há mais de 24 horas, então envie:"; "+ Selecionar modelo"; "Data"; "Hora"; "Confirmar"; "Não é possível agendar para uma data/hora no passado"; "{n} mensagem(ns) agendada(s)"; "Mensagens agendadas"; "Buscar por nome, e-mail ou telefone"; "Criação"; "Envio"; "Dispositivo ou conta"; "Nome", "Telefone", "Data e hora da criação", "Data e hora de envio", "Dispositivo/Conta"; "Remover agendamento"; "10 por página".
- **Pausa:** "Pausar automação"; "Nenhuma automação ativa"; "Nesta conversa"; "Pausar"; "Pausar todas por"; "30 minutos", "1 hora", "4 horas", "1 dia"; "Até retomar"; "Escolher data e hora"; "Pausa de todas"; "Por {name}"; "Por você"; "Retomar"; "Próximo follow-up em {remaining}"; "Automação pausada" (histórico).
- **Textos nossos:** "Assistente IA"; "Buscar nesta conversa"; "Em breve"; "Só o atendente atual pode liberar a conversa."; "Este dispositivo não envia modelos."; "Dispositivo desconectado"; "Fora da janela de 24h"; "Remover a espera"; "Mensagem agendada."; "Agendamento removido."

### Comportamento da Clint conferido no código

- **Cabeçalho** (`component.ChatHeader.*`): o seletor troca o atendente na hora; "Sem atendente" tira o atendente; 409 vira "O atendente já foi alterado por outro usuário!"; "Marcar como não lida" devolve a bolha à linha; "Copiar link" copia a URL da conversa.
- **Status** (`component.ChatStatusActions.*`, `component.Response.*`): os dois botões; a thread registra "{pessoa} colocou o atendimento em espera - hh:mm", "{pessoa} encerrou o atendimento - hh:mm", "{pessoa} iniciou o atendimento - hh:mm"; mensagem nova reabre e tira da espera.
- **Compositor** (`component.MessageBox.*`): fora da janela, só modelo; "Aguarde a resposta do contato" depois de um modelo; a assinatura conta no tamanho.
- **Agendar** (`component.Editing.*`, `component.WhatsAppEditing.*`, `component.SchedulesMessages*`): texto para dentro da janela, template para fora; a lista em Configurações com busca, criação, envio e dispositivo; "Remover agendamento".
- **Pausa** (`component.ConversationPauseCard.*`, `component.PauseTimePopover.*`): "Pausar todas por" com os 4 prazos, "Até retomar" e "Escolher data e hora"; com pausa: "Pausa de todas", quem pausou, "Retomar".

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Branch `feat/fase-3b-conversa-aberta`** de `escale-crm/main` com a 3A mergeada, na worktree `wt-frente-c`; **migration 9202** (três tabelas: `crm_mensagens_agendadas`, `crm_pausas_de_automacao`, `crm_eventos_da_conversa`); um PR, mergeado ao terminar | regra de 18/10 |
| N2 | **A casca não muda de fora:** só `ConversaAberta.tsx` (3A) troca as três peças do original pelas quatro do fork. `ThreadDaCasca` e `CompositorDaCasca` nascem com as props que a 3E precisa (`conversationId`, `conversa`, `compacto?`) para entrar no painel flutuante e na ficha | F3 da 3E |
| N3 | **Em espera = snooze sem lembrete:** `snooze_until = '9999-12-31T00:00:00Z'`, `snoozed_at = now()`, `snoozed_by_user_id`, `metadata.escale_em_espera = true`; o `snooze-watcher` do original só reabre o que venceu, e isso nunca vence; o lembrete do original (`SnoozeButton`) não aparece na casca. Mensagem nova do cliente tira da espera pelo encaixe `tirarDaEsperaDaCasca` em `aplicarEfeitosPosEntrada` (`lib/channels/pos-entrada.ts`), que limpa os três campos e a marca e grava o evento "espera removida" (sem pessoa) | decisão 2 da seção 9; risco 2 do PRD |
| N4 | **Encerrar / Reabrir** pelas rotas do fork `POST /api/v1/conversas-da-casca/[id]/encerrar` e `/reabrir`, que repetem o que `close/route.ts` e o `PATCH` do original fazem (`fn_service_status` com `expected_revision`; `patchConversationHandler` com `status: "open"`) e gravam o evento em `crm_eventos_da_conversa`. Os hooks do original (`useCloseConversation`, `useReopenConversation`) **não** são usados na casca, para o evento nascer junto | C2 |
| N5 | **Os eventos da thread** vêm de `GET /api/v1/conversas-da-casca/[id]/eventos` (sessão): `conversation_assignment_events` (`claim`/`transfer`/`release`/`routing`/`handoff` → "O atendimento foi alterado de X para Y - hh:mm"; `claim` de quem não tinha dono → "{pessoa} iniciou o atendimento - hh:mm") + `crm_eventos_da_conversa` (`espera`, `espera_removida`, `encerrado`, `reaberto`). Os nomes vêm de `useAssignableMembers` (ids → nomes) | C2, C4 |
| N6 | **Marcar como não lida:** `POST /api/v1/conversas-da-casca/[id]/nao-lida` → `update conversations set unread_count_for_assignee = 1 where id and organization_id and unread_count_for_assignee = 0`, pela sessão (RLS `conversations_agent_update`); sem mexer em `fn_mark_conversation_message`. A casca não chama `mark-read` enquanto a pessoa fica na conversa marcada (estado local `naoLidaManual` até trocar de conversa) | C1; PRD seção 7 |
| N7 | **Mensagens agendadas** em `crm_mensagens_agendadas`: `tipo` (`texto`/`template`), `corpo`, `template` (`{name, language, values}`), `enviar_em`, `criado_por`, `status` (`pendente`, `processando`, `enviada`, `falhou`, `removida`), `erro`, `message_id`. RLS: membros `agent`+ leem as da organização; `agent` cria com `criado_por = auth.uid()`; remove a sua, `manager`+ qualquer. O cron `mensagens-agendadas` (minuto a minuto, linha no `docker/scheduler/entrypoint.sh`) reivindica as vencidas (`pendente` → `processando`, até 50), confere o dispositivo (`lerEstadoDoCanal(...).utilizavel`, senão `falhou` "Dispositivo desconectado") e a janela (texto fora da janela num provedor com modelos → `falhou` "Fora da janela de 24h"), envia por `sendMessageHandler(admin, { organization_id, actor: { type: "user", id: criado_por }, requestId }, …)`, grava `enviada`/`falhou`. Audita `conversation_message.scheduled`, `.unscheduled` e `.schedule_sent` | C9; PRD seção 7; risco 4 |
| N8 | **"⏱ n" na linha da fila** (3A) e o contador da ação rápida do painel vêm de `GET /api/v1/mensagens-agendadas/contagem?conversation_ids=` (até 60 ids; `{ [id]: n }`), chamada uma vez por página da lista (`useContagemDeAgendadas(ids)`); o toggle "Mensagens agendadas" de "Personalizar visualização" (3A) passa a mostrar o número | A7, C9 |
| N9 | **Pausar automação** em `crm_pausas_de_automacao` (`conversation_id` único, `ate` nulo = até retomar, `user_id`, `enrollments jsonb` com os ids pausados): a rota grava `bot_silenced_until = ate ?? 'infinity'` pela sessão (a coluna que o `pause-ai` do original e os guards do motor já usam) e pausa cada enrollment ativo da conversa por `pausaEnrollment` (sessão + admin, `lib/followup/intervencao`); "Retomar" limpa `bot_silenced_until` (volta para `null`) e chama `retomaEnrollment` nos ids guardados. O cron `pausas-de-automacao` (a cada 5 min) retoma as pausas com `ate <= now()`. O cartão lê `GET /api/v1/conversas-da-casca/[id]/pausa` → `{ pausa, agenteAtivo, followups: { ativos, proximoEm } }`. "Conversas suspensas" da 3D filtra por esta tabela | D4 |
| N10 | **Transferência imediata:** o seletor chama `useTransferConversation` (destino) ou `useClaimConversation` (eu); "Sem atendente" chama `useReleaseConversation` **só quando eu sou o atendente** (a rota do original só libera o próprio); para outro atendente, "Sem atendente" fica desligado com "Só o atendente atual pode liberar a conversa." (diferença declarada; a 3C, com `CHAT_CHANGE_TEAM_ATTENDANT`, decide se abre). 409 → "O atendente já foi alterado por outro usuário!" | decisão 12; rotas do original |
| N11 | **Modelos de mensagem:** a janela reaproveita `fonteDeTemplates`/`rotaDeTemplates` (`lib/channels/templates-fonte`) e `renderTemplatePreview` (`lib/channels/meta/render-template`), e os `slots`/`savedValues` que a `JanelaFechadaAviso` já trata; o envio é o mesmo `useSendMessage` com `type: "template"`. O ícone só aparece quando `fonteDeTemplates(provider) !== null`; "Com Flow", "Todas as pastas", ⚙ ficam "Em breve"; "+ Novo modelo" e "Editar modelo" abrem a tela do original (`/app/settings/canal-oficial`) | C7 |
| N12 | **Respostas rápidas** = `message_templates` do original: "Gerais" (compartilhadas, `owner_user_id` nulo) e "Minhas"; "+ Nova resposta" abre o `TemplateFormDialog` do original (`app/app/templates/_components/TemplateFormDialog.tsx`); ⚙ leva a `/app/templates` (a 3C troca pela tela da Clint); o filtro por setor fica "Em breve" (3C). Escolher uma resposta interpola `{{nome}}` (`interpolateTemplate`) e põe o texto no campo | C6 |
| N13 | **Assistente IA** (nome provisório, constante `NOME_DO_ASSISTENTE`): "Sugerir resposta" chama `useDraftReply` e insere no campo (com o toast da Clint); os outros três chips e a pergunta livre ficam "Em breve" | decisão 6 |
| N14 | **Thread própria** (`ThreadDaCasca`) com as bolhas da Clint sobre os hooks do original; a mídia continua pelo `MediaRenderer` (imagem, vídeo, documento, sticker, localização, contato, áudio com o `AudioPlayer` do original — o player da Clint com onda é diferença declarada); a transcrição (`media_derived_text`) aparece abaixo do áudio; "Reenviar" numa mensagem `failed` reenvia o mesmo corpo (`useSendMessage`); "Apagar para mim" = ocultar (`hide`), "Apagar para todos" = revogar (`DELETE /messages/[id]`), "Editar" (15 min, texto) = `PATCH`; o cartão de anúncio lê `message.metadata.referral` (`headline`, `body`, `source_url`, `image_url`, o objeto da Meta que `extrairAtribuicaoMeta` já conhece) | C4 |
| N15 | **Compositor próprio** (`CompositorDaCasca`) sobre os hooks e as peças do original (N2); a câmera é um `<input type="file" accept="image/*" capture="environment">`; a assinatura fica "Em breve" (o original não tem assinatura de atendimento); Flow só com `meta_cloud` e "Em breve"; "Agendar" abre a janela da Task 8; a nota interna é a janela (c12) e não o modo do original; `@menção` na nota continua (`MentionMenu`); `/atalho` abre as respostas rápidas filtradas | C5, C8 |
| N16 | **Fora da janela:** o compositor vira o aviso (c56/c73) quando `estadoDaJanela(...).tipo === "fechada"` e `fonteDeTemplates(provider) !== null`; "Enviar outro modelo de mensagem · Aguarde a resposta do contato ou envie outro template aprovado." quando a última mensagem foi um template nosso (`last_outbound_at > last_inbound_at` e a última mensagem da thread é `type: "template"`); no Instagram (sem modelos), a `JanelaFechadaAviso` do original não entra: o aviso é "Aguarde a resposta do contato para enviar novas mensagens." sem botão | C2, C11 |
| N17 | **Bloqueios (C11):** contato bloqueado/anonimizado = o `motivoDoContato` do original no lugar do compositor; dispositivo fora do ar = o `NumeroForaDoAr` do original; "Atribuir a mim · Você só pode responder em conversas atribuídas a você." aparece como faixa acima do compositor quando a organização está em `visibility_mode = "own"`/`"own_and_unassigned"` e a conversa não é minha nem está sem dono — o original já recusa o envio nesse caso pela RLS; com dono nenhum, a faixa oferece "Atribuir a mim" (claim) sem bloquear | C11 |
| N18 | **Tokens novos** (`app/escale-tema.css` + `app/globals.css`): `casca-painel-chat` `#F8F9FD` (o fundo da thread), `casca-nota` `#FEF9C3`, `casca-nota-borda` `#FDE68A`, `casca-pausa` `#FFF4E5`, `casca-pausa-texto` `#D97706` | cerca `tailwind-tokens` |
| N19 | **A tela de Configurações › Mensagens agendadas** é uma página do fork `app/app/inbox/configuracoes/mensagens-agendadas/page.tsx` (só com a casca; sem ela, `redirect("/app/inbox")`); o hub ⚙ (3C) aponta para ela. O X volta para `/app/inbox` | C9; E5 |
| N20 | **Fora desta fase:** o setor no cabeçalho e "Em transferência" (3C); a conversa na ficha e no painel flutuante (3E); "Visualizado por", "Mensagem fixada", assinatura, Flow, "Resumir conversa", "Preencher campos do CRM", a pergunta livre, "Todas as pastas", "Com Flow" (Em breve); a permissão de chamada na linha (`CallingWindowBadge`) só com dado da Meta — o original não guarda a janela de chamada: fica "Em breve" no toggle (3A N16, registrado) | PRD seção 8 e 9 |
| G1 | **Verificação enxuta**: por task só o que a task cria; `test:db`, rodada cheia, revisor e conferência no fim da Frente C | regra de 18/10 |

## Global Constraints

### Repositório, worktree e Git

- Worktree: `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-c`. **Base:** `escale-crm/main` com a 3A mergeada (a Task 1 prova: `components/escale/conversas/ConversaAberta.tsx` existe; `9201` está na `main`).
- **Branch:** `feat/fase-3b-conversa-aberta` (`git switch -c feat/fase-3b-conversa-aberta escale-crm/main`).
- **Migration:** `supabase/migrations/20261103120000_9202_mensagens_agendadas_pausas_eventos.sql`. Antes: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; `9202` em outra branch → PARE.
- **PR** para `rgisjr/escale-crm`, base `main`, mergeado ao terminar; tag/release/VPS só no fim da Frente C. **Proibido:** push em `origin`, tag, release, VPS, banco de produção.
- Conflitos com as outras frentes: `dicionario.ts`, `baseline.sql`, `actions.ts`, `rls-completude-varredura.test.ts`, `icons-da-casca.ts`, `escale-tema.css`, `globals.css`, `docker/scheduler/entrypoint.sh`: manter os dois blocos.

### Ambiente

- Git Bash, `corepack pnpm`, `NODE_OPTIONS=--max-old-space-size=6144`. `test:db` não roda nesta fase.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 3B`.

| Arquivo | Mudança |
|---|---|
| `lib/channels/pos-entrada.ts` | em `aplicarEfeitosPosEntrada`, depois do passo que abre a demanda (procure `await abrirDemanda(admin, entrada)` ou o último `await` do fluxo feliz): `await tirarDaEsperaDaCasca(admin, entrada.organizationId, entrada.conversationId);` (import de `@/lib/escale/conversas/espera`); a função engole o próprio erro com `logger.warn` |
| `docker/scheduler/entrypoint.sh` | duas linhas em `CRONS=`, logo depois de `*/5 * * * *|25|api/v1/cron/snooze-watcher`: `* * * * *|30|api/v1/cron/mensagens-agendadas` e `*/5 * * * *|25|api/v1/cron/pausas-de-automacao` |
| `supabase/baseline.sql` | o bloco da 9202, logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (depois do bloco da 9201) |
| `lib/i18n/dicionario.ts` | bloco `// ─── FORK ESCALE · Fase 3B: a conversa aberta ───` logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` (depois do bloco da 3A) |
| `lib/audit/actions.ts` | depois de `"conversation_prefs.updated",`: `"conversation.waiting_set", "conversation.waiting_cleared", "conversation.marked_unread", "conversation.automation_paused", "conversation.automation_resumed", "conversation_message.scheduled", "conversation_message.unscheduled", "conversation_message.schedule_sent",` |
| `tests/invariants/rls-completude-varredura.test.ts` | três entradas em `PROVA_PROPRIA` depois da de `crm_preferencias_de_conversas` |
| `lib/ui/icons-da-casca.ts` | `export { AlarmClock, Camera, CirclePause, Hourglass, Lightbulb, MailOpen, Mic, PenLine, Play, RotateCcw, Send, Smile, Workflow, Instagram } from "lucide-react";` (só os que faltam) |
| `app/escale-tema.css`, `app/globals.css` | os 5 tokens da N18 |

Do fork que mudam: `components/escale/conversas/centro/ConversaAberta.tsx` (as quatro peças), `components/escale/conversas/fila/LinhaDaFila.tsx` e `ListaDaFila.tsx` (o "⏱ n"), `components/escale/conversas/painel/CabecalhoDoContato.tsx` (a ação rápida de agendar com o contador), `components/escale/conversas/painel/PainelDoContato.tsx` (o cartão "Pausar automação" entre o negócio e as seções), `components/escale/conversas/centro/NovaConversa.tsx` (não muda).

### Cercas que precisam ficar verdes

As da 3A mais: `cron-routes-scheduled` (as duas rotas de cron agendadas no `entrypoint.sh`), `rls-completude-varredura` (as três tabelas), `tabelas-do-motor-nao-se-leem-pelo-login` (as tabelas novas lidas pela sessão; o service role só nos crons), `i18n-espanhol-cobre-a-tela`, `controle-decorativo`, `tailwind-tokens`, `evidencia-citada`, `manifest-x-migrations`.

### Verificação (G1)

Como na 3A: por task, os testes da task + typecheck + eslint dos arquivos alterados; `test:db`, rodada cheia, revisor e conferência visual no fim da Frente C.

### Commits e PR

Como na 3A. Copiar este plano para `docs/superpowers/plans/` na Task 1.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/escale/conversas/eventos.ts` | novo | os eventos da thread: tipos, o texto de cada um, a junção com as mensagens |
| `lib/escale/conversas/espera.ts` | novo | a marca "sem lembrete", `ESPERA_SEM_FIM`, `emEsperaDaCasca`, `tirarDaEsperaDaCasca` |
| `lib/escale/conversas/janela.ts` | novo | o selo da janela (texto e estado) e o modo do compositor (livre, só modelo, aguardando) |
| `lib/escale/conversas/agendadas.ts` | novo | schemas, status, validação de data, filtros da tela, `enviarAgendada` (o passo do cron) |
| `lib/escale/conversas/pausa.ts` | novo | os prazos, o texto do selo, `fimDaPausa` |
| `lib/escale/conversas/assistente.ts` | novo | `NOME_DO_ASSISTENTE` e os chips |
| `supabase/migrations/20261103120000_9202_mensagens_agendadas_pausas_eventos.sql`, `supabase/baseline.sql` | novo / bloco | as três tabelas |
| `tests/invariants/escale-conversa-aberta-9202.test.ts` | novo | a prova de RLS das três tabelas |
| `app/api/v1/conversas-da-casca/[id]/espera/route.ts`, `encerrar/route.ts`, `reabrir/route.ts`, `nao-lida/route.ts`, `eventos/route.ts`, `pausa/route.ts` | novos | as rotas da conversa |
| `app/api/v1/mensagens-agendadas/route.ts`, `[id]/route.ts`, `contagem/route.ts` | novos | listar, criar, remover, contar |
| `app/api/v1/cron/mensagens-agendadas/route.ts`, `app/api/v1/cron/pausas-de-automacao/route.ts` | novos | os dois crons |
| `hooks/escale/useConversaDaCasca.ts` | novo | espera, encerrar, reabrir, não lida, eventos, pausa (mutations + queries) |
| `hooks/escale/useMensagensAgendadas.ts` | novo | listar, criar, remover, contagem |
| `hooks/escale/useModelosDeMensagem.ts` | novo | os modelos aprovados da conversa e os recentes |
| `components/escale/conversas/centro/CabecalhoDaConversa.tsx`, `SeletorDeAtendente.tsx`, `BarraDeStatus.tsx` | novos | C1, C2 |
| `components/escale/conversas/centro/thread/ThreadDaCasca.tsx`, `BalaoDaCasca.tsx`, `EventoDaThread.tsx`, `NotaDaThread.tsx`, `CartaoDeAnuncio.tsx`, `SeparadorDeDia.tsx` | novos | C4 |
| `components/escale/conversas/centro/compositor/CompositorDaCasca.tsx`, `BarraDeIcones.tsx`, `AvisoForaDaJanela.tsx`, `FaixaAtribuirAMim.tsx`, `PainelRespostasRapidas.tsx`, `JanelaModelosDeMensagem.tsx`, `BalaoDoAssistente.tsx`, `JanelaNotaInterna.tsx` | novos | C5–C8, C10, C11 |
| `components/escale/conversas/agendadas/JanelaAgendarMensagem.tsx`, `TabelaDeAgendadas.tsx`, `JanelaMensagensAgendadasDoContato.tsx`, `TelaMensagensAgendadas.tsx` | novos | C9 |
| `app/app/inbox/configuracoes/mensagens-agendadas/page.tsx` | novo | a tela de Configurações |
| `components/escale/conversas/painel/CartaoPausarAutomacao.tsx` | novo | D4 |
| `components/escale/conversas/centro/ConversaAberta.tsx`, `fila/LinhaDaFila.tsx`, `fila/ListaDaFila.tsx`, `painel/CabecalhoDoContato.tsx`, `painel/PainelDoContato.tsx` | alterados | os encaixes da 3A |
| `lib/channels/pos-entrada.ts`, `docker/scheduler/entrypoint.sh`, `lib/audit/actions.ts`, `lib/i18n/dicionario.ts`, `tests/invariants/rls-completude-varredura.test.ts`, `lib/ui/icons-da-casca.ts`, `app/escale-tema.css`, `app/globals.css` | alterados | os encaixes do original |

---

### Task 1: Branch, base e as regras puras (eventos, espera, janela, agendadas, pausa)

**Files:**
- Create: `lib/escale/conversas/eventos.ts`, `lib/escale/conversas/espera.ts`, `lib/escale/conversas/janela.ts`, `lib/escale/conversas/agendadas.ts`, `lib/escale/conversas/pausa.ts`, `lib/escale/conversas/assistente.ts`, `tests/unit/escale-conversa-aberta-regras.test.ts`

**Interfaces (Produces):**
- `eventos.ts`: `TIPOS_DE_EVENTO` (`espera`, `espera_removida`, `encerrado`, `reaberto`, `atendente`), `EventoDaConversa` (`{ id, tipo, em: string, user_id: string | null, de_user_id?: string | null, para_user_id?: string | null, reason?: string }`), `textoDoEvento(e, nomes: ReadonlyMap<string, string>, t)` → `{ partes: Array<{ texto: string; forte?: boolean }>; hora: string }` (ex.: [{Camilly Victória, forte},{" colocou o atendimento em espera"}], "17:46"), `eventosDasAtribuicoes(linhas)` (converte `conversation_assignment_events` em `EventoDaConversa`), `ItemDaThread` (`message` | `note` | `passagem` | `evento`), `juntarItens(messages, notes, passagens, eventos)`, `rotuloDoDia(d, agora, t)` ("HOJE", "ONTEM", dd/mm/aaaa).
- `espera.ts`: `ESPERA_SEM_FIM` (`"9999-12-31T00:00:00.000Z"`), `MARCA_DA_ESPERA` (`"escale_em_espera"`), `emEsperaDaCasca(c)` (a marca + `snooze_until` vigente), `camposParaEntrarEmEspera(userId, agora)`, `camposParaSairDaEspera()`, `tirarDaEsperaDaCasca(admin, orgId, conversationId)` (lê, se marcada limpa e grava o evento `espera_removida` com `user_id` nulo; engole erro com `logger.warn`).
- `janela.ts`: `seloDaJanela(estado, provider, t)` → `{ texto, tom: "aberta" | "fechada" | "aguardando" }` ("23:36" = hh:mm restantes; "6d 23h 56m" fora do WhatsApp; "Janela encerrada"; "Aguardando abrir janela" quando `aguardandoTemplate`), `modoDoCompositor({ estado, provider, ultimaFoiTemplate })` → `"livre" | "so_modelo" | "outro_modelo" | "aguardando_contato"`, `formatarRestante(ms)`.
- `agendadas.ts`: `STATUS_DA_AGENDADA`, `novaAgendadaSchema` (`{ conversation_id, enviar_em, mensagens: Array<{ tipo: "texto", corpo } | { tipo: "template", template: { name, language, values } }> }` (1 a 5)), `listaDeAgendadasSchema` (query: `busca`, `criacao_de/ate`, `envio_de/ate`, `channel_session_id`, `contact_id`, `conversation_id`, `pagina`, `por_pagina`), `dataNoPassado(iso, agora)`, `motivoDaFalha` (`"dispositivo"` | `"janela"` | `"envio"`), `decidirEnvio({ canal, provider, lastInboundAt, tipo, agora })` → `{ ok: true } | { ok: false, motivo, erro }`.
- `pausa.ts`: `PRAZOS_DA_PAUSA` (`[{ chave: "30m", minutos: 30, rotulo: "30 minutos" }, 1h, 4h, 1d]`), `fimDoPrazo(chave, agora)`, `textoDoFim(iso, agora, t)` ("20:26" hoje; "amanhã 19:56"; dd/mm/aaaa hh:mm), `seloDaPausa(pausa, agora, t)` ("Até retomar" ou "até hh:mm"), `pausaVigente(pausa, agora)`.
- `assistente.ts`: `NOME_DO_ASSISTENTE` ("Assistente IA"), `CHIPS_DO_ASSISTENTE`.

- [ ] **Step 1: A branch e a base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-c"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain                      # Expected: vazio
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:components/escale/conversas/centro/ConversaAberta.tsx && echo "3A ok"
git ls-tree --name-only escale-crm/main supabase/migrations/ | grep -E "_92[0-9]{2}_"   # Expected: só a 9201
bash scripts/checar-colisao-de-migration.sh escale-crm/main
git switch -c feat/fase-3b-conversa-aberta escale-crm/main
corepack pnpm install --frozen-lockfile
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-18-fase-3b-conversa-aberta.md" docs/superpowers/plans/
```

- [ ] **Step 2: O teste das regras (vai falhar)**

Create `tests/unit/escale-conversa-aberta-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { dataNoPassado, decidirEnvio, novaAgendadaSchema } from "@/lib/escale/conversas/agendadas";
import { camposParaEntrarEmEspera, camposParaSairDaEspera, emEsperaDaCasca, ESPERA_SEM_FIM } from "@/lib/escale/conversas/espera";
import { eventosDasAtribuicoes, juntarItens, rotuloDoDia, textoDoEvento } from "@/lib/escale/conversas/eventos";
import { modoDoCompositor, seloDaJanela } from "@/lib/escale/conversas/janela";
import { fimDoPrazo, pausaVigente, seloDaPausa, textoDoFim } from "@/lib/escale/conversas/pausa";

const t = (s: string) => s;
const AGORA = new Date("2026-10-18T19:56:00-03:00");
const nomes = new Map([["u1", "Camilly Victória"], ["u2", "Bathuly Bueno"]]);

describe("os eventos da thread (C2, C4)", () => {
  it("espera, encerrar e reabrir com a pessoa em negrito e a hora", () => {
    const e = textoDoEvento({ id: "e1", tipo: "espera", em: "2026-10-18T20:46:00Z", user_id: "u2" }, nomes, t);
    expect(e.partes).toEqual([{ texto: "Bathuly Bueno", forte: true }, { texto: " colocou o atendimento em espera" }]);
    expect(e.hora).toBe("17:46");
    expect(textoDoEvento({ id: "e2", tipo: "encerrado", em: "2026-10-18T20:48:00Z", user_id: "u2" }, nomes, t).partes[1]).toEqual({ texto: " encerrou o atendimento" });
    expect(textoDoEvento({ id: "e3", tipo: "espera_removida", em: "2026-10-18T20:49:00Z", user_id: null }, nomes, t).partes).toEqual([{ texto: "O contato respondeu e a espera foi removida" }]);
  });

  it("as atribuições do original viram 'O atendimento foi alterado de X para Y' e 'iniciou o atendimento'", () => {
    const eventos = eventosDasAtribuicoes([
      { id: "a1", from_user_id: null, to_user_id: "u1", changed_by: "u1", reason: "claim", created_at: "2026-10-18T22:31:00Z" },
      { id: "a2", from_user_id: "u1", to_user_id: "u2", changed_by: "u1", reason: "transfer", created_at: "2026-10-18T22:40:00Z" },
    ]);
    expect(textoDoEvento(eventos[0]!, nomes, t).partes).toEqual([{ texto: "Camilly Victória", forte: true }, { texto: " iniciou o atendimento" }]);
    expect(textoDoEvento(eventos[1]!, nomes, t).partes).toEqual([
      { texto: "O atendimento foi alterado de " }, { texto: "Camilly Victória", forte: true }, { texto: " para " }, { texto: "Bathuly Bueno", forte: true },
    ]);
    expect(textoDoEvento({ ...eventos[1]!, de_user_id: null }, nomes, t).partes[1]).toEqual({ texto: "Sem atendente", forte: true });
  });

  it("junta mensagens, notas, passagens e eventos por hora; o dia vira HOJE/ONTEM/data", () => {
    const itens = juntarItens(
      [{ id: "m1", sent_at: "2026-10-18T10:00:00Z" } as never],
      [{ id: "n1", created_at: "2026-10-18T11:00:00Z" } as never],
      [],
      [{ id: "e1", tipo: "espera", em: "2026-10-18T10:30:00Z", user_id: "u1" }],
    );
    expect(itens.map((i) => i.kind)).toEqual(["message", "evento", "note"]);
    expect(rotuloDoDia(new Date("2026-10-18T10:00:00-03:00"), AGORA, t)).toBe("Hoje");
    expect(rotuloDoDia(new Date("2026-10-17T10:00:00-03:00"), AGORA, t)).toBe("Ontem");
    expect(rotuloDoDia(new Date("2026-08-26T10:00:00-03:00"), AGORA, t)).toBe("26/08/2026");
  });
});

describe("em espera sem lembrete (decisão 2)", () => {
  it("entra com o snooze sem fim e a marca; sai limpando os dois", () => {
    const entrar = camposParaEntrarEmEspera("u1", AGORA, { foo: 1 });
    expect(entrar.snooze_until).toBe(ESPERA_SEM_FIM);
    expect(entrar.snoozed_by_user_id).toBe("u1");
    expect(entrar.metadata).toEqual({ foo: 1, escale_em_espera: true });
    expect(emEsperaDaCasca({ snooze_until: ESPERA_SEM_FIM, metadata: { escale_em_espera: true } }, AGORA)).toBe(true);
    expect(emEsperaDaCasca({ snooze_until: "2026-10-19T00:00:00Z", metadata: {} }, AGORA)).toBe(false);
    expect(camposParaSairDaEspera({ escale_em_espera: true, foo: 1 }).metadata).toEqual({ foo: 1 });
  });
});

describe("a janela e o modo do compositor (C2, C11, C16)", () => {
  it("aberta mostra hh:mm no WhatsApp e Nd Nh Nm no Instagram; fechada, 'Janela encerrada' ou 'Aguardando abrir janela'", () => {
    expect(seloDaJanela({ tipo: "aberta", restanteMs: 23 * 3600_000 + 36 * 60_000 }, "meta_cloud", false, t)).toEqual({ texto: "23:36", tom: "aberta" });
    expect(seloDaJanela({ tipo: "aberta", restanteMs: (6 * 24 + 23) * 3600_000 + 56 * 60_000 }, "zernio_social", false, t)).toEqual({ texto: "6d 23h 56m", tom: "aberta" });
    expect(seloDaJanela({ tipo: "fechada", fechadaHaMs: 1 }, "meta_cloud", false, t)).toEqual({ texto: "Janela encerrada", tom: "fechada" });
    expect(seloDaJanela({ tipo: "fechada", fechadaHaMs: 1 }, "meta_cloud", true, t)).toEqual({ texto: "Aguardando abrir janela", tom: "aguardando" });
    expect(seloDaJanela({ tipo: "sem_restricao" }, "waha", false, t)).toBeNull();
  });

  it("o modo: livre, só modelo, outro modelo (depois de um template) e aguardando o contato (Instagram)", () => {
    expect(modoDoCompositor({ estado: { tipo: "aberta", restanteMs: 1 }, provider: "meta_cloud", ultimaFoiTemplate: false })).toBe("livre");
    expect(modoDoCompositor({ estado: { tipo: "fechada", fechadaHaMs: 1 }, provider: "meta_cloud", ultimaFoiTemplate: false })).toBe("so_modelo");
    expect(modoDoCompositor({ estado: { tipo: "fechada", fechadaHaMs: 1 }, provider: "meta_cloud", ultimaFoiTemplate: true })).toBe("outro_modelo");
    expect(modoDoCompositor({ estado: { tipo: "fechada", fechadaHaMs: 1 }, provider: "zernio_social", ultimaFoiTemplate: false })).toBe("aguardando_contato");
    expect(modoDoCompositor({ estado: { tipo: "sem_restricao" }, provider: "waha", ultimaFoiTemplate: false })).toBe("livre");
  });
});

describe("mensagens agendadas (C9)", () => {
  it("o schema aceita 1 a 5 mensagens, texto ou template, e recusa no passado", () => {
    const base = { conversation_id: "11111111-1111-4111-8111-111111111111", enviar_em: "2026-10-19T13:00:00.000Z" };
    expect(novaAgendadaSchema.safeParse({ ...base, mensagens: [{ tipo: "texto", corpo: "Boa tarde" }] }).success).toBe(true);
    expect(novaAgendadaSchema.safeParse({ ...base, mensagens: [{ tipo: "template", template: { name: "boa_tarde", language: "pt_BR", values: {} } }] }).success).toBe(true);
    expect(novaAgendadaSchema.safeParse({ ...base, mensagens: [] }).success).toBe(false);
    expect(novaAgendadaSchema.safeParse({ ...base, mensagens: Array(6).fill({ tipo: "texto", corpo: "x" }) }).success).toBe(false);
    expect(dataNoPassado("2026-10-18T22:00:00Z", AGORA)).toBe(true);
    expect(dataNoPassado("2026-10-18T23:30:00Z", AGORA)).toBe(false);
  });

  it("o cron só envia com o dispositivo de pé e, fora da janela, só template", () => {
    const canal = { status: "WORKING", provider: "meta_cloud" };
    expect(decidirEnvio({ canal, lastInboundAt: "2026-10-18T22:00:00Z", tipo: "texto", agora: AGORA })).toEqual({ ok: true });
    expect(decidirEnvio({ canal: { status: "STOPPED", provider: "meta_cloud" }, lastInboundAt: null, tipo: "texto", agora: AGORA })).toMatchObject({ ok: false, motivo: "dispositivo" });
    expect(decidirEnvio({ canal, lastInboundAt: "2026-10-10T22:00:00Z", tipo: "texto", agora: AGORA })).toMatchObject({ ok: false, motivo: "janela" });
    expect(decidirEnvio({ canal, lastInboundAt: "2026-10-10T22:00:00Z", tipo: "template", agora: AGORA })).toEqual({ ok: true });
    expect(decidirEnvio({ canal: { status: "WORKING", provider: "waha" }, lastInboundAt: null, tipo: "texto", agora: AGORA })).toEqual({ ok: true });
  });
});

describe("pausar automação (D4)", () => {
  it("os prazos somam ao agora; o texto do fim é hoje hh:mm ou 'amanhã hh:mm'; o selo", () => {
    expect(fimDoPrazo("30m", AGORA).toISOString()).toBe("2026-10-18T23:26:00.000Z");
    expect(textoDoFim(fimDoPrazo("30m", AGORA).toISOString(), AGORA, t)).toBe("20:26");
    expect(textoDoFim(fimDoPrazo("1d", AGORA).toISOString(), AGORA, t)).toBe("amanhã 19:56");
    expect(textoDoFim("2026-10-25T13:00:00Z", AGORA, t)).toBe("25/10/2026 10:00");
    expect(seloDaPausa({ ate: null }, AGORA, t)).toBe("Até retomar");
    expect(seloDaPausa({ ate: "2026-10-18T23:26:00Z" }, AGORA, t)).toBe("até 20:26");
    expect(pausaVigente({ ate: "2026-10-18T22:00:00Z" }, AGORA)).toBe(false);
    expect(pausaVigente({ ate: null }, AGORA)).toBe(true);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-conversa-aberta-regras.test.ts`
Expected: FAIL.

- [ ] **Step 4: `eventos.ts` e `espera.ts`**

Create `lib/escale/conversas/eventos.ts`:

```ts
import type { CartaoDaPassagem } from "@/lib/escalacao/cartao-da-passagem";
import type { Message, Note } from "@/lib/types/messaging";

type T = (texto: string) => string;
const dois = (n: number) => String(n).padStart(2, "0");

/**
 * OS EVENTOS DA THREAD (fork Escale, Fase 3B; C2, C4; c56). Os de atribuição
 * vêm de `conversation_assignment_events` (original); os de espera e de
 * encerramento, de `crm_eventos_da_conversa` (9202).
 */
export const TIPOS_DE_EVENTO = ["espera", "espera_removida", "encerrado", "reaberto", "atendente"] as const;
export type TipoDeEvento = (typeof TIPOS_DE_EVENTO)[number];

export interface EventoDaConversa {
  id: string;
  tipo: TipoDeEvento;
  em: string;
  user_id: string | null;
  de_user_id?: string | null;
  para_user_id?: string | null;
  reason?: string;
}

export interface Parte {
  texto: string;
  forte?: boolean;
}

export interface LinhaDaAtribuicao {
  id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  changed_by: string | null;
  reason: string;
  created_at: string;
}

export function eventosDasAtribuicoes(linhas: readonly LinhaDaAtribuicao[]): EventoDaConversa[] {
  return linhas.map((l) => ({
    id: l.id,
    tipo: "atendente",
    em: l.created_at,
    user_id: l.changed_by,
    de_user_id: l.from_user_id,
    para_user_id: l.to_user_id,
    reason: l.reason,
  }));
}

const horaDe = (iso: string) => {
  const d = new Date(iso);
  return `${dois(d.getHours())}:${dois(d.getMinutes())}`;
};

export function textoDoEvento(
  e: EventoDaConversa,
  nomes: ReadonlyMap<string, string>,
  t: T,
): { partes: Parte[]; hora: string } {
  const nome = (id: string | null | undefined) => (id ? (nomes.get(id) ?? t("Atendente")) : t("Sem atendente"));
  const hora = horaDe(e.em);
  const pessoa = { texto: nome(e.user_id), forte: true };
  switch (e.tipo) {
    case "espera":
      return { partes: [pessoa, { texto: ` ${t("colocou o atendimento em espera")}` }], hora };
    case "encerrado":
      return { partes: [pessoa, { texto: ` ${t("encerrou o atendimento")}` }], hora };
    case "reaberto":
      return { partes: [pessoa, { texto: ` ${t("reabriu o atendimento")}` }], hora };
    case "espera_removida":
      return e.user_id
        ? { partes: [pessoa, { texto: ` ${t("removeu a espera")}` }], hora }
        : { partes: [{ texto: t("O contato respondeu e a espera foi removida") }], hora };
    case "atendente":
    default:
      if (!e.de_user_id && e.para_user_id && e.reason === "claim") {
        return { partes: [{ texto: nome(e.para_user_id), forte: true }, { texto: ` ${t("iniciou o atendimento")}` }], hora };
      }
      return {
        partes: [
          { texto: `${t("O atendimento foi alterado de")} ` },
          { texto: nome(e.de_user_id), forte: true },
          { texto: ` ${t("para")} ` },
          { texto: nome(e.para_user_id), forte: true },
        ],
        hora,
      };
  }
}

export type ItemDaThread =
  | { kind: "message"; ts: string; data: Message }
  | { kind: "note"; ts: string; data: Note }
  | { kind: "passagem"; ts: string; data: CartaoDaPassagem }
  | { kind: "evento"; ts: string; data: EventoDaConversa };

export function juntarItens(
  messages: readonly Message[],
  notes: readonly Note[],
  passagens: readonly CartaoDaPassagem[],
  eventos: readonly EventoDaConversa[],
): ItemDaThread[] {
  const itens: ItemDaThread[] = [
    ...messages.map((data): ItemDaThread => ({ kind: "message", ts: data.sent_at, data })),
    ...notes.map((data): ItemDaThread => ({ kind: "note", ts: data.created_at, data })),
    ...passagens.map((data): ItemDaThread => ({ kind: "passagem", ts: data.criadoEm, data })),
    ...eventos.map((data): ItemDaThread => ({ kind: "evento", ts: data.em, data })),
  ];
  return itens.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
}

const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function rotuloDoDia(d: Date, agora: Date, t: T): string {
  if (mesmoDia(d, agora)) return t("Hoje");
  const ontem = new Date(agora);
  ontem.setDate(agora.getDate() - 1);
  if (mesmoDia(d, ontem)) return t("Ontem");
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`;
}
```

Create `lib/escale/conversas/espera.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";

/**
 * EM ESPERA SEM LEMBRETE (fork Escale, Fase 3B; C2, decisão 2 da seção 9).
 * O snooze do original com um fim que nunca chega e uma marca no `metadata`:
 * o `snooze-watcher` não reabre, a casca mostra "Em espera", e a mensagem nova
 * do cliente tira da espera (`tirarDaEsperaDaCasca`, encaixe do pós-entrada).
 */
export const ESPERA_SEM_FIM = "9999-12-31T00:00:00.000Z";
export const MARCA_DA_ESPERA = "escale_em_espera";

type Meta = Record<string, unknown> | null | undefined;

export function emEsperaDaCasca(
  c: { snooze_until: string | null; metadata?: Meta },
  agora: Date = new Date(),
): boolean {
  if (!c.metadata || c.metadata[MARCA_DA_ESPERA] !== true) return false;
  return !!c.snooze_until && Date.parse(c.snooze_until) > agora.getTime();
}

export function camposParaEntrarEmEspera(userId: string, agora: Date, metadata: Meta) {
  return {
    snooze_until: ESPERA_SEM_FIM,
    snoozed_at: agora.toISOString(),
    snoozed_by_user_id: userId,
    metadata: { ...(metadata ?? {}), [MARCA_DA_ESPERA]: true },
  };
}

export function camposParaSairDaEspera(metadata: Meta) {
  const { [MARCA_DA_ESPERA]: _marca, ...resto } = metadata ?? {};
  return { snooze_until: null, snoozed_at: null, snoozed_by_user_id: null, metadata: resto };
}

/** O encaixe do pós-entrada: a mensagem nova do cliente tira a conversa da espera. Nunca derruba a entrada. */
export async function tirarDaEsperaDaCasca(
  admin: SupabaseClient,
  organizationId: string,
  conversationId: string,
): Promise<void> {
  try {
    const { data } = await admin
      .from("conversations")
      .select("id, snooze_until, metadata")
      .eq("organization_id", organizationId)
      .eq("id", conversationId)
      .maybeSingle();
    const c = data as { id: string; snooze_until: string | null; metadata: Meta } | null;
    if (!c || !emEsperaDaCasca(c)) return;
    const { error } = await admin
      .from("conversations")
      .update(camposParaSairDaEspera(c.metadata))
      .eq("organization_id", organizationId)
      .eq("id", conversationId);
    if (error) throw error;
    await admin.from("crm_eventos_da_conversa").insert({
      organization_id: organizationId,
      conversation_id: conversationId,
      tipo: "espera_removida",
      user_id: null,
    });
  } catch (err) {
    logger.warn("escale/espera: não consegui tirar da espera", {
      organization_id: organizationId,
      conversation_id: conversationId,
      detail: err instanceof Error ? err.message.slice(0, 160) : "desconhecido",
    });
  }
}
```

- [ ] **Step 5: `janela.ts`, `agendadas.ts`, `pausa.ts`, `assistente.ts`**

Create `lib/escale/conversas/janela.ts`:

```ts
import type { EstadoDaJanela } from "@/lib/channels/janela";
import { fonteDeTemplates } from "@/lib/channels/templates-fonte";

type T = (texto: string) => string;
const dois = (n: number) => String(n).padStart(2, "0");

/** "23:36" no WhatsApp (hh:mm restantes); "6d 23h 56m" fora dele (c02, c48). */
export function formatarRestante(ms: number, curto: boolean): string {
  const min = Math.max(0, Math.floor(ms / 60_000));
  if (curto) return `${dois(Math.floor(min / 60))}:${dois(min % 60)}`;
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

export type TomDoSelo = "aberta" | "fechada" | "aguardando";

export function seloDaJanela(
  estado: EstadoDaJanela,
  provider: string | null | undefined,
  aguardandoTemplate: boolean,
  t: T,
): { texto: string; tom: TomDoSelo } | null {
  if (estado.tipo === "sem_restricao") return null;
  if (estado.tipo === "aberta") {
    return { texto: formatarRestante(estado.restanteMs, fonteDeTemplates(provider) !== null), tom: "aberta" };
  }
  return aguardandoTemplate
    ? { texto: t("Aguardando abrir janela"), tom: "aguardando" }
    : { texto: t("Janela encerrada"), tom: "fechada" };
}

export type ModoDoCompositor = "livre" | "so_modelo" | "outro_modelo" | "aguardando_contato";

export function modoDoCompositor(e: {
  estado: EstadoDaJanela;
  provider: string | null | undefined;
  ultimaFoiTemplate: boolean;
}): ModoDoCompositor {
  if (e.estado.tipo !== "fechada") return "livre";
  if (fonteDeTemplates(e.provider) === null) return "aguardando_contato";
  return e.ultimaFoiTemplate ? "outro_modelo" : "so_modelo";
}
```

Create `lib/escale/conversas/agendadas.ts`:

```ts
import { z } from "zod";

import { lerEstadoDoCanal } from "@/lib/channels/estado";
import { estadoDaJanela } from "@/lib/channels/janela";
import { fonteDeTemplates } from "@/lib/channels/templates-fonte";

/**
 * MENSAGENS AGENDADAS (fork Escale, Fase 3B; C9; migration 9202). Texto para
 * dentro da janela, template para fora (c08); o cron envia na hora e grava o
 * que aconteceu.
 */
export const STATUS_DA_AGENDADA = ["pendente", "processando", "enviada", "falhou", "removida"] as const;
export type StatusDaAgendada = (typeof STATUS_DA_AGENDADA)[number];
export const MENSAGENS_POR_AGENDAMENTO_MAX = 5;
export const AGENDADAS_POR_PAGINA = [10, 25, 50] as const;

const templateSchema = z.object({
  name: z.string().min(1).max(512),
  language: z.string().min(2).max(16),
  values: z.record(z.string(), z.string()).default({}),
});
export const mensagemAgendadaSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("texto"), corpo: z.string().trim().min(1).max(4096) }),
  z.object({ tipo: z.literal("template"), template: templateSchema }),
]);
export type MensagemAgendada = z.infer<typeof mensagemAgendadaSchema>;

export const novaAgendadaSchema = z.object({
  conversation_id: z.string().uuid(),
  enviar_em: z.string().datetime(),
  mensagens: z.array(mensagemAgendadaSchema).min(1).max(MENSAGENS_POR_AGENDAMENTO_MAX),
});
export type NovaAgendada = z.infer<typeof novaAgendadaSchema>;

export const listaDeAgendadasSchema = z.object({
  busca: z.string().trim().max(100).optional(),
  criacao_de: z.string().date().optional(),
  criacao_ate: z.string().date().optional(),
  envio_de: z.string().date().optional(),
  envio_ate: z.string().date().optional(),
  channel_session_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  por_pagina: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListaDeAgendadas = z.infer<typeof listaDeAgendadasSchema>;

export const dataNoPassado = (iso: string, agora: Date): boolean => Date.parse(iso) <= agora.getTime();

export type MotivoDaFalha = "dispositivo" | "janela" | "envio";

export function decidirEnvio(e: {
  canal: { status: string; provider: string | null };
  lastInboundAt: string | null;
  tipo: MensagemAgendada["tipo"];
  agora: Date;
}): { ok: true } | { ok: false; motivo: MotivoDaFalha; erro: string } {
  if (!lerEstadoDoCanal(e.canal.status).utilizavel) {
    return { ok: false, motivo: "dispositivo", erro: "Dispositivo desconectado" };
  }
  const janela = estadoDaJanela(e.canal.provider, e.lastInboundAt, e.agora);
  if (e.tipo === "texto" && janela.tipo === "fechada" && fonteDeTemplates(e.canal.provider) !== null) {
    return { ok: false, motivo: "janela", erro: "Fora da janela de 24h" };
  }
  return { ok: true };
}

export interface AgendadaLida {
  id: string;
  conversation_id: string;
  contact_id: string;
  channel_session_id: string;
  tipo: MensagemAgendada["tipo"];
  corpo: string | null;
  template: { name: string; language: string; values: Record<string, string> } | null;
  enviar_em: string;
  criado_por: string;
  status: StatusDaAgendada;
  erro: string | null;
  created_at: string;
  contato: { nome: string; telefone: string | null; tem_foto: boolean };
  dispositivo: { nome: string; provider: string | null; status: string };
}
```

Create `lib/escale/conversas/pausa.ts`:

```ts
type T = (texto: string) => string;
const dois = (n: number) => String(n).padStart(2, "0");

/** "PAUSAR AUTOMAÇÃO" (fork Escale, Fase 3B; D4; c06, c07, c74). */
export const PRAZOS_DA_PAUSA = [
  { chave: "30m", minutos: 30, rotulo: "30 minutos" },
  { chave: "1h", minutos: 60, rotulo: "1 hora" },
  { chave: "4h", minutos: 240, rotulo: "4 horas" },
  { chave: "1d", minutos: 1440, rotulo: "1 dia" },
] as const;
export type ChaveDoPrazo = (typeof PRAZOS_DA_PAUSA)[number]["chave"];

export function fimDoPrazo(chave: ChaveDoPrazo, agora: Date): Date {
  const prazo = PRAZOS_DA_PAUSA.find((p) => p.chave === chave)!;
  return new Date(agora.getTime() + prazo.minutos * 60_000);
}

const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "20:26" hoje, "amanhã 19:56", senão dd/mm/aaaa hh:mm. */
export function textoDoFim(iso: string, agora: Date, t: T): string {
  const d = new Date(iso);
  const hora = `${dois(d.getHours())}:${dois(d.getMinutes())}`;
  if (mesmoDia(d, agora)) return hora;
  const amanha = new Date(agora);
  amanha.setDate(agora.getDate() + 1);
  if (mesmoDia(d, amanha)) return `${t("amanhã")} ${hora}`;
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} ${hora}`;
}

export interface PausaLeve {
  ate: string | null;
}

export const pausaVigente = (p: PausaLeve, agora: Date): boolean => p.ate === null || Date.parse(p.ate) > agora.getTime();

export const seloDaPausa = (p: PausaLeve, agora: Date, t: T): string =>
  p.ate === null ? t("Até retomar") : `${t("até")} ${textoDoFim(p.ate, agora, t)}`;
```

Create `lib/escale/conversas/assistente.ts`:

```ts
/**
 * O ASSISTENTE DA ESCALE NO COMPOSITOR (fork Escale, Fase 3B; C10; decisão 6
 * da seção 9: "Aura" é marca da Clint). O nome é provisório até o usuário
 * escolher; trocar é só aqui.
 */
export const NOME_DO_ASSISTENTE = "Assistente IA";

export const CHIPS_DO_ASSISTENTE = [
  { chave: "sugerir", rotulo: "Sugerir resposta", disponivel: true },
  { chave: "resumir", rotulo: "Resumir conversa", disponivel: false },
  { chave: "agendar", rotulo: "Agendar mensagem com texto da IA", disponivel: false },
  { chave: "campos", rotulo: "Preencher campos do CRM", disponivel: false },
] as const;
export type ChipDoAssistente = (typeof CHIPS_DO_ASSISTENTE)[number]["chave"];
```

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-conversa-aberta-regras.test.ts && corepack pnpm prettier --write lib/escale/conversas tests/unit/escale-conversa-aberta-regras.test.ts && corepack pnpm eslint lib/escale/conversas && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/escale/conversas tests/unit/escale-conversa-aberta-regras.test.ts docs/superpowers/plans/2026-10-18-fase-3b-conversa-aberta.md
git commit -m "feat(escale): regras puras da conversa aberta — eventos, espera, janela, agendadas, pausa (Fase 3B)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: Migration 9202 — mensagens agendadas, pausas de automação e eventos da conversa

**Files:**
- Create: `supabase/migrations/20261103120000_9202_mensagens_agendadas_pausas_eventos.sql`, `tests/invariants/escale-conversa-aberta-9202.test.ts`
- Modify: `supabase/baseline.sql` (bloco antes do 0323), `tests/invariants/rls-completude-varredura.test.ts` (três entradas), `lib/audit/actions.ts` (as oito ações)

- [ ] **Step 1: A migration**

```bash
bash scripts/checar-colisao-de-migration.sh escale-crm/main
```

Create `supabase/migrations/20261103120000_9202_mensagens_agendadas_pausas_eventos.sql`:

```sql
-- manifest: fork Escale · Fase 3B · mensagens agendadas, pausas de automação e eventos da conversa da casca
-- ---- FORK ESCALE · conversa aberta da casca (migration 9202) ----
--
-- Três tabelas do fork (PRD de Conversas, seção 7): as mensagens agendadas pelo
-- atendente (C9), a pausa de automação por conversa (D4) e os eventos que a
-- thread da Clint mostra (espera, encerrar, reabrir; C2). Nada muda nas tabelas
-- do original: a espera usa o snooze e a pausa usa bot_silenced_until.

-- 1. Mensagens agendadas -----------------------------------------------------
create table if not exists public.crm_mensagens_agendadas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel_session_id uuid not null references public.channel_sessions(id) on delete cascade,
  tipo text not null,
  corpo text,
  template jsonb,
  enviar_em timestamptz not null,
  criado_por uuid not null,
  status text not null default 'pendente',
  erro text,
  message_id uuid,
  enviada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_mensagens_agendadas_tipo_valido check (tipo in ('texto', 'template')),
  constraint crm_mensagens_agendadas_status_valido
    check (status in ('pendente', 'processando', 'enviada', 'falhou', 'removida')),
  constraint crm_mensagens_agendadas_conteudo
    check ((tipo = 'texto' and corpo is not null and char_length(corpo) between 1 and 4096 and template is null)
        or (tipo = 'template' and template is not null and jsonb_typeof(template) = 'object' and corpo is null)),
  constraint crm_mensagens_agendadas_pessoa_fk foreign key (criado_por, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
create index if not exists idx_crm_mensagens_agendadas_fila
  on public.crm_mensagens_agendadas (enviar_em) where status = 'pendente';
create index if not exists idx_crm_mensagens_agendadas_conversa
  on public.crm_mensagens_agendadas (organization_id, conversation_id) where status = 'pendente';
create index if not exists idx_crm_mensagens_agendadas_org
  on public.crm_mensagens_agendadas (organization_id, created_at desc);

alter table public.crm_mensagens_agendadas enable row level security;
drop policy if exists crm_mensagens_agendadas_select on public.crm_mensagens_agendadas;
drop policy if exists crm_mensagens_agendadas_insert on public.crm_mensagens_agendadas;
drop policy if exists crm_mensagens_agendadas_update on public.crm_mensagens_agendadas;
create policy crm_mensagens_agendadas_select on public.crm_mensagens_agendadas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent'))
  );
create policy crm_mensagens_agendadas_insert on public.crm_mensagens_agendadas
  for insert with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and criado_por = auth.uid()
    and status = 'pendente'
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.organization_id = crm_mensagens_agendadas.organization_id)
  );
-- Remover = status 'removida'. A sua, agente; qualquer uma, gerente ou acima. Só uma pendente sai.
create policy crm_mensagens_agendadas_update on public.crm_mensagens_agendadas
  for update using (
    (organization_id in (select public.fn_user_org_ids()))
    and status = 'pendente'
    and (criado_por = auth.uid() or public.fn_role_at_least(organization_id, 'manager'))
  ) with check (
    (organization_id in (select public.fn_user_org_ids()))
    and status = 'removida'
  );
revoke all on public.crm_mensagens_agendadas from anon;
grant select, insert, update on public.crm_mensagens_agendadas to authenticated;
grant all on public.crm_mensagens_agendadas to service_role;
drop trigger if exists trg_crm_mensagens_agendadas_updated_at on public.crm_mensagens_agendadas;
create trigger trg_crm_mensagens_agendadas_updated_at
  before update on public.crm_mensagens_agendadas
  for each row execute function public.fn_set_updated_at();
comment on table public.crm_mensagens_agendadas is
  'Mensagens agendadas pelo atendente (fork Escale, migration 9202; C9 do PRD de Conversas). O cron mensagens-agendadas envia na hora pelo sendMessageHandler, com o dispositivo de pé e, fora da janela, só template. Agente cria e remove a sua; gerente remove qualquer.';

-- 2. Pausas de automação ------------------------------------------------------
create table if not exists public.crm_pausas_de_automacao (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ate timestamptz,
  user_id uuid not null,
  enrollments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint crm_pausas_de_automacao_enrollments_lista check (jsonb_typeof(enrollments) = 'array'),
  constraint crm_pausas_de_automacao_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);
create index if not exists idx_crm_pausas_de_automacao_vencidas
  on public.crm_pausas_de_automacao (ate) where ate is not null;
alter table public.crm_pausas_de_automacao enable row level security;
drop policy if exists crm_pausas_de_automacao_select on public.crm_pausas_de_automacao;
drop policy if exists crm_pausas_de_automacao_write on public.crm_pausas_de_automacao;
create policy crm_pausas_de_automacao_select on public.crm_pausas_de_automacao
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent'))
  );
create policy crm_pausas_de_automacao_write on public.crm_pausas_de_automacao
  for all using (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
  ) with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and user_id = auth.uid()
  );
revoke all on public.crm_pausas_de_automacao from anon;
grant select, insert, update, delete on public.crm_pausas_de_automacao to authenticated;
grant all on public.crm_pausas_de_automacao to service_role;
comment on table public.crm_pausas_de_automacao is
  'A pausa de automação por conversa (fork Escale, migration 9202; D4): até quando (nulo = até retomar), quem pausou e os follow-ups pausados. O agente de IA é pausado por bot_silenced_until da própria conversa.';

-- 3. Eventos da conversa ------------------------------------------------------
create table if not exists public.crm_eventos_da_conversa (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  tipo text not null,
  user_id uuid,
  created_at timestamptz not null default now(),
  constraint crm_eventos_da_conversa_tipo_valido
    check (tipo in ('espera', 'espera_removida', 'encerrado', 'reaberto'))
);
create index if not exists idx_crm_eventos_da_conversa_conversa
  on public.crm_eventos_da_conversa (conversation_id, created_at);
alter table public.crm_eventos_da_conversa enable row level security;
drop policy if exists crm_eventos_da_conversa_select on public.crm_eventos_da_conversa;
drop policy if exists crm_eventos_da_conversa_insert on public.crm_eventos_da_conversa;
create policy crm_eventos_da_conversa_select on public.crm_eventos_da_conversa
  for select using (
    public.fn_is_platform_admin()
    or exists (select 1 from public.conversations c
                where c.id = conversation_id
                  and c.organization_id = crm_eventos_da_conversa.organization_id)
  );
create policy crm_eventos_da_conversa_insert on public.crm_eventos_da_conversa
  for insert with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'agent')
    and user_id = auth.uid()
  );
revoke all on public.crm_eventos_da_conversa from anon;
grant select, insert on public.crm_eventos_da_conversa to authenticated;
grant all on public.crm_eventos_da_conversa to service_role;
comment on table public.crm_eventos_da_conversa is
  'Os eventos que a thread da Clint mostra (fork Escale, migration 9202; C2): espera, espera removida, encerrado, reaberto. Quem vê a conversa (RLS de conversations) vê os eventos; o sistema (service role) grava a espera removida pela mensagem do cliente.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;
notify pgrst, 'reload schema';
```

- [ ] **Step 2: O baseline, a varredura e as ações**

Baseline: o bloco da migration sem a linha `-- manifest:`, logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (depois do bloco da 9201).

`tests/invariants/rls-completude-varredura.test.ts`, depois da entrada de `crm_preferencias_de_conversas`:

```ts
  {
    tabela: "crm_mensagens_agendadas",
    razao:
      "tests/invariants/escale-conversa-aberta-9202.test.ts — fork Escale (migration 9202): agente+ da organização lê; " +
      "agente cria a sua (criado_por = auth.uid(), pendente); remover é a sua (agente) ou qualquer (gerente+), só de pendente " +
      "para removida; vizinho vê zero; CHECKs de tipo/status/conteúdo.",
  },
  {
    tabela: "crm_pausas_de_automacao",
    razao:
      "tests/invariants/escale-conversa-aberta-9202.test.ts — fork Escale (migration 9202): agente+ lê e escreve as da organização " +
      "(user_id = auth.uid() na escrita); vizinho zero; uma por conversa.",
  },
  {
    tabela: "crm_eventos_da_conversa",
    razao:
      "tests/invariants/escale-conversa-aberta-9202.test.ts — fork Escale (migration 9202): lê quem vê a conversa (RLS de conversations); " +
      "agente grava com o próprio user_id; vizinho zero; tipo fechado.",
  },
```

`lib/audit/actions.ts`, depois de `"conversation_prefs.updated",`:

```ts
  // FORK ESCALE · Fase 3B: a conversa aberta da casca (migration 9202).
  "conversation.waiting_set",
  "conversation.waiting_cleared",
  "conversation.marked_unread",
  "conversation.automation_paused",
  "conversation.automation_resumed",
  "conversation_message.scheduled",
  "conversation_message.unscheduled",
  "conversation_message.schedule_sent",
```

- [ ] **Step 3: A prova de RLS (roda no fim da Frente C)**

Create `tests/invariants/escale-conversa-aberta-9202.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_CONTACT_1,
  GOV_CONV_UNASSIGNED,
  GOV_MANAGER,
  GOV_ORG,
  GOV_SESSION,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  tableExists,
  writeCountAs,
} from "./gov-helpers";

/**
 * MIGRATION 9202 (fork Escale, Fase 3B) — prova contra Postgres real das três
 * tabelas: mensagens agendadas, pausas de automação e eventos da conversa.
 * Roda via `pnpm test:db` no fim da Frente C.
 */
const AG = "public.crm_mensagens_agendadas";
const PA = "public.crm_pausas_de_automacao";
const EV = "public.crm_eventos_da_conversa";
const VIZINHO = "e5ca1e00-9202-4000-8000-0000000000b2";
const OUTRA_ORG = "e5ca1e00-9202-4000-8000-0000000000b1";
const agendar = (quem: string, tipo = "texto") =>
  `insert into ${AG} (organization_id, conversation_id, contact_id, channel_session_id, tipo, corpo, enviar_em, criado_por)
   values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', '${GOV_CONTACT_1}', '${GOV_SESSION}', '${tipo}', 'Boa tarde', now() + interval '1 hour', '${quem}')`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from ${AG} where organization_id = '${GOV_ORG}';
    delete from ${PA} where organization_id = '${GOV_ORG}';
    delete from ${EV} where organization_id = '${GOV_ORG}';
    insert into auth.users (id, email) values ('${VIZINHO}', '9202-vizinho@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${OUTRA_ORG}', '9202-vizinha', '9202 Vizinha', 'Vizinha') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${VIZINHO}', '${OUTRA_ORG}', 'admin', now()) on conflict do nothing;
  `);
});

describe("crm_mensagens_agendadas", () => {
  it("existe com RLS; o agente agenda a sua e todo agente+ da organização vê; o vizinho vê zero", () => {
    expect(tableExists("crm_mensagens_agendadas")).toBe(true);
    expect(writeCountAs(GOV_AGENT_A, agendar(GOV_AGENT_A))).toBe(1);
    expect(countAs(GOV_AGENT_B, `select count(*) from ${AG}`)).toBe(1);
    expect(countAs(GOV_MANAGER, `select count(*) from ${AG}`)).toBe(1);
    expect(countAs(VIZINHO, `select count(*) from ${AG}`)).toBe(0);
    expect(() => writeCountAs(GOV_AGENT_B, agendar(GOV_AGENT_A))).toThrow();
    expect(() => writeCountAs(GOV_VIEWER, agendar(GOV_VIEWER))).toThrow();
  });

  it("remover: o outro agente não; quem criou sim; o gerente sim; só pendente vira removida", () => {
    const id = sql(`select id from ${AG} where organization_id = '${GOV_ORG}' limit 1;`).trim();
    expect(writeCountAs(GOV_AGENT_B, `update ${AG} set status = 'removida' where id = '${id}'`)).toBe(0);
    expect(() => writeCountAs(GOV_AGENT_A, `update ${AG} set status = 'enviada' where id = '${id}'`)).toThrow();
    expect(writeCountAs(GOV_AGENT_A, `update ${AG} set status = 'removida' where id = '${id}'`)).toBe(1);
    expect(writeCountAs(GOV_AGENT_A, agendar(GOV_AGENT_A))).toBe(1);
    const id2 = sql(`select id from ${AG} where organization_id = '${GOV_ORG}' and status = 'pendente' limit 1;`).trim();
    expect(writeCountAs(GOV_MANAGER, `update ${AG} set status = 'removida' where id = '${id2}'`)).toBe(1);
  });

  it("os CHECKs: tipo, status e conteúdo coerente", () => {
    expect(() => sql(agendar(GOV_AGENT_A, "audio") + ";")).toThrow(/tipo_valido/);
    expect(() =>
      sql(`insert into ${AG} (organization_id, conversation_id, contact_id, channel_session_id, tipo, corpo, template, enviar_em, criado_por)
           values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', '${GOV_CONTACT_1}', '${GOV_SESSION}', 'template', 'x', '{}', now(), '${GOV_AGENT_A}');`),
    ).toThrow(/conteudo/);
  });
});

describe("crm_pausas_de_automacao", () => {
  it("o agente pausa (user_id = ele), o outro agente vê e retoma (delete), o vizinho zero, uma por conversa", () => {
    expect(writeCountAs(GOV_AGENT_A, `insert into ${PA} (conversation_id, organization_id, ate, user_id) values ('${GOV_CONV_UNASSIGNED}', '${GOV_ORG}', null, '${GOV_AGENT_A}')`)).toBe(1);
    expect(() => writeCountAs(GOV_AGENT_B, `insert into ${PA} (conversation_id, organization_id, ate, user_id) values ('${GOV_CONV_UNASSIGNED}', '${GOV_ORG}', null, '${GOV_AGENT_B}')`)).toThrow(/pkey|duplicate/);
    expect(countAs(GOV_AGENT_B, `select count(*) from ${PA}`)).toBe(1);
    expect(countAs(VIZINHO, `select count(*) from ${PA}`)).toBe(0);
    expect(() => writeCountAs(GOV_AGENT_B, `insert into ${PA} (conversation_id, organization_id, ate, user_id) values ('${GOV_CONV_UNASSIGNED}', '${GOV_ORG}', null, '${GOV_AGENT_A}')`)).toThrow();
    expect(writeCountAs(GOV_AGENT_B, `delete from ${PA} where conversation_id = '${GOV_CONV_UNASSIGNED}'`)).toBe(1);
  });
});

describe("crm_eventos_da_conversa", () => {
  it("o agente grava com o próprio id; quem vê a conversa vê o evento; o vizinho zero; tipo fechado", () => {
    expect(writeCountAs(GOV_AGENT_A, `insert into ${EV} (organization_id, conversation_id, tipo, user_id) values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', 'espera', '${GOV_AGENT_A}')`)).toBe(1);
    expect(() => writeCountAs(GOV_AGENT_A, `insert into ${EV} (organization_id, conversation_id, tipo, user_id) values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', 'espera', '${GOV_AGENT_B}')`)).toThrow();
    expect(() => sql(`insert into ${EV} (organization_id, conversation_id, tipo, user_id) values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', 'inventado', null);`)).toThrow(/tipo_valido/);
    expect(countAs(GOV_AGENT_B, `select count(*) from ${EV}`)).toBe(1);
    expect(countAs(VIZINHO, `select count(*) from ${EV}`)).toBe(0);
    // O sistema (service role) grava a espera removida sem pessoa.
    sql(`insert into ${EV} (organization_id, conversation_id, tipo, user_id) values ('${GOV_ORG}', '${GOV_CONV_UNASSIGNED}', 'espera_removida', null);`);
    expect(countAs(GOV_AGENT_A, `select count(*) from ${EV} where tipo = 'espera_removida'`)).toBe(1);
  });
});
```

Confira em `tests/invariants/gov-helpers.ts` que `GOV_SESSION` é um `channel_sessions.id` da `GOV_ORG` e que `GOV_CONV_UNASSIGNED` aponta para `GOV_CONTACT_1`; se não, use os ids que o `seedGov` cria.

- [ ] **Step 4: Rodar as cercas estáticas e commitar**

Run: `corepack pnpm vitest run tests/unit/manifest-x-migrations.test.ts $(ls tests/unit | grep -i baseline | sed 's|^|tests/unit/|' | tr '\n' ' ') && corepack pnpm prettier --write tests/invariants/escale-conversa-aberta-9202.test.ts && corepack pnpm eslint tests/invariants/escale-conversa-aberta-9202.test.ts lib/audit/actions.ts`
Expected: PASS.

```bash
git add supabase/migrations/20261103120000_9202_mensagens_agendadas_pausas_eventos.sql supabase/baseline.sql lib/audit/actions.ts tests/invariants/escale-conversa-aberta-9202.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "feat(escale): migration 9202 — mensagens agendadas, pausas de automação e eventos da conversa (Fase 3B)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: As rotas da conversa (espera, encerrar, reabrir, não lida, eventos, pausa) e o encaixe do pós-entrada

**Files:**
- Create: `app/api/v1/conversas-da-casca/[id]/_comum.ts`, `app/api/v1/conversas-da-casca/[id]/espera/route.ts`, `encerrar/route.ts`, `reabrir/route.ts`, `nao-lida/route.ts`, `eventos/route.ts`, `pausa/route.ts`, `app/api/v1/cron/pausas-de-automacao/route.ts`, `tests/unit/escale-conversa-aberta-rotas.test.ts`
- Modify: `lib/channels/pos-entrada.ts`, `docker/scheduler/entrypoint.sh` (as duas linhas; a do cron de agendadas entra já, a rota nasce na Task 4)

**Interfaces (Produces):**
- `_comum.ts`: `lerConversaVisivel(supabase, orgId, id)` → a linha (`id, organization_id, status, service_revision, assigned_to_user_id, snooze_until, metadata, bot_silenced_until, contact_id`) ou `null`; `gravarEvento(supabase, orgId, conversationId, tipo, userId)`; `respostaDaConversa(authz, id, fn)` (o esqueleto comum: `requireSupportWrite`, `requireRole("agent")`, 404, `t`).
- `POST /espera` → `{ data: { snooze_until } }`; `DELETE /espera` → 204. `POST /encerrar` (body `{ expected_revision? }`) → `{ data: Conversation }`; `POST /reabrir` → `{ data: Conversation }`. `POST /nao-lida` → `{ data: { unread_count_for_assignee: 1 } }`. `GET /eventos` → `{ data: EventoDaConversa[] }`. `GET /pausa` → `{ data: { pausa: { ate, user_id, created_at } | null, agenteAtivo: boolean, followups: { ativos: number, proximoEm: string | null } } }`; `POST /pausa` (`{ ate: iso | null }`) → `{ data: { pausa } }`; `DELETE /pausa` → 204.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-conversa-aberta-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as ENCERRAR } from "@/app/api/v1/conversas-da-casca/[id]/encerrar/route";
import { DELETE as SAIR_DA_ESPERA, POST as ESPERA } from "@/app/api/v1/conversas-da-casca/[id]/espera/route";
import { GET as EVENTOS } from "@/app/api/v1/conversas-da-casca/[id]/eventos/route";
import { POST as NAO_LIDA } from "@/app/api/v1/conversas-da-casca/[id]/nao-lida/route";
import { DELETE as RETOMAR, GET as PAUSA, POST as PAUSAR } from "@/app/api/v1/conversas-da-casca/[id]/pausa/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { ESPERA_SEM_FIM } from "@/lib/escale/conversas/espera";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
vi.mock("@/lib/followup/intervencao", () => ({
  pausaEnrollment: vi.fn(async () => ({ ok: true })),
  retomaEnrollment: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/app/api/v1/conversations/_handler", () => ({
  patchConversationHandler: vi.fn(async (_s: unknown, _c: unknown, id: string) => ({ id, status: "open" })),
}));

const CV = "c0000000-0000-4000-8000-000000000001";
type Linha = Record<string, unknown>;

/** Um Supabase de mentira por tabela: `linhas` responde às leituras; as escritas ficam em `escritas`. */
function banco(tabelas: Record<string, Linha[]>, rpc: Linha = { data: { id: CV, status: "closed" }, error: null }) {
  const escritas: Array<{ tabela: string; op: string; valores?: Linha }> = [];
  const from = vi.fn((tabela: string) => {
    const dados = tabelas[tabela] ?? [];
    const cadeia: Record<string, unknown> = {};
    let pendente: { op: string; valores?: Linha } | null = null;
    for (const m of ["select", "eq", "neq", "in", "is", "order", "limit", "not", "gt", "lte"]) cadeia[m] = vi.fn(() => cadeia);
    cadeia.update = vi.fn((valores: Linha) => { pendente = { op: "update", valores }; return cadeia; });
    cadeia.insert = vi.fn((valores: Linha) => { pendente = { op: "insert", valores }; return cadeia; });
    cadeia.upsert = vi.fn((valores: Linha) => { pendente = { op: "upsert", valores }; return cadeia; });
    cadeia.delete = vi.fn(() => { pendente = { op: "delete" }; return cadeia; });
    const fechar = () => { if (pendente) escritas.push({ tabela, ...pendente }); pendente = null; };
    cadeia.maybeSingle = vi.fn(async () => { fechar(); return { data: dados[0] ?? null, error: null }; });
    cadeia.single = vi.fn(async () => { fechar(); return { data: dados[0] ?? null, error: null }; });
    cadeia.then = (ok: (r: { data: Linha[]; error: null }) => unknown) => { fechar(); return Promise.resolve({ data: dados, error: null }).then(ok); };
    return cadeia;
  });
  const db = { from, rpc: vi.fn(async () => rpc) };
  vi.mocked(createClient).mockResolvedValue(db as never);
  vi.mocked(createAdminClient).mockReturnValue(db as never);
  return { escritas, db };
}
const conversa = (extra: Linha = {}): Linha => ({
  id: CV, organization_id: ORG_ID, status: "open", service_revision: 3, assigned_to_user_id: USER_ID,
  snooze_until: null, metadata: {}, bot_silenced_until: null, contact_id: "ct1", ...extra,
});
const req = (metodo: string, corpo?: unknown) =>
  new NextRequest(`http://x/api/v1/conversas-da-casca/${CV}/x`, { method: metodo, ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}) } as never);
const ctx = { params: Promise.resolve({ id: CV }) };
const corpo = async (r: Response) => ((await r.json()) as { data: unknown }).data;

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk("manager");
});

describe("espera (C2, decisão 2)", () => {
  it("POST grava o snooze sem fim, a marca e o evento; DELETE limpa e grava o evento; 404 fora da visão", async () => {
    const { escritas } = banco({ conversations: [conversa()] });
    expect((await ESPERA(req("POST"), ctx)).status).toBe(200);
    const update = escritas.find((e) => e.tabela === "conversations" && e.op === "update")!;
    expect(update.valores).toMatchObject({ snooze_until: ESPERA_SEM_FIM, snoozed_by_user_id: USER_ID, metadata: { escale_em_espera: true } });
    expect(escritas.find((e) => e.tabela === "crm_eventos_da_conversa")!.valores).toMatchObject({ tipo: "espera", user_id: USER_ID });
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({ action: "conversation.waiting_set" });
    const b2 = banco({ conversations: [conversa({ snooze_until: ESPERA_SEM_FIM, metadata: { escale_em_espera: true, x: 1 } })] });
    expect((await SAIR_DA_ESPERA(req("DELETE"), ctx)).status).toBe(204);
    expect(b2.escritas.find((e) => e.tabela === "conversations")!.valores).toEqual({ snooze_until: null, snoozed_at: null, snoozed_by_user_id: null, metadata: { x: 1 } });
    banco({ conversations: [] });
    expect((await ESPERA(req("POST"), ctx)).status).toBe(404);
  });
});

describe("encerrar e reabrir", () => {
  it("encerrar chama fn_service_status com a revisão lida e grava o evento; reabrir usa o handler do original", async () => {
    const { escritas, db } = banco({ conversations: [conversa()] });
    const r = await ENCERRAR(req("POST", {}), ctx);
    expect(r.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_service_status", expect.objectContaining({ p_conversation: CV, p_status: "closed", p_expected: 3 }));
    expect(escritas.find((e) => e.tabela === "crm_eventos_da_conversa")!.valores).toMatchObject({ tipo: "encerrado" });
    const { POST: REABRIR } = await import("@/app/api/v1/conversas-da-casca/[id]/reabrir/route");
    const b2 = banco({ conversations: [conversa({ status: "closed" })] });
    expect((await REABRIR(req("POST", {}), ctx)).status).toBe(200);
    expect(b2.escritas.find((e) => e.tabela === "crm_eventos_da_conversa")!.valores).toMatchObject({ tipo: "reaberto" });
  });
});

describe("não lida e eventos", () => {
  it("não lida põe 1 pela sessão e audita; eventos junta atribuições e eventos do fork", async () => {
    const { escritas } = banco({ conversations: [conversa()] });
    expect((await NAO_LIDA(req("POST"), ctx)).status).toBe(200);
    expect(escritas.find((e) => e.tabela === "conversations")!.valores).toEqual({ unread_count_for_assignee: 1 });
    banco({
      conversations: [conversa()],
      conversation_assignment_events: [{ id: "a1", from_user_id: null, to_user_id: USER_ID, changed_by: USER_ID, reason: "claim", created_at: "2026-10-18T10:00:00Z" }],
      crm_eventos_da_conversa: [{ id: "e1", tipo: "espera", user_id: USER_ID, created_at: "2026-10-18T11:00:00Z" }],
    });
    const data = (await corpo(await EVENTOS(req("GET"), ctx))) as Array<{ tipo: string; em: string }>;
    expect(data.map((e) => e.tipo)).toEqual(["atendente", "espera"]);
  });
});

describe("pausa (D4)", () => {
  it("GET descreve; POST grava a pausa, o bot_silenced_until e pausa os follow-ups; DELETE retoma", async () => {
    const { escritas } = banco({
      conversations: [conversa({ bot_silenced_until: null })],
      crm_pausas_de_automacao: [],
      followup_enrollments: [{ id: "f1", status: "active", next_eval_at: "2026-10-19T10:00:00Z" }],
    });
    const estado = (await corpo(await PAUSA(req("GET"), ctx))) as { pausa: unknown; followups: { ativos: number } };
    expect(estado.pausa).toBeNull();
    expect(estado.followups.ativos).toBe(1);
    expect((await PAUSAR(req("POST", { ate: "2026-10-18T23:26:00.000Z" }), ctx)).status).toBe(200);
    expect(escritas.find((e) => e.tabela === "conversations")!.valores).toEqual({ bot_silenced_until: "2026-10-18T23:26:00.000Z" });
    expect(escritas.find((e) => e.tabela === "crm_pausas_de_automacao")!.valores).toMatchObject({ ate: "2026-10-18T23:26:00.000Z", user_id: USER_ID, enrollments: ["f1"] });
    expect((await PAUSAR(req("POST", { ate: "2020-01-01T00:00:00Z" }), ctx)).status).toBe(422);
    const b2 = banco({ conversations: [conversa({ bot_silenced_until: "infinity" })], crm_pausas_de_automacao: [{ conversation_id: CV, ate: null, user_id: USER_ID, enrollments: ["f1"], created_at: "2026-10-18T10:00:00Z" }] });
    expect((await RETOMAR(req("DELETE"), ctx)).status).toBe(204);
    expect(b2.escritas.find((e) => e.tabela === "conversations")!.valores).toEqual({ bot_silenced_until: null });
    expect(b2.escritas.find((e) => e.tabela === "crm_pausas_de_automacao" && e.op === "delete")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-conversa-aberta-rotas.test.ts`
Expected: FAIL.

- [ ] **Step 3: O comum e as rotas de espera, encerrar, reabrir, não lida e eventos**

Create `app/api/v1/conversas-da-casca/[id]/_comum.ts`:

```ts
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fail } from "@/lib/api/wrappers";
import { requireRole, type RoleCheck } from "@/lib/auth/require-role";
import type { TipoDeEvento } from "@/lib/escale/conversas/eventos";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export interface ConversaVisivel {
  id: string;
  organization_id: string;
  status: string;
  service_revision: number;
  assigned_to_user_id: string | null;
  snooze_until: string | null;
  metadata: Record<string, unknown> | null;
  bot_silenced_until: string | null;
  contact_id: string | null;
  last_inbound_at: string | null;
}

export const COLUNAS_DA_CONVERSA =
  "id, organization_id, status, service_revision, assigned_to_user_id, snooze_until, metadata, bot_silenced_until, contact_id, last_inbound_at";

/** Pela SESSÃO: a policy `conversations_select` (visibility_mode) decide o que a pessoa vê. */
export async function lerConversaVisivel(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
): Promise<ConversaVisivel | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select(COLUNAS_DA_CONVERSA)
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ConversaVisivel | null) ?? null;
}

export async function gravarEvento(
  supabase: SupabaseClient,
  orgId: string,
  conversationId: string,
  tipo: Exclude<TipoDeEvento, "atendente">,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("crm_eventos_da_conversa")
    .insert({ organization_id: orgId, conversation_id: conversationId, tipo, user_id: userId });
  if (error) throw error;
}

type Ok = Extract<RoleCheck, { ok: true }>;

/**
 * O esqueleto de toda rota da conversa na casca: só escrita de verdade
 * (`requireSupportWrite`), agente ou acima, id válido, a conversa visível pela
 * sessão (404 se não), e o `t` do idioma de quem pede.
 */
export async function comAConversa(
  params: Promise<{ id: string }>,
  escreve: boolean,
  corpo: (e: {
    authz: Ok;
    supabase: SupabaseClient;
    conversa: ConversaVisivel;
    requestId: string;
    t: (texto: string) => string;
  }) => Promise<Response>,
): Promise<Response> {
  const requestId = randomUUID();
  if (escreve) {
    const supportDenied = await requireSupportWrite();
    if (supportDenied) return supportDenied;
  }
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const id = lerUuid((await params).id);
  if (!id) return fail("not_found", t("Conversa não encontrada."), 404, { requestId });
  const supabase = await createClient();
  try {
    const conversa = await lerConversaVisivel(supabase, authz.org.orgId, id);
    if (!conversa) return fail("not_found", t("Conversa não encontrada."), 404, { requestId });
    return await corpo({ authz, supabase, conversa, requestId, t });
  } catch (err) {
    const e = err as { message?: string };
    return fail("internal_error", e.message ?? "erro", 500, { requestId });
  }
}
```

Create `app/api/v1/conversas-da-casca/[id]/espera/route.ts`:

```ts
import { type NextRequest } from "next/server";

import { noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { camposParaEntrarEmEspera, camposParaSairDaEspera } from "@/lib/escale/conversas/espera";

import { comAConversa, gravarEvento } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** "Colocar em espera" (C2; decisão 2): o snooze do original sem fim, com a marca "sem lembrete". */
export async function POST(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId }) => {
    const campos = camposParaEntrarEmEspera(authz.user.id, new Date(), conversa.metadata);
    const { error } = await supabase
      .from("conversations")
      .update(campos)
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversa.id);
    if (error) throw error;
    await gravarEvento(supabase, authz.org.orgId, conversa.id, "espera", authz.user.id);
    void audit({ action: "conversation.waiting_set", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "conversation", resourceId: conversa.id, requestId });
    return ok({ snooze_until: campos.snooze_until }, { requestId });
  });
}

/** "Remover espera". */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId }) => {
    const { error } = await supabase
      .from("conversations")
      .update(camposParaSairDaEspera(conversa.metadata))
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversa.id);
    if (error) throw error;
    await gravarEvento(supabase, authz.org.orgId, conversa.id, "espera_removida", authz.user.id);
    void audit({ action: "conversation.waiting_cleared", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "conversation", resourceId: conversa.id, requestId });
    return noContent(requestId);
  });
}
```

Create `app/api/v1/conversas-da-casca/[id]/encerrar/route.ts`:

```ts
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { lerJson } from "@/lib/escale/origens/respostas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Conversation } from "@/lib/types/messaging";

import { comAConversa, gravarEvento } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const corpoSchema = z.object({ expected_revision: z.number().int().positive().optional() });

/**
 * "Encerrar atendimento" (C2): o mesmo passo de `conversations/[id]/close`
 * (`fn_service_status` com a revisão, pelo service role depois da leitura
 * pela sessão) mais o evento que a thread da Clint mostra.
 */
export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId, t }) => {
    const lido = await lerJson(req);
    const parsed = corpoSchema.safeParse(lido.ok ? lido.json : {});
    if (!parsed.success) return fail("validation_failed", t("Revisão inválida."), 422, { requestId });
    const { data, error } = await createAdminClient().rpc("fn_service_status", {
      p_org: conversa.organization_id,
      p_conversation: conversa.id,
      p_status: "closed",
      p_expected: parsed.data.expected_revision ?? conversa.service_revision,
    });
    const conflito = error?.code === "PT409" || error?.code === "40001";
    if (error) {
      return fail(conflito ? "conflict" : "internal_error", conflito ? t("O atendimento mudou. Atualize e tente novamente.") : error.message, conflito ? 409 : 500, { requestId });
    }
    await gravarEvento(supabase, authz.org.orgId, conversa.id, "encerrado", authz.user.id);
    void audit({ action: "conversation.closed", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "conversation", resourceId: conversa.id, requestId });
    return ok(data as unknown as Conversation, { requestId });
  });
}
```

Create `app/api/v1/conversas-da-casca/[id]/reabrir/route.ts`:

```ts
import { type NextRequest } from "next/server";

import { patchConversationHandler } from "@/app/api/v1/conversations/_handler";
import { ApiError } from "@/lib/api/types";
import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";

import { comAConversa, gravarEvento } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** "Reabrir atendimento" (C2): o `PATCH status=open` do original, mais o evento. */
export async function POST(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId }) => {
    try {
      const reaberta = await patchConversationHandler(
        supabase,
        { organization_id: authz.org.orgId, actor: { type: "user", id: authz.user.id, role: authz.org.role }, requestId, idioma: authz.user.idioma },
        conversa.id,
        { status: "open" },
      );
      await gravarEvento(supabase, authz.org.orgId, conversa.id, "reaberto", authz.user.id);
      void audit({ action: "conversation.reopened", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "conversation", resourceId: conversa.id, requestId });
      return ok(reaberta, { requestId });
    } catch (err) {
      if (err instanceof ApiError) return fail(err.code, err.message, err.status, { requestId });
      throw err;
    }
  });
}
```

Se `"conversation.reopened"` não existir em `lib/audit/actions.ts`, use `"conversation.updated"` (confira a lista) ou acrescente `"conversation.reopened"` ao bloco da 3B.

Create `app/api/v1/conversas-da-casca/[id]/nao-lida/route.ts`:

```ts
import { type NextRequest } from "next/server";

import { ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";

import { comAConversa } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** "Marcar como não lida" (C1): a bolha volta à linha. Pela sessão (policy de update do agente). */
export async function POST(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId }) => {
    const { error } = await supabase
      .from("conversations")
      .update({ unread_count_for_assignee: 1 })
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversa.id);
    if (error) throw error;
    void audit({ action: "conversation.marked_unread", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "conversation", resourceId: conversa.id, requestId });
    return ok({ unread_count_for_assignee: 1 }, { requestId });
  });
}
```

Create `app/api/v1/conversas-da-casca/[id]/eventos/route.ts`:

```ts
import { type NextRequest } from "next/server";

import { ok } from "@/lib/api/wrappers";
import { eventosDasAtribuicoes, type EventoDaConversa, type LinhaDaAtribuicao } from "@/lib/escale/conversas/eventos";

import { comAConversa } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const EVENTOS_MAX = 200;

/** Os eventos da thread (C2, C4): as atribuições do original e os eventos do fork, pela sessão. */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, false, async ({ authz, supabase, conversa, requestId }) => {
    const [atribuicoes, proprios] = await Promise.all([
      supabase
        .from("conversation_assignment_events")
        .select("id, from_user_id, to_user_id, changed_by, reason, created_at")
        .eq("organization_id", authz.org.orgId)
        .eq("conversation_id", conversa.id)
        .order("created_at", { ascending: true })
        .limit(EVENTOS_MAX),
      supabase
        .from("crm_eventos_da_conversa")
        .select("id, tipo, user_id, created_at")
        .eq("organization_id", authz.org.orgId)
        .eq("conversation_id", conversa.id)
        .order("created_at", { ascending: true })
        .limit(EVENTOS_MAX),
    ]);
    if (atribuicoes.error) throw atribuicoes.error;
    if (proprios.error) throw proprios.error;
    const eventos: EventoDaConversa[] = [
      ...eventosDasAtribuicoes((atribuicoes.data ?? []) as LinhaDaAtribuicao[]),
      ...((proprios.data ?? []) as Array<{ id: string; tipo: EventoDaConversa["tipo"]; user_id: string | null; created_at: string }>).map((e) => ({
        id: e.id,
        tipo: e.tipo,
        em: e.created_at,
        user_id: e.user_id,
      })),
    ].sort((a, b) => Date.parse(a.em) - Date.parse(b.em));
    return ok(eventos, { requestId });
  });
}
```

- [ ] **Step 4: A pausa e o cron das pausas**

Create `app/api/v1/conversas-da-casca/[id]/pausa/route.ts`:

```ts
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { lerJson } from "@/lib/escale/origens/respostas";
import { pausaEnrollment, retomaEnrollment } from "@/lib/followup/intervencao";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

import { comAConversa } from "../_comum";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const corpoSchema = z.object({ ate: z.string().datetime().nullable() });
const SILENCIO_DURAVEL = "infinity";
const ATIVOS = ["active", "waiting_reply"] as const;

interface PausaLida {
  conversation_id: string;
  ate: string | null;
  user_id: string;
  enrollments: string[];
  created_at: string;
}
interface EnrollmentLido {
  id: string;
  status: string;
  next_eval_at: string | null;
}

async function enrollmentsAtivos(supabase: Parameters<typeof pausaEnrollment>[0]["supabase"], orgId: string, conversationId: string): Promise<EnrollmentLido[]> {
  const { data, error } = await supabase
    .from("followup_enrollments")
    .select("id, status, next_eval_at")
    .eq("organization_id", orgId)
    .eq("conversation_id", conversationId)
    .in("status", [...ATIVOS]);
  if (error) throw error;
  return (data ?? []) as EnrollmentLido[];
}

/** O estado do cartão "Pausar automação" (D4): a pausa, se o agente está de pé, os follow-ups. */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, false, async ({ authz, supabase, conversa, requestId }) => {
    const { data: pausa } = await supabase
      .from("crm_pausas_de_automacao")
      .select("conversation_id, ate, user_id, enrollments, created_at")
      .eq("conversation_id", conversa.id)
      .maybeSingle();
    const ativos = await enrollmentsAtivos(supabase, authz.org.orgId, conversa.id);
    const proximoEm = ativos.map((e) => e.next_eval_at).filter((x): x is string => !!x).sort()[0] ?? null;
    const silenciado = conversa.bot_silenced_until !== null && (conversa.bot_silenced_until === SILENCIO_DURAVEL || Date.parse(conversa.bot_silenced_until) > Date.now());
    return ok(
      { pausa: (pausa as PausaLida | null) ?? null, agenteAtivo: !silenciado, followups: { ativos: ativos.length, proximoEm } },
      { requestId },
    );
  });
}

/** "Pausar" (todas por um prazo, até retomar, ou data e hora). */
export async function POST(req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId, t }) => {
    const lido = await lerJson(req);
    const parsed = corpoSchema.safeParse(lido.ok ? lido.json : null);
    if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
    const ate = parsed.data.ate;
    if (ate && Date.parse(ate) <= Date.now()) {
      return fail("validation_failed", t("Não é possível agendar para uma data/hora no passado"), 422, { requestId });
    }
    const { error } = await supabase
      .from("conversations")
      .update({ bot_silenced_until: ate ?? SILENCIO_DURAVEL })
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversa.id);
    if (error) throw error;

    const ativos = await enrollmentsAtivos(supabase, authz.org.orgId, conversa.id);
    const deps = { supabase, admin: createAdminClient(), orgId: authz.org.orgId, userId: authz.user.id, requestId };
    const pausados: string[] = [];
    for (const e of ativos) {
      const r = await pausaEnrollment(deps, e.id);
      if (r.ok) pausados.push(e.id);
      else logger.warn("escale/pausa: follow-up não pausado", { enrollment: e.id, conversation_id: conversa.id });
    }
    const pausa = { conversation_id: conversa.id, organization_id: authz.org.orgId, ate, user_id: authz.user.id, enrollments: pausados };
    const { error: erroDaPausa } = await supabase.from("crm_pausas_de_automacao").upsert(pausa, { onConflict: "conversation_id" });
    if (erroDaPausa) throw erroDaPausa;
    void audit({ action: "conversation.automation_paused", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "conversation", resourceId: conversa.id, requestId, metadata: { ate, followups: pausados.length } });
    return ok({ pausa }, { requestId });
  });
}

/** "Retomar". */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  return comAConversa(ctx.params, true, async ({ authz, supabase, conversa, requestId }) => {
    const { data } = await supabase
      .from("crm_pausas_de_automacao")
      .select("conversation_id, ate, user_id, enrollments, created_at")
      .eq("conversation_id", conversa.id)
      .maybeSingle();
    const pausa = data as PausaLida | null;
    const { error } = await supabase
      .from("conversations")
      .update({ bot_silenced_until: null })
      .eq("organization_id", authz.org.orgId)
      .eq("id", conversa.id);
    if (error) throw error;
    const deps = { supabase, admin: createAdminClient(), orgId: authz.org.orgId, userId: authz.user.id, requestId };
    for (const id of pausa?.enrollments ?? []) {
      const r = await retomaEnrollment(deps, id);
      if (!r.ok) logger.warn("escale/pausa: follow-up não retomado", { enrollment: id, conversation_id: conversa.id });
    }
    await supabase.from("crm_pausas_de_automacao").delete().eq("conversation_id", conversa.id);
    void audit({ action: "conversation.automation_resumed", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "conversation", resourceId: conversa.id, requestId });
    return noContent(requestId);
  });
}
```

Create `app/api/v1/cron/pausas-de-automacao/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { autorizaCron } from "@/lib/auth/cron-auth";
import { retomaEnrollment } from "@/lib/followup/intervencao";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const LOTE = 100;

/**
 * FORK ESCALE · Fase 3B (D4): as pausas de automação com prazo vencido são
 * retomadas pelo sistema — `bot_silenced_until` já venceu sozinho (o motor
 * compara com now()); aqui só os follow-ups voltam e a linha da pausa sai.
 * Agendado no docker/scheduler/entrypoint.sh (a cada 5 min).
 */
async function handle(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  if (!autorizaCron(req)) return fail("forbidden", "Cron secret missing or invalid.", 403, { requestId });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_pausas_de_automacao")
    .select("conversation_id, organization_id, user_id, enrollments")
    .not("ate", "is", null)
    .lte("ate", new Date().toISOString())
    .limit(LOTE);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  let retomadas = 0;
  for (const p of (data ?? []) as Array<{ conversation_id: string; organization_id: string; user_id: string; enrollments: string[] }>) {
    const deps = { supabase: admin, admin, orgId: p.organization_id, userId: p.user_id, requestId };
    for (const id of p.enrollments ?? []) {
      const r = await retomaEnrollment(deps, id);
      if (!r.ok) logger.warn("cron pausas: follow-up não retomado", { enrollment: id, conversation_id: p.conversation_id });
    }
    await admin.from("crm_pausas_de_automacao").delete().eq("conversation_id", p.conversation_id);
    retomadas++;
  }
  return ok({ retomadas }, { requestId });
}

export async function GET(req: NextRequest): Promise<Response> {
  return handle(req);
}
export async function POST(req: NextRequest): Promise<Response> {
  return handle(req);
}
```

Confira em `app/api/v1/cron/snooze-watcher/route.ts` se o cron expõe `GET` e `POST` do mesmo jeito e copie a forma.

- [ ] **Step 5: O encaixe do pós-entrada e o crontab**

Em `lib/channels/pos-entrada.ts`, dentro de `aplicarEfeitosPosEntrada`, logo depois de `await abrirDemanda(admin, entrada);` (ou do último passo do caminho feliz, se o nome diferir):

```ts
  // FORK ESCALE · Fase 3B (C2, decisão 2): a mensagem nova do cliente tira a
  // conversa da espera da casca. Nunca derruba a entrada (a função engole o erro).
  await tirarDaEsperaDaCasca(admin, entrada.organizationId, entrada.conversationId);
```

com `import { tirarDaEsperaDaCasca } from "@/lib/escale/conversas/espera";` no topo.

Em `docker/scheduler/entrypoint.sh`, dentro de `CRONS="…"`, logo depois de `*/5 * * * *|25|api/v1/cron/snooze-watcher`:

```
* * * * *|30|api/v1/cron/mensagens-agendadas
*/5 * * * *|25|api/v1/cron/pausas-de-automacao
```

(A rota `mensagens-agendadas` nasce na Task 4; a cerca `cron-routes-scheduled` só fica verde no fim da Task 4 — rode-a lá.)

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-conversa-aberta-rotas.test.ts $(grep -rlF "pos-entrada" tests/unit lib/channels --include='*.test.ts' | tr '\n' ' ') && corepack pnpm prettier --write app/api/v1/conversas-da-casca app/api/v1/cron/pausas-de-automacao tests/unit/escale-conversa-aberta-rotas.test.ts && corepack pnpm eslint app/api/v1/conversas-da-casca app/api/v1/cron/pausas-de-automacao lib/channels/pos-entrada.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/v1/conversas-da-casca app/api/v1/cron/pausas-de-automacao lib/channels/pos-entrada.ts docker/scheduler/entrypoint.sh tests/unit/escale-conversa-aberta-rotas.test.ts
git commit -m "feat(escale): rotas da conversa na casca — espera, encerrar, reabrir, não lida, eventos, pausa (Fase 3B)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 4: Mensagens agendadas — as rotas (listar, criar, remover, contar) e o cron que envia

**Files:**
- Create: `app/api/v1/mensagens-agendadas/_comum.ts`, `app/api/v1/mensagens-agendadas/route.ts`, `app/api/v1/mensagens-agendadas/[id]/route.ts`, `app/api/v1/mensagens-agendadas/contagem/route.ts`, `app/api/v1/cron/mensagens-agendadas/route.ts`, `lib/escale/conversas/envio-agendado.ts`, `tests/unit/escale-mensagens-agendadas-rotas.test.ts`
- Modify: nada do original (as linhas do crontab já entraram na Task 3)

**Interfaces (Produces):**
- `GET /api/v1/mensagens-agendadas?…` (os campos de `listaDeAgendadasSchema`) → `{ data: AgendadaLida[], meta: { total, pagina, por_pagina } }`. Só `status = 'pendente'` (a tela da Clint lista o que ainda vai sair); `falhou` entra quando `?status=falhou`.
- `POST /api/v1/mensagens-agendadas` (body `NovaAgendada`) → `{ data: { ids: string[] } }` (uma linha por mensagem; a data passada → 422 "Não é possível agendar para uma data/hora no passado").
- `DELETE /api/v1/mensagens-agendadas/[id]` → 204 (`status = 'removida'`, pela sessão; a RLS decide quem pode).
- `GET /api/v1/mensagens-agendadas/contagem?conversation_ids=a,b,c` (até 60) → `{ data: Record<string, number> }` (só pendentes).
- `lib/escale/conversas/envio-agendado.ts`: `enviarAgendada(admin, linha: LinhaParaEnviar, agora: Date, requestId: string)` → `{ status: "enviada", message_id } | { status: "falhou", erro }` (o passo do cron, testável sem HTTP).
- `GET|POST /api/v1/cron/mensagens-agendadas` → `{ data: { enviadas, falhas } }`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-mensagens-agendadas-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as REMOVER } from "@/app/api/v1/mensagens-agendadas/[id]/route";
import { GET as CONTAGEM } from "@/app/api/v1/mensagens-agendadas/contagem/route";
import { GET as LISTAR, POST as CRIAR } from "@/app/api/v1/mensagens-agendadas/route";
import { sendMessageHandler } from "@/app/api/v1/messages/_handler";
import { audit } from "@/lib/audit";
import { enviarAgendada } from "@/lib/escale/conversas/envio-agendado";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
vi.mock("@/app/api/v1/messages/_handler", () => ({ sendMessageHandler: vi.fn(async () => ({ id: "m1" })) }));

const CV = "c0000000-0000-4000-8000-000000000001";
const CT = "c0000000-0000-4000-8000-000000000002";
const CS = "c0000000-0000-4000-8000-000000000003";
type Linha = Record<string, unknown>;

/** O mesmo Supabase de mentira da Task 3 (copie `banco` de tests/unit/escale-conversa-aberta-rotas.test.ts se preferir importar). */
function banco(tabelas: Record<string, Linha[]>, contagem = 0) {
  const escritas: Array<{ tabela: string; op: string; valores?: unknown }> = [];
  const from = vi.fn((tabela: string) => {
    const dados = tabelas[tabela] ?? [];
    const cadeia: Record<string, unknown> = {};
    let pendente: { op: string; valores?: unknown } | null = null;
    for (const m of ["select", "eq", "neq", "in", "is", "order", "limit", "not", "gt", "gte", "lte", "lt", "or", "ilike", "range"]) cadeia[m] = vi.fn(() => cadeia);
    cadeia.update = vi.fn((valores: unknown) => { pendente = { op: "update", valores }; return cadeia; });
    cadeia.insert = vi.fn((valores: unknown) => { pendente = { op: "insert", valores }; return cadeia; });
    const fechar = () => { if (pendente) escritas.push({ tabela, ...pendente }); pendente = null; };
    cadeia.maybeSingle = vi.fn(async () => { fechar(); return { data: dados[0] ?? null, error: null }; });
    cadeia.single = vi.fn(async () => { fechar(); return { data: dados[0] ?? null, error: null }; });
    cadeia.then = (ok: (r: { data: Linha[]; error: null; count: number }) => unknown) => { fechar(); return Promise.resolve({ data: dados, error: null, count: contagem || dados.length }).then(ok); };
    return cadeia;
  });
  const db = { from };
  vi.mocked(createClient).mockResolvedValue(db as never);
  vi.mocked(createAdminClient).mockReturnValue(db as never);
  return { escritas, db };
}
const req = (metodo: string, url = "http://x/api/v1/mensagens-agendadas", corpo?: unknown) =>
  new NextRequest(url, { method: metodo, ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}) } as never);
const corpo = async (r: Response) => (await r.json()) as { data: unknown; meta?: unknown; error?: { message: string } };
const DAQUI_A_1H = new Date(Date.now() + 3_600_000).toISOString();

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(sendMessageHandler).mockClear();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk("agent");
});

describe("POST (criar)", () => {
  it("grava uma linha por mensagem com criado_por = eu e audita; data passada → 422; conversa fora da visão → 404", async () => {
    const { escritas } = banco({ conversations: [{ id: CV, organization_id: ORG_ID, contact_id: CT, channel_session_id: CS }] });
    const r = await CRIAR(req("POST", undefined, { conversation_id: CV, enviar_em: DAQUI_A_1H, mensagens: [{ tipo: "texto", corpo: "Oi" }, { tipo: "template", template: { name: "boas_vindas", language: "pt_BR", values: {} } }] }));
    expect(r.status).toBe(201);
    const insert = escritas.find((e) => e.tabela === "crm_mensagens_agendadas")!;
    expect(insert.valores).toHaveLength(2);
    expect((insert.valores as Linha[])[0]).toMatchObject({ organization_id: ORG_ID, conversation_id: CV, contact_id: CT, channel_session_id: CS, tipo: "texto", corpo: "Oi", criado_por: USER_ID, enviar_em: DAQUI_A_1H });
    expect((insert.valores as Linha[])[1]).toMatchObject({ tipo: "template", template: { name: "boas_vindas", language: "pt_BR", values: {} }, corpo: null });
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({ action: "conversation_message.scheduled" });

    const r2 = await CRIAR(req("POST", undefined, { conversation_id: CV, enviar_em: "2020-01-01T10:00:00.000Z", mensagens: [{ tipo: "texto", corpo: "Oi" }] }));
    expect(r2.status).toBe(422);
    expect((await corpo(r2)).error?.message).toBe("Não é possível agendar para uma data/hora no passado");

    banco({ conversations: [] });
    expect((await CRIAR(req("POST", undefined, { conversation_id: CV, enviar_em: DAQUI_A_1H, mensagens: [{ tipo: "texto", corpo: "Oi" }] }))).status).toBe(404);
  });
});

describe("GET (listar) e contagem", () => {
  it("lista pendentes com contato e dispositivo e devolve meta; a contagem agrupa por conversa", async () => {
    banco({
      crm_mensagens_agendadas: [{
        id: "a1", conversation_id: CV, contact_id: CT, channel_session_id: CS, tipo: "texto", corpo: "Oi", template: null,
        enviar_em: DAQUI_A_1H, criado_por: USER_ID, status: "pendente", erro: null, created_at: DAQUI_A_1H,
        contacts: { name: "Ana", display_name: null, phone_number: "+5511", avatar_storage_path: null },
        channel_sessions: { display_name: "Comercial", phone_number: "+5511", provider: "meta_cloud", status: "WORKING" },
      }],
    }, 1);
    const r = await LISTAR(req("GET", "http://x/api/v1/mensagens-agendadas?pagina=1&por_pagina=10"));
    expect(r.status).toBe(200);
    const { data, meta } = await corpo(r);
    expect(meta).toEqual({ total: 1, pagina: 1, por_pagina: 10 });
    expect((data as Array<{ contato: unknown; dispositivo: unknown }>)[0]).toMatchObject({ contato: { nome: "Ana", telefone: "+5511", tem_foto: false }, dispositivo: { nome: "Comercial", provider: "meta_cloud", status: "WORKING" } });

    banco({ crm_mensagens_agendadas: [{ conversation_id: CV }, { conversation_id: CV }, { conversation_id: "outra" }] });
    const c = await CONTAGEM(req("GET", `http://x/api/v1/mensagens-agendadas/contagem?conversation_ids=${CV},outra`));
    expect((await corpo(c)).data).toEqual({ [CV]: 2, outra: 1 });
    expect((await CONTAGEM(req("GET", "http://x/api/v1/mensagens-agendadas/contagem?conversation_ids="))).status).toBe(422);
  });
});

describe("DELETE (remover)", () => {
  it("marca removida pela sessão e audita; 404 quando a RLS não deixa", async () => {
    const { escritas } = banco({ crm_mensagens_agendadas: [{ id: "a1", conversation_id: CV }] });
    expect((await REMOVER(req("DELETE", "http://x/api/v1/mensagens-agendadas/a1"), { params: Promise.resolve({ id: "c0000000-0000-4000-8000-0000000000a1" }) })).status).toBe(204);
    expect(escritas.find((e) => e.tabela === "crm_mensagens_agendadas")!.valores).toEqual({ status: "removida" });
    expect(vi.mocked(audit).mock.calls.at(-1)?.[0]).toMatchObject({ action: "conversation_message.unscheduled" });
    banco({ crm_mensagens_agendadas: [] });
    expect((await REMOVER(req("DELETE", "http://x/api/v1/mensagens-agendadas/a1"), { params: Promise.resolve({ id: "c0000000-0000-4000-8000-0000000000a1" }) })).status).toBe(404);
  });
});

describe("enviarAgendada (o passo do cron)", () => {
  const base = {
    id: "a1", organization_id: ORG_ID, conversation_id: CV, criado_por: USER_ID, tipo: "texto" as const, corpo: "Oi", template: null,
    canal: { status: "WORKING", provider: "meta_cloud" }, lastInboundAt: new Date(Date.now() - 60_000).toISOString(),
  };
  it("envia texto dentro da janela em nome de quem agendou; fora da janela falha sem chamar o envio; template fora da janela envia", async () => {
    const { db } = banco({});
    const ok = await enviarAgendada(db as never, base, new Date(), "r1");
    expect(ok).toEqual({ status: "enviada", message_id: "m1" });
    expect(vi.mocked(sendMessageHandler)).toHaveBeenCalledWith(db, expect.objectContaining({ organization_id: ORG_ID, actor: { type: "user", id: USER_ID }, requestId: "r1" }), { conversation_id: CV, type: "text", body: "Oi" });

    const fora = await enviarAgendada(db as never, { ...base, lastInboundAt: "2020-01-01T00:00:00Z" }, new Date(), "r2");
    expect(fora).toEqual({ status: "falhou", erro: "Fora da janela de 24h" });
    expect(vi.mocked(sendMessageHandler)).toHaveBeenCalledTimes(1);

    const tpl = await enviarAgendada(db as never, { ...base, tipo: "template", corpo: null, template: { name: "oi", language: "pt_BR", values: { "body:1": "Ana" } }, lastInboundAt: "2020-01-01T00:00:00Z" }, new Date(), "r3");
    expect(tpl.status).toBe("enviada");
    expect(vi.mocked(sendMessageHandler).mock.calls.at(-1)?.[2]).toEqual({ conversation_id: CV, type: "template", template_name: "oi", template_language: "pt_BR", template_values: { "body:1": "Ana" } });

    const caido = await enviarAgendada(db as never, { ...base, canal: { status: "STOPPED", provider: "meta_cloud" } }, new Date(), "r4");
    expect(caido).toEqual({ status: "falhou", erro: "Dispositivo desconectado" });

    vi.mocked(sendMessageHandler).mockRejectedValueOnce(new Error("provider caiu"));
    expect(await enviarAgendada(db as never, base, new Date(), "r5")).toEqual({ status: "falhou", erro: "provider caiu" });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-mensagens-agendadas-rotas.test.ts`
Expected: FAIL.

- [ ] **Step 3: O comum, as rotas e o passo do envio**

Create `app/api/v1/mensagens-agendadas/_comum.ts`:

```ts
import type { AgendadaLida } from "@/lib/escale/conversas/agendadas";

export const COLUNAS_DA_AGENDADA =
  "id, conversation_id, contact_id, channel_session_id, tipo, corpo, template, enviar_em, criado_por, status, erro, created_at, " +
  "contacts:contact_id ( name, display_name, phone_number, avatar_storage_path ), " +
  "channel_sessions:channel_session_id ( display_name, phone_number, provider, status )";

interface LinhaCrua {
  id: string;
  conversation_id: string;
  contact_id: string;
  channel_session_id: string;
  tipo: AgendadaLida["tipo"];
  corpo: string | null;
  template: AgendadaLida["template"];
  enviar_em: string;
  criado_por: string;
  status: AgendadaLida["status"];
  erro: string | null;
  created_at: string;
  contacts: { name: string | null; display_name: string | null; phone_number: string | null; avatar_storage_path: string | null } | null;
  channel_sessions: { display_name: string | null; phone_number: string | null; provider: string | null; status: string } | null;
}

/** A linha do banco com o contato e o dispositivo achatados do jeito que a tela lê. */
export function agendadaLida(linha: unknown): AgendadaLida {
  const l = linha as LinhaCrua;
  return {
    id: l.id,
    conversation_id: l.conversation_id,
    contact_id: l.contact_id,
    channel_session_id: l.channel_session_id,
    tipo: l.tipo,
    corpo: l.corpo,
    template: l.template,
    enviar_em: l.enviar_em,
    criado_por: l.criado_por,
    status: l.status,
    erro: l.erro,
    created_at: l.created_at,
    contato: {
      nome: l.contacts?.name?.trim() || l.contacts?.display_name?.trim() || l.contacts?.phone_number || "",
      telefone: l.contacts?.phone_number ?? null,
      tem_foto: !!l.contacts?.avatar_storage_path,
    },
    dispositivo: {
      nome: l.channel_sessions?.display_name?.trim() || l.channel_sessions?.phone_number || "",
      provider: l.channel_sessions?.provider ?? null,
      status: l.channel_sessions?.status ?? "STOPPED",
    },
  };
}
```

Create `app/api/v1/mensagens-agendadas/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { created, fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { dataNoPassado, listaDeAgendadasSchema, novaAgendadaSchema } from "@/lib/escale/conversas/agendadas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

import { COLUNAS_DA_AGENDADA, agendadaLida } from "./_comum";

export const dynamic = "force-dynamic";

/**
 * FORK ESCALE · Fase 3B (C9): as mensagens agendadas da organização, pela
 * SESSÃO (RLS: agente+ lê as da organização).
 *
 * Os filtros são os da tela "Configurações › Mensagens agendadas" (c39):
 * busca por nome/e-mail/telefone do contato, período de criação, período de
 * envio, dispositivo ou contato. Lista só as pendentes, salvo `?status=falhou`.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const url = new URL(req.url);
  const parsed = listaDeAgendadasSchema.safeParse({
    busca: url.searchParams.get("busca") ?? undefined,
    criacao_de: url.searchParams.get("criacao_de") ?? undefined,
    criacao_ate: url.searchParams.get("criacao_ate") ?? undefined,
    envio_de: url.searchParams.get("envio_de") ?? undefined,
    envio_ate: url.searchParams.get("envio_ate") ?? undefined,
    channel_session_id: url.searchParams.get("channel_session_id") ?? undefined,
    contact_id: url.searchParams.get("contact_id") ?? undefined,
    conversation_id: url.searchParams.get("conversation_id") ?? undefined,
    pagina: url.searchParams.get("pagina") ?? undefined,
    por_pagina: url.searchParams.get("por_pagina") ?? undefined,
  });
  if (!parsed.success) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  const f = parsed.data;
  const status = url.searchParams.get("status") === "falhou" ? "falhou" : "pendente";
  const supabase = await createClient();
  let q = supabase
    .from("crm_mensagens_agendadas")
    .select(COLUNAS_DA_AGENDADA, { count: "exact" })
    .eq("organization_id", authz.org.orgId)
    .eq("status", status)
    .order("enviar_em", { ascending: true })
    .range((f.pagina - 1) * f.por_pagina, f.pagina * f.por_pagina - 1);
  if (f.criacao_de) q = q.gte("created_at", `${f.criacao_de}T00:00:00`);
  if (f.criacao_ate) q = q.lte("created_at", `${f.criacao_ate}T23:59:59.999`);
  if (f.envio_de) q = q.gte("enviar_em", `${f.envio_de}T00:00:00`);
  if (f.envio_ate) q = q.lte("enviar_em", `${f.envio_ate}T23:59:59.999`);
  if (f.channel_session_id) q = q.eq("channel_session_id", f.channel_session_id);
  if (f.contact_id) q = q.eq("contact_id", f.contact_id);
  if (f.conversation_id) q = q.eq("conversation_id", f.conversation_id);
  if (f.busca) {
    // A busca é pelo contato embutido: PostgREST filtra a relação com `!inner` + `or` nela.
    const termo = f.busca.replace(/[%,()]/g, " ").trim();
    q = q.or(`name.ilike.%${termo}%,display_name.ilike.%${termo}%,phone_number.ilike.%${termo}%,email.ilike.%${termo}%`, { referencedTable: "contacts" });
  }
  const { data, error, count } = await q;
  if (error) return fail("internal_error", error.message, 500, { requestId });
  return ok((data ?? []).map(agendadaLida), { requestId, meta: { total: count ?? 0, pagina: f.pagina, por_pagina: f.por_pagina } });
}

/** "Confirmar" da janela "Agendar mensagem" (c08): uma linha por mensagem, todas na mesma hora. */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  const parsed = novaAgendadaSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  const nova = parsed.data;
  if (dataNoPassado(nova.enviar_em, new Date())) {
    return fail("validation_failed", t("Não é possível agendar para uma data/hora no passado"), 422, { requestId });
  }
  const supabase = await createClient();
  const { data: conversa, error: erroDaConversa } = await supabase
    .from("conversations")
    .select("id, organization_id, contact_id, channel_session_id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", nova.conversation_id)
    .maybeSingle();
  if (erroDaConversa) return fail("internal_error", erroDaConversa.message, 500, { requestId });
  if (!conversa) return fail("not_found", t("Conversa não encontrada."), 404, { requestId });

  const linhas = nova.mensagens.map((m) => ({
    organization_id: authz.org.orgId,
    conversation_id: conversa.id,
    contact_id: conversa.contact_id,
    channel_session_id: conversa.channel_session_id,
    tipo: m.tipo,
    corpo: m.tipo === "texto" ? m.corpo : null,
    template: m.tipo === "template" ? m.template : null,
    enviar_em: nova.enviar_em,
    criado_por: authz.user.id,
  }));
  const { data, error } = await supabase.from("crm_mensagens_agendadas").insert(linhas).select("id");
  if (error) return fail("internal_error", error.message, 500, { requestId });
  const ids = (data ?? []).map((l: { id: string }) => l.id);
  void audit({
    action: "conversation_message.scheduled",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "conversation",
    resourceId: conversa.id,
    requestId,
    metadata: { enviar_em: nova.enviar_em, mensagens: ids.length },
  });
  return created({ ids }, { requestId });
}
```

Se `ok(...)` do `lib/api/wrappers` não aceitar `meta`, confira como `app/api/v1/conversations/route.ts` devolve paginação e copie a forma (há `ok(data, { requestId, meta })` ou `paginated(...)`). Se `created` não existir, use `ok(..., { requestId, status: 201 })` ou `new Response(JSON.stringify({ data }), { status: 201 })` como as outras rotas do fork fazem.

Create `app/api/v1/mensagens-agendadas/[id]/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, noContent } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** "Remover agendamento" (c62): `status = 'removida'` pela sessão; a RLS decide quem pode (a sua, agente; qualquer, gerente+). */
export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const id = lerUuid((await ctx.params).id);
  if (!id) return fail("not_found", t("Agendamento não encontrado."), 404, { requestId });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_mensagens_agendadas")
    .update({ status: "removida" })
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .eq("status", "pendente")
    .select("id, conversation_id")
    .maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  if (!data) return fail("not_found", t("Agendamento não encontrado."), 404, { requestId });
  void audit({
    action: "conversation_message.unscheduled",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "conversation",
    resourceId: (data as { conversation_id: string }).conversation_id,
    requestId,
    metadata: { agendamento: id },
  });
  return noContent(requestId);
}
```

Create `app/api/v1/mensagens-agendadas/contagem/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const IDS_MAX = 60;

/** O "⏱ n" da linha da fila (c59) e o contador da ação rápida: pendentes por conversa, de uma vez por página. */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "conversations" });
  if (!authz.ok) return authz.response;
  const ids = (new URL(req.url).searchParams.get("conversation_ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (ids.length === 0 || ids.length > IDS_MAX || ids.some((id) => !lerUuid(id) && !/^[\w-]+$/.test(id))) {
    return fail("validation_failed", "conversation_ids inválido", 422, { requestId });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_mensagens_agendadas")
    .select("conversation_id")
    .eq("organization_id", authz.org.orgId)
    .eq("status", "pendente")
    .in("conversation_id", ids);
  if (error) return fail("internal_error", error.message, 500, { requestId });
  const contagem: Record<string, number> = {};
  for (const l of (data ?? []) as Array<{ conversation_id: string }>) {
    contagem[l.conversation_id] = (contagem[l.conversation_id] ?? 0) + 1;
  }
  return ok(contagem, { requestId });
}
```

(O teste usa `"outra"` como id; em produção os ids são uuid. Se preferir a validação estrita `lerUuid`, troque o id do teste por um uuid.)

Create `lib/escale/conversas/envio-agendado.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { sendMessageHandler } from "@/app/api/v1/messages/_handler";
import { logger } from "@/lib/logger";

import { decidirEnvio, type MensagemAgendada } from "./agendadas";

export interface LinhaParaEnviar {
  id: string;
  organization_id: string;
  conversation_id: string;
  criado_por: string;
  tipo: MensagemAgendada["tipo"];
  corpo: string | null;
  template: { name: string; language: string; values: Record<string, string> } | null;
  canal: { status: string; provider: string | null };
  lastInboundAt: string | null;
}

export type ResultadoDoEnvio = { status: "enviada"; message_id: string } | { status: "falhou"; erro: string };

/**
 * UM ENVIO AGENDADO (fork Escale, Fase 3B; C9). O mesmo `sendMessageHandler`
 * do botão Enviar, em nome de quem agendou (`actor: user`), depois das duas
 * checagens da Clint: o dispositivo de pé e, fora da janela, só modelo.
 * Nunca lança: o cron grava o resultado na linha.
 */
export async function enviarAgendada(
  admin: SupabaseClient,
  linha: LinhaParaEnviar,
  agora: Date,
  requestId: string,
): Promise<ResultadoDoEnvio> {
  const decisao = decidirEnvio({ canal: linha.canal, lastInboundAt: linha.lastInboundAt, tipo: linha.tipo, agora });
  if (!decisao.ok) return { status: "falhou", erro: decisao.erro };
  const input =
    linha.tipo === "template" && linha.template
      ? {
          conversation_id: linha.conversation_id,
          type: "template" as const,
          template_name: linha.template.name,
          template_language: linha.template.language,
          template_values: linha.template.values,
        }
      : { conversation_id: linha.conversation_id, type: "text" as const, body: linha.corpo ?? "" };
  try {
    const mensagem = await sendMessageHandler(
      admin,
      { organization_id: linha.organization_id, actor: { type: "user", id: linha.criado_por }, requestId },
      input,
    );
    return { status: "enviada", message_id: mensagem.id };
  } catch (err) {
    const e = err as { message?: string };
    logger.warn("escale/agendadas: envio falhou", { agendamento: linha.id, conversation_id: linha.conversation_id, erro: e.message });
    return { status: "falhou", erro: e.message ?? "Falha no envio" };
  }
}
```

Confira em `app/api/v1/messages/_handler.ts` o formato exato de `HandlerCtx.actor` (procure `actor:` nas rotas que chamam `sendMessageHandler`, por exemplo `app/api/v1/messages/route.ts` e o cron de follow-up) e copie: se o `actor` de usuário exigir `role`, leia `user_organizations.role` de `criado_por` no cron e passe junto. O teste espera `actor: { type: "user", id }`; ajuste o `objectContaining` se o original pedir mais campos.

Create `app/api/v1/cron/mensagens-agendadas/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { autorizaCron } from "@/lib/auth/cron-auth";
import { enviarAgendada } from "@/lib/escale/conversas/envio-agendado";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const LOTE = 50;

interface Vencida {
  id: string;
  organization_id: string;
  conversation_id: string;
  criado_por: string;
  tipo: "texto" | "template";
  corpo: string | null;
  template: { name: string; language: string; values: Record<string, string> } | null;
  conversations: { last_inbound_at: string | null } | null;
  channel_sessions: { status: string; provider: string | null } | null;
}

/**
 * FORK ESCALE · Fase 3B (C9): envia as mensagens agendadas vencidas. Minuto a
 * minuto no docker/scheduler/entrypoint.sh. Reivindica cada linha
 * (`pendente` → `processando`, só se ainda pendente) antes de enviar, para
 * dois ticks não mandarem a mesma mensagem.
 */
async function handle(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  if (!autorizaCron(req)) return fail("forbidden", "Cron secret missing or invalid.", 403, { requestId });
  const admin = createAdminClient();
  const agora = new Date();
  const { data, error } = await admin
    .from("crm_mensagens_agendadas")
    .select(
      "id, organization_id, conversation_id, criado_por, tipo, corpo, template, " +
        "conversations:conversation_id ( last_inbound_at ), channel_sessions:channel_session_id ( status, provider )",
    )
    .eq("status", "pendente")
    .lte("enviar_em", agora.toISOString())
    .order("enviar_em", { ascending: true })
    .limit(LOTE);
  if (error) return fail("internal_error", error.message, 500, { requestId });

  let enviadas = 0;
  let falhas = 0;
  for (const v of (data ?? []) as unknown as Vencida[]) {
    const { data: minha } = await admin
      .from("crm_mensagens_agendadas")
      .update({ status: "processando" })
      .eq("id", v.id)
      .eq("status", "pendente")
      .select("id")
      .maybeSingle();
    if (!minha) continue; // outro tick levou
    const resultado = await enviarAgendada(
      admin,
      {
        id: v.id,
        organization_id: v.organization_id,
        conversation_id: v.conversation_id,
        criado_por: v.criado_por,
        tipo: v.tipo,
        corpo: v.corpo,
        template: v.template,
        canal: { status: v.channel_sessions?.status ?? "STOPPED", provider: v.channel_sessions?.provider ?? null },
        lastInboundAt: v.conversations?.last_inbound_at ?? null,
      },
      agora,
      requestId,
    );
    await admin
      .from("crm_mensagens_agendadas")
      .update(
        resultado.status === "enviada"
          ? { status: "enviada", message_id: resultado.message_id, enviada_em: new Date().toISOString(), erro: null }
          : { status: "falhou", erro: resultado.erro },
      )
      .eq("id", v.id);
    if (resultado.status === "enviada") enviadas++;
    else falhas++;
    void audit({
      action: "conversation_message.schedule_sent",
      actorUserId: v.criado_por,
      organizationId: v.organization_id,
      resourceType: "conversation",
      resourceId: v.conversation_id,
      requestId,
      metadata: { agendamento: v.id, ...resultado },
    });
  }
  return ok({ enviadas, falhas }, { requestId });
}

export async function GET(req: NextRequest): Promise<Response> {
  return handle(req);
}
export async function POST(req: NextRequest): Promise<Response> {
  return handle(req);
}
```

- [ ] **Step 4: Rodar e ver passar (inclui a cerca dos crons)**

Run: `corepack pnpm vitest run tests/unit/escale-mensagens-agendadas-rotas.test.ts $(ls tests/unit | grep -i "cron-routes\|crons" | sed 's|^|tests/unit/|' | tr '\n' ' ') && corepack pnpm prettier --write app/api/v1/mensagens-agendadas app/api/v1/cron/mensagens-agendadas lib/escale/conversas/envio-agendado.ts tests/unit/escale-mensagens-agendadas-rotas.test.ts && corepack pnpm eslint app/api/v1/mensagens-agendadas app/api/v1/cron/mensagens-agendadas lib/escale/conversas/envio-agendado.ts && corepack pnpm typecheck`
Expected: PASS (a cerca `cron-routes-scheduled` vê as duas rotas no `entrypoint.sh`).

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/mensagens-agendadas app/api/v1/cron/mensagens-agendadas lib/escale/conversas/envio-agendado.ts tests/unit/escale-mensagens-agendadas-rotas.test.ts
git commit -m "feat(escale): mensagens agendadas — rotas, contagem e cron de envio (Fase 3B)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 5: Os hooks da conversa aberta

**Files:**
- Create: `hooks/escale/useConversaDaCasca.ts`, `hooks/escale/useMensagensAgendadas.ts`, `hooks/escale/useModelosDeMensagem.ts`, `tests/unit/escale-conversa-aberta-hooks.test.tsx`

**Interfaces (Produces):**
- `useConversaDaCasca(conversationId: string | null)` → `{ eventos: EventoDaConversa[]; carregandoEventos: boolean; pausa: EstadoDaPausa | null; entrarEmEspera, sairDaEspera, encerrar, reabrir, marcarNaoLida, pausar, retomar }` (cada um um `UseMutationResult`; `pausar.mutate({ ate: string | null })`; `encerrar.mutate({ expected_revision?: number })`). Toda mutation invalida `["conversations"]`, `["conversation", id]` e `["eventos-da-conversa", id]`; `pausar/retomar` invalidam `["pausa-da-conversa", id]`.
- `EstadoDaPausa = { pausa: { ate: string | null; user_id: string; created_at: string } | null; agenteAtivo: boolean; followups: { ativos: number; proximoEm: string | null } }`.
- `useMensagensAgendadas(filtros: Partial<ListaDeAgendadas> & { status?: "pendente" | "falhou" }, enabled = true)` → `UseQueryResult<{ data: AgendadaLida[]; meta: { total; pagina; por_pagina } }>`; `useAgendarMensagens()` (mutation `NovaAgendada` → `{ ids }`); `useRemoverAgendada()` (mutation `id`); `useContagemDeAgendadas(conversationIds: string[])` → `Record<string, number>` (vazio enquanto carrega; chave `["agendadas-contagem", ids ordenados]`; `staleTime` 30 s). Todas invalidam `["mensagens-agendadas"]` e `["agendadas-contagem"]`.
- `useModelosDeMensagem(provider: string | null | undefined)` → `{ modelos: ModeloAprovado[]; carregando: boolean; recarregar: () => void; fonte: FonteDeTemplates | null; recentes: string[]; marcarUsado(name) }` (os recentes ficam em `localStorage` `escale_modelos_recentes` por organização, até 5). `ModeloAprovado` = `{ name, language, status, category?, slots?, components?, savedValues? }` (o mesmo que `JanelaFechadaAviso` lê; declare o tipo aqui e exporte).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-conversa-aberta-hooks.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useContagemDeAgendadas, useMensagensAgendadas } from "@/hooks/escale/useMensagensAgendadas";
import { useModelosDeMensagem } from "@/hooks/escale/useModelosDeMensagem";
import { useConversaDaCasca } from "@/hooks/escale/useConversaDaCasca";
import { apiClient } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  showApiError: vi.fn(),
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: "agent" } }) }));

const CV = "c0000000-0000-4000-8000-000000000001";
let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.delete).mockReset();
  window.localStorage.clear();
});

describe("useConversaDaCasca", () => {
  it("lê eventos e pausa; a espera chama a rota e invalida a conversa e os eventos", async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url.endsWith("/eventos")) return { data: [{ id: "e1", tipo: "espera", em: "2026-10-18T10:00:00Z", user_id: "u1" }] };
      if (url.endsWith("/pausa")) return { data: { pausa: null, agenteAtivo: true, followups: { ativos: 0, proximoEm: null } } };
      throw new Error(`GET inesperado ${url}`);
    });
    vi.mocked(apiClient.post).mockResolvedValue({ data: { snooze_until: "9999-12-31T00:00:00.000Z" } });
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useConversaDaCasca(CV), { wrapper });
    await waitFor(() => expect(result.current.eventos).toHaveLength(1));
    await waitFor(() => expect(result.current.pausa?.agenteAtivo).toBe(true));
    await act(async () => { await result.current.entrarEmEspera.mutateAsync(); });
    expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/conversas-da-casca/${CV}/espera`, {});
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["conversations"] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["eventos-da-conversa", CV] });
  });
});

describe("useMensagensAgendadas / contagem", () => {
  it("monta a URL com os filtros e lê a contagem com os ids ordenados", async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url.startsWith("/api/v1/mensagens-agendadas/contagem")) return { data: { b: 2 } };
      return { data: [], meta: { total: 0, pagina: 2, por_pagina: 25 } };
    });
    const { result } = renderHook(() => useMensagensAgendadas({ busca: "ana", pagina: 2, por_pagina: 25, envio_de: "2026-10-01" }), { wrapper });
    await waitFor(() => expect(result.current.data?.meta.pagina).toBe(2));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/mensagens-agendadas?busca=ana&envio_de=2026-10-01&pagina=2&por_pagina=25");
    const c = renderHook(() => useContagemDeAgendadas(["b", "a"]), { wrapper });
    await waitFor(() => expect(c.result.current).toEqual({ b: 2 }));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/mensagens-agendadas/contagem?conversation_ids=a%2Cb");
    const vazio = renderHook(() => useContagemDeAgendadas([]), { wrapper });
    expect(vazio.result.current).toEqual({});
  });
});

describe("useModelosDeMensagem", () => {
  it("sem fonte não busca; com Meta Cloud lê a rota dos modelos e guarda os recentes", async () => {
    const sem = renderHook(() => useModelosDeMensagem("evolution"), { wrapper });
    expect(sem.result.current.fonte).toBeNull();
    expect(apiClient.get).not.toHaveBeenCalled();
    vi.mocked(apiClient.get).mockResolvedValue({ data: { templates: [{ name: "oi", language: "pt_BR", status: "APPROVED" }] } });
    const { result } = renderHook(() => useModelosDeMensagem("meta_cloud"), { wrapper });
    await waitFor(() => expect(result.current.modelos).toHaveLength(1));
    act(() => result.current.marcarUsado("oi"));
    expect(result.current.recentes).toEqual(["oi"]);
    expect(JSON.parse(window.localStorage.getItem("escale_modelos_recentes:o1") ?? "[]")).toEqual(["oi"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-conversa-aberta-hooks.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Os hooks**

Create `hooks/escale/useConversaDaCasca.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, showApiError } from "@/lib/api/client";
import type { EventoDaConversa } from "@/lib/escale/conversas/eventos";

export interface EstadoDaPausa {
  pausa: { ate: string | null; user_id: string; created_at: string } | null;
  agenteAtivo: boolean;
  followups: { ativos: number; proximoEm: string | null };
}

export const CHAVE_DOS_EVENTOS = (id: string) => ["eventos-da-conversa", id] as const;
export const CHAVE_DA_PAUSA = (id: string) => ["pausa-da-conversa", id] as const;

/**
 * A CONVERSA ABERTA NA CASCA (fork Escale, Fase 3B): os eventos da thread, o
 * estado da pausa e as sete ações das rotas `conversas-da-casca/[id]/…`.
 * As ações do original que a casca reaproveita (claim, transfer, release,
 * send, mark-read) continuam nos hooks de `hooks/inbox`.
 */
export function useConversaDaCasca(conversationId: string | null) {
  const qc = useQueryClient();
  const base = `/api/v1/conversas-da-casca/${conversationId}`;
  const invalidarConversa = async () => {
    if (!conversationId) return;
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["conversations"] }),
      qc.invalidateQueries({ queryKey: ["conversation", conversationId] }),
      qc.invalidateQueries({ queryKey: CHAVE_DOS_EVENTOS(conversationId) }),
    ]);
  };
  const invalidarPausa = async () => {
    if (!conversationId) return;
    await qc.invalidateQueries({ queryKey: CHAVE_DA_PAUSA(conversationId) });
  };

  const eventos = useQuery({
    queryKey: CHAVE_DOS_EVENTOS(conversationId ?? "nenhuma"),
    enabled: !!conversationId,
    queryFn: async () => apiClient.get<{ data: EventoDaConversa[] }>(`${base}/eventos`),
    select: (r) => r.data,
    staleTime: 15_000,
  });
  const pausa = useQuery({
    queryKey: CHAVE_DA_PAUSA(conversationId ?? "nenhuma"),
    enabled: !!conversationId,
    queryFn: async () => apiClient.get<{ data: EstadoDaPausa }>(`${base}/pausa`),
    select: (r) => r.data,
    staleTime: 15_000,
  });

  const entrarEmEspera = useMutation({
    mutationFn: async () => apiClient.post<{ data: { snooze_until: string } }>(`${base}/espera`, {}),
    onSuccess: invalidarConversa,
    onError: showApiError,
  });
  const sairDaEspera = useMutation({
    mutationFn: async () => apiClient.delete(`${base}/espera`),
    onSuccess: invalidarConversa,
    onError: showApiError,
  });
  const encerrar = useMutation({
    mutationFn: async (args: { expected_revision?: number }) => apiClient.post(`${base}/encerrar`, args),
    onSuccess: invalidarConversa,
    onError: showApiError,
  });
  const reabrir = useMutation({
    mutationFn: async () => apiClient.post(`${base}/reabrir`, {}),
    onSuccess: invalidarConversa,
    onError: showApiError,
  });
  const marcarNaoLida = useMutation({
    mutationFn: async () => apiClient.post(`${base}/nao-lida`, {}),
    onSuccess: invalidarConversa,
    onError: showApiError,
  });
  const pausar = useMutation({
    mutationFn: async (args: { ate: string | null }) => apiClient.post(`${base}/pausa`, args),
    onSuccess: async () => { await Promise.all([invalidarPausa(), invalidarConversa()]); },
    onError: showApiError,
  });
  const retomar = useMutation({
    mutationFn: async () => apiClient.delete(`${base}/pausa`),
    onSuccess: async () => { await Promise.all([invalidarPausa(), invalidarConversa()]); },
    onError: showApiError,
  });

  return {
    eventos: eventos.data ?? [],
    carregandoEventos: eventos.isLoading,
    pausa: pausa.data ?? null,
    entrarEmEspera,
    sairDaEspera,
    encerrar,
    reabrir,
    marcarNaoLida,
    pausar,
    retomar,
  };
}
```

Create `hooks/escale/useMensagensAgendadas.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient, showApiError } from "@/lib/api/client";
import type { AgendadaLida, ListaDeAgendadas, NovaAgendada } from "@/lib/escale/conversas/agendadas";

export type FiltrosDeAgendadas = Partial<ListaDeAgendadas> & { status?: "pendente" | "falhou" };
export interface PaginaDeAgendadas {
  data: AgendadaLida[];
  meta: { total: number; pagina: number; por_pagina: number };
}
export const CHAVE_DAS_AGENDADAS = ["mensagens-agendadas"] as const;
export const CHAVE_DA_CONTAGEM = ["agendadas-contagem"] as const;

/** A URL com só os filtros preenchidos, em ordem fixa (a chave do cache é estável). */
export function urlDasAgendadas(f: FiltrosDeAgendadas): string {
  const p = new URLSearchParams();
  const ordem: Array<keyof FiltrosDeAgendadas> = [
    "busca", "criacao_de", "criacao_ate", "envio_de", "envio_ate", "channel_session_id", "contact_id", "conversation_id", "status", "pagina", "por_pagina",
  ];
  for (const k of ordem) {
    const v = f[k];
    if (v !== undefined && v !== null && String(v) !== "") p.set(k, String(v));
  }
  const qs = p.toString();
  return `/api/v1/mensagens-agendadas${qs ? `?${qs}` : ""}`;
}

export function useMensagensAgendadas(filtros: FiltrosDeAgendadas, enabled = true) {
  const url = urlDasAgendadas(filtros);
  return useQuery({
    queryKey: [...CHAVE_DAS_AGENDADAS, url],
    enabled,
    queryFn: async () => apiClient.get<PaginaDeAgendadas>(url),
    staleTime: 15_000,
  });
}

function useInvalidarAgendadas() {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: CHAVE_DAS_AGENDADAS }), qc.invalidateQueries({ queryKey: CHAVE_DA_CONTAGEM })]);
  };
}

export function useAgendarMensagens() {
  const invalidar = useInvalidarAgendadas();
  return useMutation({
    mutationFn: async (nova: NovaAgendada) => apiClient.post<{ data: { ids: string[] } }>("/api/v1/mensagens-agendadas", nova),
    onSuccess: invalidar,
    onError: showApiError,
  });
}

export function useRemoverAgendada() {
  const invalidar = useInvalidarAgendadas();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/api/v1/mensagens-agendadas/${id}`),
    onSuccess: invalidar,
    onError: showApiError,
  });
}

/** O "⏱ n" da fila: uma chamada por página de ids (ordenados, para a chave não mudar com a ordem da lista). */
export function useContagemDeAgendadas(conversationIds: readonly string[]): Record<string, number> {
  const ids = [...new Set(conversationIds)].sort();
  const q = useQuery({
    queryKey: [...CHAVE_DA_CONTAGEM, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () =>
      apiClient.get<{ data: Record<string, number> }>(`/api/v1/mensagens-agendadas/contagem?conversation_ids=${encodeURIComponent(ids.join(","))}`),
    select: (r) => r.data,
    staleTime: 30_000,
  });
  return q.data ?? {};
}
```

Create `hooks/escale/useModelosDeMensagem.ts`:

```ts
"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useAuth } from "@/hooks/auth/AuthProvider";
import { apiClient } from "@/lib/api/client";
import { fonteDeTemplates, rotaDeTemplates, type FonteDeTemplates } from "@/lib/channels/templates-fonte";

/** Espelha o que `JanelaFechadaAviso` lê da rota de modelos (`slots`, `components`, `savedValues`). */
export interface SlotDoModelo {
  key: string;
  expects: string;
  onde: string;
  valueKey: string;
}
export interface ModeloAprovado {
  name: string;
  language: string;
  status: string;
  category?: string;
  slots?: SlotDoModelo[];
  components?: unknown[];
  savedValues?: Record<string, string>;
}

const RECENTES_MAX = 5;
const chaveDosRecentes = (orgId: string) => `escale_modelos_recentes:${orgId}`;
const EVENTO = "escale:modelos-recentes";

function lerRecentes(orgId: string): string[] {
  try {
    const bruto = window.localStorage.getItem(chaveDosRecentes(orgId));
    const lista = bruto ? (JSON.parse(bruto) as unknown) : [];
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * OS MODELOS DE MENSAGEM DA CONVERSA (fork Escale, Fase 3B; C7): a mesma rota
 * que a `JanelaFechadaAviso` do original usa (`rotaDeTemplates(fonte)`), mais
 * os "usados recentemente" (c63), guardados no navegador por organização.
 */
export function useModelosDeMensagem(provider: string | null | undefined) {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.orgId ?? "sem-org";
  const qc = useQueryClient();
  const fonte: FonteDeTemplates | null = fonteDeTemplates(provider);
  const rota = fonte ? rotaDeTemplates(fonte) : null;
  const q = useQuery({
    queryKey: ["modelos-de-mensagem", rota],
    enabled: rota !== null,
    queryFn: async () => apiClient.get<{ data: { templates: ModeloAprovado[] } }>(rota!),
    select: (r) => r.data.templates.filter((m) => m.status?.toUpperCase() === "APPROVED"),
    staleTime: 60_000,
  });

  const recentesBrutos = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENTO, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENTO, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => window.localStorage.getItem(chaveDosRecentes(orgId)) ?? "[]",
    () => "[]",
  );
  const recentes = useMemo(() => {
    void recentesBrutos;
    return lerRecentes(orgId);
  }, [orgId, recentesBrutos]);

  const marcarUsado = useCallback(
    (name: string) => {
      const proximos = [name, ...lerRecentes(orgId).filter((n) => n !== name)].slice(0, RECENTES_MAX);
      try {
        window.localStorage.setItem(chaveDosRecentes(orgId), JSON.stringify(proximos));
      } catch {
        /* navegador sem armazenamento: os recentes só não persistem */
      }
      window.dispatchEvent(new Event(EVENTO));
    },
    [orgId],
  );

  return {
    modelos: q.data ?? [],
    carregando: q.isLoading,
    recarregar: () => void qc.invalidateQueries({ queryKey: ["modelos-de-mensagem", rota] }),
    fonte,
    recentes,
    marcarUsado,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-conversa-aberta-hooks.test.tsx && corepack pnpm prettier --write hooks/escale/useConversaDaCasca.ts hooks/escale/useMensagensAgendadas.ts hooks/escale/useModelosDeMensagem.ts tests/unit/escale-conversa-aberta-hooks.test.tsx && corepack pnpm eslint hooks/escale/useConversaDaCasca.ts hooks/escale/useMensagensAgendadas.ts hooks/escale/useModelosDeMensagem.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/escale/useConversaDaCasca.ts hooks/escale/useMensagensAgendadas.ts hooks/escale/useModelosDeMensagem.ts tests/unit/escale-conversa-aberta-hooks.test.tsx
git commit -m "feat(escale): hooks da conversa aberta — ações, eventos, pausa, agendadas, modelos (Fase 3B)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 6: O cabeçalho da conversa, o seletor de atendente e a barra de status (C1, C2)

**Files:**
- Create: `components/escale/conversas/centro/CabecalhoDaConversa.tsx`, `components/escale/conversas/centro/SeletorDeAtendente.tsx`, `components/escale/conversas/centro/BarraDeStatus.tsx`, `tests/unit/escale-cabecalho-da-conversa.test.tsx`
- Modify: `lib/ui/icons-da-casca.ts` (os ícones da fase), `app/escale-tema.css` e `app/globals.css` (os 5 tokens da N18)

**Interfaces (Produces):**
- `CabecalhoDaConversa({ conversa, aoAbrirConversa, aoBuscar, buscaAberta, naoLidaManual, aoMarcarNaoLida })` — a foto, o nome, o canal e o dispositivo, o `SeletorDeAtendente`, o botão da busca e o ⋮ "Mais".
- `SeletorDeAtendente({ conversa })` — o gatilho (foto 24px + nome ou "Sem atendente" + `ChevronDown`) e o `PainelSuspenso` de 250px; chama `useTransferConversation`/`useClaimConversation`/`useReleaseConversation`.
- `BarraDeStatus({ conversa, ultimaFoiTemplate, agora })` — o selo da janela (`seloDaJanela`) à esquerda e, à direita, os botões "Colocar em espera"/"Remover espera" (`Hourglass`) e "Encerrar atendimento"/"Reabrir atendimento" (`CheckCircle2`/`RotateCcw`); usa `useConversaDaCasca`.

Abra c02, c03, c04, c05, c58 e c60 antes de escrever.

- [ ] **Step 1: Os ícones e os tokens**

Em `lib/ui/icons-da-casca.ts`, no fim do bloco de exports (só os que ainda não estão lá; confira com `grep`):

```ts
// FORK ESCALE · Fase 3B: a conversa aberta.
export {
  AlarmClock, Camera, CheckCircle2, CirclePause, Copy, Hourglass, Lightbulb, MailOpen, Mic, PenLine, Play,
  RotateCcw, Send, Smile, Workflow, Instagram, UserX, Paperclip, Zap, FileText, Sparkles, Image as ImageIcon,
} from "lucide-react";
```

Em `app/escale-tema.css`, dentro do bloco `[data-casca="topo"]` (ou o seletor que a 3A usa para os tokens da casca; confira `casca-espiao`), depois dos tokens da 3A:

```css
  /* FORK ESCALE · Fase 3B: a conversa aberta */
  --escale-painel-chat: #f8f9fd;
  --escale-nota: #fef9c3;
  --escale-nota-borda: #fde68a;
  --escale-pausa: #fff4e5;
  --escale-pausa-texto: #d97706;
```

Em `app/globals.css`, no `@theme` onde estão `--color-casca-espiao` etc.:

```css
  --color-casca-painel-chat: var(--escale-painel-chat);
  --color-casca-nota: var(--escale-nota);
  --color-casca-nota-borda: var(--escale-nota-borda);
  --color-casca-pausa: var(--escale-pausa);
  --color-casca-pausa-texto: var(--escale-pausa-texto);
```

Run: `corepack pnpm vitest run $(ls tests/unit | grep -i "tailwind-tokens\|icons-da-casca" | sed 's|^|tests/unit/|' | tr '\n' ' ')` — Expected: PASS.

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-cabecalho-da-conversa.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BarraDeStatus } from "@/components/escale/conversas/centro/BarraDeStatus";
import { CabecalhoDaConversa } from "@/components/escale/conversas/centro/CabecalhoDaConversa";
import { SeletorDeAtendente } from "@/components/escale/conversas/centro/SeletorDeAtendente";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { apiClient } from "@/lib/api/client";
import { ESPERA_SEM_FIM } from "@/lib/escale/conversas/espera";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() }, showApiError: vi.fn() }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1", full_name: "Eu Mesmo", idioma: "pt-BR" }, activeOrg: { orgId: "o1", role: "agent" } }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u1", role: "agent", full_name: "Eu Mesmo" }, { user_id: "u2", role: "agent", full_name: "Bia Lima" }] }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const transfer = vi.fn();
const claim = vi.fn();
const release = vi.fn();
vi.mock("@/hooks/inbox/useTransferConversation", () => ({ useTransferConversation: () => ({ mutate: transfer, isPending: false }) }));
vi.mock("@/hooks/inbox/useClaimConversation", () => ({ useClaimConversation: () => ({ mutate: claim, isPending: false }) }));
vi.mock("@/hooks/inbox/useReleaseConversation", () => ({ useReleaseConversation: () => ({ mutate: release, isPending: false }) }));
vi.mock("@/components/escale/conversas/fila/FotoDaConversa", () => ({ FotoDaConversa: () => <div data-testid="foto" /> }));

const CV = "c0000000-0000-4000-8000-000000000001";
const conversa = (extra: Partial<ConversationWithContact> = {}): ConversationWithContact =>
  ({
    id: CV, organization_id: "o1", contact_id: "ct1", channel_session_id: "cs1", status: "open", service_revision: 3,
    assigned_to_user_id: "u2", assigned_to_user_name: "Bia Lima", last_inbound_at: new Date(Date.now() - 3_600_000).toISOString(),
    last_outbound_at: null, unread_count_for_assignee: 0, metadata: {}, snooze_until: null, bot_silenced_until: null,
    contacts: { id: "ct1", display_name: "Ana", name: "Ana Souza", phone_number: "+5511999990000", tags: [], is_blocked: false, is_anonymized: false, is_personal: false },
    channel_sessions: { phone_number: "+5511888880000", display_name: "Comercial", provider: "meta_cloud" },
    ...extra,
  }) as ConversationWithContact;
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
  vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
  transfer.mockClear(); claim.mockClear(); release.mockClear();
});

describe("CabecalhoDaConversa (c02, c03)", () => {
  it("mostra nome, canal e dispositivo; o ⋮ tem Iniciar, Copiar link e Marcar como não lida", async () => {
    const marcar = vi.fn();
    wrap(<CabecalhoDaConversa conversa={conversa()} aoAbrirConversa={vi.fn()} aoBuscar={vi.fn()} buscaAberta={false} naoLidaManual={false} aoMarcarNaoLida={marcar} />);
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp - Comercial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mais" }));
    expect(await screen.findByText("Iniciar uma conversa")).toBeInTheDocument();
    expect(screen.getByText("Copiar link da conversa")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Marcar como não lida"));
    expect(marcar).toHaveBeenCalled();
  });
});

describe("SeletorDeAtendente (c04)", () => {
  it("lista os membros com busca; escolher outro transfere; escolher a mim reivindica; 'Sem atendente' só para o próprio", async () => {
    wrap(<SeletorDeAtendente conversa={conversa()} />);
    fireEvent.click(screen.getByRole("button", { name: /Bia Lima/ }));
    const busca = await screen.findByPlaceholderText("Buscar por…");
    fireEvent.change(busca, { target: { value: "eu" } });
    expect(screen.queryByText("Bia Lima", { selector: "li *" })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: /Eu Mesmo/ }));
    expect(claim).toHaveBeenCalledWith({ conversation_id: CV, expected_assignee: "u2" }, expect.anything());
    const semAtendente = screen.getByRole("option", { name: /Sem atendente/ });
    expect(semAtendente).toHaveAttribute("aria-disabled", "true");
    expect(semAtendente).toHaveAttribute("title", "Só o atendente atual pode liberar a conversa.");
  });
  it("quando sou o atendente, 'Sem atendente' libera; escolher outro transfere", async () => {
    wrap(<SeletorDeAtendente conversa={conversa({ assigned_to_user_id: "u1", assigned_to_user_name: "Eu Mesmo" })} />);
    fireEvent.click(screen.getByRole("button", { name: /Eu Mesmo/ }));
    fireEvent.click(await screen.findByRole("option", { name: /Sem atendente/ }));
    expect(release).toHaveBeenCalledWith({ conversation_id: CV }, expect.anything());
    fireEvent.click(screen.getByRole("button", { name: /Eu Mesmo/ }));
    fireEvent.click(await screen.findByRole("option", { name: /Bia Lima/ }));
    expect(transfer).toHaveBeenCalledWith({ conversation_id: CV, to_user_id: "u2" }, expect.anything());
  });
});

describe("BarraDeStatus (c05, c58, c60)", () => {
  it("janela aberta mostra hh:mm; 'Colocar em espera' chama a rota; em espera vira 'Remover espera'; fechada vira 'Reabrir atendimento'", async () => {
    const agora = new Date();
    const { rerender } = wrap(<BarraDeStatus conversa={conversa()} ultimaFoiTemplate={false} agora={agora} />);
    expect(screen.getByText(/^2[23]:[0-5]\d$/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Colocar em espera" }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(`/api/v1/conversas-da-casca/${CV}/espera`, {}));
    rerender(<QueryClientProvider client={qc}><BarraDeStatus conversa={conversa({ snooze_until: ESPERA_SEM_FIM, metadata: { escale_em_espera: true } })} ultimaFoiTemplate={false} agora={agora} /></QueryClientProvider>);
    expect(screen.getByRole("button", { name: "Remover espera" })).toBeInTheDocument();
    rerender(<QueryClientProvider client={qc}><BarraDeStatus conversa={conversa({ status: "closed", last_inbound_at: "2020-01-01T00:00:00Z" })} ultimaFoiTemplate={true} agora={agora} /></QueryClientProvider>);
    expect(screen.getByRole("button", { name: "Reabrir atendimento" })).toBeInTheDocument();
    expect(screen.getByText("Aguardando abrir janela")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-cabecalho-da-conversa.test.tsx`
Expected: FAIL.

- [ ] **Step 4: O seletor de atendente**

Create `components/escale/conversas/centro/SeletorDeAtendente.tsx`:

```tsx
"use client";
import * as Popover from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useClaimConversation } from "@/hooks/inbox/useClaimConversation";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useReleaseConversation } from "@/hooks/inbox/useReleaseConversation";
import { useTransferConversation } from "@/hooks/inbox/useTransferConversation";
import { corDoAvatar, inicialDoNome } from "@/lib/escale/contatos/avatar";
import { Check, ChevronDown, Search, UserX } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const LINHA = "flex h-9 w-full cursor-pointer items-center gap-2 px-3 text-left text-[12px] text-casca-texto hover:bg-casca-raia aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

function Inicial({ nome, tamanho = 24 }: { nome: string; tamanho?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
      style={{ width: tamanho, height: tamanho, background: corDoAvatar(nome) }}
    >
      {inicialDoNome(nome)}
    </span>
  );
}

/**
 * O SELETOR DE ATENDENTE DO CABEÇALHO (c04; C1; N10): a troca é imediata.
 * Outro membro → transferir; eu → reivindicar; "Sem atendente" → liberar, e
 * a rota do original só libera o PRÓPRIO atendimento (diferença declarada).
 */
export function SeletorDeAtendente({ conversa }: { conversa: ConversationWithContact }) {
  const t = useT();
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const { data: membros = [] } = useAssignableMembers(aberto);
  const transferir = useTransferConversation();
  const reivindicar = useClaimConversation();
  const liberar = useReleaseConversation();
  const atualId = conversa.assigned_to_user_id ?? null;
  const souOAtendente = atualId === user.id;
  const nomeAtual = conversa.assigned_to_user_name?.trim() || (atualId ? t("Atendente") : t("Sem atendente"));
  const ocupado = transferir.isPending || reivindicar.isPending || liberar.isPending;

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return membros
      .map((m) => ({ id: m.user_id, nome: m.full_name?.trim() || t("Atendente") }))
      .filter((m) => !termo || m.nome.toLowerCase().includes(termo))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [membros, busca, t]);

  const aoConflito = (err: unknown) => {
    const status = (err as { status?: number }).status;
    if (status === 409) toast.error(t("O atendente já foi alterado por outro usuário!"));
  };
  const escolher = (id: string | null) => {
    setAberto(false);
    if (id === atualId) return;
    if (id === null) {
      liberar.mutate({ conversation_id: conversa.id }, { onError: aoConflito });
    } else if (id === user.id) {
      reivindicar.mutate({ conversation_id: conversa.id, expected_assignee: atualId }, { onError: aoConflito });
    } else {
      transferir.mutate({ conversation_id: conversa.id, to_user_id: id }, { onError: aoConflito });
    }
  };
  const podeLiberar = atualId === null || souOAtendente;

  return (
    <Popover.Root open={aberto} onOpenChange={(o) => { setAberto(o); if (!o) setBusca(""); }}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={ocupado}
          className="flex h-8 max-w-[220px] items-center gap-2 rounded-casca-gatilho px-2 text-[12px] text-casca-texto hover:bg-casca-raia disabled:opacity-60"
          aria-label={`${t("Atendente")}: ${nomeAtual}`}
        >
          {atualId ? <Inicial nome={nomeAtual} /> : <UserX size={16} aria-hidden className="text-casca-suave" />}
          <span className="truncate">{nomeAtual}</span>
          <ChevronDown size={14} aria-hidden className="shrink-0 text-casca-chevron" />
        </button>
      </Popover.Trigger>
      <PainelSuspenso align="end" className="w-[250px] p-0">
        <div className="flex h-8 items-center gap-2 border-b border-casca-borda px-3">
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por…")}
            aria-label={t("Buscar atendente")}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
          <Search size={14} aria-hidden className="text-casca-suave" />
        </div>
        <ul role="listbox" aria-label={t("Atendente")} className="max-h-[288px] overflow-y-auto py-1">
          <li
            role="option"
            aria-selected={atualId === null}
            aria-disabled={!podeLiberar}
            title={podeLiberar ? undefined : t("Só o atendente atual pode liberar a conversa.")}
            className={LINHA}
            onClick={() => podeLiberar && escolher(null)}
          >
            <UserX size={16} aria-hidden className="text-casca-suave" />
            <span className="flex-1">{t("Sem atendente")}</span>
            {atualId === null ? <Check size={14} aria-hidden className="text-casca-marca" /> : null}
          </li>
          {lista.map((m) => (
            <li key={m.id} role="option" aria-selected={m.id === atualId} className={cn(LINHA)} onClick={() => escolher(m.id)}>
              <Inicial nome={m.nome} />
              <span className="flex-1 truncate">{m.nome}</span>
              {m.id === atualId ? <Check size={14} aria-hidden className="text-casca-marca" /> : null}
            </li>
          ))}
          {lista.length === 0 ? <li className="px-3 py-2 text-[12px] text-casca-suave">{t("Nenhum atendente encontrado")}</li> : null}
        </ul>
      </PainelSuspenso>
    </Popover.Root>
  );
}
```

`corDoAvatar`/`inicialDoNome`: confira onde a 2A as exporta (`grep -rn "export function corDoAvatar" lib components`) e ajuste o import. Se o `useAuth().user` não tiver `full_name`, não é usado aqui (só `id`).

- [ ] **Step 5: O cabeçalho**

Create `components/escale/conversas/centro/CabecalhoDaConversa.tsx`:

```tsx
"use client";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { toast } from "sonner";

import { FotoDaConversa } from "@/components/escale/conversas/fila/FotoDaConversa";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { rotuloDoCanal } from "@/lib/escale/conversas/linha";
import { Copy, Ellipsis, Instagram, MailOpen, MessageSquare, Search } from "@/lib/ui/icons-da-casca";

import { SeletorDeAtendente } from "./SeletorDeAtendente";

const ITEM = "flex h-9 w-full items-center gap-3 px-3 text-left text-[12px] text-casca-texto hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50";

/**
 * O CABEÇALHO DA CONVERSA (c02, c03; C1): foto 40px, nome 13px/600, o canal
 * e o dispositivo em 11px, o seletor de atendente, a busca e o ⋮ "Mais".
 * `rotuloDoCanal` (3A) dá "WhatsApp"/"Instagram" a partir do provider e da
 * plataforma social.
 */
export function CabecalhoDaConversa({
  conversa,
  aoAbrirConversa,
  aoBuscar,
  buscaAberta,
  naoLidaManual,
  aoMarcarNaoLida,
}: {
  conversa: ConversationWithContact;
  aoAbrirConversa: (id: string | null) => void;
  aoBuscar: () => void;
  buscaAberta: boolean;
  naoLidaManual: boolean;
  aoMarcarNaoLida: () => void;
}) {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const nome = conversa.contacts?.name?.trim() || conversa.contacts?.display_name?.trim() || conversa.contacts?.phone_number || t("Contato");
  const canal = rotuloDoCanal(conversa.channel_sessions ?? null);
  const dispositivo = conversa.channel_sessions?.display_name?.trim() || conversa.channel_sessions?.phone_number || "";
  const ehInstagram = conversa.channel_sessions?.social_platform === "instagram";
  const usuarioDoInstagram = (conversa.contacts as { instagram_username?: string | null } | null | undefined)?.instagram_username ?? null;

  const copiarLink = async () => {
    setMenu(false);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/app/inbox?id=${conversa.id}`);
      toast.success(t("O link foi copiado para a área de transferência!"));
    } catch {
      toast.error(t("Não foi possível copiar o link."));
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-casca-borda px-4" data-testid="cabecalho-da-conversa">
      <FotoDaConversa conversa={conversa} tamanho="topo" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-casca-texto">{nome}</div>
        <div className="truncate text-[11px] text-casca-suave">{dispositivo ? `${canal} - ${dispositivo}` : canal}</div>
      </div>
      <SeletorDeAtendente conversa={conversa} />
      <BotaoDaCasca variante="icone" tamanho="sm" aria-label={t("Buscar nesta conversa")} title={t("Buscar nesta conversa")} aria-pressed={buscaAberta} onClick={aoBuscar}>
        <Search size={16} aria-hidden />
      </BotaoDaCasca>
      <Popover.Root open={menu} onOpenChange={setMenu}>
        <Popover.Trigger asChild>
          <BotaoDaCasca variante="icone" tamanho="sm" aria-label={t("Mais")} title={t("Mais")}>
            <Ellipsis size={16} aria-hidden />
          </BotaoDaCasca>
        </Popover.Trigger>
        <PainelSuspenso align="end" className="w-[190px] py-1">
          <button type="button" className={ITEM} onClick={() => { setMenu(false); aoAbrirConversa(null); }}>
            <MessageSquare size={16} aria-hidden className="text-casca-suave" />
            {t("Iniciar uma conversa")}
          </button>
          <button type="button" className={ITEM} onClick={copiarLink}>
            <Copy size={16} aria-hidden className="text-casca-suave" />
            {t("Copiar link da conversa")}
          </button>
          <button type="button" className={ITEM} disabled={naoLidaManual} onClick={() => { setMenu(false); aoMarcarNaoLida(); }}>
            <MailOpen size={16} aria-hidden className="text-casca-suave" />
            {t("Marcar como não lida")}
          </button>
          {ehInstagram ? (
            <a
              className={ITEM}
              aria-disabled={!usuarioDoInstagram}
              href={usuarioDoInstagram ? `https://instagram.com/${usuarioDoInstagram}` : undefined}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenu(false)}
            >
              <Instagram size={16} aria-hidden className="text-casca-suave" />
              {t("Abrir no Instagram")}
            </a>
          ) : null}
        </PainelSuspenso>
      </Popover.Root>
    </header>
  );
}
```

"Iniciar uma conversa" chama `aoAbrirConversa(null)`: na 3A, `ConversasDaCasca` trata `null` como "abrir o modo nova conversa" (confira em `ConversasDaCasca.tsx` o que `aoAbrirConversa(null)` faz; se ele só desseleciona, acrescente lá `setModo("nova")` quando `id === null` — é a única alteração na casca e está na lista de arquivos alterados).

`rotuloDoCanal`: se a 3A não exportou essa função em `lib/escale/conversas/linha.ts`, crie-a lá:

```ts
/** "WhatsApp" ou "Instagram" (c02): pela plataforma social; o provider nunca é nomeado na tela. */
export function rotuloDoCanal(canal: { social_platform?: string | null } | null): string {
  return canal?.social_platform === "instagram" ? "Instagram" : "WhatsApp";
}
```

- [ ] **Step 6: A barra de status**

Create `components/escale/conversas/centro/BarraDeStatus.tsx`:

```tsx
"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useConversaDaCasca } from "@/hooks/escale/useConversaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { estadoDaJanela } from "@/lib/channels/janela";
import { emEsperaDaCasca } from "@/lib/escale/conversas/espera";
import { seloDaJanela } from "@/lib/escale/conversas/janela";
import { CheckCircle2, Clock, Hourglass, RotateCcw } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const TOM: Record<"aberta" | "fechada" | "aguardando", string> = {
  aberta: "bg-casca-marca-suave text-casca-marca",
  fechada: "bg-casca-atraso text-casca-alerta",
  aguardando: "bg-casca-raia text-casca-suave",
};

/**
 * A BARRA DE STATUS (c05, c56, c58, c60, c73; C2): o selo da janela à
 * esquerda e, à direita, espera e encerrar. Os eventos nascem nas rotas do
 * fork (N3, N4), nunca nos hooks do original.
 */
export function BarraDeStatus({
  conversa,
  ultimaFoiTemplate,
  agora,
}: {
  conversa: ConversationWithContact;
  ultimaFoiTemplate: boolean;
  agora: Date;
}) {
  const t = useT();
  const acoes = useConversaDaCasca(conversa.id);
  const provider = conversa.channel_sessions?.provider ?? null;
  const selo = seloDaJanela(estadoDaJanela(provider, conversa.last_inbound_at ?? null, agora), provider, ultimaFoiTemplate, t);
  const emEspera = emEsperaDaCasca(conversa.snooze_until ?? null, conversa.metadata ?? null);
  const fechada = conversa.status === "closed";
  const ocupado = acoes.entrarEmEspera.isPending || acoes.sairDaEspera.isPending || acoes.encerrar.isPending || acoes.reabrir.isPending;

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-casca-borda px-4" data-testid="barra-de-status">
      {selo ? (
        <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium", TOM[selo.tom])}>
          <Clock size={14} aria-hidden />
          {selo.texto}
        </span>
      ) : null}
      <span className="flex-1" />
      {!fechada ? (
        <BotaoDaCasca
          variante="icone"
          tamanho="sm"
          disabled={ocupado}
          aria-pressed={emEspera}
          aria-label={emEspera ? t("Remover espera") : t("Colocar em espera")}
          title={emEspera ? t("Remover espera") : t("Colocar em espera")}
          className={emEspera ? "text-casca-marca" : undefined}
          onClick={() => (emEspera ? acoes.sairDaEspera.mutate() : acoes.entrarEmEspera.mutate())}
        >
          <Hourglass size={16} aria-hidden />
        </BotaoDaCasca>
      ) : null}
      <BotaoDaCasca
        variante="icone"
        tamanho="sm"
        disabled={ocupado}
        aria-label={fechada ? t("Reabrir atendimento") : t("Encerrar atendimento")}
        title={fechada ? t("Reabrir atendimento") : t("Encerrar atendimento")}
        onClick={() => (fechada ? acoes.reabrir.mutate() : acoes.encerrar.mutate({ expected_revision: conversa.service_revision }))}
      >
        {fechada ? <RotateCcw size={16} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
      </BotaoDaCasca>
    </div>
  );
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-cabecalho-da-conversa.test.tsx && corepack pnpm prettier --write components/escale/conversas/centro/CabecalhoDaConversa.tsx components/escale/conversas/centro/SeletorDeAtendente.tsx components/escale/conversas/centro/BarraDeStatus.tsx tests/unit/escale-cabecalho-da-conversa.test.tsx && corepack pnpm eslint components/escale/conversas/centro lib/ui/icons-da-casca.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/escale/conversas/centro/CabecalhoDaConversa.tsx components/escale/conversas/centro/SeletorDeAtendente.tsx components/escale/conversas/centro/BarraDeStatus.tsx lib/escale/conversas/linha.ts lib/ui/icons-da-casca.ts app/escale-tema.css app/globals.css tests/unit/escale-cabecalho-da-conversa.test.tsx
git commit -m "feat(escale): cabeçalho, seletor de atendente e barra de status da conversa (Fase 3B)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 7: A thread da Clint (C4)

**Files:**
- Create: `components/escale/conversas/centro/thread/ThreadDaCasca.tsx`, `BalaoDaCasca.tsx`, `EventoDaThread.tsx`, `NotaDaThread.tsx`, `CartaoDeAnuncio.tsx`, `SeparadorDeDia.tsx`, `tests/unit/escale-thread-da-casca.test.tsx`

**Interfaces:**
- Consumes: `useMessagesRealtime(id)` (infinite query: `data.pages[].data: Message[]`, `hasNextPage`, `fetchNextPage`, `isFetchingNextPage`), `useConversationNotes(id)` (`.data: Note[]`), `usePassagensDaConversa(id)` → `PassagemDaConversa[]` + `montarCartoesDaPassagem` (`lib/escalacao/cartao-da-passagem`, como `ChatThread` faz na linha ~163), `useConversaDaCasca(id).eventos`, `useAssignableMembers(true)` (ids → nomes), `useAlterarMensagem(id)` (`editar`, `apagar`, `ocultar`, `restaurar`), `useSendMessage` (reenviar), `MediaRenderer({ message, agora })`, `PassagemCard` (o cartão do original, mantido), `juntarItens`, `rotuloDoDia`, `textoDoEvento`.
- Produces: `ThreadDaCasca({ conversationId, conversa, searchTerm?, aoResponder?, compacto? })` (a 3E usa `compacto`); `ultimaMensagem(pages)` helper exportado de `ThreadDaCasca.tsx`: a última `Message` da thread (para `ultimaFoiTemplate` em `ConversaAberta`).
- `BalaoDaCasca({ message, viewerUserId, nomes, searchTerm, aoResponder, aoEditar, aoApagarParaTodos, aoApagarParaMim, aoRestaurar, aoReenviar, agora })`.

Abra c02, c56, c59 e c73 antes de escrever. Medidas: fundo `bg-casca-painel-chat`, `px-6 py-4`; bolha máx. 65%, canto 8px (a ponta do lado de quem fala quadrada: `rounded-tl-none` entrada, `rounded-tr-none` saída), entrada `bg-white border border-casca-borda`, saída `bg-casca-caixa-msg border border-casca-borda-msg`; texto 13px `casca-texto`; rodapé 11px `casca-meta` com hora e o ✓✓; "Editada"/"Encaminhada" 11px itálico antes da hora; o menu ⌄ aparece no hover (`group-hover`), 24×24 no canto superior direito da bolha.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-thread-da-casca.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BalaoDaCasca } from "@/components/escale/conversas/centro/thread/BalaoDaCasca";
import { EventoDaThread } from "@/components/escale/conversas/centro/thread/EventoDaThread";
import { ThreadDaCasca, ultimaMensagem } from "@/components/escale/conversas/centro/thread/ThreadDaCasca";
import type { Message } from "@/lib/types/messaging";

vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: "agent" } }), usePermission: () => true }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useLocaleDeData: () => "pt-BR" }));
vi.mock("@/components/inbox/media/MediaRenderer", () => ({ MediaRenderer: ({ message }: { message: Message }) => <div data-testid={`midia-${message.id}`} /> }));
vi.mock("@/components/inbox/PassagemCard", () => ({ PassagemCard: () => <div data-testid="passagem" /> }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [{ user_id: "u1", role: "agent", full_name: "Eu" }, { user_id: "u2", role: "agent", full_name: "Bia" }] }) }));
const mensagens: Message[] = [];
vi.mock("@/hooks/inbox/useMessagesRealtime", () => ({ useMessagesRealtime: () => ({ data: { pages: [{ data: mensagens, meta: { has_more: false, cursor: null } }] }, hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false, isLoading: false }) }));
vi.mock("@/hooks/inbox/useConversationNotes", () => ({ useConversationNotes: () => ({ data: [{ id: "n1", conversation_id: "c1", body: "Cliente pediu desconto", created_by_user_id: "u1", created_by_name: "Eu", created_at: "2026-10-18T12:30:00Z" }] }) }));
vi.mock("@/hooks/inbox/usePassagensDaConversa", () => ({ usePassagensDaConversa: () => [] }));
vi.mock("@/hooks/escale/useConversaDaCasca", () => ({ useConversaDaCasca: () => ({ eventos: [{ id: "e1", tipo: "espera", em: "2026-10-18T13:00:00Z", user_id: "u2" }], carregandoEventos: false }) }));
vi.mock("@/hooks/inbox/useAlterarMensagem", () => ({ useAlterarMensagem: () => ({ editar: { mutateAsync: vi.fn() }, apagar: { mutateAsync: vi.fn() }, ocultar: { mutateAsync: vi.fn() }, restaurar: { mutateAsync: vi.fn() } }) }));
const reenviar = vi.fn();
vi.mock("@/hooks/inbox/useSendMessage", () => ({ useSendMessage: () => ({ mutate: reenviar, isPending: false }) }));

const msg = (extra: Partial<Message>): Message =>
  ({
    id: "m1", organization_id: "o1", conversation_id: "c1", channel_session_id: "cs", contact_id: "ct", external_id: null, type: "text",
    direction: "inbound", status: "delivered", ack: null, error_code: null, error_message: null, body: "Olá", media_url: null, media_mime: null,
    media_size_bytes: null, media_storage_path: null, sent_via: "external_device", sent_by_user_id: null, sent_at: "2026-10-18T12:00:00Z",
    delivered_at: null, read_at: null, metadata: {}, edited_at: null, revoked_at: null, reply_to_message_id: null, created_at: "2026-10-18T12:00:00Z",
    ...extra,
  }) as Message;
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
const nomes = new Map([["u1", "Eu"], ["u2", "Bia"]]);
const semAcao = { aoResponder: vi.fn(), aoEditar: vi.fn(), aoApagarParaTodos: vi.fn(), aoApagarParaMim: vi.fn(), aoRestaurar: vi.fn(), aoReenviar: vi.fn() };

beforeEach(() => {
  qc = new QueryClient();
  mensagens.length = 0;
  reenviar.mockClear();
});

describe("ThreadDaCasca", () => {
  it("intercala mensagens, notas e eventos por hora, com o separador do dia e 'Ler mais' no anúncio", () => {
    mensagens.push(
      msg({ id: "m1", metadata: { referral: { headline: "Promoção de outubro", body: "Compre agora", source_url: "https://fb.com/ad/1", image_url: "https://img/1.jpg" } } }),
      msg({ id: "m2", direction: "outbound", sent_via: "user", sent_by_user_id: "u1", body: "Oi, Ana", sent_at: "2026-10-18T12:10:00Z", status: "read" }),
    );
    wrap(<ThreadDaCasca conversationId="c1" conversa={{ status: "open", contacts: { name: "Ana" } } as never} />);
    const textos = screen.getAllByTestId(/^item-/).map((el) => el.getAttribute("data-testid"));
    expect(textos).toEqual(["item-message-m1", "item-message-m2", "item-note-n1", "item-evento-e1"]);
    expect(screen.getByText("Anúncio")).toBeInTheDocument();
    expect(screen.getByText("Promoção de outubro")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver anúncio" })).toHaveAttribute("href", "https://fb.com/ad/1");
    expect(screen.getByText("Cliente pediu desconto")).toBeInTheDocument();
    expect(screen.getByText(/Bia/)).toBeInTheDocument();
    expect(screen.getByText(/colocou o atendimento em espera/)).toBeInTheDocument();
    expect(screen.getByText(/18\/10\/2026|Hoje|Ontem/)).toBeInTheDocument();
    expect(ultimaMensagem([{ data: mensagens, meta: { has_more: false, cursor: null } }])?.id).toBe("m2");
  });
});

describe("BalaoDaCasca", () => {
  it("saída com 'Editada', ✓✓ e o menu com Editar/Apagar; entrada com Responder e Apagar para mim; falha com Reenviar", () => {
    const { rerender } = wrap(<BalaoDaCasca message={msg({ direction: "outbound", sent_via: "user", sent_by_user_id: "u1", edited_at: "2026-10-18T12:05:00Z", status: "read" })} viewerUserId="u1" nomes={nomes} searchTerm="" agora={Date.now()} {...semAcao} />);
    expect(screen.getByText("Editada")).toBeInTheDocument();
    expect(screen.getByLabelText("Lida")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Opções da mensagem" }));
    expect(screen.getByText("Editar")).toBeInTheDocument();
    expect(screen.getByText("Apagar para todos")).toBeInTheDocument();
    rerender(<QueryClientProvider client={qc}><BalaoDaCasca message={msg({ metadata: { forwarded: true } })} viewerUserId="u1" nomes={nomes} searchTerm="" agora={Date.now()} {...semAcao} /></QueryClientProvider>);
    expect(screen.getByText("Encaminhada")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Opções da mensagem" }));
    expect(screen.getByText("Responder")).toBeInTheDocument();
    expect(screen.getByText("Apagar para mim")).toBeInTheDocument();
    expect(screen.queryByText("Editar")).toBeNull();
    rerender(<QueryClientProvider client={qc}><BalaoDaCasca message={msg({ direction: "outbound", status: "failed", error_message: "Número inválido" })} viewerUserId="u1" nomes={nomes} searchTerm="" agora={Date.now()} {...semAcao} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Reenviar" }));
    expect(semAcao.aoReenviar).toHaveBeenCalled();
    rerender(<QueryClientProvider client={qc}><BalaoDaCasca message={msg({ revoked_at: "2026-10-18T12:07:00Z" })} viewerUserId="u1" nomes={nomes} searchTerm="" agora={Date.now()} {...semAcao} /></QueryClientProvider>);
    expect(screen.getByText("Esta mensagem foi apagada")).toBeInTheDocument();
  });
});

describe("EventoDaThread", () => {
  it("'iniciou o atendimento' quando o claim veio do vazio; 'alterado de X para Y' nas transferências", () => {
    const { rerender } = wrap(<EventoDaThread evento={{ id: "a", tipo: "atendente", em: "2026-10-18T10:00:00Z", user_id: "u1", de_user_id: null, para_user_id: "u1", reason: "claim" }} nomes={nomes} />);
    expect(screen.getByText(/iniciou o atendimento/)).toBeInTheDocument();
    rerender(<QueryClientProvider client={qc}><EventoDaThread evento={{ id: "b", tipo: "atendente", em: "2026-10-18T10:00:00Z", user_id: "u1", de_user_id: "u1", para_user_id: "u2", reason: "transfer" }} nomes={nomes} /></QueryClientProvider>);
    expect(screen.getByText(/O atendimento foi alterado de/)).toBeInTheDocument();
    expect(screen.getByText("Bia")).toBeInTheDocument();
  });
});
```

Confira em `lib/escale/conversas/eventos.ts` (Task 1) os nomes dos campos do evento de atribuição (`de_user_id`, `para_user_id`, `reason`) e alinhe o teste.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-thread-da-casca.test.tsx`
Expected: FAIL.

- [ ] **Step 3: As peças pequenas**

Create `components/escale/conversas/centro/thread/SeparadorDeDia.tsx`:

```tsx
/** O separador de dia (c56): linha dos dois lados e "HOJE"/"ONTEM"/dd/mm/aaaa em 11px. */
export function SeparadorDeDia({ rotulo }: { rotulo: string }) {
  return (
    <div className="my-3 flex items-center gap-3" role="separator" aria-label={rotulo}>
      <span className="h-px flex-1 bg-casca-borda" />
      <span className="text-[11px] font-medium uppercase tracking-wide text-casca-suave">{rotulo}</span>
      <span className="h-px flex-1 bg-casca-borda" />
    </div>
  );
}
```

Create `components/escale/conversas/centro/thread/EventoDaThread.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import { textoDoEvento, type EventoDaConversa } from "@/lib/escale/conversas/eventos";

/** "{pessoa} colocou o atendimento em espera - 13:00" (c56; C2): centrado, 11px, os nomes em 600. */
export function EventoDaThread({ evento, nomes }: { evento: EventoDaConversa; nomes: ReadonlyMap<string, string> }) {
  const t = useT();
  const { partes, hora } = textoDoEvento(evento, nomes, t);
  return (
    <div className="my-2 text-center text-[11px] text-casca-suave" data-testid={`item-evento-${evento.id}`}>
      {partes.map((p, i) => (
        <span key={i} className={p.forte ? "font-semibold text-casca-texto-2" : undefined}>
          {p.texto}
        </span>
      ))}
      <span>{` - ${hora}`}</span>
    </div>
  );
}
```

Create `components/escale/conversas/centro/thread/NotaDaThread.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import type { Note } from "@/lib/types/messaging";
import { PenLine } from "@/lib/ui/icons-da-casca";

const hora = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** A nota interna na thread (c12 depois de salva): caixa amarela à direita, "Nota interna · {quem}". */
export function NotaDaThread({ nota }: { nota: Note }) {
  const t = useT();
  return (
    <div className="my-1 flex justify-end" data-testid={`item-note-${nota.id}`}>
      <div className="max-w-[65%] rounded-lg rounded-tr-none border border-casca-nota-borda bg-casca-nota px-3 py-2">
        <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-casca-pausa-texto">
          <PenLine size={12} aria-hidden />
          {t("Nota interna")}
          {nota.created_by_name ? ` · ${nota.created_by_name}` : ""}
        </div>
        <p className="whitespace-pre-wrap text-[13px] text-casca-texto">{nota.body}</p>
        <div className="mt-1 text-right text-[11px] text-casca-meta">{hora(nota.created_at)}</div>
      </div>
    </div>
  );
}
```

Create `components/escale/conversas/centro/thread/CartaoDeAnuncio.tsx`:

```tsx
"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { ExternalLink } from "@/lib/ui/icons-da-casca";

export interface AnuncioDaMensagem {
  headline?: string | null;
  body?: string | null;
  source_url?: string | null;
  image_url?: string | null;
}

/** Lê `message.metadata.referral` (o objeto da Meta que `extrairAtribuicaoMeta` já conhece). */
export function anuncioDaMensagem(metadata: Record<string, unknown> | null | undefined): AnuncioDaMensagem | null {
  const r = metadata?.referral;
  if (!r || typeof r !== "object") return null;
  const a = r as AnuncioDaMensagem;
  return a.headline || a.body || a.source_url ? a : null;
}

const CORPO_CURTO = 120;

/** O cartão "Anúncio" acima da primeira mensagem vinda de um clique em anúncio (c02): imagem, título, texto com "Ler mais", "Ver anúncio". */
export function CartaoDeAnuncio({ anuncio }: { anuncio: AnuncioDaMensagem }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const corpo = anuncio.body ?? "";
  const longo = corpo.length > CORPO_CURTO;
  return (
    <div className="mb-2 overflow-hidden rounded-lg border border-casca-borda bg-white" data-testid="cartao-de-anuncio">
      {anuncio.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={anuncio.image_url} alt="" className="h-28 w-full object-cover" />
      ) : null}
      <div className="px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-casca-sobrelinha">{t("Anúncio")}</div>
        {anuncio.headline ? <div className="text-[13px] font-semibold text-casca-texto">{anuncio.headline}</div> : null}
        {corpo ? (
          <p className="text-[12px] text-casca-suave">
            {aberto || !longo ? corpo : `${corpo.slice(0, CORPO_CURTO)}… `}
            {longo && !aberto ? (
              <button type="button" className="font-medium text-casca-marca" onClick={() => setAberto(true)}>
                {t("Ler mais")}
              </button>
            ) : null}
          </p>
        ) : null}
        {anuncio.source_url ? (
          <a href={anuncio.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-casca-marca">
            {t("Ver anúncio")}
            <ExternalLink size={12} aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: A bolha**

Create `components/escale/conversas/centro/thread/BalaoDaCasca.tsx`:

```tsx
"use client";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { MediaRenderer } from "@/components/inbox/media/MediaRenderer";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useT } from "@/hooks/i18n/useT";
import type { Message } from "@/lib/types/messaging";
import { Check, CheckCheck, ChevronDown, RotateCcw } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CartaoDeAnuncio, anuncioDaMensagem } from "./CartaoDeAnuncio";

const EDICAO_MAX_MS = 15 * 60_000;
const ITEM = "flex h-8 w-full items-center px-3 text-left text-[12px] text-casca-texto hover:bg-casca-raia";
const hora = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Ack({ status, t }: { status: string; t: (s: string) => string }) {
  if (status === "read") return <CheckCheck size={12} aria-label={t("Lida")} className="text-casca-novo" />;
  if (status === "delivered") return <CheckCheck size={12} aria-label={t("Entregue")} className="text-casca-meta" />;
  if (status === "sent") return <Check size={12} aria-label={t("Enviada")} className="text-casca-meta" />;
  return null;
}

/** Destaca o termo da busca no texto (a busca "nesta conversa" do cabeçalho). */
function Realce({ texto, termo }: { texto: string; termo: string }) {
  if (!termo.trim()) return <>{texto}</>;
  const partes = texto.split(new RegExp(`(${termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return (
    <>
      {partes.map((p, i) => (p.toLowerCase() === termo.toLowerCase() ? <mark key={i} className="rounded bg-casca-atencao/40">{p}</mark> : <span key={i}>{p}</span>))}
    </>
  );
}

export interface AcoesDaBolha {
  aoResponder: (m: Message) => void;
  aoEditar: (m: Message, texto: string) => void;
  aoApagarParaTodos: (m: Message) => void;
  aoApagarParaMim: (m: Message) => void;
  aoRestaurar: (m: Message) => void;
  aoReenviar: (m: Message) => void;
}

/**
 * A BOLHA DA CLINT (c02, c56, c59; C4; N14): entrada branca à esquerda, saída
 * `casca-caixa-msg` à direita; "Editada"/"Encaminhada" antes da hora; o menu ⌄
 * no hover com Responder, Editar (15 min, texto nosso), Apagar para mim
 * (ocultar), Apagar para todos (revogar). A mídia é o `MediaRenderer` do
 * original; a transcrição do áudio aparece abaixo dele.
 */
export function BalaoDaCasca({
  message,
  viewerUserId,
  nomes,
  searchTerm,
  agora,
  aoResponder,
  aoEditar,
  aoApagarParaTodos,
  aoApagarParaMim,
  aoRestaurar,
  aoReenviar,
}: {
  message: Message;
  viewerUserId: string | null;
  nomes: ReadonlyMap<string, string>;
  searchTerm: string;
  agora: number;
} & AcoesDaBolha) {
  const t = useT();
  const [menu, setMenu] = useState(false);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(message.body ?? "");
  const saida = message.direction === "outbound";
  const oculta = !!(message.metadata as { crm_hidden_at?: string } | null)?.crm_hidden_at;
  const revogada = !!message.revoked_at;
  const falhou = message.status === "failed";
  const anuncio = !saida ? anuncioDaMensagem(message.metadata) : null;
  const encaminhada = message.metadata?.forwarded === true || message.metadata?.is_forwarded === true;
  const minha = saida && message.sent_by_user_id === viewerUserId;
  const podeEditar = minha && message.type === "text" && !revogada && agora - Date.parse(message.sent_at) <= EDICAO_MAX_MS;
  const autor = saida
    ? message.sent_by_user_id
      ? (nomes.get(message.sent_by_user_id) ?? t("Atendente"))
      : message.sent_via === "ai" || message.sent_via === "automation"
        ? t("Automação")
        : null
    : null;
  const temMidia = !!message.media_url || !!message.media_storage_path;

  return (
    <div className={cn("my-1 flex", saida ? "justify-end" : "justify-start")} data-testid={`item-message-${message.id}`}>
      <div className="max-w-[65%]">
        {anuncio ? <CartaoDeAnuncio anuncio={anuncio} /> : null}
        <div
          className={cn(
            "group relative rounded-lg border px-3 py-2 text-[13px] text-casca-texto",
            saida ? "rounded-tr-none border-casca-borda-msg bg-casca-caixa-msg" : "rounded-tl-none border-casca-borda bg-white",
            oculta && "opacity-50",
          )}
        >
          {autor ? <div className="mb-0.5 text-[11px] font-medium text-casca-marca">{autor}</div> : null}
          {revogada ? (
            <p className="italic text-casca-suave">{t("Esta mensagem foi apagada")}</p>
          ) : (
            <>
              {temMidia ? <MediaRenderer message={message} agora={agora} /> : null}
              {message.media_derived_text ? <p className="mt-1 text-[12px] italic text-casca-suave">{message.media_derived_text}</p> : null}
              {editando ? (
                <div className="flex flex-col gap-1">
                  <textarea value={texto} onChange={(e) => setTexto(e.target.value)} className="min-h-[60px] rounded border border-casca-borda p-1 text-[13px]" aria-label={t("Editar mensagem")} />
                  <div className="flex justify-end gap-2 text-[12px]">
                    <button type="button" onClick={() => { setEditando(false); setTexto(message.body ?? ""); }}>{t("Cancelar")}</button>
                    <button type="button" className="font-medium text-casca-marca" onClick={() => { setEditando(false); aoEditar(message, texto); }}>{t("Salvar")}</button>
                  </div>
                </div>
              ) : message.body && message.type !== "template" ? (
                <p className="whitespace-pre-wrap break-words"><Realce texto={message.body} termo={searchTerm} /></p>
              ) : message.body ? (
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
              ) : null}
            </>
          )}
          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-casca-meta">
            {message.edited_at ? <span className="italic">{t("Editada")}</span> : null}
            {encaminhada ? <span className="italic">{t("Encaminhada")}</span> : null}
            <span>{hora(message.sent_at)}</span>
            {saida && !falhou ? <Ack status={message.status} t={t} /> : null}
          </div>
          {!revogada ? (
            <Popover.Root open={menu} onOpenChange={setMenu}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  aria-label={t("Opções da mensagem")}
                  className="absolute top-1 right-1 grid size-6 place-items-center rounded text-casca-chevron opacity-0 hover:bg-casca-raia focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                >
                  <ChevronDown size={14} aria-hidden />
                </button>
              </Popover.Trigger>
              <PainelSuspenso align="end" className="w-[170px] py-1">
                <button type="button" className={ITEM} onClick={() => { setMenu(false); aoResponder(message); }}>{t("Responder")}</button>
                {podeEditar ? <button type="button" className={ITEM} onClick={() => { setMenu(false); setEditando(true); }}>{t("Editar")}</button> : null}
                {oculta ? (
                  <button type="button" className={ITEM} onClick={() => { setMenu(false); aoRestaurar(message); }}>{t("Restaurar")}</button>
                ) : (
                  <button type="button" className={ITEM} onClick={() => { setMenu(false); aoApagarParaMim(message); }}>{t("Apagar para mim")}</button>
                )}
                {minha ? <button type="button" className={cn(ITEM, "text-casca-alerta")} onClick={() => { setMenu(false); aoApagarParaTodos(message); }}>{t("Apagar para todos")}</button> : null}
              </PainelSuspenso>
            </Popover.Root>
          ) : null}
        </div>
        {falhou ? (
          <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-casca-alerta">
            <span>{message.error_message ?? t("Não foi possível enviar")}</span>
            <button type="button" className="inline-flex items-center gap-1 font-medium" onClick={() => aoReenviar(message)}>
              <RotateCcw size={12} aria-hidden />
              {t("Reenviar")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

`CheckCheck` é o nome do lucide para o ✓✓; acrescente-o ao bloco de exports de `lib/ui/icons-da-casca.ts` se faltar.

- [ ] **Step 5: A thread**

Create `components/escale/conversas/centro/thread/ThreadDaCasca.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";

import { PassagemCard } from "@/components/inbox/PassagemCard";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useConversaDaCasca } from "@/hooks/escale/useConversaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useAlterarMensagem } from "@/hooks/inbox/useAlterarMensagem";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useClaimConversation } from "@/hooks/inbox/useClaimConversation";
import { useConversationNotes } from "@/hooks/inbox/useConversationNotes";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useMessagesRealtime } from "@/hooks/inbox/useMessagesRealtime";
import { usePassagensDaConversa } from "@/hooks/inbox/usePassagensDaConversa";
import { useSendMessage } from "@/hooks/inbox/useSendMessage";
import { montarCartoesDaPassagem } from "@/lib/escalacao/cartao-da-passagem";
import { juntarItens, rotuloDoDia, type ItemDaThread } from "@/lib/escale/conversas/eventos";
import type { Message } from "@/lib/types/messaging";
import { cn } from "@/lib/utils";

import { BalaoDaCasca } from "./BalaoDaCasca";
import { EventoDaThread } from "./EventoDaThread";
import { NotaDaThread } from "./NotaDaThread";
import { SeparadorDeDia } from "./SeparadorDeDia";

interface PaginaDeMensagens {
  data: Message[];
  meta?: { has_more: boolean; cursor: string | null };
}

/** A última mensagem (por `sent_at`) das páginas carregadas — `ConversaAberta` usa para `ultimaFoiTemplate`. */
export function ultimaMensagem(pages: readonly PaginaDeMensagens[] | undefined): Message | null {
  const todas = pages?.flatMap((p) => p.data) ?? [];
  if (todas.length === 0) return null;
  return todas.reduce((a, b) => (Date.parse(b.sent_at) >= Date.parse(a.sent_at) ? b : a));
}

const diaDe = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * A THREAD DA CLINT (c02, c56; C4; N14): as mensagens, as notas, os cartões
 * de passagem (os do original) e os eventos do fork, intercalados por hora,
 * com o separador de dia. Os hooks são os do original; a 3E entra com
 * `compacto` no painel flutuante e na ficha.
 */
export function ThreadDaCasca({
  conversationId,
  conversa,
  searchTerm = "",
  aoResponder,
  compacto = false,
}: {
  conversationId: string;
  conversa: ConversationWithContact;
  searchTerm?: string;
  aoResponder?: (m: Message) => void;
  compacto?: boolean;
}) {
  const t = useT();
  const { user } = useAuth();
  const q = useMessagesRealtime(conversationId);
  const notas = useConversationNotes(conversationId);
  const passagens = usePassagensDaConversa(conversationId);
  const { eventos } = useConversaDaCasca(conversationId);
  const { data: membros = [] } = useAssignableMembers(true);
  const alterar = useAlterarMensagem(conversationId);
  const enviar = useSendMessage();
  const reivindicar = useClaimConversation();
  const fimRef = useRef<HTMLDivElement | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const nomes = useMemo(() => new Map(membros.map((m) => [m.user_id, m.full_name?.trim() || t("Atendente")])), [membros, t]);
  const mensagens = useMemo(() => q.data?.pages.flatMap((p) => p.data) ?? [], [q.data]);
  const cartoes = useMemo(() => montarCartoesDaPassagem(passagens), [passagens]);
  const itens = useMemo(() => juntarItens(mensagens, notas.data ?? [], cartoes, eventos), [mensagens, notas.data, cartoes, eventos]);

  const ultimaId = mensagens.at(-1)?.id;
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [conversationId, ultimaId]);

  const acoes = {
    aoResponder: (m: Message) => aoResponder?.(m),
    aoEditar: (m: Message, texto: string) => void alterar.editar.mutateAsync({ id: m.id, text: texto }),
    aoApagarParaTodos: (m: Message) => void alterar.apagar.mutateAsync(m.id),
    aoApagarParaMim: (m: Message) => void alterar.ocultar.mutateAsync(m.id),
    aoRestaurar: (m: Message) => void alterar.restaurar.mutateAsync(m.id),
    aoReenviar: (m: Message) =>
      enviar.mutate({
        conversation_id: conversationId,
        type: m.type,
        ...(m.body ? { body: m.body } : {}),
        ...(m.media_storage_path ? { media_storage_path: m.media_storage_path, media_mime: m.media_mime ?? undefined } : {}),
      }),
  };

  let diaAnterior = "";
  const dataDeAgora = new Date(agora);
  return (
    <div className={cn("h-full overflow-y-auto bg-casca-painel-chat", compacto ? "px-3 py-2" : "px-6 py-4")} data-testid="thread-da-casca">
      {q.hasNextPage ? (
        <div className="mb-2 text-center">
          <button type="button" className="text-[12px] font-medium text-casca-marca disabled:opacity-50" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
            {q.isFetchingNextPage ? t("Carregando…") : t("Carregar mais antigas")}
          </button>
        </div>
      ) : null}
      {itens.map((item: ItemDaThread) => {
        const dia = diaDe(item.ts);
        const separador = dia !== diaAnterior ? <SeparadorDeDia key={`dia-${dia}`} rotulo={rotuloDoDia(new Date(item.ts), dataDeAgora, t)} /> : null;
        diaAnterior = dia;
        return (
          <div key={`${item.kind}-${item.data.id}`}>
            {separador}
            {item.kind === "message" ? (
              <BalaoDaCasca message={item.data} viewerUserId={user.id} nomes={nomes} searchTerm={searchTerm} agora={agora} {...acoes} />
            ) : item.kind === "note" ? (
              <NotaDaThread nota={item.data} />
            ) : item.kind === "evento" ? (
              <EventoDaThread evento={item.data} nomes={nomes} />
            ) : (
              <PassagemCard
                cartao={item.data}
                contatoId={conversa.contacts?.id ?? null}
                assumindo={reivindicar.isPending}
                onAssumir={() => reivindicar.mutate({ conversation_id: conversationId, expected_assignee: conversa.assigned_to_user_id ?? null })}
              />
            )}
          </div>
        );
      })}
      {itens.length === 0 && !q.isLoading ? <p className="py-8 text-center text-[12px] text-casca-suave">{t("Nenhuma mensagem ainda.")}</p> : null}
      <div ref={fimRef} />
    </div>
  );
}
```

As props do `PassagemCard` são as que `components/inbox/ChatThread.tsx` (linha ~369) usa: `cartao`, `contatoId`, `assumindo`, `onAssumir`. No teste, acrescente `vi.mock("@/hooks/inbox/useClaimConversation", () => ({ useClaimConversation: () => ({ mutate: vi.fn(), isPending: false }) }))`. Se `item.data.id` não existir no `CartaoDaPassagem`, use `item.ts` como chave.

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-thread-da-casca.test.tsx && corepack pnpm prettier --write components/escale/conversas/centro/thread tests/unit/escale-thread-da-casca.test.tsx && corepack pnpm eslint components/escale/conversas/centro/thread && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/escale/conversas/centro/thread lib/ui/icons-da-casca.ts tests/unit/escale-thread-da-casca.test.tsx
git commit -m "feat(escale): thread da Clint — bolhas, eventos, notas, anúncio, separador (Fase 3B)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 8: O compositor da Clint e as suas janelas (C5–C8, C10, C11), e a troca em `ConversaAberta`

**Files:**
- Create: `components/escale/conversas/centro/compositor/CompositorDaCasca.tsx`, `BarraDeIcones.tsx`, `AvisoForaDaJanela.tsx`, `FaixaAtribuirAMim.tsx`, `PainelRespostasRapidas.tsx`, `JanelaModelosDeMensagem.tsx`, `BalaoDoAssistente.tsx`, `JanelaNotaInterna.tsx`, `tests/unit/escale-compositor-da-casca.test.tsx`
- Modify: `components/escale/conversas/centro/ConversaAberta.tsx` (a troca das peças), `components/escale/conversas/ConversasDaCasca.tsx` (só se `aoAbrirConversa(null)` ainda não abrir o modo "nova"; ver Task 6)

**Interfaces:**
- Consumes: `useSendMessage`, `useUploadMedia`, `useCreateNote`, `useDraftReply`, `useMessageTemplates` (`MessageTemplate {id,title,body,shortcut,owner_user_id}`), `useAssignableMembers`, `useClaimConversation`, `useModelosDeMensagem` (Task 5), `useAgendarMensagens` (Task 5), peças do original: `AttachMenu({disabled,onPick,onPickContact})`, `AttachmentPreviewDialog({file,sending,onCancel,onSend})`, `ContactPickerDialog({open,onOpenChange,excludeContactId,sending,onPick})`, `AudioRecorder({conversationId,disabled})`, `EmojiButton({disabled,onPick})`, `MentionMenu`/`resolverMencao`/`opcoesDeMencao` (`components/inbox/composer/MentionMenu`), `resolveSlash` (`TemplateMenu`), `interpolateTemplate(body, {name, displayName})`, `renderTemplatePreview`, `lerConteudo`, `TemplateFormDialog({open,onOpenChange,canShare,template?})`, `modoDoCompositor`, `NOME_DO_ASSISTENTE`/`CHIPS_DO_ASSISTENTE`.
- Produces: `CompositorDaCasca({ conversationId, conversa, modo, bloqueio, respondendo, aoCancelarResposta, aoAgendar, compacto? })` com `modo: ModoDoCompositor`, `bloqueio: string | null` (o texto de `motivoDoContato` ou do suporte somente leitura); `aoAgendar(texto: string)` abre a janela da Task 9 com o texto já escrito.
- `BarraDeIcones({ acoes: Record<ChaveDoIcone, { onClick?, disabled?, ativo?, title? }>, provider, compacto })` com `ChaveDoIcone = "assistente"|"emoji"|"anexo"|"camera"|"audio"|"respostas"|"modelos"|"nota"|"agendar"|"flow"|"assinatura"`.
- `AvisoForaDaJanela({ modo: "so_modelo"|"outro_modelo"|"aguardando_contato", aoAbrirModelos, aoAbrirAssistente, aoAgendar })`.
- `FaixaAtribuirAMim({ conversa })`: só quando `visibility_mode` da organização é `own`/`own_and_unassigned` e a conversa é de outro (bloqueia) ou de ninguém (oferece "Atribuir a mim").
- `PainelRespostasRapidas({ aberto, aoFechar, termoInicial, contato, aoEscolher(texto) })`.
- `JanelaModelosDeMensagem({ aberta, aoFechar, conversationId, provider, contato })` — envia por `useSendMessage({type:"template",…})` e `marcarUsado`.
- `BalaoDoAssistente({ aberto, aoFechar, conversationId, contato, aoInserir(texto) })`.
- `JanelaNotaInterna({ aberta, aoFechar, conversationId })`.

Abra c02, c09, c10, c11, c12, c13, c56 e c73 antes de escrever.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-compositor-da-casca.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AvisoForaDaJanela } from "@/components/escale/conversas/centro/compositor/AvisoForaDaJanela";
import { CompositorDaCasca } from "@/components/escale/conversas/centro/compositor/CompositorDaCasca";
import { FaixaAtribuirAMim } from "@/components/escale/conversas/centro/compositor/FaixaAtribuirAMim";
import { JanelaNotaInterna } from "@/components/escale/conversas/centro/compositor/JanelaNotaInterna";
import { PainelRespostasRapidas } from "@/components/escale/conversas/centro/compositor/PainelRespostasRapidas";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const enviar = vi.fn();
const criarNota = vi.fn();
const rascunho = vi.fn();
const claim = vi.fn();
let visibilidade = "all";
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1", support: null }, activeOrg: { orgId: "o1", role: "agent", visibility_mode: visibilidade } }),
  usePermission: () => true,
}));
vi.mock("@/hooks/inbox/useSendMessage", () => ({ useSendMessage: () => ({ mutate: enviar, mutateAsync: enviar, isPending: false }) }));
vi.mock("@/hooks/inbox/useCreateNote", () => ({ useCreateNote: () => ({ mutateAsync: criarNota, isPending: false }) }));
vi.mock("@/hooks/inbox/useDraftReply", () => ({ useDraftReply: () => ({ mutateAsync: rascunho, isPending: false }) }));
vi.mock("@/hooks/inbox/useClaimConversation", () => ({ useClaimConversation: () => ({ mutate: claim, isPending: false }) }));
vi.mock("@/hooks/inbox/useUploadMedia", () => ({ useUploadMedia: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [{ user_id: "u2", role: "agent", full_name: "Bia" }] }) }));
vi.mock("@/hooks/inbox/useMessageTemplates", () => ({
  useMessageTemplates: () => ({ data: [
    { id: "t1", title: "Boas-vindas", body: "Olá {{nome}}, tudo bem?", shortcut: "oi", owner_user_id: null },
    { id: "t2", title: "Minha", body: "Só minha", shortcut: "mi", owner_user_id: "u1" },
  ] }),
}));
vi.mock("@/hooks/escale/useModelosDeMensagem", () => ({ useModelosDeMensagem: () => ({ modelos: [], carregando: false, recarregar: vi.fn(), fonte: "oficial", recentes: [], marcarUsado: vi.fn() }) }));
vi.mock("@/components/inbox/composer/AudioRecorder", () => ({ AudioRecorder: () => <button type="button">Gravar áudio</button> }));
vi.mock("@/components/inbox/composer/EmojiButton", () => ({ EmojiButton: ({ onPick }: { onPick: (e: string) => void }) => <button type="button" aria-label="Emoji" onClick={() => onPick("😀")} /> }));
vi.mock("@/app/app/templates/_components/TemplateFormDialog", () => ({ TemplateFormDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="nova-resposta" /> : null) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const conversa = (extra: Partial<ConversationWithContact> = {}): ConversationWithContact =>
  ({
    id: "c1", organization_id: "o1", contact_id: "ct1", channel_session_id: "cs1", status: "open", assigned_to_user_id: "u1", assigned_to_user_name: "Eu",
    last_inbound_at: new Date().toISOString(), last_outbound_at: null, unread_count_for_assignee: 0, metadata: {}, snooze_until: null,
    contacts: { id: "ct1", display_name: "Ana", name: "Ana Souza", phone_number: "+55", tags: [], is_blocked: false, is_anonymized: false, is_personal: false },
    channel_sessions: { phone_number: "+55", display_name: "Comercial", provider: "meta_cloud" },
    ...extra,
  }) as ConversationWithContact;
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  enviar.mockClear(); criarNota.mockClear(); rascunho.mockClear(); claim.mockClear();
  visibilidade = "all";
});

describe("CompositorDaCasca (c02)", () => {
  it("tem os 11 ícones, envia com Enter, insere emoji, abre as respostas com '/', 'Agendar' leva o texto", async () => {
    const aoAgendar = vi.fn();
    wrap(<CompositorDaCasca conversationId="c1" conversa={conversa()} modo="livre" bloqueio={null} respondendo={null} aoCancelarResposta={vi.fn()} aoAgendar={aoAgendar} />);
    for (const nome of ["Assistente IA", "Emoji", "Anexar", "Câmera", "Gravar áudio", "Respostas rápidas", "Modelos de mensagem", "Nota interna", "Agendar mensagem", "Enviar Flow", "Assinatura"]) {
      expect(screen.getByRole("button", { name: nome })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Enviar Flow" })).toHaveAttribute("title", "Em breve");
    const campo = screen.getByPlaceholderText("Mensagem");
    fireEvent.change(campo, { target: { value: "Bom dia" } });
    fireEvent.click(screen.getByRole("button", { name: "Agendar mensagem" }));
    expect(aoAgendar).toHaveBeenCalledWith("Bom dia");
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ conversation_id: "c1", body: "Bom dia", type: "text" }), expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Emoji" }));
    expect((campo as HTMLTextAreaElement).value).toContain("😀");
    fireEvent.change(campo, { target: { value: "/oi" } });
    expect(await screen.findByText("Boas-vindas")).toBeInTheDocument();
  });
  it("com bloqueio mostra o motivo no lugar do campo; fechada mostra 'Reabra o atendimento…'", () => {
    const { rerender } = wrap(<CompositorDaCasca conversationId="c1" conversa={conversa()} modo="livre" bloqueio="Contato bloqueado" respondendo={null} aoCancelarResposta={vi.fn()} aoAgendar={vi.fn()} />);
    expect(screen.getByText("Contato bloqueado")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Mensagem")).toBeNull();
    rerender(<QueryClientProvider client={qc}><CompositorDaCasca conversationId="c1" conversa={conversa({ status: "closed" })} modo="livre" bloqueio={null} respondendo={null} aoCancelarResposta={vi.fn()} aoAgendar={vi.fn()} /></QueryClientProvider>);
    expect(screen.getByText("Reabra o atendimento para responder.")).toBeInTheDocument();
  });
});

describe("AvisoForaDaJanela (c56, c73)", () => {
  it("só modelo, outro modelo e aguardando contato", () => {
    const abrir = vi.fn();
    const { rerender } = wrap(<AvisoForaDaJanela modo="so_modelo" aoAbrirModelos={abrir} aoAbrirAssistente={vi.fn()} aoAgendar={vi.fn()} />);
    expect(screen.getByText("Fora da janela de 24h da Meta")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar modelo de mensagem" }));
    expect(abrir).toHaveBeenCalled();
    rerender(<QueryClientProvider client={qc}><AvisoForaDaJanela modo="outro_modelo" aoAbrirModelos={abrir} aoAbrirAssistente={vi.fn()} aoAgendar={vi.fn()} /></QueryClientProvider>);
    expect(screen.getByText("Enviar outro modelo de mensagem")).toBeInTheDocument();
    rerender(<QueryClientProvider client={qc}><AvisoForaDaJanela modo="aguardando_contato" aoAbrirModelos={abrir} aoAbrirAssistente={vi.fn()} aoAgendar={vi.fn()} /></QueryClientProvider>);
    expect(screen.getByText("Aguarde a resposta do contato para enviar novas mensagens.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /modelo/ })).toBeNull();
  });
});

describe("FaixaAtribuirAMim (C11)", () => {
  it("não aparece com visibilidade total; aparece com 'own' quando a conversa é de outro; oferece 'Atribuir a mim' quando não tem dono", () => {
    const { rerender, container } = wrap(<FaixaAtribuirAMim conversa={conversa({ assigned_to_user_id: "u2" })} />);
    expect(container).toBeEmptyDOMElement();
    visibilidade = "own";
    rerender(<QueryClientProvider client={qc}><FaixaAtribuirAMim conversa={conversa({ assigned_to_user_id: "u2" })} /></QueryClientProvider>);
    expect(screen.getByText("Você só pode responder em conversas atribuídas a você.")).toBeInTheDocument();
    rerender(<QueryClientProvider client={qc}><FaixaAtribuirAMim conversa={conversa({ assigned_to_user_id: null })} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Atribuir a mim" }));
    expect(claim).toHaveBeenCalledWith({ conversation_id: "c1", expected_assignee: null }, expect.anything());
  });
});

describe("PainelRespostasRapidas (c09) e JanelaNotaInterna (c12)", () => {
  it("agrupa Gerais e Minhas, filtra pela busca, interpola {{nome}} ao escolher; a nota salva pelo hook", async () => {
    const escolher = vi.fn();
    wrap(<PainelRespostasRapidas aberto aoFechar={vi.fn()} termoInicial="" contato={{ name: "Ana Souza", displayName: "Ana" }} aoEscolher={escolher} />);
    expect(screen.getByText("Gerais")).toBeInTheDocument();
    expect(screen.getByText("Minhas")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar"), { target: { value: "boas" } });
    expect(screen.queryByText("Minha")).toBeNull();
    fireEvent.click(screen.getByText("Boas-vindas"));
    expect(escolher).toHaveBeenCalledWith("Olá Ana Souza, tudo bem?");
    fireEvent.click(screen.getByRole("button", { name: "Nova resposta" }));
    expect(screen.getByTestId("nova-resposta")).toBeInTheDocument();

    const fechar = vi.fn();
    criarNota.mockResolvedValue({ data: {} });
    wrap(<JanelaNotaInterna aberta aoFechar={fechar} conversationId="c1" />);
    expect(screen.getByText("O contato não vê esta nota, somente você e sua equipe")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Adicione aqui uma anotação do seu atendimento"), { target: { value: "Pediu desconto" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nota" }));
    await waitFor(() => expect(criarNota).toHaveBeenCalledWith({ conversation_id: "c1", body: "Pediu desconto" }));
    expect(fechar).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-compositor-da-casca.test.tsx`
Expected: FAIL.

- [ ] **Step 3: A barra de ícones, o aviso e a faixa**

Create `components/escale/conversas/centro/compositor/BarraDeIcones.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { fonteDeTemplates } from "@/lib/channels/templates-fonte";
import { NOME_DO_ASSISTENTE } from "@/lib/escale/conversas/assistente";
import { AlarmClock, Camera, FileText, Mic, Paperclip, PenLine, Smile, Sparkles, Workflow, Zap } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export type ChaveDoIcone = "assistente" | "emoji" | "anexo" | "camera" | "audio" | "respostas" | "modelos" | "nota" | "agendar" | "flow" | "assinatura";
export interface AcaoDoIcone {
  onClick?: () => void;
  disabled?: boolean;
  ativo?: boolean;
  title?: string;
  /** Quando a peça do original já é um botão (áudio, emoji, anexo), ela entra no lugar do ícone. */
  elemento?: ReactNode;
}

export const BOTAO_DO_ICONE =
  "grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-casca-marca-suave aria-pressed:text-casca-marca";

/** Os 11 ícones do compositor (c02), na ordem da Clint; Flow e assinatura ficam "Em breve". */
export function BarraDeIcones({
  acoes,
  provider,
  compacto = false,
}: {
  acoes: Partial<Record<ChaveDoIcone, AcaoDoIcone>>;
  provider: string | null | undefined;
  compacto?: boolean;
}) {
  const t = useT();
  const temModelos = fonteDeTemplates(provider) !== null;
  const itens: Array<{ chave: ChaveDoIcone; rotulo: string; icone: ReactNode; some?: boolean }> = [
    { chave: "assistente", rotulo: NOME_DO_ASSISTENTE, icone: <Sparkles size={16} aria-hidden /> },
    { chave: "emoji", rotulo: t("Emoji"), icone: <Smile size={16} aria-hidden /> },
    { chave: "anexo", rotulo: t("Anexar"), icone: <Paperclip size={16} aria-hidden /> },
    { chave: "camera", rotulo: t("Câmera"), icone: <Camera size={16} aria-hidden /> },
    { chave: "audio", rotulo: t("Gravar áudio"), icone: <Mic size={16} aria-hidden /> },
    { chave: "respostas", rotulo: t("Respostas rápidas"), icone: <Zap size={16} aria-hidden /> },
    { chave: "modelos", rotulo: t("Modelos de mensagem"), icone: <FileText size={16} aria-hidden />, some: !temModelos },
    { chave: "nota", rotulo: t("Nota interna"), icone: <PenLine size={16} aria-hidden /> },
    { chave: "agendar", rotulo: t("Agendar mensagem"), icone: <AlarmClock size={16} aria-hidden /> },
    { chave: "flow", rotulo: t("Enviar Flow"), icone: <Workflow size={16} aria-hidden />, some: compacto || provider !== "meta_cloud" },
    { chave: "assinatura", rotulo: t("Assinatura"), icone: <PenLine size={16} aria-hidden className="rotate-180" />, some: compacto },
  ];
  return (
    <div className="flex items-center gap-0.5" role="toolbar" aria-label={t("Ferramentas da mensagem")}>
      {itens.filter((i) => !i.some).map((i) => {
        const a = acoes[i.chave] ?? {};
        if (a.elemento) return <span key={i.chave}>{a.elemento}</span>;
        const emBreve = i.chave === "flow" || i.chave === "assinatura";
        return (
          <button
            key={i.chave}
            type="button"
            className={cn(BOTAO_DO_ICONE)}
            aria-label={i.rotulo}
            title={emBreve ? t("Em breve") : (a.title ?? i.rotulo)}
            aria-pressed={a.ativo || undefined}
            disabled={emBreve || a.disabled}
            onClick={a.onClick}
          >
            {i.icone}
          </button>
        );
      })}
    </div>
  );
}
```

Create `components/escale/conversas/centro/compositor/AvisoForaDaJanela.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import { NOME_DO_ASSISTENTE } from "@/lib/escale/conversas/assistente";
import { AlarmClock, Clock, FileText, Lightbulb, Sparkles } from "@/lib/ui/icons-da-casca";

import { BOTAO_DO_ICONE } from "./BarraDeIcones";

/**
 * O COMPOSITOR FORA DA JANELA (c56, c73; C2, C11; N16): o aviso no lugar do
 * campo. Com modelos: "Fora da janela de 24h da Meta" e o botão do modelo;
 * depois de um modelo nosso: "Enviar outro modelo de mensagem"; sem modelos
 * (Instagram): só "Aguarde a resposta do contato…".
 */
export function AvisoForaDaJanela({
  modo,
  aoAbrirModelos,
  aoAbrirAssistente,
  aoAgendar,
}: {
  modo: "so_modelo" | "outro_modelo" | "aguardando_contato";
  aoAbrirModelos: () => void;
  aoAbrirAssistente: () => void;
  aoAgendar: () => void;
}) {
  const t = useT();
  const titulo =
    modo === "so_modelo" ? t("Fora da janela de 24h da Meta") : modo === "outro_modelo" ? t("Enviar outro modelo de mensagem") : t("Janela encerrada");
  const texto =
    modo === "so_modelo"
      ? t("Você só pode enviar mensagens utilizando modelos aprovados.")
      : modo === "outro_modelo"
        ? t("Aguarde a resposta do contato ou envie outro template aprovado.")
        : t("Aguarde a resposta do contato para enviar novas mensagens.");
  return (
    <div className="flex items-center gap-3 border-t border-casca-borda px-4 py-3" data-testid="aviso-fora-da-janela">
      <Clock size={16} aria-hidden className="shrink-0 text-casca-suave" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-casca-texto">{titulo}</div>
        <div className="text-[12px] text-casca-suave">{texto}</div>
      </div>
      {modo !== "aguardando_contato" ? (
        <>
          <button type="button" className={BOTAO_DO_ICONE} aria-label={NOME_DO_ASSISTENTE} title={NOME_DO_ASSISTENTE} onClick={aoAbrirAssistente}>
            <Sparkles size={16} aria-hidden />
          </button>
          <button type="button" className={BOTAO_DO_ICONE} aria-label={t("Sugestões")} title={t("Em breve")} disabled>
            <Lightbulb size={16} aria-hidden />
          </button>
          <button type="button" className={BOTAO_DO_ICONE} aria-label={t("Agendar mensagem")} title={t("Agendar mensagem")} onClick={aoAgendar}>
            <AlarmClock size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-casca-gatilho bg-casca-marca px-3 text-[12px] font-medium text-white hover:opacity-90"
            onClick={aoAbrirModelos}
            aria-label={t("Enviar modelo de mensagem")}
          >
            <FileText size={14} aria-hidden />
            {t("Enviar modelo de mensagem")}
          </button>
        </>
      ) : null}
    </div>
  );
}
```

Create `components/escale/conversas/centro/compositor/FaixaAtribuirAMim.tsx`:

```tsx
"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useClaimConversation } from "@/hooks/inbox/useClaimConversation";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";

const MODOS_RESTRITOS = new Set(["own", "own_and_unassigned"]);

/**
 * "Atribuir a mim · Você só pode responder em conversas atribuídas a você."
 * (C11; N17): só quando a organização restringe a visão (`visibility_mode`)
 * e a conversa não é minha. Sem dono, a faixa oferece assumir; com outro
 * dono, só avisa (a RLS do original já recusa o envio).
 */
export function FaixaAtribuirAMim({ conversa }: { conversa: ConversationWithContact }) {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const reivindicar = useClaimConversation();
  const modo = (activeOrg as { visibility_mode?: string } | null)?.visibility_mode ?? "all";
  if (!MODOS_RESTRITOS.has(modo)) return null;
  if (conversa.assigned_to_user_id === user.id) return null;
  const semDono = !conversa.assigned_to_user_id;
  return (
    <div className="flex items-center gap-3 border-t border-casca-borda bg-casca-busca px-4 py-2 text-[12px] text-casca-suave" data-testid="faixa-atribuir-a-mim">
      <span className="flex-1">{t("Você só pode responder em conversas atribuídas a você.")}</span>
      {semDono ? (
        <BotaoDaCasca variante="marca" tamanho="sm" disabled={reivindicar.isPending} onClick={() => reivindicar.mutate({ conversation_id: conversa.id, expected_assignee: null }, {})}>
          {t("Atribuir a mim")}
        </BotaoDaCasca>
      ) : null}
    </div>
  );
}
```

Confira onde o `visibility_mode` da organização chega ao cliente (`grep -rn "visibility_mode" hooks lib/types app/api/v1/auth`); se o `activeOrg` não o traz, leia de `useQuery(["org-settings"])`/`GET /api/v1/organizations/current` como a tela de configurações faz e ajuste o mock do teste.

- [ ] **Step 4: As respostas rápidas, a nota interna e o assistente**

Create `components/escale/conversas/centro/compositor/PainelRespostasRapidas.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";

import { TemplateFormDialog } from "@/app/app/templates/_components/TemplateFormDialog";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useMessageTemplates, type MessageTemplate } from "@/hooks/inbox/useMessageTemplates";
import { interpolateTemplate, type TemplateContact } from "@/lib/inbox/template-vars";
import { Search, Settings, X } from "@/lib/ui/icons-da-casca";

/**
 * RESPOSTAS RÁPIDAS (c09; C6; N12): os `message_templates` do original em
 * "Gerais" (compartilhadas) e "Minhas". O painel abre acima do compositor,
 * 600×384; "+ Nova resposta" é o `TemplateFormDialog` do original. O filtro
 * por setor fica "Em breve" (3C).
 */
export function PainelRespostasRapidas({
  aberto,
  aoFechar,
  termoInicial,
  contato,
  aoEscolher,
}: {
  aberto: boolean;
  aoFechar: () => void;
  termoInicial: string;
  contato: TemplateContact;
  aoEscolher: (texto: string) => void;
}) {
  const t = useT();
  const { user, activeOrg } = useAuth();
  const { data: respostas = [] } = useMessageTemplates();
  const [busca, setBusca] = useState(termoInicial);
  const [ordem, setOrdem] = useState<"az" | "za">("az");
  const [nova, setNova] = useState(false);
  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const bate = (r: MessageTemplate) =>
      !termo || r.title.toLowerCase().includes(termo) || r.body.toLowerCase().includes(termo) || (r.shortcut ?? "").toLowerCase().includes(termo);
    const ordenar = (a: MessageTemplate, b: MessageTemplate) => (ordem === "az" ? 1 : -1) * a.title.localeCompare(b.title, "pt-BR");
    return {
      gerais: respostas.filter((r) => r.owner_user_id === null && bate(r)).sort(ordenar),
      minhas: respostas.filter((r) => r.owner_user_id === user.id && bate(r)).sort(ordenar),
    };
  }, [respostas, busca, ordem, user.id]);
  if (!aberto) return null;
  const Grupo = ({ titulo, itens }: { titulo: string; itens: MessageTemplate[] }) =>
    itens.length === 0 ? null : (
      <div>
        <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-casca-sobrelinha">{titulo}</div>
        {itens.map((r) => (
          <button key={r.id} type="button" className="flex w-full items-start gap-3 px-4 py-2 text-left hover:bg-casca-raia" onClick={() => aoEscolher(interpolateTemplate(r.body, contato))}>
            <span className="shrink-0 rounded bg-casca-raia px-1.5 py-0.5 font-mono text-[11px] text-casca-suave">/{r.shortcut ?? "—"}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-medium text-casca-texto">{r.title}</span>
              <span className="block truncate text-[11px] text-casca-suave">{r.body}</span>
            </span>
          </button>
        ))}
      </div>
    );
  return (
    <div className="absolute right-4 bottom-full left-4 z-20 mb-2 flex h-[384px] max-w-[600px] flex-col rounded-casca-gatilho border border-casca-borda bg-white shadow-casca-painel" data-testid="respostas-rapidas">
      <div className="flex h-12 items-center gap-2 border-b border-casca-borda px-4">
        <span className="flex-1 text-[13px] font-medium text-casca-texto">{t("Respostas rápidas")}</span>
        <a href="/app/templates" className="grid size-6 place-items-center rounded text-casca-suave hover:bg-casca-raia" aria-label={t("Configurar respostas rápidas")} title={t("Configurar respostas rápidas")}>
          <Settings size={14} aria-hidden />
        </a>
        <BotaoDaCasca variante="texto" tamanho="sm" onClick={() => setNova(true)}>
          + {t("Nova resposta")}
        </BotaoDaCasca>
        <button type="button" className="grid size-6 place-items-center rounded text-casca-suave hover:bg-casca-raia" aria-label={t("Fechar")} onClick={aoFechar}>
          <X size={14} aria-hidden />
        </button>
      </div>
      <div className="flex items-center gap-2 border-b border-casca-borda px-4 py-2">
        <div className="flex h-8 flex-1 items-center gap-2 rounded-casca-gatilho bg-casca-busca px-2">
          <Search size={14} aria-hidden className="text-casca-suave" />
          <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar")} className="min-w-0 flex-1 bg-transparent text-[12px] outline-hidden placeholder:text-casca-meta" />
        </div>
        <SeletorDaCasca valor="todos" opcoes={[{ valor: "todos", rotulo: t("Todos os setores") }]} aoMudar={() => undefined} desabilitado dica={t("Em breve")} aria-label={t("Setor")} />
        <SeletorDaCasca valor={ordem} opcoes={[{ valor: "az", rotulo: `${t("Ordenar por")}: A-Z` }, { valor: "za", rotulo: `${t("Ordenar por")}: Z-A` }]} aoMudar={setOrdem} aria-label={t("Ordenar")} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <Grupo titulo={t("Gerais")} itens={grupos.gerais} />
        <Grupo titulo={t("Minhas")} itens={grupos.minhas} />
        {grupos.gerais.length + grupos.minhas.length === 0 ? <p className="px-4 py-6 text-center text-[12px] text-casca-suave">{t("Nenhuma resposta encontrada")}</p> : null}
      </div>
      <TemplateFormDialog open={nova} onOpenChange={setNova} canShare={activeOrg?.role !== "agent"} />
    </div>
  );
}
```

Create `components/escale/conversas/centro/compositor/JanelaNotaInterna.tsx`:

```tsx
"use client";
import { useState } from "react";

import { BotaoDaJanela, CabecaDaJanela, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useCreateNote } from "@/hooks/inbox/useCreateNote";

/** "Adicionar nota interna" (c12; C8; N15): a janela de 448px com a caixa amarela; salva pelo `useCreateNote` do original. */
export function JanelaNotaInterna({ aberta, aoFechar, conversationId }: { aberta: boolean; aoFechar: () => void; conversationId: string }) {
  const t = useT();
  const criar = useCreateNote();
  const [texto, setTexto] = useState("");
  const fechar = () => { setTexto(""); aoFechar(); };
  const salvar = async () => {
    const body = texto.trim();
    if (!body) return;
    await criar.mutateAsync({ conversation_id: conversationId, body });
    fechar();
  };
  return (
    <JanelaDaCasca aberta={aberta} onFechar={fechar} className="w-[448px]">
      <CabecaDaJanela titulo={t("Adicionar nota interna")} descricao={t("O contato não vê esta nota, somente você e sua equipe")} />
      <textarea
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={t("Adicione aqui uma anotação do seu atendimento")}
        aria-label={t("Nota interna")}
        className="mt-3 h-32 w-full resize-none rounded-casca-gatilho border border-casca-nota-borda bg-casca-nota p-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
      />
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={fechar}>{t("Cancelar")}</BotaoDaJanela>
        <BotaoDaJanela variante="salvar" disabled={!texto.trim() || criar.isPending} onClick={() => void salvar()}>{t("Salvar nota")}</BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

Create `components/escale/conversas/centro/compositor/BalaoDoAssistente.tsx`:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { useT } from "@/hooks/i18n/useT";
import { useDraftReply } from "@/hooks/inbox/useDraftReply";
import { CHIPS_DO_ASSISTENTE, NOME_DO_ASSISTENTE } from "@/lib/escale/conversas/assistente";
import { Send, Sparkles, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O BALÃO DO ASSISTENTE (c11; C10; N13): 380px acima do primeiro ícone.
 * "Sugerir resposta" chama o `draft-reply` do original e põe o texto no campo;
 * os outros chips e a pergunta livre ficam "Em breve".
 */
export function BalaoDoAssistente({
  aberto,
  aoFechar,
  conversationId,
  contato,
  aoInserir,
}: {
  aberto: boolean;
  aoFechar: () => void;
  conversationId: string;
  contato: string;
  aoInserir: (texto: string) => void;
}) {
  const t = useT();
  const sugerir = useDraftReply();
  const [pergunta, setPergunta] = useState("");
  if (!aberto) return null;
  const aoSugerir = async () => {
    const r = await sugerir.mutateAsync(conversationId);
    const texto = r.data.draft?.trim();
    if (!texto) {
      toast.info(t("Não consegui sugerir uma resposta agora."));
      return;
    }
    aoInserir(texto);
    toast.success(t("Sugestão inserida no campo de mensagem."));
    aoFechar();
  };
  return (
    <div className="absolute bottom-full left-4 z-20 mb-2 w-[380px] rounded-casca-gatilho border border-casca-borda bg-white shadow-casca-painel" data-testid="balao-do-assistente">
      <div className="flex items-center gap-3 border-b border-casca-borda px-4 py-3">
        <span className="grid size-8 place-items-center rounded-full bg-casca-marca text-white"><Sparkles size={16} aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-casca-texto">{NOME_DO_ASSISTENTE}</div>
          <div className="truncate text-[11px] text-casca-suave">{contato}</div>
        </div>
        <button type="button" className="grid size-6 place-items-center rounded text-casca-suave hover:bg-casca-raia" aria-label={t("Fechar")} onClick={aoFechar}>
          <X size={14} aria-hidden />
        </button>
      </div>
      <div className="px-4 py-3 text-[12px] text-casca-suave">
        <p className="mb-3">{`${NOME_DO_ASSISTENTE} ${t("agora lê esta conversa")}. ${t("Peça uma sugestão de resposta ou um resumo do atendimento.")}`}</p>
        <div className="flex flex-wrap gap-2">
          {CHIPS_DO_ASSISTENTE.map((c) => (
            <button
              key={c.chave}
              type="button"
              disabled={!c.disponivel || sugerir.isPending}
              title={c.disponivel ? undefined : t("Em breve")}
              className={cn("h-7 rounded-full border border-casca-borda px-3 text-[12px] text-casca-texto hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50")}
              onClick={c.chave === "sugerir" ? () => void aoSugerir() : undefined}
            >
              {sugerir.isPending && c.chave === "sugerir" ? t("Pensando…") : t(c.rotulo)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-casca-borda px-4 py-2">
        <input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder={t("Pergunte sobre esta conversa…")} disabled title={t("Em breve")} className="min-w-0 flex-1 bg-transparent text-[12px] outline-hidden placeholder:text-casca-meta disabled:opacity-60" />
        <button type="button" disabled title={t("Em breve")} aria-label={t("Enviar pergunta")} className="grid size-7 place-items-center rounded text-casca-suave disabled:opacity-40">
          <Send size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: A janela de modelos**

Create `components/escale/conversas/centro/compositor/JanelaModelosDeMensagem.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useModelosDeMensagem, type ModeloAprovado } from "@/hooks/escale/useModelosDeMensagem";
import { useT } from "@/hooks/i18n/useT";
import { useSendMessage } from "@/hooks/inbox/useSendMessage";
import { renderTemplatePreview } from "@/lib/channels/meta/render-template";
import { lerConteudo } from "@/lib/channels/template-conteudo";
import type { TemplateContact } from "@/lib/inbox/template-vars";
import { Check, RotateCcw, Search, Settings, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * MODELOS DE MENSAGEM (c10, c63; C7; N11): a janela de 770px com a lista à
 * esquerda ("Usados recentemente" + "Todos os modelos") e a prévia à direita.
 * As definições vêm da mesma rota que a `JanelaFechadaAviso` do original lê;
 * o envio é o mesmo `useSendMessage` com `type: "template"`. "Com Flow",
 * "Todas as pastas" e ⚙ ficam "Em breve".
 */
export function JanelaModelosDeMensagem({
  aberta,
  aoFechar,
  conversationId,
  provider,
  contato,
}: {
  aberta: boolean;
  aoFechar: () => void;
  conversationId: string;
  provider: string | null | undefined;
  contato: TemplateContact;
}) {
  const t = useT();
  const { modelos, carregando, recarregar, recentes, marcarUsado } = useModelosDeMensagem(provider);
  const enviar = useSendMessage();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const categorias = useMemo(() => [...new Set(modelos.map((m) => m.category).filter((c): c is string => !!c))], [modelos]);
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return modelos.filter((m) => (!termo || m.name.toLowerCase().includes(termo)) && (categoria === "todas" || m.category === categoria));
  }, [modelos, busca, categoria]);
  const atual = modelos.find((m) => m.name === escolhido) ?? null;
  const slots = atual?.slots ?? [];
  const faltando = slots.filter((s) => !(valores[s.valueKey] ?? "").trim());
  const previa = atual ? renderTemplatePreview(atual.components ?? [], valores, contato) : null;

  const escolher = (m: ModeloAprovado) => {
    setEscolhido(m.name);
    setValores({ ...(m.savedValues ?? {}) });
  };
  const enviarModelo = () => {
    if (!atual || faltando.length > 0) return;
    enviar.mutate(
      {
        conversation_id: conversationId,
        type: "template",
        body: lerConteudo(atual.components ?? []).body?.trim() || atual.name,
        template_name: atual.name,
        template_language: atual.language,
        template_values: valores,
      },
      {
        onSuccess: () => {
          marcarUsado(atual.name);
          toast.success(t("Modelo enviado."));
          aoFechar();
        },
      },
    );
  };
  const Lista = ({ titulo, itens }: { titulo: string; itens: ModeloAprovado[] }) =>
    itens.length === 0 ? null : (
      <div>
        <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-casca-sobrelinha">{titulo}</div>
        {itens.map((m) => (
          <button key={m.name} type="button" className={cn("flex w-full items-center gap-2 px-4 py-2 text-left text-[12px] text-casca-texto hover:bg-casca-raia", escolhido === m.name && "bg-casca-marca-suave")} onClick={() => escolher(m)}>
            <span className="min-w-0 flex-1 truncate">{m.name}</span>
            <span className="text-[10px] text-casca-suave">{m.language}</span>
            {escolhido === m.name ? <Check size={14} aria-hidden className="text-casca-marca" /> : null}
          </button>
        ))}
      </div>
    );

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[770px] p-0">
      <div className="flex h-14 items-center gap-2 border-b border-casca-borda px-4">
        <span className="text-[13px] font-medium text-casca-texto">{t("Modelos de mensagem")}</span>
        <AjudaDaCasca texto={t("Modelos aprovados pela Meta para iniciar ou retomar uma conversa fora da janela de 24h.")} />
        <span className="flex-1" />
        <button type="button" disabled title={t("Em breve")} aria-label={t("Configurar modelos")} className="grid size-7 place-items-center rounded text-casca-suave disabled:opacity-40"><Settings size={16} aria-hidden /></button>
        <button type="button" aria-label={t("Recarregar modelos")} title={t("Recarregar")} className="grid size-7 place-items-center rounded text-casca-suave hover:bg-casca-raia" onClick={recarregar}><RotateCcw size={16} aria-hidden /></button>
        <a href="/app/settings/canal-oficial" target="_blank" rel="noreferrer"><BotaoDaCasca variante="marca" tamanho="sm">+ {t("Novo modelo")}</BotaoDaCasca></a>
        <button type="button" aria-label={t("Fechar")} className="grid size-7 place-items-center rounded text-casca-suave hover:bg-casca-raia" onClick={aoFechar}><X size={16} aria-hidden /></button>
      </div>
      <div className="flex h-[480px]">
        <div className="flex w-[300px] flex-col border-r border-casca-borda">
          <div className="flex flex-col gap-2 border-b border-casca-borda p-3">
            <div className="flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-busca px-2">
              <Search size={14} aria-hidden className="text-casca-suave" />
              <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Pesquisar por…")} className="min-w-0 flex-1 bg-transparent text-[12px] outline-hidden placeholder:text-casca-meta" />
            </div>
            <div className="flex gap-2">
              <SeletorDaCasca valor={categoria} opcoes={[{ valor: "todas", rotulo: t("Todas as categorias") }, ...categorias.map((c) => ({ valor: c, rotulo: c }))]} aoMudar={setCategoria} aria-label={t("Categoria")} />
              <SeletorDaCasca valor="todas" opcoes={[{ valor: "todas", rotulo: t("Todas as pastas") }]} aoMudar={() => undefined} desabilitado dica={t("Em breve")} aria-label={t("Pasta")} />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-casca-suave" title={t("Em breve")}>
              <input type="checkbox" disabled /> {t("Com Flow")}
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {carregando ? <p className="px-4 py-6 text-center text-[12px] text-casca-suave">{t("Carregando…")}</p> : null}
            <Lista titulo={t("Usados recentemente")} itens={filtrados.filter((m) => recentes.includes(m.name))} />
            <Lista titulo={t("Todos os modelos")} itens={filtrados} />
            {!carregando && filtrados.length === 0 ? <p className="px-4 py-6 text-center text-[12px] text-casca-suave">{t("Nenhum modelo encontrado")}</p> : null}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col bg-casca-painel-chat">
          {!atual ? (
            <p className="m-auto max-w-[280px] text-center text-[12px] text-casca-suave">{t("Selecione um modelo de mensagem à sua esquerda para visualizar o conteúdo.")}</p>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-casca-borda bg-white px-4 py-2">
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-casca-texto">{atual.name}</span>
                <span className="rounded-full bg-casca-fixada px-2 py-0.5 text-[10px] font-medium text-casca-espiao-texto">{t("Aprovado")}</span>
                <a href="/app/settings/canal-oficial" target="_blank" rel="noreferrer" className="text-[11px] font-medium text-casca-marca">{t("Editar modelo")}</a>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="max-w-[360px] rounded-lg rounded-tr-none border border-casca-borda-msg bg-casca-caixa-msg px-3 py-2 text-[13px] text-casca-texto">
                  {previa?.header ? <div className="mb-1 font-semibold">{previa.header}</div> : null}
                  <p className="whitespace-pre-wrap">{previa?.body ?? ""}</p>
                  {previa?.footer ? <div className="mt-1 text-[11px] text-casca-suave">{previa.footer}</div> : null}
                  {(previa?.buttons ?? []).map((b, i) => (
                    <div key={i} className="mt-1 border-t border-casca-borda-msg pt-1 text-center text-[12px] font-medium text-casca-marca">{b}</div>
                  ))}
                </div>
                {slots.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-2">
                    <div className="text-[11px] font-medium text-casca-suave">{t("Preencha os campos do modelo")}</div>
                    {slots.map((s) => (
                      <label key={s.valueKey} className="flex flex-col gap-1 text-[11px] text-casca-suave">
                        {`${s.onde} — {{${s.key}}}`}
                        <input value={valores[s.valueKey] ?? ""} onChange={(e) => setValores({ ...valores, [s.valueKey]: e.target.value })} className="h-8 rounded-casca-gatilho border border-casca-borda bg-white px-2 text-[12px] text-casca-texto outline-hidden" />
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 border-t border-casca-borda bg-white px-4 py-3">
                <BotaoDaCasca variante="texto" tamanho="sm" onClick={aoFechar}>{t("Cancelar")}</BotaoDaCasca>
                <BotaoDaCasca variante="marca" tamanho="sm" disabled={faltando.length > 0 || enviar.isPending} onClick={enviarModelo}>{t("Enviar")}</BotaoDaCasca>
              </div>
            </>
          )}
        </div>
      </div>
    </JanelaDaCasca>
  );
}
```

Confira a assinatura de `renderTemplatePreview` em `lib/channels/meta/render-template.ts` (linha ~196) e os campos de `PreviaDaMensagem` (`header`, `body`, `footer`, `buttons`); ajuste os nomes acima ao que a função devolve. O `TemplateContact` é o mesmo que `interpolateTemplate` recebe.

- [ ] **Step 6: O compositor**

Create `components/escale/conversas/centro/compositor/CompositorDaCasca.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { AttachMenu } from "@/components/inbox/composer/AttachMenu";
import { AttachmentPreviewDialog } from "@/components/inbox/composer/AttachmentPreviewDialog";
import { AudioRecorder } from "@/components/inbox/composer/AudioRecorder";
import { ContactPickerDialog, type ContactPickPayload } from "@/components/inbox/composer/ContactPickerDialog";
import { EmojiButton } from "@/components/inbox/composer/EmojiButton";
import { resolveSlash } from "@/components/inbox/composer/TemplateMenu";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useSendMessage } from "@/hooks/inbox/useSendMessage";
import { useUploadMedia } from "@/hooks/inbox/useUploadMedia";
import { NOME_DO_ASSISTENTE } from "@/lib/escale/conversas/assistente";
import type { ModoDoCompositor } from "@/lib/escale/conversas/janela";
import type { Message } from "@/lib/types/messaging";
import { Send, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AvisoForaDaJanela } from "./AvisoForaDaJanela";
import { BalaoDoAssistente } from "./BalaoDoAssistente";
import { BarraDeIcones, BOTAO_DO_ICONE } from "./BarraDeIcones";
import { FaixaAtribuirAMim } from "./FaixaAtribuirAMim";
import { JanelaModelosDeMensagem } from "./JanelaModelosDeMensagem";
import { JanelaNotaInterna } from "./JanelaNotaInterna";
import { PainelRespostasRapidas } from "./PainelRespostasRapidas";

const ALTURA_MAX = 160;
type Painel = "assistente" | "respostas" | "modelos" | "nota" | null;

/**
 * O COMPOSITOR DA CLINT (c02, c09–c13, c56, c73; C5–C8, C10, C11; N15–N17).
 * A caixa de 40px que cresce até 160px, os 11 ícones à esquerda e "Enviar"
 * à direita, sobre os hooks e as peças do original. Fora da janela vira o
 * aviso; bloqueado vira o motivo; fechada vira "Reabra o atendimento".
 */
export function CompositorDaCasca({
  conversationId,
  conversa,
  modo,
  bloqueio,
  respondendo,
  aoCancelarResposta,
  aoAgendar,
  compacto = false,
}: {
  conversationId: string;
  conversa: ConversationWithContact;
  modo: ModoDoCompositor;
  bloqueio: string | null;
  respondendo: Message | null;
  aoCancelarResposta: () => void;
  aoAgendar: (texto: string) => void;
  compacto?: boolean;
}) {
  const t = useT();
  const enviar = useSendMessage();
  const upload = useUploadMedia();
  const [texto, setTexto] = useState("");
  const [painel, setPainel] = useState<Painel>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [escolhendoContato, setEscolhendoContato] = useState(false);
  const campoRef = useRef<HTMLTextAreaElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const provider = conversa.channel_sessions?.provider ?? null;
  const contato = { name: conversa.contacts?.name ?? null, displayName: conversa.contacts?.display_name ?? null };
  const nomeDoContato = conversa.contacts?.name?.trim() || conversa.contacts?.display_name?.trim() || conversa.contacts?.phone_number || "";
  const fechada = conversa.status === "closed";
  const slash = useMemo(() => resolveSlash(texto), [texto]);

  useEffect(() => {
    setTexto("");
    setPainel(null);
  }, [conversationId]);
  useEffect(() => {
    if (slash.open) setPainel("respostas");
    else if (painel === "respostas" && !texto.startsWith("/")) setPainel(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slash.open]);
  useEffect(() => {
    const el = campoRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, ALTURA_MAX)}px`;
  }, [texto]);

  const inserir = (trecho: string) => {
    const el = campoRef.current;
    const inicio = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? texto.length;
    setTexto(texto.slice(0, inicio) + trecho + texto.slice(fim));
    requestAnimationFrame(() => el?.focus());
  };
  const enviarTexto = () => {
    const body = texto.trim();
    if (!body || enviar.isPending) return;
    enviar.mutate(
      { conversation_id: conversationId, type: "text", body, ...(respondendo ? { reply_to_message_id: respondendo.id } : {}) },
      { onSuccess: () => { setTexto(""); aoCancelarResposta(); } },
    );
  };
  const aoTeclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !slash.open) {
      e.preventDefault();
      enviarTexto();
    }
    if (e.key === "Escape") setPainel(null);
  };
  const enviarArquivo = async (file: File, legenda: string) => {
    try {
      const m = await upload.mutateAsync({ conversationId, file, destino: "mensagem" });
      enviar.mutate({ conversation_id: conversationId, type: m.type ?? "document", media_storage_path: m.media_storage_path, media_mime: m.media_mime, media_size_bytes: m.media_size_bytes, ...(legenda ? { body: legenda } : {}) });
    } catch {
      toast.error(t("Não foi possível enviar o arquivo."));
    } finally {
      setArquivo(null);
    }
  };
  const aoCamera = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setArquivo(f);
    e.target.value = "";
  };
  const enviarContato = (c: ContactPickPayload) => {
    enviar.mutate({ conversation_id: conversationId, type: "contact", metadata: { contact: c } }, { onSuccess: () => setEscolhendoContato(false) });
  };

  if (bloqueio) {
    return <div className="border-t border-casca-borda px-4 py-3 text-[12px] text-casca-suave" data-testid="compositor-bloqueado">{bloqueio}</div>;
  }
  if (fechada) {
    return <div className="border-t border-casca-borda px-4 py-3 text-center text-[12px] text-casca-suave" data-testid="compositor-fechado">{t("Reabra o atendimento para responder.")}</div>;
  }

  const janelas = (
    <>
      <BalaoDoAssistente aberto={painel === "assistente"} aoFechar={() => setPainel(null)} conversationId={conversationId} contato={nomeDoContato} aoInserir={(s) => setTexto(s)} />
      <JanelaModelosDeMensagem aberta={painel === "modelos"} aoFechar={() => setPainel(null)} conversationId={conversationId} provider={provider} contato={contato} />
    </>
  );

  if (modo !== "livre") {
    return (
      <div className="relative">
        <FaixaAtribuirAMim conversa={conversa} />
        <AvisoForaDaJanela modo={modo} aoAbrirModelos={() => setPainel("modelos")} aoAbrirAssistente={() => setPainel("assistente")} aoAgendar={() => aoAgendar("")} />
        {janelas}
      </div>
    );
  }

  return (
    <div className="relative border-t border-casca-borda" data-testid="compositor-da-casca">
      <FaixaAtribuirAMim conversa={conversa} />
      {respondendo ? (
        <div className="mx-4 mt-2 flex items-center gap-2 rounded-casca-gatilho border-l-2 border-casca-marca bg-casca-busca px-3 py-1.5 text-[12px]">
          <span className="min-w-0 flex-1 truncate text-casca-suave">{respondendo.body ?? t("Mídia")}</span>
          <button type="button" aria-label={t("Cancelar resposta")} className="text-casca-suave" onClick={aoCancelarResposta}><X size={14} aria-hidden /></button>
        </div>
      ) : null}
      <div className={cn("px-4 pt-3 pb-2", compacto && "px-3 pt-2")}>
        <textarea
          ref={campoRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={aoTeclar}
          placeholder={t("Mensagem")}
          aria-label={t("Mensagem")}
          rows={1}
          className="min-h-[40px] w-full resize-none rounded-lg bg-casca-busca px-3 py-2.5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
        />
        <div className="mt-1 flex items-center">
          <BarraDeIcones
            provider={provider}
            compacto={compacto}
            acoes={{
              assistente: { onClick: () => setPainel(painel === "assistente" ? null : "assistente"), ativo: painel === "assistente", title: NOME_DO_ASSISTENTE },
              emoji: { elemento: <EmojiButton onPick={inserir} /> },
              anexo: { elemento: <AttachMenu onPick={setArquivo} onPickContact={() => setEscolhendoContato(true)} /> },
              camera: { onClick: () => cameraRef.current?.click() },
              audio: { elemento: <AudioRecorder conversationId={conversationId} /> },
              respostas: { onClick: () => setPainel(painel === "respostas" ? null : "respostas"), ativo: painel === "respostas" },
              modelos: { onClick: () => setPainel("modelos") },
              nota: { onClick: () => setPainel("nota") },
              agendar: { onClick: () => aoAgendar(texto) },
            }}
          />
          <span className="flex-1" />
          <button
            type="button"
            className={cn(BOTAO_DO_ICONE, "text-casca-marca")}
            aria-label={t("Enviar")}
            title={t("Enviar")}
            disabled={!texto.trim() || enviar.isPending}
            onClick={enviarTexto}
          >
            <Send size={16} aria-hidden />
          </button>
        </div>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={aoCamera} aria-hidden tabIndex={-1} />
      <PainelRespostasRapidas
        aberto={painel === "respostas"}
        aoFechar={() => setPainel(null)}
        termoInicial={slash.open ? slash.query : ""}
        contato={contato}
        aoEscolher={(s) => { setTexto(s); setPainel(null); requestAnimationFrame(() => campoRef.current?.focus()); }}
      />
      <JanelaNotaInterna aberta={painel === "nota"} aoFechar={() => setPainel(null)} conversationId={conversationId} />
      {janelas}
      <AttachmentPreviewDialog file={arquivo} sending={upload.isPending || enviar.isPending} onCancel={() => setArquivo(null)} onSend={(legenda) => arquivo && void enviarArquivo(arquivo, legenda)} />
      <ContactPickerDialog open={escolhendoContato} onOpenChange={setEscolhendoContato} excludeContactId={conversa.contact_id} sending={enviar.isPending} onPick={enviarContato} />
    </div>
  );
}
```

Os ícones de emoji, anexo e áudio são as peças do original (`EmojiButton`, `AttachMenu`, `AudioRecorder`); envolva-os em `className` que iguale o 28×28 e a cor `casca-suave` dos outros (se a peça expõe `className`, passe `BOTAO_DO_ICONE`; se não, embrulhe num `<span className="[&>button]:size-7 [&>button]:text-casca-suave">`). O teste espera os `aria-label` "Emoji", "Anexar", "Gravar áudio": confira os rótulos que as peças do original usam (`grep -n "aria-label" components/inbox/composer/{EmojiButton,AttachMenu,AudioRecorder}.tsx`) e, se diferirem, alinhe o teste a eles (o visual é o da Clint; o rótulo acessível pode ser o do original). Confira em `hooks/inbox/useUploadMedia.ts` o que `mutateAsync` devolve (os campos `media_storage_path`, `media_mime`, `media_size_bytes`, `type`) e no `Composer.tsx` original como ele monta o envio do upload; copie a forma. Confira no `Composer.tsx` como o contato compartilhado é enviado (`type: "contact"` com `metadata.contact` ou outro campo) e copie.

- [ ] **Step 7: A troca em `ConversaAberta`**

Modify `components/escale/conversas/centro/ConversaAberta.tsx` — o corpo inteiro passa a ser:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";

import { NumeroForaDoAr } from "@/components/inbox/NumeroForaDoAr";
import { RetentionNotice } from "@/components/inbox/RetentionNotice";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useConversaDaCasca } from "@/hooks/escale/useConversaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useMessagesRealtime } from "@/hooks/inbox/useMessagesRealtime";
import { estadoDaJanela } from "@/lib/channels/janela";
import { modoDoCompositor } from "@/lib/escale/conversas/janela";
import { motivoDoContato } from "@/lib/inbox/motivo-do-envio-bloqueado";
import type { AvisoDeRascunho } from "@/lib/inbox/rascunho-sugerido";
import type { Message } from "@/lib/types/messaging";
import { Search, X } from "@/lib/ui/icons-da-casca";

import { JanelaAgendarMensagem } from "@/components/escale/conversas/agendadas/JanelaAgendarMensagem";
import { BarraDeStatus } from "./BarraDeStatus";
import { CabecalhoDaConversa } from "./CabecalhoDaConversa";
import { CompositorDaCasca } from "./compositor/CompositorDaCasca";
import { ThreadDaCasca, ultimaMensagem } from "./thread/ThreadDaCasca";

/**
 * A CONVERSA ABERTA NA CASCA (fork Escale, Fase 3A → 3B): o cabeçalho, a
 * barra de status, a thread e o compositor da Clint. Os avisos do original
 * que não têm equivalente na Clint (retenção, número fora do ar) ficam.
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
  aoAbrirFicha?: () => void;
}) {
  const t = useT();
  const { user } = useAuth();
  const supportReadonly = user.support?.access_mode === "support_readonly";
  const [busca, setBusca] = useState<{ conversaId: string; termo: string } | null>(null);
  const [respondendo, setRespondendo] = useState<Message | null>(null);
  const [agendando, setAgendando] = useState<{ texto: string } | null>(null);
  const [naoLidaManual, setNaoLidaManual] = useState<string | null>(null);
  const buscaAberta = busca !== null && busca.conversaId === conversa.id;
  const acoes = useConversaDaCasca(conversa.id);
  const mensagens = useMessagesRealtime(conversa.id);

  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setRespondendo(null);
    if (rascunho && rascunho.conversationId === conversa.id && rascunho.leitura.estado === "sugerido") {
      setAgendando(null);
    }
  }, [conversa.id, rascunho]);

  const provider = conversa.channel_sessions?.provider ?? null;
  const ultima = useMemo(() => ultimaMensagem(mensagens.data?.pages), [mensagens.data]);
  const ultimaFoiTemplate = !!ultima && ultima.direction === "outbound" && ultima.type === "template";
  const modo = modoDoCompositor({ estado: estadoDaJanela(provider, conversa.last_inbound_at ?? null, agora), provider, ultimaFoiTemplate });
  const bloqueio = supportReadonly ? t("Acompanhamento somente leitura") : motivoDoContato(conversa.contacts, t);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="conversa-aberta">
      {aoAbrirFicha ? (
        <div className="flex h-9 shrink-0 items-center justify-end border-b border-casca-borda px-2 xl:hidden">
          <BotaoDaCasca variante="texto" tamanho="sm" onClick={aoAbrirFicha}>{t("Ficha")}</BotaoDaCasca>
        </div>
      ) : null}
      <CabecalhoDaConversa
        conversa={conversa}
        aoAbrirConversa={aoAbrirConversa}
        aoBuscar={() => (buscaAberta ? setBusca(null) : setBusca({ conversaId: conversa.id, termo: "" }))}
        buscaAberta={buscaAberta}
        naoLidaManual={naoLidaManual === conversa.id}
        aoMarcarNaoLida={() => acoes.marcarNaoLida.mutate(undefined, { onSuccess: () => setNaoLidaManual(conversa.id) })}
      />
      {buscaAberta ? (
        <div className="flex items-center gap-2 border-b border-casca-borda px-4 py-1.5">
          <Search size={16} aria-hidden className="shrink-0 text-casca-suave" />
          <input
            type="search"
            autoFocus
            className="min-w-0 flex-1 bg-transparent py-1 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            aria-label={t("Buscar nesta conversa")}
            placeholder={t("Buscar nesta conversa")}
            value={busca.termo}
            onChange={(e) => setBusca({ conversaId: busca.conversaId, termo: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Escape") setBusca(null); }}
          />
          <BotaoDaCasca variante="icone" tamanho="sm" aria-label={t("Fechar busca")} onClick={() => setBusca(null)}><X size={16} aria-hidden /></BotaoDaCasca>
        </div>
      ) : null}
      <BarraDeStatus conversa={conversa} ultimaFoiTemplate={ultimaFoiTemplate} agora={agora} />
      <div className="min-h-0 flex-1 overflow-hidden">
        <ThreadDaCasca conversationId={conversa.id} conversa={conversa} searchTerm={buscaAberta ? busca.termo : ""} aoResponder={setRespondendo} />
      </div>
      <RetentionNotice conversationId={conversa.id} />
      {conversa.contacts?.id ? (
        <NumeroForaDoAr key={`numero:${conversa.id}`} conversationId={conversa.id} channelSessionId={conversa.channel_session_id} contactId={conversa.contacts.id} contactPhone={conversa.contacts.phone_number ?? null} onAbrirConversa={aoAbrirConversa} />
      ) : null}
      <CompositorDaCasca
        key={`compositor:${conversa.id}`}
        conversationId={conversa.id}
        conversa={conversa}
        modo={modo}
        bloqueio={bloqueio}
        respondendo={respondendo}
        aoCancelarResposta={() => setRespondendo(null)}
        aoAgendar={(texto) => setAgendando({ texto })}
      />
      <JanelaAgendarMensagem aberta={agendando !== null} aoFechar={() => setAgendando(null)} conversa={conversa} textoInicial={agendando?.texto ?? ""} modo={modo} />
    </div>
  );
}
```

`JanelaAgendarMensagem` nasce na Task 9; até lá, deixe o import comentado e o `<JanelaAgendarMensagem …/>` fora, e o `typecheck` passa. **"Marcar como não lida" (N6):** enquanto `naoLidaManual === conversa.id`, `ConversasDaCasca` não pode chamar `useMarkAsRead`; passe o estado para cima: acrescente a prop opcional `aoMudarNaoLida?: (id: string | null) => void` em `ConversaAberta` e, em `ConversasDaCasca.tsx` (3A), use-a para pular `useMarkAsRead` (`useMarkAsRead(espiao || naoLida === selectedId ? null : selectedId)`), limpando ao trocar de conversa. O rascunho sugerido (`rascunho`) do original: se `rascunho.leitura.estado === "sugerido"`, passe `rascunho.leitura.texto` como `textoInicial` do compositor (acrescente a prop `textoInicial?: string` em `CompositorDaCasca` e use-a no `useState` inicial).

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-compositor-da-casca.test.tsx tests/unit/escale-conversas-casca.test.tsx && corepack pnpm prettier --write components/escale/conversas/centro && corepack pnpm eslint components/escale/conversas && corepack pnpm typecheck`
Expected: PASS (o teste da casca da 3A mocka `ConversaAberta`, então continua verde).

- [ ] **Step 9: Commit**

```bash
git add components/escale/conversas/centro components/escale/conversas/ConversasDaCasca.tsx tests/unit/escale-compositor-da-casca.test.tsx
git commit -m "feat(escale): compositor da Clint — ícones, respostas rápidas, modelos, assistente, nota, fora da janela (Fase 3B)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 9: Mensagens agendadas na tela — a janela "Agendar mensagem", a tela de Configurações, o modal do contato e o "⏱ n" da fila (C9)

**Files:**
- Create: `components/escale/conversas/agendadas/JanelaAgendarMensagem.tsx`, `TabelaDeAgendadas.tsx`, `JanelaMensagensAgendadasDoContato.tsx`, `TelaMensagensAgendadas.tsx`, `app/app/inbox/configuracoes/mensagens-agendadas/page.tsx`, `tests/unit/escale-mensagens-agendadas-tela.test.tsx`
- Modify: `components/escale/conversas/fila/LinhaDaFila.tsx` (a prop `agendadas?: number` e o "⏱ n"), `components/escale/conversas/fila/ListaDaFila.tsx` (`useContagemDeAgendadas` sobre os ids da página), `components/escale/conversas/painel/CabecalhoDoContato.tsx` (a ação rápida "Mensagens agendadas" com o contador abre o modal), `components/escale/conversas/centro/ConversaAberta.tsx` (destrava o import da Task 8)

**Interfaces:**
- Consumes: `useAgendarMensagens`, `useMensagensAgendadas`, `useRemoverAgendada`, `useContagemDeAgendadas` (Task 5), `useModelosDeMensagem` (Task 5), `SeletorDeDataEHora({ valor: Date, aoMudar })`, `CalendarioDePeriodo({ valor: Periodo, aoMudar, semAbas })` com `Periodo = { tipo, de?, ate? }`, `PaginacaoDaCasca({ pagina, total, porPagina, opcoesPorPagina, aoMudarPagina, aoMudarPorPagina })`, `SeletorDaCasca`, `useChannelSessions()` (`ChannelSession { id, display_name, phone_number, provider?, status }`, `channelLabel(c, t)`), `JanelaDaCasca`/`CabecaDaJanela`/`BotaoDaJanela`/`RodapeDaJanela`, `FotoDaLinha({ id, nome, temFoto })` (2A), `dataNoPassado`, `AGENDADAS_POR_PAGINA`, `MENSAGENS_POR_AGENDAMENTO_MAX`, `dataHoraBr`.
- Produces: `JanelaAgendarMensagem({ aberta, aoFechar, conversa, textoInicial, modo })`; `TabelaDeAgendadas({ itens, aoRemover, compacta? })`; `JanelaMensagensAgendadasDoContato({ aberta, aoFechar, conversationId, contatoNome })`; `TelaMensagensAgendadas()` (client); `LinhaDaFila` ganha `agendadas?: number`.

Abra c08, c39, c59, c61 e c62 antes de escrever.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-mensagens-agendadas-tela.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaAgendarMensagem } from "@/components/escale/conversas/agendadas/JanelaAgendarMensagem";
import { TabelaDeAgendadas } from "@/components/escale/conversas/agendadas/TabelaDeAgendadas";
import { TelaMensagensAgendadas } from "@/components/escale/conversas/agendadas/TelaMensagensAgendadas";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import type { AgendadaLida } from "@/lib/escale/conversas/agendadas";

const agendar = vi.fn();
const remover = vi.fn();
let pagina = { data: [] as AgendadaLida[], meta: { total: 0, pagina: 1, por_pagina: 10 } };
vi.mock("@/hooks/escale/useMensagensAgendadas", () => ({
  useAgendarMensagens: () => ({ mutateAsync: agendar, isPending: false }),
  useRemoverAgendada: () => ({ mutate: remover, isPending: false }),
  useMensagensAgendadas: () => ({ data: pagina, isLoading: false }),
  useContagemDeAgendadas: () => ({}),
}));
vi.mock("@/hooks/escale/useModelosDeMensagem", () => ({
  useModelosDeMensagem: () => ({ modelos: [{ name: "boas_vindas", language: "pt_BR", status: "APPROVED", slots: [], components: [] }], carregando: false, recarregar: vi.fn(), fonte: "oficial", recentes: [], marcarUsado: vi.fn() }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: [{ id: "cs1", display_name: "Comercial", phone_number: "+55", provider: "meta_cloud", status: "WORKING" }] }),
  channelLabel: (c: { display_name: string | null }) => c.display_name ?? "",
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" }, activeOrg: { orgId: "o1", role: "manager" } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const conversa = { id: "c1", contact_id: "ct1", channel_session_id: "cs1", status: "open", contacts: { id: "ct1", name: "Ana" }, channel_sessions: { provider: "meta_cloud" } } as unknown as ConversationWithContact;
const linha = (extra: Partial<AgendadaLida> = {}): AgendadaLida => ({
  id: "a1", conversation_id: "c1", contact_id: "ct1", channel_session_id: "cs1", tipo: "texto", corpo: "Bom dia", template: null,
  enviar_em: "2026-10-20T13:00:00.000Z", criado_por: "u1", status: "pendente", erro: null, created_at: "2026-10-18T10:00:00.000Z",
  contato: { nome: "Ana Souza", telefone: "+5511", tem_foto: false }, dispositivo: { nome: "Comercial", provider: "meta_cloud", status: "WORKING" }, ...extra,
});
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  agendar.mockReset().mockResolvedValue({ data: { ids: ["a1"] } });
  remover.mockClear();
  pagina = { data: [], meta: { total: 0, pagina: 1, por_pagina: 10 } };
});

describe("JanelaAgendarMensagem (c08)", () => {
  it("dentro da janela: texto livre; confirma com a data escolhida; data passada bloqueia", async () => {
    const fechar = vi.fn();
    wrap(<JanelaAgendarMensagem aberta aoFechar={fechar} conversa={conversa} textoInicial="Bom dia" modo="livre" />);
    expect(screen.getByText("Agendar mensagem")).toBeInTheDocument();
    expect(screen.getByText(/Dentro da janela/i)).toBeInTheDocument();
    expect(screen.getByText(/Fora da janela/i)).toBeInTheDocument();
    expect((screen.getByLabelText("Mensagem livre") as HTMLTextAreaElement).value).toBe("Bom dia");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(agendar).toHaveBeenCalledWith(expect.objectContaining({ conversation_id: "c1", mensagens: [{ tipo: "texto", corpo: "Bom dia" }] })));
    expect(fechar).toHaveBeenCalled();
  });
  it("fora da janela: só modelo; o texto livre fica desligado", () => {
    wrap(<JanelaAgendarMensagem aberta aoFechar={vi.fn()} conversa={conversa} textoInicial="" modo="so_modelo" />);
    expect(screen.getByLabelText("Mensagem livre")).toBeDisabled();
    expect(screen.getByText("boas_vindas")).toBeInTheDocument();
  });
});

describe("TabelaDeAgendadas (c39, c62)", () => {
  it("mostra contato, criação, envio, dispositivo e o ⋮ com 'Remover agendamento'", () => {
    wrap(<TabelaDeAgendadas itens={[linha()]} aoRemover={remover} />);
    expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByText(/18\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/20\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Opções do agendamento" }));
    fireEvent.click(screen.getByText("Remover agendamento"));
    expect(remover).toHaveBeenCalledWith("a1");
  });
});

describe("TelaMensagensAgendadas (c39)", () => {
  it("tem as migalhas, a busca, os filtros e o vazio", () => {
    wrap(<TelaMensagensAgendadas />);
    expect(screen.getByText("Configurações")).toBeInTheDocument();
    expect(screen.getByText("Mensagens agendadas")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar por nome, e-mail ou telefone")).toBeInTheDocument();
    expect(screen.getByText("Criação")).toBeInTheDocument();
    expect(screen.getByText("Envio")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma mensagem agendada.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-mensagens-agendadas-tela.test.tsx`
Expected: FAIL.

- [ ] **Step 3: A janela "Agendar mensagem"**

Create `components/escale/conversas/agendadas/JanelaAgendarMensagem.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BotaoDaJanela, CabecaDaJanela, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { useAgendarMensagens } from "@/hooks/escale/useMensagensAgendadas";
import { useModelosDeMensagem } from "@/hooks/escale/useModelosDeMensagem";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { dataNoPassado, type MensagemAgendada } from "@/lib/escale/conversas/agendadas";
import type { ModoDoCompositor } from "@/lib/escale/conversas/janela";
import { cn } from "@/lib/utils";

const SOBRELINHA = "text-[11px] font-semibold uppercase tracking-wide text-casca-sobrelinha";
const UMA_HORA_MS = 3_600_000;

/**
 * "AGENDAR MENSAGEM" (c08; C9): 900px, duas colunas. À esquerda "Dentro da
 * janela · até 24h após resposta" (texto livre); à direita "Fora da janela"
 * (modelo aprovado). Embaixo, data e hora e Confirmar. Fora da janela, o
 * texto livre fica desligado e só o modelo vale (o cron recusa o resto).
 */
export function JanelaAgendarMensagem({
  aberta,
  aoFechar,
  conversa,
  textoInicial,
  modo,
}: {
  aberta: boolean;
  aoFechar: () => void;
  conversa: ConversationWithContact;
  textoInicial: string;
  modo: ModoDoCompositor;
}) {
  const t = useT();
  const agendar = useAgendarMensagens();
  const provider = conversa.channel_sessions?.provider ?? null;
  const { modelos, fonte } = useModelosDeMensagem(provider);
  const [texto, setTexto] = useState(textoInicial);
  const [modelo, setModelo] = useState<string>("");
  const [quando, setQuando] = useState(() => new Date(Date.now() + UMA_HORA_MS));
  const foraDaJanela = modo !== "livre";
  useEffect(() => {
    if (aberta) {
      setTexto(textoInicial);
      setModelo("");
      setQuando(new Date(Date.now() + UMA_HORA_MS));
    }
  }, [aberta, textoInicial]);

  const mensagens: MensagemAgendada[] = [];
  if (!foraDaJanela && texto.trim()) mensagens.push({ tipo: "texto", corpo: texto.trim() });
  const escolhido = modelos.find((m) => m.name === modelo);
  if (escolhido) mensagens.push({ tipo: "template", template: { name: escolhido.name, language: escolhido.language, values: { ...(escolhido.savedValues ?? {}) } } });
  const passado = dataNoPassado(quando.toISOString(), new Date());
  const podeConfirmar = mensagens.length > 0 && !passado && !agendar.isPending;

  const confirmar = async () => {
    if (!podeConfirmar) return;
    await agendar.mutateAsync({ conversation_id: conversa.id, enviar_em: quando.toISOString(), mensagens });
    toast.success(t("Mensagem agendada."));
    aoFechar();
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[900px]">
      <CabecaDaJanela titulo={t("Agendar mensagem")} />
      <div className="mt-4 grid grid-cols-2 gap-6">
        <section className={cn("flex flex-col gap-2 pr-6", foraDaJanela && "opacity-60")}>
          <div className={SOBRELINHA}>{t("Dentro da janela")} · {t("até 24h após resposta")}</div>
          <div className="text-[13px] font-medium text-casca-texto">{t("Mensagem livre")}</div>
          <p className="text-[12px] text-casca-suave">{t("Texto, mídia ou áudio — qualquer formato. Enviada se o lead respondeu nas últimas 24h.")}</p>
          <textarea
            aria-label={t("Mensagem livre")}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={foraDaJanela}
            placeholder={t("Escreva uma mensagem, você pode usar variáveis")}
            className="h-40 w-full resize-none rounded-casca-gatilho border border-casca-borda bg-casca-busca p-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta disabled:cursor-not-allowed"
          />
          {foraDaJanela ? <p className="text-[11px] text-casca-alerta">{t("Fora da janela de 24h")}: {t("só modelos aprovados são enviados.")}</p> : null}
        </section>
        <section className="flex flex-col gap-2 border-l border-casca-borda pl-6">
          <div className={SOBRELINHA}>{t("Fora da janela")} · {t("modelo aprovado")}</div>
          <div className="text-[13px] font-medium text-casca-texto">{t("Modelo de mensagem")}</div>
          <p className="text-[12px] text-casca-suave">{t("Enviado quando o lead não respondeu nas últimas 24h. Só modelos aprovados pela Meta.")}</p>
          {fonte === null ? (
            <p className="text-[12px] text-casca-suave">{t("Este dispositivo não envia modelos.")}</p>
          ) : (
            <SeletorDaCasca
              aparencia="janela"
              valor={modelo}
              vazio={t("Selecionar modelo")}
              opcoes={modelos.map((m) => ({ valor: m.name, rotulo: m.name }))}
              aoMudar={setModelo}
              aria-label={t("Modelo de mensagem")}
            />
          )}
          {escolhido && (escolhido.slots?.length ?? 0) > 0 && !escolhido.savedValues ? (
            <p className="text-[11px] text-casca-alerta">{t("Este modelo exige valores. Preencha-os em Modelos de mensagem antes de agendar.")}</p>
          ) : null}
        </section>
      </div>
      <div className="mt-6 flex items-end gap-4 border-t border-casca-borda pt-4">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-medium text-casca-texto">{t("Data e hora do envio")}</span>
          <SeletorDeDataEHora valor={quando} aoMudar={setQuando} />
          {passado ? <span className="text-[11px] text-casca-alerta">{t("Não é possível agendar para uma data/hora no passado")}</span> : null}
        </div>
        <span className="flex-1" />
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>{t("Cancelar")}</BotaoDaJanela>
        <BotaoDaJanela variante="salvar" disabled={!podeConfirmar} onClick={() => void confirmar()}>{t("Confirmar")}</BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

Os modelos com `slots` sem `savedValues` precisariam de valores por envio; nesta fase, a janela só agenda modelo sem parâmetros ou com os valores salvos (c08 não mostra campos de parâmetros). Diferença declarada no "Fora desta fase".

- [ ] **Step 4: A tabela, o modal do contato e a tela**

Create `components/escale/conversas/agendadas/TabelaDeAgendadas.tsx`:

```tsx
"use client";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useT } from "@/hooks/i18n/useT";
import type { AgendadaLida } from "@/lib/escale/conversas/agendadas";
import { dataHoraBr } from "@/lib/escale/negocio/arquivos";
import { Ellipsis } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const CABECA = "h-10 px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-casca-sobrelinha";
const CELULA = "h-14 px-3 text-[12px] text-casca-texto";

function MenuDaLinha({ item, aoRemover }: { item: AgendadaLida; aoRemover: (id: string) => void }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <Popover.Trigger asChild>
        <button type="button" aria-label={t("Opções do agendamento")} className="grid size-7 place-items-center rounded text-casca-suave hover:bg-casca-raia">
          <Ellipsis size={16} aria-hidden />
        </button>
      </Popover.Trigger>
      <PainelSuspenso align="end" className="w-[200px] py-1">
        <button type="button" className="flex h-9 w-full items-center px-3 text-left text-[12px] text-casca-alerta hover:bg-casca-raia" onClick={() => { setAberto(false); aoRemover(item.id); }}>
          {t("Remover agendamento")}
        </button>
      </PainelSuspenso>
    </Popover.Root>
  );
}

/** A tabela da Clint (c39, c61, c62): Contato · Criação · Envio · Dispositivo · Mensagem · ⋮. */
export function TabelaDeAgendadas({ itens, aoRemover, compacta = false }: { itens: AgendadaLida[]; aoRemover: (id: string) => void; compacta?: boolean }) {
  const t = useT();
  return (
    <table className="w-full border-collapse" data-testid="tabela-de-agendadas">
      <thead>
        <tr className="border-b border-casca-borda">
          {!compacta ? <th className={CABECA}>{t("Contato")}</th> : null}
          <th className={CABECA}>{t("Criação")}</th>
          <th className={CABECA}>{t("Envio")}</th>
          <th className={CABECA}>{t("Dispositivo")}</th>
          <th className={CABECA}>{t("Mensagem")}</th>
          <th className={cn(CABECA, "w-10")} />
        </tr>
      </thead>
      <tbody>
        {itens.map((a) => (
          <tr key={a.id} className="border-b border-casca-borda hover:bg-casca-raia/50">
            {!compacta ? (
              <td className={CELULA}>
                <span className="flex items-center gap-2">
                  <FotoDaLinha id={a.contact_id} nome={a.contato.nome} temFoto={a.contato.tem_foto} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.contato.nome}</span>
                    <span className="block text-[11px] text-casca-suave">{a.contato.telefone ?? ""}</span>
                  </span>
                </span>
              </td>
            ) : null}
            <td className={cn(CELULA, "whitespace-nowrap tabular-nums")}>{dataHoraBr(a.created_at)}</td>
            <td className={cn(CELULA, "whitespace-nowrap tabular-nums")}>{dataHoraBr(a.enviar_em)}</td>
            <td className={CELULA}>{a.dispositivo.nome}</td>
            <td className={cn(CELULA, "max-w-[320px]")}>
              <span className="block truncate" title={a.tipo === "texto" ? (a.corpo ?? "") : a.template?.name}>
                {a.tipo === "texto" ? a.corpo : `${t("Modelo")}: ${a.template?.name ?? ""}`}
              </span>
              {a.status === "falhou" && a.erro ? <span className="block text-[11px] text-casca-alerta">{a.erro}</span> : null}
            </td>
            <td className={cn(CELULA, "text-right")}>{a.status === "pendente" ? <MenuDaLinha item={a} aoRemover={aoRemover} /> : null}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

`FotoDaLinha`: confira o caminho real (2A; `grep -rn "export function FotoDaLinha" components`) e `dataHoraBr` (1H; `lib/escale/negocio/arquivos.ts`, devolve "dd/mm/aaaa hh:mm").

Create `components/escale/conversas/agendadas/JanelaMensagensAgendadasDoContato.tsx`:

```tsx
"use client";
import { CabecaDaJanela, JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { useMensagensAgendadas, useRemoverAgendada } from "@/hooks/escale/useMensagensAgendadas";
import { useT } from "@/hooks/i18n/useT";

import { TabelaDeAgendadas } from "./TabelaDeAgendadas";

/** O modal "Mensagens agendadas" da ação rápida do painel (c61): as pendentes desta conversa. */
export function JanelaMensagensAgendadasDoContato({
  aberta,
  aoFechar,
  conversationId,
  contatoNome,
}: {
  aberta: boolean;
  aoFechar: () => void;
  conversationId: string;
  contatoNome: string;
}) {
  const t = useT();
  const { data, isLoading } = useMensagensAgendadas({ conversation_id: conversationId, por_pagina: 50 }, aberta);
  const remover = useRemoverAgendada();
  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[760px]">
      <CabecaDaJanela titulo={t("Mensagens agendadas")} descricao={contatoNome} />
      <div className="mt-4 max-h-[420px] overflow-y-auto">
        {isLoading ? <p className="py-6 text-center text-[12px] text-casca-suave">{t("Carregando…")}</p> : null}
        {!isLoading && (data?.data.length ?? 0) === 0 ? <p className="py-6 text-center text-[12px] text-casca-suave">{t("Nenhuma mensagem agendada.")}</p> : null}
        {data && data.data.length > 0 ? <TabelaDeAgendadas itens={data.data} aoRemover={(id) => remover.mutate(id)} compacta /> : null}
      </div>
    </JanelaDaCasca>
  );
}
```

Create `components/escale/conversas/agendadas/TelaMensagensAgendadas.tsx`:

```tsx
"use client";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { useState } from "react";

import { CalendarioDePeriodo, type Periodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useMensagensAgendadas, useRemoverAgendada } from "@/hooks/escale/useMensagensAgendadas";
import { useT } from "@/hooks/i18n/useT";
import { AGENDADAS_POR_PAGINA } from "@/lib/escale/conversas/agendadas";
import { CalendarDays, ChevronDown, Search, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { TabelaDeAgendadas } from "./TabelaDeAgendadas";

const GATILHO = "inline-flex h-8 items-center gap-1.5 rounded-casca-gatilho border border-casca-borda bg-white px-3 text-[12px] text-casca-texto hover:bg-casca-raia";

function FiltroDePeriodo({ rotulo, valor, aoMudar }: { rotulo: string; valor: Periodo; aoMudar: (p: Periodo) => void }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const texto = valor.de && valor.ate ? `${valor.de.split("-").reverse().join("/")} – ${valor.ate.split("-").reverse().join("/")}` : rotulo;
  return (
    <Popover.Root open={aberto} onOpenChange={setAberto}>
      <Popover.Trigger asChild>
        <button type="button" className={cn(GATILHO, valor.de && "border-casca-marca text-casca-marca")} aria-label={rotulo}>
          <CalendarDays size={14} aria-hidden />
          <span>{rotulo}</span>
          {valor.de ? <span className="text-casca-suave">· {texto}</span> : null}
          <ChevronDown size={14} aria-hidden className="text-casca-chevron" />
        </button>
      </Popover.Trigger>
      <PainelSuspenso className="p-3">
        <CalendarioDePeriodo valor={valor} aoMudar={aoMudar} semAbas />
        {valor.de ? (
          <button type="button" className="mt-2 text-[12px] text-casca-marca" onClick={() => aoMudar({ tipo: valor.tipo })}>{t("Limpar")}</button>
        ) : null}
      </PainelSuspenso>
    </Popover.Root>
  );
}

/**
 * "CONFIGURAÇÕES › MENSAGENS AGENDADAS" (c39; C9; N19): migalhas e X, a
 * busca de 260px, Criação e Envio (calendários), Dispositivo ou contato, a
 * tabela e a paginação da Clint.
 */
export function TelaMensagensAgendadas() {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [criacao, setCriacao] = useState<Periodo>({ tipo: "criacao" });
  const [envio, setEnvio] = useState<Periodo>({ tipo: "agendado" });
  const [dispositivo, setDispositivo] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(AGENDADAS_POR_PAGINA[0]);
  const { data: dispositivos = [] } = useChannelSessions();
  const { data, isLoading } = useMensagensAgendadas({
    busca: busca.trim() || undefined,
    criacao_de: criacao.de,
    criacao_ate: criacao.ate,
    envio_de: envio.de,
    envio_ate: envio.ate,
    channel_session_id: dispositivo || undefined,
    pagina,
    por_pagina: porPagina,
  });
  const remover = useRemoverAgendada();
  const itens = data?.data ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white" data-testid="tela-mensagens-agendadas">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-casca-borda px-6">
        <nav className="flex items-center gap-2 text-[13px] text-casca-suave" aria-label={t("Você está em")}>
          <span>{t("Configurações")}</span>
          <span>›</span>
          <span className="font-semibold text-casca-texto">{t("Mensagens agendadas")}</span>
        </nav>
        <span className="flex-1" />
        <Link href="/app/inbox" aria-label={t("Fechar")} className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia">
          <X size={18} aria-hidden />
        </Link>
      </header>
      <div className="flex h-10 shrink-0 items-center gap-2 px-6 py-6">
        <div className="flex h-8 w-[260px] items-center gap-2 rounded-casca-gatilho border border-casca-borda bg-casca-busca px-2">
          <Search size={14} aria-hidden className="text-casca-suave" />
          <input value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder={t("Buscar por nome, e-mail ou telefone")} className="min-w-0 flex-1 bg-transparent text-[12px] outline-hidden placeholder:text-casca-meta" />
        </div>
        <FiltroDePeriodo rotulo={t("Criação")} valor={criacao} aoMudar={(p) => { setCriacao(p); setPagina(1); }} />
        <FiltroDePeriodo rotulo={t("Envio")} valor={envio} aoMudar={(p) => { setEnvio(p); setPagina(1); }} />
        <SeletorDaCasca
          valor={dispositivo}
          vazio={t("Dispositivo ou conta")}
          opcoes={dispositivos.map((d) => ({ valor: d.id, rotulo: channelLabel(d, t) }))}
          aoMudar={(v) => { setDispositivo(v); setPagina(1); }}
          aria-label={t("Dispositivo ou conta")}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        {isLoading ? <p className="py-10 text-center text-[12px] text-casca-suave">{t("Carregando…")}</p> : null}
        {!isLoading && itens.length === 0 ? <p className="py-10 text-center text-[12px] text-casca-suave">{t("Nenhuma mensagem agendada.")}</p> : null}
        {itens.length > 0 ? <TabelaDeAgendadas itens={itens} aoRemover={(id) => remover.mutate(id)} /> : null}
      </div>
      <div className="shrink-0 border-t border-casca-borda px-6">
        <PaginacaoDaCasca pagina={pagina} total={data?.meta.total ?? 0} porPagina={porPagina} opcoesPorPagina={AGENDADAS_POR_PAGINA} aoMudarPagina={setPagina} aoMudarPorPagina={(n) => { setPorPagina(n); setPagina(1); }} />
      </div>
    </div>
  );
}
```

`CalendarDays`: acrescente ao bloco de ícones se faltar. Os `tipo` do `Periodo` ("criacao", "agendado") só servem ao calendário (ele não mostra abas com `semAbas`).

Create `app/app/inbox/configuracoes/mensagens-agendadas/page.tsx`:

```tsx
import { redirect } from "next/navigation";

import { TelaMensagensAgendadas } from "@/components/escale/conversas/agendadas/TelaMensagensAgendadas";
import { lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";

export const dynamic = "force-dynamic";

/**
 * FORK ESCALE · Fase 3B (C9, N19): "Configurações › Mensagens agendadas" da
 * Clint. Só com a casca ligada; sem ela, volta para o inbox do original.
 */
export default async function MensagensAgendadasPage() {
  if ((await lerPreferenciaDeMenu()) !== "topo") redirect("/app/inbox");
  return <TelaMensagensAgendadas />;
}
```

Confira em `app/app/contacts/page.tsx` como `lerPreferenciaDeMenu` é chamada (se recebe os `cookies()` ou lê sozinha) e copie a forma.

- [ ] **Step 5: O "⏱ n" na fila e a ação rápida do painel**

Em `components/escale/conversas/fila/LinhaDaFila.tsx`: acrescente a prop `agendadas?: number` (padrão `0`) e, na segunda linha, logo DEPOIS do tempo de espera e ANTES das tags:

```tsx
              {visualizacao.campos.mensagensAgendadas && agendadas > 0 ? (
                <span title={`${agendadas} ${t("mensagens agendadas")}`} className="inline-flex items-center gap-0.5 text-[11px] text-casca-suave">
                  <AlarmClock size={12} aria-hidden />
                  {agendadas}
                </span>
              ) : null}
```

e inclua `agendadas > 0 && visualizacao.campos.mensagensAgendadas` na condição `segundaLinha`. Import `AlarmClock` de `@/lib/ui/icons-da-casca`.

Em `components/escale/conversas/fila/ListaDaFila.tsx`: `const contagem = useContagemDeAgendadas(visualizacao.campos.mensagensAgendadas ? itens.map((c) => c.id) : []);` e passe `agendadas={contagem[c.id] ?? 0}` em cada `<LinhaDaFila>` (a fixada também).

Em `components/escale/conversas/painel/CabecalhoDoContato.tsx`: o botão "Agendar" (hoje `disabled title="Em breve"` com `Calendar`) vira a ação "Mensagens agendadas": `AlarmClock`, `aria-label={t("Mensagens agendadas")}`, abre `JanelaMensagensAgendadasDoContato`; com `const contagem = useContagemDeAgendadas([conversa.id]); const n = contagem[conversa.id] ?? 0;`, mostre o número num selo `casca-marca` de 14px no canto do ícone quando `n > 0` (c59). Estado `const [agendadas, setAgendadas] = useState(false)` e `<JanelaMensagensAgendadasDoContato aberta={agendadas} aoFechar={() => setAgendadas(false)} conversationId={conversa.id} contatoNome={nome} />`.

Em `components/escale/conversas/centro/ConversaAberta.tsx`: descomente o import e o `<JanelaAgendarMensagem …/>` da Task 8.

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-mensagens-agendadas-tela.test.tsx tests/unit/escale-fila-da-casca.test.tsx tests/unit/escale-painel-do-contato.test.tsx && corepack pnpm prettier --write components/escale/conversas app/app/inbox/configuracoes && corepack pnpm eslint components/escale/conversas app/app/inbox/configuracoes && corepack pnpm typecheck`
Expected: PASS (os nomes dos testes da 3A: confira com `ls tests/unit | grep escale-`).

- [ ] **Step 7: Commit**

```bash
git add components/escale/conversas app/app/inbox/configuracoes lib/ui/icons-da-casca.ts tests/unit/escale-mensagens-agendadas-tela.test.tsx
git commit -m "feat(escale): agendar mensagem, tela de mensagens agendadas, modal do contato e ⏱ na fila (Fase 3B)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 10: "Pausar automação" no painel direito (D4)

**Files:**
- Create: `components/escale/conversas/painel/CartaoPausarAutomacao.tsx`, `tests/unit/escale-pausar-automacao.test.tsx`
- Modify: `components/escale/conversas/painel/PainelDoContato.tsx` (o cartão entre `CartaoDoNegocio` e `SecoesDoPainel`)

**Interfaces:**
- Consumes: `useConversaDaCasca(id)` → `pausa: EstadoDaPausa | null`, `pausar.mutate({ ate })`, `retomar.mutate()`; `PRAZOS_DA_PAUSA`, `fimDoPrazo`, `textoDoFim`, `pausaVigente`, `seloDaPausa`; `SeletorDeDataEHora`; `useAssignableMembers` (o nome de quem pausou).
- Produces: `CartaoPausarAutomacao({ conversationId })`.

Abra c06, c07, c73 e c74 antes de escrever.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-pausar-automacao.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CartaoPausarAutomacao } from "@/components/escale/conversas/painel/CartaoPausarAutomacao";
import type { EstadoDaPausa } from "@/hooks/escale/useConversaDaCasca";

const pausar = vi.fn();
const retomar = vi.fn();
let estado: EstadoDaPausa = { pausa: null, agenteAtivo: true, followups: { ativos: 0, proximoEm: null } };
vi.mock("@/hooks/escale/useConversaDaCasca", () => ({ useConversaDaCasca: () => ({ pausa: estado, pausar: { mutate: pausar, isPending: false }, retomar: { mutate: retomar, isPending: false } }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [{ user_id: "u2", role: "agent", full_name: "Bia Lima" }] }) }));
let qc: QueryClient;
const wrap = (ui: ReactNode) => render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);

beforeEach(() => {
  qc = new QueryClient();
  pausar.mockClear(); retomar.mockClear();
  estado = { pausa: null, agenteAtivo: true, followups: { ativos: 0, proximoEm: null } };
});

describe("CartaoPausarAutomacao (c06, c07, c74)", () => {
  it("fechado mostra o título; aberto mostra 'Nenhuma automação ativa' e 'Pausar ▾' com os 4 prazos, Até retomar e Escolher data e hora", () => {
    wrap(<CartaoPausarAutomacao conversationId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: "Pausar automação" }));
    expect(screen.getByText("Nenhuma automação ativa")).toBeInTheDocument();
    expect(screen.getByText("Nesta conversa")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(screen.getByText("Pausar todas por")).toBeInTheDocument();
    for (const r of ["30 minutos", "1 hora", "4 horas", "1 dia", "Até retomar", "Escolher data e hora"]) expect(screen.getByText(r)).toBeInTheDocument();
    fireEvent.click(screen.getByText("1 hora"));
    const ate = pausar.mock.calls[0][0].ate as string;
    expect(Math.abs(Date.parse(ate) - (Date.now() + 3_600_000))).toBeLessThan(5_000);
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    fireEvent.click(screen.getByText("Até retomar"));
    expect(pausar).toHaveBeenLastCalledWith({ ate: null });
  });
  it("com pausa vigente mostra 'Pausa de todas', o selo, quem pausou e 'Retomar'", () => {
    estado = { pausa: { ate: null, user_id: "u2", created_at: "2026-10-18T10:00:00Z" }, agenteAtivo: false, followups: { ativos: 1, proximoEm: null } };
    wrap(<CartaoPausarAutomacao conversationId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: "Pausar automação" }));
    expect(screen.getByText("Pausa de todas")).toBeInTheDocument();
    expect(screen.getByText("Até retomar")).toBeInTheDocument();
    expect(screen.getByText(/Por Bia Lima/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retomar" }));
    expect(retomar).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-pausar-automacao.test.tsx`
Expected: FAIL.

- [ ] **Step 3: O cartão**

Create `components/escale/conversas/painel/CartaoPausarAutomacao.tsx`:

```tsx
"use client";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { useConversaDaCasca } from "@/hooks/escale/useConversaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { fimDoPrazo, PRAZOS_DA_PAUSA, pausaVigente, seloDaPausa, textoDoFim } from "@/lib/escale/conversas/pausa";
import { ChevronDown, CirclePause, Clock, Play } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const ITEM = "flex h-9 w-full items-center justify-between px-3 text-left text-[12px] text-casca-texto hover:bg-casca-raia";

/**
 * "PAUSAR AUTOMAÇÃO" (c06, c07, c73, c74; D4; N9): o cartão de 44px entre o
 * negócio e as seções. Fechado: título e chevron. Aberto sem pausa:
 * "Nenhuma automação ativa · Nesta conversa" ou "{n} automação(ões) ativa(s)"
 * e "Pausar ▾" (4 prazos, Até retomar, Escolher data e hora). Com pausa:
 * "Pausa de todas", o selo "🕓 Até retomar / até hh:mm", "Por {pessoa}" e
 * "▶ Retomar".
 */
export function CartaoPausarAutomacao({ conversationId }: { conversationId: string }) {
  const t = useT();
  const { pausa: estado, pausar, retomar } = useConversaDaCasca(conversationId);
  const { data: membros = [] } = useAssignableMembers(true);
  const [aberto, setAberto] = useState(false);
  const [menu, setMenu] = useState(false);
  const [escolhendo, setEscolhendo] = useState(false);
  const [quando, setQuando] = useState(() => new Date(Date.now() + 3_600_000));
  const agora = new Date();
  const vigente = estado?.pausa && pausaVigente(estado.pausa, agora) ? estado.pausa : null;
  const quem = vigente ? (membros.find((m) => m.user_id === vigente.user_id)?.full_name?.trim() ?? t("Atendente")) : null;
  const ativos = (estado?.followups.ativos ?? 0) + (estado?.agenteAtivo ? 1 : 0);
  const ocupado = pausar.isPending || retomar.isPending;

  const pausarAte = (ate: string | null) => {
    setMenu(false);
    setEscolhendo(false);
    pausar.mutate({ ate });
  };

  return (
    <section className={cn("mb-4 rounded-lg border border-casca-borda", vigente && "border-casca-pausa-texto/40 bg-casca-pausa")} data-testid="cartao-pausar-automacao">
      <button type="button" className="flex h-11 w-full items-center gap-2 px-3 text-left" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <CirclePause size={16} aria-hidden className={vigente ? "text-casca-pausa-texto" : "text-casca-suave"} />
        <span className="flex-1 text-[13px] font-medium text-casca-texto">{t("Pausar automação")}</span>
        {vigente && !aberto ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-casca-pausa-texto">
            <Clock size={12} aria-hidden />
            {seloDaPausa(vigente, agora, t)}
          </span>
        ) : null}
        <ChevronDown size={16} aria-hidden className={cn("text-casca-chevron transition-transform", aberto && "rotate-180")} />
      </button>
      {aberto ? (
        <div className="border-t border-casca-borda px-3 py-3">
          {vigente ? (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-casca-texto">{t("Pausa de todas")}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-casca-pausa-texto">
                  <Clock size={12} aria-hidden />
                  <span>{seloDaPausa(vigente, agora, t)}</span>
                </div>
                <div className="text-[11px] text-casca-suave">{t("Por")} {quem}</div>
              </div>
              <BotaoDaCasca variante="texto" tamanho="sm" disabled={ocupado} onClick={() => retomar.mutate()} aria-label={t("Retomar")}>
                <Play size={14} aria-hidden /> {t("Retomar")}
              </BotaoDaCasca>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-casca-texto">
                  {ativos === 0 ? t("Nenhuma automação ativa") : ativos === 1 ? t("1 automação ativa") : `${ativos} ${t("automações ativas")}`}
                </div>
                <div className="text-[11px] text-casca-suave">{t("Nesta conversa")}</div>
              </div>
              <Popover.Root open={menu} onOpenChange={(o) => { setMenu(o); if (!o) setEscolhendo(false); }}>
                <Popover.Trigger asChild>
                  <BotaoDaCasca variante="marca" tamanho="sm" disabled={ocupado} aria-label={t("Pausar")}>
                    {t("Pausar")} <ChevronDown size={14} aria-hidden />
                  </BotaoDaCasca>
                </Popover.Trigger>
                <PainelSuspenso align="end" className="w-[240px] py-1">
                  {!escolhendo ? (
                    <>
                      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-casca-sobrelinha">{t("Pausar todas por")}</div>
                      {PRAZOS_DA_PAUSA.map((p) => (
                        <button key={p.chave} type="button" className={ITEM} onClick={() => pausarAte(fimDoPrazo(p.chave, new Date()).toISOString())}>
                          <span>{t(p.rotulo)}</span>
                          <span className="text-[11px] text-casca-suave">{textoDoFim(fimDoPrazo(p.chave, new Date()).toISOString(), new Date(), t)}</span>
                        </button>
                      ))}
                      <div className="my-1 h-px bg-casca-borda" />
                      <button type="button" className={ITEM} onClick={() => pausarAte(null)}>{t("Até retomar")}</button>
                      <button type="button" className={ITEM} onClick={() => setEscolhendo(true)}>{t("Escolher data e hora")}</button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 p-3">
                      <SeletorDeDataEHora valor={quando} aoMudar={setQuando} />
                      <BotaoDaCasca variante="marca" tamanho="sm" disabled={quando.getTime() <= Date.now()} onClick={() => pausarAte(quando.toISOString())}>
                        {t("Pausar")}
                      </BotaoDaCasca>
                    </div>
                  )}
                </PainelSuspenso>
              </Popover.Root>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
```

Em `components/escale/conversas/painel/PainelDoContato.tsx`, logo DEPOIS do bloco `{negocio.carregando && !quadro ? … : <CartaoDoNegocio …/>}` e ANTES de `<SecoesDoPainel`:

```tsx
      <CartaoPausarAutomacao conversationId={conversa.id} />
```

com `import { CartaoPausarAutomacao } from "./CartaoPausarAutomacao";`.

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-pausar-automacao.test.tsx tests/unit/escale-painel-do-contato.test.tsx && corepack pnpm prettier --write components/escale/conversas/painel && corepack pnpm eslint components/escale/conversas/painel && corepack pnpm typecheck`
Expected: PASS (no teste do painel da 3A, mocke `@/hooks/escale/useConversaDaCasca` se ele renderizar o painel inteiro).

- [ ] **Step 5: Commit**

```bash
git add components/escale/conversas/painel tests/unit/escale-pausar-automacao.test.tsx tests/unit/escale-painel-do-contato.test.tsx
git commit -m "feat(escale): cartão Pausar automação no painel do contato (Fase 3B)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 11: Espanhol, os gates da fase, o PRD, o LOG e o PR

**Files:**
- Modify: `lib/i18n/dicionario.ts`, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md` (seção 8: 3B → "em execução"), `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`

- [ ] **Step 1: O espanhol**

Em `lib/i18n/dicionario.ts`, logo ANTES da linha `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───` (e DEPOIS do bloco da 3A), um bloco com **todo** literal novo desta fase. Rode `corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts` antes: a cerca lista o que falta; a lista abaixo cobre o que as tasks escreveram (acrescente o que a cerca apontar):

```ts
  // ─── FORK ESCALE · Fase 3B: a conversa aberta ───
  "Buscar por…": { es: "Buscar por…" },
  "Buscar atendente": { es: "Buscar agente" },
  "Nenhum atendente encontrado": { es: "Ningún agente encontrado" },
  "Só o atendente atual pode liberar a conversa.": { es: "Solo el agente actual puede liberar la conversación." },
  "O atendente já foi alterado por outro usuário!": { es: "¡El agente ya fue cambiado por otro usuario!" },
  "Copiar link da conversa": { es: "Copiar enlace de la conversación" },
  "O link foi copiado para a área de transferência!": { es: "¡El enlace fue copiado al portapapeles!" },
  "Não foi possível copiar o link.": { es: "No se pudo copiar el enlace." },
  "Marcar como não lida": { es: "Marcar como no leída" },
  "Abrir no Instagram": { es: "Abrir en Instagram" },
  "Contato": { es: "Contacto" },
  "Buscar nesta conversa": { es: "Buscar en esta conversación" },
  "Fechar busca": { es: "Cerrar búsqueda" },
  "Colocar em espera": { es: "Poner en espera" },
  "Remover espera": { es: "Quitar espera" },
  "Encerrar atendimento": { es: "Finalizar atención" },
  "Reabrir atendimento": { es: "Reabrir atención" },
  "Janela encerrada": { es: "Ventana cerrada" },
  "Aguardando abrir janela": { es: "Esperando que abra la ventana" },
  "colocou o atendimento em espera": { es: "puso la atención en espera" },
  "encerrou o atendimento": { es: "finalizó la atención" },
  "reabriu o atendimento": { es: "reabrió la atención" },
  "removeu a espera": { es: "quitó la espera" },
  "O contato respondeu e a espera foi removida": { es: "El contacto respondió y la espera fue quitada" },
  "iniciou o atendimento": { es: "inició la atención" },
  "O atendimento foi alterado de": { es: "La atención fue cambiada de" },
  "para": { es: "a" },
  "Hoje": { es: "Hoy" },
  "Anúncio": { es: "Anuncio" },
  "Ver anúncio": { es: "Ver anuncio" },
  "Ler mais": { es: "Leer más" },
  "Editada": { es: "Editada" },
  "Encaminhada": { es: "Reenviada" },
  "Esta mensagem foi apagada": { es: "Este mensaje fue eliminado" },
  "Opções da mensagem": { es: "Opciones del mensaje" },
  "Responder": { es: "Responder" },
  "Editar mensagem": { es: "Editar mensaje" },
  "Apagar para mim": { es: "Eliminar para mí" },
  "Apagar para todos": { es: "Eliminar para todos" },
  "Restaurar": { es: "Restaurar" },
  "Reenviar": { es: "Reenviar" },
  "Não foi possível enviar": { es: "No se pudo enviar" },
  "Lida": { es: "Leída" },
  "Entregue": { es: "Entregado" },
  "Enviada": { es: "Enviado" },
  "Automação": { es: "Automatización" },
  "Nota interna": { es: "Nota interna" },
  "Carregar mais antigas": { es: "Cargar más antiguas" },
  "Nenhuma mensagem ainda.": { es: "Ningún mensaje todavía." },
  "Mensagem": { es: "Mensaje" },
  "Enviar": { es: "Enviar" },
  "Emoji": { es: "Emoji" },
  "Anexar": { es: "Adjuntar" },
  "Câmera": { es: "Cámara" },
  "Gravar áudio": { es: "Grabar audio" },
  "Respostas rápidas": { es: "Respuestas rápidas" },
  "Modelos de mensagem": { es: "Plantillas de mensaje" },
  "Agendar mensagem": { es: "Programar mensaje" },
  "Enviar Flow": { es: "Enviar Flow" },
  "Assinatura": { es: "Firma" },
  "Ferramentas da mensagem": { es: "Herramientas del mensaje" },
  "Reabra o atendimento para responder.": { es: "Reabre la atención para responder." },
  "Cancelar resposta": { es: "Cancelar respuesta" },
  "Mídia": { es: "Multimedia" },
  "Não foi possível enviar o arquivo.": { es: "No se pudo enviar el archivo." },
  "Fora da janela de 24h da Meta": { es: "Fuera de la ventana de 24h de Meta" },
  "Você só pode enviar mensagens utilizando modelos aprovados.": { es: "Solo puedes enviar mensajes usando plantillas aprobadas." },
  "Enviar outro modelo de mensagem": { es: "Enviar otra plantilla de mensaje" },
  "Aguarde a resposta do contato ou envie outro template aprovado.": { es: "Espera la respuesta del contacto o envía otra plantilla aprobada." },
  "Aguarde a resposta do contato para enviar novas mensagens.": { es: "Espera la respuesta del contacto para enviar nuevos mensajes." },
  "Enviar modelo de mensagem": { es: "Enviar plantilla de mensaje" },
  "Sugestões": { es: "Sugerencias" },
  "Você só pode responder em conversas atribuídas a você.": { es: "Solo puedes responder en conversaciones asignadas a ti." },
  "Atribuir a mim": { es: "Asignarme" },
  "Buscar": { es: "Buscar" },
  "Configurar respostas rápidas": { es: "Configurar respuestas rápidas" },
  "Nova resposta": { es: "Nueva respuesta" },
  "Todos os setores": { es: "Todos los sectores" },
  "Ordenar": { es: "Ordenar" },
  "Gerais": { es: "Generales" },
  "Minhas": { es: "Mías" },
  "Nenhuma resposta encontrada": { es: "Ninguna respuesta encontrada" },
  "Adicionar nota interna": { es: "Agregar nota interna" },
  "O contato não vê esta nota, somente você e sua equipe": { es: "El contacto no ve esta nota, solo tú y tu equipo" },
  "Adicione aqui uma anotação do seu atendimento": { es: "Agrega aquí una anotación de tu atención" },
  "Salvar nota": { es: "Guardar nota" },
  "agora lê esta conversa": { es: "ahora lee esta conversación" },
  "Peça uma sugestão de resposta ou um resumo do atendimento.": { es: "Pide una sugerencia de respuesta o un resumen de la atención." },
  "Sugerir resposta": { es: "Sugerir respuesta" },
  "Resumir conversa": { es: "Resumir conversación" },
  "Agendar mensagem com texto da IA": { es: "Programar mensaje con texto de la IA" },
  "Preencher campos do CRM": { es: "Completar campos del CRM" },
  "Pergunte sobre esta conversa…": { es: "Pregunta sobre esta conversación…" },
  "Enviar pergunta": { es: "Enviar pregunta" },
  "Pensando…": { es: "Pensando…" },
  "Não consegui sugerir uma resposta agora.": { es: "No pude sugerir una respuesta ahora." },
  "Sugestão inserida no campo de mensagem.": { es: "Sugerencia insertada en el campo de mensaje." },
  "Modelos aprovados pela Meta para iniciar ou retomar uma conversa fora da janela de 24h.": { es: "Plantillas aprobadas por Meta para iniciar o retomar una conversación fuera de la ventana de 24h." },
  "Configurar modelos": { es: "Configurar plantillas" },
  "Recarregar modelos": { es: "Recargar plantillas" },
  "Recarregar": { es: "Recargar" },
  "Novo modelo": { es: "Nueva plantilla" },
  "Pesquisar por…": { es: "Buscar por…" },
  "Todas as categorias": { es: "Todas las categorías" },
  "Categoria": { es: "Categoría" },
  "Todas as pastas": { es: "Todas las carpetas" },
  "Pasta": { es: "Carpeta" },
  "Com Flow": { es: "Con Flow" },
  "Usados recentemente": { es: "Usados recientemente" },
  "Todos os modelos": { es: "Todas las plantillas" },
  "Nenhum modelo encontrado": { es: "Ninguna plantilla encontrada" },
  "Selecione um modelo de mensagem à sua esquerda para visualizar o conteúdo.": { es: "Selecciona una plantilla de mensaje a tu izquierda para ver el contenido." },
  "Aprovado": { es: "Aprobado" },
  "Editar modelo": { es: "Editar plantilla" },
  "Preencha os campos do modelo": { es: "Completa los campos de la plantilla" },
  "Modelo enviado.": { es: "Plantilla enviada." },
  "Dentro da janela": { es: "Dentro de la ventana" },
  "até 24h após resposta": { es: "hasta 24h después de la respuesta" },
  "Mensagem livre": { es: "Mensaje libre" },
  "Texto, mídia ou áudio — qualquer formato. Enviada se o lead respondeu nas últimas 24h.": { es: "Texto, multimedia o audio — cualquier formato. Enviado si el lead respondió en las últimas 24h." },
  "Escreva uma mensagem, você pode usar variáveis": { es: "Escribe un mensaje, puedes usar variables" },
  "Fora da janela de 24h": { es: "Fuera de la ventana de 24h" },
  "só modelos aprovados são enviados.": { es: "solo se envían plantillas aprobadas." },
  "Fora da janela": { es: "Fuera de la ventana" },
  "modelo aprovado": { es: "plantilla aprobada" },
  "Modelo de mensagem": { es: "Plantilla de mensaje" },
  "Enviado quando o lead não respondeu nas últimas 24h. Só modelos aprovados pela Meta.": { es: "Enviado cuando el lead no respondió en las últimas 24h. Solo plantillas aprobadas por Meta." },
  "Este dispositivo não envia modelos.": { es: "Este dispositivo no envía plantillas." },
  "Selecionar modelo": { es: "Seleccionar plantilla" },
  "Este modelo exige valores. Preencha-os em Modelos de mensagem antes de agendar.": { es: "Esta plantilla exige valores. Complétalos en Plantillas de mensaje antes de programar." },
  "Data e hora do envio": { es: "Fecha y hora del envío" },
  "Não é possível agendar para uma data/hora no passado": { es: "No es posible programar para una fecha/hora en el pasado" },
  "Confirmar": { es: "Confirmar" },
  "Mensagem agendada.": { es: "Mensaje programado." },
  "Opções do agendamento": { es: "Opciones de la programación" },
  "Remover agendamento": { es: "Quitar programación" },
  "Criação": { es: "Creación" },
  "Envio": { es: "Envío" },
  "Dispositivo": { es: "Dispositivo" },
  "Modelo": { es: "Plantilla" },
  "Nenhuma mensagem agendada.": { es: "Ningún mensaje programado." },
  "Configurações": { es: "Configuración" },
  "Você está em": { es: "Estás en" },
  "Buscar por nome, e-mail ou telefone": { es: "Buscar por nombre, correo o teléfono" },
  "Dispositivo ou conta": { es: "Dispositivo o cuenta" },
  "Limpar": { es: "Limpiar" },
  "mensagens agendadas": { es: "mensajes programados" },
  "Pausar automação": { es: "Pausar automatización" },
  "Nenhuma automação ativa": { es: "Ninguna automatización activa" },
  "1 automação ativa": { es: "1 automatización activa" },
  "automações ativas": { es: "automatizaciones activas" },
  "Nesta conversa": { es: "En esta conversación" },
  "Pausar": { es: "Pausar" },
  "Pausar todas por": { es: "Pausar todas por" },
  "30 minutos": { es: "30 minutos" },
  "1 hora": { es: "1 hora" },
  "4 horas": { es: "4 horas" },
  "1 dia": { es: "1 día" },
  "Até retomar": { es: "Hasta reanudar" },
  "Escolher data e hora": { es: "Elegir fecha y hora" },
  "Pausa de todas": { es: "Pausa de todas" },
  "Por": { es: "Por" },
  "Retomar": { es: "Reanudar" },
  "até": { es: "hasta" },
  "amanhã": { es: "mañana" },
  "Conversa não encontrada.": { es: "Conversación no encontrada." },
  "Agendamento não encontrado.": { es: "Programación no encontrada." },
  "Revisão inválida.": { es: "Revisión inválida." },
  "O atendimento mudou. Atualize e tente novamente.": { es: "La atención cambió. Actualiza e inténtalo de nuevo." },
  "Dados inválidos.": { es: "Datos inválidos." },
  "Filtro inválido.": { es: "Filtro inválido." },
```

(Os literais que já existem no dicionário pelo original ou pela 3A, como "Cancelar", "Salvar", "Em breve", "Sem atendente", "Atendente", "Ontem", "Carregando…", "Fechar", "Mensagens agendadas", "Tags", não se repetem: a cerca acusa duplicata.)

- [ ] **Step 2: Os gates da fase**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts tests/unit/vocabulario-do-funil.test.ts tests/unit/evidencia-citada.test.ts tests/unit/manifest-x-migrations.test.ts $(ls tests/unit | grep -i "cron-routes\|escale-" | sed 's|^|tests/unit/|' | tr '\n' ' ')
corepack pnpm cercas
corepack pnpm typecheck && corepack pnpm eslint components/escale/conversas lib/escale/conversas hooks/escale app/api/v1/conversas-da-casca app/api/v1/mensagens-agendadas app/api/v1/cron/mensagens-agendadas app/api/v1/cron/pausas-de-automacao app/app/inbox/configuracoes
```

Expected: tudo verde. **Nada de `test:db` nem de rodada cheia aqui** (fim da Frente C).

- [ ] **Step 3: O PRD e o LOG (fora do repositório)**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md`, seção 8, a linha da 3B: `proposta` → `em execução (PR aberto em dd/mm)`.

Em `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`: a entrada da 3B na linha do tempo (o que entrou, a migration 9202, os dois crons, as diferenças declaradas da seção "Fora desta fase" abaixo) e "Onde estamos" com a Frente C (3A e 3B mergeadas; 3C a seguir).

- [ ] **Step 4: O PR e o merge**

```bash
git fetch escale-crm && git rebase escale-crm/main   # conflitos: manter os dois blocos
git push -u escale-crm feat/fase-3b-conversa-aberta
gh pr create --repo rgisjr/escale-crm --base main --title "feat(escale): Fase 3B — a conversa aberta de Conversas (igual à Clint)" --body-file <(cat <<'EOF'
## Fase 3B — a conversa aberta de Conversas

Itens C1, C2, C4–C12 e D4 do PRD de Conversas (`docs/escale/modulos/3-conversas.md`). Com a casca ligada, a conversa aberta é a da Clint: cabeçalho com seletor de atendente e ⋮ Mais, barra de status (janela de 24h, Em espera, Encerrar/Reabrir), a thread com as bolhas, os eventos, as notas e o cartão de anúncio, o compositor com os 11 ícones (respostas rápidas, modelos de mensagem, assistente, nota interna, agendar), o compositor fora da janela, "Atribuir a mim", mensagens agendadas (janela, tela de Configurações, modal do contato, ⏱ na fila, dois crons) e "Pausar automação" no painel.

- Migration **9202** (`crm_mensagens_agendadas`, `crm_pausas_de_automacao`, `crm_eventos_da_conversa`).
- Encaixes no original: `lib/channels/pos-entrada.ts` (a mensagem do cliente tira da espera), `docker/scheduler/entrypoint.sh` (dois crons), `baseline.sql`, `dicionario.ts`, `actions.ts`, varredura de RLS, ícones, tokens.
- A casca da 3A não muda de fora: só `ConversaAberta.tsx` troca as peças.

## Verificação
- [x] testes da fase, cercas, typecheck e eslint verdes
- [ ] `test:db` e rodada cheia: no fim da Frente C (regra de 18/10)
- [ ] conferência visual: no fim da Frente C

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
gh pr merge --repo rgisjr/escale-crm --merge --delete-branch=false <número>
```

A tag e a release ficam para o fim da Frente C. Em seguida, a 3C nasce da `escale-crm/main` na mesma worktree (`git switch -c feat/fase-3c-setores-e-configuracoes escale-crm/main`).

## Fora desta fase (registrado)

- O setor no cabeçalho, "Em transferência", a permissão `CHAT_CHANGE_TEAM_ATTENDANT` (que decide se "Sem atendente" vale para quem não é o atendente), o hub ⚙ e a tela de Respostas rápidas da Clint: **3C**.
- A conversa dentro do painel flutuante e da ficha (as props `compacto` de `ThreadDaCasca` e `CompositorDaCasca` já existem): **3E**.
- "Visualizado por", "Mensagem fixada", assinatura, Flow, "Resumir conversa", "Preencher campos do CRM", a pergunta livre do assistente, "Todas as pastas", "Com Flow", ⚙ dos modelos, o filtro por setor das respostas rápidas: **Em breve**.
- A permissão de chamada na linha da fila (`CallingWindowBadge`): o original não guarda a janela de chamada; o toggle da 3A fica "Em breve".
- **Diferenças declaradas:** "Sem atendente" só libera o próprio atendimento (N10); o player de áudio é o do original, sem a onda da Clint (N14); a câmera é o seletor de arquivo do navegador com `capture` (N15); "Editar" só em texto nosso de até 15 min (regra do original); a janela "Agendar mensagem" só agenda modelos sem parâmetros ou com os valores salvos (Task 9); a busca da tela de mensagens agendadas filtra pelo contato (nome, e-mail, telefone), não pelo texto da mensagem; os eventos de atribuição anteriores à 3B aparecem (vêm da tabela do original), mas espera/encerramento só a partir da 3B.
- **Provisórios (sem print):** a bolha "1" ao marcar como não lida; "Editada"/"Encaminhada"/apagada na bolha; o gravador e o menu de anexo são os do original; "Atendido por IA · {agente}" no cabeçalho (não implementado nesta fase; entra quando houver print).

## Self-review (18/10)

1. **Cobertura do PRD:** C1 (Task 6: cabeçalho, seletor, ⋮; Task 3: não lida), C2 (Tasks 1–3: espera, encerrar, reabrir, eventos; Task 6: barra; Task 8: fora da janela), C4 (Tasks 1, 7), C5 (Task 8: compositor e ícones), C6 (Task 8: respostas rápidas), C7 (Tasks 5, 8: modelos), C8 (Task 8: nota interna), C9 (Tasks 1, 2, 4, 5, 9: agendadas, tela, modal, ⏱, cron), C10 (Tasks 1, 8: assistente), C11 (Task 8: bloqueios, Atribuir a mim, aguardando contato), C12 (Task 8: Enviar Flow "Em breve"), D4 (Tasks 1–3, 5, 10: pausa e cron). Decisões 2, 6, 11 e 12 da seção 9 aplicadas (N3, N13, N20, N10).
2. **Placeholders:** nenhum "TBD". Onde o plano depende de um detalhe do código que não foi lido linha a linha (a forma de `ok(...)` com `meta` e `created(...)` em `lib/api/wrappers`; o `actor` de `HandlerCtx`; os campos de `PreviaDaMensagem`; o retorno de `useUploadMedia`; os `aria-label` das peças do compositor do original; o caminho de `FotoDaLinha`, `corDoAvatar`, `inicialDoNome`; a forma de `lerPreferenciaDeMenu`; onde `visibility_mode` chega ao cliente), o passo diz onde conferir e o que copiar, e o teste é ajustado ao nome real, não o contrário.
3. **Tipos entre tasks:** `EventoDaConversa`/`eventosDasAtribuicoes`/`textoDoEvento`/`juntarItens`/`rotuloDoDia` (Task 1) são o que a rota de eventos (Task 3), o hook (Task 5) e a thread (Task 7) usam; `camposParaEntrarEmEspera`/`camposParaSairDaEspera`/`emEsperaDaCasca`/`ESPERA_SEM_FIM` (Task 1) são o que a rota de espera (Task 3) e a barra (Task 6) usam; `seloDaJanela`/`modoDoCompositor`/`ModoDoCompositor` (Task 1) são o que a barra (Task 6), o compositor (Task 8), `ConversaAberta` (Task 8) e a janela de agendar (Task 9) usam; `novaAgendadaSchema`/`listaDeAgendadasSchema`/`AgendadaLida`/`decidirEnvio`/`AGENDADAS_POR_PAGINA` (Task 1) são o que as rotas e o cron (Task 4), os hooks (Task 5) e a tela (Task 9) usam; `EstadoDaPausa` (Task 5) é o que a rota (Task 3) devolve e o cartão (Task 10) lê; `PRAZOS_DA_PAUSA`/`fimDoPrazo`/`textoDoFim`/`pausaVigente`/`seloDaPausa` (Task 1) são o que o cartão (Task 10) usa; `ModeloAprovado`/`useModelosDeMensagem` (Task 5) é o que a janela de modelos (Task 8) e a de agendar (Task 9) usam; `ultimaMensagem` (Task 7) é o que `ConversaAberta` (Task 8) usa; `useAlterarMensagem` devolve `editar`/`apagar`/`ocultar`/`restaurar` (conferido no original) e a thread (Task 7) usa esses nomes.
4. **Cercas:** `cron-routes-scheduled` (as duas linhas do `entrypoint.sh` entram na Task 3, as rotas nas Tasks 3 e 4); `rls-completude-varredura` e `tabelas-do-motor-nao-se-leem-pelo-login` (Task 2, três tabelas lidas pela sessão, service role só nos crons); `manifest-x-migrations` (a linha `-- manifest:`); `tailwind-tokens` (os 5 tokens da N18 na Task 6); `i18n-espanhol-cobre-a-tela` (Task 11); `evidencia-citada` (caminhos sem crase na tabela de prints); `escale-casca-v2-original-intacto` (os encaixes no original são os da tabela, cada um com `FORK ESCALE · Fase 3B`).
