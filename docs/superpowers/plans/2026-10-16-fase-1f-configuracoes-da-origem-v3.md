# Fase 1F (v3) — Configurações da origem igual à Clint · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Este plano substitui** `2026-10-15-fase-1f-configuracoes-da-origem-v2.md` (v2), que não deve ser executado. Ele **continua usando o código da v2** (e, onde a v2 aponta, o da v1 `2026-10-15-fase-1f-configuracoes-da-origem.md`): cada task diz "v2, Task N" e lista só o que muda. O que muda desde a v2:
> - **a base mudou:** a 1E foi mergeada (PR #17, `b5b831a15`), com o fix `8c52e6cb8`, e a **1F-a** (`2026-10-16-fase-1f-a-campos-do-crm.md`) roda ANTES desta fase. A migration desta fase passa a ser a **9007**;
> - **os campos são do CRM** (decisão do usuário em 16/10, 1F-a): `settings.fields` de cada origem é a projeção do catálogo da organização. A subaba Campos obrigatórios lista os campos do CRM; a regra continua da origem (F19);
> - **a engrenagem da linha de contagem** (deixada desligada pela 1E, decisão E15) passa a abrir esta janela (F20);
> - **o rodapé do card** da 1E obedece à preferência "Idade do negócio": a pílula entra nesse lugar (F21);
> - **dois PRs** (F22): o v2 tinha 17 tasks. O PR A entrega a janela (Tasks 1 a 9); o PR B, os efeitos no quadro (Tasks 10 a 14);
> - **verificação enxuta** G1 (pendente de aprovação).

## Perguntas em aberto (respostas do usuário antes do "pode fazer")

| # | Pergunta | O que o plano faz se a resposta for "sim, como está" |
|---|---|---|
| Q1 | **Dois PRs** (A: a janela; B: os efeitos no quadro). Aceita? | F22 |
| Q2 | **G1, verificação enxuta** (seção "Verificação"). Aprova? | Sem aprovação, vale a da 1E |
| Q3 | **Engrenagem na Visualização:** não há print da Clint de uma visualização (quadro que junta origens) com a engrenagem. Ela fica desligada com "Em breve" lá, e só abre no quadro de uma origem. Está bem? | F20 |
| Q4 | **Engrenagem abaixo de gerente:** a janela é de gerente ou acima (F10). Para atendente e viewer a engrenagem fica desligada com a dica "Sem permissão" (o mesmo texto do "Negócio +" da 1E). A Clint não mostra esse caso. Está bem? | F20 |
| Q5 | **Pílula do prazo com "Idade do negócio" desligada** ("Personalizar cards", 1E): a pílula aparece no lugar da idade, então some junto quando a pessoa desliga a idade. Não há print da Clint com a idade desligada e um alerta salvo. Está bem? | F21 |
| Q6 | **Texto do vazio de Campos obrigatórios:** com os campos do CRM, o texto "Esta origem ainda não tem campos personalizados." vira **"Ainda não há campos personalizados no CRM."**, com o link "Criar campos em Configurações › Funis". Os dois textos são nossos (na Clint a lista sempre tem "Valor"). Está bem? | F19 |
| Q7 | **CI do fork:** o workflow `ci` está desligado à mão em `rgisjr/escale-crm` (`gh workflow list` mostra `ci  disabled_manually`; `e2e`, `perf`, `release` e `acolhida` também). O `ci.yml` dispara em todo `pull_request`, mas desligado ele não roda: por isso o PR #17 só rodou "Publicar imagem Docker (GHCR)". Quer ligar (`gh workflow enable ci -R rgisjr/escale-crm`)? Custo: os 4 `verify-parte` e o `invariants-majors` em `ubuntu-latest` a cada push de PR | Não liga nada |
| Q8 | **Espanhol "tú" ou "usted":** a correção final da 1E passou as entradas novas para "tú", como o resto do dicionário. A lista da v2 (Task 16) usa "usted" em alguns textos nossos ("Seleccione…", "Configure aquí su…"). Onde a Clint tem espanhol, vale o dela; onde o texto é nosso, o plano usa "tú". Está bem? | Task 9, Step 1 |

**Prints que faltam** (nenhum bloqueia; onde falta, o plano diz o desvio):
1. ❌ A mensagem depois de Salvar (sucesso e erro). Exige gravar na Clint (v2, item 7).
2. ❌ Um card de verdade com a pílula nas três cores, e um com a idade desligada (Q5). Exige gravar um alerta na Clint.
3. ❌ O modal "Campos obrigatórios pendentes" ao arrastar ("Salvar e mover") e ao ganhar/perder ("Salvar e alterar status"). Exige gravar na Clint.
4. ◐ O ⊕ do grupo clicado (v2, item 2) e a seção de tags com duas ou três tags (v2, item 5).
5. ❌ A engrenagem numa visualização da Clint (Q3) e com usuário sem permissão (Q4).
6. ❌ A janela carregando e com erro.
7. ◐ Etapas e atividades: o menu de uma etapa e a seta do "Salvar na origem" (são da 1I).
8. ❌ Configurações › Gerenciamento de campos da Clint (pedido na 1F-a, Q6 de lá).

**Goal:** A janela de configurações de uma origem, **idêntica à Clint, variante com menu superior** (itens D1 a D7 e B16 do PRD `docs/modulos/1-negocios.md`):
- aberta pelo ⋮ "Configurações" do painel Origens **e pela engrenagem da linha de contagem do quadro** (a da Clint, print `15` da 1E);
- abas **Geral** e **Etapas e atividades** (Integrações fora, D8);
- **Geral**, com o menu interno da Clint: Configurações Gerais (nome, grupo com "+", visualização, moeda, tags), Motivo de Perda (chips, contador, ⊕), Campos obrigatórios ("Ao sair" e "Ao entrar", **com os campos do CRM**), Alerta de tempo na etapa; as outras subabas "Em breve";
- rodapé único **Cancelar / Salvar**;
- no quadro da casca (PR B): a pílula do alerta no rodapé do card e o modal "Campos obrigatórios pendentes" no arrasto e no ⋮ do card.

**Architecture:** a da v2 (seção "Architecture"), com quatro mudanças:
- **Dados:** os mesmos `escale_*` em `crm_pipelines.settings`. `settings.fields` agora é a projeção do catálogo (1F-a, migration 9006): `camposDaOrigem(settings)` devolve os campos do CRM, e a gravação das regras continua regravando `fields` só com o `obrigatorio_em` novo (a 9006 não muda definição quando ela vem igual).
- **Banco:** migration **9007**, sem tabela nova: os dois gatilhos da v2 (moeda e tags no negócio novo).
- **Abrir pela engrenagem:** a linha de contagem dispara `abrirConfiguracoesDaOrigem(id)` (um evento do navegador); o `PainelOrigens`, dono da janela, escuta e abre a mesma janela do ⋮ "Configurações". Sem painel (falha ao ler as origens), a engrenagem fica desligada.
- **Rodapé do card:** o `PrazoDoCard` entra dentro do `itens.idade && idade ? … : null` da 1E.

**Tech Stack:** Postgres 15+/Supabase (gatilhos definer), Next.js 16 App Router, React 19, TypeScript estrito, Zod 4, TanStack Query 5, Radix (Dialog, Popover, Tabs), Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`.

## Referência visual (abrir o PNG antes de cada task de tela)

É a mesma da v2 (seção "Referências da Clint"): os prints P01 a P23 de 16/10, na pasta C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1f\ (arquivos 2026-10-16-NN-…), valem mais que as fichas. Acrescente:

| O quê | Imagem | Uso |
|---|---|---|
| A engrenagem da linha de contagem abre esta janela (Clint superior) | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\15-engrenagem-abre-config-da-origem.jpg | Task 6 (F20) |
| Os ícones da linha de contagem | docs/escale/clint/crops/icons-right.png (no repositório) | Task 6 |
| A lista "Adicionar campo obrigatório" mostra os campos da conta (NEGÓCIO) | P11 | Task 8 (F19) |

Os caminhos de imagem ficam **sem crase** neste plano: o guarda `tests/unit/evidencia-citada.test.ts` reprova o plano copiado para o repositório quando ele cita, entre crases ou em link, imagem que o git não versiona (uma das 4 regressões da 1E). Os textos da Clint usados nesta fase são os da v2 (seção "Textos da Clint usados nesta fase"), mais os de F19.

## Decisões desta fase

As F1 a F18 são as da v2, todas respondidas em 16/10. Resumo, com o que mudou:

| # | Decisão | Situação na v3 |
|---|---|---|
| F1 | A janela é a da Clint superior (01-013, P01) | continua |
| F2 | Um Salvar só para a aba Geral; Etapas e atividades com "Salvar na origem" desligado | continua |
| F3 | Moeda da origem, com bandeira; a da organização apaga a própria | continua |
| F4 | Tags vão para o contato, em todos os caminhos; sem `cliente`; até 10 | continua |
| F5 | Motivo de Perda: catálogo da organização (motivos de todas as origens), chips por origem, ⊕ com o balão "Nome" | continua. **Não** vale para campos: a Clint não escolhe campo por origem (1F-a, C2) |
| F6 | Campos obrigatórios: uma linha por regra (campo + Quando), Etapas e Status; limite de 50 regras; a regra nova nasce no primeiro lado | continua, com F19 |
| F7 | "Ao sair" no lugar de "Durante a etapa" | continua |
| F8 | A regra "Ao sair" vive na casca | continua |
| F9 | Alerta: valor e unidade em cada limite; exceção vence a geral; pílula cinza, âmbar, vermelha | continua, com F21 |
| F10 | Janela de gerente ou acima; Motivo de Perda e Campos obrigatórios só administrador | continua |
| F11 | "Visualização de negócios" desligada, "Em breve" (1J) | continua |
| F12 | Sem "Tornar esta a origem padrão" | continua. Atenção: a 1E **não** fez "origem obrigatória ao criar" (era um dos passos da F12); continua pendente (ver "Fora desta fase") |
| F13 | Subabas de outras fases: "Em breve" | continua. "Visualização de campos" é a D16 (esconder campo do CRM por origem, `hidden_fields` da Clint) |
| F14 | Etapas e atividades só para leitura | continua |
| F15 | Ícone vermelho de campo pendente na ficha: 1G/1H | continua |
| F16 | "Salvar e criar": quando a criação de negócio for refeita | continua (a 1E v2 não refez a criação; ver "Fora desta fase") |
| F17 | Poppins 300 nos textos dos campos desta janela | continua |
| F18 | Seletores com o visual do react-select da Clint (`aparencia="janela"`) | continua |
| **F19** | **Campos do CRM (1F-a):** a lista "Adicionar campo obrigatório" mostra todos os campos do CRM, agrupados em NEGÓCIO (P11). A regra (Quando, Etapas, Status) é desta origem. Erro de campo inexistente: "Esse campo não existe mais no CRM. Feche e abra de novo." Vazio: "Ainda não há campos personalizados no CRM." + o link "Criar campos em Configurações › Funis" (Q6) | novo |
| **F20** | **A engrenagem liga (E15 da 1E):** no quadro de uma origem, para gerente ou acima, ela abre esta janela (print `15` da 1E). Abaixo de gerente: desligada com "Sem permissão" (Q4). Na Visualização: desligada com "Em breve" (Q3). Sem o painel Origens (falha ao ler), desligada com "Em breve" | novo |
| **F21** | **A pílula ocupa o lugar da idade:** com "Idade do negócio" desligada na preferência da pessoa (1E), nem idade nem pílula (Q5) | novo |
| **F22** | **Dois PRs:** A = Tasks 1 a 9 (banco, regras, rota, componentes, janela, engrenagem, as quatro subabas, espanhol); B = Tasks 10 a 14 (o "ao sair" no quadro, a pílula no card, o modal, o ⋮ do card, a moeda nas telas). O PR B nasce da `main` depois do merge do A (Q1) | novo |
| **G1** | **Verificação enxuta (pendente de aprovação do usuário).** Ver "Verificação" | novo |

## O plano v2, task por task

| Task da v2 | O que era | Situação na v3 |
|---|---|---|
| 1. Migration 9005 | gatilhos da moeda e das tags | **Muda:** vira a **9007**, âncora depois do bloco 9006 da 1F-a. Junta com a prova. **Task 1** (PR A) |
| 2. Prova no Postgres | os dois gatilhos | **Muda:** ids `e5ca1e00-9007-`. **Task 1** |
| 3. Regras puras | tipos, alerta, campos, motivos | **Muda pouco:** a mensagem de campo inexistente e o comentário de `campos.ts` (F19). **Task 2** |
| 4. Gravação, montagem e rascunho | PATCH com várias seções | **Continua.** **Task 3** |
| 5. "Ao sair": o que falta | `ao-sair.ts` | **Continua,** no PR B. **Task 10** |
| 6. A rota | GET/PATCH `/configuracoes` | **Continua.** **Task 4** |
| 7. Componentes da Clint | alternância, seletores, chips, balão, abas, ajuda, bandeira | **Continua.** **Task 5** |
| 8. Janela e aba Etapas | moldura, menu interno, Etapas e atividades | **Muda:** mais a engrenagem (F20). **Task 6** |
| 9. Configurações Gerais | nome, grupo, visualização, moeda, tags | **Continua,** junta com a 10. **Task 7** |
| 10. Motivo de Perda | chips, contador, ⊕ | **Continua.** **Task 7** |
| 11. Campos obrigatórios | Ao sair / Ao entrar | **Muda:** o vazio e o teste (F19). Junta com a parte de tela da 12. **Task 8** |
| 12. Alerta e pílula | seção + `PilulaDoPrazo` + card | **Divide:** a seção e a `PilulaDoPrazo` (que a prévia "Como aparece no card" usa) ficam na **Task 8**; o encaixe no card vai para a **Task 11** (PR B), com F21 |
| 13. Modal e arrasto | `JanelaDeCamposPendentes`, `useMoverComCamposDaEtapa` | **Continua,** no PR B. **Task 12** |
| 14. ⋮ do card | `usePortaoAoSair` | **Continua,** no PR B. **Task 13** |
| 15. Moeda nas telas | `_client.tsx`, `QuadroDaVisualizacao`, `SecaoNegocio`, `NewLeadDialog` | **Muda:** linhas novas depois da 1E. **Task 14** (PR B) |
| 16. Espanhol | o bloco da fase | **Divide:** PR A (**Task 9**) põe a lista inteira; PR B (**Task 14**) só o que a gate ainda pedir |
| 17. Gates, PRD e PR | rodada cheia, worktree da `main` | **Muda:** G1 (uma rodada cheia em segundo plano, comparação com a lista das falhas conhecidas, sem worktree). **Tasks 9 e 14** |

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- **Base do PR A:** `escale-crm/main` com a 1E (PR #17), o fix `8c52e6cb8` e a **1F-a mergeados**. A Task 1 prova. Se faltar a 1F-a, PARE e pergunte.
- **Branches:** PR A `feat/fase-1f-configuracoes-da-origem`; PR B `feat/fase-1f-efeitos-no-quadro`, criada da `escale-crm/main` **depois** do merge do PR A (Task 10 prova).
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:** push em `origin` (Rafael), merge, tag, release, VPS e gravar no banco de produção.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` precisa do Docker; se `docker info` falhar, PARE e peça ao usuário.

### Migration 9007

- Arquivo: `supabase/migrations/20261022120000_9007_configuracoes_da_origem.sql`. A última da `main` depois da 1F-a é a 9006 (`20261021120000_9006_campos_do_crm.sql`). Se houver uma maior, use o próximo número livre e um timestamp maior, em TODAS as tasks.
- Primeira linha `-- manifest:`, numa linha só; sem linha no `MANIFEST.md`.
- O MESMO SQL vai para `supabase/baseline.sql`, logo ANTES de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` e depois do bloco 9006, com o cabeçalho `-- ---- FORK ESCALE · configurações da origem (migration 9007) ----`.
- Sem tabela nova: a varredura de RLS não muda.

### Chaves em `crm_pipelines.settings`

As da v2 (`escale_moeda`, `escale_tags_padrao`, `escale_motivos_inativos`, `escale_ao_sair`, `escale_alerta_tempo`). As chaves de `escale_ao_sair` são chaves de campo do CRM; campo apagado do CRM deixa a chave órfã, que a leitura ignora (1F-a, C8). `fields` é da 1F-a: a projeção do catálogo; a regra `obrigatorio_em` de cada item é desta origem.

### Design da casca e textos

Os da v2 (seções "Design da casca" e "Textos e i18n"), sem mudança. Toda tela termina comparando com o print citado. Conferência visual: a do contrato (v2, "Conferência visual"); as diferenças vão num PR `fix/fase-1f-conferencia`.

### Onde o fork entra nos arquivos do original

A tabela da v2, com estas mudanças:

| Arquivo | Mudança na v3 |
|---|---|
| `lib/i18n/dicionario.ts` | bloco novo logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`. Depois da 1E e da 1F-a, ele fica depois dos blocos `Fase 1E (Task N)` e do bloco da 1F-a |
| `components/kanban/KanbanBoard.tsx` | os encaixes da v2 (Task 13). A 1E acrescentou outros `FORK ESCALE · Fase 1E` no mesmo arquivo (`useMoveCard` está na linha ~153): não mexa neles |
| `components/kanban/KanbanCardActions.tsx`, `hooks/kanban/useMotivosDePerdaDoFunil.ts`, `components/kanban/NewLeadDialog.tsx` | os da v2. No `NewLeadDialog`, a 1E pôs a prop `etapaInicial`; a moeda é a linha `const moedaDoValor = org?.currency ?? MOEDA_PADRAO;` (linha ~98) |
| `app/app/pipelines/[id]/_client.tsx` | novo nesta fase: a engrenagem (Task 6) e a moeda do recorte (Task 14), ao lado dos encaixes da 1D e da 1E |

Os arquivos do fork que esta fase toca e que a 1E mudou: `LinhaDeContagem.tsx` (a engrenagem), `BarraDoQuadro.tsx` (props novas), `PainelOrigens.tsx` (escuta a engrenagem), `PecasDoCard.tsx` (pílula dentro do `itens.idade`). O `MenuDaEngrenagem.tsx` **não existe mais** (a 1E apagou); o plano não o cita.

### Testes da 1E que esta fase muda de propósito

| Teste | O que pinava | Por quê muda |
|---|---|---|
| `tests/unit/escale-linha-de-contagem-1e.test.tsx` | "a engrenagem fica para a 1F: desligada, com a dica 'Em breve'" | F20: com `aoConfigurar`, ela liga; sem, continua "Em breve" (Visualização) ou "Sem permissão" |
| `tests/unit/escale-alerta-de-tempo.test.tsx` (da v2) | `<span title="Tempo na etapa">` direto no rodapé | F21: o rodapé da 1E já tem `itens.idade && idade ? … : null` |

### Cercas que precisam ficar verdes

As da v2 ("Cercas que continuam") e as da 1E: `controle-decorativo` (todo botão desligado tem `title`: a engrenagem desligada tem), `tailwind-tokens`, `selecao-longa-tem-busca`, `escale-casca-v2-original-intacto` (o original não importa `@/…/escale/` nas peças do shell), `evidencia-citada`, `vocabulario-do-funil` (nenhum texto de tela com "pipeline"; cuidado com os nomes de variável em linha de JSX: foi uma regressão da 1E), `lib/clipboard.test.ts` (nada de `navigator.clipboard` cru), `audit-resource-id-e-uuid` (auditoria com `resourceId` uuid: a rota da v2 usa o id da origem, que é uuid).

### Verificação (G1 — pendente de aprovação do usuário)

Se o usuário **não** aprovar a G1, vale a verificação da 1E. Se aprovar:

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit tests/invariants lib app components --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode com `corepack pnpm vitest run <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db` só na Task 1** (a 9007 muda o que acontece ao inserir em `crm_leads`): o arquivo de prova, mais as três varreduras de definer (`hardening-definer-varredura`, `definer-membership-varredura`, `definer-nova-nasce-exposta`), que são os guardas que leem as funções novas. A 9007 não cria tabela: `rls-completude-varredura`, `rbac-config-ia-canais` e `travas-de-suporte-cobrem-toda-tabela-na-instalacao` não mudam e só entram na rodada cheia.
3. **Revisor (subagente) só** nas Tasks 1 (migration), 4 (rota), 6 (janela) e 8 (Campos e Alerta) do PR A, e 12 (modal e arrasto) do PR B. As outras são checadas pelo controlador, lendo o diff.
4. **Uma rodada cheia por PR**, no fim (Tasks 9 e 14), em segundo plano enquanto o texto do PR é escrito. Sem worktree da `main`: as falhas são comparadas com `.superpowers/sdd/falhas-conhecidas.txt` (a lista que a 1F-a, Task 5, Step 1, grava; se o arquivo não existir, crie-o com o mesmo conteúdo).
5. **Conferência visual** do contrato só no fim de cada PR (CAMINHO A ou B), não por task.

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório no PR A (Task 1).

## Arquivos

Os da v2 (seção "Arquivos"), com estas mudanças:

| Arquivo | Novo/alterado | PR | Responsabilidade |
|---|---|---|---|
| `supabase/migrations/20261022120000_9007_configuracoes_da_origem.sql`, `supabase/baseline.sql` | novo / bloco | A | gatilhos da moeda e das tags |
| `lib/escale/configuracoes/abrir.ts` | novo | A | o evento "abrir as configurações da origem" |
| `components/escale/filtros/LinhaDeContagem.tsx`, `BarraDoQuadro.tsx`, `components/escale/origens/PainelOrigens.tsx`, `app/app/pipelines/[id]/_client.tsx` | alterados | A | a engrenagem (F20) |
| `tests/unit/escale-engrenagem-da-origem.test.tsx`, `tests/unit/escale-linha-de-contagem-1e.test.tsx` | novo / alterado | A | a engrenagem |
| `components/escale/configuracoes/PilulaDoPrazo.tsx` | novo | A | a pílula (prévia e card) |
| `components/escale/quadro/PecasDoCard.tsx` | alterado | B | a pílula dentro do `itens.idade` (F21) |
| os demais da v2 | — | A ou B, conforme a task | — |

---

# PR A — A janela da origem

### Task 1: Branch, migration 9007, baseline e prova no Postgres

**É a v2, Tasks 1 e 2, com estas trocas.**

**Files:**
- Create: `supabase/migrations/20261022120000_9007_configuracoes_da_origem.sql`, `tests/unit/escale-configuracoes-da-origem-migration.test.ts`, `tests/invariants/escale-configuracoes-da-origem.test.ts`
- Modify: `supabase/baseline.sql`
- Copy: este plano (`-v3.md`) para `docs/superpowers/plans/`

**Interfaces:** as da v1 (Task 1): `fn_escale_lead_nasce_na_moeda_da_origem` + `trg_escale_lead_nasce_na_moeda_da_origem` (BEFORE INSERT) e `fn_escale_tags_padrao_no_contato` + `trg_escale_tags_padrao_no_contato` (AFTER INSERT).

- [ ] **Step 1: A base e a branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:supabase/migrations/20261020120000_9005_capas_do_card.sql && echo "1E ok"
git cat-file -e escale-crm/main:supabase/migrations/20261021120000_9006_campos_do_crm.sql && echo "1F-a ok"
git cat-file -e escale-crm/main:components/escale/filtros/MenuDaEngrenagem.tsx 2>/dev/null && echo "ATENÇÃO: MenuDaEngrenagem voltou" || echo "sem MenuDaEngrenagem ok"
git ls-tree --name-only escale-crm/main supabase/migrations/ | sort | tail -3
git switch -c feat/fase-1f-configuracoes-da-origem escale-crm/main
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-16-fase-1f-configuracoes-da-origem-v3.md" docs/superpowers/plans/
```
Expected: `1E ok`, `1F-a ok`, `sem MenuDaEngrenagem ok`; a última migration é a 9006. Sem `1F-a ok`, PARE.

- [ ] **Step 2: O teste da migration**

Crie `tests/unit/escale-configuracoes-da-origem-migration.test.ts` com o conteúdo da **v1, Task 1, Step 2**, trocando:
- `20261021120000_9006_configuracoes_da_origem.sql` → `20261022120000_9007_configuracoes_da_origem.sql`;
- `MIGRATION_9005` / `20261020120000_9005_capas_do_card.sql` → `MIGRATION_9006` / `20261021120000_9006_campos_do_crm.sql`;
- o cabeçalho `(migration 9006)` → `(migration 9007)`;
- os textos "9006" → "9007" e "bloco 9005" → "bloco 9006".

Rode `corepack pnpm vitest run tests/unit/escale-configuracoes-da-origem-migration.test.ts`. Expected: FAIL em "a migration existe".

- [ ] **Step 3: A migration e o baseline**

Crie a migration com o SQL da **v1, Task 1, Step 4**, trocando a segunda linha para `-- 9007: configurações da origem (fork Escale).` e, nos dois `comment on function`, `Fork Escale (9006)` por `Fork Escale (9007)`. O resto é igual, byte a byte.

Rode o script da **v1, Task 1, Step 5**, trocando `MIG` pelo arquivo 9007, `CAB` por `-- ---- FORK ESCALE · configurações da origem (migration 9007) ----` e a conferência do bloco anterior por `-- ---- FORK ESCALE · campos do CRM (migration 9006) ----` (mensagem de erro "bloco 9006 ausente").

```bash
corepack pnpm vitest run tests/unit/escale-configuracoes-da-origem-migration.test.ts tests/unit/escale-campos-do-crm-migration.test.ts tests/unit/escale-capas-do-card-migration.test.ts tests/unit/baseline-reaplicavel.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/check-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/apendice-do-baseline-nao-diverge-da-cadeia.test.ts tests/unit/sonda-do-baseline-ancora-na-ultima-definicao.test.ts tests/unit/baseline-no-piso-do-postgres.test.ts tests/unit/varredura-anon-e-o-ultimo-bloco.test.ts tests/unit/baseline-nao-constroi-o-que-derruba.test.ts tests/unit/baseline-nao-reconcede-o-que-revoga.test.ts tests/unit/baseline-constraint-reconstruida.test.ts
bash scripts/checar-colisao-de-migration.sh escale-crm/main
```
Expected: os 13 PASS (confira que os 13 aparecem) e "OK, 1 migration nova".

- [ ] **Step 4: A prova no Postgres**

Crie `tests/invariants/escale-configuracoes-da-origem.test.ts` com o da **v1, Task 2, Step 1**, trocando o prefixo dos ids `e5ca1e00-9006-` → `e5ca1e00-9007-`, os slugs `escale-9006-` → `escale-9007-`, os nomes `(9006)` → `(9007)` e o comentário `migration 9006` → `migration 9007`.

```bash
docker info --format '{{.ServerVersion}}'
corepack pnpm test:db tests/invariants/escale-configuracoes-da-origem.test.ts tests/invariants/hardening-definer-varredura.test.ts tests/invariants/definer-membership-varredura.test.ts tests/invariants/definer-nova-nasce-exposta.test.ts 2>&1 | tail -25
```
Expected: os 4 PASS e `==> test:db verde`. As notas de falha da v1 (Task 2, Step 2) valem.

- [ ] **Step 5: Revisão e commits**

Revisor (subagente, G1): a migration. Depois:

```bash
git add supabase/migrations/20261022120000_9007_configuracoes_da_origem.sql supabase/baseline.sql tests/unit/escale-configuracoes-da-origem-migration.test.ts docs/superpowers/plans/2026-10-16-fase-1f-configuracoes-da-origem-v3.md
git commit -m "feat(escale): moeda e tags padrão da origem no negócio novo (migration 9007)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git add tests/invariants/escale-configuracoes-da-origem.test.ts
git commit -m "test(escale): prova no Postgres das tags padrão no contato e da moeda da origem

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: As regras puras de cada seção

**É a v2, Task 3, com duas mudanças (F19).** Files, interfaces e os outros passos são os da v2.

- [ ] **Step 1: Os testes** — os da v2 (Task 3, Step 1), trocando no caso "recusa campo inexistente, etapa de fora e mais de 50 regras":

```ts
      erro: "Esse campo não existe mais nesta origem. Feche e abra de novo.",
```

por

```ts
      erro: "Esse campo não existe mais no CRM. Feche e abra de novo.",
```

- [ ] **Step 2:** rodar e ver falhar (v2, Task 3, Step 2).

- [ ] **Step 3 a 6: `tipos.ts`, `alerta.ts`, `campos.ts` e `motivos.ts`** — os da v2 (Task 3, Steps 3 a 6), com duas trocas em `campos.ts`:
  - no comentário do topo, depois da linha `* ficam guardadas: a pessoa não as vê e a gravação não as apaga.`, acrescente:
    ```ts
     *
     * Os CAMPOS são do CRM (Fase 1F-a, migration 9006): `settings.fields` é a
     * projeção do catálogo da organização, então `camposDaOrigem` devolve todos
     * os campos do CRM. A REGRA (`obrigatorio_em`, `escale_ao_sair`) é desta origem.
    ```
  - troque `return { ok: false, erro: "Esse campo não existe mais nesta origem. Feche e abra de novo." };` por `return { ok: false, erro: "Esse campo não existe mais no CRM. Feche e abra de novo." };`.

- [ ] **Step 7: Verificar (G1).** `corepack pnpm vitest run tests/unit/escale-configuracoes-regras.test.ts`, typecheck e `corepack pnpm exec eslint lib/escale/configuracoes tests/unit/escale-configuracoes-regras.test.ts`. Expected: PASS. As notas da v2 (Task 3, Step 7) valem. Controlador confere.

- [ ] **Step 8:** commit `feat(escale): regras das configurações da origem no modelo da Clint (campos do CRM)`.

---

### Task 3: A gravação, o que a tela recebe e o rascunho da janela

**É a v2, Task 4, sem mudança.** Verificação (G1): `tests/unit/escale-configuracoes-gravar.test.ts` e `tests/unit/escale-configuracoes-regras.test.ts`, typecheck, eslint de `lib/escale/configuracoes`. Controlador confere. Commit o da v2.

---

### Task 4: A rota das configurações da origem

**É a v2, Task 6, sem mudança.** O catálogo de motivos continua a união das origens (F5). Os campos chegam de `camposDaOrigem(pipeline.settings)`, que já é o catálogo do CRM (1F-a).

Verificação (G1): `tests/unit/escale-configuracoes-rota.test.ts`, `tests/unit/suporte-cobertura-de-efeitos.test.ts`, `tests/unit/audit-resource-id-e-uuid.test.ts`, typecheck, eslint dos arquivos da task. **Revisor (subagente):** rota nova. Commit o da v2.

---

### Task 5: Os componentes da Clint que a V1 não tinha

**É a v2, Task 7, sem mudança.** O script do `icons-da-casca` já pula os nomes exportados (a 1E acrescentou `ArrowUpDown, Briefcase, Calendar, Copy, DollarSign, Pin, PinOff, Tag` e outros seis). Verificação (G1): `tests/unit/escale-ui-componentes-da-1f.test.tsx` e os guardas que leem `SeletorDaCasca.tsx`, `icons-da-casca.ts` e `escale-tema.css` (comando da G1), typecheck, eslint. Controlador confere (componentes pequenos, cada um com teste). Commit o da v2.

---

### Task 6: A janela da origem, a aba Etapas e atividades e a engrenagem (F20)

**É a v2, Task 8, mais a engrenagem.** Faça primeiro tudo da v2 (Task 8, Steps 1 a fim, sem o commit); depois os Steps abaixo.

**Files (a mais que a v2):**
- Create: `lib/escale/configuracoes/abrir.ts`, `tests/unit/escale-engrenagem-da-origem.test.tsx`
- Modify: `components/escale/filtros/LinhaDeContagem.tsx`, `components/escale/filtros/BarraDoQuadro.tsx`, `components/escale/origens/PainelOrigens.tsx`, `app/app/pipelines/[id]/_client.tsx`, `tests/unit/escale-linha-de-contagem-1e.test.tsx`

**Interfaces:**
- Produces:
  - `EVENTO_DAS_CONFIGURACOES = "escale:configuracoes-da-origem"`, `abrirConfiguracoesDaOrigem(id: string): void` e `useAoAbrirConfiguracoesDaOrigem(aoAbrir: (id: string) => void): void` (`lib/escale/configuracoes/abrir.ts`);
  - `LinhaDeContagem` ganha `configurar?: () => void` e `dicaDaEngrenagem?: string`;
  - `BarraDoQuadro` ganha `aoConfigurar?: () => void` e `dicaDaEngrenagem?: string` e os passa à linha.

- [ ] **Step A: Os testes da engrenagem (vão falhar)**

Create `tests/unit/escale-engrenagem-da-origem.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LinhaDeContagem } from "@/components/escale/filtros/LinhaDeContagem";
import {
  EVENTO_DAS_CONFIGURACOES,
  abrirConfiguracoesDaOrigem,
  useAoAbrirConfiguracoesDaOrigem,
} from "@/lib/escale/configuracoes/abrir";

/** FORK ESCALE · Fase 1F (F20): a engrenagem da linha de contagem abre as configurações da origem (print 15 da 1E). */
function Escuta({ aoAbrir }: { aoAbrir: (id: string) => void }) {
  useAoAbrirConfiguracoesDaOrigem(aoAbrir);
  return null;
}

describe("a engrenagem da linha de contagem", () => {
  it("com configurar: ligada, com a dica da Clint, e o clique chama", async () => {
    const configurar = vi.fn();
    render(<LinhaDeContagem contagem={3} ordemAtiva={false} onAtualizar={() => {}} configurar={configurar} />);
    const engrenagem = screen.getByRole("button", { name: "Configurações da origem" });
    expect(engrenagem).toBeEnabled();
    expect(engrenagem).toHaveAttribute("title", "Configurações da origem");
    await userEvent.click(engrenagem);
    expect(configurar).toHaveBeenCalledTimes(1);
  });

  it("sem configurar: desligada, com a dica pedida ou 'Em breve'", () => {
    const { unmount } = render(
      <LinhaDeContagem contagem={3} ordemAtiva={false} onAtualizar={() => {}} dicaDaEngrenagem="Sem permissão" />,
    );
    expect(screen.getByRole("button", { name: "Configurações da origem" })).toHaveAttribute("title", "Sem permissão");
    expect(screen.getByRole("button", { name: "Configurações da origem" })).toBeDisabled();
    unmount();
    render(<LinhaDeContagem contagem={3} ordemAtiva={false} onAtualizar={() => {}} />);
    expect(screen.getByRole("button", { name: "Configurações da origem" })).toHaveAttribute("title", "Em breve");
  });

  it("o evento leva o id da origem a quem escuta, e parar de escutar desliga", () => {
    const aoAbrir = vi.fn();
    const { unmount } = render(<Escuta aoAbrir={aoAbrir} />);
    abrirConfiguracoesDaOrigem("f-1");
    expect(aoAbrir).toHaveBeenCalledWith("f-1");
    unmount();
    window.dispatchEvent(new CustomEvent(EVENTO_DAS_CONFIGURACOES, { detail: { id: "f-2" } }));
    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });
});
```

Em `tests/unit/escale-linha-de-contagem-1e.test.tsx`, troque o caso

```tsx
  it("a engrenagem fica para a 1F: desligada, com a dica 'Em breve'", () => {
```

por

```tsx
  // Fase 1F (F20): sem `aoConfigurar` (Visualização), a engrenagem continua desligada com "Em breve".
  it("sem aoConfigurar, a engrenagem fica desligada, com a dica 'Em breve'", () => {
```

O corpo do caso não muda.

```bash
corepack pnpm vitest run tests/unit/escale-engrenagem-da-origem.test.tsx
```
Expected: FAIL com `Failed to resolve import "@/lib/escale/configuracoes/abrir"`.

- [ ] **Step B: O evento**

Create `lib/escale/configuracoes/abrir.ts`:

```ts
"use client";
import { useEffect, useRef } from "react";

/**
 * ABRIR AS CONFIGURAÇÕES DA ORIGEM DE FORA DO PAINEL (fork Escale, Fase 1F, F20).
 *
 * A janela mora no `PainelOrigens` (o ⋮ "Configurações" da origem). A engrenagem
 * da linha de contagem do quadro, que na Clint abre a mesma janela (print 15 da
 * 1E), fica em outro galho da árvore: um evento do navegador liga os dois sem
 * contexto novo no layout. Sem painel montado, ninguém escuta (por isso a
 * página só liga a engrenagem quando o painel existe).
 */
export const EVENTO_DAS_CONFIGURACOES = "escale:configuracoes-da-origem";

export function abrirConfiguracoesDaOrigem(id: string): void {
  window.dispatchEvent(new CustomEvent(EVENTO_DAS_CONFIGURACOES, { detail: { id } }));
}

export function useAoAbrirConfiguracoesDaOrigem(aoAbrir: (id: string) => void): void {
  const ultimo = useRef(aoAbrir);
  useEffect(() => {
    ultimo.current = aoAbrir;
  }, [aoAbrir]);
  useEffect(() => {
    const ouvir = (e: Event) => {
      const id = (e as CustomEvent<{ id?: unknown }>).detail?.id;
      if (typeof id === "string" && id.length > 0) ultimo.current(id);
    };
    window.addEventListener(EVENTO_DAS_CONFIGURACOES, ouvir);
    return () => window.removeEventListener(EVENTO_DAS_CONFIGURACOES, ouvir);
  }, []);
}
```

- [ ] **Step C: A linha de contagem e a barra**

C1. Em `components/escale/filtros/LinhaDeContagem.tsx`:
- no comentário do topo, troque `` Exportar (Fase 1E) só para gerente ou acima no funil; a\n * engrenagem (1F) e a ajuda seguem desligadas (D6; PRINTS 15 e 17). `` por `` Exportar (Fase 1E) só para gerente ou acima no funil; a\n * engrenagem abre as configurações da origem (Fase 1F, print 15); a ajuda segue desligada (D6). ``;
- na lista de props, logo depois de `  exportar,`, acrescente `  configurar,` e `  dicaDaEngrenagem,`;
- no tipo das props, logo depois de `  exportar?: ReactNode;`, acrescente:
  ```tsx
  /** Fase 1F (F20): abre as configurações da origem. Ausente = engrenagem desligada. */
  configurar?: () => void;
  /** Fase 1F: a dica da engrenagem desligada ("Sem permissão"); ausente = "Em breve". */
  dicaDaEngrenagem?: string;
  ```
- troque o bloco da engrenagem

  ```tsx
        {/* FORK ESCALE · Fase 1E (E15): a engrenagem abre a configuração da origem na Clint (print 15). Liga na 1F. */}
        <BotaoDaCasca
          type="button"
          variante="icone"
          disabled
          aria-label={t("Configurações da origem")}
          title={t("Em breve")}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Settings size={16} aria-hidden />
        </BotaoDaCasca>
  ```
  por
  ```tsx
        {/* Fase 1F (F20): a engrenagem abre as configurações da origem, como na Clint (print 15 da 1E). */}
        <BotaoDaCasca
          type="button"
          variante="icone"
          disabled={!configurar}
          onClick={configurar}
          aria-label={t("Configurações da origem")}
          title={configurar ? t("Configurações da origem") : (dicaDaEngrenagem ?? t("Em breve"))}
          className="disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          <Settings size={16} aria-hidden />
        </BotaoDaCasca>
  ```

C2. Em `components/escale/filtros/BarraDoQuadro.tsx`:
- em `BarraDoQuadroProps`, logo depois de `  exportacao?: ExportacaoDoQuadro;`, acrescente:
  ```tsx
  /** Fase 1F (F20): a engrenagem abre as configurações da origem (gerente ou acima, só no funil). */
  aoConfigurar?: () => void;
  /** Fase 1F: a dica da engrenagem desligada; ausente = "Em breve". */
  dicaDaEngrenagem?: string;
  ```
- na desestruturação, logo depois de `  exportacao,`, acrescente `  aoConfigurar,` e `  dicaDaEngrenagem,`;
- no `<LinhaDeContagem …>`, logo depois da prop `ordenar={…}` (antes de `/>`), acrescente:
  ```tsx
        // Fase 1F (F20): a engrenagem da Clint abre as configurações da origem.
        configurar={aoConfigurar}
        dicaDaEngrenagem={dicaDaEngrenagem}
  ```

- [ ] **Step D: O painel escuta, a página liga**

D1. Em `components/escale/origens/PainelOrigens.tsx`:
- acrescente `import { useAoAbrirConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/abrir";` junto dos imports de `@/lib/escale/…`;
- logo DEPOIS de `  const [janela, setJanela] = useState<Janela | null>(null);`, acrescente:
  ```tsx
  // Fase 1F (F20): a engrenagem do quadro abre a mesma janela do ⋮ "Configurações".
  useAoAbrirConfiguracoesDaOrigem((id) => setJanela({ tipo: "config-origem", id }));
  ```
  Confira o nome do tipo da janela de configurações em `JanelasDeOrigens.tsx` (`tipo: "config-origem"`, linha ~28). Se a v2 (Task 8) tiver mudado o nome, use o novo.

D2. Em `app/app/pipelines/[id]/_client.tsx`:
- acrescente, junto dos outros imports do fork, `// FORK ESCALE · Fase 1F: a engrenagem abre as configurações da origem (F20).` e `import { abrirConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/abrir";`;
- no `<BarraDoQuadro …>`, logo DEPOIS do bloco `exportacao={ … }`, acrescente:
  ```tsx
          // FORK ESCALE · Fase 1F (F20): a engrenagem abre as configurações da origem (a janela é de gerente ou acima).
          aoConfigurar={ROLE_RANK[role] >= ROLE_RANK.manager ? () => abrirConfiguracoesDaOrigem(pipelineId) : undefined}
          dicaDaEngrenagem={t("Sem permissão")}
  ```

O painel só existe com a casca e quando as origens foram lidas (`ComOrigens`). A `BarraDoQuadro` também só existe com a casca (`cascaNova`). Se o painel falhou ao ler as origens, a engrenagem fica ligada mas sem efeito: aceitável e raro (o quadro abre sem painel). Registre no PR.

- [ ] **Step E: Verificar (G1), revisão e commit**

```bash
corepack pnpm vitest run tests/unit/escale-janela-da-origem.test.tsx tests/unit/escale-janelas-de-origens.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/escale-engrenagem-da-origem.test.tsx tests/unit/escale-linha-de-contagem-1e.test.tsx tests/unit/escale-barra-do-quadro.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm typecheck
corepack pnpm exec eslint lib/escale/configuracoes/abrir.ts components/escale/filtros/LinhaDeContagem.tsx components/escale/filtros/BarraDoQuadro.tsx components/escale/origens/PainelOrigens.tsx "app/app/pipelines/[id]/_client.tsx" components/escale/configuracoes tests/unit/escale-engrenagem-da-origem.test.tsx
```
Mais os guardas que leem os arquivos tocados (comando da G1): espere `controle-decorativo`, `vocabulario-do-funil`, `escale-casca-v2-original-intacto`. Expected: PASS.

Conferência visual: a janela aberta pela engrenagem é a mesma do ⋮ (P01, print 15 da 1E).

**Revisor (subagente):** a janela (UI grande) e a engrenagem. Depois:

```bash
git add -A components/escale/configuracoes hooks/escale/useConfiguracoesDaOrigem.ts components/escale/origens lib/escale/configuracoes/abrir.ts components/escale/filtros/LinhaDeContagem.tsx components/escale/filtros/BarraDoQuadro.tsx "app/app/pipelines/[id]/_client.tsx" tests/unit/escale-janela-da-origem.test.tsx tests/unit/escale-janelas-de-origens.test.tsx tests/unit/escale-painel-origens.test.tsx tests/unit/escale-engrenagem-da-origem.test.tsx tests/unit/escale-linha-de-contagem-1e.test.tsx
git commit -m "feat(escale): a janela da origem como na Clint, aberta pelo ⋮ e pela engrenagem do quadro

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Configurações Gerais e Motivo de Perda

**São a v2, Tasks 9 e 10, sem mudança, em sequência** (os dois testes primeiro, depois as duas seções). O encaixe em `hooks/kanban/useMotivosDePerdaDoFunil.ts` é o da v2 (Task 10).

Verificação (G1): `tests/unit/escale-secao-gerais.test.tsx`, `tests/unit/escale-secao-motivos.test.tsx`, `tests/unit/escale-janela-da-origem.test.tsx`, os testes do original que leem `useMotivosDePerdaDoFunil` (`grep -rl useMotivosDePerdaDoFunil tests components hooks --include='*.test.*'`), `selecao-longa-tem-busca`, typecheck, eslint. Controlador confere e compara com P01 a P09. Um commit para cada seção, com as mensagens da v2.

---

### Task 8: Campos obrigatórios (F19) e Alerta de tempo na etapa (tela)

**É a v2, Task 11 inteira, mais a v2, Task 12 sem o encaixe no card** (o Step 4 da v2 e o `describe("o card da casca usa o prazo")` vão para a Task 11 deste plano).

**Mudanças na parte de Campos (F19):**

8a. Nos "Detalhes visuais" da v2 (Task 11), a linha "Origem sem nenhum campo personalizado" passa a ser: **CRM sem nenhum campo personalizado:** "Ainda não há campos personalizados no CRM." e o link "Criar campos em Configurações › Funis" (textos nossos, Q6). A lista "Adicionar campo obrigatório" mostra todos os campos do CRM (`config.campos`), agrupados em NEGÓCIO, como no P11.

8b. No código da `SecaoCampos` (v2, Task 11, Step 3), troque

```tsx
          <p>{t("Esta origem ainda não tem campos personalizados.")}</p>
```

por

```tsx
          {/* Fase 1F (F19): os campos são do CRM (1F-a), não da origem. */}
          <p>{t("Ainda não há campos personalizados no CRM.")}</p>
```

8c. No teste `tests/unit/escale-secao-campos.test.tsx` (v2, Task 11, Step 1), use o `abrirCampos(config = CONFIG)` com o parâmetro (como o `abrir(config = CONFIG)` do teste de motivos) e acrescente dentro do `describe("Campos obrigatórios", …)`:

```tsx
  it("sem nenhum campo no CRM: o aviso e o link para Configurações › Funis (F19)", async () => {
    await abrirCampos({ ...CONFIG, campos: [], regras: [] });
    expect(screen.getByText("Ainda não há campos personalizados no CRM.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar campos em Configurações › Funis" })).toHaveAttribute(
      "href",
      "/app/settings/tenant/pipelines",
    );
  });

  it("a lista de campos é a do CRM, agrupada em NEGÓCIO (P11)", async () => {
    const user = await abrirCampos();
    await user.click(screen.getByRole("combobox", { name: "Adicionar campo obrigatório" }));
    expect(await screen.findByText("NEGÓCIO")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Proposta" })).toBeInTheDocument();
  });
```

(Se a v2 escreve "Negócio" no cabeçalho do grupo e o CSS o põe em maiúsculas, troque `"NEGÓCIO"` pelo texto que está no DOM.)

**Mudanças na parte de Alerta:** nenhuma no código. O arquivo `tests/unit/escale-alerta-de-tempo.test.tsx` desta task leva só o `describe("PrazoDoCard (B16)", …)`; o `describe("o card da casca usa o prazo", …)` entra na Task 11. A `PilulaDoPrazo.tsx` (v2, Task 12, Step 3) é criada aqui, porque a prévia "Como aparece no card" a usa.

**Verificação (G1):** `tests/unit/escale-secao-campos.test.tsx`, `tests/unit/escale-alerta-de-tempo.test.tsx`, `tests/unit/escale-secao-alerta.test.tsx`, `tests/unit/escale-janela-da-origem.test.tsx`, `selecao-longa-tem-busca`, `tailwind-tokens`, typecheck, eslint. **Revisor (subagente):** UI grande. Compare com P10 a P19.

Commits: o da v2 (Task 11) e `feat(escale): alerta de tempo na etapa como na Clint (a seção e a pílula da prévia)`.

---

### Task 9: Espanhol, a rodada cheia, PRD e o PR A

- [ ] **Step 1: O espanhol.** É a v2, Task 16, com:
  - a mesma âncora (`  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`); o bloco novo fica depois dos blocos da 1E e da 1F-a;
  - o mesmo script, que pula chave já existente com ou sem aspas. A 1E já trouxe, entre outras, "Em breve", "Configurações da origem", "Sem permissão", "Ajuda" e "Tempo na etapa": o script as pula;
  - na lista `ENTRADAS`, troque `| Esta origem ainda não tem campos personalizados. | … |` (se estiver lá) por estas duas linhas:

    | pt | es |
    |---|---|
    | Ainda não há campos personalizados no CRM. | Todavía no hay campos personalizados en el CRM. |
    | Esse campo não existe mais no CRM. Feche e abra de novo. | Ese campo ya no existe en el CRM. Cierra y vuelve a abrir. |

  - **registro (Q8):** onde a Clint tem espanhol, use o dela; onde o texto é nosso, use "tú", como o resto do dicionário depois da correção final da 1E (por exemplo, "Configura aquí tu origen de datos" só se a Clint não tiver o texto; "Seleccione el tipo de moneda…" é da Clint e fica);
  - a lista inteira da v2 entra aqui, inclusive os textos do PR B (modal e "Salvar e mover"): chave sem uso não reprova nenhuma cerca, e o PR B fica só com o que a gate ainda pedir.

  Rode `corepack pnpm vitest run tests/unit/i18n` e o typecheck. A gate não lê `app/api`: confira à mão os textos da rota (v2, Task 6). Commit `feat(escale): espanhol das configurações da origem`.

- [ ] **Step 2: A rodada cheia, em segundo plano (G1).** Os mesmos comandos da 1F-a (Task 5, Step 2), com os logs `1f-pra-*` no lugar de `1f-a-*`. Enquanto rodam, faça os Steps 3 e 4. Depois, a comparação com `.superpowers/sdd/falhas-conhecidas.txt` (mesmo script da 1F-a). Expected: `novas: 0`, gates rápidos com `rapidos=0`, `test:db` verde (as duas lentas conhecidas podem falhar na rodada cheia e passam sozinhas).

- [ ] **Step 3: Conferência visual.** A do contrato (v2, Task 17, Step 4): com CAMINHO A, compare cada subaba e a engrenagem com os prints; com CAMINHO B, o PR registra "conferência visual pendente: depois do deploy".

- [ ] **Step 4: PRD.** Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`, seção 8, na linha `| 1F |`, troque a última coluna por `PR A aberto (a janela); PR B a seguir (efeitos no quadro)`.

- [ ] **Step 5: Push e PR A.**

```bash
git push -u escale-crm feat/fase-1f-configuracoes-da-origem
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-1f-configuracoes-da-origem --title "feat(escale): Fase 1F (A) — configurações da origem igual à Clint" --body-file .superpowers/sdd/1f-pra-pr.md
```

Corpo: o Goal (parte da janela); banco (9007); decisões F19 a F22 e G1; o que fica para o PR B; limites conhecidos (PRD §12 e o caso "engrenagem sem painel"); perguntas Q1 a Q8; prints que faltam; conferência visual; verificação (por task e a rodada cheia). Termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Mostre a URL ao usuário e PARE. O PR B só começa depois do merge do PR A, com o "pode fazer" do usuário.

---

# PR B — Os efeitos no quadro

### Task 10: Branch do PR B e o "ao sair": o que falta ao mover e ao encerrar

- [ ] **Step 1: A base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
git status --porcelain    # Expected: vazio.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:supabase/migrations/20261022120000_9007_configuracoes_da_origem.sql && echo "PR A ok"
git cat-file -e escale-crm/main:components/escale/configuracoes/JanelaDaOrigem.tsx && echo "janela ok"
git switch -c feat/fase-1f-efeitos-no-quadro escale-crm/main
```
Expected: `PR A ok` e `janela ok`. Senão, PARE.

- [ ] **Step 2 em diante:** a v2, Task 5, sem mudança (`lib/escale/configuracoes/ao-sair.ts` e `tests/unit/escale-ao-sair-regras.test.ts`). Verificação (G1): o teste da task, typecheck, eslint. Controlador confere. Commit o da v2.

---

### Task 11: A pílula do prazo no card da casca (B16, F21)

**É a v2, Task 12, Step 4, com o rodapé da 1E.**

**Files:**
- Modify: `components/escale/quadro/PecasDoCard.tsx`, `tests/unit/escale-alerta-de-tempo.test.tsx`

- [ ] **Step 1: O teste (vai falhar)**

Em `tests/unit/escale-alerta-de-tempo.test.tsx`, acrescente no fim:

```tsx
describe("o card da casca usa o prazo", () => {
  const fonte = () => readFileSync(join(__dirname, "..", "..", "components/escale/quadro/PecasDoCard.tsx"), "utf8");

  it("RodapeDoCard troca o relógio pelo PrazoDoCard", () => {
    expect(fonte()).toContain("<PrazoDoCard lead={lead} horasNaEtapa={card.hoursInStage} tempo={idade} />");
  });

  it("a pílula fica no lugar da idade: some com 'Idade do negócio' desligada (F21)", () => {
    expect(fonte()).toMatch(/\{itens\.idade && idade \? \(\s*\/\/ Fase 1F[^\n]*\n\s*<PrazoDoCard /);
  });
});
```

Rode e veja falhar.

- [ ] **Step 2: O encaixe**

Em `components/escale/quadro/PecasDoCard.tsx`:
- acrescente `import { PrazoDoCard } from "@/components/escale/configuracoes/PilulaDoPrazo";` com o comentário `// Fase 1F: o tempo na etapa vira a pílula do alerta quando a origem tem regra.`;
- troque

  ```tsx
        {itens.idade && idade ? (
          <span title={t("Tempo na etapa")} className="flex items-center gap-1">
            <Clock size={12} aria-hidden />
            {idade}
          </span>
        ) : null}
  ```
  por
  ```tsx
        {itens.idade && idade ? (
          // Fase 1F (B16, F21): com regra de alerta na origem do card, o tempo vira a pílula.
          <PrazoDoCard lead={lead} horasNaEtapa={card.hoursInStage} tempo={idade} />
        ) : null}
  ```
- se `Clock` ficar sem uso no arquivo, tire-o do import de `icons-da-casca`.

- [ ] **Step 3: Verificar (G1) e commit.** `tests/unit/escale-alerta-de-tempo.test.tsx`, os testes do card (`ls tests/unit | grep -E "escale-card-da-casca|escale-pecas-do-card|escale-capa"`), typecheck, eslint do arquivo. Controlador confere. Commit `feat(escale): a pílula do prazo no rodapé do card da casca (no lugar da idade)`.

---

### Task 12: O modal "Campos obrigatórios pendentes" e o arrasto da casca

**É a v2, Task 13, sem mudança de código.** O `KanbanBoard.tsx` tem os encaixes da 1D, da V4 e da 1E; o da 1F entra junto da chamada `useMoveCard(pipelineId, {` (linha ~153) e do ramo `aparencia === "casca"`, sem mexer nos outros. Os campos do modal são os do CRM (a projeção), e só aparecem os que a regra "Ao sair" desta origem pede.

Verificação (G1): `tests/unit/escale-campos-pendentes.test.tsx`, os testes do original que leem `KanbanBoard` e `useMoveCard` (`grep -rlE "KanbanBoard|useMoveCard" tests components hooks --include='*.test.*'`), `etapa-de-perda-no-arrasto`, typecheck, eslint. **Revisor (subagente):** arrasto e modal. Commit o da v2.

---

### Task 13: "Ao sair" no ⋮ do card da casca

**É a v2, Task 14, sem mudança.** Conferido em 16/10: `components/escale/quadro/CardDaCasca.tsx:156` ainda é `<KanbanCardActions lead={lead} pipelineId={pipelineId} />`.

Verificação (G1): `tests/unit/escale-portao-do-card.test.tsx`, `kanban-card-excluir.test.tsx`, `etapa-de-perda-avisa-o-humano.test.ts`, `etapa-de-perda-no-arrasto.test.ts`, os testes do card da casca, typecheck, eslint. Controlador confere. Commit o da v2.

---

### Task 14: A moeda da origem nas telas, o espanhol que faltar, a rodada cheia e o PR B

- [ ] **Step 1: A moeda.** É a v2, Task 15, com os pontos de hoje:
  - `app/app/pipelines/[id]/_client.tsx` (~linha 128): troque `recortarQuadro(data, filtrosEscale.filtros, { moeda: orgAtiva?.currency ?? null, campos: camposDoQuadro })` por `recortarQuadro(data, filtrosEscale.filtros, { moeda: moedaDaOrigem(data.pipeline.settings) ?? orgAtiva?.currency ?? null, campos: camposDoQuadro })`, com o comentário `// FORK ESCALE · Fase 1F: o filtro de valor usa a moeda da origem.` e o import de `moedaDaOrigem` de `@/lib/escale/configuracoes/tipos`;
  - `components/escale/visualizacoes/QuadroDaVisualizacao.tsx:65`: troque só `moeda: orgAtiva?.currency ?? null` por `moeda: moedaDaOrigem(q.pipeline.settings) ?? orgAtiva?.currency ?? null`;
  - `components/escale/filtros/SecaoNegocio.tsx:39` e `components/kanban/NewLeadDialog.tsx:98` (`const moedaDoValor = org?.currency ?? MOEDA_PADRAO;`): como na v1 (Task 14), com `hooks/escale/useMoedaDaOrigem.ts`.
  Os testes de fonte procuram essas mesmas expressões. Verificação (G1) e commit os da v2.

- [ ] **Step 2: O espanhol que faltar.** `corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts`. Se a gate pedir algum texto, acrescente no fim do bloco da 1F (Task 9) e commit `feat(escale): espanhol dos efeitos da 1F no quadro`. Se não pedir nada, pule.

- [ ] **Step 3: Sem a casca nada muda.** Os testes do original que tocam os encaixes (v2, Task 17, Step 3): `KanbanBoard`, `KanbanCardActions`, `useMotivosDePerdaDoFunil`, `NewLeadDialog`.

- [ ] **Step 4: A rodada cheia (G1), a conferência visual, o PRD e o PR B.** Como a Task 9 (Steps 2, 3 e 5), com os logs `1f-prb-*`, a branch `feat/fase-1f-efeitos-no-quadro` e o título `feat(escale): Fase 1F (B) — alerta no card e campos obrigatórios no quadro, iguais à Clint`. No PRD, a linha `| 1F |` passa a `PR B aberto (aguarda o "pode fazer" do merge)`. A "Verificação na tela" do corpo traz os itens da v2 (Task 17, Step 6) que são do quadro: a pílula nas três cores, a pílula some com a idade desligada, o modal no arrasto e no ⋮.

Mostre a URL ao usuário e PARE.

---

## Fora desta fase (registrado)

Os itens da v2 ("Fora desta fase"), com estas mudanças:
- **"Valor" e campos nativos nos campos obrigatórios:** continua fora. A lista agora é a dos campos do CRM (1F-a), sem os nativos.
- **Visualização de campos (D16):** é o "esconder campo do CRM por origem" da Clint (`settings.hidden_fields`). Continua "Em breve".
- **Tela "Gerenciamento de campos" da Clint:** fora (1F-a, Q6). O link do vazio aponta para Configurações › Funis.
- **Origem obrigatória ao criar negócio e "Salvar e criar" (F12, F16):** a 1E v2 **não** refez a criação de negócio. Os dois continuam pendentes e precisam de uma fase (ou ajuste) própria; o `JanelaDeCamposPendentes` (Task 12) já nasce com o modo "criar".
- **Engrenagem na Visualização:** desligada com "Em breve" até haver print (Q3).
</content>
</invoke>
