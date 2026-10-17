# Fase 1F-a — Campos do CRM (catálogo da organização, igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Por que este plano existe.** Em 16/10 o usuário decidiu: **"os campos são do CRM, não por origem"**. Hoje cada origem guarda os seus campos personalizados do negócio em `crm_pipelines.settings.fields`. Na Clint os campos são da **conta** e valem em toda origem. Esta fase muda o modelo de dados **antes** da tela de configurações da origem (1F, plano `2026-10-16-fase-1f-configuracoes-da-origem-v3.md`), que é executada depois dela.

## Perguntas em aberto (respostas do usuário antes do "pode fazer")

| # | Pergunta | O que o plano faz se a resposta for "sim, como está" |
|---|---|---|
| Q1 | **Todo negócio passa a mostrar os campos de todas as origens** (vazios onde não há valor). É o que a Clint faz por padrão: ela só esconde campo por origem na subaba "Visualização de campos" (`settings.hidden_fields`), que é a D16 (Fase 2) e fica "Em breve" na 1F. Está bem assim, ou a migração deve gravar já uma lista de "ocultos por origem" para cada origem continuar mostrando só os campos que tem hoje? | Todo negócio mostra o catálogo inteiro (C2). A lista de ocultos fica para a D16 |
| Q2 | **Conflito ao juntar:** a mesma chave com tipo ou rótulo diferentes em duas origens (por exemplo `cpf` texto numa e número na outra). A regra proposta: **vence a definição da origem que aparece primeiro no painel** (ativas antes das arquivadas, depois a posição, depois a data de criação). As outras ficam registradas na coluna `divergencias` e no relatório do PR. Os valores já gravados nos negócios não mudam. Aceita a regra? | Aplica a regra (C6) e mostra o relatório. Se o usuário quiser outra escolha num campo, ele troca o tipo ou o rótulo depois em Configurações › Funis |
| Q3 | **Teto de campos:** hoje cada origem aceita 50 campos. Juntando, uma organização pode passar disso. O plano sobe o teto para **200 por organização**. A Clint não mostra limite nos textos lidos. Serve 200? | `CAMPOS_DO_CRM_MAX = 200` (C7) |
| Q4 | **Quem cria, muda e apaga campo:** só administrador, como hoje em Configurações › Funis. Confirma? | RLS e gatilho só deixam administrador, suporte com escrita e serviço (C5) |
| Q5 | **Apagar um campo** tira o campo e a regra de obrigatório de **todas** as origens (texto da Clint: "A exclusão desse campo remove em toda origem.") e **não apaga os valores** já gravados nos negócios (ficam no banco, sem aparecer). Confirma? | C8 |
| Q6 | **Tela "Gerenciamento de campos" da Clint** (Configurações › Gerenciamento de campos: abas Contato, Empresa e Negócio, grupos, "Adicionar campo", "Adicionar grupo"). Não há print dela. Nesta fase quem edita o catálogo continua sendo a tela do original Configurações › Funis. Quer uma fase própria para a tela da Clint? Se sim, mande os prints listados abaixo | Nada de tela nova nesta fase (C11) |
| Q7 | **G1, verificação enxuta** (seção "Verificação"): aprova? | Sem aprovação, vale a verificação da 1E (gates cheios por task) |
| Q8 | **CI do fork:** o workflow `ci` está desligado à mão em `rgisjr/escale-crm` (estado `disabled_manually`). Por isso o PR #17 só rodou "Publicar imagem Docker (GHCR)". Quer ligar (`gh workflow enable ci -R rgisjr/escale-crm`)? Custo: os jobs `verify-parte` (4 partes) e `invariants-majors` rodam em `ubuntu-latest` a cada push de PR | Não liga nada. A verificação continua local |

**Prints que faltam** (nenhum bloqueia esta fase, que não desenha tela nova):
1. Configurações › Gerenciamento de campos da Clint: a lista com as abas Contato, Empresa e Negócio, um grupo aberto, o botão "Adicionar campo" clicado (a janela de criar campo), o ⋮ de um campo e a confirmação "A exclusão desse campo remove em toda origem. Deseja continuar?".
2. A subaba "Visualização de campos" da janela da origem (as chaves de ligar e desligar campo, "Utilizar a mesma configuração do grupo").
3. O "Gerenciar campos" da aba Negócio do card (a ficha 01-008 cita o atalho; não há print dele aberto).

**Goal:** Os campos personalizados do **negócio** passam a ser um **catálogo da organização**, como na Clint. Um campo criado em qualquer origem aparece em todas; apagar remove de todas, junto com a regra de obrigatório; a regra de obrigatório continua **por origem**. Nenhuma tela que lê campos precisa mudar, nas duas cascas. A janela "Personalizar cards" (1E) perde a adaptação "de outra origem", que deixa de ter sentido.

**Architecture:**
- **Banco.** Migration **9006** (`20261021120000_9006_campos_do_crm.sql`):
  - tabela nova `crm_campos_do_negocio` (uma linha por campo e organização: `chave`, `definicao`, `posicao`, `divergencias`), com RLS por papel;
  - `crm_pipelines.settings.fields` vira a **projeção** do catálogo em cada origem: as definições do catálogo, na ordem dele, mais o `obrigatorio_em` que cada origem tem. Quem mantém a projeção são dois gatilhos (um em cada tabela). Todo leitor de `settings.fields` continua igual;
  - gravar `settings.fields` com chave nova ou com a definição mudada **adota** no catálogo (só administrador, suporte com escrita ou serviço). Gravar sem uma chave **não** apaga: apagar é só no catálogo;
  - a junção dos `settings.fields` que existem hoje roda uma vez, na própria migration, por chave, e é idempotente.
- **Código.** Três encaixes pequenos no original, com `FORK ESCALE · Fase 1F-a`:
  - `lib/schemas/settings.ts`: o teto de 200 e a chave `campos_removidos` no patch;
  - `app/actions/settings/updatePipelineConfig.ts`: apaga do catálogo as chaves de `campos_removidos`;
  - `app/app/settings/tenant/pipelines/_client.tsx` (Configurações › Funis): manda as chaves que a pessoa tirou e avisa que o campo vale em toda origem.
- **Fork.** A janela "Personalizar cards" e a rota `GET /api/v1/capas-do-card/campos` (do fix `8c52e6cb8`) ficam, mas sai o "de outra origem": toda origem tem o catálogo inteiro.

**Tech Stack:** Postgres 15+/Supabase (RLS, gatilhos definer), Next.js 16 App Router (server action), React 19, TypeScript estrito, Zod 4, Vitest + Testing Library.

## Referência visual e evidência da Clint

Esta fase não desenha tela. A tabela mostra de onde vem o modelo de dados. Os caminhos de imagem ficam **sem crase** de propósito: o guarda `tests/unit/evidencia-citada.test.ts` reprova o plano copiado para o repositório quando ele cita, entre crases ou em link, imagem que o git não versiona (foi uma das 4 regressões da 1E).

| O que mostra | Onde |
|---|---|
| A lista "Adicionar campo obrigatório" de uma origem (Leads INSS Whatsapp) oferece, no grupo NEGÓCIO, campos que vieram de outros processos (por exemplo "Qual é o Estágio da Obra?"): a lista é a da conta | print P11: C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1f\2026-10-16-11-campos-lista-de-campos.jpg |
| A importação mapeia para "Selecione um campo da Clint", agrupado por CONTATO e com contador: campos da conta | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\38c-importar-seletor-de-campo.jpg |
| "Personalizar cards" lista os campos da conta, por objeto | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-019-personalizacao-cards.png |
| Textos: "Campo personalizado da sua conta" (`component.ExplorePopover.customFieldNotice`), "Gerenciamento de campos" (`component.Settings.fieldManagement`, item de Configurações), "Campos cadastrados", "Adicionar campo", "Adicionar grupo" (`component.FieldsConfigTab.*`), **"A exclusão desse campo remove em toda origem. Deseja continuar?"** e **"Se este campo estiver configurado como obrigatório em alguma origem, a regra será removida."** (`component.FieldsConfig.deleteField*`) | `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\catalog-v2\i18n-pt.txt`, linhas 8105, 8224–8248 e 12564 |
| Por origem a Clint guarda `settings.required_fields` (regras de obrigatório) e `settings.hidden_fields` (campos escondidos naquela origem: "Os campos desativados ficarão ocultos na origem.", `component.HiddenFields.*`, linhas 8926–8934) | `...\catalog-v2\settings-paths.txt` e `i18n-pt.txt` |
| O componente de gerenciamento lê `fields_template` da conta, com as abas CONTACT, ORGANIZATION e DEAL | `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\index-Df550LdA.js.txt` (procure `FieldsConfigTab.title`) |
| Espanhol da Clint para o aviso: "Si este campo está configurado como obligatorio en algún origen, se eliminará la regla." | `...\raw-v2\js\es-ES--Nhr_a4A.js.txt` |

**Conclusão:** a Clint **não** escolhe campos por origem com chips (o modelo da F5 de motivos não se aplica). O catálogo é da conta; cada origem tem as suas regras de obrigatório e, numa subaba própria, os campos que esconde. Esta fase copia o catálogo e as regras por origem; o "esconder por origem" fica na D16.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| C1 | **Catálogo da organização:** tabela `crm_campos_do_negocio` (`organization_id`, `chave`, `definicao`, `posicao`, `divergencias`). A `definicao` é o que hoje vai em cada item de `settings.fields`, sem `key` e sem `obrigatorio_em` (`label`, `type`, `options`, `required`, `mostrar_quando`) | Clint: campos da conta ("Campo personalizado da sua conta"). Usuário, 16/10 |
| C2 | **Toda origem vê o catálogo inteiro.** Não há seleção por origem (chips). O "esconder por origem" da Clint é a subaba "Visualização de campos" (`hidden_fields`), que é a D16 e fica para depois | Código e textos da Clint (tabela acima). Pergunta Q1 |
| C3 | **`settings.fields` continua existindo, como projeção mantida pelo banco** (definições do catálogo + `obrigatorio_em` da origem). Ninguém que lê muda | São **28 arquivos de produção** que leem `settings.fields` (lista abaixo), dos dois lados (casca e lateral), do servidor (regra de obrigatório, mover, clonar, lote, agentes, automações, MCP) e da tela. Trocar todos seria uma fase inteira e um diff enorme nos arquivos do Rafael, o que encarece cada sincronização semanal (roteiro, princípio 6). Com a projeção no banco, os dois lados enxergam o catálogo sem mudar nada |
| C4 | **A regra de obrigatório continua por origem:** o `obrigatorio_em` de cada item de `settings.fields` (e, na 1F, o `escale_ao_sair`) é da origem. O catálogo não guarda regra | Clint: `settings.required_fields` por origem |
| C5 | **Quem grava o catálogo:** RLS só deixa administrador (`fn_role_at_least(…, 'admin')`) e o suporte com escrita (`fn_is_platform_admin_full()`). Gravar `settings.fields` de uma origem **adota** no catálogo: chave nova cria o campo; definição diferente da anterior atualiza o campo em todas as origens. A adoção só vale para administrador, suporte com escrita e serviço (sem `auth.uid()`). O gerente pode gravar `settings` (a policy dele já permite), mas a parte dos campos é ignorada e a projeção prevalece. **Gravar sem uma chave não apaga:** apagar é `delete` no catálogo | Mantém a régua de hoje (`updatePipelineConfig` exige administrador). A adoção faz a tela Configurações › Funis, a captação (`CadastrarCampo`), os seeds e os testes e2e que gravam `settings.fields` continuarem funcionando sem mudança. "Não apagar por ausência" evita que uma tela aberta há tempo apague o campo que outra pessoa acabou de criar |
| C6 | **Junção dos campos de hoje:** por chave exata; vence a definição da origem que aparece primeiro (ativas antes das arquivadas, `position`, `created_at`, `id`); a posição do campo segue essa ordem; as definições perdedoras com tipo ou rótulo diferente vão para `divergencias` (até 20 por campo). Item inválido (chave fora do padrão, sem rótulo, tipo desconhecido) não entra e some da projeção (os leitores já o ignoravam: `camposDoFunil` passa cada item no `customFieldSchema`). **Idempotente:** rodar de novo não duplica nem muda nada. Os valores em `crm_leads.custom_fields` e `contacts.custom_fields` não mudam | Pergunta Q2. Renomear chave para resolver conflito exigiria reescrever valores de negócios e as regras de automação que guardam a chave do campo |
| C7 | **Teto de 200 campos por organização** (`CAMPOS_DO_CRM_MAX`), no lugar dos 50 por origem: no patch de Configurações › Funis, no botão "Adicionar campo" e no limite da captação | Pergunta Q3 |
| C8 | **Apagar um campo** tira o campo e a regra dele de todas as origens (o gatilho reprojeta). Os valores ficam nos negócios, invisíveis. Uma chave órfã em `escale_ao_sair` (1F) é ignorada, porque a leitura é tolerante | Clint: "A exclusão desse campo remove em toda origem." e "…a regra será removida." Pergunta Q5 |
| C9 | **Contato:** a página do contato tira as definições dos campos da origem padrão (`useDefaultPipeline` + `camposDoFunil`, `app/app/contacts/[id]/_client.tsx:85` e `:537`). Isso **não** é um catálogo da organização: a migration 0211 só pôs o VALOR no contato (`contacts.custom_fields`); a definição é a da origem padrão. Com a projeção, a origem padrão traz o catálogo inteiro, e a página continua igual. Quando a marca `is_default` sumir (F12 da 1F), qualquer origem serve. Os campos próprios do contato (a aba CONTACT da Clint) são da Fase 2 | Achado desta revisão |
| C10 | **"Personalizar cards" (1E):** sai o "de outra origem" (`camposDeOutraOrigem`, o sufixo na linha e a chave do dicionário). Ficam a rota `GET /api/v1/capas-do-card/campos` e o "soltar o campo que não existe mais" (`limparCamposSemOrigem`), que agora quer dizer "o campo apagado do CRM" | Toda origem tem o catálogo inteiro, então nenhum campo escolhido é "de outra origem" |
| C11 | **Sem tela "Gerenciamento de campos" nesta fase.** Quem edita o catálogo é Configurações › Funis (o original), que ganha o aviso de que o campo vale em toda origem. O link "Criar campos em Configurações › Funis" da 1F aponta para lá | Sem print (Q6). Regra do produto: não inventar tela da Clint |
| G1 | **Verificação enxuta (pendente de aprovação do usuário).** Ver a seção "Verificação" | O usuário reclamou que a 1E levou ~6 h, das quais ~3 h foram gates cheios locais |

## Quem lê e quem grava `settings.fields` hoje (levantamento de 16/10)

**Lido por `camposDoFunil` (`lib/leads/campos-do-funil.ts`) ou direto do `settings`.** Nenhum muda nesta fase (C3):

| Lado | Arquivos |
|---|---|
| Servidor: regra de obrigatório e escrita do negócio | `lib/leads/campos-exigidos.ts` (via `camposDoFunil`), usado por `app/api/v1/leads/_handler.ts`, `app/api/v1/leads/[id]/move/route.ts`, `app/api/v1/leads/[id]/clone/route.ts`, `app/api/v1/leads/bulk/route.ts`, `lib/leads/transfere-para-o-funil.ts`, `lib/leads/encerramento.ts`, `lib/leads/handoff-stage-move.ts`, `lib/leads/appointment-stage-move.ts`, `lib/leads/agent-stage-sync.ts`, `lib/agent-engine/edge/crm/move-lead-stage.ts`, `lib/automation/actions/create-or-move-lead.ts` |
| Servidor: outros | `app/api/v1/contacts/[id]/crm-summary/route.ts:196`, `lib/mcp/conferencia-de-campos.ts:142`, `lib/mcp/tools/leads.ts`, `lib/automation/dados-do-formulario.ts:96`, `lib/automation/gatilho-de-data-do-funil.ts`, `lib/leads/clonar-para-funil.ts` (comenta) |
| Tela do original (lateral) | `components/kanban/KanbanBoard.tsx:451` (dossiê), `components/kanban/CalendarioDoFunil.tsx:97` e `:371`, `app/app/contacts/[id]/_client.tsx:537`, `app/app/webhooks/_components/RuleEditor.tsx:317`, `ActionConfigForm.tsx:185` e `:285`, `CadastrarCampo.tsx:78`, `app/app/webhooks/automacoes/[id]/_components/PainelDaCaixa.tsx:88`, `CaixaDaAutomacao.tsx:131`, `app/app/ai/followups/[id]/_components/forms/MatchReplyForm.tsx:46`, `app/app/settings/tenant/pipelines/_client.tsx:332` |
| Tela do fork (casca) | `components/escale/visualizacoes/QuadroCombinado.tsx:250`, `components/escale/filtros/ExportarCards.tsx:66`, `lib/escale/filtros/campos.ts:50` (1D), `lib/escale/capa/tipos.ts:166` (1E), `app/api/v1/capas-do-card/campos/route.ts` (fix da 1E) |
| Banco | nenhuma função SQL lê `settings->'fields'`; só o `default` da coluna (`supabase/baseline.sql:1519`) |
| Testes | 10 testes unitários usam `settings.fields` com dublê (não tocam o banco: não mudam); `tests/e2e/qa-l12-troca-de-funil.spec.ts:50` grava `settings.fields` pela REST com service role (a adoção do C5 cobre); nenhum teste de `tests/invariants` grava `fields` |

**Gravado por:**

| Quem | Como | O que muda |
|---|---|---|
| `app/actions/settings/updatePipelineConfig.ts:62` | regrava `fields` inteiro; chamado por Configurações › Funis (`_client.tsx:400`) e pela captação (`CadastrarCampo.tsx:97`, `comNovoCampo`) | encaixe: `campos_removidos` apaga do catálogo (Task 3). Criar e editar passam pela adoção, sem mudança |
| `app/api/v1/pipelines/route.ts:129` (criar origem) | insere com o `settings` padrão (`fields: []`) | nada: o gatilho dá à origem nova o catálogo inteiro |
| seed da organização (`supabase/baseline.sql:716`) e `scripts/seed-crm-vivo.ts:249` | inserem ou regravam `settings` | nada: a adoção cobre |
| 1F (`2026-10-16-fase-1f-configuracoes-da-origem-v3.md`) | `gravarRegrasDosCampos` regrava `fields` com o `obrigatorio_em` novo | nada: definição igual = só a regra muda |

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- **Base:** `escale-crm/main` **com a 1E mergeada (PR #17, `b5b831a15`) e com o fix `fix/fase-1e-campos-de-outra-origem` (commit `8c52e6cb8`) mergeado**. A Task 1 prova. Se o fix ainda não estiver na `main`, PARE e pergunte (a Task 4 desfaz parte dele).
- **Branch:** `feat/fase-1f-a-campos-do-crm`.
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:** push em `origin` (Rafael), merge, tag, release, VPS, gravar no banco de produção (nem com o MCP de escrita).

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` precisa do Docker. Se `docker info` falhar, PARE e peça ao usuário para abrir o Docker Desktop.

### Migration 9006

- Arquivo: `supabase/migrations/20261021120000_9006_campos_do_crm.sql`. Em 16/10 a última da `main` é a 9005 (`20261020120000_9005_capas_do_card.sql`). Se houver uma maior quando a execução começar, use o próximo número livre e um timestamp maior, em TODAS as tasks, e avise a 1F v3 (ela usa o número seguinte).
- A primeira linha é `-- manifest:`, numa linha só. **Não** acrescentar linha no `MANIFEST.md`.
- O MESMO SQL vai para `supabase/baseline.sql`, logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` e depois do bloco 9005, com o cabeçalho `-- ---- FORK ESCALE · campos do CRM (migration 9006) ----`.
- Tabela nova: entra na varredura de RLS (`tests/invariants/rls-completude-varredura.test.ts`, logo depois da entrada de `crm_capas_do_card`).

### Onde o fork entra nos arquivos do original

| Arquivo | O que muda |
|---|---|
| `lib/schemas/settings.ts` | `CAMPOS_DO_CRM_MAX = 200` logo antes de `export const pipelineConfigPatchSchema`; `fields` passa a `.max(CAMPOS_DO_CRM_MAX)`; a chave nova `campos_removidos` |
| `app/actions/settings/updatePipelineConfig.ts` | apaga do catálogo as chaves de `campos_removidos`, antes do `update`; a auditoria ganha `campos_removidos` |
| `app/app/settings/tenant/pipelines/_client.tsx` | as chaves que vieram do banco; `campos_removidos` no patch; o rótulo e o aviso dos campos; o teto do "Adicionar campo" |
| `lib/webhooks/campo-da-captacao.ts` | `MAX_CAMPOS_DO_FUNIL = CAMPOS_DO_CRM_MAX` |
| `lib/i18n/dicionario.ts` | bloco novo logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───` |
| `tests/invariants/rls-completude-varredura.test.ts` | 1 entrada |
| `supabase/baseline.sql` | o bloco 9006 |

Cada trecho leva `FORK ESCALE · Fase 1F-a`. **Com e sem a casca o comportamento é o mesmo**, porque a mudança é de dados: as duas cascas leem a mesma projeção. A diferença que aparece para quem usa a lateral: o dossiê, o calendário, a página do contato e as automações passam a oferecer os campos de todas as origens (Q1), e Configurações › Funis edita o campo para todas.

### Cercas que precisam ficar verdes

- `rbac-config-ia-canais` (test:db): toda policy ALL nova olha papel (`fn_role_at_least`).
- `rls-completude-varredura` (test:db): a tabela nova tem prova própria.
- `travas-de-suporte-cobrem-toda-tabela-na-instalacao` (test:db): a migration chama `fn_aplicar_travas_de_suporte()` no fim.
- `hardening-definer-varredura`, `definer-membership-varredura`, `definer-nova-nasce-exposta` (test:db): as três funções `security definer` novas têm `search_path` fixo e não são executáveis por `anon` nem por `authenticated`.
- Os gates do baseline (lista na Task 1, Step 6).
- `suporte-cobertura-de-efeitos` (unit): a server action já chama `supportWriteError`; nada muda.
- `i18n-espanhol-cobre-a-tela` (unit): os três textos novos de Configurações › Funis têm espanhol (Task 3).
- `evidencia-citada` (unit): este plano, copiado para o repositório, não cita imagem entre crases nem em link.

### Verificação (G1 — pendente de aprovação do usuário)

Se o usuário **não** aprovar a G1, vale a verificação da 1E (typecheck, eslint e os gates cheios em cada task). Se aprovar:

1. **Em cada task:** só os testes que a task cria ou altera, mais os guardas que leem os arquivos tocados, mais o typecheck e o eslint dos arquivos alterados. Os guardas que leem um arquivo saem deste comando (troque a lista pelos arquivos da task):
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit tests/invariants lib app components --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os que forem de `tests/unit` com `corepack pnpm vitest run <arquivos>`; os de `tests/invariants` só se a task mexe em banco.
2. **`test:db` só nas Tasks 1 e 2** (a tabela nova), e só com: o arquivo de prova da fase, `rls-completude-varredura`, `rbac-config-ia-canais`, `travas-de-suporte-cobrem-toda-tabela-na-instalacao` e, porque a migration cria funções `security definer`, as três varreduras de definer (são os guardas que leem essas funções).
3. **Revisor (subagente) só** na Task 1 (migration e RLS) e na Task 2 (prova). As Tasks 3 e 4 são pequenas: quem confere é o controlador, lendo o diff.
4. **Uma rodada cheia, só no fim** (Task 5), em segundo plano, enquanto o texto do PR é escrito. Sem worktree temporária da `main`: a não-regressão compara os arquivos que falharam com a lista guardada das falhas conhecidas do Windows (Task 5, Step 1).
5. Commits pequenos, um por task, como sempre.

### Textos, commits e i18n

- Todo texto de tela por `t()` com literal, com espanhol. O rótulo de campo é dado da organização e não passa por `t()`.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. O PR termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Falhas do Windows que já falham na `main` não são regressão (lista na Task 5).

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `supabase/migrations/20261021120000_9006_campos_do_crm.sql`, `supabase/baseline.sql` | novo / bloco | catálogo, RLS, projeção, adoção, junção |
| `tests/unit/escale-campos-do-crm-migration.test.ts` | novo | forma do SQL e lugar no baseline |
| `tests/invariants/escale-campos-do-crm.test.ts`, `tests/invariants/rls-completude-varredura.test.ts` | novo / 1 entrada | prova no Postgres |
| `lib/schemas/settings.ts`, `app/actions/settings/updatePipelineConfig.ts`, `app/app/settings/tenant/pipelines/_client.tsx`, `lib/webhooks/campo-da-captacao.ts`, `lib/i18n/dicionario.ts` | alterados (encaixes) | apagar no catálogo, teto, aviso |
| `tests/unit/escale-campos-do-crm-gravacao.test.ts`, `tests/unit/escale-campos-do-crm-tela-funis.test.tsx` | novos | a server action e a tela |
| `lib/escale/capa/tipos.ts`, `components/escale/capa/JanelaPersonalizarCards.tsx`, `app/api/v1/capas-do-card/campos/route.ts`, `hooks/escale/useCamposDasOrigens.ts`, `tests/unit/escale-capa-tipos.test.ts`, `tests/unit/escale-janela-personalizar-cards.test.tsx`, `tests/unit/escale-campos-do-crm-capa.test.ts` | alterados / novo | sai o "de outra origem" |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`, `C:\Documentos\projetos claude\Deskcom CRM\docs\roteiro.md` | alterados (fora do repositório) | a fase no PRD e a decisão no roteiro |

---

### Task 1: Medir, criar a branch e a migration 9006

**Files:**
- Create: `supabase/migrations/20261021120000_9006_campos_do_crm.sql`, `tests/unit/escale-campos-do-crm-migration.test.ts`
- Modify: `supabase/baseline.sql`
- Copy: este plano para `docs/superpowers/plans/` no repositório

**Interfaces:**
- Produces:
  - tabela `public.crm_campos_do_negocio (id, organization_id, chave, definicao jsonb, posicao integer, divergencias jsonb, created_at, updated_at)`, com os CHECKs `crm_campos_do_negocio_chave_formato`, `crm_campos_do_negocio_definicao_objeto`, `crm_campos_do_negocio_definicao_tamanho`, `crm_campos_do_negocio_divergencias_lista`, o índice único `uq_crm_campos_do_negocio_chave (organization_id, chave)` e as policies `crm_campos_do_negocio_select` e `crm_campos_do_negocio_admin_write`;
  - `fn_escale_campo_valido(jsonb) → boolean` e `fn_escale_campos_projetados(uuid, jsonb) → jsonb` (internas, sem `security definer`);
  - `fn_escale_juntar_campos_do_crm() → integer` (definer; a junção, chamada uma vez pela migration);
  - gatilhos `trg_escale_pipeline_campos_do_crm` (BEFORE INSERT OR UPDATE OF settings em `crm_pipelines`) e `trg_escale_campos_do_negocio_reprojeta` (AFTER INSERT OR UPDATE OR DELETE no catálogo), com as funções definer `fn_escale_pipeline_campos_do_crm()` e `fn_escale_campos_do_negocio_reprojeta()`;
  - as configurações de sessão `escale.campos_do_crm` (`'projetando'` enquanto o catálogo reprojeta) e `escale.campos_do_crm_origem` (a origem que está sendo gravada, para o catálogo não regravar a mesma linha).

- [ ] **Step 1: Medir os dados de hoje (só leitura)**

Rode no banco de produção **só leitura** (MCP `supabase-crm`, projeto `jsrzgxyioczdgwiklkrc`; ver a memória `deskcomm-crm-acesso-banco`). Se o MCP de leitura não estiver disponível, peça ao usuário para rodar e colar o resultado. **Nunca** use o MCP de escrita.

```sql
with f as (
  select p.organization_id, p.id as pipeline_id, p.name, e->>'key' as chave, e->>'type' as tipo, e->>'label' as rotulo,
         (e ? 'obrigatorio_em') as tem_regra
    from public.crm_pipelines p,
         jsonb_array_elements(case when jsonb_typeof(p.settings->'fields') = 'array' then p.settings->'fields' else '[]'::jsonb end) e
)
select
  (select count(distinct organization_id) from public.crm_pipelines) as organizacoes,
  (select count(*) from public.crm_pipelines) as origens,
  (select count(*) from f) as itens,
  (select count(distinct (organization_id, chave)) from f) as campos_depois_de_juntar,
  (select max(n) from (select organization_id, count(distinct chave) n from f group by 1) x) as maior_catalogo,
  (select count(*) from (select organization_id, chave from f group by 1, 2 having count(distinct tipo) > 1) x) as conflitos_de_tipo,
  (select count(*) from (select organization_id, chave from f group by 1, 2 having count(distinct rotulo) > 1) x) as conflitos_de_rotulo,
  (select count(*) from f where tem_regra) as itens_com_obrigatorio_em,
  (select count(*) from f where chave is null or chave !~* '^[a-z][a-z0-9_]*$') as itens_invalidos;
```

E a lista dos conflitos (vai no texto do PR):

```sql
select p.organization_id, e->>'key' as chave,
       jsonb_agg(jsonb_build_object('origem', p.name, 'tipo', e->>'type', 'rotulo', e->>'label') order by p.is_archived, p.position) as definicoes
  from public.crm_pipelines p,
       jsonb_array_elements(case when jsonb_typeof(p.settings->'fields') = 'array' then p.settings->'fields' else '[]'::jsonb end) e
 group by 1, 2
having count(distinct e->>'type') > 1 or count(distinct e->>'label') > 1;
```

Guarde as duas saídas em `.superpowers/sdd/1f-a-medicao.md` (pasta fora do git). **Se `maior_catalogo` passar de 200, PARE e pergunte** (Q3).

- [ ] **Step 2: Conferir a base, criar a branch e copiar o plano**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:supabase/migrations/20261020120000_9005_capas_do_card.sql && echo "1E ok"
git cat-file -e escale-crm/main:app/api/v1/capas-do-card/campos/route.ts && echo "fix ok"
git ls-tree --name-only escale-crm/main supabase/migrations/ | sort | tail -3
```
Expected: `1E ok` e `fix ok`; a última migration é a `20261020120000_9005_capas_do_card.sql`. Sem `fix ok`, PARE e pergunte.

```bash
git switch -c feat/fase-1f-a-campos-do-crm escale-crm/main
cp "../docs/superpowers/plans/2026-10-16-fase-1f-a-campos-do-crm.md" docs/superpowers/plans/
```

- [ ] **Step 3: O teste estático (vai falhar)**

Create `tests/unit/escale-campos-do-crm-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { customFieldSchema } from "@/lib/schemas/settings";

/**
 * CAMPOS DO CRM (fork Escale, migration 9006): os campos personalizados do
 * negócio são da organização, como na Clint. `settings.fields` de cada origem
 * vira a projeção do catálogo. A migration e o bloco do baseline são o MESMO SQL,
 * no ponto fixo do fork (depois do 9005, antes da 0323).
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261021120000_9006_campos_do_crm.sql";
const MIGRATION_9005 = "supabase/migrations/20261020120000_9005_capas_do_card.sql";
const CABECALHO = "-- ---- FORK ESCALE · campos do CRM (migration 9006) ----";
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");
const compacto = (s: string) => s.replace(/\s+/g, " ");
const FUNCOES = [
  "public.fn_escale_campo_valido(jsonb)",
  "public.fn_escale_campos_projetados(uuid, jsonb)",
  "public.fn_escale_juntar_campos_do_crm()",
  "public.fn_escale_pipeline_campos_do_crm()",
  "public.fn_escale_campos_do_negocio_reprojeta()",
];

describe("campos do CRM: migration 9006 e bloco do baseline", () => {
  it("a migration existe, se descreve na primeira linha e aparece igual no baseline, no ponto fixo", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    const sql = ler(MIGRATION);
    expect(sql.startsWith("-- manifest: ")).toBe(true);
    expect(sql.split("\n")[1]).toBe("-- 9006: campos do CRM (fork Escale).");
    const baseline = ler("supabase/baseline.sql");
    const de9005 = baseline.indexOf(ler(MIGRATION_9005));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(sql);
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9005).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9005);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("um campo por chave em cada organização; a definição não guarda chave nem regra", () => {
    const sql = compacto(ler(MIGRATION));
    expect(sql).toContain(
      "create unique index if not exists uq_crm_campos_do_negocio_chave on public.crm_campos_do_negocio (organization_id, chave);",
    );
    expect(sql).toContain("not (definicao ?| array['key', 'obrigatorio_em'])");
    expect(sql).toContain("organization_id uuid not null references public.organizations(id) on delete cascade");
  });

  it("RLS: todo membro lê; escrever exige administrador (cerca de RBAC da 0150)", () => {
    const sql = compacto(ler(MIGRATION));
    expect(sql).toContain("alter table public.crm_campos_do_negocio enable row level security;");
    const escrita = sql.slice(
      sql.indexOf("create policy crm_campos_do_negocio_admin_write"),
      sql.indexOf("revoke all on public.crm_campos_do_negocio from anon;"),
    );
    const [using = "", check = ""] = escrita.split("with check (");
    for (const parte of [using, check]) {
      expect(parte).toContain("public.fn_role_at_least(organization_id, 'admin')");
      expect(parte).toContain("public.fn_is_platform_admin_full()");
    }
    expect(sql).toContain("do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;");
  });

  it("o tipo aceito pelo banco é o mesmo do customFieldSchema", () => {
    const sql = ler(MIGRATION);
    const lista = /\(p->>'type'\) in \(([^)]*)\)/.exec(sql)?.[1] ?? "";
    const tipos = lista.split(",").map((t) => t.trim().replace(/'/g, ""));
    expect([...tipos].sort()).toEqual([...customFieldSchema.shape.type.options].sort());
  });

  it("as funções não são executáveis pela sessão, e as definer fixam o search_path", () => {
    const sql = compacto(ler(MIGRATION));
    for (const f of FUNCOES) {
      expect(sql).toContain(`revoke all on function ${f} from public;`);
      expect(sql).toContain(`revoke execute on function ${f} from anon;`);
      expect(sql).toContain(`revoke execute on function ${f} from authenticated;`);
    }
    expect(sql.match(/security definer set search_path = public, pg_temp/g)?.length).toBe(3);
  });

  it("a junção roda antes dos gatilhos; a primeira projeção avisa que está projetando", () => {
    const sql = ler(MIGRATION);
    const juntar = sql.indexOf("select public.fn_escale_juntar_campos_do_crm();");
    // O mesmo par aparece dentro de `fn_escale_campos_do_negocio_reprojeta`: o que conta é o bloco `do`.
    const projetar = sql.indexOf("do $f$\nbegin\n  perform set_config('escale.campos_do_crm', 'projetando', true);");
    const gatilho = sql.indexOf("create trigger trg_escale_pipeline_campos_do_crm");
    expect(juntar).toBeGreaterThan(-1);
    expect(projetar).toBeGreaterThan(juntar);
    expect(gatilho).toBeGreaterThan(projetar);
    expect(sql).toContain("before insert or update of settings on public.crm_pipelines");
    expect(sql).toContain("after insert or update or delete on public.crm_campos_do_negocio");
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

```bash
corepack pnpm vitest run tests/unit/escale-campos-do-crm-migration.test.ts
```
Expected: FAIL em "a migration existe".

- [ ] **Step 5: A migration**

Create `supabase/migrations/20261021120000_9006_campos_do_crm.sql`. A primeira linha é UMA linha só:

```sql
-- manifest: **Campos do CRM (fork Escale, Fase 1F-a).** Tabela nova `crm_campos_do_negocio`: o catálogo dos campos personalizados do NEGÓCIO da organização, como na Clint (campos da conta, não da origem). `crm_pipelines.settings.fields` passa a ser a PROJEÇÃO do catálogo em cada origem (as definições do catálogo + o `obrigatorio_em` da própria origem), mantida por dois gatilhos: quem lê `settings.fields` não muda. Gravar `settings.fields` com chave nova ou definição mudada adota no catálogo (administrador, suporte com escrita ou serviço); gravar sem uma chave não apaga, apagar é só no catálogo. A migration junta os `settings.fields` de hoje por chave (vence a origem que vem primeiro no painel; as outras definições ficam em `divergencias`), é idempotente e não mexe em valores de negócio. RLS: todo membro lê; só administrador escreve (`fn_role_at_least`, cerca de RBAC da 0150).
-- 9006: campos do CRM (fork Escale).

create table if not exists public.crm_campos_do_negocio (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  chave text not null,
  definicao jsonb not null,
  posicao integer not null default 0,
  divergencias jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_campos_do_negocio_chave_formato
    check (chave ~* '^[a-z][a-z0-9_]*$' and char_length(chave) <= 40),
  constraint crm_campos_do_negocio_definicao_objeto
    check (jsonb_typeof(definicao) = 'object' and not (definicao ?| array['key', 'obrigatorio_em'])),
  constraint crm_campos_do_negocio_definicao_tamanho
    check (octet_length(definicao::text) <= 16384),
  constraint crm_campos_do_negocio_divergencias_lista
    check (jsonb_typeof(divergencias) = 'array' and octet_length(divergencias::text) <= 32768)
);

-- Um campo por chave em cada organização: é a chave que os negócios usam em
-- `custom_fields`, e o que a junção e a adoção casam.
create unique index if not exists uq_crm_campos_do_negocio_chave
  on public.crm_campos_do_negocio (organization_id, chave);

alter table public.crm_campos_do_negocio enable row level security;

drop policy if exists crm_campos_do_negocio_select on public.crm_campos_do_negocio;
drop policy if exists crm_campos_do_negocio_admin_write on public.crm_campos_do_negocio;

-- Quem vê: todo membro (o quadro, o dossiê e as automações de todo papel leem
-- os campos) e o suporte da plataforma.
create policy crm_campos_do_negocio_select on public.crm_campos_do_negocio
  for select using (
    public.fn_is_platform_admin()
    or (organization_id in (select public.fn_user_org_ids()))
  );

-- Quem escreve: administrador, como Configurações › Funis hoje
-- (`updatePipelineConfig` exige `podeAdministrarEmpresa`). O papel vem explícito
-- por causa da cerca de RBAC da 0150.
create policy crm_campos_do_negocio_admin_write on public.crm_campos_do_negocio
  using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'admin'))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'admin'))
  );

revoke all on public.crm_campos_do_negocio from anon;
grant select, insert, update, delete on public.crm_campos_do_negocio to authenticated;
grant all on public.crm_campos_do_negocio to service_role;

drop trigger if exists trg_crm_campos_do_negocio_updated_at on public.crm_campos_do_negocio;
create trigger trg_crm_campos_do_negocio_updated_at
  before update on public.crm_campos_do_negocio
  for each row execute function public.fn_set_updated_at();

-- ── O item que vale como campo: a mesma régua do customFieldSchema ──────────
create or replace function public.fn_escale_campo_valido(p jsonb)
  returns boolean
  language sql
  immutable
  set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_typeof(p) = 'object'
    and jsonb_typeof(p->'key') = 'string'
    and (p->>'key') ~* '^[a-z][a-z0-9_]*$'
    and char_length(p->>'key') <= 40
    and jsonb_typeof(p->'label') = 'string'
    and char_length(btrim(p->>'label')) between 1 and 80
    and (p->>'type') in ('text', 'textarea', 'number', 'currency', 'date', 'select', 'multiselect', 'boolean', 'email', 'phone', 'url'),
    false)
$$;

-- ── A projeção: o catálogo, na ordem dele, com o `obrigatorio_em` da origem ──
-- `p_pedidos` é o `settings.fields` que a origem tem (ou que está gravando): dele
-- só sai a regra de cada chave. Volátil de propósito: dentro do gatilho ela tem
-- de enxergar o campo que acabou de ser adotado.
create or replace function public.fn_escale_campos_projetados(p_org uuid, p_pedidos jsonb)
  returns jsonb
  language sql
  volatile
  set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      c.definicao
      || jsonb_build_object('key', c.chave)
      || coalesce((
           select jsonb_build_object('obrigatorio_em', e->'obrigatorio_em')
             from jsonb_array_elements(case when jsonb_typeof(p_pedidos) = 'array' then p_pedidos else '[]'::jsonb end) e
            where jsonb_typeof(e) = 'object'
              and e->>'key' = c.chave
              and jsonb_typeof(e->'obrigatorio_em') = 'object'
            limit 1), '{}'::jsonb)
      order by c.posicao, c.chave),
    '[]'::jsonb)
    from public.crm_campos_do_negocio c
   where c.organization_id = p_org
$$;

-- ── A junção dos `settings.fields` de hoje (uma vez, e de novo sem efeito) ──
-- Por chave exata. Vence a definição da origem que vem primeiro no painel
-- (ativas antes das arquivadas, posição, criação, id); a posição do campo segue
-- essa ordem. As outras definições com tipo ou rótulo diferente vão para
-- `divergencias` (até 20). Item inválido não entra. Devolve quantos entraram.
create or replace function public.fn_escale_juntar_campos_do_crm()
  returns integer
  language plpgsql
  security definer set search_path = public, pg_temp
as $$
declare
  v_inseridos integer;
begin
  with ordem as (
    select p.id as pipeline_id, p.organization_id, p.name,
           row_number() over (partition by p.organization_id
                              order by p.is_archived, p.position, p.created_at, p.id) as n
      from public.crm_pipelines p
     where jsonb_typeof(p.settings->'fields') = 'array'
  ), itens as (
    select o.organization_id, o.pipeline_id, o.name, o.n, x.i, x.e
      from ordem o
      join public.crm_pipelines p on p.id = o.pipeline_id
      cross join lateral jsonb_array_elements(p.settings->'fields') with ordinality as x(e, i)
     where public.fn_escale_campo_valido(x.e)
  ), vencedores as (
    select distinct on (organization_id, e->>'key')
           organization_id, e->>'key' as chave, (e - 'key' - 'obrigatorio_em') as definicao,
           (n * 1000 + i)::integer as posicao
      from itens
     order by organization_id, e->>'key', n, i
  ), divergentes as (
    select v.organization_id, v.chave,
           jsonb_path_query_array(
             coalesce(jsonb_agg(distinct jsonb_build_object(
                        'origem_id', it.pipeline_id, 'origem', it.name,
                        'label', it.e->>'label', 'type', it.e->>'type'))
                      filter (where it.pipeline_id is not null), '[]'::jsonb),
             '$[0 to 19]') as lista
      from vencedores v
      left join itens it
        on it.organization_id = v.organization_id
       and it.e->>'key' = v.chave
       and ((it.e->>'type') is distinct from (v.definicao->>'type')
            or (it.e->>'label') is distinct from (v.definicao->>'label'))
     group by v.organization_id, v.chave
  )
  insert into public.crm_campos_do_negocio (organization_id, chave, definicao, posicao, divergencias)
  select v.organization_id, v.chave, v.definicao, v.posicao, d.lista
    from vencedores v
    join divergentes d using (organization_id, chave)
  on conflict (organization_id, chave) do nothing;
  get diagnostics v_inseridos = row_count;
  return v_inseridos;
end$$;

-- ── Gatilho da origem: adota no catálogo e grava a projeção ─────────────────
create or replace function public.fn_escale_pipeline_campos_do_crm()
  returns trigger
  language plpgsql
  security definer set search_path = public, pg_temp
as $$
declare
  v_pedidos jsonb;
  v_antigos jsonb;
  v_item jsonb;
  v_antigo jsonb;
  v_def jsonb;
  v_proxima integer;
  v_projecao jsonb;
begin
  -- O catálogo está reprojetando as origens: a linha já chega projetada.
  if coalesce(current_setting('escale.campos_do_crm', true), '') = 'projetando' then
    return new;
  end if;
  if jsonb_typeof(new.settings) is distinct from 'object' then
    return new;
  end if;

  v_pedidos := case when jsonb_typeof(new.settings->'fields') = 'array' then new.settings->'fields' else '[]'::jsonb end;
  v_antigos := case when tg_op = 'UPDATE' and jsonb_typeof(old.settings->'fields') = 'array'
                    then old.settings->'fields' else '[]'::jsonb end;

  -- Adoção: só administrador, suporte com escrita ou serviço (sem sessão).
  if auth.uid() is null
     or public.fn_is_platform_admin_full()
     or public.fn_role_at_least(new.organization_id, 'admin') then
    perform set_config('escale.campos_do_crm_origem', new.id::text, true);
    select coalesce(max(posicao), 0) into v_proxima
      from public.crm_campos_do_negocio where organization_id = new.organization_id;
    for v_item in select e from jsonb_array_elements(v_pedidos) e loop
      continue when not public.fn_escale_campo_valido(v_item);
      v_def := v_item - 'key' - 'obrigatorio_em';
      select e into v_antigo
        from jsonb_array_elements(v_antigos) e
       where jsonb_typeof(e) = 'object' and e->>'key' = v_item->>'key'
       limit 1;
      if v_antigo is null then
        -- Chave que a origem não tinha: cria. Se o catálogo já a tem, o catálogo vence.
        v_proxima := v_proxima + 1;
        insert into public.crm_campos_do_negocio (organization_id, chave, definicao, posicao)
        values (new.organization_id, v_item->>'key', v_def, v_proxima)
        on conflict (organization_id, chave) do nothing;
      elsif (v_antigo - 'key' - 'obrigatorio_em') is distinct from v_def then
        -- Definição mudada nesta gravação: muda em todas as origens.
        update public.crm_campos_do_negocio
           set definicao = v_def
         where organization_id = new.organization_id
           and chave = v_item->>'key'
           and definicao is distinct from v_def;
      end if;
    end loop;
    perform set_config('escale.campos_do_crm_origem', '', true);
  end if;

  v_projecao := public.fn_escale_campos_projetados(new.organization_id, v_pedidos);
  -- Origem sem `fields` numa organização sem campos: não acrescenta a chave.
  if not (new.settings ? 'fields') and v_projecao = '[]'::jsonb then
    return new;
  end if;
  new.settings := jsonb_set(new.settings, '{fields}', v_projecao);
  return new;
end$$;

-- ── Gatilho do catálogo: reprojeta as origens da organização ────────────────
create or replace function public.fn_escale_campos_do_negocio_reprojeta()
  returns trigger
  language plpgsql
  security definer set search_path = public, pg_temp
as $$
declare
  v_org uuid := coalesce(new.organization_id, old.organization_id);
  v_origem text := coalesce(current_setting('escale.campos_do_crm_origem', true), '');
  v_anterior text := coalesce(current_setting('escale.campos_do_crm', true), '');
begin
  if tg_op = 'UPDATE' and new.chave is distinct from old.chave then
    raise exception 'a chave de um campo do CRM não muda (%)', old.chave using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'um campo do CRM não muda de organização' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' and new.definicao = old.definicao and new.posicao = old.posicao then
    return null;
  end if;
  perform set_config('escale.campos_do_crm', 'projetando', true);
  update public.crm_pipelines p
     set settings = jsonb_set(p.settings, '{fields}',
                              public.fn_escale_campos_projetados(p.organization_id, p.settings->'fields'))
   where p.organization_id = v_org
     and jsonb_typeof(p.settings) = 'object'
     -- A origem que está sendo gravada recebe a projeção no próprio gatilho.
     and (v_origem = '' or p.id::text <> v_origem);
  perform set_config('escale.campos_do_crm', v_anterior, true);
  return null;
end$$;

-- As DUAS origens de EXECUTE (item 9 do CLAUDE.md), para as cinco funções.
revoke all on function public.fn_escale_campo_valido(jsonb) from public;
revoke execute on function public.fn_escale_campo_valido(jsonb) from anon;
revoke execute on function public.fn_escale_campo_valido(jsonb) from authenticated;
revoke all on function public.fn_escale_campos_projetados(uuid, jsonb) from public;
revoke execute on function public.fn_escale_campos_projetados(uuid, jsonb) from anon;
revoke execute on function public.fn_escale_campos_projetados(uuid, jsonb) from authenticated;
revoke all on function public.fn_escale_juntar_campos_do_crm() from public;
revoke execute on function public.fn_escale_juntar_campos_do_crm() from anon;
revoke execute on function public.fn_escale_juntar_campos_do_crm() from authenticated;
revoke all on function public.fn_escale_pipeline_campos_do_crm() from public;
revoke execute on function public.fn_escale_pipeline_campos_do_crm() from anon;
revoke execute on function public.fn_escale_pipeline_campos_do_crm() from authenticated;
revoke all on function public.fn_escale_campos_do_negocio_reprojeta() from public;
revoke execute on function public.fn_escale_campos_do_negocio_reprojeta() from anon;
revoke execute on function public.fn_escale_campos_do_negocio_reprojeta() from authenticated;

-- ── A junção e a primeira projeção, ANTES dos gatilhos ──────────────────────
-- Rodar de novo (baseline reaplicado, update.sh) não muda nada: a junção pula
-- chave que já existe e a projeção é a mesma; com os gatilhos já criados, o
-- 'projetando' faz o da origem deixar a linha como veio.
select public.fn_escale_juntar_campos_do_crm();

do $f$
begin
  perform set_config('escale.campos_do_crm', 'projetando', true);
  update public.crm_pipelines p
     set settings = jsonb_set(p.settings, '{fields}',
                              public.fn_escale_campos_projetados(p.organization_id, p.settings->'fields'))
   where jsonb_typeof(p.settings) = 'object'
     and (p.settings ? 'fields'
          or exists (select 1 from public.crm_campos_do_negocio c where c.organization_id = p.organization_id));
  perform set_config('escale.campos_do_crm', '', true);
end $f$;

drop trigger if exists trg_escale_pipeline_campos_do_crm on public.crm_pipelines;
create trigger trg_escale_pipeline_campos_do_crm
  before insert or update of settings on public.crm_pipelines
  for each row execute function public.fn_escale_pipeline_campos_do_crm();

drop trigger if exists trg_escale_campos_do_negocio_reprojeta on public.crm_campos_do_negocio;
create trigger trg_escale_campos_do_negocio_reprojeta
  after insert or update or delete on public.crm_campos_do_negocio
  for each row execute function public.fn_escale_campos_do_negocio_reprojeta();

comment on table public.crm_campos_do_negocio is
  'Campos personalizados do negócio da organização (fork Escale, migration 9006), como os campos da conta da Clint. crm_pipelines.settings.fields de cada origem é a projeção deste catálogo mais o obrigatorio_em da origem (gatilhos trg_escale_pipeline_campos_do_crm e trg_escale_campos_do_negocio_reprojeta). Todo membro lê; só administrador escreve.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

- [ ] **Step 6: O mesmo SQL no baseline, no ponto fixo, e os gates do baseline**

```bash
node -e '
const fs = require("fs");
const MIG = "supabase/migrations/20261021120000_9006_campos_do_crm.sql";
const BASE = "supabase/baseline.sql";
const ANCORA = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const CAB = "-- ---- FORK ESCALE · campos do CRM (migration 9006) ----";
const base = fs.readFileSync(BASE, "utf8");
if (base.includes(CAB)) throw new Error("o bloco 9006 já está no baseline");
if (!base.includes("-- ---- FORK ESCALE · capa do card do quadro (migration 9005) ----")) throw new Error("bloco 9005 ausente");
const i = base.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 0323 não encontrada");
const eol = base.includes("\r\n") ? "\r\n" : "\n";
let mig = fs.readFileSync(MIG, "utf8").replace(/\r\n/g, "\n");
if (!mig.endsWith("\n")) mig += "\n";
fs.writeFileSync(BASE, base.slice(0, i) + (CAB + "\n" + mig + "\n").replace(/\n/g, eol) + base.slice(i));
console.log("bloco 9006 inserido");
'
corepack pnpm vitest run tests/unit/escale-campos-do-crm-migration.test.ts tests/unit/escale-capas-do-card-migration.test.ts tests/unit/escale-filtros-salvos-migration.test.ts tests/unit/baseline-reaplicavel.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/check-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/apendice-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/sonda-do-baseline-ancora-na-ultima-definicao.test.ts tests/unit/baseline-no-piso-do-postgres.test.ts tests/unit/varredura-anon-e-o-ultimo-bloco.test.ts tests/unit/baseline-nao-constroi-o-que-derruba.test.ts tests/unit/baseline-nao-reconcede-o-que-revoga.test.ts tests/unit/baseline-constraint-reconstruida.test.ts
bash scripts/checar-colisao-de-migration.sh escale-crm/main
```
Expected: `bloco 9006 inserido`; os 13 arquivos PASS (confira que os 13 aparecem na saída: com vários caminhos, um nome que não casa é pulado sem aviso); a colisão diz "OK, 1 migration nova". Se um gate reclamar, corrija a MIGRATION, refaça o bloco (`git checkout -- supabase/baseline.sql` e este Step) e rode de novo.

- [ ] **Step 7: Revisão e commit**

Revisor (subagente, G1): a migration e as policies. Peça atenção a: recursão entre os dois gatilhos, a configuração `escale.campos_do_crm_origem`, a adoção só para administrador, idempotência ao reaplicar o baseline.

```bash
git add supabase/migrations/20261021120000_9006_campos_do_crm.sql supabase/baseline.sql tests/unit/escale-campos-do-crm-migration.test.ts docs/superpowers/plans/2026-10-16-fase-1f-a-campos-do-crm.md
git commit -m "feat(escale): campos do CRM — catálogo da organização e projeção em cada origem (migration 9006)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Prova no Postgres

**Files:**
- Create: `tests/invariants/escale-campos-do-crm.test.ts`
- Modify: `tests/invariants/rls-completude-varredura.test.ts` (1 entrada logo depois da de `crm_capas_do_card`)

- [ ] **Step 1: A prova**

Create `tests/invariants/escale-campos-do-crm.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_MANAGER, GOV_ORG, GOV_VIEWER, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * CAMPOS DO CRM (fork Escale, migration 9006) — prova contra Postgres real:
 * todo membro lê o catálogo, só administrador escreve; o catálogo aparece em
 * todas as origens com a regra de cada uma; gravar `settings.fields` adota (só
 * administrador); apagar tira de todas; a junção é por chave, a mais antiga
 * vence, as divergências ficam registradas e rodar de novo não muda nada.
 * Roda via `pnpm test:db`.
 */
const ORG_B = "e5ca1e00-9006-4000-8000-000000000001";
const USER_B = "e5ca1e00-9006-4000-8000-000000000002";
const ORG_C = "e5ca1e00-9006-4000-8000-000000000003";
const P1 = "e5ca1e00-9006-4000-8000-000000000011";
const P2 = "e5ca1e00-9006-4000-8000-000000000012";
const C1 = "e5ca1e00-9006-4000-8000-000000000031";
const C2 = "e5ca1e00-9006-4000-8000-000000000032";
const DEF = (label: string, type = "text") => `'{"label":"${label}","type":"${type}"}'::jsonb`;

/** As chaves de `settings.fields` de uma origem, em ordem alfabética. */
const chaves = (pipeline: string) =>
  sql(
    `select coalesce(string_agg(e->>'key', ',' order by e->>'key'), '') from public.crm_pipelines p, jsonb_array_elements(p.settings->'fields') e where p.id = '${pipeline}';`,
  );
const item = (pipeline: string, chave: string, campo: string) =>
  sql(
    `select coalesce((select e->>'${campo}' from public.crm_pipelines p, jsonb_array_elements(p.settings->'fields') e where p.id = '${pipeline}' and e->>'key' = '${chave}'), '-');`,
  );
const temRegra = (pipeline: string, chave: string) =>
  sql(
    `select count(*) from public.crm_pipelines p, jsonb_array_elements(p.settings->'fields') e where p.id = '${pipeline}' and e->>'key' = '${chave}' and e ? 'obrigatorio_em';`,
  );
const noCatalogo = (org: string, chave: string) =>
  sql(`select count(*) from public.crm_campos_do_negocio where organization_id = '${org}' and chave = '${chave}';`);

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email) values ('${USER_B}', 'escale-campos-b@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name) values
      ('${ORG_B}', 'escale-campos-b', 'Escale Campos Org B', 'Escale CPB'),
      ('${ORG_C}', 'escale-campos-c', 'Escale Campos Org C', 'Escale CPC')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now()) on conflict do nothing;
    delete from public.crm_campos_do_negocio where organization_id in ('${GOV_ORG}', '${ORG_B}', '${ORG_C}');
    delete from public.crm_pipelines where id in ('${P1}', '${P2}', '${C1}', '${C2}');
    insert into public.crm_pipelines (id, organization_id, name, slug) values
      ('${P1}', '${GOV_ORG}', 'Escale 9006 A', 'escale-9006-a'),
      ('${P2}', '${GOV_ORG}', 'Escale 9006 B', 'escale-9006-b');
    insert into public.crm_campos_do_negocio (organization_id, chave, definicao, posicao)
      values ('${GOV_ORG}', 'escale_cpf', ${DEF("CPF")}, 1);
  `);
});

afterAll(() => {
  sql(`delete from public.crm_campos_do_negocio where organization_id in ('${GOV_ORG}', '${ORG_C}');`);
});

describe("crm_campos_do_negocio: RLS", () => {
  it("todo membro lê (viewer, controle positivo); a outra organização não", () => {
    const q = `select count(*) from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_cpf';`;
    expect(countAs(GOV_VIEWER, q)).toBe(1);
    expect(countAs(USER_B, q)).toBe(0);
  });

  it("só administrador escreve: o administrador cria (controle positivo); gerente, viewer e vizinho não", () => {
    expect(
      writeCountAs(GOV_ADMIN, `insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${GOV_ORG}', 'escale_do_admin', ${DEF("Do admin")})`),
    ).toBe(1);
    expect(
      writeCountAs(GOV_MANAGER, `insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${GOV_ORG}', 'escale_do_gerente', ${DEF("Do gerente")})`),
    ).toBe(0);
    expect(writeCountAs(GOV_MANAGER, `update public.crm_campos_do_negocio set definicao = ${DEF("X")} where organization_id = '${GOV_ORG}' and chave = 'escale_cpf'`)).toBe(0);
    expect(writeCountAs(GOV_VIEWER, `delete from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_cpf'`)).toBe(0);
    expect(
      writeCountAs(USER_B, `insert into public.crm_campos_do_negocio (organization_id, chave, definicao) values ('${GOV_ORG}', 'escale_vizinho', ${DEF("Vizinho")})`),
    ).toBe(0);
    expect(noCatalogo(GOV_ORG, "escale_do_gerente")).toBe("0");
    expect(noCatalogo(GOV_ORG, "escale_vizinho")).toBe("0");
  });
});

describe("a projeção em cada origem", () => {
  it("o catálogo aparece em todas as origens da organização, e só nelas", () => {
    expect(chaves(P1)).toContain("escale_cpf");
    expect(chaves(P2)).toContain("escale_do_admin");
    expect(sql(`select count(*) from public.crm_pipelines p, jsonb_array_elements(p.settings->'fields') e where p.organization_id <> '${GOV_ORG}' and e->>'key' = 'escale_cpf';`)).toBe("0");
  });

  it("a regra é da origem: mudar o rótulo no catálogo mantém o obrigatorio_em de A e não o leva para B", () => {
    sql(`
      update public.crm_pipelines
         set settings = jsonb_set(settings, '{fields}', (
           select jsonb_agg(case when e->>'key' = 'escale_cpf' then e || '{"obrigatorio_em":{"ao_ganhar":true}}'::jsonb else e end)
             from jsonb_array_elements(settings->'fields') e))
       where id = '${P1}';
    `);
    expect(temRegra(P1, "escale_cpf")).toBe("1");
    expect(temRegra(P2, "escale_cpf")).toBe("0");
    expect(writeCountAs(GOV_ADMIN, `update public.crm_campos_do_negocio set definicao = ${DEF("Documento")} where organization_id = '${GOV_ORG}' and chave = 'escale_cpf'`)).toBe(1);
    expect(item(P1, "escale_cpf", "label")).toBe("Documento");
    expect(item(P2, "escale_cpf", "label")).toBe("Documento");
    expect(temRegra(P1, "escale_cpf")).toBe("1");
    expect(temRegra(P2, "escale_cpf")).toBe("0");
  });

  it("apagar no catálogo tira o campo e a regra de todas as origens", () => {
    expect(writeCountAs(GOV_ADMIN, `delete from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_cpf'`)).toBe(1);
    expect(chaves(P1)).not.toContain("escale_cpf");
    expect(chaves(P2)).not.toContain("escale_cpf");
  });

  it("a chave de um campo não muda", () => {
    expect(() =>
      sql(`update public.crm_campos_do_negocio set chave = 'outra' where organization_id = '${GOV_ORG}' and chave = 'escale_do_admin';`),
    ).toThrow(/a chave de um campo do CRM não muda/);
  });
});

describe("gravar settings.fields adota no catálogo (só administrador)", () => {
  const acrescentar = (pipeline: string, chave: string, label: string) =>
    `update public.crm_pipelines set settings = jsonb_set(settings, '{fields}', coalesce(settings->'fields', '[]'::jsonb) || '[{"key":"${chave}","label":"${label}","type":"number"}]'::jsonb) where id = '${pipeline}'`;

  it("administrador: a chave nova vira campo do CRM e aparece na outra origem (controle positivo)", () => {
    expect(writeCountAs(GOV_ADMIN, acrescentar(P1, "escale_novo", "Novo"))).toBe(1);
    expect(noCatalogo(GOV_ORG, "escale_novo")).toBe("1");
    expect(chaves(P2)).toContain("escale_novo");
  });

  it("gerente: grava a origem, mas o campo novo não entra no catálogo nem fica na origem", () => {
    expect(writeCountAs(GOV_MANAGER, acrescentar(P1, "escale_gerente", "Gerente"))).toBe(1);
    expect(noCatalogo(GOV_ORG, "escale_gerente")).toBe("0");
    expect(chaves(P1)).not.toContain("escale_gerente");
  });

  it("administrador muda o rótulo numa origem: muda no catálogo e na outra", () => {
    expect(
      writeCountAs(
        GOV_ADMIN,
        `update public.crm_pipelines set settings = jsonb_set(settings, '{fields}', (select jsonb_agg(case when e->>'key' = 'escale_novo' then jsonb_set(e, '{label}', '"Novo 2"') else e end) from jsonb_array_elements(settings->'fields') e)) where id = '${P2}'`,
      ),
    ).toBe(1);
    expect(sql(`select definicao->>'label' from public.crm_campos_do_negocio where organization_id = '${GOV_ORG}' and chave = 'escale_novo';`)).toBe("Novo 2");
    expect(item(P1, "escale_novo", "label")).toBe("Novo 2");
  });

  it("gravar sem a chave não apaga: o campo volta pela projeção", () => {
    expect(
      writeCountAs(
        GOV_ADMIN,
        `update public.crm_pipelines set settings = jsonb_set(settings, '{fields}', (select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements(settings->'fields') e where e->>'key' <> 'escale_novo')) where id = '${P1}'`,
      ),
    ).toBe(1);
    expect(noCatalogo(GOV_ORG, "escale_novo")).toBe("1");
    expect(chaves(P1)).toContain("escale_novo");
  });
});

describe("a junção dos campos de hoje", () => {
  beforeAll(() => {
    // As origens nascem como eram antes da 9006: o gatilho fica desligado só
    // enquanto elas entram.
    sql(`
      alter table public.crm_pipelines disable trigger trg_escale_pipeline_campos_do_crm;
      insert into public.crm_pipelines (id, organization_id, name, slug, position, settings) values
        ('${C1}', '${ORG_C}', 'C1', 'escale-9006-c1', 1,
         '{"fields":[{"key":"cpf","label":"CPF","type":"text"},{"key":"renda","label":"Renda","type":"number","obrigatorio_em":{"ao_ganhar":true}},{"key":"1ruim","label":"x","type":"text"}]}'::jsonb),
        ('${C2}', '${ORG_C}', 'C2', 'escale-9006-c2', 2,
         '{"fields":[{"key":"cpf","label":"Documento","type":"number"},{"key":"bairro","label":"Bairro","type":"text"}]}'::jsonb);
      alter table public.crm_pipelines enable trigger trg_escale_pipeline_campos_do_crm;
    `);
  });

  const catalogoC = () =>
    sql(`select string_agg(chave || ':' || (definicao->>'type'), ',' order by posicao) from public.crm_campos_do_negocio where organization_id = '${ORG_C}';`);

  it("junta por chave: a origem que vem primeiro vence, na ordem dela; o inválido não entra", () => {
    sql(`select public.fn_escale_juntar_campos_do_crm();`);
    expect(catalogoC()).toBe("cpf:text,renda:number,bairro:text");
  });

  it("a definição perdedora fica em divergencias", () => {
    expect(sql(`select jsonb_array_length(divergencias) from public.crm_campos_do_negocio where organization_id = '${ORG_C}' and chave = 'cpf';`)).toBe("1");
    expect(sql(`select divergencias->0->>'type' || '|' || (divergencias->0->>'origem') from public.crm_campos_do_negocio where organization_id = '${ORG_C}' and chave = 'cpf';`)).toBe("number|C2");
    expect(sql(`select jsonb_array_length(divergencias) from public.crm_campos_do_negocio where organization_id = '${ORG_C}' and chave = 'renda';`)).toBe("0");
  });

  it("rodar de novo não muda nada", () => {
    sql(`select public.fn_escale_juntar_campos_do_crm();`);
    expect(catalogoC()).toBe("cpf:text,renda:number,bairro:text");
    expect(sql(`select count(*) from public.crm_campos_do_negocio where organization_id = '${ORG_C}';`)).toBe("3");
  });

  it("projetar: as duas origens ficam com o catálogo, a regra de C1 fica só em C1, o inválido some", () => {
    sql(`update public.crm_pipelines set settings = settings where organization_id = '${ORG_C}';`);
    expect(chaves(C1)).toBe("bairro,cpf,renda");
    expect(chaves(C2)).toBe("bairro,cpf,renda");
    expect(item(C2, "cpf", "type")).toBe("text");
    expect(temRegra(C1, "renda")).toBe("1");
    expect(temRegra(C2, "renda")).toBe("0");
  });
});

describe("as funções novas não são alcançáveis pela sessão", () => {
  it.each([
    "public.fn_escale_campo_valido(jsonb)",
    "public.fn_escale_campos_projetados(uuid, jsonb)",
    "public.fn_escale_juntar_campos_do_crm()",
    "public.fn_escale_pipeline_campos_do_crm()",
    "public.fn_escale_campos_do_negocio_reprojeta()",
  ])("%s", (funcao) => {
    expect(sql(`select has_function_privilege('authenticated', '${funcao}', 'execute');`)).toBe("f");
    expect(sql(`select has_function_privilege('anon', '${funcao}', 'execute');`)).toBe("f");
  });
});
```

- [ ] **Step 2: Registrar na varredura**

Em `tests/invariants/rls-completude-varredura.test.ts`, logo DEPOIS do `},` que fecha a entrada de `crm_capas_do_card` em `PROVA_PROPRIA`, acrescente:

```ts
  {
    tabela: "crm_campos_do_negocio",
    razao:
      "tests/invariants/escale-campos-do-crm.test.ts — fork Escale (migration 9006): todo membro lê, só administrador escreve " +
      "(zero para gerente, viewer e vizinho), a projeção em cada origem, a adoção só de administrador e a junção idempotente.",
  },
```

- [ ] **Step 3: Rodar a prova (Docker)**

```bash
docker info --format '{{.ServerVersion}}'
corepack pnpm test:db tests/invariants/escale-campos-do-crm.test.ts tests/invariants/rls-completude-varredura.test.ts tests/invariants/rbac-config-ia-canais.test.ts tests/invariants/travas-de-suporte-cobrem-toda-tabela-na-instalacao.test.ts tests/invariants/hardening-definer-varredura.test.ts tests/invariants/definer-membership-varredura.test.ts tests/invariants/definer-nova-nasce-exposta.test.ts 2>&1 | tail -30
```
Expected: os 7 PASS e `==> test:db verde`.
- Se `writeCountAs` com a RLS recusando lançar em vez de devolver 0, troque aquele `expect(...).toBe(0)` por `expect(() => writeCountAs(...)).toThrow(/row-level security/)`. Não afrouxe o que a linha prova.
- Se o `alter table … disable trigger` falhar por lock (outra prova rodando em paralelo), rode só este arquivo de novo. Se continuar, PARE e reporte.
- Se a contagem de `has_function_privilege` vier `t` para alguma função, a migration esqueceu o `revoke`: corrija a migration e o bloco do baseline (Task 1, Step 6).

- [ ] **Step 4: Revisão e commit**

Revisor (subagente, G1): a prova cobre o que a migration promete (controle positivo em cada recusa)?

```bash
git add tests/invariants/escale-campos-do-crm.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "test(escale): prova no Postgres dos campos do CRM (RLS, projeção, adoção e junção)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Configurações › Funis edita o catálogo

**Files:**
- Modify: `lib/schemas/settings.ts`, `app/actions/settings/updatePipelineConfig.ts`, `app/app/settings/tenant/pipelines/_client.tsx`, `lib/webhooks/campo-da-captacao.ts`, `lib/i18n/dicionario.ts`
- Create: `tests/unit/escale-campos-do-crm-gravacao.test.ts`, `tests/unit/escale-campos-do-crm-tela-funis.test.tsx`

**Interfaces:**
- Produces: `CAMPOS_DO_CRM_MAX` (`@/lib/schemas/settings`); `PipelineConfigPatch.campos_removidos?: string[]`; `updatePipelineConfig` apaga do catálogo as chaves de `campos_removidos` antes do `update`; a tela manda `campos_removidos` com as chaves que vieram do banco e não estão mais na lista salva.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-campos-do-crm-gravacao.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Map([["x-request-id", "req-1"]])) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/impersonate/support", () => ({ supportWriteError: vi.fn(() => null) }));
vi.mock("@/lib/auth/server", () => ({ loadAuthUser: vi.fn(), resolveActiveOrg: vi.fn() }));
vi.mock("@/lib/auth/pode-administrar-empresa", () => ({ podeAdministrarEmpresa: vi.fn(() => true) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { updatePipelineConfig } from "@/app/actions/settings/updatePipelineConfig";
import { audit } from "@/lib/audit";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { CAMPOS_DO_CRM_MAX, pipelineConfigPatchSchema } from "@/lib/schemas/settings";
import { createClient } from "@/lib/supabase/server";

/**
 * FORK ESCALE · Fase 1F-a: os campos são do CRM. Remover em Configurações ›
 * Funis apaga do catálogo (vale em toda origem); gravar sem a chave não apagaria.
 */
const ORG = "aaaaaaaa-0000-4000-8000-0000000000aa";
const FUNIL = "aaaaaaaa-0000-4000-8000-0000000000f1";
let passos: string[] = [];

function banco(erroAoApagar: string | null = null) {
  passos = [];
  const cliente = {
    from: vi.fn((tabela: string) => {
      if (tabela === "crm_campos_do_negocio") {
        return {
          delete: () => ({
            eq: (coluna: string, valor: string) => ({
              in: async (col: string, chaves: string[]) => {
                passos.push(`apagar ${coluna}=${valor} ${col}=${chaves.join(",")}`);
                return { error: erroAoApagar ? { message: erroAoApagar } : null };
              },
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { vocabulary: {}, settings: { fields: [] }, organization_id: ORG },
              error: null,
            }),
          }),
        }),
        update: () => ({
          eq: async () => {
            passos.push("gravar a origem");
            return { error: null };
          },
        }),
      };
    }),
  };
  vi.mocked(createClient).mockResolvedValue(cliente as never);
}

beforeEach(() => {
  vi.mocked(loadAuthUser).mockResolvedValue({ id: "u-1", support: null } as never);
  vi.mocked(resolveActiveOrg).mockResolvedValue({ orgId: ORG, role: "admin" } as never);
  vi.mocked(audit).mockClear();
});

describe("updatePipelineConfig e o catálogo do CRM", () => {
  it("sem campos_removidos não apaga nada", async () => {
    banco();
    expect(await updatePipelineConfig(FUNIL, { fields: [] })).toEqual({ ok: true });
    expect(passos).toEqual(["gravar a origem"]);
  });

  it("com campos_removidos apaga do catálogo da organização ANTES de gravar, e audita", async () => {
    banco();
    expect(await updatePipelineConfig(FUNIL, { fields: [], campos_removidos: ["cpf", "renda"] })).toEqual({ ok: true });
    expect(passos).toEqual([`apagar organization_id=${ORG} chave=cpf,renda`, "gravar a origem"]);
    expect(vi.mocked(audit).mock.calls[0]?.[0]).toMatchObject({ metadata: { campos_removidos: ["cpf", "renda"] } });
  });

  it("se apagar falha, não grava a origem e devolve o erro", async () => {
    banco("falhou");
    expect(await updatePipelineConfig(FUNIL, { fields: [], campos_removidos: ["cpf"] })).toEqual({ ok: false, error: "falhou" });
    expect(passos).toEqual([`apagar organization_id=${ORG} chave=cpf`]);
  });
});

describe("o patch aceita o catálogo inteiro", () => {
  const campo = (i: number) => ({ key: `c${i}`, label: `C${i}`, type: "text" as const });

  it("até CAMPOS_DO_CRM_MAX campos, e não mais", () => {
    expect(CAMPOS_DO_CRM_MAX).toBe(200);
    expect(pipelineConfigPatchSchema.safeParse({ fields: Array.from({ length: 200 }, (_, i) => campo(i)) }).success).toBe(true);
    expect(pipelineConfigPatchSchema.safeParse({ fields: Array.from({ length: 201 }, (_, i) => campo(i)) }).success).toBe(false);
  });

  it("campos_removidos só aceita chave válida", () => {
    expect(pipelineConfigPatchSchema.safeParse({ campos_removidos: ["cpf"] }).success).toBe(true);
    expect(pipelineConfigPatchSchema.safeParse({ campos_removidos: ["1x"] }).success).toBe(false);
  });
});
```

Create `tests/unit/escale-campos-do-crm-tela-funis.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock("@/app/actions/settings/updatePipelineConfig", () => ({
  updatePipelineConfig: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/app/app/settings/tenant/pipelines/_stages", () => ({
  StagesSection: () => null,
  ancoraDasEtapas: () => "etapas",
}));
vi.mock("@/app/app/settings/tenant/pipelines/_mapping", () => ({
  AgentMappingSection: () => null,
  ancoraDoMapeamento: () => "mapeamento",
}));

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import { updatePipelineConfig } from "@/app/actions/settings/updatePipelineConfig";
import { PipelinesClient, type PipelineRow } from "@/app/app/settings/tenant/pipelines/_client";

/** FORK ESCALE · Fase 1F-a: o campo é do CRM; remover aqui e salvar o remove de toda origem. */
const FUNIL: PipelineRow = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Leads",
  slug: "leads",
  vocabulary: { lead: "Lead", deal: "Negócio", won: "Ganho", lost: "Perdido" },
  settings: {
    fields: [
      { key: "cpf", label: "CPF", type: "text" },
      { key: "renda", label: "Renda", type: "number" },
    ],
  },
} as PipelineRow;

async function salvar() {
  fireEvent.click(screen.getByRole("button", { name: /Salvar vocabulário e campos/i }));
  await vi.waitFor(() => expect(updatePipelineConfig).toHaveBeenCalledTimes(1));
  return vi.mocked(updatePipelineConfig).mock.calls[0]?.[1];
}

describe("Configurações › Funis com os campos do CRM", () => {
  it("remover um campo que veio do banco e salvar manda a chave em campos_removidos", async () => {
    vi.mocked(updatePipelineConfig).mockClear();
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    fireEvent.click(screen.getByRole("button", { name: "Remover campo CPF" }));
    const patch = await salvar();
    expect(patch?.fields?.map((f) => f.key)).toEqual(["renda"]);
    expect(patch?.campos_removidos).toEqual(["cpf"]);
  });

  it("sem remover nada, não manda campos_removidos", async () => {
    vi.mocked(updatePipelineConfig).mockClear();
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    const patch = await salvar();
    expect(patch?.campos_removidos).toBeUndefined();
  });

  it("campo novo tirado antes de salvar não é apagado do catálogo", async () => {
    vi.mocked(updatePipelineConfig).mockClear();
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    fireEvent.click(screen.getByRole("button", { name: /Adicionar campo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Remover campo Novo campo" }));
    const patch = await salvar();
    expect(patch?.campos_removidos).toBeUndefined();
  });

  it("avisa que o campo vale em toda origem (texto da Clint para a regra)", () => {
    render(<PipelinesClient pipelines={[FUNIL]} podeEditarConfig />);
    expect(screen.getByText("Campos do negócio (valem em todas as origens)")).toBeInTheDocument();
    expect(screen.getByText(/Remover um campo aqui e salvar o remove de toda origem\./)).toBeInTheDocument();
    expect(
      screen.getByText(/Se este campo estiver configurado como obrigatório em alguma origem, a regra será removida\./),
    ).toBeInTheDocument();
  });
});
```

```bash
corepack pnpm vitest run tests/unit/escale-campos-do-crm-gravacao.test.ts tests/unit/escale-campos-do-crm-tela-funis.test.tsx
```
Expected: FAIL (`CAMPOS_DO_CRM_MAX` não existe; `campos_removidos` ausente).

- [ ] **Step 2: O schema**

Em `lib/schemas/settings.ts`, logo ANTES de `export const pipelineConfigPatchSchema = z.object({`, acrescente:

```ts
/**
 * FORK ESCALE · Fase 1F-a: os campos são do CRM (catálogo da organização,
 * `crm_campos_do_negocio`, migration 9006). `settings.fields` de cada origem é a
 * projeção do catálogo inteiro, então o teto passa a ser o da organização.
 */
export const CAMPOS_DO_CRM_MAX = 200;

```

E, dentro do `pipelineConfigPatchSchema`, troque

```ts
  fields: z.array(customFieldSchema).max(50).optional(),
```

por

```ts
  // FORK ESCALE · Fase 1F-a: o teto é o do catálogo da organização.
  fields: z.array(customFieldSchema).max(CAMPOS_DO_CRM_MAX).optional(),
  /**
   * FORK ESCALE · Fase 1F-a: as chaves que a pessoa tirou da lista. Gravar
   * `fields` sem uma chave não apaga (o gatilho da 9006 devolve o campo); quem
   * apaga do catálogo, e de toda origem, é esta lista.
   */
  campos_removidos: z.array(customFieldSchema.shape.key).max(CAMPOS_DO_CRM_MAX).optional(),
```

- [ ] **Step 3: A server action**

Em `app/actions/settings/updatePipelineConfig.ts`, logo DEPOIS do bloco

```ts
  if (row.organization_id !== activeOrg.orgId) {
    return { ok: false, error: "forbidden_tenant" };
  }
```

acrescente:

```ts

  // FORK ESCALE · Fase 1F-a: os campos são do CRM. Remover na tela apaga do
  // catálogo, e o gatilho da 9006 tira o campo e a regra dele do
  // `settings.fields` de todas as origens (como na Clint: "A exclusão desse
  // campo remove em toda origem.").
  const camposRemovidos = parsed.data.campos_removidos ?? [];
  if (camposRemovidos.length > 0) {
    const { error: erroAoApagar } = await supabase
      .from("crm_campos_do_negocio")
      .delete()
      .eq("organization_id", activeOrg.orgId)
      .in("chave", camposRemovidos);
    if (erroAoApagar) return { ok: false, error: erroAoApagar.message };
  }
```

E, no `metadata` da auditoria, logo DEPOIS de `      reabertura: parsed.data.reabertura ?? null,`, acrescente:

```ts
      // FORK ESCALE · Fase 1F-a
      campos_removidos: camposRemovidos.length > 0 ? camposRemovidos : null,
```

- [ ] **Step 4: A tela Configurações › Funis**

Em `app/app/settings/tenant/pipelines/_client.tsx`:

4a. Troque `import { customFieldSchema, type CustomFieldDef } from "@/lib/schemas/settings";` por `import { CAMPOS_DO_CRM_MAX, customFieldSchema, type CustomFieldDef } from "@/lib/schemas/settings";`.

4b. Logo DEPOIS de `  const [fields, setFields] = useState<CustomFieldDef[]>(camposDoFunil(pipeline.settings));`, acrescente:

```tsx
  // FORK ESCALE · Fase 1F-a: os campos são do CRM. As chaves que vieram do banco
  // e não estão mais na lista ao salvar são apagadas do catálogo (de toda origem).
  // Campo criado depois que a tela abriu não está aqui, então não é apagado.
  const [chavesDoBanco, setChavesDoBanco] = useState<ReadonlySet<string>>(
    () => new Set(camposDoFunil(pipeline.settings).map((c) => c.key)),
  );
```

4c. Logo ANTES de `    const patch: PipelineConfigPatch = {`, acrescente:

```tsx
    // FORK ESCALE · Fase 1F-a: o que saiu da lista sai do catálogo.
    const camposRemovidos = [...chavesDoBanco].filter((k) => !ok.some((f) => f.key === k));
```

e, dentro do objeto `patch`, logo DEPOIS de `      reabertura: retomaComoNovo ? "novo_negocio" : "mesmo_registro",`, acrescente:

```tsx
      ...(camposRemovidos.length > 0 ? { campos_removidos: camposRemovidos } : {}),
```

4d. No `startTransition` logo abaixo, troque

```tsx
      if (r.ok) toast.success(`${pipeline.name} ${t("atualizado.")}`);
```

por

```tsx
      if (r.ok) {
        toast.success(`${pipeline.name} ${t("atualizado.")}`);
        // FORK ESCALE · Fase 1F-a: o que foi salvo passa a ser "do banco".
        setChavesDoBanco(new Set(ok.map((f) => f.key)));
      }
```

4e. Troque

```tsx
        <Label className="text-xs">{t("Campos do lead neste funil")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("Aparecem no dossiê do negócio. No follow-up, você escolhe em qual campo gravar a resposta.")}
        </p>
```

por

```tsx
        {/* FORK ESCALE · Fase 1F-a: os campos são do CRM, não do funil. */}
        <Label className="text-xs">{t("Campos do negócio (valem em todas as origens)")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("Aparecem no dossiê do negócio. No follow-up, você escolhe em qual campo gravar a resposta.")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("Remover um campo aqui e salvar o remove de toda origem.")}{" "}
          {t("Se este campo estiver configurado como obrigatório em alguma origem, a regra será removida.")}
        </p>
```

4f. Troque `        {fields.length < 50 && (` por `        {/* FORK ESCALE · Fase 1F-a: o teto é o do catálogo. */}` numa linha e `        {fields.length < CAMPOS_DO_CRM_MAX && (` na seguinte.

- [ ] **Step 5: A captação e o espanhol**

5a. Em `lib/webhooks/campo-da-captacao.ts`, troque `import { customFieldSchema, type CustomFieldDef } from "@/lib/schemas/settings";` por `import { CAMPOS_DO_CRM_MAX, customFieldSchema, type CustomFieldDef } from "@/lib/schemas/settings";` e

```ts
/** O mesmo limite de `pipelineConfigPatchSchema.fields`. */
export const MAX_CAMPOS_DO_FUNIL = 50;
```

por

```ts
/** O mesmo limite de `pipelineConfigPatchSchema.fields` (FORK ESCALE · Fase 1F-a: o do catálogo do CRM). */
export const MAX_CAMPOS_DO_FUNIL = CAMPOS_DO_CRM_MAX;
```

5b. Em `lib/i18n/dicionario.ts`, logo ANTES da linha `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`, acrescente:

```ts
  // ─── FORK ESCALE · Fase 1F-a: campos do CRM (Configurações › Funis) ───
  "Campos do negócio (valem em todas as origens)": { es: "Campos del negocio (valen en todos los orígenes)" },
  "Remover um campo aqui e salvar o remove de toda origem.": { es: "Quitar un campo aquí y guardar lo quita de todos los orígenes." },
  "Se este campo estiver configurado como obrigatório em alguma origem, a regra será removida.": {
    es: "Si este campo está configurado como obligatorio en algún origen, se eliminará la regla.",
  },
```

Antes, confira que nenhuma das três chaves já existe (`grep -n "Campos do negócio (valem" lib/i18n/dicionario.ts` etc.). Chave repetida quebra o typecheck.

- [ ] **Step 6: Verificar (G1) e commit**

```bash
corepack pnpm vitest run tests/unit/escale-campos-do-crm-gravacao.test.ts tests/unit/escale-campos-do-crm-tela-funis.test.tsx app/app/settings/tenant/pipelines/_client.test.tsx lib/webhooks/campo-da-captacao.test.ts lib/schemas/settings.test.ts app/app/webhooks/_components/CapturaDetail.test.tsx tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/suporte-cobertura-de-efeitos.test.ts
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint lib/schemas/settings.ts app/actions/settings/updatePipelineConfig.ts app/app/settings/tenant/pipelines/_client.tsx lib/webhooks/campo-da-captacao.ts tests/unit/escale-campos-do-crm-gravacao.test.ts tests/unit/escale-campos-do-crm-tela-funis.test.tsx
corepack pnpm exec prettier --write tests/unit/escale-campos-do-crm-gravacao.test.ts tests/unit/escale-campos-do-crm-tela-funis.test.tsx
```
Expected: PASS, typecheck e eslint sem erro novo. Rode também os guardas que leem os arquivos tocados (comando da G1). Não rode o prettier em arquivo do original.
- Se o `PipelineRow` exigir mais campos, complete o `FUNIL` do teste com os do `FUNIL` de `app/app/settings/tenant/pipelines/_client.test.tsx`.
- Se o `select` da server action no dublê não bater com o encadeamento real, copie o encadeamento do arquivo (`.select(...).eq("id", …).maybeSingle()`) e ajuste só o dublê.

Controlador confere o diff (G1: task pequena, sem revisor).

```bash
git add lib/schemas/settings.ts app/actions/settings/updatePipelineConfig.ts app/app/settings/tenant/pipelines/_client.tsx lib/webhooks/campo-da-captacao.ts lib/i18n/dicionario.ts tests/unit/escale-campos-do-crm-gravacao.test.ts tests/unit/escale-campos-do-crm-tela-funis.test.tsx
git commit -m "feat(escale): Configurações › Funis edita os campos do CRM (remover apaga de toda origem; teto de 200)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: "Personalizar cards" sem o "de outra origem"

**Por quê:** o fix `8c52e6cb8` (de 16/10) mostrava, ligado e com "de outra origem", o campo escolhido que só existia em outra origem. Agora toda origem tem o catálogo inteiro: esse caso não acontece mais. Fica o "soltar o campo que não existe mais", que passa a significar "o campo apagado do CRM", e a rota `GET /api/v1/capas-do-card/campos`, que já devolve a união das origens (= o catálogo).

**Files:**
- Modify: `lib/escale/capa/tipos.ts`, `components/escale/capa/JanelaPersonalizarCards.tsx`, `app/api/v1/capas-do-card/campos/route.ts` (só o comentário), `hooks/escale/useCamposDasOrigens.ts` (só o comentário), `lib/i18n/dicionario.ts`, `tests/unit/escale-capa-tipos.test.ts`, `tests/unit/escale-janela-personalizar-cards.test.tsx`
- Create: `tests/unit/escale-campos-do-crm-capa.test.ts`

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-campos-do-crm-capa.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import * as tipos from "@/lib/escale/capa/tipos";

/** FORK ESCALE · Fase 1F-a: os campos são do CRM; nenhum campo escolhido é "de outra origem". */
const RAIZ = join(__dirname, "..", "..");
const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8");

describe("Personalizar cards com os campos do CRM", () => {
  it("não existe mais o campo 'de outra origem'", () => {
    expect("camposDeOutraOrigem" in tipos).toBe(false);
    const janela = ler("components/escale/capa/JanelaPersonalizarCards.tsx");
    expect(janela).not.toContain("de outra origem");
    expect(janela).not.toContain("sufixo");
    expect(ler("lib/i18n/dicionario.ts")).not.toContain('"de outra origem"');
  });

  it("o campo apagado do CRM continua sendo solto", () => {
    expect(typeof tipos.limparCamposSemOrigem).toBe("function");
    expect(ler("components/escale/capa/JanelaPersonalizarCards.tsx")).toContain("limparCamposSemOrigem(");
  });
});
```

```bash
corepack pnpm vitest run tests/unit/escale-campos-do-crm-capa.test.ts
```
Expected: FAIL em "não existe mais o campo 'de outra origem'".

- [ ] **Step 2: Tirar o "de outra origem"**

2a. `lib/escale/capa/tipos.ts`: apague a função `camposDeOutraOrigem` inteira, com o comentário `/** Os campos do negócio escolhidos que existem em alguma origem, mas não na atual (a janela os mostra para desligar). */`. No comentário de `limparCamposSemOrigem`, troque as duas primeiras frases por: `A preferência vale em todas as origens, e os campos do negócio são do CRM (catálogo da organização, migration 9006). O campo que foi apagado do CRM`.

2b. `components/escale/capa/JanelaPersonalizarCards.tsx` (o inverso do fix, menos o "soltar"):
- no import de `@/lib/escale/capa/tipos`, apague a linha `  camposDeOutraOrigem,`;
- na `interface Linha`, apague as duas linhas `/** Texto cinza depois do rótulo (campo que só existe em outra origem). */` e `sufixo?: string;`;
- no comentário da função, troque `` origens da pessoa: `campos` são os da origem de agora; `catalogo`, os de todas `` … até `outra origem aparece ligado, com "de outra origem", para a pessoa desligar.` por: `` origens da pessoa. `catalogo` são os campos do CRM (`undefined` = ainda não sei, e então nada é solto): o campo escolhido que foi apagado do CRM é solto ao abrir e ao salvar. ``;
- apague o `const deOutraOrigem = useMemo(...)` inteiro (4 linhas);
- troque `const campo = (c: CampoDaCapa, deOutra = false): Linha => {` por `const campo = (c: CampoDaCapa): Linha => {`, apague a linha `const sufixo = deOutra ? t("de outra origem") : undefined;`, troque `nome: sufixo ? \`${rotulo} (${sufixo})\` : rotulo,` por `nome: rotulo,` e apague a linha `sufixo,`;
- apague a linha `        ...deOutraOrigem.map((c) => campo(c, true)),`;
- em `LinhaDoGrupo`, troque o `<span className="min-w-0 flex-1 truncate">` de quatro linhas (com `{linha.rotulo}` e o `{linha.sufixo ? … : null}`) por `<span className="min-w-0 flex-1 truncate">{linha.rotulo}</span>`.

Se o texto do arquivo na `main` estiver diferente do fix `8c52e6cb8` (ajuste no merge), aplique a mesma intenção e diga no relatório o que mudou.

2c. `app/api/v1/capas-do-card/campos/route.ts`: no comentário do topo, troque `e o campo mora numa\n * delas (`settings.fields`): com o catálogo ela solta o que foi apagado de todas\n * e mostra, para desligar, o que só existe em outra origem.` por `e os campos são do CRM\n * (catálogo da organização, migration 9006; `settings.fields` de toda origem é a\n * projeção dele): com o catálogo ela solta o campo que foi apagado do CRM.` O código não muda.

2d. `hooks/escale/useCamposDasOrigens.ts`: no comentário, troque `A janela "Personalizar cards" usa para\n * soltar o campo apagado de todas e mostrar o que só existe em outra origem.` por `A janela "Personalizar cards" usa para\n * soltar o campo apagado do CRM.`

2e. `lib/i18n/dicionario.ts`: apague a linha `  "de outra origem": { es: "de otro origen" },`.

2f. Testes do fix:
- `tests/unit/escale-capa-tipos.test.ts`: apague o import de `camposDeOutraOrigem` e o `it`/`describe` que o usa;
- `tests/unit/escale-janela-personalizar-cards.test.tsx`: apague os três casos "o escolhido que existe em outra origem aparece ligado, com 'de outra origem', e dá para desligar", "os de outra origem entram na conta do limite, e desligar um libera o lugar" e "o que não está escolhido e é de outra origem não é oferecido"; troque o nome do `describe("campos de outra origem (a preferência vale em todas as origens)"` por `describe("campo apagado do CRM (a preferência vale em todas as origens)"`.

- [ ] **Step 3: Verificar (G1) e commit**

```bash
corepack pnpm vitest run tests/unit/escale-campos-do-crm-capa.test.ts tests/unit/escale-capa-tipos.test.ts tests/unit/escale-janela-personalizar-cards.test.tsx tests/unit/escale-capas-do-card-campos-rota.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint lib/escale/capa/tipos.ts components/escale/capa/JanelaPersonalizarCards.tsx app/api/v1/capas-do-card/campos/route.ts hooks/escale/useCamposDasOrigens.ts tests/unit/escale-campos-do-crm-capa.test.ts tests/unit/escale-capa-tipos.test.ts tests/unit/escale-janela-personalizar-cards.test.tsx
corepack pnpm exec prettier --write tests/unit/escale-campos-do-crm-capa.test.ts
```
Expected: PASS; sem erro novo. Mais os guardas que leem os arquivos tocados (comando da G1). Controlador confere o diff.

```bash
git add lib/escale/capa/tipos.ts components/escale/capa/JanelaPersonalizarCards.tsx app/api/v1/capas-do-card/campos/route.ts hooks/escale/useCamposDasOrigens.ts lib/i18n/dicionario.ts tests/unit/escale-campos-do-crm-capa.test.ts tests/unit/escale-capa-tipos.test.ts tests/unit/escale-janela-personalizar-cards.test.tsx
git commit -m "refactor(escale): Personalizar cards sem 'de outra origem' — os campos são do CRM

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: PRD, roteiro, uma rodada cheia de gates e o PR

- [ ] **Step 1: A lista das falhas conhecidas do Windows**

Guarde a lista (do relatório de gates da 1E, seção "Falhas que também ocorrem na main") num arquivo fora do git:

```bash
mkdir -p .superpowers/sdd
cat > .superpowers/sdd/falhas-conhecidas.txt <<'EOF'
tests/unit/agent-version-columns-drift.test.ts
tests/unit/atualizacao-confere-regras-de-isolamento.test.ts
tests/unit/chip-contraste-da-etiqueta.test.ts
tests/unit/confianca-do-handoff-nao-e-similaridade.test.ts
tests/unit/dialog-base-roda-e-tem-teto.test.ts
tests/unit/e2e-parte-4-fala-com-os-servicos-do-runner.test.ts
tests/unit/e2e-supabase-start-tenta-de-novo.test.ts
tests/unit/executor-proprio-so-roda-o-que-e-nosso.test.ts
tests/unit/followups-de-demonstracao-sao-possiveis.test.ts
tests/unit/gerar-env-e2e-extensoes.test.ts
tests/unit/guarda-da-release-confere-identidade.test.ts
tests/unit/guarda-da-release-reconhece-o-corte.test.ts
tests/unit/hooks-nao-acusam-o-merge-da-main.test.ts
tests/unit/imagens-ok-so-aceita-pulo-declarado.test.ts
tests/unit/knobs-da-versao-publicada-sao-aplicados.test.ts
tests/unit/lgpd-pdf-campos-personalizados.test.ts
tests/unit/lgpd-pdf-cpf-mascarado.test.ts
tests/unit/lgpd-pdf-meet.test.ts
tests/unit/lgpd-pdf-propostas.test.ts
tests/unit/lgpd-pdf-replies.test.ts
tests/unit/lgpd-pdf-transcricao.test.ts
tests/unit/populacao-do-proximo-nnnn.test.ts
tests/unit/rascunho-superado-nao-e-regravado.test.ts
tests/unit/release-chega-na-lp.test.ts
tests/unit/servidor-nao-importa-valor-de-modulo-cliente.test.ts
tests/unit/drain-loop-carrega-deps-sob-tsx.test.ts
EOF
```

Para o `test:db`, as duas falhas por lentidão que passaram isoladas na 1E: `evento-morto-nao-inunda-a-central.test.ts` e `conversa-que-nasce-durante-a-trava-do-contato.test.ts`.

- [ ] **Step 2: A rodada cheia, em segundo plano**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
( corepack pnpm typecheck && corepack pnpm lint && corepack pnpm lint:channels && corepack pnpm lint:role-rank \
  && bash scripts/checar-colisao-de-migration.sh escale-crm/main ) > .superpowers/sdd/1f-a-gates-rapidos.log 2>&1; echo "rapidos=$?" >> .superpowers/sdd/1f-a-gates-rapidos.log &
corepack pnpm vitest run --reporter=json --outputFile=.superpowers/sdd/1f-a-unit.json > .superpowers/sdd/1f-a-unit.log 2>&1 &
( corepack pnpm test:db && corepack pnpm test:db:update ) > .superpowers/sdd/1f-a-db.log 2>&1 &
```
`vitest run` roda os dois projetos (`cercas` e `produto`): não rode `pnpm cercas` à parte. Enquanto rodam, faça o Step 3.

Quando o `vitest` terminar, compare com as conhecidas:

```bash
node -e '
const fs = require("fs"), path = require("path");
const r = JSON.parse(fs.readFileSync(".superpowers/sdd/1f-a-unit.json", "utf8"));
const conhecidas = new Set(fs.readFileSync(".superpowers/sdd/falhas-conhecidas.txt", "utf8").split(/\r?\n/).filter(Boolean));
const falhas = r.testResults.filter((t) => t.status === "failed").map((t) => path.relative(process.cwd(), t.name).replace(/\\/g, "/"));
const novas = falhas.filter((f) => !conhecidas.has(f));
console.log("falharam:", falhas.length, "| novas:", novas.length);
for (const f of novas) console.log("NOVA", f);
process.exit(novas.length ? 1 : 0);
'
```
Expected: `novas: 0`. Toda falha nova é regressão: rode o arquivo sozinho; se continuar falhando, corrija antes do PR. No `test:db`, só as duas lentas acima podem falhar, e passam se rodadas sozinhas (`corepack pnpm test:db <arquivo>`).

- [ ] **Step 3: PRD e roteiro (fora do repositório)**

3a. Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`, seção 8, na linha que começa por `| 1E |`, troque a última coluna `PR aberto` por `✅ PR #17`. Logo DEPOIS dessa linha, acrescente:

```markdown
| 1F-a | **Campos do CRM:** os campos personalizados do negócio passam a ser da organização, como na Clint (decisão de 16/10) | Um campo criado em qualquer origem aparece em todas; apagar remove de todas, com a regra; a regra de obrigatório continua por origem; nenhuma tela que lê campos muda | PR aberto (aguarda o "pode fazer" do merge) |
```

3b. Na linha que começa por `| D16 |`, troque a última coluna por `Fase 2 (precisa dos grupos de campos do contato). Desde a 1F-a os campos são do CRM; a D16 é o "esconder por origem" da Clint (\`settings.hidden_fields\`)`.

3c. Em `C:\Documentos\projetos claude\Deskcom CRM\docs\roteiro.md`, logo DEPOIS da linha que começa por `5. **Sem origem padrão (16/10/2026):**`, acrescente:

```markdown
6. **Campos do CRM (16/10/2026):** os campos personalizados do negócio são da organização, como na Clint, e não de cada origem. Cada origem guarda só as suas regras (obrigatório) e, na D16, os campos que esconde. Fase 1F-a do PRD de Negócios.
```

- [ ] **Step 4: Push e PR**

Só depois de `rapidos=0`, `novas: 0` e o `test:db` verde.

```bash
git push -u escale-crm feat/fase-1f-a-campos-do-crm
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-1f-a-campos-do-crm --title "feat(escale): Fase 1F-a — campos do CRM (catálogo da organização, igual à Clint)" --body-file .superpowers/sdd/1f-a-pr.md
```

O corpo (`.superpowers/sdd/1f-a-pr.md`):
- **O que muda:** o Goal deste plano;
- **Banco:** migration 9006, a tabela, os dois gatilhos e a junção;
- **Medição antes (Task 1, Step 1):** as duas saídas, inclusive a lista de conflitos;
- **Depois do deploy (só leitura):** `select organization_id, chave, divergencias from public.crm_campos_do_negocio where divergencias <> '[]'::jsonb;` mostra cada campo em que uma definição perdeu;
- **Decisões:** C1 a C11 e a G1;
- **O que a lateral vê de diferente:** todo negócio mostra os campos de todas as origens; Configurações › Funis edita o campo para todas;
- **Perguntas em aberto:** Q1 a Q8;
- **Verificação:** os testes por task, a rodada cheia (contagens) e a comparação com as falhas conhecidas;
- termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Mostre a URL ao usuário e PARE.

---

## Fora desta fase (registrado)

- **Tela "Gerenciamento de campos" da Clint** (Configurações): abas Contato, Empresa e Negócio, grupos de campos, criar, renomear, "Restringir visibilidade", "Usar como variável", "Copiar identificador". Precisa dos prints (Q6).
- **Grupos de campos** (a Clint agrupa: "Informações Gerais", "Materiais"…): o catálogo nasce sem grupo. Fase da tela de gerenciamento.
- **Esconder campo por origem** ("Visualização de campos", `hidden_fields`): D16.
- **Campos próprios do contato e da empresa** (abas CONTACT e ORGANIZATION da Clint): Fase 2.
- **Trocar a chave de um campo:** a chave não muda (o gatilho recusa). Em Configurações › Funis, mudar a chave de um campo existente e salvar cria um campo novo e apaga o antigo do catálogo; os valores gravados com a chave antiga ficam nos negócios, sem aparecer. Igual ao que acontecia antes numa origem só.
</content>
</invoke>
