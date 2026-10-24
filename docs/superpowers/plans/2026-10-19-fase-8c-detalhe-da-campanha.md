# Fase 8C — Detalhe da campanha como na Clint (Sumário e Detalhes) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** C1 a C15 de `docs/modulos/8-campanhas.md` (seção 4, tabela C), a seção 5 (gerente vê o detalhe, baixa o .CSV e usa as ações em massa), a seção 6 (filtros dos Detalhes) e a seção 7 (métricas novas, exportação, custo preparado).
> **Frente B**, worktree `wt-frente-b`, migration **9310**, um PR. **Executa depois da 8A e da 8B mergeadas** (a Task 1 prova). As peças de `components/escale/campanhas/molde/` são genéricas: a 8D (Prospecção) usa `JanelaDoDetalhe`, `CartaoDoSumario`, `FunilDeConversao`, `SecaoDoSumario` e `TituloDaSecao` com as props desta fase (combinado com a sessão da 8D em 19/10).

## Decisões do usuário que valem aqui

| # | Decisão | Onde vale |
|---|---|---|
| R1 | PRD 8 aprovado (19/10) | tudo |
| R4 | Custo: preparado, a tela mostra "—" | N6 |
| R5 | Frente B, faixa 9300–9399 | N1 |
| R6 | Campanha só de disparo, sem fluxo | N7 (sem "Ver fluxo completo") |
| Regra de 17/10 | Datas dd/mm/aaaa hh:mm, números 1.234, R$ 1.234,56 | todas as telas |

**Prints que faltam nesta fase** (seção 11 do PRD; nenhum bloqueia; o plano segue o código da Clint e marca como provisório):
1. ❌ **Diálogo "Pausar campanha".** Provisório: a `JanelaDeConfirmacao` da casca com os textos exatos do material ("Pausar" na seção 3) em três blocos.
2. ❌ **Gaveta "Negócios criados".** Provisório: gaveta à direita, 720px, com as colunas e os textos do material 2.3.
3. ❌ **"Leu e não respondeu › Ver contatos".** Provisório: vai para a aba Detalhes filtrada por "Lida" (a hipótese da ficha 09-010).
4. ❌ **Barra de seleção em massa** nos Detalhes. Provisório: a barra da cor da marca da lista de contatos (2B, prints 2b-29/30), com as ações do código da Clint.
5. ❌ **"Personalizar colunas" aberto.** Provisório: painel suspenso com uma caixinha por coluna; o número no botão é a quantidade de colunas escondidas (a Clint mostra "3"; o significado não foi visto).
6. ❌ **"Não enviados › Criar campanha"**, "Ocultar motivos" (motivos abertos), filtros aplicados (chips), carregando e erro, e o detalhe de uma campanha **em andamento** (com Pausar). Provisório: os textos do material 2.3 no molde dos blocos capturados.

**Perguntas ao usuário (não bloqueiam; o plano segue a proposta):**
- **Q1 — "Baixar .CSV":** a Clint gera em segundo plano e mostra "Ver exportações". Proposta: baixar na hora (até 20.000 linhas, com auditoria), sem fila nem aprovação. A exportação de Contatos (2B) espera aprovação de um admin; a da campanha é só de quem já é gerente e já vê a tabela. O PRD (seção 7) falava em "segundo plano"; se o usuário quiser a fila com aprovação, vira um PR depois.
- **Q2 — Telefone visível nos Detalhes:** a Clint mostra (e o PRD C11 adotou). A rota do original esconde o telefone de propósito. Proposta: mostrar, como a Clint; a tela é só de gerente.

**Goal:** Com a casca ligada, clicar numa campanha da lista abre a janela da Clint por cima da lista: "INFORMAÇÕES DA CAMPANHA", nome, Pausar/Retomar, "Baixar .CSV" e X; aba **Sumário** com os 4 cartões, o funil, a rosca, o ritmo por hora, os motivos do erro, "Leu e não respondeu", "Não enviados", RESULTADO (negócios, valor em aberto e ganho com a gaveta), custos com "—", tempo mediano e benchmark, e na coluna direita a prévia do celular, o modelo, o dispositivo e o bloco "Entrega" do original; aba **Detalhes** com busca, filtros (status e motivo do erro), colunas, seleção em massa (Adicionar tag, Criar negócio, Criar campanha, Excluir selecionados) e paginação de 20.

**Architecture:**
- **O banco conta** (migration 9310, funções `security invoker` que só respondem a gerente): o sumário, o ritmo por hora, os motivos do erro, o resultado (negócios, valores, mediana, benchmark), a lista de negócios, a página de destinatários e a seleção. A situação de cada destinatário sai de **uma** função (`fn_escale_situacao_do_destinatario`), usada pelo sumário, pela tabela, pelo filtro e pelo .CSV: os números nunca discordam.
- **Rotas do fork** em `/api/v1/campanhas-da-casca/[id]/…`: `sumario`, `destinatarios`, `negocios`, `csv` (GET) e `massa` (POST). Pausar e retomar seguem pelas rotas do original (o `useAcoesDaCampanha` da 8A); o ritmo pelo `PATCH /api/v1/campaigns/[id]` do original.
- **Ações em massa** reaproveitam a fila da 2B (`fn_escale_criar_acao_em_massa`) para tag e negócio; "Criar campanha" usa o `duplicarAcao` do original (que a 8B melhora) e grava os contatos em `incluir_contatos`; "Excluir selecionados" marca `excluido_manualmente` na lista e em `excluir_contatos`.
- **A janela** é um estado da URL (`/app/campaigns?campanha=<id>`), sobre a lista que continua montada (filtros e página ficam); o tempo real da 8A invalida o detalhe porque a chave dele mora debaixo de `CHAVE_DAS_CAMPANHAS`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Vitest + Testing Library + user-event, Tailwind 4 com os tokens da casca, Radix Dialog/Popover, Supabase (RLS, funções invoker), zod, sonner.

## Referência visual (abrir a imagem antes de cada task de tela)

Caminhos sem crase (cerca `evidencia-citada`). Todos em 1:1 (1536×735, px de CSS). O menu lateral dos prints **não** vale; só o conteúdo do módulo.

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 009 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-009-detalhe-sumario.png | janela, cabeçalho, abas, 4 cartões, funil, rosca, início do ritmo, prévia do celular | 7, 8, 9, 11 |
| 010 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-010-detalhe-sumario-motivos-e-modelo.png | barra do ritmo, "Motivos do erro", "Leu e não respondeu", título RESULTADO, cartão "Modelo utilizado" e "Dispositivo de envio" | 8, 9 |
| 011 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-011-detalhe-sumario-resultado.png | RESULTADO: 3 + 3 + 2 cartões, "Enviado em" | 8 |
| 012 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-012-detalhe-detalhes.png | aba Detalhes: busca, Filtros, contagem, colunas, tabela, selo "Lido", rodapé | 10 |
| 013 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\imagens\09-013-detalhe-filtros.png | painel "Filtros da campanha": STATUS, MOTIVO DO ERRO, "Limpar filtros", "Aplicar" | 10 |

Fichas: `C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\09-campanhas\telas\09-009-detalhe-sumario.md` a `09-013-detalhe-filtros.md` e `...\09-campanhas\material-do-codigo.md` (seções 2.2, 2.3, 3 "Pausar" e "Detalhe", 4.1, 4.3 e 6).

### Medidas tiradas dos prints (px de CSS)

| Peça | Medida |
|---|---|
| Janela (009) | 8px das laterais (`inset-x-2`), 64px do topo e de baixo (`top-16 bottom-16`), canto 10px, fundo branco, sombra do painel; cortina escura a 55% |
| Cabeçalho (009) | `px-8 pt-5 pb-4`, borda de baixo `casca-divisoria`; rótulo 10px/600 caixa alta, espaçamento 0.08em, `casca-suave`; nome 18px/600 `casca-texto` com reticências; à direita os botões e o X (32px, `X` 18px `casca-suave`) |
| "Baixar .CSV" (009) | 32px, `px-4`, canto 6px, fundo `casca-marca`, 13px/600 branco |
| Abas (009, 012) | `px-8 pt-3`; aba 13px, `px-3 pb-2.5`; ativa na cor da marca (texto e sublinhado de 2px); inativa `casca-texto` |
| Corpo do Sumário (009) | `px-8 py-4`; duas colunas: a esquerda flexível, a direita 340px, 32px entre elas; a direita fica presa no topo ao rolar |
| Cartão (009, 011) | mín. 86px, `p-4`, borda 1px `casca-borda`, canto 8px, sombra leve; rótulo 13px/500; "?" círculo de 14px na cor da marca com "?" branco 9px/700; valor 15px/600 e " · n" 12px `casca-suave`; 12px entre cartões |
| Funil (009) | bloco metade da largura, `p-4`; título 13px/600; "% sobre enviados" 11px `casca-suave` à direita; linha: rótulo 13px/500 e "n · p%" 12px; barra 12px, canto cheio, na cor da marca sobre o trilho (`--escale-detalhe-trilho`, medido `#ededef`); 14px entre linhas |
| Rosca (009) | 100px de diâmetro, traço 14px; centro "30" 18px/600 e "contatos" 11px `casca-suave`; legenda à direita: bolinha 8px, rótulo 11px, número 11px/600 alinhado em 80px; 10px entre linhas |
| Ritmo (009, 010) | bloco largura total, `p-4`; barras na cor da marca, 72px de largura (até 8 barras; mais que isso, divide a largura), altura proporcional numa área de 120px; número 12px/600 acima; hora 12px `casca-suave` abaixo da linha de base |
| Motivos do erro (010) | título 15px/600 + selo 11px fundo `--escale-tom-vermelho-fundo`, texto `--escale-tom-vermelho-texto`, canto 4px; "% sobre não entregues" 11px à direita; divisória; texto 13px; "Ver motivos" 12px/500 na cor da marca |
| Leu e não respondeu (010) | título 13px/600 + "?"; selo "Oportunidade" 11px, pílula `casca-marca-suave`/`casca-marca`; "23%" 18px/700 e " · 7" 12px `casca-suave`; "Ver contatos" 12px/500 na cor da marca |
| RESULTADO (010, 011) | 10px/600 caixa alta, espaçamento 0.1em, na cor da marca, 24px acima; linhas de 3, 3 e 2 cartões; valor 18px/700 (R$ e números); "Custo real" 11px `casca-suave` abaixo do rótulo; "Esta campanha" 11px e o percentual em `casca-alerta` (abaixo) ou `--escale-tom-verde-texto` (igual ou acima) |
| Rodapé do Sumário (011) | "Enviado em" + data, 12px, 16px abaixo dos cartões |
| Prévia do celular (009) | 340×640, moldura 12px `--escale-zap-moldura` (`#1a1921`), canto 44px; barra de status 12px/600; cabeçalho `--escale-zap-cabeca` (`#085e55`) com avatar 32px, nome 14px/600 com reticências e "online" 11px; fundo `--escale-zap-fundo` (`#ede4df`); balão branco, canto 8px, 13px, `p-2.5`, máx. 85%; chip da variável 13px/500, `casca-marca-suave`/`casca-marca`, canto 4px, `px-1`; hora 11px e o duplo visto |
| Modelo e dispositivo (010) | cartão `p-4`, borda `casca-borda`, canto 8px, 16px abaixo do celular; linhas separadas por divisória; ícone 16px em quadrado de 32px `casca-busca`, canto 6px; rótulo 11px `casca-suave`; valor 14px; selo do idioma 9px/600 `casca-busca`; selo da categoria 11px `casca-marca-suave`/`casca-marca`, pílula |
| Barra dos Detalhes (012) | `px-8 py-4`; busca 240×32 `casca-busca`, sem borda, `Search` 16px à direita; "Filtros" 32px, `px-2.5`, borda `casca-borda` (aberto: borda da marca), 13px + chevron 14px; à direita "30 contatos" 13px e o botão 32×32 com `SlidersHorizontal` 16px e o contador 18px redondo `casca-busca` 11px |
| Tabela dos Detalhes (012) | cabeçalho 10px/600 caixa alta, espaçamento 0.1em, 40px; linha 47px, borda de baixo `casca-divisoria`; células 12px; caixinha da casca (16px); selo 22px, `px-1.5`, canto 4px, 12px (o tom da situação) |
| Rodapé dos Detalhes (012) | fixo embaixo, borda de cima `casca-divisoria`, `px-8`; "1 a 20 de 30 contatos" 13px à esquerda da `PaginacaoDaCasca` (20 por página) |
| Painel de filtros (013) | 320px, máx. 350px de altura com rolagem; cabeçalho "Filtros da campanha" 13px/500 com chevron; área `casca-busca` clara com "STATUS" e "MOTIVO DO ERRO" 10px/600 caixa alta; motivo 12px com reticências e contagem 11px `casca-suave`; rodapé "Limpar filtros" 13px/600 e "Aplicar" no azul da Clint (`BotaoDaCasca variante="novo"`, que não é a cor da marca dela) |

### Cores medidas (amostra de pixel; script em Node com `pngjs`)

| Uso | Claro | Fonte |
|---|---|---|
| Rosca: Lida | `#596df0` | 009 (bolinha da legenda) |
| Rosca: Entregue | `#e7e4f7` | 009 |
| Rosca: Enviado | `#171926` | 009 |
| Rosca: Erro | `#d62829` | 009 (fatia) |
| Rosca: Não enviado | `#dc520a` | 009 |
| Rosca: Aguardando envio (nosso) | `#a1a1aa` | provisório |
| Trilho do funil | `#ededef` | 009 |
| WhatsApp: cabeçalho / fundo / moldura | `#085e55` / `#ede4df` / `#1a1921` | 009 |
| WhatsApp: duplo visto | `#53bdeb` | provisório (o azul do WhatsApp; o pixel caiu no fundo) |
| Barras do funil e do ritmo, "?", "Baixar .CSV", aba ativa, chip, RESULTADO | a cor da marca (`casca-marca`) | Clint usa o roxo dela (`#651ad9`, `#6e1cd8`) |

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Branch `feat/fase-8c-detalhe-da-campanha`** de `escale-crm/main` (com a 8A e a 8B) na worktree `wt-frente-b`; **migration 9310** (`20261120120000_9310_detalhe_da_campanha.sql`): a 8B fica com 9302–9309. Um PR, mergeado ao terminar; tag/release/VPS só no fim da Frente B | regra de 18/10; PRD R5 |
| N2 | **A janela é um estado da URL:** `rotaDoDetalhe(id)` vira `/app/campaigns?campanha=<id>`; a página passa o id à `CampanhasDaCasca`, que abre `DetalheDaCampanhaDaCasca` por cima da lista (a lista não desmonta: filtros e página ficam). Fechar troca a URL para `/app/campaigns` (`replace`). `/app/campaigns/[id]` com a casca redireciona para `?campanha=<id>`. Rascunho clicado na lista continua abrindo o assistente (8A/8B) | PRD A10, C1 |
| N3 | **A régua das contagens é a da 8A** (carimbos cumulativos, disjuntos; quem falhou conta só em erros) e mora numa função só (`fn_escale_situacao_do_destinatario`). Cartões e funil em **% sobre enviados** (a Clint); a rosca soma os adicionados (Lida, Entregue, Enviado, Erro, Não enviado, e "Aguardando envio" só quando houver). A Clint conta erro dentro de enviados (30 enviados com 4 erros); aqui não, para a lista e o detalhe baterem | PRD C2, C3; 009 |
| N4 | **Amostras da Clint:** ritmo sobre os 1.000 envios mais recentes (barras por hora no fuso da organização; "12:00", ou "10/09 12:00" quando passa de um dia); motivos sobre as 1.000 falhas mais recentes; mediana sobre as 1.000 respostas mais recentes; benchmark = média das taxas de resposta (respondidas ÷ enviados) das 5 campanhas concluídas mais recentes, sem esta | PRD C4, C5, C9; material 2.3 |
| N5 | **Resultado:** negócios com `source = 'campanha'` e `source_metadata.campaign_id` desta campanha (a marca do original, `marcaDaOrigem`); "Valor em aberto" (a Clint escreve "Valor em pipeline", mas a cerca `vocabulario-do-funil` proíbe "pipeline" na tela) = abertos, "Valor ganho" = ganhos; a função é invoker, então conta o que quem olha pode ver. Clicar abre a gaveta (todos, em aberto, ganhos), até 200 linhas, com "Baixar CSV" montado no navegador | PRD C7; material 2.3 |
| N6 | **Custo preparado:** "Custo da campanha" (com "Custo real" e sem "?", como o 011), "Custo por resposta" e "Custo por negócio" mostram "—" | PRD C8, R4 |
| N7 | **Coluna da mensagem:** a prévia sai de `message_body` com as variáveis em chip (`{{nome}}` → "Nome", `{{primeiro_nome}}` → "Primeiro nome", `{{saudacao}}` → "Saudação", `{{lead.x}}`/`{{contato.x}}` → o nome do campo, `{{1}}` → "{{1}}"); "Modelo utilizado" lê as colunas do modelo da 8B (`modeloDaCampanha`, um lugar só); sem modelo, o texto da Clint "Esta campanha envia uma mensagem livre, sem modelo aprovado."; "Dispositivo de envio" = o nome do número principal; **sem** "Ver fluxo completo" | PRD C10, R6 |
| N8 | **Bloco "Entrega"** (C13), abaixo do modelo: ritmo (intervalo, teto por dia, teto por hora, janela; "O do número" quando vazio) com "Editar" enquanto a campanha não terminou (janela da casca → `PATCH /api/v1/campaigns/[id]` do original), números extras do rodízio (só leitura) e a base legal | PRD C13 |
| N9 | **Detalhes:** colunas Telefone, Nome, Email, Status (visíveis, como o 012), Enviado em e Motivo (escondidas); "Personalizar colunas" guarda a escolha no navegador de quem olha (`localStorage`, com try/catch); 20 por página (10, 20, 50, 100); busca por nome ou telefone (500 ms); filtros Status (várias escolhas: Enviado, Entregue, Lida, Respondido, Erro, Não enviado, Aguardando envio, Fora da lista) e Motivo do erro (várias escolhas, com a contagem); aplicados viram chips removíveis acima da tabela. "Duplicado" da Clint não entra: aqui o duplicado é "Fora da lista" com o motivo | PRD C11, seção 6; 012, 013 |
| N10 | **Telefone visível** na tabela e no .CSV (Q2); a rota e as funções exigem gerente | PRD C11 |
| N11 | **Seleção e ações em massa** (C12): `useSelecaoDaLista` e `FaixaDaSelecao` da 2B ("Selecionar todos os N contatos filtrados", texto da Clint, por uma prop nova); barra na cor da marca no molde da 2B com **Adicionar tag** (o `PainelDeTag` da 2B), **Criar negócio** (a `JanelaCriarNegocios` da 2B), **Criar campanha** (duplica esta e grava os contatos marcados em `incluir_contatos`, até 5.000; abre o rascunho no assistente), **Excluir selecionados** (só antes de qualquer envio: marca `excluido_manualmente` na lista e põe o contato em `excluir_contatos`) e "Limpar seleção". O servidor resolve a seleção (ids marcados ou o filtro menos os desmarcados) | PRD C12 |
| N12 | **"Não enviados"** (C15): bloco só quando há não enviados (cancelados, pulados, opt-out, pessoais); "Ver contatos" leva aos Detalhes filtrados; "Criar campanha" cria a campanha nova com eles (o mesmo caminho da N11) | PRD C15; material 2.3 |
| N13 | **Pausar com diálogo** (C14): os textos exatos da Clint ("Pausar" no material 3); Retomar sem diálogo; os dois só em "Em progresso" e "Pausada", à esquerda do "Baixar .CSV" | PRD C14 |
| N14 | **"Baixar .CSV"** baixa na hora (Q1): Telefone, Nome, Email, Status, Motivo, Enviado em; até 20.000 linhas; auditoria `campaign.exported` | PRD seção 7; Q1 |
| N15 | **Atualização:** a chave do detalhe é `[CHAVE_DAS_CAMPANHAS, "detalhe", id]` (o tempo real e as ações da 8A já invalidam tudo debaixo de `CHAVE_DAS_CAMPANHAS`); enquanto `preparing`/`running`, reconsulta de 10 s (`RECONSULTA_MS` da 8A) | PRD A13 |
| N16 | **Carregando e erro:** esqueletos nos cartões e blocos; erro da janela "Não foi possível carregar a campanha." + "Tentar novamente"; campanha que não existe (ou de outra organização): "Campanha não encontrada." | material 2.3 |
| N17 | **Cores:** as da rosca, do trilho e do WhatsApp entram como variáveis da casca em `app/escale-tema.css` (bloco `FORK ESCALE · Fase 8C`, claro e escuro), lidas por valor arbitrário; as classes num arquivo só (`lib/escale/campanhas/detalhe/cores.ts`) | CLAUDE.md regra 3; 8A N16 |
| N18 | **As funções da 9310** são `security invoker`, `stable` (a da situação `immutable`), `set search_path = public, pg_temp`, `revoke all … from public, anon`, `grant execute … to authenticated, service_role`; as que leem dados exigem `fn_role_at_least(p_org, 'manager')`. Dois índices: `campaign_recipients (campaign_id, created_at, id)` (a página) e `crm_leads (organization_id, (source_metadata ->> 'campaign_id')) where source = 'campanha'` (o resultado). Nenhuma tabela nova, nenhuma `definer` | cercas `hardening-definer-varredura`, `definer-nova-nasce-exposta`, `gov-hardening-anon-definer` |
| N19 | **O molde para a 8D** (`components/escale/campanhas/molde/`): `JanelaDoDetalhe`, `CartaoDoSumario`, `FunilDeConversao`, `SecaoDoSumario`, `TituloDaSecao` e `PreviaDoCelular`, sem saber de campanha de WhatsApp. No `CartaoDoSumario`, `complemento` é só o número ("26"): o componente põe o "·" | combinado com a sessão da 8D (19/10) |
| G1 | **Verificação enxuta**: por task só o que a task cria, typecheck e eslint dos arquivos alterados; `test:db`, `test:db:update`, rodada cheia, revisor (Opus 5.5) e conferência visual na bateria única do fim da Frente B | regra de 18/10 |

## O que esta fase consome da 8A e da 8B

A Task 1 prova cada item antes de escrever. Faltou algo da 8A: PARE. Um item da 8B diferente do que está aqui: siga a instrução da linha.

| De | O quê | Se não bater |
|---|---|---|
| 8A | `lib/escale/campanhas/{apresentacao,cores,filtros,rotas,tipos}.ts` (`numeroBr`, `porcento`, `dataEHoraBr`, `dataBr`, `Traduzir`, `TomDoStatus`, `CLASSE_DO_TOM`, `padraoDoNome`, `ROTA_DAS_CAMPANHAS`, `rotaDoDetalhe`, `rotaDoRascunho`), `hooks/escale/useCampanhasDaCasca.ts` (`CHAVE_DAS_CAMPANHAS`, `RECONSULTA_MS`, `useAcoesDaCampanha`), `components/escale/campanhas/{DicaAoPassar,SeloDoStatus,CampanhasDaCasca}.tsx`, migration 9301 | PARE: a 8A não está na `main` |
| 8B | `rotaDoRascunho(id)` abre o assistente | nada a fazer (a 8C só chama a função) |
| 8B | O negócio que a campanha cria para quem recebeu (B14) é marcado por `marcaDaOrigem` (`source = 'campanha'`, `source_metadata.campaign_id`) | PARE e pergunte: o resultado (C7) não contaria esses negócios |
| 8B | As colunas do modelo da Meta em `campaigns` se chamam `template_name`, `template_language`, `template_category` | troque os três nomes em `COLUNAS_DO_MODELO` (`lib/escale/campanhas/detalhe/mensagem.ts`) e no teste da Task 1; se a 8B não gravou o modelo em `campaigns`, PARE e pergunte |
| 8B | `message_body` guarda o texto que a prévia mostra (no modelo, o corpo com `{{1}}`) | se a 8B guardou o corpo do modelo em outra coluna, leia-a em `infoDaLinha` (Task 3) no lugar de `message_body` quando `message_body` vier vazio |
| 8B | `filtroDeAudienciaSchema` ainda tem `incluir_contatos`, `excluir_contatos` e `limite` | PARE e pergunte (muda "Criar campanha" e "Excluir selecionados") |
| 8B | `duplicarAcao` continua em `lib/campanhas/acoes.ts` | PARE e pergunte |
| 8B | `components/escale/campanhas/molde/PreviaDoCelular.tsx` (se a 8B já criou com a interface da Task 7) | se existe com as mesmas props: pule a criação na Task 7; se existe com outras: PARE e pergunte |

## Global Constraints

### Repositório, worktree e Git

- Worktree: `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-b`. **Base:** `escale-crm/main` com a 8A e a 8B mergeadas.
- **Branch:** `feat/fase-8c-detalhe-da-campanha` (`git switch -c feat/fase-8c-detalhe-da-campanha escale-crm/main`).
- **Migration:** `supabase/migrations/20261120120000_9310_detalhe_da_campanha.sql`. Antes: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; `9310` ou `20261120120000` em outra branch → PARE e pergunte.
- **PR** para `rgisjr/escale-crm`, base `main`, mergeado ao terminar. **Proibido:** push em `origin` (Rafael), tag, release, VPS e gravar no banco de produção.
- Conflitos prováveis com a Frente C e com a 8D: `lib/i18n/dicionario.ts`, `supabase/baseline.sql`, `lib/audit/actions.ts`, `app/escale-tema.css`, `lib/ui/icons-da-casca.ts`, `components/escale/campanhas/CampanhasDaCasca.tsx` — manter os dois blocos, o que já está na `main` primeiro.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`; `export NODE_OPTIONS=--max-old-space-size=6144` para o typecheck.
- `test:db` **não roda nesta fase** (bateria da Frente B). O arquivo de prova é escrito na Task 2 e fica pronto.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 8C`. Sem a casca, nada muda.

| Arquivo | Mudança |
|---|---|
| `app/app/campaigns/page.tsx` | o ramo da casca (8A) passa a ler `?campanha=` e as origens (`origensDaPagina`) e os entrega à `CampanhasDaCasca` |
| `app/app/campaigns/[id]/page.tsx` | com o cookie `topo`: `redirect("/app/campaigns?campanha=<id>")` |
| `supabase/baseline.sql` | o bloco da 9310 (a migration sem a 1ª linha), logo ANTES de `-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----` |
| `lib/i18n/dicionario.ts` | bloco `// ─── FORK ESCALE · Fase 8C: detalhe da campanha ───` logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` |
| `lib/audit/actions.ts` | depois do bloco da 8A: `// FORK ESCALE · Fase 8C: o detalhe da campanha da casca (migration 9310).` + `"campaign.exported"`, `"campaign.recipients_removed"` |
| `lib/ui/icons-da-casca.ts` | `BatteryFull`, `Signal`, `Video`, `Wifi` (a prévia do celular; os outros ícones da fase já existem) |
| `app/escale-tema.css` | o bloco `FORK ESCALE · Fase 8C` no fim do arquivo |

Do fork que mudam: `lib/escale/campanhas/rotas.ts` (+ a linha de `rotaDoDetalhe` em `tests/unit/escale-campanhas-regras.test.ts`), `components/escale/campanhas/CampanhasDaCasca.tsx` (+ o mock das origens em `tests/unit/escale-campanhas-pagina.test.tsx`), `lib/escale/campanhas/detalhe/csv.ts` (o CSV da gaveta, Task 8), `components/escale/contatos/massa/FaixaDaSelecao.tsx` (prop opcional `rotuloDeTodos`), `components/escale/ui/PaginacaoDaCasca.tsx` (prop opcional `legenda`).

### Cercas que precisam ficar verdes

`manifest-x-migrations`, `manifest-cita-caminho-que-existe`, `hardening-definer-varredura`, `definer-nova-nasce-exposta`, `gov-hardening-anon-definer`, `campanha-escreve-como-servidor` (as rotas do original não mudam), `i18n-espanhol-cobre-a-tela`, `controle-decorativo`, `tailwind-tokens`, `escale-casca-tokens`, `escale-tema`, `escale-casca-v2-original-intacto`, `evidencia-citada`, `vocabulario-do-funil`.

### Verificação (G1)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os achados com `corepack pnpm vitest run <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db`, `test:db:update`, rodada cheia, revisor (Opus 5.5, high) e conferência visual:** na bateria única do fim da Frente B.
3. **Comandos longos sempre em segundo plano.**

### Commits e PR

- Commits `feat(escale): … (Fase 8C)` terminados com `Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>`; o PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório na Task 1.
- Todo texto de tela por `t()` com literal (ou tabela de rótulos do próprio módulo). Datas, números e moeda no formato brasileiro.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/escale/campanhas/detalhe/tipos.ts` | novo | as formas do detalhe |
| `lib/escale/campanhas/detalhe/apresentacao.ts` | novo | cartões, funil, rosca, motivos, tempo, benchmark, R$, horas, situações, colunas, contagens |
| `lib/escale/campanhas/detalhe/motivos.ts` | novo | o texto de cada código de erro e de exclusão |
| `lib/escale/campanhas/detalhe/filtros.ts` | novo | os filtros dos Detalhes: schema, enxugar, texto, compilar |
| `lib/escale/campanhas/detalhe/mensagem.ts` | novo | partes da mensagem (chips) e o modelo da 8B |
| `lib/escale/campanhas/detalhe/ritmo.ts` | novo | textos e validação do ritmo; base legal |
| `lib/escale/campanhas/detalhe/cores.ts` | novo | classes da rosca e do trilho |
| `tests/unit/escale-detalhe-da-campanha-regras.test.ts` | novo | as regras puras |
| `supabase/migrations/20261120120000_9310_detalhe_da_campanha.sql`, `supabase/baseline.sql` | novo / bloco | as funções e os índices |
| `tests/unit/escale-detalhe-da-campanha-migration.test.ts` | novo | o texto da migration e o bloco no baseline |
| `tests/invariants/escale-detalhe-da-campanha-9310.test.ts` | novo | a prova contra Postgres real (bateria) |
| `lib/escale/campanhas/detalhe/banco.ts` | novo | ler o detalhe, os destinatários e os negócios |
| `app/api/v1/campanhas-da-casca/[id]/{sumario,destinatarios,negocios}/route.ts` | novos | as leituras |
| `tests/unit/escale-detalhe-da-campanha-rotas.test.ts` | novo | as três leituras |
| `lib/escale/campanhas/detalhe/csv.ts`, `app/api/v1/campanhas-da-casca/[id]/csv/route.ts`, `lib/audit/actions.ts` | novos / alterado | o .CSV |
| `tests/unit/escale-detalhe-da-campanha-csv.test.ts` | novo | o .CSV |
| `lib/escale/campanhas/detalhe/massa.ts`, `lib/escale/campanhas/detalhe/acoes.ts`, `app/api/v1/campanhas-da-casca/[id]/massa/route.ts` | novos | as ações em massa |
| `tests/unit/escale-detalhe-da-campanha-massa.test.ts` | novo | as ações em massa |
| `hooks/escale/useDetalheDaCampanha.ts` | novo | as consultas e as mutações do detalhe |
| `tests/unit/escale-detalhe-da-campanha-hooks.test.tsx` | novo | os hooks |
| `components/escale/campanhas/molde/*.tsx`, `app/escale-tema.css`, `lib/ui/icons-da-casca.ts` | novos / alterados | o molde (para a 8C e a 8D) |
| `tests/unit/escale-molde-do-detalhe.test.tsx` | novo | o molde |
| `components/escale/campanhas/detalhe/{RoscaDeStatus,RitmoDeEnvio,MotivosDoErro,LeuENaoRespondeu,NaoEnviados,ResultadoDaCampanha,GavetaDeNegocios,SumarioDaCampanha}.tsx` | novos | a aba Sumário (coluna esquerda) |
| `tests/unit/escale-detalhe-da-campanha-sumario.test.tsx` | novo | o Sumário |
| `components/escale/campanhas/detalhe/{ColunaDaMensagem,JanelaDoRitmo}.tsx` | novos | a coluna direita |
| `tests/unit/escale-detalhe-da-campanha-coluna.test.tsx` | novo | a coluna direita |
| `components/escale/campanhas/detalhe/{SeloDaSituacao,PainelDeFiltrosDosDestinatarios,PainelDeColunasDosDestinatarios,TabelaDeDestinatarios,BarraDaSelecaoDaCampanha,DetalhesDaCampanha}.tsx`, `components/escale/contatos/massa/FaixaDaSelecao.tsx`, `components/escale/ui/PaginacaoDaCasca.tsx` | novos / alterados | a aba Detalhes |
| `tests/unit/escale-detalhe-da-campanha-detalhes.test.tsx` | novo | a aba Detalhes |
| `components/escale/campanhas/detalhe/{DetalheDaCampanhaDaCasca,JanelaPausarCampanha}.tsx`, `lib/escale/campanhas/rotas.ts`, `components/escale/campanhas/CampanhasDaCasca.tsx`, `app/app/campaigns/page.tsx`, `app/app/campaigns/[id]/page.tsx` | novos / alterados | a janela e os encaixes |
| `tests/unit/escale-detalhe-da-campanha-janela.test.tsx` | novo | a janela e os encaixes |
| `lib/i18n/dicionario.ts` | alterado | o espanhol |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md`, `LOG.md` | alterados (fora do repositório) | a linha da 8C; o log |

---

### Task 1: Branch, base, o que vem da 8A e da 8B, e as regras puras

**Files:**
- Create: `lib/escale/campanhas/detalhe/{tipos,apresentacao,motivos,filtros,mensagem,ritmo,cores}.ts`, `tests/unit/escale-detalhe-da-campanha-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/`

**Interfaces (Produces):**
- `tipos.ts`: `SumarioDaCampanha`, `PontoDoRitmo`, `MotivoDoErro`, `ResultadoDaCampanha`, `ModeloDaCampanha`, `RitmoDaCampanha`, `InfoDaCampanha`, `DadosDoDetalhe`, `SituacaoDoDestinatario`, `LinhaDeDestinatario`, `PaginaDeDestinatarios`, `SituacaoDosNegocios`, `NegocioDaCampanha`, `NegociosDaCampanha`.
- `apresentacao.ts`: `CartaoDoTopo`, `cartoesDoTopo(s)`, `EtapaDoFunil`, `etapasDoFunil(s)`, `ChaveDaFatia`, `ROTULO_DA_FATIA`, `FatiaDaRosca`, `fatiasDaRosca(s)`, `leuSemResposta(s)`, `resumoDosMotivos(m, t)`, `seloDasFalhas(n, t)`, `porcentoDoMotivo(q, m)`, `textoDoTempoMediano(seg, t)`, `Comparacao`, `comparacaoDoBenchmark(r)`, `reaisBr(c)`, `rotuloDaHora(h, variosDias)`, `varreDias(p)`, `rodapeDoSumario(c, t, fuso?)`, `ROTULO_DA_SITUACAO`, `TOM_DA_SITUACAO`, `podeTirarDaLista(status, enviados)`, `COLUNAS_DOS_DESTINATARIOS`, `ColunaDosDestinatarios`, `ROTULO_DA_COLUNA`, `COLUNAS_PADRAO`, `CHAVE_DAS_COLUNAS`, `colunasDoTexto(texto)`, `POR_PAGINA_DOS_DESTINATARIOS`, `POR_PAGINA_PADRAO_DOS_DESTINATARIOS`, `textoDoIntervalo(p, n, total, t)`, `textoDoTotal(total, t)`, `ROTULO_DO_STATUS_DO_NEGOCIO`, `TITULO_DA_GAVETA`.
- `motivos.ts`: `SEM_CODIGO`, `TEXTO_DO_MOTIVO`, `textoDoMotivo(c, t)`, `textoDaExclusao(c, t)`, `textoDoMotivoDaLinha(sit, motivo, t)`.
- `filtros.ts`: `SITUACOES_DO_FILTRO`, `ROTULO_DO_FILTRO_DE_SITUACAO`, `filtrosDeDestinatariosSchema`, `FiltrosDeDestinatarios`, `FILTROS_DE_DESTINATARIOS_VAZIOS`, `enxugarFiltrosDeDestinatarios(f)`, `temFiltroDeDestinatarios(f)`, `textoDosFiltrosDeDestinatarios(f)`, `filtrosDeDestinatariosDoTexto(t)`, `FiltroDeDestinatariosCompilado`, `compilarFiltrosDeDestinatarios(f)`.
- `mensagem.ts`: `ParteDaMensagem`, `partesDaMensagem(texto)`, `COLUNAS_DO_MODELO`, `modeloDaCampanha(linha)`, `ROTULO_DA_CATEGORIA`, `siglaDoIdioma(idioma)`.
- `ritmo.ts`: `CamposDoRitmo`, `camposDoRitmo(r)`, `CorpoDoRitmo`, `RitmoValidado`, `validarRitmo(c)`, `textosDoRitmo(r, t)`, `textoDaBaseLegal(base, lia, t)`.
- `cores.ts`: `CLASSE_DA_FATIA`, `CLASSE_DO_TRILHO_DO_FUNIL`.

- [ ] **Step 1: A base e o que vem da 8A e da 8B**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain            # Expected: vazio
git fetch escale-crm --quiet
git switch -c feat/fase-8c-detalhe-da-campanha escale-crm/main
for f in lib/escale/campanhas/apresentacao.ts lib/escale/campanhas/cores.ts lib/escale/campanhas/filtros.ts lib/escale/campanhas/rotas.ts hooks/escale/useCampanhasDaCasca.ts components/escale/campanhas/DicaAoPassar.tsx components/escale/campanhas/SeloDoStatus.tsx components/escale/campanhas/CampanhasDaCasca.tsx components/escale/contatos/massa/PainelDeTag.tsx components/escale/contatos/massa/JanelaCriarNegocios.tsx components/escale/contatos/massa/FaixaDaSelecao.tsx hooks/escale/useSelecaoDaLista.ts; do git cat-file -e HEAD:$f && echo "ok $f"; done
git ls-tree --name-only HEAD supabase/migrations/ | grep -E "_93[0-9]{2}_" | sort
bash scripts/checar-colisao-de-migration.sh escale-crm/main
corepack pnpm install --frozen-lockfile
```

Expected: doze `ok`; a lista mostra a `9301` (8A) e as da 8B (`9302`…`9309`), **nenhuma** `9310`. Faltou arquivo da 8A: PARE. Apareceu `9310` em outra branch: PARE e pergunte.

Agora os itens da 8B (tabela "O que esta fase consome"):

```bash
git grep -n "marcaDaOrigem\|ORIGEM_CAMPANHA" -- lib app | grep -v "\.test\."
git grep -n "template_name\|template_language\|template_category" -- supabase/migrations | grep "_930"
git grep -n "export async function duplicarAcao" -- lib/campanhas/acoes.ts
ls components/escale/campanhas/molde/ 2>/dev/null
cat > "$TEMP/audiencia-8c.ts" <<'EOF'
import { FILTRO_VAZIO, filtroDeAudienciaSchema } from "@/lib/campanhas/audiencia";
const r = filtroDeAudienciaSchema.safeParse({ ...FILTRO_VAZIO, incluir_contatos: ["0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b"], excluir_contatos: [], limite: 1 });
console.log(r.success ? "audiencia ok" : JSON.stringify(r.error.flatten()));
EOF
corepack pnpm tsx --tsconfig tsconfig.json "$TEMP/audiencia-8c.ts"
```

Expected:
- o 1º `grep` mostra o uso do original (`lib/leads/nascimento-do-lead.ts` ou `lib/campanhas/resposta.ts`) **e** o caminho da 8B que cria negócio para quem recebeu. Sem o da 8B: PARE e pergunte.
- o 2º mostra as três colunas na migration da 8B. Outros nomes: anote para o Step 5 (troque em `COLUNAS_DO_MODELO` e no teste). Nenhuma coluna de modelo em `campaigns`: PARE e pergunte.
- o 3º acha `duplicarAcao`. O 4º: se `PreviaDoCelular.tsx` já existe, anote para a Task 7.
- `audiencia ok`. Outra saída: PARE e pergunte.

- [ ] **Step 2: Copiar o plano**

```bash
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-19-fase-8c-detalhe-da-campanha.md" docs/superpowers/plans/
```

- [ ] **Step 3: Escrever o teste das regras (falha)**

`tests/unit/escale-detalhe-da-campanha-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  COLUNAS_PADRAO,
  cartoesDoTopo,
  colunasDoTexto,
  comparacaoDoBenchmark,
  etapasDoFunil,
  fatiasDaRosca,
  leuSemResposta,
  podeTirarDaLista,
  porcentoDoMotivo,
  reaisBr,
  resumoDosMotivos,
  rodapeDoSumario,
  rotuloDaHora,
  seloDasFalhas,
  textoDoIntervalo,
  textoDoTempoMediano,
  textoDoTotal,
  varreDias,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import {
  ROTULO_DO_FILTRO_DE_SITUACAO,
  SITUACOES_DO_FILTRO,
  compilarFiltrosDeDestinatarios,
  filtrosDeDestinatariosDoTexto,
  temFiltroDeDestinatarios,
  textoDosFiltrosDeDestinatarios,
} from "@/lib/escale/campanhas/detalhe/filtros";
import { ROTULO_DA_CATEGORIA, modeloDaCampanha, partesDaMensagem, siglaDoIdioma } from "@/lib/escale/campanhas/detalhe/mensagem";
import { textoDaExclusao, textoDoMotivo, textoDoMotivoDaLinha } from "@/lib/escale/campanhas/detalhe/motivos";
import { camposDoRitmo, textoDaBaseLegal, textosDoRitmo, validarRitmo } from "@/lib/escale/campanhas/detalhe/ritmo";
import type { SumarioDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";

const t = (s: string) => s;
const SP = "America/Sao_Paulo";
const SUMARIO: SumarioDaCampanha = {
  adicionados: 30,
  enviados: 26,
  entregues: 23,
  lidas: 16,
  respondidas: 10,
  leuSemResposta: 6,
  erros: 4,
  naoEnviados: 0,
  aguardando: 0,
  foraDaLista: 2,
};

describe("cartões, funil e rosca (N3)", () => {
  it("os 4 cartões do topo: números e % sobre enviados com o complemento", () => {
    const c = cartoesDoTopo(SUMARIO);
    expect(c.map((x) => x.rotulo)).toEqual(["Adicionados p/ envio", "Enviados", "Entregues", "Respondidas"]);
    expect(c.map((x) => x.valor)).toEqual(["30", "26", "88%", "38%"]);
    expect(c.map((x) => x.complemento)).toEqual([undefined, undefined, "23", "10"]);
    expect(cartoesDoTopo({ ...SUMARIO, enviados: 0 })[2]!.valor).toBe("—");
  });

  it("o funil em % sobre enviados", () => {
    expect(etapasDoFunil(SUMARIO).map((e) => [e.rotulo, e.quantidade, e.porcento])).toEqual([
      ["Enviados", 26, 100],
      ["Entregues", 23, 88],
      ["Lidas", 16, 62],
      ["Respondidas", 10, 38],
    ]);
    expect(etapasDoFunil({ ...SUMARIO, enviados: 0 }).every((e) => e.porcento === null)).toBe(true);
  });

  it("a rosca soma os adicionados; 'Aguardando envio' só quando houver", () => {
    expect(fatiasDaRosca(SUMARIO).map((f) => [f.chave, f.quantidade])).toEqual([
      ["lida", 16],
      ["entregue", 7],
      ["enviado", 3],
      ["erro", 4],
      ["nao_enviado", 0],
    ]);
    expect(fatiasDaRosca({ ...SUMARIO, aguardando: 5 }).at(-1)).toEqual({ chave: "aguardando", quantidade: 5 });
  });

  it("leu e não respondeu: % sobre enviados", () => {
    expect(leuSemResposta(SUMARIO)).toEqual({ porcento: 23, quantidade: 6 });
  });
});

describe("motivos do erro (C5)", () => {
  const motivos = [
    { codigo: "131049", quantidade: 2 },
    { codigo: null, quantidade: 1 },
    { codigo: "130429", quantidade: 1 },
  ];

  it("o resumo, o selo e o percentual sobre as falhas da amostra", () => {
    expect(resumoDosMotivos(motivos, t)).toBe("3 motivos em 4 falhas de envio");
    expect(resumoDosMotivos([{ codigo: "x", quantidade: 1 }], t)).toBe("1 motivo em 1 falha de envio");
    expect(seloDasFalhas(4, t)).toBe("4 falhas");
    expect(seloDasFalhas(1, t)).toBe("1 falha");
    expect(porcentoDoMotivo(2, motivos)).toBe(50);
  });

  it("o texto de cada código; desconhecido mostra o código; nada atravessa protótipo", () => {
    expect(textoDoMotivo("131049", t)).toBe("Meta optou por não entregar");
    expect(textoDoMotivo(null, t)).toBe("Sem detalhe do erro registrado");
    expect(textoDoMotivo("sem_codigo", t)).toBe("Sem detalhe do erro registrado");
    expect(textoDoMotivo("999", t)).toBe("Erro do canal: 999");
    expect(textoDoMotivo("constructor", t)).toBe("Erro do canal: constructor");
    expect(textoDaExclusao("opt_out", t)).toBe("Pediu para não receber mensagens");
    expect(textoDoMotivoDaLinha("erro", "131026", t)).toBe("Destinatário incapaz de receber a mensagem");
    expect(textoDoMotivoDaLinha("fora_da_lista", "duplicado", t)).toBe("Mesmo telefone de outro contato da lista");
    expect(textoDoMotivoDaLinha("lida", null, t)).toBeNull();
  });
});

describe("resultado, tempo e benchmark (C7, C9)", () => {
  it("tempo mediano em min, h ou dias, com vírgula", () => {
    expect(textoDoTempoMediano(null, t)).toBe("Não foi possível calcular o tempo de resposta.");
    expect(textoDoTempoMediano(20, t)).toBe("1 min");
    expect(textoDoTempoMediano(90, t)).toBe("2 min");
    expect(textoDoTempoMediano(5400, t)).toBe("1,5 h");
    expect(textoDoTempoMediano(129_600, t)).toBe("1,5 dias");
  });

  it("benchmark: média e esta campanha em inteiros; abaixo quando menor", () => {
    const base = { negocios: 0, valorAbertoCentavos: 0, valorGanhoCentavos: 0, medianaSegundos: null };
    expect(comparacaoDoBenchmark({ ...base, benchmark: 0.43, taxaDaCampanha: 0.3333 })).toEqual({
      media: 43,
      estaCampanha: 33,
      abaixo: true,
    });
    expect(comparacaoDoBenchmark({ ...base, benchmark: 0.2, taxaDaCampanha: 0.2 }).abaixo).toBe(false);
    expect(comparacaoDoBenchmark({ ...base, benchmark: null, taxaDaCampanha: 0.3333 })).toEqual({
      media: null,
      estaCampanha: 33,
      abaixo: null,
    });
  });

  it("R$ no formato brasileiro; sem valor, o traço", () => {
    expect(reaisBr(1_468_092)).toBe("R$ 14.680,92");
    expect(reaisBr(0)).toBe("R$ 0,00");
    expect(reaisBr(null)).toBe("—");
  });
});

describe("horas, rodapé e regras de tela", () => {
  it("a hora do ritmo; com mais de um dia, o dia junto", () => {
    expect(rotuloDaHora("2026-09-10T12:00:00", false)).toBe("12:00");
    expect(rotuloDaHora("2026-09-10T12:00:00", true)).toBe("10/09 12:00");
    expect(varreDias([{ hora: "2026-09-10T12:00:00", envios: 1 }, { hora: "2026-09-10T13:00:00", envios: 1 }])).toBe(false);
    expect(varreDias([{ hora: "2026-09-10T23:00:00", envios: 1 }, { hora: "2026-09-11T00:00:00", envios: 1 }])).toBe(true);
  });

  it("o rodapé: enviado em, agendada para ou criado em", () => {
    const base = { iniciadaEm: null, agendadaPara: null, criadaEm: "2026-10-01T12:00:00Z" };
    expect(rodapeDoSumario({ ...base, iniciadaEm: "2026-09-10T15:39:00Z" }, t, SP)).toBe("Enviado em 10/09/2026 12:39");
    expect(rodapeDoSumario({ ...base, agendadaPara: "2026-10-20T13:00:00Z" }, t, SP)).toBe("Agendada para 20/10/2026 10:00");
    expect(rodapeDoSumario(base, t, SP)).toBe("Criado em 01/10/2026 09:00");
  });

  it("tirar da lista só antes de qualquer envio", () => {
    expect(podeTirarDaLista("draft", 0)).toBe(true);
    expect(podeTirarDaLista("ready", 0)).toBe(true);
    expect(podeTirarDaLista("scheduled", 3)).toBe(false);
    expect(podeTirarDaLista("running", 0)).toBe(false);
  });

  it("as colunas guardadas: na ordem fixa, só as conhecidas; o resto volta ao padrão", () => {
    expect(colunasDoTexto(null)).toEqual(COLUNAS_PADRAO);
    expect(colunasDoTexto('["motivo","telefone"]')).toEqual(["telefone", "motivo"]);
    expect(colunasDoTexto("[]")).toEqual(COLUNAS_PADRAO);
    expect(colunasDoTexto("{")).toEqual(COLUNAS_PADRAO);
    expect(colunasDoTexto('["xyz"]')).toEqual(COLUNAS_PADRAO);
  });

  it("'1 a 20 de 30 contatos' e a contagem", () => {
    expect(textoDoIntervalo(1, 20, 30, t)).toBe("1 a 20 de 30 contatos");
    expect(textoDoIntervalo(2, 20, 30, t)).toBe("21 a 30 de 30 contatos");
    expect(textoDoIntervalo(1, 20, 0, t)).toBe("0 contatos");
    expect(textoDoTotal(1, t)).toBe("1 contato");
    expect(textoDoTotal(1500, t)).toBe("1.500 contatos");
  });
});

describe("filtros dos Detalhes (N9)", () => {
  it("as situações na ordem da Clint, com as nossas no fim", () => {
    expect(SITUACOES_DO_FILTRO.map((s) => ROTULO_DO_FILTRO_DE_SITUACAO[s])).toEqual([
      "Enviado",
      "Entregue",
      "Lida",
      "Respondido",
      "Erro",
      "Não enviado",
      "Aguardando envio",
      "Fora da lista",
    ]);
  });

  it("vai e volta pelo texto; ruim é null; vazio não filtra", () => {
    const f = { busca: "Elza", situacoes: ["lida" as const], motivos: ["131049"] };
    expect(filtrosDeDestinatariosDoTexto(textoDosFiltrosDeDestinatarios(f))).toEqual(f);
    expect(filtrosDeDestinatariosDoTexto(undefined)).toEqual({});
    expect(filtrosDeDestinatariosDoTexto('{"situacoes":["xyz"]}')).toBeNull();
    expect(temFiltroDeDestinatarios({ busca: "  ", situacoes: [] })).toBe(false);
  });

  it("compilar: o padrão do nome e os dígitos do telefone (3 ou mais)", () => {
    expect(compilarFiltrosDeDestinatarios({ busca: "(53) 98455" })).toEqual({
      padrao: "%(53) 98455%",
      digitos: "5398455",
    });
    expect(compilarFiltrosDeDestinatarios({ busca: "Elza", situacoes: ["erro"], motivos: ["131049"] })).toEqual({
      padrao: "%Elza%",
      situacoes: ["erro"],
      motivos: ["131049"],
    });
    expect(compilarFiltrosDeDestinatarios({})).toEqual({});
  });
});

describe("mensagem e modelo (N7)", () => {
  it("as variáveis viram chip; raiz desconhecida fica literal", () => {
    expect(partesDaMensagem("Oi, {{primeiro_nome}}! {{sobrenome}} {{lead.servico_desejado}} {{1}}")).toEqual([
      { tipo: "texto", texto: "Oi, " },
      { tipo: "variavel", chave: "primeiro_nome", rotulo: "Primeiro nome", traduzivel: true },
      { tipo: "texto", texto: "! {{sobrenome}} " },
      { tipo: "variavel", chave: "lead.servico_desejado", rotulo: "servico desejado", traduzivel: false },
      { tipo: "texto", texto: " " },
      { tipo: "variavel", chave: "1", rotulo: "{{1}}", traduzivel: false },
    ]);
    expect(partesDaMensagem(null)).toEqual([]);
  });

  it("o modelo da 8B: nome, idioma e categoria; sem nome, null", () => {
    expect(
      modeloDaCampanha({ template_name: "msg1_ancca", template_language: "pt_BR", template_category: "MARKETING" }),
    ).toEqual({ nome: "msg1_ancca", idioma: "pt_BR", categoria: "MARKETING" });
    expect(modeloDaCampanha({})).toBeNull();
    expect(modeloDaCampanha({ template_name: "  " })).toBeNull();
    expect(siglaDoIdioma("pt_BR")).toBe("BR");
    expect(siglaDoIdioma("en")).toBe("EN");
    expect(siglaDoIdioma(null)).toBeNull();
    expect(ROTULO_DA_CATEGORIA.MARKETING).toBe("Marketing");
  });
});

describe("ritmo e base legal (N8)", () => {
  it("valida: vazio herda do número; faixas do CHECK da 0375", () => {
    expect(
      validarRitmo({ intervalo: "30", tetoDiario: "", tetoHorario: "20", janelaInicio: "8", janelaFim: "20" }),
    ).toEqual({
      ok: true,
      corpo: { intervalo_segundos: 30, teto_diario: null, teto_horario: 20, janela_inicio_hora: 8, janela_fim_hora: 20 },
    });
    const vazio = { intervalo: "", tetoDiario: "", tetoHorario: "", janelaInicio: "", janelaFim: "" };
    expect(validarRitmo({ ...vazio, intervalo: "0" })).toEqual({ ok: false, erro: "O intervalo vai de 1 a 86.400 segundos." });
    expect(validarRitmo({ ...vazio, intervalo: "abc" })).toEqual({ ok: false, erro: "O intervalo vai de 1 a 86.400 segundos." });
    expect(validarRitmo({ ...vazio, tetoDiario: "10001" })).toEqual({ ok: false, erro: "Os tetos vão de 1 a 10.000 mensagens." });
    expect(validarRitmo({ ...vazio, janelaInicio: "8" })).toEqual({
      ok: false,
      erro: "Preencha o início e o fim da janela, ou deixe os dois vazios.",
    });
    expect(validarRitmo({ ...vazio, janelaInicio: "20", janelaFim: "8" })).toEqual({
      ok: false,
      erro: "A janela precisa terminar depois de começar.",
    });
  });

  it("os textos e a ida e volta dos campos", () => {
    const r = { intervaloSegundos: 30, tetoDiario: null, tetoHorario: 1500, janelaInicioHora: 8, janelaFimHora: 20 };
    expect(textosDoRitmo(r, t).map((x) => x.valor)).toEqual(["30 s", "O do número", "1.500", "08h às 20h"]);
    expect(camposDoRitmo(r)).toEqual({ intervalo: "30", tetoDiario: "", tetoHorario: "1500", janelaInicio: "8", janelaFim: "20" });
    expect(textoDaBaseLegal("consent", null, t)).toBe("Consentimento");
    expect(textoDaBaseLegal("legitimate_interest", "LIA-2026-01", t)).toBe("Interesse legítimo (LIA-2026-01)");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-regras.test.ts`
Expected: FAIL ("Cannot find module '@/lib/escale/campanhas/detalhe/apresentacao'").

- [ ] **Step 4: `lib/escale/campanhas/detalhe/tipos.ts`**

```ts
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

/**
 * AS FORMAS DO DETALHE DA CAMPANHA (fork Escale, Fase 8C). O servidor
 * (`banco.ts`) monta, a rota devolve e a janela lê — um tipo só dos dois lados.
 */

/** As contagens do Sumário (9310). Todas sobre os elegíveis, menos `foraDaLista`. */
export interface SumarioDaCampanha {
  adicionados: number;
  /** Saíram e não falharam (a régua da 8A). */
  enviados: number;
  entregues: number;
  /** Leram ou responderam. */
  lidas: number;
  respondidas: number;
  /** Leram e ainda não responderam. */
  leuSemResposta: number;
  erros: number;
  /** Cancelados, pulados, opt-out e pessoais: não vão receber. */
  naoEnviados: number;
  /** Ainda na fila (pendente, na fila, enviando). */
  aguardando: number;
  foraDaLista: number;
}

/** Uma barra do ritmo: a hora LOCAL (fuso da organização), sem fuso no texto. */
export interface PontoDoRitmo {
  hora: string;
  envios: number;
}

export interface MotivoDoErro {
  codigo: string | null;
  quantidade: number;
}

export interface ResultadoDaCampanha {
  negocios: number;
  valorAbertoCentavos: number;
  valorGanhoCentavos: number;
  medianaSegundos: number | null;
  /** Média das taxas de resposta (0 a 1) das 5 últimas concluídas, sem esta. */
  benchmark: number | null;
  taxaDaCampanha: number | null;
}

export interface ModeloDaCampanha {
  nome: string;
  idioma: string | null;
  categoria: string | null;
}

export interface RitmoDaCampanha {
  intervaloSegundos: number | null;
  tetoDiario: number | null;
  tetoHorario: number | null;
  janelaInicioHora: number | null;
  janelaFimHora: number | null;
}

export interface InfoDaCampanha {
  id: string;
  nome: string;
  status: StatusDaCampanha;
  numeroId: string;
  numerosExtras: string[];
  mensagem: string | null;
  modelo: ModeloDaCampanha | null;
  baseLegal: string;
  liaRef: string | null;
  ritmo: RitmoDaCampanha;
  iniciadaEm: string | null;
  agendadaPara: string | null;
  criadaEm: string;
}

export interface DadosDoDetalhe {
  campanha: InfoDaCampanha;
  sumario: SumarioDaCampanha;
  ritmo: PontoDoRitmo[];
  motivos: MotivoDoErro[];
  resultado: ResultadoDaCampanha;
  /** O fuso da organização (as datas da janela). */
  fuso: string;
}

export type SituacaoDoDestinatario =
  | "enviado"
  | "entregue"
  | "lida"
  | "respondido"
  | "erro"
  | "nao_enviado"
  | "aguardando"
  | "fora_da_lista";

export interface LinhaDeDestinatario {
  id: string;
  contatoId: string;
  telefone: string | null;
  nome: string;
  email: string | null;
  situacao: SituacaoDoDestinatario;
  /** Código do erro (situação "erro") ou da exclusão ("fora_da_lista"). */
  motivo: string | null;
  enviadoEm: string | null;
}

export interface PaginaDeDestinatarios {
  linhas: LinhaDeDestinatario[];
  total: number;
  pagina: number;
  porPagina: number;
}

export type SituacaoDosNegocios = "todos" | "abertos" | "ganhos";

export interface NegocioDaCampanha {
  id: string;
  contato: string;
  telefone: string | null;
  origem: string;
  status: "open" | "won" | "lost";
  valorCentavos: number | null;
  criadoEm: string;
}

export interface NegociosDaCampanha {
  linhas: NegocioDaCampanha[];
  total: number;
}
```

- [ ] **Step 5: `lib/escale/campanhas/detalhe/motivos.ts`, `filtros.ts`, `mensagem.ts`**

`lib/escale/campanhas/detalhe/motivos.ts`:

```ts
import { TEXTO_DA_EXCLUSAO } from "@/lib/campanhas/tipos";
import type { Traduzir } from "@/lib/escale/campanhas/apresentacao";

import type { SituacaoDoDestinatario } from "./tipos";

/**
 * O QUE CADA CÓDIGO DE ERRO QUER DIZER (fork Escale, Fase 8C; C5; 013). Os
 * números são da API oficial da Meta (o ack grava em `messages.error_code`, e o
 * trigger da 0375 leva a `last_error_code`); `send_failed` e `send_exception`
 * são da rodada do original. Código desconhecido aparece como está.
 */
export const SEM_CODIGO = "sem_codigo";

export const TEXTO_DO_MOTIVO: Readonly<Record<string, string>> = {
  "130429": "Limite de envio do número atingido",
  "130472": "O número do usuário faz parte de um experimento da Meta",
  "131026": "Destinatário incapaz de receber a mensagem",
  "131031": "Conta da Meta bloqueada",
  "131042": "Problema de pagamento na conta da Meta",
  "131047": "Mais de 24 horas desde a última mensagem do contato",
  "131048": "Limite de envio por denúncia de spam atingido",
  "131049": "Meta optou por não entregar",
  "131050": "O contato parou de receber mensagens de marketing",
  "132000": "As variáveis não conferem com o modelo",
  "132001": "O modelo não existe nesse idioma",
  "132012": "As variáveis não conferem com o modelo",
  "132015": "Modelo pausado pela Meta",
  "132016": "Modelo desativado pela Meta",
  send_failed: "O canal recusou o envio",
  send_exception: "Erro interno no envio",
  [SEM_CODIGO]: "Sem detalhe do erro registrado",
};

export function textoDoMotivo(codigo: string | null, t: Traduzir): string {
  const chave = codigo ?? SEM_CODIGO;
  if (Object.hasOwn(TEXTO_DO_MOTIVO, chave)) return t(TEXTO_DO_MOTIVO[chave]!);
  return t("Erro do canal: {codigo}").replace("{codigo}", chave);
}

export function textoDaExclusao(codigo: string | null, t: Traduzir): string {
  if (!codigo) return t("Fora da lista");
  const textos = TEXTO_DA_EXCLUSAO as Readonly<Record<string, string>>;
  return Object.hasOwn(textos, codigo) ? t(textos[codigo]!) : codigo;
}

/** O motivo que a linha mostra (coluna "Motivo", dica do selo e .CSV). */
export function textoDoMotivoDaLinha(
  situacao: SituacaoDoDestinatario,
  motivo: string | null,
  t: Traduzir,
): string | null {
  if (situacao === "erro") return textoDoMotivo(motivo, t);
  if (situacao === "fora_da_lista") return textoDaExclusao(motivo, t);
  return null;
}
```

`lib/escale/campanhas/detalhe/filtros.ts`:

```ts
import { z } from "zod";

import { padraoDoNome } from "@/lib/escale/campanhas/filtros";

import type { SituacaoDoDestinatario } from "./tipos";

/**
 * OS FILTROS DA ABA DETALHES (fork Escale, Fase 8C; N9; 012, 013). A tela guarda
 * `FiltrosDeDestinatarios`; a rota recebe o JSON enxuto em `?f=` e compila para
 * `fn_escale_destinatario_passa` (9310).
 */
export const SITUACOES_DO_FILTRO = [
  "enviado",
  "entregue",
  "lida",
  "respondido",
  "erro",
  "nao_enviado",
  "aguardando",
  "fora_da_lista",
] as const satisfies readonly SituacaoDoDestinatario[];

/** As palavras do filtro da Clint (material 3); as duas últimas são nossas. */
export const ROTULO_DO_FILTRO_DE_SITUACAO: Record<SituacaoDoDestinatario, string> = {
  enviado: "Enviado",
  entregue: "Entregue",
  lida: "Lida",
  respondido: "Respondido",
  erro: "Erro",
  nao_enviado: "Não enviado",
  aguardando: "Aguardando envio",
  fora_da_lista: "Fora da lista",
};

export const filtrosDeDestinatariosSchema = z
  .object({
    busca: z.string().max(120).optional(),
    situacoes: z.array(z.enum(SITUACOES_DO_FILTRO)).max(SITUACOES_DO_FILTRO.length).optional(),
    motivos: z.array(z.string().regex(/^[A-Za-z0-9_]{1,60}$/)).max(50).optional(),
  })
  .strict();
export type FiltrosDeDestinatarios = z.infer<typeof filtrosDeDestinatariosSchema>;

export const FILTROS_DE_DESTINATARIOS_VAZIOS: FiltrosDeDestinatarios = {};

export function enxugarFiltrosDeDestinatarios(f: FiltrosDeDestinatarios): FiltrosDeDestinatarios {
  const busca = f.busca?.trim();
  return {
    ...(busca ? { busca } : {}),
    ...(f.situacoes?.length ? { situacoes: [...new Set(f.situacoes)] } : {}),
    ...(f.motivos?.length ? { motivos: [...new Set(f.motivos)] } : {}),
  };
}

export const temFiltroDeDestinatarios = (f: FiltrosDeDestinatarios): boolean =>
  Object.keys(enxugarFiltrosDeDestinatarios(f)).length > 0;

export const textoDosFiltrosDeDestinatarios = (f: FiltrosDeDestinatarios): string =>
  JSON.stringify(enxugarFiltrosDeDestinatarios(f));

export function filtrosDeDestinatariosDoTexto(texto: string | null | undefined): FiltrosDeDestinatarios | null {
  if (!texto) return {};
  try {
    const lido = filtrosDeDestinatariosSchema.safeParse(JSON.parse(texto));
    return lido.success ? enxugarFiltrosDeDestinatarios(lido.data) : null;
  } catch {
    return null;
  }
}

/** O que `fn_escale_destinatario_passa` (9310) lê. */
export type FiltroDeDestinatariosCompilado = {
  padrao?: string;
  digitos?: string;
  situacoes?: SituacaoDoDestinatario[];
  motivos?: string[];
};

/** A busca vale para o nome (`ilike`) e, com 3 dígitos ou mais, para o telefone. */
export function compilarFiltrosDeDestinatarios(f: FiltrosDeDestinatarios): FiltroDeDestinatariosCompilado {
  const e = enxugarFiltrosDeDestinatarios(f);
  const digitos = e.busca?.replace(/\D/g, "") ?? "";
  return {
    ...(e.busca ? { padrao: padraoDoNome(e.busca) } : {}),
    ...(digitos.length >= 3 ? { digitos } : {}),
    ...(e.situacoes ? { situacoes: e.situacoes } : {}),
    ...(e.motivos ? { motivos: e.motivos } : {}),
  };
}
```

`lib/escale/campanhas/detalhe/mensagem.ts` (se o Step 1 achou outros nomes de coluna do modelo, troque os três valores de `COLUNAS_DO_MODELO` e o teste):

```ts
import type { ModeloDaCampanha } from "./tipos";

/**
 * A MENSAGEM NA PRÉVIA DO CELULAR (fork Escale, Fase 8C; N7; 009, 010). As
 * variáveis do renderizador do original viram chip; raiz desconhecida fica
 * literal, como no envio. O modelo da Meta vem das colunas da 8B, lidas num
 * lugar só.
 */
const TOKEN = /\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\s*\}\}/g;

export type ParteDaMensagem =
  | { tipo: "texto"; texto: string }
  | { tipo: "variavel"; chave: string; rotulo: string; traduzivel: boolean };

const ROTULO_DA_VARIAVEL: Readonly<Record<string, string>> = {
  nome: "Nome",
  primeiro_nome: "Primeiro nome",
  saudacao: "Saudação",
};

function rotuloDaVariavel(chave: string): { rotulo: string; traduzivel: boolean } | null {
  if (Object.hasOwn(ROTULO_DA_VARIAVEL, chave)) return { rotulo: ROTULO_DA_VARIAVEL[chave]!, traduzivel: true };
  if (/^\d+$/.test(chave)) return { rotulo: `{{${chave}}}`, traduzivel: false };
  const [raiz, ...resto] = chave.split(".");
  if ((raiz === "lead" || raiz === "contato") && resto.length > 0) {
    return { rotulo: resto[resto.length - 1]!.replace(/_/g, " "), traduzivel: false };
  }
  return null;
}

export function partesDaMensagem(texto: string | null): ParteDaMensagem[] {
  if (!texto) return [];
  const partes: ParteDaMensagem[] = [];
  const somarTexto = (s: string) => {
    if (!s) return;
    const ultima = partes[partes.length - 1];
    if (ultima?.tipo === "texto") partes[partes.length - 1] = { tipo: "texto", texto: ultima.texto + s };
    else partes.push({ tipo: "texto", texto: s });
  };
  let cursor = 0;
  for (const m of texto.matchAll(TOKEN)) {
    const inicio = m.index ?? 0;
    somarTexto(texto.slice(cursor, inicio));
    const r = rotuloDaVariavel(m[1]!);
    if (r) partes.push({ tipo: "variavel", chave: m[1]!, ...r });
    else somarTexto(m[0]);
    cursor = inicio + m[0].length;
  }
  somarTexto(texto.slice(cursor));
  return partes;
}

/** As colunas do modelo da Meta que a 8B grava em `campaigns`. */
export const COLUNAS_DO_MODELO = {
  nome: "template_name",
  idioma: "template_language",
  categoria: "template_category",
} as const;

export function modeloDaCampanha(linha: Readonly<Record<string, unknown>>): ModeloDaCampanha | null {
  const texto = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
  const nome = texto(linha[COLUNAS_DO_MODELO.nome]);
  if (!nome) return null;
  return {
    nome,
    idioma: texto(linha[COLUNAS_DO_MODELO.idioma]),
    categoria: texto(linha[COLUNAS_DO_MODELO.categoria]),
  };
}

export const ROTULO_DA_CATEGORIA: Readonly<Record<string, string>> = {
  MARKETING: "Marketing",
  UTILITY: "Utilidade",
  AUTHENTICATION: "Autenticação",
};

/** "pt_BR" → "BR" (o selo do 010); "en" → "EN". */
export function siglaDoIdioma(idioma: string | null): string | null {
  if (!idioma) return null;
  return (idioma.split(/[_-]/)[1] ?? idioma).toUpperCase();
}
```

- [ ] **Step 6: `lib/escale/campanhas/detalhe/apresentacao.ts`**

```ts
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";
import {
  dataEHoraBr,
  numeroBr,
  porcento,
  type TomDoStatus,
  type Traduzir,
} from "@/lib/escale/campanhas/apresentacao";

import type {
  InfoDaCampanha,
  MotivoDoErro,
  PontoDoRitmo,
  ResultadoDaCampanha,
  SituacaoDoDestinatario,
  SituacaoDosNegocios,
  SumarioDaCampanha,
} from "./tipos";

/**
 * O QUE O DETALHE DA CAMPANHA MOSTRA (fork Escale, Fase 8C; N3–N12). Funções
 * puras: o servidor conta, aqui se decide rótulo, percentual e texto. Os textos
 * passam por `t` (quem chama traduz).
 */

const pct = (parte: number, base: number): string => {
  const p = porcento(parte, base);
  return p === null ? "—" : `${p}%`;
};

// ─── Cartões do topo (009) ─────────────────────────────────────────────────

export interface CartaoDoTopo {
  chave: "adicionados" | "enviados" | "entregues" | "respondidas";
  rotulo: string;
  dica: string;
  valor: string;
  complemento?: string;
}

export function cartoesDoTopo(s: SumarioDaCampanha): CartaoDoTopo[] {
  return [
    {
      chave: "adicionados",
      rotulo: "Adicionados p/ envio",
      dica: "Contatos da lista que podem receber a mensagem.",
      valor: numeroBr(s.adicionados),
    },
    { chave: "enviados", rotulo: "Enviados", dica: "Mensagens que saíram do número.", valor: numeroBr(s.enviados) },
    {
      chave: "entregues",
      rotulo: "Entregues",
      dica: "Percentual sobre os enviados.",
      valor: pct(s.entregues, s.enviados),
      complemento: numeroBr(s.entregues),
    },
    {
      chave: "respondidas",
      rotulo: "Respondidas",
      dica: "Percentual sobre os enviados.",
      valor: pct(s.respondidas, s.enviados),
      complemento: numeroBr(s.respondidas),
    },
  ];
}

// ─── Funil (009) ───────────────────────────────────────────────────────────

export interface EtapaDoFunil {
  chave: string;
  rotulo: string;
  quantidade: number;
  porcento: number | null;
}

export function etapasDoFunil(s: SumarioDaCampanha): EtapaDoFunil[] {
  const etapas: Array<[string, string, number]> = [
    ["enviados", "Enviados", s.enviados],
    ["entregues", "Entregues", s.entregues],
    ["lidas", "Lidas", s.lidas],
    ["respondidas", "Respondidas", s.respondidas],
  ];
  return etapas.map(([chave, rotulo, quantidade]) => ({
    chave,
    rotulo,
    quantidade,
    porcento: porcento(quantidade, s.enviados),
  }));
}

// ─── Rosca (009) ───────────────────────────────────────────────────────────

export type ChaveDaFatia = "lida" | "entregue" | "enviado" | "erro" | "nao_enviado" | "aguardando";

export const ROTULO_DA_FATIA: Record<ChaveDaFatia, string> = {
  lida: "Lida",
  entregue: "Entregue",
  enviado: "Enviado",
  erro: "Erro",
  nao_enviado: "Não enviado",
  aguardando: "Aguardando envio",
};

export interface FatiaDaRosca {
  chave: ChaveDaFatia;
  quantidade: number;
}

/** Disjuntas, somam os adicionados; "Aguardando envio" (nosso) só com alguém na fila. */
export function fatiasDaRosca(s: SumarioDaCampanha): FatiaDaRosca[] {
  const fatias: FatiaDaRosca[] = [
    { chave: "lida", quantidade: s.lidas },
    { chave: "entregue", quantidade: Math.max(0, s.entregues - s.lidas) },
    { chave: "enviado", quantidade: Math.max(0, s.enviados - s.entregues) },
    { chave: "erro", quantidade: s.erros },
    { chave: "nao_enviado", quantidade: s.naoEnviados },
    { chave: "aguardando", quantidade: s.aguardando },
  ];
  return fatias.filter((f) => f.chave !== "aguardando" || f.quantidade > 0);
}

export const leuSemResposta = (s: SumarioDaCampanha): { porcento: number | null; quantidade: number } => ({
  porcento: porcento(s.leuSemResposta, s.enviados),
  quantidade: s.leuSemResposta,
});

// ─── Motivos do erro (010) ─────────────────────────────────────────────────

const somaDasFalhas = (motivos: readonly MotivoDoErro[]) => motivos.reduce((a, m) => a + m.quantidade, 0);

/** "3 motivos em 4 falhas de envio". */
export function resumoDosMotivos(motivos: readonly MotivoDoErro[], t: Traduzir): string {
  const n = motivos.length;
  const f = somaDasFalhas(motivos);
  const textoDosMotivos = n === 1 ? t("1 motivo") : t("{n} motivos").replace("{n}", numeroBr(n));
  const textoDasFalhas = f === 1 ? t("1 falha de envio") : t("{n} falhas de envio").replace("{n}", numeroBr(f));
  return t("{motivos} em {falhas}").replace("{motivos}", textoDosMotivos).replace("{falhas}", textoDasFalhas);
}

export const seloDasFalhas = (n: number, t: Traduzir): string =>
  n === 1 ? t("1 falha") : t("{n} falhas").replace("{n}", numeroBr(n));

/** "% sobre não entregues" (010): a parte das falhas da amostra. */
export const porcentoDoMotivo = (quantidade: number, motivos: readonly MotivoDoErro[]): number | null =>
  porcento(quantidade, somaDasFalhas(motivos));

// ─── Resultado (011) ───────────────────────────────────────────────────────

const decimalBr = (n: number): string =>
  (Math.round(n * 10) / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** "Tempo mediano até resposta" em min, h ou dias (material 3). */
export function textoDoTempoMediano(segundos: number | null, t: Traduzir): string {
  if (segundos === null || !Number.isFinite(segundos)) return t("Não foi possível calcular o tempo de resposta.");
  if (segundos < 3600) return `${Math.max(1, Math.round(segundos / 60))} ${t("min")}`;
  if (segundos < 86_400) return `${decimalBr(segundos / 3600)} ${t("h")}`;
  return `${decimalBr(segundos / 86_400)} ${t("dias")}`;
}

export interface Comparacao {
  media: number | null;
  estaCampanha: number | null;
  /** `true` pinta "Esta campanha" de vermelho (011); `false`, de verde. */
  abaixo: boolean | null;
}

export function comparacaoDoBenchmark(r: ResultadoDaCampanha): Comparacao {
  const media = r.benchmark === null ? null : Math.round(r.benchmark * 100);
  const estaCampanha = r.taxaDaCampanha === null ? null : Math.round(r.taxaDaCampanha * 100);
  return { media, estaCampanha, abaixo: media === null || estaCampanha === null ? null : estaCampanha < media };
}

/** "R$ 14.680,92" (o espaço comum, não o duro do Intl). */
export function reaisBr(centavos: number | null): string {
  if (centavos === null) return "—";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ");
}

export const ROTULO_DO_STATUS_DO_NEGOCIO: Record<"open" | "won" | "lost", string> = {
  open: "Em aberto",
  won: "Ganho",
  lost: "Perdido",
};

export const TITULO_DA_GAVETA: Record<SituacaoDosNegocios, string> = {
  todos: "Negócios criados por esta campanha",
  abertos: "Negócios em aberto criados por esta campanha",
  ganhos: "Negócios ganhos criados por esta campanha",
};

// ─── Ritmo e rodapé ────────────────────────────────────────────────────────

/** "2026-09-10T12:00:00" → "12:00"; com mais de um dia na amostra, "10/09 12:00". */
export function rotuloDaHora(hora: string, variosDias: boolean): string {
  const [data = "", resto = ""] = hora.split("T");
  const [, mes = "", dia = ""] = data.split("-");
  const hh = resto.slice(0, 5);
  return variosDias ? `${dia}/${mes} ${hh}` : hh;
}

export const varreDias = (pontos: readonly PontoDoRitmo[]): boolean =>
  new Set(pontos.map((p) => p.hora.slice(0, 10))).size > 1;

/** "Enviado em 10/09/2026 12:39" (011); antes do envio, a agenda ou a criação. */
export function rodapeDoSumario(
  c: Pick<InfoDaCampanha, "iniciadaEm" | "agendadaPara" | "criadaEm">,
  t: Traduzir,
  fuso?: string,
): string {
  if (c.iniciadaEm) return `${t("Enviado em")} ${dataEHoraBr(c.iniciadaEm, fuso)}`;
  if (c.agendadaPara) return t("Agendada para {data}").replace("{data}", dataEHoraBr(c.agendadaPara, fuso));
  return `${t("Criado em")} ${dataEHoraBr(c.criadaEm, fuso)}`;
}

// ─── Detalhes (012) ────────────────────────────────────────────────────────

/** O selo da linha (material 3, status do contato no WhatsApp; os dois últimos são nossos). */
export const ROTULO_DA_SITUACAO: Record<SituacaoDoDestinatario, string> = {
  enviado: "Enviado",
  entregue: "Recebido",
  lida: "Lido",
  respondido: "Respondido",
  erro: "Erro",
  nao_enviado: "Não enviado",
  aguardando: "Envio em andamento",
  fora_da_lista: "Fora da lista",
};

export const TOM_DA_SITUACAO: Record<SituacaoDoDestinatario, TomDoStatus> = {
  enviado: "cinza",
  entregue: "azul",
  lida: "verde",
  respondido: "verde",
  erro: "vermelho",
  nao_enviado: "laranja",
  aguardando: "ciano",
  fora_da_lista: "granito",
};

const ANTES_DO_ENVIO: ReadonlySet<StatusDaCampanha> = new Set(["draft", "ready", "scheduled"]);

/** "Excluir selecionados" só enquanto ninguém recebeu (PRD C12). */
export const podeTirarDaLista = (status: StatusDaCampanha, enviados: number): boolean =>
  ANTES_DO_ENVIO.has(status) && enviados === 0;

export const COLUNAS_DOS_DESTINATARIOS = ["telefone", "nome", "email", "situacao", "enviado_em", "motivo"] as const;
export type ColunaDosDestinatarios = (typeof COLUNAS_DOS_DESTINATARIOS)[number];

export const ROTULO_DA_COLUNA: Record<ColunaDosDestinatarios, string> = {
  telefone: "Telefone",
  nome: "Nome",
  email: "Email",
  situacao: "Status",
  enviado_em: "Enviado em",
  motivo: "Motivo",
};

/** As de 012; "Enviado em" e "Motivo" começam escondidas. */
export const COLUNAS_PADRAO: readonly ColunaDosDestinatarios[] = ["telefone", "nome", "email", "situacao"];
export const CHAVE_DAS_COLUNAS = "escale:campanha:colunas-dos-destinatarios";

/** O que o `localStorage` guardou → colunas válidas, na ordem fixa; o resto volta ao padrão. */
export function colunasDoTexto(texto: string | null): ColunaDosDestinatarios[] {
  if (!texto) return [...COLUNAS_PADRAO];
  try {
    const lido: unknown = JSON.parse(texto);
    if (!Array.isArray(lido)) return [...COLUNAS_PADRAO];
    const escolhidas = COLUNAS_DOS_DESTINATARIOS.filter((c) => lido.includes(c));
    return escolhidas.length > 0 ? escolhidas : [...COLUNAS_PADRAO];
  } catch {
    return [...COLUNAS_PADRAO];
  }
}

export const POR_PAGINA_DOS_DESTINATARIOS = [10, 20, 50, 100] as const;
export const POR_PAGINA_PADRAO_DOS_DESTINATARIOS = 20;

/** "1 a 20 de 30 contatos" (012). */
export function textoDoIntervalo(pagina: number, porPagina: number, total: number, t: Traduzir): string {
  if (total <= 0) return t("0 contatos");
  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(total, pagina * porPagina);
  return t("{inicio} a {fim} de {total} contatos")
    .replace("{inicio}", numeroBr(inicio))
    .replace("{fim}", numeroBr(fim))
    .replace("{total}", numeroBr(total));
}

export const textoDoTotal = (total: number, t: Traduzir): string =>
  total === 1 ? t("1 contato") : t("{n} contatos").replace("{n}", numeroBr(total));
```

- [ ] **Step 7: `lib/escale/campanhas/detalhe/ritmo.ts` e `cores.ts`**

`lib/escale/campanhas/detalhe/ritmo.ts`:

```ts
import { numeroBr, type Traduzir } from "@/lib/escale/campanhas/apresentacao";

import type { RitmoDaCampanha } from "./tipos";

/**
 * O BLOCO "ENTREGA" DO DETALHE (fork Escale, Fase 8C; N8; C13): o ritmo próprio
 * da campanha (vazio = o do número), a validação da janela de editar (as faixas
 * do CHECK da 0375 e do `ritmoSchema` do original) e a base legal.
 */
export type CamposDoRitmo = Record<"intervalo" | "tetoDiario" | "tetoHorario" | "janelaInicio" | "janelaFim", string>;

export type CorpoDoRitmo = {
  intervalo_segundos: number | null;
  teto_diario: number | null;
  teto_horario: number | null;
  janela_inicio_hora: number | null;
  janela_fim_hora: number | null;
};

export type RitmoValidado = { ok: true; corpo: CorpoDoRitmo } | { ok: false; erro: string };

const texto = (n: number | null) => (n === null ? "" : String(n));

export const camposDoRitmo = (r: RitmoDaCampanha): CamposDoRitmo => ({
  intervalo: texto(r.intervaloSegundos),
  tetoDiario: texto(r.tetoDiario),
  tetoHorario: texto(r.tetoHorario),
  janelaInicio: texto(r.janelaInicioHora),
  janelaFim: texto(r.janelaFimHora),
});

/** Vazio = `null`; não inteiro = `NaN` (cai na faixa). */
function inteiro(s: string): number | null {
  const v = s.trim();
  if (v === "") return null;
  return /^\d+$/.test(v) ? Number(v) : Number.NaN;
}

const fora = (n: number | null, min: number, max: number) => n !== null && !(n >= min && n <= max);

export function validarRitmo(c: CamposDoRitmo): RitmoValidado {
  const intervalo = inteiro(c.intervalo);
  const tetoDiario = inteiro(c.tetoDiario);
  const tetoHorario = inteiro(c.tetoHorario);
  const inicio = inteiro(c.janelaInicio);
  const fim = inteiro(c.janelaFim);
  if (fora(intervalo, 1, 86_400)) return { ok: false, erro: "O intervalo vai de 1 a 86.400 segundos." };
  if (fora(tetoDiario, 1, 10_000) || fora(tetoHorario, 1, 10_000)) {
    return { ok: false, erro: "Os tetos vão de 1 a 10.000 mensagens." };
  }
  if ((inicio === null) !== (fim === null)) {
    return { ok: false, erro: "Preencha o início e o fim da janela, ou deixe os dois vazios." };
  }
  if (inicio !== null && fim !== null && (fora(inicio, 0, 23) || fora(fim, 1, 24) || fim <= inicio)) {
    return { ok: false, erro: "A janela precisa terminar depois de começar." };
  }
  return {
    ok: true,
    corpo: {
      intervalo_segundos: intervalo,
      teto_diario: tetoDiario,
      teto_horario: tetoHorario,
      janela_inicio_hora: inicio,
      janela_fim_hora: fim,
    },
  };
}

const hora = (h: number) => String(h).padStart(2, "0");

export function textosDoRitmo(r: RitmoDaCampanha, t: Traduzir): Array<{ rotulo: string; valor: string }> {
  const doNumero = t("O do número");
  return [
    {
      rotulo: t("Intervalo entre mensagens"),
      valor: r.intervaloSegundos === null ? doNumero : `${numeroBr(r.intervaloSegundos)} s`,
    },
    { rotulo: t("Teto por dia"), valor: r.tetoDiario === null ? doNumero : numeroBr(r.tetoDiario) },
    { rotulo: t("Teto por hora"), valor: r.tetoHorario === null ? doNumero : numeroBr(r.tetoHorario) },
    {
      rotulo: t("Janela de envio"),
      valor:
        r.janelaInicioHora === null || r.janelaFimHora === null
          ? doNumero
          : t("{inicio}h às {fim}h").replace("{inicio}", hora(r.janelaInicioHora)).replace("{fim}", hora(r.janelaFimHora)),
    },
  ];
}

export function textoDaBaseLegal(base: string, lia: string | null, t: Traduzir): string {
  if (base === "legitimate_interest") return `${t("Interesse legítimo")}${lia ? ` (${lia})` : ""}`;
  return t("Consentimento");
}
```

`lib/escale/campanhas/detalhe/cores.ts`:

```ts
import type { ChaveDaFatia } from "./apresentacao";

/**
 * AS CORES DO DETALHE (fork Escale, Fase 8C; N17). Os valores moram em
 * `app/escale-tema.css` (bloco da 8C, claro e escuro); aqui só as classes.
 */
export const CLASSE_DA_FATIA: Record<ChaveDaFatia, { fundo: string; traco: string }> = {
  lida: { fundo: "bg-(--escale-rosca-lida)", traco: "stroke-(--escale-rosca-lida)" },
  entregue: { fundo: "bg-(--escale-rosca-entregue)", traco: "stroke-(--escale-rosca-entregue)" },
  enviado: { fundo: "bg-(--escale-rosca-enviado)", traco: "stroke-(--escale-rosca-enviado)" },
  erro: { fundo: "bg-(--escale-rosca-erro)", traco: "stroke-(--escale-rosca-erro)" },
  nao_enviado: { fundo: "bg-(--escale-rosca-nao-enviado)", traco: "stroke-(--escale-rosca-nao-enviado)" },
  aguardando: { fundo: "bg-(--escale-rosca-aguardando)", traco: "stroke-(--escale-rosca-aguardando)" },
};

export const CLASSE_DO_TRILHO_DO_FUNIL = "bg-(--escale-detalhe-trilho)";
export const TRACO_DO_TRILHO_DA_ROSCA = "stroke-(--escale-detalhe-trilho)";
```

- [ ] **Step 8: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-regras.test.ts && corepack pnpm prettier --write lib/escale/campanhas/detalhe tests/unit/escale-detalhe-da-campanha-regras.test.ts && corepack pnpm eslint lib/escale/campanhas/detalhe && corepack pnpm typecheck`
Expected: PASS. Se `reaisBr` devolver "R$ 14.680,92" com outro espaço (ICU do Node), confira o `replace(/\u00a0/g, " ")` e troque por `replace(/\s/g, " ")`.

- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/plans/2026-10-19-fase-8c-detalhe-da-campanha.md lib/escale/campanhas/detalhe tests/unit/escale-detalhe-da-campanha-regras.test.ts
git commit -m "feat(escale): regras do detalhe da campanha — cartões, funil, rosca, motivos, resultado, filtros e mensagem (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 2: Migration 9310 (as funções do detalhe e os índices)

**Files:**
- Create: `supabase/migrations/20261120120000_9310_detalhe_da_campanha.sql`, `tests/unit/escale-detalhe-da-campanha-migration.test.ts`, `tests/invariants/escale-detalhe-da-campanha-9310.test.ts`
- Modify: `supabase/baseline.sql` (o bloco logo ANTES de `-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----`)

**Interfaces (Produces):**
- `fn_escale_situacao_do_destinatario(r public.campaign_recipients) returns text` — `enviado | entregue | lida | respondido | erro | nao_enviado | aguardando | fora_da_lista`.
- `fn_escale_sumario_da_campanha(p_org uuid, p_campanha uuid) returns table (adicionados, enviados, entregues, lidas, respondidas, leu_sem_resposta, erros, nao_enviados, aguardando, fora_da_lista integer)`.
- `fn_escale_ritmo_da_campanha(p_org uuid, p_campanha uuid, p_fuso text) returns table (hora timestamp, envios integer)`.
- `fn_escale_motivos_do_erro(p_org uuid, p_campanha uuid) returns table (codigo text, quantidade integer)`.
- `fn_escale_resultado_da_campanha(p_org uuid, p_campanha uuid) returns table (negocios integer, valor_aberto_centavos bigint, valor_ganho_centavos bigint, mediana_segundos numeric, benchmark numeric, taxa_da_campanha numeric)`.
- `fn_escale_negocios_da_campanha(p_org uuid, p_campanha uuid, p_situacao text, p_limite integer) returns table (lead_id uuid, contato text, telefone text, origem text, status text, valor_centavos bigint, criado_em timestamptz, total bigint)`.
- `fn_escale_destinatario_passa(r public.campaign_recipients, c public.contacts, p_filtros jsonb) returns boolean` — lê o `FiltroDeDestinatariosCompilado` da Task 1.
- `fn_escale_destinatarios_da_campanha(p_org uuid, p_campanha uuid, p_filtros jsonb, p_limite integer, p_deslocamento integer) returns table (destinatario_id uuid, contato_id uuid, telefone text, nome text, email text, situacao text, motivo text, enviado_em timestamptz, total bigint)`.
- `fn_escale_selecao_da_campanha(p_org uuid, p_campanha uuid, p_filtros jsonb, p_ids uuid[], p_excluidos uuid[]) returns table (destinatario_id uuid, contato_id uuid)`.

- [ ] **Step 1: O teste do texto da migration (falha)**

`tests/unit/escale-detalhe-da-campanha-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261120120000_9310_detalhe_da_campanha.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

const FUNCOES = [
  "fn_escale_situacao_do_destinatario(public.campaign_recipients)",
  "fn_escale_sumario_da_campanha(uuid, uuid)",
  "fn_escale_ritmo_da_campanha(uuid, uuid, text)",
  "fn_escale_motivos_do_erro(uuid, uuid)",
  "fn_escale_resultado_da_campanha(uuid, uuid)",
  "fn_escale_negocios_da_campanha(uuid, uuid, text, integer)",
  "fn_escale_destinatario_passa(public.campaign_recipients, public.contacts, jsonb)",
  "fn_escale_destinatarios_da_campanha(uuid, uuid, jsonb, integer, integer)",
  "fn_escale_selecao_da_campanha(uuid, uuid, jsonb, uuid[], uuid[])",
];

describe("migration 9310 (detalhe da campanha da casca)", () => {
  it("existe, começa pela linha do manifesto e a 2ª linha é o cabeçalho do bloco", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    expect(MIGRATION.split("\n")[1]).toBe("-- ---- FORK ESCALE · detalhe da campanha da casca (migration 9310) ----");
  });

  it("as nove são invoker, fechadas ao anon e abertas ao authenticated; nenhuma definer", () => {
    expect(MIGRATION).not.toMatch(/security definer/);
    for (const f of FUNCOES) {
      const nome = f.split("(")[0];
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`));
      expect(MIGRATION).toContain(`revoke all on function public.${f} from public, anon;`);
      expect(MIGRATION).toContain(`grant execute on function public.${f} to authenticated, service_role;`);
    }
  });

  it("as sete que leem dados só respondem a gerente", () => {
    expect(MIGRATION.match(/fn_role_at_least\(p_org, 'manager'\)/g)?.length).toBe(7);
  });

  it("as amostras da Clint (1.000) e o benchmark de 5", () => {
    expect(MIGRATION.match(/limit 1000/g)?.length).toBe(3);
    expect(MIGRATION).toContain("limit 5");
  });

  it("os dois índices", () => {
    expect(MIGRATION).toContain("idx_campaign_recipients_ordem");
    expect(MIGRATION).toContain("idx_crm_leads_da_campanha");
    expect(MIGRATION).toContain("where source = 'campanha'");
  });

  it("o baseline traz o bloco (sem a linha do manifesto) depois do da 9301 e ANTES da varredura de anon", () => {
    const corpo = MIGRATION.split("\n").slice(1).join("\n").trimEnd();
    expect(BASELINE).toContain(corpo);
    const iBloco = BASELINE.indexOf("-- ---- FORK ESCALE · detalhe da campanha da casca (migration 9310) ----");
    const i9301 = BASELINE.indexOf("-- ---- FORK ESCALE · lista de campanhas da casca (migration 9301) ----");
    const iVarredura = BASELINE.indexOf(
      "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----",
    );
    expect(i9301).toBeGreaterThan(-1);
    expect(iBloco).toBeGreaterThan(i9301);
    expect(iVarredura).toBeGreaterThan(iBloco);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-migration.test.ts`
Expected: FAIL (o arquivo não existe).

- [ ] **Step 2: A migration**

`supabase/migrations/20261120120000_9310_detalhe_da_campanha.sql` (a 1ª linha é uma linha só):

```sql
-- manifest: **Detalhe da campanha da casca (fork Escale, Fase 8C).** Nove funções invoker, fechadas ao `anon`: `fn_escale_situacao_do_destinatario` (a situação de cada destinatário, uma régua só para o sumário, a tabela, o filtro e o .CSV), `fn_escale_sumario_da_campanha` (as contagens do Sumário), `fn_escale_ritmo_da_campanha` (envios por hora no fuso, 1.000 mais recentes), `fn_escale_motivos_do_erro` (falhas por código, 1.000 mais recentes), `fn_escale_resultado_da_campanha` (negócios e valores da origem "campanha", mediana até a resposta, benchmark das 5 últimas concluídas), `fn_escale_negocios_da_campanha` (a gaveta, até 200), `fn_escale_destinatario_passa` e `fn_escale_destinatarios_da_campanha` (a aba Detalhes) e `fn_escale_selecao_da_campanha` (quem a ação em massa alcança). As que leem dados só respondem a gerente ou acima. Dois índices: a página de destinatários e os negócios da campanha.
-- ---- FORK ESCALE · detalhe da campanha da casca (migration 9310) ----
-- 9310: detalhe da campanha da casca (fork Escale, Frente B).

-- ── 1. A situação do destinatário ────────────────────────────────────────────
-- A régua da 8A (lib/campanhas/metricas.ts): carimbos cumulativos; quem falhou
-- é só "erro". Os carimbos não voltam, então a situação nunca regride.
create or replace function public.fn_escale_situacao_do_destinatario(r public.campaign_recipients)
returns text
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$
  select case
    when r.eligibility_status = 'excluded' then 'fora_da_lista'
    when r.status = 'failed' then 'erro'
    when r.replied_at is not null then 'respondido'
    when r.read_at is not null then 'lida'
    when r.delivered_at is not null then 'entregue'
    when r.sent_at is not null then 'enviado'
    when r.status in ('pending', 'queued', 'sending') then 'aguardando'
    else 'nao_enviado'
  end
$$;

-- ── 2. O Sumário ─────────────────────────────────────────────────────────────
create or replace function public.fn_escale_sumario_da_campanha(p_org uuid, p_campanha uuid)
returns table (
  adicionados integer, enviados integer, entregues integer, lidas integer, respondidas integer,
  leu_sem_resposta integer, erros integer, nao_enviados integer, aguardando integer, fora_da_lista integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with s as (
    select public.fn_escale_situacao_do_destinatario(r) as situacao
      from public.campaign_recipients r
     where r.organization_id = p_org
       and r.campaign_id = p_campanha
       and public.fn_role_at_least(p_org, 'manager')
  )
  select count(*) filter (where situacao <> 'fora_da_lista')::integer,
         count(*) filter (where situacao in ('enviado', 'entregue', 'lida', 'respondido'))::integer,
         count(*) filter (where situacao in ('entregue', 'lida', 'respondido'))::integer,
         count(*) filter (where situacao in ('lida', 'respondido'))::integer,
         count(*) filter (where situacao = 'respondido')::integer,
         count(*) filter (where situacao = 'lida')::integer,
         count(*) filter (where situacao = 'erro')::integer,
         count(*) filter (where situacao = 'nao_enviado')::integer,
         count(*) filter (where situacao = 'aguardando')::integer,
         count(*) filter (where situacao = 'fora_da_lista')::integer
    from s
$$;

-- ── 3. O ritmo por hora (1.000 envios mais recentes, como a Clint) ───────────
create or replace function public.fn_escale_ritmo_da_campanha(p_org uuid, p_campanha uuid, p_fuso text)
returns table (hora timestamp, envios integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with recentes as (
    select r.sent_at
      from public.campaign_recipients r
     where r.organization_id = p_org
       and r.campaign_id = p_campanha
       and r.sent_at is not null
       and public.fn_role_at_least(p_org, 'manager')
     order by r.sent_at desc
     limit 1000
  )
  select date_trunc('hour', sent_at at time zone coalesce(p_fuso, 'America/Sao_Paulo')), count(*)::integer
    from recentes
   group by 1
   order by 1
$$;

-- ── 4. Os motivos do erro (1.000 falhas mais recentes) ───────────────────────
create or replace function public.fn_escale_motivos_do_erro(p_org uuid, p_campanha uuid)
returns table (codigo text, quantidade integer)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with recentes as (
    select r.last_error_code
      from public.campaign_recipients r
     where r.organization_id = p_org
       and r.campaign_id = p_campanha
       and r.eligibility_status = 'eligible'
       and r.status = 'failed'
       and public.fn_role_at_least(p_org, 'manager')
     order by coalesce(r.last_attempt_at, r.updated_at) desc, r.id desc
     limit 1000
  )
  select last_error_code, count(*)::integer
    from recentes
   group by 1
   order by 2 desc, 1 nulls last
$$;

-- ── 5. O resultado ───────────────────────────────────────────────────────────
-- Negócio da campanha = `source = 'campanha'` + `source_metadata.campaign_id`
-- (a marca de lib/campanhas/origem-do-lead.ts). Taxa de resposta = respondidas
-- ÷ enviados (a régua da 8A); benchmark = média das 5 concluídas mais recentes.
create or replace function public.fn_escale_resultado_da_campanha(p_org uuid, p_campanha uuid)
returns table (
  negocios integer, valor_aberto_centavos bigint, valor_ganho_centavos bigint,
  mediana_segundos numeric, benchmark numeric, taxa_da_campanha numeric
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with pode as (
    select public.fn_role_at_least(p_org, 'manager') as ok
  ),
  negocios as (
    select count(*)::integer as n,
           coalesce(sum(l.value_cents) filter (where l.status = 'open'), 0)::bigint as aberto,
           coalesce(sum(l.value_cents) filter (where l.status = 'won'), 0)::bigint as ganho
      from public.crm_leads l, pode
     where pode.ok
       and l.organization_id = p_org
       and l.source = 'campanha'
       and l.source_metadata ->> 'campaign_id' = p_campanha::text
  ),
  respostas as (
    select extract(epoch from (r.replied_at - r.sent_at))::numeric as segundos
      from public.campaign_recipients r, pode
     where pode.ok
       and r.organization_id = p_org
       and r.campaign_id = p_campanha
       and r.sent_at is not null
       and r.replied_at is not null
       and r.replied_at >= r.sent_at
     order by r.replied_at desc
     limit 1000
  ),
  taxas as (
    select c.id,
           (select (count(*) filter (where k.situacao = 'respondido'))::numeric
                   / nullif(count(*) filter (where k.situacao in ('enviado', 'entregue', 'lida', 'respondido')), 0)
              from (select public.fn_escale_situacao_do_destinatario(r) as situacao
                      from public.campaign_recipients r
                     where r.organization_id = p_org and r.campaign_id = c.id) k) as taxa,
           c.completed_at
      from public.campaigns c, pode
     where pode.ok
       and c.organization_id = p_org
       and (c.id = p_campanha or c.status = 'completed')
  ),
  ultimas as (
    select x.taxa
      from taxas x
     where x.id <> p_campanha
       and x.completed_at is not null
     order by x.completed_at desc, x.id desc
     limit 5
  )
  select n.n, n.aberto, n.ganho,
         (select percentile_cont(0.5) within group (order by segundos) from respostas)::numeric,
         (select avg(u.taxa) from ultimas u where u.taxa is not null)::numeric,
         (select x.taxa from taxas x where x.id = p_campanha)
    from negocios n
$$;

-- ── 6. A gaveta "Negócios criados" (até 200, como a Clint) ───────────────────
create or replace function public.fn_escale_negocios_da_campanha(
  p_org uuid,
  p_campanha uuid,
  p_situacao text,
  p_limite integer
)
returns table (
  lead_id uuid, contato text, telefone text, origem text, status text,
  valor_centavos bigint, criado_em timestamptz, total bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select l.id,
         coalesce(nullif(btrim(c.name), ''), nullif(btrim(c.display_name), ''), l.title),
         c.phone_number,
         coalesce(p.name, ''),
         l.status,
         l.value_cents,
         l.created_at,
         count(*) over ()
    from public.crm_leads l
    left join public.contacts c on c.id = l.contact_id and c.organization_id = l.organization_id
    left join public.crm_pipelines p on p.id = l.pipeline_id and p.organization_id = l.organization_id
   where l.organization_id = p_org
     and public.fn_role_at_least(p_org, 'manager')
     and l.source = 'campanha'
     and l.source_metadata ->> 'campaign_id' = p_campanha::text
     and (coalesce(p_situacao, 'todos') = 'todos'
          or (p_situacao = 'abertos' and l.status = 'open')
          or (p_situacao = 'ganhos' and l.status = 'won'))
   order by l.created_at desc, l.id desc
   limit least(greatest(coalesce(p_limite, 200), 1), 200)
$$;

-- ── 7. A aba Detalhes ────────────────────────────────────────────────────────
-- A busca: o nome (`padrao`, ilike) ou os dígitos do telefone (`digitos`).
create or replace function public.fn_escale_destinatario_passa(
  r public.campaign_recipients,
  c public.contacts,
  p_filtros jsonb
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce((
        (
          (p_filtros ->> 'padrao' is null and p_filtros ->> 'digitos' is null)
          or (p_filtros ->> 'padrao' is not null
              and (c.name ilike (p_filtros ->> 'padrao') or c.display_name ilike (p_filtros ->> 'padrao')))
          or (p_filtros ->> 'digitos' is not null
              and regexp_replace(coalesce(r.recipient_address, c.phone_number, ''), '\D', '', 'g')
                  like '%' || (p_filtros ->> 'digitos') || '%')
        )
    and (p_filtros -> 'situacoes' is null
         or public.fn_escale_situacao_do_destinatario(r)
            in (select jsonb_array_elements_text(p_filtros -> 'situacoes')))
    and (p_filtros -> 'motivos' is null
         or (r.status = 'failed'
             and coalesce(r.last_error_code, 'sem_codigo')
                 in (select jsonb_array_elements_text(p_filtros -> 'motivos'))))
  ), false)
$$;

create or replace function public.fn_escale_destinatarios_da_campanha(
  p_org uuid,
  p_campanha uuid,
  p_filtros jsonb,
  p_limite integer,
  p_deslocamento integer
)
returns table (
  destinatario_id uuid, contato_id uuid, telefone text, nome text, email text,
  situacao text, motivo text, enviado_em timestamptz, total bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select r.id,
         r.contact_id,
         coalesce(r.recipient_address, c.phone_number),
         coalesce(nullif(btrim(c.name), ''), nullif(btrim(c.display_name), ''), ''),
         c.email,
         public.fn_escale_situacao_do_destinatario(r),
         case
           when r.eligibility_status = 'excluded' then r.exclusion_reason
           when r.status = 'failed' then coalesce(r.last_error_code, 'sem_codigo')
         end,
         r.sent_at,
         count(*) over ()
    from public.campaign_recipients r
    join public.contacts c on c.id = r.contact_id
   where r.organization_id = p_org
     and r.campaign_id = p_campanha
     and public.fn_role_at_least(p_org, 'manager')
     and public.fn_escale_destinatario_passa(r, c, coalesce(p_filtros, '{}'::jsonb))
   order by r.created_at, r.id
   limit least(greatest(coalesce(p_limite, 20), 1), 20000)
  offset greatest(coalesce(p_deslocamento, 0), 0)
$$;

-- ── 8. Quem a ação em massa alcança ──────────────────────────────────────────
-- Os marcados à mão (`p_ids`) ou o filtro inteiro menos os desmarcados.
create or replace function public.fn_escale_selecao_da_campanha(
  p_org uuid,
  p_campanha uuid,
  p_filtros jsonb,
  p_ids uuid[],
  p_excluidos uuid[]
)
returns table (destinatario_id uuid, contato_id uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select r.id, r.contact_id
    from public.campaign_recipients r
    join public.contacts c on c.id = r.contact_id
   where r.organization_id = p_org
     and r.campaign_id = p_campanha
     and public.fn_role_at_least(p_org, 'manager')
     and case
           when p_ids is not null then r.id = any (p_ids)
           else public.fn_escale_destinatario_passa(r, c, coalesce(p_filtros, '{}'::jsonb))
                and not (r.id = any (coalesce(p_excluidos, '{}'::uuid[])))
         end
   order by r.created_at, r.id
   limit 100001
$$;

-- ── 9. Os índices ────────────────────────────────────────────────────────────
create index if not exists idx_campaign_recipients_ordem
  on public.campaign_recipients (campaign_id, created_at, id);

create index if not exists idx_crm_leads_da_campanha
  on public.crm_leads (organization_id, (source_metadata ->> 'campaign_id'))
  where source = 'campanha';

-- ── 10. Quem executa ─────────────────────────────────────────────────────────
revoke all on function public.fn_escale_situacao_do_destinatario(public.campaign_recipients) from public, anon;
revoke all on function public.fn_escale_sumario_da_campanha(uuid, uuid) from public, anon;
revoke all on function public.fn_escale_ritmo_da_campanha(uuid, uuid, text) from public, anon;
revoke all on function public.fn_escale_motivos_do_erro(uuid, uuid) from public, anon;
revoke all on function public.fn_escale_resultado_da_campanha(uuid, uuid) from public, anon;
revoke all on function public.fn_escale_negocios_da_campanha(uuid, uuid, text, integer) from public, anon;
revoke all on function public.fn_escale_destinatario_passa(public.campaign_recipients, public.contacts, jsonb) from public, anon;
revoke all on function public.fn_escale_destinatarios_da_campanha(uuid, uuid, jsonb, integer, integer) from public, anon;
revoke all on function public.fn_escale_selecao_da_campanha(uuid, uuid, jsonb, uuid[], uuid[]) from public, anon;
grant execute on function public.fn_escale_situacao_do_destinatario(public.campaign_recipients) to authenticated, service_role;
grant execute on function public.fn_escale_sumario_da_campanha(uuid, uuid) to authenticated, service_role;
grant execute on function public.fn_escale_ritmo_da_campanha(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.fn_escale_motivos_do_erro(uuid, uuid) to authenticated, service_role;
grant execute on function public.fn_escale_resultado_da_campanha(uuid, uuid) to authenticated, service_role;
grant execute on function public.fn_escale_negocios_da_campanha(uuid, uuid, text, integer) to authenticated, service_role;
grant execute on function public.fn_escale_destinatario_passa(public.campaign_recipients, public.contacts, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_destinatarios_da_campanha(uuid, uuid, jsonb, integer, integer) to authenticated, service_role;
grant execute on function public.fn_escale_selecao_da_campanha(uuid, uuid, jsonb, uuid[], uuid[]) to authenticated, service_role;

comment on function public.fn_escale_sumario_da_campanha(uuid, uuid) is
  'Fork Escale (9310): as contagens do Sumário do detalhe da campanha, pela situação de cada destinatário. Invoker; só gerente ou acima.';
comment on function public.fn_escale_destinatarios_da_campanha(uuid, uuid, jsonb, integer, integer) is
  'Fork Escale (9310): uma página da aba Detalhes (telefone, nome, email, situação, motivo, enviado em) com o filtro compilado e o total. Invoker; só gerente ou acima.';

notify pgrst, 'reload schema';
```

- [ ] **Step 3: O bloco no baseline**

Cole o conteúdo da migration **sem a 1ª linha** logo antes de `-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----` (fica depois do bloco da 9301 e dos da 8B):

```bash
tail -n +2 supabase/migrations/20261120120000_9310_detalhe_da_campanha.sql > "$TEMP/bloco-9310.sql"
node -e '
const fs = require("fs");
const alvo = "-- ---- VARREDURA anon: função nova nasce exposta em quem ATUALIZA (migration 0116) ----";
const base = fs.readFileSync("supabase/baseline.sql", "utf8");
const bloco = fs.readFileSync(process.argv[1], "utf8").trimEnd() + "\n\n";
const i = base.indexOf(alvo);
if (i < 0 || base.includes("(migration 9310) ----")) { console.error("âncora ausente ou bloco já colado"); process.exit(1); }
fs.writeFileSync("supabase/baseline.sql", base.slice(0, i) + bloco + base.slice(i));
' "$TEMP/bloco-9310.sql"
```

- [ ] **Step 4: A prova contra Postgres real (roda na bateria da Frente B)**

`tests/invariants/escale-detalhe-da-campanha-9310.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_CONTACT_1,
  GOV_CONTACT_2,
  GOV_CONTACT_3,
  GOV_CONTACT_PROBE,
  GOV_MANAGER,
  GOV_ORG,
  GOV_PIPELINE,
  GOV_SESSION,
  GOV_STAGE,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
} from "./gov-helpers";

/**
 * DETALHE DA CAMPANHA DA CASCA (fork Escale, migration 9310) — prova contra
 * Postgres real: o sumário pela situação, o ritmo no fuso, os motivos, o
 * resultado (negócios, valores, mediana, benchmark), a gaveta, a página dos
 * Detalhes com busca e filtros, a seleção, e o viewer sem nada. Roda via
 * `pnpm test:db`.
 */
const C1 = "e5ca1e00-9310-4000-8000-0000000000c1";
const C2 = "e5ca1e00-9310-4000-8000-0000000000c2";
const R1 = "e5ca1e00-9310-4000-8000-0000000000d1";
const R2 = "e5ca1e00-9310-4000-8000-0000000000d2";
const R3 = "e5ca1e00-9310-4000-8000-0000000000d3";
const R4 = "e5ca1e00-9310-4000-8000-0000000000d4";
const comoGerente = (q: string) =>
  lastLine(sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${GOV_MANAGER}"}', false); ${q}`));
const destinatarios = (filtros: string) =>
  `select count(*) from public.fn_escale_destinatarios_da_campanha('${GOV_ORG}', '${C1}', '${filtros}'::jsonb, 20, 0)`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_leads where source = 'campanha' and source_metadata ->> 'campaign_id' like 'e5ca1e00-9310-%';
    delete from public.campaigns where id::text like 'e5ca1e00-9310-%';
    insert into public.campaigns (id, organization_id, name, status, channel_session_id, base_legal,
                                  snapshot_total, snapshot_eligible, started_at, completed_at, created_at)
    values ('${C1}', '${GOV_ORG}', 'Detalhe 8C', 'running', '${GOV_SESSION}', 'consent', 4, 3,
            '2026-10-10 15:00:00+00', null, '2026-10-09 15:00:00+00'),
           ('${C2}', '${GOV_ORG}', 'Concluída 8C', 'completed', '${GOV_SESSION}', 'consent', 2, 2,
            '2026-10-01 15:00:00+00', '2026-10-02 15:00:00+00', '2026-10-01 12:00:00+00');
    insert into public.campaign_recipients (id, organization_id, campaign_id, contact_id, recipient_address, status,
                                            eligibility_status, exclusion_reason, last_error_code,
                                            sent_at, delivered_at, read_at, replied_at)
    values ('${R1}', '${GOV_ORG}', '${C1}', '${GOV_CONTACT_1}', '+5511999990001', 'replied', 'eligible', null, null,
            '2026-10-10 15:00:00+00', '2026-10-10 15:01:00+00', '2026-10-10 15:02:00+00', '2026-10-10 15:30:00+00'),
           ('${R2}', '${GOV_ORG}', '${C1}', '${GOV_CONTACT_2}', '+5511999990002', 'read', 'eligible', null, null,
            '2026-10-10 15:10:00+00', '2026-10-10 15:11:00+00', '2026-10-10 15:12:00+00', null),
           ('${R3}', '${GOV_ORG}', '${C1}', '${GOV_CONTACT_3}', '+5511999990003', 'failed', 'eligible', null, '131049',
            null, null, null, null),
           ('${R4}', '${GOV_ORG}', '${C1}', '${GOV_CONTACT_PROBE}', '+5511999990004', 'skipped', 'excluded', 'opt_out', null,
            null, null, null, null);
    insert into public.campaign_recipients (organization_id, campaign_id, contact_id, status, eligibility_status,
                                            sent_at, replied_at)
    values ('${GOV_ORG}', '${C2}', '${GOV_CONTACT_1}', 'replied', 'eligible', '2026-10-01 15:00:00+00', '2026-10-01 16:00:00+00'),
           ('${GOV_ORG}', '${C2}', '${GOV_CONTACT_2}', 'sent', 'eligible', '2026-10-01 15:00:00+00', null);
    insert into public.crm_leads (organization_id, pipeline_id, stage_id, contact_id, title, status, closed_at,
                                  value_cents, source, source_metadata)
    values ('${GOV_ORG}', '${GOV_PIPELINE}', '${GOV_STAGE}', '${GOV_CONTACT_1}', 'Negócio 8C aberto', 'open', null,
            150000, 'campanha', '{"campaign_id":"${C1}"}'),
           ('${GOV_ORG}', '${GOV_PIPELINE}', '${GOV_STAGE}', '${GOV_CONTACT_2}', 'Negócio 8C ganho', 'won', now(),
            50000, 'campanha', '{"campaign_id":"${C1}"}');
  `);
});

describe("travas", () => {
  it("anon não executa; viewer recebe vazio", () => {
    expect(
      lastLine(
        sql(
          `select has_function_privilege('anon', 'public.fn_escale_destinatarios_da_campanha(uuid, uuid, jsonb, integer, integer)', 'execute')`,
        ),
      ),
    ).toBe("f");
    expect(countAs(GOV_VIEWER, destinatarios("{}"))).toBe(0);
  });
});

describe("sumário, ritmo e motivos", () => {
  it("as contagens pela situação", () => {
    expect(
      comoGerente(
        `select concat_ws('|', adicionados, enviados, entregues, lidas, respondidas, leu_sem_resposta, erros, nao_enviados, aguardando, fora_da_lista) from public.fn_escale_sumario_da_campanha('${GOV_ORG}', '${C1}')`,
      ),
    ).toBe("3|2|2|2|1|1|1|0|0|1");
  });

  it("o ritmo por hora no fuso da organização", () => {
    expect(
      comoGerente(
        `select string_agg(to_char(hora, 'YYYY-MM-DD HH24:MI') || '=' || envios, ',') from public.fn_escale_ritmo_da_campanha('${GOV_ORG}', '${C1}', 'America/Sao_Paulo')`,
      ),
    ).toBe("2026-10-10 12:00=2");
  });

  it("os motivos do erro", () => {
    expect(
      comoGerente(
        `select string_agg(codigo || '=' || quantidade, ',') from public.fn_escale_motivos_do_erro('${GOV_ORG}', '${C1}')`,
      ),
    ).toBe("131049=1");
  });
});

describe("resultado e gaveta", () => {
  it("negócios, valores, mediana, benchmark e a taxa desta", () => {
    expect(
      comoGerente(
        `select concat_ws('|', negocios, valor_aberto_centavos, valor_ganho_centavos, round(mediana_segundos), round(benchmark, 2), round(taxa_da_campanha, 2)) from public.fn_escale_resultado_da_campanha('${GOV_ORG}', '${C1}')`,
      ),
    ).toBe("2|150000|50000|1800|0.50|0.50");
  });

  it("a gaveta filtra abertos e ganhos", () => {
    const n = (situacao: string) =>
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_negocios_da_campanha('${GOV_ORG}', '${C1}', '${situacao}', 200)`,
      );
    expect(n("todos")).toBe(2);
    expect(n("abertos")).toBe(1);
    expect(n("ganhos")).toBe(1);
  });
});

describe("Detalhes e seleção", () => {
  it("a página traz todos, com a situação e o motivo", () => {
    expect(countAs(GOV_MANAGER, destinatarios("{}"))).toBe(4);
    expect(
      comoGerente(
        `select string_agg(situacao || ':' || coalesce(motivo, '-'), ',' order by destinatario_id) from public.fn_escale_destinatarios_da_campanha('${GOV_ORG}', '${C1}', '{}'::jsonb, 20, 0)`,
      ),
    ).toBe("respondido:-,lida:-,erro:131049,fora_da_lista:opt_out");
  });

  it("filtros: situações, motivo e os dígitos do telefone", () => {
    expect(countAs(GOV_MANAGER, destinatarios(`{"situacoes":["lida","respondido"]}`))).toBe(2);
    expect(countAs(GOV_MANAGER, destinatarios(`{"motivos":["131049"]}`))).toBe(1);
    expect(countAs(GOV_MANAGER, destinatarios(`{"digitos":"9990002"}`))).toBe(1);
  });

  it("a seleção: os marcados, ou o filtro menos os desmarcados", () => {
    const sel = (filtros: string, ids: string, excluidos: string) =>
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_selecao_da_campanha('${GOV_ORG}', '${C1}', '${filtros}'::jsonb, ${ids}, ${excluidos})`,
      );
    expect(sel("{}", `array['${R1}']::uuid[]`, "null")).toBe(1);
    expect(sel(`{"situacoes":["lida","respondido"]}`, "null", `array['${R1}']::uuid[]`)).toBe(1);
  });
});
```

- [ ] **Step 5: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-migration.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/manifest-cita-caminho-que-existe.test.ts $(ls tests/unit/*.test.ts | grep -E "definer|hardening|varredura-anon") && bash scripts/checar-colisao-de-migration.sh escale-crm/main`
Expected: PASS; a colisão sem achado. O `tests/invariants/escale-detalhe-da-campanha-9310.test.ts` **não** roda agora (bateria).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261120120000_9310_detalhe_da_campanha.sql supabase/baseline.sql tests/unit/escale-detalhe-da-campanha-migration.test.ts tests/invariants/escale-detalhe-da-campanha-9310.test.ts
git commit -m "feat(escale): migration 9310 — as funções do detalhe da campanha e os índices (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 3: As rotas de leitura (sumário, destinatários e negócios)

**Files:**
- Create: `lib/escale/campanhas/detalhe/banco.ts`, `app/api/v1/campanhas-da-casca/[id]/sumario/route.ts`, `app/api/v1/campanhas-da-casca/[id]/destinatarios/route.ts`, `app/api/v1/campanhas-da-casca/[id]/negocios/route.ts`, `tests/unit/escale-detalhe-da-campanha-rotas.test.ts`

**Interfaces:**
- Consumes: os tipos e `modeloDaCampanha`, `compilarFiltrosDeDestinatarios`, `filtrosDeDestinatariosDoTexto`, `POR_PAGINA_DOS_DESTINATARIOS`, `POR_PAGINA_PADRAO_DOS_DESTINATARIOS` (Task 1); as funções da 9310 (Task 2); `lerPoolExtra` (`lib/campanhas/pool-de-numeros.ts`); `fusoDaOrganizacao` (`lib/escale/contatos/lista.ts`).
- Produces: `ehIdDeCampanha(id)`, `infoDaLinha(l, extras)`, `lerDetalheDaCampanha(supabase, admin, orgId, id, fuso) → DadosDoDetalhe | null`, `lerDestinatarios(supabase, orgId, id, filtro, pagina, porPagina) → PaginaDeDestinatarios`, `lerNegocios(supabase, orgId, id, situacao) → NegociosDaCampanha`, `LIMITE_DA_GAVETA` (200); `GET /api/v1/campanhas-da-casca/[id]/sumario` → `{ data: DadosDoDetalhe }`; `GET …/destinatarios?p=&n=&f=` → `{ data: PaginaDeDestinatarios }`; `GET …/negocios?situacao=` → `{ data: NegociosDaCampanha }`.

- [ ] **Step 1: O teste das rotas (falha)**

`tests/unit/escale-detalhe-da-campanha-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as GET_DESTINATARIOS } from "@/app/api/v1/campanhas-da-casca/[id]/destinatarios/route";
import { GET as GET_NEGOCIOS } from "@/app/api/v1/campanhas-da-casca/[id]/negocios/route";
import { GET as GET_SUMARIO } from "@/app/api/v1/campanhas-da-casca/[id]/sumario/route";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/campanhas/pool-de-numeros", () => ({ lerPoolExtra: vi.fn(async () => ["e5ca1e00-8c00-4000-8000-00000000e001"]) }));

type Resposta = { data: unknown; error: { message: string } | null };

const ID = "e5ca1e00-8c00-4000-8000-0000000000c1";
const NUMERO = "0d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const LINHA = {
  id: ID,
  name: "10.09",
  status: "completed",
  channel_session_id: NUMERO,
  message_body: "Oi, {{primeiro_nome}}!",
  base_legal: "consent",
  lia_ref: null,
  intervalo_segundos: 30,
  teto_diario: null,
  teto_horario: null,
  janela_inicio_hora: null,
  janela_fim_hora: null,
  started_at: "2026-09-10T15:39:00Z",
  scheduled_at: null,
  created_at: "2026-09-10T12:00:00Z",
  template_name: "msg1_ancca",
  template_language: "pt_BR",
  template_category: "MARKETING",
};

function banco({ campanha = LINHA, rpc = {} }: { campanha?: unknown; rpc?: Record<string, Resposta> } = {}) {
  const db = {
    rpc: vi.fn((nome: string) => Promise.resolve(rpc[nome] ?? { data: [], error: null })),
    from: vi.fn((tabela: string) => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
      c.maybeSingle = vi
        .fn()
        .mockResolvedValue(
          tabela === "organizations"
            ? { data: { timezone: "America/Sao_Paulo" }, error: null }
            : { data: campanha, error: null },
        );
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

const pedido = (url: string) => new NextRequest(new URL(url, "http://x"));
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) });
const f = (filtros: unknown) => encodeURIComponent(JSON.stringify(filtros));

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
});

describe("GET /api/v1/campanhas-da-casca/[id]/sumario", () => {
  it("exige gerente; junta a campanha, o sumário, o ritmo, os motivos, o resultado e o fuso", async () => {
    authOk("manager");
    const db = banco({
      rpc: {
        fn_escale_sumario_da_campanha: {
          data: [
            {
              adicionados: 30, enviados: 26, entregues: 23, lidas: 16, respondidas: 10,
              leu_sem_resposta: 6, erros: 4, nao_enviados: 0, aguardando: 0, fora_da_lista: 2,
            },
          ],
          error: null,
        },
        fn_escale_ritmo_da_campanha: { data: [{ hora: "2026-09-10T12:00:00", envios: "30" }], error: null },
        fn_escale_motivos_do_erro: { data: [{ codigo: "131049", quantidade: 2 }], error: null },
        fn_escale_resultado_da_campanha: {
          data: [
            {
              negocios: 8, valor_aberto_centavos: "1468092", valor_ganho_centavos: "0",
              mediana_segundos: null, benchmark: "0.43", taxa_da_campanha: "0.3333",
            },
          ],
          error: null,
        },
      },
    });
    const r = await GET_SUMARIO(pedido(`/api/v1/campanhas-da-casca/${ID}/sumario`), ctx());
    expect(r.status).toBe(200);
    expect(vi.mocked(requireRole)).toHaveBeenCalledWith("manager", expect.anything());
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_ritmo_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_fuso: "America/Sao_Paulo",
    });
    const { data } = await r.json();
    expect(data.fuso).toBe("America/Sao_Paulo");
    expect(data.campanha).toEqual({
      id: ID,
      nome: "10.09",
      status: "completed",
      numeroId: NUMERO,
      numerosExtras: ["e5ca1e00-8c00-4000-8000-00000000e001"],
      mensagem: "Oi, {{primeiro_nome}}!",
      modelo: { nome: "msg1_ancca", idioma: "pt_BR", categoria: "MARKETING" },
      baseLegal: "consent",
      liaRef: null,
      ritmo: { intervaloSegundos: 30, tetoDiario: null, tetoHorario: null, janelaInicioHora: null, janelaFimHora: null },
      iniciadaEm: "2026-09-10T15:39:00Z",
      agendadaPara: null,
      criadaEm: "2026-09-10T12:00:00Z",
    });
    expect(data.sumario).toMatchObject({ adicionados: 30, leuSemResposta: 6, foraDaLista: 2 });
    expect(data.ritmo).toEqual([{ hora: "2026-09-10T12:00:00", envios: 30 }]);
    expect(data.motivos).toEqual([{ codigo: "131049", quantidade: 2 }]);
    expect(data.resultado).toEqual({
      negocios: 8,
      valorAbertoCentavos: 1_468_092,
      valorGanhoCentavos: 0,
      medianaSegundos: null,
      benchmark: 0.43,
      taxaDaCampanha: 0.3333,
    });
  });

  it("campanha que não existe (ou de outra organização) e id inválido são 404", async () => {
    authOk("manager");
    banco({ campanha: null });
    const r = await GET_SUMARIO(pedido(`/api/v1/campanhas-da-casca/${ID}/sumario`), ctx());
    expect(r.status).toBe(404);
    expect((await r.json()).error.message).toBe("Campanha não encontrada.");
    expect((await GET_SUMARIO(pedido("/x"), ctx("xyz"))).status).toBe(404);
  });

  it("erro do banco é 500", async () => {
    authOk("manager");
    banco({ rpc: { fn_escale_sumario_da_campanha: { data: null, error: { message: "boom" } } } });
    expect((await GET_SUMARIO(pedido("/x"), ctx())).status).toBe(500);
  });
});

describe("GET /api/v1/campanhas-da-casca/[id]/destinatarios", () => {
  it("compila o filtro, pagina de 20 e dá nome às colunas", async () => {
    authOk("manager");
    const db = banco({
      rpc: {
        fn_escale_destinatarios_da_campanha: {
          data: [
            {
              destinatario_id: "r1", contato_id: "k1", telefone: "+5553984555965", nome: "Elza Maria", email: null,
              situacao: "lida", motivo: null, enviado_em: "2026-09-10T15:40:00Z", total: "30",
            },
          ],
          error: null,
        },
      },
    });
    const r = await GET_DESTINATARIOS(
      pedido(`/x?p=2&n=20&f=${f({ busca: "Elza", situacoes: ["lida"] })}`),
      ctx(),
    );
    expect(r.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_destinatarios_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_filtros: { padrao: "%Elza%", situacoes: ["lida"] },
      p_limite: 20,
      p_deslocamento: 20,
    });
    const { data } = await r.json();
    expect(data).toEqual({
      linhas: [
        {
          id: "r1", contatoId: "k1", telefone: "+5553984555965", nome: "Elza Maria", email: null,
          situacao: "lida", motivo: null, enviadoEm: "2026-09-10T15:40:00Z",
        },
      ],
      total: 30,
      pagina: 2,
      porPagina: 20,
    });
  });

  it("'por página' fora da lista e filtro ruim são 422", async () => {
    authOk("manager");
    banco();
    expect((await GET_DESTINATARIOS(pedido("/x?n=7"), ctx())).status).toBe(422);
    expect((await GET_DESTINATARIOS(pedido(`/x?f=${f({ situacoes: ["xyz"] })}`), ctx())).status).toBe(422);
  });
});

describe("GET /api/v1/campanhas-da-casca/[id]/negocios", () => {
  it("a situação da gaveta e até 200", async () => {
    authOk("manager");
    const db = banco({
      rpc: {
        fn_escale_negocios_da_campanha: {
          data: [
            {
              lead_id: "l1", contato: "Elza", telefone: "+5553984555965", origem: "Vendas", status: "won",
              valor_centavos: "150000", criado_em: "2026-09-11T12:00:00Z", total: "1",
            },
          ],
          error: null,
        },
      },
    });
    const r = await GET_NEGOCIOS(pedido("/x?situacao=ganhos"), ctx());
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_negocios_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_situacao: "ganhos",
      p_limite: 200,
    });
    expect((await r.json()).data).toEqual({
      linhas: [
        {
          id: "l1", contato: "Elza", telefone: "+5553984555965", origem: "Vendas", status: "won",
          valorCentavos: 150000, criadoEm: "2026-09-11T12:00:00Z",
        },
      ],
      total: 1,
    });
  });

  it("situação desconhecida é 422", async () => {
    authOk("manager");
    banco();
    expect((await GET_NEGOCIOS(pedido("/x?situacao=perdidos"), ctx())).status).toBe(422);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-rotas.test.ts`
Expected: FAIL (as rotas não existem).

- [ ] **Step 2: `lib/escale/campanhas/detalhe/banco.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { lerPoolExtra } from "@/lib/campanhas/pool-de-numeros";
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";

import type { FiltroDeDestinatariosCompilado } from "./filtros";
import { modeloDaCampanha } from "./mensagem";
import type {
  DadosDoDetalhe,
  InfoDaCampanha,
  LinhaDeDestinatario,
  NegociosDaCampanha,
  PaginaDeDestinatarios,
  SituacaoDoDestinatario,
  SituacaoDosNegocios,
} from "./tipos";

/**
 * A LEITURA DO DETALHE DA CAMPANHA (fork Escale, Fase 8C) — servidor. As
 * funções da 9310 (invoker) contam com a sessão de quem olha; aqui só se dá
 * nome às colunas. `bigint` e `numeric` chegam como texto pelo PostgREST.
 *
 * A campanha é lida com `select("*")` de propósito: a 8B acrescenta as colunas
 * do modelo da Meta, e `modeloDaCampanha` as lê sem quebrar quando ainda não
 * existem (lista fechada de colunas viraria erro de coluna desconhecida).
 */
type Numero = number | string | null | undefined;

const numero = (v: Numero): number => Number(v ?? 0);
const numeroOuNulo = (v: Numero): number | null => (v === null || v === undefined ? null : Number(v));
const textoOuNulo = (v: unknown): string | null => (typeof v === "string" ? v : null);

export const LIMITE_DA_GAVETA = 200;

export const ehIdDeCampanha = (id: string): boolean => z.string().uuid().safeParse(id).success;

async function chamar<T>(supabase: SupabaseClient, nome: string, args: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.rpc(nome, args);
  if (error) throw new Error(error.message);
  if (Array.isArray(data)) return data as T[];
  return data ? [data as T] : [];
}

export function infoDaLinha(l: Readonly<Record<string, unknown>>, numerosExtras: string[]): InfoDaCampanha {
  return {
    id: String(l.id),
    nome: String(l.name ?? ""),
    status: l.status as StatusDaCampanha,
    numeroId: String(l.channel_session_id ?? ""),
    numerosExtras,
    mensagem: textoOuNulo(l.message_body),
    modelo: modeloDaCampanha(l),
    baseLegal: String(l.base_legal ?? ""),
    liaRef: textoOuNulo(l.lia_ref),
    ritmo: {
      intervaloSegundos: numeroOuNulo(l.intervalo_segundos as Numero),
      tetoDiario: numeroOuNulo(l.teto_diario as Numero),
      tetoHorario: numeroOuNulo(l.teto_horario as Numero),
      janelaInicioHora: numeroOuNulo(l.janela_inicio_hora as Numero),
      janelaFimHora: numeroOuNulo(l.janela_fim_hora as Numero),
    },
    iniciadaEm: textoOuNulo(l.started_at),
    agendadaPara: textoOuNulo(l.scheduled_at),
    criadaEm: String(l.created_at ?? ""),
  };
}

type LinhaDoSumario = Record<
  | "adicionados"
  | "enviados"
  | "entregues"
  | "lidas"
  | "respondidas"
  | "leu_sem_resposta"
  | "erros"
  | "nao_enviados"
  | "aguardando"
  | "fora_da_lista",
  Numero
>;

type LinhaDoResultado = Record<
  | "negocios"
  | "valor_aberto_centavos"
  | "valor_ganho_centavos"
  | "mediana_segundos"
  | "benchmark"
  | "taxa_da_campanha",
  Numero
>;

export async function lerDetalheDaCampanha(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  orgId: string,
  id: string,
  fuso: string,
): Promise<DadosDoDetalhe | null> {
  const { data: linha, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!linha) return null;

  const base = { p_org: orgId, p_campanha: id };
  const [sumario, ritmo, motivos, resultado, extras] = await Promise.all([
    chamar<LinhaDoSumario>(supabase, "fn_escale_sumario_da_campanha", base),
    chamar<{ hora: string; envios: Numero }>(supabase, "fn_escale_ritmo_da_campanha", { ...base, p_fuso: fuso }),
    chamar<{ codigo: string | null; quantidade: Numero }>(supabase, "fn_escale_motivos_do_erro", base),
    chamar<LinhaDoResultado>(supabase, "fn_escale_resultado_da_campanha", base),
    lerPoolExtra(admin, orgId, id),
  ]);
  const s = sumario[0];
  const r = resultado[0];
  return {
    campanha: infoDaLinha(linha as Record<string, unknown>, extras),
    sumario: {
      adicionados: numero(s?.adicionados),
      enviados: numero(s?.enviados),
      entregues: numero(s?.entregues),
      lidas: numero(s?.lidas),
      respondidas: numero(s?.respondidas),
      leuSemResposta: numero(s?.leu_sem_resposta),
      erros: numero(s?.erros),
      naoEnviados: numero(s?.nao_enviados),
      aguardando: numero(s?.aguardando),
      foraDaLista: numero(s?.fora_da_lista),
    },
    ritmo: ritmo.map((p) => ({ hora: p.hora, envios: numero(p.envios) })),
    motivos: motivos.map((m) => ({ codigo: m.codigo, quantidade: numero(m.quantidade) })),
    resultado: {
      negocios: numero(r?.negocios),
      valorAbertoCentavos: numero(r?.valor_aberto_centavos),
      valorGanhoCentavos: numero(r?.valor_ganho_centavos),
      medianaSegundos: numeroOuNulo(r?.mediana_segundos),
      benchmark: numeroOuNulo(r?.benchmark),
      taxaDaCampanha: numeroOuNulo(r?.taxa_da_campanha),
    },
    fuso,
  };
}

type LinhaDaPagina = {
  destinatario_id: string;
  contato_id: string;
  telefone: string | null;
  nome: string | null;
  email: string | null;
  situacao: string;
  motivo: string | null;
  enviado_em: string | null;
  total: Numero;
};

export async function lerDestinatarios(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
  filtro: FiltroDeDestinatariosCompilado,
  pagina: number,
  porPagina: number,
): Promise<PaginaDeDestinatarios> {
  const linhas = await chamar<LinhaDaPagina>(supabase, "fn_escale_destinatarios_da_campanha", {
    p_org: orgId,
    p_campanha: id,
    p_filtros: filtro,
    p_limite: porPagina,
    p_deslocamento: (pagina - 1) * porPagina,
  });
  return {
    linhas: linhas.map(
      (l): LinhaDeDestinatario => ({
        id: l.destinatario_id,
        contatoId: l.contato_id,
        telefone: l.telefone,
        nome: l.nome ?? "",
        email: l.email,
        situacao: l.situacao as SituacaoDoDestinatario,
        motivo: l.motivo,
        enviadoEm: l.enviado_em,
      }),
    ),
    total: numero(linhas[0]?.total),
    pagina,
    porPagina,
  };
}

type LinhaDoNegocio = {
  lead_id: string;
  contato: string | null;
  telefone: string | null;
  origem: string | null;
  status: "open" | "won" | "lost";
  valor_centavos: Numero;
  criado_em: string;
  total: Numero;
};

export async function lerNegocios(
  supabase: SupabaseClient,
  orgId: string,
  id: string,
  situacao: SituacaoDosNegocios,
): Promise<NegociosDaCampanha> {
  const linhas = await chamar<LinhaDoNegocio>(supabase, "fn_escale_negocios_da_campanha", {
    p_org: orgId,
    p_campanha: id,
    p_situacao: situacao,
    p_limite: LIMITE_DA_GAVETA,
  });
  return {
    linhas: linhas.map((l) => ({
      id: l.lead_id,
      contato: l.contato ?? "",
      telefone: l.telefone,
      origem: l.origem ?? "",
      status: l.status,
      valorCentavos: numeroOuNulo(l.valor_centavos),
      criadoEm: l.criado_em,
    })),
    total: numero(linhas[0]?.total),
  };
}
```

- [ ] **Step 3: `app/api/v1/campanhas-da-casca/[id]/sumario/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { ehIdDeCampanha, lerDetalheDaCampanha } from "@/lib/escale/campanhas/detalhe/banco";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { traduzir } from "@/lib/i18n/dicionario";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/campanhas-da-casca/:id/sumario — a aba Sumário e a coluna da
 * mensagem do detalhe da casca (fork Escale, Fase 8C). Gerente; a sessão de
 * quem olha (a 9310 é invoker); o pool de números pelo client admin, como o
 * GET do original.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  const naoAchou = () => fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  if (!ehIdDeCampanha(id)) return naoAchou();
  try {
    const supabase = await createClient();
    const fuso = await fusoDaOrganizacao(supabase, authz.org.orgId);
    const dados = await lerDetalheDaCampanha(supabase, createAdminClient(), authz.org.orgId, id, fuso);
    return dados ? ok(dados, { requestId }) : naoAchou();
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 4: `app/api/v1/campanhas-da-casca/[id]/destinatarios/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import {
  POR_PAGINA_DOS_DESTINATARIOS,
  POR_PAGINA_PADRAO_DOS_DESTINATARIOS,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import { ehIdDeCampanha, lerDestinatarios } from "@/lib/escale/campanhas/detalhe/banco";
import {
  compilarFiltrosDeDestinatarios,
  filtrosDeDestinatariosDoTexto,
} from "@/lib/escale/campanhas/detalhe/filtros";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const consultaSchema = z.object({
  p: z.coerce.number().int().min(1).max(100_000).default(1),
  n: z.coerce
    .number()
    .int()
    .refine((n) => (POR_PAGINA_DOS_DESTINATARIOS as readonly number[]).includes(n))
    .default(POR_PAGINA_PADRAO_DOS_DESTINATARIOS),
  f: z.string().max(4096).optional(),
});

/** GET /api/v1/campanhas-da-casca/:id/destinatarios — a aba Detalhes (Fase 8C, N9). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!ehIdDeCampanha(id)) return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  const lida = consultaSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!lida.success) return fail("validation_failed", t("Query inválida."), 422, { requestId });
  const filtros = filtrosDeDestinatariosDoTexto(lida.data.f);
  if (filtros === null) return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
  try {
    const supabase = await createClient();
    const pagina = await lerDestinatarios(
      supabase,
      authz.org.orgId,
      id,
      compilarFiltrosDeDestinatarios(filtros),
      lida.data.p,
      lida.data.n,
    );
    return ok(pagina, { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 5: `app/api/v1/campanhas-da-casca/[id]/negocios/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { ehIdDeCampanha, lerNegocios } from "@/lib/escale/campanhas/detalhe/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const situacaoSchema = z.enum(["todos", "abertos", "ganhos"]).default("todos");

/** GET /api/v1/campanhas-da-casca/:id/negocios — a gaveta "Negócios criados" (Fase 8C, N5). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!ehIdDeCampanha(id)) return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  const situacao = situacaoSchema.safeParse(req.nextUrl.searchParams.get("situacao") ?? undefined);
  if (!situacao.success) return fail("validation_failed", t("Query inválida."), 422, { requestId });
  try {
    const supabase = await createClient();
    return ok(await lerNegocios(supabase, authz.org.orgId, id, situacao.data), { requestId });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 6: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-rotas.test.ts && corepack pnpm prettier --write lib/escale/campanhas/detalhe/banco.ts "app/api/v1/campanhas-da-casca/[id]/sumario" "app/api/v1/campanhas-da-casca/[id]/destinatarios" "app/api/v1/campanhas-da-casca/[id]/negocios" tests/unit/escale-detalhe-da-campanha-rotas.test.ts && corepack pnpm eslint lib/escale/campanhas/detalhe "app/api/v1/campanhas-da-casca" && corepack pnpm typecheck`
Expected: PASS. Pastas estáticas (`sumario`, `destinatarios`, `negocios`) ganham da dinâmica `[acao]` da 8A no Next; se o build reclamar de rota ambígua, confira que `[acao]` só exporta `POST`.

- [ ] **Step 7: Commit**

```bash
git add lib/escale/campanhas/detalhe/banco.ts "app/api/v1/campanhas-da-casca/[id]/sumario" "app/api/v1/campanhas-da-casca/[id]/destinatarios" "app/api/v1/campanhas-da-casca/[id]/negocios" tests/unit/escale-detalhe-da-campanha-rotas.test.ts
git commit -m "feat(escale): rotas do sumário, dos destinatários e dos negócios da campanha (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 4: "Baixar .CSV"

**Files:**
- Create: `lib/escale/campanhas/detalhe/csv.ts`, `app/api/v1/campanhas-da-casca/[id]/csv/route.ts`, `tests/unit/escale-detalhe-da-campanha-csv.test.ts`
- Modify: `lib/audit/actions.ts`

**Interfaces:**
- Consumes: `lerDestinatarios`, `ehIdDeCampanha` (Task 3); `ROTULO_DA_SITUACAO` (Task 1); `textoDoMotivoDaLinha` (Task 1); `celula` (`lib/escale/exportar/csv-do-quadro.ts`); `formatarTelefone` (`lib/escale/contatos/regras.ts`); `dataEHoraBr`, `dataBr` (8A).
- Produces: `TETO_DO_CSV` (20.000), `CABECALHO_DO_CSV_DA_CAMPANHA`, `csvDaCampanha(linhas, t, fuso?)`, `nomeDoCsvDaCampanha(nome, agora, fuso?)`; `GET /api/v1/campanhas-da-casca/[id]/csv` → `text/csv` (sem BOM: o navegador põe, `baixarCsv`); as ações de auditoria `campaign.exported` e `campaign.recipients_removed` (a segunda é usada na Task 5).

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-detalhe-da-campanha-csv.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/v1/campanhas-da-casca/[id]/csv/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { csvDaCampanha, nomeDoCsvDaCampanha } from "@/lib/escale/campanhas/detalhe/csv";
import type { LinhaDeDestinatario } from "@/lib/escale/campanhas/detalhe/tipos";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

const t = (s: string) => s;
const SP = "America/Sao_Paulo";
const ID = "e5ca1e00-8c00-4000-8000-0000000000c1";
const LINHAS: LinhaDeDestinatario[] = [
  {
    id: "r1", contatoId: "k1", telefone: "+5553984555965", nome: "Elza Maria", email: null,
    situacao: "lida", motivo: null, enviadoEm: "2026-09-10T15:40:00Z",
  },
  {
    id: "r2", contatoId: "k2", telefone: "+5551992241821", nome: "=HYPERLINK(1)", email: "a@b.com",
    situacao: "erro", motivo: "131049", enviadoEm: null,
  },
];

describe("o CSV da campanha", () => {
  it("cabeçalho, telefone formatado, status, motivo, data BR e a guarda de fórmula", () => {
    expect(csvDaCampanha(LINHAS, t, SP).split("\r\n")).toEqual([
      "Telefone,Nome,Email,Status,Motivo,Enviado em",
      "(53) 98455-5965,Elza Maria,,Lido,,10/09/2026 12:40",
      "(51) 99224-1821,'=HYPERLINK(1),a@b.com,Erro,Meta optou por não entregar,",
    ]);
  });

  it("o nome do arquivo, sem acento, com o dia no fuso", () => {
    expect(nomeDoCsvDaCampanha("Reativação de Junho!", new Date("2026-10-19T02:00:00Z"), SP)).toBe(
      "campanha-reativacao-de-junho-2026-10-18.csv",
    );
    expect(nomeDoCsvDaCampanha("!!!", new Date("2026-10-19T12:00:00Z"), SP)).toBe("campanha-campanha-2026-10-19.csv");
  });
});

function banco(campanha: unknown, linhas: unknown[]) {
  const db = {
    rpc: vi.fn(() => Promise.resolve({ data: linhas, error: null })),
    from: vi.fn((tabela: string) => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
      c.maybeSingle = vi
        .fn()
        .mockResolvedValue(
          tabela === "organizations" ? { data: { timezone: SP }, error: null } : { data: campanha, error: null },
        );
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(audit).mockReset();
});

describe("GET /api/v1/campanhas-da-casca/[id]/csv", () => {
  it("baixa a campanha inteira (até 20.000), com o nome do arquivo, e audita", async () => {
    authOk("manager");
    const db = banco({ id: ID, name: "10.09" }, [
      {
        destinatario_id: "r1", contato_id: "k1", telefone: "+5553984555965", nome: "Elza Maria", email: null,
        situacao: "lida", motivo: null, enviado_em: "2026-09-10T15:40:00Z", total: "1",
      },
    ]);
    const r = await GET(new NextRequest(new URL("http://x/csv")), { params: Promise.resolve({ id: ID }) });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/csv");
    expect(r.headers.get("content-disposition")).toMatch(/attachment; filename="campanha-10-09-\d{4}-\d{2}-\d{2}\.csv"/);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_destinatarios_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_filtros: {},
      p_limite: 20_000,
      p_deslocamento: 0,
    });
    expect((await r.text()).split("\r\n")[1]).toBe("(53) 98455-5965,Elza Maria,,Lido,,10/09/2026 12:40");
    expect(vi.mocked(audit)).toHaveBeenCalledWith(
      expect.objectContaining({ action: "campaign.exported", resourceId: ID, metadata: { linhas: 1, parcial: false } }),
    );
  });

  it("campanha que não existe é 404", async () => {
    authOk("manager");
    banco(null, []);
    const r = await GET(new NextRequest(new URL("http://x/csv")), { params: Promise.resolve({ id: ID }) });
    expect(r.status).toBe(404);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-csv.test.ts`
Expected: FAIL (os módulos não existem).

- [ ] **Step 2: `lib/escale/campanhas/detalhe/csv.ts`**

```ts
import { dataBr, dataEHoraBr, type Traduzir } from "@/lib/escale/campanhas/apresentacao";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { celula } from "@/lib/escale/exportar/csv-do-quadro";

import { ROTULO_DA_SITUACAO } from "./apresentacao";
import { textoDoMotivoDaLinha } from "./motivos";
import type { LinhaDeDestinatario } from "./tipos";

/**
 * O "BAIXAR .CSV" DO DETALHE (fork Escale, Fase 8C; N14). As colunas da aba
 * Detalhes, com o motivo e a data no formato brasileiro; `celula` guarda a
 * injeção de fórmula. O BOM entra no navegador (`baixarCsv`).
 */
export const TETO_DO_CSV = 20_000;

export const CABECALHO_DO_CSV_DA_CAMPANHA = ["Telefone", "Nome", "Email", "Status", "Motivo", "Enviado em"] as const;

export function csvDaCampanha(linhas: readonly LinhaDeDestinatario[], t: Traduzir, fuso?: string): string {
  const cabecalho = CABECALHO_DO_CSV_DA_CAMPANHA.map((c) => t(c));
  const corpo = linhas.map((l) => [
    formatarTelefone(l.telefone),
    l.nome,
    l.email ?? "",
    t(ROTULO_DA_SITUACAO[l.situacao]),
    textoDoMotivoDaLinha(l.situacao, l.motivo, t) ?? "",
    l.enviadoEm ? dataEHoraBr(l.enviadoEm, fuso) : "",
  ]);
  return [cabecalho, ...corpo].map((linha) => linha.map(celula).join(",")).join("\r\n");
}

/** "campanha-reativacao-de-junho-2026-10-18.csv", com o dia no fuso da organização. */
export function nomeDoCsvDaCampanha(nome: string, agora: Date, fuso?: string): string {
  const slug =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "campanha";
  const [dia, mes, ano] = dataBr(agora.toISOString(), fuso).split("/");
  return `campanha-${slug}-${ano}-${mes}-${dia}.csv`;
}
```

- [ ] **Step 3: `app/api/v1/campanhas-da-casca/[id]/csv/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { ehIdDeCampanha, lerDestinatarios } from "@/lib/escale/campanhas/detalhe/banco";
import { TETO_DO_CSV, csvDaCampanha, nomeDoCsvDaCampanha } from "@/lib/escale/campanhas/detalhe/csv";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/campanhas-da-casca/:id/csv — o "Baixar .CSV" do detalhe (fork
 * Escale, Fase 8C; N14). Gerente; a campanha inteira, até 20.000 linhas, na
 * hora (a Clint gera em segundo plano; pergunta Q1 do plano). Auditado.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  const naoAchou = () => fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });
  if (!ehIdDeCampanha(id)) return naoAchou();
  try {
    const supabase = await createClient();
    const { data: campanha } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("organization_id", authz.org.orgId)
      .eq("id", id)
      .maybeSingle();
    if (!campanha) return naoAchou();
    const fuso = await fusoDaOrganizacao(supabase, authz.org.orgId);
    const pagina = await lerDestinatarios(supabase, authz.org.orgId, id, {}, 1, TETO_DO_CSV);
    void audit({
      action: "campaign.exported",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "campaigns",
      resourceId: id,
      requestId,
      metadata: { linhas: pagina.linhas.length, parcial: pagina.total > pagina.linhas.length },
    });
    const nome = nomeDoCsvDaCampanha((campanha as { name: string }).name, new Date(), fuso);
    return new Response(csvDaCampanha(pagina.linhas, t, fuso), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${nome}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 4: As ações de auditoria**

Em `lib/audit/actions.ts`, logo depois das três ações da 8A (`"campaign.draft_deleted"`), acrescente:

```ts
  // FORK ESCALE · Fase 8C: o detalhe da campanha da casca (migration 9310).
  "campaign.exported",
  "campaign.recipients_removed",
```

- [ ] **Step 5: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-csv.test.ts $(ls tests/unit/*.test.ts | grep -E "audit") && corepack pnpm prettier --write lib/escale/campanhas/detalhe/csv.ts "app/api/v1/campanhas-da-casca/[id]/csv" tests/unit/escale-detalhe-da-campanha-csv.test.ts && corepack pnpm eslint lib/escale/campanhas/detalhe "app/api/v1/campanhas-da-casca" lib/audit/actions.ts && corepack pnpm typecheck`
Expected: PASS. Se um teste de auditoria listar as ações conhecidas (snapshot de `AUDIT_ACTIONS`), acrescente as duas nele.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/campanhas/detalhe/csv.ts "app/api/v1/campanhas-da-casca/[id]/csv" lib/audit/actions.ts tests/unit/escale-detalhe-da-campanha-csv.test.ts
git commit -m "feat(escale): Baixar .CSV do detalhe da campanha, auditado (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 5: As ações em massa dos Detalhes

**Files:**
- Create: `lib/escale/campanhas/detalhe/massa.ts`, `lib/escale/campanhas/detalhe/acoes.ts`, `app/api/v1/campanhas-da-casca/[id]/massa/route.ts`, `tests/unit/escale-detalhe-da-campanha-acoes.test.ts`, `tests/unit/escale-detalhe-da-campanha-massa.test.ts`

**Interfaces:**
- Consumes: `podeTirarDaLista` (Task 1); `filtrosDeDestinatariosDoTexto`, `compilarFiltrosDeDestinatarios`, `textoDosFiltrosDeDestinatarios`, `FiltrosDeDestinatarios` (Task 1); `ehIdDeCampanha` (Task 3); `fn_escale_selecao_da_campanha` (Task 2); `fn_escale_criar_acao_em_massa` (9103); `carregarCampanha`, `duplicarAcao`, `Desfecho` (`lib/campanhas/acoes.ts`); `FILTRO_VAZIO` (`lib/campanhas/audiencia.ts`); `IDS_MAX`, `Selecao` (`lib/escale/contatos/selecao.ts`); as ações de auditoria da Task 4.
- Produces: `alvoDaCampanhaSchema`, `AlvoDaCampanha`, `pedidoDaCampanhaSchema`, `PedidoDaCampanha`, `RespostaDaMassa`, `alvoDaSelecaoDaCampanha(selecao, filtros)`; `TETO_DA_NOVA_CAMPANHA` (5.000), `TETO_DE_FORA_DA_LISTA` (5.000), `audienciaDosContatos(ids)`, `novaCampanhaComContatosAcao(admin, orgId, campanhaId, contatos, autorId) → Desfecho<{ id }>`, `contarEnviados(admin, campanhaId)`, `tirarDaListaAcao(admin, orgId, campanhaId, alvos, autorId) → Desfecho<{ tirados }>`; `POST /api/v1/campanhas-da-casca/[id]/massa` → `{ data: RespostaDaMassa }`.

- [ ] **Step 1: O teste das ações (falha)**

`tests/unit/escale-detalhe-da-campanha-acoes.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { carregarCampanha, duplicarAcao } from "@/lib/campanhas/acoes";
import { FILTRO_VAZIO } from "@/lib/campanhas/audiencia";
import {
  audienciaDosContatos,
  novaCampanhaComContatosAcao,
  tirarDaListaAcao,
} from "@/lib/escale/campanhas/detalhe/acoes";

vi.mock("@/lib/campanhas/acoes", () => ({ carregarCampanha: vi.fn(), duplicarAcao: vi.fn() }));

const ORG = "org-1";
const ID = "c1";

/** Cada `from(tabela)` aguardado consome a próxima resposta da fila daquela tabela. */
function dbFalso(respostas: Record<string, unknown[]>) {
  const chamadas: Array<{ tabela: string; metodo: string; args: unknown[] }> = [];
  const db = {
    from: vi.fn((tabela: string) => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "update", "eq", "in", "is", "not"]) {
        c[m] = vi.fn((...args: unknown[]) => {
          chamadas.push({ tabela, metodo: m, args });
          return c;
        });
      }
      c.then = (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) =>
        Promise.resolve((respostas[tabela] ?? []).shift() ?? { data: null, error: null }).then(ok, erro);
      return c;
    }),
  };
  const updates = (tabela: string) =>
    chamadas.filter((c) => c.tabela === tabela && c.metodo === "update").map((c) => c.args[0]);
  return { db, updates };
}

const carregada = (status: string, filtro: Record<string, unknown> = FILTRO_VAZIO) =>
  ({ ok: true, campanha: { id: ID, organization_id: ORG, status, audience_filter: filtro } }) as never;

beforeEach(() => {
  vi.mocked(carregarCampanha).mockReset();
  vi.mocked(duplicarAcao).mockReset();
});

describe("audienciaDosContatos", () => {
  it("o filtro vazio do original com os contatos e o limite certo", () => {
    expect(audienciaDosContatos(["a", "a", "b"])).toEqual({ ...FILTRO_VAZIO, incluir_contatos: ["a", "b"], limite: 2 });
  });
});

describe("novaCampanhaComContatosAcao (Criar campanha)", () => {
  it("duplica pelo original e grava os contatos no rascunho novo", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue(carregada("completed"));
    vi.mocked(duplicarAcao).mockResolvedValue({ ok: true, id: "novo" });
    const { db, updates } = dbFalso({ campaigns: [{ error: null }] });
    const r = await novaCampanhaComContatosAcao(db as never, ORG, ID, ["k1", "k2"], "u1");
    expect(r).toEqual({ ok: true, id: "novo" });
    expect(vi.mocked(duplicarAcao)).toHaveBeenCalledWith(db, expect.objectContaining({ id: ID }), "u1");
    expect(updates("campaigns")[0]).toEqual({
      audience_filter: { ...FILTRO_VAZIO, incluir_contatos: ["k1", "k2"], limite: 2 },
      updated_by: "u1",
    });
  });

  it("recusa vazio e acima de 5.000", async () => {
    const { db } = dbFalso({});
    expect(await novaCampanhaComContatosAcao(db as never, ORG, ID, [], "u1")).toMatchObject({ ok: false, status: 422 });
    const muitos = Array.from({ length: 5001 }, (_, i) => `k${i}`);
    expect(await novaCampanhaComContatosAcao(db as never, ORG, ID, muitos, "u1")).toEqual({
      ok: false,
      codigo: "unprocessable_entity",
      mensagem: "No máximo 5.000 contatos numa campanha nova a partir da seleção.",
      status: 422,
    });
  });
});

describe("tirarDaListaAcao (Excluir selecionados)", () => {
  const alvos = [
    { destinatarioId: "r1", contatoId: "k1" },
    { destinatarioId: "r2", contatoId: "k2" },
  ];

  it("antes do envio: o filtro ganha os contatos, a lista marca 'excluído à mão' e o snapshot é recontado", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue(
      carregada("ready", { ...FILTRO_VAZIO, com_alguma_tag: ["vip"], excluir_contatos: ["k0"] }),
    );
    const { db, updates } = dbFalso({
      campaign_recipients: [{ count: 0 }, { data: [{ id: "r1" }, { id: "r2" }], error: null }, { count: 28 }, { count: 2 }],
      campaigns: [{ data: [{ id: ID }], error: null }, { error: null }],
    });
    const r = await tirarDaListaAcao(db as never, ORG, ID, alvos, "u1");
    expect(r).toEqual({ ok: true, tirados: 2 });
    const [filtro, snapshot] = updates("campaigns") as Array<Record<string, unknown>>;
    expect(filtro).toEqual({
      audience_filter: { ...FILTRO_VAZIO, com_alguma_tag: ["vip"], excluir_contatos: ["k0", "k1", "k2"] },
      updated_by: "u1",
    });
    expect(snapshot).toEqual({ snapshot_eligible: 28, snapshot_excluded: 2 });
    expect(updates("campaign_recipients")[0]).toEqual({
      status: "skipped",
      eligibility_status: "excluded",
      exclusion_reason: "excluido_manualmente",
    });
  });

  it("depois de qualquer envio, ou com a campanha andando, recusa", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue(carregada("scheduled"));
    const { db } = dbFalso({ campaign_recipients: [{ count: 3 }] });
    expect(await tirarDaListaAcao(db as never, ORG, ID, alvos, "u1")).toEqual({
      ok: false,
      codigo: "campanha_estado_invalido",
      mensagem: "Só dá para tirar contatos da lista antes de o envio começar.",
      status: 409,
    });
    vi.mocked(carregarCampanha).mockResolvedValue(carregada("running"));
    const outro = dbFalso({ campaign_recipients: [{ count: 0 }] });
    expect(await tirarDaListaAcao(outro.db as never, ORG, ID, alvos, "u1")).toMatchObject({ ok: false, status: 409 });
  });

  it("o estado mudou no meio: 409 de corrida", async () => {
    vi.mocked(carregarCampanha).mockResolvedValue(carregada("ready"));
    const { db } = dbFalso({ campaign_recipients: [{ count: 0 }], campaigns: [{ data: [], error: null }] });
    expect(await tirarDaListaAcao(db as never, ORG, ID, alvos, "u1")).toMatchObject({
      ok: false,
      status: 409,
      mensagem: "O estado da campanha mudou enquanto esta ação era processada. Recarregue a tela.",
    });
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-acoes.test.ts`
Expected: FAIL (o módulo não existe).

- [ ] **Step 2: `lib/escale/campanhas/detalhe/acoes.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { carregarCampanha, duplicarAcao, type Desfecho } from "@/lib/campanhas/acoes";
import { FILTRO_VAZIO } from "@/lib/campanhas/audiencia";

import { podeTirarDaLista } from "./apresentacao";

/**
 * AS AÇÕES DA SELEÇÃO QUE MEXEM NA CAMPANHA (fork Escale, Fase 8C; N11, N12).
 * Client ADMIN, como as rotas do original (o `authenticated` só tem SELECT em
 * `campaigns`); toda escrita filtra `organization_id` e prende o status
 * conferido (compare-and-set).
 *
 * - "Criar campanha": duplica pela ação do original (a 8B a deixa completa:
 *   funil, etapa, agente, números, modelo) e troca o público pelos contatos
 *   marcados (`incluir_contatos`, o teto da API: 5.000).
 * - "Excluir selecionados": só antes de qualquer envio. O contato entra em
 *   `excluir_contatos` (vale na próxima preparação, com o motivo
 *   `excluido_manualmente`) e a lista já preparada marca o mesmo motivo agora.
 */
export const TETO_DA_NOVA_CAMPANHA = 5000;
export const TETO_DE_FORA_DA_LISTA = 5000;
const LOTE = 500;

type Alvo = { destinatarioId: string; contatoId: string };

const recusa = (codigo: "unprocessable_entity" | "campanha_estado_invalido" | "internal_error", mensagem: string, status: number) =>
  ({ ok: false, codigo, mensagem, status }) as const;

const corrida = () =>
  recusa("campanha_estado_invalido", "O estado da campanha mudou enquanto esta ação era processada. Recarregue a tela.", 409);

export function audienciaDosContatos(contatos: readonly string[]) {
  const unicos = [...new Set(contatos)];
  return { ...FILTRO_VAZIO, incluir_contatos: unicos, limite: Math.max(1, Math.min(unicos.length, TETO_DA_NOVA_CAMPANHA)) };
}

export async function novaCampanhaComContatosAcao(
  admin: SupabaseClient,
  orgId: string,
  campanhaId: string,
  contatos: readonly string[],
  autorId: string,
): Promise<Desfecho<{ id: string }>> {
  const unicos = [...new Set(contatos)];
  if (unicos.length === 0) return recusa("unprocessable_entity", "Nenhum contato selecionado.", 422);
  if (unicos.length > TETO_DA_NOVA_CAMPANHA) {
    return recusa("unprocessable_entity", "No máximo 5.000 contatos numa campanha nova a partir da seleção.", 422);
  }
  const carregada = await carregarCampanha(admin, orgId, campanhaId);
  if (!carregada.ok) return carregada;
  const copia = await duplicarAcao(admin, carregada.campanha, autorId);
  if (!copia.ok) return copia;
  const { error } = await admin
    .from("campaigns")
    .update({ audience_filter: audienciaDosContatos(unicos), updated_by: autorId })
    .eq("organization_id", orgId)
    .eq("id", copia.id)
    .eq("status", "draft");
  if (error) return recusa("internal_error", error.message, 500);
  return { ok: true, id: copia.id };
}

export async function contarEnviados(admin: SupabaseClient, campanhaId: string): Promise<number> {
  const { count } = await admin
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campanhaId)
    .not("sent_at", "is", null);
  return count ?? 0;
}

async function contar(admin: SupabaseClient, campanhaId: string, elegibilidade: "eligible" | "excluded") {
  const { count } = await admin
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campanhaId)
    .eq("eligibility_status", elegibilidade);
  return count ?? 0;
}

export async function tirarDaListaAcao(
  admin: SupabaseClient,
  orgId: string,
  campanhaId: string,
  alvos: readonly Alvo[],
  autorId: string,
): Promise<Desfecho<{ tirados: number }>> {
  const carregada = await carregarCampanha(admin, orgId, campanhaId);
  if (!carregada.ok) return carregada;
  const c = carregada.campanha;
  if (!podeTirarDaLista(c.status, await contarEnviados(admin, campanhaId))) {
    return recusa("campanha_estado_invalido", "Só dá para tirar contatos da lista antes de o envio começar.", 409);
  }

  const filtro = (c.audience_filter ?? {}) as Record<string, unknown>;
  const atuais = Array.isArray(filtro.excluir_contatos) ? (filtro.excluir_contatos as string[]) : [];
  const excluir = [...new Set([...atuais, ...alvos.map((a) => a.contatoId)])];
  if (excluir.length > TETO_DE_FORA_DA_LISTA) {
    return recusa("unprocessable_entity", "No máximo 5.000 contatos fora da lista por campanha.", 422);
  }

  const { data: gravada } = await admin
    .from("campaigns")
    .update({ audience_filter: { ...filtro, excluir_contatos: excluir }, updated_by: autorId })
    .eq("organization_id", orgId)
    .eq("id", campanhaId)
    .eq("status", c.status)
    .select("id");
  if ((gravada ?? []).length === 0) return corrida();

  let tirados = 0;
  const ids = alvos.map((a) => a.destinatarioId);
  for (let i = 0; i < ids.length; i += LOTE) {
    const { data } = await admin
      .from("campaign_recipients")
      .update({ status: "skipped", eligibility_status: "excluded", exclusion_reason: "excluido_manualmente" })
      .eq("organization_id", orgId)
      .eq("campaign_id", campanhaId)
      .eq("eligibility_status", "eligible")
      .is("sent_at", null)
      .in("id", ids.slice(i, i + LOTE))
      .select("id");
    tirados += (data ?? []).length;
  }

  if (tirados > 0) {
    const elegiveis = await contar(admin, campanhaId, "eligible");
    const excluidos = await contar(admin, campanhaId, "excluded");
    await admin
      .from("campaigns")
      .update({ snapshot_eligible: elegiveis, snapshot_excluded: excluidos })
      .eq("organization_id", orgId)
      .eq("id", campanhaId);
  }
  return { ok: true, tirados };
}
```

- [ ] **Step 3: Rodar o teste das ações**

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-acoes.test.ts`
Expected: PASS. Se o TypeScript recusar o `codigo` da `recusa` (o `ApiErrorCode` de `lib/api/errors.ts`), confira que os três existem lá (`unprocessable_entity`, `campanha_estado_invalido`, `internal_error`).

- [ ] **Step 4: O teste da rota (falha)**

`tests/unit/escale-detalhe-da-campanha-massa.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/v1/campanhas-da-casca/[id]/massa/route";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { novaCampanhaComContatosAcao, tirarDaListaAcao } from "@/lib/escale/campanhas/detalhe/acoes";
import { alvoDaSelecaoDaCampanha } from "@/lib/escale/campanhas/detalhe/massa";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ admin: true })) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/escale/campanhas/detalhe/acoes", () => ({
  novaCampanhaComContatosAcao: vi.fn(),
  tirarDaListaAcao: vi.fn(),
}));

const ID = "e5ca1e00-8c00-4000-8000-0000000000c1";
const R1 = "e5ca1e00-8c00-4000-8000-0000000000d1";
const R2 = "e5ca1e00-8c00-4000-8000-0000000000d2";
const R3 = "e5ca1e00-8c00-4000-8000-0000000000d3";
const PIPE = "e5ca1e00-8c00-4000-8000-0000000000f1";
const ETAPA = "e5ca1e00-8c00-4000-8000-0000000000f2";

function sessao(selecao: unknown[], etapa: unknown = null) {
  const db = {
    rpc: vi.fn((nome: string) =>
      Promise.resolve(
        nome === "fn_escale_selecao_da_campanha"
          ? { data: selecao, error: null }
          : { data: [{ acao_id: "a1", quantidade: 1, status: "na_fila" }], error: null },
      ),
    ),
    from: vi.fn(() => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
      c.maybeSingle = vi.fn().mockResolvedValue({ data: etapa, error: null });
      return c;
    }),
  };
  vi.mocked(createClient).mockResolvedValue(db as never);
  return db;
}

const pedir = (corpo: unknown) =>
  POST(
    new NextRequest(new URL("http://x/massa"), { method: "POST", body: JSON.stringify(corpo) }),
    { params: Promise.resolve({ id: ID }) },
  );

const DOIS = [
  { destinatario_id: R1, contato_id: "k1" },
  { destinatario_id: R2, contato_id: "k1" },
];

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(audit).mockReset();
  vi.mocked(novaCampanhaComContatosAcao).mockReset();
  vi.mocked(tirarDaListaAcao).mockReset();
});

describe("alvoDaSelecaoDaCampanha", () => {
  it("ids marcados ou o filtro menos os desmarcados", () => {
    expect(alvoDaSelecaoDaCampanha({ tipo: "ids", ids: [R1] }, {})).toEqual({ tipo: "ids", ids: [R1] });
    expect(
      alvoDaSelecaoDaCampanha({ tipo: "todos", quantidade: null, excluidos: [R3] }, { situacoes: ["nao_enviado"] }),
    ).toEqual({ tipo: "filtro", f: '{"situacoes":["nao_enviado"]}', excluidos: [R3] });
    expect(alvoDaSelecaoDaCampanha({ tipo: "todos", quantidade: null, excluidos: [] }, {})).toEqual({
      tipo: "filtro",
      excluidos: [],
    });
  });
});

describe("POST /api/v1/campanhas-da-casca/[id]/massa", () => {
  it("tag: resolve a seleção, tira contato repetido e põe na fila da 2B", async () => {
    authOk("manager");
    const db = sessao(DOIS);
    const r = await pedir({ acao: "incluir_tag", alvo: { tipo: "ids", ids: [R1, R2] }, parametros: { tag: "vip" } });
    expect(r.status).toBe(201);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_selecao_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_filtros: {},
      p_ids: [R1, R2],
      p_excluidos: null,
    });
    expect(db.rpc).toHaveBeenCalledWith(
      "fn_escale_criar_acao_em_massa",
      expect.objectContaining({ p_org: ORG_ID, p_acao: "incluir_tag", p_parametros: { tag: "vip" }, p_ids: ["k1"] }),
    );
    expect((await r.json()).data).toEqual({ tipo: "acao_em_massa", id: "a1", total: 1, status: "na_fila" });
    expect(vi.mocked(audit)).toHaveBeenCalledWith(expect.objectContaining({ action: "contacts.bulk_requested" }));
  });

  it("Criar campanha pelo filtro: compila, passa os desmarcados e devolve o rascunho novo", async () => {
    authOk("manager");
    const db = sessao([{ destinatario_id: R1, contato_id: "k1" }]);
    vi.mocked(novaCampanhaComContatosAcao).mockResolvedValue({ ok: true, id: "novo" });
    const r = await pedir({
      acao: "nova_campanha",
      alvo: { tipo: "filtro", f: JSON.stringify({ situacoes: ["nao_enviado"] }), excluidos: [R3] },
    });
    expect(r.status).toBe(201);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_selecao_da_campanha", {
      p_org: ORG_ID,
      p_campanha: ID,
      p_filtros: { situacoes: ["nao_enviado"] },
      p_ids: null,
      p_excluidos: [R3],
    });
    expect(vi.mocked(novaCampanhaComContatosAcao)).toHaveBeenCalledWith({ admin: true }, ORG_ID, ID, ["k1"], USER_ID);
    expect((await r.json()).data).toEqual({ tipo: "campanha", id: "novo" });
    expect(vi.mocked(audit)).toHaveBeenCalledWith(expect.objectContaining({ action: "campaign.duplicated" }));
  });

  it("Excluir selecionados repassa a recusa do motor", async () => {
    authOk("manager");
    sessao(DOIS);
    vi.mocked(tirarDaListaAcao).mockResolvedValue({
      ok: false,
      codigo: "campanha_estado_invalido",
      mensagem: "Só dá para tirar contatos da lista antes de o envio começar.",
      status: 409,
    });
    const r = await pedir({ acao: "tirar_da_lista", alvo: { tipo: "ids", ids: [R1, R2] } });
    expect(r.status).toBe(409);
    expect((await r.json()).error.message).toBe("Só dá para tirar contatos da lista antes de o envio começar.");
  });

  it("seleção vazia, etapa de outra origem e corpo ruim são 422", async () => {
    authOk("manager");
    sessao([]);
    expect((await pedir({ acao: "nova_campanha", alvo: { tipo: "ids", ids: [R1] } })).status).toBe(422);
    sessao(DOIS, { pipeline_id: "outra", is_archived: false });
    const r = await pedir({
      acao: "criar_negocios",
      alvo: { tipo: "ids", ids: [R1] },
      parametros: { pipeline_id: PIPE, stage_id: ETAPA },
    });
    expect(r.status).toBe(422);
    expect((await r.json()).error.message).toBe("Escolha a origem e a etapa.");
    expect((await pedir({ acao: "xyz" })).status).toBe(422);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-massa.test.ts`
Expected: FAIL (o módulo não existe).

- [ ] **Step 5: `lib/escale/campanhas/detalhe/massa.ts`**

```ts
import { z } from "zod";

import { IDS_MAX, type Selecao } from "@/lib/escale/contatos/selecao";

import { textoDosFiltrosDeDestinatarios, type FiltrosDeDestinatarios } from "./filtros";

/**
 * O PEDIDO DAS AÇÕES EM MASSA DOS DETALHES (fork Escale, Fase 8C; N11). O alvo
 * é o da lista de contatos (2B): os marcados (até 1.000) ou o filtro menos os
 * desmarcados — nunca a lista inteira de ids.
 */
const uuid = z.string().uuid();
const tag = z.string().trim().min(1).max(40);

export const alvoDaCampanhaSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("ids"), ids: z.array(uuid).min(1).max(IDS_MAX) }).strict(),
  z.object({ tipo: z.literal("filtro"), f: z.string().max(4096).optional(), excluidos: z.array(uuid).max(IDS_MAX) }).strict(),
]);
export type AlvoDaCampanha = z.infer<typeof alvoDaCampanhaSchema>;

export const pedidoDaCampanhaSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("incluir_tag"), alvo: alvoDaCampanhaSchema, parametros: z.object({ tag }).strict() }).strict(),
  z.object({ acao: z.literal("remover_tag"), alvo: alvoDaCampanhaSchema, parametros: z.object({ tag }).strict() }).strict(),
  z
    .object({
      acao: z.literal("criar_negocios"),
      alvo: alvoDaCampanhaSchema,
      parametros: z
        .object({
          pipeline_id: uuid,
          stage_id: uuid,
          owner_user_id: uuid.nullable().optional(),
          valor_centavos: z.number().int().min(0).max(1e12).nullable().optional(),
        })
        .strict(),
    })
    .strict(),
  z.object({ acao: z.literal("nova_campanha"), alvo: alvoDaCampanhaSchema }).strict(),
  z.object({ acao: z.literal("tirar_da_lista"), alvo: alvoDaCampanhaSchema }).strict(),
]);
export type PedidoDaCampanha = z.infer<typeof pedidoDaCampanhaSchema>;

export type RespostaDaMassa =
  | { tipo: "acao_em_massa"; id: string; total: number; status: string }
  | { tipo: "campanha"; id: string }
  | { tipo: "lista"; tirados: number };

export function alvoDaSelecaoDaCampanha(selecao: Selecao, filtros: FiltrosDeDestinatarios): AlvoDaCampanha {
  if (selecao.tipo === "ids") return { tipo: "ids", ids: [...selecao.ids] };
  const f = textoDosFiltrosDeDestinatarios(filtros);
  return { tipo: "filtro", ...(f !== "{}" ? { f } : {}), excluidos: [...selecao.excluidos] };
}
```

- [ ] **Step 6: `app/api/v1/campanhas-da-casca/[id]/massa/route.ts`**

```ts
import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { novaCampanhaComContatosAcao, tirarDaListaAcao } from "@/lib/escale/campanhas/detalhe/acoes";
import { ehIdDeCampanha } from "@/lib/escale/campanhas/detalhe/banco";
import {
  compilarFiltrosDeDestinatarios,
  filtrosDeDestinatariosDoTexto,
} from "@/lib/escale/campanhas/detalhe/filtros";
import { pedidoDaCampanhaSchema, type RespostaDaMassa } from "@/lib/escale/campanhas/detalhe/massa";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/campanhas-da-casca/:id/massa — as ações da seleção nos Detalhes
 * (fork Escale, Fase 8C; N11). Gerente. A seleção é resolvida pela 9310 com a
 * sessão de quem pede; tag e negócio vão para a fila da 2B (a mesma rotina da
 * lista de contatos: eventos, auditoria, automações pelo `tag_added`); criar
 * campanha e tirar da lista mexem na campanha pelo client admin.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const negado = await requireSupportWrite();
  if (negado) return negado;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const recusa = (texto: string) => fail("unprocessable_entity", t(texto), 422, { requestId });
  const { id } = await ctx.params;
  if (!ehIdDeCampanha(id)) return fail("campanha_nao_encontrada", t("Campanha não encontrada."), 404, { requestId });

  const lido = pedidoDaCampanhaSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return recusa("Não consegui completar essa ação. Tente de novo.");
  const pedido = lido.data;
  const filtros = pedido.alvo.tipo === "filtro" ? filtrosDeDestinatariosDoTexto(pedido.alvo.f) : {};
  if (filtros === null) return recusa("Filtro inválido.");
  const orgId = authz.org.orgId;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("fn_escale_selecao_da_campanha", {
      p_org: orgId,
      p_campanha: id,
      p_filtros: pedido.alvo.tipo === "filtro" ? compilarFiltrosDeDestinatarios(filtros) : {},
      p_ids: pedido.alvo.tipo === "ids" ? pedido.alvo.ids : null,
      p_excluidos: pedido.alvo.tipo === "filtro" ? pedido.alvo.excluidos : null,
    });
    if (error) throw new Error(error.message);
    const alvos = ((data ?? []) as Array<{ destinatario_id: string; contato_id: string }>).map((l) => ({
      destinatarioId: l.destinatario_id,
      contatoId: l.contato_id,
    }));
    if (alvos.length === 0) return recusa("Nenhum contato selecionado.");
    const contatos = [...new Set(alvos.map((a) => a.contatoId))];
    const registrar = (action: "campaign.duplicated" | "campaign.recipients_removed" | "contacts.bulk_requested", metadata: Record<string, unknown>) =>
      void audit({
        action,
        actorUserId: authz.user.id,
        organizationId: orgId,
        resourceType: "campaigns",
        resourceId: id,
        requestId,
        metadata,
      });

    if (pedido.acao === "nova_campanha") {
      const r = await novaCampanhaComContatosAcao(createAdminClient(), orgId, id, contatos, authz.user.id);
      if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
      registrar("campaign.duplicated", { copia: r.id, contatos: contatos.length, a_partir_de: "selecao" });
      return ok<RespostaDaMassa>({ tipo: "campanha", id: r.id }, { status: 201, requestId });
    }

    if (pedido.acao === "tirar_da_lista") {
      const r = await tirarDaListaAcao(createAdminClient(), orgId, id, alvos, authz.user.id);
      if (!r.ok) return fail(r.codigo, t(r.mensagem), r.status, { requestId });
      registrar("campaign.recipients_removed", { tirados: r.tirados });
      return ok<RespostaDaMassa>({ tipo: "lista", tirados: r.tirados }, { requestId });
    }

    if (pedido.acao === "criar_negocios") {
      const { data: etapa } = await supabase
        .from("crm_stages")
        .select("id, pipeline_id, is_archived")
        .eq("id", pedido.parametros.stage_id)
        .eq("organization_id", orgId)
        .maybeSingle();
      const e = etapa as { pipeline_id: string; is_archived: boolean } | null;
      if (!e || e.pipeline_id !== pedido.parametros.pipeline_id || e.is_archived) {
        return recusa("Escolha a origem e a etapa.");
      }
    }

    const { data: criada, error: erroDaAcao } = await supabase.rpc("fn_escale_criar_acao_em_massa", {
      p_org: orgId,
      p_acao: pedido.acao,
      p_parametros: pedido.parametros,
      p_ids: contatos,
      p_visao: "todos",
      p_padrao: null,
      p_digitos: null,
      p_cpf_hash: null,
      p_filtros: {},
      p_quantidade: null,
      p_excluidos: null,
    });
    if (erroDaAcao) {
      const mensagem = erroDaAcao.message ?? "";
      if (mensagem.includes("acao_em_massa_vazia")) return recusa("Nenhum contato selecionado.");
      if (mensagem.includes("acao_em_massa_grande_demais")) return recusa("No máximo 100.000 contatos por ação.");
      throw new Error(mensagem);
    }
    const linha = ((criada ?? []) as Array<{ acao_id: string; quantidade: number; status: string }>)[0];
    if (!linha) return recusa("Nenhum contato selecionado.");
    registrar("contacts.bulk_requested", { acao: pedido.acao, total: linha.quantidade, alvo: "campanha" });
    return ok<RespostaDaMassa>(
      { tipo: "acao_em_massa", id: linha.acao_id, total: linha.quantidade, status: linha.status },
      { status: 201, requestId },
    );
  } catch (err) {
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
```

- [ ] **Step 7: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-acoes.test.ts tests/unit/escale-detalhe-da-campanha-massa.test.ts && corepack pnpm prettier --write lib/escale/campanhas/detalhe/massa.ts lib/escale/campanhas/detalhe/acoes.ts "app/api/v1/campanhas-da-casca/[id]/massa" tests/unit/escale-detalhe-da-campanha-acoes.test.ts tests/unit/escale-detalhe-da-campanha-massa.test.ts && corepack pnpm eslint lib/escale/campanhas/detalhe "app/api/v1/campanhas-da-casca" && corepack pnpm typecheck`
Expected: PASS. Se o `ok<RespostaDaMassa>` não aceitar o genérico (assinatura de `ok` em `lib/api/wrappers.ts`), tire o `<RespostaDaMassa>` e anote o tipo no objeto (`const corpo: RespostaDaMassa = …`).

- [ ] **Step 8: Commit**

```bash
git add lib/escale/campanhas/detalhe/massa.ts lib/escale/campanhas/detalhe/acoes.ts "app/api/v1/campanhas-da-casca/[id]/massa" tests/unit/escale-detalhe-da-campanha-acoes.test.ts tests/unit/escale-detalhe-da-campanha-massa.test.ts
git commit -m "feat(escale): ações em massa dos Detalhes — tag, negócio, nova campanha e tirar da lista (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 6: Os hooks do detalhe

**Files:**
- Create: `hooks/escale/useDetalheDaCampanha.ts`, `tests/unit/escale-detalhe-da-campanha-hooks.test.tsx`

**Interfaces:**
- Consumes: `CHAVE_DAS_CAMPANHAS`, `RECONSULTA_MS` (8A, `hooks/escale/useCampanhasDaCasca.ts`); as rotas das Tasks 3–5; `PATCH /api/v1/campaigns/[id]` do original; `textoDosFiltrosDeDestinatarios` (Task 1); `nomeDoCsvDaCampanha` (Task 4); `CorpoDoRitmo` (Task 1); `PedidoDaCampanha`, `RespostaDaMassa` (Task 5); `baixarCsv` (`lib/escale/exportar/baixar.ts`).
- Produces: `chaveDoDetalhe(id)`, `reconsultaDoDetalhe(d)`, `useDetalheDaCampanha(id)`, `useDestinatariosDaCampanha(id, filtros, pagina, porPagina, ativo, andando)`, `useNegociosDaCampanha(id, situacao, aberto)`, `useMassaDaCampanha(id)`, `useRitmoDaCampanha(id)`, `baixarCsvDaCampanha(id, nome, fuso?)`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-detalhe-da-campanha-hooks.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock("@/lib/escale/exportar/baixar", () => ({ baixarCsv: vi.fn() }));

import {
  baixarCsvDaCampanha,
  chaveDoDetalhe,
  reconsultaDoDetalhe,
  useDestinatariosDaCampanha,
  useDetalheDaCampanha,
  useMassaDaCampanha,
  useRitmoDaCampanha,
} from "@/hooks/escale/useDetalheDaCampanha";
import { apiClient } from "@/lib/api/client";
import type { DadosDoDetalhe } from "@/lib/escale/campanhas/detalhe/tipos";
import { baixarCsv } from "@/lib/escale/exportar/baixar";

const envolver = (qc: QueryClient) =>
  function Envolto({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
const novoQc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const dados = (status: string) => ({ campanha: { status } }) as unknown as DadosDoDetalhe;

afterEach(() => {
  vi.mocked(apiClient.get).mockReset();
  vi.mocked(apiClient.post).mockReset();
  vi.mocked(apiClient.patch).mockReset();
  vi.unstubAllGlobals();
});

describe("chave e reconsulta (N15)", () => {
  it("a chave mora debaixo da lista da 8A; reconsulta só enquanto anda", () => {
    expect(chaveDoDetalhe("c1")).toEqual(["campanhas-da-casca", "detalhe", "c1"]);
    expect(reconsultaDoDetalhe(undefined)).toBe(false);
    expect(reconsultaDoDetalhe(dados("running"))).toBe(10_000);
    expect(reconsultaDoDetalhe(dados("preparing"))).toBe(10_000);
    expect(reconsultaDoDetalhe(dados("completed"))).toBe(false);
  });
});

describe("as consultas", () => {
  it("o sumário pela rota do fork", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: dados("completed") });
    const { result } = renderHook(() => useDetalheDaCampanha("c1"), { wrapper: envolver(novoQc()) });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/campanhas-da-casca/c1/sumario");
  });

  it("os destinatários com página, tamanho e filtro; desligado não consulta", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { linhas: [], total: 0, pagina: 2, porPagina: 20 } });
    const { result } = renderHook(
      () => useDestinatariosDaCampanha("c1", { busca: "Elza" }, 2, 20, true, false),
      { wrapper: envolver(novoQc()) },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(apiClient.get).toHaveBeenCalledWith(
      `/api/v1/campanhas-da-casca/c1/destinatarios?p=2&n=20&f=${encodeURIComponent('{"busca":"Elza"}')}`,
    );
    vi.mocked(apiClient.get).mockClear();
    renderHook(() => useDestinatariosDaCampanha("c1", {}, 1, 20, false, false), { wrapper: envolver(novoQc()) });
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});

describe("as mutações", () => {
  it("a massa invalida tudo da lista; o ritmo vai pelo PATCH do original", async () => {
    const qc = novoQc();
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    vi.mocked(apiClient.post).mockResolvedValue({ data: { tipo: "campanha", id: "novo" } });
    const massa = renderHook(() => useMassaDaCampanha("c1"), { wrapper: envolver(qc) });
    let resposta: unknown;
    await act(async () => {
      resposta = await massa.result.current.mutateAsync({ acao: "nova_campanha", alvo: { tipo: "filtro", excluidos: [] } });
    });
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/campanhas-da-casca/c1/massa", {
      acao: "nova_campanha",
      alvo: { tipo: "filtro", excluidos: [] },
    });
    expect(resposta).toEqual({ tipo: "campanha", id: "novo" });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["campanhas-da-casca"] });

    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} });
    const ritmo = renderHook(() => useRitmoDaCampanha("c1"), { wrapper: envolver(qc) });
    const corpo = { intervalo_segundos: 30, teto_diario: null, teto_horario: null, janela_inicio_hora: null, janela_fim_hora: null };
    await act(async () => {
      await ritmo.result.current.mutateAsync(corpo);
    });
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/campaigns/c1", corpo);
  });
});

describe("baixarCsvDaCampanha", () => {
  it("baixa o texto da rota com o nome do arquivo; falha vira erro", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => "a,b" })));
    await baixarCsvDaCampanha("c1", "10.09", "America/Sao_Paulo");
    expect(fetch).toHaveBeenCalledWith("/api/v1/campanhas-da-casca/c1/csv", { credentials: "same-origin" });
    expect(baixarCsv).toHaveBeenCalledWith(expect.stringMatching(/^campanha-10-09-\d{4}-\d{2}-\d{2}\.csv$/), "a,b");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, text: async () => "" })));
    await expect(baixarCsvDaCampanha("c1", "10.09")).rejects.toThrow("Não foi possível baixar o arquivo. Tente novamente.");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-hooks.test.tsx`
Expected: FAIL (o hook não existe).

- [ ] **Step 2: `hooks/escale/useDetalheDaCampanha.ts`**

```ts
"use client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CHAVE_DAS_CAMPANHAS, RECONSULTA_MS } from "@/hooks/escale/useCampanhasDaCasca";
import { apiClient } from "@/lib/api/client";
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";
import { nomeDoCsvDaCampanha } from "@/lib/escale/campanhas/detalhe/csv";
import { textoDosFiltrosDeDestinatarios, type FiltrosDeDestinatarios } from "@/lib/escale/campanhas/detalhe/filtros";
import type { PedidoDaCampanha, RespostaDaMassa } from "@/lib/escale/campanhas/detalhe/massa";
import type { CorpoDoRitmo } from "@/lib/escale/campanhas/detalhe/ritmo";
import type {
  DadosDoDetalhe,
  NegociosDaCampanha,
  PaginaDeDestinatarios,
  SituacaoDosNegocios,
} from "@/lib/escale/campanhas/detalhe/tipos";
import { baixarCsv } from "@/lib/escale/exportar/baixar";

/**
 * OS DADOS DO DETALHE DA CAMPANHA (fork Escale, Fase 8C). A chave mora debaixo
 * de `CHAVE_DAS_CAMPANHAS`: o tempo real e as ações da 8A já invalidam o
 * detalhe (N15). Pausar e retomar seguem pelo `useAcoesDaCampanha` da 8A.
 */
const ANDANDO: ReadonlySet<StatusDaCampanha> = new Set(["preparing", "running"]);
const rota = (id: string) => `/api/v1/campanhas-da-casca/${id}`;

export const chaveDoDetalhe = (id: string) => [CHAVE_DAS_CAMPANHAS, "detalhe", id] as const;

export const reconsultaDoDetalhe = (d: DadosDoDetalhe | undefined): number | false =>
  d && ANDANDO.has(d.campanha.status) ? RECONSULTA_MS : false;

export function useDetalheDaCampanha(id: string) {
  return useQuery({
    queryKey: chaveDoDetalhe(id),
    queryFn: async () => (await apiClient.get<{ data: DadosDoDetalhe }>(`${rota(id)}/sumario`)).data,
    refetchInterval: (q) => reconsultaDoDetalhe(q.state.data),
  });
}

export function useDestinatariosDaCampanha(
  id: string,
  filtros: FiltrosDeDestinatarios,
  pagina: number,
  porPagina: number,
  ativo: boolean,
  andando: boolean,
) {
  const texto = textoDosFiltrosDeDestinatarios(filtros);
  return useQuery({
    queryKey: [...chaveDoDetalhe(id), "destinatarios", texto, pagina, porPagina],
    enabled: ativo,
    placeholderData: keepPreviousData,
    refetchInterval: andando ? RECONSULTA_MS : false,
    queryFn: async () => {
      const qs = new URLSearchParams({ p: String(pagina), n: String(porPagina) });
      if (texto !== "{}") qs.set("f", texto);
      return (await apiClient.get<{ data: PaginaDeDestinatarios }>(`${rota(id)}/destinatarios?${qs.toString()}`)).data;
    },
  });
}

export function useNegociosDaCampanha(id: string, situacao: SituacaoDosNegocios, aberto: boolean) {
  return useQuery({
    queryKey: [...chaveDoDetalhe(id), "negocios", situacao],
    enabled: aberto,
    queryFn: async () =>
      (await apiClient.get<{ data: NegociosDaCampanha }>(`${rota(id)}/negocios?situacao=${situacao}`)).data,
  });
}

export function useMassaDaCampanha(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: PedidoDaCampanha) =>
      (await apiClient.post<{ data: RespostaDaMassa }>(`${rota(id)}/massa`, pedido)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] });
    },
  });
}

export function useRitmoDaCampanha(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (corpo: CorpoDoRitmo) => apiClient.patch(`/api/v1/campaigns/${id}`, corpo),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CHAVE_DAS_CAMPANHAS] });
    },
  });
}

/** "Baixar .CSV": a rota devolve o texto; o navegador põe o BOM e o nome (N14). */
export async function baixarCsvDaCampanha(id: string, nome: string, fuso?: string): Promise<void> {
  const resposta = await fetch(`${rota(id)}/csv`, { credentials: "same-origin" });
  if (!resposta.ok) throw new Error("Não foi possível baixar o arquivo. Tente novamente.");
  baixarCsv(nomeDoCsvDaCampanha(nome, new Date(), fuso), await resposta.text());
}
```

- [ ] **Step 3: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-hooks.test.tsx && corepack pnpm prettier --write hooks/escale/useDetalheDaCampanha.ts tests/unit/escale-detalhe-da-campanha-hooks.test.tsx && corepack pnpm eslint hooks/escale/useDetalheDaCampanha.ts && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add hooks/escale/useDetalheDaCampanha.ts tests/unit/escale-detalhe-da-campanha-hooks.test.tsx
git commit -m "feat(escale): hooks do detalhe da campanha — sumário, destinatários, negócios, massa, ritmo e CSV (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 7: O molde (janela, cartão, funil, seção, título e prévia do celular)

**Files:**
- Create: `components/escale/campanhas/molde/{estilos.ts,JanelaDoDetalhe.tsx,CartaoDoSumario.tsx,FunilDeConversao.tsx,SecaoDoSumario.tsx,TituloDaSecao.tsx,PreviaDoCelular.tsx}`, `tests/unit/escale-molde-do-detalhe.test.tsx`
- Modify: `app/escale-tema.css`, `lib/ui/icons-da-casca.ts`

**Interfaces (contrato com a 8D — não mudar nome nem prop sem avisar):**
- Consumes: `DicaAoPassar` (8A); `numeroBr` (8A); `ParteDaMensagem` (Task 1); `CLASSE_DO_TRILHO_DO_FUNIL` (Task 1).
- Produces:
  - `CLASSE_DO_BLOCO`, `CLASSE_DO_CARTAO` (`molde/estilos.ts`).
  - `JanelaDoDetalhe({ aberta, aoFechar, rotulo, titulo, acoes?, abas: { valor; rotulo }[], abaAtiva, aoTrocarAba, children })`.
  - `SinalDeAjuda({ texto, focavel? })` e `CartaoDoSumario({ rotulo, dica?, subtitulo?, valor?, complemento?, tamanho?: "md" | "lg", aoClicar?, carregando?, children? })` — `complemento` é só o número; o componente põe o "·".
  - `FunilDeConversao({ etapas: { chave; rotulo; quantidade; porcento: number | null }[], titulo?, legenda? })` — rótulos chegam traduzidos.
  - `SecaoDoSumario({ titulo, ajuda?, selo?, legenda?, direita?, tituloGrande?, children })`.
  - `TituloDaSecao({ children })`.
  - `PreviaDoCelular({ nomeDaConta, partes, hora, vazio? })`.

- [ ] **Step 1: Se a 8B já criou a `PreviaDoCelular`**

Se o Step 1 da Task 1 achou `components/escale/campanhas/molde/PreviaDoCelular.tsx`, confira que a assinatura é `({ nomeDaConta: string; partes: readonly ParteDaMensagem[]; hora: string; vazio?: string })`: igual → **não** a recrie no Step 5 e tire o bloco "PreviaDoCelular" do teste só se ele já tiver teste próprio; diferente → PARE e pergunte.

- [ ] **Step 2: O teste (falha)**

`tests/unit/escale-molde-do-detalhe.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CartaoDoSumario } from "@/components/escale/campanhas/molde/CartaoDoSumario";
import { FunilDeConversao } from "@/components/escale/campanhas/molde/FunilDeConversao";
import { JanelaDoDetalhe } from "@/components/escale/campanhas/molde/JanelaDoDetalhe";
import { PreviaDoCelular } from "@/components/escale/campanhas/molde/PreviaDoCelular";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { TituloDaSecao } from "@/components/escale/campanhas/molde/TituloDaSecao";
import { partesDaMensagem } from "@/lib/escale/campanhas/detalhe/mensagem";

describe("JanelaDoDetalhe (009)", () => {
  it("rótulo, título como nome da janela, ações, abas e fechar", async () => {
    const aoFechar = vi.fn();
    const aoTrocarAba = vi.fn();
    render(
      <JanelaDoDetalhe
        aberta
        aoFechar={aoFechar}
        rotulo="INFORMAÇÕES DA CAMPANHA"
        titulo="10.09"
        acoes={<button type="button">Baixar .CSV</button>}
        abas={[
          { valor: "sumario", rotulo: "Sumário" },
          { valor: "detalhes", rotulo: "Detalhes" },
        ]}
        abaAtiva="sumario"
        aoTrocarAba={aoTrocarAba}
      >
        <p>conteúdo</p>
      </JanelaDoDetalhe>,
    );
    const janela = screen.getByRole("dialog", { name: "10.09" });
    expect(within(janela).getByText("INFORMAÇÕES DA CAMPANHA")).toBeInTheDocument();
    expect(within(janela).getByRole("button", { name: "Baixar .CSV" })).toBeInTheDocument();
    expect(within(janela).getByRole("tab", { name: "Sumário" })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(within(janela).getByRole("tab", { name: "Detalhes" }));
    expect(aoTrocarAba).toHaveBeenCalledWith("detalhes");
    await userEvent.click(within(janela).getByRole("button", { name: "Fechar" }));
    expect(aoFechar).toHaveBeenCalled();
  });
});

describe("CartaoDoSumario (009, 011)", () => {
  it("rótulo, valor e o complemento com o ponto; o '?' com a dica", () => {
    render(<CartaoDoSumario rotulo="Entregues" dica="Percentual sobre os enviados." valor="88%" complemento="23" />);
    expect(screen.getByText("Entregues")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("· 23")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Percentual sobre os enviados." })).toBeInTheDocument();
  });

  it("clicável vira botão; carregando mostra o esqueleto; children troca o valor", async () => {
    const aoClicar = vi.fn();
    const { rerender, container } = render(<CartaoDoSumario rotulo="Negócios criados" valor="8" aoClicar={aoClicar} />);
    await userEvent.click(screen.getByRole("button", { name: /Negócios criados/ }));
    expect(aoClicar).toHaveBeenCalled();
    rerender(<CartaoDoSumario rotulo="Enviados" carregando />);
    expect(container.querySelector("[data-esqueleto]")).not.toBeNull();
    rerender(
      <CartaoDoSumario rotulo="Tempo mediano até resposta">
        <p>Não foi possível calcular o tempo de resposta.</p>
      </CartaoDoSumario>,
    );
    expect(screen.getByText("Não foi possível calcular o tempo de resposta.")).toBeInTheDocument();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("sem valor, o traço", () => {
    render(<CartaoDoSumario rotulo="Custo por resposta" subtitulo="Custo real" />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Custo real")).toBeInTheDocument();
  });
});

describe("FunilDeConversao (009)", () => {
  it("título e legenda padrão, 'n · p%' e a largura da barra; sem base, o traço", () => {
    const { container } = render(
      <FunilDeConversao
        etapas={[
          { chave: "enviados", rotulo: "Enviados", quantidade: 1500, porcento: 100 },
          { chave: "entregues", rotulo: "Entregues", quantidade: 23, porcento: 88 },
          { chave: "lidas", rotulo: "Lidas", quantidade: 0, porcento: null },
        ]}
      />,
    );
    expect(screen.getByText("Funil de conversão")).toBeInTheDocument();
    expect(screen.getByText("% sobre enviados")).toBeInTheDocument();
    expect(screen.getByText("1.500 · 100%")).toBeInTheDocument();
    expect(screen.getByText("0 · —")).toBeInTheDocument();
    const barra = container.querySelector('[data-etapa="entregues"] [data-barra]') as HTMLElement;
    expect(barra.style.width).toBe("88%");
  });

  it("a 8D troca título e legenda", () => {
    render(<FunilDeConversao etapas={[]} legenda="% sobre encontradas" />);
    expect(screen.getByText("% sobre encontradas")).toBeInTheDocument();
  });
});

describe("SecaoDoSumario e TituloDaSecao (010, 011)", () => {
  it("título, selo junto do título, legenda à direita e o conteúdo", () => {
    render(
      <>
        <TituloDaSecao>Resultado</TituloDaSecao>
        <SecaoDoSumario titulo="Motivos do erro" tituloGrande selo={<span>4 falhas</span>} legenda="% sobre não entregues">
          <p>3 motivos em 4 falhas de envio</p>
        </SecaoDoSumario>
      </>,
    );
    expect(screen.getByRole("heading", { name: "Resultado" })).toBeInTheDocument();
    const secao = screen.getByRole("region", { name: "Motivos do erro" });
    expect(within(secao).getByText("4 falhas")).toBeInTheDocument();
    expect(within(secao).getByText("% sobre não entregues")).toBeInTheDocument();
    expect(within(secao).getByText("3 motivos em 4 falhas de envio")).toBeInTheDocument();
  });
});

describe("PreviaDoCelular (009)", () => {
  it("o nome da conta, o balão com a variável em chip e a hora", () => {
    const { container } = render(
      <PreviaDoCelular nomeDaConta="INSS de Obra" partes={partesDaMensagem("Oi, {{primeiro_nome}}! Tudo bem?")} hora="14:59" />,
    );
    expect(screen.getByText("INSS de Obra")).toBeInTheDocument();
    expect(container.querySelector('[data-variavel="primeiro_nome"]')).toHaveTextContent("Primeiro nome");
    expect(screen.getAllByText("14:59").length).toBeGreaterThan(0);
  });

  it("sem mensagem, o texto de vazio", () => {
    render(<PreviaDoCelular nomeDaConta="X" partes={[]} hora="10:00" />);
    expect(screen.getByText("Sem mensagem")).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-molde-do-detalhe.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 3: As cores e os ícones**

No **fim** de `app/escale-tema.css`:

```css
/* ─── FORK ESCALE · Fase 8C (detalhe da campanha) ───
   A rosca "Distribuição por status", o trilho do funil e a prévia do WhatsApp
   (amostra de pixel no print 09-009). Lidas por valor arbitrário
   (`bg-(--escale-…)`), como as da 8A. */
body:has([data-escale-casca]) {
  --escale-detalhe-trilho: #ededef; /* medido, 09-009 */
  --escale-rosca-lida: #596df0; /* medido, 09-009 */
  --escale-rosca-entregue: #e7e4f7; /* medido, 09-009 */
  --escale-rosca-enviado: #171926; /* medido, 09-009 */
  --escale-rosca-erro: #d62829; /* medido, 09-009 */
  --escale-rosca-nao-enviado: #dc520a; /* medido, 09-009 */
  --escale-rosca-aguardando: #a1a1aa; /* provisório: a Clint não tem */
  --escale-zap-moldura: #1a1921; /* medido, 09-009 */
  --escale-zap-cabeca: #085e55; /* medido, 09-009 */
  --escale-zap-avatar: #2b7a70; /* provisório */
  --escale-zap-fundo: #ede4df; /* medido, 09-009 */
  --escale-zap-balao: #ffffff;
  --escale-zap-visto: #53bdeb; /* provisório: o azul do WhatsApp */
}

[data-theme="dark"] body:has([data-escale-casca]) {
  --escale-detalhe-trilho: #2a2d3d;
  --escale-rosca-lida: #7c8cf5;
  --escale-rosca-entregue: #4b4670;
  --escale-rosca-enviado: #e4e4e7;
  --escale-rosca-erro: #f87171;
  --escale-rosca-nao-enviado: #fb923c;
  --escale-rosca-aguardando: #71717a;
  --escale-zap-moldura: #000000;
  --escale-zap-cabeca: #1f2c34;
  --escale-zap-avatar: #2a3942;
  --escale-zap-fundo: #0b141a;
  --escale-zap-balao: #202c33;
  --escale-zap-visto: #53bdeb;
}
```

Em `lib/ui/icons-da-casca.ts`, acrescente ao `export { … } from "lucide-react"` mais próximo, com a linha de comentário `// FORK ESCALE · Fase 8C: a prévia do celular (009).`: `BatteryFull`, `Signal`, `Video`, `Wifi`. Confira antes que não existem: `grep -nE "\b(BatteryFull|Signal|Video|Wifi)\b" lib/ui/icons-da-casca.ts` (vazio; em 19/10 nenhum existia, e `ArrowLeft`, `CheckCheck`, `Phone`, `EllipsisVertical`, `SlidersHorizontal`, `FileText`, `Smartphone`, `CirclePause`, `Play`, `Download` já existem).

- [ ] **Step 4: `molde/estilos.ts`, `JanelaDoDetalhe.tsx`, `CartaoDoSumario.tsx`, `TituloDaSecao.tsx`, `SecaoDoSumario.tsx`, `FunilDeConversao.tsx`**

`components/escale/campanhas/molde/estilos.ts`:

```ts
/**
 * O MOLDE DO DETALHE (fork Escale, Fase 8C; N19; 009–011): as classes do bloco
 * e do cartão, num lugar só. A 8D (Prospecção) usa as mesmas.
 */
export const CLASSE_DO_BLOCO =
  "rounded-[8px] border border-casca-borda bg-surface p-4 text-casca-texto shadow-[0_1px_2px_rgb(17_24_39/0.06)]";

export const CLASSE_DO_CARTAO = `flex min-h-[86px] w-full flex-col text-left ${CLASSE_DO_BLOCO}`;
```

`components/escale/campanhas/molde/JanelaDoDetalhe.tsx`:

```tsx
"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

export interface AbaDoDetalhe {
  valor: string;
  rotulo: string;
}

/**
 * A JANELA DO DETALHE (fork Escale, Fase 8C; 009; material 6): quase a tela
 * toda sobre a lista escurecida — rótulo em caixa alta, o nome, as ações e o X;
 * as abas com o sublinhado da marca; o corpo rola sozinho. Genérica: a 8D usa
 * para a Prospecção. Os textos chegam traduzidos.
 */
export function JanelaDoDetalhe({
  aberta,
  aoFechar,
  rotulo,
  titulo,
  acoes,
  abas,
  abaAtiva,
  aoTrocarAba,
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  rotulo: string;
  titulo: string;
  acoes?: ReactNode;
  abas: readonly AbaDoDetalhe[];
  abaAtiva: string;
  aoTrocarAba: (valor: string) => void;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <DialogPrimitive.Root
      open={aberta}
      onOpenChange={(a) => {
        if (!a) aoFechar();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/55" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-2 top-16 bottom-16 z-50 flex flex-col overflow-hidden rounded-[10px] bg-surface text-casca-texto shadow-casca-painel focus:outline-none"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-casca-divisoria px-8 pt-5 pb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.08em] text-casca-suave uppercase">{rotulo}</p>
              <DialogTitle title={titulo} className="mt-1 truncate text-[18px] leading-6 font-semibold text-casca-texto">
                {titulo}
              </DialogTitle>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {acoes}
              <DialogPrimitive.Close
                aria-label={t("Fechar")}
                className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave transition-colors hover:bg-casca-raia hover:text-casca-texto focus-visible:outline-2 focus-visible:outline-casca-marca"
              >
                <X size={18} aria-hidden />
              </DialogPrimitive.Close>
            </div>
          </header>
          <div role="tablist" aria-label={titulo} className="flex shrink-0 gap-1 px-8 pt-3">
            {abas.map((a) => {
              const ativa = a.valor === abaAtiva;
              return (
                <button
                  key={a.valor}
                  type="button"
                  role="tab"
                  aria-selected={ativa}
                  onClick={() => aoTrocarAba(a.valor)}
                  className={cn(
                    "relative px-3 pb-2.5 text-[13px] transition-colors",
                    ativa
                      ? "font-medium text-casca-marca after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-casca-marca"
                      : "text-casca-texto hover:text-casca-marca",
                  )}
                >
                  {a.rotulo}
                </button>
              );
            })}
          </div>
          <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
```

`components/escale/campanhas/molde/CartaoDoSumario.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";

import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { cn } from "@/lib/utils";

import { CLASSE_DO_CARTAO } from "./estilos";

/** O "?" na cor da marca (009): círculo de 14px com a dica ao passar. */
export function SinalDeAjuda({ texto, focavel = true }: { texto: string; focavel?: boolean }) {
  return (
    <DicaAoPassar texto={texto}>
      <span
        role="img"
        aria-label={texto}
        tabIndex={focavel ? 0 : undefined}
        className="grid size-3.5 shrink-0 place-items-center rounded-full bg-casca-marca text-[9px] leading-none font-bold text-white"
      >
        ?
      </span>
    </DicaAoPassar>
  );
}

/**
 * O CARTÃO DO SUMÁRIO (fork Escale, Fase 8C; 009, 011): o rótulo e o "?" em
 * cima; embaixo o valor e " · n" em cinza (`complemento` é só o número). Sem
 * valor, "—". `tamanho="lg"` é o dos cartões de RESULTADO (18px). Clicável
 * vira botão (os de negócios abrem a gaveta).
 */
export function CartaoDoSumario({
  rotulo,
  dica,
  subtitulo,
  valor,
  complemento,
  tamanho = "md",
  aoClicar,
  carregando = false,
  children,
}: {
  rotulo: string;
  dica?: string;
  subtitulo?: string;
  valor?: string;
  complemento?: string;
  tamanho?: "md" | "lg";
  aoClicar?: () => void;
  carregando?: boolean;
  children?: ReactNode;
}) {
  const corpo = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium text-casca-texto">{rotulo}</span>
        {dica ? <SinalDeAjuda texto={dica} focavel={!aoClicar} /> : null}
      </span>
      {subtitulo ? <span className="mt-1 text-[11px] text-casca-suave">{subtitulo}</span> : null}
      <span className="mt-auto block pt-2">
        {carregando ? (
          <span data-esqueleto aria-hidden className="block h-5 w-16 animate-pulse rounded-[4px] bg-casca-raia" />
        ) : children !== undefined ? (
          children
        ) : (
          <span className={cn("text-casca-texto", tamanho === "lg" ? "text-[18px] font-bold" : "text-[15px] font-semibold")}>
            {valor ?? "—"}
            {complemento ? <span className="ml-1 text-[12px] font-normal text-casca-suave">· {complemento}</span> : null}
          </span>
        )}
      </span>
    </>
  );
  if (aoClicar) {
    return (
      <button
        type="button"
        onClick={aoClicar}
        className={cn(
          CLASSE_DO_CARTAO,
          "transition-colors hover:border-casca-marca-media focus-visible:outline-2 focus-visible:outline-casca-marca",
        )}
      >
        {corpo}
      </button>
    );
  }
  return <div className={CLASSE_DO_CARTAO}>{corpo}</div>;
}
```

`components/escale/campanhas/molde/TituloDaSecao.tsx`:

```tsx
import type { ReactNode } from "react";

/** "RESULTADO" (010, 011): 10px/600 caixa alta, espaçado, na cor da marca. */
export function TituloDaSecao({ children }: { children: ReactNode }) {
  return <h2 className="pt-6 pb-3 text-[10px] font-semibold tracking-[0.1em] text-casca-marca uppercase">{children}</h2>;
}
```

`components/escale/campanhas/molde/SecaoDoSumario.tsx`:

```tsx
import type { ReactNode } from "react";

import { SinalDeAjuda } from "./CartaoDoSumario";
import { CLASSE_DO_BLOCO } from "./estilos";

/**
 * O BLOCO LARGO DO SUMÁRIO (fork Escale, Fase 8C; 009, 010): título (13px, ou
 * 15px em "Motivos do erro"), o "?" e o selo junto dele; à direita a legenda
 * cinza ("% sobre enviados") ou outro nó (o selo "Oportunidade").
 */
export function SecaoDoSumario({
  titulo,
  ajuda,
  selo,
  legenda,
  direita,
  tituloGrande = false,
  children,
}: {
  titulo: string;
  ajuda?: string;
  selo?: ReactNode;
  legenda?: string;
  direita?: ReactNode;
  tituloGrande?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-label={titulo} className={CLASSE_DO_BLOCO}>
      <header className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <h3 className={tituloGrande ? "text-[15px] font-semibold" : "text-[13px] font-semibold"}>{titulo}</h3>
          {ajuda ? <SinalDeAjuda texto={ajuda} /> : null}
          {selo}
        </span>
        {direita ?? (legenda ? <span className="shrink-0 text-[11px] text-casca-suave">{legenda}</span> : null)}
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}
```

`components/escale/campanhas/molde/FunilDeConversao.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { CLASSE_DO_TRILHO_DO_FUNIL } from "@/lib/escale/campanhas/detalhe/cores";
import { cn } from "@/lib/utils";

import { SecaoDoSumario } from "./SecaoDoSumario";

export interface EtapaDoFunilDoMolde {
  chave: string;
  rotulo: string;
  quantidade: number;
  porcento: number | null;
}

/**
 * O FUNIL DE CONVERSÃO (fork Escale, Fase 8C; 009): uma linha por etapa com
 * "n · p%" e a barra grossa na cor da marca sobre o trilho. A 8D passa as
 * etapas dela e a legenda ("% sobre encontradas").
 */
export function FunilDeConversao({
  etapas,
  titulo,
  legenda,
}: {
  etapas: readonly EtapaDoFunilDoMolde[];
  titulo?: string;
  legenda?: string;
}) {
  const t = useT();
  return (
    <SecaoDoSumario titulo={titulo ?? t("Funil de conversão")} legenda={legenda ?? t("% sobre enviados")}>
      <ul className="space-y-3.5">
        {etapas.map((e) => (
          <li key={e.chave} data-etapa={e.chave}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-medium">{e.rotulo}</span>
              <span className="text-[12px] text-casca-texto">
                {`${numeroBr(e.quantidade)} · ${e.porcento === null ? "—" : `${e.porcento}%`}`}
              </span>
            </div>
            <div className={cn("mt-1.5 h-3 overflow-hidden rounded-full", CLASSE_DO_TRILHO_DO_FUNIL)}>
              <div
                data-barra
                className="h-full rounded-full bg-casca-marca"
                style={{ width: `${Math.min(100, Math.max(0, e.porcento ?? 0))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </SecaoDoSumario>
  );
}
```

- [ ] **Step 5: `components/escale/campanhas/molde/PreviaDoCelular.tsx`** (pule se a 8B já criou com a mesma interface — Step 1)

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import type { ParteDaMensagem } from "@/lib/escale/campanhas/detalhe/mensagem";
import {
  ArrowLeft,
  BatteryFull,
  CheckCheck,
  EllipsisVertical,
  Phone,
  Signal,
  Video,
  Wifi,
} from "@/lib/ui/icons-da-casca";

/**
 * A PRÉVIA DO CELULAR (fork Escale, Fase 8C; 009): moldura preta, a barra de
 * status, o cabeçalho verde do WhatsApp com a conta e "online", o fundo bege e
 * o balão com as variáveis em chip na cor da marca, a hora e o duplo visto.
 * Só leitura; o assistente (8B) usa a mesma.
 */
export function PreviaDoCelular({
  nomeDaConta,
  partes,
  hora,
  vazio,
}: {
  nomeDaConta: string;
  partes: readonly ParteDaMensagem[];
  hora: string;
  vazio?: string;
}) {
  const t = useT();
  const inicial = nomeDaConta.trim().charAt(0).toUpperCase() || "?";
  return (
    <figure
      aria-label={t("Prévia da mensagem")}
      className="mx-auto flex h-[640px] w-[340px] flex-col overflow-hidden rounded-[44px] border-[12px] border-(--escale-zap-moldura) bg-(--escale-zap-fundo)"
    >
      <div className="flex items-center justify-between bg-(--escale-zap-cabeca) px-5 pt-3 pb-1 text-[12px] font-semibold text-white">
        <span>{hora}</span>
        <span aria-hidden className="flex items-center gap-1">
          <Signal size={12} />
          <Wifi size={12} />
          <BatteryFull size={14} />
        </span>
      </div>
      <div className="flex items-center gap-2 bg-(--escale-zap-cabeca) px-3 pb-2.5 text-white">
        <ArrowLeft size={18} aria-hidden />
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-(--escale-zap-avatar) text-[13px] font-semibold"
        >
          {inicial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{nomeDaConta}</span>
          <span className="block text-[11px]">{t("online")}</span>
        </span>
        <Video size={18} aria-hidden />
        <Phone size={16} aria-hidden />
        <EllipsisVertical size={18} aria-hidden />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {partes.length === 0 ? (
          <p className="pt-6 text-center text-[12px] text-casca-suave">{vazio ?? t("Sem mensagem")}</p>
        ) : (
          <div
            data-balao
            className="max-w-[85%] rounded-[8px] bg-(--escale-zap-balao) p-2.5 text-[13px] leading-5 whitespace-pre-wrap text-casca-texto shadow-[0_1px_1px_rgb(0_0_0/0.08)]"
          >
            {partes.map((p, i) =>
              p.tipo === "texto" ? (
                <span key={i}>{p.texto}</span>
              ) : (
                <span
                  key={i}
                  data-variavel={p.chave}
                  className="rounded-[4px] bg-casca-marca-suave px-1 font-medium text-casca-marca"
                >
                  {p.traduzivel ? t(p.rotulo) : p.rotulo}
                </span>
              ),
            )}
            <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-casca-suave">
              {hora}
              <CheckCheck size={14} aria-hidden className="text-(--escale-zap-visto)" />
            </span>
          </div>
        )}
      </div>
    </figure>
  );
}
```

- [ ] **Step 6: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-molde-do-detalhe.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/escale-tema.test.ts tests/unit/escale-casca-tokens.test.ts tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/campanhas/molde tests/unit/escale-molde-do-detalhe.test.tsx && corepack pnpm eslint components/escale/campanhas/molde lib/ui/icons-da-casca.ts && corepack pnpm typecheck`
Expected: PASS. Se a `tailwind-tokens` recusar `bg-black/55` ou `text-white`, use o que a `JanelaDaCasca` e a `BarraDeLote` usam (as duas já passam na cerca com essas classes).

- [ ] **Step 7: Commit**

```bash
git add components/escale/campanhas/molde app/escale-tema.css lib/ui/icons-da-casca.ts tests/unit/escale-molde-do-detalhe.test.tsx
git commit -m "feat(escale): molde do detalhe — janela, cartão, funil, seção, título e prévia do celular (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 8: A aba Sumário (cartões, funil, rosca, ritmo, motivos, oportunidade, não enviados, resultado e a gaveta)

**Files:**
- Create: `components/escale/campanhas/detalhe/{RoscaDeStatus,RitmoDeEnvio,MotivosDoErro,LeuENaoRespondeu,NaoEnviados,ResultadoDaCampanha,GavetaDeNegocios,SumarioDaCampanha}.tsx`, `tests/unit/escale-detalhe-da-campanha-sumario.test.tsx`
- Modify: `lib/escale/campanhas/detalhe/csv.ts` (o CSV da gaveta)

**Interfaces:**
- Consumes: o molde (Task 7); as regras (Task 1); `useNegociosDaCampanha` (Task 6); `nomeDoCsvDaCampanha` (Task 4); `celula`, `reaisDeCentavos` (`lib/escale/exportar/csv-do-quadro.ts`); `baixarCsv`; `formatarTelefone`; `dataBr`, `numeroBr` (8A).
- Produces: `RoscaDeStatus({ sumario })`, `RitmoDeEnvio({ pontos })`, `MotivosDoErro({ motivos, erros })`, `LeuENaoRespondeu({ sumario, aoVerContatos })`, `NaoEnviados({ quantidade, aoVerContatos, aoCriarCampanha, criando })`, `ResultadoDaCampanha({ resultado, aoAbrirNegocios })`, `GavetaDeNegocios({ campanhaId, nomeDaCampanha, situacao, aoFechar, fuso? })`, `SumarioDaCampanha({ dados, colunaDireita, aoVerContatos, aoCriarCampanhaDosNaoEnviados, criando, aoAbrirNegocios })`, `SumarioCarregando()`; `csvDosNegocios(linhas, t, fuso?)`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-detalhe-da-campanha-sumario.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/escale/useDetalheDaCampanha", () => ({ useNegociosDaCampanha: vi.fn() }));
vi.mock("@/lib/escale/exportar/baixar", () => ({ baixarCsv: vi.fn() }));

import { GavetaDeNegocios } from "@/components/escale/campanhas/detalhe/GavetaDeNegocios";
import { SumarioDaCampanha } from "@/components/escale/campanhas/detalhe/SumarioDaCampanha";
import { useNegociosDaCampanha } from "@/hooks/escale/useDetalheDaCampanha";
import { csvDosNegocios } from "@/lib/escale/campanhas/detalhe/csv";
import type { DadosDoDetalhe, NegocioDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";
import { baixarCsv } from "@/lib/escale/exportar/baixar";

const SP = "America/Sao_Paulo";
const DADOS: DadosDoDetalhe = {
  campanha: {
    id: "c1",
    nome: "10.09",
    status: "completed",
    numeroId: "n1",
    numerosExtras: [],
    mensagem: "Oi, {{primeiro_nome}}!",
    modelo: null,
    baseLegal: "consent",
    liaRef: null,
    ritmo: { intervaloSegundos: null, tetoDiario: null, tetoHorario: null, janelaInicioHora: null, janelaFimHora: null },
    iniciadaEm: "2026-09-10T15:39:00Z",
    agendadaPara: null,
    criadaEm: "2026-09-10T12:00:00Z",
  },
  sumario: {
    adicionados: 30, enviados: 26, entregues: 23, lidas: 16, respondidas: 10,
    leuSemResposta: 6, erros: 4, naoEnviados: 0, aguardando: 0, foraDaLista: 2,
  },
  ritmo: [{ hora: "2026-09-10T12:00:00", envios: 26 }],
  motivos: [
    { codigo: "131049", quantidade: 2 },
    { codigo: null, quantidade: 1 },
    { codigo: "130429", quantidade: 1 },
  ],
  resultado: {
    negocios: 8, valorAbertoCentavos: 1_468_092, valorGanhoCentavos: 0,
    medianaSegundos: null, benchmark: 0.43, taxaDaCampanha: 0.3333,
  },
  fuso: SP,
};

function montar(dados: DadosDoDetalhe = DADOS) {
  const props = {
    aoVerContatos: vi.fn(),
    aoCriarCampanhaDosNaoEnviados: vi.fn(),
    aoAbrirNegocios: vi.fn(),
  };
  render(<SumarioDaCampanha dados={dados} colunaDireita={<p>coluna</p>} criando={false} {...props} />);
  return props;
}

describe("Sumário: topo, funil, rosca e ritmo (009, 010)", () => {
  it("os 4 cartões, o funil em % sobre enviados, a rosca com o total e a barra do ritmo", () => {
    montar();
    expect(screen.getByText("Adicionados p/ envio")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();
    const funil = screen.getByRole("region", { name: "Funil de conversão" });
    expect(within(funil).getByText("26 · 100%")).toBeInTheDocument();
    expect(within(funil).getByText("16 · 62%")).toBeInTheDocument();
    const rosca = screen.getByRole("region", { name: "Distribuição por status" });
    expect(within(rosca).getByText("30")).toBeInTheDocument();
    expect(within(rosca).getByText("contatos")).toBeInTheDocument();
    expect(within(rosca).getByText("Lida").nextSibling).toHaveTextContent("16");
    expect(within(rosca).queryByText("Aguardando envio")).toBeNull();
    const ritmo = screen.getByRole("region", { name: "Ritmo de envio" });
    expect(within(ritmo).getByText("12:00")).toBeInTheDocument();
    expect(screen.getByText("coluna")).toBeInTheDocument();
  });

  it("ritmo sem envio mostra o vazio", () => {
    montar({ ...DADOS, ritmo: [] });
    expect(within(screen.getByRole("region", { name: "Ritmo de envio" })).getByText("Nenhum envio ainda")).toBeInTheDocument();
  });
});

describe("Sumário: motivos, oportunidade e não enviados (010; C5, C6, C15)", () => {
  it("motivos: o selo, o resumo e a lista ao abrir", async () => {
    montar();
    const motivos = screen.getByRole("region", { name: "Motivos do erro" });
    expect(within(motivos).getByText("4 falhas")).toBeInTheDocument();
    expect(within(motivos).getByText("3 motivos em 4 falhas de envio")).toBeInTheDocument();
    await userEvent.click(within(motivos).getByRole("button", { name: "Ver motivos" }));
    expect(within(motivos).getByText("Meta optou por não entregar")).toBeInTheDocument();
    expect(within(motivos).getByText("2 · 50%")).toBeInTheDocument();
    expect(within(motivos).getByRole("button", { name: "Ocultar motivos" })).toBeInTheDocument();
  });

  it("sem falha, o bloco de motivos some", () => {
    montar({ ...DADOS, sumario: { ...DADOS.sumario, erros: 0 }, motivos: [] });
    expect(screen.queryByRole("region", { name: "Motivos do erro" })).toBeNull();
  });

  it("leu e não respondeu: 23% · 6 e 'Ver contatos' filtra por Lida", async () => {
    const p = montar();
    const bloco = screen.getByRole("region", { name: "Leu e não respondeu" });
    expect(within(bloco).getByText("23%")).toBeInTheDocument();
    expect(within(bloco).getByText("Oportunidade")).toBeInTheDocument();
    await userEvent.click(within(bloco).getByRole("button", { name: "Ver contatos" }));
    expect(p.aoVerContatos).toHaveBeenCalledWith({ situacoes: ["lida"] });
  });

  it("não enviados só com alguém; ver contatos e criar campanha", async () => {
    expect(screen.queryByRole("region", { name: "Não enviados" })).toBeNull();
    const p = montar({ ...DADOS, sumario: { ...DADOS.sumario, naoEnviados: 3 } });
    const bloco = screen.getByRole("region", { name: "Não enviados" });
    await userEvent.click(within(bloco).getByRole("button", { name: "Ver contatos" }));
    expect(p.aoVerContatos).toHaveBeenCalledWith({ situacoes: ["nao_enviado"] });
    await userEvent.click(within(bloco).getByRole("button", { name: "Criar campanha" }));
    expect(p.aoCriarCampanhaDosNaoEnviados).toHaveBeenCalled();
  });
});

describe("Sumário: resultado (011; C7–C9)", () => {
  it("negócios e valores abrem a gaveta; custos com traço; mediana; benchmark abaixo em vermelho; rodapé", async () => {
    const p = montar();
    expect(screen.getByRole("heading", { name: "Resultado" })).toBeInTheDocument();
    expect(screen.getByText("R$ 14.680,92")).toBeInTheDocument();
    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Valor em aberto/ }));
    expect(p.aoAbrirNegocios).toHaveBeenCalledWith("abertos");
    await userEvent.click(screen.getByRole("button", { name: /Negócios criados/ }));
    expect(p.aoAbrirNegocios).toHaveBeenCalledWith("todos");
    expect(screen.getByText("Custo real")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Não foi possível calcular o tempo de resposta.")).toBeInTheDocument();
    expect(screen.getByText("43%")).toBeInTheDocument();
    expect(screen.getByText("33%")).toHaveAttribute("data-tom", "abaixo");
    expect(screen.getByText("Enviado em 10/09/2026 12:39")).toBeInTheDocument();
  });

  it("sem outras campanhas concluídas, o texto da Clint", () => {
    montar({ ...DADOS, resultado: { ...DADOS.resultado, benchmark: null } });
    expect(screen.getByText("Ainda não há outras campanhas concluídas da conta para comparar.")).toBeInTheDocument();
  });
});

const NEGOCIO: NegocioDaCampanha = {
  id: "l1",
  contato: "Elza",
  telefone: "+5553984555965",
  origem: "Vendas",
  status: "won",
  valorCentavos: 150_000,
  criadoEm: "2026-09-11T12:00:00Z",
};

describe("Gaveta 'Negócios criados' (C7; material 2.3)", () => {
  it("o título da situação, a linha, '1 de 1' e o CSV", async () => {
    vi.mocked(useNegociosDaCampanha).mockReturnValue({
      data: { linhas: [NEGOCIO], total: 1 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    render(<GavetaDeNegocios campanhaId="c1" nomeDaCampanha="10.09" situacao="ganhos" aoFechar={vi.fn()} fuso={SP} />);
    const gaveta = screen.getByRole("dialog", { name: "Negócios ganhos criados por esta campanha" });
    expect(within(gaveta).getByText("1 negócios gerados por 10.09")).toBeInTheDocument();
    expect(within(gaveta).getByText("(53) 98455-5965")).toBeInTheDocument();
    expect(within(gaveta).getByText("Ganho")).toBeInTheDocument();
    expect(within(gaveta).getByText("R$ 1.500,00")).toBeInTheDocument();
    expect(within(gaveta).getByText("11/09/2026")).toBeInTheDocument();
    expect(within(gaveta).getByText("1 de 1")).toBeInTheDocument();
    await userEvent.click(within(gaveta).getByRole("button", { name: "Baixar CSV" }));
    expect(baixarCsv).toHaveBeenCalledWith(
      expect.stringMatching(/^negocios-campanha-10-09-\d{4}-\d{2}-\d{2}\.csv$/),
      expect.stringContaining("Elza"),
    );
  });

  it("vazio: os textos da Clint", () => {
    vi.mocked(useNegociosDaCampanha).mockReturnValue({
      data: { linhas: [], total: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    render(<GavetaDeNegocios campanhaId="c1" nomeDaCampanha="10.09" situacao="todos" aoFechar={vi.fn()} />);
    expect(screen.getByText("Nenhum negócio encontrado")).toBeInTheDocument();
    expect(screen.getByText("Os negócios criados por esta campanha aparecerão aqui.")).toBeInTheDocument();
  });

  it("o CSV dos negócios", () => {
    expect(csvDosNegocios([NEGOCIO], (s) => s, SP).split("\r\n")).toEqual([
      "Contato,Telefone,Origem,Status,Valor,Criado em",
      'Elza,(53) 98455-5965,Vendas,Ganho,"1500,00",11/09/2026',
    ]);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-sumario.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 2: O CSV da gaveta em `lib/escale/campanhas/detalhe/csv.ts`**

Acrescente ao arquivo da Task 4 (imports no topo, funções no fim):

```ts
import { celula, reaisDeCentavos } from "@/lib/escale/exportar/csv-do-quadro";

import { ROTULO_DA_SITUACAO, ROTULO_DO_STATUS_DO_NEGOCIO } from "./apresentacao";
import type { LinhaDeDestinatario, NegocioDaCampanha } from "./tipos";
```

(troque as linhas de import equivalentes que já existem; `celula` e `ROTULO_DA_SITUACAO` já estavam importados)

```ts
export const CABECALHO_DO_CSV_DOS_NEGOCIOS = ["Contato", "Telefone", "Origem", "Status", "Valor", "Criado em"] as const;

/** O "Baixar CSV" da gaveta (material 2.3): o que a gaveta mostra, até 200 linhas. */
export function csvDosNegocios(linhas: readonly NegocioDaCampanha[], t: Traduzir, fuso?: string): string {
  const cabecalho = CABECALHO_DO_CSV_DOS_NEGOCIOS.map((c) => t(c));
  const corpo = linhas.map((l) => [
    l.contato,
    formatarTelefone(l.telefone),
    l.origem,
    t(ROTULO_DO_STATUS_DO_NEGOCIO[l.status]),
    l.valorCentavos === null ? "" : reaisDeCentavos(l.valorCentavos),
    dataBr(l.criadoEm, fuso),
  ]);
  return [cabecalho, ...corpo].map((linha) => linha.map(celula).join(",")).join("\r\n");
}
```

- [ ] **Step 3: `RoscaDeStatus.tsx` e `RitmoDeEnvio.tsx`**

`components/escale/campanhas/detalhe/RoscaDeStatus.tsx`:

```tsx
"use client";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { ROTULO_DA_FATIA, fatiasDaRosca, type ChaveDaFatia } from "@/lib/escale/campanhas/detalhe/apresentacao";
import { CLASSE_DA_FATIA, TRACO_DO_TRILHO_DA_ROSCA } from "@/lib/escale/campanhas/detalhe/cores";
import type { SumarioDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";
import { cn } from "@/lib/utils";

const RAIO = 40;
const TRACO = 14;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

type Arco = { chave: ChaveDaFatia; comprimento: number; inicio: number };

/** "DISTRIBUIÇÃO POR STATUS" (009): a rosca de 100px com o total e a legenda com as cores medidas. */
export function RoscaDeStatus({ sumario }: { sumario: SumarioDaCampanha }) {
  const t = useT();
  const fatias = fatiasDaRosca(sumario);
  const total = fatias.reduce((a, f) => a + f.quantidade, 0);
  const arcos = fatias
    .filter((f) => f.quantidade > 0 && total > 0)
    .reduce<Arco[]>((acc, f) => {
      const anterior = acc[acc.length - 1];
      const inicio = anterior ? anterior.inicio + anterior.comprimento : 0;
      return [...acc, { chave: f.chave, comprimento: (f.quantidade / total) * CIRCUNFERENCIA, inicio }];
    }, []);
  return (
    <SecaoDoSumario titulo={t("Distribuição por status")}>
      <div className="flex items-center gap-6">
        <div className="relative size-[100px] shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r={RAIO} fill="none" strokeWidth={TRACO} className={TRACO_DO_TRILHO_DA_ROSCA} />
            {arcos.map((a) => (
              <circle
                key={a.chave}
                data-fatia={a.chave}
                cx="50"
                cy="50"
                r={RAIO}
                fill="none"
                strokeWidth={TRACO}
                strokeDasharray={`${a.comprimento} ${CIRCUNFERENCIA - a.comprimento}`}
                strokeDashoffset={-a.inicio}
                className={CLASSE_DA_FATIA[a.chave].traco}
              />
            ))}
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[18px] leading-5 font-semibold">{numeroBr(total)}</span>
            <span className="text-[11px] text-casca-suave">{t("contatos")}</span>
          </span>
        </div>
        <ul className="space-y-2.5">
          {fatias.map((f) => (
            <li key={f.chave} className="flex items-center gap-2 text-[11px]">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", CLASSE_DA_FATIA[f.chave].fundo)} />
              <span className="w-[80px]">{t(ROTULO_DA_FATIA[f.chave])}</span>
              <span className="font-semibold">{numeroBr(f.quantidade)}</span>
            </li>
          ))}
        </ul>
      </div>
    </SecaoDoSumario>
  );
}
```

`components/escale/campanhas/detalhe/RitmoDeEnvio.tsx`:

```tsx
"use client";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { rotuloDaHora, varreDias } from "@/lib/escale/campanhas/detalhe/apresentacao";
import type { PontoDoRitmo } from "@/lib/escale/campanhas/detalhe/tipos";
import { cn } from "@/lib/utils";

const ALTURA_DAS_BARRAS = 120;
const BARRAS_LARGAS_ATE = 8;

/** "RITMO DE ENVIO" (009, 010): barras por hora na cor da marca, o número em cima e a hora embaixo. */
export function RitmoDeEnvio({ pontos }: { pontos: readonly PontoDoRitmo[] }) {
  const t = useT();
  const maximo = Math.max(1, ...pontos.map((p) => p.envios));
  const variosDias = varreDias(pontos);
  const largura = pontos.length <= BARRAS_LARGAS_ATE ? "w-[72px] shrink-0" : "min-w-3 flex-1";
  return (
    <SecaoDoSumario titulo={t("Ritmo de envio")} legenda={t("Calculado sobre os 1.000 disparos mais recentes.")}>
      {pontos.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-casca-suave">{t("Nenhum envio ainda")}</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex h-[150px] items-end justify-center gap-4 border-b border-casca-divisoria">
            {pontos.map((p) => (
              <div key={p.hora} data-hora={p.hora} className={cn("flex h-full flex-col items-center justify-end", largura)}>
                <span className="mb-1 text-[12px] font-semibold">{numeroBr(p.envios)}</span>
                <div
                  data-barra
                  className="w-full rounded-t-[4px] bg-casca-marca"
                  style={{ height: `${Math.max(2, Math.round((p.envios / maximo) * ALTURA_DAS_BARRAS))}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 pt-2">
            {pontos.map((p) => (
              <span key={p.hora} className={cn("text-center text-[12px] text-casca-suave", largura)}>
                {rotuloDaHora(p.hora, variosDias)}
              </span>
            ))}
          </div>
        </div>
      )}
    </SecaoDoSumario>
  );
}
```

- [ ] **Step 4: `MotivosDoErro.tsx`, `LeuENaoRespondeu.tsx` e `NaoEnviados.tsx`**

`components/escale/campanhas/detalhe/MotivosDoErro.tsx`:

```tsx
"use client";
import { useState } from "react";

import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { porcentoDoMotivo, resumoDosMotivos, seloDasFalhas } from "@/lib/escale/campanhas/detalhe/apresentacao";
import { SEM_CODIGO, textoDoMotivo } from "@/lib/escale/campanhas/detalhe/motivos";
import type { MotivoDoErro } from "@/lib/escale/campanhas/detalhe/tipos";

/** "MOTIVOS DO ERRO" (010): selo vermelho com as falhas, o resumo e "Ver motivos"/"Ocultar motivos". */
export function MotivosDoErro({ motivos, erros }: { motivos: readonly MotivoDoErro[]; erros: number }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  if (erros === 0) return null;
  return (
    <SecaoDoSumario
      titulo={t("Motivos do erro")}
      tituloGrande
      selo={
        <span className="rounded-[4px] bg-(--escale-tom-vermelho-fundo) px-1.5 py-0.5 text-[11px] text-(--escale-tom-vermelho-texto)">
          {seloDasFalhas(erros, t)}
        </span>
      }
      legenda={t("% sobre não entregues")}
    >
      <div className="-mx-4 border-t border-casca-divisoria px-4 pt-3">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span>{resumoDosMotivos(motivos, t)}</span>
          <button
            type="button"
            aria-expanded={aberto}
            onClick={() => setAberto((a) => !a)}
            className="shrink-0 text-[12px] font-medium text-casca-marca hover:underline"
          >
            {aberto ? t("Ocultar motivos") : t("Ver motivos")}
          </button>
        </div>
        {aberto ? (
          <ul className="mt-3 space-y-2">
            {motivos.map((m) => {
              const texto = textoDoMotivo(m.codigo, t);
              return (
                <li key={m.codigo ?? SEM_CODIGO} className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="truncate" title={texto}>
                    {texto}
                  </span>
                  <span className="shrink-0 text-casca-suave">
                    {`${numeroBr(m.quantidade)} · ${porcentoDoMotivo(m.quantidade, motivos) ?? 0}%`}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </SecaoDoSumario>
  );
}
```

`components/escale/campanhas/detalhe/LeuENaoRespondeu.tsx`:

```tsx
"use client";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { leuSemResposta } from "@/lib/escale/campanhas/detalhe/apresentacao";
import type { FiltrosDeDestinatarios } from "@/lib/escale/campanhas/detalhe/filtros";
import type { SumarioDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";

/** "LEU E NÃO RESPONDEU" (010): o percentual sobre enviados, o selo "Oportunidade" e "Ver contatos". */
export function LeuENaoRespondeu({
  sumario,
  aoVerContatos,
}: {
  sumario: SumarioDaCampanha;
  aoVerContatos: (filtros: FiltrosDeDestinatarios) => void;
}) {
  const t = useT();
  const { porcento, quantidade } = leuSemResposta(sumario);
  return (
    <SecaoDoSumario
      titulo={t("Leu e não respondeu")}
      ajuda={t("Contatos que leram a mensagem e ainda não responderam.")}
      direita={
        <span className="shrink-0 rounded-full bg-casca-marca-suave px-2 py-0.5 text-[11px] text-casca-marca">
          {t("Oportunidade")}
        </span>
      }
    >
      <p>
        <span className="text-[18px] font-bold">{porcento === null ? "—" : `${porcento}%`}</span>
        <span className="ml-1 text-[12px] text-casca-suave">· {numeroBr(quantidade)}</span>
      </p>
      <button
        type="button"
        onClick={() => aoVerContatos({ situacoes: ["lida"] })}
        className="mt-2 text-[12px] font-medium text-casca-marca hover:underline"
      >
        {t("Ver contatos")}
      </button>
    </SecaoDoSumario>
  );
}
```

`components/escale/campanhas/detalhe/NaoEnviados.tsx`:

```tsx
"use client";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import type { FiltrosDeDestinatarios } from "@/lib/escale/campanhas/detalhe/filtros";

/** "NÃO ENVIADOS" (material 2.3; C15): só com alguém; "Ver contatos" e "Criar campanha" para eles. */
export function NaoEnviados({
  quantidade,
  aoVerContatos,
  aoCriarCampanha,
  criando,
}: {
  quantidade: number;
  aoVerContatos: (filtros: FiltrosDeDestinatarios) => void;
  aoCriarCampanha: () => void;
  criando: boolean;
}) {
  const t = useT();
  if (quantidade === 0) return null;
  const link = "text-[12px] font-medium text-casca-marca hover:underline disabled:opacity-60";
  return (
    <SecaoDoSumario
      titulo={t("Não enviados")}
      ajuda={t("Contatos que não receberam a mensagem por cancelamento, interrupção ou linha inválida.")}
    >
      <p className="text-[18px] font-bold">{numeroBr(quantidade)}</p>
      <div className="mt-2 flex gap-4">
        <button type="button" onClick={() => aoVerContatos({ situacoes: ["nao_enviado"] })} className={link}>
          {t("Ver contatos")}
        </button>
        <button type="button" disabled={criando} onClick={aoCriarCampanha} className={link}>
          {t("Criar campanha")}
        </button>
      </div>
    </SecaoDoSumario>
  );
}
```

- [ ] **Step 5: `ResultadoDaCampanha.tsx`**

```tsx
"use client";
import { CartaoDoSumario } from "@/components/escale/campanhas/molde/CartaoDoSumario";
import { TituloDaSecao } from "@/components/escale/campanhas/molde/TituloDaSecao";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import {
  comparacaoDoBenchmark,
  reaisBr,
  textoDoTempoMediano,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import type { ResultadoDaCampanha as Resultado, SituacaoDosNegocios } from "@/lib/escale/campanhas/detalhe/tipos";

/**
 * "RESULTADO" (011; C7–C9): negócios e valores (abrem a gaveta), custos
 * preparados com "—" (R4), tempo mediano até a resposta e o benchmark da conta
 * ("Esta campanha" em vermelho abaixo da média, em verde igual ou acima).
 */
export function ResultadoDaCampanha({
  resultado,
  aoAbrirNegocios,
}: {
  resultado: Resultado;
  aoAbrirNegocios: (situacao: SituacaoDosNegocios) => void;
}) {
  const t = useT();
  const c = comparacaoDoBenchmark(resultado);
  return (
    <>
      <TituloDaSecao>{t("Resultado")}</TituloDaSecao>
      <div className="grid grid-cols-3 gap-3">
        <CartaoDoSumario
          rotulo={t("Negócios criados")}
          dica={t("Negócios que nasceram desta campanha.")}
          valor={numeroBr(resultado.negocios)}
          tamanho="lg"
          aoClicar={() => aoAbrirNegocios("todos")}
        />
        <CartaoDoSumario
          rotulo={t("Valor em aberto")}
          dica={t("Soma dos negócios em aberto desta campanha.")}
          valor={reaisBr(resultado.valorAbertoCentavos)}
          tamanho="lg"
          aoClicar={() => aoAbrirNegocios("abertos")}
        />
        <CartaoDoSumario
          rotulo={t("Valor ganho")}
          dica={t("Soma dos negócios ganhos desta campanha.")}
          valor={reaisBr(resultado.valorGanhoCentavos)}
          tamanho="lg"
          aoClicar={() => aoAbrirNegocios("ganhos")}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <CartaoDoSumario rotulo={t("Custo da campanha")} subtitulo={t("Custo real")} tamanho="lg" />
        <CartaoDoSumario rotulo={t("Custo por resposta")} dica={t("Custo real dividido pelas respostas.")} tamanho="lg" />
        <CartaoDoSumario rotulo={t("Custo por negócio")} dica={t("Custo real dividido pelos negócios criados.")} tamanho="lg" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <CartaoDoSumario rotulo={t("Tempo mediano até resposta")} dica={t("Metade das respostas chegou antes deste tempo.")}>
          {resultado.medianaSegundos === null ? (
            <span className="text-[13px]">{textoDoTempoMediano(null, t)}</span>
          ) : (
            <span className="text-[18px] font-bold">{textoDoTempoMediano(resultado.medianaSegundos, t)}</span>
          )}
        </CartaoDoSumario>
        <CartaoDoSumario
          rotulo={t("Benchmark da conta")}
          dica={t("Média da taxa de resposta das 5 últimas campanhas concluídas.")}
        >
          {c.media === null ? (
            <span className="text-[13px]">{t("Ainda não há outras campanhas concluídas da conta para comparar.")}</span>
          ) : (
            <span className="block">
              <span className="block text-[18px] font-bold">{`${c.media}%`}</span>
              <span className="mt-1 block text-[11px] text-casca-suave">
                {t("Esta campanha")}{" "}
                <span
                  data-tom={c.abaixo ? "abaixo" : "acima"}
                  className={c.abaixo ? "font-medium text-casca-alerta" : "font-medium text-(--escale-tom-verde-texto)"}
                >
                  {c.estaCampanha === null ? "—" : `${c.estaCampanha}%`}
                </span>
              </span>
            </span>
          )}
        </CartaoDoSumario>
      </div>
    </>
  );
}
```

- [ ] **Step 6: `GavetaDeNegocios.tsx`**

```tsx
"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useNegociosDaCampanha } from "@/hooks/escale/useDetalheDaCampanha";
import { useT } from "@/hooks/i18n/useT";
import { dataBr, numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { ROTULO_DO_STATUS_DO_NEGOCIO, TITULO_DA_GAVETA, reaisBr } from "@/lib/escale/campanhas/detalhe/apresentacao";
import { csvDosNegocios, nomeDoCsvDaCampanha } from "@/lib/escale/campanhas/detalhe/csv";
import type { SituacaoDosNegocios } from "@/lib/escale/campanhas/detalhe/tipos";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { baixarCsv } from "@/lib/escale/exportar/baixar";
import { X } from "@/lib/ui/icons-da-casca";

const COLUNAS = ["Contato", "Telefone", "Origem", "Status", "Valor", "Criado em"] as const;

/**
 * A GAVETA "NEGÓCIOS CRIADOS" (material 2.3; N5; sem print, provisória): à
 * direita, 720px; o título da situação, "{n} negócios gerados por {campanha}",
 * a tabela (até 200), "{n} de {total}", "Baixar CSV" e "Fechar".
 */
export function GavetaDeNegocios({
  campanhaId,
  nomeDaCampanha,
  situacao,
  aoFechar,
  fuso,
}: {
  campanhaId: string;
  nomeDaCampanha: string;
  situacao: SituacaoDosNegocios | null;
  aoFechar: () => void;
  fuso?: string;
}) {
  const t = useT();
  const consulta = useNegociosDaCampanha(campanhaId, situacao ?? "todos", situacao !== null);
  const linhas = consulta.data?.linhas ?? [];
  const total = consulta.data?.total ?? 0;
  const botao =
    "inline-flex h-8 items-center rounded-casca-gatilho px-3.5 text-[13px] font-medium transition-colors disabled:opacity-60";
  return (
    <DialogPrimitive.Root open={situacao !== null} onOpenChange={(a) => !a && aoFechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/30" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-[min(720px,100vw)] flex-col bg-surface text-casca-texto shadow-casca-painel focus:outline-none"
        >
          <header className="flex items-start justify-between gap-4 border-b border-casca-divisoria px-6 py-4">
            <div>
              <DialogTitle className="text-[16px] font-semibold">{t(TITULO_DA_GAVETA[situacao ?? "todos"])}</DialogTitle>
              <p className="mt-1 text-[12px] text-casca-suave">
                {t("{n} negócios gerados por {campanha}").replace("{n}", numeroBr(total)).replace("{campanha}", nomeDaCampanha)}
              </p>
            </div>
            <DialogPrimitive.Close
              aria-label={t("Fechar")}
              className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
            >
              <X size={18} aria-hidden />
            </DialogPrimitive.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {consulta.isError ? (
              <div className="py-10 text-center text-[13px]">
                <p>{t("Não foi possível carregar os negócios.")}</p>
                <button type="button" onClick={() => void consulta.refetch()} className="mt-2 font-medium text-casca-marca">
                  {t("Tentar novamente")}
                </button>
              </div>
            ) : !consulta.isLoading && linhas.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[14px] font-semibold">{t("Nenhum negócio encontrado")}</p>
                <p className="mt-1 text-[13px] text-casca-suave">{t("Os negócios criados por esta campanha aparecerão aqui.")}</p>
              </div>
            ) : (
              <table className="w-full table-fixed text-[12px]">
                <thead>
                  <tr className="h-10 border-b border-casca-divisoria text-left text-[10px] font-semibold tracking-[0.1em] uppercase">
                    {COLUNAS.map((c) => (
                      <th key={c} scope="col" className="pr-3">
                        {t(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.id} className="h-11 border-b border-casca-divisoria">
                      <td className="truncate pr-3">{l.contato}</td>
                      <td className="pr-3">{formatarTelefone(l.telefone) || "-"}</td>
                      <td className="truncate pr-3">{l.origem}</td>
                      <td className="pr-3">{t(ROTULO_DO_STATUS_DO_NEGOCIO[l.status])}</td>
                      <td className="pr-3">{reaisBr(l.valorCentavos)}</td>
                      <td>{dataBr(l.criadoEm, fuso)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-casca-divisoria px-6 py-3">
            <span className="text-[13px]">
              {t("{n} de {total}").replace("{n}", numeroBr(linhas.length)).replace("{total}", numeroBr(total))}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                disabled={linhas.length === 0}
                onClick={() =>
                  baixarCsv(`negocios-${nomeDoCsvDaCampanha(nomeDaCampanha, new Date(), fuso)}`, csvDosNegocios(linhas, t, fuso))
                }
                className={`${botao} border border-casca-borda bg-surface hover:bg-casca-raia`}
              >
                {t("Baixar CSV")}
              </button>
              <button type="button" onClick={aoFechar} className={`${botao} bg-casca-marca text-white hover:bg-casca-marca-forte`}>
                {t("Fechar")}
              </button>
            </span>
          </footer>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
```

- [ ] **Step 7: `SumarioDaCampanha.tsx`**

```tsx
"use client";
import type { ReactNode } from "react";

import { CartaoDoSumario } from "@/components/escale/campanhas/molde/CartaoDoSumario";
import { FunilDeConversao } from "@/components/escale/campanhas/molde/FunilDeConversao";
import { CLASSE_DO_BLOCO } from "@/components/escale/campanhas/molde/estilos";
import { useT } from "@/hooks/i18n/useT";
import { cartoesDoTopo, etapasDoFunil, rodapeDoSumario } from "@/lib/escale/campanhas/detalhe/apresentacao";
import type { FiltrosDeDestinatarios } from "@/lib/escale/campanhas/detalhe/filtros";
import type { DadosDoDetalhe, SituacaoDosNegocios } from "@/lib/escale/campanhas/detalhe/tipos";

import { LeuENaoRespondeu } from "./LeuENaoRespondeu";
import { MotivosDoErro } from "./MotivosDoErro";
import { NaoEnviados } from "./NaoEnviados";
import { ResultadoDaCampanha } from "./ResultadoDaCampanha";
import { RitmoDeEnvio } from "./RitmoDeEnvio";
import { RoscaDeStatus } from "./RoscaDeStatus";

/**
 * A ABA SUMÁRIO (009–011): à esquerda os cartões, o funil e a rosca, o ritmo,
 * os motivos, "Leu e não respondeu", "Não enviados", RESULTADO e "Enviado em";
 * à direita (340px, presa no topo) a coluna da mensagem.
 */
export function SumarioDaCampanha({
  dados,
  colunaDireita,
  aoVerContatos,
  aoCriarCampanhaDosNaoEnviados,
  criando,
  aoAbrirNegocios,
}: {
  dados: DadosDoDetalhe;
  colunaDireita: ReactNode;
  aoVerContatos: (filtros: FiltrosDeDestinatarios) => void;
  aoCriarCampanhaDosNaoEnviados: () => void;
  criando: boolean;
  aoAbrirNegocios: (situacao: SituacaoDosNegocios) => void;
}) {
  const t = useT();
  const s = dados.sumario;
  return (
    <div className="flex gap-8 px-8 py-4">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {cartoesDoTopo(s).map((c) => (
            <CartaoDoSumario key={c.chave} rotulo={t(c.rotulo)} dica={t(c.dica)} valor={c.valor} complemento={c.complemento} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FunilDeConversao etapas={etapasDoFunil(s).map((e) => ({ ...e, rotulo: t(e.rotulo) }))} />
          <RoscaDeStatus sumario={s} />
        </div>
        <RitmoDeEnvio pontos={dados.ritmo} />
        <MotivosDoErro motivos={dados.motivos} erros={s.erros} />
        <LeuENaoRespondeu sumario={s} aoVerContatos={aoVerContatos} />
        <NaoEnviados
          quantidade={s.naoEnviados}
          aoVerContatos={aoVerContatos}
          aoCriarCampanha={aoCriarCampanhaDosNaoEnviados}
          criando={criando}
        />
        <ResultadoDaCampanha resultado={dados.resultado} aoAbrirNegocios={aoAbrirNegocios} />
        <p className="pt-4 text-[12px]">{rodapeDoSumario(dados.campanha, t, dados.fuso)}</p>
      </div>
      <aside className="w-[340px] shrink-0">
        <div className="sticky top-4 space-y-4">{colunaDireita}</div>
      </aside>
    </div>
  );
}

/** Carregando (material 2.3): esqueletos nos cartões e nos blocos. */
export function SumarioCarregando() {
  const t = useT();
  return (
    <div aria-busy="true" aria-label={t("Carregando campanha")} className="space-y-3 px-8 py-4">
      <div className="grid grid-cols-4 gap-3">
        {["a", "b", "c", "d"].map((k) => (
          <CartaoDoSumario key={k} rotulo="" carregando />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={`${CLASSE_DO_BLOCO} h-[260px] animate-pulse`} />
        <div className={`${CLASSE_DO_BLOCO} h-[260px] animate-pulse`} />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-sumario.test.tsx tests/unit/escale-detalhe-da-campanha-csv.test.ts && corepack pnpm prettier --write components/escale/campanhas/detalhe tests/unit/escale-detalhe-da-campanha-sumario.test.tsx lib/escale/campanhas/detalhe/csv.ts && corepack pnpm eslint components/escale/campanhas/detalhe lib/escale/campanhas/detalhe && corepack pnpm typecheck`
Expected: PASS. A dica do "?" usa `role="img"`: se dois cartões tiverem a mesma dica ("Percentual sobre os enviados."), o teste não depende dela.

- [ ] **Step 9: Commit**

```bash
git add components/escale/campanhas/detalhe lib/escale/campanhas/detalhe/csv.ts tests/unit/escale-detalhe-da-campanha-sumario.test.tsx
git commit -m "feat(escale): aba Sumário do detalhe — cartões, funil, rosca, ritmo, motivos, resultado e a gaveta de negócios (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 9: A coluna da mensagem (prévia, modelo, dispositivo e Entrega)

**Files:**
- Create: `components/escale/campanhas/detalhe/ColunaDaMensagem.tsx`, `components/escale/campanhas/detalhe/JanelaDoRitmo.tsx`, `tests/unit/escale-detalhe-da-campanha-coluna.test.tsx`

**Interfaces:**
- Consumes: `PreviaDoCelular`, `CLASSE_DO_BLOCO` (Task 7); `partesDaMensagem`, `ROTULO_DA_CATEGORIA`, `siglaDoIdioma`, `textosDoRitmo`, `textoDaBaseLegal`, `camposDoRitmo`, `validarRitmo` (Task 1); `useRitmoDaCampanha` (Task 6); `JanelaDaCasca`, `CabecaDaJanela`, `Campo`, `CampoDeTexto`, `BotaoDaJanela`, `RodapeDaJanela` (`components/escale/origens/JanelaDaCasca.tsx`); `dataEHoraBr` (8A); `ehTerminal` (`lib/campanhas/maquina-de-estados.ts`).
- Produces: `ColunaDaMensagem({ campanha, nomeDoNumero, fuso? })`, `JanelaDoRitmo({ aberta, campanhaId, ritmo, aoFechar })`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-detalhe-da-campanha-coluna.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const salvar = vi.fn();
vi.mock("@/hooks/escale/useDetalheDaCampanha", () => ({
  useRitmoDaCampanha: () => ({ mutateAsync: salvar, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ColunaDaMensagem } from "@/components/escale/campanhas/detalhe/ColunaDaMensagem";
import type { InfoDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";

const CAMPANHA: InfoDaCampanha = {
  id: "c1",
  nome: "10.09",
  status: "running",
  numeroId: "n1",
  numerosExtras: ["n2"],
  mensagem: "Oi, {{primeiro_nome}}!",
  modelo: { nome: "msg1_ancca", idioma: "pt_BR", categoria: "MARKETING" },
  baseLegal: "legitimate_interest",
  liaRef: "LIA-2026-01",
  ritmo: { intervaloSegundos: 30, tetoDiario: null, tetoHorario: null, janelaInicioHora: 8, janelaFimHora: 20 },
  iniciadaEm: "2026-09-10T17:59:00Z",
  agendadaPara: null,
  criadaEm: "2026-09-10T12:00:00Z",
};
const nomes: Record<string, string> = { n1: "Naiara", n2: "Reserva" };
const nomeDoNumero = (id: string) => nomes[id] ?? "—";

describe("a coluna da mensagem (009, 010; C10, C13)", () => {
  it("a prévia com a conta e a hora; o modelo com o idioma e a categoria; o dispositivo", () => {
    render(<ColunaDaMensagem campanha={CAMPANHA} nomeDoNumero={nomeDoNumero} fuso="America/Sao_Paulo" />);
    expect(screen.getAllByText("Naiara").length).toBe(2);
    expect(screen.getAllByText("14:59").length).toBeGreaterThan(0);
    expect(screen.getByText("Modelo utilizado")).toBeInTheDocument();
    expect(screen.getByText("msg1_ancca")).toBeInTheDocument();
    expect(screen.getByText("BR")).toBeInTheDocument();
    expect(screen.getByText("Marketing")).toBeInTheDocument();
    expect(screen.getByText("Dispositivo de envio")).toBeInTheDocument();
  });

  it("sem modelo, o texto da Clint", () => {
    render(<ColunaDaMensagem campanha={{ ...CAMPANHA, modelo: null }} nomeDoNumero={nomeDoNumero} />);
    expect(screen.getByText("Esta campanha envia uma mensagem livre, sem modelo aprovado.")).toBeInTheDocument();
  });

  it("Entrega: o ritmo, os números extras e a base legal; Editar só enquanto não terminou", () => {
    const { rerender } = render(<ColunaDaMensagem campanha={CAMPANHA} nomeDoNumero={nomeDoNumero} />);
    const entrega = screen.getByRole("region", { name: "Entrega" });
    expect(within(entrega).getByText("30 s")).toBeInTheDocument();
    expect(within(entrega).getByText("08h às 20h")).toBeInTheDocument();
    expect(within(entrega).getByText("Reserva")).toBeInTheDocument();
    expect(within(entrega).getByText("Interesse legítimo (LIA-2026-01)")).toBeInTheDocument();
    expect(within(entrega).getByRole("button", { name: "Editar" })).toBeInTheDocument();
    rerender(<ColunaDaMensagem campanha={{ ...CAMPANHA, status: "completed" }} nomeDoNumero={nomeDoNumero} />);
    expect(within(screen.getByRole("region", { name: "Entrega" })).queryByRole("button", { name: "Editar" })).toBeNull();
  });

  it("editar o ritmo: valida e salva pelo PATCH do original", async () => {
    salvar.mockResolvedValue({});
    render(<ColunaDaMensagem campanha={CAMPANHA} nomeDoNumero={nomeDoNumero} />);
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const janela = screen.getByRole("dialog", { name: "Ritmo de envio" });
    const intervalo = within(janela).getByLabelText("Intervalo entre mensagens (segundos)");
    await userEvent.clear(intervalo);
    await userEvent.type(intervalo, "0");
    await userEvent.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(within(janela).getByText("O intervalo vai de 1 a 86.400 segundos.")).toBeInTheDocument();
    expect(salvar).not.toHaveBeenCalled();
    await userEvent.clear(intervalo);
    await userEvent.type(intervalo, "45");
    await userEvent.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(salvar).toHaveBeenCalledWith({
      intervalo_segundos: 45,
      teto_diario: null,
      teto_horario: null,
      janela_inicio_hora: 8,
      janela_fim_hora: 20,
    });
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-coluna.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 2: `components/escale/campanhas/detalhe/JanelaDoRitmo.tsx`**

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  Campo,
  CampoDeTexto,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { useRitmoDaCampanha } from "@/hooks/escale/useDetalheDaCampanha";
import { useT } from "@/hooks/i18n/useT";
import { camposDoRitmo, validarRitmo, type CamposDoRitmo } from "@/lib/escale/campanhas/detalhe/ritmo";
import type { RitmoDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";

const CAMPOS: Array<{ chave: keyof CamposDoRitmo; rotulo: string }> = [
  { chave: "intervalo", rotulo: "Intervalo entre mensagens (segundos)" },
  { chave: "tetoDiario", rotulo: "Teto por dia" },
  { chave: "tetoHorario", rotulo: "Teto por hora" },
  { chave: "janelaInicio", rotulo: "Janela: começa às (hora)" },
  { chave: "janelaFim", rotulo: "Janela: termina às (hora)" },
];

/**
 * "RITMO DE ENVIO" — editar (N8; o original deixa ajustar o ritmo em qualquer
 * estado vivo): a janela da casca, vazio = o do número; salva pelo PATCH do
 * original, que confere de novo e só deixa ir mais devagar que o número.
 */
export function JanelaDoRitmo({
  aberta,
  campanhaId,
  ritmo,
  aoFechar,
}: {
  aberta: boolean;
  campanhaId: string;
  ritmo: RitmoDaCampanha;
  aoFechar: () => void;
}) {
  const t = useT();
  const salvar = useRitmoDaCampanha(campanhaId);
  const [campos, setCampos] = useState<CamposDoRitmo>(() => camposDoRitmo(ritmo));
  const [erro, setErro] = useState<string | null>(null);

  const fechar = () => {
    setCampos(camposDoRitmo(ritmo));
    setErro(null);
    aoFechar();
  };

  async function enviar() {
    const v = validarRitmo(campos);
    if (!v.ok) {
      setErro(t(v.erro));
      return;
    }
    try {
      await salvar.mutateAsync(v.corpo);
      toast.success(t("Ritmo atualizado."));
      fechar();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("Não foi possível salvar o ritmo. Tente novamente."));
    }
  }

  return (
    <JanelaDaCasca aberta={aberta} onFechar={fechar}>
      <CabecaDaJanela titulo={t("Ritmo de envio")} descricao={t("Deixe vazio para usar o do número.")} />
      <div className="grid gap-4">
        {CAMPOS.map((c) => (
          <Campo key={c.chave} rotulo={t(c.rotulo)}>
            <CampoDeTexto
              aria-label={t(c.rotulo)}
              inputMode="numeric"
              value={campos[c.chave]}
              onChange={(e) => setCampos((atual) => ({ ...atual, [c.chave]: e.target.value }))}
            />
          </Campo>
        ))}
        {erro ? (
          <p role="alert" className="text-[12px] text-casca-alerta">
            {erro}
          </p>
        ) : null}
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={fechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" disabled={salvar.isPending} onClick={() => void enviar()}>
          {t("Salvar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

- [ ] **Step 3: `components/escale/campanhas/detalhe/ColunaDaMensagem.tsx`**

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { CLASSE_DO_BLOCO } from "@/components/escale/campanhas/molde/estilos";
import { PreviaDoCelular } from "@/components/escale/campanhas/molde/PreviaDoCelular";
import { useT } from "@/hooks/i18n/useT";
import { ehTerminal } from "@/lib/campanhas/maquina-de-estados";
import { dataEHoraBr } from "@/lib/escale/campanhas/apresentacao";
import { ROTULO_DA_CATEGORIA, partesDaMensagem, siglaDoIdioma } from "@/lib/escale/campanhas/detalhe/mensagem";
import { textoDaBaseLegal, textosDoRitmo } from "@/lib/escale/campanhas/detalhe/ritmo";
import type { InfoDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";
import { FileText, Smartphone } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { JanelaDoRitmo } from "./JanelaDoRitmo";

function LinhaDaColuna({ icone, rotulo, children }: { icone: ReactNode; rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[6px] bg-casca-busca text-casca-marca">
        {icone}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] text-casca-suave">{rotulo}</span>
        <span className="mt-0.5 block">{children}</span>
      </span>
    </div>
  );
}

/**
 * A COLUNA DIREITA DO SUMÁRIO (009, 010; C10, C13): a prévia do celular, o
 * cartão "Modelo utilizado" + "Dispositivo de envio" e o bloco "Entrega" do
 * original (ritmo editável, números extras, base legal). Sem "Ver fluxo
 * completo": a campanha é só de disparo (R6).
 */
export function ColunaDaMensagem({
  campanha,
  nomeDoNumero,
  fuso,
}: {
  campanha: InfoDaCampanha;
  nomeDoNumero: (id: string) => string;
  fuso?: string;
}) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const hora = campanha.iniciadaEm ? dataEHoraBr(campanha.iniciadaEm, fuso).slice(-5) : "--:--";
  const sigla = siglaDoIdioma(campanha.modelo?.idioma ?? null);
  const categoria = campanha.modelo?.categoria ?? null;
  const linha = "flex justify-between gap-3";
  return (
    <>
      <PreviaDoCelular nomeDaConta={nomeDoNumero(campanha.numeroId)} partes={partesDaMensagem(campanha.mensagem)} hora={hora} />
      <div className={cn(CLASSE_DO_BLOCO, "divide-y divide-casca-divisoria p-0")}>
        <LinhaDaColuna icone={<FileText size={16} />} rotulo={t("Modelo utilizado")}>
          {campanha.modelo ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-[14px]">{campanha.modelo.nome}</span>
              {sigla ? <span className="rounded-[3px] bg-casca-busca px-1 text-[9px] font-semibold">{sigla}</span> : null}
              {categoria ? (
                <span className="rounded-full bg-casca-marca-suave px-2 py-0.5 text-[11px] text-casca-marca">
                  {t(ROTULO_DA_CATEGORIA[categoria] ?? categoria)}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-[13px] text-casca-suave">{t("Esta campanha envia uma mensagem livre, sem modelo aprovado.")}</span>
          )}
        </LinhaDaColuna>
        <LinhaDaColuna icone={<Smartphone size={16} />} rotulo={t("Dispositivo de envio")}>
          <span className="text-[14px]">{nomeDoNumero(campanha.numeroId)}</span>
        </LinhaDaColuna>
      </div>
      <section aria-label={t("Entrega")} className={CLASSE_DO_BLOCO}>
        <header className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold">{t("Entrega")}</h3>
          {!ehTerminal(campanha.status) ? (
            <button type="button" onClick={() => setEditando(true)} className="text-[12px] font-medium text-casca-marca hover:underline">
              {t("Editar")}
            </button>
          ) : null}
        </header>
        <dl className="mt-3 space-y-2 text-[12px]">
          {textosDoRitmo(campanha.ritmo, t).map((x) => (
            <div key={x.rotulo} className={linha}>
              <dt className="text-casca-suave">{x.rotulo}</dt>
              <dd>{x.valor}</dd>
            </div>
          ))}
          <div className={linha}>
            <dt className="text-casca-suave">{t("Números extras")}</dt>
            <dd className="text-right">
              {campanha.numerosExtras.length > 0 ? campanha.numerosExtras.map(nomeDoNumero).join(", ") : t("Nenhum")}
            </dd>
          </div>
          <div className={linha}>
            <dt className="text-casca-suave">{t("Base legal")}</dt>
            <dd className="text-right">{textoDaBaseLegal(campanha.baseLegal, campanha.liaRef, t)}</dd>
          </div>
        </dl>
      </section>
      <JanelaDoRitmo
        key={editando ? "aberta" : "fechada"}
        aberta={editando}
        campanhaId={campanha.id}
        ritmo={campanha.ritmo}
        aoFechar={() => setEditando(false)}
      />
    </>
  );
}
```

- [ ] **Step 4: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-coluna.test.tsx && corepack pnpm prettier --write components/escale/campanhas/detalhe/ColunaDaMensagem.tsx components/escale/campanhas/detalhe/JanelaDoRitmo.tsx tests/unit/escale-detalhe-da-campanha-coluna.test.tsx && corepack pnpm eslint components/escale/campanhas/detalhe && corepack pnpm typecheck`
Expected: PASS. Se `getAllByText("Naiara").length` der 3 (o nome também no cabeçalho da prévia e no dispositivo, mais algum `title`), troque para `toBeGreaterThanOrEqual(2)`.

- [ ] **Step 5: Commit**

```bash
git add components/escale/campanhas/detalhe/ColunaDaMensagem.tsx components/escale/campanhas/detalhe/JanelaDoRitmo.tsx tests/unit/escale-detalhe-da-campanha-coluna.test.tsx
git commit -m "feat(escale): coluna da mensagem do detalhe — prévia, modelo, dispositivo e Entrega com o ritmo editável (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 10: A aba Detalhes (busca, filtros, colunas, tabela, seleção e ações em massa)

**Files:**
- Create: `components/escale/campanhas/detalhe/{SeloDaSituacao,PainelDeFiltrosDosDestinatarios,PainelDeColunasDosDestinatarios,TabelaDeDestinatarios,BarraDaSelecaoDaCampanha,DetalhesDaCampanha}.tsx`, `tests/unit/escale-detalhe-da-campanha-detalhes.test.tsx`
- Modify: `components/escale/contatos/massa/FaixaDaSelecao.tsx` (prop opcional `rotuloDeTodos`), `components/escale/ui/PaginacaoDaCasca.tsx` (prop opcional `legenda`)

**Interfaces:**
- Consumes: as regras (Task 1); `useDestinatariosDaCampanha`, `useMassaDaCampanha` (Task 6); `alvoDaSelecaoDaCampanha` (Task 5); `useSelecaoDaLista` (2B); `FaixaDaSelecao`, `PainelDeTag`, `JanelaCriarNegocios`, `BOTAO_DA_BARRA_DE_LOTE`, `avisoNaFila` (2B, `components/escale/contatos/massa/`); `OrigemParaCriar` (2A); `SeletorDoFiltro` (3D); `CaixaDaCasca`, `BotaoDaCasca`, `PainelSuspenso`, `PaginacaoDaCasca`, `JanelaDeConfirmacao` (casca); `DicaAoPassar` (8A); `CLASSE_DO_TOM` (8A); `rotaDoRascunho` (8A/8B); `ESPERA_DA_BUSCA_MS` (8A).
- Produces: `SeloDaSituacao({ situacao, motivo })`, `PainelDeFiltrosDosDestinatarios({ filtros, motivos, aoAplicar })`, `PainelDeColunasDosDestinatarios({ visiveis, aoMudar })`, `TabelaDeDestinatarios({ linhas, colunas, carregando, erro, filtrando, aguardando, estadoDaPagina, marcada, aoAlternar, aoMarcarPagina, primeiro, fuso?, aoLimparFiltros, aoTentarDeNovo })`, `BarraDaSelecaoDaCampanha({ quantidade, podeTirar, ocupado, aoAplicarTag, aoCriarNegocio, aoCriarCampanha, aoExcluir, aoLimpar })`, `DetalhesDaCampanha({ campanha, sumario, motivos, filtros, aoMudarFiltros, origens, fuso? })`.

- [ ] **Step 1: As duas props opcionais dos componentes da 2A/2B**

Em `components/escale/contatos/massa/FaixaDaSelecao.tsx`:
1. Na lista de props, depois de `aoLimpar,` (no destructuring) acrescente `rotuloDeTodos,`; no tipo, depois de `aoLimpar: () => void;`, acrescente:
   ```ts
     /** FORK ESCALE · Fase 8C: o texto do link de todos ("…contatos filtrados", nos Detalhes da campanha). */
     rotuloDeTodos?: string;
   ```
2. Troque `{t("Selecionar todos os {total} contatos").replace("{total}", totalBr)}` por `{rotuloDeTodos ?? t("Selecionar todos os {total} contatos").replace("{total}", totalBr)}`.

Em `components/escale/ui/PaginacaoDaCasca.tsx`:
1. Acrescente `import type { ReactNode } from "react";` no topo, `legenda,` no destructuring e, no tipo, `/** FORK ESCALE · Fase 8C: "1 a 20 de 30 contatos" à esquerda do "por página" (012). */ legenda?: ReactNode;`.
2. Troque o `<SeletorDaCasca … className="h-8 w-[180px]" />` por:
   ```tsx
      <div className="flex items-center gap-4">
        {legenda ? <span className="text-[13px] text-casca-texto">{legenda}</span> : null}
        <SeletorDaCasca
          valor={String(porPagina)}
          opcoes={opcoes}
          aoMudar={(v) => v && aoMudarPorPagina(Number(v))}
          aria-label={t("Por página")}
          className="h-8 w-[180px]"
        />
      </div>
   ```

- [ ] **Step 2: O teste (falha)**

`tests/unit/escale-detalhe-da-campanha-detalhes.test.tsx`:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const mutateAsync = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useDetalheDaCampanha", () => ({
  useDestinatariosDaCampanha: vi.fn(),
  useMassaDaCampanha: () => ({ mutateAsync, isPending: false }),
}));
vi.mock("@/components/escale/contatos/massa/PainelDeTag", () => ({
  PainelDeTag: ({ aoAplicar }: { aoAplicar: (a: "incluir_tag", tag: string) => Promise<boolean> }) => (
    <button type="button" onClick={() => void aoAplicar("incluir_tag", "vip")}>
      Adicionar tag
    </button>
  ),
}));
vi.mock("@/components/escale/contatos/massa/JanelaCriarNegocios", () => ({
  JanelaCriarNegocios: () => null,
}));

import { DetalhesDaCampanha } from "@/components/escale/campanhas/detalhe/DetalhesDaCampanha";
import { useDestinatariosDaCampanha } from "@/hooks/escale/useDetalheDaCampanha";
import type { InfoDaCampanha, LinhaDeDestinatario, SumarioDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";
import { rotaDoRascunho } from "@/lib/escale/campanhas/rotas";

const R1 = "e5ca1e00-8c00-4000-8000-0000000000d1";
const LINHA: LinhaDeDestinatario = {
  id: R1,
  contatoId: "k1",
  telefone: "+5553984555965",
  nome: "Elza Maria",
  email: null,
  situacao: "lida",
  motivo: null,
  enviadoEm: "2026-09-10T15:40:00Z",
};
const CAMPANHA = {
  id: "c1",
  nome: "10.09",
  status: "completed",
  numeroId: "n1",
  numerosExtras: [],
  mensagem: null,
  modelo: null,
  baseLegal: "consent",
  liaRef: null,
  ritmo: { intervaloSegundos: null, tetoDiario: null, tetoHorario: null, janelaInicioHora: null, janelaFimHora: null },
  iniciadaEm: null,
  agendadaPara: null,
  criadaEm: "2026-09-10T12:00:00Z",
} as InfoDaCampanha;
const SUMARIO = { enviados: 26 } as SumarioDaCampanha;

function montar(extra: { status?: InfoDaCampanha["status"]; enviados?: number; filtros?: object } = {}) {
  const aoMudarFiltros = vi.fn();
  render(
    <DetalhesDaCampanha
      campanha={{ ...CAMPANHA, status: extra.status ?? "completed" }}
      sumario={{ ...SUMARIO, enviados: extra.enviados ?? 26 }}
      motivos={[{ codigo: "131049", quantidade: 2 }]}
      filtros={extra.filtros ?? {}}
      aoMudarFiltros={aoMudarFiltros}
      origens={[]}
      fuso="America/Sao_Paulo"
    />,
  );
  return { aoMudarFiltros };
}

beforeEach(() => {
  push.mockReset();
  mutateAsync.mockReset();
  window.localStorage.clear();
  vi.mocked(useDestinatariosDaCampanha).mockReturnValue({
    data: { linhas: [LINHA], total: 30, pagina: 1, porPagina: 20 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
});

describe("a tabela (012)", () => {
  it("barra, colunas visíveis, a linha e o rodapé", () => {
    montar();
    expect(screen.getByPlaceholderText("Buscar contato")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Filtros/ })).toBeInTheDocument();
    expect(screen.getByText("30 contatos")).toBeInTheDocument();
    for (const c of ["Telefone", "Nome", "Email", "Status"]) {
      expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    }
    expect(screen.queryByRole("columnheader", { name: "Motivo" })).toBeNull();
    const linha = screen.getByRole("row", { name: /Elza Maria/ });
    expect(within(linha).getByText("(53) 98455-5965")).toBeInTheDocument();
    expect(within(linha).getByText("-")).toBeInTheDocument();
    expect(within(linha).getByText("Lido")).toBeInTheDocument();
    expect(screen.getByText("1 a 20 de 30 contatos")).toBeInTheDocument();
  });

  it("a busca espera a pessoa parar de digitar", async () => {
    const { aoMudarFiltros } = montar();
    await userEvent.type(screen.getByPlaceholderText("Buscar contato"), "Elza");
    await waitFor(() => expect(aoMudarFiltros).toHaveBeenCalledWith({ busca: "Elza" }), { timeout: 1500 });
  });

  it("personalizar colunas mostra 'Motivo' e o contador cai", async () => {
    montar();
    const botao = screen.getByRole("button", { name: "Personalizar colunas" });
    expect(within(botao).getByText("2")).toBeInTheDocument();
    await userEvent.click(botao);
    await userEvent.click(screen.getByRole("checkbox", { name: "Motivo" }));
    expect(screen.getByRole("columnheader", { name: "Motivo" })).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "Personalizar colunas" })).getByText("1")).toBeInTheDocument();
  });
});

describe("os filtros (013)", () => {
  it("motivo do erro com a contagem; Aplicar devolve o filtro", async () => {
    const { aoMudarFiltros } = montar();
    await userEvent.click(screen.getByRole("button", { name: /Filtros/ }));
    expect(screen.getByText("Filtros da campanha")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Meta optou por não entregar/ }));
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(aoMudarFiltros).toHaveBeenCalledWith({ motivos: ["131049"] });
  });

  it("os aplicados viram chips removíveis", async () => {
    const { aoMudarFiltros } = montar({ filtros: { situacoes: ["lida"] } });
    await userEvent.click(screen.getByRole("button", { name: "Remover filtro Lida" }));
    expect(aoMudarFiltros).toHaveBeenCalledWith({});
  });
});

describe("seleção e ações em massa (C12)", () => {
  it("marcar a linha e 'Criar campanha' abre o rascunho novo", async () => {
    mutateAsync.mockResolvedValue({ tipo: "campanha", id: "novo" });
    montar();
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar Elza Maria" }));
    const barra = screen.getByRole("toolbar", { name: "Ações em massa" });
    await userEvent.click(within(barra).getByRole("button", { name: "Criar campanha" }));
    expect(mutateAsync).toHaveBeenCalledWith({ acao: "nova_campanha", alvo: { tipo: "ids", ids: [R1] } });
    await waitFor(() => expect(push).toHaveBeenCalledWith(rotaDoRascunho("novo")));
  });

  it("a página toda, depois 'todos os filtrados', e a tag vai pelo filtro", async () => {
    mutateAsync.mockResolvedValue({ tipo: "acao_em_massa", id: "a1", total: 30, status: "na_fila" });
    montar();
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar a página" }));
    await userEvent.click(screen.getByRole("button", { name: "Selecionar todos os 30 contatos filtrados" }));
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tag" }));
    expect(mutateAsync).toHaveBeenCalledWith({
      acao: "incluir_tag",
      alvo: { tipo: "filtro", excluidos: [] },
      parametros: { tag: "vip" },
    });
  });

  it("'Excluir selecionados' só antes do envio, com confirmação", async () => {
    montar();
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar Elza Maria" }));
    expect(screen.queryByRole("button", { name: "Excluir selecionados" })).toBeNull();
  });

  it("antes do envio: confirma e tira da lista", async () => {
    mutateAsync.mockResolvedValue({ tipo: "lista", tirados: 1 });
    montar({ status: "ready", enviados: 0 });
    await userEvent.click(screen.getByRole("checkbox", { name: "Selecionar Elza Maria" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));
    await userEvent.click(screen.getByRole("button", { name: "Tirar da lista" }));
    expect(mutateAsync).toHaveBeenCalledWith({ acao: "tirar_da_lista", alvo: { tipo: "ids", ids: [R1] } });
  });
});

describe("estados", () => {
  it("vazio com filtro e erro", () => {
    vi.mocked(useDestinatariosDaCampanha).mockReturnValue({
      data: { linhas: [], total: 0, pagina: 1, porPagina: 20 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    const { unmount } = render(
      <DetalhesDaCampanha
        campanha={CAMPANHA}
        sumario={SUMARIO}
        motivos={[]}
        filtros={{ situacoes: ["erro"] }}
        aoMudarFiltros={vi.fn()}
        origens={[]}
      />,
    );
    expect(screen.getByText("Nenhum contato com esses filtros")).toBeInTheDocument();
    unmount();
    vi.mocked(useDestinatariosDaCampanha).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() } as never);
    montar();
    expect(screen.getByText("Não foi possível carregar os contatos.")).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-detalhes.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 3: `SeloDaSituacao.tsx` e `PainelDeColunasDosDestinatarios.tsx`**

`components/escale/campanhas/detalhe/SeloDaSituacao.tsx`:

```tsx
"use client";
import { DicaAoPassar } from "@/components/escale/campanhas/DicaAoPassar";
import { useT } from "@/hooks/i18n/useT";
import { CLASSE_DO_TOM } from "@/lib/escale/campanhas/cores";
import { ROTULO_DA_SITUACAO, TOM_DA_SITUACAO } from "@/lib/escale/campanhas/detalhe/apresentacao";
import { textoDoMotivoDaLinha } from "@/lib/escale/campanhas/detalhe/motivos";
import type { SituacaoDoDestinatario } from "@/lib/escale/campanhas/detalhe/tipos";
import { cn } from "@/lib/utils";

/** O SELO DA LINHA (012: "Lido" verde): o tom da situação; erro e fora da lista com o motivo na dica. */
export function SeloDaSituacao({ situacao, motivo }: { situacao: SituacaoDoDestinatario; motivo: string | null }) {
  const t = useT();
  const dica = textoDoMotivoDaLinha(situacao, motivo, t);
  const selo = (
    <span
      data-situacao={situacao}
      className={cn(
        "inline-flex h-[22px] items-center rounded-[4px] px-1.5 text-[12px] leading-none whitespace-nowrap",
        CLASSE_DO_TOM[TOM_DA_SITUACAO[situacao]],
      )}
    >
      {t(ROTULO_DA_SITUACAO[situacao])}
    </span>
  );
  return dica ? <DicaAoPassar texto={dica}>{selo}</DicaAoPassar> : selo;
}
```

`components/escale/campanhas/detalhe/PainelDeColunasDosDestinatarios.tsx`:

```tsx
"use client";
import { useState } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  COLUNAS_DOS_DESTINATARIOS,
  COLUNAS_PADRAO,
  ROTULO_DA_COLUNA,
  type ColunaDosDestinatarios,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import { SlidersHorizontal } from "@/lib/ui/icons-da-casca";

/**
 * "PERSONALIZAR COLUNAS" (012; sem print do painel aberto, provisório): o botão
 * de 32px com o número de colunas escondidas e uma caixinha por coluna; a última
 * visível não desliga; "Redefinir" volta às do print.
 */
export function PainelDeColunasDosDestinatarios({
  visiveis,
  aoMudar,
}: {
  visiveis: readonly ColunaDosDestinatarios[];
  aoMudar: (colunas: ColunaDosDestinatarios[]) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const escondidas = COLUNAS_DOS_DESTINATARIOS.length - visiveis.length;
  const alternar = (c: ColunaDosDestinatarios, marcar: boolean) =>
    aoMudar(COLUNAS_DOS_DESTINATARIOS.filter((x) => (x === c ? marcar : visiveis.includes(x))));
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("Personalizar colunas")}
          className="inline-flex h-8 items-center gap-1.5 rounded-casca-gatilho border border-casca-borda bg-surface px-2 text-casca-texto hover:bg-casca-raia"
        >
          <SlidersHorizontal size={16} aria-hidden />
          <span className="grid size-[18px] place-items-center rounded-full bg-casca-busca text-[11px]">{escondidas}</span>
        </button>
      </PopoverTrigger>
      <PainelSuspenso align="end" className="w-[220px] p-3">
        <p className="mb-2 text-[13px] font-medium">{t("Personalizar colunas")}</p>
        <ul className="space-y-2">
          {COLUNAS_DOS_DESTINATARIOS.map((c) => {
            const marcada = visiveis.includes(c);
            return (
              <li key={c}>
                <CaixaDaCasca
                  marcada={marcada}
                  rotulo={t(ROTULO_DA_COLUNA[c])}
                  desabilitada={marcada && visiveis.length === 1}
                  aoMudar={(v) => alternar(c, v)}
                />
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => aoMudar([...COLUNAS_PADRAO])}
          className="mt-3 text-[12px] font-medium text-casca-marca hover:underline"
        >
          {t("Redefinir")}
        </button>
      </PainelSuspenso>
    </Popover>
  );
}
```

- [ ] **Step 4: `PainelDeFiltrosDosDestinatarios.tsx`**

```tsx
"use client";
import { useState } from "react";

import { SeletorDoFiltro } from "@/components/escale/conversas/filtros/SeletorDoFiltro";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import {
  ROTULO_DO_FILTRO_DE_SITUACAO,
  SITUACOES_DO_FILTRO,
  type FiltrosDeDestinatarios,
} from "@/lib/escale/campanhas/detalhe/filtros";
import { SEM_CODIGO, textoDoMotivo } from "@/lib/escale/campanhas/detalhe/motivos";
import type { MotivoDoErro, SituacaoDoDestinatario } from "@/lib/escale/campanhas/detalhe/tipos";
import { ChevronDown, ChevronUp } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * "FILTROS DA CAMPANHA" (013): o botão "Filtros" (borda da marca aberto), o
 * acordeão com STATUS (o seletor da casca, várias escolhas; nunca o nativo) e
 * MOTIVO DO ERRO (linhas com a contagem, várias escolhas), "Limpar filtros" e
 * "Aplicar" no azul da Clint (013).
 */
export function PainelDeFiltrosDosDestinatarios({
  filtros,
  motivos,
  aoAplicar,
}: {
  filtros: FiltrosDeDestinatarios;
  motivos: readonly MotivoDoErro[];
  aoAplicar: (f: FiltrosDeDestinatarios) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [secaoAberta, setSecaoAberta] = useState(true);
  const [situacoes, setSituacoes] = useState<SituacaoDoDestinatario[]>(filtros.situacoes ?? []);
  const [codigos, setCodigos] = useState<string[]>(filtros.motivos ?? []);

  const abrir = (a: boolean) => {
    if (a) {
      setSituacoes(filtros.situacoes ?? []);
      setCodigos(filtros.motivos ?? []);
    }
    setAberto(a);
  };
  const aplicar = (f: FiltrosDeDestinatarios) => {
    aoAplicar(f);
    setAberto(false);
  };
  const alternarCodigo = (c: string) =>
    setCodigos((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]));

  return (
    <Popover open={aberto} onOpenChange={abrir}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-casca-gatilho border bg-surface px-2.5 text-[13px] text-casca-texto",
            aberto ? "border-casca-marca" : "border-casca-borda hover:bg-casca-raia",
          )}
        >
          {t("Filtros")}
          {aberto ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
        </button>
      </PopoverTrigger>
      <PainelSuspenso className="flex max-h-[350px] w-[320px] flex-col p-0">
        <button
          type="button"
          aria-expanded={secaoAberta}
          onClick={() => setSecaoAberta((s) => !s)}
          className="flex items-center justify-between px-4 py-3 text-[13px] font-medium"
        >
          {t("Filtros da campanha")}
          {secaoAberta ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
        </button>
        {secaoAberta ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-casca-raia px-4 py-3">
            <div>
              <p className="mb-2 text-[10px] font-semibold tracking-[0.08em] uppercase">{t("Status")}</p>
              <SeletorDoFiltro<SituacaoDoDestinatario>
                valores={situacoes}
                opcoes={SITUACOES_DO_FILTRO.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_FILTRO_DE_SITUACAO[s]) }))}
                aoMudar={setSituacoes}
                vazio={t("Todos os status")}
                aria-label={t("Status")}
              />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold tracking-[0.08em] uppercase">{t("Motivo do erro")}</p>
              {motivos.length === 0 ? (
                <p className="py-1 text-[12px] text-casca-suave">{t("Nenhuma falha nesta campanha.")}</p>
              ) : (
                <ul>
                  {motivos.map((m) => {
                    const codigo = m.codigo ?? SEM_CODIGO;
                    const marcado = codigos.includes(codigo);
                    const texto = textoDoMotivo(m.codigo, t);
                    return (
                      <li key={codigo}>
                        <button
                          type="button"
                          aria-pressed={marcado}
                          title={texto}
                          onClick={() => alternarCodigo(codigo)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-[4px] px-3 py-1.5 text-left text-[12px]",
                            marcado ? "bg-casca-marca-suave text-casca-marca" : "hover:bg-surface",
                          )}
                        >
                          <span className="truncate">{texto}</span>
                          <span className="shrink-0 text-[11px] text-casca-suave">{numeroBr(m.quantidade)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t border-casca-divisoria px-4 py-3">
          <button
            type="button"
            onClick={() => aplicar(filtros.busca ? { busca: filtros.busca } : {})}
            className="text-[13px] font-semibold text-casca-texto"
          >
            {t("Limpar filtros")}
          </button>
          <BotaoDaCasca
            variante="novo"
            tamanho="sm"
            onClick={() =>
              aplicar({
                ...(filtros.busca ? { busca: filtros.busca } : {}),
                ...(situacoes.length ? { situacoes } : {}),
                ...(codigos.length ? { motivos: codigos } : {}),
              })
            }
          >
            {t("Aplicar")}
          </BotaoDaCasca>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
```

- [ ] **Step 5: `TabelaDeDestinatarios.tsx` e `BarraDaSelecaoDaCampanha.tsx`**

`components/escale/campanhas/detalhe/TabelaDeDestinatarios.tsx`:

```tsx
"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { dataEHoraBr } from "@/lib/escale/campanhas/apresentacao";
import { ROTULO_DA_COLUNA, type ColunaDosDestinatarios } from "@/lib/escale/campanhas/detalhe/apresentacao";
import { textoDoMotivoDaLinha } from "@/lib/escale/campanhas/detalhe/motivos";
import type { LinhaDeDestinatario } from "@/lib/escale/campanhas/detalhe/tipos";
import { formatarTelefone } from "@/lib/escale/contatos/regras";

import { SeloDaSituacao } from "./SeloDaSituacao";

const LINHAS_DO_ESQUELETO = 8;

/**
 * A TABELA DOS DETALHES (012): a caixinha, as colunas escolhidas, o selo da
 * situação; carregando, vazio (com e sem filtro, e a lista ainda não montada) e
 * erro (material 2.3).
 */
export function TabelaDeDestinatarios({
  linhas,
  colunas,
  carregando,
  erro,
  filtrando,
  aguardando,
  estadoDaPagina,
  marcada,
  aoAlternar,
  aoMarcarPagina,
  fuso,
  aoLimparFiltros,
  aoTentarDeNovo,
}: {
  linhas: readonly LinhaDeDestinatario[];
  colunas: readonly ColunaDosDestinatarios[];
  carregando: boolean;
  erro: boolean;
  filtrando: boolean;
  aguardando: boolean;
  estadoDaPagina: boolean | "indeterminada";
  marcada: (id: string, indice: number) => boolean;
  aoAlternar: (id: string, indice: number, marcar: boolean) => void;
  aoMarcarPagina: (marcar: boolean) => void;
  fuso?: string;
  aoLimparFiltros: () => void;
  aoTentarDeNovo: () => void;
}) {
  const t = useT();
  const celula = (l: LinhaDeDestinatario, c: ColunaDosDestinatarios) => {
    switch (c) {
      case "telefone":
        return formatarTelefone(l.telefone) || "-";
      case "nome":
        return l.nome || "-";
      case "email":
        return l.email || "-";
      case "situacao":
        return <SeloDaSituacao situacao={l.situacao} motivo={l.motivo} />;
      case "enviado_em":
        return l.enviadoEm ? dataEHoraBr(l.enviadoEm, fuso) : "-";
      case "motivo":
        return textoDoMotivoDaLinha(l.situacao, l.motivo, t) ?? "-";
    }
  };
  const mensagem = (texto: string, acao?: { rotulo: string; aoClicar: () => void }) => (
    <tr>
      <td colSpan={colunas.length + 1} className="py-10 text-center text-[13px]">
        <p>{texto}</p>
        {acao ? (
          <button type="button" onClick={acao.aoClicar} className="mt-2 font-medium text-casca-marca hover:underline">
            {acao.rotulo}
          </button>
        ) : null}
      </td>
    </tr>
  );
  return (
    <table className="w-full table-fixed text-[12px]">
      <thead>
        <tr className="h-10 border-b border-casca-divisoria text-left text-[10px] font-semibold tracking-[0.1em] uppercase">
          <th scope="col" className="w-12 pl-2">
            <CaixaDaCasca marcada={estadoDaPagina} aoMudar={aoMarcarPagina} aria-label={t("Selecionar a página")} />
          </th>
          {colunas.map((c) => (
            <th key={c} scope="col" className={c === "situacao" ? "w-[140px]" : undefined}>
              {t(ROTULO_DA_COLUNA[c])}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {erro
          ? mensagem(t("Não foi possível carregar os contatos."), { rotulo: t("Tentar novamente"), aoClicar: aoTentarDeNovo })
          : carregando
            ? Array.from({ length: LINHAS_DO_ESQUELETO }, (_, i) => (
                <tr key={i} className="h-[47px] border-b border-casca-divisoria">
                  <td colSpan={colunas.length + 1}>
                    <span aria-hidden className="block h-3 w-1/2 animate-pulse rounded-[4px] bg-casca-raia" />
                  </td>
                </tr>
              ))
            : linhas.length === 0
              ? filtrando
                ? mensagem(t("Nenhum contato com esses filtros"), { rotulo: t("Limpar filtros"), aoClicar: aoLimparFiltros })
                : mensagem(aguardando ? t("Aguardando o processamento da campanha.") : t("Nenhum contato foi encontrado"))
              : linhas.map((l, i) => (
                  <tr key={l.id} aria-label={l.nome || formatarTelefone(l.telefone)} className="h-[47px] border-b border-casca-divisoria">
                    <td className="pl-2">
                      <CaixaDaCasca
                        marcada={marcada(l.id, i)}
                        aoMudar={(v) => aoAlternar(l.id, i, v)}
                        aria-label={`${t("Selecionar")} ${l.nome || formatarTelefone(l.telefone)}`}
                      />
                    </td>
                    {colunas.map((c) => (
                      <td key={c} className="truncate pr-3">
                        {celula(l, c)}
                      </td>
                    ))}
                  </tr>
                ))}
      </tbody>
    </table>
  );
}
```

`components/escale/campanhas/detalhe/BarraDaSelecaoDaCampanha.tsx`:

```tsx
"use client";
import { BOTAO_DA_BARRA_DE_LOTE } from "@/components/escale/contatos/massa/BarraDeLote";
import { PainelDeTag } from "@/components/escale/contatos/massa/PainelDeTag";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";

/**
 * A BARRA DA SELEÇÃO NOS DETALHES (material 2.3, `campaign-details-bulk-bar`;
 * sem print, no molde da barra da lista de contatos, 2b-29/30): o número,
 * SELECIONADOS, "Adicionar tag" (o painel da 2B), "Criar negócio", "Criar
 * campanha", "Excluir selecionados" (só antes do envio) e "Limpar seleção".
 */
export function BarraDaSelecaoDaCampanha({
  quantidade,
  podeTirar,
  ocupado,
  aoAplicarTag,
  aoCriarNegocio,
  aoCriarCampanha,
  aoExcluir,
  aoLimpar,
}: {
  quantidade: number;
  podeTirar: boolean;
  ocupado: boolean;
  aoAplicarTag: (acao: "incluir_tag" | "remover_tag", tag: string) => Promise<boolean>;
  aoCriarNegocio: () => void;
  aoCriarCampanha: () => void;
  aoExcluir: () => void;
  aoLimpar: () => void;
}) {
  const t = useT();
  return (
    <div
      role="toolbar"
      aria-label={t("Ações em massa")}
      className="fixed bottom-20 left-1/2 z-50 flex h-[52px] -translate-x-1/2 items-center gap-1 rounded-[8px] bg-casca-marca px-4 text-white shadow-casca-painel"
    >
      <span className="text-[13px] font-semibold">{numeroBr(quantidade)}</span>
      <span className="mr-2 ml-3 text-[11px] font-medium uppercase">{t("selecionados")}</span>
      <span aria-hidden className="mx-1 h-full w-px bg-surface opacity-40" />
      <PainelDeTag classeDoGatilho={BOTAO_DA_BARRA_DE_LOTE} aoAplicar={aoAplicarTag} />
      <button type="button" disabled={ocupado} onClick={aoCriarNegocio} className={BOTAO_DA_BARRA_DE_LOTE}>
        {t("Criar negócio")}
      </button>
      <button type="button" disabled={ocupado} onClick={aoCriarCampanha} className={BOTAO_DA_BARRA_DE_LOTE}>
        {t("Criar campanha")}
      </button>
      {podeTirar ? (
        <button type="button" disabled={ocupado} onClick={aoExcluir} className={BOTAO_DA_BARRA_DE_LOTE}>
          {t("Excluir selecionados")}
        </button>
      ) : null}
      <button type="button" onClick={aoLimpar} className={BOTAO_DA_BARRA_DE_LOTE}>
        {t("Limpar seleção")}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: `DetalhesDaCampanha.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { FaixaDaSelecao } from "@/components/escale/contatos/massa/FaixaDaSelecao";
import { JanelaCriarNegocios, type NovoNegocioEmMassa } from "@/components/escale/contatos/massa/JanelaCriarNegocios";
import { avisoNaFila } from "@/components/escale/contatos/massa/textosDasAcoes";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { useDestinatariosDaCampanha, useMassaDaCampanha } from "@/hooks/escale/useDetalheDaCampanha";
import { useSelecaoDaLista } from "@/hooks/escale/useSelecaoDaLista";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import {
  CHAVE_DAS_COLUNAS,
  POR_PAGINA_DOS_DESTINATARIOS,
  POR_PAGINA_PADRAO_DOS_DESTINATARIOS,
  colunasDoTexto,
  podeTirarDaLista,
  textoDoIntervalo,
  textoDoTotal,
  type ColunaDosDestinatarios,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import {
  ROTULO_DO_FILTRO_DE_SITUACAO,
  temFiltroDeDestinatarios,
  textoDosFiltrosDeDestinatarios,
  type FiltrosDeDestinatarios,
} from "@/lib/escale/campanhas/detalhe/filtros";
import { alvoDaSelecaoDaCampanha, type PedidoDaCampanha, type RespostaDaMassa } from "@/lib/escale/campanhas/detalhe/massa";
import { textoDoMotivo } from "@/lib/escale/campanhas/detalhe/motivos";
import type { InfoDaCampanha, MotivoDoErro, SumarioDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";
import { ESPERA_DA_BUSCA_MS } from "@/lib/escale/campanhas/filtros";
import { rotaDoRascunho } from "@/lib/escale/campanhas/rotas";
import { Search, X } from "@/lib/ui/icons-da-casca";

import { BarraDaSelecaoDaCampanha } from "./BarraDaSelecaoDaCampanha";
import { PainelDeColunasDosDestinatarios } from "./PainelDeColunasDosDestinatarios";
import { PainelDeFiltrosDosDestinatarios } from "./PainelDeFiltrosDosDestinatarios";
import { TabelaDeDestinatarios } from "./TabelaDeDestinatarios";

function lerColunas(): ColunaDosDestinatarios[] {
  try {
    return colunasDoTexto(window.localStorage.getItem(CHAVE_DAS_COLUNAS));
  } catch {
    return colunasDoTexto(null);
  }
}

function gravarColunas(colunas: readonly ColunaDosDestinatarios[]): void {
  try {
    window.localStorage.setItem(CHAVE_DAS_COLUNAS, JSON.stringify(colunas));
  } catch {
    // Sem armazenamento (janela privada): a escolha vale só nesta visita.
  }
}

/**
 * A ABA DETALHES (012, 013; C11, C12): a busca (500 ms), os filtros e os chips,
 * a contagem e as colunas; a tabela com a seleção da 2B; a barra das ações em
 * massa; o rodapé "1 a 20 de 30 contatos" com a paginação de 20.
 */
export function DetalhesDaCampanha({
  campanha,
  sumario,
  motivos,
  filtros,
  aoMudarFiltros,
  origens,
  fuso,
}: {
  campanha: InfoDaCampanha;
  sumario: SumarioDaCampanha;
  motivos: readonly MotivoDoErro[];
  filtros: FiltrosDeDestinatarios;
  aoMudarFiltros: (f: FiltrosDeDestinatarios) => void;
  origens: OrigemParaCriar[];
  fuso?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [busca, setBusca] = useState(filtros.busca ?? "");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_PADRAO_DOS_DESTINATARIOS);
  const [colunas, setColunas] = useState<ColunaDosDestinatarios[]>(lerColunas);
  const [criandoNegocio, setCriandoNegocio] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const andando = campanha.status === "running" || campanha.status === "preparing";
  const consulta = useDestinatariosDaCampanha(campanha.id, filtros, pagina, porPagina, true, andando);
  const massa = useMassaDaCampanha(campanha.id);
  const linhas = consulta.data?.linhas ?? [];
  const total = consulta.data?.total ?? 0;
  const chaveDaConsulta = textoDosFiltrosDeDestinatarios(filtros);
  const selecao = useSelecaoDaLista({ linhas, total, primeiro: (pagina - 1) * porPagina, chaveDaConsulta });

  // A busca espera a pessoa parar de digitar (8A: 500 ms) e volta à página 1.
  useEffect(() => {
    const termo = busca.trim();
    if (termo === (filtros.busca ?? "")) return;
    const espera = setTimeout(() => {
      const { busca: _antiga, ...resto } = filtros;
      aoMudarFiltros(termo ? { ...resto, busca: termo } : resto);
      setPagina(1);
    }, ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(espera);
  }, [busca, filtros, aoMudarFiltros]);

  const mudarColunas = (c: ColunaDosDestinatarios[]) => {
    setColunas(c);
    gravarColunas(c);
  };

  async function pedir(pedido: PedidoDaCampanha): Promise<RespostaDaMassa | null> {
    try {
      return await massa.mutateAsync(pedido);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("Não consegui completar essa ação. Tente de novo."));
      return null;
    }
  }

  const alvo = () => alvoDaSelecaoDaCampanha(selecao.selecao, filtros);

  async function aplicarTag(acao: "incluir_tag" | "remover_tag", tag: string): Promise<boolean> {
    const r = await pedir({ acao, alvo: alvo(), parametros: { tag } });
    if (r?.tipo !== "acao_em_massa") return false;
    const aviso = avisoNaFila(t, acao, r.total, r.status as never);
    if (aviso) toast.success(aviso);
    selecao.limpar();
    return true;
  }

  async function criarNegocios(novo: NovoNegocioEmMassa) {
    const r = await pedir({ acao: "criar_negocios", alvo: alvo(), parametros: novo });
    if (r?.tipo !== "acao_em_massa") return;
    const aviso = avisoNaFila(t, "criar_negocios", r.total, r.status as never);
    if (aviso) toast.success(aviso);
    setCriandoNegocio(false);
    selecao.limpar();
  }

  async function criarCampanha() {
    const r = await pedir({ acao: "nova_campanha", alvo: alvo() });
    if (r?.tipo !== "campanha") return;
    toast.success(t("A campanha foi criada como rascunho."));
    router.push(rotaDoRascunho(r.id));
  }

  async function tirarDaLista() {
    const r = await pedir({ acao: "tirar_da_lista", alvo: alvo() });
    setConfirmandoExclusao(false);
    if (r?.tipo !== "lista") return;
    toast.success(t("{n} contatos tirados da lista.").replace("{n}", numeroBr(r.tirados)));
    selecao.limpar();
  }

  const chips = [
    ...(filtros.situacoes ?? []).map((s) => ({
      chave: `s:${s}`,
      rotulo: t(ROTULO_DO_FILTRO_DE_SITUACAO[s]),
      tirar: () => {
        const situacoes = (filtros.situacoes ?? []).filter((x) => x !== s);
        const { situacoes: _s, ...resto } = filtros;
        aoMudarFiltros(situacoes.length ? { ...resto, situacoes } : resto);
      },
    })),
    ...(filtros.motivos ?? []).map((m) => ({
      chave: `m:${m}`,
      rotulo: textoDoMotivo(m, t),
      tirar: () => {
        const restantes = (filtros.motivos ?? []).filter((x) => x !== m);
        const { motivos: _m, ...resto } = filtros;
        aoMudarFiltros(restantes.length ? { ...resto, motivos: restantes } : resto);
      },
    })),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-8 py-4">
        <label className="relative w-[240px]">
          <span className="sr-only">{t("Buscar contato")}</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar contato")}
            className="h-8 w-full rounded-casca-gatilho border-0 bg-casca-busca pr-8 pl-3 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
          />
          <Search size={16} aria-hidden className="pointer-events-none absolute top-2 right-2.5 text-casca-suave" />
        </label>
        <PainelDeFiltrosDosDestinatarios
          filtros={filtros}
          motivos={motivos}
          aoAplicar={(f) => {
            aoMudarFiltros(f);
            setPagina(1);
          }}
        />
        {chips.map((c) => (
          <span key={c.chave} className="inline-flex h-7 items-center gap-1 rounded-full bg-casca-marca-suave pr-1 pl-2.5 text-[12px] text-casca-marca">
            <span className="max-w-[200px] truncate">{c.rotulo}</span>
            <button
              type="button"
              aria-label={`${t("Remover filtro")} ${c.rotulo}`}
              onClick={c.tirar}
              className="grid size-5 place-items-center rounded-full hover:bg-surface"
            >
              <X size={12} aria-hidden />
            </button>
          </span>
        ))}
        <span className="ml-auto flex items-center gap-3">
          <span className="text-[13px] text-casca-texto">{textoDoTotal(total, t)}</span>
          <PainelDeColunasDosDestinatarios visiveis={colunas} aoMudar={mudarColunas} />
        </span>
      </div>
      <FaixaDaSelecao
        modo={selecao.modoDaFaixa}
        naPagina={linhas.length}
        total={total}
        aoSelecionarTodos={selecao.selecionarTodos}
        aoLimpar={selecao.limpar}
        rotuloDeTodos={t("Selecionar todos os {total} contatos filtrados").replace("{total}", numeroBr(total))}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-8">
        <TabelaDeDestinatarios
          linhas={linhas}
          colunas={colunas}
          carregando={consulta.isLoading}
          erro={consulta.isError}
          filtrando={temFiltroDeDestinatarios(filtros)}
          aguardando={campanha.status === "draft" || campanha.status === "preparing"}
          estadoDaPagina={selecao.estado}
          marcada={selecao.marcada}
          aoAlternar={selecao.alternar}
          aoMarcarPagina={selecao.marcarPagina}
          fuso={fuso}
          aoLimparFiltros={() => {
            setBusca("");
            aoMudarFiltros({});
            setPagina(1);
          }}
          aoTentarDeNovo={() => void consulta.refetch()}
        />
      </div>
      <footer className="shrink-0 border-t border-casca-divisoria px-8">
        <PaginacaoDaCasca
          pagina={pagina}
          total={total}
          porPagina={porPagina}
          opcoesPorPagina={POR_PAGINA_DOS_DESTINATARIOS}
          aoMudarPagina={setPagina}
          aoMudarPorPagina={(n) => {
            setPorPagina(n);
            setPagina(1);
          }}
          legenda={textoDoIntervalo(pagina, porPagina, total, t)}
        />
      </footer>
      {selecao.quantidade > 0 ? (
        <BarraDaSelecaoDaCampanha
          quantidade={selecao.quantidade}
          podeTirar={podeTirarDaLista(campanha.status, sumario.enviados)}
          ocupado={massa.isPending}
          aoAplicarTag={aplicarTag}
          aoCriarNegocio={() => setCriandoNegocio(true)}
          aoCriarCampanha={() => void criarCampanha()}
          aoExcluir={() => setConfirmandoExclusao(true)}
          aoLimpar={selecao.limpar}
        />
      ) : null}
      <JanelaCriarNegocios
        aberta={criandoNegocio}
        quantidade={selecao.quantidade}
        origens={origens}
        enviando={massa.isPending}
        aoFechar={() => setCriandoNegocio(false)}
        aoConfirmar={(novo) => void criarNegocios(novo)}
      />
      <JanelaDeConfirmacao
        aberta={confirmandoExclusao}
        aoFechar={() => setConfirmandoExclusao(false)}
        titulo={t("Excluir selecionados")}
        rotuloDoConfirmar={t("Tirar da lista")}
        perigo
        ocupado={massa.isPending}
        aoConfirmar={() => void tirarDaLista()}
      >
        {t("Os contatos selecionados saem desta campanha e não recebem a mensagem. Deseja continuar?")}
      </JanelaDeConfirmacao>
    </div>
  );
}
```

- [ ] **Step 7: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-detalhes.test.tsx $(grep -rlE "FaixaDaSelecao|PaginacaoDaCasca" tests/unit) && corepack pnpm prettier --write components/escale/campanhas/detalhe tests/unit/escale-detalhe-da-campanha-detalhes.test.tsx && corepack pnpm eslint components/escale/campanhas/detalhe components/escale/contatos/massa/FaixaDaSelecao.tsx components/escale/ui/PaginacaoDaCasca.tsx && corepack pnpm typecheck`
Expected: PASS. Pontos de atenção:
- os nomes `_antiga`, `_s`, `_m` do destructuring: se o eslint reclamar de variável sem uso, troque por uma função `semChave(filtros, "busca")` que devolve a cópia sem a chave (sem mutar);
- `avisoNaFila(t, acao, total, status)` espera o `StatusDaAcao` da 2B; o `as never` só atravessa o texto que a rota devolve — se o typecheck aceitar `r.status as StatusDaAcao` (importado de `lib/escale/massa/tipos`), prefira esse;
- se o `SeletorDoFiltro` da 3D não aceitar o genérico explícito (`<SituacaoDoDestinatario>`), tire-o: o tipo vem das opções.

- [ ] **Step 8: Commit**

```bash
git add components/escale/campanhas/detalhe components/escale/contatos/massa/FaixaDaSelecao.tsx components/escale/ui/PaginacaoDaCasca.tsx tests/unit/escale-detalhe-da-campanha-detalhes.test.tsx
git commit -m "feat(escale): aba Detalhes da campanha — busca, filtros, colunas, seleção e ações em massa (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 11: A janela do detalhe, o diálogo de pausar e os encaixes

**Files:**
- Create: `components/escale/campanhas/detalhe/DetalheDaCampanhaDaCasca.tsx`, `components/escale/campanhas/detalhe/JanelaPausarCampanha.tsx`, `tests/unit/escale-detalhe-da-campanha-janela.test.tsx`, `tests/unit/escale-detalhe-da-campanha-encaixe.test.tsx`
- Modify: `lib/escale/campanhas/rotas.ts`, `tests/unit/escale-campanhas-regras.test.ts` (1 linha da 8A), `components/escale/campanhas/CampanhasDaCasca.tsx`, `app/app/campaigns/page.tsx`, `app/app/campaigns/[id]/page.tsx`, `tests/unit/escale-campanhas-pagina.test.tsx` (o mock das origens)

**Interfaces:**
- Consumes: tudo das Tasks 6–10; `useAcoesDaCampanha` (8A); `botaoDaLinha` (8A, `lib/escale/campanhas/acoes-da-linha.ts`); `useChannelSessions`, `channelLabel` (`hooks/channels/useChannelSessions.ts`); `JanelaDeConfirmacao` (casca); `ApiError` (`lib/api/types.ts`); `origensDaPagina` (`lib/escale/contatos/origens-da-pagina.ts`); `ehIdDeCampanha` (Task 3).
- Produces: `PARAM_DA_CAMPANHA` ("campanha"), `rotaDoDetalhe(id)` → `/app/campaigns?campanha=<id>`; `JanelaPausarCampanha({ aberta, ocupado, aoFechar, aoConfirmar })`; `DetalheDaCampanhaDaCasca({ id, origens, fuso?, aoFechar })`; `CampanhasDaCasca` ganha `campanhaAberta?: string | null` e `origens?: OrigemParaCriar[]`.

- [ ] **Step 1: O teste da janela (falha)**

`tests/unit/escale-detalhe-da-campanha-janela.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();
const acao = vi.fn();
const massa = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/escale/useCampanhasDaCasca", () => ({
  useAcoesDaCampanha: () => ({ mutateAsync: acao, isPending: false }),
}));
vi.mock("@/hooks/channels/useChannelSessions", () => ({
  useChannelSessions: () => ({ data: [{ id: "n1", display_name: "Naiara" }] }),
  channelLabel: (s: { display_name: string }) => s.display_name,
}));
vi.mock("@/hooks/escale/useDetalheDaCampanha", () => ({
  useDetalheDaCampanha: vi.fn(),
  useMassaDaCampanha: () => ({ mutateAsync: massa, isPending: false }),
  useDestinatariosDaCampanha: vi.fn(() => ({
    data: { linhas: [], total: 0, pagina: 1, porPagina: 20 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useNegociosDaCampanha: () => ({ data: undefined, isLoading: false, isError: false, refetch: vi.fn() }),
  useRitmoDaCampanha: () => ({ mutateAsync: vi.fn(), isPending: false }),
  baixarCsvDaCampanha: vi.fn(async () => undefined),
}));
vi.mock("@/components/escale/campanhas/ListaDeCampanhasDaCasca", () => ({
  ListaDeCampanhasDaCasca: () => <p>lista</p>,
}));
vi.mock("@/app/app/prospecting/_client", () => ({ ProspectingClient: () => null }));
// As duas da 2B usam hooks com React Query (membros, vocabulário de tags); aqui não importam.
vi.mock("@/components/escale/contatos/massa/JanelaCriarNegocios", () => ({ JanelaCriarNegocios: () => null }));
vi.mock("@/components/escale/contatos/massa/PainelDeTag", () => ({ PainelDeTag: () => null }));

import { CampanhasDaCasca } from "@/components/escale/campanhas/CampanhasDaCasca";
import { DetalheDaCampanhaDaCasca } from "@/components/escale/campanhas/detalhe/DetalheDaCampanhaDaCasca";
import {
  baixarCsvDaCampanha,
  useDestinatariosDaCampanha,
  useDetalheDaCampanha,
} from "@/hooks/escale/useDetalheDaCampanha";
import { ApiError } from "@/lib/api/types";
import type { DadosDoDetalhe } from "@/lib/escale/campanhas/detalhe/tipos";

const DADOS = (status: DadosDoDetalhe["campanha"]["status"]): DadosDoDetalhe => ({
  campanha: {
    id: "c1",
    nome: "10.09",
    status,
    numeroId: "n1",
    numerosExtras: [],
    mensagem: "Oi!",
    modelo: null,
    baseLegal: "consent",
    liaRef: null,
    ritmo: { intervaloSegundos: null, tetoDiario: null, tetoHorario: null, janelaInicioHora: null, janelaFimHora: null },
    iniciadaEm: "2026-09-10T15:39:00Z",
    agendadaPara: null,
    criadaEm: "2026-09-10T12:00:00Z",
  },
  sumario: {
    adicionados: 30, enviados: 26, entregues: 23, lidas: 16, respondidas: 10,
    leuSemResposta: 6, erros: 0, naoEnviados: 0, aguardando: 4, foraDaLista: 0,
  },
  ritmo: [],
  motivos: [],
  resultado: {
    negocios: 0, valorAbertoCentavos: 0, valorGanhoCentavos: 0,
    medianaSegundos: null, benchmark: null, taxaDaCampanha: null,
  },
  fuso: "America/Sao_Paulo",
});

const comDados = (status: DadosDoDetalhe["campanha"]["status"]) =>
  vi.mocked(useDetalheDaCampanha).mockReturnValue({
    data: DADOS(status),
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as never);

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  acao.mockReset();
});

describe("a janela do detalhe (009; C1, C14)", () => {
  it("carregando: o título provisório e os esqueletos", () => {
    vi.mocked(useDetalheDaCampanha).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null } as never);
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Carregando campanha" })).toBeInTheDocument();
    expect(screen.getByLabelText("Carregando campanha", { selector: "[aria-busy]" })).toBeInTheDocument();
  });

  it("em andamento: rótulo, nome, abas, Pausar com o diálogo da Clint e Baixar .CSV", async () => {
    comDados("running");
    acao.mockResolvedValue({});
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={vi.fn()} />);
    const janela = screen.getByRole("dialog", { name: "10.09" });
    expect(within(janela).getByText("Informações da campanha")).toBeInTheDocument();
    expect(within(janela).getByRole("tab", { name: "Sumário" })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(within(janela).getByRole("button", { name: "Pausar" }));
    const pausa = screen.getByRole("dialog", { name: "Pausar campanha" });
    expect(within(pausa).getByText("Contatos já alcançados")).toBeInTheDocument();
    expect(within(pausa).getByText("Mensagens em trânsito")).toBeInTheDocument();
    await userEvent.click(within(pausa).getByRole("button", { name: "Pausar campanha" }));
    expect(acao).toHaveBeenCalledWith({ id: "c1", acao: "pausar" });
    await userEvent.click(within(janela).getByRole("button", { name: "Baixar .CSV" }));
    expect(baixarCsvDaCampanha).toHaveBeenCalledWith("c1", "10.09", "America/Sao_Paulo");
  });

  it("pausada: Retomar sem diálogo", async () => {
    comDados("paused");
    acao.mockResolvedValue({});
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Retomar" }));
    expect(acao).toHaveBeenCalledWith({ id: "c1", acao: "retomar" });
  });

  it("concluída: sem Pausar nem Retomar", () => {
    comDados("completed");
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Retomar" })).toBeNull();
  });

  it("'Ver contatos' do Sumário leva aos Detalhes filtrados", async () => {
    comDados("completed");
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={vi.fn()} />);
    const bloco = screen.getByRole("region", { name: "Leu e não respondeu" });
    await userEvent.click(within(bloco).getByRole("button", { name: "Ver contatos" }));
    expect(screen.getByRole("tab", { name: "Detalhes" })).toHaveAttribute("aria-selected", "true");
    expect(vi.mocked(useDestinatariosDaCampanha)).toHaveBeenLastCalledWith(
      "c1",
      { situacoes: ["lida"] },
      1,
      20,
      true,
      false,
    );
  });

  it("campanha que não existe; fechar", async () => {
    vi.mocked(useDetalheDaCampanha).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError(404, "campanha_nao_encontrada", undefined, "r1", "Campanha não encontrada."),
      refetch: vi.fn(),
    } as never);
    const aoFechar = vi.fn();
    render(<DetalheDaCampanhaDaCasca id="c1" origens={[]} aoFechar={aoFechar} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Campanha não encontrada.");
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(aoFechar).toHaveBeenCalled();
  });
});

describe("CampanhasDaCasca com ?campanha= (N2)", () => {
  it("abre a janela sobre a lista e fechar volta para /app/campaigns sem rolar", async () => {
    comDados("completed");
    render(<CampanhasDaCasca papel="manager" organizacaoId="org-1" aba="whatsapp" campanhaAberta="c1" origens={[]} />);
    expect(screen.getByText("lista")).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("dialog", { name: "10.09" })).getByRole("button", { name: "Fechar" }));
    expect(replace).toHaveBeenCalledWith("/app/campaigns", { scroll: false });
  });

  it("sem ?campanha=, nada de janela", () => {
    render(<CampanhasDaCasca papel="manager" organizacaoId="org-1" aba="whatsapp" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
```

`tests/unit/escale-detalhe-da-campanha-encaixe.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let menu = "topo";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: menu }) }) }));
vi.mock("next/navigation", () => ({
  redirect: (u: string) => {
    throw new Error(`REDIRECT ${u}`);
  },
}));
vi.mock("@/lib/auth/server", () => ({
  requireAuth: vi.fn(async () => ({ id: "u1" })),
  resolveActiveOrg: vi.fn(async () => ({ orgId: "org-1", role: "manager", timezone: "America/Sao_Paulo" })),
}));
vi.mock("@/lib/escale/contatos/origens-da-pagina", () => ({
  origensDaPagina: vi.fn(async () => ({ origens: [{ id: "p1", nome: "Vendas", etapas: [] }], papel: "manager", opcoesDoFiltro: {} })),
}));
vi.mock("@/components/escale/campanhas/CampanhasDaCasca", () => ({
  CampanhasDaCasca: (p: { campanhaAberta?: string | null; origens?: unknown[] }) => (
    <p>{`casca ${p.campanhaAberta ?? "nenhuma"} ${p.origens?.length ?? 0}`}</p>
  ),
}));
vi.mock("@/app/app/campaigns/_client", () => ({ ListaDeCampanhas: () => null }));
vi.mock("@/app/app/campaigns/[id]/_client", () => ({ DetalheDaCampanha: ({ id }: { id: string }) => <p>{`original ${id}`}</p> }));

import CampanhaPage from "@/app/app/campaigns/[id]/page";
import CampanhasPage from "@/app/app/campaigns/page";

const ID = "e5ca1e00-8c00-4000-8000-0000000000c1";

beforeEach(() => {
  menu = "topo";
});

describe("os encaixes da 8C", () => {
  it("/app/campaigns?campanha=<uuid> passa o id e as origens; id ruim vira nenhum", async () => {
    render(await CampanhasPage({ searchParams: Promise.resolve({ campanha: ID }) }));
    expect(screen.getByText(`casca ${ID} 1`)).toBeInTheDocument();
  });

  it("id que não é uuid não abre janela", async () => {
    render(await CampanhasPage({ searchParams: Promise.resolve({ campanha: "xyz" }) }));
    expect(screen.getByText("casca nenhuma 1")).toBeInTheDocument();
  });

  it("/app/campaigns/[id] com a casca vira a janela; sem a casca, a página do original", async () => {
    await expect(CampanhaPage({ params: Promise.resolve({ id: ID }) })).rejects.toThrow(
      `REDIRECT /app/campaigns?campanha=${ID}`,
    );
    menu = "lateral";
    render(await CampanhaPage({ params: Promise.resolve({ id: ID }) }));
    expect(screen.getByText(`original ${ID}`)).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-janela.test.tsx tests/unit/escale-detalhe-da-campanha-encaixe.test.tsx`
Expected: FAIL (os componentes não existem; a página não lê `?campanha=`). Se o valor do cookie da casca não for `"topo"`/`"lateral"`, ajuste `menu` ao que `lerPreferenciaDeMenu` aceita (`lib/escale/preferencia-de-menu.ts`).

- [ ] **Step 2: `JanelaPausarCampanha.tsx`**

```tsx
"use client";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { useT } from "@/hooks/i18n/useT";

const BLOCOS = [
  {
    titulo: "Contatos já alcançados",
    texto: "Quem já recebeu a mensagem continua com ela normalmente, nada é desfeito.",
  },
  {
    titulo: "Contatos ainda não alcançados",
    texto: "Nenhum contato novo recebe mensagem enquanto a campanha estiver pausada.",
  },
  {
    titulo: "Mensagens em trânsito",
    texto: "Uma mensagem já entregue à Meta no momento da pausa ainda é concluída normalmente.",
  },
] as const;

/** "PAUSAR CAMPANHA" (material 2.2 e 3; C14; sem print, provisório): os três blocos e a nota da Clint. */
export function JanelaPausarCampanha({
  aberta,
  ocupado,
  aoFechar,
  aoConfirmar,
}: {
  aberta: boolean;
  ocupado: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
}) {
  const t = useT();
  return (
    <JanelaDeConfirmacao
      aberta={aberta}
      aoFechar={aoFechar}
      titulo={t("Pausar campanha")}
      rotuloDoConfirmar={t("Pausar campanha")}
      ocupado={ocupado}
      aoConfirmar={aoConfirmar}
    >
      <div className="space-y-3 text-[13px]">
        <p className="text-casca-suave">{t("O envio desta campanha é interrompido até você retomar.")}</p>
        {BLOCOS.map((b) => (
          <div key={b.titulo} className="rounded-[8px] border border-casca-borda p-3">
            <p className="font-medium text-casca-texto">{t(b.titulo)}</p>
            <p className="mt-0.5 text-casca-suave">{t(b.texto)}</p>
          </div>
        ))}
        <p className="text-[12px] text-casca-suave">
          {t(
            "Você pode retomar ou cancelar esta campanha quando quiser. Ao retomar, o envio continua apenas para quem ainda não foi alcançado.",
          )}
        </p>
      </div>
    </JanelaDeConfirmacao>
  );
}
```

- [ ] **Step 3: `DetalheDaCampanhaDaCasca.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { JanelaDoDetalhe } from "@/components/escale/campanhas/molde/JanelaDoDetalhe";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useAcoesDaCampanha } from "@/hooks/escale/useCampanhasDaCasca";
import { baixarCsvDaCampanha, useDetalheDaCampanha, useMassaDaCampanha } from "@/hooks/escale/useDetalheDaCampanha";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import { botaoDaLinha } from "@/lib/escale/campanhas/acoes-da-linha";
import { textoDosFiltrosDeDestinatarios, type FiltrosDeDestinatarios } from "@/lib/escale/campanhas/detalhe/filtros";
import type { SituacaoDosNegocios } from "@/lib/escale/campanhas/detalhe/tipos";
import { rotaDoRascunho } from "@/lib/escale/campanhas/rotas";
import { CirclePause, Play } from "@/lib/ui/icons-da-casca";

import { ColunaDaMensagem } from "./ColunaDaMensagem";
import { DetalhesDaCampanha } from "./DetalhesDaCampanha";
import { GavetaDeNegocios } from "./GavetaDeNegocios";
import { JanelaPausarCampanha } from "./JanelaPausarCampanha";
import { SumarioCarregando, SumarioDaCampanha } from "./SumarioDaCampanha";

type Aba = "sumario" | "detalhes";

/**
 * O DETALHE DA CAMPANHA NA CASCA (fork Escale, Fase 8C; 009–013; C1–C15): a
 * janela com Pausar/Retomar (só em andamento e pausada), "Baixar .CSV" e o X;
 * as abas Sumário e Detalhes; a gaveta de negócios e o diálogo de pausar.
 */
export function DetalheDaCampanhaDaCasca({
  id,
  origens,
  fuso,
  aoFechar,
}: {
  id: string;
  origens: OrigemParaCriar[];
  fuso?: string;
  aoFechar: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const consulta = useDetalheDaCampanha(id);
  const acoes = useAcoesDaCampanha();
  const massa = useMassaDaCampanha(id);
  const sessoes = useChannelSessions().data;
  const [aba, setAba] = useState<Aba>("sumario");
  const [filtros, setFiltros] = useState<FiltrosDeDestinatarios>({});
  const [gaveta, setGaveta] = useState<SituacaoDosNegocios | null>(null);
  const [pausando, setPausando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const dados = consulta.data;
  const fusoDaTela = dados?.fuso ?? fuso;
  const botao = dados ? botaoDaLinha(dados.campanha.status) : null;
  const nomeDoNumero = useMemo(() => {
    const nomes = new Map((sessoes ?? []).map((s) => [s.id, channelLabel(s, t)]));
    return (numero: string) => nomes.get(numero) ?? "—";
  }, [sessoes, t]);

  const verContatos = (f: FiltrosDeDestinatarios) => {
    setFiltros(f);
    setAba("detalhes");
  };

  async function criarDosNaoEnviados() {
    try {
      const r = await massa.mutateAsync({
        acao: "nova_campanha",
        alvo: { tipo: "filtro", f: textoDosFiltrosDeDestinatarios({ situacoes: ["nao_enviado"] }), excluidos: [] },
      });
      if (r.tipo !== "campanha") return;
      toast.success(t("A campanha foi criada como rascunho."));
      router.push(rotaDoRascunho(r.id));
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : t("Não consegui completar essa ação. Tente de novo."));
    }
  }

  async function baixar() {
    if (!dados) return;
    setBaixando(true);
    try {
      await baixarCsvDaCampanha(id, dados.campanha.nome, fusoDaTela);
    } catch {
      toast.error(t("Não foi possível baixar o arquivo. Tente novamente."));
    } finally {
      setBaixando(false);
    }
  }

  async function pausar() {
    try {
      await acoes.mutateAsync({ id, acao: "pausar" });
      toast.success(t("Campanha pausada com sucesso!"));
      setPausando(false);
    } catch {
      toast.error(t("Falha ao pausar a campanha. Tente novamente."));
    }
  }

  async function retomar() {
    try {
      await acoes.mutateAsync({ id, acao: "retomar" });
      toast.success(t("Campanha retomada com sucesso!"));
    } catch {
      toast.error(t("Falha ao retomar a campanha. Tente novamente."));
    }
  }

  const naoAchou = consulta.error instanceof ApiError && consulta.error.status === 404;
  const contornado =
    "inline-flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda bg-surface px-3.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia disabled:opacity-60";
  const cheio =
    "inline-flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-marca px-4 text-[13px] font-semibold text-white hover:bg-casca-marca-forte disabled:opacity-60";

  const acoesDoCabecalho = (
    <>
      {botao === "pausar" ? (
        <button type="button" disabled={acoes.isPending} onClick={() => setPausando(true)} className={contornado}>
          <CirclePause size={14} aria-hidden />
          {t("Pausar")}
        </button>
      ) : null}
      {botao === "retomar" ? (
        <button type="button" disabled={acoes.isPending} onClick={() => void retomar()} className={cheio}>
          <Play size={14} aria-hidden />
          {t("Retomar")}
        </button>
      ) : null}
      <button type="button" disabled={!dados || baixando} onClick={() => void baixar()} className={cheio}>
        {t("Baixar .CSV")}
      </button>
    </>
  );

  let corpo;
  if (consulta.isError) {
    corpo = (
      <div role="alert" className="py-16 text-center text-[13px]">
        <p>{naoAchou ? t("Campanha não encontrada.") : t("Não foi possível carregar a campanha.")}</p>
        {naoAchou ? null : (
          <button type="button" onClick={() => void consulta.refetch()} className="mt-2 font-medium text-casca-marca hover:underline">
            {t("Tentar novamente")}
          </button>
        )}
      </div>
    );
  } else if (!dados) {
    corpo = <SumarioCarregando />;
  } else if (aba === "sumario") {
    corpo = (
      <SumarioDaCampanha
        dados={dados}
        colunaDireita={<ColunaDaMensagem campanha={dados.campanha} nomeDoNumero={nomeDoNumero} fuso={fusoDaTela} />}
        aoVerContatos={verContatos}
        aoCriarCampanhaDosNaoEnviados={() => void criarDosNaoEnviados()}
        criando={massa.isPending}
        aoAbrirNegocios={setGaveta}
      />
    );
  } else {
    corpo = (
      <DetalhesDaCampanha
        campanha={dados.campanha}
        sumario={dados.sumario}
        motivos={dados.motivos}
        filtros={filtros}
        aoMudarFiltros={setFiltros}
        origens={origens}
        fuso={fusoDaTela}
      />
    );
  }

  return (
    <>
      <JanelaDoDetalhe
        aberta
        aoFechar={aoFechar}
        rotulo={t("Informações da campanha")}
        titulo={dados?.campanha.nome ?? t("Carregando campanha")}
        acoes={acoesDoCabecalho}
        abas={[
          { valor: "sumario", rotulo: t("Sumário") },
          { valor: "detalhes", rotulo: t("Detalhes") },
        ]}
        abaAtiva={aba}
        aoTrocarAba={(v) => setAba(v === "detalhes" ? "detalhes" : "sumario")}
      >
        {corpo}
      </JanelaDoDetalhe>
      {dados ? (
        <GavetaDeNegocios
          campanhaId={id}
          nomeDaCampanha={dados.campanha.nome}
          situacao={gaveta}
          aoFechar={() => setGaveta(null)}
          fuso={fusoDaTela}
        />
      ) : null}
      <JanelaPausarCampanha
        aberta={pausando}
        ocupado={acoes.isPending}
        aoFechar={() => setPausando(false)}
        aoConfirmar={() => void pausar()}
      />
    </>
  );
}
```

- [ ] **Step 4: `lib/escale/campanhas/rotas.ts` e a linha do teste da 8A**

Em `lib/escale/campanhas/rotas.ts`, troque a linha de `rotaDoDetalhe` por:

```ts
/** FORK ESCALE · Fase 8C (N2): o detalhe é a janela sobre a lista, um estado da URL. */
export const PARAM_DA_CAMPANHA = "campanha";
export const rotaDoDetalhe = (id: string): string =>
  `${ROTA_DAS_CAMPANHAS}?${PARAM_DA_CAMPANHA}=${encodeURIComponent(id)}`;
```

Em `tests/unit/escale-campanhas-regras.test.ts` (8A), troque `expect(rotaDoDetalhe("c1")).toBe("/app/campaigns/c1");` por `expect(rotaDoDetalhe("c1")).toBe("/app/campaigns?campanha=c1");`.

- [ ] **Step 5: `CampanhasDaCasca.tsx` (8A)**

Acrescente (sem tirar nada da 8A):
1. Imports:
   ```tsx
   // FORK ESCALE · Fase 8C: a janela do detalhe sobre a lista.
   import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
   import { ROTA_DAS_CAMPANHAS } from "@/lib/escale/campanhas/rotas";

   import { DetalheDaCampanhaDaCasca } from "./detalhe/DetalheDaCampanhaDaCasca";
   ```
   (`ROTA_DAS_CAMPANHAS` entra no import de `@/lib/escale/campanhas/rotas` que já existe.)
2. Nas props: `campanhaAberta = null,` e `origens = [],` no destructuring; no tipo, `campanhaAberta?: string | null;` e `origens?: OrigemParaCriar[];`.
3. Logo antes do `</div>` final do componente:
   ```tsx
      {aba === "whatsapp" && campanhaAberta ? (
        <DetalheDaCampanhaDaCasca
          id={campanhaAberta}
          origens={origens}
          fuso={fuso}
          aoFechar={() => router.replace(ROTA_DAS_CAMPANHAS, { scroll: false })}
        />
      ) : null}
   ```

- [ ] **Step 6: `app/app/campaigns/page.tsx` e `app/app/campaigns/[id]/page.tsx`**

Em `app/app/campaigns/page.tsx` (o ramo da casca da 8A):
1. Imports, dentro do bloco do fork:
   ```tsx
   // FORK ESCALE · Fase 8C: ?campanha= abre a janela do detalhe; as origens do "Criar negócio".
   import { ehIdDeCampanha } from "@/lib/escale/campanhas/detalhe/banco";
   import { origensDaPagina } from "@/lib/escale/contatos/origens-da-pagina";
   ```
2. O tipo de `searchParams` vira `Promise<{ aba?: string | string[]; campanha?: string | string[] }>`.
3. No ramo da casca, troque `const { aba } = await searchParams;` e o `return` por:
   ```tsx
       const { aba, campanha } = await searchParams;
       const campanhaAberta = typeof campanha === "string" && ehIdDeCampanha(campanha) ? campanha : null;
       const { origens } = await origensDaPagina();
       return (
         <CampanhasDaCasca
           papel={org.role}
           organizacaoId={org.orgId}
           aba={abaDaUrl(typeof aba === "string" ? aba : null, org.role)}
           fuso={org.timezone ?? undefined}
           campanhaAberta={campanhaAberta}
           origens={origens}
         />
       );
   ```

Troque `app/app/campaigns/[id]/page.tsx` inteiro por:

```tsx
import type { Metadata } from "next";
// ── FORK ESCALE · Fase 8C: com a casca, o detalhe é a janela sobre a lista ──
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { rotaDoDetalhe } from "@/lib/escale/campanhas/rotas";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

import { DetalheDaCampanha } from "./_client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campanha" };

export default async function CampanhaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ── FORK ESCALE · Fase 8C ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    redirect(rotaDoDetalhe(id));
  }
  // ── fim FORK ESCALE ──
  return <DetalheDaCampanha id={id} />;
}
```

Em `tests/unit/escale-campanhas-pagina.test.tsx` (8A), acrescente junto dos outros `vi.mock` do topo:

```tsx
vi.mock("@/lib/escale/contatos/origens-da-pagina", () => ({
  origensDaPagina: vi.fn(async () => ({ origens: [], papel: "manager", opcoesDoFiltro: {} })),
}));
```

- [ ] **Step 7: Rodar e conferir**

Run: `corepack pnpm vitest run tests/unit/escale-detalhe-da-campanha-janela.test.tsx tests/unit/escale-detalhe-da-campanha-encaixe.test.tsx tests/unit/escale-campanhas-regras.test.ts tests/unit/escale-campanhas-pagina.test.tsx tests/unit/escale-casca-v2-original-intacto.test.tsx && corepack pnpm prettier --write components/escale/campanhas/detalhe tests/unit/escale-detalhe-da-campanha-janela.test.tsx tests/unit/escale-detalhe-da-campanha-encaixe.test.tsx && corepack pnpm eslint components/escale/campanhas lib/escale/campanhas app/app/campaigns && corepack pnpm typecheck`
Expected: PASS. Se a `escale-casca-v2-original-intacto` listar `app/app/campaigns/[id]/page.tsx` como arquivo do original alterado sem marca, confira que as duas marcas `FORK ESCALE · Fase 8C` estão no arquivo (o mesmo molde do `prospecting/page.tsx` da 8A).

- [ ] **Step 8: Commit**

```bash
git add components/escale/campanhas lib/escale/campanhas/rotas.ts app/app/campaigns/page.tsx "app/app/campaigns/[id]/page.tsx" tests/unit/escale-detalhe-da-campanha-janela.test.tsx tests/unit/escale-detalhe-da-campanha-encaixe.test.tsx tests/unit/escale-campanhas-regras.test.ts tests/unit/escale-campanhas-pagina.test.tsx
git commit -m "feat(escale): janela do detalhe da campanha sobre a lista, Pausar com o diálogo da Clint e os encaixes (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

---

### Task 12: Espanhol, cercas, PRD, LOG e o PR

**Files:**
- Modify: `lib/i18n/dicionario.ts`; fora do repositório, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md` e `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`

- [ ] **Step 1: Quais chaves já existem**

O dicionário recusa chave repetida. Use o mesmo script da 8A (Task 10, Step 1), com a lista desta fase:

```bash
cat > "$TEMP/chaves-8c.cjs" <<'EOF'
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

Cole as chaves do bloco abaixo (uma por linha, só a chave) em `$TEMP/chaves-8c.txt`, rode `node "$TEMP/chaves-8c.cjs" "$TEMP/chaves-8c.txt"` e **tire do bloco toda chave que sair como `JA:`**. Já ficaram de fora as que existiam em 19/10 ou que a 8A/2B criam: "Enviados", "Entregues", "Lidas", "Não enviado", "Em aberto", "Perdido", "min", "Nome", "Status", "Motivo", "Valor", "Criado em", "Enviado em", "Agendada para {data}", "Nenhum envio ainda", "contatos", "Resultado", "Editar", "Cancelar", "Filtros", "Aplicar", "Limpar filtros", "Limpar seleção", "Adicionar tag", "Criar negócio", "Excluir selecionados", "Ações em massa", "selecionados", "Tentar novamente", "Fechar", "Campanha não encontrada.", "Query inválida.", "Filtro inválido.", "Nenhum contato selecionado.", "No máximo 100.000 contatos por ação.", "Escolha a origem e a etapa.", "Não consegui completar essa ação. Tente de novo.", "O estado da campanha mudou enquanto esta ação era processada. Recarregue a tela.", "Pausar campanha", "Campanha pausada com sucesso!", "Campanha retomada com sucesso!", "Falha ao pausar a campanha. Tente novamente.", "Falha ao retomar a campanha. Tente novamente.", e os textos de `TEXTO_DA_EXCLUSAO` do original.

- [ ] **Step 2: O bloco do espanhol**

Em `lib/i18n/dicionario.ts`, logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` (depois do bloco da 8A e dos da 8B):

```ts
  // ─── FORK ESCALE · Fase 8C: detalhe da campanha ───
  "Informações da campanha": { es: "Información de la campaña" },
  "Sumário": { es: "Resumen" },
  "Detalhes": { es: "Detalles" },
  "Pausar": { es: "Pausar" },
  "Retomar": { es: "Reanudar" },
  "Baixar .CSV": { es: "Descargar .CSV" },
  "Baixar CSV": { es: "Descargar CSV" },
  "Carregando campanha": { es: "Cargando campaña" },
  "Não foi possível carregar a campanha.": { es: "No se pudo cargar la campaña." },
  "Não foi possível baixar o arquivo. Tente novamente.": { es: "No se pudo descargar el archivo. Inténtalo de nuevo." },
  "Adicionados p/ envio": { es: "Agregados p/ envío" },
  "Contatos da lista que podem receber a mensagem.": { es: "Contactos de la lista que pueden recibir el mensaje." },
  "Mensagens que saíram do número.": { es: "Mensajes que salieron del número." },
  "Percentual sobre os enviados.": { es: "Porcentaje sobre los enviados." },
  "Respondidas": { es: "Respondidas" },
  "Funil de conversão": { es: "Embudo de conversión" },
  "% sobre enviados": { es: "% sobre enviados" },
  "Distribuição por status": { es: "Distribución por estado" },
  "Lida": { es: "Leída" },
  "Entregue": { es: "Entregada" },
  "Enviado": { es: "Enviado" },
  "Erro": { es: "Error" },
  "Aguardando envio": { es: "Esperando envío" },
  "Ritmo de envio": { es: "Ritmo de envío" },
  "Calculado sobre os 1.000 disparos mais recentes.": { es: "Calculado sobre los 1.000 envíos más recientes." },
  "Motivos do erro": { es: "Motivos del error" },
  "% sobre não entregues": { es: "% sobre no entregados" },
  "Ver motivos": { es: "Ver motivos" },
  "Ocultar motivos": { es: "Ocultar motivos" },
  "1 motivo": { es: "1 motivo" },
  "{n} motivos": { es: "{n} motivos" },
  "1 falha de envio": { es: "1 falla de envío" },
  "{n} falhas de envio": { es: "{n} fallas de envío" },
  "{motivos} em {falhas}": { es: "{motivos} en {falhas}" },
  "1 falha": { es: "1 falla" },
  "{n} falhas": { es: "{n} fallas" },
  "Erro do canal: {codigo}": { es: "Error del canal: {codigo}" },
  "Limite de envio do número atingido": { es: "Límite de envío del número alcanzado" },
  "O número do usuário faz parte de um experimento da Meta": { es: "El número del usuario forma parte de un experimento de Meta" },
  "Destinatário incapaz de receber a mensagem": { es: "Destinatario incapaz de recibir el mensaje" },
  "Conta da Meta bloqueada": { es: "Cuenta de Meta bloqueada" },
  "Problema de pagamento na conta da Meta": { es: "Problema de pago en la cuenta de Meta" },
  "Mais de 24 horas desde a última mensagem do contato": { es: "Más de 24 horas desde el último mensaje del contacto" },
  "Limite de envio por denúncia de spam atingido": { es: "Límite de envío por denuncias de spam alcanzado" },
  "Meta optou por não entregar": { es: "Meta optó por no entregar" },
  "O contato parou de receber mensagens de marketing": { es: "El contacto dejó de recibir mensajes de marketing" },
  "As variáveis não conferem com o modelo": { es: "Las variables no coinciden con la plantilla" },
  "O modelo não existe nesse idioma": { es: "La plantilla no existe en ese idioma" },
  "Modelo pausado pela Meta": { es: "Plantilla pausada por Meta" },
  "Modelo desativado pela Meta": { es: "Plantilla desactivada por Meta" },
  "O canal recusou o envio": { es: "El canal rechazó el envío" },
  "Erro interno no envio": { es: "Error interno en el envío" },
  "Sem detalhe do erro registrado": { es: "Sin detalle del error registrado" },
  "Fora da lista": { es: "Fuera de la lista" },
  "Leu e não respondeu": { es: "Leyó y no respondió" },
  "Contatos que leram a mensagem e ainda não responderam.": { es: "Contactos que leyeron el mensaje y aún no respondieron." },
  "Oportunidade": { es: "Oportunidad" },
  "Ver contatos": { es: "Ver contactos" },
  "Não enviados": { es: "No enviados" },
  "Contatos que não receberam a mensagem por cancelamento, interrupção ou linha inválida.": { es: "Contactos que no recibieron el mensaje por cancelación, interrupción o línea inválida." },
  "Criar campanha": { es: "Crear campaña" },
  "A campanha foi criada como rascunho.": { es: "La campaña se creó como borrador." },
  "Negócios criados": { es: "Negocios creados" },
  "Negócios que nasceram desta campanha.": { es: "Negocios que nacieron de esta campaña." },
  "Valor em aberto": { es: "Valor abierto" },
  "Soma dos negócios em aberto desta campanha.": { es: "Suma de los negocios abiertos de esta campaña." },
  "Valor ganho": { es: "Valor ganado" },
  "Soma dos negócios ganhos desta campanha.": { es: "Suma de los negocios ganados de esta campaña." },
  "Custo da campanha": { es: "Costo de la campaña" },
  "Custo real": { es: "Costo real" },
  "Custo por resposta": { es: "Costo por respuesta" },
  "Custo real dividido pelas respostas.": { es: "Costo real dividido por las respuestas." },
  "Custo por negócio": { es: "Costo por negocio" },
  "Custo real dividido pelos negócios criados.": { es: "Costo real dividido por los negocios creados." },
  "Tempo mediano até resposta": { es: "Tiempo mediano hasta la respuesta" },
  "Metade das respostas chegou antes deste tempo.": { es: "La mitad de las respuestas llegó antes de este tiempo." },
  "Não foi possível calcular o tempo de resposta.": { es: "No se pudo calcular el tiempo de respuesta." },
  "h": { es: "h" },
  "dias": { es: "días" },
  "Benchmark da conta": { es: "Referencia de la cuenta" },
  "Média da taxa de resposta das 5 últimas campanhas concluídas.": { es: "Promedio de la tasa de respuesta de las 5 últimas campañas completadas." },
  "Ainda não há outras campanhas concluídas da conta para comparar.": { es: "Todavía no hay otras campañas completadas de la cuenta para comparar." },
  "Esta campanha": { es: "Esta campaña" },
  "Ganho": { es: "Ganado" },
  "Negócios criados por esta campanha": { es: "Negocios creados por esta campaña" },
  "Negócios em aberto criados por esta campanha": { es: "Negocios abiertos creados por esta campaña" },
  "Negócios ganhos criados por esta campanha": { es: "Negocios ganados creados por esta campaña" },
  "{n} negócios gerados por {campanha}": { es: "{n} negocios generados por {campanha}" },
  "Não foi possível carregar os negócios.": { es: "No se pudieron cargar los negocios." },
  "Nenhum negócio encontrado": { es: "No se encontró ningún negocio" },
  "Os negócios criados por esta campanha aparecerão aqui.": { es: "Los negocios creados por esta campaña aparecerán aquí." },
  "{n} de {total}": { es: "{n} de {total}" },
  "Contato": { es: "Contacto" },
  "Telefone": { es: "Teléfono" },
  "Origem": { es: "Origen" },
  "Email": { es: "Correo" },
  "Prévia da mensagem": { es: "Vista previa del mensaje" },
  "online": { es: "en línea" },
  "Sem mensagem": { es: "Sin mensaje" },
  "Primeiro nome": { es: "Primer nombre" },
  "Saudação": { es: "Saludo" },
  "Marketing": { es: "Marketing" },
  "Utilidade": { es: "Utilidad" },
  "Autenticação": { es: "Autenticación" },
  "Modelo utilizado": { es: "Plantilla utilizada" },
  "Esta campanha envia uma mensagem livre, sem modelo aprovado.": { es: "Esta campaña envía un mensaje libre, sin plantilla aprobada." },
  "Dispositivo de envio": { es: "Dispositivo de envío" },
  "Entrega": { es: "Entrega" },
  "Números extras": { es: "Números extra" },
  "Nenhum": { es: "Ninguno" },
  "Base legal": { es: "Base legal" },
  "O do número": { es: "El del número" },
  "Intervalo entre mensagens": { es: "Intervalo entre mensajes" },
  "Teto por dia": { es: "Tope por día" },
  "Teto por hora": { es: "Tope por hora" },
  "Janela de envio": { es: "Ventana de envío" },
  "{inicio}h às {fim}h": { es: "{inicio}h a {fim}h" },
  "Interesse legítimo": { es: "Interés legítimo" },
  "Consentimento": { es: "Consentimiento" },
  "Intervalo entre mensagens (segundos)": { es: "Intervalo entre mensajes (segundos)" },
  "Janela: começa às (hora)": { es: "Ventana: empieza a las (hora)" },
  "Janela: termina às (hora)": { es: "Ventana: termina a las (hora)" },
  "Deixe vazio para usar o do número.": { es: "Déjalo vacío para usar el del número." },
  "Salvar": { es: "Guardar" },
  "Ritmo atualizado.": { es: "Ritmo actualizado." },
  "Não foi possível salvar o ritmo. Tente novamente.": { es: "No se pudo guardar el ritmo. Inténtalo de nuevo." },
  "O intervalo vai de 1 a 86.400 segundos.": { es: "El intervalo va de 1 a 86.400 segundos." },
  "Os tetos vão de 1 a 10.000 mensagens.": { es: "Los topes van de 1 a 10.000 mensajes." },
  "Preencha o início e o fim da janela, ou deixe os dois vazios.": { es: "Completa el inicio y el fin de la ventana, o deja ambos vacíos." },
  "A janela precisa terminar depois de começar.": { es: "La ventana debe terminar después de empezar." },
  "Buscar contato": { es: "Buscar contacto" },
  "Personalizar colunas": { es: "Personalizar columnas" },
  "Redefinir": { es: "Restablecer" },
  "Filtros da campanha": { es: "Filtros de la campaña" },
  "Todos os status": { es: "Todos los estados" },
  "Motivo do erro": { es: "Motivo del error" },
  "Nenhuma falha nesta campanha.": { es: "Ninguna falla en esta campaña." },
  "Recebido": { es: "Recibido" },
  "Lido": { es: "Leído" },
  "Respondido": { es: "Respondido" },
  "Envio em andamento": { es: "Envío en curso" },
  "Remover filtro": { es: "Quitar filtro" },
  "Selecionar a página": { es: "Seleccionar la página" },
  "Selecionar": { es: "Seleccionar" },
  "Selecionar todos os {total} contatos filtrados": { es: "Seleccionar los {total} contactos filtrados" },
  "Não foi possível carregar os contatos.": { es: "No se pudieron cargar los contactos." },
  "Nenhum contato com esses filtros": { es: "Ningún contacto con esos filtros" },
  "Nenhum contato foi encontrado": { es: "No se encontró ningún contacto" },
  "Aguardando o processamento da campanha.": { es: "Esperando el procesamiento de la campaña." },
  "0 contatos": { es: "0 contactos" },
  "1 contato": { es: "1 contacto" },
  "{n} contatos": { es: "{n} contactos" },
  "{inicio} a {fim} de {total} contatos": { es: "{inicio} a {fim} de {total} contactos" },
  "Tirar da lista": { es: "Quitar de la lista" },
  "{n} contatos tirados da lista.": { es: "{n} contactos quitados de la lista." },
  "Os contatos selecionados saem desta campanha e não recebem a mensagem. Deseja continuar?": { es: "Los contactos seleccionados salen de esta campaña y no reciben el mensaje. ¿Deseas continuar?" },
  "No máximo 5.000 contatos numa campanha nova a partir da seleção.": { es: "Como máximo 5.000 contactos en una campaña nueva a partir de la selección." },
  "Só dá para tirar contatos da lista antes de o envio começar.": { es: "Solo se pueden quitar contactos de la lista antes de que empiece el envío." },
  "No máximo 5.000 contatos fora da lista por campanha.": { es: "Como máximo 5.000 contactos fuera de la lista por campaña." },
  "O envio desta campanha é interrompido até você retomar.": { es: "El envío de esta campaña se interrumpe hasta que lo reanudes." },
  "Contatos já alcançados": { es: "Contactos ya alcanzados" },
  "Quem já recebeu a mensagem continua com ela normalmente, nada é desfeito.": { es: "Quien ya recibió el mensaje sigue con él normalmente, nada se deshace." },
  "Contatos ainda não alcançados": { es: "Contactos aún no alcanzados" },
  "Nenhum contato novo recebe mensagem enquanto a campanha estiver pausada.": { es: "Ningún contacto nuevo recibe mensajes mientras la campaña esté pausada." },
  "Mensagens em trânsito": { es: "Mensajes en tránsito" },
  "Uma mensagem já entregue à Meta no momento da pausa ainda é concluída normalmente.": { es: "Un mensaje ya entregado a Meta en el momento de la pausa se completa normalmente." },
  "Você pode retomar ou cancelar esta campanha quando quiser. Ao retomar, o envio continua apenas para quem ainda não foi alcançado.": { es: "Puedes reanudar o cancelar esta campaña cuando quieras. Al reanudar, el envío continúa solo para quien aún no fue alcanzado." },
```

- [ ] **Step 3: Os gates da fase (sem `test:db` e sem a rodada cheia)**

O `dicionario.ts` **não** passa pelo prettier (arquivo do original; o diff viraria o arquivo inteiro).

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts tests/unit/vocabulario-do-funil.test.ts tests/unit/evidencia-citada.test.ts tests/unit/escale-casca-v2-original-intacto.test.tsx tests/unit/manifest-x-migrations.test.ts tests/unit/escale-tema.test.ts tests/unit/escale-casca-tokens.test.ts tests/unit/campanha-escreve-como-servidor.test.ts
corepack pnpm vitest run $(git diff --name-only escale-crm/main...HEAD | grep -E "\.test\.tsx?$" | grep -v "^tests/invariants")
corepack pnpm typecheck && corepack pnpm eslint $(git diff --name-only escale-crm/main...HEAD | grep -E "\.(ts|tsx)$")
```

Expected: tudo PASS. Se a `i18n-espanhol-cobre-a-tela` acusar prosa fora de `t()`, a mensagem diz o arquivo e o texto.

```bash
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol do detalhe da campanha (Fase 8C)

Co-Authored-By: Claude <modelo da sessão> <noreply@anthropic.com>"
```

- [ ] **Step 4: O PRD e o LOG (fora do repositório)**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\8-campanhas.md`:
- seção 8, linha da 8C: "Estado" de `proposta` para `executada (PR #<n>, <data>); testes e publicação no fim da Frente B`;
- seção 4, tabela C: "Fase" de C1–C15 para `8C ✅`, com as diferenças declaradas (lista "Diferenças declaradas" abaixo);
- seção 7: "Exportação .CSV" com a nota da Q1 (baixa na hora, até 20.000) se o usuário não tiver respondido.

Em `C:\Documentos\projetos claude\Deskcom CRM\LOG.md`: uma entrada nova no topo da "Linha do tempo" (data, a 8C executada, o PR, a migration 9310, os provisórios, as perguntas Q1 e Q2) e "Onde estamos"/"Próximos passos" reescritos (próximo: a 8D; a bateria da Frente B e a publicação continuam no fim da frente).

- [ ] **Step 5: O PR**

```bash
git fetch escale-crm --quiet && git rebase escale-crm/main
git push -u escale-crm feat/fase-8c-detalhe-da-campanha
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-8c-detalhe-da-campanha \
  --title "feat(escale): Fase 8C — detalhe da campanha como na Clint (Sumário e Detalhes)" \
  --body "$(cat <<'EOF'
## O que entra
- Com a casca, clicar numa campanha abre a janela da Clint sobre a lista (`/app/campaigns?campanha=<id>`): "Informações da campanha", Pausar (com o diálogo da Clint) e Retomar, "Baixar .CSV" e o X.
- Sumário: 4 cartões, funil e rosca, ritmo por hora, motivos do erro, "Leu e não respondeu", "Não enviados", RESULTADO (negócios, valor em aberto e ganho com a gaveta), custos com "—", tempo mediano e benchmark; à direita a prévia do celular, o modelo, o dispositivo e o bloco "Entrega" (ritmo editável, números extras, base legal).
- Detalhes: busca, filtros (status e motivo do erro) com chips, colunas, seleção da 2B e as ações em massa (Adicionar tag, Criar negócio, Criar campanha, Excluir selecionados), 20 por página.
- Migration 9310: nove funções invoker (só gerente) e dois índices.
- Molde reaproveitável para a 8D em `components/escale/campanhas/molde/`.

## Diferenças declaradas
- Datas, números e R$ no formato brasileiro; a régua das contagens é a da 8A (erro não conta como enviado).
- Ritmo com o dia junto quando passa de um dia; status do filtro com "Aguardando envio" e "Fora da lista" (sem "Duplicado").
- "Baixar .CSV" na hora, até 20.000 (a Clint gera em segundo plano; pergunta Q1).
- Provisórios por falta de print: diálogo de pausar, gaveta de negócios, barra da seleção, "Personalizar colunas", "Não enviados", motivos abertos, chips, carregando e erro.

## Verificação
- Testes da fase, typecheck, eslint e as cercas da casca.
- `test:db` (inclui `tests/invariants/escale-detalhe-da-campanha-9310.test.ts`), `test:db:update`, rodada cheia, revisor e conferência visual: na bateria do fim da Frente B.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge --repo rgisjr/escale-crm --merge --delete-branch=false
```

Expected: o PR mergeado na `main` do `rgisjr/escale-crm`. **Nada de tag, release nem VPS** (fim da Frente B).

## Fase 8C — detalhe da campanha como na Clint

Linha da seção 8 do PRD depois desta fase: `| 8C | **Detalhe:** C1–C15 | … | executada (PR #<n>); testes e publicação no fim da Frente B |`.

## Diferenças declaradas

1. **Régua das contagens** (N3): erro não conta como enviado (a Clint conta). Cartões e funil batem com a barra da lista da 8A.
2. **Formatos** (regra 5): "10/09/2026 12:39" no lugar de "10 Set 26, 12:39"; "R$ 14.680,92"; números com ponto de milhar.
3. **Ritmo por hora**: barras de hora cheia ("12:00"); com mais de um dia na amostra, "10/09 12:00" (a Clint mostra um horário só, "12:40").
4. **Filtro de status**: várias escolhas; sem "Duplicado" (aqui é "Fora da lista" com o motivo); "Aguardando envio" e "Fora da lista" são nossos.
5. **"Baixar .CSV"** na hora (Q1).
6. **"Excluir selecionados"** só antes de qualquer envio; tira da lista e da próxima preparação (a Clint não diz a regra).
7. **"Criar campanha"** duplica esta campanha com os contatos marcados (até 5.000) e abre o rascunho no assistente.
8. **"Valor em aberto"** no lugar de "Valor em pipeline" (a palavra "pipeline" não chega à tela, cerca `vocabulario-do-funil`).
9. **Benchmark**: média das taxas das 5 concluídas; "Esta campanha" em verde quando igual ou acima (a cor acima da média não foi vista).
10. **Provisórios** (sem print): diálogo de pausar, gaveta de negócios, barra da seleção, "Personalizar colunas" (o número é o de colunas escondidas), "Não enviados", motivos abertos, chips, carregando, erro, botões Pausar/Retomar no cabeçalho, "Aguardando o processamento da campanha." (a Clint tem o erro de digitação "campanhas").
11. **Sem "Ver fluxo completo"** (a campanha é só de disparo, R6).

## Verificação

1. **Por task:** os testes que a task cria, os guardas dos arquivos tocados, typecheck e eslint (G1).
2. **Bateria única da Frente B (depois da última fase da frente):** `test:db` (inclui `tests/invariants/escale-detalhe-da-campanha-9310.test.ts`), `test:db:update`, rodada cheia em segundo plano, um revisor (Opus 5.5, high) e a conferência visual lado a lado com 009–013, com a lista escrita das diferenças. Antes de publicar: abrir `/app/campaigns?campanha=<id>` com a casca e ler o console (tela nova sem provedor já derrubou produção), e conferir no banco, só leitura, `select proname from pg_proc where proname like 'fn_escale_%campanha%' or proname like 'fn_escale_destinatari%' or proname = 'fn_escale_motivos_do_erro'` (9 funções) e os dois índices.
3. **Desempenho:** numa campanha grande (≥ 5.000 destinatários), `explain analyze` de `fn_escale_destinatarios_da_campanha` e de `fn_escale_sumario_da_campanha` como gerente (só leitura). Acima de 500 ms, registrar no LOG para um índice novo numa migration seguinte.

## Fora desta fase (registrado)

- A fila de exportação com aprovação para o .CSV da campanha (se a resposta da Q1 for "segundo plano").
- O custo calculado (preço por mensagem e a conta) — R4, depois.
- Os avisos da Meta no cartão do modelo ("Pausado pela Meta", "Reprovado", "Em análise", "Alteração anunciada") — dependem de a 8B guardar a situação do modelo.
- A chave de permissão por pessoa (`CAMPAIGN_WHATSAPP_BULK`), com a trilha de grupos de permissão.
- A aba Prospecção (8D), que reaproveita o molde desta fase.

## Self-review (19/10)

1. **Cobertura do PRD:** C1 → Tasks 7, 11 (janela, cabeçalho, Pausar/Retomar, Baixar .CSV, X, abas); C2 → Tasks 1, 8 (4 cartões com dica); C3 → Tasks 1, 2, 7, 8 (funil e rosca); C4 → Tasks 2, 8 (ritmo por hora, 1.000); C5 → Tasks 1, 2, 8 (motivos agrupados, texto em português); C6 → Tasks 1, 8, 11 ("Leu e não respondeu", "Ver contatos"); C7 → Tasks 2, 3, 8 (negócios, valores, gaveta, CSV); C8 → Task 8 (custos com "—"); C9 → Tasks 1, 2, 8 (mediana, benchmark); C10 → Tasks 1, 7, 9 (prévia, modelo, dispositivo; sem fluxo); C11 → Tasks 1, 2, 3, 10 (busca, filtros, colunas, tabela, "1 a 20 de 30", fora da lista com motivo); C12 → Tasks 2, 5, 10 (seleção e as quatro ações); C13 → Task 9 (Entrega); C14 → Task 11 (diálogo de pausar); C15 → Tasks 5, 8 ("Não enviados › Criar campanha"). Seção 5 → Tasks 2–5 (gerente nas rotas e nas funções). Seção 6 → Tasks 1, 2, 10. Seção 7 → Tasks 2, 4 (métricas, exportação), Task 8 (custo preparado).
2. **Placeholders:** nenhum "TBD"; os pontos condicionais (colunas do modelo da 8B, `PreviaDoCelular` já existente, nomes de cerca) dizem o que conferir e o que trocar.
3. **Tipos entre tasks:** `SumarioDaCampanha`/`ResultadoDaCampanha`/`DadosDoDetalhe` (1) saem do `banco.ts` (3), passam pelo hook (6) e entram no Sumário (8), na coluna (9) e na janela (11); `FiltrosDeDestinatarios`/`compilarFiltrosDeDestinatarios`/`textoDosFiltrosDeDestinatarios` (1) são os da rota (3), da massa (5), do hook (6) e dos Detalhes (10); `FiltroDeDestinatariosCompilado` (1) é o que a 9310 lê (2); `PedidoDaCampanha`/`RespostaDaMassa`/`alvoDaSelecaoDaCampanha` (5) são os do hook (6) e dos Detalhes (10); `ParteDaMensagem` (1) é o da `PreviaDoCelular` (7); `CorpoDoRitmo` (1) é o do hook (6) e da `JanelaDoRitmo` (9); as props do molde (7) batem com o contrato combinado com a 8D.
