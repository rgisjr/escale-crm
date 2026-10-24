# Fase 1L — Editar etapas na aba "Etapas e atividades" (igual à Clint) · Plano enxuto

> **Para quem executa:** use superpowers:executing-plans, inline, em Sonnet 5.5. Um PR só. Plano enxuto de propósito (créditos): traz decisões, arquivos, regras e testes; o código é escrito na execução, seguindo os padrões dos arquivos citados.

**Objetivo:** na aba "Etapas e atividades" da janela da origem, editar as etapas como na Clint: lápis (nome e descrição), lixeira, arrastar a coluna e a coluna tracejada "+ Nova Etapa". Tudo no rascunho; só grava no "Salvar na origem".

**Fecha o item:** "Editar etapas na aba Etapas e atividades" (Q13 da 1I, lista "Obrigatório antes do fim do projeto").

## Decisões do usuário (24/10)

| # | Decisão |
|---|---|
| U1 | Etapa excluída que tem negócios: **igual à Clint**, com as duas opções: "Mover para outra etapa" e "Excluir todos os negócios". |
| U2 | A coluna final "Concluído" (ganho/perda) **não entra**. A aba segue mostrando só as etapas abertas. |

## Referência visual (abrir os PNG antes de cada tela)

Prints do usuário de 24/10 (nesta conversa; salvar em `docs/clint/` na Task 1): (a) popover "Nome da etapa" aberto sobre a 1ª coluna; (b) arrastando a coluna (a coluna fica solta e deixa um vão); (c) coluna tracejada "+ Nova Etapa" no fim, com selo "ORIGEM CUSTOMIZADA" e ⋮ no topo.
Código: `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\index-D5llB5li.js.txt` (componentes `Xa` popover, `Ya` nova etapa, `Qa`/`ot` lixeira, `On` lista, `vn` exclusão). Arquivo em Windows-1252: ler com `python -I` e `errors="replace"`.

### Medidas e textos tirados do código da Clint

- **Nova etapa:** caixa `border: 2px dashed #597EFF`, raio 8, `minHeight 343`, `minWidth 201`, `marginRight 20`, conteúdo centralizado. Botão "+ Nova Etapa" (plain, borda 1px, px 6, py 1.5, ícone 13). Dica: "Adicionar uma nova etapa". Nome do rascunho: `Nova Etapa {n+1}` (n = quantidade de etapas), tipo CUSTOM.
- **Cabeçalho da coluna:** à direita, lixeira (14) e lápis (12), só no hover (invisíveis se a origem é só leitura). Dicas: "Deletar etapa", "Editar etapa". A coluna inteira é a alça de arrastar. Etapa inicial: bandeira verde (já existe).
- **Dica do título:** nome e, se houver, " — descrição" (só quando o texto está cortado ou há descrição).
- **Popover de edição:** posição absoluta `top 10%`, `minW 350`, `maxW 600`, fundo painel, borda 1px, raio 8, padding 6 (24px), sombra grande, z 1200. Fecha ao clicar fora (exceto no lápis) e o lápis da mesma etapa fecha. Campos:
  - "Nome da etapa" (negrito) + ícone "?" roxo com dica "O nome da etapa deve ter no máximo 40 caracteres."; input, `maxLength 40`, placeholder "Etapa X"; Enter salva.
  - "Descrição da etapa" + "(opcional)" em cinza; textarea de 5 linhas, `maxLength 200`, placeholder "Nesta etapa o lead demonstrou interesse inicial e aguarda o primeiro contato da equipe comercial. O objetivo aqui é realizar o atendimento inicial, qualificar o lead e entender sua necessidade."; contador `n/200` à direita (vermelho ao chegar em 200).
  - Rodapé à direita: "Cancelar" (outline, restaura os valores) e "Salvar" (cor da marca, `sm`).
  - Erros: nome vazio → "O nome precisa ter pelo menos 1 caractere."; nome > 40 → "O nome pode ter no máximo 40 caracteres."; descrição > 200 → "A descrição não pode ter mais de 200 caracteres." (em português, como o resto da casca).
  - "Salvar" aqui só muda o rascunho; não grava no banco.
- **Excluir etapa rascunho** (criada agora, ainda não salva): confirmação "Tem certeza que deseja excluir esta etapa em rascunho?". **Etapa já salva:** vai para a lista de exclusões do rascunho (a coluna some); a pergunta dos negócios aparece no "Salvar na origem".
- **Janela de exclusão com itens vinculados** (Clint `StageExclusionModal`): descrição "A etapa que você está tentando excluir possui itens vinculados, como negócios em andamento, integrações, automações e regras de criação automática. Para continuar, é necessário definir o que deve ser feito com cada um desses itens."; seção "Migrar negócios" com "Mover para outra etapa" (escolhe a etapa de destino) e "Excluir todos os negócios"; botões "Cancelar" e "Confirmar e excluir etapa" (vermelho, ícone lixeira, desligado até o formulário estar completo, com a dica "Preencha todos os campos obrigatórios para continuar"). **No Escale só a seção de negócios existe**: integrações, automações e campos obrigatórios da etapa não têm equivalente aqui (ver "Fora desta fase").

## Decisões da fase

| # | Decisão | Por quê |
|---|---|---|
| L1 | O rascunho das etapas mora em `JanelaDaOrigem`, ao lado do rascunho do playbook. "Salvar na origem" liga se **qualquer um** mudou; "Desfazer" desfaz os dois. | A Clint tem um botão só. |
| L2 | Gravação em duas chamadas, **etapas primeiro, playbook depois**: nova rota `PUT /api/v1/pipelines/[id]/etapas` devolve o mapa `id provisório → id real`; o cliente troca os ids no rascunho do playbook (e descarta atividades de etapas excluídas) e então chama o `PUT` do playbook que já existe. | O playbook exige etapa real (`fn_escale_salvar_playbook`, 22023). |
| L3 | A rota nova **não reescreve regras**: chama `criarEtapa`, `atualizarEtapa` e `arquivarEtapa` de `lib/leads/stage-operations.ts`, nesta ordem: criar → renomear/descrever → reordenar → arquivar. Parou no primeiro erro: devolve 422 com a frase do servidor e o que já foi feito; o cliente relê e mostra. Sem transação única (as operações atuais não a têm); o erro avisa o que ficou gravado. | Reuso (KISS); é o caminho que o agente de IA também usa. |
| L4 | Excluir = **arquivar** (a FK é `ON DELETE RESTRICT`). "Mover" usa o `destino` que `arquivarEtapa` já aceita. "Excluir todos os negócios" é **novo**: Task 1 descobre se `crm_leads` tem exclusão lógica (`deleted_at`); se tiver, a operação nova `excluirNegociosDaEtapa` marca os negócios da etapa e depois arquiva; se **não** tiver, **PARE e pergunte** (apagar negócio de verdade tem o histórico preso por FK). | Exclusão em massa não tem volta; não inventar. |
| L5 | `description` já existe em `crm_stages`; falta aceitar e devolver nas operações: `description` (até 200) no `bodySchema` do `PATCH .../stages/[stageId]`, em `criarEtapa`, `PedidoDeEdicao`, `COLUNAS`/`EtapaVisivel`, e em `EtapaDaOrigem` (`lib/escale/configuracoes/montar.ts` + `respostas.ts`, o select de etapas). **Sem migration, sem baseline.** | Coluna existe desde o baseline. |
| L6 | Limites da tela como na Clint (nome 40, descrição 200); a API continua aceitando nome até 80 (o original). | Casca igual; original intacto. |
| L7 | Só entram na aba as etapas abertas (U2); ganho/perda continuam fora e não aceitam arrastar para elas. A ordem arrastada vira `depois_de` (vizinho da esquerda), como o original já faz. | Contrato do `PATCH`. |
| L8 | Recusas do servidor (única etapa, etapa de ganho/perda, destino inválido) aparecem como o `Alerta` que a janela já usa, com a frase pronta de `validarArquivamento`. | Reuso. |
| L9 | Arrastar: `@hello-pangea/dnd` (já usado em `components/escale/campos/ListaDeCampos.tsx`), direção horizontal. A coluna arrastada fica solta e deixa o vão (print b). | Igual à Clint, sem dependência nova. |
| L10 | Cores: o tracejado `#597EFF` vira token da casca (`--escale-...` no `app/globals.css`, ponte no `@theme inline`), como manda a regra de design system e a cerca `tailwind-tokens`. Sem hex solto no componente. | Regra do produto. |

## Arquivos

**Criar**
- `lib/escale/etapas/rascunho.ts` — regras puras do rascunho das etapas: tipo `EtapaDoRascunho {id, nome, descricao, nova}`, `criarEtapaProvisoria`, `renomear`, `mover`, `excluir` (separa provisória de salva), `pedidoDeGravar(rascunho, salvo)` (monta criar/atualizar/ordem/exclusões), `etapasMudaram`, validações (40/200). Sem React.
- `app/api/v1/pipelines/[id]/etapas/route.ts` — `PUT` (manager+, `requireSupportWrite()`, `organization_id` da sessão, Zod estrito, auditoria). Corpo: `{ etapas: [{ id: uuid|null, ref: string, nome, descricao }], exclusoes: [{ id, negocios: "mover"|"excluir", destino_id? }] }`. Resposta: `{ ids: Record<ref, uuid> }`.
- `hooks/escale/useGravarEtapas.ts` — mutation; invalida configurações, quadro, funil e playbook.
- `components/escale/configuracoes/etapas/JanelaDaEtapa.tsx` — o popover de nome e descrição.
- `components/escale/configuracoes/etapas/NovaEtapa.tsx` — a caixa tracejada.
- `components/escale/configuracoes/etapas/JanelaExcluirEtapa.tsx` — a janela de migração dos negócios.
- Testes: `tests/unit/escale-etapas-rascunho.test.ts`, `tests/unit/escale-etapas-rota.test.ts`, `tests/unit/escale-aba-de-etapas-editar.test.tsx`.

**Modificar**
- `components/escale/configuracoes/AbaDeEtapas.tsx` — cabeçalho com lápis/lixeira, `DragDropContext`, coluna "Nova Etapa", dica do título; recebe `etapas` do rascunho e `mudarEtapas`.
- `components/escale/configuracoes/JanelaDaOrigem.tsx` — rascunho das etapas, "Salvar na origem" em duas chamadas (L2), "Desfazer" dos dois, janela de exclusão ao salvar.
- `lib/leads/stage-operations.ts` — `description` (L5) e `excluirNegociosDaEtapa` (L4, depende da Task 1).
- `app/api/v1/pipelines/[id]/stages/[stageId]/route.ts` e `.../stages/route.ts` — aceitar `description`.
- `lib/escale/configuracoes/montar.ts`, `respostas.ts` — etapas com `description`.
- `lib/i18n/dicionario.ts` — todos os textos novos (e o espanhol, como nas fases anteriores).
- `app/globals.css` — token do tracejado (L10).
- `docs/modulos/1-negocios.md` — marcar o item como entregue.

## Tasks

### Task 1: Branch, plano no repositório e a prova do que falta
- Worktree nova a partir de `escale-crm/main` (a branch `feat/fase-1i-aba-atividades` do repo está atrasada: não usar). Copiar este plano e os 3 prints para o repositório.
- **Provas (só leitura):** (a) `crm_leads` tem exclusão lógica? (`grep -n "deleted_at" supabase/baseline.sql` na definição de `crm_leads`, e ver como as telas escondem negócio excluído). Se **não** tiver, PARE e pergunte (L4). (b) `AbaDeEtapas.tsx` e `JanelaDaOrigem.tsx` na `main` batem com o lido neste plano.
- Commit: `chore(escale): plano da fase 1L`.

### Task 2: `description` nas operações de etapa e na configuração da origem (L5)
- Teste primeiro: `criarEtapa`/`atualizarEtapa` gravam e devolvem `description`; descrição > 200 → 422; `montar` passa `description`.
- Acrescentar aos arquivos de "Modificar" acima. Rodar só os testes tocados + typecheck dos arquivos.

### Task 3: Regras puras do rascunho (`lib/escale/etapas/rascunho.ts`)
- TDD: nome vazio/ >40, descrição >200, `Nova Etapa {n+1}`, mover gera `depois_de` certo, excluir provisória some sem pedido, excluir salva vira exclusão, `etapasMudaram` é falso depois de desfazer, `pedidoDeGravar` ordena criar → atualizar → ordem → exclusões.

### Task 4: Rota `PUT /pipelines/[id]/etapas` e `excluirNegociosDaEtapa`
- TDD na rota: 401/403 (viewer/agent), corpo inválido 422, cria e devolve o mapa de ids, `mover` sem destino 422, `excluir` chama a operação nova, para no primeiro erro e diz o que gravou, escrita passa por `requireSupportWrite`, `organization_id` não vem do corpo, audit gravado. Seguir `app/api/v1/pipelines/[id]/playbook/route.ts` como molde.
- `excluirNegociosDaEtapa` conforme a prova da Task 1; respeita as regras de `validarArquivamento`.
- A cerca `suporte-cobertura-de-efeitos` e a de rotas devem continuar verdes.

### Task 5: A tela
- `JanelaDaEtapa`, `NovaEtapa`, `JanelaExcluirEtapa`, `AbaDeEtapas` e `JanelaDaOrigem`, conforme "Medidas e textos" e L1, L2, L8, L9, L10. Antes de escrever cada peça, abrir o print correspondente.
- TDD de componente: lápis abre o popover e fecha ao clicar fora; Enter salva no rascunho; nome vazio mostra o erro; "Nova Etapa" cria "Nova Etapa N"; lixeira de rascunho pede a confirmação; lixeira de etapa salva some a coluna e liga o "Salvar na origem"; "Desfazer" restaura; excluir etapa com negócios abre a janela e o botão vermelho só liga completo.
- O mapa de ids da resposta é aplicado ao playbook antes do `PUT` do playbook (teste: atividade criada numa etapa nova chega com o id real; atividade de etapa excluída é descartada).

### Task 6: Dicionário, espanhol e PRD
- Textos novos em `lib/i18n/dicionario.ts` (pt e es). `docs/modulos/1-negocios.md`: marcar entregue. Sem MANIFEST, sem migration.

### Task 7: PR
- Typecheck e eslint dos arquivos alterados; os testes da fase. **Sem `test:db` e sem rodada cheia agora** (regra "executa tudo, testa tudo, publica tudo": entram na bateria única da frente).
- PR para `escale-crm/main` (merge direto, como as outras fases). **Não publicar.**

## Verificação da frente (depois, uma vez)
`pnpm test:unit` cheio (comparar rodapé com `grep FAIL`), `test:db`, `test:db:update`; um revisor Opus 5.5 por frente; conferência visual lado a lado com os 3 prints, listando cada diferença. Esta fase não tem migration, então não pesa no `test:db`.

## Fora desta fase (registrado)
- Integrações, automações e regras de criação automática ligadas à etapa na janela de exclusão (Escale ainda não tem as telas). A janela mostra só "Migrar negócios".
- Editar a etapa final (ganho/perda) e a coluna "Concluído" (U2).
- Modelos de playbook, "Escolher um modelo" e a seta do salvar (seguem "Em breve", Q12 da 1I).
- Pedir ao usuário, na conferência: print da janela de exclusão com negócios e do hover do cabeçalho (lápis e lixeira), para fechar os detalhes que o código não mostra.

## Revisão de 24/10 (vale sobre o texto acima)

1. **Excluir todos os negócios** = apagar os negócios da etapa como a rota `POST /api/v1/leads/bulk` (ação `delete`, `lead.bulk_deleted`) já faz; não há exclusão lógica e não é preciso parar. Depois arquiva a etapa.
2. **Rota única** `PUT /api/v1/pipelines/[id]/etapas-e-atividades` (no lugar de `.../etapas` + `PUT` do playbook em duas chamadas). Ordem no servidor: criar → renomear/descrever → reordenar → salvar o playbook (ids reais, mantendo as atividades das etapas que saem) → arquivar (mover ou excluir negócios). O playbook novo vale antes de os negócios movidos entrarem na etapa de destino.
3. Etapa nova sempre recebe `depois_de` (a coluna à esquerda na tela), porque `criarEtapa` põe no fim do funil, depois de ganho/perda.
4. A coluna arrastada é desenhada por portal (a janela usa `transform`).
5. Só gerente ou acima vê lápis, lixeira, arrastar e "Nova Etapa".
6. A tela confere nomes repetidos antes de gravar; trocar nomes entre duas etapas fica como limitação conhecida.
7. **Publicação:** só esta fase (decisão do usuário: "execute e publique"), com a bateria mínima verde antes.
