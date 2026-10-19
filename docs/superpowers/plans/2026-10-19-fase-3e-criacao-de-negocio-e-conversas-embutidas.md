# Fase 3E — Criação de negócio por dispositivo e conversas embutidas (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** F1 a F5 e D10 (modos) de `docs/modulos/3-conversas.md` (seção 4, tabelas F e D), a seção 7 ("Criação de negócio por dispositivo") e as decisões 5 e 7 do roteiro (acabar com a "origem padrão"). **Última fase da Frente C:** a Task 9 é a bateria única de testes, o revisor, a conferência visual e a publicação da frente inteira (3A–3E), pela regra "executa tudo, testa tudo, publica tudo" (18/10).
> **Situação em 19/10 (tarde), revisada neste plano:** a 3A, a 3B e a 3C **já estão no ar** (`v1.81.0-escale.14` e o hotfix `escale.15`, junto com a Frente B 2B–2D). A 3D tem plano (`2026-10-19-fase-3d-filtros-e-acoes-em-massa.md`) mas não foi executada; a 2E não está na `main`. Por isso a Task 9 publica **só o que falta da Frente C (3D e 3E)**, e a migration usa o timestamp `20261109120000` (o `20261106120000` é da 9203 na `main`). Duas lições da `escale.13`–`.15` entram aqui: o `TooltipProvider` próprio na `ConversaEmbutida` (Task 5) e a conferência do embed do PostgREST e do console de cada tela nova antes de dar a publicação por boa (Task 9).
> Depende da **3A, 3B, 3C e 3D mergeadas** (a casca de Conversas, `ThreadDaCasca`/`CompositorDaCasca`/`JanelaAgendarMensagem` da 3B, `JanelaDoDispositivo` e `useExcluirDispositivo` da 3C, `useFilaDeConversas`/`MenuDePresets` da 3D) e da **2E** (Frente B) para a aba Conversas da ficha (`AbaConversas` por contato e `ConversaEmLeitura`). Worktree `wt-frente-c`, migration **9205**, um PR.

## Decisões do usuário (18/10)

| # | Pergunta | Decisão | Onde vale |
|---|---|---|---|
| Q1 | PRD de Conversas | Aprovado | tudo |
| Q2 | Frente | (a) Frente C, worktree `wt-frente-c` | N1 |
| Q3 | Prints que faltam | Escrever agora e marcar como provisório | abaixo |
| Q4 da 2E (18/10) | "Por canal" e "Timeline unificada" (F5) | **Fora**: a Clint atual liga só "Padrão chat" (`enabledVariants = ["chat"]`, sem seletor); a 2E entrega o "Padrão chat". Esta fase põe o compositor nele | N9 |

**Prints que faltam nesta fase** (nenhum bloqueia; onde falta, o plano segue o código da Clint e marca como provisório):
1. ❌ A conversa aberta **dentro** do painel flutuante (01-025 mostra só a lista; seção 11 do PRD). Provisório: o painel de 400px troca a lista pela conversa, com "‹" para voltar, a foto e o nome no topo e "Abrir em Conversas"; a thread e o compositor da 3B em modo compacto.
2. ❌ A seção Conversas em "Por canal" e "Timeline unificada" — fora (Q4 da 2E).
3. ❌ O aviso de quem nunca configurou a criação (texto nosso, item da N4).

**Goal:** O dispositivo ganha a aba "Criação de negócio" da Clint ("Criar um negócio automaticamente", condições com mensagem, origem, etapa, tags e "Manter atendente…"), e o negócio da conversa passa a nascer pela regra do dispositivo — nunca mais pela origem padrão quando o dispositivo está configurado; e a conversa abre **dentro** do painel flutuante e da aba Conversas da ficha (thread e compositor da 3B), com o modo espião ligável na ficha. No fim, a Frente C inteira é testada, revisada, conferida e publicada.

**Architecture:**
- **A configuração** mora numa tabela do fork por dispositivo, `crm_criacao_de_negocio` (migration 9205: `channel_session_id` PK, `ligado`, `regras` jsonb), lida por toda a organização e escrita por administrador. As regras puras (`lib/escale/conversas/criacao-de-negocio.ts`) validam com as mensagens da Clint e decidem se uma mensagem casa (igual / começa com / contém / qualquer mensagem).
- **O nascimento** continua em `lib/leads/nascimento-do-lead.ts` (original), por **um encaixe**: logo depois de recusar bloqueado e pessoal, `nascimentoPeloDispositivo` (fork) decide. Dispositivo **nunca configurado** → o comportamento de hoje (`is_default`, risco 7 do PRD). Configurado e **desligado**, mensagem que não é a primeira da conversa no dispositivo, ou nenhuma condição que case → **nenhum** negócio. Uma condição que casa → o negócio nasce na origem e etapa dela pela RPC nova `fn_escale_nascer_negocio_do_dispositivo` (a mesma trava por contato do original; "Se o contato já possui um negócio nessa origem, nenhum novo negócio é criado"), com as tags no contato e, com "Manter atendente…", a conversa atribuída ao dono que a distribuição da 1K deu ao negócio. A pós-entrada passa o texto e o id da mensagem.
- **A aba** entra na `JanelaDoDispositivo` da 3C (hoje "Em breve"), com o rodapé da Clint ("Remover dispositivo" + "Salvar alterações"): os campos de nome/setor (3C) e a criação salvam juntos.
- **A conversa embutida** (`ConversaEmbutida`) é a thread e o compositor da 3B em modo compacto, com a mesma regra do compositor (`useEstadoDoCompositor`, extraído da `ConversaAberta`), marcando como lida só fora do modo espião. Ela entra no painel flutuante (que vira a mini-fila da Clint de 01-025, com busca, presets, ordem e tempo real) e na aba Conversas da ficha (no lugar da conversa em leitura da 2E).

**Tech Stack:** o mesmo da 3A–3D.

## Referência visual (abrir a imagem antes de cada task de tela)

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 16/10-01 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-16-01-dispositivo-criacao-de-negocio-condicao-aberta.png | a aba ligada com a "Condição 1" aberta: "Quando receber uma mensagem que" (igual + "Digite uma ou mais mensagens"), "Criar negócio na origem", "Na etapa", "Adicionar tags ao contato" ("+ Adicionar tag"), a caixinha "Manter atendente…" com o (?), "+ Adicionar nova condição"; o rodapé "Remover dispositivo" + "Salvar alterações" | 4 |
| 16/10-02 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-16-02-dispositivo-criacao-de-negocio-condicao-fechada.png | a condição fechada com o lápis | 4 |
| 16/10-03 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-16-03-dispositivo-criacao-de-negocio-desligada.png | a aba desligada: só o cartão com o interruptor | 4 |
| c104 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c104-criacao-de-negocio-desligada-whatsapp.jpg | a mesma no WhatsApp não oficial (duas abas) | 4 |
| c105 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c105-criacao-de-negocio-ligada-condicao-1.jpg | ligada: "Condição 1" fechada e "+ Adicionar nova condição" | 4 |
| c106 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c106-condicao-editar-nome.jpg | editar o nome no lugar: o campo, "Salvar" roxo e o X | 4 |
| c107 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c107-duas-condicoes-icones.jpg | duas condições: a segunda com o lápis e a lixeira vermelha | 4 |
| c108 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-18-c108-excluir-condicao-confirmacao.jpg | "Tem certeza que deseja excluir essa condição?" com "Não" e "Sim" | 4 |
| 01-025 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-025-botao-flutuante-conversas.png | o painel flutuante: cabeçalho lilás "Conversas 💬", "Pesquisar", "Todos ▾" e a ordem, as linhas da fila | 7 |
| c20 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c20-secao-conversas.jpg | a sessão escolhida (barra roxa) | 6 |
| c23 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c23-modo-espiao-ativo.jpg | a faixa verde do modo espião | 6 |

### Medidas tiradas dos prints (px de CSS; os de 16/10 em 1,25 — divida por 1,25)

| Peça | Medida |
|---|---|
| Cartão "Criar um negócio automaticamente" (16/10-01, c105) | borda `casca-borda`, canto 8px, `p-4`; `Briefcase` 16px `casca-suave` à esquerda; título 13px/600 `casca-texto` + (?) 14px `casca-marca` (`AjudaDaCasca`, a dica é a regra "Se o contato já possui um negócio nessa origem…"); descrição 13px `casca-suave` em 2 linhas; o `InterruptorDaCasca` à direita no topo |
| Condição (c105–c107) | acordeão com borda `casca-borda`, canto 8px, 8px entre condições; cabeçalho 48px `px-4`: `ChevronRight`/`ChevronDown` 14px + nome 13px `casca-texto`; à direita, ao passar o mouse e sempre a partir da 2ª: `Pencil` 14px `casca-suave` e (da 2ª em diante) `Trash2` 14px `casca-alerta`, botões 28px; aberto: corpo `px-4 py-4`, 16px entre os campos, borda de cima |
| Editar o nome (c106) | o cabeçalho vira: campo 36px `casca-busca` canto 6px 13px, "Salvar" (botão cheio `casca-marca`, 32px, 13px/600 branco) e o X (botão 32px `casca-raia`) |
| Excluir (c108) | `PainelSuspenso` 220px, `p-3`: "Tem certeza que deseja excluir essa condição?" 12px `casca-texto` em 2 linhas; "Não" (borda, 24px, 11px) e "Sim" (cheio `casca-marca`, 24px, 11px/600) à direita |
| Campos da condição (16/10-01) | rótulos 13px/600 `casca-texto`; "Quando receber uma mensagem que": o seletor do tipo (180px, 36px, `casca-busca`) e o campo das mensagens (36px, `casca-busca`, chips 11px das mensagens com X; Enter adiciona); "Criar negócio na origem" e "Na etapa" lado a lado (36px, `SeletorDaCasca aparencia="janela"`); "Adicionar tags ao contato" + o botão pílula "+ Adicionar tag" (24px, borda `casca-borda`, 11px) e os chips das tags; a caixinha (`CaixaDaCasca`) + "Manter atendente de acordo com a distribuição de dono do negócio." 12px + (?) |
| "+ Adicionar nova condição" (c105) | 13px/500 `casca-marca` (o azul da Clint vira a marca) com `Plus` 14px, a 16px da última condição |
| Rodapé da janela (16/10-01, c105) | 64px, borda de cima; "Remover dispositivo" (`Trash2` 14px + 13px/500 `casca-alerta`, botão de texto) e "Salvar alterações" (`BotaoDaJanela variante="salvar"`) à direita, 16px entre eles |
| Painel flutuante (01-025) | 400px de largura e `min(570px, 100vh − 140px)` de altura, canto 13px, sombra `shadow-casca-painel`; cabeçalho 52px `casca-marca-suave`: "Conversas" 15px/500 + `MessageCircleMore` 16px `casca-marca`; a busca 36px a 12px; a barra 40px com o botão de presets e a ordem; as linhas da fila (`LinhaDaFila` da 3A) |
| Conversa no painel (provisório) | cabeçalho 52px: `ChevronLeft` 16px ("Voltar"), a foto 32px (`FotoDaConversa`), o nome 13px/500 truncado; à direita "Abrir em Conversas" 12px `casca-marca` + `ExternalLink` 12px; o resto da altura com a thread e o compositor compactos |

### Textos da Clint usados nesta fase

Do bundle `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\pt-BR-DmQ11GIn.js.txt` (`component.AutoDeal*`, `component.ChannelAccountModal.*`, `label.t*`):

"Criação de negócio"; "Criar um negócio automaticamente"; "Crie um negócio automaticamente em uma origem ao receber a primeira mensagem neste dispositivo."; "Se o contato já possui um negócio nessa origem, nenhum novo negócio é criado e o negócio existente não é alterado."; "Condição"; "Condição 1"; "Quando receber uma mensagem que"; "igual"; "Começa com"; "Contém"; "Qualquer mensagem"; "Digite uma ou mais mensagens"; "Você pode adicionar até 10 mensagens!"; "A mensagem já existe!"; "Criar negócio na origem"; "Na etapa"; "Selecione..."; "Adicionar tags ao contato"; "Adicionar tag"; "Manter atendente de acordo com a distribuição de dono do negócio."; "A origem escolhida pode ter a configuração de distribuição de dono automática quando chega um novo negócio. Se marcado, essa regra definirá o atendente igual ao dono do negócio que foi definido na origem."; "Adicionar nova condição"; "Editar nome da condição"; "Excluir condição"; "Tem certeza que deseja excluir essa condição?"; "Não"; "Sim"; "O número máximo de caracteres permitido para o nome da condição é de 35!"; "O campo"; "é obrigatório em"; "Salvar"; "Salvar alterações"; "Remover dispositivo"; "Você tem certeza que deseja remover?"; "Conversas"; "Pesquisar"; "Abra as conversas sem marcá-las como lidas."; "Ativar modo espião"; "Desativar modo espião".

**Textos nossos:** "Hoje os negócios deste dispositivo nascem na origem padrão. Ligue a criação automática para escolher a origem e a etapa."; "Abrir em Conversas"; "Voltar"; "Não foi possível carregar a conversa."; "As alterações foram salvas."; "Em breve".

### Comportamento da Clint conferido no código

- **AutoDeal** (`index-BGmkH1Xr`, `ns`/`as`): `rules: [{ name, type, messages, origin_id, stage_id, tags, autoAttribution }]`; ligar cria `{ name: "Condição 1", type: "equals", messages: [] }`; os tipos `equals`/`starts_with`/`contains`/`any_message` ("igual", "Começa com", "Contém", "Qualquer mensagem"), e com `any_message` o campo das mensagens some; até 10 mensagens; nome até 35; ao salvar, a primeira falta vira "O campo {campo} é obrigatório em {condição}" (origem, etapa e, fora de "Qualquer mensagem", as mensagens); "Se o contato já possui um negócio nessa origem, nenhum novo negócio é criado e o negócio existente não é alterado."; "Manter atendente…" é `autoAttribution`.
- **Primeira mensagem neste dispositivo:** o negócio nasce no recebimento da primeira mensagem do contato naquele dispositivo.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Branch `feat/fase-3e-criacao-de-negocio-e-conversas-embutidas`** de `escale-crm/main` com a 3A–3D (e a 2E) mergeadas; **migration 9205**; um PR, mergeado ao terminar; depois, a Task 9 (fim da Frente C) | regra de 18/10 |
| N2 | **`crm_criacao_de_negocio`** (9205): `channel_session_id` (PK, FK composta com `channel_sessions (organization_id, id)` `on delete cascade`; **sem FK direta para `organizations` nem para `users`**, para não abrir no PostgREST um muitos-para-muitos que quebre um embed do original, como o PGRST201 da `escale.13`), `organization_id`, `ligado`, `regras` (jsonb, lista, até 32 KB), `atualizado_por`, `updated_at`. RLS: membros da organização leem; **administrador** escreve (seção 5 do PRD: "Criação de negócio por dispositivo — admin"). A forma das regras é do TS (`regrasDeCriacaoSchema`): `id`, `nome` (1–35), `tipo` (`igual`/`comeca`/`contem`/`qualquer`), `mensagens` (até 10, sem repetir), `origem_id`, `etapa_id`, `tags` (até 10, normalizadas), `manter_atendente`; até 20 condições | F1; seção 7 |
| N3 | **A decisão do dispositivo** (`decisaoDoDispositivo`): sem linha → `padrao` (o `is_default` de hoje); `ligado = false` → nenhum; sem texto (a conversa que começa pelo celular, `lib/waha/ingest.ts`) → nenhum; mensagem que **não é a primeira inbound da conversa** → nenhum; a primeira condição (na ordem) cujo tipo casa com o texto → ela; nenhuma → nenhum. O texto compara sem caixa, sem acento e sem espaço repetido | F1; risco 7 do PRD |
| N4 | **Quem nunca configurou** segue nascendo na origem padrão (risco 7), e a aba mostra o aviso nosso ("Hoje os negócios deste dispositivo nascem na origem padrão…") com o interruptor desligado. A meta "0 negócios por `is_default` a partir do WhatsApp" (seção 1 do PRD) se cumpre quando cada dispositivo for configurado — registrado no PR e no LOG | métrica × risco 7 do PRD |
| N5 | **O encaixe no original** (`lib/leads/nascimento-do-lead.ts`): `DadosDoNascimento` ganha `texto?: string \| null` e `messageId?: string \| null`; `MotivoSemLead` ganha `"pelo_dispositivo"`; logo depois do passo 1 (bloqueado/pessoal), `const peloDispositivo = await nascimentoPeloDispositivo(db, dados, contato); if (peloDispositivo) return peloDispositivo;` — `null` = o caminho de sempre. Em `lib/channels/pos-entrada.ts`, `abrirDemanda` passa `texto: entrada.texto, messageId: entrada.messageId`. Nada muda para quem não configurou | princípio dos encaixes pequenos |
| N6 | **O negócio pelo dispositivo** nasce pela RPC nova `fn_escale_nascer_negocio_do_dispositivo` (9205, invoker, só `service_role`): a mesma trava por (organização, contato) do `fn_nascer_lead_da_conversa`; **já existe negócio do contato nessa origem (qualquer status)** → `null` ("nenhum novo negócio é criado e o negócio existente não é alterado"); senão insere na origem e etapa da condição, na moeda da organização (os gatilhos da 9007 e da 1K continuam: moeda da origem, tags padrão, distribuição de dono), e põe as **tags da condição no contato** com a mesma régua da 9007 (minúsculas, aparadas, sem repetir, sem `cliente`) e o evento `contact.tag_added`. O título, a atividade `lead_created` e o `lead.created` saem como no original | F1 |
| N7 | **"Manter atendente de acordo com a distribuição de dono do negócio."**: depois de nascer, se o negócio ganhou dono (a distribuição da 1K, `BEFORE INSERT`) e a conversa não está com ele, `fn_conversation_assign(org, conversa, dono, 'routing', null, false)` — a mesma razão do roteamento do original, que não silencia o agente | F1; 1K |
| N8 | **A aba na janela da 3C:** `JanelaDoDispositivo` deixa o "Em breve" e mostra `AbaCriacaoDeNegocio` (controlada: o rascunho mora na janela). "Salvar alterações" salva o nome e o setor (3C) e a criação juntos; a validação da Clint vem antes ("O campo Criar negócio na origem é obrigatório em Condição 1"), com a aba trocada para a da criação. O rodapé vira o da Clint: "Remover dispositivo" (o `useExcluirDispositivo` da 3C, admin, com "Você tem certeza que deseja remover?") + "Salvar alterações"; o "Cancelar" da 3C sai (o X do topo fecha). As origens e etapas vêm de `GET /api/v1/criacao-de-negocio/origens` (as não arquivadas, sem ganho e perda, pela sessão) | F1, F2 |
| N9 | **F5 fora** (Q4 da 2E): a seção/aba Conversas fica no "Padrão chat" que a 2E entrega; esta fase só põe o compositor nela | F5; Clint atual |
| N10 | **`ConversaEmbutida({ conversationId, compacta? })`**: lê a conversa (`useConversation`), mostra a `ThreadDaCasca` e o `CompositorDaCasca` da 3B (`compacto`) e a `JanelaAgendarMensagem`; marca como lida (`useMarkAsRead`) só fora do modo espião (a marca da sessão da 3A, N7). A regra do compositor (`modo`, `bloqueio`) sai da `ConversaAberta` para `useEstadoDoCompositor(conversa)`, que as duas usam | F3, F4; 3B N2 |
| N11 | **A aba Conversas da ficha** (a da 2E): a conversa da direita passa a ser `ConversaDaAba` (a barra de 48px da 2E com o canal e "Abrir em Conversas", e a `ConversaEmbutida` embaixo) no lugar da `ConversaEmLeitura`; a faixa do topo liga e desliga o modo espião ("Ativar modo espião"/"Desativar modo espião"), verde quando ligado (a faixa da 3A, c23) | F3, F4 |
| N12 | **O painel flutuante** vira a mini-fila de 01-025: cabeçalho lilás, "Pesquisar", o botão de presets da 3D (com os salvos; "Criar filtro" leva a `/app/inbox`), a ordem da 3A e as linhas da fila (`LinhaDaFila`, com a visualização da pessoa), lendo `useFilaDeConversas` (o tempo real `inbox-${orgId}` que o PRD pede, seção 13); clicar abre a conversa **dentro** do painel (provisório, item 1) com "‹", a foto, o nome e "Abrir em Conversas". O estado (busca, painel, ordem, conversa aberta) é do painel, não da URL | F3; seção 13 do PRD |
| G1 | **Verificação enxuta** nas Tasks 1–8; a **Task 9** é a bateria única da Frente C | regra de 18/10 |

## Global Constraints

### Repositório, worktree e Git

- Worktree: `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-c`. **Base:** `escale-crm/main` com a 3A–3D mergeadas (a Task 1 prova: `components/escale/conversas/filtros/PainelDeFiltrosDaFila.tsx` existe; `9204` está na `main`) e com a 2E (`components/escale/negocio/abas/ConversaEmLeitura.tsx`). **Sem a 2E na `main`:** faça as Tasks 1–5, 7 e 8; a Task 6 vira um PR pequeno logo depois do merge da 2E, antes da Task 9.
- **Branch:** `feat/fase-3e-criacao-de-negocio-e-conversas-embutidas`.
- **Migration:** `supabase/migrations/20261109120000_9205_criacao_de_negocio_por_dispositivo.sql`. Antes: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; `9205` em outra branch → PARE e pergunte. **O timestamp também não pode repetir:** na `main` de 19/10 o último do fork é `20261106120000` (9203); o `20261108120000` fica para a 9204 da 3D (o plano dela ainda diz `20261105120000`, que é da 9105, e precisa trocar na execução da 3D) e o `20261107120000` é da 9107 (2F). Confira com `git ls-tree --name-only escale-crm/main supabase/migrations/ | grep 2026110`; se `20261109120000` já estiver tomado, use o próximo dia livre e troque o nome nos cinco lugares deste plano.
- **PR** para `rgisjr/escale-crm`, base `main`, mergeado ao terminar. **A publicação é a Task 9** (tag, release, VPS), depois dos testes da frente inteira. **Proibido:** push em `origin` (Rafael), gravar no banco de produção fora das migrations, mexer em n8n, evolution, traefik e portainer na VPS.
- Conflitos: `lib/i18n/dicionario.ts`, `supabase/baseline.sql`, `lib/audit/actions.ts`, `tests/invariants/rls-completude-varredura.test.ts`, `lib/ui/icons-da-casca.ts`: manter os dois blocos.

### Ambiente

- Git Bash, `corepack pnpm`, `NODE_OPTIONS=--max-old-space-size=6144`. `test:db` só na Task 9.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 3E`.

| Arquivo | Mudança |
|---|---|
| `lib/leads/nascimento-do-lead.ts` | `MotivoSemLead` ganha `\| "pelo_dispositivo" // o dispositivo tem "Criação de negócio" configurada e decidiu não criar (fork Escale, 3E)`; `DadosDoNascimento` ganha `texto?: string \| null;` e `messageId?: string \| null;`; o import `import { nascimentoPeloDispositivo } from "@/lib/escale/conversas/criacao-de-negocio-banco";`; depois do `if ((contato …)?.is_personal === true) return …;` do passo 1: as duas linhas da N5 |
| `lib/channels/pos-entrada.ts` | em `abrirDemanda`, no objeto passado a `garantirLeadDaConversa`: `texto: entrada.texto,` e `messageId: entrada.messageId,` |
| `supabase/baseline.sql` | o bloco da 9205 logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (depois do da 9204) |
| `lib/i18n/dicionario.ts` | bloco `// ─── FORK ESCALE · Fase 3E: criação de negócio e conversas embutidas ───` logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` (depois do da 3D) |
| `lib/audit/actions.ts` | depois do bloco da 3D: `"channel_session.deal_creation_updated",` |
| `tests/invariants/rls-completude-varredura.test.ts` | a entrada de `crm_criacao_de_negocio` em `PROVA_PROPRIA` depois das da 9204 |

Do fork que mudam: `components/escale/conversas/configuracoes/canais/JanelaDoDispositivo.tsx` (a aba e o rodapé), `components/escale/conversas/centro/ConversaAberta.tsx` (usa `useEstadoDoCompositor`), `components/escale/negocio/abas/AbaConversas.tsx` (2E: a conversa e o modo espião), `components/escale/ConversasFlutuante.tsx` (Fase 0: a mini-fila e a conversa dentro).

### Cercas que precisam ficar verdes

As da 3A–3D mais: `rls-completude-varredura` (a tabela nova), `hardening-definer-varredura`/`gov-hardening-anon-definer`/`definer-nova-nasce-exposta` (a RPC nova é invoker, `revoke ... from public, anon, authenticated`), `tabelas-do-motor-nao-se-leem-pelo-login` (a tabela lida pela sessão na tela; o ingest usa o service role), `rodape-ocupado-contrato` (o painel flutuante continua com a posição por `style`), `i18n-espanhol-cobre-a-tela`, `controle-decorativo`, `tailwind-tokens`, `evidencia-citada`, `manifest-x-migrations`, `escale-casca-v2-original-intacto`, e os testes da pós-entrada e do nascimento (`tests/unit/pos-entrada-*.test.ts`, `tests/unit/*nascimento*.test.ts`), que continuam verdes (sem linha de configuração, nada muda).

### Commits e PR

Como na 3A. Copiar este plano para `docs/superpowers/plans/` na Task 1. `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (ou o modelo da sessão).

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/escale/conversas/criacao-de-negocio.ts` | novo | tipos, schema, regra nova, validação com as mensagens da Clint, `casaMensagem`, `primeiraRegraQueCasa` |
| `supabase/migrations/20261109120000_9205_criacao_de_negocio_por_dispositivo.sql`, `supabase/baseline.sql` | novo / bloco | a tabela e a RPC |
| `tests/invariants/escale-criacao-de-negocio-9205.test.ts` | novo | a prova contra Postgres real (Task 9) |
| `lib/escale/conversas/criacao-de-negocio-banco.ts` | novo | `decisaoDoDispositivo`, `nascimentoPeloDispositivo`, ler e gravar a configuração |
| `lib/leads/nascimento-do-lead.ts`, `lib/channels/pos-entrada.ts` | alterados | o encaixe |
| `app/api/v1/criacao-de-negocio/[channel_session_id]/route.ts`, `app/api/v1/criacao-de-negocio/origens/route.ts` | novos | ler e gravar; as origens e etapas |
| `hooks/escale/useCriacaoDeNegocio.ts` | novo | os hooks |
| `components/escale/conversas/configuracoes/canais/AbaCriacaoDeNegocio.tsx`, `CondicaoDeCriacao.tsx`, `CampoDeMensagens.tsx`, `TagsDaCondicao.tsx` | novos | a aba |
| `components/escale/conversas/configuracoes/canais/JanelaDoDispositivo.tsx` | alterado | a aba e o rodapé |
| `hooks/escale/useEstadoDoCompositor.ts`, `components/escale/conversas/ConversaEmbutida.tsx` | novos | a conversa embutida |
| `components/escale/conversas/centro/ConversaAberta.tsx` | alterado | usa o hook |
| `components/escale/negocio/abas/ConversaDaAba.tsx`, `components/escale/negocio/abas/AbaConversas.tsx` | novo / alterado | a aba Conversas da ficha (sai `ConversaEmLeitura.tsx`) |
| `components/escale/ConversasFlutuante.tsx` | alterado | a mini-fila e a conversa dentro |
| `lib/i18n/dicionario.ts`, `lib/audit/actions.ts`, `tests/invariants/rls-completude-varredura.test.ts` | alterados | espanhol, ação, varredura |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md`, `LOG.md` | alterados (fora do repositório) | as linhas da 3E e da Frente C; o log |

---

### Task 1: Branch, base e as regras puras da criação de negócio

**Files:**
- Create: `lib/escale/conversas/criacao-de-negocio.ts`, `tests/unit/escale-criacao-de-negocio-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/`

**Interfaces (Produces):** `TIPOS_DE_MENSAGEM` (`igual`, `comeca`, `contem`, `qualquer`), `TipoDeMensagem`, `ROTULO_DO_TIPO_DE_MENSAGEM`, `MENSAGENS_MAX` (10), `NOME_DA_CONDICAO_MAX` (35), `CONDICOES_MAX` (20), `TAGS_DA_CONDICAO_MAX` (10), `RegraDeCriacao`, `CriacaoDeNegocio = { ligado; regras }`, `regraDeCriacaoSchema`, `criacaoDeNegocioSchema`, `RegraEmEdicao` (origem/etapa podem estar vazias), `novaRegra(n)`, `lerCriacao(bruto)`, `validarCriacao(rascunho, t) → { ok: true; valor } | { ok: false; erro; indice }`, `adicionarMensagem(lista, texto) → { ok: true; lista } | { ok: false; erro }`, `normalizarTexto(s)`, `casaMensagem(regra, texto)`, `primeiraRegraQueCasa(regras, texto)`.

- [ ] **Step 1: A base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-c"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain            # Expected: vazio
git fetch escale-crm --quiet
git switch -c feat/fase-3e-criacao-de-negocio-e-conversas-embutidas escale-crm/main
for f in components/escale/conversas/filtros/PainelDeFiltrosDaFila.tsx components/escale/conversas/configuracoes/canais/JanelaDoDispositivo.tsx components/escale/conversas/centro/thread/ThreadDaCasca.tsx components/escale/conversas/centro/compositor/CompositorDaCasca.tsx hooks/escale/useModoEspiao.ts components/escale/negocio/abas/ConversaEmLeitura.tsx; do git cat-file -e HEAD:$f && echo "ok $f" || echo "FALTA $f"; done
git ls-tree --name-only HEAD supabase/migrations/ | grep -E "_92[0-9]{2}_" | sort
bash scripts/checar-colisao-de-migration.sh escale-crm/main
corepack pnpm install --frozen-lockfile
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-19-fase-3e-criacao-de-negocio-e-conversas-embutidas.md" docs/superpowers/plans/
```

Expected: `ok` nos cinco primeiros e a lista das 92xx terminando em `…9204_filtros_e_acoes_em_massa_da_fila.sql`; se faltar algum deles, PARE. `FALTA …ConversaEmLeitura.tsx` = a 2E não está na `main`: siga e deixe a Task 6 para depois (Global Constraints).

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-criacao-de-negocio-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  adicionarMensagem,
  casaMensagem,
  lerCriacao,
  novaRegra,
  primeiraRegraQueCasa,
  validarCriacao,
  type RegraDeCriacao,
} from "@/lib/escale/conversas/criacao-de-negocio";

const t = (s: string) => s;
const O = "a0000000-0000-4000-8000-000000000001";
const E = "a0000000-0000-4000-8000-000000000002";
const regra = (extra: Partial<RegraDeCriacao>): RegraDeCriacao => ({
  id: "r1", nome: "Condição 1", tipo: "igual", mensagens: ["Quero orçamento"], origem_id: O, etapa_id: E, tags: [], manter_atendente: false, ...extra,
});

describe("a condição da Clint (AutoDeal)", () => {
  it("ligar cria a 'Condição 1' igual e vazia", () => {
    expect(novaRegra(1)).toMatchObject({ nome: "Condição 1", tipo: "igual", mensagens: [], origem_id: "", etapa_id: "", tags: [], manter_atendente: false });
    expect(novaRegra(2).nome).toBe("Condição 2");
  });

  it("as mensagens: até 10, sem repetir (sem caixa)", () => {
    expect(adicionarMensagem(["oi"], "  Olá ")).toEqual({ ok: true, lista: ["oi", "Olá"] });
    expect(adicionarMensagem(["Oi"], "oi")).toEqual({ ok: false, erro: "A mensagem já existe!" });
    expect(adicionarMensagem(Array.from({ length: 10 }, (_, i) => `m${i}`), "x")).toEqual({ ok: false, erro: "Você pode adicionar até 10 mensagens!" });
  });

  it("validar: a primeira falta vira a frase da Clint, com a condição", () => {
    const r = validarCriacao({ ligado: true, regras: [{ ...novaRegra(1), mensagens: ["oi"], origem_id: O }] }, t);
    expect(r).toEqual({ ok: false, erro: "O campo Na etapa é obrigatório em Condição 1", indice: 0 });
    const sem = validarCriacao({ ligado: true, regras: [{ ...novaRegra(1), origem_id: O, etapa_id: E }] }, t);
    expect(sem).toMatchObject({ ok: false, erro: "O campo Quando receber uma mensagem que é obrigatório em Condição 1" });
    expect(validarCriacao({ ligado: true, regras: [{ ...novaRegra(1), tipo: "qualquer", origem_id: O, etapa_id: E }] }, t).ok).toBe(true);
    expect(validarCriacao({ ligado: true, regras: [{ ...regra({}), nome: "x".repeat(36) }] }, t)).toMatchObject({ erro: "O número máximo de caracteres permitido para o nome da condição é de 35!" });
    expect(validarCriacao({ ligado: false, regras: [] }, t)).toEqual({ ok: true, valor: { ligado: false, regras: [] } });
  });

  it("casar: sem caixa, sem acento, sem espaço repetido; a primeira que casa vence", () => {
    expect(casaMensagem(regra({}), "quero  ORÇAMENTO")).toBe(true);
    expect(casaMensagem(regra({ tipo: "comeca", mensagens: ["quero"] }), "Quero saber o preço")).toBe(true);
    expect(casaMensagem(regra({ tipo: "contem", mensagens: ["preco"] }), "qual o preço?")).toBe(true);
    expect(casaMensagem(regra({ tipo: "igual" }), "quero orçamento agora")).toBe(false);
    expect(casaMensagem(regra({ tipo: "qualquer", mensagens: [] }), "")).toBe(true);
    const r2 = regra({ id: "r2", tipo: "qualquer", mensagens: [] });
    expect(primeiraRegraQueCasa([regra({}), r2], "oi")?.id).toBe("r2");
    expect(primeiraRegraQueCasa([regra({})], "oi")).toBeNull();
  });

  it("lerCriacao tolera lixo", () => {
    expect(lerCriacao(null)).toEqual({ ligado: false, regras: [] });
    expect(lerCriacao({ ligado: true, regras: [{ nome: 1 }] })).toEqual({ ligado: true, regras: [] });
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-criacao-de-negocio-regras.test.ts`
Expected: FAIL.

- [ ] **Step 3: As regras**

Create `lib/escale/conversas/criacao-de-negocio.ts`:

```ts
import { z } from "zod";

import { normalizarTags } from "@/lib/contacts/tag-normalizada";

/**
 * A CRIAÇÃO DE NEGÓCIO POR DISPOSITIVO (fork Escale, Fase 3E; F1; Clint
 * `AutoDeal`, `index-BGmkH1Xr`). Regras puras: a forma das condições, a
 * validação com as frases da Clint e o casamento da mensagem.
 */
export const TIPOS_DE_MENSAGEM = ["igual", "comeca", "contem", "qualquer"] as const;
export type TipoDeMensagem = (typeof TIPOS_DE_MENSAGEM)[number];
/** Rótulos da Clint (`label.tEqual` etc.); quem mostra passa por `t()`. */
export const ROTULO_DO_TIPO_DE_MENSAGEM: Readonly<Record<TipoDeMensagem, string>> = {
  igual: "igual",
  comeca: "Começa com",
  contem: "Contém",
  qualquer: "Qualquer mensagem",
};
export const MENSAGENS_MAX = 10;
export const NOME_DA_CONDICAO_MAX = 35;
export const CONDICOES_MAX = 20;
export const TAGS_DA_CONDICAO_MAX = 10;

const uuid = z.string().uuid();
export const regraDeCriacaoSchema = z
  .object({
    id: z.string().min(1).max(40),
    nome: z.string().trim().min(1).max(NOME_DA_CONDICAO_MAX),
    tipo: z.enum(TIPOS_DE_MENSAGEM),
    mensagens: z.array(z.string().trim().min(1).max(500)).max(MENSAGENS_MAX),
    origem_id: uuid,
    etapa_id: uuid,
    tags: z.array(z.string().trim().min(1).max(40)).max(TAGS_DA_CONDICAO_MAX),
    manter_atendente: z.boolean(),
  })
  .strict()
  .refine((r) => r.tipo === "qualquer" || r.mensagens.length > 0, { message: "mensagens" });
export type RegraDeCriacao = z.infer<typeof regraDeCriacaoSchema>;

export const criacaoDeNegocioSchema = z
  .object({ ligado: z.boolean(), regras: z.array(regraDeCriacaoSchema).max(CONDICOES_MAX) })
  .strict()
  .refine((c) => !c.ligado || c.regras.length > 0, { message: "regras" });
export type CriacaoDeNegocio = z.infer<typeof criacaoDeNegocioSchema>;

/** O rascunho da tela: origem e etapa ainda vazias (""). */
export type RegraEmEdicao = Omit<RegraDeCriacao, "origem_id" | "etapa_id"> & { origem_id: string; etapa_id: string };
export type CriacaoEmEdicao = { ligado: boolean; regras: RegraEmEdicao[] };

export function novaRegra(numero: number): RegraEmEdicao {
  return {
    id: `regra-${Date.now().toString(36)}-${numero}`,
    nome: `Condição ${numero}`,
    tipo: "igual",
    mensagens: [],
    origem_id: "",
    etapa_id: "",
    tags: [],
    manter_atendente: false,
  };
}

/** Do banco: o que não passa no schema de hoje some (a condição inteira), sem quebrar a tela. */
export function lerCriacao(bruto: unknown): CriacaoDeNegocio {
  const b = (bruto ?? {}) as { ligado?: unknown; regras?: unknown };
  const regras = Array.isArray(b.regras)
    ? b.regras.flatMap((r) => {
        const lido = regraDeCriacaoSchema.safeParse(r);
        return lido.success ? [lido.data] : [];
      })
    : [];
  return { ligado: b.ligado === true, regras };
}

const FALTA = (campo: string, condicao: string, t: (s: string) => string) =>
  `${t("O campo")} ${t(campo)} ${t("é obrigatório em")} ${condicao}`;

export function validarCriacao(
  rascunho: CriacaoEmEdicao,
  t: (s: string) => string,
): { ok: true; valor: CriacaoDeNegocio } | { ok: false; erro: string; indice: number } {
  if (!rascunho.ligado) return { ok: true, valor: { ligado: false, regras: [] } };
  for (const [i, r] of rascunho.regras.entries()) {
    if (r.nome.trim().length > NOME_DA_CONDICAO_MAX)
      return { ok: false, erro: t("O número máximo de caracteres permitido para o nome da condição é de 35!"), indice: i };
    if (r.tipo !== "qualquer" && r.mensagens.length === 0)
      return { ok: false, erro: FALTA("Quando receber uma mensagem que", r.nome, t), indice: i };
    if (!r.origem_id) return { ok: false, erro: FALTA("Criar negócio na origem", r.nome, t), indice: i };
    if (!r.etapa_id) return { ok: false, erro: FALTA("Na etapa", r.nome, t), indice: i };
  }
  const lido = criacaoDeNegocioSchema.safeParse({
    ligado: true,
    regras: rascunho.regras.map((r) => ({ ...r, tags: normalizarTags(r.tags), mensagens: r.tipo === "qualquer" ? [] : r.mensagens })),
  });
  return lido.success ? { ok: true, valor: lido.data } : { ok: false, erro: t("Ocorreu um erro ao salvar."), indice: 0 };
}

export function adicionarMensagem(lista: readonly string[], texto: string): { ok: true; lista: string[] } | { ok: false; erro: string } {
  const nova = texto.trim();
  if (!nova) return { ok: true, lista: [...lista] };
  if (lista.some((m) => m.trim().toLowerCase() === nova.toLowerCase())) return { ok: false, erro: "A mensagem já existe!" };
  if (lista.length >= MENSAGENS_MAX) return { ok: false, erro: "Você pode adicionar até 10 mensagens!" };
  return { ok: true, lista: [...lista, nova] };
}

/** Sem caixa, sem acento, sem espaço repetido. */
export const normalizarTexto = (s: string): string =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

export function casaMensagem(regra: Pick<RegraDeCriacao, "tipo" | "mensagens">, texto: string): boolean {
  if (regra.tipo === "qualquer") return true;
  const alvo = normalizarTexto(texto);
  return regra.mensagens.some((m) => {
    const n = normalizarTexto(m);
    if (regra.tipo === "igual") return alvo === n;
    if (regra.tipo === "comeca") return alvo.startsWith(n);
    return alvo.includes(n);
  });
}

export const primeiraRegraQueCasa = (regras: readonly RegraDeCriacao[], texto: string): RegraDeCriacao | null =>
  regras.find((r) => casaMensagem(r, texto)) ?? null;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-criacao-de-negocio-regras.test.ts && corepack pnpm prettier --write lib/escale/conversas/criacao-de-negocio.ts tests/unit/escale-criacao-de-negocio-regras.test.ts && corepack pnpm eslint lib/escale/conversas/criacao-de-negocio.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans lib/escale/conversas/criacao-de-negocio.ts tests/unit/escale-criacao-de-negocio-regras.test.ts
git commit -m "feat(escale): regras da criação de negócio por dispositivo (Fase 3E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Migration 9205 — a configuração por dispositivo e o nascimento pela regra

**Files:**
- Create: `supabase/migrations/20261109120000_9205_criacao_de_negocio_por_dispositivo.sql`, `tests/invariants/escale-criacao-de-negocio-9205.test.ts`
- Modify: `supabase/baseline.sql`, `tests/invariants/rls-completude-varredura.test.ts`

**Interfaces (Produces):** tabela `crm_criacao_de_negocio (channel_session_id, organization_id, ligado, regras, atualizado_por, updated_at)`; `fn_escale_nascer_negocio_do_dispositivo(p_org uuid, p_contact uuid, p_pipeline uuid, p_stage uuid, p_title text, p_source text, p_source_metadata jsonb, p_tags_do_contato text[]) → uuid` (nulo = já existe negócio do contato nessa origem).

- [ ] **Step 1: A colisão e a migration**

```bash
bash scripts/checar-colisao-de-migration.sh escale-crm/main
```

Create `supabase/migrations/20261109120000_9205_criacao_de_negocio_por_dispositivo.sql`:

```sql
-- manifest: **Criação de negócio por dispositivo (fork Escale, Fase 3E).** Tabela nova `crm_criacao_de_negocio` (uma linha por dispositivo: `ligado` e as condições em `regras`, a forma validada pela rota; FK composta com `channel_sessions` em cascata; membros leem, administrador escreve) e a RPC `fn_escale_nascer_negocio_do_dispositivo` (invoker, só service_role): a mesma trava por organização e contato do `fn_nascer_lead_da_conversa`; com negócio do contato na origem da condição (qualquer status), não cria; senão insere na origem e etapa da condição e põe as tags da condição no contato (a régua da 9007) com o evento `contact.tag_added`. Sem linha de configuração, o nascimento continua o do original.
-- ---- FORK ESCALE · criação de negócio por dispositivo (migration 9205) ----

create table if not exists public.crm_criacao_de_negocio (
  channel_session_id uuid primary key,
  organization_id uuid not null,
  ligado boolean not null default false,
  regras jsonb not null default '[]'::jsonb,
  atualizado_por uuid,
  updated_at timestamptz not null default now(),
  constraint crm_criacao_de_negocio_canal_fk foreign key (organization_id, channel_session_id)
    references public.channel_sessions (organization_id, id) on delete cascade,
  constraint crm_criacao_de_negocio_regras_lista
    check (jsonb_typeof(regras) = 'array' and octet_length(regras::text) <= 32768)
);

alter table public.crm_criacao_de_negocio enable row level security;
drop policy if exists crm_criacao_de_negocio_select on public.crm_criacao_de_negocio;
drop policy if exists crm_criacao_de_negocio_write on public.crm_criacao_de_negocio;
create policy crm_criacao_de_negocio_select on public.crm_criacao_de_negocio
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_criacao_de_negocio_write on public.crm_criacao_de_negocio
  for all using ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin'))
  with check ((organization_id in (select public.fn_user_org_ids())) and public.fn_role_at_least(organization_id, 'admin'));
revoke all on public.crm_criacao_de_negocio from anon;
grant select, insert, update, delete on public.crm_criacao_de_negocio to authenticated;
grant all on public.crm_criacao_de_negocio to service_role;
drop trigger if exists trg_crm_criacao_de_negocio_updated_at on public.crm_criacao_de_negocio;
create trigger trg_crm_criacao_de_negocio_updated_at
  before update on public.crm_criacao_de_negocio
  for each row execute function public.fn_set_updated_at();
comment on table public.crm_criacao_de_negocio is
  'Criação de negócio por dispositivo (fork Escale, migration 9205; F1): o interruptor e as condições da Clint. Sem linha, o negócio nasce na origem padrão (o original). Membros leem; administrador escreve.';

create or replace function public.fn_escale_nascer_negocio_do_dispositivo(
  p_org uuid,
  p_contact uuid,
  p_pipeline uuid,
  p_stage uuid,
  p_title text,
  p_source text,
  p_source_metadata jsonb default '{}'::jsonb,
  p_tags_do_contato text[] default '{}'::text[]
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_tags text[];
  v_novas text[];
begin
  -- A mesma trava do fn_nascer_lead_da_conversa: as duas portas de nascimento não correm.
  perform pg_advisory_xact_lock(hashtextextended(p_org::text || ':' || p_contact::text, 0));

  -- "Se o contato já possui um negócio nessa origem, nenhum novo negócio é criado e o negócio existente não é alterado."
  if exists (select 1 from public.crm_leads l where l.organization_id = p_org and l.contact_id = p_contact and l.pipeline_id = p_pipeline) then
    return null;
  end if;

  insert into public.crm_leads (organization_id, pipeline_id, stage_id, contact_id, title, source, source_metadata, tags, currency)
  values (p_org, p_pipeline, p_stage, p_contact, p_title, p_source, coalesce(p_source_metadata, '{}'::jsonb), '{}'::text[],
          coalesce((select o.currency from public.organizations o where o.id = p_org), 'BRL'))
  returning id into v_id;

  -- As tags da condição no contato: a régua da 9007 (minúsculas, aparadas, 40, sem `cliente`, sem repetir).
  begin
    select coalesce(array_agg(x.tag order by x.ordem), '{}'::text[]) into v_novas
      from (
        select left(lower(btrim(t.tag, E' \t\r\n\f\x0b')), 40) as tag, min(t.ordem) as ordem
          from unnest(coalesce(p_tags_do_contato, '{}'::text[])) with ordinality as t(tag, ordem)
         group by 1
      ) x
     where x.tag <> '' and x.tag <> 'cliente';
    if cardinality(v_novas) > 0 then
      select coalesce(c.tags, '{}'::text[]) into v_tags
        from public.contacts c
       where c.organization_id = p_org and c.id = p_contact and c.is_anonymized = false and c.is_merged_into is null
       for no key update;
      if found then
        select coalesce(array_agg(n.tag order by n.ordem), '{}'::text[]) into v_novas
          from unnest(v_novas) with ordinality as n(tag, ordem)
         where not exists (select 1 from unnest(v_tags) as a(tag) where left(lower(btrim(a.tag, E' \t\r\n\f\x0b')), 40) = n.tag);
        if cardinality(v_novas) > 0 then
          update public.contacts set tags = v_tags || v_novas, updated_at = now() where organization_id = p_org and id = p_contact;
          perform public.emit_event(
            'contact.tag_added', 'contact', p_contact,
            jsonb_build_object('added_tags', to_jsonb(v_novas), 'tags', to_jsonb(v_tags || v_novas)),
            jsonb_build_object('actor_type', 'system', 'actor_id', 'fn_escale_nascer_negocio_do_dispositivo'),
            p_org);
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'fn_escale_nascer_negocio_do_dispositivo: tags não aplicadas: % (%)', sqlerrm, sqlstate;
  end;

  return v_id;
end;
$$;

revoke all on function public.fn_escale_nascer_negocio_do_dispositivo(uuid, uuid, uuid, uuid, text, text, jsonb, text[]) from public, anon, authenticated;
grant execute on function public.fn_escale_nascer_negocio_do_dispositivo(uuid, uuid, uuid, uuid, text, text, jsonb, text[]) to service_role;
comment on function public.fn_escale_nascer_negocio_do_dispositivo(uuid, uuid, uuid, uuid, text, text, jsonb, text[]) is
  'Fork Escale (9205): o negócio que nasce pela condição do dispositivo (F1). Nulo = o contato já tem negócio nessa origem. Invoker, só o service role (o ingest).';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Baseline e varredura**

No `supabase/baseline.sql`, o bloco (sem a linha `-- manifest:`, sem o `do $f$ …` e sem o `notify`) logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----`, depois do da 9204. Em `tests/invariants/rls-completude-varredura.test.ts`, `PROVA_PROPRIA`, depois das da 9204:

```ts
  crm_criacao_de_negocio: "tests/invariants/escale-criacao-de-negocio-9205.test.ts",
```

- [ ] **Step 3: A prova (roda na Task 9)**

Create `tests/invariants/escale-criacao-de-negocio-9205.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_AGENT_A, GOV_ORG, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * CRIAÇÃO DE NEGÓCIO POR DISPOSITIVO (fork Escale, migration 9205) — prova contra
 * Postgres real: só admin grava a configuração, todo membro lê; a RPC não cria
 * quando o contato já tem negócio na origem, cria na origem/etapa e põe as tags
 * no contato (minúsculas, sem `cliente`); só o service role executa. `pnpm test:db`.
 */
const SESSAO = "e5ca1e00-9205-4000-8000-0000000000a1";
const CT = "e5ca1e00-9205-4000-8000-0000000000c1";
const ORIGEM = "e5ca1e00-9205-4000-8000-0000000000e1";
const ETAPA = "e5ca1e00-9205-4000-8000-0000000000e2";
const nascer = () =>
  `select public.fn_escale_nascer_negocio_do_dispositivo('${GOV_ORG}', '${CT}', '${ORIGEM}', '${ETAPA}', 'Novo', 'whatsapp', '{}'::jsonb, array['VIP', 'cliente', ' vip '])`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_leads where contact_id = '${CT}';
    delete from public.crm_criacao_de_negocio where channel_session_id = '${SESSAO}';
    insert into public.channel_sessions (id, organization_id, waha_session_name, webhook_secret_encrypted)
      values ('${SESSAO}', '${GOV_ORG}', 'criacao-9205', '\\x00'::bytea) on conflict (id) do nothing;
    insert into public.contacts (id, organization_id, display_name, tags) values ('${CT}', '${GOV_ORG}', 'Criacao Nove', array['lead'])
      on conflict (id) do update set tags = array['lead'];
    insert into public.crm_pipelines (id, organization_id, name, slug) values ('${ORIGEM}', '${GOV_ORG}', 'Criação 9205', 'criacao-9205') on conflict (id) do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, position) values ('${ETAPA}', '${GOV_ORG}', '${ORIGEM}', 'Entrada', 1) on conflict (id) do nothing;
  `);
});

describe("crm_criacao_de_negocio", () => {
  it("admin grava; atendente lê e não grava", () => {
    expect(writeCountAs(GOV_ADMIN, `insert into public.crm_criacao_de_negocio (channel_session_id, organization_id, ligado) values ('${SESSAO}', '${GOV_ORG}', true)`)).toBe(1);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_criacao_de_negocio where channel_session_id = '${SESSAO}'`)).toBe(1);
    expect(writeCountAs(GOV_AGENT_A, `update public.crm_criacao_de_negocio set ligado = false where channel_session_id = '${SESSAO}'`)).toBe(0);
  });
});

describe("fn_escale_nascer_negocio_do_dispositivo", () => {
  it("cria na origem e etapa, com as tags no contato; a segunda vez não cria", () => {
    const id = sql(`${nascer()};`).trim();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(sql(`select stage_id from public.crm_leads where id = '${id}';`).trim()).toBe(ETAPA);
    expect(sql(`select array_to_string(tags, ',') from public.contacts where id = '${CT}';`).trim()).toBe("lead,vip");
    expect(sql(`${nascer()};`).trim()).toBe("");
  });

  it("só o service role executa", () => {
    expect(() => countAs(GOV_ADMIN, `select count(*) from (${nascer()}) x`)).toThrow();
  });
});
```

Confira o seed de origem/etapa contra `tests/invariants/escale-distribuicao-de-dono.test.ts` (colunas obrigatórias) e como `sql` devolve nulo (linha vazia).

- [ ] **Step 4: As cercas e o commit**

Run: `corepack pnpm vitest run tests/unit/manifest-x-migrations.test.ts tests/invariants/rls-completude-varredura.test.ts $(ls tests/unit | grep -E "definer|hardening" | sed 's#^#tests/unit/#')`
Expected: PASS.

```bash
git add supabase/migrations/20261109120000_9205_criacao_de_negocio_por_dispositivo.sql supabase/baseline.sql tests/invariants/escale-criacao-de-negocio-9205.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "feat(escale): migration 9205 — criação de negócio por dispositivo e o nascimento pela condição (Fase 3E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: O nascimento pelo dispositivo (o encaixe) e as rotas

**Files:**
- Create: `lib/escale/conversas/criacao-de-negocio-banco.ts`, `app/api/v1/criacao-de-negocio/[channel_session_id]/route.ts`, `app/api/v1/criacao-de-negocio/origens/route.ts`, `tests/unit/escale-nascimento-pelo-dispositivo.test.ts`
- Modify: `lib/leads/nascimento-do-lead.ts`, `lib/channels/pos-entrada.ts`, `lib/audit/actions.ts`

**Interfaces:**
- Consumes: `lerCriacao`, `primeiraRegraQueCasa`, `criacaoDeNegocioSchema` (Task 1); `rotuloDoContato`, `ehIdentificadorTecnico`, `SEM_NOME` (`lib/contacts/rotulo-do-contato`); `emitLeadActivity` (`lib/leads/activity-emitter`); `ORIGEM_DO_WHATSAPP` (`lib/channels/origem-do-negocio`).
- Produces: `DecisaoDoDispositivo = { tipo: "padrao" } | { tipo: "nenhum"; motivo: "desligado" | "sem_texto" | "nao_e_a_primeira" | "sem_regra" } | { tipo: "regra"; regra: RegraDeCriacao }`; `decisaoDoDispositivo(db, { organizationId, conversationId, texto, messageId })`; `nascimentoPeloDispositivo(db, dados, contato) → Promise<NascimentoDoLead | null>`; `GET /api/v1/criacao-de-negocio/[channel_session_id]` → `{ data: { configurado: boolean; criacao: CriacaoDeNegocio } }`; `PUT` (admin, `criacaoDeNegocioSchema`) → `{ data: { criacao } }`; `GET /api/v1/criacao-de-negocio/origens` → `{ data: Array<{ id; nome; etapas: Array<{ id; nome }> }> }`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-nascimento-pelo-dispositivo.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { decisaoDoDispositivo, nascimentoPeloDispositivo } from "@/lib/escale/conversas/criacao-de-negocio-banco";
import { bancoPorTabela } from "@/tests/helpers/supabase-por-tabela";

vi.mock("@/lib/leads/activity-emitter", () => ({ emitLeadActivity: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const ORG = "a0000000-0000-4000-8000-0000000000aa";
const CV = "c0000000-0000-4000-8000-000000000001";
const MSG = "d0000000-0000-4000-8000-000000000001";
const O = "e0000000-0000-4000-8000-000000000001";
const E = "e0000000-0000-4000-8000-000000000002";
const regra = { id: "r1", nome: "Condição 1", tipo: "contem", mensagens: ["orçamento"], origem_id: O, etapa_id: E, tags: ["vip"], manter_atendente: true };
const base = (config: object | null, primeira = MSG, extra: Record<string, unknown[]> = {}) =>
  bancoPorTabela(
    {
      conversations: [{ id: CV, channel_session_id: "cs1", assigned_to_user_id: null }],
      crm_criacao_de_negocio: config ? [config] : [],
      messages: [{ id: primeira }],
      crm_leads: [{ id: "lead-novo", owner_user_id: "dono-1" }],
      ...extra,
    },
    { rpc: (nome) => (nome === "fn_escale_nascer_negocio_do_dispositivo" ? { data: "lead-novo", error: null } : { data: null, error: null }) },
  );
const consulta = { organizationId: ORG, conversationId: CV, texto: "Quero um orçamento", messageId: MSG };

beforeEach(() => vi.clearAllMocks());

describe("decisaoDoDispositivo (N3)", () => {
  it("sem configuração = o padrão de hoje", async () => {
    expect(await decisaoDoDispositivo(base(null).db as never, consulta)).toEqual({ tipo: "padrao" });
  });
  it("desligado, sem texto, não é a primeira, sem regra = nenhum", async () => {
    expect(await decisaoDoDispositivo(base({ ligado: false, regras: [regra] }).db as never, consulta)).toEqual({ tipo: "nenhum", motivo: "desligado" });
    expect(await decisaoDoDispositivo(base({ ligado: true, regras: [regra] }).db as never, { ...consulta, texto: null })).toEqual({ tipo: "nenhum", motivo: "sem_texto" });
    expect(await decisaoDoDispositivo(base({ ligado: true, regras: [regra] }, "outra").db as never, consulta)).toEqual({ tipo: "nenhum", motivo: "nao_e_a_primeira" });
    expect(await decisaoDoDispositivo(base({ ligado: true, regras: [regra] }).db as never, { ...consulta, texto: "oi" })).toEqual({ tipo: "nenhum", motivo: "sem_regra" });
  });
  it("a condição que casa", async () => {
    expect(await decisaoDoDispositivo(base({ ligado: true, regras: [regra] }).db as never, consulta)).toMatchObject({ tipo: "regra", regra: { id: "r1" } });
  });
});

describe("nascimentoPeloDispositivo (N5–N7)", () => {
  it("padrão devolve null (o original segue)", async () => {
    expect(await nascimentoPeloDispositivo(base(null).db as never, { organizationId: ORG, contactId: "ct", conversationId: CV, nomeDoContato: null, ...consulta }, null)).toBeNull();
  });
  it("nenhum vira 'pelo_dispositivo'; a regra nasce pela RPC com as tags e mantém o atendente", async () => {
    const off = base({ ligado: false, regras: [] });
    expect(await nascimentoPeloDispositivo(off.db as never, { organizationId: ORG, contactId: "ct", conversationId: CV, nomeDoContato: null, ...consulta }, null)).toEqual({ criado: false, motivo: "pelo_dispositivo", detalhe: "desligado" });
    const on = base({ ligado: true, regras: [regra] });
    const r = await nascimentoPeloDispositivo(on.db as never, { organizationId: ORG, contactId: "ct", conversationId: CV, nomeDoContato: "Maria", ...consulta }, { display_name: "Maria", name: null, phone_number: null });
    expect(r).toEqual({ criado: true, leadId: "lead-novo", pipelineId: O, stageId: E });
    expect(on.db.rpc).toHaveBeenCalledWith("fn_escale_nascer_negocio_do_dispositivo", expect.objectContaining({ p_pipeline: O, p_stage: E, p_title: "Maria", p_tags_do_contato: ["vip"] }));
    expect(on.db.rpc).toHaveBeenCalledWith("fn_conversation_assign", expect.objectContaining({ p_conversation_id: CV, p_to_user_id: "dono-1", p_reason: "routing" }));
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-nascimento-pelo-dispositivo.test.ts`
Expected: FAIL.

- [ ] **Step 2: `criacao-de-negocio-banco.ts`**

Create `lib/escale/conversas/criacao-de-negocio-banco.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { ORIGEM_DO_WHATSAPP } from "@/lib/channels/origem-do-negocio";
import { ehIdentificadorTecnico, rotuloDoContato, SEM_NOME } from "@/lib/contacts/rotulo-do-contato";
import { emitLeadActivity } from "@/lib/leads/activity-emitter";
import type { DadosDoNascimento, NascimentoDoLead } from "@/lib/leads/nascimento-do-lead";
import { logger } from "@/lib/logger";

import { lerCriacao, primeiraRegraQueCasa, type RegraDeCriacao } from "./criacao-de-negocio";

/**
 * O NASCIMENTO PELO DISPOSITIVO (fork Escale, Fase 3E; F1; N3–N7). Chamado pelo
 * encaixe em `garantirLeadDaConversa` com o service role do ingest. `null` =
 * dispositivo nunca configurado: o original segue (origem padrão, risco 7).
 */
export type DecisaoDoDispositivo =
  | { tipo: "padrao" }
  | { tipo: "nenhum"; motivo: "desligado" | "sem_texto" | "nao_e_a_primeira" | "sem_regra" }
  | { tipo: "regra"; regra: RegraDeCriacao };

export async function decisaoDoDispositivo(
  db: SupabaseClient,
  q: { organizationId: string; conversationId: string; texto: string | null; messageId: string | null },
): Promise<DecisaoDoDispositivo> {
  const { data: conversa } = await db.from("conversations").select("id, channel_session_id").eq("organization_id", q.organizationId).eq("id", q.conversationId).maybeSingle();
  const canal = (conversa as { channel_session_id?: string } | null)?.channel_session_id;
  if (!canal) return { tipo: "padrao" };
  const { data: linha } = await db.from("crm_criacao_de_negocio").select("ligado, regras").eq("organization_id", q.organizationId).eq("channel_session_id", canal).maybeSingle();
  if (!linha) return { tipo: "padrao" };
  const criacao = lerCriacao(linha);
  if (!criacao.ligado) return { tipo: "nenhum", motivo: "desligado" };
  if (q.texto === null) return { tipo: "nenhum", motivo: "sem_texto" };
  const { data: primeira } = await db
    .from("messages")
    .select("id")
    .eq("organization_id", q.organizationId)
    .eq("conversation_id", q.conversationId)
    .eq("direction", "inbound")
    .order("sent_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!primeira || (q.messageId && (primeira as { id: string }).id !== q.messageId)) return { tipo: "nenhum", motivo: "nao_e_a_primeira" };
  const regra = primeiraRegraQueCasa(criacao.regras, q.texto);
  return regra ? { tipo: "regra", regra } : { tipo: "nenhum", motivo: "sem_regra" };
}

type ContatoLido = { display_name?: string | null; name?: string | null; phone_number?: string | null } | null;

export async function nascimentoPeloDispositivo(
  db: SupabaseClient,
  dados: DadosDoNascimento,
  contato: ContatoLido,
): Promise<NascimentoDoLead | null> {
  const decisao = await decisaoDoDispositivo(db, {
    organizationId: dados.organizationId,
    conversationId: dados.conversationId,
    texto: dados.texto ?? null,
    messageId: dados.messageId ?? null,
  });
  if (decisao.tipo === "padrao") return null;
  if (decisao.tipo === "nenhum") return { criado: false, motivo: "pelo_dispositivo", detalhe: decisao.motivo };
  const origem = dados.origem ?? ORIGEM_DO_WHATSAPP;
  const doCadastro = rotuloDoContato(contato);
  const doPayload = (dados.nomeDoContato ?? "").trim();
  const titulo = doCadastro !== SEM_NOME ? doCadastro : doPayload && !ehIdentificadorTecnico(doPayload) ? doPayload : `Novo contato pelo ${origem.rotulo}`;
  const { regra } = decisao;
  const { data: leadId, error } = await db.rpc("fn_escale_nascer_negocio_do_dispositivo", {
    p_org: dados.organizationId,
    p_contact: dados.contactId,
    p_pipeline: regra.origem_id,
    p_stage: regra.etapa_id,
    p_title: titulo,
    p_source: origem.source,
    p_source_metadata: {},
    p_tags_do_contato: regra.tags,
  });
  if (error) return { criado: false, motivo: "erro", detalhe: error.message.slice(0, 120) };
  if (!leadId) return { criado: false, motivo: "ja_existe" };
  const id = leadId as string;
  await emitLeadActivity(db, {
    organizationId: dados.organizationId,
    leadId: id,
    contactId: dados.contactId,
    type: "lead_created",
    sourceModule: "canal.ingest",
    sourceId: dados.conversationId,
    actor: { type: "webhook_source", id: "canal-inbound" },
    reason: `${origem.motivo} (${regra.nome})`,
    payload: { conversation_id: dados.conversationId, condicao: regra.nome },
  });
  const { error: erroEvento } = await db.rpc("emit_event", {
    p_event_type: "lead.created",
    p_entity_kind: "crm_lead",
    p_entity_id: id,
    p_payload: { pipeline_id: regra.origem_id, stage_id: regra.etapa_id, conversation_id: dados.conversationId },
    p_metadata: { source: "criacao-pelo-dispositivo" },
    p_organization_id: dados.organizationId,
  });
  if (erroEvento) logger.warn("criacao-pelo-dispositivo: lead.created não emitido", { organization_id: dados.organizationId, lead_id: id });
  if (regra.manter_atendente) await manterAtendente(db, dados.organizationId, dados.conversationId, id);
  return { criado: true, leadId: id, pipelineId: regra.origem_id, stageId: regra.etapa_id };
}

/** N7: a conversa vai para o dono que a distribuição da 1K deu ao negócio. Falha vira aviso. */
async function manterAtendente(db: SupabaseClient, org: string, conversationId: string, leadId: string): Promise<void> {
  try {
    const { data: lead } = await db.from("crm_leads").select("id, owner_user_id").eq("organization_id", org).eq("id", leadId).maybeSingle();
    const dono = (lead as { owner_user_id?: string | null } | null)?.owner_user_id;
    if (!dono) return;
    const { data: conversa } = await db.from("conversations").select("id, assigned_to_user_id").eq("organization_id", org).eq("id", conversationId).maybeSingle();
    if ((conversa as { assigned_to_user_id?: string | null } | null)?.assigned_to_user_id === dono) return;
    const { error } = await db.rpc("fn_conversation_assign", {
      p_organization_id: org,
      p_conversation_id: conversationId,
      p_to_user_id: dono,
      p_reason: "routing",
      p_expected_assignee: null as unknown as string,
      p_enforce_expected: false,
    });
    if (error) logger.warn("criacao-pelo-dispositivo: atendente não mantido", { organization_id: org, conversation_id: conversationId, error: error.message.slice(0, 120) });
  } catch (err) {
    logger.warn("criacao-pelo-dispositivo: atendente não mantido", { organization_id: org, detail: err instanceof Error ? err.message.slice(0, 120) : "erro" });
  }
}
```

Confira os campos que `emitLeadActivity` aceita (o original passa estes mesmos em `nascimento-do-lead.ts`) e se `ORIGEM_DO_WHATSAPP` tem `rotulo`, `source` e `motivo` (tem: é o `OrigemDoNascimento`). Confira também se `conversation_assignment_events.reason` aceita `routing` (o roteamento do original usa).

- [ ] **Step 3: O encaixe no original**

Em `lib/leads/nascimento-do-lead.ts`:

```ts
export type MotivoSemLead =
  | "ja_existe"
  …
  | "erro" // qualquer falha de escrita
  // FORK ESCALE · Fase 3E: o dispositivo tem "Criação de negócio" configurada e decidiu não criar.
  | "pelo_dispositivo";
```

em `DadosDoNascimento`, depois de `origem?: OrigemDoNascimento;`:

```ts
  /** FORK ESCALE · Fase 3E: o texto e o id da mensagem que chegou (as condições do dispositivo). */
  texto?: string | null;
  messageId?: string | null;
```

o import junto dos outros:

```ts
// FORK ESCALE · Fase 3E: a criação de negócio por dispositivo (F1).
import { nascimentoPeloDispositivo } from "@/lib/escale/conversas/criacao-de-negocio-banco";
```

e, em `garantirLeadDaConversa`, logo depois de `if ((contato as { is_personal?: boolean } | null)?.is_personal === true) return { criado: false, motivo: "contato_pessoal" };`:

```ts
  // FORK ESCALE · Fase 3E: dispositivo com "Criação de negócio" configurada decide (F1;
  // decisões 5 e 7 do roteiro). `null` = nunca configurado: segue o de sempre.
  const peloDispositivo = await nascimentoPeloDispositivo(db, dados, contato);
  if (peloDispositivo) return peloDispositivo;
```

Em `lib/channels/pos-entrada.ts`, `abrirDemanda`, no objeto de `garantirLeadDaConversa(admin, { … })`, depois de `origem: origemDoNegocioPeloCanal(entrada.canal),`:

```ts
      // FORK ESCALE · Fase 3E: as condições do dispositivo leem a mensagem.
      texto: entrada.texto,
      messageId: entrada.messageId,
```

Em `lib/audit/actions.ts`, depois do bloco da 3D: `"channel_session.deal_creation_updated",`.

- [ ] **Step 4: As rotas**

Create `app/api/v1/criacao-de-negocio/[channel_session_id]/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { criacaoDeNegocioSchema, lerCriacao } from "@/lib/escale/conversas/criacao-de-negocio";
import { lerUuid } from "@/lib/escale/origens/preferencias";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ channel_session_id: string }> };

/** A criação de negócio de um dispositivo (fork Escale, Fase 3E; F1). Todo membro lê; administrador grava. */
export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_criacao_de_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const canal = lerUuid((await ctx.params).channel_session_id);
  if (!canal) return fail("not_found", t("Dispositivo não encontrado."), 404, { requestId });
  const { data, error } = await (await createClient()).from("crm_criacao_de_negocio").select("ligado, regras").eq("organization_id", authz.org.orgId).eq("channel_session_id", canal).maybeSingle();
  if (error) return fail("internal_error", error.message, 500, { requestId });
  return ok({ configurado: !!data, criacao: lerCriacao(data) }, { requestId });
}

export async function PUT(req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "crm_criacao_de_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const canal = lerUuid((await ctx.params).channel_session_id);
  if (!canal) return fail("not_found", t("Dispositivo não encontrado."), 404, { requestId });
  const lido = await lerJson(req);
  const parsed = criacaoDeNegocioSchema.safeParse(lido.ok ? lido.json : null);
  if (!parsed.success) return fail("validation_failed", t("Ocorreu um erro ao salvar."), 422, { requestId });
  const supabase = await createClient();
  const { data: dispositivo } = await supabase.from("channel_sessions").select("id").eq("organization_id", authz.org.orgId).eq("id", canal).maybeSingle();
  if (!dispositivo) return fail("not_found", t("Dispositivo não encontrado."), 404, { requestId });
  const { error } = await supabase.from("crm_criacao_de_negocio").upsert(
    { channel_session_id: canal, organization_id: authz.org.orgId, ligado: parsed.data.ligado, regras: parsed.data.regras, atualizado_por: authz.user.id, updated_at: new Date().toISOString() },
    { onConflict: "channel_session_id" },
  );
  if (error) return fail("internal_error", error.message, 500, { requestId });
  void audit({ action: "channel_session.deal_creation_updated", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "channel_session", resourceId: canal, requestId, metadata: { ligado: parsed.data.ligado, condicoes: parsed.data.regras.length } });
  return ok({ criacao: parsed.data }, { requestId });
}
```

Create `app/api/v1/criacao-de-negocio/origens/route.ts`:

```ts
import { randomUUID } from "node:crypto";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type Lida = { id: string; name: string; crm_stages: Array<{ id: string; name: string; position: number | string; is_archived: boolean; is_won: boolean; is_lost: boolean }> | null };

/** As origens e etapas que a condição oferece (N8): não arquivadas, sem ganho e perda, na ordem do quadro, pela sessão. */
export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_pipelines" });
  if (!authz.ok) return authz.response;
  const { data, error } = await (await createClient())
    .from("crm_pipelines")
    .select("id, name, position, crm_stages(id, name, position, is_archived, is_won, is_lost)")
    .eq("organization_id", authz.org.orgId)
    .eq("is_archived", false)
    .order("position", { ascending: true });
  if (error) return fail("internal_error", error.message, 500, { requestId });
  return ok(
    ((data ?? []) as unknown as Lida[]).map((p) => ({
      id: p.id,
      nome: p.name,
      etapas: [...(p.crm_stages ?? [])].filter((s) => !s.is_archived && !s.is_won && !s.is_lost).sort((a, b) => Number(a.position) - Number(b.position)).map((s) => ({ id: s.id, nome: s.name })),
    })),
    { requestId },
  );
}
```

- [ ] **Step 5: Rodar e ver passar (com os testes do nascimento e da pós-entrada)**

Run: `corepack pnpm vitest run tests/unit/escale-nascimento-pelo-dispositivo.test.ts $(ls tests/unit | grep -E "pos-entrada|nascimento" | sed 's#^#tests/unit/#') && corepack pnpm prettier --write lib/escale/conversas/criacao-de-negocio-banco.ts app/api/v1/criacao-de-negocio tests/unit/escale-nascimento-pelo-dispositivo.test.ts && corepack pnpm eslint lib/escale/conversas lib/leads/nascimento-do-lead.ts lib/channels/pos-entrada.ts app/api/v1/criacao-de-negocio && corepack pnpm typecheck`
Expected: PASS. Os testes do original que mockam o Supabase do nascimento não têm `crm_criacao_de_negocio`: a leitura volta vazia → `padrao` → nada muda. Se algum mock não tiver `.from("conversations")` encadeável e quebrar, mocke `@/lib/escale/conversas/criacao-de-negocio-banco` nele com `nascimentoPeloDispositivo: vi.fn(async () => null)`.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/conversas/criacao-de-negocio-banco.ts lib/leads/nascimento-do-lead.ts lib/channels/pos-entrada.ts lib/audit/actions.ts app/api/v1/criacao-de-negocio tests/unit/escale-nascimento-pelo-dispositivo.test.ts
git commit -m "feat(escale): o negócio nasce pela condição do dispositivo; rotas da criação de negócio (Fase 3E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: A aba "Criação de negócio" na janela do dispositivo

**Files:**
- Create: `hooks/escale/useCriacaoDeNegocio.ts`, `components/escale/conversas/configuracoes/canais/AbaCriacaoDeNegocio.tsx`, `CondicaoDeCriacao.tsx`, `CampoDeMensagens.tsx`, `TagsDaCondicao.tsx`, `tests/unit/escale-aba-criacao-de-negocio.test.tsx`
- Modify: `components/escale/conversas/configuracoes/canais/JanelaDoDispositivo.tsx` (3C)

**Interfaces:**
- Produces: `useCriacaoDeNegocio(canalId) → UseQueryResult<{ configurado; criacao }>` (chave `["criacao-de-negocio", canalId]`); `useSalvarCriacaoDeNegocio()` (mutation `{ canalId, criacao }`); `useOrigensDaCriacao(ativo)`; `AbaCriacaoDeNegocio({ rascunho, aoMudar, configurado, origens, podeEditar })`; `CondicaoDeCriacao({ regra, numero, aberta, aoAlternar, aoMudar, aoExcluir?, origens, podeEditar })`; `CampoDeMensagens({ valores, aoMudar, desabilitado })`; `TagsDaCondicao({ valores, aoMudar, desabilitado })`.

Abra 16/10-01 a 03 e c104–c108 antes.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-aba-criacao-de-negocio.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "o1", role: "admin" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({ useContactTagVocabulary: () => ({ data: ["vip"] }) }));

import { AbaCriacaoDeNegocio } from "@/components/escale/conversas/configuracoes/canais/AbaCriacaoDeNegocio";
import { novaRegra } from "@/lib/escale/conversas/criacao-de-negocio";

const origens = [{ id: "a0000000-0000-4000-8000-000000000001", nome: "INSS", etapas: [{ id: "a0000000-0000-4000-8000-000000000002", nome: "Entrada" }] }];

describe("AbaCriacaoDeNegocio (16/10-01, c105–c108)", () => {
  it("desligada: o cartão e o aviso de quem nunca configurou; ligar cria a Condição 1", () => {
    const aoMudar = vi.fn();
    render(<AbaCriacaoDeNegocio rascunho={{ ligado: false, regras: [] }} aoMudar={aoMudar} configurado={false} origens={origens} podeEditar />);
    expect(screen.getByText("Criar um negócio automaticamente")).toBeInTheDocument();
    expect(screen.getByText(/nascem na origem padrão/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Criar um negócio automaticamente" }));
    expect(aoMudar).toHaveBeenCalledWith(expect.objectContaining({ ligado: true, regras: [expect.objectContaining({ nome: "Condição 1", tipo: "igual" })] }));
  });

  it("ligada: a condição abre; a segunda tem a lixeira com a confirmação; '+ Adicionar nova condição'", () => {
    const aoMudar = vi.fn();
    const r1 = novaRegra(1);
    const r2 = novaRegra(2);
    render(<AbaCriacaoDeNegocio rascunho={{ ligado: true, regras: [r1, r2] }} aoMudar={aoMudar} configurado origens={origens} podeEditar />);
    expect(screen.queryByRole("button", { name: "Excluir condição Condição 1" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir condição Condição 2" }));
    expect(screen.getByText("Tem certeza que deseja excluir essa condição?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sim" }));
    expect(aoMudar).toHaveBeenCalledWith({ ligado: true, regras: [r1] });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar nova condição/ }));
    expect(aoMudar).toHaveBeenLastCalledWith(expect.objectContaining({ regras: expect.arrayContaining([expect.objectContaining({ nome: "Condição 3" })]) }));
  });

  it("dentro da condição: Enter adiciona a mensagem; 'Qualquer mensagem' esconde o campo", () => {
    const aoMudar = vi.fn();
    render(<AbaCriacaoDeNegocio rascunho={{ ligado: true, regras: [novaRegra(1)] }} aoMudar={aoMudar} configurado origens={origens} podeEditar />);
    fireEvent.click(screen.getByRole("button", { name: "Condição 1" }));
    const campo = screen.getByPlaceholderText("Digite uma ou mais mensagens");
    fireEvent.change(campo, { target: { value: "Quero orçamento" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(aoMudar).toHaveBeenLastCalledWith(expect.objectContaining({ regras: [expect.objectContaining({ mensagens: ["Quero orçamento"] })] }));
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-aba-criacao-de-negocio.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Os hooks**

Create `hooks/escale/useCriacaoDeNegocio.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { CriacaoDeNegocio } from "@/lib/escale/conversas/criacao-de-negocio";

export type OrigemDaCriacao = { id: string; nome: string; etapas: Array<{ id: string; nome: string }> };
const chave = (canalId: string) => ["criacao-de-negocio", canalId] as const;

export function useCriacaoDeNegocio(canalId: string | null) {
  return useQuery({
    queryKey: chave(canalId ?? ""),
    enabled: !!canalId,
    queryFn: async () => (await apiClient.get<{ data: { configurado: boolean; criacao: CriacaoDeNegocio } }>(`/api/v1/criacao-de-negocio/${canalId}`)).data,
  });
}

export function useSalvarCriacaoDeNegocio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ canalId, criacao }: { canalId: string; criacao: CriacaoDeNegocio }) =>
      (await apiClient.put<{ data: { criacao: CriacaoDeNegocio } }>(`/api/v1/criacao-de-negocio/${canalId}`, criacao)).data,
    onSuccess: (_r, v) => void qc.invalidateQueries({ queryKey: chave(v.canalId) }),
  });
}

export function useOrigensDaCriacao(ativo: boolean) {
  return useQuery({
    queryKey: ["criacao-de-negocio", "origens"],
    enabled: ativo,
    staleTime: 5 * 60_000,
    queryFn: async () => (await apiClient.get<{ data: OrigemDaCriacao[] }>("/api/v1/criacao-de-negocio/origens")).data,
  });
}
```

- [ ] **Step 3: As peças da condição**

Create `components/escale/conversas/configuracoes/canais/CampoDeMensagens.tsx`:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { useT } from "@/hooks/i18n/useT";
import { adicionarMensagem } from "@/lib/escale/conversas/criacao-de-negocio";
import { X } from "@/lib/ui/icons-da-casca";

/** As mensagens da condição (16/10-01): Enter vira chip; até 10, sem repetir (as frases da Clint). */
export function CampoDeMensagens({ valores, aoMudar, desabilitado }: { valores: string[]; aoMudar: (v: string[]) => void; desabilitado: boolean }) {
  const t = useT();
  const [texto, setTexto] = useState("");
  return (
    <div className="flex min-h-9 flex-1 flex-wrap items-center gap-1 rounded-casca-gatilho bg-casca-busca px-2 py-1">
      {valores.map((m) => (
        <span key={m} className="flex h-6 items-center gap-1 rounded-[4px] bg-surface px-2 text-[11px] text-casca-texto">
          {m}
          {!desabilitado ? (
            <button type="button" aria-label={`${t("Remover")} ${m}`} onClick={() => aoMudar(valores.filter((x) => x !== m))} className="text-casca-suave hover:text-casca-texto">
              <X size={12} aria-hidden />
            </button>
          ) : null}
        </span>
      ))}
      <input
        value={texto}
        disabled={desabilitado}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          const r = adicionarMensagem(valores, texto);
          if (!r.ok) {
            toast.error(t(r.erro));
            return;
          }
          aoMudar(r.lista);
          setTexto("");
        }}
        placeholder={valores.length ? "" : t("Digite uma ou mais mensagens")}
        className="h-7 min-w-[120px] flex-1 bg-transparent text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
      />
    </div>
  );
}
```

Create `components/escale/conversas/configuracoes/canais/TagsDaCondicao.tsx`:

```tsx
"use client";
import { useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { ChipDeEtiqueta } from "@/components/tags/ChipDeEtiqueta";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { TAGS_DA_CONDICAO_MAX } from "@/lib/escale/conversas/criacao-de-negocio";
import { Plus, X } from "@/lib/ui/icons-da-casca";

/** "Adicionar tags ao contato" (16/10-01): a pílula "+ Adicionar tag" com o vocabulário e "criar" pelo texto. */
export function TagsDaCondicao({ valores, aoMudar, desabilitado }: { valores: string[]; aoMudar: (v: string[]) => void; desabilitado: boolean }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const vocabulario = useContactTagVocabulary(activeOrg?.orgId ?? null).data ?? [];
  const [texto, setTexto] = useState("");
  const termo = texto.trim().toLowerCase();
  const opcoes = vocabulario.filter((x) => x.toLowerCase().includes(termo) && !valores.includes(x)).slice(0, 30);
  const incluir = (tag: string) => {
    const [limpa] = normalizarTags([tag]);
    if (limpa && !valores.includes(limpa) && valores.length < TAGS_DA_CONDICAO_MAX) aoMudar([...valores, limpa]);
    setTexto("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {valores.map((tag) => (
        <span key={tag} className="flex items-center gap-0.5">
          <ChipDeEtiqueta tag={tag} className="h-5 px-1.5 text-[11px]" />
          {!desabilitado ? (
            <button type="button" aria-label={`${t("Remover")} ${tag}`} onClick={() => aoMudar(valores.filter((x) => x !== tag))} className="text-casca-suave hover:text-casca-texto">
              <X size={12} aria-hidden />
            </button>
          ) : null}
        </span>
      ))}
      {!desabilitado && valores.length < TAGS_DA_CONDICAO_MAX ? (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="flex h-6 items-center gap-1 rounded-full border border-casca-borda px-2 text-[11px] text-casca-texto hover:bg-casca-raia">
              <Plus size={12} aria-hidden />
              {t("Adicionar tag")}
            </button>
          </PopoverTrigger>
          <PainelSuspenso align="start" className="w-[240px] p-2">
            <input
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && termo) incluir(texto);
              }}
              placeholder={t("Buscar por...")}
              className="mb-2 h-8 w-full rounded-casca-gatilho bg-casca-busca px-2.5 text-[12px] outline-hidden placeholder:text-casca-meta"
            />
            <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
              {opcoes.map((tag) => (
                <button key={tag} type="button" onClick={() => incluir(tag)}>
                  <ChipDeEtiqueta tag={tag} className="h-5 px-1.5 text-[11px]" />
                </button>
              ))}
            </div>
          </PainelSuspenso>
        </Popover>
      ) : null}
    </div>
  );
}
```

Create `components/escale/conversas/configuracoes/canais/CondicaoDeCriacao.tsx`:

```tsx
"use client";
import { useState } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import type { OrigemDaCriacao } from "@/hooks/escale/useCriacaoDeNegocio";
import { useT } from "@/hooks/i18n/useT";
import { NOME_DA_CONDICAO_MAX, ROTULO_DO_TIPO_DE_MENSAGEM, TIPOS_DE_MENSAGEM, type RegraEmEdicao, type TipoDeMensagem } from "@/lib/escale/conversas/criacao-de-negocio";
import { ChevronDown, ChevronRight, Pencil, Trash2, X } from "@/lib/ui/icons-da-casca";

import { CampoDeMensagens } from "./CampoDeMensagens";
import { TagsDaCondicao } from "./TagsDaCondicao";

const ROTULO = "text-[13px] font-semibold text-casca-texto";

/** Uma condição (16/10-01, c105–c108): o acordeão, o nome editável, a lixeira com confirmação a partir da 2ª. */
export function CondicaoDeCriacao({
  regra,
  numero,
  aberta,
  aoAlternar,
  aoMudar,
  aoExcluir,
  origens,
  podeEditar,
}: {
  regra: RegraEmEdicao;
  numero: number;
  aberta: boolean;
  aoAlternar: () => void;
  aoMudar: (r: RegraEmEdicao) => void;
  aoExcluir?: () => void;
  origens: OrigemDaCriacao[];
  podeEditar: boolean;
}) {
  const t = useT();
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const etapas = origens.find((o) => o.id === regra.origem_id)?.etapas ?? [];
  const mudar = (parte: Partial<RegraEmEdicao>) => aoMudar({ ...regra, ...parte });

  return (
    <div className="rounded-lg border border-casca-borda bg-surface" data-numero={numero}>
      {editando !== null ? (
        <div className="flex items-center gap-2 p-2">
          <input autoFocus value={editando} maxLength={NOME_DA_CONDICAO_MAX} onChange={(e) => setEditando(e.target.value)} aria-label={t("Editar nome da condição")} className="h-9 flex-1 rounded-casca-gatilho bg-casca-busca px-3 text-[13px] outline-hidden" />
          <button type="button" disabled={!editando.trim()} onClick={() => { mudar({ nome: editando.trim() }); setEditando(null); }} className="h-8 rounded-casca-gatilho bg-casca-marca px-3 text-[13px] font-semibold text-white disabled:opacity-60">
            {t("Salvar")}
          </button>
          <button type="button" aria-label={t("Cancelar")} onClick={() => setEditando(null)} className="grid size-8 place-items-center rounded-casca-gatilho bg-casca-raia text-casca-suave">
            <X size={14} aria-hidden />
          </button>
        </div>
      ) : (
        <div className="group flex h-12 items-center gap-2 px-4">
          <button type="button" aria-expanded={aberta} onClick={aoAlternar} className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] text-casca-texto">
            {aberta ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
            <span className="truncate">{regra.nome}</span>
          </button>
          {podeEditar ? (
            <>
              <button type="button" aria-label={`${t("Editar nome da condição")} ${regra.nome}`} onClick={() => setEditando(regra.nome)} className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-casca-raia">
                <Pencil size={14} aria-hidden />
              </button>
              {aoExcluir ? (
                <Popover open={confirmando} onOpenChange={setConfirmando}>
                  <PopoverTrigger asChild>
                    <button type="button" aria-label={`${t("Excluir condição")} ${regra.nome}`} className="grid size-7 place-items-center rounded-casca-gatilho text-casca-alerta hover:bg-casca-raia">
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </PopoverTrigger>
                  <PainelSuspenso align="end" className="w-[220px] p-3">
                    <p className="text-[12px] text-casca-texto">{t("Tem certeza que deseja excluir essa condição?")}</p>
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" onClick={() => setConfirmando(false)} className="h-6 rounded-casca-gatilho border border-casca-borda px-2 text-[11px]">{t("Não")}</button>
                      <button type="button" onClick={() => { setConfirmando(false); aoExcluir(); }} className="h-6 rounded-casca-gatilho bg-casca-marca px-2 text-[11px] font-semibold text-white">{t("Sim")}</button>
                    </div>
                  </PainelSuspenso>
                </Popover>
              ) : null}
            </>
          ) : null}
        </div>
      )}
      {aberta ? (
        <div className="flex flex-col gap-4 border-t border-casca-borda px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <span className={ROTULO}>{t("Quando receber uma mensagem que")}</span>
            <div className="flex flex-col gap-2 md:flex-row">
              <SeletorDaCasca aparencia="janela" valor={regra.tipo} opcoes={TIPOS_DE_MENSAGEM.map((x) => ({ valor: x, rotulo: t(ROTULO_DO_TIPO_DE_MENSAGEM[x]) }))} aoMudar={(v) => mudar({ tipo: (v || "igual") as TipoDeMensagem })} vazioSoNoGatilho desabilitado={!podeEditar} aria-label={t("Quando receber uma mensagem que")} className="md:w-[180px]" />
              {regra.tipo !== "qualquer" ? <CampoDeMensagens valores={regra.mensagens} aoMudar={(m) => mudar({ mensagens: m })} desabilitado={!podeEditar} /> : null}
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={ROTULO}>{t("Criar negócio na origem")}</span>
              <SeletorDaCasca aparencia="janela" valor={regra.origem_id} opcoes={origens.map((o) => ({ valor: o.id, rotulo: o.nome }))} aoMudar={(v) => mudar({ origem_id: v, etapa_id: "" })} vazio={t("Selecione...")} vazioSoNoGatilho desabilitado={!podeEditar} aria-label={t("Criar negócio na origem")} />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={ROTULO}>{t("Na etapa")}</span>
              <SeletorDaCasca aparencia="janela" valor={regra.etapa_id} opcoes={etapas.map((e) => ({ valor: e.id, rotulo: e.nome }))} aoMudar={(v) => mudar({ etapa_id: v })} vazio={t("Selecione...")} vazioSoNoGatilho desabilitado={!podeEditar || !regra.origem_id} aria-label={t("Na etapa")} />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={ROTULO}>{t("Adicionar tags ao contato")}</span>
            <TagsDaCondicao valores={regra.tags} aoMudar={(tags) => mudar({ tags })} desabilitado={!podeEditar} />
          </div>
          <div className="flex items-center gap-2">
            <CaixaDaCasca marcada={regra.manter_atendente} aoMudar={(v) => mudar({ manter_atendente: v })} desabilitada={!podeEditar} rotulo={t("Manter atendente de acordo com a distribuição de dono do negócio.")} />
            <AjudaDaCasca texto={t("A origem escolhida pode ter a configuração de distribuição de dono automática quando chega um novo negócio. Se marcado, essa regra definirá o atendente igual ao dono do negócio que foi definido na origem.")} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

Confira se `SeletorDaCasca` aceita `className` (aceita, Task 10 da 3C usa) e `desabilitado`.

- [ ] **Step 4: A aba**

Create `components/escale/conversas/configuracoes/canais/AbaCriacaoDeNegocio.tsx`:

```tsx
"use client";
import { useState } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import type { OrigemDaCriacao } from "@/hooks/escale/useCriacaoDeNegocio";
import { useT } from "@/hooks/i18n/useT";
import { CONDICOES_MAX, novaRegra, type CriacaoEmEdicao } from "@/lib/escale/conversas/criacao-de-negocio";
import { Briefcase, Plus } from "@/lib/ui/icons-da-casca";

import { CondicaoDeCriacao } from "./CondicaoDeCriacao";

/** A aba "Criação de negócio" (F1; 16/10-01 a 03, c104–c108). Controlada: o rascunho mora na janela. */
export function AbaCriacaoDeNegocio({
  rascunho,
  aoMudar,
  configurado,
  origens,
  podeEditar,
}: {
  rascunho: CriacaoEmEdicao;
  aoMudar: (c: CriacaoEmEdicao) => void;
  configurado: boolean;
  origens: OrigemDaCriacao[];
  podeEditar: boolean;
}) {
  const t = useT();
  const [aberta, setAberta] = useState<string | null>(null);
  const ligar = (v: boolean) => aoMudar(v ? { ligado: true, regras: rascunho.regras.length ? rascunho.regras : [novaRegra(1)] } : { ...rascunho, ligado: false });
  return (
    <div className="px-6 py-5">
      {!configurado && !rascunho.ligado ? (
        <p className="mb-3 rounded-lg bg-casca-pausa px-3 py-2 text-[12px] text-casca-pausa-texto">
          {t("Hoje os negócios deste dispositivo nascem na origem padrão. Ligue a criação automática para escolher a origem e a etapa.")}
        </p>
      ) : null}
      <div className="rounded-lg border border-casca-borda p-4">
        <div className="flex items-start gap-3">
          <Briefcase size={16} aria-hidden className="mt-0.5 shrink-0 text-casca-suave" />
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
              {t("Criar um negócio automaticamente")}
              <AjudaDaCasca texto={t("Se o contato já possui um negócio nessa origem, nenhum novo negócio é criado e o negócio existente não é alterado.")} />
            </span>
            <p className="mt-0.5 text-[13px] text-casca-suave">{t("Crie um negócio automaticamente em uma origem ao receber a primeira mensagem neste dispositivo.")}</p>
          </div>
          <InterruptorDaCasca ligado={rascunho.ligado} aoMudar={ligar} desabilitado={!podeEditar} aria-label={t("Criar um negócio automaticamente")} />
        </div>
        {rascunho.ligado ? (
          <div className="mt-4 flex flex-col gap-2">
            {rascunho.regras.map((r, i) => (
              <CondicaoDeCriacao
                key={r.id}
                regra={r}
                numero={i + 1}
                aberta={aberta === r.id}
                aoAlternar={() => setAberta((a) => (a === r.id ? null : r.id))}
                aoMudar={(nova) => aoMudar({ ...rascunho, regras: rascunho.regras.map((x) => (x.id === r.id ? nova : x)) })}
                aoExcluir={i > 0 ? () => aoMudar({ ...rascunho, regras: rascunho.regras.filter((x) => x.id !== r.id) }) : undefined}
                origens={origens}
                podeEditar={podeEditar}
              />
            ))}
            {podeEditar && rascunho.regras.length < CONDICOES_MAX ? (
              <button type="button" onClick={() => aoMudar({ ...rascunho, regras: [...rascunho.regras, novaRegra(rascunho.regras.length + 1)] })} className="mt-2 flex items-center gap-1.5 self-start text-[13px] font-medium text-casca-marca">
                <Plus size={14} aria-hidden />
                {t("Adicionar nova condição")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

O nome acessível do botão do acordeão é o nome da condição ("Condição 1"), como o teste usa.

- [ ] **Step 5: A janela do dispositivo (3C)**

Em `components/escale/conversas/configuracoes/canais/JanelaDoDispositivo.tsx`:

1. Imports: `AbaCriacaoDeNegocio`; `useCriacaoDeNegocio`, `useOrigensDaCriacao`, `useSalvarCriacaoDeNegocio`; `useExcluirDispositivo` (3C, `useDispositivosDaCasca`); `validarCriacao`, `type CriacaoEmEdicao`; `Trash2`.
2. Estado:

```tsx
  const criacaoLida = useCriacaoDeNegocio(aberta && dispositivo ? dispositivo.id : null);
  const origensDaCriacao = useOrigensDaCriacao(aberta && aba === "criacao").data ?? [];
  const salvarCriacao = useSalvarCriacaoDeNegocio();
  const excluir = useExcluirDispositivo();
  const [criacao, setCriacao] = useState<CriacaoEmEdicao | null>(null);
  useEffect(() => {
    if (aberta && criacaoLida.data) setCriacao(criacaoLida.data.criacao);
  }, [aberta, criacaoLida.data]);
```

3. No `salvar`, antes do `toast.success`:

```tsx
    if (ehAdmin && criacao && criacaoLida.data && JSON.stringify(criacao) !== JSON.stringify(criacaoLida.data.criacao)) {
      const v = validarCriacao(criacao, t);
      if (!v.ok) {
        setAba("criacao");
        toast.error(v.erro);
        return;
      }
      await salvarCriacao.mutateAsync({ canalId: dispositivo.id, criacao: v.valor });
    }
```

4. O ramo `aba === "criacao"` (hoje o "Em breve"):

```tsx
      {aba === "criacao" ? (
        criacao ? (
          <AbaCriacaoDeNegocio rascunho={criacao} aoMudar={setCriacao} configurado={!!criacaoLida.data?.configurado} origens={origensDaCriacao} podeEditar={ehAdmin} />
        ) : (
          <p className="px-6 py-10 text-center text-[13px] text-casca-suave">{t("Carregando…")}</p>
        )
      ) : (
```

5. O rodapé (o da Clint): no lugar do `<BotaoDaJanela variante="cancelar" …>`:

```tsx
          {ehAdmin ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(t("Você tem certeza que deseja remover?"))) excluir.mutate(dispositivo.id, { onSuccess: aoFechar });
              }}
              className="mr-auto flex items-center gap-1.5 text-[13px] font-medium text-casca-alerta"
            >
              <Trash2 size={14} aria-hidden />
              {t("Remover dispositivo")}
            </button>
          ) : null}
```

(confira a forma da mutation `useExcluirDispositivo` na 3C — `mutate(id)` ou `mutate({ id })` — e a `ConfirmacaoDaCasca` da casca: se existir com `aberta/aoConfirmar`, use-a no lugar do `window.confirm`, que a cerca de diálogos da casca pode recusar; `ls components/escale/ui | grep -i confirm`).

O teste `tests/unit/escale-tela-canais.test.tsx` (3C) que conferia a aba "Em breve" e o "Cancelar" passa a conferir a aba com "Criar um negócio automaticamente" (mocke `@/hooks/escale/useCriacaoDeNegocio` com `{ data: { configurado: false, criacao: { ligado: false, regras: [] } } }`) e o "Remover dispositivo".

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-aba-criacao-de-negocio.test.tsx tests/unit/escale-tela-canais.test.tsx && corepack pnpm prettier --write hooks/escale/useCriacaoDeNegocio.ts components/escale/conversas/configuracoes/canais tests/unit/escale-aba-criacao-de-negocio.test.tsx && corepack pnpm eslint components/escale/conversas/configuracoes hooks/escale && corepack pnpm vitest run tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add hooks/escale/useCriacaoDeNegocio.ts components/escale/conversas/configuracoes/canais tests/unit/escale-aba-criacao-de-negocio.test.tsx tests/unit/escale-tela-canais.test.tsx
git commit -m "feat(escale): aba Criação de negócio na janela do dispositivo, com as condições da Clint (Fase 3E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: A conversa embutida (thread e compositor da 3B fora da tela de Conversas)

**Files:**
- Create: `hooks/escale/useEstadoDoCompositor.ts`, `components/escale/conversas/ConversaEmbutida.tsx`, `tests/unit/escale-conversa-embutida.test.tsx`
- Modify: `components/escale/conversas/centro/ConversaAberta.tsx` (3B)

**Interfaces:**
- Produces: `useEstadoDoCompositor(conversa) → { modo, bloqueio, ultimaFoiTemplate, agora }`; `ConversaEmbutida({ conversationId, compacta? })`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-conversa-embutida.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const marcar = vi.hoisted(() => vi.fn());
let espiao = false;
vi.mock("@/hooks/escale/useModoEspiao", () => ({ useModoEspiao: () => [espiao, vi.fn()] }));
vi.mock("@/hooks/inbox/useMarkAsRead", () => ({ useMarkAsRead: marcar }));
vi.mock("@/hooks/inbox/useConversation", () => ({
  useConversation: () => ({ data: { id: "cv1", unread_count_for_assignee: 3, contacts: { name: "Maria" }, channel_sessions: { provider: "waha" } }, isPending: false }),
  isNotFound: () => false,
}));
vi.mock("@/hooks/escale/useEstadoDoCompositor", () => ({ useEstadoDoCompositor: () => ({ modo: { tipo: "livre" }, bloqueio: null, ultimaFoiTemplate: false, agora: new Date() }) }));
vi.mock("@/components/escale/conversas/centro/thread/ThreadDaCasca", () => ({ ThreadDaCasca: ({ compacto }: { compacto?: boolean }) => <div data-testid="thread">{compacto ? "compacta" : "inteira"}</div> }));
let tooltipNoCompositor = false;
vi.mock("@/components/escale/conversas/centro/compositor/CompositorDaCasca", async () => {
  const { Tooltip, TooltipTrigger } = await import("@/components/ui/tooltip");
  return {
    CompositorDaCasca: () =>
      tooltipNoCompositor ? (
        <Tooltip>
          <TooltipTrigger>dica</TooltipTrigger>
        </Tooltip>
      ) : (
        <div data-testid="compositor" />
      ),
  };
});
vi.mock("@/components/escale/conversas/agendadas/JanelaAgendarMensagem", () => ({ JanelaAgendarMensagem: () => null }));

import { ConversaEmbutida } from "@/components/escale/conversas/ConversaEmbutida";

beforeEach(() => {
  marcar.mockClear();
  espiao = false;
  tooltipNoCompositor = false;
});

describe("ConversaEmbutida (F3, F4)", () => {
  it("a thread compacta e o compositor; marca como lida fora do espião", () => {
    render(<ConversaEmbutida conversationId="cv1" compacta />);
    expect(screen.getByTestId("thread")).toHaveTextContent("compacta");
    expect(screen.getByTestId("compositor")).toBeInTheDocument();
    expect(marcar).toHaveBeenCalledWith("cv1", 3);
  });
  it("no modo espião não marca", () => {
    espiao = true;
    render(<ConversaEmbutida conversationId="cv1" />);
    expect(marcar).toHaveBeenCalledWith(null, 3);
  });
  it("traz o próprio TooltipProvider: o compositor com dica abre sem provedor por fora (lição da escale.15)", () => {
    // O dublê do compositor monta um Tooltip do Radix de verdade, que lança erro sem
    // TooltipProvider acima. O render NÃO embrulha em provedor: o painel flutuante e a
    // ficha do negócio não têm um, e a JanelaModelosDeMensagem do compositor usa dica.
    tooltipNoCompositor = true;
    expect(() => render(<ConversaEmbutida conversationId="cv1" />)).not.toThrow();
    expect(screen.getByText("dica")).toBeInTheDocument();
  });
});
```

O mock do compositor lê `tooltipNoCompositor` na hora do render (não na fábrica do `vi.mock`), então a variável comum funciona como a `espiao`.

Run: `corepack pnpm vitest run tests/unit/escale-conversa-embutida.test.tsx`
Expected: FAIL.

- [ ] **Step 2: `useEstadoDoCompositor` (extraído da `ConversaAberta`)**

Create `hooks/escale/useEstadoDoCompositor.ts` com as linhas que a `ConversaAberta` da 3B tem hoje para isso — o relógio de 30 s, `provider`, `ultima`, `ultimaFoiTemplate`, `modo` e `bloqueio` — e os mesmos imports que ela usa para elas (`useAuth`, `useT`, `useMessagesRealtime`, `ultimaMensagem`, `modoDoCompositor`, `estadoDaJanela`, `motivoDoContato`; copie as linhas de import do topo da `ConversaAberta`):

```ts
"use client";
import { useEffect, useMemo, useState } from "react";

import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
// + os imports de useAuth, useT, useMessagesRealtime, ultimaMensagem, modoDoCompositor,
//   estadoDaJanela e motivoDoContato, copiados de components/escale/conversas/centro/ConversaAberta.tsx

/** A regra do compositor da casca (3B C2, C11), para a ConversaAberta e a ConversaEmbutida (3E N10). */
export function useEstadoDoCompositor(conversa: ConversationWithContact) {
  const t = useT();
  const { user } = useAuth();
  const supportReadonly = user.support?.access_mode === "support_readonly";
  const mensagens = useMessagesRealtime(conversa.id);
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const provider = conversa.channel_sessions?.provider ?? null;
  const ultima = useMemo(() => ultimaMensagem(mensagens.data?.pages), [mensagens.data]);
  const ultimaFoiTemplate = !!ultima && ultima.direction === "outbound" && ultima.type === "template";
  const modo = modoDoCompositor({ estado: estadoDaJanela(provider, conversa.last_inbound_at ?? null, agora), provider, ultimaFoiTemplate });
  const bloqueio = supportReadonly ? t("Acompanhamento somente leitura") : motivoDoContato(conversa.contacts, t);
  return { modo, bloqueio, ultimaFoiTemplate, agora };
}
```

Na `ConversaAberta` (3B), troque essas mesmas linhas por `const { modo, bloqueio, ultimaFoiTemplate, agora } = useEstadoDoCompositor(conversa);` (a `mensagens` continua se a `ConversaAberta` a usar em outro lugar; senão, sai junto). O teste do compositor da 3B (`tests/unit/escale-compositor-da-casca.test.tsx`) e o da casca continuam verdes.

- [ ] **Step 3: `ConversaEmbutida`**

Create `components/escale/conversas/ConversaEmbutida.tsx`:

```tsx
"use client";
import { useState } from "react";

import { useEstadoDoCompositor } from "@/hooks/escale/useEstadoDoCompositor";
import { useModoEspiao } from "@/hooks/escale/useModoEspiao";
import { useT } from "@/hooks/i18n/useT";
import { useConversation } from "@/hooks/inbox/useConversation";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useMarkAsRead } from "@/hooks/inbox/useMarkAsRead";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Message } from "@/lib/types/messaging";
import { Loader2 } from "@/lib/ui/icons-da-casca";

import { JanelaAgendarMensagem } from "./agendadas/JanelaAgendarMensagem";
import { CompositorDaCasca } from "./centro/compositor/CompositorDaCasca";
import { ThreadDaCasca } from "./centro/thread/ThreadDaCasca";

function Conteudo({ conversa, compacta }: { conversa: ConversationWithContact; compacta: boolean }) {
  const [espiao] = useModoEspiao();
  useMarkAsRead(espiao ? null : conversa.id, conversa.unread_count_for_assignee ?? 0);
  const { modo, bloqueio } = useEstadoDoCompositor(conversa);
  const [respondendo, setRespondendo] = useState<Message | null>(null);
  const [agendando, setAgendando] = useState<{ texto: string } | null>(null);
  return (
    // O provedor das dicas mora aqui: fora da tela de Conversas (painel flutuante,
    // ficha do negócio) não há TooltipProvider acima, e o compositor usa dica (escale.15).
    <TooltipProvider delayDuration={150}>
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <ThreadDaCasca conversationId={conversa.id} conversa={conversa} aoResponder={setRespondendo} compacto={compacta} />
      </div>
      <CompositorDaCasca
        key={`compositor:${conversa.id}`}
        conversationId={conversa.id}
        conversa={conversa}
        modo={modo}
        bloqueio={bloqueio}
        respondendo={respondendo}
        aoCancelarResposta={() => setRespondendo(null)}
        aoAgendar={(texto) => setAgendando({ texto })}
        compacto={compacta}
      />
      <JanelaAgendarMensagem aberta={agendando !== null} aoFechar={() => setAgendando(null)} conversa={conversa} textoInicial={agendando?.texto ?? ""} modo={modo} />
    </div>
    </TooltipProvider>
  );
}

/**
 * A CONVERSA EMBUTIDA (fork Escale, Fase 3E; F3, F4; N10): a thread e o compositor
 * da 3B fora da tela de Conversas (painel flutuante, aba Conversas da ficha).
 * Marca como lida só fora do modo espião (a marca da sessão, 3A N7).
 */
export function ConversaEmbutida({ conversationId, compacta = false }: { conversationId: string; compacta?: boolean }) {
  const t = useT();
  const { data, isPending } = useConversation(conversationId, true);
  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center text-casca-suave">
        <Loader2 size={18} aria-hidden className="animate-spin text-casca-marca" />
      </div>
    );
  }
  if (!data) return <p className="p-6 text-center text-[12px] text-casca-suave">{t("Não foi possível carregar a conversa.")}</p>;
  return <Conteudo conversa={data} compacta={compacta} />;
}
```

Confira o tipo `Message` que a 3B usa no `respondendo` (o import da `ConversaAberta`) e copie de lá se for outro caminho.

- [ ] **Step 4: Rodar, commit**

Run: `corepack pnpm vitest run tests/unit/escale-conversa-embutida.test.tsx tests/unit/escale-compositor-da-casca.test.tsx tests/unit/escale-conversas-casca.test.tsx && corepack pnpm prettier --write hooks/escale/useEstadoDoCompositor.ts components/escale/conversas/ConversaEmbutida.tsx tests/unit/escale-conversa-embutida.test.tsx && corepack pnpm eslint components/escale/conversas hooks/escale && corepack pnpm typecheck`
Expected: PASS.

```bash
git add hooks/escale/useEstadoDoCompositor.ts components/escale/conversas/ConversaEmbutida.tsx components/escale/conversas/centro/ConversaAberta.tsx tests/unit/escale-conversa-embutida.test.tsx
git commit -m "feat(escale): a conversa embutida com a thread e o compositor da casca (Fase 3E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: A aba Conversas da ficha responde e liga o modo espião (precisa da 2E)

**Files:**
- Create: `components/escale/negocio/abas/ConversaDaAba.tsx`
- Modify: `components/escale/negocio/abas/AbaConversas.tsx` (2E), `tests/unit/escale-abas-por-contato.test.tsx`, `tests/unit/escale-ficha-aba-conversas.test.tsx`
- Delete: `components/escale/negocio/abas/ConversaEmLeitura.tsx`

**Interfaces:**
- Consumes: `ConversaEmbutida` (Task 5), `useModoEspiao` (3A), `ChannelLogo`.
- Produces: `ConversaDaAba({ conversa })` (a barra de 48px da 2E + a `ConversaEmbutida`); a faixa do topo da `AbaConversas` com "Ativar modo espião"/"Desativar modo espião".

Abra c20 e c23 antes.

- [ ] **Step 1: Os testes acompanham (vão falhar)**

Em `tests/unit/escale-abas-por-contato.test.tsx` e `tests/unit/escale-ficha-aba-conversas.test.tsx`: o mock de `@/components/inbox/ChatThread` (2E) vira `vi.mock("@/components/escale/conversas/ConversaEmbutida", () => ({ ConversaEmbutida: ({ conversationId }: { conversationId: string }) => <div data-testid="thread">{conversationId}</div> }))`, e o `useModoEspiao` é mockado com um estado de mentira:

```tsx
const espiao = vi.hoisted(() => ({ ligado: false, mudar: vi.fn() }));
vi.mock("@/hooks/escale/useModoEspiao", () => ({ useModoEspiao: () => [espiao.ligado, espiao.mudar] }));
```

e, em `escale-ficha-aba-conversas.test.tsx`, o `it` novo:

```tsx
  it("a faixa liga o modo espião (F4)", async () => {
    comConsulta(<AbaConversas contatoId="c1" foto={null} />);
    fireEvent.click(await screen.findByRole("button", { name: "Ativar modo espião" }));
    expect(espiao.mudar).toHaveBeenCalledWith(true);
  });
```

(o `it` que pinava o botão desligado "Em breve" sai). Use a mesma função de montar da 2E (`comConsulta` ou a que o arquivo tiver).

Run: `corepack pnpm vitest run tests/unit/escale-abas-por-contato.test.tsx tests/unit/escale-ficha-aba-conversas.test.tsx`
Expected: FAIL.

- [ ] **Step 2: `ConversaDaAba` e a aba**

Create `components/escale/negocio/abas/ConversaDaAba.tsx`:

```tsx
"use client";
import Link from "next/link";

import { ConversaEmbutida } from "@/components/escale/conversas/ConversaEmbutida";
import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useT } from "@/hooks/i18n/useT";
import { ExternalLink } from "@/lib/ui/icons-da-casca";

/**
 * A CONVERSA DA DIREITA DA ABA CONVERSAS (fork Escale, Fases 2E e 3E; C4 do PRD
 * de Contatos, F3 do PRD de Conversas): a barra de 48px da 2E e, embaixo, a
 * conversa embutida (thread e compositor da 3B). O modo espião é a marca da sessão.
 */
export function ConversaDaAba({ conversa }: { conversa: ConversationWithContact }) {
  const t = useT();
  const canal = conversa.channel_sessions ?? null;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-casca-borda px-4">
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-casca-texto">
          <ChannelLogo channel={canal} size={16} />
          <span className="truncate">{canal?.display_name ?? ""}</span>
        </span>
        <Link href={`/app/inbox?id=${conversa.id}`} className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-casca-marca hover:underline">
          {t("Abrir em Conversas")}
          <ExternalLink size={14} aria-hidden />
        </Link>
      </div>
      <div className="min-h-0 flex-1">
        <ConversaEmbutida conversationId={conversa.id} compacta />
      </div>
    </div>
  );
}
```

Em `components/escale/negocio/abas/AbaConversas.tsx` (2E):
1. `import { ConversaEmLeitura } from "./ConversaEmLeitura";` vira `import { ConversaDaAba } from "./ConversaDaAba";` e o uso `<ConversaEmLeitura conversa={atual} contatoId={contatoId} />` vira `<ConversaDaAba conversa={atual} />`.
2. `const [espiao, mudarEspiao] = useModoEspiao();` (import de `@/hooks/escale/useModoEspiao`), e a faixa do topo:

```tsx
      <div className={cn("flex h-10 shrink-0 items-center justify-between rounded-t-lg px-4 text-[13px]", espiao ? "bg-casca-espiao text-casca-espiao-texto" : "bg-casca-raia text-casca-texto-2")}>
        <span className="flex items-center gap-2">
          <Glasses size={16} aria-hidden />
          {espiao ? t("Modo espião ativo") : t("Abra as conversas sem marcá-las como lidas.")}
        </span>
        <button type="button" onClick={() => mudarEspiao(!espiao)} className="text-[13px] underline">
          {espiao ? t("Desativar modo espião") : t("Ativar modo espião")}
        </button>
      </div>
```

3. O comentário do topo: `… a sessão escolhida abre à direita com a thread e o compositor da casca (3E, F3); a faixa liga o modo espião (F4).`

Apague `components/escale/negocio/abas/ConversaEmLeitura.tsx` (`git rm`); confira com `grep -rn "ConversaEmLeitura" components tests` que nada mais a importa.

- [ ] **Step 3: Rodar, commit**

Run: `corepack pnpm vitest run tests/unit/escale-abas-por-contato.test.tsx tests/unit/escale-ficha-aba-conversas.test.tsx $(grep -rl "AbaConversas" tests/unit) && corepack pnpm prettier --write components/escale/negocio/abas/ConversaDaAba.tsx && corepack pnpm eslint components/escale/negocio/abas && corepack pnpm typecheck`
Expected: PASS.

```bash
git add components/escale/negocio/abas tests/unit/escale-abas-por-contato.test.tsx tests/unit/escale-ficha-aba-conversas.test.tsx
git commit -m "feat(escale): aba Conversas da ficha responde pela casca e liga o modo espião (Fase 3E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: O painel flutuante vira a mini-fila da Clint, com a conversa dentro

**Files:**
- Modify: `components/escale/ConversasFlutuante.tsx`, o teste do painel flutuante da Fase 0 (`grep -rl "ConversasFlutuante" tests/unit`)
- Create: `tests/unit/escale-painel-flutuante-3e.test.tsx`

**Interfaces:**
- Consumes: `useFilaDeConversas` (3D), `MenuDePresets` (3D), `MenuDeOrdem` (3A), `LinhaDaFila`, `FotoDaConversa` (3A), `usePreferenciasDeConversas` (3A), `ConversaEmbutida` (Task 5), `useAuth`, `useRouter`.
- Produces: `PainelDeConversas` exportado de `ConversasFlutuante.tsx` (para o teste).

Abra 01-025 antes.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-painel-flutuante-3e.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "o1", role: "agent" } }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/app" }));
vi.mock("@/hooks/escale/useFilaDeConversas", () => ({
  useFilaDeConversas: () => ({ data: { pages: [{ data: [{ id: "cv1", contacts: { name: "Maria" } }] }] }, isLoading: false, isError: false }),
}));
vi.mock("@/hooks/escale/usePreferenciasDeConversas", () => ({ usePreferenciasDeConversas: () => ({ data: { visualizacao: {} } }) }));
vi.mock("@/components/escale/conversas/fila/MenuDePresets", () => ({ MenuDePresets: () => <button type="button">Todos</button> }));
vi.mock("@/components/escale/conversas/fila/MenuDeOrdem", () => ({ MenuDeOrdem: () => null }));
vi.mock("@/components/escale/conversas/fila/LinhaDaFila", () => ({
  LinhaDaFila: ({ conversa, aoSelecionar }: { conversa: { id: string }; aoSelecionar: (id: string) => void }) => (
    <button type="button" onClick={() => aoSelecionar(conversa.id)}>linha {conversa.id}</button>
  ),
}));
vi.mock("@/components/escale/conversas/fila/FotoDaConversa", () => ({ FotoDaConversa: () => null }));
vi.mock("@/components/escale/conversas/ConversaEmbutida", () => ({ ConversaEmbutida: ({ conversationId }: { conversationId: string }) => <div data-testid="embutida">{conversationId}</div> }));

import { PainelDeConversas } from "@/components/escale/ConversasFlutuante";

describe("o painel flutuante (01-025; F3, N12)", () => {
  it("a mini-fila com 'Pesquisar' e o botão de presets; clicar abre a conversa dentro; ‹ volta", () => {
    render(<PainelDeConversas />);
    expect(screen.getByRole("searchbox", { name: "Pesquisar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "linha cv1" }));
    expect(screen.getByTestId("embutida")).toHaveTextContent("cv1");
    expect(screen.getByRole("link", { name: /Abrir em Conversas/ })).toHaveAttribute("href", "/app/inbox?id=cv1");
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("button", { name: "linha cv1" })).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-painel-flutuante-3e.test.tsx`
Expected: FAIL.

- [ ] **Step 2: O painel**

Em `components/escale/ConversasFlutuante.tsx`, troque a função `PainelDeConversas` (e o tipo `ConversaResumo`, os imports de `useQuery`/`apiClient`/`rotuloDoContato` que ficarem sem uso) por:

```tsx
/**
 * O PAINEL FLUTUANTE DE CONVERSAS (fork Escale, Fases 0 e 3E; 01-025; F3, N12):
 * a mini-fila da Clint (busca, presets, ordem e as linhas, com o tempo real da
 * fila) e a conversa aberta DENTRO do painel (provisório: o print falta).
 */
export function PainelDeConversas() {
  const t = useT();
  const router = useRouter();
  const { activeOrg } = useAuth();
  const [busca, setBusca] = useState("");
  const [painel, setPainel] = useState<FiltrosDoPainel>({});
  const [ordem, setOrdem] = useState<Ordem>("interacao");
  const [aberta, setAberta] = useState<ConversationWithContact | null>(null);
  const preferencias = usePreferenciasDeConversas();
  const consulta = useMemo(() => ({ painel, ordem, ...(buscaValeConsulta(busca) ? { busca } : {}) }), [painel, ordem, busca]);
  const fila = useFilaDeConversas(consulta, activeOrg?.orgId ?? null);
  const itens = (fila.data?.pages.flatMap((p) => p.data) ?? []) as ConversationWithContact[];
  const [agora] = useState(() => new Date());

  return (
    <div
      role="dialog"
      aria-label={t("Conversas recentes")}
      className="absolute right-0 bottom-[62px] flex h-[min(570px,calc(100vh-140px))] w-[400px] flex-col overflow-hidden rounded-[13px] border border-casca-borda bg-surface"
      style={{ boxShadow: "var(--shadow-casca-painel)" }}
    >
      {aberta ? (
        <>
          <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-casca-borda px-3">
            <button type="button" aria-label={t("Voltar")} onClick={() => setAberta(null)} className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia">
              <ChevronLeft size={16} aria-hidden />
            </button>
            <FotoDaConversa conversa={aberta} tamanho="secao" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-casca-texto">{rotuloDoContato(aberta.contacts ?? null, t)}</span>
            <Link href={`/app/inbox?id=${aberta.id}`} className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-casca-marca hover:underline">
              {t("Abrir em Conversas")}
              <ExternalLink size={12} aria-hidden />
            </Link>
          </div>
          <div className="min-h-0 flex-1">
            <ConversaEmbutida conversationId={aberta.id} compacta />
          </div>
        </>
      ) : (
        <>
          <div className="flex h-[52px] shrink-0 items-center gap-2 bg-casca-marca-suave px-4">
            <h2 className="text-[15px] font-medium text-casca-texto">{t("Conversas")}</h2>
            <MessageCircleMore size={16} aria-hidden className="text-casca-marca" />
          </div>
          <div className="shrink-0 px-3 pt-3">
            <label className="relative block">
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Pesquisar")} aria-label={t("Pesquisar")} className="h-9 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-3 text-[12px] text-casca-texto placeholder:text-casca-meta" />
              <Search size={16} aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
            </label>
            <div className="flex h-10 items-center justify-between">
              <MenuDePresets painel={painel} aoMudarPainel={setPainel} aoCriarFiltro={() => router.push("/app/inbox")} temGrupos={false} />
              <MenuDeOrdem ordem={ordem} aoMudar={setOrdem} />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {fila.isLoading ? (
              <p className="px-4 py-6 text-xs text-casca-suave">{t("Carregando…")}</p>
            ) : fila.isError ? (
              <p className="px-4 py-6 text-xs text-casca-suave">{t("Não consegui carregar as conversas.")}</p>
            ) : itens.length === 0 ? (
              <p className="px-4 py-6 text-xs text-casca-suave">{t("Nenhuma conversa ainda.")}</p>
            ) : (
              itens.map((c) => (
                <LinhaDaFila key={c.id} conversa={c} selecionada={false} aoSelecionar={() => setAberta(c)} visualizacao={preferencias.data.visualizacao} agora={agora} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

Imports novos no topo (junto dos de hoje): `useMemo` (React), `useRouter` (`next/navigation`, junto de `usePathname`), `useAuth`, `useFilaDeConversas`, `usePreferenciasDeConversas`, `MenuDePresets`, `MenuDeOrdem`, `LinhaDaFila`, `FotoDaConversa`, `ConversaEmbutida`, `type ConversationWithContact`, `type FiltrosDoPainel`, `type Ordem`, `buscaValeConsulta` (`@/lib/inbox/termo-de-busca`), e os ícones `ChevronLeft`, `ExternalLink`, `Search` (de `@/lib/ui/icons-da-casca`). O resto do arquivo (o botão, a posição por `style`, o contador) não muda. O teste do painel da Fase 0 que esperava as 5 recentes com links passa a mockar `useFilaDeConversas` como o do Step 1 (troque a expectativa do link `/app/inbox/<id>` pela abertura dentro do painel).

- [ ] **Step 3: Rodar, commit**

Run: `corepack pnpm vitest run tests/unit/escale-painel-flutuante-3e.test.tsx $(grep -rl "ConversasFlutuante" tests/unit) && corepack pnpm eslint components/escale/ConversasFlutuante.tsx && corepack pnpm vitest run tests/unit/rodape-ocupado-contrato.test.ts tests/unit/tailwind-tokens.test.ts && corepack pnpm typecheck`
Expected: PASS.

```bash
git add components/escale/ConversasFlutuante.tsx tests/unit
git commit -m "feat(escale): painel flutuante com a mini-fila da Clint e a conversa dentro (Fase 3E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: Espanhol, os gates da fase, o PRD, o LOG e o PR

**Files:**
- Modify: `lib/i18n/dicionario.ts`; fora do repositório: `docs/modulos/3-conversas.md`, `LOG.md`

- [ ] **Step 1: O espanhol**

Bloco `// ─── FORK ESCALE · Fase 3E: criação de negócio e conversas embutidas ───` logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D`, só com as chaves que ainda não existem (`grep -n '"<texto>":' lib/i18n/dicionario.ts`):

```ts
  // ─── FORK ESCALE · Fase 3E: criação de negócio e conversas embutidas ───
  "Criar um negócio automaticamente": { es: "Crear un negocio automáticamente" },
  "Crie um negócio automaticamente em uma origem ao receber a primeira mensagem neste dispositivo.": { es: "Crea un negocio automáticamente en un origen al recibir el primer mensaje en este dispositivo." },
  "Se o contato já possui um negócio nessa origem, nenhum novo negócio é criado e o negócio existente não é alterado.": { es: "Si el contacto ya tiene un negocio en ese origen, no se crea ningún negocio nuevo y el existente no se modifica." },
  "Condição": { es: "Condición" },
  "Quando receber uma mensagem que": { es: "Cuando reciba un mensaje que" },
  "igual": { es: "igual" },
  "Começa com": { es: "Empieza con" },
  "Contém": { es: "Contiene" },
  "Qualquer mensagem": { es: "Cualquier mensaje" },
  "Digite uma ou mais mensagens": { es: "Escribe uno o más mensajes" },
  "Você pode adicionar até 10 mensagens!": { es: "¡Puedes agregar hasta 10 mensajes!" },
  "A mensagem já existe!": { es: "¡El mensaje ya existe!" },
  "Criar negócio na origem": { es: "Crear negocio en el origen" },
  "Na etapa": { es: "En la etapa" },
  "Adicionar tags ao contato": { es: "Agregar etiquetas al contacto" },
  "Adicionar tag": { es: "Agregar etiqueta" },
  "Manter atendente de acordo com a distribuição de dono do negócio.": { es: "Mantener el agente según la distribución de responsable del negocio." },
  "A origem escolhida pode ter a configuração de distribuição de dono automática quando chega um novo negócio. Se marcado, essa regra definirá o atendente igual ao dono do negócio que foi definido na origem.": { es: "El origen elegido puede tener la distribución automática de responsable cuando llega un negocio nuevo. Si está marcado, esta regla definirá el agente igual al responsable del negocio definido en el origen." },
  "Adicionar nova condição": { es: "Agregar nueva condición" },
  "Editar nome da condição": { es: "Editar nombre de la condición" },
  "Excluir condição": { es: "Eliminar condición" },
  "Tem certeza que deseja excluir essa condição?": { es: "¿Seguro que deseas eliminar esta condición?" },
  "O número máximo de caracteres permitido para o nome da condição é de 35!": { es: "¡El número máximo de caracteres para el nombre de la condición es 35!" },
  "O campo": { es: "El campo" },
  "é obrigatório em": { es: "es obligatorio en" },
  "Remover dispositivo": { es: "Eliminar dispositivo" },
  "Você tem certeza que deseja remover?": { es: "¿Seguro que deseas eliminar?" },
  "Hoje os negócios deste dispositivo nascem na origem padrão. Ligue a criação automática para escolher a origem e a etapa.": { es: "Hoy los negocios de este dispositivo nacen en el origen predeterminado. Activa la creación automática para elegir el origen y la etapa." },
  "Abrir em Conversas": { es: "Abrir en Conversaciones" },
  "Não foi possível carregar a conversa.": { es: "No se pudo cargar la conversación." },
  "Dispositivo não encontrado.": { es: "Dispositivo no encontrado." },
  "Ocorreu um erro ao salvar.": { es: "Ocurrió un error al guardar." },
```

- [ ] **Step 2: Os gates da fase**

```bash
corepack pnpm vitest run $(ls tests/unit | grep -E "i18n-espanhol|tailwind-tokens|controle-decorativo|vocabulario-do-funil|evidencia-citada|original-intacto|manifest-x|rodape-ocupado|pos-entrada|nascimento" | sed 's#^#tests/unit/#') tests/invariants/rls-completude-varredura.test.ts
corepack pnpm vitest run $(git diff --name-only escale-crm/main...HEAD | grep -E "^tests/unit/.*\.test\.tsx?$")
corepack pnpm typecheck && corepack pnpm eslint $(git diff --name-only escale-crm/main...HEAD | grep -E "\.(ts|tsx)$")
```

Expected: tudo PASS.

- [ ] **Step 3: O PRD e o LOG (fora do repositório)**

`docs/modulos/3-conversas.md`: seção 8, a linha da 3E → `executada (PR #<n>, <data>)`; tabela F: F1, F2, F3, F4 → `3E ✅`; F5 → `fora (Q4 da 2E: a Clint atual liga só "Padrão chat", entregue na 2E)`; D10 (modos) → o mesmo. Registre a N4 (a meta de "0 por `is_default`" vale quando cada dispositivo for configurado). `LOG.md`: a entrada da 3E no topo e "Próximos passos" = a Task 9 (bateria e publicação da Frente C).

- [ ] **Step 4: O PR**

```bash
git fetch escale-crm --quiet && git rebase escale-crm/main
git push -u escale-crm feat/fase-3e-criacao-de-negocio-e-conversas-embutidas
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-3e-criacao-de-negocio-e-conversas-embutidas \
  --title "feat(escale): Fase 3E — criação de negócio por dispositivo e conversas embutidas" \
  --body "$(cat <<'EOF'
## O que entra
- Aba "Criação de negócio" na janela do dispositivo (as condições da Clint) e o rodapé da Clint ("Remover dispositivo" + "Salvar alterações").
- O negócio da conversa nasce pela condição do dispositivo (migration 9205; encaixe em `nascimento-do-lead.ts`): configurado e desligado = nenhum; condição que casa = origem e etapa dela, tags no contato e, se pedido, o atendente = o dono da distribuição. Nunca configurado = a origem padrão de hoje (risco 7).
- A conversa abre dentro do painel flutuante (a mini-fila da Clint) e da aba Conversas da ficha, com o compositor da casca; o modo espião liga na ficha.

## Diferenças declaradas
- "Por canal" e "Timeline unificada": fora (a Clint atual só tem "Padrão chat").
- A conversa dentro do painel flutuante segue o código da Clint (sem print).
- A meta "0 negócios por `is_default`" se cumpre quando cada dispositivo for configurado (aviso na aba).

## Verificação
- Testes da fase, typecheck, eslint e as cercas. A bateria cheia da Frente C vem logo depois (Task 9).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --repo rgisjr/escale-crm --merge --delete-branch=false
```

### Task 9: Fim da Frente C — testar tudo, revisar, conferir e publicar (3D e 3E)

Vale quando a 3D e a 3E (e o PR pequeno da Task 6, se a 2E tiver chegado depois) estão mergeadas na `escale-crm/main`. A 3A, a 3B e a 3C **já estão no ar** desde a `v1.81.0-escale.14`/`.15` (19/10): esta task testa a `main` inteira, mas revisa, confere e publica **o que entrou depois da `escale.15`**. Regra de 18/10: uma bateria, um revisor, uma publicação.

- [ ] **Step 1: A base atualizada**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-c"
export PATH="/c/Program Files/nodejs:$PATH"; export NODE_OPTIONS=--max-old-space-size=6144
git fetch escale-crm --quiet && git switch --detach escale-crm/main && git log --oneline -1
git ls-tree --name-only HEAD supabase/migrations/ | grep -E "_92[0-9]{2}_" | sort   # Expected: 9201 a 9205
```

- [ ] **Step 2: A bateria, em segundo plano**

Rode as três em segundo plano (são longas) e espere as três terminarem:

```bash
corepack pnpm test > /tmp/frente-c-unit.log 2>&1
corepack pnpm test:db > /tmp/frente-c-db.log 2>&1
corepack pnpm test:db:update > /tmp/frente-c-db-update.log 2>&1
```

Compare as falhas com `../repo/.superpowers/sdd/falhas-conhecidas.txt`: tempo limite em teste lento e `.env.local` da pilha local **não** são regressão. **Falha nova = corrigir antes de publicar** (um PR de correção por causa, mergeado, e a bateria de novo só nos arquivos afetados + o `test:db` se tocar migration). Os testes de prova desta frente: `tests/invariants/escale-preferencias-de-conversas.test.ts` (9201), `escale-conversa-aberta-9202.test.ts`, `escale-setores-9203.test.ts`, `escale-fila-e-massa-9204.test.ts`, `escale-criacao-de-negocio-9205.test.ts`.

- [ ] **Step 3: Um revisor para a frente (Opus 5.5, high)**

Um subagente `code-reviewer` com `model: "opus"` (nunca Sonnet; Fable só se aparecer concorrência/RLS muito sutil), com o diff do que ainda não está no ar (`git diff v1.81.0-escale.15..escale-crm/main -- . ':!docs'`), pedindo só Critical/Important com arquivo:linha, e o foco: as funções invoker da 9204 (o que cada papel vê, somadas à RLS do setor da 9203), o executor das ações em massa (service role só depois da resolução pela sessão), o encaixe no nascimento (nada muda sem configuração), a RPC da 9205 (a trava por contato, "já existe negócio nessa origem"), as rotas de escrita (`requireSupportWrite`, papel, organização da sessão), **toda FK nova que possa criar muitos-para-muitos no PostgREST** e **toda tela nova que use `Tooltip`/`AjudaDaCasca`/`DicaEscura` sem `TooltipProvider` na própria árvore**. Critical/Important = corrigir (PR) antes de publicar.

- [ ] **Step 4: A conferência visual, uma vez por módulo**

Com a casca ligada (`/app/escale/menu?usar=topo`) num ambiente com o build da `main` (local `corepack pnpm dev` com o banco local da `test:db`, ou o de homologação se houver), abrir lado a lado com os prints: filtros e massa (3D: c25–c36, c64–c72, c76–c83), dispositivo e embutidas (3E: 16/10-01 a 03, c104–c108, 01-025). Se o `LOG.md` ainda não registra a conferência visual da 3A–3C (a `escale.14` saiu sem ela), confira também, já que é uma vez por módulo: fila e painel (3A: c01, c02, c14–c24, c31, c43–c49, c54, c75, c81, c84–c86), conversa aberta (3B: c02–c13, c39, c56–c63, c73, c74), configurações (3C: c37, c38, c40–c42, c87–c103). **Em cada tela, abra o console do navegador** (lição da `escale.15`): nenhum erro, e o painel flutuante e a aba Conversas da ficha abrem uma conversa e o "Modelos de mensagem" do compositor sem "Algo deu errado". Escrever no PR da frente (ou no LOG) a lista de cada diferença que sobrou; diferença sem justificativa aprovada = corrigir antes de publicar.

- [ ] **Step 5: Publicar (a entrega é do Claude, CLAUDE.md de 18/10)**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
git fetch escale-crm --quiet --tags
git tag --sort=-creatordate | head -3                      # a última vX.Y.Z-escale.N
NOVA="v1.81.0-escale.<N+1>"                                # a próxima da série (confira a versão base do original)
git tag -a "$NOVA" escale-crm/main -m "Frente C, fim: filtros e ações em massa (3D) e criação de negócio por dispositivo e conversas embutidas (3E); migrations 9204 e 9205"
git push escale-crm "$NOVA"
gh release create "$NOVA" --repo rgisjr/escale-crm --latest --title "$NOVA" --notes "Fim da Frente C (Conversas igual à Clint): filtros, filtros salvos e ações em massa da fila (3D); criação de negócio por dispositivo e a conversa dentro do painel flutuante e da ficha (3E). Migrations 9204 e 9205. A 3A–3C já estavam no ar desde a escale.14/15."
gh run list --repo rgisjr/escale-crm --workflow "Publicar imagem Docker (GHCR)" --limit 1
```

Espere o job `promover-stable` terminar com `success` (um laço `gh run view <id> --repo rgisjr/escale-crm --json jobs` em segundo plano; ~10 min). **Antes disso, não rode o update** (o preflight para sem a imagem).

Na VPS (as duas chamadas separadas; nunca `pgrep -f "update.sh…"` no mesmo comando remoto):

```bash
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'cd /root/DeskcommCRM && bash hostgator-setup-kit/backup.sh'
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 "cd /root/DeskcommCRM && nohup bash hostgator-setup-kit/update.sh --to $NOVA > /root/update-$NOVA.log 2>&1 &"
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 "pgrep -f '[u]pdate.sh' >/dev/null && echo rodando || tail -n 30 /root/update-$NOVA.log"
```

(repita a terceira até sair o fim do log).

- [ ] **Step 6: Conferir a produção (só leitura)**

```bash
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'docker ps --format "{{.Names}} {{.Status}} {{.Image}}" | grep -i deskcomm'
curl -s -o /dev/null -w "%{http_code}\n" https://app.escaleia.com/login                    # Expected: 200
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'cd /root/DeskcommCRM && docker compose logs --since 15m app worker scheduler 2>&1 | grep -iE "error|exception" | tail -n 20'
```

O embed do login (lição da `escale.13`, PGRST201), só leitura, na VPS:

```bash
ssh -i ~/.ssh/vps_deskcomm root@179.197.64.188 'cd /root/DeskcommCRM && U=$(grep -E "^NEXT_PUBLIC_SUPABASE_URL=" .env | cut -d= -f2- | tr -d "\"'"'"'\r") && K=$(grep -E "^SUPABASE_SERVICE_ROLE_KEY=" .env | cut -d= -f2- | tr -d "\"'"'"'\r") && curl -s "$U/rest/v1/user_organizations?select=organization_id,organizations(display_name)&limit=1" -H "apikey: $K" -H "Authorization: Bearer $K"'
```

Expected: um JSON com `organizations` dentro, **nunca** `PGRST201`. (Se os nomes das variáveis do `.env` forem outros, leia-os com `grep -E "SUPABASE" .env | cut -d= -f1`.)

Expected do resto: os 3 containers `healthy` na tag nova, `/login` 200, `/app` 307, nenhum erro novo nos logs. Os objetos das migrations novas no banco, por leitura (MCP `supabase-crm`, só leitura): as tabelas `crm_acoes_em_massa_conversas`, `crm_acoes_em_massa_conversas_itens` (9204) e `crm_criacao_de_negocio` (9205), com RLS ligada; as funções `fn_escale_conversa_passa`, `fn_escale_fila_da_casca`, `fn_escale_contar_fila_da_casca`, `fn_escale_criar_acao_em_massa_de_conversas` (9204) e `fn_escale_nascer_negocio_do_dispositivo` (9205, sem execute para `anon` e `authenticated`). No Chrome, logado, com a casca ligada: `/app/inbox` com um filtro aplicado, a janela de um dispositivo na aba "Criação de negócio", o painel flutuante com uma conversa aberta e a aba Conversas de um negócio — console sem erro. **Falhou a conferência:** volte para a versão anterior (`update.sh --to v1.81.0-escale.15` ou a que estiver no ar) e avise.

- [ ] **Step 7: Fechar**

Atualize o `LOG.md` (a versão no ar, o que entrou, o que olhar no app) e a memória da VPS; a seção 8 do PRD com as linhas da 3D e da 3E `publicadas (<tag>)` (a 3A–3C: `publicadas (v1.81.0-escale.14/15)`). A mensagem final ao usuário, curta: a versão no ar, o que entrou (filtros e ações em massa da fila; criação de negócio por dispositivo; a conversa dentro do painel flutuante e da ficha) e o que olhar no app (um filtro e uma ação em massa, a aba "Criação de negócio" de um dispositivo, o painel flutuante e a aba Conversas de um negócio). Lembrete ao usuário: a casca vira padrão para todos só por decisão dele (decisão 3 do roteiro), agora que as Fases 1 e 3 estão no ar.

## Fase 3E — criação de negócio por dispositivo e conversas embutidas

Linha da seção 8 do PRD: `| 3E | **Criação de negócio por dispositivo e conversas embutidas:** F1–F4 (F5 fora, Q4 da 2E) | … | executada (PR #<n>); publicada com a Frente C (<tag>) |`.

## Verificação

1. **Tasks 1–8:** os testes da task, os guardas dos arquivos tocados, typecheck e eslint (G1).
2. **Task 9:** a bateria única da Frente C (`pnpm test`, `test:db`, `test:db:update`), um revisor Opus 5.5 high, a conferência visual por módulo e a publicação com a conferência da produção.

## Fora desta fase (registrado)

- "Por canal" e "Timeline unificada" (F5; Q4 da 2E).
- As abas "Marketing Messages API" e "Chamadas por WhatsApp" do WhatsApp Oficial (decisão 9 do PRD).
- Uma condição por **conteúdo de anúncio** (a Clint não tem); a criação para o canal Instagram segue a mesma tabela (o dispositivo `zernio_social` também tem a aba), sem regra própria.
- Tornar a casca o padrão para todos (decisão do usuário, depois desta frente).

## Self-review (19/10)

1. **Cobertura do PRD:** F1 → Tasks 1 (regras e frases), 2 (tabela e RPC), 3 (decisão e encaixe; "Se o contato já possui…"; "Manter atendente…"), 4 (a aba: interruptor, condições, nome no lugar, lixeira com confirmação, "+ Adicionar nova condição", validação, "Salvar alterações"); F2 → Task 4 (as duas abas do não oficial e o rodapé da Clint); F3 → Tasks 5, 6, 7; F4 → Tasks 5 e 6; F5/D10 (modos) → fora (Q4 da 2E). O fim da frente → Task 9.
2. **Placeholders:** nenhum "TBD"; os "confira" apontam a forma real de helpers que a 3B/3C/2E criam (imports da `ConversaAberta`, a forma do `useExcluirDispositivo`, o mock de montagem da 2E).
3. **Tipos entre tasks:** `RegraDeCriacao`/`CriacaoDeNegocio`/`RegraEmEdicao`/`CriacaoEmEdicao`/`validarCriacao`/`primeiraRegraQueCasa` (Task 1) são o que a RPC recebe (Task 3, `p_tags_do_contato = regra.tags`), o que as rotas validam (3) e o que a aba edita (4); `DecisaoDoDispositivo`/`nascimentoPeloDispositivo` (Task 3) batem com o encaixe (`NascimentoDoLead`, `"pelo_dispositivo"`); `OrigemDaCriacao` (Task 4) = a forma de `GET /api/v1/criacao-de-negocio/origens` (Task 3); `ConversaEmbutida({ conversationId, compacta })` (Task 5) é o que a aba (6) e o painel (7) usam; `useFilaDeConversas(consulta)` e `MenuDePresets({ painel, aoMudarPainel, aoCriarFiltro, temGrupos })` são os da 3D.

## Revisão do plano (19/10, tarde)

Conferido contra a `escale-crm/main` (`576b7d769`, a `v1.81.0-escale.15`) e as lições da publicação da Frente B/C:
1. **Timestamp da migration:** `20261106120000` era o da 9203 na `main`; a 9205 passa a `20261109120000` (nos cinco lugares). O `20261108120000` fica reservado para a 9204 da 3D.
2. **3A–3C já no ar:** a Task 9 deixou de republicar a 3A–3C; revisa o diff desde a `escale.15`, confere só os objetos da 9204 e da 9205 e publica 3D + 3E.
3. **`TooltipProvider` (escale.15):** a `ConversaEmbutida` traz o próprio provedor, porque vai para o painel flutuante e para a ficha, onde não há um, e o compositor abre a `JanelaModelosDeMensagem`, que usa dica. O teste da Task 5 prova sem provedor por fora.
4. **Embed do PostgREST (escale.13):** a `crm_criacao_de_negocio` só tem a FK composta para `channel_sessions` (N2), e a Task 9 roda o `curl` do embed do login antes de dar a publicação por boa.
5. **Dependências abertas:** a 3D ainda não foi executada e a 2E não está na `main`. A Task 1 continua parando se faltar a 3D, e a Task 6 continua indo para um PR pequeno depois da 2E.
