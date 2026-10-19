# PRD — Módulo Conversas (Fase 3)

> Nível 2 do [roteiro](../roteiro.md): o que a Clint faz em Conversas, o que o Escale já tem, o que falta e em que fase entra.
> **Rascunho de 17/10/2026, escrito pelo agente com as decisões delegadas pelo usuário** ("pode decidir por mim essa parte de PRD"). Atualizado em 18/10 com 66 prints novos da Clint (seções 2, 4, 5, 11 e 13). As decisões tomadas estão na seção 9; o que só o usuário pode responder está na seção 10. Vira "aprovado" quando o usuário disser.
> Este documento fala do **quê** e do **porquê**. O **como** (arquivos, tabelas, migrations, testes) fica no plano de cada fase, em `docs/superpowers/plans/`.

## 1. Objetivo

Conversas é onde a venda acontece: a fila do WhatsApp (e do Instagram) com o contexto comercial ao lado. Na Escale, a tela `/app/inbox` tem de fazer o que a Clint faz em `/chat`:

- **o atendente** abre a fila, vê quem está esperando e há quanto tempo, responde (texto, áudio, resposta rápida, modelo, mensagem agendada, nota interna) e, no painel direito, vê e mexe no negócio do contato (etapa, dono, valor, status, atividades) sem sair da conversa;
- **o gestor** filtra a fila por qualquer coisa (conversa, negócio, contato, canal), salva o filtro, ordena por quem espera mais, redistribui atendente e setor em massa e configura dispositivos, setores, respostas rápidas e permissões num só lugar;
- **o dispositivo** cria o negócio na origem certa ao receber a primeira mensagem, com condições, e acaba com a "origem padrão" (decisões 5 e 7 do roteiro).

### Problema

O Escale tem o motor de conversas do original (WAHA e Meta Cloud, realtime, atribuição com auditoria, roteamento por rodízio e carga, janela de 24 h, chamadas, agentes de IA), mas não o jeito de trabalhar da Clint:

- a fila tem abas (Automático, Fila, Minhas, Todas, Fechadas, Arquivadas) em vez dos presets e dos filtros salvos; não ordena por espera; não personaliza a linha; não tem modo espião nem "marcar como não lida";
- o painel de filtros só tem busca, não lidas, número e tags: não filtra por data, atendente, status, setor, agente nem por nada do negócio;
- não existe setor, seleção nem ação em massa, nem mensagem agendada pelo atendente;
- o painel direito mostra contato, tags, demandas, memória, leads e pedidos do jeito do Deskcomm, não o cartão do negócio e as 8 seções da Clint;
- a conversa não abre dentro do painel flutuante nem da ficha do negócio (C22), e o negócio ainda nasce pelo funil `is_default`, que o roteiro manda tirar.

Quem veio da Clint não reconhece a tela e perde o contexto comercial enquanto atende. E a casca só vira padrão para todos quando as Fases 1 e 3 estiverem prontas (decisão 3 do roteiro).

### Evidências

- **9 fichas da Clint** (02-001 a 02-009) com as capturas reais, mais **114 prints** em `docs/clint/prints-conversas/`: 5 de 16/10 (o modal do dispositivo e a lista de canais) e 109 de 17 e 18/10 (`c01` a `c108`), tirados na Clint do usuário.
- **Engenharia reversa** da Clint (seção 2): textos, presets, filtros, ordenação, ações em massa, status, modelo de dados da API e permissões.
- **Decisões já tomadas** que dependem desta fase: C22 do PRD de Negócios ("abrir a conversa dentro do painel flutuante"), Q6 e Q7 da 1H (modo espião e filtros de Conversas), decisões 5, 7 e 8 do roteiro.
- **Código do Escale:** levantamento somente leitura de 17/10 (seção 3).

### Hipótese

Acreditamos que levar a tela de Conversas ao nível da Clint vai permitir que o time atenda só pela casca, com o negócio ao lado, e que a casca possa virar a interface única do Escale OS.

Saberemos que deu certo quando **todos os itens "adotar" e "adaptar" da seção 4 estiverem no ar e conferidos lado a lado com a Clint** (critério de pronto da seção 6 do roteiro). Métrica de uso: **TBD — validar com o usuário**, a mesma pergunta 1 dos PRDs de Negócios e de Contatos.

### Métricas de sucesso

| Métrica | Meta | Como medir |
|---|---|---|
| Itens "adotar" ou "adaptar" da seção 4 entregues | 100% | Coluna "Fase" da seção 4 contra o LOG.md |
| Negócios nascidos por `is_default` a partir do WhatsApp | 0 depois da 3E | Consulta ao banco (origem do negócio × dispositivo) |
| C22 e o modo espião fora do "Em breve" na ficha do negócio | sim | Tela |
| Uso real do módulo | TBD — validar com o usuário | TBD |

## 2. Fontes

| Fonte | O que cobre |
|---|---|
| Fichas da Clint (`Escale IA OS/clint-documentacao/modulos/02-conversas/`) | 02-001 filtros de conversas; 02-002 filtros de negócios; 02-003 tela principal; 02-004 seção Atividades; 02-005 "Personalizar campos" do negócio; 02-006 presets e filtros salvos; 02-007 seleção em massa; 02-008 "Personalizar visualização"; 02-009 as 8 seções |
| Prints de 16/10 (`docs/clint/prints-conversas/2026-10-16-*`) | Modal "Informações do dispositivo": abas, "Criação de negócio" ligada (condição aberta e fechada) e desligada, aba Dispositivos (setor, indicador de digitação, atendentes da conta), lista de canais WhatsApp Oficial |
| Prints de 17/10 (`docs/clint/prints-conversas/2026-10-17-c01` a `c74`) | Fila (sem conversa, menu ⋮, presets, ordenar, modo espião, "Personalizar visualização" com limites de alerta, linha com setor e tempo sem resposta, conversa fixada fora do filtro), filtros (Conversas com cada seletor aberto, Contatos com tags, Canais, "Personalizado" e "Salvar filtro"), ações em massa (tela e os 4 modais), conversa aberta (cabeçalho, menu Mais, seletor de atendente, em espera, fechada, fora da janela, áudio, dicas "Reabrir atendimento" e "Remover espera"), compositor (agendar, respostas rápidas, modelos com prévia, Aura, nota interna, Flow), painel direito (Pausar automação aberto e ativo, negócio perdido com motivo, "Seções visíveis", Contato, Atividades, Negócio, Empresa, Notas, Anexos, Histórico com filtro, Conversas, mensagens agendadas do contato), "Nova conversa", Configurações (hub, Setores, "Crie um setor", Mensagens agendadas, Usuários e Permissões, Respostas rápidas) |
| Prints de 18/10 (`docs/clint/prints-conversas/2026-10-18-c75` a `c108`) | Fila vazia com filtro, filtros de negócio (data com tipos, status, motivo de perda, dono), "Selecionar todos" (56.128), "Nova conversa" com busca e dispositivos, Setores (⋮, "Editar setor"), usuário (Geral, Permissões com as 19 chaves de Conversas, grupo de permissão, Contas e dispositivos), "Criar Resposta rápida" e ⋮, Configuração de canais, WhatsApp não oficial (lista, ⋮, aba Dispositivos, "Criação de negócio" desligada e ligada, editar nome e excluir condição) |
| Engenharia reversa (`C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\`) | Rotas (`/chat`, `/chat/settings/*`), textos pt-BR (`raw-v2/js/pt-BR-DmQ11GIn.js.txt`, que tem as chaves `label.t*` que faltam no `catalog-v2/i18n-pt.txt`), fila e painel direito (`index-CPsdLJFo`), conversa e compositor (`index-BhVJ8kAx`), casca e ações em massa (`index-YQu0gzVE`), enum de status e store (`index-CY2O8ZFZ`), modal do dispositivo (`index-BGmkH1Xr`), actions (`catalog-v2/actions__3-atendimento.txt`) |
| Código do Escale | Levantamento somente leitura de 17/10. O resumo está na seção 3 |

**Sobre os textos:** valem os da Clint, como nos PRDs anteriores (princípio 1 do roteiro). Os textos citados aqui são os dela.

**Estilo da Clint:** Chakra UI v3 (tokens `fg.muted`, `bg.subtle`, `bg.panel`; botão principal `purple solid`; barra da fila `variant toolbar`). As larguras da fila e do painel direito não estão no código; o plano da 3A as mede nos prints.

## 3. O que o Escale já tem

### Tela (`/app/inbox`)

- **Três colunas** (`components/inbox/InboxLayout.tsx`): lista, conversa e painel do contato, com divisórias arrastáveis e largura guardada no navegador. No celular, uma coluna por vez.
- **Lista:** abas Automático, Fila, Minhas, Todas, Fechadas e Arquivadas (na URL), contadores a cada 30 s, busca por nome, telefone ou prévia, filtros de não lidas, grupos, número e tags (E/OU, da conversa ou do contato), "Carregar mais" por cursor, posição na fila ("1º, 2º…"). A linha mostra avatar com o logo do canal, nome, até 2 tags do contato, dono e "Aguardando há…".
- **Conversa:** cabeçalho com canal, selo da janela de 24 h, dono, busca, discador, vídeo, Assumir, Liberar, Devolver ao automático, Pausar o automático, Transferir, Snooze, Fechar, Reabrir, Arquivar, Pessoal; thread com mensagens, notas internas e a passagem da IA; compositor com anexo, áudio, emoji, menções, templates com "/", rascunho por IA e modo nota interna; avisos de retenção, número fora do ar e janela fechada; atalhos de teclado.
- **Painel direito** (`CRMSidePanel.tsx`): contato (nome, telefone, tags, compromisso, "Novo Lead" no funil padrão, "Ver contato"), enriquecimento, tags da conversa, demandas abertas, memória do contato, leads recentes (com troca de etapa e campos), pedidos, atividade e acervo. **A atribuição fica no cabeçalho, não no painel.**
- **Painel flutuante da casca** (`components/escale/ConversasFlutuante.tsx`, Fase 0): 5 conversas recentes, sem realtime; cada item é um link para o Inbox.

### Modelo e motor

- **`conversations.status`** com 7 valores: `open`, `pending`, `resolved`, `claimed`, `ai_handling`, `closed`, `archived`. A API grava 5; `pending` só o motor (handoff); `resolved` é legado. Há um eixo calculado no banco, `comando_da_conversa` (humano, automático, aguardando, encerrada). **Não existe "em espera":** o snooze (`snooze_until`, rotas `.../snooze`) é um lembrete vigiado por um worker, não um status.
- **Atribuição:** `assigned_to_user_id`, `assignee_kind` (`user`/`ai`), auditoria em `conversation_assignment_events`, RPC `fn_conversation_assign`; rotas `claim`, `transfer`, `release`, `pause-ai`, `reactivate-bot`. Roteamento `manual`/`round_robin`/`load` em `organizations.settings.routing`, com `visibility_mode` (`all`, `own_and_unassigned`, `own`), disponibilidade por atendente e responsáveis por número (`channel_routing_responsibles`, migration 0228).
- **Setor/departamento: não existe.** A fila é por organização ou por número.
- **Não lidas:** contador único `unread_count_for_assignee`; zera ao abrir (1,5 s) por `mark-read`. Sem "lida por quem", sem "marcar como não lida", sem modo espião (só o suporte em `support_readonly` não marca).
- **Tags:** duas caixas, `conversations.tags` e `contacts.tags`, com vocabulário e cores da organização.
- **Preferências por pessoa:** não há tabela genérica. O fork tem `crm_filtros_salvos` (9004, só origem/visualização do quadro) e `crm_colunas_das_listas` (9101, só contatos/empresas), que são os moldes.
- **Realtime:** canal por organização em `conversations` e por conversa em `messages`, com refetch de segurança a cada 45 s.
- **Dispositivos:** `channel_sessions` (WAHA, Meta Cloud, Zernio, WaCalls, Datafy), tela `/app/connections` (admin), rotas `api/v1/channel-sessions/*`.
- **Nascimento do negócio** (`lib/leads/nascimento-do-lead.ts`): ao chegar conversa nova, se o contato não tem negócio aberto, cria no funil da campanha ou no `crm_pipelines.is_default`, na primeira etapa. Não há condição por dispositivo.
- **Mensagem agendada pelo atendente: não existe** (só campanhas, prospecção, follow-up da IA e reativação).
- **Janela de 24 h** calculada em `lib/channels/janela.ts`; envio fora da janela só por template. **Chamadas** em `voice_calls` (WaCalls e SIP), discador no cabeçalho.

### Do fork

- Filtros do quadro (1D) já têm a seção Conversas (com/sem conversa, não lidas, não respondidas, situação, canais, atendentes) em `lib/escale/filtros/`: é o inverso do que a Clint faz aqui (filtrar conversas por negócio).
- Ficha do negócio (1G/1H): cabeçalho com status, dono e motivo; "próximo negócio" com setas; as 7 abas. A aba Conversas tem o botão "Ativar modo espião" desligado ("Em breve", Q6 da 1H) e mostra só a conversa mais recente.
- Lista de contatos (2A): abre ou inicia conversa (`SeletorDeCanalParaConversa`).
- Menu do topo: contador da fila (`ContadorDaFilaDaCasca`).

### O que o original tem e a Clint não tem (não pode quebrar)

- Roteamento automático (rodízio, carga, posição na fila, disponibilidade), responsáveis por número e "a conversa fica com o atendente".
- Agentes de IA como atendente (`assignee_kind = ai`), handoff auditado, passagem da IA, rascunho de resposta por IA, memória do contato, acervo/RAG, "usável para RAG".
- Demandas (ciclo de atendimento com `current_demanda_id`), pedidos (Nuvemshop), retenção de mensagens (vetos do `before_send`), exportar conversa em PDF, ocultar mensagem recebida, arquivar, conversa pessoal, grupos de WhatsApp.
- Multi-provedor (WAHA, Meta Cloud, Zernio, WaCalls, Datafy), aquecimento e limite diário, agenda de pausa do número.

## 4. Quadro Clint × Escale

**Legenda:**
- **Hoje:** ✅ tem · ◐ parcial · ✗ falta.
- **Decisão:** adotar (fazer como a Clint) · adaptar (fazer do nosso jeito, mantendo o motor do original) · ignorar.
- **Fonte:** ficha (02-00x), print (c01…c42 de 17/10; 16/10-0x), bundle JS ([LIST] `index-CPsdLJFo`, [CONV] `index-BhVJ8kAx`, [SHELL] `index-YQu0gzVE`, [MAIN] `index-CY2O8ZFZ`, [DEV] `index-BGmkH1Xr`, [PT] `pt-BR-DmQ11GIn`).

### A. Fila

| # | Comportamento da Clint | Fonte | Hoje | Decisão | Fase |
|---|---|---|---|---|---|
| A1 | Três painéis: fila, conversa, contexto do contato; o painel direito e o de filtros têm 360 px | 02-003, c01, c02 | ✅ três colunas, larguras diferentes | adotar as medidas da Clint (o plano mede nos prints) | 3A |
| A2 | Cabeçalho "Conversas" com ⚙ (hub de configurações) e "Nova conversa +" | c01, c37 | ◐ | adotar (o hub é a E5) | 3A |
| A3 | "Pesquisar": nome, telefone, prévia | 02-003 | ✅ | adotar o visual | 3A |
| A4 | Botão "Todos" com os presets Todos, Não lidas (99+), **Status:** Meus em aberto, Em aberto, Em espera, Fechadas, **Salvos:** Criar filtro; com grupos de WhatsApp, "Somente conversas" e "Somente grupos". O preset é um filtro: escolher "Em espera" preenche "Status da conversa" no painel e o funil mostra "1". Mexer em qualquer critério troca o botão para "Personalizado" (ícone de ajustes) | 02-006, c31, c64, c65, c71, [LIST] | ◐ abas Automático, Fila, Minhas, Todas, Fechadas, Arquivadas | **adaptar:** os presets da Clint sobre o mapa de status da seção 6; "Em espera" usa o snooze do original (decisão 2 da seção 9); "Arquivadas" sai das abas e vira o valor "Arquivada" do filtro de status; Automático e Fila saem da casca (A14) | 3A (presets) · 3D (salvos) |
| A5 | Ordenar por "Última interação" (padrão) ou "Esperando mais tempo" | 02-003, [LIST] `HC` | ✗ (só última mensagem) | adotar (`last_message_at` desc · `last_response_at` asc) | 3A |
| A6 | Menu ⋮ "Mais": Selecionar, Ativar/Desativar modo espião, Personalizar visualização (ponto roxo quando difere do padrão) | c22, c24, [LIST] | ✗ | adotar ("Selecionar" entra na 3D) | 3A |
| A7 | Linha: avatar com o selo do canal, nome, prévia com ícone (✓✓ enviada, 🎤 voz, 📄 documento, ⇄ evento "O atendente foi alterado"/"O status foi alterado"), hora (ou "Ontem", ou a data), avatar do atendente ou ícone "sem atendente", bolha azul de não lidas, chevron ao passar o mouse. Segunda linha opcional: selo do setor ("AT"), tempo sem resposta ("2 min", "1h" em amarelo, "10h"/"8d" em vermelho) e "⏱ 1" de mensagens agendadas. Textos: "Aguardando resposta há…", "Setor: …", "Rascunho:", "Falha no envio" | 02-003, c02, c15, c45, c47, c78, [PT] `component.ChatItem.*` | ◐ nome, tags, dono, "Aguardando há…" | adotar | 3A |
| A8 | "Personalizar visualização" (painel de 360 px sobre o centro): prévia ao vivo; toggles Atendente, Empresa, Setor, Tempo sem resposta, Mensagens agendadas, Tags, Permissão de chamada; **no máximo 5 ligados**, rodapé "{n} de 5 campos ativos" (no limite, os desligados ficam cinza) e "Restaurar padrão"; padrão: Atendente e Permissão de chamada. Com "Tempo sem resposta" ligado, o ícone de ajustes abre "Amarelo a partir de 1 Horas" e "Vermelho a partir de 4 Horas" (número e Minutos/Horas/Dias). Fora do padrão, o item do menu ⋮ ganha um ponto roxo | 02-008, c44–c47, c81, [PT] `component.PersonalizeChatCard.*` | ✗ | adotar; preferência por pessoa; "Setor" liga na 3C e "Empresa" quando a 2D chegar | 3A |
| A9 | Modo espião: faixa verde "Modo espião ativo · abrir uma conversa não vai marcá-la como lida · Desativar"; vale pela sessão | c23, [CONV] `SpyModeBar`, [MAIN] `toggleSpyMode` | ✗ | adotar (flag de sessão, sem banco) | 3A |
| A10 | Contador "99+" no item do menu e no preset "Não lidas" | 02-003, c31 | ◐ `ContadorDaFilaDaCasca` | adotar | 3A |
| A11 | Estados: centro vazio "Envie e receba mensagens dos seus clientes" + "Iniciar uma conversa"; sem canal, "Conecte um canal para começar a conversar" com os botões de conectar; fila vazia com filtro, ícone de funil + "Nenhuma conversa nos filtros · Ajuste os filtros para ver conversas." + "Iniciar uma conversa"; carregando, "Carregando mensagens…" com spinner na fila | c01, c75, [SHELL] | ◐ | adotar | 3A |
| A12 | "Nova conversa" troca o centro pela tela "Crie ou selecione um contato" (? de ajuda; "Pesquise pelo nome, e-mail, telefone ou Instagram do contato"). A busca lista contatos com foto, telefone e e-mail, e o botão roxo "Criar "{termo}"" no topo. Escolhido o contato, o cabeçalho mostra o nome e aparece "Selecione um dispositivo ou conta" (?), com os dispositivos agrupados (WHATSAPP, WHATSAPP OFICIAL, Instagram), número e bolinha verde/vermelha de conectado | c21, c84–c86, [PT] `component.NewChat.*` | ◐ `PainelIniciarConversa` | adotar | 3A |
| A13 | Painel direito sem conversa: "Nenhuma conversa selecionada · Selecione uma conversa para carregar as informações do contato" | c01 | ✗ | adotar | 3A |
| A14 | Abas "Automático" e "Fila" e a posição "1º, 2º…" | — (só o original) | ✅ | **ignorar na casca:** o roteamento continua funcionando; a conversa roteada aparece em "Em aberto" sem atendente, e o filtro "Agentes" (B2) cobre o Automático. O Inbox original segue com as abas | — |
| A15 | Conversa aberta que sai do filtro fica **fixada no topo** da fila: fundo verde-claro, X para soltar, ícone de alfinete com a dica "Esta é a conversa atual e ela não corresponde a visualização dos filtros." | c54, c55, [PT] | ✗ | adotar | 3A |

### B. Filtros, filtros salvos, seleção e ações em massa

| # | Comportamento da Clint | Fonte | Hoje | Decisão | Fase |
|---|---|---|---|---|---|
| B1 | Painel "Filtros" (funil azul quando há filtro ativo) com acordeões Conversas, Grupos (só com a feature), Negócios, Contatos, Canais; estado dos acordeões lembrado no navegador; em telas menores vira gaveta | 02-001, c32, c36, [LIST] `tr` | ◐ só busca, não lidas, número, tags | adotar, reaproveitando o motor de filtros da 1D (princípio 4) | 3D |
| B2 | Conversas: toggles Atribuídas a mim, Não atribuídas, Sem resposta do atendente, Aguardando resposta do contato, Em transferência, Lidas, Não lidas, Dentro/Fora da janela de conversa, Janela de chamada aberta/fechada (os 4 só com WhatsApp Oficial), Conversas suspensas; "Data de criação do atendimento" (calendário de dois meses com atalhos Hoje, Ontem, Essa semana, Semana passada, Esse mês, Mês passado, Esse ano); "Status da conversa" (caixinhas Em espera, Em aberto, Fechado); "Atendentes" (lista com caixinhas; admin ou quem vê o time); "Agentes" (os agentes de IA; até 20); "Setores" | 02-001, c32, c65–c70, [LIST] `jf` | ◐ a API já aceita `assigned_to`, `unassigned`, `status`; data, setor e agente não | adotar; "Em transferência" só com setor (3C); "Conversas suspensas" = automações/agente pausados (D4) | 3D |
| B3 | Negócios: "Data" (o mesmo calendário, com três ícones no topo para escolher criação, ganho ou perda), "Com/sem negócio", "Negócio com status" (Aberto, Ganho, Perdido; com Perdido aparece "Motivo de Perda", que começa por "Não informar"), "Dono do negócio" (começa por "Sem dono"), "Negócio nos grupos", "nas origens", "nas etapas" | 02-002, c76–c80, [LIST] `Xf` | ✗ (o quadro tem o inverso) | adotar; uma conversa casa se **algum** negócio aberto do contato casa (regra da 1D, invertida) | 3D |
| B4 | Contatos: "Tags" com "Adicionar condição" (Qualquer tag, Sem tag, ou a tag) | c33, c34, [LIST] `qf` | ✅ tags E/OU | adotar o visual | 3D |
| B5 | Canais: "Canais e Dispositivos", agrupados (WhatsApp Oficial, WhatsApp, Instagram), com "Desconectado" | c35, c36 | ◐ só o número | adotar | 3D |
| B6 | Filtros salvos: "+ Criar filtro" abre o painel de Filtros; com algum critério, o cabeçalho do painel ganha "🔖 Salvar filtro" e "Resetar", e cada acordeão com critério mostra o contador e um X. "Salvar filtro" abre um balão "NOME DO FILTRO" (exemplo "Ex: Clientes em aberto"), Cancelar e Salvar. Os salvos aparecem em "Salvos" no botão; "Renomear", "Excluir filtro"; limite de 20 | 02-006, c31, c64, c71, c72, [LIST] `component.FilterBar.*` | ◐ 9004 só para o quadro | adotar, **generalizando a `crm_filtros_salvos`** para aceitar a fila (alvo "conversas"); pessoal ou compartilhado, como na 1D | 3D |
| B7 | "Selecionar": "Selecionar todos", X vermelho, caixinha por linha. Na Clint, "Selecionar todos" marca **todas as conversas do filtro** (sem filtro, a base inteira: "56128 selecionados"); desmarcar uma linha vira "56127 selecionados"; o centro diz "{n} conversas selecionadas" | 02-007, c25, c82, c83 | ✗ | adotar com a regra da B3 do PRD de Contatos (decisão do usuário, 17/10): a caixinha marca a lista carregada, e marcar todos os resultados do filtro é uma escolha à parte, com o total escrito | 3D |
| B8 | "Ações em massa": Alterar status (Em aberto, Fechado, Em espera), Alterar atendente ("Sem atendente"), Alterar setor (campo "Equipe"), Alterar tag do contato (Incluir/Remover); modal com "Executar ação em massa", sem "tem certeza"; toasts "Essa ação em massa pode demorar…"; "Sair de ação em massa" | 02-007, c25–c30, [SHELL] `up`/`cp` | ✗ | adotar; ações sobre "todos" vão ao servidor como o filtro e rodam em segundo plano acima de um limite (o plano fixa); permissão própria (seção 5) | 3D |

### C. Conversa aberta

| # | Comportamento da Clint | Fonte | Hoje | Decisão | Fase |
|---|---|---|---|---|---|
| C1 | Cabeçalho: avatar, nome, "{canal} - {dispositivo}" (ex.: "WhatsApp Oficial - Grupo Toda"), selo do setor ("AT"), seletor de atendente com busca e "Sem atendente", menu ⋮ "Mais" (Iniciar uma conversa, Copiar link da conversa, Marcar como não lida, Abrir no Instagram); "Atendido por IA · {agente}" / "Agente pausado · {agente}"; "O atendente já foi alterado por outro usuário!" | c02, c03, c04, [CONV] `component.ChatHeader.*` | ◐ `ConversationHeader` com Assumir/Transferir/… | adotar o cabeçalho da Clint sobre as rotas do original (`claim`, `transfer`, `release`, `pause-ai`, `reactivate-bot`, conflito 409 → o texto da Clint); "Marcar como não lida" é rota nova (seção 7); setor na 3C | 3B |
| C2 | Barra abaixo do cabeçalho: selo da janela (relógio "23:36" no WhatsApp Oficial, "6d 23h 56m" no Instagram, "Janela encerrada" ou "Aguardando abrir janela" quando fechada), dois ícones à direita com dica: "Colocar em espera"/"Remover espera" e "Encerrar atendimento"/"Reabrir atendimento". A thread registra "{pessoa} colocou o atendimento em espera - hh:mm" e "{pessoa} encerrou o atendimento - hh:mm"; mensagem nova reabre a fechada e tira da espera. Fora da janela, o compositor vira um aviso "Fora da janela de 24h da Meta · Você só pode enviar mensagens utilizando modelos aprovados" (ou "Enviar outro modelo de mensagem · Aguarde a resposta do contato ou envie outro template aprovado") com Aura, ideia, agendar e o botão roxo "Modelo" | c02, c05, c56, c58–c60, c73, [CONV] `component.ChatStatusActions.*`, [MAIN] eventos | ◐ JanelaSelo, Fechar, Reabrir, Snooze, JanelaFechadaAviso | **adaptar:** Encerrar = `close`; Reabrir = status `open`; Em espera = snooze do original sem lembrete (seção 9, decisão 2); a reabertura por mensagem nova já existe no motor | 3B |
| C3 | Transferência "Em transferência" (para atendente ou setor), com "Cancelar transferência" e confirmação | [CONV] | ◐ transferência imediata | **adaptar:** para atendente, continua imediata (o original audita); "Em transferência" só para setor, quando o setor existir | 3C |
| C4 | Thread: bolhas, cartão de anúncio (CTWA) com "Ver anúncio", "Ler mais", eventos de sistema ("O atendimento foi alterado de X para Y - hh:mm"), nota interna amarela, áudio com transcrição, "Editada", "Encaminhada", "Mensagem fixada", "Visualizado por", Apagar para mim/para todos, Reenviar | c02, [CONV] | ◐ `ChatThread` (editar, revogar, ocultar já existem) | adotar o visual; "Visualizado por" e "fixar" ficam "Em breve" (o original não guarda) | 3B |
| C5 | Compositor: "Mensagem", ícones Aura, emoji, anexo, câmera, áudio ("Gravar áudio", parar, retomar, descartar), respostas rápidas, assinatura, nota interna, modelos, Flow, agendar, "Enviar"; arrastar arquivo; "Sua assinatura também é contabilizada" | c02, [CONV] | ◐ `Composer` | adotar; Flow só com Meta Cloud (senão o ícone não aparece) | 3B |
| C6 | "Respostas rápidas": busca, filtro por setor, "Ordenar por A-Z", grupos ("GERAIS"), atalhos "/…", "+ Nova resposta", ⚙ | c09 | ◐ templates com "/" | adotar sobre os templates do original; a tela de gestão é a E6 | 3B |
| C7 | "Modelos de mensagem": busca, "Todas as categorias", "Todas as pastas", "Com Flow", ⚙, atualizar, "+ Novo modelo"; lista "USADOS RECENTEMENTE" e "TODOS OS MODELOS" com idioma e categoria ("Marketing"); ao escolher, a prévia à direita com o selo "Aprovado" e "Editar modelo"; Cancelar e "Enviar" | c10, c63 | ◐ envio `type: template` | adotar | 3B |
| C8 | "Adicionar nota interna": "O contato não vê esta nota, somente você e sua equipe", caixa amarela, "Salvar nota" | c12 | ✅ modo nota | adotar o visual | 3B |
| C9 | "Agendar mensagem": "Dentro da janela · até 24h após resposta" (mensagem livre) e "Fora da janela · 24h sem resposta" (template Meta obrigatório), Data, Hora, "Confirmar"; "Não é possível agendar para uma data/hora no passado"; na linha, "⏱ {n}"; nas ações rápidas do contato, o ícone de agendar com o contador, que abre o modal "Mensagens agendadas" só daquele contato; tela "Mensagens agendadas" em Configurações (busca, Criação, Envio, Dispositivo ou conta; colunas Nome, Telefone, Data e hora da criação, Data e hora de envio, Dispositivo/Conta; ⋮ "Remover agendamento") | c08, c39, c59, c61, c62, [PT] | ✗ | adotar (tabela e worker novos, seção 7) | 3B |
| C10 | Aura no compositor: "Sugerir resposta", "Resumir conversa", "Agendar mensagem com texto da Aura", "Preencher campos do CRM", pergunta livre | c11 | ◐ `draft-reply` (rascunho por IA) | **adaptar:** o botão existe com o nome do assistente da Escale (Aura é marca da Clint); "Sugerir resposta" usa o rascunho do original; os outros "Em breve" até o módulo Agentes IA | 3B |
| C11 | Bloqueios: "Atribuir a mim · Você só pode responder em conversas atribuídas a você", "O dispositivo está arquivado", fora da janela → template | [CONV] | ◐ janela e número fora do ar | adotar | 3B |
| C12 | Chamadas: selo "Permissão de chamada pelo WhatsApp válida até…", "Chamada de voz/vídeo perdida" na fila | [PT] `CallingWindowBadge` | ✅ `voice_calls`, discador | adotar o selo; o discador e as telas de chamada seguem o original | 3B |

### D. Painel direito

| # | Comportamento da Clint | Fonte | Hoje | Decisão | Fase |
|---|---|---|---|---|---|
| D1 | "PRÓXIMO NEGÓCIO" com funil, "?" e setas ‹ › ("Navegue pela ordem dos seus negócios. Esta seleção não afeta os filtros gerais de atendimento") | 02-003, c02 | ✅ na ficha (1G) | adotar, reaproveitando o componente da 1G | 3A |
| D2 | Cabeçalho do contato: avatar, nome, chips de tags com X, "+", "+3"; ações rápidas (ligar, agendar, e-mail, lembrete, atividade, nota) e "Abrir contato" à direita | 02-003, c02 | ◐ | adotar; ligar, agenda, atividade e nota usam o original; e-mail "Em breve" | 3A |
| D3 | "NEGÓCIOS" com contador e "+"; cartão: "{grupo} › {origem}", barra de etapas, "1. Entrada Lead ▾ 1/14", VALOR, DONO, botões Ganho / Perdido / Aberto (o ativo com ✓, Perdido em vermelho), motivo ("Não informar", "Tentativas esgotadas"…), abrir negócio; "Selecionar negócio" quando há mais de um. Contato sem negócio: só o botão "Adicionar negócio" e as seções sem Atividades e Negócio | 02-003, c02, c15, c48, c73 | ◐ leads recentes com etapa | adotar, reaproveitando o cabeçalho da ficha (1G) | 3A |
| D4 | Cartão "Pausar automação" (acordeão entre o negócio e as seções): sem pausa, "Nenhuma automação ativa · Nesta conversa" e "Pausar ▾" ("Pausar todas por": 30 minutos, 1 hora, 4 horas, 1 dia com a hora de fim, Até retomar, Escolher data e hora); com pausa, selo laranja "Até retomar" no título e, aberto, "Pausa de todas", o prazo editável, "Por {pessoa}" e o botão "▶ Retomar"; "Próximo follow-up em…" | c06, c07, c73, c74, [LIST] `ConversationPauseCard` | ◐ `pause-ai` (sem prazo) e follow-up da IA | **adaptar:** o cartão pausa o agente de IA e o follow-up da conversa pelo prazo escolhido; "Conversas suspensas" (B2) filtra por ele | 3B |
| D5 | "SEÇÕES" com o ícone de ajustes, que abre o balão "SEÇÕES VISÍVEIS" com um toggle por seção e "Mostrar todas" (só visibilidade, sem reordenar): Atividades (contagem e "{n} atrasadas"), Contato, Negócio, Empresa, Notas, Anexos, Histórico, Conversas; cada uma abre no lugar da lista com "‹ {Seção}" e volta | 02-009, c15, c49, [PT] `crmArea.sectionCustomization.*` | ◐ painel do Deskcomm | **adaptar:** cada seção reaproveita a aba correspondente da ficha do negócio (1G/1H); visibilidade por pessoa (seção 7). Demandas, memória, pedidos e acervo saem da casca (D12) | 3A |
| D6 | Seção Atividades: por dia ("Dom, 18 Out · 2 atividades"), linha com ícone, título, hora e idade, caixinha que conclui, ⋮; link "Criar, editar ou reagendar no negócio"; vazio "Nenhuma atividade para este negócio" + "Criar atividade" | 02-004, c16 | ◐ aba Atividades (1G) | adotar; concluir pela conversa = concluir no card | 3A |
| D7 | Seção Negócio: Origem, Etapa, Dono do negócio, Valor do negócio, Status editáveis; "Ir para negócio"; ⚙ "Personalizar campos" (02-005: busca, "Campos disponíveis", "Informações básicas", "Exibidos · Arraste", "Restaurar padrão", "Salvar campos") | c17, 02-005 | ◐ | adotar; os campos personalizados vêm do catálogo da 1F-a; preferência por pessoa | 3A |
| D8 | Seção Contato: Nome, Email, Telefone (com DDI), Instagram, Tags (chips, "+", "+2"), editáveis | c14 | ◐ aba Contato (1G, edição na 1H) | adotar | 3A |
| D9 | Seção Empresa: "Nome da empresa · Clique aqui para adicionar" | c18 | ◐ moldura (1G) | adotar a moldura; o vínculo chega com a 2D | 3A |
| D10 | Seções Notas ("+ Adicionar nota", "Nenhuma nota ainda."); Anexos (busca "Pesquisar…", "Novo arquivo", "0.00 GB / 5.00 GB usados", vazio "Nenhum arquivo encontrado · Envie arquivos para mantê-los junto deste contato." + "Novo arquivo"); Histórico (seletor de tipo: Todos, Agendamentos, Automações, Atividades, Notas, Email, Lembretes, Ligação, Negócio criado, Clique para WhatsApp…; cartões com ícone colorido por tipo, título como "Tag adicionada", "Automação pausada", "Status da atividade", "ORIGEM: {grupo} > {origem}", "dd/mm/aaaa hh:mm:ss por {pessoa}" e "Ver mais"/"Ocultar"); Conversas ("Em aberto", última mensagem, hora; "Por canal", "Padrão chat", "Timeline unificada") | c19, c20, c50–c53, c57, [PT] | ◐ abas da 1H (PR B) | adotar, reaproveitando a 1H; os três modos da seção Conversas são a F5 | 3A (Notas, Anexos, Histórico, Conversas simples) · 3E (modos) |
| D11 | Erro: "Não foi possível carregar as informações do contato." | [PT] | ✗ | adotar | 3A |
| D12 | Demandas abertas, memória do contato, pedidos recentes, acervo/RAG, "usável para RAG", enriquecimento | — (só o original) | ✅ | **ignorar na casca:** não existem na Clint; seguem no Inbox original. O motor (demanda aberta/encerrada) continua rodando por baixo de Encerrar/Reabrir | — |

### E. Setores, permissões e configurações do módulo

| # | Comportamento da Clint | Fonte | Hoje | Decisão | Fase |
|---|---|---|---|---|---|
| E1 | "Setores": lista com monograma colorido, Conta/Dispositivo (contagem), Atendentes (contagem), ⋮ (Editar setor, Remover setor em vermelho); "Buscar por setor"; "Novo setor" → "Crie um setor" (e "Editar setor", igual): Nome do setor, "Adicione usuários a este setor" (? "Para adicionar usuários, pesquise pelo nome ou email."), "Usuários selecionados" com busca e lixeira por pessoa (vazio: "Você ainda não adicionou usuários"), cores; "Criar setor"/"Salvar alterações" | c38, c42, c87–c89 | ✗ | adotar (entidade nova do fork, seção 7) | 3C |
| E2 | "Configuração de canais": cartões WhatsApp "API oficial", WhatsApp e Instagram, cada um "Instalado". **WhatsApp não oficial** (o caso do Escale, WAHA): abas Dispositivos, Usuários e Permissões, Setores; busca, "Mostrar arquivados", "Novo dispositivo"; colunas Nome dispositivo (foto, nome, número), Status (Conectado/Desconectado), Setores, Usuários nesse dispositivo, ícone de desconectar ou de QR, ⋮ (Editar, Desconectar, Arquivar, Excluir). Modal "Informações do dispositivo" com **só duas abas**, Dispositivos e Criação de negócio: Nome do dispositivo (?), Número conectado, "Setor de atendimento" ("Membros do time que estão no setor selecionado terão acesso a esse dispositivo."), "Atendentes conectados nesse dispositivo" com busca e "Ativar todos" (administradores ficam ligados e apagados, dica "Usuário administrador"). O WhatsApp Oficial tem ainda "Indicador de digitação", Marketing Messages API e Chamadas por WhatsApp | 16/10-04, 16/10-05, c98–c103 | ◐ tela de conexões, responsáveis por número (0228), acesso da IA por número | **adaptar:** a tela de canais e o modal da Clint sobre `channel_sessions` e `channel_routing_responsibles`; setor do dispositivo na 3C; indicador de digitação "Em breve" | 3C |
| E3 | Setor na conversa: selo no cabeçalho, "Alterar setor", "Setor: …" na linha, filtro "Setores", ação em massa "Alterar setor" | c02, c29, [CONV] | ✗ | adotar | 3C |
| E4 | "Usuários e Permissões": lista com Usuário, Dispositivo (ícones dos canais) e "Permissões de atendimento" (o grupo: Administrador, Closer1, analista, sdr4, Personalizado…); "Adicionar usuário". Clicar abre o usuário com três abas: **Geral** (Nome, Sobrenome, E-mail, Telefone, Identificador de usuário, Link de usuário, WhatsApp, Setores); **Permissões** ("Grupo de permissão" com a lista de grupos, "Salvar grupo personalizado"; menu à esquerda Páginas, Conversas, CRM, Origens, Contatos, Conta, Transcrição de chamada, Indicadores, Empresas…; cada seção com "Desativar todos" e toggles com nome e descrição; as 19 de Conversas estão na seção 5); **Contas e dispositivos** ("Contas e dispositivos que usuário tem acesso. Estes estão associados aos setores aos quais o usuário pertence…", por canal, com "Ativar Todos" e um toggle por dispositivo) | c40, c90–c95, [PT] | ◐ papéis + `visibility_mode` da organização | **adaptar:** o modal da Clint com as 19 chaves de Conversas sobre os papéis do original e o `visibility_mode`, com papel mínimo por chave (seção 5); os grupos de permissão configuráveis (para todos os módulos) seguem a trilha à parte (PRD 2, pergunta 3); a aba Contas e dispositivos sobre `channel_routing_responsibles` | 3C |
| E5 | Hub ⚙ "Conversas › Configurações" com 9 cartões: Dispositivo, Setores, Mensagens agendadas, Respostas rápidas, Usuários e Permissões, Notificações (toggle), Modelos de mensagem, WhatsApp Flows, Análise de templates | c37 | ✗ | adotar o hub: Dispositivo → tela de conexões do original; Setores (E1); Mensagens agendadas (C9); Respostas rápidas (E6); Usuários e Permissões (E4); Notificações → preferências do original; Modelos, Flows e Análise de templates "Em breve" (dependem da Meta) | 3C |
| E6 | "Respostas rápidas": busca, filtro Setor, "?", colunas Atalho, Conteúdo, Setores, Canais, ⋮ (Editar, Excluir); "Adicionar" abre "Criar Resposta rápida": aviso "Você pode criar respostas rápidas para utilizar no chat de atendimento", caixa de mensagem com emoji, GIF, anexo, câmera, áudio, variáveis e "+ Adicionar" (mais de uma mensagem), "Atalho", "Utilizar em:" (WhatsApp, Instagram), "Compartilhar com outros usuários", "Setores" ("Todos os setores"; "A resposta ficará disponível para os usuários ao atender conversas destes setores."); paginação "10 por página" | c41, c96, c97 | ◐ templates do original | adaptar sobre os templates do original, acrescentando setor, canal e compartilhamento | 3C |

### F. Criação de negócio por dispositivo e conversas embutidas

| # | Comportamento da Clint | Fonte | Hoje | Decisão | Fase |
|---|---|---|---|---|---|
| F1 | Aba "Criação de negócio" do dispositivo: interruptor "Criar um negócio automaticamente" (?) ("Crie um negócio automaticamente em uma origem ao receber a primeira mensagem neste dispositivo"); ligar cria a "Condição 1"; cada condição é um acordeão com o lápis (editar o nome no lugar, com "Salvar" e X) e, a partir da segunda, a lixeira, que pede "Tem certeza que deseja excluir essa condição?" Não/Sim; "+ Adicionar nova condição". Campos: "Quando receber uma mensagem que" (igual/…, até 10 mensagens), "Criar negócio na origem", "Na etapa", "Adicionar tags ao contato", "Manter atendente de acordo com a distribuição de dono do negócio"; regra "Se o contato já possui um negócio nessa origem, nenhum novo negócio é criado". Nada vale sem "Salvar alterações" | 16/10-01 a 03, c104–c108, [DEV] `AutoDeal*` | ✗ (`is_default` em `nascimento-do-lead.ts`) | adotar; é o que apaga o `is_default` (decisões 5 e 7 do roteiro) | 3E |
| F2 | Modal "Informações do dispositivo" com abas Dispositivos, Criação de negócio, Marketing Messages API, Chamadas por WhatsApp; "Remover dispositivo", "Salvar alterações" | 16/10-04 | ◐ tela de conexões | **adaptar:** as abas Dispositivos e Criação de negócio entram na tela de conexões do original por ponto de encaixe; Marketing Messages API e Chamadas por WhatsApp ficam fora (seção 9) | 3E |
| F3 | A conversa abre **dentro** do painel flutuante e da aba Conversas da ficha do negócio (C22 do PRD de Negócios) | 01-025, Q6 da 1H | ✗ (links para o Inbox) | adotar: thread e compositor da 3B reaproveitados dentro do painel e da aba | 3E |
| F4 | Modo espião na aba Conversas da ficha | `AbaConversas.tsx` ("Em breve") | ✗ | adotar (mesma flag da A9) | 3E |
| F5 | Seção/aba Conversas com "Por canal", "Padrão chat", "Timeline unificada" (todas as conversas do contato) | [PT] `component.ContactConversations.*` | ◐ só a mais recente | adotar (C4 do PRD de Contatos, mesma entrega) | 3E |

## 5. Permissões

O original decide por papel (viewer, agent, manager, admin) e pelo `visibility_mode` da organização. A Clint tem uma chave por ação e perfis de atendimento. Até a trilha de grupos configuráveis, cada ação nova ganha a sua chave com papel mínimo:

| Ação | Chave da Clint | Papel mínimo proposto |
|---|---|---|
| Ver a fila | `CHAT` | agent (como hoje: viewer não entra no Inbox) |
| Ver todas as conversas | `CHAT_VIEW_ALL` | manager; agent só se `visibility_mode = all` (como hoje) |
| Ver as do setor | `CHAT_VIEW_TEAM` | agent membro do setor (3C) |
| Ver sem atendente | `CHAT_VIEW_UNASSIGNED` | agent (como hoje em `own_and_unassigned`) |
| Responder | `CHAT_SEND_MESSAGE` | agent dono da conversa; manager em qualquer uma |
| Responder no atendimento do setor | `CHAT_SEND_TEAM` | agent membro do setor |
| Assumir, transferir, liberar | — | agent (como hoje) |
| Alterar o atendente de outra pessoa / do setor | `CHAT_CHANGE_TEAM_ATTENDANT` | manager; agent membro do setor |
| Encerrar, reabrir, colocar em espera | — | agent (como hoje) |
| Marcar como não lida, modo espião | — | agent |
| Selecionar e agir em massa | `CHAT_BULK_ACTIONS` | manager |
| Agendar mensagem, remover agendamento | — | agent (o seu); manager (qualquer) |
| Pausar automação | — | agent |
| Setores (criar, editar, excluir), dispositivo ↔ setor | — | admin |
| Usuários e Permissões | — | admin |
| Respostas rápidas | — | manager (criar e editar); agent usa |
| Filtro salvo | — | quem criou; compartilhado, todos veem (regra da 1D) |
| Personalizar visualização, campos do cartão, seções visíveis | — | cada pessoa as suas |
| Criação de negócio por dispositivo | — | admin |

**As 19 permissões de Conversas da Clint** (aba Permissões do usuário, prints c92 e c93), que a 3C reproduz com nome e descrição:

| Permissão da Clint | Descrição da Clint (resumida) | Papel mínimo proposto |
|---|---|---|
| Visualizar todos os dispositivos | vê todos os dispositivos nas configurações de canais | admin |
| Adicionar um novo dispositivo | adiciona dispositivo à conta | admin |
| Remover contas/dispositivos | remove conta ou dispositivo | admin |
| Alterar status do atendimento do setor | muda o status das conversas de outros atendentes do setor | agent membro do setor |
| Alterar status do atendimento | muda o status das conversas de todos os setores | manager |
| Envio de mensagens nas atividades | envia mensagens nas atividades por um dispositivo | agent |
| Visualização de atendimento do setor | vê todos os atendimentos do setor | agent membro do setor |
| Visualizar conversas sem atendente | vê as não atribuídas, conforme os dispositivos | agent |
| Visualização de atendimento | vê todos os atendimentos dos dispositivos com permissão | manager |
| Enviar mensagem no atendimento do setor | envia em qualquer atendimento do setor | agent membro do setor |
| Alterar atendentes do setor | troca o atendente de qualquer atendimento do setor | manager |
| Alterar atendentes | troca o atendente de qualquer atendimento | manager |
| Enviar mensagem no atendimento | envia em qualquer atendimento | manager |
| Ações em massa | alterar status, atendente, setor… em massa | manager |
| Editar ou excluir respostas rápidas | mexe nas respostas rápidas de outros | manager |
| Compartilhar respostas rápidas | compartilha respostas rápidas com outros | agent |
| Editar ou excluir setores | mexe nos setores de outros | admin |
| Configurar modelos de mensagem | configura modelos do WhatsApp Oficial | admin ("Em breve" na 3C) |
| Consultar respostas rápidas de outros setores | filtra respostas rápidas de outros setores no chat | agent |

- O **banco** continua barrando outra organização; toda escrita passa por `requireSupportWrite()`.
- O que a pessoa vê na fila é o que a sessão dela lê: as RLS de `conversations` do original continuam, e o setor entra como mais um critério de leitura, nunca como cópia.

## 6. Filtros, ordenação e o mapa de status

- **Presets da fila (3A):** Todos; Não lidas (`unread > 0`); Meus em aberto (minhas + Em aberto); Em aberto; Em espera; Fechadas; Somente conversas / Somente grupos quando houver grupos. "Arquivadas" sai das abas e vira o valor "Arquivada" do filtro de status (B2), para não perder o que o original arquiva.
- **Mapa de status Clint × original** (vale para presets, filtro de status, cabeçalho e ações em massa):

| Clint | Original |
|---|---|
| Em aberto | `open`, `pending`, `claimed`, `ai_handling`, sem espera ativa |
| Em espera | status aberto **com** `snooze_until` ativo (o snooze do original, sem lembrete) |
| Fechado / Fechadas | `closed`, `resolved` |
| (Arquivada) | `archived` (só o original arquiva; a casca mostra no filtro) |

- **Ordenação (3A):** "Última interação" (`last_message_at` desc, padrão) e "Esperando mais tempo" (`last_response_at` asc, nulos por último).
- **Painel de filtros (3D):** os quatro acordeões da seção 4-B, montados sobre o motor da 1D. Os filtros por negócio usam os negócios abertos do contato; "Em transferência" e "Setores" só com a 3C; "Conversas suspensas" é a pausa da D4.
- **Filtros salvos (3D):** a tabela `crm_filtros_salvos` passa a aceitar o alvo "conversas"; mesmas regras (20 por pessoa, pessoal ou compartilhado).
- **Busca:** nome, telefone, prévia (como hoje).
- Nenhum filtro novo ganha versão própria fora do motor da 1D (princípio 4 do roteiro).

## 7. O que precisa ser guardado

O desenho das tabelas e o número de cada migration ficam no plano de cada fase. **A Fase 3 reserva a faixa 9200–9299**, para não colidir com a Frente A (9000–9099) nem com a Frente B (9100–9199).

- **Preferências da fila por pessoa** (3A): toggles de "Personalizar visualização" e os limites de alerta; campos exibidos no cartão do negócio; seções visíveis. Molde: `crm_colunas_das_listas` (9101), uma linha por pessoa, organização e tela.
- **Marcar como não lida** (3B): o original só tem o contador que zera ao abrir; precisa de um jeito de a pessoa marcar de volta (campo ou rota nova, sem mexer no `fn_mark_conversation_message` do original).
- **Em espera** (3B): usa `snooze_until` do original; se o snooze exigir lembrete, o plano decide como marcar "sem lembrete".
- **Mensagens agendadas** (3B): conversa, dispositivo, conteúdo (texto, mídia ou template), quando enviar, quem agendou, estado (pendente, enviada, falhou, removida) e o worker que envia na hora; aparece na linha da fila e na tela de Configurações.
- **Pausa de automação** (3B): até quando e por quem, por conversa; vale para o agente de IA e para o follow-up.
- **Setores** (3C): setor (nome, cor), membros, dispositivo ↔ setor, setor da conversa (coluna nova ou tabela do fork, o plano decide; o vínculo entra na RLS de leitura), transferência pendente para setor.
- **Perfis de atendimento** (3C): chave da Clint × papel mínimo, por organização, até a trilha de grupos.
- **Respostas rápidas** (3C): setor e canal da resposta, sobre os templates do original.
- **Filtros salvos de conversas** (3D): a `crm_filtros_salvos` ganha o alvo "conversas" (migration de alteração).
- **Ações em massa** (3D): fila de trabalho para lotes grandes (quem pediu, o filtro, a ação, o andamento), como a 2B.
- **Criação de negócio por dispositivo** (3E): interruptor e condições por `channel_session` (mensagens, origem, etapa, tags, manter atendente), lidos por `nascimento-do-lead.ts` por ponto de encaixe; depois disso, o `is_default` deixa de ser consultado pelo WhatsApp.
- **Não vai ao banco:** modo espião (flag da sessão), estado dos acordeões do filtro e largura dos painéis (navegador).

## 8. Fases

Ordem: primeiro a tela que o atendente usa o dia todo (fila e painel), depois a conversa em si, depois o que o gestor configura (setores e permissões, que os filtros e as ações em massa precisam), por fim o dispositivo e as conversas embutidas. A 3E não depende da 3C nem da 3D e pode andar em paralelo com elas.

| Fase | Escopo (itens da seção 4) | Pronto quando | Estado |
|---|---|---|---|
| 3A | **Fila e painel direito:** A1–A13, A15, D1–D11 | A fila tem a linha, os presets, a ordenação, o ⋮ com modo espião e "Personalizar visualização" da Clint; o centro vazio e "Nova conversa" são os da Clint; o painel direito tem "Próximo negócio", o cabeçalho do contato, o cartão do negócio e as 8 seções (reaproveitando a ficha 1G/1H), com "Seções visíveis" e "Personalizar campos"; igual a 02-003, 02-004, 02-005, 02-006, 02-008, 02-009 e aos prints c01, c02, c14–c24, c31 | proposta |
| 3B | **Conversa aberta:** C1, C2, C4–C12, D4 | O cabeçalho, a barra de status (com Em espera sobre o snooze), a thread e o compositor são os da Clint; respostas rápidas, modelos, nota interna, agendar mensagem (com a tela de Configurações) e o cartão "Pausar automação" funcionam; "Marcar como não lida" existe; igual aos prints c02–c13, c39 | proposta |
| 3C | **Setores, permissões e configurações:** C3, E1–E6 | Setores existem com membros, cor e dispositivos; aparecem no cabeçalho, na linha, no filtro e na massa; o hub ⚙ tem os 9 cartões (3 em "Em breve"); Usuários e Permissões e Respostas rápidas são as telas da Clint sobre o original; igual aos prints c37, c38, c40–c42 e 16/10-04/05 | proposta |
| 3D | **Filtros, filtros salvos, seleção e ações em massa:** B1–B8 | O painel de filtros tem os 4 acordeões e cada critério restringe a fila; filtros salvos de conversas com 20 por pessoa; seleção com "todos = todos do filtro"; as 4 ações em massa rodam (grandes em segundo plano); igual a 02-001, 02-002, 02-007 e aos prints c25–c36 | proposta |
| 3E | **Criação de negócio por dispositivo e conversas embutidas:** F1–F5, D10 (modos) | O dispositivo tem a aba "Criação de negócio" com condições e nenhum negócio nasce por `is_default` a partir do WhatsApp; a conversa abre dentro do painel flutuante e da aba Conversas da ficha, com modo espião; a seção/aba Conversas tem os 3 modos; igual aos prints 16/10-01 a 04 | proposta |

**Dependências:**
- dentro do módulo: 3B usa a casca da 3A; 3D usa os setores da 3C (o filtro "Setores" e "Alterar setor"); 3E usa a thread e o compositor da 3B;
- **com a Frente A:** 3A reaproveita o cabeçalho, o "próximo negócio" e as abas da 1G e da 1H (precisa do merge da 1H, PR B, para Notas, Anexos e Histórico); 3D reaproveita o motor de filtros da 1D e a 9004;
- **com a Frente B:** a D9 (Empresa) e o toggle "Empresa" da A8 ligam quando a 2D chegar; a F5 é a C4 do PRD de Contatos (mesma entrega, uma vez só); a 2C (campos do contato) alimenta a seção Contato.

**Quando a casca vira padrão (decisão 3 do roteiro):** depois da 3E e do fim da Fase 1 (1K).

## 9. Fora do escopo e decisões

Decisões tomadas pelo agente em 17/10/2026, a pedido do usuário ("pode decidir por mim"), com a regra do produto como critério: idêntico à Clint, motor do original, mínimo de arquivo do Rafael.

| # | Decisão | Alternativas | Por quê |
|---|---|---|---|
| 1 | **Setor é entidade própria do fork** (E1), ligada a dispositivos, conversas, respostas rápidas e permissões | Mapear "setor" ao número/dispositivo que já existe | Na Clint o setor tem vários dispositivos e várias pessoas, aparece em 6 lugares (filtro, massa, cabeçalho, linha, dispositivo, permissão) e tem cor e tela própria. Dispositivo não cobre isso. O original não tem nada parecido, então não há duplicação |
| 2 | **"Em espera" = snooze do original, sem lembrete** (C2, seção 6) | Acrescentar `snoozed` ao CHECK de `conversations.status` | Mexer no CHECK é arquivo do Rafael e colide na sincronização. O snooze já existe, já tem rota, coluna e worker, e já volta ao normal com mensagem nova. Só falta a variante sem lembrete |
| 3 | **Automático e Fila saem da casca** (A14); o filtro "Agentes" e "Atendido por IA" cobrem a IA | Manter as duas abas como presets extras | A Clint não tem; o roteamento continua rodando; conversa roteada aparece em "Em aberto" sem atendente. O Inbox original segue intacto |
| 4 | **O painel direito reaproveita as abas da 1G/1H** (D5) | Componentes novos | Mesma coisa em dois lugares seria duplicação; a Clint usa os mesmos "crmArea" na ficha e no chat |
| 5 | **A Fase 3 cobre tudo o que a Clint mostra em Conversas**, inclusive cabeçalho, thread e compositor (3B) | Deixar a conversa em si para uma fase final | "Funciona igual" não basta (regra do produto); o compositor é o que o atendente mais usa |
| 6 | **Aura não existe no Escale** (C10): o botão tem o nome do assistente da Escale e só "Sugerir resposta" funciona na 3B | Copiar as 5 ações | Aura é marca da Clint; as outras ações dependem do módulo Agentes IA |
| 7 | **Faixa de migrations 9200–9299** para a Fase 3 | — | Frente A usa 9000–9099 e Frente B 9100–9199 |
| 8 | **Ordem 3A → 3B → 3C → 3D → 3E**, com 3E em paralelo | Começar pela 3E (apaga o `is_default`) | A 3A é o que o atendente vê todo dia; a 3E não depende das outras e pode andar junto |
| 9 | **Fora:** Marketing Messages API, Chamadas por WhatsApp (Meta), WhatsApp Flows, Análise de templates, indicador de digitação | — | Dependem de recursos da Meta que o original não tem; os cartões do hub ficam "Em breve" |
| 10 | **Fora da casca:** demandas, memória do contato, pedidos, acervo, posição na fila, Arquivar como ação (D12, A14) | — | Não existem na Clint; seguem no Inbox original. O motor (demanda, roteamento) continua rodando por baixo |
| 11 | **"Visualizado por" e "fixar mensagem" ficam "Em breve"** (C4) | Gravar leitura por pessoa | O original não guarda leitura por pessoa; é tabela nova sem pedido |
| 12 | **Transferência para atendente continua imediata** (C3) | "Em transferência" para pessoa também | O original audita a transferência; o estado pendente só faz sentido com setor |

## 10. Perguntas em aberto

1. **Quem vai usar e qual é a meta?** A mesma pergunta 1 dos PRDs de Negócios e de Contatos.
2. **Em que frente a Fase 3 entra?** Hoje a Frente A está na 1H–1K e a Frente B na 2B–2E e depois Produtos (9). Opções: (a) terceira frente, com worktree própria, começando já; (b) a Frente A pega a 3A depois da 1H; (c) esperar a 1K. **Recomendação: (a)**, porque a casca só vira padrão com a Fase 3 e a 3A não depende de nada que esteja em andamento (só do merge da 1H para Notas, Anexos e Histórico).
3. **Os prints que faltam** (seção 11) podem vir antes do plano da 3A?

## 11. Prints que faltam

Atualizada em 18/10, depois da segunda e da terceira passada. O que sobrou é, na maioria, estado que só aparece mudando dado real (marcar como não lida, transferir, executar ação em massa, salvar filtro), e por isso não foi capturado sem pedido.

| Fase | Print que falta |
|---|---|
| 3A | Estado sem canal ("Conecte um canal…"); "Carregando mensagens…" (visto, mas o print não salvou) |
| 3B | "Em transferência"; "Marcar como não lida" feito; thread com mensagem editada, encaminhada, apagada e "Visualizado por"; gravador de áudio; menu de anexo (abre a janela do sistema); "Atendido por IA" e "Agente pausado" no cabeçalho |
| 3C | Notificações (o toggle do hub) |
| 3D | "Salvos" com um filtro salvo, Renomear e Excluir; toast "Essa ação em massa pode demorar…" |
| 3E | Conversa aberta dentro do painel flutuante (01-025 na v2 atual); seção Conversas em "Por canal" e "Timeline unificada" |

Sem o print, o plano usa o que a engenharia reversa mostra e marca o ponto como provisório.

## 12. Riscos

| Risco | Chance | Impacto | Mitigação |
|---|---|---|---|
| Setor entra na leitura de `conversations` (RLS) e mexe no que cada pessoa vê | Alta | Alto | Setor como critério **a mais** de leitura, nunca a menos; prova de RLS em `tests/invariants/`; `visibility_mode` continua mandando |
| "Em espera" sobre o snooze confunde quem usa o lembrete do original | Média | Médio | A casca não mostra o lembrete; o plano da 3B decide a marca "sem lembrete" e o watcher ignora |
| Reaproveitar as abas da 1G/1H dentro do painel de 360 px quebra o layout feito para a ficha | Média | Médio | As abas já são componentes; o plano da 3A define a variante estreita e confere lado a lado com os prints c14–c20 |
| Mensagens agendadas: worker novo com envio fora da janela (template) e dispositivo desconectado | Média | Alto | Estado "falhou" com motivo, reenvio manual, tela de Configurações mostra o estado; nunca envia sem o dispositivo `WORKING` |
| Ações em massa sobre "todos do filtro" em organização grande | Média | Alto | Mesma regra da 2B: pelo filtro, em segundo plano, com o total escrito |
| Três frentes mexem nos mesmos arquivos (ficha 1G/1H, filtros 1D, dicionário, baseline) | Alta | Médio | Worktree por frente, faixa 9200–9299, atualizar com a main antes de cada merge |
| Tirar o `is_default` do nascimento do lead quebra organizações sem condição configurada | Média | Alto | Na 3E, dispositivo sem condição mantém o comportamento atual até o admin ligar a aba; aviso na tela de conexões |
| A Clint muda (os prints de 17/10 já diferem das fichas de 05/10 em detalhes) | Alta | Baixo | Prints valem mais que fichas; ao divergir, perguntar qual é o alvo |

## 13. Achados no caminho (fora das fases)

- **Na Clint, "Criar filtro" não abre modal:** abre o painel de Filtros; o "Salvar filtro" aparece quando há critérios, e o botão "Todos" vira "Personalizado". **"Nova conversa" também não é modal:** troca o centro pela tela "Crie ou selecione um contato".
- **A seleção da Clint marca a base inteira** (56.128 conversas no "Selecionar todos"), o mesmo comportamento que o usuário chamou de defeito em Contatos. A Escale segue a regra da B3 do PRD de Contatos.
- **A Clint tem 19 permissões só de Conversas** e grupos de permissão nomeados por organização (Administrador, sdr, Closer, analista…), com "Personalizado" e "Salvar grupo personalizado". Isso reforça a trilha de grupos de permissão configuráveis (PRD 2, pergunta 3).
- **O WhatsApp não oficial da Clint** (o equivalente ao WAHA do Escale) tem só as abas Dispositivos e Criação de negócio no modal do dispositivo; Marketing Messages API e Chamadas por WhatsApp são só do Oficial.
- **"Personalizar visualização" tem limite de 5 campos** e o tempo sem resposta muda de cor (amarelo a partir de 1 h, vermelho a partir de 4 h, ajustável).
- A fila do original casa tags **da conversa ou do contato**; a Clint só filtra tags do contato. A casca mantém as duas caixas, mas o filtro B4 mostra as do contato.
- A seção "Conversas" do **filtro de Negócios** da Clint (`chatFilterFlags-B0ccFPg3`) usa outros rótulos ("Atribuídos a mim", "Não respondidos pelo atendente"…) do que o painel da fila. Não confundir ao planejar a 3D.
- O original não guarda a leitura por pessoa (`unread_count_for_assignee` é um contador só); "Visualizado por" e "lida por quem" exigiriam tabela nova.
- O painel flutuante da casca (Fase 0) não tem realtime; a 3E precisa ligá-lo ao canal `inbox-${orgId}` que a lista já usa.
- `app/api/v1/inbox/**` não existe; tudo está em `api/v1/conversations/**` e `api/v1/messages/**`.
