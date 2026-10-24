# Fase 8B — Assistente de campanha de mensagem única (como na Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** B1 a B18 de `docs/modulos/8-campanhas.md` (seção 4, tabela B; B4 e B19 ignorados pelo PRD), a seção 5 (gerente cria; Prospecção fica de fora), a seção 7 (mensagem com modelo da Meta e mapa de variáveis, configurações pós-envio, custo preparado, público por contato, filtro e .csv) e as respostas 2, 3, 4 e 8 da seção 10.
> **Frente B**, worktree `wt-frente-b`, migration **9302**, **dois PRs** (A: o motor; B: as telas). **Depende da 8A mergeada** (usa `lib/escale/campanhas/{tipos,apresentacao,rotas}.ts`, `hooks/escale/useCampanhasDaCasca.ts` e `app/api/v1/campanhas-da-casca/**`). Se a 8A ainda não estiver na `main`, PARE.

## Decisões do usuário (19/10)

| # | Pergunta | Decisão | Onde vale |
|---|---|---|---|
| R2 | Números | Oficial (modelo aprovado da Meta) e não oficial (texto livre) | N4, N5 |
| R3 | Negócio | Com origem, nasce para todos que receberam; sem origem, a campanha não cria e a resposta segue criando no funil do número | N12 |
| R4 | Custo | Preparado; a tela mostra "—" | N15 |
| R6 | Fluxo | Fora: sem "Tipo de envio"; a tag do passo 3 liga as automações | N3, N12 |
| R8 | Público | Sem teto (sai o limite de 5.000) | N7 |
| Regra de 17/10 | Formatos | dd/mm/aaaa, 24 h, 1.234 | todas as telas |

**Prints que faltam nesta fase** (PRD seção 11; nenhum bloqueia, os pontos ficam provisórios e entram na lista de diferenças):
1. ❌ **Tela de sucesso** e **erro ao criar**. Provisório: os textos do material 2.4 ("Campanha {nome} enviada com sucesso", "Criar nova campanha", "Ir para a tela inicial"; "Erro ao criar campanha de WhatsApp" + a mensagem + "Tentar novamente") no molde centrado do vazio da 8A (quadrado 56px, título 15px, texto 13px, botões de 32px).
2. ❌ **.csv passos 2 e 3** e **"Números inválidos"**. Provisório: o passo 1 da Clint (037) e, ao clicar "Importar agora", a janela de importação da 2F (5 passos) já com o tipo Contato travado; ao concluir, os contatos entram na lista. As linhas puladas aparecem no relatório da própria importação (a 2F já mostra).
3. ❌ **Rascunho e duplicado reabertos**. Provisório: o assistente abre no passo 1 com tudo preenchido (material 2.4: "reabrem o passo 1 já preenchido").
4. ❌ **"Mensagem utilitária (sem modelo)"**. Não entra: no número oficial a mensagem é sempre um modelo aprovado (fora da janela de 24 h a Meta recusa texto livre, erro 131047, e a campanha fala com quem não escreveu).

**Perguntas ao usuário (não bloqueiam; o plano segue a proposta):**
- **P1 — A14 (veio da 8A):** a Configuração de campanhas (padrões, textos salvos, lista de exclusão) com o visual da casca. Proposta: **não entra na 8B** (o passo 3 já traz o ritmo e o passo 1 já usa os textos salvos); a engrenagem continua abrindo a tela do original, e a versão da casca vira item depois da 8D.
- **P2 — "Enviar teste para mim":** quem está logado nem sempre é um contato do CRM. Proposta: o botão é **"Enviar teste"** e abre a busca de contato (o envio de teste do original pede um contato).
- **P3 — Rodízio no número oficial:** os números extras só aparecem com número **não oficial**. No oficial, o modelo é da conta da Meta do número, e outro número pode não ter o mesmo modelo aprovado.

**Goal:** Com a casca ligada, "Enviar WhatsApp" (e "Editar rascunho" e "Duplicar campanha" da lista da 8A) abre o assistente da Clint em 4 passos com a trilha, a barra de passos, o rodapé fixo e a prévia do celular: **1. Configure a sua campanha** (nome com contador, dispositivo agrupado em oficial e não oficial, modelo aprovado da Meta com o modal "Escolher mensagem" e as variáveis mapeadas — ou texto livre com "Usar texto salvo" no número não oficial —, quando enviar com o calendário e a hora da casca, base legal), **2. Escolha seus contatos** (Adicionar contato, Selecionar contatos com a lista, os filtros e os filtros salvos de Contatos, Importar telefones .csv; a lista de destinatários com "Remover da lista"), **3. Configurações opcionais** (tags, negócio numa origem e etapa, status da conversa, atendente e os "manter", mais quem atende a resposta, o ritmo e os números extras do original) e **4. Confirme seu envio** (a lista congelada com elegíveis e fora da lista, base legal, teste, custo "—", limites do WhatsApp, "Salvar como rascunho" e "Enviar Whatsapp"), com as telas de sucesso e de erro. O motor manda o modelo da Meta no número oficial, prepara o público escolhido sem teto, guarda o custo preparado e, quando a campanha conclui, aplica as configurações do passo 3 a quem recebeu (a tag pelo caminho que emite `contact.tag_added`).

**Architecture:**
- **O assistente é um formulário só no cliente** (`useAssistenteDeCampanha`, um redutor puro em `lib/escale/campanhas/estado-do-assistente.ts`) até o passo 4. Ao entrar no passo 4, a tela **salva o rascunho** (cria na primeira vez: `POST /api/v1/campanhas-da-casca`; depois `PUT /api/v1/campanhas-da-casca/[id]/assistente`) e **prepara** (`POST …/[id]/preparar`, que congela a lista com o motor do original). "Voltar" do passo 4 devolve a campanha a rascunho (a ação `rascunho` da 8A); "Enviar Whatsapp" chama `…/[id]/enviar` (inicia, ou agenda se "Criar agendamento").
- **Quatro colunas novas em `campaigns`** (9302): `escale_mensagem` (texto livre ou modelo com o mapa de variáveis), `escale_publico` (a seleção do modal — ids ou **o filtro de Contatos da 2B**, nunca a lista expandida —, os contatos avulsos e os removidos), `escale_pos_envio` (passo 3) e `escale_quando` (o agendamento pedido). Em `campaign_recipients`: `escale_pos_envio_em` (marca de feito, uma vez por destinatário), `escale_numero_oficial` e `escale_categoria_do_modelo` (custo preparado). Duas funções invoker resolvem o público (`fn_escale_contatos_do_publico`, que reaproveita `fn_escale_contatos_do_filtro` da 2B, e `fn_escale_pagina_do_publico`), e uma conta os motivos de quem ficou fora (`fn_escale_fora_da_lista`).
- **O motor do original muda pouco e sempre com `FORK ESCALE · Fase 8B`:** `prepararCampanha` aceita os candidatos já resolvidos e o modelo; `prepararAcao` resolve o público da casca antes de preparar; `rodada.ts` manda `type: "template"` quando a campanha tem modelo, grava o custo preparado e pede o pós-envio quando conclui; `testarAcao` manda o modelo no teste. Campanha sem as colunas novas (as criadas pelo formulário do original) segue exatamente como hoje.
- **O pós-envio é um consumidor do `event_log`** (o molde das ações em massa da 2B): `campanhas.pos_envio_requested` é emitido uma vez, na conclusão; o consumidor anda em lotes de 100 com orçamento de 20 s, marca cada destinatário antes de agir e aplica, nesta ordem, tags (`patchContactHandler`, que emite `contact.tag_added`), negócio (`createLeadHandler`, com ator que não é pessoa, para a distribuição de dono da 1K rodar), atendente (`fn_conversation_assign`) e status da conversa (`fn_service_status` / Em espera da casca).
- **As peças de molde** (`components/escale/campanhas/molde/`) são genéricas e combinadas com a sessão da 8D: `TrilhaDoAssistente`, `BarraDePassos`, `RodapeDoAssistente`, `MoldeDoAssistente`, `SeletorDeNumero`, `CartaoDeEscolha`, `CampoComContador`, `ResumoDoEnvio`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Vitest + Testing Library + user-event, Tailwind 4 com os tokens da casca, Radix Dialog/Popover/DropdownMenu, Supabase (RLS, funções invoker, `event_log`), zod, sonner.

## Referência visual (abrir a imagem antes de cada task de tela)

Caminhos sem crase (cerca `evidencia-citada`). Os `.png` estão em 1:1 (1536×735, px de CSS); os `.jpg` estão a ~99% (1523×784): meça neles com a mesma régua. O menu lateral dos prints **não** vale (a casca é a do menu superior).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 018 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-018-nova-campanha-passo-1.png | trilha, barra de passos, título, nome com contador, dispositivo, modelo vazio, quando enviar, prévia vazia, rodapé | 9, 11 |
| 019 | ...\09-campanhas\imagens\09-019-passo-1-dispositivos.png | o seletor de dispositivo aberto, agrupado, com avatar, bolinha, telefone e setor | 9, 11 |
| 021 | ...\09-campanhas\imagens\09-021-passo-1-agendamento.png | "Criar agendamento" marcado, Data e Hora | 11 |
| 022 | ...\09-campanhas\imagens\09-022-passo-1-calendario.png | o calendário de um mês, dias passados apagados (o da casca) | 11 |
| 023 | ...\09-campanhas\imagens\09-023-escolher-mensagem.jpg | modal "Escolher mensagem": busca, categorias, lista, painel vazio, rodapé | 11 |
| 024 | ...\09-campanhas\imagens\09-024-escolher-mensagem-modelo-selecionado.jpg | "USADOS RECENTEMENTE", modelo marcado, "Aprovado", "Editar modelo", "Mapear variáveis", balão | 11 |
| 025 | ...\09-campanhas\imagens\09-025-passo-1-modelo-escolhido.jpg | cartão do modelo, "Variáveis do modelo", "1 de 1 resolvida", prévia com o chip | 9, 11 |
| 026 | ...\09-campanhas\imagens\09-026-passo-1-variaveis-do-modelo.jpg | o editor da variável: trecho, "Campo da Clint"/"Valor fixo", chip, "+ Definir texto alternativo" | 11 |
| 027 | ...\09-campanhas\imagens\09-027-passo-2-escolha-seus-contatos.jpg | os três cartões, o passo 1 concluído na barra | 12 |
| 028–030 | ...\09-campanhas\imagens\09-028-passo-2-adicionar-contato.jpg, 09-029-passo-2-adicionar-contato-dica.jpg, 09-030-passo-2-adicionar-contato-com-negocio.jpg | "Informações do contato" (a `JanelaNovoContato` da 2A já é este modal) | 12 |
| 031–034 | ...\09-campanhas\imagens\09-031-passo-2-selecionar-contatos.jpg, 09-032-...-listas.jpg, 09-033-...-filtros.jpg, 09-034-...-um-marcado.jpg | "Selecionar contatos": busca, listas, filtros, aviso de duplicados, linhas, paginação, rodapé com contagem | 12 |
| 035, 036 | ...\09-campanhas\imagens\09-035-passo-2-destinatarios.jpg, 09-036-passo-2-menu-do-destinatario.jpg | destinatários, "editar seleção", os três botões, lixeira, linha e "Remover da lista" | 12 |
| 037 | ...\09-campanhas\imagens\09-037-passo-2-importar-csv.jpg | o passo 1 do .csv: "PASSO 1 DE 3", instruções, "Baixar arquivo de exemplo .CSV", "Importar agora", ilustração | 12 |
| 038–043 | ...\09-campanhas\imagens\09-038-passo-3-configuracoes-opcionais.jpg, 09-039-passo-3-rolado.jpg, 09-040-passo-3-adicionar-tag.jpg, 09-041-passo-3-status-da-conversa.jpg, 09-042-passo-3-lista-de-origens.jpg, 09-043-passo-3-origem-e-etapa.jpg | passo 3 inteiro: tag, negócio, etapa, status, atendente, os "manter" | 13 |
| 044, 045 | ...\09-campanhas\imagens\09-044-passo-4-confirme-seu-envio.jpg, 09-045-passo-4-contatos-selecionados.jpg | o cartão de confirmação, custo, aviso de limites, "Contatos selecionados", os três botões | 9, 14 |

Regras e textos: `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\material-do-codigo.md` (seções 2.4, 3 "Assistente de WhatsApp", 5 "Regras de validação" e 6).

### Medidas tiradas dos prints (px de CSS)

| Peça | Medida |
|---|---|
| Trilha (018) | faixa de 48px, borda de baixo `casca-divisoria`, `px-6`; 13px; itens anteriores `casca-suave`, o último 13px/500 `casca-texto`; separador `›` 12px `casca-meta` com 6px de cada lado |
| Barra de passos (018, 027, 044) | faixa de 62px (`py-5`), borda de baixo `casca-divisoria`, centrada; passo = círculo 22px + rótulo 13px, 8px entre eles; entre passos um traço de 24px (1px `casca-borda`) com 12px de cada lado; **atual**: círculo cheio `casca-marca` com o número 11px/600 branco, rótulo `casca-marca` 13px/500; **concluído**: círculo contornado 1px `casca-borda` com `Check` 12px `casca-suave`, rótulo `casca-texto`; **futuro**: círculo contornado com o número 11px `casca-suave`, rótulo `casca-texto-2` |
| Área do conteúdo (018) | rolagem própria; largura máxima 1050px centrada; coluna do formulário 625px, 40px de vão, coluna da prévia 340px (some abaixo de 1100px de largura); `pt-9` |
| Título do passo (018) | 20px/600 `casca-texto`; subtítulo 13px `casca-suave` 4px abaixo; 20px até o primeiro campo |
| Rótulo e campo (018) | rótulo 13px/500 `casca-texto`, 8px até o campo; campo 32px, canto 6px, fundo `casca-busca`, sem borda, `px-3`, 13px, placeholder `casca-meta`; foco: borda 1px `casca-marca`; contador 11px `casca-meta` à direita, 6px abaixo; 24px entre campos |
| Cartão de escolha (018, 021) | duas colunas, 12px de vão; `px-3 py-2.5`, borda 1,5px `casca-borda`, canto 8px; título 13px/500, descrição 12px `casca-suave`; rádio 16px (anel 1,5px `casca-borda`; marcado: anel `casca-marca` com miolo 8px); com ícone: quadrado 28px canto 8px (`casca-marca-suave`/ícone `casca-marca`; marcado: cheio `casca-marca`/ícone branco); **selecionado**: borda `casca-marca` e fundo `casca-marca-suave` |
| Modelo vazio (018) | 44px, canto 8px, fundo `casca-busca`, "+ Selecionar modelo existente" 13px/500 `casca-marca` centrado |
| Cartão do modelo (025) | 64px, borda 1px `casca-borda`, canto 8px, `px-3`; quadrado 36px canto 8px `casca-marca-suave` com `MessageSquare` 18px `casca-marca`; nome 13px/600 caixa alta; embaixo "Marketing · BR Portuguese (BR)" 12px `casca-suave`; à direita `SquarePen` e `Trash2` 16px `casca-texto-2` em botões de 28px |
| Variáveis (025, 026) | cabeçalho 13px/500 + à direita "1 de 1 resolvida" 12px `casca-suave`; caixa com borda 1px `casca-borda`, canto 8px, `p-3`; trecho 13px com `{{1}}` 13px/600 `casca-marca`; alternância "Campo do CRM"/"Valor fixo" de 28px (fundo `casca-busca`, a ativa branca com sombra leve, 12px); chip do campo 24px `casca-marca-suave`/`casca-marca` 12px; "+ Definir texto alternativo" 11px/500 `casca-marca` |
| Prévia do celular (018, 025, 044) | 340×560, moldura 10px `--escale-celular-moldura` com canto 44px; barra de status 28px na cor do cabeçalho com "HH:mm" 13px/600 branco; cabeçalho 56px `--escale-celular-cabecalho` com `ArrowLeft` 18px, avatar 32px (inicial), nome 15px/600 branco cortado e "online" 11px; fundo `--escale-celular-fundo`; balão branco, canto 8px (o de cima à esquerda 0), `p-2.5`, 13px, `max-w-[85%]`, hora "HH:mm" 11px `casca-meta` + `CheckCheck` 14px azul à direita embaixo; vazio: texto 13px `casca-suave` centrado |
| Chip de variável na prévia (025) | 20px, `px-1.5`, canto 4px, `casca-marca-suave`/`casca-marca` 13px/500 |
| Rodapé (018, 044) | 56px, borda de cima `casca-divisoria`, `px-6`, botões à direita com 8px de vão; "Voltar"/"Salvar como rascunho": contornados 32px `px-4` canto 6px 13px/500; principal: 32px `px-4` `casca-marca` branco 13px/500 (o do passo 4 com `Send` 14px) |
| Cartões do passo 2 (027) | 3 colunas, 16px de vão; 146px; fundo `casca-raia`, borda 1px `casca-borda`, canto 10px; quadrado 44px canto 8px branco com o ícone 20px `casca-marca` (`UserPlus`, `Users`, `Upload`); título 13px/600, 12px abaixo; descrição 13px `casca-suave` |
| Destinatários (035) | linha de 32px: "Destinatários" 13px `casca-texto-2` + o número 13px/600 `casca-marca`; "editar seleção" 13px/500 `casca-marca` com `Pencil` 12px; à direita os três botões contornados de 32px e a lixeira 32px; linha do destinatário: cartão 60px, borda 1px `casca-borda`, canto 8px, sombra leve, `px-4`; `Phone` 16px `casca-marca`, telefone 13px (coluna 220px); nome 13px + e-mail 11px (coluna 260px); tags; `EllipsisVertical` 18px no fim |
| Selecionar contatos (031) | modal 896px, canto 12px; cabeçalho 56px "Selecionar contatos" 15px/500 + X; barra: busca 260px 32px, "Todos os contatos" (`Users` 14px) e "Filtros" (`Funnel` 14px) contornados 32px; "Selecionar todos" + aviso `TriangleAlert` 14px `--escale-aviso-ok-texto`? não: laranja `--escale-prazo-atencao-texto` 12px à direita; linha 56px: caixa 18px, avatar 32px, nome 13px/500, tags, à direita `MessageCircle` 14px `casca-marca` + telefone 13px; paginação da casca; rodapé 64px: "Nenhum contato selecionado"/"N selecionado(s)" + "Limpar" 13px/500 `casca-marca`; "Cancelar" contornado e "Adicionar" da marca |
| Passo 3 (038, 039) | título 20px/600; descrição 13px `casca-suave` em largura cheia; seção: título 15px/600 + `AjudaDaCasca`; descrição 13px `casca-suave`; "+ Adicionar tag" pílula 24px, borda 1px `casca-borda`, canto cheio, 11px/500; divisória 1px `casca-divisoria` com 24px em volta; linhas de configuração: borda de cima `casca-divisoria`, `py-4`, rótulo 13px/500 numa coluna de 240px, controle de 620px; caixa de marcar 18px com o texto 13px a 8px; desabilitada a 40% |
| Passo 4 (044) | título 20px/600; cartão 595px, borda 1px `casca-borda`, canto 12px, sombra leve; linha 62px `px-4` com quadrado 30px canto 8px `casca-marca-suave` e o ícone 14px `casca-marca` (`Tag`, `Zap`, `Users`), rótulo 12px `casca-meta`, valor 13px `casca-texto`; divisória entre linhas; faixa "Custo estimado:" 48px `casca-marca-suave`, 13px/500 `casca-marca`, valor 15px/700 `casca-marca`; aviso 595px a 16px: borda esquerda 3px `casca-marca`, fundo `casca-marca-suave`, `p-4`, título 13px/500 `casca-marca` com `HelpCircle` 14px, texto 12px `casca-suave`, "Saiba mais" com `ExternalLink` 12px, divisória, `Clock` 12px + texto 12px `casca-meta` |
| Contatos selecionados (045) | modal 1152px, canto 12px; título 15px/500 centrado + X; linhas iguais às do passo 2, sem ⋮ |

### Cores medidas (amostra de pixel)

| Uso | Claro | Escuro | Fonte |
|---|---|---|---|
| `--escale-celular-moldura` | `#1b1b20` | `#000000` | medido, 018 |
| `--escale-celular-cabecalho` | `#0b5c4c` | `#0b5c4c` | medido, 018 (é do WhatsApp, não da Clint nem da marca) |
| `--escale-celular-fundo` | `#ece5dd` | `#1f2c33` | medido, 018 (escuro: o do WhatsApp escuro) |
| `--escale-celular-visto` | `#53bdeb` | `#53bdeb` | medido, 025 |
| `--escale-modelo-balao` | `#e7f1fd` | `#1d2a3a` | medido, 024 (balão da prévia no modal) |
| `--escale-categoria-fundo` / `--escale-categoria-texto` | `#e5e9fb` / `#4b5ac4` | `#252b4a` / `#a9b4f5` | medido, 023 ("Marketing") |
| Selo "Aprovado" | o tom verde da 8A (`CLASSE_DO_TOM.verde`) | — | 024 |

### Textos da Clint usados nesta fase

Do `material-do-codigo.md` (seção 3, "Assistente de WhatsApp") e dos prints:
- **Trilha e passos:** "Campanhas", "WhatsApp", "Nova campanha", "Configure a sua campanha", "Escolha seus contatos", "Configurações opcionais", "Confirme seu envio".
- **Passo 1:** "Mensagem de WhatsApp Oficial", "Defina os dados da campanha e escolha o modelo de mensagem que será enviado.", "Nome da campanha", "Ex: Reativação de junho", "Limite de {max} caracteres atingido.", "Dispositivo de WhatsApp", "Selecionar conta", "Nenhum dispositivo disponível", "Modelo de mensagem", "+ Selecionar modelo existente", "Editar modelo", "Remover selecionado", "Variáveis do modelo", "{n} de {m} resolvida(s)", "Resolva as variáveis do modelo para avançar.", "Valor fixo", "+ Definir texto alternativo", "Quando enviar", "Enviar agora", "A campanha entra na fila imediatamente.", "Criar agendamento", "Escolha data e horário para o disparo.", "Data", "Hora", "Selecione um modelo para ver a prévia da mensagem", "online", "Próximo", "Voltar".
- **Validações:** "Você deve selecionar quando deseja enviar.", "Você precisa selecionar uma data.", "Você precisa selecionar uma hora válida.", "A hora selecionada não pode ser menor que o horário atual.", "O nome da campanha deve ter no máximo {max} caracteres.".
- **Modal:** "Escolher mensagem", "Pesquisar por...", "Todas as categorias", "USADOS RECENTEMENTE", "TODOS OS MODELOS", "Novo modelo", "Selecione um modelo de mensagem à sua esquerda para enviar.", "Aprovado", "As variáveis serão preenchidas com os dados de cada contato no envio.", "Mapear variáveis", "Cancelar", "Selecionar".
- **Passo 2:** "Escolha para quem você quer enviar Whatsapp", "Destinatários", "Adicionar contato" / "Cadastre um contato manualmente", "Selecionar contatos" / "Escolha da sua base de contatos", "Importar telefones .csv" / "Importe uma lista .csv", "editar seleção", "Remover contatos", "Remover da lista", "Você deve selecionar pelo menos um contato.", "Selecionar todos", "Contatos duplicados não poderão ser selecionados", "Nenhum contato selecionado", "Não foram encontrados contatos.", "Tente ajustar a busca ou os filtros.", "Não foi possível carregar os contatos.", "Tentar novamente", "Adicionar", "A quantidade de contatos pode variar até o momento do envio.", "PASSO 1 DE 3", "Escolha o arquivo .CSV que você quer enviar WhatsApp em massa", "Instruções", "Baixe o arquivo de modelos de preenchimento abaixo para ajudá-lo no mapeamento de campos do seu arquivo. Lembre-se de mapear os campos conforme as variáveis que você utiliza no modelo de mensagem que quer enviar.", "Baixar arquivo de exemplo .CSV", "Importar agora".
- **Passo 3:** "Personalize as configurações da sua campanha no CRM. Essas configurações são opcionais e serão aplicadas somente aos contatos que obtiverem sucesso na campanha após sua conclusão.", "Adicionar tag para contatos", "As tags serão aplicadas aos contatos alcançados pela campanha.", "Adicionar tag", "Negócios e atendimento", "Defina como os contatos serão tratados no funil após o envio.", "Criar negócios em uma origem", "Selecione uma origem", "Etapa", "Selecione uma etapa", "Status da conversa", "Em aberto", "Fechado", "Em espera", "Para atendimentos existentes manter o status atual da conversa", "Atribuir um atendente", "Selecione...", "Para atendimentos existentes manter o mesmo atendente", "Manter atendente de acordo com a distribuição de dono do negócio".
- **Passo 4:** "Confirme seu envio de mensagem de Whatsapp", "Nome da campanha", "Quando enviar", "Envio imediato", "Enviar para", "contato selecionado"/"contatos selecionados", "Ver contatos", "Custo estimado:", "Limites de envio do WhatsApp", "O WhatsApp possui limites diários de envio definidos pela Meta. A quantidade de conversas que você pode iniciar por dia depende do tipo de conexão e da qualidade dos seus envios.", "Saiba mais", "Seu envio poderá demorar alguns minutos para ser concluído.", "Salvar como rascunho", "Enviar Whatsapp", "Rascunho salvo com sucesso.", "Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente.", "Contatos selecionados".
- **Fim:** "enviada", "com sucesso", "Criar nova campanha", "Ir para a tela inicial", "Erro ao criar campanha de".
- **Textos nossos** (a Clint não tem): "Mensagem de WhatsApp" (título com número não oficial), "WhatsApp Oficial"/"WhatsApp não oficial" (grupos do seletor), "Campo do CRM" (no lugar de "Campo da Clint"), "Mensagem", "Usar texto salvo", "Inserir variável", "Escreva a mensagem para ver a prévia", "Escolher texto salvo", "Nenhum texto salvo", "Base legal", "Consentimento", "Interesse legítimo", "Referência da avaliação (LIA)", "Quem atende a resposta", "Ritmo de envio", "Números extras", os rótulos do ritmo, "elegíveis", "fora da lista", "Ver motivos", "Enviar teste", "Campanha {nome} agendada com sucesso", "Importando contatos…", "Esta campanha usava o público por filtro da tela antiga; escolha os destinatários de novo." e as recusas do servidor.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Dois PRs na `wt-frente-b`**: PR A `feat/fase-8b-motor-do-assistente` (Tasks 1–8: migration **9302** `20261111120000`, regras, rotas e motor) e PR B `feat/fase-8b-telas-do-assistente` (Tasks 9–16), cada um mergeado ao terminar; tag/release/VPS só no fim da Frente B | regra de 18/10; o motor e as telas se revisam separados |
| N2 | **Onde abre:** com a casca, `/app/campaigns/new` mostra o assistente vazio e `/app/campaigns/[id]/edit` mostra o assistente da campanha (rascunho ou cópia). Os destinos da 8A (`ROTA_DA_NOVA`, `rotaDoRascunho`) **não mudam**: só as duas páginas ganham o encaixe. Abaixo de gerente → `/app/inbox` | PRD B1, B17; 8A N11 |
| N3 | **Passo 1 sem "Tipo de envio"** (PRD B4 ignorado): nome (3 a 80, contador), dispositivo, mensagem, quando enviar e base legal. O título é "Mensagem de WhatsApp Oficial" com número oficial e "Mensagem de WhatsApp" com o não oficial ou sem número | PRD B2–B8, B16; resposta 6 |
| N4 | **Oficial × não oficial pela capacidade do canal**, nunca pelo nome do provedor (cerca `lint:channels`): a rota `GET /api/v1/campanhas-da-casca/numeros` usa `listSelectableChannels` (`aceitaMensagemLivre`) e devolve `oficial = !aceitaMensagemLivre`, o `provider` (só para `useModelosDeMensagem`) e o setor (duas consultas, sem embed: memória "embed ambíguo"). O seletor mostra só os números `WORKING` (e o já escolhido, mesmo fora do ar) | PRD B3; cerca `lint:channels` |
| N5 | **Mensagem:** número oficial → **modelo aprovado** escolhido no modal "Escolher mensagem" (lista de `useModelosDeMensagem`, só `APPROVED`; busca; categoria; "USADOS RECENTEMENTE"; prévia; "Editar modelo" e "+ Novo modelo" levam a `/app/templates`; o ↻ sincroniza para admin). Variáveis: cada slot de texto (`expects: "text"`) é "Campo do CRM" (Nome, Primeiro nome, Saudação e os campos do contato e do negócio do catálogo da 2C) ou "Valor fixo", com texto alternativo opcional; slots de mídia usam o valor salvo do modelo (`savedValues`) — modelo com mídia sem valor salvo não pode ser escolhido. Número não oficial → "Mensagem" (até 4.096) com "Inserir variável" e "Usar texto salvo" (o mesmo modal, com os textos salvos). "Pastas" e "Com Flow" não entram (o Escale não tem) | PRD B5, B6 |
| N6 | **Variável sem valor:** com texto alternativo, o alternativo vai; sem ele, a pessoa sai com `variavel_ausente` (a régua do original). A saudação fica como `{{saudacao}}` no snapshot e é resolvida na hora do envio, como no texto livre | PRD B6; `renderizador.ts` |
| N7 | **Público (`escale_publico`)** = `{ selecao, avulsos, removidos }`. `selecao` é o `AlvoDaAcao` da 2B: marcar um a um grava os ids (até 1.000, o `IDS_MAX`); "Selecionar todos" grava **o filtro** (`q`, `v`, `f`, `quantidade`, `excluidos`) e o banco o resolve na preparação pela `fn_escale_contatos_do_filtro`. `avulsos` = contatos criados no "Adicionar contato" e os do .csv; `removidos` = "Remover da lista". **Sem teto**: a preparação lê o público em páginas de 1.000 | PRD B11, resposta 8 |
| N8 | **"Selecionar contatos"** reaproveita da 2A/2B: `useListaDeContatos` (estado local, não a URL), `PainelDeFiltros`, `SeletorDeFiltros` (Padrão: Todos os contatos, Com negócio, Sem negócio; Meus filtros; Criar filtro abre o balão de salvar da 2B), `PaginacaoDaCasca`, e o modelo de seleção de `lib/escale/contatos/selecao.ts`. A linha é a da Clint (caixa, avatar, nome, tags, telefone). Contato sem telefone fica desmarcável (cinza, "Sem telefone"); o duplicado por telefone é tirado na preparação (`duplicado`), não no modal — o aviso "Contatos duplicados não poderão ser selecionados" fica | PRD B11 |
| N9 | **"Adicionar contato"** = a `JanelaNovoContato` da 2A (já é o "Informações do contato" da Clint, com a oportunidade de negócio); o id criado entra em `avulsos` | PRD B10 |
| N10 | **"Importar telefones .csv"**: a janela do passo 1 da Clint (037) com "Baixar arquivo de exemplo .CSV" (`csvDeExemplo("contato")`) e "Importar agora", que abre a `JanelaDeImportacao` da 2F com `tipoInicial="contato"` e `travarTipo`. O assistente acompanha a importação (`GET /api/v1/importacoes/[id]` a cada 2 s) e, ao `concluida`, busca os contatos dela (`GET /api/v1/importacoes/[id]/contatos`, rota nova da 8B) e os põe em `avulsos`. `aguardando_revisao` avisa para concluir a revisão em Importações | PRD B13 |
| N11 | **Passo 3 (`escale_pos_envio`)**: tags (até 20, o vocabulário de etiquetas do contato), origem + etapa (obrigatória com origem), status da conversa (Em aberto — o padrão —, Fechado, Em espera) + "manter o status atual", atendente + "manter o mesmo atendente" + "de acordo com a distribuição de dono do negócio" (só com origem, como o 039 mostra apagado). Depois, os blocos do original: **Quem atende a resposta** (agente), **Ritmo de envio** (intervalo, teto diário e por hora, janela) e **Números extras** (só com número não oficial, P3) | PRD B14, resposta 3 |
| N12 | **Negócio da campanha:** com origem, `pipeline_id`/`stage_id` da campanha passam a ser a origem e a etapa (quem responde antes da conclusão já nasce ali, pelo caminho de sempre) e, na conclusão, o pós-envio cria o negócio para quem recebeu e **ainda não tem negócio aberto naquela origem**, com `source = 'campanha'` e `source_metadata = { campaign_id, campaign_name }` (o que a 8C conta). Sem origem, `pipeline_id`/`stage_id` ficam nulos e a resposta segue no funil do número | PRD B14, resposta 3; `origem-do-lead.ts` |
| N13 | **Pós-envio** só na conclusão (`completed`), só para `sent_at is not null`, uma vez por destinatário (`escale_pos_envio_em` marcado antes de agir), na ordem: tags → negócio → atendente → status. Ator `{ type: "webhook_source", id: "campaign:<id>" }` e `requestId` `campaign-pos-envio:<id>` (nunca `rule:`, que o motor de automações ignora). "Atendimento existente" = conversa criada antes de `started_at` da campanha. "Fechado" = `fn_service_status(…, 'closed')`; "Em espera" = os campos de `camposParaEntrarEmEspera` (3C) com o criador da campanha; "Em aberto" (o padrão) não mexe: o envio já abriu o atendimento, e reabrir o que alguém fechou depois seria passar por cima do operador. Atendente = `fn_conversation_assign(…, 'routing')` (não cala o agente da resposta); "dono do negócio" = o dono do negócio aberto na origem | PRD B14; molde da 2B |
| N14 | **Preparar ao entrar no passo 4** (PRD B15): salva o rascunho e chama `…/[id]/preparar`, que usa o `prepararAcao` do original (o mesmo compare-and-set, os mesmos vetos, os mesmos motivos). O cartão mostra "N contatos selecionados" (os elegíveis), "M fora da lista · Ver motivos" (`fn_escale_fora_da_lista`), a base legal e "Enviar teste" (P2). "Voltar" do passo 4 chama a ação `rascunho` da 8A (`ready → draft`). Quem fecha a aba no passo 4 deixa a campanha "Pronta para enviar" na lista (a 8A já mostra e oferece "Cancelar campanha") | PRD B15 |
| N15 | **Custo preparado:** a faixa "Custo estimado:" mostra "—"; cada envio grava `escale_numero_oficial` e `escale_categoria_do_modelo` em `campaign_recipients` | PRD B15, resposta 4 |
| N16 | **Enviar:** `…/[id]/enviar` inicia (`iniciarAcao`) ou agenda (`agendarAcao`) conforme `escale_quando`; horário que já passou volta com "A hora selecionada não pode ser menor que o horário atual.". Depois: a tela de sucesso (N do topo, item 1). "Salvar como rascunho": a ação `rascunho` da 8A, aviso "Rascunho salvo com sucesso." e volta à lista | PRD B15, B18 |
| N17 | **Duplicar** passa a ser do fork (`POST /api/v1/campanhas-da-casca/[id]/duplicar`): copia tudo (nome + " Cópia", até 80; mensagem, público, passo 3, quando, base legal, funil, etapa, agente, ritmo e os números extras); o hook da 8A (`caminhoDaAcao`) troca a rota. O duplicar do original (" (cópia)") fica para quem não usa a casca | PRD B17 |
| N18 | **Rascunho do formulário antigo** aberto no assistente: nome, número, texto, base legal e ritmo vêm; o público por filtro antigo (`audience_filter`) não tem tela na casca, então os destinatários começam vazios com o aviso "Esta campanha usava o público por filtro da tela antiga; escolha os destinatários de novo." | compatibilidade |
| N19 | **Componentes da Clint, nunca o nativo:** data e hora com o `SeletorDeDataEHora` da casca (a Clint usa `type="time"` nativo; regra 2 do CLAUDE.md); seletores com o `SeletorDaCasca`; caixas com a `CaixaDaCasca`; dica com a `AjudaDaCasca` **dentro de um `TooltipProvider` próprio da página** (memória "provedor escondido pelo teste": a página monta o provedor e o teste não) | CLAUDE.md regra 2; escale.13/14 |
| N20 | **Cores novas** (celular, balão do modal, categoria) como variáveis em `app/escale-tema.css` no bloco `FORK ESCALE · Fase 8B` (claro e escuro), lidas por valor arbitrário (`bg-(--escale-…)`) nas próprias peças (são poucas e de um lugar só cada) | CLAUDE.md regra 3; 8A N16 |
| G1 | **Verificação enxuta**: por task só o que a task cria, typecheck e eslint dos arquivos alterados; `test:db`, `test:db:update`, rodada cheia, revisor (Opus 5.5) e conferência visual na bateria única do fim da Frente B | regra de 18/10 |

## Global Constraints

### Repositório, worktree e Git

- Worktree: `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-b`. **Base:** `escale-crm/main` **com a 8A mergeada** (a Task 1 prova: `lib/escale/campanhas/rotas.ts` e `hooks/escale/useCampanhasDaCasca.ts` existem; `20261110120000_9301_lista_de_campanhas.sql` está na `main`).
- **Branches:** PR A `feat/fase-8b-motor-do-assistente` (`git switch -c feat/fase-8b-motor-do-assistente escale-crm/main`); PR B `feat/fase-8b-telas-do-assistente`, criada da `main` **depois** do merge do PR A.
- **Migration:** `supabase/migrations/20261111120000_9302_assistente_de_campanha.sql`. Antes: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; `9302` (ou o timestamp `20261111120000`) em outra branch (a 8C e a 8D podem ter reservado) → PARE e pergunte.
- **PR** para `rgisjr/escale-crm`, base `main`, mergeado ao terminar. **Proibido:** push em `origin` (Rafael), tag, release, VPS e gravar no banco de produção.
- Conflitos prováveis com a 8C/8D e a Frente C: `lib/i18n/dicionario.ts`, `supabase/baseline.sql`, `lib/audit/actions.ts`, `app/escale-tema.css`, `lib/ui/icons-da-casca.ts`, `lib/event-log/register-handlers.ts` — manter os dois blocos, o que já está na `main` primeiro.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`; `export NODE_OPTIONS=--max-old-space-size=6144` para o typecheck.
- `test:db` **não roda nesta fase** (bateria da Frente B). O arquivo de prova é escrito na Task 2 e fica pronto.
- `corepack pnpm lint:channels` roda nas Tasks 4, 5 e 8 (proíbe nome de provedor fora de `lib/channels/`, até em comentário).

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 8B`. Campanha sem as colunas `escale_*` (criada pelo formulário do original) passa por todos eles sem mudar de comportamento.

| Arquivo | Mudança |
|---|---|
| `lib/campanhas/preparacao.ts` | `prepararCampanha` e `classificar` aceitam `candidatos?` e `modelo?`; o `variables` do destinatário leva os valores do modelo |
| `lib/campanhas/consulta-de-audiencia.ts` | a função nova `candidatosPorIds` no fim do arquivo |
| `lib/campanhas/acoes.ts` | `CampanhaCarregada` e `COLUNAS` com `escale_mensagem`, `escale_publico`, `escale_quando`; `prepararAcao` resolve o público da casca; `testarAcao` manda o modelo |
| `lib/campanhas/rodada.ts` | lê `escale_mensagem` e `variables`; manda `entradaDoEnvio(...)`; grava o custo preparado; pede o pós-envio na conclusão |
| `lib/channels/selectable.ts` | `aceitaMensagemLivre` passa a ser exportada (uma palavra) |
| `lib/escale/massa/tipos.ts` (fork 2B) | `alvoSchema` passa a ser exportado |
| `app/app/campaigns/new/page.tsx`, `app/app/campaigns/[id]/edit/page.tsx` | com o cookie `topo`: confere o papel e devolve o assistente |
| `lib/event-log/register-handlers.ts` | registra o consumidor do pós-envio |
| `supabase/baseline.sql` | o bloco da 9302 (a migration sem a 1ª linha), logo ANTES de `-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----` (depois do bloco da 9301) |
| `lib/i18n/dicionario.ts` | bloco `// ─── FORK ESCALE · Fase 8B: assistente de campanha ───` logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` (depois do bloco da 8A) |
| `lib/audit/actions.ts` | depois do bloco da 8A: `"campaign.wizard_saved"`, `"campaign.post_send_applied"` |
| `app/escale-tema.css` | o bloco `FORK ESCALE · Fase 8B` no fim do arquivo |

Do fork que mudam: `app/api/v1/campanhas-da-casca/route.ts` (POST novo, 8A), `app/api/v1/campanhas-da-casca/[id]/[acao]/route.ts` (ações novas, 8A), `hooks/escale/useCampanhasDaCasca.ts` (duplicar pelo fork, 8A), `lib/ui/icons-da-casca.ts` (ícones novos).

### Cercas que precisam ficar verdes

`manifest-x-migrations`, `manifest-cita-caminho-que-existe`, `hardening-definer-varredura`, `definer-nova-nasce-exposta`, `gov-hardening-anon-definer`, `varredura-anon-e-o-ultimo-bloco`, `campanha-escreve-como-servidor`, `vocabulario-banco-x-typescript`, `i18n-espanhol-cobre-a-tela`, `controle-decorativo`, `tailwind-tokens`, `escale-casca-tokens`, `escale-tema`, `escale-casca-v2-original-intacto`, `evidencia-citada`, `vocabulario-do-funil`, `rodape-ocupado-contrato`, `dispatcher-org-parada`, e o `pnpm lint:channels`.

### Verificação (G1)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os achados com `corepack pnpm vitest run <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db`, `test:db:update`, rodada cheia, revisor (Opus 5.5, high) e conferência visual:** na bateria única do fim da Frente B.
3. **Comandos longos sempre em segundo plano.**

### Commits e PR

- Commits `feat(escale): … (Fase 8B)` terminados com `Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>`; o PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório na Task 1.
- Todo texto de tela por `t()` com literal. Datas, horas e números no formato brasileiro.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/escale/campanhas/assistente.ts` | novo | os schemas do assistente (mensagem, público, pós-envio, tudo) e a ida/volta com as colunas |
| `lib/escale/campanhas/modelo.ts` | novo | as variáveis do modelo: tokens, valores, corpo, trecho, resolvidas, entrada do envio |
| `lib/escale/campanhas/publico.ts` | novo | o público: vazio, avulsos, remover, seleção, compilar para o banco |
| `tests/unit/escale-assistente-regras.test.ts` | novo | as três acima |
| `supabase/migrations/20261111120000_9302_assistente_de_campanha.sql`, `supabase/baseline.sql` | novo / bloco | colunas e as 3 funções |
| `tests/unit/escale-assistente-migration.test.ts`, `tests/invariants/escale-assistente-9302.test.ts` | novos | o texto da migration; a prova contra Postgres (bateria) |
| `lib/escale/campanhas/publico-banco.ts` | novo | resolver o público (ids e página) e hidratar as linhas |
| `app/api/v1/campanhas-da-casca/publico/route.ts`, `app/api/v1/importacoes/[id]/contatos/route.ts` | novos | a página do público; os contatos de uma importação |
| `tests/unit/escale-assistente-publico.test.ts` | novo | as duas rotas e o `publico-banco` |
| `lib/escale/campanhas/conferir.ts` | novo | conferir o assistente contra a organização (número, modelo, etapa, atendente, agente) |
| `app/api/v1/campanhas-da-casca/route.ts` (POST), `.../[id]/assistente/route.ts` (GET, PUT), `.../numeros/route.ts` | alterado / novos | criar e salvar o rascunho; ler o assistente; os números |
| `tests/unit/escale-assistente-rascunho.test.ts` | novo | as rotas do rascunho e dos números |
| `lib/campanhas/preparacao.ts`, `consulta-de-audiencia.ts`, `acoes.ts`, `rodada.ts`, `lib/channels/selectable.ts`, `lib/escale/massa/tipos.ts` | alterados | os encaixes do motor |
| `lib/escale/campanhas/candidatos.ts`, `lib/escale/campanhas/custo.ts` | novos | os candidatos do público da casca; o custo preparado |
| `tests/unit/escale-assistente-motor.test.ts` | novo | candidatos, preparação com modelo, entrada do envio, teste |
| `lib/escale/campanhas/acoes-do-assistente.ts`, `app/api/v1/campanhas-da-casca/[id]/[acao]/route.ts`, `.../[id]/fora-da-lista/route.ts`, `hooks/escale/useCampanhasDaCasca.ts` | novo / alterados / novo | preparar, enviar, duplicar; motivos |
| `tests/unit/escale-assistente-acoes.test.ts` | novo | as ações |
| `lib/escale/campanhas/pos-envio.ts`, `pos-envio-handler.ts`, `lib/event-log/register-handlers.ts`, `lib/audit/actions.ts` | novos / alterados | o pós-envio |
| `tests/unit/escale-assistente-pos-envio.test.ts` | novo | o pós-envio |
| `components/escale/campanhas/molde/*.tsx` (8 peças) | novos | trilha, passos, rodapé, molde, número, escolha, contador, resumo |
| `components/escale/campanhas/molde/estilos.ts`, `components/escale/campanhas/assistente/PreviaDoCelular.tsx`, `lib/escale/campanhas/previa.ts`, `app/escale-tema.css`, `lib/ui/icons-da-casca.ts` | novos / alterados | as classes do molde, a prévia e as cores |
| `tests/unit/escale-assistente-molde.test.tsx` | novo | as peças |
| `lib/escale/campanhas/estado-do-assistente.ts`, `hooks/escale/useAssistenteDeCampanha.ts` | novos | o estado e os pedidos |
| `tests/unit/escale-assistente-estado.test.ts` | novo | o redutor e as validações |
| `hooks/escale/useCamposDaCampanha.ts`, `lib/escale/campanhas/modelos-da-meta.ts`, `components/escale/campanhas/assistente/{PassoConfigurar,JanelaEscolherMensagem,VariaveisDoModelo,MensagemLivre,QuandoEnviar,BaseLegal}.tsx` | novos | passo 1 |
| `tests/unit/escale-assistente-passo-1.test.tsx` | novo | passo 1 |
| `components/escale/campanhas/assistente/{PassoContatos,JanelaSelecionarContatos,JanelaImportarCsv,ListaDeDestinatarios}.tsx` | novos | passo 2 |
| `tests/unit/escale-assistente-passo-2.test.tsx` | novo | passo 2 |
| `components/escale/campanhas/assistente/{PassoOpcionais,EscolhaDeTagsDaCampanha,RitmoDaCampanha}.tsx` | novos | passo 3 |
| `tests/helpers/banco-de-mentira.ts` | novo | o Supabase de mentira dos testes da 8B |
| `tests/unit/escale-assistente-passo-3.test.tsx` | novo | passo 3 |
| `lib/escale/campanhas/textos-do-assistente.ts`, `components/escale/campanhas/assistente/{PassoConfirmar,JanelaContatosSelecionados,JanelaTesteDaCampanha,FimDoAssistente}.tsx` | novos | passo 4, sucesso e erro |
| `tests/unit/escale-assistente-passo-4.test.tsx` | novo | passo 4 |
| `components/escale/campanhas/assistente/AssistenteDeCampanha.tsx`, `app/app/campaigns/new/page.tsx`, `app/app/campaigns/[id]/edit/page.tsx` | novo / alterados | a página e os encaixes |
| `tests/unit/escale-assistente-pagina.test.tsx` | novo | a página |
| `lib/i18n/dicionario.ts` | alterado | o espanhol |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md`, `LOG.md` | alterados (fora do repositório) | a linha da 8B; o log |

---


# PR A — o motor do assistente (Tasks 1–8)

### Task 1: Branch, base e as regras puras

**Files:**
- Create: `lib/escale/campanhas/assistente.ts`, `lib/escale/campanhas/modelo.ts`, `lib/escale/campanhas/publico.ts`, `tests/unit/escale-assistente-regras.test.ts`
- Modify: `lib/escale/massa/tipos.ts` (exportar `alvoSchema`)

**Interfaces (Produces):**
- `assistente.ts`: `NOME_MIN = 3`, `NOME_MAX = 80`, `TEXTO_MAX = 4096`, `TAGS_DO_POS_ENVIO_MAX = 20`, `NUMEROS_EXTRAS_MAX = 10`, `CAMPO_DA_VARIAVEL`; schemas `variavelDoModeloSchema`, `mensagemSchema`, `quandoSchema`, `publicoSchema`, `posEnvioSchema`, `assistenteSchema`; tipos `VariavelDoModelo`, `MensagemDaCampanha`, `MensagemDeModelo`, `QuandoEnviar`, `PublicoDaCampanha`, `SelecaoDoPublico`, `StatusDoPosEnvio`, `PosEnvio`, `Assistente`, `LinhaDoAssistente`; constantes `STATUS_DO_POS_ENVIO`, `ROTULO_DO_STATUS_DO_POS_ENVIO`, `PUBLICO_VAZIO`, `POS_ENVIO_PADRAO`, `COLUNAS_DO_ASSISTENTE`; funções `colunasDoAssistente(a: Assistente): Record<string, unknown>`, `assistenteDaLinha(l: LinhaDoAssistente, extras: string[]): { assistente: Assistente; publicoAntigo: boolean }`.
- `modelo.ts`: `CAMPOS_BASICOS`, `tokenDoCampo(campo)`, `variaveisDoCorpo(corpo): string[]`, `tokensDoModelo(m): string`, `valoresDoModelo(m, valores, quando?) → { valores; faltando }`, `corpoComValores(corpo, valores): string`, `trechoDaVariavel(corpo, chave, raio?)`, `variavelResolvida(v)`, `contagemResolvida(chaves, variaveis) → { feitas; total }`, `EntradaDoEnvio`, `entradaDoEnvio(mensagem, corpo, variables, quando, nome): EntradaDoEnvio`.
- `publico.ts`: `publicoVazio(p): boolean`, `comAvulsos(p, ids)`, `semContato(p, id)`, `comSelecao(p, s)`.

- [ ] **Step 1: A base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
export PATH="/c/Program Files/nodejs:$PATH"
git fetch escale-crm --quiet
git status --short   # vazio; se não, PARE
git switch -c feat/fase-8b-motor-do-assistente escale-crm/main
test -f lib/escale/campanhas/rotas.ts && test -f hooks/escale/useCampanhasDaCasca.ts && ls supabase/migrations | grep -q "_9301_" && echo "8A na main" || echo "PARE: a 8A ainda não está na main"
bash scripts/checar-colisao-de-migration.sh escale-crm/main
git branch -r | xargs -I{} sh -c 'git ls-tree -r --name-only {} supabase/migrations 2>/dev/null | grep -q "9302\|20261111120000" && echo "{}"' | sort -u
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-19-fase-8b-assistente-de-campanha.md" docs/superpowers/plans/
```

Expected: "8A na main"; a última linha não lista nenhuma branch (se listar, `9302` está reservada: PARE e pergunte).

- [ ] **Step 2: Exportar o `alvoSchema` da 2B**

Em `lib/escale/massa/tipos.ts`, troque `const alvoSchema = z.discriminatedUnion("tipo", [` por:

```ts
// FORK ESCALE · Fase 8B: o público da campanha guarda a mesma seleção (ids ou o filtro).
export const alvoSchema = z.discriminatedUnion("tipo", [
```

- [ ] **Step 3: O teste das regras (falha)**

`tests/unit/escale-assistente-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { FILTRO_VAZIO } from "@/lib/campanhas/audiencia";
import {
  POS_ENVIO_PADRAO,
  PUBLICO_VAZIO,
  assistenteDaLinha,
  assistenteSchema,
  colunasDoAssistente,
  mensagemSchema,
  posEnvioSchema,
  type Assistente,
  type LinhaDoAssistente,
  type MensagemDeModelo,
} from "@/lib/escale/campanhas/assistente";
import {
  contagemResolvida,
  corpoComValores,
  entradaDoEnvio,
  tokensDoModelo,
  trechoDaVariavel,
  valoresDoModelo,
  variaveisDoCorpo,
} from "@/lib/escale/campanhas/modelo";
import { comAvulsos, comSelecao, publicoVazio, semContato } from "@/lib/escale/campanhas/publico";

const NUMERO = "aaaaaaaa-0000-4000-8000-000000000001";
const C1 = "bbbbbbbb-0000-4000-8000-000000000001";
const C2 = "bbbbbbbb-0000-4000-8000-000000000002";
const ORIGEM = "cccccccc-0000-4000-8000-000000000001";
const ETAPA = "cccccccc-0000-4000-8000-000000000002";

const MODELO: MensagemDeModelo = {
  tipo: "modelo",
  nome: "msg1_ancca",
  idioma: "pt_BR",
  categoria: "MARKETING",
  corpo: "Oi, {{1}}! Tudo bem? {{2}}, aqui é a Naiara.",
  variaveis: {
    "1": { fonte: "campo", campo: "primeiro_nome", alternativo: null },
    "2": { fonte: "campo", campo: "saudacao", alternativo: null },
  },
};

const BASE: Assistente = {
  nome: "Reativação de junho",
  numeroId: NUMERO,
  mensagem: { tipo: "texto", texto: "Olá {{primeiro_nome}}" },
  quando: { modo: "agora" },
  baseLegal: "consent",
  lia: null,
  publico: { selecao: { tipo: "ids", ids: [C1] }, avulsos: [], removidos: [] },
  posEnvio: POS_ENVIO_PADRAO,
  agenteId: null,
  ritmo: {},
  numerosExtras: [],
};

describe("assistenteSchema", () => {
  it("aceita o assistente completo", () => {
    expect(assistenteSchema.safeParse(BASE).success).toBe(true);
  });

  it("nome de 3 a 80 (a Clint)", () => {
    expect(assistenteSchema.safeParse({ ...BASE, nome: "ab" }).success).toBe(false);
    expect(assistenteSchema.safeParse({ ...BASE, nome: "x".repeat(81) }).success).toBe(false);
    expect(assistenteSchema.safeParse({ ...BASE, nome: "x".repeat(80) }).success).toBe(true);
  });

  it("interesse legítimo exige a LIA", () => {
    expect(assistenteSchema.safeParse({ ...BASE, baseLegal: "legitimate_interest" }).success).toBe(false);
    expect(assistenteSchema.safeParse({ ...BASE, baseLegal: "legitimate_interest", lia: "LIA-7" }).success).toBe(true);
  });

  it("o número principal não entra como extra", () => {
    expect(assistenteSchema.safeParse({ ...BASE, numerosExtras: [NUMERO] }).success).toBe(false);
  });

  it("origem e etapa andam juntas; dono do negócio só com origem", () => {
    expect(posEnvioSchema.safeParse({ ...POS_ENVIO_PADRAO, origemId: ORIGEM }).success).toBe(false);
    expect(posEnvioSchema.safeParse({ ...POS_ENVIO_PADRAO, origemId: ORIGEM, etapaId: ETAPA }).success).toBe(true);
    expect(posEnvioSchema.safeParse({ ...POS_ENVIO_PADRAO, donoDoNegocio: true }).success).toBe(false);
  });

  it("variável do modelo: campo do CRM conhecido ou valor fixo", () => {
    const comCampo = (campo: string) =>
      mensagemSchema.safeParse({ ...MODELO, variaveis: { "1": { fonte: "campo", campo, alternativo: null } } }).success;
    expect(comCampo("contato.cidade")).toBe(true);
    expect(comCampo("lead.gancho")).toBe(true);
    expect(comCampo("sobrenome")).toBe(false);
    expect(mensagemSchema.safeParse({ ...MODELO, variaveis: { "1": { fonte: "fixo", valor: "" } } }).success).toBe(false);
  });
});

describe("colunasDoAssistente e assistenteDaLinha", () => {
  it("texto livre: o corpo é o texto; sem origem, funil e etapa nulos; agora, sem agenda", () => {
    const c = colunasDoAssistente(BASE);
    expect(c).toMatchObject({
      name: "Reativação de junho",
      channel_session_id: NUMERO,
      message_body: "Olá {{primeiro_nome}}",
      base_legal: "consent",
      lia_ref: null,
      audience_filter: FILTRO_VAZIO,
      pipeline_id: null,
      stage_id: null,
      escale_quando: null,
    });
    expect(c.escale_mensagem).toEqual(BASE.mensagem);
    expect(c.escale_publico).toEqual(BASE.publico);
  });

  it("modelo: o corpo é o do modelo; a origem vira o funil da resposta; agendar guarda a hora", () => {
    const c = colunasDoAssistente({
      ...BASE,
      mensagem: MODELO,
      quando: { modo: "agendar", em: "2026-11-20T15:00:00.000Z" },
      posEnvio: { ...POS_ENVIO_PADRAO, origemId: ORIGEM, etapaId: ETAPA },
    });
    expect(c).toMatchObject({
      message_body: MODELO.corpo,
      pipeline_id: ORIGEM,
      stage_id: ETAPA,
      escale_quando: "2026-11-20T15:00:00.000Z",
    });
  });

  const linha = (extra: Partial<LinhaDoAssistente> = {}): LinhaDoAssistente => ({
    id: "dddddddd-0000-4000-8000-000000000001",
    status: "draft",
    name: "Antiga",
    channel_session_id: NUMERO,
    message_body: "Oi {{nome}}",
    base_legal: "consent",
    lia_ref: null,
    agent_id: null,
    intervalo_segundos: 60,
    janela_inicio_hora: null,
    janela_fim_hora: null,
    teto_diario: null,
    teto_horario: null,
    escale_mensagem: null,
    escale_publico: null,
    escale_pos_envio: null,
    escale_quando: null,
    ...extra,
  });

  it("rascunho do formulário antigo: o texto vem, o público começa vazio e avisa", () => {
    const { assistente, publicoAntigo } = assistenteDaLinha(linha(), []);
    expect(assistente.mensagem).toEqual({ tipo: "texto", texto: "Oi {{nome}}" });
    expect(assistente.publico).toEqual(PUBLICO_VAZIO);
    expect(assistente.ritmo.intervalo_segundos).toBe(60);
    expect(publicoAntigo).toBe(true);
  });

  it("rascunho da casca volta inteiro", () => {
    const c = colunasDoAssistente({ ...BASE, mensagem: MODELO, quando: { modo: "agendar", em: "2026-11-20T15:00:00.000Z" } });
    const { assistente, publicoAntigo } = assistenteDaLinha(
      linha({
        escale_mensagem: c.escale_mensagem,
        escale_publico: c.escale_publico,
        escale_pos_envio: c.escale_pos_envio,
        escale_quando: "2026-11-20T15:00:00.000Z",
      }),
      [],
    );
    expect(assistente.mensagem).toEqual(MODELO);
    expect(assistente.quando).toEqual({ modo: "agendar", em: "2026-11-20T15:00:00.000Z" });
    expect(publicoAntigo).toBe(false);
  });
});

describe("modelo", () => {
  it("as variáveis do corpo, na ordem e sem repetir", () => {
    expect(variaveisDoCorpo("{{2}} e {{1}} e {{2}}")).toEqual(["2", "1"]);
  });

  it("os tokens que o modelo usa (para buscar os campos personalizados)", () => {
    expect(tokensDoModelo({ ...MODELO, variaveis: { "1": { fonte: "campo", campo: "lead.gancho", alternativo: null } } })).toContain(
      "{{lead.gancho}}",
    );
  });

  it("valores: o campo, a saudação literal até o envio, o alternativo e a falta", () => {
    expect(valoresDoModelo(MODELO, { nome: "Fernanda Koinwascki" })).toEqual({
      valores: { "1": "Fernanda", "2": "{{saudacao}}" },
      faltando: [],
    });
    expect(valoresDoModelo(MODELO, { nome: "" }).faltando).toEqual(["1"]);
    const comAlternativo: MensagemDeModelo = {
      ...MODELO,
      variaveis: { ...MODELO.variaveis, "1": { fonte: "campo", campo: "primeiro_nome", alternativo: "cliente" } },
    };
    expect(valoresDoModelo(comAlternativo, { nome: "" }).valores["1"]).toBe("cliente");
    const fixo: MensagemDeModelo = { ...MODELO, variaveis: { "1": { fonte: "fixo", valor: "time" } } };
    expect(valoresDoModelo(fixo, { nome: null }).valores).toEqual({ "1": "time" });
  });

  it("o corpo com os valores e o trecho em volta da variável", () => {
    expect(corpoComValores("Oi, {{1}}!", { "1": "Ana" })).toBe("Oi, Ana!");
    expect(corpoComValores("Oi, {{1}} {{3}}", { "1": "Ana" })).toBe("Oi, Ana {{3}}");
    expect(trechoDaVariavel("Bom dia! Oi, {{1}}! Tudo bem? Aqui é a Naiara.", "1")).toBe("…om dia! Oi, {{1}}! Tudo bem?…");
  });

  it("quantas variáveis estão resolvidas", () => {
    expect(contagemResolvida(["1", "2"], MODELO.variaveis)).toEqual({ feitas: 2, total: 2 });
    expect(contagemResolvida(["1", "2"], { "1": { fonte: "fixo", valor: " " } })).toEqual({ feitas: 0, total: 2 });
  });

  it("entrada do envio: texto livre continua texto; modelo vira template com a saudação da hora", () => {
    const quando = { agora: new Date("2026-11-20T12:00:00.000Z"), fuso: "America/Sao_Paulo" };
    expect(entradaDoEnvio(null, "Oi Ana", { nome: "Ana" }, quando, "Ana")).toEqual({ type: "text", body: "Oi Ana" });
    const e = entradaDoEnvio(MODELO, "Oi, Ana! {{saudacao}}", { nome: "Ana", modelo: { "1": "Ana", "2": "{{saudacao}}" } }, quando, "Ana");
    expect(e).toEqual({
      type: "template",
      body: "Oi, Ana! {{saudacao}}",
      template_name: "msg1_ancca",
      template_language: "pt_BR",
      template_values: { "1": "Ana", "2": "Bom dia" },
    });
  });
});

describe("público", () => {
  it("vazio, avulsos sem repetir, remover e trocar a seleção", () => {
    expect(publicoVazio(PUBLICO_VAZIO)).toBe(true);
    const a = comAvulsos(PUBLICO_VAZIO, [C1, C1, C2]);
    expect(a.avulsos).toEqual([C1, C2]);
    const r = semContato(a, C1);
    expect(r.avulsos).toEqual([C2]);
    expect(r.removidos).toEqual([C1]);
    expect(comAvulsos(r, [C1]).removidos).toEqual([]);
    const s = comSelecao(r, { tipo: "filtro", v: "todos", quantidade: null, excluidos: [] });
    expect(s.selecao?.tipo).toBe("filtro");
    expect(publicoVazio(s)).toBe(false);
  });
});
```

> A saudação esperada ("Bom dia") é a de `saudacaoDaHora` às 9h de São Paulo (`lib/campanhas/renderizador.ts`).

Run: `corepack pnpm vitest run tests/unit/escale-assistente-regras.test.ts`
Expected: FAIL (os módulos não existem).

- [ ] **Step 4: `lib/escale/campanhas/assistente.ts`**

```ts
import { z } from "zod";

import { FILTRO_VAZIO } from "@/lib/campanhas/audiencia";
import { ritmoSchema } from "@/lib/campanhas/schemas";
import { alvoSchema } from "@/lib/escale/massa/tipos";

/**
 * O ASSISTENTE DE CAMPANHA (fork Escale, Fase 8B; PRD B1–B17). Tudo o que os 4
 * passos juntam, validado por zod nas duas pontas, e a ida e a volta com as
 * colunas de `campaigns` (as do original e as `escale_*` da 9302).
 */
export const NOME_MIN = 3;
export const NOME_MAX = 80;
export const TEXTO_MAX = 4096;
export const TAGS_DO_POS_ENVIO_MAX = 20;
export const NUMEROS_EXTRAS_MAX = 10;

/** Os campos do CRM que uma variável aceita: os do renderizador da campanha. */
export const CAMPO_DA_VARIAVEL = /^(nome|primeiro_nome|saudacao|(contato|lead)\.[a-z][a-z0-9_]{0,39})$/;

export const variavelDoModeloSchema = z.discriminatedUnion("fonte", [
  z
    .object({
      fonte: z.literal("campo"),
      campo: z.string().regex(CAMPO_DA_VARIAVEL),
      alternativo: z.string().trim().max(200).nullable().default(null),
    })
    .strict(),
  z.object({ fonte: z.literal("fixo"), valor: z.string().trim().min(1).max(1000) }).strict(),
]);
export type VariavelDoModelo = z.infer<typeof variavelDoModeloSchema>;

/** A chave do slot é a do `slotKey` do original: "1" (corpo), "header:1", "button0:1". */
const CHAVE_DO_SLOT = /^[a-z0-9:_]{1,40}$/i;

export const mensagemSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("texto"), texto: z.string().trim().min(1).max(TEXTO_MAX) }).strict(),
  z
    .object({
      tipo: z.literal("modelo"),
      nome: z.string().min(1).max(512),
      idioma: z.string().min(2).max(16),
      categoria: z.string().max(40).nullable(),
      corpo: z.string().trim().min(1).max(TEXTO_MAX),
      variaveis: z.record(z.string().regex(CHAVE_DO_SLOT), variavelDoModeloSchema),
    })
    .strict(),
]);
export type MensagemDaCampanha = z.infer<typeof mensagemSchema>;
export type MensagemDeModelo = Extract<MensagemDaCampanha, { tipo: "modelo" }>;

export const quandoSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("agora") }).strict(),
  z.object({ modo: z.literal("agendar"), em: z.string().datetime() }).strict(),
]);
export type QuandoEnviar = z.infer<typeof quandoSchema>;

/**
 * O PÚBLICO (N7): a seleção do modal (ids ou O FILTRO de Contatos, como a B3 da
 * 2B), os avulsos (criados na hora e os do .csv) e os removidos. Sem teto.
 */
export const publicoSchema = z
  .object({
    selecao: alvoSchema.nullable().default(null),
    avulsos: z.array(z.string().uuid()).max(200_000).default([]),
    removidos: z.array(z.string().uuid()).max(20_000).default([]),
  })
  .strict();
export type PublicoDaCampanha = z.infer<typeof publicoSchema>;
export type SelecaoDoPublico = NonNullable<PublicoDaCampanha["selecao"]>;
export const PUBLICO_VAZIO: PublicoDaCampanha = { selecao: null, avulsos: [], removidos: [] };

export const STATUS_DO_POS_ENVIO = ["aberta", "fechada", "em_espera"] as const;
export type StatusDoPosEnvio = (typeof STATUS_DO_POS_ENVIO)[number];
export const ROTULO_DO_STATUS_DO_POS_ENVIO: Record<StatusDoPosEnvio, string> = {
  aberta: "Em aberto",
  fechada: "Fechado",
  em_espera: "Em espera",
};

/** O passo 3 (N11, N13): aplicado só a quem recebeu, depois da conclusão. */
export const posEnvioSchema = z
  .object({
    tags: z.array(z.string().trim().min(1).max(40)).max(TAGS_DO_POS_ENVIO_MAX).default([]),
    origemId: z.string().uuid().nullable().default(null),
    etapaId: z.string().uuid().nullable().default(null),
    statusDaConversa: z.enum(STATUS_DO_POS_ENVIO).default("aberta"),
    manterStatus: z.boolean().default(false),
    atendenteId: z.string().uuid().nullable().default(null),
    manterAtendente: z.boolean().default(false),
    donoDoNegocio: z.boolean().default(false),
  })
  .strict()
  .refine((p) => (p.origemId === null) === (p.etapaId === null), {
    message: "Escolha a origem e a etapa.",
    path: ["etapaId"],
  })
  .refine((p) => !p.donoDoNegocio || p.origemId !== null, {
    message: "A distribuição de dono só vale com uma origem.",
    path: ["donoDoNegocio"],
  });
export type PosEnvio = z.infer<typeof posEnvioSchema>;
export const POS_ENVIO_PADRAO: PosEnvio = {
  tags: [],
  origemId: null,
  etapaId: null,
  statusDaConversa: "aberta",
  manterStatus: false,
  atendenteId: null,
  manterAtendente: false,
  donoDoNegocio: false,
};

export const assistenteSchema = z
  .object({
    nome: z.string().trim().min(NOME_MIN).max(NOME_MAX),
    numeroId: z.string().uuid(),
    mensagem: mensagemSchema,
    quando: quandoSchema,
    baseLegal: z.enum(["consent", "legitimate_interest"]),
    lia: z.string().trim().max(120).nullable().default(null),
    publico: publicoSchema,
    posEnvio: posEnvioSchema,
    agenteId: z.string().uuid().nullable().default(null),
    ritmo: ritmoSchema,
    numerosExtras: z.array(z.string().uuid()).max(NUMEROS_EXTRAS_MAX).default([]),
  })
  .strict()
  .refine((a) => a.baseLegal !== "legitimate_interest" || (a.lia ?? "").trim() !== "", {
    message: "Interesse legítimo exige a referência da avaliação (LIA).",
    path: ["lia"],
  })
  .refine(
    (a) =>
      a.ritmo.janela_inicio_hora == null ||
      a.ritmo.janela_fim_hora == null ||
      a.ritmo.janela_fim_hora > a.ritmo.janela_inicio_hora,
    { message: "A janela precisa terminar depois de começar.", path: ["ritmo", "janela_fim_hora"] },
  )
  .refine((a) => !a.numerosExtras.includes(a.numeroId), {
    message: "O número principal não entra como extra.",
    path: ["numerosExtras"],
  });
export type Assistente = z.infer<typeof assistenteSchema>;

/** O assistente vira as colunas da campanha (o original e as `escale_*`). */
export function colunasDoAssistente(a: Assistente): Record<string, unknown> {
  return {
    name: a.nome,
    channel_session_id: a.numeroId,
    message_body: a.mensagem.tipo === "texto" ? a.mensagem.texto : a.mensagem.corpo,
    base_legal: a.baseLegal,
    lia_ref: a.baseLegal === "legitimate_interest" ? a.lia : null,
    // O público da casca mora em `escale_publico`; o filtro antigo fica vazio.
    audience_filter: FILTRO_VAZIO,
    // N12: com origem, quem responde antes da conclusão já nasce nela.
    pipeline_id: a.posEnvio.origemId,
    stage_id: a.posEnvio.etapaId,
    agent_id: a.agenteId,
    intervalo_segundos: a.ritmo.intervalo_segundos ?? null,
    janela_inicio_hora: a.ritmo.janela_inicio_hora ?? null,
    janela_fim_hora: a.ritmo.janela_fim_hora ?? null,
    teto_diario: a.ritmo.teto_diario ?? null,
    teto_horario: a.ritmo.teto_horario ?? null,
    escale_mensagem: a.mensagem,
    escale_publico: a.publico,
    escale_pos_envio: a.posEnvio,
    escale_quando: a.quando.modo === "agendar" ? a.quando.em : null,
  };
}

export const COLUNAS_DO_ASSISTENTE =
  "id, status, name, channel_session_id, message_body, base_legal, lia_ref, agent_id, " +
  "intervalo_segundos, janela_inicio_hora, janela_fim_hora, teto_diario, teto_horario, " +
  "escale_mensagem, escale_publico, escale_pos_envio, escale_quando";

export interface LinhaDoAssistente {
  id: string;
  status: string;
  name: string;
  channel_session_id: string;
  message_body: string | null;
  base_legal: string;
  lia_ref: string | null;
  agent_id: string | null;
  intervalo_segundos: number | null;
  janela_inicio_hora: number | null;
  janela_fim_hora: number | null;
  teto_diario: number | null;
  teto_horario: number | null;
  escale_mensagem: unknown;
  escale_publico: unknown;
  escale_pos_envio: unknown;
  escale_quando: string | null;
}

/**
 * A campanha volta para o assistente (N18). O rascunho do formulário antigo
 * traz nome, número, texto, base legal e ritmo; o público por filtro antigo não
 * tem tela na casca e começa vazio (`publicoAntigo` liga o aviso).
 */
export function assistenteDaLinha(l: LinhaDoAssistente, extras: string[]): { assistente: Assistente; publicoAntigo: boolean } {
  const mensagem = mensagemSchema.safeParse(l.escale_mensagem);
  const publico = publicoSchema.safeParse(l.escale_publico);
  const posEnvio = posEnvioSchema.safeParse(l.escale_pos_envio);
  return {
    assistente: {
      nome: l.name.slice(0, NOME_MAX),
      numeroId: l.channel_session_id,
      mensagem: mensagem.success ? mensagem.data : { tipo: "texto", texto: l.message_body ?? "" },
      quando: l.escale_quando ? { modo: "agendar", em: new Date(l.escale_quando).toISOString() } : { modo: "agora" },
      baseLegal: l.base_legal === "legitimate_interest" ? "legitimate_interest" : "consent",
      lia: l.lia_ref,
      publico: publico.success ? publico.data : PUBLICO_VAZIO,
      posEnvio: posEnvio.success ? posEnvio.data : POS_ENVIO_PADRAO,
      agenteId: l.agent_id,
      ritmo: {
        intervalo_segundos: l.intervalo_segundos,
        janela_inicio_hora: l.janela_inicio_hora,
        janela_fim_hora: l.janela_fim_hora,
        teto_diario: l.teto_diario,
        teto_horario: l.teto_horario,
      },
      numerosExtras: extras.filter((id) => id !== l.channel_session_id),
    },
    publicoAntigo: !publico.success,
  };
}
```

- [ ] **Step 5: `lib/escale/campanhas/modelo.ts`**

```ts
import { renderizar, type ValoresDoDestinatario } from "@/lib/campanhas/renderizador";

import { mensagemSchema, type MensagemDeModelo, type VariavelDoModelo } from "./assistente";

/**
 * AS VARIÁVEIS DO MODELO DA META (fork Escale, Fase 8B; PRD B6; N5, N6). Cada
 * slot vira um token do renderizador da campanha (`{{primeiro_nome}}`,
 * `{{lead.gancho}}`), e a MESMA régua decide o valor e a falta. A saudação fica
 * literal no snapshot e é resolvida no envio, como no texto livre.
 */
export const CAMPOS_BASICOS = [
  { campo: "nome", rotulo: "Nome" },
  { campo: "primeiro_nome", rotulo: "Primeiro nome" },
  { campo: "saudacao", rotulo: "Saudação" },
] as const;

const POSICIONAL = /\{\{\s*(\d{1,2})\s*\}\}/g;

export const tokenDoCampo = (campo: string): string => `{{${campo}}}`;

/** As variáveis numeradas do corpo, na ordem em que aparecem, sem repetir. */
export function variaveisDoCorpo(corpo: string): string[] {
  const vistas = new Set<string>();
  for (const m of corpo.matchAll(POSICIONAL)) vistas.add(m[1]!);
  return [...vistas];
}

/** Os tokens que o modelo usa: decide se a preparação busca os campos personalizados. */
export function tokensDoModelo(m: MensagemDeModelo): string {
  return Object.values(m.variaveis)
    .map((v) => (v.fonte === "campo" ? tokenDoCampo(v.campo) : ""))
    .join(" ");
}

export function valoresDoModelo(
  m: MensagemDeModelo,
  valores: ValoresDoDestinatario,
  quando?: { agora: Date; fuso: string },
): { valores: Record<string, string>; faltando: string[] } {
  const saida: Record<string, string> = {};
  const faltando: string[] = [];
  for (const [chave, v] of Object.entries(m.variaveis)) {
    if (v.fonte === "fixo") {
      saida[chave] = v.valor;
      continue;
    }
    const r = renderizar(tokenDoCampo(v.campo), valores, quando);
    if (r.faltando.length === 0) {
      saida[chave] = r.texto;
      continue;
    }
    const alternativo = (v.alternativo ?? "").trim();
    if (alternativo !== "") saida[chave] = alternativo;
    else faltando.push(chave);
  }
  return { valores: saida, faltando };
}

/** O corpo legível com os valores no lugar de `{{n}}` (o que fica no snapshot e na conversa). */
export function corpoComValores(corpo: string, valores: Readonly<Record<string, string>>): string {
  return corpo.replace(POSICIONAL, (literal, n: string) => valores[n] ?? literal);
}

/** O trecho em volta da variável, como a Clint mostra: "…Oi, {{1}}! Tudo bem?…". */
export function trechoDaVariavel(corpo: string, chave: string, raio = 12): string {
  const achado = new RegExp(`\\{\\{\\s*${chave.replace(/[^0-9]/g, "")}\\s*\\}\\}`).exec(corpo);
  if (!achado || !/^\d+$/.test(chave)) return `{{${chave}}}`;
  const inicio = achado.index;
  const fim = inicio + achado[0].length;
  const de = Math.max(0, inicio - raio);
  const ate = Math.min(corpo.length, fim + raio);
  const texto = `${corpo.slice(de, inicio)}{{${chave}}}${corpo.slice(fim, ate)}`.replace(/\s+/g, " ").trim();
  return `${de > 0 ? "…" : ""}${texto}${ate < corpo.length ? "…" : ""}`;
}

export function variavelResolvida(v: VariavelDoModelo | undefined): boolean {
  if (!v) return false;
  return v.fonte === "fixo" ? v.valor.trim() !== "" : true;
}

export function contagemResolvida(
  chaves: readonly string[],
  variaveis: Readonly<Record<string, VariavelDoModelo>>,
): { feitas: number; total: number } {
  return { feitas: chaves.filter((c) => variavelResolvida(variaveis[c])).length, total: chaves.length };
}

export type EntradaDoEnvio =
  | { type: "text"; body: string }
  | {
      type: "template";
      body: string;
      template_name: string;
      template_language: string;
      template_values: Record<string, string>;
    };

function valoresCongelados(variables: unknown): Record<string, string> {
  const modelo = (variables as { modelo?: unknown } | null | undefined)?.modelo;
  if (!modelo || typeof modelo !== "object" || Array.isArray(modelo)) return {};
  return Object.fromEntries(
    Object.entries(modelo as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
}

/**
 * O que a rodada (e o teste) entrega ao `sendMessageHandler`. Campanha sem
 * modelo (texto livre, ou do formulário antigo) segue `type: "text"`, igual a
 * hoje. Com modelo, os valores congelados na preparação passam pelo
 * renderizador na hora do envio (a saudação é da hora em que sai).
 */
export function entradaDoEnvio(
  mensagem: unknown,
  corpo: string,
  variables: unknown,
  quando: { agora: Date; fuso: string },
  nome: string | null,
): EntradaDoEnvio {
  const m = mensagemSchema.safeParse(mensagem);
  if (!m.success || m.data.tipo !== "modelo") return { type: "text", body: corpo };
  const valores = Object.fromEntries(
    Object.entries(valoresCongelados(variables)).map(([k, v]) => [k, renderizar(v, { nome }, quando).texto]),
  );
  return {
    type: "template",
    body: corpo,
    template_name: m.data.nome,
    template_language: m.data.idioma,
    template_values: valores,
  };
}
```

- [ ] **Step 6: `lib/escale/campanhas/publico.ts`**

```ts
import type { PublicoDaCampanha, SelecaoDoPublico } from "./assistente";

/** O PÚBLICO NA TELA (fork Escale, Fase 8B; N7). Funções puras: o redutor do assistente usa. */
export const publicoVazio = (p: PublicoDaCampanha): boolean => p.selecao === null && p.avulsos.length === 0;

/** Contatos criados na hora ou vindos do .csv: entram sem repetir e deixam de estar removidos. */
export function comAvulsos(p: PublicoDaCampanha, ids: readonly string[]): PublicoDaCampanha {
  const ja = new Set(p.avulsos);
  const novos: string[] = [];
  for (const id of ids) {
    if (ja.has(id)) continue;
    ja.add(id);
    novos.push(id);
  }
  const entram = new Set(ids);
  return { ...p, avulsos: [...p.avulsos, ...novos], removidos: p.removidos.filter((id) => !entram.has(id)) };
}

/** "Remover da lista": sai dos avulsos e entra nos removidos (vale também para quem veio pelo filtro). */
export function semContato(p: PublicoDaCampanha, id: string): PublicoDaCampanha {
  return {
    ...p,
    avulsos: p.avulsos.filter((x) => x !== id),
    removidos: p.removidos.includes(id) ? p.removidos : [...p.removidos, id],
  };
}

/** "Selecionar contatos"/"editar seleção" troca a seleção; avulsos e removidos ficam. */
export const comSelecao = (p: PublicoDaCampanha, s: SelecaoDoPublico | null): PublicoDaCampanha => ({ ...p, selecao: s });
```

- [ ] **Step 7: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-regras.test.ts && corepack pnpm prettier --write lib/escale/campanhas/assistente.ts lib/escale/campanhas/modelo.ts lib/escale/campanhas/publico.ts tests/unit/escale-assistente-regras.test.ts && corepack pnpm eslint lib/escale/campanhas lib/escale/massa/tipos.ts && corepack pnpm typecheck`
Expected: PASS. Se o typecheck reclamar que `{ tipo: "filtro", v: "todos", quantidade: null, excluidos: [] }` não é `SelecaoDoPublico`, é o `.strict()` do `alvoSchema` cobrando `q`/`f` opcionais: o objeto literal do teste já está certo; confira se o `alvoSchema` exportado é o da 2B (Step 2).

- [ ] **Step 8: Commit**

```bash
git add lib/escale/campanhas/assistente.ts lib/escale/campanhas/modelo.ts lib/escale/campanhas/publico.ts lib/escale/massa/tipos.ts tests/unit/escale-assistente-regras.test.ts docs/superpowers/plans/2026-10-19-fase-8b-assistente-de-campanha.md
git commit -m "feat(escale): regras do assistente de campanha — mensagem, modelo, público e pós-envio (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 2: Migration 9302 (colunas e as funções do público)

**Files:**
- Create: `supabase/migrations/20261111120000_9302_assistente_de_campanha.sql`, `tests/unit/escale-assistente-migration.test.ts`, `tests/invariants/escale-assistente-9302.test.ts`
- Modify: `supabase/baseline.sql` (o bloco logo ANTES de `-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----`, depois do bloco da 9301)

**Interfaces (Produces):**
- Colunas: `campaigns.escale_mensagem jsonb`, `escale_publico jsonb`, `escale_pos_envio jsonb`, `escale_quando timestamptz`, `escale_pos_envio_feito_em timestamptz`; `campaign_recipients.escale_pos_envio_em timestamptz`, `escale_numero_oficial boolean`, `escale_categoria_do_modelo text`.
- `fn_escale_contatos_do_publico(p_org uuid, p_publico jsonb) returns table (contact_id uuid, posicao bigint)` — `p_publico` é o **compilado** da Task 3: `{ selecao: null | { tipo: "ids", ids } | { tipo: "filtro", visao, padrao, digitos, cpf_hash, filtros, quantidade, excluidos }, avulsos, removidos }`.
- `fn_escale_pagina_do_publico(p_org uuid, p_publico jsonb, p_limite integer, p_deslocamento integer) returns table (contact_id uuid, posicao bigint, total bigint)` — `p_limite` de 1 a 1.000.
- `fn_escale_fora_da_lista(p_org uuid, p_campanha uuid) returns table (motivo text, quantidade integer)`.

- [ ] **Step 1: O teste do texto da migration (falha)**

`tests/unit/escale-assistente-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261111120000_9302_assistente_de_campanha.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";
const CABECALHO = "-- ---- FORK ESCALE · assistente de campanha da casca (migration 9302) ----";

const INVOKER = [
  "fn_escale_contatos_do_publico(uuid, jsonb)",
  "fn_escale_pagina_do_publico(uuid, jsonb, integer, integer)",
  "fn_escale_fora_da_lista(uuid, uuid)",
];

describe("migration 9302 (assistente de campanha da casca)", () => {
  it("existe, começa pela linha do manifesto e a 2ª linha é o cabeçalho do bloco", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    expect(MIGRATION.split("\n")[1]).toBe(CABECALHO);
  });

  it("as colunas novas, todas idempotentes", () => {
    for (const c of ["escale_mensagem jsonb", "escale_publico jsonb", "escale_pos_envio jsonb", "escale_quando timestamptz", "escale_pos_envio_feito_em timestamptz"]) {
      expect(MIGRATION).toContain(`alter table public.campaigns add column if not exists ${c};`);
    }
    for (const c of ["escale_pos_envio_em timestamptz", "escale_numero_oficial boolean", "escale_categoria_do_modelo text"]) {
      expect(MIGRATION).toContain(`alter table public.campaign_recipients add column if not exists ${c};`);
    }
  });

  it("as três são invoker, fechadas ao anon e abertas ao authenticated; nenhuma definer", () => {
    expect(MIGRATION).not.toMatch(/security definer/);
    for (const f of INVOKER) {
      const nome = f.split("(")[0];
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`));
      expect(MIGRATION).toContain(`revoke all on function public.${f} from public, anon;`);
      expect(MIGRATION).toContain(`grant execute on function public.${f} to authenticated, service_role;`);
    }
  });

  it("o público reaproveita o filtro da 2B e só responde a gerente (ou ao service role)", () => {
    expect(MIGRATION).toContain("public.fn_escale_contatos_do_filtro(");
    expect(MIGRATION.match(/fn_role_at_least\(p_org, 'manager'\)/g)?.length).toBe(2);
    expect(MIGRATION.match(/coalesce\(auth\.role\(\), ''\) = 'service_role'/g)?.length).toBe(2);
  });

  it("o baseline traz o bloco (sem a linha do manifesto) depois das importações e ANTES da varredura de anon", () => {
    const corpo = MIGRATION.split("\n").slice(1).join("\n").trimEnd();
    expect(BASELINE).toContain(corpo);
    const iBloco = BASELINE.indexOf(CABECALHO);
    const iImportacoes = BASELINE.indexOf("-- ---- FORK ESCALE · importar contatos e negócios (migration 9107) ----");
    const iVarredura = BASELINE.indexOf(
      "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----",
    );
    expect(iImportacoes).toBeGreaterThan(-1);
    expect(iBloco).toBeGreaterThan(iImportacoes);
    expect(iVarredura).toBeGreaterThan(iBloco);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-assistente-migration.test.ts`
Expected: FAIL (o arquivo não existe).

- [ ] **Step 2: A migration**

`supabase/migrations/20261111120000_9302_assistente_de_campanha.sql` (a 1ª linha é uma linha só, sem quebra):

```sql
-- manifest: **Assistente de campanha da casca (fork Escale, Fase 8B).** `campaigns` ganha `escale_mensagem` (texto livre ou modelo aprovado da Meta com o mapa de variáveis), `escale_publico` (a seleção de contatos — ids ou o filtro de Contatos —, os contatos avulsos e os removidos), `escale_pos_envio` (tags, origem e etapa, status da conversa e atendente, aplicados a quem recebeu depois da conclusão), `escale_quando` (o agendamento pedido) e `escale_pos_envio_feito_em`; `campaign_recipients` ganha `escale_pos_envio_em` (o pós-envio feito uma vez por destinatário), `escale_numero_oficial` e `escale_categoria_do_modelo` (o custo preparado). Três funções invoker, fechadas ao `anon`: `fn_escale_contatos_do_publico` (o público em ordem, resolvendo o filtro pela `fn_escale_contatos_do_filtro` da 2B), `fn_escale_pagina_do_publico` (a página e o total) e `fn_escale_fora_da_lista` (quantos ficaram fora da lista, por motivo). Respondem a gerente ou acima da organização, ou ao service role.
-- ---- FORK ESCALE · assistente de campanha da casca (migration 9302) ----
-- 9302: assistente de campanha da casca (fork Escale, Frente B).

-- ── 1. As colunas ────────────────────────────────────────────────────────────
-- Nulas = campanha do formulário do original: o motor segue como sempre.
alter table public.campaigns add column if not exists escale_mensagem jsonb;
alter table public.campaigns add column if not exists escale_publico jsonb;
alter table public.campaigns add column if not exists escale_pos_envio jsonb;
alter table public.campaigns add column if not exists escale_quando timestamptz;
alter table public.campaigns add column if not exists escale_pos_envio_feito_em timestamptz;

alter table public.campaigns drop constraint if exists campaigns_escale_jsonb_objetos;
alter table public.campaigns add constraint campaigns_escale_jsonb_objetos check (
  (escale_mensagem is null or jsonb_typeof(escale_mensagem) = 'object')
  and (escale_publico is null or jsonb_typeof(escale_publico) = 'object')
  and (escale_pos_envio is null or jsonb_typeof(escale_pos_envio) = 'object')
);

alter table public.campaign_recipients add column if not exists escale_pos_envio_em timestamptz;
alter table public.campaign_recipients add column if not exists escale_numero_oficial boolean;
alter table public.campaign_recipients add column if not exists escale_categoria_do_modelo text;

-- O pós-envio lê "quem recebeu e ainda não foi tratado", em lotes.
create index if not exists campaign_recipients_escale_pos_envio_pendente
  on public.campaign_recipients (campaign_id, created_at)
  where sent_at is not null and escale_pos_envio_em is null;

-- ── 2. O público, em ordem ───────────────────────────────────────────────────
-- Seleção primeiro (ids na ordem marcada, ou o filtro na ordem da lista de
-- Contatos), depois os avulsos; sem repetir; menos os removidos; só contato
-- pessoa e não mesclado desta organização. O filtro só é calculado quando a
-- seleção é um filtro (o `lateral` sobre uma linha que pode não existir).
create or replace function public.fn_escale_contatos_do_publico(p_org uuid, p_publico jsonb)
returns table (contact_id uuid, posicao bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with sel as (
    select p_publico -> 'selecao' as s
  ),
  removidos as (
    select array(
      select x::uuid from jsonb_array_elements_text(coalesce(p_publico -> 'removidos', '[]'::jsonb)) as x
    ) as ids
  ),
  do_filtro as (
    select c.contact_id,
           row_number() over (order by c.last_activity_at desc nulls last, c.contact_id desc) as ordem
      from (select s from sel where s ->> 'tipo' = 'filtro') g
      cross join lateral public.fn_escale_contatos_do_filtro(
        p_org,
        coalesce(g.s ->> 'visao', 'todos'),
        g.s ->> 'padrao',
        case when jsonb_typeof(g.s -> 'digitos') = 'array'
             then array(select d from jsonb_array_elements_text(g.s -> 'digitos') as d) end,
        g.s ->> 'cpf_hash',
        coalesce(g.s -> 'filtros', '{}'::jsonb)
      ) c
  ),
  escolhidos as (
    select e.valor::uuid as contact_id, 1 as bloco, e.ordem
      from sel,
           jsonb_array_elements_text(case when sel.s ->> 'tipo' = 'ids' then sel.s -> 'ids' else '[]'::jsonb end)
             with ordinality as e(valor, ordem)
    union all
    select f.contact_id, 1, f.ordem
      from do_filtro f, sel
     where (sel.s ->> 'quantidade' is null or f.ordem <= (sel.s ->> 'quantidade')::bigint)
       and not (f.contact_id = any (array(
             select x::uuid from jsonb_array_elements_text(coalesce(sel.s -> 'excluidos', '[]'::jsonb)) as x)))
    union all
    select e.valor::uuid, 2, e.ordem
      from jsonb_array_elements_text(coalesce(p_publico -> 'avulsos', '[]'::jsonb)) with ordinality as e(valor, ordem)
  ),
  validos as (
    select distinct on (x.contact_id) x.contact_id, x.bloco, x.ordem
      from escolhidos x
      join public.contacts ct
        on ct.id = x.contact_id
       and ct.organization_id = p_org
       and ct.kind = 'person'
       and ct.is_merged_into is null
     where not (x.contact_id = any ((select r.ids from removidos r)))
     order by x.contact_id, x.bloco, x.ordem
  )
  select v.contact_id, row_number() over (order by v.bloco, v.ordem, v.contact_id) as posicao
    from validos v
   where coalesce(auth.role(), '') = 'service_role' or public.fn_role_at_least(p_org, 'manager');
$$;

revoke all on function public.fn_escale_contatos_do_publico(uuid, jsonb) from public, anon;
grant execute on function public.fn_escale_contatos_do_publico(uuid, jsonb) to authenticated, service_role;

-- ── 3. A página do público (passo 2) e a leitura em lotes (preparação) ──────
create or replace function public.fn_escale_pagina_do_publico(
  p_org uuid,
  p_publico jsonb,
  p_limite integer,
  p_deslocamento integer
)
returns table (contact_id uuid, posicao bigint, total bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select p.contact_id, p.posicao, count(*) over () as total
    from public.fn_escale_contatos_do_publico(p_org, p_publico) p
   order by p.posicao
   limit least(greatest(coalesce(p_limite, 10), 1), 1000)
  offset greatest(coalesce(p_deslocamento, 0), 0);
$$;

revoke all on function public.fn_escale_pagina_do_publico(uuid, jsonb, integer, integer) from public, anon;
grant execute on function public.fn_escale_pagina_do_publico(uuid, jsonb, integer, integer) to authenticated, service_role;

-- ── 4. Quem ficou fora da lista, por motivo (passo 4) ───────────────────────
create or replace function public.fn_escale_fora_da_lista(p_org uuid, p_campanha uuid)
returns table (motivo text, quantidade integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(r.exclusion_reason, 'sem_motivo') as motivo, count(*)::integer as quantidade
    from public.campaign_recipients r
   where r.organization_id = p_org
     and r.campaign_id = p_campanha
     and r.eligibility_status = 'excluded'
     and (coalesce(auth.role(), '') = 'service_role' or public.fn_role_at_least(p_org, 'manager'))
   group by 1
   order by 2 desc, 1;
$$;

revoke all on function public.fn_escale_fora_da_lista(uuid, uuid) from public, anon;
grant execute on function public.fn_escale_fora_da_lista(uuid, uuid) to authenticated, service_role;
```

- [ ] **Step 3: O bloco no baseline**

Cole o conteúdo da migration **sem a 1ª linha** (`-- manifest: …`) em `supabase/baseline.sql`, logo ANTES da linha `-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----` (o bloco da 9301 já está ali; o da 9302 vem depois dele), com uma linha em branco antes e depois. Confira a ordem: `grep -n "migration 9107) ----\|migration 9301) ----\|migration 9302) ----\|VARREDURA anon: função nova" supabase/baseline.sql` — 9107 < 9301 < 9302 < VARREDURA.

- [ ] **Step 4: A prova contra Postgres (roda na bateria)**

`tests/invariants/escale-assistente-9302.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, GOV_SESSION, countAs, seedGov, sql } from "./gov-helpers";

/**
 * ASSISTENTE DE CAMPANHA (fork Escale, migration 9302) — o público resolvido no
 * banco: ids, filtro da 2B com os N primeiros e os desmarcados, avulsos, sem
 * repetir, menos os removidos, só da organização; a página com o total; os
 * motivos de quem ficou fora; atendente não vê nada. Roda via `pnpm test:db`.
 */
const C1 = "e5ca1e00-9302-4000-8000-0000000000c1";
const C2 = "e5ca1e00-9302-4000-8000-0000000000c2";
const C3 = "e5ca1e00-9302-4000-8000-0000000000c3";
const FORA = "e5ca1e00-9302-4000-8000-0000000000f1";
const CAMPANHA = "e5ca1e00-9302-4000-8000-0000000000a1";

const publico = (json: object) => `'${JSON.stringify(json)}'::jsonb`;
const contar = (p: object) => `select count(*) from public.fn_escale_contatos_do_publico('${GOV_ORG}', ${publico(p)})`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.campaigns where id = '${CAMPANHA}';
    delete from public.contacts where id::text like 'e5ca1e00-9302-%';
    insert into public.contacts (id, organization_id, display_name, last_activity_at) values
      ('${C1}', '${GOV_ORG}', 'Publicotres Um', now()),
      ('${C2}', '${GOV_ORG}', 'Publicotres Dois', now() - interval '1 day'),
      ('${C3}', '${GOV_ORG}', 'Publicotres Tres', now() - interval '2 days');
  `);
});

describe("fn_escale_contatos_do_publico", () => {
  it("ids marcados, sem os de fora da organização", () => {
    expect(countAs(GOV_MANAGER, contar({ selecao: { tipo: "ids", ids: [C1, FORA] }, avulsos: [], removidos: [] }))).toBe(1);
  });

  it("o filtro da 2B: os N primeiros menos os desmarcados", () => {
    const filtro = { tipo: "filtro", visao: "todos", padrao: "publicotres", digitos: null, cpf_hash: null, filtros: { fuso: "UTC" } };
    expect(countAs(GOV_MANAGER, contar({ selecao: { ...filtro, quantidade: null, excluidos: [] }, avulsos: [], removidos: [] }))).toBe(3);
    expect(
      countAs(GOV_MANAGER, contar({ selecao: { ...filtro, quantidade: 2, excluidos: [C1] }, avulsos: [], removidos: [] })),
    ).toBe(1);
  });

  it("avulsos sem repetir e removidos de fora", () => {
    expect(
      countAs(GOV_MANAGER, contar({ selecao: { tipo: "ids", ids: [C1] }, avulsos: [C1, C2, C3], removidos: [C3] })),
    ).toBe(2);
  });

  it("a página traz o total e respeita a ordem (seleção antes dos avulsos)", () => {
    const p = publico({ selecao: { tipo: "ids", ids: [C2] }, avulsos: [C1], removidos: [] });
    expect(
      sql(`select contact_id || ':' || total from public.fn_escale_pagina_do_publico('${GOV_ORG}', ${p}, 1, 0);`).trim(),
    ).toBe(`${C2}:2`);
  });

  it("atendente não vê o público", () => {
    expect(countAs(GOV_AGENT_A, contar({ selecao: { tipo: "ids", ids: [C1, C2] }, avulsos: [], removidos: [] }))).toBe(0);
  });
});

describe("fn_escale_fora_da_lista", () => {
  it("conta os excluídos por motivo", () => {
    sql(`
      insert into public.campaigns (id, organization_id, name, channel_session_id, base_legal, audience_filter)
        values ('${CAMPANHA}', '${GOV_ORG}', 'Prova 9302', '${GOV_SESSION}', 'consent', '{}'::jsonb);
      insert into public.campaign_recipients (organization_id, campaign_id, contact_id, status, eligibility_status, exclusion_reason) values
        ('${GOV_ORG}', '${CAMPANHA}', '${C1}', 'skipped', 'excluded', 'sem_telefone'),
        ('${GOV_ORG}', '${CAMPANHA}', '${C2}', 'skipped', 'excluded', 'sem_telefone'),
        ('${GOV_ORG}', '${CAMPANHA}', '${C3}', 'skipped', 'excluded', 'duplicado');
    `);
    expect(
      sql(`select string_agg(motivo || '=' || quantidade, ',') from public.fn_escale_fora_da_lista('${GOV_ORG}', '${CAMPANHA}');`).trim(),
    ).toBe("sem_telefone=2,duplicado=1");
  });

  it("as três são invoker", () => {
    expect(
      sql(
        `select count(*) from pg_proc where proname in ('fn_escale_contatos_do_publico','fn_escale_pagina_do_publico','fn_escale_fora_da_lista') and prosecdef;`,
      ).trim(),
    ).toBe("0");
  });
});
```

> `seedGov()` cria o número `GOV_SESSION` da `GOV_ORG`. Esta prova só roda na bateria.

- [ ] **Step 5: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-migration.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/manifest-cita-caminho-que-existe.test.ts && corepack pnpm prettier --write tests/unit/escale-assistente-migration.test.ts tests/invariants/escale-assistente-9302.test.ts && corepack pnpm eslint tests/unit/escale-assistente-migration.test.ts tests/invariants/escale-assistente-9302.test.ts`
Expected: PASS. Os nomes exatos das cercas de manifesto: `ls tests/unit | grep manifest`. Se alguma cerca de varredura (`ls tests/unit | grep -E "varredura|definer|hardening"`) acusar as funções novas, a mensagem diz o que falta (em geral o `revoke … from public, anon`, que já está no bloco): rode `corepack pnpm vitest run $(ls tests/unit/*varredura* tests/unit/*definer* tests/unit/*hardening* 2>/dev/null)`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261111120000_9302_assistente_de_campanha.sql supabase/baseline.sql tests/unit/escale-assistente-migration.test.ts tests/invariants/escale-assistente-9302.test.ts
git commit -m "feat(escale): migration 9302 — colunas do assistente e o público resolvido no banco (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---


### Task 3: O público no servidor (página, ids e os contatos de uma importação)

**Files:**
- Create: `tests/helpers/banco-de-mentira.ts`, `lib/escale/campanhas/publico-banco.ts`, `app/api/v1/campanhas-da-casca/publico/route.ts`, `app/api/v1/importacoes/[id]/contatos/route.ts`, `tests/unit/escale-assistente-publico.test.ts`

**Interfaces:**
- Consumes: `PublicoDaCampanha`, `publicoSchema` (Task 1); `fn_escale_pagina_do_publico` (Task 2); `filtrosDaConsulta`, `parametrosDaBusca`, `fusoDaOrganizacao` (`lib/escale/contatos/lista.ts`); `compilarFiltros` (`lib/escale/contatos/compilar-filtros.ts`); `temFiltros` (`lib/escale/contatos/filtros.ts`); `POR_PAGINA` (`lib/escale/contatos/regras.ts`); `nomeDoContato` (`lib/contacts/rotulo-do-contato.ts`).
- Produces: `PublicoCompilado`, `PublicoInvalido` (classe de erro), `compilarPublico(p, fuso): PublicoCompilado`, `idsDoPublico(db, org, compilado): Promise<string[]>`, `LinhaDoDestinatario { id; nome: string | null; telefone: string | null; email: string | null; tags: string[] }`, `paginaDoPublico(db, org, compilado, pagina, porPagina): Promise<{ linhas: LinhaDoDestinatario[]; total: number }>`; `POST /api/v1/campanhas-da-casca/publico` (`{ publico, pagina?, porPagina? }`) → `{ data: { linhas, total } }`; `GET /api/v1/importacoes/[id]/contatos` → `{ data: { ids: string[] } }`; `bancoDeMentira(config)` para os testes das Tasks 3–7.

- [ ] **Step 1: O banco de mentira dos testes**

`tests/helpers/banco-de-mentira.ts`:

```ts
/**
 * Um Supabase de mentira para os testes da 8B: cada `from(tabela)` vira uma
 * consulta encadeável que anota a operação, os filtros e os dados, e devolve as
 * linhas configuradas para a tabela; `rpc(nome)` devolve o configurado. Difere
 * do `bancoPorTabela` da Fase 3 (`tests/helpers/supabase-por-tabela.ts`) num
 * ponto que os testes da 8B precisam: a resposta pode depender da operação e
 * dos filtros (o insert devolve o id, o update devolve os marcados).
 */
export type Filtro = [string, string, unknown];
export interface Chamada {
  tabela: string;
  op: "select" | "insert" | "update" | "delete";
  dados?: unknown;
  filtros: Filtro[];
}
type Linhas = unknown[] | ((c: Chamada) => unknown[]);
type Resposta = { data: unknown; error: { message: string; code?: string } | null };

export function bancoDeMentira(config: {
  tabelas?: Record<string, Linhas>;
  rpc?: Record<string, (args: Record<string, unknown>) => Resposta>;
  erroNaTabela?: Record<string, string>;
} = {}) {
  const chamadas: Chamada[] = [];
  const rpcs: Array<{ nome: string; args: Record<string, unknown> }> = [];

  function from(tabela: string) {
    const c: Chamada = { tabela, op: "select", filtros: [] };
    const linhas = (): unknown[] => {
      const t = config.tabelas?.[tabela];
      return typeof t === "function" ? t(c) : (t ?? []);
    };
    const resposta = () => {
      if (!chamadas.includes(c)) chamadas.push(c);
      const erro = config.erroNaTabela?.[tabela];
      if (erro) return { data: null, error: { message: erro }, count: null };
      const l = linhas();
      return { data: l, error: null, count: l.length };
    };
    const q: Record<string, unknown> = {};
    const filtro = (nome: string) => (coluna: string, valor?: unknown) => {
      c.filtros.push([nome, coluna, valor]);
      return q;
    };
    for (const f of ["eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte", "or", "contains", "overlaps", "ilike"]) {
      q[f] = filtro(f);
    }
    q.select = () => q;
    q.order = () => q;
    q.limit = () => q;
    q.range = () => q;
    q.insert = (dados: unknown) => {
      c.op = "insert";
      c.dados = dados;
      return q;
    };
    q.update = (dados: unknown) => {
      c.op = "update";
      c.dados = dados;
      return q;
    };
    q.delete = () => {
      c.op = "delete";
      return q;
    };
    const uma = () => {
      const r = resposta();
      return Promise.resolve({ data: Array.isArray(r.data) ? (r.data[0] ?? null) : null, error: r.error });
    };
    q.maybeSingle = uma;
    q.single = uma;
    q.then = (ok: (v: unknown) => unknown, erro?: (e: unknown) => unknown) => Promise.resolve(resposta()).then(ok, erro);
    return q;
  }

  async function rpc(nome: string, args: Record<string, unknown>): Promise<Resposta> {
    rpcs.push({ nome, args });
    return config.rpc?.[nome]?.(args) ?? { data: null, error: null };
  }

  return { chamadas, rpcs, db: { from, rpc } };
}

/** As chamadas de uma tabela e operação, para o `expect`. */
export const chamadasDe = (chamadas: Chamada[], tabela: string, op: Chamada["op"]) =>
  chamadas.filter((c) => c.tabela === tabela && c.op === op);
```

- [ ] **Step 2: O teste (falha)**

`tests/unit/escale-assistente-publico.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { GET as contatosDaImportacao } from "@/app/api/v1/importacoes/[id]/contatos/route";
import { POST } from "@/app/api/v1/campanhas-da-casca/publico/route";
import { compilarPublico, idsDoPublico, paginaDoPublico } from "@/lib/escale/campanhas/publico-banco";
import { createClient } from "@/lib/supabase/server";
import { bancoDeMentira } from "@/tests/helpers/banco-de-mentira";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

const C1 = "bbbbbbbb-0000-4000-8000-000000000001";
const C2 = "bbbbbbbb-0000-4000-8000-000000000002";
const IMPORTACAO = "eeeeeeee-0000-4000-8000-000000000001";

const pagina = (ids: string[], total: number) => ({ data: ids.map((contact_id) => ({ contact_id, total })), error: null });

beforeEach(() => {
  vi.clearAllMocks();
  authOk("manager");
});

describe("compilarPublico", () => {
  it("ids passam como estão; sem seleção fica nulo", () => {
    expect(compilarPublico({ selecao: { tipo: "ids", ids: [C1] }, avulsos: [C2], removidos: [] }, "UTC")).toEqual({
      selecao: { tipo: "ids", ids: [C1] },
      avulsos: [C2],
      removidos: [],
    });
    expect(compilarPublico({ selecao: null, avulsos: [], removidos: [] }, "UTC").selecao).toBeNull();
  });

  it("o filtro vira o compilado da 2B (busca e filtros no fuso)", () => {
    const f = JSON.stringify({ telefone: "com" });
    const c = compilarPublico(
      { selecao: { tipo: "filtro", q: "ana", v: "com_negocio", f, quantidade: 50, excluidos: [C1] }, avulsos: [], removidos: [] },
      "America/Sao_Paulo",
    );
    expect(c.selecao).toMatchObject({ tipo: "filtro", visao: "com_negocio", quantidade: 50, excluidos: [C1] });
    expect((c.selecao as { padrao: string | null }).padrao).not.toBeNull();
    expect((c.selecao as { filtros: Record<string, unknown> }).filtros).toMatchObject({ fuso: "America/Sao_Paulo" });
  });

  it("filtro que não lê é recusado", () => {
    expect(() =>
      compilarPublico({ selecao: { tipo: "filtro", v: "todos", f: "{quebrado", quantidade: null, excluidos: [] }, avulsos: [], removidos: [] }, "UTC"),
    ).toThrow(/Filtro/);
  });
});

describe("idsDoPublico e paginaDoPublico", () => {
  it("lê em páginas até o total, mesmo quando a página volta curta", async () => {
    let chamada = 0;
    const { db, rpcs } = bancoDeMentira({
      rpc: { fn_escale_pagina_do_publico: () => (chamada++ === 0 ? pagina([C1], 2) : pagina([C2], 2)) },
    });
    const ids = await idsDoPublico(db as never, ORG_ID, { selecao: null, avulsos: [C1, C2], removidos: [] });
    expect(ids).toEqual([C1, C2]);
    expect(rpcs.map((r) => r.args.p_deslocamento)).toEqual([0, 1]);
  });

  it("a página vem hidratada e na ordem do banco", async () => {
    const { db } = bancoDeMentira({
      rpc: { fn_escale_pagina_do_publico: () => pagina([C2, C1], 2) },
      tabelas: {
        contacts: [
          { id: C1, name: "Ana", display_name: null, phone_number: "+5511999990001", email: null, tags: ["vip"] },
          { id: C2, name: null, display_name: "Bia", phone_number: null, email: "bia@x.com", tags: null },
        ],
      },
    });
    const r = await paginaDoPublico(db as never, ORG_ID, { selecao: null, avulsos: [C2, C1], removidos: [] }, 1, 10);
    expect(r.total).toBe(2);
    expect(r.linhas.map((l) => l.nome)).toEqual(["Bia", "Ana"]);
    expect(r.linhas[1]).toMatchObject({ telefone: "+5511999990001", tags: ["vip"] });
  });
});

describe("POST /api/v1/campanhas-da-casca/publico", () => {
  const pedir = (corpo: unknown) =>
    POST(new NextRequest("http://x/api/v1/campanhas-da-casca/publico", { method: "POST", body: JSON.stringify(corpo) }));

  it("devolve a página", async () => {
    const { db } = bancoDeMentira({
      rpc: { fn_escale_pagina_do_publico: () => pagina([C1], 1) },
      tabelas: { contacts: [{ id: C1, name: "Ana", display_name: null, phone_number: null, email: null, tags: [] }], organizations: [{ timezone: "UTC" }] },
    });
    vi.mocked(createClient).mockResolvedValue(db as never);
    const res = await pedir({ publico: { selecao: { tipo: "ids", ids: [C1] }, avulsos: [], removidos: [] } });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ linhas: [{ id: C1, nome: "Ana", telefone: null, email: null, tags: [] }], total: 1 });
  });

  it("público inválido é 422", async () => {
    vi.mocked(createClient).mockResolvedValue(bancoDeMentira().db as never);
    expect((await pedir({ publico: { selecao: { tipo: "ids", ids: ["x"] } } })).status).toBe(422);
  });
});

describe("GET /api/v1/importacoes/[id]/contatos", () => {
  it("os contatos que a importação criou ou atualizou, sem repetir", async () => {
    const { db } = bancoDeMentira({
      tabelas: { crm_importacoes_linhas: (c) => (c.filtros.some(([f]) => f === "gt") ? [] : [
        { numero: 1, contato_id: C1 },
        { numero: 2, contato_id: C2 },
        { numero: 3, contato_id: C1 },
      ]) },
    });
    vi.mocked(createClient).mockResolvedValue(db as never);
    const res = await contatosDaImportacao(new NextRequest(`http://x/api/v1/importacoes/${IMPORTACAO}/contatos`), {
      params: Promise.resolve({ id: IMPORTACAO }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ ids: [C1, C2] });
  });
});
```

> `fusoDaOrganizacao(supabase, orgId)` (de `lib/escale/contatos/lista.ts`) lê `organizations.timezone` por `maybeSingle`; o banco de mentira devolve `organizations: [{ timezone: "UTC" }]`.

Run: `corepack pnpm vitest run tests/unit/escale-assistente-publico.test.ts`
Expected: FAIL (os módulos não existem).

- [ ] **Step 3: `lib/escale/campanhas/publico-banco.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";
import { temFiltros } from "@/lib/escale/contatos/filtros";
import { filtrosDaConsulta, parametrosDaBusca } from "@/lib/escale/contatos/lista";

import type { PublicoDaCampanha } from "./assistente";

/**
 * O PÚBLICO NO BANCO (fork Escale, Fase 8B; N7). A seleção por filtro vira o
 * compilado da 2B (o mesmo de `app/api/v1/acoes-em-massa`), e o banco resolve
 * (`fn_escale_contatos_do_publico`, 9302). Ninguém expande o filtro no
 * cliente: o público é o que o filtro achar na hora de preparar.
 */
export type PublicoCompilado = {
  selecao:
    | null
    | { tipo: "ids"; ids: string[] }
    | {
        tipo: "filtro";
        visao: string;
        padrao: string | null;
        digitos: string[];
        cpf_hash: string | null;
        filtros: unknown;
        quantidade: number | null;
        excluidos: string[];
      };
  avulsos: string[];
  removidos: string[];
};

export class PublicoInvalido extends Error {}

export function compilarPublico(p: PublicoDaCampanha, fuso: string): PublicoCompilado {
  const s = p.selecao;
  const base = { avulsos: [...p.avulsos], removidos: [...p.removidos] };
  if (!s) return { selecao: null, ...base };
  if (s.tipo === "ids") return { selecao: { tipo: "ids", ids: [...s.ids] }, ...base };
  const filtros = filtrosDaConsulta({ f: s.f });
  if (filtros === null) throw new PublicoInvalido("Filtro inválido.");
  const busca = parametrosDaBusca(s.q);
  return {
    selecao: {
      tipo: "filtro",
      visao: s.v,
      padrao: busca.padrao,
      digitos: busca.digitos,
      cpf_hash: busca.cpfHash,
      filtros: temFiltros(filtros) ? compilarFiltros(filtros, fuso) : {},
      quantidade: s.quantidade,
      excluidos: [...s.excluidos],
    },
    ...base,
  };
}

/** O teto de linhas por resposta do PostgREST (`max_rows`); a função também corta em 1.000. */
const PAGINA_DO_BANCO = 1000;

type LinhaDaPagina = { contact_id: string; total: number | string };

/**
 * Todos os ids, em ordem, sem teto (resposta 8). O fim é o TOTAL da 1ª página,
 * não a página curta: o `max_rows` da instalação pode ser menor que 1.000 (#2404).
 */
export async function idsDoPublico(db: SupabaseClient, org: string, compilado: PublicoCompilado): Promise<string[]> {
  const ids: string[] = [];
  let total: number | null = null;
  for (;;) {
    const { data, error } = await db.rpc("fn_escale_pagina_do_publico", {
      p_org: org,
      p_publico: compilado,
      p_limite: PAGINA_DO_BANCO,
      p_deslocamento: ids.length,
    });
    if (error) throw new Error(`público: ${error.message}`);
    const linhas = (data ?? []) as LinhaDaPagina[];
    if (linhas.length === 0) return ids;
    total ??= Number(linhas[0]!.total);
    for (const l of linhas) ids.push(l.contact_id);
    if (ids.length >= total) return ids;
  }
}

export interface LinhaDoDestinatario {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  tags: string[];
}

type LinhaDoContato = {
  id: string;
  name: string | null;
  display_name: string | null;
  phone_number: string | null;
  email: string | null;
  tags: string[] | null;
};

/** A página do passo 2 (e do "Ver contatos"): os ids do banco, hidratados, na ordem do banco. */
export async function paginaDoPublico(
  db: SupabaseClient,
  org: string,
  compilado: PublicoCompilado,
  pagina: number,
  porPagina: number,
): Promise<{ linhas: LinhaDoDestinatario[]; total: number }> {
  const { data, error } = await db.rpc("fn_escale_pagina_do_publico", {
    p_org: org,
    p_publico: compilado,
    p_limite: porPagina,
    p_deslocamento: (pagina - 1) * porPagina,
  });
  if (error) throw new Error(`público: ${error.message}`);
  const ordem = (data ?? []) as LinhaDaPagina[];
  if (ordem.length === 0) return { linhas: [], total: pagina > 1 ? await totalDoPublico(db, org, compilado) : 0 };
  const ids = ordem.map((l) => l.contact_id);
  const { data: contatos, error: erroContatos } = await db
    .from("contacts")
    .select("id, name, display_name, phone_number, email, tags")
    .eq("organization_id", org)
    .in("id", ids);
  if (erroContatos) throw new Error(`público: contatos — ${erroContatos.message}`);
  const porId = new Map(((contatos ?? []) as LinhaDoContato[]).map((c) => [c.id, c]));
  const linhas: LinhaDoDestinatario[] = [];
  for (const id of ids) {
    const c = porId.get(id);
    if (!c) continue;
    linhas.push({
      id,
      nome: nomeDoContato({ name: c.name, display_name: c.display_name, phone_number: null }),
      telefone: c.phone_number,
      email: c.email,
      tags: c.tags ?? [],
    });
  }
  return { linhas, total: Number(ordem[0]!.total) };
}

async function totalDoPublico(db: SupabaseClient, org: string, compilado: PublicoCompilado): Promise<number> {
  const { data, error } = await db.rpc("fn_escale_pagina_do_publico", {
    p_org: org,
    p_publico: compilado,
    p_limite: 1,
    p_deslocamento: 0,
  });
  if (error) throw new Error(`público: ${error.message}`);
  const l = (data ?? []) as LinhaDaPagina[];
  return l.length === 0 ? 0 : Number(l[0]!.total);
}
```

> `nomeDoContato` recebe `ContatoNomeavel`; se o tipo pedir outros campos (o typecheck diz), passe-os como `null`. O `phone_number: null` é de propósito: o nome da linha não cai para o telefone (o telefone tem coluna própria).

- [ ] **Step 4: `app/api/v1/campanhas-da-casca/publico/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { publicoSchema } from "@/lib/escale/campanhas/assistente";
import { PublicoInvalido, compilarPublico, paginaDoPublico } from "@/lib/escale/campanhas/publico-banco";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { POR_PAGINA } from "@/lib/escale/contatos/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const corpoSchema = z.object({
  publico: publicoSchema,
  pagina: z.number().int().min(1).max(1_000_000).default(1),
  porPagina: z
    .number()
    .int()
    .refine((n) => (POR_PAGINA as readonly number[]).includes(n))
    .default(10),
});

/**
 * POST /api/v1/campanhas-da-casca/publico — a página dos destinatários do
 * passo 2 (fork Escale, Fase 8B; N7). POST porque o público (ids e filtro) não
 * cabe na URL. Só lê: sessão do usuário, gerente; a função confere o papel de novo.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = corpoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  try {
    const supabase = await createClient();
    const compilado = compilarPublico(lido.data.publico, await fusoDaOrganizacao(supabase, authz.org.orgId));
    const r = await paginaDoPublico(supabase, authz.org.orgId, compilado, lido.data.pagina, lido.data.porPagina);
    return ok(r, { requestId });
  } catch (err) {
    if (err instanceof PublicoInvalido) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 5: `app/api/v1/importacoes/[id]/contatos/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGINA = 1000;

/**
 * GET /api/v1/importacoes/[id]/contatos — os contatos que a importação criou ou
 * atualizou (fork Escale, Fase 8B; N10: o .csv do assistente). Gerente ou
 * acima, sessão do usuário (a RLS da 9107). As linhas somem em 30 dias (LGPD):
 * quem chama guarda os ids na hora.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  if (!UUID.test(id)) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
  try {
    const supabase = await createClient();
    const ids: string[] = [];
    const vistos = new Set<string>();
    let ultimo = 0;
    for (;;) {
      let consulta = supabase
        .from("crm_importacoes_linhas")
        .select("numero, contato_id")
        .eq("organization_id", authz.org.orgId)
        .eq("importacao_id", id)
        .not("contato_id", "is", null)
        .order("numero", { ascending: true })
        .limit(PAGINA);
      if (ultimo > 0) consulta = consulta.gt("numero", ultimo);
      const { data, error } = await consulta;
      if (error) throw new Error(error.message);
      const linhas = (data ?? []) as Array<{ numero: number; contato_id: string }>;
      if (linhas.length === 0) break;
      for (const l of linhas) {
        if (vistos.has(l.contato_id)) continue;
        vistos.add(l.contato_id);
        ids.push(l.contato_id);
      }
      ultimo = linhas[linhas.length - 1]!.numero;
    }
    return ok({ ids }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 6: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-publico.test.ts && corepack pnpm prettier --write tests/helpers/banco-de-mentira.ts lib/escale/campanhas/publico-banco.ts "app/api/v1/campanhas-da-casca/publico/route.ts" "app/api/v1/importacoes/[id]/contatos/route.ts" tests/unit/escale-assistente-publico.test.ts && corepack pnpm eslint tests/helpers/banco-de-mentira.ts lib/escale/campanhas/publico-banco.ts app/api/v1/campanhas-da-casca/publico "app/api/v1/importacoes/[id]/contatos" && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tests/helpers/banco-de-mentira.ts lib/escale/campanhas/publico-banco.ts app/api/v1/campanhas-da-casca/publico "app/api/v1/importacoes/[id]/contatos" tests/unit/escale-assistente-publico.test.ts
git commit -m "feat(escale): o público do assistente no servidor — página, ids e os contatos da importação (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 4: O rascunho — conferir, criar, salvar, ler e os números

**Files:**
- Create: `lib/escale/campanhas/numeros.ts`, `lib/escale/campanhas/conferir.ts`, `lib/escale/campanhas/rascunho.ts`, `app/api/v1/campanhas-da-casca/[id]/assistente/route.ts`, `app/api/v1/campanhas-da-casca/numeros/route.ts`, `tests/unit/escale-assistente-rascunho.test.ts`
- Modify: `app/api/v1/campanhas-da-casca/route.ts` (o `POST` ao lado do `GET` da 8A), `lib/channels/selectable.ts` (exportar `aceitaMensagemLivre`), `lib/audit/actions.ts`

**Interfaces:**
- Consumes: `assistenteSchema`, `colunasDoAssistente`, `assistenteDaLinha`, `COLUNAS_DO_ASSISTENTE`, `LinhaDoAssistente` (Task 1); `variaveisDoCorpo` (Task 1); `listSelectableChannels` (`lib/channels/selectable.ts`); `gravarPool`, `lerPoolExtra` (`lib/campanhas/pool-de-numeros.ts`); `ehEditavel` (`lib/campanhas/maquina-de-estados.ts`); `Recusa` (`lib/campanhas/acoes.ts`).
- Produces:
  - `numeros.ts`: `NumeroDaCampanha { id; nome; telefone: string | null; conectado: boolean; oficial: boolean; provider: string | null; setor: string | null }`, `GRUPO_OFICIAL = "WhatsApp Oficial"`, `GRUPO_NAO_OFICIAL = "WhatsApp não oficial"`, `grupoDoNumero(n)`.
  - `conferir.ts`: `conferirAssistente(admin, org, a): Promise<Recusa | null>`.
  - `rascunho.ts`: `criarRascunho(admin, org, userId, a): Promise<{ ok: true; id: string } | Recusa>`, `salvarRascunho(admin, org, userId, id, a): Promise<{ ok: true } | Recusa>`, `DadosDoAssistente { campanhaId; status; assistente: Assistente; publicoAntigo: boolean }`, `lerAssistente(db, admin, org, id): Promise<DadosDoAssistente | null>`.
  - Rotas: `POST /api/v1/campanhas-da-casca` (`Assistente`) → 201 `{ data: { id } }`; `GET /api/v1/campanhas-da-casca/[id]/assistente` → `{ data: DadosDoAssistente }`; `PUT` mesma rota (`Assistente`) → `{ data: { id } }`; `GET /api/v1/campanhas-da-casca/numeros` → `{ data: NumeroDaCampanha[] }`.
  - Auditoria: `campaign.wizard_saved`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-assistente-rascunho.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/channels/selectable", () => ({ listSelectableChannels: vi.fn() }));

import { GET as lerAssistenteRota, PUT } from "@/app/api/v1/campanhas-da-casca/[id]/assistente/route";
import { GET as numerosRota } from "@/app/api/v1/campanhas-da-casca/numeros/route";
import { POST } from "@/app/api/v1/campanhas-da-casca/route";
import { audit } from "@/lib/audit";
import { listSelectableChannels } from "@/lib/channels/selectable";
import { POS_ENVIO_PADRAO, type Assistente } from "@/lib/escale/campanhas/assistente";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bancoDeMentira, chamadasDe } from "@/tests/helpers/banco-de-mentira";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

const LIVRE = "aaaaaaaa-0000-4000-8000-000000000001";
const OFICIAL = "aaaaaaaa-0000-4000-8000-000000000002";
const CAMPANHA = "dddddddd-0000-4000-8000-000000000001";
const C1 = "bbbbbbbb-0000-4000-8000-000000000001";

const ASSISTENTE: Assistente = {
  nome: "Reativação de junho",
  numeroId: LIVRE,
  mensagem: { tipo: "texto", texto: "Oi {{primeiro_nome}}" },
  quando: { modo: "agora" },
  baseLegal: "consent",
  lia: null,
  publico: { selecao: { tipo: "ids", ids: [C1] }, avulsos: [], removidos: [] },
  posEnvio: POS_ENVIO_PADRAO,
  agenteId: null,
  ritmo: {},
  numerosExtras: [],
};
const MODELO = {
  tipo: "modelo" as const,
  nome: "msg1",
  idioma: "pt_BR",
  categoria: "MARKETING",
  corpo: "Oi {{1}}",
  variaveis: { "1": { fonte: "campo" as const, campo: "primeiro_nome", alternativo: null } },
};

beforeEach(() => {
  vi.clearAllMocks();
  authOk("manager");
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
  vi.mocked(listSelectableChannels).mockResolvedValue([
    { id: LIVRE, display_name: "Naiara", status: "WORKING", phone_number: "+5516999653041", aceitaMensagemLivre: true },
    { id: OFICIAL, display_name: "Bathully", status: "WORKING", phone_number: "+551153043062", aceitaMensagemLivre: false },
  ]);
});

const pedir = (corpo: unknown) =>
  POST(new NextRequest("http://x/api/v1/campanhas-da-casca", { method: "POST", body: JSON.stringify(corpo) }));

describe("POST /api/v1/campanhas-da-casca (criar o rascunho)", () => {
  it("cria com as colunas do assistente e audita", async () => {
    const banco = bancoDeMentira({ tabelas: { campaigns: (c) => (c.op === "insert" ? [{ id: CAMPANHA }] : []) } });
    vi.mocked(createAdminClient).mockReturnValue(banco.db as never);
    const res = await pedir(ASSISTENTE);
    expect(res.status).toBe(201);
    expect((await res.json()).data).toEqual({ id: CAMPANHA });
    const [insert] = chamadasDe(banco.chamadas, "campaigns", "insert");
    expect(insert!.dados).toMatchObject({ organization_id: ORG_ID, name: "Reativação de junho", escale_quando: null });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.created", resourceId: CAMPANHA }));
  });

  it("número oficial exige modelo; número não oficial recusa modelo", async () => {
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    expect((await pedir({ ...ASSISTENTE, numeroId: OFICIAL })).status).toBe(422);
    expect((await pedir({ ...ASSISTENTE, mensagem: MODELO })).status).toBe(422);
  });

  it("modelo precisa estar aprovado e com todas as variáveis", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({ tabelas: { meta_templates: [{ status: "PENDING" }] } }).db as never,
    );
    expect((await pedir({ ...ASSISTENTE, numeroId: OFICIAL, mensagem: MODELO })).status).toBe(422);
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({ tabelas: { meta_templates: [{ status: "APPROVED" }] } }).db as never,
    );
    expect((await pedir({ ...ASSISTENTE, numeroId: OFICIAL, mensagem: { ...MODELO, variaveis: {} } })).status).toBe(422);
  });

  it("números extras só com número não oficial", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({ tabelas: { meta_templates: [{ status: "APPROVED" }] } }).db as never,
    );
    expect((await pedir({ ...ASSISTENTE, numeroId: OFICIAL, mensagem: MODELO, numerosExtras: [LIVRE] })).status).toBe(422);
  });

  it("número de outra organização é 409", async () => {
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    expect((await pedir({ ...ASSISTENTE, numeroId: "aaaaaaaa-0000-4000-8000-0000000000ff" })).status).toBe(409);
  });

  it("dados fora do schema são 422", async () => {
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    expect((await pedir({ ...ASSISTENTE, nome: "ab" })).status).toBe(422);
  });
});

describe("PUT e GET /api/v1/campanhas-da-casca/[id]/assistente", () => {
  const ctx = { params: Promise.resolve({ id: CAMPANHA }) };

  it("salva só rascunho, sobe a versão do conteúdo quando a mensagem muda e audita", async () => {
    const banco = bancoDeMentira({
      tabelas: {
        campaigns: (c) =>
          c.op === "update"
            ? [{ id: CAMPANHA }]
            : [{ id: CAMPANHA, status: "draft", message_body: "antes", escale_mensagem: null, content_version: 3 }],
      },
    });
    vi.mocked(createAdminClient).mockReturnValue(banco.db as never);
    const res = await PUT(
      new NextRequest(`http://x/api/v1/campanhas-da-casca/${CAMPANHA}/assistente`, { method: "PUT", body: JSON.stringify(ASSISTENTE) }),
      ctx,
    );
    expect(res.status).toBe(200);
    const [update] = chamadasDe(banco.chamadas, "campaigns", "update");
    expect(update!.dados).toMatchObject({ content_version: 4, message_body: "Oi {{primeiro_nome}}" });
    expect(update!.filtros).toContainEqual(["eq", "status", "draft"]);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.wizard_saved" }));
  });

  it("campanha que não é rascunho é 409", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({ tabelas: { campaigns: [{ id: CAMPANHA, status: "running", message_body: "x", escale_mensagem: null, content_version: 1 }] } })
        .db as never,
    );
    const res = await PUT(
      new NextRequest(`http://x/api/v1/campanhas-da-casca/${CAMPANHA}/assistente`, { method: "PUT", body: JSON.stringify(ASSISTENTE) }),
      ctx,
    );
    expect(res.status).toBe(409);
  });

  it("GET devolve o assistente da campanha", async () => {
    vi.mocked(createClient).mockResolvedValue(
      bancoDeMentira({
        tabelas: {
          campaigns: [
            {
              id: CAMPANHA,
              status: "draft",
              name: "Antiga",
              channel_session_id: LIVRE,
              message_body: "Oi",
              base_legal: "consent",
              lia_ref: null,
              agent_id: null,
              intervalo_segundos: null,
              janela_inicio_hora: null,
              janela_fim_hora: null,
              teto_diario: null,
              teto_horario: null,
              escale_mensagem: null,
              escale_publico: null,
              escale_pos_envio: null,
              escale_quando: null,
            },
          ],
        },
      }).db as never,
    );
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira({ tabelas: { campaign_channel_sessions: [] } }).db as never);
    const res = await lerAssistenteRota(new NextRequest(`http://x/api/v1/campanhas-da-casca/${CAMPANHA}/assistente`), ctx);
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toMatchObject({ campanhaId: CAMPANHA, status: "draft", publicoAntigo: true });
    expect(data.assistente.mensagem).toEqual({ tipo: "texto", texto: "Oi" });
  });
});

describe("GET /api/v1/campanhas-da-casca/numeros", () => {
  it("oficial pela capacidade, com o provider e o setor", async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({
        tabelas: {
          channel_sessions: [
            { id: LIVRE, provider: "p1" },
            { id: OFICIAL, provider: "p2" },
          ],
          crm_setor_do_dispositivo: [{ channel_session_id: OFICIAL, setor_id: "s1" }],
          crm_setores: [{ id: "s1", nome: "Atendimento" }],
        },
      }).db as never,
    );
    const res = await numerosRota(new NextRequest("http://x/api/v1/campanhas-da-casca/numeros"));
    expect((await res.json()).data).toEqual([
      { id: LIVRE, nome: "Naiara", telefone: "+5516999653041", conectado: true, oficial: false, provider: "p1", setor: null },
      { id: OFICIAL, nome: "Bathully", telefone: "+551153043062", conectado: true, oficial: true, provider: "p2", setor: "Atendimento" },
    ]);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-assistente-rascunho.test.ts`
Expected: FAIL (os módulos não existem).

- [ ] **Step 2: Exportar `aceitaMensagemLivre` e a auditoria**

Em `lib/channels/selectable.ts`, troque `function aceitaMensagemLivre(provider: string | null): boolean {` por:

```ts
// FORK ESCALE · Fase 8B: a rodada da campanha grava se o número é oficial (custo preparado).
export function aceitaMensagemLivre(provider: string | null): boolean {
```

Em `lib/audit/actions.ts`, logo depois das três ações da 8A (`"campaign.draft_deleted"`), acrescente:

```ts
  // FORK ESCALE · Fase 8B: o assistente de campanha da casca (migration 9302).
  "campaign.wizard_saved",
  "campaign.post_send_applied",
```

- [ ] **Step 3: `lib/escale/campanhas/numeros.ts`**

```ts
/**
 * OS NÚMEROS DO ASSISTENTE (fork Escale, Fase 8B; N4). "Oficial" é a capacidade
 * do canal (não aceita texto livre fora da janela), nunca o nome do provedor
 * (cerca `lint:channels`). `provider` só viaja para `useModelosDeMensagem`.
 */
export interface NumeroDaCampanha {
  id: string;
  nome: string;
  telefone: string | null;
  conectado: boolean;
  oficial: boolean;
  provider: string | null;
  setor: string | null;
}

export const GRUPO_OFICIAL = "WhatsApp Oficial";
export const GRUPO_NAO_OFICIAL = "WhatsApp não oficial";

export const grupoDoNumero = (n: Pick<NumeroDaCampanha, "oficial">): string =>
  n.oficial ? GRUPO_OFICIAL : GRUPO_NAO_OFICIAL;
```

- [ ] **Step 4: `lib/escale/campanhas/conferir.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Recusa } from "@/lib/campanhas/acoes";
import { listSelectableChannels } from "@/lib/channels/selectable";

import type { Assistente } from "./assistente";
import { variaveisDoCorpo } from "./modelo";

const recusa = (codigo: Recusa["codigo"], mensagem: string, status: number): Recusa => ({ ok: false, codigo, mensagem, status });

/**
 * O ASSISTENTE CONTRA A ORGANIZAÇÃO (fork Escale, Fase 8B; N4, N5, N11). O
 * schema já validou a forma; aqui, o que só o banco sabe: o número é desta
 * organização e aceita esta mensagem, o modelo está aprovado, a etapa é da
 * origem, o atendente e o agente são daqui. Devolve a primeira recusa.
 */
export async function conferirAssistente(admin: SupabaseClient, org: string, a: Assistente): Promise<Recusa | null> {
  const canais = await listSelectableChannels(admin, org);
  const principal = canais.find((c) => c.id === a.numeroId);
  if (!principal) return recusa("campanha_canal_indisponivel", "Escolha uma conexão de WhatsApp desta organização.", 409);
  const oficial = !principal.aceitaMensagemLivre;

  if (oficial && a.mensagem.tipo !== "modelo") {
    return recusa("campanha_conteudo_invalido", "Este número só envia modelo aprovado pela Meta. Escolha um modelo.", 422);
  }
  if (!oficial && a.mensagem.tipo === "modelo") {
    return recusa("campanha_conteudo_invalido", "Este número envia texto livre. Escreva a mensagem.", 422);
  }
  if (a.mensagem.tipo === "modelo") {
    const m = a.mensagem;
    const { data, error } = await admin
      .from("meta_templates")
      .select("status")
      .eq("organization_id", org)
      .eq("name", m.nome)
      .eq("language", m.idioma);
    if (error) throw new Error(`conferir: modelo — ${error.message}`);
    const aprovado = ((data ?? []) as Array<{ status: string | null }>).some((l) => (l.status ?? "").toUpperCase() === "APPROVED");
    if (!aprovado) return recusa("campanha_conteudo_invalido", "O modelo escolhido não está aprovado pela Meta.", 422);
    if (variaveisDoCorpo(m.corpo).some((chave) => !m.variaveis[chave])) {
      return recusa("campanha_conteudo_invalido", "Resolva as variáveis do modelo para avançar.", 422);
    }
  }

  if (a.numerosExtras.length > 0) {
    if (oficial) return recusa("campanha_canal_indisponivel", "Números extras só com número não oficial.", 422);
    const livres = new Set(canais.filter((c) => c.aceitaMensagemLivre).map((c) => c.id));
    if (a.numerosExtras.some((id) => !livres.has(id))) {
      return recusa("campanha_canal_indisponivel", "Um dos números escolhidos não é uma conexão desta organização.", 409);
    }
  }

  const p = a.posEnvio;
  if (p.origemId && p.etapaId) {
    const { data } = await admin
      .from("crm_stages")
      .select("pipeline_id, is_archived")
      .eq("organization_id", org)
      .eq("id", p.etapaId)
      .maybeSingle();
    const etapa = data as { pipeline_id: string; is_archived: boolean } | null;
    if (!etapa || etapa.pipeline_id !== p.origemId || etapa.is_archived) {
      return recusa("campanha_estado_invalido", "Escolha a origem e a etapa.", 422);
    }
  }
  if (p.atendenteId) {
    const { data } = await admin
      .from("user_organizations")
      .select("role")
      .eq("organization_id", org)
      .eq("user_id", p.atendenteId)
      .maybeSingle();
    const papel = (data as { role: string } | null)?.role;
    if (!papel || !["agent", "manager", "admin"].includes(papel)) {
      return recusa("campanha_estado_invalido", "Escolha um atendente desta organização.", 422);
    }
  }
  if (a.agenteId) {
    const { data } = await admin.from("ai_agents").select("id").eq("organization_id", org).eq("id", a.agenteId).maybeSingle();
    if (!data) return recusa("campanha_estado_invalido", "Escolha um agente desta organização.", 422);
  }
  return null;
}
```

> Os códigos (`campanha_canal_indisponivel`, `campanha_conteudo_invalido`, `campanha_estado_invalido`) já existem no `ApiErrorCode` (o original usa os três em `lib/campanhas/acoes.ts`). Se o `user_organizations` desta base guardar o papel em outra coluna, `grep -n "create table.*user_organizations" -A12 supabase/baseline.sql` diz qual; troque só o `select`.

- [ ] **Step 5: `lib/escale/campanhas/rascunho.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Recusa } from "@/lib/campanhas/acoes";
import { ehEditavel, ehStatusDaCampanha } from "@/lib/campanhas/maquina-de-estados";
import { gravarPool, lerPoolExtra } from "@/lib/campanhas/pool-de-numeros";

import {
  COLUNAS_DO_ASSISTENTE,
  assistenteDaLinha,
  colunasDoAssistente,
  type Assistente,
  type LinhaDoAssistente,
} from "./assistente";
import { conferirAssistente } from "./conferir";

/**
 * O RASCUNHO DO ASSISTENTE (fork Escale, Fase 8B; N14). Client admin na escrita,
 * como as rotas do original (`authenticated` só tem SELECT em `campaigns`, 0375);
 * a organização vem do papel conferido, nunca do corpo.
 */
export async function criarRascunho(
  admin: SupabaseClient,
  org: string,
  userId: string,
  a: Assistente,
): Promise<{ ok: true; id: string } | Recusa> {
  const negado = await conferirAssistente(admin, org, a);
  if (negado) return negado;
  const { data, error } = await admin
    .from("campaigns")
    .insert({ organization_id: org, created_by: userId, ...colunasDoAssistente(a) })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Não foi possível criar a campanha.");
  const id = (data as { id: string }).id;
  await gravarPool(admin, { organizationId: org, campanhaId: id, principal: a.numeroId, extras: a.numerosExtras });
  return { ok: true, id };
}

export async function salvarRascunho(
  admin: SupabaseClient,
  org: string,
  userId: string,
  id: string,
  a: Assistente,
): Promise<{ ok: true } | Recusa> {
  const { data: atual } = await admin
    .from("campaigns")
    .select("id, status, message_body, escale_mensagem, content_version")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  const c = atual as { status: string; message_body: string | null; escale_mensagem: unknown; content_version: number } | null;
  if (!c) return { ok: false, codigo: "campanha_nao_encontrada", mensagem: "Campanha não encontrada.", status: 404 };
  if (!ehStatusDaCampanha(c.status) || !ehEditavel(c.status)) {
    return {
      ok: false,
      codigo: "campanha_nao_editavel",
      mensagem: "Só um rascunho aceita mudar o texto e o público.",
      status: 409,
    };
  }
  const negado = await conferirAssistente(admin, org, a);
  if (negado) return negado;
  const colunas = colunasDoAssistente(a);
  const mudouMensagem =
    colunas.message_body !== c.message_body || JSON.stringify(colunas.escale_mensagem) !== JSON.stringify(c.escale_mensagem);
  const { data, error } = await admin
    .from("campaigns")
    .update({ ...colunas, updated_by: userId, ...(mudouMensagem ? { content_version: c.content_version + 1 } : {}) })
    .eq("organization_id", org)
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error) throw new Error(error.message);
  if ((data ?? []).length === 0) {
    return {
      ok: false,
      codigo: "campanha_nao_editavel",
      mensagem: "O estado da campanha mudou enquanto esta edição era salva. Recarregue a tela.",
      status: 409,
    };
  }
  await gravarPool(admin, { organizationId: org, campanhaId: id, principal: a.numeroId, extras: a.numerosExtras });
  return { ok: true };
}

export interface DadosDoAssistente {
  campanhaId: string;
  status: string;
  assistente: Assistente;
  publicoAntigo: boolean;
}

/** `db` é a sessão (RLS de gerente); `admin` lê o rodízio, como o GET do original. */
export async function lerAssistente(
  db: SupabaseClient,
  admin: SupabaseClient,
  org: string,
  id: string,
): Promise<DadosDoAssistente | null> {
  const { data } = await db.from("campaigns").select(COLUNAS_DO_ASSISTENTE).eq("organization_id", org).eq("id", id).maybeSingle();
  if (!data) return null;
  const linha = data as unknown as LinhaDoAssistente;
  const extras = await lerPoolExtra(admin, org, id);
  const { assistente, publicoAntigo } = assistenteDaLinha(linha, extras);
  return { campanhaId: linha.id, status: linha.status, assistente, publicoAntigo };
}
```

- [ ] **Step 6: O `POST` em `app/api/v1/campanhas-da-casca/route.ts`**

O arquivo é da 8A (tem o `GET` da lista). Junte aos imports do topo, sem repetir os que já estão:

```ts
import { audit } from "@/lib/audit";
import { assistenteSchema } from "@/lib/escale/campanhas/assistente";
import { criarRascunho } from "@/lib/escale/campanhas/rascunho";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
```

E acrescente no fim do arquivo:

```ts
/**
 * POST /api/v1/campanhas-da-casca — cria o rascunho do assistente (fork Escale,
 * Fase 8B; N14). Gerente, client admin, a organização do papel.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = assistenteSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", t("Dados inválidos."), 422, {
      requestId,
      details: lido.error.flatten().fieldErrors as Record<string, unknown>,
    });
  }
  try {
    const r = await criarRascunho(createAdminClient(), authz.org.orgId, authz.user.id, lido.data);
    if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
    void audit({
      action: "campaign.created",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "campaign",
      resourceId: r.id,
      requestId,
      metadata: { base_legal: lido.data.baseLegal, via: "assistente", mensagem: lido.data.mensagem.tipo },
    });
    return ok({ id: r.id }, { requestId, status: 201 });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

> Se o arquivo da 8A não importar `randomUUID`, `fail`, `ok`, `requireRole` ou `traduzir`, acrescente-os também (o `GET` dele usa os quatro primeiros).

- [ ] **Step 7: `app/api/v1/campanhas-da-casca/[id]/assistente/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { assistenteSchema } from "@/lib/escale/campanhas/assistente";
import { lerAssistente, salvarRascunho } from "@/lib/escale/campanhas/rascunho";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/v1/campanhas-da-casca/:id/assistente — a campanha no formato do assistente (fork Escale, Fase 8B). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!UUID.test(id)) return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  try {
    const dados = await lerAssistente(await createClient(), createAdminClient(), authz.org.orgId, id);
    if (!dados) return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
    return ok(dados, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}

/** PUT /api/v1/campanhas-da-casca/:id/assistente — salva o rascunho (só `draft`; N14). */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!UUID.test(id)) return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  const lido = assistenteSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) {
    return fail("validation_failed", t("Dados inválidos."), 422, {
      requestId,
      details: lido.error.flatten().fieldErrors as Record<string, unknown>,
    });
  }
  try {
    const r = await salvarRascunho(createAdminClient(), authz.org.orgId, authz.user.id, id, lido.data);
    if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
    void audit({
      action: "campaign.wizard_saved",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "campaign",
      resourceId: id,
      requestId,
      metadata: { mensagem: lido.data.mensagem.tipo },
    });
    return ok({ id }, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 8: `app/api/v1/campanhas-da-casca/numeros/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { listSelectableChannels } from "@/lib/channels/selectable";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/campanhas-da-casca/numeros — os números do "Dispositivo de
 * WhatsApp" (fork Escale, Fase 8B; N4). Três consultas e nenhum embed (o embed
 * ambíguo já derrubou o login, escale.13). O admin lê com `organization_id`
 * explícito, como `listSelectableChannels` documenta.
 */
export async function GET(_req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  try {
    const admin = createAdminClient();
    const org = authz.org.orgId;
    const canais = await listSelectableChannels(admin, org);
    const ids = canais.map((c) => c.id);
    if (ids.length === 0) return ok([] as NumeroDaCampanha[], { requestId });
    const [{ data: provedores }, { data: vinculos }] = await Promise.all([
      admin.from("channel_sessions").select("id, provider").eq("organization_id", org).in("id", ids),
      admin.from("crm_setor_do_dispositivo").select("channel_session_id, setor_id").eq("organization_id", org).in("channel_session_id", ids),
    ]);
    const setorDe = new Map(((vinculos ?? []) as Array<{ channel_session_id: string; setor_id: string }>).map((v) => [v.channel_session_id, v.setor_id]));
    const idsDosSetores = [...new Set(setorDe.values())];
    const { data: setores } = idsDosSetores.length
      ? await admin.from("crm_setores").select("id, nome").eq("organization_id", org).in("id", idsDosSetores)
      : { data: [] };
    const nomeDoSetor = new Map(((setores ?? []) as Array<{ id: string; nome: string }>).map((s) => [s.id, s.nome]));
    const provedorDe = new Map(((provedores ?? []) as Array<{ id: string; provider: string | null }>).map((p) => [p.id, p.provider]));
    const numeros: NumeroDaCampanha[] = canais.map((c) => ({
      id: c.id,
      nome: c.display_name,
      telefone: c.phone_number,
      conectado: c.status === "WORKING",
      oficial: !c.aceitaMensagemLivre,
      provider: provedorDe.get(c.id) ?? null,
      setor: nomeDoSetor.get(setorDe.get(c.id) ?? "") ?? null,
    }));
    return ok(numeros, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 9: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-rascunho.test.ts && corepack pnpm prettier --write lib/escale/campanhas/numeros.ts lib/escale/campanhas/conferir.ts lib/escale/campanhas/rascunho.ts "app/api/v1/campanhas-da-casca/[id]/assistente/route.ts" app/api/v1/campanhas-da-casca/numeros/route.ts tests/unit/escale-assistente-rascunho.test.ts && corepack pnpm eslint lib/escale/campanhas app/api/v1/campanhas-da-casca lib/channels/selectable.ts lib/audit/actions.ts && corepack pnpm typecheck && corepack pnpm lint:channels`
Expected: PASS. Rode também os guardas dos arquivos do original tocados: `for f in lib/channels/selectable lib/audit/actions; do grep -rlF "$f" tests/unit --include='*.test.ts'; done | sort -u | xargs corepack pnpm vitest run`.

- [ ] **Step 10: Commit**

```bash
git add lib/escale/campanhas/numeros.ts lib/escale/campanhas/conferir.ts lib/escale/campanhas/rascunho.ts app/api/v1/campanhas-da-casca lib/channels/selectable.ts lib/audit/actions.ts tests/unit/escale-assistente-rascunho.test.ts
git commit -m "feat(escale): rascunho do assistente — conferir, criar, salvar, ler e os números (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---


### Task 5: O motor — preparar o público da casca e mandar o modelo

**Files:**
- Create: `lib/escale/campanhas/candidatos.ts`, `lib/escale/campanhas/custo.ts`, `tests/unit/escale-assistente-motor.test.ts`
- Modify: `lib/escale/campanhas/modelo.ts` (`modeloDaCampanha`), `lib/campanhas/consulta-de-audiencia.ts`, `lib/campanhas/preparacao.ts`, `lib/campanhas/acoes.ts`, `lib/campanhas/rodada.ts`

**Interfaces:**
- Consumes: `publicoSchema`, `mensagemSchema`, `MensagemDeModelo` (Task 1); `tokensDoModelo`, `valoresDoModelo`, `corpoComValores`, `entradaDoEnvio`, `EntradaDoEnvio` (Task 1); `compilarPublico`, `idsDoPublico` (Task 3); `aceitaMensagemLivre` (Task 4); `fusoDaOrganizacao` (`lib/escale/contatos/lista.ts`).
- Produces:
  - `modeloDaCampanha(mensagem: unknown): MensagemDeModelo | null` (em `modelo.ts`).
  - `candidatosPorIds(admin, { organizationId, ids, corpo }): Promise<CandidatoDaAudiencia[]>` (em `consulta-de-audiencia.ts`).
  - `candidatosDaCasca(admin, c: Pick<CampanhaCarregada, "organization_id" | "escale_publico" | "escale_mensagem" | "message_body">): Promise<{ candidatos: CandidatoDaAudiencia[]; modelo: MensagemDeModelo | null } | null>` (`null` = campanha do original).
  - `custoPreparado(admin, campanha: { organization_id: string; escale_mensagem?: unknown }, sessionId: string): Promise<{ escale_numero_oficial: boolean | null; escale_categoria_do_modelo: string | null }>` (nunca lança).
  - `prepararCampanha(admin, { …, candidatos?, modelo? })`; `CampanhaCarregada` com `escale_mensagem?`, `escale_publico?`, `escale_quando?`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-assistente-motor.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/api/v1/messages/_handler", () => ({ sendMessageHandler: vi.fn() }));
vi.mock("@/lib/atendimento/origem", () => ({ beginServiceAtOrigin: vi.fn() }));
// Sem nome de provedor no teste: a capacidade é o que decide "oficial".
vi.mock("@/lib/channels/selectable", () => ({ aceitaMensagemLivre: (p: string | null) => p === "livre" }));

import { sendMessageHandler } from "@/app/api/v1/messages/_handler";
import { testarAcao, type CampanhaCarregada } from "@/lib/campanhas/acoes";
import { candidatosPorIds } from "@/lib/campanhas/consulta-de-audiencia";
import { prepararCampanha } from "@/lib/campanhas/preparacao";
import { beginServiceAtOrigin } from "@/lib/atendimento/origem";
import type { MensagemDeModelo } from "@/lib/escale/campanhas/assistente";
import { candidatosDaCasca } from "@/lib/escale/campanhas/candidatos";
import { custoPreparado } from "@/lib/escale/campanhas/custo";
import { modeloDaCampanha } from "@/lib/escale/campanhas/modelo";
import { bancoDeMentira, chamadasDe } from "@/tests/helpers/banco-de-mentira";
import { ORG_ID } from "@/tests/helpers/stages-db-double";

const C1 = "bbbbbbbb-0000-4000-8000-000000000001";
const C2 = "bbbbbbbb-0000-4000-8000-000000000002";
const CAMPANHA = "dddddddd-0000-4000-8000-000000000001";
const NUMERO = "aaaaaaaa-0000-4000-8000-000000000001";

const contato = (id: string, name: string | null, phone: string | null = "+5511999990001") => ({
  id,
  created_at: "2026-10-01T00:00:00+00:00",
  name,
  display_name: null,
  phone_number: phone,
  is_blocked: false,
  is_personal: false,
  is_anonymized: false,
  consent: null,
});

const MODELO: MensagemDeModelo = {
  tipo: "modelo",
  nome: "msg1",
  idioma: "pt_BR",
  categoria: "MARKETING",
  corpo: "Oi, {{1}}! {{2}}",
  variaveis: {
    "1": { fonte: "campo", campo: "primeiro_nome", alternativo: null },
    "2": { fonte: "campo", campo: "saudacao", alternativo: null },
  },
};

beforeEach(() => vi.clearAllMocks());

describe("candidatosPorIds", () => {
  it("na ordem dada, sem repetir, só pessoa e não mesclado", async () => {
    const banco = bancoDeMentira({ tabelas: { contacts: [contato(C1, "Ana"), contato(C2, "Bia")] } });
    const r = await candidatosPorIds(banco.db as never, { organizationId: ORG_ID, ids: [C2, C1, C2], corpo: "Oi {{nome}}" });
    expect(r.map((c) => c.contactId)).toEqual([C2, C1]);
    const [consulta] = chamadasDe(banco.chamadas, "contacts", "select");
    expect(consulta!.filtros).toEqual(
      expect.arrayContaining([
        ["eq", "kind", "person"],
        ["is", "is_merged_into", null],
      ]),
    );
  });
});

describe("candidatosDaCasca", () => {
  it("campanha do original (sem público da casca) segue o filtro antigo", async () => {
    expect(
      await candidatosDaCasca(bancoDeMentira().db as never, {
        organization_id: ORG_ID,
        escale_publico: null,
        escale_mensagem: null,
        message_body: "x",
      }),
    ).toBeNull();
  });

  it("resolve o público no banco e devolve o modelo", async () => {
    const banco = bancoDeMentira({
      rpc: { fn_escale_pagina_do_publico: () => ({ data: [{ contact_id: C1, total: 1 }], error: null }) },
      tabelas: { contacts: [contato(C1, "Ana")], organizations: [{ timezone: "UTC" }] },
    });
    const r = await candidatosDaCasca(banco.db as never, {
      organization_id: ORG_ID,
      escale_publico: { selecao: { tipo: "ids", ids: [C1] }, avulsos: [], removidos: [] },
      escale_mensagem: MODELO,
      message_body: MODELO.corpo,
    });
    expect(r?.candidatos.map((c) => c.contactId)).toEqual([C1]);
    expect(r?.modelo?.nome).toBe("msg1");
    expect(banco.rpcs[0]!.args.p_publico).toMatchObject({ selecao: { tipo: "ids", ids: [C1] } });
  });
});

describe("prepararCampanha com o público da casca e o modelo", () => {
  it("congela os valores do modelo, o corpo legível e tira quem não tem o dado", async () => {
    const banco = bancoDeMentira();
    const resumo = await prepararCampanha(banco.db as never, {
      campanhaId: CAMPANHA,
      organizationId: ORG_ID,
      filtro: {},
      corpo: MODELO.corpo,
      contentVersion: 1,
      agora: new Date("2026-11-20T12:00:00.000Z"),
      candidatos: [
        { contactId: C1, nome: "Ana Souza", telefone: "+5511999990001", bloqueado: false, pessoal: false, anonimizado: false, recusouMarketing: false },
        { contactId: C2, nome: null, telefone: "+5511999990002", bloqueado: false, pessoal: false, anonimizado: false, recusouMarketing: false },
      ],
      modelo: MODELO,
    });
    expect(resumo).toMatchObject({ total: 2, elegiveis: 1, excluidos: 1, motivos: { variavel_ausente: 1 } });
    const [insert] = chamadasDe(banco.chamadas, "campaign_recipients", "insert");
    const [ana, sem] = insert!.dados as Array<Record<string, unknown>>;
    expect(ana).toMatchObject({
      contact_id: C1,
      status: "pending",
      rendered_body: "Oi, Ana! {{saudacao}}",
      variables: { nome: "Ana Souza", modelo: { "1": "Ana", "2": "{{saudacao}}" } },
    });
    expect(sem).toMatchObject({ contact_id: C2, status: "skipped", exclusion_reason: "variavel_ausente" });
  });

  it("sem candidatos, o filtro antigo continua obrigatório", async () => {
    await expect(
      prepararCampanha(bancoDeMentira().db as never, {
        campanhaId: CAMPANHA,
        organizationId: ORG_ID,
        filtro: {},
        corpo: "x",
        contentVersion: 1,
        agora: new Date(),
      }),
    ).rejects.toThrow(/Filtro de audiência inválido/);
  });
});

describe("modeloDaCampanha e custoPreparado", () => {
  it("lê o modelo só quando a mensagem é modelo", () => {
    expect(modeloDaCampanha(MODELO)?.nome).toBe("msg1");
    expect(modeloDaCampanha({ tipo: "texto", texto: "oi" })).toBeNull();
    expect(modeloDaCampanha(null)).toBeNull();
  });

  it("número que não aceita texto livre é oficial; a categoria vem do modelo; falha vira nulo", async () => {
    const oficial = bancoDeMentira({ tabelas: { channel_sessions: [{ provider: "oficial" }] } });
    expect(await custoPreparado(oficial.db as never, { organization_id: ORG_ID, escale_mensagem: MODELO }, NUMERO)).toEqual({
      escale_numero_oficial: true,
      escale_categoria_do_modelo: "MARKETING",
    });
    const quebrado = bancoDeMentira({ erroNaTabela: { channel_sessions: "x" } });
    expect(await custoPreparado(quebrado.db as never, { organization_id: ORG_ID }, NUMERO)).toEqual({
      escale_numero_oficial: null,
      escale_categoria_do_modelo: null,
    });
  });
});

describe("testarAcao com modelo", () => {
  it("manda o modelo com os valores do contato de teste", async () => {
    vi.mocked(beginServiceAtOrigin).mockResolvedValue({ conversation_id: "conv-1" } as never);
    vi.mocked(sendMessageHandler).mockResolvedValue({ status: "sent" } as never);
    const banco = bancoDeMentira({ tabelas: { contacts: [contato(C1, "Ana Souza")] } });
    const c: CampanhaCarregada = {
      id: CAMPANHA,
      organization_id: ORG_ID,
      name: "Teste",
      status: "ready",
      channel_session_id: NUMERO,
      message_body: MODELO.corpo,
      base_legal: "consent",
      lia_ref: null,
      audience_filter: {},
      audience_version: 1,
      content_version: 1,
      scheduled_at: null,
      intervalo_segundos: null,
      janela_inicio_hora: null,
      janela_fim_hora: null,
      teto_diario: null,
      teto_horario: null,
      description: null,
      escale_mensagem: MODELO,
    };
    const r = await testarAcao(banco.db as never, c, C1, new Date("2026-11-20T12:00:00.000Z"), "America/Sao_Paulo");
    expect(r.ok).toBe(true);
    const entrada = vi.mocked(sendMessageHandler).mock.calls[0]![2] as Record<string, unknown>;
    expect(entrada).toMatchObject({
      type: "template",
      template_name: "msg1",
      template_language: "pt_BR",
      template_values: { "1": "Ana", "2": "Bom dia" },
      body: "Oi, Ana! Bom dia",
    });
  });
});
```


Run: `corepack pnpm vitest run tests/unit/escale-assistente-motor.test.ts`
Expected: FAIL (as funções novas não existem).

- [ ] **Step 2: `modeloDaCampanha` em `lib/escale/campanhas/modelo.ts`**

Acrescente no fim do arquivo:

```ts
/** O modelo da campanha, quando a mensagem é modelo (campanha do original e texto livre: `null`). */
export function modeloDaCampanha(mensagem: unknown): MensagemDeModelo | null {
  const m = mensagemSchema.safeParse(mensagem);
  return m.success && m.data.tipo === "modelo" ? m.data : null;
}
```

- [ ] **Step 3: `candidatosPorIds` no fim de `lib/campanhas/consulta-de-audiencia.ts`**

```ts
// ─── FORK ESCALE · Fase 8B: os candidatos do público da casca ───
/**
 * Os candidatos de uma lista de ids, NA ORDEM dada (o público do assistente,
 * já resolvido no banco pela 9302). As mesmas colunas, os mesmos campos
 * personalizados e a mesma montagem de `buscarCandidatos`, sem recorte nenhum:
 * os vetos continuam na classificação.
 */
export async function candidatosPorIds(
  admin: SupabaseClient,
  entrada: { organizationId: string; ids: readonly string[]; corpo: string },
): Promise<CandidatoDaAudiencia[]> {
  const camposDoTexto = camposUsadosNoTexto(entrada.corpo);
  const colunas = COLUNAS_DO_CONTATO + (camposDoTexto.contato ? ", custom_fields" : "") + ", created_at";
  const unicos = [...new Set(entrada.ids)];
  const { data, error } = await buscaEmLotes<LinhaDeContato>(unicos, async (lote) => {
    const { data: pagina, error: erro } = await admin
      .from("contacts")
      .select(colunas)
      .eq("organization_id", entrada.organizationId)
      .eq("kind", "person")
      .is("is_merged_into", null)
      .in("id", lote);
    return { data: (pagina ?? null) as unknown as LinhaDeContato[] | null, error: erro };
  });
  if (error) throw new Error(`audiência: público — ${error.message}`);
  const porId = new Map(data.map((l) => [l.id, l]));
  const linhas = unicos.map((id) => porId.get(id)).filter((l): l is LinhaDeContato => l !== undefined);
  const leads = camposDoTexto.lead
    ? await leadsMaisRecentes(admin, entrada.organizationId, linhas.map((l) => l.id))
    : null;
  return linhas.map((l) => ({
    contactId: l.id,
    nome: nomeDoContato(l),
    telefone: l.phone_number,
    bloqueado: l.is_blocked,
    pessoal: l.is_personal === true,
    anonimizado: l.is_anonymized,
    recusouMarketing: recusouMarketing(l.consent),
    ...(camposDoTexto.contato ? { contato: mapaDeJson(l.custom_fields) } : {}),
    ...(leads ? { lead: leads.get(l.id) ?? null } : {}),
  }));
}
```

- [ ] **Step 4: `lib/escale/campanhas/candidatos.ts` e `custo.ts`**

`lib/escale/campanhas/candidatos.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { candidatosPorIds } from "@/lib/campanhas/consulta-de-audiencia";
import type { CandidatoDaAudiencia } from "@/lib/campanhas/elegibilidade";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";

import { publicoSchema, type MensagemDeModelo } from "./assistente";
import { modeloDaCampanha, tokensDoModelo } from "./modelo";
import { compilarPublico, idsDoPublico } from "./publico-banco";

/**
 * O PÚBLICO DA CASCA NA PREPARAÇÃO (fork Escale, Fase 8B; N7). `null` quando a
 * campanha é do formulário do original (sem `escale_publico`): aí o filtro
 * antigo segue como sempre. Sem teto: todos os ids do banco, em páginas.
 */
export async function candidatosDaCasca(
  admin: SupabaseClient,
  c: { organization_id: string; escale_publico?: unknown; escale_mensagem?: unknown; message_body: string | null },
): Promise<{ candidatos: CandidatoDaAudiencia[]; modelo: MensagemDeModelo | null } | null> {
  if (c.escale_publico == null) return null;
  const publico = publicoSchema.safeParse(c.escale_publico);
  if (!publico.success) throw new Error("O público desta campanha não pôde ser lido. Escolha os destinatários de novo.");
  const fuso = await fusoDaOrganizacao(admin, c.organization_id);
  const ids = await idsDoPublico(admin, c.organization_id, compilarPublico(publico.data, fuso));
  const modelo = modeloDaCampanha(c.escale_mensagem);
  const corpo = modelo ? tokensDoModelo(modelo) : (c.message_body ?? "");
  return { candidatos: await candidatosPorIds(admin, { organizationId: c.organization_id, ids, corpo }), modelo };
}
```

`lib/escale/campanhas/custo.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { aceitaMensagemLivre } from "@/lib/channels/selectable";

import { modeloDaCampanha } from "./modelo";

/**
 * O CUSTO PREPARADO (fork Escale, Fase 8B; N15; resposta 4): cada envio guarda
 * o tipo do número e a categoria do modelo, para a conta vir depois sem refazer
 * o histórico. Nunca lança: roda DEPOIS do envio, e uma falha aqui não pode
 * marcar como falho quem já recebeu.
 */
export async function custoPreparado(
  admin: SupabaseClient,
  campanha: { organization_id: string; escale_mensagem?: unknown },
  sessionId: string,
): Promise<{ escale_numero_oficial: boolean | null; escale_categoria_do_modelo: string | null }> {
  try {
    const { data, error } = await admin
      .from("channel_sessions")
      .select("provider")
      .eq("organization_id", campanha.organization_id)
      .eq("id", sessionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const provider = (data as { provider: string | null } | null)?.provider ?? null;
    return {
      escale_numero_oficial: data ? !aceitaMensagemLivre(provider) : null,
      escale_categoria_do_modelo: modeloDaCampanha(campanha.escale_mensagem)?.categoria ?? null,
    };
  } catch {
    return { escale_numero_oficial: null, escale_categoria_do_modelo: null };
  }
}
```

- [ ] **Step 5: `lib/campanhas/preparacao.ts`**

1. Nos imports, acrescente:

```ts
// FORK ESCALE · Fase 8B: o público da casca chega resolvido; o modelo da Meta tem os valores próprios.
import type { MensagemDeModelo } from "@/lib/escale/campanhas/assistente";
import { corpoComValores, valoresDoModelo } from "@/lib/escale/campanhas/modelo";
```

2. Em `classificar`, troque a assinatura e as primeiras linhas:

```ts
async function classificar(
  admin: SupabaseClient,
  entrada: {
    organizationId: string;
    filtro: FiltroDeAudiencia;
    corpo: string;
    agora: Date;
    campanhaId?: string;
    // FORK ESCALE · Fase 8B
    candidatos?: readonly CandidatoDaAudiencia[];
    modelo?: MensagemDeModelo | null;
  },
): Promise<{ linhas: ReturnType<typeof classificarAudiencia>; truncado: boolean }> {
  // FORK ESCALE · Fase 8B: com o público da casca, os candidatos já vêm do banco.
  const { candidatos, truncado } = entrada.candidatos
    ? { candidatos: [...entrada.candidatos], truncado: false }
    : await buscarCandidatos(admin, {
        organizationId: entrada.organizationId,
        filtro: entrada.filtro,
        agora: entrada.agora,
        corpo: entrada.corpo,
      });
```

(apague a chamada antiga a `buscarCandidatos` que ficava ali; o resto da função continua).

3. Ainda em `classificar`, troque o `renderizar:` do contexto por:

```ts
      renderizar: (c: CandidatoDaAudiencia) => {
        // FORK ESCALE · Fase 8B: o modelo resolve as variáveis dele; a saudação segue para o envio.
        if (entrada.modelo) {
          const v = valoresDoModelo(entrada.modelo, { nome: c.nome, lead: c.lead, contato: c.contato });
          return { texto: corpoComValores(entrada.modelo.corpo, v.valores), faltando: v.faltando };
        }
        const r = renderizar(entrada.corpo, { nome: c.nome, lead: c.lead, contato: c.contato });
        return { texto: r.texto, faltando: r.faltando };
      },
```

4. Em `prepararCampanha`, acrescente ao tipo de `entrada`:

```ts
    // FORK ESCALE · Fase 8B
    candidatos?: readonly CandidatoDaAudiencia[];
    modelo?: MensagemDeModelo | null;
```

e troque o começo do corpo (a validação do filtro e a chamada a `classificar`) por:

```ts
  // FORK ESCALE · Fase 8B: com o público da casca, o filtro antigo (vazio) não é validado.
  let filtro: FiltroDeAudiencia = FILTRO_VAZIO;
  if (!entrada.candidatos) {
    const lido = filtroDeAudienciaSchema.safeParse(entrada.filtro);
    if (!lido.success) {
      throw new Error(`Filtro de audiência inválido: ${lido.error.issues[0]?.message ?? "sem critério"}`);
    }
    filtro = lido.data;
  }

  const { linhas } = await classificar(admin, {
    organizationId: entrada.organizationId,
    filtro,
    corpo: entrada.corpo,
    agora: entrada.agora,
    campanhaId: entrada.campanhaId,
    candidatos: entrada.candidatos,
    modelo: entrada.modelo ?? null,
  });
```

5. No `registros = linhas.map(...)`, troque `variables: { nome: l.candidato.nome },` por:

```ts
    // FORK ESCALE · Fase 8B: com modelo, os valores de cada variável ficam congelados aqui.
    variables:
      entrada.modelo && l.elegivel
        ? {
            nome: l.candidato.nome,
            modelo: valoresDoModelo(entrada.modelo, {
              nome: l.candidato.nome,
              lead: l.candidato.lead,
              contato: l.candidato.contato,
            }).valores,
          }
        : { nome: l.candidato.nome },
```

- [ ] **Step 6: `lib/campanhas/acoes.ts`**

1. Imports:

```ts
// FORK ESCALE · Fase 8B: o público da casca e o modelo da Meta.
import { candidatosDaCasca } from "@/lib/escale/campanhas/candidatos";
import { corpoComValores, entradaDoEnvio, modeloDaCampanha, tokensDoModelo, valoresDoModelo } from "@/lib/escale/campanhas/modelo";
```

2. Em `CampanhaCarregada`, depois de `description: string | null;`:

```ts
  // FORK ESCALE · Fase 8B (migration 9302): opcionais para os testes do original seguirem.
  escale_mensagem?: unknown;
  escale_publico?: unknown;
  escale_quando?: string | null;
```

e em `COLUNAS`, troque o fim `"intervalo_segundos, janela_inicio_hora, janela_fim_hora, teto_diario, teto_horario";` por `"intervalo_segundos, janela_inicio_hora, janela_fim_hora, teto_diario, teto_horario, " + "escale_mensagem, escale_publico, escale_quando";`.

3. Em `prepararAcao`, dentro do `try`, troque `const resumo = await prepararCampanha(admin, {` … `});` por:

```ts
    // FORK ESCALE · Fase 8B: o público da casca (ids ou o filtro de Contatos) é resolvido aqui.
    const daCasca = await candidatosDaCasca(admin, c);
    const resumo = await prepararCampanha(admin, {
      campanhaId: c.id,
      organizationId: c.organization_id,
      filtro: c.audience_filter,
      corpo: c.message_body ?? "",
      contentVersion: c.content_version,
      agora,
      ...(daCasca ? { candidatos: daCasca.candidatos, modelo: daCasca.modelo } : {}),
    });
```

4. Em `testarAcao`, logo depois do bloco `if (render.faltando.length > 0) { … }`, acrescente:

```ts
  // FORK ESCALE · Fase 8B: com modelo, o teste manda o modelo com os valores deste contato.
  const modelo = modeloDaCampanha(c.escale_mensagem);
  let envio = entradaDoEnvio(null, render.texto, null, { agora, fuso }, null);
  if (modelo) {
    const camposDoModelo = await camposDoDestinatario(admin, {
      organizationId: c.organization_id,
      contactId: linha.id,
      corpo: tokensDoModelo(modelo),
    });
    const v = valoresDoModelo(modelo, { nome: nomeDoContato(linha), ...camposDoModelo }, { agora, fuso });
    if (v.faltando.length > 0) {
      return {
        ok: false,
        codigo: "campanha_conteudo_invalido",
        mensagem: "Falta um dado que o modelo usa no cadastro deste contato — escolha outro para o teste.",
        status: 422,
      };
    }
    envio = entradaDoEnvio(modelo, corpoComValores(modelo.corpo, v.valores), { modelo: v.valores }, { agora, fuso }, nomeDoContato(linha));
  }
```

e, na chamada a `sendMessageHandler` do teste, troque `type: "text",` e `body: render.texto,` por `...envio,`.

- [ ] **Step 7: `lib/campanhas/rodada.ts`**

1. Imports:

```ts
// FORK ESCALE · Fase 8B: o modelo da Meta e o custo preparado.
import { custoPreparado } from "@/lib/escale/campanhas/custo";
import { entradaDoEnvio } from "@/lib/escale/campanhas/modelo";
```

2. Em `CampanhaRow`, depois de `teto_horario: number | null;`: `  /** FORK ESCALE · Fase 8B (9302): texto livre ou modelo. */\n  escale_mensagem?: unknown;`; e em `COLUNAS_DA_CAMPANHA`, troque `"intervalo_segundos, janela_inicio_hora, janela_fim_hora, teto_diario, teto_horario";` por `"intervalo_segundos, janela_inicio_hora, janela_fim_hora, teto_diario, teto_horario, escale_mensagem";`.

3. Em `DestinatarioRow`, depois de `rendered_body: string | null;`: `  /** FORK ESCALE · Fase 8B: os valores do modelo congelados na preparação. */\n  variables: unknown;`; e na consulta da fila, troque `"id, contact_id, recipient_address, rendered_body, " +` por `"id, contact_id, recipient_address, rendered_body, variables, " +`.

4. Na chamada a `sendMessageHandler` do envio, troque:

```ts
        type: "text",
        body: corpo,
```

por:

```ts
        // FORK ESCALE · Fase 8B: com modelo, `type: "template"` com os valores do destinatário.
        ...entradaDoEnvio(campanha.escale_mensagem, corpo, alvo.variables, { agora, fuso: knobs.timezone }, nomeDoContato(contato)),
```

5. Logo depois de `await recordSend(pool, campanha.organization_id, sessionEscolhida, agora);`:

```ts
    // FORK ESCALE · Fase 8B: o custo preparado (N15). Nunca lança.
    const custo = await custoPreparado(admin, campanha, sessionEscolhida);
```

e no `update` final do destinatário (o que grava `status: falhou ? "failed" : "sent"`), acrescente `...custo,` como última propriedade do objeto.

- [ ] **Step 8: Rodar os testes do motor e os do original**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-motor.test.ts lib/campanhas`
Expected: PASS — os testes de `lib/campanhas/*.test.ts` (renderizador, elegibilidade, consulta de audiência, reserva, ritmo, rodízio, máquina) continuam verdes sem mudança: campanha sem `escale_*` passa por todos os encaixes como antes.

- [ ] **Step 9: Conferir**

Run: `corepack pnpm prettier --write lib/escale/campanhas/candidatos.ts lib/escale/campanhas/custo.ts tests/unit/escale-assistente-motor.test.ts && corepack pnpm eslint lib/escale/campanhas lib/campanhas && corepack pnpm typecheck && corepack pnpm lint:channels`
Expected: PASS. Guardas que leem os arquivos do motor: `for f in lib/campanhas/preparacao lib/campanhas/acoes lib/campanhas/rodada lib/campanhas/consulta-de-audiencia; do grep -rlF "$f" tests/unit --include='*.test.ts'; done | sort -u | xargs -r corepack pnpm vitest run` (inclui `campanha-escreve-como-servidor`).

- [ ] **Step 10: Commit**

```bash
git add lib/escale/campanhas/candidatos.ts lib/escale/campanhas/custo.ts lib/escale/campanhas/modelo.ts lib/campanhas/consulta-de-audiencia.ts lib/campanhas/preparacao.ts lib/campanhas/acoes.ts lib/campanhas/rodada.ts tests/unit/escale-assistente-motor.test.ts
git commit -m "feat(escale): o motor prepara o público da casca e manda o modelo da Meta, com o custo preparado (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 6: As ações do assistente — preparar, enviar, duplicar e os motivos

**Files:**
- Create: `lib/escale/campanhas/acoes-do-assistente.ts`, `app/api/v1/campanhas-da-casca/[id]/fora-da-lista/route.ts`, `tests/unit/escale-assistente-acoes.test.ts`
- Modify: `app/api/v1/campanhas-da-casca/[id]/[acao]/route.ts` (8A), `hooks/escale/useCampanhasDaCasca.ts` (8A)

**Interfaces:**
- Consumes: `carregarCampanha`, `prepararAcao`, `iniciarAcao`, `agendarAcao`, `CampanhaCarregada`, `Desfecho`, `Recusa` (`lib/campanhas/acoes.ts`); `reagendarAcao`, `voltarAoRascunhoAcao` (8A, `lib/escale/campanhas/acoes.ts`); `publicoSchema`, `NOME_MAX` (Task 1); `publicoVazio` (Task 1); `gravarPool`, `lerPoolExtra`.
- Produces:
  - `MotivoFora { motivo: string; quantidade: number }`, `ResumoDaPreparacao { total; elegiveis; excluidos; motivos: MotivoFora[] }`.
  - `foraDaLista(db, org, id): Promise<MotivoFora[]>`, `prepararDoAssistente(admin, c, agora): Promise<Desfecho<{ resumo: ResumoDaPreparacao }>>`, `enviarDoAssistente(admin, c, agora): Promise<Desfecho<{ modo: "iniciada" | "agendada"; quando: string | null }>>`, `duplicarDoAssistente(admin, c, autorId): Promise<Desfecho<{ id: string }>>`, `nomeDaCopia(nome): string`.
  - `POST /api/v1/campanhas-da-casca/[id]/preparar` → `{ data: { resumo } }`; `…/enviar` → `{ data: { modo, quando } }`; `…/duplicar` → `{ data: { id } }`; `GET …/[id]/fora-da-lista` → `{ data: MotivoFora[] }`.
  - `caminhoDaAcao({ acao: "duplicar" })` → a rota do fork.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-assistente-acoes.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/campanhas/acoes", () => ({
  carregarCampanha: vi.fn(),
  prepararAcao: vi.fn(),
  iniciarAcao: vi.fn(),
  agendarAcao: vi.fn(),
}));

import { GET as foraDaListaRota } from "@/app/api/v1/campanhas-da-casca/[id]/fora-da-lista/route";
import { POST } from "@/app/api/v1/campanhas-da-casca/[id]/[acao]/route";
import { audit } from "@/lib/audit";
import { agendarAcao, carregarCampanha, iniciarAcao, prepararAcao, type CampanhaCarregada } from "@/lib/campanhas/acoes";
import { nomeDaCopia } from "@/lib/escale/campanhas/acoes-do-assistente";
import { caminhoDaAcao } from "@/hooks/escale/useCampanhasDaCasca";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bancoDeMentira, chamadasDe } from "@/tests/helpers/banco-de-mentira";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

const ID = "dddddddd-0000-4000-8000-000000000001";
const COPIA = "dddddddd-0000-4000-8000-000000000002";
const C1 = "bbbbbbbb-0000-4000-8000-000000000001";

const campanha = (extra: Partial<CampanhaCarregada> = {}): CampanhaCarregada => ({
  id: ID,
  organization_id: ORG_ID,
  name: "Reativação",
  status: "draft",
  channel_session_id: "aaaaaaaa-0000-4000-8000-000000000001",
  message_body: "Oi",
  base_legal: "consent",
  lia_ref: null,
  audience_filter: {},
  audience_version: 1,
  content_version: 1,
  scheduled_at: null,
  intervalo_segundos: null,
  janela_inicio_hora: null,
  janela_fim_hora: null,
  teto_diario: null,
  teto_horario: null,
  description: null,
  escale_mensagem: { tipo: "texto", texto: "Oi" },
  escale_publico: { selecao: { tipo: "ids", ids: [C1] }, avulsos: [], removidos: [] },
  escale_quando: null,
  ...extra,
});

const acao = (nome: string, corpo?: unknown) =>
  POST(new NextRequest(`http://x/api/v1/campanhas-da-casca/${ID}/${nome}`, { method: "POST", body: corpo ? JSON.stringify(corpo) : undefined }), {
    params: Promise.resolve({ id: ID, acao: nome }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  authOk("manager");
  vi.mocked(requireSupportWrite).mockResolvedValue(null);
});

describe("preparar", () => {
  it("prepara pelo motor do original e devolve os motivos de quem ficou fora", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue({ ok: true, campanha: campanha() });
    vi.mocked(prepararAcao).mockResolvedValue({ ok: true, resumo: { total: 3, elegiveis: 2, excluidos: 1 } });
    vi.mocked(createAdminClient).mockReturnValue(
      bancoDeMentira({ rpc: { fn_escale_fora_da_lista: () => ({ data: [{ motivo: "sem_telefone", quantidade: 1 }], error: null }) } })
        .db as never,
    );
    const res = await acao("preparar");
    expect(res.status).toBe(200);
    expect((await res.json()).data.resumo).toEqual({
      total: 3,
      elegiveis: 2,
      excluidos: 1,
      motivos: [{ motivo: "sem_telefone", quantidade: 1 }],
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.prepared" }));
  });

  it("sem destinatário é recusado antes do motor", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue({
      ok: true,
      campanha: campanha({ escale_publico: { selecao: null, avulsos: [], removidos: [] } }),
    });
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    const res = await acao("preparar");
    expect(res.status).toBe(422);
    expect(prepararAcao).not.toHaveBeenCalled();
  });
});

describe("enviar", () => {
  it("sem agendamento, inicia", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue({ ok: true, campanha: campanha({ status: "ready" }) });
    vi.mocked(iniciarAcao).mockResolvedValue({ ok: true, retomada: false });
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    const res = await acao("enviar");
    expect((await res.json()).data).toEqual({ modo: "iniciada", quando: null });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.started" }));
  });

  it("com agendamento no futuro, agenda; no passado, recusa", async () => {
    const futuro = new Date(Date.now() + 3_600_000).toISOString();
    vi.mocked(carregarCampanha).mockResolvedValue({ ok: true, campanha: campanha({ status: "ready", escale_quando: futuro }) });
    vi.mocked(agendarAcao).mockResolvedValue({ ok: true });
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    expect((await (await acao("enviar")).json()).data).toEqual({ modo: "agendada", quando: futuro });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.scheduled" }));

    vi.mocked(carregarCampanha).mockResolvedValue({
      ok: true,
      campanha: campanha({ status: "ready", escale_quando: "2020-01-01T00:00:00.000Z" }),
    });
    expect((await acao("enviar")).status).toBe(422);
  });

  it("só campanha pronta", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue({ ok: true, campanha: campanha({ status: "draft" }) });
    vi.mocked(createAdminClient).mockReturnValue(bancoDeMentira().db as never);
    expect((await acao("enviar")).status).toBe(409);
  });
});

describe("duplicar", () => {
  it("copia tudo, com o nome + ' Cópia', e o rodízio", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue({ ok: true, campanha: campanha({ status: "completed" }) });
    const banco = bancoDeMentira({
      tabelas: {
        campaigns: (c) =>
          c.op === "insert"
            ? [{ id: COPIA }]
            : [{ name: "Reativação", channel_session_id: "aaaaaaaa-0000-4000-8000-000000000001", pipeline_id: "p", stage_id: "s", agent_id: "g", escale_pos_envio: { tags: ["x"] } }],
        campaign_channel_sessions: (c) => (c.filtros.some(([, , v]) => v === ID) ? [{ channel_session_id: "aaaaaaaa-0000-4000-8000-000000000009" }] : []),
        channel_sessions: [{ id: "aaaaaaaa-0000-4000-8000-000000000009" }],
      },
    });
    vi.mocked(createAdminClient).mockReturnValue(banco.db as never);
    const res = await acao("duplicar");
    expect((await res.json()).data).toEqual({ id: COPIA });
    const [insert] = chamadasDe(banco.chamadas, "campaigns", "insert");
    expect(insert!.dados).toMatchObject({ name: "Reativação Cópia", pipeline_id: "p", stage_id: "s", agent_id: "g", escale_pos_envio: { tags: ["x"] } });
    expect(chamadasDe(banco.chamadas, "campaign_channel_sessions", "insert")).toHaveLength(1);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.duplicated" }));
  });

  it("o nome da cópia cabe nos 80", () => {
    expect(nomeDaCopia("x".repeat(80))).toHaveLength(80);
    expect(nomeDaCopia("x".repeat(80)).endsWith(" Cópia")).toBe(true);
  });

  it("o hook da lista duplica pela rota do fork", () => {
    expect(caminhoDaAcao({ id: ID, acao: "duplicar" })).toEqual({ metodo: "post", url: `/api/v1/campanhas-da-casca/${ID}/duplicar` });
  });
});

describe("GET fora-da-lista", () => {
  it("devolve os motivos", async () => {
    vi.mocked(createClient).mockResolvedValue(
      bancoDeMentira({ rpc: { fn_escale_fora_da_lista: () => ({ data: [{ motivo: "duplicado", quantidade: 2 }], error: null }) } })
        .db as never,
    );
    const res = await foraDaListaRota(new NextRequest(`http://x/api/v1/campanhas-da-casca/${ID}/fora-da-lista`), {
      params: Promise.resolve({ id: ID }),
    });
    expect((await res.json()).data).toEqual([{ motivo: "duplicado", quantidade: 2 }]);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-assistente-acoes.test.ts`
Expected: FAIL.

- [ ] **Step 2: `lib/escale/campanhas/acoes-do-assistente.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { agendarAcao, iniciarAcao, prepararAcao, type CampanhaCarregada, type Desfecho } from "@/lib/campanhas/acoes";
import { gravarPool, lerPoolExtra } from "@/lib/campanhas/pool-de-numeros";

import { NOME_MAX, publicoSchema } from "./assistente";
import { publicoVazio } from "./publico";

/**
 * AS AÇÕES DO ASSISTENTE (fork Escale, Fase 8B; N14, N16, N17). Preparar e
 * enviar usam as ações do original (a máquina de estados, o compare-and-set e
 * os vetos são os mesmos); duplicar copia também o que a casca guarda.
 */
export interface MotivoFora {
  motivo: string;
  quantidade: number;
}
export interface ResumoDaPreparacao {
  total: number;
  elegiveis: number;
  excluidos: number;
  motivos: MotivoFora[];
}

export async function foraDaLista(db: SupabaseClient, org: string, id: string): Promise<MotivoFora[]> {
  const { data, error } = await db.rpc("fn_escale_fora_da_lista", { p_org: org, p_campanha: id });
  if (error) throw new Error(`fora da lista: ${error.message}`);
  return ((data ?? []) as Array<{ motivo: string; quantidade: number | string }>).map((m) => ({
    motivo: m.motivo,
    quantidade: Number(m.quantidade),
  }));
}

export async function prepararDoAssistente(
  admin: SupabaseClient,
  c: CampanhaCarregada,
  agora: Date,
): Promise<Desfecho<{ resumo: ResumoDaPreparacao }>> {
  const publico = publicoSchema.safeParse(c.escale_publico);
  if (!publico.success || publicoVazio(publico.data)) {
    return {
      ok: false,
      codigo: "campanha_sem_audiencia",
      mensagem: "Você deve selecionar pelo menos um contato.",
      status: 422,
    };
  }
  const r = await prepararAcao(admin, c, agora);
  if (!r.ok) return r;
  return { ok: true, resumo: { ...r.resumo, motivos: await foraDaLista(admin, c.organization_id, c.id) } };
}

export async function enviarDoAssistente(
  admin: SupabaseClient,
  c: CampanhaCarregada,
  agora: Date,
): Promise<Desfecho<{ modo: "iniciada" | "agendada"; quando: string | null }>> {
  if (c.status !== "ready") {
    return { ok: false, codigo: "campanha_estado_invalido", mensagem: "Prepare a campanha antes de enviar.", status: 409 };
  }
  if (c.escale_quando) {
    const quando = new Date(c.escale_quando);
    if (Number.isNaN(quando.getTime()) || quando.getTime() <= agora.getTime()) {
      return {
        ok: false,
        codigo: "campanha_agenda_invalida",
        mensagem: "A hora selecionada não pode ser menor que o horário atual.",
        status: 422,
      };
    }
    const r = await agendarAcao(admin, c, quando, agora);
    if (!r.ok) return r;
    return { ok: true, modo: "agendada", quando: quando.toISOString() };
  }
  const r = await iniciarAcao(admin, c, agora);
  if (!r.ok) return r;
  return { ok: true, modo: "iniciada", quando: null };
}

const SUFIXO_DA_COPIA = " Cópia";
export const nomeDaCopia = (nome: string): string =>
  `${nome.slice(0, NOME_MAX - SUFIXO_DA_COPIA.length).trimEnd()}${SUFIXO_DA_COPIA}`;

const COLUNAS_DA_COPIA =
  "name, description, channel_session_id, message_body, base_legal, lia_ref, audience_filter, " +
  "intervalo_segundos, janela_inicio_hora, janela_fim_hora, teto_diario, teto_horario, " +
  "pipeline_id, stage_id, agent_id, escale_mensagem, escale_publico, escale_pos_envio, escale_quando";

/** A cópia é uma intenção nova: nada de destinatário, resultado ou carimbo de execução. */
export async function duplicarDoAssistente(
  admin: SupabaseClient,
  c: CampanhaCarregada,
  autorId: string,
): Promise<Desfecho<{ id: string }>> {
  const { data: origem, error: erroOrigem } = await admin
    .from("campaigns")
    .select(COLUNAS_DA_COPIA)
    .eq("organization_id", c.organization_id)
    .eq("id", c.id)
    .maybeSingle();
  if (erroOrigem || !origem) {
    return { ok: false, codigo: "campanha_nao_encontrada", mensagem: "Campanha não encontrada.", status: 404 };
  }
  const linha = origem as Record<string, unknown> & { name: string; channel_session_id: string };
  const { data, error } = await admin
    .from("campaigns")
    .insert({ ...linha, organization_id: c.organization_id, name: nomeDaCopia(linha.name), created_by: autorId })
    .select("id")
    .single();
  if (error || !data) {
    return {
      ok: false,
      codigo: "campanha_estado_invalido",
      mensagem: "Não foi possível duplicar a campanha. Tente novamente.",
      status: 422,
    };
  }
  const id = (data as { id: string }).id;
  const extras = await lerPoolExtra(admin, c.organization_id, c.id);
  if (extras.length > 0) {
    await gravarPool(admin, { organizationId: c.organization_id, campanhaId: id, principal: linha.channel_session_id, extras });
  }
  return { ok: true, id };
}
```

- [ ] **Step 3: A rota de ações da 8A com as três novas**

Troque `app/api/v1/campanhas-da-casca/[id]/[acao]/route.ts` inteiro por:

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { carregarCampanha } from "@/lib/campanhas/acoes";
import { reagendarAcao, voltarAoRascunhoAcao } from "@/lib/escale/campanhas/acoes";
import { duplicarDoAssistente, enviarDoAssistente, prepararDoAssistente } from "@/lib/escale/campanhas/acoes-do-assistente";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ACOES = ["reagendar", "rascunho", "preparar", "enviar", "duplicar"] as const;
type Acao = (typeof ACOES)[number];
const reagendarSchema = z.object({ scheduled_at: z.string().datetime() });

/**
 * POST /api/v1/campanhas-da-casca/:id/:acao (fork Escale). Fase 8A: reagendar e
 * rascunho; Fase 8B: preparar, enviar e duplicar (o assistente). Gerente e
 * client admin, como as ações do original: `authenticated` só tem SELECT em
 * `campaigns` (0375). A organização vem do papel, nunca do corpo.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; acao: string }> }): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, acao: bruta } = await ctx.params;
  if (!(ACOES as readonly string[]).includes(bruta)) {
    return fail("not_found", t("Ação de campanha desconhecida."), 404, { requestId });
  }
  const acao = bruta as Acao;
  try {
    const admin = createAdminClient();
    const carregada = await carregarCampanha(admin, authz.org.orgId, id);
    if (!carregada.ok) return fail(carregada.codigo, t(carregada.mensagem), carregada.status, { requestId });
    const campanha = carregada.campanha;
    const base = { actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "campaign", resourceId: id, requestId } as const;
    const agora = new Date();

    switch (acao) {
      case "reagendar": {
        const lido = reagendarSchema.safeParse(await req.json().catch(() => null));
        if (!lido.success) return fail("validation_failed", t("Informe a nova data e hora do disparo."), 422, { requestId });
        const r = await reagendarAcao(admin, campanha, new Date(lido.data.scheduled_at), agora);
        if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
        void audit({ ...base, action: "campaign.rescheduled", metadata: { scheduled_at: r.scheduled_at } });
        return ok({ scheduled_at: r.scheduled_at }, { requestId });
      }
      case "rascunho": {
        const r = await voltarAoRascunhoAcao(admin, campanha);
        if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
        void audit({ ...base, action: "campaign.back_to_draft", metadata: { de: campanha.status } });
        return ok({ status: "draft" }, { requestId });
      }
      case "preparar": {
        const r = await prepararDoAssistente(admin, campanha, agora);
        if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
        void audit({
          ...base,
          action: "campaign.prepared",
          metadata: { total: r.resumo.total, elegiveis: r.resumo.elegiveis, excluidos: r.resumo.excluidos, via: "assistente" },
        });
        return ok({ resumo: r.resumo }, { requestId });
      }
      case "enviar": {
        const r = await enviarDoAssistente(admin, campanha, agora);
        if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
        void audit({
          ...base,
          action: r.modo === "agendada" ? "campaign.scheduled" : "campaign.started",
          metadata: { via: "assistente", ...(r.quando ? { scheduled_at: r.quando } : {}) },
        });
        return ok({ modo: r.modo, quando: r.quando }, { requestId });
      }
      case "duplicar": {
        const r = await duplicarDoAssistente(admin, campanha, authz.user.id);
        if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
        void audit({ ...base, action: "campaign.duplicated", metadata: { copia: r.id, via: "assistente" } });
        return ok({ id: r.id }, { requestId });
      }
    }
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

> Antes de colar, abra a versão da 8A (`git show escale-crm/main:"app/api/v1/campanhas-da-casca/[id]/[acao]/route.ts"`) e confira que os ramos `reagendar` e `rascunho` acima são os mesmos de lá (o texto acima é o do plano da 8A, Task 4 Step 4). Se a 8A mudou algo na execução, mantenha o que está na `main` nesses dois ramos.

- [ ] **Step 4: `app/api/v1/campanhas-da-casca/[id]/fora-da-lista/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { foraDaLista } from "@/lib/escale/campanhas/acoes-do-assistente";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/v1/campanhas-da-casca/:id/fora-da-lista — quantos ficaram fora, por motivo (fork Escale, Fase 8B; N14). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!UUID.test(id)) return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  try {
    return ok(await foraDaLista(await createClient(), authz.org.orgId, id), { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 5: O duplicar da lista da 8A pela rota do fork**

Em `hooks/escale/useCampanhasDaCasca.ts`, dentro do `switch (p.acao)` de `caminhoDaAcao`, logo antes do `default:`:

```ts
    // FORK ESCALE · Fase 8B (N17): a cópia leva também o que o assistente guarda.
    case "duplicar":
      return { metodo: "post", url: `/api/v1/campanhas-da-casca/${p.id}/duplicar` };
```

Se o teste da 8A (`tests/unit/escale-campanhas-hooks.test.tsx`) esperar a rota do original para `duplicar` (`grep -n "duplicar" tests/unit/escale-campanhas-hooks.test.tsx`), troque essa expectativa pela rota do fork.

- [ ] **Step 6: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-acoes.test.ts tests/unit/escale-campanhas-acoes.test.ts tests/unit/escale-campanhas-hooks.test.tsx && corepack pnpm prettier --write lib/escale/campanhas/acoes-do-assistente.ts "app/api/v1/campanhas-da-casca/[id]/fora-da-lista/route.ts" "app/api/v1/campanhas-da-casca/[id]/[acao]/route.ts" tests/unit/escale-assistente-acoes.test.ts && corepack pnpm eslint lib/escale/campanhas app/api/v1/campanhas-da-casca hooks/escale/useCampanhasDaCasca.ts && corepack pnpm typecheck`
Expected: PASS (os testes da 8A seguem verdes: os ramos `reagendar` e `rascunho` não mudaram).

- [ ] **Step 7: Commit**

```bash
git add lib/escale/campanhas/acoes-do-assistente.ts app/api/v1/campanhas-da-casca hooks/escale/useCampanhasDaCasca.ts tests/unit/escale-assistente-acoes.test.ts tests/unit/escale-campanhas-hooks.test.tsx
git commit -m "feat(escale): ações do assistente — preparar com os motivos, enviar ou agendar, duplicar tudo (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---


### Task 7: O pós-envio (tags, negócio, atendente e status para quem recebeu)

**Files:**
- Create: `lib/escale/campanhas/pos-envio.ts`, `lib/escale/campanhas/pos-envio-handler.ts`, `tests/unit/escale-assistente-pos-envio.test.ts`
- Modify: `lib/campanhas/rodada.ts` (pedir na conclusão), `lib/event-log/register-handlers.ts`, `tests/unit/dispatcher-org-parada.test.ts` (o consumidor novo na lista "roda")

**Interfaces:**
- Consumes: `posEnvioSchema`, `PosEnvio` (Task 1); `patchContactHandler` (`app/api/v1/contacts/_handler.ts`), `createLeadHandler` (`app/api/v1/leads/_handler.ts`); `normalizarTags` (`lib/contacts/tag-normalizada`); `nomeDoContato`; `ORIGEM_CAMPANHA` (`lib/campanhas/origem-do-lead.ts`); `camposParaEntrarEmEspera` (`lib/escale/conversas/espera.ts`); RPCs `emit_event`, `fn_conversation_assign`, `fn_service_status`; `EventRow`, `HandlerResult`, `EventHandler` (`lib/event-log/dispatcher.ts`).
- Produces: `EVENTO_DO_POS_ENVIO = "campanhas.pos_envio_requested"`, `CONSUMIDOR_DO_POS_ENVIO = "escale-pos-envio-da-campanha.v1"`, `temAlgoParaFazer(p)`, `pedirPosEnvio(admin, campanhaId, org): Promise<void>` (nunca lança), `DependenciasDoPosEnvio`, `processarPosEnvio(row, deps): Promise<HandlerResult>`, `posEnvioHandler: EventHandler`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-assistente-pos-envio.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EventRow } from "@/lib/event-log/dispatcher";
import { POS_ENVIO_PADRAO, type PosEnvio } from "@/lib/escale/campanhas/assistente";
import {
  EVENTO_DO_POS_ENVIO,
  pedirPosEnvio,
  processarPosEnvio,
  temAlgoParaFazer,
  type DependenciasDoPosEnvio,
} from "@/lib/escale/campanhas/pos-envio";
import { bancoDeMentira, chamadasDe } from "@/tests/helpers/banco-de-mentira";
import { ORG_ID } from "@/tests/helpers/stages-db-double";

const CAMPANHA = "dddddddd-0000-4000-8000-000000000001";
const C1 = "bbbbbbbb-0000-4000-8000-000000000001";
const CONV = "ffffffff-0000-4000-8000-000000000001";
const ORIGEM = "cccccccc-0000-4000-8000-000000000001";
const ETAPA = "cccccccc-0000-4000-8000-000000000002";
const DONO = "11111111-1111-4111-8111-111111111112";
const ATENDENTE = "11111111-1111-4111-8111-111111111113";
const CRIADOR = "11111111-1111-4111-8111-111111111111";

const linha = (): EventRow =>
  ({
    id: "ev-1",
    organization_id: ORG_ID,
    event_type: EVENTO_DO_POS_ENVIO,
    entity_kind: "campaign",
    entity_id: CAMPANHA,
    payload: { campaign_id: CAMPANHA },
    metadata: {},
    consumed_by: [],
    attempts: 0,
  }) as EventRow;

function cenario(pos: PosEnvio, extra: { conversa?: Record<string, unknown>; negocioAberto?: boolean } = {}) {
  let marcados = false;
  const banco = bancoDeMentira({
    tabelas: {
      campaigns: [
        {
          id: CAMPANHA,
          name: "Reativação",
          status: "completed",
          created_by: CRIADOR,
          started_at: "2026-11-20T10:00:00.000Z",
          escale_pos_envio: pos,
          escale_pos_envio_feito_em: null,
        },
      ],
      campaign_recipients: (c) => {
        if (c.op === "update") {
          marcados = true;
          return [{ id: "r1" }];
        }
        return marcados ? [] : [{ id: "r1", contact_id: C1, conversation_id: CONV }];
      },
      contacts: [{ id: C1, name: "Ana", display_name: null, phone_number: "+5511999990001", tags: ["antiga"] }],
      conversations: [
        { id: CONV, status: "open", assigned_to_user_id: null, created_at: "2026-11-20T10:05:00.000Z", metadata: {}, ...extra.conversa },
      ],
      crm_leads: extra.negocioAberto ? [{ id: "lead-velho", owner_user_id: DONO }] : [],
    },
  });
  const deps: DependenciasDoPosEnvio = {
    db: banco.db as never,
    agora: () => 0,
    mudarContato: vi.fn().mockResolvedValue({}),
    criarNegocio: vi.fn().mockResolvedValue({ id: "lead-novo", owner_user_id: DONO }),
  };
  return { banco, deps };
}

beforeEach(() => vi.clearAllMocks());

describe("temAlgoParaFazer", () => {
  it("o padrão (só 'Em aberto') não pede pós-envio", () => {
    expect(temAlgoParaFazer(POS_ENVIO_PADRAO)).toBe(false);
    expect(temAlgoParaFazer({ ...POS_ENVIO_PADRAO, tags: ["x"] })).toBe(true);
    expect(temAlgoParaFazer({ ...POS_ENVIO_PADRAO, statusDaConversa: "fechada" })).toBe(true);
  });
});

describe("pedirPosEnvio", () => {
  it("emite o evento uma vez quando há o que fazer; não emite no padrão", async () => {
    const com = bancoDeMentira({ tabelas: { campaigns: [{ escale_pos_envio: { ...POS_ENVIO_PADRAO, tags: ["x"] } }] } });
    await pedirPosEnvio(com.db as never, CAMPANHA, ORG_ID);
    expect(com.rpcs).toEqual([
      expect.objectContaining({ nome: "emit_event", args: expect.objectContaining({ p_event_type: EVENTO_DO_POS_ENVIO, p_entity_id: CAMPANHA }) }),
    ]);
    const sem = bancoDeMentira({ tabelas: { campaigns: [{ escale_pos_envio: POS_ENVIO_PADRAO }] } });
    await pedirPosEnvio(sem.db as never, CAMPANHA, ORG_ID);
    expect(sem.rpcs).toEqual([]);
  });
});

describe("processarPosEnvio", () => {
  it("tag pelo caminho do contato (emite contact.tag_added), sem repetir as que já tem", async () => {
    const { deps } = cenario({ ...POS_ENVIO_PADRAO, tags: ["antiga", "Reativados"] });
    expect((await processarPosEnvio(linha(), deps)).status).toBe("ok");
    expect(deps.mudarContato).toHaveBeenCalledWith(
      expect.objectContaining({ actor: { type: "webhook_source", id: `campaign:${CAMPANHA}` } }),
      C1,
      { tags: ["antiga", "reativados"] },
    );
    const ctx = vi.mocked(deps.mudarContato).mock.calls[0]![0];
    expect(ctx.requestId.startsWith("rule:")).toBe(false);
  });

  it("negócio na origem com fonte 'campanha', só para quem não tem um aberto nela", async () => {
    const pos = { ...POS_ENVIO_PADRAO, origemId: ORIGEM, etapaId: ETAPA };
    const novo = cenario(pos);
    await processarPosEnvio(linha(), novo.deps);
    expect(novo.deps.criarNegocio).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        pipeline_id: ORIGEM,
        stage_id: ETAPA,
        contact_id: C1,
        source: "campanha",
        source_metadata: { campaign_id: CAMPANHA, campaign_name: "Reativação" },
      }),
    );
    const ja = cenario(pos, { negocioAberto: true });
    await processarPosEnvio(linha(), ja.deps);
    expect(ja.deps.criarNegocio).not.toHaveBeenCalled();
  });

  it("atendente: o dono do negócio quando pedido; senão o escolhido; 'routing'", async () => {
    const { banco, deps } = cenario({ ...POS_ENVIO_PADRAO, origemId: ORIGEM, etapaId: ETAPA, donoDoNegocio: true, atendenteId: ATENDENTE });
    await processarPosEnvio(linha(), deps);
    expect(banco.rpcs).toContainEqual({
      nome: "fn_conversation_assign",
      args: { p_organization_id: ORG_ID, p_conversation_id: CONV, p_to_user_id: DONO, p_reason: "routing" },
    });
  });

  it("'manter o mesmo atendente' não mexe em atendimento existente que já tem atendente", async () => {
    const { banco, deps } = cenario(
      { ...POS_ENVIO_PADRAO, atendenteId: ATENDENTE, manterAtendente: true },
      { conversa: { assigned_to_user_id: DONO, created_at: "2026-11-01T00:00:00.000Z" } },
    );
    await processarPosEnvio(linha(), deps);
    expect(banco.rpcs.find((r) => r.nome === "fn_conversation_assign")).toBeUndefined();
  });

  it("status: fechar pelo serviço; em espera com o criador; 'manter' respeita o existente", async () => {
    const fechar = cenario({ ...POS_ENVIO_PADRAO, statusDaConversa: "fechada" });
    await processarPosEnvio(linha(), fechar.deps);
    expect(fechar.banco.rpcs).toContainEqual({
      nome: "fn_service_status",
      args: { p_org: ORG_ID, p_conversation: CONV, p_status: "closed" },
    });

    const espera = cenario({ ...POS_ENVIO_PADRAO, statusDaConversa: "em_espera" });
    await processarPosEnvio(linha(), espera.deps);
    const [update] = chamadasDe(espera.banco.chamadas, "conversations", "update");
    expect(update!.dados).toMatchObject({ snoozed_by_user_id: CRIADOR });

    const manter = cenario(
      { ...POS_ENVIO_PADRAO, statusDaConversa: "fechada", manterStatus: true },
      { conversa: { created_at: "2026-11-01T00:00:00.000Z" } },
    );
    await processarPosEnvio(linha(), manter.deps);
    expect(manter.banco.rpcs.find((r) => r.nome === "fn_service_status")).toBeUndefined();
  });

  it("marca o destinatário ANTES de agir e fecha a campanha no fim", async () => {
    const { banco, deps } = cenario({ ...POS_ENVIO_PADRAO, tags: ["x"] });
    await processarPosEnvio(linha(), deps);
    const updates = chamadasDe(banco.chamadas, "campaign_recipients", "update");
    expect(updates[0]!.dados).toHaveProperty("escale_pos_envio_em");
    expect(updates[0]!.filtros).toContainEqual(["is", "escale_pos_envio_em", null]);
    const [fim] = chamadasDe(banco.chamadas, "campaigns", "update");
    expect(fim!.dados).toHaveProperty("escale_pos_envio_feito_em");
  });

  it("campanha que não concluiu ou já foi tratada é pulada", async () => {
    const { deps } = cenario({ ...POS_ENVIO_PADRAO, tags: ["x"] });
    const banco = bancoDeMentira({ tabelas: { campaigns: [{ id: CAMPANHA, status: "cancelled", escale_pos_envio: { tags: ["x"] } }] } });
    expect((await processarPosEnvio(linha(), { ...deps, db: banco.db as never })).status).toBe("skipped");
  });

  it("orçamento estourado pede para voltar depois", async () => {
    const { deps } = cenario({ ...POS_ENVIO_PADRAO, tags: ["x"] });
    let t = 0;
    const r = await processarPosEnvio(linha(), { ...deps, agora: () => (t += 30_000) });
    expect(r.status).toBe("retry");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-assistente-pos-envio.test.ts`
Expected: FAIL.

- [ ] **Step 2: `lib/escale/campanhas/pos-envio.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { HandlerCtx } from "@/lib/api/handlers/types";
import { ORIGEM_CAMPANHA } from "@/lib/campanhas/origem-do-lead";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { camposParaEntrarEmEspera } from "@/lib/escale/conversas/espera";
import type { EventRow, HandlerResult } from "@/lib/event-log/dispatcher";
import { logger } from "@/lib/logger";

import { TAGS_DO_POS_ENVIO_MAX, posEnvioSchema, type PosEnvio } from "./assistente";

/**
 * O PÓS-ENVIO (fork Escale, Fase 8B; PRD B14; N12, N13). Na conclusão, a rodada
 * pede (um evento só); este consumidor anda em lotes com orçamento, MARCA cada
 * destinatário antes de agir (no máximo uma vez) e aplica, nesta ordem: tags
 * (pelo handler do contato, que emite `contact.tag_added` e acorda as
 * automações), negócio (pelo handler de negócio, com ator que não é pessoa: a
 * distribuição de dono da 1K roda), atendente e status da conversa.
 * "Em aberto" (o padrão) não mexe: o envio já abriu o atendimento.
 */
export const EVENTO_DO_POS_ENVIO = "campanhas.pos_envio_requested";
export const CONSUMIDOR_DO_POS_ENVIO = "escale-pos-envio-da-campanha.v1";
const LOTE = 100;
const ORCAMENTO_MS = 20_000;
const TAGS_DO_CONTATO_MAX = 20;

export const temAlgoParaFazer = (p: PosEnvio): boolean =>
  p.tags.length > 0 || p.origemId !== null || p.statusDaConversa !== "aberta" || p.atendenteId !== null || p.donoDoNegocio;

/** Chamada pela rodada quando a campanha conclui. Nunca lança: a rodada não pode cair por isto. */
export async function pedirPosEnvio(admin: SupabaseClient, campanhaId: string, org: string): Promise<void> {
  try {
    const { data } = await admin
      .from("campaigns")
      .select("escale_pos_envio")
      .eq("organization_id", org)
      .eq("id", campanhaId)
      .maybeSingle();
    const pos = posEnvioSchema.safeParse((data as { escale_pos_envio?: unknown } | null)?.escale_pos_envio);
    if (!pos.success || !temAlgoParaFazer(pos.data)) return;
    const { error } = await admin.rpc("emit_event", {
      p_event_type: EVENTO_DO_POS_ENVIO,
      p_entity_kind: "campaign",
      p_entity_id: campanhaId,
      p_payload: { campaign_id: campanhaId },
      p_metadata: {},
      p_organization_id: org,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    logger.warn("[campanha] pedido do pós-envio falhou", { campanha: campanhaId, motivo: (err as Error).message });
  }
}

export interface DependenciasDoPosEnvio {
  db: SupabaseClient;
  agora: () => number;
  mudarContato: (ctx: HandlerCtx, id: string, input: { tags: string[] }) => Promise<unknown>;
  criarNegocio: (ctx: HandlerCtx, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

type Campanha = {
  id: string;
  name: string;
  status: string;
  created_by: string | null;
  started_at: string | null;
  escale_pos_envio: unknown;
  escale_pos_envio_feito_em: string | null;
};
type Destinatario = { id: string; contact_id: string; conversation_id: string | null };
type Contato = { id: string; name: string | null; display_name: string | null; phone_number: string | null; tags: string[] | null };
type Conversa = { id: string; status: string; assigned_to_user_id: string | null; created_at: string; metadata: Record<string, unknown> | null };

const resultado = (status: HandlerResult["status"], detail?: string, retry_at?: string): HandlerResult => ({
  consumer_key: CONSUMIDOR_DO_POS_ENVIO,
  status,
  ...(detail ? { detail } : {}),
  ...(retry_at ? { retry_at } : {}),
});

export async function processarPosEnvio(row: EventRow, deps: DependenciasDoPosEnvio): Promise<HandlerResult> {
  const org = row.organization_id;
  const campanhaId = String((row.payload as { campaign_id?: unknown }).campaign_id ?? row.entity_id ?? "");
  const { data } = await deps.db
    .from("campaigns")
    .select("id, name, status, created_by, started_at, escale_pos_envio, escale_pos_envio_feito_em")
    .eq("organization_id", org)
    .eq("id", campanhaId)
    .maybeSingle();
  const campanha = data as Campanha | null;
  if (!campanha || campanha.status !== "completed") return resultado("skipped", "campanha_nao_concluida");
  if (campanha.escale_pos_envio_feito_em) return resultado("skipped", "ja_feito");
  const lido = posEnvioSchema.safeParse(campanha.escale_pos_envio);
  if (!lido.success) return resultado("error", "pos_envio_invalido");
  const pos = lido.data;
  const ctx: HandlerCtx = {
    organization_id: org,
    actor: { type: "webhook_source", id: `campaign:${campanha.id}` },
    // Nunca `rule:…`: o motor de automações ignora evento com esse prefixo.
    requestId: `campaign-pos-envio:${campanha.id}`,
  };

  const inicio = deps.agora();
  let falhas = 0;
  while (deps.agora() - inicio < ORCAMENTO_MS) {
    const { data: fila, error } = await deps.db
      .from("campaign_recipients")
      .select("id, contact_id, conversation_id")
      .eq("organization_id", org)
      .eq("campaign_id", campanha.id)
      .not("sent_at", "is", null)
      .is("escale_pos_envio_em", null)
      .order("created_at", { ascending: true })
      .limit(LOTE);
    if (error) throw new Error(error.message);
    const lote = (fila ?? []) as Destinatario[];
    if (lote.length === 0) {
      await deps.db
        .from("campaigns")
        .update({ escale_pos_envio_feito_em: new Date().toISOString() })
        .eq("organization_id", org)
        .eq("id", campanha.id);
      return resultado("ok", falhas > 0 ? `falhas:${falhas}` : undefined);
    }
    // Marca ANTES de agir: um item roda no máximo uma vez, mesmo com retry.
    const { data: marcados, error: erroMarca } = await deps.db
      .from("campaign_recipients")
      .update({ escale_pos_envio_em: new Date().toISOString() })
      .eq("organization_id", org)
      .in(
        "id",
        lote.map((d) => d.id),
      )
      .is("escale_pos_envio_em", null)
      .select("id");
    if (erroMarca) throw new Error(erroMarca.message);
    const meus = new Set(((marcados ?? []) as Array<{ id: string }>).map((m) => m.id));
    const [contatos, conversas] = await Promise.all([
      lerContatos(deps.db, org, lote.map((d) => d.contact_id)),
      lerConversas(deps.db, org, lote.flatMap((d) => (d.conversation_id ? [d.conversation_id] : []))),
    ]);
    for (const d of lote) {
      if (!meus.has(d.id)) continue;
      try {
        await aplicar(d, contatos.get(d.contact_id), d.conversation_id ? conversas.get(d.conversation_id) : undefined, pos, campanha, ctx, deps);
      } catch (err) {
        falhas++;
        logger.warn("[campanha] pós-envio falhou para um destinatário", { campanha: campanha.id, destinatario: d.id, motivo: (err as Error).message });
      }
    }
  }
  return resultado("retry", "orcamento", new Date(Date.now() + 1000).toISOString());
}

async function lerContatos(db: SupabaseClient, org: string, ids: string[]): Promise<Map<string, Contato>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db
    .from("contacts")
    .select("id, name, display_name, phone_number, tags")
    .eq("organization_id", org)
    .in("id", ids);
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as Contato[]).map((c) => [c.id, c]));
}

async function lerConversas(db: SupabaseClient, org: string, ids: string[]): Promise<Map<string, Conversa>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await db
    .from("conversations")
    .select("id, status, assigned_to_user_id, created_at, metadata")
    .eq("organization_id", org)
    .in("id", ids);
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as Conversa[]).map((c) => [c.id, c]));
}

async function aplicar(
  d: Destinatario,
  contato: Contato | undefined,
  conversa: Conversa | undefined,
  pos: PosEnvio,
  campanha: Campanha,
  ctx: HandlerCtx,
  deps: DependenciasDoPosEnvio,
): Promise<void> {
  const org = ctx.organization_id;
  // 1. Tags: pelo handler do contato (emite `contact.tag_added` só com as novas).
  if (pos.tags.length > 0 && contato) {
    const atuais = normalizarTags(contato.tags ?? []);
    const novas = normalizarTags(pos.tags)
      .filter((t) => !atuais.includes(t))
      .slice(0, Math.max(0, TAGS_DO_CONTATO_MAX - atuais.length))
      .slice(0, TAGS_DO_POS_ENVIO_MAX);
    if (novas.length > 0) await deps.mudarContato(ctx, d.contact_id, { tags: [...atuais, ...novas] });
  }

  // 2. Negócio: na origem, para quem ainda não tem um aberto nela (N12).
  let dono: string | null = null;
  if (pos.origemId && pos.etapaId) {
    const { data: aberto } = await deps.db
      .from("crm_leads")
      .select("id, owner_user_id")
      .eq("organization_id", org)
      .eq("contact_id", d.contact_id)
      .eq("pipeline_id", pos.origemId)
      .eq("status", "open")
      .limit(1);
    const existente = ((aberto ?? []) as Array<{ owner_user_id: string | null }>)[0];
    if (existente) {
      dono = existente.owner_user_id;
    } else {
      const nome = contato ? nomeDoContato({ name: contato.name, display_name: contato.display_name, phone_number: contato.phone_number }) : null;
      const negocio = await deps.criarNegocio(ctx, {
        pipeline_id: pos.origemId,
        stage_id: pos.etapaId,
        title: nome && nome.trim().length >= 2 ? nome.trim().slice(0, 200) : "Novo negócio",
        contact_id: d.contact_id,
        tags: [],
        source: ORIGEM_CAMPANHA,
        source_metadata: { campaign_id: campanha.id, campaign_name: campanha.name },
      });
      dono = (negocio.owner_user_id as string | null | undefined) ?? null;
    }
  }

  if (!conversa) return;
  const existente = campanha.started_at !== null && conversa.created_at < campanha.started_at;

  // 3. Atendente: o dono do negócio quando pedido, senão o escolhido.
  const alvo = (pos.donoDoNegocio ? dono : null) ?? pos.atendenteId;
  const manter = pos.manterAtendente && existente && conversa.assigned_to_user_id !== null;
  if (alvo && !manter && conversa.assigned_to_user_id !== alvo) {
    const { error } = await deps.db.rpc("fn_conversation_assign", {
      p_organization_id: org,
      p_conversation_id: conversa.id,
      p_to_user_id: alvo,
      p_reason: "routing",
    });
    if (error) throw new Error(`atendente: ${error.message}`);
  }

  // 4. Status da conversa.
  if (pos.statusDaConversa === "aberta" || (pos.manterStatus && existente)) return;
  if (pos.statusDaConversa === "fechada") {
    const { error } = await deps.db.rpc("fn_service_status", { p_org: org, p_conversation: conversa.id, p_status: "closed" });
    if (error) throw new Error(`status: ${error.message}`);
    return;
  }
  if (!campanha.created_by) return;
  const { error } = await deps.db
    .from("conversations")
    .update(camposParaEntrarEmEspera(campanha.created_by, new Date(), conversa.metadata ?? {}))
    .eq("organization_id", org)
    .eq("id", conversa.id);
  if (error) throw new Error(`em espera: ${error.message}`);
}
```

> `camposParaEntrarEmEspera(userId, agora, metadata)` recebe `Meta` (o tipo de `lib/escale/conversas/espera.ts`); se o typecheck reclamar do `Record<string, unknown>`, faça o cast para o tipo exportado de lá (`Parameters<typeof camposParaEntrarEmEspera>[2]`).

- [ ] **Step 3: `lib/escale/campanhas/pos-envio-handler.ts`**

```ts
import { patchContactHandler } from "@/app/api/v1/contacts/_handler";
import { createLeadHandler } from "@/app/api/v1/leads/_handler";
import type { EventHandler } from "@/lib/event-log/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";

import { CONSUMIDOR_DO_POS_ENVIO, EVENTO_DO_POS_ENVIO, processarPosEnvio } from "./pos-envio";

/**
 * Consumidor do `event_log` do pós-envio da campanha (fork Escale, Fase 8B).
 * "roda" na organização parada, como as ações em massa da 2B: escrita interna
 * pedida pela própria organização, sem custo e sem sair para fora.
 */
export const posEnvioHandler: EventHandler = {
  key: CONSUMIDOR_DO_POS_ENVIO,
  naOrgParada: "roda",
  events: [EVENTO_DO_POS_ENVIO],
  async handle(row) {
    const db = createAdminClient();
    return processarPosEnvio(row, {
      db,
      agora: () => Date.now(),
      mudarContato: (ctx, id, input) => patchContactHandler(db, ctx, id, input),
      criarNegocio: (ctx, input) => createLeadHandler(db, ctx, input as Parameters<typeof createLeadHandler>[2]),
    });
  },
};
```

- [ ] **Step 4: Registrar, a cerca da org parada e o pedido na rodada**

1. Em `lib/event-log/register-handlers.ts`: no import, junto do `acaoEmMassaHandler`, `import { posEnvioHandler } from "@/lib/escale/campanhas/pos-envio-handler";`; e logo depois de `registerHandler(importacaoHandler);`:

```ts
  // FORK ESCALE · Fase 8B: o pós-envio da campanha (tags, negócio, atendente e status para quem recebeu).
  registerHandler(posEnvioHandler);
```

2. Em `tests/unit/dispatcher-org-parada.test.ts`: o import `import { posEnvioHandler } from "@/lib/escale/campanhas/pos-envio-handler";` e `posEnvioHandler,` na lista `RODA`, logo depois de `importacaoHandler,`.

3. Em `lib/campanhas/rodada.ts`: o import `import { pedirPosEnvio } from "@/lib/escale/campanhas/pos-envio";` (no bloco do fork da Task 5) e, em `rodarUmaCampanha`, logo depois do `update` que muda para `completed` (antes do `return { enviadas: 0, … concluidas: (data ?? []).length, … }`):

```ts
    // FORK ESCALE · Fase 8B: só quem fechou a campanha (o compare-and-set) pede o pós-envio, uma vez.
    if ((data ?? []).length > 0) await pedirPosEnvio(admin, campanha.id, campanha.organization_id);
```

- [ ] **Step 5: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-pos-envio.test.ts tests/unit/dispatcher-org-parada.test.ts lib/campanhas && corepack pnpm prettier --write lib/escale/campanhas/pos-envio.ts lib/escale/campanhas/pos-envio-handler.ts tests/unit/escale-assistente-pos-envio.test.ts && corepack pnpm eslint lib/escale/campanhas lib/event-log/register-handlers.ts lib/campanhas/rodada.ts && corepack pnpm typecheck`
Expected: PASS. Guardas do `register-handlers` (`grep -rlF "register-handlers" tests/unit --include='*.test.ts' | xargs -r corepack pnpm vitest run`).

- [ ] **Step 6: Commit**

```bash
git add lib/escale/campanhas/pos-envio.ts lib/escale/campanhas/pos-envio-handler.ts lib/event-log/register-handlers.ts lib/campanhas/rodada.ts tests/unit/escale-assistente-pos-envio.test.ts tests/unit/dispatcher-org-parada.test.ts
git commit -m "feat(escale): pós-envio da campanha — tags, negócio, atendente e status para quem recebeu (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 8: Gates do PR A e o PR

- [ ] **Step 1: Os gates (sem `test:db` e sem a rodada cheia)**

```bash
corepack pnpm vitest run tests/unit/manifest-x-migrations.test.ts tests/unit/campanha-escreve-como-servidor.test.ts tests/unit/dispatcher-org-parada.test.ts $(ls tests/unit | grep -E "varredura|definer|hardening|manifest|vocabulario-banco" | sed 's#^#tests/unit/#')
corepack pnpm vitest run $(git diff --name-only escale-crm/main...HEAD | grep -E "\.test\.tsx?$" | grep -v "^tests/invariants") lib/campanhas
corepack pnpm typecheck && corepack pnpm eslint $(git diff --name-only escale-crm/main...HEAD | grep -E "\.(ts|tsx)$") && corepack pnpm lint:channels
```

Expected: tudo PASS. O `vocabulario-banco-x-typescript` mora em `tests/invariants` (roda na bateria).

- [ ] **Step 2: O PR A**

```bash
git fetch escale-crm --quiet && git rebase escale-crm/main
git push -u escale-crm feat/fase-8b-motor-do-assistente
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-8b-motor-do-assistente \
  --title "feat(escale): Fase 8B (PR A) — o motor do assistente de campanha" \
  --body "$(cat <<'EOF'
## O que entra
- Migration 9302: `escale_mensagem`, `escale_publico`, `escale_pos_envio`, `escale_quando` e `escale_pos_envio_feito_em` em `campaigns`; `escale_pos_envio_em`, `escale_numero_oficial` e `escale_categoria_do_modelo` em `campaign_recipients`; as funções invoker `fn_escale_contatos_do_publico`, `fn_escale_pagina_do_publico` e `fn_escale_fora_da_lista`.
- Rotas do fork: criar/salvar/ler o rascunho do assistente, os números (oficial pela capacidade do canal), a página do público, os contatos de uma importação, preparar (com os motivos), enviar (iniciar ou agendar) e duplicar (copia tudo, " Cópia").
- Motor do original (com `FORK ESCALE · Fase 8B`): prepara o público da casca (ids ou o filtro de Contatos, sem teto), congela os valores do modelo da Meta, manda `type: "template"` no número oficial (rodada e teste), grava o custo preparado e pede o pós-envio na conclusão. Campanha do formulário antigo segue igual.
- Pós-envio pelo `event_log`: tags (emite `contact.tag_added`), negócio na origem (fonte "campanha", distribuição de dono da 1K), atendente e status da conversa, só para quem recebeu, uma vez.

## Verificação
- Testes da fase, typecheck, eslint, `lint:channels` e as cercas.
- `test:db` (inclui `tests/invariants/escale-assistente-9302.test.ts`), `test:db:update`, rodada cheia, revisor e conferência visual: na bateria do fim da Frente B.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --repo rgisjr/escale-crm --merge --delete-branch=false
```

Expected: o PR A mergeado. **Nada de tag, release nem VPS.**

---


# PR B — as telas do assistente (Tasks 9–16)

**Antes da Task 9:** o PR A mergeado. `git fetch escale-crm --quiet && git switch -c feat/fase-8b-telas-do-assistente escale-crm/main` e `git log --oneline -1 escale-crm/main` mostra o merge do PR A.

### Task 9: As peças de molde, a prévia do celular e as cores

**Abra antes:** 018, 019, 021, 025, 044 (tabela "Referência visual").

**Files:**
- Create: `components/escale/campanhas/molde/estilos.ts`, `TrilhaDoAssistente.tsx`, `BarraDePassos.tsx`, `RodapeDoAssistente.tsx`, `MoldeDoAssistente.tsx`, `SeletorDeNumero.tsx`, `CartaoDeEscolha.tsx`, `CampoComContador.tsx`, `ResumoDoEnvio.tsx` (todos em `components/escale/campanhas/molde/`), `components/escale/campanhas/assistente/PreviaDoCelular.tsx`, `lib/escale/campanhas/previa.ts`, `tests/unit/escale-assistente-molde.test.tsx`
- Modify: `app/escale-tema.css` (bloco da 8B no fim), `lib/ui/icons-da-casca.ts` (`Signal`, `Wifi`, `BatteryMedium`, `Video`)

**Interfaces (Produces; combinadas com a 8D — não mude as props sem avisar a sessão da 8D):**
- `TrilhaDoAssistente({ itens: ReadonlyArray<{ rotulo: string; href?: string }> })`
- `BarraDePassos({ passos: readonly string[]; atual: number })` (0-based)
- `RodapeDoAssistente({ aoVoltar?: () => void; rotuloVoltar?: string; extras?: ReactNode; principal: { rotulo: string; aoClicar: () => void; carregando?: boolean; desabilitado?: boolean; icone?: ReactNode } })`
- `MoldeDoAssistente({ trilha: ReactNode; passos: readonly string[]; atual: number; rodape: ReactNode; children: ReactNode; lateral?: ReactNode })`
- `SeletorDeNumero({ numeros: ReadonlyArray<NumeroDoSeletor>; valor: string | null; aoMudar: (id: string) => void; placeholder?: string })`, `NumeroDoSeletor { id; nome; telefone: string | null; conectado: boolean; grupo: string; avatarUrl?: string | null; setor?: string | null }`
- `CartaoDeEscolha({ selecionado: boolean; aoEscolher: () => void; titulo: string; descricao: string; icone?: ReactNode })`
- `CampoComContador({ rotulo: string; valor: string; aoMudar: (v: string) => void; maximo: number; placeholder?: string; erro?: string | null; id?: string })`
- `ResumoDoEnvio({ linhas: ReadonlyArray<{ icone: ReactNode; rotulo: string; valor: ReactNode }>; rodape?: ReactNode })`
- `estilos.ts`: `BOTAO_CONTORNADO`, `BOTAO_DA_MARCA`, `CAMPO`, `ROTULO`, `TITULO_DO_PASSO`, `SUBTITULO_DO_PASSO`.
- `previa.ts`: `ParteDaPrevia = { tipo: "texto"; texto: string } | { tipo: "variavel"; rotulo: string }`, `CampoPersonalizado { campo: string; rotulo: string }`, `rotuloDoCampo(campo, personalizados): string`, `partesDoTexto(texto, personalizados): ParteDaPrevia[]`, `partesDoModelo(m: MensagemDeModelo, personalizados): ParteDaPrevia[]`, `partesDaMensagem(m: MensagemDaCampanha, personalizados): ParteDaPrevia[] | null`.
- `PreviaDoCelular({ dispositivo: string | null; partes: readonly ParteDaPrevia[] | null; vazio: string })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-assistente-molde.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PreviaDoCelular } from "@/components/escale/campanhas/assistente/PreviaDoCelular";
import { BarraDePassos } from "@/components/escale/campanhas/molde/BarraDePassos";
import { CampoComContador } from "@/components/escale/campanhas/molde/CampoComContador";
import { CartaoDeEscolha } from "@/components/escale/campanhas/molde/CartaoDeEscolha";
import { MoldeDoAssistente } from "@/components/escale/campanhas/molde/MoldeDoAssistente";
import { ResumoDoEnvio } from "@/components/escale/campanhas/molde/ResumoDoEnvio";
import { RodapeDoAssistente } from "@/components/escale/campanhas/molde/RodapeDoAssistente";
import { SeletorDeNumero } from "@/components/escale/campanhas/molde/SeletorDeNumero";
import { TrilhaDoAssistente } from "@/components/escale/campanhas/molde/TrilhaDoAssistente";
import { partesDoModelo, partesDoTexto, rotuloDoCampo } from "@/lib/escale/campanhas/previa";

describe("TrilhaDoAssistente e BarraDePassos", () => {
  it("a trilha liga os anteriores e marca o último como a página", () => {
    render(<TrilhaDoAssistente itens={[{ rotulo: "Campanhas", href: "/app/campaigns" }, { rotulo: "WhatsApp", href: "/app/campaigns" }, { rotulo: "Nova campanha" }]} />);
    expect(screen.getByRole("link", { name: "Campanhas" })).toHaveAttribute("href", "/app/campaigns");
    expect(screen.getByText("Nova campanha")).toHaveAttribute("aria-current", "page");
  });

  it("a barra mostra o feito com check, o atual cheio e o futuro numerado", () => {
    render(<BarraDePassos passos={["Um", "Dois", "Três"]} atual={1} />);
    const passos = screen.getAllByRole("listitem");
    expect(passos[0]!.querySelector("svg")).not.toBeNull();
    expect(passos[1]).toHaveAttribute("aria-current", "step");
    expect(within(passos[2]!).getByText("3")).toBeInTheDocument();
  });
});

describe("RodapeDoAssistente e MoldeDoAssistente", () => {
  it("Voltar, os extras e o principal (que trava enquanto carrega)", async () => {
    const voltar = vi.fn();
    const proximo = vi.fn();
    const { rerender } = render(
      <RodapeDoAssistente aoVoltar={voltar} extras={<button type="button">Salvar como rascunho</button>} principal={{ rotulo: "Próximo", aoClicar: proximo }} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(voltar).toHaveBeenCalledOnce();
    expect(proximo).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Salvar como rascunho" })).toBeInTheDocument();
    rerender(<RodapeDoAssistente principal={{ rotulo: "Próximo", aoClicar: proximo, carregando: true }} />);
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
  });

  it("o molde junta trilha, passos, conteúdo, lateral e rodapé", () => {
    render(
      <MoldeDoAssistente trilha={<nav>trilha</nav>} passos={["A", "B"]} atual={0} rodape={<footer>rodapé</footer>} lateral={<p>celular</p>}>
        <p>conteúdo</p>
      </MoldeDoAssistente>,
    );
    for (const texto of ["trilha", "conteúdo", "celular", "rodapé"]) expect(screen.getByText(texto)).toBeInTheDocument();
  });
});

describe("SeletorDeNumero", () => {
  const numeros = [
    { id: "n1", nome: "Bathully - Oficial", telefone: "+551153043062", conectado: true, grupo: "WhatsApp Oficial", setor: "Atendimento" },
    { id: "n2", nome: "Naiara", telefone: "+5516999653041", conectado: true, grupo: "WhatsApp não oficial", setor: null },
  ];

  it("abre agrupado, com telefone e setor, e escolhe", async () => {
    const aoMudar = vi.fn();
    render(<SeletorDeNumero numeros={numeros} valor={null} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("button", { name: /Selecionar conta/ }));
    expect(screen.getByRole("group", { name: "WhatsApp Oficial" })).toBeInTheDocument();
    expect(screen.getByText("(11) 5304-3062 · Atendimento")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: /Naiara/ }));
    expect(aoMudar).toHaveBeenCalledWith("n2");
  });

  it("sem números, o vazio da Clint", async () => {
    render(<SeletorDeNumero numeros={[]} valor={null} aoMudar={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Selecionar conta/ }));
    expect(screen.getByText("Nenhum dispositivo disponível")).toBeInTheDocument();
  });
});

describe("CartaoDeEscolha, CampoComContador e ResumoDoEnvio", () => {
  it("o cartão é um rádio", async () => {
    const aoEscolher = vi.fn();
    render(<CartaoDeEscolha selecionado={false} aoEscolher={aoEscolher} titulo="Enviar agora" descricao="A campanha entra na fila imediatamente." />);
    const radio = screen.getByRole("radio", { name: /Enviar agora/ });
    expect(radio).toHaveAttribute("aria-checked", "false");
    await userEvent.click(radio);
    expect(aoEscolher).toHaveBeenCalledOnce();
  });

  it("o contador conta e avisa no limite", () => {
    const { rerender } = render(<CampoComContador rotulo="Nome da campanha" valor="Teste prints" aoMudar={vi.fn()} maximo={80} />);
    expect(screen.getByText("12/80")).toBeInTheDocument();
    rerender(<CampoComContador rotulo="Nome da campanha" valor={"x".repeat(80)} aoMudar={vi.fn()} maximo={80} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Limite de 80 caracteres atingido.");
  });

  it("o resumo lista as linhas e o rodapé", () => {
    render(<ResumoDoEnvio linhas={[{ icone: null, rotulo: "Nome da campanha", valor: "Teste" }]} rodape={<p>Custo estimado:</p>} />);
    expect(screen.getByText("Nome da campanha")).toBeInTheDocument();
    expect(screen.getByText("Teste")).toBeInTheDocument();
    expect(screen.getByText("Custo estimado:")).toBeInTheDocument();
  });
});

describe("prévia", () => {
  const personalizados = [{ campo: "contato.cidade", rotulo: "Cidade" }];

  it("os rótulos dos campos", () => {
    expect(rotuloDoCampo("primeiro_nome", personalizados)).toBe("Primeiro nome");
    expect(rotuloDoCampo("contato.cidade", personalizados)).toBe("Cidade");
    expect(rotuloDoCampo("lead.gancho", personalizados)).toBe("gancho");
  });

  it("texto livre: as variáveis viram chips; o resto é texto", () => {
    expect(partesDoTexto("Oi, {{primeiro_nome}}! De {{contato.cidade}}?", personalizados)).toEqual([
      { tipo: "texto", texto: "Oi, " },
      { tipo: "variavel", rotulo: "Primeiro nome" },
      { tipo: "texto", texto: "! De " },
      { tipo: "variavel", rotulo: "Cidade" },
      { tipo: "texto", texto: "?" },
    ]);
  });

  it("modelo: campo vira chip, valor fixo vira texto, sem variável fica {{n}}", () => {
    expect(
      partesDoModelo(
        {
          tipo: "modelo",
          nome: "m",
          idioma: "pt_BR",
          categoria: null,
          corpo: "Oi, {{1}}! Time {{2}} {{3}}",
          variaveis: { "1": { fonte: "campo", campo: "primeiro_nome", alternativo: null }, "2": { fonte: "fixo", valor: "Escale" } },
        },
        [],
      ),
    ).toEqual([
      { tipo: "texto", texto: "Oi, " },
      { tipo: "variavel", rotulo: "Primeiro nome" },
      { tipo: "texto", texto: "! Time " },
      { tipo: "texto", texto: "Escale" },
      { tipo: "texto", texto: " " },
      { tipo: "texto", texto: "{{3}}" },
    ]);
  });

  it("o celular mostra o balão com o chip ou o vazio", () => {
    const { rerender } = render(<PreviaDoCelular dispositivo="Naiara" partes={[{ tipo: "texto", texto: "Oi, " }, { tipo: "variavel", rotulo: "Primeiro nome" }]} vazio="Selecione um modelo para ver a prévia da mensagem" />);
    expect(screen.getByText("Naiara")).toBeInTheDocument();
    expect(screen.getByText("Primeiro nome")).toBeInTheDocument();
    rerender(<PreviaDoCelular dispositivo={null} partes={null} vazio="Selecione um modelo para ver a prévia da mensagem" />);
    expect(screen.getByText("Selecione um modelo para ver a prévia da mensagem")).toBeInTheDocument();
    expect(screen.getByText("Dispositivo")).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-assistente-molde.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 2: As cores e os ícones**

No **fim** de `app/escale-tema.css`:

```css
/* ─── FORK ESCALE · Fase 8B (assistente de campanha) ───
   A prévia do celular (amostra de pixel no 09-018 e 09-025: as cores são do
   WhatsApp, não da Clint nem da marca), o balão da prévia do modal "Escolher
   mensagem" (09-024) e o chip da categoria do modelo (09-023). Lidas por valor
   arbitrário (`bg-(--escale-…)`), como as da 8A. */
body:has([data-escale-casca]) {
  --escale-celular-moldura: #1b1b20; /* medido, 09-018 */
  --escale-celular-cabecalho: #0b5c4c; /* medido, 09-018 */
  --escale-celular-fundo: #ece5dd; /* medido, 09-018 */
  --escale-celular-balao: #ffffff;
  --escale-celular-visto: #53bdeb; /* medido, 09-025 */
  --escale-modelo-balao: #e7f1fd; /* medido, 09-024 */
  --escale-categoria-fundo: #e5e9fb; /* medido, 09-023 */
  --escale-categoria-texto: #4b5ac4; /* medido, 09-023 */
}

[data-theme="dark"] body:has([data-escale-casca]) {
  --escale-celular-moldura: #000000;
  --escale-celular-cabecalho: #0b5c4c;
  --escale-celular-fundo: #1f2c33;
  --escale-celular-balao: #202c33;
  --escale-celular-visto: #53bdeb;
  --escale-modelo-balao: #1d2a3a;
  --escale-categoria-fundo: #252b4a;
  --escale-categoria-texto: #a9b4f5;
}
```

Em `lib/ui/icons-da-casca.ts`, no bloco do re-export de `lucide-react`, acrescente `BatteryMedium, Signal, Video, Wifi` com o comentário `// FORK ESCALE · Fase 8B: a barra e o cabeçalho do celular da prévia.` (se o arquivo for uma lista por linha, uma linha por ícone, em ordem alfabética dentro do bloco do fork).

- [ ] **Step 3: `components/escale/campanhas/molde/estilos.ts`**

```ts
/**
 * AS CLASSES DO MOLDE DO ASSISTENTE (fork Escale, Fase 8B; medidas da tabela do
 * plano, prints 09-018 e 09-044). A 8D reaproveita.
 */
export const BOTAO_CONTORNADO =
  "inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-[6px] border border-casca-borda bg-surface px-4 text-[13px] font-medium text-casca-texto hover:bg-casca-busca disabled:opacity-40";
export const BOTAO_DA_MARCA =
  "inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-[6px] bg-casca-marca px-4 text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:opacity-40";
export const CAMPO =
  "h-8 w-full rounded-[6px] border border-transparent bg-casca-busca px-3 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:border-casca-marca focus-visible:bg-surface focus-visible:outline-none";
export const ROTULO = "mb-2 block text-[13px] font-medium text-casca-texto";
export const TITULO_DO_PASSO = "text-[20px] font-semibold text-casca-texto";
export const SUBTITULO_DO_PASSO = "mt-1 text-[13px] text-casca-suave";
```

- [ ] **Step 4: Trilha, barra, rodapé e molde**

`components/escale/campanhas/molde/TrilhaDoAssistente.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Fragment } from "react";

import { useT } from "@/hooks/i18n/useT";

/** A TRILHA DO ASSISTENTE (fork Escale, Fase 8B; 09-018: "Campanhas › WhatsApp › Nova campanha"). */
export function TrilhaDoAssistente({ itens }: { itens: ReadonlyArray<{ rotulo: string; href?: string }> }) {
  const t = useT();
  return (
    <nav aria-label={t("Trilha")} className="flex h-12 shrink-0 items-center border-b border-casca-divisoria px-6 text-[13px]">
      {itens.map((item, i) => {
        const ultimo = i === itens.length - 1;
        return (
          <Fragment key={`${item.rotulo}-${i}`}>
            {i > 0 && (
              <span aria-hidden className="mx-1.5 text-[12px] text-casca-meta">
                ›
              </span>
            )}
            {ultimo || !item.href ? (
              <span aria-current={ultimo ? "page" : undefined} className={ultimo ? "font-medium text-casca-texto" : "text-casca-suave"}>
                {item.rotulo}
              </span>
            ) : (
              <Link href={item.href} className="text-casca-suave hover:text-casca-texto">
                {item.rotulo}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
```

`components/escale/campanhas/molde/BarraDePassos.tsx`:

```tsx
"use client";

import { useT } from "@/hooks/i18n/useT";
import { Check } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** A BARRA DE PASSOS (fork Escale, Fase 8B; 09-018, 09-027, 09-044). `atual` começa em 0. */
export function BarraDePassos({ passos, atual }: { passos: readonly string[]; atual: number }) {
  const t = useT();
  return (
    <ol aria-label={t("Passos da campanha")} className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-b border-casca-divisoria px-6 py-5">
      {passos.map((rotulo, i) => {
        const estado = i < atual ? "feito" : i === atual ? "atual" : "futuro";
        return (
          <li key={rotulo} aria-current={estado === "atual" ? "step" : undefined} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden className="h-px w-6 bg-casca-borda" />}
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-[22px] items-center justify-center rounded-full text-[11px]",
                  estado === "atual" ? "bg-casca-marca font-semibold text-white" : "border border-casca-borda text-casca-suave",
                )}
              >
                {estado === "feito" ? <Check className="size-3" aria-hidden /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[13px]",
                  estado === "atual" ? "font-medium text-casca-marca" : estado === "feito" ? "text-casca-texto" : "text-casca-texto-2",
                )}
              >
                {rotulo}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
```

`components/escale/campanhas/molde/RodapeDoAssistente.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { Loader2 } from "@/lib/ui/icons-da-casca";

import { BOTAO_CONTORNADO, BOTAO_DA_MARCA } from "./estilos";

export interface BotaoPrincipalDoRodape {
  rotulo: string;
  aoClicar: () => void;
  carregando?: boolean;
  desabilitado?: boolean;
  icone?: ReactNode;
}

/**
 * O RODAPÉ DO ASSISTENTE (fork Escale, Fase 8B; 09-018, 09-044): à direita,
 * "Voltar", os extras ("Salvar como rascunho") e o principal. Fica no fim da
 * coluna do molde (não é `fixed`: a cerca `rodape-ocupado-contrato`).
 */
export function RodapeDoAssistente({
  aoVoltar,
  rotuloVoltar,
  extras,
  principal,
}: {
  aoVoltar?: () => void;
  rotuloVoltar?: string;
  extras?: ReactNode;
  principal: BotaoPrincipalDoRodape;
}) {
  const t = useT();
  return (
    <footer className="flex h-14 shrink-0 items-center justify-end gap-2 border-t border-casca-divisoria bg-surface px-6">
      {aoVoltar && (
        <button type="button" onClick={aoVoltar} className={BOTAO_CONTORNADO}>
          {rotuloVoltar ?? t("Voltar")}
        </button>
      )}
      {extras}
      <button
        type="button"
        onClick={principal.aoClicar}
        disabled={principal.desabilitado || principal.carregando}
        aria-busy={principal.carregando || undefined}
        className={BOTAO_DA_MARCA}
      >
        {principal.carregando ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : principal.icone}
        {principal.rotulo}
      </button>
    </footer>
  );
}
```

`components/escale/campanhas/molde/MoldeDoAssistente.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

import { BarraDePassos } from "./BarraDePassos";

/**
 * O MOLDE DO ASSISTENTE (fork Escale, Fase 8B; 09-018): trilha, barra de
 * passos, conteúdo com rolagem própria (largura máxima 1050px, formulário e,
 * quando há, a coluna da prévia de 340px) e o rodapé. A altura é a da lista de
 * Contatos da casca (o topo e a reserva do rodapé ocupado).
 */
export function MoldeDoAssistente({
  trilha,
  passos,
  atual,
  rodape,
  children,
  lateral,
}: {
  trilha: ReactNode;
  passos: readonly string[];
  atual: number;
  rodape: ReactNode;
  children: ReactNode;
  lateral?: ReactNode;
}) {
  return (
    <div className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col bg-surface md:[body:has([data-escale-casca])_&]:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]">
      {trilha}
      <BarraDePassos passos={passos} atual={atual} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1050px] gap-10 px-6 pt-9 pb-10">
          <div className="min-w-0 flex-1">{children}</div>
          {lateral && <aside className="hidden w-[340px] shrink-0 min-[1100px]:block">{lateral}</aside>}
        </div>
      </div>
      {rodape}
    </div>
  );
}
```

- [ ] **Step 5: Número, escolha, contador e resumo**

`components/escale/campanhas/molde/SeletorDeNumero.tsx`:

```tsx
"use client";

import { useState } from "react";

import { FotoDaPessoa } from "@/components/escale/conversas/configuracoes/FotoDaPessoa";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { ChevronDown } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { CAMPO } from "./estilos";

export interface NumeroDoSeletor {
  id: string;
  nome: string;
  telefone: string | null;
  conectado: boolean;
  grupo: string;
  avatarUrl?: string | null;
  setor?: string | null;
}

function Avatar({ n, tamanho }: { n: NumeroDoSeletor; tamanho: number }) {
  return (
    <span className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      {n.avatarUrl ? (
        <span aria-hidden className="block size-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(n.avatarUrl)})` }} />
      ) : (
        <FotoDaPessoa id={n.id} nome={n.nome} tamanho={tamanho} />
      )}
      {n.conectado && (
        <span aria-hidden className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface bg-(--escale-status-ganho)" />
      )}
    </span>
  );
}

/**
 * O "DISPOSITIVO DE WHATSAPP" (fork Escale, Fase 8B; 09-019): agrupado na ordem
 * em que os números chegam, avatar com a bolinha de conectado, nome, e embaixo
 * "telefone · setor". Genérico: a 8D passa só os não oficiais.
 */
export function SeletorDeNumero({
  numeros,
  valor,
  aoMudar,
  placeholder,
}: {
  numeros: ReadonlyArray<NumeroDoSeletor>;
  valor: string | null;
  aoMudar: (id: string) => void;
  placeholder?: string;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const atual = numeros.find((n) => n.id === valor) ?? null;
  const grupos: Array<[string, NumeroDoSeletor[]]> = [];
  for (const n of numeros) {
    const g = grupos.find(([nome]) => nome === n.grupo);
    if (g) g[1].push(n);
    else grupos.push([n.grupo, [n]]);
  }
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={aberto}
          className={cn(CAMPO, "flex items-center gap-2 text-left", aberto && "border-casca-marca bg-surface")}
        >
          {atual ? (
            <>
              <Avatar n={atual} tamanho={20} />
              <span className="truncate">{atual.nome}</span>
            </>
          ) : (
            <span className="text-casca-meta">{placeholder ?? t("Selecionar conta")}</span>
          )}
          <ChevronDown className={cn("ml-auto size-4 text-casca-suave", aberto && "rotate-180")} aria-hidden />
        </button>
      </PopoverTrigger>
      <PainelSuspenso sideOffset={8} className="max-h-[360px] w-(--radix-popover-trigger-width) overflow-y-auto py-2">
        {numeros.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-casca-suave">{t("Nenhum dispositivo disponível")}</p>
        ) : (
          <div role="listbox" aria-label={t("Dispositivo de WhatsApp")}>
            {grupos.map(([grupo, lista]) => (
              <div key={grupo} role="group" aria-label={grupo}>
                <p className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-casca-suave uppercase">{grupo}</p>
                {lista.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="option"
                    aria-selected={n.id === valor}
                    onClick={() => {
                      aoMudar(n.id);
                      setAberto(false);
                    }}
                    className={cn("flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-casca-busca", n.id === valor && "bg-casca-marca-suave")}
                  >
                    <Avatar n={n} tamanho={28} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-casca-texto">{n.nome}</span>
                      <span className="block truncate text-[12px] text-casca-suave">
                        {[n.telefone ? formatarTelefone(n.telefone) : null, n.setor ?? null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </PainelSuspenso>
    </Popover>
  );
}
```

`components/escale/campanhas/molde/CartaoDeEscolha.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * O CARTÃO DE ESCOLHA (fork Escale, Fase 8B; 09-018/09-021): borda 1,5px, canto
 * 8px; selecionado = borda e fundo suave da marca. Sem ícone mostra o rádio
 * ("Enviar agora"); com ícone, o quadrado de 28px. O grupo põe `role="radiogroup"`.
 */
export function CartaoDeEscolha({
  selecionado,
  aoEscolher,
  titulo,
  descricao,
  icone,
}: {
  selecionado: boolean;
  aoEscolher: () => void;
  titulo: string;
  descricao: string;
  icone?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selecionado}
      onClick={aoEscolher}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-[8px] border-[1.5px] px-3 py-2.5 text-left",
        selecionado ? "border-casca-marca bg-casca-marca-suave" : "border-casca-borda bg-surface hover:border-casca-marca-media",
      )}
    >
      {icone ? (
        <span
          aria-hidden
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-[8px]",
            selecionado ? "bg-casca-marca text-white" : "bg-casca-marca-suave text-casca-marca",
          )}
        >
          {icone}
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
            selecionado ? "border-casca-marca" : "border-casca-borda",
          )}
        >
          {selecionado && <span className="size-2 rounded-full bg-casca-marca" />}
        </span>
      )}
      <span>
        <span className="block text-[13px] font-medium text-casca-texto">{titulo}</span>
        <span className="mt-0.5 block text-[12px] text-casca-suave">{descricao}</span>
      </span>
    </button>
  );
}
```

`components/escale/campanhas/molde/CampoComContador.tsx`:

```tsx
"use client";

import { useId } from "react";

import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";

import { CAMPO, ROTULO } from "./estilos";

/** O CAMPO COM CONTADOR (fork Escale, Fase 8B; 09-018 "0/80", 09-025 "25/80"). */
export function CampoComContador({
  rotulo,
  valor,
  aoMudar,
  maximo,
  placeholder,
  erro,
  id,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  maximo: number;
  placeholder?: string;
  erro?: string | null;
  id?: string;
}) {
  const t = useT();
  const gerado = useId();
  const idDoCampo = id ?? gerado;
  const noLimite = valor.length >= maximo;
  const aviso = erro ?? (noLimite ? t("Limite de {max} caracteres atingido.").replace("{max}", String(maximo)) : null);
  return (
    <div>
      <label htmlFor={idDoCampo} className={ROTULO}>
        {rotulo}
      </label>
      <input
        id={idDoCampo}
        value={valor}
        maxLength={maximo}
        placeholder={placeholder}
        onChange={(e) => aoMudar(e.target.value)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={`${idDoCampo}-contador`}
        className={cn(CAMPO, erro && "border-casca-alerta")}
      />
      <div className="mt-1.5 flex justify-between gap-3 text-[11px]">
        <span role={aviso ? "alert" : undefined} className="text-casca-alerta">
          {aviso}
        </span>
        <span id={`${idDoCampo}-contador`} className="shrink-0 text-casca-meta">{`${valor.length}/${maximo}`}</span>
      </div>
    </div>
  );
}
```

`components/escale/campanhas/molde/ResumoDoEnvio.tsx`:

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** O CARTÃO DE CONFIRMAÇÃO (fork Escale, Fase 8B; 09-044): linhas ícone + rótulo + valor e o rodapé. */
export function ResumoDoEnvio({
  linhas,
  rodape,
}: {
  linhas: ReadonlyArray<{ icone: ReactNode; rotulo: string; valor: ReactNode }>;
  rodape?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-casca-borda bg-surface shadow-xs">
      <dl>
        {linhas.map((l, i) => (
          <div key={l.rotulo} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-casca-divisoria")}>
            <span aria-hidden className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] bg-casca-marca-suave text-casca-marca">
              {l.icone}
            </span>
            <div className="min-w-0">
              <dt className="text-[12px] text-casca-meta">{l.rotulo}</dt>
              <dd className="text-[13px] text-casca-texto">{l.valor}</dd>
            </div>
          </div>
        ))}
      </dl>
      {rodape}
    </div>
  );
}
```

- [ ] **Step 6: `lib/escale/campanhas/previa.ts` e a prévia do celular**

`lib/escale/campanhas/previa.ts`:

```ts
import type { MensagemDaCampanha, MensagemDeModelo } from "./assistente";
import { CAMPOS_BASICOS } from "./modelo";

/**
 * A PRÉVIA DA MENSAGEM (fork Escale, Fase 8B; 09-025): o texto em partes, com
 * as variáveis de campo do CRM como chip ("Primeiro nome") e o valor fixo como
 * texto. Puro: o celular só desenha.
 */
export type ParteDaPrevia = { tipo: "texto"; texto: string } | { tipo: "variavel"; rotulo: string };
export interface CampoPersonalizado {
  campo: string;
  rotulo: string;
}

export function rotuloDoCampo(campo: string, personalizados: readonly CampoPersonalizado[]): string {
  const basico = CAMPOS_BASICOS.find((c) => c.campo === campo);
  if (basico) return basico.rotulo;
  return personalizados.find((c) => c.campo === campo)?.rotulo ?? campo.split(".").pop() ?? campo;
}

const TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function emPartes(texto: string, parte: (token: string, literal: string) => ParteDaPrevia): ParteDaPrevia[] {
  const saida: ParteDaPrevia[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(TOKEN)) {
    if (m.index > ultimo) saida.push({ tipo: "texto", texto: texto.slice(ultimo, m.index) });
    saida.push(parte(m[1]!, m[0]));
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) saida.push({ tipo: "texto", texto: texto.slice(ultimo) });
  return saida;
}

/** Texto livre: `{{nome}}`, `{{contato.cidade}}` viram chips; o resto fica texto. */
export const partesDoTexto = (texto: string, personalizados: readonly CampoPersonalizado[]): ParteDaPrevia[] =>
  emPartes(texto, (token) => ({ tipo: "variavel", rotulo: rotuloDoCampo(token, personalizados) }));

/** Modelo: `{{n}}` com campo vira chip; com valor fixo, texto; sem variável, o `{{n}}` literal. */
export const partesDoModelo = (m: MensagemDeModelo, personalizados: readonly CampoPersonalizado[]): ParteDaPrevia[] =>
  emPartes(m.corpo, (token, literal) => {
    const v = m.variaveis[token];
    if (!v) return { tipo: "texto", texto: literal };
    if (v.fonte === "fixo") return { tipo: "texto", texto: v.valor };
    return { tipo: "variavel", rotulo: rotuloDoCampo(v.campo, personalizados) };
  });

/** A prévia da mensagem do passo 1 e do 4; `null` enquanto não há o que mostrar. */
export function partesDaMensagem(m: MensagemDaCampanha, personalizados: readonly CampoPersonalizado[]): ParteDaPrevia[] | null {
  if (m.tipo === "texto") return m.texto.trim() ? partesDoTexto(m.texto, personalizados) : null;
  return m.nome ? partesDoModelo(m, personalizados) : null;
}
```

`components/escale/campanhas/assistente/PreviaDoCelular.tsx`:

```tsx
"use client";

import { Fragment, useEffect, useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { ParteDaPrevia } from "@/lib/escale/campanhas/previa";
import { ArrowLeft, BatteryMedium, CheckCheck, EllipsisVertical, Phone, Signal, Video, Wifi } from "@/lib/ui/icons-da-casca";

const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });

/** A hora de agora, só no navegador (no servidor ficaria diferente e a hidratação reclamaria). */
function useHora(): string {
  const [hora, setHora] = useState("");
  useEffect(() => setHora(HORA.format(new Date())), []);
  return hora;
}

/**
 * A PRÉVIA NO CELULAR (fork Escale, Fase 8B; 09-018, 09-025, 09-044): moldura,
 * barra de status e cabeçalho do WhatsApp com o nome do dispositivo, e o balão
 * com as variáveis em chip. Hora em 24 h (regra 5 do CLAUDE.md).
 */
export function PreviaDoCelular({
  dispositivo,
  partes,
  vazio,
}: {
  dispositivo: string | null;
  partes: readonly ParteDaPrevia[] | null;
  vazio: string;
}) {
  const t = useT();
  const hora = useHora();
  const nome = dispositivo ?? t("Dispositivo");
  return (
    <div className="sticky top-0 mx-auto flex h-[560px] w-[340px] flex-col overflow-hidden rounded-[44px] border-[10px] border-(--escale-celular-moldura) bg-(--escale-celular-fundo)">
      <div className="flex h-7 shrink-0 items-center justify-between bg-(--escale-celular-cabecalho) px-5 text-[13px] font-semibold text-white">
        <span>{hora}</span>
        <span aria-hidden className="flex items-center gap-1">
          <Signal className="size-3.5" />
          <Wifi className="size-3.5" />
          <BatteryMedium className="size-4" />
        </span>
      </div>
      <div className="flex h-14 shrink-0 items-center gap-2.5 bg-(--escale-celular-cabecalho) px-3 text-white">
        <ArrowLeft className="size-[18px] shrink-0" aria-hidden />
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/25 text-[13px] font-semibold">
          {nome.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{nome}</span>
          <span className="block text-[11px] opacity-80">{t("online")}</span>
        </span>
        <span aria-hidden className="flex shrink-0 items-center gap-3">
          <Video className="size-[18px]" />
          <Phone className="size-4" />
          <EllipsisVertical className="size-4" />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {partes && partes.length > 0 ? (
          <div className="max-w-[85%] rounded-[8px] rounded-tl-none bg-(--escale-celular-balao) p-2.5 text-[13px] whitespace-pre-wrap text-casca-texto shadow-xs">
            {partes.map((p, i) =>
              p.tipo === "texto" ? (
                <Fragment key={i}>{p.texto}</Fragment>
              ) : (
                <span key={i} className="mx-0.5 rounded-[4px] bg-casca-marca-suave px-1.5 py-0.5 font-medium text-casca-marca">
                  {p.rotulo}
                </span>
              ),
            )}
            <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-casca-meta">
              {hora}
              <CheckCheck className="size-3.5 text-(--escale-celular-visto)" aria-hidden />
            </span>
          </div>
        ) : (
          <p className="flex h-full items-center justify-center px-6 text-center text-[13px] text-casca-suave">{vazio}</p>
        )}
      </div>
    </div>
  );
}
```

> Os rótulos que chegam por prop (`rotulo`, `titulo`, `descricao`, `vazio`, `grupo`) já vêm traduzidos por quem chama.

- [ ] **Step 7: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-molde.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/escale-tema.test.ts tests/unit/escale-casca-tokens.test.ts tests/unit/controle-decorativo.test.ts tests/unit/rodape-ocupado-contrato.test.ts && corepack pnpm prettier --write components/escale/campanhas/molde components/escale/campanhas/assistente/PreviaDoCelular.tsx lib/escale/campanhas/previa.ts tests/unit/escale-assistente-molde.test.tsx && corepack pnpm eslint components/escale/campanhas lib/escale/campanhas/previa.ts lib/ui/icons-da-casca.ts && corepack pnpm typecheck`
Expected: PASS. Os nomes exatos das cercas: `ls tests/unit | grep -E "tokens|tema|decorativo|rodape"`. Se a `tailwind-tokens` recusar `text-white` ou `bg-white/25`, a mensagem diz a classe e a alternativa aceita na casca (o 8A usa as mesmas no botão "Enviar WhatsApp").

- [ ] **Step 8: Commit**

```bash
git add components/escale/campanhas/molde components/escale/campanhas/assistente/PreviaDoCelular.tsx lib/escale/campanhas/previa.ts app/escale-tema.css lib/ui/icons-da-casca.ts tests/unit/escale-assistente-molde.test.tsx
git commit -m "feat(escale): peças de molde do assistente e a prévia do celular (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 10: O estado do assistente e os pedidos ao servidor

**Files:**
- Create: `lib/escale/campanhas/estado-do-assistente.ts`, `hooks/escale/useAssistenteDeCampanha.ts`, `tests/unit/escale-assistente-estado.test.ts`

**Interfaces:**
- Consumes: `Assistente`, `PosEnvio`, `PublicoDaCampanha`, `PUBLICO_VAZIO`, `POS_ENVIO_PADRAO`, `NOME_MIN`, `NOME_MAX`, `TEXTO_MAX` (Task 1); `variaveisDoCorpo`, `contagemResolvida` (Task 1); `publicoVazio` (Task 1); `NumeroDaCampanha`, `grupoDoNumero` (Task 4); `DadosDoAssistente` (Task 4); `ResumoDaPreparacao`, `MotivoFora` (Task 6); `LinhaDoDestinatario` (Task 3).
- Produces:
  - `PASSOS_DO_ASSISTENTE = ["Configure a sua campanha", "Escolha seus contatos", "Configurações opcionais", "Confirme seu envio"]`, `Passo = 0 | 1 | 2 | 3`, `ASSISTENTE_VAZIO: Assistente`, `EstadoDoAssistente { passo; campanhaId: string | null; dados: Assistente; tentou: boolean; publicoAntigo: boolean }`, `AcaoDoAssistente`, `estadoInicial(): EstadoDoAssistente`, `redutorDoAssistente(e, a): EstadoDoAssistente`, `aoTrocarNumero(dados, numero): Partial<Assistente>`, `quandoPadrao(agora): string`, `ContextoDosErros { numero: NumeroDaCampanha | null; agora: Date }`, `errosDoPasso(passo, dados, ctx): Record<string, string>`.
  - Hooks: `useNumerosDaCampanha()`, `useAssistenteSalvo(id: string | null)`, `useSalvarAssistente()` (`{ campanhaId: string | null; dados: Assistente } → string`), `useAcaoDoAssistente()` (`{ id; acao: "preparar" | "enviar" | "rascunho" } → Record<string, unknown>`), `usePaginaDoPublico(publico, pagina, porPagina, ativo)`, `useForaDaLista(id, ativo)`, `contatosDaImportacao(id): Promise<string[]>`, `useAcompanharImportacao(id: string | null)`, `CHAVE_DO_ASSISTENTE = "assistente-de-campanha"`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-assistente-estado.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { POS_ENVIO_PADRAO } from "@/lib/escale/campanhas/assistente";
import {
  ASSISTENTE_VAZIO,
  aoTrocarNumero,
  errosDoPasso,
  estadoInicial,
  quandoPadrao,
  redutorDoAssistente,
} from "@/lib/escale/campanhas/estado-do-assistente";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";

const OFICIAL: NumeroDaCampanha = { id: "n1", nome: "Of", telefone: null, conectado: true, oficial: true, provider: "p", setor: null };
const LIVRE: NumeroDaCampanha = { ...OFICIAL, id: "n2", oficial: false };
const AGORA = new Date("2026-11-20T12:00:00.000Z");

describe("redutorDoAssistente", () => {
  it("muda campos, o passo 3 e o público sem perder o resto", () => {
    let e = estadoInicial();
    e = redutorDoAssistente(e, { tipo: "mudar", campos: { nome: "Reativação" } });
    e = redutorDoAssistente(e, { tipo: "mudarPosEnvio", campos: { tags: ["x"] } });
    e = redutorDoAssistente(e, { tipo: "mudarPublico", publico: { selecao: null, avulsos: ["c1"], removidos: [] } });
    expect(e.dados.nome).toBe("Reativação");
    expect(e.dados.posEnvio).toEqual({ ...POS_ENVIO_PADRAO, tags: ["x"] });
    expect(e.dados.publico.avulsos).toEqual(["c1"]);
  });

  it("ir para outro passo limpa o 'tentou'; salvar guarda o id; carregar substitui", () => {
    let e = redutorDoAssistente(estadoInicial(), { tipo: "tentou" });
    expect(e.tentou).toBe(true);
    e = redutorDoAssistente(e, { tipo: "irPara", passo: 1 });
    expect(e).toMatchObject({ passo: 1, tentou: false });
    e = redutorDoAssistente(e, { tipo: "salvo", campanhaId: "c-1" });
    expect(e.campanhaId).toBe("c-1");
    e = redutorDoAssistente(e, { tipo: "carregar", campanhaId: "c-2", dados: { ...ASSISTENTE_VAZIO, nome: "Antiga" }, publicoAntigo: true });
    expect(e).toMatchObject({ passo: 0, campanhaId: "c-2", publicoAntigo: true });
    expect(e.dados.nome).toBe("Antiga");
    expect(redutorDoAssistente(e, { tipo: "reiniciar" })).toEqual(estadoInicial());
  });
});

describe("aoTrocarNumero", () => {
  it("oficial: a mensagem vira modelo (vazio) e os extras saem", () => {
    const r = aoTrocarNumero({ ...ASSISTENTE_VAZIO, mensagem: { tipo: "texto", texto: "oi" }, numerosExtras: ["n9"] }, OFICIAL);
    expect(r.numeroId).toBe("n1");
    expect(r.mensagem?.tipo).toBe("modelo");
    expect(r.numerosExtras).toEqual([]);
  });

  it("não oficial: o modelo vira texto vazio; texto continua", () => {
    const modelo = { tipo: "modelo" as const, nome: "m", idioma: "pt_BR", categoria: null, corpo: "x", variaveis: {} };
    expect(aoTrocarNumero({ ...ASSISTENTE_VAZIO, mensagem: modelo }, LIVRE).mensagem).toEqual({ tipo: "texto", texto: "" });
    expect(aoTrocarNumero({ ...ASSISTENTE_VAZIO, mensagem: { tipo: "texto", texto: "oi" } }, LIVRE).mensagem).toBeUndefined();
  });
});

describe("errosDoPasso", () => {
  const base = { ...ASSISTENTE_VAZIO, nome: "Reativação", numeroId: "n2", mensagem: { tipo: "texto" as const, texto: "Oi" } };

  it("passo 1: nome, dispositivo, mensagem, modelo, agendamento e LIA", () => {
    expect(errosDoPasso(0, base, { numero: LIVRE, agora: AGORA })).toEqual({});
    expect(errosDoPasso(0, { ...base, nome: "ab" }, { numero: LIVRE, agora: AGORA })).toHaveProperty("nome");
    expect(errosDoPasso(0, { ...base, numeroId: "" }, { numero: null, agora: AGORA })).toHaveProperty("numeroId");
    expect(errosDoPasso(0, { ...base, mensagem: { tipo: "texto", texto: " " } }, { numero: LIVRE, agora: AGORA })).toHaveProperty("mensagem");
    const modeloSemVariavel = { tipo: "modelo" as const, nome: "m", idioma: "pt_BR", categoria: null, corpo: "Oi {{1}}", variaveis: {} };
    expect(errosDoPasso(0, { ...base, numeroId: "n1", mensagem: modeloSemVariavel }, { numero: OFICIAL, agora: AGORA }).mensagem).toBe(
      "Resolva as variáveis do modelo para avançar.",
    );
    const modeloSemNome = { ...modeloSemVariavel, nome: "" };
    expect(errosDoPasso(0, { ...base, numeroId: "n1", mensagem: modeloSemNome }, { numero: OFICIAL, agora: AGORA }).mensagem).toBe(
      "Escolha um modelo de mensagem.",
    );
    expect(errosDoPasso(0, { ...base, quando: { modo: "agendar", em: "2026-11-20T11:00:00.000Z" } }, { numero: LIVRE, agora: AGORA }).quando).toBe(
      "A hora selecionada não pode ser menor que o horário atual.",
    );
    expect(errosDoPasso(0, { ...base, baseLegal: "legitimate_interest" }, { numero: LIVRE, agora: AGORA })).toHaveProperty("lia");
  });

  it("passo 2: pelo menos um destinatário", () => {
    expect(errosDoPasso(1, base, { numero: LIVRE, agora: AGORA }).publico).toBe("Você deve selecionar pelo menos um contato.");
    expect(errosDoPasso(1, { ...base, publico: { selecao: null, avulsos: ["c"], removidos: [] } }, { numero: LIVRE, agora: AGORA })).toEqual({});
  });

  it("passo 3: origem pede etapa", () => {
    expect(errosDoPasso(2, { ...base, posEnvio: { ...POS_ENVIO_PADRAO, origemId: "o" } }, { numero: LIVRE, agora: AGORA }).etapaId).toBe("Selecione uma etapa");
  });
});

describe("quandoPadrao", () => {
  it("daqui a uma hora, em minutos redondos de 5", () => {
    expect(quandoPadrao(new Date("2026-11-20T12:02:30.000Z"))).toBe("2026-11-20T13:05:00.000Z");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-assistente-estado.test.ts`
Expected: FAIL.

- [ ] **Step 2: `lib/escale/campanhas/estado-do-assistente.ts`**

```ts
import {
  NOME_MAX,
  NOME_MIN,
  POS_ENVIO_PADRAO,
  PUBLICO_VAZIO,
  type Assistente,
  type PosEnvio,
  type PublicoDaCampanha,
} from "./assistente";
import { contagemResolvida, variaveisDoCorpo } from "./modelo";
import type { NumeroDaCampanha } from "./numeros";
import { publicoVazio } from "./publico";

/** O ESTADO DO ASSISTENTE (fork Escale, Fase 8B; N14). Puro: a tela só despacha. */
export const PASSOS_DO_ASSISTENTE = [
  "Configure a sua campanha",
  "Escolha seus contatos",
  "Configurações opcionais",
  "Confirme seu envio",
] as const;
export type Passo = 0 | 1 | 2 | 3;

export const ASSISTENTE_VAZIO: Assistente = {
  nome: "",
  numeroId: "",
  mensagem: { tipo: "texto", texto: "" },
  quando: { modo: "agora" },
  baseLegal: "consent",
  lia: null,
  publico: PUBLICO_VAZIO,
  posEnvio: POS_ENVIO_PADRAO,
  agenteId: null,
  ritmo: {},
  numerosExtras: [],
};

export interface EstadoDoAssistente {
  passo: Passo;
  campanhaId: string | null;
  dados: Assistente;
  /** O "Próximo" foi apertado com erro: os avisos aparecem. */
  tentou: boolean;
  publicoAntigo: boolean;
}

export type AcaoDoAssistente =
  | { tipo: "mudar"; campos: Partial<Assistente> }
  | { tipo: "mudarPosEnvio"; campos: Partial<PosEnvio> }
  | { tipo: "mudarPublico"; publico: PublicoDaCampanha }
  | { tipo: "irPara"; passo: Passo }
  | { tipo: "tentou" }
  | { tipo: "salvo"; campanhaId: string }
  | { tipo: "carregar"; campanhaId: string; dados: Assistente; publicoAntigo: boolean }
  | { tipo: "reiniciar" };

export const estadoInicial = (): EstadoDoAssistente => ({
  passo: 0,
  campanhaId: null,
  dados: ASSISTENTE_VAZIO,
  tentou: false,
  publicoAntigo: false,
});

export function redutorDoAssistente(e: EstadoDoAssistente, a: AcaoDoAssistente): EstadoDoAssistente {
  switch (a.tipo) {
    case "mudar":
      return { ...e, dados: { ...e.dados, ...a.campos } };
    case "mudarPosEnvio":
      return { ...e, dados: { ...e.dados, posEnvio: { ...e.dados.posEnvio, ...a.campos } } };
    case "mudarPublico":
      return { ...e, dados: { ...e.dados, publico: a.publico }, publicoAntigo: false };
    case "irPara":
      return { ...e, passo: a.passo, tentou: false };
    case "tentou":
      return { ...e, tentou: true };
    case "salvo":
      return { ...e, campanhaId: a.campanhaId };
    case "carregar":
      return { passo: 0, campanhaId: a.campanhaId, dados: a.dados, tentou: false, publicoAntigo: a.publicoAntigo };
    case "reiniciar":
      return estadoInicial();
  }
}

/** Trocar de número muda o tipo de mensagem que ele aceita (N4, N5) e tira o rodízio do oficial (P3). */
export function aoTrocarNumero(dados: Assistente, numero: NumeroDaCampanha): Partial<Assistente> {
  const extras = numero.oficial ? [] : dados.numerosExtras.filter((id) => id !== numero.id);
  if (numero.oficial && dados.mensagem.tipo !== "modelo") {
    return {
      numeroId: numero.id,
      numerosExtras: extras,
      mensagem: { tipo: "modelo", nome: "", idioma: "", categoria: null, corpo: "", variaveis: {} },
    };
  }
  if (!numero.oficial && dados.mensagem.tipo === "modelo") {
    return { numeroId: numero.id, numerosExtras: extras, mensagem: { tipo: "texto", texto: "" } };
  }
  return { numeroId: numero.id, numerosExtras: extras };
}

/** O agendamento que "Criar agendamento" propõe: daqui a uma hora, em minutos redondos de 5. */
export function quandoPadrao(agora: Date): string {
  const d = new Date(agora.getTime() + 60 * 60_000);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(Math.ceil(d.getUTCMinutes() / 5) * 5);
  return d.toISOString();
}

export interface ContextoDosErros {
  numero: NumeroDaCampanha | null;
  agora: Date;
}

/** Os avisos de cada passo, em português (a tela traduz). Vazio = pode avançar. */
export function errosDoPasso(passo: Passo, d: Assistente, ctx: ContextoDosErros): Record<string, string> {
  const erros: Record<string, string> = {};
  if (passo === 0) {
    const nome = d.nome.trim();
    if (nome.length < NOME_MIN) erros.nome = "O nome da campanha deve ter pelo menos 3 caracteres.";
    if (nome.length > NOME_MAX) erros.nome = "O nome da campanha deve ter no máximo 80 caracteres.";
    if (!d.numeroId || !ctx.numero) erros.numeroId = "Escolha o dispositivo de WhatsApp.";
    if (d.mensagem.tipo === "texto") {
      if (d.mensagem.texto.trim() === "") erros.mensagem = "Escreva a mensagem.";
    } else if (d.mensagem.nome === "") {
      erros.mensagem = "Escolha um modelo de mensagem.";
    } else {
      const chaves = variaveisDoCorpo(d.mensagem.corpo);
      const { feitas, total } = contagemResolvida(chaves, d.mensagem.variaveis);
      if (feitas < total) erros.mensagem = "Resolva as variáveis do modelo para avançar.";
    }
    if (d.quando.modo === "agendar") {
      const em = new Date(d.quando.em);
      if (Number.isNaN(em.getTime())) erros.quando = "Você precisa selecionar uma data.";
      else if (em.getTime() <= ctx.agora.getTime()) erros.quando = "A hora selecionada não pode ser menor que o horário atual.";
    }
    if (d.baseLegal === "legitimate_interest" && (d.lia ?? "").trim() === "") {
      erros.lia = "Interesse legítimo exige a referência da avaliação (LIA).";
    }
  }
  if (passo === 1 && publicoVazio(d.publico)) erros.publico = "Você deve selecionar pelo menos um contato.";
  if (passo === 2 && d.posEnvio.origemId && !d.posEnvio.etapaId) erros.etapaId = "Selecione uma etapa";
  return erros;
}
```

- [ ] **Step 3: `hooks/escale/useAssistenteDeCampanha.ts`**

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { ResumoDaPreparacao, MotivoFora } from "@/lib/escale/campanhas/acoes-do-assistente";
import type { Assistente, PublicoDaCampanha } from "@/lib/escale/campanhas/assistente";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";
import type { LinhaDoDestinatario } from "@/lib/escale/campanhas/publico-banco";
import type { DadosDoAssistente } from "@/lib/escale/campanhas/rascunho";
import { CHAVE_DAS_CAMPANHAS } from "@/hooks/escale/useCampanhasDaCasca";

/** OS PEDIDOS DO ASSISTENTE (fork Escale, Fase 8B). */
export const CHAVE_DO_ASSISTENTE = "assistente-de-campanha";

export function useNumerosDaCampanha() {
  return useQuery({
    queryKey: [CHAVE_DO_ASSISTENTE, "numeros"],
    queryFn: async () => (await apiClient.get<{ data: NumeroDaCampanha[] }>("/api/v1/campanhas-da-casca/numeros")).data,
    staleTime: 30_000,
  });
}

export function useAssistenteSalvo(id: string | null) {
  return useQuery({
    queryKey: [CHAVE_DO_ASSISTENTE, "salvo", id],
    enabled: id !== null,
    queryFn: async () => (await apiClient.get<{ data: DadosDoAssistente }>(`/api/v1/campanhas-da-casca/${id}/assistente`)).data,
    staleTime: Infinity,
  });
}

export function useSalvarAssistente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campanhaId, dados }: { campanhaId: string | null; dados: Assistente }): Promise<string> => {
      if (campanhaId) {
        await apiClient.put(`/api/v1/campanhas-da-casca/${campanhaId}/assistente`, dados);
        return campanhaId;
      }
      return (await apiClient.post<{ data: { id: string } }>("/api/v1/campanhas-da-casca", dados)).data.id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] }),
  });
}

export function useAcaoDoAssistente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, acao }: { id: string; acao: "preparar" | "enviar" | "rascunho" }) =>
      (await apiClient.post<{ data: Record<string, unknown> }>(`/api/v1/campanhas-da-casca/${id}/${acao}`, {})).data,
    onSuccess: () => void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] }),
  });
}

export type ResumoDoPreparo = ResumoDaPreparacao;

export function usePaginaDoPublico(publico: PublicoDaCampanha, pagina: number, porPagina: number, ativo: boolean) {
  return useQuery({
    queryKey: [CHAVE_DO_ASSISTENTE, "publico", publico, pagina, porPagina],
    enabled: ativo,
    placeholderData: (anterior) => anterior,
    queryFn: async () =>
      (
        await apiClient.post<{ data: { linhas: LinhaDoDestinatario[]; total: number } }>("/api/v1/campanhas-da-casca/publico", {
          publico,
          pagina,
          porPagina,
        })
      ).data,
  });
}

export function useForaDaLista(id: string | null, ativo: boolean) {
  return useQuery({
    queryKey: [CHAVE_DO_ASSISTENTE, "fora", id],
    enabled: ativo && id !== null,
    queryFn: async () => (await apiClient.get<{ data: MotivoFora[] }>(`/api/v1/campanhas-da-casca/${id}/fora-da-lista`)).data,
  });
}

export async function contatosDaImportacao(id: string): Promise<string[]> {
  return (await apiClient.get<{ data: { ids: string[] } }>(`/api/v1/importacoes/${id}/contatos`)).data.ids;
}

const FINAIS = new Set(["concluida", "cancelada", "falhou"]);

/**
 * Acompanha a importação do .csv a cada 2 s até um estado final (N10). Em
 * "aguardando_revisao" continua: quando a revisão termina em Importações, a
 * importação conclui e os contatos entram na lista.
 */
export function useAcompanharImportacao(id: string | null) {
  return useQuery({
    queryKey: [CHAVE_DO_ASSISTENTE, "importacao", id],
    enabled: id !== null,
    queryFn: async () => (await apiClient.get<{ data: { status: string } }>(`/api/v1/importacoes/${id}`)).data,
    refetchInterval: (q) => (q.state.data && FINAIS.has(q.state.data.status) ? false : 2000),
  });
}
```

> Confira o formato da resposta do `apiClient` (`sed -n 400,445p lib/api/client.ts`): os hooks da 8A leem `r.data`, e estes seguem o mesmo molde. O `ok()` das rotas embrulha em `{ data }`.

- [ ] **Step 4: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-estado.test.ts && corepack pnpm prettier --write lib/escale/campanhas/estado-do-assistente.ts hooks/escale/useAssistenteDeCampanha.ts tests/unit/escale-assistente-estado.test.ts && corepack pnpm eslint lib/escale/campanhas/estado-do-assistente.ts hooks/escale/useAssistenteDeCampanha.ts && corepack pnpm typecheck`
Expected: PASS. Se o typecheck reclamar que o hook (cliente) importa tipos de `lib/escale/campanhas/rascunho.ts` ou `publico-banco.ts` (servidor), é só `import type`: não vai ao pacote do navegador.

- [ ] **Step 5: Commit**

```bash
git add lib/escale/campanhas/estado-do-assistente.ts hooks/escale/useAssistenteDeCampanha.ts tests/unit/escale-assistente-estado.test.ts
git commit -m "feat(escale): estado do assistente e os pedidos ao servidor (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---


### Task 11: Passo 1 — Configure a sua campanha

**Abra antes:** 018, 019, 021, 022, 023, 024, 025, 026.

**Files:**
- Create: `hooks/escale/useCamposDaCampanha.ts`, `lib/escale/campanhas/modelos-da-meta.ts`, `components/escale/campanhas/assistente/JanelaEscolherMensagem.tsx`, `VariaveisDoModelo.tsx`, `MensagemLivre.tsx`, `QuandoEnviar.tsx`, `BaseLegal.tsx`, `PassoConfigurar.tsx` (em `components/escale/campanhas/assistente/`), `tests/unit/escale-assistente-passo-1.test.tsx`

**Interfaces:**
- Consumes: as peças de molde e `PreviaDoCelular` (Task 9); `EstadoDoAssistente`, `AcaoDoAssistente`, `aoTrocarNumero`, `quandoPadrao`, `errosDoPasso` (Task 10); `NumeroDaCampanha`, `grupoDoNumero` (Task 4); `MensagemDeModelo`, `VariavelDoModelo`, `TEXTO_MAX`, `CAMPO_DA_VARIAVEL`, `NOME_MAX` (Task 1); `variaveisDoCorpo`, `trechoDaVariavel`, `contagemResolvida`, `CAMPOS_BASICOS` (Task 1); `CampoPersonalizado`, `rotuloDoCampo` (Task 9); `useModelosDeMensagem`, `ModeloAprovado` (`hooks/escale/useModelosDeMensagem.ts`); `useTextosSalvos`, `TextoSalvo` (`hooks/campanhas/useConfiguracao.ts`); `lerConteudo` (`lib/channels/template-conteudo.ts`); `useCatalogoDeCampos` (`hooks/escale/useCatalogoDeCampos.ts`); `SeletorDaCasca`, `SeletorDeDataEHora`, `JanelaDaCasca`.
- Produces:
  - `useCamposDaCampanha(): CampoPersonalizado[]`.
  - `modelos-da-meta.ts`: `ROTULO_DA_CATEGORIA`, `rotuloDaCategoria(c)`, `siglaDoIdioma(idioma)`, `rotuloDoIdioma(idioma)`, `modeloEscolhivel(m: ModeloAprovado): boolean`, `mensagemDoModelo(m: ModeloAprovado): MensagemDeModelo`.
  - `JanelaEscolherMensagem({ aberta; aoFechar; modo: "modelos" | "textos"; provider: string | null; podeSincronizar: boolean; aoEscolherModelo: (m: MensagemDeModelo) => void; aoEscolherTexto: (texto: string) => void })`.
  - `VariaveisDoModelo({ mensagem: MensagemDeModelo; personalizados; aoMudar: (variaveis: Record<string, VariavelDoModelo>) => void })`.
  - `MensagemLivre({ texto; aoMudar; personalizados; aoUsarTextoSalvo: () => void; erro?: string | null })`.
  - `QuandoEnviar({ quando: QuandoEnviar; aoMudar; erro?: string | null })`.
  - `BaseLegal({ baseLegal; lia; aoMudar: (v: { baseLegal; lia }) => void; erro?: string | null })`.
  - `PassoConfigurar({ estado; despachar: (a: AcaoDoAssistente) => void; numeros: NumeroDaCampanha[]; personalizados: CampoPersonalizado[]; podeSincronizar: boolean })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-assistente-passo-1.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/escale/useModelosDeMensagem", () => ({ useModelosDeMensagem: vi.fn() }));
vi.mock("@/hooks/campanhas/useConfiguracao", () => ({ useTextosSalvos: vi.fn() }));

import { PassoConfigurar } from "@/components/escale/campanhas/assistente/PassoConfigurar";
import { VariaveisDoModelo } from "@/components/escale/campanhas/assistente/VariaveisDoModelo";
import { useTextosSalvos } from "@/hooks/campanhas/useConfiguracao";
import { useModelosDeMensagem } from "@/hooks/escale/useModelosDeMensagem";
import type { MensagemDeModelo } from "@/lib/escale/campanhas/assistente";
import { ASSISTENTE_VAZIO, estadoInicial, type EstadoDoAssistente } from "@/lib/escale/campanhas/estado-do-assistente";
import { mensagemDoModelo, modeloEscolhivel } from "@/lib/escale/campanhas/modelos-da-meta";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";

const OFICIAL: NumeroDaCampanha = { id: "n1", nome: "Bathully", telefone: "+551153043062", conectado: true, oficial: true, provider: "p", setor: null };
const LIVRE: NumeroDaCampanha = { ...OFICIAL, id: "n2", nome: "Naiara", oficial: false };
const COMPONENTES = [{ type: "BODY", text: "Oi, {{1}}! Tudo bem?" }];
const MODELOS = [
  { name: "msg1_ancca", language: "pt_BR", status: "APPROVED", category: "MARKETING", components: COMPONENTES, slots: [{ key: "1", expects: "text", onde: "body", valueKey: "1" }] },
];

const estado = (dados: Partial<EstadoDoAssistente["dados"]> = {}): EstadoDoAssistente => ({
  ...estadoInicial(),
  dados: { ...ASSISTENTE_VAZIO, ...dados },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useModelosDeMensagem).mockReturnValue({
    modelos: MODELOS,
    carregando: false,
    recarregar: vi.fn(),
    fonte: "oficial",
    recentes: ["msg1_ancca"],
    marcarUsado: vi.fn(),
  } as never);
  vi.mocked(useTextosSalvos).mockReturnValue({ data: [{ id: "t1", name: "Boas-vindas", body: "Olá {{nome}}!", created_at: "" }], isLoading: false } as never);
});

describe("modelos da Meta", () => {
  it("modelo com mídia sem valor salvo não pode ser escolhido; com valor salvo pode", () => {
    const comMidia = { ...MODELOS[0]!, slots: [{ key: "1", expects: "image", onde: "header", valueKey: "header:1" }] };
    expect(modeloEscolhivel(comMidia)).toBe(false);
    expect(modeloEscolhivel({ ...comMidia, savedValues: { "header:1": "https://x/y.png" } })).toBe(true);
    expect(modeloEscolhivel({ ...comMidia, slots: [{ key: "1", expects: "text", onde: "header", valueKey: "header:1" }] })).toBe(false);
  });

  it("a mensagem nasce com o corpo e os valores de mídia salvos", () => {
    const m = mensagemDoModelo({ ...MODELOS[0]!, slots: [...MODELOS[0]!.slots, { key: "1", expects: "image", onde: "header", valueKey: "header:1" }], savedValues: { "header:1": "https://x/y.png" } });
    expect(m).toEqual({
      tipo: "modelo",
      nome: "msg1_ancca",
      idioma: "pt_BR",
      categoria: "MARKETING",
      corpo: "Oi, {{1}}! Tudo bem?",
      variaveis: { "header:1": { fonte: "fixo", valor: "https://x/y.png" } },
    });
  });
});

describe("PassoConfigurar", () => {
  it("título conforme o número; escolher o número despacha a troca", async () => {
    const despachar = vi.fn();
    const { rerender } = render(<PassoConfigurar estado={estado()} despachar={despachar} numeros={[OFICIAL, LIVRE]} personalizados={[]} podeSincronizar={false} />);
    expect(screen.getByRole("heading", { name: "Mensagem de WhatsApp" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Selecionar conta/ }));
    await userEvent.click(screen.getByRole("option", { name: /Bathully/ }));
    expect(despachar).toHaveBeenCalledWith({ tipo: "mudar", campos: expect.objectContaining({ numeroId: "n1" }) });
    rerender(<PassoConfigurar estado={estado({ numeroId: "n1", mensagem: { tipo: "modelo", nome: "", idioma: "", categoria: null, corpo: "", variaveis: {} } })} despachar={despachar} numeros={[OFICIAL, LIVRE]} personalizados={[]} podeSincronizar={false} />);
    expect(screen.getByRole("heading", { name: "Mensagem de WhatsApp Oficial" })).toBeInTheDocument();
  });

  it("número oficial: o modal 'Escolher mensagem' com os recentes, a prévia e o Selecionar", async () => {
    const despachar = vi.fn();
    render(
      <PassoConfigurar
        estado={estado({ numeroId: "n1", mensagem: { tipo: "modelo", nome: "", idioma: "", categoria: null, corpo: "", variaveis: {} } })}
        despachar={despachar}
        numeros={[OFICIAL]}
        personalizados={[]}
        podeSincronizar={false}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "+ Selecionar modelo existente" }));
    expect(screen.getByText("USADOS RECENTEMENTE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Selecionar" })).toBeDisabled();
    await userEvent.click(screen.getAllByRole("option", { name: /msg1_ancca/ })[0]!);
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    expect(despachar).toHaveBeenCalledWith({
      tipo: "mudar",
      campos: { mensagem: expect.objectContaining({ tipo: "modelo", nome: "msg1_ancca", corpo: "Oi, {{1}}! Tudo bem?" }) },
    });
  });

  it("número não oficial: texto livre com 'Usar texto salvo'", async () => {
    const despachar = vi.fn();
    render(<PassoConfigurar estado={estado({ numeroId: "n2" })} despachar={despachar} numeros={[LIVRE]} personalizados={[]} podeSincronizar={false} />);
    await userEvent.type(screen.getByLabelText("Mensagem"), "Oi");
    expect(despachar).toHaveBeenCalledWith({ tipo: "mudar", campos: { mensagem: { tipo: "texto", texto: "O" } } });
    await userEvent.click(screen.getByRole("button", { name: "Usar texto salvo" }));
    await userEvent.click(screen.getByRole("option", { name: /Boas-vindas/ }));
    await userEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    expect(despachar).toHaveBeenCalledWith({ tipo: "mudar", campos: { mensagem: { tipo: "texto", texto: "Olá {{nome}}!" } } });
  });

  it("'Criar agendamento' mostra a data e hora; 'Interesse legítimo' pede a LIA", async () => {
    const despachar = vi.fn();
    const { rerender } = render(<PassoConfigurar estado={estado({ numeroId: "n2" })} despachar={despachar} numeros={[LIVRE]} personalizados={[]} podeSincronizar={false} />);
    await userEvent.click(screen.getByRole("radio", { name: /Criar agendamento/ }));
    expect(despachar).toHaveBeenCalledWith({ tipo: "mudar", campos: { quando: { modo: "agendar", em: expect.any(String) } } });
    rerender(
      <PassoConfigurar
        estado={estado({ numeroId: "n2", quando: { modo: "agendar", em: "2026-11-20T15:00:00.000Z" }, baseLegal: "legitimate_interest" })}
        despachar={despachar}
        numeros={[LIVRE]}
        personalizados={[]}
        podeSincronizar={false}
      />,
    );
    expect(screen.getByText("Data e horário")).toBeInTheDocument();
    expect(screen.getByLabelText("Referência da avaliação (LIA)")).toBeInTheDocument();
  });

  it("com 'tentou', os avisos aparecem", () => {
    render(<PassoConfigurar estado={{ ...estado(), tentou: true }} despachar={vi.fn()} numeros={[LIVRE]} personalizados={[]} podeSincronizar={false} />);
    expect(screen.getByText("Escolha o dispositivo de WhatsApp.")).toBeInTheDocument();
    expect(screen.getByText("O nome da campanha deve ter pelo menos 3 caracteres.")).toBeInTheDocument();
  });
});

describe("VariaveisDoModelo", () => {
  const MODELO: MensagemDeModelo = { tipo: "modelo", nome: "m", idioma: "pt_BR", categoria: null, corpo: "Oi, {{1}}! Tudo bem? Aqui é a Naiara.", variaveis: {} };

  it("trecho, 0 de 1, valor fixo e texto alternativo", async () => {
    const aoMudar = vi.fn();
    const { rerender } = render(<VariaveisDoModelo mensagem={MODELO} personalizados={[]} aoMudar={aoMudar} />);
    expect(screen.getByText("0 de 1 resolvida")).toBeInTheDocument();
    expect(screen.getByText(/Oi,/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "Valor fixo" }));
    expect(aoMudar).toHaveBeenCalledWith({ "1": { fonte: "fixo", valor: "" } });
    rerender(
      <VariaveisDoModelo mensagem={{ ...MODELO, variaveis: { "1": { fonte: "campo", campo: "primeiro_nome", alternativo: null } } }} personalizados={[]} aoMudar={aoMudar} />,
    );
    expect(screen.getByText("1 de 1 resolvida")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "+ Definir texto alternativo" }));
    expect(screen.getByPlaceholderText("Texto usado quando o contato não tem o dado")).toBeInTheDocument();
  });
});
```

> O `useModelosDeMensagem` devolve mais campos do que o teste preenche; o `as never` cobre o resto. A `SeletorDeDataEHora` mostra a data em `dd/mm/aaaa`: o teste não depende do texto do campo, só do rótulo.

Run: `corepack pnpm vitest run tests/unit/escale-assistente-passo-1.test.tsx`
Expected: FAIL.

- [ ] **Step 2: `hooks/escale/useCamposDaCampanha.ts` e `lib/escale/campanhas/modelos-da-meta.ts`**

`hooks/escale/useCamposDaCampanha.ts`:

```ts
"use client";

import { useMemo } from "react";

import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { useT } from "@/hooks/i18n/useT";
import { CAMPO_DA_VARIAVEL } from "@/lib/escale/campanhas/assistente";
import type { CampoPersonalizado } from "@/lib/escale/campanhas/previa";

/**
 * Os campos personalizados que uma variável da campanha pode usar (fork Escale,
 * Fase 8B; N5): os do contato (`{{contato.x}}`) e os do negócio (`{{lead.x}}`)
 * do catálogo da 2C. Só os que o renderizador aceita (a chave do catálogo).
 */
export function useCamposDaCampanha(): CampoPersonalizado[] {
  const t = useT();
  const contato = useCatalogoDeCampos("contato");
  const negocio = useCatalogoDeCampos("negocio");
  return useMemo(
    () =>
      [
        ...contato.catalogo.campos.map((c) => ({ campo: `contato.${c.chave}`, rotulo: c.definicao.label })),
        ...negocio.catalogo.campos.map((c) => ({ campo: `lead.${c.chave}`, rotulo: `${c.definicao.label} (${t("negócio")})` })),
      ].filter((c) => CAMPO_DA_VARIAVEL.test(c.campo)),
    [contato.catalogo.campos, negocio.catalogo.campos, t],
  );
}
```

`lib/escale/campanhas/modelos-da-meta.ts`:

```ts
import type { ModeloAprovado } from "@/hooks/escale/useModelosDeMensagem";
import { lerConteudo } from "@/lib/channels/template-conteudo";

import type { MensagemDeModelo } from "./assistente";

/** OS MODELOS DA META NO ASSISTENTE (fork Escale, Fase 8B; 09-023 a 09-025; N5). */
export const ROTULO_DA_CATEGORIA: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utilidade",
  AUTHENTICATION: "Autenticação",
};
export const rotuloDaCategoria = (c: string | null | undefined): string =>
  c ? (ROTULO_DA_CATEGORIA[c.toUpperCase()] ?? c) : "";

/** "pt_BR" → "BR" (a etiqueta pequena ao lado do nome, 023). */
export const siglaDoIdioma = (idioma: string): string => (idioma.split(/[_-]/)[1] ?? idioma).toUpperCase();

const IDIOMAS: Record<string, string> = { pt_BR: "Português (BR)", pt_PT: "Português (PT)", en_US: "Inglês (EUA)", es: "Espanhol" };
export const rotuloDoIdioma = (idioma: string): string => IDIOMAS[idioma] ?? idioma;

/**
 * Entra na campanha o modelo cujas variáveis de texto estão no CORPO (`{{n}}`)
 * e cujos slots de mídia têm o link salvo (`savedValues`). Variável de texto no
 * cabeçalho ou nos botões fica para depois (declarado no plano).
 */
export function modeloEscolhivel(m: ModeloAprovado): boolean {
  return (m.slots ?? []).every((s) =>
    s.expects === "text" ? /^\d+$/.test(s.valueKey) : Boolean((m.savedValues ?? {})[s.valueKey]?.trim()),
  );
}

export function mensagemDoModelo(m: ModeloAprovado): MensagemDeModelo {
  const variaveis: MensagemDeModelo["variaveis"] = {};
  for (const s of m.slots ?? []) {
    const salvo = (m.savedValues ?? {})[s.valueKey]?.trim();
    if (s.expects !== "text" && salvo) variaveis[s.valueKey] = { fonte: "fixo", valor: salvo };
  }
  return {
    tipo: "modelo",
    nome: m.name,
    idioma: m.language,
    categoria: m.category ?? null,
    corpo: lerConteudo(m.components ?? []).body?.trim() ?? "",
    variaveis,
  };
}
```

> `lerConteudo(components).body` é o texto do corpo (`lib/channels/template-conteudo.ts`). O teste monta `components` como `[{ type: "BODY", text: … }]`, o formato da Meta; se o `lerConteudo` pedir outro formato (`sed -n 85,100p lib/channels/template-conteudo.ts`), ajuste só o `COMPONENTES` do teste.

- [ ] **Step 3: `components/escale/campanhas/assistente/JanelaEscolherMensagem.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CLASSE_DO_TOM } from "@/lib/escale/campanhas/cores";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useTextosSalvos } from "@/hooks/campanhas/useConfiguracao";
import { useModelosDeMensagem, type ModeloAprovado } from "@/hooks/escale/useModelosDeMensagem";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import type { MensagemDeModelo } from "@/lib/escale/campanhas/assistente";
import { mensagemDoModelo, modeloEscolhivel, rotuloDaCategoria, siglaDoIdioma } from "@/lib/escale/campanhas/modelos-da-meta";
import { Check, HelpCircle, Pencil, Plus, RefreshCw, Search } from "@/lib/ui/icons-da-casca";
import { lerConteudo } from "@/lib/channels/template-conteudo";
import { cn } from "@/lib/utils";

import { BOTAO_CONTORNADO, BOTAO_DA_MARCA } from "../molde/estilos";

const TODAS = "todas";

/**
 * "ESCOLHER MENSAGEM" (fork Escale, Fase 8B; 09-023, 09-024; N5). Modo
 * "modelos": os modelos aprovados do número (os "usados recentemente" no topo,
 * busca e categoria, prévia, "Aprovado", "Editar modelo"). Modo "textos": os
 * textos salvos da Configuração de campanhas, no mesmo molde.
 */
export function JanelaEscolherMensagem({
  aberta,
  aoFechar,
  modo,
  provider,
  podeSincronizar,
  aoEscolherModelo,
  aoEscolherTexto,
}: {
  aberta: boolean;
  aoFechar: () => void;
  modo: "modelos" | "textos";
  provider: string | null;
  podeSincronizar: boolean;
  aoEscolherModelo: (m: MensagemDeModelo) => void;
  aoEscolherTexto: (texto: string) => void;
}) {
  const t = useT();
  const { modelos, recarregar, recentes, marcarUsado } = useModelosDeMensagem(modo === "modelos" ? provider : null);
  const textos = useTextosSalvos();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>(TODAS);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (modo === "textos") {
      return (textos.data ?? [])
        .filter((x) => !termo || x.name.toLowerCase().includes(termo))
        .map((x) => ({ id: x.id, nome: x.name, corpo: x.body, modelo: null as ModeloAprovado | null }));
    }
    return modelos
      .filter((m) => (!termo || m.name.toLowerCase().includes(termo)) && (categoria === TODAS || (m.category ?? "").toUpperCase() === categoria))
      .map((m) => ({ id: `${m.name}|${m.language}`, nome: m.name, corpo: lerConteudo(m.components ?? []).body ?? "", modelo: m }));
  }, [modo, textos.data, modelos, busca, categoria]);

  const atual = itens.find((i) => i.id === escolhido) ?? null;
  const podeEscolher = atual !== null && (atual.modelo === null || modeloEscolhivel(atual.modelo));
  const recentesDaLista = modo === "modelos" ? itens.filter((i) => recentes.includes(i.nome)) : [];
  const categorias = [...new Set(modelos.map((m) => (m.category ?? "").toUpperCase()).filter(Boolean))];

  const selecionar = () => {
    if (!atual || !podeEscolher) return;
    if (atual.modelo) {
      marcarUsado(atual.modelo.name);
      aoEscolherModelo(mensagemDoModelo(atual.modelo));
    } else {
      aoEscolherTexto(atual.corpo);
    }
    aoFechar();
  };

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      await apiClient.post("/api/v1/channels/templates", {});
      recarregar();
    } finally {
      setSincronizando(false);
    }
  };

  const linha = (i: (typeof itens)[number]) => (
    <button
      key={`${i.id}-${recentesDaLista.includes(i) ? "r" : "t"}`}
      type="button"
      role="option"
      aria-selected={i.id === escolhido}
      onClick={() => setEscolhido(i.id)}
      className={cn("flex w-full items-center gap-2 rounded-[6px] px-2 py-2 text-left hover:bg-casca-busca", i.id === escolhido && "bg-casca-busca")}
    >
      <span className={cn("truncate text-[13px] font-semibold", i.id === escolhido ? "text-casca-marca" : "text-casca-texto")}>{i.nome}</span>
      {i.modelo && (
        <>
          <span className="text-[9px] font-semibold text-casca-suave">{siglaDoIdioma(i.modelo.language)}</span>
          {i.modelo.category && (
            <span className="rounded-[4px] bg-(--escale-categoria-fundo) px-1.5 py-0.5 text-[11px] text-(--escale-categoria-texto)">
              {t(rotuloDaCategoria(i.modelo.category))}
            </span>
          )}
        </>
      )}
      {i.id === escolhido && <Check className="ml-auto size-3.5 text-(--escale-status-ganho)" aria-hidden />}
    </button>
  );

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(888px,calc(100vw-2rem))] max-w-none gap-0 p-0">
      <div className="flex h-[60px] items-center gap-2 border-b border-casca-divisoria px-5 pr-14">
        <DialogTitle className="text-[15px] font-medium text-casca-texto">
          {modo === "modelos" ? t("Escolher mensagem") : t("Escolher texto salvo")}
        </DialogTitle>
        <HelpCircle className="size-3.5 text-casca-marca" aria-hidden />
        {modo === "modelos" && (
          <span className="ml-auto flex items-center gap-2">
            {podeSincronizar && (
              <button type="button" onClick={() => void sincronizar()} disabled={sincronizando} aria-label={t("Sincronizar modelos")} className="flex size-8 items-center justify-center rounded-[6px] text-casca-texto-2 hover:bg-casca-busca">
                <RefreshCw className={cn("size-4", sincronizando && "animate-spin")} aria-hidden />
              </button>
            )}
            <Link href="/app/templates" className={BOTAO_DA_MARCA}>
              <Plus className="size-3.5" aria-hidden />
              {t("Novo modelo")}
            </Link>
          </span>
        )}
      </div>
      <div className="flex h-[300px]">
        <div className="flex w-[420px] shrink-0 flex-col border-r border-casca-divisoria p-4">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">{t("Pesquisar por...")}</span>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Pesquisar por...")} className="h-8 w-full rounded-[6px] bg-casca-busca pr-8 pl-3 text-[13px] placeholder:text-casca-meta focus-visible:outline-casca-marca" />
              <Search className="absolute top-2 right-2 size-4 text-casca-suave" aria-hidden />
            </label>
            {modo === "modelos" && (
              <SeletorDaCasca
                valor={categoria}
                aoMudar={(v) => setCategoria(v || TODAS)}
                aria-label={t("Todas as categorias")}
                opcoes={[{ valor: TODAS, rotulo: t("Todas as categorias") }, ...categorias.map((c) => ({ valor: c, rotulo: t(rotuloDaCategoria(c)) }))]}
              />
            )}
          </div>
          <div role="listbox" aria-label={modo === "modelos" ? t("Escolher mensagem") : t("Escolher texto salvo")} className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {recentesDaLista.length > 0 && (
              <>
                <p className="px-2 pt-1 pb-1 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">{t("USADOS RECENTEMENTE")}</p>
                {recentesDaLista.map(linha)}
              </>
            )}
            <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
              {modo === "modelos" ? t("TODOS OS MODELOS") : t("TEXTOS SALVOS")}
            </p>
            {itens.length === 0 ? <p className="px-2 py-2 text-[13px] text-casca-suave">{modo === "modelos" ? t("Nenhum modelo aprovado") : t("Nenhum texto salvo")}</p> : itens.map(linha)}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto p-4">
          {!atual ? (
            <p className="flex h-full items-center justify-center px-10 text-center text-[13px] text-casca-texto-2">
              {t("Selecione um modelo de mensagem à sua esquerda para enviar.")}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-casca-texto">{atual.nome}</span>
                {atual.modelo && <span className={cn("rounded-[4px] px-1.5 py-0.5 text-[11px]", CLASSE_DO_TOM.verde)}>{t("Aprovado")}</span>}
                {atual.modelo && (
                  <Link href="/app/templates" className="ml-auto flex items-center gap-1 text-[12px] font-medium text-casca-marca">
                    <Pencil className="size-3" aria-hidden />
                    {t("Editar modelo")}
                  </Link>
                )}
              </div>
              {atual.modelo && (
                <p className="mt-3 text-[13px] text-casca-texto-2">
                  {t("As variáveis serão preenchidas com os dados de cada contato no envio.")}{" "}
                  <button type="button" onClick={selecionar} disabled={!podeEscolher} className="font-semibold text-casca-marca">
                    {t("Mapear variáveis")}
                  </button>
                </p>
              )}
              {atual.modelo && !modeloEscolhivel(atual.modelo) && (
                <p role="alert" className="mt-2 text-[12px] text-casca-alerta">
                  {t("Este modelo tem mídia sem link salvo ou variável fora do corpo. Ajuste em Modelos antes de usar na campanha.")}
                </p>
              )}
              <div className="mt-2 rounded-[8px] bg-(--escale-modelo-balao) p-3 text-[13px] whitespace-pre-wrap text-casca-texto">{atual.corpo}</div>
            </>
          )}
        </div>
      </div>
      <div className="flex h-16 items-center justify-end gap-2 border-t border-casca-divisoria px-5">
        <button type="button" onClick={aoFechar} className={BOTAO_CONTORNADO}>
          {t("Cancelar")}
        </button>
        <button type="button" onClick={selecionar} disabled={!podeEscolher} className={BOTAO_DA_MARCA}>
          {t("Selecionar")}
        </button>
      </div>
    </JanelaDaCasca>
  );
}
```

> `CLASSE_DO_TOM` é da 8A (`lib/escale/campanhas/cores.ts`). O `↻` só aparece para admin (`POST /api/v1/channels/templates` exige admin). "Todas as pastas" e "Com Flow" não entram (N5).

- [ ] **Step 4: `VariaveisDoModelo.tsx`, `MensagemLivre.tsx`, `QuandoEnviar.tsx` e `BaseLegal.tsx`**

`components/escale/campanhas/assistente/VariaveisDoModelo.tsx`:

```tsx
"use client";

import { useState } from "react";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { MensagemDeModelo, VariavelDoModelo } from "@/lib/escale/campanhas/assistente";
import { CAMPOS_BASICOS, contagemResolvida, trechoDaVariavel, variaveisDoCorpo } from "@/lib/escale/campanhas/modelo";
import type { CampoPersonalizado } from "@/lib/escale/campanhas/previa";
import { cn } from "@/lib/utils";

import { CAMPO } from "../molde/estilos";

/**
 * "VARIÁVEIS DO MODELO" (fork Escale, Fase 8B; 09-025, 09-026; N5, N6): para
 * cada `{{n}}` do corpo, o trecho em volta, "Campo do CRM" ou "Valor fixo", e o
 * texto alternativo opcional; em cima, "N de M resolvida(s)".
 */
export function VariaveisDoModelo({
  mensagem,
  personalizados,
  aoMudar,
}: {
  mensagem: MensagemDeModelo;
  personalizados: readonly CampoPersonalizado[];
  aoMudar: (variaveis: Record<string, VariavelDoModelo>) => void;
}) {
  const t = useT();
  const chaves = variaveisDoCorpo(mensagem.corpo);
  const [comAlternativo, setComAlternativo] = useState<ReadonlySet<string>>(
    () => new Set(Object.entries(mensagem.variaveis).flatMap(([k, v]) => (v.fonte === "campo" && v.alternativo ? [k] : []))),
  );
  if (chaves.length === 0) return null;
  const { feitas, total } = contagemResolvida(chaves, mensagem.variaveis);
  const campos = [...CAMPOS_BASICOS.map((c) => ({ valor: c.campo, rotulo: t(c.rotulo) })), ...personalizados.map((c) => ({ valor: c.campo, rotulo: c.rotulo }))];
  const mudar = (chave: string, v: VariavelDoModelo) => aoMudar({ ...mensagem.variaveis, [chave]: v });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-medium text-casca-texto">{t("Variáveis do modelo")}</span>
        <span className="text-[12px] text-casca-suave">
          {(total === 1 ? t("{n} de {m} resolvida") : t("{n} de {m} resolvidas")).replace("{n}", String(feitas)).replace("{m}", String(total))}
        </span>
      </div>
      <div className="space-y-3">
        {chaves.map((chave) => {
          const v = mensagem.variaveis[chave];
          const trecho = trechoDaVariavel(mensagem.corpo, chave);
          const [antes, depois] = trecho.split(`{{${chave}}}`);
          return (
            <div key={chave} className="rounded-[8px] border border-casca-borda p-3">
              <p className="text-[13px] text-casca-texto">
                “{antes}
                <span className="font-semibold text-casca-marca">{`{{${chave}}}`}</span>
                {depois}”
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div role="radiogroup" aria-label={t("Origem do valor")} className="flex h-7 items-center rounded-[6px] bg-casca-busca p-0.5 text-[12px]">
                  {(["campo", "fixo"] as const).map((fonte) => (
                    <button
                      key={fonte}
                      type="button"
                      role="radio"
                      aria-checked={(v?.fonte ?? "campo") === fonte}
                      onClick={() => mudar(chave, fonte === "fixo" ? { fonte: "fixo", valor: "" } : { fonte: "campo", campo: "primeiro_nome", alternativo: null })}
                      className={cn("h-6 rounded-[5px] px-2.5", (v?.fonte ?? "campo") === fonte ? "bg-surface text-casca-texto shadow-xs" : "text-casca-texto-2")}
                    >
                      {fonte === "campo" ? t("Campo do CRM") : t("Valor fixo")}
                    </button>
                  ))}
                </div>
                {v?.fonte === "fixo" ? (
                  <input
                    aria-label={t("Valor fixo")}
                    value={v.valor}
                    onChange={(e) => mudar(chave, { fonte: "fixo", valor: e.target.value })}
                    className={cn(CAMPO, "h-7 w-60")}
                  />
                ) : (
                  <SeletorDaCasca
                    valor={v?.fonte === "campo" ? v.campo : ""}
                    opcoes={campos}
                    vazio={t("Selecione...")}
                    aria-label={t("Campo do CRM")}
                    aoMudar={(campo) => campo && mudar(chave, { fonte: "campo", campo, alternativo: v?.fonte === "campo" ? v.alternativo : null })}
                    className="h-7 w-56"
                  />
                )}
              </div>
              {v?.fonte !== "fixo" &&
                (comAlternativo.has(chave) ? (
                  <input
                    aria-label={t("Texto alternativo")}
                    placeholder={t("Texto usado quando o contato não tem o dado")}
                    value={v?.fonte === "campo" ? (v.alternativo ?? "") : ""}
                    onChange={(e) =>
                      mudar(chave, { fonte: "campo", campo: v?.fonte === "campo" ? v.campo : "primeiro_nome", alternativo: e.target.value || null })
                    }
                    className={cn(CAMPO, "mt-2 h-7")}
                  />
                ) : (
                  <button type="button" onClick={() => setComAlternativo(new Set([...comAlternativo, chave]))} className="mt-2 text-[11px] font-medium text-casca-marca">
                    {t("+ Definir texto alternativo")}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

`components/escale/campanhas/assistente/MensagemLivre.tsx`:

```tsx
"use client";

import { useId, useRef, useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { TEXTO_MAX } from "@/lib/escale/campanhas/assistente";
import { CAMPOS_BASICOS, tokenDoCampo } from "@/lib/escale/campanhas/modelo";
import type { CampoPersonalizado } from "@/lib/escale/campanhas/previa";
import { Braces, FileText } from "@/lib/ui/icons-da-casca";

import { ROTULO } from "../molde/estilos";

/** A MENSAGEM DE TEXTO LIVRE (fork Escale, Fase 8B; N5): número não oficial. */
export function MensagemLivre({
  texto,
  aoMudar,
  personalizados,
  aoUsarTextoSalvo,
  erro,
}: {
  texto: string;
  aoMudar: (texto: string) => void;
  personalizados: readonly CampoPersonalizado[];
  aoUsarTextoSalvo: () => void;
  erro?: string | null;
}) {
  const t = useT();
  const id = useId();
  const campo = useRef<HTMLTextAreaElement>(null);
  const [aberto, setAberto] = useState(false);
  const inserir = (token: string) => {
    const el = campo.current;
    const ini = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? texto.length;
    aoMudar(`${texto.slice(0, ini)}${token}${texto.slice(fim)}`.slice(0, TEXTO_MAX));
    setAberto(false);
  };
  const opcoes = [...CAMPOS_BASICOS.map((c) => ({ campo: c.campo, rotulo: t(c.rotulo) })), ...personalizados];
  return (
    <div>
      <label htmlFor={id} className={ROTULO}>
        {t("Mensagem")}
      </label>
      <textarea
        id={id}
        ref={campo}
        value={texto}
        maxLength={TEXTO_MAX}
        onChange={(e) => aoMudar(e.target.value)}
        aria-invalid={erro ? true : undefined}
        className="h-36 w-full resize-y rounded-[6px] border border-transparent bg-casca-busca p-3 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:border-casca-marca focus-visible:outline-none"
      />
      <div className="mt-1.5 flex items-center gap-3 text-[12px]">
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <button type="button" className="flex items-center gap-1 font-medium text-casca-marca">
              <Braces className="size-3.5" aria-hidden />
              {t("Inserir variável")}
            </button>
          </PopoverTrigger>
          <PainelSuspenso sideOffset={6} className="max-h-64 w-56 overflow-y-auto py-1">
            {opcoes.map((o) => (
              <button key={o.campo} type="button" onClick={() => inserir(tokenDoCampo(o.campo))} className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-casca-busca">
                {o.rotulo}
              </button>
            ))}
          </PainelSuspenso>
        </Popover>
        <button type="button" onClick={aoUsarTextoSalvo} className="flex items-center gap-1 font-medium text-casca-marca">
          <FileText className="size-3.5" aria-hidden />
          {t("Usar texto salvo")}
        </button>
        <span className="ml-auto text-[11px] text-casca-meta">{`${texto.length}/${TEXTO_MAX}`}</span>
      </div>
      {erro && (
        <p role="alert" className="mt-1 text-[11px] text-casca-alerta">
          {erro}
        </p>
      )}
    </div>
  );
}
```

`components/escale/campanhas/assistente/QuandoEnviar.tsx`:

```tsx
"use client";

import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { useT } from "@/hooks/i18n/useT";
import type { QuandoEnviar as Quando } from "@/lib/escale/campanhas/assistente";
import { quandoPadrao } from "@/lib/escale/campanhas/estado-do-assistente";

import { CartaoDeEscolha } from "../molde/CartaoDeEscolha";
import { ROTULO } from "../molde/estilos";

/** "QUANDO ENVIAR" (fork Escale, Fase 8B; 09-021, 09-022; N19: o seletor da casca, nunca o nativo). */
export function QuandoEnviar({ quando, aoMudar, erro }: { quando: Quando; aoMudar: (q: Quando) => void; erro?: string | null }) {
  const t = useT();
  return (
    <div>
      <span className={ROTULO}>{t("Quando enviar")}</span>
      <div role="radiogroup" aria-label={t("Quando enviar")} className="grid grid-cols-2 gap-3">
        <CartaoDeEscolha selecionado={quando.modo === "agora"} aoEscolher={() => aoMudar({ modo: "agora" })} titulo={t("Enviar agora")} descricao={t("A campanha entra na fila imediatamente.")} />
        <CartaoDeEscolha
          selecionado={quando.modo === "agendar"}
          aoEscolher={() => quando.modo !== "agendar" && aoMudar({ modo: "agendar", em: quandoPadrao(new Date()) })}
          titulo={t("Criar agendamento")}
          descricao={t("Escolha data e horário para o disparo.")}
        />
      </div>
      {quando.modo === "agendar" && (
        <div className="mt-4">
          <span className={ROTULO}>{t("Data e horário")}</span>
          <SeletorDeDataEHora valor={new Date(quando.em)} aoMudar={(d) => aoMudar({ modo: "agendar", em: d.toISOString() })} />
        </div>
      )}
      {erro && (
        <p role="alert" className="mt-1.5 text-[11px] text-casca-alerta">
          {erro}
        </p>
      )}
    </div>
  );
}
```

`components/escale/campanhas/assistente/BaseLegal.tsx`:

```tsx
"use client";

import { useId } from "react";

import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";

import { CartaoDeEscolha } from "../molde/CartaoDeEscolha";
import { CAMPO, ROTULO } from "../molde/estilos";

type Base = "consent" | "legitimate_interest";

/** A BASE LEGAL (fork Escale, Fase 8B; PRD B16): obrigatória, como no original (LGPD). */
export function BaseLegal({
  baseLegal,
  lia,
  aoMudar,
  erro,
}: {
  baseLegal: Base;
  lia: string | null;
  aoMudar: (v: { baseLegal: Base; lia: string | null }) => void;
  erro?: string | null;
}) {
  const t = useT();
  const id = useId();
  return (
    <div>
      <span className={ROTULO}>{t("Base legal")}</span>
      <div role="radiogroup" aria-label={t("Base legal")} className="grid grid-cols-2 gap-3">
        <CartaoDeEscolha selecionado={baseLegal === "consent"} aoEscolher={() => aoMudar({ baseLegal: "consent", lia: null })} titulo={t("Consentimento")} descricao={t("A pessoa autorizou receber mensagens.")} />
        <CartaoDeEscolha
          selecionado={baseLegal === "legitimate_interest"}
          aoEscolher={() => aoMudar({ baseLegal: "legitimate_interest", lia })}
          titulo={t("Interesse legítimo")}
          descricao={t("Uma avaliação (LIA) justifica o contato.")}
        />
      </div>
      {baseLegal === "legitimate_interest" && (
        <div className="mt-4">
          <label htmlFor={id} className={ROTULO}>
            {t("Referência da avaliação (LIA)")}
          </label>
          <input id={id} value={lia ?? ""} maxLength={120} onChange={(e) => aoMudar({ baseLegal, lia: e.target.value })} className={cn(CAMPO, erro && "border-casca-alerta")} />
          {erro && (
            <p role="alert" className="mt-1.5 text-[11px] text-casca-alerta">
              {erro}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: `components/escale/campanhas/assistente/PassoConfigurar.tsx`**

```tsx
"use client";

import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { NOME_MAX, type MensagemDeModelo } from "@/lib/escale/campanhas/assistente";
import { aoTrocarNumero, errosDoPasso, type AcaoDoAssistente, type EstadoDoAssistente } from "@/lib/escale/campanhas/estado-do-assistente";
import { rotuloDaCategoria, rotuloDoIdioma, siglaDoIdioma } from "@/lib/escale/campanhas/modelos-da-meta";
import { grupoDoNumero, type NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";
import type { CampoPersonalizado } from "@/lib/escale/campanhas/previa";
import { MessageSquare, SquarePen, Trash2 } from "@/lib/ui/icons-da-casca";

import { CampoComContador } from "../molde/CampoComContador";
import { ROTULO, SUBTITULO_DO_PASSO, TITULO_DO_PASSO } from "../molde/estilos";
import { SeletorDeNumero } from "../molde/SeletorDeNumero";
import { BaseLegal } from "./BaseLegal";
import { JanelaEscolherMensagem } from "./JanelaEscolherMensagem";
import { MensagemLivre } from "./MensagemLivre";
import { QuandoEnviar } from "./QuandoEnviar";
import { VariaveisDoModelo } from "./VariaveisDoModelo";

const MODELO_VAZIO: MensagemDeModelo = { tipo: "modelo", nome: "", idioma: "", categoria: null, corpo: "", variaveis: {} };

/** PASSO 1 — "Configure a sua campanha" (fork Escale, Fase 8B; 09-018 a 09-026; N3–N6, N19). */
export function PassoConfigurar({
  estado,
  despachar,
  numeros,
  personalizados,
  podeSincronizar,
}: {
  estado: EstadoDoAssistente;
  despachar: (a: AcaoDoAssistente) => void;
  numeros: NumeroDaCampanha[];
  personalizados: CampoPersonalizado[];
  podeSincronizar: boolean;
}) {
  const t = useT();
  const d = estado.dados;
  const numero = numeros.find((n) => n.id === d.numeroId) ?? null;
  const erros = estado.tentou ? errosDoPasso(0, d, { numero, agora: new Date() }) : {};
  const [janela, setJanela] = useState<"modelos" | "textos" | null>(null);
  const mudar = (campos: Partial<typeof d>) => despachar({ tipo: "mudar", campos });
  const visiveis = [...numeros]
    .filter((n) => n.conectado || n.id === d.numeroId)
    .sort((a, b) => Number(b.oficial) - Number(a.oficial))
    .map((n) => ({ ...n, grupo: t(grupoDoNumero(n)) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className={TITULO_DO_PASSO}>{numero?.oficial ? t("Mensagem de WhatsApp Oficial") : t("Mensagem de WhatsApp")}</h1>
        <p className={SUBTITULO_DO_PASSO}>{t("Defina os dados da campanha e escolha o modelo de mensagem que será enviado.")}</p>
      </div>

      <CampoComContador rotulo={t("Nome da campanha")} valor={d.nome} aoMudar={(nome) => mudar({ nome })} maximo={NOME_MAX} placeholder={t("Ex: Reativação de junho")} erro={erros.nome ? t(erros.nome) : null} />

      <div>
        <span className={ROTULO}>{t("Dispositivo de WhatsApp")}</span>
        <SeletorDeNumero
          numeros={visiveis}
          valor={d.numeroId || null}
          aoMudar={(id) => {
            const escolhido = numeros.find((n) => n.id === id);
            if (escolhido) mudar(aoTrocarNumero(d, escolhido));
          }}
        />
        {erros.numeroId && (
          <p role="alert" className="mt-1.5 text-[11px] text-casca-alerta">
            {t(erros.numeroId)}
          </p>
        )}
      </div>

      {d.mensagem.tipo === "modelo" ? (
        <div className="space-y-4">
          <div>
            <span className={ROTULO}>{t("Modelo de mensagem")}</span>
            {d.mensagem.nome === "" ? (
              <button type="button" onClick={() => setJanela("modelos")} className="flex h-11 w-full items-center justify-center rounded-[8px] bg-casca-busca text-[13px] font-medium text-casca-marca">
                {t("+ Selecionar modelo existente")}
              </button>
            ) : (
              <div className="flex h-16 items-center gap-3 rounded-[8px] border border-casca-borda px-3">
                <span aria-hidden className="flex size-9 items-center justify-center rounded-[8px] bg-casca-marca-suave text-casca-marca">
                  <MessageSquare className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-casca-texto uppercase">{d.mensagem.nome}</span>
                  <span className="block text-[12px] text-casca-suave">
                    {[d.mensagem.categoria ? t(rotuloDaCategoria(d.mensagem.categoria)) : null, `${siglaDoIdioma(d.mensagem.idioma)} ${t(rotuloDoIdioma(d.mensagem.idioma))}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <button type="button" onClick={() => setJanela("modelos")} aria-label={t("Editar modelo")} className="flex size-7 items-center justify-center rounded-[6px] text-casca-texto-2 hover:bg-casca-busca">
                  <SquarePen className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => mudar({ mensagem: MODELO_VAZIO })} aria-label={t("Remover selecionado")} className="flex size-7 items-center justify-center rounded-[6px] text-casca-texto-2 hover:bg-casca-busca">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
          {d.mensagem.nome !== "" && (
            <VariaveisDoModelo
              mensagem={d.mensagem}
              personalizados={personalizados}
              aoMudar={(variaveis) => d.mensagem.tipo === "modelo" && mudar({ mensagem: { ...d.mensagem, variaveis } })}
            />
          )}
          {erros.mensagem && (
            <p role="alert" className="text-[11px] text-casca-alerta">
              {t(erros.mensagem)}
            </p>
          )}
        </div>
      ) : (
        <MensagemLivre
          texto={d.mensagem.texto}
          aoMudar={(texto) => mudar({ mensagem: { tipo: "texto", texto } })}
          personalizados={personalizados}
          aoUsarTextoSalvo={() => setJanela("textos")}
          erro={erros.mensagem ? t(erros.mensagem) : null}
        />
      )}

      <QuandoEnviar quando={d.quando} aoMudar={(quando) => mudar({ quando })} erro={erros.quando ? t(erros.quando) : null} />

      <BaseLegal baseLegal={d.baseLegal} lia={d.lia} aoMudar={(v) => mudar(v)} erro={erros.lia ? t(erros.lia) : null} />

      {janela && (
        <JanelaEscolherMensagem
          aberta
          aoFechar={() => setJanela(null)}
          modo={janela}
          provider={numero?.provider ?? null}
          podeSincronizar={podeSincronizar}
          aoEscolherModelo={(m) => mudar({ mensagem: m })}
          aoEscolherTexto={(texto) => mudar({ mensagem: { tipo: "texto", texto } })}
        />
      )}
    </div>
  );
}
```

> Ícone novo usado aqui e no `MensagemLivre`: `Braces` e `FileText` já estão em `lib/ui/icons-da-casca.ts`; `SquarePen`, `Trash2`, `MessageSquare` também.

- [ ] **Step 6: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-passo-1.test.tsx tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts && corepack pnpm prettier --write hooks/escale/useCamposDaCampanha.ts lib/escale/campanhas/modelos-da-meta.ts components/escale/campanhas/assistente tests/unit/escale-assistente-passo-1.test.tsx && corepack pnpm eslint hooks/escale/useCamposDaCampanha.ts lib/escale/campanhas/modelos-da-meta.ts components/escale/campanhas/assistente && corepack pnpm typecheck`
Expected: PASS. Se a `controle-decorativo` acusar o `HelpCircle` do título do modal (ícone sem ação), ele é `aria-hidden` e decorativo, como o "?" do 023; se a cerca exigir, troque por `<AjudaDaCasca texto={t("Os modelos aprovados pela Meta para este número.")} />` (a página monta o `TooltipProvider`, N19).

- [ ] **Step 7: Commit**

```bash
git add hooks/escale/useCamposDaCampanha.ts lib/escale/campanhas/modelos-da-meta.ts components/escale/campanhas/assistente tests/unit/escale-assistente-passo-1.test.tsx
git commit -m "feat(escale): passo 1 do assistente — nome, dispositivo, modelo ou texto, quando enviar e base legal (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---


### Task 12: Passo 2 — Escolha seus contatos

**Abra antes:** 027 a 037.

**Files:**
- Create: `components/escale/campanhas/assistente/JanelaSelecionarContatos.tsx`, `JanelaImportarCsv.tsx`, `ListaDeDestinatarios.tsx`, `PassoContatos.tsx` (em `components/escale/campanhas/assistente/`), `tests/unit/escale-assistente-passo-2.test.tsx`

**Interfaces:**
- Consumes: `PublicoDaCampanha`, `SelecaoDoPublico`, `PUBLICO_VAZIO` (Task 1); `comAvulsos`, `comSelecao`, `semContato`, `publicoVazio` (Task 1); `LinhaDoDestinatario` (Task 3); `EstadoDoAssistente`, `AcaoDoAssistente`, `errosDoPasso` (Task 10); `usePaginaDoPublico`, `useAcompanharImportacao`, `contatosDaImportacao` (Task 10); da 2A/2B: `useListaDeContatos` (`hooks/escale/useListaDeContatos.ts`), `PainelDeFiltros`, `SeletorDeFiltros`, `useFiltrosDaLista`/`useMudarFiltroDaLista`/`useExcluirFiltroDaLista`, `Selecao`, `SEM_SELECAO`, `SELECIONAR_TODOS`, `alternarLinha`, `linhaMarcada`, `estadoDaPagina`, `totalSelecionado`, `alvoDaSelecao`, `filtrosDaUrl`, `filtrosParaUrl`, `POR_PAGINA`, `VisaoDeContatos`, `OpcoesDoFiltro`, `PaginacaoDaCasca`, `CaixaDaCasca`, `ChipDaTag`, `FotoDaPessoa`, `JanelaNovoContato` + `OrigemParaCriar`; da 2F: `JanelaDeImportacao`, `csvDeExemplo`, `nomeDoExemplo`.
- Produces:
  - `JanelaSelecionarContatos({ aberta; aoFechar; inicial: SelecaoDoPublico | null; opcoesDoFiltro: OpcoesDoFiltro; aoAdicionar: (s: SelecaoDoPublico) => void })`.
  - `JanelaImportarCsv({ aberta; aoFechar; aoImportar: (importacaoId: string) => void })`.
  - `ListaDeDestinatarios({ publico; aoRemover: (id) => void; somenteLeitura?: boolean })`.
  - `PassoContatos({ estado; despachar; numeroOficial: boolean; origens: OrigemParaCriar[]; opcoesDoFiltro: OpcoesDoFiltro })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-assistente-passo-2.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/hooks/escale/useListaDeContatos", () => ({ useListaDeContatos: vi.fn() }));
vi.mock("@/hooks/escale/useFiltrosDaLista", () => ({
  useFiltrosDaLista: () => ({ data: [] }),
  useMudarFiltroDaLista: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useExcluirFiltroDaLista: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/escale/useAssistenteDeCampanha", () => ({
  usePaginaDoPublico: vi.fn(),
  useAcompanharImportacao: () => ({ data: undefined }),
  contatosDaImportacao: vi.fn(),
}));
vi.mock("@/components/escale/importacao/JanelaDeImportacao", () => ({ JanelaDeImportacao: () => null }));
vi.mock("@/components/escale/contatos/JanelaNovoContato", () => ({
  JanelaNovoContato: ({ aberta, aoCriar }: { aberta: boolean; aoCriar?: (c: { id: string; nome: string }) => void }) =>
    aberta ? (
      <button type="button" onClick={() => aoCriar?.({ id: "novo", nome: "Novo" })}>
        criar
      </button>
    ) : null,
}));

import { JanelaSelecionarContatos } from "@/components/escale/campanhas/assistente/JanelaSelecionarContatos";
import { PassoContatos } from "@/components/escale/campanhas/assistente/PassoContatos";
import { usePaginaDoPublico } from "@/hooks/escale/useAssistenteDeCampanha";
import { useListaDeContatos } from "@/hooks/escale/useListaDeContatos";
import { ASSISTENTE_VAZIO, estadoInicial } from "@/lib/escale/campanhas/estado-do-assistente";
import { OPCOES_VAZIAS } from "@/lib/escale/contatos/opcoes-do-filtro";

const comConsulta = (ui: ReactNode) => <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;

const linhaDeContato = (id: string, nome: string, telefone: string | null) => ({
  id,
  nome,
  display_name: null,
  telefone,
  email: null,
  instagram: null,
  tags: ["calculadora"],
  tem_foto: false,
  conversa_id: null,
  negocios: 0,
  negocio_unico: null,
  status: null,
  ultima_atividade: null,
  criado_em: "2026-10-01T00:00:00Z",
  origem: null,
  nascimento: null,
  links: {},
  empresa: null,
  campos: {},
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useListaDeContatos).mockReturnValue({
    data: { linhas: [linhaDeContato("c1", "Anderson Flavio", "+5581997893443"), linhaDeContato("c2", "Sem Fone", null)], total: 44520, pagina: 1, porPagina: 10 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
  vi.mocked(usePaginaDoPublico).mockReturnValue({
    data: { linhas: [{ id: "c1", nome: "Fernanda Koinwascki", telefone: "+5549984086513", email: "fernanda@x.com", tags: ["calculadora"] }], total: 1 },
    isLoading: false,
    isError: false,
  } as never);
});

describe("PassoContatos", () => {
  it("vazio: os três cartões; Adicionar contato põe o novo nos avulsos", async () => {
    const despachar = vi.fn();
    render(comConsulta(<PassoContatos estado={{ ...estadoInicial(), passo: 1 }} despachar={despachar} numeroOficial origens={[]} opcoesDoFiltro={OPCOES_VAZIAS} />));
    expect(screen.getByRole("heading", { name: "Mensagem de WhatsApp Oficial" })).toBeInTheDocument();
    for (const nome of ["Adicionar contato", "Selecionar contatos", "Importar telefones .csv"]) {
      expect(screen.getByRole("button", { name: new RegExp(nome) })).toBeInTheDocument();
    }
    await userEvent.click(screen.getByRole("button", { name: /Adicionar contato/ }));
    await userEvent.click(screen.getByRole("button", { name: "criar" }));
    expect(despachar).toHaveBeenCalledWith({ tipo: "mudarPublico", publico: { selecao: null, avulsos: ["novo"], removidos: [] } });
  });

  it("com destinatários: a contagem, a linha e 'Remover da lista'", async () => {
    const despachar = vi.fn();
    const publico = { selecao: { tipo: "ids" as const, ids: ["c1"] }, avulsos: [], removidos: [] };
    render(comConsulta(<PassoContatos estado={{ ...estadoInicial(), passo: 1, dados: { ...ASSISTENTE_VAZIO, publico } }} despachar={despachar} numeroOficial origens={[]} opcoesDoFiltro={OPCOES_VAZIAS} />));
    expect(screen.getByText("Destinatários")).toBeInTheDocument();
    expect(screen.getByText("(49) 98408-6513")).toBeInTheDocument();
    expect(screen.getByText("fernanda@x.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mais opções" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Remover da lista" }));
    expect(despachar).toHaveBeenCalledWith({ tipo: "mudarPublico", publico: { ...publico, removidos: ["c1"] } });
  });

  it("com 'tentou' e sem ninguém, o aviso da Clint", () => {
    render(comConsulta(<PassoContatos estado={{ ...estadoInicial(), passo: 1, tentou: true }} despachar={vi.fn()} numeroOficial={false} origens={[]} opcoesDoFiltro={OPCOES_VAZIAS} />));
    expect(screen.getByText("Você deve selecionar pelo menos um contato.")).toBeInTheDocument();
  });

  it("público do formulário antigo avisa", () => {
    render(comConsulta(<PassoContatos estado={{ ...estadoInicial(), passo: 1, publicoAntigo: true }} despachar={vi.fn()} numeroOficial={false} origens={[]} opcoesDoFiltro={OPCOES_VAZIAS} />));
    expect(screen.getByText("Esta campanha usava o público por filtro da tela antiga; escolha os destinatários de novo.")).toBeInTheDocument();
  });
});

describe("JanelaSelecionarContatos", () => {
  it("marcar um a um grava os ids; contato sem telefone não marca", async () => {
    const aoAdicionar = vi.fn();
    render(comConsulta(<JanelaSelecionarContatos aberta aoFechar={vi.fn()} inicial={null} opcoesDoFiltro={OPCOES_VAZIAS} aoAdicionar={aoAdicionar} />));
    expect(screen.getByText("Nenhum contato selecionado")).toBeInTheDocument();
    expect(screen.getByText("Contatos duplicados não poderão ser selecionados")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Sem Fone" })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "Anderson Flavio" }));
    expect(screen.getByText("1 selecionado")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(aoAdicionar).toHaveBeenCalledWith({ tipo: "ids", ids: ["c1"] });
  });

  it("'Selecionar todos' grava O FILTRO, não a lista", async () => {
    const aoAdicionar = vi.fn();
    render(comConsulta(<JanelaSelecionarContatos aberta aoFechar={vi.fn()} inicial={null} opcoesDoFiltro={OPCOES_VAZIAS} aoAdicionar={aoAdicionar} />));
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar todos" }));
    expect(screen.getByText("44.520 selecionados")).toBeInTheDocument();
    expect(screen.getByText("A quantidade de contatos pode variar até o momento do envio.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(aoAdicionar).toHaveBeenCalledWith({ tipo: "filtro", v: "todos", quantidade: null, excluidos: [] });
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-assistente-passo-2.test.tsx`
Expected: FAIL.

> `LinhaDeContato` tem os campos da lista de 2A (`lib/escale/contatos/lista.ts`, L88–110); se o typecheck pedir outro campo no `linhaDeContato` do teste, acrescente-o com `null`. O teste usa `as never` no retorno do hook.

- [ ] **Step 2: `components/escale/campanhas/assistente/JanelaSelecionarContatos.tsx`**

```tsx
"use client";

import { useState } from "react";

import { PainelDeFiltros } from "@/components/escale/contatos/filtros/PainelDeFiltros";
import { SeletorDeFiltros } from "@/components/escale/contatos/filtros/SeletorDeFiltros";
import { FotoDaPessoa } from "@/components/escale/conversas/configuracoes/FotoDaPessoa";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useExcluirFiltroDaLista, useFiltrosDaLista, useMudarFiltroDaLista } from "@/hooks/escale/useFiltrosDaLista";
import { useListaDeContatos } from "@/hooks/escale/useListaDeContatos";
import { useT } from "@/hooks/i18n/useT";
import type { SelecaoDoPublico } from "@/lib/escale/campanhas/assistente";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { filtrosDaUrl, filtrosParaUrl, type FiltrosDeContatos, type SecaoDoFiltro } from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { POR_PAGINA, formatarTelefone, type VisaoDeContatos } from "@/lib/escale/contatos/regras";
import {
  SEM_SELECAO,
  SELECIONAR_TODOS,
  alternarLinha,
  alvoDaSelecao,
  estadoDaPagina,
  linhaMarcada,
  totalSelecionado,
  type Selecao,
} from "@/lib/escale/contatos/selecao";
import { Funnel, MessageCircle, Search, TriangleAlert } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BOTAO_CONTORNADO, BOTAO_DA_MARCA } from "../molde/estilos";

/** A seleção guardada volta como estado da tela (ids, ou o filtro com os desmarcados). */
function estadoDaSelecaoInicial(s: SelecaoDoPublico | null) {
  if (!s) return { q: "", v: "todos" as VisaoDeContatos, f: {} as FiltrosDeContatos, selecao: SEM_SELECAO as Selecao };
  if (s.tipo === "ids") return { q: "", v: "todos" as VisaoDeContatos, f: {} as FiltrosDeContatos, selecao: { tipo: "ids", ids: s.ids } as Selecao };
  return {
    q: s.q ?? "",
    v: s.v,
    f: filtrosDaUrl(s.f ?? null),
    selecao: { tipo: "todos", quantidade: s.quantidade, excluidos: s.excluidos } as Selecao,
  };
}

/**
 * "SELECIONAR CONTATOS" (fork Escale, Fase 8B; 09-031 a 09-034; N8). A lista,
 * a busca, as visões, os filtros e os filtros salvos de Contatos (2A/2B), com o
 * modelo de seleção da 2B: marcar um a um = ids; "Selecionar todos" = o filtro
 * (e os desmarcados), que o banco resolve na hora de preparar.
 */
export function JanelaSelecionarContatos({
  aberta,
  aoFechar,
  inicial,
  opcoesDoFiltro,
  aoAdicionar,
}: {
  aberta: boolean;
  aoFechar: () => void;
  inicial: SelecaoDoPublico | null;
  opcoesDoFiltro: OpcoesDoFiltro;
  aoAdicionar: (s: SelecaoDoPublico) => void;
}) {
  const t = useT();
  const comeco = estadoDaSelecaoInicial(inicial);
  const [busca, setBusca] = useState(comeco.q);
  const [visao, setVisao] = useState<VisaoDeContatos>(comeco.v);
  const [filtros, setFiltros] = useState<FiltrosDeContatos>(comeco.f);
  const [salvoId, setSalvoId] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(10);
  const [selecao, setSelecao] = useState<Selecao>(comeco.selecao);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [foco, setFoco] = useState<SecaoDoFiltro | null>(null);
  const salvos = useFiltrosDaLista("contatos");
  const mudarFiltro = useMudarFiltroDaLista("contatos");
  const excluirFiltro = useExcluirFiltroDaLista("contatos");

  const f = filtrosParaUrl(filtros);
  const lista = useListaDeContatos({ q: busca.trim() || undefined, v: visao, p: pagina, n: porPagina, f });
  const linhas = lista.data?.linhas ?? [];
  const total = lista.data?.total ?? 0;
  const primeiro = (pagina - 1) * porPagina;
  const quantos = totalSelecionado(selecao, total);
  const mudouConsulta = () => {
    setPagina(1);
    setSelecao(SEM_SELECAO);
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(896px,calc(100vw-2rem))] max-w-none gap-0 rounded-[12px] p-0">
      <div className="flex h-14 items-center border-b border-casca-divisoria px-5">
        <DialogTitle className="text-[15px] font-medium text-casca-texto">{t("Selecionar contatos")}</DialogTitle>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-6 pt-4 pb-3">
        <label className="relative w-[260px]">
          <span className="sr-only">{t("Buscar por contato ou Empresa")}</span>
          <input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              mudouConsulta();
            }}
            placeholder={t("Buscar por contato ou Empresa")}
            className="h-8 w-full rounded-[6px] bg-casca-busca pr-8 pl-3 text-[13px] placeholder:text-casca-meta focus-visible:outline-casca-marca"
          />
          <Search className="absolute top-2 right-2 size-4 text-casca-suave" aria-hidden />
        </label>
        <SeletorDeFiltros
          visao={visao}
          filtros={filtros}
          filtroSalvoId={salvoId}
          salvos={salvos.data ?? []}
          aoEscolherVisao={(v) => {
            setVisao(v);
            setSalvoId(null);
            mudouConsulta();
          }}
          aoAplicarSalvo={(s) => {
            setFiltros(s.criterios);
            setSalvoId(s.id);
            mudouConsulta();
          }}
          aoCriarFiltro={() => setFiltrosAbertos(true)}
          aoRenomear={async (id, nome) => {
            try {
              await mudarFiltro.mutateAsync({ id, nome });
              return null;
            } catch (e) {
              return (e as Error).message;
            }
          }}
          aoCompartilhar={(id, compartilhado) => mudarFiltro.mutate({ id, compartilhado })}
          aoExcluir={(id) => excluirFiltro.mutate(id)}
        />
        <Popover open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
          <PopoverTrigger asChild>
            <button type="button" className={cn(BOTAO_CONTORNADO, "gap-1.5")}>
              <Funnel className="size-3.5" aria-hidden />
              {t("Filtros")}
            </button>
          </PopoverTrigger>
          <PainelSuspenso sideOffset={8} className="w-[360px]">
            <PainelDeFiltros
              filtros={filtros}
              aoMudar={(novo) => {
                setFiltros(novo);
                setSalvoId(null);
                mudouConsulta();
              }}
              opcoes={opcoesDoFiltro}
              foco={foco}
              aoMudarFoco={setFoco}
            />
          </PainelSuspenso>
        </Popover>
      </div>
      <div className="mx-6 flex items-center justify-between border-y border-casca-divisoria py-3">
        <CaixaDaCasca
          marcada={selecao.tipo === "todos" && selecao.quantidade === null ? (selecao.excluidos.length ? "indeterminada" : true) : estadoDaPagina(selecao, linhas, primeiro)}
          aoMudar={(marcar) => setSelecao(marcar ? SELECIONAR_TODOS : SEM_SELECAO)}
          rotulo={t("Selecionar todos")}
        />
        <span className="flex items-center gap-1.5 text-[12px] text-(--escale-prazo-atencao-texto)">
          <TriangleAlert className="size-3.5" aria-hidden />
          {t("Contatos duplicados não poderão ser selecionados")}
        </span>
      </div>
      <div className="h-[260px] overflow-y-auto px-3">
        {lista.isError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-[13px] font-medium text-casca-texto">{t("Não foi possível carregar os contatos.")}</p>
            <button type="button" onClick={() => void lista.refetch()} className={BOTAO_CONTORNADO}>
              {t("Tentar novamente")}
            </button>
          </div>
        ) : !lista.isLoading && linhas.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[13px] font-medium text-casca-texto">{t("Não foram encontrados contatos.")}</p>
            <p className="text-[12px] text-casca-suave">{t("Tente ajustar a busca ou os filtros.")}</p>
          </div>
        ) : (
          linhas.map((l, i) => {
            const semTelefone = !l.telefone;
            const nome = l.nome ?? l.display_name ?? "";
            return (
              <div key={l.id} className={cn("flex h-14 items-center gap-3 rounded-[8px] px-3", linhaMarcada(selecao, l.id, primeiro + i) && "bg-casca-busca")}>
                <CaixaDaCasca
                  marcada={!semTelefone && linhaMarcada(selecao, l.id, primeiro + i)}
                  aoMudar={(marcar) => setSelecao(alternarLinha(selecao, l.id, primeiro + i, marcar))}
                  aria-label={nome}
                  desabilitada={semTelefone}
                />
                <FotoDaPessoa id={l.id} nome={nome} tamanho={32} />
                <span className="truncate text-[13px] font-medium text-casca-texto">{nome}</span>
                <span className="flex min-w-0 gap-1 overflow-hidden">
                  {l.tags.slice(0, 3).map((tag) => (
                    <ChipDaTag key={tag} tag={tag} />
                  ))}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[13px] text-casca-texto-2">
                  {semTelefone ? (
                    <span className="text-casca-meta">{t("Sem telefone")}</span>
                  ) : (
                    <>
                      <MessageCircle className="size-3.5 text-casca-marca" aria-hidden />
                      {formatarTelefone(l.telefone)}
                    </>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
      {total > 0 && (
        <div className="px-6 py-3">
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
        </div>
      )}
      <div className="flex h-16 items-center gap-3 border-t border-casca-divisoria px-6">
        {quantos === 0 ? (
          <span className="text-[13px] text-casca-texto-2">{t("Nenhum contato selecionado")}</span>
        ) : (
          <>
            <span className="text-[13px] text-casca-texto-2">
              {(quantos === 1 ? t("{n} selecionado") : t("{n} selecionados")).replace("{n}", numeroBr(quantos))}
            </span>
            <button type="button" onClick={() => setSelecao(SEM_SELECAO)} className="text-[13px] font-medium text-casca-marca">
              {t("Limpar")}
            </button>
          </>
        )}
        {selecao.tipo === "todos" && <span className="text-[12px] text-casca-meta">{t("A quantidade de contatos pode variar até o momento do envio.")}</span>}
        <span className="ml-auto flex gap-2">
          <button type="button" onClick={aoFechar} className={BOTAO_CONTORNADO}>
            {t("Cancelar")}
          </button>
          <button
            type="button"
            disabled={quantos === 0}
            onClick={() => {
              aoAdicionar(alvoDaSelecao(selecao, { q: busca, v: visao, f }) as SelecaoDoPublico);
              aoFechar();
            }}
            className={BOTAO_DA_MARCA}
          >
            {t("Adicionar")}
          </button>
        </span>
      </div>
    </JanelaDaCasca>
  );
}
```

> `numeroBr` é da 8A (`lib/escale/campanhas/apresentacao.ts`): "44.520". `useListaDeContatos` recebe `{ q, v, p, n, f }` (a `ConsultaDaTela` da 2A). A caixa "Selecionar todos" marca o resultado do filtro inteiro (a regra da B3 da 2B).

- [ ] **Step 3: `JanelaImportarCsv.tsx` e `ListaDeDestinatarios.tsx`**

`components/escale/campanhas/assistente/JanelaImportarCsv.tsx`:

```tsx
"use client";

import { useState } from "react";

import { JanelaDeImportacao } from "@/components/escale/importacao/JanelaDeImportacao";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { csvDeExemplo, nomeDoExemplo } from "@/lib/escale/importacao/exemplo";
import { Download } from "@/lib/ui/icons-da-casca";

import { BOTAO_DA_MARCA } from "../molde/estilos";

function baixarExemplo() {
  const url = URL.createObjectURL(new Blob([csvDeExemplo("contato")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeDoExemplo("contato");
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * "IMPORTAR TELEFONES .CSV" (fork Escale, Fase 8B; 09-037; N10): o passo 1 da
 * Clint (instruções e o exemplo) e, em "Importar agora", a janela de importação
 * da 2F com o tipo Contato travado. Os passos 2 e 3 da Clint (sem print) são os
 * da 2F.
 */
export function JanelaImportarCsv({ aberta, aoFechar, aoImportar }: { aberta: boolean; aoFechar: () => void; aoImportar: (importacaoId: string) => void }) {
  const t = useT();
  const [importando, setImportando] = useState(false);
  return (
    <>
      <JanelaDaCasca aberta={aberta && !importando} onFechar={aoFechar} className="w-[min(896px,calc(100vw-2rem))] max-w-none gap-0 rounded-[12px] p-0">
        <div className="border-b border-casca-divisoria px-5 py-4">
          <p className="text-[12px] font-semibold tracking-wide text-casca-texto-2 uppercase">{t("PASSO 1 DE 3")}</p>
          <DialogTitle className="text-[16px] font-semibold text-casca-texto">{t("Escolha o arquivo .CSV que você quer enviar WhatsApp em massa")}</DialogTitle>
        </div>
        <div className="flex gap-8 p-6">
          <div className="flex-1 pt-6">
            <p className="text-[13px] text-casca-texto">{t("Instruções")}</p>
            <p className="mt-1 text-[13px] text-casca-texto-2">
              {t("Baixe o arquivo de modelos de preenchimento abaixo para ajudá-lo no mapeamento de campos do seu arquivo. Lembre-se de mapear os campos conforme as variáveis que você utiliza no modelo de mensagem que quer enviar.")}
            </p>
            <button type="button" onClick={baixarExemplo} className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-casca-marca">
              <Download className="size-4" aria-hidden />
              {t("Baixar arquivo de exemplo .CSV")}
            </button>
            <button type="button" onClick={() => setImportando(true)} className={`${BOTAO_DA_MARCA} mt-5`}>
              {t("Importar agora")}
            </button>
          </div>
          <div aria-hidden className="hidden w-[374px] shrink-0 rounded-[16px] bg-casca-marca-suave p-6 sm:block">
            <div className="mx-auto w-fit rounded-[8px] bg-casca-marca px-3 py-1.5 text-[13px] font-semibold text-white">{"Nome = {{1}}"}</div>
            <div className="mt-3 rounded-[8px] bg-surface p-3 text-[12px] text-casca-texto-2 shadow-xs">{t("Oi {{1}}, tudo bem?")}</div>
          </div>
        </div>
      </JanelaDaCasca>
      {importando && (
        <JanelaDeImportacao
          aberta
          tipoInicial="contato"
          travarTipo
          aoFechar={() => {
            setImportando(false);
            aoFechar();
          }}
          aoImportar={(id) => {
            setImportando(false);
            aoImportar(id);
            aoFechar();
          }}
        />
      )}
    </>
  );
}
```

> Confira `nomeDoExemplo` e `csvDeExemplo` em `lib/escale/importacao/exemplo.ts` (L15, L22: `csvDeExemplo(tipo)`, `nomeDoExemplo(tipo)`); o `baixarExemplo` repete o de `PassoArquivo.tsx` (L12–19). Se lá ele já estiver exportado, importe-o em vez de repetir.

`components/escale/campanhas/assistente/ListaDeDestinatarios.tsx`:

```tsx
"use client";

import { useState } from "react";

import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU, SOMBRA_DO_MENU } from "@/components/escale/menu/estilos";
import { usePaginaDoPublico } from "@/hooks/escale/useAssistenteDeCampanha";
import { useT } from "@/hooks/i18n/useT";
import type { PublicoDaCampanha } from "@/lib/escale/campanhas/assistente";
import { POR_PAGINA, formatarTelefone } from "@/lib/escale/contatos/regras";
import { EllipsisVertical, Phone, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * OS DESTINATÁRIOS (fork Escale, Fase 8B; 09-035, 09-036, 09-045): a página do
 * público resolvido no banco, cartão por contato (telefone, nome e e-mail,
 * tags) e o ⋮ "Remover da lista". `somenteLeitura` é o "Contatos selecionados".
 */
export function ListaDeDestinatarios({
  publico,
  aoRemover,
  somenteLeitura = false,
}: {
  publico: PublicoDaCampanha;
  aoRemover?: (id: string) => void;
  somenteLeitura?: boolean;
}) {
  const t = useT();
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(10);
  const q = usePaginaDoPublico(publico, pagina, porPagina, true);
  const linhas = q.data?.linhas ?? [];
  const total = q.data?.total ?? 0;
  return (
    <div>
      <div className="space-y-2">
        {q.isLoading
          ? Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[60px] animate-pulse rounded-[8px] bg-casca-raia" />)
          : linhas.map((l) => (
              <div key={l.id} className="flex h-[60px] items-center gap-4 rounded-[8px] border border-casca-borda bg-surface px-4 shadow-xs">
                <Phone className="size-4 shrink-0 text-casca-marca" aria-hidden />
                <span className="w-[200px] shrink-0 text-[13px] text-casca-texto-2">{l.telefone ? formatarTelefone(l.telefone) : t("Sem telefone")}</span>
                <span className="w-[260px] min-w-0 shrink-0">
                  <span className="block truncate text-[13px] text-casca-texto">{l.nome ?? ""}</span>
                  {l.email && <span className="block truncate text-[11px] text-casca-texto-2">{l.email}</span>}
                </span>
                <span className="flex min-w-0 flex-1 gap-1 overflow-hidden">
                  {l.tags.slice(0, 3).map((tag) => (
                    <ChipDaTag key={tag} tag={tag} />
                  ))}
                </span>
                {!somenteLeitura && aoRemover && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" aria-label={t("Mais opções")} className="flex size-7 items-center justify-center rounded-[6px] text-casca-texto-2 hover:bg-casca-busca">
                        <EllipsisVertical className="size-[18px]" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={cn(CONTEUDO_DO_MENU, "w-44")} style={SOMBRA_DO_MENU}>
                      <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => aoRemover(l.id)}>
                        <Trash2 className="size-3.5" aria-hidden />
                        {t("Remover da lista")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
      </div>
      {total > porPagina && (
        <div className="mt-3">
          <PaginacaoDaCasca pagina={pagina} total={total} porPagina={porPagina} opcoesPorPagina={POR_PAGINA} aoMudarPagina={setPagina} aoMudarPorPagina={(n) => { setPorPagina(n); setPagina(1); }} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `components/escale/campanhas/assistente/PassoContatos.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { JanelaNovoContato } from "@/components/escale/contatos/JanelaNovoContato";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { ConfirmacaoDaCasca } from "@/components/escale/ui/ConfirmacaoDaCasca";
import { contatosDaImportacao, useAcompanharImportacao, usePaginaDoPublico } from "@/hooks/escale/useAssistenteDeCampanha";
import { useT } from "@/hooks/i18n/useT";
import { PUBLICO_VAZIO } from "@/lib/escale/campanhas/assistente";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { errosDoPasso, type AcaoDoAssistente, type EstadoDoAssistente } from "@/lib/escale/campanhas/estado-do-assistente";
import { comAvulsos, comSelecao, publicoVazio, semContato } from "@/lib/escale/campanhas/publico";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { Loader2, Pencil, Trash2, Upload, UserPlus, Users } from "@/lib/ui/icons-da-casca";

import { BOTAO_CONTORNADO, SUBTITULO_DO_PASSO, TITULO_DO_PASSO } from "../molde/estilos";
import { JanelaImportarCsv } from "./JanelaImportarCsv";
import { JanelaSelecionarContatos } from "./JanelaSelecionarContatos";
import { ListaDeDestinatarios } from "./ListaDeDestinatarios";

type Janela = "adicionar" | "selecionar" | "csv" | null;

/** PASSO 2 — "Escolha seus contatos" (fork Escale, Fase 8B; 09-027 a 09-037; N7–N10). */
export function PassoContatos({
  estado,
  despachar,
  numeroOficial,
  origens,
  opcoesDoFiltro,
}: {
  estado: EstadoDoAssistente;
  despachar: (a: AcaoDoAssistente) => void;
  numeroOficial: boolean;
  origens: OrigemParaCriar[];
  opcoesDoFiltro: OpcoesDoFiltro;
}) {
  const t = useT();
  const publico = estado.dados.publico;
  const [janela, setJanela] = useState<Janela>(null);
  const [importacaoId, setImportacaoId] = useState<string | null>(null);
  const importacao = useAcompanharImportacao(importacaoId);
  const total = usePaginaDoPublico(publico, 1, 10, !publicoVazio(publico)).data?.total ?? 0;
  const erros = estado.tentou ? errosDoPasso(1, estado.dados, { numero: null, agora: new Date() }) : {};
  const publicoAtual = useRef(publico);
  publicoAtual.current = publico;

  useEffect(() => {
    const status = importacao.data?.status;
    if (!importacaoId || !status) return;
    if (status === "concluida") {
      const id = importacaoId;
      setImportacaoId(null);
      contatosDaImportacao(id)
        .then((ids) => {
          despachar({ tipo: "mudarPublico", publico: comAvulsos(publicoAtual.current, ids) });
          toast.success(t("{n} contatos adicionados.").replace("{n}", numeroBr(ids.length)));
        })
        .catch(() => toast.error(t("Não foi possível ler os contatos importados. Tente de novo.")));
    } else if (status === "cancelada" || status === "falhou") {
      setImportacaoId(null);
      toast.error(t("A importação não terminou. Veja o relatório em Importações."));
    }
  }, [importacao.data?.status, importacaoId, despachar, t]);

  const mudarPublico = (p: typeof publico) => despachar({ tipo: "mudarPublico", publico: p });
  const cartoes = [
    { janela: "adicionar" as const, icone: <UserPlus className="size-5" aria-hidden />, titulo: t("Adicionar contato"), descricao: t("Cadastre um contato manualmente") },
    { janela: "selecionar" as const, icone: <Users className="size-5" aria-hidden />, titulo: t("Selecionar contatos"), descricao: t("Escolha da sua base de contatos") },
    { janela: "csv" as const, icone: <Upload className="size-5" aria-hidden />, titulo: t("Importar telefones .csv"), descricao: t("Importe uma lista .csv") },
  ];

  return (
    <div>
      <h1 className={TITULO_DO_PASSO}>{numeroOficial ? t("Mensagem de WhatsApp Oficial") : t("Mensagem de WhatsApp")}</h1>
      <p className={SUBTITULO_DO_PASSO}>{t("Escolha para quem você quer enviar Whatsapp")}</p>

      {estado.publicoAntigo && (
        <p role="status" className="mt-4 rounded-[8px] bg-casca-marca-suave px-4 py-3 text-[13px] text-casca-texto">
          {t("Esta campanha usava o público por filtro da tela antiga; escolha os destinatários de novo.")}
        </p>
      )}

      {publicoVazio(publico) && !importacaoId ? (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {cartoes.map((c) => (
            <button key={c.janela} type="button" onClick={() => setJanela(c.janela)} className="flex h-[146px] flex-col items-center justify-center rounded-[10px] border border-casca-borda bg-casca-raia px-4 text-center hover:border-casca-marca-media">
              <span aria-hidden className="flex size-11 items-center justify-center rounded-[8px] bg-surface text-casca-marca">
                {c.icone}
              </span>
              <span className="mt-3 text-[13px] font-semibold text-casca-texto">{c.titulo}</span>
              <span className="mt-1 text-[13px] text-casca-suave">{c.descricao}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-[13px] text-casca-texto-2">{t("Destinatários")}</span>
            <span className="-ml-2 text-[13px] font-semibold text-casca-marca">{numeroBr(total)}</span>
            <button type="button" onClick={() => setJanela("selecionar")} className="flex items-center gap-1 text-[13px] font-medium text-casca-marca">
              <Pencil className="size-3" aria-hidden />
              {t("editar seleção")}
            </button>
            <span className="ml-auto flex items-center gap-2">
              {cartoes.map((c) => (
                <button key={c.janela} type="button" onClick={() => setJanela(c.janela)} className={BOTAO_CONTORNADO}>
                  {c.titulo}
                </button>
              ))}
              <ConfirmacaoDaCasca texto={t("Remover todos os destinatários?")} aoConfirmar={() => mudarPublico(PUBLICO_VAZIO)}>
                <button type="button" aria-label={t("Remover contatos")} className="flex size-8 items-center justify-center rounded-[6px] text-casca-texto-2 hover:bg-casca-busca">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </ConfirmacaoDaCasca>
            </span>
          </div>
          {importacaoId && (
            <p role="status" className="mb-2 flex items-center gap-2 text-[13px] text-casca-texto-2">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {importacao.data?.status === "aguardando_revisao"
                ? t("A importação espera a sua revisão em Importações; os contatos entram aqui quando ela terminar.")
                : t("Importando contatos…")}
            </p>
          )}
          {!publicoVazio(publico) && <ListaDeDestinatarios publico={publico} aoRemover={(id) => mudarPublico(semContato(publico, id))} />}
        </div>
      )}

      {erros.publico && (
        <p role="alert" className="mt-3 text-[12px] text-casca-alerta">
          {t(erros.publico)}
        </p>
      )}

      <JanelaNovoContato
        aberta={janela === "adicionar"}
        aoFechar={() => setJanela(null)}
        origens={origens}
        aoCriar={(c) => {
          mudarPublico(comAvulsos(publico, [c.id]));
          setJanela(null);
        }}
      />
      {janela === "selecionar" && (
        <JanelaSelecionarContatos
          aberta
          aoFechar={() => setJanela(null)}
          inicial={publico.selecao}
          opcoesDoFiltro={opcoesDoFiltro}
          aoAdicionar={(s) => mudarPublico(comSelecao(publico, s))}
        />
      )}
      {janela === "csv" && <JanelaImportarCsv aberta aoFechar={() => setJanela(null)} aoImportar={setImportacaoId} />}
    </div>
  );
}
```

> `ConfirmacaoDaCasca({ texto, aoConfirmar, children })` é o "Não/Sim" da casca (o lixo da Clint não tem print de confirmação; apagar a lista toda sem pergunta é perder trabalho). O `PassoContatos` não usa o `OrigemParaCriar` além de repassar à `JanelaNovoContato`.

- [ ] **Step 5: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-passo-2.test.tsx tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts && corepack pnpm prettier --write components/escale/campanhas/assistente tests/unit/escale-assistente-passo-2.test.tsx && corepack pnpm eslint components/escale/campanhas/assistente && corepack pnpm typecheck`
Expected: PASS. Se o `CaixaDaCasca` não expuser `aria-label` quando recebe `rotulo` (o teste procura o checkbox "Selecionar todos"), confira as props em `components/escale/ui/CaixaDaCasca.tsx` (`rotulo?`, `"aria-label"?`) e passe o que ela usa como nome acessível.

- [ ] **Step 6: Commit**

```bash
git add components/escale/campanhas/assistente tests/unit/escale-assistente-passo-2.test.tsx
git commit -m "feat(escale): passo 2 do assistente — adicionar, selecionar (filtro da 2B) e importar .csv (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---


### Task 13: Passo 3 — Configurações opcionais

**Abra antes:** 038 a 043.

**Files:**
- Create: `components/escale/campanhas/assistente/EscolhaDeTagsDaCampanha.tsx`, `RitmoDaCampanha.tsx`, `PassoOpcionais.tsx` (em `components/escale/campanhas/assistente/`), `tests/unit/escale-assistente-passo-3.test.tsx`

**Interfaces:**
- Consumes: `PosEnvio`, `STATUS_DO_POS_ENVIO`, `ROTULO_DO_STATUS_DO_POS_ENVIO`, `TAGS_DO_POS_ENVIO_MAX`, `NUMEROS_EXTRAS_MAX` (Task 1); `EstadoDoAssistente`, `AcaoDoAssistente`, `errosDoPasso` (Task 10); `NumeroDaCampanha` (Task 4); `useContactTagVocabulary` (`hooks/contacts/useContactTagVocabulary.ts`), `normalizarTags`; `useDestinosDaImportacao` (`hooks/escale/useImportacoes.ts`); `useAssignableMembers` (`hooks/inbox/useAssignableMembers.ts`); `useAssignableAgents` (`hooks/kanban/useAssignableAgents.ts`); `useAuth`; `SeletorDaCasca`, `SeletorMultiploDaCasca`, `CaixaDaCasca`, `AjudaDaCasca`, `ChipDaTag`.
- Produces: `EscolhaDeTagsDaCampanha({ tags: string[]; aoMudar: (tags: string[]) => void })`, `RitmoDaCampanha({ ritmo; aoMudar })`, `PassoOpcionais({ estado; despachar; numeros: NumeroDaCampanha[] })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-assistente-passo-3.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org-1" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({ useContactTagVocabulary: () => ({ data: ["setembro/16", "outubro/20"] }) }));
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useDestinosDaImportacao: () => ({
    data: [{ id: "o1", nome: "Prospecção", grupo: "Credenciados", etapas: [{ id: "e1", nome: "Avaliar interesse" }], motivos: [] }],
  }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: { data: [{ user_id: "u1", full_name: "Naiara Zeri", role: "agent" }] } }) }));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: { data: [{ agent_id: "g1", name: "SDR", version_number: 1 }] } }) }));

import { EscolhaDeTagsDaCampanha } from "@/components/escale/campanhas/assistente/EscolhaDeTagsDaCampanha";
import { PassoOpcionais } from "@/components/escale/campanhas/assistente/PassoOpcionais";
import { POS_ENVIO_PADRAO } from "@/lib/escale/campanhas/assistente";
import { ASSISTENTE_VAZIO, estadoInicial } from "@/lib/escale/campanhas/estado-do-assistente";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";

// A página monta o provedor (N19); o teste monta o mesmo, de propósito, só aqui.
const comDica = (ui: ReactNode) => <TooltipProvider>{ui}</TooltipProvider>;
const LIVRE: NumeroDaCampanha = { id: "n2", nome: "Naiara", telefone: null, conectado: true, oficial: false, provider: "p", setor: null };
const OUTRO: NumeroDaCampanha = { ...LIVRE, id: "n3", nome: "Camilly" };

beforeEach(() => vi.clearAllMocks());

describe("PassoOpcionais", () => {
  it("os textos da Clint, origem que abre a etapa e o dono só com origem", async () => {
    const despachar = vi.fn();
    const { rerender } = render(comDica(<PassoOpcionais estado={{ ...estadoInicial(), passo: 2, dados: { ...ASSISTENTE_VAZIO, numeroId: "n2" } }} despachar={despachar} numeros={[LIVRE, OUTRO]} />));
    expect(screen.getByRole("heading", { name: "Configurações opcionais" })).toBeInTheDocument();
    expect(screen.getByText("As tags serão aplicadas aos contatos alcançados pela campanha.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Manter atendente de acordo com a distribuição de dono do negócio" })).toBeDisabled();
    expect(screen.queryByText("Etapa")).toBeNull();
    rerender(
      comDica(
        <PassoOpcionais
          estado={{ ...estadoInicial(), passo: 2, dados: { ...ASSISTENTE_VAZIO, numeroId: "n2", posEnvio: { ...POS_ENVIO_PADRAO, origemId: "o1", etapaId: "e1" } } }}
          despachar={despachar}
          numeros={[LIVRE, OUTRO]}
        />,
      ),
    );
    expect(screen.getByText("Etapa")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Manter atendente de acordo com a distribuição de dono do negócio" })).toBeEnabled();
    await userEvent.click(screen.getByRole("checkbox", { name: "Para atendimentos existentes manter o status atual da conversa" }));
    expect(despachar).toHaveBeenCalledWith({ tipo: "mudarPosEnvio", campos: { manterStatus: true } });
  });

  it("os blocos do original: quem atende, ritmo e números extras (só não oficial)", async () => {
    const despachar = vi.fn();
    const { rerender } = render(comDica(<PassoOpcionais estado={{ ...estadoInicial(), passo: 2, dados: { ...ASSISTENTE_VAZIO, numeroId: "n2" } }} despachar={despachar} numeros={[LIVRE, OUTRO]} />));
    expect(screen.getByText("Quem atende a resposta")).toBeInTheDocument();
    expect(screen.getByText("Ritmo de envio")).toBeInTheDocument();
    expect(screen.getByText("Números extras")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Intervalo entre mensagens (segundos)"), "6");
    expect(despachar).toHaveBeenCalledWith({ tipo: "mudar", campos: { ritmo: { intervalo_segundos: 6 } } });
    rerender(comDica(<PassoOpcionais estado={{ ...estadoInicial(), passo: 2, dados: { ...ASSISTENTE_VAZIO, numeroId: "n1" } }} despachar={despachar} numeros={[{ ...LIVRE, id: "n1", oficial: true }]} />));
    expect(screen.queryByText("Números extras")).toBeNull();
  });
});

describe("EscolhaDeTagsDaCampanha", () => {
  it("'+ Adicionar tag' abre a lista; escolher e remover", async () => {
    const aoMudar = vi.fn();
    const { rerender } = render(<EscolhaDeTagsDaCampanha tags={[]} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await userEvent.click(screen.getByRole("option", { name: "outubro/20" }));
    expect(aoMudar).toHaveBeenCalledWith(["outubro/20"]);
    rerender(<EscolhaDeTagsDaCampanha tags={["outubro/20"]} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("button", { name: "Remover outubro/20" }));
    expect(aoMudar).toHaveBeenLastCalledWith([]);
  });

  it("digitar uma tag nova e Enter cria", async () => {
    const aoMudar = vi.fn();
    render(<EscolhaDeTagsDaCampanha tags={[]} aoMudar={aoMudar} />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    await userEvent.type(screen.getByPlaceholderText("Adicione uma tag"), "Reativados{Enter}");
    expect(aoMudar).toHaveBeenCalledWith(["reativados"]);
  });
});
```

> O teste importa o `TooltipProvider` do Radix só para as dicas (`AjudaDaCasca`); a página do assistente monta o dela (Task 15). Os hooks de membros e agentes devolvem `{ data: { data: [...] } }` (o `apiClient.get` embrulha em `{ data }`): confira com `sed -n 12,20p hooks/inbox/useAssignableMembers.ts hooks/kanban/useAssignableAgents.ts` e, se algum já desembrulhar (`select`), troque o `.data?.data` do Step 4 por `.data`.

Run: `corepack pnpm vitest run tests/unit/escale-assistente-passo-3.test.tsx`
Expected: FAIL.

- [ ] **Step 2: `components/escale/campanhas/assistente/EscolhaDeTagsDaCampanha.tsx`**

```tsx
"use client";

import { useState } from "react";

import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { TAGS_DO_POS_ENVIO_MAX } from "@/lib/escale/campanhas/assistente";
import { Plus, X } from "@/lib/ui/icons-da-casca";

import { CAMPO } from "../molde/estilos";

/**
 * "ADICIONAR TAG PARA CONTATOS" (fork Escale, Fase 8B; 09-040): a pílula "+
 * Adicionar tag" abre "Nome" com a busca e as etiquetas do vocabulário do
 * contato; Enter cria uma nova. Até 20, normalizadas como o banco guarda.
 */
export function EscolhaDeTagsDaCampanha({ tags, aoMudar }: { tags: string[]; aoMudar: (tags: string[]) => void }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const vocabulario = useContactTagVocabulary(activeOrg?.orgId ?? null).data ?? [];
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const opcoes = vocabulario.filter((v) => !tags.includes(v) && (!termo || v.includes(termo)));
  const incluir = (tag: string) => {
    const novas = normalizarTags([...tags, tag]).slice(0, TAGS_DO_POS_ENVIO_MAX);
    aoMudar(novas);
    setBusca("");
    setAberto(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1">
          <ChipDaTag tag={tag} />
          <button type="button" aria-label={t("Remover {tag}").replace("{tag}", tag)} onClick={() => aoMudar(tags.filter((x) => x !== tag))} className="text-casca-suave hover:text-casca-texto">
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      {tags.length < TAGS_DO_POS_ENVIO_MAX && (
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <button type="button" aria-label={t("Adicionar tag")} className="flex h-6 items-center gap-1 rounded-full border border-casca-borda px-2.5 text-[11px] font-medium text-casca-texto">
              <Plus className="size-3" aria-hidden />
              {t("Adicionar tag")}
            </button>
          </PopoverTrigger>
          <PainelSuspenso sideOffset={8} className="w-[290px] p-3">
            <label className="mb-2 block text-[13px] text-casca-texto">
              {t("Nome")}
              <input
                autoFocus
                value={busca}
                placeholder={t("Adicione uma tag")}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && termo) {
                    e.preventDefault();
                    incluir(termo);
                  }
                }}
                className={`${CAMPO} mt-2 border-casca-marca bg-surface`}
              />
            </label>
            <div role="listbox" aria-label={t("Tags")} className="max-h-64 overflow-y-auto">
              {opcoes.map((tag) => (
                <button key={tag} type="button" role="option" aria-selected={false} aria-label={tag} onClick={() => incluir(tag)} className="block w-full rounded-[6px] px-2 py-1.5 text-left hover:bg-casca-busca">
                  <ChipDaTag tag={tag} />
                </button>
              ))}
            </div>
          </PainelSuspenso>
        </Popover>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `components/escale/campanhas/assistente/RitmoDaCampanha.tsx`**

```tsx
"use client";

import { useId } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { Assistente } from "@/lib/escale/campanhas/assistente";

import { CAMPO, ROTULO } from "../molde/estilos";

type Ritmo = Assistente["ritmo"];
type Chave = keyof Ritmo;

const CAMPOS: ReadonlyArray<{ chave: Chave; rotulo: string; max: number; min: number }> = [
  { chave: "intervalo_segundos", rotulo: "Intervalo entre mensagens (segundos)", min: 1, max: 86_400 },
  { chave: "teto_diario", rotulo: "Máximo por dia", min: 1, max: 10_000 },
  { chave: "teto_horario", rotulo: "Máximo por hora", min: 1, max: 10_000 },
  { chave: "janela_inicio_hora", rotulo: "Enviar a partir das (hora)", min: 0, max: 23 },
  { chave: "janela_fim_hora", rotulo: "Enviar até as (hora)", min: 1, max: 24 },
];

/**
 * O RITMO DE ENVIO (fork Escale, Fase 8B; N11): os campos do original
 * (`ritmoSchema`), em branco = o ritmo do número. Texto com teclado numérico,
 * nunca o `<input type="number">` (as setas dele somam e o valor some no Firefox).
 */
export function RitmoDaCampanha({ ritmo, aoMudar }: { ritmo: Ritmo; aoMudar: (r: Ritmo) => void }) {
  const t = useT();
  const base = useId();
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {CAMPOS.map((c) => {
        const id = `${base}-${c.chave}`;
        const valor = ritmo[c.chave];
        return (
          <div key={c.chave}>
            <label htmlFor={id} className={ROTULO}>
              {t(c.rotulo)}
            </label>
            <input
              id={id}
              inputMode="numeric"
              value={valor ?? ""}
              placeholder={t("O do número")}
              onChange={(e) => {
                const digitos = e.target.value.replace(/\D/g, "");
                const n = digitos === "" ? null : Math.min(c.max, Math.max(c.min, Number(digitos)));
                aoMudar({ ...ritmo, [c.chave]: n });
              }}
              className={CAMPO}
            />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: `components/escale/campanhas/assistente/PassoOpcionais.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useDestinosDaImportacao } from "@/hooks/escale/useImportacoes";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import { ROTULO_DO_STATUS_DO_POS_ENVIO, STATUS_DO_POS_ENVIO, NUMEROS_EXTRAS_MAX, type StatusDoPosEnvio } from "@/lib/escale/campanhas/assistente";
import { errosDoPasso, type AcaoDoAssistente, type EstadoDoAssistente } from "@/lib/escale/campanhas/estado-do-assistente";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";

import { SUBTITULO_DO_PASSO, TITULO_DO_PASSO } from "../molde/estilos";
import { EscolhaDeTagsDaCampanha } from "./EscolhaDeTagsDaCampanha";
import { RitmoDaCampanha } from "./RitmoDaCampanha";

function Linha({ rotulo, ajuda, children }: { rotulo: string; ajuda?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-casca-divisoria py-4 md:flex-row md:items-start">
      <span className="flex w-[240px] shrink-0 items-center gap-2 pt-1.5 text-[13px] font-medium text-casca-texto">
        {rotulo}
        {ajuda && <AjudaDaCasca texto={ajuda} />}
      </span>
      <div className="w-full max-w-[620px] space-y-2">{children}</div>
    </div>
  );
}

function Secao({ titulo, ajuda, descricao, children }: { titulo: string; ajuda?: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="border-t border-casca-divisoria pt-6 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-casca-texto">
        {titulo}
        {ajuda && <AjudaDaCasca texto={ajuda} />}
      </h2>
      {descricao && <p className="mt-1 text-[13px] text-casca-suave">{descricao}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** PASSO 3 — "Configurações opcionais" (fork Escale, Fase 8B; 09-038 a 09-043; N11–N13). */
export function PassoOpcionais({
  estado,
  despachar,
  numeros,
}: {
  estado: EstadoDoAssistente;
  despachar: (a: AcaoDoAssistente) => void;
  numeros: NumeroDaCampanha[];
}) {
  const t = useT();
  const d = estado.dados;
  const p = d.posEnvio;
  const destinos = useDestinosDaImportacao(true).data ?? [];
  const membros = useAssignableMembers(true).data?.data ?? [];
  const agentes = useAssignableAgents(true).data?.data ?? [];
  const erros = estado.tentou ? errosDoPasso(2, d, { numero: null, agora: new Date() }) : {};
  const mudarPos = (campos: Partial<typeof p>) => despachar({ tipo: "mudarPosEnvio", campos });
  const numero = numeros.find((n) => n.id === d.numeroId) ?? null;
  const origem = destinos.find((o) => o.id === p.origemId) ?? null;
  const extrasPossiveis = numeros.filter((n) => !n.oficial && n.conectado && n.id !== d.numeroId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={TITULO_DO_PASSO}>{t("Configurações opcionais")}</h1>
        <p className={SUBTITULO_DO_PASSO}>
          {t("Personalize as configurações da sua campanha no CRM. Essas configurações são opcionais e serão aplicadas somente aos contatos que obtiverem sucesso na campanha após sua conclusão.")}
        </p>
      </div>

      <Secao titulo={t("Adicionar tag para contatos")} ajuda={t("A tag entra pelo mesmo caminho da tela e liga as automações de \"tag adicionada\".")} descricao={t("As tags serão aplicadas aos contatos alcançados pela campanha.")}>
        <EscolhaDeTagsDaCampanha tags={p.tags} aoMudar={(tags) => mudarPos({ tags })} />
      </Secao>

      <Secao titulo={t("Negócios e atendimento")} descricao={t("Defina como os contatos serão tratados no funil após o envio.")}>
        <Linha rotulo={t("Criar negócios em uma origem")} ajuda={t("O negócio nasce para todos os contatos que receberam a mensagem, nesta origem e etapa.")}>
          <SeletorDaCasca
            valor={p.origemId ?? ""}
            vazio={t("Selecione uma origem")}
            aria-label={t("Criar negócios em uma origem")}
            opcoes={destinos.map((o) => ({ valor: o.id, rotulo: o.nome, grupo: o.grupo ?? undefined }))}
            aoMudar={(id) => {
              const escolhida = destinos.find((o) => o.id === id);
              mudarPos({ origemId: id || null, etapaId: escolhida?.etapas[0]?.id ?? null, donoDoNegocio: id ? p.donoDoNegocio : false });
            }}
          />
        </Linha>
        {origem && (
          <Linha rotulo={t("Etapa")}>
            <SeletorDaCasca
              valor={p.etapaId ?? ""}
              vazio={t("Selecione uma etapa")}
              aria-label={t("Etapa")}
              opcoes={origem.etapas.map((e) => ({ valor: e.id, rotulo: e.nome }))}
              aoMudar={(id) => mudarPos({ etapaId: id || null })}
            />
            {erros.etapaId && (
              <p role="alert" className="text-[11px] text-casca-alerta">
                {t(erros.etapaId)}
              </p>
            )}
          </Linha>
        )}
        <Linha rotulo={t("Status da conversa")}>
          <SeletorDaCasca<StatusDoPosEnvio>
            valor={p.statusDaConversa}
            aria-label={t("Status da conversa")}
            opcoes={STATUS_DO_POS_ENVIO.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_STATUS_DO_POS_ENVIO[s]) }))}
            aoMudar={(s) => mudarPos({ statusDaConversa: s || "aberta" })}
          />
          <CaixaDaCasca marcada={p.manterStatus} aoMudar={(v) => mudarPos({ manterStatus: v })} rotulo={t("Para atendimentos existentes manter o status atual da conversa")} />
        </Linha>
        <Linha rotulo={t("Atribuir um atendente")}>
          <SeletorDaCasca
            valor={p.atendenteId ?? ""}
            vazio={t("Selecione...")}
            aria-label={t("Atribuir um atendente")}
            opcoes={membros.map((m) => ({ valor: m.user_id, rotulo: m.full_name ?? m.user_id }))}
            aoMudar={(id) => mudarPos({ atendenteId: id || null })}
          />
          <CaixaDaCasca marcada={p.manterAtendente} aoMudar={(v) => mudarPos({ manterAtendente: v })} rotulo={t("Para atendimentos existentes manter o mesmo atendente")} />
          <span className="flex items-center gap-2">
            <CaixaDaCasca
              marcada={p.donoDoNegocio}
              desabilitada={!p.origemId}
              aoMudar={(v) => mudarPos({ donoDoNegocio: v })}
              rotulo={t("Manter atendente de acordo com a distribuição de dono do negócio")}
            />
            <AjudaDaCasca texto={t("O atendente é o dono do negócio criado na origem (a distribuição de dono da origem decide quem é).")} />
          </span>
        </Linha>
      </Secao>

      <Secao titulo={t("Quem atende a resposta")} descricao={t("O agente que responde quem escrever de volta. Em branco, vale o do número.")}>
        <SeletorDaCasca
          valor={d.agenteId ?? ""}
          vazio={t("O do número")}
          aria-label={t("Quem atende a resposta")}
          opcoes={agentes.map((a) => ({ valor: a.agent_id, rotulo: a.name }))}
          aoMudar={(id) => despachar({ tipo: "mudar", campos: { agenteId: id || null } })}
          className="max-w-[620px]"
        />
      </Secao>

      <Secao titulo={t("Ritmo de envio")} descricao={t("A campanha só pode ser mais lenta que o número. Em branco, vale o ritmo do número.")}>
        <RitmoDaCampanha ritmo={d.ritmo} aoMudar={(ritmo) => despachar({ tipo: "mudar", campos: { ritmo } })} />
      </Secao>

      {numero && !numero.oficial && (
        <Secao titulo={t("Números extras")} descricao={t("Outros números que dividem o envio com o principal (rodízio).")}>
          <SeletorMultiploDaCasca
            valores={d.numerosExtras}
            vazio={t("Nenhum número extra")}
            aria-label={t("Números extras")}
            opcoes={extrasPossiveis.map((n) => ({ valor: n.id, rotulo: n.nome }))}
            aoMudar={(ids) => despachar({ tipo: "mudar", campos: { numerosExtras: ids.slice(0, NUMEROS_EXTRAS_MAX) } })}
          />
        </Secao>
      )}
    </div>
  );
}
```

> O teste do ritmo digita "6" num campo vazio e espera `{ intervalo_segundos: 6 }` (o redutor não roda no teste: só o despacho). O `SeletorDaCasca` agrupa por `grupo` como a lista de origens do 042 ("CREDENCIADOS / Prospecção").

- [ ] **Step 5: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-passo-3.test.tsx tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/campanhas/assistente tests/unit/escale-assistente-passo-3.test.tsx && corepack pnpm eslint components/escale/campanhas/assistente && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/escale/campanhas/assistente tests/unit/escale-assistente-passo-3.test.tsx
git commit -m "feat(escale): passo 3 do assistente — tags, negócio, status, atendente, agente, ritmo e números (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 14: Passo 4 — Confirme seu envio, o sucesso e o erro

**Abra antes:** 044, 045.

**Files:**
- Create: `components/escale/campanhas/assistente/JanelaContatosSelecionados.tsx`, `JanelaTesteDaCampanha.tsx`, `PassoConfirmar.tsx`, `FimDoAssistente.tsx` (em `components/escale/campanhas/assistente/`), `lib/escale/campanhas/textos-do-assistente.ts`, `tests/unit/escale-assistente-passo-4.test.tsx`

**Interfaces:**
- Consumes: `ResumoDoEnvio`, `PreviaDoCelular` (Task 9); `ResumoDaPreparacao`, `MotivoFora` (Task 6); `ListaDeDestinatarios` (Task 12); `TEXTO_DA_EXCLUSAO`, `MotivoDeExclusao` (`lib/campanhas/tipos.ts`); `dataEHoraBr`, `numeroBr` (8A `apresentacao.ts`); `useListaDeContatos` (busca do contato de teste).
- Produces:
  - `textos-do-assistente.ts`: `quandoNoResumo(q, fuso?): string` ("Envio imediato" ou "dd/mm/aaaa hh:mm"), `textoDoMotivo(motivo): string`, `enviarPara(n): string`.
  - `JanelaContatosSelecionados({ aberta; aoFechar; publico })`.
  - `JanelaTesteDaCampanha({ aberta; aoFechar; campanhaId })` (`POST /api/v1/campaigns/[id]/testar` do original).
  - `PassoConfirmar({ estado; resumo: ResumoDaPreparacao | null; preparando: boolean; erroDaPreparacao: string | null; numero: NumeroDaCampanha | null; fuso?: string })`.
  - `FimDoAssistente({ resultado: { tipo: "sucesso"; nome: string; modo: "iniciada" | "agendada" } | { tipo: "erro"; mensagem: string }; aoNovaCampanha; aoTentarDeNovo })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-assistente-passo-4.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/escale/useAssistenteDeCampanha", () => ({
  usePaginaDoPublico: () => ({ data: { linhas: [{ id: "c1", nome: "Fernanda", telefone: "+5549984086513", email: null, tags: [] }], total: 1 }, isLoading: false }),
}));

import { FimDoAssistente } from "@/components/escale/campanhas/assistente/FimDoAssistente";
import { PassoConfirmar } from "@/components/escale/campanhas/assistente/PassoConfirmar";
import { ASSISTENTE_VAZIO, estadoInicial } from "@/lib/escale/campanhas/estado-do-assistente";
import { enviarPara, quandoNoResumo, textoDoMotivo } from "@/lib/escale/campanhas/textos-do-assistente";

const ESTADO = { ...estadoInicial(), passo: 3 as const, campanhaId: "c-1", dados: { ...ASSISTENTE_VAZIO, nome: "Teste prints (nao enviar)" } };

beforeEach(() => vi.clearAllMocks());

describe("textos", () => {
  it("quando, motivo e quantos", () => {
    expect(quandoNoResumo({ modo: "agora" })).toBe("Envio imediato");
    expect(quandoNoResumo({ modo: "agendar", em: "2026-11-20T18:30:00.000Z" }, "America/Sao_Paulo")).toBe("20/11/2026 15:30");
    expect(textoDoMotivo("sem_telefone")).toBe("Sem telefone no cadastro");
    expect(textoDoMotivo("qualquer")).toBe("qualquer");
    expect(enviarPara(1)).toBe("1 contato selecionado");
    expect(enviarPara(14989)).toBe("14.989 contatos selecionados");
  });
});

describe("PassoConfirmar", () => {
  it("o cartão da Clint com os elegíveis, fora da lista com os motivos, custo '—' e o aviso de limites", async () => {
    render(
      <PassoConfirmar
        estado={ESTADO}
        resumo={{ total: 3, elegiveis: 2, excluidos: 1, motivos: [{ motivo: "sem_telefone", quantidade: 1 }] }}
        preparando={false}
        erroDaPreparacao={null}
        numero={null}
      />,
    );
    expect(screen.getByRole("heading", { name: "Confirme seu envio de mensagem de Whatsapp" })).toBeInTheDocument();
    expect(screen.getByText("Teste prints (nao enviar)")).toBeInTheDocument();
    expect(screen.getByText("Envio imediato")).toBeInTheDocument();
    expect(screen.getByText("2 contatos selecionados")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Limites de envio do WhatsApp")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver motivos" }));
    expect(screen.getByText("Sem telefone no cadastro")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver contatos" }));
    expect(screen.getByRole("heading", { name: "Contatos selecionados" })).toBeInTheDocument();
  });

  it("preparando e erro da preparação", () => {
    const { rerender } = render(<PassoConfirmar estado={ESTADO} resumo={null} preparando erroDaPreparacao={null} numero={null} />);
    expect(screen.getByText("Preparando a lista de envio…")).toBeInTheDocument();
    rerender(<PassoConfirmar estado={ESTADO} resumo={null} preparando={false} erroDaPreparacao="O recorte não encontrou nenhum contato." numero={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent("O recorte não encontrou nenhum contato.");
  });
});

describe("FimDoAssistente", () => {
  it("sucesso: os dois botões da Clint", async () => {
    const aoNovaCampanha = vi.fn();
    render(<FimDoAssistente resultado={{ tipo: "sucesso", nome: "Reativação", modo: "iniciada" }} aoNovaCampanha={aoNovaCampanha} aoTentarDeNovo={vi.fn()} />);
    expect(screen.getByText("Campanha Reativação enviada com sucesso")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Criar nova campanha" }));
    expect(aoNovaCampanha).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Ir para a tela inicial" }));
    expect(push).toHaveBeenCalledWith("/app/campaigns");
  });

  it("agendada e erro", () => {
    const { rerender } = render(<FimDoAssistente resultado={{ tipo: "sucesso", nome: "R", modo: "agendada" }} aoNovaCampanha={vi.fn()} aoTentarDeNovo={vi.fn()} />);
    expect(screen.getByText("Campanha R agendada com sucesso")).toBeInTheDocument();
    rerender(<FimDoAssistente resultado={{ tipo: "erro", mensagem: "Falhou o canal." }} aoNovaCampanha={vi.fn()} aoTentarDeNovo={vi.fn()} />);
    expect(screen.getByText("Erro ao criar campanha de WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Falhou o canal.")).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-assistente-passo-4.test.tsx`
Expected: FAIL.

- [ ] **Step 2: `lib/escale/campanhas/textos-do-assistente.ts`**

```ts
import { TEXTO_DA_EXCLUSAO, type MotivoDeExclusao } from "@/lib/campanhas/tipos";

import { dataEHoraBr, numeroBr } from "./apresentacao";
import type { QuandoEnviar } from "./assistente";

/** OS TEXTOS DO PASSO 4 (fork Escale, Fase 8B; 09-044). Em português; a tela traduz. */
export const quandoNoResumo = (q: QuandoEnviar, fuso?: string): string =>
  q.modo === "agora" ? "Envio imediato" : dataEHoraBr(q.em, fuso);

export const textoDoMotivo = (motivo: string): string =>
  (TEXTO_DA_EXCLUSAO as Record<string, string>)[motivo as MotivoDeExclusao] ?? motivo;

export const enviarPara = (n: number): string =>
  n === 1 ? "1 contato selecionado" : `${numeroBr(n)} contatos selecionados`;
```

> `dataEHoraBr(iso, fuso?)` é da 8A ("dd/mm/aaaa hh:mm", 24 h). `enviarPara` monta o número fora do `t()`: na tela, traduza as duas frases-molde (`t("1 contato selecionado")` e `t("{n} contatos selecionados").replace("{n}", …)`) — o Step 3 faz assim; esta função serve ao teste e ao texto em português.

- [ ] **Step 3: `JanelaContatosSelecionados.tsx`, `JanelaTesteDaCampanha.tsx` e `PassoConfirmar.tsx`**

`components/escale/campanhas/assistente/JanelaContatosSelecionados.tsx`:

```tsx
"use client";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import type { PublicoDaCampanha } from "@/lib/escale/campanhas/assistente";

import { ListaDeDestinatarios } from "./ListaDeDestinatarios";

/** "CONTATOS SELECIONADOS" (fork Escale, Fase 8B; 09-045): a lista do passo 2, só leitura. */
export function JanelaContatosSelecionados({ aberta, aoFechar, publico }: { aberta: boolean; aoFechar: () => void; publico: PublicoDaCampanha }) {
  const t = useT();
  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(1152px,calc(100vw-2rem))] max-w-none rounded-[12px] p-4">
      <DialogTitle className="pb-4 text-center text-[15px] font-medium text-casca-texto">{t("Contatos selecionados")}</DialogTitle>
      <div className="max-h-[70vh] overflow-y-auto">
        <ListaDeDestinatarios publico={publico} somenteLeitura />
      </div>
    </JanelaDaCasca>
  );
}
```

`components/escale/campanhas/assistente/JanelaTesteDaCampanha.tsx`:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { DialogTitle } from "@/components/ui/dialog";
import { useListaDeContatos } from "@/hooks/escale/useListaDeContatos";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { Search } from "@/lib/ui/icons-da-casca";

import { BOTAO_CONTORNADO } from "../molde/estilos";

/**
 * "ENVIAR TESTE" (fork Escale, Fase 8B; P2): busca um contato e manda a
 * campanha só para ele, pelo mesmo caminho do envio (`testar` do original:
 * os mesmos vetos, o mesmo modelo).
 */
export function JanelaTesteDaCampanha({ aberta, aoFechar, campanhaId }: { aberta: boolean; aoFechar: () => void; campanhaId: string }) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [enviando, setEnviando] = useState<string | null>(null);
  const lista = useListaDeContatos({ q: busca.trim() || undefined, v: "todos", p: 1, n: 10, f: null });
  const enviar = async (contactId: string) => {
    setEnviando(contactId);
    try {
      await apiClient.post(`/api/v1/campaigns/${campanhaId}/testar`, { contact_id: contactId });
      toast.success(t("Teste enviado."));
      aoFechar();
    } catch (e) {
      toast.error((e as Error).message || t("Não foi possível enviar o teste."));
    } finally {
      setEnviando(null);
    }
  };
  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(520px,calc(100vw-2rem))]">
      <DialogTitle className="text-[15px] font-medium text-casca-texto">{t("Enviar teste")}</DialogTitle>
      <label className="relative mt-4 block">
        <span className="sr-only">{t("Buscar por contato ou Empresa")}</span>
        <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar por contato ou Empresa")} className="h-8 w-full rounded-[6px] bg-casca-busca pr-8 pl-3 text-[13px]" />
        <Search className="absolute top-2 right-2 size-4 text-casca-suave" aria-hidden />
      </label>
      <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {(lista.data?.linhas ?? [])
          .filter((l) => l.telefone)
          .map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-[6px] px-2 py-2 hover:bg-casca-busca">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-casca-texto">{l.nome ?? l.display_name}</span>
                <span className="block text-[12px] text-casca-suave">{formatarTelefone(l.telefone)}</span>
              </span>
              <button type="button" disabled={enviando !== null} onClick={() => void enviar(l.id)} className={BOTAO_CONTORNADO}>
                {enviando === l.id ? t("Enviando…") : t("Enviar teste")}
              </button>
            </div>
          ))}
      </div>
    </JanelaDaCasca>
  );
}
```

`components/escale/campanhas/assistente/PassoConfirmar.tsx`:

```tsx
"use client";

import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import type { ResumoDaPreparacao } from "@/lib/escale/campanhas/acoes-do-assistente";
import type { EstadoDoAssistente } from "@/lib/escale/campanhas/estado-do-assistente";
import type { NumeroDaCampanha } from "@/lib/escale/campanhas/numeros";
import { quandoNoResumo, textoDoMotivo } from "@/lib/escale/campanhas/textos-do-assistente";
import { Clock, ExternalLink, HelpCircle, Loader2, Send, Tag, Users, Zap } from "@/lib/ui/icons-da-casca";

import { ResumoDoEnvio } from "../molde/ResumoDoEnvio";
import { TITULO_DO_PASSO } from "../molde/estilos";
import { JanelaContatosSelecionados } from "./JanelaContatosSelecionados";
import { JanelaTesteDaCampanha } from "./JanelaTesteDaCampanha";

const LIMITES_DA_META = "https://developers.facebook.com/docs/whatsapp/messaging-limits";

/**
 * PASSO 4 — "Confirme seu envio" (fork Escale, Fase 8B; 09-044, 09-045; N14,
 * N15). A lista já está congelada (a página preparou ao entrar): mostra os
 * elegíveis, quem ficou fora e por quê, a base legal, o teste, o custo "—" e o
 * aviso de limites.
 */
export function PassoConfirmar({
  estado,
  resumo,
  preparando,
  erroDaPreparacao,
  numero,
  fuso,
}: {
  estado: EstadoDoAssistente;
  resumo: ResumoDaPreparacao | null;
  preparando: boolean;
  erroDaPreparacao: string | null;
  numero: NumeroDaCampanha | null;
  fuso?: string;
}) {
  const t = useT();
  const d = estado.dados;
  const [contatos, setContatos] = useState(false);
  const [motivos, setMotivos] = useState(false);
  const [teste, setTeste] = useState(false);
  const elegiveis = resumo?.elegiveis ?? 0;
  const enviarPara = elegiveis === 1 ? t("1 contato selecionado") : t("{n} contatos selecionados").replace("{n}", numeroBr(elegiveis));

  return (
    <div className="max-w-[595px] space-y-4">
      <h1 className={TITULO_DO_PASSO}>{t("Confirme seu envio de mensagem de Whatsapp")}</h1>
      {preparando && (
        <p role="status" className="flex items-center gap-2 text-[13px] text-casca-texto-2">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t("Preparando a lista de envio…")}
        </p>
      )}
      {erroDaPreparacao && (
        <p role="alert" className="rounded-[8px] bg-(--escale-tom-vermelho-fundo) px-4 py-3 text-[13px] text-(--escale-tom-vermelho-texto)">
          {erroDaPreparacao}
        </p>
      )}
      <ResumoDoEnvio
        linhas={[
          { icone: <Tag className="size-3.5" />, rotulo: t("Nome da campanha"), valor: d.nome },
          { icone: <Zap className="size-3.5" />, rotulo: t("Quando enviar"), valor: t(quandoNoResumo(d.quando, fuso)) },
          {
            icone: <Users className="size-3.5" />,
            rotulo: t("Enviar para"),
            valor: (
              <span className="flex flex-wrap items-center gap-x-2">
                {enviarPara}
                <button type="button" onClick={() => setContatos(true)} className="font-semibold text-casca-texto">
                  {t("Ver contatos")}
                </button>
                {resumo && resumo.excluidos > 0 && (
                  <>
                    <span className="text-casca-meta">·</span>
                    <span className="text-casca-texto-2">{t("{n} fora da lista").replace("{n}", numeroBr(resumo.excluidos))}</span>
                    <button type="button" onClick={() => setMotivos(!motivos)} className="font-semibold text-casca-marca">
                      {motivos ? t("Ocultar motivos") : t("Ver motivos")}
                    </button>
                  </>
                )}
              </span>
            ),
          },
          {
            icone: <Send className="size-3.5" />,
            rotulo: t("Base legal"),
            valor: (
              <span className="flex flex-wrap items-center gap-x-3">
                {d.baseLegal === "consent" ? t("Consentimento") : `${t("Interesse legítimo")} · ${d.lia ?? ""}`}
                {estado.campanhaId && (
                  <button type="button" onClick={() => setTeste(true)} disabled={!resumo} className="font-semibold text-casca-marca disabled:opacity-40">
                    {t("Enviar teste")}
                  </button>
                )}
              </span>
            ),
          },
        ]}
        rodape={
          <div className="flex h-12 items-center justify-between bg-casca-marca-suave px-4">
            <span className="text-[13px] font-medium text-casca-marca">{t("Custo estimado:")}</span>
            <span className="text-[15px] font-bold text-casca-marca">—</span>
          </div>
        }
      />
      {motivos && resumo && (
        <ul className="space-y-1 rounded-[8px] border border-casca-borda p-3 text-[13px]">
          {resumo.motivos.map((m) => (
            <li key={m.motivo} className="flex justify-between gap-3">
              <span className="text-casca-texto">{t(textoDoMotivo(m.motivo))}</span>
              <span className="text-casca-texto-2">{numeroBr(m.quantidade)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-[8px] border-l-[3px] border-casca-marca bg-casca-marca-suave p-4">
        <p className="flex items-center gap-2 text-[13px] font-medium text-casca-marca">
          <HelpCircle className="size-3.5" aria-hidden />
          {t("Limites de envio do WhatsApp")}
        </p>
        <p className="mt-1 pl-[22px] text-[12px] text-casca-suave">
          {t("O WhatsApp possui limites diários de envio definidos pela Meta. A quantidade de conversas que você pode iniciar por dia depende do tipo de conexão e da qualidade dos seus envios.")}{" "}
          <a href={LIMITES_DA_META} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-casca-texto">
            {t("Saiba mais")}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        </p>
        <p className="mt-3 flex items-center gap-2 border-t border-casca-divisoria pt-3 pl-[22px] text-[12px] text-casca-meta">
          <Clock className="size-3" aria-hidden />
          {t("Seu envio poderá demorar alguns minutos para ser concluído.")}
        </p>
      </div>
      {numero && !numero.conectado && (
        <p role="alert" className="text-[12px] text-casca-alerta">
          {t("O número escolhido está fora do ar. A campanha só sai quando ele voltar.")}
        </p>
      )}
      <JanelaContatosSelecionados aberta={contatos} aoFechar={() => setContatos(false)} publico={d.publico} />
      {teste && estado.campanhaId && <JanelaTesteDaCampanha aberta aoFechar={() => setTeste(false)} campanhaId={estado.campanhaId} />}
    </div>
  );
}
```

> A prévia do passo 4 é a coluna lateral do molde: a página passa a mesma `PreviaDoCelular` do passo 1 (Task 15).

`components/escale/campanhas/assistente/FimDoAssistente.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";

import { useT } from "@/hooks/i18n/useT";
import { ROTA_DAS_CAMPANHAS } from "@/lib/escale/campanhas/rotas";
import { CircleCheck, CircleX } from "@/lib/ui/icons-da-casca";

import { BOTAO_CONTORNADO, BOTAO_DA_MARCA } from "../molde/estilos";

/**
 * O FIM DO ASSISTENTE (fork Escale, Fase 8B; PRD B18; sem print: provisório no
 * molde do vazio da 8A). Sucesso com "Criar nova campanha" e "Ir para a tela
 * inicial"; erro com a mensagem e "Tentar novamente".
 */
export function FimDoAssistente({
  resultado,
  aoNovaCampanha,
  aoTentarDeNovo,
}: {
  resultado: { tipo: "sucesso"; nome: string; modo: "iniciada" | "agendada" } | { tipo: "erro"; mensagem: string };
  aoNovaCampanha: () => void;
  aoTentarDeNovo: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const sucesso = resultado.tipo === "sucesso";
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span aria-hidden className={`flex size-14 items-center justify-center rounded-[10px] ${sucesso ? "bg-casca-marca-suave text-casca-marca" : "bg-(--escale-tom-vermelho-fundo) text-(--escale-tom-vermelho-texto)"}`}>
        {sucesso ? <CircleCheck className="size-6" /> : <CircleX className="size-6" />}
      </span>
      <p className="mt-4 text-[15px] font-semibold text-casca-texto">
        {resultado.tipo === "sucesso"
          ? (resultado.modo === "agendada" ? t("Campanha {nome} agendada com sucesso") : t("Campanha {nome} enviada com sucesso")).replace("{nome}", resultado.nome)
          : t("Erro ao criar campanha de WhatsApp")}
      </p>
      {resultado.tipo === "erro" && <p className="mt-2 max-w-[360px] text-[13px] text-casca-suave">{resultado.mensagem}</p>}
      <div className="mt-6 flex gap-2">
        {sucesso ? (
          <>
            <button type="button" onClick={aoNovaCampanha} className={BOTAO_CONTORNADO}>
              {t("Criar nova campanha")}
            </button>
            <button type="button" onClick={() => router.push(ROTA_DAS_CAMPANHAS)} className={BOTAO_DA_MARCA}>
              {t("Ir para a tela inicial")}
            </button>
          </>
        ) : (
          <button type="button" onClick={aoTentarDeNovo} className={BOTAO_DA_MARCA}>
            {t("Tentar novamente")}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-passo-4.test.tsx tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/campanhas/assistente lib/escale/campanhas/textos-do-assistente.ts tests/unit/escale-assistente-passo-4.test.tsx && corepack pnpm eslint components/escale/campanhas/assistente lib/escale/campanhas/textos-do-assistente.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/escale/campanhas/assistente lib/escale/campanhas/textos-do-assistente.ts tests/unit/escale-assistente-passo-4.test.tsx
git commit -m "feat(escale): passo 4 do assistente — confirmação com elegíveis e motivos, teste, custo e o fim (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---


### Task 15: A página do assistente e os encaixes

**Files:**
- Create: `components/escale/campanhas/assistente/AssistenteDeCampanha.tsx`, `tests/unit/escale-assistente-pagina.test.tsx`
- Modify: `app/app/campaigns/new/page.tsx`, `app/app/campaigns/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: tudo das Tasks 9–14; `origensDaPagina` (`lib/escale/contatos/origens-da-pagina.ts`: `{ origens, papel, opcoesDoFiltro }`); `requireAuth`, `resolveActiveOrg` (`lib/auth/server`); `roleAtLeast`; `COOKIE_DO_MENU`, `lerPreferenciaDeMenu`; `ROTA_DAS_CAMPANHAS`, `ROTA_DA_NOVA` (8A `rotas.ts`); `TooltipProvider` (`@/components/ui/tooltip`).
- Produces: `AssistenteDeCampanha({ campanhaId: string | null; origens: OrigemParaCriar[]; opcoesDoFiltro: OpcoesDoFiltro; papel: Role; fuso?: string })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-assistente-pagina.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const salvar = vi.fn();
const acao = vi.fn();
const salvo = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }), redirect: vi.fn(), useSearchParams: () => new URLSearchParams() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "topo" }) }) }));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: "manager", timezone: "America/Sao_Paulo" })),
}));
vi.mock("@/lib/escale/contatos/origens-da-pagina", () => ({ origensDaPagina: vi.fn(async () => ({ origens: [], papel: "manager", opcoesDoFiltro: {} })) }));
vi.mock("@/hooks/escale/useAssistenteDeCampanha", () => ({
  useNumerosDaCampanha: () => ({ data: [{ id: "aaaaaaaa-0000-4000-8000-000000000002", nome: "Naiara", telefone: null, conectado: true, oficial: false, provider: "p", setor: null }] }),
  useAssistenteSalvo: (id: string | null) => salvo(id),
  useSalvarAssistente: () => ({ mutateAsync: salvar, isPending: false }),
  useAcaoDoAssistente: () => ({ mutateAsync: acao, isPending: false }),
  usePaginaDoPublico: () => ({ data: { linhas: [], total: 1 }, isLoading: false }),
  useForaDaLista: () => ({ data: [] }),
  useAcompanharImportacao: () => ({ data: undefined }),
  contatosDaImportacao: vi.fn(),
}));
vi.mock("@/hooks/escale/useCamposDaCampanha", () => ({ useCamposDaCampanha: () => [] }));
vi.mock("@/hooks/escale/useModelosDeMensagem", () => ({ useModelosDeMensagem: () => ({ modelos: [], recentes: [], marcarUsado: vi.fn(), recarregar: vi.fn() }) }));
vi.mock("@/hooks/campanhas/useConfiguracao", () => ({ useTextosSalvos: () => ({ data: [] }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org-1" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({ useContactTagVocabulary: () => ({ data: [] }) }));
vi.mock("@/hooks/escale/useImportacoes", () => ({ useDestinosDaImportacao: () => ({ data: [] }) }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: { data: [] } }) }));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: { data: [] } }) }));
vi.mock("@/components/escale/contatos/JanelaNovoContato", () => ({ JanelaNovoContato: () => null }));

import NovaCampanhaPage from "@/app/app/campaigns/new/page";
import { AssistenteDeCampanha } from "@/components/escale/campanhas/assistente/AssistenteDeCampanha";
import { POS_ENVIO_PADRAO, type Assistente } from "@/lib/escale/campanhas/assistente";

const comConsulta = (ui: ReactNode) => <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
const PRONTO: Assistente = {
  nome: "Reativação de junho",
  numeroId: "aaaaaaaa-0000-4000-8000-000000000002",
  mensagem: { tipo: "texto", texto: "Oi {{primeiro_nome}}" },
  quando: { modo: "agora" },
  baseLegal: "consent",
  lia: null,
  publico: { selecao: null, avulsos: ["bbbbbbbb-0000-4000-8000-000000000001"], removidos: [] },
  posEnvio: POS_ENVIO_PADRAO,
  agenteId: null,
  ritmo: {},
  numerosExtras: [],
};
const montar = (campanhaId: string | null) =>
  render(comConsulta(<AssistenteDeCampanha campanhaId={campanhaId} origens={[]} opcoesDoFiltro={{} as never} papel="manager" fuso="America/Sao_Paulo" />));

beforeEach(() => {
  vi.clearAllMocks();
  salvo.mockReturnValue({ data: undefined, isLoading: false });
  salvar.mockResolvedValue("c-1");
  acao.mockImplementation(async ({ acao: a }: { acao: string }) =>
    a === "preparar" ? { resumo: { total: 1, elegiveis: 1, excluidos: 0, motivos: [] } } : a === "enviar" ? { modo: "iniciada", quando: null } : { status: "draft" },
  );
});

describe("AssistenteDeCampanha", () => {
  it("a trilha, a barra e o passo 1; 'Próximo' com erro não avança", async () => {
    montar(null);
    expect(screen.getByText("Nova campanha")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("list", { name: "Passos da campanha" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByText("Escolha o dispositivo de WhatsApp.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mensagem de WhatsApp" })).toBeInTheDocument();
  });

  it("do rascunho ao 'Enviar Whatsapp': salva e prepara ao entrar no passo 4, envia e mostra o sucesso", async () => {
    salvo.mockReturnValue({ data: { campanhaId: "c-1", status: "draft", assistente: PRONTO, publicoAntigo: false }, isLoading: false });
    montar("c-1");
    await screen.findByDisplayValue("Reativação de junho");
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByText("Escolha para quem você quer enviar Whatsapp")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByRole("heading", { name: "Configurações opcionais" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await waitFor(() => expect(acao).toHaveBeenCalledWith({ id: "c-1", acao: "preparar" }));
    expect(salvar).toHaveBeenCalledWith({ campanhaId: "c-1", dados: PRONTO });
    await userEvent.click(await screen.findByRole("button", { name: "Enviar Whatsapp" }));
    expect(await screen.findByText("Campanha Reativação de junho enviada com sucesso")).toBeInTheDocument();
  });

  it("'Voltar' do passo 4 devolve a campanha a rascunho; 'Salvar como rascunho' volta à lista", async () => {
    salvo.mockReturnValue({ data: { campanhaId: "c-1", status: "draft", assistente: PRONTO, publicoAntigo: false }, isLoading: false });
    montar("c-1");
    await screen.findByDisplayValue("Reativação de junho");
    for (let i = 0; i < 3; i++) await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await screen.findByRole("button", { name: "Enviar Whatsapp" });
    await userEvent.click(screen.getByRole("button", { name: "Salvar como rascunho" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/campaigns"));
    expect(acao).toHaveBeenCalledWith({ id: "c-1", acao: "rascunho" });
  });

  it("campanha que ficou 'Pronta' (aba fechada no passo 4) volta a rascunho ao abrir", async () => {
    salvo.mockReturnValue({ data: { campanhaId: "c-1", status: "ready", assistente: PRONTO, publicoAntigo: false }, isLoading: false });
    montar("c-1");
    await waitFor(() => expect(acao).toHaveBeenCalledWith({ id: "c-1", acao: "rascunho" }));
  });

  it("campanha que já saiu não abre no assistente", async () => {
    salvo.mockReturnValue({ data: { campanhaId: "c-1", status: "running", assistente: PRONTO, publicoAntigo: false }, isLoading: false });
    montar("c-1");
    expect(await screen.findByText("Esta campanha não é mais um rascunho.")).toBeInTheDocument();
  });
});

describe("o encaixe em /app/campaigns/new", () => {
  it("com a casca, devolve o assistente", async () => {
    const el = (await NovaCampanhaPage()) as { type: unknown; props: { campanhaId: string | null } };
    expect(el.type).toBe(AssistenteDeCampanha);
    expect(el.props.campanhaId).toBeNull();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-assistente-pagina.test.tsx`
Expected: FAIL.

- [ ] **Step 2: `components/escale/campanhas/assistente/AssistenteDeCampanha.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAcaoDoAssistente, useAssistenteSalvo, useNumerosDaCampanha, useSalvarAssistente } from "@/hooks/escale/useAssistenteDeCampanha";
import { useCamposDaCampanha } from "@/hooks/escale/useCamposDaCampanha";
import { useT } from "@/hooks/i18n/useT";
import type { Role } from "@/lib/auth/types";
import { roleAtLeast } from "@/lib/auth/types";
import type { ResumoDaPreparacao } from "@/lib/escale/campanhas/acoes-do-assistente";
import { assistenteSchema } from "@/lib/escale/campanhas/assistente";
import { PASSOS_DO_ASSISTENTE, errosDoPasso, estadoInicial, redutorDoAssistente, type Passo } from "@/lib/escale/campanhas/estado-do-assistente";
import { partesDaMensagem } from "@/lib/escale/campanhas/previa";
import { ROTA_DAS_CAMPANHAS } from "@/lib/escale/campanhas/rotas";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { Send } from "@/lib/ui/icons-da-casca";

import { MoldeDoAssistente } from "../molde/MoldeDoAssistente";
import { RodapeDoAssistente } from "../molde/RodapeDoAssistente";
import { TrilhaDoAssistente } from "../molde/TrilhaDoAssistente";
import { BOTAO_CONTORNADO } from "../molde/estilos";
import { FimDoAssistente } from "./FimDoAssistente";
import { PassoConfigurar } from "./PassoConfigurar";
import { PassoConfirmar } from "./PassoConfirmar";
import { PassoContatos } from "./PassoContatos";
import { PassoOpcionais } from "./PassoOpcionais";
import { PreviaDoCelular } from "./PreviaDoCelular";

type Fim = { tipo: "sucesso"; nome: string; modo: "iniciada" | "agendada" } | { tipo: "erro"; mensagem: string };
const mensagemDe = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

/**
 * O ASSISTENTE DE CAMPANHA (fork Escale, Fase 8B; PRD B1–B18; N2, N14, N16,
 * N19). Os 4 passos da Clint no molde, a prévia do celular nos passos 1 e 4,
 * o rascunho salvo e preparado ao entrar no passo 4, e o fim. Monta o
 * `TooltipProvider` das dicas (memória "provedor escondido pelo teste").
 */
export function AssistenteDeCampanha({
  campanhaId,
  origens,
  opcoesDoFiltro,
  papel,
  fuso,
}: {
  campanhaId: string | null;
  origens: OrigemParaCriar[];
  opcoesDoFiltro: OpcoesDoFiltro;
  papel: Role;
  fuso?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [estado, despachar] = useReducer(redutorDoAssistente, undefined, estadoInicial);
  const numeros = useNumerosDaCampanha().data ?? [];
  const salvo = useAssistenteSalvo(campanhaId);
  const salvar = useSalvarAssistente();
  const acao = useAcaoDoAssistente();
  const personalizados = useCamposDaCampanha();
  const [resumo, setResumo] = useState<ResumoDaPreparacao | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [erroDaPreparacao, setErroDaPreparacao] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [fim, setFim] = useState<Fim | null>(null);
  const [bloqueada, setBloqueada] = useState(false);
  const carregado = useRef(false);

  useEffect(() => {
    const dados = salvo.data;
    if (!dados || carregado.current) return;
    carregado.current = true;
    if (dados.status !== "draft" && dados.status !== "ready") {
      setBloqueada(true);
      return;
    }
    const carregar = () => despachar({ tipo: "carregar", campanhaId: dados.campanhaId, dados: dados.assistente, publicoAntigo: dados.publicoAntigo });
    if (dados.status === "ready") {
      // Quem fechou a aba no passo 4 deixou a campanha "Pronta": volta a rascunho para editar (N14).
      acao.mutateAsync({ id: dados.campanhaId, acao: "rascunho" }).then(carregar, () => setBloqueada(true));
    } else {
      carregar();
    }
  }, [salvo.data, acao]);

  const d = estado.dados;
  const numero = numeros.find((n) => n.id === d.numeroId) ?? null;
  const partes = partesDaMensagem(d.mensagem, personalizados);
  const trilha = (
    <TrilhaDoAssistente
      itens={[
        { rotulo: t("Campanhas"), href: ROTA_DAS_CAMPANHAS },
        { rotulo: t("WhatsApp"), href: ROTA_DAS_CAMPANHAS },
        { rotulo: campanhaId ? t("Editar rascunho") : t("Nova campanha") },
      ]}
    />
  );

  async function prepararPasso4() {
    setPreparando(true);
    setErroDaPreparacao(null);
    setResumo(null);
    try {
      const lido = assistenteSchema.safeParse(d);
      if (!lido.success) throw new Error(t("Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente."));
      const id = await salvar.mutateAsync({ campanhaId: estado.campanhaId, dados: lido.data });
      if (id !== estado.campanhaId) despachar({ tipo: "salvo", campanhaId: id });
      const r = await acao.mutateAsync({ id, acao: "preparar" });
      setResumo(r.resumo as ResumoDaPreparacao);
    } catch (e) {
      setErroDaPreparacao(mensagemDe(e, t("Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente.")));
    } finally {
      setPreparando(false);
    }
  }

  function proximo() {
    const erros = errosDoPasso(estado.passo, d, { numero, agora: new Date() });
    if (Object.keys(erros).length > 0) {
      despachar({ tipo: "tentou" });
      return;
    }
    const seguinte = (estado.passo + 1) as Passo;
    despachar({ tipo: "irPara", passo: seguinte });
    if (seguinte === 3) void prepararPasso4();
  }

  async function voltar() {
    if (estado.passo === 0) return router.push(ROTA_DAS_CAMPANHAS);
    if (estado.passo === 3 && estado.campanhaId && resumo) {
      try {
        await acao.mutateAsync({ id: estado.campanhaId, acao: "rascunho" });
      } catch (e) {
        toast.error(mensagemDe(e, t("Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente.")));
        return;
      }
      setResumo(null);
    }
    despachar({ tipo: "irPara", passo: (estado.passo - 1) as Passo });
  }

  async function salvarComoRascunho() {
    if (!estado.campanhaId) return;
    try {
      await acao.mutateAsync({ id: estado.campanhaId, acao: "rascunho" });
      toast.success(t("Rascunho salvo com sucesso."));
      router.push(ROTA_DAS_CAMPANHAS);
    } catch (e) {
      toast.error(mensagemDe(e, t("Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente.")));
    }
  }

  async function enviar() {
    if (!estado.campanhaId) return;
    setEnviando(true);
    try {
      const r = await acao.mutateAsync({ id: estado.campanhaId, acao: "enviar" });
      setFim({ tipo: "sucesso", nome: d.nome, modo: r.modo === "agendada" ? "agendada" : "iniciada" });
    } catch (e) {
      setFim({ tipo: "erro", mensagem: mensagemDe(e, t("Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente.")) });
    } finally {
      setEnviando(false);
    }
  }

  if (bloqueada) {
    return (
      <div className="flex flex-col bg-surface">
        {trilha}
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-casca-texto">{t("Esta campanha não é mais um rascunho.")}</p>
          <button type="button" onClick={() => router.push(ROTA_DAS_CAMPANHAS)} className={BOTAO_CONTORNADO}>
            {t("Ir para a tela inicial")}
          </button>
        </div>
      </div>
    );
  }
  if (campanhaId && !carregado.current && salvo.isLoading) {
    return (
      <div className="flex flex-col bg-surface">
        {trilha}
        <p role="status" className="px-6 py-16 text-center text-[13px] text-casca-suave">
          {t("Carregando campanha")}
        </p>
      </div>
    );
  }
  if (fim) {
    return (
      <div className="flex min-h-[28rem] flex-col bg-surface">
        {trilha}
        <FimDoAssistente
          resultado={fim}
          aoNovaCampanha={() => {
            setFim(null);
            setResumo(null);
            despachar({ tipo: "reiniciar" });
            router.push("/app/campaigns/new");
          }}
          aoTentarDeNovo={() => setFim(null)}
        />
      </div>
    );
  }

  const passos = PASSOS_DO_ASSISTENTE.map((p) => t(p));
  const lateral =
    estado.passo === 0 || estado.passo === 3 ? (
      <PreviaDoCelular
        dispositivo={numero?.nome ?? null}
        partes={partes}
        vazio={numero?.oficial ? t("Selecione um modelo para ver a prévia da mensagem") : t("Escreva a mensagem para ver a prévia")}
      />
    ) : undefined;
  const rodape =
    estado.passo === 3 ? (
      <RodapeDoAssistente
        aoVoltar={() => void voltar()}
        extras={
          <button type="button" disabled={!resumo || enviando} onClick={() => void salvarComoRascunho()} className={BOTAO_CONTORNADO}>
            {t("Salvar como rascunho")}
          </button>
        }
        principal={{ rotulo: t("Enviar Whatsapp"), aoClicar: () => void enviar(), carregando: enviando, desabilitado: !resumo, icone: <Send className="size-3.5" aria-hidden /> }}
      />
    ) : (
      <RodapeDoAssistente aoVoltar={() => void voltar()} principal={{ rotulo: t("Próximo"), aoClicar: proximo }} />
    );

  return (
    <TooltipProvider>
      <MoldeDoAssistente trilha={trilha} passos={passos} atual={estado.passo} rodape={rodape} lateral={lateral}>
        {estado.passo === 0 && (
          <PassoConfigurar estado={estado} despachar={despachar} numeros={numeros} personalizados={personalizados} podeSincronizar={roleAtLeast(papel, "admin")} />
        )}
        {estado.passo === 1 && (
          <PassoContatos estado={estado} despachar={despachar} numeroOficial={numero?.oficial ?? false} origens={origens} opcoesDoFiltro={opcoesDoFiltro} />
        )}
        {estado.passo === 2 && <PassoOpcionais estado={estado} despachar={despachar} numeros={numeros} />}
        {estado.passo === 3 && (
          <PassoConfirmar estado={estado} resumo={resumo} preparando={preparando} erroDaPreparacao={erroDaPreparacao} numero={numero} fuso={fuso} />
        )}
      </MoldeDoAssistente>
    </TooltipProvider>
  );
}
```

> O `useEffect` depende de `acao` (o objeto da mutação muda a cada render); o `carregado` (ref) garante que a carga roda uma vez. Se o eslint (`react-hooks/exhaustive-deps`) pedir `acao.mutateAsync`, use `const voltarAoRascunho = acao.mutateAsync` fora do efeito e ponha-o na lista.

- [ ] **Step 3: Os encaixes nas páginas**

Troque `app/app/campaigns/new/page.tsx` inteiro por:

```tsx
import type { Metadata } from "next";
// ── FORK ESCALE · Fase 8B: com a casca, o assistente da Clint ──
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AssistenteDeCampanha } from "@/components/escale/campanhas/assistente/AssistenteDeCampanha";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { roleAtLeast } from "@/lib/auth/types";
import { origensDaPagina } from "@/lib/escale/contatos/origens-da-pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

import { NovaCampanha } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nova campanha" };

export default async function NovaCampanhaPage() {
  // ── FORK ESCALE · Fase 8B ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    const org = await resolveActiveOrg(await requireAuth());
    if (!org || !roleAtLeast(org.role, "manager")) redirect("/app/inbox");
    const { origens, opcoesDoFiltro } = await origensDaPagina();
    return (
      <AssistenteDeCampanha campanhaId={null} origens={origens} opcoesDoFiltro={opcoesDoFiltro} papel={org.role} fuso={org.timezone ?? undefined} />
    );
  }
  // ── fim FORK ESCALE ──
  return <NovaCampanha />;
}
```

E `app/app/campaigns/[id]/edit/page.tsx` inteiro por:

```tsx
import type { Metadata } from "next";
// ── FORK ESCALE · Fase 8B: com a casca, o rascunho (e a cópia) abrem no assistente ──
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AssistenteDeCampanha } from "@/components/escale/campanhas/assistente/AssistenteDeCampanha";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { roleAtLeast } from "@/lib/auth/types";
import { origensDaPagina } from "@/lib/escale/contatos/origens-da-pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

import { EditarCampanha } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar campanha" };

export default async function EditarCampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ── FORK ESCALE · Fase 8B ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    const org = await resolveActiveOrg(await requireAuth());
    if (!org || !roleAtLeast(org.role, "manager")) redirect("/app/inbox");
    const { origens, opcoesDoFiltro } = await origensDaPagina();
    return <AssistenteDeCampanha campanhaId={id} origens={origens} opcoesDoFiltro={opcoesDoFiltro} papel={org.role} fuso={org.timezone ?? undefined} />;
  }
  // ── fim FORK ESCALE ──
  return <EditarCampanha id={id} />;
}
```

> `origensDaPagina()` é a da lista de Contatos (2A): carrega as origens com as etapas e as opções dos filtros no servidor. Se a assinatura pedir argumentos (`sed -n 30,45p lib/escale/contatos/origens-da-pagina.ts`), passe os mesmos que `app/app/contacts/page.tsx` passa.

- [ ] **Step 4: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-assistente-pagina.test.tsx tests/unit/escale-casca-v2-original-intacto.test.tsx app/app/campaigns && corepack pnpm prettier --write components/escale/campanhas/assistente/AssistenteDeCampanha.tsx tests/unit/escale-assistente-pagina.test.tsx && corepack pnpm eslint components/escale/campanhas app/app/campaigns && corepack pnpm typecheck`
Expected: PASS — os testes do original em `app/app/campaigns/**` seguem verdes (sem a casca, as páginas devolvem os mesmos clientes).

- [ ] **Step 5: Commit**

```bash
git add components/escale/campanhas/assistente/AssistenteDeCampanha.tsx app/app/campaigns/new/page.tsx "app/app/campaigns/[id]/edit/page.tsx" tests/unit/escale-assistente-pagina.test.tsx
git commit -m "feat(escale): página do assistente de campanha e os encaixes em nova e editar (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 16: Espanhol, cercas, PRD, LOG e o PR B

**Files:**
- Modify: `lib/i18n/dicionario.ts`; fora do repositório, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md` e `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`

- [ ] **Step 1: Quais chaves já existem**

O dicionário recusa chave repetida. Use o mesmo script da 8A (Task 10, Step 1 do plano da 8A: `$TEMP/chaves-8a.cjs`), com as chaves do bloco abaixo em `$TEMP/chaves-8b.txt` (uma por linha), e tire do bloco toda chave que sair como `JA:`. Em 19/10 já existiam (e ficaram de fora): "Campanhas", "WhatsApp", "Voltar", "Próximo", "Cancelar", "Selecionar", "Adicionar", "Limpar", "Tentar novamente", "Nome", "Etapa", "Fechado", "Em aberto", "Em espera", "Mais opções", "Status da conversa", "Selecione...", "Selecione uma origem", "Selecione uma etapa", "Mensagem", "Data e horário", "Aprovado", "Editar modelo", "Ver contatos", "Saiba mais", "Dados inválidos.", "Campanha não encontrada.", "Ação de campanha desconhecida.", "Tags", "Filtros", "Buscar por contato ou Empresa", "Selecionar todos", "Sem telefone", "negócio", "Consentimento", "Interesse legítimo", "Base legal", "Ir para a tela inicial", "Editar rascunho" e os textos da 8A.

- [ ] **Step 2: O bloco do espanhol**

Em `lib/i18n/dicionario.ts`, logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` (depois do bloco da 8A):

```ts
  // ─── FORK ESCALE · Fase 8B: assistente de campanha ───
  "Trilha": { es: "Ruta" },
  "Passos da campanha": { es: "Pasos de la campaña" },
  "Nova campanha": { es: "Nueva campaña" },
  "Configure a sua campanha": { es: "Configura tu campaña" },
  "Escolha seus contatos": { es: "Elige tus contactos" },
  "Configurações opcionais": { es: "Configuraciones opcionales" },
  "Confirme seu envio": { es: "Confirma tu envío" },
  "Mensagem de WhatsApp Oficial": { es: "Mensaje de WhatsApp Oficial" },
  "Mensagem de WhatsApp": { es: "Mensaje de WhatsApp" },
  "Defina os dados da campanha e escolha o modelo de mensagem que será enviado.": { es: "Define los datos de la campaña y elige la plantilla de mensaje que se enviará." },
  "Nome da campanha": { es: "Nombre de la campaña" },
  "Ex: Reativação de junho": { es: "Ej.: Reactivación de junio" },
  "Limite de {max} caracteres atingido.": { es: "Límite de {max} caracteres alcanzado." },
  "O nome da campanha deve ter pelo menos 3 caracteres.": { es: "El nombre de la campaña debe tener al menos 3 caracteres." },
  "O nome da campanha deve ter no máximo 80 caracteres.": { es: "El nombre de la campaña debe tener como máximo 80 caracteres." },
  "Dispositivo de WhatsApp": { es: "Dispositivo de WhatsApp" },
  "Selecionar conta": { es: "Seleccionar cuenta" },
  "Nenhum dispositivo disponível": { es: "Ningún dispositivo disponible" },
  "Escolha o dispositivo de WhatsApp.": { es: "Elige el dispositivo de WhatsApp." },
  "WhatsApp Oficial": { es: "WhatsApp Oficial" },
  "WhatsApp não oficial": { es: "WhatsApp no oficial" },
  "Modelo de mensagem": { es: "Plantilla de mensaje" },
  "+ Selecionar modelo existente": { es: "+ Seleccionar plantilla existente" },
  "Remover selecionado": { es: "Quitar seleccionado" },
  "Escolha um modelo de mensagem.": { es: "Elige una plantilla de mensaje." },
  "Escreva a mensagem.": { es: "Escribe el mensaje." },
  "Variáveis do modelo": { es: "Variables de la plantilla" },
  "{n} de {m} resolvida": { es: "{n} de {m} resuelta" },
  "{n} de {m} resolvidas": { es: "{n} de {m} resueltas" },
  "Resolva as variáveis do modelo para avançar.": { es: "Resuelve las variables de la plantilla para avanzar." },
  "Origem do valor": { es: "Origen del valor" },
  "Campo do CRM": { es: "Campo del CRM" },
  "Valor fixo": { es: "Valor fijo" },
  "+ Definir texto alternativo": { es: "+ Definir texto alternativo" },
  "Texto alternativo": { es: "Texto alternativo" },
  "Texto usado quando o contato não tem o dado": { es: "Texto usado cuando el contacto no tiene el dato" },
  "Primeiro nome": { es: "Primer nombre" },
  "Saudação": { es: "Saludo" },
  "Inserir variável": { es: "Insertar variable" },
  "Usar texto salvo": { es: "Usar texto guardado" },
  "Escolher mensagem": { es: "Elegir mensaje" },
  "Escolher texto salvo": { es: "Elegir texto guardado" },
  "Sincronizar modelos": { es: "Sincronizar plantillas" },
  "Novo modelo": { es: "Nueva plantilla" },
  "Pesquisar por...": { es: "Buscar por..." },
  "Todas as categorias": { es: "Todas las categorías" },
  "Marketing": { es: "Marketing" },
  "Utilidade": { es: "Utilidad" },
  "Autenticação": { es: "Autenticación" },
  "Português (BR)": { es: "Portugués (BR)" },
  "Português (PT)": { es: "Portugués (PT)" },
  "Inglês (EUA)": { es: "Inglés (EE. UU.)" },
  "Espanhol": { es: "Español" },
  "USADOS RECENTEMENTE": { es: "USADOS RECIENTEMENTE" },
  "TODOS OS MODELOS": { es: "TODAS LAS PLANTILLAS" },
  "TEXTOS SALVOS": { es: "TEXTOS GUARDADOS" },
  "Nenhum modelo aprovado": { es: "Ninguna plantilla aprobada" },
  "Nenhum texto salvo": { es: "Ningún texto guardado" },
  "Selecione um modelo de mensagem à sua esquerda para enviar.": { es: "Selecciona una plantilla de mensaje a tu izquierda para enviar." },
  "As variáveis serão preenchidas com os dados de cada contato no envio.": { es: "Las variables se completarán con los datos de cada contacto en el envío." },
  "Mapear variáveis": { es: "Mapear variables" },
  "Este modelo tem mídia sem link salvo ou variável fora do corpo. Ajuste em Modelos antes de usar na campanha.": { es: "Esta plantilla tiene medio sin enlace guardado o variable fuera del cuerpo. Ajústala en Plantillas antes de usarla en la campaña." },
  "Quando enviar": { es: "Cuándo enviar" },
  "Enviar agora": { es: "Enviar ahora" },
  "A campanha entra na fila imediatamente.": { es: "La campaña entra en la cola de inmediato." },
  "Criar agendamento": { es: "Crear programación" },
  "Escolha data e horário para o disparo.": { es: "Elige fecha y hora para el envío." },
  "Você precisa selecionar uma data.": { es: "Debes seleccionar una fecha." },
  "A hora selecionada não pode ser menor que o horário atual.": { es: "La hora seleccionada no puede ser anterior a la hora actual." },
  "A pessoa autorizou receber mensagens.": { es: "La persona autorizó recibir mensajes." },
  "Uma avaliação (LIA) justifica o contato.": { es: "Una evaluación (LIA) justifica el contacto." },
  "Referência da avaliação (LIA)": { es: "Referencia de la evaluación (LIA)" },
  "Interesse legítimo exige a referência da avaliação (LIA).": { es: "El interés legítimo exige la referencia de la evaluación (LIA)." },
  "Dispositivo": { es: "Dispositivo" },
  "online": { es: "en línea" },
  "Selecione um modelo para ver a prévia da mensagem": { es: "Selecciona una plantilla para ver la vista previa del mensaje" },
  "Escreva a mensagem para ver a prévia": { es: "Escribe el mensaje para ver la vista previa" },
  "Escolha para quem você quer enviar Whatsapp": { es: "Elige a quién quieres enviar WhatsApp" },
  "Adicionar contato": { es: "Agregar contacto" },
  "Cadastre um contato manualmente": { es: "Registra un contacto manualmente" },
  "Selecionar contatos": { es: "Seleccionar contactos" },
  "Escolha da sua base de contatos": { es: "Elige de tu base de contactos" },
  "Importar telefones .csv": { es: "Importar teléfonos .csv" },
  "Importe uma lista .csv": { es: "Importa una lista .csv" },
  "Destinatários": { es: "Destinatarios" },
  "editar seleção": { es: "editar selección" },
  "Remover contatos": { es: "Quitar contactos" },
  "Remover todos os destinatários?": { es: "¿Quitar todos los destinatarios?" },
  "Remover da lista": { es: "Quitar de la lista" },
  "Você deve selecionar pelo menos um contato.": { es: "Debes seleccionar al menos un contacto." },
  "Esta campanha usava o público por filtro da tela antiga; escolha os destinatários de novo.": { es: "Esta campaña usaba la audiencia por filtro de la pantalla antigua; elige los destinatarios de nuevo." },
  "Importando contatos…": { es: "Importando contactos…" },
  "A importação espera a sua revisão em Importações; os contatos entram aqui quando ela terminar.": { es: "La importación espera tu revisión en Importaciones; los contactos entran aquí cuando termine." },
  "{n} contatos adicionados.": { es: "{n} contactos agregados." },
  "Não foi possível ler os contatos importados. Tente de novo.": { es: "No se pudieron leer los contactos importados. Inténtalo de nuevo." },
  "A importação não terminou. Veja o relatório em Importações.": { es: "La importación no terminó. Mira el informe en Importaciones." },
  "Contatos duplicados não poderão ser selecionados": { es: "Los contactos duplicados no podrán seleccionarse" },
  "Nenhum contato selecionado": { es: "Ningún contacto seleccionado" },
  "{n} selecionado": { es: "{n} seleccionado" },
  "{n} selecionados": { es: "{n} seleccionados" },
  "A quantidade de contatos pode variar até o momento do envio.": { es: "La cantidad de contactos puede variar hasta el momento del envío." },
  "Não foram encontrados contatos.": { es: "No se encontraron contactos." },
  "Tente ajustar a busca ou os filtros.": { es: "Intenta ajustar la búsqueda o los filtros." },
  "Não foi possível carregar os contatos.": { es: "No se pudieron cargar los contactos." },
  "PASSO 1 DE 3": { es: "PASO 1 DE 3" },
  "Escolha o arquivo .CSV que você quer enviar WhatsApp em massa": { es: "Elige el archivo .CSV al que quieres enviar WhatsApp masivo" },
  "Instruções": { es: "Instrucciones" },
  "Baixe o arquivo de modelos de preenchimento abaixo para ajudá-lo no mapeamento de campos do seu arquivo. Lembre-se de mapear os campos conforme as variáveis que você utiliza no modelo de mensagem que quer enviar.": { es: "Descarga el archivo de ejemplo de abajo para ayudarte a mapear los campos de tu archivo. Recuerda mapear los campos según las variables que usas en la plantilla de mensaje que quieres enviar." },
  "Baixar arquivo de exemplo .CSV": { es: "Descargar archivo de ejemplo .CSV" },
  "Importar agora": { es: "Importar ahora" },
  "Oi {{1}}, tudo bem?": { es: "Hola {{1}}, ¿todo bien?" },
  "Personalize as configurações da sua campanha no CRM. Essas configurações são opcionais e serão aplicadas somente aos contatos que obtiverem sucesso na campanha após sua conclusão.": { es: "Personaliza las configuraciones de tu campaña en el CRM. Son opcionales y se aplicarán solo a los contactos que tengan éxito en la campaña tras su conclusión." },
  "Adicionar tag para contatos": { es: "Agregar etiqueta a los contactos" },
  "A tag entra pelo mesmo caminho da tela e liga as automações de \"tag adicionada\".": { es: "La etiqueta entra por el mismo camino de la pantalla y activa las automatizaciones de \"etiqueta agregada\"." },
  "As tags serão aplicadas aos contatos alcançados pela campanha.": { es: "Las etiquetas se aplicarán a los contactos alcanzados por la campaña." },
  "Adicionar tag": { es: "Agregar etiqueta" },
  "Adicione uma tag": { es: "Agrega una etiqueta" },
  "Remover {tag}": { es: "Quitar {tag}" },
  "Negócios e atendimento": { es: "Negocios y atención" },
  "Defina como os contatos serão tratados no funil após o envio.": { es: "Define cómo se tratarán los contactos en el embudo tras el envío." },
  "Criar negócios em uma origem": { es: "Crear negocios en un origen" },
  "O negócio nasce para todos os contatos que receberam a mensagem, nesta origem e etapa.": { es: "El negocio nace para todos los contactos que recibieron el mensaje, en este origen y etapa." },
  "Para atendimentos existentes manter o status atual da conversa": { es: "Para atenciones existentes mantener el estado actual de la conversación" },
  "Atribuir um atendente": { es: "Asignar un agente" },
  "Para atendimentos existentes manter o mesmo atendente": { es: "Para atenciones existentes mantener el mismo agente" },
  "Manter atendente de acordo com a distribuição de dono do negócio": { es: "Mantener agente según la distribución de dueño del negocio" },
  "O atendente é o dono do negócio criado na origem (a distribuição de dono da origem decide quem é).": { es: "El agente es el dueño del negocio creado en el origen (la distribución de dueño del origen decide quién es)." },
  "Quem atende a resposta": { es: "Quién atiende la respuesta" },
  "O agente que responde quem escrever de volta. Em branco, vale o do número.": { es: "El agente que responde a quien escriba de vuelta. En blanco, vale el del número." },
  "O do número": { es: "El del número" },
  "Ritmo de envio": { es: "Ritmo de envío" },
  "A campanha só pode ser mais lenta que o número. Em branco, vale o ritmo do número.": { es: "La campaña solo puede ser más lenta que el número. En blanco, vale el ritmo del número." },
  "Intervalo entre mensagens (segundos)": { es: "Intervalo entre mensajes (segundos)" },
  "Máximo por dia": { es: "Máximo por día" },
  "Máximo por hora": { es: "Máximo por hora" },
  "Enviar a partir das (hora)": { es: "Enviar a partir de las (hora)" },
  "Enviar até as (hora)": { es: "Enviar hasta las (hora)" },
  "Números extras": { es: "Números extra" },
  "Outros números que dividem o envio com o principal (rodízio).": { es: "Otros números que dividen el envío con el principal (rotación)." },
  "Nenhum número extra": { es: "Ningún número extra" },
  "Confirme seu envio de mensagem de Whatsapp": { es: "Confirma tu envío de mensaje de WhatsApp" },
  "Preparando a lista de envio…": { es: "Preparando la lista de envío…" },
  "Envio imediato": { es: "Envío inmediato" },
  "Enviar para": { es: "Enviar a" },
  "1 contato selecionado": { es: "1 contacto seleccionado" },
  "{n} contatos selecionados": { es: "{n} contactos seleccionados" },
  "{n} fora da lista": { es: "{n} fuera de la lista" },
  "Ver motivos": { es: "Ver motivos" },
  "Ocultar motivos": { es: "Ocultar motivos" },
  "Enviar teste": { es: "Enviar prueba" },
  "Teste enviado.": { es: "Prueba enviada." },
  "Não foi possível enviar o teste.": { es: "No se pudo enviar la prueba." },
  "Enviando…": { es: "Enviando…" },
  "Custo estimado:": { es: "Costo estimado:" },
  "Limites de envio do WhatsApp": { es: "Límites de envío de WhatsApp" },
  "O WhatsApp possui limites diários de envio definidos pela Meta. A quantidade de conversas que você pode iniciar por dia depende do tipo de conexão e da qualidade dos seus envios.": { es: "WhatsApp tiene límites diarios de envío definidos por Meta. La cantidad de conversaciones que puedes iniciar por día depende del tipo de conexión y de la calidad de tus envíos." },
  "Seu envio poderá demorar alguns minutos para ser concluído.": { es: "Tu envío puede tardar algunos minutos en completarse." },
  "O número escolhido está fora do ar. A campanha só sai quando ele voltar.": { es: "El número elegido está fuera de servicio. La campaña solo sale cuando vuelva." },
  "Contatos selecionados": { es: "Contactos seleccionados" },
  "Salvar como rascunho": { es: "Guardar como borrador" },
  "Enviar Whatsapp": { es: "Enviar WhatsApp" },
  "Rascunho salvo com sucesso.": { es: "Borrador guardado con éxito." },
  "Falha ao enviar os dados, revise os dados preenchidos ou aguarde e tente novamente.": { es: "Error al enviar los datos, revisa los datos completados o espera e inténtalo de nuevo." },
  "Campanha {nome} enviada com sucesso": { es: "Campaña {nome} enviada con éxito" },
  "Campanha {nome} agendada com sucesso": { es: "Campaña {nome} programada con éxito" },
  "Erro ao criar campanha de WhatsApp": { es: "Error al crear campaña de WhatsApp" },
  "Criar nova campanha": { es: "Crear nueva campaña" },
  "Esta campanha não é mais um rascunho.": { es: "Esta campaña ya no es un borrador." },
  "Carregando campanha": { es: "Cargando campaña" },
  "Filtro inválido.": { es: "Filtro inválido." },
  "Importação não encontrada.": { es: "Importación no encontrada." },
  "Este número só envia modelo aprovado pela Meta. Escolha um modelo.": { es: "Este número solo envía plantilla aprobada por Meta. Elige una plantilla." },
  "Este número envia texto livre. Escreva a mensagem.": { es: "Este número envía texto libre. Escribe el mensaje." },
  "O modelo escolhido não está aprovado pela Meta.": { es: "La plantilla elegida no está aprobada por Meta." },
  "Números extras só com número não oficial.": { es: "Números extra solo con número no oficial." },
  "Escolha a origem e a etapa.": { es: "Elige el origen y la etapa." },
  "Escolha um atendente desta organização.": { es: "Elige un agente de esta organización." },
  "Escolha um agente desta organização.": { es: "Elige un agente de IA de esta organización." },
  "Só um rascunho aceita mudar o texto e o público.": { es: "Solo un borrador acepta cambiar el texto y la audiencia." },
  "Prepare a campanha antes de enviar.": { es: "Prepara la campaña antes de enviar." },
  "Não foi possível duplicar a campanha. Tente novamente.": { es: "No se pudo duplicar la campaña. Inténtalo de nuevo." },
  "Falta um dado que o modelo usa no cadastro deste contato — escolha outro para o teste.": { es: "Falta un dato que la plantilla usa en el registro de este contacto — elige otro para la prueba." },
  "O público desta campanha não pôde ser lido. Escolha os destinatários de novo.": { es: "No se pudo leer la audiencia de esta campaña. Elige los destinatarios de nuevo." },
```

> Tire do bloco as que o script marcar `JA:` (a 8A pode ter criado "Não foi possível duplicar a campanha. Tente novamente." e "Filtro inválido."; o original tem "Escolha a origem e a etapa." em ações em massa). As chaves vão entre aspas, sem prettier no arquivo (17 mil linhas).

- [ ] **Step 3: Os gates do PR B (sem `test:db` e sem a rodada cheia)**

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts tests/unit/vocabulario-do-funil.test.ts tests/unit/evidencia-citada.test.ts tests/unit/escale-casca-v2-original-intacto.test.tsx tests/unit/escale-tema.test.ts tests/unit/escale-casca-tokens.test.ts tests/unit/rodape-ocupado-contrato.test.ts
corepack pnpm vitest run $(git diff --name-only escale-crm/main...HEAD | grep -E "\.test\.tsx?$" | grep -v "^tests/invariants") app/app/campaigns
corepack pnpm typecheck && corepack pnpm eslint $(git diff --name-only escale-crm/main...HEAD | grep -E "\.(ts|tsx)$") && corepack pnpm lint:channels
```

Expected: tudo PASS (nomes exatos: `ls tests/unit | grep -E "i18n|tokens|decorativo|vocabulario|evidencia|intacto|tema|rodape"`). Se a `i18n-espanhol-cobre-a-tela` acusar prosa fora de `t()`, envolva e acrescente a chave.

```bash
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol do assistente de campanha (Fase 8B)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

- [ ] **Step 4: O PRD e o LOG (fora do repositório)**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md`:
- seção 8, linha da 8B: "Estado" de `proposta` para `executada (PRs #<A> e #<B>, <data>); testes e publicação no fim da Frente B`;
- seção 4, tabela B: "Fase" de B1–B18 para `8B ✅`, com as diferenças declaradas: B3 agrupado em "WhatsApp Oficial"/"WhatsApp não oficial" (não por conta da Meta); B5 sem "Pastas", "Com Flow" e "Mensagem utilitária (sem modelo)", modelos com variável fora do corpo ou mídia sem link salvo não entram; B6 "Campo do CRM" com seletor (não chip); B7 data e hora num controle só da casca; B11 duplicado tirado na preparação (não no modal); B13 passos 2 e 3 = janela da 2F; B15 "Enviar teste" com busca de contato (P2); B18 provisório (sem print); rodízio só com número não oficial (P3).

Em `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`: uma entrada nova no topo da "Linha do tempo" (data, 8B executada, os dois PRs, migration 9302, o que ficou provisório, as perguntas P1–P3) e "Onde estamos"/"Próximos passos" reescritos (próximo: 8C; bateria e publicação no fim da Frente B, com as pendências da 2F e da 8A).

- [ ] **Step 5: O PR B**

```bash
git fetch escale-crm --quiet && git rebase escale-crm/main
git push -u escale-crm feat/fase-8b-telas-do-assistente
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-8b-telas-do-assistente \
  --title "feat(escale): Fase 8B (PR B) — o assistente de campanha como na Clint" \
  --body "$(cat <<'EOF'
## O que entra
- Com a casca, "Enviar WhatsApp", "Editar rascunho" e "Duplicar campanha" abrem o assistente da Clint em 4 passos: trilha, barra de passos, rodapé fixo e a prévia do celular.
- Passo 1: nome (3 a 80, contador), dispositivo (oficial/não oficial pela capacidade do canal), modelo aprovado da Meta com o modal "Escolher mensagem" e as variáveis (campo do CRM, valor fixo, texto alternativo) ou texto livre com "Usar texto salvo", quando enviar (calendário e hora da casca), base legal.
- Passo 2: Adicionar contato (com negócio), Selecionar contatos (lista, visões, filtros e filtros salvos de Contatos; "Selecionar todos" grava o filtro), Importar telefones .csv (a janela da 2F), lista de destinatários com "Remover da lista".
- Passo 3: tags, negócio na origem e etapa, status da conversa, atendente e os "manter"; quem atende a resposta, ritmo e números extras.
- Passo 4: a lista congelada com elegíveis e fora da lista (com os motivos), base legal, "Enviar teste", custo "—", limites do WhatsApp, "Salvar como rascunho" e "Enviar Whatsapp"; as telas de sucesso e de erro.
- Peças de molde genéricas (`components/escale/campanhas/molde/`), combinadas com a 8D.

## Diferenças declaradas
- Sem "Tipo de envio" (só disparo), sem "Pastas"/"Com Flow"/"Mensagem utilitária".
- Grupos do seletor de dispositivo por tipo de número; "Campo do CRM" com seletor; data e hora num controle só (nunca o nativo).
- Provisórios por falta de print: sucesso, erro, .csv passos 2 e 3, rascunho reaberto.
- "Enviar teste" com busca de contato; rodízio só com número não oficial.

## Verificação
- Testes da fase, typecheck, eslint, `lint:channels` e as cercas da casca.
- `test:db`, `test:db:update`, rodada cheia, revisor (Opus 5.5) e conferência visual lado a lado com 018–045: na bateria do fim da Frente B.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --repo rgisjr/escale-crm --merge --delete-branch=false
```

Expected: o PR B mergeado. **Nada de tag, release nem VPS** (fim da Frente B).

## Fase 8B — assistente de mensagem única

Linha da seção 8 do PRD depois desta fase: `| 8B | **Assistente de mensagem única:** B1–B18 | … | executada (PRs #<A>, #<B>); testes e publicação no fim da Frente B |`.

## Verificação

1. **Por task:** os testes que a task cria, os guardas dos arquivos tocados, typecheck e eslint (G1); `lint:channels` nas tasks do motor.
2. **Bateria única da Frente B (depois da última fase da frente):** `test:db` (inclui `tests/invariants/escale-assistente-9302.test.ts`), `test:db:update`, rodada cheia em segundo plano, um revisor (Opus 5.5, high; o pós-envio e o público sem teto são os pontos de risco), e a conferência visual lado a lado com 018–045, com a lista escrita das diferenças. Antes de publicar:
   - abrir `/app/campaigns/new` com a casca e ler o console (telas novas sem provedor já derrubaram produção);
   - uma campanha real pequena (o usuário decide) com 1 número não oficial e 2 contatos: texto livre, tag no passo 3, "Fechado" — conferir a tag no contato e a regra de automação "tag adicionada" disparando (risco do PRD, critério de pronto da B14);
   - se houver número oficial: o mesmo com um modelo aprovado de 1 variável;
   - no banco, só leitura: `select column_name from information_schema.columns where table_name = 'campaigns' and column_name like 'escale_%'` (5 linhas) e `select proname from pg_proc where proname like 'fn_escale_%publico%' or proname = 'fn_escale_fora_da_lista'` (3 linhas).

## Fora desta fase (registrado)

- O detalhe da campanha (Sumário e Detalhes, funil, motivos, resultado em R$, "Baixar .CSV") — 8C.
- A aba Prospecção no molde do assistente — 8D (reaproveita as peças de molde).
- O cálculo do custo (preço por mensagem) — depois (resposta 4).
- A Configuração de campanhas com o visual da casca (P1).
- Modelos com variável de texto no cabeçalho ou nos botões; "Mensagem utilitária (sem modelo)".
- O tratamento dos erros da Meta 132015/131026/130429 (modelo pausado ou categoria mudada) na campanha agendada — risco do PRD seção 12; entra com a 8C, que mostra os motivos.

## Self-review (19/10)

1. **Cobertura do PRD:** B1 → Tasks 9, 15 (trilha, barra, rodapé); B2 → Tasks 1, 9, 11 (3 a 80, contador); B3 → Tasks 4, 9, 11 (números `WORKING`, avatar, bolinha, telefone, setor, oficial/não oficial; extras no passo 3); B4 → ignorado (N3); B5 → Tasks 4, 5, 11 (modelo aprovado no oficial, texto livre e "Usar texto salvo" no não oficial; envio `type: "template"`); B6 → Tasks 1, 5, 11 (campo do CRM, valor fixo, alternativo; `variavel_ausente` só sem alternativo); B7 → Tasks 10, 11 (calendário e hora da casca, 24 h); B8 → Task 9 (prévia com chip); B9 → Task 12; B10 → Task 12 (`JanelaNovoContato` da 2A, com negócio); B11 → Tasks 1, 2, 3, 12 (lista, filtros e salvos da 2B; filtro gravado no "Selecionar todos"; sem teto); B12 → Tasks 3, 12 (destinatários, editar seleção, lixeira, "Remover da lista"); B13 → Tasks 3, 12 (passo 1 da Clint + janela da 2F + contatos da importação); B14 → Tasks 1, 7, 13 (tags pelo caminho que emite `contact.tag_added`, negócio para todos com origem, status, atendente, os três "manter"; agente, ritmo e números); B15 → Tasks 6, 14, 15 (prepara ao entrar no passo 4, elegíveis e fora da lista com motivos, base legal, teste, custo "—", limites); B16 → Tasks 1, 11; B17 → Tasks 1, 4, 6, 15 (rascunho e cópia no assistente, " Cópia", copia funil/etapa/agente/números); B18 → Task 14 (sucesso e erro, provisórios). Seção 5 → Tasks 3, 4, 6, 15 (gerente). Seção 7 → Task 2 (colunas, custo preparado), Tasks 3, 5 (público), Task 7 (pós-envio). Resposta 8 → Tasks 3, 5 (sem teto, páginas de 1.000).
2. **Placeholders:** nenhum "TBD"; as notas "confira" dizem o comando e o que trocar.
3. **Tipos entre tasks:** `Assistente`/`MensagemDeModelo`/`PublicoDaCampanha`/`SelecaoDoPublico`/`PosEnvio` (Task 1) são os das rotas (4, 6), do motor (5), do pós-envio (7), do estado (10) e das telas (11–15); `PublicoCompilado`/`compilarPublico`/`idsDoPublico`/`paginaDoPublico`/`LinhaDoDestinatario` (3) são os de `candidatos.ts` (5) e dos hooks (10); `NumeroDaCampanha` (4) é o do estado (10) e das telas; `ResumoDaPreparacao`/`MotivoFora` (6) são os do hook (10) e do passo 4 (14); `entradaDoEnvio`/`modeloDaCampanha` (1, 5) são os da rodada e do teste; `EVENTO_DO_POS_ENVIO`/`pedirPosEnvio` (7) é o que a rodada chama; as props das peças de molde (9) são as combinadas com a 8D.

