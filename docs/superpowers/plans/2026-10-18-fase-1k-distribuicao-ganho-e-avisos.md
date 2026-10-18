# Fase 1K — Distribuição de dono, atribuição de ganho e notificações da origem (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** D13, D14 e D15 de `docs/modulos/1-negocios.md` (seção 4, tabela D), mais o que a 1F deixou "Em breve" para a 1K (as subabas "Distribuição de dono", "Atribuição de ganho" e "Notificações"), o que a 1J deixou para cá (a validação entre a lista de pessoas e a distribuição, Q9 da 1J) e o que a 1G deixou (o "Ver atribuição de ganho" no ⋮ da ficha). **Três PRs**, um por subaba: A = distribuição (migration 9013), B = ganho (migration 9014), C = notificações (sem migration).

## Decisões do usuário (18/10)

| # | Pergunta | Decisão |
|---|---|---|
| Q1 | Notificações: a Clint atual só manda **e-mail**, em dois eventos (novo negócio vindo de integração; mudança para Ganho/Perdido), para pessoas escolhidas | **Tela da Clint, aviso dentro do app.** Mesma tela e mesmos dois eventos; cada pessoa escolhida recebe o aviso na tela (toast), a notificação do navegador e o push no celular, pelas peças que o app já tem. **Sem e-mail.** |
| Q2 | Distribuição: quais negócios entram no rodízio | **Todo negócio que nasce sem dono e sem pessoa que o criou** (`created_by_user_id` nulo): captação/webhook, automação, API/agente de IA e conversa nova. A carteira do cliente vem antes. Nesses negócios o rodízio de conversas deixa de passar o negócio para quem pegou a conversa (ele só adota negócio sem dono). Responde a pergunta 9 do PRD. |
| Q3 | "Só o administrador marca ganho" | **Admin e o sistema.** Toda pessoa que não é admin fica bloqueada, em todos os caminhos com sessão (arrastar, ficha, ⋮ do card, lote, API com sessão). Automação, agente de IA e integrações (sem sessão) continuam marcando ganho. |
| Q4 | Regras de atribuição de ganho | **Crédito gravado, métricas depois.** No ganho, o sistema credita quem cumpriu as regras (concluiu as atividades); se ninguém cumpre, o crédito é do dono. Fica no negócio e na janela "Atribuição de ganho" (o admin corrige data, hora e pessoa). Métricas e comissão continuam pelo dono até o módulo Indicadores. |

**Prints que faltam** (nenhum bloqueia; onde falta, o plano segue o código da Clint, citado abaixo):
1. ❌ "Distribuição de dono" na casca de menu superior (só há 01-028, menu lateral; o conteúdo vale).
2. ❌ A gaveta "Histórico de alterações" (o relógio) e a janela "Histórico de distribuições" (o contador).
3. ❌ O rodapé com "Reiniciar a contagem de negócios ao salvar" e as confirmações ("Não"/"Sim") da lixeira e do reset.
4. ❌ A subaba "Notificações" (nenhum print, nem v1 nem v2).
5. ❌ A janela "Atribuição de ganho" do negócio ganho (DealWonModal) e o item "Ver atribuição de ganho" no ⋮.
6. ❌ A condição "Possuir a tag" e o seletor "E" / "Ou" entre condições.

**Goal:** Cada origem distribui o dono dos negócios que nascem sem dono e sem pessoa, por percentual, com contador, histórico e reset auditado; cada origem pode reservar o ganho ao administrador e credita o ganho a quem cumpriu as regras de atividades; cada origem avisa, dentro do app, as pessoas escolhidas quando nasce negócio de integração e quando um negócio é ganho ou perdido. Tudo nas subabas da janela de configurações da origem (1F), igual à Clint. Sem configurar nada, tudo continua como hoje.

**Architecture:**
- **PR A (distribuição, migration 9013):** três tabelas do fork (`crm_distribuicao_de_dono`, `crm_distribuicoes_feitas`, `crm_distribuicao_alteracoes`), todas só de leitura para gerente+ pela RLS e escritas só por funções `security definer` fechadas ao `authenticated` (as rotas chamam com o service role depois de conferir que quem pede é admin). Um gatilho `BEFORE INSERT` em `crm_leads` (`trg_escale_reparte_dono_da_origem`) escolhe o dono pelo rodízio ponderado da Clint (menor índice; o índice anda `maior% / meu%` a cada negócio recebido) e um `AFTER INSERT` (`trg_escale_registra_a_distribuicao`) grava o histórico e emite `lead.assigned` (o push "Lead atribuído a você" já existe). Rotas `PUT /distribuicao`, `POST /distribuicao/reiniciar`, `GET /distribuicao/alteracoes` e `GET /distribuicao/feitas` em `app/api/v1/pipelines/[id]/`. A subaba, o rodapé com "Resetar distribuição", a gaveta do relógio e a janela do contador.
- **PR B (ganho, migration 9014):** chaves `escale_so_admin_ganha` e `escale_atribuicao_de_ganho` no `settings` da origem (seção nova `atribuicao` da rota de configurações). Gatilho `BEFORE` em `crm_leads` (`trg_escale_so_admin_marca_ganho`) recusa com `PT403` quem tem sessão e não é admin. Tabela `crm_ganho_do_negocio` (uma linha por negócio ganho) preenchida por `trg_escale_registra_o_ganho` com o crédito calculado por `fn_escale_credito_do_ganho` (sobre `crm_atividades_do_negocio` da 1I). Rota `GET/PATCH /api/v1/leads/[id]/atribuicao-de-ganho`. A recusa vira 403 com o texto da Clint nas três portas humanas (mover, ganhar, lote). A subaba, o "Ganho" escondido na ficha e a janela "Atribuição de ganho".
- **PR C (notificações, sem migration):** chave `escale_notificacoes` (seção nova `notificacoes`). Um handler do barramento (`escale.avisos-da-origem`) manda o push às pessoas escolhidas em `lead.created` (sem pessoa que criou), `lead.won` e `lead.lost`, só a quem vê o negócio. Um hook na casca (`useAvisosDaOrigem`) entrega o toast e a notificação do navegador pelo tempo real de `crm_leads`, com a mesma régua. A subaba.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`, Supabase (RLS, funções `security definer`, gatilhos), zod, `sonner`, barramento `event_log` (`lib/event-log`), web push (`lib/notifications/web_push`).

## Referência visual (abrir o PNG antes de cada task de tela)

Os caminhos ficam **sem crase** (guarda `evidencia-citada`).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| F01 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1f\2026-10-16-01-geral-configuracoes-gerais.jpg | a janela na casca de menu superior (o alvo): o menu à esquerda com ícones, a ordem dos 9 itens, o cabeçalho "quadrado + texto" da subaba, o rodapé "Cancelar" / "Salvar" | 5, 10, 14 |
| 028 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-028-distribuicao-dono.png | Distribuição de dono (menu lateral; só o conteúdo vale): título, descrição, relógio à direita, tabela USUÁRIOS / PERCENTUAL % / CONTADOR (?), lixeira, "Adicionar usuário", "↺ Resetar distribuição" à esquerda do rodapé | 5, 6 |
| 012 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-012-atribuicao-ganho-v1.png | Atribuição de ganho na casca superior: quadrado + "Configure aqui as regras de atribuição de ganho.", a caixa "Atribuição de ganho pelo sistema", a regra "Ter realizado [1] vezes a atividade do tipo [▾]" num cartão com a lixeira vermelha, "Nova condição" lilás | 10 |
| 027 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-027-configuracao-atribuicao-ganho.png | a mesma subaba no menu lateral: a lista aberta na ordem Ligação, Email, Agendamento, Tarefa, Reunião, Whatsapp, Instagram | 10 |

### Medidas tiradas dos prints (1:1) e do código da Clint

| Peça | Medida |
|---|---|
| Cabeçalho da Distribuição (028) | `CabecaDaSecao` com ícone `Shuffle`, título "Distribuição de dono" 13px/500 e a descrição 11px; à direita, o botão do relógio: 32px de altura, borda `casca-borda`, canto 6px, ícone `Clock` 13px `casca-suave`, texto 12px "Atualizado há …" (sem histórico, só o ícone, 32×32) |
| Tabela (028) | grade `1fr 16.666% 16.666% 8.333%`; cabeçalho 10px/600 maiúsculo `casca-meta`, 44px, borda de baixo; "CONTADOR" com o "?" (`AjudaDaCasca`); linha 56px de altura mínima com borda de baixo: iniciais em círculo 32px (`casca-marca`, texto branco 11px/600), nome 13px/500 `casca-texto` e e-mail 11px `casca-suave` embaixo; o percentual num `CampoDeTexto` de 72px, 36px de altura, texto centralizado; o contador numa pílula `casca-marca-suave` com texto `casca-marca` 13px/600, `Clock` 13px, `px-3.5 py-1`, redonda; a lixeira `Trash2` 16px `casca-texto` |
| "Adicionar usuário" (028) | `SeletorDaCasca aparencia="janela"` de 708px (máximo 100%), 16px abaixo da tabela, com busca |
| Rodapé (028) | à esquerda, "Resetar distribuição" 13px `casca-suave` com `Undo2` 16px, sem fundo; à direita "Cancelar" e "Salvar" (os da janela). Editando e válido, no lugar do reset: `CaixaDaCasca` "Reiniciar a contagem de negócios ao salvar" + `AjudaDaCasca` |
| Confirmação (código `us`/lixeira) | balão `PainelSuspenso` de 280px: texto 13px e, embaixo à direita, "Não" (`BotaoDaJanela cancelar`) e "Sim" (`BotaoDaJanela salvar`) |
| Gaveta do relógio (código `Ms`) | gaveta à direita, `w-[92vw] max-w-[400px]`; título "Histórico de alterações" 16px/500, subtítulo "Distribuição de dono · {origem}" 12px `casca-suave`; por versão: data dd/mm/aaaa 12px/600, selo "Versão atual" (`casca-marca-suave` / `casca-marca`) ou "Versão anterior" (`casca-raia` / `casca-suave`), autor 12px e hora HH:mm; cada linha com o ícone do evento num círculo 24px |
| Janela do contador (código) | `JanelaDaCasca` de `min(760px,100%)`; título "Histórico de distribuições", subtítulo "Origem: {origem}"; filtros: busca, pessoa, período; tabela `2fr 1.1fr 1.4fr 128px` com cabeçalho 40px e linhas 64px; 6 por página |
| Atribuição de ganho (012) | `CabecaDaSecao` com `ReceiptText` e o texto (sem título); "Atribuição de ganho pelo sistema" 13px/500 a 32px do cabeçalho; a caixa com o texto 13px; "Regras de atribuição de ganho" 13px/500 a 32px; cartão da regra: borda `casca-borda`, canto 8px, 64px de altura, `px-6`, textos 12px `casca-texto`, número em `CampoDeTexto` 60×36 centralizado, tipo em `SeletorDaCasca aparencia="janela"` de 328px, lixeira `Trash2` 16px `casca-alerta` na ponta direita; "Nova condição": 40px, `px-4`, canto 6px, fundo `casca-marca-suave`, texto 13px/500 `casca-texto` |

### Textos da Clint usados nesta fase

Do catálogo `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\catalog-v2\i18n-pt.txt` e dos bundles `raw-v2\js\index-mZOMjQAe.js.txt` (A), `index-C5mS35ZX.js.txt` (B), `index-BhVJ8kAx.js.txt` (D), `index-BKc3FRy4.js.txt` (E) e `index-MjYyGCOr.js.txt` (F):

- **Distribuição (A, `Is`):** "Distribuição de dono"; "Defina os usuários e percentuais. Negócios criados por Integrações, Apps e Checkouts são distribuídos automaticamente entre eles."; "Usuários"; "Percentual %"; "Contador"; "Clique no contador para ver as distribuições feitas para o usuário nesta origem."; "Adicionar usuário"; "Resetar distribuição"; "Zera o contador de todos os usuários, reinicia o rodízio e apaga o histórico de distribuições desta origem."; "A contagem de negócios será zerada e o histórico de distribuições desta origem será apagado. Tem certeza que deseja continuar?"; "Não"; "Sim"; "A distribuição foi reiniciada com sucesso."; "Reiniciar a contagem de negócios ao salvar"; "Zera o contador e apaga o histórico de distribuições desta origem."; "A distribuição vai ser refeita com porcentagens iguais entre os demais usuários. Tem certeza que deseja remover este usuário?"; "Verificar o total das porcentagens, deve somar 100%."; "Verificar se as porcentagens são maiores que 0%."; "As configurações de distribuição foram salvas com sucesso!"; "Erro ao salvar a distribuição de donos."; "Este usuário não possui permissão nesta origem."
- **Relógio (A, `Ms`):** "Atualizado há …" (montado com `Intl.RelativeTimeFormat`); "Histórico de alterações"; "Distribuição de dono · {origem}"; "Fechar"; "Nenhuma alteração registrada ainda."; "Versão atual"; "Versão anterior"; "Usuário desconhecido"; "Percentual de {nome} alterado de {de}% para {para}%"; "{nome} entrou na distribuição com {percentual}%"; "{nome} saiu da distribuição"; "Contagem de negócios reiniciada".
- **Contador (A):** "Ver distribuições de {nome}" (aria); "Histórico de distribuições"; "Origem: {origem}"; "Buscar por contato ou empresa"; "Todos os usuários"; "{nome} (removido)"; "Últimos 7 dias"; "Últimos 30 dias"; "Negócio"; "Etapa"; "Distribuído para"; "Data"; "Removido"; "Nenhuma distribuição encontrada para os filtros selecionados."; "Limpar filtros"; "Mostrando {de}–{ate} de {total} negócios atribuídos" (e "negócio atribuído" no singular).
- **Bloqueio da lista de pessoas (A, `Ps`):** as duas mensagens "Não é possível salvar. …" (lista própria e "segue as permissões do grupo"), no singular e no plural (Task 7).
- **Atribuição de ganho (A, `Ks`):** "Atribuição de ganho"; "Configure aqui as regras de atribuição de ganho."; "Atribuição de ganho pelo sistema"; "Se marcado, somente o administrador poderá alterar o status do negócio para ganho."; "Regras de atribuição de ganho"; "Ter realizado"; "vezes a atividade do tipo"; "Selecione..."; "Possuir a tag"; "Nova condição"; "Escolha o tipo da condição:"; "Atividade"; "Tags"; "E"; "Ou"; tipos "Ligação", "Email", "Agendamento", "Tarefa", "Reunião", "Whatsapp", "Instagram".
- **Ganho bloqueado (F):** "Você não possui permissão para dar ganho neste negócio." (`component.Deal.noPermissionToWin`).
- **Janela do ganho (D, DealWonModal; E):** "Ver atribuição de ganho"; "Atribuição de ganho"; "Data"; "Atribuir ganho ao usuário"; "Salvar"; "As seguintes regras foram aplicadas para a atribuição do ganho:"; frases "Ter realizado {n} vezes a atividade do tipo {tipo}" e "Possuir a tag {tag}", ligadas por "e" / "ou".
- **Notificações (B, `Ie`):** "Notificações"; "Configure aqui as notificações relacionadas a sua origem de dados."; "Notificação de novo negócio"; "Selecione os usuários que receberão as notificações"; "{n} usuário selecionado" / "{n} usuários selecionados"; "Usuários"; "Notificação de mudança de status"; "Selecione os usuários que receberão as notificações e os status a serem notificados."; "{n} status selecionado" / "{n} status selecionados"; "Status do negócio"; "Ganho"; "Perdido"; "Selecione um usuário para continuar".
- **Textos nossos** (a Clint não tem, ou tem com e-mail): as ajudas das notificações trocam "receberão um e-mail" por "receberão um aviso no app" (Q1); "Só o administrador altera a atribuição do ganho." (dica do campo desligado); "Não consegui ler o histórico."; os avisos do app "Novo negócio", "Negócio ganho", "Negócio perdido".

### Comportamento da Clint conferido no código

- **Distribuição** (A `Is`, C `distribution_user`): tabela própria por usuário e origem com `percentual`, `inc_index` (= `maior% / meu%`), `cur_index` e `counter`. Salvar: apaga quem saiu, grava quem entrou ou mudou e **sempre zera `cur_index` de todos** (recomeça o rodízio); com "Reiniciar a contagem de negócios ao salvar", zera também o contador. O próximo dono é o de menor `cur_index` (backend `next_distribution_user`), que anda `inc_index` e ganha +1 no contador. "Resetar distribuição" zera índice e contador e apaga o histórico de distribuições. O item do menu só aparece para administrador (`<Permission permissions:"ADMIN">`). Validação: a soma arredondada (`toFixed(0)`) é 100 (ou a lista é vazia) e todo percentual é maior que 0; adicionar ou remover alguém refaz todos com `100/n` (duas casas). Só entra quem tem permissão na origem. O histórico de configuração (`distribution_config_history`) registra percentual alterado, entrou, saiu e reinício; versões do mesmo autor em até 2 s se juntam.
- **Atribuição** (A `Ks`, E, F, D): `won_attribution` é uma lista de condições `activity` (vezes + tipo) ou `tag`, com um E/OU **único** para todas; `only_system_won` = só o administrador põe o status em Ganho (a ficha tira "Ganho" das opções; a área do contato mostra "Você não possui permissão para dar ganho neste negócio."). A janela "Atribuição de ganho" do negócio ganho mostra data, hora e o usuário creditado (desligados para quem não é admin) e, quando o sistema aplicou regras, "As seguintes regras foram aplicadas para a atribuição do ganho:" com as frases.
- **Notificações** (B `Ie`): `notifications.deal_insert.users` (novo negócio vindo de integração) e `notifications.deal_update.{status: [WON|LOST], users}`; o segundo seletor de usuários só aparece com algum status escolhido; o Salvar pede ao menos um usuário quando há status ("Selecione um usuário para continuar"). Canal único: e-mail (aqui: o app, Q1). Usuários guardados por e-mail (aqui: por id, N24).

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Três PRs**, um por subaba: A (Tasks 1 a 7), B (Tasks 8 a 12), C (Tasks 13 a 16). B e C nascem da `main` depois do merge do anterior | cada um publica sozinho e tem a sua prova |
| N2 | **Pré-requisitos:** 1I (PR A e B) e 1J (PR A e B) mergeadas na `escale-crm/main`. A Task 1 prova; sem elas, PARE | a 1K usa `crm_atividades_do_negocio` e `TIPOS_DE_ATIVIDADE` (1I), e `temAcessoAOrigem`, `ListaDePessoas`, `membrosAtivos` e as chaves `escale_pessoas` (1J) |
| N3 | **Distribuição em tabela própria**, não no `settings`: o contador muda a cada negócio, e o `settings` sofre corrida com o "Salvar" (gravação condicionada ao `updated_at`, 1F). Três tabelas: `crm_distribuicao_de_dono` (pessoa, percentual, passo, índice, contador), `crm_distribuicoes_feitas` (cada negócio distribuído) e `crm_distribuicao_alteracoes` (o histórico da configuração; é a auditoria do reset) | Clint (`distribution_user`, `distribution_deal_history`, `distribution_config_history`) |
| N4 | **Quem entra no rodízio:** negócio inserido com `owner_user_id`, `owner_agent_id` **e** `created_by_user_id` nulos, numa origem com distribuição. Ordem dos gatilhos `BEFORE INSERT` (alfabética): a carteira (`trg_crm_lead_nasce_na_carteira`) e o dono padrão da 1J vêm antes; a validação do dono (`trg_lead_so_liga_a_propria_empresa`) vem depois e confere o escolhido | Q2 |
| N5 | **Algoritmo da Clint:** trava as linhas da origem (`for update`, ordem por `user_id`), escolhe o elegível de menor `indice` (empate: menor `user_id`), soma `passo` ao índice e 1 ao contador. Elegível = membro ativo, papel agente, gerente ou admin, e com acesso à origem (a régua da 1J, com a pessoa como parâmetro: `fn_escale_recebe_da_origem`). Ninguém elegível: o negócio nasce sem dono, como hoje. Falha no gatilho vira `warning` e não derruba a criação | Clint; o viewer seria recusado pelo `trg_lead_so_liga_a_propria_empresa` e derrubaria o insert |
| N6 | **O dono distribuído anuncia:** o `AFTER INSERT` grava a linha em `crm_distribuicoes_feitas` e emite `lead.assigned` (`via: "distribuicao"`), com a mesma chave de transação da 0581. Assim o push "Lead atribuído a você" e as automações de `lead.assigned` valem também aqui (dono posto em `BEFORE INSERT` não gera o evento sozinho). O `BEFORE` avisa o `AFTER` por `set_config('escale.distribuidos', …, true)` | o original só emite `lead.assigned` em UPDATE |
| N7 | **Escrita só pelo servidor:** `fn_escale_salvar_distribuicao` e `fn_escale_reiniciar_distribuicao` são definer, fechadas a `public`, `anon` e `authenticated`, abertas ao `service_role`, e recebem `p_org` e `p_autor`. As rotas conferem que quem pede é **admin** (`podeAdministrarEmpresa`) e chamam com `createAdminClient()`. As funções revalidam tudo (soma, percentuais, elegibilidade, origem da organização) | Clint: a subaba é só de admin; cerca `definer-nova-nasce-exposta` |
| N8 | **Leitura:** gerente ou acima lê as três tabelas (RLS `fn_role_at_least(org, 'manager')`): é o gerente que salva a lista de pessoas (1J) e precisa ver quem está na distribuição para a validação Q9 da 1J | 1J Q9 |
| N9 | **Salvar** zera o índice de todos (recomeça o rodízio), como a Clint; "Reiniciar a contagem de negócios ao salvar" e "Resetar distribuição" zeram também o contador e apagam `crm_distribuicoes_feitas` da origem; os dois gravam `contagem_reiniciada` no histórico com o autor (auditoria do reset, PRD D13) e a rota audita `pipeline.config_updated` com `secoes: ["distribuicao"]` | Clint; sem ação nova no `AUDIT_ACTIONS` do original |
| N10 | **Percentual na tela com vírgula** ("33,33"), como manda o formato brasileiro (CLAUDE.md, regra 5), aceitando ponto ao digitar; gravado `numeric(5,2)` | regra do produto |
| N11 | **Menu:** "Distribuição de dono" só aparece para admin (`config.podeAdministrar`), como a Clint. Os outros dois itens aparecem para quem abre a janela (gerente ou acima); "Atribuição de ganho" fica desligada (só leitura) para quem não é admin, porque o "só admin marca ganho" não pode ser destravado por gerente | Clint (`Permission ADMIN`); PRD §5 |
| N12 | **A janela tem um "Salvar" só (F13 da 1F).** A distribuição vai pela rota própria (`PUT …/distribuicao`) depois da rota de configurações, no mesmo clique; "Resetar distribuição" é imediato (com confirmação), como na Clint | 1F F13; Clint |
| N13 | **Validação Q9 da 1J** nos dois lados: na tela (`pedidoDoSalvar`, com o texto da Clint e os nomes) e na rota de configurações (422 com texto genérico), quando a lista de pessoas da origem (ou a do grupo, se a origem não tiver) deixa de fora alguém da distribuição que não é admin | 1J Q9 |
| N14 | **Fora da Clint, de propósito:** a gaveta do relógio mostra autor e data no `title` (não num cartão ao passar o mouse); o período da janela do contador é um seletor com "Todo o período", "Últimos 7 dias" e "Últimos 30 dias" (sem calendário); a busca procura no título do negócio (a empresa chega com a Fase 2D); as iniciais têm uma cor só (`casca-marca`) | sem print; YAGNI |
| N15 | **"Só admin marca ganho"** = `settings.escale_so_admin_ganha = true`. Gatilho `BEFORE INSERT` e `BEFORE UPDATE` em `crm_leads`, `WHEN (new.status = 'won' …)` (roda depois de `trg_crm_lead_close_on_stage`, que põe o status): com `auth.uid()` presente e papel diferente de admin (`fn_user_role_in_org`), `raise … using errcode = 'PT403', message = 'so_administrador_marca_ganho'`. Sem sessão (automação, IA, integração, MCP), passa | Q3 |
| N16 | **A recusa vira 403** com "Você não possui permissão para dar ganho neste negócio." por `recusaDoGanhoPeloBanco` (novo, `lib/escale/ganho/recusa.ts`), encaixado ao lado de `recusaDeMotivoDaPerdaPeloBanco` em três arquivos do original: `app/api/v1/leads/[id]/move/route.ts`, `lib/leads/encerramento.ts` e `app/api/v1/leads/bulk/route.ts` | as portas humanas; o resto não tem sessão |
| N17 | **Crédito:** tabela `crm_ganho_do_negocio` (uma linha por negócio ganho: `creditado_a`, `ganho_em`, `pela_regra`, `regras`, `marcado_por`, `corrigido_por`, `corrigido_em`), gravada por `trg_escale_registra_o_ganho` (`AFTER UPDATE … WHEN status mudou` e `AFTER INSERT … WHEN status = 'won'`); sair de Ganho apaga a linha. Regras: só condições completas (atividade com tipo e vezes ≥ 1; tag não vazia). Candidatos: quem concluiu atividade no negócio (`crm_atividades_do_negocio.concluida_por`) e o dono. Cumpre = todas (E) ou alguma (OU) das condições; a tag vale para todos (é do contato). Entre os que cumprem: o dono, se cumprir; senão quem concluiu mais atividades no negócio; empate, a conclusão mais recente. Ninguém cumpre ou sem regra: o dono, `pela_regra = false`. Falha vira `warning` e não derruba o ganho | Q4 |
| N18 | **Correção pelo admin:** `PATCH /api/v1/leads/[id]/atribuicao-de-ganho` (admin) chama `fn_escale_corrigir_ganho` (definer, só `service_role`): troca `creditado_a` e `ganho_em`, grava quem corrigiu. **Não mexe em `crm_leads.closed_at`** (as métricas do original continuam pelo fechamento e pelo dono, Q4) | Q4 |
| N19 | **Tag na condição** = texto da tag do contato (`contacts.tags`), na régua `normalizarTag`; a Clint guarda o id da tag, aqui a tag é texto | modelo do original |
| N20 | **Tipos na lista da regra** na ordem e com os rótulos do print 027 ("Whatsapp" com w minúsculo é da Clint), gravados com os valores da 1I (`ligacao`, `email`, `agendamento`, `tarefa`, `reuniao`, `whatsapp`, `instagram`); condição sem tipo não é gravada; sem nenhuma condição gravada, a tela mostra uma linha vazia, como a Clint (`won_attribution` padrão com uma atividade vazia) | Clint; 1I |
| N21 | **Na ficha**, sem permissão, "Ganho" some das opções do status (Clint tira `WON`); o arrasto para a coluna de ganho e o ⋮ do card do original recebem a recusa do servidor (toast com o texto da Clint). "Ver atribuição de ganho" (ícone `Award`) entra no ⋮ da ficha quando o negócio está ganho | Clint (E, F) |
| N22 | **Notificações:** `settings.escale_notificacoes = { novo_negocio: { pessoas }, mudanca_de_status: { status: ("won"|"lost")[], pessoas } }`; sem pessoas, a chave some. "Novo negócio" vale para negócio com `created_by_user_id` nulo (a mesma régua da distribuição, Q2). Mudança de status não avisa o dono do negócio (o original já avisa o dono do ganho e da perda: toast e push) | Q1 |
| N23 | **Entrega:** push pelo handler `escale.avisos-da-origem` (servidor, eventos `lead.created`, `lead.won`, `lead.lost`), só para quem é membro ativo e vê o negócio (`podeVerNegocio` da 1J, com o papel lido no banco); toast e notificação do navegador pelo hook `useAvisosDaOrigem`, montado no `MenuDoTopo` da casca, pelo tempo real de `crm_leads` (a RLS já entrega só o que a pessoa vê). Categorias de preferência reaproveitadas: novo negócio = `lead_assigned`; ganho = `lead_won`; perda = `lead_lost` (sem tocar `lib/notifications/prefs.ts`) | Q1; o original |
| N24 | **Pessoas por id**, não por e-mail (a Clint guarda e-mail): o resto do fork guarda id, e e-mail muda | consistência |
| G1 | **Verificação enxuta** (aprovada em 17/10). Ver "Verificação" | política em vigor |

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`. **Esta fase roda numa worktree própria, `wt-1k`** (Task 1), porque outras sessões usam `repo/`.
- **Base:** `escale-crm/main` com a 1I e a 1J mergeadas (N2).
- **Migrations:** PR A `supabase/migrations/20261028120000_9013_distribuicao_de_dono.sql`; PR B `supabase/migrations/20261029120000_9014_atribuicao_de_ganho.sql`. A 9008 é da 1H, a 9009 da 1I, a 9010 da 1J; a série 91xx é da Frente B. Antes de criar cada uma: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; se o número já existir em outra branch, PARE e pergunte; se a `main` já tiver uma 90xx maior, troque número e timestamp em todos os lugares.
- **Branches:** PR A `feat/fase-1k-distribuicao`; PR B `feat/fase-1k-ganho` (da `escale-crm/main` depois do merge do A; a Task 8 prova); PR C `feat/fase-1k-avisos` (depois do merge do B; a Task 13 prova).
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova e mergeia é o usuário.
- **Proibido:** push em `origin` (Rafael), merge, tag, release, VPS e gravar no banco de produção.
- **Convivência:** se outra fase estiver aberta ao mesmo tempo, antes de abrir cada PR `git fetch escale-crm && git rebase escale-crm/main`; nos conflitos de `lib/i18n/dicionario.ts` e `supabase/baseline.sql` (blocos antes da mesma âncora), **mantenha os dois blocos**, o que já está na `main` primeiro.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` precisa do Docker Desktop: se `docker info` falhar, PARE e peça ao usuário.
- A worktree nova precisa de `corepack pnpm install --frozen-lockfile` uma vez e dos `.env*` copiados de `repo/` (não são versionados).

### Onde o fork entra nos arquivos do original

| Arquivo | Mudança | PR |
|---|---|---|
| `supabase/baseline.sql` | o bloco de cada migration, idêntico a ela, logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (depois do bloco da 9010) | A, B |
| `lib/i18n/dicionario.ts` | um bloco por PR logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───` | A, B, C |
| `app/api/v1/leads/[id]/move/route.ts` | 2 linhas `// FORK ESCALE · Fase 1K` depois de `recusaDeMotivoDaPerdaPeloBanco(updErr, …)` | B |
| `lib/leads/encerramento.ts` | 4 linhas depois de `recusaDeMotivoDaPerdaPeloBanco(updErr, ctx.idioma)` | B |
| `app/api/v1/leads/bulk/route.ts` | 4 linhas depois de `recusaDeMotivoDaPerdaPeloBanco(error, user.idioma)` | B |
| `lib/event-log/register-handlers.ts` | 1 import e 1 `registerHandler(avisosDaOrigemHandler)` marcados `FORK ESCALE · Fase 1K` | C |

Os do fork que mudam: `lib/escale/configuracoes/{tipos,gravar,montar,respostas,rascunho}.ts`, `app/api/v1/pipelines/[id]/configuracoes/route.ts`, `components/escale/configuracoes/JanelaDaOrigem.tsx`, `components/escale/origens/JanelaDaCasca.tsx` (prop `className`), `components/escale/negocio/{StatusDaFicha,MenuDaFicha}.tsx`, `components/escale/menu/MenuDoTopo.tsx`, `hooks/escale/useConfiguracoesDaOrigem.ts`, `lib/ui/icons-da-casca.ts`, `tests/invariants/rls-completude-varredura.test.ts`.

### Testes de fases anteriores que esta fase muda de propósito

| Teste | O que pinava | Por quê muda |
|---|---|---|
| `tests/unit/escale-janela-da-origem.test.tsx` ("subaba de outra fase mostra Em breve") | clicar em "Distribuição de dono" mostra "Chega na fase 1K…" | Task 5: passa a clicar em "Visualização de campos" ("Chega com o módulo Contatos (Fase 2).") |
| Fixtures `ConfiguracoesDaOrigem` em `escale-secao-{gerais,alerta,campos,motivos,permissoes}.test.tsx`, `escale-janela-da-origem.test.tsx`, `escale-configuracoes-gravar.test.ts` | sem `distribuicao`, `soAdminGanha`, `atribuicao`, `notificacoes` | Tasks 4, 10 e 13 acrescentam os campos (o typecheck aponta cada um) |
| `tests/unit/escale-configuracoes-rota.test.ts` | a resposta sem distribuição; o PATCH sem as seções novas | Tasks 4, 10 e 13 |
| `tests/unit/escale-ficha-status-e-dono.test.tsx` (1G/1J) | "Ganho" sempre nas opções | Task 11: some sem permissão |

### Cercas que precisam ficar verdes

- `controle-decorativo`: todo botão desligado tem `title`.
- `tailwind-tokens` e `escale-casca-tokens`: cores só por token da casca; nenhum hex novo em `className`.
- `vocabulario-do-funil`: nenhum "pipeline"/"kanban" em texto de JSX.
- `evidencia-citada`: este plano, copiado para o repositório, não cita imagem entre crases nem em link.
- `escale-casca-v2-original-intacto`: as peças do shell do original não importam `@/components/escale/`.
- `selecao-longa-tem-busca`: nada de `<select>`; `SeletorDaCasca`/`SeletorMultiploDaCasca`.
- `i18n-espanhol-cobre-a-tela` e `escale-espanhol-registro-tu`: todo `t("…")` novo tem espanhol, em "tú" (Tasks 7, 12 e 16).
- `manifest-x-migrations`: cada migration tem a linha `-- manifest:`; o `MANIFEST.md` não muda.
- `rls-completude-varredura`: as tabelas novas entram na lista com a razão (Tasks 3 e 9).
- `hardening-definer-varredura` e `definer-nova-nasce-exposta`: toda definer nova com `revoke all … from public, anon, authenticated` (as RPCs ganham `grant execute … to service_role`).
- `lgpd-cascata-alcanca-quem-guarda-pessoa`: as tabelas novas guardam só ids de equipe e de negócio, com `on delete cascade`/`set null`; se a cerca apontar alguma, siga a mensagem dela.
- `suporte-cobertura-de-efeitos`: toda rota que escreve chama `requireSupportWrite()` dentro do handler.
- `baseline-*` e `apendice-do-baseline-*`: o bloco é byte a byte igual à migration.

### Verificação (G1 — aprovada em 17/10)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit tests/invariants lib app components --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os de `tests/unit` com `corepack pnpm vitest run <arquivos>`. Typecheck: `corepack pnpm typecheck`. Eslint: `corepack pnpm eslint <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db`:** Tasks 3 e 9 (a prova nova e as vizinhas) e a rodada cheia do `test:db` no fim dos PRs A e B.
3. **Revisor (subagente) só** nas migrations (Tasks 2 e 9: `security-reviewer` e `database-reviewer`), nas rotas que gravam (Tasks 4 e 11) e no handler que manda push (Task 15). As outras são checadas pelo controlador, lendo o diff.
4. **Uma rodada cheia por PR**, no fim (Tasks 7, 12 e 16), em segundo plano, comparada com `.superpowers/sdd/falhas-conhecidas.txt`.
5. **Conferência visual** no fim de cada PR, contra os prints da tabela, com a lista escrita das diferenças que sobram (nas telas sem print, registre o que foi seguido do código).

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (ou o modelo da sessão que executa); o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório no PR A (Task 1).
- Todo texto de tela por `t()` com literal; nunca `t(variavel)`. Texto com nome dentro (`{nome}`) é traduzido inteiro e o nome entra depois: `t("{nome} saiu da distribuição").split("{nome}").join(nome)` (sem `String.replace`, que interpreta `$`).

## Arquivos

| Arquivo | Novo/alterado | PR | Responsabilidade |
|---|---|---|---|
| `lib/escale/distribuicao/regras.ts` | novo | A | tipos, percentual da tela, divisão igual, validação, bloqueio da lista de pessoas, versões do histórico, textos dos eventos |
| `supabase/migrations/20261028120000_9013_distribuicao_de_dono.sql`, `supabase/baseline.sql` | novo / bloco | A | as três tabelas, RLS, elegibilidade, salvar, reiniciar, os dois gatilhos |
| `lib/escale/distribuicao/ler.ts` | novo | A | a distribuição da origem com o papel de cada pessoa e a última alteração |
| `app/api/v1/pipelines/[id]/distribuicao/route.ts`, `…/distribuicao/reiniciar/route.ts`, `…/distribuicao/alteracoes/route.ts`, `…/distribuicao/feitas/route.ts` | novos | A | gravar, reiniciar, o histórico da configuração, as distribuições feitas |
| `hooks/escale/useDistribuicao.ts` | novo | A | os quatro hooks |
| `components/escale/ui/ConfirmacaoDaCasca.tsx` | novo | A | o balão "Não" / "Sim" |
| `components/escale/configuracoes/SecaoDistribuicao.tsx`, `RodapeDaDistribuicao.tsx`, `HistoricoDeAlteracoes.tsx`, `HistoricoDeDistribuicoes.tsx` | novos | A | a subaba, o rodapé, a gaveta do relógio, a janela do contador |
| `lib/escale/ganho/regras.ts`, `lib/escale/ganho/recusa.ts` | novos | B | condições, leitura e gravação, frases, quem pode ganhar; a recusa do banco |
| `supabase/migrations/20261029120000_9014_atribuicao_de_ganho.sql` | novo | B | a trava, a tabela do crédito, o cálculo, a correção |
| `app/api/v1/leads/[id]/atribuicao-de-ganho/route.ts`, `hooks/escale/useAtribuicaoDeGanho.ts` | novos | B | ler e corrigir o crédito |
| `components/escale/configuracoes/SecaoAtribuicao.tsx`, `components/escale/negocio/JanelaAtribuicaoDeGanho.tsx` | novos | B | a subaba; a janela do negócio ganho |
| `lib/escale/notificacoes/regras.ts`, `lib/escale/notificacoes/avisos-da-origem.handler.ts` | novos | C | leitura, gravação e decisão do aviso; o push |
| `app/api/v1/escale/avisos-da-origem/route.ts`, `hooks/escale/useAvisosDaOrigem.ts` | novos | C | as origens que avisam a pessoa; o toast pelo tempo real |
| `components/escale/configuracoes/SecaoNotificacoes.tsx` | novo | C | a subaba |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md` | alterado (fora do repositório) | A, B, C | a linha da 1K na seção 8; a pergunta 9 da seção 10 respondida; a nota das notificações da seção 2 |

---

# PR A — Distribuição de dono

### Task 1: Worktree, branch, plano no repositório e as regras puras da distribuição

**Files:**
- Create: `lib/escale/distribuicao/regras.ts`, `tests/unit/escale-distribuicao-regras.test.ts`, `docs/superpowers/plans/2026-10-18-fase-1k-distribuicao-ganho-e-avisos.md` (cópia)

**Interfaces:**
- Consumes: `temAcessoAOrigem({ papel, userId, pessoas, pessoasDoGrupo }): boolean` de `@/lib/escale/acesso/regras` (1J); `Role` de `@/lib/auth/types`.
- Produces: `DISTRIBUICAO_MAX = 50`, `POR_PAGINA_DAS_DISTRIBUICOES = 6`, `JANELA_DA_VERSAO_MS = 2000`, `EVENTOS_DA_DISTRIBUICAO`, `EventoDaDistribuicao`, `PessoaNaDistribuicao { userId; percentual: number; contador: number; papel: string | null }`, `LinhaDaDistribuicao { userId; percentual: string; papel: string | null }`, `AlteracaoDaDistribuicao { id; evento; pessoaId; percentualAntes; percentualDepois; autorId; em }`, `VersaoDaDistribuicao { autorId; em; itens }`, `PedidoDaDistribuicao { pessoas: { user_id; percentual: number }[]; reiniciar: boolean }`, `ERRO_DA_SOMA`, `ERRO_DO_ZERO`, `percentualDaTela(texto): number | null`, `textoDoPercentual(n): string`, `linhasDaTela(pessoas): LinhaDaDistribuicao[]`, `dividirIgual(linhas)`, `erroDaDistribuicao(linhas): string | null`, `pedidoDaDistribuicao(linhas, reiniciar)`, `distribuidosForaDaLista({ linhas, pessoas, pessoasDoGrupo }): string[]`, `textoDoBloqueio(quantos, segueOGrupo): string`, `versoesDaDistribuicao(alteracoes): VersaoDaDistribuicao[]`.

- [ ] **Step 1: A worktree, a branch e a cópia do plano**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git fetch escale-crm --quiet
for f in lib/escale/playbook/regras.ts lib/escale/acesso/regras.ts lib/escale/acesso/membros.ts \
         components/escale/configuracoes/ListaDePessoas.tsx components/escale/configuracoes/SecaoPermissoes.tsx \
         components/escale/ui/SeletorDeDataEHora.tsx \
         supabase/migrations/20261024120000_9009_playbook_de_etapas.sql \
         supabase/migrations/20261025120000_9010_acesso_por_origem.sql; do
  git cat-file -e "escale-crm/main:$f" && echo "ok $f" || echo "FALTA $f"
done
git worktree add -b feat/fase-1k-distribuicao "../wt-1k" escale-crm/main
cd "../wt-1k"
cp ../repo/.env* . 2>/dev/null || true
corepack pnpm install --frozen-lockfile
mkdir -p docs/superpowers/plans
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-18-fase-1k-distribuicao-ganho-e-avisos.md" docs/superpowers/plans/
```
Expected: oito linhas `ok …` e a worktree criada. **Qualquer `FALTA`: PARE** (N2: a 1I e a 1J precisam estar na `main`). Se a execução da 1I ou da 1J deu outro nome a algum arquivo, ache o equivalente (`git ls-tree -r --name-only escale-crm/main | grep -E "playbook|acesso|DataEHora"`) e confirme com o usuário antes de seguir. **Daqui até o fim do plano, todo comando roda em `C:\Documentos\projetos claude\Deskcom CRM\wt-1k`.**

Confira também as assinaturas que esta fase usa (se alguma mudou, ajuste as chamadas deste plano e registre no PR):
```bash
grep -n "export function temAcessoAOrigem\|export function podeVerNegocio\|export function regraEmVigor\|export function pessoasDaOrigem\|export const CHAVE_DAS_PESSOAS" lib/escale/acesso/regras.ts
grep -n "export const TIPOS_DE_ATIVIDADE\|export type TipoDeAtividade" lib/escale/playbook/regras.ts
grep -n "export async function membrosAtivos" lib/escale/acesso/membros.ts
grep -n "export function ListaDePessoas\|export function membrosAtivosDaEquipe\|export interface MembroDaEquipe" components/escale/configuracoes/ListaDePessoas.tsx
grep -n "export function SeletorDeDataEHora" components/escale/ui/SeletorDeDataEHora.tsx
grep -n "export async function modoDaOrganizacao" lib/escale/acesso/modo-da-organizacao.ts
```
Expected: uma linha para cada nome.

- [ ] **Step 2: O teste das regras (vai falhar)**

Create `tests/unit/escale-distribuicao-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  ERRO_DA_SOMA,
  ERRO_DO_ZERO,
  dividirIgual,
  distribuidosForaDaLista,
  erroDaDistribuicao,
  linhasDaTela,
  pedidoDaDistribuicao,
  percentualDaTela,
  textoDoBloqueio,
  textoDoPercentual,
  versoesDaDistribuicao,
  type AlteracaoDaDistribuicao,
  type LinhaDaDistribuicao,
} from "@/lib/escale/distribuicao/regras";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const linha = (userId: string, percentual: string, papel = "agent"): LinhaDaDistribuicao => ({
  userId,
  percentual,
  papel,
});

describe("percentual", () => {
  it("lê vírgula e ponto; vazio é null; o resto é NaN", () => {
    expect(percentualDaTela("33,33")).toBe(33.33);
    expect(percentualDaTela(" 50.5 ")).toBe(50.5);
    expect(percentualDaTela("")).toBeNull();
    expect(percentualDaTela("abc")).toBeNaN();
    expect(percentualDaTela("1,234")).toBeNaN();
  });

  it("escreve com vírgula, sem zeros sobrando (N10)", () => {
    expect(textoDoPercentual(33.33)).toBe("33,33");
    expect(textoDoPercentual(100)).toBe("100");
    expect(textoDoPercentual(12.5)).toBe("12,5");
  });

  it("linhasDaTela leva o percentual do servidor para o texto da tela", () => {
    expect(linhasDaTela([{ userId: A, percentual: 33.33, contador: 4, papel: "agent" }])).toEqual([
      { userId: A, percentual: "33,33", papel: "agent" },
    ]);
  });
});

describe("dividirIgual (Clint: entrou ou saiu alguém, todos com 100/n)", () => {
  it("três pessoas ficam com 33,33; uma fica com 100; nenhuma é lista vazia", () => {
    expect(
      dividirIgual([linha(A, "90"), linha(B, "5"), linha(C, "5")]).map((l) => l.percentual),
    ).toEqual(["33,33", "33,33", "33,33"]);
    expect(dividirIgual([linha(A, "10")]).map((l) => l.percentual)).toEqual(["100"]);
    expect(dividirIgual([])).toEqual([]);
  });
});

describe("erroDaDistribuicao (o que trava o Salvar)", () => {
  it("lista vazia passa; 33,33 três vezes soma 100 arredondado e passa", () => {
    expect(erroDaDistribuicao([])).toBeNull();
    expect(
      erroDaDistribuicao([linha(A, "33,33"), linha(B, "33,33"), linha(C, "33,33")]),
    ).toBeNull();
  });

  it("zero, vazio ou texto: 'maiores que 0%'", () => {
    expect(erroDaDistribuicao([linha(A, "100"), linha(B, "0")])).toBe(ERRO_DO_ZERO);
    expect(erroDaDistribuicao([linha(A, "100"), linha(B, "")])).toBe(ERRO_DO_ZERO);
    expect(erroDaDistribuicao([linha(A, "x")])).toBe(ERRO_DO_ZERO);
  });

  it("soma diferente de 100, ou alguém acima de 100: 'deve somar 100%'", () => {
    expect(erroDaDistribuicao([linha(A, "50"), linha(B, "40")])).toBe(ERRO_DA_SOMA);
    expect(erroDaDistribuicao([linha(A, "100,4")])).toBe(ERRO_DA_SOMA);
  });

  it("o pedido leva os números", () => {
    expect(pedidoDaDistribuicao([linha(A, "75"), linha(B, "25")], true)).toEqual({
      pessoas: [
        { user_id: A, percentual: 75 },
        { user_id: B, percentual: 25 },
      ],
      reiniciar: true,
    });
  });
});

describe("distribuidosForaDaLista (Q9 da 1J)", () => {
  it("sem lista na origem nem no grupo, ninguém fica de fora", () => {
    expect(
      distribuidosForaDaLista({
        linhas: [linha(A, "50"), linha(B, "50")],
        pessoas: [],
        pessoasDoGrupo: [],
      }),
    ).toEqual([]);
  });

  it("lista da origem só com A: B fica de fora; admin nunca fica", () => {
    const linhas = [linha(A, "40"), linha(B, "30"), linha(C, "30", "admin")];
    expect(distribuidosForaDaLista({ linhas, pessoas: [A], pessoasDoGrupo: [] })).toEqual([B]);
  });

  it("sem lista própria, vale a do grupo", () => {
    expect(
      distribuidosForaDaLista({
        linhas: [linha(A, "50"), linha(B, "50")],
        pessoas: [],
        pessoasDoGrupo: [B],
      }),
    ).toEqual([A]);
  });

  it("o texto da Clint: singular, plural e a variante do grupo", () => {
    expect(textoDoBloqueio(1, false)).toBe(
      "Não é possível salvar. Este usuário recebe negócios por distribuição nesta origem e não está na lista: {usuarios}. Inclua-o na lista de permissões ou remova-o da distribuição.",
    );
    expect(textoDoBloqueio(2, false)).toBe(
      "Não é possível salvar. Estes usuários recebem negócios por distribuição nesta origem e não estão na lista: {usuarios}. Inclua-os na lista de permissões ou remova-os da distribuição.",
    );
    expect(textoDoBloqueio(1, true)).toBe(
      "Não é possível salvar. Sem lista própria, a origem segue as permissões do grupo, e este usuário que recebe negócios por distribuição não está nelas: {usuarios}. Remova-o da distribuição ou mantenha uma lista própria que o inclua.",
    );
    expect(textoDoBloqueio(3, true)).toBe(
      "Não é possível salvar. Sem lista própria, a origem segue as permissões do grupo, e estes usuários que recebem negócios por distribuição não estão nelas: {usuarios}. Remova-os da distribuição ou mantenha uma lista própria que os inclua.",
    );
  });
});

describe("versoesDaDistribuicao (Clint: mesmo autor em até 2 s é uma versão)", () => {
  const alt = (id: string, autorId: string, em: string): AlteracaoDaDistribuicao => ({
    id,
    evento: "pessoa_entrou",
    pessoaId: A,
    percentualAntes: null,
    percentualDepois: 50,
    autorId,
    em,
  });

  it("junta as do mesmo autor perto no tempo e separa o resto, da mais nova para a mais velha", () => {
    const versoes = versoesDaDistribuicao([
      alt("1", A, "2026-10-18T10:00:00.000Z"),
      alt("2", A, "2026-10-18T10:00:01.500Z"),
      alt("3", B, "2026-10-18T10:00:02.000Z"),
      alt("4", A, "2026-10-18T11:00:00.000Z"),
    ]);
    expect(versoes.map((v) => v.itens.map((i) => i.id))).toEqual([["4"], ["3"], ["2", "1"]]);
    expect(versoes[0]?.autorId).toBe(A);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-distribuicao-regras.test.ts`
Expected: FAIL (o módulo não existe).

- [ ] **Step 3: As regras**

Create `lib/escale/distribuicao/regras.ts`:

```ts
/**
 * A DISTRIBUIÇÃO DE DONO DA ORIGEM (fork Escale, Fase 1K, D13; código `Is` da Clint).
 *
 * Regras puras da tela: o percentual como a pessoa digita (vírgula, N10), a
 * divisão igual quando alguém entra ou sai, a validação do Salvar, o bloqueio
 * da lista de pessoas da 1J (Q9) e as versões do histórico da configuração.
 * Quem escolhe o dono de cada negócio é o banco (`fn_escale_reparte_dono_da_origem`).
 */
import type { Role } from "@/lib/auth/types";
import { temAcessoAOrigem } from "@/lib/escale/acesso/regras";

export const DISTRIBUICAO_MAX = 50;
/** A janela "Histórico de distribuições" pagina de 6 em 6 (Clint). */
export const POR_PAGINA_DAS_DISTRIBUICOES = 6;
/** Mudanças do mesmo autor com até 2 s de diferença são uma versão só (Clint `Ms`). */
export const JANELA_DA_VERSAO_MS = 2000;

export const EVENTOS_DA_DISTRIBUICAO = [
  "percentual_alterado",
  "pessoa_entrou",
  "pessoa_saiu",
  "contagem_reiniciada",
] as const;
export type EventoDaDistribuicao = (typeof EVENTOS_DA_DISTRIBUICAO)[number];

/** Uma pessoa da distribuição como o servidor devolve. */
export interface PessoaNaDistribuicao {
  userId: string;
  percentual: number;
  contador: number;
  /** O papel na organização (admin passa por cima da lista de pessoas, 1J). */
  papel: string | null;
}

/**
 * Uma linha no rascunho: o percentual é o texto do campo. O contador fica de
 * fora (a tela o lê da origem): o reset não pode sujar o rascunho.
 */
export interface LinhaDaDistribuicao {
  userId: string;
  percentual: string;
  papel: string | null;
}

export interface AlteracaoDaDistribuicao {
  id: string;
  evento: EventoDaDistribuicao;
  pessoaId: string | null;
  percentualAntes: number | null;
  percentualDepois: number | null;
  autorId: string | null;
  em: string;
}

export interface VersaoDaDistribuicao {
  autorId: string | null;
  em: string;
  itens: AlteracaoDaDistribuicao[];
}

export interface PedidoDaDistribuicao {
  pessoas: Array<{ user_id: string; percentual: number }>;
  reiniciar: boolean;
}

export const ERRO_DA_SOMA = "Verificar o total das porcentagens, deve somar 100%.";
export const ERRO_DO_ZERO = "Verificar se as porcentagens são maiores que 0%.";

/** "33,33" ou "33.33" → 33.33; vazio → null; o resto → NaN. */
export function percentualDaTela(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (limpo === "") return null;
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(limpo)) return Number.NaN;
  return Number(limpo);
}

/** 33.33 → "33,33"; 100 → "100" (formato brasileiro). */
export function textoDoPercentual(n: number): string {
  return String(Number(n.toFixed(2))).replace(".", ",");
}

export function linhasDaTela(pessoas: readonly PessoaNaDistribuicao[]): LinhaDaDistribuicao[] {
  return pessoas.map((p) => ({
    userId: p.userId,
    percentual: textoDoPercentual(p.percentual),
    papel: p.papel,
  }));
}

/** Entrou ou saiu alguém: todos com 100/n, duas casas (Clint). */
export function dividirIgual(linhas: readonly LinhaDaDistribuicao[]): LinhaDaDistribuicao[] {
  if (linhas.length === 0) return [];
  const cada = textoDoPercentual(Number((100 / linhas.length).toFixed(2)));
  return linhas.map((l) => ({ ...l, percentual: cada }));
}

/** O texto que trava o Salvar, ou null (Clint: todos acima de 0; soma arredondada 100; lista vazia passa). */
export function erroDaDistribuicao(linhas: readonly LinhaDaDistribuicao[]): string | null {
  if (linhas.length === 0) return null;
  const valores = linhas.map((l) => percentualDaTela(l.percentual));
  if (valores.some((v) => v === null || Number.isNaN(v) || v <= 0)) return ERRO_DO_ZERO;
  if (valores.some((v) => (v ?? 0) > 100)) return ERRO_DA_SOMA;
  const soma = valores.reduce<number>((s, v) => s + (v ?? 0), 0);
  return Number(soma.toFixed(0)) === 100 ? null : ERRO_DA_SOMA;
}

export function pedidoDaDistribuicao(
  linhas: readonly LinhaDaDistribuicao[],
  reiniciar: boolean,
): PedidoDaDistribuicao {
  return {
    pessoas: linhas.map((l) => ({
      user_id: l.userId,
      percentual: percentualDaTela(l.percentual) ?? 0,
    })),
    reiniciar,
  };
}

/**
 * Q9 da 1J: quem está na distribuição, não é admin e ficaria sem acesso à
 * origem com estas listas (a da origem; vazia, a do grupo; as duas vazias, todos).
 */
export function distribuidosForaDaLista({
  linhas,
  pessoas,
  pessoasDoGrupo,
}: {
  linhas: readonly LinhaDaDistribuicao[];
  pessoas: readonly string[];
  pessoasDoGrupo: readonly string[];
}): string[] {
  return linhas
    .filter(
      (l) =>
        !temAcessoAOrigem({
          papel: (l.papel ?? "agent") as Role,
          userId: l.userId,
          pessoas: [...pessoas],
          pessoasDoGrupo: [...pessoasDoGrupo],
        }),
    )
    .map((l) => l.userId);
}

/** O texto da Clint (`Ps`), com `{usuarios}` para os nomes. Quem mostra passa por `t()` e troca o marcador. */
export function textoDoBloqueio(quantos: number, segueOGrupo: boolean): string {
  if (segueOGrupo) {
    return quantos === 1
      ? "Não é possível salvar. Sem lista própria, a origem segue as permissões do grupo, e este usuário que recebe negócios por distribuição não está nelas: {usuarios}. Remova-o da distribuição ou mantenha uma lista própria que o inclua."
      : "Não é possível salvar. Sem lista própria, a origem segue as permissões do grupo, e estes usuários que recebem negócios por distribuição não estão nelas: {usuarios}. Remova-os da distribuição ou mantenha uma lista própria que os inclua.";
  }
  return quantos === 1
    ? "Não é possível salvar. Este usuário recebe negócios por distribuição nesta origem e não está na lista: {usuarios}. Inclua-o na lista de permissões ou remova-o da distribuição."
    : "Não é possível salvar. Estes usuários recebem negócios por distribuição nesta origem e não estão na lista: {usuarios}. Inclua-os na lista de permissões ou remova-os da distribuição.";
}

/** As versões da gaveta do relógio: da mais nova para a mais velha; o mesmo autor em até 2 s é uma versão. */
export function versoesDaDistribuicao(
  alteracoes: readonly AlteracaoDaDistribuicao[],
): VersaoDaDistribuicao[] {
  const ordenadas = [...alteracoes].sort((a, b) => Date.parse(b.em) - Date.parse(a.em));
  return ordenadas.reduce<VersaoDaDistribuicao[]>((versoes, a) => {
    const ultima = versoes.at(-1);
    const ultimoItem = ultima?.itens.at(-1);
    const junta =
      ultima !== undefined &&
      ultimoItem !== undefined &&
      ultima.autorId === a.autorId &&
      Date.parse(ultimoItem.em) - Date.parse(a.em) <= JANELA_DA_VERSAO_MS;
    if (!junta || !ultima) return [...versoes, { autorId: a.autorId, em: a.em, itens: [a] }];
    return [...versoes.slice(0, -1), { ...ultima, itens: [...ultima.itens, a] }];
  }, []);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-distribuicao-regras.test.ts && corepack pnpm eslint lib/escale/distribuicao/regras.ts`
Expected: PASS, limpo. (Se `temAcessoAOrigem` da 1J tipar `pessoas` como `readonly string[]`, tire os `[...]`.)

- [ ] **Step 5: Commit**

```bash
corepack pnpm prettier --write lib/escale/distribuicao/regras.ts tests/unit/escale-distribuicao-regras.test.ts
git add lib/escale/distribuicao tests/unit/escale-distribuicao-regras.test.ts docs/superpowers/plans/2026-10-18-fase-1k-distribuicao-ganho-e-avisos.md
git commit -m "feat(escale): regras puras da distribuição de dono (Fase 1K, D13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: A migration 9013, o bloco do baseline e o teste de forma

**Files:**
- Create: `supabase/migrations/20261028120000_9013_distribuicao_de_dono.sql`, `tests/unit/escale-distribuicao-migration.test.ts`
- Modify: `supabase/baseline.sql` (bloco antes da âncora)

**Interfaces:**
- Consumes: `crm_pipelines.settings.escale_pessoas` e `crm_pipeline_groups.settings.escale_pessoas` (9010); `fn_role_at_least(uuid, text)`, `fn_log_event(uuid, text, jsonb)`; a chave de transação `deskcomm.desfecho_pelo_negocio` (0581).
- Produces: tabelas `crm_distribuicao_de_dono (organization_id, pipeline_id, user_id, percentual numeric(5,2), passo numeric, indice numeric, contador int, created_at, updated_at; PK (pipeline_id, user_id))`, `crm_distribuicoes_feitas (id, organization_id, pipeline_id, lead_id, user_id, distribuido_em)`, `crm_distribuicao_alteracoes (id, organization_id, pipeline_id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id, created_at)`; funções `fn_escale_recebe_da_origem(uuid, uuid, uuid) → boolean`, `fn_escale_salvar_distribuicao(p_org uuid, p_origem uuid, p_autor uuid, p_pessoas jsonb, p_reiniciar boolean)`, `fn_escale_reiniciar_distribuicao(p_org uuid, p_origem uuid, p_autor uuid)`; gatilhos `trg_escale_reparte_dono_da_origem` (BEFORE INSERT) e `trg_escale_registra_a_distribuicao` (AFTER INSERT). Erros: `22023 distribuicao_invalida`, `PT422 pessoa_sem_permissao`, `PT404 origem_nao_encontrada`.

- [ ] **Step 1: Conferir o número**

```bash
bash scripts/checar-colisao-de-migration.sh escale-crm/main
ls supabase/migrations | grep -E "_90[0-9]{2}_" | tail -3
```
Expected: sem colisão; a última 90xx é a 9010. Senão, siga a regra de "Migrations" (Global Constraints).

- [ ] **Step 2: O teste de forma (vai falhar)**

Create `tests/unit/escale-distribuicao-migration.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * FORK ESCALE · Fase 1K (D13): a forma da migration 9013, lida como texto. A
 * prova de comportamento é `tests/invariants/escale-distribuicao-de-dono.test.ts`.
 */
const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20261028120000_9013_distribuicao_de_dono.sql"),
  "utf8",
);
const BASELINE = readFileSync(join(process.cwd(), "supabase/baseline.sql"), "utf8");

const FUNCOES = [
  "fn_escale_recebe_da_origem(uuid, uuid, uuid)",
  "fn_escale_salvar_distribuicao(uuid, uuid, uuid, jsonb, boolean)",
  "fn_escale_reiniciar_distribuicao(uuid, uuid, uuid)",
  "fn_escale_reparte_dono_da_origem()",
  "fn_escale_registra_a_distribuicao()",
];

describe("migration 9013 — distribuição de dono", () => {
  it("abre com a linha do manifesto", () => {
    expect(MIGRATION.startsWith("-- manifest: **Distribuição de dono por origem")).toBe(true);
  });

  it("as três tabelas com RLS ligada e só a policy de leitura (gerente ou acima)", () => {
    for (const tabela of [
      "crm_distribuicao_de_dono",
      "crm_distribuicoes_feitas",
      "crm_distribuicao_alteracoes",
    ]) {
      expect(MIGRATION).toContain(`create table if not exists public.${tabela} (`);
      expect(MIGRATION).toContain(`alter table public.${tabela} enable row level security;`);
      expect(MIGRATION).toContain(`create policy ${tabela}_select on public.${tabela}`);
    }
    expect(MIGRATION.match(/fn_role_at_least\(organization_id, 'manager'\)/g)).toHaveLength(3);
    expect(MIGRATION).not.toMatch(/for (insert|update|delete|all) to authenticated/);
  });

  it("toda função é definer com search_path e fechada a public, anon e authenticated", () => {
    for (const f of FUNCOES) {
      expect(MIGRATION).toContain(
        `revoke all on function public.${f} from public, anon, authenticated;`,
      );
    }
    expect(MIGRATION.match(/security definer\s+set search_path = public, pg_temp/g)?.length).toBe(
      FUNCOES.length,
    );
  });

  it("só as duas RPCs abrem ao service_role; nenhuma ao authenticated", () => {
    expect(MIGRATION).toContain(
      "grant execute on function public.fn_escale_salvar_distribuicao(uuid, uuid, uuid, jsonb, boolean) to service_role;",
    );
    expect(MIGRATION).toContain(
      "grant execute on function public.fn_escale_reiniciar_distribuicao(uuid, uuid, uuid) to service_role;",
    );
    expect(MIGRATION).not.toMatch(/grant execute on function [^;]+ to [^;]*authenticated/);
  });

  it("os gatilhos: o BEFORE roda depois da carteira e do dono padrão (ordem alfabética) e antes da validação do dono", () => {
    expect(MIGRATION).toContain(
      "create trigger trg_escale_reparte_dono_da_origem\n  before insert on public.crm_leads",
    );
    expect(MIGRATION).toContain(
      "create trigger trg_escale_registra_a_distribuicao\n  after insert on public.crm_leads",
    );
    const nomes = [
      "trg_crm_lead_nasce_na_carteira",
      "trg_escale_dono_padrao_na_origem",
      "trg_escale_reparte_dono_da_origem",
      "trg_lead_so_liga_a_propria_empresa",
    ];
    expect([...nomes].sort()).toEqual(nomes);
  });

  it("o baseline traz o bloco idêntico, antes da âncora", () => {
    const bloco = `-- ---- FORK ESCALE · distribuição de dono (migration 9013) ----\n${MIGRATION}`;
    expect(BASELINE).toContain(bloco);
    expect(BASELINE.indexOf(bloco)).toBeLessThan(
      BASELINE.indexOf(
        "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----",
      ),
    );
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-distribuicao-migration.test.ts`
Expected: FAIL (arquivo não existe).

- [ ] **Step 3: A migration**

Create `supabase/migrations/20261028120000_9013_distribuicao_de_dono.sql` (a primeira linha é uma só, longa):

```sql
-- manifest: **Distribuição de dono por origem (fork Escale, Fase 1K, D13).** Três tabelas novas, lidas por gerente ou acima da organização e escritas só por funções definer fechadas (o servidor chama com o service role depois de conferir que quem pede é administrador): `crm_distribuicao_de_dono` (quem recebe, com percentual, passo, índice e contador), `crm_distribuicoes_feitas` (cada negócio distribuído) e `crm_distribuicao_alteracoes` (o histórico da configuração: percentual alterado, pessoa entrou, saiu e contagem reiniciada, com o autor — é a auditoria do reset). `fn_escale_salvar_distribuicao` troca a lista inteira (soma 100, todos acima de 0, só quem pode receber) e recomeça o rodízio; `fn_escale_reiniciar_distribuicao` zera contador e índice e apaga as distribuições feitas. `trg_escale_reparte_dono_da_origem` (BEFORE INSERT em `crm_leads`) dá dono ao negócio que nasce sem dono e sem pessoa que o criou, pelo rodízio ponderado da Clint (menor índice; o índice anda maior%/meu%), só entre membros ativos agente, gerente ou administrador com acesso à origem (`fn_escale_recebe_da_origem`, a régua da 9010 com a pessoa como parâmetro); `trg_escale_registra_a_distribuicao` (AFTER INSERT) grava a distribuição feita e emite `lead.assigned`. Falhar ao distribuir vira aviso e não derruba a criação do negócio.
-- 9013: distribuição de dono (fork Escale).

-- ── AS TABELAS ──────────────────────────────────────────────────────────────
-- Tabela própria, e não o `settings` da origem: o contador muda a cada negócio,
-- e o `settings` é gravado inteiro pelo "Salvar" da janela (corrida). O passo
-- é `maior% / meu%` (quem tem o maior percentual anda 1 por negócio); o
-- próximo dono é quem tem o MENOR índice (Clint: `inc_index`, `cur_index`).
create table if not exists public.crm_distribuicao_de_dono (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  percentual numeric(5,2) not null,
  passo numeric not null,
  indice numeric not null default 0,
  contador integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pipeline_id, user_id),
  constraint crm_distribuicao_de_dono_percentual_valido check (percentual > 0 and percentual <= 100),
  constraint crm_distribuicao_de_dono_passo_valido check (passo >= 1),
  constraint crm_distribuicao_de_dono_contador_valido check (contador >= 0)
);
create index if not exists idx_crm_distribuicao_de_dono_org
  on public.crm_distribuicao_de_dono (organization_id, pipeline_id);

create table if not exists public.crm_distribuicoes_feitas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  distribuido_em timestamptz not null default now()
);
create index if not exists idx_crm_distribuicoes_feitas_origem
  on public.crm_distribuicoes_feitas (pipeline_id, distribuido_em desc);
create index if not exists idx_crm_distribuicoes_feitas_pessoa
  on public.crm_distribuicoes_feitas (pipeline_id, user_id, distribuido_em desc);
create index if not exists idx_crm_distribuicoes_feitas_lead
  on public.crm_distribuicoes_feitas (lead_id);

create table if not exists public.crm_distribuicao_alteracoes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  evento text not null,
  pessoa_id uuid references auth.users(id) on delete set null,
  percentual_antes numeric(5,2),
  percentual_depois numeric(5,2),
  autor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint crm_distribuicao_alteracoes_evento_valido
    check (evento in ('percentual_alterado', 'pessoa_entrou', 'pessoa_saiu', 'contagem_reiniciada'))
);
create index if not exists idx_crm_distribuicao_alteracoes_origem
  on public.crm_distribuicao_alteracoes (pipeline_id, created_at desc);

-- Leitura: gerente ou acima da organização (é o gerente que salva a lista de
-- pessoas da origem e precisa ver quem está na distribuição). Escrita: nenhuma
-- policy — só as funções abaixo, que o servidor chama depois de conferir o admin.
alter table public.crm_distribuicao_de_dono enable row level security;
alter table public.crm_distribuicoes_feitas enable row level security;
alter table public.crm_distribuicao_alteracoes enable row level security;

drop policy if exists crm_distribuicao_de_dono_select on public.crm_distribuicao_de_dono;
create policy crm_distribuicao_de_dono_select on public.crm_distribuicao_de_dono
  for select to authenticated
  using (public.fn_role_at_least(organization_id, 'manager'));

drop policy if exists crm_distribuicoes_feitas_select on public.crm_distribuicoes_feitas;
create policy crm_distribuicoes_feitas_select on public.crm_distribuicoes_feitas
  for select to authenticated
  using (public.fn_role_at_least(organization_id, 'manager'));

drop policy if exists crm_distribuicao_alteracoes_select on public.crm_distribuicao_alteracoes;
create policy crm_distribuicao_alteracoes_select on public.crm_distribuicao_alteracoes
  for select to authenticated
  using (public.fn_role_at_least(organization_id, 'manager'));

-- ── QUEM PODE RECEBER NEGÓCIO DESTA ORIGEM ─────────────────────────────────
-- Membro ativo (convite aceito, não revogado), papel agente, gerente ou admin
-- (o viewer seria recusado pelo `trg_lead_so_liga_a_propria_empresa`), e com
-- acesso à origem pela régua da 9010: admin sempre; senão a lista da origem;
-- vazia, a do grupo; as duas vazias, todos. Só contam textos com forma de uuid
-- (a leitura tolerante da 1J: lixo vale como "sem lista").
create or replace function public.fn_escale_recebe_da_origem(p_org uuid, p_origem uuid, p_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_papel text;
  v_bruta jsonb;
  v_grupo uuid;
  v_ids text[];
begin
  select uo.role into v_papel
    from public.user_organizations uo
   where uo.user_id = p_user
     and uo.organization_id = p_org
     and uo.accepted_at is not null
     and uo.revoked_at is null
   limit 1;
  if v_papel is null or v_papel not in ('agent', 'manager', 'admin') then
    return false;
  end if;
  if v_papel = 'admin' then
    return true;
  end if;

  select p.settings -> 'escale_pessoas', p.group_id into v_bruta, v_grupo
    from public.crm_pipelines p
   where p.id = p_origem
     and p.organization_id = p_org;
  if not found then
    return false;
  end if;

  for i in 1..2 loop
    select coalesce(array_agg(lower(e.v #>> '{}')), '{}') into v_ids
      from jsonb_array_elements(
        case when jsonb_typeof(v_bruta) = 'array' then v_bruta else '[]'::jsonb end
      ) as e(v)
     where jsonb_typeof(e.v) = 'string'
       and (e.v #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    exit when cardinality(v_ids) > 0 or i = 2;
    select g.settings -> 'escale_pessoas' into v_bruta
      from public.crm_pipeline_groups g
     where g.id = v_grupo
       and g.organization_id = p_org;
  end loop;

  return cardinality(v_ids) = 0 or lower(p_user::text) = any(v_ids);
end
$fn$;

revoke all on function public.fn_escale_recebe_da_origem(uuid, uuid, uuid) from public, anon, authenticated;

-- ── SALVAR A LISTA ─────────────────────────────────────────────────────────
-- Troca a lista inteira numa transação. Valida de novo o que a rota já validou
-- (soma arredondada 100 ou lista vazia; todos > 0 e <= 100; sem repetição; só
-- quem pode receber), registra no histórico quem saiu, entrou ou mudou de
-- percentual, e recomeça o rodízio (índice 0 para todos, como a Clint). Com
-- `p_reiniciar`, zera também o contador e apaga as distribuições feitas.
create or replace function public.fn_escale_salvar_distribuicao(
  p_org uuid,
  p_origem uuid,
  p_autor uuid,
  p_pessoas jsonb,
  p_reiniciar boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_ids uuid[];
  v_pcts numeric[];
  v_n integer;
  v_soma numeric;
  v_maior numeric;
  v_menor numeric;
begin
  perform 1 from public.crm_pipelines p where p.id = p_origem and p.organization_id = p_org;
  if not found then
    raise exception 'origem_nao_encontrada' using errcode = 'PT404';
  end if;
  if p_pessoas is null or jsonb_typeof(p_pessoas) <> 'array' or jsonb_array_length(p_pessoas) > 50 then
    raise exception 'distribuicao_invalida' using errcode = '22023';
  end if;

  select coalesce(array_agg((x.e ->> 'user_id')::uuid order by x.o), '{}'),
         coalesce(array_agg(round((x.e ->> 'percentual')::numeric, 2) order by x.o), '{}')
    into v_ids, v_pcts
    from jsonb_array_elements(p_pessoas) with ordinality as x(e, o);

  v_n := cardinality(v_ids);
  if v_n > 0 then
    select sum(p), max(p), min(p) into v_soma, v_maior, v_menor from unnest(v_pcts) as p;
    if (select count(distinct i) from unnest(v_ids) as i) <> v_n
       or exists (select 1 from unnest(v_pcts) as p where p is null)
       or v_menor <= 0
       or v_maior > 100
       or round(v_soma) <> 100 then
      raise exception 'distribuicao_invalida' using errcode = '22023';
    end if;
    if exists (
      select 1 from unnest(v_ids) as i
       where not public.fn_escale_recebe_da_origem(p_org, p_origem, i)
    ) then
      raise exception 'pessoa_sem_permissao' using errcode = 'PT422';
    end if;
  end if;

  -- A mesma trava do gatilho: salvar e distribuir não se cruzam.
  perform 1 from public.crm_distribuicao_de_dono d
    where d.pipeline_id = p_origem
    order by d.user_id
    for update;

  insert into public.crm_distribuicao_alteracoes
    (organization_id, pipeline_id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id)
  select p_org, p_origem, 'pessoa_saiu', d.user_id, d.percentual, null, p_autor
    from public.crm_distribuicao_de_dono d
   where d.pipeline_id = p_origem
     and not (d.user_id = any(v_ids));

  insert into public.crm_distribuicao_alteracoes
    (organization_id, pipeline_id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id)
  select p_org, p_origem, 'pessoa_entrou', n.i, null, n.p, p_autor
    from unnest(v_ids, v_pcts) as n(i, p)
   where not exists (
     select 1 from public.crm_distribuicao_de_dono d where d.pipeline_id = p_origem and d.user_id = n.i
   );

  insert into public.crm_distribuicao_alteracoes
    (organization_id, pipeline_id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id)
  select p_org, p_origem, 'percentual_alterado', n.i, d.percentual, n.p, p_autor
    from unnest(v_ids, v_pcts) as n(i, p)
    join public.crm_distribuicao_de_dono d on d.pipeline_id = p_origem and d.user_id = n.i
   where d.percentual <> n.p;

  delete from public.crm_distribuicao_de_dono d
   where d.pipeline_id = p_origem
     and not (d.user_id = any(v_ids));

  if v_n > 0 then
    insert into public.crm_distribuicao_de_dono (organization_id, pipeline_id, user_id, percentual, passo)
    select p_org, p_origem, n.i, n.p, v_maior / n.p
      from unnest(v_ids, v_pcts) as n(i, p)
    on conflict (pipeline_id, user_id) do update
      set percentual = excluded.percentual,
          passo = excluded.passo,
          updated_at = now();
  end if;

  update public.crm_distribuicao_de_dono
     set indice = 0,
         contador = case when p_reiniciar then 0 else contador end,
         updated_at = now()
   where pipeline_id = p_origem;

  if p_reiniciar then
    delete from public.crm_distribuicoes_feitas where pipeline_id = p_origem;
    insert into public.crm_distribuicao_alteracoes
      (organization_id, pipeline_id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id)
    values (p_org, p_origem, 'contagem_reiniciada', null, null, null, p_autor);
  end if;
end
$fn$;

revoke all on function public.fn_escale_salvar_distribuicao(uuid, uuid, uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.fn_escale_salvar_distribuicao(uuid, uuid, uuid, jsonb, boolean) to service_role;

-- ── RESETAR A DISTRIBUIÇÃO ─────────────────────────────────────────────────
-- "Zera o contador de todos os usuários, reinicia o rodízio e apaga o
-- histórico de distribuições desta origem." O reinício fica no histórico da
-- configuração, com o autor: é a auditoria do reset.
create or replace function public.fn_escale_reiniciar_distribuicao(p_org uuid, p_origem uuid, p_autor uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  perform 1 from public.crm_pipelines p where p.id = p_origem and p.organization_id = p_org;
  if not found then
    raise exception 'origem_nao_encontrada' using errcode = 'PT404';
  end if;
  perform 1 from public.crm_distribuicao_de_dono d
    where d.pipeline_id = p_origem
    order by d.user_id
    for update;
  update public.crm_distribuicao_de_dono
     set indice = 0, contador = 0, updated_at = now()
   where pipeline_id = p_origem;
  delete from public.crm_distribuicoes_feitas where pipeline_id = p_origem;
  insert into public.crm_distribuicao_alteracoes
    (organization_id, pipeline_id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id)
  values (p_org, p_origem, 'contagem_reiniciada', null, null, null, p_autor);
end
$fn$;

revoke all on function public.fn_escale_reiniciar_distribuicao(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_escale_reiniciar_distribuicao(uuid, uuid, uuid) to service_role;

-- ── O GATILHO QUE ESCOLHE O DONO ───────────────────────────────────────────
-- Só o negócio que nasce sem dono (nem pessoa, nem agente de IA) e sem pessoa
-- que o criou (`created_by_user_id` nulo: captação, automação, API, agente,
-- conversa nova). Roda depois da carteira e do dono padrão da 9010 (ordem
-- alfabética dos BEFORE) e antes de `trg_lead_so_liga_a_propria_empresa`, que
-- confere o escolhido. Trava as linhas da origem em ordem fixa (duas criações
-- ao mesmo tempo não pegam o mesmo índice), escolhe o elegível de menor índice
-- (empate: menor user_id), anda o passo e soma 1 ao contador. Avisa o AFTER por
-- uma chave de transação. Qualquer falha vira aviso: o negócio nasce sem dono,
-- como hoje.
create or replace function public.fn_escale_reparte_dono_da_origem()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_user uuid;
begin
  if new.owner_user_id is not null or new.owner_agent_id is not null or new.created_by_user_id is not null then
    return new;
  end if;

  begin
    perform 1 from public.crm_distribuicao_de_dono d
      where d.pipeline_id = new.pipeline_id
        and d.organization_id = new.organization_id
      order by d.user_id
      for update;
    if not found then
      return new;
    end if;

    select d.user_id into v_user
      from public.crm_distribuicao_de_dono d
     where d.pipeline_id = new.pipeline_id
       and d.organization_id = new.organization_id
       and public.fn_escale_recebe_da_origem(new.organization_id, new.pipeline_id, d.user_id)
     order by d.indice, d.user_id
     limit 1;
    if v_user is null then
      return new;
    end if;

    update public.crm_distribuicao_de_dono
       set indice = indice + passo,
           contador = contador + 1,
           updated_at = now()
     where pipeline_id = new.pipeline_id
       and user_id = v_user;

    perform set_config(
      'escale.distribuidos',
      coalesce(current_setting('escale.distribuidos', true), '') || new.id::text || ',',
      true
    );
  exception when others then
    raise warning 'fn_escale_reparte_dono_da_origem: % (%)', sqlerrm, sqlstate;
    return new;
  end;

  new.owner_user_id := v_user;
  new.owner_kind := 'user';
  new.assigned_at := now();
  return new;
end
$fn$;

revoke all on function public.fn_escale_reparte_dono_da_origem() from public, anon, authenticated;

drop trigger if exists trg_escale_reparte_dono_da_origem on public.crm_leads;
create trigger trg_escale_reparte_dono_da_origem
  before insert on public.crm_leads
  for each row execute function public.fn_escale_reparte_dono_da_origem();

-- ── O GATILHO QUE REGISTRA E ANUNCIA ───────────────────────────────────────
-- Dono posto num BEFORE INSERT não gera `lead.assigned` (o gatilho de eventos
-- do original só olha UPDATE). Aqui ele sai, com `via: distribuicao`, pela
-- mesma chave de transação da 0581 (`deskcomm.desfecho_pelo_negocio`): o push
-- "Lead atribuído a você" e as automações de `lead.assigned` valem também
-- para o negócio distribuído. Falha vira aviso.
create or replace function public.fn_escale_registra_a_distribuicao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_marca text := coalesce(current_setting('escale.distribuidos', true), '');
  v_antes text;
begin
  if new.owner_user_id is null or position(new.id::text || ',' in v_marca) = 0 then
    return null;
  end if;

  begin
    insert into public.crm_distribuicoes_feitas (organization_id, pipeline_id, lead_id, user_id)
    values (new.organization_id, new.pipeline_id, new.id, new.owner_user_id);

    v_antes := current_setting('deskcomm.desfecho_pelo_negocio', true);
    perform set_config('deskcomm.desfecho_pelo_negocio', 'on', true);
    perform public.fn_log_event(new.organization_id, 'lead.assigned', jsonb_build_object(
      'lead_id', new.id,
      'from_user_id', null, 'to_user_id', new.owner_user_id,
      'from_agent_id', null, 'to_agent_id', null,
      'owner_kind', 'user',
      'via', 'distribuicao'));
    perform set_config('deskcomm.desfecho_pelo_negocio', coalesce(v_antes, ''), true);
  exception when others then
    raise warning 'fn_escale_registra_a_distribuicao: % (%)', sqlerrm, sqlstate;
  end;
  return null;
end
$fn$;

revoke all on function public.fn_escale_registra_a_distribuicao() from public, anon, authenticated;

drop trigger if exists trg_escale_registra_a_distribuicao on public.crm_leads;
create trigger trg_escale_registra_a_distribuicao
  after insert on public.crm_leads
  for each row execute function public.fn_escale_registra_a_distribuicao();

comment on table public.crm_distribuicao_de_dono is
  'Fork Escale (9013): quem recebe os negócios sem dono de cada origem, com percentual, passo, índice e contador. Gerente+ lê; só as funções escrevem.';
comment on table public.crm_distribuicoes_feitas is
  'Fork Escale (9013): cada negócio distribuído (a janela do contador). O reset apaga as da origem.';
comment on table public.crm_distribuicao_alteracoes is
  'Fork Escale (9013): o histórico da configuração da distribuição, com o autor (auditoria do reset).';

notify pgrst, 'reload schema';
```

Em plpgsql, a variável `i` do `for i in 1..2 loop` é declarada pelo próprio laço: não a declare.

- [ ] **Step 4: O bloco do baseline**

Em `supabase/baseline.sql`, logo ANTES da linha `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (e depois do bloco da 9010), entra a linha `-- ---- FORK ESCALE · distribuição de dono (migration 9013) ----` seguida do conteúdo **inteiro** da migration, byte a byte, e uma linha em branco:

```bash
node -e '
const fs = require("fs");
const mig = fs.readFileSync("supabase/migrations/20261028120000_9013_distribuicao_de_dono.sql", "utf8");
const ancora = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const base = fs.readFileSync("supabase/baseline.sql", "utf8");
if (!base.includes(ancora)) throw new Error("âncora sumiu");
const bloco = "-- ---- FORK ESCALE · distribuição de dono (migration 9013) ----\n" + mig + "\n";
fs.writeFileSync("supabase/baseline.sql", base.replace(ancora, () => bloco + ancora));
'
```

- [ ] **Step 5: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-distribuicao-migration.test.ts
corepack pnpm vitest run $(grep -rlE "baseline\.sql|MANIFEST" tests/unit --include='*.test.ts' | tr '\n' ' ')
```
Expected: PASS nos dois.

- [ ] **Step 6: Revisor (G1).** Dispare em paralelo o `security-reviewer` e o `database-reviewer` com a migration e as perguntas: "alguém com sessão escreve nas tabelas ou executa as funções? a escolha do dono fica certa sob duas inserções ao mesmo tempo? a falha do gatilho pode derrubar a criação do negócio? a régua de acesso bate com a da 9010 (`fn_escale_tem_acesso_a_origem`)?". Corrija o que for CRITICAL/HIGH, na migration **e** no baseline (rode o Step 4 de novo sobre um baseline sem o bloco: `git checkout supabase/baseline.sql` antes).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261028120000_9013_distribuicao_de_dono.sql supabase/baseline.sql tests/unit/escale-distribuicao-migration.test.ts
git commit -m "feat(escale): migration 9013, distribuição de dono por origem (Fase 1K, D13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A prova no Postgres

**Files:**
- Create: `tests/invariants/escale-distribuicao-de-dono.test.ts`
- Modify: `tests/invariants/rls-completude-varredura.test.ts`

**Interfaces:** consome `gov-helpers` (`seedGov`, `sql`, `lastLine`, `countAs`, `GOV_ADMIN`, `GOV_AGENT_A`, `GOV_AGENT_B`, `GOV_MANAGER`, `GOV_VIEWER`) e a 9013.

- [ ] **Step 1: A prova**

Create `tests/invariants/escale-distribuicao-de-dono.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_MANAGER,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * DISTRIBUIÇÃO DE DONO (fork Escale, migration 9013) — prova contra Postgres
 * real. Organização própria (namespace e5ca1e00-9013) com os membros do
 * seedGov e três origens: LIVRE (sem lista de pessoas), LISTA (escale_pessoas
 * = [A]) e VAZIA (sem distribuição). Cada teste cria os próprios negócios.
 *
 * Roda via `pnpm test:db`.
 */
const ORG = "e5ca1e00-9013-4000-8000-000000000001";
const P_LIVRE = "e5ca1e00-9013-4000-8000-000000000011";
const P_LISTA = "e5ca1e00-9013-4000-8000-000000000012";
const P_VAZIA = "e5ca1e00-9013-4000-8000-000000000013";
const ORIGENS = [P_LIVRE, P_LISTA, P_VAZIA];
const ETAPA = (p: string) => p.replace("-0000000000", "-0000000001");

let seq = 0;
const novoId = () => `e5ca1e00-9013-4000-9000-${String(++seq).padStart(12, "0")}`;
const n = (q: string) => Number(lastLine(sql(q)));

function salvar(origem: string, pessoas: Array<[string, number]>, reiniciar = false) {
  const lista = JSON.stringify(pessoas.map(([user_id, percentual]) => ({ user_id, percentual })));
  sql(
    `select public.fn_escale_salvar_distribuicao('${ORG}', '${origem}', '${GOV_ADMIN}', '${lista}'::jsonb, ${reiniciar});`,
  );
}

/** Cria `quantos` negócios na origem; `extra` = colunas a mais (`owner_user_id`, `created_by_user_id`). */
function criar(origem: string, quantos: number, extra: Record<string, string> = {}): string[] {
  const ids = Array.from({ length: quantos }, novoId);
  const colunas = Object.keys(extra)
    .map((c) => `, ${c}`)
    .join("");
  const valores = Object.values(extra)
    .map((v) => `, '${v}'`)
    .join("");
  for (const id of ids) {
    sql(`insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title${colunas})
         values ('${id}', '${ORG}', '${origem}', '${ETAPA(origem)}', 'prova 9013'${valores});`);
  }
  return ids;
}

const dono = (id: string) =>
  lastLine(sql(`select coalesce(owner_user_id::text, 'nenhum') from public.crm_leads where id = '${id}';`));
const lista = (ids: string[]) => ids.map((i) => `'${i}'`).join(",");

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG}', 'escale-distribuicao', 'Escale Distribuição Org', 'Escale Distribuição')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values
      ('${GOV_AGENT_A}', '${ORG}', 'agent', now()),
      ('${GOV_AGENT_B}', '${ORG}', 'agent', now()),
      ('${GOV_VIEWER}', '${ORG}', 'viewer', now()),
      ('${GOV_MANAGER}', '${ORG}', 'manager', now()),
      ('${GOV_ADMIN}', '${ORG}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug, settings) values
      ('${P_LIVRE}', '${ORG}', 'Livre', 'escale-dist-livre', '{}'::jsonb),
      ('${P_LISTA}', '${ORG}', 'Lista', 'escale-dist-lista', '{"escale_pessoas":["${GOV_AGENT_A}"]}'::jsonb),
      ('${P_VAZIA}', '${ORG}', 'Vazia', 'escale-dist-vazia', '{}'::jsonb)
      on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values
      ${ORIGENS.map((p) => `('${ETAPA(p)}', '${ORG}', '${p}', 'Novo', 'novo', 1000)`).join(",\n      ")}
      on conflict do nothing;
  `);
});

describe("o rodízio ponderado (N5)", () => {
  it("75/25 e oito negócios sem dono: 6 para A, 2 para B; contador, feitas e lead.assigned batem", () => {
    salvar(P_LIVRE, [[GOV_AGENT_A, 75], [GOV_AGENT_B, 25]], true);
    const ids = criar(P_LIVRE, 8);
    expect(ids.filter((i) => dono(i) === GOV_AGENT_A)).toHaveLength(6);
    expect(ids.filter((i) => dono(i) === GOV_AGENT_B)).toHaveLength(2);
    const contador = (u: string) =>
      n(`select contador from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}' and user_id = '${u}';`);
    expect(contador(GOV_AGENT_A)).toBe(6);
    expect(contador(GOV_AGENT_B)).toBe(2);
    expect(n(`select count(*) from public.crm_distribuicoes_feitas where lead_id in (${lista(ids)});`)).toBe(8);
    expect(
      n(`select count(*) from public.event_log
          where event_type = 'lead.assigned' and payload->>'via' = 'distribuicao'
            and payload->>'lead_id' in (${lista(ids)});`),
    ).toBe(8);
    expect(
      n(`select count(*) from public.crm_leads
          where id in (${lista(ids)}) and owner_kind = 'user' and assigned_at is not null;`),
    ).toBe(8);
  });

  it("quem nasce com dono ou criado por uma pessoa não entra", () => {
    salvar(P_LIVRE, [[GOV_AGENT_A, 50], [GOV_AGENT_B, 50]], true);
    const [comDono] = criar(P_LIVRE, 1, { owner_user_id: GOV_MANAGER });
    const [porPessoa] = criar(P_LIVRE, 1, { created_by_user_id: GOV_MANAGER });
    expect(dono(comDono!)).toBe(GOV_MANAGER);
    expect(dono(porPessoa!)).toBe("nenhum");
    expect(
      n(`select coalesce(sum(contador), 0) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}';`),
    ).toBe(0);
  });

  it("origem sem distribuição: nasce sem dono, como hoje", () => {
    const [id] = criar(P_VAZIA, 1);
    expect(dono(id!)).toBe("nenhum");
  });

  it("pessoa revogada sai do rodízio; ninguém elegível = sem dono, e a criação não cai", () => {
    salvar(P_LIVRE, [[GOV_AGENT_A, 50], [GOV_AGENT_B, 50]], true);
    sql(`update public.user_organizations set revoked_at = now()
          where user_id = '${GOV_AGENT_B}' and organization_id = '${ORG}';`);
    try {
      const ids = criar(P_LIVRE, 3);
      expect(ids.map(dono)).toEqual([GOV_AGENT_A, GOV_AGENT_A, GOV_AGENT_A]);
      sql(`update public.user_organizations set revoked_at = now()
            where user_id = '${GOV_AGENT_A}' and organization_id = '${ORG}';`);
      const [semNinguem] = criar(P_LIVRE, 1);
      expect(dono(semNinguem!)).toBe("nenhum");
    } finally {
      sql(`update public.user_organizations set revoked_at = null where organization_id = '${ORG}';`);
    }
  });
});

describe("salvar valida de novo (N7)", () => {
  it("soma diferente de 100, percentual 0 e pessoa repetida: 22023", () => {
    expect(() => salvar(P_LIVRE, [[GOV_AGENT_A, 50], [GOV_AGENT_B, 40]])).toThrow(/distribuicao_invalida/);
    expect(() => salvar(P_LIVRE, [[GOV_AGENT_A, 100], [GOV_AGENT_B, 0]])).toThrow(/distribuicao_invalida/);
    expect(() => salvar(P_LIVRE, [[GOV_AGENT_A, 50], [GOV_AGENT_A, 50]])).toThrow(/distribuicao_invalida/);
  });

  it("viewer não recebe; fora da lista da origem também não (PT422); admin sempre", () => {
    expect(() => salvar(P_LIVRE, [[GOV_VIEWER, 100]])).toThrow(/pessoa_sem_permissao/);
    expect(() => salvar(P_LISTA, [[GOV_AGENT_A, 50], [GOV_AGENT_B, 50]])).toThrow(/pessoa_sem_permissao/);
    salvar(P_LISTA, [[GOV_AGENT_A, 50], [GOV_ADMIN, 50]]);
    expect(n(`select count(*) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LISTA}';`)).toBe(2);
  });

  it("o histórico registra quem entrou, saiu e mudou, com o autor; salvar recomeça o rodízio", () => {
    salvar(P_LIVRE, [[GOV_AGENT_A, 50], [GOV_AGENT_B, 50]], true);
    criar(P_LIVRE, 3);
    salvar(P_LIVRE, [[GOV_AGENT_A, 60], [GOV_MANAGER, 40]]);
    const eventos = lastLine(
      sql(`select string_agg(evento || ':' || coalesce(pessoa_id::text, '-'), ',' order by evento, pessoa_id)
             from public.crm_distribuicao_alteracoes
            where pipeline_id = '${P_LIVRE}' and autor_id = '${GOV_ADMIN}'
              and created_at = (select max(created_at) from public.crm_distribuicao_alteracoes
                                 where pipeline_id = '${P_LIVRE}');`),
    );
    expect(eventos).toBe(
      `percentual_alterado:${GOV_AGENT_A},pessoa_entrou:${GOV_MANAGER},pessoa_saiu:${GOV_AGENT_B}`,
    );
    expect(
      n(`select coalesce(sum(indice), 0) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}';`),
    ).toBe(0);
    expect(
      n(`select contador from public.crm_distribuicao_de_dono
          where pipeline_id = '${P_LIVRE}' and user_id = '${GOV_AGENT_A}';`),
    ).toBeGreaterThan(0);
  });

  it("reiniciar zera contador e índice, apaga as feitas e registra o reinício", () => {
    salvar(P_LIVRE, [[GOV_AGENT_A, 50], [GOV_AGENT_B, 50]]);
    criar(P_LIVRE, 2);
    sql(`select public.fn_escale_reiniciar_distribuicao('${ORG}', '${P_LIVRE}', '${GOV_ADMIN}');`);
    expect(
      n(`select coalesce(sum(contador), 0) + coalesce(sum(indice), 0)
           from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}';`),
    ).toBe(0);
    expect(n(`select count(*) from public.crm_distribuicoes_feitas where pipeline_id = '${P_LIVRE}';`)).toBe(0);
    expect(
      n(`select count(*) from public.crm_distribuicao_alteracoes
          where pipeline_id = '${P_LIVRE}' and evento = 'contagem_reiniciada' and autor_id = '${GOV_ADMIN}';`),
    ).toBeGreaterThan(0);
  });
});

describe("RLS e funções fechadas (N7, N8)", () => {
  it("gerente e admin leem; agente e viewer leem zero", () => {
    salvar(P_LIVRE, [[GOV_AGENT_A, 50], [GOV_AGENT_B, 50]]);
    const q = `select count(*) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}'`;
    expect(countAs(GOV_MANAGER, q)).toBe(2);
    expect(countAs(GOV_ADMIN, q)).toBe(2);
    expect(countAs(GOV_AGENT_A, q)).toBe(0);
    expect(countAs(GOV_VIEWER, q)).toBe(0);
    expect(
      countAs(GOV_AGENT_A, `select count(*) from public.crm_distribuicao_alteracoes where pipeline_id = '${P_LIVRE}'`),
    ).toBe(0);
  });

  it("ninguém com sessão escreve nas tabelas nem executa as funções", () => {
    const comoAdmin = (script: string) =>
      sql(`set role authenticated;
           select set_config('request.jwt.claims', '{"sub":"${GOV_ADMIN}"}', false);
           ${script}`);
    // Sem policy de escrita, a RLS filtra: zero linhas mudam, sem erro.
    comoAdmin(`update public.crm_distribuicao_de_dono set contador = 99 where pipeline_id = '${P_LIVRE}';`);
    expect(
      n(`select max(contador) from public.crm_distribuicao_de_dono where pipeline_id = '${P_LIVRE}';`),
    ).not.toBe(99);
    expect(() =>
      comoAdmin(`select public.fn_escale_reiniciar_distribuicao('${ORG}', '${P_LIVRE}', '${GOV_ADMIN}');`),
    ).toThrow(/permission denied/);
    expect(() =>
      comoAdmin(`select public.fn_escale_recebe_da_origem('${ORG}', '${P_LIVRE}', '${GOV_AGENT_A}');`),
    ).toThrow(/permission denied/);
  });
});
```

- [ ] **Step 2: As tabelas na varredura de RLS**

Em `tests/invariants/rls-completude-varredura.test.ts`, depois da entrada de `crm_capas_do_card`, acrescente:

```ts
  {
    tabela: "crm_distribuicao_de_dono",
    razao:
      "tests/invariants/escale-distribuicao-de-dono.test.ts — fork Escale (migration 9013): gerente e admin leem, agente e viewer " +
      "leem zero, ninguém com sessão escreve (sem policy de escrita) nem executa as funções (só service_role).",
  },
  {
    tabela: "crm_distribuicoes_feitas",
    razao:
      "tests/invariants/escale-distribuicao-de-dono.test.ts — fork Escale (migration 9013): escritas só pelo gatilho da distribuição, " +
      "lidas por gerente ou acima da organização; o reset as apaga.",
  },
  {
    tabela: "crm_distribuicao_alteracoes",
    razao:
      "tests/invariants/escale-distribuicao-de-dono.test.ts — fork Escale (migration 9013): o histórico da configuração, escrito só " +
      "pelas funções de salvar e reiniciar, com o autor; agente lê zero.",
  },
```

- [ ] **Step 3: Rodar**

```bash
docker info > /dev/null && echo "docker ok"
corepack pnpm vitest run --config vitest.db.config.ts tests/invariants/escale-distribuicao-de-dono.test.ts tests/invariants/rls-completude-varredura.test.ts tests/invariants/escale-acesso-por-origem-rls.test.ts tests/invariants/escale-configuracoes-da-origem.test.ts
```
Expected: `docker ok` e PASS. (Se o projeto montar o banco só pelo script, use `corepack pnpm test:db` e confira os quatro arquivos na saída.)

- [ ] **Step 4: Commit**

```bash
corepack pnpm prettier --write tests/invariants/escale-distribuicao-de-dono.test.ts
git add tests/invariants/escale-distribuicao-de-dono.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "test(escale): prova da distribuição de dono no Postgres (Fase 1K, 9013)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: A leitura da distribuição na janela e as quatro rotas

**Files:**
- Create: `lib/escale/distribuicao/ler.ts`, `lib/escale/distribuicao/respostas.ts`, `app/api/v1/pipelines/[id]/distribuicao/route.ts`, `app/api/v1/pipelines/[id]/distribuicao/reiniciar/route.ts`, `app/api/v1/pipelines/[id]/distribuicao/alteracoes/route.ts`, `app/api/v1/pipelines/[id]/distribuicao/feitas/route.ts`, `tests/unit/escale-distribuicao-rotas.test.ts`
- Modify: `lib/escale/configuracoes/montar.ts`, `lib/escale/configuracoes/respostas.ts`, `app/api/v1/pipelines/[id]/configuracoes/route.ts`
- Test: `tests/unit/escale-configuracoes-rota.test.ts`, `tests/unit/escale-configuracoes-gravar.test.ts` e os fixtures de tela (typecheck)

**Interfaces:**
- Consumes: Task 1 (`PessoaNaDistribuicao`, `AlteracaoDaDistribuicao`, `EVENTOS_DA_DISTRIBUICAO`, `erroDaDistribuicao`, `textoDoPercentual`, `linhasDaTela`, `distribuidosForaDaLista`, `POR_PAGINA_DAS_DISTRIBUICOES`, `DISTRIBUICAO_MAX`); 1J (`temAcessoAOrigem`, `pessoasDaOrigem`, `modoDaOrganizacao`, `OrigemLida.grupo`, `ContextoDaResposta.visualizacaoDaOrganizacao`); 1F (`lerOrigemDaConfiguracao`, `responderComConfiguracoes`, `falhaInesperada`, `lerJson`).
- Produces:
  - `lerDistribuicao(supabase, orgId, pipelineId): Promise<{ ok: true; pessoas: PessoaNaDistribuicao[]; atualizada: { em: string; autorId: string | null } | null } | { ok: false; causa: ErroDoBanco }>`;
  - `papeisAtivos(supabase, orgId, ids?): Promise<{ ok: true; papeis: Map<string, string> } | { ok: false; causa: ErroDoBanco }>`;
  - `respostaDoBancoDaDistribuicao(erro, onde, t, requestId): Response`;
  - `ConfiguracoesDaOrigem.distribuicao: PessoaNaDistribuicao[]` e `ConfiguracoesDaOrigem.distribuicaoAtualizada: { em: string; autorId: string | null } | null`;
  - `PUT /api/v1/pipelines/:id/distribuicao` (corpo `{ pessoas: { user_id, percentual }[], reiniciar: boolean }`, resposta `{ data: ConfiguracoesDaOrigem }`); `POST …/distribuicao/reiniciar` (resposta igual); `GET …/distribuicao/alteracoes` (`{ data: AlteracaoDaDistribuicao[] }`); `GET …/distribuicao/feitas?usuario&busca&periodo&pagina` (`{ data: { itens: DistribuicaoFeita[]; total: number } }`, com `DistribuicaoFeita { id; leadId; titulo; etapa: string | null; userId: string | null; em: string }` exportado de `lib/escale/distribuicao/ler.ts`).

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-distribuicao-rotas.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { lerOrigemDaConfiguracao, responderComConfiguracoes } from "@/lib/escale/configuracoes/respostas";
import { papeisAtivos } from "@/lib/escale/distribuicao/ler";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PUT } from "@/app/api/v1/pipelines/[id]/distribuicao/route";
import { POST as REINICIAR } from "@/app/api/v1/pipelines/[id]/distribuicao/reiniciar/route";
import { ORG_ID, PIPE, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/escale/acesso/modo-da-organizacao", () => ({ modoDaOrganizacao: vi.fn(async () => "all") }));
vi.mock("@/lib/escale/configuracoes/respostas", async (original) => ({
  ...(await original<typeof import("@/lib/escale/configuracoes/respostas")>()),
  lerOrigemDaConfiguracao: vi.fn(),
  responderComConfiguracoes: vi.fn(async () => Response.json({ data: { ok: true } })),
}));
vi.mock("@/lib/escale/distribuicao/ler", async (original) => ({
  ...(await original<typeof import("@/lib/escale/distribuicao/ler")>()),
  papeisAtivos: vi.fn(),
}));

/** FORK ESCALE · Fase 1K (D13): as rotas de gravar e reiniciar a distribuição. */
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const V = "33333333-3333-4333-8333-333333333333";
const ctx = { params: Promise.resolve({ id: PIPE }) };
const rpc = vi.fn();

function pedido(body: unknown, rota = "distribuicao"): NextRequest {
  return new NextRequest(`http://localhost/api/v1/pipelines/${PIPE}/${rota}`, {
    method: rota === "distribuicao" ? "PUT" : "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function origem(settings: Record<string, unknown> = {}, grupo: Record<string, unknown> | null = null) {
  vi.mocked(lerOrigemDaConfiguracao).mockResolvedValue({
    ok: true,
    pipeline: { id: PIPE, name: "Pedidos", group_id: null, is_default: false, settings, updated_at: "x" },
    etapas: [],
    catalogo: [],
    grupo: grupo ? { settings: grupo } : null,
  } as never);
}

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(audit).mockClear();
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
  rpc.mockReset().mockResolvedValue({ data: null, error: null });
  vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);
  vi.mocked(papeisAtivos).mockResolvedValue({
    ok: true,
    papeis: new Map([[A, "agent"], [B, "agent"], [V, "viewer"]]),
  });
  origem();
  authOk("admin");
});

describe("PUT /api/v1/pipelines/:id/distribuicao", () => {
  it("só administrador grava (gerente: 403, sem chamar o banco)", async () => {
    authOk("manager");
    const res = await PUT(pedido({ pessoas: [{ user_id: A, percentual: 100 }], reiniciar: false }), ctx);
    expect(res.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("grava pela função, com a organização e o autor da sessão, audita e responde a origem relida", async () => {
    const corpo = { pessoas: [{ user_id: A, percentual: 75 }, { user_id: B, percentual: 25 }], reiniciar: true };
    const res = await PUT(pedido(corpo), ctx);
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fn_escale_salvar_distribuicao", {
      p_org: ORG_ID,
      p_origem: PIPE,
      p_autor: USER_ID,
      p_pessoas: corpo.pessoas,
      p_reiniciar: true,
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pipeline.config_updated", metadata: { secoes: ["distribuicao"], via: "escale" } }),
    );
    expect(responderComConfiguracoes).toHaveBeenCalled();
  });

  it("soma errada é 422 com o texto da Clint, sem chamar o banco", async () => {
    const res = await PUT(pedido({ pessoas: [{ user_id: A, percentual: 50 }, { user_id: B, percentual: 40 }], reiniciar: false }), ctx);
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe(
      "Verificar o total das porcentagens, deve somar 100%.",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("viewer, gente de fora e quem está fora da lista da origem: 422 'não possui permissão'", async () => {
    for (const quem of [V, "44444444-4444-4444-8444-444444444444"]) {
      const res = await PUT(pedido({ pessoas: [{ user_id: quem, percentual: 100 }], reiniciar: false }), ctx);
      expect(res.status).toBe(422);
    }
    origem({ escale_pessoas: [A] });
    const res = await PUT(pedido({ pessoas: [{ user_id: B, percentual: 100 }], reiniciar: false }), ctx);
    expect(((await res.json()) as { error: { message: string } }).error.message).toBe(
      "Este usuário não possui permissão nesta origem.",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("lista vazia é aceita (desliga a distribuição)", async () => {
    expect((await PUT(pedido({ pessoas: [], reiniciar: false }), ctx)).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fn_escale_salvar_distribuicao", expect.objectContaining({ p_pessoas: [] }));
  });

  it("a recusa do banco vira o texto certo: PT422 e 22023 são 422; o resto é 500", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PT422", message: "pessoa_sem_permissao" } });
    expect((await PUT(pedido({ pessoas: [{ user_id: A, percentual: 100 }], reiniciar: false }), ctx)).status).toBe(422);
    rpc.mockResolvedValueOnce({ data: null, error: { code: "22023", message: "distribuicao_invalida" } });
    expect((await PUT(pedido({ pessoas: [{ user_id: A, percentual: 100 }], reiniciar: false }), ctx)).status).toBe(422);
    rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "boom" } });
    expect((await PUT(pedido({ pessoas: [{ user_id: A, percentual: 100 }], reiniciar: false }), ctx)).status).toBe(500);
  });
});

describe("POST /api/v1/pipelines/:id/distribuicao/reiniciar", () => {
  it("admin reinicia pela função e audita", async () => {
    const res = await REINICIAR(pedido({}, "distribuicao/reiniciar"), ctx);
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fn_escale_reiniciar_distribuicao", { p_org: ORG_ID, p_origem: PIPE, p_autor: USER_ID });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { secoes: ["distribuicao"], acao: "reiniciar", via: "escale" } }),
    );
  });

  it("gerente não reinicia (403)", async () => {
    authOk("manager");
    expect((await REINICIAR(pedido({}, "distribuicao/reiniciar"), ctx)).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
});
```

Se `USER_ID` não for exportado de `tests/helpers/stages-db-double.ts`, exporte-o (é a constante usada por `authOk`).

Em `tests/unit/escale-configuracoes-rota.test.ts`, acrescente ao `describe("PATCH …")`:

```ts
  it("Q9 da 1J: a lista de pessoas não pode deixar de fora quem recebe por distribuição (422)", async () => {
    const db = banco();
    const tabelas = db.tabelas as unknown as Record<string, unknown[]>;
    tabelas.crm_distribuicao_de_dono = [
      { organization_id: ORG_ID, pipeline_id: PIPE, user_id: "66666666-6666-4666-8666-666666666666", percentual: 100, contador: 0, created_at: "2026-10-18" },
    ];
    tabelas.user_organizations = [
      { organization_id: ORG_ID, user_id: "66666666-6666-4666-8666-666666666666", role: "agent", accepted_at: "2026-01-01", revoked_at: null },
      { organization_id: ORG_ID, user_id: "11111111-1111-4111-8111-111111111111", role: "agent", accepted_at: "2026-01-01", revoked_at: null },
    ];
    const res = await PATCH(pedido("PATCH", { permissoes: { pessoas: ["11111111-1111-4111-8111-111111111111"] } }), ctx(PIPE));
    expect(res.status).toBe(422);
    expect((await corpo(res)).error?.message).toBe(
      "Não é possível salvar. Há usuários na distribuição desta origem fora da lista de permissões.",
    );
  });

  it("o GET traz a distribuição (vazia sem linhas) e quando mudou por último", async () => {
    banco();
    const { data } = await corpo(await GET(pedido("GET"), ctx(PIPE)));
    expect(data?.distribuicao).toEqual([]);
    expect(data?.distribuicaoAtualizada).toBeNull();
  });
```

Se o dublê `makeDb` não tiver as tabelas `crm_distribuicao_de_dono`, `crm_distribuicao_alteracoes` ou `user_organizations` (ou não aceitar `.in(...)`/`.limit(...)`), acrescente-as vazias ao `makeDb` e o filtro que faltar, na forma das tabelas que ele já tem.

Run: `corepack pnpm vitest run tests/unit/escale-distribuicao-rotas.test.ts tests/unit/escale-configuracoes-rota.test.ts`
Expected: FAIL.

- [ ] **Step 2: A leitura e as respostas**

Create `lib/escale/distribuicao/ler.ts`:

```ts
/**
 * A DISTRIBUIÇÃO DE DONO LIDA (fork Escale, Fase 1K, D13). Tudo com a sessão
 * de quem pede: a RLS da 9013 deixa gerente ou acima ler; abaixo disso a
 * distribuição vem vazia (e a subaba nem aparece).
 */
import type { createClient } from "@/lib/supabase/server";

import type { PessoaNaDistribuicao } from "./regras";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type ErroDoBanco = { code?: string; message?: string };

export interface DistribuicaoFeita {
  id: string;
  leadId: string;
  titulo: string;
  etapa: string | null;
  userId: string | null;
  em: string;
}

/** O papel de cada membro ATIVO (convite aceito, não revogado); `ids` restringe a busca. */
export async function papeisAtivos(
  supabase: Supabase,
  orgId: string,
  ids?: readonly string[],
): Promise<{ ok: true; papeis: Map<string, string> } | { ok: false; causa: ErroDoBanco }> {
  let q = supabase
    .from("user_organizations")
    .select("user_id, role")
    .eq("organization_id", orgId)
    .not("accepted_at", "is", null)
    .is("revoked_at", null);
  if (ids) q = q.in("user_id", [...ids]);
  const { data, error } = await q;
  if (error) return { ok: false, causa: error };
  return {
    ok: true,
    papeis: new Map(
      ((data ?? []) as Array<{ user_id: string; role: string }>).map((l) => [
        String(l.user_id).toLowerCase(),
        String(l.role),
      ]),
    ),
  };
}

export async function lerDistribuicao(
  supabase: Supabase,
  orgId: string,
  pipelineId: string,
): Promise<
  | {
      ok: true;
      pessoas: PessoaNaDistribuicao[];
      atualizada: { em: string; autorId: string | null } | null;
    }
  | { ok: false; causa: ErroDoBanco }
> {
  const [linhas, ultima] = await Promise.all([
    supabase
      .from("crm_distribuicao_de_dono")
      .select("user_id, percentual, contador, created_at")
      .eq("organization_id", orgId)
      .eq("pipeline_id", pipelineId)
      .order("created_at", { ascending: true }),
    supabase
      .from("crm_distribuicao_alteracoes")
      .select("created_at, autor_id")
      .eq("organization_id", orgId)
      .eq("pipeline_id", pipelineId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (linhas.error) return { ok: false, causa: linhas.error };
  if (ultima.error) return { ok: false, causa: ultima.error };
  const brutas = (linhas.data ?? []) as Array<{
    user_id: string;
    percentual: number | string;
    contador: number | string;
  }>;
  let papeis = new Map<string, string>();
  if (brutas.length > 0) {
    const lidos = await papeisAtivos(
      supabase,
      orgId,
      brutas.map((l) => l.user_id),
    );
    if (!lidos.ok) return lidos;
    papeis = lidos.papeis;
  }
  const u = ((ultima.data ?? []) as Array<{ created_at: string; autor_id: string | null }>)[0];
  return {
    ok: true,
    pessoas: brutas.map((l) => {
      const id = String(l.user_id).toLowerCase();
      return {
        userId: id,
        percentual: Number(l.percentual),
        contador: Number(l.contador),
        papel: papeis.get(id) ?? null,
      };
    }),
    atualizada: u ? { em: u.created_at, autorId: u.autor_id } : null,
  };
}
```

Create `lib/escale/distribuicao/respostas.ts`:

```ts
import { fail } from "@/lib/api/wrappers";
import { falhaInesperada, type OndeFalhou } from "@/lib/escale/configuracoes/respostas";

import type { ErroDoBanco } from "./ler";
import { ERRO_DA_SOMA } from "./regras";

/**
 * O erro das funções da 9013 com nome (N7): `22023 distribuicao_invalida` é a
 * soma ou um percentual; `PT422 pessoa_sem_permissao` é quem não pode receber;
 * `PT404` é a origem de outra organização ou apagada. O resto é 500 com o log.
 */
export function respostaDoBancoDaDistribuicao(
  erro: ErroDoBanco,
  onde: OndeFalhou,
  t: (texto: string) => string,
  requestId: string,
): Response {
  if (erro.code === "22023") return fail("unprocessable_entity", t(ERRO_DA_SOMA), 422, { requestId });
  if (erro.code === "PT422") {
    return fail("unprocessable_entity", t("Este usuário não possui permissão nesta origem."), 422, {
      requestId,
    });
  }
  if (erro.code === "PT404") return fail("not_found", t("Origem não encontrada."), 404, { requestId });
  return falhaInesperada(erro, onde, t, requestId);
}
```

- [ ] **Step 3: A janela recebe a distribuição**

Em `lib/escale/configuracoes/montar.ts`:
- `import type { PessoaNaDistribuicao } from "@/lib/escale/distribuicao/regras";`
- em `ConfiguracoesDaOrigem`, depois de `podeAdministrar: boolean;`:
  ```ts
    /** Fase 1K (D13): quem recebe os negócios sem dono, na ordem em que entrou. Vazia para quem não é gerente. */
    distribuicao: PessoaNaDistribuicao[];
    /** A última alteração da distribuição (o botão do relógio). */
    distribuicaoAtualizada: { em: string; autorId: string | null } | null;
  ```
- na entrada de `montarConfiguracoes`, os mesmos dois campos; na saída, `distribuicao: [...entrada.distribuicao], distribuicaoAtualizada: entrada.distribuicaoAtualizada,`.

Em `lib/escale/configuracoes/respostas.ts`, em `responderComConfiguracoes`, depois de `lido` dar certo:

```ts
  const distribuicao = await lerDistribuicao(supabase, ctx.orgId, ctx.pipelineId);
  if (!distribuicao.ok) return falhaInesperada(distribuicao.causa, onde, t, requestId);
```

e passe `distribuicao: distribuicao.pessoas, distribuicaoAtualizada: distribuicao.atualizada` ao `montarConfiguracoes` (com `import { lerDistribuicao } from "@/lib/escale/distribuicao/ler";`).

Em `tests/unit/escale-configuracoes-gravar.test.ts`, na chamada de `montarConfiguracoes`, acrescente `distribuicao: [], distribuicaoAtualizada: null`.

- [ ] **Step 4: A guarda Q9 no PATCH de configurações**

Em `app/api/v1/pipelines/[id]/configuracoes/route.ts`, depois do `if (!origem.ok) { … }` do PATCH e antes de `aplicarConfiguracoes`:

```ts
  // FORK ESCALE · Fase 1K (Q9 da 1J): a lista de pessoas da origem não pode deixar
  // de fora quem recebe negócios por distribuição (a tela já barra com o texto da Clint).
  if (parsed.data.permissoes) {
    const distribuicao = await lerDistribuicao(supabase, orgId, id);
    if (!distribuicao.ok) {
      return falhaInesperada(distribuicao.causa, { rota: `PATCH ${ROTA}`, operacao: "ler" }, t, requestId);
    }
    const fora = distribuidosForaDaLista({
      linhas: linhasDaTela(distribuicao.pessoas),
      pessoas: parsed.data.permissoes.pessoas.map((p) => p.toLowerCase()),
      pessoasDoGrupo: pessoasDaOrigem(origem.grupo?.settings),
    });
    if (fora.length > 0) {
      return fail(
        "unprocessable_entity",
        t("Não é possível salvar. Há usuários na distribuição desta origem fora da lista de permissões."),
        422,
        { requestId },
      );
    }
  }
```

com os imports `lerDistribuicao` (`@/lib/escale/distribuicao/ler`), `distribuidosForaDaLista` e `linhasDaTela` (`@/lib/escale/distribuicao/regras`) e `pessoasDaOrigem` (`@/lib/escale/acesso/regras`), se ainda não estiver importado. No cabeçalho do arquivo: `Fase 1K: a resposta traz a distribuição de dono (lida com a sessão); o PATCH de permissões recusa a lista que deixa de fora quem recebe por distribuição (Q9 da 1J).`

- [ ] **Step 5: As duas rotas que gravam**

Create `app/api/v1/pipelines/[id]/distribuicao/route.ts`:

```ts
/**
 * PUT /api/v1/pipelines/:id/distribuicao — grava a distribuição de dono da
 * origem (fork Escale, Fase 1K, D13; Clint `Is`).
 *
 * Só administrador (a Clint mostra a subaba só a ele). A rota confere a soma
 * e quem pode receber (membro ativo agente, gerente ou admin, com acesso à
 * origem pela régua da 1J) e grava por `fn_escale_salvar_distribuicao` com o
 * service role (N7): a função, fechada ao `authenticated`, revalida tudo.
 * Responde a origem relida, como a rota de configurações.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { requireRole } from "@/lib/auth/require-role";
import type { Role } from "@/lib/auth/types";
import { modoDaOrganizacao } from "@/lib/escale/acesso/modo-da-organizacao";
import { pessoasDaOrigem, temAcessoAOrigem } from "@/lib/escale/acesso/regras";
import {
  falhaInesperada,
  lerOrigemDaConfiguracao,
  responderComConfiguracoes,
} from "@/lib/escale/configuracoes/respostas";
import { papeisAtivos } from "@/lib/escale/distribuicao/ler";
import { DISTRIBUICAO_MAX, erroDaDistribuicao, textoDoPercentual } from "@/lib/escale/distribuicao/regras";
import { respostaDoBancoDaDistribuicao } from "@/lib/escale/distribuicao/respostas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { moedaServidaOu } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const ROTA = "/api/v1/pipelines/[id]/distribuicao";
const PAPEIS_QUE_RECEBEM = ["agent", "manager", "admin"];

const corpoSchema = z
  .object({
    pessoas: z
      .array(
        z
          .object({ user_id: z.string().uuid(), percentual: z.number().gt(0).max(100) })
          .strict(),
      )
      .max(DISTRIBUICAO_MAX),
    reiniciar: z.boolean(),
  })
  .strict();

export async function PUT(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  if (!podeAdministrarEmpresa(authz.user, authz.org)) {
    return fail("forbidden", t("Só administrador muda a distribuição de dono."), 403, { requestId });
  }
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Verificar se as porcentagens são maiores que 0%."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const pessoas = parsed.data.pessoas.map((p) => ({ ...p, user_id: p.user_id.toLowerCase() }));
  const erro = erroDaDistribuicao(
    pessoas.map((p) => ({ userId: p.user_id, percentual: textoDoPercentual(p.percentual), papel: null })),
  );
  if (erro) return fail("unprocessable_entity", t(erro), 422, { requestId });
  if (new Set(pessoas.map((p) => p.user_id)).size !== pessoas.length) {
    return fail("unprocessable_entity", t("Verificar o total das porcentagens, deve somar 100%."), 422, {
      requestId,
    });
  }

  const supabase = await createClient();
  const origem = await lerOrigemDaConfiguracao(supabase, orgId, id);
  if (!origem.ok) {
    return origem.erro === "nao_encontrada"
      ? fail("not_found", t("Origem não encontrada."), 404, { requestId })
      : falhaInesperada(origem.causa, { rota: `PUT ${ROTA}`, operacao: "ler" }, t, requestId);
  }
  const membros = await papeisAtivos(supabase, orgId);
  if (!membros.ok) return falhaInesperada(membros.causa, { rota: `PUT ${ROTA}`, operacao: "ler" }, t, requestId);
  const listaDaOrigem = pessoasDaOrigem(origem.pipeline.settings);
  const listaDoGrupo = pessoasDaOrigem(origem.grupo?.settings);
  const semPermissao = pessoas.some((p) => {
    const papel = membros.papeis.get(p.user_id);
    return (
      !papel ||
      !PAPEIS_QUE_RECEBEM.includes(papel) ||
      !temAcessoAOrigem({ papel: papel as Role, userId: p.user_id, pessoas: listaDaOrigem, pessoasDoGrupo: listaDoGrupo })
    );
  });
  if (semPermissao) {
    return fail("unprocessable_entity", t("Este usuário não possui permissão nesta origem."), 422, { requestId });
  }

  const { error } = await createAdminClient().rpc("fn_escale_salvar_distribuicao", {
    p_org: orgId,
    p_origem: id,
    p_autor: authz.user.id,
    p_pessoas: pessoas,
    p_reiniciar: parsed.data.reiniciar,
  });
  if (error) return respostaDoBancoDaDistribuicao(error, { rota: `PUT ${ROTA}`, operacao: "gravar" }, t, requestId);

  void audit({
    action: "pipeline.config_updated",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "pipeline",
    resourceId: id,
    requestId,
    metadata: { secoes: ["distribuicao"], via: "escale" },
  });

  return responderComConfiguracoes(
    supabase,
    {
      orgId,
      pipelineId: id,
      moedaDaOrganizacao: moedaServidaOu(authz.org.currency),
      visualizacaoDaOrganizacao: await modoDaOrganizacao(orgId, requestId),
      podeAdministrar: true,
    },
    t,
    requestId,
    { rota: `PUT ${ROTA}`, operacao: "reler" },
  );
}
```

Create `app/api/v1/pipelines/[id]/distribuicao/reiniciar/route.ts`:

```ts
/**
 * POST /api/v1/pipelines/:id/distribuicao/reiniciar — "Resetar distribuição"
 * (fork Escale, Fase 1K, D13; Clint `us`): zera contador e índice e apaga as
 * distribuições feitas desta origem. Só administrador; grava com o service role
 * pela `fn_escale_reiniciar_distribuicao`, que registra o reinício com o autor
 * (a auditoria do reset), e a rota audita também.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { requireRole } from "@/lib/auth/require-role";
import { modoDaOrganizacao } from "@/lib/escale/acesso/modo-da-organizacao";
import { responderComConfiguracoes } from "@/lib/escale/configuracoes/respostas";
import { respostaDoBancoDaDistribuicao } from "@/lib/escale/distribuicao/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { moedaServidaOu } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const ROTA = "/api/v1/pipelines/[id]/distribuicao/reiniciar";

export async function POST(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  if (!podeAdministrarEmpresa(authz.user, authz.org)) {
    return fail("forbidden", t("Só administrador muda a distribuição de dono."), 403, { requestId });
  }
  const orgId = authz.org.orgId;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }

  const { error } = await createAdminClient().rpc("fn_escale_reiniciar_distribuicao", {
    p_org: orgId,
    p_origem: id,
    p_autor: authz.user.id,
  });
  if (error) return respostaDoBancoDaDistribuicao(error, { rota: `POST ${ROTA}`, operacao: "gravar" }, t, requestId);

  void audit({
    action: "pipeline.config_updated",
    actorUserId: authz.user.id,
    organizationId: orgId,
    resourceType: "pipeline",
    resourceId: id,
    requestId,
    metadata: { secoes: ["distribuicao"], acao: "reiniciar", via: "escale" },
  });

  return responderComConfiguracoes(
    await createClient(),
    {
      orgId,
      pipelineId: id,
      moedaDaOrganizacao: moedaServidaOu(authz.org.currency),
      visualizacaoDaOrganizacao: await modoDaOrganizacao(orgId, requestId),
      podeAdministrar: true,
    },
    t,
    requestId,
    { rota: `POST ${ROTA}`, operacao: "reler" },
  );
}
```

Se o `ContextoDaResposta` da 1J tiver outro nome para o campo da regra da organização, use o nome que estiver em `lib/escale/configuracoes/respostas.ts`.

- [ ] **Step 6: As duas rotas de leitura**

Create `app/api/v1/pipelines/[id]/distribuicao/alteracoes/route.ts`:

```ts
/**
 * GET /api/v1/pipelines/:id/distribuicao/alteracoes — o histórico da
 * configuração da distribuição (fork Escale, Fase 1K; a gaveta do relógio da
 * Clint, `Ms`). Gerente ou acima, com a sessão (RLS da 9013). As 200 mais novas.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import { EVENTOS_DA_DISTRIBUICAO, type AlteracaoDaDistribuicao } from "@/lib/escale/distribuicao/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }
  const { data, error } = await (await createClient())
    .from("crm_distribuicao_alteracoes")
    .select("id, evento, pessoa_id, percentual_antes, percentual_depois, autor_id, created_at")
    .eq("organization_id", authz.org.orgId)
    .eq("pipeline_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return falhaInesperada(error, { rota: "GET /api/v1/pipelines/[id]/distribuicao/alteracoes", operacao: "ler" }, t, requestId);
  }
  const numero = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const alteracoes: AlteracaoDaDistribuicao[] = (
    (data ?? []) as Array<Record<string, unknown>>
  )
    .filter((l) => (EVENTOS_DA_DISTRIBUICAO as readonly string[]).includes(String(l.evento)))
    .map((l) => ({
      id: String(l.id),
      evento: l.evento as AlteracaoDaDistribuicao["evento"],
      pessoaId: typeof l.pessoa_id === "string" ? l.pessoa_id.toLowerCase() : null,
      percentualAntes: numero(l.percentual_antes),
      percentualDepois: numero(l.percentual_depois),
      autorId: typeof l.autor_id === "string" ? l.autor_id.toLowerCase() : null,
      em: String(l.created_at),
    }));
  return ok(alteracoes, { requestId });
}
```

Create `app/api/v1/pipelines/[id]/distribuicao/feitas/route.ts`:

```ts
/**
 * GET /api/v1/pipelines/:id/distribuicao/feitas — as distribuições feitas
 * (fork Escale, Fase 1K; a janela "Histórico de distribuições" da Clint, aberta
 * pelo contador). Gerente ou acima, com a sessão: a RLS da 9013 e a de
 * `crm_leads` (1J) valem juntas. Filtros: pessoa, busca no título do negócio
 * (N14), período de 7 ou 30 dias; 6 por página, a mais nova primeiro.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import type { DistribuicaoFeita } from "@/lib/escale/distribuicao/ler";
import { POR_PAGINA_DAS_DISTRIBUICOES } from "@/lib/escale/distribuicao/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const DIA_MS = 24 * 60 * 60 * 1000;

const filtrosSchema = z.object({
  usuario: z.union([z.literal(""), z.string().uuid()]).default(""),
  busca: z.string().max(80).default(""),
  periodo: z.enum(["", "7", "30"]).default(""),
  pagina: z.coerce.number().int().min(1).max(10_000).default(1),
});

export async function GET(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Origem não encontrada."), 404, { requestId });
  }
  const filtros = filtrosSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!filtros.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, { requestId });
  }
  const { usuario, busca, periodo, pagina } = filtros.data;
  const de = (pagina - 1) * POR_PAGINA_DAS_DISTRIBUICOES;

  let q = (await createClient())
    .from("crm_distribuicoes_feitas")
    .select("id, user_id, distribuido_em, crm_leads!inner(id, title, crm_stages(name))", { count: "exact" })
    .eq("organization_id", authz.org.orgId)
    .eq("pipeline_id", id)
    .order("distribuido_em", { ascending: false })
    .range(de, de + POR_PAGINA_DAS_DISTRIBUICOES - 1);
  if (usuario) q = q.eq("user_id", usuario);
  if (periodo) q = q.gte("distribuido_em", new Date(Date.now() - Number(periodo) * DIA_MS).toISOString());
  const termo = busca.replace(/[%_,()]/g, " ").trim();
  if (termo) q = q.ilike("crm_leads.title", `%${termo}%`);

  const { data, error, count } = await q;
  if (error) {
    return falhaInesperada(error, { rota: "GET /api/v1/pipelines/[id]/distribuicao/feitas", operacao: "ler" }, t, requestId);
  }
  const itens: DistribuicaoFeita[] = ((data ?? []) as Array<Record<string, unknown>>).map((l) => {
    const lead = (l.crm_leads ?? {}) as { id?: string; title?: string; crm_stages?: { name?: string } | null };
    return {
      id: String(l.id),
      leadId: String(lead.id ?? ""),
      titulo: lead.title ?? "",
      etapa: lead.crm_stages?.name ?? null,
      userId: typeof l.user_id === "string" ? l.user_id.toLowerCase() : null,
      em: String(l.distribuido_em),
    };
  });
  return ok({ itens, total: count ?? itens.length }, { requestId });
}
```

Se o PostgREST reclamar de relação ambígua entre `crm_leads` e `crm_stages`, troque `crm_stages(name)` por `crm_stages!crm_leads_stage_id_fkey(name)` (confira o nome da FK com `grep -n "crm_leads_stage_id_fkey" supabase/baseline.sql`).

- [ ] **Step 7: Rodar, typecheck e os fixtures**

Run: `corepack pnpm vitest run tests/unit/escale-distribuicao-rotas.test.ts tests/unit/escale-configuracoes-rota.test.ts tests/unit/escale-configuracoes-gravar.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts`
Expected: PASS.

Run: `corepack pnpm typecheck`
Expected: erros só nos fixtures `ConfiguracoesDaOrigem` dos testes de tela (`escale-secao-gerais`, `escale-secao-alerta`, `escale-secao-campos`, `escale-secao-motivos`, `escale-secao-permissoes`, `escale-janela-da-origem` e os da 1I que montam a janela). Em cada um, acrescente `distribuicao: [], distribuicaoAtualizada: null,` ao lado de `podeAdministrar`. Rode de novo: limpo.

- [ ] **Step 8: Revisor (G1).** Dispare o `security-reviewer` com as quatro rotas e a pergunta: "um gerente grava a distribuição? alguém de outra organização entra na lista? o service role é chamado antes de conferir o admin? as leituras devolvem algo de outra organização?". Corrija o que for CRITICAL/HIGH.

- [ ] **Step 9: Commit**

```bash
corepack pnpm prettier --write lib/escale/distribuicao/ler.ts lib/escale/distribuicao/respostas.ts "app/api/v1/pipelines/[id]/distribuicao" tests/unit/escale-distribuicao-rotas.test.ts
git add lib/escale "app/api/v1/pipelines/[id]" tests/unit tests/helpers
git commit -m "feat(escale): rotas da distribuição de dono e a guarda da lista de pessoas (Fase 1K, D13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: A subaba "Distribuição de dono", o rodapé e o bloqueio da lista de pessoas

**Abra antes:** os prints 028 e F01.

**Files:**
- Create: `hooks/escale/useDistribuicao.ts`, `components/escale/ui/ConfirmacaoDaCasca.tsx`, `components/escale/configuracoes/SecaoDistribuicao.tsx`, `components/escale/configuracoes/RodapeDaDistribuicao.tsx`, `tests/unit/escale-secao-distribuicao.test.tsx`
- Modify: `lib/escale/configuracoes/rascunho.ts`, `lib/escale/configuracoes/gravar.ts` (só o tipo `SecaoDasConfiguracoes`), `components/escale/configuracoes/JanelaDaOrigem.tsx`, `lib/ui/icons-da-casca.ts`, `tests/unit/escale-janela-da-origem.test.tsx`

**Interfaces:**
- Consumes: Task 1 (regras), Task 4 (`ConfiguracoesDaOrigem.distribuicao`, as rotas); 1J (`ListaDePessoas`, `membrosAtivosDaEquipe`, `MembroDaEquipe`, `temAcessoAOrigem`, `RascunhoDaOrigem.permissoes`); `useTeamMembers`; `PainelSuspenso`, `Popover`, `CaixaDaCasca`, `AjudaDaCasca`, `SeletorDaCasca`, `CampoDeTexto`, `BotaoDaJanela`, `CabecaDaSecao`.
- Produces:
  - `useSalvarDistribuicao(id)` (mutation `(pedido: PedidoDaDistribuicao) => ConfiguracoesDaOrigem`), `useReiniciarDistribuicao(id)` (mutation `() => ConfiguracoesDaOrigem`), `chaveDasAlteracoes(id)`, `useAlteracoesDaDistribuicao(id, aberta)`, `FiltrosDasDistribuicoes`, `useDistribuicoesFeitas(id, filtros, aberta)`;
  - `ConfirmacaoDaCasca({ texto, aoConfirmar, children })`;
  - `SecaoDistribuicao(props: PropsDaSecao)`; `RodapeDaDistribuicao(props: PropsDaSecao)`; `iniciaisDoNome(nome): string` (exportado de `SecaoDistribuicao.tsx`);
  - `RascunhoDaOrigem.distribuicao: { linhas: LinhaDaDistribuicao[]; reiniciar: boolean }`; `pedidoDoSalvar` devolve também `distribuicao: PedidoDaDistribuicao | null` e, no erro, `usuarios?: string[]`; `SecaoDasConfiguracoes` ganha `"distribuicao"`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-secao-distribuicao.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL", role: "admin" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { toast } from "sonner";

import { apiClient } from "@/lib/api/client";
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1K (D13): a subaba "Distribuição de dono" (print 01-028 e código `Is` da Clint). */
const A = "aaaaaaaa-1111-4111-8111-111111111111";
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const C = "cccccccc-1111-4111-8111-111111111111";
const V = "dddddddd-1111-4111-8111-111111111111";
const R = "eeeeeeee-1111-4111-8111-111111111111";
const ORIGENS: Origens = {
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};
const membro = (user_id: string, full_name: string, role: string, revoked_at: string | null = null) => ({
  user_id, role, full_name, email: `${full_name.split(" ")[0]!.toLowerCase()}@x.com`,
  accepted_at: "2026-01-01", revoked_at, invited_at: null, created_at: "2026-01-01", last_sign_in_at: null,
});
const EQUIPE = [
  membro(A, "Ana Lima", "agent"),
  membro(B, "Bruno Reis", "agent"),
  membro(C, "Carla Dias", "agent"),
  membro(V, "Vera Viewer", "viewer"),
  membro(R, "Rui Revogado", "agent", "2026-02-01"),
];

function config(over: Partial<ConfiguracoesDaOrigem> = {}): ConfiguracoesDaOrigem {
  return {
    pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
    etapas: [],
    fork: {
      moeda: null, tagsPadrao: [], motivosInativos: [], aoSair: {},
      alerta: { geral: null, etapas: {} }, visualizacao: null, pessoas: [],
    },
    motivos: [], campos: [], regras: [],
    moedaDaOrganizacao: "BRL",
    visualizacao: "own_and_unassigned",
    visualizacaoDaOrganizacao: "own_and_unassigned",
    pessoasDoGrupo: [],
    podeAdministrar: true,
    distribuicao: [
      { userId: A, percentual: 50, contador: 3, papel: "agent" },
      { userId: B, percentual: 50, contador: 1, papel: "agent" },
    ],
    distribuicaoAtualizada: null,
    ...over,
  } as ConfiguracoesDaOrigem;
}

function abrir(c: ConfiguracoesDaOrigem = config()) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/pipelines/f-1/configuracoes") return { data: c };
    if (url === "/api/v1/team") return { data: EQUIPE };
    return { data: [] };
  });
  vi.mocked(apiClient.put).mockResolvedValue({ data: c });
  vi.mocked(apiClient.post).mockResolvedValue({ data: c });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: c });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={vi.fn()} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

async function irPara(user: ReturnType<typeof userEvent.setup>, item = "Distribuição de dono") {
  await screen.findByRole("navigation", { name: "Configurações da origem" });
  await user.click(screen.getByRole("button", { name: item }));
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
  vi.mocked(toast.success).mockClear();
});

describe("Distribuição de dono", () => {
  it("o item do menu só aparece para administrador (Clint)", async () => {
    abrir(config({ podeAdministrar: false }));
    const menu = await screen.findByRole("navigation", { name: "Configurações da origem" });
    expect(within(menu).queryByRole("button", { name: "Distribuição de dono" })).toBeNull();
  });

  it("título, descrição da Clint, cabeçalhos, nome e e-mail, percentual com vírgula e contador", async () => {
    const { user } = abrir();
    await irPara(user);
    expect(screen.getByRole("heading", { name: "Distribuição de dono" })).toBeInTheDocument();
    expect(
      screen.getByText("Defina os usuários e percentuais. Negócios criados por Integrações, Apps e Checkouts são distribuídos automaticamente entre eles."),
    ).toBeInTheDocument();
    // O "?" da ajuda do Contador entra no texto do cabeçalho: tira antes de comparar.
    expect(
      screen.getAllByRole("columnheader").map((h) => (h.textContent ?? "").replace("?", "").trim()),
    ).toEqual(["Usuários", "Percentual %", "Contador", ""]);
    const linhaDaAna = await screen.findByRole("row", { name: /Ana Lima/ });
    expect(within(linhaDaAna).getByText("ana@x.com")).toBeInTheDocument();
    expect(within(linhaDaAna).getByRole("textbox", { name: "Percentual % Ana Lima" })).toHaveValue("50");
    expect(within(linhaDaAna).getByText("3")).toBeInTheDocument();
  });

  it("adicionar refaz todos com 100/n; viewer e revogado não são oferecidos; Salvar manda o PUT", async () => {
    const { user } = abrir();
    await irPara(user);
    await user.click(await screen.findByRole("combobox", { name: "Adicionar usuário" }));
    expect(screen.queryByRole("option", { name: "Vera Viewer" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Rui Revogado" })).toBeNull();
    await user.click(screen.getByRole("option", { name: "Carla Dias" }));
    for (const nome of ["Ana Lima", "Bruno Reis", "Carla Dias"]) {
      expect(screen.getByRole("textbox", { name: `Percentual % ${nome}` })).toHaveValue("33,33");
    }
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/pipelines/f-1/distribuicao", {
      pessoas: [
        { user_id: A, percentual: 33.33 },
        { user_id: B, percentual: 33.33 },
        { user_id: C, percentual: 33.33 },
      ],
      reiniciar: false,
    });
    expect(apiClient.patch).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("As configurações de distribuição foram salvas com sucesso!");
  });

  it("a lixeira pede confirmação; 'Sim' tira e refaz com 100/n", async () => {
    const { user } = abrir();
    await irPara(user);
    await user.click(await screen.findByRole("button", { name: "Remover Bruno Reis" }));
    expect(
      screen.getByText("A distribuição vai ser refeita com porcentagens iguais entre os demais usuários. Tem certeza que deseja remover este usuário?"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sim" }));
    expect(screen.queryByRole("row", { name: /Bruno Reis/ })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Percentual % Ana Lima" })).toHaveValue("100");
  });

  it("soma errada: o Salvar mostra o texto da Clint e não grava", async () => {
    const { user } = abrir();
    await irPara(user);
    const campo = await screen.findByRole("textbox", { name: "Percentual % Ana Lima" });
    await user.clear(campo);
    await user.type(campo, "40");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByText("Verificar o total das porcentagens, deve somar 100%.")).toBeInTheDocument();
    expect(apiClient.put).not.toHaveBeenCalled();
  });

  it("Resetar distribuição confirma e chama a rota; editando, vira a caixa 'Reiniciar a contagem…' e o PUT leva reiniciar", async () => {
    const { user } = abrir();
    await irPara(user);
    await user.click(await screen.findByRole("button", { name: "Resetar distribuição" }));
    expect(
      screen.getByText("A contagem de negócios será zerada e o histórico de distribuições desta origem será apagado. Tem certeza que deseja continuar?"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sim" }));
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pipelines/f-1/distribuicao/reiniciar", {});
    expect(toast.success).toHaveBeenCalledWith("A distribuição foi reiniciada com sucesso.");

    const campo = screen.getByRole("textbox", { name: "Percentual % Ana Lima" });
    await user.clear(campo);
    await user.type(campo, "60");
    await user.clear(screen.getByRole("textbox", { name: "Percentual % Bruno Reis" }));
    await user.type(screen.getByRole("textbox", { name: "Percentual % Bruno Reis" }), "40");
    expect(screen.queryByRole("button", { name: "Resetar distribuição" })).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: "Reiniciar a contagem de negócios ao salvar" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.put).toHaveBeenCalledWith(
      "/api/v1/pipelines/f-1/distribuicao",
      expect.objectContaining({ reiniciar: true }),
    );
  });
});

describe("Q9 da 1J: a lista de pessoas e a distribuição", () => {
  it("a lista que deixa de fora quem recebe por distribuição não salva e mostra o texto da Clint com os nomes", async () => {
    const { user } = abrir();
    await irPara(user, "Permissão de usuários");
    await user.click(await screen.findByRole("combobox", { name: "Adicione um usuário..." }));
    await user.click(screen.getByRole("option", { name: "Carla Dias" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(
      screen.getByText(
        "Não é possível salvar. Estes usuários recebem negócios por distribuição nesta origem e não estão na lista: Ana Lima, Bruno Reis. Inclua-os na lista de permissões ou remova-os da distribuição.",
      ),
    ).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-secao-distribuicao.test.tsx`
Expected: FAIL (a subaba mostra "Em breve").

- [ ] **Step 2: Os ícones**

Em `lib/ui/icons-da-casca.ts`, num bloco novo no fim (antes do export do tipo, se houver), na forma dos blocos das fases anteriores:

```ts
// ─── Fase 1K (distribuição, ganho e notificações) ───
export { Award, History, Percent, SearchX, Undo2, UserMinus } from "lucide-react";
```

(Se o arquivo reexporta num único `export { … } from "lucide-react"`, acrescente os seis nomes ali com o comentário `// 1K`.)

- [ ] **Step 3: Os hooks**

Create `hooks/escale/useDistribuicao.ts`:

```ts
"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { DistribuicaoFeita } from "@/lib/escale/distribuicao/ler";
import type { AlteracaoDaDistribuicao, PedidoDaDistribuicao } from "@/lib/escale/distribuicao/regras";

import { chaveDasConfiguracoes } from "./useConfiguracoesDaOrigem";

type Resposta = { data: ConfiguracoesDaOrigem };
const base = (id: string) => `/api/v1/pipelines/${id}/distribuicao`;

export const chaveDasAlteracoes = (id: string) => ["distribuicao-alteracoes", id] as const;
export const chaveDasFeitas = (id: string) => ["distribuicao-feitas", id] as const;

/** Fase 1K (D13): salvar a distribuição. A resposta é a origem relida e vai para o cache da janela. */
export function useSalvarDistribuicao(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: PedidoDaDistribuicao) => (await apiClient.put<Resposta>(base(id), pedido)).data,
    onSuccess: (config) => {
      qc.setQueryData(chaveDasConfiguracoes(id), config);
      void qc.invalidateQueries({ queryKey: chaveDasAlteracoes(id) });
      void qc.invalidateQueries({ queryKey: chaveDasFeitas(id) });
    },
  });
}

/** "Resetar distribuição": imediato, sem passar pelo Salvar da janela (Clint). */
export function useReiniciarDistribuicao(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<Resposta>(`${base(id)}/reiniciar`, {})).data,
    onSuccess: (config) => {
      qc.setQueryData(chaveDasConfiguracoes(id), config);
      void qc.invalidateQueries({ queryKey: chaveDasAlteracoes(id) });
      void qc.invalidateQueries({ queryKey: chaveDasFeitas(id) });
    },
  });
}

/** O histórico da configuração (a gaveta do relógio): só lê com a gaveta aberta. */
export function useAlteracoesDaDistribuicao(id: string, aberta: boolean) {
  return useQuery({
    queryKey: chaveDasAlteracoes(id),
    enabled: aberta,
    staleTime: 0,
    queryFn: async () =>
      (await apiClient.get<{ data: AlteracaoDaDistribuicao[] }>(`${base(id)}/alteracoes`)).data,
  });
}

export interface FiltrosDasDistribuicoes {
  usuario: string;
  busca: string;
  periodo: "" | "7" | "30";
  pagina: number;
}

/** As distribuições feitas (a janela do contador): só lê com a janela aberta; mantém a página anterior enquanto busca. */
export function useDistribuicoesFeitas(id: string, filtros: FiltrosDasDistribuicoes, aberta: boolean) {
  return useQuery({
    queryKey: [...chaveDasFeitas(id), filtros] as const,
    enabled: aberta,
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const busca = new URLSearchParams({
        usuario: filtros.usuario,
        busca: filtros.busca,
        periodo: filtros.periodo,
        pagina: String(filtros.pagina),
      });
      return (
        await apiClient.get<{ data: { itens: DistribuicaoFeita[]; total: number } }>(
          `${base(id)}/feitas?${busca.toString()}`,
        )
      ).data;
    },
  });
}
```

- [ ] **Step 4: A confirmação da casca**

Create `components/escale/ui/ConfirmacaoDaCasca.tsx`:

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { BotaoDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";

import { PainelSuspenso } from "./PainelSuspenso";

/**
 * O BALÃO DE CONFIRMAÇÃO DA CLINT (fork Escale, Fase 1K; o Popover xs da
 * lixeira e do "Resetar distribuição"): a pergunta 13px e, embaixo à direita,
 * "Não" e "Sim". O gatilho é o filho. Sem print: segue o código da Clint.
 */
export function ConfirmacaoDaCasca({
  texto,
  aoConfirmar,
  children,
}: {
  texto: string;
  aoConfirmar: () => void;
  children: ReactNode;
}) {
  const t = useT();
  const [aberta, setAberta] = useState(false);
  return (
    <Popover open={aberta} onOpenChange={setAberta}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PainelSuspenso align="end" className="w-[280px] p-3">
        <p className="text-[13px] leading-5 text-casca-texto">{texto}</p>
        <div className="mt-3 flex justify-end gap-2">
          <BotaoDaJanela variante="cancelar" onClick={() => setAberta(false)}>
            {t("Não")}
          </BotaoDaJanela>
          <BotaoDaJanela
            variante="salvar"
            onClick={() => {
              setAberta(false);
              aoConfirmar();
            }}
          >
            {t("Sim")}
          </BotaoDaJanela>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
```

- [ ] **Step 5: O rascunho**

Em `lib/escale/configuracoes/gravar.ts`, troque o tipo da seção por:

```ts
export type SecaoDasConfiguracoes = "gerais" | "motivos" | "campos" | "alerta" | "permissoes" | "distribuicao";
```

(`secoesDoPatch` não muda: a distribuição tem rota própria, N12.)

Em `lib/escale/configuracoes/rascunho.ts`:
- imports:
  ```ts
  import {
    distribuidosForaDaLista,
    erroDaDistribuicao,
    linhasDaTela,
    pedidoDaDistribuicao,
    textoDoBloqueio,
    type LinhaDaDistribuicao,
    type PedidoDaDistribuicao,
  } from "@/lib/escale/distribuicao/regras";
  ```
- em `RascunhoDaOrigem`, depois de `permissoes`:
  ```ts
    /** Fase 1K (D13): as linhas da distribuição e o "Reiniciar a contagem de negócios ao salvar". */
    distribuicao: { linhas: LinhaDaDistribuicao[]; reiniciar: boolean };
  ```
- em `rascunhoInicial`, `distribuicao: { linhas: linhasDaTela(config.distribuicao), reiniciar: false },`;
- a assinatura de `pedidoDoSalvar` passa a devolver:
  ```ts
  :
    | { ok: true; mudancaDaOrigem: MudancaDeOrigem; patch: PatchDasConfiguracoes | null; distribuicao: PedidoDaDistribuicao | null }
    | { ok: false; erro: string; secao: SecaoDasConfiguracoes; etapa?: string; usuarios?: string[] }
  ```
- antes do `return { ok: true, … }` final:
  ```ts
    let distribuicao: PedidoDaDistribuicao | null = null;
    if (!igual(r.distribuicao.linhas, inicial.distribuicao.linhas)) {
      const erro = erroDaDistribuicao(r.distribuicao.linhas);
      if (erro) return { ok: false, erro, secao: "distribuicao" };
      distribuicao = pedidoDaDistribuicao(r.distribuicao.linhas, r.distribuicao.reiniciar);
    }
    // Q9 da 1J: a lista de pessoas não pode deixar de fora quem recebe por distribuição.
    if (!igual(r.permissoes, inicial.permissoes) || distribuicao) {
      const fora = distribuidosForaDaLista({
        linhas: r.distribuicao.linhas,
        pessoas: r.permissoes.pessoas,
        pessoasDoGrupo: config.pessoasDoGrupo,
      });
      if (fora.length > 0) {
        return {
          ok: false,
          erro: textoDoBloqueio(fora.length, r.permissoes.pessoas.length === 0),
          secao: "permissoes",
          usuarios: fora,
        };
      }
    }
  ```
- e o `return` final ganha `distribuicao`: `return { ok: true, mudancaDaOrigem, patch: Object.keys(patch).length > 0 ? patch : null, distribuicao };`.

- [ ] **Step 6: A subaba**

Create `components/escale/configuracoes/SecaoDistribuicao.tsx`:

```tsx
"use client";
import { useMemo } from "react";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
// (A Task 6 acrescenta o relógio e a janela do contador.)
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { ConfirmacaoDaCasca } from "@/components/escale/ui/ConfirmacaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import type { Role } from "@/lib/auth/types";
import { temAcessoAOrigem } from "@/lib/escale/acesso/regras";
import { DISTRIBUICAO_MAX, dividirIgual, type LinhaDaDistribuicao } from "@/lib/escale/distribuicao/regras";
import { Clock, Shuffle, Trash2 } from "@/lib/ui/icons-da-casca";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";
import { membrosAtivosDaEquipe } from "./ListaDePessoas";

const PAPEIS_QUE_RECEBEM = ["agent", "manager", "admin"];
const GRADE = "grid grid-cols-[1fr_16.666%_16.666%_8.333%] items-center";

/** "Ana Lima" → "AL"; "Ana" → "AN" (o avatar de iniciais da Clint). */
export function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return `${partes[0]![0]}${partes.at(-1)![0]}`.toUpperCase();
}

/**
 * DISTRIBUIÇÃO DE DONO (fork Escale, Fase 1K, D13; print 01-028 e código `Is` da Clint).
 * Só o admin vê (o menu esconde o item). Tudo vai para o rascunho; quem grava é
 * o "Salvar" único da janela, pela rota própria (N12). Entrar ou sair alguém
 * refaz todos com 100/n. Só são oferecidos membros ativos que podem receber
 * negócio e têm acesso à origem com a lista de pessoas do rascunho.
 */
export function SecaoDistribuicao({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const equipe = useTeamMembers();
  const membros = useMemo(() => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")), [equipe.data, t]);
  const papelDe = useMemo(
    () => new Map((equipe.data?.data ?? []).map((m) => [m.user_id.toLowerCase(), m.role])),
    [equipe.data],
  );
  const contadorDe = useMemo(
    () => new Map(config.distribuicao.map((p) => [p.userId, p.contador])),
    [config.distribuicao],
  );
  const linhas = rascunho.distribuicao.linhas;
  const mudarLinhas = (novas: LinhaDaDistribuicao[]) =>
    mudar((r) => ({ ...r, distribuicao: { ...r.distribuicao, linhas: novas } }));

  const opcoes = membros
    .filter((m) => !linhas.some((l) => l.userId === m.id))
    .filter((m) => {
      const papel = papelDe.get(m.id);
      return (
        !!papel &&
        PAPEIS_QUE_RECEBEM.includes(papel) &&
        temAcessoAOrigem({
          papel: papel as Role,
          userId: m.id,
          pessoas: rascunho.permissoes.pessoas,
          pessoasDoGrupo: config.pessoasDoGrupo,
        })
      );
    });

  return (
    <div className="grid max-w-[784px] gap-4">
      <CabecaDaSecao
        icone={Shuffle}
        titulo={t("Distribuição de dono")}
        descricao={t(
          "Defina os usuários e percentuais. Negócios criados por Integrações, Apps e Checkouts são distribuídos automaticamente entre eles.",
        )}
      />

      <div role="table" aria-label={t("Distribuição de dono")}>
        <div role="row" className={`${GRADE} h-11 border-b border-casca-borda`}>
          <span role="columnheader" className="text-[10px] font-semibold tracking-wide text-casca-meta uppercase">
            {t("Usuários")}
          </span>
          <span role="columnheader" className="text-center text-[10px] font-semibold tracking-wide text-casca-meta uppercase">
            {t("Percentual %")}
          </span>
          <span role="columnheader" className="flex items-center justify-center gap-1 text-[10px] font-semibold tracking-wide text-casca-meta uppercase">
            {t("Contador")}
            <AjudaDaCasca texto={t("Clique no contador para ver as distribuições feitas para o usuário nesta origem.")} />
          </span>
          <span role="columnheader" />
        </div>
        {linhas.map((l) => {
          const m = membros.find((x) => x.id === l.userId);
          const nome = m?.nome ?? l.userId;
          return (
            <div key={l.userId} role="row" aria-label={nome} className={`${GRADE} min-h-14 border-b border-casca-borda py-2`}>
              <div role="cell" className="flex min-w-0 items-center gap-3">
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-casca-marca text-[11px] font-semibold text-white">
                  {iniciaisDoNome(nome)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-casca-texto">{nome}</span>
                  {m?.email ? <span className="block truncate text-[11px] text-casca-suave">{m.email}</span> : null}
                </span>
              </div>
              <div role="cell" className="flex justify-center">
                <CampoDeTexto
                  aria-label={`${t("Percentual %")} ${nome}`}
                  inputMode="decimal"
                  value={l.percentual}
                  onChange={(e) =>
                    mudarLinhas(linhas.map((x) => (x.userId === l.userId ? { ...x, percentual: e.target.value } : x)))
                  }
                  className="h-9 w-[72px] px-2 text-center"
                />
              </div>
              <div role="cell" className="flex justify-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-casca-marca-suave px-3.5 py-1 text-[13px] font-semibold text-casca-marca">
                  <Clock size={13} aria-hidden />
                  {contadorDe.get(l.userId) ?? 0}
                </span>
              </div>
              <div role="cell" className="flex justify-center">
                <ConfirmacaoDaCasca
                  texto={t(
                    "A distribuição vai ser refeita com porcentagens iguais entre os demais usuários. Tem certeza que deseja remover este usuário?",
                  )}
                  aoConfirmar={() => mudarLinhas(dividirIgual(linhas.filter((x) => x.userId !== l.userId)))}
                >
                  <button
                    type="button"
                    aria-label={`${t("Remover")} ${nome}`}
                    className="rounded-[4px] p-1 text-casca-texto hover:text-casca-alerta"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </ConfirmacaoDaCasca>
              </div>
            </div>
          );
        })}
      </div>

      {opcoes.length > 0 && linhas.length < DISTRIBUICAO_MAX ? (
        <div className="w-[708px] max-w-full">
          <SeletorDaCasca
            aparencia="janela"
            valor=""
            vazio={t("Adicionar usuário")}
            vazioSoNoGatilho
            buscaAPartirDe={1}
            opcoes={opcoes.map((m) => ({ valor: m.id, rotulo: m.nome }))}
            aoMudar={(v) =>
              v && mudarLinhas(dividirIgual([...linhas, { userId: v, percentual: "", papel: papelDe.get(v) ?? null }]))
            }
            aria-label={t("Adicionar usuário")}
          />
        </div>
      ) : null}
    </div>
  );
}
```

Create `components/escale/configuracoes/RodapeDaDistribuicao.tsx`:

```tsx
"use client";
import { toast } from "sonner";

import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { ConfirmacaoDaCasca } from "@/components/escale/ui/ConfirmacaoDaCasca";
import { useReiniciarDistribuicao } from "@/hooks/escale/useDistribuicao";
import { useT } from "@/hooks/i18n/useT";
import { erroDaDistribuicao, linhasDaTela } from "@/lib/escale/distribuicao/regras";
import { Undo2 } from "@/lib/ui/icons-da-casca";

import type { PropsDaSecao } from "./JanelaDaOrigem";

/**
 * O CANTO ESQUERDO DO RODAPÉ NA DISTRIBUIÇÃO (fork Escale, Fase 1K; print 01-028
 * e código `us` da Clint). Editando e válido: a caixa "Reiniciar a contagem de
 * negócios ao salvar" (vai no rascunho). Senão: "Resetar distribuição", que é
 * imediato depois do "Sim".
 */
export function RodapeDaDistribuicao({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const reiniciar = useReiniciarDistribuicao(config.pipeline.id);
  const editando =
    JSON.stringify(rascunho.distribuicao.linhas) !== JSON.stringify(linhasDaTela(config.distribuicao));

  if (editando && erroDaDistribuicao(rascunho.distribuicao.linhas) === null) {
    return (
      <div className="flex items-center gap-1.5 text-[13px] text-casca-texto">
        <CaixaDaCasca
          marcada={rascunho.distribuicao.reiniciar}
          aoMudar={(marcada) => mudar((r) => ({ ...r, distribuicao: { ...r.distribuicao, reiniciar: marcada } }))}
          rotulo={t("Reiniciar a contagem de negócios ao salvar")}
        />
        <AjudaDaCasca texto={t("Zera o contador e apaga o histórico de distribuições desta origem.")} />
      </div>
    );
  }

  return (
    <ConfirmacaoDaCasca
      texto={t(
        "A contagem de negócios será zerada e o histórico de distribuições desta origem será apagado. Tem certeza que deseja continuar?",
      )}
      aoConfirmar={() =>
        reiniciar.mutate(undefined, {
          onSuccess: () => toast.success(t("A distribuição foi reiniciada com sucesso.")),
          onError: (e) => toast.error(textoDoErro(e, t)),
        })
      }
    >
      <button
        type="button"
        disabled={reiniciar.isPending}
        title={t("Zera o contador de todos os usuários, reinicia o rodízio e apaga o histórico de distribuições desta origem.")}
        className="inline-flex h-8 items-center gap-2 px-2 text-[13px] text-casca-suave hover:text-casca-texto disabled:opacity-60"
      >
        <Undo2 size={16} aria-hidden />
        {t("Resetar distribuição")}
      </button>
    </ConfirmacaoDaCasca>
  );
}
```

Confira a assinatura de `textoDoErro` em `components/escale/origens/texto-do-erro.ts` (a janela já o usa como `textoDoErro(e, t)`).

- [ ] **Step 7: A janela**

Em `components/escale/configuracoes/JanelaDaOrigem.tsx`:
- imports novos:
  ```ts
  import { useSalvarDistribuicao } from "@/hooks/escale/useDistribuicao";
  import { useTeamMembers } from "@/hooks/team/useTeamMembers";
  import { membrosAtivosDaEquipe } from "./ListaDePessoas";
  import { RodapeDaDistribuicao } from "./RodapeDaDistribuicao";
  import { SecaoDistribuicao } from "./SecaoDistribuicao";
  ```
- depois de `const atualizar = useAtualizarOrigem();`:
  ```ts
  const salvarDistribuicao = useSalvarDistribuicao(id);
  const equipe = useTeamMembers();
  ```
- `ocupado` passa a ser `salvar.isPending || atualizar.isPending || salvarDistribuicao.isPending`;
- o item `distribuicao` do menu perde o `emBreve`: `{ id: "distribuicao", rotulo: t("Distribuição de dono"), icone: Shuffle },`; e logo depois de montar o array, ele some para quem não é admin (Clint, N11):
  ```ts
  const menuVisivel = menu.filter((m) => m.id !== "distribuicao" || config?.podeAdministrar === true);
  ```
  troque `menu.find(…)` e `menu.map(…)` por `menuVisivel.find(…)` e `menuVisivel.map(…)`;
- em `aoSalvar`, o bloco de erro vira:
  ```ts
    if (!pedido.ok) {
      const etapa = config.etapas.find((e) => e.id === pedido.etapa)?.name;
      const membros = membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome"));
      const nomes = (pedido.usuarios ?? []).map((u) => membros.find((m) => m.id === u)?.nome ?? u).join(", ");
      const texto = t(pedido.erro).split("{usuarios}").join(nomes);
      setErro(etapa ? `${etapa}: ${texto}` : texto);
      setSubaba(pedido.secao);
      return;
    }
  ```
  e, no `try`, depois de `if (pedido.patch) await salvar.mutateAsync(pedido.patch);`:
  ```ts
      if (pedido.distribuicao) {
        try {
          await salvarDistribuicao.mutateAsync(pedido.distribuicao);
        } catch (e) {
          setErro(`${t("Erro ao salvar a distribuição de donos.")} ${textoDoErro(e, t)}`);
          setSubaba("distribuicao");
          return;
        }
      }
      const soDistribuicao =
        !!pedido.distribuicao && !pedido.patch && Object.keys(pedido.mudancaDaOrigem).length === 0;
      toast.success(
        soDistribuicao ? t("As configurações de distribuição foram salvas com sucesso!") : t("Origem alterada com sucesso!"),
      );
      onFechar();
  ```
  (no lugar do `toast.success(t("Origem alterada com sucesso!")); onFechar();` que havia);
- no `switch` de `conteudo`: `case "distribuicao": return <SecaoDistribuicao {...props} />;`;
- o rodapé: troque `<div className="flex justify-end gap-2 px-8 pt-3 pb-[22px]">` por `<div className="flex items-center justify-between gap-2 px-8 pt-3 pb-[22px]">`, ponha como primeiro filho
  ```tsx
              {aba === "geral" && subaba === "distribuicao" && config && rascunho && config.podeAdministrar ? (
                <RodapeDaDistribuicao config={config} rascunho={rascunho} mudar={mudar} />
              ) : (
                <span />
              )}
  ```
  e envolva os botões que já estavam ali (Cancelar e o Salvar de cada aba) num `<div className="flex gap-2">…</div>`;
- no cabeçalho do arquivo: `Fase 1K: a subaba "Distribuição de dono" (só admin), com a rota própria no mesmo "Salvar" e o "Resetar distribuição" no canto do rodapé.`

Em `tests/unit/escale-janela-da-origem.test.tsx`, troque o teste "subaba de outra fase mostra Em breve" por:

```tsx
  it("subaba de outra fase mostra Em breve", async () => {
    const { user } = abrir();
    await screen.findByRole("navigation", { name: "Configurações da origem" });
    await user.click(screen.getByRole("button", { name: "Visualização de campos" }));
    expect(screen.getByText("Chega com o módulo Contatos (Fase 2).")).toBeInTheDocument();
  });
```

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-secao-distribuicao.test.tsx tests/unit/escale-janela-da-origem.test.tsx tests/unit/escale-secao-permissoes.test.tsx tests/unit/escale-configuracoes-regras.test.ts && corepack pnpm typecheck && corepack pnpm eslint components/escale/configuracoes components/escale/ui/ConfirmacaoDaCasca.tsx hooks/escale/useDistribuicao.ts lib/escale/configuracoes lib/ui/icons-da-casca.ts`
Expected: PASS, limpo. Rode também os guardas de tela: `corepack pnpm vitest run $(ls tests/unit | grep -E "controle-decorativo|tailwind-tokens|escale-casca-tokens|vocabulario-do-funil|selecao-longa-tem-busca|escale-casca-v2-original-intacto" | sed 's#^#tests/unit/#')`.

- [ ] **Step 9: Commit**

```bash
corepack pnpm prettier --write components/escale/configuracoes/SecaoDistribuicao.tsx components/escale/configuracoes/RodapeDaDistribuicao.tsx components/escale/ui/ConfirmacaoDaCasca.tsx hooks/escale/useDistribuicao.ts tests/unit/escale-secao-distribuicao.test.tsx
git add components/escale hooks/escale lib/escale/configuracoes lib/ui/icons-da-casca.ts tests/unit
git commit -m "feat(escale): subaba 'Distribuição de dono' da origem (Fase 1K, D13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: O relógio (histórico de alterações) e o contador (histórico de distribuições)

**Abra antes:** o print 028 (o relógio no canto e a pílula do contador). As duas janelas não têm print: siga o código (Medidas e Textos, no topo do plano).

**Files:**
- Create: `components/escale/configuracoes/HistoricoDeAlteracoes.tsx`, `components/escale/configuracoes/HistoricoDeDistribuicoes.tsx`, `tests/unit/escale-historicos-da-distribuicao.test.tsx`
- Modify: `lib/escale/distribuicao/regras.ts` (`tempoRelativo`, `dataBr`, `horaBr`), `tests/unit/escale-distribuicao-regras.test.ts`, `components/escale/configuracoes/SecaoDistribuicao.tsx`, `components/escale/origens/JanelaDaCasca.tsx` (prop `className`)

**Interfaces:**
- Consumes: Task 1 (`versoesDaDistribuicao`, `textoDoPercentual`, `POR_PAGINA_DAS_DISTRIBUICOES`), Task 4 (`DistribuicaoFeita`), Task 5 (`useAlteracoesDaDistribuicao`, `useDistribuicoesFeitas`, `FiltrosDasDistribuicoes`, `SecaoDistribuicao`); `useTagDeIdioma` (`@/hooks/i18n/useLocaleDeData`); `Sheet*` (`@/components/ui/sheet`); `PaginacaoDaCasca`; `JanelaDaCasca`, `CabecaDaJanela`.
- Produces: `tempoRelativo(iso, agoraMs, tagDeIdioma): string`, `dataBr(iso): string` ("18/10/2026"), `horaBr(iso): string` ("10:05"); `HistoricoDeAlteracoes({ aberta, aoFechar, pipelineId, origem })`; `HistoricoDeDistribuicoes({ aberta, aoFechar, pipelineId, origem, usuarioInicial, naDistribuicao })`; `JanelaDaCasca` aceita `className`.

- [ ] **Step 1: Os testes (vão falhar)**

Em `tests/unit/escale-distribuicao-regras.test.ts`, acrescente (e os nomes ao import):

```ts
describe("datas e tempo (formato brasileiro, 24 h)", () => {
  it("dataBr e horaBr", () => {
    const iso = new Date(2026, 9, 18, 9, 5).toISOString();
    expect(dataBr(iso)).toBe("18/10/2026");
    expect(horaBr(iso)).toBe("09:05");
  });

  it("tempoRelativo usa a unidade certa", () => {
    const agora = Date.parse("2026-10-18T12:00:00Z");
    expect(tempoRelativo("2026-10-18T11:55:00Z", agora, "pt-BR")).toBe("há 5 minutos");
    expect(tempoRelativo("2026-10-18T09:00:00Z", agora, "pt-BR")).toBe("há 3 horas");
    expect(tempoRelativo("2026-10-16T12:00:00Z", agora, "pt-BR")).toBe("anteontem");
  });
});
```

Create `tests/unit/escale-historicos-da-distribuicao.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL", role: "admin" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1K (D13): o relógio e o contador da distribuição (código `Ms` e o histórico da Clint; sem print). */
const A = "aaaaaaaa-1111-4111-8111-111111111111";
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const ORIGENS: Origens = {
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};
const EQUIPE = [
  { user_id: A, role: "admin", full_name: "Ana Lima", email: "ana@x.com", accepted_at: "2026-01-01", revoked_at: null, invited_at: null, created_at: "2026-01-01", last_sign_in_at: null },
  { user_id: B, role: "agent", full_name: "Bruno Reis", email: "bruno@x.com", accepted_at: "2026-01-01", revoked_at: null, invited_at: null, created_at: "2026-01-01", last_sign_in_at: null },
];
const CONFIG = {
  pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
  etapas: [], motivos: [], campos: [], regras: [],
  fork: { moeda: null, tagsPadrao: [], motivosInativos: [], aoSair: {}, alerta: { geral: null, etapas: {} }, visualizacao: null, pessoas: [] },
  moedaDaOrganizacao: "BRL", visualizacao: "own_and_unassigned", visualizacaoDaOrganizacao: "own_and_unassigned",
  pessoasDoGrupo: [], podeAdministrar: true,
  distribuicao: [{ userId: A, percentual: 100, contador: 7, papel: "admin" }],
  distribuicaoAtualizada: { em: new Date(Date.now() - 5 * 60_000).toISOString(), autorId: A },
} as unknown as ConfiguracoesDaOrigem;

function abrir(rotas: Record<string, unknown>) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/pipelines/f-1/configuracoes") return { data: CONFIG };
    if (url === "/api/v1/team") return { data: EQUIPE };
    const chave = Object.keys(rotas).find((r) => url.startsWith(r));
    return { data: chave ? rotas[chave] : [] };
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={vi.fn()} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

async function irParaDistribuicao(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("navigation", { name: "Configurações da origem" });
  await user.click(screen.getByRole("button", { name: "Distribuição de dono" }));
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("o relógio: Histórico de alterações", () => {
  it("mostra 'Atualizado há 5 minutos' e abre a gaveta com as versões e os textos da Clint", async () => {
    const em = new Date(Date.now() - 5 * 60_000).toISOString();
    const user = abrir({
      "/api/v1/pipelines/f-1/distribuicao/alteracoes": [
        { id: "1", evento: "percentual_alterado", pessoaId: A, percentualAntes: 50, percentualDepois: 100, autorId: A, em },
        { id: "2", evento: "pessoa_saiu", pessoaId: B, percentualAntes: 50, percentualDepois: null, autorId: A, em },
        { id: "3", evento: "contagem_reiniciada", pessoaId: null, percentualAntes: null, percentualDepois: null, autorId: B, em: "2026-01-01T10:00:00Z" },
      ],
    });
    await irParaDistribuicao(user);
    await user.click(await screen.findByRole("button", { name: "Histórico de alterações" }));
    const gaveta = await screen.findByRole("dialog", { name: "Histórico de alterações" });
    expect(within(gaveta).getByText("Distribuição de dono · Clayton")).toBeInTheDocument();
    expect(await within(gaveta).findByText("Percentual de Ana Lima alterado de 50% para 100%")).toBeInTheDocument();
    expect(within(gaveta).getByText("Bruno Reis saiu da distribuição")).toBeInTheDocument();
    expect(within(gaveta).getByText("Contagem de negócios reiniciada")).toBeInTheDocument();
    expect(within(gaveta).getByText("Versão atual")).toBeInTheDocument();
    expect(within(gaveta).getByText("Versão anterior")).toBeInTheDocument();
  });

  it("sem nada registrado: o texto vazio da Clint", async () => {
    const user = abrir({ "/api/v1/pipelines/f-1/distribuicao/alteracoes": [] });
    await irParaDistribuicao(user);
    await user.click(await screen.findByRole("button", { name: "Histórico de alterações" }));
    expect(await screen.findByText("Nenhuma alteração registrada ainda.")).toBeInTheDocument();
  });
});

describe("o contador: Histórico de distribuições", () => {
  it("a pílula abre a janela filtrada pela pessoa, com a tabela, o rodapé e o 'Removido'", async () => {
    const user = abrir({
      "/api/v1/pipelines/f-1/distribuicao/feitas": {
        itens: [
          { id: "d1", leadId: "l1", titulo: "Maria Souza", etapa: "Novo", userId: A, em: "2026-10-18T13:05:00Z" },
          { id: "d2", leadId: "l2", titulo: "João Prado", etapa: null, userId: B, em: "2026-10-17T09:00:00Z" },
        ],
        total: 2,
      },
    });
    await irParaDistribuicao(user);
    await user.click(await screen.findByRole("button", { name: "Ver distribuições de Ana" }));
    const janela = await screen.findByRole("dialog", { name: "Histórico de distribuições" });
    expect(within(janela).getByText("Origem: Clayton")).toBeInTheDocument();
    expect(vi.mocked(apiClient.get).mock.calls.some(([u]) => String(u).includes(`usuario=${A}`))).toBe(true);
    expect(within(janela).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Negócio", "Etapa", "Distribuído para", "Data"]);
    expect(await within(janela).findByText("Maria Souza")).toBeInTheDocument();
    expect(within(janela).getByText("Removido")).toBeInTheDocument();
    expect(within(janela).getByText("Mostrando 1–2 de 2 negócios atribuídos")).toBeInTheDocument();
  });

  it("sem resultado: o texto da Clint e 'Limpar filtros'", async () => {
    const user = abrir({ "/api/v1/pipelines/f-1/distribuicao/feitas": { itens: [], total: 0 } });
    await irParaDistribuicao(user);
    await user.click(await screen.findByRole("button", { name: "Ver distribuições de Ana" }));
    expect(await screen.findByText("Nenhuma distribuição encontrada para os filtros selecionados.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar filtros" })).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-distribuicao-regras.test.ts tests/unit/escale-historicos-da-distribuicao.test.tsx`
Expected: FAIL.

- [ ] **Step 2: As datas nas regras**

Em `lib/escale/distribuicao/regras.ts`, acrescente:

```ts
const doisDigitos = (n: number) => String(n).padStart(2, "0");

/** "18/10/2026" (dia/mês/ano, hora local). */
export function dataBr(iso: string): string {
  const d = new Date(iso);
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "09:05" (24 h, hora local). */
export function horaBr(iso: string): string {
  const d = new Date(iso);
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

/** "há 5 minutos" / "hace 5 minutos": o "Atualizado há …" da Clint, no idioma da tela. */
export function tempoRelativo(iso: string, agoraMs: number, tagDeIdioma: string): string {
  const rtf = new Intl.RelativeTimeFormat(tagDeIdioma, { numeric: "auto" });
  const segundos = Math.round((Date.parse(iso) - agoraMs) / 1000);
  const abs = Math.abs(segundos);
  if (abs < 60) return rtf.format(segundos, "second");
  if (abs < 3600) return rtf.format(Math.round(segundos / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(segundos / 3600), "hour");
  if (abs < 30 * 86_400) return rtf.format(Math.round(segundos / 86_400), "day");
  return rtf.format(Math.round(segundos / (30 * 86_400)), "month");
}
```

- [ ] **Step 3: A janela da casca aceita largura**

Em `components/escale/origens/JanelaDaCasca.tsx`, `JanelaDaCasca` ganha `className?: string` e o `DialogPrimitive.Content` passa a usar `className={cn("ds-modal fixed … shadow-casca-painel", className)}` (a classe que já está, inteira, como primeiro argumento). Quem não passa nada fica igual.

- [ ] **Step 4: A gaveta do relógio**

Create `components/escale/configuracoes/HistoricoDeAlteracoes.tsx`:

```tsx
"use client";
import { useMemo } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAlteracoesDaDistribuicao } from "@/hooks/escale/useDistribuicao";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import {
  dataBr,
  horaBr,
  textoDoPercentual,
  versoesDaDistribuicao,
  type AlteracaoDaDistribuicao,
} from "@/lib/escale/distribuicao/regras";
import { History, Percent, RefreshCw, UserMinus, UserPlus, type LucideIcon } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { membrosAtivosDaEquipe } from "./ListaDePessoas";

const ESTILO: Record<AlteracaoDaDistribuicao["evento"], { Icone: LucideIcon; cor: string }> = {
  percentual_alterado: { Icone: Percent, cor: "text-casca-marca" },
  pessoa_entrou: { Icone: UserPlus, cor: "text-(--escale-status-ganho)" },
  pessoa_saiu: { Icone: UserMinus, cor: "text-casca-alerta" },
  contagem_reiniciada: { Icone: RefreshCw, cor: "text-casca-meta" },
};

/**
 * A GAVETA "HISTÓRICO DE ALTERAÇÕES" (fork Escale, Fase 1K; código `Ms` da Clint,
 * sem print). Versões da mais nova para a mais velha (o mesmo autor em até 2 s
 * é uma versão), com o selo "Versão atual" na primeira.
 */
export function HistoricoDeAlteracoes({
  aberta,
  aoFechar,
  pipelineId,
  origem,
}: {
  aberta: boolean;
  aoFechar: () => void;
  pipelineId: string;
  origem: string;
}) {
  const t = useT();
  const consulta = useAlteracoesDaDistribuicao(pipelineId, aberta);
  const equipe = useTeamMembers();
  const membros = useMemo(() => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")), [equipe.data, t]);
  const nomeDe = (id: string | null) =>
    (id && membros.find((m) => m.id === id)?.nome) || t("Usuário desconhecido");
  const versoes = versoesDaDistribuicao(consulta.data ?? []);

  function texto(a: AlteracaoDaDistribuicao): string {
    const pct = (n: number | null) => (n === null ? "" : textoDoPercentual(n));
    const nome = nomeDe(a.pessoaId);
    switch (a.evento) {
      case "percentual_alterado":
        return t("Percentual de {nome} alterado de {de}% para {para}%")
          .split("{nome}").join(nome)
          .split("{de}").join(pct(a.percentualAntes))
          .split("{para}").join(pct(a.percentualDepois));
      case "pessoa_entrou":
        return t("{nome} entrou na distribuição com {percentual}%")
          .split("{nome}").join(nome)
          .split("{percentual}").join(pct(a.percentualDepois));
      case "pessoa_saiu":
        return t("{nome} saiu da distribuição").split("{nome}").join(nome);
      case "contagem_reiniciada":
        return t("Contagem de negócios reiniciada");
    }
  }

  return (
    <Sheet open={aberta} onOpenChange={(a) => !a && aoFechar()}>
      <SheetContent side="right" className="flex w-[92vw] max-w-[400px] flex-col gap-0 bg-surface p-0 text-casca-texto">
        <SheetHeader className="border-b border-casca-borda px-5 py-4 text-left">
          <SheetTitle className="text-[16px] font-medium text-casca-texto">{t("Histórico de alterações")}</SheetTitle>
          <SheetDescription className="text-[12px] text-casca-suave">{`${t("Distribuição de dono")} · ${origem}`}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {consulta.isPending ? (
            <p className="text-[13px] text-casca-suave">{t("Carregando…")}</p>
          ) : consulta.isError ? (
            <p role="alert" className="text-[13px] text-casca-alerta">{t("Não consegui ler o histórico.")}</p>
          ) : versoes.length === 0 ? (
            <div className="grid place-items-center gap-2 py-12 text-casca-suave">
              <History size={24} aria-hidden />
              <p className="text-[13px]">{t("Nenhuma alteração registrada ainda.")}</p>
            </div>
          ) : (
            <ol className="grid gap-6">
              {versoes.map((v, i) => (
                <li key={v.itens[0]!.id} className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-casca-texto">{dataBr(v.em)}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        i === 0 ? "bg-casca-marca-suave text-casca-marca" : "bg-casca-raia text-casca-suave",
                      )}
                    >
                      {i === 0 ? t("Versão atual") : t("Versão anterior")}
                    </span>
                  </div>
                  <p className="text-[12px] text-casca-suave" title={`${nomeDe(v.autorId)} · ${dataBr(v.em)} ${horaBr(v.em)}`}>
                    {`${nomeDe(v.autorId)} · ${horaBr(v.em)}`}
                  </p>
                  <ul className="grid gap-2">
                    {v.itens.map((a) => {
                      const { Icone, cor } = ESTILO[a.evento];
                      return (
                        <li key={a.id} className="flex items-center gap-2 text-[13px] text-casca-texto">
                          <span aria-hidden className={cn("grid size-6 shrink-0 place-items-center rounded-full bg-casca-raia", cor)}>
                            <Icone size={13} />
                          </span>
                          {texto(a)}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

Se o token `--escale-status-ganho` não existir em `app/escale-tema.css`, use `text-casca-marca` para "entrou" (não crie hex).

- [ ] **Step 5: A janela do contador**

Create `components/escale/configuracoes/HistoricoDeDistribuicoes.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { CabecaDaJanela, CampoDeTexto, JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useDistribuicoesFeitas, type FiltrosDasDistribuicoes } from "@/hooks/escale/useDistribuicao";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { POR_PAGINA_DAS_DISTRIBUICOES, dataBr, horaBr } from "@/lib/escale/distribuicao/regras";
import { SearchX } from "@/lib/ui/icons-da-casca";

import { membrosAtivosDaEquipe } from "./ListaDePessoas";

const GRADE = "grid grid-cols-[2fr_1.1fr_1.4fr_128px] items-center gap-3";
const ESPERA_DA_BUSCA_MS = 400;

/**
 * A JANELA "HISTÓRICO DE DISTRIBUIÇÕES" (fork Escale, Fase 1K; aberta pelo
 * contador, código da Clint, sem print). Filtros: busca no título do negócio
 * (N14), pessoa e período; 6 por página. Quem saiu da distribuição aparece com
 * o selo "Removido".
 */
export function HistoricoDeDistribuicoes({
  aberta,
  aoFechar,
  pipelineId,
  origem,
  usuarioInicial,
  naDistribuicao,
}: {
  aberta: boolean;
  aoFechar: () => void;
  pipelineId: string;
  origem: string;
  usuarioInicial: string;
  naDistribuicao: readonly string[];
}) {
  const t = useT();
  const [filtros, setFiltros] = useState<FiltrosDasDistribuicoes>({ usuario: usuarioInicial, busca: "", periodo: "", pagina: 1 });
  const [busca, setBusca] = useState("");
  useEffect(() => setFiltros((f) => ({ ...f, usuario: usuarioInicial, pagina: 1 })), [usuarioInicial]);
  useEffect(() => {
    const espera = setTimeout(() => setFiltros((f) => (f.busca === busca ? f : { ...f, busca, pagina: 1 })), ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(espera);
  }, [busca]);

  const consulta = useDistribuicoesFeitas(pipelineId, filtros, aberta);
  const equipe = useTeamMembers();
  const membros = useMemo(() => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")), [equipe.data, t]);
  const nomeDe = (id: string | null) => (id && membros.find((m) => m.id === id)?.nome) || t("Usuário desconhecido");
  const itens = consulta.data?.itens ?? [];
  const total = consulta.data?.total ?? 0;
  const de = total === 0 ? 0 : (filtros.pagina - 1) * POR_PAGINA_DAS_DISTRIBUICOES + 1;
  const ate = Math.min(total, filtros.pagina * POR_PAGINA_DAS_DISTRIBUICOES);
  const limpar = () => {
    setBusca("");
    setFiltros({ usuario: "", busca: "", periodo: "", pagina: 1 });
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(760px,calc(100vw-2rem))]">
      <CabecaDaJanela titulo={t("Histórico de distribuições")} descricao={t("Origem: {origem}").split("{origem}").join(origem)} />
      <div className="grid grid-cols-[1fr_200px_180px] gap-3">
        <CampoDeTexto
          type="search"
          aria-label={t("Buscar por contato ou empresa")}
          placeholder={t("Buscar por contato ou empresa")}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <SeletorDaCasca
          aparencia="janela"
          valor={filtros.usuario}
          aria-label={t("Todos os usuários")}
          opcoes={[
            { valor: "", rotulo: t("Todos os usuários") },
            ...naDistribuicao.map((id) => ({ valor: id, rotulo: nomeDe(id) })),
          ]}
          aoMudar={(v) => setFiltros((f) => ({ ...f, usuario: v, pagina: 1 }))}
        />
        <SeletorDaCasca
          aparencia="janela"
          valor={filtros.periodo}
          aria-label={t("Período")}
          opcoes={[
            { valor: "", rotulo: t("Todo o período") },
            { valor: "7", rotulo: t("Últimos 7 dias") },
            { valor: "30", rotulo: t("Últimos 30 dias") },
          ]}
          aoMudar={(v) => setFiltros((f) => ({ ...f, periodo: v as FiltrosDasDistribuicoes["periodo"], pagina: 1 }))}
        />
      </div>

      <div role="table" aria-label={t("Histórico de distribuições")}>
        <div role="row" className={`${GRADE} h-10 border-b border-casca-borda`}>
          {[t("Negócio"), t("Etapa"), t("Distribuído para"), t("Data")].map((c) => (
            <span key={c} role="columnheader" className="text-[10px] font-semibold tracking-wide text-casca-meta uppercase">
              {c}
            </span>
          ))}
        </div>
        {consulta.isPending ? (
          <p className="py-6 text-[13px] text-casca-suave">{t("Carregando…")}</p>
        ) : itens.length === 0 ? (
          <div className="grid place-items-center gap-2 py-10 text-casca-suave">
            <SearchX size={24} aria-hidden />
            <p className="text-[13px]">{t("Nenhuma distribuição encontrada para os filtros selecionados.")}</p>
            <BotaoDaCasca variante="texto" onClick={limpar}>
              {t("Limpar filtros")}
            </BotaoDaCasca>
          </div>
        ) : (
          itens.map((d) => (
            <div key={d.id} role="row" className={`${GRADE} h-16 border-b border-casca-borda text-[13px]`}>
              <Link role="cell" href={`/app/negocios/${d.leadId}`} className="truncate font-medium text-casca-texto hover:underline">
                {d.titulo}
              </Link>
              <span role="cell" className="truncate text-casca-suave">{d.etapa ?? "—"}</span>
              <span role="cell" className="flex min-w-0 items-center gap-2">
                <span className="truncate text-casca-texto">{nomeDe(d.userId)}</span>
                {d.userId && !naDistribuicao.includes(d.userId) ? (
                  <span className="shrink-0 rounded-full bg-casca-raia px-2 py-0.5 text-[11px] text-casca-alerta">{t("Removido")}</span>
                ) : null}
              </span>
              <span role="cell" className="text-casca-suave">{`${dataBr(d.em)} ${horaBr(d.em)}`}</span>
            </div>
          ))
        )}
      </div>

      {total > 0 ? (
        <div className="flex items-center justify-between gap-3 text-[12px] text-casca-suave">
          <span>
            {(total === 1 ? t("Mostrando {de}–{ate} de {total} negócio atribuído") : t("Mostrando {de}–{ate} de {total} negócios atribuídos"))
              .split("{de}").join(String(de))
              .split("{ate}").join(String(ate))
              .split("{total}").join(String(total))}
          </span>
          <PaginacaoDaCasca
            pagina={filtros.pagina}
            total={total}
            porPagina={POR_PAGINA_DAS_DISTRIBUICOES}
            opcoesPorPagina={[POR_PAGINA_DAS_DISTRIBUICOES]}
            aoMudarPagina={(pagina) => setFiltros((f) => ({ ...f, pagina }))}
            aoMudarPorPagina={() => undefined}
          />
        </div>
      ) : null}
    </JanelaDaCasca>
  );
}
```

Se `PaginacaoDaCasca` mostrar o seletor de "por página" mesmo com uma opção só, passe a prop que o esconde, se houver; se não houver, deixe e registre a diferença.

- [ ] **Step 6: Ligar o relógio e a pílula na subaba**

Em `components/escale/configuracoes/SecaoDistribuicao.tsx`:
- imports: `useState`; `useTagDeIdioma` de `@/hooks/i18n/useLocaleDeData`; `tempoRelativo` das regras; `HistoricoDeAlteracoes` e `HistoricoDeDistribuicoes`;
- no começo do corpo:
  ```tsx
  const tag = useTagDeIdioma();
  const [relogio, setRelogio] = useState(false);
  const [contadorDe, setContadorDe] = useState<string | null>(null);
  const quando = config.distribuicaoAtualizada;
  const nomeDaOrigem = config.pipeline.name;
  ```
  e renomeie o `Map` que já se chamava `contadorDe` para `contadores` (e o uso na pílula);
- no `CabecaDaSecao`, `acao={…}`:
  ```tsx
        acao={
          <button
            type="button"
            onClick={() => setRelogio(true)}
            aria-label={t("Histórico de alterações")}
            title={quando ? undefined : t("Histórico de alterações")}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border border-casca-borda px-2.5 text-[12px] text-casca-suave hover:bg-casca-raia"
          >
            <Clock size={13} aria-hidden />
            {quando ? `${t("Atualizado")} ${tempoRelativo(quando.em, Date.now(), tag)}` : null}
          </button>
        }
  ```
- a pílula vira botão:
  ```tsx
                <button
                  type="button"
                  aria-label={t("Ver distribuições de {nome}").split("{nome}").join(nome.split(" ")[0] ?? nome)}
                  onClick={() => setContadorDe(l.userId)}
                  className="inline-flex items-center gap-1 rounded-full bg-casca-marca-suave px-3.5 py-1 text-[13px] font-semibold text-casca-marca hover:brightness-95"
                >
                  <Clock size={13} aria-hidden />
                  {contadores.get(l.userId) ?? 0}
                </button>
  ```
- no fim do JSX, antes do `</div>` de fora:
  ```tsx
      <HistoricoDeAlteracoes aberta={relogio} aoFechar={() => setRelogio(false)} pipelineId={config.pipeline.id} origem={nomeDaOrigem} />
      <HistoricoDeDistribuicoes
        aberta={contadorDe !== null}
        aoFechar={() => setContadorDe(null)}
        pipelineId={config.pipeline.id}
        origem={nomeDaOrigem}
        usuarioInicial={contadorDe ?? ""}
        naDistribuicao={config.distribuicao.map((p) => p.userId)}
      />
  ```

O `aria-label` do botão do relógio é fixo ("Histórico de alterações"), e o texto visível "Atualizado há …" fica dentro dele: o teste acha o botão pelo nome acessível.

- [ ] **Step 7: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-distribuicao-regras.test.ts tests/unit/escale-historicos-da-distribuicao.test.tsx tests/unit/escale-secao-distribuicao.test.tsx && corepack pnpm typecheck && corepack pnpm eslint components/escale/configuracoes components/escale/origens/JanelaDaCasca.tsx lib/escale/distribuicao`
Expected: PASS, limpo. (Ajuste no teste de `escale-secao-distribuicao` a linha do contador: `within(linhaDaAna).getByText("3")` continua valendo, agora dentro do botão.)

- [ ] **Step 8: Commit**

```bash
corepack pnpm prettier --write components/escale/configuracoes/HistoricoDeAlteracoes.tsx components/escale/configuracoes/HistoricoDeDistribuicoes.tsx tests/unit/escale-historicos-da-distribuicao.test.tsx
git add components/escale lib/escale/distribuicao tests/unit
git commit -m "feat(escale): histórico de alterações e de distribuições da origem (Fase 1K, D13)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Espanhol, rodada cheia, conferência, PRD e o PR A

**Files:**
- Modify: `lib/i18n/dicionario.ts`, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md` (fora do repositório)

- [ ] **Step 1: O espanhol**

Em `lib/i18n/dicionario.ts`, logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`, acrescente o bloco abaixo. Antes, rode `grep -n '"Sim":\|"Não":\|"Usuários":\|"Data":\|"Etapa":\|"Remover":\|"Carregando…":\|"Fechar":' lib/i18n/dicionario.ts` e **tire do bloco** toda chave que já existir (chave repetida quebra o objeto):

```ts
  // ─── FORK ESCALE · Fase 1K (PR A): distribuição de dono ───
  "Defina os usuários e percentuais. Negócios criados por Integrações, Apps e Checkouts são distribuídos automaticamente entre eles.": {
    es: "Define los usuarios y porcentajes. Los negocios creados por Integraciones, Apps y Checkouts se distribuyen automáticamente entre ellos.",
  },
  "Percentual %": { es: "Porcentaje %" },
  Contador: { es: "Contador" },
  "Clique no contador para ver as distribuições feitas para o usuário nesta origem.": {
    es: "Haz clic en el contador para ver las distribuciones hechas al usuario en este origen.",
  },
  "Adicionar usuário": { es: "Agregar usuario" },
  "Resetar distribuição": { es: "Reiniciar distribución" },
  "Zera o contador de todos os usuários, reinicia o rodízio e apaga o histórico de distribuições desta origem.": {
    es: "Pone a cero el contador de todos los usuarios, reinicia la rotación y borra el historial de distribuciones de este origen.",
  },
  "A contagem de negócios será zerada e o histórico de distribuições desta origem será apagado. Tem certeza que deseja continuar?": {
    es: "El conteo de negocios se pondrá a cero y se borrará el historial de distribuciones de este origen. ¿Seguro que quieres continuar?",
  },
  "A distribuição foi reiniciada com sucesso.": { es: "La distribución se reinició con éxito." },
  "Reiniciar a contagem de negócios ao salvar": { es: "Reiniciar el conteo de negocios al guardar" },
  "Zera o contador e apaga o histórico de distribuições desta origem.": {
    es: "Pone a cero el contador y borra el historial de distribuciones de este origen.",
  },
  "A distribuição vai ser refeita com porcentagens iguais entre os demais usuários. Tem certeza que deseja remover este usuário?": {
    es: "La distribución se rehará con porcentajes iguales entre los demás usuarios. ¿Seguro que quieres quitar a este usuario?",
  },
  "Verificar o total das porcentagens, deve somar 100%.": {
    es: "Revisa el total de los porcentajes, debe sumar 100%.",
  },
  "Verificar se as porcentagens são maiores que 0%.": {
    es: "Revisa que los porcentajes sean mayores que 0%.",
  },
  "As configurações de distribuição foram salvas com sucesso!": {
    es: "¡La configuración de distribución se guardó con éxito!",
  },
  "Erro ao salvar a distribuição de donos.": { es: "Error al guardar la distribución de responsables." },
  "Este usuário não possui permissão nesta origem.": { es: "Este usuario no tiene permiso en este origen." },
  "Só administrador muda a distribuição de dono.": {
    es: "Solo el administrador cambia la distribución de responsable.",
  },
  "Não é possível salvar. Há usuários na distribuição desta origem fora da lista de permissões.": {
    es: "No es posible guardar. Hay usuarios en la distribución de este origen fuera de la lista de permisos.",
  },
  "Não é possível salvar. Este usuário recebe negócios por distribuição nesta origem e não está na lista: {usuarios}. Inclua-o na lista de permissões ou remova-o da distribuição.": {
    es: "No es posible guardar. Este usuario recibe negocios por distribución en este origen y no está en la lista: {usuarios}. Inclúyelo en la lista de permisos o quítalo de la distribución.",
  },
  "Não é possível salvar. Estes usuários recebem negócios por distribuição nesta origem e não estão na lista: {usuarios}. Inclua-os na lista de permissões ou remova-os da distribuição.": {
    es: "No es posible guardar. Estos usuarios reciben negocios por distribución en este origen y no están en la lista: {usuarios}. Inclúyelos en la lista de permisos o quítalos de la distribución.",
  },
  "Não é possível salvar. Sem lista própria, a origem segue as permissões do grupo, e este usuário que recebe negócios por distribuição não está nelas: {usuarios}. Remova-o da distribuição ou mantenha uma lista própria que o inclua.": {
    es: "No es posible guardar. Sin lista propia, el origen sigue los permisos del grupo, y este usuario que recibe negocios por distribución no está en ellos: {usuarios}. Quítalo de la distribución o mantén una lista propia que lo incluya.",
  },
  "Não é possível salvar. Sem lista própria, a origem segue as permissões do grupo, e estes usuários que recebem negócios por distribuição não estão nelas: {usuarios}. Remova-os da distribuição ou mantenha uma lista própria que os inclua.": {
    es: "No es posible guardar. Sin lista propia, el origen sigue los permisos del grupo, y estos usuarios que reciben negocios por distribución no están en ellos: {usuarios}. Quítalos de la distribución o mantén una lista propia que los incluya.",
  },
  Atualizado: { es: "Actualizado" },
  "Histórico de alterações": { es: "Historial de cambios" },
  "Nenhuma alteração registrada ainda.": { es: "Todavía no hay cambios registrados." },
  "Versão atual": { es: "Versión actual" },
  "Versão anterior": { es: "Versión anterior" },
  "Usuário desconhecido": { es: "Usuario desconocido" },
  "Não consegui ler o histórico.": { es: "No pude leer el historial." },
  "Percentual de {nome} alterado de {de}% para {para}%": { es: "Porcentaje de {nome} cambiado de {de}% a {para}%" },
  "{nome} entrou na distribuição com {percentual}%": { es: "{nome} entró en la distribución con {percentual}%" },
  "{nome} saiu da distribuição": { es: "{nome} salió de la distribución" },
  "Contagem de negócios reiniciada": { es: "Conteo de negocios reiniciado" },
  "Ver distribuições de {nome}": { es: "Ver distribuciones de {nome}" },
  "Histórico de distribuições": { es: "Historial de distribuciones" },
  "Origem: {origem}": { es: "Origen: {origem}" },
  "Buscar por contato ou empresa": { es: "Buscar por contacto o empresa" },
  "Todos os usuários": { es: "Todos los usuarios" },
  Período: { es: "Período" },
  "Todo o período": { es: "Todo el período" },
  "Últimos 7 dias": { es: "Últimos 7 días" },
  "Últimos 30 dias": { es: "Últimos 30 días" },
  Negócio: { es: "Negocio" },
  "Distribuído para": { es: "Distribuido a" },
  Removido: { es: "Quitado" },
  "Nenhuma distribuição encontrada para os filtros selecionados.": {
    es: "No se encontró ninguna distribución para los filtros seleccionados.",
  },
  "Limpar filtros": { es: "Limpiar filtros" },
  "Mostrando {de}–{ate} de {total} negócio atribuído": { es: "Mostrando {de}–{ate} de {total} negocio asignado" },
  "Mostrando {de}–{ate} de {total} negócios atribuídos": { es: "Mostrando {de}–{ate} de {total} negocios asignados" },
  Não: { es: "No" },
  Sim: { es: "Sí" },
```

Rode `corepack pnpm vitest run $(ls tests/unit | grep -E "i18n-espanhol-cobre-a-tela|escale-espanhol-registro-tu|dicionario" | sed 's#^#tests/unit/#')`. Expected: PASS; se a cerca apontar texto sem espanhol, acrescente-o no bloco.

- [ ] **Step 2: A rodada cheia (em segundo plano)**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck && corepack pnpm lint
corepack pnpm test:unit > /tmp/1k-a-unit.txt 2>&1; tail -30 /tmp/1k-a-unit.txt
corepack pnpm test:db > /tmp/1k-a-db.txt 2>&1; tail -30 /tmp/1k-a-db.txt
```
Compare os arquivos que falharam com `.superpowers/sdd/falhas-conhecidas.txt`. Falha nova: rode o arquivo sozinho; se falhar sozinho, é regressão — corrija antes do PR.

- [ ] **Step 3: A conferência visual (no fim do PR)**

Depois do deploy de teste que o usuário fizer, ou na revisão do PR, compare a subaba com o print 028 e a janela com o F01, e escreva no PR a lista do que ficou diferente (no mínimo: N14; as iniciais numa cor só; a gaveta e a janela do contador sem print).

- [ ] **Step 4: O PRD**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`:
- na seção 8, na linha da 1K, a coluna "Estado" vira `PR A aberto (distribuição); PR B e PR C a seguir`;
- na seção 10, a pergunta 9 ganha a resposta: `**Respondida em 18/10:** a distribuição vale para todo negócio que nasce sem dono e sem pessoa que o criou (captação, automação, API, agente e conversa nova); a carteira do cliente vem antes; o rodízio de conversas continua dando a conversa, mas não adota mais esses negócios (já nascem com dono).`

- [ ] **Step 5: Commit e PR A**

```bash
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol da distribuição de dono (Fase 1K, PR A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git fetch escale-crm && git rebase escale-crm/main
git push -u escale-crm feat/fase-1k-distribuicao
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-1k-distribuicao \
  --title "Fase 1K (PR A): distribuição de dono por origem" \
  --body "$(cat <<'EOF'
## O que muda
- Subaba "Distribuição de dono" da origem (só admin), igual à Clint: tabela com percentual e contador, "Adicionar usuário", lixeira com confirmação, "Resetar distribuição", "Reiniciar a contagem de negócios ao salvar", o relógio (histórico de alterações) e o contador (histórico de distribuições).
- Negócio que nasce sem dono e sem pessoa que o criou (captação, automação, API, agente, conversa nova) ganha dono pelo rodízio ponderado da origem; a carteira do cliente vem antes. Sai `lead.assigned` (push "Lead atribuído a você").
- A lista de pessoas da origem (1J) não salva se deixar de fora quem recebe por distribuição.
- Migration 9013 (três tabelas, funções definer só para o service role, dois gatilhos).

## Como testar
- `pnpm vitest run tests/unit/escale-distribuicao-*.test.ts* tests/unit/escale-secao-distribuicao.test.tsx tests/unit/escale-historicos-da-distribuicao.test.tsx`
- `pnpm test:db` (prova `tests/invariants/escale-distribuicao-de-dono.test.ts`)

## Diferenças conhecidas da Clint
(lista da conferência visual)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: a URL do PR. **Pare aqui** e avise o usuário: o PR B nasce depois do merge do A.

---

# PR B — Atribuição de ganho

### Task 8: Branch do PR B, as regras puras do ganho e a recusa do banco

**Files:**
- Create: `lib/escale/ganho/regras.ts`, `lib/escale/ganho/recusa.ts`, `tests/unit/escale-ganho-regras.test.ts`

**Interfaces:**
- Consumes: `TIPOS_DE_ATIVIDADE`, `TipoDeAtividade` (`@/lib/escale/playbook/regras`, 1I); `normalizarTag` (`@/lib/contacts/tag-normalizada`); `traduzir`, `IDIOMA_PADRAO`, `Idioma`.
- Produces:
  - `CHAVE_DO_SO_ADMIN = "escale_so_admin_ganha"`, `CHAVE_DA_ATRIBUICAO = "escale_atribuicao_de_ganho"`, `CONDICOES_MAX = 20`, `VEZES_MAX = 999`, `TIPOS_NA_ATRIBUICAO`;
  - `CondicaoDeGanho`, `AtribuicaoDeGanho { operador: "e" | "ou"; condicoes }`, `CondicaoNaTela`, `AtribuicaoNaTela { soAdmin; operador; condicoes }`, `CONDICAO_VAZIA`;
  - `soAdminGanha(settings): boolean`, `lerAtribuicao(settings): AtribuicaoDeGanho`, `atribuicaoDaTela({ soAdminGanha, atribuicao }): AtribuicaoNaTela`, `atribuicaoSchema`, `PatchDaAtribuicao`, `patchDaAtribuicao(tela)`, `gravarAtribuicao(settings, patch)`, `podeMarcarGanho({ papel, soAdmin }): boolean`, `frasesDasRegras(regras): Array<{ modelo: string; valores: Record<string, string> }>`;
  - `MENSAGEM_DO_GANHO_BLOQUEADO`, `recusaDoGanhoPeloBanco(erro, idioma): { codigo: "forbidden"; mensagem: string } | null`.

- [ ] **Step 1: A branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-1k"
git status --porcelain    # Expected: vazio.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:supabase/migrations/20261028120000_9013_distribuicao_de_dono.sql && echo "PR A ok"
git switch -c feat/fase-1k-ganho escale-crm/main
corepack pnpm install --frozen-lockfile
```
Expected: `PR A ok`. Senão, PARE (o PR A ainda não foi mergeado).

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-ganho-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { MENSAGEM_DO_GANHO_BLOQUEADO, recusaDoGanhoPeloBanco } from "@/lib/escale/ganho/recusa";
import {
  CONDICAO_VAZIA,
  TIPOS_NA_ATRIBUICAO,
  atribuicaoDaTela,
  frasesDasRegras,
  gravarAtribuicao,
  lerAtribuicao,
  patchDaAtribuicao,
  podeMarcarGanho,
  soAdminGanha,
} from "@/lib/escale/ganho/regras";

describe("leitura tolerante", () => {
  it("lixo vira 'sem regra'; só condições completas passam; operador padrão 'e'", () => {
    expect(lerAtribuicao(null)).toEqual({ operador: "e", condicoes: [] });
    expect(
      lerAtribuicao({
        escale_atribuicao_de_ganho: {
          operador: "ou",
          condicoes: [
            { tipo: "atividade", vezes: 2, atividade: "ligacao" },
            { tipo: "atividade", vezes: 0, atividade: "email" },
            { tipo: "atividade", vezes: 1, atividade: "fax" },
            { tipo: "tag", tag: "  VIP " },
            { tipo: "tag", tag: "" },
          ],
        },
      }),
    ).toEqual({
      operador: "ou",
      condicoes: [
        { tipo: "atividade", vezes: 2, atividade: "ligacao" },
        { tipo: "tag", tag: "vip" },
      ],
    });
  });

  it("só admin: só o true conta", () => {
    expect(soAdminGanha({ escale_so_admin_ganha: true })).toBe(true);
    expect(soAdminGanha({ escale_so_admin_ganha: "true" })).toBe(false);
    expect(soAdminGanha({})).toBe(false);
  });
});

describe("a tela", () => {
  it("sem regra gravada, mostra uma linha vazia (como a Clint)", () => {
    expect(atribuicaoDaTela({ soAdminGanha: false, atribuicao: { operador: "e", condicoes: [] } })).toEqual({
      soAdmin: false,
      operador: "e",
      condicoes: [CONDICAO_VAZIA],
    });
  });

  it("a lista dos tipos na ordem e com os rótulos do print 027", () => {
    expect(TIPOS_NA_ATRIBUICAO.map((x) => x.rotulo)).toEqual([
      "Ligação", "Email", "Agendamento", "Tarefa", "Reunião", "Whatsapp", "Instagram",
    ]);
  });

  it("o patch tira a condição sem tipo e a tag vazia; número fora da faixa trava", () => {
    expect(
      patchDaAtribuicao({
        soAdmin: true,
        operador: "ou",
        condicoes: [CONDICAO_VAZIA, { tipo: "atividade", vezes: "3", atividade: "whatsapp" }, { tipo: "tag", tag: " " }],
      }),
    ).toEqual({
      ok: true,
      patch: { so_admin: true, operador: "ou", condicoes: [{ tipo: "atividade", vezes: 3, atividade: "whatsapp" }] },
    });
    expect(
      patchDaAtribuicao({ soAdmin: false, operador: "e", condicoes: [{ tipo: "atividade", vezes: "0", atividade: "email" }] }),
    ).toEqual({ ok: false, erro: "Informe quantas vezes, de 1 a 999." });
  });

  it("gravar: o true entra, o false some; sem condição a chave some; o resto do settings fica", () => {
    expect(
      gravarAtribuicao({ fields: [], escale_so_admin_ganha: true }, { so_admin: false, operador: "e", condicoes: [] }),
    ).toEqual({ fields: [] });
    expect(
      gravarAtribuicao({}, { so_admin: true, operador: "ou", condicoes: [{ tipo: "tag", tag: "vip" }] }),
    ).toEqual({
      escale_so_admin_ganha: true,
      escale_atribuicao_de_ganho: { operador: "ou", condicoes: [{ tipo: "tag", tag: "vip" }] },
    });
  });
});

describe("quem ganha e as frases", () => {
  it("podeMarcarGanho: sem a trava todos; com a trava só admin", () => {
    expect(podeMarcarGanho({ papel: "agent", soAdmin: false })).toBe(true);
    expect(podeMarcarGanho({ papel: "manager", soAdmin: true })).toBe(false);
    expect(podeMarcarGanho({ papel: "admin", soAdmin: true })).toBe(true);
  });

  it("as frases da janela do negócio ganho", () => {
    expect(
      frasesDasRegras({ operador: "e", condicoes: [{ tipo: "atividade", vezes: 2, atividade: "ligacao" }, { tipo: "tag", tag: "vip" }] }),
    ).toEqual([
      { modelo: "Ter realizado {n} vezes a atividade do tipo {tipo}", valores: { n: "2", tipo: "Ligação" } },
      { modelo: "Possuir a tag {tag}", valores: { tag: "vip" } },
    ]);
  });

  it("a recusa do banco vira o texto da Clint; o resto não é dela", () => {
    expect(recusaDoGanhoPeloBanco({ code: "PT403", message: "so_administrador_marca_ganho" }, "pt-BR")).toEqual({
      codigo: "forbidden",
      mensagem: MENSAGEM_DO_GANHO_BLOQUEADO,
    });
    expect(recusaDoGanhoPeloBanco({ code: "PT403", message: "outra_coisa" }, "pt-BR")).toBeNull();
    expect(recusaDoGanhoPeloBanco({ code: "23514", message: "x" }, "pt-BR")).toBeNull();
    expect(recusaDoGanhoPeloBanco(null, "pt-BR")).toBeNull();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-ganho-regras.test.ts`
Expected: FAIL.

- [ ] **Step 3: As regras**

Create `lib/escale/ganho/regras.ts`:

```ts
/**
 * A ATRIBUIÇÃO DE GANHO DA ORIGEM (fork Escale, Fase 1K, D14; código `Ks` da Clint).
 *
 * Duas chaves no `settings` da origem: `escale_so_admin_ganha` (a caixa
 * "Atribuição de ganho pelo sistema": só o admin põe o negócio em Ganho; o
 * banco aplica, N15) e `escale_atribuicao_de_ganho` (as regras que escolhem
 * quem leva o crédito do ganho, N17). Leitura tolerante: lixo vira "sem regra".
 */
import { z } from "zod";

import type { Role } from "@/lib/auth/types";
import { normalizarTag } from "@/lib/contacts/tag-normalizada";
import { TIPOS_DE_ATIVIDADE, type TipoDeAtividade } from "@/lib/escale/playbook/regras";

/** Cópia local do `comoRecord` de `configuracoes/tipos.ts`: `tipos.ts` importa este arquivo (sem ciclo). */
function comoRecord(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

export const CHAVE_DO_SO_ADMIN = "escale_so_admin_ganha";
export const CHAVE_DA_ATRIBUICAO = "escale_atribuicao_de_ganho";
export const CONDICOES_MAX = 20;
export const VEZES_MAX = 999;

/** A lista da Clint (print 027): a ordem e os rótulos dela; os valores da 1I (N20). */
export const TIPOS_NA_ATRIBUICAO: ReadonlyArray<{ valor: TipoDeAtividade; rotulo: string }> = [
  { valor: "ligacao", rotulo: "Ligação" },
  { valor: "email", rotulo: "Email" },
  { valor: "agendamento", rotulo: "Agendamento" },
  { valor: "tarefa", rotulo: "Tarefa" },
  { valor: "reuniao", rotulo: "Reunião" },
  { valor: "whatsapp", rotulo: "Whatsapp" },
  { valor: "instagram", rotulo: "Instagram" },
];

export type CondicaoDeGanho =
  | { tipo: "atividade"; vezes: number; atividade: TipoDeAtividade }
  | { tipo: "tag"; tag: string };
export interface AtribuicaoDeGanho {
  operador: "e" | "ou";
  condicoes: CondicaoDeGanho[];
}

/** Na tela, o número é o texto do campo e o tipo pode estar vazio. */
export type CondicaoNaTela =
  | { tipo: "atividade"; vezes: string; atividade: TipoDeAtividade | "" }
  | { tipo: "tag"; tag: string };
export interface AtribuicaoNaTela {
  soAdmin: boolean;
  operador: "e" | "ou";
  condicoes: CondicaoNaTela[];
}

/** A linha que a Clint mostra numa origem sem regra (`won_attribution` padrão). */
export const CONDICAO_VAZIA: CondicaoNaTela = { tipo: "atividade", vezes: "1", atividade: "" };

export function soAdminGanha(settings: unknown): boolean {
  return comoRecord(settings)[CHAVE_DO_SO_ADMIN] === true;
}

function condicaoLida(bruta: unknown): CondicaoDeGanho | null {
  const c = comoRecord(bruta);
  if (
    c.tipo === "atividade" &&
    (TIPOS_DE_ATIVIDADE as readonly unknown[]).includes(c.atividade) &&
    Number.isInteger(c.vezes) &&
    (c.vezes as number) >= 1 &&
    (c.vezes as number) <= VEZES_MAX
  ) {
    return { tipo: "atividade", vezes: c.vezes as number, atividade: c.atividade as TipoDeAtividade };
  }
  if (c.tipo === "tag" && typeof c.tag === "string") {
    const tag = normalizarTag(c.tag);
    return tag ? { tipo: "tag", tag } : null;
  }
  return null;
}

export function lerAtribuicao(settings: unknown): AtribuicaoDeGanho {
  const bruta = comoRecord(comoRecord(settings)[CHAVE_DA_ATRIBUICAO]);
  const lista = Array.isArray(bruta.condicoes) ? bruta.condicoes : [];
  return {
    operador: bruta.operador === "ou" ? "ou" : "e",
    condicoes: lista
      .map(condicaoLida)
      .filter((c): c is CondicaoDeGanho => c !== null)
      .slice(0, CONDICOES_MAX),
  };
}

export function atribuicaoDaTela(fork: {
  soAdminGanha: boolean;
  atribuicao: AtribuicaoDeGanho;
}): AtribuicaoNaTela {
  const condicoes: CondicaoNaTela[] = fork.atribuicao.condicoes.map((c) =>
    c.tipo === "atividade" ? { tipo: "atividade", vezes: String(c.vezes), atividade: c.atividade } : c,
  );
  return {
    soAdmin: fork.soAdminGanha,
    operador: fork.atribuicao.operador,
    condicoes: condicoes.length > 0 ? condicoes : [CONDICAO_VAZIA],
  };
}

export const atribuicaoSchema = z
  .object({
    so_admin: z.boolean(),
    operador: z.enum(["e", "ou"]),
    condicoes: z
      .array(
        z.discriminatedUnion("tipo", [
          z
            .object({
              tipo: z.literal("atividade"),
              vezes: z.number().int().min(1).max(VEZES_MAX),
              atividade: z.enum(TIPOS_DE_ATIVIDADE),
            })
            .strict(),
          z.object({ tipo: z.literal("tag"), tag: z.string().min(1).max(80) }).strict(),
        ]),
      )
      .max(CONDICOES_MAX),
  })
  .strict();
export type PatchDaAtribuicao = z.infer<typeof atribuicaoSchema>;

/** Da tela para o PATCH: condição sem tipo e tag vazia não vão (N20); número fora da faixa trava. */
export function patchDaAtribuicao(
  tela: AtribuicaoNaTela,
): { ok: true; patch: PatchDaAtribuicao } | { ok: false; erro: string } {
  const condicoes: PatchDaAtribuicao["condicoes"] = [];
  for (const c of tela.condicoes) {
    if (c.tipo === "tag") {
      const tag = normalizarTag(c.tag);
      if (tag) condicoes.push({ tipo: "tag", tag });
      continue;
    }
    if (!c.atividade) continue;
    const vezes = Number(c.vezes.trim());
    if (!Number.isInteger(vezes) || vezes < 1 || vezes > VEZES_MAX) {
      return { ok: false, erro: "Informe quantas vezes, de 1 a 999." };
    }
    condicoes.push({ tipo: "atividade", vezes, atividade: c.atividade });
  }
  return { ok: true, patch: { so_admin: tela.soAdmin, operador: tela.operador, condicoes } };
}

/** O `settings` com as duas chaves: o true entra, o false some; sem condição, a regra some. */
export function gravarAtribuicao(
  settings: Record<string, unknown>,
  p: PatchDaAtribuicao,
): Record<string, unknown> {
  const { [CHAVE_DO_SO_ADMIN]: _so, [CHAVE_DA_ATRIBUICAO]: _regra, ...resto } = settings;
  return {
    ...resto,
    ...(p.so_admin ? { [CHAVE_DO_SO_ADMIN]: true } : {}),
    ...(p.condicoes.length > 0
      ? {
          [CHAVE_DA_ATRIBUICAO]: {
            operador: p.operador,
            condicoes: p.condicoes.map((c) => (c.tipo === "tag" ? { tipo: "tag", tag: normalizarTag(c.tag) } : c)),
          },
        }
      : {}),
  };
}

/** Quem pode pôr o negócio em Ganho nesta origem (Clint `canWinDeal`). */
export function podeMarcarGanho({
  papel,
  soAdmin,
}: {
  papel: Role | string | null | undefined;
  soAdmin: boolean;
}): boolean {
  return !soAdmin || papel === "admin";
}

/** As frases da janela "Atribuição de ganho" (Clint DealWonModal). Quem mostra passa o modelo por `t()` e troca os marcadores. */
export function frasesDasRegras(
  regras: AtribuicaoDeGanho,
): Array<{ modelo: string; valores: Record<string, string> }> {
  return regras.condicoes.map((c) =>
    c.tipo === "atividade"
      ? {
          modelo: "Ter realizado {n} vezes a atividade do tipo {tipo}",
          valores: {
            n: String(c.vezes),
            tipo: TIPOS_NA_ATRIBUICAO.find((x) => x.valor === c.atividade)?.rotulo ?? c.atividade,
          },
        }
      : { modelo: "Possuir a tag {tag}", valores: { tag: c.tag } },
  );
}
```

O eslint pode reclamar de `_so` e `_regra` sem uso; se reclamar, troque a desestruturação por `const resto = { ...settings }; delete resto[CHAVE_DO_SO_ADMIN]; delete resto[CHAVE_DA_ATRIBUICAO];` (cópia local, o original não muda).

Create `lib/escale/ganho/recusa.ts`:

```ts
import { traduzir } from "@/lib/i18n/dicionario";
import { IDIOMA_PADRAO, type Idioma } from "@/lib/i18n/idiomas";

/** O texto da Clint (`component.Deal.noPermissionToWin`). */
export const MENSAGEM_DO_GANHO_BLOQUEADO = "Você não possui permissão para dar ganho neste negócio.";

/**
 * A recusa do gatilho `trg_escale_so_admin_marca_ganho` (migration 9014, N15)
 * vira recusa de negócio (403 com o texto da Clint), nunca 500. Reconhece pelo
 * código E pela marca (`PT403` + `so_administrador_marca_ganho`).
 */
export function recusaDoGanhoPeloBanco(
  erro: { code?: string | null; message?: string | null } | null | undefined,
  idioma?: Idioma | null,
): { codigo: "forbidden"; mensagem: string } | null {
  if (erro?.code !== "PT403" || !(erro.message ?? "").includes("so_administrador_marca_ganho")) return null;
  return { codigo: "forbidden", mensagem: traduzir(MENSAGEM_DO_GANHO_BLOQUEADO, idioma ?? IDIOMA_PADRAO) };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ganho-regras.test.ts && corepack pnpm eslint lib/escale/ganho`
Expected: PASS, limpo.

- [ ] **Step 5: Commit**

```bash
corepack pnpm prettier --write lib/escale/ganho tests/unit/escale-ganho-regras.test.ts
git add lib/escale/ganho tests/unit/escale-ganho-regras.test.ts
git commit -m "feat(escale): regras puras da atribuição de ganho (Fase 1K, D14)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: A migration 9014, o baseline, a forma e a prova no Postgres

**Files:**
- Create: `supabase/migrations/20261029120000_9014_atribuicao_de_ganho.sql`, `tests/unit/escale-ganho-migration.test.ts`, `tests/invariants/escale-atribuicao-de-ganho.test.ts`
- Modify: `supabase/baseline.sql`, `tests/invariants/rls-completude-varredura.test.ts`

**Interfaces:**
- Consumes: `crm_atividades_do_negocio (lead_id, tipo, concluida_por, concluida_em)` (9009); `contacts.tags`; `fn_user_role_in_org(uuid)`; `trg_crm_lead_close_on_stage` (põe `status` antes).
- Produces: gatilhos `trg_escale_so_admin_marca_ganho` (BEFORE UPDATE) e `trg_escale_so_admin_marca_ganho_ao_criar` (BEFORE INSERT), com `PT403 so_administrador_marca_ganho`; tabela `crm_ganho_do_negocio (lead_id PK, organization_id, creditado_a, ganho_em, pela_regra, regras, marcado_por, corrigido_por, corrigido_em, created_at)`; função `fn_escale_credito_do_ganho(uuid) → table(o_creditado_a uuid, o_pela_regra boolean, o_regras jsonb)`; gatilhos `trg_escale_registra_o_ganho` (AFTER UPDATE) e `trg_escale_registra_o_ganho_ao_criar` (AFTER INSERT); `fn_escale_corrigir_ganho(p_org uuid, p_lead uuid, p_autor uuid, p_creditado_a uuid, p_ganho_em timestamptz)` (só `service_role`; erros `22023 data_invalida`, `PT422 pessoa_invalida`, `PT404 ganho_nao_encontrado`).

- [ ] **Step 1: Conferir o número**

```bash
bash scripts/checar-colisao-de-migration.sh escale-crm/main
ls supabase/migrations | grep -E "_90[0-9]{2}_" | tail -2
```
Expected: sem colisão; a última 90xx é a 9013.

- [ ] **Step 2: O teste de forma (vai falhar)**

Create `tests/unit/escale-ganho-migration.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/** FORK ESCALE · Fase 1K (D14): a forma da migration 9014. A prova é `tests/invariants/escale-atribuicao-de-ganho.test.ts`. */
const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20261029120000_9014_atribuicao_de_ganho.sql"),
  "utf8",
);
const BASELINE = readFileSync(join(process.cwd(), "supabase/baseline.sql"), "utf8");

const FUNCOES = [
  "fn_escale_so_admin_marca_ganho()",
  "fn_escale_credito_do_ganho(uuid)",
  "fn_escale_registra_o_ganho()",
  "fn_escale_corrigir_ganho(uuid, uuid, uuid, uuid, timestamptz)",
];

describe("migration 9014 — atribuição de ganho", () => {
  it("abre com o manifesto e cria a tabela com RLS e só a leitura", () => {
    expect(MIGRATION.startsWith("-- manifest: **Atribuição de ganho por origem")).toBe(true);
    expect(MIGRATION).toContain("create table if not exists public.crm_ganho_do_negocio (");
    expect(MIGRATION).toContain("alter table public.crm_ganho_do_negocio enable row level security;");
    expect(MIGRATION).toContain("create policy crm_ganho_do_negocio_select on public.crm_ganho_do_negocio");
    expect(MIGRATION).not.toMatch(/for (insert|update|delete|all) to authenticated/);
  });

  it("toda função é definer, com search_path, fechada; só a correção abre ao service_role", () => {
    for (const f of FUNCOES) {
      expect(MIGRATION).toContain(`revoke all on function public.${f} from public, anon, authenticated;`);
    }
    expect(MIGRATION.match(/security definer\s+set search_path = public, pg_temp/g)?.length).toBe(FUNCOES.length);
    expect(MIGRATION).toContain(
      "grant execute on function public.fn_escale_corrigir_ganho(uuid, uuid, uuid, uuid, timestamptz) to service_role;",
    );
    expect(MIGRATION).not.toMatch(/grant execute on function [^;]+ to [^;]*authenticated/);
  });

  it("a trava roda depois de trg_crm_lead_close_on_stage (que põe o status) e só quando vira ganho", () => {
    expect(["trg_crm_lead_close_on_stage", "trg_escale_so_admin_marca_ganho"].sort()[0]).toBe("trg_crm_lead_close_on_stage");
    expect(MIGRATION).toContain("when (new.status = 'won' and old.status is distinct from 'won')");
    expect(MIGRATION).toContain("errcode = 'PT403'");
  });

  it("o baseline traz o bloco idêntico, antes da âncora", () => {
    const bloco = `-- ---- FORK ESCALE · atribuição de ganho (migration 9014) ----\n${MIGRATION}`;
    expect(BASELINE).toContain(bloco);
    expect(BASELINE.indexOf(bloco)).toBeLessThan(
      BASELINE.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----"),
    );
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-ganho-migration.test.ts`
Expected: FAIL.

- [ ] **Step 3: A migration**

Create `supabase/migrations/20261029120000_9014_atribuicao_de_ganho.sql`:

```sql
-- manifest: **Atribuição de ganho por origem (fork Escale, Fase 1K, D14).** "Atribuição de ganho pelo sistema": com `crm_pipelines.settings.escale_so_admin_ganha = true`, `trg_escale_so_admin_marca_ganho` (BEFORE INSERT e BEFORE UPDATE em `crm_leads`, só quando o negócio vira ganho) recusa com `PT403 so_administrador_marca_ganho` quem tem sessão e não é administrador; automação, agente de IA, integração e MCP (sem sessão) seguem ganhando. Crédito do ganho: tabela nova `crm_ganho_do_negocio` (uma linha por negócio ganho, lida por quem vê o negócio, escrita só pelo gatilho e pela correção), preenchida por `trg_escale_registra_o_ganho` com `fn_escale_credito_do_ganho`, que aplica as regras da origem (`escale_atribuicao_de_ganho`: ter concluído N atividades de um tipo, ou o contato ter uma tag, com E/OU) sobre `crm_atividades_do_negocio` (9009): o dono se cumprir; senão quem cumpriu com mais atividades concluídas no negócio; ninguém, o dono. Sair de ganho apaga a linha. `fn_escale_corrigir_ganho` (só service_role) troca a pessoa e a data e grava quem corrigiu. Falhar ao creditar vira aviso e não derruba o ganho.
-- 9014: atribuição de ganho (fork Escale).

-- ── SÓ O ADMINISTRADOR MARCA GANHO ─────────────────────────────────────────
-- Roda depois de `trg_crm_lead_close_on_stage` (ordem alfabética dos BEFORE),
-- que é quem põe `status = 'won'` ao entrar na etapa de ganho; o WHEN vê o
-- `new` já com o status. Sem sessão (`auth.uid()` nulo: automação, IA,
-- integração, MCP) passa: é a "atribuição de ganho pelo sistema" (Q3). Com
-- sessão, só o papel admin (`fn_user_role_in_org` conta a sessão de suporte
-- completa como admin).
create or replace function public.fn_escale_so_admin_marca_ganho()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if auth.uid() is null then
    return new;
  end if;
  if not exists (
    select 1 from public.crm_pipelines p
     where p.id = new.pipeline_id
       and p.organization_id = new.organization_id
       and p.settings -> 'escale_so_admin_ganha' = 'true'::jsonb
  ) then
    return new;
  end if;
  if coalesce(public.fn_user_role_in_org(new.organization_id), '') = 'admin' then
    return new;
  end if;
  raise exception 'so_administrador_marca_ganho' using errcode = 'PT403';
end
$fn$;

revoke all on function public.fn_escale_so_admin_marca_ganho() from public, anon, authenticated;

drop trigger if exists trg_escale_so_admin_marca_ganho on public.crm_leads;
create trigger trg_escale_so_admin_marca_ganho
  before update on public.crm_leads
  for each row
  when (new.status = 'won' and old.status is distinct from 'won')
  execute function public.fn_escale_so_admin_marca_ganho();

drop trigger if exists trg_escale_so_admin_marca_ganho_ao_criar on public.crm_leads;
create trigger trg_escale_so_admin_marca_ganho_ao_criar
  before insert on public.crm_leads
  for each row
  when (new.status = 'won')
  execute function public.fn_escale_so_admin_marca_ganho();

-- ── O CRÉDITO DO GANHO ─────────────────────────────────────────────────────
create table if not exists public.crm_ganho_do_negocio (
  lead_id uuid primary key references public.crm_leads(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  creditado_a uuid references auth.users(id) on delete set null,
  ganho_em timestamptz not null,
  pela_regra boolean not null default false,
  regras jsonb,
  marcado_por uuid references auth.users(id) on delete set null,
  corrigido_por uuid references auth.users(id) on delete set null,
  corrigido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_crm_ganho_do_negocio_org
  on public.crm_ganho_do_negocio (organization_id, creditado_a);

-- Lê quem vê o negócio (a RLS de `crm_leads`, com o acesso por origem da 9010,
-- vale dentro do EXISTS). Escrita: nenhuma policy.
alter table public.crm_ganho_do_negocio enable row level security;
drop policy if exists crm_ganho_do_negocio_select on public.crm_ganho_do_negocio;
create policy crm_ganho_do_negocio_select on public.crm_ganho_do_negocio
  for select to authenticated
  using (
    exists (
      select 1 from public.crm_leads l
       where l.id = crm_ganho_do_negocio.lead_id
         and l.organization_id = crm_ganho_do_negocio.organization_id
    )
  );

-- As regras da origem sobre as atividades concluídas no negócio (9009).
-- Condição completa: atividade com tipo da 1I e vezes de 1 a 999; tag não
-- vazia (do CONTATO, vale para todos os candidatos). Candidatos: quem concluiu
-- atividade no negócio e o dono. Cumpre = todas (e) ou alguma (ou). Entre os
-- que cumprem: o dono, se cumprir; senão quem tem mais atividades concluídas no
-- negócio; empate, a conclusão mais recente; empate de novo, o menor id.
-- Ninguém cumpre, ou origem sem regra: o dono, sem regra aplicada.
create or replace function public.fn_escale_credito_do_ganho(p_lead uuid)
returns table (o_creditado_a uuid, o_pela_regra boolean, o_regras jsonb)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_org uuid;
  v_origem uuid;
  v_dono uuid;
  v_contato uuid;
  v_cfg jsonb;
  v_operador text;
  v_conds jsonb;
  v_tags text[];
  v_cond jsonb;
  v_cand uuid;
  v_vale boolean;
  v_todas boolean;
  v_alguma boolean;
  v_total integer;
  v_ultima timestamptz;
  v_melhor uuid;
  v_melhor_total integer := -1;
  v_melhor_ultima timestamptz;
  v_dono_cumpre boolean := false;
begin
  select l.organization_id, l.pipeline_id, l.owner_user_id, l.contact_id
    into v_org, v_origem, v_dono, v_contato
    from public.crm_leads l
   where l.id = p_lead;
  if not found then
    return;
  end if;

  select p.settings -> 'escale_atribuicao_de_ganho' into v_cfg
    from public.crm_pipelines p
   where p.id = v_origem
     and p.organization_id = v_org;
  v_operador := case when v_cfg ->> 'operador' = 'ou' then 'ou' else 'e' end;

  select coalesce(jsonb_agg(c.v order by c.o), '[]'::jsonb) into v_conds
    from jsonb_array_elements(
      case when jsonb_typeof(v_cfg -> 'condicoes') = 'array' then v_cfg -> 'condicoes' else '[]'::jsonb end
    ) with ordinality as c(v, o)
   where (c.v ->> 'tipo' = 'atividade'
          and c.v ->> 'atividade' in ('whatsapp', 'instagram', 'ligacao', 'email', 'agendamento', 'tarefa', 'reuniao')
          and coalesce(c.v ->> 'vezes', '') ~ '^[0-9]{1,3}$'
          and (c.v ->> 'vezes')::integer >= 1)
      or (c.v ->> 'tipo' = 'tag' and coalesce(btrim(c.v ->> 'tag'), '') <> '');

  if jsonb_array_length(v_conds) = 0 then
    return query select v_dono, false, null::jsonb;
    return;
  end if;

  select coalesce(ct.tags, '{}'::text[]) into v_tags
    from public.contacts ct
   where ct.id = v_contato
     and ct.organization_id = v_org;
  v_tags := coalesce(v_tags, '{}'::text[]);

  for v_cand in
    select x.quem from (
      select distinct a.concluida_por as quem
        from public.crm_atividades_do_negocio a
       where a.lead_id = p_lead
         and a.concluida_por is not null
         and a.concluida_em is not null
      union
      select v_dono where v_dono is not null
    ) x
    order by x.quem
  loop
    v_todas := true;
    v_alguma := false;
    for v_cond in select e.value from jsonb_array_elements(v_conds) as e loop
      if v_cond ->> 'tipo' = 'tag' then
        v_vale := exists (
          select 1 from unnest(v_tags) as t(tag)
           where left(lower(btrim(t.tag, E' \t\r\n\f\x0b')), 40)
               = left(lower(btrim(v_cond ->> 'tag', E' \t\r\n\f\x0b')), 40)
        );
      else
        select count(*) >= (v_cond ->> 'vezes')::integer into v_vale
          from public.crm_atividades_do_negocio a
         where a.lead_id = p_lead
           and a.concluida_por = v_cand
           and a.concluida_em is not null
           and a.tipo = v_cond ->> 'atividade';
      end if;
      v_todas := v_todas and v_vale;
      v_alguma := v_alguma or v_vale;
    end loop;

    continue when not (case when v_operador = 'ou' then v_alguma else v_todas end);
    if v_cand = v_dono then
      v_dono_cumpre := true;
    end if;
    select count(*), max(a.concluida_em) into v_total, v_ultima
      from public.crm_atividades_do_negocio a
     where a.lead_id = p_lead
       and a.concluida_por = v_cand
       and a.concluida_em is not null;
    if v_total > v_melhor_total
       or (v_total = v_melhor_total and v_ultima is not null
           and (v_melhor_ultima is null or v_ultima > v_melhor_ultima)) then
      v_melhor := v_cand;
      v_melhor_total := v_total;
      v_melhor_ultima := v_ultima;
    end if;
  end loop;

  if v_dono_cumpre then
    return query select v_dono, true, jsonb_build_object('operador', v_operador, 'condicoes', v_conds);
  elsif v_melhor is not null then
    return query select v_melhor, true, jsonb_build_object('operador', v_operador, 'condicoes', v_conds);
  else
    return query select v_dono, false, null::jsonb;
  end if;
end
$fn$;

revoke all on function public.fn_escale_credito_do_ganho(uuid) from public, anon, authenticated;

-- Vira ganho: grava (ou regrava) o crédito, com quem marcou (nulo = sistema)
-- e a data do fechamento; a correção anterior se perde (é outro ganho). Sai de
-- ganho: apaga. Falhar ao creditar vira aviso e não derruba o ganho.
create or replace function public.fn_escale_registra_o_ganho()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_credito record;
begin
  if new.status = 'won' then
    begin
      select * into v_credito from public.fn_escale_credito_do_ganho(new.id);
      insert into public.crm_ganho_do_negocio
        (lead_id, organization_id, creditado_a, ganho_em, pela_regra, regras, marcado_por)
      values
        (new.id, new.organization_id, v_credito.o_creditado_a, coalesce(new.closed_at, now()),
         coalesce(v_credito.o_pela_regra, false), v_credito.o_regras, auth.uid())
      on conflict (lead_id) do update
        set creditado_a = excluded.creditado_a,
            ganho_em = excluded.ganho_em,
            pela_regra = excluded.pela_regra,
            regras = excluded.regras,
            marcado_por = excluded.marcado_por,
            corrigido_por = null,
            corrigido_em = null;
    exception when others then
      raise warning 'fn_escale_registra_o_ganho: % (%)', sqlerrm, sqlstate;
    end;
  elsif tg_op = 'UPDATE' and old.status = 'won' then
    delete from public.crm_ganho_do_negocio where lead_id = new.id;
  end if;
  return null;
end
$fn$;

revoke all on function public.fn_escale_registra_o_ganho() from public, anon, authenticated;

drop trigger if exists trg_escale_registra_o_ganho on public.crm_leads;
create trigger trg_escale_registra_o_ganho
  after update on public.crm_leads
  for each row
  when (old.status is distinct from new.status)
  execute function public.fn_escale_registra_o_ganho();

drop trigger if exists trg_escale_registra_o_ganho_ao_criar on public.crm_leads;
create trigger trg_escale_registra_o_ganho_ao_criar
  after insert on public.crm_leads
  for each row
  when (new.status = 'won')
  execute function public.fn_escale_registra_o_ganho();

-- ── A CORREÇÃO DO ADMINISTRADOR ────────────────────────────────────────────
-- A rota confere que quem pede é admin e chama com o service role (N18). Não
-- mexe em `crm_leads.closed_at`: as métricas do original seguem pelo
-- fechamento e pelo dono (Q4).
create or replace function public.fn_escale_corrigir_ganho(
  p_org uuid,
  p_lead uuid,
  p_autor uuid,
  p_creditado_a uuid,
  p_ganho_em timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if p_ganho_em is null or p_ganho_em > now() + interval '1 day' then
    raise exception 'data_invalida' using errcode = '22023';
  end if;
  if p_creditado_a is not null and not exists (
    select 1 from public.user_organizations uo
     where uo.user_id = p_creditado_a
       and uo.organization_id = p_org
       and uo.accepted_at is not null
       and uo.revoked_at is null
       and uo.role in ('agent', 'manager', 'admin')
  ) then
    raise exception 'pessoa_invalida' using errcode = 'PT422';
  end if;
  update public.crm_ganho_do_negocio g
     set creditado_a = p_creditado_a,
         ganho_em = p_ganho_em,
         corrigido_por = p_autor,
         corrigido_em = now()
   where g.lead_id = p_lead
     and g.organization_id = p_org
     and exists (
       select 1 from public.crm_leads l
        where l.id = p_lead and l.organization_id = p_org and l.status = 'won'
     );
  if not found then
    raise exception 'ganho_nao_encontrado' using errcode = 'PT404';
  end if;
end
$fn$;

revoke all on function public.fn_escale_corrigir_ganho(uuid, uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.fn_escale_corrigir_ganho(uuid, uuid, uuid, uuid, timestamptz) to service_role;

comment on table public.crm_ganho_do_negocio is
  'Fork Escale (9014): quem leva o crédito de cada negócio ganho, pelas regras da origem; o admin corrige. Lê quem vê o negócio.';

notify pgrst, 'reload schema';
```

- [ ] **Step 4: O baseline**

```bash
node -e '
const fs = require("fs");
const mig = fs.readFileSync("supabase/migrations/20261029120000_9014_atribuicao_de_ganho.sql", "utf8");
const ancora = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const base = fs.readFileSync("supabase/baseline.sql", "utf8");
if (!base.includes(ancora)) throw new Error("âncora sumiu");
const bloco = "-- ---- FORK ESCALE · atribuição de ganho (migration 9014) ----\n" + mig + "\n";
fs.writeFileSync("supabase/baseline.sql", base.replace(ancora, () => bloco + ancora));
'
corepack pnpm vitest run tests/unit/escale-ganho-migration.test.ts $(grep -rlE "baseline\.sql|MANIFEST" tests/unit --include='*.test.ts' | tr '\n' ' ')
```
Expected: PASS.

- [ ] **Step 5: A prova**

Create `tests/invariants/escale-atribuicao-de-ganho.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_AGENT_A, GOV_AGENT_B, GOV_MANAGER, countAs, lastLine, seedGov, sql } from "./gov-helpers";

/**
 * ATRIBUIÇÃO DE GANHO (fork Escale, migration 9014) — prova contra Postgres
 * real. Organização própria (e5ca1e00-9014), regra "todos veem" para a prova
 * da trava não depender da visibilidade. Origem TRAVADA (só admin ganha; regra:
 * 2 ligações) e LIVRE (sem nada). Cada origem com a etapa Novo e a etapa Ganho.
 *
 * Roda via `pnpm test:db`.
 */
const ORG = "e5ca1e00-9014-4000-8000-000000000001";
const P_TRAVADA = "e5ca1e00-9014-4000-8000-000000000011";
const P_LIVRE = "e5ca1e00-9014-4000-8000-000000000012";
const NOVO = (p: string) => p.replace("-0000000000", "-0000000001");
const GANHO = (p: string) => p.replace("-0000000000", "-0000000002");

let seq = 0;
const novoId = () => `e5ca1e00-9014-4000-9000-${String(++seq).padStart(12, "0")}`;
const n = (q: string) => Number(lastLine(sql(q)));
const texto = (q: string) => lastLine(sql(q));

function comoUsuario(userId: string, script: string): string {
  return sql(`
    set role authenticated;
    select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
    ${script}
  `);
}

function negocio(origem: string, dono: string): string {
  const id = novoId();
  sql(`insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, owner_user_id, created_by_user_id)
       values ('${id}', '${ORG}', '${origem}', '${NOVO(origem)}', 'prova 9014', '${dono}', '${dono}');`);
  return id;
}

/** Uma atividade concluída (a forma da 9009: a tarefa em crm_tasks e a linha tipada). */
function concluida(lead: string, quem: string, tipo: string) {
  const tarefa = novoId();
  sql(`insert into public.crm_tasks (id, organization_id, title, status, lead_id, created_by)
         values ('${tarefa}', '${ORG}', 'atividade', 'done', '${lead}', '${quem}');
       insert into public.crm_atividades_do_negocio (tarefa_id, organization_id, lead_id, tipo, concluida_por, concluida_em)
         values ('${tarefa}', '${ORG}', '${lead}', '${tipo}', '${quem}', now());`);
}

const ganhar = (lead: string, origem: string) =>
  `update public.crm_leads set stage_id = '${GANHO(origem)}' where id = '${lead}';`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name, settings)
      values ('${ORG}', 'escale-ganho', 'Escale Ganho Org', 'Escale Ganho', jsonb_build_object('visibility_mode', 'all'))
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values
      ('${GOV_AGENT_A}', '${ORG}', 'agent', now()),
      ('${GOV_AGENT_B}', '${ORG}', 'agent', now()),
      ('${GOV_MANAGER}', '${ORG}', 'manager', now()),
      ('${GOV_ADMIN}', '${ORG}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug, settings) values
      ('${P_TRAVADA}', '${ORG}', 'Travada', 'escale-ganho-travada',
       '{"escale_so_admin_ganha": true, "escale_atribuicao_de_ganho": {"operador": "e", "condicoes": [{"tipo": "atividade", "vezes": 2, "atividade": "ligacao"}]}}'::jsonb),
      ('${P_LIVRE}', '${ORG}', 'Livre', 'escale-ganho-livre', '{}'::jsonb)
      on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position, is_won) values
      ('${NOVO(P_TRAVADA)}', '${ORG}', '${P_TRAVADA}', 'Novo', 'novo', 1000, false),
      ('${GANHO(P_TRAVADA)}', '${ORG}', '${P_TRAVADA}', 'Ganho', 'ganho', 2000, true),
      ('${NOVO(P_LIVRE)}', '${ORG}', '${P_LIVRE}', 'Novo', 'novo', 1000, false),
      ('${GANHO(P_LIVRE)}', '${ORG}', '${P_LIVRE}', 'Ganho', 'ganho', 2000, true)
      on conflict do nothing;
  `);
});

describe("só o administrador marca ganho (N15)", () => {
  it("agente e gerente com sessão são recusados na origem travada; o admin passa", () => {
    const l1 = negocio(P_TRAVADA, GOV_AGENT_A);
    expect(() => comoUsuario(GOV_AGENT_A, ganhar(l1, P_TRAVADA))).toThrow(/so_administrador_marca_ganho/);
    expect(() => comoUsuario(GOV_MANAGER, ganhar(l1, P_TRAVADA))).toThrow(/so_administrador_marca_ganho/);
    comoUsuario(GOV_ADMIN, ganhar(l1, P_TRAVADA));
    expect(texto(`select status from public.crm_leads where id = '${l1}';`)).toBe("won");
  });

  it("sem sessão (automação, IA, integração) passa", () => {
    const l = negocio(P_TRAVADA, GOV_AGENT_A);
    sql(ganhar(l, P_TRAVADA));
    expect(texto(`select status from public.crm_leads where id = '${l}';`)).toBe("won");
  });

  it("a origem livre deixa o agente ganhar", () => {
    const l = negocio(P_LIVRE, GOV_AGENT_A);
    comoUsuario(GOV_AGENT_A, ganhar(l, P_LIVRE));
    expect(texto(`select status from public.crm_leads where id = '${l}';`)).toBe("won");
  });
});

describe("o crédito do ganho (N17)", () => {
  it("quem cumpriu a regra leva o crédito; a regra aplicada fica gravada", () => {
    const l = negocio(P_TRAVADA, GOV_AGENT_A);
    concluida(l, GOV_AGENT_B, "ligacao");
    concluida(l, GOV_AGENT_B, "ligacao");
    sql(ganhar(l, P_TRAVADA));
    expect(texto(`select creditado_a || ':' || pela_regra from public.crm_ganho_do_negocio where lead_id = '${l}';`)).toBe(
      `${GOV_AGENT_B}:true`,
    );
    expect(texto(`select regras->>'operador' from public.crm_ganho_do_negocio where lead_id = '${l}';`)).toBe("e");
  });

  it("o dono que também cumpre ganha de quem fez mais", () => {
    const l = negocio(P_TRAVADA, GOV_AGENT_A);
    concluida(l, GOV_AGENT_A, "ligacao");
    concluida(l, GOV_AGENT_A, "ligacao");
    for (let i = 0; i < 3; i++) concluida(l, GOV_AGENT_B, "ligacao");
    sql(ganhar(l, P_TRAVADA));
    expect(texto(`select creditado_a from public.crm_ganho_do_negocio where lead_id = '${l}';`)).toBe(GOV_AGENT_A);
  });

  it("ninguém cumpre, ou origem sem regra: o dono, sem regra aplicada", () => {
    const semNada = negocio(P_TRAVADA, GOV_AGENT_A);
    concluida(semNada, GOV_AGENT_B, "email");
    sql(ganhar(semNada, P_TRAVADA));
    expect(texto(`select creditado_a || ':' || pela_regra from public.crm_ganho_do_negocio where lead_id = '${semNada}';`)).toBe(
      `${GOV_AGENT_A}:false`,
    );
    const livre = negocio(P_LIVRE, GOV_AGENT_B);
    sql(ganhar(livre, P_LIVRE));
    expect(texto(`select creditado_a from public.crm_ganho_do_negocio where lead_id = '${livre}';`)).toBe(GOV_AGENT_B);
  });

  it("sair de ganho apaga a linha", () => {
    const l = negocio(P_LIVRE, GOV_AGENT_A);
    sql(ganhar(l, P_LIVRE));
    sql(`update public.crm_leads set stage_id = '${NOVO(P_LIVRE)}' where id = '${l}';`);
    expect(n(`select count(*) from public.crm_ganho_do_negocio where lead_id = '${l}';`)).toBe(0);
  });

  it("a correção troca pessoa e data e grava quem corrigiu; só pelo service role", () => {
    const l = negocio(P_LIVRE, GOV_AGENT_A);
    sql(ganhar(l, P_LIVRE));
    sql(`select public.fn_escale_corrigir_ganho('${ORG}', '${l}', '${GOV_ADMIN}', '${GOV_AGENT_B}', now() - interval '1 day');`);
    expect(texto(`select creditado_a || ':' || corrigido_por from public.crm_ganho_do_negocio where lead_id = '${l}';`)).toBe(
      `${GOV_AGENT_B}:${GOV_ADMIN}`,
    );
    expect(() =>
      comoUsuario(GOV_ADMIN, `select public.fn_escale_corrigir_ganho('${ORG}', '${l}', '${GOV_ADMIN}', null, now());`),
    ).toThrow(/permission denied/);
    expect(() =>
      sql(`select public.fn_escale_corrigir_ganho('${ORG}', '${l}', '${GOV_ADMIN}', '${GOV_AGENT_A}', now() + interval '10 days');`),
    ).toThrow(/data_invalida/);
  });

  it("RLS: quem vê o negócio lê o crédito; ninguém com sessão escreve", () => {
    const l = negocio(P_LIVRE, GOV_AGENT_A);
    sql(ganhar(l, P_LIVRE));
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_ganho_do_negocio where lead_id = '${l}'`)).toBe(1);
    comoUsuario(GOV_ADMIN, `update public.crm_ganho_do_negocio set creditado_a = '${GOV_MANAGER}' where lead_id = '${l}';`);
    expect(texto(`select creditado_a from public.crm_ganho_do_negocio where lead_id = '${l}';`)).toBe(GOV_AGENT_A);
  });
});
```

Se a tabela `crm_tasks` tiver outra coluna obrigatória, copie a forma de inserir tarefa da prova da 1I (`grep -ln "crm_atividades_do_negocio" tests/invariants/*.test.ts`).

Em `tests/invariants/rls-completude-varredura.test.ts`, depois das entradas da 9013:

```ts
  {
    tabela: "crm_ganho_do_negocio",
    razao:
      "tests/invariants/escale-atribuicao-de-ganho.test.ts — fork Escale (migration 9014): lê quem vê o negócio (a RLS de crm_leads " +
      "dentro do EXISTS), ninguém com sessão escreve; só o gatilho do ganho e a correção pelo service role gravam.",
  },
```

Run: `corepack pnpm vitest run --config vitest.db.config.ts tests/invariants/escale-atribuicao-de-ganho.test.ts tests/invariants/rls-completude-varredura.test.ts tests/invariants/escale-distribuicao-de-dono.test.ts`
Expected: PASS.

- [ ] **Step 6: Revisor (G1).** `security-reviewer` e `database-reviewer` em paralelo, com a migration e as perguntas: "alguém com sessão e sem ser admin consegue pôr o negócio em ganho numa origem travada por algum caminho (lote em SQL, arquivar etapa, criar já ganho)? a falha do crédito derruba o ganho? a policy deixa ler o crédito de negócio que a pessoa não vê?". Corrija CRITICAL/HIGH na migration e no baseline.

- [ ] **Step 7: Commit**

```bash
corepack pnpm prettier --write tests/unit/escale-ganho-migration.test.ts tests/invariants/escale-atribuicao-de-ganho.test.ts
git add supabase/migrations/20261029120000_9014_atribuicao_de_ganho.sql supabase/baseline.sql tests/unit/escale-ganho-migration.test.ts tests/invariants
git commit -m "feat(escale): migration 9014, só admin marca ganho e crédito do ganho (Fase 1K, D14)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: A seção `atribuicao` da rota e a subaba "Atribuição de ganho"

**Abra antes:** os prints 012 (o alvo) e 027 (a lista aberta).

**Files:**
- Create: `components/escale/configuracoes/SecaoAtribuicao.tsx`, `tests/unit/escale-secao-atribuicao.test.tsx`
- Modify: `lib/escale/configuracoes/tipos.ts`, `gravar.ts`, `rascunho.ts`, `app/api/v1/pipelines/[id]/configuracoes/route.ts`, `components/escale/configuracoes/JanelaDaOrigem.tsx`, `tests/unit/escale-configuracoes-rota.test.ts`, os fixtures (typecheck)

**Interfaces:**
- Consumes: Task 8 (`soAdminGanha`, `lerAtribuicao`, `atribuicaoDaTela`, `atribuicaoSchema`, `patchDaAtribuicao`, `gravarAtribuicao`, `TIPOS_NA_ATRIBUICAO`, `CONDICAO_VAZIA`, `AtribuicaoNaTela`, `CondicaoNaTela`); `useContactTagVocabulary`; `CaixaDaCasca`, `SeletorDaCasca`, `CampoDeTexto`, `CabecaDaSecao`.
- Produces: `ConfiguracoesDoFork.soAdminGanha: boolean`, `ConfiguracoesDoFork.atribuicao: AtribuicaoDeGanho`; seção `atribuicao` no PATCH (`{ so_admin, operador, condicoes }`, só admin); `RascunhoDaOrigem.atribuicao: AtribuicaoNaTela`; `SecaoAtribuicao(props: PropsDaSecao)`.

- [ ] **Step 1: Os testes (vão falhar)**

Em `tests/unit/escale-configuracoes-rota.test.ts`, no `describe("PATCH …")`:

```ts
  it("atribuicao grava as duas chaves (só admin) e audita a seção", async () => {
    authOk("admin");
    const db = banco();
    const res = await PATCH(
      pedido("PATCH", {
        atribuicao: { so_admin: true, operador: "ou", condicoes: [{ tipo: "atividade", vezes: 2, atividade: "ligacao" }] },
      }),
      ctx(PIPE),
    );
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines" && e.tipo === "update");
    expect(escrita?.patch).toEqual({
      settings: {
        ...SETTINGS,
        escale_so_admin_ganha: true,
        escale_atribuicao_de_ganho: { operador: "ou", condicoes: [{ tipo: "atividade", vezes: 2, atividade: "ligacao" }] },
      },
    });
  });

  it("atribuicao é só do administrador (gerente: 403)", async () => {
    banco();
    const res = await PATCH(pedido("PATCH", { atribuicao: { so_admin: true, operador: "e", condicoes: [] } }), ctx(PIPE));
    expect(res.status).toBe(403);
  });
```

Create `tests/unit/escale-secao-atribuicao.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL", role: "admin" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1K (D14): a subaba "Atribuição de ganho" (prints 01-012 e 01-027; código `Ks`). */
const ORIGENS: Origens = {
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};

function config(podeAdministrar = true): ConfiguracoesDaOrigem {
  return {
    pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
    etapas: [], motivos: [], campos: [], regras: [],
    fork: {
      moeda: null, tagsPadrao: [], motivosInativos: [], aoSair: {}, alerta: { geral: null, etapas: {} },
      visualizacao: null, pessoas: [], soAdminGanha: false, atribuicao: { operador: "e", condicoes: [] },
    },
    moedaDaOrganizacao: "BRL", visualizacao: "own_and_unassigned", visualizacaoDaOrganizacao: "own_and_unassigned",
    pessoasDoGrupo: [], podeAdministrar, distribuicao: [], distribuicaoAtualizada: null,
  } as unknown as ConfiguracoesDaOrigem;
}

function abrir(c = config()) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/pipelines/f-1/configuracoes") return { data: c };
    if (url === "/api/v1/contact-tags") return { data: ["vip", "inss"] };
    return { data: [] };
  });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: c });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={vi.fn()} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

async function irPara(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("navigation", { name: "Configurações da origem" });
  await user.click(screen.getByRole("button", { name: "Atribuição de ganho" }));
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Atribuição de ganho", () => {
  it("os textos da Clint e uma linha vazia; o Salvar começa desligado", async () => {
    const user = abrir();
    await irPara(user);
    expect(screen.getByText("Configure aqui as regras de atribuição de ganho.")).toBeInTheDocument();
    expect(screen.getByText("Atribuição de ganho pelo sistema")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Se marcado, somente o administrador poderá alterar o status do negócio para ganho." })).not.toBeChecked();
    expect(screen.getByText("Regras de atribuição de ganho")).toBeInTheDocument();
    expect(screen.getByText("Ter realizado")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Quantidade de vezes" })).toHaveValue("1");
    expect(screen.getByText("vezes a atividade do tipo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("a lista dos tipos na ordem do print 027; escolher e marcar a caixa grava o PATCH", async () => {
    const user = abrir();
    await irPara(user);
    await user.click(screen.getByRole("combobox", { name: "Tipo de atividade" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Ligação", "Email", "Agendamento", "Tarefa", "Reunião", "Whatsapp", "Instagram",
    ]);
    await user.click(screen.getByRole("option", { name: "Ligação" }));
    await user.click(screen.getByRole("checkbox", { name: "Se marcado, somente o administrador poderá alterar o status do negócio para ganho." }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-1/configuracoes", {
      atribuicao: { so_admin: true, operador: "e", condicoes: [{ tipo: "atividade", vezes: 1, atividade: "ligacao" }] },
    });
  });

  it("Nova condição → 'Escolha o tipo da condição:' → Tags; o E/Ou aparece entre as condições e vale para todas", async () => {
    const user = abrir();
    await irPara(user);
    await user.click(screen.getByRole("button", { name: "Nova condição" }));
    expect(screen.getByText("Escolha o tipo da condição:")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tags" }));
    expect(screen.getByText("Possuir a tag")).toBeInTheDocument();
    const operador = screen.getByRole("radiogroup", { name: "Como as regras se combinam" });
    expect(within(operador).getByRole("radio", { name: "E" })).toHaveAttribute("aria-checked", "true");
    await user.click(within(operador).getByRole("radio", { name: "Ou" }));
    await user.click(screen.getByRole("combobox", { name: "Tag" }));
    await user.click(screen.getByRole("option", { name: "vip" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-1/configuracoes", {
      atribuicao: { so_admin: false, operador: "ou", condicoes: [{ tipo: "tag", tag: "vip" }] },
    });
  });

  it("quem não é admin vê tudo desligado e sem lixeira nem 'Nova condição'", async () => {
    const user = abrir(config(false));
    await irPara(user);
    expect(screen.getByRole("checkbox", { name: "Se marcado, somente o administrador poderá alterar o status do negócio para ganho." })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Nova condição" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remover condição" })).toBeNull();
    expect(screen.getByText("Só o administrador altera a atribuição do ganho.")).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-secao-atribuicao.test.tsx tests/unit/escale-configuracoes-rota.test.ts`
Expected: FAIL.

- [ ] **Step 2: A leitura, a gravação e o rascunho**

Em `lib/escale/configuracoes/tipos.ts`:
- `import { lerAtribuicao, soAdminGanha, type AtribuicaoDeGanho } from "@/lib/escale/ganho/regras";`
- em `ConfiguracoesDoFork`:
  ```ts
    /** Fase 1K (D14): só o admin põe o negócio em Ganho nesta origem. */
    soAdminGanha: boolean;
    /** Fase 1K (D14): as regras do crédito do ganho. */
    atribuicao: AtribuicaoDeGanho;
  ```
- em `lerConfiguracoesDoFork`: `soAdminGanha: soAdminGanha(s),` e `atribuicao: lerAtribuicao(s),`.

Em `lib/escale/configuracoes/gravar.ts`:
- `import { atribuicaoSchema, gravarAtribuicao } from "@/lib/escale/ganho/regras";`
- no schema, depois de `permissoes`: `atribuicao: atribuicaoSchema.optional(),`
- `SecaoDasConfiguracoes` ganha `| "atribuicao"`; `secoesDoPatch` passa a filtrar `["gerais", "motivos", "campos", "alerta", "permissoes", "atribuicao"]`;
- `SECOES_DO_ADMINISTRADOR = ["motivos", "campos", "atribuicao"]` (N11);
- antes do `return { ok: true, settings: s };`: `if (patch.atribuicao) s = gravarAtribuicao(s, patch.atribuicao);`

Em `app/api/v1/pipelines/[id]/configuracoes/route.ts`, troque o texto do 403 das seções do administrador por `t("Só administrador muda motivos de perda, campos obrigatórios e atribuição de ganho.")`.

Em `lib/escale/configuracoes/rascunho.ts`:
- `import { atribuicaoDaTela, patchDaAtribuicao, type AtribuicaoNaTela } from "@/lib/escale/ganho/regras";`
- `RascunhoDaOrigem` ganha `atribuicao: AtribuicaoNaTela;`; `rascunhoInicial`, `atribuicao: atribuicaoDaTela(config.fork),`;
- em `pedidoDoSalvar`, antes do bloco da distribuição:
  ```ts
    if (!igual(r.atribuicao, inicial.atribuicao)) {
      const lido = patchDaAtribuicao(r.atribuicao);
      if (!lido.ok) return { ok: false, erro: lido.erro, secao: "atribuicao" };
      patch.atribuicao = lido.patch;
    }
  ```

Rode `corepack pnpm typecheck` e acrescente aos fixtures `ConfiguracoesDaOrigem` (o typecheck aponta cada um) `soAdminGanha: false, atribuicao: { operador: "e", condicoes: [] }` no `fork`.

- [ ] **Step 3: A subaba**

Create `components/escale/configuracoes/SecaoAtribuicao.tsx`:

```tsx
"use client";
import { Fragment, useState } from "react";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import {
  CONDICAO_VAZIA,
  TIPOS_NA_ATRIBUICAO,
  type AtribuicaoNaTela,
  type CondicaoNaTela,
} from "@/lib/escale/ganho/regras";
import type { TipoDeAtividade } from "@/lib/escale/playbook/regras";
import { ReceiptText, Trash2, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";

const BOTAO_DA_MARCA = "h-8 rounded-[6px] bg-casca-marca px-3 text-[13px] font-medium text-white hover:brightness-95";

/**
 * ATRIBUIÇÃO DE GANHO (fork Escale, Fase 1K, D14; prints 01-012 e 01-027, código `Ks`).
 * A caixa "Atribuição de ganho pelo sistema" (só o admin põe em Ganho) e as
 * regras do crédito (atividade com vezes e tipo, ou tag do contato), com um
 * E/OU único. Só o admin muda (N11); para os outros, tudo desligado.
 */
export function SecaoAtribuicao({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const org = useActiveOrg();
  const tags = useContactTagVocabulary(org?.orgId ?? null);
  const [escolhendo, setEscolhendo] = useState(false);
  const a = rascunho.atribuicao;
  const desligado = !config.podeAdministrar;
  const dica = desligado ? t("Só o administrador altera a atribuição do ganho.") : undefined;

  const mudarA = (f: (x: AtribuicaoNaTela) => AtribuicaoNaTela) => mudar((r) => ({ ...r, atribuicao: f(r.atribuicao) }));
  const trocar = (i: number, c: CondicaoNaTela) =>
    mudarA((x) => ({ ...x, condicoes: x.condicoes.map((y, j) => (j === i ? c : y)) }));
  const tirar = (i: number) => mudarA((x) => ({ ...x, condicoes: x.condicoes.filter((_, j) => j !== i) }));
  const somar = (c: CondicaoNaTela) => {
    mudarA((x) => ({ ...x, condicoes: [...x.condicoes, c] }));
    setEscolhendo(false);
  };

  return (
    <div className="grid max-w-[784px] gap-8">
      <CabecaDaSecao icone={ReceiptText} descricao={t("Configure aqui as regras de atribuição de ganho.")} />
      {dica ? <p className="-mt-6 text-[11px] text-casca-suave">{dica}</p> : null}

      <section className="grid gap-3">
        <h3 className="text-[13px] font-medium text-casca-texto">{t("Atribuição de ganho pelo sistema")}</h3>
        <div className="text-[13px] text-casca-texto">
          <CaixaDaCasca
            marcada={a.soAdmin}
            aoMudar={(v) => mudarA((x) => ({ ...x, soAdmin: v }))}
            rotulo={t("Se marcado, somente o administrador poderá alterar o status do negócio para ganho.")}
            desabilitada={desligado}
          />
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="text-[13px] font-medium text-casca-texto">{t("Regras de atribuição de ganho")}</h3>
        {a.condicoes.map((c, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <div role="radiogroup" aria-label={t("Como as regras se combinam")} className="flex gap-1">
                {(["e", "ou"] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    role="radio"
                    aria-checked={a.operador === op}
                    disabled={desligado}
                    title={dica}
                    onClick={() => mudarA((x) => ({ ...x, operador: op }))}
                    className={cn(
                      "h-7 rounded-[6px] px-3 text-[12px] font-medium disabled:opacity-60",
                      a.operador === op ? "bg-casca-marca text-white" : "border border-casca-marca text-casca-marca",
                    )}
                  >
                    {op === "e" ? t("E") : t("Ou")}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex h-16 items-center gap-2 rounded-[8px] border border-casca-borda px-6 text-[12px] text-casca-texto">
              {c.tipo === "atividade" ? (
                <>
                  <span>{t("Ter realizado")}</span>
                  <CampoDeTexto
                    aria-label={t("Quantidade de vezes")}
                    inputMode="numeric"
                    value={c.vezes}
                    disabled={desligado}
                    onChange={(e) => trocar(i, { ...c, vezes: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                    className="h-9 w-[60px] px-2 text-center"
                  />
                  <span>{t("vezes a atividade do tipo")}</span>
                  <div className="w-[328px]">
                    <SeletorDaCasca
                      aparencia="janela"
                      valor={c.atividade}
                      vazio={t("Selecione...")}
                      opcoes={TIPOS_NA_ATRIBUICAO.map((x) => ({ valor: x.valor, rotulo: t(x.rotulo) }))}
                      aoMudar={(v) => trocar(i, { ...c, atividade: v as TipoDeAtividade })}
                      aria-label={t("Tipo de atividade")}
                      desabilitado={desligado}
                      dica={dica}
                    />
                  </div>
                </>
              ) : (
                <>
                  <span>{t("Possuir a tag")}</span>
                  <div className="w-[328px]">
                    <SeletorDaCasca
                      aparencia="janela"
                      valor={c.tag}
                      vazio={t("Selecione...")}
                      buscaAPartirDe={8}
                      opcoes={(tags.data ?? []).map((x) => ({ valor: x, rotulo: x }))}
                      aoMudar={(v) => trocar(i, { tipo: "tag", tag: v })}
                      aria-label={t("Tag")}
                      desabilitado={desligado}
                      dica={dica}
                    />
                  </div>
                </>
              )}
              {desligado ? null : (
                <button
                  type="button"
                  aria-label={t("Remover condição")}
                  onClick={() => tirar(i)}
                  className="ml-auto rounded-[4px] p-1 text-casca-alerta hover:brightness-90"
                >
                  <Trash2 size={16} aria-hidden />
                </button>
              )}
            </div>
          </Fragment>
        ))}

        {desligado ? null : escolhendo ? (
          <div className="flex items-center gap-2 text-[13px] text-casca-texto">
            <span>{t("Escolha o tipo da condição:")}</span>
            <button type="button" className={BOTAO_DA_MARCA} onClick={() => somar(CONDICAO_VAZIA)}>
              {t("Atividade")}
            </button>
            <button type="button" className={BOTAO_DA_MARCA} onClick={() => somar({ tipo: "tag", tag: "" })}>
              {t("Tags")}
            </button>
            <button
              type="button"
              aria-label={t("Fechar")}
              onClick={() => setEscolhendo(false)}
              className="rounded-[4px] p-1 text-casca-meta hover:text-casca-texto"
            >
              <X size={12} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEscolhendo(true)}
            className="h-10 w-fit rounded-[6px] bg-casca-marca-suave px-4 text-[13px] font-medium text-casca-texto hover:brightness-95"
          >
            {t("Nova condição")}
          </button>
        )}
      </section>
    </div>
  );
}
```

Em `components/escale/configuracoes/JanelaDaOrigem.tsx`: o item `atribuicao` perde o `emBreve`; `case "atribuicao": return <SecaoAtribuicao {...props} />;`; import do componente; cabeçalho: `Fase 1K: a subaba "Atribuição de ganho".`

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-secao-atribuicao.test.tsx tests/unit/escale-configuracoes-rota.test.ts tests/unit/escale-configuracoes-gravar.test.ts tests/unit/escale-janela-da-origem.test.tsx && corepack pnpm typecheck && corepack pnpm eslint components/escale/configuracoes lib/escale`
Expected: PASS, limpo.

- [ ] **Step 5: Commit**

```bash
corepack pnpm prettier --write components/escale/configuracoes/SecaoAtribuicao.tsx tests/unit/escale-secao-atribuicao.test.tsx
git add components/escale/configuracoes lib/escale "app/api/v1/pipelines/[id]/configuracoes/route.ts" tests/unit
git commit -m "feat(escale): subaba 'Atribuição de ganho' da origem (Fase 1K, D14)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: A recusa nas portas, o "Ganho" escondido na ficha e a janela "Atribuição de ganho"

**Files:**
- Create: `app/api/v1/leads/[id]/atribuicao-de-ganho/route.ts`, `hooks/escale/useAtribuicaoDeGanho.ts`, `components/escale/negocio/JanelaAtribuicaoDeGanho.tsx`, `tests/unit/escale-atribuicao-de-ganho-rota.test.ts`, `tests/unit/escale-janela-atribuicao-de-ganho.test.tsx`
- Modify: `app/api/v1/leads/[id]/move/route.ts`, `lib/leads/encerramento.ts`, `app/api/v1/leads/bulk/route.ts` (os três encaixes), `components/escale/negocio/StatusDaFicha.tsx`, `components/escale/negocio/MenuDaFicha.tsx`, `tests/unit/escale-ficha-status-e-dono.test.tsx`

**Interfaces:**
- Consumes: Task 8 (`recusaDoGanhoPeloBanco`, `soAdminGanha`, `podeMarcarGanho`, `frasesDasRegras`, `lerAtribuicao`); Task 9 (`crm_ganho_do_negocio`, `fn_escale_corrigir_ganho`); `useBoard(pipelineId).data?.pipeline.settings`; `useActiveOrg().role`; `SeletorDeDataEHora` (1I); `useTeamMembers`, `membrosAtivosDaEquipe`.
- Produces: `GET /api/v1/leads/:id/atribuicao-de-ganho` → `{ data: GanhoDoNegocio | null }` com `GanhoDoNegocio { creditadoA: string | null; ganhoEm: string; pelaRegra: boolean; regras: AtribuicaoDeGanho | null; corrigidoEm: string | null }`; `PATCH` (admin) com `{ creditado_a: uuid | null, ganho_em: string (ISO) }`; `useAtribuicaoDeGanho(leadId, aberta)`, `useCorrigirGanho(leadId)`; `JanelaAtribuicaoDeGanho({ aberta, aoFechar, leadId })`.

- [ ] **Step 1: Os encaixes da recusa (os três arquivos do original)**

Em `app/api/v1/leads/[id]/move/route.ts`, logo depois de `if (recusa) return fail(recusa.codigo, recusa.mensagem, 422, { requestId });` (o da perda, dentro do `if (updErr)`):

```ts
    // FORK ESCALE · Fase 1K (N16): "só o administrador marca ganho" (gatilho da 9014).
    const recusaDoGanho = recusaDoGanhoPeloBanco(updErr, user.idioma);
    if (recusaDoGanho) return fail(recusaDoGanho.codigo, recusaDoGanho.mensagem, 403, { requestId });
```

Em `lib/leads/encerramento.ts`, logo depois do `if (recusa) { throw new ApiError(422, …) }` da perda:

```ts
    // FORK ESCALE · Fase 1K (N16): "só o administrador marca ganho" (gatilho da 9014).
    const recusaDoGanho = recusaDoGanhoPeloBanco(updErr, ctx.idioma);
    if (recusaDoGanho) {
      throw new ApiError(403, recusaDoGanho.codigo, undefined, ctx.requestId, recusaDoGanho.mensagem);
    }
```

Em `app/api/v1/leads/bulk/route.ts`, logo depois do `if (recusaDoBanco) { return fail(…, 422, …) }` dentro do `if (error)` do `fn_mover_leads_em_lote`:

```ts
        // FORK ESCALE · Fase 1K (N16): "só o administrador marca ganho" (gatilho da 9014).
        const recusaDoGanho = recusaDoGanhoPeloBanco(error, user.idioma);
        if (recusaDoGanho) {
          return fail(recusaDoGanho.codigo, recusaDoGanho.mensagem, 403, { requestId });
        }
```

Nos três, `import { recusaDoGanhoPeloBanco } from "@/lib/escale/ganho/recusa";`. Se a cerca `escale-casca-v2-original-intacto` reclamar de `@/lib/escale` nestes arquivos (ela fala de `@/components/escale/` no shell; aqui é `lib`), leia a mensagem: se valer só para componentes, siga; se valer para `lib/escale` em rotas do original, mova `recusa.ts` para `lib/leads/recusa-do-ganho.ts` e registre no PR.

Teste de cada encaixe: acrescente a `tests/unit/escale-ganho-regras.test.ts` um caso que lê os três arquivos e confere a chamada (guarda contra a sincronização com o Rafael apagar o encaixe):

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("os encaixes da recusa do ganho (N16)", () => {
  it.each(["app/api/v1/leads/[id]/move/route.ts", "lib/leads/encerramento.ts", "app/api/v1/leads/bulk/route.ts"])(
    "%s traduz a recusa do banco",
    (arquivo) => {
      expect(readFileSync(join(process.cwd(), arquivo), "utf8")).toContain("recusaDoGanhoPeloBanco(");
    },
  );
});
```

- [ ] **Step 2: A rota e o teste (vai falhar primeiro)**

Create `tests/unit/escale-atribuicao-de-ganho-rota.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { GET, PATCH } from "@/app/api/v1/leads/[id]/atribuicao-de-ganho/route";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

/** FORK ESCALE · Fase 1K (N18): ler e corrigir o crédito do ganho. */
const LEAD = "99999999-9999-4999-8999-999999999999";
const B = "22222222-2222-4222-8222-222222222222";
const ctx = { params: Promise.resolve({ id: LEAD }) };
const rpc = vi.fn();

function sessao(linha: Record<string, unknown> | null) {
  const b = {
    select: () => b,
    eq: () => b,
    maybeSingle: async () => ({ data: linha, error: null }),
  };
  vi.mocked(createClient).mockResolvedValue({ from: () => b } as never);
}

const pedido = (body?: unknown) =>
  new NextRequest(`http://localhost/api/v1/leads/${LEAD}/atribuicao-de-ganho`, {
    method: body === undefined ? "GET" : "PATCH",
    ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
  });

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
  rpc.mockReset().mockResolvedValue({ data: null, error: null });
  vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);
  authOk("admin");
});

describe("GET", () => {
  it("devolve o crédito com as regras lidas; sem linha, null", async () => {
    sessao({
      creditado_a: B, ganho_em: "2026-10-18T10:00:00Z", pela_regra: true, corrigido_em: null,
      regras: { operador: "e", condicoes: [{ tipo: "atividade", vezes: 2, atividade: "ligacao" }] },
    });
    const { data } = (await (await GET(pedido(), ctx)).json()) as { data: Record<string, unknown> };
    expect(data).toEqual({
      creditadoA: B, ganhoEm: "2026-10-18T10:00:00Z", pelaRegra: true, corrigidoEm: null,
      regras: { operador: "e", condicoes: [{ tipo: "atividade", vezes: 2, atividade: "ligacao" }] },
    });
    sessao(null);
    expect(((await (await GET(pedido(), ctx)).json()) as { data: unknown }).data).toBeNull();
  });
});

describe("PATCH", () => {
  it("só admin corrige (gerente: 403)", async () => {
    authOk("manager");
    expect((await PATCH(pedido({ creditado_a: B, ganho_em: "2026-10-17T10:00:00.000Z" }), ctx)).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("chama a função com a organização e o autor; as recusas viram 422/404", async () => {
    sessao({ creditado_a: B, ganho_em: "2026-10-17T10:00:00Z", pela_regra: false, corrigido_em: "x", regras: null });
    expect((await PATCH(pedido({ creditado_a: B, ganho_em: "2026-10-17T10:00:00.000Z" }), ctx)).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fn_escale_corrigir_ganho", {
      p_org: ORG_ID, p_lead: LEAD, p_autor: USER_ID, p_creditado_a: B, p_ganho_em: "2026-10-17T10:00:00.000Z",
    });
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PT422", message: "pessoa_invalida" } });
    expect((await PATCH(pedido({ creditado_a: B, ganho_em: "2026-10-17T10:00:00.000Z" }), ctx)).status).toBe(422);
    rpc.mockResolvedValueOnce({ data: null, error: { code: "PT404", message: "ganho_nao_encontrado" } });
    expect((await PATCH(pedido({ creditado_a: B, ganho_em: "2026-10-17T10:00:00.000Z" }), ctx)).status).toBe(404);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-atribuicao-de-ganho-rota.test.ts`
Expected: FAIL.

Create `app/api/v1/leads/[id]/atribuicao-de-ganho/route.ts`:

```ts
/**
 * GET/PATCH /api/v1/leads/:id/atribuicao-de-ganho — o crédito do negócio
 * ganho (fork Escale, Fase 1K, D14; a janela "Atribuição de ganho" da Clint).
 *
 * GET: quem vê o negócio (agente ou acima), com a sessão (RLS da 9014). PATCH:
 * só administrador; troca a pessoa e a data pela `fn_escale_corrigir_ganho`,
 * com o service role (N18). Não mexe no fechamento do negócio.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import { lerAtribuicao, type AtribuicaoDeGanho } from "@/lib/escale/ganho/regras";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export interface GanhoDoNegocio {
  creditadoA: string | null;
  ganhoEm: string;
  pelaRegra: boolean;
  regras: AtribuicaoDeGanho | null;
  corrigidoEm: string | null;
}

const ROTA = "/api/v1/leads/[id]/atribuicao-de-ganho";
const corpoSchema = z
  .object({ creditado_a: z.string().uuid().nullable(), ganho_em: z.string().datetime({ offset: true }) })
  .strict();

async function ler(orgId: string, leadId: string) {
  return (await createClient())
    .from("crm_ganho_do_negocio")
    .select("creditado_a, ganho_em, pela_regra, regras, corrigido_em")
    .eq("organization_id", orgId)
    .eq("lead_id", leadId)
    .maybeSingle();
}

function montar(l: Record<string, unknown> | null): GanhoDoNegocio | null {
  if (!l) return null;
  return {
    creditadoA: typeof l.creditado_a === "string" ? l.creditado_a.toLowerCase() : null,
    ganhoEm: String(l.ganho_em),
    pelaRegra: l.pela_regra === true,
    regras: l.regras ? lerAtribuicao({ escale_atribuicao_de_ganho: l.regras }) : null,
    corrigidoEm: typeof l.corrigido_em === "string" ? l.corrigido_em : null,
  };
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_leads" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail("not_found", t("Lead não encontrado."), 404, { requestId });
  const { data, error } = await ler(authz.org.orgId, id);
  if (error) return falhaInesperada(error, { rota: `GET ${ROTA}`, operacao: "ler" }, t, requestId);
  return ok(montar(data as Record<string, unknown> | null), { requestId });
}

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_leads" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  if (!podeAdministrarEmpresa(authz.user, authz.org)) {
    return fail("forbidden", t("Só o administrador altera a atribuição do ganho."), 403, { requestId });
  }
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return fail("not_found", t("Lead não encontrado."), 404, { requestId });
  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) return fail("unprocessable_entity", t("Data inválida."), 422, { requestId });

  const { error } = await createAdminClient().rpc("fn_escale_corrigir_ganho", {
    p_org: authz.org.orgId,
    p_lead: id,
    p_autor: authz.user.id,
    p_creditado_a: parsed.data.creditado_a,
    p_ganho_em: parsed.data.ganho_em,
  });
  if (error) {
    if (error.code === "22023") return fail("unprocessable_entity", t("Data inválida."), 422, { requestId });
    if (error.code === "PT422") return fail("unprocessable_entity", t("Este usuário não faz parte da equipe."), 422, { requestId });
    if (error.code === "PT404") return fail("not_found", t("Negócio ganho não encontrado."), 404, { requestId });
    return falhaInesperada(error, { rota: `PATCH ${ROTA}`, operacao: "gravar" }, t, requestId);
  }
  void audit({
    action: "lead.updated",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "lead",
    resourceId: id,
    requestId,
    metadata: { via: "escale", acao: "atribuicao_de_ganho" },
  });
  const relido = await ler(authz.org.orgId, id);
  if (relido.error) return falhaInesperada(relido.error, { rota: `PATCH ${ROTA}`, operacao: "reler" }, t, requestId);
  return ok(montar(relido.data as Record<string, unknown> | null), { requestId });
}
```

Confira se `"lead.updated"` está em `AUDIT_ACTIONS` (`grep -n '"lead.updated"' lib/audit/actions.ts`); se não estiver, use a ação de edição de negócio que existir ali (`grep -n '"lead\.' lib/audit/actions.ts`). Não acrescente ação nova ao arquivo do original.

- [ ] **Step 3: O hook e a janela (o teste primeiro)**

Create `tests/unit/escale-janela-atribuicao-de-ganho.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const papel = vi.hoisted(() => ({ valor: "admin" }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useActiveOrg: () => ({ orgId: "org-1", role: papel.valor }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaAtribuicaoDeGanho } from "@/components/escale/negocio/JanelaAtribuicaoDeGanho";

/** FORK ESCALE · Fase 1K (D14, N18): a janela "Atribuição de ganho" do negócio ganho (DealWonModal da Clint; sem print). */
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const EQUIPE = [
  { user_id: B, role: "agent", full_name: "Bruno Reis", email: "b@x.com", accepted_at: "2026-01-01", revoked_at: null, invited_at: null, created_at: "2026-01-01", last_sign_in_at: null },
];

function abrir(ganho: unknown) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/leads/l-1/atribuicao-de-ganho") return { data: ganho };
    if (url === "/api/v1/team") return { data: EQUIPE };
    return { data: [] };
  });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: ganho });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <JanelaAtribuicaoDeGanho aberta aoFechar={vi.fn()} leadId="l-1" />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

beforeEach(() => {
  papel.valor = "admin";
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("<JanelaAtribuicaoDeGanho>", () => {
  it("mostra a pessoa creditada e, quando houve regra, as frases ligadas por 'e'", async () => {
    abrir({
      creditadoA: B, ganhoEm: "2026-10-18T13:00:00.000Z", pelaRegra: true, corrigidoEm: null,
      regras: { operador: "e", condicoes: [{ tipo: "atividade", vezes: 2, atividade: "ligacao" }, { tipo: "tag", tag: "vip" }] },
    });
    expect(await screen.findByRole("dialog", { name: "Atribuição de ganho" })).toBeInTheDocument();
    expect(await screen.findByText("As seguintes regras foram aplicadas para a atribuição do ganho:")).toBeInTheDocument();
    expect(screen.getByText("Ter realizado 2 vezes a atividade do tipo Ligação e")).toBeInTheDocument();
    expect(screen.getByText("Possuir a tag vip")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Atribuir ganho ao usuário" })).toHaveTextContent("Bruno Reis");
  });

  it("o admin salva a correção", async () => {
    const user = abrir({ creditadoA: B, ganhoEm: "2026-10-18T13:00:00.000Z", pelaRegra: false, corrigidoEm: null, regras: null });
    await user.click(await screen.findByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/leads/l-1/atribuicao-de-ganho", {
      creditado_a: B,
      ganho_em: "2026-10-18T13:00:00.000Z",
    });
  });

  it("quem não é admin vê tudo desligado, sem Salvar", async () => {
    papel.valor = "agent";
    abrir({ creditadoA: B, ganhoEm: "2026-10-18T13:00:00.000Z", pelaRegra: false, corrigidoEm: null, regras: null });
    expect(await screen.findByRole("combobox", { name: "Atribuir ganho ao usuário" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
  });
});
```

(Se o `SeletorDaCasca` desligado usar `disabled` em vez de `aria-disabled`, troque a asserção por `toBeDisabled()`.)

Create `hooks/escale/useAtribuicaoDeGanho.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GanhoDoNegocio } from "@/app/api/v1/leads/[id]/atribuicao-de-ganho/route";
import { apiClient } from "@/lib/api/client";

const rota = (leadId: string) => `/api/v1/leads/${leadId}/atribuicao-de-ganho`;
export const chaveDoGanho = (leadId: string) => ["atribuicao-de-ganho", leadId] as const;

/** Fase 1K (D14): o crédito do negócio ganho; só lê com a janela aberta. */
export function useAtribuicaoDeGanho(leadId: string, aberta: boolean) {
  return useQuery({
    queryKey: chaveDoGanho(leadId),
    enabled: aberta,
    staleTime: 0,
    queryFn: async () => (await apiClient.get<{ data: GanhoDoNegocio | null }>(rota(leadId))).data,
  });
}

export function useCorrigirGanho(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (corpo: { creditado_a: string | null; ganho_em: string }) =>
      (await apiClient.patch<{ data: GanhoDoNegocio | null }>(rota(leadId), corpo)).data,
    onSuccess: (ganho) => qc.setQueryData(chaveDoGanho(leadId), ganho),
  });
}
```

Se importar o tipo de um arquivo de rota não passar no lint do projeto, mova `GanhoDoNegocio` para `lib/escale/ganho/regras.ts` e importe dos dois lados.

Create `components/escale/negocio/JanelaAtribuicaoDeGanho.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { membrosAtivosDaEquipe } from "@/components/escale/configuracoes/ListaDePessoas";
import {
  BotaoDaJanela,
  CabecaDaJanela,
  Campo,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { textoDoErro } from "@/components/escale/origens/texto-do-erro";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useAtribuicaoDeGanho, useCorrigirGanho } from "@/hooks/escale/useAtribuicaoDeGanho";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { frasesDasRegras } from "@/lib/escale/ganho/regras";

/**
 * A JANELA "ATRIBUIÇÃO DE GANHO" DO NEGÓCIO GANHO (fork Escale, Fase 1K, D14;
 * DealWonModal da Clint, sem print). Data e hora do ganho e a pessoa
 * creditada, desligadas para quem não é admin; quando o sistema aplicou
 * regras, as frases delas.
 */
export function JanelaAtribuicaoDeGanho({
  aberta,
  aoFechar,
  leadId,
}: {
  aberta: boolean;
  aoFechar: () => void;
  leadId: string;
}) {
  const t = useT();
  const admin = useActiveOrg()?.role === "admin";
  const consulta = useAtribuicaoDeGanho(leadId, aberta);
  const corrigir = useCorrigirGanho(leadId);
  const equipe = useTeamMembers({ enabled: aberta });
  const membros = useMemo(() => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")), [equipe.data, t]);
  const ganho = consulta.data ?? null;
  const [quando, setQuando] = useState<Date | null>(null);
  const [quem, setQuem] = useState<string>("");
  useEffect(() => {
    if (!ganho) return;
    setQuando(new Date(ganho.ganhoEm));
    setQuem(ganho.creditadoA ?? "");
  }, [ganho]);
  const dica = admin ? undefined : t("Só o administrador altera a atribuição do ganho.");
  const frases = ganho?.pelaRegra && ganho.regras ? frasesDasRegras(ganho.regras) : [];
  const ligacao = ganho?.regras?.operador === "ou" ? t("ou") : t("e");

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar}>
      <CabecaDaJanela titulo={t("Atribuição de ganho")} />
      {consulta.isPending ? (
        <p className="text-[13px] text-casca-suave">{t("Carregando…")}</p>
      ) : !ganho ? (
        <p className="text-[13px] text-casca-suave">{t("Negócio ganho não encontrado.")}</p>
      ) : (
        <div className="grid gap-4">
          {frases.length > 0 ? (
            <div className="grid gap-1 text-[13px] text-casca-texto">
              <p>{t("As seguintes regras foram aplicadas para a atribuição do ganho:")}</p>
              <ul className="grid gap-0.5 pl-4">
                {frases.map((f, i) => {
                  const texto = Object.entries(f.valores).reduce(
                    (acc, [k, v]) => acc.split(`{${k}}`).join(k === "tipo" ? t(v) : v),
                    t(f.modelo),
                  );
                  return <li key={i}>{i < frases.length - 1 ? `${texto} ${ligacao}` : texto}</li>;
                })}
              </ul>
            </div>
          ) : null}
          <Campo rotulo={t("Data")}>
            <div title={dica} className={admin ? undefined : "pointer-events-none opacity-60"}>
              {quando ? <SeletorDeDataEHora valor={quando} aoMudar={setQuando} /> : null}
            </div>
          </Campo>
          <Campo rotulo={t("Usuário")}>
            <SeletorDaCasca
              aparencia="janela"
              valor={quem}
              vazio={t("Atribuir ganho ao usuário")}
              opcoes={membros.map((m) => ({ valor: m.id, rotulo: m.nome }))}
              aoMudar={setQuem}
              aria-label={t("Atribuir ganho ao usuário")}
              desabilitado={!admin}
              dica={dica}
            />
          </Campo>
        </div>
      )}
      {admin && ganho ? (
        <RodapeDaJanela>
          <BotaoDaJanela
            variante="salvar"
            disabled={corrigir.isPending || !quando}
            title={!quando ? t("Data inválida.") : undefined}
            onClick={() =>
              quando &&
              corrigir.mutate(
                { creditado_a: quem || null, ganho_em: quando.toISOString() },
                {
                  onSuccess: () => {
                    toast.success(t("As alterações foram salvas com sucesso!"));
                    aoFechar();
                  },
                  onError: (e) => toast.error(textoDoErro(e, t)),
                },
              )
            }
          >
            {t("Salvar")}
          </BotaoDaJanela>
        </RodapeDaJanela>
      ) : null}
    </JanelaDaCasca>
  );
}
```

A Clint tem "Data" e "Hora" separadas; o `SeletorDeDataEHora` da 1I junta as duas (registre como diferença conhecida). O wrapper com `pointer-events-none` desliga o seletor da 1I para quem não é admin; se ele tiver prop `desabilitado`, use a prop.

- [ ] **Step 4: A ficha**

Em `components/escale/negocio/StatusDaFicha.tsx` (marque as linhas com `// FORK ESCALE · Fase 1K (N21)`):
- imports: `useActiveOrg` (já vem de `@/hooks/auth/AuthProvider`, junto de `usePermission`), `useBoard` de `@/hooks/kanban/useBoard`, `podeMarcarGanho` e `soAdminGanha` de `@/lib/escale/ganho/regras`;
- no corpo, depois de `const pode = usePermission("pipeline.move_card");`:
  ```ts
  const papel = useActiveOrg()?.role;
  const settingsDaOrigem = useBoard(pipelineId).data?.pipeline.settings;
  const podeGanhar = podeMarcarGanho({ papel, soAdmin: soAdminGanha(settingsDaOrigem) });
  const opcoes = STATUS.filter((s) => s.valor !== "won" || podeGanhar || lead.status === "won");
  ```
- onde o menu de status percorre `STATUS.map(…)` para montar os itens, troque por `opcoes.map(…)`.

Em `components/escale/negocio/MenuDaFicha.tsx`:
- imports: `Award` em `@/lib/ui/icons-da-casca`; `JanelaAtribuicaoDeGanho`;
- estado: `const [ganho, setGanho] = useState(false);`
- no menu, logo depois do item "Visualizar contato":
  ```tsx
            {lead.status === "won" ? (
              <MenuPrimitive.Item className={ITEM_DO_MENU} onSelect={() => setGanho(true)}>
                <Award size={14} aria-hidden />
                {t("Ver atribuição de ganho")}
              </MenuPrimitive.Item>
            ) : null}
  ```
- junto das outras janelas: `<JanelaAtribuicaoDeGanho aberta={ganho} aoFechar={() => setGanho(false)} leadId={lead.id} />`.

Em `tests/unit/escale-ficha-status-e-dono.test.tsx`, acrescente um caso com o mesmo `render`/fixtures do arquivo: a origem do quadro com `settings: { escale_so_admin_ganha: true }` e o papel `agent` → ao abrir o seletor de status, `queryByRole("menuitem", { name: "Ganho" })` é `null`; com o papel `admin`, o item aparece. O mock de `useBoard` (ou da rota do quadro) e o de `useActiveOrg` são os que o arquivo já usa; só troque `settings` e `role`.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-atribuicao-de-ganho-rota.test.ts tests/unit/escale-janela-atribuicao-de-ganho.test.tsx tests/unit/escale-ficha-status-e-dono.test.tsx tests/unit/escale-ganho-regras.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts && corepack pnpm typecheck && corepack pnpm eslint components/escale/negocio "app/api/v1/leads" lib/leads/encerramento.ts hooks/escale`
Expected: PASS, limpo. Rode também os testes do original que tocam os três encaixes: `corepack pnpm vitest run $(grep -rlE "leads/\[id\]/move|encerramento|leads/bulk" tests/unit --include='*.test.ts' | tr '\n' ' ')`.

- [ ] **Step 6: Revisor (G1).** `security-reviewer` com a rota nova e os três encaixes: "um não-admin corrige o crédito? a leitura devolve o crédito de negócio que a pessoa não vê? a recusa vaza algo do banco?". Corrija CRITICAL/HIGH.

- [ ] **Step 7: Commit**

```bash
corepack pnpm prettier --write "app/api/v1/leads/[id]/atribuicao-de-ganho/route.ts" hooks/escale/useAtribuicaoDeGanho.ts components/escale/negocio/JanelaAtribuicaoDeGanho.tsx tests/unit/escale-atribuicao-de-ganho-rota.test.ts tests/unit/escale-janela-atribuicao-de-ganho.test.tsx
git add app/api/v1/leads lib/leads/encerramento.ts components/escale/negocio hooks/escale tests/unit
git commit -m "feat(escale): só admin marca ganho na ficha e a janela 'Atribuição de ganho' (Fase 1K, D14)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Espanhol, rodada cheia, conferência, PRD e o PR B

- [ ] **Step 1: O espanhol**

Em `lib/i18n/dicionario.ts`, antes da mesma âncora da Task 7 (depois do bloco do PR A). Antes, `grep` de cada chave curta (`"E":`, `"Ou":`, `"e":`, `"ou":`, `"Tag":`, `"Tags":`, `"Atividade":`, `"Usuário":`, `"Ligação":`, `"Email":`, `"Agendamento":`, `"Tarefa":`, `"Reunião":`, `"Instagram":`, `"Selecione...":`) e tire do bloco as que já existirem:

```ts
  // ─── FORK ESCALE · Fase 1K (PR B): atribuição de ganho ───
  "Configure aqui as regras de atribuição de ganho.": { es: "Configura aquí las reglas de atribución de ganancia." },
  "Atribuição de ganho pelo sistema": { es: "Atribución de ganancia por el sistema" },
  "Se marcado, somente o administrador poderá alterar o status do negócio para ganho.": {
    es: "Si está marcado, solo el administrador podrá cambiar el estado del negocio a ganado.",
  },
  "Regras de atribuição de ganho": { es: "Reglas de atribución de ganancia" },
  "Ter realizado": { es: "Haber realizado" },
  "vezes a atividade do tipo": { es: "veces la actividad del tipo" },
  "Quantidade de vezes": { es: "Cantidad de veces" },
  "Tipo de atividade": { es: "Tipo de actividad" },
  "Possuir a tag": { es: "Tener la etiqueta" },
  "Nova condição": { es: "Nueva condición" },
  "Escolha o tipo da condição:": { es: "Elige el tipo de condición:" },
  "Remover condição": { es: "Quitar condición" },
  "Como as regras se combinam": { es: "Cómo se combinan las reglas" },
  Whatsapp: { es: "Whatsapp" },
  "Informe quantas vezes, de 1 a 999.": { es: "Indica cuántas veces, de 1 a 999." },
  "Só o administrador altera a atribuição do ganho.": { es: "Solo el administrador cambia la atribución de la ganancia." },
  "Só administrador muda motivos de perda, campos obrigatórios e atribuição de ganho.": {
    es: "Solo el administrador cambia motivos de pérdida, campos obligatorios y atribución de ganancia.",
  },
  "Você não possui permissão para dar ganho neste negócio.": { es: "No tienes permiso para marcar este negocio como ganado." },
  "Ver atribuição de ganho": { es: "Ver atribución de ganancia" },
  "Atribuir ganho ao usuário": { es: "Atribuir la ganancia al usuario" },
  "As seguintes regras foram aplicadas para a atribuição do ganho:": {
    es: "Se aplicaron las siguientes reglas para la atribución de la ganancia:",
  },
  "Ter realizado {n} vezes a atividade do tipo {tipo}": { es: "Haber realizado {n} veces la actividad del tipo {tipo}" },
  "Possuir a tag {tag}": { es: "Tener la etiqueta {tag}" },
  "Negócio ganho não encontrado.": { es: "No se encontró el negocio ganado." },
  "Data inválida.": { es: "Fecha no válida." },
  "As alterações foram salvas com sucesso!": { es: "¡Los cambios se guardaron con éxito!" },
  E: { es: "Y" },
  Ou: { es: "O" },
  e: { es: "y" },
  ou: { es: "o" },
  Tag: { es: "Etiqueta" },
  Tags: { es: "Etiquetas" },
  Atividade: { es: "Actividad" },
  Usuário: { es: "Usuario" },
```

Rode as cercas de espanhol (mesmo comando da Task 7). Expected: PASS.

- [ ] **Step 2: A rodada cheia** — a mesma da Task 7, Step 2, com os arquivos `/tmp/1k-b-*.txt`.

- [ ] **Step 3: A conferência visual** — a subaba contra o print 012 (e a lista contra o 027); a lista das diferenças no PR (no mínimo: data e hora juntas na janela do ganho; a janela e o "Ver atribuição de ganho" sem print; a tag como texto, N19).

- [ ] **Step 4: O PRD** — na seção 8, a linha da 1K: `PR A ✅ (distribuição); PR B aberto (ganho); PR C a seguir`. Na seção 5, a linha "Marcar ganho (1K)" ganha: `Sem sessão (automação, IA, integração) sempre pode (decisão de 18/10).`

- [ ] **Step 5: Commit e PR B**

```bash
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol da atribuição de ganho (Fase 1K, PR B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git fetch escale-crm && git rebase escale-crm/main
git push -u escale-crm feat/fase-1k-ganho
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-1k-ganho \
  --title "Fase 1K (PR B): só admin marca ganho e crédito do ganho" \
  --body "$(cat <<'EOF'
## O que muda
- Subaba "Atribuição de ganho" da origem, igual à Clint: a caixa "Atribuição de ganho pelo sistema" (só o admin põe em Ganho) e as regras (ter realizado N vezes a atividade do tipo X, ou possuir a tag, com E/Ou).
- O banco recusa o ganho de quem tem sessão e não é admin nessa origem; automação, IA e integração continuam ganhando. A recusa chega com o texto da Clint no arrasto, na ficha, no ⋮ do card e no lote. Na ficha, "Ganho" some das opções.
- No ganho, o crédito vai para quem cumpriu as regras (senão, o dono). "Ver atribuição de ganho" no ⋮ da ficha: o admin corrige data, hora e pessoa. Métricas e comissão continuam pelo dono.
- Migration 9014.

## Como testar
- `pnpm vitest run tests/unit/escale-ganho-*.test.ts tests/unit/escale-secao-atribuicao.test.tsx tests/unit/escale-*atribuicao-de-ganho*.test.ts*`
- `pnpm test:db` (prova `tests/invariants/escale-atribuicao-de-ganho.test.ts`)

## Diferenças conhecidas da Clint
(lista da conferência visual)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
**Pare aqui** e avise o usuário.

---

# PR C — Notificações da origem (dentro do app)

### Task 13: Branch do PR C, as regras das notificações e a seção `notificacoes` da rota

**Files:**
- Create: `lib/escale/notificacoes/regras.ts`, `tests/unit/escale-notificacoes-regras.test.ts`
- Modify: `lib/escale/configuracoes/tipos.ts`, `gravar.ts`, `rascunho.ts`, `app/api/v1/pipelines/[id]/configuracoes/route.ts`, `tests/unit/escale-configuracoes-rota.test.ts`, os fixtures (typecheck)

**Interfaces:**
- Consumes: `EntregarAvisoInput` (`@/lib/notifications/deliver`); `membrosAtivos` (1J, já lido pela rota para `permissoes`).
- Produces:
  - `CHAVE_DAS_NOTIFICACOES = "escale_notificacoes"`, `STATUS_AVISADOS = ["won", "lost"]`, `StatusAvisado`, `NotificacoesDaOrigem { novoNegocio: string[]; mudancaDeStatus: { status: StatusAvisado[]; pessoas: string[] } }`, `ERRO_SEM_USUARIO`;
  - `lerNotificacoes(settings)`, `notificacoesSchema`, `PatchDasNotificacoes`, `patchDasNotificacoes(n)`, `erroDasNotificacoes(n): string | null`, `gravarNotificacoes(settings, patch, membros)`;
  - `destinatariosDoEvento(evento, n, lead): string[]` (servidor);
  - `OrigemQueAvisa { id; nome; novo: boolean; status: StatusAvisado[] }`, `origensQueAvisam(origens, eu): OrigemQueAvisa[]`, `avisoDoNegocio({ tipo, novo, antigo, origem, eu }): EntregarAvisoInput | null` (tela);
  - `ConfiguracoesDoFork.notificacoes: NotificacoesDaOrigem`; a seção `notificacoes` no PATCH (gerente ou acima); `RascunhoDaOrigem.notificacoes: NotificacoesDaOrigem`.

- [ ] **Step 1: A branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-1k"
git status --porcelain    # Expected: vazio.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:supabase/migrations/20261029120000_9014_atribuicao_de_ganho.sql && echo "PR B ok"
git switch -c feat/fase-1k-avisos escale-crm/main
corepack pnpm install --frozen-lockfile
```
Expected: `PR B ok`. Senão, PARE.

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-notificacoes-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  ERRO_SEM_USUARIO,
  avisoDoNegocio,
  destinatariosDoEvento,
  erroDasNotificacoes,
  gravarNotificacoes,
  lerNotificacoes,
  origensQueAvisam,
} from "@/lib/escale/notificacoes/regras";

const A = "aaaaaaaa-1111-4111-8111-111111111111";
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const C = "cccccccc-1111-4111-8111-111111111111";
const CFG = {
  escale_notificacoes: {
    novo_negocio: { pessoas: [A, A.toUpperCase(), "lixo"] },
    mudanca_de_status: { status: ["won", "x"], pessoas: [B, C] },
  },
};

describe("leitura e gravação", () => {
  it("lê tolerante: ids válidos, minúsculos, sem repetição; só os status conhecidos", () => {
    expect(lerNotificacoes(CFG)).toEqual({
      novoNegocio: [A],
      mudancaDeStatus: { status: ["won"], pessoas: [B, C] },
    });
    expect(lerNotificacoes({})).toEqual({ novoNegocio: [], mudancaDeStatus: { status: [], pessoas: [] } });
  });

  it("status sem usuário trava (texto da Clint)", () => {
    expect(erroDasNotificacoes({ novoNegocio: [], mudancaDeStatus: { status: ["lost"], pessoas: [] } })).toBe(ERRO_SEM_USUARIO);
    expect(erroDasNotificacoes({ novoNegocio: [], mudancaDeStatus: { status: [], pessoas: [] } })).toBeNull();
  });

  it("gravar: só membros; sem ninguém a chave some; o resto do settings fica", () => {
    const membros = [A, B];
    expect(
      gravarNotificacoes({ fields: [] }, { novo_negocio: { pessoas: [A] }, mudanca_de_status: { status: ["won"], pessoas: [B] } }, membros),
    ).toEqual({
      ok: true,
      settings: {
        fields: [],
        escale_notificacoes: { novo_negocio: { pessoas: [A] }, mudanca_de_status: { status: ["won"], pessoas: [B] } },
      },
    });
    expect(
      gravarNotificacoes({ ...CFG, fields: [] }, { novo_negocio: { pessoas: [] }, mudanca_de_status: { status: [], pessoas: [] } }, membros),
    ).toEqual({ ok: true, settings: { fields: [] } });
    expect(
      gravarNotificacoes({}, { novo_negocio: { pessoas: [C] }, mudanca_de_status: { status: [], pessoas: [] } }, membros),
    ).toEqual({ ok: false, erro: "Este usuário não faz parte da equipe." });
  });
});

describe("quem é avisado (N22)", () => {
  const n = lerNotificacoes(CFG);
  it("novo negócio: só o que nasce sem pessoa que o criou", () => {
    expect(destinatariosDoEvento("lead.created", n, { owner_user_id: null, created_by_user_id: null })).toEqual([A]);
    expect(destinatariosDoEvento("lead.created", n, { owner_user_id: null, created_by_user_id: B })).toEqual([]);
  });

  it("mudança de status: só os status escolhidos, sem o dono (o original já o avisa)", () => {
    expect(destinatariosDoEvento("lead.won", n, { owner_user_id: B, created_by_user_id: null })).toEqual([C]);
    expect(destinatariosDoEvento("lead.lost", n, { owner_user_id: null, created_by_user_id: null })).toEqual([]);
  });

  it("origensQueAvisam: só as origens em que eu estou", () => {
    const origens = [
      { id: "o1", name: "Clayton", settings: CFG },
      { id: "o2", name: "Outra", settings: {} },
    ];
    expect(origensQueAvisam(origens, B)).toEqual([{ id: "o1", nome: "Clayton", novo: false, status: ["won"] }]);
    expect(origensQueAvisam(origens, A)).toEqual([{ id: "o1", nome: "Clayton", novo: true, status: [] }]);
  });

  it("avisoDoNegocio: o texto, o destino e as regras do tempo real", () => {
    const origem = { id: "o1", nome: "Clayton", novo: true, status: ["won" as const] };
    expect(
      avisoDoNegocio({ tipo: "INSERT", novo: { id: "l1", title: "Maria", created_by_user_id: null }, antigo: null, origem, eu: A }),
    ).toMatchObject({ category: "lead_assigned", title: "Novo negócio", body: "Clayton · Maria", href: "/app/negocios/l1" });
    expect(
      avisoDoNegocio({ tipo: "INSERT", novo: { id: "l1", title: "Maria", created_by_user_id: B }, antigo: null, origem, eu: A }),
    ).toBeNull();
    expect(
      avisoDoNegocio({ tipo: "UPDATE", novo: { id: "l1", title: "Maria", status: "won", owner_user_id: B }, antigo: { status: "open" }, origem, eu: A }),
    ).toMatchObject({ category: "lead_won", title: "Negócio ganho" });
    expect(
      avisoDoNegocio({ tipo: "UPDATE", novo: { id: "l1", title: "Maria", status: "won", owner_user_id: A }, antigo: { status: "open" }, origem, eu: A }),
    ).toBeNull();
    expect(
      avisoDoNegocio({ tipo: "UPDATE", novo: { id: "l1", title: "Maria", status: "lost", owner_user_id: B }, antigo: { status: "open" }, origem, eu: A }),
    ).toBeNull();
    expect(avisoDoNegocio({ tipo: "INSERT", novo: { id: "l1" }, antigo: null, origem: undefined, eu: A })).toBeNull();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-notificacoes-regras.test.ts`
Expected: FAIL.

- [ ] **Step 3: As regras**

Create `lib/escale/notificacoes/regras.ts`:

```ts
/**
 * AS NOTIFICAÇÕES DA ORIGEM (fork Escale, Fase 1K, D15; código `Ie` da Clint).
 *
 * A Clint manda e-mail em dois eventos (novo negócio vindo de integração;
 * negócio que vira Ganho ou Perdido) às pessoas escolhidas. Aqui o aviso é
 * dentro do app (Q1): o push pelo servidor e o toast pelo tempo real, com a
 * mesma régua (`destinatariosDoEvento` e `avisoDoNegocio`). Pessoas por id (N24).
 */
import { z } from "zod";

import type { EntregarAvisoInput } from "@/lib/notifications/deliver";

export const CHAVE_DAS_NOTIFICACOES = "escale_notificacoes";
export const STATUS_AVISADOS = ["won", "lost"] as const;
export type StatusAvisado = (typeof STATUS_AVISADOS)[number];
export const PESSOAS_DO_AVISO_MAX = 200;
export const ERRO_SEM_USUARIO = "Selecione um usuário para continuar";

export interface NotificacoesDaOrigem {
  novoNegocio: string[];
  mudancaDeStatus: { status: StatusAvisado[]; pessoas: string[] };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function comoRecord(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

function ids(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return [
    ...new Set(
      valor.filter((x): x is string => typeof x === "string" && UUID.test(x)).map((x) => x.toLowerCase()),
    ),
  ].slice(0, PESSOAS_DO_AVISO_MAX);
}

function statusDe(valor: unknown): StatusAvisado[] {
  return Array.isArray(valor) ? STATUS_AVISADOS.filter((s) => (valor as unknown[]).includes(s)) : [];
}

export function lerNotificacoes(settings: unknown): NotificacoesDaOrigem {
  const n = comoRecord(comoRecord(settings)[CHAVE_DAS_NOTIFICACOES]);
  const mudanca = comoRecord(n.mudanca_de_status);
  return {
    novoNegocio: ids(comoRecord(n.novo_negocio).pessoas),
    mudancaDeStatus: { status: statusDe(mudanca.status), pessoas: ids(mudanca.pessoas) },
  };
}

export const notificacoesSchema = z
  .object({
    novo_negocio: z.object({ pessoas: z.array(z.string().uuid()).max(PESSOAS_DO_AVISO_MAX) }).strict(),
    mudanca_de_status: z
      .object({
        status: z.array(z.enum(STATUS_AVISADOS)).max(STATUS_AVISADOS.length),
        pessoas: z.array(z.string().uuid()).max(PESSOAS_DO_AVISO_MAX),
      })
      .strict(),
  })
  .strict();
export type PatchDasNotificacoes = z.infer<typeof notificacoesSchema>;

/** "Selecione um usuário para continuar": há status escolhido e ninguém para avisar (Clint). */
export function erroDasNotificacoes(n: NotificacoesDaOrigem): string | null {
  return n.mudancaDeStatus.status.length > 0 && n.mudancaDeStatus.pessoas.length === 0 ? ERRO_SEM_USUARIO : null;
}

export function patchDasNotificacoes(n: NotificacoesDaOrigem): PatchDasNotificacoes {
  return {
    novo_negocio: { pessoas: [...n.novoNegocio] },
    mudanca_de_status: { status: [...n.mudancaDeStatus.status], pessoas: [...n.mudancaDeStatus.pessoas] },
  };
}

/** O `settings` com a chave. Só membros ativos; sem ninguém a avisar, a chave some. */
export function gravarNotificacoes(
  settings: Record<string, unknown>,
  p: PatchDasNotificacoes,
  membros: readonly string[],
): { ok: true; settings: Record<string, unknown> } | { ok: false; erro: string } {
  const novo = ids(p.novo_negocio.pessoas);
  const pessoas = ids(p.mudanca_de_status.pessoas);
  const status = statusDe(p.mudanca_de_status.status);
  if (status.length > 0 && pessoas.length === 0) return { ok: false, erro: ERRO_SEM_USUARIO };
  if ([...novo, ...pessoas].some((x) => !membros.includes(x))) {
    return { ok: false, erro: "Este usuário não faz parte da equipe." };
  }
  const resto = Object.fromEntries(Object.entries(settings).filter(([k]) => k !== CHAVE_DAS_NOTIFICACOES));
  const avisaStatus = status.length > 0 && pessoas.length > 0;
  if (novo.length === 0 && !avisaStatus) return { ok: true, settings: resto };
  return {
    ok: true,
    settings: {
      ...resto,
      [CHAVE_DAS_NOTIFICACOES]: {
        novo_negocio: { pessoas: novo },
        mudanca_de_status: avisaStatus ? { status, pessoas } : { status: [], pessoas: [] },
      },
    },
  };
}

/** Quem o evento do barramento avisa (servidor). Mudança de status não avisa o dono: o original já o avisa (N22). */
export function destinatariosDoEvento(
  evento: "lead.created" | "lead.won" | "lead.lost",
  n: NotificacoesDaOrigem,
  lead: { owner_user_id: string | null; created_by_user_id: string | null },
): string[] {
  if (evento === "lead.created") return lead.created_by_user_id ? [] : [...n.novoNegocio];
  const status: StatusAvisado = evento === "lead.won" ? "won" : "lost";
  if (!n.mudancaDeStatus.status.includes(status)) return [];
  const dono = lead.owner_user_id?.toLowerCase() ?? null;
  return n.mudancaDeStatus.pessoas.filter((p) => p !== dono);
}

export interface OrigemQueAvisa {
  id: string;
  nome: string;
  novo: boolean;
  status: StatusAvisado[];
}

/** As origens que avisam ESTA pessoa (a rota que a casca lê ao abrir). */
export function origensQueAvisam(
  origens: ReadonlyArray<{ id: string; name: string; settings: unknown }>,
  eu: string,
): OrigemQueAvisa[] {
  const me = eu.toLowerCase();
  return origens.flatMap((o) => {
    const n = lerNotificacoes(o.settings);
    const novo = n.novoNegocio.includes(me);
    const status = n.mudancaDeStatus.pessoas.includes(me) ? [...n.mudancaDeStatus.status] : [];
    return novo || status.length > 0 ? [{ id: o.id, nome: o.name, novo, status }] : [];
  });
}

/** O aviso na tela para um negócio que chegou pelo tempo real (a RLS já entrega só o que a pessoa vê). */
export function avisoDoNegocio({
  tipo,
  novo,
  antigo,
  origem,
  eu,
}: {
  tipo: "INSERT" | "UPDATE";
  novo: Record<string, unknown>;
  antigo: Record<string, unknown> | null;
  origem: OrigemQueAvisa | undefined;
  eu: string;
}): EntregarAvisoInput | null {
  if (!origem) return null;
  const id = typeof novo.id === "string" ? novo.id : null;
  if (!id) return null;
  const titulo = typeof novo.title === "string" && novo.title.trim() ? novo.title.trim() : "Negócio";
  const body = `${origem.nome} · ${titulo}`;
  const href = `/app/negocios/${id}`;
  if (tipo === "INSERT") {
    if (!origem.novo || novo.created_by_user_id) return null;
    return { category: "lead_assigned", kind: "lead_assigned", title: "Novo negócio", body, tag: `escale-novo:${id}`, href };
  }
  const status = novo.status;
  if ((status !== "won" && status !== "lost") || status === antigo?.status) return null;
  if (!origem.status.includes(status)) return null;
  if (typeof novo.owner_user_id === "string" && novo.owner_user_id.toLowerCase() === eu.toLowerCase()) return null;
  return status === "won"
    ? { category: "lead_won", kind: "lead_won", title: "Negócio ganho", body, tag: `escale-ganho:${id}`, href }
    : { category: "lead_lost", kind: "lead_lost", title: "Negócio perdido", body, tag: `escale-perdido:${id}`, href };
}
```

- [ ] **Step 4: A seção na rota e no rascunho**

Em `lib/escale/configuracoes/tipos.ts`: `import { lerNotificacoes, type NotificacoesDaOrigem } from "@/lib/escale/notificacoes/regras";`; `ConfiguracoesDoFork` ganha `/** Fase 1K (D15). */ notificacoes: NotificacoesDaOrigem;`; `lerConfiguracoesDoFork` ganha `notificacoes: lerNotificacoes(s),`.

Em `lib/escale/configuracoes/gravar.ts`:
- `import { gravarNotificacoes, notificacoesSchema } from "@/lib/escale/notificacoes/regras";`
- schema: `notificacoes: notificacoesSchema.optional(),`; `SecaoDasConfiguracoes` ganha `| "notificacoes"`; `secoesDoPatch` acrescenta `"notificacoes"` à lista;
- antes do `return { ok: true, settings: s };`:
  ```ts
    if (patch.notificacoes) {
      const todas = [...patch.notificacoes.novo_negocio.pessoas, ...patch.notificacoes.mudanca_de_status.pessoas].map((p) => p.toLowerCase());
      const v = gravarNotificacoes(s, patch.notificacoes, etapas.membros ?? todas);
      if (!v.ok) return v;
      s = v.settings;
    }
  ```

Em `app/api/v1/pipelines/[id]/configuracoes/route.ts`, a leitura dos membros ativos (1J) passa a valer também para notificações: troque `if (parsed.data.permissoes) {` (o bloco que chama `membrosAtivos`) por `if (parsed.data.permissoes || parsed.data.notificacoes) {`.

Em `lib/escale/configuracoes/rascunho.ts`:
- `import { erroDasNotificacoes, patchDasNotificacoes, type NotificacoesDaOrigem } from "@/lib/escale/notificacoes/regras";`
- `RascunhoDaOrigem` ganha `notificacoes: NotificacoesDaOrigem;`; `rascunhoInicial`, `notificacoes: { novoNegocio: [...config.fork.notificacoes.novoNegocio], mudancaDeStatus: { status: [...config.fork.notificacoes.mudancaDeStatus.status], pessoas: [...config.fork.notificacoes.mudancaDeStatus.pessoas] } },`;
- em `pedidoDoSalvar`, antes do bloco da distribuição:
  ```ts
    if (!igual(r.notificacoes, inicial.notificacoes)) {
      const erro = erroDasNotificacoes(r.notificacoes);
      if (erro) return { ok: false, erro, secao: "notificacoes" };
      patch.notificacoes = patchDasNotificacoes(r.notificacoes);
    }
  ```

Em `tests/unit/escale-configuracoes-rota.test.ts`, no `describe("PATCH …")` (os membros vêm do mock `acesso.membros` da 1J):

```ts
  it("notificacoes grava a chave com membros ativos e audita a seção", async () => {
    const db = banco();
    const res = await PATCH(
      pedido("PATCH", {
        notificacoes: {
          novo_negocio: { pessoas: [MEMBRO_2] },
          mudanca_de_status: { status: ["won"], pessoas: [MEMBRO_2] },
        },
      }),
      ctx(PIPE),
    );
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines" && e.tipo === "update");
    expect(escrita?.patch).toEqual({
      settings: {
        ...SETTINGS,
        escale_notificacoes: {
          novo_negocio: { pessoas: [MEMBRO_2] },
          mudanca_de_status: { status: ["won"], pessoas: [MEMBRO_2] },
        },
      },
    });
  });

  it("notificacoes com quem não é da equipe é 422", async () => {
    banco();
    const res = await PATCH(
      pedido("PATCH", { notificacoes: { novo_negocio: { pessoas: [NAO_MEMBRO] }, mudanca_de_status: { status: [], pessoas: [] } } }),
      ctx(PIPE),
    );
    expect(res.status).toBe(422);
  });
```

Rode `corepack pnpm typecheck` e acrescente aos fixtures `ConfiguracoesDaOrigem` (no `fork`): `notificacoes: { novoNegocio: [], mudancaDeStatus: { status: [], pessoas: [] } }`.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-notificacoes-regras.test.ts tests/unit/escale-configuracoes-rota.test.ts tests/unit/escale-configuracoes-gravar.test.ts && corepack pnpm typecheck && corepack pnpm eslint lib/escale/notificacoes lib/escale/configuracoes "app/api/v1/pipelines/[id]/configuracoes/route.ts"`
Expected: PASS, limpo.

- [ ] **Step 6: Commit**

```bash
corepack pnpm prettier --write lib/escale/notificacoes tests/unit/escale-notificacoes-regras.test.ts
git add lib/escale "app/api/v1/pipelines/[id]/configuracoes/route.ts" tests/unit
git commit -m "feat(escale): regras e gravação das notificações da origem (Fase 1K, D15)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: A subaba "Notificações"

**Abra antes:** o F01 (o menu e o cabeçalho). A subaba não tem print: siga o código `Ie` (Textos e Comportamento, no topo do plano).

**Files:**
- Create: `components/escale/configuracoes/SecaoNotificacoes.tsx`, `tests/unit/escale-secao-notificacoes.test.tsx`
- Modify: `components/escale/configuracoes/JanelaDaOrigem.tsx`

**Interfaces:**
- Consumes: Task 13 (`NotificacoesDaOrigem`, `StatusAvisado`); `SeletorMultiploDaCasca` (as opções são `CaixaDaCasca`, papel `checkbox`); `AjudaDaCasca`; `CabecaDaSecao`; `useTeamMembers`, `membrosAtivosDaEquipe`.
- Produces: `SecaoNotificacoes(props: PropsDaSecao)`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-secao-notificacoes.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useActiveOrg: () => ({ orgId: "org-1", currency: "BRL", role: "manager" }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1K (D15): a subaba "Notificações" (código `Ie` da Clint; sem print). Aviso no app, não e-mail (Q1). */
const A = "aaaaaaaa-1111-4111-8111-111111111111";
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const ORIGENS: Origens = {
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};
const EQUIPE = [
  { user_id: A, role: "agent", full_name: "Ana Lima", email: "a@x.com", accepted_at: "2026-01-01", revoked_at: null, invited_at: null, created_at: "2026-01-01", last_sign_in_at: null },
  { user_id: B, role: "agent", full_name: "Bruno Reis", email: "b@x.com", accepted_at: "2026-01-01", revoked_at: null, invited_at: null, created_at: "2026-01-01", last_sign_in_at: null },
];
const CONFIG = {
  pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
  etapas: [], motivos: [], campos: [], regras: [],
  fork: {
    moeda: null, tagsPadrao: [], motivosInativos: [], aoSair: {}, alerta: { geral: null, etapas: {} },
    visualizacao: null, pessoas: [], soAdminGanha: false, atribuicao: { operador: "e", condicoes: [] },
    notificacoes: { novoNegocio: [], mudancaDeStatus: { status: [], pessoas: [] } },
  },
  moedaDaOrganizacao: "BRL", visualizacao: "own_and_unassigned", visualizacaoDaOrganizacao: "own_and_unassigned",
  pessoasDoGrupo: [], podeAdministrar: false, distribuicao: [], distribuicaoAtualizada: null,
} as unknown as ConfiguracoesDaOrigem;

function abrir() {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/pipelines/f-1/configuracoes") return { data: CONFIG };
    if (url === "/api/v1/team") return { data: EQUIPE };
    return { data: [] };
  });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: CONFIG });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={vi.fn()} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  return userEvent.setup({ pointerEventsCheck: 0 });
}

async function irPara(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("navigation", { name: "Configurações da origem" });
  await user.click(screen.getByRole("button", { name: "Notificações" }));
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Notificações", () => {
  it("os dois blocos da Clint; o segundo seletor de usuários só aparece com algum status", async () => {
    const user = abrir();
    await irPara(user);
    expect(screen.getByRole("heading", { name: "Notificações" })).toBeInTheDocument();
    expect(screen.getByText("Configure aqui as notificações relacionadas a sua origem de dados.")).toBeInTheDocument();
    expect(screen.getByText("Notificação de novo negócio")).toBeInTheDocument();
    expect(screen.getByText("Selecione os usuários que receberão as notificações")).toBeInTheDocument();
    expect(screen.getByText("Notificação de mudança de status")).toBeInTheDocument();
    expect(screen.getByText("Selecione os usuários que receberão as notificações e os status a serem notificados.")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Usuários da mudança de status" })).toBeNull();
    await user.click(screen.getByRole("combobox", { name: "Status do negócio" }));
    await user.click(screen.getByRole("checkbox", { name: "Ganho" }));
    expect(screen.getByRole("combobox", { name: "Usuários da mudança de status" })).toBeInTheDocument();
  });

  it("status sem usuário: o Salvar mostra 'Selecione um usuário para continuar' e não grava", async () => {
    const user = abrir();
    await irPara(user);
    await user.click(screen.getByRole("combobox", { name: "Status do negócio" }));
    await user.click(screen.getByRole("checkbox", { name: "Perdido" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByText("Selecione um usuário para continuar")).toBeInTheDocument();
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("escolher as pessoas mostra o contador e grava o PATCH", async () => {
    const user = abrir();
    await irPara(user);
    await user.click(screen.getByRole("combobox", { name: "Usuários do novo negócio" }));
    await user.click(screen.getByRole("checkbox", { name: "Ana Lima" }));
    expect(screen.getByText("1 usuário selecionado")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Status do negócio" }));
    await user.click(screen.getByRole("checkbox", { name: "Ganho" }));
    await user.click(screen.getByRole("combobox", { name: "Usuários da mudança de status" }));
    await user.click(screen.getByRole("checkbox", { name: "Bruno Reis" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipelines/f-1/configuracoes", {
      notificacoes: {
        novo_negocio: { pessoas: [A] },
        mudanca_de_status: { status: ["won"], pessoas: [B] },
      },
    });
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-secao-notificacoes.test.tsx`
Expected: FAIL.

- [ ] **Step 2: A subaba**

Create `components/escale/configuracoes/SecaoNotificacoes.tsx`:

```tsx
"use client";
import { useMemo } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import type { NotificacoesDaOrigem, StatusAvisado } from "@/lib/escale/notificacoes/regras";
import { Bell } from "@/lib/ui/icons-da-casca";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";
import { membrosAtivosDaEquipe } from "./ListaDePessoas";

/**
 * NOTIFICAÇÕES DA ORIGEM (fork Escale, Fase 1K, D15; código `Ie` da Clint, sem print).
 * Os dois blocos da Clint, com o aviso dentro do app no lugar do e-mail (Q1).
 * O segundo seletor de usuários só aparece com algum status escolhido.
 */
export function SecaoNotificacoes({ rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const equipe = useTeamMembers();
  const membros = useMemo(() => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")), [equipe.data, t]);
  const opcoes = membros.map((m) => ({ valor: m.id, rotulo: m.nome }));
  const n = rascunho.notificacoes;
  const mudarN = (f: (x: NotificacoesDaOrigem) => NotificacoesDaOrigem) =>
    mudar((r) => ({ ...r, notificacoes: f(r.notificacoes) }));
  const usuarios = (q: number) => (q === 1 ? t("1 usuário selecionado") : `${q} ${t("usuários selecionados")}`);
  const status = (q: number) => (q === 1 ? t("1 status selecionado") : `${q} ${t("status selecionados")}`);
  const rotulo = "flex items-center gap-1.5 text-[13px] font-medium text-casca-texto";
  const subtexto = "text-[11px] text-casca-suave";

  return (
    <div className="grid max-w-[784px] gap-8">
      <CabecaDaSecao
        icone={Bell}
        titulo={t("Notificações")}
        descricao={t("Configure aqui as notificações relacionadas a sua origem de dados.")}
      />

      <section className="grid w-full gap-2 md:w-3/4">
        <span className={rotulo}>
          {t("Notificação de novo negócio")}
          <AjudaDaCasca
            texto={t("Os usuários selecionados receberão um aviso no app com as informações de novos negócios vindos de integrações.")}
          />
        </span>
        <p className={subtexto}>
          {n.novoNegocio.length === 0
            ? t("Selecione os usuários que receberão as notificações")
            : usuarios(n.novoNegocio.length)}
        </p>
        <SeletorMultiploDaCasca
          valores={n.novoNegocio}
          opcoes={opcoes}
          aoMudar={(v) => mudarN((x) => ({ ...x, novoNegocio: v }))}
          aria-label={t("Usuários do novo negócio")}
          vazio={t("Usuários")}
        />
      </section>

      <section className="grid w-full gap-2 md:w-3/4">
        <span className={rotulo}>
          {t("Notificação de mudança de status")}
          <AjudaDaCasca
            texto={t(
              "Quando seu negócio mudar para os status de ganho ou perdido, os usuários configurados receberão um aviso no app contendo as principais informações do negócio.",
            )}
          />
        </span>
        <p className={subtexto}>
          {n.mudancaDeStatus.status.length === 0 && n.mudancaDeStatus.pessoas.length === 0
            ? t("Selecione os usuários que receberão as notificações e os status a serem notificados.")
            : `${status(n.mudancaDeStatus.status.length)}. ${usuarios(n.mudancaDeStatus.pessoas.length)}.`}
        </p>
        <SeletorMultiploDaCasca<StatusAvisado>
          valores={n.mudancaDeStatus.status}
          opcoes={[
            { valor: "won", rotulo: t("Ganho") },
            { valor: "lost", rotulo: t("Perdido") },
          ]}
          aoMudar={(v) => mudarN((x) => ({ ...x, mudancaDeStatus: { ...x.mudancaDeStatus, status: v } }))}
          aria-label={t("Status do negócio")}
          vazio={t("Status do negócio")}
        />
        {n.mudancaDeStatus.status.length > 0 ? (
          <SeletorMultiploDaCasca
            valores={n.mudancaDeStatus.pessoas}
            opcoes={opcoes}
            aoMudar={(v) => mudarN((x) => ({ ...x, mudancaDeStatus: { ...x.mudancaDeStatus, pessoas: v } }))}
            aria-label={t("Usuários da mudança de status")}
            vazio={t("Usuários")}
          />
        ) : null}
      </section>
    </div>
  );
}
```

Em `components/escale/configuracoes/JanelaDaOrigem.tsx`: o item `notificacoes` perde o `emBreve`; `case "notificacoes": return <SecaoNotificacoes {...props} />;`; o import; cabeçalho: `Fase 1K: a subaba "Notificações" (aviso dentro do app).` Depois desta task, o único item com `emBreve` é "Visualização de campos".

- [ ] **Step 3: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-secao-notificacoes.test.tsx tests/unit/escale-janela-da-origem.test.tsx && corepack pnpm typecheck && corepack pnpm eslint components/escale/configuracoes`
Expected: PASS, limpo. (Se o `SeletorMultiploDaCasca` não aceitar o genérico explícito `<StatusAvisado>` no JSX, tire-o e faça `aoMudar={(v) => … status: v as StatusAvisado[] …}`.)

- [ ] **Step 4: Commit**

```bash
corepack pnpm prettier --write components/escale/configuracoes/SecaoNotificacoes.tsx tests/unit/escale-secao-notificacoes.test.tsx
git add components/escale/configuracoes tests/unit/escale-secao-notificacoes.test.tsx
git commit -m "feat(escale): subaba 'Notificações' da origem (Fase 1K, D15)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: A entrega: o push pelo servidor e o aviso na tela pelo tempo real

**Files:**
- Create: `lib/escale/notificacoes/avisos-da-origem.handler.ts`, `app/api/v1/escale/avisos-da-origem/route.ts`, `hooks/escale/useAvisosDaOrigem.ts`, `tests/unit/escale-avisos-da-origem-handler.test.ts`, `tests/unit/escale-avisos-da-origem-rota.test.ts`
- Modify: `lib/event-log/register-handlers.ts` (encaixe), `components/escale/menu/MenuDoTopo.tsx`, `hooks/escale/useConfiguracoesDaOrigem.ts`

**Interfaces:**
- Consumes: Task 13 (`lerNotificacoes`, `destinatariosDoEvento`, `origensQueAvisam`, `avisoDoNegocio`, `OrigemQueAvisa`); 1J (`podeVerNegocio`, `regraEmVigor`, `pessoasDaOrigem`, `modoDaOrganizacao`); `EventHandler`, `HandlerResult` (`@/lib/event-log/dispatcher`); `enviarPushAoUsuario` (`@/lib/notifications/web_push`); `vapidPronto` (`@/lib/notifications/vapid`); `truncar` (`@/lib/notifications/push_payload`); `useRealtimeChannel`; `canalLigado`; `emitNotification`; `useActiveOrg`, `useUser`.
- Produces: `AVISOS_DA_ORIGEM_KEY = "escale.avisos-da-origem"`, `avisosDaOrigemHandler: EventHandler`; `GET /api/v1/escale/avisos-da-origem` → `{ data: OrigemQueAvisa[] }`; `chaveDosAvisosDaOrigem(orgId)`, `useAvisosDaOrigem(): void`.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-avisos-da-origem-handler.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/notifications/web_push", () => ({ enviarPushAoUsuario: vi.fn(async () => ({ sent: 1 })) }));
vi.mock("@/lib/notifications/vapid", () => ({ vapidPronto: vi.fn(() => true) }));
vi.mock("@/lib/escale/acesso/modo-da-organizacao", () => ({ modoDaOrganizacao: vi.fn(async () => "all") }));

import { avisosDaOrigemHandler } from "@/lib/escale/notificacoes/avisos-da-origem.handler";
import { enviarPushAoUsuario } from "@/lib/notifications/web_push";
import { createAdminClient } from "@/lib/supabase/admin";

/** FORK ESCALE · Fase 1K (D15): o push das notificações da origem, só para quem vê o negócio. */
const ORG = "11111111-0000-4000-8000-000000000001";
const A = "aaaaaaaa-1111-4111-8111-111111111111";
const B = "bbbbbbbb-1111-4111-8111-111111111111";
const V = "cccccccc-1111-4111-8111-111111111111";

/** Um admin client de mentira: cada tabela devolve as linhas dadas, em `maybeSingle` ou como lista. */
function adminFalso(tabelas: Record<string, Array<Record<string, unknown>>>) {
  const from = (t: string) => {
    const linhas = tabelas[t] ?? [];
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "not", "is"]) b[m] = () => b;
    b.maybeSingle = async () => ({ data: linhas[0] ?? null, error: null });
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data: linhas, error: null });
    return b;
  };
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);
}

const evento = (event_type: string) =>
  ({ id: "ev-1", organization_id: ORG, event_type, entity_id: "lead-1", payload: { lead_id: "lead-1" } }) as never;

beforeEach(() => vi.mocked(enviarPushAoUsuario).mockClear());

describe("avisosDaOrigemHandler", () => {
  it("escuta lead.created, lead.won e lead.lost", () => {
    expect(avisosDaOrigemHandler.events).toEqual(["lead.created", "lead.won", "lead.lost"]);
  });

  it("novo negócio sem pessoa que criou: push às pessoas escolhidas que veem o negócio", async () => {
    adminFalso({
      crm_leads: [{ id: "lead-1", title: "Maria", pipeline_id: "p-1", owner_user_id: null, created_by_user_id: null }],
      crm_pipelines: [{ id: "p-1", name: "Clayton", group_id: null, settings: { escale_notificacoes: { novo_negocio: { pessoas: [A, V] }, mudanca_de_status: { status: [], pessoas: [] } } } }],
      user_organizations: [{ user_id: A, role: "agent" }],
    });
    const r = await avisosDaOrigemHandler.handle(evento("lead.created"));
    expect(r.status).toBe("ok");
    expect(enviarPushAoUsuario).toHaveBeenCalledTimes(1);
    expect(enviarPushAoUsuario).toHaveBeenCalledWith(ORG, A, expect.objectContaining({ title: "Novo negócio", body: "Clayton · Maria", href: "/app/negocios/lead-1" }));
  });

  it("criado por uma pessoa: ninguém", async () => {
    adminFalso({
      crm_leads: [{ id: "lead-1", title: "Maria", pipeline_id: "p-1", owner_user_id: null, created_by_user_id: B }],
      crm_pipelines: [{ id: "p-1", name: "Clayton", group_id: null, settings: { escale_notificacoes: { novo_negocio: { pessoas: [A] }, mudanca_de_status: { status: [], pessoas: [] } } } }],
      user_organizations: [{ user_id: A, role: "agent" }],
    });
    expect((await avisosDaOrigemHandler.handle(evento("lead.created"))).status).toBe("skipped");
    expect(enviarPushAoUsuario).not.toHaveBeenCalled();
  });

  it("ganho: avisa quem foi escolhido, menos o dono", async () => {
    adminFalso({
      crm_leads: [{ id: "lead-1", title: "Maria", pipeline_id: "p-1", owner_user_id: A, created_by_user_id: null }],
      crm_pipelines: [{ id: "p-1", name: "Clayton", group_id: null, settings: { escale_notificacoes: { novo_negocio: { pessoas: [] }, mudanca_de_status: { status: ["won"], pessoas: [A, B] } } } }],
      user_organizations: [{ user_id: A, role: "agent" }, { user_id: B, role: "manager" }],
    });
    await avisosDaOrigemHandler.handle(evento("lead.won"));
    expect(enviarPushAoUsuario).toHaveBeenCalledTimes(1);
    expect(enviarPushAoUsuario).toHaveBeenCalledWith(ORG, B, expect.objectContaining({ title: "Negócio ganho" }));
  });
});
```

Create `tests/unit/escale-avisos-da-origem-rota.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { GET } from "@/app/api/v1/escale/avisos-da-origem/route";
import { USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

/** FORK ESCALE · Fase 1K (D15): as origens que avisam quem pede (lidas com a sessão). */
describe("GET /api/v1/escale/avisos-da-origem", () => {
  it("devolve só as origens em que a pessoa está, com o que cada uma avisa", async () => {
    authOk("manager");
    const b: Record<string, unknown> = {};
    for (const m of ["select", "eq"]) b[m] = () => b;
    b.then = (r: (v: unknown) => unknown) =>
      r({
        data: [
          { id: "o1", name: "Clayton", settings: { escale_notificacoes: { novo_negocio: { pessoas: [USER_ID] }, mudanca_de_status: { status: [], pessoas: [] } } } },
          { id: "o2", name: "Outra", settings: {} },
        ],
        error: null,
      });
    vi.mocked(createClient).mockResolvedValue({ from: () => b } as never);
    const { data } = (await (await GET()).json()) as { data: unknown };
    expect(data).toEqual([{ id: "o1", nome: "Clayton", novo: true, status: [] }]);
    expect(requireRole).toHaveBeenCalledWith("agent", expect.anything());
  });
});
```

(Se `USER_ID` não for uuid no dublê, troque a lista da origem `o1` pelo valor de `USER_ID` em minúsculas e confira `origensQueAvisam`, que só aceita uuid: nesse caso, use um uuid fixo nos dois lados e um `authOk` com esse id.)

Run: `corepack pnpm vitest run tests/unit/escale-avisos-da-origem-handler.test.ts tests/unit/escale-avisos-da-origem-rota.test.ts`
Expected: FAIL.

- [ ] **Step 2: O handler**

Create `lib/escale/notificacoes/avisos-da-origem.handler.ts`:

```ts
/**
 * O PUSH DAS NOTIFICAÇÕES DA ORIGEM (fork Escale, Fase 1K, D15; Q1).
 *
 * Escuta `lead.created`, `lead.won` e `lead.lost`. Lê o negócio e a origem com
 * o service role, escolhe as pessoas pela régua da tela (`destinatariosDoEvento`)
 * e manda o push só a quem é membro ativo e VÊ o negócio (`podeVerNegocio` da
 * 1J, com o papel lido no banco). O toast dentro do app sai do tempo real
 * (`useAvisosDaOrigem`). O texto não leva mais que o nome da origem e o título.
 */
import type { EventHandler, EventRow, HandlerResult } from "@/lib/event-log/dispatcher";
import type { Role } from "@/lib/auth/types";
import { modoDaOrganizacao } from "@/lib/escale/acesso/modo-da-organizacao";
import { pessoasDaOrigem, podeVerNegocio, regraEmVigor } from "@/lib/escale/acesso/regras";
import { truncar } from "@/lib/notifications/push_payload";
import { vapidPronto } from "@/lib/notifications/vapid";
import { enviarPushAoUsuario } from "@/lib/notifications/web_push";
import { createAdminClient } from "@/lib/supabase/admin";

import { destinatariosDoEvento, lerNotificacoes } from "./regras";

export const AVISOS_DA_ORIGEM_KEY = "escale.avisos-da-origem";

const resultado = (status: HandlerResult["status"], detail?: string): HandlerResult => ({
  consumer_key: AVISOS_DA_ORIGEM_KEY,
  status,
  detail,
});

const TITULO: Record<"lead.created" | "lead.won" | "lead.lost", string> = {
  "lead.created": "Novo negócio",
  "lead.won": "Negócio ganho",
  "lead.lost": "Negócio perdido",
};

async function handle(row: EventRow): Promise<HandlerResult> {
  if (!vapidPronto()) return resultado("skipped", "vapid_ausente");
  const evento = row.event_type as keyof typeof TITULO;
  const leadId =
    (typeof row.payload?.lead_id === "string" ? row.payload.lead_id : null) ??
    (typeof row.entity_id === "string" ? row.entity_id : null);
  if (!leadId) return resultado("skipped", "sem_lead");

  const admin = createAdminClient();
  const { data: lead, error: erroDoLead } = await admin
    .from("crm_leads")
    .select("id, title, pipeline_id, owner_user_id, created_by_user_id")
    .eq("id", leadId)
    .eq("organization_id", row.organization_id)
    .maybeSingle();
  if (erroDoLead) return resultado("error", "leitura_do_negocio");
  if (!lead) return resultado("skipped", "negocio_sumiu");
  const l = lead as { title?: string | null; pipeline_id: string; owner_user_id: string | null; created_by_user_id: string | null };

  const { data: origem, error: erroDaOrigem } = await admin
    .from("crm_pipelines")
    .select("id, name, group_id, settings")
    .eq("id", l.pipeline_id)
    .eq("organization_id", row.organization_id)
    .maybeSingle();
  if (erroDaOrigem) return resultado("error", "leitura_da_origem");
  if (!origem) return resultado("skipped", "origem_sumiu");
  const o = origem as { name: string; group_id: string | null; settings: unknown };

  const quem = destinatariosDoEvento(evento, lerNotificacoes(o.settings), l);
  if (quem.length === 0) return resultado("skipped", "sem_destinatario");

  let settingsDoGrupo: unknown = null;
  if (o.group_id) {
    const g = await admin
      .from("crm_pipeline_groups")
      .select("settings")
      .eq("id", o.group_id)
      .eq("organization_id", row.organization_id)
      .maybeSingle();
    if (g.error) return resultado("error", "leitura_do_grupo");
    settingsDoGrupo = (g.data as { settings?: unknown } | null)?.settings ?? null;
  }
  const { data: membros, error: erroDosMembros } = await admin
    .from("user_organizations")
    .select("user_id, role")
    .eq("organization_id", row.organization_id)
    .in("user_id", quem)
    .not("accepted_at", "is", null)
    .is("revoked_at", null);
  if (erroDosMembros) return resultado("error", "leitura_dos_membros");

  const regra = regraEmVigor(o.settings, await modoDaOrganizacao(row.organization_id, row.id));
  const pessoas = pessoasDaOrigem(o.settings);
  const pessoasDoGrupo = pessoasDaOrigem(settingsDoGrupo);
  const papelDe = new Map(
    ((membros ?? []) as Array<{ user_id: string; role: string }>).map((m) => [m.user_id.toLowerCase(), m.role]),
  );
  const destinatarios = quem.filter((u) => {
    const papel = papelDe.get(u);
    return (
      !!papel &&
      podeVerNegocio({ papel: papel as Role, userId: u, donoUserId: l.owner_user_id, regra, pessoas, pessoasDoGrupo })
    );
  });
  if (destinatarios.length === 0) return resultado("skipped", "ninguem_ve");

  const payload = {
    title: TITULO[evento],
    body: truncar(`${o.name} · ${l.title?.trim() || "Negócio"}`),
    tag: `escale-origem:${evento}:${leadId}`,
    href: `/app/negocios/${leadId}`,
  };
  let enviados = 0;
  for (const u of destinatarios) {
    const { sent } = await enviarPushAoUsuario(row.organization_id, u, payload);
    enviados += sent;
  }
  return resultado("ok", `sent:${enviados}`);
}

export const avisosDaOrigemHandler: EventHandler = {
  key: AVISOS_DA_ORIGEM_KEY,
  naOrgParada: "pula",
  events: ["lead.created", "lead.won", "lead.lost"],
  handle,
};
```

Em `lib/event-log/register-handlers.ts`, junto dos imports: `import { avisosDaOrigemHandler } from "@/lib/escale/notificacoes/avisos-da-origem.handler"; // FORK ESCALE · Fase 1K (D15)` e, logo depois de `registerHandler(webPushInboundHandler);`:

```ts
  // FORK ESCALE · Fase 1K (D15): o push das notificações da origem.
  registerHandler(avisosDaOrigemHandler);
```

Se o tipo `EventRow` não tiver `id`, passe `randomUUID()` (de `node:crypto`) ao `modoDaOrganizacao` no lugar de `row.id`. Se algum teste do barramento listar as chaves registradas (`grep -rln "web-push-inbound.v1" tests/unit`), acrescente a chave nova onde ele espera.

- [ ] **Step 3: A rota**

Create `app/api/v1/escale/avisos-da-origem/route.ts`:

```ts
/**
 * GET /api/v1/escale/avisos-da-origem — as origens que avisam quem pede
 * (fork Escale, Fase 1K, D15): a casca liga o tempo real só com isto. Agente
 * ou acima, com a sessão (só as origens que a pessoa vê, RLS da 1J).
 */
import { randomUUID } from "node:crypto";

import { ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperada } from "@/lib/escale/configuracoes/respostas";
import { origensQueAvisam } from "@/lib/escale/notificacoes/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { data, error } = await (await createClient())
    .from("crm_pipelines")
    .select("id, name, settings")
    .eq("organization_id", authz.org.orgId)
    .eq("is_archived", false);
  if (error) return falhaInesperada(error, { rota: "GET /api/v1/escale/avisos-da-origem", operacao: "ler" }, t, requestId);
  return ok(
    origensQueAvisam((data ?? []) as Array<{ id: string; name: string; settings: unknown }>, authz.user.id),
    { requestId },
  );
}
```

Se a cerca `navegacao-completude` ou o registro de rotas exigir a rota numa lista, siga a mensagem dela.

- [ ] **Step 4: O hook e o encaixe na casca**

Create `hooks/escale/useAvisosDaOrigem.ts`:

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";
import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { apiClient } from "@/lib/api/client";
import { avisoDoNegocio, type OrigemQueAvisa } from "@/lib/escale/notificacoes/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { idiomaAtual } from "@/lib/i18n/IdiomaProvider";
import { emitNotification } from "@/lib/notifications/emit";
import type { EntregarAvisoInput } from "@/lib/notifications/deliver";
import { canalLigado } from "@/lib/notifications/prefs";

export const chaveDosAvisosDaOrigem = (orgId: string | null) => ["escale", "avisos-da-origem", orgId] as const;

function lados(payload: unknown): { novo: Record<string, unknown> | null; antigo: Record<string, unknown> | null } {
  const p = (payload ?? {}) as { new?: unknown; old?: unknown };
  const objeto = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
  return { novo: objeto(p.new), antigo: objeto(p.old) };
}

/**
 * Como o `entregarAviso` do original, com o botão "Abrir negócio" (o original
 * escreve "Abrir conversa" em todo aviso com destino). Respeita as preferências
 * de canal da pessoa (N23: novo = lead_assigned, ganho = lead_won, perda = lead_lost).
 */
function entregar(aviso: EntregarAvisoInput) {
  const idioma = idiomaAtual();
  const title = traduzir(aviso.title, idioma);
  if (canalLigado(aviso.category, "in_app")) {
    toast(title, {
      description: aviso.body,
      action: aviso.href
        ? { label: traduzir("Abrir negócio", idioma), onClick: () => window.location.assign(aviso.href!) }
        : undefined,
    });
  }
  if (canalLigado(aviso.category, "push")) {
    emitNotification({ kind: aviso.kind, title, body: aviso.body, tag: aviso.tag, href: aviso.href, force: true });
  }
}

/**
 * AS NOTIFICAÇÕES DA ORIGEM NA TELA (fork Escale, Fase 1K, D15). Montado no
 * menu do topo da casca. Lê as origens que avisam a pessoa e só então liga o
 * tempo real de `crm_leads` (INSERT para "novo negócio", UPDATE para ganho e
 * perda). A RLS entrega só o que a pessoa vê (1J).
 */
export function useAvisosDaOrigem(): void {
  const orgId = useActiveOrg()?.orgId ?? null;
  const user = useUser();
  const consulta = useQuery({
    queryKey: chaveDosAvisosDaOrigem(orgId),
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => (await apiClient.get<{ data: OrigemQueAvisa[] }>("/api/v1/escale/avisos-da-origem")).data,
  });
  const porId = useMemo(() => new Map((consulta.data ?? []).map((o) => [o.id, o])), [consulta.data]);
  const algumNovo = (consulta.data ?? []).some((o) => o.novo);
  const algumStatus = (consulta.data ?? []).some((o) => o.status.length > 0);

  const aoChegar = useCallback(
    (tipo: "INSERT" | "UPDATE") => (payload: unknown) => {
      const { novo, antigo } = lados(payload);
      if (!novo) return;
      const origem = porId.get(String(novo.pipeline_id ?? ""));
      const aviso = avisoDoNegocio({ tipo, novo, antigo, origem, eu: user.id });
      if (aviso) entregar(aviso);
    },
    [porId, user.id],
  );

  useRealtimeChannel({
    name: orgId ? `escale-avisos-novos-${orgId}` : "escale-avisos-novos-desligado",
    postgresChanges: orgId
      ? { event: "INSERT", schema: "public", table: "crm_leads", filter: `organization_id=eq.${orgId}` }
      : undefined,
    onChange: aoChegar("INSERT"),
    enabled: !!orgId && algumNovo,
  });
  useRealtimeChannel({
    name: orgId ? `escale-avisos-status-${orgId}` : "escale-avisos-status-desligado",
    postgresChanges: orgId
      ? { event: "UPDATE", schema: "public", table: "crm_leads", filter: `organization_id=eq.${orgId}` }
      : undefined,
    onChange: aoChegar("UPDATE"),
    enabled: !!orgId && algumStatus,
  });
}
```

Confira o caminho de `idiomaAtual` (o `deliver.ts` do original o importa de `@/lib/i18n/IdiomaProvider`) e se `useRealtimeChannel` aceita `onChange` novo a cada render (o `useCrmAlerts` passa um `useCallback`; aqui `aoChegar("INSERT")` cria uma função nova a cada render — se o hook religar o canal por isso, guarde as duas com `useMemo(() => aoChegar("INSERT"), [aoChegar])`).

Em `components/escale/menu/MenuDoTopo.tsx`: `import { useAvisosDaOrigem } from "@/hooks/escale/useAvisosDaOrigem";` e, na primeira linha do corpo de `MenuDoTopo()`, `useAvisosDaOrigem(); // FORK ESCALE · Fase 1K (D15): os avisos da origem dentro do app.`

Em `hooks/escale/useConfiguracoesDaOrigem.ts`, no `onSuccess` de `useSalvarConfiguracoes`: `void qc.invalidateQueries({ queryKey: ["escale", "avisos-da-origem"] });` (quem se pôs na lista passa a ser avisado sem recarregar).

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-avisos-da-origem-handler.test.ts tests/unit/escale-avisos-da-origem-rota.test.ts tests/unit/escale-notificacoes-regras.test.ts $(grep -rlE "MenuDoTopo|register-handlers" tests/unit --include='*.test.ts*' | tr '\n' ' ') && corepack pnpm typecheck && corepack pnpm eslint lib/escale/notificacoes app/api/v1/escale hooks/escale components/escale/menu/MenuDoTopo.tsx lib/event-log/register-handlers.ts`
Expected: PASS, limpo.

- [ ] **Step 6: Revisor (G1).** `security-reviewer` com o handler e a rota: "o push chega a quem não vê o negócio (lista da origem, regra 'só os seus')? a rota devolve configuração de origem que a pessoa não vê? o texto do push vaza dado além do nome da origem e do título?". Corrija CRITICAL/HIGH.

- [ ] **Step 7: Commit**

```bash
corepack pnpm prettier --write lib/escale/notificacoes/avisos-da-origem.handler.ts app/api/v1/escale/avisos-da-origem/route.ts hooks/escale/useAvisosDaOrigem.ts tests/unit/escale-avisos-da-origem-*.test.ts
git add lib/escale/notificacoes lib/event-log/register-handlers.ts app/api/v1/escale hooks/escale components/escale/menu/MenuDoTopo.tsx tests/unit
git commit -m "feat(escale): notificações da origem dentro do app, push e tempo real (Fase 1K, D15)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Espanhol, rodada cheia, conferência, PRD e o PR C

- [ ] **Step 1: O espanhol**

Em `lib/i18n/dicionario.ts`, antes da mesma âncora (depois dos blocos do PR A e do PR B). `grep` antes e tire o que já existir (`"Notificações":`, `"Ganho":`, `"Perdido":`, `"1 usuário selecionado":`, `"usuários selecionados":`, `"Usuários":`):

```ts
  // ─── FORK ESCALE · Fase 1K (PR C): notificações da origem ───
  "Configure aqui as notificações relacionadas a sua origem de dados.": {
    es: "Configura aquí las notificaciones relacionadas con tu origen de datos.",
  },
  "Notificação de novo negócio": { es: "Notificación de nuevo negocio" },
  "Os usuários selecionados receberão um aviso no app com as informações de novos negócios vindos de integrações.": {
    es: "Los usuarios seleccionados recibirán un aviso en la app con la información de los nuevos negocios que vienen de integraciones.",
  },
  "Selecione os usuários que receberão as notificações": { es: "Selecciona los usuarios que recibirán las notificaciones" },
  "Notificação de mudança de status": { es: "Notificación de cambio de estado" },
  "Quando seu negócio mudar para os status de ganho ou perdido, os usuários configurados receberão um aviso no app contendo as principais informações do negócio.": {
    es: "Cuando tu negocio cambie a ganado o perdido, los usuarios configurados recibirán un aviso en la app con la información principal del negocio.",
  },
  "Selecione os usuários que receberão as notificações e os status a serem notificados.": {
    es: "Selecciona los usuarios que recibirán las notificaciones y los estados a notificar.",
  },
  "1 status selecionado": { es: "1 estado seleccionado" },
  "status selecionados": { es: "estados seleccionados" },
  "Status do negócio": { es: "Estado del negocio" },
  "Usuários do novo negócio": { es: "Usuarios del nuevo negocio" },
  "Usuários da mudança de status": { es: "Usuarios del cambio de estado" },
  "Selecione um usuário para continuar": { es: "Selecciona un usuario para continuar" },
  "Novo negócio": { es: "Nuevo negocio" },
  "Negócio ganho": { es: "Negocio ganado" },
  "Negócio perdido": { es: "Negocio perdido" },
  "Abrir negócio": { es: "Abrir negocio" },
```

Rode as cercas de espanhol. Expected: PASS.

- [ ] **Step 2: A rodada cheia** — a mesma da Task 7, Step 2, com `/tmp/1k-c-*.txt` (só `test:unit`: o PR C não tem migration; rode o `test:db` só se algum teste de banco tocar o barramento).

- [ ] **Step 3: A conferência** — a subaba não tem print (registre que seguiu o código `Ie`); confira na tela que o toast chega a uma segunda pessoa logada quando um negócio de captação nasce na origem e quando um negócio é ganho, e que o dono não recebe o aviso duplicado. Liste no PR as diferenças (no mínimo: aviso no app em vez de e-mail, Q1; pessoas por id, N24; as categorias de preferência reaproveitadas, N23).

- [ ] **Step 4: O PRD** — em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`:
  - seção 8, a linha da 1K: `PRs A e B ✅; PR C aberto (notificações)`;
  - seção 2, o parágrafo "Sobre as notificações" ganha: `**Conferido em 18/10 no código da Clint:** a subaba "Notificações" da origem só manda e-mail, em dois eventos (novo negócio vindo de integração; mudança para Ganho/Perdido); os canais BELL/MOBILE/… são de outra tela. A Escale manda o mesmo aviso dentro do app (toast, navegador e push), decisão de 18/10.`

- [ ] **Step 5: Commit e PR C**

```bash
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol das notificações da origem (Fase 1K, PR C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git fetch escale-crm && git rebase escale-crm/main
git push -u escale-crm feat/fase-1k-avisos
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-1k-avisos \
  --title "Fase 1K (PR C): notificações da origem dentro do app" \
  --body "$(cat <<'EOF'
## O que muda
- Subaba "Notificações" da origem, igual à Clint: "Notificação de novo negócio" (negócios vindos de integrações) e "Notificação de mudança de status" (Ganho/Perdido), com as pessoas escolhidas.
- O aviso chega dentro do app, não por e-mail: toast e notificação do navegador pelo tempo real, e push no celular pelo barramento. Só para quem vê o negócio; o dono não recebe duplicado no ganho e na perda.
- Sem migration.

## Como testar
- `pnpm vitest run tests/unit/escale-notificacoes-regras.test.ts tests/unit/escale-secao-notificacoes.test.tsx tests/unit/escale-avisos-da-origem-*.test.ts`

## Diferenças conhecidas da Clint
(lista da conferência)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
**Pare aqui** e avise o usuário. Depois do merge, a worktree `wt-1k` pode ser removida (`git worktree remove ../wt-1k`) quando o usuário mandar.

---

## Fora desta fase (registrado)

- **Métricas e comissão pelo crédito do ganho:** continuam pelo dono (Q4); entram com o módulo Indicadores.
- **"Assumiu esta oportunidade automaticamente pela distribuição" no Histórico da ficha:** o `lead.assigned` com `via: "distribuicao"` já vai para o barramento; a linha própria no Histórico (1H) fica para quando a 1H tiver o vocabulário de dono.
- **Distribuição ligada/desligada** (`DISTRIBUTION_ENABLED/DISABLED` da Clint): aqui, lista vazia = desligada.
- **Cartão do autor ao passar o mouse no relógio e o calendário no período do contador** (N14).
- **E-mail das notificações** (Q1).

## Self-review (feito ao escrever)

- **Cobertura do PRD:** D13 → Tasks 1 a 7 (rodízio por percentual, contador, reset auditado em `crm_distribuicao_alteracoes` e no `api_audit_log`); D14 → Tasks 8 a 12 ("só admin marca ganho" no banco e na tela; crédito pelas regras; correção pelo admin); D15 → Tasks 13 a 16 (avisos dentro do app). Pergunta 9 do PRD → Q2 e Task 7, Step 4. Q9 da 1J → Tasks 4 (rota) e 5 (tela). "Ver atribuição de ganho" da 1G → Task 11.
- **Nomes conferidos entre tasks:** `PessoaNaDistribuicao`, `LinhaDaDistribuicao`, `PedidoDaDistribuicao`, `linhasDaTela`, `dividirIgual`, `erroDaDistribuicao`, `distribuidosForaDaLista`, `textoDoBloqueio`, `versoesDaDistribuicao` (T1 → T4, T5, T6); `lerDistribuicao`, `papeisAtivos`, `DistribuicaoFeita` (T4 → T5, T6); `useSalvarDistribuicao`, `useReiniciarDistribuicao`, `useAlteracoesDaDistribuicao`, `useDistribuicoesFeitas` (T5 → T6); `soAdminGanha`, `lerAtribuicao`, `atribuicaoDaTela`, `patchDaAtribuicao`, `gravarAtribuicao`, `podeMarcarGanho`, `frasesDasRegras`, `recusaDoGanhoPeloBanco` (T8 → T10, T11); `fn_escale_corrigir_ganho(p_org, p_lead, p_autor, p_creditado_a, p_ganho_em)` (T9 → T11); `lerNotificacoes`, `destinatariosDoEvento`, `origensQueAvisam`, `avisoDoNegocio` (T13 → T15).
- **Dependências externas a confirmar na Task 1:** os nomes da 1I e da 1J (os planos de 17/10 ainda não foram executados quando este foi escrito). A Task 1, Step 1, para se algum faltar.
