# Fase 1I — Playbook de etapas e atividades (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** D10, C19, C20 e C21 de `docs/modulos/1-negocios.md` (seção 4, tabelas C e D), mais o que a 1F e a 1G deixaram "Em breve" para esta fase: o "+ Nova atividade" e o "Salvar na origem" da aba Etapas e atividades; a engrenagem, o "Nova atividade", o lápis e a caixa de concluir da aba Atividades. **Dois PRs** (P1): o PR A entrega o playbook na configuração da origem e o banco (Tasks 1 a 7, migration 9009); o PR B entrega a aba Atividades da ficha (Tasks 8 a 14, sem banco).
>
> **Quando começa:** depois do merge do **PR B da 1H** (migration 9008). A Task 1 prova. Esta fase foi planejada com a 1H ainda em implementação; os pontos em que as duas se encostam estão em "Onde a 1H encosta" (Global Constraints).

## Perguntas (todas respondidas em 17/10; falta só o "pode fazer")

| # | Pergunta | O que o plano faz se a resposta for "sim, como está" |
|---|---|---|
| Q1 | **Dois PRs.** A: o playbook na janela da origem e o banco (Tasks 1 a 7). B: a aba Atividades da ficha (Tasks 8 a 14). Depois do PR A, o negócio que entra na etapa já ganha as atividades, e elas aparecem na aba Atividades da 1G (só leitura) até o PR B. Aceita? **Respondida em 17/10: ok.** | P1 |
| Q2 | **Onde mora a atividade do negócio.** O PRD manda usar as tarefas do original (`crm_tasks`), que não têm tipo. O plano **não mexe** na tabela do Rafael: cria ao lado a `crm_atividades_do_negocio` (uma linha por tarefa, com tipo, visibilidade, etapa, a atividade do playbook que a gerou e quem concluiu). O título vai em `crm_tasks.title`, e a mensagem, o roteiro ou a instrução vão copiados em `crm_tasks.description` no momento em que a atividade nasce. Assim a lista de Tarefas do original, o selo do card e a anonimização da LGPD continuam valendo sem mudança. Está bem? **Respondida em 17/10: ok.** | P3 |
| Q3 | **Negócios que já estão na etapa quando o gestor salva o playbook.** O código da Clint indica que ela aplica a mudança também a eles. O plano faz valer **só para quem entrar na etapa depois de salvar**. Aplicar aos que já estão criaria, de uma vez, uma atividade para cada negócio parado em cada etapa (centenas, numa origem grande). Fica assim? **Respondida em 17/10: opção A, só daqui para frente** (a conta de produção ainda não tem negócios). | P4 |
| Q4 | **Voltar a uma etapa.** O negócio que sai e volta para uma etapa **não ganha as atividades de novo**: a que ficou pendente ganha prazo novo (contado da nova entrada) e a concluída continua concluída. Está bem? **Respondida em 17/10: ok.** | P4 |
| Q5 | **Atividades da etapa anterior.** Ao mudar de etapa, as pendentes da etapa anterior **ficam** (como na Clint). Na ficha, clicar numa etapa do trilho mostra as atividades dela. Confirma? **Respondida em 17/10: ok.** | P4, P12 |
| Q6 | **Trilho só para ver.** Na Clint, o trilho também move o negócio ("Mover para cá", com confirmação), e concluir uma atividade de outra etapa leva o negócio para ela. Mover por ali precisa passar pelas regras de campos obrigatórios ("ao entrar" e "ao sair", 1F), que hoje só a tela do quadro aplica. O plano deixa o trilho **só para ver** as atividades de cada etapa, e concluir não move o negócio. Mover pelo trilho vira item próprio depois. Fica fora? **Respondida em 17/10: fica fora desta fase, mas mudar a etapa pela ficha é OBRIGATÓRIO antes do fim do projeto** (registrado no PRD, Task 7). | P12 |
| Q7 | **Enviar WhatsApp: confirmação.** O PRD (C20) diz "com confirmação". A Clint **envia direto** no clique de "Enviar mensagem" e só pede confirmação quando o contato está em atendimento com **outra pessoa** ("Você gostaria de assumir o atendimento e enviar a mensagem mesmo assim?"). O plano segue a Clint. Confirma, ou quer uma confirmação em todo envio? **Respondida em 17/10: clicar em "Enviar mensagem" ou apertar Enter envia na hora**, sem confirmação (fora a do outro atendente). | P14 |
| Q8 | **O que executa em um clique.** Só **WhatsApp** envia (pelo canal do original). **Ligação** mostra o roteiro e "Chamar {nome}" abre o discador (`tel:`), sem a chamada pelo navegador que a Clint faz. **Instagram, Email, Agendamento e Reunião** mostram o conteúdo, com o botão de executar desligado ("Em breve"). Fica assim? **Respondida em 17/10: a ligação fica para depois** ("Chamar {nome}" também "Em breve", sem o discador; o roteiro aparece). | P15 |
| Q9 | **Conteúdo da atividade.** A Clint aceita várias mensagens por atividade (texto, áudio, modelo da API oficial), e-mail com assunto, cópia e anexo, e um editor de texto rico. O plano guarda **um texto simples** por atividade (até 4.096 caracteres, o teto de uma mensagem do original), com caixa de texto simples, como a nota da 1H (Q9 de lá). Confirma? **Respondida em 17/10: sim nesta fase, mas o conteúdo tem de ficar IGUAL ao da Clint antes do fim do projeto** (registrado no PRD, Task 7). | P9 |
| Q10 | **Variáveis.** A Clint usa `[CONTACT.FIRST_NAME]` e afins. O plano oferece as que o Escale tem: Negócio (Etapa, Valor), Contato (Nome, Primeiro nome, Sobrenome, Email, Telefone), Usuário (Primeiro nome, Segundo nome, Email) e Empresa (Nome da empresa). Ficam fora as de checkout, de agendamento, os IDs e os campos personalizados. A troca acontece **na hora de enviar** (a atividade guarda o texto com as variáveis). Está bem? **Respondida em 17/10: os campos personalizados TÊM de entrar** (do negócio e do contato, como `[DEAL.CHAVE]` e `[CONTACT.CHAVE]`); o resto, ok. | P10 |
| Q11 | **"Atividade não listada".** Na Clint ela some da visão geral de atividades e aparece no negócio. Aqui ela aparece na ficha com o olho cortado, mas a lista de Tarefas do original (`/app/tasks`) **continua mostrando**. Esconder lá é da Fase 4 (Atividades). Confirma? **Respondida em 17/10: ok.** | P11 |
| Q12 | **Modelos de playbook (D17, fora do PRD).** "Escolher um modelo", "Compartilhar modelo", "Salvar no modelo atual" e "Salvar como novo modelo" ficam no lugar, desligados ("Em breve"). O selo do canto mostra "Origem customizada" quando a origem já tem atividade salva e "Nenhum modelo" quando não tem. Confirma? **Respondida em 17/10: ok.** | P8 |
| Q13 | **Editar etapas nesta aba.** Na Clint, a coluna da etapa tem lápis, lixeira, arrastar e a coluna "Nova Etapa". O original já cria, renomeia e reordena etapas (D9 ✅). O plano **não** põe isso na aba Etapas e atividades. Fica fora? **Respondida em 17/10: ok.** | P8 |
| Q14 | **Atividade "dependente".** Na Clint está "Em breve". Aqui também. Confirma? **Respondida em 17/10: ok.** | P7 |
| Q15 | **Itens do ⋮ da atividade na ficha.** O plano entrega "Marcar como concluída"/"Reabrir atividade", "Editar data e hora" e "Excluir atividade" (só para a criada à mão; a do playbook não se exclui, como na Clint). Ficam fora: "Ignorar atividade", "Editar data de execução", no-show e "Reverter conteúdo da atividade ao do modelo". Confirma? **Respondida em 17/10: ok.** | P13 |
| Q16 | **Quem conclui vira dono (C21).** Como na Clint, quem faz isso é a tela: ao concluir na aba Atividades um negócio sem dono (nem pessoa nem agente de IA), a ficha grava o dono pelo mesmo `PATCH /api/v1/leads/[id]` do "Alterar usuário". Concluir pela lista de Tarefas do original não troca o dono. Está bem? **Respondida em 17/10: ok.** | P13 |
| Q17 | **Responsável pela atividade do playbook.** A atividade nasce com o dono humano do negócio como responsável (`assigned_to`). Negócio sem dono ou com dono agente de IA: sem responsável. Está bem? **Respondida em 17/10: ok.** | P5 |
| Q18 | **Agendar e Lembretes do cabeçalho** (ícones de calendário e sino) seguem "Em breve". São da Agenda, não do playbook. Confirma? **Respondida em 17/10: ok.** | P16 |

**Prints que faltam** (nenhum bloqueia; onde falta, o plano diz o desvio):
1. ❌ A janela "Nova atividade" da origem com **Ligação**, **Email**, **Tarefa** e **Reunião** escolhidos (o aviso verde de cada um).
2. ❌ O popover do prazo aberto ("Criar atividade após entrar na etapa em:", com os atalhos).
3. ❌ A janela "Configurações de atividades" (lista à esquerda, editor à direita, "Atualizar"), com uma atividade de WhatsApp e uma de Tarefa.
4. ❌ O popover "Variáveis".
5. ❌ A coluna da etapa com mais de 6 atividades ("Ver mais") e uma atividade com o olho cortado (não listada).
6. ❌ O hover de uma atividade na coluna (setas ↑↓ e a lixeira).
7. ❌ A confirmação do "Desfazer".
8. ❌ Na ficha: uma etapa futura clicada ("Atividades · {etapa}", com "Ao entrar na etapa" e "1º dia").
9. ❌ Na ficha: o ⋮ de uma atividade aberto e o "Editar data e hora".
10. ❌ Na ficha: o ▾ do "Enviar mensagem" aberto, o celular cortado com a dica, e a janela "Enviar mensagem de WhatsApp" (outro atendente).
11. ❌ Na ficha: o detalhe de uma Ligação (roteiro e "Chamar …") e de uma Tarefa vazia ("Adicione o seu texto").
12. ❌ Na ficha: "Nova atividade" com a data aberta (o calendário da Clint) e o erro de data no passado.

**Goal:** O gestor monta, em cada etapa da origem, a lista de atividades da Clint (título, tipo, padrão ou não listada, prazo depois da entrada, mensagem, roteiro ou instrução); todo negócio que entra na etapa, por qualquer caminho, ganha essas atividades; na aba Atividades da ficha o vendedor vê as atividades por etapa e por dia, conclui (e, se o negócio não tem dono, vira o dono), cria atividade e envia a mensagem pronta de WhatsApp em um clique.

**Architecture:**
- **Banco (PR A, migration 9009):**
  - `crm_atividades_da_etapa`: o playbook, uma linha por atividade de etapa. Lida por todo membro da organização e escrita por gerente ou acima.
  - `crm_atividades_do_negocio`: uma linha por `crm_tasks` que veio do playbook ou foi criada na ficha.
  - Gatilho `after insert or update of stage_id` em `crm_leads`, definer: cria as tarefas da etapa nova. É o único ponto que pega todos os caminhos: tela, lote em SQL, arquivar etapa, API, automação, agente, captação, importação, retomada, transferência e o negócio que nasce da conversa.
  - Gatilho `after update of status` em `crm_tasks`: grava quem concluiu.
  - `fn_escale_salvar_playbook`: grava a lista inteira numa transação, como quem chama.
- **Rotas:**
  - `GET/PUT /api/v1/pipelines/[id]/playbook` (PR A, gerente ou acima).
  - `GET/POST /api/v1/leads/[id]/atividades` (PR B, quem vê o negócio; criar é agent ou acima).
  - Concluir, reabrir, editar data e conteúdo e excluir usam as rotas que já existem, `PATCH/DELETE /api/v1/tasks/[id]`, que já gravam `task_completed` na linha do tempo.
  - O dono (C21) usa o `PATCH /api/v1/leads/[id]`. O envio usa as rotas do inbox (`open-with-contact`, `GET /conversations/[id]`, `claim` e `POST /messages`).
- **Tela (PR A):** a aba Etapas e atividades da `JanelaDaOrigem` ganha o rascunho do playbook, com as janelas "Nova atividade" e "Configurações de atividades".
- **Tela (PR B):** a `AbaAtividades` é reescrita em peças: trilho, coluna Dias, lista, detalhe por tipo, "Nova atividade" e o seletor de data e hora da Clint.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Radix (Dialog, Popover, DropdownMenu, AlertDialog, Tooltip), zod, Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`, Supabase (RLS, gatilhos plpgsql).

## Referência visual (abrir o PNG antes de cada task de tela)

Os caminhos ficam **sem crase** (guarda `evidencia-citada`).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| F20 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1f\2026-10-16-20-etapas-e-atividades.jpg | **o alvo atual** da aba: colunas, "N Atividades nessa etapa", "+ Nova atividade" em link azul logo abaixo, "ORIGEM CUSTOMIZADA ⋮", rodapé "Cancelar" e "Salvar na origem ▾" | 6 |
| F21 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1f\2026-10-16-21-etapas-menu-do-modelo.png | o ⋮: "Escolher um modelo", "Compartilhar modelo" com a chave | 6 |
| 030 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-030-etapas-atividades-origem.png | a lista de atividades na coluna (o "1", o selo "D", o ícone do tipo, o título truncado, "Ver mais") | 6 |
| 024 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-024-configuracao-etapas-atividades.png | a janela "Nova atividade" da origem: título, os três cartões, "Tipo" com os 7 botões, o aviso verde, "Data da atividade", "1 dia(s)", "após entrar na etapa", "Continuar" | 5 |
| 009 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-009-configuracao-etapas-atividades-v1.png | a aba na v1 ("Nenhuma atividade nessa etapa") | 6 |
| G01 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1g\2026-10-17-01-ficha-aba-atividades.jpg | **o alvo atual** da aba Atividades: trilho, coluna "Dias" (☰, "OUT 15 QUI", "OUT 27 14 QUI"), "Próximas atividades ⚙", grupos "Qui, 15 Out · 2 atividades", item riscado e marcado, o detalhe de uma Tarefa, o lápis, "+ Nova atividade" | 12 |
| 017 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-017-etapas-atividades-card.png | o detalhe de um WhatsApp: o balão da mensagem, "Enviar mensagem ▾", o celular cortado, o lápis; o selo vermelho "2" no dia | 12, 13 |
| 003 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-003-aba-atividades-v1.png | a v1 (a hora vermelha da atrasada, a instrução da Tarefa) | 12 |
| 002 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-002-atividade-aberta-v1.png | "Nova atividade" no negócio: "Título", "Tipo", "Data e hora da atividade" com data, "às" e hora, "Continuar" | 11 |

### Medidas tiradas dos prints

| Peça | Medida | Print |
|---|---|---|
| Coluna da etapa | 227px (a da 1F), fundo `casca-busca`, cabeçalho 38px `casca-raia` | F20 |
| Linha de contagem | ícone `ListChecks` 13px na cor da marca + "N Atividades nessa etapa" 11px/600; linha embaixo `casca-borda` | F20 |
| "+ Nova atividade" | link 12px/500 `casca-novo`, centrado, 16px abaixo da contagem | F20 |
| Item da coluna | 30px de altura; número 11px `casca-marca`; selo 16px redondo `casca-marca-suave` com a inicial 9px/700 `casca-marca`; ícone do tipo 12px `casca-marca`; título 12px truncado | 030 |
| Selo do canto | ícone `LayoutPanelLeft` 14px + ⚠ 13px (`--escale-ponto-atencao`) + "ORIGEM CUSTOMIZADA" 10px/600, espaçamento 0.2em, maiúsculas; ⋮ 16px | F20, F21 |
| Janela "Nova atividade" (origem) | largura 1440px no print de 1828: na tela, `min(90vw, 1140px)`; título 17px/400; faixa da etapa 11px/500 maiúsculas, espaçamento 0.2em, `casca-meta`; campo do título 40px `casca-raia` | 024 |
| Cartões de visibilidade | 375×126px, borda `casca-borda`, raio 4; escolhido com borda da marca e título na cor da marca; "EM BREVE" 10px no canto | 024 |
| Botões do tipo | 44×40px, borda `casca-borda`, raio 6, ícone 18px `casca-marca`; escolhido com fundo da marca e ícone branco | 024 |
| Aviso verde | 56px de altura, borda 1px `--escale-aviso-ok-borda`, raio 4, ícone ✓ 18px e texto 13px/500 `--escale-aviso-ok-texto` | 024 |
| Prazo | caixa 175×40px `casca-raia`, texto 14px centrado, "após entrar na etapa" 14px ao lado | 024 |
| Trilho (ficha) | já é o da 1G (98px). A etapa anterior à atual ganha ✓ no círculo | G01 |
| Coluna "Dias" | 59px, borda direita; chip 40×38px, raio 6, borda `casca-borda`; dia 13px/600; semana 8px/600 maiúsculas; mês acima 9px/600 `casca-meta`; o escolhido com barra de 3px da marca à esquerda; selo vermelho 14px no canto (atrasadas) | G01, 017 |
| Lista | 450px (a da 1G); grupo "Qui, 15 Out" 11.5px/600 + chip 9px; item 47px: ícone 16px, título 13px, hora 11px (`casca-alerta` e 600 quando atrasada); caixa 18px à direita | G01 |
| Balão do WhatsApp | fundo `casca-caixa-msg`, borda `casca-borda-msg`, raio 10px, 10px×14px de respiro, texto 13.5px, largura máxima 520px | 017 |
| Rodapé do detalhe | 52px; "Enviar mensagem" 38px de altura, fundo da marca, raio 4, texto 14px/600 branco, ícone do WhatsApp 18px; ▾ em botão colado de 36px; celular 20px; lápis 18px | 017 |

### Textos da Clint usados nesta fase

Do levantamento do bundle `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\` (arquivo entre parênteses):
- **Coluna da etapa** (`index-D5llB5li`): "Nenhuma atividade nessa etapa", "{n} Atividades nessa etapa" (a Clint escreve "1 Atividades" também), "Nova atividade", "Ver mais", "Ver menos", "Etapa inicial do seu funil" (a 1F usa "Etapa inicial"), "Essa atividade não será listada na visão de atividades".
- **Canto e rodapé** (`index-mZOMjQAe`): "Origem customizada", "As etapas e atividades desta origem foram customizadas.", "Nenhum modelo", "Escolher um modelo", "Compartilhar modelo", "Salvar na origem", "Salvar no modelo atual", "Salvar como novo modelo", "Cancelar", "Desfazer", "Ao confirmar esta ação, todas as alterações realizadas serão desfeitas. Tem certeza de que deseja continuar?".
- **Janela "Nova atividade"** (`index-D5llB5li`, `TextTab-C0zM5VAc`):
  - Campos e erros: "Nova atividade", "Título", "Campo obrigatório*", "Tipo", "Continuar";
  - Cartões: "Atividade padrão" / "Crie uma atividade padrão com data e horário definido"; "Atividade não listada" / "Crie uma atividade que não será listada na visão de atividades"; "Atividade dependente" / "A atividade só será listada na visão de atividades após conclusão da atividade relacionada";
  - Tipos: "WhatsApp", "Instagram", "Ligação", "Email", "Agendamento", "Tarefa", "Reunião";
  - Exemplos de título: "Ex: Whatsapp de convite", "Ex: Instagram de convite", "Ex: Ligação de prospecção", "Ex: Email de abordagem", "Ex: Agendamento de reunião", "Ex: Validar ICP", "Ex: Reunião de validação";
  - Avisos: "Você poderá configurar a mensagem após a criação da atividade." (WhatsApp e Instagram), "… o script de ligação …", "… o email …", "… o agendamento …", "… a tarefa …", "… a reunião …".
- **Prazo** (`time-utils-x2wAssua`, `TextTab-C0zM5VAc`):
  - Campo: "Data da atividade", "O cálculo de tempo da atividade é com base na entrada do negócio na etapa.", "após entrar na etapa", "Criar atividade após entrar na etapa em:";
  - Unidades: "Minuto", "Hora", "Dia", "Semana", "Mês", "Ano", e no texto "dia(s)" e afins;
  - Atalhos: "No mesmo dia", "Em um dia", "Em 3 dias", "Em uma semana", "Em duas semanas";
  - Botões: "Cancelar", "Salvar".
- **Configurações de atividades** (`index-D5llB5li`): "Configurações de atividades", "Selecionar Etapa", "Adicione um título...", "Adicionar variáveis", "Ajuda com as atividades", "Atualizar", "Atividade atualizada", "Nenhuma mensagem adicionada", "Clique aqui para adicionar o conteúdo da mensagem.", "Adicione o seu script", "Adicione o seu texto".
- **Variáveis** (`variable-options-EMzVfpCO`, `pt-BR-DmQ11GIn`): "Variáveis", "Buscar variável", "Nenhuma variável encontrada"; grupos "Negócio", "Contato", "Usuário", "Empresa"; itens "Etapa", "Valor", "Nome", "Primeiro nome", "Sobrenome", "Email", "Telefone", "Segundo nome", "Nome da empresa".
- **Aba Atividades** (`index-BKc3FRy4`, `getStageGroupInfo-BptXw8sG`, `TimeSlotGrid-Bp4n-YK4`, `index-D8BXd1UY`):
  - Lista e dias: "Próximas atividades", "Atividades · {stage}", "O negócio ainda não está na etapa {stage}. Estas são as atividades previstas, agrupadas por quando devem ser feitas após a entrada; as datas só são definidas quando o negócio chega aqui.", "Configurar etapa", "Todas", "Hoje", "{count} atividades", "Ao entrar na etapa", "{n}º minuto", "{n}ª hora", "{n}º dia", "{n}ª semana", "{n}º mês", "{n}º ano", "{nome} está aqui";
  - Menu ⋮: "Marcar como concluída", "Reabrir atividade", "Editar data e hora", "Excluir atividade", "Tem certeza que deseja excluir esta atividade?";
  - Detalhe: "Modo edição", "Sair do modo edição", "Remover atividade do negócio", "Nenhuma atividade selecionada", "Escolha uma atividade na lista ao lado para visualizar os detalhes.", "Esta atividade não está presente no modelo";
  - Vazios e erros: "Sem atividades configuradas", "Crie a primeira atividade para acompanhar este negócio.", "Erro ao buscar atividades. Tente novamente.", "Erro ao adicionar atividade. Tente novamente.", "Erro ao atualizar atividade. Tente novamente.";
  - Toasts: "Tarefa concluída com sucesso", "Marcação de tarefa removida com sucesso", "Atividade removida com sucesso", "A data e a hora da atividade foram alteradas com sucesso".
- **WhatsApp** (`ChannelAccount-VhzA26gZ`, `resolve-attendant-label-Ba0RagMT`):
  - Botão e menu: "Enviar mensagem", "Alterar dispositivo", "Abrir em Conversas", "Abrir no WhatsApp Web", "Abrir no aplicativo WhatsApp";
  - Dispositivo: "Você não possui um dispositivo vinculado!", "Seu dispositivo está desconectado!", "Você está enviando com o dispositivo: {nome}";
  - Envio: "A atividade foi realizada com sucesso!", "Enviar mensagem de WhatsApp", "Este contato está em atendimento com o usuário {nome}", "Você gostaria de assumir o atendimento e enviar a mensagem mesmo assim?", "Atendimento assumido e mensagem enviada com sucesso!".
- **Ligação:** "Chamar {primeiro nome}".
- **Nova atividade no negócio:** "Data e hora da atividade", "às", "A data informada não pode ser no passado. Por favor, selecione uma data futura.".

### Comportamento da Clint conferido no código

- **Modelo** (`index-CY2O8ZFZ`, esquema `template_activity`/`activity`/`deal_activity`):
  - O prazo é `time_to_check` em **minutos** depois da entrada na etapa. O padrão é 1.440 (1 dia). Não há hora do dia.
  - A visibilidade é `DEFAULT | NOT_LISTED | CONDITIONAL`, e a CONDITIONAL fica "Em breve".
  - As listas são ordenadas por prazo e depois por `order`. As setas ↑↓ só aparecem entre vizinhas de mesmo prazo e refazem o `order`. A lixeira do item não pede confirmação.
- **Nova atividade (origem):** "Continuar" põe a atividade **só no rascunho** e abre "Configurações de atividades" com ela escolhida. Nada vai ao servidor até "Salvar na origem".
- **Selo do item:** número = minutos ÷ unidade. A letra é a inicial da unidade (D, H, S, M, A, m).
- **Concluir:** o hook `completeActivity` (`Wua`, `index-CY2O8ZFZ`) grava a conclusão e, se o negócio não tem `user`, grava o dono = quem concluiu (`deal.updateByPk({_set:{user_id}})`). A regra é **da tela**.
- **Enviar mensagem:** `chat_can_send_activity_message` → `chat_send_activity_message`, com as variáveis resolvidas no front, e depois conclui a atividade. Confirmação só quando o contato está em atendimento com outro usuário.
- **Engrenagem da lista:** não tem opções. É "Configurar etapa", que abre a configuração da origem na aba Etapas e atividades (permissão de configurar a origem).
- **Coluna "Dias":** "Todas" + um chip por dia com atividade. O mês aparece acima quando muda. O selo vermelho conta as atrasadas. A coluna some sem nenhuma atividade com data.
- **Etapa futura:** a lista mostra as atividades previstas, agrupadas por "Ao entrar na etapa", "1º dia", "2ª hora"…, com a dica "O negócio ainda não está na etapa …".
- **Nova atividade (negócio):** "Continuar" **cria direto** (`deal_activity_create`), sem segundo passo. A data padrão é agora, e data no passado dá erro.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| P1 | **Dois PRs.** A (Tasks 1 a 7): regras, 9009, rotas do playbook e a aba Etapas e atividades. B (Tasks 8 a 14): a aba Atividades da ficha. O PR B nasce da `main` depois do merge do A | Escopo (Q1) |
| P2 | **Tipos e visibilidade** com o vocabulário da Clint em português, num CHECK: `whatsapp, instagram, ligacao, email, agendamento, tarefa, reuniao` e `padrao, nao_listada` | Clint; "dependente" é "Em breve" (Q14) |
| P3 | **A atividade do negócio é uma `crm_tasks` + uma linha em `crm_atividades_do_negocio`** (tipo, visibilidade, etapa, `atividade_id`, `concluida_por`, `concluida_em`). O conteúdo é copiado em `description` e o título em `title` | Q2; a tarefa do original continua valendo em todo lugar |
| P4 | **O gatilho de entrada:** `after insert or update of stage_id` em `crm_leads`, só com `status = 'open'`. Para cada atividade da etapa nova: se o negócio já tem a tarefa dela (`uq (lead_id, atividade_id)`), a pendente ganha prazo novo e a concluída fica; senão, nasce a tarefa com prazo = agora + `prazo_minutos`. Falha vira `warning` e não derruba a mudança de etapa | Q3, Q4, Q5; precedente: 9007 |
| P5 | **A tarefa do playbook** nasce com `priority 'medium'`, `status 'pending'`, `assigned_to` = dono humano do negócio (ou nulo), `contact_id` do negócio, `created_by` nulo e `source_kind 'playbook'`. **Não** grava `task_created` na linha do tempo (seriam várias linhas a cada mudança de etapa); a conclusão grava `task_completed` pela rota do original | Q17; Histórico limpo |
| P6 | **Salvar o playbook** substitui a lista da origem numa transação (`fn_escale_salvar_playbook`, invoker): mantém os ids (a tarefa já criada continua apontando para a atividade), apaga as que saíram (só de etapas abertas; a atividade de etapa arquivada fica guardada) e recusa etapa de outra origem, ganha, perdida ou arquivada (22023) | 9003 como modelo |
| P7 | **Janela "Nova atividade" (origem):** título (1 a 255), os três cartões (dependente desligado, "EM BREVE"), o tipo (7 botões), o aviso verde do tipo, "Data da atividade" com o popover do prazo (número de 1 a 999 + unidade + atalhos). "Continuar" põe no rascunho e abre "Configurações de atividades" | Clint (`index-D5llB5li`) |
| P8 | **A aba Etapas e atividades:** coluna por etapa aberta, contagem que recolhe e expande a lista, 6 itens e "Ver mais", o item com número, selo, ícone, título e olho cortado, ↑↓ e lixeira no hover. O selo do canto e o ⋮ (modelos "Em breve"). "Cancelar" vira "Desfazer" (com confirmação) quando há mudança. "Salvar na origem" liga quando há mudança, grava, mostra "Origem alterada com sucesso!" e fecha. A seta ▾ continua "Em breve". Sem editar etapas (Q13) | Clint; Q12, Q13 |
| P9 | **Conteúdo:** um texto simples por atividade, até 4.096 caracteres, editado na janela "Configurações de atividades" e, na ficha, pelo lápis (modo edição com gravação automática depois de 750ms, como a Clint) | Q9 |
| P10 | **Variáveis:** os campos personalizados do CRM (`settings.fields` da origem) entram em "Negócio" como `[DEAL.<CHAVE>]` (valor do negócio) e em "Contato" como `[CONTACT.<CHAVE>]` (valor do contato), com a chave em maiúsculas, como a Clint; o valor sai em texto pela `valorParaLeitura` da 1H (lista pelo rótulo, data dd/mm/aaaa, moeda, Sim/Não). E as fixas: `[DEAL.STAGE]`, `[DEAL.VALUE]`, `[CONTACT.NAME]`, `[CONTACT.FIRST_NAME]`, `[CONTACT.LAST_NAME]`, `[CONTACT.EMAIL]`, `[CONTACT.PHONE]`, `[USER.FIRST_NAME]`, `[USER.LAST_NAME]`, `[USER.EMAIL]` e `[ORGANIZATION.NAME]`. O popover "Variáveis" insere no cursor. A troca é feita na tela, na hora de enviar e de mostrar o balão; a variável sem valor vira vazio, e a desconhecida fica como está | Q10; Clint resolve no front |
| P11 | **Não listada:** aparece na ficha com o olho cortado laranja (`--escale-nao-listada`) e a dica da Clint | Q11 |
| P12 | **Trilho da ficha:** clicar mostra as atividades da etapa. A atual tem a foto do contato e a dica "{primeiro nome} está aqui", e as anteriores ganham ✓. Na etapa futura, a lista mostra o playbook dela agrupado por prazo relativo, sem caixa de concluir. Mudar a etapa pela ficha fica para depois desta fase, mas é obrigatório antes do fim do projeto | Q5, Q6 |
| P13 | **Concluir e reabrir:** a caixa e o ⋮ chamam `PATCH /api/v1/tasks/[id]` (`status`). Ao concluir, se o negócio não tem dono e a pessoa tem `pipeline.move_card`, a tela grava `owner_user_id` = quem concluiu. O ⋮ tem "Editar data e hora" (`due_date`) e "Excluir atividade" (`DELETE`, só se `atividade_id` é nulo) | C21; Q15, Q16 |
| P14 | **Enviar WhatsApp:** (1) a conversa do contato (`lead.conversa.id`, ou `POST /conversations/open-with-contact`); (2) `GET /conversations/[id]`: se `assigned_to_user_id` é de outra pessoa, abre a janela da Clint, e confirmar faz `POST /conversations/[id]/claim` com `expected_assignee`; (3) `POST /api/v1/messages` com o texto resolvido; (4) conclui (com a regra do dono). Toast da Clint. **Enter envia como o clique:** ao abrir um WhatsApp, o foco vai para "Enviar mensagem" | Q7 |
| P15 | **Dispositivo:** o primeiro canal `WORKING` de `useChannelSessions` é o que o `open-with-contact` usa. Sem canal: celular cortado com "Você não possui um dispositivo vinculado!" e "Enviar mensagem" desligado. Canal sem `WORKING`: "Seu dispositivo está desconectado!". "Alterar dispositivo" fica "Em breve" | Q8 |
| P16 | **Nova atividade (ficha):** janela estreita sem os cartões (fica "padrão"): título, tipo, "Data e hora da atividade" com o calendário da Clint (`SeletorDeDataEHora`), "às" e a hora (HH:mm, 24 h). Data no passado dá o erro da Clint. Cria na etapa que está sendo vista | Clint; Q18 |
| P17 | **Engrenagem "Configurar etapa":** gerente ou acima, com o painel Origens montado (a ficha mora em `/app/negocios`, que monta o painel): abre a janela da origem **na aba Etapas e atividades** | Clint; F20 da 1F |
| G1 | **Verificação enxuta** (aprovada em 17/10). Ver "Verificação" | Política em vigor |

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- **Base do PR A:** `escale-crm/main` com a 1H inteira mergeada (PR A e PR B). A Task 1 prova: `hooks/escale/useHistoricoDoNegocio.ts` existe e a migration 9008 está na `main`. Sem isso, PARE e pergunte.
- **Migration:** só no PR A, a **9009** (`supabase/migrations/20261024120000_9009_playbook_de_etapas.sql`).
  - A Task 2 confere que a última 90xx da `main` é a 9008. A série 91xx é da Frente B e não conta.
  - Se houver uma 90xx maior, troque o número e o timestamp em todos os lugares: arquivo, cabeçalho do baseline e testes.
  - PARE se a 9009 já existir em outra branch: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`.
- **Branches:** PR A `feat/fase-1i-playbook`. PR B `feat/fase-1i-aba-atividades`, criada da `escale-crm/main` **depois** do merge do PR A (a Task 8 prova).
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:** push em `origin` (Rafael), merge, tag, release, VPS e gravar no banco de produção.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` só no PR A (Task 2 e a rodada cheia da Task 7). Precisa do Docker: se `docker info` falhar, PARE e peça ao usuário.

### Onde o fork entra nos arquivos do original

| Arquivo | Mudança |
|---|---|
| `tests/invariants/rls-completude-varredura.test.ts` | duas entradas novas em `PROVA_PROPRIA`, logo depois da `crm_campos_do_negocio` e das que a 1H pôs (Task 2) |
| `lib/i18n/dicionario.ts` | bloco novo logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`, depois dos blocos da 1H (Tasks 7 e 14) |
| `supabase/baseline.sql` | o bloco da 9009, idêntico à migration, logo depois do bloco da 9008 (Task 2) |

Nenhum outro arquivo do original muda. Os do fork que mudam:
- `components/escale/configuracoes/AbaDeEtapas.tsx` e `JanelaDaOrigem.tsx`;
- `components/escale/origens/JanelasDeOrigens.tsx` e `PainelOrigens.tsx`;
- `lib/escale/configuracoes/abrir.ts`;
- `components/escale/negocio/abas/AbaAtividades.tsx` e `components/escale/negocio/ConteudoDaAba.tsx`;
- `lib/ui/icons-da-casca.ts` e `app/escale-tema.css`.

### Onde a 1H encosta

- **`lib/escale/negocio/regras.ts`:** a 1H mexe em `secoesDoHistorico`. Esta fase só **importa** `horaDaTarefa` e `cabecalhoDoDia` de lá e não altera o arquivo.
- **`ConteudoDaAba.tsx`:** a 1H muda as props de outras abas. Esta fase troca só a linha do `case "atividades"`. Edite pela linha, não pelo arquivo inteiro.
- **`tests/unit/escale-ficha-abas-atividades-historico.test.tsx`:** a 1H tira dele o `describe` do Histórico. Esta fase tira o de Atividades (Task 12) e, se o arquivo ficar vazio, apaga o arquivo.
- **`AcoesDaFicha.tsx`:** a 1H liga "Nova nota" e as tags. Agendar e Lembretes seguem "Em breve" (Q18). Esta fase não toca no arquivo.
- **`JanelaDaCasca.tsx`:** a 1H acrescenta a prop `className`. Esta fase usa essa prop nas janelas largas.

### Testes que esta fase muda de propósito

| Teste | O que pinava | Por quê muda |
|---|---|---|
| `tests/unit/escale-janela-da-origem.test.tsx` | "Etapas e atividades: … Nova atividade e Salvar na origem desligados" e "'Salvar na origem' e a seta desligados têm a dica 'Em breve'" | Task 6: "Nova atividade" liga, e "Salvar na origem" liga quando há mudança. A seta continua "Em breve" |
| `tests/unit/escale-engrenagem-da-origem.test.tsx` | `aoAbrir` chamado só com o id | Task 6: o ouvinte recebe também a aba (`"geral"` ou `"etapas"`) |
| `tests/unit/escale-ficha-abas-atividades-historico.test.tsx` | Atividades só leitura: concluir e criar "Em breve" | Task 12 move os casos para `escale-ficha-aba-atividades.test.tsx` |

### Cercas que precisam ficar verdes

- `controle-decorativo`: todo botão desligado tem `title`.
- `tailwind-tokens`: cores só por token da casca ou `var(--escale-*)`. Nenhum hex novo em `className`: o laranja do "não listada" e o verde do aviso entram como `--escale-*` em `app/escale-tema.css` (Task 5).
- `vocabulario-do-funil`: nenhum "pipeline"/"kanban" em texto de JSX.
- `evidencia-citada`: este plano, copiado para o repositório, não cita imagem entre crases nem em link.
- `escale-casca-v2-original-intacto`: as peças do shell do original não importam `@/components/escale/`.
- `i18n-espanhol-cobre-a-tela`: os textos novos têm espanhol (Tasks 7 e 14), no registro "tú".
- `manifest-x-migrations`: a 9009 tem a linha `-- manifest:` e o `MANIFEST.md` não muda.
- `rls-completude-varredura`: as duas tabelas novas entram em `PROVA_PROPRIA`, apontando para `tests/invariants/escale-playbook-de-etapas.test.ts`.
- `hardening-definer-varredura` e `definer-nova-nasce-exposta`: as funções definer dos dois gatilhos têm `revoke all … from public, anon, authenticated`. A função de salvar é invoker, com `revoke … from public, anon` e `grant execute … to authenticated, service_role`.
- `lgpd-cascata-alcanca-quem-guarda-pessoa`: as tabelas novas não guardam contato, telefone, e-mail nem texto da pessoa. O texto da atividade fica em `crm_tasks.description`, que a anonimização do original já apaga. A Task 2 roda a cerca para confirmar.
- `lib/clipboard.test.ts`: nada de `navigator.clipboard` cru.

### Verificação (G1 — aprovada em 17/10)

1. **Em cada task:**
   - rode os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados;
   - para achar os guardas:
     ```bash
     for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit tests/invariants lib app components --include='*.test.ts' --include='*.test.tsx'; done | sort -u
     ```
   - rode os de `tests/unit` com `corepack pnpm vitest run <arquivos>`;
   - rode o prettier só nos arquivos NOVOS.
2. **`test:db`:** a Task 2 roda só o arquivo novo (`corepack pnpm test:db tests/invariants/escale-playbook-de-etapas.test.ts`). A rodada cheia do PR A roda tudo.
3. **Revisor (subagente):** só na Task 2 (migration, gatilhos e RLS), na Task 6 (rascunho e gravação do playbook), na Task 10 (concluir com dono) e na Task 13 (envio de WhatsApp). As outras o controlador confere lendo o diff.
4. **Rodada cheia:** uma por PR, no fim (Tasks 7 e 14), em segundo plano, comparada com `.superpowers/sdd/falhas-conhecidas.txt`.
5. **Conferência visual** do contrato: só no fim de cada PR, por tela e por estado, contra o print citado, com a lista escrita das diferenças que sobram.

### Commits e PR

- Os commits terminam com a linha `Co-Authored-By` que a sessão de execução indicar (hoje: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). O PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório no PR A (Task 1).
- Todo texto de tela passa por `t()` com literal. Datas, horas e moeda no formato brasileiro (dd/mm/aaaa, 24 h, R$ 1.234,56).

## Arquivos

| Arquivo | Novo/alterado | PR | Responsabilidade |
|---|---|---|---|
| `lib/escale/playbook/regras.ts` | novo | A | tipos, prazo, ordem, rascunho, schema da rota |
| `lib/escale/playbook/variaveis.ts` | novo | A | a lista de variáveis e a troca no texto |
| `supabase/migrations/20261024120000_9009_playbook_de_etapas.sql`, `supabase/baseline.sql` | novo / bloco | A | tabelas, RLS, gatilhos, função de salvar |
| `tests/unit/escale-playbook-migration.test.ts`, `tests/invariants/escale-playbook-de-etapas.test.ts`, `tests/invariants/rls-completude-varredura.test.ts` | novos / alterado | A | forma do SQL, prova no Postgres, varredura |
| `app/api/v1/pipelines/[id]/playbook/route.ts`, `hooks/escale/usePlaybookDaOrigem.ts` | novos | A | ler e salvar o playbook |
| `components/escale/atividades/IconeDoTipo.tsx` | novo | A | ícone por tipo e o celular cortado (A e B) |
| `components/escale/configuracoes/AbaDeEtapas.tsx` | alterado | A | colunas com atividades, selo do canto e ⋮ |
| `components/escale/configuracoes/playbook/ItemDoPlaybook.tsx` | novo | A | a linha da atividade na coluna |
| `components/escale/configuracoes/playbook/PrazoDaAtividade.tsx` | novo | A | a caixa "1 dia(s)" e o popover do prazo |
| `components/escale/configuracoes/playbook/JanelaNovaAtividade.tsx` | novo | A | "Nova atividade" da origem |
| `components/escale/configuracoes/playbook/JanelaConfiguracoesDeAtividades.tsx`, `VariaveisDaMensagem.tsx` | novos | A | editar a atividade e inserir variável |
| `components/escale/configuracoes/JanelaDaOrigem.tsx` | alterado | A | rascunho do playbook, rodapé, aba inicial |
| `lib/escale/configuracoes/abrir.ts`, `components/escale/origens/PainelOrigens.tsx`, `JanelasDeOrigens.tsx` | alterados | A | abrir a janela já na aba Etapas e atividades |
| `lib/escale/negocio/atividades.ts` | novo | B | juntar, vista por etapa, dias, grupos relativos, links do WhatsApp |
| `app/api/v1/leads/[id]/atividades/route.ts` | novo | B | ler e criar as atividades do negócio |
| `hooks/escale/useAtividadesDoNegocio.ts`, `hooks/escale/useEnviarAtividade.ts` | novos | B | consulta, concluir com dono, editar, excluir, enviar |
| `components/escale/negocio/abas/AbaAtividades.tsx` | alterado | B | a moldura da aba |
| `components/escale/negocio/abas/atividades/TrilhoDeEtapas.tsx`, `ColunaDosDias.tsx`, `ListaDeAtividades.tsx`, `DetalheDaAtividade.tsx`, `RodapeDoTipo.tsx`, `RodapeDoWhatsapp.tsx`, `JanelaDeOutroAtendente.tsx`, `JanelaNovaAtividadeDoNegocio.tsx`, `JanelaEditarDataEHora.tsx` | novos | B | as peças da aba |
| `components/escale/ui/SeletorDeDataEHora.tsx` | novo | B | o calendário de um dia da Clint + hora |
| `lib/ui/icons-da-casca.ts`, `app/escale-tema.css` | alterados | A e B | ícones e tokens novos |
| `lib/i18n/dicionario.ts` | alterado | A e B | espanhol |
| Testes novos: `escale-playbook-regras`, `escale-playbook-migration`, `escale-playbook-rota`, `escale-playbook-janelas`, `escale-playbook-variaveis`, `escale-playbook-configuracoes-de-atividades`, `escale-playbook-aba-de-etapas` (A); `escale-ficha-atividades-regras`, `escale-ficha-atividades-rota`, `escale-ficha-atividades-hook`, `escale-ficha-nova-atividade`, `escale-ficha-aba-atividades`, `escale-ficha-atividade-whatsapp` (B); e `tests/invariants/escale-playbook-de-etapas` (A) | novos | A e B | |
| Testes alterados: `escale-janela-da-origem`, `escale-engrenagem-da-origem` (A); `escale-ficha-abas-atividades-historico` (B) | alterados | A e B | |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md` | alterado (fora do repositório) | A e B | a linha da 1I na seção 8 |

---

# PR A — O playbook na configuração da origem

### Task 1: Base, branch e as regras puras do playbook

**Files:**
- Create: `lib/escale/playbook/regras.ts`, `tests/unit/escale-playbook-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/`

**Interfaces (Produces):**
- Constantes e tipos: `TIPOS_DE_ATIVIDADE`, `TipoDeAtividade`, `VISIBILIDADES_DA_ATIVIDADE`, `VisibilidadeDaAtividade`, `ROTULO_DO_TIPO`, `EXEMPLO_DO_TITULO`, `AVISO_DO_TIPO`, `UnidadeDoPrazo`, `UNIDADES_DO_PRAZO`, `PRAZO_PADRAO_EM_MINUTOS`, `QUANTIDADE_MAXIMA_DO_PRAZO`, `PRAZO_MAXIMO_EM_MINUTOS`, `ATALHOS_DO_PRAZO`, `MAX_ATIVIDADES_DO_PLAYBOOK`, `MAX_CONTEUDO_DA_ATIVIDADE`, `AtividadeDoPlaybook`, `ModeloDaEtapa`.
- Prazo: `prazoPorUnidade`, `minutosDoPrazo`, `quantidadeDoPrazoValida`, `textoDoPrazo`, `seloDoPrazo`.
- Rascunho: `doServidor`, `paraOServidor`, `compararAtividades`, `atividadesDaEtapa`, `adicionarAtividade`, `atualizarAtividade`, `removerAtividade`, `vizinhaDeMesmoPrazo`, `trocarDeLugar`, `playbookMudou`, `rotuloDoModelo`.
- Schema: `modeloSchema`, `playbookSchema`, `PedidoDoPlaybook`.

- [ ] **Step 1: A base e a branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:hooks/escale/useHistoricoDoNegocio.ts && echo "1H B ok"
git ls-tree --name-only escale-crm/main supabase/migrations/ | grep -E "_90[0-9]{2}_" | sort | tail -2
git switch -c feat/fase-1i-playbook escale-crm/main
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-17-fase-1i-playbook-de-etapas.md" docs/superpowers/plans/
```
Expected:
- `1H B ok`. Sem ele, PARE: a 1H ainda não entrou.
- A última 90xx é a `…_9008_notas_e_arquivos.sql`.

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-playbook-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  adicionarAtividade,
  atividadesDaEtapa,
  atualizarAtividade,
  doServidor,
  minutosDoPrazo,
  paraOServidor,
  playbookMudou,
  playbookSchema,
  prazoPorUnidade,
  quantidadeDoPrazoValida,
  removerAtividade,
  rotuloDoModelo,
  seloDoPrazo,
  textoDoPrazo,
  trocarDeLugar,
  vizinhaDeMesmoPrazo,
  type AtividadeDoPlaybook,
} from "@/lib/escale/playbook/regras";

/** FORK ESCALE · Fase 1I (D10): as regras puras do playbook da origem. */
const t = (s: string) => s;
const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const E1 = ID(901);
const E2 = ID(902);
const atv = (n: number, extra: Partial<AtividadeDoPlaybook> = {}): AtividadeDoPlaybook => ({
  id: ID(n),
  etapaId: E1,
  titulo: `Atividade ${n}`,
  tipo: "whatsapp",
  visibilidade: "padrao",
  prazoMinutos: 1440,
  ordem: n,
  conteudo: null,
  ...extra,
});

describe("prazo em minutos (time_to_check da Clint)", () => {
  it("mostra na maior unidade que divide sem sobra", () => {
    expect(prazoPorUnidade(1440)).toEqual({ quantidade: 1, unidade: "dia" });
    expect(prazoPorUnidade(1380)).toEqual({ quantidade: 23, unidade: "hora" });
    expect(prazoPorUnidade(20160)).toEqual({ quantidade: 2, unidade: "semana" });
    expect(prazoPorUnidade(90)).toEqual({ quantidade: 90, unidade: "minuto" });
    expect(prazoPorUnidade(525600)).toEqual({ quantidade: 1, unidade: "ano" });
  });
  it("minutosDoPrazo multiplica pela unidade; a quantidade vai de 1 a 999", () => {
    expect(minutosDoPrazo(3, "dia")).toBe(4320);
    expect(minutosDoPrazo(2, "hora")).toBe(120);
    expect(quantidadeDoPrazoValida(1)).toBe(true);
    expect(quantidadeDoPrazoValida(999)).toBe(true);
    expect(quantidadeDoPrazoValida(0)).toBe(false);
    expect(quantidadeDoPrazoValida(1000)).toBe(false);
    expect(quantidadeDoPrazoValida(1.5)).toBe(false);
  });
  it("texto e selo da Clint", () => {
    expect(textoDoPrazo(1440, t)).toBe("1 dia(s)");
    expect(textoDoPrazo(43200, t)).toBe("1 mês(es)");
    expect(textoDoPrazo(0, t)).toBe("Ao entrar na etapa");
    expect(seloDoPrazo(1440)).toEqual({ numero: 1, inicial: "D", unidade: "dia" });
    expect(seloDoPrazo(120)).toEqual({ numero: 2, inicial: "H", unidade: "hora" });
    expect(seloDoPrazo(30)).toEqual({ numero: 30, inicial: "m", unidade: "minuto" });
  });
});

describe("o rascunho do playbook", () => {
  it("atividadesDaEtapa ordena por prazo e depois pela ordem", () => {
    const lista = [atv(1, { prazoMinutos: 2880, ordem: 0 }), atv(2, { ordem: 5 }), atv(3, { ordem: 1 }), atv(4, { etapaId: E2 })];
    expect(atividadesDaEtapa(lista, E1).map((a) => a.id)).toEqual([ID(3), ID(2), ID(1)]);
  });
  it("adicionar põe no fim da etapa (ordem = maior + 1); na etapa vazia, 0", () => {
    const lista = adicionarAtividade([atv(1, { ordem: 4 })], { ...atv(2), etapaId: E1 });
    expect(lista.find((a) => a.id === ID(2))?.ordem).toBe(5);
    expect(adicionarAtividade([], atv(7))[0]?.ordem).toBe(0);
  });
  it("atualizar troca os campos; trocar de etapa põe no fim da outra", () => {
    const lista = [atv(1), atv(2, { etapaId: E2, ordem: 3 })];
    expect(atualizarAtividade(lista, ID(1), { titulo: "Novo" })[0]?.titulo).toBe("Novo");
    const movida = atualizarAtividade(lista, ID(1), { etapaId: E2 }).find((a) => a.id === ID(1));
    expect(movida).toMatchObject({ etapaId: E2, ordem: 4 });
  });
  it("remover tira só a atividade pedida", () => {
    expect(removerAtividade([atv(1), atv(2)], ID(1)).map((a) => a.id)).toEqual([ID(2)]);
  });
  it("as setas só trocam vizinhas de MESMO prazo", () => {
    const lista = [atv(1, { ordem: 0 }), atv(2, { ordem: 1 }), atv(3, { ordem: 2, prazoMinutos: 2880 })];
    expect(vizinhaDeMesmoPrazo(lista, ID(1), 1)).toBe(ID(2));
    expect(vizinhaDeMesmoPrazo(lista, ID(2), 1)).toBeNull();
    expect(vizinhaDeMesmoPrazo(lista, ID(1), -1)).toBeNull();
    const trocada = trocarDeLugar(lista, ID(2), -1);
    expect(atividadesDaEtapa(trocada, E1).map((a) => a.id)).toEqual([ID(2), ID(1), ID(3)]);
    expect(trocarDeLugar(lista, ID(2), 1)).toBe(lista);
  });
  it("servidor ↔ tela, e 'mudou' ignora a ordem do array", () => {
    const a = atv(1, { conteudo: "Olá [CONTACT.FIRST_NAME]" });
    expect(doServidor(paraOServidor(a))).toEqual(a);
    expect(playbookMudou([atv(1), atv(2)], [atv(2), atv(1)])).toBe(false);
    expect(playbookMudou([atv(1, { titulo: "x" })], [atv(1)])).toBe(true);
  });
  it("rótulo do canto", () => {
    expect(rotuloDoModelo(true)).toBe("Origem customizada");
    expect(rotuloDoModelo(false)).toBe("Nenhum modelo");
  });
});

describe("o pedido da rota (playbookSchema)", () => {
  it("aceita a lista válida e recusa id repetido, tipo fora do vocabulário e texto longo", () => {
    const ok = { atividades: [paraOServidor(atv(1))] };
    expect(playbookSchema.safeParse(ok).success).toBe(true);
    expect(playbookSchema.safeParse({ atividades: [paraOServidor(atv(1)), paraOServidor(atv(1))] }).success).toBe(false);
    expect(playbookSchema.safeParse({ atividades: [{ ...paraOServidor(atv(1)), tipo: "linkedin" }] }).success).toBe(false);
    expect(
      playbookSchema.safeParse({ atividades: [{ ...paraOServidor(atv(1)), conteudo: "x".repeat(4097) }] }).success,
    ).toBe(false);
    expect(playbookSchema.safeParse({ atividades: [{ ...paraOServidor(atv(1)), titulo: "  " }] }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-regras.test.ts`
Expected: FAIL (`Cannot find module '@/lib/escale/playbook/regras'`).

- [ ] **Step 4: As regras**

Create `lib/escale/playbook/regras.ts`:

```ts
/**
 * O PLAYBOOK DA ORIGEM (fork Escale, Fase 1I; D10): regras puras das
 * atividades por etapa, como a Clint as guarda (`template_activity`): título,
 * tipo, visibilidade, prazo em MINUTOS depois da entrada na etapa
 * (`time_to_check`), ordem e o conteúdo (mensagem, roteiro ou instrução).
 * Sem React e sem rede.
 *
 * - A tela mostra o prazo na maior unidade que o divide sem sobra
 *   ("1 dia(s)", selo "1D").
 * - A ordem só desempata atividades de mesmo prazo: as setas ↑↓ só trocam
 *   vizinhas de mesmo prazo, como na Clint.
 * - `TIPOS_DE_ATIVIDADE` e `VISIBILIDADES_DA_ATIVIDADE` são os CHECKs da 9009.
 */
import { z } from "zod";

export const TIPOS_DE_ATIVIDADE = [
  "whatsapp",
  "instagram",
  "ligacao",
  "email",
  "agendamento",
  "tarefa",
  "reuniao",
] as const;
export type TipoDeAtividade = (typeof TIPOS_DE_ATIVIDADE)[number];

export const VISIBILIDADES_DA_ATIVIDADE = ["padrao", "nao_listada"] as const;
export type VisibilidadeDaAtividade = (typeof VISIBILIDADES_DA_ATIVIDADE)[number];

export const ROTULO_DO_TIPO: Record<TipoDeAtividade, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  ligacao: "Ligação",
  email: "Email",
  agendamento: "Agendamento",
  tarefa: "Tarefa",
  reuniao: "Reunião",
};

export const EXEMPLO_DO_TITULO: Record<TipoDeAtividade, string> = {
  whatsapp: "Ex: Whatsapp de convite",
  instagram: "Ex: Instagram de convite",
  ligacao: "Ex: Ligação de prospecção",
  email: "Ex: Email de abordagem",
  agendamento: "Ex: Agendamento de reunião",
  tarefa: "Ex: Validar ICP",
  reuniao: "Ex: Reunião de validação",
};

export const AVISO_DO_TIPO: Record<TipoDeAtividade, string> = {
  whatsapp: "Você poderá configurar a mensagem após a criação da atividade.",
  instagram: "Você poderá configurar a mensagem após a criação da atividade.",
  ligacao: "Você poderá configurar o script de ligação após a criação da atividade.",
  email: "Você poderá configurar o email após a criação da atividade.",
  agendamento: "Você poderá configurar o agendamento após a criação da atividade.",
  tarefa: "Você poderá configurar a tarefa após a criação da atividade.",
  reuniao: "Você poderá configurar a reunião após a criação da atividade.",
};

export type UnidadeDoPrazo = "minuto" | "hora" | "dia" | "semana" | "mes" | "ano";

export const UNIDADES_DO_PRAZO: readonly {
  unidade: UnidadeDoPrazo;
  minutos: number;
  rotulo: string;
  texto: string;
  inicial: string;
}[] = [
  { unidade: "minuto", minutos: 1, rotulo: "Minuto", texto: "minuto(s)", inicial: "m" },
  { unidade: "hora", minutos: 60, rotulo: "Hora", texto: "hora(s)", inicial: "H" },
  { unidade: "dia", minutos: 1440, rotulo: "Dia", texto: "dia(s)", inicial: "D" },
  { unidade: "semana", minutos: 10080, rotulo: "Semana", texto: "semana(s)", inicial: "S" },
  { unidade: "mes", minutos: 43200, rotulo: "Mês", texto: "mês(es)", inicial: "M" },
  { unidade: "ano", minutos: 525600, rotulo: "Ano", texto: "ano(s)", inicial: "A" },
];

export const PRAZO_PADRAO_EM_MINUTOS = 1440;
export const QUANTIDADE_MAXIMA_DO_PRAZO = 999;
export const PRAZO_MAXIMO_EM_MINUTOS = QUANTIDADE_MAXIMA_DO_PRAZO * 525600;
export const MAX_ATIVIDADES_DO_PLAYBOOK = 300;
/** O teto de uma mensagem no original (`sendMessageSchema.body`). */
export const MAX_CONTEUDO_DA_ATIVIDADE = 4096;

/** Os atalhos do popover do prazo. "No mesmo dia" é 23 horas na Clint. */
export const ATALHOS_DO_PRAZO: readonly { rotulo: string; minutos: number }[] = [
  { rotulo: "No mesmo dia", minutos: 23 * 60 },
  { rotulo: "Em um dia", minutos: 1440 },
  { rotulo: "Em 3 dias", minutos: 3 * 1440 },
  { rotulo: "Em uma semana", minutos: 10080 },
  { rotulo: "Em duas semanas", minutos: 2 * 10080 },
];

export interface AtividadeDoPlaybook {
  id: string;
  etapaId: string;
  titulo: string;
  tipo: TipoDeAtividade;
  visibilidade: VisibilidadeDaAtividade;
  prazoMinutos: number;
  ordem: number;
  conteudo: string | null;
}

/** A linha como a rota e o banco a conhecem (`crm_atividades_da_etapa`). */
export interface ModeloDaEtapa {
  id: string;
  stage_id: string;
  titulo: string;
  tipo: TipoDeAtividade;
  visibilidade: VisibilidadeDaAtividade;
  prazo_minutos: number;
  ordem: number;
  conteudo: string | null;
}

const unidade = (u: UnidadeDoPrazo) => UNIDADES_DO_PRAZO.find((x) => x.unidade === u)!;

export function prazoPorUnidade(minutos: number): { quantidade: number; unidade: UnidadeDoPrazo } {
  if (minutos <= 0) return { quantidade: 0, unidade: "dia" };
  for (const u of [...UNIDADES_DO_PRAZO].reverse()) {
    if (minutos % u.minutos === 0) return { quantidade: minutos / u.minutos, unidade: u.unidade };
  }
  return { quantidade: minutos, unidade: "minuto" };
}

export const minutosDoPrazo = (quantidade: number, u: UnidadeDoPrazo): number => quantidade * unidade(u).minutos;

export const quantidadeDoPrazoValida = (q: number): boolean =>
  Number.isInteger(q) && q >= 1 && q <= QUANTIDADE_MAXIMA_DO_PRAZO;

export function textoDoPrazo(minutos: number, t: (s: string) => string): string {
  if (minutos <= 0) return t("Ao entrar na etapa");
  const p = prazoPorUnidade(minutos);
  return `${p.quantidade} ${t(unidade(p.unidade).texto)}`;
}

export function seloDoPrazo(minutos: number): { numero: number; inicial: string; unidade: UnidadeDoPrazo } {
  const p = prazoPorUnidade(minutos);
  return { numero: p.quantidade, inicial: unidade(p.unidade).inicial, unidade: p.unidade };
}

export const doServidor = (m: ModeloDaEtapa): AtividadeDoPlaybook => ({
  id: m.id,
  etapaId: m.stage_id,
  titulo: m.titulo,
  tipo: m.tipo,
  visibilidade: m.visibilidade,
  prazoMinutos: m.prazo_minutos,
  ordem: m.ordem,
  conteudo: m.conteudo,
});

export const paraOServidor = (a: AtividadeDoPlaybook): ModeloDaEtapa => ({
  id: a.id,
  stage_id: a.etapaId,
  titulo: a.titulo,
  tipo: a.tipo,
  visibilidade: a.visibilidade,
  prazo_minutos: a.prazoMinutos,
  ordem: a.ordem,
  conteudo: a.conteudo,
});

export function compararAtividades(
  a: Pick<AtividadeDoPlaybook, "prazoMinutos" | "ordem" | "titulo">,
  b: Pick<AtividadeDoPlaybook, "prazoMinutos" | "ordem" | "titulo">,
): number {
  return a.prazoMinutos - b.prazoMinutos || a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, "pt-BR");
}

export function atividadesDaEtapa(lista: readonly AtividadeDoPlaybook[], etapaId: string): AtividadeDoPlaybook[] {
  return lista.filter((a) => a.etapaId === etapaId).sort(compararAtividades);
}

export function adicionarAtividade(
  lista: readonly AtividadeDoPlaybook[],
  nova: Omit<AtividadeDoPlaybook, "ordem">,
): AtividadeDoPlaybook[] {
  const daEtapa = lista.filter((a) => a.etapaId === nova.etapaId);
  const ordem = daEtapa.length > 0 ? Math.max(...daEtapa.map((a) => a.ordem)) + 1 : 0;
  return [...lista, { ...nova, ordem }];
}

export function atualizarAtividade(
  lista: readonly AtividadeDoPlaybook[],
  id: string,
  mudanca: Partial<Omit<AtividadeDoPlaybook, "id" | "ordem">>,
): AtividadeDoPlaybook[] {
  const atual = lista.find((a) => a.id === id);
  if (!atual) return [...lista];
  if (mudanca.etapaId && mudanca.etapaId !== atual.etapaId) {
    const { ordem: _ordem, ...resto } = { ...atual, ...mudanca };
    return adicionarAtividade(
      lista.filter((a) => a.id !== id),
      resto,
    );
  }
  return lista.map((a) => (a.id === id ? { ...a, ...mudanca } : a));
}

export const removerAtividade = (lista: readonly AtividadeDoPlaybook[], id: string): AtividadeDoPlaybook[] =>
  lista.filter((a) => a.id !== id);

export function vizinhaDeMesmoPrazo(
  lista: readonly AtividadeDoPlaybook[],
  id: string,
  passo: -1 | 1,
): string | null {
  const atual = lista.find((a) => a.id === id);
  if (!atual) return null;
  const daEtapa = atividadesDaEtapa(lista, atual.etapaId);
  const vizinha = daEtapa[daEtapa.findIndex((a) => a.id === id) + passo];
  return vizinha && vizinha.prazoMinutos === atual.prazoMinutos ? vizinha.id : null;
}

/** Troca com a vizinha de mesmo prazo e renumera a ordem da etapa (0, 1, 2…). Sem vizinha, devolve a MESMA lista. */
export function trocarDeLugar(
  lista: readonly AtividadeDoPlaybook[],
  id: string,
  passo: -1 | 1,
): readonly AtividadeDoPlaybook[] {
  if (!vizinhaDeMesmoPrazo(lista, id, passo)) return lista;
  const atual = lista.find((a) => a.id === id)!;
  const daEtapa = atividadesDaEtapa(lista, atual.etapaId);
  const i = daEtapa.findIndex((a) => a.id === id);
  const trocada = [...daEtapa];
  [trocada[i], trocada[i + passo]] = [trocada[i + passo]!, trocada[i]!];
  const ordem = new Map(trocada.map((a, k) => [a.id, k]));
  return lista.map((a) => (ordem.has(a.id) ? { ...a, ordem: ordem.get(a.id)! } : a));
}

const chaveDoPlaybook = (lista: readonly AtividadeDoPlaybook[]) =>
  JSON.stringify(lista.map(paraOServidor).sort((a, b) => a.id.localeCompare(b.id)));

export const playbookMudou = (rascunho: readonly AtividadeDoPlaybook[], salvo: readonly AtividadeDoPlaybook[]) =>
  chaveDoPlaybook(rascunho) !== chaveDoPlaybook(salvo);

/** O selo do canto da aba (Q12): sem modelos no Escale, só "customizada" ou "nenhum". */
export const rotuloDoModelo = (temAtividadeSalva: boolean): string =>
  temAtividadeSalva ? "Origem customizada" : "Nenhum modelo";

export const modeloSchema = z
  .object({
    id: z.string().uuid(),
    stage_id: z.string().uuid(),
    titulo: z.string().trim().min(1).max(255),
    tipo: z.enum(TIPOS_DE_ATIVIDADE),
    visibilidade: z.enum(VISIBILIDADES_DA_ATIVIDADE),
    prazo_minutos: z.number().int().min(0).max(PRAZO_MAXIMO_EM_MINUTOS),
    ordem: z.number().int().min(0).max(9999),
    conteudo: z.string().max(MAX_CONTEUDO_DA_ATIVIDADE).nullable(),
  })
  .strict();

export const playbookSchema = z
  .object({ atividades: z.array(modeloSchema).max(MAX_ATIVIDADES_DO_PLAYBOOK) })
  .strict()
  .refine((v) => new Set(v.atividades.map((a) => a.id)).size === v.atividades.length, {
    message: "Atividade repetida.",
  });

export type PedidoDoPlaybook = z.infer<typeof playbookSchema>;
```

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-regras.test.ts && corepack pnpm prettier --write lib/escale/playbook/regras.ts tests/unit/escale-playbook-regras.test.ts && corepack pnpm eslint lib/escale/playbook/regras.ts`
Expected: PASS. O eslint pode reclamar do `_ordem` sem uso. Se reclamar, troque a desestruturação por `const resto: Omit<AtividadeDoPlaybook, "ordem"> = { id: atual.id, etapaId: …, … }`, montando campo a campo.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/playbook/regras.ts tests/unit/escale-playbook-regras.test.ts docs/superpowers/plans/2026-10-17-fase-1i-playbook-de-etapas.md
git commit -m "feat(escale): regras do playbook de etapas e atividades (Fase 1I)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: A migration 9009, o bloco do baseline e as provas

**Files:**
- Create: `supabase/migrations/20261024120000_9009_playbook_de_etapas.sql`, `tests/unit/escale-playbook-migration.test.ts`, `tests/invariants/escale-playbook-de-etapas.test.ts`
- Modify: `supabase/baseline.sql` (bloco novo depois do bloco da 9008), `tests/invariants/rls-completude-varredura.test.ts` (duas entradas em `PROVA_PROPRIA`)

**Interfaces (Produces):**
- Tabela `crm_atividades_da_etapa (id, organization_id, pipeline_id, stage_id, titulo, tipo, visibilidade, prazo_minutos, ordem, conteudo, created_at, updated_at)`.
- Tabela `crm_atividades_do_negocio (tarefa_id, organization_id, lead_id, stage_id, atividade_id, tipo, visibilidade, concluida_por, concluida_em, created_at)`.
- Função `fn_escale_salvar_playbook(p_org uuid, p_pipeline uuid, p_atividades jsonb) returns void` (invoker). Erros: `22023` (lista grande demais ou etapa inválida) e `42501` (quem não é gerente).
- Gatilhos `trg_escale_atividades_ao_entrar_na_etapa` (em `crm_leads`) e `trg_escale_quem_concluiu_a_atividade` (em `crm_tasks`).

- [ ] **Step 1: Conferir o número e a colisão**

```bash
git ls-tree --name-only escale-crm/main supabase/migrations/ | grep -E "_90[0-9]{2}_" | sort | tail -1
bash scripts/checar-colisao-de-migration.sh escale-crm/main
grep -n "FORK ESCALE · .*(migration 9008)" supabase/baseline.sql
```
Expected:
- a última 90xx é a 9008;
- o script não acusa colisão;
- o cabeçalho da 9008 existe no baseline.

- [ ] **Step 2: O teste de forma (vai falhar)**

Create `tests/unit/escale-playbook-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TIPOS_DE_ATIVIDADE, VISIBILIDADES_DA_ATIVIDADE } from "@/lib/escale/playbook/regras";

/**
 * PLAYBOOK DE ETAPAS E ATIVIDADES (fork Escale, migration 9009): a migration e o
 * bloco do baseline são o MESMO SQL, e o bloco mora no ponto fixo do fork —
 * depois do bloco 9008 e antes do bloco da 0323. Os gatilhos são definer e
 * fechados; a função de salvar roda como quem chama; os CHECKs batem com o
 * vocabulário do TypeScript.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261024120000_9009_playbook_de_etapas.sql";
const CABECALHO = "-- ---- FORK ESCALE · playbook de etapas e atividades (migration 9009) ----";
const CABECALHO_9008 = "(migration 9008) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");
const plano = (sql: string) => sql.replace(/\s+/g, " ");

function trecho(sql: string, inicio: string, fim: string): string {
  const i = sql.indexOf(inicio);
  const f = sql.indexOf(fim, i);
  expect(i).toBeGreaterThan(-1);
  expect(f).toBeGreaterThan(i);
  return sql.slice(i, f);
}

describe("playbook: migration 9009 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo aparece no baseline sem uma única diferença, depois do bloco 9008 e antes da 0323", () => {
    const baseline = ler("supabase/baseline.sql");
    const migration = ler(MIGRATION);
    expect(migration.length).toBeGreaterThan(4000);
    const de9008 = baseline.indexOf(CABECALHO_9008);
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(migration);
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9008).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9008);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("os CHECKs de tipo e visibilidade são o vocabulário do TypeScript", () => {
    const sql = plano(ler(MIGRATION));
    const lista = (xs: readonly string[]) => xs.map((x) => `'${x}'`).join(", ");
    expect(sql).toContain(`check (tipo in (${lista(TIPOS_DE_ATIVIDADE)}))`);
    expect(sql).toContain(`check (visibilidade in (${lista(VISIBILIDADES_DA_ATIVIDADE)}))`);
  });

  it("RLS ligada nas duas tabelas, sem anon; o playbook só com gerente, a atividade com agente", () => {
    const sql = plano(ler(MIGRATION));
    for (const tabela of ["crm_atividades_da_etapa", "crm_atividades_do_negocio"]) {
      expect(sql).toContain(`alter table public.${tabela} enable row level security;`);
      expect(sql).toContain(`revoke all on public.${tabela} from anon;`);
    }
    expect(sql).toContain("create policy crm_atividades_da_etapa_manager_write");
    expect(sql).toContain("public.fn_role_at_least(organization_id, 'manager')");
    expect(sql).toContain("create policy crm_atividades_do_negocio_agent_write");
    expect(sql).toContain("public.fn_role_at_least(organization_id, 'agent')");
  });

  it("os dois gatilhos são definer, com search_path fixo, fechados e com o disparo certo", () => {
    const sql = ler(MIGRATION);
    for (const nome of ["fn_escale_atividades_ao_entrar_na_etapa", "fn_escale_quem_concluiu_a_atividade"]) {
      const corpo = trecho(sql, `create or replace function public.${nome}()`, `revoke all on function public.${nome}()`);
      expect(corpo).toContain("security definer");
      expect(corpo).toContain("set search_path = public, pg_temp");
      expect(sql).toContain(`revoke all on function public.${nome}() from public, anon, authenticated;`);
    }
    const p = plano(sql);
    expect(p).toContain(
      "create trigger trg_escale_atividades_ao_entrar_na_etapa after insert or update of stage_id on public.crm_leads for each row execute function public.fn_escale_atividades_ao_entrar_na_etapa();",
    );
    expect(p).toContain(
      "create trigger trg_escale_quem_concluiu_a_atividade after update of status on public.crm_tasks for each row execute function public.fn_escale_quem_concluiu_a_atividade();",
    );
  });

  it("a entrada só vale para negócio aberto, não repete atividade e nunca derruba a mudança de etapa", () => {
    const corpo = plano(
      trecho(
        ler(MIGRATION),
        "create or replace function public.fn_escale_atividades_ao_entrar_na_etapa()",
        "revoke all on function public.fn_escale_atividades_ao_entrar_na_etapa()",
      ),
    );
    expect(corpo).toContain("new.stage_id is not distinct from old.stage_id");
    expect(corpo).toContain("new.status <> 'open'");
    expect(corpo).toContain("a.atividade_id = v_modelo.id");
    expect(corpo).toContain("'playbook'");
    expect(corpo).toContain("exception when others then raise warning");
  });

  it("salvar roda como quem chama e recusa etapa que não é aberta desta origem", () => {
    const sql = ler(MIGRATION);
    const corpo = plano(
      trecho(
        sql,
        "create or replace function public.fn_escale_salvar_playbook(",
        "revoke all on function public.fn_escale_salvar_playbook(",
      ),
    );
    expect(corpo).toContain("security invoker");
    expect(corpo).toContain("errcode = '22023'");
    expect(corpo).toContain("s.pipeline_id = p_pipeline");
    expect(plano(sql)).toContain(
      "grant execute on function public.fn_escale_salvar_playbook(uuid, uuid, jsonb) to authenticated, service_role;",
    );
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-migration.test.ts`
Expected: FAIL (a migration não existe).

- [ ] **Step 4: A migration**

Create `supabase/migrations/20261024120000_9009_playbook_de_etapas.sql`:

```sql
-- manifest: **Playbook de etapas e atividades (fork Escale, Fase 1I).** Duas tabelas novas: `crm_atividades_da_etapa` (o playbook da origem: as atividades de cada etapa, com título, tipo — whatsapp, instagram, ligacao, email, agendamento, tarefa, reuniao —, visibilidade — padrao ou nao_listada —, prazo em minutos depois da entrada na etapa, ordem e o texto da mensagem, do roteiro ou da instrução; todo membro lê, gerente ou acima escreve) e `crm_atividades_do_negocio` (uma linha por tarefa de `crm_tasks` que veio do playbook ou foi criada na ficha: tipo, visibilidade, etapa, a atividade do playbook que a gerou e quem concluiu; todo membro lê, agente ou acima escreve). `trg_escale_atividades_ao_entrar_na_etapa` (AFTER INSERT ou UPDATE OF stage_id em `crm_leads`, definer, fechado) cria as tarefas da etapa nova para o negócio aberto, por qualquer caminho (tela, lote, arquivar etapa, API, automação, agente, captação, importação, retomada, transferência e o negócio que nasce da conversa); a atividade que o negócio já tem não se repete (a pendente ganha prazo novo); falhar vira aviso e não derruba a mudança de etapa. `trg_escale_quem_concluiu_a_atividade` (AFTER UPDATE OF status em `crm_tasks`) grava quem concluiu e quando. `fn_escale_salvar_playbook` troca a lista da origem numa transação, como quem chama.
-- 9009: playbook de etapas e atividades (fork Escale).

-- ── O PLAYBOOK DA ORIGEM ───────────────────────────────────────────────────
-- Uma linha por atividade de etapa (o `template_activity` da Clint). O prazo é
-- em MINUTOS depois da entrada na etapa (`time_to_check`): até 999 anos. O
-- texto (mensagem, roteiro ou instrução) é de quem configura, não da pessoa
-- atendida: não entra na cascata da LGPD. A FK composta prende a origem à
-- organização; a etapa é conferida pela função de salvar (crm_stages não tem
-- índice único (organization_id, id)).
create table if not exists public.crm_atividades_da_etapa (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null,
  stage_id uuid not null references public.crm_stages(id) on delete cascade,
  titulo text not null,
  tipo text not null,
  visibilidade text not null default 'padrao',
  prazo_minutos integer not null default 1440,
  ordem integer not null default 0,
  conteudo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_atividades_da_etapa_funil_fk foreign key (organization_id, pipeline_id)
    references public.crm_pipelines (organization_id, id) on delete cascade,
  constraint crm_atividades_da_etapa_titulo_valido check (char_length(btrim(titulo)) between 1 and 255),
  constraint crm_atividades_da_etapa_tipo_valido
    check (tipo in ('whatsapp', 'instagram', 'ligacao', 'email', 'agendamento', 'tarefa', 'reuniao')),
  constraint crm_atividades_da_etapa_visibilidade_valida
    check (visibilidade in ('padrao', 'nao_listada')),
  constraint crm_atividades_da_etapa_prazo_valido check (prazo_minutos between 0 and 525074400),
  constraint crm_atividades_da_etapa_ordem_valida check (ordem between 0 and 9999),
  constraint crm_atividades_da_etapa_conteudo_valido check (conteudo is null or char_length(conteudo) <= 4096)
);

create index if not exists idx_crm_atividades_da_etapa_etapa
  on public.crm_atividades_da_etapa (organization_id, stage_id, prazo_minutos, ordem);
create index if not exists idx_crm_atividades_da_etapa_funil
  on public.crm_atividades_da_etapa (organization_id, pipeline_id);

-- ── A ATIVIDADE DO NEGÓCIO ─────────────────────────────────────────────────
-- A tarefa continua sendo a `crm_tasks` do original (título, texto, prazo,
-- status, responsável, linha do tempo, selo do card, anonimização). Esta tabela
-- só acrescenta o que a tarefa não tem: tipo, visibilidade, etapa, a atividade
-- do playbook que a gerou e quem concluiu. Apagar a tarefa apaga a linha.
create table if not exists public.crm_atividades_do_negocio (
  tarefa_id uuid primary key references public.crm_tasks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  stage_id uuid references public.crm_stages(id) on delete set null,
  atividade_id uuid references public.crm_atividades_da_etapa(id) on delete set null,
  tipo text not null default 'tarefa',
  visibilidade text not null default 'padrao',
  concluida_por uuid references auth.users(id) on delete set null,
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  constraint crm_atividades_do_negocio_tipo_valido
    check (tipo in ('whatsapp', 'instagram', 'ligacao', 'email', 'agendamento', 'tarefa', 'reuniao')),
  constraint crm_atividades_do_negocio_visibilidade_valida
    check (visibilidade in ('padrao', 'nao_listada'))
);

-- Uma atividade do playbook nasce UMA vez por negócio (voltar à etapa não repete).
create unique index if not exists uq_crm_atividades_do_negocio_modelo
  on public.crm_atividades_do_negocio (lead_id, atividade_id)
  where atividade_id is not null;
create index if not exists idx_crm_atividades_do_negocio_lead
  on public.crm_atividades_do_negocio (organization_id, lead_id);

alter table public.crm_atividades_da_etapa enable row level security;
alter table public.crm_atividades_do_negocio enable row level security;

drop policy if exists crm_atividades_da_etapa_select on public.crm_atividades_da_etapa;
drop policy if exists crm_atividades_da_etapa_manager_write on public.crm_atividades_da_etapa;
drop policy if exists crm_atividades_do_negocio_select on public.crm_atividades_do_negocio;
drop policy if exists crm_atividades_do_negocio_agent_write on public.crm_atividades_do_negocio;

-- Ler: a organização inteira (a ficha mostra o playbook da etapa futura a quem
-- vê o negócio; a tarefa do original também é lida pela organização inteira).
create policy crm_atividades_da_etapa_select on public.crm_atividades_da_etapa
  for select using (
    public.fn_is_platform_admin() or (organization_id in (select public.fn_user_org_ids()))
  );

-- Escrever o playbook é configurar a origem: gerente ou acima (PRD §5).
create policy crm_atividades_da_etapa_manager_write on public.crm_atividades_da_etapa
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

create policy crm_atividades_do_negocio_select on public.crm_atividades_do_negocio
  for select using (
    public.fn_is_platform_admin() or (organization_id in (select public.fn_user_org_ids()))
  );

-- Escrever acompanha a tarefa: agente ou acima (a régua de `crm_tasks_write`).
create policy crm_atividades_do_negocio_agent_write on public.crm_atividades_do_negocio
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent'))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent'))
  );

revoke all on public.crm_atividades_da_etapa from anon;
revoke all on public.crm_atividades_do_negocio from anon;
grant select, insert, update, delete on public.crm_atividades_da_etapa to authenticated;
grant select, insert, update, delete on public.crm_atividades_do_negocio to authenticated;
grant all on public.crm_atividades_da_etapa to service_role;
grant all on public.crm_atividades_do_negocio to service_role;

drop trigger if exists trg_crm_atividades_da_etapa_updated_at on public.crm_atividades_da_etapa;
create trigger trg_crm_atividades_da_etapa_updated_at
  before update on public.crm_atividades_da_etapa
  for each row execute function public.fn_set_updated_at();

-- ── SALVAR O PLAYBOOK ──────────────────────────────────────────────────────
-- Troca a lista da origem numa transação. INVOKER: a RLS de quem chama vale
-- (agent e viewer param no 42501). Mantém os ids (a tarefa que já nasceu
-- continua apontando para a atividade), apaga as que saíram — só das etapas
-- abertas: a atividade de etapa arquivada fica guardada — e recusa etapa de
-- outra origem, ganha, perdida ou arquivada.
create or replace function public.fn_escale_salvar_playbook(
  p_org uuid,
  p_pipeline uuid,
  p_atividades jsonb
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
begin
  if jsonb_typeof(p_atividades) is distinct from 'array' or jsonb_array_length(p_atividades) > 300 then
    raise exception 'o playbook aceita até 300 atividades' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_atividades) a
     where not exists (
       select 1
         from public.crm_stages s
        where s.id = (a ->> 'stage_id')::uuid
          and s.pipeline_id = p_pipeline
          and s.organization_id = p_org
          and not s.is_won and not s.is_lost and not s.is_archived
     )
  ) then
    raise exception 'atividade em etapa que não é aberta desta origem' using errcode = '22023';
  end if;

  select coalesce(array_agg((a ->> 'id')::uuid), '{}'::uuid[]) into v_ids
    from jsonb_array_elements(p_atividades) a;

  delete from public.crm_atividades_da_etapa m
   where m.organization_id = p_org
     and m.pipeline_id = p_pipeline
     and not (m.id = any (v_ids))
     and m.stage_id in (
       select s.id from public.crm_stages s
        where s.pipeline_id = p_pipeline and s.organization_id = p_org
          and not s.is_won and not s.is_lost and not s.is_archived
     );

  insert into public.crm_atividades_da_etapa
      (id, organization_id, pipeline_id, stage_id, titulo, tipo, visibilidade, prazo_minutos, ordem, conteudo)
    select (a ->> 'id')::uuid, p_org, p_pipeline, (a ->> 'stage_id')::uuid, btrim(a ->> 'titulo'),
           a ->> 'tipo', a ->> 'visibilidade', (a ->> 'prazo_minutos')::integer, (a ->> 'ordem')::integer,
           nullif(a ->> 'conteudo', '')
      from jsonb_array_elements(p_atividades) a
  on conflict (id) do update
     set stage_id = excluded.stage_id,
         titulo = excluded.titulo,
         tipo = excluded.tipo,
         visibilidade = excluded.visibilidade,
         prazo_minutos = excluded.prazo_minutos,
         ordem = excluded.ordem,
         conteudo = excluded.conteudo
   where crm_atividades_da_etapa.organization_id = p_org
     and crm_atividades_da_etapa.pipeline_id = p_pipeline;
end;
$$;

revoke all on function public.fn_escale_salvar_playbook(uuid, uuid, jsonb) from public, anon;
grant execute on function public.fn_escale_salvar_playbook(uuid, uuid, jsonb) to authenticated, service_role;

-- ── O NEGÓCIO ENTRA NA ETAPA ───────────────────────────────────────────────
-- Vale para todo caminho que grava `stage_id` (o UPDATE do lote em SQL e o de
-- arquivar etapa não emitem evento; por isso um gatilho, e não um consumidor
-- do event_log). Só o negócio ABERTO ganha atividade. Reordenar na mesma
-- etapa não conta. A tarefa nasce com prazo = agora + prazo da atividade e o
-- dono humano como responsável. Não grava `task_created` na linha do tempo
-- (seriam várias linhas a cada mudança de etapa). TUDO fica dentro de um
-- bloco com `exception`: criar atividade é consequência, e a falha não pode
-- derrubar a mudança de etapa em nenhum caminho.
create or replace function public.fn_escale_atividades_ao_entrar_na_etapa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_modelo record;
  v_existente record;
  v_tarefa uuid;
begin
  if tg_op = 'UPDATE' and new.stage_id is not distinct from old.stage_id then
    return null;
  end if;
  if new.stage_id is null or new.status <> 'open' then
    return null;
  end if;

  begin
    for v_modelo in
      select m.id, m.titulo, m.tipo, m.visibilidade, m.prazo_minutos, m.conteudo
        from public.crm_atividades_da_etapa m
       where m.organization_id = new.organization_id
         and m.stage_id = new.stage_id
       order by m.prazo_minutos, m.ordem
    loop
      select a.tarefa_id, t.status into v_existente
        from public.crm_atividades_do_negocio a
        join public.crm_tasks t on t.id = a.tarefa_id
       where a.lead_id = new.id
         and a.atividade_id = v_modelo.id;

      if found then
        if v_existente.status in ('pending', 'in_progress') then
          update public.crm_tasks
             set due_date = now() + make_interval(mins => v_modelo.prazo_minutos)
           where id = v_existente.tarefa_id;
        end if;
        continue;
      end if;

      insert into public.crm_tasks
          (organization_id, title, description, due_date, priority, status, lead_id, contact_id, assigned_to, source_kind)
        values
          (new.organization_id, v_modelo.titulo, v_modelo.conteudo,
           now() + make_interval(mins => v_modelo.prazo_minutos), 'medium', 'pending',
           new.id, new.contact_id, new.owner_user_id, 'playbook')
        returning id into v_tarefa;

      insert into public.crm_atividades_do_negocio
          (tarefa_id, organization_id, lead_id, stage_id, atividade_id, tipo, visibilidade)
        values
          (v_tarefa, new.organization_id, new.id, new.stage_id, v_modelo.id, v_modelo.tipo, v_modelo.visibilidade);
    end loop;
  exception when others then
    raise warning 'fn_escale_atividades_ao_entrar_na_etapa: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end
$fn$;

revoke all on function public.fn_escale_atividades_ao_entrar_na_etapa() from public, anon, authenticated;

drop trigger if exists trg_escale_atividades_ao_entrar_na_etapa on public.crm_leads;
create trigger trg_escale_atividades_ao_entrar_na_etapa
  after insert or update of stage_id on public.crm_leads
  for each row execute function public.fn_escale_atividades_ao_entrar_na_etapa();

-- ── QUEM CONCLUIU ──────────────────────────────────────────────────────────
-- A dica da caixa de concluir (Clint) diz quem concluiu e quando. Vale para
-- toda conclusão (ficha, lista de Tarefas do original, API). Reabrir apaga.
-- Tarefa sem linha nesta tabela (a do original) não muda nada.
create or replace function public.fn_escale_quem_concluiu_a_atividade()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.status is not distinct from old.status then
    return null;
  end if;
  update public.crm_atividades_do_negocio
     set concluida_por = case when new.status = 'done' then auth.uid() else null end,
         concluida_em = case when new.status = 'done' then now() else null end
   where tarefa_id = new.id;
  return null;
end
$fn$;

revoke all on function public.fn_escale_quem_concluiu_a_atividade() from public, anon, authenticated;

drop trigger if exists trg_escale_quem_concluiu_a_atividade on public.crm_tasks;
create trigger trg_escale_quem_concluiu_a_atividade
  after update of status on public.crm_tasks
  for each row execute function public.fn_escale_quem_concluiu_a_atividade();

comment on table public.crm_atividades_da_etapa is
  'Playbook da origem (fork Escale, migration 9009): as atividades de cada etapa (tipo, visibilidade, prazo em minutos depois da entrada, ordem, texto). Todo membro lê; gerente ou acima escreve, pela fn_escale_salvar_playbook.';
comment on table public.crm_atividades_do_negocio is
  'Atividade do negócio (fork Escale, migration 9009): uma linha por crm_tasks que veio do playbook ou foi criada na ficha, com tipo, visibilidade, etapa, a atividade que a gerou e quem concluiu.';
comment on function public.fn_escale_salvar_playbook(uuid, uuid, jsonb) is
  'Troca o playbook da origem p_pipeline da organização p_org numa transação, mantendo os ids. Security invoker: a RLS de quem chama vale. Chamador: app/api/v1/pipelines/[id]/playbook.';
comment on function public.fn_escale_atividades_ao_entrar_na_etapa() is
  'Fork Escale (9009): cria as tarefas da etapa nova (crm_atividades_da_etapa) para o negócio aberto; não repete; a pendente ganha prazo novo. Falha vira warning e não derruba a mudança de etapa. Definer, fechada a anon/authenticated.';
comment on function public.fn_escale_quem_concluiu_a_atividade() is
  'Fork Escale (9009): grava em crm_atividades_do_negocio quem concluiu a tarefa e quando; reabrir apaga. Definer, fechada a anon/authenticated.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

- [ ] **Step 5: O bloco do baseline**

O bloco entra logo depois do FIM do conteúdo da migration 9008 em `supabase/baseline.sql`: uma linha em branco, o cabeçalho e o conteúdo da 9009, byte a byte.

```bash
python - <<'PY'
from pathlib import Path
base = Path("supabase/baseline.sql")
texto = base.read_text(encoding="utf8")
m9008 = next(Path("supabase/migrations").glob("*_9008_*.sql")).read_text(encoding="utf8").replace("\r\n", "\n")
m9009 = Path("supabase/migrations/20261024120000_9009_playbook_de_etapas.sql").read_text(encoding="utf8").replace("\r\n", "\n")
assert texto.count(m9008) == 1, "o bloco da 9008 não está idêntico no baseline: PARE"
fim = texto.index(m9008) + len(m9008)
bloco = "\n-- ---- FORK ESCALE · playbook de etapas e atividades (migration 9009) ----\n" + m9009
base.write_text(texto[:fim] + bloco + texto[fim:], encoding="utf8", newline="\n")
PY
```
Expected: sem saída. Se o `assert` falhar, PARE e pergunte.

- [ ] **Step 6: Rodar o teste de forma**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-migration.test.ts tests/unit/manifest-x-migrations.test.ts`
Expected: PASS.

- [ ] **Step 7: A prova no Postgres**

Create `tests/invariants/escale-playbook-de-etapas.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_MANAGER,
  GOV_ORG,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * PLAYBOOK DE ETAPAS E ATIVIDADES (fork Escale, migration 9009) — prova contra
 * Postgres real: o negócio que entra na etapa ganha as atividades dela (sem
 * repetir), quem concluiu fica gravado, e a RLS das duas tabelas novas em dois
 * tenants por JWT, com a função de salvar rodando como quem chama.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const P = (n: number) => `e5ca1e00-9009-4000-8000-${String(n).padStart(12, "0")}`;
const FUNIL = P(1);
const E1 = P(2);
const E2 = P(3);
const EG = P(4);
const OUTRO_FUNIL = P(5);
const OUTRA_ETAPA = P(6);
const A_WHATS = P(11);
const A_TAREFA = P(12);
const A_LIGACAO = P(13);
const L1 = P(21);
const L2 = P(22);
const ORG_B = P(31);
const USER_B = P(32);
const FUNIL_B = P(33);
const ETAPA_B = P(34);
const A_B = P(35);

/** Roda o script como `authenticated` com o JWT do usuário e volta ao papel do teste. */
function comoUsuario(userId: string, script: string): string {
  try {
    return lastLine(
      sql(`
        set role authenticated;
        select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
        ${script}
      `),
    );
  } finally {
    sql(`reset role;`);
  }
}

const tarefasDo = (lead: string) =>
  Number(lastLine(sql(`select count(*)::int from public.crm_tasks where lead_id = '${lead}';`)));

/** id | status | tipo | visibilidade | etapa | responsável | minutos até o prazo */
const tarefaDa = (lead: string, atividade: string) =>
  lastLine(
    sql(`
      select t.id || '|' || t.status || '|' || a.tipo || '|' || a.visibilidade || '|' || a.stage_id || '|' ||
             coalesce(t.assigned_to::text, '-') || '|' ||
             round(extract(epoch from (t.due_date - now())) / 60)::int
        from public.crm_atividades_do_negocio a
        join public.crm_tasks t on t.id = a.tarefa_id
       where a.lead_id = '${lead}' and a.atividade_id = '${atividade}';
    `),
  ).split("|");

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email) values ('${USER_B}', 'escale-playbook-b@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-playbook-b', 'Escale Playbook Org B', 'Escale PB') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now()) on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${FUNIL}', '${GOV_ORG}', 'Funil do playbook (9009)', 'escale-9009-funil'),
             ('${OUTRO_FUNIL}', '${GOV_ORG}', 'Outro funil (9009)', 'escale-9009-outro'),
             ('${FUNIL_B}', '${ORG_B}', 'Funil da B (9009)', 'escale-9009-funil-b')
      on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position, is_won)
      values ('${E1}', '${GOV_ORG}', '${FUNIL}', '1. Entrada', 'e9009-1', 1, false),
             ('${E2}', '${GOV_ORG}', '${FUNIL}', '2. Atendimento', 'e9009-2', 2, false),
             ('${EG}', '${GOV_ORG}', '${FUNIL}', 'Ganho', 'e9009-g', 3, true),
             ('${OUTRA_ETAPA}', '${GOV_ORG}', '${OUTRO_FUNIL}', 'Outra', 'e9009-o', 1, false),
             ('${ETAPA_B}', '${ORG_B}', '${FUNIL_B}', 'Entrada B', 'e9009-b', 1, false)
      on conflict do nothing;
    insert into public.crm_atividades_da_etapa
        (id, organization_id, pipeline_id, stage_id, titulo, tipo, visibilidade, prazo_minutos, ordem, conteudo)
      values ('${A_WHATS}', '${GOV_ORG}', '${FUNIL}', '${E1}', 'Entrada de Lead', 'whatsapp', 'padrao', 1440, 0, 'Olá [CONTACT.FIRST_NAME]'),
             ('${A_TAREFA}', '${GOV_ORG}', '${FUNIL}', '${E1}', 'Pré-qualificação', 'tarefa', 'nao_listada', 60, 1, null),
             ('${A_LIGACAO}', '${GOV_ORG}', '${FUNIL}', '${E2}', 'Ligação 1', 'ligacao', 'padrao', 0, 0, 'Roteiro'),
             ('${A_B}', '${ORG_B}', '${FUNIL_B}', '${ETAPA_B}', 'Da B', 'tarefa', 'padrao', 60, 0, null)
      on conflict do nothing;
  `);
});

describe("o negócio entra na etapa e ganha as atividades (9009)", () => {
  it("criar direto na etapa cria as tarefas dela, com tipo, visibilidade, etapa, dono e prazo", () => {
    sql(`
      insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, owner_user_id, owner_kind)
        values ('${L1}', '${GOV_ORG}', '${FUNIL}', '${E1}', 'Ana', '${GOV_AGENT_A}', 'user') on conflict do nothing;
    `);
    expect(tarefasDo(L1)).toBe(2);
    const [, status, tipo, vis, etapa, dono, minutos] = tarefaDa(L1, A_WHATS);
    expect([status, tipo, vis, etapa, dono]).toEqual(["pending", "whatsapp", "padrao", E1, GOV_AGENT_A]);
    expect(Math.abs(Number(minutos) - 1440)).toBeLessThanOrEqual(1);
    expect(tarefaDa(L1, A_TAREFA)[3]).toBe("nao_listada");
    expect(
      lastLine(sql(`select string_agg(distinct source_kind, ',') from public.crm_tasks where lead_id = '${L1}';`)),
    ).toBe("playbook");
  });

  it("o texto da atividade vai para a descrição da tarefa", () => {
    expect(
      lastLine(
        sql(`select t.description from public.crm_tasks t join public.crm_atividades_do_negocio a on a.tarefa_id = t.id
              where a.lead_id = '${L1}' and a.atividade_id = '${A_WHATS}';`),
      ),
    ).toBe("Olá [CONTACT.FIRST_NAME]");
  });

  it("mudar de etapa cria as da nova; as da anterior ficam", () => {
    sql(`update public.crm_leads set stage_id = '${E2}' where id = '${L1}';`);
    expect(tarefasDo(L1)).toBe(3);
  });

  it("voltar não repete: a pendente ganha prazo novo, a concluída continua concluída", () => {
    const [whats] = tarefaDa(L1, A_WHATS);
    const [tarefa] = tarefaDa(L1, A_TAREFA);
    sql(`
      update public.crm_tasks set status = 'done' where id = '${tarefa}';
      update public.crm_tasks set due_date = now() - interval '3 days' where id = '${whats}';
      update public.crm_leads set stage_id = '${E1}' where id = '${L1}';
    `);
    expect(tarefasDo(L1)).toBe(3);
    expect(Number(tarefaDa(L1, A_WHATS)[6])).toBeGreaterThan(1430);
    expect(tarefaDa(L1, A_TAREFA)[1]).toBe("done");
  });

  it("mexer no negócio sem trocar de etapa não cria nada; o negócio ganho não ganha atividade", () => {
    sql(`update public.crm_leads set title = 'Ana Souza' where id = '${L1}';`);
    expect(tarefasDo(L1)).toBe(3);
    sql(`update public.crm_leads set stage_id = '${EG}', status = 'won' where id = '${L1}';`);
    expect(tarefasDo(L1)).toBe(3);
  });

  it("negócio sem dono: tarefa sem responsável; vale também pela sessão de um gerente (RLS ligada)", () => {
    comoUsuario(
      GOV_MANAGER,
      `insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title)
         values ('${L2}', '${GOV_ORG}', '${FUNIL}', '${E2}', 'Bruno') on conflict do nothing;
       select 1;`,
    );
    expect(tarefasDo(L2)).toBe(1);
    expect(tarefaDa(L2, A_LIGACAO)[5]).toBe("-");
  });
});

describe("quem concluiu (9009)", () => {
  const quem = (id: string) =>
    lastLine(
      sql(`select coalesce(concluida_por::text, '-') || '|' || (concluida_em is not null)::text
             from public.crm_atividades_do_negocio where tarefa_id = '${id}';`),
    );

  it("concluir pela sessão grava quem e quando; reabrir apaga", () => {
    const [id] = tarefaDa(L2, A_LIGACAO);
    comoUsuario(GOV_AGENT_A, `update public.crm_tasks set status = 'done' where id = '${id}'; select 1;`);
    expect(quem(id!)).toBe(`${GOV_AGENT_A}|true`);
    sql(`update public.crm_tasks set status = 'pending' where id = '${id}';`);
    expect(quem(id!)).toBe("-|false");
  });
});

describe("RLS do playbook e das atividades do negócio (9009)", () => {
  it("todo membro lê a própria organização; ZERO da vizinha nos dois sentidos", () => {
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_atividades_da_etapa where pipeline_id = '${FUNIL}';`)).toBe(3);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_atividades_do_negocio where lead_id = '${L1}';`)).toBe(3);
    expect(countAs(USER_B, `select count(*) from public.crm_atividades_da_etapa where organization_id = '${GOV_ORG}';`)).toBe(0);
    expect(countAs(USER_B, `select count(*) from public.crm_atividades_do_negocio where organization_id = '${GOV_ORG}';`)).toBe(0);
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_atividades_da_etapa where organization_id = '${ORG_B}';`)).toBe(0);
  });

  it("agente e viewer não escrevem o playbook; gerente escreve só na própria organização", () => {
    const novo = (org: string, funil: string, etapa: string, n: number) =>
      `insert into public.crm_atividades_da_etapa (id, organization_id, pipeline_id, stage_id, titulo, tipo)
         values ('${P(100 + n)}', '${org}', '${funil}', '${etapa}', 'X', 'tarefa')`;
    expect(writeCountAs(GOV_AGENT_A, novo(GOV_ORG, FUNIL, E1, 1))).toBe(0);
    expect(writeCountAs(GOV_VIEWER, novo(GOV_ORG, FUNIL, E1, 2))).toBe(0);
    expect(writeCountAs(GOV_MANAGER, novo(ORG_B, FUNIL_B, ETAPA_B, 3))).toBe(0);
    expect(writeCountAs(GOV_MANAGER, novo(GOV_ORG, FUNIL, E1, 4))).toBe(1);
    sql(`delete from public.crm_atividades_da_etapa where id = '${P(104)}';`);
  });

  it("viewer não escreve atividade do negócio; agente escreve", () => {
    const [id] = tarefaDa(L2, A_LIGACAO);
    expect(
      writeCountAs(GOV_VIEWER, `update public.crm_atividades_do_negocio set tipo = 'tarefa' where tarefa_id = '${id}'`),
    ).toBe(0);
    expect(
      writeCountAs(GOV_AGENT_A, `update public.crm_atividades_do_negocio set tipo = 'ligacao' where tarefa_id = '${id}'`),
    ).toBe(1);
  });
});

describe("salvar o playbook (fn_escale_salvar_playbook)", () => {
  const salvar = (atividades: object[]) =>
    `select public.fn_escale_salvar_playbook('${GOV_ORG}', '${FUNIL}', '${JSON.stringify(atividades)}'::jsonb);`;
  const item = (id: string, etapa: string, titulo: string) => ({
    id,
    stage_id: etapa,
    titulo,
    tipo: "whatsapp",
    visibilidade: "padrao",
    prazo_minutos: 1440,
    ordem: 0,
    conteudo: null,
  });

  it("o gerente troca a lista: mantém o id, muda o título e apaga o que saiu", () => {
    comoUsuario(GOV_MANAGER, salvar([item(A_WHATS, E1, "Entrada de Lead 2"), item(A_LIGACAO, E2, "Ligação 1")]));
    expect(
      lastLine(
        sql(`select string_agg(titulo, ',' order by titulo) from public.crm_atividades_da_etapa where pipeline_id = '${FUNIL}';`),
      ),
    ).toBe("Entrada de Lead 2,Ligação 1");
    // A tarefa continua ligada à atividade que ficou; a da que saiu perde o vínculo (set null).
    expect(tarefaDa(L1, A_WHATS)[2]).toBe("whatsapp");
    expect(
      lastLine(sql(`select count(*) from public.crm_atividades_do_negocio where atividade_id = '${A_TAREFA}';`)),
    ).toBe("0");
  });

  it("recusa etapa de outra origem e a etapa de ganho (22023)", () => {
    expect(() => comoUsuario(GOV_MANAGER, salvar([item(P(201), OUTRA_ETAPA, "X")]))).toThrow();
    expect(() => comoUsuario(GOV_MANAGER, salvar([item(P(202), EG, "X")]))).toThrow();
    expect(
      lastLine(sql(`select count(*) from public.crm_atividades_da_etapa where id in ('${P(201)}', '${P(202)}');`)),
    ).toBe("0");
  });

  it("agente não salva (a RLS de quem chama vale)", () => {
    expect(() => comoUsuario(GOV_AGENT_A, salvar([item(P(203), E1, "X")]))).toThrow();
    expect(lastLine(sql(`select count(*) from public.crm_atividades_da_etapa where id = '${P(203)}';`))).toBe("0");
  });
});
```

- [ ] **Step 8: Registrar as duas tabelas na varredura**

Em `tests/invariants/rls-completude-varredura.test.ts`, no array `PROVA_PROPRIA`, logo depois da última entrada do fork (a `crm_campos_do_negocio`, ou as da 1H, se estiverem depois dela), acrescente:

```ts
  {
    tabela: "crm_atividades_da_etapa",
    razao:
      "tests/invariants/escale-playbook-de-etapas.test.ts — fork Escale (migration 9009): todo membro lê o playbook da própria organização " +
      "e ZERO da vizinha nos dois sentidos, agente e viewer não escrevem, gerente escreve só na própria organização, e a função de salvar " +
      "roda como quem chama (agente recusado) e recusa etapa de outra origem ou fechada.",
  },
  {
    tabela: "crm_atividades_do_negocio",
    razao:
      "tests/invariants/escale-playbook-de-etapas.test.ts — fork Escale (migration 9009): todo membro lê as atividades da própria organização " +
      "e ZERO da vizinha, viewer não escreve, agente escreve; as linhas nascem do gatilho de entrada na etapa e a conclusão grava quem concluiu.",
  },
```

- [ ] **Step 9: Rodar a prova e as cercas do banco**

```bash
docker info > /dev/null 2>&1 || echo "SEM DOCKER: PARE e peça ao usuário"
corepack pnpm test:db tests/invariants/escale-playbook-de-etapas.test.ts
corepack pnpm vitest run tests/invariants/rls-completude-varredura.test.ts tests/unit/escale-playbook-migration.test.ts
grep -rlE "hardening-definer|definer-nova-nasce|lgpd-cascata" tests --include='*.test.ts' | xargs corepack pnpm vitest run
```
Expected: tudo PASS.
- **Cerca da LGPD:** se ela reclamar das tabelas novas, leia a mensagem.
  - As tabelas novas não têm `contact_id`, telefone, e-mail nem texto da pessoa.
  - Se a cerca contar `lead_id`, registre as duas tabelas do jeito que a mensagem pede. Cite que o texto mora em `crm_tasks.description`, redigido por `trg_redigir_tarefas_ao_anonimizar`.
- **Insert do negócio:** se a prova falhar por uma coluna obrigatória nova em `crm_leads`, copie a forma do insert de `tests/invariants/escale-configuracoes-da-origem.test.ts`.

- [ ] **Step 10: Revisor (G1)**

Despache um subagente revisor com o diff da task. Peça que confira:
- a RLS das duas tabelas;
- os gatilhos, nestes casos: lote em SQL, arquivar etapa, `status` diferente de `open` e o bloco `exception`;
- a função de salvar: se o `on conflict` com `where` impede tomar o id de outra organização.

Corrija o que vier como CRITICAL ou HIGH.

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/20261024120000_9009_playbook_de_etapas.sql supabase/baseline.sql tests/unit/escale-playbook-migration.test.ts tests/invariants/escale-playbook-de-etapas.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "feat(escale): migration 9009, o playbook de etapas e as atividades do negócio (Fase 1I)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: A rota e o hook do playbook

**Files:**
- Create: `app/api/v1/pipelines/[id]/playbook/route.ts`, `hooks/escale/usePlaybookDaOrigem.ts`, `tests/unit/escale-playbook-rota.test.ts`

**Interfaces:**
- Consumes: `playbookSchema`, `ModeloDaEtapa` (Task 1); `fn_escale_salvar_playbook` (Task 2).
- Produces:
  - `GET /api/v1/pipelines/[id]/playbook` → `{ data: { atividades: ModeloDaEtapa[] } }`.
  - `PUT` com `{ atividades: ModeloDaEtapa[] }` → a lista relida.
  - Erros: 404 origem fora da organização; 422 corpo inválido ou etapa recusada; 403 sem papel.
  - `chaveDoPlaybook(id)`, `usePlaybookDaOrigem(id)` (o `data` é `ModeloDaEtapa[]`), `useSalvarPlaybook(id)` (`mutateAsync(atividades: ModeloDaEtapa[])`).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-playbook-rota.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

import { GET, PUT } from "@/app/api/v1/pipelines/[id]/playbook/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

/** FORK ESCALE · Fase 1I (D10): ler e salvar o playbook da origem. */
const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const PIPE = "33333333-3333-4333-8333-333333333333";
const ETAPA = "44444444-4444-4444-8444-444444444444";
const ATV = {
  id: "55555555-5555-4555-8555-555555555555",
  stage_id: ETAPA,
  titulo: "Entrada de Lead",
  tipo: "whatsapp",
  visibilidade: "padrao",
  prazo_minutos: 1440,
  ordem: 0,
  conteudo: "Olá",
};

function banco(opts: { origem?: boolean; atividades?: unknown[]; rpcErro?: { code: string; message: string } }) {
  const rpc = vi.fn(async () => ({ data: null, error: opts.rpcErro ?? null }));
  const from = vi.fn(() => {
    const api = {
      select: () => api,
      eq: () => api,
      order: () => api,
      maybeSingle: async () => ({ data: opts.origem === false ? null : { id: PIPE }, error: null }),
      then: (ok: (v: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: opts.atividades ?? [ATV], error: null }).then(ok),
    };
    return api;
  });
  return { from, rpc };
}

const ctx = (id = PIPE) => ({ params: Promise.resolve({ id }) });
const pedido = (corpo: unknown) =>
  new NextRequest(`http://x/api/v1/pipelines/${PIPE}/playbook`, { method: "PUT", body: JSON.stringify(corpo) });

beforeEach(() => {
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: USER, idioma: "pt-BR" },
    org: { orgId: ORG },
  } as never);
});

describe("GET /api/v1/pipelines/[id]/playbook", () => {
  it("devolve as atividades da origem", async () => {
    vi.mocked(createClient).mockResolvedValue(banco({}) as never);
    const res = await GET(new NextRequest("http://x"), ctx());
    expect(res.status).toBe(200);
    expect((await res.json()).data.atividades).toEqual([ATV]);
  });
  it("origem fora da organização: 404; id inválido: 404", async () => {
    vi.mocked(createClient).mockResolvedValue(banco({ origem: false }) as never);
    expect((await GET(new NextRequest("http://x"), ctx())).status).toBe(404);
    expect((await GET(new NextRequest("http://x"), ctx("nao-e-uuid"))).status).toBe(404);
  });
  it("abaixo de gerente: a resposta do requireRole", async () => {
    vi.mocked(requireRole).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await GET(new NextRequest("http://x"), ctx())).status).toBe(403);
    expect(requireRole).toHaveBeenCalledWith("manager", expect.anything());
  });
});

describe("PUT /api/v1/pipelines/[id]/playbook", () => {
  it("chama a função com a organização da SESSÃO, audita e devolve a lista relida", async () => {
    const db = banco({});
    vi.mocked(createClient).mockResolvedValue(db as never);
    const res = await PUT(pedido({ atividades: [ATV] }), ctx());
    expect(res.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_salvar_playbook", {
      p_org: ORG,
      p_pipeline: PIPE,
      p_atividades: [ATV],
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline.config_updated", resourceId: PIPE, organizationId: ORG }),
    );
    expect((await res.json()).data.atividades).toEqual([ATV]);
  });
  it("corpo inválido: 422 sem chamar a função", async () => {
    const db = banco({});
    vi.mocked(createClient).mockResolvedValue(db as never);
    expect((await PUT(pedido({ atividades: [{ ...ATV, tipo: "linkedin" }] }), ctx())).status).toBe(422);
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("a função recusa a etapa (22023): 422; sem papel no banco (42501): 403", async () => {
    vi.mocked(createClient).mockResolvedValue(banco({ rpcErro: { code: "22023", message: "x" } }) as never);
    expect((await PUT(pedido({ atividades: [ATV] }), ctx())).status).toBe(422);
    vi.mocked(createClient).mockResolvedValue(banco({ rpcErro: { code: "42501", message: "x" } }) as never);
    expect((await PUT(pedido({ atividades: [ATV] }), ctx())).status).toBe(403);
  });
  it("origem fora da organização: 404 sem chamar a função", async () => {
    const db = banco({ origem: false });
    vi.mocked(createClient).mockResolvedValue(db as never);
    expect((await PUT(pedido({ atividades: [] }), ctx())).status).toBe(404);
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-rota.test.ts`
Expected: FAIL (a rota não existe).

- [ ] **Step 3: A rota**

Create `app/api/v1/pipelines/[id]/playbook/route.ts`:

```ts
/**
 * GET/PUT /api/v1/pipelines/:id/playbook — o playbook da origem (fork Escale,
 * Fase 1I; D10): as atividades de cada etapa.
 *
 * GET e PUT: gerente ou acima (quem abre a janela da origem; PRD §5). O PUT
 * troca a lista inteira (o "Salvar na origem" da Clint) pela
 * `fn_escale_salvar_playbook`, com a sessão de quem pede: a RLS vale, e a
 * função recusa etapa que não é aberta desta origem (22023 → 422). A
 * `organization_id` vem da sessão, nunca do corpo.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { playbookSchema, type ModeloDaEtapa } from "@/lib/escale/playbook/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const ROTA = "/api/v1/pipelines/[id]/playbook";
const COLUNAS = "id, stage_id, titulo, tipo, visibilidade, prazo_minutos, ordem, conteudo";
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;

type Banco = Awaited<ReturnType<typeof createClient>>;
type Leitura =
  | { ok: true; atividades: ModeloDaEtapa[] }
  | { ok: false; causa: unknown | null };

async function lerPlaybook(supabase: Banco, orgId: string, pipelineId: string): Promise<Leitura> {
  const origem = await supabase
    .from("crm_pipelines")
    .select("id")
    .eq("organization_id", orgId)
    .eq("id", pipelineId)
    .maybeSingle();
  if (origem.error) return { ok: false, causa: origem.error };
  if (!origem.data) return { ok: false, causa: null };
  const lista = await supabase
    .from("crm_atividades_da_etapa")
    .select(COLUNAS)
    .eq("organization_id", orgId)
    .eq("pipeline_id", pipelineId)
    .order("prazo_minutos")
    .order("ordem");
  if (lista.error) return { ok: false, causa: lista.error };
  return { ok: true, atividades: (lista.data ?? []) as ModeloDaEtapa[] };
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Origem não encontrada."), 404, { requestId });

  const lido = await lerPlaybook(await createClient(), authz.org.orgId, id);
  if (!lido.ok) {
    return lido.causa
      ? falhaInesperada(lido.causa, { rota: `GET ${ROTA}`, operacao: "ler" }, t, requestId)
      : fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }
  return ok({ atividades: lido.atividades }, { requestId });
}

export async function PUT(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Origem não encontrada."), 404, { requestId });

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = playbookSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const supabase = await createClient();
  const antes = await lerPlaybook(supabase, orgId, id);
  if (!antes.ok) {
    return antes.causa
      ? falhaInesperada(antes.causa, { rota: `PUT ${ROTA}`, operacao: "ler" }, t, requestId)
      : fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }

  const { error } = await supabase.rpc("fn_escale_salvar_playbook", {
    p_org: orgId,
    p_pipeline: id,
    p_atividades: parsed.data.atividades,
  });
  if (error) {
    if (error.code === "22023") {
      return fail("unprocessable_entity", t("Uma atividade está numa etapa que não é desta origem."), 422, {
        requestId,
      });
    }
    if (error.code === "42501") return fail("forbidden", t("Sem permissão."), 403, { requestId });
    return falhaInesperada(error, { rota: `PUT ${ROTA}`, operacao: "gravar" }, t, requestId);
  }

  void audit({
    action: "pipeline.config_updated",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "pipeline",
    resourceId: id,
    requestId,
    metadata: { secoes: ["playbook"], atividades: parsed.data.atividades.length, via: "escale" },
  });

  const depois = await lerPlaybook(supabase, orgId, id);
  if (!depois.ok) {
    return falhaInesperada(depois.causa, { rota: `PUT ${ROTA}`, operacao: "reler" }, t, requestId);
  }
  return ok({ atividades: depois.atividades }, { requestId });
}
```

- [ ] **Step 4: O hook**

Create `hooks/escale/usePlaybookDaOrigem.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { ModeloDaEtapa } from "@/lib/escale/playbook/regras";

/**
 * O PLAYBOOK DA ORIGEM (fork Escale, Fase 1I): a lista que a aba Etapas e
 * atividades edita. Sempre relê ao abrir (tela de gestor). Salvar põe a lista
 * relida no cache e invalida as atividades das fichas abertas (a etapa futura
 * mostra o playbook).
 */
type Resposta = { data: { atividades: ModeloDaEtapa[] } };

const rota = (id: string) => `/api/v1/pipelines/${id}/playbook`;

export const chaveDoPlaybook = (id: string) => ["playbook-da-origem", id] as const;

export function usePlaybookDaOrigem(id: string) {
  return useQuery({
    queryKey: chaveDoPlaybook(id),
    queryFn: async () => (await apiClient.get<Resposta>(rota(id))).data?.atividades ?? [],
    staleTime: 0,
  });
}

export function useSalvarPlaybook(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (atividades: ModeloDaEtapa[]) =>
      (await apiClient.put<Resposta>(rota(id), { atividades })).data.atividades,
    onSuccess: (lista) => {
      qc.setQueryData(chaveDoPlaybook(id), lista);
      void qc.invalidateQueries({ queryKey: ["atividades-do-negocio"] });
    },
  });
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-rota.test.ts && corepack pnpm prettier --write "app/api/v1/pipelines/[id]/playbook/route.ts" hooks/escale/usePlaybookDaOrigem.ts tests/unit/escale-playbook-rota.test.ts && corepack pnpm eslint "app/api/v1/pipelines/[id]/playbook/route.ts" hooks/escale/usePlaybookDaOrigem.ts`
Expected: PASS.
- Se o tipo do `rpc` recusar o nome `fn_escale_salvar_playbook`, os tipos gerados do banco ainda não têm a função. Siga o padrão da rota de visualizações: procure `fn_escale_salvar_visualizacao` em `app/api/v1/pipeline-views` e veja como ela chama.
- Nunca edite os tipos gerados à mão.

- [ ] **Step 6: Commit**

```bash
git add "app/api/v1/pipelines/[id]/playbook/route.ts" hooks/escale/usePlaybookDaOrigem.ts tests/unit/escale-playbook-rota.test.ts
git commit -m "feat(escale): rota e hook do playbook da origem (Fase 1I)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Ícones, tokens, o prazo e a janela "Nova atividade" da origem

**Abra antes:** os prints 024 e F20 (tabela "Referência visual").

**Files:**
- Create: `components/escale/atividades/IconeDoTipo.tsx`, `components/escale/configuracoes/playbook/PrazoDaAtividade.tsx`, `components/escale/configuracoes/playbook/JanelaNovaAtividade.tsx`, `tests/unit/escale-playbook-janelas.test.tsx`
- Modify: `lib/ui/icons-da-casca.ts` (bloco da 1I), `app/escale-tema.css` (tokens da 1I)

**Interfaces:**
- Consumes: Task 1 (`TipoDeAtividade`, `ROTULO_DO_TIPO`, `EXEMPLO_DO_TITULO`, `AVISO_DO_TIPO`, `TIPOS_DE_ATIVIDADE`, `PRAZO_PADRAO_EM_MINUTOS`, `UNIDADES_DO_PRAZO`, `ATALHOS_DO_PRAZO`, `prazoPorUnidade`, `minutosDoPrazo`, `quantidadeDoPrazoValida`, `textoDoPrazo`, `AtividadeDoPlaybook`).
- Consumes da 1H: `JanelaDaCasca` com a prop `className` (Task 9 da 1H). Se a prop não existir na `main`, PARE e pergunte.
- Produces:
  - `IconeDoTipo({ tipo, tamanho?, className? })` e `CelularDesligado({ tamanho?, ...svg })`;
  - `PrazoDaAtividade({ minutos, aoMudar, desabilitado? })`;
  - `JanelaNovaAtividade({ aberta, etapa: { id, name }, aoFechar, aoContinuar: (nova: Omit<AtividadeDoPlaybook, "ordem">) => void })`.

- [ ] **Step 1: Ícones e tokens**

Em `lib/ui/icons-da-casca.ts`, depois do bloco da 1H, acrescente:

```ts
// Fase 1I (playbook e aba Atividades): tarefa, reunião, celular, setas da ordem, compartilhar e a lista dos dias.
export { Clipboard, Watch, Smartphone, ArrowUp, ArrowDown, Share2, List } from "lucide-react";
```

Em `app/escale-tema.css`, logo depois do bloco da Fase 1F (o que termina em `--escale-status-perdido`), acrescente:

```css
/* ─── FORK ESCALE · Fase 1I (playbook e atividades) ───
   O olho cortado da atividade não listada (#FF9C46 no código da Clint,
   SaveOriginTemplate) e o aviso verde da janela "Nova atividade" (print 024;
   conferir com conta-gotas). */
body:has([data-escale-casca]) {
  --escale-nao-listada: #ff9c46;
  --escale-aviso-ok-borda: #86efac;
  --escale-aviso-ok-texto: #15803d;
}

[data-theme="dark"] body:has([data-escale-casca]) {
  --escale-nao-listada: #ffb47a;
  --escale-aviso-ok-borda: #166534;
  --escale-aviso-ok-texto: #86efac;
}
```

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-playbook-janelas.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { JanelaNovaAtividade } from "@/components/escale/configuracoes/playbook/JanelaNovaAtividade";
import { PrazoDaAtividade } from "@/components/escale/configuracoes/playbook/PrazoDaAtividade";
import { TooltipProvider } from "@/components/ui/tooltip";

/** FORK ESCALE · Fase 1I (D10): a janela "Nova atividade" da origem e o prazo (print 024). */
const ETAPA = { id: "e1", name: "Desqualificado" };

function abrirNova() {
  const aoContinuar = vi.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <TooltipProvider>
      <JanelaNovaAtividade aberta etapa={ETAPA} aoFechar={vi.fn()} aoContinuar={aoContinuar} />
    </TooltipProvider>,
  );
  return { user, aoContinuar };
}

describe("janela Nova atividade (origem)", () => {
  it("mostra a etapa, o título, os três cartões (dependente em breve), os 7 tipos e o prazo padrão", () => {
    abrirNova();
    const janela = screen.getByRole("dialog", { name: "Nova atividade" });
    expect(within(janela).getByText("Desqualificado")).toBeInTheDocument();
    expect(within(janela).getByPlaceholderText("Ex: Whatsapp de convite")).toBeInTheDocument();
    expect(within(janela).getByRole("button", { name: /Atividade padrão/ })).toHaveAttribute("aria-pressed", "true");
    const dependente = within(janela).getByRole("button", { name: /Atividade dependente/ });
    expect(dependente).toBeDisabled();
    expect(dependente).toHaveAttribute("title", "Em breve");
    for (const tipo of ["WhatsApp", "Instagram", "Ligação", "Email", "Agendamento", "Tarefa", "Reunião"]) {
      expect(within(janela).getByRole("button", { name: tipo })).toBeInTheDocument();
    }
    expect(within(janela).getByRole("button", { name: "WhatsApp" })).toHaveAttribute("aria-pressed", "true");
    expect(within(janela).getByText("Você poderá configurar a mensagem após a criação da atividade.")).toBeInTheDocument();
    expect(within(janela).getByRole("button", { name: "Data da atividade" })).toHaveTextContent("1 dia(s)");
    expect(within(janela).getByText("após entrar na etapa")).toBeInTheDocument();
  });

  it("trocar o tipo troca o exemplo do título e o aviso", async () => {
    const { user } = abrirNova();
    await user.click(screen.getByRole("button", { name: "Ligação" }));
    expect(screen.getByPlaceholderText("Ex: Ligação de prospecção")).toBeInTheDocument();
    expect(
      screen.getByText("Você poderá configurar o script de ligação após a criação da atividade."),
    ).toBeInTheDocument();
  });

  it("Continuar sem título mostra o erro da Clint e não continua", async () => {
    const { user, aoContinuar } = abrirNova();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Campo obrigatório*")).toBeInTheDocument();
    expect(aoContinuar).not.toHaveBeenCalled();
  });

  it("Continuar com título entrega a atividade (não listada, tarefa, 1 dia) com id novo", async () => {
    const { user, aoContinuar } = abrirNova();
    await user.type(screen.getByRole("textbox", { name: "Título" }), "  Validar ICP  ");
    await user.click(screen.getByRole("button", { name: /Atividade não listada/ }));
    await user.click(screen.getByRole("button", { name: "Tarefa" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(aoContinuar).toHaveBeenCalledWith({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      etapaId: "e1",
      titulo: "Validar ICP",
      tipo: "tarefa",
      visibilidade: "nao_listada",
      prazoMinutos: 1440,
      conteudo: null,
    });
  });
});

describe("prazo da atividade", () => {
  function abrirPrazo(minutos = 1440) {
    const aoMudar = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<PrazoDaAtividade minutos={minutos} aoMudar={aoMudar} />);
    return { user, aoMudar };
  }

  it("o atalho 'Em 3 dias' grava 4320 minutos e fecha", async () => {
    const { user, aoMudar } = abrirPrazo();
    await user.click(screen.getByRole("button", { name: "Data da atividade" }));
    expect(screen.getByText("Criar atividade após entrar na etapa em:")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Em 3 dias" }));
    expect(aoMudar).toHaveBeenCalledWith(4320);
  });

  it("número fora de 1 a 999 desliga o Salvar; 2 horas grava 120", async () => {
    const { user, aoMudar } = abrirPrazo(120);
    await user.click(screen.getByRole("button", { name: "Data da atividade" }));
    const numero = screen.getByRole("spinbutton", { name: "Quantidade" });
    expect(numero).toHaveValue(2);
    await user.clear(numero);
    await user.type(numero, "0");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await user.clear(numero);
    await user.type(numero, "2");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoMudar).toHaveBeenCalledWith(120);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-janelas.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 4: O ícone do tipo**

Create `components/escale/atividades/IconeDoTipo.tsx`:

```tsx
"use client";
import type { SVGProps } from "react";

import type { TipoDeAtividade } from "@/lib/escale/playbook/regras";
import { InstagramLogo, WhatsappLogo } from "@/lib/ui/icons";
import { Calendar, Clipboard, Mail, Phone, Watch, type LucideIcon } from "@/lib/ui/icons-da-casca";

/**
 * O ÍCONE DE CADA TIPO DE ATIVIDADE (fork Escale, Fase 1I): os 7 botões da
 * Clint (`TextTab`). WhatsApp e Instagram são logos (o lucide não tem marcas)
 * e vêm do Phosphor do original, como no card do quadro (`PecasDoCard`).
 * Reunião é o relógio de pulso (FiWatch, no código da Clint).
 */
const ICONES: Record<Exclude<TipoDeAtividade, "whatsapp" | "instagram">, LucideIcon> = {
  ligacao: Phone,
  email: Mail,
  agendamento: Calendar,
  tarefa: Clipboard,
  reuniao: Watch,
};

export function IconeDoTipo({
  tipo,
  tamanho = 16,
  className,
}: {
  tipo: TipoDeAtividade;
  tamanho?: number;
  className?: string;
}) {
  if (tipo === "whatsapp") return <WhatsappLogo size={tamanho} aria-hidden className={className} />;
  if (tipo === "instagram") return <InstagramLogo size={tamanho} aria-hidden className={className} />;
  const Icone = ICONES[tipo];
  return <Icone size={tamanho} aria-hidden className={className} />;
}

/** O celular cortado da Clint (Tabler device-mobile-off), traço 2: não há dispositivo para enviar. */
export function CelularDesligado({ tamanho = 20, ...props }: { tamanho?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M7.159 3.185c.256 -.119 .54 -.185 .841 -.185h8a2 2 0 0 1 2 2v9m0 4v1a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-13" />
      <path d="M11 4h2" />
      <path d="M3 3l18 18" />
      <path d="M12 17v.01" />
    </svg>
  );
}
```

- [ ] **Step 5: O prazo**

Create `components/escale/configuracoes/playbook/PrazoDaAtividade.tsx`:

```tsx
"use client";
import { useState } from "react";

import { BotaoDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  ATALHOS_DO_PRAZO,
  UNIDADES_DO_PRAZO,
  minutosDoPrazo,
  prazoPorUnidade,
  quantidadeDoPrazoValida,
  textoDoPrazo,
  type UnidadeDoPrazo,
} from "@/lib/escale/playbook/regras";

/**
 * O PRAZO DA ATIVIDADE (fork Escale, Fase 1I; print 024): a caixa "1 dia(s)"
 * abre o popover da Clint ("Criar atividade após entrar na etapa em:"), com o
 * número de 1 a 999, a unidade, os atalhos e Cancelar/Salvar. O valor é em
 * minutos (`time_to_check`).
 */
export function PrazoDaAtividade({
  minutos,
  aoMudar,
  desabilitado = false,
}: {
  minutos: number;
  aoMudar: (minutos: number) => void;
  desabilitado?: boolean;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [quantidade, setQuantidade] = useState("1");
  const [unidade, setUnidade] = useState<UnidadeDoPrazo>("dia");
  const numero = Number(quantidade);
  const valido = quantidadeDoPrazoValida(numero);

  const abrir = (sim: boolean) => {
    if (sim) {
      const p = prazoPorUnidade(minutos);
      setQuantidade(String(p.quantidade || 1));
      setUnidade(p.unidade);
    }
    setAberto(sim);
  };
  const gravar = (valor: number) => {
    aoMudar(valor);
    setAberto(false);
  };

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={desabilitado}
          title={desabilitado ? t("Em breve") : undefined}
          aria-label={t("Data da atividade")}
          className="h-10 w-[175px] rounded-[4px] bg-casca-raia text-[14px] text-casca-texto transition-colors hover:bg-casca-marca-suave disabled:cursor-not-allowed disabled:opacity-60"
        >
          {textoDoPrazo(minutos, t)}
        </button>
      </PopoverTrigger>
      <PainelSuspenso className="w-[320px] p-4">
        <p className="mb-3 text-[13px] font-medium text-casca-texto">
          {t("Criar atividade após entrar na etapa em:")}
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            aria-label={t("Quantidade")}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="h-9 w-20 rounded-[4px] border-0 bg-casca-raia px-3 text-[13px] text-casca-texto outline-hidden focus:ring-2 focus:ring-casca-marca"
          />
          <SeletorDaCasca
            aria-label={t("Unidade")}
            aparencia="janela"
            valor={unidade}
            aoMudar={(v) => v && setUnidade(v)}
            opcoes={UNIDADES_DO_PRAZO.map((u) => ({ valor: u.unidade, rotulo: t(u.rotulo) }))}
            className="h-9 flex-1"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ATALHOS_DO_PRAZO.map((a) => (
            <button
              key={a.rotulo}
              type="button"
              onClick={() => gravar(a.minutos)}
              className="rounded-full border border-casca-borda px-2.5 py-1 text-[11px] text-casca-texto hover:bg-casca-raia"
            >
              {t(a.rotulo)}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <BotaoDaJanela variante="cancelar" onClick={() => setAberto(false)}>
            {t("Cancelar")}
          </BotaoDaJanela>
          <BotaoDaJanela
            variante="salvar"
            disabled={!valido}
            title={valido ? undefined : t("Digite um número de 1 a 999.")}
            onClick={() => gravar(minutosDoPrazo(numero, unidade))}
          >
            {t("Salvar")}
          </BotaoDaJanela>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
```

- [ ] **Step 6: A janela "Nova atividade" da origem**

Create `components/escale/configuracoes/playbook/JanelaNovaAtividade.tsx`:

```tsx
"use client";
import { useState } from "react";

import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import {
  AVISO_DO_TIPO,
  EXEMPLO_DO_TITULO,
  PRAZO_PADRAO_EM_MINUTOS,
  ROTULO_DO_TIPO,
  TIPOS_DE_ATIVIDADE,
  type AtividadeDoPlaybook,
  type TipoDeAtividade,
  type VisibilidadeDaAtividade,
} from "@/lib/escale/playbook/regras";
import { CheckCircle2, Clipboard, Clock, EyeOff, LayoutPanelLeft } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { PrazoDaAtividade } from "./PrazoDaAtividade";

/**
 * "NOVA ATIVIDADE" DA ORIGEM (fork Escale, Fase 1I; print 024; P7).
 *
 * Título, os três cartões da Clint (o "dependente" é "Em breve", Q14), o tipo
 * (7 botões), o aviso verde do tipo e o prazo depois da entrada na etapa.
 * "Continuar" só entrega a atividade ao rascunho: nada vai ao servidor até
 * "Salvar na origem" (como na Clint).
 */
export function JanelaNovaAtividade({
  aberta,
  etapa,
  aoFechar,
  aoContinuar,
}: {
  aberta: boolean;
  etapa: { id: string; name: string };
  aoFechar: () => void;
  aoContinuar: (nova: Omit<AtividadeDoPlaybook, "ordem">) => void;
}) {
  const t = useT();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoDeAtividade>("whatsapp");
  const [visibilidade, setVisibilidade] = useState<VisibilidadeDaAtividade>("padrao");
  const [prazo, setPrazo] = useState(PRAZO_PADRAO_EM_MINUTOS);
  const [erro, setErro] = useState(false);

  const continuar = () => {
    if (!titulo.trim()) {
      setErro(true);
      return;
    }
    aoContinuar({
      id: crypto.randomUUID(),
      etapaId: etapa.id,
      titulo: titulo.trim(),
      tipo,
      visibilidade,
      prazoMinutos: prazo,
      conteudo: null,
    });
  };

  const cartoes: Array<{
    valor: VisibilidadeDaAtividade | "dependente";
    titulo: string;
    texto: string;
    icone: typeof Clipboard;
  }> = [
    {
      valor: "padrao",
      titulo: t("Atividade padrão"),
      texto: t("Crie uma atividade padrão com data e horário definido"),
      icone: Clipboard,
    },
    {
      valor: "nao_listada",
      titulo: t("Atividade não listada"),
      texto: t("Crie uma atividade que não será listada na visão de atividades"),
      icone: EyeOff,
    },
    {
      valor: "dependente",
      titulo: t("Atividade dependente"),
      texto: t("A atividade só será listada na visão de atividades após conclusão da atividade relacionada"),
      icone: Clock,
    },
  ];

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(90vw,1140px)] gap-0 p-0">
      <div className="border-b border-casca-borda px-6 py-5">
        <DialogTitle className="text-[17px] font-normal text-casca-texto">{t("Nova atividade")}</DialogTitle>
      </div>
      <div className="grid gap-5 px-6 py-5">
        <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] text-casca-meta uppercase">
          <LayoutPanelLeft size={14} aria-hidden />
          {etapa.name}
        </p>

        <label className="grid gap-2">
          <span className="text-[13px] font-semibold text-casca-texto">
            {t("Título")}
            <span aria-hidden className="ml-0.5 text-casca-alerta">
              *
            </span>
          </span>
          <input
            type="text"
            aria-label={t("Título")}
            value={titulo}
            maxLength={255}
            placeholder={t(EXEMPLO_DO_TITULO[tipo])}
            onChange={(e) => {
              setTitulo(e.target.value);
              setErro(false);
            }}
            className="h-10 w-full rounded-[4px] border-0 bg-casca-raia px-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
          />
          {erro ? <span className="text-[12px] text-casca-alerta">{t("Campo obrigatório*")}</span> : null}
        </label>

        <div className="flex justify-center gap-5">
          {cartoes.map((c) => {
            const emBreve = c.valor === "dependente";
            const escolhido = c.valor === visibilidade;
            return (
              <button
                key={c.valor}
                type="button"
                disabled={emBreve}
                title={emBreve ? t("Em breve") : undefined}
                aria-pressed={emBreve ? undefined : escolhido}
                onClick={() => !emBreve && setVisibilidade(c.valor as VisibilidadeDaAtividade)}
                className={cn(
                  "relative flex h-[126px] w-[375px] flex-col items-center justify-center gap-1 rounded-[4px] border px-4 text-center",
                  escolhido ? "border-casca-marca" : "border-casca-borda",
                  "disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {emBreve ? (
                  <span className="absolute top-3 left-3 rounded-[4px] bg-casca-marca-suave px-1.5 py-0.5 text-[10px] font-semibold text-casca-marca">
                    {t("EM BREVE")}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "flex items-center gap-2 text-[14px] font-semibold",
                    escolhido ? "text-casca-marca" : "text-casca-texto",
                  )}
                >
                  <c.icone size={16} aria-hidden />
                  {c.titulo}
                </span>
                <span className="text-[13px] text-casca-texto-2">{c.texto}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-2">
          <span className="text-[13px] font-semibold text-casca-texto">
            {t("Tipo")}
            <span aria-hidden className="ml-0.5 text-casca-alerta">
              *
            </span>
          </span>
          <div className="flex gap-3">
            {TIPOS_DE_ATIVIDADE.map((x) => (
              <button
                key={x}
                type="button"
                aria-label={t(ROTULO_DO_TIPO[x])}
                title={t(ROTULO_DO_TIPO[x])}
                aria-pressed={x === tipo}
                onClick={() => setTipo(x)}
                className={cn(
                  "grid h-10 w-11 place-items-center rounded-[6px] border",
                  x === tipo
                    ? "border-casca-marca bg-casca-marca text-white"
                    : "border-casca-borda text-casca-marca hover:bg-casca-raia",
                )}
              >
                <IconeDoTipo tipo={x} tamanho={18} />
              </button>
            ))}
          </div>
        </div>

        <p className="flex h-14 items-center gap-3 rounded-[4px] border border-(--escale-aviso-ok-borda) px-5 text-[13px] font-medium text-(--escale-aviso-ok-texto)">
          <CheckCircle2 size={18} aria-hidden />
          {t(AVISO_DO_TIPO[tipo])}
        </p>

        <div className="grid gap-2">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-casca-texto">
            {t("Data da atividade")}
            <span aria-hidden className="text-casca-alerta">
              *
            </span>
            <AjudaDaCasca texto={t("O cálculo de tempo da atividade é com base na entrada do negócio na etapa.")} />
          </span>
          <div className="flex items-center gap-3">
            <PrazoDaAtividade minutos={prazo} aoMudar={setPrazo} />
            <span className="text-[14px] text-casca-texto">{t("após entrar na etapa")}</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end border-t border-casca-borda px-6 py-4">
        <button
          type="button"
          onClick={continuar}
          className="h-11 rounded-[6px] bg-casca-marca px-6 text-[15px] font-semibold text-white hover:bg-casca-marca-forte"
        >
          {t("Continuar")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-janelas.test.tsx tests/unit/escale-ui-icones-da-casca.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/atividades/IconeDoTipo.tsx components/escale/configuracoes/playbook/*.tsx tests/unit/escale-playbook-janelas.test.tsx && corepack pnpm eslint components/escale/atividades components/escale/configuracoes/playbook`
Expected: PASS.
- **Título da janela:** se o `getByRole("dialog", { name: "Nova atividade" })` não achar o nome, confira se a `JanelaDaCasca` com `className` (1H) ainda renderiza o `DialogTitle` dos filhos dentro do `Content`. Precisa renderizar, e a 1H usa o mesmo padrão na `JanelaDeNota`.
- **Nomes das cercas:** se `controle-decorativo` ou `tailwind-tokens` tiverem outro nome, ache com `ls tests/unit | grep -E "controle|tailwind"`.

- [ ] **Step 8: Commit**

```bash
git add lib/ui/icons-da-casca.ts app/escale-tema.css components/escale/atividades/IconeDoTipo.tsx components/escale/configuracoes/playbook/PrazoDaAtividade.tsx components/escale/configuracoes/playbook/JanelaNovaAtividade.tsx tests/unit/escale-playbook-janelas.test.tsx
git commit -m "feat(escale): janela Nova atividade da origem e o prazo do playbook (Fase 1I)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: As variáveis e a janela "Configurações de atividades"

**Abra antes:** o print 024 (a janela "Configurações de atividades" não tem print: prints que faltam, 3 e 4).

**Files:**
- Create: `lib/escale/playbook/variaveis.ts`, `components/escale/configuracoes/playbook/VariaveisDaMensagem.tsx`, `components/escale/configuracoes/playbook/JanelaConfiguracoesDeAtividades.tsx`, `tests/unit/escale-playbook-variaveis.test.ts`, `tests/unit/escale-playbook-configuracoes-de-atividades.test.tsx`
- Modify: `lib/escale/playbook/regras.ts` (acrescenta `VAZIO_DO_CONTEUDO`)

**Interfaces:**
- Consumes: Task 1; Task 4 (`IconeDoTipo`, `PrazoDaAtividade`).
- Produces:
  - `VARIAVEIS_DA_MENSAGEM`, `CampoDaVariavel`, `chaveDaVariavel`, `gruposDeVariaveis(campos)`, `DadosDasVariaveis` (com `campos?`), `resolverVariaveis(texto, dados)`, `filtrarVariaveis(busca, t, campos?)`, `inserirNoCursor(texto, inicio, fim, variavel)`;
  - `VAZIO_DO_CONTEUDO: Record<TipoDeAtividade, string>`;
  - `VariaveisDaMensagem({ aoEscolher, campos? })`;
  - `JanelaConfiguracoesDeAtividades({ aberta, etapas, atividades, escolhidaId, aoEscolher, aoAtualizar, aoNova, aoFechar, campos? })`.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-playbook-variaveis.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  filtrarVariaveis,
  inserirNoCursor,
  resolverVariaveis,
  type DadosDasVariaveis,
} from "@/lib/escale/playbook/variaveis";

/** FORK ESCALE · Fase 1I (P10): as variáveis da mensagem, no formato da Clint. */
const t = (s: string) => s;
const DADOS: DadosDasVariaveis = {
  contato: { nome: "Auta Graziela Souza", email: "auta@x.com", telefone: "+5543999990000" },
  negocio: { etapa: "1. Entrada Lead", valor: "R$ 1.500,00" },
  usuario: { nome: "Régis Junior", email: "regis@escaleia.com" },
  empresa: { nome: "Escale IA" },
};

describe("resolverVariaveis", () => {
  it("troca as variáveis conhecidas", () => {
    expect(
      resolverVariaveis(
        "Olá [CONTACT.FIRST_NAME] [CONTACT.LAST_NAME], sou [USER.FIRST_NAME] da [ORGANIZATION.NAME] ([DEAL.STAGE], [DEAL.VALUE])",
        DADOS,
      ),
    ).toBe("Olá Auta Graziela Souza, sou Régis da Escale IA (1. Entrada Lead, R$ 1.500,00)");
  });
  it("sem valor vira vazio; desconhecida fica como está", () => {
    const vazio = { ...DADOS, contato: { nome: null, email: null, telefone: null } };
    expect(resolverVariaveis("Oi [CONTACT.FIRST_NAME]!", vazio)).toBe("Oi !");
    expect(resolverVariaveis("Link: [DEAL.PAYMENT_PIX_URL]", DADOS)).toBe("Link: [DEAL.PAYMENT_PIX_URL]");
  });
  it("campos personalizados: o valor que vier em `campos`, pela variável inteira", () => {
    expect(
      resolverVariaveis("Plano [DEAL.PLANO_2] / [CONTACT.CPF]", {
        ...DADOS,
        campos: { "[DEAL.PLANO_2]": "Ouro", "[CONTACT.CPF]": "" },
      }),
    ).toBe("Plano Ouro / ");
  });
});

describe("filtrarVariaveis e inserirNoCursor", () => {
  it("a busca filtra pelo rótulo, sem acento, e some com o grupo vazio", () => {
    const grupos = filtrarVariaveis("sobrenome", t);
    expect(grupos.map((g) => g.grupo)).toEqual(["Contato"]);
    expect(grupos[0]?.itens.map((v) => v.nome)).toEqual(["[CONTACT.LAST_NAME]"]);
    expect(filtrarVariaveis("negocio", t)[0]?.grupo).toBe("Negócio");
    expect(filtrarVariaveis("zzz", t)).toEqual([]);
  });
  it("os campos personalizados entram em Negócio e em Contato, com a chave em maiúsculas", () => {
    const grupos = filtrarVariaveis("plano", t, [{ chave: "plano-escolhido", rotulo: "Plano escolhido" }]);
    expect(grupos.map((g) => [g.grupo, g.itens.map((v) => v.nome)])).toEqual([
      ["Negócio", ["[DEAL.PLANO_ESCOLHIDO]"]],
      ["Contato", ["[CONTACT.PLANO_ESCOLHIDO]"]],
    ]);
  });
  it("insere no cursor (troca a seleção) e devolve o cursor depois da variável", () => {
    expect(inserirNoCursor("Olá !", 4, 4, "[CONTACT.FIRST_NAME]")).toEqual({
      texto: "Olá [CONTACT.FIRST_NAME]!",
      cursor: 24,
    });
    expect(inserirNoCursor("Olá XX!", 4, 6, "[X.Y]")).toEqual({ texto: "Olá [X.Y]!", cursor: 9 });
  });
});
```

Create `tests/unit/escale-playbook-configuracoes-de-atividades.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { JanelaConfiguracoesDeAtividades } from "@/components/escale/configuracoes/playbook/JanelaConfiguracoesDeAtividades";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AtividadeDoPlaybook } from "@/lib/escale/playbook/regras";

/** FORK ESCALE · Fase 1I (D10): a janela "Configurações de atividades". */
const ETAPAS = [
  { id: "e1", name: "1. Entrada Lead" },
  { id: "e2", name: "2. Em atendimento" },
];
const atv = (id: string, extra: Partial<AtividadeDoPlaybook> = {}): AtividadeDoPlaybook => ({
  id,
  etapaId: "e1",
  titulo: `Atividade ${id}`,
  tipo: "whatsapp",
  visibilidade: "padrao",
  prazoMinutos: 1440,
  ordem: 0,
  conteudo: null,
  ...extra,
});
const LISTA = [atv("a1"), atv("a2", { tipo: "ligacao", ordem: 1 }), atv("b1", { etapaId: "e2" })];

function abrir(escolhidaId = "a1") {
  const props = { aoEscolher: vi.fn(), aoAtualizar: vi.fn(), aoNova: vi.fn(), aoFechar: vi.fn() };
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <TooltipProvider>
      <JanelaConfiguracoesDeAtividades
        aberta
        etapas={ETAPAS}
        atividades={LISTA}
        escolhidaId={escolhidaId}
        campos={[{ chave: "proposta", rotulo: "Proposta" }]}
        {...props}
      />
    </TooltipProvider>,
  );
  return { user, ...props };
}

describe("Configurações de atividades", () => {
  it("lista as atividades da etapa da escolhida e mostra a escolhida no editor", () => {
    abrir();
    const janela = screen.getByRole("dialog", { name: "Configurações de atividades" });
    const lista = within(janela).getByRole("list", { name: "Atividades da etapa" });
    expect(within(lista).getAllByRole("button").map((b) => b.textContent)).toEqual(["Atividade a1", "Atividade a2"]);
    expect(within(lista).getByRole("button", { name: "Atividade a1" })).toHaveAttribute("aria-pressed", "true");
    expect(within(janela).getByRole("textbox", { name: "Título" })).toHaveValue("Atividade a1");
    expect(within(janela).getByRole("textbox", { name: "Conteúdo da atividade" })).toHaveAttribute(
      "placeholder",
      "Clique aqui para adicionar o conteúdo da mensagem.",
    );
  });

  it("escolher outra e criar nova avisam quem abriu", async () => {
    const { user, aoEscolher, aoNova } = abrir();
    await user.click(screen.getByRole("button", { name: "Atividade a2" }));
    expect(aoEscolher).toHaveBeenCalledWith("a2");
    await user.click(screen.getByRole("button", { name: "Nova atividade" }));
    expect(aoNova).toHaveBeenCalledWith("e1");
  });

  it("a variável entra no cursor e 'Atualizar' grava título, conteúdo e prazo", async () => {
    const { user, aoAtualizar } = abrir();
    const caixa = screen.getByRole("textbox", { name: "Conteúdo da atividade" });
    await user.type(caixa, "Olá !");
    (caixa as HTMLTextAreaElement).setSelectionRange(4, 4);
    await user.click(screen.getByRole("button", { name: "Adicionar variáveis" }));
    await user.type(screen.getByRole("textbox", { name: "Buscar variável" }), "primeiro");
    const contato = screen.getByRole("group", { name: "Contato" });
    await user.click(within(contato).getByRole("button", { name: /Primeiro nome/ }));
    expect(caixa).toHaveValue("Olá [CONTACT.FIRST_NAME]!");
    await user.clear(screen.getByRole("textbox", { name: "Título" }));
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Entrada de Lead");
    await user.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(aoAtualizar).toHaveBeenCalledWith("a1", {
      titulo: "Entrada de Lead",
      conteudo: "Olá [CONTACT.FIRST_NAME]!",
      prazoMinutos: 1440,
    });
  });

  it("o campo personalizado da origem entra nas variáveis de Negócio", async () => {
    const { user } = abrir();
    await user.click(screen.getByRole("button", { name: "Adicionar variáveis" }));
    await user.type(screen.getByRole("textbox", { name: "Buscar variável" }), "proposta");
    const negocio = screen.getByRole("group", { name: "Negócio" });
    await user.click(within(negocio).getByRole("button", { name: /Proposta/ }));
    expect(screen.getByRole("textbox", { name: "Conteúdo da atividade" })).toHaveValue("[DEAL.PROPOSTA]");
  });

  it("título vazio desliga o Atualizar", async () => {
    const { user } = abrir();
    await user.clear(screen.getByRole("textbox", { name: "Título" }));
    expect(screen.getByRole("button", { name: "Atualizar" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-variaveis.test.ts tests/unit/escale-playbook-configuracoes-de-atividades.test.tsx`
Expected: FAIL (os módulos não existem).

- [ ] **Step 3: As variáveis**

Create `lib/escale/playbook/variaveis.ts`:

```ts
/**
 * AS VARIÁVEIS DA MENSAGEM (fork Escale, Fase 1I; P10): o formato da Clint
 * (`[CONTACT.FIRST_NAME]`), com o que o Escale tem, inclusive os campos
 * personalizados do CRM (`[DEAL.<CHAVE>]` e `[CONTACT.<CHAVE>]`). A atividade guarda o
 * texto com as variáveis; a troca é feita na tela, na hora de mostrar o balão e
 * de enviar (a Clint também resolve no front). A variável sem valor vira vazio,
 * e a desconhecida (checkout, agendamento, IDs) fica como está.
 */
export interface VariavelDaMensagem {
  nome: string;
  rotulo: string;
}

export interface GrupoDeVariaveis {
  grupo: string;
  itens: readonly VariavelDaMensagem[];
}

export const VARIAVEIS_DA_MENSAGEM: readonly GrupoDeVariaveis[] = [
  {
    grupo: "Negócio",
    itens: [
      { nome: "[DEAL.STAGE]", rotulo: "Etapa" },
      { nome: "[DEAL.VALUE]", rotulo: "Valor" },
    ],
  },
  {
    grupo: "Contato",
    itens: [
      { nome: "[CONTACT.NAME]", rotulo: "Nome" },
      { nome: "[CONTACT.FIRST_NAME]", rotulo: "Primeiro nome" },
      { nome: "[CONTACT.LAST_NAME]", rotulo: "Sobrenome" },
      { nome: "[CONTACT.EMAIL]", rotulo: "Email" },
      { nome: "[CONTACT.PHONE]", rotulo: "Telefone" },
    ],
  },
  {
    grupo: "Usuário",
    itens: [
      { nome: "[USER.FIRST_NAME]", rotulo: "Primeiro nome" },
      { nome: "[USER.LAST_NAME]", rotulo: "Segundo nome" },
      { nome: "[USER.EMAIL]", rotulo: "Email" },
    ],
  },
  { grupo: "Empresa", itens: [{ nome: "[ORGANIZATION.NAME]", rotulo: "Nome da empresa" }] },
];

/** Um campo personalizado do CRM (`settings.fields` da origem): a chave e o rótulo. */
export interface CampoDaVariavel {
  chave: string;
  rotulo: string;
}

/** A chave do campo no formato da Clint (`[DEAL.<CHAVE>]`): maiúsculas, e o que não é letra, número ou _ vira _. */
export const chaveDaVariavel = (chave: string) => chave.toUpperCase().replace(/[^A-Z0-9_]/g, "_");

/** Os grupos fixos mais os campos personalizados: em "Negócio" (valor do negócio) e em "Contato" (valor do contato). */
export function gruposDeVariaveis(campos: readonly CampoDaVariavel[] = []): GrupoDeVariaveis[] {
  const doCampo = (entidade: "DEAL" | "CONTACT") =>
    campos.map((c) => ({ nome: `[${entidade}.${chaveDaVariavel(c.chave)}]`, rotulo: c.rotulo }));
  return VARIAVEIS_DA_MENSAGEM.map((g) =>
    g.grupo === "Negócio"
      ? { ...g, itens: [...g.itens, ...doCampo("DEAL")] }
      : g.grupo === "Contato"
        ? { ...g, itens: [...g.itens, ...doCampo("CONTACT")] }
        : g,
  );
}

export interface DadosDasVariaveis {
  contato: { nome: string | null; email: string | null; telefone: string | null };
  negocio: { etapa: string | null; valor: string | null };
  usuario: { nome: string | null; email: string | null };
  empresa: { nome: string | null };
  /** Os campos personalizados, já em texto, pela variável inteira (`"[DEAL.PLANO]": "Ouro"`). */
  campos?: Readonly<Record<string, string>>;
}

const partes = (nome: string | null) => (nome ?? "").trim().split(/\s+/).filter(Boolean);

export function resolverVariaveis(texto: string, d: DadosDasVariaveis): string {
  const contato = partes(d.contato.nome);
  const usuario = partes(d.usuario.nome);
  const valores: Record<string, string> = {
    ...(d.campos ?? {}),
    "[DEAL.STAGE]": d.negocio.etapa ?? "",
    "[DEAL.VALUE]": d.negocio.valor ?? "",
    "[CONTACT.NAME]": contato.join(" "),
    "[CONTACT.FIRST_NAME]": contato[0] ?? "",
    "[CONTACT.LAST_NAME]": contato.slice(1).join(" "),
    "[CONTACT.EMAIL]": d.contato.email ?? "",
    "[CONTACT.PHONE]": d.contato.telefone ?? "",
    "[USER.FIRST_NAME]": usuario[0] ?? "",
    "[USER.LAST_NAME]": usuario.slice(1).join(" "),
    "[USER.EMAIL]": d.usuario.email ?? "",
    "[ORGANIZATION.NAME]": d.empresa.nome ?? "",
  };
  return texto.replace(/\[[A-Z0-9_]+(?:\.[A-Z0-9_]+)+\]/g, (v) => (v in valores ? valores[v]! : v));
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filtrarVariaveis(
  busca: string,
  t: (s: string) => string,
  campos: readonly CampoDaVariavel[] = [],
): GrupoDeVariaveis[] {
  const termo = semAcento(busca.trim());
  const grupos = gruposDeVariaveis(campos);
  if (!termo) return grupos;
  return grupos.map((g) => ({
    grupo: g.grupo,
    itens: g.itens.filter(
      (v) => semAcento(t(v.rotulo)).includes(termo) || semAcento(t(g.grupo)).includes(termo),
    ),
  })).filter((g) => g.itens.length > 0);
}

export function inserirNoCursor(
  texto: string,
  inicio: number,
  fim: number,
  variavel: string,
): { texto: string; cursor: number } {
  const a = Math.max(0, Math.min(inicio, texto.length));
  const b = Math.max(a, Math.min(fim, texto.length));
  return { texto: texto.slice(0, a) + variavel + texto.slice(b), cursor: a + variavel.length };
}
```

Em `lib/escale/playbook/regras.ts`, logo depois de `AVISO_DO_TIPO`, acrescente:

```ts
/** O que a caixa do conteúdo mostra vazia (Clint: editores por tipo, `TextTab`). */
export const VAZIO_DO_CONTEUDO: Record<TipoDeAtividade, string> = {
  whatsapp: "Clique aqui para adicionar o conteúdo da mensagem.",
  instagram: "Clique aqui para adicionar o conteúdo da mensagem.",
  ligacao: "Adicione o seu script",
  email: "Adicione o seu texto",
  agendamento: "Adicione o seu texto",
  tarefa: "Adicione o seu texto",
  reuniao: "Adicione o seu texto",
};
```

- [ ] **Step 4: O popover "Variáveis"**

Create `components/escale/configuracoes/playbook/VariaveisDaMensagem.tsx`:

```tsx
"use client";
import { useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { filtrarVariaveis, type CampoDaVariavel } from "@/lib/escale/playbook/variaveis";
import { Plus } from "@/lib/ui/icons-da-casca";

/** "ADICIONAR VARIÁVEIS" (fork Escale, Fase 1I; P10): o popover da Clint, com busca e os grupos. */
export function VariaveisDaMensagem({
  aoEscolher,
  campos = [],
}: {
  aoEscolher: (nome: string) => void;
  campos?: readonly CampoDaVariavel[];
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const grupos = filtrarVariaveis(busca, t, campos);

  const mudar = (sim: boolean) => {
    setAberto(sim);
    if (!sim) setBusca("");
  };

  return (
    <Popover open={aberto} onOpenChange={mudar}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-[13px] font-medium text-casca-marca hover:underline"
        >
          <Plus size={14} aria-hidden />
          {t("Adicionar variáveis")}
        </button>
      </PopoverTrigger>
      <PainelSuspenso className="w-[280px] p-0">
        <p className="border-b border-casca-borda px-4 py-3 text-[13px] font-semibold text-casca-texto">
          {t("Variáveis")}
        </p>
        <div className="p-3">
          <input
            type="text"
            aria-label={t("Buscar variável")}
            placeholder={t("Buscar variável")}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 w-full rounded-[4px] border-0 bg-casca-raia px-3 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
          />
        </div>
        <div className="max-h-[260px] overflow-y-auto pb-2">
          {grupos.length === 0 ? (
            <p className="px-4 py-3 text-[12px] text-casca-suave">{t("Nenhuma variável encontrada")}</p>
          ) : (
            grupos.map((g) => (
              <div key={g.grupo} role="group" aria-label={t(g.grupo)}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-[0.1em] text-casca-meta uppercase">
                  {t(g.grupo)}
                </p>
                {g.itens.map((v) => (
                  <button
                    key={v.nome}
                    type="button"
                    onClick={() => {
                      aoEscolher(v.nome);
                      mudar(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 px-4 py-1.5 text-left text-[12px] text-casca-texto hover:bg-casca-raia"
                  >
                    <span>{t(v.rotulo)}</span>
                    <span className="truncate text-[10px] text-casca-meta">{v.nome}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
```

- [ ] **Step 5: A janela "Configurações de atividades"**

Create `components/escale/configuracoes/playbook/JanelaConfiguracoesDeAtividades.tsx`:

```tsx
"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import {
  MAX_CONTEUDO_DA_ATIVIDADE,
  VAZIO_DO_CONTEUDO,
  atividadesDaEtapa,
  type AtividadeDoPlaybook,
} from "@/lib/escale/playbook/regras";
import { inserirNoCursor, type CampoDaVariavel } from "@/lib/escale/playbook/variaveis";
import { Plus } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { PrazoDaAtividade } from "./PrazoDaAtividade";
import { VariaveisDaMensagem } from "./VariaveisDaMensagem";

type Mudanca = Partial<Omit<AtividadeDoPlaybook, "id" | "ordem">>;

/**
 * "CONFIGURAÇÕES DE ATIVIDADES" (fork Escale, Fase 1I; D10, P9). À esquerda, a
 * etapa ("Selecionar Etapa"), as atividades dela e "+ Nova atividade"; à
 * direita, o editor da escolhida: título, o texto (mensagem, roteiro ou
 * instrução) com "Adicionar variáveis", o prazo e "Atualizar". "Atualizar" só
 * muda o rascunho; o banco só recebe no "Salvar na origem".
 */
export function JanelaConfiguracoesDeAtividades({
  aberta,
  etapas,
  atividades,
  escolhidaId,
  aoEscolher,
  aoAtualizar,
  aoNova,
  aoFechar,
  campos = [],
}: {
  aberta: boolean;
  etapas: readonly { id: string; name: string }[];
  atividades: readonly AtividadeDoPlaybook[];
  escolhidaId: string;
  aoEscolher: (id: string) => void;
  aoAtualizar: (id: string, mudanca: Mudanca) => void;
  aoNova: (etapaId: string) => void;
  aoFechar: () => void;
  /** Os campos personalizados da origem, para "Adicionar variáveis". */
  campos?: readonly CampoDaVariavel[];
}) {
  const t = useT();
  const escolhida = atividades.find((a) => a.id === escolhidaId) ?? null;
  const [etapaVista, setEtapaVista] = useState(escolhida?.etapaId ?? etapas[0]?.id ?? "");
  const daEtapa = atividadesDaEtapa(atividades, etapaVista);

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(92vw,1140px)] gap-0 p-0">
      <div className="border-b border-casca-borda px-6 py-5">
        <DialogTitle className="text-[17px] font-normal text-casca-texto">
          {t("Configurações de atividades")}
        </DialogTitle>
      </div>
      <div className="grid h-[560px] grid-cols-[300px_1fr]">
        <aside className="flex min-h-0 flex-col border-r border-casca-borda">
          <div className="p-4">
            <SeletorDaCasca
              aria-label={t("Selecionar Etapa")}
              aparencia="janela"
              valor={etapaVista}
              aoMudar={(v) => v && setEtapaVista(v)}
              opcoes={etapas.map((e) => ({ valor: e.id, rotulo: e.name }))}
            />
          </div>
          <ul aria-label={t("Atividades da etapa")} className="min-h-0 flex-1 overflow-y-auto">
            {daEtapa.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  aria-pressed={a.id === escolhidaId}
                  onClick={() => aoEscolher(a.id)}
                  className={cn(
                    "flex w-full items-center gap-2 border-l-[3px] px-4 py-2.5 text-left text-[13px] text-casca-texto",
                    a.id === escolhidaId ? "border-casca-marca bg-casca-raia" : "border-transparent hover:bg-casca-raia",
                  )}
                >
                  <IconeDoTipo tipo={a.tipo} tamanho={14} className="shrink-0 text-casca-marca" />
                  <span className="truncate">{a.titulo}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => aoNova(etapaVista)}
            className="flex h-12 items-center justify-center gap-1 border-t border-casca-borda text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
          >
            <Plus size={14} aria-hidden />
            {t("Nova atividade")}
          </button>
        </aside>
        {escolhida ? (
          <EditorDaAtividade
            key={escolhida.id}
            atividade={escolhida}
            campos={campos}
            aoAtualizar={(m) => aoAtualizar(escolhida.id, m)}
          />
        ) : (
          <div />
        )}
      </div>
    </JanelaDaCasca>
  );
}

function EditorDaAtividade({
  atividade,
  campos,
  aoAtualizar,
}: {
  atividade: AtividadeDoPlaybook;
  campos: readonly CampoDaVariavel[];
  aoAtualizar: (m: Mudanca) => void;
}) {
  const t = useT();
  const [titulo, setTitulo] = useState(atividade.titulo);
  const [conteudo, setConteudo] = useState(atividade.conteudo ?? "");
  const [prazo, setPrazo] = useState(atividade.prazoMinutos);
  const caixa = useRef<HTMLTextAreaElement>(null);
  const tituloValido = titulo.trim().length > 0;

  const inserir = (nome: string) => {
    const el = caixa.current;
    const r = inserirNoCursor(conteudo, el?.selectionStart ?? conteudo.length, el?.selectionEnd ?? conteudo.length, nome);
    setConteudo(r.texto.slice(0, MAX_CONTEUDO_DA_ATIVIDADE));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(r.cursor, r.cursor);
    });
  };

  const atualizar = () => {
    aoAtualizar({ titulo: titulo.trim(), conteudo: conteudo.trim() ? conteudo : null, prazoMinutos: prazo });
    toast.success(t("Atividade atualizada"));
  };

  return (
    <section aria-label={t("Detalhes da atividade")} className="flex min-h-0 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-casca-borda px-6">
        <IconeDoTipo tipo={atividade.tipo} tamanho={18} className="shrink-0 text-casca-marca" />
        <input
          type="text"
          aria-label={t("Título")}
          value={titulo}
          maxLength={255}
          placeholder={t("Adicione um título...")}
          onChange={(e) => setTitulo(e.target.value)}
          className="h-9 flex-1 rounded-[4px] border-0 bg-transparent px-2 text-[15px] font-medium text-casca-texto outline-hidden placeholder:text-casca-meta hover:bg-casca-raia focus:bg-casca-raia"
        />
      </header>
      <textarea
        ref={caixa}
        aria-label={t("Conteúdo da atividade")}
        value={conteudo}
        maxLength={MAX_CONTEUDO_DA_ATIVIDADE}
        placeholder={t(VAZIO_DO_CONTEUDO[atividade.tipo])}
        onChange={(e) => setConteudo(e.target.value)}
        className="min-h-0 flex-1 resize-none border-0 bg-transparent px-6 py-4 text-[13.5px] leading-6 text-casca-texto outline-hidden placeholder:text-casca-meta"
      />
      <footer className="flex h-16 shrink-0 items-center gap-3 border-t border-casca-borda px-6">
        <span className="text-[13px] font-semibold text-casca-texto">{t("Data da atividade")}</span>
        <PrazoDaAtividade minutos={prazo} aoMudar={setPrazo} />
        <span className="text-[13px] text-casca-texto">{t("após entrar na etapa")}</span>
        <span className="flex-1" />
        <VariaveisDaMensagem aoEscolher={inserir} campos={campos} />
        <AjudaDaCasca texto={t("Ajuda com as atividades")} />
        <button
          type="button"
          disabled={!tituloValido}
          title={tituloValido ? undefined : t("Campo obrigatório*")}
          onClick={atualizar}
          className="h-10 rounded-[6px] bg-casca-marca px-5 text-[14px] font-semibold text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("Atualizar")}
        </button>
      </footer>
    </section>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-variaveis.test.ts tests/unit/escale-playbook-configuracoes-de-atividades.test.tsx tests/unit/escale-playbook-regras.test.ts && corepack pnpm prettier --write lib/escale/playbook/variaveis.ts components/escale/configuracoes/playbook/VariaveisDaMensagem.tsx components/escale/configuracoes/playbook/JanelaConfiguracoesDeAtividades.tsx tests/unit/escale-playbook-variaveis.test.ts tests/unit/escale-playbook-configuracoes-de-atividades.test.tsx && corepack pnpm eslint lib/escale/playbook components/escale/configuracoes/playbook`
Expected: PASS.
- **Variável no cursor:** se o teste falhar porque o jsdom perdeu a seleção no clique do popover, guarde a seleção num `useRef` no `onSelect` da caixa e use esse valor em `inserir`. É o mesmo comportamento do usuário.

- [ ] **Step 7: Commit**

```bash
git add lib/escale/playbook/variaveis.ts lib/escale/playbook/regras.ts components/escale/configuracoes/playbook/VariaveisDaMensagem.tsx components/escale/configuracoes/playbook/JanelaConfiguracoesDeAtividades.tsx tests/unit/escale-playbook-variaveis.test.ts tests/unit/escale-playbook-configuracoes-de-atividades.test.tsx
git commit -m "feat(escale): variáveis e a janela Configurações de atividades do playbook (Fase 1I)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: A aba Etapas e atividades, o "Salvar na origem" e a janela aberta na aba certa

**Abra antes:** os prints F20, F21, 030 e 009.

**Files:**
- Create: `components/escale/configuracoes/playbook/ItemDoPlaybook.tsx`, `tests/unit/escale-playbook-aba-de-etapas.test.tsx`
- Modify:
  - `components/escale/configuracoes/AbaDeEtapas.tsx` (reescrita) e `components/escale/configuracoes/JanelaDaOrigem.tsx`;
  - `lib/escale/configuracoes/abrir.ts`, `components/escale/origens/PainelOrigens.tsx` (linha 149) e `components/escale/origens/JanelasDeOrigens.tsx`;
  - testes `tests/unit/escale-janela-da-origem.test.tsx` e `tests/unit/escale-engrenagem-da-origem.test.tsx`.

**Interfaces:**
- Consumes: Tasks 1, 3, 4 e 5.
- Produces:
  - `AbaDaOrigem = "geral" | "etapas"`;
  - `abrirConfiguracoesDaOrigem(id, aba = "geral")`;
  - `useEngrenagemDaOrigem(id, podeConfigurar, aba = "geral")`;
  - `useAoAbrirConfiguracoesDaOrigem((id, aba) => …)`;
  - `JanelaDaOrigem` com `abaInicial?: AbaDaOrigem`;
  - `AbaDeEtapas({ config, atividades, temSalvas, mudar })`.

- [ ] **Step 1: O teste da aba (vai falhar)**

Create `tests/unit/escale-playbook-aba-de-etapas.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { AbaDeEtapas } from "@/components/escale/configuracoes/AbaDeEtapas";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import { atividadesDaEtapa, type AtividadeDoPlaybook } from "@/lib/escale/playbook/regras";

/** FORK ESCALE · Fase 1I (D10): a aba Etapas e atividades com o playbook (prints F20, F21 e 030). */
const CONFIG = {
  etapas: [
    { id: "e1", name: "1. Entrada Lead", position: 1, is_won: false, is_lost: false },
    { id: "e2", name: "2. Em atendimento", position: 2, is_won: false, is_lost: false },
    { id: "g", name: "Ganho", position: 3, is_won: true, is_lost: false },
  ],
  campos: [],
} as unknown as ConfiguracoesDaOrigem;
const atv = (n: number, extra: Partial<AtividadeDoPlaybook> = {}): AtividadeDoPlaybook => ({
  id: `a${n}`,
  etapaId: "e2",
  titulo: `Msg ${n}`,
  tipo: "whatsapp",
  visibilidade: "padrao",
  prazoMinutos: 1440,
  ordem: n,
  conteudo: null,
  ...extra,
});
const OITO = Array.from({ length: 8 }, (_, i) => atv(i + 1, i === 7 ? { prazoMinutos: 2880 } : {}));

function abrir(atividades: AtividadeDoPlaybook[] = OITO, temSalvas = true) {
  const mudar = vi.fn();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <TooltipProvider>
      <AbaDeEtapas config={CONFIG} atividades={atividades} temSalvas={temSalvas} mudar={mudar} />
    </TooltipProvider>,
  );
  return { user, mudar };
}

describe("aba Etapas e atividades com o playbook", () => {
  it("uma coluna por etapa aberta; a vazia diz 'Nenhuma atividade nessa etapa'", () => {
    abrir();
    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual([
      "1. Entrada Lead",
      "2. Em atendimento",
    ]);
    const vazia = screen.getByRole("region", { name: "1. Entrada Lead" });
    expect(within(vazia).getByText("Nenhuma atividade nessa etapa")).toBeInTheDocument();
    expect(within(vazia).getByRole("button", { name: "Nova atividade" })).toBeEnabled();
  });

  it("mostra 6, 'Ver mais' mostra as 8 e 'Ver menos' volta; a contagem recolhe a lista", async () => {
    const { user } = abrir();
    const coluna = screen.getByRole("region", { name: "2. Em atendimento" });
    expect(within(coluna).getAllByRole("listitem")).toHaveLength(6);
    await user.click(within(coluna).getByRole("button", { name: "Ver mais" }));
    expect(within(coluna).getAllByRole("listitem")).toHaveLength(8);
    await user.click(within(coluna).getByRole("button", { name: "Ver menos" }));
    expect(within(coluna).getAllByRole("listitem")).toHaveLength(6);
    const contagem = within(coluna).getByRole("button", { name: "8 Atividades nessa etapa" });
    await user.click(contagem);
    expect(contagem).toHaveAttribute("aria-expanded", "false");
    expect(within(coluna).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("o item tem o número e a letra da unidade, o título e o olho da não listada", () => {
    abrir([atv(1, { visibilidade: "nao_listada", prazoMinutos: 120 })]);
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("2");
    expect(item).toHaveTextContent("H");
    expect(within(item).getByRole("button", { name: "Msg 1" })).toBeInTheDocument();
    expect(within(item).getByRole("img", { name: "Atividade não listada" })).toBeInTheDocument();
  });

  it("as setas só aparecem entre vizinhas de mesmo prazo; a lixeira remove", async () => {
    const { user, mudar } = abrir([atv(1), atv(2), atv(3, { prazoMinutos: 2880 })]);
    const [primeira, segunda, terceira] = screen.getAllByRole("listitem");
    expect(within(primeira!).queryByRole("button", { name: "Subir" })).toBeNull();
    expect(within(primeira!).getByRole("button", { name: "Descer" })).toBeInTheDocument();
    expect(within(segunda!).queryByRole("button", { name: "Descer" })).toBeNull();
    expect(within(terceira!).queryByRole("button", { name: "Subir" })).toBeNull();
    await user.click(within(primeira!).getByRole("button", { name: "Descer" }));
    const trocar = mudar.mock.calls[0]![0] as (l: AtividadeDoPlaybook[]) => AtividadeDoPlaybook[];
    expect(atividadesDaEtapa(trocar([atv(1), atv(2), atv(3, { prazoMinutos: 2880 })]), "e2").map((a) => a.id)).toEqual([
      "a2",
      "a1",
      "a3",
    ]);
    await user.click(within(segunda!).getByRole("button", { name: "Remover atividade" }));
    const remover = mudar.mock.calls[1]![0] as (l: AtividadeDoPlaybook[]) => AtividadeDoPlaybook[];
    expect(remover([atv(1), atv(2)]).map((a) => a.id)).toEqual(["a1"]);
  });

  it("o canto: 'Origem customizada' com a dica, ou 'Nenhum modelo'; o ⋮ com os modelos 'Em breve'", async () => {
    const { user } = abrir();
    expect(screen.getByText("Origem customizada")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Origem customizada" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Opções do modelo" }));
    for (const nome of ["Escolher um modelo", "Compartilhar modelo"]) {
      expect(screen.getByRole("menuitem", { name: nome })).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("sem atividade salva: 'Nenhum modelo'", () => {
    abrir([], false);
    expect(screen.getByText("Nenhum modelo")).toBeInTheDocument();
  });

  it("'+ Nova atividade' abre a janela; Continuar põe no rascunho e abre Configurações de atividades", async () => {
    const { user, mudar } = abrir([]);
    const coluna = screen.getByRole("region", { name: "1. Entrada Lead" });
    await user.click(within(coluna).getByRole("button", { name: "Nova atividade" }));
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Entrada de Lead");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    const adicionar = mudar.mock.calls[0]![0] as (l: AtividadeDoPlaybook[]) => AtividadeDoPlaybook[];
    expect(adicionar([])).toEqual([expect.objectContaining({ etapaId: "e1", titulo: "Entrada de Lead", ordem: 0 })]);
    expect(screen.getByRole("dialog", { name: "Configurações de atividades" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-aba-de-etapas.test.tsx`
Expected: FAIL (a aba ainda é a da 1F).

- [ ] **Step 3: O item da coluna**

Create `components/escale/configuracoes/playbook/ItemDoPlaybook.tsx`:

```tsx
"use client";
import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { useT } from "@/hooks/i18n/useT";
import { seloDoPrazo, textoDoPrazo, type AtividadeDoPlaybook } from "@/lib/escale/playbook/regras";
import { ArrowDown, ArrowUp, EyeOff, Trash2 } from "@/lib/ui/icons-da-casca";

/**
 * A LINHA DA ATIVIDADE NA COLUNA DA ETAPA (fork Escale, Fase 1I; print 030):
 * o número e a letra da unidade (o `DurationBadge` da Clint: "1 D" = 1 dia), o
 * ícone do tipo, o título truncado e o olho cortado da não listada. No hover,
 * ↑↓ (só entre vizinhas de mesmo prazo) e a lixeira, sem confirmação (Clint).
 */
export function ItemDoPlaybook({
  atividade,
  podeSubir,
  podeDescer,
  aoAbrir,
  aoSubir,
  aoDescer,
  aoRemover,
}: {
  atividade: AtividadeDoPlaybook;
  podeSubir: boolean;
  podeDescer: boolean;
  aoAbrir: () => void;
  aoSubir: () => void;
  aoDescer: () => void;
  aoRemover: () => void;
}) {
  const t = useT();
  const selo = seloDoPrazo(atividade.prazoMinutos);
  const acao = "grid size-5 place-items-center rounded-[4px] text-casca-suave hover:bg-casca-raia hover:text-casca-texto";
  return (
    <li className="group flex h-[30px] items-center gap-2 px-3">
      <span className="min-w-3 text-[11px] text-casca-marca">{selo.numero}</span>
      <DicaEscura texto={`${textoDoPrazo(atividade.prazoMinutos, t)} ${t("após entrar na etapa")}`}>
        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-casca-marca-suave text-[9px] font-bold text-casca-marca">
          {selo.inicial}
        </span>
      </DicaEscura>
      <IconeDoTipo tipo={atividade.tipo} tamanho={12} className="shrink-0 text-casca-marca" />
      <button
        type="button"
        onClick={aoAbrir}
        className="min-w-0 flex-1 truncate text-left text-[12px] text-casca-texto hover:underline"
      >
        {atividade.titulo}
      </button>
      {atividade.visibilidade === "nao_listada" ? (
        <DicaEscura texto={t("Essa atividade não será listada na visão de atividades")}>
          <span role="img" aria-label={t("Atividade não listada")} className="shrink-0 text-(--escale-nao-listada)">
            <EyeOff size={12} aria-hidden />
          </span>
        </DicaEscura>
      ) : null}
      <span className="hidden shrink-0 items-center gap-0.5 group-focus-within:flex group-hover:flex">
        {podeSubir ? (
          <button type="button" aria-label={t("Subir")} title={t("Subir")} onClick={aoSubir} className={acao}>
            <ArrowUp size={12} aria-hidden />
          </button>
        ) : null}
        {podeDescer ? (
          <button type="button" aria-label={t("Descer")} title={t("Descer")} onClick={aoDescer} className={acao}>
            <ArrowDown size={12} aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={t("Remover atividade")}
          title={t("Remover atividade")}
          onClick={aoRemover}
          className={acao}
        >
          <Trash2 size={12} aria-hidden />
        </button>
      </span>
    </li>
  );
}
```

Os botões do hover ficam escondidos com `hidden` e aparecem no `group-hover`. No jsdom eles estão no DOM, e o teste os acha.

- [ ] **Step 4: A aba reescrita**

Replace `components/escale/configuracoes/AbaDeEtapas.tsx` inteiro por:

```tsx
"use client";
import { useState } from "react";

import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import {
  adicionarAtividade,
  atividadesDaEtapa,
  atualizarAtividade,
  removerAtividade,
  rotuloDoModelo,
  trocarDeLugar,
  vizinhaDeMesmoPrazo,
  type AtividadeDoPlaybook,
} from "@/lib/escale/playbook/regras";
import {
  ChevronDown,
  EllipsisVertical,
  Flag,
  LayoutPanelLeft,
  ListChecks,
  Plus,
  Share2,
  TriangleAlert,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ItemDoPlaybook } from "./playbook/ItemDoPlaybook";
import { JanelaConfiguracoesDeAtividades } from "./playbook/JanelaConfiguracoesDeAtividades";
import { JanelaNovaAtividade } from "./playbook/JanelaNovaAtividade";

/** Quantas atividades a coluna mostra antes do "Ver mais" (Clint). */
const VISIVEIS = 6;

type Lista = readonly AtividadeDoPlaybook[];

/**
 * A ABA "ETAPAS E ATIVIDADES" (fork Escale, Fase 1I; D10, P8; prints F20, F21
 * e 030). Uma coluna por etapa aberta com o playbook dela. Tudo mexe só no
 * RASCUNHO, que a `JanelaDaOrigem` guarda e grava no "Salvar na origem". Editar
 * etapas fica no original (Q13); os modelos de playbook ficam "Em breve" (Q12).
 */
export function AbaDeEtapas({
  config,
  atividades,
  temSalvas,
  mudar,
}: {
  config: ConfiguracoesDaOrigem;
  atividades: Lista;
  temSalvas: boolean;
  mudar: (f: (lista: Lista) => Lista) => void;
}) {
  const abertas = config.etapas.filter((e) => !e.is_won && !e.is_lost);
  const [novaEm, setNovaEm] = useState<{ id: string; name: string } | null>(null);
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <SeloDoModelo temSalvas={temSalvas} />
      <div className="flex min-h-0 flex-1 [scrollbar-width:thin] gap-2.5 overflow-x-auto pb-3">
        {abertas.map((etapa, i) => (
          <ColunaDaEtapa
            key={etapa.id}
            etapa={etapa}
            inicial={i === 0}
            daEtapa={atividadesDaEtapa(atividades, etapa.id)}
            todas={atividades}
            aoNova={() => setNovaEm({ id: etapa.id, name: etapa.name })}
            aoAbrir={setEditando}
            aoMover={(id, passo) => mudar((l) => trocarDeLugar(l, id, passo))}
            aoRemover={(id) => mudar((l) => removerAtividade(l, id))}
          />
        ))}
      </div>
      {novaEm ? (
        <JanelaNovaAtividade
          aberta
          etapa={novaEm}
          aoFechar={() => setNovaEm(null)}
          aoContinuar={(nova) => {
            mudar((l) => adicionarAtividade(l, nova));
            setNovaEm(null);
            setEditando(nova.id);
          }}
        />
      ) : null}
      {editando ? (
        <JanelaConfiguracoesDeAtividades
          aberta
          etapas={abertas}
          atividades={atividades}
          escolhidaId={editando}
          campos={config.campos.map((c) => ({ chave: c.campo, rotulo: c.rotulo }))}
          aoEscolher={setEditando}
          aoAtualizar={(id, m) => mudar((l) => atualizarAtividade(l, id, m))}
          aoNova={(etapaId) => {
            const etapa = abertas.find((e) => e.id === etapaId);
            setEditando(null);
            if (etapa) setNovaEm({ id: etapa.id, name: etapa.name });
          }}
          aoFechar={() => setEditando(null)}
        />
      ) : null}
    </div>
  );
}

function SeloDoModelo({ temSalvas }: { temSalvas: boolean }) {
  const t = useT();
  return (
    <div className="flex h-8 shrink-0 items-center justify-end gap-2 pb-2 text-casca-texto">
      <LayoutPanelLeft size={14} aria-hidden />
      {temSalvas ? (
        <DicaEscura texto={t("As etapas e atividades desta origem foram customizadas.")}>
          <span role="img" aria-label={t("Origem customizada")} className="text-(--escale-ponto-atencao)">
            <TriangleAlert size={13} aria-hidden />
          </span>
        </DicaEscura>
      ) : null}
      <span className="text-[10px] font-semibold tracking-[0.2em] uppercase">{t(rotuloDoModelo(temSalvas))}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("Opções do modelo")}
            className="grid size-6 place-items-center rounded-[4px] hover:bg-casca-raia"
          >
            <EllipsisVertical size={16} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={CAIXA_DO_MENU}>
          <DropdownMenuItem disabled title={t("Em breve")} className={ITEM_DO_MENU}>
            <LayoutPanelLeft size={14} aria-hidden />
            {t("Escolher um modelo")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled title={t("Em breve")} className={ITEM_DO_MENU}>
            <Share2 size={14} aria-hidden />
            {t("Compartilhar modelo")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ColunaDaEtapa({
  etapa,
  inicial,
  daEtapa,
  todas,
  aoNova,
  aoAbrir,
  aoMover,
  aoRemover,
}: {
  etapa: { id: string; name: string };
  inicial: boolean;
  daEtapa: AtividadeDoPlaybook[];
  todas: Lista;
  aoNova: () => void;
  aoAbrir: (id: string) => void;
  aoMover: (id: string, passo: -1 | 1) => void;
  aoRemover: (id: string) => void;
}) {
  const t = useT();
  const [aberta, setAberta] = useState(true);
  const [todasVisiveis, setTodasVisiveis] = useState(false);
  const total = daEtapa.length;
  const mostradas = todasVisiveis ? daEtapa : daEtapa.slice(0, VISIVEIS);

  return (
    <section
      aria-label={etapa.name}
      className="flex h-full min-h-[340px] w-[227px] shrink-0 flex-col rounded-[4px] bg-casca-busca"
    >
      <header className="flex h-[38px] shrink-0 items-center gap-2 rounded-t-[4px] bg-casca-raia px-3">
        {inicial ? (
          <span
            role="img"
            aria-label={t("Etapa inicial")}
            className="grid size-[18px] place-items-center rounded-full bg-[#DCFCE7] text-[#16A34A]"
          >
            <Flag size={11} aria-hidden />
          </span>
        ) : null}
        <h4 className="truncate text-[12px] font-semibold text-casca-texto">{etapa.name}</h4>
      </header>
      {total === 0 ? (
        <p className="mx-3 border-b border-casca-borda py-3 text-[11px] font-semibold text-casca-texto">
          {t("Nenhuma atividade nessa etapa")}
        </p>
      ) : (
        <button
          type="button"
          aria-expanded={aberta}
          onClick={() => setAberta((a) => !a)}
          className="mx-3 flex items-center gap-2 border-b border-casca-borda py-3 text-left text-[11px] font-semibold text-casca-texto"
        >
          <ListChecks size={13} aria-hidden className="text-casca-marca" />
          {`${total} ${t("Atividades nessa etapa")}`}
        </button>
      )}
      {aberta && total > 0 ? (
        <ul className="py-1">
          {mostradas.map((a) => (
            <ItemDoPlaybook
              key={a.id}
              atividade={a}
              podeSubir={vizinhaDeMesmoPrazo(todas, a.id, -1) !== null}
              podeDescer={vizinhaDeMesmoPrazo(todas, a.id, 1) !== null}
              aoAbrir={() => aoAbrir(a.id)}
              aoSubir={() => aoMover(a.id, -1)}
              aoDescer={() => aoMover(a.id, 1)}
              aoRemover={() => aoRemover(a.id)}
            />
          ))}
        </ul>
      ) : null}
      {aberta && total > VISIVEIS ? (
        <button
          type="button"
          onClick={() => setTodasVisiveis((v) => !v)}
          className="mx-3 flex items-center gap-1 py-1 text-[11px] font-semibold text-casca-marca"
        >
          {todasVisiveis ? t("Ver menos") : t("Ver mais")}
          <ChevronDown size={13} aria-hidden className={cn(todasVisiveis && "rotate-180")} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={aoNova}
        className="mx-auto mt-4 flex items-center gap-1 text-[12px] font-medium text-casca-novo hover:underline"
      >
        <Plus size={13} aria-hidden />
        {t("Nova atividade")}
      </button>
    </section>
  );
}
```

As duas cores da bandeira (`bg-[#DCFCE7] text-[#16A34A]`) já estavam no arquivo da 1F. A linha fica idêntica, e a cerca `tailwind-tokens` já a conhece. Se a cerca reclamar, troque por `bg-(--escale-status-ganho)/15 text-(--escale-status-ganho)` e anote a diferença na conferência.

- [ ] **Step 5: Abrir a janela já na aba Etapas e atividades**

Em `lib/escale/configuracoes/abrir.ts`:
- logo depois de `export const EVENTO_DAS_CONFIGURACOES = …`, acrescente `export type AbaDaOrigem = "geral" | "etapas";`;
- troque as três funções abaixo pelas versões com a aba. Mantenha o resto do arquivo.

```ts
export function abrirConfiguracoesDaOrigem(id: string, aba: AbaDaOrigem = "geral"): void {
  window.dispatchEvent(new CustomEvent(EVENTO_DAS_CONFIGURACOES, { detail: { id, aba } }));
}
```

```ts
export function useEngrenagemDaOrigem(
  id: string,
  podeConfigurar: boolean,
  aba: AbaDaOrigem = "geral",
): { aoConfigurar: (() => void) | undefined; dicaDaEngrenagem: string } {
  const t = useT();
  const haPainel = useHaPainelDeOrigens();
  return {
    aoConfigurar: haPainel && podeConfigurar ? () => abrirConfiguracoesDaOrigem(id, aba) : undefined,
    dicaDaEngrenagem: haPainel ? t("Sem permissão") : t("Em breve"),
  };
}
```

```ts
export function useAoAbrirConfiguracoesDaOrigem(aoAbrir: (id: string, aba: AbaDaOrigem) => void): void {
  const ultimo = useRef(aoAbrir);
  useEffect(() => {
    ultimo.current = aoAbrir;
  }, [aoAbrir]);
  useEffect(() => {
    const ouvir = (e: Event) => {
      const detalhe = (e as CustomEvent<{ id?: unknown; aba?: unknown }>).detail;
      const id = detalhe?.id;
      if (typeof id === "string" && id.length > 0) ultimo.current(id, detalhe?.aba === "etapas" ? "etapas" : "geral");
    };
    window.addEventListener(EVENTO_DAS_CONFIGURACOES, ouvir);
    ouvintes += 1;
    avisar();
    return () => {
      window.removeEventListener(EVENTO_DAS_CONFIGURACOES, ouvir);
      ouvintes -= 1;
      avisar();
    };
  }, []);
}
```

Em `components/escale/origens/JanelasDeOrigens.tsx`:
- importe `import type { AbaDaOrigem } from "@/lib/escale/configuracoes/abrir";`;
- no tipo `Janela`, no ramo com `id: string;`, acrescente `aba?: AbaDaOrigem;`;
- troque a linha da `JanelaDaOrigem` por:

```tsx
    return <JanelaDaOrigem key={janela.id} {...comuns} id={janela.id} abaInicial={janela.aba} />;
```

Em `components/escale/origens/PainelOrigens.tsx`, linha 149:

```tsx
  useAoAbrirConfiguracoesDaOrigem((id, aba) => setJanela({ tipo: "config-origem", id, aba }));
```

Em `tests/unit/escale-engrenagem-da-origem.test.tsx`, as duas checagens `expect(aoAbrir).toHaveBeenCalledWith("f-1")` passam a ser `expect(aoAbrir).toHaveBeenCalledWith("f-1", "geral")`, e a do evento `f-2` (sem aba) também recebe `"geral"`. Acrescente um caso:

```tsx
  it("a aba pedida vai junto (Fase 1I: a engrenagem da ficha abre em Etapas e atividades)", () => {
    const aoAbrir = vi.fn();
    render(<Ouvinte aoAbrir={aoAbrir} />);
    abrirConfiguracoesDaOrigem("f-1", "etapas");
    expect(aoAbrir).toHaveBeenCalledWith("f-1", "etapas");
  });
```
O componente que escuta no teste pode ter outro nome (o arquivo chama `useAoAbrirConfiguracoesDaOrigem(aoAbrir)` na linha 30). Use o mesmo dos outros casos do arquivo.

- [ ] **Step 6: O rascunho e o "Salvar na origem" na janela**

Em `components/escale/configuracoes/JanelaDaOrigem.tsx`:

1. **Imports novos** (junto dos atuais):
```tsx
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
import { usePlaybookDaOrigem, useSalvarPlaybook } from "@/hooks/escale/usePlaybookDaOrigem";
import type { AbaDaOrigem } from "@/lib/escale/configuracoes/abrir";
import {
  doServidor,
  paraOServidor,
  playbookMudou,
  type AtividadeDoPlaybook,
} from "@/lib/escale/playbook/regras";
```

2. **Assinatura e aba inicial:**
```tsx
export function JanelaDaOrigem({
  id,
  origens,
  onFechar,
  onOrigens,
  abaInicial = "geral",
}: PropsDaJanela & { id: string; abaInicial?: AbaDaOrigem }) {
```
e `const [aba, setAba] = useState<AbaDaOrigem>(abaInicial);`.

3. **O rascunho do playbook:** logo depois de `const rascunho = editado ?? inicial;`, acrescente:
```tsx
  // O playbook (Fase 1I) tem rascunho próprio: "Salvar na origem" é separado do "Salvar" da aba Geral.
  const playbook = usePlaybookDaOrigem(id);
  const salvarPlaybook = useSalvarPlaybook(id);
  const playbookSalvo = useMemo(() => playbook.data?.map(doServidor) ?? null, [playbook.data]);
  const [playbookEditado, setPlaybookEditado] = useState<readonly AtividadeDoPlaybook[] | null>(null);
  const [erroDoPlaybook, setErroDoPlaybook] = useState<string | null>(null);
  const [confirmarDesfazer, setConfirmarDesfazer] = useState(false);
  const rascunhoDoPlaybook = playbookEditado ?? playbookSalvo;
  const playbookMexido =
    !!playbookSalvo && !!playbookEditado && playbookMudou(playbookEditado, playbookSalvo);
  const mudarPlaybook = (f: (l: readonly AtividadeDoPlaybook[]) => readonly AtividadeDoPlaybook[]) =>
    setPlaybookEditado((e) => f(e ?? playbookSalvo ?? []));
```

4. **Proteção da cortina:** nos dois handlers do `DialogPrimitive.Content`, troque `podeSalvar &&` por `(podeSalvar || playbookMexido) &&`.

5. **Gravar o playbook:** logo depois da função `aoSalvar`, acrescente:
```tsx
  async function aoSalvarPlaybook() {
    if (!rascunhoDoPlaybook) return;
    setErroDoPlaybook(null);
    try {
      await salvarPlaybook.mutateAsync(rascunhoDoPlaybook.map(paraOServidor));
      setPlaybookEditado(null);
      toast.success(t("Origem alterada com sucesso!"));
      onFechar();
    } catch (e) {
      setErroDoPlaybook(`${t("Falha na edição da origem!")} ${textoDoErro(e, t)}`);
    }
  }
```

6. **O conteúdo da aba:** troque
```tsx
              ) : aba === "etapas" ? (
                <AbaDeEtapas config={config} />
              ) : (
```
por
```tsx
              ) : aba === "etapas" ? (
                playbook.isPending ? (
                  <p className="text-[13px] text-casca-suave">{t("Carregando…")}</p>
                ) : playbook.isError || !rascunhoDoPlaybook ? (
                  <div role="alert" className="flex items-center gap-3 text-[13px] text-casca-alerta">
                    {t("Não consegui abrir as atividades desta origem.")}
                    <BotaoDaJanela variante="cancelar" onClick={() => void playbook.refetch()}>
                      {t("Tentar de novo")}
                    </BotaoDaJanela>
                  </div>
                ) : (
                  <div className="flex h-full flex-col">
                    <Alerta texto={erroDoPlaybook} />
                    <AbaDeEtapas
                      config={config}
                      atividades={rascunhoDoPlaybook}
                      temSalvas={(playbookSalvo?.length ?? 0) > 0}
                      mudar={mudarPlaybook}
                    />
                  </div>
                )
              ) : (
```

7. **O rodapé:** troque o bloco inteiro de `<div className="flex justify-end gap-2 px-8 pt-3 pb-[22px]">` até o `</div>` que o fecha por:
```tsx
            <div className="flex justify-end gap-2 px-8 pt-3 pb-[22px]">
              {aba === "etapas" && playbookMexido ? (
                <BotaoDaJanela variante="cancelar" onClick={() => setConfirmarDesfazer(true)}>
                  {t("Desfazer")}
                </BotaoDaJanela>
              ) : (
                <BotaoDaJanela variante="cancelar" onClick={onFechar}>
                  {t("Cancelar")}
                </BotaoDaJanela>
              )}
              {aba === "etapas" ? (
                <span className="inline-flex">
                  <BotaoDaJanela
                    variante="salvar"
                    disabled={!playbookMexido || salvarPlaybook.isPending}
                    title={playbookMexido ? undefined : t("Nenhuma alteração para salvar")}
                    onClick={() => void aoSalvarPlaybook()}
                    className="rounded-r-none disabled:pointer-events-auto disabled:cursor-not-allowed"
                  >
                    {t("Salvar na origem")}
                  </BotaoDaJanela>
                  <BotaoDaJanela
                    variante="salvar"
                    disabled
                    aria-label={t("Mais opções de salvar")}
                    title={t("Em breve")}
                    className="rounded-l-none border-l border-white/40 px-2 disabled:pointer-events-auto disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={14} aria-hidden />
                  </BotaoDaJanela>
                </span>
              ) : (
                <BotaoDaJanela
                  variante="salvar"
                  disabled={!podeSalvar}
                  onClick={() => void aoSalvar()}
                >
                  {t("Salvar")}
                </BotaoDaJanela>
              )}
            </div>
            <AlertDialog open={confirmarDesfazer} onOpenChange={setConfirmarDesfazer}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("Desfazer")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      "Ao confirmar esta ação, todas as alterações realizadas serão desfeitas. Tem certeza de que deseja continuar?",
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setPlaybookEditado(null);
                      setErroDoPlaybook(null);
                    }}
                  >
                    {t("Confirmar")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
```

8. Atualize o comentário do topo da janela: "Guarda o rascunho das subabas (um 'Salvar') e o do playbook (o 'Salvar na origem', Fase 1I)".

- [ ] **Step 7: Os testes da janela**

Em `tests/unit/escale-janela-da-origem.test.tsx`:

1. A função `abrir` ganha o playbook:
```tsx
function abrir(
  config: ConfiguracoesDaOrigem = CONFIG,
  origens: Origens = ORIGENS,
  playbook: unknown[] = [],
  abaInicial?: "geral" | "etapas",
) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
    url === "/api/v1/pipelines/f-1/configuracoes"
      ? { data: config }
      : url === "/api/v1/pipelines/f-1/playbook"
        ? { data: { atividades: playbook } }
        : { data: [] },
  );
```
No `render`, passe `abaInicial={abaInicial}` à `JanelaDaOrigem`.

2. Troque o caso `"Etapas e atividades: uma coluna por etapa aberta, a bandeira na primeira, Nova atividade e Salvar na origem desligados"` por:
```tsx
  it("Etapas e atividades: uma coluna por etapa aberta, Nova atividade ligada, Salvar na origem só com mudança", async () => {
    const { user } = abrir();
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    await user.click(screen.getByRole("tab", { name: "Etapas e atividades" }));
    const colunas = await screen.findAllByRole("region", { name: /Entrada Lead|Em atendimento/ });
    expect(colunas).toHaveLength(2);
    expect(within(colunas[0]!).getByRole("img", { name: "Etapa inicial" })).toBeInTheDocument();
    expect(within(colunas[0]!).getByRole("button", { name: "Nova atividade" })).toBeEnabled();
    expect(screen.queryByRole("region", { name: "Ganho" })).toBeNull();
    expect(screen.getByText("Nenhum modelo")).toBeInTheDocument();
    const salvar = screen.getByRole("button", { name: "Salvar na origem" });
    expect(salvar).toBeDisabled();
    expect(salvar).toHaveAttribute("title", "Nenhuma alteração para salvar");
  });
```

3. Troque o caso `"Etapas: 'Salvar na origem' e a seta desligados têm a dica 'Em breve' e deixam a dica aparecer"` por estes três:
```tsx
  it("Etapas: a seta do salvar continua 'Em breve'", async () => {
    const { user } = abrir();
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    await user.click(screen.getByRole("tab", { name: "Etapas e atividades" }));
    const seta = await screen.findByRole("button", { name: "Mais opções de salvar" });
    expect(seta).toBeDisabled();
    expect(seta).toHaveAttribute("title", "Em breve");
  });

  it("Etapas: criar uma atividade liga o 'Salvar na origem', que grava a lista e fecha", async () => {
    vi.mocked(apiClient.put).mockImplementation(async (_url: string, corpo: unknown) => ({
      data: corpo as { atividades: unknown[] },
    }));
    const { user, onFechar } = abrir();
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    await user.click(screen.getByRole("tab", { name: "Etapas e atividades" }));
    const [primeira] = await screen.findAllByRole("region", { name: /Entrada Lead/ });
    await user.click(within(primeira!).getByRole("button", { name: "Nova atividade" }));
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Entrada de Lead");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.keyboard("{Escape}");
    const salvar = screen.getByRole("button", { name: "Salvar na origem" });
    expect(salvar).toBeEnabled();
    await user.click(salvar);
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-1/playbook", {
      atividades: [
        expect.objectContaining({
          stage_id: "aaaaaaaa-0000-4000-8000-000000000001",
          titulo: "Entrada de Lead",
          tipo: "whatsapp",
          prazo_minutos: 1440,
        }),
      ],
    });
  });

  it("Etapas: com mudança, Cancelar vira Desfazer, que pede confirmação e volta ao salvo", async () => {
    const { user } = abrir();
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    await user.click(screen.getByRole("tab", { name: "Etapas e atividades" }));
    const [primeira] = await screen.findAllByRole("region", { name: /Entrada Lead/ });
    await user.click(within(primeira!).getByRole("button", { name: "Nova atividade" }));
    await user.type(screen.getByRole("textbox", { name: "Título" }), "X");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(
      screen.getByText(
        "Ao confirmar esta ação, todas as alterações realizadas serão desfeitas. Tem certeza de que deseja continuar?",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar na origem" })).toBeDisabled();
  });

  it("abaInicial 'etapas' abre direto em Etapas e atividades (engrenagem da ficha)", async () => {
    abrir(CONFIG, ORIGENS, [], "etapas");
    expect(await screen.findByRole("tab", { name: "Etapas e atividades" })).toHaveAttribute("aria-selected", "true");
  });
```

O `Escape` fecha a janela "Configurações de atividades", que a Continuar abriu, e a janela da origem fica (o Radix fecha só a camada de cima). Se o Escape fechar as duas, troque-o por um clique no X da janela de cima: `screen.getAllByRole("button", { name: "Fechar" }).at(-1)`.

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-playbook-aba-de-etapas.test.tsx tests/unit/escale-janela-da-origem.test.tsx tests/unit/escale-engrenagem-da-origem.test.tsx tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts && corepack pnpm prettier --write components/escale/configuracoes/playbook/ItemDoPlaybook.tsx tests/unit/escale-playbook-aba-de-etapas.test.tsx && corepack pnpm eslint components/escale/configuracoes lib/escale/configuracoes components/escale/origens && corepack pnpm typecheck`
Expected: PASS.
- `useEngrenagemDaOrigem` também é chamado em `app/app/pipelines/[id]/_client.tsx`. O parâmetro novo tem padrão, então o typecheck prova que nada quebrou ali.

- [ ] **Step 9: Revisor (G1)**

Despache o revisor com o diff da task. Peça que confira:
- se o rascunho do playbook e o das subabas são independentes;
- se a cortina protege o rascunho;
- se "Desfazer" e "Salvar na origem" não perdem nem gravam a lista errada;
- se as setas e a remoção mexem só na etapa certa.

- [ ] **Step 10: Commit**

```bash
git add components/escale/configuracoes components/escale/origens/JanelasDeOrigens.tsx components/escale/origens/PainelOrigens.tsx lib/escale/configuracoes/abrir.ts tests/unit/escale-playbook-aba-de-etapas.test.tsx tests/unit/escale-janela-da-origem.test.tsx tests/unit/escale-engrenagem-da-origem.test.tsx
git commit -m "feat(escale): aba Etapas e atividades com o playbook e o Salvar na origem (Fase 1I)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: Espanhol do PR A, a rodada cheia, a conferência, o PRD e o PR A

- [ ] **Step 1: O espanhol**

Crie o bloco `  // ─── FORK ESCALE · Fase 1I (PR A): playbook de etapas e atividades ───` em `lib/i18n/dicionario.ts`, logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`. Use o mesmo script `node -` da Task 6 da 1H (ele pula a chave que já existe), com `CAB` trocado pela linha acima e estas `ENTRADAS`:

```js
const ENTRADAS = [
  ["WhatsApp", "WhatsApp"],
  ["Instagram", "Instagram"],
  ["Ligação", "Llamada"],
  ["Email", "Email"],
  ["Agendamento", "Agendamiento"],
  ["Tarefa", "Tarea"],
  ["Reunião", "Reunión"],
  ["Ex: Whatsapp de convite", "Ej.: WhatsApp de invitación"],
  ["Ex: Instagram de convite", "Ej.: Instagram de invitación"],
  ["Ex: Ligação de prospecção", "Ej.: Llamada de prospección"],
  ["Ex: Email de abordagem", "Ej.: Email de abordaje"],
  ["Ex: Agendamento de reunião", "Ej.: Agendamiento de reunión"],
  ["Ex: Validar ICP", "Ej.: Validar ICP"],
  ["Ex: Reunião de validação", "Ej.: Reunión de validación"],
  ["Você poderá configurar a mensagem após a criação da atividade.", "Podrás configurar el mensaje después de crear la actividad."],
  ["Você poderá configurar o script de ligação após a criação da atividade.", "Podrás configurar el guion de llamada después de crear la actividad."],
  ["Você poderá configurar o email após a criação da atividade.", "Podrás configurar el email después de crear la actividad."],
  ["Você poderá configurar o agendamento após a criação da atividade.", "Podrás configurar el agendamiento después de crear la actividad."],
  ["Você poderá configurar a tarefa após a criação da atividade.", "Podrás configurar la tarea después de crear la actividad."],
  ["Você poderá configurar a reunião após a criação da atividade.", "Podrás configurar la reunión después de crear la actividad."],
  ["Clique aqui para adicionar o conteúdo da mensagem.", "Haz clic aquí para agregar el contenido del mensaje."],
  ["Adicione o seu script", "Agrega tu guion"],
  ["Adicione o seu texto", "Agrega tu texto"],
  ["Minuto", "Minuto"],
  ["Hora", "Hora"],
  ["Dia", "Día"],
  ["Semana", "Semana"],
  ["Mês", "Mes"],
  ["Ano", "Año"],
  ["minuto(s)", "minuto(s)"],
  ["hora(s)", "hora(s)"],
  ["dia(s)", "día(s)"],
  ["semana(s)", "semana(s)"],
  ["mês(es)", "mes(es)"],
  ["ano(s)", "año(s)"],
  ["No mesmo dia", "El mismo día"],
  ["Em um dia", "En un día"],
  ["Em 3 dias", "En 3 días"],
  ["Em uma semana", "En una semana"],
  ["Em duas semanas", "En dos semanas"],
  ["Ao entrar na etapa", "Al entrar en la etapa"],
  ["Origem customizada", "Origen personalizado"],
  ["Nenhum modelo", "Ningún modelo"],
  ["Uma atividade está numa etapa que não é desta origem.", "Una actividad está en una etapa que no es de este origen."],
  ["Campo obrigatório*", "Campo obligatorio*"],
  ["Atividade padrão", "Actividad estándar"],
  ["Crie uma atividade padrão com data e horário definido", "Crea una actividad estándar con fecha y horario definidos"],
  ["Atividade não listada", "Actividad no listada"],
  ["Crie uma atividade que não será listada na visão de atividades", "Crea una actividad que no aparecerá en la vista de actividades"],
  ["Atividade dependente", "Actividad dependiente"],
  ["A atividade só será listada na visão de atividades após conclusão da atividade relacionada", "La actividad solo aparecerá en la vista de actividades después de completar la actividad relacionada"],
  ["EM BREVE", "PRÓXIMAMENTE"],
  ["Título", "Título"],
  ["Tipo", "Tipo"],
  ["Data da atividade", "Fecha de la actividad"],
  ["O cálculo de tempo da atividade é com base na entrada do negócio na etapa.", "El tiempo de la actividad se calcula a partir de la entrada del negocio en la etapa."],
  ["após entrar na etapa", "después de entrar en la etapa"],
  ["Criar atividade após entrar na etapa em:", "Crear actividad después de entrar en la etapa en:"],
  ["Quantidade", "Cantidad"],
  ["Unidade", "Unidad"],
  ["Digite um número de 1 a 999.", "Escribe un número de 1 a 999."],
  ["Continuar", "Continuar"],
  ["Configurações de atividades", "Configuración de actividades"],
  ["Selecionar Etapa", "Seleccionar etapa"],
  ["Atividades da etapa", "Actividades de la etapa"],
  ["Adicione um título...", "Agrega un título..."],
  ["Conteúdo da atividade", "Contenido de la actividad"],
  ["Adicionar variáveis", "Agregar variables"],
  ["Variáveis", "Variables"],
  ["Buscar variável", "Buscar variable"],
  ["Nenhuma variável encontrada", "Ninguna variable encontrada"],
  ["Primeiro nome", "Primer nombre"],
  ["Sobrenome", "Apellido"],
  ["Segundo nome", "Segundo nombre"],
  ["Nome da empresa", "Nombre de la empresa"],
  ["Ajuda com as atividades", "Ayuda con las actividades"],
  ["Atualizar", "Actualizar"],
  ["Atividade atualizada", "Actividad actualizada"],
  ["Atividades nessa etapa", "Actividades en esta etapa"],
  ["Essa atividade não será listada na visão de atividades", "Esta actividad no aparecerá en la vista de actividades"],
  ["Subir", "Subir"],
  ["Descer", "Bajar"],
  ["Remover atividade", "Quitar actividad"],
  ["As etapas e atividades desta origem foram customizadas.", "Las etapas y actividades de este origen fueron personalizadas."],
  ["Opções do modelo", "Opciones del modelo"],
  ["Escolher um modelo", "Elegir un modelo"],
  ["Compartilhar modelo", "Compartir modelo"],
  ["Desfazer", "Deshacer"],
  ["Ao confirmar esta ação, todas as alterações realizadas serão desfeitas. Tem certeza de que deseja continuar?", "Al confirmar esta acción, se desharán todos los cambios realizados. ¿Seguro que quieres continuar?"],
  ["Confirmar", "Confirmar"],
  ["Nenhuma alteração para salvar", "Ningún cambio para guardar"],
  ["Não consegui abrir as atividades desta origem.", "No pude abrir las actividades de este origen."],
];
```

Rode `corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/escale-espanhol-registro-tu.test.ts` e o typecheck.
- Se a gate listar um texto que não está acima, acrescente o par à mão no fim do bloco.
- Expected: PASS.
- Commit: `feat(escale): espanhol do playbook da origem (1I, PR A)`.

- [ ] **Step 2: A rodada cheia, em segundo plano (G1)**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
mkdir -p .superpowers/sdd
( corepack pnpm typecheck && corepack pnpm lint && corepack pnpm lint:channels && corepack pnpm lint:role-rank \
  && bash scripts/checar-colisao-de-migration.sh escale-crm/main ) > .superpowers/sdd/1i-pra-gates-rapidos.log 2>&1; echo "rapidos=$?" >> .superpowers/sdd/1i-pra-gates-rapidos.log &
corepack pnpm vitest run --reporter=json --outputFile=.superpowers/sdd/1i-pra-unit.json > .superpowers/sdd/1i-pra-unit.log 2>&1 &
corepack pnpm test:db > .superpowers/sdd/1i-pra-db.log 2>&1; echo "db=$?" >> .superpowers/sdd/1i-pra-db.log &
```
Enquanto rodam, faça os Steps 3 e 4. Depois compare com as falhas conhecidas usando o mesmo `node -e` da Task 6 da 1H, trocando o arquivo para `.superpowers/sdd/1i-pra-unit.json`.

Expected:
- `novas: 0`;
- `rapidos=0`;
- `db=0`.

Toda falha nova é regressão. Rode o arquivo sozinho e, se continuar falhando, corrija antes do PR.

- [ ] **Step 3: Conferência visual** (contrato, CAMINHO A ou B)

Com a casca ligada e um gerente:
1. Abra a ⋮ "Configurações" de uma origem e vá para a aba Etapas e atividades.
2. Compare com F20 e 030:
   - crie duas atividades (WhatsApp de 1 dia e Ligação de 2 horas);
   - abra "Configurações de atividades";
   - ponha uma variável;
   - salve na origem.
3. Com o "Salvar na origem" feito, mova um negócio para a etapa e confira na aba Atividades da ficha (ainda a da 1G, só leitura) que as atividades apareceram com o prazo certo.
4. Escreva a lista das diferenças que sobram. As já previstas:
   - sem editar etapas (Q13);
   - a seta do salvar e os modelos "Em breve" (Q12);
   - texto simples no lugar do editor rico (Q9);
   - cores das unidades do selo iguais à marca (a Clint pinta cada unidade de uma cor).

Com CAMINHO B, o PR registra "conferência visual pendente: depois do deploy".

- [ ] **Step 4: PRD**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`:
- seção 8, na linha `| 1I |`:
  - troque a última coluna por `PR A aberto (playbook na origem, migration 9009); PR B a seguir (aba Atividades)`;
  - no "Pronto quando", troque `envia a mensagem pronta em um clique, com confirmação` por `envia a mensagem pronta na hora, pelo clique ou pelo Enter (decisão de 17/10)`;
- seção 9, acrescente estas linhas à tabela:

```
| Mudar a etapa pela ficha (trilho "Mover para cá" e concluir atividade de outra etapa) | Fica fora da 1I, mas é OBRIGATÓRIO antes do fim do projeto | 17/10 |
| Conteúdo da atividade igual ao da Clint (várias mensagens, áudio, modelo oficial, e-mail completo, editor rico) | A 1I guarda um texto simples; ficar igual à Clint é OBRIGATÓRIO antes do fim do projeto | 17/10 |
| Ligação pela atividade ("Chamar") | Fica para depois; na 1I o botão é "Em breve" | 17/10 |
| As demais diferenças da 1I para a Clint (a tabela "Fora desta fase" do plano da 1I) | Ficam para depois; ficar igual à Clint é OBRIGATÓRIO antes do fim do projeto | 17/10 |
```

- [ ] **Step 5: Push e PR A**

```bash
git push -u escale-crm feat/fase-1i-playbook
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-1i-playbook --title "feat(escale): Fase 1I (A) — playbook de etapas e atividades na origem, igual à Clint" --body-file .superpowers/sdd/1i-pra-pr.md
```

O corpo do PR leva:
- o Goal (a parte do playbook);
- as decisões P1 a P11 e G1;
- a migration 9009 e o que ela faz em produção: um gatilho novo em `crm_leads` e outro em `crm_tasks`, sem dado novo até alguém salvar um playbook;
- o que fica para o PR B;
- os desvios previstos (Step 3);
- as perguntas Q1 a Q5 e Q9 a Q14;
- os prints que faltam, 1 a 7;
- a conferência visual;
- a verificação (por task e a rodada cheia, com o `test:db`).

Termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Mostre a URL ao usuário e PARE. O PR B só começa depois do merge do PR A, com o "pode fazer" do usuário. A publicação (tag, VPS) é outro pedido.

---

# PR B — A aba Atividades da ficha

### Task 8: Branch do PR B e as regras puras da aba

**Files:**
- Create: `lib/escale/negocio/atividades.ts`, `tests/unit/escale-ficha-atividades-regras.test.ts`

**Interfaces (Produces):**
- Tipos: `ExtraDaAtividade`, `AtividadeDoNegocio` (= `Tarefa` + `tipo`, `visibilidade`, `stage_id`, `atividade_id`, `concluida_por`, `concluida_em`), `AtividadesDoNegocio` (`{ atividades, modelos }`), `NovaAtividadeDoNegocio` (`{ titulo, tipo, due_date, stage_id }`), `DiaDaColuna`, `GrupoDaLista`, `GrupoDoPlaybook`, `EstadoDoDispositivo`.
- Etapas e lista: `juntarAtividades`, `chaveDoDia`, `etapasDoTrilho`, `atividadesDaVista`, `diasDaColuna`, `gruposDaLista`, `gruposDoPlaybook`.
- Permissão e dados: `podeExcluirAtividade`, `valorDoNegocio`, `dadosDasVariaveis`.
- Envio: `linkDoWhatsappWeb`, `linkDoAppWhatsapp`, `dispositivoDeEnvio`.
- Data e hora: `mascararHora`, `horaValida`, `dataNoPassado`.

- [ ] **Step 1: A base e a branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:app/api/v1/pipelines/\[id\]/playbook/route.ts && echo "1I A ok"
git switch -c feat/fase-1i-aba-atividades escale-crm/main
```
Expected: `1I A ok`. Sem ele, PARE: o PR A ainda não entrou.

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-ficha-atividades-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  atividadesDaVista,
  dadosDasVariaveis,
  dataNoPassado,
  diasDaColuna,
  dispositivoDeEnvio,
  etapasDoTrilho,
  gruposDaLista,
  gruposDoPlaybook,
  horaValida,
  juntarAtividades,
  linkDoAppWhatsapp,
  linkDoWhatsappWeb,
  mascararHora,
  podeExcluirAtividade,
  valorDoNegocio,
  type AtividadeDoNegocio,
} from "@/lib/escale/negocio/atividades";
import type { ModeloDaEtapa } from "@/lib/escale/playbook/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import type { Tarefa } from "@/lib/tarefas/tipos";

/** FORK ESCALE · Fase 1I (C19–C21): as regras puras da aba Atividades da ficha. */
const t = (s: string) => s;
const AGORA = new Date(2026, 9, 15, 12, 0);
const tarefa = (id: string, due: Date | null, extra: Partial<Tarefa> = {}): Tarefa =>
  ({
    id,
    organization_id: "o",
    title: `T ${id}`,
    description: null,
    due_date: due ? due.toISOString() : null,
    priority: "medium",
    status: "pending",
    lead_id: "n1",
    contact_id: "c1",
    demanda_id: null,
    assigned_to: null,
    created_by: null,
    created_at: AGORA.toISOString(),
    updated_at: AGORA.toISOString(),
    ...extra,
  }) as Tarefa;
const atv = (id: string, due: Date | null, extra: Partial<AtividadeDoNegocio> = {}): AtividadeDoNegocio => ({
  ...tarefa(id, due),
  tipo: "whatsapp",
  visibilidade: "padrao",
  stage_id: "e1",
  atividade_id: null,
  concluida_por: null,
  concluida_em: null,
  ...extra,
});
const etapa = (id: string, position: number, extra: Partial<Stage> = {}): Stage =>
  ({ id, name: id, position, is_won: false, is_lost: false, is_archived: false, ...extra }) as Stage;

describe("juntar e escolher o que a lista mostra", () => {
  it("a tarefa sem linha do fork vira 'tarefa' padrão, sem etapa", () => {
    const [com, sem] = juntarAtividades(
      [tarefa("a", null), tarefa("b", null)],
      [{ tarefa_id: "a", stage_id: "e2", atividade_id: "m1", tipo: "ligacao", visibilidade: "nao_listada", concluida_por: null, concluida_em: null }],
    );
    expect(com).toMatchObject({ id: "a", tipo: "ligacao", visibilidade: "nao_listada", stage_id: "e2", atividade_id: "m1" });
    expect(sem).toMatchObject({ id: "b", tipo: "tarefa", visibilidade: "padrao", stage_id: null, atividade_id: null });
  });

  it("o trilho são as etapas abertas, na ordem", () => {
    const lista = etapasDoTrilho([etapa("e2", 2), etapa("g", 9, { is_won: true }), etapa("e1", 1), etapa("x", 3, { is_archived: true })]);
    expect(lista.map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("na etapa atual entram também as sem etapa e as de etapa que saiu do trilho", () => {
    const lista = [atv("a", null), atv("b", null, { stage_id: "e2" }), atv("c", null, { stage_id: null }), atv("d", null, { stage_id: "velha" })];
    const trilho = new Set(["e1", "e2"]);
    expect(atividadesDaVista(lista, "e1", "e1", trilho).map((a) => a.id)).toEqual(["a", "c", "d"]);
    expect(atividadesDaVista(lista, "e2", "e1", trilho).map((a) => a.id)).toEqual(["b"]);
  });
});

describe("a coluna Dias e os grupos da lista", () => {
  const lista = [
    atv("a", new Date(2026, 9, 15, 16, 21)),
    atv("b", new Date(2026, 9, 15, 9, 0)),
    atv("c", new Date(2027, 9, 14, 16, 21)),
    atv("d", new Date(2026, 9, 10, 8, 0), { status: "done" }),
    atv("e", null),
  ];
  it("um chip por dia, em ordem, com o mês quando muda (e o ano quando não é o atual) e as atrasadas", () => {
    const dias = diasDaColuna(lista, AGORA, "pt-BR", t);
    expect(dias.map((d) => [d.dia, d.semana, d.mes, d.total, d.atrasadas])).toEqual([
      [10, "SÁB", "OUT", 1, 0],
      [15, "Hoje", null, 2, 1],
      [14, "QUI", "OUT 27", 1, 0],
    ]);
  });
  it("os grupos vão do mais cedo ao mais tarde; 'Hoje' no dia de hoje; sem prazo no fim", () => {
    const grupos = gruposDaLista(lista, AGORA, "pt-BR", t);
    expect(grupos.map((g) => [g.rotulo, g.itens.map((x) => x.id)])).toEqual([
      ["Sáb, 10 Out", ["d"]],
      ["Hoje, 15 Out", ["b", "a"]],
      ["Qui, 14 Out", ["c"]],
      [null, ["e"]],
    ]);
  });
  it("a etapa futura mostra o playbook por prazo relativo", () => {
    const modelo = (id: string, prazo: number): ModeloDaEtapa => ({
      id,
      stage_id: "e2",
      titulo: id,
      tipo: "tarefa",
      visibilidade: "padrao",
      prazo_minutos: prazo,
      ordem: 0,
      conteudo: null,
    });
    const grupos = gruposDoPlaybook([modelo("x", 1440), modelo("y", 0), modelo("z", 120), modelo("w", 1440)], "e2", t);
    expect(grupos.map((g) => [g.rotulo, g.modelos.map((m) => m.id)])).toEqual([
      ["Ao entrar na etapa", ["y"]],
      ["2ª hora", ["z"]],
      ["1º dia", ["w", "x"]],
    ]);
  });
});

describe("quem pode, dados e envio", () => {
  it("só a atividade criada à mão se exclui", () => {
    expect(podeExcluirAtividade(atv("a", null))).toBe(true);
    expect(podeExcluirAtividade(atv("a", null, { atividade_id: "m1" }))).toBe(false);
  });

  it("valor em reais e os dados das variáveis a partir do negócio", () => {
    const lead = {
      title: "Negócio da Ana",
      contact_id: "c1",
      value_cents: 150050,
      currency: "BRL",
      contact_email: "ana@x.com",
      contact_phone: "+5543999990000",
      custom_fields: {},
    } as unknown as Lead;
    expect(valorDoNegocio(lead)).toBe("R$ 1.500,50");
    expect(
      dadosDasVariaveis(lead, "Ana Souza", "1. Entrada Lead", { nome: "Régis", email: "r@e.com" }, "Escale IA"),
    ).toEqual({
      contato: { nome: "Ana Souza", email: "ana@x.com", telefone: "+5543999990000" },
      negocio: { etapa: "1. Entrada Lead", valor: "R$ 1.500,50" },
      usuario: { nome: "Régis", email: "r@e.com" },
      empresa: { nome: "Escale IA" },
      campos: {},
    });
    const comCampo = dadosDasVariaveis(
      { ...lead, custom_fields: { plano: "ouro" } } as Lead,
      "Ana Souza",
      null,
      { nome: null, email: null },
      null,
      {
        defs: [{ key: "plano", label: "Plano", type: "select", options: [{ value: "ouro", label: "Ouro" }] }] as never,
        contato: { plano: "prata" },
        t,
      },
    );
    expect(comCampo.campos).toEqual({ "[DEAL.PLANO]": "Ouro", "[CONTACT.PLANO]": "prata" });
  });

  it("links do WhatsApp com só os dígitos e o texto codificado", () => {
    expect(linkDoWhatsappWeb("+55 (43) 99999-0000", "Olá Ana!")).toBe(
      "https://web.whatsapp.com/send?phone=5543999990000&text=Ol%C3%A1%20Ana!",
    );
    expect(linkDoAppWhatsapp("+5543999990000", "Oi")).toBe("whatsapp://send?phone=5543999990000&text=Oi");
  });

  it("o dispositivo é o primeiro canal WORKING, como o open-with-contact escolhe", () => {
    const s = (id: string, status: string, criado: string, extra = {}) => ({ id, status, created_at: criado, ...extra });
    expect(dispositivoDeEnvio([])).toEqual({ tipo: "nenhum" });
    expect(dispositivoDeEnvio([s("a", "STOPPED", "2026-01-01")])).toEqual({ tipo: "desconectado" });
    expect(
      dispositivoDeEnvio([s("b", "WORKING", "2026-02-01"), s("a", "WORKING", "2026-01-01"), s("c", "WORKING", "2025-01-01", { metadata: { disabled: true } })]),
    ).toEqual({ tipo: "conectado", sessaoId: "a" });
  });

  it("hora: máscara HH:mm, validação 24 h; data no passado com 1 minuto de folga", () => {
    expect(mascararHora("0930")).toBe("09:30");
    expect(mascararHora("9")).toBe("9");
    expect(mascararHora("12:3x")).toBe("12:3");
    expect(horaValida("23:59")).toEqual({ h: 23, m: 59 });
    expect(horaValida("24:00")).toBeNull();
    expect(horaValida("9:30")).toBeNull();
    expect(dataNoPassado(new Date(2026, 9, 15, 11, 59, 30), AGORA)).toBe(false);
    expect(dataNoPassado(new Date(2026, 9, 15, 11, 58), AGORA)).toBe(true);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-atividades-regras.test.ts`
Expected: FAIL (`Cannot find module '@/lib/escale/negocio/atividades'`).

- [ ] **Step 4: As regras**

Create `lib/escale/negocio/atividades.ts`:

```ts
/**
 * A ABA ATIVIDADES DA FICHA (fork Escale, Fase 1I; C19–C21): regras puras.
 * Sem React e sem rede.
 *
 * - A atividade do negócio é a tarefa do original (`crm_tasks`) mais a linha
 *   do fork (`crm_atividades_do_negocio`: tipo, visibilidade, etapa, atividade
 *   do playbook, quem concluiu). Tarefa sem a linha é "tarefa" padrão, sem etapa.
 * - A lista mostra a etapa VISTA (o trilho escolhe). Na etapa atual entram
 *   também as sem etapa e as de etapa que saiu do trilho, para nada sumir.
 * - Dias e grupos vão do mais cedo ao mais tarde (print 01: 15 Out, depois
 *   14 Out do ano seguinte).
 */
import type { ChannelSession } from "@/hooks/channels/useChannelSessions";
import { cabecalhoDoDia } from "@/lib/escale/negocio/regras";
import {
  prazoPorUnidade,
  type ModeloDaEtapa,
  type TipoDeAtividade,
  type VisibilidadeDaAtividade,
} from "@/lib/escale/playbook/regras";
import { valorParaLeitura } from "@/lib/escale/negocio/campos";
import { chaveDaVariavel, type DadosDasVariaveis } from "@/lib/escale/playbook/variaveis";
import type { CustomFieldDef } from "@/lib/schemas/settings";
import type { Stage } from "@/lib/kanban/types";
import { estaAtrasada, type Tarefa } from "@/lib/tarefas/tipos";
import type { Lead } from "@/lib/types/leads";

export interface ExtraDaAtividade {
  tarefa_id: string;
  stage_id: string | null;
  atividade_id: string | null;
  tipo: TipoDeAtividade;
  visibilidade: VisibilidadeDaAtividade;
  concluida_por: string | null;
  concluida_em: string | null;
}

export type AtividadeDoNegocio = Tarefa & Omit<ExtraDaAtividade, "tarefa_id">;

export interface AtividadesDoNegocio {
  atividades: AtividadeDoNegocio[];
  modelos: ModeloDaEtapa[];
}

export interface NovaAtividadeDoNegocio {
  titulo: string;
  tipo: TipoDeAtividade;
  due_date: string;
  stage_id: string;
}

export function juntarAtividades(tarefas: readonly Tarefa[], extras: readonly ExtraDaAtividade[]): AtividadeDoNegocio[] {
  const porTarefa = new Map(extras.map((e) => [e.tarefa_id, e]));
  return tarefas.map((x) => {
    const e = porTarefa.get(x.id);
    return {
      ...x,
      tipo: e?.tipo ?? "tarefa",
      visibilidade: e?.visibilidade ?? "padrao",
      stage_id: e?.stage_id ?? null,
      atividade_id: e?.atividade_id ?? null,
      concluida_por: e?.concluida_por ?? null,
      concluida_em: e?.concluida_em ?? null,
    };
  });
}

export function etapasDoTrilho(stages: readonly Stage[]): Stage[] {
  return stages.filter((s) => !s.is_archived && !s.is_won && !s.is_lost).sort((a, b) => a.position - b.position);
}

export function atividadesDaVista(
  lista: readonly AtividadeDoNegocio[],
  etapaVista: string,
  etapaAtual: string,
  doTrilho: ReadonlySet<string>,
): AtividadeDoNegocio[] {
  return lista.filter(
    (a) =>
      a.stage_id === etapaVista ||
      (etapaVista === etapaAtual && (a.stage_id === null || !doTrilho.has(a.stage_id))),
  );
}

const maiuscula = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const semPonto = (s: string) => s.replace(".", "");
/** A chave do dia local ("2026-10-15"): é a `chave` do `DiaDaColuna` e do `GrupoDaLista`. */
export const chaveDoDia = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const mesmoDia = (a: Date, b: Date) => chaveDoDia(a) === chaveDoDia(b);
const instante = (iso: string | null) => (iso ? Date.parse(iso) : Number.POSITIVE_INFINITY);

export interface DiaDaColuna {
  chave: string;
  dia: number;
  /** "QUI", ou "Hoje" no dia de hoje. */
  semana: string;
  /** "OUT" quando o mês muda em relação ao chip anterior; "OUT 27" se o ano não é o atual; null quando não muda. */
  mes: string | null;
  total: number;
  atrasadas: number;
}

export function diasDaColuna(
  lista: readonly AtividadeDoNegocio[],
  agora: Date,
  idioma: string,
  t: (s: string) => string,
): DiaDaColuna[] {
  const comData = lista
    .filter((a) => a.due_date)
    .sort((a, b) => instante(a.due_date) - instante(b.due_date));
  const dias: DiaDaColuna[] = [];
  let mesAnterior = "";
  for (const a of comData) {
    const d = new Date(a.due_date!);
    const chave = chaveDoDia(d);
    let dia = dias.find((x) => x.chave === chave);
    if (!dia) {
      const mesDoChip = `${d.getFullYear()}-${d.getMonth()}`;
      const nomeDoMes = semPonto(d.toLocaleDateString(idioma, { month: "short" })).toUpperCase();
      dia = {
        chave,
        dia: d.getDate(),
        semana: mesmoDia(d, agora)
          ? t("Hoje")
          : semPonto(d.toLocaleDateString(idioma, { weekday: "short" })).toUpperCase(),
        mes:
          mesDoChip === mesAnterior
            ? null
            : d.getFullYear() === agora.getFullYear()
              ? nomeDoMes
              : `${nomeDoMes} ${String(d.getFullYear()).slice(2)}`,
        total: 0,
        atrasadas: 0,
      };
      mesAnterior = mesDoChip;
      dias.push(dia);
    }
    dia.total += 1;
    if (estaAtrasada(a, agora)) dia.atrasadas += 1;
  }
  return dias;
}

export interface GrupoDaLista {
  chave: string;
  /** "Qui, 15 Out"; "Hoje, 15 Out"; null = sem prazo. */
  rotulo: string | null;
  itens: AtividadeDoNegocio[];
}

export function gruposDaLista(
  lista: readonly AtividadeDoNegocio[],
  agora: Date,
  idioma: string,
  t: (s: string) => string,
): GrupoDaLista[] {
  const ordenadas = [...lista].sort((a, b) => instante(a.due_date) - instante(b.due_date));
  const grupos = new Map<string, GrupoDaLista>();
  for (const a of ordenadas) {
    const d = a.due_date ? new Date(a.due_date) : null;
    const chave = d ? chaveDoDia(d) : "sem-prazo";
    const rotulo = !d
      ? null
      : mesmoDia(d, agora)
        ? `${t("Hoje")}, ${cabecalhoDoDia(a.due_date!, idioma).split(", ")[1]}`
        : cabecalhoDoDia(a.due_date!, idioma);
    const grupo = grupos.get(chave) ?? { chave, rotulo, itens: [] };
    grupos.set(chave, { ...grupo, itens: [...grupo.itens, a] });
  }
  return [...grupos.values()];
}

export interface GrupoDoPlaybook {
  chave: number;
  rotulo: string;
  modelos: ModeloDaEtapa[];
}

const ORDINAL: Record<string, string> = {
  minuto: "{n}º minuto",
  hora: "{n}ª hora",
  dia: "{n}º dia",
  semana: "{n}ª semana",
  mes: "{n}º mês",
  ano: "{n}º ano",
};

/** A etapa em que o negócio ainda não está: o playbook dela por prazo relativo ("Ao entrar na etapa", "1º dia"…). */
export function gruposDoPlaybook(
  modelos: readonly ModeloDaEtapa[],
  etapaId: string,
  t: (s: string) => string,
): GrupoDoPlaybook[] {
  const daEtapa = modelos
    .filter((m) => m.stage_id === etapaId)
    .sort((a, b) => a.prazo_minutos - b.prazo_minutos || a.ordem - b.ordem || a.titulo.localeCompare(b.titulo));
  const grupos = new Map<number, GrupoDoPlaybook>();
  for (const m of daEtapa) {
    const p = prazoPorUnidade(m.prazo_minutos);
    const rotulo =
      m.prazo_minutos <= 0 ? t("Ao entrar na etapa") : t(ORDINAL[p.unidade]!).replace("{n}", String(p.quantidade));
    const grupo = grupos.get(m.prazo_minutos) ?? { chave: m.prazo_minutos, rotulo, modelos: [] };
    grupos.set(m.prazo_minutos, { ...grupo, modelos: [...grupo.modelos, m] });
  }
  return [...grupos.values()];
}

/** A atividade do playbook não se exclui do negócio (Clint); a criada à mão, sim. */
export const podeExcluirAtividade = (a: Pick<AtividadeDoNegocio, "atividade_id">): boolean => a.atividade_id === null;

export function valorDoNegocio(lead: Pick<Lead, "value_cents" | "currency">): string | null {
  if (lead.value_cents === null || lead.value_cents === undefined) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: lead.currency ?? "BRL" })
    .format(lead.value_cents / 100)
    .replace(/ /g, " ");
}

/**
 * Os dados que as variáveis da mensagem trocam. Os campos personalizados (P10)
 * saem em texto pela `valorParaLeitura` da 1H: `[DEAL.<CHAVE>]` com o valor do
 * negócio e `[CONTACT.<CHAVE>]` com o do contato (vazio quando não há).
 */
export function dadosDasVariaveis(
  lead: Pick<Lead, "contact_id" | "value_cents" | "currency" | "contact_email" | "contact_phone" | "custom_fields">,
  nomeDoContato: string | null,
  etapa: string | null,
  usuario: { nome: string | null; email: string | null },
  organizacao: string | null,
  personalizados: {
    defs: readonly CustomFieldDef[];
    contato: Readonly<Record<string, unknown>> | null;
    t: (s: string) => string;
  } | null = null,
): DadosDasVariaveis {
  const campos: Record<string, string> = {};
  for (const def of personalizados?.defs ?? []) {
    const chave = chaveDaVariavel(def.key);
    const texto = (bruto: unknown) => valorParaLeitura(def.type, def.options, bruto, personalizados!.t) ?? "";
    campos[`[DEAL.${chave}]`] = texto(lead.custom_fields?.[def.key]);
    campos[`[CONTACT.${chave}]`] = texto(personalizados!.contato?.[def.key]);
  }
  return {
    campos,
    contato: {
      nome: lead.contact_id ? nomeDoContato : null,
      email: lead.contact_email ?? null,
      telefone: lead.contact_phone ?? null,
    },
    negocio: { etapa, valor: valorDoNegocio(lead) },
    usuario,
    empresa: { nome: organizacao },
  };
}

const digitos = (telefone: string) => telefone.replace(/\D/g, "");

export const linkDoWhatsappWeb = (telefone: string, texto: string) =>
  `https://web.whatsapp.com/send?phone=${digitos(telefone)}&text=${encodeURIComponent(texto)}`;

export const linkDoAppWhatsapp = (telefone: string, texto: string) =>
  `whatsapp://send?phone=${digitos(telefone)}&text=${encodeURIComponent(texto)}`;

export type EstadoDoDispositivo =
  | { tipo: "conectado"; sessaoId: string }
  | { tipo: "desconectado" }
  | { tipo: "nenhum" };

/**
 * O canal que vai enviar: o primeiro `WORKING` por data de criação, fora os
 * pausados (`metadata.disabled`) — a mesma escolha de `sessaoProntaParaEnvio`
 * no `open-with-contact`. Sem canal: "nenhum"; com canal parado: "desconectado".
 */
export function dispositivoDeEnvio(
  sessoes: readonly Pick<ChannelSession, "id" | "status" | "created_at" | "metadata">[],
): EstadoDoDispositivo {
  const ativas = sessoes
    .filter((s) => s.metadata?.disabled !== true)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  if (ativas.length === 0) return { tipo: "nenhum" };
  const pronta = ativas.find((s) => s.status === "WORKING");
  return pronta ? { tipo: "conectado", sessaoId: pronta.id } : { tipo: "desconectado" };
}

/** "0930" → "09:30" enquanto digita; só dígitos, no máximo 4. */
export function mascararHora(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`;
}

export function horaValida(texto: string): { h: number; m: number } | null {
  const r = /^(\d{2}):(\d{2})$/.exec(texto);
  if (!r) return null;
  const h = Number(r[1]);
  const m = Number(r[2]);
  return h <= 23 && m <= 59 ? { h, m } : null;
}

/** Antes de agora, com 1 minuto de folga (a data padrão da janela é "agora"). */
export const dataNoPassado = (quando: Date, agora: Date = new Date()): boolean =>
  quando.getTime() < agora.getTime() - 60_000;
```

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-atividades-regras.test.ts && corepack pnpm prettier --write lib/escale/negocio/atividades.ts tests/unit/escale-ficha-atividades-regras.test.ts && corepack pnpm eslint lib/escale/negocio/atividades.ts`
Expected: PASS.
- **Rótulos de mês e semana:** se os do `toLocaleDateString` do Node vierem diferentes ("OUT." ou "QUI."), o `semPonto` já tira o ponto. Se vierem com outra caixa, ajuste o teste para o que o `pt-BR` do Node devolve. Antes, confira com `node -e 'console.log(new Date(2026,9,15).toLocaleDateString("pt-BR",{weekday:"short",month:"short"}))'`.
- **`ChannelSession`:** se o tipo não exportar `metadata` ou `created_at` como string, use um tipo local `{ id: string; status: string; created_at: string; metadata?: Record<string, unknown> | null }`.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/negocio/atividades.ts tests/unit/escale-ficha-atividades-regras.test.ts
git commit -m "feat(escale): regras da aba Atividades da ficha (Fase 1I)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: A rota das atividades do negócio

**Files:**
- Create: `app/api/v1/leads/[id]/atividades/route.ts`, `tests/unit/escale-ficha-atividades-rota.test.ts`

**Interfaces:**
- Consumes: `juntarAtividades`, `AtividadesDoNegocio` (Task 8); `TIPOS_DE_ATIVIDADE` (Task 1); `registraAtividadeDaTarefa` (`lib/tarefas/atividade.ts`).
- Produces:
  - `GET /api/v1/leads/[id]/atividades` → `{ data: AtividadesDoNegocio }` (viewer ou acima; o negócio é lido com a sessão: a RLS decide se a pessoa vê).
  - `POST` com `NovaAtividadeDoNegocio` → 201 `{ data: { atividade } }` (agent ou acima). Erros: 404 negócio; 422 corpo inválido ou etapa fora da origem do negócio.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-atividades-rota.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/tarefas/atividade", () => ({ registraAtividadeDaTarefa: vi.fn(async () => ({ ok: true })) }));

import { GET, POST } from "@/app/api/v1/leads/[id]/atividades/route";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { registraAtividadeDaTarefa } from "@/lib/tarefas/atividade";

/** FORK ESCALE · Fase 1I (C19): ler e criar as atividades do negócio. */
const ORG = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const LEAD = "33333333-3333-4333-8333-333333333333";
const PIPE = "44444444-4444-4444-8444-444444444444";
const ETAPA = "55555555-5555-4555-8555-555555555555";
const TAREFA = { id: "66666666-6666-4666-8666-666666666666", title: "Ligar", lead_id: LEAD, contact_id: "c1", due_date: null, priority: "medium", status: "pending" };
const EXTRA = { tarefa_id: TAREFA.id, stage_id: ETAPA, atividade_id: null, tipo: "ligacao", visibilidade: "padrao", concluida_por: null, concluida_em: null };

type Linhas = Record<string, unknown[]>;

/** Um dublê do supabase que responde por tabela e grava inserts e deletes. */
function banco(linhas: Linhas, opts: { erroNoExtra?: boolean } = {}) {
  const gravados: Array<{ tabela: string; op: string; valor?: unknown }> = [];
  const from = vi.fn((tabela: string) => {
    let op = "select";
    let valor: unknown;
    const api = {
      select: () => api,
      eq: () => api,
      is: () => api,
      in: () => api,
      order: () => api,
      insert: (v: unknown) => {
        op = "insert";
        valor = v;
        gravados.push({ tabela, op, valor: v });
        return api;
      },
      delete: () => {
        op = "delete";
        gravados.push({ tabela, op });
        return api;
      },
      maybeSingle: async () => ({ data: (linhas[tabela] ?? [])[0] ?? null, error: null }),
      single: async () =>
        op === "insert" && tabela === "crm_tasks"
          ? { data: { ...TAREFA, ...(valor as object) }, error: null }
          : { data: (linhas[tabela] ?? [])[0] ?? null, error: null },
      then: (ok: (v: { data: unknown; error: unknown }) => unknown) =>
        Promise.resolve(
          op === "insert" && tabela === "crm_atividades_do_negocio" && opts.erroNoExtra
            ? { data: null, error: { code: "23503", message: "x" } }
            : { data: linhas[tabela] ?? [], error: null },
        ).then(ok),
    };
    return api;
  });
  return { from, gravados };
}

const ctx = (id = LEAD) => ({ params: Promise.resolve({ id }) });
const BASE: Linhas = {
  crm_leads: [{ id: LEAD, pipeline_id: PIPE, contact_id: "c1" }],
  crm_tasks: [TAREFA],
  crm_atividades_do_negocio: [EXTRA],
  crm_atividades_da_etapa: [],
  crm_stages: [{ id: ETAPA }],
};
const pedido = (corpo: unknown) =>
  new NextRequest(`http://x/api/v1/leads/${LEAD}/atividades`, { method: "POST", body: JSON.stringify(corpo) });
const NOVA = { titulo: "Ligar", tipo: "ligacao", due_date: "2026-10-20T10:00:00.000-03:00", stage_id: ETAPA };

beforeEach(() => {
  vi.mocked(requireRole).mockResolvedValue({ ok: true, user: { id: USER, idioma: "pt-BR" }, org: { orgId: ORG } } as never);
});

describe("GET /api/v1/leads/[id]/atividades", () => {
  it("junta a tarefa com a linha do fork e devolve o playbook da origem", async () => {
    vi.mocked(createClient).mockResolvedValue(banco(BASE) as never);
    const res = await GET(new NextRequest("http://x"), ctx());
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.atividades[0]).toMatchObject({ id: TAREFA.id, tipo: "ligacao", stage_id: ETAPA });
    expect(data.modelos).toEqual([]);
    expect(requireRole).toHaveBeenCalledWith("viewer", expect.anything());
  });
  it("negócio que a pessoa não vê: 404", async () => {
    vi.mocked(createClient).mockResolvedValue(banco({ ...BASE, crm_leads: [] }) as never);
    expect((await GET(new NextRequest("http://x"), ctx())).status).toBe(404);
  });
});

describe("POST /api/v1/leads/[id]/atividades", () => {
  it("cria a tarefa (responsável = quem criou) e a linha do fork, e grava na linha do tempo", async () => {
    const db = banco(BASE);
    vi.mocked(createClient).mockResolvedValue(db as never);
    const res = await POST(pedido(NOVA), ctx());
    expect(res.status).toBe(201);
    const tarefa = db.gravados.find((g) => g.tabela === "crm_tasks" && g.op === "insert")?.valor;
    expect(tarefa).toMatchObject({
      organization_id: ORG,
      title: "Ligar",
      lead_id: LEAD,
      contact_id: "c1",
      assigned_to: USER,
      created_by: USER,
      status: "pending",
      source_kind: "escale_ficha",
    });
    expect(db.gravados.find((g) => g.tabela === "crm_atividades_do_negocio")?.valor).toMatchObject({
      organization_id: ORG,
      lead_id: LEAD,
      stage_id: ETAPA,
      tipo: "ligacao",
      visibilidade: "padrao",
    });
    expect(registraAtividadeDaTarefa).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tipo: "task_created", actor: { type: "user", id: USER } }),
    );
    expect(requireRole).toHaveBeenCalledWith("agent", expect.anything());
  });
  it("corpo inválido: 422; etapa fora da origem do negócio: 422", async () => {
    vi.mocked(createClient).mockResolvedValue(banco(BASE) as never);
    expect((await POST(pedido({ ...NOVA, tipo: "linkedin" }), ctx())).status).toBe(422);
    vi.mocked(createClient).mockResolvedValue(banco({ ...BASE, crm_stages: [] }) as never);
    expect((await POST(pedido(NOVA), ctx())).status).toBe(422);
  });
  it("se a linha do fork falha, a tarefa é desfeita e a rota devolve 500", async () => {
    const db = banco(BASE, { erroNoExtra: true });
    vi.mocked(createClient).mockResolvedValue(db as never);
    expect((await POST(pedido(NOVA), ctx())).status).toBe(500);
    expect(db.gravados.some((g) => g.tabela === "crm_tasks" && g.op === "delete")).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-atividades-rota.test.ts`
Expected: FAIL (a rota não existe).

- [ ] **Step 3: A rota**

Create `app/api/v1/leads/[id]/atividades/route.ts`:

```ts
/**
 * GET/POST /api/v1/leads/:id/atividades — a aba Atividades da ficha (fork
 * Escale, Fase 1I; C19).
 *
 * GET (viewer ou acima): as tarefas do negócio (`crm_tasks`) juntas com a
 * linha do fork (`crm_atividades_do_negocio`) e o playbook da origem (a etapa
 * futura mostra o que vai nascer). O negócio é lido com a sessão: a RLS decide
 * quem vê, e só depois disso as tarefas (cuja RLS é a da organização) entram.
 *
 * POST (agent ou acima): a "Nova atividade" da ficha. Cria a tarefa
 * (responsável = quem criou), a linha do fork com o tipo e a etapa, e grava
 * `task_created` na linha do tempo, como a rota de tarefas do original. Se a
 * linha do fork falhar, a tarefa é apagada: não fica tarefa sem tipo na ficha.
 * Concluir, editar e excluir usam `PATCH/DELETE /api/v1/tasks/[id]`.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import { juntarAtividades, type ExtraDaAtividade } from "@/lib/escale/negocio/atividades";
import { lerJson } from "@/lib/escale/origens/respostas";
import { TIPOS_DE_ATIVIDADE, type ModeloDaEtapa } from "@/lib/escale/playbook/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { registraAtividadeDaTarefa } from "@/lib/tarefas/atividade";
import type { Tarefa } from "@/lib/tarefas/tipos";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const ROTA = "/api/v1/leads/[id]/atividades";
const COLUNAS_DA_TAREFA =
  "id, organization_id, title, description, due_date, priority, status, lead_id, contact_id, demanda_id, assigned_to, created_by, created_at, updated_at";
const COLUNAS_DO_EXTRA = "tarefa_id, stage_id, atividade_id, tipo, visibilidade, concluida_por, concluida_em";
const COLUNAS_DO_MODELO = "id, stage_id, titulo, tipo, visibilidade, prazo_minutos, ordem, conteudo";
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;

const novaSchema = z
  .object({
    titulo: z.string().trim().min(1).max(255),
    tipo: z.enum(TIPOS_DE_ATIVIDADE),
    due_date: z.string().datetime({ offset: true }),
    stage_id: z.string().uuid(),
  })
  .strict();

type Banco = Awaited<ReturnType<typeof createClient>>;

async function lerNegocio(supabase: Banco, orgId: string, id: string) {
  return supabase
    .from("crm_leads")
    .select("id, pipeline_id, contact_id")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_tasks" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Negócio não encontrado."), 404, { requestId });

  const supabase = await createClient();
  const negocio = await lerNegocio(supabase, orgId, id);
  if (negocio.error) return falhaInesperada(negocio.error, { rota: `GET ${ROTA}`, operacao: "ler" }, t, requestId);
  if (!negocio.data) return fail("not_found", t("Negócio não encontrado."), 404, { requestId });

  const [tarefas, extras, modelos] = await Promise.all([
    supabase.from("crm_tasks").select(COLUNAS_DA_TAREFA).eq("organization_id", orgId).eq("lead_id", id),
    supabase.from("crm_atividades_do_negocio").select(COLUNAS_DO_EXTRA).eq("organization_id", orgId).eq("lead_id", id),
    supabase
      .from("crm_atividades_da_etapa")
      .select(COLUNAS_DO_MODELO)
      .eq("organization_id", orgId)
      .eq("pipeline_id", negocio.data.pipeline_id),
  ]);
  const erro = tarefas.error ?? extras.error ?? modelos.error;
  if (erro) return falhaInesperada(erro, { rota: `GET ${ROTA}`, operacao: "ler" }, t, requestId);

  return ok(
    {
      atividades: juntarAtividades((tarefas.data ?? []) as Tarefa[], (extras.data ?? []) as ExtraDaAtividade[]),
      modelos: (modelos.data ?? []) as ModeloDaEtapa[],
    },
    { requestId },
  );
}

export async function POST(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_tasks" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Negócio não encontrado."), 404, { requestId });

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = novaSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Erro ao adicionar atividade. Tente novamente."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const nova = parsed.data;

  const supabase = await createClient();
  const negocio = await lerNegocio(supabase, orgId, id);
  if (negocio.error) return falhaInesperada(negocio.error, { rota: `POST ${ROTA}`, operacao: "ler" }, t, requestId);
  if (!negocio.data) return fail("not_found", t("Negócio não encontrado."), 404, { requestId });

  const etapa = await supabase
    .from("crm_stages")
    .select("id")
    .eq("organization_id", orgId)
    .eq("pipeline_id", negocio.data.pipeline_id)
    .eq("id", nova.stage_id)
    .eq("is_won", false)
    .eq("is_lost", false)
    .eq("is_archived", false)
    .maybeSingle();
  if (etapa.error) return falhaInesperada(etapa.error, { rota: `POST ${ROTA}`, operacao: "ler" }, t, requestId);
  if (!etapa.data) {
    return fail("unprocessable_entity", t("Uma atividade está numa etapa que não é desta origem."), 422, {
      requestId,
    });
  }

  const criada = await supabase
    .from("crm_tasks")
    .insert({
      organization_id: orgId,
      title: nova.titulo,
      due_date: nova.due_date,
      priority: "medium",
      status: "pending",
      lead_id: id,
      contact_id: negocio.data.contact_id,
      assigned_to: authz.user.id,
      created_by: authz.user.id,
      source_kind: "escale_ficha",
    })
    .select(COLUNAS_DA_TAREFA)
    .single();
  if (criada.error || !criada.data) {
    return falhaInesperada(criada.error, { rota: `POST ${ROTA}`, operacao: "gravar" }, t, requestId);
  }
  const tarefa = criada.data as Tarefa;

  const extra: ExtraDaAtividade = {
    tarefa_id: tarefa.id,
    stage_id: nova.stage_id,
    atividade_id: null,
    tipo: nova.tipo,
    visibilidade: "padrao",
    concluida_por: null,
    concluida_em: null,
  };
  const gravado = await supabase.from("crm_atividades_do_negocio").insert({
    tarefa_id: tarefa.id,
    organization_id: orgId,
    lead_id: id,
    stage_id: nova.stage_id,
    tipo: nova.tipo,
    visibilidade: "padrao",
  });
  if (gravado.error) {
    await supabase.from("crm_tasks").delete().eq("organization_id", orgId).eq("id", tarefa.id);
    return falhaInesperada(gravado.error, { rota: `POST ${ROTA}`, operacao: "gravar" }, t, requestId);
  }

  void registraAtividadeDaTarefa(supabase, {
    organizationId: orgId,
    tarefa,
    tipo: "task_created",
    actor: { type: "user", id: authz.user.id },
  });
  void audit({
    action: "crm_task.created",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "crm_task",
    resourceId: tarefa.id,
    requestId,
    metadata: { lead_id: id, tipo: nova.tipo, via: "escale" },
  });

  return ok({ atividade: juntarAtividades([tarefa], [extra])[0] }, { requestId, status: 201 });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-atividades-rota.test.ts && corepack pnpm prettier --write "app/api/v1/leads/[id]/atividades/route.ts" tests/unit/escale-ficha-atividades-rota.test.ts && corepack pnpm eslint "app/api/v1/leads/[id]/atividades/route.ts"`
Expected: PASS.
- **Tipos do insert:** se os tipos gerados do Supabase recusarem as tabelas novas, siga o padrão da rota da 1H (`app/api/v1/leads/[id]/notas/route.ts`), que também insere em tabela nova do fork.
- **Auditoria:** confira em `app/api/v1/tasks/route.ts` o `resourceType` que a rota de tarefas usa no `crm_task.created` e use o mesmo.

- [ ] **Step 5: Commit**

```bash
git add "app/api/v1/leads/[id]/atividades/route.ts" tests/unit/escale-ficha-atividades-rota.test.ts
git commit -m "feat(escale): rota das atividades do negócio, ler e criar (Fase 1I)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: O hook das atividades, com "quem conclui vira dono" (C21)

**Files:**
- Create: `hooks/escale/useAtividadesDoNegocio.ts`, `tests/unit/escale-ficha-atividades-hook.test.tsx`

**Interfaces:**
- Consumes: Task 8 (tipos), Task 9 (rota); `PATCH/DELETE /api/v1/tasks/[id]` (original); `useEditLead(pipelineId)` (`hooks/kanban/useUpdateLead`); `useUser`, `usePermission` (`hooks/auth/AuthProvider`); `proximoEstadoAoAlternar` (`lib/tarefas/tipos`).
- Produces:
  - `chaveDasAtividades(leadId)`;
  - `useAtividadesDoNegocio(lead)`, que devolve:
    - `dados: AtividadesDoNegocio | null`, `carregando`, `falhou`, `recarregar()`;
    - `alternar(a) → Promise<"concluida" | "reaberta">`;
    - `editar(id, entrada: EdicaoDaTarefa)`, `excluir(id)`, `criar(nova: NovaAtividadeDoNegocio)`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-atividades-hook.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
const permissao = vi.hoisted(() => ({ pode: true }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u-eu" }),
  usePermission: () => permissao.pode,
}));
const editarLead = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => undefined) }));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({ useEditLead: () => editarLead }));

import { useAtividadesDoNegocio } from "@/hooks/escale/useAtividadesDoNegocio";
import { apiClient } from "@/lib/api/client";
import type { AtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1I (C21): concluir na ficha um negócio sem dono faz quem concluiu virar o dono. */
const SEM_DONO = { id: "n1", pipeline_id: "p1", owner_user_id: null, owner_agent_id: null } as Lead;
const atividade = (status: "pending" | "done") => ({ id: "t1", status }) as AtividadeDoNegocio;

function montar(lead: Lead) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const envolver = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useAtividadesDoNegocio(lead), { wrapper: envolver });
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  vi.mocked(apiClient.get).mockResolvedValue({ data: { atividades: [], modelos: [] } });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
  editarLead.mutateAsync.mockClear();
  permissao.pode = true;
});

describe("useAtividadesDoNegocio", () => {
  it("lê a rota do negócio", async () => {
    const { result } = montar(SEM_DONO);
    await waitFor(() => expect(result.current.dados).toEqual({ atividades: [], modelos: [] }));
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/leads/n1/atividades");
  });

  it("concluir grava 'done' e, sem dono, põe quem concluiu como dono", async () => {
    const { result } = montar(SEM_DONO);
    let saida = "";
    await act(async () => {
      saida = await result.current.alternar(atividade("pending"));
    });
    expect(saida).toBe("concluida");
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/tasks/t1", { status: "done" });
    expect(editarLead.mutateAsync).toHaveBeenCalledWith({ leadId: "n1", patch: { owner_user_id: "u-eu" } });
  });

  it("negócio com dono (pessoa ou agente), reabrir, ou sem permissão: o dono não muda", async () => {
    for (const lead of [
      { ...SEM_DONO, owner_user_id: "u-outro" },
      { ...SEM_DONO, owner_agent_id: "ag-1" },
    ] as Lead[]) {
      const { result } = montar(lead);
      await act(async () => {
        await result.current.alternar(atividade("pending"));
      });
    }
    const { result } = montar(SEM_DONO);
    await act(async () => {
      expect(await result.current.alternar(atividade("done"))).toBe("reaberta");
    });
    expect(apiClient.patch).toHaveBeenLastCalledWith("/api/v1/tasks/t1", { status: "pending" });
    permissao.pode = false;
    const semPermissao = montar(SEM_DONO);
    await act(async () => {
      await semPermissao.result.current.alternar(atividade("pending"));
    });
    expect(editarLead.mutateAsync).not.toHaveBeenCalled();
  });

  it("criar, editar e excluir vão às rotas certas", async () => {
    const { result } = montar(SEM_DONO);
    vi.mocked(apiClient.post).mockResolvedValue({ data: { atividade: {} } });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { deleted: true } });
    await act(async () => {
      await result.current.criar({ titulo: "X", tipo: "tarefa", due_date: "2026-10-20T10:00:00.000Z", stage_id: "e1" });
      await result.current.editar("t1", { due_date: "2026-10-21T10:00:00.000Z" });
      await result.current.excluir("t1");
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/leads/n1/atividades", {
      titulo: "X",
      tipo: "tarefa",
      due_date: "2026-10-20T10:00:00.000Z",
      stage_id: "e1",
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/tasks/t1", { due_date: "2026-10-21T10:00:00.000Z" });
    expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/tasks/t1");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-atividades-hook.test.tsx`
Expected: FAIL (o hook não existe).

- [ ] **Step 3: O hook**

Create `hooks/escale/useAtividadesDoNegocio.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usePermission, useUser } from "@/hooks/auth/AuthProvider";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import { apiClient } from "@/lib/api/client";
import type { AtividadeDoNegocio, AtividadesDoNegocio, NovaAtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import { proximoEstadoAoAlternar, type EdicaoDaTarefa } from "@/lib/tarefas/tipos";
import type { Lead } from "@/lib/types/leads";

/**
 * AS ATIVIDADES DO NEGÓCIO (fork Escale, Fase 1I; C19–C21).
 *
 * Lê a rota do fork (tarefas + tipo + playbook) e muda pelas rotas que já
 * existem: `PATCH/DELETE /api/v1/tasks/[id]` (que gravam `task_completed` na
 * linha do tempo e o gatilho da 9009 grava quem concluiu). Toda mudança
 * invalida também as tarefas do original e o quadro (o selo do card).
 *
 * C21, como na Clint (o `completeActivity` dela faz isso na tela): concluir
 * num negócio sem dono — nem pessoa nem agente de IA — faz quem concluiu virar
 * o dono, pelo MESMO `PATCH /api/v1/leads/[id]` do "Alterar usuário", com a
 * mesma permissão (`pipeline.move_card`).
 */
export const chaveDasAtividades = (leadId: string) => ["atividades-do-negocio", leadId] as const;

export function useAtividadesDoNegocio(lead: Lead) {
  const qc = useQueryClient();
  const user = useUser();
  const podeAssumir = usePermission("pipeline.move_card");
  const editarLead = useEditLead(lead.pipeline_id);
  const chave = chaveDasAtividades(lead.id);

  const consulta = useQuery({
    queryKey: chave,
    queryFn: async () =>
      (await apiClient.get<{ data: AtividadesDoNegocio }>(`/api/v1/leads/${lead.id}/atividades`)).data,
    staleTime: 10_000,
  });

  const invalidar = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: chave }),
      qc.invalidateQueries({ queryKey: ["crm_tasks"] }),
      qc.invalidateQueries({ queryKey: ["board"] }),
    ]);

  const editar = useMutation({
    mutationFn: ({ id, entrada }: { id: string; entrada: EdicaoDaTarefa }) =>
      apiClient.patch(`/api/v1/tasks/${id}`, entrada),
    onSuccess: invalidar,
  });
  const excluir = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/tasks/${id}`),
    onSuccess: invalidar,
  });
  const criar = useMutation({
    mutationFn: (nova: NovaAtividadeDoNegocio) => apiClient.post(`/api/v1/leads/${lead.id}/atividades`, nova),
    onSuccess: invalidar,
  });

  async function alternar(a: Pick<AtividadeDoNegocio, "id" | "status">): Promise<"concluida" | "reaberta"> {
    const proximo = proximoEstadoAoAlternar(a.status);
    await editar.mutateAsync({ id: a.id, entrada: { status: proximo } });
    if (proximo !== "done") return "reaberta";
    if (!lead.owner_user_id && !lead.owner_agent_id && podeAssumir) {
      await editarLead.mutateAsync({ leadId: lead.id, patch: { owner_user_id: user.id } });
    }
    return "concluida";
  }

  return {
    dados: consulta.data ?? null,
    carregando: consulta.isLoading,
    falhou: consulta.isError,
    recarregar: () => void consulta.refetch(),
    alternar,
    editar: (id: string, entrada: EdicaoDaTarefa) => editar.mutateAsync({ id, entrada }),
    excluir: (id: string) => excluir.mutateAsync(id),
    criar: (nova: NovaAtividadeDoNegocio) => criar.mutateAsync(nova),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-atividades-hook.test.tsx && corepack pnpm prettier --write hooks/escale/useAtividadesDoNegocio.ts tests/unit/escale-ficha-atividades-hook.test.tsx && corepack pnpm eslint hooks/escale/useAtividadesDoNegocio.ts`
Expected: PASS.
- **`useEditLead`:** se o `mutateAsync` dele não aceitar `{ leadId, patch }`, confira o tipo `EditArgs` em `hooks/kanban/useUpdateLead.ts`. O `DonoDaFicha` usa `editar.mutate({ leadId: lead.id, patch })`.

- [ ] **Step 5: Revisor (G1)**

Despache o revisor com o diff da task, pedindo que confira:
- C21: só sem dono, só ao concluir (nunca ao reabrir), só com a permissão do "Alterar usuário" e pelo mesmo caminho;
- as invalidações: a ficha, a lista de Tarefas e o quadro.

- [ ] **Step 6: Commit**

```bash
git add hooks/escale/useAtividadesDoNegocio.ts tests/unit/escale-ficha-atividades-hook.test.tsx
git commit -m "feat(escale): hook das atividades do negócio, quem conclui vira dono (Fase 1I, C21)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11: O seletor de data e hora da Clint, "Nova atividade" e "Editar data e hora" na ficha

**Abra antes:** o print 002 (a data aberta não tem print: prints que faltam, 12).

**Files:**
- Create: `components/escale/ui/SeletorDeDataEHora.tsx`, `components/escale/negocio/abas/atividades/JanelaNovaAtividadeDoNegocio.tsx`, `components/escale/negocio/abas/atividades/JanelaEditarDataEHora.tsx`, `tests/unit/escale-ficha-nova-atividade.test.tsx`

**Interfaces:**
- Consumes: Task 8 (`mascararHora`, `horaValida`, `dataNoPassado`, `NovaAtividadeDoNegocio`); Task 4 (`IconeDoTipo`); `lib/escale/ui/periodos` (`diasDoMes`, `mesVizinho`, `isoDaData`, `dataDoIso`, `formatarDataBr`).
- Produces:
  - `SeletorDeDataEHora({ valor: Date, aoMudar: (d: Date) => void })`;
  - `JanelaNovaAtividadeDoNegocio({ aberta, etapa: { id, name }, aoFechar, aoCriar: (nova) => Promise<unknown> })`;
  - `JanelaEditarDataEHora({ aberta, atividade: { title, due_date }, aoFechar, aoSalvar: (iso: string) => Promise<unknown> })`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-nova-atividade.test.tsx`:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { JanelaEditarDataEHora } from "@/components/escale/negocio/abas/atividades/JanelaEditarDataEHora";
import { JanelaNovaAtividadeDoNegocio } from "@/components/escale/negocio/abas/atividades/JanelaNovaAtividadeDoNegocio";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { toast } from "sonner";

/** FORK ESCALE · Fase 1I (C19, P16): data e hora da Clint, "Nova atividade" e "Editar data e hora" na ficha (print 002). */
afterEach(() => vi.useRealTimers());

describe("seletor de data e hora", () => {
  it("mostra dd/mm/aaaa; o calendário troca o dia mantendo a hora; a hora digitada vira HH:mm", async () => {
    const aoMudar = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<SeletorDeDataEHora valor={new Date(2026, 9, 15, 10, 30)} aoMudar={aoMudar} />);
    const data = screen.getByRole("button", { name: "Data" });
    expect(data).toHaveTextContent("15/10/2026");
    await user.click(data);
    await user.click(screen.getByRole("button", { name: "20/10/2026" }));
    expect(aoMudar).toHaveBeenLastCalledWith(new Date(2026, 9, 20, 10, 30));
    const hora = screen.getByRole("textbox", { name: "Hora" });
    expect(hora).toHaveValue("10:30");
    await user.clear(hora);
    await user.type(hora, "1445");
    expect(hora).toHaveValue("14:45");
    expect(aoMudar).toHaveBeenLastCalledWith(new Date(2026, 9, 15, 14, 45));
  });

  it("as setas trocam o mês", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<SeletorDeDataEHora valor={new Date(2026, 9, 15, 10, 30)} aoMudar={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByRole("button", { name: "20/11/2026" })).toBeInTheDocument();
  });
});

describe("Nova atividade na ficha", () => {
  function abrir(aoCriar = vi.fn(async () => undefined)) {
    const aoFechar = vi.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <JanelaNovaAtividadeDoNegocio
        aberta
        etapa={{ id: "e1", name: "1. Entrada Lead" }}
        aoFechar={aoFechar}
        aoCriar={aoCriar}
      />,
    );
    return { user, aoCriar, aoFechar };
  }

  it("título, tipo e data e hora (sem os cartões); Continuar cria na etapa e fecha", async () => {
    const { user, aoCriar, aoFechar } = abrir();
    const janela = screen.getByRole("dialog", { name: "Nova atividade" });
    expect(within(janela).getByText("1. Entrada Lead")).toBeInTheDocument();
    expect(within(janela).queryByRole("button", { name: /Atividade padrão/ })).toBeNull();
    await user.type(within(janela).getByRole("textbox", { name: "Título" }), "Ligar de novo");
    await user.click(within(janela).getByRole("button", { name: "Ligação" }));
    await user.click(within(janela).getByRole("button", { name: "Continuar" }));
    expect(aoCriar).toHaveBeenCalledWith({
      titulo: "Ligar de novo",
      tipo: "ligacao",
      due_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      stage_id: "e1",
    });
    await waitFor(() => expect(aoFechar).toHaveBeenCalled());
  });

  it("sem título: 'Campo obrigatório*'; data no passado: o erro da Clint", async () => {
    const { user, aoCriar } = abrir();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Campo obrigatório*")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Título" }), "X");
    await user.click(screen.getByRole("button", { name: "Data" }));
    await user.click(screen.getByRole("button", { name: "Mês anterior" }));
    await user.click(screen.getAllByRole("button", { name: /^10\// })[0]!);
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(
      screen.getByText("A data informada não pode ser no passado. Por favor, selecione uma data futura."),
    ).toBeInTheDocument();
    expect(aoCriar).not.toHaveBeenCalled();
  });

  it("falha ao criar: toast da Clint e a janela fica", async () => {
    const { user, aoFechar } = abrir(vi.fn(async () => Promise.reject(new Error("x"))));
    await user.type(screen.getByRole("textbox", { name: "Título" }), "X");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Erro ao adicionar atividade. Tente novamente."));
    expect(aoFechar).not.toHaveBeenCalled();
  });
});

describe("Editar data e hora", () => {
  it("salva o novo prazo e mostra o toast da Clint", async () => {
    const aoSalvar = vi.fn(async () => undefined);
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <JanelaEditarDataEHora
        aberta
        atividade={{ title: "Ligação 1", due_date: new Date(2026, 9, 15, 10, 30).toISOString() }}
        aoFechar={vi.fn()}
        aoSalvar={aoSalvar}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Editar data e hora" })).toHaveTextContent("Ligação 1");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(aoSalvar).toHaveBeenCalledWith(new Date(2026, 9, 15, 10, 30).toISOString());
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("A data e a hora da atividade foram alteradas com sucesso"),
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-nova-atividade.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 3: O seletor de data e hora**

Create `components/escale/ui/SeletorDeDataEHora.tsx`:

```tsx
"use client";
import { useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { horaValida, mascararHora } from "@/lib/escale/negocio/atividades";
import { dataDoIso, diasDoMes, formatarDataBr, isoDaData, mesVizinho } from "@/lib/escale/ui/periodos";
import { Calendar, ChevronLeft, ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const doisDigitos = (n: number) => String(n).padStart(2, "0");
const horaDe = (d: Date) => `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;

/**
 * DATA E HORA DA CLINT (fork Escale, Fase 1I; print 002, P16): a caixa
 * "dd/mm/aaaa 📅" abre o calendário de UM dia (a mesma grade do
 * `CalendarioDePeriodo`: semana de domingo a sábado), "às", e a hora em texto
 * HH:mm (24 h). Nunca o `<input type="date|time">` do navegador.
 */
export function SeletorDeDataEHora({ valor, aoMudar }: { valor: Date; aoMudar: (d: Date) => void }) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState({ ano: valor.getFullYear(), mes0: valor.getMonth() });
  const [hora, setHora] = useState(horaDe(valor));
  const escolhido = isoDaData(valor);
  const dias = diasDoMes(mes.ano, mes.mes0);
  const titulo = new Date(mes.ano, mes.mes0, 1).toLocaleDateString(idioma, { month: "long", year: "numeric" });
  const semana = dias
    .slice(0, 7)
    .map((d) => dataDoIso(d.iso).toLocaleDateString(idioma, { weekday: "short" }).replace(".", "").slice(0, 3).toUpperCase());

  const abrir = (sim: boolean) => {
    if (sim) setMes({ ano: valor.getFullYear(), mes0: valor.getMonth() });
    setAberto(sim);
  };
  const escolherDia = (iso: string) => {
    const d = dataDoIso(iso);
    d.setHours(valor.getHours(), valor.getMinutes(), 0, 0);
    aoMudar(d);
    setAberto(false);
  };
  const digitarHora = (texto: string) => {
    const mascarada = mascararHora(texto);
    setHora(mascarada);
    const hm = horaValida(mascarada);
    if (!hm) return;
    const d = new Date(valor);
    d.setHours(hm.h, hm.m, 0, 0);
    aoMudar(d);
  };

  return (
    <div className="flex items-center gap-3">
      <Popover open={aberto} onOpenChange={abrir}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("Data")}
            className="flex h-[52px] w-[208px] items-center justify-between rounded-[4px] bg-casca-raia px-4 text-[14px] text-casca-texto hover:bg-casca-marca-suave"
          >
            {formatarDataBr(escolhido)}
            <Calendar size={18} aria-hidden className="text-casca-texto-2" />
          </button>
        </PopoverTrigger>
        <PainelSuspenso className="w-[300px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label={t("Mês anterior")}
              onClick={() => setMes((m) => mesVizinho(m.ano, m.mes0, -1))}
              className="grid size-7 place-items-center rounded-[6px] hover:bg-casca-raia"
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <p className="text-sm font-medium text-casca-texto capitalize">{titulo}</p>
            <button
              type="button"
              aria-label={t("Próximo mês")}
              onClick={() => setMes((m) => mesVizinho(m.ano, m.mes0, 1))}
              className="grid size-7 place-items-center rounded-[6px] hover:bg-casca-raia"
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
          <div aria-hidden className="mb-2 grid grid-cols-7 gap-x-1.5">
            {semana.map((d) => (
              <span key={d} className="text-center text-[0.7rem] font-semibold text-casca-texto">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-x-1.5 gap-y-[7px]">
            {dias.map((d) => (
              <button
                key={d.iso}
                type="button"
                aria-label={formatarDataBr(d.iso)}
                aria-pressed={d.iso === escolhido}
                onClick={() => escolherDia(d.iso)}
                className={cn(
                  "h-[30px] w-8 rounded-[6px] text-[0.8rem] font-medium transition-colors",
                  d.iso === escolhido
                    ? "bg-casca-marca text-accent-foreground"
                    : d.doMes
                      ? "text-casca-texto hover:bg-casca-raia"
                      : "text-casca-meta hover:bg-casca-raia",
                )}
              >
                {Number(d.iso.slice(8))}
              </button>
            ))}
          </div>
        </PainelSuspenso>
      </Popover>
      <span className="text-[14px] text-casca-suave">{t("às")}</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label={t("Hora")}
        value={hora}
        maxLength={5}
        placeholder="00:00"
        onChange={(e) => digitarHora(e.target.value)}
        className="h-[52px] w-[74px] rounded-[4px] border-0 bg-casca-raia px-3 text-center text-[14px] text-casca-texto outline-hidden focus:ring-2 focus:ring-casca-marca"
      />
    </div>
  );
}
```

- [ ] **Step 4: "Nova atividade" da ficha**

Create `components/escale/negocio/abas/atividades/JanelaNovaAtividadeDoNegocio.tsx`:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { dataNoPassado, type NovaAtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import {
  EXEMPLO_DO_TITULO,
  ROTULO_DO_TIPO,
  TIPOS_DE_ATIVIDADE,
  type TipoDeAtividade,
} from "@/lib/escale/playbook/regras";
import { LayoutPanelLeft } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * "NOVA ATIVIDADE" NA FICHA (fork Escale, Fase 1I; print 002, P16): a janela
 * estreita da Clint, sem os cartões de visibilidade (a atividade é padrão):
 * título, tipo e "Data e hora da atividade". "Continuar" CRIA direto, como a
 * Clint (`deal_activity_create`), na etapa que está sendo vista.
 */
export function JanelaNovaAtividadeDoNegocio({
  aberta,
  etapa,
  aoFechar,
  aoCriar,
}: {
  aberta: boolean;
  etapa: { id: string; name: string };
  aoFechar: () => void;
  aoCriar: (nova: NovaAtividadeDoNegocio) => Promise<unknown>;
}) {
  const t = useT();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoDeAtividade>("whatsapp");
  const [quando, setQuando] = useState(() => new Date());
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const continuar = async () => {
    if (!titulo.trim()) {
      setErro(t("Campo obrigatório*"));
      return;
    }
    if (dataNoPassado(quando)) {
      setErro(t("A data informada não pode ser no passado. Por favor, selecione uma data futura."));
      return;
    }
    setEnviando(true);
    try {
      await aoCriar({ titulo: titulo.trim(), tipo, due_date: quando.toISOString(), stage_id: etapa.id });
      aoFechar();
    } catch {
      toast.error(t("Erro ao adicionar atividade. Tente novamente."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(92vw,720px)] gap-0 p-0">
      <div className="border-b border-casca-borda px-6 py-5">
        <DialogTitle className="text-[17px] font-normal text-casca-texto">{t("Nova atividade")}</DialogTitle>
      </div>
      <div className="grid gap-5 px-6 py-5">
        <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] text-casca-meta uppercase">
          <LayoutPanelLeft size={14} aria-hidden />
          {etapa.name}
        </p>
        <label className="grid gap-2 px-8">
          <span className="text-[14px] font-medium text-casca-texto">{t("Título")}*</span>
          <input
            type="text"
            aria-label={t("Título")}
            value={titulo}
            maxLength={255}
            placeholder={t(EXEMPLO_DO_TITULO[tipo])}
            onChange={(e) => {
              setTitulo(e.target.value);
              setErro(null);
            }}
            className="h-[52px] w-full max-w-[495px] rounded-[4px] border-0 bg-casca-raia px-4 text-[14px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
          />
        </label>
        <div className="grid gap-2 px-8">
          <span className="text-[14px] font-medium text-casca-texto">{t("Tipo")}*</span>
          <div className="flex gap-2">
            {TIPOS_DE_ATIVIDADE.map((x) => (
              <button
                key={x}
                type="button"
                aria-label={t(ROTULO_DO_TIPO[x])}
                title={t(ROTULO_DO_TIPO[x])}
                aria-pressed={x === tipo}
                onClick={() => setTipo(x)}
                className={cn(
                  "grid size-[38px] place-items-center rounded-[6px] border text-casca-marca",
                  x === tipo ? "border-casca-marca" : "border-casca-borda hover:bg-casca-raia",
                )}
              >
                <IconeDoTipo tipo={x} tamanho={18} />
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 px-8">
          <span className="text-[14px] font-medium text-casca-texto">{t("Data e hora da atividade")}</span>
          <SeletorDeDataEHora
            valor={quando}
            aoMudar={(d) => {
              setQuando(d);
              setErro(null);
            }}
          />
        </div>
        {erro ? (
          <p role="alert" className="px-8 text-[12px] text-casca-alerta">
            {erro}
          </p>
        ) : null}
      </div>
      <div className="flex justify-end border-t border-casca-borda px-6 py-4">
        <button
          type="button"
          disabled={enviando}
          title={enviando ? t("Salvando…") : undefined}
          onClick={() => void continuar()}
          className="h-10 rounded-[6px] bg-casca-marca px-4 text-[14px] font-semibold text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("Continuar")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
```

- [ ] **Step 5: "Editar data e hora"**

Create `components/escale/negocio/abas/atividades/JanelaEditarDataEHora.tsx`:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { useT } from "@/hooks/i18n/useT";

/** "EDITAR DATA E HORA" (fork Escale, Fase 1I; P13): o ⋮ da atividade troca o prazo. */
export function JanelaEditarDataEHora({
  aberta,
  atividade,
  aoFechar,
  aoSalvar,
}: {
  aberta: boolean;
  atividade: { title: string; due_date: string | null };
  aoFechar: () => void;
  aoSalvar: (iso: string) => Promise<unknown>;
}) {
  const t = useT();
  const [quando, setQuando] = useState(() => (atividade.due_date ? new Date(atividade.due_date) : new Date()));
  const [enviando, setEnviando] = useState(false);

  const salvar = async () => {
    setEnviando(true);
    try {
      await aoSalvar(quando.toISOString());
      toast.success(t("A data e a hora da atividade foram alteradas com sucesso"));
      aoFechar();
    } catch {
      toast.error(t("Erro ao atualizar atividade. Tente novamente."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(92vw,520px)]">
      <CabecaDaJanela titulo={t("Editar data e hora")} descricao={atividade.title} />
      <SeletorDeDataEHora valor={quando} aoMudar={setQuando} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela
          variante="salvar"
          disabled={enviando}
          title={enviando ? t("Salvando…") : undefined}
          onClick={() => void salvar()}
        >
          {t("Salvar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-nova-atividade.test.tsx tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/ui/SeletorDeDataEHora.tsx components/escale/negocio/abas/atividades/*.tsx tests/unit/escale-ficha-nova-atividade.test.tsx && corepack pnpm eslint components/escale/ui/SeletorDeDataEHora.tsx components/escale/negocio/abas/atividades`
Expected: PASS.
- **Data no passado:** o caso volta um mês e escolhe o dia 10, que fica no passado em relação a hoje. Se o relógio da máquina cair num dia 1 a 9 do mês, o dia 10 do mês anterior continua no passado. Não depende da data de hoje.

- [ ] **Step 7: Commit**

```bash
git add components/escale/ui/SeletorDeDataEHora.tsx components/escale/negocio/abas/atividades/JanelaNovaAtividadeDoNegocio.tsx components/escale/negocio/abas/atividades/JanelaEditarDataEHora.tsx tests/unit/escale-ficha-nova-atividade.test.tsx
git commit -m "feat(escale): data e hora da Clint, Nova atividade e Editar data e hora na ficha (Fase 1I)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: A aba Atividades: trilho, Dias, lista, ⋮ e o detalhe

**Abra antes:** os prints G01, 017 e 003.

**Files:**
- Create: `components/escale/negocio/abas/atividades/TrilhoDeEtapas.tsx`, `ColunaDosDias.tsx`, `ListaDeAtividades.tsx`, `DetalheDaAtividade.tsx`, `tests/unit/escale-ficha-aba-atividades.test.tsx`
- Modify: `components/escale/negocio/abas/AbaAtividades.tsx` (reescrita; a assinatura ganha `pipeline`, para os campos personalizados das variáveis), `components/escale/negocio/ConteudoDaAba.tsx` (a linha do `case "atividades"`), `tests/unit/escale-ficha-abas-atividades-historico.test.tsx` (sai o `describe` de Atividades)

**Interfaces:**
- Consumes: Tasks 8, 10 e 11; Task 4 (`IconeDoTipo`); `useEngrenagemDaOrigem(id, pode, "etapas")` (Task 6); `resolverVariaveis` (Task 5); `VAZIO_DO_CONTEUDO` (Task 5); `useAssignableMembers` (`hooks/inbox/useAssignableMembers`); `FotoDaFicha`; `tituloDoCard` (`lib/escale/quadro/aparencia`).
- Produces:
  - `TrilhoDeEtapas({ lead, etapas, vista, aoVer })`;
  - `ColunaDosDias({ dias, escolhido, aoEscolher })`;
  - `ListaDeAtividades(props)` (ver o código);
  - `DetalheDaAtividade({ tipo, titulo, conteudo, textoResolvido, editavel, aoSalvarConteudo?, podeRemover, aoRemover?, rodape? })`. O `rodape` é o encaixe da Task 13.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-aba-atividades.test.tsx`:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "o", name: "Escale IA", role: "manager" }),
  useUser: () => ({ id: "u-eu", full_name: "Régis Junior", email: "r@e.com" }),
  usePermission: () => true,
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u-ana", full_name: "Ana Atendente" }] }),
}));
vi.mock("@/hooks/contacts/useContact", () => ({ useContact: () => ({ data: undefined }) }));
const engrenagem = vi.hoisted(() => ({ aoConfigurar: vi.fn() }));
vi.mock("@/lib/escale/configuracoes/abrir", () => ({
  useEngrenagemDaOrigem: () => ({ aoConfigurar: engrenagem.aoConfigurar, dicaDaEngrenagem: "Sem permissão" }),
}));
const ativ = vi.hoisted(() => ({
  dados: null as unknown,
  alternar: vi.fn(async () => "concluida"),
  editar: vi.fn(async () => undefined),
  excluir: vi.fn(async () => undefined),
  criar: vi.fn(async () => undefined),
}));
vi.mock("@/hooks/escale/useAtividadesDoNegocio", () => ({
  useAtividadesDoNegocio: () => ({
    dados: ativ.dados,
    carregando: false,
    falhou: false,
    recarregar: vi.fn(),
    alternar: ativ.alternar,
    editar: ativ.editar,
    excluir: ativ.excluir,
    criar: ativ.criar,
  }),
}));

import { AbaAtividades } from "@/components/escale/negocio/abas/AbaAtividades";
import type { Pipeline, Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { toast } from "sonner";

/** FORK ESCALE · Fase 1I (C19–C21): a aba Atividades da ficha (prints G01, 017 e 003). */
const ORIGEM = { id: "p1", settings: { fields: [] } } as unknown as Pipeline;
const etapa = (id: string, position: number, name: string, extra: Partial<Stage> = {}): Stage =>
  ({ id, name, position, is_won: false, is_lost: false, is_archived: false, ...extra }) as Stage;
const ETAPAS = [etapa("e1", 1, "1. Entrada Lead"), etapa("e2", 2, "2. Em atendimento"), etapa("e3", 3, "3. Docs"), etapa("g", 9, "Ganho", { is_won: true })];
const LEAD = {
  id: "n1",
  pipeline_id: "p1",
  stage_id: "e2",
  contact_id: "c1",
  title: "Ana Souza",
  value_cents: 150000,
  currency: "BRL",
  contact_phone: "+5543999990000",
  custom_fields: {},
  owner_user_id: null,
  owner_agent_id: null,
} as unknown as Lead;
const amanha = new Date(Date.now() + 86_400_000);
const ontem = new Date(Date.now() - 86_400_000);
const base = {
  organization_id: "o",
  description: null,
  priority: "medium",
  lead_id: "n1",
  contact_id: "c1",
  demanda_id: null,
  assigned_to: null,
  created_by: null,
  created_at: ontem.toISOString(),
  updated_at: ontem.toISOString(),
  visibilidade: "padrao",
  atividade_id: "m1",
  concluida_por: null,
  concluida_em: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  ativ.dados = {
    atividades: [
      { ...base, id: "w", title: "Entrada de Lead", tipo: "whatsapp", stage_id: "e2", status: "pending", due_date: amanha.toISOString(), description: "Olá [CONTACT.FIRST_NAME], tudo bem?" },
      { ...base, id: "l", title: "Ligação 1", tipo: "ligacao", stage_id: "e2", status: "pending", due_date: ontem.toISOString(), visibilidade: "nao_listada" },
      { ...base, id: "f", title: "Feita", tipo: "tarefa", stage_id: "e2", status: "done", due_date: ontem.toISOString(), concluida_por: "u-ana", concluida_em: ontem.toISOString() },
      { ...base, id: "manual", title: "Avulsa", tipo: "tarefa", stage_id: "e2", status: "pending", due_date: amanha.toISOString(), atividade_id: null },
      { ...base, id: "velha", title: "Da etapa 1", tipo: "tarefa", stage_id: "e1", status: "pending", due_date: amanha.toISOString() },
    ],
    modelos: [{ id: "m9", stage_id: "e3", titulo: "Coleta de docs", tipo: "tarefa", visibilidade: "padrao", prazo_minutos: 1440, ordem: 0, conteudo: null }],
  };
});

const abrir = () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  render(<AbaAtividades lead={LEAD} stages={ETAPAS} pipeline={ORIGEM} />);
  return user;
};

describe("aba Atividades", () => {
  it("o trilho: etapas abertas; a atual marcada; a anterior com ✓; a etapa atual é a vista", () => {
    abrir();
    const trilho = screen.getByRole("list", { name: "Etapas da origem" });
    const passos = within(trilho).getAllByRole("listitem");
    expect(passos).toHaveLength(3);
    expect(passos[1]).toHaveAttribute("aria-current", "step");
    expect(within(passos[0]!).queryByText("1")).toBeNull();
    expect(within(passos[1]!).getByRole("button", { name: /Em atendimento/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Próximas atividades" })).toBeInTheDocument();
  });

  it("a lista mostra só a etapa vista; a atrasada em vermelho; a feita riscada; a não listada com o olho", () => {
    abrir();
    const lista = screen.getByRole("region", { name: "Próximas atividades" });
    expect(within(lista).queryByText("Da etapa 1")).toBeNull();
    expect(within(lista).getByText("Ligação 1").closest("li")!.querySelector(".text-casca-alerta")).not.toBeNull();
    expect(within(lista).getByText("Feita")).toHaveClass("line-through");
    expect(within(lista).getByRole("img", { name: "Atividade não listada" })).toBeInTheDocument();
  });

  it("clicar na etapa anterior mostra as atividades dela; na futura, o playbook com a dica e sem caixa", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: /Entrada Lead/ }));
    expect(screen.getByText("Da etapa 1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /3\. Docs/ }));
    expect(screen.getByRole("heading", { name: "Atividades · 3. Docs" })).toBeInTheDocument();
    expect(screen.getByText("1º dia")).toBeInTheDocument();
    expect(screen.getByText("Coleta de docs")).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("a coluna Dias filtra a lista e 'Todas' volta", async () => {
    const user = abrir();
    const dias = screen.getByRole("navigation", { name: "Dias" });
    const [, primeiroDia] = within(dias).getAllByRole("button");
    await user.click(primeiroDia!);
    expect(screen.queryByText("Entrada de Lead")).toBeNull();
    await user.click(within(dias).getByRole("button", { name: "Todas" }));
    expect(screen.getByText("Entrada de Lead")).toBeInTheDocument();
  });

  it("a caixa conclui com o toast da Clint", async () => {
    const user = abrir();
    await user.click(screen.getByRole("checkbox", { name: "Ligação 1" }));
    expect(ativ.alternar).toHaveBeenCalledWith(expect.objectContaining({ id: "l" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Tarefa concluída com sucesso"));
  });

  it("a caixa da feita diz quem concluiu", () => {
    abrir();
    expect(screen.getByRole("checkbox", { name: "Feita" }).getAttribute("title")).toMatch(/Ana Atendente/);
  });

  it("o ⋮: 'Excluir atividade' só na criada à mão, com a confirmação da Clint", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: "Opções de Ligação 1" }));
    expect(screen.queryByRole("menuitem", { name: "Excluir atividade" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Marcar como concluída" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Opções de Avulsa" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir atividade" }));
    expect(screen.getByText("Tem certeza que deseja excluir esta atividade?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(ativ.excluir).toHaveBeenCalledWith("manual");
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Atividade removida com sucesso"));
  });

  it("a engrenagem é 'Configurar etapa' e abre a origem", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: "Configurar etapa" }));
    expect(engrenagem.aoConfigurar).toHaveBeenCalled();
  });

  it("o detalhe do WhatsApp mostra o balão com a variável trocada; o lápis edita e salva ao sair", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: /Entrada de Lead/ }));
    const detalhe = screen.getByRole("region", { name: "Detalhes da atividade" });
    expect(within(detalhe).getByText("Olá Ana, tudo bem?")).toBeInTheDocument();
    await user.click(within(detalhe).getByRole("button", { name: "Modo edição" }));
    const caixa = within(detalhe).getByRole("textbox", { name: "Conteúdo da atividade" });
    expect(caixa).toHaveValue("Olá [CONTACT.FIRST_NAME], tudo bem?");
    await user.type(caixa, "!");
    await user.click(within(detalhe).getByRole("button", { name: "Sair do modo edição" }));
    expect(ativ.editar).toHaveBeenCalledWith("w", { description: "Olá [CONTACT.FIRST_NAME], tudo bem?!" });
  });

  it("'Nova atividade' abre a janela da ficha na etapa vista", async () => {
    const user = abrir();
    await user.click(screen.getByRole("button", { name: "Nova atividade" }));
    const janela = screen.getByRole("dialog", { name: "Nova atividade" });
    expect(within(janela).getByText("2. Em atendimento")).toBeInTheDocument();
  });

  it("sem atividade na etapa atual: o vazio da Clint", () => {
    ativ.dados = { atividades: [], modelos: [] };
    abrir();
    expect(screen.getByText("Sem atividades configuradas")).toBeInTheDocument();
    expect(screen.getByText("Crie a primeira atividade para acompanhar este negócio.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-aba-atividades.test.tsx`
Expected: FAIL (a aba ainda é a da 1G).

- [ ] **Step 3: O trilho**

Create `components/escale/negocio/abas/atividades/TrilhoDeEtapas.tsx`:

```tsx
"use client";
import { useRef } from "react";

import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { Check, ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FotoDaFicha } from "../../FotoDaFicha";

/**
 * O TRILHO DAS ETAPAS (fork Escale, Fase 1I; print G01, P12). Clicar numa
 * etapa só MOSTRA as atividades dela (mover pelo trilho fica fora, Q6). A atual
 * tem a foto do contato com "{nome} está aqui"; as anteriores, ✓.
 */
export function TrilhoDeEtapas({
  lead,
  etapas,
  vista,
  aoVer,
}: {
  lead: Lead;
  etapas: Stage[];
  vista: string;
  aoVer: (id: string) => void;
}) {
  const t = useT();
  const trilho = useRef<HTMLOListElement>(null);
  const posicaoAtual = etapas.findIndex((s) => s.id === lead.stage_id);
  const primeiroNome = tituloDoCard(lead).trim().split(/\s+/)[0] ?? "";

  return (
    <div className="relative flex h-[98px] shrink-0 border-b border-casca-borda">
      <ol
        ref={trilho}
        aria-label={t("Etapas da origem")}
        className="flex min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto px-6 pt-3"
      >
        {etapas.map((s, i) => {
          const atual = s.id === lead.stage_id;
          const passada = posicaoAtual >= 0 && i < posicaoAtual;
          const vendo = s.id === vista;
          return (
            <li
              key={s.id}
              aria-current={atual ? "step" : undefined}
              className="relative flex w-[154px] shrink-0 flex-col items-center gap-2"
            >
              {i > 0 && <span aria-hidden className="absolute top-3 right-1/2 h-px w-full bg-casca-marca-media" />}
              <button
                type="button"
                aria-pressed={vendo}
                onClick={() => aoVer(s.id)}
                className="relative z-[1] flex flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border text-[11px] font-semibold",
                    atual
                      ? "border-casca-marca bg-casca-marca text-white"
                      : passada
                        ? "border-casca-marca bg-casca-marca-media text-casca-marca"
                        : "border-casca-marca-media bg-surface text-casca-marca",
                    vendo && !atual && "ring-2 ring-casca-marca",
                  )}
                >
                  {passada ? <Check size={12} aria-hidden /> : i + 1}
                </span>
                <span
                  className={cn(
                    "max-w-[146px] truncate px-1 text-xs",
                    vendo ? "font-semibold text-casca-marca" : "text-casca-texto-2",
                  )}
                >
                  {s.name}
                </span>
              </button>
              {atual ? (
                <DicaEscura texto={t("{nome} está aqui").replace("{nome}", primeiroNome)}>
                  <span>
                    <FotoDaFicha lead={lead} tamanho="trilho" />
                  </span>
                </DicaEscura>
              ) : null}
            </li>
          );
        })}
      </ol>
      <BotaoDaCasca
        variante="icone"
        aria-label={t("Mais etapas")}
        title={t("Mais etapas")}
        onClick={() => trilho.current?.scrollBy({ left: 400, behavior: "smooth" })}
        className="absolute top-3 right-4 border border-casca-borda bg-surface shadow-casca-painel"
      >
        <ChevronRight aria-hidden />
      </BotaoDaCasca>
    </div>
  );
}
```

O `scrollBy` não existe no jsdom. O botão só o chama no clique, e o teste não clica nele.

- [ ] **Step 4: A coluna Dias**

Create `components/escale/negocio/abas/atividades/ColunaDosDias.tsx`:

```tsx
"use client";
import { Fragment } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { DiaDaColuna } from "@/lib/escale/negocio/atividades";
import { List } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const CHIP = "relative flex h-[38px] w-10 flex-col items-center justify-center rounded-[6px] border bg-surface";

/**
 * A COLUNA "DIAS" (fork Escale, Fase 1I; prints G01 e 017): "Todas" e um chip
 * por dia com atividade (dia, semana ou "Hoje", o mês acima quando muda e o
 * selo vermelho das atrasadas). Some quando nenhuma atividade tem data (Clint).
 */
export function ColunaDosDias({
  dias,
  escolhido,
  aoEscolher,
}: {
  dias: DiaDaColuna[];
  escolhido: string | null;
  aoEscolher: (chave: string | null) => void;
}) {
  const t = useT();
  if (dias.length === 0) return null;
  const marca = (ativo: boolean) =>
    ativo
      ? "border-casca-borda shadow-[inset_3px_0_0_var(--color-casca-marca)] text-casca-marca"
      : "border-casca-borda text-casca-texto hover:bg-casca-raia";
  return (
    <nav aria-label={t("Dias")} className="flex w-[59px] shrink-0 flex-col items-center border-r border-casca-borda">
      <span className="flex h-10 items-center text-[11px] font-semibold text-casca-marca">{t("Dias")}</span>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto pt-2 pb-3">
        <button
          type="button"
          aria-label={t("Todas")}
          aria-pressed={escolhido === null}
          onClick={() => aoEscolher(null)}
          className={cn(CHIP, marca(escolhido === null))}
        >
          <List size={14} aria-hidden />
        </button>
        {dias.map((d) => (
          <Fragment key={d.chave}>
            {d.mes ? <span className="mt-2 text-[9px] font-semibold text-casca-meta">{d.mes}</span> : null}
            <button
              type="button"
              aria-label={`${d.dia} ${d.semana}`}
              aria-pressed={escolhido === d.chave}
              onClick={() => aoEscolher(d.chave)}
              className={cn(CHIP, marca(escolhido === d.chave))}
            >
              <span className="text-[13px] leading-none font-semibold">{d.dia}</span>
              <span className="text-[8px] font-semibold uppercase">{d.semana}</span>
              {d.atrasadas > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 grid size-[14px] place-items-center rounded-full bg-casca-alerta text-[9px] font-bold text-white">
                  {d.atrasadas}
                </span>
              ) : null}
            </button>
          </Fragment>
        ))}
      </div>
    </nav>
  );
}
```

Se a cerca `tailwind-tokens` recusar o `var(--color-casca-marca)` dentro da sombra, troque a barra por um `<span aria-hidden className="absolute inset-y-1 left-0 w-[3px] rounded-r bg-casca-marca" />` dentro do chip escolhido.

- [ ] **Step 5: A lista e o ⋮**

Create `components/escale/negocio/abas/atividades/ListaDeAtividades.tsx`:

```tsx
"use client";
import { useState } from "react";

import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import {
  podeExcluirAtividade,
  type AtividadeDoNegocio,
  type GrupoDaLista,
  type GrupoDoPlaybook,
} from "@/lib/escale/negocio/atividades";
import { horaDaTarefa } from "@/lib/escale/negocio/regras";
import { estaAtrasada } from "@/lib/tarefas/tipos";
import { Check, EllipsisVertical, EyeOff, Plus, Settings } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export interface AcoesDaAtividade {
  alternar: (a: AtividadeDoNegocio) => void;
  editarData: (a: AtividadeDoNegocio) => void;
  excluir: (a: AtividadeDoNegocio) => void;
}

const SELO_DO_GRUPO = "rounded-[5px] bg-casca-contador px-[7px] py-0.5 text-[9px] font-semibold text-casca-suave";

/**
 * A LISTA "PRÓXIMAS ATIVIDADES" (fork Escale, Fase 1I; prints G01, 003 e 017).
 * Grupos por dia (do mais cedo ao mais tarde); a linha com o ícone do tipo,
 * o título (riscado quando feita), a hora (vermelha quando atrasada), o olho da
 * não listada, a caixa de concluir (a dica diz quem concluiu) e o ⋮. Na etapa
 * futura, os grupos são o playbook por prazo relativo, sem caixa.
 */
export function ListaDeAtividades({
  titulo,
  dica,
  engrenagem,
  estado,
  grupos,
  previa,
  escolhidaId,
  aoEscolher,
  acoes,
  podeEditar,
  nomes,
  idioma,
  agora,
  aoNova,
  aoRecarregar,
}: {
  titulo: string;
  dica: string | null;
  engrenagem: { aoConfigurar?: () => void; dica: string };
  estado: "carregando" | "falhou" | "pronto";
  grupos: GrupoDaLista[];
  previa: GrupoDoPlaybook[] | null;
  escolhidaId: string | null;
  aoEscolher: (id: string) => void;
  acoes: AcoesDaAtividade;
  podeEditar: boolean;
  nomes: ReadonlyMap<string, string>;
  idioma: string;
  agora: Date;
  aoNova: () => void;
  aoRecarregar: () => void;
}) {
  const t = useT();
  const [excluindo, setExcluindo] = useState<AtividadeDoNegocio | null>(null);
  const vazio = previa ? previa.length === 0 : grupos.length === 0;

  return (
    <section aria-label={titulo} className="flex w-[450px] shrink-0 flex-col border-r border-casca-borda">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-casca-borda px-4">
        <span className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-[15px] font-semibold text-casca-texto">{titulo}</h2>
          {dica ? <AjudaDaCasca texto={dica} /> : null}
        </span>
        <BotaoDaCasca
          variante="icone"
          aria-label={t("Configurar etapa")}
          disabled={!engrenagem.aoConfigurar}
          title={engrenagem.aoConfigurar ? t("Configurar etapa") : engrenagem.dica}
          onClick={engrenagem.aoConfigurar}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Settings aria-hidden />
        </BotaoDaCasca>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {estado === "carregando" ? (
          <div className="grid gap-2 p-4" aria-label={t("Carregando…")}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-10 animate-pulse rounded-[6px] bg-casca-raia" />
            ))}
          </div>
        ) : estado === "falhou" ? (
          <div role="alert" className="flex flex-col items-start gap-2 px-4 py-6 text-xs text-casca-suave">
            {t("Erro ao buscar atividades. Tente novamente.")}
            <BotaoDaCasca variante="texto" tamanho="sm" onClick={aoRecarregar}>
              {t("Tentar de novo")}
            </BotaoDaCasca>
          </div>
        ) : vazio ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] font-semibold text-casca-texto">
              {previa ? t("Nenhuma atividade nessa etapa") : t("Sem atividades configuradas")}
            </p>
            {previa ? null : (
              <p className="mt-1 text-[12px] text-casca-suave">
                {t("Crie a primeira atividade para acompanhar este negócio.")}
              </p>
            )}
          </div>
        ) : previa ? (
          previa.map((g) => (
            <div key={g.chave}>
              <div className="flex items-center gap-2.5 px-4 pt-2 pb-1">
                <span className="text-[11.5px] font-semibold text-casca-texto">{g.rotulo}</span>
                <span className={SELO_DO_GRUPO}>{`${g.modelos.length} ${t("atividades")}`}</span>
              </div>
              <ul>
                {g.modelos.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      aria-pressed={m.id === escolhidaId}
                      onClick={() => aoEscolher(m.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border-l-[3px] py-3 pr-4 pl-4 text-left",
                        m.id === escolhidaId ? "border-casca-marca bg-casca-raia" : "border-transparent hover:bg-casca-raia",
                      )}
                    >
                      <IconeDoTipo tipo={m.tipo} className="shrink-0 text-casca-marca" />
                      <span className="truncate text-[13px] text-casca-texto">{m.titulo}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          grupos.map((g) => (
            <div key={g.chave}>
              <div className="flex items-center gap-2.5 px-4 pt-2 pb-1">
                <span className="text-[11.5px] font-semibold text-casca-texto">{g.rotulo ?? t("Sem prazo")}</span>
                <span className={SELO_DO_GRUPO}>
                  {g.itens.length === 1 ? t("1 atividade") : `${g.itens.length} ${t("atividades")}`}
                </span>
              </div>
              <ul>
                {g.itens.map((a) => (
                  <LinhaDaAtividade
                    key={a.id}
                    atividade={a}
                    ativa={a.id === escolhidaId}
                    aoEscolher={() => aoEscolher(a.id)}
                    acoes={{ ...acoes, excluir: (x) => setExcluindo(x) }}
                    podeEditar={podeEditar}
                    nomes={nomes}
                    idioma={idioma}
                    agora={agora}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
      <footer className="flex h-12 shrink-0 items-center border-t border-casca-borda px-4">
        <BotaoDaCasca
          variante="texto"
          tamanho="sm"
          disabled={!podeEditar}
          title={podeEditar ? undefined : t("Sem permissão")}
          onClick={aoNova}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Plus aria-hidden />
          {t("Nova atividade")}
        </BotaoDaCasca>
      </footer>
      <AlertDialog open={excluindo !== null} onOpenChange={(sim) => !sim && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Excluir atividade")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Tem certeza que deseja excluir esta atividade?")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => excluindo && acoes.excluir(excluindo)}>{t("Excluir")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function LinhaDaAtividade({
  atividade,
  ativa,
  aoEscolher,
  acoes,
  podeEditar,
  nomes,
  idioma,
  agora,
}: {
  atividade: AtividadeDoNegocio;
  ativa: boolean;
  aoEscolher: () => void;
  acoes: AcoesDaAtividade;
  podeEditar: boolean;
  nomes: ReadonlyMap<string, string>;
  idioma: string;
  agora: Date;
}) {
  const t = useT();
  const feita = atividade.status === "done";
  const atrasada = estaAtrasada(atividade, agora);
  const quem = atividade.concluida_por ? nomes.get(atividade.concluida_por) : null;
  const dicaDaCaixa = !podeEditar
    ? t("Sem permissão")
    : feita
      ? [t("Concluída"), quem, atividade.concluida_em ? new Date(atividade.concluida_em).toLocaleString(idioma) : null]
          .filter(Boolean)
          .join(" · ")
      : t("Marcar como concluída");

  return (
    <li
      className={cn(
        "flex items-center gap-2 border-l-[3px] pr-2",
        ativa ? "border-casca-marca bg-casca-raia" : "border-transparent hover:bg-casca-raia",
      )}
    >
      <button
        type="button"
        onClick={aoEscolher}
        aria-pressed={ativa}
        className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-4 text-left"
      >
        <IconeDoTipo tipo={atividade.tipo} className="shrink-0 text-casca-marca" />
        <span className="min-w-0 flex-1">
          <span
            className={cn("block truncate text-[13px] text-casca-texto", feita && "text-casca-meta line-through")}
          >
            {atividade.title}
          </span>
          {atividade.due_date ? (
            <span className={cn("block text-[11px]", atrasada ? "font-semibold text-casca-alerta" : "text-casca-suave")}>
              {horaDaTarefa(atividade.due_date, idioma)}
            </span>
          ) : null}
        </span>
      </button>
      {atividade.visibilidade === "nao_listada" ? (
        <DicaEscura texto={t("Essa atividade não será listada na visão de atividades")}>
          <span role="img" aria-label={t("Atividade não listada")} className="shrink-0 text-(--escale-nao-listada)">
            <EyeOff size={14} aria-hidden />
          </span>
        </DicaEscura>
      ) : null}
      <button
        type="button"
        role="checkbox"
        aria-checked={feita}
        aria-label={atividade.title}
        disabled={!podeEditar}
        title={dicaDaCaixa}
        onClick={() => acoes.alternar(atividade)}
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-[4px] border disabled:cursor-not-allowed disabled:opacity-60",
          feita ? "border-casca-marca bg-casca-marca text-white" : "border-casca-borda bg-surface",
        )}
      >
        {feita ? <Check size={12} aria-hidden /> : null}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`${t("Opções de")} ${atividade.title}`}
            disabled={!podeEditar}
            title={podeEditar ? undefined : t("Sem permissão")}
            className="grid size-6 shrink-0 place-items-center rounded-[4px] text-casca-suave hover:bg-casca-raia disabled:cursor-not-allowed"
          >
            <EllipsisVertical size={14} aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={CAIXA_DO_MENU}>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => acoes.alternar(atividade)}>
            {feita ? t("Reabrir atividade") : t("Marcar como concluída")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => acoes.editarData(atividade)}>
            {t("Editar data e hora")}
          </DropdownMenuItem>
          {podeExcluirAtividade(atividade) ? (
            <DropdownMenuItem className={cn(ITEM_DO_MENU, "text-casca-alerta")} onSelect={() => acoes.excluir(atividade)}>
              {t("Excluir atividade")}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
```

- [ ] **Step 6: O detalhe**

Create `components/escale/negocio/abas/atividades/DetalheDaAtividade.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { MAX_CONTEUDO_DA_ATIVIDADE, VAZIO_DO_CONTEUDO, type TipoDeAtividade } from "@/lib/escale/playbook/regras";
import { Pencil, Trash2 } from "@/lib/ui/icons-da-casca";

/** Quanto a gravação automática espera depois da última tecla (Clint: 750ms). */
const ESPERA_PARA_GRAVAR = 750;

/**
 * O DETALHE DA ATIVIDADE (fork Escale, Fase 1I; prints G01 e 017, P9).
 *
 * WhatsApp e Instagram mostram o balão da mensagem (com as variáveis já
 * trocadas); os outros tipos mostram o texto. O lápis liga o "Modo edição": a
 * caixa mostra o texto com as variáveis, e cada mudança grava sozinha 750ms
 * depois (como a Clint); sair do modo grava o que faltar. A lixeira só existe
 * para a atividade criada à mão. O `rodape` é o botão de executar do tipo
 * (Task 13).
 */
export function DetalheDaAtividade({
  tipo,
  titulo,
  conteudo,
  textoResolvido,
  editavel,
  aoSalvarConteudo,
  podeRemover,
  aoRemover,
  rodape,
}: {
  tipo: TipoDeAtividade;
  titulo: string;
  conteudo: string | null;
  textoResolvido: string;
  editavel: boolean;
  aoSalvarConteudo?: (texto: string) => void;
  podeRemover: boolean;
  aoRemover?: () => void;
  rodape?: ReactNode;
}) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(conteudo ?? "");
  const pendente = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mensagem = tipo === "whatsapp" || tipo === "instagram";

  useEffect(() => () => {
    if (pendente.current) clearTimeout(pendente.current);
  }, []);

  const gravarJa = (valor: string) => {
    if (pendente.current) clearTimeout(pendente.current);
    pendente.current = null;
    if (valor !== (conteudo ?? "")) aoSalvarConteudo?.(valor);
  };
  const mudar = (valor: string) => {
    setTexto(valor);
    if (pendente.current) clearTimeout(pendente.current);
    pendente.current = setTimeout(() => gravarJa(valor), ESPERA_PARA_GRAVAR);
  };
  const alternarEdicao = () => {
    if (editando) gravarJa(texto);
    else setTexto(conteudo ?? "");
    setEditando((e) => !e);
  };

  return (
    <section aria-label={t("Detalhes da atividade")} className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-casca-borda px-4">
        <h3 className="flex min-w-0 items-center gap-2 text-[13px] text-casca-texto">
          <IconeDoTipo tipo={tipo} className="shrink-0 text-casca-marca" />
          <span className="truncate">{titulo}</span>
        </h3>
        <AjudaDaCasca texto={t("Ajuda com as atividades")} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {editando ? (
          <textarea
            aria-label={t("Conteúdo da atividade")}
            value={texto}
            maxLength={MAX_CONTEUDO_DA_ATIVIDADE}
            placeholder={t(VAZIO_DO_CONTEUDO[tipo])}
            onChange={(e) => mudar(e.target.value)}
            className="h-full min-h-[200px] w-full resize-none rounded-[6px] border border-casca-borda bg-surface p-3 text-[13.5px] leading-6 text-casca-texto outline-hidden focus:ring-2 focus:ring-casca-marca"
          />
        ) : !textoResolvido.trim() ? (
          <div className="text-[13px]">
            {mensagem ? <p className="font-semibold text-casca-texto">{t("Nenhuma mensagem adicionada")}</p> : null}
            <p className="text-casca-suave">{t(VAZIO_DO_CONTEUDO[tipo])}</p>
          </div>
        ) : mensagem ? (
          <p className="max-w-[520px] rounded-[10px] border border-casca-borda-msg bg-casca-caixa-msg px-3.5 py-2.5 text-[13.5px] whitespace-pre-line text-casca-texto">
            {textoResolvido}
          </p>
        ) : (
          <p className="text-[13px] whitespace-pre-line text-casca-texto-2">{textoResolvido}</p>
        )}
      </div>
      <footer className="flex h-[52px] shrink-0 items-center gap-3 border-t border-casca-borda px-4">
        {rodape}
        <BotaoDaCasca
          variante="icone"
          aria-label={editando ? t("Sair do modo edição") : t("Modo edição")}
          disabled={!editavel}
          title={editavel ? (editando ? t("Sair do modo edição") : t("Modo edição")) : t("Sem permissão")}
          onClick={alternarEdicao}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Pencil aria-hidden />
        </BotaoDaCasca>
        {podeRemover && aoRemover ? (
          <BotaoDaCasca
            variante="icone"
            aria-label={t("Remover atividade do negócio")}
            title={t("Remover atividade do negócio")}
            onClick={aoRemover}
          >
            <Trash2 aria-hidden />
          </BotaoDaCasca>
        ) : null}
      </footer>
    </section>
  );
}
```

- [ ] **Step 7: A aba reescrita**

Em `components/escale/negocio/ConteudoDaAba.tsx`, troque só a linha do `case "atividades"` por `return <AbaAtividades lead={ficha.lead} stages={ficha.stages} pipeline={ficha.pipeline} />;`.

Replace `components/escale/negocio/abas/AbaAtividades.tsx` inteiro por:

```tsx
"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useContact } from "@/hooks/contacts/useContact";
import { useAtividadesDoNegocio } from "@/hooks/escale/useAtividadesDoNegocio";
import { useActiveOrg, usePermission, useUser } from "@/hooks/auth/AuthProvider";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { roleAtLeast } from "@/lib/auth/types";
import { useEngrenagemDaOrigem } from "@/lib/escale/configuracoes/abrir";
import {
  atividadesDaVista,
  chaveDoDia,
  dadosDasVariaveis,
  diasDaColuna,
  etapasDoTrilho,
  gruposDaLista,
  gruposDoPlaybook,
  podeExcluirAtividade,
  type AtividadeDoNegocio,
} from "@/lib/escale/negocio/atividades";
import { resolverVariaveis } from "@/lib/escale/playbook/variaveis";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Pipeline, Stage } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import type { Lead } from "@/lib/types/leads";

import { ColunaDosDias } from "./atividades/ColunaDosDias";
import { DetalheDaAtividade } from "./atividades/DetalheDaAtividade";
import { JanelaEditarDataEHora } from "./atividades/JanelaEditarDataEHora";
import { JanelaNovaAtividadeDoNegocio } from "./atividades/JanelaNovaAtividadeDoNegocio";
import { ListaDeAtividades } from "./atividades/ListaDeAtividades";
import { TrilhoDeEtapas } from "./atividades/TrilhoDeEtapas";

/**
 * A ABA ATIVIDADES DA FICHA (fork Escale, Fase 1I; C19–C21; prints G01, 017 e 003).
 *
 * O trilho escolhe a etapa VISTA (só para ver, Q6). Na atual e nas anteriores,
 * a coluna Dias e a lista das atividades dela; na futura, o playbook dela por
 * prazo relativo, com a dica da Clint. A caixa conclui (e, sem dono, quem
 * concluiu vira o dono: o hook). O detalhe mostra o texto com as variáveis
 * trocadas; o rodapé de cada tipo (enviar o WhatsApp, chamar) é da Task 13.
 */
export function AbaAtividades({ lead, stages, pipeline }: { lead: Lead; stages: Stage[]; pipeline: Pipeline }) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const org = useActiveOrg();
  const user = useUser();
  const podeEditar = usePermission("pipeline.move_card");
  const ativ = useAtividadesDoNegocio(lead);
  // As variáveis dos campos personalizados (P10): as definições da origem e os valores do contato.
  const contato = useContact(lead.contact_id ?? "");
  const defs = useMemo(() => camposDoFunil(pipeline.settings ?? null), [pipeline.settings]);
  const { data: membros } = useAssignableMembers(true);
  const nomes = useMemo(
    () => new Map((membros ?? []).map((m) => [m.user_id, m.full_name ?? ""] as const)),
    [membros],
  );
  const etapas = useMemo(() => etapasDoTrilho(stages), [stages]);
  const doTrilho = useMemo(() => new Set(etapas.map((e) => e.id)), [etapas]);
  const engrenagem = useEngrenagemDaOrigem(lead.pipeline_id, roleAtLeast(org?.role, "manager"), "etapas");

  const [vista, setVista] = useState(lead.stage_id);
  const [dia, setDia] = useState<string | null>(null);
  const [escolhidaId, setEscolhidaId] = useState<string | null>(null);
  const [nova, setNova] = useState(false);
  const [editandoData, setEditandoData] = useState<AtividadeDoNegocio | null>(null);

  const agora = new Date();
  const etapaVista = etapas.find((e) => e.id === vista) ?? null;
  const etapaAtual = etapas.find((e) => e.id === lead.stage_id) ?? null;
  const futura =
    vista !== lead.stage_id && etapas.findIndex((e) => e.id === vista) > etapas.findIndex((e) => e.id === lead.stage_id);
  const daVista = atividadesDaVista(ativ.dados?.atividades ?? [], vista, lead.stage_id, doTrilho);
  const dias = futura ? [] : diasDaColuna(daVista, agora, idioma, t);
  const filtradas = dia ? daVista.filter((a) => a.due_date && chaveDoDia(new Date(a.due_date)) === dia) : daVista;
  const grupos = gruposDaLista(filtradas, agora, idioma, t);
  const previa = futura ? gruposDoPlaybook(ativ.dados?.modelos ?? [], vista, t) : null;

  const escolhida = futura ? null : (filtradas.find((a) => a.id === escolhidaId) ?? grupos[0]?.itens[0] ?? null);
  const modeloEscolhido = previa
    ? (previa.flatMap((g) => g.modelos).find((m) => m.id === escolhidaId) ?? previa[0]?.modelos[0] ?? null)
    : null;

  const dados = dadosDasVariaveis(
    lead,
    tituloDoCard(lead),
    etapaAtual?.name ?? null,
    { nome: user.full_name, email: user.email },
    org?.name ?? null,
    { defs, contato: contato.data?.data.custom_fields ?? null, t },
  );
  const resolver = (texto: string | null) => resolverVariaveis(texto ?? "", dados);

  const verEtapa = (id: string) => {
    setVista(id);
    setDia(null);
    setEscolhidaId(null);
  };
  const acoes = {
    alternar: async (a: AtividadeDoNegocio) => {
      try {
        const r = await ativ.alternar(a);
        toast.success(r === "concluida" ? t("Tarefa concluída com sucesso") : t("Marcação de tarefa removida com sucesso"));
      } catch {
        toast.error(t("Erro ao atualizar atividade. Tente novamente."));
      }
    },
    editarData: (a: AtividadeDoNegocio) => setEditandoData(a),
    excluir: async (a: AtividadeDoNegocio) => {
      try {
        await ativ.excluir(a.id);
        toast.success(t("Atividade removida com sucesso"));
      } catch {
        toast.error(t("Erro ao atualizar atividade. Tente novamente."));
      }
    },
  };
  const salvarConteudo = (a: AtividadeDoNegocio) => (texto: string) => {
    ativ.editar(a.id, { description: texto.trim() ? texto : null }).catch(() => {
      toast.error(t("Erro ao atualizar atividade. Tente novamente."));
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full min-h-0 flex-col">
        <TrilhoDeEtapas lead={lead} etapas={etapas} vista={vista} aoVer={verEtapa} />
        <div className="flex min-h-0 flex-1">
          <ColunaDosDias dias={dias} escolhido={dia} aoEscolher={setDia} />
          <ListaDeAtividades
            titulo={vista === lead.stage_id ? t("Próximas atividades") : `${t("Atividades")} · ${etapaVista?.name ?? ""}`}
            dica={
              futura
                ? t(
                    "O negócio ainda não está na etapa {stage}. Estas são as atividades previstas, agrupadas por quando devem ser feitas após a entrada; as datas só são definidas quando o negócio chega aqui.",
                  ).replace("{stage}", etapaVista?.name ?? "")
                : null
            }
            engrenagem={{ aoConfigurar: engrenagem.aoConfigurar, dica: engrenagem.dicaDaEngrenagem }}
            estado={ativ.carregando ? "carregando" : ativ.falhou ? "falhou" : "pronto"}
            grupos={grupos}
            previa={previa}
            escolhidaId={escolhida?.id ?? modeloEscolhido?.id ?? null}
            aoEscolher={setEscolhidaId}
            acoes={{ alternar: (a) => void acoes.alternar(a), editarData: acoes.editarData, excluir: (a) => void acoes.excluir(a) }}
            podeEditar={podeEditar && !futura}
            nomes={nomes}
            idioma={idioma}
            agora={agora}
            aoNova={() => setNova(true)}
            aoRecarregar={ativ.recarregar}
          />
          {escolhida ? (
            <DetalheDaAtividade
              key={escolhida.id}
              tipo={escolhida.tipo}
              titulo={escolhida.title}
              conteudo={escolhida.description}
              textoResolvido={resolver(escolhida.description)}
              editavel={podeEditar}
              aoSalvarConteudo={salvarConteudo(escolhida)}
              podeRemover={podeEditar && podeExcluirAtividade(escolhida)}
              aoRemover={() => void acoes.excluir(escolhida)}
            />
          ) : modeloEscolhido ? (
            <DetalheDaAtividade
              key={modeloEscolhido.id}
              tipo={modeloEscolhido.tipo}
              titulo={modeloEscolhido.titulo}
              conteudo={modeloEscolhido.conteudo}
              textoResolvido={resolver(modeloEscolhido.conteudo)}
              editavel={false}
              podeRemover={false}
            />
          ) : (
            <section aria-label={t("Detalhes da atividade")} className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="text-[13px] font-semibold text-casca-texto">{t("Nenhuma atividade selecionada")}</p>
              <p className="mt-1 text-[12px] text-casca-suave">
                {t("Escolha uma atividade na lista ao lado para visualizar os detalhes.")}
              </p>
            </section>
          )}
        </div>
      </div>
      {nova && etapaVista ? (
        <JanelaNovaAtividadeDoNegocio
          aberta
          etapa={{ id: etapaVista.id, name: etapaVista.name }}
          aoFechar={() => setNova(false)}
          aoCriar={ativ.criar}
        />
      ) : null}
      {editandoData ? (
        <JanelaEditarDataEHora
          aberta
          atividade={editandoData}
          aoFechar={() => setEditandoData(null)}
          aoSalvar={(iso) => ativ.editar(editandoData.id, { due_date: iso })}
        />
      ) : null}
    </TooltipProvider>
  );
}
```

Em `tests/unit/escale-ficha-abas-atividades-historico.test.tsx`, apague o `describe` da aba Atividades (os casos dela agora estão em `escale-ficha-aba-atividades.test.tsx`), o import de `AbaAtividades`, o mock de `useTasks` e o `tarefas.lista`. Se o arquivo ficar sem nenhum `describe`, porque a 1H já tirou o do Histórico, apague o arquivo (`git rm`).

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-aba-atividades.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/vocabulario-do-funil.test.ts && corepack pnpm prettier --write components/escale/negocio/abas/atividades/*.tsx components/escale/negocio/abas/AbaAtividades.tsx tests/unit/escale-ficha-aba-atividades.test.tsx && corepack pnpm eslint components/escale/negocio/abas && corepack pnpm typecheck`
Expected: PASS.
- **Nomes das cercas:** se `vocabulario-do-funil` tiver outro nome, ache com `ls tests/unit | grep -i vocabulario`.
- **`full_name` e `email`:** se o `useUser` não tiver os dois, eles estão em `AuthUser` (`lib/auth/types.ts`). Use o que existir e mantenha a assinatura de `dadosDasVariaveis`.
- **`useAssignableMembers`:** se o argumento dele não for um booleano, use o mesmo que o `DonoDaFicha` passa.

- [ ] **Step 9: Commit**

```bash
git add components/escale/negocio/abas components/escale/negocio/ConteudoDaAba.tsx tests/unit/escale-ficha-aba-atividades.test.tsx tests/unit/escale-ficha-abas-atividades-historico.test.tsx
git commit -m "feat(escale): aba Atividades da ficha com trilho, Dias, lista e detalhe (Fase 1I)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 13: Executar em um clique: enviar o WhatsApp (C20)

**Abra antes:** o print 017.

**Files:**
- Create:
  - `hooks/escale/useEnviarAtividade.ts`;
  - `components/escale/negocio/abas/atividades/RodapeDoTipo.tsx`, `RodapeDoWhatsapp.tsx` e `JanelaDeOutroAtendente.tsx`;
  - `tests/unit/escale-ficha-atividade-whatsapp.test.tsx`.
- Modify: `components/escale/negocio/abas/AbaAtividades.tsx` (o `rodape` do detalhe).

**Interfaces:**
- Consumes:
  - Task 8: `dispositivoDeEnvio`, `linkDoWhatsappWeb`, `linkDoAppWhatsapp`;
  - Task 10: `alternar`;
  - Task 4: `IconeDoTipo`, `CelularDesligado`;
  - do original: `useChannelSessions` e `channelLabel` (`hooks/channels/useChannelSessions`), `useAssignableMembers`, e as rotas `POST /api/v1/conversations/open-with-contact`, `GET /api/v1/conversations/[id]`, `POST /api/v1/conversations/[id]/claim` e `POST /api/v1/messages`.
- Produces:
  - `useEnviarAtividade(lead, alternar)`, que devolve `{ enviar(a, texto, assumir?), enviando, conversaDoContato() }`;
  - `ResultadoDoEnvio = { tipo: "enviada"; assumiu } | { tipo: "outro-atendente"; atendenteId; conversaId }`;
  - `RodapeDoTipo({ lead, atividade, texto, alternar })`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-atividade-whatsapp.test.tsx`:

```tsx
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useUser: () => ({ id: "u-eu" }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u-outro", full_name: "Ana Atendente" }] }),
}));
const canais = vi.hoisted(() => ({ lista: [] as unknown[] }));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: canais.lista }),
  channelLabel: (c: { display_name: string | null }) => c.display_name ?? "",
}));

import { RodapeDoTipo } from "@/components/escale/negocio/abas/atividades/RodapeDoTipo";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEnviarAtividade } from "@/hooks/escale/useEnviarAtividade";
import { apiClient } from "@/lib/api/client";
import type { AtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import type { Lead } from "@/lib/types/leads";
import { toast } from "sonner";

/** FORK ESCALE · Fase 1I (C20, P14, P15): enviar a mensagem pronta em um clique, como a Clint. */
const LEAD = {
  id: "n1",
  contact_id: "c1",
  title: "Ana Souza",
  contact_phone: "+5543999990000",
  custom_fields: {},
  conversa: { id: "cv1", preview: null, last_message_at: null, unread: 0 },
} as unknown as Lead;
const ATV = { id: "w", status: "pending", tipo: "whatsapp", title: "Entrada de Lead" } as AtividadeDoNegocio;
const WORKING = { id: "s1", status: "WORKING", created_at: "2026-01-01", display_name: "Comercial", metadata: null };

function respostas(atendente: string | null) {
  vi.mocked(apiClient.get).mockResolvedValue({ data: { assigned_to_user_id: atendente } });
  vi.mocked(apiClient.post).mockImplementation(async (url: string) =>
    url.endsWith("open-with-contact") ? { data: { conversation_id: "cv2" } } : { data: {} },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  canais.lista = [WORKING];
});

describe("useEnviarAtividade", () => {
  it("conversa livre: envia o texto e conclui", async () => {
    respostas(null);
    const alternar = vi.fn(async () => "concluida");
    const { result } = renderHook(() => useEnviarAtividade(LEAD, alternar));
    let r: unknown;
    await act(async () => {
      r = await result.current.enviar(ATV, "Olá Ana");
    });
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/conversations/cv1");
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/messages", { conversation_id: "cv1", body: "Olá Ana", type: "text" });
    expect(alternar).toHaveBeenCalledWith(ATV);
    expect(r).toEqual({ tipo: "enviada", assumiu: false });
  });

  it("sem conversa: abre pelo contato antes de enviar", async () => {
    respostas(null);
    const { result } = renderHook(() => useEnviarAtividade({ ...LEAD, conversa: null } as Lead, vi.fn()));
    await act(async () => {
      await result.current.enviar(ATV, "Oi");
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/conversations/open-with-contact", { contact_id: "c1" });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/messages", { conversation_id: "cv2", body: "Oi", type: "text" });
  });

  it("outro atendente: não envia e devolve quem é; assumir faz o claim e envia", async () => {
    respostas("u-outro");
    const alternar = vi.fn(async () => "concluida");
    const { result } = renderHook(() => useEnviarAtividade(LEAD, alternar));
    let r: unknown;
    await act(async () => {
      r = await result.current.enviar(ATV, "Oi");
    });
    expect(r).toEqual({ tipo: "outro-atendente", atendenteId: "u-outro", conversaId: "cv1" });
    expect(apiClient.post).not.toHaveBeenCalledWith("/api/v1/messages", expect.anything());
    await act(async () => {
      r = await result.current.enviar(ATV, "Oi", { conversaId: "cv1", atendenteId: "u-outro" });
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/conversations/cv1/claim", { expected_assignee: "u-outro" });
    expect(r).toEqual({ tipo: "enviada", assumiu: true });
  });

  it("atividade já concluída: envia sem reabrir", async () => {
    respostas(null);
    const alternar = vi.fn();
    const { result } = renderHook(() => useEnviarAtividade(LEAD, alternar));
    await act(async () => {
      await result.current.enviar({ ...ATV, status: "done" }, "Oi");
    });
    expect(alternar).not.toHaveBeenCalled();
  });
});

describe("rodapé do WhatsApp", () => {
  const montar = (texto = "Olá Ana", lead: Lead = LEAD) => {
    const alternar = vi.fn(async () => "concluida");
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(
      <TooltipProvider>
        <RodapeDoTipo lead={lead} atividade={ATV} texto={texto} alternar={alternar} />
      </TooltipProvider>,
    );
    return { user, alternar };
  };

  it("sem canal, canal parado ou sem texto: 'Enviar mensagem' desligado com o motivo da Clint", () => {
    canais.lista = [];
    const { unmount } = render(
      <TooltipProvider>
        <RodapeDoTipo lead={LEAD} atividade={ATV} texto="Oi" alternar={vi.fn()} />
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: /Enviar mensagem/ })).toHaveAttribute(
      "title",
      "Você não possui um dispositivo vinculado!",
    );
    unmount();
    canais.lista = [{ ...WORKING, status: "STOPPED" }];
    montar();
    expect(screen.getByRole("button", { name: /Enviar mensagem/ })).toHaveAttribute("title", "Seu dispositivo está desconectado!");
  });

  it("Enter envia na hora: ao abrir, o foco já está em 'Enviar mensagem' (resposta de 17/10)", async () => {
    respostas(null);
    const { user } = montar();
    expect(screen.getByRole("button", { name: /Enviar mensagem/ })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("A atividade foi realizada com sucesso!"));
  });

  it("envia, conclui e mostra o toast da Clint", async () => {
    respostas(null);
    const { user, alternar } = montar();
    await user.click(screen.getByRole("button", { name: /Enviar mensagem/ }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("A atividade foi realizada com sucesso!"));
    expect(alternar).toHaveBeenCalled();
  });

  it("contato com outro atendente: a janela da Clint; confirmar assume e envia", async () => {
    respostas("u-outro");
    const { user } = montar();
    await user.click(screen.getByRole("button", { name: /Enviar mensagem/ }));
    expect(await screen.findByText("Este contato está em atendimento com o usuário Ana Atendente")).toBeInTheDocument();
    expect(screen.getByText("Você gostaria de assumir o atendimento e enviar a mensagem mesmo assim?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Atendimento assumido e mensagem enviada com sucesso!"),
    );
  });

  it("o ▾ abre no WhatsApp Web com o texto", async () => {
    const abrir = vi.spyOn(window, "open").mockReturnValue(null);
    const { user } = montar();
    await user.click(screen.getByRole("button", { name: "Mais opções de envio" }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir no WhatsApp Web" }));
    expect(abrir).toHaveBeenCalledWith(
      "https://web.whatsapp.com/send?phone=5543999990000&text=Ol%C3%A1%20Ana",
      "_blank",
      "noopener",
    );
    expect(screen.queryByRole("menuitem", { name: "Alterar dispositivo" })).toBeNull();
  });
});

describe("rodapé de outros tipos", () => {
  it("ligação: 'Chamar Ana' fica 'Em breve' (resposta de 17/10)", () => {
    render(
      <TooltipProvider>
        <RodapeDoTipo lead={LEAD} atividade={{ ...ATV, tipo: "ligacao" }} texto="" alternar={vi.fn()} />
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: "Chamar Ana" })).toHaveAttribute("title", "Em breve");
  });
  it("instagram e email: o botão de executar fica 'Em breve'; tarefa não tem botão", () => {
    const { rerender } = render(
      <TooltipProvider>
        <RodapeDoTipo lead={LEAD} atividade={{ ...ATV, tipo: "email" }} texto="" alternar={vi.fn()} />
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: "Enviar email" })).toHaveAttribute("title", "Em breve");
    rerender(
      <TooltipProvider>
        <RodapeDoTipo lead={LEAD} atividade={{ ...ATV, tipo: "tarefa" }} texto="" alternar={vi.fn()} />
      </TooltipProvider>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

O último `queryByRole("menuitem", { name: "Alterar dispositivo" })` confere que o menu fechou depois do clique. O item existe, desligado, enquanto o menu está aberto.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-atividade-whatsapp.test.tsx`
Expected: FAIL (os módulos não existem).

- [ ] **Step 3: O hook do envio**

Create `hooks/escale/useEnviarAtividade.ts`:

```ts
"use client";
import { useState } from "react";

import { useUser } from "@/hooks/auth/AuthProvider";
import { apiClient } from "@/lib/api/client";
import type { AtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import { MAX_CONTEUDO_DA_ATIVIDADE } from "@/lib/escale/playbook/regras";
import type { Lead } from "@/lib/types/leads";

export type ResultadoDoEnvio =
  | { tipo: "enviada"; assumiu: boolean }
  | { tipo: "outro-atendente"; atendenteId: string; conversaId: string };

/**
 * ENVIAR A MENSAGEM DA ATIVIDADE (fork Escale, Fase 1I; C20, P14), como a
 * Clint: sem confirmação, a não ser que o contato esteja com OUTRA pessoa.
 *
 * 1. A conversa do contato: a que o quadro já trouxe, ou a que o
 *    `open-with-contact` reabre ou cria (o mesmo do "Abrir conversa" do card).
 * 2. Quem atende: com outra pessoa, devolve "outro-atendente" sem enviar; a
 *    tela pergunta e, confirmando, chama de novo com `assumir` (o claim com
 *    `expected_assignee`, que só toma a conversa se ela ainda for daquela pessoa).
 * 3. Envia pelo `POST /api/v1/messages` do inbox e conclui a atividade (com
 *    a regra do dono, C21). O texto já vem com as variáveis trocadas.
 */
export function useEnviarAtividade(lead: Lead, alternar: (a: AtividadeDoNegocio) => Promise<unknown>) {
  const user = useUser();
  const [enviando, setEnviando] = useState(false);

  async function conversaDoContato(): Promise<string> {
    if (lead.conversa?.id) return lead.conversa.id;
    const r = await apiClient.post<{ data: { conversation_id: string } }>("/api/v1/conversations/open-with-contact", {
      contact_id: lead.contact_id,
    });
    return r.data.conversation_id;
  }

  async function enviar(
    a: AtividadeDoNegocio,
    texto: string,
    assumir?: { conversaId: string; atendenteId: string },
  ): Promise<ResultadoDoEnvio> {
    setEnviando(true);
    try {
      const conversaId = assumir?.conversaId ?? (await conversaDoContato());
      if (assumir) {
        await apiClient.post(`/api/v1/conversations/${conversaId}/claim`, { expected_assignee: assumir.atendenteId });
      } else {
        const conversa = await apiClient.get<{ data: { assigned_to_user_id: string | null } }>(
          `/api/v1/conversations/${conversaId}`,
        );
        const atendente = conversa.data.assigned_to_user_id;
        if (atendente && atendente !== user.id) return { tipo: "outro-atendente", atendenteId: atendente, conversaId };
      }
      await apiClient.post("/api/v1/messages", {
        conversation_id: conversaId,
        body: texto.slice(0, MAX_CONTEUDO_DA_ATIVIDADE),
        type: "text",
      });
      if (a.status !== "done") await alternar(a);
      return { tipo: "enviada", assumiu: !!assumir };
    } finally {
      setEnviando(false);
    }
  }

  return { enviar, enviando, conversaDoContato };
}
```

- [ ] **Step 4: A janela "outro atendente"**

Create `components/escale/negocio/abas/atividades/JanelaDeOutroAtendente.tsx`:

```tsx
"use client";
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
import { useT } from "@/hooks/i18n/useT";

/** "ENVIAR MENSAGEM DE WHATSAPP" (fork Escale, Fase 1I; P14): o contato está com outra pessoa (texto da Clint). */
export function JanelaDeOutroAtendente({
  aberta,
  nome,
  aoCancelar,
  aoConfirmar,
}: {
  aberta: boolean;
  nome: string;
  aoCancelar: () => void;
  aoConfirmar: () => void;
}) {
  const t = useT();
  return (
    <AlertDialog open={aberta} onOpenChange={(sim) => !sim && aoCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("Enviar mensagem de WhatsApp")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="grid gap-1">
              <p>{t("Este contato está em atendimento com o usuário {nome}").replace("{nome}", nome)}</p>
              <p>{t("Você gostaria de assumir o atendimento e enviar a mensagem mesmo assim?")}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
          <AlertDialogAction onClick={aoConfirmar}>{t("Confirmar")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 5: O rodapé do WhatsApp**

Create `components/escale/negocio/abas/atividades/RodapeDoWhatsapp.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CelularDesligado, IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { DicaEscura } from "@/components/escale/origens/DicaEscura";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useEnviarAtividade } from "@/hooks/escale/useEnviarAtividade";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import {
  dispositivoDeEnvio,
  linkDoAppWhatsapp,
  linkDoWhatsappWeb,
  type AtividadeDoNegocio,
} from "@/lib/escale/negocio/atividades";
import type { Lead } from "@/lib/types/leads";
import { ChevronDown, Smartphone } from "@/lib/ui/icons-da-casca";

import { JanelaDeOutroAtendente } from "./JanelaDeOutroAtendente";

/**
 * O RODAPÉ DO WHATSAPP (fork Escale, Fase 1I; print 017, P14, P15).
 * "Enviar mensagem" (clique ou Enter: envia na hora) com o ▾ (o ▾: "Alterar dispositivo" em breve, "Abrir em
 * Conversas", "Abrir no WhatsApp Web", "Abrir no aplicativo WhatsApp") e o
 * celular, que diz por qual canal sai a mensagem ou por que não sai.
 */
export function RodapeDoWhatsapp({
  lead,
  atividade,
  texto,
  alternar,
}: {
  lead: Lead;
  atividade: AtividadeDoNegocio;
  texto: string;
  alternar: (a: AtividadeDoNegocio) => Promise<unknown>;
}) {
  const t = useT();
  const router = useRouter();
  const { data: sessoes } = useChannelSessions();
  const { data: membros } = useAssignableMembers(true);
  const { enviar, enviando, conversaDoContato } = useEnviarAtividade(lead, alternar);
  const [outro, setOutro] = useState<{ conversaId: string; atendenteId: string } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);

  // Resposta de 17/10 (Q7): Enter envia na hora, como o clique. O detalhe remonta a cada
  // atividade escolhida; o foco vai para "Enviar mensagem", e o Enter do botão envia.
  useEffect(() => {
    botao.current?.focus({ preventScroll: true });
  }, []);

  const dispositivo = dispositivoDeEnvio(sessoes ?? []);
  const sessao = dispositivo.tipo === "conectado" ? (sessoes ?? []).find((s) => s.id === dispositivo.sessaoId) : undefined;
  const telefone = lead.contact_phone ?? "";
  const semDispositivo =
    dispositivo.tipo === "nenhum"
      ? t("Você não possui um dispositivo vinculado!")
      : dispositivo.tipo === "desconectado"
        ? t("Seu dispositivo está desconectado!")
        : null;
  const motivo = !lead.contact_id
    ? t("Este negócio não tem contato.")
    : (semDispositivo ?? (!texto.trim() ? t("Nenhuma mensagem adicionada") : null));
  const nomeDoAtendente = (id: string | undefined) =>
    (membros ?? []).find((m) => m.user_id === id)?.full_name ?? t("Sem nome");

  const executar = async (assumir?: { conversaId: string; atendenteId: string }) => {
    try {
      const r = await enviar(atividade, texto, assumir);
      if (r.tipo === "outro-atendente") {
        setOutro({ conversaId: r.conversaId, atendenteId: r.atendenteId });
        return;
      }
      setOutro(null);
      toast.success(
        r.assumiu ? t("Atendimento assumido e mensagem enviada com sucesso!") : t("A atividade foi realizada com sucesso!"),
      );
    } catch {
      toast.error(t("Não consegui enviar a mensagem. Tente de novo."));
    }
  };

  const abrirEmConversas = async () => {
    try {
      router.push(`/app/inbox?id=${await conversaDoContato()}`);
    } catch {
      toast.error(t("Não consegui enviar a mensagem. Tente de novo."));
    }
  };

  return (
    <>
      <span className="inline-flex">
        <button
          ref={botao}
          type="button"
          disabled={!!motivo || enviando}
          title={motivo ?? undefined}
          onClick={() => void executar()}
          className="flex h-[38px] items-center gap-2 rounded-l-[4px] bg-casca-marca px-4 text-[14px] font-semibold text-white hover:bg-casca-marca-forte disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconeDoTipo tipo="whatsapp" tamanho={18} />
          {enviando ? t("Enviando…") : t("Enviar mensagem")}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("Mais opções de envio")}
              className="grid h-[38px] w-9 place-items-center rounded-r-[4px] border-l border-white/40 bg-casca-marca text-white hover:bg-casca-marca-forte"
            >
              <ChevronDown size={16} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={CAIXA_DO_MENU}>
            <DropdownMenuItem disabled title={t("Em breve")} className={ITEM_DO_MENU}>
              {t("Alterar dispositivo")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!lead.contact_id} className={ITEM_DO_MENU} onSelect={() => void abrirEmConversas()}>
              {t("Abrir em Conversas")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!telefone}
              className={ITEM_DO_MENU}
              onSelect={() => window.open(linkDoWhatsappWeb(telefone, texto), "_blank", "noopener")}
            >
              {t("Abrir no WhatsApp Web")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!telefone}
              className={ITEM_DO_MENU}
              onSelect={() => {
                window.location.href = linkDoAppWhatsapp(telefone, texto);
              }}
            >
              {t("Abrir no aplicativo WhatsApp")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
      <DicaEscura
        texto={
          dispositivo.tipo === "conectado"
            ? `${t("Você está enviando com o dispositivo:")} ${sessao ? channelLabel(sessao, t) : ""}`
            : (semDispositivo ?? "")
        }
      >
        <span
          role="img"
          aria-label={t("Dispositivo")}
          className={dispositivo.tipo === "conectado" ? "text-casca-marca" : "text-casca-alerta"}
        >
          {dispositivo.tipo === "conectado" ? <Smartphone size={20} aria-hidden /> : <CelularDesligado />}
        </span>
      </DicaEscura>
      <JanelaDeOutroAtendente
        aberta={outro !== null}
        nome={nomeDoAtendente(outro?.atendenteId)}
        aoCancelar={() => setOutro(null)}
        aoConfirmar={() => outro && void executar(outro)}
      />
    </>
  );
}

```

- [ ] **Step 6: O rodapé por tipo**

Create `components/escale/negocio/abas/atividades/RodapeDoTipo.tsx`:

```tsx
"use client";
import { IconeDoTipo } from "@/components/escale/atividades/IconeDoTipo";
import { useT } from "@/hooks/i18n/useT";
import type { AtividadeDoNegocio } from "@/lib/escale/negocio/atividades";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";

import { RodapeDoWhatsapp } from "./RodapeDoWhatsapp";

const BOTAO =
  "flex h-[38px] items-center gap-2 rounded-[4px] bg-casca-marca px-4 text-[14px] font-semibold text-white hover:bg-casca-marca-forte disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-60";

/**
 * O BOTÃO DE EXECUTAR DE CADA TIPO (fork Escale, Fase 1I; C20, Q8).
 * WhatsApp envia. Ligação (fica para depois, resposta de 17/10), Instagram,
 * Email, Agendamento e Reunião ficam "Em breve". Tarefa não tem botão.
 */
export function RodapeDoTipo({
  lead,
  atividade,
  texto,
  alternar,
}: {
  lead: Lead;
  atividade: AtividadeDoNegocio;
  texto: string;
  alternar: (a: AtividadeDoNegocio) => Promise<unknown>;
}) {
  const t = useT();
  const primeiroNome = tituloDoCard(lead).trim().split(/\s+/)[0] ?? "";
  switch (atividade.tipo) {
    case "whatsapp":
      return <RodapeDoWhatsapp lead={lead} atividade={atividade} texto={texto} alternar={alternar} />;
    case "ligacao":
      return (
        <button type="button" disabled title={t("Em breve")} className={BOTAO}>
          <IconeDoTipo tipo="ligacao" tamanho={18} />
          {t("Chamar {nome}").replace("{nome}", primeiroNome)}
        </button>
      );
    case "instagram":
      return (
        <button type="button" disabled title={t("Em breve")} className={BOTAO}>
          <IconeDoTipo tipo="instagram" tamanho={18} />
          {t("Enviar mensagem")}
        </button>
      );
    case "email":
      return (
        <button type="button" disabled title={t("Em breve")} className={BOTAO}>
          <IconeDoTipo tipo="email" tamanho={18} />
          {t("Enviar email")}
        </button>
      );
    case "agendamento":
    case "reuniao":
      return (
        <button type="button" disabled title={t("Em breve")} className={BOTAO}>
          <IconeDoTipo tipo={atividade.tipo} tamanho={18} />
          {t("Agendar")}
        </button>
      );
    default:
      return null;
  }
}
```

O nome acessível do botão de email inclui o ícone, que é `aria-hidden`. O teste procura o nome exato "Enviar email".

- [ ] **Step 7: O encaixe na aba**

Em `components/escale/negocio/abas/AbaAtividades.tsx`:
- importe `import { RodapeDoTipo } from "./atividades/RodapeDoTipo";`;
- no `DetalheDaAtividade` da `escolhida` (não no do `modeloEscolhido`), acrescente a prop:

```tsx
              rodape={
                <RodapeDoTipo
                  lead={lead}
                  atividade={escolhida}
                  texto={resolver(escolhida.description)}
                  alternar={ativ.alternar}
                />
              }
```

Em `tests/unit/escale-ficha-aba-atividades.test.tsx`:
- acrescente os mocks de `@/hooks/channels/useChannelSessions` (`useChannelSessions: () => ({ data: [] })` e `channelLabel: () => ""`) e de `next/navigation` (`useRouter: () => ({ push: vi.fn() })`);
- o mock de `@/hooks/auth/AuthProvider` já tem `useUser`.

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-atividade-whatsapp.test.tsx tests/unit/escale-ficha-aba-atividades.test.tsx tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write hooks/escale/useEnviarAtividade.ts components/escale/negocio/abas/atividades/*.tsx tests/unit/escale-ficha-atividade-whatsapp.test.tsx && corepack pnpm eslint hooks/escale components/escale/negocio/abas && corepack pnpm typecheck`
Expected: PASS.
- **Corpo do envio:** se o `POST /api/v1/messages` pedir `Idempotency-Key` para texto, veja como o `useSendMessage` (`hooks/inbox/useSendMessage.ts`) monta o pedido. Copie o cabeçalho pelo `opts` do `apiClient.post`.
- **Resposta do `GET /api/v1/conversations/[id]`:** confira na rota (linha 95, `ok(comNome ?? conv)`) se o campo é `assigned_to_user_id`. É o que `lib/types/messaging.ts` declara.

- [ ] **Step 9: Revisor (G1)**

Despache o revisor com o diff da task, pedindo que confira:
- se nunca envia para a conversa de outra pessoa sem a confirmação;
- se o claim usa `expected_assignee` (não toma a conversa se ela mudou de mão no meio);
- se a falha não conclui a atividade;
- se o texto vai com as variáveis trocadas e dentro do teto de 4.096 caracteres;
- se a atividade já concluída não reabre.

- [ ] **Step 10: Commit**

```bash
git add hooks/escale/useEnviarAtividade.ts components/escale/negocio/abas tests/unit/escale-ficha-atividade-whatsapp.test.tsx tests/unit/escale-ficha-aba-atividades.test.tsx
git commit -m "feat(escale): enviar o WhatsApp da atividade em um clique e chamar (Fase 1I, C20)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 14: Espanhol do PR B, a rodada cheia, a conferência, o PRD e o PR B

- [ ] **Step 1: O espanhol**

Crie o bloco `  // ─── FORK ESCALE · Fase 1I (PR B): aba Atividades da ficha ───` logo ANTES da âncora da 1D, depois do bloco do PR A. Use o mesmo script `node -`, com estas `ENTRADAS`:

```js
const ENTRADAS = [
  ["Hoje", "Hoy"],
  ["{n}º minuto", "Minuto {n}"],
  ["{n}ª hora", "Hora {n}"],
  ["{n}º dia", "Día {n}"],
  ["{n}ª semana", "Semana {n}"],
  ["{n}º mês", "Mes {n}"],
  ["{n}º ano", "Año {n}"],
  ["Negócio não encontrado.", "Negocio no encontrado."],
  ["Erro ao adicionar atividade. Tente novamente.", "Error al agregar la actividad. Inténtalo de nuevo."],
  ["Data", "Fecha"],
  ["Hora", "Hora"],
  ["Mês anterior", "Mes anterior"],
  ["Próximo mês", "Mes siguiente"],
  ["às", "a las"],
  ["Data e hora da atividade", "Fecha y hora de la actividad"],
  ["A data informada não pode ser no passado. Por favor, selecione uma data futura.", "La fecha informada no puede estar en el pasado. Por favor, selecciona una fecha futura."],
  ["Editar data e hora", "Editar fecha y hora"],
  ["A data e a hora da atividade foram alteradas com sucesso", "La fecha y la hora de la actividad se cambiaron con éxito"],
  ["Erro ao atualizar atividade. Tente novamente.", "Error al actualizar la actividad. Inténtalo de nuevo."],
  ["{nome} está aqui", "{nome} está aquí"],
  ["Dias", "Días"],
  ["Todas", "Todas"],
  ["Configurar etapa", "Configurar etapa"],
  ["Atividades", "Actividades"],
  ["O negócio ainda não está na etapa {stage}. Estas são as atividades previstas, agrupadas por quando devem ser feitas após a entrada; as datas só são definidas quando o negócio chega aqui.", "El negocio aún no está en la etapa {stage}. Estas son las actividades previstas, agrupadas por cuándo deben hacerse después de la entrada; las fechas solo se definen cuando el negocio llega aquí."],
  ["Erro ao buscar atividades. Tente novamente.", "Error al buscar actividades. Inténtalo de nuevo."],
  ["Sem atividades configuradas", "Sin actividades configuradas"],
  ["Crie a primeira atividade para acompanhar este negócio.", "Crea la primera actividad para acompañar este negocio."],
  ["Excluir atividade", "Eliminar actividad"],
  ["Tem certeza que deseja excluir esta atividade?", "¿Seguro que quieres eliminar esta actividad?"],
  ["Marcar como concluída", "Marcar como completada"],
  ["Reabrir atividade", "Reabrir actividad"],
  ["Opções de", "Opciones de"],
  ["Tarefa concluída com sucesso", "Tarea completada con éxito"],
  ["Marcação de tarefa removida com sucesso", "Marcación de tarea quitada con éxito"],
  ["Atividade removida com sucesso", "Actividad eliminada con éxito"],
  ["Nenhuma mensagem adicionada", "Ningún mensaje agregado"],
  ["Modo edição", "Modo edición"],
  ["Sair do modo edição", "Salir del modo edición"],
  ["Remover atividade do negócio", "Quitar actividad del negocio"],
  ["Nenhuma atividade selecionada", "Ninguna actividad seleccionada"],
  ["Escolha uma atividade na lista ao lado para visualizar os detalhes.", "Elige una actividad en la lista de al lado para ver los detalles."],
  ["Enviar mensagem", "Enviar mensaje"],
  ["Enviando…", "Enviando…"],
  ["Mais opções de envio", "Más opciones de envío"],
  ["Alterar dispositivo", "Cambiar dispositivo"],
  ["Abrir em Conversas", "Abrir en Conversaciones"],
  ["Abrir no WhatsApp Web", "Abrir en WhatsApp Web"],
  ["Abrir no aplicativo WhatsApp", "Abrir en la aplicación WhatsApp"],
  ["Você não possui um dispositivo vinculado!", "¡No tienes un dispositivo vinculado!"],
  ["Seu dispositivo está desconectado!", "¡Tu dispositivo está desconectado!"],
  ["Você está enviando com o dispositivo:", "Estás enviando con el dispositivo:"],
  ["Dispositivo", "Dispositivo"],
  ["A atividade foi realizada com sucesso!", "¡La actividad se realizó con éxito!"],
  ["Atendimento assumido e mensagem enviada com sucesso!", "¡Atención asumida y mensaje enviado con éxito!"],
  ["Enviar mensagem de WhatsApp", "Enviar mensaje de WhatsApp"],
  ["Este contato está em atendimento com o usuário {nome}", "Este contacto está en atención con el usuario {nome}"],
  ["Você gostaria de assumir o atendimento e enviar a mensagem mesmo assim?", "¿Quieres asumir la atención y enviar el mensaje de todos modos?"],
  ["Não consegui enviar a mensagem. Tente de novo.", "No pude enviar el mensaje. Inténtalo de nuevo."],
  ["Chamar {nome}", "Llamar a {nome}"],
  ["Enviar email", "Enviar email"],
];
```

Rode as duas gates de espanhol e o typecheck. Commit: `feat(escale): espanhol da aba Atividades da ficha (1I, PR B)`.

- [ ] **Step 2: A rodada cheia, em segundo plano (G1)**

Use os mesmos comandos da Task 7, Step 2, com o prefixo `1i-prb-` nos arquivos. O PR B não toca no banco, então fica **sem** o `test:db`.

Expected:
- `novas: 0`;
- `rapidos=0`.

- [ ] **Step 3: Conferência visual** (contrato, CAMINHO A ou B)

Use a casca ligada e uma origem com o playbook do PR A.

1. **Entrada no quadro:** mova um negócio sem dono para a etapa do playbook.
2. **Ficha, contra G01:**
   - o trilho, com ✓ nas anteriores e a foto na atual;
   - a coluna Dias, com o selo vermelho de uma atrasada;
   - os grupos e a hora vermelha.
3. **Concluir:** conclua uma atividade e confira que o dono virou você (C21) e que o Histórico mostra "Tarefa concluída".
4. **WhatsApp, contra 017:** abra um WhatsApp e envie para um contato de teste, uma vez pelo clique e outra pelo Enter.
   - a mensagem chega com as variáveis trocadas;
   - a atividade fica concluída;
   - repita com o contato em atendimento de outra pessoa e veja a janela.
5. **Etapa futura:** clique numa etapa futura e confira o playbook por "1º dia".
6. **Criar e editar:** crie uma "Nova atividade" (com o erro de data no passado) e edite a data pelo ⋮.

Escreva a lista das diferenças que sobram. As já previstas:
- o trilho não move o negócio (Q6);
- ligação "Em breve" (resposta de 17/10);
- Instagram, Email, Agendamento e Reunião sem executar (Q8);
- sem "Ignorar", no-show e "Reverter ao modelo" (Q15);
- "Alterar dispositivo" em breve (P15).

Com CAMINHO B, o PR registra "conferência visual pendente: depois do deploy".

- [ ] **Step 4: PRD**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`, seção 8, na linha `| 1I |`, troque a última coluna por `PR A mergeado; PR B aberto (aba Atividades)`.

- [ ] **Step 5: Push e PR B**

```bash
git push -u escale-crm feat/fase-1i-aba-atividades
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-1i-aba-atividades --title "feat(escale): Fase 1I (B) — aba Atividades da ficha: concluir, criar e enviar em um clique, igual à Clint" --body-file .superpowers/sdd/1i-prb-pr.md
```

O corpo do PR leva:
- o Goal (a parte da ficha);
- as decisões P12 a P17 e G1;
- os desvios previstos (Step 3);
- as perguntas Q5 a Q8 e Q15 a Q18;
- os prints que faltam, 8 a 12;
- a conferência visual;
- a verificação.

Termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Mostre a URL ao usuário e PARE. Merge, tag e publicação são pedidos à parte.

---

## Fora desta fase (registrado)

Regra do usuário (17/10): o que fica diferente da Clint nesta fase é adiado, não aceito. Tudo marcado "Obrigatório" tem de estar igual à Clint antes do fim do projeto.

| Item | Onde fica | Por quê |
|---|---|---|
| **Obrigatório antes do fim do projeto:** mover o negócio pelo trilho ("Mover para cá") e concluir atividade de outra etapa levando o negócio para ela | Item próprio, depois da 1I | Precisa das regras "ao entrar" e "ao sair" (1F) fora do quadro (Q6, resposta de 17/10) |
| Aplicar o playbook aos negócios que já estão na etapa quando o gestor salva | Decisão do usuário (17/10): não aplicar | Criaria muitas tarefas de uma vez (Q3) |
| **Obrigatório antes do fim do projeto:** Modelos de playbook (escolher, compartilhar, salvar no modelo, salvar como novo) | D17, fora do PRD | YAGNI (Q12) |
| Atividade dependente | — | "Em breve" também na Clint (Q14) |
| **Obrigatório antes do fim do projeto:** Editar etapas na aba Etapas e atividades (lápis, lixeira, arrastar, "Nova Etapa") | Tela de etapas do original | D9 já existe (Q13) |
| **Obrigatório antes do fim do projeto:** conteúdo da atividade igual ao da Clint (várias mensagens, áudio, modelo da API oficial, e-mail com assunto/cópia/anexo, editor rico) | Item próprio, depois da 1I | Texto simples nesta fase (Q9, resposta de 17/10) |
| **Obrigatório antes do fim do projeto:** Variáveis de checkout, de agendamento e os IDs (os campos personalizados entram nesta fase) | Quando o Escale tiver checkout e agenda | Q10 |
| **Obrigatório antes do fim do projeto:** Ligação ("Chamar {nome}"), enviar Instagram e e-mail, agendar pela atividade | Fase 3 (Conversas) e Agenda | Q8; a ligação ficou para depois em 17/10 |
| **Obrigatório antes do fim do projeto:** "Ignorar atividade", "Editar data de execução", no-show, "Reverter conteúdo ao do modelo" | Pedido do usuário | Q15 |
| **Obrigatório antes do fim do projeto:** Esconder a "não listada" da lista de Tarefas do original | Fase 4 (Atividades) | Q11 |
| **Obrigatório antes do fim do projeto:** "Alterar dispositivo" (escolher o canal do envio) | Fase 3 (Conversas) | O `open-with-contact` escolhe o primeiro canal pronto (P15) |
| **Obrigatório antes do fim do projeto:** Agendar e Lembretes do cabeçalho | Agenda | Q18 |
| **Obrigatório antes do fim do projeto:** Cores do selo do prazo por unidade (a Clint pinta dia, hora e semana de cores diferentes) | Conferência visual | Hoje todas na cor da marca |
