# Fase 1J — Acesso por origem (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** D11 e D12 de `docs/modulos/1-negocios.md` (seção 4, tabela D), mais o que a 1F deixou "Em breve" para a 1J: o seletor "Visualização de negócios" da subaba Configurações Gerais e a subaba "Permissão de usuários". **Dois PRs** (N1): o PR A é só banco (migration 9010 e as provas; nada muda para quem usa até alguém configurar); o PR B é a rota e a tela.

## Decisões do usuário (17/10, noite)

| # | Decisão |
|---|---|
| Q2 | **Origem sem regra própria segue a regra da organização.** Ao publicar, ninguém perde nem ganha acesso; só muda quem abrir a origem e escolher. (A Clint grava "seus negócios e sem dono" ao criar a origem; aqui não.) |
| Q4 | **Só o administrador passa por cima da lista de pessoas.** A lista restringe viewer, agente **e gerente**. A regra "só os seus" / "seus e sem dono" continua valendo só para o agente, como no original (viewer e gerente veem todos os negócios das origens a que têm acesso). |
| Q5 | **O aviso da Clint entra agora.** Link direto para negócio de origem sem acesso: "Você não tem permissão para acessar essa origem." e volta para a lista de negócios. Origem liberada mas negócio de outro dono escondido pela regra: a janela "Dono do negócio" com "Atenção! Esse negócio pertence a outro dono." e "Voltar para listagem de negócios". |
| Q6 | **A lista de pessoas existe também no grupo de origens, igual à Clint:** a origem sem lista própria segue a lista do grupo; a origem com lista própria usa a dela. |
| Q8 | **O vendedor (papel "agente") que cria um negócio sem dono numa origem "só os seus" vira o dono automaticamente** (o banco faz, como o original já faz para a regra da organização). Não é o agente de IA. |
| Q1 | **Dois PRs** (A: migration 9010 + provas, Tasks 1 a 3; B: rotas e tela, Tasks 4 a 9). |
| Q3 | **A lista de pessoas fica no `settings`** da origem e do grupo, como a Clint; sem tabela nova. |
| Q7 | **Sob "só os seus" ou "seus e sem dono", quem não é gerente não troca o dono:** o seletor fica desligado com o texto da Clint. |
| Q9 | **A validação com a distribuição de dono** ("Não é possível salvar…") entra na 1K, com a distribuição. |
| Q10 | **O defeito da 1F** (o campo mostrava sempre "seus negócios e sem dono") é corrigido de passagem. |
| Q11 | **Conversas ficam como hoje** (regra da organização). Quem vê conversas, e as demais chaves por ação, é assunto dos **Grupos de permissão** da Clint (Configurações › Usuários), trilha à parte já decidida em 17/10 (PRD de Contatos, pergunta 3). |
| Q12 | **O seletor sem a opção "seguir a organização":** mostra a regra em vigor e salvar grava a escolhida, como a Clint. |

## Perguntas respondidas em 17/10 (ficam aqui como registro do que o plano faz)

| # | Pergunta | O que o plano faz |
|---|---|---|
| Q1 | **Dois PRs** (A: migration 9010 + provas, Tasks 1 a 3; B: rota e tela, Tasks 4 a 9). O A sozinho não muda nada visível. Aceita? | N1 |
| Q3 | **Lista de pessoas no `settings`** da origem e do grupo (`escale_pessoas`, lista de ids), como a Clint (`origin.permissions`, `origin_group.permissions`), e não numa tabela. Lista vazia = sem restrição. Confirma? | N3 |
| Q7 | **Trocar o dono sob "só os seus".** Quem não é gerente, numa origem "apenas seus negócios" ou "seus e sem dono", não consegue passar o negócio a outra pessoa (o banco recusa, porque deixaria de vê-lo). A Clint desliga o seletor com "As permissões de usuários não permitem você trocar de dono". O plano faz o mesmo na ficha. Confirma? | N14 |
| Q9 | **Distribuição de dono × lista.** A Clint não deixa salvar a lista se alguém da distribuição ficar de fora. A distribuição é 1K; essa validação entra lá. Confirma? | N15 |
| Q10 | **Defeito da 1F corrigido de passagem:** o campo "Visualização de negócios" mostrava sempre "seus negócios e sem dono", porque a rota nunca lia a regra da organização. A 1J lê `organizations.settings` na rota, como `POST /api/v1/leads` faz. Ok? | N10 |
| Q11 | **Conversas continuam com a regra da organização** (`fn_can_view_conversation` não muda). A 1J só mexe em negócios e no que depende deles. Confirma? | N15 |
| Q12 | **Sem a opção "seguir a organização" no seletor.** O seletor mostra a regra em vigor e salvar grava a escolhida na origem. Voltar a "seguir a organização" não tem botão, como na Clint. Ok? | N12 |

**Prints que faltam** (nenhum bloqueia; onde falta, o plano segue o código da Clint):
1. ❌ A subaba **"Permissão de usuários"** da origem na v2 atual (descrição, contador, tabela "Usuários", ✕, paginação "n / N", seletor "Adicione um usuário...").
2. ❌ A seção **"Permissão de usuários"** da janela do grupo (o seletor múltiplo "Selecione os usuários que poderão visualizar o grupo" e o contador).
3. ❌ O seletor "Visualização de negócios" **fechado** na v2 atual (o print 03 mostra aberto).
4. ❌ O aviso "Você não tem permissão para acessar essa origem." (toast) e a janela "Dono do negócio".
5. ❌ O seletor de dono da ficha desligado com a dica (Q7).

**Goal:** Cada origem tem a sua regra de quem vê os negócios (todos / só os seus / os seus e sem dono) e a sua lista de pessoas com acesso; cada grupo tem a sua lista, que vale para as origens sem lista própria; o banco aplica tudo em todos os caminhos (quadro, ficha, linha do tempo, Visualizações, filtros salvos, lista de contatos, tempo real); só o administrador passa por cima; a tela da origem (1F) ganha o seletor de verdade e a subaba "Permissão de usuários"; a janela do grupo (1B) ganha a sua seção; quem cai num negócio sem acesso vê o aviso da Clint. Sem configurar nada, tudo continua como hoje.

**Architecture:**
- **Banco (PR A, migration 9010):** `crm_pipeline_groups` ganha `settings jsonb` (a lista do grupo). Quatro funções `security definer` do fork: `fn_escale_lista_permite(jsonb)`, `fn_escale_visualizacao_da_origem(org, origem)` (a regra em vigor), `fn_escale_tem_acesso_a_origem(org, origem)` (admin sempre; lista da origem, senão a do grupo; vazia = todos) e `fn_escale_tem_acesso_ao_grupo(org, grupo)` (admin; lista do grupo; ou alguma origem dele com lista própria que inclua a pessoa), mais `fn_escale_pode_ver_negocio(org, dono, origem)` (a `fn_can_view_lead` do original com a origem no meio). Nove policies recriadas: oito do original (`crm_leads` select/insert/update/delete, `crm_lead_activities_select`, `crm_lead_links_select`, `crm_pipelines_select`, `crm_stages_select`) e uma do fork (`crm_pipeline_groups_select`, 9001). `fn_can_view_lead` fica intacta. Um gatilho `before insert` em `crm_leads` põe o criador como dono quando a origem é "só os seus" (Q8). Tudo em `settings` (`escale_visualizacao`, `escale_pessoas`); nenhuma tabela nova.
- **Rota (PR B):** `GET/PATCH /api/v1/pipelines/[id]/configuracoes` (1F) ganha `gerais.visualizacao` e a seção `permissoes.pessoas`; `PATCH /api/v1/pipeline-groups/[id]` (1B) ganha `pessoas`. As duas validam que cada pessoa é membro ativo. O GET da origem devolve a regra em vigor, a da organização e a lista do grupo.
- **Tela (PR B):** `SecaoGerais` troca o combobox parado pelo `SeletorDaCasca`; `SecaoPermissoes` (nova) é a subaba da Clint, sobre a `ListaDePessoas` (nova, reusável); `FormConfigGrupo` ganha a seção do grupo; a página da ficha (1G) mostra o aviso ou a janela "Dono do negócio"; `DonoDaFicha` desliga o seletor sob "só os seus" para quem não é gerente.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`, Supabase (RLS, funções `security definer`, gatilho), zod, `sonner` (toast).

## Referência visual (abrir o PNG antes de cada task de tela)

Os caminhos ficam **sem crase** (guarda `evidencia-citada`).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| F01 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1f\2026-10-16-01-geral-configuracoes-gerais.jpg | a subaba Configurações Gerais na v2: o menu à esquerda com "Permissão de usuários" (4º item), o campo "Visualização de negócios" fechado com "Usuários visualizam seus negócios e sem dono" | 5, 6 |
| F03 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1f\2026-10-16-03-geral-visualizacao-aberta.jpg | o seletor aberto: as três opções na ordem "todos os negócios", "apenas seus negócios", "seus negócios e sem dono"; a escolhida em azul com texto branco | 5 |
| 023 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-023-configuracoes-gerais-origem.png | a mesma tela na v2 com menu lateral (só o conteúdo vale) | 5 |
| 013 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-013-configuracao-origem-v1.png | a v1 (o menu da subaba) | 6 |

### Medidas tiradas dos prints (1:1) e do código da Clint

| Peça | Medida |
|---|---|
| Seletor "Visualização de negócios" | o mesmo `SeletorDaCasca aparencia="janela"` do campo "Grupo" (44px, 11,9px/300, fundo `casca-raia`, canto 4px, chevron à direita); aberto: lista com as 3 opções, a escolhida em `casca-marca` com texto branco (print F03) |
| Subaba "Permissão de usuários" da origem (sem print; código `Ps` em index-mZOMjQAe) | `CabecaDaSecao` com ícone `Users`, título "Permissão de usuários" e a descrição; contador 13px `casca-suave` só com 1+ pessoa; tabela com cabeçalho "Usuários" (10px/600 maiúsculo, 44px, como as tabelas da 1H); linha 44px com "Nome <email>" 13px e o ✕ (`X` 14px, `casca-meta`, hover `casca-alerta`) à direita; paginação à direita "n / N" 12px com ‹ › (`ChevronLeft`/`ChevronRight`, 24px); o seletor "Adicione um usuário..." abaixo da tabela, `SeletorDaCasca aparencia="janela"` com busca |
| Seção do grupo (sem print; código `StepConfig` em index-CTaP4T6N) | título 13px/500 "Permissão de usuários", descrição 11px `casca-suave`, `SeletorMultiploDaCasca` com o placeholder e, embaixo, o contador 12px |
| Janela "Dono do negócio" (sem print; código `kc` em index-BKc3FRy4) | `JanelaDaCasca` (28rem) com `CabecaDaJanela` "Dono do negócio", o texto "Atenção! Esse negócio pertence a outro dono." 13px e um só botão `BotaoDaJanela variante="salvar"` "Voltar para listagem de negócios" |

### Textos da Clint usados nesta fase

Do catálogo `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\catalog-v2\i18n-pt.txt` (linha entre parênteses) e do bundle `raw-v2\js\pt-BR-DmQ11GIn.js.txt` (marcado "bundle"):
- **Seletor:** "Visualização de negócios" (8534); "Usuários visualizam todos os negócios", "Usuários visualizam apenas seus negócios", "Usuários visualizam seus negócios e sem dono" (bundle, já no dicionário pela 1F).
- **Subaba da origem:** "Permissão de usuários" (8532); "Somente os usuários selecionados poderão ver a origem. Caso nenhum usuário seja selecionado, a visualização não terá restrição." (11618); "Somente os usuários selecionados poderão ver a origem. Sem nenhum usuário selecionado, a origem segue as permissões do grupo." (11619); "{n} usuário selecionado" / "{n} usuários selecionados" (11626); "Usuários" (bundle `label.tUsers`); "Adicione um usuário..." (bundle `component.PermissionsTab.addUser`).
- **Seção do grupo:** "Permissão de usuários"; "Somente os usuários selecionados poderão ver o grupo. Caso nenhum usuário seja selecionado, a visualização não terá restrição."; "Selecione os usuários que poderão visualizar o grupo" (`component.StepConfig.*`, 12925–12931).
- **Aviso e janela:** "Você não tem permissão para acessar essa origem." (bundle `component.Deal.noPermissionToAccessOrigin`); "Dono do negócio" (bundle `label.tUserOwner`); "Atenção! Esse negócio pertence a outro dono."; "Voltar para listagem de negócios" (fixos no JS, `kc`).
- **Ficha:** "As permissões de usuários não permitem você trocar de dono" (já no dicionário pela 1G).
- **Textos nossos** (a Clint não tem): "Remover {nome}" (aria do ✕), "Este usuário não faz parte da equipe." (422 das rotas), "Administradores sempre veem os negócios desta origem." (linha de ajuda sob a descrição, porque aqui a lista vale também para o gerente).

### Comportamento da Clint conferido no código

Arquivos em `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\` (minificados):
- **Regra** (`index-CY2O8ZFZ.js.txt`, `odn`/`hasDealViewPermission`): `settings.deal_view` ∈ `ALL_DEALS | MY_DEALS | MY_DEALS_AND_FREE`; `MY_DEALS_AND_FREE` = negócio sem dono ou meu; `MY_DEALS` = só meu; administrador passa por cima; nas Visualizações, a regra é aplicada **por origem** (`buildMergedStagesClause`).
- **Listas** (`index-mZOMjQAe.js.txt` `Ps`; `index-CY2O8ZFZ.js.txt` `ewe`/`dH`): `origin.permissions` e `origin_group.permissions` são listas de ids ou `null`; salvar grava `null` quando vazia; para quem não é administrador, a origem aparece se (lista da origem nula **e** a do grupo o inclui) ou (a da origem o inclui) ou (as duas nulas). A lista da origem **sobrepõe** a do grupo. A origem escondida simplesmente não aparece.
- **Aviso** (`index-BKc3FRy4.js.txt`, `kc`): origem fora da lista → snack "Você não tem permissão para acessar essa origem." e redirect para `/origin`; origem ok mas `deal_view` barra → modal "Dono do negócio" com "Atenção! Esse negócio pertence a outro dono." e "Voltar para listagem de negócios".
- **Dono** (`index-BKc3FRy4.js.txt`): o seletor de dono fica desligado quando não é administrador, o negócio é de outro, a regra não é `ALL_DEALS` e falta `DEAL_CHANGE_OWNER_ALL`.
- **Salvar** (`index-mZOMjQAe.js.txt`): a subaba tem o próprio Salvar na Clint; aqui vale o **Salvar único** da 1F (decisão F13 da 1F, 01-013). No grupo, a seção entra na janela "Configurações do grupo" da 1B, com o Salvar dela.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Dois PRs.** A = Tasks 1 a 3 (regras puras, 9010, provas); B = Tasks 4 a 9 (rotas, seletor, subaba, grupo, aviso, dono). O B nasce da `main` depois do merge do A | Q1; o A publica sem efeito visível e deixa a prova rodando em produção |
| N2 | **`settings.escale_visualizacao`** ∈ `all \| own \| own_and_unassigned` (os mesmos valores de `visibility_mode`); ausente = a regra da organização; a regra em vigor = `coalesce(origem, organização, 'own_and_unassigned')`, calculada por `fn_escale_visualizacao_da_origem` no banco e por `regraEmVigor` na tela | Q2 |
| N3 | **`settings.escale_pessoas`** na origem e no grupo: lista de `user_id` (uuid) sem repetição, até 200; ausente ou vazia = sem restrição; a leitura é tolerante (lixo = sem lista). `crm_pipeline_groups` ganha a coluna `settings jsonb not null default '{}'` | Q3, Q6; Clint |
| N4 | **Quem tem acesso à origem:** administrador da plataforma → sim; sem papel na organização → não; `admin` → sim; senão, a lista da origem se não for vazia, senão a do grupo; lista vazia → sim; senão `auth.uid()` na lista. **Quem vê o grupo:** admin; ou a lista do grupo permite; ou alguma origem do grupo tem lista própria que o inclui (senão a origem ficaria órfã no painel) | Q4, Q6; Clint (`ewe`/`dH`) |
| N5 | **`fn_escale_pode_ver_negocio(org, dono, origem)`**: platform admin → sim; sem papel → não; sem acesso à origem → não; viewer/gerente/admin → sim; dono = eu → sim; regra `all` → sim; `own_and_unassigned` → sem dono; senão não. **`fn_can_view_lead` não muda** | É a `fn_can_view_lead` (0036) com a origem no meio; a regra continua só para o agente (Q4) |
| N6 | **Nove policies recriadas** na 9010, com o texto de origem e só a função trocada: `crm_leads_select/insert/update/delete` (0529), `crm_lead_activities_select`, `crm_lead_links_select` (0042), `crm_pipelines_select`, `crm_stages_select` (0030) e `crm_pipeline_groups_select` (9001, do fork). `crm_pipeline_view_origens_select` não muda: a página da Visualização já descarta as origens que `lerOrigens` não devolveu | Q5; a RLS de `crm_pipelines` é o que Visualizações (9003) e filtros salvos (9004) seguem |
| N7 | **Risco de sincronização assumido** (PRD §11): uma migration futura do Rafael que recrie uma dessas policies apaga a regra por origem em silêncio. A defesa é a prova `tests/invariants/escale-acesso-por-origem-rls.test.ts` | Mitigação do PRD |
| N8 | **Gatilho `trg_escale_dono_padrao_na_origem`** (`before insert` em `crm_leads`, definer, `exception → raise warning`): com `auth.uid()` presente, papel `agent`, sem dono humano nem agente de IA e regra em vigor `own`, grava `owner_user_id = auth.uid()`, `owner_kind = 'user'`, `assigned_at = now()`. Roda depois do `trg_crm_lead_nasce_na_carteira` (ordem alfabética), então respeita a carteira | Q8 |
| N9 | **1H (9008), se já estiver na `main`:** a 9010 recria `crm_notas_do_negocio_select` com a função nova, num bloco `do` condicionado a `to_regclass`. Se a 9010 chegar primeiro, o plano da 1H deve usar `fn_escale_pode_ver_negocio` na policy da nota (avisar a sessão da 1H) | As notas são "vistas por quem vê o negócio" |
| N10 | **As rotas leem a regra da organização** com `createAdminClient()` em `organizations.settings->>'visibility_mode'` (precedente: `POST /api/v1/leads`), num helper `lib/escale/acesso/modo-da-organizacao.ts`; falhou a leitura, vale `DEFAULT_VISIBILITY_MODE` e um `logger.error` | Q10 |
| N11 | **Rotas:** `gerais` ganha `visualizacao` (obrigatório no patch de gerais); seção nova `permissoes: { pessoas: uuid[] }` na origem; `pessoas: uuid[]` no PATCH do grupo; cada pessoa precisa ser membro ativo (`accepted_at` não nulo, `revoked_at` nulo), lido com a sessão em `user_organizations`; fora disso, 422 "Este usuário não faz parte da equipe." Gerente ou acima grava (é quem abre as duas janelas) | PRD §5 |
| N12 | **Tela da origem:** o seletor mostra a regra em vigor e salvar grava a escolhida (sem "seguir a organização"); a subaba tem a descrição (a variante "segue as permissões do grupo" quando o grupo tem lista), a ajuda nossa, contador, tabela, paginação de 10 e o seletor com busca que some quando todos estão na lista; o ✕ tira sem confirmação (como a Clint); tudo no rascunho da 1F, gravado pelo Salvar único | Q12; código `Ps` |
| N13 | **Membros listados:** `useTeamMembers` (gerente+), filtrando `accepted_at && !revoked_at`, como a janela da Visualização (1C). Administradores aparecem na lista (a Clint lista todos), e a linha de ajuda explica que eles sempre veem | N4 |
| N14 | **Ficha (1G):** `DonoDaFicha` lê a origem do cache do quadro (`useBoard(pipelineId).data?.pipeline.settings`) e a regra da organização de `useActiveOrg()`; `podeTrocarDono({ papel, regra })` = gerente+ ou regra `all`; senão o botão fica desligado com "As permissões de usuários não permitem você trocar de dono" | Q7; Clint |
| N15 | **Fora da fase:** validação com a distribuição (Q9, 1K); as opções do filtro "Dono" do quadro (1D) reduzidas sob `own`/`own_and_unassigned` (a RLS já faz o resultado bater); `crm_tasks`, `crm_proposals` e `contacts` continuam por organização (o original é assim); conversas (Q11) | — |
| N16 | **Aviso da ficha (Q5):** a página `app/app/negocios/[id]` lê o negócio com a sessão; se não vier, relê com o service role (negócio, origem e grupo da organização da sessão) e decide com o espelho TypeScript (`avisoDaFicha`): sem acesso à origem → `redirect("/app/escale/negocios?aviso=origem-sem-acesso")`, e o quadro mostra o toast da Clint; com acesso mas negócio escondido pela regra → a janela "Dono do negócio"; qualquer outro caso → 404. A leitura com service role não devolve nada do negócio à tela: só decide o aviso | Clint (`kc`) |
| G1 | **Verificação enxuta** (aprovada em 17/10). Ver "Verificação" | Política em vigor |

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- **Base do PR A:** `escale-crm/main` com a 1F mergeada (`components/escale/configuracoes/SecaoGerais.tsx` e `lib/escale/configuracoes/gravar.ts` existem). A Task 1 prova.
- **Migration:** só o PR A, a **9010** (`supabase/migrations/20261025120000_9010_acesso_por_origem.sql`). A 9008 está reservada pela 1H e a 9009 pela 1I (planos de 17/10); a série 91xx é da Frente B. A Task 2 confere com `bash scripts/checar-colisao-de-migration.sh escale-crm/main`: se a 9010 já existir em outra branch, PARE e pergunte; se a `main` já tiver uma 90xx maior, troque o número e o timestamp em todos os lugares.
- **Branches:** PR A `feat/fase-1j-acesso-banco`; PR B `feat/fase-1j-acesso-tela`, criada da `escale-crm/main` **depois** do merge do PR A (a Task 4 prova).
- **Convivência com a 1H e a 1I**, que correm ao mesmo tempo:
  - os três mexem em `lib/i18n/dicionario.ts` (bloco antes da mesma âncora) e `supabase/baseline.sql` (bloco antes da mesma âncora);
  - antes de abrir cada PR, `git fetch escale-crm && git rebase escale-crm/main`; no conflito, **mantenha os dois blocos** (o que já está na `main` primeiro);
  - **a sessão da 1H trabalha em `repo/`**: esta fase roda numa worktree própria (`wt-1j`, Task 1);
  - a 1I muda `components/escale/configuracoes/JanelaDaOrigem.tsx` (a aba "Etapas e atividades"); esta fase muda o mesmo arquivo em duas linhas (o item `permissoes` do menu e o `case`). No rebase, mantenha as duas mudanças;
  - a 1H muda `components/escale/negocio/CabecalhoDaFicha.tsx`; esta fase não o toca (o `DonoDaFicha` lê o quadro sozinho, N14).
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:** push em `origin` (Rafael), merge, tag, release, VPS e gravar no banco de produção.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` só no PR A (Tasks 2 e 3). Precisa do Docker: se `docker info` falhar, PARE e peça ao usuário.
- A worktree nova precisa de `corepack pnpm install --frozen-lockfile` uma vez (Task 1).

### Onde o fork entra nos arquivos do original

| Arquivo | Mudança |
|---|---|
| `supabase/baseline.sql` | o bloco da 9010, idêntico à migration, logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (Task 2) |
| `lib/i18n/dicionario.ts` | bloco novo logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───` (Task 9) |
| `app/app/pipelines/[id]/_client.tsx` | um `useEffect` de 8 linhas marcado `FORK ESCALE · Fase 1J` (o toast do aviso), ao lado dos encaixes da 1E que já existem (Task 8) |

**Policies do original recriadas pela 9010** (N6): `crm_leads_select`, `crm_leads_insert`, `crm_leads_update`, `crm_leads_delete`, `crm_lead_activities_select`, `crm_lead_links_select`, `crm_pipelines_select`, `crm_stages_select`. Os do fork que mudam: `lib/escale/configuracoes/{tipos,gravar,montar,respostas,rascunho}.ts`, `lib/escale/origens/{ler-origens,regras}.ts`, `app/api/v1/pipelines/[id]/configuracoes/route.ts`, `app/api/v1/pipeline-groups/[id]/route.ts`, `app/app/escale/negocios/route.ts`, `app/app/negocios/[id]/page.tsx`, `components/escale/configuracoes/{JanelaDaOrigem,SecaoGerais}.tsx`, `components/escale/origens/JanelasDoGrupo.tsx`, `components/escale/negocio/DonoDaFicha.tsx`.

### Testes de fases anteriores que esta fase muda de propósito

| Teste | O que pinava | Por quê muda |
|---|---|---|
| `tests/unit/escale-secao-gerais.test.tsx` (81–87) | o combobox "Visualização de negócios" com `aria-disabled` | Task 5: vira um seletor de verdade |
| `tests/unit/escale-configuracoes-rota.test.ts` ("a visualização padrão", ~155–160) | `visualizacao` sempre `own_and_unassigned` | Task 4: o GET devolve a regra em vigor |
| Fixtures `ConfiguracoesDaOrigem` em `escale-secao-{gerais,alerta,campos,motivos}.test.tsx`, `escale-janela-da-origem.test.tsx`, `escale-configuracoes-gravar.test.ts` | `fork` sem `visualizacao`/`pessoas`; sem `visualizacaoDaOrganizacao`/`pessoasDoGrupo` | Task 4 acrescenta os campos (typecheck) |
| `tests/unit/escale-ficha-rotas.test.ts` | negócio que a sessão não lê → `NOT_FOUND` | Task 8: passa a ser 404 só quando o service role também não acha; senão, aviso ou janela |
| `tests/invariants/gov-5c-lead-scope.test.ts`, `gov-5e-lead-children-scope.test.ts` | a regra da organização em `crm_leads` | **Não mudam**: com a origem sem valor, a regra em vigor é a da organização. A Task 3 roda os dois para provar |

### Cercas que precisam ficar verdes

- `controle-decorativo`: todo botão desligado tem `title`.
- `tailwind-tokens` e `escale-casca-tokens`: cores só por token da casca; nenhum hex novo em `className`.
- `vocabulario-do-funil`: nenhum "pipeline"/"kanban" em texto de JSX.
- `evidencia-citada`: este plano, copiado para o repositório, não cita imagem entre crases nem em link.
- `escale-casca-v2-original-intacto`: as peças do shell do original não importam `@/components/escale/`.
- `selecao-longa-tem-busca`: as listas de pessoas usam `SeletorDaCasca`/`SeletorMultiploDaCasca`, nunca `<select>`.
- `i18n-espanhol-cobre-a-tela` e `escale-espanhol-registro-tu`: todo `t("…")` novo tem espanhol, em "tú" (Task 9).
- `manifest-x-migrations`: a 9010 tem a linha `-- manifest:`; o `MANIFEST.md` não muda.
- `rls-completude-varredura`: sem tabela nova, nada entra em `PROVA_PROPRIA`. Se a varredura passar a cobrir policies recriadas, siga a mensagem dela.
- `navegacao-completude`: `/app/escale/negocios` continua Route Handler (só redireciona).
- `baseline-*` e `apendice-do-baseline-*`: o bloco é byte a byte igual à migration.

### Verificação (G1 — aprovada em 17/10)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit tests/invariants lib app components --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os de `tests/unit` com `corepack pnpm vitest run <arquivos>`. Typecheck: `corepack pnpm typecheck`. Eslint: `corepack pnpm eslint <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db`:** a Task 2 roda os dois `gov-5*`; a Task 3 roda o arquivo novo mais `escale-visualizacoes-rls`, `escale-filtros-salvos-rls` e `escale-grupos-de-funis-rls`, e depois a rodada cheia do `test:db`.
3. **Revisor (subagente) só** na Task 2 (migration e policies: `security-reviewer` e `database-reviewer`), na Task 4 e na Task 7 (rotas que gravam listas) e na Task 8 (a página lê com service role). As outras são checadas pelo controlador, lendo o diff.
4. **Uma rodada cheia por PR**, no fim (Tasks 3 e 9), em segundo plano, comparada com `.superpowers/sdd/falhas-conhecidas.txt`.
5. **Conferência visual** só no fim do PR B, contra os prints F01 e F03, com a lista escrita das diferenças que sobram (as telas sem print: registre o que foi seguido do código).

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório no PR A (Task 1).
- Todo texto de tela por `t()` com literal; nunca `t(variavel)`.

## Arquivos

| Arquivo | Novo/alterado | PR | Responsabilidade |
|---|---|---|---|
| `lib/escale/acesso/regras.ts` | novo | A | chaves, leitura tolerante, `regraEmVigor`, `temAcessoAOrigem`, `temAcessoAoGrupo`, `podeVerNegocio`, `podeTrocarDono`, `avisoDaFicha` (espelho do SQL para a tela, a página e os testes) |
| `supabase/migrations/20261025120000_9010_acesso_por_origem.sql`, `supabase/baseline.sql` | novo / bloco | A | coluna do grupo, funções, policies recriadas, gatilho |
| `tests/unit/escale-acesso-regras.test.ts`, `tests/unit/escale-acesso-por-origem-migration.test.ts`, `tests/invariants/escale-acesso-por-origem-rls.test.ts` | novos | A | regras, forma do SQL, prova no Postgres |
| `lib/escale/acesso/modo-da-organizacao.ts`, `lib/escale/acesso/membros.ts` | novos | B | a regra da organização (service role) e os membros ativos (sessão) |
| `lib/escale/configuracoes/tipos.ts`, `gravar.ts`, `montar.ts`, `respostas.ts`, `rascunho.ts` | alterados | B | `fork.visualizacao`, `fork.pessoas`, `visualizacaoDaOrganizacao`, `pessoasDoGrupo`, a seção `permissoes` |
| `app/api/v1/pipelines/[id]/configuracoes/route.ts` | alterado | B | lê a regra da organização; valida os membros |
| `components/escale/configuracoes/SecaoGerais.tsx` | alterado | B | o seletor de verdade |
| `components/escale/configuracoes/ListaDePessoas.tsx`, `SecaoPermissoes.tsx` | novos | B | a tabela com ✕, paginação e seletor; a subaba |
| `components/escale/configuracoes/JanelaDaOrigem.tsx` | alterado | B | o item do menu e o `case` |
| `lib/escale/origens/regras.ts`, `ler-origens.ts`, `app/api/v1/pipeline-groups/[id]/route.ts`, `components/escale/origens/JanelasDoGrupo.tsx` | alterados | B | a lista do grupo: leitura, gravação e a seção na janela do grupo |
| `components/escale/negocio/AvisoDeOutroDono.tsx` | novo | B | a janela "Dono do negócio" |
| `app/app/negocios/[id]/page.tsx`, `app/app/escale/negocios/route.ts`, `app/app/pipelines/[id]/_client.tsx` | alterados | B | o aviso e o retorno à lista |
| `components/escale/negocio/DonoDaFicha.tsx` | alterado | B | desligado sob "só os seus" |
| `lib/i18n/dicionario.ts` | alterado | B | espanhol |
| Testes: `escale-configuracoes-rota.test.ts`, `escale-secao-gerais.test.tsx`, `escale-grupos-de-funis-rotas.test.ts`, `escale-ficha-rotas.test.ts`, `escale-ficha-status-e-dono.test.tsx` (alterados); `escale-secao-permissoes.test.tsx`, `escale-janela-do-grupo-permissoes.test.tsx` (novos) | | B | |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md` | alterado (fora do repositório) | A e B | a linha da 1J na seção 8; a pergunta 6 da seção 10 respondida; D12 ganha "e por grupo" |

---

# PR A — O banco

### Task 1: Worktree, branch, plano no repositório e as regras puras do acesso

**Files:**
- Create: `lib/escale/acesso/regras.ts`, `tests/unit/escale-acesso-regras.test.ts`, `docs/superpowers/plans/2026-10-17-fase-1j-acesso-por-origem.md` (cópia)

**Interfaces:**
- Consumes: `VisibilityMode`, `DEFAULT_VISIBILITY_MODE`, `Role` de `@/lib/auth/types`.
- Produces: `CHAVE_DA_VISUALIZACAO = "escale_visualizacao"`, `CHAVE_DAS_PESSOAS = "escale_pessoas"`, `PESSOAS_MAX = 200`, `VISUALIZACOES` (`["all", "own", "own_and_unassigned"] as const`), `visualizacaoDaOrigem(settings): VisibilityMode | null`, `pessoasDaOrigem(settings): string[]` (serve para o grupo também), `regraEmVigor(settings, daOrganizacao): VisibilityMode`, `listaPermite(pessoas, userId): boolean`, `temAcessoAOrigem({ papel, userId, pessoas, pessoasDoGrupo }): boolean`, `temAcessoAoGrupo({ papel, userId, pessoasDoGrupo, listasDasOrigens }): boolean`, `podeVerNegocio({ papel, userId, donoUserId, regra, pessoas, pessoasDoGrupo }): boolean`, `podeTrocarDono({ papel, regra }): boolean`, `ehGerenteOuAcima(papel)`, `avisoDaFicha({ papel, userId, donoUserId, settingsDaOrigem, settingsDoGrupo, modoDaOrganizacao }): "origem" | "outro_dono" | null`.

- [ ] **Step 1: A worktree, a branch e a cópia do plano**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:components/escale/configuracoes/SecaoGerais.tsx && echo "1F ok"
git cat-file -e escale-crm/main:lib/escale/configuracoes/gravar.ts && echo "gravar ok"
git worktree add -b feat/fase-1j-acesso-banco "../wt-1j" escale-crm/main
cd "../wt-1j"
corepack pnpm install --frozen-lockfile
mkdir -p docs/superpowers/plans
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-17-fase-1j-acesso-por-origem.md" docs/superpowers/plans/
```
Expected: `1F ok`, `gravar ok`, worktree criada. Senão, PARE. **Daqui até o fim do PR A, todo comando roda em `C:\Documentos\projetos claude\Deskcom CRM\wt-1j`.** Se `test:db` reclamar de variável faltando, copie os `.env*` de `repo/` para `wt-1j/` (não são versionados).

- [ ] **Step 2: O teste das regras (vai falhar)**

Create `tests/unit/escale-acesso-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  CHAVE_DA_VISUALIZACAO,
  CHAVE_DAS_PESSOAS,
  VISUALIZACOES,
  avisoDaFicha,
  pessoasDaOrigem,
  podeTrocarDono,
  podeVerNegocio,
  regraEmVigor,
  temAcessoAOrigem,
  temAcessoAoGrupo,
  visualizacaoDaOrigem,
} from "@/lib/escale/acesso/regras";

const EU = "11111111-1111-4111-8111-111111111111";
const OUTRO = "22222222-2222-4222-8222-222222222222";

describe("as chaves e a leitura tolerante", () => {
  it("as chaves e a ordem do seletor da Clint", () => {
    expect(CHAVE_DA_VISUALIZACAO).toBe("escale_visualizacao");
    expect(CHAVE_DAS_PESSOAS).toBe("escale_pessoas");
    expect(VISUALIZACOES).toEqual(["all", "own", "own_and_unassigned"]);
  });

  it("lê a regra da origem; lixo vira sem regra", () => {
    expect(visualizacaoDaOrigem({ escale_visualizacao: "own" })).toBe("own");
    expect(visualizacaoDaOrigem({ escale_visualizacao: "ALL_DEALS" })).toBeNull();
    expect(visualizacaoDaOrigem(null)).toBeNull();
  });

  it("lê a lista de pessoas: só uuid, minúsculo, sem repetição; lixo vira lista vazia", () => {
    expect(pessoasDaOrigem({ escale_pessoas: [EU, EU.toUpperCase(), OUTRO, "lixo", 3] })).toEqual([EU, OUTRO]);
    expect(pessoasDaOrigem({ escale_pessoas: "x" })).toEqual([]);
    expect(pessoasDaOrigem({})).toEqual([]);
  });

  it("a regra em vigor: origem, senão organização, senão o padrão", () => {
    expect(regraEmVigor({ escale_visualizacao: "all" }, "own")).toBe("all");
    expect(regraEmVigor({}, "own")).toBe("own");
    expect(regraEmVigor({}, null)).toBe("own_and_unassigned");
  });
});

describe("quem tem acesso à origem (N4): só admin passa por cima; a lista da origem vence a do grupo", () => {
  it("admin sempre; gerente, agente e viewer seguem a lista", () => {
    expect(temAcessoAOrigem({ papel: "admin", userId: EU, pessoas: [OUTRO], pessoasDoGrupo: [] })).toBe(true);
    expect(temAcessoAOrigem({ papel: "manager", userId: EU, pessoas: [OUTRO], pessoasDoGrupo: [] })).toBe(false);
    expect(temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [EU], pessoasDoGrupo: [] })).toBe(true);
    expect(temAcessoAOrigem({ papel: "viewer", userId: EU, pessoas: [OUTRO], pessoasDoGrupo: [] })).toBe(false);
    expect(temAcessoAOrigem({ papel: null, userId: EU, pessoas: [], pessoasDoGrupo: [] })).toBe(false);
  });

  it("sem lista na origem, vale a do grupo; sem as duas, todos", () => {
    expect(temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [], pessoasDoGrupo: [] })).toBe(true);
    expect(temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [], pessoasDoGrupo: [OUTRO] })).toBe(false);
    expect(temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [], pessoasDoGrupo: [EU] })).toBe(true);
    // A lista própria SOBREPÕE a do grupo (Clint `ewe`/`dH`).
    expect(temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [EU], pessoasDoGrupo: [OUTRO] })).toBe(true);
    expect(temAcessoAOrigem({ papel: "agent", userId: EU, pessoas: [OUTRO], pessoasDoGrupo: [EU] })).toBe(false);
  });

  it("o grupo: a lista dele, ou alguma origem dele com lista própria que me inclua", () => {
    expect(temAcessoAoGrupo({ papel: "agent", userId: EU, pessoasDoGrupo: [], listasDasOrigens: [] })).toBe(true);
    expect(temAcessoAoGrupo({ papel: "agent", userId: EU, pessoasDoGrupo: [OUTRO], listasDasOrigens: [] })).toBe(false);
    expect(temAcessoAoGrupo({ papel: "agent", userId: EU, pessoasDoGrupo: [OUTRO], listasDasOrigens: [[EU]] })).toBe(true);
    expect(temAcessoAoGrupo({ papel: "admin", userId: EU, pessoasDoGrupo: [OUTRO], listasDasOrigens: [] })).toBe(true);
  });
});

describe("quem vê o negócio (N5, o espelho do SQL)", () => {
  const base = { userId: EU, pessoas: [] as string[], pessoasDoGrupo: [] as string[] };
  it("sem acesso à origem, ninguém abaixo de admin vê", () => {
    expect(podeVerNegocio({ ...base, papel: "manager", donoUserId: OUTRO, regra: "all", pessoas: [OUTRO] })).toBe(false);
    expect(podeVerNegocio({ ...base, papel: "admin", donoUserId: OUTRO, regra: "own", pessoas: [OUTRO] })).toBe(true);
  });
  it("viewer, gerente e admin veem tudo da origem; o agente segue a regra", () => {
    expect(podeVerNegocio({ ...base, papel: "viewer", donoUserId: OUTRO, regra: "own" })).toBe(true);
    expect(podeVerNegocio({ ...base, papel: "manager", donoUserId: OUTRO, regra: "own" })).toBe(true);
    expect(podeVerNegocio({ ...base, papel: "agent", donoUserId: EU, regra: "own" })).toBe(true);
    expect(podeVerNegocio({ ...base, papel: "agent", donoUserId: OUTRO, regra: "own" })).toBe(false);
    expect(podeVerNegocio({ ...base, papel: "agent", donoUserId: null, regra: "own" })).toBe(false);
    expect(podeVerNegocio({ ...base, papel: "agent", donoUserId: null, regra: "own_and_unassigned" })).toBe(true);
    expect(podeVerNegocio({ ...base, papel: "agent", donoUserId: OUTRO, regra: "own_and_unassigned" })).toBe(false);
    expect(podeVerNegocio({ ...base, papel: "agent", donoUserId: OUTRO, regra: "all" })).toBe(true);
    expect(podeVerNegocio({ ...base, papel: null, donoUserId: EU, regra: "all" })).toBe(false);
  });
});

describe("quem troca o dono (N14)", () => {
  it("gerente+ sempre; abaixo disso só com a regra 'todos'", () => {
    expect(podeTrocarDono({ papel: "manager", regra: "own" })).toBe(true);
    expect(podeTrocarDono({ papel: "agent", regra: "all" })).toBe(true);
    expect(podeTrocarDono({ papel: "agent", regra: "own" })).toBe(false);
  });
});

describe("o aviso da ficha (N16)", () => {
  const base = { papel: "agent" as const, userId: EU, settingsDoGrupo: {}, modoDaOrganizacao: "own_and_unassigned" as const };
  it("sem acesso à origem → 'origem'; negócio de outro sob a regra → 'outro_dono'; visível → null", () => {
    expect(avisoDaFicha({ ...base, donoUserId: EU, settingsDaOrigem: { escale_pessoas: [OUTRO] } })).toBe("origem");
    expect(avisoDaFicha({ ...base, donoUserId: OUTRO, settingsDaOrigem: {} })).toBe("outro_dono");
    expect(avisoDaFicha({ ...base, donoUserId: null, settingsDaOrigem: {} })).toBeNull();
    expect(avisoDaFicha({ ...base, donoUserId: OUTRO, settingsDaOrigem: {}, settingsDoGrupo: { escale_pessoas: [OUTRO] } })).toBe("origem");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-acesso-regras.test.ts`
Expected: FAIL (o módulo não existe).

- [ ] **Step 4: As regras**

Create `lib/escale/acesso/regras.ts`:

```ts
import { DEFAULT_VISIBILITY_MODE, type Role, type VisibilityMode } from "@/lib/auth/types";

/**
 * ACESSO POR ORIGEM (fork Escale, Fase 1J; D11 e D12 do PRD de Negócios).
 *
 * A origem guarda, no mesmo `crm_pipelines.settings` da 1F, a regra de quem vê
 * os negócios (`escale_visualizacao`, os valores de `visibility_mode`) e a
 * lista de pessoas com acesso (`escale_pessoas`, ids). O grupo guarda a sua
 * lista em `crm_pipeline_groups.settings.escale_pessoas`: a origem sem lista
 * própria segue a do grupo (Clint). Quem DECIDE é o banco (migration 9010);
 * este módulo é o espelho em TypeScript, para a tela desligar o que o banco
 * recusaria, para a página da ficha escolher o aviso e para os testes.
 * Toda leitura é tolerante: lixo vira "sem regra" / "sem lista".
 */
export const CHAVE_DA_VISUALIZACAO = "escale_visualizacao";
export const CHAVE_DAS_PESSOAS = "escale_pessoas";
export const PESSOAS_MAX = 200;

/** A ordem do seletor da Clint (print F03): todos, apenas seus, seus e sem dono. */
export const VISUALIZACOES = ["all", "own", "own_and_unassigned"] as const satisfies readonly VisibilityMode[];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function comoRecord(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

export function visualizacaoDaOrigem(settings: unknown): VisibilityMode | null {
  const bruta = comoRecord(settings)[CHAVE_DA_VISUALIZACAO];
  return typeof bruta === "string" && (VISUALIZACOES as readonly string[]).includes(bruta)
    ? (bruta as VisibilityMode)
    : null;
}

/** A lista da origem ou a do grupo: o mesmo desenho nos dois `settings`. */
export function pessoasDaOrigem(settings: unknown): string[] {
  const bruta = comoRecord(settings)[CHAVE_DAS_PESSOAS];
  if (!Array.isArray(bruta)) return [];
  const vistas = new Set<string>();
  for (const x of bruta) if (typeof x === "string" && UUID.test(x)) vistas.add(x.toLowerCase());
  return [...vistas];
}

/** A da origem; sem ela, a da organização; sem as duas, o padrão do original. */
export function regraEmVigor(settings: unknown, daOrganizacao: VisibilityMode | null | undefined): VisibilityMode {
  return visualizacaoDaOrigem(settings) ?? daOrganizacao ?? DEFAULT_VISIBILITY_MODE;
}

export function ehGerenteOuAcima(papel: Role | null | undefined): boolean {
  return papel === "manager" || papel === "admin";
}

/** Lista vazia = sem restrição; senão a pessoa precisa estar nela. */
export function listaPermite(pessoas: readonly string[], userId: string): boolean {
  return pessoas.length === 0 || pessoas.includes(userId.toLowerCase());
}

/** `fn_escale_tem_acesso_a_origem` (9010): só admin passa por cima (Q4); a lista da origem vence a do grupo (Q6). */
export function temAcessoAOrigem(args: {
  papel: Role | null | undefined;
  userId: string;
  pessoas: readonly string[];
  pessoasDoGrupo: readonly string[];
}): boolean {
  if (!args.papel) return false;
  if (args.papel === "admin") return true;
  return args.pessoas.length > 0
    ? listaPermite(args.pessoas, args.userId)
    : listaPermite(args.pessoasDoGrupo, args.userId);
}

/** `fn_escale_tem_acesso_ao_grupo` (9010): a lista do grupo, ou uma origem dele com lista própria que me inclua. */
export function temAcessoAoGrupo(args: {
  papel: Role | null | undefined;
  userId: string;
  pessoasDoGrupo: readonly string[];
  listasDasOrigens: ReadonlyArray<readonly string[]>;
}): boolean {
  if (!args.papel) return false;
  if (args.papel === "admin") return true;
  if (listaPermite(args.pessoasDoGrupo, args.userId)) return true;
  return args.listasDasOrigens.some((l) => l.length > 0 && listaPermite(l, args.userId));
}

/** O espelho de `fn_escale_pode_ver_negocio` (9010). */
export function podeVerNegocio(args: {
  papel: Role | null | undefined;
  userId: string;
  donoUserId: string | null;
  regra: VisibilityMode;
  pessoas: readonly string[];
  pessoasDoGrupo: readonly string[];
}): boolean {
  if (!args.papel) return false;
  if (!temAcessoAOrigem(args)) return false;
  if (args.papel !== "agent") return true;
  if (args.donoUserId === args.userId) return true;
  if (args.regra === "all") return true;
  if (args.regra === "own_and_unassigned") return args.donoUserId === null;
  return false;
}

/** A Clint desliga o seletor de dono fora de "todos" para quem não administra (N14). */
export function podeTrocarDono(args: { papel: Role | null | undefined; regra: VisibilityMode }): boolean {
  return ehGerenteOuAcima(args.papel) || args.regra === "all";
}

export type AvisoDaFicha = "origem" | "outro_dono";

/** O que a página da ficha mostra quando a sessão não lê o negócio (N16). */
export function avisoDaFicha(args: {
  papel: Role | null | undefined;
  userId: string;
  donoUserId: string | null;
  settingsDaOrigem: unknown;
  settingsDoGrupo: unknown;
  modoDaOrganizacao: VisibilityMode;
}): AvisoDaFicha | null {
  const pessoas = pessoasDaOrigem(args.settingsDaOrigem);
  const pessoasDoGrupo = pessoasDaOrigem(args.settingsDoGrupo);
  if (!temAcessoAOrigem({ papel: args.papel, userId: args.userId, pessoas, pessoasDoGrupo })) return "origem";
  const regra = regraEmVigor(args.settingsDaOrigem, args.modoDaOrganizacao);
  if (!podeVerNegocio({ ...args, regra, pessoas, pessoasDoGrupo })) return "outro_dono";
  return null;
}
```

`Role` inclui `ai_operator`, que não é usuário e nunca chega aqui com sessão; `podeVerNegocio` o trata como "vê tudo", o mesmo que o banco faz com um papel que não é `agent`.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-acesso-regras.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
corepack pnpm prettier --write lib/escale/acesso/regras.ts tests/unit/escale-acesso-regras.test.ts
git add lib/escale/acesso tests/unit/escale-acesso-regras.test.ts docs/superpowers/plans/2026-10-17-fase-1j-acesso-por-origem.md
git commit -m "feat(escale): regras do acesso por origem e por grupo (Fase 1J)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: A migration 9010, o bloco do baseline e o teste de forma

**Files:**
- Create: `supabase/migrations/20261025120000_9010_acesso_por_origem.sql`, `tests/unit/escale-acesso-por-origem-migration.test.ts`
- Modify: `supabase/baseline.sql` (bloco novo)

**Interfaces (Produces):** coluna `crm_pipeline_groups.settings jsonb not null default '{}'`; funções `public.fn_escale_lista_permite(jsonb) returns boolean`, `public.fn_escale_visualizacao_da_origem(uuid, uuid) returns text`, `public.fn_escale_tem_acesso_a_origem(uuid, uuid) returns boolean`, `public.fn_escale_tem_acesso_ao_grupo(uuid, uuid) returns boolean`, `public.fn_escale_pode_ver_negocio(uuid, uuid, uuid) returns boolean` (todas `stable security definer`, executáveis por `authenticated` e `service_role`); gatilho `trg_escale_dono_padrao_na_origem` em `crm_leads`; as nove policies recriadas (N6).

- [ ] **Step 1: Conferir a numeração**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-1j"
git ls-tree --name-only escale-crm/main supabase/migrations/ | grep "_90" | sort | tail -3
docker info > /dev/null 2>&1 && echo "docker ok"
```
Expected: a última 90xx da `main` é a 9007, 9008 ou 9009; `docker ok`. Se houver uma 9010 ou maior, troque `9010` e `20261025120000` em todos os lugares desta fase pelo próximo livre. Depois de criar o arquivo (Step 4): `bash scripts/checar-colisao-de-migration.sh escale-crm/main` precisa passar; se apontar colisão em outra branch, PARE e pergunte.

- [ ] **Step 2: O teste da forma do SQL (vai falhar)**

Create `tests/unit/escale-acesso-por-origem-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * ACESSO POR ORIGEM (fork Escale, migration 9010): a migration e o bloco do
 * baseline são o MESMO SQL, e o bloco mora depois do bloco 9007 e antes do da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261025120000_9010_acesso_por_origem.sql";
const MIGRATION_9007 = "supabase/migrations/20261022120000_9007_configuracoes_da_origem.sql";
const CABECALHO = "-- ---- FORK ESCALE · acesso por origem (migration 9010) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");
const compacto = () => ler(MIGRATION).replace(/\s+/g, " ");

describe("acesso por origem: migration 9010 e bloco do baseline", () => {
  it("a migration existe e se descreve na primeira linha", () => {
    expect(existsSync(join(RAIZ, MIGRATION))).toBe(true);
    expect(ler(MIGRATION).startsWith("-- manifest: ")).toBe(true);
  });

  it("o conteúdo da migration aparece no baseline sem uma única diferença, depois da 9007 e antes da 0323", () => {
    const migration = ler(MIGRATION);
    const baseline = ler("supabase/baseline.sql");
    expect(migration.length).toBeGreaterThan(3000);
    const de9007 = baseline.indexOf(ler(MIGRATION_9007));
    const cabecalho = baseline.indexOf(CABECALHO);
    const conteudo = baseline.indexOf(migration);
    const ancora = baseline.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(de9007).toBeGreaterThan(-1);
    expect(cabecalho).toBeGreaterThan(de9007);
    expect(conteudo).toBeGreaterThan(cabecalho);
    expect(conteudo).toBeLessThan(ancora);
  });

  it("o grupo ganha settings; as funções são definer, estáveis, com search_path fechado e executáveis só por authenticated e service_role", () => {
    const sql = compacto();
    expect(sql).toContain("alter table public.crm_pipeline_groups add column if not exists settings jsonb not null default '{}'::jsonb;");
    for (const f of [
      "fn_escale_lista_permite(p_lista jsonb)",
      "fn_escale_visualizacao_da_origem(p_org uuid, p_pipeline uuid)",
      "fn_escale_tem_acesso_a_origem(p_org uuid, p_pipeline uuid)",
      "fn_escale_tem_acesso_ao_grupo(p_org uuid, p_grupo uuid)",
      "fn_escale_pode_ver_negocio(p_org uuid, p_owner_user_id uuid, p_pipeline uuid)",
    ]) {
      expect(sql).toContain(`create or replace function public.${f}`);
    }
    expect((sql.match(/language sql stable security definer set search_path = public, pg_temp/g) ?? []).length).toBe(5);
    for (const assinatura of [
      "fn_escale_lista_permite(jsonb)",
      "fn_escale_visualizacao_da_origem(uuid, uuid)",
      "fn_escale_tem_acesso_a_origem(uuid, uuid)",
      "fn_escale_tem_acesso_ao_grupo(uuid, uuid)",
      "fn_escale_pode_ver_negocio(uuid, uuid, uuid)",
    ]) {
      expect(sql).toContain(`revoke all on function public.${assinatura} from public;`);
      expect(sql).toContain(`revoke execute on function public.${assinatura} from anon;`);
      expect(sql).toContain(`grant execute on function public.${assinatura} to authenticated, service_role;`);
    }
  });

  it("a regra em vigor é a da origem, senão a da organização, senão own_and_unassigned", () => {
    const sql = compacto();
    expect(sql).toContain("p.settings->>'escale_visualizacao'");
    expect(sql).toContain("o.settings->>'visibility_mode'");
    expect(sql).toContain("'own_and_unassigned')");
  });

  it("só admin passa por cima; a lista da origem vence a do grupo; o grupo aparece se alguma origem dele me inclui", () => {
    const sql = compacto();
    expect(sql).not.toContain("in ('manager','admin') then true");
    expect(sql).toContain("when public.fn_user_role_in_org(p_org) = 'admin' then true");
    expect(sql).toContain("then (p.settings->'escale_pessoas') ? auth.uid()::text else public.fn_escale_lista_permite(g.settings->'escale_pessoas')");
    expect(sql).toContain("left join public.crm_pipeline_groups g on g.id = p.group_id and g.organization_id = p.organization_id");
    expect(sql).toContain("exists ( select 1 from public.crm_pipelines p where p.group_id = p_grupo");
  });

  it("as nove policies são recriadas com a função nova, e fn_can_view_lead não é tocada", () => {
    const sql = compacto();
    for (const [policy, tabela] of [
      ["crm_leads_select", "crm_leads"],
      ["crm_leads_insert", "crm_leads"],
      ["crm_leads_update", "crm_leads"],
      ["crm_leads_delete", "crm_leads"],
      ["crm_lead_activities_select", "crm_lead_activities"],
      ["crm_lead_links_select", "crm_lead_links"],
      ["crm_pipelines_select", "crm_pipelines"],
      ["crm_stages_select", "crm_stages"],
      ["crm_pipeline_groups_select", "crm_pipeline_groups"],
    ]) {
      expect(sql).toContain(`drop policy if exists "${policy}" on public.${tabela};`);
      expect(sql).toContain(`create policy "${policy}" on public.${tabela}`);
    }
    expect(sql).not.toContain("fn_can_view_lead(organization_id, owner_user_id)");
    expect(sql).not.toContain("create or replace function public.fn_can_view_lead");
    expect(sql).toContain("public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)");
    expect(sql).toContain("public.fn_escale_pode_ver_negocio(l.organization_id, l.owner_user_id, l.pipeline_id)");
    expect(sql).toContain("public.fn_escale_tem_acesso_a_origem(organization_id, id)");
    expect(sql).toContain("public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id)");
    expect(sql).toContain("public.fn_escale_tem_acesso_ao_grupo(organization_id, id)");
  });

  it("o gatilho do dono padrão é before insert, definer, fechado e nunca derruba a inserção", () => {
    const sql = compacto();
    expect(sql).toContain("create trigger trg_escale_dono_padrao_na_origem before insert on public.crm_leads");
    expect(sql).toContain("revoke all on function public.fn_escale_dono_padrao_na_origem() from public, anon, authenticated;");
    expect(sql).toContain("is distinct from 'agent'");
    expect(sql).toContain("exception when others then");
  });

  it("a nota da 1H (9008) ganha a função nova só se a tabela existir", () => {
    const sql = compacto();
    expect(sql).toContain("if to_regclass('public.crm_notas_do_negocio') is not null then");
    expect(sql).toContain("create policy crm_notas_do_negocio_select on public.crm_notas_do_negocio");
    expect(sql).toContain("notify pgrst, 'reload schema';");
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-acesso-por-origem-migration.test.ts`
Expected: FAIL (a migration não existe).

- [ ] **Step 4: A migration**

Create `supabase/migrations/20261025120000_9010_acesso_por_origem.sql` (a primeira linha é UMA linha só):

```sql
-- manifest: **Acesso por origem (fork Escale, Fase 1J).** Cada origem passa a ter a sua regra de quem vê os negócios (`crm_pipelines.settings.escale_visualizacao`, os mesmos valores de `organizations.settings.visibility_mode`; ausente = a regra da organização) e a sua lista de pessoas com acesso (`settings.escale_pessoas`, ids). O grupo ganha `crm_pipeline_groups.settings` com a lista dele: a origem sem lista própria segue a do grupo; lista vazia = sem restrição; só o administrador passa por cima. Funções definer e estáveis decidem: `fn_escale_lista_permite`, `fn_escale_visualizacao_da_origem` (a regra em vigor), `fn_escale_tem_acesso_a_origem`, `fn_escale_tem_acesso_ao_grupo` e `fn_escale_pode_ver_negocio` (a `fn_can_view_lead` da 0036 com a origem no meio; a 0036 fica intacta). Nove policies recriadas com o mesmo texto e a função nova: `crm_leads` select/insert/update/delete (forma da 0529), `crm_lead_activities_select` e `crm_lead_links_select` (0042), `crm_pipelines_select` e `crm_stages_select` (0030) e `crm_pipeline_groups_select` (9001). Sem configurar nada, o resultado é idêntico ao de hoje. Um gatilho before insert em `crm_leads` põe o criador como dono quando a origem é "só os seus" (o que `POST /api/v1/leads` já faz para a regra da organização), fechado a anon/authenticated e com `exception → raise warning`. Se a 9008 (notas da 1H) já existir, a policy de leitura da nota ganha a função nova.
-- 9010: acesso por origem (fork Escale).

-- ── 0. a lista do grupo mora no settings dele (o mesmo desenho da origem) ──
alter table public.crm_pipeline_groups add column if not exists settings jsonb not null default '{}'::jsonb;

-- ── 1. lista vazia (ou ausente) libera; senão a pessoa precisa estar nela ──
create or replace function public.fn_escale_lista_permite(p_lista jsonb)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when jsonb_typeof(p_lista) = 'array' and jsonb_array_length(p_lista) > 0
      then p_lista ? auth.uid()::text
    else true
  end;
$$;

revoke all on function public.fn_escale_lista_permite(jsonb) from public;
revoke execute on function public.fn_escale_lista_permite(jsonb) from anon;
grant execute on function public.fn_escale_lista_permite(jsonb) to authenticated, service_role;

-- ── 2. a regra em vigor: a da origem, senão a da organização, senão o padrão ──
create or replace function public.fn_escale_visualizacao_da_origem(p_org uuid, p_pipeline uuid)
returns text
language sql stable security definer set search_path = public, pg_temp
as $$
  select case v
    when 'all' then 'all'
    when 'own' then 'own'
    else 'own_and_unassigned'
  end
  from (
    select coalesce(
      (select p.settings->>'escale_visualizacao'
         from public.crm_pipelines p
        where p.id = p_pipeline and p.organization_id = p_org),
      (select o.settings->>'visibility_mode'
         from public.organizations o
        where o.id = p_org),
      'own_and_unassigned') as v
  ) regra;
$$;

revoke all on function public.fn_escale_visualizacao_da_origem(uuid, uuid) from public;
revoke execute on function public.fn_escale_visualizacao_da_origem(uuid, uuid) from anon;
grant execute on function public.fn_escale_visualizacao_da_origem(uuid, uuid) to authenticated, service_role;

-- ── 3. quem tem acesso à origem: só admin passa por cima; a lista da origem vence a do grupo ──
create or replace function public.fn_escale_tem_acesso_a_origem(p_org uuid, p_pipeline uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when public.fn_is_platform_admin() then true
    when public.fn_user_role_in_org(p_org) is null then false
    when public.fn_user_role_in_org(p_org) = 'admin' then true
    else coalesce((
      select case
        when jsonb_typeof(p.settings->'escale_pessoas') = 'array'
             and jsonb_array_length(p.settings->'escale_pessoas') > 0
          then (p.settings->'escale_pessoas') ? auth.uid()::text
        else public.fn_escale_lista_permite(g.settings->'escale_pessoas')
      end
      from public.crm_pipelines p
      left join public.crm_pipeline_groups g on g.id = p.group_id and g.organization_id = p.organization_id
      where p.id = p_pipeline and p.organization_id = p_org), true)
  end;
$$;

revoke all on function public.fn_escale_tem_acesso_a_origem(uuid, uuid) from public;
revoke execute on function public.fn_escale_tem_acesso_a_origem(uuid, uuid) from anon;
grant execute on function public.fn_escale_tem_acesso_a_origem(uuid, uuid) to authenticated, service_role;

-- ── 4. quem vê o grupo: a lista dele, ou alguma origem dele com lista própria que me inclua ──
-- (senão a origem liberada ficaria órfã no painel, que monta a árvore pelos grupos)
create or replace function public.fn_escale_tem_acesso_ao_grupo(p_org uuid, p_grupo uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when public.fn_is_platform_admin() then true
    when public.fn_user_role_in_org(p_org) is null then false
    when public.fn_user_role_in_org(p_org) = 'admin' then true
    when public.fn_escale_lista_permite((
      select g.settings->'escale_pessoas'
        from public.crm_pipeline_groups g
       where g.id = p_grupo and g.organization_id = p_org)) then true
    else exists (
      select 1 from public.crm_pipelines p
       where p.group_id = p_grupo and p.organization_id = p_org
         and jsonb_typeof(p.settings->'escale_pessoas') = 'array'
         and jsonb_array_length(p.settings->'escale_pessoas') > 0
         and (p.settings->'escale_pessoas') ? auth.uid()::text)
  end;
$$;

revoke all on function public.fn_escale_tem_acesso_ao_grupo(uuid, uuid) from public;
revoke execute on function public.fn_escale_tem_acesso_ao_grupo(uuid, uuid) from anon;
grant execute on function public.fn_escale_tem_acesso_ao_grupo(uuid, uuid) to authenticated, service_role;

-- ── 5. quem vê o negócio: a fn_can_view_lead (0036) com a origem no meio ──
-- Viewer e gerente continuam vendo tudo da origem a que têm acesso (como no
-- original); o agent segue a regra em vigor DA ORIGEM. fn_can_view_lead não muda.
create or replace function public.fn_escale_pode_ver_negocio(p_org uuid, p_owner_user_id uuid, p_pipeline uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case
    when public.fn_is_platform_admin() then true
    when public.fn_user_role_in_org(p_org) is null then false
    when not public.fn_escale_tem_acesso_a_origem(p_org, p_pipeline) then false
    when public.fn_user_role_in_org(p_org) in ('viewer','manager','admin') then true
    when p_owner_user_id = auth.uid() then true
    else case public.fn_escale_visualizacao_da_origem(p_org, p_pipeline)
      when 'all' then true
      when 'own_and_unassigned' then p_owner_user_id is null
      else false
    end
  end;
$$;

revoke all on function public.fn_escale_pode_ver_negocio(uuid, uuid, uuid) from public;
revoke execute on function public.fn_escale_pode_ver_negocio(uuid, uuid, uuid) from anon;
grant execute on function public.fn_escale_pode_ver_negocio(uuid, uuid, uuid) to authenticated, service_role;

-- ── 6. as policies de crm_leads (o texto da 0529, só a função trocada) ──
drop policy if exists "crm_leads_select" on public.crm_leads;
drop policy if exists "crm_leads_insert" on public.crm_leads;
drop policy if exists "crm_leads_update" on public.crm_leads;
drop policy if exists "crm_leads_delete" on public.crm_leads;

create policy "crm_leads_select" on public.crm_leads
  for select using (
    public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)
  );

create policy "crm_leads_insert" on public.crm_leads
  for insert with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (public.fn_role_at_least(organization_id, 'manager')
             or public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)))
  );
create policy "crm_leads_update" on public.crm_leads
  for update using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (public.fn_role_at_least(organization_id, 'manager')
             or public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)))
  ) with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (public.fn_role_at_least(organization_id, 'manager')
             or public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)))
  );
create policy "crm_leads_delete" on public.crm_leads
  for delete using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (public.fn_role_at_least(organization_id, 'manager')
             or public.fn_escale_pode_ver_negocio(organization_id, owner_user_id, pipeline_id)))
  );

-- ── 7. os filhos do negócio (o texto da 0042) ──
drop policy if exists "crm_lead_activities_select" on public.crm_lead_activities;
create policy "crm_lead_activities_select" on public.crm_lead_activities
  for select using (
    exists (
      select 1 from public.crm_leads l
      where l.id = crm_lead_activities.lead_id
        and public.fn_escale_pode_ver_negocio(l.organization_id, l.owner_user_id, l.pipeline_id)
    )
  );

drop policy if exists "crm_lead_links_select" on public.crm_lead_links;
create policy "crm_lead_links_select" on public.crm_lead_links
  for select using (
    exists (
      select 1 from public.crm_leads l
      where l.id = crm_lead_links.lead_id
        and public.fn_escale_pode_ver_negocio(l.organization_id, l.owner_user_id, l.pipeline_id)
    )
  );

-- ── 8. a origem, as etapas e o grupo somem para quem não tem acesso (0030 e 9001) ──
-- É o que faz o painel Origens, o quadro, a troca rápida, as Visualizações (9003)
-- e os filtros salvos (9004) seguirem as listas: todos leem crm_pipelines pela sessão.
drop policy if exists "crm_pipelines_select" on public.crm_pipelines;
create policy "crm_pipelines_select" on public.crm_pipelines
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_escale_tem_acesso_a_origem(organization_id, id))
  );

drop policy if exists "crm_stages_select" on public.crm_stages;
create policy "crm_stages_select" on public.crm_stages
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_escale_tem_acesso_a_origem(organization_id, pipeline_id))
  );

drop policy if exists "crm_pipeline_groups_select" on public.crm_pipeline_groups;
create policy "crm_pipeline_groups_select" on public.crm_pipeline_groups
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_escale_tem_acesso_ao_grupo(organization_id, id))
  );

-- ── 9. o dono padrão em origem "só os seus" (o POST /api/v1/leads faz isso para a regra da organização) ──
create or replace function public.fn_escale_dono_padrao_na_origem()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then return new; end if;
  if new.owner_user_id is not null or new.owner_agent_id is not null then return new; end if;
  if public.fn_user_role_in_org(new.organization_id) is distinct from 'agent' then return new; end if;
  if public.fn_escale_visualizacao_da_origem(new.organization_id, new.pipeline_id) <> 'own' then return new; end if;
  new.owner_user_id := auth.uid();
  new.owner_kind := 'user';
  new.assigned_at := now();
  return new;
exception when others then
  raise warning 'fn_escale_dono_padrao_na_origem: % (%)', sqlerrm, sqlstate;
  return new;
end;
$$;

revoke all on function public.fn_escale_dono_padrao_na_origem() from public, anon, authenticated;

drop trigger if exists trg_escale_dono_padrao_na_origem on public.crm_leads;
create trigger trg_escale_dono_padrao_na_origem
  before insert on public.crm_leads
  for each row execute function public.fn_escale_dono_padrao_na_origem();

-- ── 10. a nota da 1H (migration 9008), se já estiver aqui ──
do $f$ begin
  if to_regclass('public.crm_notas_do_negocio') is not null then
    execute 'drop policy if exists crm_notas_do_negocio_select on public.crm_notas_do_negocio';
    execute $p$
      create policy crm_notas_do_negocio_select on public.crm_notas_do_negocio
        for select using (
          public.fn_is_platform_admin()
          or ((organization_id in (select public.fn_user_org_ids()))
              and exists (select 1 from public.crm_leads l
                           where l.id = crm_notas_do_negocio.lead_id
                             and l.organization_id = crm_notas_do_negocio.organization_id
                             and public.fn_escale_pode_ver_negocio(l.organization_id, l.owner_user_id, l.pipeline_id)))
        )
    $p$;
  end if;
end $f$;

comment on column public.crm_pipeline_groups.settings is
  'Configurações do grupo (fork Escale, 9010). escale_pessoas: quem tem acesso ao grupo; a origem sem lista própria segue esta.';
comment on function public.fn_escale_visualizacao_da_origem(uuid, uuid) is
  'A regra de quem vê os negócios em vigor na origem (fork Escale, 9010): settings.escale_visualizacao da origem; sem ela, organizations.settings.visibility_mode; sem as duas, own_and_unassigned.';
comment on function public.fn_escale_tem_acesso_a_origem(uuid, uuid) is
  'Quem tem acesso à origem (fork Escale, 9010): só admin passa por cima; a lista da origem (settings.escale_pessoas); sem ela, a do grupo; vazia = todos os membros. É a regra de crm_pipelines_select e crm_stages_select.';
comment on function public.fn_escale_tem_acesso_ao_grupo(uuid, uuid) is
  'Quem vê o grupo (fork Escale, 9010): admin; a lista do grupo; ou alguma origem dele com lista própria que inclua a pessoa.';
comment on function public.fn_escale_pode_ver_negocio(uuid, uuid, uuid) is
  'Quem vê o negócio (fork Escale, 9010): fn_can_view_lead (0036) com a origem: sem acesso à origem ninguém abaixo de admin vê; viewer/gerente/admin veem tudo; o agent vê o seu e, conforme a regra da origem, os sem dono ou todos.';

notify pgrst, 'reload schema';
```

- [ ] **Step 5: O bloco do baseline**

Em `supabase/baseline.sql`, logo ANTES da linha `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (e depois do último bloco `FORK ESCALE` que estiver lá), insira o cabeçalho e o conteúdo idêntico da migration:

```bash
node - <<'NODE'
const fs = require("fs");
const mig = fs.readFileSync("supabase/migrations/20261025120000_9010_acesso_por_origem.sql", "utf8");
const ARQ = "supabase/baseline.sql";
let base = fs.readFileSync(ARQ, "utf8");
const CAB = "-- ---- FORK ESCALE · acesso por origem (migration 9010) ----";
if (base.includes(CAB)) throw new Error("bloco 9010 já existe");
const ANCORA = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const i = base.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 0323 não encontrada");
const eol = base.includes("\r\n") ? "\r\n" : "\n";
const bloco = CAB + eol + mig.replace(/\r\n/g, "\n").replace(/\n/g, eol) + eol + eol;
base = base.slice(0, i) + bloco + base.slice(i);
fs.writeFileSync(ARQ, base);
console.log("bloco 9010 inserido");
NODE
bash scripts/checar-colisao-de-migration.sh escale-crm/main
corepack pnpm vitest run tests/unit/escale-acesso-por-origem-migration.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/escale-configuracoes-da-origem-migration.test.ts tests/unit/escale-grupos-de-funis-migration.test.ts
```
Expected: `bloco 9010 inserido`, nenhuma colisão, PASS nos quatro.

Confira que nenhuma das nove policies é recriada DEPOIS do bloco da 9010 no baseline (conferido em 17/10 na `main`: cada uma aparece uma vez só, muito antes do bloco do fork):

```bash
B=$(grep -n "FORK ESCALE · acesso por origem (migration 9010)" supabase/baseline.sql | cut -d: -f1)
for p in crm_leads_select crm_leads_insert crm_leads_update crm_leads_delete crm_lead_activities_select crm_lead_links_select crm_pipelines_select crm_stages_select crm_pipeline_groups_select; do
  grep -n "create policy \"$p\"\|create policy $p " supabase/baseline.sql | awk -F: -v b="$B" '$1 > b'
done
```
Expected: só as linhas DENTRO do bloco 9010 (uma por policy). Se alguma vier de fora e depois dele, PARE e pergunte: uma migration nova recriou a policy, e o bloco 9010 precisa ir para depois dela.

- [ ] **Step 6: A migration aplica num Postgres limpo e a regra da organização continua igual**

Run: `corepack pnpm test:db tests/invariants/gov-5c-lead-scope.test.ts tests/invariants/gov-5e-lead-children-scope.test.ts tests/invariants/escale-grupos-de-funis-rls.test.ts`
Expected: PASS. Prova que, sem nenhuma origem nem grupo configurados, tudo continua como hoje.

- [ ] **Step 7: Revisor (G1).** Dispare o `security-reviewer` e o `database-reviewer` com a migration e a pergunta: "alguém sem acesso à origem lê, escreve ou recebe pelo tempo real algum negócio, atividade, vínculo, etapa ou grupo dela? só o admin passa por cima? a origem sem valor se comporta exatamente como hoje? as funções definer podem ser chamadas por anon? há recursão entre as policies e as funções que leem crm_pipelines e crm_pipeline_groups?". Corrija o que for CRITICAL/HIGH.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20261025120000_9010_acesso_por_origem.sql supabase/baseline.sql tests/unit/escale-acesso-por-origem-migration.test.ts
git commit -m "feat(escale): migration 9010 — acesso por origem e por grupo na RLS (Fase 1J)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: A prova no Postgres, a rodada cheia e o PR A

**Files:**
- Create: `tests/invariants/escale-acesso-por-origem-rls.test.ts`

**Interfaces:** consome `gov-helpers` (`seedGov`, `sql`, `countAs`, `writeCountAs`, `lastLine`, `GOV_ADMIN`, `GOV_AGENT_A`, `GOV_AGENT_B`, `GOV_VIEWER`, `GOV_MANAGER`, `GOV_ORG`, `GOV_PIPELINE`).

- [ ] **Step 1: A prova**

Create `tests/invariants/escale-acesso-por-origem-rls.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_MANAGER,
  GOV_ORG,
  GOV_PIPELINE,
  GOV_VIEWER,
  countAs,
  lastLine,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * ACESSO POR ORIGEM E POR GRUPO (fork Escale, migration 9010) — prova contra
 * Postgres real. Uma organização própria (namespace e5ca1e00-9010), com os
 * membros do seedGov (A e B agentes, um viewer, um gerente, um admin), dois
 * grupos e seis origens:
 *   grupo ABERTO (sem lista):
 *     - ABERTA: sem regra nem lista → vale a regra da organização (own_and_unassigned);
 *     - TODOS:  regra 'all';
 *     - SOS:    regra 'own' + lista [A, viewer];
 *     - LISTA:  só a lista [A];
 *   grupo FECHADO (lista [A]):
 *     - SEGUE:   sem lista → segue a do grupo;
 *     - PROPRIA: lista [B] → a dela vence a do grupo.
 * Em cada origem, três negócios: da A, do B e sem dono.
 *
 * É também a defesa contra a sincronização com o original (N7 do plano): uma
 * migration futura que recrie crm_leads_select com fn_can_view_lead derruba
 * "agente A vê o do B na origem TODOS".
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const ORG = "e5ca1e00-9010-4000-8000-000000000001";
const G_ABERTO = "e5ca1e00-9010-4000-8000-000000000002";
const G_FECHADO = "e5ca1e00-9010-4000-8000-000000000003";
const P_ABERTA = "e5ca1e00-9010-4000-8000-000000000011";
const P_TODOS = "e5ca1e00-9010-4000-8000-000000000012";
const P_SOS = "e5ca1e00-9010-4000-8000-000000000013";
const P_LISTA = "e5ca1e00-9010-4000-8000-000000000014";
const P_SEGUE = "e5ca1e00-9010-4000-8000-000000000015";
const P_PROPRIA = "e5ca1e00-9010-4000-8000-000000000016";
const ETAPA = (p: string) => p.replace("-0000000000", "-0000000001");
const LEAD = (p: string, dono: "a" | "b" | "n") =>
  p.replace("-0000000000", `-00000000${dono === "a" ? "2" : dono === "b" ? "3" : "4"}0`);
const ATIVIDADE_LISTA = "e5ca1e00-9010-4000-8000-000000000099";

function comoUsuario(userId: string, script: string): string {
  return lastLine(
    sql(`
      set role authenticated;
      select set_config('request.jwt.claims', '{"sub":"${userId}"}', false);
      ${script}
    `),
  );
}

const ORIGENS = [P_ABERTA, P_TODOS, P_SOS, P_LISTA, P_SEGUE, P_PROPRIA];

beforeAll(() => {
  seedGov();
  const origem = (id: string, grupo: string, nome: string, settings: string) =>
    `('${id}', '${ORG}', '${grupo}', '${nome}', 'escale-acesso-${nome}', '${settings}'::jsonb)`;
  const etapa = (p: string) => `('${ETAPA(p)}', '${ORG}', '${p}', 'Novo', 'novo', 1000)`;
  const negocios = (p: string) =>
    `('${LEAD(p, "a")}', '${ORG}', '${p}', '${ETAPA(p)}', 'da A', '${GOV_AGENT_A}'),
     ('${LEAD(p, "b")}', '${ORG}', '${p}', '${ETAPA(p)}', 'do B', '${GOV_AGENT_B}'),
     ('${LEAD(p, "n")}', '${ORG}', '${p}', '${ETAPA(p)}', 'sem dono', null)`;
  sql(`
    insert into public.organizations (id, slug, legal_name, display_name, settings)
      values ('${ORG}', 'escale-acesso', 'Escale Acesso Org', 'Escale Acesso',
              jsonb_build_object('visibility_mode', 'own_and_unassigned'))
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at) values
      ('${GOV_AGENT_A}', '${ORG}', 'agent', now()),
      ('${GOV_AGENT_B}', '${ORG}', 'agent', now()),
      ('${GOV_VIEWER}', '${ORG}', 'viewer', now()),
      ('${GOV_MANAGER}', '${ORG}', 'manager', now()),
      ('${GOV_ADMIN}', '${ORG}', 'admin', now())
      on conflict do nothing;
    insert into public.crm_pipeline_groups (id, organization_id, name, settings) values
      ('${G_ABERTO}', '${ORG}', 'Aberto', '{}'::jsonb),
      ('${G_FECHADO}', '${ORG}', 'Fechado', '{"escale_pessoas":["${GOV_AGENT_A}"]}'::jsonb)
      on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, group_id, name, slug, settings) values
      ${origem(P_ABERTA, G_ABERTO, "aberta", "{}")},
      ${origem(P_TODOS, G_ABERTO, "todos", '{"escale_visualizacao":"all"}')},
      ${origem(P_SOS, G_ABERTO, "sos", `{"escale_visualizacao":"own","escale_pessoas":["${GOV_AGENT_A}","${GOV_VIEWER}"]}`)},
      ${origem(P_LISTA, G_ABERTO, "lista", `{"escale_pessoas":["${GOV_AGENT_A}"]}`)},
      ${origem(P_SEGUE, G_FECHADO, "segue", "{}")},
      ${origem(P_PROPRIA, G_FECHADO, "propria", `{"escale_pessoas":["${GOV_AGENT_B}"]}`)}
      on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values
      ${ORIGENS.map(etapa).join(",\n      ")}
      on conflict do nothing;
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, owner_user_id) values
      ${ORIGENS.map(negocios).join(",\n      ")}
      on conflict (id) do nothing;
    insert into public.crm_lead_activities (id, organization_id, lead_id, source_module, type, payload)
      values ('${ATIVIDADE_LISTA}', '${ORG}', '${LEAD(P_LISTA, "n")}', 'invariant', 'note', '{"note":"prova 9010"}'::jsonb)
      on conflict do nothing;
  `);
});

const ve = (user: string, lead: string) =>
  countAs(user, `select count(*) from public.crm_leads where id = '${lead}';`);
const origensVisiveis = (user: string) =>
  countAs(user, `select count(*) from public.crm_pipelines where organization_id = '${ORG}';`);

describe("a regra em vigor por origem", () => {
  it("sem valor na origem, vale a da organização (own_and_unassigned): A vê o seu e o sem dono, não o do B", () => {
    expect(ve(GOV_AGENT_A, LEAD(P_ABERTA, "a"))).toBe(1);
    expect(ve(GOV_AGENT_A, LEAD(P_ABERTA, "n"))).toBe(1);
    expect(ve(GOV_AGENT_A, LEAD(P_ABERTA, "b"))).toBe(0);
  });

  it("'todos' na origem vence a regra da organização: A vê o do B", () => {
    expect(ve(GOV_AGENT_A, LEAD(P_TODOS, "b"))).toBe(1);
  });

  it("'só os seus' na origem: A vê o seu, não o sem dono nem o do B", () => {
    expect(ve(GOV_AGENT_A, LEAD(P_SOS, "a"))).toBe(1);
    expect(ve(GOV_AGENT_A, LEAD(P_SOS, "n"))).toBe(0);
    expect(ve(GOV_AGENT_A, LEAD(P_SOS, "b"))).toBe(0);
  });

  it("a função devolve o padrão quando nem a origem nem a organização têm valor", () => {
    expect(sql(`select public.fn_escale_visualizacao_da_origem('${GOV_ORG}', '${GOV_PIPELINE}');`)).toBe(
      "own_and_unassigned",
    );
  });
});

describe("a lista de pessoas da origem (Q4: só admin passa por cima)", () => {
  it("quem não está na lista não vê NENHUM negócio da origem, nem o próprio; gerente e viewer também não", () => {
    expect(ve(GOV_AGENT_B, LEAD(P_LISTA, "n"))).toBe(0);
    expect(ve(GOV_AGENT_B, LEAD(P_LISTA, "b"))).toBe(0);
    expect(ve(GOV_VIEWER, LEAD(P_LISTA, "n"))).toBe(0);
    expect(ve(GOV_MANAGER, LEAD(P_LISTA, "n"))).toBe(0);
  });

  it("quem está na lista vê conforme a regra; admin vê tudo", () => {
    expect(ve(GOV_AGENT_A, LEAD(P_LISTA, "n"))).toBe(1);
    expect(ve(GOV_AGENT_A, LEAD(P_LISTA, "a"))).toBe(1);
    expect(countAs(GOV_ADMIN, `select count(*) from public.crm_leads where pipeline_id = '${P_LISTA}';`)).toBe(3);
  });

  it("a origem e as etapas somem para quem não tem acesso; cada um vê as suas", () => {
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_pipelines where id = '${P_LISTA}';`)).toBe(0);
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_stages where pipeline_id = '${P_LISTA}';`)).toBe(0);
    expect(origensVisiveis(GOV_ADMIN)).toBe(6);
    expect(origensVisiveis(GOV_AGENT_A)).toBe(5); // tudo menos PROPRIA
    expect(origensVisiveis(GOV_AGENT_B)).toBe(3); // ABERTA, TODOS, PROPRIA
    expect(origensVisiveis(GOV_MANAGER)).toBe(2); // ABERTA, TODOS
    expect(origensVisiveis(GOV_VIEWER)).toBe(3); // ABERTA, TODOS, SOS
  });

  it("a linha do tempo segue o negócio", () => {
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_lead_activities where id = '${ATIVIDADE_LISTA}';`)).toBe(0);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_lead_activities where id = '${ATIVIDADE_LISTA}';`)).toBe(1);
  });
});

describe("a lista do grupo (Q6: a origem sem lista segue o grupo; a própria vence)", () => {
  it("SEGUE: B e o gerente não veem a origem nem os negócios; A vê", () => {
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_pipelines where id = '${P_SEGUE}';`)).toBe(0);
    expect(ve(GOV_AGENT_B, LEAD(P_SEGUE, "b"))).toBe(0);
    expect(ve(GOV_MANAGER, LEAD(P_SEGUE, "n"))).toBe(0);
    expect(ve(GOV_AGENT_A, LEAD(P_SEGUE, "n"))).toBe(1);
  });

  it("PROPRIA: a lista da origem vence a do grupo: B vê, A não", () => {
    expect(countAs(GOV_AGENT_B, `select count(*) from public.crm_pipelines where id = '${P_PROPRIA}';`)).toBe(1);
    expect(ve(GOV_AGENT_B, LEAD(P_PROPRIA, "n"))).toBe(1);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_pipelines where id = '${P_PROPRIA}';`)).toBe(0);
  });

  it("o grupo aparece para quem a lista dele inclui, para quem alguma origem dele inclui, e para o admin; não para os outros", () => {
    const veGrupo = (u: string) => countAs(u, `select count(*) from public.crm_pipeline_groups where id = '${G_FECHADO}';`);
    expect(veGrupo(GOV_AGENT_A)).toBe(1);
    expect(veGrupo(GOV_AGENT_B)).toBe(1); // por PROPRIA
    expect(veGrupo(GOV_ADMIN)).toBe(1);
    expect(veGrupo(GOV_MANAGER)).toBe(0);
    expect(veGrupo(GOV_VIEWER)).toBe(0);
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_pipeline_groups where id = '${G_ABERTO}';`)).toBe(1);
  });
});

describe("escrita", () => {
  it("quem não está na lista não move o negócio da origem", () => {
    expect(
      writeCountAs(GOV_AGENT_B, `update public.crm_leads set title = 'x' where id = '${LEAD(P_LISTA, "b")}'`),
    ).toBe(0);
  });

  it("sob 'só os seus', o agente move o seu, mas não o passa a outra pessoa (deixaria de vê-lo)", () => {
    expect(
      writeCountAs(GOV_AGENT_A, `update public.crm_leads set title = 'meu' where id = '${LEAD(P_SOS, "a")}'`),
    ).toBe(1);
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `update public.crm_leads set owner_user_id = '${GOV_AGENT_B}', owner_kind = 'user' where id = '${LEAD(P_SOS, "a")}'`,
      ),
    ).toBe(0);
  });

  it("admin passa o negócio a quem quiser", () => {
    expect(
      writeCountAs(
        GOV_ADMIN,
        `update public.crm_leads set owner_user_id = '${GOV_AGENT_B}', owner_kind = 'user' where id = '${LEAD(P_SOS, "n")}'`,
      ),
    ).toBe(1);
  });
});

describe("o dono padrão em origem 'só os seus' (gatilho, Q8)", () => {
  it("o vendedor que cria sem dono vira o dono, e por isso continua vendo o negócio", () => {
    const criado = comoUsuario(
      GOV_AGENT_A,
      `insert into public.crm_leads (organization_id, pipeline_id, stage_id, title)
         values ('${ORG}', '${P_SOS}', '${ETAPA(P_SOS)}', 'novo da A') returning owner_user_id;`,
    );
    expect(criado).toBe(GOV_AGENT_A);
  });

  it("em origem que não é 'só os seus', o negócio nasce sem dono, como hoje", () => {
    const criado = comoUsuario(
      GOV_AGENT_A,
      `insert into public.crm_leads (organization_id, pipeline_id, stage_id, title)
         values ('${ORG}', '${P_ABERTA}', '${ETAPA(P_ABERTA)}', 'novo sem dono') returning coalesce(owner_user_id::text, 'nulo');`,
    );
    expect(criado).toBe("nulo");
  });
});
```

O INSERT em `crm_lead_activities` copia as colunas que `tests/invariants/gov-5e-lead-children-scope.test.ts` usa. Os dois INSERTs do gatilho ficam sem `contact_id`, que é o caso em que o `trg_crm_lead_nasce_na_carteira` (0622) não age. Se o `trg_escale_tags_padrao_no_contato` (9007) reclamar de algo, ele é `exception → warning` e não barra.

- [ ] **Step 2: Rodar**

Run: `corepack pnpm test:db tests/invariants/escale-acesso-por-origem-rls.test.ts tests/invariants/gov-5c-lead-scope.test.ts tests/invariants/gov-5e-lead-children-scope.test.ts tests/invariants/escale-visualizacoes-rls.test.ts tests/invariants/escale-filtros-salvos-rls.test.ts tests/invariants/escale-grupos-de-funis-rls.test.ts`
Expected: PASS em todos. Uma falha em `gov-5c`, `gov-5e` ou `escale-grupos-de-funis-rls` significa que a origem (ou o grupo) sem valor mudou de comportamento: PARE e corrija a função, não o teste.

- [ ] **Step 3: A rodada cheia (G1, em segundo plano)**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:unit > .superpowers/sdd/1j-pra-unit.log 2>&1 &
corepack pnpm test:db > .superpowers/sdd/1j-pra-db.log 2>&1 &
wait
grep -E "Tests|failed" .superpowers/sdd/1j-pra-unit.log .superpowers/sdd/1j-pra-db.log | tail -6
```
Expected: typecheck e lint limpos; nas suítes, só as falhas listadas em `.superpowers/sdd/falhas-conhecidas.txt`. Falha nova = corrigir antes do PR.

- [ ] **Step 4: O PRD e o commit**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`: na seção 4, a linha D12 passa a `Pessoas com acesso a cada origem e a cada grupo (a origem sem lista segue o grupo)`; na seção 8, o estado da 1J passa a `PR A aberto (banco); PR B em seguida (tela)`; na seção 10, a pergunta 6 vira `~~Acesso por origem (1J): …~~ **Respondida em 17/10: entra agora, em paralelo com a 1H e a 1I; a regra e as listas ficam no settings da origem e do grupo, só o administrador passa por cima, e a RLS de crm_pipelines, crm_pipeline_groups e crm_leads as aplica (plano 2026-10-17-fase-1j-acesso-por-origem.md).**`; na seção 5, a linha "Negócios da origem (1J)" passa a `Regra da origem (todos / só os seus / os seus mais sem dono, só para o agente) mais a lista de pessoas da origem (ou, sem ela, a do grupo). Só o administrador sempre vê`.

```bash
git add tests/invariants/escale-acesso-por-origem-rls.test.ts
git commit -m "test(escale): prova no Postgres do acesso por origem e por grupo (Fase 1J)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git fetch escale-crm && git rebase escale-crm/main
corepack pnpm vitest run tests/unit/escale-acesso-por-origem-migration.test.ts tests/unit/manifest-x-migrations.test.ts
git push -u escale-crm feat/fase-1j-acesso-banco
```

Abra o PR para `rgisjr/escale-crm` (base `main`) com o título `feat(escale): Fase 1J (PR A) — acesso por origem no banco` e o corpo:

```markdown
## O que muda
- Migration 9010: cada origem ganha a regra de quem vê os negócios (`settings.escale_visualizacao`) e a lista de pessoas (`settings.escale_pessoas`); o grupo ganha `settings` com a lista dele (a origem sem lista segue o grupo); só o administrador passa por cima; cinco funções definer; nove policies recriadas com a função nova (`crm_leads` ×4, `crm_lead_activities_select`, `crm_lead_links_select`, `crm_pipelines_select`, `crm_stages_select`, `crm_pipeline_groups_select`); gatilho do dono padrão em origem "só os seus".
- **Sem configurar nada, nada muda**: origem sem valor segue a regra da organização (prova: `gov-5c`, `gov-5e` e `escale-grupos-de-funis-rls` continuam verdes).
- A tela chega no PR B.

## Risco assumido
Uma migration futura do original que recrie uma dessas policies apaga a regra por origem. `tests/invariants/escale-acesso-por-origem-rls.test.ts` é o alarme.

## Como testar
`pnpm test:db tests/invariants/escale-acesso-por-origem-rls.test.ts`

Plano: `docs/superpowers/plans/2026-10-17-fase-1j-acesso-por-origem.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

PARE aqui: o merge é do usuário.

---

# PR B — As rotas e a tela

### Task 4: Branch do PR B; a rota da origem lê a regra da organização e a lista do grupo, e grava `visualizacao` e `permissoes`

**Files:**
- Create: `lib/escale/acesso/modo-da-organizacao.ts`, `lib/escale/acesso/membros.ts`
- Modify: `lib/escale/configuracoes/tipos.ts`, `gravar.ts`, `montar.ts`, `respostas.ts`, `app/api/v1/pipelines/[id]/configuracoes/route.ts`
- Test: `tests/unit/escale-configuracoes-rota.test.ts` (alterado), `tests/unit/escale-configuracoes-gravar.test.ts` (alterado)

**Interfaces:**
- Consumes: `VISUALIZACOES`, `CHAVE_DA_VISUALIZACAO`, `CHAVE_DAS_PESSOAS`, `PESSOAS_MAX`, `visualizacaoDaOrigem`, `pessoasDaOrigem`, `regraEmVigor` (Task 1).
- Produces: `modoDaOrganizacao(orgId, requestId): Promise<VisibilityMode>`; `membrosAtivos(supabase, orgId): Promise<{ ok: true; ids: string[] } | { ok: false; causa: { message: string } }>`; `ConfiguracoesDoFork` ganha `visualizacao: VisibilityMode | null` e `pessoas: string[]`; `ConfiguracoesDaOrigem` ganha `visualizacaoDaOrganizacao: VisibilityMode` e `pessoasDoGrupo: string[]` (e `visualizacao` passa a ser **a regra em vigor**); `OrigemLida.grupo: { settings: unknown } | null`; `patchDasConfiguracoesSchema.gerais.visualizacao` (obrigatório) e a seção `permissoes: { pessoas: string[] }`; `SecaoDasConfiguracoes` ganha `"permissoes"`; `aplicarConfiguracoes(settings, patch, { abertas, vivas, membros? })`.

- [ ] **Step 1: A branch do PR B**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-1j"
git status --porcelain    # Expected: vazio.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:supabase/migrations/20261025120000_9010_acesso_por_origem.sql && echo "PR A ok"
git switch -c feat/fase-1j-acesso-tela escale-crm/main
```
Expected: `PR A ok`. Senão, PARE (o PR A ainda não foi mergeado).

- [ ] **Step 2: Os testes da rota (vão falhar)**

Em `tests/unit/escale-configuracoes-rota.test.ts`:

(a) depois dos `vi.mock` que já existem, acrescente:

```ts
const acesso = vi.hoisted(() => ({
  modo: "own" as "all" | "own" | "own_and_unassigned",
  membros: ["11111111-1111-4111-8111-111111111111", "66666666-6666-4666-8666-666666666666"],
}));
vi.mock("@/lib/escale/acesso/modo-da-organizacao", () => ({
  modoDaOrganizacao: vi.fn(async () => acesso.modo),
}));
vi.mock("@/lib/escale/acesso/membros", () => ({
  membrosAtivos: vi.fn(async () => ({ ok: true, ids: acesso.membros })),
}));
const MEMBRO_2 = "66666666-6666-4666-8666-666666666666";
const NAO_MEMBRO = "77777777-7777-4777-8777-777777777777";
```

(b) em `GERAIS_VAZIO` e em todo corpo `gerais: { … }` dos dois arquivos, acrescente `visualizacao: "own_and_unassigned"`:

```bash
sed -i 's/gerais: { moeda: \([^,]*\), tags_padrao: \([^}]*\) }/gerais: { moeda: \1, tags_padrao: \2, visualizacao: "own_and_unassigned" }/g' tests/unit/escale-configuracoes-rota.test.ts tests/unit/escale-configuracoes-gravar.test.ts
grep -n "gerais: {" tests/unit/escale-configuracoes-rota.test.ts tests/unit/escale-configuracoes-gravar.test.ts | grep -v visualizacao
```
Expected: a segunda linha não imprime nada. Nos `expect(escrita?.patch).toEqual({ settings: { …, escale_moeda: "USD", escale_tags_padrao: [...] } })` que já existem, acrescente `escale_visualizacao: "own_and_unassigned"` ao objeto esperado (a seção `gerais` passa a gravar a chave sempre; N12).

(c) troque o `it("traz os campos do CRM, a moeda servida da organização e a visualização padrão", …)` por:

```ts
  it("traz os campos do CRM, a moeda servida e a regra em vigor: a da organização quando a origem não tem", async () => {
    acesso.modo = "own";
    banco();
    const { data } = await corpo(await GET(pedido("GET"), ctx(PIPE)));
    expect((data?.campos as Array<{ campo: string }>).map((c) => c.campo)).toEqual(["proposta"]);
    expect(data?.moedaDaOrganizacao).toBe("BRL");
    expect(data?.visualizacao).toBe("own");
    expect(data?.visualizacaoDaOrganizacao).toBe("own");
    expect(data?.pessoasDoGrupo).toEqual([]);
    expect(data?.fork as { visualizacao: unknown; pessoas: unknown }).toMatchObject({ visualizacao: null, pessoas: [] });
  });

  it("a regra da origem vence a da organização, e a lista de pessoas vem lida", async () => {
    acesso.modo = "own";
    banco({ settings: { ...SETTINGS, escale_visualizacao: "all", escale_pessoas: [MEMBRO_2, MEMBRO_2] } });
    const { data } = await corpo(await GET(pedido("GET"), ctx(PIPE)));
    expect(data?.visualizacao).toBe("all");
    expect(data?.visualizacaoDaOrganizacao).toBe("own");
    expect(data?.fork as { visualizacao: unknown; pessoas: unknown }).toMatchObject({ visualizacao: "all", pessoas: [MEMBRO_2] });
  });
```

(d) no `describe("PATCH …")`, acrescente:

```ts
  it("gerais grava a visualização escolhida na origem", async () => {
    const db = banco();
    const res = await PATCH(pedido("PATCH", { gerais: { moeda: null, tags_padrao: [], visualizacao: "all" } }), ctx(PIPE));
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines" && e.tipo === "update");
    expect(escrita?.patch).toEqual({ settings: { ...SETTINGS, escale_visualizacao: "all" } });
  });

  it("permissoes grava a lista de pessoas (sem repetição) e audita a seção", async () => {
    const db = banco();
    const res = await PATCH(pedido("PATCH", { permissoes: { pessoas: [MEMBRO_2, MEMBRO_2.toUpperCase()] } }), ctx(PIPE));
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines" && e.tipo === "update");
    expect(escrita?.patch).toEqual({ settings: { ...SETTINGS, escale_pessoas: [MEMBRO_2] } });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ metadata: { secoes: ["permissoes"], via: "escale" } }));
  });

  it("lista vazia apaga a chave (sem restrição)", async () => {
    const db = banco({ settings: { ...SETTINGS, escale_pessoas: [MEMBRO_2] } });
    const res = await PATCH(pedido("PATCH", { permissoes: { pessoas: [] } }), ctx(PIPE));
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipelines" && e.tipo === "update");
    expect(escrita?.patch).toEqual({ settings: { ...SETTINGS } });
  });

  it("quem não é membro ativo não entra na lista (422), e nada é gravado", async () => {
    const db = banco();
    const res = await PATCH(pedido("PATCH", { permissoes: { pessoas: [NAO_MEMBRO] } }), ctx(PIPE));
    expect(res.status).toBe(422);
    expect((await corpo(res)).error?.message).toBe("Este usuário não faz parte da equipe.");
    expect(db.escritas.filter((e) => e.table === "crm_pipelines")).toHaveLength(0);
  });

  it("gerais sem visualizacao é 422 (o campo é obrigatório no patch de gerais)", async () => {
    banco();
    expect((await PATCH(pedido("PATCH", { gerais: { moeda: null, tags_padrao: [] } }), ctx(PIPE))).status).toBe(422);
  });
```

Se o dublê `makeDb` não souber responder `crm_pipeline_groups` (a rota passa a ler o `settings` do grupo), confira em `tests/helpers/stages-db-double.ts` se há uma tabela de grupos; se não houver, a leitura do grupo cai no `readError`/vazio e `pessoasDoGrupo` vem `[]`, que é o esperado nesses testes. Se o dublê lançar, acrescente `grupos: []` ao `makeDb` conforme a forma das outras tabelas dele.

Em `tests/unit/escale-configuracoes-gravar.test.ts`, na chamada de `montarConfiguracoes` (linha ~123), troque `visualizacao: "own_and_unassigned"` por `visualizacaoDaOrganizacao: "own_and_unassigned", grupo: null`, e acrescente ao `describe("montar")`:

```ts
  it("a regra em vigor e as listas: a da origem vence; sem ela, a da organização", () => {
    expect(CONFIG.visualizacao).toBe("own_and_unassigned");
    expect(CONFIG.visualizacaoDaOrganizacao).toBe("own_and_unassigned");
    expect(CONFIG.fork.visualizacao).toBeNull();
    expect(CONFIG.fork.pessoas).toEqual([]);
    expect(CONFIG.pessoasDoGrupo).toEqual([]);
  });
```

e ao `describe` de `aplicarConfiguracoes`:

```ts
  it("permissoes: grava só membros ativos, sem repetição; lista vazia apaga a chave", () => {
    const membros = ["11111111-1111-4111-8111-111111111111"];
    const ok = aplicarConfiguracoes({}, { permissoes: { pessoas: [membros[0]!, membros[0]!] } }, { ...ETAPAS, membros });
    expect(ok).toEqual({ ok: true, settings: { escale_pessoas: membros } });
    const vazio = aplicarConfiguracoes({ escale_pessoas: membros }, { permissoes: { pessoas: [] } }, { ...ETAPAS, membros });
    expect(vazio).toEqual({ ok: true, settings: {} });
    const estranho = aplicarConfiguracoes({}, { permissoes: { pessoas: ["22222222-2222-4222-8222-222222222222"] } }, { ...ETAPAS, membros });
    expect(estranho).toEqual({ ok: false, erro: "Este usuário não faz parte da equipe." });
  });
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-configuracoes-rota.test.ts tests/unit/escale-configuracoes-gravar.test.ts`
Expected: FAIL.

- [ ] **Step 4: Os dois helpers**

Create `lib/escale/acesso/modo-da-organizacao.ts`:

```ts
import { DEFAULT_VISIBILITY_MODE, type VisibilityMode } from "@/lib/auth/types";
import { VISUALIZACOES } from "@/lib/escale/acesso/regras";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * A regra de quem vê os negócios DA ORGANIZAÇÃO (`organizations.settings.visibility_mode`).
 *
 * `authz.org.visibility_mode` só é preenchido pelo layout de `/app`; nas rotas
 * ele vem vazio, e a 1F mostrava sempre o padrão (defeito corrigido na 1J, N10).
 * Lê com o service role, como `POST /api/v1/leads`: a organização é a da
 * sessão, e a leitura não amplia acesso (a RLS de `crm_leads` lê o mesmo modo
 * e decide). Falhou a leitura, vale o padrão e fica o registro.
 */
export async function modoDaOrganizacao(orgId: string, requestId: string): Promise<VisibilityMode> {
  const { data, error } = await createAdminClient()
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle();
  if (error) {
    logger.error("escale.acesso: leitura do modo da organização falhou; vale o padrão", {
      requestId,
      orgId,
      error: error.message,
    });
    return DEFAULT_VISIBILITY_MODE;
  }
  const modo = (data?.settings as { visibility_mode?: unknown } | null)?.visibility_mode;
  return typeof modo === "string" && (VISUALIZACOES as readonly string[]).includes(modo)
    ? (modo as VisibilityMode)
    : DEFAULT_VISIBILITY_MODE;
}
```

Create `lib/escale/acesso/membros.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Os membros ATIVOS da organização (convite aceito e não revogado), lidos com
 * a sessão de quem pede: a policy de `user_organizations` (migration 0044)
 * deixa gerente ou acima ver todas as linhas, e é gerente quem grava as listas.
 */
export async function membrosAtivos(
  supabase: SupabaseClient,
  orgId: string,
): Promise<{ ok: true; ids: string[] } | { ok: false; causa: { message: string } }> {
  const { data, error } = await supabase
    .from("user_organizations")
    .select("user_id")
    .eq("organization_id", orgId)
    .not("accepted_at", "is", null)
    .is("revoked_at", null);
  if (error) return { ok: false, causa: { message: error.message } };
  return { ok: true, ids: (data ?? []).map((l) => String((l as { user_id: string }).user_id).toLowerCase()) };
}

/** A lista que vai para o `settings` (origem ou grupo): minúscula, sem repetição; `null` apaga a chave. */
export function listaParaGravar(pessoas: readonly string[], membros: readonly string[]): { ok: true; lista: string[] | null } | { ok: false; erro: string } {
  const lista = [...new Set(pessoas.map((p) => p.toLowerCase()))];
  if (lista.some((p) => !membros.includes(p))) return { ok: false, erro: "Este usuário não faz parte da equipe." };
  return { ok: true, lista: lista.length > 0 ? lista : null };
}
```

- [ ] **Step 5: `tipos.ts`, `gravar.ts`, `montar.ts`, `respostas.ts`**

Em `lib/escale/configuracoes/tipos.ts`:
- no topo, `import type { VisibilityMode } from "@/lib/auth/types";` e `import { pessoasDaOrigem, visualizacaoDaOrigem } from "@/lib/escale/acesso/regras";`;
- em `ConfiguracoesDoFork`:
  ```ts
    /** A regra de quem vê os negócios DESTA origem (1J); `null` = segue a organização. */
    visualizacao: VisibilityMode | null;
    /** Quem tem acesso à origem (1J); vazia = segue a lista do grupo, ou sem restrição. */
    pessoas: string[];
  ```
- em `lerConfiguracoesDoFork`, depois de `alerta: …,`: `visualizacao: visualizacaoDaOrigem(s),` e `pessoas: pessoasDaOrigem(s),`.

Em `lib/escale/configuracoes/gravar.ts`:
- `import { listaParaGravar } from "@/lib/escale/acesso/membros";` e `import { CHAVE_DA_VISUALIZACAO, CHAVE_DAS_PESSOAS, PESSOAS_MAX, VISUALIZACOES } from "@/lib/escale/acesso/regras";`;
- no schema, em `gerais`, `visualizacao: z.enum(VISUALIZACOES),` depois de `tags_padrao`; e, depois de `alerta: alertaDeTempoSchema.optional(),`:
  ```ts
      permissoes: z.object({ pessoas: z.array(z.string().uuid()).max(PESSOAS_MAX) }).strict().optional(),
  ```
- `export type SecaoDasConfiguracoes = "gerais" | "motivos" | "campos" | "alerta" | "permissoes";` e, em `secoesDoPatch`, `(["gerais", "motivos", "campos", "alerta", "permissoes"] as const)`;
- a assinatura de `aplicarConfiguracoes`: `etapas: { abertas: readonly string[]; vivas: readonly string[]; membros?: readonly string[] }`;
- no bloco `if (patch.gerais)`, a atribuição final vira:
  ```ts
      s = comChave(
        comChave(comChave(s, CHAVE_DA_MOEDA, patch.gerais.moeda), CHAVE_DAS_TAGS, tags.length > 0 ? tags : null),
        CHAVE_DA_VISUALIZACAO,
        patch.gerais.visualizacao,
      );
  ```
- antes do `return { ok: true, settings: s };`:
  ```ts
    if (patch.permissoes) {
      const lista = listaParaGravar(patch.permissoes.pessoas, etapas.membros ?? patch.permissoes.pessoas.map((p) => p.toLowerCase()));
      if (!lista.ok) return lista;
      s = comChave(s, CHAVE_DAS_PESSOAS, lista.lista);
    }
  ```
  (sem `membros`, como nos testes puros antigos, qualquer lista passa; a rota sempre manda.)

Em `lib/escale/configuracoes/montar.ts`:
- `import { pessoasDaOrigem, regraEmVigor } from "@/lib/escale/acesso/regras";`
- em `ConfiguracoesDaOrigem`, troque o comentário de `visualizacao` por `/** A regra EM VIGOR nesta origem (1J): a da origem; sem ela, a da organização. */` e acrescente:
  ```ts
    /** A regra da organização (`organizations.settings.visibility_mode`). */
    visualizacaoDaOrganizacao: VisibilityMode;
    /** A lista do grupo da origem (1J, Q6): se a origem não tem lista, é esta que vale. */
    pessoasDoGrupo: string[];
  ```
- na entrada de `montarConfiguracoes`, renomeie `visualizacao` para `visualizacaoDaOrganizacao: VisibilityMode` e acrescente `grupo: { settings: unknown } | null;`; na saída:
  ```ts
      visualizacao: regraEmVigor(pipeline.settings, entrada.visualizacaoDaOrganizacao),
      visualizacaoDaOrganizacao: entrada.visualizacaoDaOrganizacao,
      pessoasDoGrupo: pessoasDaOrigem(entrada.grupo?.settings),
  ```

Em `lib/escale/configuracoes/respostas.ts`:
- em `OrigemLida`, acrescente `grupo: { settings: unknown } | null;`;
- em `lerOrigemDaConfiguracao`, depois de montar `p`, leia o grupo (a RLS da 9010 decide se a sessão o vê; sem ele, lista vazia):
  ```ts
    let grupo: { settings: unknown } | null = null;
    if (typeof p.group_id === "string") {
      const g = await supabase
        .from("crm_pipeline_groups")
        .select("settings")
        .eq("id", p.group_id)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (g.error) return { ok: false, erro: "banco", causa: g.error };
      grupo = g.data ? { settings: (g.data as { settings?: unknown }).settings ?? null } : null;
    }
  ```
  e devolva `grupo` no objeto `ok: true`;
- em `ContextoDaResposta`, renomeie `visualizacao` para `visualizacaoDaOrganizacao`; na chamada de `montarConfiguracoes`, passe `visualizacaoDaOrganizacao: ctx.visualizacaoDaOrganizacao, grupo: lido.grupo`.

- [ ] **Step 6: A rota**

Em `app/api/v1/pipelines/[id]/configuracoes/route.ts`:
- troque `import { DEFAULT_VISIBILITY_MODE } from "@/lib/auth/types";` por `import { membrosAtivos } from "@/lib/escale/acesso/membros";` e `import { modoDaOrganizacao } from "@/lib/escale/acesso/modo-da-organizacao";`;
- nos dois lugares com `visualizacao: authz.org.visibility_mode ?? DEFAULT_VISIBILITY_MODE,`, use `visualizacaoDaOrganizacao: await modoDaOrganizacao(authz.org.orgId, requestId),`;
- no PATCH, logo depois de `const supabase = await createClient();`:
  ```ts
    let membros: string[] | undefined;
    if (parsed.data.permissoes) {
      const lidos = await membrosAtivos(supabase, orgId);
      if (!lidos.ok) return falhaInesperada(lidos.causa, { rota: `PATCH ${ROTA}`, operacao: "ler" }, t, requestId);
      membros = lidos.ids;
    }
  ```
  e na chamada `aplicarConfiguracoes(origem.pipeline.settings, parsed.data, { abertas: …, vivas: …, membros })`;
- no cabeçalho, acrescente: `Fase 1J: "Visualização de negócios" e "Permissão de usuários" vão em gerais.visualizacao e permissoes.pessoas (gerente ou acima); a regra da organização é lida por modoDaOrganizacao; a lista do grupo vem junto para a tela dizer se a origem a segue.`

`falhaInesperada` aceita `{ message }` como causa (`ErroDoBanco` tem `code` e `message` opcionais).

- [ ] **Step 7: Rodar, typecheck e os fixtures**

Run: `corepack pnpm vitest run tests/unit/escale-configuracoes-rota.test.ts tests/unit/escale-configuracoes-gravar.test.ts tests/unit/escale-configuracoes-regras.test.ts`
Expected: PASS.

Run: `corepack pnpm typecheck`
Expected: erros só nos fixtures `ConfiguracoesDaOrigem` dos testes de tela (`escale-secao-gerais`, `escale-secao-alerta`, `escale-secao-campos`, `escale-secao-motivos`, `escale-janela-da-origem`). Em cada um, acrescente ao `fork` as chaves `visualizacao: null, pessoas: []` e, ao lado de `visualizacao: "own_and_unassigned"`, as linhas `visualizacaoDaOrganizacao: "own_and_unassigned", pessoasDoGrupo: []`. Rode o typecheck de novo: limpo.

- [ ] **Step 8: Revisor (G1).** Dispare o `security-reviewer` com a rota e os dois helpers e a pergunta: "a lista aceita alguém de outra organização? gerente de uma organização grava a lista de outra? a leitura com service role devolve algo que a sessão não devia ver?". Corrija o que for CRITICAL/HIGH.

- [ ] **Step 9: Commit**

```bash
corepack pnpm prettier --write lib/escale/acesso/modo-da-organizacao.ts lib/escale/acesso/membros.ts
git add lib/escale/acesso lib/escale/configuracoes "app/api/v1/pipelines/[id]/configuracoes/route.ts" tests/unit
git commit -m "feat(escale): a rota da origem lê a regra da organização e grava visualização e pessoas (Fase 1J)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 5: O seletor "Visualização de negócios" de verdade (D11)

**Files:**
- Modify: `components/escale/configuracoes/SecaoGerais.tsx`, `lib/escale/configuracoes/rascunho.ts`
- Test: `tests/unit/escale-secao-gerais.test.tsx` (alterado)

**Interfaces:**
- Consumes: `VISUALIZACOES` (Task 1), `SeletorDaCasca` (`aparencia="janela"`).
- Produces: `RascunhoDaOrigem.gerais.visualizacao: VisibilityMode`; `pedidoDoSalvar` manda `gerais.visualizacao` sempre que a seção `gerais` muda.

- [ ] **Step 1: O teste (vai falhar)**

Em `tests/unit/escale-secao-gerais.test.tsx`, troque as duas asserções do combobox (linhas 81–87) por:

```ts
    const seletor = screen.getByRole("combobox", { name: "Visualização de negócios" });
    expect(seletor).not.toHaveAttribute("aria-disabled", "true");
    expect(seletor).toHaveTextContent("Usuários visualizam seus negócios e sem dono");
```

e acrescente ao `describe("Configurações Gerais")`:

```ts
  it("visualização de negócios: as três opções da Clint, na ordem do print 03; escolher liga o Salvar", async () => {
    const { user } = abrir();
    await user.click(await screen.findByRole("combobox", { name: "Visualização de negócios" }));
    expect(screen.getByRole("option", { name: "Usuários visualizam todos os negócios" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Usuários visualizam apenas seus negócios" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Usuários visualizam todos os negócios" }));
    expect(screen.getByRole("combobox", { name: "Visualização de negócios" })).toHaveTextContent("Usuários visualizam todos os negócios");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/api/v1/pipelines/f-1/configuracoes",
      expect.objectContaining({ gerais: expect.objectContaining({ visualizacao: "all" }) }),
    );
  });
```

Run: `corepack pnpm vitest run tests/unit/escale-secao-gerais.test.tsx`
Expected: FAIL (o combobox ainda está desligado).

- [ ] **Step 2: O rascunho**

Em `lib/escale/configuracoes/rascunho.ts`:
- `import type { VisibilityMode } from "@/lib/auth/types";`
- em `RascunhoDaOrigem.gerais`, `visualizacao: VisibilityMode;`;
- em `rascunhoInicial`, em `gerais`, `visualizacao: config.visualizacao,` (a regra em vigor: N12);
- em `pedidoDoSalvar`, a condição e o patch de `gerais`:
  ```ts
    if (
      r.gerais.moeda !== inicial.gerais.moeda ||
      !igual(r.gerais.tags, inicial.gerais.tags) ||
      r.gerais.visualizacao !== inicial.gerais.visualizacao
    ) {
      patch.gerais = {
        moeda: r.gerais.moeda === config.moedaDaOrganizacao ? null : r.gerais.moeda,
        tags_padrao: r.gerais.tags,
        visualizacao: r.gerais.visualizacao,
      };
    }
  ```

- [ ] **Step 3: O seletor**

Em `components/escale/configuracoes/SecaoGerais.tsx`, `import { VISUALIZACOES } from "@/lib/escale/acesso/regras";` e troque o bloco `<Campo rotulo={t("Visualização de negócios")}> … </Campo>` (o `div role="combobox"` parado, com o comentário F11) por:

```tsx
      <Campo rotulo={t("Visualização de negócios")}>
        {/* 1J (D11): a regra DESTA origem. Mostra a que vale hoje (a da origem ou, sem ela, a da organização) e grava a escolhida (N12). */}
        <SeletorDaCasca
          aparencia="janela"
          valor={g.visualizacao}
          opcoes={VISUALIZACOES.map((v) => ({ valor: v, rotulo: visualizacoes[v] }))}
          aoMudar={(v) => v && mudarGerais({ visualizacao: v })}
          aria-label={t("Visualização de negócios")}
          className="text-[11.9px] font-light"
        />
      </Campo>
```

Se `ChevronDown` ficar sem uso no arquivo, tire-o do import.

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-secao-gerais.test.tsx tests/unit/escale-janela-da-origem.test.tsx tests/unit/escale-configuracoes-regras.test.ts && corepack pnpm typecheck && corepack pnpm eslint components/escale/configuracoes/SecaoGerais.tsx lib/escale/configuracoes/rascunho.ts`
Expected: PASS, limpo.

- [ ] **Step 5: Commit**

```bash
git add components/escale/configuracoes/SecaoGerais.tsx lib/escale/configuracoes/rascunho.ts tests/unit/escale-secao-gerais.test.tsx
git commit -m "feat(escale): seletor 'Visualização de negócios' por origem (Fase 1J, D11)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 6: A `ListaDePessoas` e a subaba "Permissão de usuários" da origem (D12)

**Files:**
- Create: `components/escale/configuracoes/ListaDePessoas.tsx`, `components/escale/configuracoes/SecaoPermissoes.tsx`, `tests/unit/escale-secao-permissoes.test.tsx`
- Modify: `components/escale/configuracoes/JanelaDaOrigem.tsx`, `lib/escale/configuracoes/rascunho.ts`

**Interfaces:**
- Consumes: `useTeamMembers` (`{ data?: { data: TeamMember[] } }`), `SeletorDaCasca`, `CabecaDaSecao`, `PropsDaSecao`, `PESSOAS_MAX`.
- Produces: `ListaDePessoas({ pessoas, aoMudar, placeholder })` (a tabela com ✕, a paginação e o seletor; o contador é de quem a usa); `membrosAtivosDaEquipe(equipe): { id, nome, email }[]` (exportado do mesmo arquivo); `RascunhoDaOrigem.permissoes: { pessoas: string[] }`; `pedidoDoSalvar` manda `permissoes.pessoas` quando muda.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-secao-permissoes.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useActiveOrg: () => ({ orgId: "org-1", currency: "BRL" }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1J (D12): a subaba "Permissão de usuários" da Clint (código `Ps`; sem print). */
const U = (n: number) => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const ORIGENS: Origens = {
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false }],
  funis: [{ id: "f-1", name: "Clayton", group_id: "g-1", is_archived: false, is_default: false }],
};
const EQUIPE = [
  ...Array.from({ length: 12 }, (_, i) => ({
    user_id: U(i + 1), role: "agent", full_name: `Pessoa ${String(i + 1).padStart(2, "0")}`,
    email: `p${i + 1}@x.com`, accepted_at: "2026-01-01", revoked_at: null,
  })),
  { user_id: U(99), role: "agent", full_name: "Revogada", email: "r@x.com", accepted_at: "2026-01-01", revoked_at: "2026-02-01" },
];

const config = (pessoas: string[], pessoasDoGrupo: string[] = []): ConfiguracoesDaOrigem => ({
  pipeline: { id: "f-1", name: "Clayton", group_id: "g-1", is_default: false },
  etapas: [],
  fork: { moeda: null, tagsPadrao: [], motivosInativos: [], aoSair: {}, alerta: { geral: null, etapas: {} }, visualizacao: null, pessoas },
  motivos: [], campos: [], regras: [],
  moedaDaOrganizacao: "BRL",
  visualizacao: "own_and_unassigned",
  visualizacaoDaOrganizacao: "own_and_unassigned",
  pessoasDoGrupo,
  podeAdministrar: false,
});

function abrir(pessoas: string[] = [], pessoasDoGrupo: string[] = []) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url === "/api/v1/pipelines/f-1/configuracoes") return { data: config(pessoas, pessoasDoGrupo) };
    if (url === "/api/v1/pipeline-groups") return { data: ORIGENS };
    if (url === "/api/v1/team") return { data: EQUIPE };
    return { data: [] };
  });
  vi.mocked(apiClient.patch).mockResolvedValue({ data: config(pessoas, pessoasDoGrupo) });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <JanelaDaOrigem id="f-1" origens={ORIGENS} onFechar={vi.fn()} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

async function irParaPermissoes(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("navigation", { name: "Configurações da origem" });
  await user.click(screen.getByRole("button", { name: "Permissão de usuários" }));
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Permissão de usuários (origem)", () => {
  it("sem ninguém: a descrição da Clint, a ajuda nossa, a tabela vazia e o seletor; sem contador", async () => {
    const { user } = abrir();
    await irParaPermissoes(user);
    expect(screen.getByRole("heading", { name: "Permissão de usuários" })).toBeInTheDocument();
    expect(screen.getByText("Somente os usuários selecionados poderão ver a origem. Caso nenhum usuário seja selecionado, a visualização não terá restrição.")).toBeInTheDocument();
    expect(screen.getByText("Administradores sempre veem os negócios desta origem.")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Usuários" })).toBeInTheDocument();
    expect(screen.queryByText(/usuários? selecionad/)).toBeNull();
    expect(screen.getByRole("combobox", { name: "Adicione um usuário..." })).toBeInTheDocument();
  });

  it("com lista no grupo, a descrição diz que a origem segue o grupo (Q6)", async () => {
    const { user } = abrir([], [U(5)]);
    await irParaPermissoes(user);
    expect(screen.getByText("Somente os usuários selecionados poderão ver a origem. Sem nenhum usuário selecionado, a origem segue as permissões do grupo.")).toBeInTheDocument();
  });

  it("adicionar pela busca põe na tabela, mostra o contador e liga o Salvar com a lista", async () => {
    const { user } = abrir();
    await irParaPermissoes(user);
    await user.click(screen.getByRole("combobox", { name: "Adicione um usuário..." }));
    await user.type(screen.getByRole("searchbox"), "Pessoa 03");
    await user.click(screen.getByRole("option", { name: "Pessoa 03" }));
    expect(screen.getByText("1 usuário selecionado")).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Pessoa 03/ })).toHaveTextContent("Pessoa 03 <p3@x.com>");
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/api/v1/pipelines/f-1/configuracoes",
      expect.objectContaining({ permissoes: { pessoas: [U(3)] } }),
    );
  });

  it("o ✕ tira da lista sem confirmação; a pessoa revogada e as já listadas não são oferecidas", async () => {
    const { user } = abrir([U(1), U(2)]);
    await irParaPermissoes(user);
    expect(screen.getByText("2 usuários selecionados")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remover Pessoa 01" }));
    expect(screen.getByText("1 usuário selecionado")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Adicione um usuário..." }));
    expect(screen.queryByRole("option", { name: "Revogada" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Pessoa 02" })).toBeNull();
  });

  it("pagina de 10 em 10 com 'n / N'; com todos na lista o seletor some", async () => {
    const { user } = abrir(Array.from({ length: 12 }, (_, i) => U(i + 1)));
    await irParaPermissoes(user);
    expect(screen.getAllByRole("row")).toHaveLength(11);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Adicione um usuário..." })).toBeNull();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-secao-permissoes.test.tsx`
Expected: FAIL (a subaba mostra "Em breve").

- [ ] **Step 2: O rascunho**

Em `lib/escale/configuracoes/rascunho.ts`:
- em `RascunhoDaOrigem`, `permissoes: { pessoas: string[] };`;
- em `rascunhoInicial`, `permissoes: { pessoas: [...config.fork.pessoas] },`;
- em `pedidoDoSalvar`, antes do `return { ok: true, … }`:
  ```ts
    if (!igual(r.permissoes, inicial.permissoes)) patch.permissoes = { pessoas: r.permissoes.pessoas };
  ```

- [ ] **Step 3: A `ListaDePessoas`**

Create `components/escale/configuracoes/ListaDePessoas.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { TeamMember } from "@/hooks/team/useTeamMembers";
import { PESSOAS_MAX } from "@/lib/escale/acesso/regras";
import { ChevronLeft, ChevronRight, X } from "@/lib/ui/icons-da-casca";

/** A Clint pagina a tabela de 10 em 10 (`Ue=10` em `Ps`). */
export const POR_PAGINA = 10;

export interface MembroDaEquipe {
  id: string;
  nome: string;
  email: string | null;
}

/** Os membros ativos, em ordem alfabética sem acento, como a Clint lista. */
export function membrosAtivosDaEquipe(equipe: readonly TeamMember[] | undefined, semNome: string): MembroDaEquipe[] {
  return (equipe ?? [])
    .filter((m) => m.accepted_at && !m.revoked_at)
    .map((m) => ({ id: m.user_id.toLowerCase(), nome: m.full_name ?? m.email ?? semNome, email: m.email }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
}

/**
 * A LISTA DE PESSOAS COM ACESSO (fork Escale, Fase 1J, D12; código `Ps` da Clint, sem print).
 *
 * A tabela "Usuários" com o ✕, a paginação "n / N" e o seletor com busca que
 * some quando todos já estão na lista. Controlada: quem a usa guarda `pessoas`
 * (a subaba da origem no rascunho da 1F; a janela do grupo no estado dela).
 */
export function ListaDePessoas({
  pessoas,
  membros,
  aoMudar,
  placeholder,
}: {
  pessoas: readonly string[];
  membros: readonly MembroDaEquipe[];
  aoMudar: (pessoas: string[]) => void;
  placeholder: string;
}) {
  const t = useT();
  const [pagina, setPagina] = useState(1);
  const porId = useMemo(() => new Map(membros.map((m) => [m.id, m])), [membros]);
  const restantes = membros.filter((m) => !pessoas.includes(m.id));
  const totalDePaginas = Math.max(1, Math.ceil(pessoas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalDePaginas);
  const daPagina = pessoas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  return (
    <div className="grid gap-4">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="h-11 border-b border-casca-borda text-left">
            <th scope="col" className="text-[10px] font-semibold uppercase tracking-wide text-casca-meta">
              {t("Usuários")}
            </th>
            <th scope="col" className="w-10">
              <span className="sr-only">{t("Remover")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {daPagina.map((id) => {
            const m = porId.get(id);
            const nome = m?.nome ?? id;
            return (
              <tr key={id} className="h-11 border-b border-casca-borda">
                <td className="text-casca-texto">
                  {nome}
                  {m?.email ? <span className="text-casca-suave"> &lt;{m.email}&gt;</span> : null}
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    aria-label={`${t("Remover")} ${nome}`}
                    onClick={() => aoMudar(pessoas.filter((p) => p !== id))}
                    className="rounded-[4px] p-1 text-casca-meta hover:text-casca-alerta"
                  >
                    <X size={14} aria-hidden />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {pessoas.length > POR_PAGINA ? (
        <div className="flex items-center justify-end gap-2 text-[12px] text-casca-suave">
          <button
            type="button"
            aria-label={t("Página anterior")}
            disabled={paginaAtual <= 1}
            title={paginaAtual <= 1 ? t("Primeira página") : t("Página anterior")}
            onClick={() => setPagina(paginaAtual - 1)}
            className="grid size-6 place-items-center rounded-[4px] text-casca-texto disabled:opacity-40"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <span>{`${paginaAtual} / ${totalDePaginas}`}</span>
          <button
            type="button"
            aria-label={t("Próxima página")}
            disabled={paginaAtual >= totalDePaginas}
            title={paginaAtual >= totalDePaginas ? t("Última página") : t("Próxima página")}
            onClick={() => setPagina(paginaAtual + 1)}
            className="grid size-6 place-items-center rounded-[4px] text-casca-texto disabled:opacity-40"
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      ) : null}

      {restantes.length > 0 && pessoas.length < PESSOAS_MAX ? (
        <div className="w-[480px] max-w-full">
          <SeletorDaCasca
            aparencia="janela"
            valor=""
            vazio={placeholder}
            vazioSoNoGatilho
            buscaAPartirDe={1}
            opcoes={restantes.map((m) => ({ valor: m.id, rotulo: m.nome }))}
            aoMudar={(v) => v && aoMudar([...pessoas, v])}
            aria-label={placeholder}
            className="text-[11.9px] font-light"
          />
        </div>
      ) : null}
    </div>
  );
}

/** "1 usuário selecionado" / "N usuários selecionados" (Clint 11626); nada com 0. */
export function ContadorDePessoas({ total }: { total: number }) {
  const t = useT();
  if (total === 0) return null;
  return (
    <p className="text-[13px] text-casca-suave">
      {total === 1 ? t("1 usuário selecionado") : `${total} ${t("usuários selecionados")}`}
    </p>
  );
}
```

- [ ] **Step 4: A subaba e a janela**

Create `components/escale/configuracoes/SecaoPermissoes.tsx`:

```tsx
"use client";
import { useMemo } from "react";

import { useT } from "@/hooks/i18n/useT";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { Users } from "@/lib/ui/icons-da-casca";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";
import { ContadorDePessoas, ListaDePessoas, membrosAtivosDaEquipe } from "./ListaDePessoas";

/**
 * PERMISSÃO DE USUÁRIOS DA ORIGEM (fork Escale, Fase 1J, D12; código `Ps` da Clint, sem print).
 * A descrição muda quando o grupo tem lista (a origem sem lista segue o grupo, Q6).
 * Tudo vai para o rascunho; quem grava é o "Salvar" único da janela (F13).
 */
export function SecaoPermissoes({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const equipe = useTeamMembers();
  const membros = useMemo(() => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")), [equipe.data, t]);
  const pessoas = rascunho.permissoes.pessoas;
  const segueOGrupo = config.pessoasDoGrupo.length > 0;

  return (
    <div className="grid max-w-[784px] gap-5">
      <CabecaDaSecao
        icone={Users}
        titulo={t("Permissão de usuários")}
        descricao={
          segueOGrupo
            ? t("Somente os usuários selecionados poderão ver a origem. Sem nenhum usuário selecionado, a origem segue as permissões do grupo.")
            : t("Somente os usuários selecionados poderão ver a origem. Caso nenhum usuário seja selecionado, a visualização não terá restrição.")
        }
      />
      <p className="-mt-3 text-[11px] text-casca-suave">{t("Administradores sempre veem os negócios desta origem.")}</p>
      <ContadorDePessoas total={pessoas.length} />
      <ListaDePessoas
        pessoas={pessoas}
        membros={membros}
        aoMudar={(lista) => mudar((r) => ({ ...r, permissoes: { pessoas: lista } }))}
        placeholder={t("Adicione um usuário...")}
      />
    </div>
  );
}
```

Em `components/escale/configuracoes/JanelaDaOrigem.tsx`:
- `import { SecaoPermissoes } from "./SecaoPermissoes";`
- no menu, a entrada vira `{ id: "permissoes", rotulo: t("Permissão de usuários"), icone: Users },` (sem `emBreve`);
- no `switch` de `conteudo`, `case "permissoes": return <SecaoPermissoes {...props} />;`;
- no cabeçalho do arquivo: `Fase 1J: a subaba "Permissão de usuários" e a "Visualização de negócios" por origem.`

Confira se `ChevronLeft` e `X` estão em `lib/ui/icons-da-casca.ts` (estavam em 17/10); senão, acrescente-os.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-secao-permissoes.test.tsx tests/unit/escale-janela-da-origem.test.tsx tests/unit/escale-configuracoes-regras.test.ts && corepack pnpm typecheck && corepack pnpm eslint components/escale/configuracoes/ListaDePessoas.tsx components/escale/configuracoes/SecaoPermissoes.tsx components/escale/configuracoes/JanelaDaOrigem.tsx`
Expected: PASS, limpo.

- [ ] **Step 6: Commit**

```bash
corepack pnpm prettier --write components/escale/configuracoes/ListaDePessoas.tsx components/escale/configuracoes/SecaoPermissoes.tsx tests/unit/escale-secao-permissoes.test.tsx
git add components/escale/configuracoes lib/escale/configuracoes/rascunho.ts tests/unit/escale-secao-permissoes.test.tsx
git commit -m "feat(escale): subaba 'Permissão de usuários' da origem (Fase 1J, D12)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 7: A lista de pessoas do grupo (Q6): leitura, rota e a seção na janela do grupo

**Files:**
- Modify: `lib/escale/origens/regras.ts`, `lib/escale/origens/ler-origens.ts`, `app/api/v1/pipeline-groups/[id]/route.ts`, `components/escale/origens/JanelasDoGrupo.tsx`, `hooks/escale/useOrigens.ts`
- Test: `tests/unit/escale-janela-do-grupo-permissoes.test.tsx` (novo), `tests/unit/escale-grupos-de-funis-rotas.test.ts` (alterado)

**Interfaces:**
- Consumes: `pessoasDaOrigem`, `CHAVE_DAS_PESSOAS`, `PESSOAS_MAX` (Task 1), `membrosAtivos`, `listaParaGravar` (Task 4), `SeletorMultiploDaCasca`, `ContadorDePessoas`, `membrosAtivosDaEquipe` (Task 6).
- Produces: `GrupoDeFunis.pessoas?: string[]` (opcional, para não mexer nos fixtures da 1A/1B); `MudancaDeGrupo.pessoas?: string[]`; o PATCH do grupo aceita `pessoas`.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-janela-do-grupo-permissoes.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "@/lib/api/client";
import { FormConfigGrupo } from "@/components/escale/origens/JanelasDoGrupo";
import type { Origens } from "@/lib/escale/origens/regras";

/** FORK ESCALE · Fase 1J (Q6): a seção "Permissão de usuários" da janela do grupo (código `StepConfig` da Clint; sem print). */
const U = (n: number) => `${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
const EQUIPE = [
  { user_id: U(1), role: "agent", full_name: "Ana", email: "a@x.com", accepted_at: "2026-01-01", revoked_at: null },
  { user_id: U(2), role: "manager", full_name: "Bia", email: "b@x.com", accepted_at: "2026-01-01", revoked_at: null },
];
const origens = (pessoas: string[]): Origens => ({
  grupos: [{ id: "g-1", name: "INSS", color: null, icon: "iniciais", is_archived: false, pessoas }],
  funis: [],
});

function abrir(pessoas: string[] = []) {
  vi.mocked(apiClient.get).mockImplementation(async (url: string) =>
    url === "/api/v1/team" ? { data: EQUIPE } : { data: origens(pessoas) },
  );
  vi.mocked(apiClient.patch).mockResolvedValue({ data: origens(pessoas) });
  const onFechar = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <FormConfigGrupo id="g-1" origens={origens(pessoas)} onFechar={onFechar} onOrigens={vi.fn()} />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup({ pointerEventsCheck: 0 }), onFechar };
}

beforeEach(() => {
  for (const fn of Object.values(apiClient)) vi.mocked(fn).mockReset();
});

describe("Configurações do grupo: Permissão de usuários", () => {
  it("mostra a descrição da Clint e o seletor múltiplo; escolher mostra o contador e grava pessoas junto do nome", async () => {
    const { user } = abrir();
    expect(screen.getByText("Permissão de usuários")).toBeInTheDocument();
    expect(screen.getByText("Somente os usuários selecionados poderão ver o grupo. Caso nenhum usuário seja selecionado, a visualização não terá restrição.")).toBeInTheDocument();
    await user.click(await screen.findByRole("combobox", { name: "Selecione os usuários que poderão visualizar o grupo" }));
    await user.click(await screen.findByRole("checkbox", { name: "Ana" }));
    expect(screen.getByText("1 usuário selecionado")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/pipeline-groups/g-1", { name: "INSS", pessoas: [U(1)] });
  });

  it("abre com a lista que o grupo já tem", async () => {
    abrir([U(2)]);
    expect(await screen.findByText("1 usuário selecionado")).toBeInTheDocument();
  });
});
```

Em `tests/unit/escale-grupos-de-funis-rotas.test.ts`, no `describe` do PATCH de `/api/v1/pipeline-groups/[id]`, acrescente dois `it` (copie o `banco()`/`pedido()`/`ctx()` que o arquivo já usa; adicione ao topo um `vi.mock("@/lib/escale/acesso/membros", …)` igual ao da Task 4, com `membrosAtivos` devolvendo `{ ok: true, ids: [<um id válido>] }` e `listaParaGravar` **real** via `vi.importActual`):

```ts
  it("pessoas: grava settings.escale_pessoas no grupo e audita", async () => {
    const db = banco();
    const res = await PATCH(pedido("PATCH", { pessoas: [MEMBRO] }), ctx(GRUPO));
    expect(res.status).toBe(200);
    const escrita = db.escritas.find((e) => e.table === "crm_pipeline_groups" && e.tipo === "update");
    expect(escrita?.patch).toEqual({ settings: { escale_pessoas: [MEMBRO] } });
  });

  it("pessoas com quem não é membro ativo: 422 e nada gravado", async () => {
    const db = banco();
    const res = await PATCH(pedido("PATCH", { pessoas: ["77777777-7777-4777-8777-777777777777"] }), ctx(GRUPO));
    expect(res.status).toBe(422);
    expect(db.escritas.filter((e) => e.table === "crm_pipeline_groups")).toHaveLength(0);
  });
```

Se o dublê desse arquivo não devolver `settings` na leitura do grupo, a rota trata como `{}`; se não registrar `escritas` com `patch`, use a forma de asserção que o arquivo já usa para `name`/`color`.

Run: `corepack pnpm vitest run tests/unit/escale-janela-do-grupo-permissoes.test.tsx tests/unit/escale-grupos-de-funis-rotas.test.ts`
Expected: FAIL.

- [ ] **Step 2: Leitura e tipos**

Em `lib/escale/origens/regras.ts`, em `GrupoDeFunis`, acrescente `/** 1J (Q6): quem tem acesso ao grupo; vazia = sem restrição. Opcional porque as rotas da 1A/1B e seus fixtures não a conhecem. */ pessoas?: string[];`.

Em `lib/escale/origens/ler-origens.ts`: `import { pessoasDaOrigem } from "@/lib/escale/acesso/regras";`; em `LinhaDeGrupo`, `settings?: unknown;`; em `paraGrupo`, `pessoas: pessoasDaOrigem(g.settings),`; no `select` dos grupos, `"id, name, color, icon, is_archived, settings"`.

Em `hooks/escale/useOrigens.ts`, em `MudancaDeGrupo`, `pessoas?: string[];`.

- [ ] **Step 3: A rota**

Em `app/api/v1/pipeline-groups/[id]/route.ts`:
- imports: `import { listaParaGravar, membrosAtivos } from "@/lib/escale/acesso/membros";` e `import { CHAVE_DAS_PESSOAS, PESSOAS_MAX } from "@/lib/escale/acesso/regras";`;
- em `corpoSchema`, `pessoas: z.array(z.string().uuid()).max(PESSOAS_MAX).optional(),`;
- depois do bloco de `is_archived` e antes de `// Nada a mudar`:
  ```ts
    // 1J (Q6): a lista de quem vê o grupo, no settings dele (o mesmo desenho da origem).
    if (pedido.pessoas !== undefined) {
      const lidos = await membrosAtivos(supabase, orgId);
      if (!lidos.ok) return fail("internal_error", lidos.causa.message, 500, { requestId });
      const lista = listaParaGravar(pedido.pessoas, lidos.ids);
      if (!lista.ok) return fail("unprocessable_entity", t(lista.erro), 422, { requestId });
      const atual = await supabase
        .from("crm_pipeline_groups")
        .select("settings")
        .eq("id", id)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (atual.error) return fail("internal_error", atual.error.message, 500, { requestId });
      const settings = { ...((atual.data as { settings?: Record<string, unknown> } | null)?.settings ?? {}) };
      if (lista.lista) settings[CHAVE_DAS_PESSOAS] = lista.lista;
      else delete settings[CHAVE_DAS_PESSOAS];
      patch.settings = settings;
    }
  ```
- na auditoria, em `metadata.antes`, acrescente `pessoas: grupo.pessoas ?? []`.

- [ ] **Step 4: A seção na janela do grupo**

Em `components/escale/origens/JanelasDoGrupo.tsx`, no `FormConfigGrupo`:
- imports: `import { useMemo } from "react";` (junte ao `useState` que já existe), `import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";`, `import { useTeamMembers } from "@/hooks/team/useTeamMembers";`, `import { ContadorDePessoas, membrosAtivosDaEquipe } from "@/components/escale/configuracoes/ListaDePessoas";`;
- estado: depois de `const [nome, setNome] = …`, acrescente:
  ```ts
    // 1J (Q6): quem vê o grupo. A origem sem lista própria segue esta.
    const [pessoas, setPessoas] = useState<string[]>(grupo?.pessoas ?? []);
    const equipe = useTeamMembers();
    const membros = useMemo(() => membrosAtivosDaEquipe(equipe.data?.data, t("Sem nome")), [equipe.data, t]);
  ```
- em `enviar`, a mutação vira `{ id, mudanca: { name: nome, pessoas } }`;
- no JSX, entre o `<Campo rotulo={t("Nome")}>` e o `<RodapeDaJanela>`:
  ```tsx
        <section className="grid gap-2">
          <h3 className="text-[13px] font-medium text-casca-texto">{t("Permissão de usuários")}</h3>
          <p className="text-[11px] text-casca-suave">
            {t("Somente os usuários selecionados poderão ver o grupo. Caso nenhum usuário seja selecionado, a visualização não terá restrição.")}
          </p>
          <SeletorMultiploDaCasca
            valores={pessoas}
            opcoes={membros.map((m) => ({ valor: m.id, rotulo: m.nome }))}
            aoMudar={setPessoas}
            vazio={t("Selecione os usuários que poderão visualizar o grupo")}
            aria-label={t("Selecione os usuários que poderão visualizar o grupo")}
          />
          <ContadorDePessoas total={pessoas.length} />
        </section>
  ```
- o `disabled` do Salvar continua `atualizar.isPending || !nome.trim()`.

Se o `SeletorMultiploDaCasca` não renderizar as opções como `checkbox` com o rótulo (o teste usa `getByRole("checkbox", { name: "Ana" })`), confira como `tests/unit/escale-*` que já o usam encontram as opções (por exemplo o teste dos filtros da 1D) e use a mesma consulta.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-janela-do-grupo-permissoes.test.tsx tests/unit/escale-grupos-de-funis-rotas.test.ts tests/unit/escale-origens-regras.test.ts && corepack pnpm typecheck && corepack pnpm eslint components/escale/origens/JanelasDoGrupo.tsx "app/api/v1/pipeline-groups/[id]/route.ts" lib/escale/origens/ler-origens.ts`
Expected: PASS, limpo (se `escale-origens-regras.test.ts` tiver outro nome, rode os guardas da Verificação 1).

- [ ] **Step 6: Revisor (G1).** `security-reviewer` na rota do grupo: "gerente de uma organização grava a lista de um grupo de outra? a lista aceita quem não é membro?".

- [ ] **Step 7: Commit**

```bash
git add lib/escale/origens hooks/escale/useOrigens.ts "app/api/v1/pipeline-groups/[id]/route.ts" components/escale/origens/JanelasDoGrupo.tsx tests/unit
git commit -m "feat(escale): lista de pessoas do grupo de origens (Fase 1J, Q6)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 8: O aviso da Clint na ficha (Q5): "Você não tem permissão…" e a janela "Dono do negócio"

**Files:**
- Create: `components/escale/negocio/AvisoDeOutroDono.tsx`
- Modify: `app/app/negocios/[id]/page.tsx`, `app/app/escale/negocios/route.ts`, `app/app/pipelines/[id]/_client.tsx`
- Test: `tests/unit/escale-ficha-rotas.test.ts` (alterado)

**Interfaces:**
- Consumes: `avisoDaFicha` (Task 1), `modoDaOrganizacao` (Task 4), `createAdminClient`, `JanelaDaCasca`, `CabecaDaJanela`, `BotaoDaJanela`, `RodapeDaJanela`.
- Produces: o parâmetro `?aviso=origem-sem-acesso` que `/app/escale/negocios` repassa ao quadro e o quadro consome.

- [ ] **Step 1: Os testes (vão falhar)**

Em `tests/unit/escale-ficha-rotas.test.ts`, acrescente aos mocks do topo:

```ts
const escondido = vi.hoisted(() => ({
  lead: null as Record<string, unknown> | null,
  origem: { settings: {} as Record<string, unknown>, group_id: null as string | null },
  grupo: { settings: {} as Record<string, unknown> },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tabela: string) => {
      const linha =
        tabela === "crm_leads" ? escondido.lead : tabela === "crm_pipelines" ? escondido.origem : escondido.grupo;
      const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: linha, error: null }) };
      return q;
    },
  }),
}));
vi.mock("@/lib/escale/acesso/modo-da-organizacao", () => ({ modoDaOrganizacao: async () => "own_and_unassigned" }));
```

e, num `describe("aviso da Clint (1J, Q5)")`, com `estado.linhas` deixando o negócio **invisível para a sessão** (o mesmo arranjo que o teste de `NOT_FOUND` já usa):

```ts
  it("origem sem acesso: volta para a lista com o aviso", async () => {
    escondido.lead = { id: "n1", pipeline_id: "o1", owner_user_id: "u-2", status: "open" };
    escondido.origem = { settings: { escale_pessoas: ["22222222-2222-4222-8222-222222222222"] }, group_id: null };
    await expect(NegocioPage({ params: Promise.resolve({ id: NEGOCIO }) })).rejects.toThrow(
      "REDIRECT /app/escale/negocios?aviso=origem-sem-acesso",
    );
  });

  it("origem ok, negócio de outro dono sob a regra: a janela 'Dono do negócio'", async () => {
    escondido.lead = { id: "n1", pipeline_id: "o1", owner_user_id: "u-2", status: "open" };
    escondido.origem = { settings: {}, group_id: null };
    const resultado = await NegocioPage({ params: Promise.resolve({ id: NEGOCIO }) });
    expect((resultado as { type: unknown }).type).toBe(AvisoDeOutroDono);
  });

  it("nem o service role acha: 404", async () => {
    escondido.lead = null;
    await expect(NegocioPage({ params: Promise.resolve({ id: NEGOCIO }) })).rejects.toThrow("NOT_FOUND");
  });
```

(`NEGOCIO` é um uuid válido; `resolveActiveOrg` do mock devolve `role: "agent"` e `requireAuth` devolve `{ id: "u-1" }`, então `u-2` é "outro dono". Importe `AvisoDeOutroDono` de `@/components/escale/negocio/AvisoDeOutroDono` e `NegocioPage` como o arquivo já importa a página.)

Run: `corepack pnpm vitest run tests/unit/escale-ficha-rotas.test.ts`
Expected: FAIL (hoje é sempre `NOT_FOUND`).

- [ ] **Step 2: A janela**

Create `components/escale/negocio/AvisoDeOutroDono.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";

import { BotaoDaJanela, CabecaDaJanela, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";

/**
 * "DONO DO NEGÓCIO" (fork Escale, Fase 1J, Q5; código `kc` da Clint, sem print):
 * a origem é visível, mas a regra dela esconde este negócio. Um botão só, que
 * volta para a lista de negócios. Fechar pela cortina ou Esc faz o mesmo.
 */
export function AvisoDeOutroDono() {
  const t = useT();
  const router = useRouter();
  const voltar = () => router.push("/app/escale/negocios");
  return (
    <JanelaDaCasca aberta onFechar={voltar}>
      <CabecaDaJanela titulo={t("Dono do negócio")} />
      <p className="text-[13px] text-casca-texto">{t("Atenção! Esse negócio pertence a outro dono.")}</p>
      <RodapeDaJanela>
        <BotaoDaJanela variante="salvar" onClick={voltar}>
          {t("Voltar para listagem de negócios")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

- [ ] **Step 3: A página**

Em `app/app/negocios/[id]/page.tsx`:
- imports novos: `import { AvisoDeOutroDono } from "@/components/escale/negocio/AvisoDeOutroDono";`, `import { avisoDaFicha } from "@/lib/escale/acesso/regras";`, `import { modoDaOrganizacao } from "@/lib/escale/acesso/modo-da-organizacao";`, `import { createAdminClient } from "@/lib/supabase/admin";`, e `type { Role } from "@/lib/auth/types"`;
- troque `if (!lead?.pipeline_id || lead.status === "archived") notFound();` por:
  ```ts
    if (!lead) {
      // 1J (Q5): a sessão não lê o negócio. Relê com o service role SÓ para escolher o
      // aviso da Clint; nada do negócio chega à tela. Mesmo arquivado, cai no 404.
      const admin = createAdminClient();
      const { data: escondido } = await admin
        .from("crm_leads")
        .select("id, pipeline_id, owner_user_id, status")
        .eq("organization_id", activeOrg.orgId)
        .eq("id", id)
        .maybeSingle();
      if (!escondido?.pipeline_id || escondido.status === "archived") notFound();
      const { data: origemEscondida } = await admin
        .from("crm_pipelines")
        .select("settings, group_id")
        .eq("organization_id", activeOrg.orgId)
        .eq("id", escondido.pipeline_id)
        .maybeSingle();
      const { data: grupoEscondido } = origemEscondida?.group_id
        ? await admin
            .from("crm_pipeline_groups")
            .select("settings")
            .eq("organization_id", activeOrg.orgId)
            .eq("id", origemEscondida.group_id)
            .maybeSingle()
        : { data: null };
      const aviso = avisoDaFicha({
        papel: activeOrg.role as Role,
        userId: user.id,
        donoUserId: (escondido.owner_user_id as string | null) ?? null,
        settingsDaOrigem: origemEscondida?.settings ?? null,
        settingsDoGrupo: grupoEscondido?.settings ?? null,
        modoDaOrganizacao: await modoDaOrganizacao(activeOrg.orgId, "ficha"),
      });
      if (aviso === "origem") redirect("/app/escale/negocios?aviso=origem-sem-acesso");
      if (aviso === "outro_dono") return <AvisoDeOutroDono />;
      notFound();
    }
    if (!lead.pipeline_id || lead.status === "archived") notFound();
  ```
- no cabeçalho do arquivo, acrescente o parágrafo: `Fase 1J (Q5): quando a sessão não lê o negócio, a página relê com o service role só para escolher o aviso da Clint (origem sem acesso → volta à lista com o toast; negócio de outro dono → a janela "Dono do negócio"); nada do negócio chega à tela.`

Em `app/app/escale/negocios/route.ts`:
- `import { type NextRequest, NextResponse } from "next/server";` e a assinatura `export async function GET(req: NextRequest): Promise<NextResponse>`;
- antes do `return`, `const aviso = new URL(req.url).searchParams.get("aviso") === "origem-sem-acesso" ? "?aviso=origem-sem-acesso" : "";` e o `return para(destino ? \`/app/pipelines/${destino}${aviso}\` : \`/app/kanban${aviso}\`);`.

Em `app/app/pipelines/[id]/_client.tsx`, perto dos outros encaixes `FORK ESCALE · Fase 1E` (depois de `const [importando, setImportando] = useState(false);`), acrescente (confira os imports de `useEffect` e de `toast` de `sonner`; acrescente se faltarem):
```ts
  // FORK ESCALE · Fase 1J (Q5): o aviso da Clint ao cair aqui vindo de um negócio de origem sem acesso.
  useEffect(() => {
    if (searchParams.get("aviso") !== "origem-sem-acesso") return;
    toast.error(t("Você não tem permissão para acessar essa origem."));
    const busca = new URLSearchParams(searchParams);
    busca.delete("aviso");
    router.replace(busca.size > 0 ? `${pathname}?${busca}` : pathname, { scroll: false });
  }, [searchParams, router, pathname, t]);
```
Esse `useEffect` precisa ficar depois de `const t = useT();`, `router`, `pathname` e `searchParams` do componente (todos já existem nele).

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-rotas.test.ts tests/unit/escale-ficha-do-negocio.test.tsx && corepack pnpm typecheck && corepack pnpm eslint "app/app/negocios/[id]/page.tsx" app/app/escale/negocios/route.ts "app/app/pipelines/[id]/_client.tsx" components/escale/negocio/AvisoDeOutroDono.tsx`
Expected: PASS, limpo. Rode também os guardas de `_client.tsx` (Verificação 1): `escale-casca-v2-original-intacto` continua verde porque `_client.tsx` é página do original e só importa `@/lib/escale/` — **o `toast` e o `t()` já estão nele**; não importe `@/components/escale/` ali.

- [ ] **Step 5: Revisor (G1).** `security-reviewer` na página: "a leitura com service role devolve à tela algum dado do negócio escondido? o `organization_id` da sessão está em todos os `.eq`? um id de outra organização dá 404?".

- [ ] **Step 6: Commit**

```bash
corepack pnpm prettier --write components/escale/negocio/AvisoDeOutroDono.tsx
git add components/escale/negocio/AvisoDeOutroDono.tsx "app/app/negocios/[id]/page.tsx" app/app/escale/negocios/route.ts "app/app/pipelines/[id]/_client.tsx" tests/unit/escale-ficha-rotas.test.ts
git commit -m "feat(escale): aviso da Clint para negócio sem acesso (Fase 1J, Q5)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 9: O dono na ficha sob "só os seus", o espanhol, a rodada cheia, a conferência e o PR B

**Files:**
- Modify: `components/escale/negocio/DonoDaFicha.tsx`, `lib/i18n/dicionario.ts`, `tests/unit/escale-ficha-status-e-dono.test.tsx`

**Interfaces:**
- Consumes: `podeTrocarDono`, `regraEmVigor` (Task 1), `useActiveOrg` (`{ role, visibility_mode? }`), `useBoard(pipelineId)` (`data?.pipeline.settings`).

- [ ] **Step 1: O teste (vai falhar)**

Em `tests/unit/escale-ficha-status-e-dono.test.tsx`:
- troque o mock do `AuthProvider` por:
  ```ts
  const org = vi.hoisted(() => ({ role: "agent" as string, visibility_mode: "own_and_unassigned" as string }));
  vi.mock("@/hooks/auth/AuthProvider", () => ({
    usePermission: () => permissao.pode,
    useActiveOrg: () => ({ orgId: "o1", role: org.role, visibility_mode: org.visibility_mode }),
  }));
  const quadro = vi.hoisted(() => ({ settings: {} as Record<string, unknown> }));
  vi.mock("@/hooks/kanban/useBoard", () => ({
    useBoard: () => ({ data: { pipeline: { settings: quadro.settings } } }),
  }));
  ```
- no `beforeEach`, `org.role = "agent"; org.visibility_mode = "own_and_unassigned"; quadro.settings = {};`
- ao `describe("dono (C5, print 10)")`:
  ```tsx
    it("sob 'só os seus' da origem, quem não é gerente não troca o dono: desligado com o texto da Clint (1J)", () => {
      quadro.settings = { escale_visualizacao: "own" };
      render(<DonoDaFicha lead={ABERTO} pipelineId="o1" />);
      const botao = screen.getByRole("button", { name: "Alterar usuário" });
      expect(botao).toBeDisabled();
      expect(botao).toHaveAttribute("title", "As permissões de usuários não permitem você trocar de dono");
    });

    it("gerente troca sob qualquer regra; agente troca sob 'todos' (1J)", () => {
      quadro.settings = { escale_visualizacao: "own" };
      org.role = "manager";
      const { unmount } = render(<DonoDaFicha lead={ABERTO} pipelineId="o1" />);
      expect(screen.getByRole("button", { name: "Alterar usuário" })).toBeEnabled();
      unmount();
      org.role = "agent";
      quadro.settings = { escale_visualizacao: "all" };
      render(<DonoDaFicha lead={ABERTO} pipelineId="o1" />);
      expect(screen.getByRole("button", { name: "Alterar usuário" })).toBeEnabled();
    });

    it("sem regra na origem vale a da organização (1J)", () => {
      org.visibility_mode = "own";
      render(<DonoDaFicha lead={ABERTO} pipelineId="o1" />);
      expect(screen.getByRole("button", { name: "Alterar usuário" })).toBeDisabled();
    });
  ```

Run: `corepack pnpm vitest run tests/unit/escale-ficha-status-e-dono.test.tsx`
Expected: FAIL nos três novos.

- [ ] **Step 2: O dono**

Em `components/escale/negocio/DonoDaFicha.tsx`:
- importe `useActiveOrg` junto de `usePermission`, `useBoard` de `@/hooks/kanban/useBoard`, `{ podeTrocarDono, regraEmVigor }` de `@/lib/escale/acesso/regras`, e `type { Role } from "@/lib/auth/types"`;
- depois de `const pode = usePermission("pipeline.move_card");`:
  ```ts
    // 1J (N14): sob "só os seus" ou "seus e sem dono", quem não é gerente perderia o negócio ao
    // passá-lo a outro (a RLS recusa). A Clint desliga o seletor; aqui também.
    const org = useActiveOrg();
    const { data: quadro } = useBoard(pipelineId);
    const regra = regraEmVigor(quadro?.pipeline.settings, org?.visibility_mode);
    const liberado = pode && podeTrocarDono({ papel: (org?.role as Role | undefined) ?? null, regra });
  ```
- troque `disabled={!pode || editar.isPending}` por `disabled={!liberado || editar.isPending}`; no `title`, `!pode` por `!liberado`; e `useAssignableAgents(pode)` por `useAssignableAgents(liberado)`.

Run: `corepack pnpm vitest run tests/unit/escale-ficha-status-e-dono.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx && corepack pnpm typecheck && corepack pnpm eslint components/escale/negocio/DonoDaFicha.tsx`
Expected: PASS, limpo. Se `escale-ficha-do-negocio.test.tsx` reclamar de `useActiveOrg` ausente no mock dele, acrescente `useActiveOrg: () => ({ orgId: "o1", role: "manager" })`.

- [ ] **Step 3: O espanhol**

Em `lib/i18n/dicionario.ts`, logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───` (e depois dos blocos da 1G/1H/1I que estiverem lá):

```ts
  // ─── FORK ESCALE · acesso por origem (Fase 1J: visualização por origem, permissão de usuários, aviso da ficha) ───
  "Somente os usuários selecionados poderão ver a origem. Caso nenhum usuário seja selecionado, a visualização não terá restrição.": {
    es: "Solo los usuarios seleccionados podrán ver el origen. Si no seleccionas ningún usuario, la visualización no tendrá restricción.",
  },
  "Somente os usuários selecionados poderão ver a origem. Sem nenhum usuário selecionado, a origem segue as permissões do grupo.": {
    es: "Solo los usuarios seleccionados podrán ver el origen. Sin ningún usuario seleccionado, el origen sigue los permisos del grupo.",
  },
  "Somente os usuários selecionados poderão ver o grupo. Caso nenhum usuário seja selecionado, a visualização não terá restrição.": {
    es: "Solo los usuarios seleccionados podrán ver el grupo. Si no seleccionas ningún usuario, la visualización no tendrá restricción.",
  },
  "Selecione os usuários que poderão visualizar o grupo": { es: "Selecciona los usuarios que podrán ver el grupo" },
  "Administradores sempre veem os negócios desta origem.": { es: "Los administradores siempre ven los negocios de este origen." },
  "1 usuário selecionado": { es: "1 usuario seleccionado" },
  "usuários selecionados": { es: "usuarios seleccionados" },
  "Adicione um usuário...": { es: "Agrega un usuario..." },
  "Página anterior": { es: "Página anterior" },
  "Próxima página": { es: "Página siguiente" },
  "Primeira página": { es: "Primera página" },
  "Última página": { es: "Última página" },
  "Este usuário não faz parte da equipe.": { es: "Este usuario no forma parte del equipo." },
  "Você não tem permissão para acessar essa origem.": { es: "No tienes permiso para acceder a este origen." },
  "Dono do negócio": { es: "Dueño del negocio" },
  "Atenção! Esse negócio pertence a outro dono.": { es: "¡Atención! Este negocio pertenece a otro dueño." },
  "Voltar para listagem de negócios": { es: "Volver a la lista de negocios" },
```

Se alguma chave já existir (por exemplo "Usuários", "Remover" ou "Página anterior"), não a repita: o teste de chaves duplicadas aponta. "Usuários" e "Remover" provavelmente já existem; se não, acrescente `"Usuários": { es: "Usuarios" }` e `"Remover": { es: "Quitar" }`.

Run: `corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/escale-espanhol-registro-tu.test.ts`
Expected: PASS.

- [ ] **Step 4: A rodada cheia (G1, em segundo plano) e a conferência visual**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck && corepack pnpm lint
corepack pnpm test:unit > .superpowers/sdd/1j-prb-unit.log 2>&1 &
wait
grep -E "Tests|failed" .superpowers/sdd/1j-prb-unit.log | tail -4
```
Expected: só as falhas de `.superpowers/sdd/falhas-conhecidas.txt`.

Conferência (CAMINHO A: app local com a casca ligada, `corepack pnpm dev` e `/app/escale/menu?usar=topo`; CAMINHO B: só os testes, se o app local não subir):
1. Configurações da origem › Configurações Gerais contra F01 e F03: o seletor fechado e aberto.
2. Configurações da origem › Permissão de usuários (sem print): confira contra "Medidas".
3. Painel Origens › ⋮ do grupo › Configurações: a seção do grupo (sem print).
4. Logado como agente fora da lista: a origem some do painel; o link direto de um negócio dela mostra o toast e volta ao quadro; numa origem "só os seus", um negócio de outro mostra a janela "Dono do negócio"; o círculo do dono desligado.
Escreva a lista das diferenças em `.superpowers/sdd/1j-conferencia.md`.

- [ ] **Step 5: O PRD, o commit e o PR B**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`, seção 8, a linha da 1J passa a `PR A ✅ (banco); PR B aberto (tela)`.

```bash
git add components/escale/negocio/DonoDaFicha.tsx lib/i18n/dicionario.ts tests/unit/escale-ficha-status-e-dono.test.tsx
git commit -m "feat(escale): dono da ficha segue a regra da origem; espanhol da 1J

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git fetch escale-crm && git rebase escale-crm/main
corepack pnpm vitest run tests/unit/escale-configuracoes-rota.test.ts tests/unit/escale-secao-permissoes.test.tsx tests/unit/escale-ficha-rotas.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts
git push -u escale-crm feat/fase-1j-acesso-tela
```

Abra o PR para `rgisjr/escale-crm` (base `main`) com o título `feat(escale): Fase 1J (PR B) — visualização por origem, permissão de usuários e aviso da ficha` e o corpo:

```markdown
## O que muda (com a casca ligada)
- **Configurações da origem › Configurações Gerais:** "Visualização de negócios" vira um seletor de verdade, por origem (todos / apenas seus / seus e sem dono). Mostra a regra em vigor e grava a escolhida na origem.
- **Configurações da origem › Permissão de usuários:** a subaba da Clint: quem está na lista vê a origem; lista vazia = segue o grupo, ou sem restrição; só administradores sempre veem.
- **Configurações do grupo:** a seção "Permissão de usuários" do grupo (a origem sem lista própria segue a dele).
- **Ficha do negócio:** link para negócio de origem sem acesso → "Você não tem permissão para acessar essa origem." e volta ao quadro; negócio de outro dono escondido pela regra → a janela "Dono do negócio". Sob "só os seus"/"seus e sem dono", quem não é gerente não troca o dono.
- Corrige o defeito da 1F: o campo mostrava sempre "seus negócios e sem dono" porque a rota não lia a regra da organização.

## Quem aplica
O banco (PR A, migration 9010). Esta PR configura e mostra.

## Fora
Validação com a distribuição de dono (1K); as opções do filtro "Dono" do quadro sob as regras restritas.

Conferência visual: `.superpowers/sdd/1j-conferencia.md`. Plano: `docs/superpowers/plans/2026-10-17-fase-1j-acesso-por-origem.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

PARE aqui: o merge é do usuário.

## Fora desta fase (registrado)

- **Validação com a distribuição de dono** ("Não é possível salvar. Este usuário recebe negócios por distribuição…"). Entra na 1K.
- **Opções do filtro "Dono" do quadro (1D)** reduzidas sob `own`/`own_and_unassigned`, como a Clint faz. A RLS já faz o resultado bater.
- **`crm_tasks`, `crm_proposals`, `contacts`** continuam por organização, como no original; a tela Tarefas mostra linhas de negócios que a pessoa não abre. A 2A lê `crm_leads` pela sessão e segue a regra.
- **Conversas** seguem `fn_can_view_conversation` (regra da organização). Q11.
- **`crm_pipeline_view_origens_select`** continua devolvendo o id de uma origem escondida dentro de uma Visualização; a página já descarta essas origens.
- **Permissões por chave** da Clint (`DEAL_VIEW_ALL_DEALS`, `DEAL_CHANGE_OWNER_ALL`, grupos de permissão): trilha à parte (PRD 2, pergunta 3).

## Self-review (feito ao escrever)

- **Cobertura:** D11 → Tasks 2 (banco), 4 (rota), 5 (seletor); D12 → Tasks 2 (banco, origem e grupo), 4 e 7 (rotas), 6 e 7 (telas); "o banco aplica a regra" → Tasks 2 e 3; "Visualização e filtros salvos respeitam" → Task 2 (§8 da migration) e Task 3; só admin passa por cima → N4 e Task 3; o aviso da Clint → Task 8; o dono → Task 9.
- **Nomes:** `fn_escale_pode_ver_negocio(org, dono, origem)` é o mesmo na migration, no teste de forma, na prova e em N5; `regraEmVigor`, `podeTrocarDono`, `avisoDaFicha`, `temAcessoAOrigem({ pessoas, pessoasDoGrupo })` (Task 1) são os que as Tasks 4 a 9 importam; `visualizacaoDaOrganizacao` e `pessoasDoGrupo` são os nomes na saída de `montar`, no `ContextoDaResposta`, na rota e nos fixtures; `permissoes.pessoas` (origem) e `pessoas` (grupo) são os nomes nos schemas, no rascunho e nos testes; `listaParaGravar` (Task 4) é a que a Task 7 reusa; `ListaDePessoas`, `ContadorDePessoas` e `membrosAtivosDaEquipe` (Task 6) são os que a Task 7 importa.
- **Sem placeholders:** cada passo de código traz o código; os pontos a conferir no repositório (o dublê de `crm_pipeline_groups` nos testes de rota, o `role` das opções do `SeletorMultiploDaCasca`) dizem o que fazer em cada caso.
